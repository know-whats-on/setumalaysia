#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
INFO_PATH = REPO_ROOT / "utils" / "supabase" / "info.tsx"
ENV_PATH = REPO_ROOT / ".env"
WIKIMEDIA_DOMAINS = ("wikimedia.org", "wikipedia.org")
GUIDE_ASSET_BUCKET = "make-1d591b90-guide-assets"
FORCED_IMAGE_REPLACEMENTS: dict[tuple[str, str, int | None], str] = {
    (
        "10-best-hidden-bars-in-melbourne",
        "place",
        6,
    ): "https://images.squarespace-cdn.com/content/v1/62bac1a6931d1b1025e91705/f397075e-0072-4ecd-a82d-9fb01e203ff7/Byrdi_Bar_Interior_Melbourne_2.jpg?format=1000w",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_project_config() -> tuple[str, str]:
    source = read_text(INFO_PATH)
    project_id = re.search(r'projectId = "([^"]+)"', source)
    public_anon_key = re.search(r'publicAnonKey = "([^"]+)"', source)
    if not project_id or not public_anon_key:
        raise RuntimeError("Could not read Supabase project configuration from utils/supabase/info.tsx")
    return project_id.group(1), public_anon_key.group(1)


def load_env_value(name: str, fallback: str = "") -> str:
    if name in os.environ and os.environ[name].strip():
        return os.environ[name].strip()
    if not ENV_PATH.exists():
        return fallback
    for line in read_text(ENV_PATH).splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == name:
            return value.strip()
    return fallback


def api_request(
    base_url: str,
    public_anon_key: str,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> Any:
    def parse_json_payload(raw_text: str) -> Any:
        if not raw_text:
            return {}
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            return {"raw": raw_text[:1000]}

    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        f"{base_url}{path}",
        data=payload,
        method=method,
        headers={
            "apikey": public_anon_key,
            "Authorization": f"Bearer {public_anon_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
            parsed = parse_json_payload(raw)
            if isinstance(parsed, dict) and "raw" in parsed and raw:
                raise RuntimeError(f"{method} {path} returned non-JSON body: {parsed['raw']}")
            return parsed
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        payload = parse_json_payload(raw)
        raise RuntimeError(f"{method} {path} failed with {error.code}: {payload}") from error


def is_hosted_guide_asset_url(url: str, project_id: str) -> bool:
    if not url:
        return False
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False
    expected_host = f"{project_id}.supabase.co"
    return (
        parsed.netloc == expected_host
        and f"/storage/v1/object/public/{GUIDE_ASSET_BUCKET}/" in parsed.path
    )


def verify_image_url(url: str) -> tuple[str, str]:
    parsed = urllib.parse.urlparse(url)
    is_wikimedia = parsed.netloc.endswith(WIKIMEDIA_DOMAINS)
    last_error: Exception | None = None
    for attempt in range(4):
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "image/*,*/*;q=0.8",
                "User-Agent": "Mozilla/5.0 (compatible; HoodieGuideImageRepair/1.0; +https://suburb.knowwhatson.com)",
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                content_type = response.headers.get_content_type()
                response.read(64)
                if not content_type.startswith("image/"):
                    raise RuntimeError(f"{url} returned non-image content type {content_type}")
                return response.geturl(), content_type
        except urllib.error.HTTPError as error:
            last_error = error
            if error.code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f"{url} failed with {error.code}") from error
            retry_after = error.headers.get("Retry-After")
            sleep_seconds = float(retry_after) if retry_after and retry_after.isdigit() else 1.5 * (attempt + 1)
            time.sleep(sleep_seconds)
        except Exception as error:  # noqa: BLE001
            last_error = error
            time.sleep(1.5 * (attempt + 1))
        finally:
            if is_wikimedia:
                time.sleep(0.6)
    raise RuntimeError(f"Failed to verify image URL {url}: {last_error}") from last_error


def read_cache_control(url: str) -> str:
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Accept": "image/*,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; HoodieGuideImageRepair/1.0; +https://suburb.knowwhatson.com)",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        response.read(64)
        return str(response.headers.get("Cache-Control") or "").strip()


def is_wikimedia_special_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    if not parsed.netloc.endswith("commons.wikimedia.org"):
        return False
    return (
        parsed.path.startswith("/wiki/Special:FilePath/")
        or parsed.path.startswith("/wiki/Special:Redirect/file/")
        or (
            parsed.path == "/w/index.php"
            and (
                parsed.query.startswith("title=Special%3ARedirect%2Ffile%2F")
                or parsed.query.startswith("title=Special:Redirect/file/")
            )
        )
    )


def build_wikimedia_thumb_url(url: str, width: int) -> str | None:
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc != "upload.wikimedia.org":
        return None
    if not parsed.path.startswith("/wikipedia/commons/"):
        return None
    if parsed.path.startswith("/wikipedia/commons/thumb/"):
        return url

    segments = [segment for segment in parsed.path.split("/") if segment]
    try:
        commons_index = segments.index("commons")
    except ValueError:
        return None

    hash_first = segments[commons_index + 1] if len(segments) > commons_index + 1 else ""
    hash_second = segments[commons_index + 2] if len(segments) > commons_index + 2 else ""
    file_name = "/".join(segments[commons_index + 3 :])
    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if not hash_first or not hash_second or not file_name:
        return None
    if extension in {"svg", "pdf", "djvu"}:
        return None

    thumb_path = (
        f"/wikipedia/commons/thumb/{hash_first}/{hash_second}/{file_name}/{int(width)}px-{file_name}"
    )
    return urllib.parse.urlunparse(parsed._replace(path=thumb_path, query=""))


def choose_source_image_url(
    project_id: str,
    guide_slug: str,
    slot_type: str,
    place_position: int | None,
    current_url: str,
    desired_width: int,
) -> tuple[str, str]:
    key = (guide_slug, slot_type, place_position)
    forced = FORCED_IMAGE_REPLACEMENTS.get(key)
    if forced:
        resolved_url, _content_type = verify_image_url(forced)
        return resolved_url, "forced"

    if not current_url:
        return "", "blank"

    if is_hosted_guide_asset_url(current_url, project_id):
        return current_url, "hosted"

    if is_wikimedia_special_url(current_url):
        resolved_url, _content_type = verify_image_url(current_url)
        return resolved_url, "wikimedia-special"

    thumb_url = build_wikimedia_thumb_url(current_url, desired_width)
    if thumb_url:
        resolved_url, _content_type = verify_image_url(thumb_url)
        return resolved_url, "wikimedia-thumb"

    resolved_url, _content_type = verify_image_url(current_url)
    return resolved_url, "remote"


def upload_remote_image(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    guide_slug: str,
    slot_type: str,
    place_position: int | None,
    place_name: str,
    source_url: str,
    force_upload: bool = False,
) -> str:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = api_request(
                base_url,
                public_anon_key,
                "POST",
                "/admin/city-guides/upload-remote-image",
                body={
                    "admin_email": admin_email,
                    "source_url": source_url,
                    "guide_slug": guide_slug,
                    "slot_type": slot_type,
                    "place_position": place_position,
                    "place_name": place_name,
                    "force_upload": force_upload,
                },
            )
            break
        except Exception as error:  # noqa: BLE001
            last_error = error
            if not any(code in str(error) for code in ("Bad Gateway", "502", "503", "504")):
                raise
            time.sleep(2 * (attempt + 1))
    else:
        raise RuntimeError(
            f"upload-remote-image failed for {guide_slug} {slot_type} {place_name or 'cover'}: {last_error}"
        ) from last_error

    data = response.get("data") if isinstance(response, dict) else None
    hosted_url = str(data.get("hosted_url") or "").strip() if isinstance(data, dict) else ""
    if not hosted_url:
        raise RuntimeError(f"upload-remote-image returned no hosted_url for {guide_slug} {slot_type} {place_name}")
    resolved_url, content_type = verify_image_url(hosted_url)
    if resolved_url != hosted_url:
        raise RuntimeError(f"Hosted image redirected unexpectedly for {guide_slug} {slot_type} {place_name}")
    print(f"HOSTED OK  {guide_slug} {slot_type} {place_name or 'cover'} [{content_type}] -> {hosted_url}")
    return hosted_url


def refresh_hosted_asset_cache_control(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    admin_email: str,
) -> None:
    guides = dedupe_guides(
        fetch_guides(base_url, public_anon_key, "ghar")
        + fetch_guides(base_url, public_anon_key, "burb_mate")
    )
    print("\nREFRESH    Re-uploading hosted guide assets to apply cache-control metadata.")
    refreshed = 0
    for guide in guides:
        guide_slug = str(guide.get("slug") or "").strip()
        cover_url = str(guide.get("cover_image_url") or "").strip()
        if is_hosted_guide_asset_url(cover_url, project_id):
            upload_remote_image(
                base_url,
                public_anon_key,
                admin_email,
                guide_slug,
                "cover",
                None,
                "",
                cover_url,
                force_upload=True,
            )
            refreshed += 1
        for place in guide.get("places") or []:
            image_url = str(place.get("image_url") or "").strip()
            if not is_hosted_guide_asset_url(image_url, project_id):
                continue
            upload_remote_image(
                base_url,
                public_anon_key,
                admin_email,
                guide_slug,
                "place",
                int(place.get("position") or 0),
                str(place.get("name") or "").strip(),
                image_url,
                force_upload=True,
            )
            refreshed += 1
    print(f"REFRESH OK Refreshed cache metadata for {refreshed} hosted guide assets.")


def fetch_guides(base_url: str, public_anon_key: str, app_variant: str) -> list[dict[str, Any]]:
    response = api_request(
        base_url,
        public_anon_key,
        "GET",
        f"/city-guides?app_variant={urllib.parse.quote(app_variant)}",
    )
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError(f"Could not load live city guides for app_variant={app_variant}")
    return [guide for guide in guides if isinstance(guide, dict)]


def dedupe_guides(guides: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: dict[str, dict[str, Any]] = {}
    for guide in guides:
        guide_id = str(guide.get("id") or "").strip()
        if not guide_id:
            continue
        deduped.setdefault(guide_id, guide)
    return sorted(
        deduped.values(),
        key=lambda guide: (
            str(guide.get("city") or "").lower(),
            int(guide.get("position") or 0),
            str(guide.get("title") or "").lower(),
        ),
    )


def migrate_guides(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    dry_run: bool,
) -> tuple[int, list[str]]:
    guides = dedupe_guides(
        fetch_guides(base_url, public_anon_key, "ghar")
        + fetch_guides(base_url, public_anon_key, "burb_mate")
    )
    print(f"Loaded {len(guides)} unique live guides from ghar + burb_mate.")

    updated_guides = 0
    warnings: list[str] = []

    for guide in guides:
        guide_id = str(guide.get("id") or "").strip()
        guide_slug = str(guide.get("slug") or "").strip()
        title = str(guide.get("title") or "").strip()
        cover_url = str(guide.get("cover_image_url") or "").strip()
        print(f"\nGUIDE      {guide_slug} ({title})")

        try:
            resolved_cover_source, cover_strategy = choose_source_image_url(
                project_id,
                guide_slug,
                "cover",
                None,
                cover_url,
                1400,
            )
        except Exception as error:  # noqa: BLE001
            warnings.append(f"{guide_slug} cover -> blanked ({error})")
            resolved_cover_source, cover_strategy = "", "blank-on-error"

        next_cover_url = cover_url
        if resolved_cover_source:
            next_cover_url = cover_url
            if not is_hosted_guide_asset_url(cover_url, project_id):
                try:
                    if dry_run:
                        next_cover_url = f"[dry-run hosted] {resolved_cover_source}"
                    else:
                        next_cover_url = upload_remote_image(
                            base_url,
                            public_anon_key,
                            admin_email,
                            guide_slug,
                            "cover",
                            None,
                            "",
                            resolved_cover_source,
                        )
                except Exception as error:  # noqa: BLE001
                    warnings.append(f"{guide_slug} cover upload failed -> blanked ({error})")
                    next_cover_url = ""
                    cover_strategy = f"{cover_strategy}-upload-failed"
        else:
            next_cover_url = ""

        if next_cover_url != cover_url:
            print(f"CHANGE     cover [{cover_strategy}]")
        else:
            print(f"KEEP       cover [{cover_strategy}]")

        next_places: list[dict[str, Any]] = []
        place_changed = False
        for place in sorted(guide.get("places") or [], key=lambda item: int(item.get("position") or 0)):
            position = int(place.get("position") or 0)
            place_name = str(place.get("name") or "").strip()
            current_url = str(place.get("image_url") or "").strip()
            next_place = dict(place)

            try:
                resolved_source, strategy = choose_source_image_url(
                    project_id,
                    guide_slug,
                    "place",
                    position,
                    current_url,
                    1200,
                )
            except Exception as error:  # noqa: BLE001
                warnings.append(f"{guide_slug} place {position} {place_name} -> blanked ({error})")
                resolved_source, strategy = "", "blank-on-error"

            next_image_url = current_url
            if resolved_source:
                if not is_hosted_guide_asset_url(current_url, project_id):
                    try:
                        if dry_run:
                            next_image_url = f"[dry-run hosted] {resolved_source}"
                        else:
                            next_image_url = upload_remote_image(
                                base_url,
                                public_anon_key,
                                admin_email,
                                guide_slug,
                                "place",
                                position,
                                place_name,
                                resolved_source,
                            )
                    except Exception as error:  # noqa: BLE001
                        warnings.append(
                            f"{guide_slug} place {position} {place_name} upload failed -> blanked ({error})"
                        )
                        next_image_url = ""
                        strategy = f"{strategy}-upload-failed"
            else:
                next_image_url = ""

            if next_image_url != current_url:
                place_changed = True
                print(f"CHANGE     place {position:02d} {place_name} [{strategy}]")
            else:
                print(f"KEEP       place {position:02d} {place_name} [{strategy}]")

            next_place["image_url"] = next_image_url
            next_places.append(next_place)

        guide_changed = next_cover_url != cover_url or place_changed
        if not guide_changed:
            continue

        updated_guides += 1
        if dry_run:
            continue

        api_request(
            base_url,
            public_anon_key,
            "PUT",
            f"/admin/city-guides/{urllib.parse.quote(guide_id)}",
            body={
                "admin_email": admin_email,
                "city": guide["city"],
                "state": guide["state"],
                "title": guide["title"],
                "cover_image_url": next_cover_url,
                "intro": guide["intro"],
                "app_variant": guide["app_variant"],
                "position": guide["position"],
                "places": next_places,
            },
        )
        print(f"UPDATED    {guide_slug}")

    return updated_guides, warnings


def verify_live_guides(project_id: str, base_url: str, public_anon_key: str) -> None:
    merged_guides = dedupe_guides(
        fetch_guides(base_url, public_anon_key, "ghar")
        + fetch_guides(base_url, public_anon_key, "burb_mate")
    )

    byrdi_url = ""
    hosted_asset_url = ""
    for guide in merged_guides:
        cover_url = str(guide.get("cover_image_url") or "").strip()
        if not cover_url:
            raise RuntimeError(f"Guide {guide.get('slug')} is missing a cover image after migration")
        if not is_hosted_guide_asset_url(cover_url, project_id):
            raise RuntimeError(f"Guide {guide.get('slug')} still points at a non-bucket cover image")
        if "commons.wikimedia.org" in cover_url:
            raise RuntimeError(f"Guide {guide.get('slug')} still points at commons.wikimedia.org")
        if cover_url.startswith("https://upload.wikimedia.org/wikipedia/commons/") and "/thumb/" not in cover_url:
            raise RuntimeError(f"Guide {guide.get('slug')} still points at a Wikimedia original image")
        if is_hosted_guide_asset_url(cover_url, project_id):
            hosted_asset_url = hosted_asset_url or cover_url

        for place in guide.get("places") or []:
            image_url = str(place.get("image_url") or "").strip()
            if not image_url:
                continue
            if str(place.get("name") or "").strip().lower() == "byrdi":
                byrdi_url = image_url
            if not is_hosted_guide_asset_url(image_url, project_id):
                raise RuntimeError(
                    f"Guide {guide.get('slug')} place {place.get('name')} still points at a non-bucket image"
                )
            if "commons.wikimedia.org" in image_url:
                raise RuntimeError(
                    f"Guide {guide.get('slug')} place {place.get('name')} still points at commons.wikimedia.org"
                )
            if image_url.startswith("https://upload.wikimedia.org/wikipedia/commons/") and "/thumb/" not in image_url:
                raise RuntimeError(
                    f"Guide {guide.get('slug')} place {place.get('name')} still points at a Wikimedia original image"
                )
            if is_hosted_guide_asset_url(image_url, project_id):
                hosted_asset_url = hosted_asset_url or image_url

    if not byrdi_url:
        raise RuntimeError("Could not find Byrdi in the migrated Melbourne guide feed")

    byrdi_resolved_url, byrdi_content_type = verify_image_url(byrdi_url)
    if byrdi_resolved_url != byrdi_url:
        raise RuntimeError("Byrdi image redirected unexpectedly after migration")
    print(f"VERIFY OK  Byrdi [{byrdi_content_type}] -> {byrdi_url}")

    cache_control = read_cache_control(hosted_asset_url)
    if "31536000" not in cache_control:
        raise RuntimeError(f"Hosted guide asset cache control is too short: {cache_control!r}")
    print(f"VERIFY OK  hosted asset cache-control -> {cache_control}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Repair live guide images and re-host non-bucket assets.")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and resolve images without mutating live guides.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_id, public_anon_key = load_project_config()
    admin_email = load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app")
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"

    updated_guides, warnings = migrate_guides(
        project_id=project_id,
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=admin_email,
        dry_run=args.dry_run,
    )

    if warnings:
        print("\nWARNINGS")
        for warning in warnings:
            print(f"- {warning}")

    if args.dry_run:
        print(f"\nDONE       Dry run finished. {updated_guides} guides would be updated.")
        return

    try:
        verify_live_guides(project_id, base_url, public_anon_key)
    except RuntimeError as error:
        if "cache control is too short" not in str(error).lower():
            raise
        refresh_hosted_asset_cache_control(project_id, base_url, public_anon_key, admin_email)
        verify_live_guides(project_id, base_url, public_anon_key)
    print(f"\nDONE       Repaired guide images for {updated_guides} guides.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(f"ERROR      {error}", file=sys.stderr)
        sys.exit(1)

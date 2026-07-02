#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import repair_city_guide_images as image_tools


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "scripts" / "data"
MANIFEST_PATH = DATA_DIR / "hoodie-adelaide-guide-image-manifest.json"
DEFAULT_APP_VARIANT = "burb_mate"
CITY = "Adelaide"
STATE = "SA"
SMOKE_EMAIL = "talkwithrushi@gmail.com"

ADELAIDE_CSV_PATHS = [
    Path("/Users/rushi/Downloads/adelaide-10-best-hidden-bars-in-adelaide.csv"),
    Path("/Users/rushi/Downloads/adelaide-10-best-cafes-to-work-from-in-adelaide.csv"),
    Path("/Users/rushi/Downloads/adelaide-10-best-historical-places-in-adelaide.csv"),
    Path("/Users/rushi/Downloads/adelaide-10-best-sunset-spots-in-adelaide.csv"),
    Path("/Users/rushi/Downloads/adelaide-10-best-weekend-getaways-from-adelaide.csv"),
    Path("/Users/rushi/Downloads/adelaide-10-best-sunrise-spots-in-adelaide.csv"),
]

GUIDE_COVER_PLACE_POSITION = {
    "10-best-hidden-bars-in-adelaide": 2,
    "10-best-cafes-to-work-from-in-adelaide": 1,
    "10-best-historical-places-in-adelaide": 0,
    "10-best-sunset-spots-in-adelaide": 0,
    "10-best-weekend-getaways-from-adelaide": 0,
    "10-best-sunrise-spots-in-adelaide": 0,
}

STOPWORDS = {
    "and",
    "bar",
    "bars",
    "beach",
    "best",
    "cafe",
    "cafes",
    "city",
    "conservation",
    "from",
    "garden",
    "getaways",
    "house",
    "in",
    "jetty",
    "museum",
    "park",
    "place",
    "places",
    "restaurant",
    "saloon",
    "social",
    "spots",
    "street",
    "summit",
    "the",
    "to",
    "weekend",
}

PLACE_SOURCE_URL_OVERRIDES = {
    "Leigh Street Wine Room": "https://upload.wikimedia.org/wikipedia/commons/e/e3/Hindley_Street_looking_west.jpg",
    "Old Treasury Building": "https://commons.wikimedia.org/wiki/Special:FilePath/Lands%20and%20Treasury%20Building%2C%20Adelaide%2C%20South%20Australia%28GN00898%29.jpg",
    "West Beach": "https://commons.wikimedia.org/wiki/Special:FilePath/WestBeachOverview.jpg",
}

WIKIPEDIA_TITLE_OVERRIDES = {
    "Migration Museum": ["Migration Museum, Adelaide"],
    "South Australian Museum": ["South Australian Museum"],
    "Ayers House": ["Ayers House (Adelaide)"],
    "Beehive Corner": ["Beehive Corner"],
    "Adelaide Gaol": ["Adelaide Gaol"],
    "Carrick Hill": ["Carrick Hill"],
    "Glenelg Beach": ["Glenelg, South Australia"],
    "Glenelg Jetty": ["Glenelg, South Australia"],
    "Semaphore Beach": ["Semaphore, South Australia"],
    "Semaphore Foreshore": ["Semaphore, South Australia"],
    "Henley Beach": ["Henley Beach, South Australia"],
    "Henley Beach Jetty": ["Henley Beach, South Australia"],
    "Brighton Beach": ["Brighton, South Australia"],
    "Brighton Jetty": ["Brighton, South Australia"],
    "Port Noarlunga": ["Port Noarlunga, South Australia"],
    "Port Noarlunga Jetty": ["Port Noarlunga, South Australia"],
    "Moana Beach": ["Moana, South Australia"],
    "Hallett Cove Boardwalk": ["Hallett Cove, South Australia"],
    "Hahndorf": ["Hahndorf, South Australia"],
    "Barossa Valley": ["Barossa Valley"],
    "McLaren Vale": ["McLaren Vale"],
    "Victor Harbor": ["Victor Harbor Horse Drawn Tram"],
    "Mannum": ["Mannum"],
    "Yorke Peninsula": ["Yorke Peninsula"],
    "Kangaroo Island": ["Kangaroo Island"],
    "Port Willunga": ["Port Willunga, South Australia"],
    "Goolwa": ["Goolwa, South Australia"],
    "Mount Lofty Summit": ["Mount Lofty"],
}

WIKIPEDIA_SEARCH_OVERRIDES = {
    "Old Treasury Building": ["Old Treasury Building Adelaide", "Treasury 1860 Adelaide"],
    "West Beach": ["West Beach South Australia", "West Beach Adelaide"],
    "Victor Harbor": ["Victor Harbor horse drawn tram", "Victor Harbor South Australia"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload Adelaide Hoodie guides, host their images, and verify the live feed."
    )
    parser.add_argument(
        "--app-variant",
        choices=["burb_mate", "ghar"],
        default=DEFAULT_APP_VARIANT,
        help="Target app_variant to publish the Adelaide guides into.",
    )
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email to use for guide uploads/imports.",
    )
    parser.add_argument(
        "--skip-csv-write",
        action="store_true",
        help="Do not rewrite the local CSV sources after a successful import.",
    )
    parser.add_argument(
        "--skip-manifest-write",
        action="store_true",
        help="Do not rewrite the Adelaide image manifest after a successful import.",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip the post-import hoodie endpoint smoke test.",
    )
    return parser.parse_args()


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def write_csv_rows(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        raise RuntimeError(f"Cannot write an empty CSV: {path}")
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def normalized_tokens(value: str) -> list[str]:
    return [token for token in "".join(ch.lower() if ch.isalnum() else " " for ch in value).split() if token]


def infer_match_type(place_name: str, raw_url: str, resolved_url: str) -> str:
    haystack = " ".join(
        filter(
            None,
            [
                urllib.parse.unquote(raw_url or "").lower(),
                urllib.parse.unquote(resolved_url or "").lower(),
            ],
        )
    )
    name_tokens = [token for token in normalized_tokens(place_name) if len(token) >= 4 and token not in STOPWORDS]
    if not name_tokens:
        return "representative"

    normalized_name = " ".join(name_tokens)
    if normalized_name and normalized_name in haystack:
        return "exact"

    matched_tokens = [token for token in name_tokens if token in haystack]
    return "exact" if len(matched_tokens) >= min(2, len(name_tokens)) else "representative"


def derive_commons_file_page(file_name: str) -> str:
    return f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(file_name, safe='():,')}"


def derive_source_page_url(raw_url: str, resolved_url: str) -> str:
    for candidate in (raw_url, resolved_url):
        if not candidate:
            continue
        try:
            parsed = urllib.parse.urlparse(candidate)
        except ValueError:
            continue

        if parsed.netloc == "commons.wikimedia.org" and parsed.path.startswith("/wiki/Special:FilePath/"):
            file_name = urllib.parse.unquote(parsed.path.rsplit("/", 1)[-1])
            return derive_commons_file_page(file_name)

        if parsed.netloc == "upload.wikimedia.org" and parsed.path.startswith("/wikipedia/commons/"):
            file_name = urllib.parse.unquote(parsed.path.rsplit("/", 1)[-1])
            if file_name.startswith(tuple(f"{width}px-" for width in range(320, 2401))):
                file_name = file_name.split("-", 1)[1]
            return derive_commons_file_page(file_name)

    return raw_url or resolved_url


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": "CodexAdelaideGuideImporter/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def title_match_score(place_name: str, title: str) -> int:
    name_tokens = [token for token in normalized_tokens(place_name) if len(token) >= 4 and token not in STOPWORDS]
    title_tokens = set(normalized_tokens(title))
    return sum(token in title_tokens for token in name_tokens)


def wikipedia_page_image(title: str) -> tuple[str, str] | None:
    url = (
        "https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|info"
        f"&piprop=original&inprop=url&titles={urllib.parse.quote(title)}&format=json&redirects=1"
    )
    payload = fetch_json(url)
    pages = payload.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    page_url = str(page.get("fullurl") or "").strip()
    image_url = str(page.get("original", {}).get("source") or "").strip()
    if not page_url or not image_url:
        return None
    try:
        resolved_image_url, content_type = image_tools.verify_image_url(image_url)
    except Exception:  # noqa: BLE001
        return None
    if content_type == "image/svg+xml":
        return None
    return page_url, resolved_image_url


def wikipedia_search_titles(query: str, place_name: str) -> list[str]:
    url = (
        "https://en.wikipedia.org/w/api.php?action=query&list=search"
        f"&srsearch={urllib.parse.quote(query)}&utf8=1&format=json&srlimit=5"
    )
    payload = fetch_json(url)
    results = payload.get("query", {}).get("search", [])
    titles = [str(result.get("title") or "").strip() for result in results if isinstance(result, dict)]
    titles = [title for title in titles if title]
    return sorted(titles, key=lambda title: (-title_match_score(place_name, title), titles.index(title)))


def resolve_fallback_source(
    project_id: str,
    guide_slug: str,
    slot_type: str,
    place_position: int | None,
    place_name: str,
    desired_width: int,
) -> tuple[str, str] | None:
    override_url = PLACE_SOURCE_URL_OVERRIDES.get(place_name)
    if override_url:
        resolved_source, _strategy = image_tools.choose_source_image_url(
            project_id,
            guide_slug,
            slot_type,
            place_position,
            override_url,
            desired_width,
        )
        return derive_source_page_url(override_url, resolved_source), resolved_source

    candidate_titles = list(WIKIPEDIA_TITLE_OVERRIDES.get(place_name, []))
    queries = WIKIPEDIA_SEARCH_OVERRIDES.get(
        place_name,
        [f"{place_name} Adelaide", f"{place_name} South Australia", place_name],
    )
    for query in queries:
        candidate_titles.extend(wikipedia_search_titles(query, place_name))

    seen_titles: set[str] = set()
    for title in candidate_titles:
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        candidate = wikipedia_page_image(title)
        if candidate:
            return candidate

    return None


def build_csv_text(rows: list[dict[str, str]]) -> str:
    if not rows:
        raise RuntimeError("Cannot build CSV text from an empty row list.")
    fieldnames = list(rows[0].keys())
    from io import StringIO

    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def require_rows_consistent(path: Path, rows: list[dict[str, str]]) -> tuple[str, str, str]:
    if not rows:
        raise RuntimeError(f"{path.name} is empty.")
    slug = str(rows[0].get("guide_slug") or "").strip()
    title = str(rows[0].get("guide_title") or "").strip()
    city = str(rows[0].get("city") or "").strip()
    state = str(rows[0].get("state") or "").strip()
    variant = str(rows[0].get("app_variant") or "").strip()
    if city != CITY or state != STATE:
        raise RuntimeError(f"{path.name} is not an Adelaide guide CSV.")
    if not slug or not title:
        raise RuntimeError(f"{path.name} is missing guide metadata.")
    if not variant:
        raise RuntimeError(f"{path.name} is missing app_variant metadata.")
    if len(rows) != 10:
        raise RuntimeError(f"{path.name} should contain 10 place rows, found {len(rows)}.")
    return slug, title, variant


def choose_cover_source_row(slug: str, rows: list[dict[str, str]]) -> dict[str, str]:
    requested_position = GUIDE_COVER_PLACE_POSITION.get(slug, 0)
    for row in rows:
        position = int(str(row.get("place_position") or "0").strip() or 0)
        if position == requested_position:
            return row
    return rows[0]


def resolve_or_keep_hosted(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    guide_slug: str,
    slot_type: str,
    place_position: int | None,
    place_name: str,
    current_url: str,
    desired_width: int,
) -> tuple[str, str, str]:
    stripped_url = str(current_url or "").strip()
    if not stripped_url:
        raise RuntimeError(f"{guide_slug} {slot_type} {place_name or 'cover'} is missing a source image URL.")

    try:
        resolved_source, _strategy = image_tools.choose_source_image_url(
            project_id,
            guide_slug,
            slot_type,
            place_position,
            stripped_url,
            desired_width,
        )
        source_page_url = derive_source_page_url(stripped_url, resolved_source)
    except Exception as original_error:  # noqa: BLE001
        fallback = resolve_fallback_source(
            project_id=project_id,
            guide_slug=guide_slug,
            slot_type=slot_type,
            place_position=place_position,
            place_name=place_name,
            desired_width=desired_width,
        )
        if not fallback:
            raise original_error
        source_page_url, resolved_source = fallback

    if image_tools.is_hosted_guide_asset_url(stripped_url, project_id):
        return source_page_url, resolved_source, stripped_url

    hosted_url = image_tools.upload_remote_image(
        base_url,
        public_anon_key,
        admin_email,
        guide_slug,
        slot_type,
        place_position,
        place_name,
        resolved_source,
    )
    return source_page_url, resolved_source, hosted_url


def prepare_guide_assets(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    csv_path: Path,
    target_app_variant: str,
) -> tuple[list[dict[str, str]], list[dict[str, Any]], str]:
    rows = read_csv_rows(csv_path)
    guide_slug, guide_title, source_variant = require_rows_consistent(csv_path, rows)
    manifest_entries: list[dict[str, Any]] = []

    cover_source_row = choose_cover_source_row(guide_slug, rows)
    cover_place_name = str(cover_source_row.get("place_name") or guide_title).strip()
    cover_existing_url = str(cover_source_row.get("cover_image_url") or "").strip()
    place_seed_url = str(cover_source_row.get("place_image_url") or "").strip()
    cover_raw_url = (
        cover_existing_url
        if cover_existing_url and image_tools.is_hosted_guide_asset_url(cover_existing_url, project_id)
        else place_seed_url or cover_existing_url
    )
    cover_source_page_url, cover_source_url, cover_hosted_url = resolve_or_keep_hosted(
        project_id=project_id,
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=admin_email,
        guide_slug=guide_slug,
        slot_type="cover",
        place_position=None,
        place_name=cover_place_name,
        current_url=cover_raw_url,
        desired_width=1400,
    )
    cover_match_type = infer_match_type(cover_place_name, cover_raw_url, cover_source_url)
    manifest_entries.append(
        {
            "guide_slug": guide_slug,
            "slot_type": "cover",
            "place_position": None,
            "place_name": guide_title,
            "source_page_url": cover_source_page_url,
            "source_image_url": cover_source_url,
            "hosted_url": cover_hosted_url,
            "match_type": cover_match_type,
        }
    )

    next_rows: list[dict[str, str]] = []
    for row in rows:
        position = int(str(row.get("place_position") or "0").strip() or 0)
        place_name = str(row.get("place_name") or "").strip()
        raw_place_url = str(row.get("place_image_url") or "").strip()

        place_source_page_url, place_source_url, place_hosted_url = resolve_or_keep_hosted(
            project_id=project_id,
            base_url=base_url,
            public_anon_key=public_anon_key,
            admin_email=admin_email,
            guide_slug=guide_slug,
            slot_type="place",
            place_position=position,
            place_name=place_name,
            current_url=raw_place_url,
            desired_width=1200,
        )

        manifest_entries.append(
            {
                "guide_slug": guide_slug,
                "slot_type": "place",
                "place_position": position,
                "place_name": place_name,
                "source_page_url": place_source_page_url,
                "source_image_url": place_source_url,
                "hosted_url": place_hosted_url,
                "match_type": infer_match_type(place_name, raw_place_url, place_source_url),
            }
        )

        next_row = dict(row)
        next_row["app_variant"] = target_app_variant
        next_row["cover_image_url"] = cover_hosted_url
        next_row["place_image_url"] = place_hosted_url
        next_rows.append(next_row)

    return next_rows, manifest_entries, source_variant


def build_city_guide_payload(rows: list[dict[str, str]]) -> dict[str, Any]:
    if not rows:
        raise RuntimeError("Cannot build a city guide payload from empty rows.")

    first_row = rows[0]
    places = []
    for row in rows:
        places.append(
            {
                "name": str(row.get("place_name") or "").strip(),
                "description": str(row.get("place_description") or "").strip(),
                "image_url": str(row.get("place_image_url") or "").strip(),
                "navigation_link": str(row.get("navigation_link") or "").strip(),
                "lat": float(str(row.get("lat") or "").strip()),
                "lng": float(str(row.get("lng") or "").strip()),
                "position": int(str(row.get("place_position") or "0").strip() or 0),
            }
        )

    return {
        "city": str(first_row.get("city") or "").strip(),
        "state": str(first_row.get("state") or "").strip(),
        "title": str(first_row.get("guide_title") or "").strip(),
        "cover_image_url": str(first_row.get("cover_image_url") or "").strip(),
        "intro": str(first_row.get("manual_intro") or "").strip(),
        "app_variant": str(first_row.get("app_variant") or "").strip(),
        "position": int(str(first_row.get("position") or "0").strip() or 0),
        "places": sorted(places, key=lambda item: int(item["position"])),
    }


def create_city_guide_direct(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "POST",
        "/admin/city-guides",
        body={
            "admin_email": admin_email,
            **payload,
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Direct create response was missing guide data.")
    return data


def update_city_guide_direct(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    guide_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "PUT",
        f"/admin/city-guides/{urllib.parse.quote(guide_id)}",
        body={
            "admin_email": admin_email,
            **payload,
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Direct update response was missing guide data.")
    return data


def preview_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    csv_text: str,
    app_variant: str,
    intro_override: str = "",
) -> dict[str, Any]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "POST",
        "/admin/city-guides/import-csv",
        body={
            "admin_email": admin_email,
            "csv_text": csv_text,
            "guide_id": "",
            "intro_override": intro_override,
            "app_variant": app_variant,
            "mode": "preview",
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Preview response was missing guide data.")
    return data


def generate_intro(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    preview: dict[str, Any],
) -> str:
    guide = preview.get("guide") if isinstance(preview, dict) else None
    if not isinstance(guide, dict):
        raise RuntimeError("Preview payload was missing guide metadata for intro generation.")

    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "POST",
        "/admin/city-guides/generate-blog",
        body={
            "admin_email": admin_email,
            "city": guide.get("city") or CITY,
            "state": guide.get("state") or STATE,
            "title": guide.get("title") or "",
            "places": guide.get("places") or [],
        },
    )
    generated = response.get("data") if isinstance(response, dict) else None
    intro = str(generated.get("intro") or "").strip() if isinstance(generated, dict) else ""
    if not intro:
        raise RuntimeError(f"Intro generation returned an empty intro for {guide.get('title')}.")
    return intro


def commit_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    csv_text: str,
    guide_id: str,
    intro_override: str,
    app_variant: str,
) -> dict[str, Any]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "POST",
        "/admin/city-guides/import-csv",
        body={
            "admin_email": admin_email,
            "csv_text": csv_text,
            "guide_id": guide_id,
            "intro_override": intro_override,
            "app_variant": app_variant,
            "mode": "commit",
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Commit response was missing guide data.")
    return data


def fetch_live_adelaide_guides(base_url: str, public_anon_key: str, app_variant: str) -> list[dict[str, Any]]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "GET",
        f"/city-guides?city={urllib.parse.quote(CITY)}&app_variant={urllib.parse.quote(app_variant)}",
    )
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError("Could not load live Adelaide guides.")
    return [guide for guide in guides if isinstance(guide, dict)]


def verify_live_adelaide_guides(project_id: str, base_url: str, public_anon_key: str, app_variant: str) -> None:
    guides = fetch_live_adelaide_guides(base_url, public_anon_key, app_variant)
    expected_titles = {
        "10 Best Hidden Bars in Adelaide",
        "10 Best Cafes to Work From in Adelaide",
        "10 Best Historical Places in Adelaide",
        "10 Best Sunset Spots in Adelaide",
        "10 Best Weekend Getaways from Adelaide",
        "10 Best Sunrise Spots in Adelaide",
    }
    live_titles = {str(guide.get("title") or "").strip() for guide in guides}
    if live_titles != expected_titles:
        raise RuntimeError(f"Live Adelaide guide titles mismatch. Expected {sorted(expected_titles)}, found {sorted(live_titles)}")

    cover_urls: set[str] = set()
    verified_images = 0
    for guide in guides:
        slug = str(guide.get("slug") or "").strip()
        intro = str(guide.get("intro") or "").strip()
        places = guide.get("places") or []
        cover_url = str(guide.get("cover_image_url") or "").strip()
        if not intro:
            raise RuntimeError(f"{slug} is missing an intro after import.")
        if len(places) != 10:
            raise RuntimeError(f"{slug} should have 10 places after import, found {len(places)}.")
        if not image_tools.is_hosted_guide_asset_url(cover_url, project_id):
            raise RuntimeError(f"{slug} cover was not hosted in the guide-assets bucket.")
        image_tools.verify_image_url(cover_url)
        verified_images += 1
        cover_urls.add(cover_url)

        for place in sorted(places, key=lambda item: int(item.get("position") or 0)):
            image_url = str(place.get("image_url") or "").strip()
            if not image_tools.is_hosted_guide_asset_url(image_url, project_id):
                raise RuntimeError(f"{slug} place {place.get('name')} was not hosted in the guide-assets bucket.")
            image_tools.verify_image_url(image_url)
            verified_images += 1

    if len(guides) != 6:
        raise RuntimeError(f"Expected 6 live Adelaide guides, found {len(guides)}.")
    if len(cover_urls) != 6:
        raise RuntimeError("Adelaide guide covers are not unique after import.")

    print(f"VERIFY OK  live Adelaide guides [{app_variant}] -> {len(guides)} guides, {verified_images} hosted images verified")


def run_smoke_check(app_variant: str) -> None:
    env = os.environ.copy()
    env["APP_VARIANT"] = app_variant
    env["SMOKE_CITY"] = CITY
    env["SMOKE_EMAIL"] = SMOKE_EMAIL
    subprocess.run(
        ["node", "scripts/hoodie-endpoint-smoke.mjs"],
        cwd=REPO_ROOT,
        env=env,
        check=True,
    )
    print("VERIFY OK  hoodie endpoint smoke test")


def ensure_admin_email_is_valid(base_url: str, public_anon_key: str, admin_email: str) -> None:
    response = image_tools.api_request(base_url, public_anon_key, "GET", "/admin/admins")
    admins = response.get("data") if isinstance(response, dict) else None
    if not isinstance(admins, list):
        raise RuntimeError("Could not load admin list before running Adelaide guide import.")
    if admin_email.lower() not in {str(admin.get("email") or "").strip().lower() for admin in admins if isinstance(admin, dict)}:
        raise RuntimeError(f"{admin_email} is not an admin in the live project.")


def main() -> None:
    args = parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    ensure_admin_email_is_valid(base_url, public_anon_key, args.admin_email)

    manifest_entries: list[dict[str, Any]] = []
    updated_csv_payloads: dict[Path, list[dict[str, str]]] = {}
    direct_target_guides = fetch_live_adelaide_guides(base_url, public_anon_key, args.app_variant)

    for csv_path in ADELAIDE_CSV_PATHS:
        print(f"\nGUIDE      preparing assets for {csv_path.name}")
        next_rows, guide_manifest_entries, source_variant = prepare_guide_assets(
            project_id=project_id,
            base_url=base_url,
            public_anon_key=public_anon_key,
            admin_email=args.admin_email,
            csv_path=csv_path,
            target_app_variant=args.app_variant,
        )
        existing_intro = str(next_rows[0].get("manual_intro") or "").strip()
        if args.app_variant != source_variant:
            for row in next_rows:
                row["manual_intro"] = existing_intro
            payload = build_city_guide_payload(next_rows)
            existing_target = next(
                (
                    guide
                    for guide in direct_target_guides
                    if str(guide.get("title") or "").strip() == payload["title"]
                    and str(guide.get("city") or "").strip() == payload["city"]
                    and str(guide.get("state") or "").strip() == payload["state"]
                ),
                None,
            )
            if existing_target:
                updated_guide = update_city_guide_direct(
                    base_url=base_url,
                    public_anon_key=public_anon_key,
                    admin_email=args.admin_email,
                    guide_id=str(existing_target.get("id") or "").strip(),
                    payload=payload,
                )
                direct_target_guides = [
                    updated_guide if str(guide.get("id") or "").strip() == str(updated_guide.get("id") or "").strip() else guide
                    for guide in direct_target_guides
                ]
                print(f"UPDATE OK  {csv_path.name}")
            else:
                created_guide = create_city_guide_direct(
                    base_url=base_url,
                    public_anon_key=public_anon_key,
                    admin_email=args.admin_email,
                    payload=payload,
                )
                direct_target_guides.append(created_guide)
                print(f"CREATE OK  {csv_path.name}")
        else:
            preview = preview_import(
                base_url=base_url,
                public_anon_key=public_anon_key,
                admin_email=args.admin_email,
                csv_text=build_csv_text(next_rows),
                app_variant=args.app_variant,
            )
            row_count = int(preview.get("row_count") or 0)
            warnings = preview.get("warnings") or []
            if row_count != 10:
                raise RuntimeError(f"{csv_path.name} preview expected 10 places, found {row_count}.")
            if warnings:
                raise RuntimeError(f"{csv_path.name} preview returned warnings: {warnings}")

            generated_intro = existing_intro or generate_intro(
                base_url=base_url,
                public_anon_key=public_anon_key,
                admin_email=args.admin_email,
                preview=preview,
            )
            for row in next_rows:
                row["manual_intro"] = generated_intro

            final_preview = preview_import(
                base_url=base_url,
                public_anon_key=public_anon_key,
                admin_email=args.admin_email,
                csv_text=build_csv_text(next_rows),
                app_variant=args.app_variant,
                intro_override=generated_intro,
            )
            final_warnings = final_preview.get("warnings") or []
            if final_warnings:
                raise RuntimeError(f"{csv_path.name} final preview returned warnings: {final_warnings}")

            matched_guide = final_preview.get("matched_guide") if isinstance(final_preview, dict) else None
            guide_id = str(matched_guide.get("id") or "").strip() if isinstance(matched_guide, dict) else ""
            commit_import(
                base_url=base_url,
                public_anon_key=public_anon_key,
                admin_email=args.admin_email,
                csv_text=build_csv_text(next_rows),
                guide_id=guide_id,
                intro_override=generated_intro,
                app_variant=args.app_variant,
            )
            print(f"COMMIT OK  {csv_path.name}")

        updated_csv_payloads[csv_path] = next_rows
        manifest_entries.extend(guide_manifest_entries)

    verify_live_adelaide_guides(project_id, base_url, public_anon_key, args.app_variant)

    if not args.skip_csv_write:
        for csv_path, rows in updated_csv_payloads.items():
            write_csv_rows(csv_path, rows)
            print(f"WRITE OK   {csv_path}")

    if not args.skip_manifest_write:
        MANIFEST_PATH.write_text(json.dumps(manifest_entries, indent=2) + "\n", encoding="utf-8")
        print(f"WRITE OK   {MANIFEST_PATH}")

    if not args.skip_smoke:
        run_smoke_check(args.app_variant)

    print(f"\nDONE       Adelaide guides imported and verified for {args.app_variant}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(f"ERROR      {error}", file=sys.stderr)
        sys.exit(1)

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
from io import StringIO
from pathlib import Path
from typing import Any

import repair_city_guide_images as image_tools


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "scripts" / "data"
MANIFEST_PATH = DATA_DIR / "hoodie-sydney-guide-image-manifest.json"
CSV_PATH = Path("/Users/rushi/Downloads/top-10-indian-restaurants-sydney-hoodie.csv")
GUIDE_SLUG = "top-10-indian-restaurants-sydney"
CITY = "Sydney"
STATE = "NSW"
DEFAULT_APP_VARIANT = "burb_mate"
SMOKE_EMAIL = "talkwithrushi@gmail.com"
PRODUCTION_BASE_URL = "https://suburb.knowwhatson.com"


SOURCE_ASSETS: dict[str, dict[str, str]] = {
    "Chatkaaz (Chatkazz Harris Park)": {
        "source_page_url": "https://www.chatkazz.com.au/indian-restaurant-harris-park",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/5f55b1e194de9f314da6d8f2/1666131919801-BWVGJFVZ4GHA1SIOU3ZL/Chatkazz_LeighGriffiths-43.jpg",
        "match_type": "exact",
    },
    "Abhi's Indian Restaurant": {
        "source_page_url": "https://www.abhisindian.com.au/",
        "source_image_url": "https://static.wixstatic.com/media/49c28c_f0c6a360a331412aa92cec0e553e6375~mv2.jpg",
        "match_type": "exact",
    },
    "Malabar Darlinghurst": {
        "source_page_url": "https://malabarcuisine.com.au/darlinghurst/",
        "source_image_url": "https://malabarcuisine.com.au/darlinghurst/wp-content/uploads/sites/2/2024/02/Malabar-Darlinghurst.jpg",
        "match_type": "exact",
    },
    "Kolkata Social": {
        "source_page_url": "https://plateitforward.org.au/kolkata-social/",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/68acf95a80ff9157954a663f/943c6e5e-c837-4d44-8161-742c9e3178d5/Kolkata_Social_Sep25_Credit_Jorge_Santos-46.jpg",
        "match_type": "exact",
    },
    "Foreign Return": {
        "source_page_url": "https://www.foreignreturn.com.au/",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/5fa331ee5600b32177759fa6/1731676863313-PMP31LPSPUQIATQ9S9BO/014A8554+%281%29.jpg",
        "match_type": "exact",
    },
    "The Spice Room": {
        "source_page_url": "https://www.bestrestaurants.com.au/nsw/sydney/circular-quay/restaurant/the-spice-room",
        "source_image_url": "https://www.bestrestaurants.com.au/media/kaibfilh/2.jpg?width=1200&height=630&mode=crop&v=1d81fdf0035e610",
        "match_type": "exact",
    },
    "Nilgiri's": {
        "source_page_url": "https://concreteplayground.com/sydney/restaurants/nilgiris",
        "source_image_url": "https://cdn.concreteplayground.com/content/uploads/2020/05/Nilgiris-cremorne-google-1920x1080.jpg",
        "match_type": "exact",
    },
    "The Grand Palace Indian Restaurant": {
        "source_page_url": "https://commons.wikimedia.org/wiki/File:The_Grand_Palace_-_Indian_Restaurant.jpg",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/d/d6/The_Grand_Palace_-_Indian_Restaurant.jpg",
        "match_type": "exact",
    },
    "Billu's Indian Eatery": {
        "source_page_url": "https://www.billu.com.au/",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/664d3debe549481cfbff5ab7/e9c6cd22-665c-4928-9fbb-a44703ffbcdd/Billu%27s+Indian+Restaurant+Harris+Park-54.jpg",
        "match_type": "exact",
    },
    "Dosa Hut Harris Park": {
        "source_page_url": "https://www.dosahut.net.au/menu/harris-park/",
        "source_image_url": "https://www.dosahut.net.au/wp-content/uploads/2024/02/Dosa-Hut-Table-Catering-2-1.png",
        "match_type": "exact",
    },
}

COVER_PLACE_NAME = "Chatkaaz (Chatkazz Harris Park)"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Publish the Sydney Indian restaurants Hoodie guide with verified hosted image assets."
    )
    parser.add_argument(
        "--app-variant",
        choices=["burb_mate", "ghar"],
        default=DEFAULT_APP_VARIANT,
        help="Target app_variant to publish the guide into.",
    )
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email to use for guide uploads/imports.",
    )
    parser.add_argument(
        "--skip-csv-write",
        action="store_true",
        help="Do not rewrite the local CSV after a successful import.",
    )
    parser.add_argument(
        "--skip-manifest-write",
        action="store_true",
        help="Do not rewrite the Sydney image manifest after a successful import.",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip the post-import Hoodie endpoint smoke test.",
    )
    parser.add_argument(
        "--skip-app-shell",
        action="store_true",
        help="Skip the production app-shell route check.",
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


def build_csv_text(rows: list[dict[str, str]]) -> str:
    if not rows:
        raise RuntimeError("Cannot build CSV text from an empty row list.")
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def require_rows_consistent(rows: list[dict[str, str]]) -> tuple[str, str]:
    if not rows:
        raise RuntimeError(f"{CSV_PATH.name} is empty.")
    slug = str(rows[0].get("guide_slug") or "").strip()
    title = str(rows[0].get("guide_title") or "").strip()
    city = str(rows[0].get("city") or "").strip()
    state = str(rows[0].get("state") or "").strip()
    if city != CITY or state != STATE:
        raise RuntimeError(f"{CSV_PATH.name} is not a {CITY}, {STATE} guide CSV.")
    if slug != GUIDE_SLUG:
        raise RuntimeError(f"{CSV_PATH.name} guide_slug should be {GUIDE_SLUG!r}, found {slug!r}.")
    if not title:
        raise RuntimeError(f"{CSV_PATH.name} is missing guide_title.")
    if len(rows) != 10:
        raise RuntimeError(f"{CSV_PATH.name} should contain 10 place rows, found {len(rows)}.")

    place_names = [str(row.get("place_name") or "").strip() for row in rows]
    missing = [name for name in place_names if name not in SOURCE_ASSETS]
    if missing:
        raise RuntimeError(f"Missing verified source assets for: {', '.join(missing)}")
    return slug, title


def fetch_status(url: str) -> int:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; HoodieSydneyIndianGuideImporter/1.0)",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        response.read(64)
        return int(response.status)


def verify_source_assets() -> dict[str, dict[str, str]]:
    verified: dict[str, dict[str, str]] = {}
    for place_name, asset in SOURCE_ASSETS.items():
        page_url = asset["source_page_url"]
        image_url = asset["source_image_url"]
        page_status = fetch_status(page_url)
        if page_status >= 400:
            raise RuntimeError(f"{place_name} source page failed with status {page_status}: {page_url}")
        resolved_image_url, content_type = image_tools.verify_image_url(image_url)
        if not content_type.startswith("image/"):
            raise RuntimeError(f"{place_name} image returned non-image content type {content_type}: {image_url}")
        verified[place_name] = {
            **asset,
            "source_image_url": resolved_image_url,
            "content_type": content_type,
        }
        print(f"SOURCE OK  {place_name} [{content_type}]")
    return verified


def ensure_admin_email_is_valid(base_url: str, public_anon_key: str, admin_email: str) -> None:
    response = image_tools.api_request(base_url, public_anon_key, "GET", "/admin/admins")
    admins = response.get("data") if isinstance(response, dict) else None
    if not isinstance(admins, list):
        raise RuntimeError("Could not load admin list before importing the guide.")
    admin_emails = {str(admin.get("email") or "").strip().lower() for admin in admins if isinstance(admin, dict)}
    if admin_email.lower() not in admin_emails:
        raise RuntimeError(f"{admin_email} is not an admin in the live project.")


def upload_assets(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    rows: list[dict[str, str]],
    verified_assets: dict[str, dict[str, str]],
    guide_title: str,
) -> tuple[str, dict[int, str], list[dict[str, Any]]]:
    cover_asset = verified_assets[COVER_PLACE_NAME]
    cover_hosted_url = image_tools.upload_remote_image(
        base_url,
        public_anon_key,
        admin_email,
        GUIDE_SLUG,
        "cover",
        None,
        COVER_PLACE_NAME,
        cover_asset["source_image_url"],
    )

    manifest_entries: list[dict[str, Any]] = [
        {
            "guide_slug": GUIDE_SLUG,
            "slot_type": "cover",
            "place_position": None,
            "place_name": guide_title,
            "source_page_url": cover_asset["source_page_url"],
            "source_image_url": cover_asset["source_image_url"],
            "hosted_url": cover_hosted_url,
            "match_type": cover_asset["match_type"],
            "cover_from_place_position": 0,
            "cover_from_place_name": COVER_PLACE_NAME,
        }
    ]

    hosted_by_position: dict[int, str] = {}
    for row in rows:
        position = int(str(row.get("place_position") or "0").strip() or 0)
        place_name = str(row.get("place_name") or "").strip()
        asset = verified_assets[place_name]
        hosted_url = image_tools.upload_remote_image(
            base_url,
            public_anon_key,
            admin_email,
            GUIDE_SLUG,
            "place",
            position,
            place_name,
            asset["source_image_url"],
        )
        if not image_tools.is_hosted_guide_asset_url(hosted_url, project_id):
            raise RuntimeError(f"{place_name} did not upload to the expected guide-assets bucket: {hosted_url}")
        hosted_by_position[position] = hosted_url
        manifest_entries.append(
            {
                "guide_slug": GUIDE_SLUG,
                "slot_type": "place",
                "place_position": position,
                "place_name": place_name,
                "source_page_url": asset["source_page_url"],
                "source_image_url": asset["source_image_url"],
                "hosted_url": hosted_url,
                "match_type": asset["match_type"],
            }
        )

    return cover_hosted_url, hosted_by_position, manifest_entries


def build_import_rows(
    rows: list[dict[str, str]],
    app_variant: str,
    cover_hosted_url: str,
    hosted_by_position: dict[int, str],
    intro: str,
) -> list[dict[str, str]]:
    next_rows: list[dict[str, str]] = []
    for row in rows:
        position = int(str(row.get("place_position") or "0").strip() or 0)
        hosted_url = hosted_by_position.get(position, "")
        if not hosted_url:
            raise RuntimeError(f"Missing hosted image URL for place_position={position}.")
        next_row = dict(row)
        next_row["app_variant"] = app_variant
        next_row["cover_image_url"] = cover_hosted_url
        next_row["place_image_url"] = hosted_url
        next_row["manual_intro"] = intro
        next_rows.append(next_row)
    return next_rows


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


def build_local_intro(preview: dict[str, Any]) -> str:
    guide = preview.get("guide") if isinstance(preview, dict) else None
    if not isinstance(guide, dict):
        raise RuntimeError("Preview payload was missing guide metadata for local intro generation.")

    places = guide.get("places") if isinstance(guide.get("places"), list) else []
    lead_names = [str(place.get("name") or "").strip() for place in places[:4] if isinstance(place, dict)]
    lead_text = ", ".join(name for name in lead_names if name)
    if not lead_text:
        lead_text = "street-food favourites, regional specialists and polished city dining rooms"
    return (
        "Sydney's Indian food scene stretches from Harris Park's Little India to inner-city dining rooms, "
        f"and this guide brings together 10 strong starting points, including {lead_text}. "
        "Use it as a quick shortlist for chaat, dosa, Bengali cooking, regional curries and group-friendly meals."
    )


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


def fetch_live_guides(base_url: str, public_anon_key: str, app_variant: str) -> list[dict[str, Any]]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "GET",
        f"/city-guides?city={urllib.parse.quote(CITY)}&app_variant={urllib.parse.quote(app_variant)}",
    )
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError("Could not load live Sydney guides.")
    return [guide for guide in guides if isinstance(guide, dict)]


def verify_preview(project_id: str, preview: dict[str, Any]) -> None:
    warnings = preview.get("warnings") or []
    if warnings:
        raise RuntimeError(f"CSV preview returned warnings: {warnings}")
    row_count = int(preview.get("row_count") or 0)
    if row_count != 10:
        raise RuntimeError(f"CSV preview expected 10 places, found {row_count}.")

    guide = preview.get("guide") if isinstance(preview, dict) else None
    if not isinstance(guide, dict):
        raise RuntimeError("CSV preview was missing guide metadata.")
    cover_url = str(guide.get("cover_image_url") or "").strip()
    if not image_tools.is_hosted_guide_asset_url(cover_url, project_id):
        raise RuntimeError(f"Preview cover image was not hosted in the guide-assets bucket: {cover_url}")
    places = guide.get("places") if isinstance(guide.get("places"), list) else []
    blank_place_images = [
        str(place.get("name") or "").strip()
        for place in places
        if isinstance(place, dict) and not str(place.get("image_url") or "").strip()
    ]
    if blank_place_images:
        raise RuntimeError(f"Preview still has blank place images for: {', '.join(blank_place_images)}")


def verify_live_guide(project_id: str, base_url: str, public_anon_key: str, app_variant: str) -> None:
    guides = fetch_live_guides(base_url, public_anon_key, app_variant)
    guide = next((item for item in guides if str(item.get("slug") or "").strip() == GUIDE_SLUG), None)
    if not guide:
        live_slugs = sorted(str(item.get("slug") or "").strip() for item in guides if isinstance(item, dict))
        raise RuntimeError(f"Live guide {GUIDE_SLUG!r} was not found. Live Sydney slugs: {live_slugs}")

    if str(guide.get("app_variant") or "").strip() != app_variant:
        raise RuntimeError(f"{GUIDE_SLUG} has app_variant={guide.get('app_variant')!r}, expected {app_variant!r}.")
    if not str(guide.get("intro") or "").strip():
        raise RuntimeError(f"{GUIDE_SLUG} is missing an intro after import.")

    cover_url = str(guide.get("cover_image_url") or "").strip()
    if not image_tools.is_hosted_guide_asset_url(cover_url, project_id):
        raise RuntimeError(f"{GUIDE_SLUG} cover was not hosted in the guide-assets bucket: {cover_url}")
    image_tools.verify_image_url(cover_url)

    places = guide.get("places") if isinstance(guide.get("places"), list) else []
    if len(places) != 10:
        raise RuntimeError(f"{GUIDE_SLUG} should have 10 places after import, found {len(places)}.")
    for place in sorted(places, key=lambda item: int(item.get("position") or 0)):
        image_url = str(place.get("image_url") or "").strip()
        if not image_tools.is_hosted_guide_asset_url(image_url, project_id):
            raise RuntimeError(f"{GUIDE_SLUG} place {place.get('name')} was not hosted in the guide-assets bucket.")
        image_tools.verify_image_url(image_url)

    print(f"VERIFY OK  live {GUIDE_SLUG} [{app_variant}] -> 10 places and 11 hosted images verified")


def update_manifest(manifest_entries: list[dict[str, Any]]) -> None:
    existing: list[dict[str, Any]] = []
    if MANIFEST_PATH.exists():
        payload = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise RuntimeError(f"{MANIFEST_PATH} should contain a JSON list.")
        existing = [entry for entry in payload if isinstance(entry, dict)]

    next_entries = [entry for entry in existing if str(entry.get("guide_slug") or "") != GUIDE_SLUG]
    next_entries.extend(manifest_entries)
    MANIFEST_PATH.write_text(json.dumps(next_entries, indent=2) + "\n", encoding="utf-8")
    print(f"WRITE OK   {MANIFEST_PATH}")


def run_smoke_check(app_variant: str) -> None:
    env = os.environ.copy()
    env["APP_VARIANT"] = app_variant
    env["SMOKE_CITY"] = CITY
    env["SMOKE_EMAIL"] = SMOKE_EMAIL
    subprocess.run(["npm", "run", "smoke:hoodie"], cwd=REPO_ROOT, env=env, check=True)
    print("VERIFY OK  hoodie endpoint smoke test")


def verify_app_shell() -> None:
    route = f"/guide/sydney/{GUIDE_SLUG}"
    url = f"{PRODUCTION_BASE_URL}{route}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; HoodieSydneyIndianGuideImporter/1.0)",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        text = response.read().decode("utf-8", errors="replace")
        if int(response.status) >= 400:
            raise RuntimeError(f"App shell route failed with status {response.status}: {url}")
    if '<div id="root"></div>' not in text or "Hoodie - Your Australia Suburb Mate" not in text:
        raise RuntimeError(f"App shell route did not return the Hoodie Vite shell: {url}")
    print(f"VERIFY OK  app shell {route}")


def main() -> None:
    args = parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    ensure_admin_email_is_valid(base_url, public_anon_key, args.admin_email)

    rows = read_csv_rows(CSV_PATH)
    _guide_slug, guide_title = require_rows_consistent(rows)
    verified_assets = verify_source_assets()

    cover_hosted_url, hosted_by_position, manifest_entries = upload_assets(
        project_id=project_id,
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=args.admin_email,
        rows=rows,
        verified_assets=verified_assets,
        guide_title=guide_title,
    )

    draft_rows = build_import_rows(
        rows,
        args.app_variant,
        cover_hosted_url,
        hosted_by_position,
        intro="",
    )
    preview = preview_import(
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=args.admin_email,
        csv_text=build_csv_text(draft_rows),
        app_variant=args.app_variant,
    )
    verify_preview(project_id, preview)

    existing_intro = str(rows[0].get("manual_intro") or "").strip()
    if existing_intro:
        intro = existing_intro
    else:
        try:
            intro = generate_intro(
                base_url=base_url,
                public_anon_key=public_anon_key,
                admin_email=args.admin_email,
                preview=preview,
            )
        except Exception as error:  # noqa: BLE001
            intro = build_local_intro(preview)
            print(f"WARN       falling back to local intro: {error}")

    final_rows = build_import_rows(
        rows,
        args.app_variant,
        cover_hosted_url,
        hosted_by_position,
        intro=intro,
    )
    final_csv_text = build_csv_text(final_rows)
    final_preview = preview_import(
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=args.admin_email,
        csv_text=final_csv_text,
        app_variant=args.app_variant,
        intro_override=intro,
    )
    verify_preview(project_id, final_preview)

    matched_guide = final_preview.get("matched_guide") if isinstance(final_preview, dict) else None
    guide_id = str(matched_guide.get("id") or "").strip() if isinstance(matched_guide, dict) else ""
    commit_import(
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=args.admin_email,
        csv_text=final_csv_text,
        guide_id=guide_id,
        intro_override=intro,
        app_variant=args.app_variant,
    )
    print(f"COMMIT OK  {CSV_PATH.name}")

    verify_live_guide(project_id, base_url, public_anon_key, args.app_variant)

    if not args.skip_csv_write:
        write_csv_rows(CSV_PATH, final_rows)
        print(f"WRITE OK   {CSV_PATH}")

    if not args.skip_manifest_write:
        update_manifest(manifest_entries)

    if not args.skip_smoke:
        run_smoke_check(args.app_variant)

    if not args.skip_app_shell:
        verify_app_shell()

    print(f"\nDONE       {GUIDE_SLUG} imported and verified for {args.app_variant}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(f"ERROR      {error}", file=sys.stderr)
        sys.exit(1)

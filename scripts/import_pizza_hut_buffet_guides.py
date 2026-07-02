#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import os
import subprocess
import urllib.parse
from io import StringIO
from pathlib import Path
from typing import Any

import repair_city_guide_images as image_tools


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "scripts" / "data" / "pizza-hut-buffet-guides"
APP_VARIANT = "all"
TITLE = "The Only All-You-Can-Eat Pizza Huts in Australia"
POSITION = "900000"
SMOKE_EMAIL = "talkwithrushi@gmail.com"

CSV_FIELDS = [
    "city",
    "state",
    "guide_title",
    "guide_slug",
    "cover_image_url",
    "manual_intro",
    "position",
    "app_variant",
    "place_position",
    "place_name",
    "place_description",
    "place_image_url",
    "navigation_link",
    "lat",
    "lng",
]

COVER_IMAGE_SOURCE_URL = "https://files.catbox.moe/lxx4rl.png"

TARGET_CITIES = [
    {"city": "Sydney", "state": "NSW"},
    {"city": "Newcastle", "state": "NSW"},
    {"city": "Wollongong", "state": "NSW"},
    {"city": "Armidale", "state": "NSW"},
    {"city": "Brisbane", "state": "QLD"},
    {"city": "Gold Coast", "state": "QLD"},
    {"city": "Melbourne", "state": "VIC"},
    {"city": "Geelong", "state": "VIC"},
    {"city": "Hobart", "state": "TAS"},
]

EXCLUDED_CITIES = ["Adelaide", "Perth", "Canberra", "Darwin"]

PLACE_IMAGE_URLS = [
    "https://a.storyblok.com/f/49069/800x400/e4f6a9f6f4/t20_blogimage_800x400_v4.png",
    "https://a.storyblok.com/f/49069/800x400/f4ca28f6c7/everything-you-need-to-know-about-hawaiian-pizza-on-its-60th-anniversary.png",
    "https://a.storyblok.com/f/49069/800x400/b39949c4a3/vegan-pizza-delivery-takeaway-options-at-pizza-hut_800x400_v2-1.png",
    "https://a.storyblok.com/f/49069/800x400/af27999acd/cheesedunk_blog-image_800x400_v3.png",
    "https://a.storyblok.com/f/49069/800x400/ccc5958ab2/loaded-mac-cheese-added-to-our-pasta-delivery-menu_800x400.png",
    "https://a.storyblok.com/f/49069/800x400/1abf0b43ad/meatballs_blog-image_800x400_correct-size.png",
    "https://a.storyblok.com/f/49069/800x400/5d78ead6ec/pizzas-for-podiums-pizza-hut-giveaway.png",
    "https://a.storyblok.com/f/49069/800x400/24f74c4af7/supercars-and-pizza-hut_800x400.png",
]

INTRO = (
    "Australia's all-you-can-eat Pizza Hut dine-in buffets are now rare: only eight locations remain across NSW, QLD, VIC "
    "and TAS. Expect a nostalgic buffet mix of pizza, pasta, garlic bread, salad and dessert, with fresh pizzas cycling "
    "from the oven and favourites often available on request.\n\n"
    "Prices and sessions can change by store, so check before you travel. Current brief pricing: weekdays $18.95 lunch "
    "/ $24.95 dinner; weekends $23.95 lunch / $24.95 dinner."
)

PLACES = [
    {
        "name": "Minto St Andrews Restaurant",
        "description": "One of Sydney's last nostalgic dine-in Pizza Hut buffet restaurants, close to St Andrews and Minto. Address: 1 Swettenham Rd, Minto NSW 2566.",
        "lat": -34.0276,
        "lng": 150.833,
    },
    {
        "name": "Windsor Dine In",
        "description": "Hawkesbury-area dine-in buffet Pizza Hut with the classic all-you-can-eat format. Address: 69 Macquarie St, Windsor NSW 2756.",
        "lat": -33.608336,
        "lng": 150.819618,
    },
    {
        "name": "Orange Dine In",
        "description": "Central West NSW Pizza Hut dine-in buffet stop for the rare all-you-can-eat format. Address: 33 Bathurst Rd, Orange NSW 2800.",
        "lat": -33.2865,
        "lng": 149.108,
    },
    {
        "name": "Gympie Dine In",
        "description": "Regional Queensland Pizza Hut dine-in buffet serving the classic unlimited pizza, pasta, garlic bread, salad and dessert setup. Address: 112 Bruce Hwy, Gympie QLD 4570.",
        "lat": -26.198486,
        "lng": 152.666174,
    },
    {
        "name": "Browns Plains Restaurant",
        "description": "South Brisbane-area Pizza Hut buffet restaurant at Grand Plaza Shopping Centre. Address: 1-25 Browns Plains Rd, Browns Plains QLD 4118.",
        "lat": -27.660306,
        "lng": 153.038864,
    },
    {
        "name": "Toowoomba Dine In",
        "description": "Darling Downs dine-in Pizza Hut buffet with the all-you-can-eat restaurant format. Address: 871 Ruthven St, Toowoomba QLD 4350.",
        "lat": -27.5931,
        "lng": 151.948,
    },
    {
        "name": "Ballarat Dine In",
        "description": "Victoria's remaining Pizza Hut buffet destination in Ballarat, keeping the dine-in all-you-can-eat format alive. Address: 31 Victoria St, Ballarat VIC 3350.",
        "lat": -37.5624,
        "lng": 143.866,
    },
    {
        "name": "New Town Dine In",
        "description": "Tasmania's Pizza Hut dine-in buffet location, a short trip from central Hobart. Address: 74 Forster St, Hobart TAS 7008.",
        "lat": -42.8558,
        "lng": 147.303,
    },
]


def slugify(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("&", " and ")
        .replace("'", "")
        .replace("$", " ")
        .replace("/", " ")
    )


def guide_slug(city: str) -> str:
    city_slug = "-".join(slugify(city).split())
    return f"only-all-you-can-eat-pizza-huts-in-australia-{city_slug}"


def format_coord(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".")


def maps_link(lat: float, lng: float) -> str:
    return f"https://maps.google.com/?q={format_coord(lat)},{format_coord(lng)}"


def build_csv_text(rows: list[dict[str, str]]) -> str:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def write_csv_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def rows_for_city(city: str, state: str) -> list[dict[str, str]]:
    slug = guide_slug(city)
    rows: list[dict[str, str]] = []
    for index, place in enumerate(PLACES):
        lat = float(place["lat"])
        lng = float(place["lng"])
        rows.append(
            {
                "city": city,
                "state": state,
                "guide_title": TITLE,
                "guide_slug": slug,
                "cover_image_url": COVER_IMAGE_SOURCE_URL,
                "manual_intro": INTRO,
                "position": POSITION,
                "app_variant": APP_VARIANT,
                "place_position": str(index),
                "place_name": str(place["name"]),
                "place_description": str(place["description"]),
                "place_image_url": PLACE_IMAGE_URLS[index],
                "navigation_link": maps_link(lat, lng),
                "lat": format_coord(lat),
                "lng": format_coord(lng),
            }
        )
    return rows


def preview_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    rows: list[dict[str, str]],
) -> dict[str, Any]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "POST",
        "/admin/city-guides/import-csv",
        body={
            "admin_email": admin_email,
            "csv_text": build_csv_text(rows),
            "guide_id": "",
            "intro_override": rows[0]["manual_intro"],
            "app_variant": APP_VARIANT,
            "mode": "preview",
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError("Preview response was missing guide data.")
    if int(data.get("row_count") or 0) != len(PLACES):
        raise RuntimeError(f"{rows[0]['guide_slug']} preview expected {len(PLACES)} rows, got {data.get('row_count')}.")
    warnings = data.get("warnings") or []
    if warnings:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview returned warnings: {warnings}")
    guide = data.get("guide") if isinstance(data.get("guide"), dict) else {}
    if guide.get("app_variant") != APP_VARIANT:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview app_variant mismatch: {guide.get('app_variant')!r}")
    if guide.get("city") != rows[0]["city"] or guide.get("state") != rows[0]["state"]:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview city/state mismatch: {guide.get('city')!r}, {guide.get('state')!r}")
    if guide.get("guide_slug") != rows[0]["guide_slug"]:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview slug mismatch: {guide.get('guide_slug')!r}")
    return data


def commit_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    rows: list[dict[str, str]],
    preview: dict[str, Any],
) -> dict[str, Any]:
    matched = preview.get("matched_guide") if isinstance(preview.get("matched_guide"), dict) else None
    guide_id = str(matched.get("id") or "").strip() if matched else ""
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "POST",
        "/admin/city-guides/import-csv",
        body={
            "admin_email": admin_email,
            "csv_text": build_csv_text(rows),
            "guide_id": guide_id,
            "intro_override": rows[0]["manual_intro"],
            "app_variant": APP_VARIANT,
            "mode": "commit",
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    guide = data.get("guide") if isinstance(data, dict) else None
    if not isinstance(guide, dict):
        raise RuntimeError("Commit response was missing guide data.")
    return guide


def fetch_city_guides(base_url: str, public_anon_key: str, city: str, app_variant: str) -> list[dict[str, Any]]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "GET",
        f"/city-guides?city={urllib.parse.quote(city)}&app_variant={urllib.parse.quote(app_variant)}",
    )
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError(f"Could not fetch city guides for {city} [{app_variant}].")
    return [guide for guide in guides if isinstance(guide, dict)]


def ensure_admin_email_is_valid(base_url: str, public_anon_key: str, admin_email: str) -> None:
    response = image_tools.api_request(base_url, public_anon_key, "GET", "/admin/admins")
    admins = response.get("data") if isinstance(response, dict) else None
    if not isinstance(admins, list):
        raise RuntimeError("Could not load admin list.")
    allowed = {str(admin.get("email") or "").strip().lower() for admin in admins if isinstance(admin, dict)}
    if admin_email.lower() not in allowed:
        raise RuntimeError(f"{admin_email} is not an admin in the live project.")


def verify_live_guides(project_id: str, base_url: str, public_anon_key: str) -> None:
    expected_by_city = {entry["city"]: guide_slug(entry["city"]) for entry in TARGET_CITIES}
    verified_images = 0

    for app_variant in ("ghar", "burb_mate"):
        for city, expected_slug in expected_by_city.items():
            live_guides = fetch_city_guides(base_url, public_anon_key, city, app_variant)
            guide = next((item for item in live_guides if str(item.get("slug") or "") == expected_slug), None)
            if not guide:
                live_slugs = [str(item.get("slug") or "") for item in live_guides]
                raise RuntimeError(f"Missing {expected_slug} in {city} [{app_variant}], found {live_slugs}.")
            if guide.get("app_variant") != APP_VARIANT:
                raise RuntimeError(f"{expected_slug} stored with app_variant={guide.get('app_variant')!r}.")
            if guide.get("position") != int(POSITION):
                raise RuntimeError(f"{expected_slug} position mismatch: {guide.get('position')!r}.")
            if guide.get("title") != TITLE:
                raise RuntimeError(f"{expected_slug} title mismatch: {guide.get('title')!r}.")

            cover_url = str(guide.get("cover_image_url") or "").strip()
            if not image_tools.is_hosted_guide_asset_url(cover_url, project_id):
                raise RuntimeError(f"{expected_slug} cover is not hosted in the guide-assets bucket: {cover_url}")
            image_tools.verify_image_url(cover_url)
            verified_images += 1

            places = sorted(guide.get("places") or [], key=lambda item: int(item.get("position") or 0))
            if len(places) != len(PLACES):
                raise RuntimeError(f"{expected_slug} should have {len(PLACES)} places, found {len(places)}.")
            for index, place in enumerate(places):
                expected = PLACES[index]
                if place.get("name") != expected["name"]:
                    raise RuntimeError(f"{expected_slug} place {index} name mismatch: {place.get('name')!r}")
                lat = float(place.get("lat"))
                lng = float(place.get("lng"))
                if abs(lat - float(expected["lat"])) > 0.00001 or abs(lng - float(expected["lng"])) > 0.00001:
                    raise RuntimeError(f"{expected_slug} place {place.get('name')} coordinate mismatch: {lat}, {lng}")
                if str(place.get("navigation_link") or "") != maps_link(float(expected["lat"]), float(expected["lng"])):
                    raise RuntimeError(f"{expected_slug} place {place.get('name')} map link mismatch.")
                image_url = str(place.get("image_url") or "").strip()
                if not image_tools.is_hosted_guide_asset_url(image_url, project_id):
                    raise RuntimeError(f"{expected_slug} place {place.get('name')} image is not hosted: {image_url}")
                image_tools.verify_image_url(image_url)
                verified_images += 1
        print(f"VERIFY OK  Pizza Hut buffet guide live for {app_variant}.")

        for city in EXCLUDED_CITIES:
            live_guides = fetch_city_guides(base_url, public_anon_key, city, app_variant)
            stray = [item.get("slug") for item in live_guides if str(item.get("slug") or "").startswith("only-all-you-can-eat-pizza-huts-in-australia")]
            if stray:
                raise RuntimeError(f"Unexpected Pizza Hut buffet guide in excluded city {city} [{app_variant}]: {stray}")
        print(f"VERIFY OK  Pizza Hut buffet guide absent from excluded cities for {app_variant}.")

    print(f"VERIFY OK  {verified_images} hosted image responses checked.")


def run_smoke_check(app_variant: str, city: str) -> None:
    env = os.environ.copy()
    env["APP_VARIANT"] = app_variant
    env["SMOKE_CITY"] = city
    env["SMOKE_EMAIL"] = SMOKE_EMAIL
    subprocess.run(
        ["node", "scripts/hoodie-endpoint-smoke.mjs"],
        cwd=REPO_ROOT,
        env=env,
        check=True,
    )
    print(f"SMOKE OK   hoodie endpoint smoke [{app_variant}] for {city}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import the Pizza Hut buffet guides into live city guides.")
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email authorized in the live project.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Write CSVs and preview imports without committing.")
    parser.add_argument("--skip-smoke", action="store_true", help="Skip endpoint smoke checks after verification.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    ensure_admin_email_is_valid(base_url, public_anon_key, args.admin_email)

    image_tools.verify_image_url(COVER_IMAGE_SOURCE_URL)
    for url in PLACE_IMAGE_URLS:
        image_tools.verify_image_url(url)

    previews: list[tuple[list[dict[str, str]], dict[str, Any]]] = []
    for target in TARGET_CITIES:
        city = target["city"]
        rows = rows_for_city(city, target["state"])
        csv_path = DATA_DIR / f"{guide_slug(city)}.csv"
        write_csv_rows(csv_path, rows)
        preview = preview_import(base_url, public_anon_key, args.admin_email, rows)
        previews.append((rows, preview))
        matched = preview.get("matched_guide") if isinstance(preview.get("matched_guide"), dict) else None
        action = "update" if matched else "create"
        print(f"PREVIEW OK {rows[0]['guide_slug']} [{action}] -> {len(rows)} places")

    if args.dry_run:
        print("DRY RUN    CSVs written and previews passed; no live commits made.")
        return

    for rows, preview in previews:
        guide = commit_import(base_url, public_anon_key, args.admin_email, rows, preview)
        print(f"COMMIT OK  {guide.get('slug')} -> {guide.get('city')} [{guide.get('app_variant')}]")

    verify_live_guides(project_id, base_url, public_anon_key)

    if not args.skip_smoke:
        run_smoke_check("ghar", "sydney")
        run_smoke_check("burb_mate", "sydney")

    print("\nDONE       Pizza Hut buffet guides imported and verified for both apps.")


if __name__ == "__main__":
    main()

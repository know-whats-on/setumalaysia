#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import os
import urllib.parse
from io import StringIO
from pathlib import Path
from typing import Any

import repair_city_guide_images as image_tools


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "scripts" / "data" / "national-donut-day-guides"
APP_VARIANT = "all"
TITLE = "National Donut Day: Free Donut Stops"
POSITION = "-35"
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

COVER_IMAGE_SOURCE_URL = "https://files.catbox.moe/pwnzut.png"
DONUT_KING_IMAGE_URL = "https://files.catbox.moe/g0rf0f.png"
BROOKLYN_IMAGE_URL = "https://files.catbox.moe/5x74v5.png"
KRISPY_KREME_IMAGE_URL = "https://files.catbox.moe/l2d56k.png"
WALKERS_IMAGE_URL = (
    "https://images.scentregroup.io/image/fetch/q_auto%2Cw_1200%2Cf_auto%2Cdpr_auto/"
    "https%3A//images.ctfassets.net/zzgnkgna3r3g/5eVGx5fWDqWUkOtGgubKL/"
    "65af211c8302202771694d9e44323116/Scentreconnect_4q1x5pbDUAa6WG04COCom2_hero-image"
)
SCU_DONUT_IMAGE_URL = "https://www.scu.edu.au/media/scu-dep/current-students/orientation/images/pexels-mccutcheon-1191639.jpg"

DONUT_KING_PROMO_URL = "https://www.donutking.com.au/nationaldonutday2026"
DONUT_KING_LOCATOR_URL = "https://www.donutking.com.au/stores"
BROOKLYN_PROMO_URL = "https://www.broadwaysydney.com.au/experience/events/free-donut"
BROOKLYN_LOCATOR_URL = "https://brooklyndonuts.com.au/locations/"
WESTFIELD_PLENTY_VALLEY_WALKERS_URL = "https://www.westfield.com.au/offer/7usrjvS5TSnxHTumhg8rgk/doughnut-day-plenty-valley"
SCU_COASTRS_DONUT_DAY_URL = "https://www.scu.edu.au/engage/events/coastrs-donut-day/"
KRISPY_KREME_PROMO_URL = (
    "https://www.facebook.com/KrispyAustralia/posts/"
    "were-officially-counting-down-to-our-favourite-day-of-the-year-save-the-date-fri/1458361192987045/"
)
KRISPY_KREME_LOCATOR_URL = "https://www.krispykreme.com.au/stores/"

INTRO = (
    "National Donut Day lands on Friday 5 June 2026. These are verified free-donut stops with a real outlet "
    "mapped for this city or nearby metro area. Offers are for 5 June 2026 only, may be while stocks last, and "
    "some require the brand app or loyalty scan. Check the linked brand terms before travelling."
)

TARGET_CITIES = [
    {"city": "Sydney", "state": "NSW"},
    {"city": "Melbourne", "state": "VIC"},
    {"city": "Brisbane", "state": "QLD"},
    {"city": "Adelaide", "state": "SA"},
    {"city": "Perth", "state": "WA"},
    {"city": "Canberra", "state": "ACT"},
    {"city": "Hobart", "state": "TAS"},
    {"city": "Gold Coast", "state": "QLD"},
    {"city": "Newcastle", "state": "NSW"},
    {"city": "Wollongong", "state": "NSW"},
    {"city": "Geelong", "state": "VIC"},
    {"city": "Armidale", "state": "NSW"},
]

EXCLUDED_CITIES = ["Darwin"]

CITY_PLACES: dict[str, list[dict[str, Any]]] = {
    "Sydney": [
        {
            "brand": "Donut King",
            "name": "Donut King Marrickville",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -33.908086,
            "lng": 151.172182,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Brooklyn Donuts",
            "name": "Brooklyn Donuts Broadway",
            "description": "Free Original Glaze Donut on Friday 5 June 2026 when you download the Brooklyn Donuts loyalty app and scan in-store.",
            "lat": -33.8837417,
            "lng": 151.194767,
            "image": BROOKLYN_IMAGE_URL,
        },
        {
            "brand": "Krispy Kreme",
            "name": "Krispy Kreme The Galeries",
            "description": "Free Original Glazed Doughnut on Friday 5 June 2026 at Krispy Kreme stores. Excludes partner locations such as 7-Eleven, BP and Woolworths.",
            "lat": -33.872551,
            "lng": 151.207184,
            "image": KRISPY_KREME_IMAGE_URL,
        },
    ],
    "Melbourne": [
        {
            "brand": "Donut King",
            "name": "Donut King Northcote Plaza",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -37.774327,
            "lng": 145.007723,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Krispy Kreme",
            "name": "Krispy Kreme Swanston St",
            "description": "Free Original Glazed Doughnut on Friday 5 June 2026 at Krispy Kreme stores. Excludes partner locations such as 7-Eleven, BP and Woolworths.",
            "lat": -37.8163,
            "lng": 144.96674,
            "image": KRISPY_KREME_IMAGE_URL,
        },
        {
            "brand": "Walker's Doughnuts",
            "name": "Walker's Doughnuts at Westfield Plenty Valley",
            "description": "Free glazed doughnut for Westfield Members at Westfield Plenty Valley on Friday 5 June 2026, 10am-1pm, limited to 300 redemptions. Redeem from the Kids Club area near Kmart and scan your Westfield membership.",
            "lat": -37.6513316,
            "lng": 145.0721628,
            "image": WALKERS_IMAGE_URL,
            "source": WESTFIELD_PLENTY_VALLEY_WALKERS_URL,
        },
    ],
    "Brisbane": [
        {
            "brand": "Donut King",
            "name": "Donut King Indooroopilly",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -27.499707,
            "lng": 152.972861,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Brooklyn Donuts",
            "name": "Brooklyn Donuts Carindale",
            "description": "Free Original Glaze Donut on Friday 5 June 2026 for Brooklyn Donuts loyalty app customers. Download the app and scan in-store at the participating Carindale outlet.",
            "lat": -27.5028499,
            "lng": 153.1019787,
            "image": BROOKLYN_IMAGE_URL,
        },
        {
            "brand": "Krispy Kreme",
            "name": "Krispy Kreme Shell Nudgee",
            "description": "Free Original Glazed Doughnut on Friday 5 June 2026 at Krispy Kreme stores. Excludes partner locations such as 7-Eleven, BP and Woolworths.",
            "lat": -27.377774,
            "lng": 153.093814,
            "image": KRISPY_KREME_IMAGE_URL,
        },
    ],
    "Adelaide": [
        {
            "brand": "Donut King",
            "name": "Donut King Mobile Mile End",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -34.940979,
            "lng": 138.605994,
            "image": DONUT_KING_IMAGE_URL,
        },
    ],
    "Perth": [
        {
            "brand": "Donut King",
            "name": "Donut King Belmont Forum",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -31.964587,
            "lng": 115.935521,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Krispy Kreme",
            "name": "Krispy Kreme Whitford City Centre",
            "description": "Free Original Glazed Doughnut on Friday 5 June 2026 at Krispy Kreme stores. Excludes partner locations such as 7-Eleven, BP and Woolworths.",
            "lat": -31.796798,
            "lng": 115.745866,
            "image": KRISPY_KREME_IMAGE_URL,
        },
    ],
    "Canberra": [
        {
            "brand": "Donut King",
            "name": "Donut King Jamison Plaza",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -35.252761,
            "lng": 149.071204,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Brooklyn Donuts",
            "name": "Brooklyn Donuts Woden",
            "description": "Free Original Glaze Donut on Friday 5 June 2026 for Brooklyn Donuts loyalty app customers. Download the app and scan in-store at the participating Woden outlet.",
            "lat": -35.3454446,
            "lng": 149.0847034,
            "image": BROOKLYN_IMAGE_URL,
        },
    ],
    "Hobart": [
        {
            "brand": "Donut King",
            "name": "Donut King Cat & Fiddle Arcade",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -42.882998,
            "lng": 147.32674,
            "image": DONUT_KING_IMAGE_URL,
        },
    ],
    "Gold Coast": [
        {
            "brand": "Donut King",
            "name": "Donut King Robina Town Centre",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -28.077678,
            "lng": 153.386666,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Brooklyn Donuts",
            "name": "Brooklyn Donuts Coomera",
            "description": "Free Original Glaze Donut on Friday 5 June 2026 for Brooklyn Donuts loyalty app customers. Download the app and scan in-store at the participating Coomera outlet.",
            "lat": -27.8523828,
            "lng": 153.3152591,
            "image": BROOKLYN_IMAGE_URL,
        },
        {
            "brand": "Krispy Kreme",
            "name": "Krispy Kreme Surfers Paradise",
            "description": "Free Original Glazed Doughnut on Friday 5 June 2026 at Krispy Kreme stores. Excludes partner locations such as 7-Eleven, BP and Woolworths.",
            "lat": -28.00218,
            "lng": 153.42928,
            "image": KRISPY_KREME_IMAGE_URL,
        },
        {
            "brand": "CoastRs",
            "name": "CoastRs Donut Day at SCU Gold Coast",
            "description": "Free donuts from the CoastRs Snack Cart on Friday 5 June 2026, 9am-11am, at Southern Cross University Gold Coast Campus. Source: SCU CoastRs Donut Day event.",
            "lat": -28.16452,
            "lng": 153.50729,
            "image": SCU_DONUT_IMAGE_URL,
            "source": SCU_COASTRS_DONUT_DAY_URL,
        },
    ],
    "Newcastle": [
        {
            "brand": "Donut King",
            "name": "Donut King Kotara Westfield",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -32.942283,
            "lng": 151.711094,
            "image": DONUT_KING_IMAGE_URL,
        },
        {
            "brand": "Brooklyn Donuts",
            "name": "Brooklyn Donuts Kotara",
            "description": "Free Original Glaze Donut on Friday 5 June 2026 for Brooklyn Donuts loyalty app customers. Download the app and scan in-store at the participating Kotara outlet.",
            "lat": -32.9422827,
            "lng": 151.7110937,
            "image": BROOKLYN_IMAGE_URL,
        },
        {
            "brand": "Krispy Kreme",
            "name": "Krispy Kreme Charlestown",
            "description": "Free Original Glazed Doughnut on Friday 5 June 2026 at Krispy Kreme stores. Excludes partner locations such as 7-Eleven, BP and Woolworths.",
            "lat": -32.964081,
            "lng": 151.693872,
            "image": KRISPY_KREME_IMAGE_URL,
        },
    ],
    "Wollongong": [
        {
            "brand": "Donut King",
            "name": "Donut King Campbelltown Mall",
            "description": "Nearest verified Donut King outlet for Wollongong users. Free Hot Cinnamon Donut on Friday 5 June 2026 at participating stores, while stocks last.",
            "lat": -34.068871,
            "lng": 150.810881,
            "image": DONUT_KING_IMAGE_URL,
        },
    ],
    "Geelong": [
        {
            "brand": "Donut King",
            "name": "Donut King Waurn Ponds",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -38.198779,
            "lng": 144.315907,
            "image": DONUT_KING_IMAGE_URL,
        },
    ],
    "Armidale": [
        {
            "brand": "Donut King",
            "name": "Donut King Armidale Central",
            "description": "Free Hot Cinnamon Donut on Friday 5 June 2026 at participating Donut King stores, while stocks last. Source: Donut King National Donut Day terms.",
            "lat": -30.512009,
            "lng": 151.662554,
            "image": DONUT_KING_IMAGE_URL,
        },
    ],
}


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
    return f"national-donut-day-free-donut-stops-{city_slug}"


def format_coord(value: float) -> str:
    return f"{value:.7f}".rstrip("0").rstrip(".")


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
    places = CITY_PLACES[city]
    rows: list[dict[str, str]] = []
    for index, place in enumerate(places):
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
                "place_image_url": str(place["image"]),
                "navigation_link": maps_link(lat, lng),
                "lat": format_coord(lat),
                "lng": format_coord(lng),
            }
        )
    return rows


def host_row_images(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    rows: list[dict[str, str]],
) -> list[dict[str, str]]:
    if not rows:
        return rows
    guide_slug_value = rows[0]["guide_slug"]
    hosted_rows = [dict(row) for row in rows]
    hosted_rows[0]["cover_image_url"] = image_tools.upload_remote_image(
        base_url,
        public_anon_key,
        admin_email,
        guide_slug_value,
        "cover",
        None,
        "",
        hosted_rows[0]["cover_image_url"],
    )
    for row in hosted_rows:
        row["cover_image_url"] = hosted_rows[0]["cover_image_url"]
        row["place_image_url"] = image_tools.upload_remote_image(
            base_url,
            public_anon_key,
            admin_email,
            guide_slug_value,
            "place",
            int(row["place_position"]),
            row["place_name"],
            row["place_image_url"],
        )
    return hosted_rows


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
    if int(data.get("row_count") or 0) != len(rows):
        raise RuntimeError(f"{rows[0]['guide_slug']} preview expected {len(rows)} rows, got {data.get('row_count')}.")
    warnings = data.get("warnings") or []
    if warnings:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview returned warnings: {warnings}")
    guide = data.get("guide") if isinstance(data.get("guide"), dict) else {}
    if guide.get("app_variant") != APP_VARIANT:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview app_variant mismatch: {guide.get('app_variant')!r}")
    if guide.get("city") != rows[0]["city"] or guide.get("state") != rows[0]["state"]:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview city/state mismatch.")
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

            expected_places = CITY_PLACES[city]
            places = sorted(guide.get("places") or [], key=lambda item: int(item.get("position") or 0))
            if len(places) != len(expected_places):
                raise RuntimeError(f"{expected_slug} should have {len(expected_places)} places, found {len(places)}.")
            for index, place in enumerate(places):
                expected = expected_places[index]
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
        print(f"VERIFY OK  National Donut Day guides live for {app_variant}.")

        for city in EXCLUDED_CITIES:
            live_guides = fetch_city_guides(base_url, public_anon_key, city, app_variant)
            stray = [
                item.get("slug")
                for item in live_guides
                if str(item.get("slug") or "").startswith("national-donut-day-free-donut-stops")
            ]
            if stray:
                raise RuntimeError(f"Unexpected National Donut Day guide in excluded city {city} [{app_variant}]: {stray}")
        print(f"VERIFY OK  National Donut Day guide absent from excluded cities for {app_variant}.")

    print(f"VERIFY OK  {verified_images} hosted image responses checked.")


def run_smoke_check(app_variant: str, city: str) -> None:
    env = os.environ.copy()
    env["APP_VARIANT"] = app_variant
    env["SMOKE_CITY"] = city
    env["SMOKE_EMAIL"] = SMOKE_EMAIL
    subprocess_args = ["node", "scripts/hoodie-endpoint-smoke.mjs"]
    import subprocess

    subprocess.run(
        subprocess_args,
        cwd=REPO_ROOT,
        env=env,
        check=True,
    )
    print(f"SMOKE OK   hoodie endpoint smoke [{app_variant}] for {city}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import National Donut Day guides into live city guides.")
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

    for url in {
        COVER_IMAGE_SOURCE_URL,
        DONUT_KING_IMAGE_URL,
        BROOKLYN_IMAGE_URL,
        KRISPY_KREME_IMAGE_URL,
        WALKERS_IMAGE_URL,
        SCU_DONUT_IMAGE_URL,
    }:
        image_tools.verify_image_url(url)

    previews: list[tuple[list[dict[str, str]], dict[str, Any]]] = []
    for target in TARGET_CITIES:
        city = target["city"]
        rows = host_row_images(
            base_url,
            public_anon_key,
            args.admin_email,
            rows_for_city(city, target["state"]),
        )
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

    print("\nDONE       National Donut Day guides imported and verified for both apps.")


if __name__ == "__main__":
    main()

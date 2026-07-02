#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import urllib.parse
from io import StringIO
from pathlib import Path
from typing import Any

import repair_city_guide_images as image_tools


REPO_ROOT = Path(__file__).resolve().parents[1]
APP_VARIANT = "all"
POSITION = "-2000"
PIZZA_HUT_POSITION = 900000
PIZZA_HUT_SLUG_PREFIX = "only-all-you-can-eat-pizza-huts-in-australia-"
TARGET_SLUGS = [
    "kings-birthday-sydney-2026",
    "kings-birthday-melbourne-2026",
    "kings-birthday-adelaide-2026",
    "kings-birthday-canberra-2026",
    "kings-birthday-hobart-2026",
    "kings-birthday-darwin-2026",
    "kings-birthday-newcastle-2026",
    "kings-birthday-wollongong-2026",
    "national-celtic-folk-festival-geelong-2026",
    "kings-birthday-armidale-2026",
]

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


def build_csv_text(rows: list[dict[str, Any]]) -> str:
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})
    return output.getvalue()


def load_static_guides() -> list[dict[str, Any]]:
    node_source = f"""
import * as esbuild from 'esbuild';

const targetSlugs = new Set({json.dumps(TARGET_SLUGS)});
const result = await esbuild.build({{
  entryPoints: ['src/app/lib/flagship-event-guides.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
}});
const source = result.outputFiles[0].text;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const mod = await import(moduleUrl);
const liveGuideTime = new Date('2026-06-07T02:00:00.000Z');
const guides = mod.FLAGSHIP_EVENT_GUIDES
  .filter((entry) => targetSlugs.has(entry.slug))
  .map((entry) => mod.toFlagshipCityGuide({{ ...entry, app_variant: 'all', position: -2000 }}, liveGuideTime));
if (guides.length !== targetSlugs.size) {{
  const found = new Set(guides.map((guide) => guide.slug));
  const missing = [...targetSlugs].filter((slug) => !found.has(slug));
  throw new Error(`Missing static King Birthday guides: ${{missing.join(', ')}}`);
}}
console.log(JSON.stringify(guides));
"""
    result = subprocess.run(
        ["node", "--input-type=module"],
        input=node_source,
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=True,
    )
    guides = json.loads(result.stdout)
    order = {slug: index for index, slug in enumerate(TARGET_SLUGS)}
    return sorted([guide for guide in guides if isinstance(guide, dict)], key=lambda guide: order[str(guide["slug"])])


def rows_for_guide(guide: dict[str, Any]) -> list[dict[str, Any]]:
    places = guide.get("places")
    if not isinstance(places, list) or not places:
        raise RuntimeError(f"{guide.get('slug')} has no places to import.")

    rows: list[dict[str, Any]] = []
    for index, place in enumerate(places):
        if not isinstance(place, dict):
            raise RuntimeError(f"{guide.get('slug')} place {index + 1} is not an object.")
        rows.append(
            {
                "city": guide["city"],
                "state": guide["state"],
                "guide_title": guide["title"],
                "guide_slug": guide["slug"],
                "cover_image_url": guide["cover_image_url"],
                "manual_intro": guide["intro"],
                "position": POSITION,
                "app_variant": APP_VARIANT,
                "place_position": index,
                "place_name": place.get("name", ""),
                "place_description": place.get("description", ""),
                "place_image_url": place.get("image_url", guide["cover_image_url"]),
                "navigation_link": place.get("navigation_link", ""),
                "lat": place.get("lat", ""),
                "lng": place.get("lng", ""),
            }
        )
    return rows


def preview_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    rows: list[dict[str, Any]],
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
        raise RuntimeError(f"{rows[0]['guide_slug']} preview response was missing data.")
    if int(data.get("row_count") or 0) != len(rows):
        raise RuntimeError(f"{rows[0]['guide_slug']} preview row count mismatch.")
    warnings = data.get("warnings") or []
    if warnings:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview warnings: {warnings}")
    guide = data.get("guide") if isinstance(data.get("guide"), dict) else {}
    if guide.get("app_variant") != APP_VARIANT:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview app_variant mismatch: {guide.get('app_variant')!r}")
    if int(guide.get("position") or 0) != int(POSITION):
        raise RuntimeError(f"{rows[0]['guide_slug']} preview position mismatch: {guide.get('position')!r}")
    return data


def commit_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    rows: list[dict[str, Any]],
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
        raise RuntimeError(f"{rows[0]['guide_slug']} commit response was missing guide data.")
    return guide


def fetch_city_guides(base_url: str, public_anon_key: str, city: str = "", app_variant: str = "") -> list[dict[str, Any]]:
    query = []
    if city:
        query.append(f"city={urllib.parse.quote(city)}")
    if app_variant:
        query.append(f"app_variant={urllib.parse.quote(app_variant)}")
    suffix = f"?{'&'.join(query)}" if query else ""
    response = image_tools.api_request(base_url, public_anon_key, "GET", f"/city-guides{suffix}")
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError("Could not fetch city guides.")
    return [guide for guide in guides if isinstance(guide, dict)]


def update_pizza_hut_positions(base_url: str, public_anon_key: str, admin_email: str) -> list[dict[str, Any]]:
    guides = fetch_city_guides(base_url, public_anon_key)
    pizza_guides = [
        guide
        for guide in guides
        if str(guide.get("slug") or "").strip().lower().startswith(PIZZA_HUT_SLUG_PREFIX)
    ]
    updated: list[dict[str, Any]] = []
    for guide in pizza_guides:
        if int(float(guide.get("position") or 0)) == PIZZA_HUT_POSITION:
            updated.append(guide)
            continue
        response = image_tools.api_request(
            base_url,
            public_anon_key,
            "PUT",
            f"/admin/city-guides/{urllib.parse.quote(str(guide['id']))}",
            body={
                "admin_email": admin_email,
                "position": PIZZA_HUT_POSITION,
            },
        )
        data = response.get("data") if isinstance(response, dict) else None
        if not isinstance(data, dict):
            raise RuntimeError(f"Pizza Hut update for {guide.get('slug')} was missing data.")
        updated.append(data)
    return updated


def ensure_admin_email_is_valid(base_url: str, public_anon_key: str, admin_email: str) -> None:
    response = image_tools.api_request(base_url, public_anon_key, "GET", "/admin/admins")
    admins = response.get("data") if isinstance(response, dict) else None
    if not isinstance(admins, list):
        raise RuntimeError("Could not load admin list.")
    allowed = {str(admin.get("email") or "").strip().lower() for admin in admins if isinstance(admin, dict)}
    if admin_email.lower() not in allowed:
        raise RuntimeError(f"{admin_email} is not an admin in the live project.")


def verify_live_order(base_url: str, public_anon_key: str) -> None:
    checks = [
        ("Sydney", "burb_mate", "kings-birthday-sydney-2026"),
        ("Sydney", "ghar", "kings-birthday-sydney-2026"),
        ("Geelong", "burb_mate", "national-celtic-folk-festival-geelong-2026"),
    ]
    for city, variant, expected_first_slug in checks:
        guides = fetch_city_guides(base_url, public_anon_key, city, variant)
        slugs = [str(guide.get("slug") or "") for guide in guides]
        if not slugs or slugs[0] != expected_first_slug:
            raise RuntimeError(f"{city} [{variant}] first guide mismatch: {slugs[:5]}")
        pizza_indexes = [
            index
            for index, slug in enumerate(slugs)
            if slug.startswith(PIZZA_HUT_SLUG_PREFIX)
        ]
        if pizza_indexes and pizza_indexes[-1] != len(slugs) - 1:
            raise RuntimeError(f"{city} [{variant}] Pizza Hut is not last: index {pizza_indexes[-1]} of {len(slugs)}")
        print(f"VERIFY OK {city} [{variant}] first={slugs[0]} count={len(slugs)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import King's Birthday weekend guides into live Supabase city guides.")
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email authorized in the live project.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview imports without committing.")
    parser.add_argument("--skip-pizza-update", action="store_true", help="Do not update Pizza Hut guide positions.")
    parser.add_argument("--skip-verify", action="store_true", help="Skip live order verification.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    ensure_admin_email_is_valid(base_url, public_anon_key, args.admin_email)

    guides = load_static_guides()
    print(f"Loaded {len(guides)} static King's Birthday guides.")

    for guide in guides:
        rows = rows_for_guide(guide)
        preview = preview_import(base_url, public_anon_key, args.admin_email, rows)
        matched = preview.get("matched_guide") if isinstance(preview.get("matched_guide"), dict) else None
        action = "update" if matched else "create"
        print(f"PREVIEW OK {action:6} {guide['slug']} rows={len(rows)}")
        if not args.dry_run:
            committed = commit_import(base_url, public_anon_key, args.admin_email, rows, preview)
            print(f"COMMIT OK  {committed.get('slug')} position={committed.get('position')} places={len(committed.get('places') or [])}")

    if not args.skip_pizza_update and not args.dry_run:
        updated = update_pizza_hut_positions(base_url, public_anon_key, args.admin_email)
        print(f"PIZZA OK   {len(updated)} Pizza Hut guide records at position {PIZZA_HUT_POSITION}.")

    if not args.skip_verify and not args.dry_run:
        verify_live_order(base_url, public_anon_key)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3

from __future__ import annotations

import argparse
import urllib.parse
from typing import Any

import repair_city_guide_images as image_tools


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
DEFAULT_EXPIRES_AT = "2026-06-08T14:00:00.000Z"
PUBLIC_VARIANTS = ["ghar", "burb_mate"]


def quote(value: str) -> str:
    return urllib.parse.quote(value, safe="")


def fetch_admin_guides(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    slug: str,
) -> list[dict[str, Any]]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "GET",
        f"/admin/city-guides?admin_email={quote(admin_email)}&slug={quote(slug)}&include_expired=1",
    )
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError(f"Admin city-guide lookup for {slug} did not return a guide list.")
    return [
        guide
        for guide in guides
        if isinstance(guide, dict)
        and str(guide.get("slug") or "").strip().lower() == slug.lower()
    ]


def load_target_guides(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
) -> list[dict[str, Any]]:
    guides: list[dict[str, Any]] = []
    missing: list[str] = []
    duplicates: list[str] = []

    for slug in TARGET_SLUGS:
        matches = fetch_admin_guides(base_url, public_anon_key, admin_email, slug)
        if not matches:
            missing.append(slug)
            continue
        if len(matches) > 1:
            duplicates.append(slug)
            continue
        guides.append(matches[0])

    if missing or duplicates:
        details = []
        if missing:
            details.append(f"missing={', '.join(missing)}")
        if duplicates:
            details.append(f"duplicates={', '.join(duplicates)}")
        raise RuntimeError(f"Could not load exactly one record for every target: {'; '.join(details)}")

    return guides


def update_expires_at(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    guide: dict[str, Any],
    expires_at: str,
) -> dict[str, Any]:
    guide_id = str(guide.get("id") or "").strip()
    if not guide_id:
        raise RuntimeError(f"{guide.get('slug')} is missing an id.")

    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "PUT",
        f"/admin/city-guides/{quote(guide_id)}",
        body={
            "admin_email": admin_email,
            "expires_at": expires_at,
        },
    )
    data = response.get("data") if isinstance(response, dict) else None
    if not isinstance(data, dict):
        raise RuntimeError(f"Update for {guide.get('slug')} did not return guide data.")
    return data


def verify_public_feeds_hidden(
    base_url: str,
    public_anon_key: str,
) -> None:
    target_slugs = {slug.lower() for slug in TARGET_SLUGS}
    for variant in PUBLIC_VARIANTS:
        response = image_tools.api_request(
            base_url,
            public_anon_key,
            "GET",
            f"/city-guides?app_variant={quote(variant)}",
        )
        guides = response.get("data") if isinstance(response, dict) else None
        if not isinstance(guides, list):
            raise RuntimeError(f"Public city-guide verification for {variant} did not return a guide list.")
        live_targets = sorted(
            str(guide.get("slug") or "").strip()
            for guide in guides
            if isinstance(guide, dict)
            and str(guide.get("slug") or "").strip().lower() in target_slugs
        )
        if live_targets:
            raise RuntimeError(f"{variant} still exposes expired target guides: {', '.join(live_targets)}")
        print(f"VERIFY OK  {variant} public feed hides all King Birthday target guides.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Expire or reactivate the live King's Birthday city-guide records without deleting them."
    )
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email authorized in the live project.",
    )
    parser.add_argument(
        "--expires-at",
        default=DEFAULT_EXPIRES_AT,
        help="ISO timestamp to set when expiring guides.",
    )
    parser.add_argument("--commit", action="store_true", help="Apply updates. Without this, only print a dry-run.")
    parser.add_argument("--reactivate", action="store_true", help="Clear expires_at instead of setting it.")
    parser.add_argument("--skip-verify", action="store_true", help="Skip public feed verification after commit.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    next_expires_at = "" if args.reactivate else str(args.expires_at or "").strip()
    action = "reactivate" if args.reactivate else "expire"

    if not args.reactivate and not next_expires_at:
        raise RuntimeError("--expires-at is required when expiring guides.")

    guides = load_target_guides(base_url, public_anon_key, args.admin_email)
    print(f"Loaded {len(guides)} King Birthday target guides for {action}.")

    for guide in guides:
        current_expires_at = str(guide.get("expires_at") or "").strip() or "none"
        slug = str(guide.get("slug") or "").strip()
        city = str(guide.get("city") or "").strip()
        if args.commit:
            updated = update_expires_at(base_url, public_anon_key, args.admin_email, guide, next_expires_at)
            updated_expires_at = str(updated.get("expires_at") or "").strip() or "none"
            print(f"COMMIT OK  {city:10} {slug} expires_at={updated_expires_at}")
        else:
            planned_expires_at = next_expires_at or "none"
            print(f"DRY-RUN    {city:10} {slug} expires_at {current_expires_at} -> {planned_expires_at}")

    if args.commit and not args.reactivate and not args.skip_verify:
        verify_public_feeds_hidden(base_url, public_anon_key)


if __name__ == "__main__":
    main()

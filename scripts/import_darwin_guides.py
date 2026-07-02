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
MANIFEST_PATH = DATA_DIR / "hoodie-darwin-guide-image-manifest.json"
APP_VARIANT = "all"
SOURCE_APP_VARIANTS = {"burb_mate", "all"}
CITY = "Darwin"
STATE = "NT"
SMOKE_EMAIL = "talkwithrushi@gmail.com"

DARWIN_CSV_PATHS = [
    Path("/Users/rushi/Downloads/darwin-10-best-hidden-bars-in-darwin.csv"),
    Path("/Users/rushi/Downloads/darwin-10-best-cafes-to-work-from-in-darwin.csv"),
    Path("/Users/rushi/Downloads/darwin-10-best-historical-places-in-darwin.csv"),
    Path("/Users/rushi/Downloads/darwin-10-best-sunset-spots-in-darwin.csv"),
    Path("/Users/rushi/Downloads/darwin-10-best-weekend-getaways-from-darwin.csv"),
    Path("/Users/rushi/Downloads/darwin-10-best-sunrise-spots-in-darwin.csv"),
]

STOPWORDS = {
    "and",
    "area",
    "bar",
    "bars",
    "beach",
    "best",
    "cafes",
    "cafe",
    "city",
    "from",
    "getaways",
    "hidden",
    "historical",
    "in",
    "jetty",
    "kitchen",
    "lounge",
    "park",
    "places",
    "precinct",
    "rooftop",
    "spots",
    "sunrise",
    "sunset",
    "the",
    "to",
    "upper",
    "weekend",
}

PLACE_SOURCE_OVERRIDES: dict[str, dict[str, str]] = {
    "Laneway Specialty Coffee": {
        "source_page_url": "https://www.lanewaycoffee.com.au/",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/58c67465db29d6bfd8ea38a7/c3a1c09d-bc10-4e83-9738-1d4fdc642a38/Laneway+Cafe-34.JPG",
        "match_type": "exact",
    },
    "Charlie's of Darwin": {
        "source_page_url": "https://www.charliesofdarwin.com.au/",
        "source_image_url": "https://lirp.cdn-website.com/bd23723f/dms3rep/multi/opt/AtoZ-Media---Charlie-s-of-Darwin-April-2025-56-1920w.jpg",
        "match_type": "exact",
    },
    "Bar Kokomo rooftop / upper-level bar": {
        "source_page_url": "https://bar-kokomo.com/",
        "source_image_url": "https://www.bar-kokomo.com/uploads/b/97970d90-846f-11ee-b408-03d544c057b0/splash_2048x4435_NjczNz.jpg?width=1536&height=2048&fit=crop",
        "match_type": "exact",
    },
    "Darwin Military Museum": {
        "source_page_url": "https://www.darwinmilitarymuseum.au/",
        "source_image_url": "https://www.darwinmilitarymuseum.au/wp-content/uploads/2024/09/DHMEC-8.jpg",
        "match_type": "exact",
    },
    "Museum and Art Gallery of the Northern Territory": {
        "source_page_url": "https://en.wikipedia.org/wiki/Museum_and_Art_Gallery_of_the_Northern_Territory",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/d/d0/MAGNT_Darwin%2C_2023_%2801%29.jpg",
        "match_type": "exact",
    },
    "Old Darwin Hospital ruins": {
        "source_page_url": "https://en.wikipedia.org/wiki/Darwin_Hospital",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Old_Darwin_Hospital_1960s.jpg",
        "match_type": "exact",
    },
    "Christ Church Cathedral": {
        "source_page_url": "https://commons.wikimedia.org/wiki/File:Christ_Church_Cathedral,_Darwin,_2023_(01).jpg",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Christ_Church_Cathedral%2C_Darwin%2C_2023_%2801%29.jpg",
        "match_type": "exact",
    },
    "Brown's Mart": {
        "source_page_url": "https://en.wikipedia.org/wiki/Brown%27s_Mart",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/f/fe/Darwin_%28AU%29%2C_Browns_Mart_Theatre_--_2019_--_4401-3.jpg",
        "match_type": "exact",
    },
    "Chinese Temple": {
        "source_page_url": "https://territorystories.nt.gov.au/10070/722088",
        "source_image_url": "https://ntdl-territorystories.s3.amazonaws.com/ts/4d3/6991436c-5fd1-4531-a563-b91690f294d3/05927_media.jpg",
        "match_type": "exact",
    },
    "RFDS Darwin Tourist Facility": {
        "source_page_url": "https://www.rfdsdarwin.com.au/home",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/659b76daa6b9d854dcdb53fc/151b393c-5b0a-4c69-bdf8-f6a4e1972010/0623_Darwin+content+trip_high+res-011.jpg",
        "match_type": "exact",
    },
    "Lyons Cottage": {
        "source_page_url": "https://en.wikipedia.org/wiki/Lyons_Cottage",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e1/LYONS_COTTAGE_-_DARWIN_-_NORTHERN_TERRITORY.jpg",
        "match_type": "exact",
    },
    "Darwin Cenotaph": {
        "source_page_url": "https://www.darwin.nt.gov.au/community/about-darwin/darwin-city-centre/darwin-cenotaph",
        "source_image_url": "https://www.darwin.nt.gov.au/sites/default/files/styles/internal_full_banner/public/pages/max-resized/max_2000_Crop%20_DSC7458.jpg?h=7f73a785&itok=rB0IUjSL",
        "match_type": "exact",
    },
    "Nightcliff Foreshore": {
        "source_page_url": "https://www.darwin.nt.gov.au/community/community-facilities/nightcliff-foreshore-0",
        "source_image_url": "https://www.darwin.nt.gov.au/sites/default/files/styles/internal_full_banner/public/2024-12/Nightcliff%20Foreshore%20Web%20header.jpg?h=973a668f&itok=DKClxjjA",
        "match_type": "exact",
    },
    "Stokes Hill Wharf": {
        "source_page_url": "https://en.wikipedia.org/wiki/Stokes_Hill_Wharf",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/f/fc/Darwin%27s_Stokes_Hill_Wharf_February_2010.jpg",
        "match_type": "exact",
    },
    "The Esplanade Bicentennial Park": {
        "source_page_url": "https://www.darwin.nt.gov.au/community/community-facilities/bicentennial-park",
        "source_image_url": "https://www.darwin.nt.gov.au/sites/default/files/styles/internal_full_banner/public/2024-12/IMG_3480.JPG?h=6ba0fb37&itok=86aQqNlT",
        "match_type": "exact",
    },
    "The Esplanade": {
        "source_page_url": "https://www.darwin.nt.gov.au/community/community-facilities/bicentennial-park",
        "source_image_url": "https://www.darwin.nt.gov.au/sites/default/files/styles/gallery_/public/marker/image-gallery/Bi%20Park%20Web3.JPG?itok=M105YeBV",
        "match_type": "exact",
    },
    "Fannie Bay foreshore": {
        "source_page_url": "https://www.darwin.nt.gov.au/community/community-facilities/fannie-bay-foreshore",
        "source_image_url": "https://www.darwin.nt.gov.au/sites/default/files/styles/gallery_/public/marker/image-gallery/Fannie%20Bay%20foreshore%20playground%20Web%201.JPG?itok=__ytteEL",
        "match_type": "exact",
    },
    "Lake Alexander precinct": {
        "source_page_url": "https://www.darwin.nt.gov.au/community/community-facilities/lake-alexander",
        "source_image_url": "https://www.darwin.nt.gov.au/sites/default/files/styles/gallery_/public/marker/image-gallery/Lake%20Alexander%202%20resized.jpg?itok=ggxoIs_a",
        "match_type": "exact",
    },
    "Mindil Beach": {
        "source_page_url": "https://en.wikipedia.org/wiki/Mindil_Beach",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/0/04/Mindil_markets_230616_gnangarra-107.JPG",
        "match_type": "exact",
    },
    "Bundilla Beach / MAGNT foreshore": {
        "source_page_url": "https://en.wikipedia.org/wiki/Museum_and_Art_Gallery_of_the_Northern_Territory",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/d/d0/MAGNT_Darwin%2C_2023_%2801%29.jpg",
        "match_type": "representative",
    },
    "Mindil Beach Sunset Markets": {
        "source_page_url": "https://northernterritory.com/en/darwin-and-surrounds/see-and-do/mindil-beach-sunset-market",
        "source_image_url": "https://images.northernterritory.com/atdw-cache/images/7adc30c133c3303256fe261fc2465bca.jpeg?rect=0%2C285%2C5472%2C3078&w=1200&h=630&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjU2YjI3MzVmYWVlZWFhZjc3M2QwNTUyNCIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZWI5MzQ0ZmVjYTNkZjJlMzIwY2EiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGY2NSJ9&fit=crop&auto=enhance%2Ccompress",
        "match_type": "exact",
    },
    "Litchfield National Park": {
        "source_page_url": "https://nt.gov.au/leisure/parks-reserves/find-a-park-to-visit/litchfield-national-park",
        "source_image_url": "https://nt.gov.au/_media/images/parks-and-reserves/litchfield-national-park/wangi-falls/litchfield-national-park-wangi-falls.webp",
        "match_type": "exact",
    },
    "Kakadu National Park": {
        "source_page_url": "https://en.wikipedia.org/wiki/Kakadu_National_Park",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/9/93/Kakadu_2431.jpg",
        "match_type": "exact",
    },
    "Berry Springs Nature Park": {
        "source_page_url": "https://nt.gov.au/parks/find-a-park/berry-springs-nature-park",
        "source_image_url": "https://nt.gov.au/_media/images/parks-and-reserves/berry-springs/berry-springs-nature-park1.webp",
        "match_type": "exact",
    },
    "Batchelor": {
        "source_page_url": "https://en.wikipedia.org/wiki/Batchelor,_Northern_Territory",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/f/f7/BatchelorOct192024.jpg",
        "match_type": "exact",
    },
    "Tiwi Islands": {
        "source_page_url": "https://en.wikipedia.org/wiki/Tiwi_Islands",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/3/3f/Folklore_and_Science_Meet_at_Tiwi.jpeg",
        "match_type": "exact",
    },
    "Nitmiluk / Katherine Gorge": {
        "source_page_url": "https://commons.wikimedia.org/wiki/File:Katherine_Gorge1.jpg",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/6/65/Katherine_Gorge1.jpg",
        "match_type": "exact",
    },
    "Douglas Hot Springs": {
        "source_page_url": "https://aboutnorthnt.com/explore/100tjuwaliyn-douglas-hot-springs",
        "source_image_url": "https://images.squarespace-cdn.com/content/v1/5fa76fe6f59e260b96ba1103/1614665589362-TJL5P002HJOQ727GBESZ/_5183018.jpg",
        "match_type": "exact",
    },
    "Wangi Falls": {
        "source_page_url": "https://en.wikipedia.org/wiki/Wangi_Falls",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/c/c0/Wangi_Falls_Litchfield_National_Park.jpg",
        "match_type": "exact",
    },
    "Mataranka Thermal Pools": {
        "source_page_url": "https://en.wikipedia.org/wiki/Mataranka_Thermal_Pools",
        "source_image_url": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Mataranka_Thermal_Springs.jpg",
        "match_type": "exact",
    },
}

WIKIPEDIA_TITLE_OVERRIDES = {
    "Old Darwin Hospital ruins": ["Darwin Hospital"],
    "The Esplanade Bicentennial Park": ["Bicentennial Park (Darwin)"],
    "The Esplanade": ["Bicentennial Park (Darwin)"],
    "Fannie Bay foreshore": ["Fannie Bay"],
}

WIKIPEDIA_SEARCH_OVERRIDES = {
    "Old Darwin Hospital ruins": ["Old Darwin Hospital ruins", "Darwin Hospital ruins", "Darwin Hospital"],
    "The Esplanade": ["Darwin Esplanade", "Bicentennial Park Darwin"],
    "The Esplanade Bicentennial Park": ["Bicentennial Park Darwin", "Darwin Esplanade"],
    "Fannie Bay foreshore": ["Fannie Bay Darwin", "Fannie Bay foreshore Darwin"],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload Darwin city guides, host their images, and verify the live feed for both apps."
    )
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email to use for guide uploads/imports.",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip the post-import endpoint smoke test.",
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


def extract_commons_file_name(url: str) -> str:
    if not url:
        return ""
    parsed = urllib.parse.urlparse(url)

    if parsed.netloc == "commons.wikimedia.org" and parsed.path.startswith("/wiki/Special:FilePath/"):
        return urllib.parse.unquote(parsed.path.rsplit("/", 1)[-1])

    if parsed.netloc == "upload.wikimedia.org" and parsed.path.startswith("/wikipedia/commons/"):
        path_segments = [segment for segment in parsed.path.split("/") if segment]
        if len(path_segments) < 4:
            return ""
        file_name = urllib.parse.unquote(path_segments[-1])
        if "/thumb/" in parsed.path and "-" in file_name and file_name.split("-", 1)[0].endswith("px"):
            file_name = file_name.split("-", 1)[1]
        return file_name

    return ""


def derive_source_page_url(raw_url: str, resolved_url: str) -> str:
    file_name = extract_commons_file_name(raw_url) or extract_commons_file_name(resolved_url)
    if file_name:
        return derive_commons_file_page(file_name)
    return raw_url or resolved_url


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": "CodexDarwinGuideImporter/1.0"})
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


def resolve_source_override(place_name: str) -> tuple[str, str, str] | None:
    override = PLACE_SOURCE_OVERRIDES.get(place_name)
    if not override:
        return None
    source_page_url = override["source_page_url"]
    source_image_url = override["source_image_url"]
    match_type = override["match_type"]
    resolved_source_url, content_type = image_tools.verify_image_url(source_image_url)
    if content_type == "image/svg+xml":
        raise RuntimeError(f"{place_name} override resolved to SVG which is not allowed.")
    return source_page_url, resolved_source_url, match_type


def resolve_commons_image_url(current_url: str, desired_width: int) -> tuple[str, str] | None:
    file_name = extract_commons_file_name(current_url)
    if not file_name:
        return None

    api_url = (
        "https://commons.wikimedia.org/w/api.php?action=query"
        f"&titles={urllib.parse.quote('File:' + file_name)}"
        f"&prop=imageinfo&iiprop=url&iiurlwidth={int(desired_width)}&format=json"
    )
    payload = fetch_json(api_url)
    pages = payload.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    if "missing" in page:
        return None

    image_info = (page.get("imageinfo") or [{}])[0]
    resolved = str(image_info.get("thumburl") or image_info.get("url") or "").strip()
    if not resolved:
        return None

    resolved_source_url, content_type = image_tools.verify_image_url(resolved)
    if content_type == "image/svg+xml":
        return None
    return derive_commons_file_page(file_name), resolved_source_url


def resolve_fallback_source(place_name: str) -> tuple[str, str, str] | None:
    override_source = resolve_source_override(place_name)
    if override_source:
        return override_source

    candidate_titles = list(WIKIPEDIA_TITLE_OVERRIDES.get(place_name, []))
    queries = WIKIPEDIA_SEARCH_OVERRIDES.get(place_name, [f"{place_name} Darwin", f"{place_name} Northern Territory", place_name])
    for query in queries:
        candidate_titles.extend(wikipedia_search_titles(query, place_name))

    seen_titles: set[str] = set()
    for title in candidate_titles:
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        candidate = wikipedia_page_image(title)
        if candidate:
            source_page_url, source_image_url = candidate
            return source_page_url, source_image_url, "exact"

    return None


def build_csv_text(rows: list[dict[str, str]]) -> str:
    if not rows:
        raise RuntimeError("Cannot build CSV text from an empty row list.")
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def require_rows_consistent(path: Path, rows: list[dict[str, str]]) -> tuple[str, str]:
    if not rows:
        raise RuntimeError(f"{path.name} is empty.")
    slug = str(rows[0].get("guide_slug") or "").strip()
    title = str(rows[0].get("guide_title") or "").strip()
    city = str(rows[0].get("city") or "").strip()
    state = str(rows[0].get("state") or "").strip()
    variant = str(rows[0].get("app_variant") or "").strip()
    if city != CITY or state != STATE:
        raise RuntimeError(f"{path.name} is not a Darwin guide CSV.")
    if variant not in SOURCE_APP_VARIANTS:
        raise RuntimeError(f"{path.name} has unexpected app_variant={variant!r}.")
    if not slug or not title:
        raise RuntimeError(f"{path.name} is missing guide metadata.")
    if len(rows) != 10:
        raise RuntimeError(f"{path.name} should contain 10 place rows, found {len(rows)}.")
    return slug, title


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
) -> tuple[str, str, str, str]:
    stripped_url = str(current_url or "").strip()
    if image_tools.is_hosted_guide_asset_url(stripped_url, project_id):
        return stripped_url, stripped_url, stripped_url, "hosted"

    override_source = resolve_source_override(place_name)
    if override_source:
        source_page_url, source_image_url, match_type = override_source
    else:
        commons_source = resolve_commons_image_url(stripped_url, desired_width) if stripped_url else None
        if commons_source:
            source_page_url, source_image_url = commons_source
            match_type = infer_match_type(place_name, stripped_url, source_image_url)
        else:
            fallback = resolve_fallback_source(place_name)
            if not fallback:
                raise RuntimeError(f"{guide_slug} {slot_type} {place_name or 'cover'} is missing a workable source image.")
            source_page_url, source_image_url, match_type = fallback

    hosted_url = image_tools.upload_remote_image(
        base_url,
        public_anon_key,
        admin_email,
        guide_slug,
        slot_type,
        place_position,
        place_name,
        source_image_url,
    )
    return source_page_url, source_image_url, hosted_url, match_type


def choose_cover_candidate(
    resolved_places: list[dict[str, Any]],
    used_cover_source_urls: set[str],
) -> dict[str, Any]:
    ordered_places = sorted(resolved_places, key=lambda item: item["place_position"])
    for place in ordered_places:
        if place["match_type"] == "exact" and place["source_image_url"] not in used_cover_source_urls:
            return place
    for place in ordered_places:
        if place["match_type"] == "exact":
            return place
    for place in ordered_places:
        if place["source_image_url"] not in used_cover_source_urls:
            return place
    return ordered_places[0]


def prepare_guide_assets(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    csv_path: Path,
    used_cover_source_urls: set[str],
) -> tuple[list[dict[str, str]], list[dict[str, Any]], str]:
    rows = read_csv_rows(csv_path)
    guide_slug, guide_title = require_rows_consistent(csv_path, rows)

    resolved_places: list[dict[str, Any]] = []
    for row in rows:
        position = int(str(row.get("place_position") or "0").strip() or 0)
        place_name = str(row.get("place_name") or "").strip()
        raw_place_url = str(row.get("place_image_url") or "").strip()

        source_page_url, source_image_url, place_hosted_url, match_type = resolve_or_keep_hosted(
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

        resolved_places.append(
            {
                "place_position": position,
                "place_name": place_name,
                "raw_place_url": raw_place_url,
                "source_page_url": source_page_url,
                "source_image_url": source_image_url,
                "hosted_url": place_hosted_url,
                "match_type": match_type,
            }
        )

    cover_candidate = choose_cover_candidate(resolved_places, used_cover_source_urls)
    cover_source_page_url, cover_source_url, cover_hosted_url, cover_match_type = resolve_or_keep_hosted(
        project_id=project_id,
        base_url=base_url,
        public_anon_key=public_anon_key,
        admin_email=admin_email,
        guide_slug=guide_slug,
        slot_type="cover",
        place_position=None,
        place_name=cover_candidate["place_name"],
        current_url=cover_candidate["source_image_url"],
        desired_width=1400,
    )
    used_cover_source_urls.add(cover_source_url)

    manifest_entries: list[dict[str, Any]] = [
        {
            "guide_slug": guide_slug,
            "slot_type": "cover",
            "place_position": None,
            "place_name": guide_title,
            "source_page_url": cover_source_page_url,
            "source_image_url": cover_source_url,
            "hosted_url": cover_hosted_url,
            "match_type": cover_match_type,
            "cover_from_place_position": cover_candidate["place_position"],
            "cover_from_place_name": cover_candidate["place_name"],
        }
    ]

    next_rows: list[dict[str, str]] = []
    by_position = {place["place_position"]: place for place in resolved_places}
    for row in rows:
        position = int(str(row.get("place_position") or "0").strip() or 0)
        resolved = by_position[position]
        manifest_entries.append(
            {
                "guide_slug": guide_slug,
                "slot_type": "place",
                "place_position": position,
                "place_name": resolved["place_name"],
                "source_page_url": resolved["source_page_url"],
                "source_image_url": resolved["source_image_url"],
                "hosted_url": resolved["hosted_url"],
                "match_type": resolved["match_type"],
            }
        )

        next_row = dict(row)
        next_row["app_variant"] = APP_VARIANT
        next_row["cover_image_url"] = cover_hosted_url
        next_row["place_image_url"] = resolved["hosted_url"]
        next_rows.append(next_row)

    return next_rows, manifest_entries, cover_source_url


def preview_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    csv_text: str,
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
            "app_variant": APP_VARIANT,
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

    title = str(guide.get("title") or "").strip()
    city = str(guide.get("city") or CITY).strip()
    state = str(guide.get("state") or STATE).strip()

    def fallback_intro() -> str:
        theme = title.removeprefix("10 Best ").removeprefix("10 best ").strip()
        theme = theme.replace(" in Darwin", "").replace(" from Darwin", "").strip()
        theme_phrase = theme.lower() if theme else "Darwin spots"
        return (
            f"This {city}, {state} guide rounds up 10 {theme_phrase} with quick context, "
            "hosted images, and map links so it is easy to plan your next stop."
        )

    try:
        response = image_tools.api_request(
            base_url,
            public_anon_key,
            "POST",
            "/admin/city-guides/generate-blog",
            body={
                "admin_email": admin_email,
                "city": city,
                "state": state,
                "title": title,
                "places": guide.get("places") or [],
            },
        )
        generated = response.get("data") if isinstance(response, dict) else None
        intro = str(generated.get("intro") or "").strip() if isinstance(generated, dict) else ""
        if intro:
            return intro
    except Exception as error:  # noqa: BLE001
        print(f"WARN       Falling back to manual intro for {title}: {error}")

    intro = fallback_intro()
    print(f"INTRO OK   using fallback intro for {title}")
    return intro


def commit_import(
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    csv_text: str,
    guide_id: str,
    intro_override: str,
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
            "app_variant": APP_VARIANT,
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
        raise RuntimeError(f"Could not load live Darwin guides for app_variant={app_variant}.")
    return [guide for guide in guides if isinstance(guide, dict)]


def verify_live_darwin_guides(project_id: str, base_url: str, public_anon_key: str) -> None:
    expected_slugs = {
        "10-best-hidden-bars-in-darwin",
        "10-best-cafes-to-work-from-in-darwin",
        "10-best-historical-places-in-darwin",
        "10-best-sunset-spots-in-darwin",
        "10-best-weekend-getaways-from-darwin",
        "10-best-sunrise-spots-in-darwin",
    }

    cover_urls: set[str] = set()
    verified_images = 0
    reference_slugs: set[str] | None = None

    for app_variant in ("all", "burb_mate", "ghar"):
        guides = fetch_live_guides(base_url, public_anon_key, app_variant)
        live_slugs = {str(guide.get("slug") or "").strip() for guide in guides}
        if live_slugs != expected_slugs:
            raise RuntimeError(
                f"Live Darwin guide slugs mismatch for {app_variant}. Expected {sorted(expected_slugs)}, found {sorted(live_slugs)}"
            )
        if reference_slugs is None:
            reference_slugs = live_slugs
        elif live_slugs != reference_slugs:
            raise RuntimeError(f"Darwin slugs differ between app feeds for app_variant={app_variant}.")

        for guide in guides:
            slug = str(guide.get("slug") or "").strip()
            intro = str(guide.get("intro") or "").strip()
            places = guide.get("places") or []
            cover_url = str(guide.get("cover_image_url") or "").strip()
            guide_variant = str(guide.get("app_variant") or "").strip().lower()

            if guide_variant != APP_VARIANT:
                raise RuntimeError(f"{slug} is stored with app_variant={guide_variant!r} instead of {APP_VARIANT!r}.")
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

    if len(cover_urls) != 6:
        raise RuntimeError("Darwin guide covers are not unique after import.")

    print(f"VERIFY OK  live Darwin guides -> 6 guides across all/burb_mate/ghar, {verified_images} hosted images verified")


def run_smoke_check() -> None:
    env = os.environ.copy()
    env["APP_VARIANT"] = APP_VARIANT
    env["SMOKE_CITY"] = CITY
    env["SMOKE_EMAIL"] = SMOKE_EMAIL
    subprocess.run(
        ["node", "scripts/hoodie-endpoint-smoke.mjs"],
        cwd=REPO_ROOT,
        env=env,
        check=True,
    )
    print("VERIFY OK  Darwin endpoint smoke test")


def ensure_admin_email_is_valid(base_url: str, public_anon_key: str, admin_email: str) -> None:
    response = image_tools.api_request(base_url, public_anon_key, "GET", "/admin/admins")
    admins = response.get("data") if isinstance(response, dict) else None
    if not isinstance(admins, list):
        raise RuntimeError("Could not load admin list before running Darwin guide import.")
    if admin_email.lower() not in {str(admin.get("email") or "").strip().lower() for admin in admins if isinstance(admin, dict)}:
        raise RuntimeError(f"{admin_email} is not an admin in the live project.")


def validate_local_rows(rows: list[dict[str, str]], csv_path: Path) -> None:
    variants = {str(row.get("app_variant") or "").strip() for row in rows}
    if variants != {APP_VARIANT}:
        raise RuntimeError(f"{csv_path.name} rows were not normalized to app_variant={APP_VARIANT!r}: {sorted(variants)}")

    for row in rows:
        cover_url = str(row.get("cover_image_url") or "").strip()
        place_url = str(row.get("place_image_url") or "").strip()
        for field_name, url in (("cover_image_url", cover_url), ("place_image_url", place_url)):
            if "wikimedia.org/wiki/Special:FilePath/" in url or "commons.wikimedia.org/wiki/File:" in url:
                raise RuntimeError(f"{csv_path.name} still has a non-direct wiki URL in {field_name}: {url}")
            parsed = urllib.parse.urlparse(url)
            if parsed.netloc.endswith(("wikimedia.org", "wikipedia.org")):
                raise RuntimeError(f"{csv_path.name} still points {field_name} at Wikimedia instead of hosted assets: {url}")


def main() -> None:
    args = parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    ensure_admin_email_is_valid(base_url, public_anon_key, args.admin_email)

    manifest_entries: list[dict[str, Any]] = []
    updated_csv_payloads: dict[Path, list[dict[str, str]]] = {}
    used_cover_source_urls: set[str] = set()

    for csv_path in DARWIN_CSV_PATHS:
        print(f"\nGUIDE      preparing assets for {csv_path.name}")
        next_rows, guide_manifest_entries, cover_source_url = prepare_guide_assets(
            project_id=project_id,
            base_url=base_url,
            public_anon_key=public_anon_key,
            admin_email=args.admin_email,
            csv_path=csv_path,
            used_cover_source_urls=used_cover_source_urls,
        )
        validate_local_rows(next_rows, csv_path)

        preview = preview_import(
            base_url=base_url,
            public_anon_key=public_anon_key,
            admin_email=args.admin_email,
            csv_text=build_csv_text(next_rows),
        )
        row_count = int(preview.get("row_count") or 0)
        warnings = preview.get("warnings") or []
        if row_count != 10:
            raise RuntimeError(f"{csv_path.name} preview expected 10 places, found {row_count}.")
        if warnings:
            raise RuntimeError(f"{csv_path.name} preview returned warnings: {warnings}")

        generated_intro = generate_intro(
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
        )
        print(f"COMMIT OK  {csv_path.name} cover-source={cover_source_url}")

        updated_csv_payloads[csv_path] = next_rows
        manifest_entries.extend(guide_manifest_entries)

    cover_sources = {
        str(entry.get("source_image_url") or "").strip()
        for entry in manifest_entries
        if entry.get("slot_type") == "cover"
    }
    if len(cover_sources) != 6:
        raise RuntimeError("Darwin cover source images are not unique before writing artifacts.")

    verify_live_darwin_guides(project_id, base_url, public_anon_key)

    for csv_path, rows in updated_csv_payloads.items():
        write_csv_rows(csv_path, rows)
        print(f"WRITE OK   {csv_path}")

    MANIFEST_PATH.write_text(json.dumps(manifest_entries, indent=2) + "\n", encoding="utf-8")
    print(f"WRITE OK   {MANIFEST_PATH}")

    if not args.skip_smoke:
        run_smoke_check()

    print("\nDONE       Darwin guides imported and verified for both apps.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(f"ERROR      {error}", file=sys.stderr)
        sys.exit(1)

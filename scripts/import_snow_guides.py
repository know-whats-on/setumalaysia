#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from io import StringIO
from pathlib import Path
from typing import Any

import repair_city_guide_images as image_tools


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "scripts" / "data" / "snow-guides"
MANIFEST_PATH = REPO_ROOT / "scripts" / "data" / "hoodie-snow-guide-image-manifest.json"
IMAGE_SOURCE_CACHE_PATH = REPO_ROOT / "scripts" / "data" / "hoodie-snow-guide-source-image-cache.json"
APP_VARIANT = "all"
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

BEST_TIME = {
    "vic": "June to late September, with July and August usually the strongest snow window",
    "nsw": "the June to October snow season, with July and August usually the strongest snow window",
    "tas": "mid-June to late September, depending on weather",
    "act": "June to September, with July and August best and road or operating updates checked first",
    "wa": "after strong winter cold fronts only; snow is occasional and not guaranteed",
    "opportunistic": "after winter cold snaps or fresh snow reports; snow is occasional and not guaranteed",
}


def commons_file_path(file_name: str, width: int = 1600) -> str:
    encoded = urllib.parse.quote(file_name, safe="(),'-")
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}?width={width}"


PLACES: dict[str, dict[str, Any]] = {
    "lake_mountain": {
        "name": "Lake Mountain Alpine Resort",
        "lat": -37.504444,
        "lng": 145.882222,
        "season": "vic",
        "image_title": "Lake Mountain (Victoria)",
        "description": "Melbourne-side alpine resort built around snow play, cross-country skiing and first-timer winter days.",
        "access": "Check the daily snow, road and resort operations update before driving.",
    },
    "mt_donna_buang": {
        "name": "Mt Donna Buang Summit",
        "lat": -37.706389,
        "lng": 145.681111,
        "season": "opportunistic",
        "image_title": "Mount Donna Buang",
        "description": "A close natural-snow summit near Warburton for simple snow play after cold winter systems.",
        "access": "Expect crowds and changing road conditions on fresh-snow weekends.",
    },
    "mt_baw_baw": {
        "name": "Mt Baw Baw Alpine Resort",
        "lat": -37.839444,
        "lng": 146.275833,
        "season": "vic",
        "image_title": "Mount Baw Baw",
        "description": "Compact downhill and snow-play resort with beginner-friendly terrain, tobogganing and family appeal.",
        "access": "Lift, road and toboggan-area availability stay weather dependent.",
    },
    "mt_buller": {
        "name": "Mt Buller",
        "lat": -37.145278,
        "lng": 146.426111,
        "season": "vic",
        "image_title": "Mount Buller (Victoria)",
        "description": "Major full-service Victorian alpine resort with village stays, lifts, lessons and snow play.",
        "access": "Winter entry, parking and chain rules apply during declared season.",
    },
    "mt_stirling": {
        "name": "Mt Stirling Snow Play Area",
        "lat": -37.126,
        "lng": 146.492,
        "season": "vic",
        "image_title": "Mount Stirling",
        "description": "Quieter Buller-adjacent snow-play and cross-country touring area with a nature-first feel.",
        "access": "Carry chains in season and check whether the snow-play areas are operating.",
    },
    "mt_buffalo_dingo_dell": {
        "name": "Mt Buffalo / Dingo Dell",
        "lat": -36.73,
        "lng": 146.79,
        "season": "vic",
        "image_title": "Mount Buffalo National Park",
        "description": "National-park snow-play area with tobogganing and classic snow-gum scenery after good falls.",
        "access": "Less structured than a resort, so confirm road and snow conditions before leaving.",
    },
    "falls_creek": {
        "name": "Falls Creek Alpine Resort",
        "lat": -36.865,
        "lng": 147.273,
        "season": "vic",
        "image_title": "Falls Creek, Victoria",
        "description": "Large Victorian alpine resort known for reliable snow cover, village stays, downhill terrain and cross-country trails.",
        "access": "Check current snow reports, road status, parking and chain requirements.",
    },
    "dinner_plain": {
        "name": "Dinner Plain",
        "lat": -37.03,
        "lng": 147.278889,
        "season": "vic",
        "image_title": "Dinner Plain, Victoria",
        "description": "Relaxed alpine village with snow play, tobogganing and easy pairing with the Hotham corridor.",
        "access": "Best used as a village base or Hotham add-on rather than a large downhill resort.",
    },
    "mt_hotham": {
        "name": "Mt Hotham",
        "lat": -36.975278,
        "lng": 147.132778,
        "season": "vic",
        "image_title": "Mount Hotham",
        "description": "High-altitude Victorian resort with strong snow culture, ski terrain and nearby snow-play options.",
        "access": "Weather, alpine roads and chain rules are essential planning checks.",
    },
    "bogong_high_plains": {
        "name": "Bogong High Plains",
        "lat": -36.95,
        "lng": 147.34,
        "season": "vic",
        "image_title": "Bogong High Plains",
        "description": "Expansive Victorian high-country terrain suited to cross-country skiing, snowshoeing and experienced winter touring.",
        "access": "Treat as weather-exposed backcountry and plan conservatively.",
    },
    "perisher_valley": {
        "name": "Perisher Valley",
        "lat": -36.4,
        "lng": 148.416667,
        "season": "nsw",
        "image_title": "Perisher Valley",
        "description": "NSW's largest resort hub and a high-confidence anchor for resort skiing, lessons and family snow trips.",
        "access": "Use current resort, road and Skitube information before travelling.",
    },
    "thredbo": {
        "name": "Thredbo Village",
        "lat": -36.504722,
        "lng": 148.305556,
        "season": "nsw",
        "image_title": "Thredbo",
        "description": "Village-led Snowy Mountains resort with long runs, lifts, sightseeing and a strong non-ski itinerary.",
        "access": "Works best as a weekend or multi-night alpine trip.",
    },
    "charlotte_pass": {
        "name": "Charlotte Pass",
        "lat": -36.416667,
        "lng": 148.333333,
        "season": "nsw",
        "image_title": "Charlotte Pass",
        "description": "Australia's highest resort village and a deep-winter Snowy Mountains classic.",
        "access": "Winter access is by oversnow transport from Perisher.",
    },
    "selwyn": {
        "name": "Selwyn Snow Resort",
        "lat": -35.908333,
        "lng": 148.45,
        "season": "nsw",
        "image_title": "Selwyn Snow Resort",
        "description": "Family and beginner-focused Snowy Mountains resort with tubing, tobogganing and gentler terrain.",
        "access": "Check resort operations and Kosciuszko National Park entry conditions.",
    },
    "smiggin_holes": {
        "name": "Smiggin Holes",
        "lat": -36.394444,
        "lng": 148.429167,
        "season": "nsw",
        "image_title": "Smiggin Holes",
        "description": "Sheltered Perisher area that suits beginners, families and lesson-led snow days.",
        "access": "Plan it through the wider Perisher transport and resort network.",
    },
    "blue_cow": {
        "name": "Blue Cow",
        "lat": -36.366667,
        "lng": 148.4,
        "season": "nsw",
        "image_title": "Blue Cow Mountain",
        "description": "Scenic Perisher sector with Skitube access and terrain suited to stronger skiers and mixed groups.",
        "access": "Confirm Skitube and lift operations before locking in the day.",
    },
    "guthega": {
        "name": "Guthega",
        "lat": -36.383333,
        "lng": 148.366667,
        "season": "nsw",
        "image_title": "Guthega",
        "description": "Quieter western Perisher area with alpine scenery and lower-crowd appeal.",
        "access": "Fold it into a broader Perisher trip and check road access.",
    },
    "corin_forest": {
        "name": "Corin Forest",
        "lat": -35.515569,
        "lng": 148.921632,
        "season": "act",
        "image_url": commons_file_path("Ice and Snow on Dirt Road in Corin Forest - panoramio.jpg"),
        "description": "Canberra-region snow-play and beginner-ski site where machine-made snow improves first-snow reliability.",
        "access": "Book/check sessions and operating conditions before travelling.",
    },
    "ben_lomond_nsw": {
        "name": "Ben Lomond NSW",
        "lat": -30.0199,
        "lng": 151.6596,
        "season": "opportunistic",
        "image_title": "Ben Lomond, New South Wales",
        "description": "Northern Tablelands locality with a real winter-snow identity, but without resort infrastructure.",
        "access": "Treat it as an opportunistic winter road-trip stop, not a guaranteed snow day.",
    },
    "barrington_tops": {
        "name": "Barrington Tops / Gloucester Tops",
        "lat": -32.04,
        "lng": 151.45,
        "season": "opportunistic",
        "image_url": commons_file_path("Snow Gum (Eucalyptus pauciflora) woodland, Gloucester Tops (45391895202).jpg"),
        "description": "High northern-NSW national-park country that can collect natural snow during cold events.",
        "access": "Roads can change quickly and this is not a ski-field destination.",
    },
    "oberon_snow": {
        "name": "Oberon",
        "lat": -33.70415,
        "lng": 149.8588,
        "season": "opportunistic",
        "image_url": commons_file_path("Day old snow, Oberon.jpg"),
        "description": "Central Tablelands town on Sydney's western snow-chasing route, useful for snow play and photography when winter systems settle over the high country.",
        "access": "Check current snow reports, Oberon road closures and Live Traffic before leaving Sydney.",
    },
    "blackheath_blue_mountains": {
        "name": "Blackheath / Upper Blue Mountains",
        "lat": -33.6338889,
        "lng": 150.2847222,
        "season": "opportunistic",
        "image_url": commons_file_path("Blackheath NSW Snow20-6-07-35.jpg"),
        "description": "Upper Blue Mountains town near the ridge where snow can settle during significant cold outbreaks, making it a closer Sydney snow-chasing wildcard.",
        "access": "Use only after fresh snow reports and avoid closed or icy roads.",
    },
    "bluff_knoll": {
        "name": "Bluff Knoll",
        "lat": -34.373889,
        "lng": 118.249722,
        "season": "wa",
        "image_url": commons_file_path("Bluff Knoll, Stirling Range, Western Australia.jpg"),
        "description": "WA's best-known natural snow-view summit and the strongest local Perth snow-chasing option.",
        "access": "Only visit in safe hiking and road conditions; snow can be brief.",
    },
    "toolbrunup_peak": {
        "name": "Toolbrunup Peak",
        "lat": -34.382,
        "lng": 118.052,
        "season": "wa",
        "image_url": commons_file_path("Toolbrunup gnangarra.jpg"),
        "description": "High Stirling Range peak that can catch winter dustings from the same cold systems as Bluff Knoll.",
        "access": "A hiking-first snow-view option for suitable weather windows only.",
    },
    "mount_trio": {
        "name": "Mount Trio",
        "lat": -34.354,
        "lng": 118.086,
        "season": "wa",
        "image_url": commons_file_path("View Mount Trio Stirling Range.jpg"),
        "description": "Stirling Range trail and lookout area with a cold alpine feel during rare WA snow events.",
        "access": "Use as a weather-window snow-view stop, not a reliable snow destination.",
    },
    "mount_hassell": {
        "name": "Mount Hassell",
        "lat": -34.405,
        "lng": 118.019,
        "season": "wa",
        "image_url": commons_file_path("Endless Stations 158 - Below Mount Hassell.jpg"),
        "description": "Another high Stirling Range trail that can sit in snow-bearing winter systems.",
        "access": "Check park alerts and avoid exposed trails in unsafe weather.",
    },
    "eastern_lookout_stirling": {
        "name": "Eastern Lookout, Stirling Range",
        "lat": -34.3889,
        "lng": 118.267,
        "season": "wa",
        "image_url": commons_file_path("Stirling view.jpg"),
        "description": "Roadside Stirling Range viewpoint that can work as an easier snow-view fallback when peaks are unsafe.",
        "access": "Still depends on rare cold fronts and safe park-road access.",
    },
    "mount_ginini": {
        "name": "Mount Ginini area",
        "lat": -35.529,
        "lng": 148.772,
        "season": "opportunistic",
        "image_url": commons_file_path("Mount Ginini in winter.jpg"),
        "description": "ACT high-country snow-gum area for natural snow walks and winter scenery.",
        "access": "Road closures, chains and alpine weather can all affect access.",
    },
    "brindabella_mt_franklin": {
        "name": "Brindabella / Mt Franklin snow area",
        "lat": -35.573,
        "lng": 148.696,
        "season": "opportunistic",
        "image_url": commons_file_path("Snow on the Brindabellas August 2012.JPG"),
        "description": "Classic ACT range snow-play fallback when conditions line up around the Brindabellas and Mt Franklin Road.",
        "access": "Only worthwhile after snow reports and safe-road confirmation.",
    },
    "kunanyi_mt_wellington": {
        "name": "kunanyi / Mt Wellington",
        "lat": -42.896,
        "lng": 147.237306,
        "season": "tas",
        "image_url": commons_file_path("Snowfall on Kunanyi.jpg"),
        "description": "Hobart's doorstep mountain for summit snow play, lookouts and quick winter checks from the city.",
        "access": "Use webcams and road updates because Pinnacle Road can close.",
    },
    "lake_dobson": {
        "name": "Lake Dobson",
        "lat": -42.6819,
        "lng": 146.5883,
        "season": "tas",
        "image_url": commons_file_path("Lake Dobson - Mount Field National Park Tasmania.jpg"),
        "description": "Accessible Mount Field alpine lake area for southern Tasmania snow play and winter walking.",
        "access": "Chains may be required and Lake Dobson Road can close.",
    },
    "mount_mawson": {
        "name": "Mount Mawson",
        "lat": -42.688,
        "lng": 146.593,
        "season": "tas",
        "image_url": commons_file_path("Mount Mawson.jpg"),
        "description": "Small southern Tasmanian ski field above Lake Dobson with downhill, cross-country and snow-play appeal.",
        "access": "Natural snow and volunteer-run operations make condition checks essential.",
    },
    "ben_lomond_tas": {
        "name": "Ben Lomond Alpine Resort",
        "lat": -41.53,
        "lng": 147.65,
        "season": "tas",
        "image_title": "Ben Lomond (Tasmania)",
        "description": "Tasmania's most resort-like snow destination with skiing, snowboarding, tobogganing and alpine-village facilities.",
        "access": "Carry chains in winter and check shuttle or road conditions before climbing Jacobs Ladder.",
    },
    "jacobs_ladder": {
        "name": "Jacobs Ladder",
        "lat": -41.545,
        "lng": 147.649,
        "season": "tas",
        "image_title": "Ben Lomond (Tasmania)",
        "description": "Iconic steep winter road ascent to the Ben Lomond plateau and its snowfields.",
        "access": "Chains are required in winter and walking the road is not permitted for safety.",
    },
    "cradle_mountain": {
        "name": "Cradle Mountain",
        "lat": -41.68,
        "lng": 145.94,
        "season": "tas",
        "image_title": "Cradle Mountain",
        "description": "Tasmanian alpine landscape with winter snowdrifts, mountain views and serious cold-weather walking conditions.",
        "access": "Best for prepared scenery and walking, not resort skiing.",
    },
    "dove_lake": {
        "name": "Dove Lake",
        "lat": -41.658056,
        "lng": 145.961944,
        "season": "tas",
        "image_title": "Dove Lake (Tasmania)",
        "description": "Classic Cradle Mountain lake walk and photography stop when winter weather brings snow to the peaks.",
        "access": "Use shuttle, park-pass and weather guidance before heading in.",
    },
    "hartz_mountains": {
        "name": "Hartz Mountains National Park",
        "lat": -43.229722,
        "lng": 146.756111,
        "season": "tas",
        "image_title": "Hartz Mountains National Park",
        "description": "Southern wilderness snow destination with alpine plateaus, tarns and exposed winter walking.",
        "access": "Less structured than a resort and more weather exposed than city-side snow spots.",
    },
    "central_plateau_liawenee": {
        "name": "Central Plateau / Liawenee",
        "lat": -41.899,
        "lng": 146.669,
        "season": "tas",
        "image_title": "Central Plateau (Tasmania)",
        "description": "Broad Tasmanian highlands snow country with classic cold-climate winter scenery.",
        "access": "Remote, unserviced and best approached with conservative weather planning.",
    },
    "lake_st_clair": {
        "name": "Lake St Clair",
        "lat": -42.118,
        "lng": 146.175,
        "season": "tas",
        "image_title": "Lake St Clair (Tasmania)",
        "description": "Alpine-lake winter stop with snow atmosphere and access into the southern end of Cradle Mountain-Lake St Clair.",
        "access": "Roads and tracks may be affected by snow or ice in winter.",
    },
}


GUIDES: list[dict[str, Any]] = [
    {
        "city": "Melbourne",
        "state": "VIC",
        "intro": "This Melbourne guide focuses on Victoria's strongest snow-play, ski-resort and high-country options, from close day trips to bigger alpine weekends. Check live snow, road and chain updates before travelling, especially around fresh falls.",
        "cover": "lake_mountain",
        "places": [
            "lake_mountain",
            "mt_donna_buang",
            "mt_baw_baw",
            "mt_buller",
            "mt_stirling",
            "mt_buffalo_dingo_dell",
            "falls_creek",
            "dinner_plain",
            "mt_hotham",
            "bogong_high_plains",
        ],
    },
    {
        "city": "Brisbane",
        "state": "QLD",
        "intro": "Brisbane does not have a local resort-snow catchment, so this guide is framed around the most practical fly-drive and road-trip snow options. The NSW Snowy Mountains lead the list, with nearer northern-NSW locations clearly marked as opportunistic.",
        "cover": "perisher_valley",
        "places": [
            "perisher_valley",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "corin_forest",
            "ben_lomond_nsw",
            "barrington_tops",
        ],
    },
    {
        "city": "Perth",
        "state": "WA",
        "intro": "Perth's local snow guide needs a clear split: rare but real Stirling Range snow-view windows, then interstate resorts for reliable snow. Treat the WA peaks as opportunistic winter cold-front trips, not guaranteed snow days.",
        "cover": "bluff_knoll",
        "places": [
            "bluff_knoll",
            "toolbrunup_peak",
            "mount_trio",
            "mount_hassell",
            "eastern_lookout_stirling",
            "mt_buller",
            "falls_creek",
            "mt_hotham",
            "perisher_valley",
            "thredbo",
        ],
    },
    {
        "city": "Wollongong",
        "state": "NSW",
        "intro": "From Wollongong, the strongest snow choices sit in the Snowy Mountains and Canberra corridor. This guide balances reliable resorts with ACT high-country snow-play areas that depend heavily on current conditions.",
        "cover": "thredbo",
        "places": [
            "perisher_valley",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "corin_forest",
            "mount_ginini",
            "brindabella_mt_franklin",
        ],
    },
    {
        "city": "Sydney",
        "state": "NSW",
        "intro": "Sydney has no guaranteed local resort snow, so this guide starts with the reliable Snowy Mountains and ACT snow-play options, then adds Oberon and the Upper Blue Mountains as closer winter wildcards. Treat local entries as opportunistic and check snow, road and closure updates before leaving.",
        "cover": "oberon_snow",
        "places": [
            "perisher_valley",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "corin_forest",
            "oberon_snow",
            "blackheath_blue_mountains",
        ],
    },
    {
        "city": "Adelaide",
        "state": "SA",
        "intro": "Adelaide does not have a dependable local ski field, so this guide focuses on the Victorian Alps first and then the NSW Snowies. Plan these as fly-drive or multi-day road trips and check snow, road and chain conditions before committing.",
        "cover": "falls_creek",
        "places": [
            "mt_buller",
            "mt_stirling",
            "falls_creek",
            "mt_hotham",
            "dinner_plain",
            "mt_buffalo_dingo_dell",
            "lake_mountain",
            "mt_baw_baw",
            "perisher_valley",
            "thredbo",
        ],
    },
    {
        "city": "Canberra",
        "state": "ACT",
        "intro": "Canberra is one of the strongest snow-guide cities because it has nearby snow play plus direct access to the Snowy Mountains. This guide starts local, then moves into the bigger NSW resort network.",
        "cover": "corin_forest",
        "places": [
            "corin_forest",
            "perisher_valley",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "mount_ginini",
            "brindabella_mt_franklin",
        ],
    },
    {
        "city": "Hobart",
        "state": "TAS",
        "intro": "Hobart has both city-side snow checks and deeper Tasmanian alpine trips. This guide mixes close snow-play mountains, southern ski-field options and high-country parks where weather can change quickly.",
        "cover": "kunanyi_mt_wellington",
        "places": [
            "kunanyi_mt_wellington",
            "lake_dobson",
            "mount_mawson",
            "ben_lomond_tas",
            "jacobs_ladder",
            "cradle_mountain",
            "dove_lake",
            "hartz_mountains",
            "central_plateau_liawenee",
            "lake_st_clair",
        ],
    },
    {
        "city": "Darwin",
        "state": "NT",
        "intro": "Darwin has no practical local snow product, so this is a fly-in snow guide for dedicated winter escapes. The list prioritises reliable Victorian, NSW/ACT and Tasmanian snow products that make sense as planned trips rather than day outings.",
        "cover": "mt_hotham",
        "places": [
            "mt_buller",
            "falls_creek",
            "mt_hotham",
            "perisher_valley",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "lake_mountain",
            "mt_baw_baw",
            "ben_lomond_tas",
        ],
    },
    {
        "city": "Gold Coast",
        "state": "QLD",
        "intro": "The Gold Coast has no nearby resort snow, so this guide is built around NSW/ACT snow trips plus nearer northern-NSW winter wildcards. The resort entries are the reliable choices; the tablelands and Barrington options need fresh snow reports.",
        "cover": "selwyn",
        "places": [
            "perisher_valley",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "corin_forest",
            "ben_lomond_nsw",
            "barrington_tops",
        ],
    },
    {
        "city": "Newcastle",
        "state": "NSW",
        "intro": "Newcastle works best as a hybrid snow guide: Snowy Mountains resorts for reliable trips and Barrington Tops for a closer natural-snow wildcard. Check current conditions carefully before chasing non-resort snow.",
        "cover": "barrington_tops",
        "places": [
            "perisher_valley",
            "thredbo",
            "selwyn",
            "charlotte_pass",
            "barrington_tops",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "corin_forest",
            "ben_lomond_nsw",
        ],
    },
    {
        "city": "Geelong",
        "state": "VIC",
        "intro": "Geelong's snow guide is strongly Victorian, with the central and north-eastern alpine resorts doing most of the work. Use this as a mix of family snow-play, resort weekends and more experienced high-country options.",
        "cover": "mt_stirling",
        "places": [
            "mt_buller",
            "mt_stirling",
            "lake_mountain",
            "mt_donna_buang",
            "mt_baw_baw",
            "mt_buffalo_dingo_dell",
            "falls_creek",
            "dinner_plain",
            "mt_hotham",
            "bogong_high_plains",
        ],
    },
    {
        "city": "Armidale",
        "state": "NSW",
        "intro": "Armidale can support nearby opportunistic snow chasing around the Northern Tablelands, then bigger Snowy Mountains trips when reliability matters. Local entries are weather dependent; resort entries are the full snow-holiday options.",
        "cover": "ben_lomond_nsw",
        "places": [
            "ben_lomond_nsw",
            "barrington_tops",
            "perisher_valley",
            "thredbo",
            "charlotte_pass",
            "selwyn",
            "smiggin_holes",
            "blue_cow",
            "guthega",
            "corin_forest",
        ],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create, publish, and verify Top 10 Snow Spots guides for both SETU and Hoodie."
    )
    parser.add_argument(
        "--admin-email",
        default=image_tools.load_env_value("VITE_REVIEWER_EMAIL", "reviewer@ghar.app"),
        help="Admin email to use for live imports.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build CSVs and preview imports without uploading images or committing live guides.",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip post-publish endpoint smoke checks.",
    )
    parser.add_argument(
        "--city",
        action="append",
        help="Limit generation, import, and verification to a city. Can be repeated or comma-separated.",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    normalized = "".join(ch.lower() if ch.isalnum() else "-" for ch in value)
    return "-".join(part for part in normalized.split("-") if part)


def guide_slug(city: str) -> str:
    return f"top-10-snow-spots-in-{slugify(city)}"


def select_guides(city_args: list[str] | None) -> list[dict[str, Any]]:
    requested: list[str] = []
    for raw in city_args or []:
        requested.extend(part.strip() for part in raw.split(",") if part.strip())
    if not requested:
        return GUIDES

    guides_by_slug = {slugify(str(guide["city"])): guide for guide in GUIDES}
    selected: list[dict[str, Any]] = []
    selected_keys: set[str] = set()
    unknown: list[str] = []
    for city in requested:
        key = slugify(city)
        guide = guides_by_slug.get(key)
        if not guide:
            unknown.append(city)
            continue
        if key not in selected_keys:
            selected.append(guide)
            selected_keys.add(key)

    if unknown:
        available = ", ".join(sorted(str(guide["city"]) for guide in GUIDES))
        raise RuntimeError(f"Unknown city filter(s): {', '.join(unknown)}. Available: {available}.")
    return selected


def maps_url(lat: float, lng: float) -> str:
    return f"https://maps.google.com/?q={lat:.6f},{lng:.6f}"


def format_coord(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".")


def clean_image_url(url: str) -> str:
    parsed = urllib.parse.urlparse(str(url or "").strip())
    if not parsed.scheme or not parsed.netloc:
        return str(url or "").strip()
    if "upload.wikimedia.org" in parsed.netloc:
        parsed = parsed._replace(query="")
    return urllib.parse.urlunparse(parsed)


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return fallback


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def merge_manifest_entries(
    existing_entries: Any,
    new_entries: list[dict[str, Any]],
    selected_slugs: set[str],
) -> list[Any]:
    if not isinstance(existing_entries, list):
        existing_entries = []
    preserved = [
        entry
        for entry in existing_entries
        if not (isinstance(entry, dict) and str(entry.get("guide_slug") or "") in selected_slugs)
    ]
    return preserved + new_entries


def fetch_wikipedia_image(title: str) -> str:
    params = {
        "action": "query",
        "format": "json",
        "titles": title,
        "prop": "pageimages",
        "piprop": "original|thumbnail",
        "pithumbsize": "1600",
        "redirects": "1",
        "origin": "*",
    }
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    last_error: Exception | None = None
    for attempt in range(5):
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "CodexSnowGuideImporter/1.0 (contact: ghar@knowwhatson.com)",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.load(response)
            pages = (data.get("query") or {}).get("pages") or {}
            for page in pages.values():
                image = (page.get("original") or page.get("thumbnail") or {}).get("source")
                if image:
                    return clean_image_url(str(image))
            raise RuntimeError(f"No page image found for Wikipedia title {title!r}.")
        except Exception as error:  # noqa: BLE001
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Could not resolve Wikipedia image for {title!r}: {last_error}") from last_error


def resolve_place_image_source(place_key: str, cache: dict[str, str]) -> str:
    place = PLACES[place_key]
    if place_key in cache and cache[place_key].strip():
        return cache[place_key].strip()

    source_url = str(place.get("image_url") or "").strip()
    if not source_url:
        title = str(place.get("image_title") or "").strip()
        if not title:
            raise RuntimeError(f"{place['name']} is missing image_url or image_title.")
        source_url = fetch_wikipedia_image(title)
        time.sleep(0.4)

    source_url = clean_image_url(source_url)
    image_tools.verify_image_url(source_url)
    cache[place_key] = source_url
    print(f"SOURCE OK  {place['name']} -> {source_url}")
    return source_url


def build_place_description(place_key: str) -> str:
    place = PLACES[place_key]
    best_time = BEST_TIME[place["season"]]
    return f"{place['description']} Best time: {best_time}. {place['access']}"


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
    if int(data.get("row_count") or 0) != 10:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview expected 10 rows, got {data.get('row_count')}.")
    warnings = data.get("warnings") or []
    if warnings:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview returned warnings: {warnings}")
    guide = data.get("guide") if isinstance(data.get("guide"), dict) else {}
    if guide.get("app_variant") != APP_VARIANT:
        raise RuntimeError(f"{rows[0]['guide_slug']} preview app_variant mismatch: {guide.get('app_variant')!r}")
    if not str(guide.get("intro") or "").strip():
        raise RuntimeError(f"{rows[0]['guide_slug']} preview has an empty intro.")
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
    if not isinstance(data, dict) or not isinstance(data.get("guide"), dict):
        raise RuntimeError("Commit response was missing guide data.")
    return data["guide"]


def fetch_live_city_guides(
    base_url: str,
    public_anon_key: str,
    city: str,
    app_variant: str,
) -> list[dict[str, Any]]:
    response = image_tools.api_request(
        base_url,
        public_anon_key,
        "GET",
        f"/city-guides?city={urllib.parse.quote(city)}&app_variant={urllib.parse.quote(app_variant)}",
    )
    guides = response.get("data") if isinstance(response, dict) else None
    if not isinstance(guides, list):
        raise RuntimeError(f"Could not fetch live city guides for {city} [{app_variant}].")
    return [guide for guide in guides if isinstance(guide, dict)]


def ensure_admin_email_is_valid(base_url: str, public_anon_key: str, admin_email: str) -> None:
    response = image_tools.api_request(base_url, public_anon_key, "GET", "/admin/admins")
    admins = response.get("data") if isinstance(response, dict) else None
    if not isinstance(admins, list):
        raise RuntimeError("Could not load admin list.")
    allowed = {str(admin.get("email") or "").strip().lower() for admin in admins if isinstance(admin, dict)}
    if admin_email.lower() not in allowed:
        raise RuntimeError(f"{admin_email} is not an admin in the live project.")


def assert_valid_place(place: dict[str, Any], slug: str) -> None:
    lat = float(place.get("lat"))
    lng = float(place.get("lng"))
    if not (-90 <= lat <= 90 and -180 <= lng <= 180) or (lat == 0 and lng == 0):
        raise RuntimeError(f"{slug} place {place.get('name')} has invalid coordinates: {lat}, {lng}")
    if not str(place.get("navigation_link") or "").startswith("https://maps.google.com/?q="):
        raise RuntimeError(f"{slug} place {place.get('name')} has an invalid map link.")
    description = str(place.get("description") or "")
    if "Best time:" not in description:
        raise RuntimeError(f"{slug} place {place.get('name')} is missing Best time in description.")


def verify_live_guides(
    project_id: str,
    base_url: str,
    public_anon_key: str,
    guides: list[dict[str, Any]],
) -> None:
    expected_by_city = {guide["city"]: guide_slug(guide["city"]) for guide in guides}
    cover_urls: set[str] = set()
    verified_images = 0

    for app_variant in ("ghar", "burb_mate"):
        for city, expected_slug in expected_by_city.items():
            live_guides = fetch_live_city_guides(base_url, public_anon_key, city, app_variant)
            guide = next((item for item in live_guides if str(item.get("slug") or "") == expected_slug), None)
            if not guide:
                live_slugs = [str(item.get("slug") or "") for item in live_guides]
                raise RuntimeError(f"Missing {expected_slug} in {city} [{app_variant}], found {live_slugs}.")
            if str(guide.get("app_variant") or "") != APP_VARIANT:
                raise RuntimeError(f"{expected_slug} stored with app_variant={guide.get('app_variant')!r}.")
            if str(guide.get("title") or "") != f"Top 10 Snow Spots in {city}":
                raise RuntimeError(f"{expected_slug} title mismatch: {guide.get('title')!r}.")
            if not str(guide.get("intro") or "").strip():
                raise RuntimeError(f"{expected_slug} is missing intro.")
            places = guide.get("places") or []
            if len(places) != 10:
                raise RuntimeError(f"{expected_slug} should have 10 places, found {len(places)}.")

            cover_url = str(guide.get("cover_image_url") or "").strip()
            if not image_tools.is_hosted_guide_asset_url(cover_url, project_id):
                raise RuntimeError(f"{expected_slug} cover is not hosted in the guide-assets bucket.")
            image_tools.verify_image_url(cover_url)
            cover_urls.add(cover_url)
            verified_images += 1

            for place in sorted(places, key=lambda item: int(item.get("position") or 0)):
                assert_valid_place(place, expected_slug)
                image_url = str(place.get("image_url") or "").strip()
                if not image_tools.is_hosted_guide_asset_url(image_url, project_id):
                    raise RuntimeError(f"{expected_slug} place {place.get('name')} image is not hosted.")
                image_tools.verify_image_url(image_url)
                verified_images += 1

        print(f"VERIFY OK  snow guides live for {app_variant}.")

    if len(cover_urls) != len(guides):
        raise RuntimeError(f"Expected {len(guides)} unique hosted cover URLs, found {len(cover_urls)}.")
    print(f"VERIFY OK  {len(guides)} unique covers and {verified_images} live image responses checked.")


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


def build_rows_for_guide(
    guide: dict[str, Any],
    base_url: str,
    public_anon_key: str,
    admin_email: str,
    source_cache: dict[str, str],
    dry_run: bool,
) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    city = guide["city"]
    state = guide["state"]
    title = f"Top 10 Snow Spots in {city}"
    slug = guide_slug(city)
    place_keys = guide["places"]
    if len(place_keys) != 10:
        raise RuntimeError(f"{slug} should define 10 places, found {len(place_keys)}.")

    cover_key = guide["cover"]
    cover_source_url = resolve_place_image_source(cover_key, source_cache)
    cover_url = cover_source_url if dry_run else image_tools.upload_remote_image(
        base_url,
        public_anon_key,
        admin_email,
        slug,
        "cover",
        None,
        title,
        cover_source_url,
    )
    manifest_entries = [
        {
            "guide_slug": slug,
            "slot_type": "cover",
            "place_position": None,
            "place_name": title,
            "source_image_url": cover_source_url,
            "hosted_url": cover_url,
            "cover_from_place_key": cover_key,
            "cover_from_place_name": PLACES[cover_key]["name"],
        }
    ]

    rows: list[dict[str, str]] = []
    for position, place_key in enumerate(place_keys):
        place = PLACES[place_key]
        source_url = resolve_place_image_source(place_key, source_cache)
        hosted_url = source_url if dry_run else image_tools.upload_remote_image(
            base_url,
            public_anon_key,
            admin_email,
            slug,
            "place",
            position,
            place["name"],
            source_url,
        )
        manifest_entries.append(
            {
                "guide_slug": slug,
                "slot_type": "place",
                "place_position": position,
                "place_name": place["name"],
                "source_image_url": source_url,
                "hosted_url": hosted_url,
            }
        )
        rows.append(
            {
                "city": city,
                "state": state,
                "guide_title": title,
                "guide_slug": slug,
                "cover_image_url": cover_url,
                "manual_intro": guide["intro"],
                "position": "0",
                "app_variant": APP_VARIANT,
                "place_position": str(position),
                "place_name": place["name"],
                "place_description": build_place_description(place_key),
                "place_image_url": hosted_url,
                "navigation_link": maps_url(place["lat"], place["lng"]),
                "lat": format_coord(place["lat"]),
                "lng": format_coord(place["lng"]),
            }
        )

    return rows, manifest_entries


def main() -> None:
    args = parse_args()
    selected_guides = select_guides(args.city)
    selected_slugs = {guide_slug(guide["city"]) for guide in selected_guides}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    project_id, public_anon_key = image_tools.load_project_config()
    base_url = f"https://{project_id}.supabase.co/functions/v1/make-server-1d591b90"
    ensure_admin_email_is_valid(base_url, public_anon_key, args.admin_email)

    source_cache = read_json(IMAGE_SOURCE_CACHE_PATH, {})
    if not isinstance(source_cache, dict):
        source_cache = {}

    all_manifest_entries: list[dict[str, Any]] = []
    committed_slugs: list[str] = []

    for guide in selected_guides:
        slug = guide_slug(guide["city"])
        print(f"\nGUIDE      preparing {slug}")
        rows, manifest_entries = build_rows_for_guide(
            guide=guide,
            base_url=base_url,
            public_anon_key=public_anon_key,
            admin_email=args.admin_email,
            source_cache=source_cache,
            dry_run=args.dry_run,
        )
        preview = preview_import(base_url, public_anon_key, args.admin_email, rows)
        print(f"PREVIEW OK {slug}")

        csv_path = DATA_DIR / f"{slug}.csv"
        write_csv_rows(csv_path, rows)
        print(f"WRITE OK   {csv_path}")

        if not args.dry_run:
            committed = commit_import(base_url, public_anon_key, args.admin_email, rows, preview)
            committed_slugs.append(str(committed.get("slug") or ""))
            print(f"COMMIT OK  {committed.get('slug')}")

        all_manifest_entries.extend(manifest_entries)
        write_json(IMAGE_SOURCE_CACHE_PATH, source_cache)

    manifest_entries = merge_manifest_entries(read_json(MANIFEST_PATH, []), all_manifest_entries, selected_slugs)
    write_json(MANIFEST_PATH, manifest_entries)
    print(f"\nWRITE OK   {MANIFEST_PATH}")

    if args.dry_run:
        print("\nDONE       Dry run completed without live commits.")
        return

    if set(committed_slugs) != selected_slugs:
        raise RuntimeError(f"Committed slugs mismatch. Expected {sorted(selected_slugs)}, got {sorted(committed_slugs)}")

    verify_live_guides(project_id, base_url, public_anon_key, selected_guides)

    if not args.skip_smoke:
        smoke_city = str(selected_guides[0]["city"])
        run_smoke_check("ghar", smoke_city)
        run_smoke_check("burb_mate", smoke_city)

    print("\nDONE       Snow guides imported and verified for SETU and Hoodie.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(f"ERROR      {error}", file=sys.stderr)
        sys.exit(1)

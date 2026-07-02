#!/usr/bin/env python3

import csv
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

PREFIX = "GHAR_CLAUDE_"
TABLE_NAME = "kv_store_1d591b90"
NSW_PACKAGE_URL = "https://data.nsw.gov.au/data/api/3/action/package_show?id=fuel-check"
QLD_PACKAGE_URLS = [
    "https://www.data.qld.gov.au/api/3/action/package_show?id=fuel-price-reporting-2026",
    "https://www.data.qld.gov.au/api/3/action/package_show?id=fuel-price-reporting-2025",
]
WA_REPORTS_URL = "https://www.fuelwatch.wa.gov.au/api/report/monthly-retail-prices"
MONTH_NAME_TO_NUMBER = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}
FUEL_ALIASES = {
    "unleaded_up": {
        "u91",
        "ulp",
        "unleaded",
        "unleaded petrol",
        "e10",
        "ethanol 10",
    },
    "premium_up": {
        "p95",
        "p98",
        "premium",
        "premium up",
        "premium unleaded",
        "pulp",
        "95 ron",
        "98 ron",
    },
    "diesel": {"dl", "diesel", "dsl"},
    "brand_diesel": {"pdl", "premium diesel", "brand diesel", "pdsl"},
    "lpg": {"lpg", "autogas"},
    "e85": {"e85"},
}
FUEL_CATEGORIES = [
    "unleaded_up",
    "premium_up",
    "diesel",
    "brand_diesel",
    "lpg",
    "e85",
]
SPREADSHEET_NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def http_get(url: str, headers: dict | None = None, timeout: int = 120) -> bytes:
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "GHAR/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def http_get_json(url: str, headers: dict | None = None, timeout: int = 120):
    return json.loads(http_get(url, headers=headers, timeout=timeout).decode("utf-8"))


def normalize_fuel(value: str) -> str | None:
    normalized = re.sub(r"[^a-z0-9]+", " ", str(value or "").strip().lower()).strip()
    if not normalized:
        return None
    for category, aliases in FUEL_ALIASES.items():
        if normalized == category:
            return category
        if normalized in aliases:
            return category
    return None


def month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def parse_month_key_from_label(label: str) -> str | None:
    match = re.search(
        r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b[\s_-]*(\d{4})",
        str(label or ""),
        re.IGNORECASE,
    )
    if not match:
        return None
    month = MONTH_NAME_TO_NUMBER[match.group(1).lower()]
    return month_key(int(match.group(2)), month)


def iter_month_keys(start_day: date, end_day: date, seed_days: int = 31) -> list[str]:
    seed_start = start_day - timedelta(days=seed_days)
    cursor = date(seed_start.year, seed_start.month, 1)
    end_month = date(end_day.year, end_day.month, 1)
    keys: list[str] = []
    while cursor <= end_month:
        keys.append(month_key(cursor.year, cursor.month))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)
    return keys


def parse_csv_rows(raw: bytes) -> list[dict[str, str]]:
    text = raw.decode("utf-8-sig", "ignore")
    return list(csv.DictReader(io.StringIO(text)))


def excel_serial_to_datetime(value: float) -> datetime:
    return datetime(1899, 12, 30, tzinfo=timezone.utc) + timedelta(days=float(value))


def column_index(reference: str) -> int:
    result = 0
    for char in reference:
        if not char.isalpha():
            break
        result = result * 26 + (ord(char.upper()) - 64)
    return result


def parse_xlsx_rows(raw: bytes) -> list[dict[str, str | float]]:
    with zipfile.ZipFile(io.BytesIO(raw)) as workbook:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            shared_root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            for si in shared_root.findall("a:si", SPREADSHEET_NS):
                parts = [node.text or "" for node in si.findall(".//a:t", SPREADSHEET_NS)]
                shared_strings.append("".join(parts))
        sheet_root = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
        rows: list[dict[str, str | float]] = []
        headers: dict[int, str] = {}
        for row in sheet_root.findall(".//a:sheetData/a:row", SPREADSHEET_NS):
            values: dict[int, str | float] = {}
            for cell in row.findall("a:c", SPREADSHEET_NS):
                ref = cell.attrib.get("r", "")
                index = column_index(ref)
                cell_type = cell.attrib.get("t")
                if cell_type == "inlineStr":
                    parts = [node.text or "" for node in cell.findall(".//a:t", SPREADSHEET_NS)]
                    value: str | float = "".join(parts)
                else:
                    raw_value = cell.findtext("a:v", default="", namespaces=SPREADSHEET_NS)
                    if cell_type == "s":
                        value = shared_strings[int(raw_value)] if raw_value else ""
                    else:
                        try:
                            value = float(raw_value)
                        except ValueError:
                            value = raw_value
                values[index] = value
            if not headers:
                headers = {index: str(value) for index, value in values.items()}
                continue
            rows.append({headers[index]: values.get(index, "") for index in headers})
        return rows


def summarise_prices(prices: list[float]) -> dict:
    if not prices:
        return {
            "averagePriceCpl": None,
            "minPriceCpl": None,
            "maxPriceCpl": None,
            "stationCount": 0,
            "priceStdDevCpl": None,
        }
    average_price = sum(prices) / len(prices)
    variance = sum((price - average_price) ** 2 for price in prices) / len(prices)
    return {
        "averagePriceCpl": average_price,
        "minPriceCpl": min(prices),
        "maxPriceCpl": max(prices),
        "stationCount": len(prices),
        "priceStdDevCpl": variance ** 0.5,
    }


def snapshot_key(state: str, day_key: str) -> str:
    return f"{PREFIX}fuel_snapshot:v1:{state}:{day_key}"


def captured_at(day_key: str) -> str:
    local_dt = datetime.combine(date.fromisoformat(day_key), time(23, 59, 59), tzinfo=timezone(timedelta(hours=11)))
    return local_dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def build_snapshot(state: str, day_key: str, bucket_map: dict[str, list[float]], source_note: str) -> dict:
    metrics = {category: summarise_prices(bucket_map.get(category, [])) for category in FUEL_CATEGORIES}
    return {
        "key": snapshot_key(state, day_key),
        "value": {
            "state": state,
            "dayKey": day_key,
            "capturedAt": captured_at(day_key),
            "sourceNote": source_note,
            "metrics": metrics,
        },
    }


def build_event_snapshots(
    state: str,
    events: list[dict],
    start_day: date,
    end_day: date,
    source_note: str,
) -> list[dict]:
    if not events:
        return []
    events_by_day: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        events_by_day[event["day_key"]].append(event)
    first_day = date.fromisoformat(min(events_by_day))
    last_day = min(date.fromisoformat(max(events_by_day)), end_day)
    active: dict[str, tuple[str, float]] = {}
    snapshots: list[dict] = []
    cursor = first_day
    while cursor <= last_day:
        day_key = cursor.isoformat()
        for event in sorted(events_by_day.get(day_key, []), key=lambda item: item["timestamp"]):
            active[event["station_key"]] = (event["fuel"], event["price"])
        if cursor >= start_day and active:
            buckets: dict[str, list[float]] = {category: [] for category in FUEL_CATEGORIES}
            for fuel, price in active.values():
                buckets[fuel].append(price)
            snapshots.append(build_snapshot(state, day_key, buckets, source_note))
        cursor += timedelta(days=1)
    return snapshots


def build_daily_snapshots(
    state: str,
    records: list[dict],
    start_day: date,
    end_day: date,
    source_note: str,
) -> list[dict]:
    by_day: dict[str, dict[str, tuple[str, float]]] = defaultdict(dict)
    for record in records:
        day_key = record["day_key"]
        if not (start_day.isoformat() <= day_key <= end_day.isoformat()):
            continue
        by_day[day_key][record["station_key"]] = (record["fuel"], record["price"])
    snapshots: list[dict] = []
    for day_key in sorted(by_day):
        buckets: dict[str, list[float]] = {category: [] for category in FUEL_CATEGORIES}
        for fuel, price in by_day[day_key].values():
            buckets[fuel].append(price)
        snapshots.append(build_snapshot(state, day_key, buckets, source_note))
    return snapshots


def nsw_events(start_day: date, end_day: date) -> list[dict]:
    month_keys = set(iter_month_keys(start_day, end_day))
    package = http_get_json(NSW_PACKAGE_URL)
    resources = package["result"]["resources"]
    selected = [resource for resource in resources if parse_month_key_from_label(resource.get("name", "")) in month_keys]
    events: list[dict] = []
    for resource in selected:
        url = resource.get("url", "")
        rows = parse_csv_rows(http_get(url)) if url.lower().endswith(".csv") else parse_xlsx_rows(http_get(url))
        for row in rows:
            fuel = normalize_fuel(str(row.get("FuelCode", "")))
            if not fuel:
                continue
            try:
                price = float(row.get("Price", 0))
            except Exception:
                continue
            raw_date = row.get("PriceUpdatedDate", "")
            if isinstance(raw_date, (int, float)):
                timestamp = excel_serial_to_datetime(raw_date)
            else:
                raw_text = str(raw_date).strip().replace(" ", "T")
                timestamp = datetime.fromisoformat(f"{raw_text}+11:00")
            day_key = timestamp.astimezone(timezone(timedelta(hours=11))).date().isoformat()
            station_key = f"{str(row.get('ServiceStationName','')).strip()}|{str(row.get('Address','')).strip()}|{fuel}"
            events.append({
                "day_key": day_key,
                "timestamp": timestamp.timestamp(),
                "station_key": station_key,
                "fuel": fuel,
                "price": price,
            })
    return events


def qld_events(start_day: date, end_day: date) -> list[dict]:
    month_keys = set(iter_month_keys(start_day, end_day))
    resources = []
    for package_url in QLD_PACKAGE_URLS:
        resources.extend(http_get_json(package_url)["result"]["resources"])
    selected = []
    for resource in resources:
        url = str(resource.get("url", ""))
        match = re.search(r"fuel-prices-(\d{4})-(\d{2})-changes-only\.csv", url)
        if match and month_key(int(match.group(1)), int(match.group(2))) in month_keys:
            selected.append(resource)
    events: list[dict] = []
    for resource in selected:
        rows = parse_csv_rows(http_get(resource["url"]))
        for row in rows:
            fuel = normalize_fuel(row.get("Fuel_Type", ""))
            if not fuel:
                continue
            try:
                price = float(row["Price"])
                if price >= 1000:
                    price /= 10
            except Exception:
                continue
            raw = str(row.get("TransactionDateutc", "")).strip()
            match = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}):(\d{2})", raw)
            if not match:
                continue
            dt = datetime(
                int(match.group(3)),
                int(match.group(2)),
                int(match.group(1)),
                int(match.group(4)),
                int(match.group(5)),
                tzinfo=timezone.utc,
            )
            day_key = dt.astimezone(timezone(timedelta(hours=11))).date().isoformat()
            site_id = str(row.get("SiteId", "")).strip()
            if not site_id:
                continue
            events.append({
                "day_key": day_key,
                "timestamp": dt.timestamp(),
                "station_key": f"{site_id}|{fuel}",
                "fuel": fuel,
                "price": price,
            })
    return events


def wa_daily_records(start_day: date, end_day: date) -> list[dict]:
    month_keys = set(iter_month_keys(start_day, end_day, seed_days=0))
    files = http_get_json(WA_REPORTS_URL)
    selected = []
    for file in files:
        match = re.search(r"FuelWatchRetail-(\d{2})-(\d{4})\.csv", str(file.get("fileName", "")))
        if match and month_key(int(match.group(2)), int(match.group(1))) in month_keys:
            selected.append(file)
    records: list[dict] = []
    for file in selected:
        rows = parse_csv_rows(http_get(file["url"]))
        for row in rows:
            fuel = normalize_fuel(row.get("PRODUCT_DESCRIPTION", ""))
            if not fuel:
                continue
            try:
                price = float(row["PRODUCT_PRICE"])
            except Exception:
                continue
            match = re.match(r"(\d{2})/(\d{2})/(\d{4})", str(row.get("PUBLISH_DATE", "")).strip())
            if not match:
                continue
            day_key = date(int(match.group(3)), int(match.group(2)), int(match.group(1))).isoformat()
            records.append({
                "day_key": day_key,
                "station_key": f"{str(row.get('TRADING_NAME','')).strip()}|{str(row.get('ADDRESS','')).strip()}|{fuel}",
                "fuel": fuel,
                "price": price,
            })
    return records


def upsert_snapshots(supabase_url: str, service_role_key: str, snapshots: list[dict]) -> None:
    endpoint = f"{supabase_url}/rest/v1/{TABLE_NAME}?on_conflict=key"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    for index in range(0, len(snapshots), 200):
        chunk = snapshots[index:index + 200]
        req = urllib.request.Request(endpoint, data=json.dumps(chunk).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=180) as response:
            if response.status not in (200, 201, 204):
                raise RuntimeError(f"Upsert failed with HTTP {response.status}")


def main() -> int:
    supabase_url = os.environ.get("SUPABASE_URL", "").strip() or "https://pcgdqsdiidtiziypvqri.supabase.co"
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not service_role_key:
        print("SUPABASE_SERVICE_ROLE_KEY is required", file=sys.stderr)
        return 1

    today = datetime.now().date()
    end_day = today - timedelta(days=1)
    start_day = end_day - timedelta(days=58)

    snapshots: list[dict] = []
    snapshots.extend(build_event_snapshots(
        "NSW",
        nsw_events(start_day, end_day),
        start_day,
        end_day,
        "NSW insights include Data.NSW FuelCheck monthly price-history archives, retained only as compact daily statewide snapshots.",
    ))
    snapshots.extend(build_event_snapshots(
        "QLD",
        qld_events(start_day, end_day),
        start_day,
        end_day,
        "Queensland insights include official Fuel Prices Queensland monthly change archives, rolled forward into compact daily statewide snapshots.",
    ))
    snapshots.extend(build_daily_snapshots(
        "WA",
        wa_daily_records(start_day, end_day),
        start_day,
        end_day,
        "WA insights include FuelWatch monthly retail archives and retain only compact daily statewide snapshots after import.",
    ))

    upsert_snapshots(supabase_url, service_role_key, snapshots)

    summary = defaultdict(int)
    for snapshot in snapshots:
        state = snapshot["value"]["state"]
        summary[state] += 1
    print(json.dumps({
        "windowStartDayKey": start_day.isoformat(),
        "windowEndDayKey": end_day.isoformat(),
        "snapshotsWritten": len(snapshots),
        "byState": dict(summary),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

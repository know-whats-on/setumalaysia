#!/usr/bin/env python3
import base64
import csv
import io
import os
import sqlite3
import sys
import time
import urllib.request
import zipfile
from pathlib import Path


DEFAULT_SOURCE = os.environ.get(
    "TRANSPORT_ACT_GTFS_SOURCE",
    "https://transport.api.act.gov.au/gtfs/data/gtfs/v2/google_transit.zip",
)
DEFAULT_OUTPUT = os.environ.get(
    "TRANSPORT_ACT_GTFS_CACHE_PATH",
    "/Users/rushi/Downloads/GHAR/supabase/functions/make-server-1d591b90/transport_act_cache.sqlite",
)
ACT_CLIENT_ID = os.environ.get("ACT_TRANSPORT_CLIENT_ID", "")
ACT_CLIENT_SECRET = os.environ.get("ACT_TRANSPORT_CLIENT_SECRET", "")

REQUIRED_GTFS_FILES = (
    "agency.txt",
    "stops.txt",
    "routes.txt",
    "trips.txt",
    "stop_times.txt",
    "calendar.txt",
    "calendar_dates.txt",
)
OPTIONAL_GTFS_FILES = ("transfers.txt",)


def normalize_mode(route_type: str) -> tuple[str, str]:
    raw = (route_type or "").strip()
    if raw == "0":
        return ("light_rail", "Light Rail")
    if raw in {"3", "700", "701", "702", "712"}:
        return ("bus", "Bus")
    return ("bus", "Bus")


def act_auth_header() -> dict[str, str]:
    if not ACT_CLIENT_ID or not ACT_CLIENT_SECRET:
        raise RuntimeError(
            "ACT transport credentials are missing. Set ACT_TRANSPORT_CLIENT_ID and ACT_TRANSPORT_CLIENT_SECRET."
        )
    token = base64.b64encode(f"{ACT_CLIENT_ID}:{ACT_CLIENT_SECRET}".encode("utf-8")).decode("ascii")
    return {"Authorization": f"Basic {token}"}


def read_source_entries(source: str) -> dict[str, bytes]:
    source_path = Path(source)
    if source.startswith("http://") or source.startswith("https://"):
        request = urllib.request.Request(source, headers=act_auth_header())
        with urllib.request.urlopen(request, timeout=60) as response:
            raw_bytes = response.read()
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
            return {name: archive.read(name) for name in archive.namelist() if name in REQUIRED_GTFS_FILES + OPTIONAL_GTFS_FILES}
    if source_path.is_dir():
        return {
            name: (source_path / name).read_bytes()
            for name in REQUIRED_GTFS_FILES + OPTIONAL_GTFS_FILES
            if (source_path / name).exists()
        }
    if source_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(source_path) as archive:
            return {name: archive.read(name) for name in archive.namelist() if name in REQUIRED_GTFS_FILES + OPTIONAL_GTFS_FILES}
    raise FileNotFoundError(f"Unsupported ACT GTFS source: {source}")


def dict_reader_from_bytes(data: bytes):
    text_handle = io.TextIOWrapper(io.BytesIO(data), encoding="utf-8-sig", newline="")
    reader = csv.DictReader(text_handle, skipinitialspace=True)
    for row in reader:
        yield {
            str(key or "").strip(): (value.strip() if isinstance(value, str) else value)
            for key, value in row.items()
        }


def parse_seconds(raw_value: str):
    value = (raw_value or "").strip()
    if not value:
        return None
    parts = value.split(":")
    if len(parts) != 3:
        return None
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    except ValueError:
        return None


def create_schema(conn: sqlite3.Connection):
    conn.executescript(
        """
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        PRAGMA temp_store = MEMORY;
        PRAGMA cache_size = -200000;

        DROP TABLE IF EXISTS metadata;
        DROP TABLE IF EXISTS agencies;
        DROP TABLE IF EXISTS stops;
        DROP TABLE IF EXISTS routes;
        DROP TABLE IF EXISTS trips;
        DROP TABLE IF EXISTS stop_times;
        DROP TABLE IF EXISTS calendar;
        DROP TABLE IF EXISTS calendar_dates;
        DROP TABLE IF EXISTS transfers;

        CREATE TABLE metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE agencies (
          agency_id TEXT PRIMARY KEY,
          agency_name TEXT NOT NULL,
          agency_url TEXT,
          agency_timezone TEXT,
          agency_lang TEXT,
          agency_phone TEXT
        );

        CREATE TABLE stops (
          stop_id TEXT PRIMARY KEY,
          stop_name TEXT NOT NULL,
          stop_search TEXT NOT NULL,
          stop_lat REAL,
          stop_lon REAL,
          location_type INTEGER DEFAULT 0,
          parent_station TEXT,
          zone_id TEXT,
          stop_code TEXT,
          wheelchair_boarding INTEGER
        );

        CREATE TABLE routes (
          route_id TEXT PRIMARY KEY,
          agency_id TEXT,
          agency_name TEXT,
          route_short_name TEXT,
          route_long_name TEXT,
          route_desc TEXT,
          route_type TEXT,
          route_mode TEXT NOT NULL,
          route_mode_label TEXT NOT NULL,
          route_color TEXT,
          route_text_color TEXT
        );

        CREATE TABLE trips (
          trip_id TEXT PRIMARY KEY,
          route_id TEXT NOT NULL,
          service_id TEXT NOT NULL,
          direction_id TEXT,
          trip_headsign TEXT,
          shape_id TEXT,
          wheelchair_accessible INTEGER,
          bikes_allowed INTEGER
        );

        CREATE TABLE stop_times (
          trip_id TEXT NOT NULL,
          stop_id TEXT NOT NULL,
          stop_sequence INTEGER NOT NULL,
          arrival_sec INTEGER,
          departure_sec INTEGER
        );

        CREATE TABLE calendar (
          service_id TEXT PRIMARY KEY,
          monday INTEGER,
          tuesday INTEGER,
          wednesday INTEGER,
          thursday INTEGER,
          friday INTEGER,
          saturday INTEGER,
          sunday INTEGER,
          start_date TEXT,
          end_date TEXT
        );

        CREATE TABLE calendar_dates (
          service_id TEXT NOT NULL,
          date TEXT NOT NULL,
          exception_type INTEGER NOT NULL
        );

        CREATE TABLE transfers (
          from_stop_id TEXT NOT NULL,
          to_stop_id TEXT NOT NULL,
          transfer_type INTEGER,
          min_transfer_time INTEGER
        );
        """
    )


def create_indexes(conn: sqlite3.Connection):
    conn.executescript(
        """
        CREATE INDEX idx_stops_search ON stops(stop_search);
        CREATE INDEX idx_stops_parent ON stops(parent_station);
        CREATE INDEX idx_stops_coords ON stops(stop_lat, stop_lon);
        CREATE INDEX idx_routes_mode ON routes(route_mode);
        CREATE INDEX idx_routes_agency ON routes(agency_id);
        CREATE INDEX idx_trips_route ON trips(route_id);
        CREATE INDEX idx_trips_service ON trips(service_id);
        CREATE INDEX idx_stop_times_stop_departure ON stop_times(stop_id, departure_sec);
        CREATE INDEX idx_stop_times_trip_stop ON stop_times(trip_id, stop_sequence);
        CREATE INDEX idx_calendar_dates_service ON calendar_dates(service_id, date);
        CREATE INDEX idx_calendar_dates_date ON calendar_dates(date);
        CREATE INDEX idx_transfers_from_stop ON transfers(from_stop_id);
        """
    )


def build_cache(source: str, output_path: Path):
    entries = read_source_entries(source)
    missing = [name for name in REQUIRED_GTFS_FILES if name not in entries]
    if missing:
        raise FileNotFoundError(f"ACT GTFS source is missing required files: {', '.join(missing)}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    conn = sqlite3.connect(output_path)
    create_schema(conn)

    agencies: dict[str, str] = {}
    for row in dict_reader_from_bytes(entries["agency.txt"]):
        agency_id = row.get("agency_id") or "transport-canberra"
        agency_name = row.get("agency_name") or "Transport Canberra"
        agencies[agency_id] = agency_name
        conn.execute(
            """
            INSERT INTO agencies (agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_phone)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                agency_id,
                agency_name,
                row.get("agency_url") or None,
                row.get("agency_timezone") or None,
                row.get("agency_lang") or None,
                row.get("agency_phone") or None,
            ),
        )

    for row in dict_reader_from_bytes(entries["stops.txt"]):
        searchable = " ".join(
            part.strip()
            for part in [
                row.get("stop_name") or "",
                row.get("stop_desc") or "",
                row.get("stop_code") or "",
                row.get("stop_id") or "",
            ]
            if part and part.strip()
        ).lower()
        conn.execute(
            """
            INSERT INTO stops (
              stop_id, stop_name, stop_search, stop_lat, stop_lon, location_type,
              parent_station, zone_id, stop_code, wheelchair_boarding
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["stop_id"],
                row.get("stop_name") or row["stop_id"],
                searchable,
                float(row["stop_lat"]) if row.get("stop_lat") else None,
                float(row["stop_lon"]) if row.get("stop_lon") else None,
                int(row.get("location_type") or 0),
                row.get("parent_station") or None,
                row.get("zone_id") or None,
                row.get("stop_code") or None,
                int(row["wheelchair_boarding"]) if row.get("wheelchair_boarding") else None,
            ),
        )

    for row in dict_reader_from_bytes(entries["routes.txt"]):
        route_mode, route_mode_label = normalize_mode(row.get("route_type") or "")
        agency_id = row.get("agency_id") or "transport-canberra"
        conn.execute(
            """
            INSERT INTO routes (
              route_id, agency_id, agency_name, route_short_name, route_long_name, route_desc,
              route_type, route_mode, route_mode_label, route_color, route_text_color
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["route_id"],
                agency_id,
                agencies.get(agency_id, "Transport Canberra"),
                row.get("route_short_name") or None,
                row.get("route_long_name") or None,
                row.get("route_desc") or None,
                row.get("route_type") or None,
                route_mode,
                route_mode_label,
                row.get("route_color") or None,
                row.get("route_text_color") or None,
            ),
        )

    for row in dict_reader_from_bytes(entries["trips.txt"]):
        conn.execute(
            """
            INSERT INTO trips (
              trip_id, route_id, service_id, direction_id, trip_headsign,
              shape_id, wheelchair_accessible, bikes_allowed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["trip_id"],
                row["route_id"],
                row["service_id"],
                row.get("direction_id") or None,
                row.get("trip_headsign") or None,
                row.get("shape_id") or None,
                int(row["wheelchair_accessible"]) if row.get("wheelchair_accessible") else None,
                int(row["bikes_allowed"]) if row.get("bikes_allowed") else None,
            ),
        )

    for index, row in enumerate(dict_reader_from_bytes(entries["stop_times.txt"]), start=1):
        conn.execute(
            """
            INSERT INTO stop_times (
              trip_id, stop_id, stop_sequence, arrival_sec, departure_sec
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                row["trip_id"],
                row["stop_id"],
                int(row["stop_sequence"]),
                parse_seconds(row.get("arrival_time") or ""),
                parse_seconds(row.get("departure_time") or ""),
            ),
        )
        if index % 20000 == 0:
            conn.commit()

    for row in dict_reader_from_bytes(entries["calendar.txt"]):
        conn.execute(
            """
            INSERT INTO calendar (
              service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["service_id"],
                int(row.get("monday") or 0),
                int(row.get("tuesday") or 0),
                int(row.get("wednesday") or 0),
                int(row.get("thursday") or 0),
                int(row.get("friday") or 0),
                int(row.get("saturday") or 0),
                int(row.get("sunday") or 0),
                row.get("start_date") or None,
                row.get("end_date") or None,
            ),
        )

    for row in dict_reader_from_bytes(entries["calendar_dates.txt"]):
        conn.execute(
            """
            INSERT INTO calendar_dates (service_id, date, exception_type)
            VALUES (?, ?, ?)
            """,
            (
                row["service_id"],
                row["date"],
                int(row.get("exception_type") or 1),
            ),
        )

    if "transfers.txt" in entries:
        for row in dict_reader_from_bytes(entries["transfers.txt"]):
            conn.execute(
                """
                INSERT INTO transfers (from_stop_id, to_stop_id, transfer_type, min_transfer_time)
                VALUES (?, ?, ?, ?)
                """,
                (
                    row["from_stop_id"],
                    row["to_stop_id"],
                    int(row["transfer_type"]) if row.get("transfer_type") else None,
                    int(row["min_transfer_time"]) if row.get("min_transfer_time") else None,
                ),
            )

    conn.executemany(
        "INSERT INTO metadata (key, value) VALUES (?, ?)",
        [
            ("source", source),
            ("built_at", str(int(time.time()))),
        ],
    )

    create_indexes(conn)
    conn.commit()
    conn.close()


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(DEFAULT_OUTPUT)
    build_cache(source, output)
    print(f"Built ACT GTFS cache: {output}")


if __name__ == "__main__":
    main()

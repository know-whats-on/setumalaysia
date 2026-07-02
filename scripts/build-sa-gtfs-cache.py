#!/usr/bin/env python3
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
    "TRANSPORT_SA_GTFS_SOURCE",
    "https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip",
)
DEFAULT_OUTPUT = os.environ.get(
    "TRANSPORT_SA_GTFS_CACHE_PATH",
    "/Users/rushi/Downloads/GHAR/supabase/functions/make-server-1d591b90/transport_sa_cache.sqlite",
)


def normalize_mode(route_type: str) -> tuple[str, str]:
    raw = (route_type or "").strip()
    if raw == "0":
        return ("light_rail", "Light Rail")
    if raw == "2":
        return ("train", "Train")
    if raw in {"3", "700", "701", "702", "712"}:
        return ("bus", "Bus")
    return ("bus", "Bus")


def read_source_bytes(source: str) -> bytes:
    if source.startswith("http://") or source.startswith("https://"):
        with urllib.request.urlopen(source, timeout=60) as response:
            return response.read()
    return Path(source).read_bytes()


def dict_reader_from_bytes(data: bytes):
    text_handle = io.TextIOWrapper(io.BytesIO(data), encoding="utf-8-sig", newline="")
    reader = csv.DictReader(text_handle, skipinitialspace=True)
    for row in reader:
        yield {
            str(key or "").strip(): (value.strip() if isinstance(value, str) else value)
            for key, value in row.items()
        }


def iter_gtfs_rows(source_bytes: bytes, filename: str):
    with zipfile.ZipFile(io.BytesIO(source_bytes)) as archive:
        yield from dict_reader_from_bytes(archive.read(filename))


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
          agency_lang TEXT
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
          stop_code TEXT
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
          wheelchair_accessible INTEGER
        );

        CREATE TABLE stop_times (
          trip_id TEXT NOT NULL,
          stop_id TEXT NOT NULL,
          stop_sequence INTEGER NOT NULL,
          arrival_sec INTEGER,
          departure_sec INTEGER,
          pickup_type TEXT,
          drop_off_type TEXT,
          PRIMARY KEY (trip_id, stop_sequence)
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
        CREATE INDEX idx_trips_route ON trips(route_id);
        CREATE INDEX idx_trips_service ON trips(service_id);
        CREATE INDEX idx_stop_times_stop_departure ON stop_times(stop_id, departure_sec);
        CREATE INDEX idx_stop_times_stop_arrival ON stop_times(stop_id, arrival_sec);
        CREATE INDEX idx_stop_times_trip_stop ON stop_times(trip_id, stop_sequence);
        CREATE INDEX idx_calendar_dates_service ON calendar_dates(service_id, date);
        CREATE INDEX idx_calendar_dates_date ON calendar_dates(date);
        CREATE INDEX idx_transfers_from_stop ON transfers(from_stop_id);
        """
    )


def build_cache(source: str, output_path: Path):
    source_bytes = read_source_bytes(source)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    conn = sqlite3.connect(output_path)
    create_schema(conn)

    agencies = {}
    for row in iter_gtfs_rows(source_bytes, "agency.txt"):
        agency_id = row.get("agency_id") or "adelaide-metro"
        agencies[agency_id] = row["agency_name"]
        conn.execute(
            """
            INSERT INTO agencies (agency_id, agency_name, agency_url, agency_timezone, agency_lang)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                agency_id,
                row["agency_name"],
                row.get("agency_url") or None,
                row.get("agency_timezone") or None,
                row.get("agency_lang") or None,
            ),
        )

    for row in iter_gtfs_rows(source_bytes, "stops.txt"):
        searchable = " ".join(
            part.strip()
            for part in [
                row.get("stop_name") or "",
                row.get("stop_desc") or "",
                row.get("stop_code") or "",
            ]
            if part and part.strip()
        ).lower()
        conn.execute(
            """
            INSERT INTO stops (
              stop_id, stop_name, stop_search, stop_lat, stop_lon, location_type,
              parent_station, zone_id, stop_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["stop_id"],
                row["stop_name"],
                searchable,
                float(row["stop_lat"]) if row.get("stop_lat") else None,
                float(row["stop_lon"]) if row.get("stop_lon") else None,
                int(row.get("location_type") or 0),
                row.get("parent_station") or None,
                row.get("zone_id") or None,
                row.get("stop_code") or None,
            ),
        )

    for row in iter_gtfs_rows(source_bytes, "routes.txt"):
        route_mode, route_mode_label = normalize_mode(row.get("route_type") or "")
        agency_id = row.get("agency_id") or "adelaide-metro"
        conn.execute(
            """
            INSERT INTO routes (
              route_id, agency_id, agency_name, route_short_name, route_long_name,
              route_desc, route_type, route_mode, route_mode_label, route_color, route_text_color
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["route_id"],
                agency_id,
                agencies.get(agency_id, "Adelaide Metro"),
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

    for row in iter_gtfs_rows(source_bytes, "trips.txt"):
        conn.execute(
            """
            INSERT INTO trips (
              trip_id, route_id, service_id, direction_id, trip_headsign, shape_id, wheelchair_accessible
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["trip_id"],
                row["route_id"],
                row["service_id"],
                row.get("direction_id") or None,
                row.get("trip_headsign") or None,
                row.get("shape_id") or None,
                int(row.get("wheelchair_accessible") or 0) if row.get("wheelchair_accessible") else None,
            ),
        )

    for index, row in enumerate(iter_gtfs_rows(source_bytes, "stop_times.txt"), start=1):
        conn.execute(
            """
            INSERT INTO stop_times (
              trip_id, stop_id, stop_sequence, arrival_sec, departure_sec, pickup_type, drop_off_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["trip_id"],
                row["stop_id"],
                int(row["stop_sequence"]),
                parse_seconds(row.get("arrival_time") or ""),
                parse_seconds(row.get("departure_time") or ""),
                row.get("pickup_type") or None,
                row.get("drop_off_type") or None,
            ),
        )
        if index % 100000 == 0:
            conn.commit()

    for row in iter_gtfs_rows(source_bytes, "calendar.txt"):
        conn.execute(
            """
            INSERT INTO calendar (
              service_id, monday, tuesday, wednesday, thursday,
              friday, saturday, sunday, start_date, end_date
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

    for row in iter_gtfs_rows(source_bytes, "calendar_dates.txt"):
        conn.execute(
            "INSERT INTO calendar_dates (service_id, date, exception_type) VALUES (?, ?, ?)",
            (row["service_id"], row["date"], int(row["exception_type"])),
        )

    for row in iter_gtfs_rows(source_bytes, "transfers.txt"):
        conn.execute(
            "INSERT INTO transfers (from_stop_id, to_stop_id, transfer_type, min_transfer_time) VALUES (?, ?, ?, ?)",
            (
                row["from_stop_id"],
                row["to_stop_id"],
                int(row.get("transfer_type") or 0),
                int(row.get("min_transfer_time") or 0),
            ),
        )

    create_indexes(conn)
    conn.execute("INSERT INTO metadata (key, value) VALUES (?, ?)", ("source", source))
    conn.execute("INSERT INTO metadata (key, value) VALUES (?, ?)", ("built_at", str(int(time.time()))))
    conn.commit()
    conn.close()


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(DEFAULT_OUTPUT)
    build_cache(source, output)
    print(f"Built Adelaide Metro GTFS cache at {output}")


if __name__ == "__main__":
    main()

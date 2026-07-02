#!/usr/bin/env python3
import csv
import io
import os
import sqlite3
import sys
import zipfile
from pathlib import Path


DEFAULT_SOURCE = os.environ.get("TRANSPORT_WA_GTFS_SOURCE", "/Users/rushi/Downloads/WA_PT")
DEFAULT_OUTPUT = os.environ.get(
    "TRANSPORT_WA_GTFS_CACHE_PATH",
    "/Users/rushi/Downloads/GHAR/supabase/functions/make-server-1d591b90/transport_wa_cache.sqlite",
)


def normalize_mode(route_type: str) -> tuple[str, str]:
    raw = (route_type or "").strip()
    if raw == "2":
        return ("train", "Train")
    if raw == "4":
        return ("ferry", "Ferry")
    return ("bus", "Bus")


def dict_reader_from_bytes(data: bytes):
    text_handle = io.TextIOWrapper(io.BytesIO(data), encoding="utf-8-sig", newline="")
    reader = csv.DictReader(text_handle, skipinitialspace=True)
    for row in reader:
        yield {str(key or "").strip(): (value.strip() if isinstance(value, str) else value) for key, value in row.items()}


def iter_gtfs_rows(source_path: Path, filename: str):
    if source_path.is_dir():
        with (source_path / filename).open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, skipinitialspace=True)
            for row in reader:
                yield {str(key or "").strip(): (value.strip() if isinstance(value, str) else value) for key, value in row.items()}
        return

    with zipfile.ZipFile(source_path) as archive:
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
        PRAGMA foreign_keys = OFF;

        DROP TABLE IF EXISTS metadata;
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

        CREATE TABLE stops (
          stop_pk INTEGER PRIMARY KEY,
          stop_id TEXT NOT NULL UNIQUE,
          stop_name TEXT NOT NULL,
          stop_search TEXT NOT NULL,
          stop_lat REAL,
          stop_lon REAL,
          location_type INTEGER DEFAULT 0,
          parent_stop_pk INTEGER,
          supported_modes TEXT
        );

        CREATE TABLE routes (
          route_pk INTEGER PRIMARY KEY,
          route_id TEXT NOT NULL UNIQUE,
          agency_name TEXT,
          route_short_name TEXT,
          route_long_name TEXT,
          route_mode TEXT NOT NULL,
          route_mode_label TEXT NOT NULL
        );

        CREATE TABLE trips (
          trip_pk INTEGER PRIMARY KEY,
          trip_id TEXT NOT NULL UNIQUE,
          route_pk INTEGER NOT NULL,
          service_id TEXT NOT NULL,
          direction_id TEXT,
          trip_headsign TEXT
        );

        CREATE TABLE stop_times (
          trip_pk INTEGER NOT NULL,
          stop_pk INTEGER NOT NULL,
          stop_sequence INTEGER NOT NULL,
          arrival_sec INTEGER,
          departure_sec INTEGER,
          PRIMARY KEY (trip_pk, stop_sequence)
        ) WITHOUT ROWID;

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
          exception_type INTEGER NOT NULL,
          PRIMARY KEY (service_id, date, exception_type)
        ) WITHOUT ROWID;

        CREATE TABLE transfers (
          from_stop_pk INTEGER NOT NULL,
          to_stop_pk INTEGER NOT NULL,
          min_transfer_time INTEGER,
          PRIMARY KEY (from_stop_pk, to_stop_pk, min_transfer_time)
        ) WITHOUT ROWID;
        """
    )


def create_indexes(conn: sqlite3.Connection):
    conn.executescript(
        """
        CREATE INDEX idx_stops_search ON stops(stop_search);
        CREATE INDEX idx_stops_parent ON stops(parent_stop_pk);
        CREATE INDEX idx_stops_coords ON stops(stop_lat, stop_lon);
        CREATE INDEX idx_routes_mode ON routes(route_mode);
        CREATE INDEX idx_trips_route ON trips(route_pk);
        CREATE INDEX idx_trips_service ON trips(service_id);
        CREATE INDEX idx_stop_times_stop_departure ON stop_times(stop_pk, departure_sec);
        CREATE INDEX idx_stop_times_stop_arrival ON stop_times(stop_pk, arrival_sec);
        CREATE INDEX idx_calendar_dates_service ON calendar_dates(service_id, date);
        CREATE INDEX idx_calendar_dates_date ON calendar_dates(date);
        CREATE INDEX idx_transfers_from_stop ON transfers(from_stop_pk);
        """
    )


def build_cache(source_path: Path, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    conn = sqlite3.connect(output_path)
    create_schema(conn)

    agencies = {}
    for row in iter_gtfs_rows(source_path, "agency.txt"):
        agencies[row["agency_id"]] = row["agency_name"]
    stop_pk_by_id = {}
    stop_rows = list(iter_gtfs_rows(source_path, "stops.txt"))
    for row in stop_rows:
        cursor = conn.execute(
            """
            INSERT INTO stops (
              stop_id, stop_name, stop_search, stop_lat, stop_lon, location_type,
              parent_stop_pk, supported_modes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                row["stop_id"],
                row["stop_name"],
                (row.get("stop_name") or "").lower(),
                float(row["stop_lat"]) if row.get("stop_lat") else None,
                float(row["stop_lon"]) if row.get("stop_lon") else None,
                int(row.get("location_type") or 0),
                None,
                row.get("supported_modes") or None,
            ),
        )
        stop_pk_by_id[row["stop_id"]] = cursor.lastrowid

    parent_updates = [
        (stop_pk_by_id.get(row.get("parent_station") or ""), stop_pk_by_id[row["stop_id"]])
        for row in stop_rows
        if row.get("parent_station") and stop_pk_by_id.get(row.get("parent_station") or "")
    ]
    if parent_updates:
        conn.executemany("UPDATE stops SET parent_stop_pk = ? WHERE stop_pk = ?", parent_updates)

    route_pk_by_id = {}
    for row in iter_gtfs_rows(source_path, "routes.txt"):
        route_mode, route_mode_label = normalize_mode(row.get("route_type") or "")
        cursor = conn.execute(
            """
            INSERT INTO routes (
              route_id, agency_name, route_short_name, route_long_name, route_mode, route_mode_label
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                row["route_id"],
                agencies.get(row.get("agency_id") or "", ""),
                row.get("route_short_name") or None,
                row.get("route_long_name") or None,
                route_mode,
                route_mode_label,
            ),
        )
        route_pk_by_id[row["route_id"]] = cursor.lastrowid

    trip_pk_by_id = {}
    for row in iter_gtfs_rows(source_path, "trips.txt"):
        route_pk = route_pk_by_id.get(row["route_id"])
        if route_pk is None:
            continue
        cursor = conn.execute(
            """
            INSERT INTO trips (trip_id, route_pk, service_id, direction_id, trip_headsign)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                row["trip_id"],
                route_pk,
                row["service_id"],
                row.get("direction_id") or None,
                row.get("trip_headsign") or None,
            ),
        )
        trip_pk_by_id[row["trip_id"]] = cursor.lastrowid

    for index, row in enumerate(iter_gtfs_rows(source_path, "stop_times.txt"), start=1):
        trip_pk = trip_pk_by_id.get(row["trip_id"])
        stop_pk = stop_pk_by_id.get(row["stop_id"])
        if trip_pk is None or stop_pk is None:
            continue
        conn.execute(
            """
            INSERT INTO stop_times (
              trip_pk, stop_pk, stop_sequence, arrival_sec, departure_sec
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                trip_pk,
                stop_pk,
                int(row["stop_sequence"]),
                parse_seconds(row.get("arrival_time") or ""),
                parse_seconds(row.get("departure_time") or ""),
            ),
        )
        if index % 100000 == 0:
            conn.commit()

    for row in iter_gtfs_rows(source_path, "calendar.txt"):
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

    for row in iter_gtfs_rows(source_path, "calendar_dates.txt"):
        conn.execute(
            "INSERT INTO calendar_dates (service_id, date, exception_type) VALUES (?, ?, ?)",
            (row["service_id"], row["date"], int(row["exception_type"])),
        )

    for row in iter_gtfs_rows(source_path, "transfers.txt"):
        from_stop_pk = stop_pk_by_id.get(row["from_stop_id"])
        to_stop_pk = stop_pk_by_id.get(row["to_stop_id"])
        if from_stop_pk is None or to_stop_pk is None:
            continue
        conn.execute(
            "INSERT INTO transfers (from_stop_pk, to_stop_pk, min_transfer_time) VALUES (?, ?, ?)",
            (
                from_stop_pk,
                to_stop_pk,
                int(row.get("min_transfer_time") or 0),
            ),
        )

    create_indexes(conn)
    conn.execute("INSERT INTO metadata (key, value) VALUES (?, ?)", ("source_path", str(source_path)))
    conn.execute("INSERT INTO metadata (key, value) VALUES (?, ?)", ("built_at", str(int(os.path.getmtime(source_path) if source_path.exists() else 0))))
    conn.commit()
    conn.execute("VACUUM")
    conn.close()


def main():
    source_path = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE)
    output_path = Path(sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT)

    if not source_path.exists():
        print(f"WA GTFS source not found at {source_path}", file=sys.stderr)
        sys.exit(1)

    build_cache(source_path, output_path)
    print(output_path)


if __name__ == "__main__":
    main()

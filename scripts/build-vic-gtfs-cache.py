#!/usr/bin/env python3
import csv
import io
import os
import sqlite3
import sys
import time
import zipfile
from pathlib import Path


DEFAULT_SOURCE = os.environ.get("TRANSPORT_VIC_GTFS_SOURCE", "/Users/rushi/Downloads/gtfs.zip")
DEFAULT_OUTPUT = os.environ.get("TRANSPORT_VIC_GTFS_CACHE_PATH", "/Users/rushi/Downloads/gtfs_vic_cache.sqlite")


def namespace_id(feed_key: str, raw_value: str) -> str:
    raw = (raw_value or "").strip()
    return f"{feed_key}::{raw}" if raw else ""


def normalize_mode(route_type: str, feed_key: str, route_short_name: str, route_long_name: str) -> tuple[str, str]:
    raw_type = (route_type or "").strip()
    text = f"{route_short_name} {route_long_name}".lower()
    if raw_type in {"0", "900"}:
        return ("light_rail", "Tram")
    if raw_type in {"1", "2", "100", "101", "102"}:
        return ("train", "Train")
    if raw_type in {"3", "700", "701", "702"}:
        if "airport" in text or feed_key == "11":
            return ("bus", "Bus")
        return ("bus", "Bus")
    if raw_type in {"4", "1200"}:
        return ("ferry", "Ferry")
    if raw_type in {"200", "201", "202", "204", "205", "206"}:
        return ("coach", "Coach")
    if raw_type == "400":
        return ("metro", "Metro")
    return ("other", "Transit")


def dict_reader_from_zip(inner_zip: zipfile.ZipFile, filename: str):
    with inner_zip.open(filename) as handle:
        text_handle = io.TextIOWrapper(handle, encoding="utf-8-sig", newline="")
        yield from csv.DictReader(text_handle)


def discover_inner_archives(source_path: Path):
    if source_path.is_dir():
        for child in sorted(source_path.iterdir()):
            zip_path = child / "google_transit.zip"
            if zip_path.exists():
                yield child.name, zip_path.read_bytes()
        return

    with zipfile.ZipFile(source_path) as outer_zip:
        for name in sorted(outer_zip.namelist()):
            if not name.endswith("google_transit.zip"):
                continue
            feed_key = Path(name).parts[0]
            yield feed_key, outer_zip.read(name)


def create_schema(conn: sqlite3.Connection):
    conn.executescript(
        """
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA temp_store = MEMORY;

        DROP TABLE IF EXISTS metadata;
        DROP TABLE IF EXISTS feed_map;
        DROP TABLE IF EXISTS stops;
        DROP TABLE IF EXISTS routes;
        DROP TABLE IF EXISTS trips;
        DROP TABLE IF EXISTS stop_times;
        DROP TABLE IF EXISTS calendar;
        DROP TABLE IF EXISTS calendar_dates;
        DROP TABLE IF EXISTS transfers;
        DROP TABLE IF EXISTS shapes;
        DROP TABLE IF EXISTS levels;
        DROP TABLE IF EXISTS pathways;

        CREATE TABLE metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE feed_map (
          feed_key TEXT PRIMARY KEY,
          feed_name TEXT NOT NULL,
          route_mode TEXT NOT NULL,
          realtime_group TEXT NOT NULL
        );

        CREATE TABLE stops (
          stop_id TEXT PRIMARY KEY,
          raw_stop_id TEXT NOT NULL,
          feed_key TEXT NOT NULL,
          stop_name TEXT NOT NULL,
          stop_search TEXT NOT NULL,
          stop_lat REAL,
          stop_lon REAL,
          location_type INTEGER DEFAULT 0,
          parent_station TEXT,
          zone_id TEXT,
          wheelchair_boarding INTEGER,
          platform_code TEXT
        );

        CREATE TABLE routes (
          route_id TEXT PRIMARY KEY,
          raw_route_id TEXT NOT NULL,
          feed_key TEXT NOT NULL,
          route_short_name TEXT,
          route_long_name TEXT,
          route_type TEXT,
          route_mode TEXT NOT NULL,
          route_mode_label TEXT NOT NULL,
          route_color TEXT,
          route_text_color TEXT
        );

        CREATE TABLE trips (
          trip_id TEXT PRIMARY KEY,
          raw_trip_id TEXT NOT NULL,
          feed_key TEXT NOT NULL,
          route_id TEXT NOT NULL,
          service_id TEXT NOT NULL,
          trip_headsign TEXT,
          direction_id TEXT,
          shape_id TEXT,
          wheelchair_accessible INTEGER,
          bikes_allowed INTEGER
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

        CREATE TABLE shapes (
          shape_id TEXT NOT NULL,
          shape_pt_lat REAL,
          shape_pt_lon REAL,
          shape_pt_sequence INTEGER
        );

        CREATE TABLE levels (
          level_id TEXT PRIMARY KEY,
          level_index REAL,
          level_name TEXT
        );

        CREATE TABLE pathways (
          pathway_id TEXT PRIMARY KEY,
          from_stop_id TEXT,
          to_stop_id TEXT,
          pathway_mode INTEGER,
          is_bidirectional INTEGER,
          traversal_time INTEGER
        );
        """
    )


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


def feed_metadata(feed_key: str):
    mapping = {
        "1": ("V/Line Rail", "train", "vline"),
        "2": ("Metro Train", "metro", "metro_train"),
        "3": ("Yarra Trams", "light_rail", "tram"),
        "4": ("Metro Bus", "bus", "bus"),
        "5": ("V/Line Coach", "coach", "vline"),
        "6": ("Regional Bus", "bus", "bus"),
        "10": ("Interstate Rail", "train", "none"),
        "11": ("Airport Bus", "bus", "bus"),
    }
    return mapping.get(feed_key, (f"Feed {feed_key}", "other", "none"))


def build_cache(source_path: Path, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    conn = sqlite3.connect(output_path)
    create_schema(conn)

    stop_count = 0
    route_count = 0
    trip_count = 0
    stop_time_count = 0

    with conn:
        for feed_key, zip_bytes in discover_inner_archives(source_path):
            feed_name, route_mode, realtime_group = feed_metadata(feed_key)
            conn.execute(
                "INSERT INTO feed_map (feed_key, feed_name, route_mode, realtime_group) VALUES (?, ?, ?, ?)",
                (feed_key, feed_name, route_mode, realtime_group),
            )

            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as inner_zip:
                stop_rows = []
                for row in dict_reader_from_zip(inner_zip, "stops.txt"):
                    stop_id = namespace_id(feed_key, row.get("stop_id", ""))
                    parent_station = namespace_id(feed_key, row.get("parent_station", ""))
                    stop_rows.append(
                        (
                            stop_id,
                            (row.get("stop_id") or "").strip(),
                            feed_key,
                            (row.get("stop_name") or "").strip(),
                            ((row.get("stop_name") or "") + " " + (row.get("stop_desc") or "")).strip().lower(),
                            row.get("stop_lat") or None,
                            row.get("stop_lon") or None,
                            int(row.get("location_type") or 0),
                            parent_station or None,
                            (row.get("zone_id") or "").strip() or None,
                            int(row.get("wheelchair_boarding") or 0) if (row.get("wheelchair_boarding") or "").strip() else None,
                            (row.get("platform_code") or "").strip() or None,
                        )
                    )
                conn.executemany(
                    """
                    INSERT OR REPLACE INTO stops (
                      stop_id, raw_stop_id, feed_key, stop_name, stop_search, stop_lat, stop_lon,
                      location_type, parent_station, zone_id, wheelchair_boarding, platform_code
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    stop_rows,
                )
                stop_count += len(stop_rows)

                route_rows = []
                for row in dict_reader_from_zip(inner_zip, "routes.txt"):
                    route_id = namespace_id(feed_key, row.get("route_id", ""))
                    route_mode, route_mode_label = normalize_mode(
                        row.get("route_type", ""),
                        feed_key,
                        row.get("route_short_name", ""),
                        row.get("route_long_name", ""),
                    )
                    route_rows.append(
                        (
                            route_id,
                            (row.get("route_id") or "").strip(),
                            feed_key,
                            (row.get("route_short_name") or "").strip(),
                            (row.get("route_long_name") or "").strip(),
                            (row.get("route_type") or "").strip(),
                            route_mode,
                            route_mode_label,
                            (row.get("route_color") or "").strip(),
                            (row.get("route_text_color") or "").strip(),
                        )
                    )
                conn.executemany(
                    """
                    INSERT OR REPLACE INTO routes (
                      route_id, raw_route_id, feed_key, route_short_name, route_long_name, route_type,
                      route_mode, route_mode_label, route_color, route_text_color
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    route_rows,
                )
                route_count += len(route_rows)

                trip_rows = []
                for row in dict_reader_from_zip(inner_zip, "trips.txt"):
                    trip_rows.append(
                        (
                            namespace_id(feed_key, row.get("trip_id", "")),
                            (row.get("trip_id") or "").strip(),
                            feed_key,
                            namespace_id(feed_key, row.get("route_id", "")),
                            namespace_id(feed_key, row.get("service_id", "")),
                            (row.get("trip_headsign") or "").strip(),
                            (row.get("direction_id") or "").strip() or None,
                            namespace_id(feed_key, row.get("shape_id", "")) or None,
                            int(row.get("wheelchair_accessible") or 0) if (row.get("wheelchair_accessible") or "").strip() else None,
                            int(row.get("bikes_allowed") or 0) if (row.get("bikes_allowed") or "").strip() else None,
                        )
                    )
                conn.executemany(
                    """
                    INSERT OR REPLACE INTO trips (
                      trip_id, raw_trip_id, feed_key, route_id, service_id, trip_headsign,
                      direction_id, shape_id, wheelchair_accessible, bikes_allowed
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    trip_rows,
                )
                trip_count += len(trip_rows)

                calendar_rows = []
                for row in dict_reader_from_zip(inner_zip, "calendar.txt"):
                    calendar_rows.append(
                        (
                            namespace_id(feed_key, row.get("service_id", "")),
                            int(row.get("monday") or 0),
                            int(row.get("tuesday") or 0),
                            int(row.get("wednesday") or 0),
                            int(row.get("thursday") or 0),
                            int(row.get("friday") or 0),
                            int(row.get("saturday") or 0),
                            int(row.get("sunday") or 0),
                            (row.get("start_date") or "").strip(),
                            (row.get("end_date") or "").strip(),
                        )
                    )
                conn.executemany(
                    """
                    INSERT OR REPLACE INTO calendar (
                      service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday,
                      start_date, end_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    calendar_rows,
                )

                calendar_date_rows = []
                for row in dict_reader_from_zip(inner_zip, "calendar_dates.txt"):
                    calendar_date_rows.append(
                        (
                            namespace_id(feed_key, row.get("service_id", "")),
                            (row.get("date") or "").strip(),
                            int(row.get("exception_type") or 0),
                        )
                    )
                conn.executemany(
                    "INSERT OR REPLACE INTO calendar_dates (service_id, date, exception_type) VALUES (?, ?, ?)",
                    calendar_date_rows,
                )

                transfer_rows = []
                for row in dict_reader_from_zip(inner_zip, "transfers.txt"):
                    transfer_rows.append(
                        (
                            namespace_id(feed_key, row.get("from_stop_id", "")),
                            namespace_id(feed_key, row.get("to_stop_id", "")),
                            int(row.get("transfer_type") or 0) if (row.get("transfer_type") or "").strip() else None,
                            int(row.get("min_transfer_time") or 0) if (row.get("min_transfer_time") or "").strip() else None,
                        )
                    )
                conn.executemany(
                    "INSERT OR REPLACE INTO transfers (from_stop_id, to_stop_id, transfer_type, min_transfer_time) VALUES (?, ?, ?, ?)",
                    transfer_rows,
                )

                shape_rows = []
                for row in dict_reader_from_zip(inner_zip, "shapes.txt"):
                    shape_rows.append(
                        (
                            namespace_id(feed_key, row.get("shape_id", "")),
                            row.get("shape_pt_lat") or None,
                            row.get("shape_pt_lon") or None,
                            int(row.get("shape_pt_sequence") or 0) if (row.get("shape_pt_sequence") or "").strip() else None,
                        )
                    )
                conn.executemany(
                    "INSERT OR REPLACE INTO shapes (shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence) VALUES (?, ?, ?, ?)",
                    shape_rows,
                )

                level_rows = []
                for row in dict_reader_from_zip(inner_zip, "levels.txt"):
                    level_rows.append(
                        (
                            namespace_id(feed_key, row.get("level_id", "")),
                            float(row.get("level_index") or 0) if (row.get("level_index") or "").strip() else None,
                            (row.get("level_name") or "").strip() or None,
                        )
                    )
                conn.executemany(
                    "INSERT OR REPLACE INTO levels (level_id, level_index, level_name) VALUES (?, ?, ?)",
                    level_rows,
                )

                pathway_rows = []
                for row in dict_reader_from_zip(inner_zip, "pathways.txt"):
                    pathway_rows.append(
                        (
                            namespace_id(feed_key, row.get("pathway_id", "")),
                            namespace_id(feed_key, row.get("from_stop_id", "")),
                            namespace_id(feed_key, row.get("to_stop_id", "")),
                            int(row.get("pathway_mode") or 0) if (row.get("pathway_mode") or "").strip() else None,
                            int(row.get("is_bidirectional") or 0) if (row.get("is_bidirectional") or "").strip() else None,
                            int(row.get("traversal_time") or 0) if (row.get("traversal_time") or "").strip() else None,
                        )
                    )
                conn.executemany(
                    """
                    INSERT OR REPLACE INTO pathways (
                      pathway_id, from_stop_id, to_stop_id, pathway_mode, is_bidirectional, traversal_time
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    pathway_rows,
                )

                stop_time_buffer = []
                insert_sql = """
                    INSERT OR REPLACE INTO stop_times (
                      trip_id, stop_id, stop_sequence, arrival_sec, departure_sec, pickup_type, drop_off_type
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                for row in dict_reader_from_zip(inner_zip, "stop_times.txt"):
                    stop_time_buffer.append(
                        (
                            namespace_id(feed_key, row.get("trip_id", "")),
                            namespace_id(feed_key, row.get("stop_id", "")),
                            int(row.get("stop_sequence") or 0),
                            parse_seconds(row.get("arrival_time", "")),
                            parse_seconds(row.get("departure_time", "")),
                            (row.get("pickup_type") or "").strip() or None,
                            (row.get("drop_off_type") or "").strip() or None,
                        )
                    )
                    if len(stop_time_buffer) >= 50000:
                        conn.executemany(insert_sql, stop_time_buffer)
                        stop_time_count += len(stop_time_buffer)
                        stop_time_buffer.clear()
                if stop_time_buffer:
                    conn.executemany(insert_sql, stop_time_buffer)
                    stop_time_count += len(stop_time_buffer)

    with conn:
        conn.executescript(
            """
            CREATE INDEX idx_stops_search ON stops (stop_search);
            CREATE INDEX idx_stops_parent ON stops (parent_station);
            CREATE INDEX idx_stop_times_stop_departure ON stop_times (stop_id, departure_sec);
            CREATE INDEX idx_stop_times_trip_sequence ON stop_times (trip_id, stop_sequence);
            CREATE INDEX idx_trips_route ON trips (route_id);
            CREATE INDEX idx_trips_service ON trips (service_id);
            CREATE INDEX idx_calendar_dates_date ON calendar_dates (date, service_id);
            CREATE INDEX idx_transfers_from_to ON transfers (from_stop_id, to_stop_id);
            """
        )
        source_mtime = str(int(source_path.stat().st_mtime))
        generated_at = str(int(time.time()))
        metadata_rows = [
            ("source_path", str(source_path)),
            ("source_mtime", source_mtime),
            ("generated_at", generated_at),
            ("stop_count", str(stop_count)),
            ("route_count", str(route_count)),
            ("trip_count", str(trip_count)),
            ("stop_time_count", str(stop_time_count)),
        ]
        conn.executemany("INSERT INTO metadata (key, value) VALUES (?, ?)", metadata_rows)

    conn.close()
    print(
        f"Built Victoria GTFS cache at {output_path} "
        f"(stops={stop_count}, routes={route_count}, trips={trip_count}, stop_times={stop_time_count})"
    )


def main():
    source_arg = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(DEFAULT_SOURCE)
    output_arg = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(DEFAULT_OUTPUT)
    build_cache(source_arg, output_arg)


if __name__ == "__main__":
    main()

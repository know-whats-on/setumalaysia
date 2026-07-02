#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";
import {
  applyExistingProfilePolicy,
  formatMigrationReport,
  prepareFirebaseUsersMigration,
} from "./firebase-migration-lib.mjs";

const DEFAULT_INPUT = "keys/firebase-migration/legacy-users.json";
const DEFAULT_FIRESTORE_INPUT = "keys/firebase-migration/legacy-firestore-profiles.json";
const DEFAULT_BACKUP_DIR = "keys/firebase-migration";
const TABLE_NAME = "kv_store_1d591b90";
const READ_CHUNK_SIZE = 75;
const WRITE_CHUNK_SIZE = 500;

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    firestoreInput: "",
    projectId: process.env.OLD_FIREBASE_PROJECT_ID || "",
    supabaseUrl: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    appVariant: "all",
    backupDir: DEFAULT_BACKUP_DIR,
    execute: false,
    includeDisabled: false,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      return value;
    };

    if (arg === "--input") args.input = readValue();
    else if (arg === "--firestore-input") args.firestoreInput = readValue();
    else if (arg === "--project" || arg === "--project-id") args.projectId = readValue();
    else if (arg === "--supabase-url") args.supabaseUrl = readValue();
    else if (arg === "--service-role-key") args.serviceRoleKey = readValue();
    else if (arg === "--app-variant") args.appVariant = readValue();
    else if (arg === "--backup-dir") args.backupDir = readValue();
    else if (arg === "--limit") args.limit = Number(readValue());
    else if (arg === "--execute") args.execute = true;
    else if (arg === "--include-disabled") args.includeDisabled = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/migrate-firebase-users-to-supabase.mjs --input ${DEFAULT_INPUT} --project OLD_FIREBASE_PROJECT_ID

Dry-run is the default. Add --execute to write rows to Supabase.

Options:
  --input <path>              Firebase auth:export JSON file
  --firestore-input <path>    Optional Firestore profile JSON export (${DEFAULT_FIRESTORE_INPUT})
  --project <id>              Old Firebase project id for legacy metadata
  --supabase-url <url>        Supabase project URL, or SUPABASE_URL
  --service-role-key <key>    Supabase service role key, or SUPABASE_SERVICE_ROLE_KEY
  --app-variant <variant>     all, ghar, burb_mate, setu_china, or jom_settle (default: all)
  --backup-dir <path>         Directory for execute backups (default: ${DEFAULT_BACKUP_DIR})
  --limit <n>                 Only prepare the first n importable users
  --include-disabled          Include disabled Firebase Auth users
  --execute                   Actually upsert Supabase KV rows
`);
}

function requireSupabaseConfig(args) {
  if (!args.supabaseUrl || !args.serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase profile checks and writes.");
  }
}

function normalizeSupabaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function escapePostgrestInValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function supabaseRequest(args, path, init = {}) {
  const url = `${normalizeSupabaseUrl(args.supabaseUrl)}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: args.serviceRoleKey,
      Authorization: `Bearer ${args.serviceRoleKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Supabase request failed (${response.status}): ${body || response.statusText}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function fetchExistingProfiles(args, keys) {
  if (!keys.length) return new Map();
  const existing = new Map();
  for (const chunk of chunkArray(keys, READ_CHUNK_SIZE)) {
    const inFilter = `in.(${chunk.map((key) => `"${escapePostgrestInValue(key)}"`).join(",")})`;
    const rows = await supabaseRequest(
      args,
      `${TABLE_NAME}?select=key,value&key=${encodeURIComponent(inFilter)}`,
    );
    for (const row of rows || []) {
      existing.set(row.key, row);
    }
  }
  return existing;
}

async function upsertRows(args, rows) {
  let written = 0;
  for (const chunk of chunkArray(rows, WRITE_CHUNK_SIZE)) {
    await supabaseRequest(args, `${TABLE_NAME}?on_conflict=key`, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(chunk),
    });
    written += chunk.length;
  }
  return written;
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeAffectedProfilesBackup(args, rows, existingByKey) {
  await fs.mkdir(args.backupDir, { recursive: true });
  const backupPath = `${args.backupDir.replace(/\/+$/, "")}/supabase-profile-backup-${backupTimestamp()}.json`;
  const payload = {
    created_at: new Date().toISOString(),
    table: TABLE_NAME,
    row_count: rows.length,
    rows: rows.map((row) => ({
      key: row.key,
      existing: existingByKey.get(row.key) || null,
      next: row,
    })),
  };
  await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), "utf8");
  return backupPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const raw = JSON.parse(await fs.readFile(args.input, "utf8"));
  let firestoreProfiles = null;
  if (args.firestoreInput) {
    firestoreProfiles = JSON.parse(await fs.readFile(args.firestoreInput, "utf8"));
  }
  const prepared = prepareFirebaseUsersMigration(raw, {
    projectId: args.projectId,
    appVariant: args.appVariant,
    includeDisabled: args.includeDisabled,
    limit: args.limit,
    firestoreProfiles,
  });

  const shouldCheckExisting = Boolean(args.supabaseUrl && args.serviceRoleKey);
  if (args.execute || shouldCheckExisting) {
    requireSupabaseConfig(args);
  }

  let existingReport = null;
  let existing = new Map();
  let rows = prepared.records.map((record) => ({ key: record.key, value: record.profile }));
  if (shouldCheckExisting) {
    existing = await fetchExistingProfiles(args, prepared.records.map((record) => record.key));
    const policy = applyExistingProfilePolicy(prepared.records, existing);
    rows = policy.rows;
    existingReport = policy.report;
  }

  let written = 0;
  let backupPath = "";
  if (args.execute) {
    backupPath = await writeAffectedProfilesBackup(args, rows, existing);
    written = await upsertRows(args, rows);
  }

  console.log(formatMigrationReport({
    parseReport: prepared.report,
    existingReport,
    skipped: prepared.skipped,
    dryRun: !args.execute,
    existingChecked: shouldCheckExisting,
  }));

  if (args.execute) {
    console.log(`Backup written: ${backupPath}`);
    console.log(`Rows written: ${written}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

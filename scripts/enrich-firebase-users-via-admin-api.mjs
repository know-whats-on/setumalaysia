#!/usr/bin/env node
import fs from "node:fs/promises";
import process from "node:process";
import {
  applyExistingProfilePolicy,
  formatMigrationReport,
  getProfileKey,
  prepareFirebaseUsersMigration,
} from "./firebase-migration-lib.mjs";

const DEFAULT_INPUT = "keys/firebase-migration/legacy-users.json";
const DEFAULT_FIRESTORE_INPUT = "keys/firebase-migration/legacy-firestore-profiles.json";
const DEFAULT_BACKUP_DIR = "keys/firebase-migration";
const DEFAULT_ADMIN_EMAIL = "talkwithrushi@gmail.com";
const DEFAULT_INFO_FILE = "utils/supabase/info.tsx";
const CONCURRENCY = 8;

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    firestoreInput: DEFAULT_FIRESTORE_INPUT,
    projectId: process.env.OLD_FIREBASE_PROJECT_ID || "",
    adminEmail: process.env.GHAR_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
    supabaseInfoFile: DEFAULT_INFO_FILE,
    backupDir: DEFAULT_BACKUP_DIR,
    execute: false,
    includeDisabled: false,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      index += 1;
      return value;
    };

    if (arg === "--input") args.input = readValue();
    else if (arg === "--firestore-input") args.firestoreInput = readValue();
    else if (arg === "--project" || arg === "--project-id") args.projectId = readValue();
    else if (arg === "--admin-email") args.adminEmail = readValue();
    else if (arg === "--supabase-info-file") args.supabaseInfoFile = readValue();
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
  node scripts/enrich-firebase-users-via-admin-api.mjs --project OLD_FIREBASE_PROJECT_ID

Dry-run is the default. Add --execute to write rows through the existing admin API.

Options:
  --input <path>              Firebase auth:export JSON file (${DEFAULT_INPUT})
  --firestore-input <path>    Firestore profile JSON export (${DEFAULT_FIRESTORE_INPUT})
  --project <id>              Old Firebase project id for legacy metadata
  --admin-email <email>       Existing app admin email (default: ${DEFAULT_ADMIN_EMAIL})
  --limit <n>                 Only prepare the first n importable users
  --include-disabled          Include disabled Firebase Auth users
  --execute                   Actually update/create Supabase profiles
`);
}

async function readSupabaseInfo(file) {
  const text = await fs.readFile(file, "utf8");
  const projectId = text.match(/export const projectId = "([^"]+)"/)?.[1] || "";
  const publicAnonKey = text.match(/export const publicAnonKey = "([^"]+)"/)?.[1] || "";
  if (!projectId || !publicAnonKey) {
    throw new Error(`Could not read projectId/publicAnonKey from ${file}`);
  }
  return {
    baseUrl: `https://${projectId}.supabase.co/functions/v1/make-server-1d591b90`,
    publicAnonKey,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest(config, path, init = {}, attempt = 0) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.publicAnonKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text };
  }

  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await delay(600 * (attempt + 1));
      return apiRequest(config, path, init, attempt + 1);
    }
    throw new Error(`Admin API request failed (${response.status}) ${path}: ${payload?.error || response.statusText}`);
  }

  return payload;
}

async function fetchExistingProfiles(config, adminEmail) {
  const payload = await apiRequest(config, "/admin/users", {
    method: "POST",
    body: JSON.stringify({ admin_email: adminEmail }),
  });
  const profiles = Array.isArray(payload?.data) ? payload.data : [];
  const byKey = new Map();
  for (const profile of profiles) {
    if (!profile?.email) continue;
    byKey.set(getProfileKey(profile.email), { value: profile });
  }
  return { profiles, byKey };
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeBackup(args, rows, existingByKey) {
  await fs.mkdir(args.backupDir, { recursive: true });
  const backupPath = `${args.backupDir.replace(/\/+$/, "")}/admin-api-profile-enrichment-backup-${backupTimestamp()}.json`;
  await fs.writeFile(backupPath, JSON.stringify({
    created_at: new Date().toISOString(),
    row_count: rows.length,
    rows: rows.map((row) => ({
      key: row.key,
      existing: existingByKey.get(row.key) || null,
      next: row,
    })),
  }, null, 2), "utf8");
  return backupPath;
}

async function updateProfile(config, adminEmail, email, profile) {
  const payload = await apiRequest(config, `/admin/users/${encodeURIComponent(email)}`, {
    method: "PUT",
    body: JSON.stringify({ admin_email: adminEmail, updates: profile }),
  });
  return payload?.data || null;
}

async function createProfile(config, profile) {
  const payload = await apiRequest(config, "/profiles", {
    method: "POST",
    body: JSON.stringify(profile),
  });
  return payload?.data || null;
}

async function runPool(items, worker) {
  let index = 0;
  let completed = 0;
  const failures = [];
  async function next() {
    for (;;) {
      const currentIndex = index;
      index += 1;
      if (currentIndex >= items.length) return;
      const item = items[currentIndex];
      try {
        await worker(item, currentIndex);
        completed += 1;
        if (completed % 100 === 0 || completed === items.length) {
          console.log(`Processed ${completed}/${items.length}`);
        }
      } catch (error) {
        failures.push({
          email: item.value?.email || "",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()));
  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.projectId) throw new Error("--project or OLD_FIREBASE_PROJECT_ID is required");

  const [authExport, firestoreProfiles, config] = await Promise.all([
    fs.readFile(args.input, "utf8").then(JSON.parse),
    fs.readFile(args.firestoreInput, "utf8").then(JSON.parse),
    readSupabaseInfo(args.supabaseInfoFile),
  ]);

  const prepared = prepareFirebaseUsersMigration(authExport, {
    projectId: args.projectId,
    appVariant: "all",
    includeDisabled: args.includeDisabled,
    limit: args.limit,
    firestoreProfiles,
  });

  const { profiles, byKey } = await fetchExistingProfiles(config, args.adminEmail);
  const policy = applyExistingProfilePolicy(prepared.records, byKey);
  const reportText = formatMigrationReport({
    parseReport: prepared.report,
    existingReport: policy.report,
    skipped: prepared.skipped,
    dryRun: !args.execute,
    existingChecked: true,
  });

  console.log(reportText);
  console.log(`Existing profiles fetched through admin API: ${profiles.length}`);

  if (!args.execute) return;

  const backupPath = await writeBackup(args, policy.rows, byKey);
  console.log(`Backup written: ${backupPath}`);

  const failures = await runPool(policy.rows, async (row) => {
    const email = row.value.email;
    if (byKey.has(row.key)) await updateProfile(config, args.adminEmail, email, row.value);
    else await createProfile(config, row.value);
  });

  console.log(`Rows attempted: ${policy.rows.length}`);
  console.log(`Rows failed: ${failures.length}`);
  if (failures.length) {
    const failurePath = `${args.backupDir.replace(/\/+$/, "")}/admin-api-profile-enrichment-failures-${backupTimestamp()}.json`;
    await fs.writeFile(failurePath, JSON.stringify(failures, null, 2), "utf8");
    console.log(`Failures written: ${failurePath}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

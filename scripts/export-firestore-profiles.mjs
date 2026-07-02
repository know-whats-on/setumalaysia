#!/usr/bin/env node
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import process from "node:process";
import { promisify } from "node:util";
import {
  decodeFirestoreDocument,
  normalizeFirestoreProfileRecord,
} from "./firebase-migration-lib.mjs";

const DEFAULT_OUTPUT = "keys/firebase-migration/legacy-firestore-profiles.json";
const DEFAULT_DATABASE = "(default)";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore.readonly";
const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const args = {
    serviceAccount: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
    firebaseCliAuth: false,
    projectId: process.env.OLD_FIREBASE_PROJECT_ID || "",
    database: DEFAULT_DATABASE,
    output: DEFAULT_OUTPUT,
    collections: [],
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

    if (arg === "--service-account") args.serviceAccount = readValue();
    else if (arg === "--firebase-cli-auth") args.firebaseCliAuth = true;
    else if (arg === "--project" || arg === "--project-id") args.projectId = readValue();
    else if (arg === "--database") args.database = readValue();
    else if (arg === "--output") args.output = readValue();
    else if (arg === "--collection") args.collections.push(readValue());
    else if (arg === "--collections") args.collections.push(...readValue().split(",").map((item) => item.trim()).filter(Boolean));
    else if (arg === "--limit") args.limit = Number(readValue());
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/export-firestore-profiles.mjs --service-account keys/firebase-migration/old-firebase-service-account.json --project OLD_FIREBASE_PROJECT_ID

This is read-only. It scans root Firestore collections for documents with email-like profile fields and writes:
  ${DEFAULT_OUTPUT}

Options:
  --service-account <path>  Firebase service account JSON, or GOOGLE_APPLICATION_CREDENTIALS
  --firebase-cli-auth       Use the current Firebase CLI login instead of a service account
  --project <id>            Old Firebase project id, or OLD_FIREBASE_PROJECT_ID
  --database <id>           Firestore database id (default: ${DEFAULT_DATABASE})
  --collection <name>       Scan only this root collection. Repeatable.
  --collections <a,b,c>     Comma-separated root collections to scan.
  --limit <n>               Stop after n documents scanned.
  --output <path>           Output JSON path.
`);
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: FIRESTORE_SCOPE,
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), serviceAccount.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;
  const response = await fetch(claims.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google OAuth token request failed (${response.status}): ${body || response.statusText}`);
  }
  const token = await response.json();
  return token.access_token;
}

async function getFirebaseCliAccessToken() {
  const { stdout } = await execFileAsync("npx", ["firebase-tools@latest", "login:list", "--json"], {
    maxBuffer: 1024 * 1024 * 8,
  });
  const payload = JSON.parse(stdout);
  const accounts = Array.isArray(payload?.result) ? payload.result : [];
  const token = accounts
    .map((account) => account?.tokens?.access_token)
    .find((value) => typeof value === "string" && value.length > 0);
  if (!token) throw new Error("No active Firebase CLI access token found. Run firebase login or provide --service-account.");
  return token;
}

function firestoreBaseUrl(projectId, database) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(database)}/documents`;
}

async function firestoreRequest(url, accessToken, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Firestore request failed (${response.status}): ${body || response.statusText}`);
  }
  return response.json();
}

async function listRootCollections(args, accessToken) {
  const url = `${firestoreBaseUrl(args.projectId, args.database)}:listCollectionIds`;
  const collections = [];
  let pageToken = "";
  do {
    const payload = await firestoreRequest(url, accessToken, {
      method: "POST",
      body: JSON.stringify({ pageSize: 300, pageToken }),
    });
    collections.push(...(payload.collectionIds || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return collections.sort();
}

async function listCollectionDocuments(args, accessToken, collectionId, onDocument) {
  let pageToken = "";
  let scanned = 0;
  do {
    const url = new URL(`${firestoreBaseUrl(args.projectId, args.database)}/${encodeURIComponent(collectionId)}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await firestoreRequest(url, accessToken);
    for (const document of payload.documents || []) {
      await onDocument(document);
      scanned += 1;
      if (args.limit > 0 && scanned >= args.limit) return scanned;
    }
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return scanned;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.serviceAccount && !args.firebaseCliAuth) {
    throw new Error("--service-account, GOOGLE_APPLICATION_CREDENTIALS, or --firebase-cli-auth is required");
  }
  if (!args.projectId) throw new Error("--project or OLD_FIREBASE_PROJECT_ID is required");

  const accessToken = args.firebaseCliAuth
    ? await getFirebaseCliAccessToken()
    : await getAccessToken(JSON.parse(await fs.readFile(args.serviceAccount, "utf8")));
  const collections = args.collections.length ? args.collections : await listRootCollections(args, accessToken);
  const profiles = [];
  const report = {
    project_id: args.projectId,
    database: args.database,
    exported_at: new Date().toISOString(),
    collections_scanned: collections,
    documents_scanned: 0,
    profiles_with_email: 0,
    documents_without_profile_email: 0,
  };

  for (const collectionId of collections) {
    const scanned = await listCollectionDocuments(args, accessToken, collectionId, async (document) => {
      const decoded = decodeFirestoreDocument(document);
      const normalized = normalizeFirestoreProfileRecord(decoded, { enrichedAt: report.exported_at });
      if (!normalized.ok) {
        report.documents_without_profile_email += 1;
        return;
      }
      report.profiles_with_email += 1;
      profiles.push({
        collection: collectionId,
        path: decoded.path,
        id: decoded.id,
        data: decoded.data,
      });
    });
    report.documents_scanned += scanned;
    if (args.limit > 0 && report.documents_scanned >= args.limit) break;
  }

  await fs.mkdir(args.output.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await fs.writeFile(args.output, JSON.stringify({ ...report, profiles }, null, 2), "utf8");
  console.log(`Firestore profile export written: ${args.output}`);
  console.log(`Collections scanned: ${report.collections_scanned.join(", ") || "(none)"}`);
  console.log(`Documents scanned: ${report.documents_scanned}`);
  console.log(`Profiles with email: ${report.profiles_with_email}`);
  console.log(`Documents without profile email: ${report.documents_without_profile_email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

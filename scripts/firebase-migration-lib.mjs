export const PROFILE_KEY_PREFIX = "GHAR_CLAUDE_profile:";
export const UNSW_UNIVERSITY = "University of New South Wales";
export const UNSW_UNIVERSITY_ID = "university_of_new_south_wales";

const VALID_APP_VARIANTS = new Set(["all", "ghar", "burb_mate", "setu_china", "jom_settle"]);
const PROFILE_REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "dob",
  "phone",
  "citizenship",
  "australian_state",
];

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function firstText(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}

function normalizeAppVariant(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/-/g, "_");
  if (normalized === "jomsettle" || normalized === "malaysia") return "jom_settle";
  return VALID_APP_VARIANTS.has(normalized) ? normalized : "all";
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getProfileKey(email) {
  return `${PROFILE_KEY_PREFIX}${normalizeEmail(email)}`;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null || value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }
  const millis = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const parsed = new Date(millis);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function normalizePhone(value) {
  return String(value || "").trim();
}

function normalizeDateOnly(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) return dateOnly[1];
  }
  const timestamp = normalizeTimestamp(value);
  return timestamp ? timestamp.slice(0, 10) : "";
}

function normalizeGraduationYear(value) {
  if (value === undefined || value === null || value === "") return null;
  const match = String(value).match(/\b(19[5-9]\d|20[0-5]\d)\b/);
  if (!match) return null;
  return Number(match[1]);
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `migration-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getProviderInfo(user) {
  const providers = Array.isArray(user?.providerUserInfo)
    ? user.providerUserInfo
    : Array.isArray(user?.providerData)
      ? user.providerData
      : [];

  return providers
    .filter((provider) => provider && typeof provider === "object")
    .map((provider) => ({
      provider_id: String(provider.providerId || provider.provider_id || "").trim(),
      raw_id: String(provider.rawId || provider.federatedId || provider.uid || "").trim(),
      email: normalizeEmail(provider.email || ""),
      display_name: String(provider.displayName || provider.display_name || "").trim(),
      photo_url: String(provider.photoUrl || provider.photoURL || provider.photo_url || "").trim(),
    }))
    .filter((provider) => provider.provider_id || provider.raw_id || provider.email);
}

function firstProviderValue(user, field) {
  return getProviderInfo(user).map((provider) => provider[field]).find(hasText) || "";
}

function titleCaseToken(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function nameFromEmail(email) {
  const localPart = normalizeEmail(email).split("@")[0] || "";
  const parts = localPart
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter((part) => /^[a-zA-Z]{2,}$/.test(part));
  if (parts.length < 2 || parts.length > 3) return { firstName: "", lastName: "" };
  return {
    firstName: titleCaseToken(parts[0]),
    lastName: parts.slice(1).map(titleCaseToken).join(" "),
  };
}

export function splitDisplayName(displayName, email = "") {
  const cleanName = String(displayName || "").replace(/\s+/g, " ").trim();
  if (!cleanName) return nameFromEmail(email);
  const parts = cleanName.split(" ").filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function inferEmailType(email) {
  return normalizeEmail(email).endsWith(".edu.au") ? "edu_au" : "standard";
}

function readPath(source, path) {
  const parts = String(path || "").split(".").filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    const key = Object.keys(current).find((candidate) => candidate.toLowerCase() === part.toLowerCase());
    if (!key) return undefined;
    current = current[key];
  }
  return current;
}

function readFirst(source, fields) {
  for (const field of fields) {
    const value = readPath(source, field);
    if (hasText(value)) return value;
  }
  return "";
}

export function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map((item) => decodeFirestoreValue(item));
  }
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nested]) => [key, decodeFirestoreValue(nested)]),
    );
  }
  return value;
}

export function decodeFirestoreDocument(document) {
  if (!document || typeof document !== "object") return { path: "", id: "", data: {} };
  const path = String(document.name || document.path || document.__path || "").trim();
  const id = String(document.id || path.split("/").filter(Boolean).pop() || "").trim();
  const rawData = document.fields
    ? Object.fromEntries(Object.entries(document.fields).map(([key, value]) => [key, decodeFirestoreValue(value)]))
    : document.data && typeof document.data === "object"
      ? document.data
      : document;
  const { path: _path, __path, id: _id, fields, data: _data, ...plainRest } = rawData;
  const data = document.fields || document.data ? rawData : plainRest;
  return { path, id, data };
}

const FIRESTORE_EMAIL_FIELDS = [
  "email",
  "email_address",
  "emailAddress",
  "user_email",
  "userEmail",
  "auth.email",
  "profile.email",
  "contact.email",
];

const FIRESTORE_FIRST_NAME_FIELDS = [
  "first_name",
  "firstName",
  "given_name",
  "givenName",
  "fname",
  "profile.first_name",
  "profile.firstName",
  "name.first",
];

const FIRESTORE_LAST_NAME_FIELDS = [
  "last_name",
  "lastName",
  "family_name",
  "familyName",
  "surname",
  "lname",
  "profile.last_name",
  "profile.lastName",
  "name.last",
];

const FIRESTORE_DISPLAY_NAME_FIELDS = [
  "display_name",
  "displayName",
  "full_name",
  "fullName",
  "name",
  "profile.display_name",
  "profile.displayName",
  "profile.full_name",
  "profile.fullName",
];

const FIRESTORE_PHONE_FIELDS = [
  "phone",
  "phone_number",
  "phoneNumber",
  "mobile",
  "mobile_number",
  "mobileNumber",
  "contact_number",
  "contactNumber",
  "profile.phone",
  "contact.phone",
];

const FIRESTORE_DOB_FIELDS = [
  "dob",
  "date_of_birth",
  "dateOfBirth",
  "birth_date",
  "birthDate",
  "profile.dob",
];

const FIRESTORE_CITIZENSHIP_FIELDS = [
  "citizenship",
  "nationality",
  "country",
  "home_country",
  "homeCountry",
  "profile.citizenship",
];

const FIRESTORE_HOME_STATE_FIELDS = [
  "home_state",
  "homeState",
  "state_of_origin",
  "stateOfOrigin",
  "profile.home_state",
];

const FIRESTORE_AU_STATE_FIELDS = [
  "australian_state",
  "australianState",
  "au_state",
  "auState",
  "state",
  "current_state",
  "currentState",
  "profile.australian_state",
  "location.state",
];

const FIRESTORE_COURSE_FIELDS = [
  "course_name",
  "courseName",
  "course",
  "degree",
  "program",
  "programme",
  "study_program",
  "studyProgram",
  "profile.course_name",
];

const FIRESTORE_GRAD_YEAR_FIELDS = [
  "graduation_year",
  "graduationYear",
  "grad_year",
  "gradYear",
  "expected_graduation_year",
  "expectedGraduationYear",
  "profile.graduation_year",
];

const FIRESTORE_STUDENT_ID_FIELDS = [
  "student_id",
  "studentId",
  "zid",
  "profile.student_id",
];

export function normalizeFirestoreProfileRecord(entry, options = {}) {
  const decoded = decodeFirestoreDocument(entry);
  const email = normalizeEmail(readFirst(decoded.data, FIRESTORE_EMAIL_FIELDS) || entry?.email || "");
  if (!isValidEmail(email)) {
    return { ok: false, reason: "invalid_email", email, path: decoded.path, id: decoded.id };
  }

  const displayName = String(readFirst(decoded.data, FIRESTORE_DISPLAY_NAME_FIELDS) || "").replace(/\s+/g, " ").trim();
  const explicitFirstName = String(readFirst(decoded.data, FIRESTORE_FIRST_NAME_FIELDS) || "").trim();
  const explicitLastName = String(readFirst(decoded.data, FIRESTORE_LAST_NAME_FIELDS) || "").trim();
  const splitName = splitDisplayName(displayName, email);
  const enrichedAt = options.enrichedAt || new Date().toISOString();

  return {
    ok: true,
    email,
    path: decoded.path,
    id: decoded.id,
    profile: {
      first_name: explicitFirstName || splitName.firstName,
      last_name: explicitLastName || splitName.lastName,
      dob: normalizeDateOnly(readFirst(decoded.data, FIRESTORE_DOB_FIELDS)),
      phone: normalizePhone(readFirst(decoded.data, FIRESTORE_PHONE_FIELDS)),
      citizenship: String(readFirst(decoded.data, FIRESTORE_CITIZENSHIP_FIELDS) || "").trim(),
      home_state: String(readFirst(decoded.data, FIRESTORE_HOME_STATE_FIELDS) || "").trim(),
      australian_state: String(readFirst(decoded.data, FIRESTORE_AU_STATE_FIELDS) || "").trim(),
      university: UNSW_UNIVERSITY,
      university_id: UNSW_UNIVERSITY_ID,
      course_name: String(readFirst(decoded.data, FIRESTORE_COURSE_FIELDS) || "").trim(),
      student_id: String(readFirst(decoded.data, FIRESTORE_STUDENT_ID_FIELDS) || "").trim(),
      graduation_year: normalizeGraduationYear(readFirst(decoded.data, FIRESTORE_GRAD_YEAR_FIELDS)),
    },
    metadata: {
      path: decoded.path,
      id: decoded.id,
      matched_email: email,
      enriched_at: enrichedAt,
    },
  };
}

export function getFirestoreExportProfiles(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.profiles)) return payload.profiles;
  if (Array.isArray(payload.documents)) return payload.documents;
  if (Array.isArray(payload.users)) return payload.users;
  return [];
}

export function prepareFirestoreProfileEnrichments(payload, options = {}) {
  const entries = getFirestoreExportProfiles(payload);
  const byEmail = new Map();
  const skipped = [];
  const report = {
    firestore_profiles_total: entries.length,
    firestore_profiles_with_email: 0,
    firestore_profiles_duplicate_email: 0,
    firestore_profiles_invalid_email: 0,
  };

  for (const entry of entries) {
    const normalized = normalizeFirestoreProfileRecord(entry, options);
    if (!normalized.ok) {
      report.firestore_profiles_invalid_email += 1;
      skipped.push(normalized);
      continue;
    }
    report.firestore_profiles_with_email += 1;
    if (byEmail.has(normalized.email)) {
      report.firestore_profiles_duplicate_email += 1;
      skipped.push({ reason: "duplicate_firestore_email", email: normalized.email, path: normalized.path, id: normalized.id });
      continue;
    }
    byEmail.set(normalized.email, normalized);
  }

  return { byEmail, skipped, report };
}

export function getFirebaseExportUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.accounts)) return payload.accounts;
  return [];
}

function getFirebaseUid(user) {
  return String(user?.localId || user?.uid || user?.userId || "").trim();
}

function getFirebaseEmail(user) {
  return normalizeEmail(user?.email || firstProviderValue(user, "email"));
}

function getFirebaseDisplayName(user) {
  return String(
    user?.displayName
      || user?.display_name
      || user?.name
      || firstProviderValue(user, "display_name")
      || "",
  ).trim();
}

function isFirebaseUserDisabled(user) {
  const disabled = user?.disabled;
  if (typeof disabled === "boolean") return disabled;
  return String(disabled || "").trim().toLowerCase() === "true";
}

export function buildMigratedProfile(user, options = {}) {
  const email = getFirebaseEmail(user);
  const migratedAt = options.migratedAt || new Date().toISOString();
  const projectId = String(options.projectId || "").trim();
  const firestoreProfile = options.firestoreProfile?.profile || null;
  const firestoreMetadata = options.firestoreProfile?.metadata || null;
  const displayName = firstText(
    [firestoreProfile?.first_name, firestoreProfile?.last_name].filter(Boolean).join(" "),
    getFirebaseDisplayName(user),
  );
  const { firstName, lastName } = splitDisplayName(displayName, email);
  const providers = getProviderInfo(user);
  const uid = getFirebaseUid(user);
  const phone = normalizePhone(firestoreProfile?.phone || user?.phoneNumber || user?.phone_number || "");
  const emailVerified = Boolean(user?.emailVerified ?? user?.email_verified ?? false);
  const createdAt = normalizeTimestamp(user?.createdAt || user?.created_at || user?.createdDate);
  const lastSignInAt = normalizeTimestamp(user?.lastLoginAt || user?.lastSignInAt || user?.last_sign_in_at);
  const legacyFirebase = {
    project_id: projectId,
    uid,
    display_name: getFirebaseDisplayName(user),
    phone_number: phone,
    email_verified: emailVerified,
    providers,
    created_at: createdAt,
    last_sign_in_at: lastSignInAt,
  };

  if (firestoreMetadata) {
    legacyFirebase.firestore = {
      ...firestoreMetadata,
      project_id: projectId,
    };
  }

  return {
    id: options.id || randomId(),
    first_name: firestoreProfile?.first_name || firstName,
    last_name: firestoreProfile?.last_name || lastName,
    dob: firestoreProfile?.dob || "",
    phone,
    email,
    citizenship: firestoreProfile?.citizenship || "",
    home_state: firestoreProfile?.home_state || "",
    australian_state: firestoreProfile?.australian_state || "",
    audience_mode: "student",
    university: UNSW_UNIVERSITY,
    university_id: UNSW_UNIVERSITY_ID,
    email_type: inferEmailType(email),
    course_name: firestoreProfile?.course_name || "",
    student_id: firestoreProfile?.student_id || "",
    visa_status: "",
    work_status: "",
    employer_name: "",
    weekly_income: null,
    graduation_year: firestoreProfile?.graduation_year || null,
    postcode: "",
    work_address: "",
    work_display_address: "",
    work_state: "",
    work_postcode: "",
    work_lat: null,
    work_lng: null,
    work_address_verified: false,
    is_verified: false,
    migration_status: "needs_profile_completion",
    migrated_at: migratedAt,
    app_variant_imported_for: normalizeAppVariant(options.appVariant),
    legacy_firebase: legacyFirebase,
    created_at: migratedAt,
    updated_at: migratedAt,
  };
}

export function isCompleteProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  if (PROFILE_REQUIRED_FIELDS.some((field) => !hasText(profile[field]))) return false;
  const audienceMode = String(profile.audience_mode || "student").trim().toLowerCase();
  if (audienceMode === "student") {
    return hasText(profile.university) && hasText(profile.course_name) && hasText(profile.graduation_year);
  }
  return true;
}

function preferExistingValue(existing, fallback) {
  if (existing === null || existing === undefined) return fallback;
  if (typeof existing === "string" && !existing.trim()) return fallback;
  return existing;
}

function isUnswValue(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return normalized === "unsw" || normalized === "university of new south wales";
}

function mergeLegacyFirebase(existingLegacy, migratedLegacy) {
  if (!existingLegacy || typeof existingLegacy !== "object") return migratedLegacy;
  if (!migratedLegacy || typeof migratedLegacy !== "object") return existingLegacy;
  return {
    ...migratedLegacy,
    ...existingLegacy,
    firestore: existingLegacy.firestore || migratedLegacy.firestore,
  };
}

export function mergeMigratedProfile(existing, migrated) {
  if (!existing || typeof existing !== "object") return migrated;
  const merged = { ...migrated, ...existing };
  for (const [field, value] of Object.entries(migrated)) {
    merged[field] = preferExistingValue(existing[field], value);
  }
  const isMigratedProfile = Boolean(existing.migration_status || existing.legacy_firebase || migrated.legacy_firebase);
  merged.id = preferExistingValue(existing.id, migrated.id);
  merged.email = normalizeEmail(existing.email || migrated.email);
  merged.created_at = preferExistingValue(existing.created_at, migrated.created_at);
  merged.updated_at = migrated.updated_at;
  merged.is_verified = Boolean(existing.is_verified ?? migrated.is_verified);
  merged.migration_status = existing.migration_status || migrated.migration_status;
  merged.migrated_at = existing.migrated_at || migrated.migrated_at;
  merged.app_variant_imported_for = existing.app_variant_imported_for || migrated.app_variant_imported_for;
  merged.legacy_firebase = mergeLegacyFirebase(existing.legacy_firebase, migrated.legacy_firebase);
  if (isMigratedProfile && migrated.audience_mode === "student") {
    merged.audience_mode = "student";
  }
  if (isMigratedProfile && (!hasText(merged.university) || isUnswValue(merged.university))) {
    merged.university = UNSW_UNIVERSITY;
  }
  if (isMigratedProfile && (!hasText(merged.university_id) || isUnswValue(merged.university_id))) {
    merged.university_id = UNSW_UNIVERSITY_ID;
  }
  return merged;
}

export function prepareFirebaseUsersMigration(payload, options = {}) {
  const users = getFirebaseExportUsers(payload);
  const firestore = prepareFirestoreProfileEnrichments(options.firestoreProfiles, {
    enrichedAt: options.migratedAt || new Date().toISOString(),
  });
  const seenEmails = new Set();
  const matchedFirestoreEmails = new Set();
  const skipped = [];
  const records = [];
  const report = {
    total_exported: users.length,
    importable_before_limit: 0,
    prepared: 0,
    skipped_invalid_email: 0,
    skipped_disabled: 0,
    skipped_duplicate_email: 0,
    limited_to: null,
    ...firestore.report,
    firestore_profiles_matched: 0,
    skipped_firestore_only: 0,
  };

  for (const user of users) {
    const uid = getFirebaseUid(user);
    const email = getFirebaseEmail(user);
    if (!isValidEmail(email)) {
      report.skipped_invalid_email += 1;
      skipped.push({ reason: "invalid_email", uid, email });
      continue;
    }
    if (isFirebaseUserDisabled(user) && !options.includeDisabled) {
      report.skipped_disabled += 1;
      skipped.push({ reason: "disabled", uid, email });
      continue;
    }
    if (seenEmails.has(email)) {
      report.skipped_duplicate_email += 1;
      skipped.push({ reason: "duplicate_email", uid, email });
      continue;
    }
    seenEmails.add(email);
    report.importable_before_limit += 1;
    const firestoreProfile = firestore.byEmail.get(email) || null;
    if (firestoreProfile) matchedFirestoreEmails.add(email);
    records.push({
      key: getProfileKey(email),
      email,
      profile: buildMigratedProfile(user, {
        ...options,
        firestoreProfile,
      }),
    });
  }

  report.firestore_profiles_matched = matchedFirestoreEmails.size;
  report.skipped_firestore_only = Array.from(firestore.byEmail.keys())
    .filter((email) => !seenEmails.has(email)).length;
  skipped.push(...firestore.skipped);

  const limit = Number(options.limit || 0);
  const limitedRecords = Number.isFinite(limit) && limit > 0 ? records.slice(0, limit) : records;
  report.prepared = limitedRecords.length;
  report.limited_to = limitedRecords.length === records.length ? null : limitedRecords.length;
  return { records: limitedRecords, skipped, report };
}

export function applyExistingProfilePolicy(records, existingByKey) {
  const rows = [];
  const skippedExistingComplete = [];
  let updatedExistingIncomplete = 0;
  let newProfiles = 0;

  for (const record of records) {
    const existing = existingByKey?.get(record.key);
    const existingProfile = existing?.value || existing || null;
    const needsProfileCompletion = existingProfile?.migration_status === "needs_profile_completion";
    if (isCompleteProfile(existingProfile) && !needsProfileCompletion) {
      skippedExistingComplete.push({ key: record.key, email: record.email });
      continue;
    }
    if (existingProfile) updatedExistingIncomplete += 1;
    else newProfiles += 1;
    rows.push({
      key: record.key,
      value: mergeMigratedProfile(existingProfile, record.profile),
    });
  }

  return {
    rows,
    skippedExistingComplete,
    report: {
      new_profiles: newProfiles,
      updated_existing_incomplete: updatedExistingIncomplete,
      skipped_existing_complete: skippedExistingComplete.length,
      rows_to_upsert: rows.length,
    },
  };
}

export function formatMigrationReport({ parseReport, existingReport, skipped = [], dryRun = true, existingChecked = false }) {
  const lines = [
    dryRun ? "DRY RUN: no Supabase rows were written." : "EXECUTE: Supabase rows were written.",
    `Firebase users exported: ${parseReport.total_exported}`,
    `Importable before limit: ${parseReport.importable_before_limit}`,
    `Prepared for this run: ${parseReport.prepared}`,
    `Skipped invalid emails: ${parseReport.skipped_invalid_email}`,
    `Skipped disabled users: ${parseReport.skipped_disabled}`,
    `Skipped duplicate emails: ${parseReport.skipped_duplicate_email}`,
  ];

  if (parseReport.limited_to !== null) {
    lines.push(`Limited to first importable users: ${parseReport.limited_to}`);
  }

  if (parseReport.firestore_profiles_total > 0) {
    lines.push(`Firestore profiles exported: ${parseReport.firestore_profiles_total}`);
    lines.push(`Firestore profiles with valid email: ${parseReport.firestore_profiles_with_email}`);
    lines.push(`Firestore profiles matched to Auth allow-list: ${parseReport.firestore_profiles_matched}`);
    lines.push(`Firestore profiles skipped as Firestore-only: ${parseReport.skipped_firestore_only}`);
    lines.push(`Firestore duplicate emails skipped: ${parseReport.firestore_profiles_duplicate_email}`);
    lines.push(`Firestore invalid emails skipped: ${parseReport.firestore_profiles_invalid_email}`);
  }

  if (existingChecked && existingReport) {
    lines.push(`New profile stubs: ${existingReport.new_profiles}`);
    lines.push(`Existing incomplete profiles updated: ${existingReport.updated_existing_incomplete}`);
    lines.push(`Existing complete profiles skipped: ${existingReport.skipped_existing_complete}`);
    lines.push(`Rows to upsert: ${existingReport.rows_to_upsert}`);
  } else {
    lines.push("Existing Supabase profiles: not checked");
  }

  const sampleSkipped = skipped.slice(0, 5);
  if (sampleSkipped.length) {
    lines.push("Sample skipped users:");
    for (const item of sampleSkipped) {
      lines.push(`- ${item.reason}: ${item.email || "(no email)"} ${item.uid ? `(${item.uid})` : ""}`.trim());
    }
  }

  return lines.join("\n");
}

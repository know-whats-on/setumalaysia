import { readFile } from 'node:fs/promises';
import process from 'node:process';

const infoFile = new URL('../utils/supabase/info.tsx', import.meta.url);
const infoSource = await readFile(infoFile, 'utf8');
const projectId = infoSource.match(/projectId = "([^"]+)"/)?.[1];
const publicAnonKey = infoSource.match(/publicAnonKey = "([^"]+)"/)?.[1];

if (!projectId || !publicAnonKey) {
  throw new Error('Could not read Supabase project configuration from utils/supabase/info.tsx');
}

const smokeEmail = process.env.SMOKE_EMAIL || 'talkwithrushi@gmail.com';
const appVariant = process.env.APP_VARIANT || 'burb_mate';
const city = process.env.SMOKE_CITY || 'Sydney';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-1d591b90`;
const MIRROR_BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-1d591b90`;
const headers = {
  apikey: publicAnonKey,
  Authorization: `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

function validatePublicToiletsPayload(payload) {
  const toilets = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.toilets)
      ? payload.toilets
      : [];
  if (typeof payload?.count !== 'number' || payload.count <= 0) {
    throw new Error(`Expected public toilet count > 0, got ${payload?.count}`);
  }
  if (toilets.length <= 0) {
    throw new Error('Expected at least one public toilet result');
  }
  const validCoords = toilets.some((toilet) => Number.isFinite(toilet?.lat) && Number.isFinite(toilet?.lng));
  if (!validCoords) {
    throw new Error('Expected at least one public toilet with valid lat/lng');
  }
}

const checks = [
  { label: 'Profile', method: 'GET', path: `/profiles/${encodeURIComponent(smokeEmail)}` },
  { label: 'Rental history', method: 'GET', path: `/rental-history/${encodeURIComponent(smokeEmail)}` },
  { label: 'Listings', method: 'GET', path: '/listings' },
  {
    label: 'Public toilets',
    method: 'GET',
    path: '/public-toilets?west=151.18&south=-33.88&east=151.23&north=-33.84&limit=5',
    requireMirror: true,
    validate: validatePublicToiletsPayload,
  },
  { label: 'Evidence', method: 'GET', path: `/evidence?email=${encodeURIComponent(smokeEmail)}` },
  { label: 'Bulletins', method: 'GET', path: `/bulletins?app_variant=${encodeURIComponent(appVariant)}` },
  { label: 'Banners', method: 'GET', path: `/banners?app_variant=${encodeURIComponent(appVariant)}` },
  { label: 'Application kits', method: 'GET', path: `/application-kits?email=${encodeURIComponent(smokeEmail)}` },
  { label: 'Scam checks', method: 'GET', path: `/scam-checks?email=${encodeURIComponent(smokeEmail)}` },
  { label: 'City guides', method: 'GET', path: `/city-guides?city=${encodeURIComponent(city)}&app_variant=${encodeURIComponent(appVariant)}` },
  { label: 'Official events', method: 'GET', path: `/official-events?state=NSW&app_variant=${encodeURIComponent(appVariant)}` },
  { label: 'Public plans', method: 'GET', path: `/public-plans?viewer_email=${encodeURIComponent(smokeEmail)}&scope=my` },
  { label: 'Fuel nearby', method: 'GET', path: '/fuel/nearby?lat=-33.9249&lng=151.2554&state=NSW' },
  { label: 'Fuel insights', method: 'GET', path: '/fuel/insights?state=NSW&fuel=unleaded&tool=overview' },
  { label: 'Fuel news', method: 'GET', path: '/fuel/news' },
  { label: 'Admin admins', method: 'GET', path: '/admin/admins' },
  { label: 'Deleted markers', method: 'GET', path: '/admin/deleted-markers' },
  { label: 'Email logs', method: 'GET', path: '/admin/email-logs' },
  {
    label: 'Admin users',
    method: 'POST',
    path: '/admin/users',
    body: { admin_email: smokeEmail, search: '', limit: 5, offset: 0 },
  },
  {
    label: 'Admin user stats',
    method: 'POST',
    path: '/admin/users/stats',
    body: { admin_email: smokeEmail },
  },
  {
    label: 'Notification campaigns',
    method: 'GET',
    path: `/admin/notification-campaigns?admin_email=${encodeURIComponent(smokeEmail)}`,
  },
];

async function hit(base, check) {
  const res = await fetch(`${base}${check.path}`, {
    method: check.method,
    headers,
    body: check.body ? JSON.stringify(check.body) : undefined,
  });
  const text = await res.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }
  return {
    ok: res.ok,
    status: res.status,
    payload,
  };
}

let failures = 0;

for (const check of checks) {
  const primary = await hit(BASE, check);
  let primaryValidationError = null;
  if (primary.ok && check.validate) {
    try {
      check.validate(primary.payload);
    } catch (error) {
      primaryValidationError = error instanceof Error ? error.message : String(error);
    }
  }
  if (!primary.ok || primaryValidationError) {
    failures += 1;
    console.error(`FAIL  ${check.label} [main ${primary.status}]`, primaryValidationError || primary.payload);
    continue;
  }

  console.log(`PASS  ${check.label} [main ${primary.status}]`);

  if (check.method === 'GET') {
    const mirror = await hit(MIRROR_BASE, check);
    let mirrorValidationError = null;
    if (mirror.ok && check.validate) {
      try {
        check.validate(mirror.payload);
      } catch (error) {
        mirrorValidationError = error instanceof Error ? error.message : String(error);
      }
    }
    if (mirror.ok && !mirrorValidationError) {
      console.log(`WARN  ${check.label} mirror healthy [${mirror.status}]`);
    } else {
      const message = JSON.stringify(mirror.payload);
      if (check.requireMirror) {
        failures += 1;
        console.error(`FAIL  ${check.label} [mirror ${mirror.status}]`, mirrorValidationError || mirror.payload);
      } else if (/BOOT_ERROR|Function failed to start/i.test(message)) {
        console.warn(`WARN  ${check.label} mirror boot error [${mirror.status}]`);
      } else {
        console.warn(`WARN  ${check.label} mirror unavailable [${mirror.status}]`);
      }
    }
  }
}

if (failures > 0) {
  process.exitCode = 1;
}

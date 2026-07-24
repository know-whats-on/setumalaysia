import { readFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve(process.argv[2] || 'dist');
const variant = normalizeVariant(process.env.APP_VARIANT || process.env.VITE_APP_VARIANT);

const familyApps = [
  {
    variant: 'ghar',
    label: 'SETU India AU',
    host: 'ghar.knowwhatson.com',
    appId: 'DRNJ459F42.com.ghar.mobile',
    androidPackage: 'com.ghar.mobile',
  },
  {
    variant: 'setu_china',
    label: 'SETU China',
    host: 'china.knowwhatson.com',
    appId: 'DRNJ459F42.com.setuchina.mobile',
    androidPackage: 'com.setuchina.mobile',
  },
  {
    variant: 'burb_mate',
    label: 'Hoodie',
    host: 'suburb.knowwhatson.com',
    appId: 'DRNJ459F42.com.burbmate.app',
    androidPackage: 'com.burbmate.app',
  },
  {
    variant: 'jom_settle',
    label: 'Senang AU',
    host: 'malaysia.knowwhatson.com',
    appId: 'DRNJ459F42.com.setumalaysia.mobile',
    androidPackage: 'com.setumalaysia.mobile',
  },
  {
    variant: 'wheres_wolli',
    label: "Where's Wolli",
    host: 'wolli.knowwhatson.com',
    appId: 'DRNJ459F42.com.whereswolli.mobile',
    androidPackage: 'com.whereswolli.mobile',
  },
];

const expectedApps = orderFamilyAppsForVariant(variant);
const expected = expectedApps[0];

await verifyAppleAssociation('apple-app-site-association');
await verifyAppleAssociation(path.join('.well-known', 'apple-app-site-association'));
await verifyAndroidAssetLinks(path.join('.well-known', 'assetlinks.json'));

console.log(
  `App-link association verification passed for ${variant} (${expected.appId}, ${expected.androidPackage}) plus ${expectedApps.length - 1} sibling apps`,
);

async function verifyAppleAssociation(relativePath) {
  const filePath = path.join(outDir, relativePath);
  const payload = await readJson(filePath);
  const details = Array.isArray(payload?.applinks?.details) ? payload.applinks.details : [];
  const appIds = details.map((detail) => String(detail?.appID || ''));
  const expectedAppIds = expectedApps.map((config) => config.appId);

  assert(
    sameOrderedValues(appIds, expectedAppIds),
    `${relativePath} appID order is ${appIds.join(', ') || '(empty)'}, expected ${expectedAppIds.join(', ')}`,
  );

  details.forEach((detail) => {
    const appId = String(detail?.appID || '');
    const paths = (Array.isArray(detail?.paths) ? detail.paths : []).map((entry) => String(entry || ''));
    assert(
      paths.includes('/share/*'),
      `${relativePath} does not include /share/* for ${appId}`,
    );
    assert(
      paths.includes('/games'),
      `${relativePath} does not include /games for ${appId}`,
    );
  });
}

async function verifyAndroidAssetLinks(relativePath) {
  const filePath = path.join(outDir, relativePath);
  const payload = await readJson(filePath);
  const entries = Array.isArray(payload) ? payload : [];
  const packages = entries.map((entry) => String(entry?.target?.package_name || ''));
  const expectedPackages = expectedApps.map((config) => config.androidPackage);

  assert(
    sameOrderedValues(packages, expectedPackages),
    `${relativePath} package order is ${packages.join(', ') || '(empty)'}, expected ${expectedPackages.join(', ')}`,
  );
}

async function readJson(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(process.cwd(), filePath)}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path.relative(process.cwd(), filePath)}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`App-link association verification failed: ${message}`);
  }
}

function sameOrderedValues(actual, expectedValues) {
  return actual.length === expectedValues.length && actual.every((value, index) => value === expectedValues[index]);
}

function orderFamilyAppsForVariant(selectedVariant) {
  const nativeIndex = familyApps.findIndex((config) => config.variant === selectedVariant);
  if (nativeIndex < 0) return familyApps;
  return [
    familyApps[nativeIndex],
    ...familyApps.slice(0, nativeIndex),
    ...familyApps.slice(nativeIndex + 1),
  ];
}

function normalizeVariant(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'burb_mate' || normalized === 'burb-mate' || normalized === 'burbmate') {
    return 'burb_mate';
  }
  if (normalized === 'setu_china' || normalized === 'setu-china' || normalized === 'setuchina' || normalized === 'china') {
    return 'setu_china';
  }
  if (normalized === 'jom_settle' || normalized === 'jom-settle' || normalized === 'jomsettle' || normalized === 'malaysia') {
    return 'jom_settle';
  }
  if (
    normalized === 'wheres_wolli' ||
    normalized === 'wheres-wolli' ||
    normalized === 'whereswolli' ||
    normalized === 'wolli'
  ) {
    return 'wheres_wolli';
  }
  return 'ghar';
}

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve(process.argv[2] || 'dist');
const variant = normalizeVariant(process.env.APP_VARIANT || process.env.VITE_APP_VARIANT);

const commonPaths = [
  '/arrival',
  '/dashboard',
  '/delete-account',
  '/legal',
  '/legal/*',
  '/notifications',
  '/profile',
  '/setu',
  '/share/*',
  '/invite/*',
  '/events/*',
  '/guides/*',
  '/guide/*',
  '/suburb/*',
  '/plans/*',
  '/profile/*',
  '/vibe',
  '/vibe/*',
];
const releaseFingerprint = '69:27:06:B2:07:6E:0E:A9:EC:69:86:F7:1B:7E:BB:2D:84:58:2B:49:C6:4A:3D:20:AC:F6:04:58:B0:2F:F2:C8';
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
const orderedFamilyApps = orderFamilyAppsForVariant(variant);
const nativeConfig = orderedFamilyApps[0];

const appleAssociation = {
  applinks: {
    apps: [],
    details: orderedFamilyApps.map((config) => ({
      appID: config.appId,
      paths: commonPaths,
    })),
  },
};

const androidAssetLinks = orderedFamilyApps.map((config) => ({
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: config.androidPackage,
    sha256_cert_fingerprints: [releaseFingerprint],
  },
}));

await writeJson(path.join(outDir, 'apple-app-site-association'), appleAssociation);
await writeJson(path.join(outDir, '.well-known', 'apple-app-site-association'), appleAssociation);
await writeJson(path.join(outDir, '.well-known', 'assetlinks.json'), androidAssetLinks);

console.log(
  `App-link association files written for ${variant} (${nativeConfig.appId}, ${nativeConfig.androidPackage}) plus ${orderedFamilyApps.length - 1} sibling apps`,
);

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

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(`${filePath}`, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

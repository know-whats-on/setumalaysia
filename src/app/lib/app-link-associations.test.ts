import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const familyApps = [
  {
    variant: 'ghar',
    appId: 'DRNJ459F42.com.ghar.mobile',
    androidPackage: 'com.ghar.mobile',
  },
  {
    variant: 'setu_china',
    appId: 'DRNJ459F42.com.setuchina.mobile',
    androidPackage: 'com.setuchina.mobile',
  },
  {
    variant: 'burb_mate',
    appId: 'DRNJ459F42.com.burbmate.app',
    androidPackage: 'com.burbmate.app',
  },
  {
    variant: 'jom_settle',
    appId: 'DRNJ459F42.com.setumalaysia.mobile',
    androidPackage: 'com.setumalaysia.mobile',
  },
  {
    variant: 'wheres_wolli',
    appId: 'DRNJ459F42.com.whereswolli.mobile',
    androidPackage: 'com.whereswolli.mobile',
  },
];

describe('app-link association generation', () => {
  it('publishes all family apps with the host-native app first', () => {
    for (const app of familyApps) {
      const outDir = mkdtempSync(path.join(tmpdir(), `ghar-app-links-${app.variant}-`));
      try {
        execFileSync('node', ['scripts/write-app-link-associations.mjs', outDir], {
          cwd: process.cwd(),
          env: { ...process.env, APP_VARIANT: app.variant },
          stdio: 'pipe',
        });
        execFileSync('node', ['scripts/verify-app-link-associations.mjs', outDir], {
          cwd: process.cwd(),
          env: { ...process.env, APP_VARIANT: app.variant },
          stdio: 'pipe',
        });

        const expectedAppIds = orderedForVariant(app.variant).map((entry) => entry.appId);
        const expectedPackages = orderedForVariant(app.variant).map((entry) => entry.androidPackage);
        const appleAssociation = JSON.parse(readFileSync(path.join(outDir, 'apple-app-site-association'), 'utf8'));
        const androidAssetLinks = JSON.parse(readFileSync(path.join(outDir, '.well-known', 'assetlinks.json'), 'utf8'));

        expect(appleAssociation.applinks.details.map((entry: { appID: string }) => entry.appID)).toEqual(expectedAppIds);
        expect(
          appleAssociation.applinks.details.every((entry: { paths: string[] }) => entry.paths.includes('/games')),
        ).toBe(true);
        expect(androidAssetLinks.map((entry: { target: { package_name: string } }) => entry.target.package_name)).toEqual(
          expectedPackages,
        );
      } finally {
        rmSync(outDir, { recursive: true, force: true });
      }
    }
  });
});

function orderedForVariant(variant: string) {
  const index = familyApps.findIndex((entry) => entry.variant === variant);
  return [familyApps[index], ...familyApps.slice(0, index), ...familyApps.slice(index + 1)];
}

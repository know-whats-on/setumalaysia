import { describe, expect, it } from 'vitest';
import worker from '../../../cloudflare/wolli-app-shell-proxy/src/index.js';

const expectedAppIds = [
  'DRNJ459F42.com.whereswolli.mobile',
  'DRNJ459F42.com.ghar.mobile',
  'DRNJ459F42.com.setuchina.mobile',
  'DRNJ459F42.com.burbmate.app',
  'DRNJ459F42.com.setumalaysia.mobile',
];
const expectedPackages = [
  'com.whereswolli.mobile',
  'com.ghar.mobile',
  'com.setuchina.mobile',
  'com.burbmate.app',
  'com.setumalaysia.mobile',
];

describe('Wolli app shell proxy app-link metadata', () => {
  it('serves every trusted iOS app ID with Wolli first', async () => {
    for (const pathname of ['/apple-app-site-association', '/.well-known/apple-app-site-association']) {
      const response = await worker.fetch(new Request(`https://wolli.knowwhatson.com${pathname}`), {});
      const payload = await response.json();

      expect(response.headers.get('content-type')).toContain('application/json');
      expect(payload.applinks.details.map((entry: { appID: string }) => entry.appID)).toEqual(expectedAppIds);
      expect(payload.applinks.details.every((entry: { paths: string[] }) => entry.paths.includes('/share/*'))).toBe(true);
    }
  });

  it('serves every trusted Android package with Wolli first', async () => {
    const response = await worker.fetch(new Request('https://wolli.knowwhatson.com/.well-known/assetlinks.json'), {});
    const payload = await response.json();

    expect(response.headers.get('content-type')).toContain('application/json');
    expect(payload.map((entry: { target: { package_name: string } }) => entry.target.package_name)).toEqual(
      expectedPackages,
    );
    expect(
      payload.every((entry: { relation: string[] }) => entry.relation.includes('delegate_permission/common.handle_all_urls')),
    ).toBe(true);
  });
});

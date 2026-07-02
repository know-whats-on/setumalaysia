import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import plist from 'plist';
import { describe, expect, it } from 'vitest';

const familyApps = [
  {
    variant: 'ghar',
    host: 'ghar.knowwhatson.com',
    entitlementsFile: 'ios/App/App/App.entitlements',
    androidManifestFile: 'android/app/src/ghar/AndroidManifest.xml',
  },
  {
    variant: 'setu_china',
    host: 'china.knowwhatson.com',
    entitlementsFile: 'ios/App/App/SetuChinaAssociatedDomains.entitlements',
    androidManifestFile: 'android/app/src/setuChina/AndroidManifest.xml',
  },
  {
    variant: 'burb_mate',
    host: 'suburb.knowwhatson.com',
    entitlementsFile: 'ios/App/App/HoodieAssociatedDomains.entitlements',
    androidManifestFile: 'android/app/src/burbMate/AndroidManifest.xml',
  },
  {
    variant: 'jom_settle',
    host: 'malaysia.knowwhatson.com',
    entitlementsFile: 'ios/App/App/JomSettleAssociatedDomains.entitlements',
    androidManifestFile: 'android/app/src/jomSettle/AndroidManifest.xml',
  },
  {
    variant: 'wheres_wolli',
    host: 'wolli.knowwhatson.com',
    entitlementsFile: 'ios/App/App/WheresWolliAssociatedDomains.entitlements',
    androidManifestFile: 'android/app/src/wheresWolli/AndroidManifest.xml',
  },
];

const expectedPathPrefixes = [
  '/arrival',
  '/dashboard',
  '/delete-account',
  '/events',
  '/guide',
  '/guides',
  '/invite',
  '/legal',
  '/notifications',
  '/plans',
  '/profile',
  '/setu',
  '/share',
  '/suburb',
  '/vibe',
];

describe('native app-link claims', () => {
  it('includes every trusted app-link host in iOS entitlements with the native host first', () => {
    for (const app of familyApps) {
      const entitlements = plist.parse(readSource(app.entitlementsFile)) as {
        'com.apple.developer.associated-domains'?: string[];
      };

      expect(entitlements['com.apple.developer.associated-domains']).toEqual(
        orderedHostsForVariant(app.variant).map((host) => `applinks:${host}`),
      );
    }
  });

  it('includes verified Android HTTPS filters for every trusted host and internal path prefix', () => {
    for (const app of familyApps) {
      const manifest = new DOMParser().parseFromString(readSource(app.androidManifestFile), 'application/xml');
      const appLinkFilter = elements(manifest, 'intent-filter').find(
        (filter) => filter.getAttribute('android:autoVerify') === 'true',
      );

      expect(appLinkFilter, app.variant).toBeDefined();
      expect(attributes(elements(appLinkFilter!, 'action'), 'android:name')).toContain('android.intent.action.VIEW');
      expect(attributes(elements(appLinkFilter!, 'category'), 'android:name')).toEqual([
        'android.intent.category.DEFAULT',
        'android.intent.category.BROWSABLE',
      ]);

      const dataElements = elements(appLinkFilter!, 'data');
      expect(attributes(dataElements, 'android:scheme')).toEqual(['https']);
      expect(attributes(dataElements, 'android:host')).toEqual(orderedHostsForVariant(app.variant));
      expect(attributes(dataElements, 'android:pathPrefix')).toEqual(expectedPathPrefixes);
    }
  });
});

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function orderedHostsForVariant(variant: string) {
  const index = familyApps.findIndex((entry) => entry.variant === variant);
  return [familyApps[index].host, ...familyApps.slice(0, index).map((entry) => entry.host), ...familyApps.slice(index + 1).map((entry) => entry.host)];
}

function elements(root: Document | Element, tagName: string) {
  return Array.from(root.getElementsByTagName(tagName));
}

function attributes(nodes: Element[], attribute: string) {
  return nodes.map((node) => node.getAttribute(attribute)).filter((value): value is string => Boolean(value));
}

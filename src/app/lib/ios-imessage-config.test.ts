import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function readWorkspaceFile(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function extractSetuCase(script: string) {
  const match = script.match(/\*\)\n([\s\S]*?)\n\s*;;/);
  expect(match, 'SETU default case should exist').toBeTruthy();
  return match?.[1] ?? '';
}

function extractSetuChinaCase(script: string) {
  const match = script.match(/setu_china\|setu-china\|setuchina\|china\)\n([\s\S]*?)\n\s*;;/);
  expect(match, 'SETU China case should exist').toBeTruthy();
  return match?.[1] ?? '';
}

function extractPngDimensions(relativePath: string) {
  const bytes = readFileSync(join(root, relativePath));
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}

const expectedIMessageIconDimensions: Record<string, { width: number; height: number }> = {
  'messages-27x20@2x.png': { width: 54, height: 40 },
  'messages-27x20@3x.png': { width: 81, height: 60 },
  'messages-32x24@1x.png': { width: 32, height: 24 },
  'messages-32x24@2x.png': { width: 64, height: 48 },
  'messages-32x24@3x.png': { width: 96, height: 72 },
  'messages-marketing-1024x768.png': { width: 1024, height: 768 },
  'settings-29x29@1x.png': { width: 29, height: 29 },
  'settings-29x29@2x.png': { width: 58, height: 58 },
  'settings-29x29@3x.png': { width: 87, height: 87 },
  'iphone-60x45@2x.png': { width: 120, height: 90 },
  'iphone-60x45@3x.png': { width: 180, height: 135 },
  'ipad-67x50@1x.png': { width: 67, height: 50 },
  'ipad-67x50@2x.png': { width: 134, height: 100 },
  'ipad-pro-74x55@2x.png': { width: 148, height: 110 },
};

function expectCompleteIMessageIconSet(assetDir: string) {
  const contentsPath = join(root, assetDir, 'Contents.json');
  expect(existsSync(contentsPath)).toBe(true);

  const contents = JSON.parse(readFileSync(contentsPath, 'utf8')) as {
    images: Array<{ filename?: string }>;
  };
  const filenames = contents.images.map((image) => image.filename).filter(Boolean) as string[];

  expect(new Set(filenames)).toEqual(new Set(Object.keys(expectedIMessageIconDimensions)));
  for (const [filename, dimensions] of Object.entries(expectedIMessageIconDimensions)) {
    expect(extractPngDimensions(join(assetDir, filename))).toEqual(dimensions);
  }
}

describe('SETU iMessage extension configuration', () => {
  it('embeds the Messages extension for SETU installs and archives with variant icons', () => {
    const installScript = readWorkspaceFile('scripts/install-ios-device.sh');
    const archiveScript = readWorkspaceFile('scripts/build-ios-app-store-archive.sh');

    for (const script of [installScript, archiveScript]) {
      const setuCase = extractSetuCase(script);
      expect(setuCase).toContain('APP_BUNDLE_IDENTIFIER="com.ghar.mobile"');
      expect(setuCase).toContain('MESSAGES_APP_ICON_NAME="SETU iMessage App Icon"');
      expect(setuCase).toContain('INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"');

      const setuChinaCase = extractSetuChinaCase(script);
      expect(setuChinaCase).toContain('APP_BUNDLE_IDENTIFIER="com.setuchina.mobile"');
      expect(setuChinaCase).toContain('MESSAGES_APP_ICON_NAME="SETU China iMessage App Icon"');
      expect(setuChinaCase).toContain('INCLUDE_HOODIE_MESSAGES_EXTENSION="YES"');

      expect(script).toContain('MESSAGES_APP_ICON_NAME="$MESSAGES_APP_ICON_NAME"');
    }

    expect(archiveScript).toContain('EXPECTED_EXTENSION_BUNDLE_ID="$APP_BUNDLE_IDENTIFIER.messages"');
    expect(archiveScript).toContain('ACTUAL_EXTENSION_DISPLAY_NAME');
  });

  it('uses a variant-driven Messages icon build setting and keeps extension bundle IDs host-derived', () => {
    const project = readWorkspaceFile('ios/App/App.xcodeproj/project.pbxproj');

    expect(countOccurrences(project, 'INCLUDE_HOODIE_MESSAGES_EXTENSION = YES;')).toBe(2);
    expect(countOccurrences(project, 'ASSETCATALOG_COMPILER_APPICON_NAME = "$(MESSAGES_APP_ICON_NAME)";')).toBe(2);
    expect(countOccurrences(project, 'MESSAGES_APP_ICON_NAME = "iMessage App Icon";')).toBe(2);
    expect(countOccurrences(project, 'PRODUCT_BUNDLE_IDENTIFIER = "$(APP_BUNDLE_IDENTIFIER).messages";')).toBe(2);
  });

  it('has a complete SETU iMessage icon asset set without changing the Hoodie icon set', () => {
    expectCompleteIMessageIconSet('ios/App/App/Assets.xcassets/SETU iMessage App Icon.stickersiconset');
    expectCompleteIMessageIconSet('ios/App/App/Assets.xcassets/SETU China iMessage App Icon.stickersiconset');

    expect(existsSync(join(root, 'ios/App/App/Assets.xcassets/iMessage App Icon.stickersiconset/Contents.json'))).toBe(true);
  });

  it('enables My Network for SETU through the shared extension capability gate', () => {
    const store = readWorkspaceFile('ios/App/App/HoodieMessagesExtension/HouseholdMessagesStore.swift');
    const rootView = readWorkspaceFile('ios/App/App/HoodieMessagesExtension/HouseholdMessagesRootView.swift');

    expect(store).toContain('var supportsMyNetwork: Bool');
    expect(store).toContain('HouseholdMessagesAppConfig.appVariant == "ghar"');
    expect(store).toContain('HouseholdMessagesAppConfig.appVariant == "burb_mate"');
    expect(store).not.toContain('isHoodieVariant');
    expect(rootView).toContain('store.supportsMyNetwork');
    expect(rootView).not.toContain('store.isHoodieVariant');
  });
});

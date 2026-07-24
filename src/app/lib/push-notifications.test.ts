import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAppConfig } = vi.hoisted(() => ({
  mockAppConfig: {
    displayName: 'SETU India AU',
    shareBaseUrl: 'https://ghar.knowwhatson.com',
    inviteBaseUrl: 'https://ghar.knowwhatson.com',
    marketingUrl: 'https://ghar.knowwhatson.com',
    urlScheme: 'com.ghar.mobile',
    variant: 'ghar',
  },
}));

vi.mock('./app-config', () => ({
  APP_CONFIG: mockAppConfig,
}));

vi.mock('./app-variant', () => ({
  APP_VARIANT: 'ghar',
}));

vi.mock('./api', () => ({
  fetchRentalHistory: vi.fn(),
  registerPushDevice: vi.fn(),
  unregisterPushDevice: vi.fn(),
}));

vi.mock('./platform', () => ({
  getNativePlatform: () => 'ios',
  isNativeShell: () => false,
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

import { normalizeIncomingRoute, readPushRoute } from './push-notifications';
import { buildVibeEventsDeepLink, buildVibeEventsRoute } from './vibe-event-deep-links';

function resetMockAppConfig() {
  mockAppConfig.displayName = 'SETU India AU';
  mockAppConfig.shareBaseUrl = 'https://ghar.knowwhatson.com';
  mockAppConfig.inviteBaseUrl = 'https://ghar.knowwhatson.com';
  mockAppConfig.marketingUrl = 'https://ghar.knowwhatson.com';
  mockAppConfig.urlScheme = 'com.ghar.mobile';
  mockAppConfig.variant = 'ghar';
}

const familyVariantConfigs = [
  {
    displayName: 'SETU India AU',
    host: 'ghar.knowwhatson.com',
    urlScheme: 'com.ghar.mobile',
    variant: 'ghar',
  },
  {
    displayName: '留澳助手 AU',
    host: 'china.knowwhatson.com',
    urlScheme: 'com.setuchina.mobile',
    variant: 'setu_china',
  },
  {
    displayName: 'Hoodie',
    host: 'suburb.knowwhatson.com',
    urlScheme: 'com.burbmate.app',
    variant: 'burb_mate',
  },
  {
    displayName: 'Senang AU',
    host: 'malaysia.knowwhatson.com',
    urlScheme: 'com.setumalaysia.mobile',
    variant: 'jom_settle',
  },
  {
    displayName: "Where's Wolli",
    host: 'wolli.knowwhatson.com',
    urlScheme: 'com.whereswolli.mobile',
    variant: 'wheres_wolli',
  },
];

function useMockVariant(config: (typeof familyVariantConfigs)[number]) {
  mockAppConfig.displayName = config.displayName;
  mockAppConfig.shareBaseUrl = `https://${config.host}`;
  mockAppConfig.inviteBaseUrl = `https://${config.host}`;
  mockAppConfig.marketingUrl = `https://${config.host}`;
  mockAppConfig.urlScheme = config.urlScheme;
  mockAppConfig.variant = config.variant;
}

function readRouteSearchParams(route: string) {
  return new URL(route, 'https://app.local').searchParams;
}

describe('buildVibeEventsDeepLink', () => {
  beforeEach(() => {
    resetMockAppConfig();
  });

  it('builds app-specific Vibe Events campaign links with arbitrary category and tag facet ids', () => {
    mockAppConfig.shareBaseUrl = 'https://suburb.knowwhatson.com/';

    const deepLink = buildVibeEventsDeepLink({
      categories: ['food-drink', ' indoor ', '', 'food-drink'],
      tags: ['sydney-writers-festival', 'author-talks'],
      sourceMode: 'official',
    });

    const url = new URL(deepLink);
    expect(url.origin).toBe('https://suburb.knowwhatson.com');
    expect(url.pathname).toBe('/vibe');
    expect(url.searchParams.get('section')).toBe('events');
    expect(url.searchParams.get('events_tab')).toBe('whatson');
    expect(url.searchParams.get('events_source_mode')).toBe('official');
    expect(url.searchParams.get('events_types')).toBe('food-drink,indoor');
    expect(url.searchParams.get('events_tags')).toBe('sydney-writers-festival,author-talks');
  });

  it('can build a relative Vibe Events route when no app host is configured', () => {
    mockAppConfig.shareBaseUrl = '';
    mockAppConfig.marketingUrl = '';
    mockAppConfig.inviteBaseUrl = '';

    const route = buildVibeEventsDeepLink({
      categories: ['workshops'],
      tags: ['free'],
    });

    expect(route).toBe(buildVibeEventsRoute({ categories: ['workshops'], tags: ['free'] }));
    const params = readRouteSearchParams(route);
    expect(params.get('section')).toBe('events');
    expect(params.get('events_tab')).toBe('whatson');
    expect(params.get('events_types')).toBe('workshops');
    expect(params.get('events_tags')).toBe('free');
    expect(params.has('events_source_mode')).toBe(false);
  });
});

describe('normalizeIncomingRoute', () => {
  beforeEach(() => {
    resetMockAppConfig();
  });

  it('keeps SETU household bill links on the household route', () => {
    expect(
      normalizeIncomingRoute(
        'https://ghar.knowwhatson.com/profile?tab=household&bill_id=bill-123&payment_id=pay-456',
      ),
    ).toBe('/profile?tab=household&bill_id=bill-123&payment_id=pay-456');
  });

  it('keeps SETU household chore and notification links on the household route', () => {
    expect(
      normalizeIncomingRoute(
        'https://ghar.knowwhatson.com/profile?tab=household&chore_id=chore-123&notification_id=note-456',
      ),
    ).toBe('/profile?tab=household&chore_id=chore-123&notification_id=note-456');
  });

  it('maps SETU share links to in-app event and plan routes', () => {
    expect(
      normalizeIncomingRoute('https://ghar.knowwhatson.com/share/event/cityofsydney/laneway-festival'),
    ).toBe('/events/cityofsydney/laneway-festival');
    expect(
      normalizeIncomingRoute('https://ghar.knowwhatson.com/share/plan/cityofsydney/laneway-festival/plan-42'),
    ).toBe('/events/cityofsydney/laneway-festival?plan=plan-42');
  });

  it('keeps SETU custom scheme routes intact', () => {
    expect(
      normalizeIncomingRoute('com.ghar.mobile://profile?tab=household&chore_id=chore-123'),
    ).toBe('/profile?tab=household&chore_id=chore-123');
    expect(
      normalizeIncomingRoute('com.ghar.mobile:///guides/free-electricity-australia-2026?source=app-link'),
    ).toBe('/guides/free-electricity-australia-2026?source=app-link');
  });

  it('keeps known SETU app routes from app-owned links', () => {
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/dashboard')).toBe('/dashboard');
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/guides/free-electricity-australia-2026')).toBe(
      '/guides/free-electricity-australia-2026',
    );
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/plans/private-plan-1?source=push')).toBe(
      '/plans/private-plan-1?source=push',
    );
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/notifications')).toBe('/notifications');
    expect(
      normalizeIncomingRoute('https://malaysia.knowwhatson.com/games?game=paper-io-2'),
    ).toBe('/games?game=paper-io-2');
    expect(normalizeIncomingRoute('/household/expenses')).toBe('/household/expenses');
    expect(normalizeIncomingRoute('legal/listing-1?section=legal')).toBe('/legal/listing-1?section=legal');
  });

  it('keeps Vibe Alerts app links on the alerts section with or without a trailing slash', () => {
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/vibe?section=alerts')).toBe('/vibe?section=alerts');
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/vibe/?section=alerts')).toBe('/vibe?section=alerts');
    expect(normalizeIncomingRoute('https://suburb.knowwhatson.com/vibe?section=alerts')).toBe('/vibe?section=alerts');
    expect(normalizeIncomingRoute('https://suburb.knowwhatson.com/vibe/?section=alerts')).toBe('/vibe?section=alerts');
  });

  it('keeps Vibe Events campaign filters from app-owned HTTPS and custom-scheme links', () => {
    const deepLink = buildVibeEventsDeepLink({
      categories: ['food-drink', 'indoor'],
      tags: ['sydney-writers-festival', 'author-talks'],
      sourceMode: 'official',
    });
    const httpsRoute = normalizeIncomingRoute(deepLink);
    const nativeRoute = normalizeIncomingRoute(`com.ghar.mobile://vibe?${new URL(deepLink).searchParams.toString()}`);

    expect(httpsRoute.startsWith('/vibe?')).toBe(true);
    expect(nativeRoute.startsWith('/vibe?')).toBe(true);

    for (const route of [httpsRoute, nativeRoute]) {
      const params = readRouteSearchParams(route);
      expect(params.get('section')).toBe('events');
      expect(params.get('events_tab')).toBe('whatson');
      expect(params.get('events_source_mode')).toBe('official');
      expect(params.get('events_types')).toBe('food-drink,indoor');
      expect(params.get('events_tags')).toBe('sydney-writers-festival,author-talks');
    }
  });

  it('does not turn external IAM links into internal routes', () => {
    expect(normalizeIncomingRoute('https://example.com/coffee-offer')).toBe('');
    expect(normalizeIncomingRoute('https://maps.apple.com/?q=Sydney')).toBe('');
  });

  it('does not turn unknown app-domain IAM links into internal routes', () => {
    expect(normalizeIncomingRoute('https://ghar.knowwhatson.com/coffee-offer')).toBe('');
    expect(normalizeIncomingRoute('https://suburb.knowwhatson.com/campaigns/latte')).toBe('');
  });

  it('drops unknown custom-scheme routes before they reach React Router', () => {
    expect(normalizeIncomingRoute('com.ghar.mobile://campaigns/latte')).toBe('');
  });

  it('maps Hoodie household invite shares to the rules declaration accept flow', () => {
    mockAppConfig.displayName = 'Hoodie';
    mockAppConfig.shareBaseUrl = 'https://suburb.knowwhatson.com';
    mockAppConfig.urlScheme = 'com.burbmate.app';

    expect(
      normalizeIncomingRoute('https://suburb.knowwhatson.com/share/household-invite/invite-token-1'),
    ).toBe('/profile?tab=household&invite=invite-token-1&invite_intent=accept');
  });

  it('maps the Hoodie Starbucks IAM share link to the event detail route', () => {
    mockAppConfig.displayName = 'Hoodie';
    mockAppConfig.shareBaseUrl = 'https://suburb.knowwhatson.com';
    mockAppConfig.urlScheme = 'com.burbmate.app';

    expect(
      normalizeIncomingRoute('https://suburb.knowwhatson.com/share/event/cityofsydney/starbucks-matcha-bogo-2026'),
    ).toBe('/events/cityofsydney/starbucks-matcha-bogo-2026');
  });

  it('keeps Hoodie custom-scheme app routes intact', () => {
    mockAppConfig.displayName = 'Hoodie';
    mockAppConfig.shareBaseUrl = 'https://suburb.knowwhatson.com';
    mockAppConfig.urlScheme = 'com.burbmate.app';

    expect(
      normalizeIncomingRoute('com.burbmate.app://events/cityofsydney/laneway-festival?source=iam'),
    ).toBe('/events/cityofsydney/laneway-festival?source=iam');
    expect(
      normalizeIncomingRoute('com.burbmate.app:///guides/free-electricity-australia-2026'),
    ).toBe('/guides/free-electricity-australia-2026');
  });

  it('keeps House Rules notification deep links on the rules tab', () => {
    mockAppConfig.displayName = 'Hoodie';
    mockAppConfig.shareBaseUrl = 'https://suburb.knowwhatson.com';
    mockAppConfig.urlScheme = 'com.burbmate.app';

    expect(normalizeIncomingRoute('https://suburb.knowwhatson.com/guides/free-electricity-australia-2026')).toBe(
      '/guides/free-electricity-australia-2026',
    );
    expect(
      normalizeIncomingRoute('https://suburb.knowwhatson.com/profile?tab=household&household_tab=rules&household_source=push'),
    ).toBe('/profile?tab=household&household_tab=rules&household_source=push');
  });

  it('accepts trusted family hosts and schemes from every app variant', () => {
    for (const appConfig of familyVariantConfigs) {
      useMockVariant(appConfig);

      for (const familyConfig of familyVariantConfigs) {
        expect(normalizeIncomingRoute(`https://${familyConfig.host}/events/cityofsydney/laneway-festival`)).toBe(
          '/events/cityofsydney/laneway-festival',
        );
        expect(normalizeIncomingRoute(`https://${familyConfig.host}/share/event/cityofsydney/laneway-festival`)).toBe(
          '/events/cityofsydney/laneway-festival',
        );
      }

      for (const familyConfig of familyVariantConfigs) {
        expect(normalizeIncomingRoute(`${familyConfig.urlScheme}:///guides/free-electricity-australia-2026`)).toBe(
          '/guides/free-electricity-australia-2026',
        );
      }
    }
  });

  it('keeps SETU China-specific links while accepting sibling family hosts', () => {
    useMockVariant(familyVariantConfigs[1]);

    expect(
      normalizeIncomingRoute(
        'https://china.knowwhatson.com/share/event/arcunsw/2026-plamosoc-build-social-term-2-week-3-65763',
      ),
    ).toBe('/events/arcunsw/2026-plamosoc-build-social-term-2-week-3-65763');
    expect(
      normalizeIncomingRoute(
        'https://china.knowwhatson.com/share/plan/arcunsw/2026-plamosoc-build-social-term-2-week-3-65763/plan-99',
      ),
    ).toBe('/events/arcunsw/2026-plamosoc-build-social-term-2-week-3-65763?plan=plan-99');
    expect(
      normalizeIncomingRoute('https://china.knowwhatson.com/share/guide/sydney/free-electricity-australia-2026'),
    ).toBe('/guide/sydney/free-electricity-australia-2026');
    expect(
      normalizeIncomingRoute(
        'https://china.knowwhatson.com/vibe?section=events&events_tab=whatson&events_types=workshops&events_tags=mandarin',
      ),
    ).toBe('/vibe?section=events&events_tab=whatson&events_types=workshops&events_tags=mandarin');
    expect(
      normalizeIncomingRoute('com.setuchina.mobile://vibe?section=events&events_tab=whatson&events_tags=mandarin'),
    ).toBe('/vibe?section=events&events_tab=whatson&events_tags=mandarin');
    expect(
      readPushRoute({
        data: {
          link: 'https://ghar.knowwhatson.com/share/event/arcunsw/2026-plamosoc-build-social-term-2-week-3-65763',
        },
      }),
    ).toBe('/events/arcunsw/2026-plamosoc-build-social-term-2-week-3-65763');
  });

  it('keeps configured Senang AU Vibe Events campaign links on the Events section', () => {
    mockAppConfig.displayName = 'Senang AU';
    mockAppConfig.shareBaseUrl = 'https://malaysia.knowwhatson.com';
    mockAppConfig.inviteBaseUrl = 'https://malaysia.knowwhatson.com';
    mockAppConfig.marketingUrl = 'https://malaysia.knowwhatson.com';
    mockAppConfig.urlScheme = 'com.setumalaysia.mobile';
    mockAppConfig.variant = 'jom_settle';

    const deepLink = buildVibeEventsDeepLink({
      tags: ['orientation'],
    });
    const httpsRoute = normalizeIncomingRoute(deepLink);
    const nativeRoute = normalizeIncomingRoute(`com.setumalaysia.mobile://vibe?${new URL(deepLink).searchParams.toString()}`);

    expect(readRouteSearchParams(httpsRoute).get('events_tags')).toBe('orientation');
    expect(readRouteSearchParams(nativeRoute).get('events_tags')).toBe('orientation');
  });

  it('reads every push route alias duplicated by FCM and APNs payloads', () => {
    const expected = '/profile?tab=household&household_tab=activity&notification_id=note-456';
    const payloads = [
      { data: { route: expected } },
      { data: { link: expected } },
      { data: { deep_link: expected } },
      { data: { deeplink: expected } },
      { data: { path: expected } },
      { data: { data: { route: expected } } },
      { data: { data: { link: expected } } },
      { route: expected },
      { link: `https://ghar.knowwhatson.com${expected}` },
    ];

    for (const payload of payloads) {
      expect(readPushRoute(payload)).toBe(expected);
    }
  });
});

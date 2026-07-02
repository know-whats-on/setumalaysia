// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InAppPopupCampaignHost } from './in-app-popup-campaign';
import type { InAppPopupCampaignRecord } from '../lib/api';
import {
  buildInAppPopupSeenKey,
  resetInAppPopupRuntimeSessionForTests,
} from '../lib/in-app-popup-campaigns';
import {
  fetchActiveInAppPopupCampaigns,
  recordInAppPopupCampaignClick,
  recordInAppPopupCampaignImpression,
} from '../lib/api';

vi.mock('../lib/app-variant', () => ({
  APP_VARIANT: 'burb_mate',
  normalizeTargetableVariant: (value: unknown, fallback = 'all') => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'all' || normalized === 'ghar' || normalized === 'burb_mate' || normalized === 'setu_china' || normalized === 'jom_settle') {
      return normalized;
    }
    return fallback;
  },
}));

const appConfigState = vi.hoisted(() => ({
  config: {
    displayName: 'Hoodie',
    shareBaseUrl: 'https://suburb.knowwhatson.com',
    inviteBaseUrl: 'https://suburb.knowwhatson.com',
    marketingUrl: 'https://suburb.knowwhatson.com',
    urlScheme: 'com.burbmate.app',
    variant: 'burb_mate',
  },
}));

vi.mock('../lib/app-config', () => ({
  APP_CONFIG: appConfigState.config,
}));

vi.mock('../lib/api', () => ({
  fetchActiveInAppPopupCampaigns: vi.fn(),
  recordInAppPopupCampaignClick: vi.fn(),
  recordInAppPopupCampaignImpression: vi.fn(),
  fetchRentalHistory: vi.fn(),
  registerPushDevice: vi.fn(),
  unregisterPushDevice: vi.fn(),
}));

vi.mock('../lib/platform', () => ({
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

type MountedComponent = {
  container: HTMLDivElement;
  root: Root;
};

class MockPreloadImage {
  static instances: MockPreloadImage[] = [];
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  src = '';

  constructor() {
    MockPreloadImage.instances.push(this);
  }
}

const mountedComponents: MountedComponent[] = [];

function buildCampaign(overrides: Partial<InAppPopupCampaignRecord> = {}): InAppPopupCampaignRecord {
  return {
    id: 'popup-1',
    app_variant: 'burb_mate',
    title: 'Starbucks Matcha BOGO',
    image_url: 'https://example.com/starbucks-matcha-bogo-2026-feed.jpg',
    click_url: 'https://suburb.knowwhatson.com/share/event/cityofsydney/starbucks-matcha-bogo-2026',
    alt_text: 'Starbucks matcha offer poster',
    frequency: 'once',
    priority: 0,
    is_paused: false,
    ...overrides,
  };
}

function RouteProbe() {
  const location = useLocation();
  return <span data-testid="route-probe">{`${location.pathname}${location.search}`}</span>;
}

function renderPopup({ disabled = false, email = 'user@example.com' }: { disabled?: boolean; email?: string } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedComponents.push({ container, root });

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <InAppPopupCampaignHost disabled={disabled} email={email} />
        <RouteProbe />
      </MemoryRouter>,
    );
  });

  return container;
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('InAppPopupCampaignHost', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    resetInAppPopupRuntimeSessionForTests();
    MockPreloadImage.instances = [];
    vi.stubGlobal('Image', MockPreloadImage);
    vi.mocked(fetchActiveInAppPopupCampaigns).mockReset();
    vi.mocked(recordInAppPopupCampaignClick).mockReset();
    vi.mocked(recordInAppPopupCampaignImpression).mockReset();
    vi.mocked(recordInAppPopupCampaignClick).mockResolvedValue(null);
    vi.mocked(recordInAppPopupCampaignImpression).mockResolvedValue(null);
  });

  afterEach(async () => {
    for (const mounted of mountedComponents.splice(0)) {
      await act(async () => {
        mounted.root.unmount();
        await Promise.resolve();
      });
      mounted.container.remove();
    }
    document.body.innerHTML = '';
    window.localStorage.clear();
    resetInAppPopupRuntimeSessionForTests();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('fetches, preloads, shows, and tracks an eligible popup campaign', async () => {
    vi.mocked(fetchActiveInAppPopupCampaigns).mockResolvedValue([buildCampaign()]);

    renderPopup();
    await flushEffects();

    expect(fetchActiveInAppPopupCampaigns).toHaveBeenCalledWith('user@example.com');
    expect(document.querySelector('[data-testid="in-app-popup-campaign-poster"]')).toBeNull();
    expect(MockPreloadImage.instances).toHaveLength(1);

    await act(async () => {
      MockPreloadImage.instances[0].onload?.(new Event('load'));
      await Promise.resolve();
    });

    const poster = document.querySelector('[data-testid="in-app-popup-campaign-poster"]') as HTMLImageElement | null;
    expect(poster).toBeTruthy();
    expect(poster?.src).toContain('starbucks-matcha-bogo-2026-feed.jpg');
    expect(window.localStorage.getItem(buildInAppPopupSeenKey('popup-1', 'once'))).toBe('true');
    expect(recordInAppPopupCampaignImpression).toHaveBeenCalledWith('popup-1');
  });

  it('records a click and navigates app-owned links in-app', async () => {
    vi.mocked(fetchActiveInAppPopupCampaigns).mockResolvedValue([buildCampaign()]);
    const container = renderPopup();
    await flushEffects();

    await act(async () => {
      MockPreloadImage.instances[0].onload?.(new Event('load'));
      await Promise.resolve();
    });

    const posterButton = document.querySelector('button[aria-label="Open Starbucks Matcha BOGO"]');
    expect(posterButton).toBeTruthy();

    await act(async () => {
      posterButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await flushEffects();

    expect(recordInAppPopupCampaignClick).toHaveBeenCalledWith('popup-1');
    expect(container.querySelector('[data-testid="route-probe"]')?.textContent).toBe(
      '/events/cityofsydney/starbucks-matcha-bogo-2026',
    );
  });

  it('does not fetch while disabled', () => {
    renderPopup({ disabled: true });

    expect(fetchActiveInAppPopupCampaigns).not.toHaveBeenCalled();
    expect(MockPreloadImage.instances).toHaveLength(0);
  });
});

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import type { InAppPopupCampaignRecord } from './api';
import {
  buildInAppPopupSeenKey,
  getInAppPopupLocalDayKey,
  hasSeenInAppPopupCampaign,
  markInAppPopupCampaignSeen,
  resetInAppPopupRuntimeSessionForTests,
  selectInAppPopupCampaign,
} from './in-app-popup-campaigns';

function buildCampaign(overrides: Partial<InAppPopupCampaignRecord> = {}): InAppPopupCampaignRecord {
  return {
    id: 'campaign-1',
    app_variant: 'burb_mate',
    title: 'Campaign',
    image_url: 'https://example.com/poster.jpg',
    click_url: '/events/cityofsydney/campaign',
    alt_text: 'Campaign poster',
    frequency: 'once',
    priority: 0,
    is_paused: false,
    ...overrides,
  };
}

describe('in-app popup campaigns', () => {
  afterEach(() => {
    window.localStorage.clear();
    resetInAppPopupRuntimeSessionForTests();
  });

  it('uses local day keys for daily campaigns', () => {
    const now = new Date('2026-06-22T10:30:00');

    expect(getInAppPopupLocalDayKey(now)).toBe('2026-06-22');
    expect(buildInAppPopupSeenKey('daily-1', 'daily', now)).toBe('ghar_iam_popup_seen_daily-1_2026-06-22');
  });

  it('marks once campaigns in local storage', () => {
    const campaign = buildCampaign({ id: 'once-1', frequency: 'once' });

    expect(hasSeenInAppPopupCampaign(campaign, { storage: window.localStorage })).toBe(false);

    markInAppPopupCampaignSeen(campaign, { storage: window.localStorage });

    expect(window.localStorage.getItem(buildInAppPopupSeenKey('once-1', 'once'))).toBe('true');
    expect(hasSeenInAppPopupCampaign(campaign, { storage: window.localStorage })).toBe(true);
  });

  it('tracks every-open campaigns for the current runtime only', () => {
    const campaign = buildCampaign({ id: 'runtime-1', frequency: 'every_open' });

    markInAppPopupCampaignSeen(campaign, { storage: window.localStorage });

    expect(window.localStorage.length).toBe(0);
    expect(hasSeenInAppPopupCampaign(campaign, { storage: window.localStorage })).toBe(true);
  });

  it('selects the first eligible campaign for the current app variant', () => {
    const campaigns = [
      buildCampaign({ id: 'setu-only', app_variant: 'ghar' }),
      buildCampaign({ id: 'hoodie', app_variant: 'burb_mate' }),
      buildCampaign({ id: 'all-apps', app_variant: 'all' }),
    ];

    expect(selectInAppPopupCampaign(campaigns, { appVariant: 'burb_mate', storage: window.localStorage })?.id).toBe('hoodie');
    expect(selectInAppPopupCampaign(campaigns, { appVariant: 'jom_settle', storage: window.localStorage })).toBeNull();
  });
});

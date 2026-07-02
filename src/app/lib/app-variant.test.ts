import { describe, expect, it } from 'vitest';
import { APP_VARIANTS, getAppVariantLabel, normalizeTargetableVariant } from './app-variant';
import { getAppConfig } from './app-config';

describe('Wheres Wolli app variant', () => {
  it('normalizes Wolli aliases and labels the variant', () => {
    expect(APP_VARIANTS).toContain('wheres_wolli');
    expect(normalizeTargetableVariant('wheres_wolli')).toBe('wheres_wolli');
    expect(normalizeTargetableVariant('wheres-wolli')).toBe('wheres_wolli');
    expect(normalizeTargetableVariant('whereswolli')).toBe('wheres_wolli');
    expect(normalizeTargetableVariant('wolli')).toBe('wheres_wolli');
    expect(getAppVariantLabel('wheres_wolli')).toBe("Where's Wolli");
  });

  it('exposes Bayside-local Wolli config without changing other variants', () => {
    const wolli = getAppConfig('wheres_wolli');
    const setuChina = getAppConfig('setu_china');

    expect(wolli.displayName).toBe("Where's Wolli");
    expect(wolli.assistantName).toBe('Wolli');
    expect(wolli.defaultCouncilSlug).toBe('bayside-council');
    expect(wolli.marketingUrl).toBe('https://wolli.knowwhatson.com');
    expect(wolli.urlScheme).toBe('com.whereswolli.mobile');
    expect(wolli.localSourceUrls?.news).toBe('https://www.bayside.nsw.gov.au/your-council/latest-news');
    expect(wolli.localSourceUrls?.events).toBe('https://www.bayside.nsw.gov.au/whats-on');
    expect(wolli.assistantProfile?.supportContext).toContain('official Bayside Council pages');
    expect(wolli.launchArt?.mascot).toContain('wolli-flying-mascot');
    expect(wolli.launchArt?.loadingBlip).toContain('wolli-loading-blip');

    expect(setuChina.displayName).toBe('留澳助手 AU');
    expect(setuChina.urlScheme).toBe('com.setuchina.mobile');
  });
});

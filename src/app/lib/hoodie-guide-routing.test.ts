import { describe, expect, it } from 'vitest';
import {
  findHoodieGuideBySlug,
  getHoodieGuideSelectionState,
  resolveHoodieGuideRoute,
} from './hoodie-guide-routing';

describe('hoodie guide routing', () => {
  const guides = [
    { slug: '10-best-cafes-to-work-from-in-adelaide' },
    { slug: '10-best-historical-places-in-adelaide' },
  ];

  it('resolves an exact shared guide slug to the guide detail route', () => {
    expect(
      resolveHoodieGuideRoute({
        citySlug: 'adelaide',
        guideSlug: '10-best-historical-places-in-adelaide',
        guides,
        isLoading: false,
      }),
    ).toEqual({
      status: 'resolved',
      route: '/vibe?section=vibe&vibe_tab=my-hood&city=adelaide&guide=10-best-historical-places-in-adelaide',
    });
  });

  it('falls back to the city guide list when the shared guide slug is missing', () => {
    expect(
      resolveHoodieGuideRoute({
        citySlug: 'adelaide',
        guideSlug: 'missing-guide',
        guides,
        isLoading: false,
      }),
    ).toEqual({
      status: 'fallback',
      route: '/vibe?section=vibe&vibe_tab=my-hood&city=adelaide',
    });
  });

  it('stays in resolving state until the city fetch has finished', () => {
    expect(
      resolveHoodieGuideRoute({
        citySlug: 'adelaide',
        guideSlug: '10-best-historical-places-in-adelaide',
        guides: [],
        isLoading: true,
      }),
    ).toEqual({
      status: 'resolving',
      route: null,
    });
  });

  it('keeps share-driven guide selection pending until the matching city has loaded', () => {
    expect(
      getHoodieGuideSelectionState({
        guideSlug: '10-best-historical-places-in-adelaide',
        selectedCity: 'adelaide',
        loadedCity: '',
        isLoading: false,
        hasActiveGuide: false,
      }),
    ).toBe('pending');

    expect(
      getHoodieGuideSelectionState({
        guideSlug: '10-best-historical-places-in-adelaide',
        selectedCity: 'adelaide',
        loadedCity: 'adelaide',
        isLoading: false,
        hasActiveGuide: false,
        hasError: true,
      }),
    ).toBe('pending');
  });

  it('marks guide selection missing only after the city data has loaded and no guide matches', () => {
    expect(
      getHoodieGuideSelectionState({
        guideSlug: '10-best-historical-places-in-adelaide',
        selectedCity: 'adelaide',
        loadedCity: 'adelaide',
        isLoading: false,
        hasActiveGuide: true,
      }),
    ).toBe('resolved');

    expect(
      getHoodieGuideSelectionState({
        guideSlug: '10-best-historical-places-in-adelaide',
        selectedCity: 'adelaide',
        loadedCity: 'adelaide',
        isLoading: false,
        hasActiveGuide: false,
      }),
    ).toBe('missing');
  });

  it('finds guide slugs case-insensitively for share-driven navigation', () => {
    expect(findHoodieGuideBySlug(guides, '10-BEST-HISTORICAL-PLACES-IN-ADELAIDE')).toEqual({
      slug: '10-best-historical-places-in-adelaide',
    });
  });
});

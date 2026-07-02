import type { CityGuide } from './api';
import { resolveHoodieGuidePathToVibeRoute } from './hoodie-share';

type GuideLike = Pick<CityGuide, 'slug'>;

export type HoodieGuideRouteResolutionStatus = 'resolving' | 'resolved' | 'fallback';
export type HoodieGuideSelectionState = 'idle' | 'pending' | 'resolved' | 'missing';

export type HoodieGuideRouteResolution =
  | {
      status: 'resolving';
      route: null;
    }
  | {
      status: 'resolved' | 'fallback';
      route: string;
    };

function normalizeGuideRoutingKey(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export function findHoodieGuideBySlug<T extends GuideLike>(guides: T[], guideSlug: string) {
  const normalizedGuideSlug = normalizeGuideRoutingKey(guideSlug);
  if (!normalizedGuideSlug) return null;

  return guides.find((guide) => normalizeGuideRoutingKey(guide.slug) === normalizedGuideSlug) || null;
}

export function getHoodieGuideSelectionState(input: {
  guideSlug: string;
  selectedCity: string;
  loadedCity: string;
  isLoading: boolean;
  hasActiveGuide: boolean;
  hasError?: boolean;
}): HoodieGuideSelectionState {
  if (!normalizeGuideRoutingKey(input.guideSlug)) return 'idle';
  if (!normalizeGuideRoutingKey(input.selectedCity)) return 'pending';
  if (input.isLoading || input.hasError) return 'pending';
  if (normalizeGuideRoutingKey(input.loadedCity) !== normalizeGuideRoutingKey(input.selectedCity)) return 'pending';
  return input.hasActiveGuide ? 'resolved' : 'missing';
}

export function resolveHoodieGuideRoute(input: {
  citySlug: string;
  guideSlug: string;
  guides: GuideLike[];
  isLoading: boolean;
}): HoodieGuideRouteResolution {
  const citySlug = String(input.citySlug || '').trim();
  const guideSlug = String(input.guideSlug || '').trim();

  if (!citySlug) {
    return {
      status: 'fallback',
      route: resolveHoodieGuidePathToVibeRoute('', null),
    };
  }

  if (input.isLoading) {
    return {
      status: 'resolving',
      route: null,
    };
  }

  const matchedGuide = findHoodieGuideBySlug(input.guides, guideSlug);
  if (matchedGuide) {
    return {
      status: 'resolved',
      route: resolveHoodieGuidePathToVibeRoute(citySlug, matchedGuide.slug),
    };
  }

  return {
    status: 'fallback',
    route: resolveHoodieGuidePathToVibeRoute(citySlug, null),
  };
}

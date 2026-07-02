import { APP_CONFIG } from './app-config';

export type VibeEventsDeepLinkSourceMode = 'official' | 'lga' | 'university';

export type BuildVibeEventsDeepLinkOptions = {
  baseUrl?: string | null;
  categories?: readonly (string | null | undefined)[] | null;
  tags?: readonly (string | null | undefined)[] | null;
  sourceMode?: VibeEventsDeepLinkSourceMode | null;
};

function normalizeFacetIds(values: readonly (string | null | undefined)[] | null | undefined) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values?.forEach((value) => {
    const facetId = String(value || '').trim();
    if (!facetId || seen.has(facetId)) return;
    seen.add(facetId);
    normalized.push(facetId);
  });

  return normalized;
}

function getDefaultDeepLinkBaseUrl() {
  return String(APP_CONFIG.shareBaseUrl || APP_CONFIG.marketingUrl || APP_CONFIG.inviteBaseUrl || '').trim();
}

function withBaseUrl(baseUrl: string | null | undefined, route: string) {
  const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  return normalizedBaseUrl ? `${normalizedBaseUrl}${route}` : route;
}

export function buildVibeEventsRoute(options: BuildVibeEventsDeepLinkOptions = {}) {
  const searchParams = new URLSearchParams();
  const categories = normalizeFacetIds(options.categories);
  const tags = normalizeFacetIds(options.tags);
  const sourceMode = String(options.sourceMode || '').trim();

  searchParams.set('section', 'events');
  searchParams.set('events_tab', 'whatson');
  if (sourceMode) searchParams.set('events_source_mode', sourceMode);
  if (categories.length) searchParams.set('events_types', categories.join(','));
  if (tags.length) searchParams.set('events_tags', tags.join(','));

  return `/vibe?${searchParams.toString()}`;
}

export function buildVibeEventsDeepLink(options: BuildVibeEventsDeepLinkOptions = {}) {
  return withBaseUrl(options.baseUrl ?? getDefaultDeepLinkBaseUrl(), buildVibeEventsRoute(options));
}

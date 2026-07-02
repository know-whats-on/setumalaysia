export const SKILLED_OCCUPATIONS_OFFICIAL_URL =
  'https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list';

export type SkilledOccupationsCacheStatus = 'fresh' | 'refreshed' | 'stale';
export type SkilledOccupationSort = 'occupation_asc' | 'occupation_desc';

export interface SkilledOccupationLink {
  text: string;
  href: string;
}

export interface SkilledOccupationCaveat {
  title: string;
  description: string;
}

export interface SkilledOccupationVisa {
  id: string;
  subclass: string;
  label: string;
  caveats: SkilledOccupationCaveat[];
}

export interface SkilledOccupationAssessingAuthority {
  id: string;
  code: string;
  name: string;
  url: string;
}

export interface SkilledOccupation {
  id: string;
  occupation: string;
  lists: string[];
  anzscoLinks: SkilledOccupationLink[];
  visas: SkilledOccupationVisa[];
  assessingAuthorities: SkilledOccupationAssessingAuthority[];
}

export interface SkilledOccupationsSource {
  name: string;
  url: string;
  lastUpdated: string;
  fetchedAt: string;
  cacheStatus: SkilledOccupationsCacheStatus;
}

export interface SkilledOccupationFacetValue {
  id: string;
  label: string;
  count: number;
}

export interface SkilledOccupationFacets {
  lists: SkilledOccupationFacetValue[];
  visas: SkilledOccupationFacetValue[];
  authorities: SkilledOccupationFacetValue[];
}

export interface SkilledOccupationsResult {
  items: SkilledOccupation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: SkilledOccupationSort;
  query: {
    q: string;
    visa: string;
    list: string;
    authority: string;
  };
  facets: SkilledOccupationFacets;
  source: SkilledOccupationsSource;
}

export interface FetchSkilledOccupationsInput {
  q?: string;
  visa?: string;
  list?: string;
  authority?: string;
  sort?: SkilledOccupationSort;
  page?: number;
  pageSize?: number;
}

const SKILLED_OCCUPATION_VISA_SUBCLASS_PATTERN = /\b(186|187|189|190|407|482|485|489|491|494)\b/;

function toStringValue(value: unknown) {
  return String(value || '').trim();
}

function toNumberValue(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeCacheStatus(value: unknown): SkilledOccupationsCacheStatus {
  return value === 'fresh' || value === 'stale' || value === 'refreshed' ? value : 'fresh';
}

export function normalizeSkilledOccupationSort(value: unknown): SkilledOccupationSort {
  return value === 'occupation_desc' ? 'occupation_desc' : 'occupation_asc';
}

function normalizeLink(raw: unknown): SkilledOccupationLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const text = toStringValue(record.text);
  const href = toStringValue(record.href);
  if (!text || !/^https?:\/\//i.test(href)) return null;
  return { text, href };
}

function normalizeCaveat(raw: unknown): SkilledOccupationCaveat | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const title = toStringValue(record.title);
  const description = toStringValue(record.description);
  if (!title && !description) return null;
  return {
    title: title || 'Caveat',
    description,
  };
}

function normalizeVisa(raw: unknown): SkilledOccupationVisa | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = toStringValue(record.id);
  const label = toStringValue(record.label);
  if (!id || !label) return null;
  return {
    id,
    subclass: toStringValue(record.subclass),
    label,
    caveats: Array.isArray(record.caveats) ? record.caveats.flatMap((item) => {
      const caveat = normalizeCaveat(item);
      return caveat ? [caveat] : [];
    }) : [],
  };
}

function normalizeAuthority(raw: unknown): SkilledOccupationAssessingAuthority | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = toStringValue(record.id);
  const code = toStringValue(record.code);
  if (!id || !code) return null;
  return {
    id,
    code,
    name: toStringValue(record.name) || code,
    url: toStringValue(record.url),
  };
}

function normalizeFacet(raw: unknown): SkilledOccupationFacetValue | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = toStringValue(record.id);
  const label = toStringValue(record.label);
  if (!id || !label) return null;
  return {
    id,
    label,
    count: toNumberValue(record.count),
  };
}

export function isSkilledOccupationVisaFacet(raw: unknown) {
  if (!raw || typeof raw !== 'object') return false;
  const record = raw as Partial<SkilledOccupationFacetValue>;
  return SKILLED_OCCUPATION_VISA_SUBCLASS_PATTERN.test(String(record.label || record.id || ''));
}

function normalizeOccupation(raw: unknown): SkilledOccupation | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = toStringValue(record.id);
  const occupation = toStringValue(record.occupation);
  if (!id || !occupation) return null;

  return {
    id,
    occupation,
    lists: Array.isArray(record.lists) ? record.lists.map(toStringValue).filter(Boolean) : [],
    anzscoLinks: Array.isArray(record.anzscoLinks) ? record.anzscoLinks.flatMap((item) => {
      const link = normalizeLink(item);
      return link ? [link] : [];
    }) : [],
    visas: Array.isArray(record.visas) ? record.visas.flatMap((item) => {
      const visa = normalizeVisa(item);
      return visa ? [visa] : [];
    }) : [],
    assessingAuthorities: Array.isArray(record.assessingAuthorities)
      ? record.assessingAuthorities.flatMap((item) => {
          const authority = normalizeAuthority(item);
          return authority ? [authority] : [];
        })
      : [],
  };
}

export function normalizeSkilledOccupationsResult(raw: unknown): SkilledOccupationsResult {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const source = record.source && typeof record.source === 'object' ? record.source as Record<string, unknown> : {};
  const query = record.query && typeof record.query === 'object' ? record.query as Record<string, unknown> : {};
  const facets = record.facets && typeof record.facets === 'object' ? record.facets as Record<string, unknown> : {};

  return {
    items: Array.isArray(record.items) ? record.items.flatMap((item) => normalizeOccupation(item) || []) : [],
    total: toNumberValue(record.total),
    page: Math.max(1, toNumberValue(record.page, 1)),
    pageSize: Math.max(1, toNumberValue(record.pageSize, 20)),
    totalPages: Math.max(1, toNumberValue(record.totalPages, 1)),
    sort: normalizeSkilledOccupationSort(record.sort),
    query: {
      q: toStringValue(query.q),
      visa: toStringValue(query.visa),
      list: toStringValue(query.list),
      authority: toStringValue(query.authority),
    },
    facets: {
      lists: Array.isArray(facets.lists) ? facets.lists.flatMap((item) => {
        const facet = normalizeFacet(item);
        return facet ? [facet] : [];
      }) : [],
      visas: Array.isArray(facets.visas) ? facets.visas.flatMap((item) => {
        const facet = normalizeFacet(item);
        return facet && isSkilledOccupationVisaFacet(facet) ? [facet] : [];
      }) : [],
      authorities: Array.isArray(facets.authorities) ? facets.authorities.flatMap((item) => {
        const facet = normalizeFacet(item);
        return facet ? [facet] : [];
      }) : [],
    },
    source: {
      name: toStringValue(source.name) || 'Australian Government Department of Home Affairs',
      url: toStringValue(source.url) || SKILLED_OCCUPATIONS_OFFICIAL_URL,
      lastUpdated: toStringValue(source.lastUpdated),
      fetchedAt: toStringValue(source.fetchedAt),
      cacheStatus: normalizeCacheStatus(source.cacheStatus),
    },
  };
}

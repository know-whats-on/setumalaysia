import { RAW_SPONSOR_COMPANY_NAMES } from './sponsor-companies-data';

export const SPONSOR_COMPANIES_OFFICIAL_SOURCE_URL = 'https://www.homeaffairs.gov.au/foi/files/2025/fa-250101229-document-released.PDF';
export const SPONSOR_COMPANIES_RACC_TABLE_URL = 'https://www.racc.net.au/accredited-sponsor-list-australia';
export const SPONSOR_COMPANIES_SNAPSHOT_LABEL = '15 Jan 2025 snapshot';
export const SPONSOR_COMPANIES_DEFAULT_PAGE_SIZE = 10;
export const SPONSOR_COMPANIES_MAX_PAGE_SIZE = 500;

const NUMBER_INITIAL = '0-9';

export interface SponsorCompanyListItem {
  id: string;
  name: string;
  initial: string;
  sourceIndex: number;
  searchText: string;
}

export interface SponsorCompaniesSourceMetadata {
  title: string;
  publisherLabel: string;
  snapshotDateLabel: string;
  officialSourceUrl: string;
  raccTableUrl: string;
  rawRowCount: number;
  companyCount: number;
}

export interface SponsorCompaniesInitialFilter {
  id: string;
  label: string;
  count: number;
}

export interface SponsorCompaniesQueryInput {
  search?: string;
  initial?: string;
  page?: number;
  pageSize?: number;
}

export interface SponsorCompaniesQueryResult {
  items: SponsorCompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  search: string;
  initial: string;
  initials: SponsorCompaniesInitialFilter[];
  source: SponsorCompaniesSourceMetadata;
}

function normalizeCompanyName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isDisclaimerRow(value: string) {
  return normalizeCompanyName(value).startsWith('\u2022');
}

function deriveInitial(name: string) {
  const firstCharacter = normalizeCompanyName(name).charAt(0).toUpperCase();
  if (/^\d$/.test(firstCharacter)) return NUMBER_INITIAL;
  if (/^[A-Z]$/.test(firstCharacter)) return firstCharacter;
  return '#';
}

function buildSponsorCompanyId(name: string, sourceIndex: number) {
  const slug = name
    .toLocaleLowerCase('en-AU')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return `${sourceIndex + 1}-${slug || 'sponsor-company'}`;
}

export function normalizeSponsorCompanyNames(rawNames: readonly string[]) {
  const seenKeys = new Set<string>();
  const companies: SponsorCompanyListItem[] = [];

  rawNames.forEach((rawName, sourceIndex) => {
    const name = normalizeCompanyName(rawName);
    if (!name || isDisclaimerRow(name)) return;

    const key = name.toLocaleLowerCase('en-AU');
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    companies.push({
      id: buildSponsorCompanyId(name, sourceIndex),
      name,
      initial: deriveInitial(name),
      sourceIndex,
      searchText: key,
    });
  });

  return companies;
}

export const SPONSOR_COMPANIES = normalizeSponsorCompanyNames(RAW_SPONSOR_COMPANY_NAMES);

function buildInitialFilters(companies: readonly SponsorCompanyListItem[]) {
  const counts = companies.reduce<Record<string, number>>((result, company) => {
    result[company.initial] = (result[company.initial] || 0) + 1;
    return result;
  }, {});

  const alphabetFilters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    .filter((letter) => counts[letter] > 0)
    .map((letter) => ({
      id: letter,
      label: letter,
      count: counts[letter],
    }));

  const filters: SponsorCompaniesInitialFilter[] = counts[NUMBER_INITIAL]
    ? [{ id: NUMBER_INITIAL, label: NUMBER_INITIAL, count: counts[NUMBER_INITIAL] }, ...alphabetFilters]
    : alphabetFilters;

  if (counts['#']) {
    filters.push({ id: '#', label: '#', count: counts['#'] });
  }

  return filters;
}

export const SPONSOR_COMPANY_INITIAL_FILTERS = buildInitialFilters(SPONSOR_COMPANIES);

export const SPONSOR_COMPANIES_SOURCE_METADATA: SponsorCompaniesSourceMetadata = {
  title: 'Accredited Sponsors List',
  publisherLabel: 'Dept. of Home Affairs',
  snapshotDateLabel: SPONSOR_COMPANIES_SNAPSHOT_LABEL,
  officialSourceUrl: SPONSOR_COMPANIES_OFFICIAL_SOURCE_URL,
  raccTableUrl: SPONSOR_COMPANIES_RACC_TABLE_URL,
  rawRowCount: RAW_SPONSOR_COMPANY_NAMES.length,
  companyCount: SPONSOR_COMPANIES.length,
};

function normalizeInitialFilter(value: string | undefined) {
  const next = normalizeCompanyName(value || '').toUpperCase();
  if (!next || next === 'ALL') return '';
  if (/^\d$/.test(next)) return NUMBER_INITIAL;
  if (next === NUMBER_INITIAL || next === '#') return next;
  if (/^[A-Z]$/.test(next)) return next;
  return '';
}

function clampPageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return SPONSOR_COMPANIES_DEFAULT_PAGE_SIZE;
  return Math.min(SPONSOR_COMPANIES_MAX_PAGE_SIZE, Math.max(1, Math.floor(value || SPONSOR_COMPANIES_DEFAULT_PAGE_SIZE)));
}

function clampPage(value: number | undefined, totalPages: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(totalPages, Math.max(1, Math.floor(value || 1)));
}

function sortCompaniesByName(companies: SponsorCompanyListItem[]) {
  return companies.sort((left, right) => (
    left.name.localeCompare(right.name, 'en-AU', { sensitivity: 'base' })
  ));
}

export function querySponsorCompanies(input: SponsorCompaniesQueryInput = {}): SponsorCompaniesQueryResult {
  const search = normalizeCompanyName(input.search || '');
  const searchText = search.toLocaleLowerCase('en-AU');
  const initial = normalizeInitialFilter(input.initial);
  const pageSize = clampPageSize(input.pageSize);

  const filteredCompanies = sortCompaniesByName(SPONSOR_COMPANIES.filter((company) => {
    if (initial && company.initial !== initial) return false;
    if (searchText && !company.searchText.includes(searchText)) return false;
    return true;
  }));

  const total = filteredCompanies.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = clampPage(input.page, totalPages);
  const startOffset = (page - 1) * pageSize;
  const items = filteredCompanies.slice(startOffset, startOffset + pageSize);
  const startIndex = total === 0 ? 0 : startOffset + 1;
  const endIndex = total === 0 ? 0 : startOffset + items.length;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    search,
    initial,
    initials: SPONSOR_COMPANY_INITIAL_FILTERS,
    source: SPONSOR_COMPANIES_SOURCE_METADATA,
  };
}

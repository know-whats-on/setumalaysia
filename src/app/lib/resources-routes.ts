import type { PrepareTab } from './prepare-types';

export type LegalSection = 'prepare' | 'jobs' | 'legal';
export type JobsTab = 'occupations' | 'sponsor-companies' | 'pr-points';

const LEGAL_PATH = '/legal';

export function parseLegalSection(value: string | null | undefined): LegalSection | null {
  return value === 'prepare' || value === 'jobs' || value === 'legal' ? value : null;
}

export function parseJobsTab(value: string | null | undefined): JobsTab | null {
  if (value === 'job-listings') return 'occupations';
  return value === 'occupations' || value === 'sponsor-companies' || value === 'pr-points' ? value : null;
}

export function parsePrepareTab(value: string | null | undefined): PrepareTab | null {
  return value === 'checklist' || value === 'application-kit' || value === 'scam-checker' || value === 'nsw-rent-check' ? value : null;
}

export function buildLegalRoute(options: {
  section?: LegalSection;
  prepareTab?: PrepareTab;
  jobsTab?: JobsTab;
  listingId?: string | null;
} = {}) {
  const { section, prepareTab, jobsTab, listingId } = options;
  const pathname = listingId ? `${LEGAL_PATH}/${listingId}` : LEGAL_PATH;
  const params = new URLSearchParams();

  if (section) {
    params.set('section', section);
  }

  if (section === 'prepare' && prepareTab) {
    params.set('prepare_tab', prepareTab);
  }

  if (section === 'jobs' && jobsTab) {
    params.set('jobs_tab', jobsTab);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export const HOODIE_RESOURCES_DEFAULT_ROUTE = buildLegalRoute({
  section: 'legal',
});

export const SETU_CHINA_RESOURCES_DEFAULT_ROUTE = buildLegalRoute({
  section: 'prepare',
  prepareTab: 'checklist',
});

export const SETU_INDIA_RESOURCES_DEFAULT_ROUTE = SETU_CHINA_RESOURCES_DEFAULT_ROUTE;

export const HOODIE_RESOURCES_JOBS_ROUTE = buildLegalRoute({
  section: 'jobs',
  jobsTab: 'sponsor-companies',
});

export const HOODIE_LEGAL_ROUTE = buildLegalRoute({
  section: 'legal',
});

export const HOODIE_APPLICATION_KIT_ROUTE = buildLegalRoute({
  section: 'prepare',
  prepareTab: 'application-kit',
});

export const HOODIE_SCAM_CHECKER_ROUTE = buildLegalRoute({
  section: 'prepare',
  prepareTab: 'scam-checker',
});

export const HOODIE_NSW_RENT_CHECK_ROUTE = buildLegalRoute({
  section: 'prepare',
  prepareTab: 'nsw-rent-check',
});

export const HOODIE_OCCUPATIONS_ROUTE = buildLegalRoute({
  section: 'jobs',
  jobsTab: 'occupations',
});

export const HOODIE_JOB_LISTINGS_ROUTE = HOODIE_OCCUPATIONS_ROUTE;

export const HOODIE_PR_POINTS_ROUTE = buildLegalRoute({
  section: 'jobs',
  jobsTab: 'pr-points',
});

export function getLegalNavRoute(isHoodie: boolean) {
  return isHoodie ? HOODIE_RESOURCES_DEFAULT_ROUTE : LEGAL_PATH;
}

export function getLegalTabRoute(isHoodie: boolean) {
  return isHoodie ? HOODIE_LEGAL_ROUTE : LEGAL_PATH;
}

export function getResourcesJobsRoute(isHoodie: boolean) {
  return isHoodie ? HOODIE_RESOURCES_JOBS_ROUTE : LEGAL_PATH;
}

export function getApplicationKitRoute(isHoodie: boolean) {
  return isHoodie ? HOODIE_APPLICATION_KIT_ROUTE : LEGAL_PATH;
}

export function getScamCheckerRoute(isHoodie: boolean) {
  return isHoodie ? HOODIE_SCAM_CHECKER_ROUTE : LEGAL_PATH;
}

export function getNswRentCheckRoute(isHoodie: boolean) {
  return isHoodie ? HOODIE_NSW_RENT_CHECK_ROUTE : LEGAL_PATH;
}

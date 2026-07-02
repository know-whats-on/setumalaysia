import { describe, expect, it } from 'vitest';
import {
  HOODIE_APPLICATION_KIT_ROUTE,
  HOODIE_LEGAL_ROUTE,
  HOODIE_NSW_RENT_CHECK_ROUTE,
  HOODIE_OCCUPATIONS_ROUTE,
  HOODIE_PR_POINTS_ROUTE,
  HOODIE_RESOURCES_DEFAULT_ROUTE,
  getLegalNavRoute,
  parseJobsTab,
  parsePrepareTab,
} from './resources-routes';

describe('resources routes', () => {
  it('defaults the shared Hoodie/SETU resources shell to Legal', () => {
    expect(HOODIE_RESOURCES_DEFAULT_ROUTE).toBe('/legal?section=legal');
    expect(getLegalNavRoute(true)).toBe(HOODIE_LEGAL_ROUTE);
  });

  it('keeps explicit Prepare/Application Kit deep links available', () => {
    expect(HOODIE_APPLICATION_KIT_ROUTE).toBe('/legal?section=prepare&prepare_tab=application-kit');
  });

  it('keeps explicit Prepare/NSW Rent Check deep links available', () => {
    expect(HOODIE_NSW_RENT_CHECK_ROUTE).toBe('/legal?section=prepare&prepare_tab=nsw-rent-check');
    expect(parsePrepareTab('nsw-rent-check')).toBe('nsw-rent-check');
    expect(parsePrepareTab('invalid')).toBeNull();
  });

  it('keeps explicit Jobs/PR Points deep links available', () => {
    expect(HOODIE_PR_POINTS_ROUTE).toBe('/legal?section=jobs&jobs_tab=pr-points');
    expect(parseJobsTab('pr-points')).toBe('pr-points');
    expect(parseJobsTab('invalid')).toBeNull();
  });

  it('supports Occupations jobs tab and legacy Job Listings links', () => {
    expect(HOODIE_OCCUPATIONS_ROUTE).toBe('/legal?section=jobs&jobs_tab=occupations');
    expect(parseJobsTab('occupations')).toBe('occupations');
    expect(parseJobsTab('job-listings')).toBe('occupations');
  });
});

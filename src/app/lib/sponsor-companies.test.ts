import { describe, expect, it } from 'vitest';
import {
  normalizeSponsorCompanyNames,
  querySponsorCompanies,
  SPONSOR_COMPANIES,
  SPONSOR_COMPANIES_SOURCE_METADATA,
} from './sponsor-companies';

describe('sponsor companies data', () => {
  it('normalizes the RACC snapshot into company rows only', () => {
    expect(SPONSOR_COMPANIES_SOURCE_METADATA.rawRowCount).toBe(3584);
    expect(SPONSOR_COMPANIES).toHaveLength(3578);
    expect(SPONSOR_COMPANIES.some((company) => company.name.startsWith('\u2022'))).toBe(false);
  });

  it('deduplicates names case-insensitively while removing disclaimer rows', () => {
    const normalized = normalizeSponsorCompanyNames([
      ' Example Sponsor Pty Ltd ',
      'example sponsor pty ltd',
      '\u2022 This is a disclaimer row.',
      'Another Sponsor Pty Ltd',
    ]);

    expect(normalized.map((company) => company.name)).toEqual([
      'Example Sponsor Pty Ltd',
      'Another Sponsor Pty Ltd',
    ]);
  });

  it('searches company names case-insensitively', () => {
    const result = querySponsorCompanies({ search: 'bmw', pageSize: 20 });

    expect(result.total).toBeGreaterThan(0);
    expect(result.items.some((company) => company.name === 'BMW Australia Ltd.')).toBe(true);
  });

  it('derives number and letter initials for filters', () => {
    const result = querySponsorCompanies({ pageSize: 10 });

    expect(result.initials.some((filter) => filter.id === '0-9')).toBe(true);
    expect(result.initials.some((filter) => filter.id === 'B')).toBe(true);
    expect(SPONSOR_COMPANIES.find((company) => company.name === '1 Medical Pty Ltd')?.initial).toBe('0-9');
    expect(SPONSOR_COMPANIES.find((company) => company.name === 'BMW Australia Ltd.')?.initial).toBe('B');
  });

  it('clamps pagination safely', () => {
    const result = querySponsorCompanies({ page: 9999, pageSize: 10 });

    expect(result.page).toBe(result.totalPages);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.endIndex).toBe(result.total);
  });
});

import { describe, expect, it } from 'vitest';
import {
  normalizeSkilledOccupationSort,
  normalizeSkilledOccupationsResult,
} from './occupations';

describe('occupations', () => {
  it('normalizes occupation search payloads defensively', () => {
    const result = normalizeSkilledOccupationsResult({
      items: [{
        id: 'accountant-general-221111',
        occupation: 'Accountant (General)',
        lists: ['MLTSSL', 'CSOL', ''],
        anzscoLinks: [
          { text: 'ANZSCO 2022 - 221111', href: 'https://www.abs.gov.au/221111' },
          { text: 'Bad link', href: 'javascript:alert(1)' },
        ],
        visas: [{
          id: '482-skills-in-demand',
          subclass: '482',
          label: '482 - Skills in Demand (subclass 482) - Core Skills stream',
          caveats: [{ title: 'Business size', description: 'Excludes some businesses.' }],
        }],
        assessingAuthorities: [{
          id: 'caanz',
          code: 'CAANZ',
          name: 'Chartered Accountants Australia and New Zealand',
          url: 'https://www.charteredaccountantsanz.com/',
        }],
      }],
      total: '1',
      page: '1',
      pageSize: '20',
      totalPages: '1',
      sort: 'occupation_desc',
      query: { q: 'accountant', visa: '482', list: 'MLTSSL', authority: 'CAANZ' },
      facets: {
        lists: [{ id: 'MLTSSL', label: 'MLTSSL', count: '216' }],
        visas: [
          { id: '482-skills-in-demand', label: '482 - Skills in Demand', count: 1 },
          { id: 'visa-business-size', label: 'the position is in a business that has fewer than 5 employees', count: 1 },
        ],
        authorities: [{ id: 'caanz', label: 'CAANZ', count: 1 }],
      },
      source: { cacheStatus: 'stale' },
    });

    expect(result.total).toBe(1);
    expect(result.sort).toBe('occupation_desc');
    expect(result.items[0].anzscoLinks).toEqual([
      { text: 'ANZSCO 2022 - 221111', href: 'https://www.abs.gov.au/221111' },
    ]);
    expect(result.items[0].visas[0].caveats[0].title).toBe('Business size');
    expect(result.items[0].assessingAuthorities[0].code).toBe('CAANZ');
    expect(result.facets.lists[0].count).toBe(216);
    expect(result.facets.visas).toEqual([{ id: '482-skills-in-demand', label: '482 - Skills in Demand', count: 1 }]);
    expect(result.source.cacheStatus).toBe('stale');
  });

  it('defaults unsupported sorts to occupation ascending', () => {
    expect(normalizeSkilledOccupationSort('invalid')).toBe('occupation_asc');
  });
});

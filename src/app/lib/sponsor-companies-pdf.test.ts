import { describe, expect, it } from 'vitest';
import {
  getSponsorCompaniesPdfBrand,
  getSponsorCompaniesPdfExportModel,
} from './sponsor-companies-pdf';

describe('sponsor companies PDF export model', () => {
  it('selects the requested variant branding and filenames', () => {
    expect(getSponsorCompaniesPdfBrand('ghar')).toMatchObject({
      label: 'SETU India AU',
      fileName: 'setu-india-au-sponsor-companies-directory.pdf',
    });
    expect(getSponsorCompaniesPdfBrand('burb_mate')).toMatchObject({
      label: 'Hoodie',
      fileName: 'hoodie-sponsor-companies-directory.pdf',
    });
    expect(getSponsorCompaniesPdfBrand('setu_china')).toMatchObject({
      label: 'SETU China',
      fileName: 'setu-china-sponsor-companies-directory.pdf',
    });
  });

  it('exports the full local snapshot count without removed wording', () => {
    const model = getSponsorCompaniesPdfExportModel('ghar');
    const groupedCount = model.groups.reduce((total, group) => total + group.companies.length, 0);
    const visiblePdfLabels = [
      model.brand.label,
      model.brand.fileName,
      model.title,
      model.subtitle,
      model.totalCountLabel,
      ...model.groups.map((group) => `${group.label} ${group.companies.length}`),
    ].join(' ');

    expect(model.totalCount).toBe(3578);
    expect(groupedCount).toBe(3578);
    expect(model.totalCountLabel).toBe('3,578 companies');
    expect(model.subtitle).toBe('15 Jan 2025 snapshot');
    expect(model.groups.find((group) => group.initial === 'B')?.companies.some((company) => (
      company.name === 'BMW Australia Ltd.'
    ))).toBe(true);
    expect(visiblePdfLabels.toLocaleLowerCase('en-AU')).not.toMatch(/home affairs|racc|official|source/);
  });
});

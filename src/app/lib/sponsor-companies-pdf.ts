import type { AppVariant } from './app-variant';
import { APP_CONFIG } from './app-config';
import {
  SPONSOR_COMPANIES,
  SPONSOR_COMPANIES_SNAPSHOT_LABEL,
  SPONSOR_COMPANY_INITIAL_FILTERS,
  type SponsorCompanyListItem,
} from './sponsor-companies';

type RgbColor = readonly [number, number, number];
type JsPdfDocument = InstanceType<typeof import('jspdf').jsPDF>;

export interface SponsorCompaniesPdfBrand {
  variant: AppVariant;
  label: string;
  fileName: string;
  primaryRgb: RgbColor;
  accentRgb: RgbColor;
  textRgb: RgbColor;
}

export interface SponsorCompaniesPdfGroup {
  initial: string;
  label: string;
  companies: SponsorCompanyListItem[];
}

export interface SponsorCompaniesPdfExportModel {
  brand: SponsorCompaniesPdfBrand;
  title: 'Sponsor Companies Directory';
  subtitle: string;
  totalCount: number;
  totalCountLabel: string;
  groups: SponsorCompaniesPdfGroup[];
}

export interface SponsorCompaniesPdfExport {
  blob: Blob;
  fileName: string;
  title: string;
  companyCount: number;
}

const PDF_TITLE = 'Sponsor Companies Directory';
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 14;
const TOP_MARGIN_MM = 18;
const BOTTOM_MARGIN_MM = 18;

function formatCount(value: number) {
  return value.toLocaleString('en-AU');
}

function sortCompaniesByName(companies: readonly SponsorCompanyListItem[]) {
  return [...companies].sort((left, right) => (
    left.name.localeCompare(right.name, 'en-AU', { sensitivity: 'base' })
  ));
}

export function getSponsorCompaniesPdfBrand(variant: AppVariant = APP_CONFIG.variant): SponsorCompaniesPdfBrand {
  switch (variant) {
    case 'burb_mate':
      return {
        variant,
        label: 'Hoodie',
        fileName: 'hoodie-sponsor-companies-directory.pdf',
        primaryRgb: [15, 23, 42],
        accentRgb: [254, 240, 138],
        textRgb: [15, 23, 42],
      };
    case 'setu_china':
      return {
        variant,
        label: 'SETU China',
        fileName: 'setu-china-sponsor-companies-directory.pdf',
        primaryRgb: [185, 28, 28],
        accentRgb: [255, 237, 213],
        textRgb: [30, 41, 59],
      };
    case 'ghar':
    default:
      return {
        variant: 'ghar',
        label: 'SETU India AU',
        fileName: 'setu-india-au-sponsor-companies-directory.pdf',
        primaryRgb: [29, 78, 216],
        accentRgb: [219, 234, 254],
        textRgb: [15, 23, 42],
      };
  }
}

export function getSponsorCompaniesPdfExportModel(
  variant: AppVariant = APP_CONFIG.variant,
): SponsorCompaniesPdfExportModel {
  const groups = SPONSOR_COMPANY_INITIAL_FILTERS.map((filter) => ({
    initial: filter.id,
    label: filter.label,
    companies: sortCompaniesByName(
      SPONSOR_COMPANIES.filter((company) => company.initial === filter.id),
    ),
  })).filter((group) => group.companies.length > 0);

  return {
    brand: getSponsorCompaniesPdfBrand(variant),
    title: PDF_TITLE,
    subtitle: SPONSOR_COMPANIES_SNAPSHOT_LABEL,
    totalCount: SPONSOR_COMPANIES.length,
    totalCountLabel: `${formatCount(SPONSOR_COMPANIES.length)} companies`,
    groups,
  };
}

function setRgbFill(doc: JsPdfDocument, color: RgbColor) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setRgbText(doc: JsPdfDocument, color: RgbColor) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawCoverHeader(doc: JsPdfDocument, model: SponsorCompaniesPdfExportModel) {
  setRgbFill(doc, model.brand.primaryRgb);
  doc.rect(0, 0, PAGE_WIDTH_MM, 44, 'F');
  setRgbText(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(model.brand.label, MARGIN_MM, 17);
  doc.setFontSize(24);
  doc.text(model.title, MARGIN_MM, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(model.subtitle, MARGIN_MM, 38);

  setRgbFill(doc, model.brand.accentRgb);
  doc.rect(0, 44, PAGE_WIDTH_MM, 18, 'F');
  setRgbText(doc, model.brand.textRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(model.totalCountLabel, MARGIN_MM, 55);
  doc.text('A-Z browser export', PAGE_WIDTH_MM - MARGIN_MM, 55, { align: 'right' });
}

function drawGroupHeader(
  doc: JsPdfDocument,
  model: SponsorCompaniesPdfExportModel,
  y: number,
  label: string,
  count: number,
) {
  setRgbFill(doc, model.brand.accentRgb);
  doc.roundedRect(MARGIN_MM, y, PAGE_WIDTH_MM - (MARGIN_MM * 2), 9, 1.8, 1.8, 'F');
  setRgbText(doc, model.brand.textRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${label} companies (${formatCount(count)})`, MARGIN_MM + 3, y + 6);
}

function drawFooter(doc: JsPdfDocument, model: SponsorCompaniesPdfExportModel) {
  const totalPages = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN_MM, PAGE_HEIGHT_MM - 13, PAGE_WIDTH_MM - MARGIN_MM, PAGE_HEIGHT_MM - 13);
    setRgbText(doc, [100, 116, 139]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${model.brand.label} - ${model.title}`, MARGIN_MM, PAGE_HEIGHT_MM - 8);
    doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH_MM - MARGIN_MM, PAGE_HEIGHT_MM - 8, { align: 'right' });
  }
}

function ensurePageSpace(doc: JsPdfDocument, y: number, requiredHeight: number) {
  if (y + requiredHeight <= PAGE_HEIGHT_MM - BOTTOM_MARGIN_MM) return y;
  doc.addPage();
  return TOP_MARGIN_MM;
}

export async function createSponsorCompaniesPdf(
  variant: AppVariant = APP_CONFIG.variant,
): Promise<SponsorCompaniesPdfExport> {
  const { jsPDF } = await import('jspdf');
  const model = getSponsorCompaniesPdfExportModel(variant);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const textWidth = PAGE_WIDTH_MM - (MARGIN_MM * 2) - 22;
  let y = 72;
  let rowNumber = 1;

  drawCoverHeader(doc, model);

  model.groups.forEach((group) => {
    y = ensurePageSpace(doc, y, 16);
    drawGroupHeader(doc, model, y, group.label, group.companies.length);
    y += 13;

    group.companies.forEach((company) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitText = doc.splitTextToSize(company.name, textWidth);
      const lines = Array.isArray(splitText) ? splitText : [splitText];
      const rowHeight = Math.max(8, (lines.length * 4.2) + 4);
      y = ensurePageSpace(doc, y, rowHeight);

      doc.setDrawColor(226, 232, 240);
      doc.line(MARGIN_MM, y - 1, PAGE_WIDTH_MM - MARGIN_MM, y - 1);
      setRgbText(doc, [71, 85, 105]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(String(rowNumber), MARGIN_MM + 1, y + 4);
      setRgbText(doc, model.brand.textRgb);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(lines, MARGIN_MM + 16, y + 4);

      rowNumber += 1;
      y += rowHeight;
    });

    y += 4;
  });

  drawFooter(doc, model);

  return {
    blob: doc.output('blob') as Blob,
    fileName: model.brand.fileName,
    title: `${model.brand.label} ${model.title}`,
    companyCount: model.totalCount,
  };
}

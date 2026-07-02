import {
  getEnabledHouseholdRuleItems,
  normalizeHouseholdRuleSections,
  type HouseholdRecord,
  type HouseholdRulesAcknowledgement,
  type HouseholdRulesSignatureStroke,
  type HouseholdRulesVersion,
} from './household';
import { getHouseholdRulesSignatureHeight } from './household-rules-signature';

function formatSydneyDateTime(value?: string) {
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) return value || 'Unknown time';
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(parsed)
    .replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
}

function sanitizePdfFileName(value: string) {
  return String(value || 'house-rules')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function drawSignatureStrokes(
  doc: any,
  strokes: HouseholdRulesSignatureStroke[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.55);
  strokes.forEach((stroke) => {
    const points = stroke.points || [];
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const point = points[index];
      doc.line(
        x + previous.x * width,
        y + previous.y * height,
        x + point.x * width,
        y + point.y * height,
      );
    }
  });
}

export async function generateSignedHouseRulesPdf({
  household,
  version,
  acknowledgement,
}: {
  household: HouseholdRecord;
  version: HouseholdRulesVersion;
  acknowledgement: HouseholdRulesAcknowledgement;
}) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const addWrapped = (text: string, fontSize = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [51, 65, 85]) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), contentWidth);
    lines.forEach((line: string) => {
      ensureSpace(fontSize * 0.5 + 4);
      doc.text(line, margin, y);
      y += fontSize * 0.5 + 2.5;
    });
  };

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('Signed House Rules Declaration', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${household.name} • ${household.address_snapshot?.display_address || household.address_snapshot?.address || 'Household address'}`, margin, 27);
  y = 48;

  addWrapped('Signed household record', 12, 'bold', [30, 64, 175]);
  addWrapped(version.description, 10);
  y += 3;

  const metadata = [
    ['Household', household.name],
    ['Address', household.address_snapshot?.display_address || household.address_snapshot?.address || ''],
    ['Version', `Version ${version.version_number}`],
    ['Published', `${formatSydneyDateTime(version.created_at)} Sydney time`],
    ['Version hash', version.rules_hash],
    ['Signer', `${acknowledgement.member_display_name} (${acknowledgement.member_email})`],
    ['Signed', `${formatSydneyDateTime(acknowledgement.signed_at)} Sydney time`],
    ['Acknowledgement ID', acknowledgement.id],
    ['Checked item count', `${acknowledgement.checked_item_ids.length} of ${getEnabledHouseholdRuleItems(version).length}`],
  ].filter((entry) => entry[1]);

  metadata.forEach(([label, value]) => {
    ensureSpace(9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), margin + 42, y);
    y += 7;
  });
  y += 5;

  normalizeHouseholdRuleSections(version.sections).forEach((section, sectionIndex) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionIndex + 1}. ${section.title}`, margin, y);
    y += 7;
    if (section.description) {
      addWrapped(section.description, 9, 'normal', [100, 116, 139]);
    }
    section.items.filter((item) => item.enabled).forEach((item) => {
      const checked = acknowledgement.checked_item_ids.includes(item.id);
      const prefix = checked ? '[x]' : '[ ]';
      addWrapped(`${prefix} ${item.text}`, 9, 'normal', [51, 65, 85]);
    });
    y += 3;
  });

  const signatureStrokes = acknowledgement.signature.strokes || [];
  const signatureDrawWidth = contentWidth - 12;
  const signatureDrawHeight = getHouseholdRulesSignatureHeight(signatureDrawWidth);
  const signatureBoxHeight = signatureDrawHeight + 12;
  ensureSpace(signatureBoxHeight + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Drawn signature', margin, y);
  y += 7;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, y, contentWidth, signatureBoxHeight, 3, 3);
  doc.line(
    margin + 14,
    y + 6 + signatureDrawHeight * 0.76,
    margin + contentWidth - 14,
    y + 6 + signatureDrawHeight * 0.76,
  );
  drawSignatureStrokes(doc, signatureStrokes, margin + 6, y + 6, signatureDrawWidth, signatureDrawHeight);
  y += signatureBoxHeight + 8;

  addWrapped('This document is a signed, dated record of the household rules acknowledged in Hoodie. It is intended to support household accountability and evidence keeping. It does not replace a lease or independent legal advice.', 8, 'normal', [100, 116, 139]);

  const blob = doc.output('blob') as Blob;
  const fileName = `${sanitizePdfFileName(household.name)}-house-rules-v${version.version_number}-${sanitizePdfFileName(acknowledgement.member_display_name)}.pdf`;
  return { blob, fileName };
}

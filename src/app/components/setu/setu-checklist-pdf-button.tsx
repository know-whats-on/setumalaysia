import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  categorizeSetuChecklistItems,
  type SetuChecklistDisplayItem,
} from '../../lib/setu-checklist';
import { stripMarkdownForPdf } from '../../lib/setu-utils';
import { downloadSetuPdf } from '../../lib/setu-pdf';
import { SETU_CHECKLIST_CATEGORY_INFO } from '../../lib/setu-checklist';
import type {
  SetuChecklistProgress,
  SetuLocationInfo,
} from '../../lib/setu-types';

interface SetuChecklistPdfButtonProps {
  checklistItems: SetuChecklistDisplayItem[];
  universityName: string;
  location: SetuLocationInfo | null;
  progress: SetuChecklistProgress | null;
  isItemCompleted: (itemId: string) => boolean;
}

async function generateChecklistPdf({
  checklistItems,
  universityName,
  location,
  progress,
  isItemCompleted,
}: SetuChecklistPdfButtonProps) {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const lineHeight = 5;
  let y = margin;
  const grouped = categorizeSetuChecklistItems(checklistItems);

  const ensurePage = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const toPdfText = (value: string) => stripMarkdownForPdf(value).replace(/\n{3,}/g, '\n\n');

  const addWrappedText = (text: string, fontSize = 10, indent = 0) => {
    const safeText = toPdfText(text);
    if (!safeText) return;
    const width = pageWidth - margin * 2 - indent;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(safeText, width);
    lines.forEach((line: string, index: number) => {
      doc.text(line, margin + indent, y + index * lineHeight);
    });
    y += lines.length * lineHeight;
  };

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SETU Personalized Checklist', margin, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(toPdfText(universityName), margin, 25);
  if (location) {
    doc.text(toPdfText(`${location.city}, ${location.state} - ${location.climate} climate`), margin, 31);
  }
  if (progress) {
    const percentage =
      progress.totalItems > 0
        ? Math.round((progress.completedItems.length / progress.totalItems) * 100)
        : 0;
    doc.text(
      toPdfText(`${progress.completedItems.length}/${progress.totalItems} complete (${percentage}%)`),
      margin,
      37,
    );
  }
  y = 50;

  (Object.entries(grouped) as Array<[keyof typeof grouped, SetuChecklistDisplayItem[]]>).forEach(
    ([category, items]) => {
      if (items.length === 0) return;

      ensurePage(18);
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin - 2, y - 6, pageWidth - margin * 2 + 4, 12, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(toPdfText(SETU_CHECKLIST_CATEGORY_INFO[category].title), margin, y + 1);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      addWrappedText(SETU_CHECKLIST_CATEGORY_INFO[category].description, 9);
      doc.setTextColor(0, 0, 0);
      y += 2;

      items.forEach((item) => {
        ensurePage(14);
        const completed = isItemCompleted(item.id);
        doc.setDrawColor(148, 163, 184);
        doc.rect(margin, y - 3, 4, 4);
        if (completed) {
          doc.line(margin + 0.8, y - 1.2, margin + 1.8, y - 0.2);
          doc.line(margin + 1.8, y - 0.2, margin + 3.4, y - 2.2);
        }
        doc.setFont('helvetica', 'bold');
        addWrappedText(item.text, 10, 7);
        if (item.description) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          addWrappedText(item.description, 8, 9);
          doc.setTextColor(0, 0, 0);
        }
        y += 3;
      });
    },
  );

  return doc.output('blob');
}

export function SetuChecklistPdfButton(props: SetuChecklistPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        setIsGenerating(true);
        try {
          const blob = await generateChecklistPdf(props);
          await downloadSetuPdf({
            blob,
            fileName: `${props.universityName}-setu-checklist.pdf`,
            title: `${props.universityName} checklist`,
          });
        } finally {
          setIsGenerating(false);
        }
      }}
      className="border-[#BFDBFE] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isGenerating ? 'Generating PDF...' : 'Checklist PDF'}
    </Button>
  );
}

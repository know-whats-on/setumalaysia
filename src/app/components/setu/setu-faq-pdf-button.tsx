import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { downloadSetuPdf } from '../../lib/setu-pdf';
import { stripMarkdownForPdf } from '../../lib/setu-utils';
import type { SetuCategory, SetuFaq } from '../../lib/setu-types';

interface SetuFaqPdfButtonProps {
  faqsByCategory: Array<{ category: SetuCategory; faqs: SetuFaq[] }>;
}

async function generateFaqPdf(faqsByCategory: Array<{ category: SetuCategory; faqs: SetuFaq[] }>) {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const lineHeight = 5;
  let y = margin;

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
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SETU FAQ Guide', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(toPdfText(`Generated on ${new Date().toLocaleDateString('en-AU')}`), margin, 25);
  y = 42;

  faqsByCategory.forEach(({ category, faqs }) => {
    if (faqs.length === 0) return;
    ensurePage(20);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin - 2, y - 6, pageWidth - margin * 2 + 4, 12, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(toPdfText(category.name), margin, y + 1);
    y += 14;

    faqs.forEach((faq) => {
      ensurePage(24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      addWrappedText(`Q. ${faq.title}`, 11);
      y += 1;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      addWrappedText(faq.content, 9, 2);
      doc.setTextColor(0, 0, 0);
      y += 6;
    });
  });

  return doc.output('blob');
}

export function SetuFaqPdfButton({ faqsByCategory }: SetuFaqPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const faqCount = faqsByCategory.reduce((sum, group) => sum + group.faqs.length, 0);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        setIsGenerating(true);
        try {
          const blob = await generateFaqPdf(faqsByCategory);
          await downloadSetuPdf({
            blob,
            fileName: 'setu-faq-guide.pdf',
            title: 'SETU FAQ Guide',
          });
        } finally {
          setIsGenerating(false);
        }
      }}
      className="border-[#BFDBFE] bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]"
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isGenerating ? 'Generating FAQ guide...' : `Download FAQ Guide (${faqCount} FAQs)`}
    </Button>
  );
}

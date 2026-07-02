import {
  formatHouseholdMoney,
  getHouseholdExpenseCategoryColor,
  type HouseholdExpenseInsights,
  type HouseholdExpenseMonthlyTrendPoint,
  type HouseholdExpenseReportData,
  type HouseholdExpenseTransaction,
  type HouseholdExpenseYearComparison,
  type HouseholdSpendSummary,
} from './household';

function escapeXml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

async function svgToPngDataUrl(svg: string, width: number, height: number) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return '';
  return new Promise<string>((resolve) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        resolve('');
        return;
      }
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };

    image.src = url;
  });
}

function buildDonutSvg(summary: HouseholdSpendSummary, title: string) {
  const width = 560;
  const height = 320;
  const cx = 160;
  const cy = 164;
  const radius = 88;
  const strokeWidth = 34;
  const total = summary.total || 0;
  let currentAngle = 0;

  const arcs = total > 0
    ? summary.categories.map((entry, index) => {
        const sliceAngle = (entry.amount / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle = endAngle;
        return `<path d="${describeArc(cx, cy, radius, startAngle, Math.max(startAngle + 0.01, endAngle - 1))}" fill="none" stroke="${getHouseholdExpenseCategoryColor(entry.category)}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;
      }).join('')
    : `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#E2E8F0" stroke-width="${strokeWidth}" />`;

  const legend = (summary.categories.length ? summary.categories : [{ category: 'No spend logged', amount: 0 }])
    .slice(0, 6)
    .map((entry, index) => {
      const y = 96 + index * 31;
      return `
        <circle cx="320" cy="${y - 4}" r="5" fill="${getHouseholdExpenseCategoryColor(entry.category)}" />
        <text x="335" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="#0F172A">${escapeXml(entry.category)}</text>
        <text x="500" y="${y}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#0F172A">${escapeXml(formatHouseholdMoney(entry.amount))}</text>
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="20" fill="#FFFFFF"/>
      <text x="28" y="42" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#0F172A">${escapeXml(title)}</text>
      ${arcs}
      <circle cx="${cx}" cy="${cy}" r="58" fill="#FFFFFF" />
      <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="#0F172A">${escapeXml(formatHouseholdMoney(total))}</text>
      <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="700" fill="#64748B">${summary.billCount} bill${summary.billCount === 1 ? '' : 's'}</text>
      ${legend}
    </svg>
  `;
}

function buildTrendSvg(points: HouseholdExpenseMonthlyTrendPoint[], title: string) {
  const width = 760;
  const height = 320;
  const chartX = 62;
  const chartY = 70;
  const chartW = 640;
  const chartH = 190;
  const maxTotal = Math.max(1, ...points.map((point) => point.total));
  const barWidth = Math.max(28, chartW / Math.max(1, points.length) - 18);
  const slotWidth = chartW / Math.max(1, points.length);

  const bars = points.map((point, index) => {
    const x = chartX + index * slotWidth + 8;
    const h = Math.max(4, (point.total / maxTotal) * chartH);
    const y = chartY + chartH - h;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="8" fill="#15803D"/>
      <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="700" fill="#0F172A">${escapeXml(formatHouseholdMoney(point.total).replace('.00', ''))}</text>
      <text x="${x + barWidth / 2}" y="${chartY + chartH + 25}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#64748B">${escapeXml(point.label.replace(' 20', ' '))}</text>
    `;
  }).join('');
  const linePoints = points
    .map((point, index) => {
      const x = chartX + index * slotWidth + 8 + barWidth / 2;
      const y = chartY + chartH - Math.max(4, (point.total / maxTotal) * chartH);
      return { x, y };
    });
  const trendLine = linePoints.length > 1
    ? `
      <polyline points="${linePoints.map((point) => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="#0F172A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      ${linePoints.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#FFFFFF" stroke="#0F172A" stroke-width="3"/>`).join('')}
    `
    : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="20" fill="#FFFFFF"/>
      <text x="30" y="42" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="#0F172A">${escapeXml(title)}</text>
      <line x1="${chartX}" y1="${chartY + chartH}" x2="${chartX + chartW}" y2="${chartY + chartH}" stroke="#E2E8F0" stroke-width="2"/>
      <line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartH}" stroke="#E2E8F0" stroke-width="2"/>
      ${bars}
      ${trendLine}
    </svg>
  `;
}

function formatDate(value: string) {
  const parsed = new Date(value || '');
  if (!Number.isFinite(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
  }).format(parsed);
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, Math.max(0, monthNumber - 1), 1));
}

function getYearComparisonSummary(comparison: HouseholdExpenseYearComparison, label: string) {
  const comparisonLabel = formatMonthLabel(comparison.comparison_month);
  if (!comparison.has_comparison) {
    return `${label}: No ${comparisonLabel} comparison yet.`;
  }
  const amountDelta = comparison.delta === 0
    ? '$0.00'
    : `${comparison.delta > 0 ? '+' : '-'}${formatHouseholdMoney(Math.abs(comparison.delta))}`;
  const percentDelta = comparison.percent_delta === null
    ? ''
    : ` (${comparison.percent_delta > 0 ? '+' : ''}${comparison.percent_delta}%)`;
  return `${label}: ${amountDelta}${percentDelta} vs ${comparisonLabel}.`;
}

export async function generateHouseholdExpenseReportPdf({
  reportData,
  insights,
}: {
  reportData: HouseholdExpenseReportData;
  insights: HouseholdExpenseInsights;
}) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;
  let hasContent = false;

  const addPage = (title: string, kicker: string) => {
    if (hasContent) doc.addPage();
    hasContent = true;
    y = margin;
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.text(title, margin, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(kicker, margin, 25);
    y = 45;
  };

  const addWrapped = (text: string, fontSize = 10, color: [number, number, number] = [51, 65, 85]) => {
    const lines = doc.splitTextToSize(String(text || ''), pageWidth - margin * 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += fontSize * 0.45 + 2;
    });
  };

  const addImageOrFallback = (dataUrl: string, width: number, height: number) => {
    if (dataUrl) {
      doc.addImage(dataUrl, 'PNG', margin, y, width, height);
      y += height + 8;
      return;
    }
    addWrapped('Chart rendering was unavailable in this environment. The category and trend data is listed below.', 10);
    y += 3;
  };

  const addTransactions = (transactions: HouseholdExpenseTransaction[], title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 8;
    if (!transactions.length) {
      addWrapped('No bills are due for this report period.', 10);
      return;
    }
    const headers = ['Date', 'Title', 'Category', 'Amount'];
    const widths = [24, 76, 48, 28];
    const drawHeader = () => {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      let x = margin + 2;
      headers.forEach((header, index) => {
        doc.text(header, x, y);
        x += widths[index];
      });
      y += 7;
    };
    drawHeader();
    transactions.forEach((transaction, index) => {
      if (y > pageHeight - 22) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const row = [
        formatDate(transaction.due_at),
        transaction.title,
        transaction.category,
        formatHouseholdMoney(transaction.amount),
      ];
      let x = margin + 2;
      row.forEach((value, cellIndex) => {
        const text = doc.splitTextToSize(value, widths[cellIndex] - 4)[0] || '';
        doc.text(text, x, y);
        x += widths[cellIndex];
      });
      y += 7;
      if (index < transactions.length - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y - 4, pageWidth - margin, y - 4);
      }
    });
  };

  const householdWeekPng = await svgToPngDataUrl(buildDonutSvg(reportData.household_week, 'Household - this week'), 560, 320);
  const householdMonthPng = await svgToPngDataUrl(buildDonutSvg(reportData.household_month, 'Household - selected month'), 560, 320);
  const personalWeekPng = await svgToPngDataUrl(buildDonutSvg(reportData.personal_week, 'Personal - this week'), 560, 320);
  const personalMonthPng = await svgToPngDataUrl(buildDonutSvg(reportData.personal_month, 'Personal - selected month'), 560, 320);
  const householdTrendPng = await svgToPngDataUrl(buildTrendSvg(reportData.household_mom_trend, 'Household month-over-month trend'), 760, 320);
  const personalTrendPng = await svgToPngDataUrl(buildTrendSvg(reportData.personal_mom_trend, 'Personal month-over-month trend'), 760, 320);

  addPage('Spending Report', `${reportData.household_name} - household overview`);
  addImageOrFallback(householdWeekPng, 178, 102);
  addImageOrFallback(householdMonthPng, 178, 102);

  addPage('Household Transactions', 'Selected due month household bills');
  addTransactions(reportData.household_transactions, 'Household transaction list');

  addPage('Household Trend', 'Six-month spending movement');
  addImageOrFallback(householdTrendPng, 178, 75);
  addWrapped(getYearComparisonSummary(reportData.household_yoy_comparison, 'Same month last year'), 10);

  addPage('Personal Spending', 'Your own split responsibility only');
  addImageOrFallback(personalWeekPng, 178, 102);
  addImageOrFallback(personalMonthPng, 178, 102);

  addPage('Personal Transactions', 'Selected due month personal transaction view');
  addTransactions(reportData.personal_transactions, 'Personal transaction list');

  addPage('Personal Trend', 'Six-month personal spending movement');
  addImageOrFallback(personalTrendPng, 178, 75);
  addWrapped(getYearComparisonSummary(reportData.personal_yoy_comparison, 'Same month last year'), 10);

  addPage('AI Spending Insights', 'Professional budgeting advice based on the logged data');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(insights.headline || 'Spending insights', margin, y);
  y += 10;
  addWrapped(insights.executive_summary, 10.5);
  y += 4;

  [
    ['Key observations', insights.key_observations],
    ['Advice', insights.advice],
    ['Goal notes', insights.goal_notes],
  ].forEach(([heading, items]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(String(heading), margin, y);
    y += 7;
    (items as string[]).forEach((item) => {
      addWrapped(`- ${item}`, 9.5);
    });
    y += 4;
  });

  return doc.output('blob');
}

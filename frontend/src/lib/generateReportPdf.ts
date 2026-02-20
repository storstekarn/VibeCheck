import { jsPDF } from 'jspdf';
import type { QAReport, Bug, Severity } from '../types';

const BRAND_YELLOW = '#fcb900';
const CHARCOAL = '#32373c';
const CHARCOAL_LIGHT = '#4a5058';
const GRAY = '#6b7280';
const PAGE_WIDTH = 210;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const PAGE_HEIGHT = 297;
const FOOTER_Y = PAGE_HEIGHT - 15;
const BUG_INDENT = MARGIN + 5;
const BUG_CONTENT_WIDTH = CONTENT_WIDTH - 5;

const SEVERITY_COLORS: Record<Severity, { border: [number, number, number]; text: [number, number, number]; bg: [number, number, number]; label: string }> = {
  critical: {
    border: [185, 28, 28],
    text:   [153, 27, 27],
    bg:     [254, 242, 242],
    label:  'CRITICAL',
  },
  warning: {
    border: [161, 98, 7],
    text:   [133, 77, 14],
    bg:     [255, 251, 235],
    label:  'WARNING',
  },
  info: {
    border: [29, 78, 216],
    text:   [30, 64, 175],
    bg:     [239, 246, 255],
    label:  'INFO',
  },
};

const TYPE_LABELS: Record<string, string> = {
  'console-error':  'Console Error',
  'network-error':  'Network Error',
  'broken-link':    'Broken Link',
  'broken-image':   'Broken Image',
  'accessibility':  'Accessibility',
  'responsive':     'Responsive',
};

export function generateReportPdf(report: QAReport): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 0;

  function addFooter() {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, FOOTER_Y - 4, PAGE_WIDTH - MARGIN, FOOTER_Y - 4);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text('Powered by Synergy Minds', PAGE_WIDTH / 2, FOOTER_Y, { align: 'center' });
      doc.text(`${i} / ${pageCount}`, PAGE_WIDTH - MARGIN, FOOTER_Y, { align: 'right' });
    }
  }

  function checkPageBreak(needed: number) {
    if (y + needed > FOOTER_Y - 10) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // --- Header banner ---
  doc.setFillColor(BRAND_YELLOW);
  doc.rect(0, 0, PAGE_WIDTH, 28, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CHARCOAL);
  doc.text('VibeCheck Report', PAGE_WIDTH / 2, 17, { align: 'center' });

  y = 38;

  // --- URL & timestamp ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY);
  doc.text(report.url, MARGIN, y);
  doc.text(new Date(report.timestamp).toLocaleString(), PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 8;

  // --- Summary card ---
  const CARD_H = 30;
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, CARD_H, 2, 2, 'F');

  // Left side: "X pages scanned" label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY);
  doc.text(
    `${report.pagesFound} page${report.pagesFound !== 1 ? 's' : ''} scanned`,
    MARGIN + 6,
    y + 9,
  );

  // Big count number
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CHARCOAL);
  const countStr = `${report.summary.totalBugs}`;
  doc.text(countStr, MARGIN + 6, y + 22);

  // "bugs found" label on the same baseline as the count
  const countW = doc.getTextWidth(countStr);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(CHARCOAL_LIGHT);
  doc.text('bugs found', MARGIN + 6 + countW + 2, y + 22);

  // Right side: severity pills, vertically centred in the card
  const PILL_H = 7;
  const pillCenterY = y + CARD_H / 2 - PILL_H / 2; // vertically centred

  const pills = [
    { count: report.summary.critical, ...SEVERITY_COLORS.critical },
    { count: report.summary.warnings, ...SEVERITY_COLORS.warning },
    { count: report.summary.info,     ...SEVERITY_COLORS.info },
  ];
  let px = PAGE_WIDTH - MARGIN - 6;
  for (let i = pills.length - 1; i >= 0; i--) {
    const p = pills[i];
    const pillText = `${p.count} ${p.label}`;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const pillW = doc.getTextWidth(pillText) + 8;
    const pillX = px - pillW;

    doc.setFillColor(...p.bg);
    doc.roundedRect(pillX, pillCenterY, pillW, PILL_H, 2, 2, 'F');
    doc.setTextColor(...p.text);
    doc.text(pillText, pillX + 4, pillCenterY + 4.8);

    px = pillX - 4;
  }

  y += CARD_H + 8;

  // --- Bug list ---
  const allBugs = (report.pages ?? []).flatMap((p) => p.bugs ?? []);

  if (allBugs.length === 0) {
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('No bugs found! Your app looks great.', PAGE_WIDTH / 2, y + 10, { align: 'center' });
  } else {
    // Section label
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(160, 160, 160);
    const sectionLabel = `BUGS — ${allBugs.length} FOUND`;
    doc.text(sectionLabel, MARGIN, y);
    const labelW = doc.getTextWidth(sectionLabel);
    doc.setDrawColor(220, 220, 220);
    doc.line(MARGIN + labelW + 3, y - 0.5, PAGE_WIDTH - MARGIN, y - 0.5);
    y += 6;

    for (const bug of allBugs) {
      renderBug(bug);
    }
  }

  addFooter();
  return doc;

  function renderBug(bug: Bug) {
    checkPageBreak(50);

    const sev = SEVERITY_COLORS[bug.severity];
    const cardTop = y;
    y += 3; // top padding

    // Severity label + type (one line)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...sev.text);
    doc.text(sev.label, BUG_INDENT, y);
    const labelW = doc.getTextWidth(sev.label);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY);
    doc.text(`  ·  ${TYPE_LABELS[bug.type] || bug.type}`, BUG_INDENT + labelW, y);
    y += 6;

    // Title
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(CHARCOAL);
    const titleLines = doc.splitTextToSize(bug.title, BUG_CONTENT_WIDTH);
    doc.text(titleLines, BUG_INDENT, y);
    y += titleLines.length * 4.5 + 2;

    // Details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(CHARCOAL_LIGHT);
    const detailLines = doc.splitTextToSize(bug.details, BUG_CONTENT_WIDTH);
    doc.text(detailLines, BUG_INDENT, y);
    y += detailLines.length * 3.8 + 2;

    // Page URL
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    try {
      doc.text(new URL(bug.page).pathname, BUG_INDENT, y);
    } catch {
      doc.text(bug.page, BUG_INDENT, y);
    }
    y += 5;

    // Fix prompt box
    if (bug.fixPrompt) {
      checkPageBreak(20);
      const promptLines = doc.splitTextToSize(bug.fixPrompt, BUG_CONTENT_WIDTH - 10);
      const boxH = promptLines.length * 3.8 + 10;

      doc.setFillColor(248, 249, 250);
      doc.roundedRect(BUG_INDENT, y, BUG_CONTENT_WIDTH, boxH, 1.5, 1.5, 'F');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(160, 160, 160);
      doc.text('FIX PROMPT', BUG_INDENT + 4, y + 4);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(CHARCOAL);
      doc.text(promptLines, BUG_INDENT + 4, y + 8.5);
      y += boxH + 2;
    }

    y += 3; // bottom padding

    // Left colour border drawn last — spans exact card height with no offsets
    doc.setFillColor(...sev.border);
    doc.roundedRect(MARGIN, cardTop, 1.5, y - cardTop, 0.75, 0.75, 'F');

    y += 5; // gap between cards
  }
}

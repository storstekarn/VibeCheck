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
const BUG_INDENT = MARGIN + 5; // content indented past the left border
const BUG_CONTENT_WIDTH = CONTENT_WIDTH - 5;

// Darker, high-contrast colors for PDF readability
const SEVERITY_COLORS: Record<Severity, { border: [number, number, number]; text: [number, number, number]; bg: [number, number, number]; label: string }> = {
  critical: {
    border: [185, 28, 28],    // red-800
    text: [153, 27, 27],      // red-800
    bg: [254, 242, 242],      // red-50
    label: 'CRITICAL',
  },
  warning: {
    border: [161, 98, 7],     // amber-700
    text: [133, 77, 14],      // amber-800
    bg: [255, 251, 235],      // amber-50
    label: 'WARNING',
  },
  info: {
    border: [29, 78, 216],    // blue-700
    text: [30, 64, 175],      // blue-800
    bg: [239, 246, 255],      // blue-50
    label: 'INFO',
  },
};

const TYPE_LABELS: Record<string, string> = {
  'console-error': 'Console Error',
  'network-error': 'Network Error',
  'broken-link': 'Broken Link',
  'broken-image': 'Broken Image',
  'accessibility': 'Accessibility',
  'responsive': 'Responsive',
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
  const dateStr = new Date(report.timestamp).toLocaleString();
  doc.text(dateStr, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 8;

  // --- Summary card ---
  const summaryHeight = 28;
  doc.setFillColor(248, 249, 250); // gray-50
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, summaryHeight, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(CHARCOAL);
  doc.text(`${report.pagesFound} pages scanned`, MARGIN + 6, y + 8);

  doc.setFontSize(18);
  doc.text(`${report.summary.totalBugs}`, MARGIN + 6, y + 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(' bugs found', MARGIN + 6 + doc.getTextWidth(`${report.summary.totalBugs} `), y + 20);

  // Severity pills on the right side of summary card
  const pills = [
    { count: report.summary.critical, ...SEVERITY_COLORS.critical },
    { count: report.summary.warnings, ...SEVERITY_COLORS.warning },
    { count: report.summary.info, ...SEVERITY_COLORS.info },
  ];
  let px = PAGE_WIDTH - MARGIN - 6;
  for (let i = pills.length - 1; i >= 0; i--) {
    const p = pills[i];
    const pillText = `${p.count} ${p.label}`;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const tw = doc.getTextWidth(pillText);
    const pillW = tw + 6;
    const pillX = px - pillW;

    // Pill background
    doc.setFillColor(...p.bg);
    doc.roundedRect(pillX, y + 14, pillW, 6, 1.5, 1.5, 'F');

    // Pill text
    doc.setTextColor(...p.text);
    doc.text(pillText, pillX + 3, y + 18.5);

    px = pillX - 3;
  }

  y += summaryHeight + 8;

  // --- Warnings ---
  if (report.warnings && report.warnings.length > 0) {
    for (const warning of report.warnings) {
      const warnLines = doc.splitTextToSize(warning, CONTENT_WIDTH - 10);
      const warnHeight = warnLines.length * 4 + 6;
      doc.setFillColor(255, 251, 235); // amber-50
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, warnHeight, 1.5, 1.5, 'F');
      doc.setFillColor(161, 98, 7); // amber-700
      doc.roundedRect(MARGIN, y, 1.5, warnHeight, 0.75, 0.75, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(133, 77, 14); // amber-800
      doc.text(warnLines, MARGIN + 6, y + 5);
      y += warnHeight + 4;
    }
  }

  // --- Bugs ---
  const allBugs = report.pages.flatMap((p) => p.bugs);

  if (allBugs.length === 0) {
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('No bugs found! Your app looks great.', PAGE_WIDTH / 2, y + 10, { align: 'center' });
  } else {
    for (const bug of allBugs) {
      renderBug(doc, bug);
    }
  }

  addFooter();
  return doc;

  function renderBug(doc: jsPDF, bug: Bug) {
    // Estimate height needed: header + title + details + page + prompt
    checkPageBreak(45);

    const sev = SEVERITY_COLORS[bug.severity];
    const cardTop = y;

    // --- Severity label + type on one line ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...sev.text);
    doc.text(sev.label, BUG_INDENT, y + 3.5);
    const labelW = doc.getTextWidth(sev.label);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY);
    doc.text(`  ·  ${TYPE_LABELS[bug.type] || bug.type}`, BUG_INDENT + labelW, y + 3.5);
    y += 7;

    // --- Title ---
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(CHARCOAL);
    const titleLines = doc.splitTextToSize(bug.title, BUG_CONTENT_WIDTH);
    doc.text(titleLines, BUG_INDENT, y);
    y += titleLines.length * 4.5 + 1;

    // --- Details ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(CHARCOAL_LIGHT);
    const detailLines = doc.splitTextToSize(bug.details, BUG_CONTENT_WIDTH);
    doc.text(detailLines, BUG_INDENT, y);
    y += detailLines.length * 3.8 + 1;

    // --- Page URL ---
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    try {
      doc.text(new URL(bug.page).pathname, BUG_INDENT, y);
    } catch {
      doc.text(bug.page, BUG_INDENT, y);
    }
    y += 4;

    // --- Fix prompt box ---
    if (bug.fixPrompt) {
      checkPageBreak(18);
      const promptLines = doc.splitTextToSize(bug.fixPrompt, BUG_CONTENT_WIDTH - 10);
      const boxHeight = promptLines.length * 3.8 + 10;

      doc.setFillColor(248, 249, 250); // gray-50
      doc.roundedRect(BUG_INDENT, y, BUG_CONTENT_WIDTH, boxHeight, 1.5, 1.5, 'F');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(160, 160, 160);
      doc.text('FIX PROMPT', BUG_INDENT + 4, y + 4);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(CHARCOAL);
      doc.text(promptLines, BUG_INDENT + 4, y + 8.5);
      y += boxHeight + 2;
    }

    // --- Draw left color border (drawn last so it spans the full card height) ---
    const cardHeight = y - cardTop;
    doc.setFillColor(...sev.border);
    doc.roundedRect(MARGIN, cardTop - 1, 1.5, cardHeight + 1, 0.75, 0.75, 'F');

    // --- Spacing between bug cards ---
    y += 6;
  }
}

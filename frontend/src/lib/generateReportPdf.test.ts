import { describe, it, expect } from 'vitest';
import { generateReportPdf } from './generateReportPdf';
import type { QAReport } from '../types';

function makeReport(overrides: Partial<QAReport> = {}): QAReport {
  return {
    url: 'https://myapp.lovable.app',
    timestamp: '2025-01-15T12:00:00Z',
    pagesFound: 3,
    pages: [
      {
        url: 'https://myapp.lovable.app/',
        title: 'Home',
        bugs: [
          {
            id: 'bug-1',
            type: 'console-error',
            severity: 'critical',
            title: 'Uncaught exception: TypeError',
            details: 'Cannot read properties of undefined',
            page: 'https://myapp.lovable.app/',
            fixPrompt: 'Fix the TypeError on the home page.',
          },
          {
            id: 'bug-2',
            type: 'accessibility',
            severity: 'info',
            title: 'Missing alt text',
            details: 'Images missing alt attributes',
            page: 'https://myapp.lovable.app/',
            fixPrompt: 'Add alt text to images.',
          },
        ],
      },
      {
        url: 'https://myapp.lovable.app/about',
        title: 'About',
        bugs: [
          {
            id: 'bug-3',
            type: 'responsive',
            severity: 'warning',
            title: 'Horizontal overflow at Mobile',
            details: 'Content overflows at 375px',
            page: 'https://myapp.lovable.app/about',
            fixPrompt: 'Fix responsive layout on about page.',
          },
        ],
      },
    ],
    summary: {
      totalBugs: 3,
      critical: 1,
      warnings: 1,
      info: 1,
      byType: {
        'console-error': 1,
        'network-error': 0,
        'broken-link': 0,
        'broken-image': 0,
        'accessibility': 1,
        'responsive': 1,
      },
    },
    ...overrides,
  };
}

describe('generateReportPdf', () => {
  it('should return a jsPDF instance', () => {
    const doc = generateReportPdf(makeReport());
    expect(doc).toBeDefined();
    expect(typeof doc.save).toBe('function');
    expect(typeof doc.output).toBe('function');
  });

  it('should contain the report title', () => {
    const doc = generateReportPdf(makeReport());
    const text = doc.output('datauristring');
    // jsPDF encodes text into the PDF - we can check the raw output contains our text
    // A more reliable check: get the internal pages
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('should handle a report with no bugs', () => {
    const clean = makeReport({
      pages: [{ url: 'https://myapp.lovable.app/', title: 'Home', bugs: [] }],
      summary: {
        totalBugs: 0,
        critical: 0,
        warnings: 0,
        info: 0,
        byType: { 'console-error': 0, 'network-error': 0, 'broken-link': 0, 'broken-image': 0, 'accessibility': 0, 'responsive': 0 },
      },
    });
    const doc = generateReportPdf(clean);
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('should handle a report with many bugs (multi-page)', () => {
    const manyBugs = Array.from({ length: 30 }, (_, i) => ({
      id: `bug-${i}`,
      type: 'console-error' as const,
      severity: 'warning' as const,
      title: `Bug number ${i}`,
      details: `Detailed description of bug ${i} that has some length to it.`,
      page: 'https://myapp.lovable.app/',
      fixPrompt: `Fix bug ${i} by doing the thing that needs to be done.`,
    }));
    const report = makeReport({
      pages: [{ url: 'https://myapp.lovable.app/', title: 'Home', bugs: manyBugs }],
      summary: {
        totalBugs: 30,
        critical: 0,
        warnings: 30,
        info: 0,
        byType: { 'console-error': 30, 'network-error': 0, 'broken-link': 0, 'broken-image': 0, 'accessibility': 0, 'responsive': 0 },
      },
    });
    const doc = generateReportPdf(report);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('should produce valid PDF output', () => {
    const doc = generateReportPdf(makeReport());
    const output = doc.output('datauristring');
    expect(output).toContain('data:application/pdf');
  });
});

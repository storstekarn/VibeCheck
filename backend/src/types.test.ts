import { describe, it, expect } from 'vitest';
import type { Bug, PageReport, QAReport, ProgressEvent, ReportSummary } from './types.js';

describe('Types', () => {
  it('should create a valid Bug object', () => {
    const bug: Bug = {
      id: 'bug-1',
      type: 'console-error',
      severity: 'critical',
      title: 'TypeError on dashboard',
      details: 'Cannot read properties of undefined',
      page: 'https://example.lovable.app/dashboard',
      fixPrompt: 'Fix the TypeError on the dashboard page.',
    };

    expect(bug.id).toBe('bug-1');
    expect(bug.type).toBe('console-error');
    expect(bug.severity).toBe('critical');
  });

  it('should create a valid PageReport object', () => {
    const page: PageReport = {
      url: 'https://example.lovable.app/',
      title: 'Home',
      bugs: [],
    };

    expect(page.url).toBe('https://example.lovable.app/');
    expect(page.bugs).toEqual([]);
  });

  it('should create a valid QAReport object', () => {
    const report: QAReport = {
      url: 'https://example.lovable.app',
      timestamp: new Date().toISOString(),
      pagesFound: 0,
      pages: [],
      summary: {
        totalBugs: 0,
        critical: 0,
        warnings: 0,
        info: 0,
        byType: {
          'console-error': 0,
          'network-error': 0,
          'broken-link': 0,
          'broken-image': 0,
          'accessibility': 0,
          'responsive': 0,
        },
      },
    };

    expect(report.pagesFound).toBe(0);
    expect(report.summary.totalBugs).toBe(0);
  });

  it('should create a valid ProgressEvent object', () => {
    const event: ProgressEvent = {
      phase: 'crawling',
      message: 'Discovering pages...',
      progress: 25,
    };

    expect(event.phase).toBe('crawling');
    expect(event.progress).toBe(25);
  });
});

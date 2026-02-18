import { describe, it, expect } from 'vitest';
import { buildReport } from './report-builder.js';
import type { Bug, PageReport } from './types.js';

function makeBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: '',
    type: 'console-error',
    severity: 'critical',
    title: 'Some error',
    details: 'Error details',
    page: 'https://example.com/',
    fixPrompt: 'Fix it.',
    ...overrides,
  };
}

function makePage(overrides: Partial<PageReport> = {}): PageReport {
  return {
    url: 'https://example.com/',
    title: 'Home',
    bugs: [],
    ...overrides,
  };
}

describe('buildReport', () => {
  it('should build a report with zero bugs', () => {
    const report = buildReport('https://example.com', [
      makePage({ url: 'https://example.com/', bugs: [] }),
    ]);

    expect(report.url).toBe('https://example.com');
    expect(report.pagesFound).toBe(1);
    expect(report.summary.totalBugs).toBe(0);
    expect(report.summary.critical).toBe(0);
    expect(report.summary.warnings).toBe(0);
    expect(report.summary.info).toBe(0);
  });

  it('should assign unique IDs to all bugs', () => {
    const report = buildReport('https://example.com', [
      makePage({
        bugs: [
          makeBug({ title: 'Bug A' }),
          makeBug({ title: 'Bug B' }),
        ],
      }),
      makePage({
        url: 'https://example.com/about',
        title: 'About',
        bugs: [makeBug({ title: 'Bug C' })],
      }),
    ]);

    const allIds = report.pages.flatMap((p) => p.bugs.map((b) => b.id));
    expect(allIds.length).toBe(3);
    // All IDs should be unique
    expect(new Set(allIds).size).toBe(3);
    // All IDs should be non-empty
    expect(allIds.every((id) => id.length > 0)).toBe(true);
  });

  it('should sort bugs by severity: critical first, then warning, then info', () => {
    const report = buildReport('https://example.com', [
      makePage({
        bugs: [
          makeBug({ severity: 'info', title: 'Info bug' }),
          makeBug({ severity: 'critical', title: 'Critical bug' }),
          makeBug({ severity: 'warning', title: 'Warning bug' }),
        ],
      }),
    ]);

    const severities = report.pages[0].bugs.map((b) => b.severity);
    expect(severities).toEqual(['critical', 'warning', 'info']);
  });

  it('should count bugs correctly in summary', () => {
    const report = buildReport('https://example.com', [
      makePage({
        bugs: [
          makeBug({ severity: 'critical', type: 'console-error' }),
          makeBug({ severity: 'critical', type: 'network-error' }),
          makeBug({ severity: 'warning', type: 'broken-link' }),
          makeBug({ severity: 'info', type: 'accessibility' }),
        ],
      }),
    ]);

    expect(report.summary.totalBugs).toBe(4);
    expect(report.summary.critical).toBe(2);
    expect(report.summary.warnings).toBe(1);
    expect(report.summary.info).toBe(1);
  });

  it('should count bugs by type in summary', () => {
    const report = buildReport('https://example.com', [
      makePage({
        bugs: [
          makeBug({ type: 'console-error', title: 'Error A' }),
          makeBug({ type: 'console-error', title: 'Error B' }),
          makeBug({ type: 'broken-link' }),
          makeBug({ type: 'accessibility' }),
        ],
      }),
    ]);

    expect(report.summary.byType['console-error']).toBe(2);
    expect(report.summary.byType['broken-link']).toBe(1);
    expect(report.summary.byType['accessibility']).toBe(1);
    expect(report.summary.byType['network-error']).toBe(0);
    expect(report.summary.byType['broken-image']).toBe(0);
    expect(report.summary.byType['responsive']).toBe(0);
  });

  it('should deduplicate identical bugs across pages', () => {
    const sharedBug = {
      type: 'console-error' as const,
      severity: 'critical' as const,
      title: 'Uncaught exception: TypeError',
      details: "Cannot read properties of undefined (reading 'map')",
      fixPrompt: 'Fix it.',
    };

    const report = buildReport('https://example.com', [
      makePage({
        url: 'https://example.com/',
        bugs: [makeBug({ ...sharedBug, page: 'https://example.com/' })],
      }),
      makePage({
        url: 'https://example.com/about',
        title: 'About',
        bugs: [makeBug({ ...sharedBug, page: 'https://example.com/about' })],
      }),
    ]);

    // The duplicate should be removed from one page
    const allBugs = report.pages.flatMap((p) => p.bugs);
    const matchingBugs = allBugs.filter((b) => b.title === sharedBug.title);
    expect(matchingBugs.length).toBe(1);
  });

  it('should include a valid timestamp', () => {
    const report = buildReport('https://example.com', [makePage()]);

    expect(report.timestamp).toBeTruthy();
    // Should be a valid ISO date
    expect(() => new Date(report.timestamp)).not.toThrow();
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });

  it('should aggregate bugs across multiple pages', () => {
    const report = buildReport('https://example.com', [
      makePage({
        url: 'https://example.com/',
        bugs: [makeBug({ title: 'Bug on home' })],
      }),
      makePage({
        url: 'https://example.com/about',
        title: 'About',
        bugs: [
          makeBug({ title: 'Bug on about 1', page: 'https://example.com/about' }),
          makeBug({ title: 'Bug on about 2', page: 'https://example.com/about' }),
        ],
      }),
    ]);

    expect(report.summary.totalBugs).toBe(3);
    expect(report.pagesFound).toBe(2);
  });
});

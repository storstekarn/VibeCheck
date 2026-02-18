import { v4 as uuidv4 } from 'uuid';
import type { Bug, BugType, PageReport, QAReport, ReportSummary, Severity } from './types.js';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const ALL_BUG_TYPES: BugType[] = [
  'console-error',
  'network-error',
  'broken-link',
  'broken-image',
  'accessibility',
  'responsive',
];

/**
 * Create a fingerprint for a bug to detect duplicates across pages.
 * Two bugs are considered duplicates if they have the same type, title, and details.
 */
function bugFingerprint(bug: Bug): string {
  return `${bug.type}::${bug.title}::${bug.details}`;
}

/**
 * Build a complete QA report from page results.
 * - Assigns unique IDs to all bugs
 * - Deduplicates identical bugs across pages
 * - Sorts bugs by severity (critical first)
 * - Generates summary counts
 */
export function buildReport(url: string, pages: PageReport[]): QAReport {
  const seenFingerprints = new Set<string>();

  // Process each page: deduplicate, sort, assign IDs
  const processedPages: PageReport[] = pages.map((page) => {
    const uniqueBugs: Bug[] = [];

    for (const bug of page.bugs) {
      const fp = bugFingerprint(bug);
      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);

      uniqueBugs.push({
        ...bug,
        id: uuidv4(),
      });
    }

    // Sort by severity
    uniqueBugs.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

    return {
      ...page,
      bugs: uniqueBugs,
    };
  });

  // Build summary
  const allBugs = processedPages.flatMap((p) => p.bugs);
  const summary = buildSummary(allBugs);

  return {
    url,
    timestamp: new Date().toISOString(),
    pagesFound: pages.length,
    pages: processedPages,
    summary,
  };
}

function buildSummary(bugs: Bug[]): ReportSummary {
  const byType: Record<BugType, number> = Object.fromEntries(
    ALL_BUG_TYPES.map((t) => [t, 0])
  ) as Record<BugType, number>;

  let critical = 0;
  let warnings = 0;
  let info = 0;

  for (const bug of bugs) {
    byType[bug.type]++;
    switch (bug.severity) {
      case 'critical':
        critical++;
        break;
      case 'warning':
        warnings++;
        break;
      case 'info':
        info++;
        break;
    }
  }

  return {
    totalBugs: bugs.length,
    critical,
    warnings,
    info,
    byType,
  };
}

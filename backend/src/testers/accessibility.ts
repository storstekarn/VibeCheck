import AxeBuilder from '@axe-core/playwright';
import type { Page } from 'playwright';
import type { Bug, Severity } from '../types.js';

// Minimal shape of the axe-core results we actually use
interface AxeNode {
  html: string;
}

interface AxeViolation {
  id: string;
  impact?: string;
  help: string;
  description: string;
  nodes: AxeNode[];
}

interface AxeResults {
  violations: AxeViolation[];
}

/**
 * Map axe-core impact levels to our severity.
 */
function mapImpact(impact: string | undefined): Severity {
  switch (impact) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'warning';
    case 'moderate':
    case 'minor':
    default:
      return 'info';
  }
}

/**
 * Run axe-core accessibility audit on a page.
 * Returns up to 10 violations.
 */
export async function testAccessibility(page: Page, url: string): Promise<Bug[]> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  // AxeBuilder uses `export =` which TypeScript NodeNext doesn't support with default
  // imports — cast to any for construction, then type the result explicitly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await (new (AxeBuilder as any)({ page })).analyze() as AxeResults;

  const bugs: Bug[] = [];

  for (const violation of results.violations) {
    if (bugs.length >= 10) break;

    const affectedElements = violation.nodes
      .slice(0, 3)
      .map((n: AxeNode) => n.html)
      .join(', ');

    bugs.push({
      id: '',
      type: 'accessibility',
      severity: mapImpact(violation.impact),
      title: `${violation.id}: ${violation.help}`,
      details: `${violation.description}. Affected elements: ${affectedElements}`,
      page: url,
      fixPrompt: '',
    });
  }

  return bugs;
}

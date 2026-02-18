import AxeBuilder from '@axe-core/playwright';
import type { Page } from 'playwright';
import type { Bug, Severity } from '../types.js';

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

  const results = await new AxeBuilder({ page }).analyze();

  const bugs: Bug[] = [];

  for (const violation of results.violations) {
    if (bugs.length >= 10) break;

    const affectedElements = violation.nodes
      .slice(0, 3)
      .map((n) => n.html)
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

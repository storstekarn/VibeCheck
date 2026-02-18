import type { Page } from 'playwright';
import type { Bug, Severity } from '../types.js';

interface Viewport {
  name: string;
  width: number;
  height: number;
  overflowSeverity: Severity;
}

const VIEWPORTS: Viewport[] = [
  { name: 'Mobile (375px)', width: 375, height: 812, overflowSeverity: 'warning' },
  { name: 'Tablet (768px)', width: 768, height: 1024, overflowSeverity: 'warning' },
  { name: 'Desktop (1440px)', width: 1440, height: 900, overflowSeverity: 'info' },
];

/**
 * Test a page for horizontal overflow at multiple viewport sizes.
 */
export async function testResponsive(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasOverflow) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

      bugs.push({
        id: '',
        type: 'responsive',
        severity: viewport.overflowSeverity,
        title: `Horizontal overflow at ${viewport.name}`,
        details: `Page has horizontal overflow at ${viewport.width}px width. Content width: ${scrollWidth}px, viewport: ${viewport.width}px.`,
        page: url,
        fixPrompt: '',
      });
    }
  }

  return bugs;
}

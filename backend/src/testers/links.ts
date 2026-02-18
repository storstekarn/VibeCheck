import type { Page } from 'playwright';
import type { Bug } from '../types.js';

const SKIP_PROTOCOLS = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:'];

/**
 * Check all <a> links on a page for broken targets (4xx/5xx).
 * Navigates to the page first, then checks each link.
 */
export async function testBrokenLinks(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Extract all href values
  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.getAttribute('href')).filter(Boolean) as string[]
  );

  // Resolve relative URLs and deduplicate
  const baseOrigin = new URL(url).origin;
  const checked = new Set<string>();

  for (const href of hrefs) {
    // Skip special protocols
    if (SKIP_PROTOCOLS.some((p) => href.toLowerCase().startsWith(p))) continue;
    if (href.startsWith('#')) continue;

    let resolved: string;
    try {
      resolved = new URL(href, url).toString();
    } catch {
      continue;
    }

    // Remove hash fragment for checking
    const withoutHash = resolved.split('#')[0];
    if (checked.has(withoutHash)) continue;
    checked.add(withoutHash);

    try {
      const response = await page.request.fetch(withoutHash, {
        method: 'HEAD',
        timeout: 10000,
      });

      if (response.status() >= 400) {
        bugs.push({
          id: '',
          type: 'broken-link',
          severity: 'warning',
          title: `Broken link: ${href}`,
          details: `Link to ${withoutHash} returned ${response.status()}`,
          page: url,
          fixPrompt: '',
        });
      }
    } catch {
      // Request failed entirely (timeout, DNS, etc.)
      bugs.push({
        id: '',
        type: 'broken-link',
        severity: 'warning',
        title: `Broken link: ${href}`,
        details: `Link to ${withoutHash} failed to load`,
        page: url,
        fixPrompt: '',
      });
    }
  }

  return bugs;
}

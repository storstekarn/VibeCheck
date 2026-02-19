import type { Page } from 'playwright';
import type { Bug } from '../types.js';

const SKIP_PROTOCOLS = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:'];
const MAX_LINKS = 50;       // Cap to avoid runaway checking on link-heavy pages
const LINK_TIMEOUT = 5000;  // 5 s per link (down from 10 s)

// Domains that intentionally block automated HEAD requests (crawlers/bots).
// They return 4xx/5xx to automation but work fine in real browsers — not broken links.
const BOT_BLOCKED_DOMAINS = [
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'threads.net',
];

function isBotBlocked(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return BOT_BLOCKED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

/**
 * Check all <a> links on a page for broken targets (4xx/5xx).
 * Navigates to the page first, then checks each link.
 * Capped at MAX_LINKS unique URLs to stay within the per-tester time budget.
 */
export async function testBrokenLinks(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Extract all href values
  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.getAttribute('href')).filter(Boolean) as string[]
  );

  // Resolve relative URLs and deduplicate
  const checked = new Set<string>();

  for (const href of hrefs) {
    // Honour the link cap
    if (checked.size >= MAX_LINKS) break;

    // Skip special protocols
    if (SKIP_PROTOCOLS.some((p) => href.toLowerCase().startsWith(p))) continue;
    if (href.startsWith('#')) continue;
    // Skip social/professional networks that block automated HEAD requests
    if (isBotBlocked(href)) continue;

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
        timeout: LINK_TIMEOUT,
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
      // Request failed entirely (timeout, DNS, etc.) — report as broken
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

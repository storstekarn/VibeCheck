import type { Page } from 'playwright';
import type { Bug } from '../types.js';

const SKIP_PROTOCOLS = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:'];
const MAX_LINKS = 50;
const HEAD_TIMEOUT = 8_000;
const GET_TIMEOUT  = 8_000;

// Domains that intentionally block automated HEAD/GET requests (social networks, etc.)
// They return 4xx/5xx to bots but work fine in real browsers.
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

type LinkResult =
  | { verdict: 'ok' }
  | { verdict: 'broken';    detail: string }
  | { verdict: 'uncertain'; detail: string };

/**
 * Check a single link with HEAD → GET fallback.
 *
 * Strategy:
 *  1. Try HEAD (fast, low bandwidth).
 *  2. If HEAD returns anything other than 404/410, retry with GET.
 *     Many servers legitimately reject HEAD from bots but serve GET fine.
 *  3. Only mark broken on:
 *     - Definitive 404 or 410 (from HEAD or GET)
 *     - Complete DNS / connection-refused failure on both attempts
 *  4. Everything else (403, 429, 5xx, timeout) → 'uncertain' (not reported).
 */
async function checkLink(page: Page, url: string): Promise<LinkResult> {
  // ── Step 1: HEAD ──────────────────────────────────────────────────────────
  try {
    const res = await page.request.fetch(url, { method: 'HEAD', timeout: HEAD_TIMEOUT });
    const s = res.status();

    if (s < 400)                   return { verdict: 'ok' };
    if (s === 404 || s === 410)    return { verdict: 'broken', detail: `Returned ${s}` };
    // Any other non-success: HEAD may be blocked — fall through to GET
  } catch {
    // HEAD timed out or network error — fall through to GET
  }

  // ── Step 2: GET fallback ──────────────────────────────────────────────────
  try {
    const res = await page.request.fetch(url, { method: 'GET', timeout: GET_TIMEOUT });
    const s = res.status();

    if (s < 400)                   return { verdict: 'ok' };          // HEAD was blocked; link is fine
    if (s === 404 || s === 410)    return { verdict: 'broken',    detail: `Returned ${s}` };
    // 403/429/5xx after retry — server is up but restricting automated access
    return { verdict: 'uncertain', detail: `Returned ${s} — may be access-restricted or temporarily unavailable` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // DNS failure or connection refused = domain/server doesn't exist
    if (msg.includes('ERR_NAME_NOT_RESOLVED') || msg.includes('ERR_CONNECTION_REFUSED')) {
      return { verdict: 'broken', detail: 'Domain not found or connection refused' };
    }
    // Timeout or other transient error — can't confirm broken
    return { verdict: 'uncertain', detail: 'Could not verify — site may be slow or temporarily unavailable' };
  }
}

/**
 * Attempt to dismiss common cookie/GDPR consent banners on the scanned page
 * before link extraction. Best-effort — never throws.
 */
async function dismissCookieConsent(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("Accept")',
    'button:has-text("Acceptera alla")', // Swedish
    'button:has-text("Acceptera")',       // Swedish
    'button:has-text("OK")',
    'button:has-text("Agree")',
    'button:has-text("Allow all")',
    '[aria-label*="Accept"][role="button"]',
    '[id*="accept-all"]',
    '[class*="accept-all"]',
  ];

  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 400 })) {
        await el.click({ timeout: 600 });
        return; // Only need to click one
      }
    } catch {
      // Not found or not clickable — try next
    }
  }
}

/**
 * Check all <a> links on a page for broken targets.
 * Uses HEAD → GET fallback so slow sites and bot-blocking servers
 * don't generate false positives. Only definitive 404/410 or DNS
 * failures are reported as broken.
 */
export async function testBrokenLinks(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Dismiss cookie consent banners so they don't interfere with link extraction
  await dismissCookieConsent(page);

  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.getAttribute('href')).filter(Boolean) as string[]
  );

  const checked = new Set<string>();

  for (const href of hrefs) {
    if (checked.size >= MAX_LINKS) break;

    if (SKIP_PROTOCOLS.some((p) => href.toLowerCase().startsWith(p))) continue;
    if (href.startsWith('#')) continue;
    if (isBotBlocked(href)) continue;

    let resolved: string;
    try {
      resolved = new URL(href, url).toString();
    } catch {
      continue;
    }

    const withoutHash = resolved.split('#')[0];
    if (checked.has(withoutHash)) continue;
    checked.add(withoutHash);

    const result = await checkLink(page, withoutHash);

    if (result.verdict === 'broken') {
      bugs.push({
        id: '',
        type: 'broken-link',
        severity: 'warning',
        title: `Broken link: ${href}`,
        details: `${withoutHash} — ${result.detail}`,
        page: url,
        fixPrompt: '',
      });
    }
    // 'ok' and 'uncertain' are not reported — uncertain means we can't
    // confirm the link is broken (e.g. bot protection, slow response)
  }

  return bugs;
}

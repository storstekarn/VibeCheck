import type { Page } from 'playwright';
import type { Bug } from '../types.js';

// URLs to ignore — third-party infrastructure not actionable by site owners
const IGNORE_PATTERNS = [
  /favicon\.ico/,
  /google-analytics/,
  /googletagmanager/,
  /hotjar/,
  /sentry/,
  /\/cdn-cgi\//,       // Cloudflare edge scripts (email-decode, rocket-loader, etc.)
  /cloudflareinsights/, // Cloudflare Web Analytics beacon
  /clarity\.ms/,        // Microsoft Clarity
  /doubleclick\.net/,   // Google Ads
  /adsbygoogle/,        // Google AdSense
];

function isNoisy(url: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Detect failed network requests (4xx/5xx responses and request failures).
 * Must be called BEFORE navigating.
 */
export async function testNetworkErrors(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  // Capture HTTP error responses
  page.on('response', (response) => {
    const reqUrl = response.url();
    const status = response.status();

    // Only care about errors, skip the page navigation itself
    if (status < 400) return;
    if (isNoisy(reqUrl)) return;
    // Skip the page's own URL (that's not an API error)
    if (reqUrl === url) return;

    const severity = status >= 500 ? 'critical' : 'warning';
    const label = status >= 500 ? 'Server error' : 'Client error';

    bugs.push({
      id: '',
      type: 'network-error',
      severity,
      title: `${label} ${status} on ${new URL(reqUrl).pathname}`,
      details: `${response.request().method()} ${reqUrl} returned ${status}`,
      page: url,
      fixPrompt: '',
    });
  });

  // Capture failed requests (no response at all)
  page.on('requestfailed', (request) => {
    const reqUrl = request.url();
    if (isNoisy(reqUrl)) return;
    if (reqUrl === url) return;

    bugs.push({
      id: '',
      type: 'network-error',
      severity: 'critical',
      title: `Request failed: ${new URL(reqUrl).pathname}`,
      details: `${request.method()} ${reqUrl} failed: ${request.failure()?.errorText || 'unknown error'}`,
      page: url,
      fixPrompt: '',
    });
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  return bugs;
}

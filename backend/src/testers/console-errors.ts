import type { Page } from 'playwright';
import type { Bug } from '../types.js';

// Console messages to ignore — third-party noise or sandbox artifacts
const IGNORE_CONSOLE_PATTERNS = [
  /favicon\.ico/,
  /\/cdn-cgi\//,               // Cloudflare infrastructure scripts
  /googletagmanager\.com/,     // GTM CSP violation — sandbox artifact, not a real site error
  /google-analytics\.com/,     // GA CSP violation — sandbox artifact
  /gtag\/js/,                  // GA4 tag — sandbox artifact
  /doubleclick\.net/,          // Google Ads
  /clarity\.ms/,               // Microsoft Clarity
  /Failed to load resource/,   // Generic 404/network noise — already caught by network tester
];

function isNoisyConsoleMessage(text: string): boolean {
  return IGNORE_CONSOLE_PATTERNS.some((p) => p.test(text));
}

/**
 * Detect JS exceptions and console.error messages on a page.
 * Must be called BEFORE navigating — attaches listeners first, then navigates.
 */
export async function testConsoleErrors(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  // Capture uncaught exceptions
  page.on('pageerror', (error) => {
    if (isNoisyConsoleMessage(error.message)) return;
    bugs.push({
      id: '',
      type: 'console-error',
      severity: 'critical',
      title: `Uncaught exception: ${error.message.split('\n')[0]}`,
      details: error.stack || error.message,
      page: url,
      fixPrompt: '',
    });
  });

  // Capture console.error messages
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (isNoisyConsoleMessage(text)) return;

      bugs.push({
        id: '',
        type: 'console-error',
        severity: 'warning',
        title: `Console error: ${text.slice(0, 100)}`,
        details: text,
        page: url,
        fixPrompt: '',
      });
    }
  });

  // Navigate and wait for the page to settle
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Give async errors a moment to fire
  await page.waitForTimeout(500);

  return bugs;
}

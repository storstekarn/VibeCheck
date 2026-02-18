import type { Page } from 'playwright';
import type { Bug } from '../types.js';

/**
 * Detect JS exceptions and console.error messages on a page.
 * Must be called BEFORE navigating — attaches listeners first, then navigates.
 */
export async function testConsoleErrors(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  // Capture uncaught exceptions
  page.on('pageerror', (error) => {
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
      // Skip noise from browser internals
      if (text.includes('favicon.ico')) return;

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

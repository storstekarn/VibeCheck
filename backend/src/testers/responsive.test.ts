import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'playwright';
import { startTestServer, stopTestServer, launchBrowser, type TestServer } from './test-helper.js';
import { testResponsive } from './responsive.js';

describe('Responsive Tester', () => {
  let browser: Browser;
  let server: TestServer;

  beforeAll(async () => {
    browser = await launchBrowser();
    server = await startTestServer({
      '/responsive': {
        body: `<!DOCTYPE html>
          <html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>body { margin: 0; } .container { width: 100%; max-width: 100%; }</style>
          </head><body>
            <div class="container"><p>Responsive page</p></div>
          </body></html>`,
      },
      '/overflow': {
        body: `<!DOCTYPE html>
          <html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>body { margin: 0; } .wide { width: 2000px; height: 50px; background: red; }</style>
          </head><body>
            <div class="wide">I am too wide</div>
          </body></html>`,
      },
    });
  });

  afterAll(async () => {
    await browser.close();
    await stopTestServer(server);
  });

  it('should return no bugs for a responsive page', async () => {
    const page = await browser.newPage();
    const bugs = await testResponsive(page, `${server.baseUrl}/responsive`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should detect horizontal overflow', async () => {
    const page = await browser.newPage();
    const bugs = await testResponsive(page, `${server.baseUrl}/overflow`);
    await page.close();

    expect(bugs.length).toBeGreaterThan(0);
    expect(bugs.every((b) => b.type === 'responsive')).toBe(true);
  });

  it('should test multiple viewports', async () => {
    const page = await browser.newPage();
    const bugs = await testResponsive(page, `${server.baseUrl}/overflow`);
    await page.close();

    // The 2000px element should overflow on all viewports
    const details = bugs.map((b) => b.details);
    expect(details.some((d) => d.includes('375'))).toBe(true); // mobile
    expect(details.some((d) => d.includes('768'))).toBe(true); // tablet
  });

  it('should set mobile/tablet overflow as warning, desktop as info', async () => {
    const page = await browser.newPage();
    const bugs = await testResponsive(page, `${server.baseUrl}/overflow`);
    await page.close();

    const warnings = bugs.filter((b) => b.severity === 'warning');
    const infos = bugs.filter((b) => b.severity === 'info');
    expect(warnings.length).toBeGreaterThanOrEqual(2); // mobile + tablet
    expect(infos.length).toBeGreaterThanOrEqual(1); // desktop
  });
});

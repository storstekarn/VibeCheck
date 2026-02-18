import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'playwright';
import { startTestServer, stopTestServer, launchBrowser, type TestServer } from './test-helper.js';
import { testBrokenLinks } from './links.js';

describe('Broken Link Tester', () => {
  let browser: Browser;
  let server: TestServer;

  beforeAll(async () => {
    browser = await launchBrowser();
    server = await startTestServer({
      '/good-links': {
        body: `<html><body>
          <a href="/existing-page">Existing</a>
          <a href="mailto:test@test.com">Email</a>
        </body></html>`,
      },
      '/existing-page': {
        body: '<html><body>I exist</body></html>',
      },
      '/broken-links': {
        body: `<html><body>
          <a href="/nonexistent-page">Broken Link</a>
          <a href="/also-missing">Also Missing</a>
          <a href="/existing-page">Works</a>
        </body></html>`,
      },
      '/no-links': {
        body: '<html><body><p>No links here</p></body></html>',
      },
    });
  });

  afterAll(async () => {
    await browser.close();
    await stopTestServer(server);
  });

  it('should return no bugs when all links are valid', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenLinks(page, `${server.baseUrl}/good-links`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should detect broken internal links', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenLinks(page, `${server.baseUrl}/broken-links`);
    await page.close();

    expect(bugs.length).toBe(2);
    expect(bugs.every((b) => b.type === 'broken-link')).toBe(true);
    expect(bugs.every((b) => b.severity === 'warning')).toBe(true);
  });

  it('should return no bugs for a page with no links', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenLinks(page, `${server.baseUrl}/no-links`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should include broken URL in bug details', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenLinks(page, `${server.baseUrl}/broken-links`);
    await page.close();

    expect(bugs.some((b) => b.details.includes('/nonexistent-page'))).toBe(true);
  });
});

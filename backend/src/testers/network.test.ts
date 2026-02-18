import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'playwright';
import { startTestServer, stopTestServer, launchBrowser, type TestServer } from './test-helper.js';
import { testNetworkErrors } from './network.js';

describe('Network Error Tester', () => {
  let browser: Browser;
  let server: TestServer;

  beforeAll(async () => {
    browser = await launchBrowser();
    server = await startTestServer({
      '/clean': {
        body: '<html><body><p>Clean page</p></body></html>',
      },
      '/with-500-fetch': {
        body: `<html><body>
          <script>
            fetch('/api/data').catch(() => {});
          </script>
        </body></html>`,
      },
      '/api/data': {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: '{"error": "Internal Server Error"}',
      },
      '/with-404-fetch': {
        body: `<html><body>
          <script>
            fetch('/api/missing').catch(() => {});
          </script>
        </body></html>`,
      },
    });
  });

  afterAll(async () => {
    await browser.close();
    await stopTestServer(server);
  });

  it('should return no bugs for a clean page', async () => {
    const page = await browser.newPage();
    const bugs = await testNetworkErrors(page, `${server.baseUrl}/clean`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should detect 5xx responses as critical', async () => {
    const page = await browser.newPage();
    const bugs = await testNetworkErrors(page, `${server.baseUrl}/with-500-fetch`);
    await page.close();

    expect(bugs.length).toBeGreaterThanOrEqual(1);
    const serverError = bugs.find((b) => b.severity === 'critical');
    expect(serverError).toBeDefined();
    expect(serverError!.type).toBe('network-error');
    expect(serverError!.details).toContain('500');
  });

  it('should detect 4xx responses as warning', async () => {
    const page = await browser.newPage();
    const bugs = await testNetworkErrors(page, `${server.baseUrl}/with-404-fetch`);
    await page.close();

    expect(bugs.length).toBeGreaterThanOrEqual(1);
    const clientError = bugs.find((b) => b.severity === 'warning');
    expect(clientError).toBeDefined();
    expect(clientError!.type).toBe('network-error');
    expect(clientError!.details).toContain('404');
  });

  it('should include the page URL in each bug', async () => {
    const page = await browser.newPage();
    const bugs = await testNetworkErrors(page, `${server.baseUrl}/with-500-fetch`);
    await page.close();

    for (const bug of bugs) {
      expect(bug.page).toBe(`${server.baseUrl}/with-500-fetch`);
    }
  });
});

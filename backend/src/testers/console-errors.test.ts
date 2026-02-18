import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser, Page } from 'playwright';
import { startTestServer, stopTestServer, launchBrowser, type TestServer } from './test-helper.js';
import { testConsoleErrors } from './console-errors.js';

describe('Console Error Tester', () => {
  let browser: Browser;
  let server: TestServer;

  beforeAll(async () => {
    browser = await launchBrowser();
    server = await startTestServer({
      '/clean': {
        body: '<html><head><title>Clean</title></head><body><p>No errors here</p></body></html>',
      },
      '/with-exception': {
        body: `<html><head><title>Exception Page</title></head><body>
          <script>
            // This will throw an uncaught exception
            null.someMethod();
          </script>
        </body></html>`,
      },
      '/with-console-error': {
        body: `<html><head><title>Console Error</title></head><body>
          <script>
            console.error("Something went wrong in the app");
          </script>
        </body></html>`,
      },
      '/with-both': {
        body: `<html><head><title>Both</title></head><body>
          <script>
            console.error("First error message");
            setTimeout(() => { throw new Error("Delayed exception"); }, 10);
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
    const bugs = await testConsoleErrors(page, `${server.baseUrl}/clean`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should detect uncaught exceptions as critical', async () => {
    const page = await browser.newPage();
    const bugs = await testConsoleErrors(page, `${server.baseUrl}/with-exception`);
    await page.close();

    expect(bugs.length).toBeGreaterThanOrEqual(1);
    const exceptionBug = bugs.find((b) => b.severity === 'critical');
    expect(exceptionBug).toBeDefined();
    expect(exceptionBug!.type).toBe('console-error');
    expect(exceptionBug!.title).toContain('Uncaught exception');
  });

  it('should detect console.error as warning', async () => {
    const page = await browser.newPage();
    const bugs = await testConsoleErrors(page, `${server.baseUrl}/with-console-error`);
    await page.close();

    expect(bugs.length).toBeGreaterThanOrEqual(1);
    const consoleBug = bugs.find((b) => b.severity === 'warning');
    expect(consoleBug).toBeDefined();
    expect(consoleBug!.type).toBe('console-error');
    expect(consoleBug!.details).toContain('Something went wrong');
  });

  it('should detect both exceptions and console errors', async () => {
    const page = await browser.newPage();
    const bugs = await testConsoleErrors(page, `${server.baseUrl}/with-both`);
    await page.close();

    expect(bugs.length).toBeGreaterThanOrEqual(2);
    expect(bugs.some((b) => b.severity === 'critical')).toBe(true);
    expect(bugs.some((b) => b.severity === 'warning')).toBe(true);
  });

  it('should include the page URL in each bug', async () => {
    const page = await browser.newPage();
    const bugs = await testConsoleErrors(page, `${server.baseUrl}/with-exception`);
    await page.close();

    for (const bug of bugs) {
      expect(bug.page).toBe(`${server.baseUrl}/with-exception`);
    }
  });
});

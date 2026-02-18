import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'playwright';
import { startTestServer, stopTestServer, launchBrowser, type TestServer } from './test-helper.js';
import { testAccessibility } from './accessibility.js';

describe('Accessibility Tester', () => {
  let browser: Browser;
  let server: TestServer;

  beforeAll(async () => {
    browser = await launchBrowser();
    server = await startTestServer({
      '/accessible': {
        body: `<!DOCTYPE html>
          <html lang="en">
          <head><title>Accessible Page</title></head>
          <body>
            <main>
              <h1>Welcome</h1>
              <p>This page is accessible.</p>
              <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Placeholder" />
              <a href="/about">About</a>
            </main>
          </body></html>`,
      },
      '/inaccessible': {
        body: `<!DOCTYPE html>
          <html>
          <head><title>Bad Page</title></head>
          <body>
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
            <input type="text" />
            <div onclick="alert('hi')">Click me</div>
          </body></html>`,
      },
    });
  });

  afterAll(async () => {
    await browser.close();
    await stopTestServer(server);
  });

  it('should return few or no bugs for an accessible page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const bugs = await testAccessibility(page, `${server.baseUrl}/accessible`);
    await context.close();

    // A well-structured page should have minimal violations
    const critical = bugs.filter((b) => b.severity === 'critical');
    expect(critical.length).toBe(0);
  });

  it('should detect accessibility violations on a bad page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const bugs = await testAccessibility(page, `${server.baseUrl}/inaccessible`);
    await context.close();

    // Should find issues: missing alt, missing label, missing lang, etc.
    expect(bugs.length).toBeGreaterThan(0);
    expect(bugs.every((b) => b.type === 'accessibility')).toBe(true);
  });

  it('should include axe rule info in bug details', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const bugs = await testAccessibility(page, `${server.baseUrl}/inaccessible`);
    await context.close();

    // Each bug should have meaningful details
    for (const bug of bugs) {
      expect(bug.details.length).toBeGreaterThan(0);
      expect(bug.title.length).toBeGreaterThan(0);
    }
  });

  it('should cap violations at 10 per page', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const bugs = await testAccessibility(page, `${server.baseUrl}/inaccessible`);
    await context.close();

    expect(bugs.length).toBeLessThanOrEqual(10);
  });
});

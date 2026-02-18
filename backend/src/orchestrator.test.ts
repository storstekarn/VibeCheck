import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { runScan } from './orchestrator.js';
import type { ProgressEvent } from './types.js';

describe('Scan Orchestrator', () => {
  let server: http.Server;
  let baseUrl: string;

  // Create a small test site
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');

      if (req.url === '/') {
        res.end(`<!DOCTYPE html>
          <html lang="en"><head><title>Test App</title></head>
          <body>
            <h1>Welcome</h1>
            <a href="/about">About</a>
            <img src="/missing.png" alt="broken" />
            <script>console.error("test error message");</script>
          </body></html>`);
      } else if (req.url === '/about') {
        res.end(`<!DOCTYPE html>
          <html lang="en"><head><title>About</title></head>
          <body>
            <h1>About Us</h1>
            <a href="/">Home</a>
          </body></html>`);
      } else {
        res.statusCode = 404;
        res.end('<html><body>Not Found</body></html>');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      baseUrl = `http://localhost:${addr.port}`;
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should run a full scan and return a report', async () => {
    const report = await runScan(baseUrl);

    expect(report.url).toBe(baseUrl);
    expect(report.pagesFound).toBeGreaterThanOrEqual(1);
    expect(report.pages.length).toBeGreaterThanOrEqual(1);
    expect(report.summary).toBeDefined();
    expect(report.timestamp).toBeTruthy();
  }, 60000);

  it('should discover multiple pages', async () => {
    const report = await runScan(baseUrl);

    const urls = report.pages.map((p) => p.url);
    expect(urls.length).toBeGreaterThanOrEqual(2);
  }, 60000);

  it('should detect bugs on the test site', async () => {
    const report = await runScan(baseUrl);

    // The test site has a broken image and a console error
    expect(report.summary.totalBugs).toBeGreaterThan(0);
  }, 60000);

  it('should emit progress events', async () => {
    const events: ProgressEvent[] = [];
    await runScan(baseUrl, (e) => events.push(e));

    expect(events.length).toBeGreaterThan(0);
    // Should have crawling and testing phases
    expect(events.some((e) => e.phase === 'crawling')).toBe(true);
    expect(events.some((e) => e.phase === 'testing')).toBe(true);
  }, 60000);

  it('should assign IDs to all bugs', async () => {
    const report = await runScan(baseUrl);

    const allBugs = report.pages.flatMap((p) => p.bugs);
    for (const bug of allBugs) {
      expect(bug.id).toBeTruthy();
      expect(bug.id.length).toBeGreaterThan(0);
    }
  }, 60000);

  it('should populate fix prompts', async () => {
    const report = await runScan(baseUrl);

    const allBugs = report.pages.flatMap((p) => p.bugs);
    // At least some bugs should have fix prompts (template fallback)
    const bugsWithPrompts = allBugs.filter((b) => b.fixPrompt.length > 0);
    expect(bugsWithPrompts.length).toBe(allBugs.length);
  }, 60000);
});

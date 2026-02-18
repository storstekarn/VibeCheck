import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import express from 'express';
import { createApp } from './server.js';

// Helper for HTTP requests
function request(baseUrl: string) {
  return {
    async post(path: string, body: unknown) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: res.status, json: () => res.json() };
    },
    async get(path: string) {
      const res = await fetch(`${baseUrl}${path}`);
      return { status: res.status, json: () => res.json(), headers: res.headers, body: res.body };
    },
  };
}

describe('End-to-end: full scan via API', () => {
  let targetServer: http.Server;
  let targetUrl: string;
  let apiServer: ReturnType<typeof express.application.listen>;
  let apiUrl: string;

  // Create a target site to scan
  beforeAll(async () => {
    targetServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');
      if (req.url === '/') {
        res.end(`<!DOCTYPE html>
          <html lang="en"><head><title>E2E Test App</title></head>
          <body>
            <main><h1>Hello</h1>
            <a href="/page2">Page 2</a>
            </main>
          </body></html>`);
      } else if (req.url === '/page2') {
        res.end(`<!DOCTYPE html>
          <html lang="en"><head><title>Page 2</title></head>
          <body>
            <main><h1>Page 2</h1>
            <script>console.error("intentional error for e2e test");</script>
            </main>
          </body></html>`);
      } else {
        res.statusCode = 404;
        res.end('<html><body>Not Found</body></html>');
      }
    });

    await new Promise<void>((resolve) => {
      targetServer.listen(0, () => resolve());
    });
    const targetAddr = targetServer.address();
    targetUrl = `http://localhost:${typeof targetAddr === 'object' && targetAddr ? targetAddr.port : 0}`;

    // Start the API server
    const { app } = createApp();
    apiServer = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const srv = app.listen(0, () => resolve(srv));
    });
    const apiAddr = apiServer.address();
    apiUrl = `http://localhost:${typeof apiAddr === 'object' && apiAddr ? apiAddr.port : 0}`;
  });

  afterAll(async () => {
    await new Promise<void>((r) => apiServer.close(() => r()));
    await new Promise<void>((r) => targetServer.close(() => r()));
  });

  it('should complete a full scan: start → progress → report', async () => {
    const client = request(apiUrl);

    // 1. Start scan
    const startRes = await client.post('/api/scan', { url: targetUrl });
    expect(startRes.status).toBe(200);
    const { scanId } = await startRes.json();
    expect(scanId).toBeTruthy();

    // 2. Poll for completion (instead of SSE for simplicity)
    let report;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const reportRes = await client.get(`/api/scan/${scanId}/report`);
      if (reportRes.status === 200) {
        report = await reportRes.json();
        break;
      }
    }

    // 3. Verify report
    expect(report).toBeDefined();
    expect(report.url).toBe(targetUrl);
    expect(report.pagesFound).toBeGreaterThanOrEqual(1);
    expect(report.summary).toBeDefined();
    expect(report.summary.totalBugs).toBeGreaterThanOrEqual(0);
    expect(report.timestamp).toBeTruthy();

    // Should have found the pages
    const urls = report.pages.map((p: { url: string }) => p.url);
    expect(urls.length).toBeGreaterThanOrEqual(1);

    // All bugs should have IDs and fix prompts
    const allBugs = report.pages.flatMap((p: { bugs: unknown[] }) => p.bugs);
    for (const bug of allBugs) {
      expect((bug as { id: string }).id).toBeTruthy();
      expect((bug as { fixPrompt: string }).fixPrompt.length).toBeGreaterThan(0);
    }
  }, 120000);
});

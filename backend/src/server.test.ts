import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { createApp, ScanStore } from './server.js';

// Helper to make requests against the app
function request(app: express.Express) {
  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  return {
    async start() {
      return new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            baseUrl = `http://localhost:${addr.port}`;
          }
          resolve();
        });
      });
    },
    async stop() {
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
    async post(path: string, body: unknown) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return {
        status: res.status,
        json: () => res.json(),
      };
    },
    async get(path: string) {
      const res = await fetch(`${baseUrl}${path}`);
      return {
        status: res.status,
        json: () => res.json(),
        headers: res.headers,
        body: res.body,
      };
    },
    getUrl(path: string) {
      return `${baseUrl}${path}`;
    },
  };
}

describe('Server', () => {
  let app: express.Express;
  let scanStore: ScanStore;
  let client: ReturnType<typeof request>;

  beforeAll(async () => {
    ({ app, scanStore } = createApp());
    client = request(app);
    await client.start();
  });

  afterAll(async () => {
    await client.stop();
  });

  beforeEach(() => {
    scanStore.clear();
  });

  describe('POST /api/scan', () => {
    it('should reject missing URL', async () => {
      const res = await client.post('/api/scan', {});
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('url');
    });

    it('should reject invalid URL', async () => {
      const res = await client.post('/api/scan', { url: 'not-a-url' });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid URL');
    });

    it('should reject non-http(s) URLs', async () => {
      const res = await client.post('/api/scan', { url: 'ftp://example.com' });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid URL');
    });

    it('should accept a valid URL and return a scanId', async () => {
      const res = await client.post('/api/scan', { url: 'https://example.com' });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.scanId).toBeDefined();
      expect(typeof body.scanId).toBe('string');
    });

    it('should store the scan in the scan store', async () => {
      const res = await client.post('/api/scan', { url: 'https://example.com' });
      const body = await res.json();
      const scan = scanStore.get(body.scanId);
      expect(scan).toBeDefined();
      expect(scan!.url).toBe('https://example.com');
      expect(scan!.status).toBe('running');
    });
  });

  describe('GET /api/scan/:scanId/report', () => {
    it('should return 404 for unknown scanId', async () => {
      const res = await client.get('/api/scan/nonexistent/report');
      expect(res.status).toBe(404);
    });

    it('should return 202 when scan is still running', async () => {
      const scanRes = await client.post('/api/scan', { url: 'https://example.com' });
      const { scanId } = await scanRes.json();

      const res = await client.get(`/api/scan/${scanId}/report`);
      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.status).toBe('running');
    });

    it('should return the report when scan is complete', async () => {
      // Create a scan and manually mark it complete
      const scanRes = await client.post('/api/scan', { url: 'https://example.com' });
      const { scanId } = await scanRes.json();

      const scan = scanStore.get(scanId)!;
      scan.status = 'complete';
      scan.report = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        pagesFound: 1,
        pages: [],
        summary: {
          totalBugs: 0,
          critical: 0,
          warnings: 0,
          info: 0,
          byType: {
            'console-error': 0,
            'network-error': 0,
            'broken-link': 0,
            'broken-image': 0,
            'accessibility': 0,
            'responsive': 0,
          },
        },
      };

      const res = await client.get(`/api/scan/${scanId}/report`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toBe('https://example.com');
      expect(body.pagesFound).toBe(1);
    });
  });

  describe('GET /api/scan/:scanId/progress', () => {
    it('should return 404 for unknown scanId', async () => {
      const res = await client.get('/api/scan/nonexistent/progress');
      expect(res.status).toBe(404);
    });

    it('should return SSE content-type for valid scan', async () => {
      const scanRes = await client.post('/api/scan', { url: 'https://example.com' });
      const { scanId } = await scanRes.json();

      const res = await client.get(`/api/scan/${scanId}/progress`);
      expect(res.headers.get('content-type')).toBe('text/event-stream');

      // Close the SSE connection
      if (res.body) {
        await res.body.cancel();
      }
    });

    it('should receive progress events pushed to the scan', async () => {
      const scanRes = await client.post('/api/scan', { url: 'https://example.com' });
      const { scanId } = await scanRes.json();

      // Connect to SSE
      const res = await client.get(`/api/scan/${scanId}/progress`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      // Push a progress event
      const scan = scanStore.get(scanId)!;
      scan.pushProgress({
        phase: 'crawling',
        message: 'Discovering pages...',
        progress: 10,
      });

      // Read the event
      const { value } = await reader.read();
      const text = decoder.decode(value);
      expect(text).toContain('data:');
      expect(text).toContain('crawling');

      await reader.cancel();
    });
  });

  describe('Rate limiting', () => {
    it('should reject a scan when one is already running', async () => {
      // Clear previous scans so none are running
      scanStore.clear();

      // Start first scan
      const res1 = await client.post('/api/scan', { url: 'https://example.com' });
      expect(res1.status).toBe(200);

      // Try to start second scan
      const res2 = await client.post('/api/scan', { url: 'https://example2.com' });
      expect(res2.status).toBe(429);
      const body = await res2.json();
      expect(body.error).toContain('scan already running');
    });
  });
});

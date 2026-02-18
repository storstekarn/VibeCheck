import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { normalizeUrl, shouldFollowUrl, crawlPages } from './crawler.js';
import type { ProgressEvent } from './types.js';

// --- Unit tests for URL helpers ---

describe('normalizeUrl', () => {
  it('should remove trailing slashes', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('should remove hash fragments', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('should remove trailing slash and hash together', () => {
    expect(normalizeUrl('https://example.com/page/#top')).toBe('https://example.com/page');
  });

  it('should preserve query parameters', () => {
    expect(normalizeUrl('https://example.com/page?id=1')).toBe('https://example.com/page?id=1');
  });

  it('should handle root URL', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });
});

describe('shouldFollowUrl', () => {
  const baseUrl = 'https://myapp.lovable.app';

  it('should follow same-domain URLs', () => {
    expect(shouldFollowUrl('https://myapp.lovable.app/about', baseUrl)).toBe(true);
  });

  it('should follow paths on the same domain', () => {
    expect(shouldFollowUrl('https://myapp.lovable.app/dashboard/settings', baseUrl)).toBe(true);
  });

  it('should reject external domain URLs', () => {
    expect(shouldFollowUrl('https://google.com', baseUrl)).toBe(false);
  });

  it('should reject mailto: links', () => {
    expect(shouldFollowUrl('mailto:test@example.com', baseUrl)).toBe(false);
  });

  it('should reject tel: links', () => {
    expect(shouldFollowUrl('tel:+1234567890', baseUrl)).toBe(false);
  });

  it('should reject javascript: links', () => {
    expect(shouldFollowUrl('javascript:void(0)', baseUrl)).toBe(false);
  });

  it('should reject file download URLs', () => {
    expect(shouldFollowUrl('https://myapp.lovable.app/file.pdf', baseUrl)).toBe(false);
    expect(shouldFollowUrl('https://myapp.lovable.app/doc.zip', baseUrl)).toBe(false);
    expect(shouldFollowUrl('https://myapp.lovable.app/image.png', baseUrl)).toBe(false);
  });

  it('should reject empty or hash-only URLs', () => {
    expect(shouldFollowUrl('', baseUrl)).toBe(false);
    expect(shouldFollowUrl('#', baseUrl)).toBe(false);
    expect(shouldFollowUrl('#section', baseUrl)).toBe(false);
  });
});

// --- Integration test with a real local server ---

describe('crawlPages', () => {
  let server: http.Server;
  let baseUrl: string;

  // Create a tiny multi-page site for crawling
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');

      if (req.url === '/') {
        res.end(`
          <html><head><title>Home</title></head><body>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="https://external.com">External</a>
            <a href="mailto:test@test.com">Email</a>
          </body></html>
        `);
      } else if (req.url === '/about') {
        res.end(`
          <html><head><title>About</title></head><body>
            <a href="/">Home</a>
            <a href="/contact">Contact</a>
          </body></html>
        `);
      } else if (req.url === '/contact') {
        res.end(`
          <html><head><title>Contact</title></head><body>
            <a href="/">Home</a>
          </body></html>
        `);
      } else {
        res.statusCode = 404;
        res.end('<html><head><title>Not Found</title></head><body>404</body></html>');
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

  it('should discover all linked pages on the same domain', async () => {
    const result = await crawlPages(baseUrl);

    const urls = result.pages.map((p) => p.url);
    expect(urls).toContain(baseUrl);
    expect(urls).toContain(`${baseUrl}/about`);
    expect(urls).toContain(`${baseUrl}/contact`);
    expect(urls.length).toBe(3);
  }, 30000);

  it('should not follow external links', async () => {
    const result = await crawlPages(baseUrl);

    const urls = result.pages.map((p) => p.url);
    const externalUrls = urls.filter((u) => !u.startsWith(baseUrl));
    expect(externalUrls).toEqual([]);
  }, 30000);

  it('should capture page titles', async () => {
    const result = await crawlPages(baseUrl);

    const homePage = result.pages.find((p) => p.url === baseUrl);
    expect(homePage?.title).toBe('Home');

    const aboutPage = result.pages.find((p) => p.url === `${baseUrl}/about`);
    expect(aboutPage?.title).toBe('About');
  }, 30000);

  it('should emit progress events', async () => {
    const events: ProgressEvent[] = [];
    await crawlPages(baseUrl, (event) => events.push(event));

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.phase === 'crawling')).toBe(true);
  }, 30000);
});

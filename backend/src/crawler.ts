import { PlaywrightCrawler, Configuration } from 'crawlee';
import type { ProgressEvent } from './types.js';

export interface DiscoveredPage {
  url: string;
  title: string;
  loadTime: number; // ms
}

export interface CrawlResult {
  pages: DiscoveredPage[];
}

// File extensions to skip (downloads, images, etc.)
const SKIP_EXTENSIONS = new Set([
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dmg', '.apk',
]);

// Protocols to skip
const SKIP_PROTOCOLS = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:', 'file:'];

/**
 * Normalize a URL: remove trailing slashes and hash fragments.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    // Remove trailing slash (but keep root "/" as just the origin)
    let normalized = parsed.toString();
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    // Also remove trailing slash for root
    if (parsed.pathname === '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

/**
 * Determine if a URL should be followed during crawling.
 * Must be same domain, http(s), and not a file download or special protocol.
 */
export function shouldFollowUrl(url: string, baseUrl: string): boolean {
  // Reject empty or hash-only
  if (!url || url.startsWith('#')) return false;

  // Reject special protocols
  for (const protocol of SKIP_PROTOCOLS) {
    if (url.toLowerCase().startsWith(protocol)) return false;
  }

  try {
    const parsedBase = new URL(baseUrl);
    const parsedUrl = new URL(url, baseUrl);

    // Must be http or https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Must be same domain
    if (parsedUrl.hostname !== parsedBase.hostname) {
      return false;
    }

    // Skip file downloads
    const pathname = parsedUrl.pathname.toLowerCase();
    for (const ext of SKIP_EXTENSIONS) {
      if (pathname.endsWith(ext)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Crawl a website starting from the given URL.
 * Discovers pages by following links within the same domain.
 */
export async function crawlPages(
  startUrl: string,
  onProgress?: (event: ProgressEvent) => void,
  options?: { maxPages?: number; maxConcurrency?: number }
): Promise<CrawlResult> {
  const maxPages = options?.maxPages ?? 20;
  const maxConcurrency = options?.maxConcurrency ?? 3;
  const pages: DiscoveredPage[] = [];
  const visited = new Set<string>();

  // Use a local Crawlee configuration so we don't persist storage to disk
  const config = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
  });

  const crawler = new PlaywrightCrawler(
    {
      maxRequestsPerCrawl: maxPages,
      maxConcurrency,
      headless: true,
      launchContext: {
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        },
      },
      requestHandlerTimeoutSecs: 30,
      navigationTimeoutSecs: 15,

      async requestHandler({ page, request, enqueueLinks }) {
        const startTime = Date.now();

        // Wait for the page to be reasonably loaded
        await page.waitForLoadState('domcontentloaded');

        const url = normalizeUrl(request.loadedUrl || request.url);
        const title = await page.title();
        const loadTime = Date.now() - startTime;

        // Avoid duplicates from normalization
        if (!visited.has(url)) {
          visited.add(url);
          pages.push({ url, title, loadTime });

          onProgress?.({
            phase: 'crawling',
            message: `Found page: ${title || url}`,
            progress: Math.min(90, Math.round((pages.length / maxPages) * 90)),
          });
        }

        // Enqueue links on the same domain
        await enqueueLinks({
          strategy: 'same-domain',
          transformRequestFunction(req) {
            const normalized = normalizeUrl(req.url);
            if (!shouldFollowUrl(normalized, startUrl)) {
              return false;
            }
            if (visited.has(normalized)) {
              return false;
            }
            req.url = normalized;
            return req;
          },
        });
      },

      failedRequestHandler({ request }) {
        // Silently skip failed requests — they'll surface in the testers later
        const url = normalizeUrl(request.url);
        if (!visited.has(url)) {
          visited.add(url);
        }
      },
    },
    config,
  );

  onProgress?.({
    phase: 'crawling',
    message: `Starting crawl of ${startUrl}`,
    progress: 0,
  });

  await crawler.run([startUrl]);

  onProgress?.({
    phase: 'crawling',
    message: `Crawl complete. Found ${pages.length} page(s).`,
    progress: 100,
  });

  return { pages };
}

import { chromium, type Browser, type BrowserContext } from 'playwright';
import { crawlPages } from './crawler.js';
import { testConsoleErrors } from './testers/console-errors.js';
import { testNetworkErrors } from './testers/network.js';
import { testBrokenLinks } from './testers/links.js';
import { testBrokenImages } from './testers/images.js';
import { testAccessibility } from './testers/accessibility.js';
import { testResponsive } from './testers/responsive.js';
import { generateFixPrompts } from './prompt-generator.js';
import { buildReport } from './report-builder.js';
import type { Bug, PageReport, ProgressEvent, QAReport } from './types.js';

const TESTER_TIMEOUT = 30_000; // 30 seconds per tester
const SCAN_TIMEOUT = 300_000; // 5 minutes total

type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Run a single tester with a timeout. Returns empty array on failure.
 */
async function runTesterSafe(
  name: string,
  fn: () => Promise<Bug[]>,
): Promise<Bug[]> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<Bug[]>((_, reject) =>
        setTimeout(() => reject(new Error(`Tester "${name}" timed out`)), TESTER_TIMEOUT)
      ),
    ]);
    return result;
  } catch (err) {
    console.warn(`Tester "${name}" failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Run all testers on a single page.
 */
async function testPage(
  browser: Browser,
  url: string,
  title: string,
  onProgress: ProgressCallback,
): Promise<PageReport> {
  const bugs: Bug[] = [];

  // Console errors + network errors need their own pages (listeners before navigation)
  const consolePage = await browser.newPage();
  const consoleBugs = await runTesterSafe('console-errors', () =>
    testConsoleErrors(consolePage, url)
  );
  bugs.push(...consoleBugs);
  await consolePage.close();

  const networkPage = await browser.newPage();
  const networkBugs = await runTesterSafe('network', () =>
    testNetworkErrors(networkPage, url)
  );
  bugs.push(...networkBugs);
  await networkPage.close();

  // Broken links
  const linksPage = await browser.newPage();
  const linksBugs = await runTesterSafe('links', () =>
    testBrokenLinks(linksPage, url)
  );
  bugs.push(...linksBugs);
  await linksPage.close();

  // Broken images
  const imagesPage = await browser.newPage();
  const imagesBugs = await runTesterSafe('images', () =>
    testBrokenImages(imagesPage, url)
  );
  bugs.push(...imagesBugs);
  await imagesPage.close();

  // Accessibility (needs browser context)
  const a11yContext = await browser.newContext();
  const a11yPage = await a11yContext.newPage();
  const a11yBugs = await runTesterSafe('accessibility', () =>
    testAccessibility(a11yPage, url)
  );
  bugs.push(...a11yBugs);
  await a11yContext.close();

  // Responsive
  const responsivePage = await browser.newPage();
  const responsiveBugs = await runTesterSafe('responsive', () =>
    testResponsive(responsivePage, url)
  );
  bugs.push(...responsiveBugs);
  await responsivePage.close();

  onProgress({
    phase: 'testing',
    message: `Tested: ${title || url}`,
    progress: 0, // Will be adjusted by caller
  });

  return { url, title, bugs };
}

/**
 * Run the full QA scan pipeline:
 * 1. Crawl pages
 * 2. Test each page
 * 3. Generate fix prompts
 * 4. Build report
 */
export async function runScan(
  url: string,
  onProgress?: ProgressCallback,
): Promise<QAReport> {
  const progress = onProgress ?? (() => {});

  // Wrap entire scan in a timeout
  return Promise.race([
    runScanInner(url, progress),
    new Promise<QAReport>((_, reject) =>
      setTimeout(() => reject(new Error('Scan timed out after 5 minutes')), SCAN_TIMEOUT)
    ),
  ]);
}

async function runScanInner(
  url: string,
  progress: ProgressCallback,
): Promise<QAReport> {
  // Phase 1: Crawl
  progress({ phase: 'crawling', message: 'Starting page discovery...', progress: 0 });

  const crawlResult = await crawlPages(url, (event) => {
    progress({ ...event, progress: Math.round(event.progress * 0.3) }); // 0-30% for crawling
  });

  const discoveredPages = crawlResult.pages;
  progress({
    phase: 'crawling',
    message: `Found ${discoveredPages.length} page(s)`,
    progress: 30,
  });

  // Phase 2: Test each page
  const browser = await chromium.launch({ headless: true });
  const pageReports: PageReport[] = [];

  try {
    for (let i = 0; i < discoveredPages.length; i++) {
      const page = discoveredPages[i];
      const testProgress = 30 + Math.round(((i + 1) / discoveredPages.length) * 50); // 30-80%

      progress({
        phase: 'testing',
        message: `Testing page ${i + 1}/${discoveredPages.length}: ${page.title || page.url}`,
        progress: testProgress,
      });

      const report = await testPage(browser, page.url, page.title, progress);
      pageReports.push(report);
    }
  } finally {
    await browser.close();
  }

  // Phase 3: Generate fix prompts
  progress({ phase: 'prompts', message: 'Generating fix prompts...', progress: 85 });

  const allBugs = pageReports.flatMap((p) => p.bugs);
  const promptResult = await generateFixPrompts(allBugs);

  if (promptResult.usedFallback && promptResult.fallbackReason) {
    progress({ phase: 'prompts', message: promptResult.fallbackReason, progress: 90 });
  }

  // Map prompts back to page reports
  let bugIndex = 0;
  for (const pageReport of pageReports) {
    for (let i = 0; i < pageReport.bugs.length; i++) {
      pageReport.bugs[i] = promptResult.bugs[bugIndex++];
    }
  }

  // Phase 4: Build report
  progress({ phase: 'report', message: 'Building report...', progress: 95 });

  const report = buildReport(url, pageReports);

  // Attach warnings to report
  if (promptResult.usedFallback && promptResult.fallbackReason) {
    report.warnings = [promptResult.fallbackReason];
  }

  progress({ phase: 'complete', message: 'Scan complete!', progress: 100 });

  return report;
}

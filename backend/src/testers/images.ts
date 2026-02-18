import type { Page } from 'playwright';
import type { Bug } from '../types.js';

/**
 * Check all <img> elements on a page for broken images.
 * An image is broken if it didn't load (naturalWidth === 0 and complete === true)
 * or if its src returns a 4xx/5xx status.
 */
export async function testBrokenImages(page: Page, url: string): Promise<Bug[]> {
  const bugs: Bug[] = [];

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Wait a beat for images to attempt loading
  await page.waitForTimeout(500);

  // Evaluate all images in the page
  const brokenImages = await page.$$eval('img[src]', (imgs: HTMLImageElement[]) =>
    imgs
      .filter((img) => {
        // Skip data URIs and empty src
        const src = img.getAttribute('src') || '';
        if (!src || src.startsWith('data:')) return false;
        // An image that completed loading but has no natural width is broken
        return img.complete && img.naturalWidth === 0;
      })
      .map((img) => ({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || '',
      }))
  );

  for (const img of brokenImages) {
    bugs.push({
      id: '',
      type: 'broken-image',
      severity: 'warning',
      title: `Broken image: ${img.alt || img.src}`,
      details: `Image failed to load: ${img.src}`,
      page: url,
      fixPrompt: '',
    });
  }

  return bugs;
}

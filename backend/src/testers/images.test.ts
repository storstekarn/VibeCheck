import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'playwright';
import { startTestServer, stopTestServer, launchBrowser, type TestServer } from './test-helper.js';
import { testBrokenImages } from './images.js';

describe('Broken Image Tester', () => {
  let browser: Browser;
  let server: TestServer;

  beforeAll(async () => {
    browser = await launchBrowser();
    // 1x1 transparent PNG as a valid image
    const validPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
      'Nl7BcQAAAABJRU5ErkJggg==',
      'base64'
    );

    server = await startTestServer({
      '/good-images': {
        body: `<html><body>
          <img src="/valid.png" alt="Valid image" />
        </body></html>`,
      },
      '/valid.png': {
        headers: { 'Content-Type': 'image/png' },
        body: validPng,
      },
      '/broken-images': {
        body: `<html><body>
          <img src="/missing.png" alt="Missing image" />
          <img src="/also-missing.jpg" alt="Also missing" />
        </body></html>`,
      },
      '/no-images': {
        body: '<html><body><p>No images</p></body></html>',
      },
    });
  });

  afterAll(async () => {
    await browser.close();
    await stopTestServer(server);
  });

  it('should return no bugs when all images load', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenImages(page, `${server.baseUrl}/good-images`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should detect broken images', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenImages(page, `${server.baseUrl}/broken-images`);
    await page.close();

    expect(bugs.length).toBe(2);
    expect(bugs.every((b) => b.type === 'broken-image')).toBe(true);
    expect(bugs.every((b) => b.severity === 'warning')).toBe(true);
  });

  it('should return no bugs for a page with no images', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenImages(page, `${server.baseUrl}/no-images`);
    await page.close();

    expect(bugs).toEqual([]);
  });

  it('should include the image src in bug details', async () => {
    const page = await browser.newPage();
    const bugs = await testBrokenImages(page, `${server.baseUrl}/broken-images`);
    await page.close();

    expect(bugs.some((b) => b.details.includes('missing.png'))).toBe(true);
  });
});

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Release candidates can be verified end-to-end against a real local Wrangler
// Worker without weakening the default production readiness check.
const LIVE = String(process.env.TRANSPORT_RELEASE_ORIGIN || 'https://getvendora.net').replace(/\/$/, '');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const suspicious = /ÃƒÆ’|Ãƒâ€š|ÃƒËœ|Ãƒâ„¢|ÃƒÂ¢Ã¢â€šÂ¬|ÃƒÂ°Ã…Â¸|Ã¯Â¿Â½|\uFFFD/;
const paths = [...new Set(['sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'].flatMap((file) => (
  [...readFileSync(join(root, file), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname)
)))];

test('raw production pricing is server-rendered and private fields stay private', async ({ request }) => {
  const api = await request.get(`${LIVE}/bahrain-saudi-gcc-transport/api/transport/public-settings`);
  expect(api.status()).toBe(200);
  const apiText = await api.text();
  expect(apiText).not.toMatch(/driver_minimum|private_minimum|driver_price|min_driver/i);
  const config = JSON.parse(apiText);
  const expected = config.routes.filter((route) => route.price_bhd != null);
  for (const languagePath of ['prices/', 'en/prices/']) {
    const response = await request.get(`${LIVE}/bahrain-saudi-gcc-transport/${languagePath}?raw=${Date.now()}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect((html.match(/<article class="price-card"/g) || []).length).toBe(expected.length);
    expect((html.match(/"priceCurrency":"BHD"/g) || []).length).toBe(expected.length);
    expect(html).not.toContain('id="pricesSchema" data-vendora-schema type="application/ld+json">{}');
  }
});

test('all production sitemap URLs return clean, tracked HTML', async ({ request }) => {
  test.setTimeout(240_000);
  const results = await Promise.all(paths.map(async (path) => {
    const response = await request.get(`${LIVE}${path}`);
    const html = await response.text();
    return { path, status: response.status(), html };
  }));
  expect(results).toHaveLength(paths.length);
  for (const result of results) {
    expect(result.status, result.path).toBe(200);
    expect(suspicious.test(result.html), result.path).toBe(false);
    expect((result.html.match(/analytics-loader\.js/g) || []).length, result.path).toBe(1);
  }
});

for (const width of [1366, 768, 390, 360, 320]) {
  for (const [language, path] of [['ar', 'prices/'], ['en', 'en/prices/']]) {
    test(`${language} live pricing at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 800 });
      const consoleErrors = [];
      const failedRequired = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(LIVE) && /site\.js|prices-page\.js|public-settings/.test(request.url())) failedRequired.push(request.url());
      });
      const response = await page.goto(`${LIVE}/bahrain-saudi-gcc-transport/${path}`, { waitUntil: 'load' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('#priceList .price-card')).toHaveCount(23);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(consoleErrors).toEqual([]);
      expect(failedRequired).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${language}-${width}.png`), fullPage: true });
    });
  }
}

test('English prices remain visible with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${LIVE}/bahrain-saudi-gcc-transport/en/prices/`);
  await expect(page.locator('#priceList .price-card')).toHaveCount(23);
  await context.close();
});

test('internal transport URLs are not public', async ({ request }) => {
  for (const path of ['ai-chat-test/', 'scratch/', 'tests/', 'test-results/', 'api/debug']) {
    expect((await request.get(`${LIVE}/bahrain-saudi-gcc-transport/${path}`)).status(), path).toBe(404);
  }
});

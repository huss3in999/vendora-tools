const { test, expect } = require('@playwright/test');

const CATEGORY_HUBS = [
  '/calculator/',
  '/calculator/finance/',
  '/calculator/food/',
  '/calculator/restaurant/',
  '/calculator/profit/',
  '/calculator/operations/',
  '/calculator/inventory/',
  '/calculator/general/',
];

/**
 * Collect same-origin paths from calculator hub cards and verify HTTP OK (static server).
 */
async function expectCalcCardLinksOk(page, path) {
  await page.goto(path);
  const hrefs = await page
    .locator('a.calc-card[href]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')).filter(Boolean))]);

  for (const href of hrefs) {
    if (!href.startsWith('/')) continue;
    const res = await page.request.get(href);
    expect(res.ok(), `${path} card link ${href} -> ${res.status()}`).toBeTruthy();
  }
}

test.describe('Calculator category hubs', () => {
  test('every hub page loads with visible H1', async ({ page }) => {
    for (const p of CATEGORY_HUBS) {
      await page.goto(p);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /getvendora\.net\/calculator/);
    }
  });

  test('main hub: all calculator card links return HTTP OK', async ({ page }) => {
    await expectCalcCardLinksOk(page, '/calculator/');
  });

  test('category hubs: related-category links and sample cards resolve', async ({ page }) => {
    await page.goto('/calculator/finance/');
    const related = await page.locator('.hub-links a[href^="/calculator/"]').all();
    expect(related.length).toBeGreaterThan(0);
    for (const loc of related) {
      const href = await loc.getAttribute('href');
      const res = await page.request.get(href);
      expect(res.ok(), `related ${href}`).toBeTruthy();
    }
    await expectCalcCardLinksOk(page, '/calculator/finance/');
  });

  test('desktop + mobile: no horizontal overflow on hubs', async ({ page }) => {
    for (const p of ['/calculator/', '/calculator/profit/']) {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(p);
      let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `desktop ${p}`).toBeLessThanOrEqual(2);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(p);
      overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `mobile ${p}`).toBeLessThanOrEqual(2);
    }
  });

  test('no uncaught page errors on hub navigation', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    for (const p of CATEGORY_HUBS) {
      await page.goto(p);
      await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('tools index exposes calculator navigation links', async ({ page }) => {
    await page.goto('/tools/');
    await expect(page.locator('header .nav-links a[href="/calculator/"]')).toBeVisible();
    await expect(page.locator('header .nav-links a[href="/calculator/finance/"]')).toBeVisible();
  });
});

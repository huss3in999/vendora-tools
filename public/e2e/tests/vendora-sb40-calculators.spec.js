const { test, expect } = require('@playwright/test');

const SAMPLE = [
  '/calculator/finance/cagr-calculator/',
  '/calculator/profit/cost-plus-pricing-calculator/',
  '/calculator/general/click-through-rate-calculator/',
];

test.describe('Vendora batch-40 calculators', () => {
  test('finance hub lists CAGR tool', async ({ page }) => {
    await page.goto('/calculator/finance/');
    await expect(page.locator('a.calc-card[href="/calculator/finance/cagr-calculator/"]')).toBeVisible();
  });

  test('CAGR computes with currency bootstrap', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/calculator/finance/cagr-calculator/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /cagr-calculator/);
    await page.waitForFunction(() => window.VendoraCurrencyGlobal && typeof window.VendoraCurrencyGlobal.bootstrap === 'function');
    await page.evaluate(() => window.VendoraCurrencyGlobal.bootstrap('global', 'USD'));
    expect(await page.locator('select.currency-select-global option').count()).toBeGreaterThan(150);
    await page.locator('#start').fill('10000');
    await page.locator('#end').fill('18000');
    await page.locator('#yrs').fill('5');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toContainText('12');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('CTR has no currency path', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/calculator/general/click-through-rate-calculator/');
    await page.locator('#clk').fill('400');
    await page.locator('#imp').fill('100000');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toContainText('0.4');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('sample batch-40 pages: SEO + overflow', async ({ page }) => {
    for (const path of SAMPLE) {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(path);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(2);
    }
  });

  test('sitemap includes a batch-40 URL', async ({ request }) => {
    const text = await (await request.get('/sitemap.xml')).text();
    expect(text).toContain('https://getvendora.net/calculator/finance/cagr-calculator/');
  });
});

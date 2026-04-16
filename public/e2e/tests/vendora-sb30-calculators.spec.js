const { test, expect } = require('@playwright/test');

const SAMPLE = [
  '/calculator/finance/burn-rate-calculator/',
  '/calculator/profit/roas-calculator/',
  '/calculator/general/customer-churn-rate-calculator/',
  '/calculator/operations/revenue-per-employee-calculator/',
];

test.describe('Vendora SMB batch (30) calculators', () => {
  test('finance hub lists burn rate tool', async ({ page }) => {
    await page.goto('/calculator/finance/');
    await expect(page.locator('a.calc-card[href="/calculator/finance/burn-rate-calculator/"]')).toBeVisible();
  });

  test('burn rate calculates with worldwide currency bootstrap', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/calculator/finance/burn-rate-calculator/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /burn-rate-calculator/);
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    await page.waitForFunction(() => window.VendoraCurrencyGlobal && typeof window.VendoraCurrencyGlobal.bootstrap === 'function');
    await page.evaluate(() => window.VendoraCurrencyGlobal.bootstrap('global', 'USD'));
    const optCount = await page.locator('select.currency-select-global option').count();
    expect(optCount).toBeGreaterThan(150);
    await page.locator('#cash').fill('120000');
    await page.locator('#burn').fill('15000');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toContainText('8');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('churn rate has no currency and computes', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/calculator/general/customer-churn-rate-calculator/');
    await page.locator('#lost').fill('25');
    await page.locator('#start').fill('500');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toContainText('5');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('sample SB pages: SEO + overflow', async ({ page }) => {
    for (const path of SAMPLE) {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(path);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(2);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const m = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(m, path + ' mobile').toBeLessThanOrEqual(2);
    }
  });

  test('sitemap lists SMB batch calculator URL', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('https://getvendora.net/calculator/profit/roas-calculator/');
  });
});

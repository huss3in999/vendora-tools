const { test, expect } = require('@playwright/test');

const SMB_SAMPLE = [
  '/tools/small-business/calculators/budget/index.html',
  '/tools/small-business/calculators/roi/index.html',
  '/tools/small-business/calculators/churn-rate/index.html',
];

test.describe('Small business calculators', () => {
  test('public hub lists calculators with search and categories', async ({ page }) => {
    await page.goto('/tools/small-business/index.html');
    await expect(page.getByRole('heading', { level: 1, name: 'Small Business Calculators' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/);
    await expect(page.getByRole('button', { name: 'All categories' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
    await expect(page.locator('.sb-card')).toHaveCount(161);
  });

  test('budget calculator: currency + net result', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tools/small-business/calculators/budget/index.html');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /budget/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    await page.waitForFunction(() => window.VendoraCurrency && typeof window.VendoraCurrency.initSyncedCurrencySelects === 'function');
    await page.evaluate(() => window.VendoraCurrency.initSyncedCurrencySelects('global', 'USD'));
    await page.locator('#income').fill('20000');
    await page.locator('#fixed').fill('12000');
    await page.locator('#variablePct').fill('15');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toContainText(/\d/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('churn rate: no currency, computes', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tools/small-business/calculators/churn-rate/index.html');
    await page.locator('#lost').fill('25');
    await page.locator('#start').fill('500');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toContainText('5');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('sample SMB pages: SEO + overflow', async ({ page }) => {
    for (const path of SMB_SAMPLE) {
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
});

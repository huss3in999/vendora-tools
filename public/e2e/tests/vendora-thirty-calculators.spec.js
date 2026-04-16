const { test, expect } = require('@playwright/test');

const SAMPLE = [
  '/calculator/finance/loan-payment-calculator/',
  '/calculator/finance/present-value-calculator/',
  '/calculator/profit/bundle-value-calculator/',
  '/calculator/food/recipe-scaling-calculator/',
  '/calculator/inventory/economic-order-quantity-calculator/',
  '/calculator/general/rule-of-72-calculator/',
];

test.describe('Vendora thirty new calculators', () => {
  test('category hub lists new finance tool', async ({ page }) => {
    await page.goto('/calculator/finance/');
    await expect(page.locator('a.calc-card[href="/calculator/finance/loan-payment-calculator/"]')).toBeVisible();
  });

  test('loan payment calculates and currency selector populates (ISO list)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/calculator/finance/loan-payment-calculator/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /loan-payment-calculator/);
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    await page.waitForFunction(() => window.VendoraCurrencyGlobal && typeof window.VendoraCurrencyGlobal.bootstrap === 'function');
    await page.evaluate(() => window.VendoraCurrencyGlobal.bootstrap('global', 'USD'));
    const optCount = await page.locator('select.currency-select-global option').count();
    expect(optCount).toBeGreaterThan(150);
    await page.locator('#principal').fill('100000');
    await page.locator('#ratePct').fill('6');
    await page.locator('#years').fill('30');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).not.toHaveText('—');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('rule of 72 has no currency script issues', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/calculator/general/rule-of-72-calculator/');
    await page.locator('#rate').fill('8');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#outPrimary')).toHaveText(/9/);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('sample pages: SEO tags + responsive width', async ({ page }) => {
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

  test('sitemap contains new calculator URL', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('https://getvendora.net/calculator/finance/loan-payment-calculator/');
  });
});

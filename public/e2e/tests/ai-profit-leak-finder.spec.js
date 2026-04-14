const { test, expect } = require('@playwright/test');

test.describe('AI Profit Leak Finder', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://ai-core.huss3in999.workers.dev/text', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text:
            'SUMMARY: Test summary line.\nACTION1: First action.\nACTION2: Second action.\nACTION3: Third action.',
        }),
      });
    });
  });

  test('page loads with correct SEO title and visible hero', async ({ page }) => {
    await page.goto('/tools/ai-profit-leak-finder/');
    await expect(page).toHaveTitle(/AI Profit Leak Finder for Small Businesses/);
    await expect(page.getByRole('heading', { level: 1, name: 'AI Profit Leak Finder' })).toBeVisible();
    await expect(page.locator('.plf-trust-note')).toBeVisible();
  });

  test('analyze shows results and AI tips', async ({ page }) => {
    await page.goto('/tools/ai-profit-leak-finder/');
    await expect(page.locator('#revenue')).toBeVisible();
    await page.locator('#revenue').fill('10000');
    await page.locator('#cogs').fill('3000');
    await page.locator('#staff').fill('4000');
    await page.getByRole('button', { name: 'Analyze Business' }).click();
    await expect(page.locator('#resultsPanel')).toBeVisible();
    await expect(page.getByText('Calculated Business Snapshot')).toBeVisible();
    await expect(page.getByRole('heading', { name: '3. AI Profit Tips' })).toBeVisible();
    await expect(page.getByText('Test summary line.')).toBeVisible();
  });

  test('mobile viewport: no horizontal overflow, key UI visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/ai-profit-leak-finder/');
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);
    await expect(page.getByLabel(/Monthly revenue/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'AI Profit Leak Finder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze Business' })).toBeVisible();
  });

  test('no uncaught page errors during analyze', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.goto('/tools/ai-profit-leak-finder/');
    await page.locator('#revenue').fill('5000');
    await page.getByRole('button', { name: 'Analyze Business' }).click();
    await page.getByText('Test summary line.').waitFor({ state: 'visible', timeout: 15_000 });
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});

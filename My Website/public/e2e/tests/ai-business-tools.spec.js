const { test, expect } = require('@playwright/test');

const AI_ENDPOINT = 'https://ai-core.huss3in999.workers.dev/text';

test.describe('AI Business Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(AI_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'SUMMARY: Test output.\nRISK: low - test.\nNEXT1: One.\nNEXT2: Two.\nNEXT3: Three.',
        }),
      });
    });
  });

  test('AI Sales Trend Analyzer loads and analyzes', async ({ page }) => {
    await page.goto('/tools/ai-sales-trend-analyzer/');
    await expect(page).toHaveTitle(/AI Sales Trend Analyzer for Small Businesses/);
    await expect(page.getByRole('heading', { level: 1, name: 'AI Sales Trend Analyzer' })).toBeVisible();
    await expect(page.locator('#salesValues')).toBeVisible();
    await page.locator('#salesValues').fill('1200\n1300\n1250\n1400\n1500');
    await page.getByRole('button', { name: 'Analyze Trend' }).click();
    await expect(page.locator('#metricsGrid')).toBeVisible();
    await expect(page.locator('#outDirection')).not.toHaveText('—');
    await expect(page.getByText('Test output.')).toBeVisible();
  });

  test('AI Customer Profitability Calculator loads and calculates', async ({ page }) => {
    await page.goto('/tools/ai-customer-profitability/');
    await expect(page).toHaveTitle(/AI Customer Profitability Calculator/);
    await expect(page.getByRole('heading', { level: 1, name: 'AI Customer Profitability Calculator' })).toBeVisible();
    await expect(page.locator('#revenue')).toBeVisible();
    await page.locator('#revenue').fill('500');
    await page.locator('#serviceCost').fill('180');
    await page.locator('#deliveryCost').fill('25');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.locator('#metricsGrid')).toBeVisible();
    await expect(page.locator('#outProfitNoTime')).not.toHaveText('—');
    await expect(page.getByText('Test output.')).toBeVisible();
  });

  test('AI Break-Even Date Predictor loads and predicts', async ({ page }) => {
    await page.goto('/tools/ai-break-even-date/');
    await expect(page).toHaveTitle(/AI Break-Even Date Calculator/);
    await expect(page.getByRole('heading', { level: 1, name: 'AI Break-Even Date Predictor' })).toBeVisible();
    await expect(page.locator('#startupCost')).toBeVisible();
    await page.locator('#startupCost').fill('25000');
    await page.locator('#monthlyRevenue').fill('12000');
    await page.locator('#monthlyExpenses').fill('9000');
    await page.getByRole('button', { name: 'Predict Break-Even' }).click();
    await expect(page.locator('#metricsGrid')).toBeVisible();
    await expect(page.locator('#outMonths')).not.toHaveText('—');
    await expect(page.getByText('Test output.')).toBeVisible();
  });

  test('AI Cash Flow Risk Detector loads and detects', async ({ page }) => {
    await page.goto('/tools/ai-cash-flow-risk-detector/');
    await expect(page).toHaveTitle(/AI Cash Flow Risk Detector/);
    await expect(page.getByRole('heading', { level: 1, name: 'AI Cash Flow Risk Detector' })).toBeVisible();
    await expect(page.locator('#currentCash')).toBeVisible();
    await page.locator('#currentCash').fill('15000');
    await page.locator('#monthlyIncome').fill('10000');
    await page.locator('#monthlyExpenses').fill('12000');
    await page.getByRole('button', { name: 'Detect Risk' }).click();
    await expect(page.locator('#metricsGrid')).toBeVisible();
    await expect(page.locator('#outMonths')).not.toHaveText('—');
    await expect(page.getByText('Test output.')).toBeVisible();
  });

  test('mobile viewport: no horizontal overflow across all new tools', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const paths = [
      '/tools/ai-sales-trend-analyzer/',
      '/tools/ai-customer-profitability/',
      '/tools/ai-break-even-date/',
      '/tools/ai-cash-flow-risk-detector/',
    ];
    for (const p of paths) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('no uncaught page errors during calculations', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/tools/ai-sales-trend-analyzer/');
    await page.locator('#salesValues').fill('1200\n1300\n1250\n1400\n1500');
    await page.getByRole('button', { name: 'Analyze Trend' }).click();
    await page.getByText('Test output.').waitFor({ state: 'visible', timeout: 15_000 });

    await page.goto('/tools/ai-customer-profitability/');
    await page.locator('#revenue').fill('500');
    await page.locator('#serviceCost').fill('180');
    await page.locator('#deliveryCost').fill('25');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await page.getByText('Test output.').waitFor({ state: 'visible', timeout: 15_000 });

    await page.goto('/tools/ai-break-even-date/');
    await page.locator('#startupCost').fill('25000');
    await page.locator('#monthlyRevenue').fill('12000');
    await page.locator('#monthlyExpenses').fill('9000');
    await page.getByRole('button', { name: 'Predict Break-Even' }).click();
    await page.getByText('Test output.').waitFor({ state: 'visible', timeout: 15_000 });

    await page.goto('/tools/ai-cash-flow-risk-detector/');
    await page.locator('#currentCash').fill('15000');
    await page.locator('#monthlyIncome').fill('10000');
    await page.locator('#monthlyExpenses').fill('12000');
    await page.getByRole('button', { name: 'Detect Risk' }).click();
    await page.getByText('Test output.').waitFor({ state: 'visible', timeout: 15_000 });

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});


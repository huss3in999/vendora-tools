const { test, expect } = require('@playwright/test');

const STORAGE_KEY = 'restaurant-profit-dashboard:v1';
const PAGE_PATH = '/tools/restaurant-profit-dashboard/';

/** @param {import('@playwright/test').Page} page */
function attachConsoleFailureGuards(page) {
  const failures = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      failures.push(`console.${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    failures.push(`pageerror: ${err.message}`);
  });
  return failures;
}

/** @param {import('@playwright/test').Page} page */
async function expectKpiRegionHasNoBadNumbers(page) {
  const text = await page.locator('#kpiRegion').innerText();
  expect(text, text).not.toMatch(/NaN|Infinity/i);
}

/** @param {import('@playwright/test').Page} page @param {string} label */
function kpiCardByLabel(page, label) {
  return page.locator('#kpiRegion .kpi').filter({
    has: page.locator('.kpi-label', { hasText: label }),
  });
}

test.describe('Restaurant Profit Dashboard', () => {
  test('main heading visible; all core inputs exist; no console errors', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Restaurant Profit Dashboard' })).toBeVisible();

    await expect(page.getByLabel('Food sales')).toBeVisible();
    await expect(page.getByLabel('Beverage sales')).toBeVisible();
    await expect(page.getByLabel('Delivery sales')).toBeVisible();
    await expect(page.getByLabel('Other sales')).toBeVisible();
    await expect(page.getByLabel(/Discounts & refunds/i)).toBeVisible();

    await expect(page.getByLabel(/^Food cost$/)).toBeVisible();
    await expect(page.getByLabel('Packaging cost')).toBeVisible();
    await expect(page.getByLabel(/^Delivery fees$/)).toBeVisible();
    await expect(page.getByLabel(/^Labor cost$/)).toBeVisible();
    await expect(page.getByLabel(/^Rent$/)).toBeVisible();
    await expect(page.getByLabel(/^Utilities$/)).toBeVisible();
    await expect(page.getByLabel(/^Marketing$/)).toBeVisible();
    await expect(page.getByLabel('Miscellaneous expenses')).toBeVisible();

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('sample values update KPIs and status (profit / loss / break-even)', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    // Profit case: revenue 1000, variable 200, fixed 100 -> gross 800, net 700, margin 70%, food% 20%, labor% 10%
    await page.getByLabel('Food sales').fill('1000');
    await page.getByLabel('Food cost').fill('200');
    await page.getByLabel(/^Labor cost$/).fill('100');

    await expect(kpiCardByLabel(page, 'Total revenue').locator('.kpi-value')).toHaveText(/\$1,000\.00/);
    await expect(kpiCardByLabel(page, 'Total expenses').locator('.kpi-value')).toHaveText(/\$300\.00/);
    await expect(kpiCardByLabel(page, 'Gross profit').locator('.kpi-value')).toHaveText(/\$800\.00/);
    await expect(kpiCardByLabel(page, 'Net profit').locator('.kpi-value')).toHaveText(/\$700\.00/);
    await expect(kpiCardByLabel(page, 'Profit margin').locator('.kpi-value')).toHaveText('70.0%');
    await expect(kpiCardByLabel(page, 'Food cost %').locator('.kpi-value')).toHaveText('20.0%');
    await expect(kpiCardByLabel(page, 'Labor cost %').locator('.kpi-value')).toHaveText('10.0%');
    await expect(kpiCardByLabel(page, 'Break-even status').getByRole('status')).toHaveText('Profit');

    // Break-even: net 0
    await page.getByLabel('Food sales').fill('300');
    await page.getByLabel('Food cost').fill('100');
    await page.getByLabel(/^Labor cost$/).fill('200');
    await expect(kpiCardByLabel(page, 'Net profit').locator('.kpi-value')).toHaveText(/\$0\.00/);
    await expect(kpiCardByLabel(page, 'Break-even status').getByRole('status')).toHaveText('Break-even');

    // Loss
    await page.getByLabel('Food sales').fill('100');
    await page.getByLabel('Food cost').fill('50');
    await page.getByLabel(/^Labor cost$/).fill('200');
    await expect(kpiCardByLabel(page, 'Break-even status').getByRole('status')).toHaveText('Loss');

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('example data fills KPIs with valid currency and percentages', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByRole('button', { name: /Load example data/i }).click();

    await expect(kpiCardByLabel(page, 'Total revenue').locator('.kpi-value')).toHaveText(/\$/);
    await expect(kpiCardByLabel(page, 'Total expenses').locator('.kpi-value')).toHaveText(/\$/);
    await expect(kpiCardByLabel(page, 'Gross profit').locator('.kpi-value')).toHaveText(/\$/);
    await expect(kpiCardByLabel(page, 'Net profit').locator('.kpi-value')).toHaveText(/\$/);
    await expect(kpiCardByLabel(page, 'Profit margin').locator('.kpi-value')).toHaveText(/\d+\.\d+%/);
    await expect(kpiCardByLabel(page, 'Food cost %').locator('.kpi-value')).toHaveText(/\d+\.\d+%/);
    await expect(kpiCardByLabel(page, 'Labor cost %').locator('.kpi-value')).toHaveText(/\d+\.\d+%/);

    const statusText = await kpiCardByLabel(page, 'Break-even status').getByRole('status').innerText();
    expect(['Profit', 'Loss', 'Break-even']).toContain(statusText);

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('clear resets fields, storage, and KPI defaults; no NaN or Infinity', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByLabel('Food sales').fill('999');
    await page.getByLabel('Food cost').fill('1');
    await expect(page.locator('#foodSales')).toHaveValue('999');

    await page.getByRole('button', { name: /Clear all data/i }).click();

    await expect(page.locator('#foodSales')).toHaveValue('');
    await expect(page.locator('#foodCost')).toHaveValue('');

    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(stored).toBeNull();

    await expect(kpiCardByLabel(page, 'Total revenue').locator('.kpi-value')).toHaveText(/\$0\.00/);
    await expect(kpiCardByLabel(page, 'Total expenses').locator('.kpi-value')).toHaveText(/\$0\.00/);
    await expect(kpiCardByLabel(page, 'Gross profit').locator('.kpi-value')).toHaveText(/\$0\.00/);
    await expect(kpiCardByLabel(page, 'Net profit').locator('.kpi-value')).toHaveText(/\$0\.00/);
    await expect(kpiCardByLabel(page, 'Profit margin').locator('.kpi-value')).toHaveText('0.0%');
    await expect(kpiCardByLabel(page, 'Break-even status').getByRole('status')).toHaveText('Break-even');

    await expectKpiRegionHasNoBadNumbers(page);

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('print and export summary: buttons visible; export text contains key lines', async ({ page, context }) => {
    const failures = attachConsoleFailureGuards(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://127.0.0.1:4173',
    });
    await page.goto(PAGE_PATH);

    await page.getByRole('button', { name: /Load example data/i }).click();

    await expect(page.getByRole('button', { name: /^Print Summary$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Export Summary Text$/i })).toBeVisible();

    await page.getByRole('button', { name: /^Export Summary Text$/i }).click();

    const statusLine = page.locator('#exportStatus');
    const fallbackTextarea = page.locator('#exportFallbackText');
    await Promise.race([
      statusLine.waitFor({ state: 'visible', timeout: 8000 }),
      fallbackTextarea.waitFor({ state: 'visible', timeout: 8000 }),
    ]);

    let summary = '';
    if (await fallbackTextarea.isVisible()) {
      summary = await fallbackTextarea.inputValue();
    } else {
      summary = await page.evaluate(() => navigator.clipboard.readText());
    }

    expect(summary.trim().length).toBeGreaterThan(0);
    expect(summary).toMatch(/Restaurant Profit Dashboard/);
    expect(summary).toMatch(/Total revenue/i);
    expect(summary).toMatch(/Net profit/i);
    expect(summary).toMatch(/Status:/i);

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('csv export: download with dated filename and expected columns', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    await page.goto(PAGE_PATH);

    await page.getByLabel('Food sales').fill('3200');
    await page.getByLabel('Beverage sales').fill('400');
    await page.getByLabel('Food cost').fill('900');
    await page.getByLabel(/^Labor cost$/).fill('700');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export CSV$/i }).click();
    const download = await downloadPromise;

    expect(await download.failure()).toBeNull();
    const suggested = download.suggestedFilename();
    expect(suggested).toMatch(/^restaurant-profit-dashboard-\d{4}-\d{2}-\d{2}\.csv$/);

    const targetPath = path.join(os.tmpdir(), `playwright-rpd-csv-${Date.now()}.csv`);
    await download.saveAs(targetPath);
    const raw = fs.readFileSync(targetPath, 'utf8');
    const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

    expect(content).toContain('Category,Field,Value');
    expect(content).toContain('Restaurant Profit Dashboard');
    expect(content).toContain('Total revenue');
    expect(content).toContain('Total expenses');
    expect(content).toContain('Net profit');
    expect(content).toMatch(/KPI,Status,/);
    expect(content).not.toMatch(/NaN|Infinity/i);

    try {
      fs.unlinkSync(targetPath);
    } catch (e) {
      /* ignore */
    }

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('previous period comparison: save baseline, see diffs, clear returns empty state', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByLabel('Food sales').fill('5000');
    await page.getByLabel('Food cost').fill('1500');
    await page.getByLabel(/^Labor cost$/).fill('1000');
    await page.getByLabel(/^Rent$/).fill('400');

    await page.getByRole('button', { name: /Save current as previous period/i }).click();

    await expect(page.locator('#compareActionStatus')).toContainText(/baseline saved/i, { timeout: 5000 });
    await expect(page.locator('#compareActionStatus')).toBeVisible();

    await page.getByLabel('Food sales').fill('8000');
    await page.getByLabel(/^Labor cost$/).fill('1200');
    await page.getByLabel(/^Rent$/).fill('350');

    const compare = page.locator('#compareSummary');
    await expect(compare.locator('.compare-card')).toHaveCount(6);

    await expect(compare).toContainText('Total revenue');
    await expect(compare).toContainText('Total expenses');
    await expect(compare).toContainText('Net profit');
    await expect(compare).toContainText('Profit margin');

    const compareText = await compare.innerText();
    expect(compareText).not.toMatch(/NaN|Infinity/i);

    const metricCards = compare.locator('.compare-card');
    await expect(metricCards).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      const diffDd = metricCards.nth(i).locator('.compare-dl-row').nth(2).locator('dd').first();
      const diffText = (await diffDd.innerText()).trim();
      expect(diffText.length, `Difference row ${i}`).toBeGreaterThan(0);
    }

    await page.getByRole('button', { name: /Clear previous period/i }).click();

    await expect(compare).toContainText(/No previous period saved yet/i);
    await expect(compare.locator('.compare-card')).toHaveCount(0);

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('localStorage restores values after reload', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByLabel('Beverage sales').fill('123.45');
    await page.getByLabel('Rent').fill('500');
    await page.getByLabel('Reporting period').selectOption('weekly');

    await page.reload();

    await expect(page.getByLabel('Beverage sales')).toHaveValue('123.45');
    await expect(page.getByLabel('Rent')).toHaveValue('500');
    await expect(page.getByLabel('Reporting period')).toHaveValue('weekly');

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('mobile viewport: usable layout, no horizontal overflow, inputs not clipped', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PAGE_PATH);

    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);

    const layoutIssue = await page.evaluate(() => {
      const pad = 6;
      const w = window.innerWidth;
      const inputs = Array.from(document.querySelectorAll('#main input.input, #main select.input'));
      for (const el of inputs) {
        const r = el.getBoundingClientRect();
        if (r.width < 24) return `input too narrow: ${el.id || el.tagName}`;
        if (r.left < -pad || r.right > w + pad) return `input clipped: ${el.id || el.tagName}`;
      }
      const cards = Array.from(document.querySelectorAll('#main .card'));
      for (let i = 1; i < cards.length; i++) {
        const prev = cards[i - 1].getBoundingClientRect();
        const cur = cards[i].getBoundingClientRect();
        const verticalStack = cur.top >= prev.top - 4;
        if (!verticalStack && cur.left < prev.right - 8) {
          return 'suspected card overlap in main';
        }
      }
      return null;
    });
    expect(layoutIssue, layoutIssue).toBeNull();

    await expect(page.getByRole('heading', { level: 1, name: 'Restaurant Profit Dashboard' })).toBeVisible();
    await expect(kpiCardByLabel(page, 'Total revenue')).toBeVisible();

    await expectKpiRegionHasNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

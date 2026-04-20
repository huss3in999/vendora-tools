const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');

const STORAGE_KEY = 'quotation-generator:v1';
const PAGE_PATH = '/tools/quotation-generator/';

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
async function expectNoNaNOrInfinityInScope(page, root) {
  const text = await page.locator(root).innerText();
  expect(text, text).not.toMatch(/NaN|Infinity/i);
}

test.describe('Quotation Generator', () => {
  test('H1, core business/customer/meta fields, console safety', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Quotation Generator' })).toBeVisible();

    await expect(page.getByLabel('Business name', { exact: true })).toBeVisible();
    await expect(page.locator('#bizPhone')).toBeVisible();
    await expect(page.locator('#bizEmail')).toBeVisible();
    await expect(page.locator('#bizAddress')).toBeVisible();

    await expect(page.getByLabel('Customer name')).toBeVisible();
    await expect(page.locator('#custPhone')).toBeVisible();
    await expect(page.locator('#custEmail')).toBeVisible();
    await expect(page.locator('#custAddress')).toBeVisible();

    await expect(page.getByLabel('Quotation number')).toBeVisible();
    await expect(page.getByLabel('Quotation date')).toBeVisible();
    await expect(page.getByLabel('Valid until')).toBeVisible();
    await expect(page.getByLabel('Currency')).toBeVisible();

    await expectNoNaNOrInfinityInScope(page, '#main');
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('line items: default row, totals, add/remove row', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    const rows = page.locator('#linesBody tr[data-line-id]');
    await expect(rows).toHaveCount(1);

    const first = rows.first();
    await first.locator('[data-field="description"]').fill('Consulting hours');
    await first.locator('[data-field="quantity"]').fill('4');
    await first.locator('[data-field="unitPrice"]').fill('25');

    await expect(first.locator('[data-line-total]')).toHaveText(/\$100\.00/);

    await page.locator('#btn-add-line').click();
    await expect(rows).toHaveCount(2);

    const second = rows.nth(1);
    await second.locator('[data-field="description"]').fill('Materials');
    await second.locator('[data-field="quantity"]').fill('1');
    await second.locator('[data-field="unitPrice"]').fill('50');
    await expect(second.locator('[data-line-total]')).toHaveText(/\$50\.00/);

    await expect(page.locator('#dispSubtotal')).toHaveText(/\$150\.00/);

    await second.getByRole('button', { name: 'Remove line' }).click();
    await expect(rows).toHaveCount(1);
    await expect(page.locator('#dispSubtotal')).toHaveText(/\$100\.00/);

    await expectNoNaNOrInfinityInScope(page, '#main');
    await expectNoNaNOrInfinityInScope(page, '#quotationPreview');
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('totals: discount, tax, grand formula; invalid values; floor at zero', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    const row = page.locator('#linesBody tr').first();
    await row.locator('[data-field="description"]').fill('Item A');
    await row.locator('[data-field="quantity"]').fill('2');
    await row.locator('[data-field="unitPrice"]').fill('100');

    await expect(page.locator('#dispSubtotal')).toHaveText(/\$200\.00/);

    await page.locator('#discountAmount').fill('25.5');
    await page.locator('#taxAmount').fill('10.25');

    await expect(page.locator('#dispDiscount')).toHaveText(/\$25\.50/);
    await expect(page.locator('#dispTax')).toHaveText(/\$10\.25/);
    await expect(page.locator('#dispGrand')).toHaveText(/\$184\.75/);

    await page.locator('#discountAmount').fill('not-a-number');
    await page.locator('#taxAmount').fill('also-bad');
    await expect(page.locator('#dispDiscount')).toHaveText(/\$0\.00/);
    await expect(page.locator('#dispTax')).toHaveText(/\$0\.00/);
    await expect(page.locator('#dispGrand')).toHaveText(/\$200\.00/);

    await page.locator('#discountAmount').fill('5000');
    await page.locator('#taxAmount').fill('0');
    await expect(page.locator('#dispGrand')).toHaveText(/\$0\.00/);

    const combined =
      (await page.locator('#main').innerText()) + (await page.locator('#quotationPreview').innerText());
    expect(combined, combined).not.toMatch(/NaN|Infinity/i);

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('load example, clear all, localStorage restore after reload', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.locator('#btn-example').click();
    await expect(page.locator('#bizName')).toHaveValue(/Harborline/i);
    await expect(page.locator('#quoteNumber')).toHaveValue('Q-2026-0142');
    await expect(page.locator('#linesBody tr')).toHaveCount(3);

    page.once('dialog', (d) => {
      expect(d.message()).toMatch(/Clear all quotation data/i);
      d.accept();
    });
    await page.locator('#btn-clear').click();
    await expect(page.locator('#bizName')).toHaveValue('');
    await expect(page.locator('#quoteNumber')).toHaveValue('');
    await expect(page.locator('#linesBody tr')).toHaveCount(1);

    await page.locator('#bizName').fill('Persist LLC');
    await page.locator('#quoteNumber').fill('Q-PW-001');

    await page.waitForFunction(
      (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
          const o = JSON.parse(raw);
          return o.business && o.business.name === 'Persist LLC' && o.meta && o.meta.quoteNumber === 'Q-PW-001';
        } catch {
          return false;
        }
      },
      STORAGE_KEY,
      { timeout: 5000 },
    );

    await page.reload();
    await expect(page.locator('#bizName')).toHaveValue('Persist LLC');
    await expect(page.locator('#quoteNumber')).toHaveValue('Q-PW-001');

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('export CSV: download, filename, required columns, no NaN in file', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.locator('#quoteNumber').fill('Q-CSV-99');
    const row = page.locator('#linesBody tr').first();
    await row.locator('[data-field="description"]').fill('Export line');
    await row.locator('[data-field="quantity"]').fill('1');
    await row.locator('[data-field="unitPrice"]').fill('42');
    await page.locator('#discountAmount').fill('2');
    await page.locator('#taxAmount').fill('3');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-csv').click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();

    const suggested = download.suggestedFilename();
    expect(suggested).toMatch(/^quotation-\d{4}-\d{2}-\d{2}\.csv$/);

    const tmp = path.join(os.tmpdir(), suggested);
    await download.saveAs(tmp);
    const content = fs.readFileSync(tmp, 'utf8');
    fs.unlinkSync(tmp);

    // App uses "Section" as the first CSV column header (category-style row grouping).
    expect(content).toContain('Section,Field,Value');
    expect(content).toContain('Q-CSV-99');
    expect(content).toContain('Totals,Subtotal');
    expect(content).toContain('Totals,Grand total');
    expect(content).not.toMatch(/NaN|Infinity/i);

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('export summary: clipboard or fallback; print button visible', async ({ page, context }) => {
    const failures = attachConsoleFailureGuards(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://127.0.0.1:4173',
    });
    await page.goto(PAGE_PATH);

    await page.locator('#quoteNumber').fill('Q-SUM-7');
    const row = page.locator('#linesBody tr').first();
    await row.locator('[data-field="quantity"]').fill('2');
    await row.locator('[data-field="unitPrice"]').fill('15');

    await expect(page.locator('#btn-print')).toBeVisible();

    await page.locator('#btn-summary').click();
    const fallback = page.locator('#exportFallback');
    const fbText = page.locator('#exportFbText');
    const status = page.locator('#actionStatus');

    await Promise.race([
      status.waitFor({ state: 'visible', timeout: 8000 }),
      fallback.waitFor({ state: 'visible', timeout: 8000 }),
    ]);

    let summary = '';
    if (await fallback.isVisible()) {
      summary = await fbText.inputValue();
      await page.locator('#exportFbClose').click();
    } else {
      summary = await page.evaluate(() => navigator.clipboard.readText());
    }

    expect(summary).toMatch(/Quotation Generator/i);
    expect(summary).toContain('Q-SUM-7');
    expect(summary).toMatch(/Subtotal/i);
    expect(summary).toMatch(/Grand total/i);

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('phone viewport: no severe horizontal overflow', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    const vw = 390;
    const vh = 844;
    await page.setViewportSize({ width: vw, height: vh });
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Quotation Generator' })).toBeVisible();
    await expect(page.locator('#main')).toBeVisible();

    const scrollWidth = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    );
    expect(scrollWidth, `scrollWidth ${scrollWidth} vs vw ${vw}`).toBeLessThanOrEqual(vw + 64);

    expect(failures, failures.join('\n')).toEqual([]);
  });
});

const { test, expect } = require('@playwright/test');
const fs = require('fs');

function localYmd() {
  const d = new Date();
  const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function attachConsoleGuards(page, consoleErrors, pageErrors) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[console.error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(`[pageerror] ${err.message}`);
  });
}

test.describe('Work Hours & Overtime Calculator', () => {
  test.beforeEach(async ({ page }) => {
    const stubJs = (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: '/* stub */' });
    await page.route('**/*googletagmanager.com/**', stubJs);
    await page.route('**/*google-analytics.com/**', stubJs);
    await page.route('**/*analytics.google.com/**', stubJs);
  });

  test('loads: H1, inputs, known totals, validation, utilities, export, summary, print, mobile, no console errors', async ({
    page,
    context,
  }) => {
    const consoleErrors = [];
    const pageErrors = [];
    attachConsoleGuards(page, consoleErrors, pageErrors);

    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });

    await test.step('Open page: H1 and core inputs', async () => {
      await page.goto('/tools/work-hours-overtime-calculator/');
      await expect(page.getByRole('heading', { level: 1, name: 'Work Hours & Overtime Calculator' })).toBeVisible();
      await expect(page.getByLabel(/Date or day label/i)).toBeVisible();
      await expect(page.getByLabel(/^Start time$/i)).toBeVisible();
      await expect(page.getByLabel(/^End time$/i)).toBeVisible();
      await expect(page.getByLabel(/Unpaid break/i)).toBeVisible();
      await expect(page.getByLabel(/^Hourly rate$/i)).toBeVisible();
      await expect(page.getByLabel(/Overtime threshold/i)).toBeVisible();
      await expect(page.getByLabel(/^Overtime multiplier$/i)).toBeVisible();
      await expect(page.getByLabel(/^Notes/i)).toBeVisible();
    });

    await test.step('Load example: known totals (09:00–18:00, 30m break, $24.50, threshold 8, 1.5×)', async () => {
      await page.getByRole('button', { name: 'Load example' }).click();
      await expect(page.getByLabel(/Date or day label/i)).toHaveValue(/Friday payroll/i);
      await expect(page.getByLabel(/^Start time$/i)).toHaveValue('09:00');
      await expect(page.getByLabel(/^End time$/i)).toHaveValue('18:00');
      await expect(page.getByLabel(/Unpaid break/i)).toHaveValue('30');
      await expect(page.getByLabel(/^Hourly rate$/i)).toHaveValue('24.50');
      await expect(page.getByLabel(/Overtime threshold/i)).toHaveValue('8');
      await expect(page.getByLabel(/^Overtime multiplier$/i)).toHaveValue('1.5');
      await expect(page.locator('#outWorkedHours')).toHaveText('8.50 h');
      await expect(page.locator('#outRegularHours')).toHaveText('8.00 h');
      await expect(page.locator('#outOvertimeHours')).toHaveText('0.50 h');
      await expect(page.locator('#outRegularPay')).toHaveText('$196.00');
      await expect(page.locator('#outOvertimePay')).toHaveText('$18.38');
      await expect(page.locator('#outTotalPay')).toHaveText('$214.38');
    });

    await test.step('Validation warnings; no NaN/Infinity in outputs', async () => {
      await page.getByLabel(/^End time$/i).fill('08:00');
      await expect(page.locator('#warningsPanel')).toContainText(/End time must be after start time/i);
      await expect(page.locator('#outWorkedHours')).toHaveText('—');
      for (const id of ['outWorkedHours', 'outRegularHours', 'outOvertimeHours', 'outRegularPay', 'outOvertimePay', 'outTotalPay']) {
        await expect(page.locator(`#${id}`)).not.toContainText(/NaN|Infinity/i);
      }

      await page.getByLabel(/^End time$/i).fill('18:00');
      await page.getByLabel(/Unpaid break/i).fill('600');
      await expect(page.locator('#warningsPanel')).toContainText(/Unpaid break is larger than the time between start and end/i);
      for (const id of ['outWorkedHours', 'outRegularHours', 'outOvertimeHours', 'outRegularPay', 'outOvertimePay', 'outTotalPay']) {
        await expect(page.locator(`#${id}`)).not.toContainText(/NaN|Infinity/i);
      }

      await page.getByLabel(/^Start time$/i).fill('');
      await page.getByLabel(/^End time$/i).fill('');
      await page.getByLabel(/Unpaid break/i).fill('0');
      await expect(page.locator('#warningsPanel')).toContainText(/Enter both start and end times/i);
      for (const id of ['outWorkedHours', 'outRegularHours', 'outOvertimeHours', 'outRegularPay', 'outOvertimePay', 'outTotalPay']) {
        await expect(page.locator(`#${id}`)).not.toContainText(/NaN|Infinity/i);
      }
    });

    await test.step('Clear all resets fields', async () => {
      await page.getByRole('button', { name: 'Load example' }).click();
      page.once('dialog', (d) => d.accept());
      await page.getByRole('button', { name: 'Clear all' }).click();
      await expect(page.getByLabel(/^Start time$/i)).toHaveValue('');
      await expect(page.getByLabel(/^End time$/i)).toHaveValue('');
      await expect(page.getByLabel(/^Hourly rate$/i)).toHaveValue('');
    });

    await test.step('localStorage restores after reload', async () => {
      await page.getByLabel(/^Start time$/i).fill('10:00');
      await page.getByLabel(/^End time$/i).fill('11:00');
      await page.getByLabel(/^Hourly rate$/i).fill('15');
      await page.getByLabel(/Date or day label/i).fill('Persistence probe');
      await expect
        .poll(async () =>
          page.evaluate(() => localStorage.getItem('work-hours-overtime-calculator:v1') || ''),
        )
        .toContain('10:00');
      await expect
        .poll(async () =>
          page.evaluate(() => localStorage.getItem('work-hours-overtime-calculator:v1') || ''),
        )
        .toContain('Persistence probe');

      await page.reload();
      await expect(page.getByLabel(/^Start time$/i)).toHaveValue('10:00');
      await expect(page.getByLabel(/^End time$/i)).toHaveValue('11:00');
      await expect(page.getByLabel(/^Hourly rate$/i)).toHaveValue('15');
      await expect(page.getByLabel(/Date or day label/i)).toHaveValue('Persistence probe');
    });

    await test.step('Export CSV: download, filename, header and rows, no NaN/Infinity', async () => {
      await page.getByRole('button', { name: 'Load example' }).click();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export CSV' }).click();
      const download = await downloadPromise;
      const expectedName = `work-hours-overtime-${localYmd()}.csv`;
      expect(download.suggestedFilename()).toBe(expectedName);

      const csvPath = await download.path();
      expect(csvPath, 'download path').toBeTruthy();
      const csvRaw = fs.readFileSync(csvPath, 'utf8');
      const csv = csvRaw.replace(/^\uFEFF/, '');
      expect(csv.split(/\r?\n/)[0]).toContain('Section');
      expect(csv.split(/\r?\n/)[0]).toContain('Field');
      expect(csv.split(/\r?\n/)[0]).toContain('Value');
      expect(csv).toMatch(/Worked hours/i);
      expect(csv).toMatch(/Overtime hours/i);
      expect(csv).toMatch(/Total pay/i);
      expect(csv).not.toMatch(/NaN/i);
      expect(csv).not.toMatch(/Infinity/i);
    });

    await test.step('Export summary: clipboard or fallback dialog', async () => {
      await page.getByRole('button', { name: 'Export summary text' }).click();
      const status = page.locator('#actionStatus');
      const fallback = page.locator('#exportFallback');
      await expect
        .poll(async () => {
          const st = await status.isVisible().catch(() => false);
          const fb = await fallback.isVisible().catch(() => false);
          if (st && (await status.textContent()).includes('clipboard')) return 'status';
          if (fb) return 'fallback';
          return '';
        })
        .not.toBe('');

      let summaryText = '';
      if (await fallback.isVisible()) {
        summaryText = await page.locator('#exportFbText').inputValue();
        await page.locator('#exportFbClose').click();
      } else {
        summaryText = await page.evaluate(async () => {
          try {
            return await navigator.clipboard.readText();
          } catch {
            return '';
          }
        });
      }
      expect(summaryText).toContain('Work Hours & Overtime Calculator');
      expect(summaryText).toMatch(/Worked hours/i);
      expect(summaryText).toMatch(/Overtime hours/i);
      expect(summaryText).toMatch(/Total pay/i);
      expect(summaryText).not.toMatch(/NaN/i);
      expect(summaryText).not.toMatch(/Infinity/i);
    });

    await test.step('Print button visible (no native print dialog)', async () => {
      await expect(page.getByRole('button', { name: 'Print summary' })).toBeVisible();
    });

    await test.step('Mobile viewport: layout usable', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(4);
      await expect(page.getByRole('heading', { level: 1, name: 'Work Hours & Overtime Calculator' })).toBeVisible();
      await expect(page.getByLabel(/^Start time$/i)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    });

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });
});

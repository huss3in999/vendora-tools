const { test, expect } = require('@playwright/test');

const STORAGE_KEY = 'staff-schedule-generator:v1';
const PAGE_PATH = '/tools/staff-schedule-generator/';

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
async function expectPanelsHaveNoBadNumbers(page) {
  const scope = page.locator('#main');
  const text = await scope.innerText();
  expect(text, text).not.toMatch(/NaN|Infinity/i);
}

/** @param {import('@playwright/test').Page} page */
function mondaySection(page) {
  return page.locator('section.day-card[data-day-index="0"]');
}

/** @param {import('@playwright/test').Page} page */
function tuesdaySection(page) {
  return page.locator('section.day-card[data-day-index="1"]');
}

test.describe('Staff Schedule Generator', () => {
  test('heading, setup fields, and console safety', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Staff Schedule Generator' })).toBeVisible();

    await expect(page.getByLabel('Business name')).toBeVisible();
    await expect(page.getByLabel('Week label')).toBeVisible();
    await expect(page.getByLabel('Notes (optional)')).toBeVisible();

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('staff: add, list row, edit name/role/max hours; updates visible', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByRole('button', { name: 'Add staff member' }).click();
    const row = page.locator('#staffList [data-staff-id]').first();
    await expect(row).toBeVisible();

    await row.locator('[data-field="name"]').fill('Jamie Ortiz');
    await row.locator('[data-field="role"]').fill('Barista');
    await row.locator('[data-field="maxHours"]').fill('30');

    await expect(row.locator('[data-field="name"]')).toHaveValue('Jamie Ortiz');
    await expect(row.locator('[data-field="role"]')).toHaveValue('Barista');
    await expect(row.locator('[data-field="maxHours"]')).toHaveValue('30');

    await row.locator('[data-field="name"]').fill('Jamie Ortiz-Reyes');
    await row.locator('[data-field="role"]').fill('Lead');
    await row.locator('[data-field="maxHours"]').fill('28');

    await expect(row.locator('[data-field="name"]')).toHaveValue('Jamie Ortiz-Reyes');
    await expect(row.locator('[data-field="role"]')).toHaveValue('Lead');
    await expect(row.locator('[data-field="maxHours"]')).toHaveValue('28');

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('shift: add, assign staff, hours math; totals; validation; no NaN on invalid rows', async ({
    page,
  }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByRole('button', { name: 'Add staff member' }).click();
    const staffRow = page.locator('#staffList [data-staff-id]').first();
    const staffId = await staffRow.getAttribute('data-staff-id');
    expect(staffId).toBeTruthy();
    await staffRow.locator('[data-field="name"]').fill('Morgan Lee');

    await mondaySection(page).getByRole('button', { name: 'Add shift' }).click();
    const shiftRow = mondaySection(page).locator('[data-shift-id]').first();
    await shiftRow.locator('select[data-field="staffId"]').selectOption(staffId);
    await shiftRow.locator('[data-field="role"]').fill('Opening');
    await shiftRow.locator('[data-field="start"]').fill('09:00');
    await shiftRow.locator('[data-field="end"]').fill('17:00');
    await shiftRow.locator('[data-field="breakMinutes"]').fill('30');

    await expect(shiftRow.locator('[data-shift-hours]')).toHaveText('7.5 h');

    await expect(page.locator('#totalsStaff')).toContainText('Morgan Lee');
    await expect(page.locator('#totalsStaff')).toContainText('7.5 h');
    await expect(page.locator('#totalsDay')).toContainText('Monday');
    await expect(page.locator('#totalsDay')).toContainText('7.5 h');
    await expect(page.locator('#totalsDay')).toContainText(/All days:\s*7\.5 h/);

    await shiftRow.locator('[data-field="end"]').fill('08:00');
    await expect(shiftRow.locator('[data-shift-hours]')).toHaveText('0.0 h');
    await expect(page.locator('#warningsPanel')).toContainText(/end time must be after start time/i);
    await expect(shiftRow).toHaveClass(/shift-row-invalid/);

    await shiftRow.locator('[data-field="end"]').fill('10:00');
    await shiftRow.locator('[data-field="breakMinutes"]').fill('120');
    await expect(shiftRow.locator('[data-shift-hours]')).toHaveText('0.0 h');
    await expect(page.locator('#warningsPanel')).toContainText(/break minutes are larger than the shift length/i);

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('max hours warning and empty-day warnings', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByRole('button', { name: 'Add staff member' }).click();
    const staffRow = page.locator('#staffList [data-staff-id]').first();
    const staffId = await staffRow.getAttribute('data-staff-id');
    await staffRow.locator('[data-field="name"]').fill('Ravi N.');
    await staffRow.locator('[data-field="maxHours"]').fill('5');

    await mondaySection(page).getByRole('button', { name: 'Add shift' }).click();
    const row1 = mondaySection(page).locator('[data-shift-id]').first();
    await row1.locator('select[data-field="staffId"]').selectOption(staffId);
    await row1.locator('[data-field="start"]').fill('09:00');
    await row1.locator('[data-field="end"]').fill('14:00');
    await row1.locator('[data-field="breakMinutes"]').fill('0');

    await mondaySection(page).getByRole('button', { name: 'Add shift' }).click();
    const row2 = mondaySection(page).locator('[data-shift-id]').nth(1);
    await row2.locator('select[data-field="staffId"]').selectOption(staffId);
    await row2.locator('[data-field="start"]').fill('15:00');
    await row2.locator('[data-field="end"]').fill('20:00');
    await row2.locator('[data-field="breakMinutes"]').fill('0');

    await expect(page.locator('#warningsPanel')).toContainText(/exceeds max hours/i);
    await expect(page.locator('#warningsPanel')).toContainText(/Tuesday:\s*no shifts scheduled/i);

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('load example, clear all, and localStorage restore after reload', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    await page.goto(PAGE_PATH);

    await page.getByRole('button', { name: 'Load example schedule' }).click();
    await expect(page.locator('#businessName')).toHaveValue('Riverfront Café');
    await expect(page.locator('#staffList [data-staff-id]')).toHaveCount(2);
    await expect(page.locator('#staffList [data-field="name"]').nth(0)).toHaveValue('Alex Morgan');
    await expect(page.locator('#staffList [data-field="name"]').nth(1)).toHaveValue('Jordan Lee');
    await expect(mondaySection(page).locator('[data-shift-id]')).toHaveCount(2);

    page.once('dialog', (d) => {
      expect(d.message()).toMatch(/Clear all schedule data/i);
      d.accept();
    });
    await page.getByRole('button', { name: 'Clear all schedule data' }).click();
    await expect(page.locator('#businessName')).toHaveValue('');
    await expect(page.locator('#staffList')).toContainText(/No staff yet/i);

    await page.getByLabel('Business name').fill('Persist Test Co');
    await page.getByRole('button', { name: 'Add staff member' }).click();
    await page.locator('#staffList [data-field="name"]').first().fill('Casey Rowe');

    await page.waitForFunction(
      (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
          const o = JSON.parse(raw);
          return o.businessName === 'Persist Test Co' && Array.isArray(o.staff) && o.staff.length > 0;
        } catch {
          return false;
        }
      },
      STORAGE_KEY,
      { timeout: 5000 },
    );

    await page.reload();
    await expect(page.getByLabel('Business name')).toHaveValue('Persist Test Co');
    await expect(page.locator('#staffList [data-field="name"]').first()).toHaveValue('Casey Rowe');

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('export CSV download; summary text or fallback; print button visible', async ({
    page,
    context,
  }) => {
    const failures = attachConsoleFailureGuards(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: 'http://127.0.0.1:4173',
    });
    await page.goto(PAGE_PATH);

    await page.getByLabel('Business name').fill('Export Kitchen');
    await page.getByRole('button', { name: 'Add staff member' }).click();
    await page.locator('#staffList [data-field="name"]').first().fill('Exporter');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-csv').click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(/^staff-schedule-\d{4}-\d{2}-\d{2}\.csv$/);

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

    expect(summary.trim().length).toBeGreaterThan(0);
    expect(summary).toMatch(/Staff Schedule Generator — summary/i);
    expect(summary).toMatch(/Business:/i);

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('phone viewport: layout usable without severe horizontal overflow', async ({ page }) => {
    const failures = attachConsoleFailureGuards(page);
    const vw = 390;
    const vh = 844;
    await page.setViewportSize({ width: vw, height: vh });
    await page.goto(PAGE_PATH);

    await expect(page.getByRole('heading', { level: 1, name: 'Staff Schedule Generator' })).toBeVisible();
    await expect(page.locator('#main')).toBeVisible();

    const scrollWidth = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    );
    expect(scrollWidth, `scrollWidth ${scrollWidth} vs vw ${vw}`).toBeLessThanOrEqual(vw + 64);

    await expectPanelsHaveNoBadNumbers(page);
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

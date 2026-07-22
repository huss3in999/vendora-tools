const { test, expect } = require('@playwright/test');

const NEW_DATE_TIME_PAGES = [
  '/calculators/birthday-calculator/',
  '/calculators/days-from-today-calculator/',
  '/calculators/time-calculator/',
  '/calculators/stopwatch/',
];

function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('405')) errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    if (!error.message.includes('405')) errors.push(error.message);
  });
  return errors;
}

test.describe('New Date & Time calculators', () => {
  test('all four pages load without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    for (const path of NEW_DATE_TIME_PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path.replace(/\//g, '\\/')}$`));
    }

    expect(errors).toEqual([]);
  });

  test('mobile viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of NEW_DATE_TIME_PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflow`).toBeLessThanOrEqual(2);
    }
  });

  test('birthday calculator produces age and countdown result', async ({ page }) => {
    await page.goto('/calculators/birthday-calculator/');
    await page.locator('#birthDate').fill('2000-06-10');
    await page.locator('#referenceDate').fill('2026-05-27');
    await page.locator('#calculateBirthday').click();

    const result = page.locator('#birthdayResult');
    await expect(result).toContainText('Current age: 25');
    await expect(result).toContainText('Days until next birthday: 14');
    await expect(result).toContainText('Born on: Saturday');
  });

  test('days from today calculator returns the correct date for 30 days', async ({ page }) => {
    await page.goto('/calculators/days-from-today-calculator/');
    const expectedIso = await page.evaluate(() => {
      const today = new Date();
      const target = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
      target.setDate(target.getDate() + 30);
      const pad = (value) => String(value).padStart(2, '0');
      return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
    });

    await page.locator('#daysOffset').fill('30');
    await expect(page.locator('#daysResult')).toContainText(`Result date: ${expectedIso}`);
  });

  test('time calculator handles add and subtract across midnight', async ({ page }) => {
    await page.goto('/calculators/time-calculator/');

    await page.locator('#startTime').fill('23:30');
    await page.locator('#operation').selectOption('add');
    await page.locator('#hoursAmount').fill('2');
    await page.locator('#minutesAmount').fill('0');
    await page.locator('#calculateTime').click();
    await expect(page.locator('#timeResult')).toContainText('Final time: 01:30');
    await expect(page.locator('#timeResult')).toContainText('Day: next day');

    await page.locator('#startTime').fill('00:15');
    await page.locator('#operation').selectOption('subtract');
    await page.locator('#hoursAmount').fill('0');
    await page.locator('#minutesAmount').fill('30');
    await page.locator('#calculateTime').click();
    await expect(page.locator('#timeResult')).toContainText('Final time: 23:45');
    await expect(page.locator('#timeResult')).toContainText('Day: previous day');
  });

  test('stopwatch start, pause, lap, and reset work', async ({ page }) => {
    await page.goto('/calculators/stopwatch/');

    await expect(page.locator('#elapsed')).toHaveText('00:00.00');
    await page.locator('#startPauseBtn').click();
    await page.waitForTimeout(180);
    await page.locator('#lapBtn').click();
    await expect(page.locator('#laps li')).toHaveCount(1);
    await page.locator('#startPauseBtn').click();

    const pausedValue = await page.locator('#elapsed').innerText();
    expect(pausedValue).not.toBe('00:00.00');

    await page.locator('#resetBtn').click();
    await expect(page.locator('#elapsed')).toHaveText('00:00.00');
    await expect(page.locator('#laps li')).toHaveCount(0);
  });

  test('calculator hub links to all four new pages', async ({ page }) => {
    await page.goto('/calculators/');

    for (const href of [
      'birthday-calculator/',
      'days-from-today-calculator/',
      'time-calculator/',
      'stopwatch/',
    ]) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    }
  });
});

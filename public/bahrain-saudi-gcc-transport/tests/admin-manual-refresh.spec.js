import { test, expect } from '@playwright/test';

test('admin loads initially and refreshes only when requested', async ({ page }) => {
  let requestCount = 0;
  const resourcesRequested = [];

  await page.route('**/api/transport/admin**', async (route) => {
    requestCount += 1;
    const resource = new URL(route.request().url()).searchParams.get('resource') || 'leads';
    resourcesRequested.push(resource);
    const responses = {
      routes: { ok: true, routes: [] },
      leads: { ok: true, leads: [] },
      pageviews: { ok: true, leads: [] },
      summary: { ok: true, summary: { total_visitors: 3, total_sessions: 4, total_pageviews: 5 } },
      'notification-settings': { ok: true, notification_settings: {} },
      errors: { ok: true, errors: [] },
      'passenger-care': { ok: true, feedback: [] },
      'public-settings': { ok: true, public_config: {} },
      tracking: { ok: true, events: [], sessions: [], online: [] },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responses[resource] || { ok: true }),
    });
  });

  await page.goto('/bahrain-saudi-gcc-transport/admin/');
  await page.locator('#tokenInput').fill('test-token');
  await page.locator('#loginForm').evaluate((form) => form.requestSubmit());

  await expect(page.locator('#dashboardView')).toBeVisible();
  await expect(page.locator('#statVisitors')).toHaveText('3');
  const afterInitialLoad = requestCount;
  expect(afterInitialLoad).toBeGreaterThan(1);

  // The removed control previously defaulted to a 15-second interval.
  await page.waitForTimeout(16_000);
  expect(requestCount).toBe(afterInitialLoad);

  await page.locator('#refreshBtn').click();
  await expect.poll(() => requestCount).toBeGreaterThan(afterInitialLoad);
  await expect(page.locator('#statVisitors')).toHaveText('3');

  resourcesRequested.length = 0;
  await page.locator('#filtersForm').evaluate((form) => form.requestSubmit());
  await expect.poll(() => resourcesRequested.includes('summary')).toBeTruthy();
  expect(resourcesRequested).toHaveLength(4);
  expect(resourcesRequested).toEqual(expect.arrayContaining(['leads', 'pageviews', 'summary', 'passenger-care']));
  expect(resourcesRequested).not.toEqual(expect.arrayContaining([
    'routes', 'notification-settings', 'errors', 'public-settings', 'tracking',
  ]));

  resourcesRequested.length = 0;
  await page.locator('.period-btn[data-period="7"]').click();
  await expect.poll(() => resourcesRequested.includes('tracking')).toBeTruthy();
  expect(resourcesRequested).toHaveLength(5);
  expect(resourcesRequested).toContain('summary');
});

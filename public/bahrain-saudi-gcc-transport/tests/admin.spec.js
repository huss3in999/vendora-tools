import { test, expect } from '@playwright/test';

test.describe('Admin dashboard', () => {
  test('local static preview points at the live transport admin API', async ({ page }) => {
    const apiRequests = [];
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin**', async (route) => {
      const url = new URL(route.request().url());
      apiRequests.push(`${url.pathname}${url.search}`);

      const resource = url.searchParams.get('resource') || 'leads';
      const body = resource === 'routes'
        ? { ok: true, routes: [] }
        : resource === 'summary'
          ? { ok: true, summary: {
            total_visitors: 12,
            total_sessions: 13,
            total_pageviews: 14,
            whatsapp_intents_count: 2,
            whatsapp_cancelled_count: 1,
            whatsapp_departed_count: 1,
            left_without_whatsapp: 10,
            total: 2,
          } }
          : { ok: true, leads: [] };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto('/bahrain-saudi-gcc-transport/admin/');

    const apiUrl = await page.evaluate(() => resolveAdminApiUrl());
    expect(apiUrl).toBe('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin');
    await expect(page.locator('#localPreviewNotice')).toBeVisible();

    await page.locator('#tokenInput').fill('test-token');
    await page.locator('#loginForm').evaluate((form) => form.requestSubmit());

    await expect(page.locator('#dashboardView')).toBeVisible();
    await expect(page.locator('#statVisitors')).toHaveText('12');
    await expect(page.locator('#statSessions')).toHaveText('13');
    await expect(page.locator('#statPageviews')).toHaveText('14');
    await expect(page.locator('#statIntents')).toHaveText('2');
    await expect(page.locator('#statCancelled')).toHaveText('1');
    await expect(page.locator('#statDeparted')).toHaveText('1');
    await page.evaluate(() => setTab('reports'));
    await expect(page.locator('#reportCards > div').filter({ hasText: 'Visitors' }).locator('p').first()).toHaveText('12');
    await expect(page.locator('#reportCards > div').filter({ hasText: 'Sessions' }).locator('p').first()).toHaveText('13');
    await expect(page.locator('#reportCards > div').filter({ hasText: 'WA Intents' }).locator('p').first()).toHaveText('2');
    await expect(page.locator('#reportCards > div').filter({ hasText: 'WA Cancelled' }).locator('p').first()).toHaveText('1');
    await expect(page.locator('#reportCards > div').filter({ hasText: 'WA Departed' }).locator('p').first()).toHaveText('1');
    await page.evaluate(() => setTab('pageviews'));
    await expect(page.locator('#deleteVisitsBtn')).toBeVisible();
    let deleteConfirmations = 0;
    page.once('dialog', async (dialog) => {
      deleteConfirmations += 1;
      await dialog.dismiss();
    });
    await page.locator('#deleteVisitsBtn').click();
    expect(deleteConfirmations).toBe(1);
    expect(apiRequests).toEqual(expect.arrayContaining([
      expect.stringMatching(/\/bahrain-saudi-gcc-transport\/api\/transport\/admin\?.*resource=leads/),
      '/bahrain-saudi-gcc-transport/api/transport/admin?resource=routes',
      expect.stringMatching(/\/bahrain-saudi-gcc-transport\/api\/transport\/admin\?.*resource=summary/),
    ]));
  });

  test('local file preview points at the live transport admin API', async ({ page }) => {
    const fileUrl = new URL('../admin/index.html', import.meta.url).href;
    await page.goto(fileUrl);

    const apiUrl = await page.evaluate(() => resolveAdminApiUrl());

    await expect(page).toHaveURL('https://getvendora.net/bahrain-saudi-gcc-transport/admin/');
    expect(apiUrl).toBe('/bahrain-saudi-gcc-transport/api/transport/admin');
  });

  test('retries the root admin API when the prefixed route returns 404', async ({ page }) => {
    const apiRequests = [];

    await page.route('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin**', async (route) => {
      const url = new URL(route.request().url());
      apiRequests.push(`${url.pathname}${url.search}`);
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Not found' }),
      });
    });

    await page.route('https://getvendora.net/api/transport/admin**', async (route) => {
      const url = new URL(route.request().url());
      apiRequests.push(`${url.pathname}${url.search}`);

      const resource = url.searchParams.get('resource') || 'leads';
      const body = resource === 'routes'
        ? { ok: true, routes: [] }
        : resource === 'summary'
          ? { ok: true, summary: {} }
          : { ok: true, leads: [] };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto('/bahrain-saudi-gcc-transport/admin/');
    await page.locator('#tokenInput').fill('test-token');
    await page.locator('#loginForm').evaluate((form) => form.requestSubmit());

    await expect(page.locator('#dashboardView')).toBeVisible();
    const apiUrl = await page.evaluate(() => window.__VENDORA_TRANSPORT_ADMIN_RESOLVED_API__);

    expect(apiUrl).toBe('https://getvendora.net/api/transport/admin');
    expect(apiRequests).toEqual(expect.arrayContaining([
      '/bahrain-saudi-gcc-transport/api/transport/admin?resource=routes',
      '/api/transport/admin?resource=routes',
      expect.stringMatching(/\/api\/transport\/admin\?.*resource=leads/),
      expect.stringMatching(/\/api\/transport\/admin\?.*resource=summary/),
    ]));
  });
});

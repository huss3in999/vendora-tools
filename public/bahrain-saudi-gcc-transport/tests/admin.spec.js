import { test, expect } from '@playwright/test';

test.describe('Admin dashboard', () => {
  test('local static preview points at the live transport admin API', async ({ page }) => {
    const apiRequests = [];

    await page.route('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin**', async (route) => {
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

    const apiUrl = await page.evaluate(() => window.__VENDORA_TRANSPORT_ADMIN_RESOLVED_API__);
    expect(apiUrl).toBe('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin');
    await expect(page.locator('#localPreviewNotice')).toBeVisible();

    await page.locator('#tokenInput').fill('test-token');
    await page.locator('#loginForm').evaluate((form) => form.requestSubmit());

    await expect(page.locator('#dashboardView')).toBeVisible();
    expect(apiRequests).toEqual(expect.arrayContaining([
      expect.stringContaining('/bahrain-saudi-gcc-transport/api/transport/admin?resource=leads'),
      '/bahrain-saudi-gcc-transport/api/transport/admin?resource=routes',
      '/bahrain-saudi-gcc-transport/api/transport/admin?resource=summary',
    ]));
  });

  test('local file preview points at the live transport admin API', async ({ page }) => {
    const fileUrl = new URL('../admin/index.html', import.meta.url).href;
    await page.goto(fileUrl);

    const apiUrl = await page.evaluate(() => window.__VENDORA_TRANSPORT_ADMIN_RESOLVED_API__);

    expect(apiUrl).toBe('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin');
    await expect(page.locator('#localPreviewNotice')).toBeVisible();
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
      expect.stringContaining('/bahrain-saudi-gcc-transport/api/transport/admin?resource=leads'),
      expect.stringContaining('/api/transport/admin?resource=leads'),
      '/api/transport/admin?resource=routes',
      '/api/transport/admin?resource=summary',
    ]));
  });
});

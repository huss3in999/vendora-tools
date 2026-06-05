import { test, expect } from '@playwright/test';

test.describe('Passenger Care pages', () => {
  test('Arabic care page is noindex and loads', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/care/?ref=GCC-00000000', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
    await expect(page.locator('h1')).toContainText('رعاية المسافر');
  });

  test('English care page is noindex and loads', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/care/en/?ref=GCC-00000000', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
    await expect(page.locator('h1')).toContainText('Passenger Care');
  });

  test('Invalid booking ref shows error state', async ({ page }) => {
    await page.route('**/api/transport/passenger-care?*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Booking reference not found' }),
      });
    });
    await page.goto('/bahrain-saudi-gcc-transport/care/en/?ref=GCC-DEADBEEF', { waitUntil: 'networkidle' });
    await expect(page.locator('#errorView')).toBeVisible();
  });
});

test.describe('WhatsApp passenger care append', () => {
  test('Arabic homepage appends booking ref block when lead API returns ref', async ({ page }) => {
    let openedUrl = '';
    await page.addInitScript(() => {
      window.__openedWa = '';
      window.location.assign = (url) => { window.__openedWa = url; };
    });

    await page.route('**/api/transport/event', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, leadId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde', booking_ref: 'GCC-A1B2C3D4' }),
      });
    });
    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));

    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'domcontentloaded' });
    const cta = page.locator('a[data-wa-message]').first();
    await cta.click();

    openedUrl = await page.evaluate(() => window.__openedWa || '');
    expect(openedUrl).toContain('GCC-A1B2C3D4');
    expect(decodeURIComponent(openedUrl)).toMatch(/رقم الحجز|رعاية المسافر/);
    expect(decodeURIComponent(openedUrl)).toContain('/care/?ref=GCC-A1B2C3D4');
    expect(decodeURIComponent(openedUrl)).toContain('g.getvendora.net/gcc-a1b2c3d4');
  });

  test('Arabic airport page intercepts data-wa-message before href is required', async ({ page }) => {
    await page.addInitScript(() => {
      window.__openedWa = '';
      window.location.assign = (url) => { window.__openedWa = url; };
    });

    await page.route('**/api/transport/event', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, leadId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde', booking_ref: 'GCC-A1B2C3D4' }),
      });
    });

    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-airport-transfer/', { waitUntil: 'domcontentloaded' });
    await page.locator('a[data-wa-message]').first().click();
    await page.waitForFunction(() => Boolean(window.__openedWa));

    const openedUrl = await page.evaluate(() => window.__openedWa || '');
    expect(openedUrl).toContain('GCC-A1B2C3D4');
    expect(decodeURIComponent(openedUrl)).toMatch(/مطار البحرين|رعاية المسافر/);
  });

  test('English page appends English care block on hardcoded wa.me link', async ({ page }) => {
    await page.addInitScript(() => {
      window.__openedWa = '';
      window.location.assign = (url) => { window.__openedWa = url; };
    });

    await page.route('**/api/transport/event', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, leadId: 'b2c3d4e5-f6a7-4890-b123-456789abcdef', booking_ref: 'GCC-B2C3D4E5' }),
      });
    });

    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));

    await page.goto('/bahrain-saudi-gcc-transport/en/', { waitUntil: 'domcontentloaded' });
    await page.locator('a[href*="wa.me"]').first().click();
    await page.waitForFunction(() => Boolean(window.__openedWa));

    const openedUrl = await page.evaluate(() => window.__openedWa || '');
    const decoded = decodeURIComponent(openedUrl);
    expect(decoded).toContain('Booking Ref: GCC-B2C3D4E5');
    expect(decoded).toContain('Passenger Care:');
    expect(decoded).toContain('/care/en/?ref=GCC-B2C3D4E5');
    expect(decoded).toContain('g.getvendora.net/gcc-en-b2c3d4e5');
  });

  test('Still opens WhatsApp with care block when lead API fails', async ({ page }) => {
    await page.addInitScript(() => {
      window.__openedWa = '';
      window.location.assign = (url) => { window.__openedWa = url; };
    });

    await page.route('**/api/transport/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.continue();
    });

    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-airport-transfer/', { waitUntil: 'domcontentloaded' });
    await page.locator('a[data-wa-message]').first().click();
    await page.waitForFunction(() => Boolean(window.__openedWa));

    const openedUrl = await page.evaluate(() => window.__openedWa || '');
    expect(openedUrl).toContain('wa.me/');
    expect(decodeURIComponent(openedUrl)).toMatch(/GCC-[A-F0-9]{8}/);
    expect(decodeURIComponent(openedUrl)).toMatch(/رعاية المسافر/);
  });
});

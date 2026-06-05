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
      window.open = (url) => { window.__openedWa = url; };
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
  });
});

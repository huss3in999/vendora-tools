import { test, expect } from '@playwright/test';

const NEW_PAGES = [
  'airport-transfer',
  'bahrain-airport-transfer',
  'bahrain-to-dammam-airport',
  'dammam-airport-to-bahrain',
  'bahrain-to-hamad-airport',
  'hamad-airport-to-bahrain',
  'bahrain-to-kuwait-airport',
  'kuwait-airport-to-bahrain',
  'qatar-to-bahrain',
  'kuwait-to-bahrain',
  'dubai-to-bahrain',
  'oman-to-bahrain',
];

test.describe('New GCC transport page tracking', () => {
  for (const slug of NEW_PAGES) {
    test(`${slug}: WhatsApp lead and GA tracking are wired`, async ({ page }) => {
      const consoleErrors = [];
      const leadRequests = [];

      await page.addInitScript(() => {
        window.__gtagCalls = [];
        window.gtag = (...args) => window.__gtagCalls.push(args);
      });

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ status: 204, body: '' }));
      await page.route('https://www.clarity.ms/**', (route) => route.fulfill({ status: 204, body: '' }));
      await page.route('https://static.cloudflareinsights.com/**', (route) => route.fulfill({ status: 204, body: '' }));
      await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));
      await page.route('**/bahrain-saudi-gcc-transport/api/transport/whatsapp-lead', async (route) => {
        leadRequests.push(route.request().postDataJSON());
        await route.fulfill({ status: 204, body: '' });
      });

      await page.goto(`/bahrain-saudi-gcc-transport/${slug}/`, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('script[src$="site.js"]')).toHaveCount(1);
      await expect(page.locator('script[src*="analytics-loader.js"]')).toHaveCount(1);
      await expect(page.locator('a[data-wa-message], a[data-booking-submit]')).not.toHaveCount(0);

      const loaderCount = await page.locator('script[src*="analytics-loader.js"]').count();
      expect(loaderCount, `${slug} should not duplicate GA loader`).toBe(1);

      const firstCta = page.locator('a[data-wa-message], a[data-booking-submit]').first();
      await expect(firstCta).toHaveAttribute('href', /https:\/\/wa\.me\/97333225954/);

      await firstCta.dispatchEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 10,
      });

      await expect.poll(() => leadRequests.length, { message: `${slug} lead request` }).toBeGreaterThan(0);
      expect(leadRequests[0].routeSlug).toBe(slug);

      const gtagCalls = await page.evaluate(() => window.__gtagCalls || []);
      expect(gtagCalls.some((call) => call[0] === 'config' && call[1] === 'G-DFY197R2MS')).toBeTruthy();
      expect(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'transport_whatsapp_click')).toBeTruthy();

      expect(consoleErrors).toEqual([]);
    });
  }
});

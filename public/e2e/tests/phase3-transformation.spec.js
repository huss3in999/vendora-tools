const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

test.describe('Phase 3 Transformation Verification Suite', () => {

  test('Root Homepage loads as Vendora Transport homepage', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveTitle(/Vendora Transport/i);
    await expect(page.locator('h1')).toContainText(/Private Car with Driver/i);
    await expect(page.body()).toContainText('Office 240, Second Floor, The Address Tower, Seef');
    await expect(page.body()).toContainText('+973 3322 5954');
  });

  test('Root About Page loads corporate profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/about/`);
    await expect(page).toHaveTitle(/About Vendora Transport/i);
    await expect(page.body()).toContainText('Vendora Transport');
  });

  test('Root Contact Page displays Seef office and Google Maps link', async ({ page }) => {
    await page.goto(`${BASE_URL}/contact/`);
    await expect(page).toHaveTitle(/Contact & Office Location/i);
    const mapsLink = page.locator('a[href*="maps.app.goo.gl"]');
    await expect(mapsLink).toBeVisible();
    await expect(mapsLink).toHaveAttribute('href', 'https://maps.app.goo.gl/XgirVcNRYSqJb1N26?g_st=ac');
  });

  test('Root Privacy Policy page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy-policy/`);
    await expect(page).toHaveTitle(/Privacy Policy | Vendora Transport/i);
  });

  test('Dedicated policy pages exist and return HTTP 200', async ({ page }) => {
    const policies = [
      '/bahrain-saudi-gcc-transport/booking-terms/',
      '/bahrain-saudi-gcc-transport/booking-policy/',
      '/bahrain-saudi-gcc-transport/cancellation-policy/',
      '/bahrain-saudi-gcc-transport/payment-policy/',
      '/bahrain-saudi-gcc-transport/passenger-safety/',
      '/bahrain-saudi-gcc-transport/support-policy/',
      '/bahrain-saudi-gcc-transport/privacy/',
      '/bahrain-saudi-gcc-transport/en/booking-terms/',
      '/bahrain-saudi-gcc-transport/en/booking-policy/',
      '/bahrain-saudi-gcc-transport/en/cancellation-policy/',
      '/bahrain-saudi-gcc-transport/en/payment-policy/',
      '/bahrain-saudi-gcc-transport/en/passenger-safety/',
      '/bahrain-saudi-gcc-transport/en/support-policy/',
      '/bahrain-saudi-gcc-transport/en/privacy/'
    ];

    for (const path of policies) {
      const response = await page.goto(`${BASE_URL}${path}`);
      expect(response.status()).toBe(200);
    }
  });

  test('Transport hub pages return HTTP 200', async ({ page }) => {
    const transportPaths = [
      '/bahrain-saudi-gcc-transport/',
      '/bahrain-saudi-gcc-transport/en/',
      '/bahrain-saudi-gcc-transport/bahrain-to-saudi/',
      '/bahrain-saudi-gcc-transport/en/bahrain-to-saudi/',
      '/bahrain-saudi-gcc-transport/bahrain-to-kuwait/',
      '/bahrain-saudi-gcc-transport/en/bahrain-to-kuwait/',
      '/bahrain-saudi-gcc-transport/bahrain-to-qatar/',
      '/bahrain-saudi-gcc-transport/en/bahrain-to-qatar/'
    ];

    for (const path of transportPaths) {
      const response = await page.goto(`${BASE_URL}${path}`);
      expect(response.status()).toBe(200);
    }
  });

  test('AI discovery files return HTTP 200 and contain Vendora Transport', async ({ request }) => {
    const files = ['/llms.txt', '/.well-known/llms.txt', '/ai-index.json', '/bahrain-saudi-gcc-transport/llms.txt'];
    for (const file of files) {
      const response = await request.get(`${BASE_URL}${file}`);
      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('Vendora Transport');
    }
  });

});

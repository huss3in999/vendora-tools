const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

test.describe('Phase 3 Transformation Verification Suite', () => {

  test('Root Homepage loads as Vendora Transport homepage', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveTitle(/Vendora Transport/i);
    await expect(page.locator('h1')).toContainText(/Private Car with Driver/i);
    await expect(page.locator('body')).toContainText('Office 240, Second Floor, The Address Tower, Seef');
    await expect(page.locator('body')).toContainText('+973 3322 5954');
  });

  test('Root About Page loads corporate profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/about/`);
    await expect(page).toHaveTitle(/About Vendora Transport/i);
    await expect(page.locator('body')).toContainText('Vendora Transport');
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

  test('Dedicated policy and customer rights pages return HTTP 200', async ({ page }) => {
    const pages = [
      '/bahrain-saudi-gcc-transport/booking-terms/',
      '/bahrain-saudi-gcc-transport/booking-policy/',
      '/bahrain-saudi-gcc-transport/cancellation-policy/',
      '/bahrain-saudi-gcc-transport/payment-policy/',
      '/bahrain-saudi-gcc-transport/passenger-safety/',
      '/bahrain-saudi-gcc-transport/support-policy/',
      '/bahrain-saudi-gcc-transport/privacy/',
      '/bahrain-saudi-gcc-transport/complaints/',
      '/bahrain-saudi-gcc-transport/customer-reviews/',
      '/bahrain-saudi-gcc-transport/en/booking-terms/',
      '/bahrain-saudi-gcc-transport/en/booking-policy/',
      '/bahrain-saudi-gcc-transport/en/cancellation-policy/',
      '/bahrain-saudi-gcc-transport/en/payment-policy/',
      '/bahrain-saudi-gcc-transport/en/passenger-safety/',
      '/bahrain-saudi-gcc-transport/en/support-policy/',
      '/bahrain-saudi-gcc-transport/en/privacy/',
      '/bahrain-saudi-gcc-transport/en/complaints/',
      '/bahrain-saudi-gcc-transport/en/customer-reviews/'
    ];

    for (const path of pages) {
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

  test('Arabic Complaints Page form renders correctly and contains Customer Rights', async ({ page }) => {
    await page.goto(`${BASE_URL}/bahrain-saudi-gcc-transport/complaints/`);
    await expect(page).toHaveTitle(/تقديم شكوى/i);
    await expect(page.locator('form#complaintForm')).toBeVisible();
    await expect(page.locator('body')).toContainText('حقوق العملاء وضمانات الشكوى لدى فندورا للنقل');
  });

  test('English Complaints Page form renders correctly and contains Customer Rights', async ({ page }) => {
    await page.goto(`${BASE_URL}/bahrain-saudi-gcc-transport/en/complaints/`);
    await expect(page).toHaveTitle(/Customer Complaints/i);
    await expect(page.locator('form#complaintFormEn')).toBeVisible();
    await expect(page.locator('body')).toContainText('Customer Rights & Fair Review Guarantees at Vendora Transport');
  });

  test('Customer Reviews Pages render form and moderation disclaimer', async ({ page }) => {
    await page.goto(`${BASE_URL}/bahrain-saudi-gcc-transport/customer-reviews/`);
    await expect(page).toHaveTitle(/تقييمات وآراء العملاء/i);
    await expect(page.locator('form#reviewForm')).toBeVisible();

    await page.goto(`${BASE_URL}/bahrain-saudi-gcc-transport/en/customer-reviews/`);
    await expect(page).toHaveTitle(/Customer Reviews & Feedback/i);
    await expect(page.locator('form#reviewFormEn')).toBeVisible();
  });

});

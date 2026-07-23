import { test, expect } from '@playwright/test';

const routes = ['saudi-to-qatar','qatar-to-saudi','saudi-to-uae','uae-to-saudi','uae-to-bahrain','bahrain-to-uae','qatar-to-uae','uae-to-qatar','kuwait-to-bahrain','oman-to-bahrain'];
const hubs = ['transport-from-saudi','transport-from-qatar','transport-from-uae','gcc-destinations','transport-from-kuwait','transport-from-oman'];

for (const lang of ['', 'en/']) {
  for (const slug of [...routes, ...hubs]) {
    test(`${lang || 'ar/'}${slug} returns 200 without overflow`, async ({ page }) => {
      const response = await page.goto(`/bahrain-saudi-gcc-transport/${lang}${slug}/`);
      expect(response?.status()).toBe(200);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
      await page.setViewportSize({ width: 1440, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
    });
  }
}

test('English batch pages have no visible Arabic', async ({ page }) => {
  for (const slug of routes) {
    await page.goto(`/bahrain-saudi-gcc-transport/en/${slug}/`);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/[\u0600-\u06ff]/);
  }
});

test('Arabic navigation has no English leakage', async ({ page }) => {
  for (const slug of routes) {
    await page.goto(`/bahrain-saudi-gcc-transport/${slug}/`);
    const text = await page.locator('.nav-menu').innerText();
    expect(text).not.toMatch(/\b(?:Home|Passenger|Contact|Routes)\b/i);
  }
});

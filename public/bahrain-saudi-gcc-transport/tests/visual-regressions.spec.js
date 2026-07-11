import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const suspicious = /Ãƒ|Ã‚|Ã˜|Ã™|Ã¢â‚¬|Ã°Å¸|ï¿½|\uFFFD/;
const token = 'a'.repeat(48);

function sitemapPaths(file) {
  const xml = readFileSync(join(root, file), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

const PUBLIC_PATHS = [...new Set([
  ...sitemapPaths('sitemap-gcc-transport.xml'),
  ...sitemapPaths('sitemap-gcc-transport-en.xml'),
])];

test('shared customer-facing JavaScript contains no mojibake literals', () => {
  for (const file of ['site.js', 'care/care.js']) {
    expect(suspicious.test(readFileSync(join(root, file), 'utf8')), file).toBeFalsy();
  }
  expect(suspicious.test(readFileSync(join(root, '../worker.js'), 'utf8')), 'worker.js').toBeFalsy();
});

test('all sitemap pages preserve UTF-8, direction, readable text and viewport width', async ({ page }) => {
  test.setTimeout(240_000);
  for (const path of PUBLIC_PATHS) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), path).toBeTruthy();
    const isEnglish = path.includes('/en/');
    await expect(page.locator('html')).toHaveAttribute('lang', isEnglish ? /^en/ : /^ar/);
    await expect(page.locator('html')).toHaveAttribute('dir', isEnglish ? 'ltr' : 'rtl');
    await expect(page.locator('meta[charset]')).toHaveAttribute('charset', /utf-8/i);
    await expect(page.locator('script[src*="analytics-loader.js"]'), `analytics loader on ${path}`).toHaveCount(1);
    const visible = await page.locator('body').innerText();
    expect(suspicious.test(visible), `visible mojibake on ${path}`).toBeFalsy();
    const metadata = await page.locator('title, meta[name="description"], meta[property^="og:"]').evaluateAll((nodes) =>
      nodes.map((node) => node.textContent || node.getAttribute('content') || '').join(' '),
    );
    expect(suspicious.test(metadata), `metadata mojibake on ${path}`).toBeFalsy();
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    jsonLd.filter((value) => value.trim()).forEach((value) => expect(() => JSON.parse(value)).not.toThrow());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `overflow on ${path}`).toBeTruthy();
    const phones = page.locator('.phone-number');
    for (let index = 0; index < await phones.count(); index += 1) {
      await expect(phones.nth(index)).toHaveAttribute('dir', 'ltr');
      expect((await phones.nth(index).innerText()).trim()).toMatch(/^\+973 \d{4} \d{4}$/);
    }
    const hrefs = await page.locator('a[href^="https://wa.me/"], a[href^="tel:"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    hrefs.forEach((href) => {
      if (href.startsWith('https://wa.me/')) expect(href).toMatch(/^https:\/\/wa\.me\/97333225954(?:\?|$)/);
      if (href.startsWith('tel:')) expect(href).toBe('tel:+97333225954');
    });
  }
});

for (const scenario of [
  { lang: 'ar', path: '/', width: 1366, height: 900 },
  { lang: 'ar', path: '/', width: 320, height: 760 },
  { lang: 'ar', path: '/', width: 390, height: 844 },
  { lang: 'en', path: '/en/bahrain-to-riyadh/', width: 1366, height: 900 },
  { lang: 'en', path: '/en/bahrain-to-riyadh/', width: 320, height: 760 },
  { lang: 'en', path: '/en/bahrain-to-riyadh/', width: 390, height: 844 },
]) {
  test(`${scenario.lang} prepared-request dialog is readable at ${scenario.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.route('**/api/transport/event', (route) => route.fulfill({
      status: 201,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, leadId: 1, booking_ref: 'GCC-A1B2C3D4', care_token: token }),
    }));
    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(`/bahrain-saudi-gcc-transport${scenario.path}`, { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('[data-booking-submit], [data-wa-message], [data-track-wa], .wa-inline').first();
    await trigger.dispatchEvent('click', { bubbles: true, cancelable: true });
    const dialog = page.locator('#vendora-booking-ready');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#vendora-booking-title')).toHaveText(scenario.lang === 'ar' ? 'تم تجهيز طلبك' : 'Your request is ready');
    await expect(dialog).toContainText(scenario.lang === 'ar'
      ? 'تم إنشاء مرجع لطلبك. تابع إلى واتساب لتأكيد التوفر والسعر النهائي.'
      : 'Your request reference has been created. Continue to WhatsApp to confirm availability and the final price.');
    await expect(dialog).toContainText('GCC-A1B2C3D4');
    const continueButton = dialog.locator('[data-booking-continue]');
    await expect(continueButton).toHaveText(scenario.lang === 'ar' ? 'المتابعة إلى واتساب' : 'Continue to WhatsApp');
    await expect(continueButton).toBeFocused();
    expect(suspicious.test(await dialog.innerText())).toBeFalsy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
}

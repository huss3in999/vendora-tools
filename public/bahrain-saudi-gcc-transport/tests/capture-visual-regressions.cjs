const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const out = path.resolve(__dirname, '../test-results/visual-regression-screenshots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const base = 'http://127.0.0.1:8799/bahrain-saudi-gcc-transport';
  const token = 'a'.repeat(48);

  async function prepare(page, url) {
    await page.route('**/api/transport/event', (route) => route.fulfill({
      status: 201,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, leadId: 1, booking_ref: 'GCC-A1B2C3D4', care_token: token }),
    }));
    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204, body: '' }));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-booking-submit], [data-wa-message], [data-track-wa], .wa-inline').first()
      .dispatchEvent('click', { bubbles: true, cancelable: true });
    await page.locator('#vendora-booking-ready').waitFor({ state: 'visible' });
  }

  for (const item of [
    ['arabic-dialog-desktop.png', 1366, 900, `${base}/`],
    ['arabic-dialog-mobile.png', 390, 844, `${base}/`],
    ['english-dialog-desktop.png', 1366, 900, `${base}/en/bahrain-to-riyadh/`],
    ['english-dialog-mobile.png', 390, 844, `${base}/en/bahrain-to-riyadh/`],
  ]) {
    const page = await browser.newPage({ viewport: { width: item[1], height: item[2] } });
    await prepare(page, item[3]);
    await page.screenshot({ path: path.join(out, item[0]), fullPage: true });
    await page.close();
  }

  for (const item of [
    ['arabic-contact-number.png', 390, 844, `${base}/contact/`],
    ['english-contact-number.png', 390, 844, `${base}/en/contact/`],
  ]) {
    const page = await browser.newPage({ viewport: { width: item[1], height: item[2] } });
    await page.goto(item[3], { waitUntil: 'domcontentloaded' });
    await page.locator('.public-contact-section').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, item[0]), fullPage: true });
    await page.close();
  }

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

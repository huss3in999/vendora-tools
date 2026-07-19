const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const out = path.resolve(__dirname, '../test-results/concept-a-redesign');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const base = 'http://127.0.0.1:4173/bahrain-saudi-gcc-transport';
  const scenarios = [
    { name: '01-ar-home-mobile.png', width: 390, height: 844, url: `${base}/` },
    { name: '02-en-home-mobile.png', width: 390, height: 844, url: `${base}/en/` },
    { name: '03-mobile-drawer.png', width: 390, height: 844, url: `${base}/`, drawer: true },
    { name: '04-mobile-prices.png', width: 390, height: 844, url: `${base}/prices/` },
    { name: '05-mobile-planner.png', width: 390, height: 844, url: `${base}/gcc-transport-planner/` },
    { name: '06-mobile-route.png', width: 390, height: 844, url: `${base}/bahrain-to-riyadh/` },
    { name: '07-mobile-long-guide.png', width: 390, height: 844, url: `${base}/king-fahd-causeway-guide/` },
    { name: '08-ar-home-desktop.png', width: 1440, height: 900, url: `${base}/` },
    { name: '09-en-home-desktop.png', width: 1440, height: 900, url: `${base}/en/` },
  ];

  const audit = [];
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height } });
    const errors = [];
    await page.route('**/api/transport/public-settings', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ settings: {}, routes: [] }),
    }));
    await page.route('**/api/transport/route-reviews**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true, review_count: 0, reviews: [] }),
    }));
    await page.route('**/api/transport/**', (route) => route.fulfill({
      status: 201,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true }),
    }));
    await page.route('**/api/track', (route) => route.fulfill({ status: 204, body: '' }));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url || 'inline'}`);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(scenario.url, { waitUntil: 'networkidle' });
    await page.locator('body.vip-transport').waitFor();
    await page.evaluate(() => document.fonts?.ready);
    if (scenario.drawer) {
      await page.locator('.vip-menu-toggle').click();
      await page.locator('#vendora-vip-drawer').waitFor({ state: 'visible' });
    }
    await page.screenshot({ path: path.join(out, scenario.name), fullPage: false });
    audit.push({
      name: scenario.name,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      lang: await page.locator('html').getAttribute('lang'),
      visibleArabicOnEnglish: (await page.locator('body').innerText()).match(/[\u0600-\u06ff]/g)?.length || 0,
      errors,
    });
    await page.close();
  }

  const guide = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await guide.route('**/api/**', (route) => route.fulfill({ status: 204, body: '' }));
  await guide.goto(`${base}/king-fahd-causeway-guide/`, { waitUntil: 'networkidle' });
  await guide.screenshot({ path: path.join(out, '10-mobile-long-guide-full.png'), fullPage: true });
  await guide.close();

  const continuation = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await continuation.route('**/api/**', (route) => route.fulfill({ status: 204, body: '' }));
  await continuation.goto(`${base}/`, { waitUntil: 'networkidle' });
  await continuation.locator('.vip-featured-route').scrollIntoViewIfNeeded();
  await continuation.waitForFunction(() => {
    const image = document.querySelector('.vip-featured-card > img');
    return image?.complete && image.naturalWidth > 0;
  });
  await continuation.screenshot({ path: path.join(out, '11-ar-home-conversion-flow.png'), fullPage: false });
  await continuation.close();
  fs.writeFileSync(path.join(out, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

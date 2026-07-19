import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'test-results', 'professional-tools');
const base = 'http://127.0.0.1:8787/bahrain-saudi-gcc-transport';

const scenarios = [
  { name: '01-ar-home-390x844.png', width: 390, height: 844, path: '/' },
  { name: '02-en-home-390x844.png', width: 390, height: 844, path: '/en/' },
  { name: '03-ar-calculator-price-390x844.png', width: 390, height: 844, path: '/gcc-transport-planner/' },
  { name: '04-en-calculator-process-390x844.png', width: 390, height: 844, path: '/en/gcc-transport-planner/', mode: 'process' },
  { name: '05-en-calculator-airport-390x844.png', width: 390, height: 844, path: '/en/gcc-transport-planner/', mode: 'airport' },
  { name: '06-ar-drawer-390x844.png', width: 390, height: 844, path: '/', drawer: true },
  { name: '07-en-route-390x844.png', width: 390, height: 844, path: '/en/bahrain-to-riyadh/' },
  { name: '08-ar-home-320x568.png', width: 320, height: 568, path: '/' },
  { name: '09-en-calculator-320x568.png', width: 320, height: 568, path: '/en/gcc-transport-planner/' },
  { name: '10-ar-calculator-768x1024.png', width: 768, height: 1024, path: '/gcc-transport-planner/' },
  { name: '11-ar-home-1440x900.png', width: 1440, height: 900, path: '/' },
  { name: '12-en-home-1440x900.png', width: 1440, height: 900, path: '/en/' },
  { name: '13-ar-calculator-1440x900.png', width: 1440, height: 900, path: '/gcc-transport-planner/' },
  { name: '14-en-calculator-1440x900.png', width: 1440, height: 900, path: '/en/gcc-transport-planner/' }
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const audit = [];

for (const scenario of scenarios) {
  const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (request.resourceType() !== 'fetch') errors.push(`request: ${request.url()} — ${request.failure()?.errorText || 'failed'}`);
  });
  await page.goto(`${base}${scenario.path}`, { waitUntil: 'domcontentloaded' });
  await page.locator('body.vip-transport').waitFor();
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts?.ready);
  if (scenario.mode) await page.locator(`button[data-calculator-mode="${scenario.mode}"]`).click();
  if (scenario.drawer) {
    await page.locator('.vip-menu-toggle').click();
    await page.locator('#vendora-vip-drawer').waitFor({ state: 'visible' });
  }
  const layout = await page.evaluate(() => {
    const nav = document.querySelector('.vip-bottom-nav');
    const navRect = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      bottomNavigationTop: navRect?.top ?? null,
      bodyPaddingBottom: parseFloat(getComputedStyle(document.body).paddingBottom),
      floatingWhatsAppVisible: Boolean(document.querySelector('.floating-wa') && getComputedStyle(document.querySelector('.floating-wa')).display !== 'none')
    };
  });
  await page.screenshot({ path: join(output, scenario.name), fullPage: false });
  const visibleImages = page.locator('img:visible');
  for (let index = 0; index < await visibleImages.count(); index += 1) {
    const image = visibleImages.nth(index);
    const box = await image.boundingBox();
    if (!box || box.width <= 0 || box.height <= 0) continue;
    await image.scrollIntoViewIfNeeded();
    await expectImage(image);
  }
  const imageAudit = await visibleImages.evaluateAll((images) => images
    .filter((image) => image.getBoundingClientRect().width > 0 && image.getBoundingClientRect().height > 0)
    .map((image) => ({
      src: image.currentSrc || image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight
    })));
  audit.push({ scenario: scenario.name, url: page.url(), lang: await page.locator('html').getAttribute('lang'), layout, images: imageAudit, errors });
  await page.close();
}

async function expectImage(image) {
  await image.evaluate(async (node) => {
    if (!node.complete || node.naturalWidth <= 0) {
      try { await node.decode(); } catch { /* captured by the audit below */ }
    }
  });
}

await browser.close();
await writeFile(join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`);

const failures = audit.flatMap((entry) => [
  ...(entry.layout.overflow ? [`${entry.scenario}: horizontal overflow`] : []),
  ...(entry.layout.floatingWhatsAppVisible && entry.layout.bottomNavigationTop != null ? [`${entry.scenario}: duplicate floating WhatsApp`] : []),
  ...entry.images.filter((image) => !image.complete || image.naturalWidth <= 0).map((image) => `${entry.scenario}: broken image ${image.src}`),
  ...entry.errors.map((error) => `${entry.scenario}: ${error}`)
]);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Captured and audited ${audit.length} screenshots in ${output}`);
}

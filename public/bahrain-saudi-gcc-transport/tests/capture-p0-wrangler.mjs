import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const origin = String(process.env.VENDORA_WRANGLER_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const prefix = '/bahrain-saudi-gcc-transport';
const output = join(process.cwd(), 'test-results', 'p0-real-wrangler');
const scenarios = [
  ['01-ar-airport-305x520.png', `${prefix}/airport-pickup-planner/`, 305, 520],
  ['02-en-airport-320x568.png', `${prefix}/en/airport-pickup-planner/`, 320, 568],
  ['03-ar-calculator-320x568.png', `${prefix}/gcc-transport-planner/`, 320, 568],
  ['04-ar-home-390x844.png', `${prefix}/`, 390, 844],
  ['05-en-home-390x844.png', `${prefix}/en/`, 390, 844],
  ['06-ar-route-768x1024.png', `${prefix}/bahrain-to-khobar/`, 768, 1024],
  ['07-en-guide-768x1024.png', `${prefix}/en/arbaeen-karbala-travel-tips/`, 768, 1024],
  ['08-ar-home-1440x900.png', `${prefix}/`, 1440, 900],
  ['09-en-home-1440x900.png', `${prefix}/en/`, 1440, 900],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const audits = [];

for (const [name, path, width, height] of scenarios) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).origin === origin) errors.push(`request: ${request.url()} ${request.failure()?.errorText || ''}`);
  });
  const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach((image) => image.loading = 'eager');
    await Promise.all(images.map((image) => image.complete ? null : new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
    document.fonts?.ready && await document.fonts.ready;
  });
  const pageAudit = await page.evaluate(() => {
    const visible = (element) => element && getComputedStyle(element).display !== 'none';
    const boxes = [...document.querySelectorAll('.topbar .brand, .topbar .lang-toggle, .topbar .vip-menu-toggle')]
      .filter(visible)
      .map((element) => ({ selector: element.className, ...element.getBoundingClientRect().toJSON() }));
    const collisions = [];
    for (let left = 0; left < boxes.length; left += 1) {
      for (let right = left + 1; right < boxes.length; right += 1) {
        const a = boxes[left]; const b = boxes[right];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) collisions.push([a.selector, b.selector]);
      }
    }
    return {
      lang: document.documentElement.lang,
      overflow: document.documentElement.scrollWidth > innerWidth,
      bottomReserve: Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
      bottomNavHeight: document.querySelector('.vip-bottom-nav')?.getBoundingClientRect().height || 0,
      collisions,
      images: [...document.images].map((image) => ({ src: image.currentSrc || image.src, complete: image.complete, naturalWidth: image.naturalWidth })),
    };
  });
  audits.push({ name, path, width, height, status: response?.status(), errors, ...pageAudit });
  await page.screenshot({ path: join(output, name), fullPage: false });
  await page.close();
}

await browser.close();
await writeFile(join(output, 'audit.json'), JSON.stringify(audits, null, 2));
const failed = audits.filter((item) => item.status !== 200 || item.errors.length || item.overflow || item.collisions.length || item.images.some((image) => !image.complete || image.naturalWidth <= 0));
if (failed.length) {
  console.error(JSON.stringify(failed, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Captured and audited ${audits.length} real-Wrangler screenshots in ${output}`);
}

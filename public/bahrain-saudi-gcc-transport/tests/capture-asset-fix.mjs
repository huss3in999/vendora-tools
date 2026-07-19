import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'test-results', 'asset-url-fix');
const origin = String(process.env.VIP_PREVIEW_BASE || 'http://localhost:8787').replace(/\/$/, '');
const base = `${origin}/bahrain-saudi-gcc-transport`;
const forbidden = /\.(?:webp|png|jpe?g|svg|css|js|json|xml|ico|webmanifest)\/index\.html(?:[?#]|$)/i;
const targets = [
  ['ar-home', '/'],
  ['en-home', '/en/'],
  ['ar-prices', '/prices/'],
  ['ar-planner', '/gcc-transport-planner/'],
  ['ar-route', '/bahrain-to-riyadh/'],
  ['ar-guide', '/king-fahd-causeway-guide/'],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const [name, path] of targets) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedLocalAssets = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.startsWith(origin) && /\.(?:webp|png|jpe?g|svg|css|js|json|xml|ico|webmanifest)(?:[?#]|$)/i.test(url)) {
      failedLocalAssets.push(`${url}: ${request.failure()?.errorText || 'request failed'}`);
    }
  });

  const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  await page.locator('body.vip-transport').waitFor();
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    })
    .every((image) => image.complete), null, { timeout: 8000 }).catch(() => {});

  const audit = await page.evaluate(() => {
    const urls = [];
    document.querySelectorAll('img').forEach((image) => urls.push(image.currentSrc || image.src));
    document.querySelectorAll('source[srcset], img[srcset]').forEach((node) => {
      (node.getAttribute('srcset') || '').split(',').forEach((item) => urls.push(item.trim().split(/\s+/)[0] || ''));
    });
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => urls.push(link.href));
    document.querySelectorAll('*').forEach((node) => {
      const background = getComputedStyle(node).backgroundImage;
      for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.push(match[1]);
    });
    const visibleImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    }).map((image) => ({
      src: image.currentSrc || image.src,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      complete: image.complete,
    }));
    return {
      urls,
      visibleImages,
      bottomNavigationVisible: Boolean(document.querySelector('.vip-bottom-nav')),
    };
  });

  const corrupted = audit.urls.filter((url) => forbidden.test(url));
  const brokenVisibleImages = audit.visibleImages.filter((image) => !image.complete || image.naturalWidth <= 0);
  const entry = {
    name,
    url: `${base}${path}`,
    status: response?.status() || 0,
    ...audit,
    corrupted,
    brokenVisibleImages,
    failedLocalAssets,
    consoleErrors,
    pageErrors,
  };
  report.push(entry);
  await page.screenshot({ path: join(output, `${name}-390x844.png`), fullPage: false });
  await page.close();
}

await browser.close();
await writeFile(join(output, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const failures = report.filter((entry) => entry.status !== 200
  || entry.corrupted.length
  || entry.brokenVisibleImages.length
  || entry.failedLocalAssets.length
  || entry.consoleErrors.length
  || entry.pageErrors.length);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report.map((entry) => ({
    name: entry.name,
    status: entry.status,
    visibleImages: entry.visibleImages.length,
    bottomNavigationVisible: entry.bottomNavigationVisible,
  })), null, 2));
}

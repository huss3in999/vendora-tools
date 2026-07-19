import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const base = '/bahrain-saudi-gcc-transport';
const previewBase = String(process.env.VIP_PREVIEW_BASE || '').replace(/\/$/, '');
const forbiddenAssetIndex = /\.(?:webp|png|jpe?g|svg|css|js|json|xml|ico|webmanifest)\/index\.html(?:[?#]|$)/i;
const pages = [
  ['', 'index.html', true],
  ['en/', 'en/index.html', true],
  ['prices/', 'prices/index.html', true],
  ['en/prices/', 'en/prices/index.html', true],
  ['gcc-transport-planner/', 'gcc-transport-planner/index.html', true],
  ['en/gcc-transport-planner/', 'en/gcc-transport-planner/index.html', true],
  ['bahrain-to-riyadh/', 'bahrain-to-riyadh/index.html', true],
  ['en/bahrain-to-riyadh/', 'en/bahrain-to-riyadh/index.html', true],
  ['king-fahd-causeway-guide/', 'king-fahd-causeway-guide/index.html', true],
  // This legacy English page has no image markup; the URL corruption audit still applies.
  ['en/king-fahd-causeway-guide/', 'en/king-fahd-causeway-guide/index.html', false],
];

async function auditAssets(page, label, expectVisibleImages) {
  await page.locator('body.vip-transport').waitFor();
  await page.waitForFunction(() => [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    })
    .every((image) => image.complete));

  const audit = await page.evaluate(() => {
    const urls = [];
    document.querySelectorAll('img').forEach((image) => urls.push({ kind: image.className || 'img', url: image.currentSrc || image.src }));
    document.querySelectorAll('source[srcset], img[srcset]').forEach((node) => {
      (node.getAttribute('srcset') || '').split(',').forEach((candidate) => urls.push({ kind: 'srcset', url: candidate.trim().split(/\s+/)[0] || '' }));
    });
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => urls.push({ kind: 'icon', url: link.href }));
    document.querySelectorAll('*').forEach((node) => {
      const background = getComputedStyle(node).backgroundImage;
      for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) urls.push({ kind: 'background', url: match[1] });
    });
    const visibleImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    }).map((image) => ({
      src: image.currentSrc || image.src,
      width: image.naturalWidth,
      complete: image.complete,
      className: image.className,
    }));
    return { urls, visibleImages };
  });

  const corrupted = audit.urls.filter(({ url }) => forbiddenAssetIndex.test(url));
  expect(corrupted, `${label}: asset URLs must never be normalized as page directories`).toEqual([]);
  if (expectVisibleImages) {
    expect(audit.visibleImages.length, `${label}: should expose visible imagery or branding`).toBeGreaterThan(0);
  }
  expect(audit.visibleImages.filter((image) => !image.complete || image.width <= 0), `${label}: every visible image must load`).toEqual([]);
}

test.describe('asset URL normalization', () => {
  for (const [route, file, expectVisibleImages] of pages) {
    test(`HTTP ${route || 'Arabic home'} keeps assets as files`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${previewBase}${base}/${route}`, { waitUntil: 'domcontentloaded' });
      await auditAssets(page, `HTTP ${route}`, expectVisibleImages);
    });

    test(`file fallback ${file} keeps assets as files`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(pathToFileURL(join(root, file)).href, { waitUntil: 'domcontentloaded' });
      await auditAssets(page, `file ${file}`, expectVisibleImages);
    });
  }
});

test('normalizers contain an extension-aware file guard', () => {
  for (const source of ['site.js', 'file-protocol-links.js']) {
    const text = readFileSync(join(root, source), 'utf8');
    expect(text, `${source} must recognize extension-bearing file targets`).toContain('[^/]+\\.[a-z0-9]{1,16}');
  }
});

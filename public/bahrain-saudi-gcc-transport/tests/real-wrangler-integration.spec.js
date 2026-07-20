import { test, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const transportRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicRoot = dirname(transportRoot);
const port = 8800 + (process.pid % 500);
const connectedOrigin = String(process.env.VENDORA_WRANGLER_BASE || '').replace(/\/$/, '');
const origin = connectedOrigin || `http://127.0.0.1:${port}`;
const persistPath = join(tmpdir(), `vendora-real-wrangler-${process.pid}`);
const sitePrefix = '/bahrain-saudi-gcc-transport';
const fatalPattern = /Can't modify immutable headers|An error has occurred|Worker threw exception|Uncaught Worker exception/i;
let wrangler;
let wranglerOutput = '';

function sitemapPaths(name) {
  const xml = readFileSync(join(transportRoot, name), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

async function waitForWrangler() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (wrangler && wrangler.exitCode != null) throw new Error(`Wrangler exited early (${wrangler.exitCode}).\n${wranglerOutput}`);
    try {
      const response = await fetch(`${origin}${sitePrefix}/`, { redirect: 'manual' });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out starting real Wrangler.\n${wranglerOutput}`);
}

async function mapConcurrent(items, concurrency, callback) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await callback(items[index], index);
    }
  }));
  return results;
}

test.describe('real Wrangler HTML response integration', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(180_000);
    if (connectedOrigin) {
      await waitForWrangler();
      return;
    }
    mkdirSync(persistPath, { recursive: true });
    const executable = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npx';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', `npx wrangler dev --local --ip 127.0.0.1 --port ${port} --persist-to ${persistPath}`]
      : ['wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', persistPath];
    wrangler = spawn(executable, args, {
      cwd: publicRoot,
      env: process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const collect = (chunk) => { wranglerOutput += chunk.toString(); };
    wrangler.stdout.on('data', collect);
    wrangler.stderr.on('data', collect);
    await waitForWrangler();
  });

  test.afterAll(() => {
    if (connectedOrigin) return;
    if (wrangler && wrangler.exitCode == null) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(wrangler.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      } else {
        wrangler.kill('SIGTERM');
      }
    }
    rmSync(persistPath, { recursive: true, force: true });
  });

  test('every sitemap page is rewritten successfully by the real Worker', async () => {
    test.setTimeout(300_000);
    const paths = [...new Set([
      ...sitemapPaths('sitemap-gcc-transport.xml'),
      ...sitemapPaths('sitemap-gcc-transport-en.xml'),
    ])];
    expect(paths.length).toBeGreaterThan(50);

    const pages = await mapConcurrent(paths, 8, async (path) => {
      const response = await fetch(`${origin}${path}`);
      const body = await response.text();
      return { path, response, body };
    });

    for (const { path, response, body } of pages) {
      expect(response.status, path).toBe(200);
      expect(response.headers.get('content-type'), path).toMatch(/^text\/html(?:;|$)/i);
      expect(body, path).toMatch(/<!doctype html|<html/i);
      expect(body, path).not.toMatch(fatalPattern);
      expect(body, path).not.toMatch(/cloudflare.*error|error code:\s*1101/i);
    }

    expect(wranglerOutput).not.toMatch(/Can't modify immutable headers|Uncaught Worker exception/i);
  });

  test('representative rewritten pages retain headers and all referenced assets resolve', async () => {
    test.setTimeout(180_000);
    const paths = [
      `${sitePrefix}/`, `${sitePrefix}/en/`,
      `${sitePrefix}/prices/`, `${sitePrefix}/en/prices/`,
      `${sitePrefix}/gcc-transport-planner/`, `${sitePrefix}/en/gcc-transport-planner/`,
      `${sitePrefix}/airport-pickup-planner/`,
      `${sitePrefix}/bahrain-to-khobar/`,
      `${sitePrefix}/en/arbaeen-karbala-travel-tips/`,
    ];
    const assetUrls = new Set();

    for (const path of paths) {
      const response = await fetch(`${origin}${path}`);
      const html = await response.text();
      expect(response.status, path).toBe(200);
      expect(response.statusText, path).toBe('OK');
      expect(response.headers.get('content-type'), path).toBe('text/html; charset=utf-8');
      expect(html, path).not.toMatch(fatalPattern);

      for (const match of html.matchAll(/<(?:img|script|source|link)\b[^>]*?\b(?:src|href|srcset)=["']([^"']+)["']/gi)) {
        for (const candidate of match[1].split(',').map((part) => part.trim().split(/\s+/)[0])) {
          if (!candidate || /^(?:data:|mailto:|tel:|https?:\/\/wa\.me)/i.test(candidate)) continue;
          const url = new URL(candidate, `${origin}${path}`);
          if (url.origin === origin) assetUrls.add(url.href);
        }
      }
    }

    const assets = await mapConcurrent([...assetUrls], 10, async (url) => {
      const response = await fetch(url);
      return { url, status: response.status, type: response.headers.get('content-type') || '', body: await response.arrayBuffer() };
    });
    for (const asset of assets) {
      expect(asset.status, asset.url).toBe(200);
      expect(asset.body.byteLength, asset.url).toBeGreaterThan(0);
      expect(asset.url, asset.url).not.toMatch(/\/index\.html(?:[?#]|$)/i);
      expect(asset.type, asset.url).not.toMatch(/^text\/html/i);
    }
  });

  test('real-browser mobile header and bottom navigation remain collision-free', async ({ browser }) => {
    test.setTimeout(180_000);
    const viewports = [
      { width: 305, height: 520, path: `${sitePrefix}/airport-pickup-planner/` },
      { width: 320, height: 568, path: `${sitePrefix}/en/airport-pickup-planner/` },
      { width: 390, height: 844, path: `${sitePrefix}/airport-pickup-planner/` },
      { width: 768, height: 1024, path: `${sitePrefix}/airport-pickup-planner/` },
      { width: 1440, height: 900, path: `${sitePrefix}/airport-pickup-planner/` },
    ];

    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const browserErrors = [];
      page.on('pageerror', (error) => browserErrors.push(error.message));
      await page.goto(`${origin}${viewport.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.vip-menu-toggle', { state: 'attached' });

      const audit = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display === 'none' ? null : { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
        };
        const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        const brand = rect('.topbar .brand');
        const language = rect('.topbar .lang-toggle');
        const menu = rect('.topbar .vip-menu-toggle');
        const nav = rect('.vip-bottom-nav');
        const heroActions = [...document.querySelectorAll('.vip-content-hero-copy .hero-actions a')]
          .map((element) => {
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
          });
        const bodyPadding = Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
        return {
          brand, language, menu, nav, bodyPadding,
          collisions: [overlaps(brand, language), overlaps(brand, menu), overlaps(language, menu)],
          coveredHeroActions: heroActions.filter((action) => overlaps(action, nav)).length,
          headerContainsCountryContent: Boolean(document.querySelector('.topbar .gcc-flag-wrap, .topbar .gcc-flag-chip, .topbar .country-card')),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      expect(audit.overflow, `${viewport.width}px overflow`).toBe(false);
      expect(audit.headerContainsCountryContent, `${viewport.width}px country content`).toBe(false);
      expect(audit.collisions, `${viewport.width}px header collision`).toEqual([false, false, false]);
      if (viewport.width <= 900) {
        expect(audit.language?.width, `${viewport.width}px language width`).toBeGreaterThanOrEqual(48);
        expect(audit.language?.height, `${viewport.width}px language height`).toBeGreaterThanOrEqual(48);
        expect(audit.menu?.width, `${viewport.width}px menu width`).toBeGreaterThanOrEqual(48);
        expect(audit.menu?.height, `${viewport.width}px menu height`).toBeGreaterThanOrEqual(48);
        expect(audit.bodyPadding, `${viewport.width}px bottom reserve`).toBeGreaterThanOrEqual((audit.nav?.height || 0) + 16);
        expect(audit.coveredHeroActions, `${viewport.width}px covered hero actions`).toBe(0);
      } else {
        expect(audit.nav, `${viewport.width}px desktop nav`).toBeNull();
      }
      expect(browserErrors, `${viewport.width}px browser errors`).toEqual([]);
      await page.close();
    }
  });
});

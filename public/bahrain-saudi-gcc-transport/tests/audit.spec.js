import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function parseSitemapPaths(xml) {
  const paths = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    try {
      const u = new URL(m[1].trim());
      let p = u.pathname;
      if (p !== '/' && !p.endsWith('/')) {
        p = `${p}/`;
      }
      paths.push(p);
    } catch {
      /* skip bad URLs */
    }
  }
  return [...new Set(paths)];
}

const sitemapXml = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const ROUTES = parseSitemapPaths(sitemapXml);

test.describe('SEO & page shell', () => {
  for (const path of ROUTES) {
    test(`meta + canonical on ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.ok(), `HTTP ${response?.status()} for ${path}`).toBeTruthy();

      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      const canon = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canon).toMatch(/^https:\/\/getvendora\.net\/bahrain-saudi-gcc-transport\//);

      await expect(page.locator('meta[name="description"]')).toHaveCount(1);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect((desc || '').length).toBeGreaterThan(20);

      await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots).toMatch(/index/);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);

      await expect(page.locator('script[type="application/ld+json"][data-vendora-schema]')).toHaveCount(1);
    });
  }
});

test.describe('Interactive UI', () => {
  test('language toggle switches dir and lang', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/');
    await page.evaluate(() => localStorage.removeItem('vendora_lang'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.locator('[data-language-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.locator('[data-language-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  for (const path of ROUTES) {
    test(`English mode has no visible Arabic on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => localStorage.removeItem('vendora_lang'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-language-toggle]').click();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');

      const visibleArabic = await page.locator('body *:visible').evaluateAll((elements) => {
        const arabic = /[\u0600-\u06FF]/;
        const leaks = [];

        for (const element of elements) {
          const text = [...element.childNodes]
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.nodeValue.trim())
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (text && arabic.test(text)) leaks.push(text);
        }

        return [...new Set(leaks)].slice(0, 20);
      });

      expect(visibleArabic, `Untranslated Arabic visible on ${path}`).toEqual([]);
    });
  }

  test('booking form submit builds wa.me link', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/');
    const submit = page.locator('[data-booking-submit]');
    await submit.waitFor({ state: 'visible' });
    const href = await submit.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/97333225954\?text=/);
  });
});

test.describe('Links & WhatsApp actions', () => {
  test('every route: internal links resolve; WhatsApp links valid', async ({ page, request }) => {
    const origin = 'http://127.0.0.1:4173';
    const segment = '/bahrain-saudi-gcc-transport';

    for (const path of ROUTES) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.ok(), `${path} status ${res?.status()}`).toBeTruthy();

      const pageUrl = `${origin}${path}`;
      const anchors = await page.locator('a[href]').evaluateAll((els) =>
        els.map((a) => a.getAttribute('href') || ''),
      );

      for (const href of anchors) {
        if (!href || href.startsWith('#')) continue;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        if (href.startsWith('https://wa.me/')) {
          expect(href).toContain('97333225954');
          continue;
        }
        if (href.startsWith('http://') || href.startsWith('https://')) {
          if (href.includes('flagcdn.com') || href.includes('unpkg.com')) continue;
          const head = await request.head(href).catch(() => null);
          if (head && head.status() >= 400) {
            const get = await request.get(href).catch(() => null);
            expect(get?.ok(), `External link broken: ${href}`).toBeTruthy();
          }
          continue;
        }

        const target = new URL(href, pageUrl);
        if (target.origin !== origin) continue;
        if (!target.pathname.startsWith(segment)) continue;

        const check = await request.get(target.href).catch(() => null);
        expect(check?.ok(), `Missing page for ${href} (from ${path})`).toBeTruthy();
      }
    }
  });
});

test.describe('Performance smoke', () => {
  test('home LCP-friendly: CSS loads', async ({ page }) => {
    const t0 = Date.now();
    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'load' });
    const ms = Date.now() - t0;
    expect(ms).toBeLessThan(15_000);
    await expect(page.locator('link[rel="stylesheet"]').first()).toBeAttached();
  });
});

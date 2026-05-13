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
      /* skip */
    }
  }
  return [...new Set(paths)];
}

const enXml = readFileSync(join(root, 'sitemap-gcc-transport-en.xml'), 'utf8');
const EN_ROUTES = parseSitemapPaths(enXml);

test.describe('English site', () => {
  for (const path of EN_ROUTES) {
    test(`loads ${path}`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.ok(), `${path} status ${res?.status()}`).toBeTruthy();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    });
  }
});

test.describe('English hub route grid', () => {
  test('every EN route from sitemap is linked from #gcc-routes', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'domcontentloaded' });
    const routePaths = EN_ROUTES.filter((p) => p.includes('/en/') && !p.endsWith('/en/'));
    expect(routePaths.length).toBeGreaterThan(0);
    for (const path of routePaths) {
      const m = path.match(/\/(en\/[^/]+\/?)$/);
      expect(m, `parse route segment from ${path}`).toBeTruthy();
      const needle = m[1].replace(/\/$/, '');
      const link = page.locator(`#gcc-routes a[href*="${needle}"]`).first();
      await expect(link, `hub links to ${needle}`).toBeVisible();
    }
  });
});

test.describe('Mobile layout smoke', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('English home: nav and hero fit without horizontal page scroll', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'domcontentloaded' });
    const scrollOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(scrollOverflow).toBeLessThanOrEqual(24);
  });

  test('Arabic home: nav fits on narrow screen', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'domcontentloaded' });
    const scrollOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(scrollOverflow).toBeLessThanOrEqual(24);
  });
});

test.describe('English home very narrow', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('no horizontal page overflow at 320px', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'domcontentloaded' });
    const scrollOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(scrollOverflow).toBeLessThanOrEqual(24);
  });
});

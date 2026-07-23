import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = resolve(root, '..', '..');
const previewRoot = join(repositoryRoot, 'planning-output', 'gcc-preview');
const internalConfigRoot = join(repositoryRoot, 'internal-preview', 'gcc-routes', 'config');
const routesConfig = JSON.parse(readFileSync(join(internalConfigRoot, 'gcc-routes.json'), 'utf8'));
const countriesConfig = JSON.parse(readFileSync(join(internalConfigRoot, 'gcc-countries.json'), 'utf8'));
const previewRoutes = routesConfig.routes.filter((route) =>
  route.active || route.preview_batch === 'operational_approval_batch_1'
);
const previewUrl = (...segments) => pathToFileURL(join(previewRoot, ...segments, 'index.html')).href;

test.describe('GCC private route previews', () => {
  for (const route of previewRoutes) {
    for (const lang of ['ar', 'en']) {
      test(`${route.route_id} ${lang} remains private and gated`, async ({ page }) => {
        const response = await page.goto(previewUrl(lang, 'routes', route.slug), { waitUntil: 'domcontentloaded' });
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('body')).toHaveAttribute('data-private-preview', 'true');
        await expect(page.locator('body')).toHaveAttribute('data-route-id', route.route_id);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow,noarchive,nosnippet');
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

        if (lang === 'en') {
          await expect(page.locator('html')).toHaveAttribute('lang', 'en');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          const visibleText = await page.locator('body').innerText();
          expect(visibleText).not.toMatch(/[\u0600-\u06ff]/);
        } else {
          await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
          await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        }

        if (!route.active) {
          await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
          await expect(page.locator('[data-booking-submit], [data-booking-form]')).toHaveCount(0);
          await expect(page.locator('[hreflang]')).toHaveCount(0);
          await expect(page.locator('[data-inactive-no-booking="true"]')).toHaveCount(1);
          const html = await page.content();
          expect(html).not.toContain(`https://getvendora.net/bahrain-saudi-gcc-transport/${route.slug}/`);
          expect(html).not.toContain(`https://getvendora.net/bahrain-saudi-gcc-transport/en/${route.slug}/`);
        }
      });
    }
  }
});

test.describe('GCC private country hubs', () => {
  for (const country of countriesConfig.countries) {
    for (const lang of ['ar', 'en']) {
      test(`${country.code} ${lang} hub exposes active routes only`, async ({ page }) => {
        const response = await page.goto(previewUrl(lang, 'hubs', country.hub_slug), { waitUntil: 'domcontentloaded' });
        expect(response?.ok()).toBeTruthy();
        const expected = routesConfig.routes
          .filter((route) => route.active && route.origin_country === country.code)
          .map((route) => route.route_id)
          .sort();
        const actual = (await page.locator('[data-active-route-link]').evaluateAll((links) =>
          links.map((link) => link.getAttribute('data-active-route-link')).sort()
        ));
        expect(actual).toEqual(expected);
      });
    }
  }
});

test.describe('GCC private preview mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('representative English route, Arabic hub and chauffeur hub avoid material overflow', async ({ page }) => {
    const paths = [
      previewUrl('en', 'routes', 'saudi-to-qatar'),
      previewUrl('ar', 'hubs', 'transport-from-bahrain'),
      previewUrl('en', 'services', 'chauffeur-services')
    ];
    for (const path of paths) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.ok()).toBeTruthy();
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(24);
    }
  });
});

test.describe('GCC private preview deployment boundary', () => {
  test('old and repository-only preview paths return 404 from the public server', async ({ request }) => {
    const oldPath = await request.get('/bahrain-saudi-gcc-transport/gcc-private-transport-guide/planning/private-preview/');
    expect(oldPath.status()).toBe(404);
    const repositoryOnlyPath = await request.get('/planning-output/gcc-preview/');
    expect(repositoryOnlyPath.status()).toBe(404);
    const internalMatrix = await request.get('/bahrain-saudi-gcc-transport/config/gcc-routes.json');
    expect(internalMatrix.status()).toBe(404);
  });
});

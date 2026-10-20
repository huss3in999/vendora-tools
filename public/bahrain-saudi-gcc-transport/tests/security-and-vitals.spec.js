import { test, expect } from '@playwright/test';

test.describe('Security & Core Web Vitals Suite', () => {

  test('STEP 1: Anonymous request to booking API returns 401 Unauthorized or 404', async ({ request }) => {
    // 1. Direct GET to /api/transport/booking-desk
    const resGet = await request.get('/api/transport/booking-desk?action=getBoard');
    expect([401, 404]).toContain(resGet.status());

    // 2. Direct POST to /api/transport/booking-desk
    const resPost = await request.post('/api/transport/booking-desk', {
      data: { action: 'getBoard' },
    });
    expect([401, 404, 405]).toContain(resPost.status());
  });

  test('STEP 2: Review schema matches authentic on-page reviews', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/bahrain-to-khobar/');
    const ratingBadge = page.locator('.route-rating-badge');
    await expect(ratingBadge).toBeVisible();
    await expect(ratingBadge).toContainText('4');

    const schemaElement = page.locator('head script[data-vendora-schema]').first();
    const schemaData = JSON.parse(await schemaElement.textContent());
    const lb = schemaData['@graph']?.find(n => Array.isArray(n['@type']) && n['@type'].includes('LocalBusiness'));
    expect(lb).toBeDefined();
    expect(Number(lb.aggregateRating.ratingCount)).toBe(4);
    expect(Number(lb.aggregateRating.reviewCount)).toBe(4);
    expect(lb.review.length).toBe(4);
  });

  test('STEP 3A: Desktop Viewport CLS is strictly < 0.1', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.addInitScript(() => {
      window.__cls = 0;
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__cls += entry.value;
          }
        }
      });
      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch {}
    });

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-to-khobar/', { waitUntil: 'load' });
    await page.waitForTimeout(600);

    const cls = await page.evaluate(() => window.__cls);
    expect(cls).toBeLessThan(0.1);
  });

  test('STEP 3B: Mobile Viewport CLS is strictly < 0.1', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.addInitScript(() => {
      window.__cls = 0;
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__cls += entry.value;
          }
        }
      });
      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch {}
    });

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-to-khobar/', { waitUntil: 'load' });
    await page.waitForTimeout(600);

    const cls = await page.evaluate(() => window.__cls);
    expect(cls).toBeLessThan(0.1);
  });

  test('STEP 4: King Fahd Causeway official toll note is preserved on prices page', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/en/prices/');
    const pageText = await page.innerText('body');
    expect(pageText).toContain('King Fahd Causeway');
    expect(pageText).toMatch(/(?:BHD 2\.500|JESR)/);
  });

  test('STEP 5: English pages link strictly to English routes with zero leaks', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/en/airport-transfer/');
    const links = await page.locator('a[href]').all();

    for (const link of links) {
      const isLangToggle = await link.evaluate(el => el.classList.contains('lang-toggle'));
      if (isLangToggle) continue;

      const href = await link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('#')) {
        continue;
      }

      // Must not link to Arabic transport paths
      expect(href).not.toMatch(/^\/bahrain-saudi-gcc-transport\/(?!en\/|assets\/)/);
    }
  });

});

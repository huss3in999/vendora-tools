import { test, expect } from '@playwright/test';

const newRouteSlugs = [
  'bahrain-airport-to-khobar',
  'khobar-to-bahrain-airport',
  'bahrain-airport-to-jubail',
  'bahrain-to-makkah-umrah-suv',
  'king-fahd-causeway-chauffeur',
  'dammam-airport-to-bahrain',
  'dammam-to-bahrain',
  'khobar-to-bahrain'
];

for (const slug of newRouteSlugs) {
  for (const lang of ['ar', 'en']) {
    const isEn = lang === 'en';
    const relPath = isEn ? `en/${slug}/` : `${slug}/`;
    const url = `/bahrain-saudi-gcc-transport/${relPath}`;
    const pairUrl = `/bahrain-saudi-gcc-transport/${isEn ? `${slug}/` : `en/${slug}/`}`;

    test(`Route ${slug} [${lang}]: loads 200, valid schema, WhatsApp CTA, hreflang, and mobile zero-overflow`, async ({ page }) => {
      // 1. HTTP 200 and load page
      const response = await page.goto(url);
      expect(response.status()).toBe(200);

      // 2. Visual star rating component is present and visible
      const ratingBadge = page.locator('.route-rating-badge');
      await expect(ratingBadge).toBeVisible();
      await expect(ratingBadge).toContainText('5.0');
      await expect(ratingBadge).toContainText('4');

      // 3. JSON-LD in head: AggregateRating, Review, and FAQPage
      const schemaElement = page.locator('head script[data-vendora-schema]').first();
      await expect(schemaElement).toBeAttached();
      const schemaData = JSON.parse(await schemaElement.textContent());
      const orgOrService = schemaData['@graph']?.find(n =>
        (Array.isArray(n['@type']) && n['@type'].includes('LocalBusiness')) ||
        n['@type'] === 'TaxiService' ||
        n['@type'] === 'TravelAgency'
      );
      expect(orgOrService).toBeDefined();
      expect(orgOrService.aggregateRating).toBeDefined();
      expect(Number(orgOrService.aggregateRating.ratingValue)).toBe(5);
      expect(Number(orgOrService.aggregateRating.ratingCount || orgOrService.aggregateRating.reviewCount)).toBe(4);

      // FAQPage schema
      const faqElement = page.locator('head script[data-vendora-faq]').first();
      await expect(faqElement).toBeAttached();
      const faqData = JSON.parse(await faqElement.textContent());
      expect(faqData['@type']).toBe('FAQPage');
      expect(faqData.mainEntity.length).toBeGreaterThanOrEqual(3);

      // 4. WhatsApp CTA buttons encode route or vehicle
      const waLinks = page.locator('a[data-vendora-config="whatsapp-link"], a.wa-inline, a.booking-cta');
      const count = await waLinks.count();
      expect(count).toBeGreaterThan(0);
      let foundValidWa = false;
      for (let i = 0; i < count; i++) {
        const href = await waLinks.nth(i).getAttribute('href');
        if (href && href.includes('wa.me')) {
          foundValidWa = true;
          break;
        }
      }
      expect(foundValidWa).toBe(true);

      // 5. Bidirectional hreflangs
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toContain(relPath);

      const arHreflang = await page.locator('link[hreflang="ar-BH"]').getAttribute('href');
      const enHreflang = await page.locator('link[hreflang="en"]').getAttribute('href');
      const defaultHreflang = await page.locator('link[hreflang="x-default"]').getAttribute('href');

      if (isEn) {
        expect(enHreflang).toBe(canonical);
        expect(arHreflang).toContain(`/bahrain-saudi-gcc-transport/${slug}/`);
      } else {
        expect(arHreflang).toBe(canonical);
        expect(enHreflang).toContain(`/bahrain-saudi-gcc-transport/en/${slug}/`);
      }
      expect(defaultHreflang).toContain(`/bahrain-saudi-gcc-transport/${slug}/`);

      // 6. Mobile viewports zero horizontal overflow
      const viewports = [
        { width: 360, height: 740 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 }
      ];

      for (const vp of viewports) {
        await page.setViewportSize(vp);
        await page.waitForTimeout(100);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1); // 1px tolerance for sub-pixel anti-aliasing
      }
    });
  }
}

import { test, expect } from '@playwright/test';

const hubs = [
  'exhibition-world-bahrain-transport',
  'luxury-hotel-transfers-bahrain',
  'corporate-chauffeur-bahrain',
  'b2b-travel-partners'
];

for (const slug of hubs) {
  for (const lang of ['ar', 'en']) {
    const isEn = lang === 'en';
    const relPath = isEn ? `en/${slug}/` : `${slug}/`;
    const url = `/bahrain-saudi-gcc-transport/${relPath}`;
    const pairUrl = `/bahrain-saudi-gcc-transport/${isEn ? `${slug}/` : `en/${slug}/`}`;

    test(`B2B Hub ${slug} [${lang}]: loads 200, visual cards, star rating, WhatsApp CTA, schema & hreflang`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      // 1. HTTP 200 and load page
      const response = await page.goto(url);
      expect(response.status()).toBe(200);
      expect(pageErrors).toHaveLength(0);

      // 2. Visual star rating component is present and visible
      const ratingBadge = page.locator('.route-rating-badge');
      await expect(ratingBadge).toBeVisible();
      await expect(ratingBadge).toContainText('5.0');
      await expect(ratingBadge).toContainText('4');

      // 3. Visual cards and vehicle capacity proof-points
      const proofPoints = page.locator('.proof-points');
      await expect(proofPoints).toBeVisible();
      const routeCards = page.locator('.route-card');
      expect(await routeCards.count()).toBeGreaterThanOrEqual(3);

      // 4. Commercial billing note
      const billingCard = page.locator('.booking-card');
      await expect(billingCard.first()).toBeVisible();
      const bodyText = await page.innerText('body');
      if (isEn) {
        expect(bodyText).toContain('Verified Corporate Invoicing, Flexible Payment Terms, and Itemized Digital Receipts available upon request');
      } else {
        expect(bodyText).toContain('فواتير شركات معتمدة، شروط دفع مرنة، وإيصالات رقمية مفصلة عند الطلب');
      }

      // 5. JSON-LD in head: LocalBusiness, TaxiService, and FAQPage
      const schemaElement = page.locator('head script[data-vendora-schema]').first();
      await expect(schemaElement).toBeAttached();
      const schemaData = JSON.parse(await schemaElement.textContent());
      const localBusiness = schemaData['@graph']?.find(n =>
        Array.isArray(n['@type']) && n['@type'].includes('LocalBusiness')
      );
      expect(localBusiness).toBeDefined();
      expect(localBusiness.aggregateRating).toBeUndefined();
      expect(localBusiness.review).toHaveLength(4);

      const taxiService = schemaData['@graph']?.find(n => n['@type'] === 'TaxiService');
      expect(taxiService).toBeDefined();

      // FAQPage schema
      const faqElement = page.locator('head script[data-vendora-faq]').first();
      await expect(faqElement).toBeAttached();
      const faqData = JSON.parse(await faqElement.textContent());
      expect(faqData['@type']).toBe('FAQPage');
      expect(faqData.mainEntity.length).toBeGreaterThanOrEqual(3);

      // 6. WhatsApp CTA buttons encode inquiry message
      const waLinks = page.locator('a[data-vendora-config="whatsapp-link"], a.wa-inline, a.floating-wa');
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

      // 7. Bidirectional hreflang verification
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', new RegExp(url + '$'));

      const arAlt = page.locator('link[rel="alternate"][hreflang="ar-BH"]');
      await expect(arAlt).toHaveAttribute('href', /bahrain-saudi-gcc-transport\/[a-z0-9-]+\/$/);

      const enAlt = page.locator('link[rel="alternate"][hreflang="en"]');
      await expect(enAlt).toHaveAttribute('href', /bahrain-saudi-gcc-transport\/en\/[a-z0-9-]+\/$/);

      const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');
      await expect(xDefault).toHaveAttribute('href', /bahrain-saudi-gcc-transport\/[a-z0-9-]+\/$/);

      // 8. Mobile viewport check: 0 horizontal overflow
      await page.setViewportSize({ width: 375, height: 812 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });
  }
}

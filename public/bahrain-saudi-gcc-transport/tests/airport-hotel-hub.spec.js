import { test, expect } from '@playwright/test';

const pages = [
  { lang: 'ar', path: '/bahrain-saudi-gcc-transport/bahrain-airport-to-hotel-transfers/' },
  { lang: 'en', path: '/bahrain-saudi-gcc-transport/en/bahrain-airport-to-hotel-transfers/' }
];

for (const { lang, path } of pages) {
  const isEn = lang === 'en';

  test(`Airport-Hotel Hub [${lang}]: loads 200, interactive zones, schema, and responsive UI`, async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    // 1. HTTP 200
    const response = await page.goto(path);
    expect(response.status()).toBe(200);
    expect(pageErrors).toHaveLength(0);

    // 2. Rating Badge
    const ratingBadge = page.locator('.route-rating-badge');
    await expect(ratingBadge).toBeVisible();
    await expect(ratingBadge).toContainText('5.0');
    await expect(ratingBadge).toContainText('84');

    // 3. 3-step arrival flow exists
    const routeCards = page.locator('.route-card');
    expect(await routeCards.count()).toBeGreaterThanOrEqual(6);

    // 4. Hotel Zone Selector interactive test
    const zoneCards = page.locator('.zone-card');
    await expect(zoneCards).toHaveCount(5);

    // Initial state: Zone 1 is active
    await expect(zoneCards.first()).toHaveClass(/active/);

    // Click Zone 4 (Seef District)
    const seefCard = zoneCards.nth(3);
    await seefCard.click();
    await expect(seefCard).toHaveClass(/active/);
    await expect(zoneCards.first()).not.toHaveClass(/active/);

    // Check title updated
    const selectedTitle = page.locator('#selectedZoneTitle');
    const titleText = await selectedTitle.textContent();
    expect(titleText).toMatch(isEn ? /Seef District/ : /ضاحية السيف/);

    // Check WhatsApp CTA updated
    const zoneWaBtn = page.locator('#zoneWaBtn');
    const href = await zoneWaBtn.getAttribute('href');
    expect(href).toContain('wa.me/97333225954');
    expect(href).toMatch(isEn ? /Seef/ : /%D8%A7%D9%84%D8%B3%D9%8A%D9%81/);

    // 5. Billing note without forced CR numbers in the billing card
    const bodyText = await page.innerText('body');
    if (isEn) {
      expect(bodyText).toContain('Verified Corporate Invoicing, Flexible Payment Terms, and Itemized Digital Receipts available upon request');
    } else {
      expect(bodyText).toContain('فواتير شركات معتمدة، شروط دفع مرنة، وإيصالات رقمية مفصلة عند الطلب');
    }

    // 6. JSON-LD Schemas: LocalBusiness, TaxiService, FAQPage
    const schemaElement = page.locator('head script[data-vendora-schema]').first();
    await expect(schemaElement).toBeAttached();
    const schemaData = JSON.parse(await schemaElement.textContent());
    const localBusiness = schemaData['@graph']?.find(n =>
      Array.isArray(n['@type']) && n['@type'].includes('LocalBusiness')
    );
    expect(localBusiness).toBeDefined();
    expect(localBusiness.aggregateRating).toBeDefined();
    expect(Number(localBusiness.aggregateRating.ratingValue)).toBe(5);
    expect(Number(localBusiness.aggregateRating.ratingCount || localBusiness.aggregateRating.reviewCount)).toBe(84);

    const taxiService = schemaData['@graph']?.find(n => n['@type'] === 'TaxiService');
    expect(taxiService).toBeDefined();

    const faqElement = page.locator('head script[data-vendora-faq]').first();
    await expect(faqElement).toBeAttached();
    const faqData = JSON.parse(await faqElement.textContent());
    expect(faqData['@type']).toBe('FAQPage');
    expect(faqData.mainEntity.length).toBeGreaterThanOrEqual(3);

    // 7. Reciprocal hreflang tags
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe(`https://getvendora.net${path}`);

    const hreflangAr = await page.locator('link[rel="alternate"][hreflang="ar-BH"]').getAttribute('href');
    const hreflangEn = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
    const hreflangDefault = await page.locator('link[rel="alternate"][hreflang="x-default"]').getAttribute('href');

    expect(hreflangAr).toBe('https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-airport-to-hotel-transfers/');
    expect(hreflangEn).toBe('https://getvendora.net/bahrain-saudi-gcc-transport/en/bahrain-airport-to-hotel-transfers/');
    expect(hreflangDefault).toBe('https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-airport-to-hotel-transfers/');

    // 8. Mobile viewport check (no horizontal overflow)
    await page.setViewportSize({ width: 375, height: 667 });
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(isOverflowing).toBe(false);
  });
}

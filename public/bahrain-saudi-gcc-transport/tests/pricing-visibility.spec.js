import { test, expect } from '@playwright/test';

const base = '/bahrain-saudi-gcc-transport';
const routes = [
  { route_slug:'bahrain-to-riyadh', route_name_ar:'البحرين إلى الرياض', route_name_en:'Bahrain to Riyadh', price_bhd:120, price_kind:'standard', unit_kind:'one_way_vehicle', currency:'BHD', public_price_enabled:true, is_active:true, price_visibility_group:'saudi_arabia' },
  { route_slug:'bahrain-to-qatar', route_name_ar:'البحرين إلى قطر', route_name_en:'Bahrain to Qatar', price_bhd:130, price_kind:'standard', unit_kind:'one_way_vehicle', currency:'BHD', public_price_enabled:true, is_active:true, price_visibility_group:'qatar' },
  { route_slug:'bahrain-to-custom-riyadh', route_name_ar:'وجهة سعودية جديدة', route_name_en:'New Saudi destination', price_bhd:null, price_kind:'standard', unit_kind:'one_way_vehicle', currency:'BHD', public_price_enabled:true, is_active:true, price_visibility_group:'saudi_arabia', is_price_hidden:true }
];

async function openPrices(page, lang, settings) {
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({ ok:true, settings:{ booking_whatsapp:'97333225954', booking_whatsapp_enabled:true, sar_per_bhd:10, public_prices_enabled:true, hidden_price_destination_groups:[], ...settings }, routes })
  }));
  await page.setViewportSize({ width:lang === 'ar' ? 390 : 1440, height:844 });
  await page.goto(`${base}${lang === 'en' ? '/en' : ''}/prices/`, { waitUntil:'domcontentloaded' });
  await expect(page.locator('#priceList [data-route="bahrain-to-qatar"]')).toBeVisible();
}

test('global price switch replaces amounts with bilingual WhatsApp quote links', async ({ page }) => {
  await openPrices(page, 'en', { public_prices_enabled:false });
  const card = page.locator('#priceList [data-route="bahrain-to-qatar"]');
  await expect(card).toHaveAttribute('data-price-hidden', 'true');
  await expect(card.locator('.price')).toContainText('Get Live Seasonal Quote');
  await expect(card.locator('a')).toHaveAttribute('href', /^https:\/\/wa\.me\/97333225954\?/);
  await expect(page.locator('#pricesSchema')).not.toContainText('"price":');

  await openPrices(page, 'ar', { public_prices_enabled:false });
  const arabicCard = page.locator('#priceList [data-route="bahrain-to-qatar"]');
  await expect(arabicCard.locator('.price')).toContainText('احصل على عرض سعر موسمي فوري');
  await expect(arabicCard.locator('a')).toHaveAttribute('href', /^https:\/\/wa\.me\/97333225954\?/);
  await page.locator('#priceList').screenshot({ path:'test-results/pricing-hidden-ar-cards.png' });
});

test('destination hide affects only assigned routes and carries over to newly added routes', async ({ page }) => {
  await openPrices(page, 'en', { hidden_price_destination_groups:['saudi_arabia'] });
  const saudi = page.locator('#priceList [data-route="bahrain-to-riyadh"]');
  const newSaudi = page.locator('#priceList [data-route="bahrain-to-custom-riyadh"]');
  const qatar = page.locator('#priceList [data-route="bahrain-to-qatar"]');
  await expect(saudi).toHaveAttribute('data-price-hidden', 'true');
  await expect(newSaudi).toHaveAttribute('data-price-hidden', 'true');
  await expect(saudi).not.toContainText('120 BHD');
  await expect(qatar).toHaveAttribute('data-price-hidden', 'false');
  await expect(qatar.locator('.price')).toContainText('130 BHD');
  const widths = await page.evaluate(() => ({ viewport:document.documentElement.clientWidth, content:document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
});

test('a per-route hide keeps its route card and contact CTA without hiding unrelated prices', async ({ page }) => {
  const routeScoped = routes.map((route) => route.route_slug === 'bahrain-to-qatar' ? { ...route, price_bhd:null, public_price_enabled:false, is_price_hidden:true } : route);
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, settings:{ booking_whatsapp:'97333225954', public_prices_enabled:true, hidden_price_destination_groups:[] }, routes:routeScoped }) }));
  await page.goto(`${base}/en/prices/`, { waitUntil:'domcontentloaded' });
  const qatar = page.locator('#priceList [data-route="bahrain-to-qatar"]');
  await expect(qatar.locator('.price')).toContainText('Get Live Seasonal Quote');
  await expect(page.locator('#priceList [data-route="bahrain-to-riyadh"] .price')).toContainText('120 BHD');
});

test('global and Saudi destination switches replace prices embedded in Arabic and English route content', async ({ page }) => {
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({ ok:true, settings:{ booking_whatsapp:'97333225954', booking_whatsapp_enabled:true, public_prices_enabled:false, hidden_price_destination_groups:[] }, routes })
  }));
  await page.setViewportSize({ width:390, height:844 });
  await page.goto(`${base}/bahrain-to-riyadh/`, { waitUntil:'domcontentloaded' });
  const arQuote = page.locator('a.vendora-hidden-price-cta').first();
  await expect(arQuote).toBeVisible();
  await expect(arQuote).toContainText('احصل على عرض سعر موسمي فوري');
  await expect(page.locator('.phase10-answer-first')).not.toContainText(/120\s*د\.ب/);

  await page.goto(`${base}/en/bahrain-to-riyadh/`, { waitUntil:'domcontentloaded' });
  const enQuote = page.locator('a.vendora-hidden-price-cta').first();
  await expect(enQuote).toBeVisible();
  await expect(enQuote).toContainText('Get Live Seasonal Quote');
  await expect(page.locator('.phase10-answer-first')).not.toContainText(/120\s*BHD/);
});

test('Saudi group hides assigned route copy while other destination pages keep their fare copy', async ({ page }) => {
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({ ok:true, settings:{ booking_whatsapp:'97333225954', public_prices_enabled:true, hidden_price_destination_groups:['saudi_arabia'] }, routes })
  }));
  await page.goto(`${base}/en/bahrain-to-riyadh/`, { waitUntil:'domcontentloaded' });
  await expect(page.locator('a.vendora-hidden-price-cta').first()).toContainText('Get Live Seasonal Quote');
  await expect(page.locator('.phase10-answer-first')).not.toContainText(/120\s*BHD/);

  await page.goto(`${base}/en/bahrain-to-qatar/`, { waitUntil:'domcontentloaded' });
  await expect(page.locator('a.vendora-hidden-price-cta')).toHaveCount(0);
});

test('editing a route price updates embedded copy on outbound and reverse-direction pages', async ({ page }) => {
  const updatedRoutes = routes.map((route) => route.route_slug === 'bahrain-to-riyadh'
    ? { ...route, price_bhd:155, approximate_sar_enabled:true }
    : route);
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({ ok:true, settings:{ booking_whatsapp:'97333225954', booking_whatsapp_enabled:true, sar_per_bhd:10, public_prices_enabled:true, hidden_price_destination_groups:[] }, routes:updatedRoutes })
  }));
  await page.goto(`${base}/en/bahrain-to-riyadh/`, { waitUntil:'domcontentloaded' });
  await expect(page.locator('.phase10-answer-first')).toContainText('155 BHD');
  await expect(page.locator('.phase10-answer-first')).not.toContainText('120 BHD');

  await page.goto(`${base}/en/riyadh-to-bahrain/`, { waitUntil:'domcontentloaded' });
  await expect(page.locator('main')).toContainText('155 BHD');
  await expect(page.locator('main')).not.toContainText('120 BHD');
});

test('settings outage fails closed on route pages and does not leave a hard-coded fare visible', async ({ page }) => {
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({ status:503, body:'Unavailable' }));
  await page.goto(`${base}/en/riyadh-to-bahrain/`, { waitUntil:'domcontentloaded' });
  await expect(page.locator('main')).toContainText('Get Live Seasonal Quote');
  await expect(page.locator('main')).not.toContainText('120 BHD');
});

test('pricing settings outage falls back to WhatsApp quotations instead of exposing cached amounts', async ({ page }) => {
  await page.route('**/api/transport/public-settings', (route) => route.fulfill({ status:503, body:'Unavailable' }));
  await page.goto(`${base}/en/prices/`, { waitUntil:'domcontentloaded' });
  const card = page.locator('#priceList [data-route="bahrain-to-riyadh"]');
  await expect(card).toHaveAttribute('data-price-hidden', 'true');
  await expect(card.locator('.price')).toContainText('Get Live Seasonal Quote');
  await expect(card).not.toContainText('120 BHD');
});

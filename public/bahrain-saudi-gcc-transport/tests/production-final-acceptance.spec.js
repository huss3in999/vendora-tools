import { test, expect } from '@playwright/test';

test('production final visitor and WhatsApp journey is preserved end to end', async ({ context, page }) => {
  test.skip(process.env.FINAL_PRODUCTION_ACCEPTANCE !== '1', 'Explicit production acceptance only');
  test.setTimeout(120_000);

  const tracked = [];
  page.on('request', (request) => {
    if (request.method() !== 'POST' || !/\/api\/(track|transport\/event)$/.test(new URL(request.url()).pathname)) return;
    try {
      tracked.push({ url: request.url(), payload: JSON.parse(request.postData() || '{}') });
    } catch {
      // A malformed payload will fail the assertions below rather than expose request data.
    }
  });
  await context.route('https://wa.me/**', (route) => route.abort());

  const root = 'https://getvendora.net/bahrain-saudi-gcc-transport/en';
  await page.goto(`${root}/bahrain-to-khobar/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.goto(`${root}/bahrain-to-dammam/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  let cta = page.locator('a[data-booking-submit], a[data-wa-message]').first();
  await cta.click();
  await page.locator('#vendora-booking-ready [data-booking-cancel]').last().click();
  await page.waitForTimeout(1400);

  await page.goto(`${root}/bahrain-to-riyadh/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  cta = page.locator('a[data-booking-submit], a[data-wa-message]').first();
  await cta.click();
  await page.locator('#vendora-booking-ready [data-booking-continue]').click();
  await page.waitForTimeout(1800);

  const analytics = tracked.map((entry) => entry.payload).filter((payload) => payload.event_name);
  const pageviews = analytics.filter((payload) => payload.event_name === 'page_view');
  const intents = analytics.filter((payload) => payload.event_name === 'whatsapp_intent');
  const cancels = analytics.filter((payload) => payload.event_name === 'whatsapp_cancel');
  const clicks = analytics.filter((payload) => payload.event_name === 'whatsapp_click' && Number(payload.confirmed_departure) === 1);
  const visitorIds = [...new Set(analytics.map((payload) => payload.visitor_id || payload.visitorId).filter(Boolean))];

  expect(pageviews).toHaveLength(3);
  expect(intents).toHaveLength(2);
  expect(cancels).toHaveLength(1);
  expect(clicks).toHaveLength(1);
  expect(visitorIds).toHaveLength(1);
  console.log(`FINAL_ACCEPTANCE_VISITOR=${visitorIds[0]}`);
});

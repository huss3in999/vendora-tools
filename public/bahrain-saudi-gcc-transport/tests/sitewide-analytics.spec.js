import { test, expect } from '@playwright/test';

test('route page emits one GA page view, route metadata, and one WhatsApp event', async ({ page }) => {
  const internal = [];
  await page.route('**/api/track', async (route) => {
    internal.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.addInitScript(() => {
    window.__gaCalls = [];
    Object.defineProperty(navigator, 'sendBeacon', { value: () => false });
  });
  await page.goto('/bahrain-saudi-gcc-transport/en/saudi-to-qatar/');
  await expect.poll(() => internal.filter((item) => item.event_name === 'page_view').length).toBe(1);
  await expect.poll(() => internal.filter((item) => item.event_name === 'route_view').length).toBe(1);
  const gaPageViews = await page.evaluate(() => (window.dataLayer || []).filter((entry) => entry?.[0] === 'event' && entry?.[1] === 'page_view').length);
  expect(gaPageViews).toBe(1);
  const routeView = internal.find((item) => item.event_name === 'route_view');
  expect(routeView.route_id || routeView.route_name).toBe('SA-QA');
  expect(routeView.origin_country).toBe('SA');
  expect(routeView.destination_country).toBe('QA');

  const whatsapp = page.locator('a[data-wa-message]', { hasText: 'Request a route quotation' }).first();
  await expect(whatsapp).toBeAttached();
  await whatsapp.dispatchEvent('click');
  await expect.poll(() => internal.filter((item) => item.event_name === 'whatsapp_intent').length).toBe(1);
  await expect.poll(() => internal.filter((item) => item.event_name === 'quote_request').length).toBe(1);

  const reverse = page.locator('[data-reverse-route]').first();
  await reverse.evaluate((node) => node.addEventListener('click', (event) => event.preventDefault(), { once: true }));
  await reverse.dispatchEvent('click');
  await expect.poll(() => internal.some((item) => item.event_name === 'navigation_click' && item.navigation_type === 'reverse_route')).toBeTruthy();

  const hub = page.locator('a[href*="/transport-from-"]').first();
  await hub.evaluate((node) => node.addEventListener('click', (event) => event.preventDefault(), { once: true }));
  await hub.dispatchEvent('click');
  await expect.poll(() => internal.some((item) => item.event_name === 'navigation_click' && item.navigation_type === 'country_hub')).toBeTruthy();

  await page.evaluate(() => {
    for (const [href, text] of [['tel:+97300000000', 'Call'], ['https://maps.app.goo.gl/synthetic', 'Map']]) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.addEventListener('click', (event) => event.preventDefault());
      document.body.append(link);
      link.click();
    }
  });
  await expect.poll(() => internal.filter((item) => item.event_name === 'phone_click').length).toBe(1);
  await expect.poll(() => internal.filter((item) => item.event_name === 'map_click').length).toBe(1);
});

test('WhatsApp funnel emits one intent, one cancel, and one confirmed departure', async ({ page }) => {
  const rawEvents = [];
  const leadActions = [];
  let leadNumber = 0;

  await page.route('**/api/track', async (route) => {
    const payload = JSON.parse(route.request().postData() || '{}');
    if (String(payload.event_name || '').startsWith('whatsapp_')) rawEvents.push(payload);
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.route('**/api/transport/event', async (route) => {
    const payload = JSON.parse(route.request().postData() || '{}');
    if (payload.action) {
      leadActions.push(payload.action);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    if (['pageview', 'presence_heartbeat'].includes(payload.serviceType)) {
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    leadNumber += 1;
    leadActions.push('create_lead');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, leadId: `lead-${leadNumber}`, booking_ref: `REF-${leadNumber}`, care_token: `token-${leadNumber}` }),
    });
  });

  await page.goto('/bahrain-saudi-gcc-transport/en/bahrain-to-khobar/');
  const cta = page.locator('a[data-booking-submit], a[data-wa-message]').first();
  await cta.click();
  await page.locator('#vendora-booking-ready [data-booking-cancel]').last().click();
  await page.waitForTimeout(1300);
  await cta.click();
  await page.locator('#vendora-booking-ready [data-booking-continue]').click();

  await expect.poll(() => rawEvents.filter((event) => event.event_name === 'whatsapp_intent').length).toBe(2);
  expect(rawEvents.filter((event) => event.event_name === 'whatsapp_cancel')).toHaveLength(1);
  const departures = rawEvents.filter((event) => event.event_name === 'whatsapp_click' && event.confirmed_departure === 1);
  expect(departures).toHaveLength(1);
  expect(leadActions).toEqual(['create_lead', 'cancel_whatsapp_handoff', 'create_lead', 'confirm_whatsapp_handoff']);
});

test('policy page is tracked and DNT disables all tracking', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const events = [];
  await page.route('**/api/track', async (route) => {
    events.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, body: '{"ok":true}' });
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/bahrain-saudi-gcc-transport/en/privacy/');
  await expect.poll(() => events.some((item) => item.event_name === 'policy_view')).toBeTruthy();
  await context.close();

  const dntContext = await browser.newContext();
  const dntPage = await dntContext.newPage();
  let tracked = 0;
  await dntPage.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { configurable: true, get: () => '1' }));
  await dntPage.route('**/api/track', async (route) => { tracked += 1; await route.abort(); });
  await dntPage.goto('/bahrain-saudi-gcc-transport/en/privacy/');
  await dntPage.waitForTimeout(500);
  expect(tracked).toBe(0);
  await dntContext.close();
});

test('authenticated analytics dashboard layout is responsive and remains untracked', async ({ page }) => {
  let trackingRequests = 0;
  await page.route('**/api/track', async (route) => { trackingRequests += 1; await route.abort(); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/bahrain-saudi-gcc-transport/admin/');
  await expect(page.locator('#analyticsPanel')).toBeAttached();
  await expect(page.locator('#analyticsAutoRefresh')).toBeAttached();
  await expect(page.locator('#analyticsRefreshSeconds option')).toHaveCount(2);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('#analyticsRoutes')).toBeAttached();
  expect(trackingRequests).toBe(0);
});

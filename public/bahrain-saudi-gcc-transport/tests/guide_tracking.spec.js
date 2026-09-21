import { test, expect } from '@playwright/test';

const arPath = '/bahrain-saudi-gcc-transport/gcc-private-transport-guide/';
const enPath = '/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/';

test.describe('GCC Private Transport Guide Telemetry & Tracking Integration', () => {

  test('Arabic and English pages load GA4 loader and fire pageview/track events without console errors', async ({ page }) => {
    const consoleErrors = [];
    const leadRequests = [];
    const trackRequests = [];

    // Capture console errors
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // Mock external tracking scripts
    await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ status: 204 }));
    await page.route('https://www.clarity.ms/**', (route) => route.fulfill({ status: 204 }));

    // Capture API Telemetry requests
    await page.route('**/api/transport/event', async (route) => {
      leadRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/api/track', async (route) => {
      trackRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) });
    });

    // --- Arabic Guide Page Test ---
    await page.goto(arPath, { waitUntil: 'domcontentloaded' });

    // Assert GA4 loader is loaded exactly once
    await expect(page.locator('script[src*="analytics-loader.js"]')).toHaveCount(1);
    
    // Assert no JavaScript errors on load
    expect(consoleErrors).toEqual([]);

    // Assert first pageview events are dispatched
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_page_view' && r.language === 'ar')).toBeTruthy();
    const pvTrack = trackRequests.find(r => r.event_name === 'gcc_guide_page_view');
    expect(pvTrack).toBeDefined();
    expect(pvTrack.language).toBe('ar');
    expect(pvTrack.page).toBe('gcc_private_transport_guide');

    await expect.poll(() => leadRequests.some(r => r.serviceType === 'pageview' && r.language === 'ar')).toBeTruthy();
    const pvLead = leadRequests.find(r => r.serviceType === 'pageview');
    expect(pvLead).toBeDefined();
    expect(pvLead.language).toBe('ar');

    // Clear trackers for English test
    trackRequests.length = 0;
    leadRequests.length = 0;

    // --- English Guide Page Test ---
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('script[src*="analytics-loader.js"]')).toHaveCount(1);
    expect(consoleErrors).toEqual([]);

    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_page_view' && r.language === 'en')).toBeTruthy();
    const pvTrackEn = trackRequests.find(r => r.event_name === 'gcc_guide_page_view');
    expect(pvTrackEn).toBeDefined();
    expect(pvTrackEn.language).toBe('en');
    expect(pvTrackEn.page).toBe('gcc_private_transport_guide');
  });

  test('Route planner choices, airport detection, custom location, and WhatsApp submission tracking', async ({ page }) => {
    const leadRequests = [];
    const trackRequests = [];

    await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ status: 204 }));
    await page.route('**/api/transport/event', async (route) => {
      leadRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/api/track', async (route) => {
      trackRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) });
    });

    await page.goto(enPath, { waitUntil: 'domcontentloaded' });

    // 1. Verify planner start event on input
    await page.selectOption('select[name="pickupCountry"]', 'Bahrain');
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_planner_start')).toBeTruthy();

    // 2. Select Bahrain International Airport (BAH) - should fire country, location, and airport detection
    await page.selectOption('select[name="pickupLocation"]', 'Bahrain International Airport (BAH)');
    
    // Verify airport detection event
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_airport_route_detected')).toBeTruthy();
    const airportEvent = trackRequests.find(r => r.event_name === 'gcc_guide_airport_route_detected');
    expect(airportEvent.airport).toBe('Bahrain International Airport (BAH)');
    expect(airportEvent.is_airport_route).toBe(1);

    // 3. Select Other/Not listed for Destination Country/Location
    await page.selectOption('select[name="destinationCountry"]', 'Saudi Arabia');
    await page.selectOption('select[name="destinationLocation"]', 'other');
    await page.fill('input[name="destinationCustom"]', 'Dammam Custom District');

    // Trigger update by clicking elsewhere or submitting
    await page.fill('input[name="flightNumber"]', 'GF 999');

    // Verify custom location events fired
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_custom_location_used')).toBeTruthy();
    const customEvent = trackRequests.find(r => r.event_name === 'gcc_guide_custom_location_used');
    expect(customEvent.custom_location_used).toBe(1);

    // 4. Click WhatsApp quote compiler button in planner
    const submitBtn = page.locator('form[data-route-planner] button[type="submit"]');
    
    // Catch WhatsApp redirect
    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204 }));

    await submitBtn.click();

    // Verify quote_generated event and whatsapp click event are fired
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_quote_generated')).toBeTruthy();
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_whatsapp_click')).toBeTruthy();
    
    const clickEvent = trackRequests.find(r => r.event_name === 'gcc_guide_whatsapp_click');
    expect(clickEvent.click_location).toBe('planner');
    expect(clickEvent.pickup_country).toBe('Bahrain');
    expect(clickEvent.destination_country).toBe('Saudi Arabia');
    expect(clickEvent.custom_location_used).toBe(1);
    expect(clickEvent.is_airport_route).toBe(1);
    expect(clickEvent.pickup_location).toBeUndefined();
    expect(clickEvent.destination_location).toBeUndefined();
    expect(clickEvent.flight_number).toBeUndefined();

    // Verify that sendLeadEvent passed the complete details of the route planner form
    await expect.poll(() => leadRequests.length).toBeGreaterThan(0);
    const leadObj = leadRequests.find(r => r.serviceType === 'passenger_transport');
    expect(leadObj).toBeDefined();
    expect(leadObj.fromCountry).toBe('Bahrain');
    expect(leadObj.fromCity).toBe('Bahrain International Airport (BAH)');
    expect(leadObj.toCountry).toBe('Saudi Arabia');
    expect(leadObj.toCity).toBe('Dammam Custom District');
    expect(leadObj.flight_number).toBe('GF 999');
  });

  test('Floating WhatsApp button click location detection and lead logging', async ({ page }) => {
    const leadRequests = [];
    const trackRequests = [];

    await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ status: 204 }));
    await page.route('**/api/transport/event', async (route) => {
      leadRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) });
    });
    await page.route('**/api/track', async (route) => {
      trackRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, body: JSON.stringify({ ok: true }) });
    });

    await page.goto(enPath, { waitUntil: 'domcontentloaded' });

    // Catch WhatsApp redirect
    await page.route('https://wa.me/**', (route) => route.fulfill({ status: 204 }));

    // Click floating WhatsApp button
    const floatingWa = page.locator('a.floating-wa');
    await floatingWa.click();

    // Verify click event is tracked with click_location as "floating button"
    await expect.poll(() => trackRequests.some(r => r.event_name === 'gcc_guide_whatsapp_click')).toBeTruthy();
    const clickEvent = trackRequests.find(r => r.event_name === 'gcc_guide_whatsapp_click');
    expect(clickEvent.click_location).toBe('floating button');

    // Verify lead event is logged to whatsapp_leads
    await expect.poll(() => leadRequests.some(r => r.serviceType === 'whatsapp_click')).toBeTruthy();
    const leadEvent = leadRequests.find(r => r.serviceType === 'whatsapp_click');
    expect(leadEvent.clickText).toBe('WA');
  });

});

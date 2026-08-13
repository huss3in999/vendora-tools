import { test, expect } from '@playwright/test';

const visitorA = 'persistent-visitor-a213';
const visitorB = 'persistent-visitor-b882';

function pageEvent({ id, visitorId, sessionId, clickedAt, routeLabel, routeSlug, path, source = '', city = 'Manama', country = 'BH', visitCount = 1 }) {
  return {
    id,
    visitor_id: visitorId,
    session_id: sessionId,
    clicked_at: clickedAt,
    service_type: 'pageview',
    route_label: routeLabel,
    route_slug: routeSlug,
    page_path: path,
    cf_city: city,
    cf_country: country,
    device_type: 'mobile',
    time_on_page_ms: 45000,
    visit_count: visitCount,
    raw_payload: JSON.stringify({
      visitorId,
      firstTrafficSource: source,
      firstLandingPath: path,
      browserName: 'Chrome',
      operatingSystem: 'Android',
    }),
  };
}

function waEvent({ id, serviceType, clickedAt, sessionId, confirmed = 0, status = 'new' }) {
  return {
    id,
    visitor_id: visitorA,
    session_id: sessionId,
    clicked_at: clickedAt,
    service_type: serviceType,
    status,
    route_label: 'Bahrain to Kuwait',
    route_slug: 'bahrain-to-kuwait',
    page_path: '/bahrain-saudi-gcc-transport/bahrain-to-kuwait/',
    cf_city: 'Manama',
    cf_country: 'BH',
    device_type: 'mobile',
    raw_payload: JSON.stringify({ visitorId: visitorA, firstTrafficSource: 'google', confirmed_departure: confirmed }),
    ...(confirmed ? { whatsapp_confirmed_at: clickedAt } : {}),
  };
}

const pageviews = [
  pageEvent({ id: 1, visitorId: visitorA, sessionId: 'session-a-1', clickedAt: '2026-08-12T08:00:00.000Z', routeLabel: 'Page A', routeSlug: 'bahrain-to-kuwait', path: '/bahrain-saudi-gcc-transport/bahrain-to-kuwait/', source: 'google' }),
  pageEvent({ id: 2, visitorId: visitorA, sessionId: 'session-a-1', clickedAt: '2026-08-12T08:01:00.000Z', routeLabel: 'Page B', routeSlug: 'bahrain-to-riyadh', path: '/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', source: 'google' }),
  pageEvent({ id: 3, visitorId: visitorA, sessionId: 'session-a-2', clickedAt: '2026-08-12T09:00:00.000Z', routeLabel: 'Page C', routeSlug: 'bahrain-to-dammam', path: '/bahrain-saudi-gcc-transport/bahrain-to-dammam/', source: 'google', visitCount: 2 }),
  pageEvent({ id: 4, visitorId: visitorB, sessionId: 'session-b-1', clickedAt: '2026-08-12T10:00:00.000Z', routeLabel: 'Bahrain to Riyadh', routeSlug: 'bahrain-to-riyadh', path: '/bahrain-saudi-gcc-transport/bahrain-to-riyadh/', source: '', city: 'Riyadh', country: 'SA' }),
];

const leads = [
  waEvent({ id: 11, serviceType: 'whatsapp_intent', clickedAt: '2026-08-12T08:02:00.000Z', sessionId: 'session-a-1' }),
  waEvent({ id: 12, serviceType: 'whatsapp_cancel', clickedAt: '2026-08-12T08:03:00.000Z', sessionId: 'session-a-1', status: 'cancelled' }),
  waEvent({ id: 13, serviceType: 'whatsapp_intent', clickedAt: '2026-08-12T09:01:00.000Z', sessionId: 'session-a-2' }),
  waEvent({ id: 14, serviceType: 'whatsapp_click', clickedAt: '2026-08-12T09:02:00.000Z', sessionId: 'session-a-2', confirmed: 1 }),
];

async function mockAdmin(page, googleResponse = null) {
  await page.route('https://getvendora.net/**/api/transport/admin**', async (route) => {
    const url = new URL(route.request().url());
    const resource = url.searchParams.get('resource') || 'leads';
    let body = { ok: true };
    if (resource === 'routes') body.routes = [];
    else if (resource === 'leads') body.leads = leads;
    else if (resource === 'pageviews') body.leads = pageviews;
    else if (resource === 'summary') body.summary = { total_visitors: 2, new_visitors: 1, returning_visitors: 1, total_sessions: 3, total_pageviews: 4, whatsapp_intents_count: 0, whatsapp_cancelled_count: 0, whatsapp_departed_count: 1, left_without_whatsapp: 1, traffic_metrics_source: 'ga4' };
    else if (resource === 'notification-settings') body.notification_settings = {};
    else if (resource === 'errors') body.errors = [];
    else if (resource === 'passenger-care') body.feedback = [];
    else if (resource === 'public-settings') body.public_config = { settings: {}, routes: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route('https://getvendora.net/**/api/transport/google-audience**', async (route) => {
    const payload = googleResponse || {
      ok: false,
      connected: false,
      reason: 'missing_secret',
      message: 'Google Audience is not connected. Configure GA4_SERVICE_ACCOUNT_JSON.',
    };
    await route.fulfill({ status: payload.ok ? 200 : 503, contentType: 'application/json', body: JSON.stringify(payload) });
  });
}

async function login(page) {
  await page.goto('/bahrain-saudi-gcc-transport/admin/');
  await page.locator('#tokenInput').fill('test-token');
  await page.locator('#loginForm').evaluate((form) => form.requestSubmit());
  await expect(page.locator('#dashboardView')).toBeVisible();
  await expect(page.locator('#ownerVisitors')).toHaveText('2');
  await expect(page.locator('#ownerWhatsApp')).toHaveText('1');
  await expect(page.locator('#ownerWhatsAppDetail')).toContainText('completed the WhatsApp handoff');
  await expect(page.locator('#trafficMetricsSourceBadge')).toContainText('GA4 verified');
}

test('Recent Activity renders one updating card per visitor and opens full history', async ({ page }) => {
  await mockAdmin(page);
  await login(page);
  await page.evaluate(() => setTab('reports'));

  const cards = page.locator('#activityFeed [data-activity-visitor]');
  await expect(cards).toHaveCount(2);
  const visitorCard = cards.filter({ hasText: 'V-A213' });
  await expect(visitorCard).toHaveCount(1);
  await expect(visitorCard).toContainText('Returning');
  await expect(visitorCard).toContainText('Google');
  await expect(visitorCard).toContainText('Landing: Bahrain → Kuwait');
  await expect(visitorCard).toContainText('3 pages');
  await expect(visitorCard).toContainText('45s');
  await expect(visitorCard).toContainText('Final: WhatsApp Clicked');
  await expect(cards.filter({ hasText: 'V-B882' })).toContainText('Direct / Unknown');

  await visitorCard.click();
  await expect(page.locator('#visitorDialog')).toBeVisible();
  await expect(page.locator('#visitorDialogBody')).toContainText('Chronological Visitor Journey');
  await expect(page.locator('#visitorDialogBody')).toContainText('WhatsApp Intent Triggered');
  await expect(page.locator('#visitorDialogBody')).toContainText('WhatsApp Confirmation Cancelled');
  await expect(page.locator('#visitorDialogBody')).toContainText('WhatsApp Clicked');
});

test('Recent Activity source labels include Google, ChatGPT and Direct / Unknown', async ({ page }) => {
  await mockAdmin(page);
  await login(page);
  await page.evaluate(() => {
    state.leads = [];
    state.pageviews = [
      { id: 101, visitor_id: 'source-google', session_id: 'sg', clicked_at: '2026-08-12T10:00:00Z', service_type: 'pageview', page_path: '/', raw_payload: JSON.stringify({ firstTrafficSource: 'google' }) },
      { id: 102, visitor_id: 'source-chatgpt', session_id: 'sc', clicked_at: '2026-08-12T10:01:00Z', service_type: 'pageview', page_path: '/', raw_payload: JSON.stringify({ firstTrafficSource: 'chatgpt.com' }) },
      { id: 103, visitor_id: 'source-direct', session_id: 'sd', clicked_at: '2026-08-12T10:02:00Z', service_type: 'pageview', page_path: '/', raw_payload: '{}' },
    ];
    renderActivityFeed();
  });
  const feed = page.locator('#activityFeed');
  await expect(feed).toContainText('Google');
  await expect(feed).toContainText('ChatGPT');
  await expect(feed).toContainText('Direct / Unknown');
  await expect(feed.locator('[data-activity-visitor]')).toHaveCount(3);
});

test('mobile menu is compact, retains bottom navigation and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdmin(page);
  await login(page);
  await page.locator('[data-app-jump="menu"]').click();
  await expect(page.locator('#appNav')).toBeVisible();

  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    menuCards: [...document.querySelectorAll('#appNav .tab-btn')].map((el) => {
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
    dockLabels: [...document.querySelectorAll('#mobileDock [data-app-jump]')].map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
  }));
  expect(layout.overflow).toBe(false);
  expect(layout.menuCards.every((card) => card.height <= 70 && card.width > card.height)).toBe(true);
  expect(layout.dockLabels).toEqual(['Home', 'Live', 'Visitors', 'Reports', 'Menu']);
  await expect(page.locator('#appNav [data-tab="googleAudience"]')).toBeVisible();
});

test('Google Audience displays aggregate data without affecting core admin', async ({ page }) => {
  await mockAdmin(page, {
    ok: true,
    connected: true,
    isolated: true,
    property_id: '528414332',
    effective_days: 30,
    audience: {
      age: { available: true, rows: [{ label: '25-34', active_users: 8 }], known_users: 8, unknown_users: 2 },
      gender: { available: true, rows: [{ label: 'Female', active_users: 5 }, { label: 'Male', active_users: 3 }], known_users: 8, unknown_users: 1 },
      countries: [{ label: 'Bahrain', active_users: 7 }],
      sources: [{ label: 'google', active_users: 6 }],
    },
  });
  await login(page);
  await page.evaluate(() => setTab('googleAudience'));
  await expect(page.locator('#googleAudienceStatus')).toContainText('Connected to GA4 property 528414332');
  await expect(page.locator('#googleAudienceAge')).toContainText('25-34');
  await expect(page.locator('#googleAudienceGender')).toContainText('Female');
  await expect(page.locator('#googleAudienceCountries')).toContainText('Bahrain');

  await page.evaluate(() => setTab('home'));
  await expect(page.locator('#ownerSnapshot')).toBeVisible();
  await expect(page.locator('#ownerVisitors')).toHaveText('2');
});

test('missing Google secret stays isolated and core admin remains usable', async ({ page }) => {
  await mockAdmin(page);
  await login(page);
  await page.evaluate(() => setTab('googleAudience'));
  await expect(page.locator('#googleAudienceStatus')).toContainText('Google Audience is not connected');
  await expect(page.locator('#googleAudienceAge')).toContainText('Demographic data not available yet');
  await page.evaluate(() => setTab('reports'));
  await expect(page.locator('#reportCards')).toBeVisible();
  await expect(page.locator('#reportCards')).toContainText('Visitors');
});

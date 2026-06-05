import { test, expect } from '@playwright/test';

const TEST_REF = 'GCC-A1B2C3D4';
const TEST_UUID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

function captureWhatsAppClick(page) {
  return page.waitForRequest((req) => req.url().includes('wa.me/'), { timeout: 15000 });
}

async function stubWhatsAppNavigation(page) {
  await page.route('https://wa.me/**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
}

function mockLeadApi(page, bookingRef = TEST_REF, leadId = TEST_UUID) {
  const handler = async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, leadId, booking_ref: bookingRef }),
    });
  };
  return Promise.all([
    page.route('**/api/transport/event', handler),
    page.route('**/bahrain-saudi-gcc-transport/api/transport/event', handler),
  ]);
}

function mockPassengerCareApi(page, options = {}) {
  const { getBody, postBody, alreadySubmitted = false } = options;
  const handler = async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(getBody || {
          ok: true,
          booking_ref: TEST_REF,
          already_submitted: alreadySubmitted,
        }),
      });
      return;
    }
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(postBody || {
          ok: true,
          already_submitted: alreadySubmitted,
          booking_ref: TEST_REF,
        }),
      });
    }
  };
  return Promise.all([
    page.route('**/api/transport/passenger-care**', handler),
    page.route('**/bahrain-saudi-gcc-transport/api/transport/passenger-care**', handler),
  ]);
}

test.describe('Passenger Care pages', () => {
  test('Arabic care page is noindex and loads with updated copy', async ({ page }) => {
    await mockPassengerCareApi(page, {
      getBody: {
        ok: true,
        booking_ref: TEST_REF,
        route_label: 'توصيل مطار البحرين',
        already_submitted: false,
      },
    });

    await page.goto(`/bahrain-saudi-gcc-transport/care/?ref=${TEST_REF}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
    await expect(page.locator('h1')).toContainText('متابعة الرحلة');
    await expect(page.locator('#trustLead')).toContainText('20');
    await expect(page.locator('#questionText')).toContainText('كيف انتهت رحلتك');
    await expect(page.locator('#submitBtn')).toContainText('تأكيد وإرسال');
    await expect(page.locator('#footerNote')).toContainText('سرية');
  });

  test('English care page is noindex and loads with updated copy', async ({ page }) => {
    await mockPassengerCareApi(page, {
      getBody: {
        ok: true,
        booking_ref: TEST_REF,
        route_label: 'Bahrain Airport Transfer',
        already_submitted: false,
      },
    });

    await page.goto(`/bahrain-saudi-gcc-transport/care/en/?ref=${TEST_REF}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
    await expect(page.locator('h1')).toContainText('Journey Follow-Up');
    await expect(page.locator('#questionText')).toContainText('How did your journey');
    await expect(page.locator('#submitBtn')).toContainText('Confirm & Submit');
  });

  test('Invalid booking ref format shows error state', async ({ page }) => {
    await page.goto('/bahrain-saudi-gcc-transport/care/en/?ref=NOT-VALID', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#errorView')).toBeVisible();
  });

  test('Submit feedback works', async ({ page }) => {
    let posted = false;
    await page.route('**/passenger-care**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, booking_ref: TEST_REF, already_submitted: false }),
        });
        return;
      }
      posted = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, already_submitted: false, booking_ref: TEST_REF }),
      });
    });

    await page.goto(`/bahrain-saudi-gcc-transport/care/en/?ref=${TEST_REF}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-outcome="completed"]').click();
    await page.locator('#submitBtn').click();
    await expect(page.locator('#thanksView')).toBeVisible();
    await expect(page.locator('#thanksBody')).toContainText('received successfully');
    expect(posted).toBeTruthy();
  });

  test('Duplicate feedback lock works', async ({ page }) => {
    await mockPassengerCareApi(page, { alreadySubmitted: true });

    await page.goto(`/bahrain-saudi-gcc-transport/care/en/?ref=${TEST_REF}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#lockedView')).toBeVisible();
    await expect(page.locator('#lockedBody')).toContainText('already been submitted');
  });
});

test.describe('WhatsApp passenger care append', () => {
  test('Arabic homepage data-wa-message adds booking ref, care block, and short link', async ({ page }) => {
    await mockLeadApi(page);
    await stubWhatsAppNavigation(page);

    await page.goto('/bahrain-saudi-gcc-transport/', { waitUntil: 'networkidle' });
    const waRequest = captureWhatsAppClick(page);
    await page.locator('a[data-wa-message]').first().click();
    const openedUrl = (await waRequest).url();

    expect(openedUrl).toMatch(/GCC-[A-F0-9]{8}/);
    const decoded = decodeURIComponent(openedUrl);
    expect(decoded).toMatch(/رقم الحجز/);
    expect(decoded).toMatch(/رعاية المسافر/);
    expect(decoded).toMatch(/g\.getvendora\.net\/gcc-[a-f0-9]{8}/);
  });

  test('Arabic airport page intercepts data-wa-message', async ({ page }) => {
    await mockLeadApi(page);
    await stubWhatsAppNavigation(page);

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-airport-transfer/', { waitUntil: 'networkidle' });
    const waRequest = captureWhatsAppClick(page);
    await page.locator('a[data-wa-message]').first().click();
    const openedUrl = (await waRequest).url();

    expect(decodeURIComponent(openedUrl)).toMatch(/GCC-[A-F0-9]{8}/);
    expect(decodeURIComponent(openedUrl)).toMatch(/رعاية المسافر/);
  });

  test('English page hardcoded wa.me adds Booking Ref, Passenger Care, English care link', async ({ page }) => {
    await mockLeadApi(page, 'GCC-B2C3D4E5', 'b2c3d4e5-f6a7-4890-b123-456789abcdef');
    await stubWhatsAppNavigation(page);

    await page.goto('/bahrain-saudi-gcc-transport/en/', { waitUntil: 'networkidle' });
    const waRequest = captureWhatsAppClick(page);
    await page.locator('a[data-track-wa], a.floating-wa, a[data-wa-preserved-href]').first().click();
    const decoded = decodeURIComponent((await waRequest).url());

    expect(decoded).toMatch(/GCC-[A-F0-9]{8}/);
    expect(decoded).toContain('Booking Ref:');
    expect(decoded).toContain('Passenger Care:');
    expect(decoded).toContain('g.getvendora.net/gcc-en-');
  });

  test('Floating WhatsApp button works', async ({ page }) => {
    await mockLeadApi(page);
    await stubWhatsAppNavigation(page);

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-airport-transfer/', { waitUntil: 'networkidle' });
    const floatBtn = page.locator('a.floating-wa').first();
    await expect(floatBtn).toBeVisible();
    const waRequest = captureWhatsAppClick(page);
    await floatBtn.click();
    expect(decodeURIComponent((await waRequest).url())).toMatch(/GCC-[A-F0-9]{8}/);
  });

  test('Still opens WhatsApp with care block when lead API fails', async ({ page }) => {
    await page.route('**/api/transport/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.continue();
    });
    await page.route('**/bahrain-saudi-gcc-transport/api/transport/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.continue();
    });
    await stubWhatsAppNavigation(page);

    await page.goto('/bahrain-saudi-gcc-transport/bahrain-airport-transfer/', { waitUntil: 'networkidle' });
    const waRequest = captureWhatsAppClick(page);
    await page.locator('a[data-wa-message]').first().click();
    const decoded = decodeURIComponent((await waRequest).url());

    expect(decoded).toContain('wa.me/');
    expect(decoded).toMatch(/GCC-[A-F0-9]{8}/);
    expect(decoded).toMatch(/رعاية المسافر/);
  });
});

test.describe('Admin Passenger Care tab (mocked API)', () => {
  async function setupAdminMocks(page, handler) {
    await page.addInitScript(() => {
      window.__VENDORA_TRANSPORT_ADMIN_API__ = '/bahrain-saudi-gcc-transport/api/transport/admin';
    });
    await page.route('**/api/transport/admin**', handler);
  }

  async function unlockAdmin(page) {
    await page.goto('/bahrain-saudi-gcc-transport/admin/', { waitUntil: 'domcontentloaded' });
    await page.fill('#tokenInput', '33404044');
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 15000 });
  }

  const defaultAdminPayload = {
    leads: [],
    routes: [],
    errors: [],
    notification_settings: {},
    summary: { online_transport: 0, online_care: 0, online_recent: [] },
    feedback: [],
  };

  test('Care tab shows feedback with original route and separate countries', async ({ page }) => {
    await setupAdminMocks(page, async (route) => {
      const url = new URL(route.request().url());
      const resource = url.searchParams.get('resource') || 'leads';

      if (resource === 'passenger-care') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            feedback: [{
              booking_ref: TEST_REF,
              clicked_at: '2026-06-05T10:00:00.000Z',
              route_label: 'Bahrain Airport Transfer',
              route_slug: 'bahrain-airport-transfer',
              page_path: '/bahrain-saudi-gcc-transport/bahrain-airport-transfer/',
              feedback_language: 'en',
              outcome: 'completed',
              rating: 5,
              feedback_submitted_at: '2026-06-05T11:00:00.000Z',
              lead_country: 'BH',
              feedback_country: 'SA',
              comment: 'Great service',
            }],
          }),
        });
        return;
      }

      const body = { ok: true, ...defaultAdminPayload };
      if (resource === 'leads') body.leads = defaultAdminPayload.leads;
      if (resource === 'pageviews') body.leads = [];
      if (resource === 'routes') body.routes = [];
      if (resource === 'summary') body.summary = defaultAdminPayload.summary;
      if (resource === 'notification-settings') body.notification_settings = {};
      if (resource === 'errors') body.errors = [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await unlockAdmin(page);
    await page.click('[data-tab="passengerCare"]');
    await expect(page.locator('#passengerCareTable')).toContainText('Bahrain Airport Transfer');
    await expect(page.locator('#passengerCareTable')).not.toContainText('Passenger Care');
    await expect(page.locator('#passengerCareTable')).toContainText('BH');
    await expect(page.locator('#passengerCareTable')).toContainText('SA');
  });

  test('Admin search by Booking Ref and delete feedback works', async ({ page }) => {
    let deleted = false;
    await setupAdminMocks(page, async (route) => {
      const url = new URL(route.request().url());
      const resource = url.searchParams.get('resource') || 'leads';

      if (route.request().method() === 'DELETE' && resource === 'passenger-care') {
        deleted = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, deleted: 1 }) });
        return;
      }

      if (resource === 'passenger-care') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            feedback: [{
              id: 1,
              booking_ref: TEST_REF,
              clicked_at: '2026-06-05T10:00:00.000Z',
              route_label: 'Bahrain Airport Transfer',
              page_path: '/bahrain-saudi-gcc-transport/bahrain-airport-transfer/',
              outcome: 'completed',
              feedback_submitted_at: '2026-06-05T11:00:00.000Z',
              lead_country: 'BH',
              feedback_country: 'BH',
            }],
          }),
        });
        return;
      }

      const body = { ok: true, ...defaultAdminPayload };
      if (resource === 'summary') body.summary = defaultAdminPayload.summary;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await unlockAdmin(page);
    await page.click('[data-tab="passengerCare"]');
    await page.locator('#passengerCareTable [data-view-care="0"]').click();
    await expect(page.locator('#careFeedbackDialog')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#deleteCareFeedbackBtn');
    await page.waitForTimeout(500);
    expect(deleted).toBeTruthy();
  });

  test('Clicks tab excludes passenger-care stub routes', async ({ page }) => {
    await setupAdminMocks(page, async (route) => {
      const url = new URL(route.request().url());
      const resource = url.searchParams.get('resource') || 'leads';

      if (resource === 'leads') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            leads: [{
              id: 99,
              clicked_at: '2026-06-05T09:00:00.000Z',
              route_label: 'Bahrain Airport Transfer',
              route_slug: 'bahrain-airport-transfer',
              page_path: '/bahrain-saudi-gcc-transport/bahrain-airport-transfer/',
              service_type: 'whatsapp',
              cf_country: 'BH',
              status: 'new',
              suspicion_score: 0,
            }],
          }),
        });
        return;
      }

      const body = { ok: true, ...defaultAdminPayload };
      if (resource === 'summary') body.summary = { online_transport: 1, online_care: 0, online_recent: [] };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await unlockAdmin(page);
    await expect(page.locator('#leadsTable')).toContainText('Bahrain Airport Transfer');
    await expect(page.locator('#leadsTable')).not.toContainText('Passenger Care');
  });

  test('Online visitor summary excludes care pages from transport count label', async ({ page }) => {
    await setupAdminMocks(page, async (route) => {
      const url = new URL(route.request().url());
      const resource = url.searchParams.get('resource') || 'leads';

      if (resource === 'summary') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            summary: {
              online_transport: 2,
              online_care: 1,
              online_recent: [
                { person_key: 'a', route_label: 'Home', page_path: '/bahrain-saudi-gcc-transport/', country: 'BH', last_seen: new Date().toISOString(), seconds_on_page: 30, pages_viewed: 1, clicked_whatsapp: 0, device_type: 'desktop', language: 'ar' },
              ],
            },
          }),
        });
        return;
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ...defaultAdminPayload }) });
    });

    await unlockAdmin(page);
    await expect(page.locator('#onlineNowText')).toContainText('2 transport online');
    await expect(page.locator('#onlineCareText')).toContainText('1 on care pages');
  });
});

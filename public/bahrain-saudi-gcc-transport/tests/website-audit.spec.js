import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE = process.env.AUDIT_LIVE === '1' || process.env.CI === 'true';
const baseURL = LIVE ? 'https://getvendora.net' : 'http://127.0.0.1:4173';
const ADMIN_TOKEN = process.env.TRANSPORT_ADMIN_TOKEN || '33404044';

test.describe.configure({ mode: 'parallel' });

test.describe('Live API health (requires deployed worker)', () => {
  test.skip(!LIVE, 'Set AUDIT_LIVE=1 to run against getvendora.net');

  for (const path of [
    '/api/transport/health',
    '/api/transport/passenger-care?ref=GCC-00000000',
    '/bahrain-saudi-gcc-transport/api/transport/health',
    '/bahrain-saudi-gcc-transport/api/transport/passenger-care?ref=GCC-00000000',
  ]) {
    test(`GET ${path} returns 200`, async ({ request }) => {
      const res = await request.get(`${baseURL}${path}`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.ok).toBeTruthy();
    });
  }

  test('Passenger Care POST submit and duplicate lock', async ({ request }) => {
    const ref = `GCC-${Date.now().toString(16).slice(-8).toUpperCase().padStart(8, '0')}`;
    const post1 = await request.post(`${baseURL}/api/transport/passenger-care`, {
      data: { ref, outcome: 'completed', language: 'en', comment: 'audit' },
    });
    expect(post1.status()).toBe(201);
    const body1 = await post1.json();
    expect(body1.ok).toBe(true);
    expect(body1.already_submitted).toBe(false);

    const post2 = await request.post(`${baseURL}/api/transport/passenger-care`, {
      data: { ref, outcome: 'completed', language: 'en' },
    });
    expect(post2.status()).toBe(200);
    const body2 = await post2.json();
    expect(body2.already_submitted).toBe(true);

    await request.delete(`${baseURL}/api/transport/admin?resource=passenger-care&booking_ref=${encodeURIComponent(ref)}`, {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
  });

  test('Admin unlock and dashboard', async ({ request }) => {
    const summary = await request.get(`${baseURL}/api/transport/admin?resource=summary`, {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    expect(summary.status()).toBe(200);
    const data = await summary.json();
    expect(data.ok).toBe(true);
    expect(typeof data.summary.online_transport).toBe('number');
    expect(typeof data.summary.online_care).toBe('number');
  });
});

test.describe('GCC Transport tracking samples', () => {
  test('Arabic transport page sends pageview to transport event API', async ({ page }) => {
    const events = [];
    await page.route('**/api/transport/event', async (route) => {
      if (route.request().method() === 'POST') events.push(route.request());
      await route.continue();
    });
    await page.route('**/bahrain-saudi-gcc-transport/api/transport/event', async (route) => {
      if (route.request().method() === 'POST') events.push(route.request());
      await route.continue();
    });

    await page.goto(`${baseURL}/bahrain-saudi-gcc-transport/bahrain-airport-transfer/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    expect(await page.locator('body').count()).toBe(1);
    if (LIVE) {
      await page.waitForTimeout(3000);
      expect(events.length).toBeGreaterThan(0);
    }
  });

  test('Care page POST works in browser', async ({ page }) => {
    test.skip(!LIVE, 'Live only');
    const ref = `GCC-${Date.now().toString(16).slice(-8).toUpperCase().padStart(8, '0')}`;
    await page.goto(`${baseURL}/bahrain-saudi-gcc-transport/care/en/?ref=${ref}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-outcome="completed"]').click();
    await page.locator('#submitBtn').click();
    await expect(page.locator('#thanksView')).toBeVisible({ timeout: 15000 });
    await page.request.delete(`${baseURL}/api/transport/admin?resource=passenger-care&booking_ref=${encodeURIComponent(ref)}`, {
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
    });
  });
});

test.describe('Static audit report assertions', () => {
  test('audit-report.json exists and has reasonable counts', async () => {
    const reportPath = join(dirname(fileURLToPath(import.meta.url)), 'audit-report.json');
    test.skip(!existsSync(reportPath), 'Run node scripts/audit-website-tracking.mjs first');
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(report.totalPages).toBeGreaterThan(100);
    expect(report.http404.length).toBeLessThan(50);
    expect(report.transportMissingSiteJs.length).toBeLessThan(20);
  });
});

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route(/google-analytics|googletagmanager|clarity\.ms/, r => r.abort());
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }));
  await context.route('**/api/transport/event', r => r.fulfill({ status: 503, json: { ok: false } }));
});

for (const path of ['/', '/bahrain-saudi-gcc-transport/', '/bahrain-saudi-gcc-transport/en/']) {
  test(`${path} initializes and contacts WhatsApp with one click despite unavailable lead API`, async ({ page, context }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
    const form = page.locator('[data-booking-form]').first();
    await expect(form).toHaveAttribute('data-booking-ready', 'true');
    const cta = page.locator('a[href^="https://wa.me/97333225954"]').first();
    const outgoing = context.waitForEvent('request', { predicate: r => r.url().startsWith('https://wa.me/') });
    await cta.click();
    const url = new URL((await outgoing).url());
    expect(url.pathname).toBe('/97333225954');
    expect(url.searchParams.get('text')).toBeTruthy();
    await expect(page.locator('#vendora-booking-ready, #vendora-contact-step')).toHaveCount(0);
    expect(await page.locator('body').innerText()).not.toMatch(/AI Planner|AI Concierge|الذكاء الاصطناعي/);
  });
}

test('homepage free-text request keeps entered locations and needs only the route', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('[data-booking-extra="pickup-location"]').fill('Bahrain Airport');
  await page.locator('[data-booking-extra="destination-location"]').fill('Seef hotel');
  const request = context.waitForEvent('request', { predicate: r => r.url().startsWith('https://wa.me/') });
  await page.locator('[data-booking-submit]').click();
  const message = new URL((await request).url()).searchParams.get('text');
  expect(message).toContain('Bahrain Airport');
  expect(message).toContain('Seef hotel');
});

for (const language of ['', 'en/']) {
  test(`${language || 'Arabic'} route pages publish fares and bypass redundant forms`, async ({ page }) => {
    for (const slug of ['bahrain-to-khobar', 'bahrain-to-dammam', 'bahrain-airport-transfer', 'hotel-transfer-bahrain']) {
      await page.goto(`/bahrain-saudi-gcc-transport/${language}${slug}/`, { waitUntil: 'networkidle' });
      await expect(page.locator('[data-booking-form]')).toHaveCount(0);
      await expect(page.locator('footer small').filter({ hasText: '134858-1' })).toHaveCount(1);
      const title = await page.title();
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', title);
      if (slug.includes('airport') || slug.includes('hotel')) {
        await expect(page.locator('[data-local-transfer-pricing]')).toContainText('15');
        await expect(page.locator('[data-local-transfer-pricing]')).toContainText('20');
        await expect(page.locator('[data-local-transfer-pricing]')).toContainText('25');
      }
      if (language) expect(await page.locator('body').innerText()).not.toMatch(/[\u0600-\u06ff]/);
    }
  });
}

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const base = '/bahrain-saudi-gcc-transport';
const fixtureSettings = {
  booking_whatsapp: '97300000000',
  booking_whatsapp_enabled: true,
  sar_per_bhd: 10
};

function publicRoute(overrides = {}) {
  return {
    route_slug: 'bahrain-to-riyadh',
    route_name_ar: 'البحرين إلى الرياض',
    route_name_en: 'Bahrain to Riyadh',
    price_bhd: 123,
    price_kind: 'standard',
    unit_kind: 'one_way_vehicle',
    currency: 'BHD',
    trip_type: 'one_way',
    public_price_enabled: true,
    approximate_sar_enabled: true,
    is_active: true,
    ...overrides
  };
}

async function mockPublicSettings(page, routes = [publicRoute()]) {
  await page.route('**/api/transport/**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, settings: fixtureSettings, routes }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, booking_ref: 'VND-TEST', care_token: 'test-care' }) });
    }
  });
}

async function openCalculator(page, language = 'en', routes) {
  await mockPublicSettings(page, routes);
  const prefix = language === 'en' ? '/en' : '';
  await page.goto(`${base}${prefix}/gcc-transport-planner/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-calculator-mode]')).toHaveCount(3);
}

test('three calculator modes are accessible by pointer and keyboard in LTR and RTL', async ({ page }) => {
  await openCalculator(page, 'en');
  const priceTab = page.locator('[data-calculator-mode="price"]');
  await priceTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('button[data-calculator-mode="process"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.locator('button[data-calculator-mode="airport"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-mode-only="airport"]')).toBeVisible();

  await openCalculator(page, 'ar');
  await page.locator('[data-calculator-mode="price"]').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('button[data-calculator-mode="process"]')).toHaveAttribute('aria-selected', 'true');
});

test('configured one-way D1 price resolves with permitted BHD and approximate SAR', async ({ page }) => {
  await openCalculator(page, 'en');
  await page.locator('[data-planner-from]').selectOption('bahrain');
  await page.locator('[data-planner-to]').selectOption('riyadh');
  await expect(page.locator('[data-result-price]')).toHaveText('123 BHD · approx. 1230 SAR');
  await expect(page.locator('[data-result-price-unit]')).toContainText('one way');
});

test('return never doubles one-way pricing and uses a configured return quotation only', async ({ page }) => {
  await openCalculator(page, 'en');
  await page.locator('[data-planner-from]').selectOption('bahrain');
  await page.locator('[data-planner-to]').selectOption('riyadh');
  await page.locator('input[name="calculator-direction"][value="return"]').check();
  await expect(page.locator('[data-result-price]')).toHaveText('Request a confirmed quotation');

  await page.unrouteAll({ behavior: 'wait' });
  await openCalculator(page, 'en', [publicRoute({ trip_type: 'return_quote', approximate_sar_enabled: false })]);
  await page.locator('[data-planner-from]').selectOption('bahrain');
  await page.locator('[data-planner-to]').selectOption('riyadh');
  await page.locator('input[name="calculator-direction"][value="return"]').check();
  await expect(page.locator('[data-result-price]')).toHaveText('123 BHD');
  await expect(page.locator('[data-result-type]')).toHaveText('Return');
});

test('disabled, unsupported and non-BHD routes remain quotation requests', async ({ page }) => {
  await openCalculator(page, 'en', [publicRoute({ public_price_enabled: false })]);
  await page.locator('[data-planner-from]').selectOption('bahrain');
  await page.locator('[data-planner-to]').selectOption('riyadh');
  await expect(page.locator('[data-result-price]')).toHaveText('Request a confirmed quotation');
  await page.locator('[data-planner-from]').selectOption('doha');
  await page.locator('[data-planner-to]').selectOption('muscat');
  await expect(page.locator('[data-result-support]')).toHaveText('Needs confirmation');
});

test('forward and reverse route timing and Saudi journey stages remain truthful', async ({ page }) => {
  await openCalculator(page, 'en');
  await page.locator('[data-calculator-mode="process"]').click();
  await page.locator('[data-planner-from]').selectOption('manama');
  await page.locator('[data-planner-to]').selectOption('riyadh');
  await expect(page.locator('[data-result-time]')).toHaveText('4.5 to 6 hours');
  await expect(page.locator('[data-result-timeline]')).toContainText('King Fahd Causeway crossing');
  await page.locator('[data-planner-from]').selectOption('riyadh');
  await page.locator('[data-planner-to]').selectOption('manama');
  await expect(page.locator('[data-result-time]')).toHaveText('4.5 to 6 hours');
  await expect(page.locator('[data-result-summary]')).toHaveText('Riyadh to Manama');
});

test('airport, hourly and configured full-day requests behave without invented rates', async ({ page }) => {
  const fullDay = publicRoute({
    route_slug: 'bahrain-sightseeing-full-day',
    unit_kind: 'package',
    trip_type: 'full_day',
    approximate_sar_enabled: false
  });
  await openCalculator(page, 'en', [fullDay]);
  await page.locator('[data-calculator-mode="airport"]').click();
  await page.locator('[data-calculator-airport-service]').selectOption('hourly');
  await expect(page.locator('[data-result-price]')).toHaveText('Request a confirmed quotation');
  await page.locator('[data-calculator-airport-service]').selectOption('full-day');
  await page.locator('[data-calculator-package]').selectOption('bahrain-sightseeing-full-day');
  await expect(page.locator('[data-result-price]')).toHaveText('123 BHD');
  await expect(page.locator('[data-result-price-unit]')).toContainText('package');
  await page.locator('[data-calculator-flight]').fill('GF 501');
  await expect(page.locator('[data-result-airport]')).toContainText('flight number');
});

test('WhatsApp and bottom navigation always receive the latest calculator values', async ({ page }) => {
  await openCalculator(page, 'en');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-planner-from]').selectOption('manama');
  await page.locator('[data-planner-to]').selectOption('riyadh');
  await page.locator('[data-planner-passengers]').fill('5');
  await page.locator('[data-planner-notes]').fill('Two child seats requested');
  const latest = page.locator('[data-planner-whatsapp]');
  await expect(latest).toHaveAttribute('data-wa-message', /From: .*Manama/);
  await expect(latest).toHaveAttribute('data-wa-message', /To: .*Riyadh/);
  await expect(latest).toHaveAttribute('data-wa-message', /Passengers: 5/);
  await expect(latest).toHaveAttribute('data-wa-message', /Two child seats requested/);
  await expect(page.locator('[data-vip-bottom-whatsapp]')).toHaveAttribute('data-wa-message', /Passengers: 5/);
});

test('mobile bottom navigation labels, safe spacing and WhatsApp control are correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCalculator(page, 'en');
  await expect(page.locator('.vip-bottom-nav span')).toHaveText(['Home', 'Trip Calculator', 'Routes', 'WhatsApp']);
  await expect(page.locator('.vip-bottom-nav')).not.toContainText('Prices');
  await expect(page.locator('.floating-wa')).toBeHidden();
  await expect(page.locator('[data-vip-bottom-whatsapp]')).toHaveCount(1);
  await page.locator('footer').scrollIntoViewIfNeeded();
  const geometry = await page.evaluate(() => {
    const nav = document.querySelector('.vip-bottom-nav').getBoundingClientRect();
    const footer = document.querySelector('footer').getBoundingClientRect();
    return { navTop: nav.top, footerBottom: footer.bottom, paddingBottom: parseFloat(getComputedStyle(document.body).paddingBottom) };
  });
  expect(geometry.paddingBottom).toBeGreaterThanOrEqual(100);
  expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.navTop + 1);

  await openCalculator(page, 'ar');
  await expect(page.locator('.vip-bottom-nav span')).toHaveText(['الرئيسية', 'حاسبة الرحلة', 'المسارات', 'واتساب']);
  expect(await page.locator('body').innerText()).not.toMatch(/\bSA\b/);
});

test('calculator schema is valid and only appears on calculator pages', async ({ page }) => {
  await openCalculator(page, 'en');
  const apps = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.flatMap((node) => {
    const parsed = JSON.parse(node.textContent || '{}');
    return parsed['@graph'] || [parsed];
  }).filter((entry) => entry['@type'] === 'WebApplication'));
  expect(apps).toHaveLength(1);
  expect(apps[0]).toMatchObject({ '@context': 'https://schema.org', '@type': 'WebApplication', applicationCategory: 'TravelApplication' });
  await page.goto(`${base}/en/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('script[type="application/ld+json"]')).not.toContainText('WebApplication');
});

test('calculator source contains no hardcoded public amount or telephone number', () => {
  const planner = readFileSync(join(root, 'assets', 'gcc-transport-planner.js'), 'utf8');
  expect(planner).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:BHD|د\.ب)\b/);
  expect(planner).not.toMatch(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|booking_whatsapp\s*[:=]\s*['"]?)\+?\d{8,}/i);
  expect(planner).toContain('api/transport/public-settings');
});

test('promotional surfaces contain no fixed currency amount', () => {
  const files = ['index.html', join('en', 'index.html'), join('bahrain-to-riyadh', 'index.html'), join('en', 'bahrain-to-riyadh', 'index.html')];
  for (const file of files) {
    const html = readFileSync(join(root, file), 'utf8');
    expect(html).not.toMatch(/(?:hero|featured)[\s\S]{0,1200}\b(?:BHD\s*\d+|\d+\s*BHD)\b/i);
  }
});

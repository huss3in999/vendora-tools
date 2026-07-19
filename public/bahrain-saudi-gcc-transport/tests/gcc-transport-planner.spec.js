import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pages = [
  {
    path: '/bahrain-saudi-gcc-transport/gcc-transport-planner/',
    file: join(root, 'gcc-transport-planner', 'index.html'),
    lang: 'ar',
    dir: 'rtl',
    canonical: 'https://getvendora.net/bahrain-saudi-gcc-transport/gcc-transport-planner/',
    alternate: 'https://getvendora.net/bahrain-saudi-gcc-transport/en/gcc-transport-planner/'
  },
  {
    path: '/bahrain-saudi-gcc-transport/en/gcc-transport-planner/',
    file: join(root, 'en', 'gcc-transport-planner', 'index.html'),
    lang: 'en',
    dir: 'ltr',
    canonical: 'https://getvendora.net/bahrain-saudi-gcc-transport/en/gcc-transport-planner/',
    alternate: 'https://getvendora.net/bahrain-saudi-gcc-transport/gcc-transport-planner/'
  }
];

async function mockTransportApis(page) {
  await page.route('**/api/transport/**', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, booking_ref: 'VND-PLANNER-1', care_token: 'planner-token' })
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
}

async function tabTo(page, selector, limit = 30) {
  await page.evaluate(() => document.activeElement?.blur());
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((target) => document.activeElement?.matches(target) || false, selector)) {
      return true;
    }
  }
  return false;
}

test.describe('GCC transport planner documents', () => {
  for (const plannerPage of pages) {
    test(`${plannerPage.lang} metadata, schema, links and images`, async ({ page, request }) => {
      await mockTransportApis(page);
      const response = await page.goto(plannerPage.path, { waitUntil: 'domcontentloaded' });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('html')).toHaveAttribute('lang', plannerPage.lang);
      await expect(page.locator('html')).toHaveAttribute('dir', plannerPage.dir);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.title()).toMatch(/\S+/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S+/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', plannerPage.canonical);
      await expect(page.locator(`link[rel="alternate"][href="${plannerPage.alternate}"]`)).toHaveCount(1);
      await expect(page.locator('script[src*="analytics-loader.js"]')).toHaveCount(1);
      await expect(page.locator('script[src*="gcc-transport-planner.js"]')).toHaveCount(1);
      const whatsappAnchors = page.locator('a[data-wa-message]');
      await expect.poll(() => whatsappAnchors.evaluateAll((anchors) => anchors.length > 0 && anchors.every((anchor) => (
        anchor.hasAttribute('href') && anchor.matches(':any-link')
      )))).toBeTruthy();

      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent || '{}')));
      expect(schemas.length).toBeGreaterThan(0);
      const graph = schemas.flatMap((schema) => schema['@graph'] || [schema]);
      for (const type of ['WebPage', 'Service', 'BreadcrumbList', 'Organization', 'FAQPage']) {
        expect(graph.some((entry) => entry['@type'] === type), `schema includes ${type}`).toBeTruthy();
      }
      const faqSchema = graph.find((entry) => entry['@type'] === 'FAQPage');
      const visibleFaq = await page.locator('details.faq-item').evaluateAll((items) => items.map((item) => ({
        question: item.querySelector('summary')?.textContent?.trim(),
        answer: item.querySelector('p')?.textContent?.trim()
      })));
      expect(faqSchema.mainEntity.map((item) => ({
        question: item.name,
        answer: item.acceptedAnswer.text
      }))).toEqual(visibleFaq);

      const internalPaths = await page.locator('a[href]').evaluateAll((links) => [...new Set(links
        .map((link) => link.getAttribute('href'))
        .filter((href) => href?.startsWith('/bahrain-saudi-gcc-transport/')))]);
      for (const path of internalPaths) {
        const linkResponse = await request.get(path);
        expect(linkResponse.ok(), `${plannerPage.lang} internal link loads: ${path}`).toBeTruthy();
      }

      await page.evaluate(async () => {
        for (const image of document.images) {
          image.scrollIntoView({ block: 'center' });
          await new Promise((resolve) => window.setTimeout(resolve, 30));
        }
        window.scrollTo(0, 0);
      });
      await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBeTruthy();
    });

    test(`${plannerPage.lang} direct WhatsApp links use configured public settings`, async ({ page }) => {
      await page.addInitScript(() => {
        window.pageConfig = { booking_whatsapp: '97339998888', passengerCareEnabled: false };
      });
      await mockTransportApis(page);
      await page.goto(plannerPage.path, { waitUntil: 'domcontentloaded' });
      const whatsappAnchors = page.locator('a[data-wa-message]');
      await expect.poll(() => whatsappAnchors.evaluateAll((anchors) => anchors.length > 0 && anchors.every((anchor) => (
        anchor.matches(':any-link')
        && anchor.getAttribute('href')?.startsWith('https://wa.me/97339998888?text=')
      )))).toBeTruthy();
    });
  }

  test('language purity, shared data and static safety', async ({ page }) => {
    const arabicHtml = readFileSync(pages[0].file, 'utf8');
    const englishHtml = readFileSync(pages[1].file, 'utf8');
    const plannerScript = readFileSync(join(root, 'assets', 'gcc-transport-planner.js'), 'utf8');
    const combined = `${arabicHtml}\n${englishHtml}\n${plannerScript}`;
    expect(combined).not.toMatch(/ðŸ‡|Ã°|Ãƒ|Ã‚|Ã˜|Ã™|ï¿½|\uFFFD/);
    expect(`${arabicHtml}\n${englishHtml}`).not.toContain('97333225954');
    expect(plannerScript).not.toMatch(/phoneNumber|97333225954|wa\.me\//);
    expect(`${arabicHtml}\n${englishHtml}\n${plannerScript}`).not.toMatch(/wa\.me\/\d|(?:booking_whatsapp|phoneNumber)\s*[:=]\s*['"]?\d/);
    expect((plannerScript.match(/^\s{4}'[^']+\|[^']+': \[/gm) || [])).toHaveLength(29);

    await mockTransportApis(page);
    await page.goto(pages[0].path, { waitUntil: 'domcontentloaded' });
    const arabicText = (await page.locator('body').innerText())
      .replace(/\b(?:BAH|DMM)\b/g, '')
      .replace(/^V$/gm, '');
    expect(arabicText).not.toMatch(/[A-Za-z]/);

    await page.goto(pages[1].path, { waitUntil: 'domcontentloaded' });
    const englishText = await page.locator('body').innerText();
    expect(englishText).not.toMatch(/[\u0600-\u06FF]/);
  });
});

test.describe('GCC transport planner behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mockTransportApis(page);
    await page.goto('/bahrain-saudi-gcc-transport/en/gcc-transport-planner/', { waitUntil: 'domcontentloaded' });
  });

  test('supported forward, reverse, unsupported and identical routes', async ({ page }) => {
    await page.locator('[data-planner-from]').selectOption('manama');
    await page.locator('[data-planner-to]').selectOption('riyadh');
    await expect(page.locator('[data-result-title]')).toHaveText('Manama to Riyadh');
    await expect(page.locator('[data-result-distance]')).toHaveText('470 to 530 km');

    await page.locator('[data-planner-from]').selectOption('riyadh');
    await page.locator('[data-planner-to]').selectOption('manama');
    await expect(page.locator('[data-result-title]')).toHaveText('Riyadh to Manama');
    await expect(page.locator('[data-result-summary]')).toHaveText('Riyadh to Manama');
    await expect(page.locator('[data-result-distance]')).toHaveText('470 to 530 km');

    await page.locator('[data-planner-from]').selectOption('doha');
    await page.locator('[data-planner-to]').selectOption('muscat');
    await expect(page.locator('[data-result-support]')).toHaveText('Needs confirmation');

    await page.locator('[data-planner-to]').selectOption('doha');
    await expect(page.locator('[data-result-summary]')).toContainText('Choose different pickup');
  });

  test('airport, family, parcel, reset and copy controls', async ({ page, context }) => {
    await page.locator('[data-planner-to]').selectOption('dmm');
    await expect(page.locator('[data-result-airport]')).toContainText('flight number');
    await page.locator('[data-planner-passengers]').fill('4');
    await expect(page.locator('[data-result-family]')).toContainText('suitable vehicle');
    await page.locator('[data-planner-type]').selectOption('parcel');
    await expect(page.locator('[data-result-parcel]')).toContainText('Prohibited or restricted');

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-planner-copy]').click();
    await expect(page.locator('[data-planner-copy] span')).toHaveText('Copied');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('To: 🇸🇦 Dammam Airport DMM');

    await page.locator('[data-planner-reset]').click();
    await expect(page.locator('[data-planner-from]')).toHaveValue('manama');
    await expect(page.locator('[data-planner-to]')).toHaveValue('khobar');
    await expect(page.locator('[data-planner-type]')).toHaveValue('passenger');
    await expect(page.locator('[data-planner-passengers]')).toHaveValue('2');
    await expect(page.locator('[data-planner-luggage]')).toHaveValue('2');
  });

  test('Passenger Care WhatsApp CTA is reachable by Tab and activates with Enter', async ({ page }) => {
    const selector = '.quick-links a[data-wa-message]';
    expect(await tabTo(page, selector)).toBeTruthy();
    await expect(page.locator(selector)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#vendora-booking-ready')).toBeVisible();
    await expect(page.locator('#vendora-booking-ready')).toContainText('VND-PLANNER-1');
  });

  test('direct mode opens configured WhatsApp href with the latest selected route', async ({ page, context }) => {
    await page.addInitScript(() => {
      window.pageConfig = { booking_whatsapp: '97339998888', passengerCareEnabled: false };
    });
    await context.route('https://wa.me/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>WhatsApp</title>' });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-planner-from]').selectOption('riyadh');
    await page.locator('[data-planner-to]').selectOption('bahrain');

    const resultCta = page.locator('[data-planner-whatsapp]');
    await expect(resultCta).toHaveAttribute('href', /^https:\/\/wa\.me\/97339998888\?text=/);
    const href = await resultCta.getAttribute('href');
    const message = new URL(href).searchParams.get('text');
    expect(message).toContain('From: 🇸🇦 Riyadh');
    expect(message).toContain('To: 🇧🇭 Bahrain');
    expect(message).not.toContain('Manama');

    await resultCta.focus();
    await expect(resultCta).toBeFocused();
    const popupPromise = page.waitForEvent('popup');
    await page.keyboard.press('Enter');
    const popup = await popupPromise;
    expect(popup.url()).toContain('https://wa.me/97339998888?text=');
    await popup.close();
  });

  test('current route uses the configured WhatsApp number', async ({ page }) => {
    await page.addInitScript(() => {
      window.pageConfig = { booking_whatsapp: '97339998888', passengerCareEnabled: true };
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-planner-from]').selectOption('riyadh');
    await page.locator('[data-planner-to]').selectOption('bahrain');
    await expect(page.locator('[data-planner-whatsapp]')).toHaveAttribute('data-wa-message', /From: 🇸🇦 Riyadh[\s\S]*To: 🇧🇭 Bahrain/);

    const whatsappRequest = page.waitForRequest((request) => request.url().startsWith('https://wa.me/97339998888'));
    await page.locator('[data-planner-whatsapp]').click();
    await expect(page.locator('#vendora-booking-ready')).toBeVisible();
    await page.locator('[data-booking-continue]').click();
    const request = await whatsappRequest;
    const message = new URL(request.url()).searchParams.get('text');
    expect(message).toContain('From: 🇸🇦 Riyadh');
    expect(message).toContain('To: 🇧🇭 Bahrain');
    expect(message).not.toContain('Manama');
  });
});

for (const width of [320, 390, 768, 1366]) {
  test(`planner layout is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await mockTransportApis(page);
    await page.goto('/bahrain-saudi-gcc-transport/en/gcc-transport-planner/', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    for (const selector of ['[data-planner-from]', '[data-planner-to]', '[data-planner-whatsapp]', '[data-planner-reset]']) {
      await expect(page.locator(selector)).toBeVisible();
      const box = await page.locator(selector).boundingBox();
      expect(box?.height || 0, `${selector} tap target at ${width}px`).toBeGreaterThanOrEqual(36);
    }
  });
}

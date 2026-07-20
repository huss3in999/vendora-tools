import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const audit = JSON.parse(fs.readFileSync(new URL('../full-site-audit.json', import.meta.url), 'utf8'));
const root = '/bahrain-saudi-gcc-transport/';
const publicPaths = audit.pages.map(({ file }) => {
  if (file === 'index.html') return root;
  if (file === 'care/en/index.html') return `${root}care/en/`;
  return `${root}${file.replace(/index\.html$/, '')}`;
});

const representatives = [
  root,
  `${root}en/`,
  `${root}bahrain-private-transport/`,
  `${root}airport-transfer/`,
  `${root}hotel-transfer-bahrain/`,
  `${root}full-day-vip-driver/`,
  `${root}business-chauffeur-bahrain/`,
  `${root}family-transport-bahrain-najaf-karbala/`,
  `${root}bahrain-to-saudi/`,
  `${root}bahrain-to-dammam/`,
  `${root}bahrain-to-khobar/`,
  `${root}bahrain-to-riyadh/`,
  `${root}bahrain-to-kuwait/`,
  `${root}bahrain-to-qatar/`,
  `${root}bahrain-to-uae/`,
  `${root}bahrain-to-oman/`,
  `${root}gcc-transport-planner/`,
  `${root}airport-pickup-planner/`,
  `${root}prices/`,
  `${root}booking-terms/`,
  `${root}en/business-chauffeur-bahrain/`,
  `${root}en/prices/`,
];

const widths = [320, 360, 375, 390, 430, 768, 1440];

test('all 140 public pages keep active text opaque and light-panel copy readable', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of publicPaths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (color) => {
        const channels = rgb(color).map((value) => {
          const normalized = value / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const contrast = (foreground, background) => {
        const a = luminance(foreground);
        const b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const faded = [...document.querySelectorAll('a,button,summary,label,p,li,.field-help,.footer-copy')]
        .filter(visible)
        .filter((element) => Number(getComputedStyle(element).opacity) < 0.8)
        .map((element) => element.textContent.trim().slice(0, 70));

      const excluded = '.company-panel,.price-callout,.calculator-tabs,.calculator-timeline,.calculator-result,.vip-featured-card,.service-card,.planner-panel';
      const lowContrast = document.body.classList.contains('vip-transport')
        ? [...document.querySelectorAll('.section-shell p,.section-shell li,.section-shell label,.section-shell summary,.section-shell .field-help,.section-shell .footer-copy')]
          .filter(visible)
          .filter((element) => !element.closest(excluded))
          .map((element) => ({ text: element.textContent.trim().slice(0, 70), ratio: contrast(getComputedStyle(element).color, 'rgb(255, 253, 248)') }))
          .filter(({ text, ratio }) => text && ratio < 4.35)
        : [];

      const heroImages = [...document.querySelectorAll('.vip-content-hero-visual img')]
        .filter(visible)
        .map((image) => {
          const rect = image.getBoundingClientRect();
          return { src: image.getAttribute('src'), ratio: rect.width / rect.height, height: rect.height };
        });

      return { faded, lowContrast, heroImages };
    });
    expect(result.faded, `faded active text on ${path}`).toEqual([]);
    expect(result.lowContrast, `low-contrast light-panel text on ${path}`).toEqual([]);
    expect(result.heroImages.length, `duplicate visible service images on ${path}`).toBeLessThanOrEqual(1);
    for (const media of result.heroImages) {
      expect(media.ratio, `portrait service image ${media.src} on ${path}`).toBeGreaterThanOrEqual(1.5);
      expect(media.height, `excessive mobile service image ${media.src} on ${path}`).toBeLessThanOrEqual(320);
    }
  }
});

for (const width of widths) {
  test(`representative categories remain readable and landscape-safe at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
    for (const path of representatives) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const result = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const media = [...document.querySelectorAll('.service-card > img, body.vip-content-app:not(.planner-page) .vip-content-hero-visual .vip-page-hero-image')]
          .filter((image) => {
            const rect = image.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((image) => {
            const rect = image.getBoundingClientRect();
            return { src: image.getAttribute('src'), ratio: rect.width / rect.height, height: rect.height };
          });
        return { overflow, media };
      });
      expect(result.overflow, `horizontal overflow on ${path} at ${width}px`).toBeLessThanOrEqual(2);
      for (const media of result.media) {
        if (width <= 768) expect(media.ratio, `portrait crop ${media.src} on ${path} at ${width}px`).toBeGreaterThanOrEqual(1.5);
        expect(media.height, `excessive image height ${media.src} on ${path} at ${width}px`).toBeLessThanOrEqual(width < 700 ? 320 : 720);
      }
    }
  });
}

test('shared WhatsApp source wrapper identifies Vendora once in both languages', async ({ page }) => {
  await page.goto(root);
  const Arabic = await page.evaluate(() => window.vendoraIdentifyWhatsAppSource('مرحباً، أريد حجز توصيل مطار البحرين.', 'ar'));
  expect(Arabic).toContain('موقع فندورا للنقل');
  expect(Arabic).toContain('أرغب في الاستفسار عن:');
  expect(Arabic.match(/https:\/\/getvendora\.net\/bahrain-saudi-gcc-transport\//g)).toHaveLength(1);
  expect(Arabic).toContain('توصيل مطار البحرين');

  const English = await page.evaluate(() => window.vendoraIdentifyWhatsAppSource('Hello, I need a Bahrain Airport transfer.', 'en'));
  expect(English).toContain('Vendora Transport website');
  expect(English).toContain('I would like to enquire about:');
  expect(English.match(/https:\/\/getvendora\.net\/bahrain-saudi-gcc-transport\/en\//g)).toHaveLength(1);
  expect(English).toContain('Bahrain Airport transfer');
});

test('price, planner and guide messages include the correct source and selected service', async ({ page }) => {
  await page.goto(`${root}en/prices/`);
  const priceMessage = await page.locator('.price-card [data-wa-message]').first().getAttribute('data-wa-message');
  expect(priceMessage).toContain('Vendora Transport website');
  expect(priceMessage).toContain('/en/');

  await page.goto(`${root}gcc-transport-planner/`);
  const plannerMessage = await page.locator('[data-planner-whatsapp]').getAttribute('data-wa-message');
  expect(plannerMessage).toContain('موقع فندورا للنقل');
  expect(plannerMessage).toContain('نوع الخدمة');

  await page.goto(`${root}en/gcc-private-transport-guide/`);
  const guideHref = await page.locator('[data-wa-static]').first().getAttribute('href');
  const guideMessage = new URL(guideHref).searchParams.get('text');
  expect(guideMessage).toContain('Vendora Transport website');
  expect(guideMessage).toContain('/en/');
});

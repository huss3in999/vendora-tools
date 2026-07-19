import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const base = '/bahrain-saudi-gcc-transport';

function publicShellFiles(directory = root, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'test-results', 'playwright-report', 'admin', 'care', 'ai-chat-test', 'api'].includes(entry.name)) continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) publicShellFiles(full, found);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      const html = readFileSync(full, 'utf8');
      if (/site\.css/i.test(html) && /site\.js/i.test(html)) found.push({ full, html });
    }
  }
  return found;
}

const pages = [
  { name: 'Arabic home', path: `${base}/`, lang: 'ar', dir: 'rtl' },
  { name: 'English home', path: `${base}/en/`, lang: 'en', dir: 'ltr' },
  { name: 'Arabic prices', path: `${base}/prices/`, lang: 'ar', dir: 'rtl' },
  { name: 'English prices', path: `${base}/en/prices/`, lang: 'en', dir: 'ltr' },
  { name: 'Arabic planner', path: `${base}/gcc-transport-planner/`, lang: 'ar', dir: 'rtl' },
  { name: 'English planner', path: `${base}/en/gcc-transport-planner/`, lang: 'en', dir: 'ltr' },
];

async function ready(page, route) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), route).toBeTruthy();
  await expect(page.locator('body')).toHaveClass(/vip-transport/);
  await expect(page.locator('.vip-bottom-nav')).toHaveCount(1);
}

test('approved brand and optimized VIP hero assets are present and source art is preserved', () => {
  const expected = [
    'assets/brand/vendora-transport-logo-light.svg',
    'assets/brand/vendora-transport-logo-dark.svg',
    'assets/brand/vendora-transport-app-icon.svg',
    'assets/brand/vendora-transport-app-icon-512.png',
    'assets/images/vendora-vip-gmc-airport-hero-draft-v1.png',
    'assets/images/hero-vendora-vip-gmc-airport.webp',
  ];
  expected.forEach((relative) => expect(statSync(join(root, relative)).size, relative).toBeGreaterThan(1000));
  expect(statSync(join(root, 'assets/images/hero-vendora-vip-gmc-airport.webp')).size).toBeLessThan(250_000);
});

test('public HTML reserves the VIP shell before paint and home heroes use responsive sources', () => {
  const shellFiles = publicShellFiles();
  expect(shellFiles.length).toBeGreaterThan(100);
  shellFiles.forEach(({ full, html }) => {
    expect(html, full).toMatch(/<body\b[^>]*class=["'][^"']*\bvip-transport\b[^"']*["']/i);
  });
  for (const relative of ['index.html', 'en/index.html']) {
    const html = readFileSync(join(root, relative), 'utf8');
    expect(html).toContain('hero-vendora-vip-gmc-airport-640.webp 640w');
    expect(html).toContain('hero-vendora-vip-gmc-airport-960.webp 960w');
    expect(html).toContain('width="1672" height="941"');
  }
});

for (const entry of pages) {
  test(`${entry.name} has the bilingual VIP shell and no mobile overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page, entry.path);
    await expect(page.locator('html')).toHaveAttribute('lang', entry.lang);
    await expect(page.locator('html')).toHaveAttribute('dir', entry.dir);
    await expect(page.locator('.brand .vip-app-icon')).toHaveAttribute('src', /assets\/brand\/vendora-transport-app-icon\.svg$/);
    await expect(page.locator('.vip-menu-toggle')).toBeVisible();
    await expect(page.locator('.vip-language-control')).toBeVisible();
    await expect(page.locator('.nav-menu')).toBeHidden();
    await expect(page.locator('.quick-links > .wa-inline')).toBeHidden();
    await expect(page.locator('.floating-wa')).toBeHidden();
    await expect(page.locator('.vip-bottom-nav')).toBeVisible();
    await expect(page.locator('.vip-bottom-action')).toHaveCount(4);
    expect(await page.locator('.vip-bottom-action').evaluateAll((links) => links.every((link) => link.matches(':any-link') && Boolean(link.getAttribute('href'))))).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    const palette = await page.locator('body').evaluate((body) => {
      const style = getComputedStyle(body);
      return [style.getPropertyValue('--vip-navy').trim(), style.getPropertyValue('--vip-ink').trim(), style.getPropertyValue('--vip-ivory').trim(), style.getPropertyValue('--vip-gold').trim()];
    });
    expect(palette).toEqual(['#071a2e', '#0b1118', '#f7f2e8', '#c8a96b']);
  });
}

test('mobile drawer is keyboard accessible, traps focus, closes with Escape and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, `${base}/`);
  const toggle = page.locator('.vip-menu-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  const drawer = page.locator('#vendora-vip-drawer');
  await expect(drawer).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(drawer.locator('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('body')).toHaveClass(/vip-drawer-open/);
  await expect(drawer.locator('.vip-drawer-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.locator('.vip-drawer-language')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(drawer.locator('.vip-drawer-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('desktop uses conventional navigation without mobile controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page, `${base}/en/`);
  await expect(page.locator('.nav-menu')).toBeVisible();
  await expect(page.locator('.vip-menu-toggle')).toBeHidden();
  await expect(page.locator('.vip-bottom-nav')).toBeHidden();
  const header = await page.locator('.topbar .nav').boundingBox();
  expect(header?.height).toBeGreaterThanOrEqual(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('home pages use the optimized authentic VIP hero with stable dimensions', async ({ page }) => {
  for (const route of [`${base}/`, `${base}/en/`]) {
    await ready(page, route);
    const hero = page.locator('.vip-home-hero-image').first();
    await expect(hero).toHaveAttribute('src', /assets\/images\/hero-vendora-vip-gmc-airport\.webp$/);
    await expect(hero).toHaveAttribute('width', '1672');
    await expect(hero).toHaveAttribute('height', '941');
    await expect(hero).toHaveAttribute('fetchpriority', 'high');
    expect(await hero.evaluate((image) => image.complete && image.naturalWidth > 0)).toBeTruthy();
  }
});

test('mobile prices retain the server-rendered price mount and readable controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await ready(page, `${base}/prices/`);
  await expect(page.locator('#priceList')).toHaveCount(1);
  await expect(page.locator('script[src*="prices-page.js"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  const interactive = page.locator('.topbar a:visible, .topbar button:visible, .vip-bottom-action:visible, .hero-actions a:visible, .hero-actions button:visible, .price-card a:visible, #priceList a:visible, #priceList button:visible, #priceList input:visible, #priceList select:visible, .footer-links a:visible');
  const undersized = await interactive.evaluateAll((nodes) => nodes.filter((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40);
  }).map((node) => ({ tag: node.tagName, text: (node.textContent || '').trim().slice(0, 40), rect: node.getBoundingClientRect().toJSON() })));
  expect(undersized).toEqual([]);
});

test('320px, 360px, tablet and desktop representative pages do not overflow', async ({ page }) => {
  const scenarios = [
    { width: 320, height: 568, path: `${base}/` },
    { width: 360, height: 800, path: `${base}/en/` },
    { width: 768, height: 1024, path: `${base}/prices/` },
    { width: 1440, height: 900, path: `${base}/en/prices/` },
  ];
  for (const scenario of scenarios) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await ready(page, scenario.path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${scenario.path} at ${scenario.width}`).toBeTruthy();
  }
});

test('reduced-motion preference disables meaningful animation and transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page, `${base}/en/`);
  const durations = await page.locator('.vip-bottom-nav').evaluate((node) => {
    const style = getComputedStyle(node);
    return { animation: style.animationDuration, transition: style.transitionDuration };
  });
  expect(parseFloat(durations.animation)).toBeLessThanOrEqual(0.001);
  expect(parseFloat(durations.transition)).toBeLessThanOrEqual(0.001);
});

test('VIP implementation contains no telephone number and does not alter protected planner data', () => {
  const site = readFileSync(join(root, 'site.js'), 'utf8');
  const css = readFileSync(join(root, 'site.css'), 'utf8');
  const planner = readFileSync(join(root, 'assets/gcc-transport-planner.js'), 'utf8');
  expect(`${site}\n${css}`).not.toMatch(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|booking_whatsapp\s*[:=]\s*['"]?)\+?\d{8,}/i);
  expect(planner).toContain('const routeRanges = {');
  expect(planner).toContain('const locations = Object.entries(copy.locations)');
});

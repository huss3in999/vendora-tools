import { test, expect } from '@playwright/test';

for (const path of ['/', '/bahrain-saudi-gcc-transport/', '/bahrain-saudi-gcc-transport/en/', '/bahrain-saudi-gcc-transport/contact/', '/bahrain-saudi-gcc-transport/en/contact/']) {
  test(`Tripadvisor links and language: ${path}`, async ({ page }) => {
    await page.route('**/api/**', r => r.fulfill({ json: { settings: {}, routes: [] } }));
    await page.goto(path);
    await expect(page.locator('[data-tripadvisor-links]')).toHaveCount(1);
    await expect(page.locator('[data-tripadvisor-links] a').last()).toHaveAttribute('href', 'https://www.tripadvisor.com/UserReviewEdit-d34715134');
    const graphs = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(graphs.join('')).toContain('https://www.tripadvisor.com/34715134');
    if (['/', '/bahrain-saudi-gcc-transport/', '/bahrain-saudi-gcc-transport/en/'].includes(path)) {
      await expect(page.locator('[data-gcc-service-overview]')).toHaveCount(1);
      await expect(page.locator('[data-gcc-service-overview] article')).toHaveCount(2);
      const organization = graphs.map(text => JSON.parse(text)).flatMap(data => data['@graph'] || []).find(node => node['@id'] === 'https://getvendora.net/#organization');
      expect(organization.areaServed.map(country => country.identifier).sort()).toEqual(['AE', 'BH', 'KW', 'OM', 'QA', 'SA']);
      expect(organization.logo.url).toContain('vendora-transport-app-icon-512.png');
      expect(organization.review).toBeUndefined();
      expect(await page.locator('h1').innerText()).not.toMatch(/Riyadh|الرياض/);
    }
    if (path === '/' || path.includes('/en/')) expect(await page.locator('body').innerText()).not.toMatch(/[\u0600-\u06ff]/);
  });
}

test('follow-up queue waits 40 minutes, deduplicates, survives reload and cancels reopened trips', async ({ page }) => {
  await page.goto('/privacy-policy/');
  await page.clock.install({ time: new Date('2026-10-23T18:00:00Z') });
  await page.addScriptTag({ url: '/booking-desk/tripadvisor-followups.js' });
  await page.evaluate(() => window.VendoraReviewFollowups.setAvailable(true));
  const booking = {id:'TEST-ONLY',customerName:'Test Customer',customerPhone:'97333225954',pickup:'Seef',destination:'Khobar'};
  await page.evaluate(b => { window.VendoraReviewFollowups.completed(b); window.VendoraReviewFollowups.completed(b); }, booking);
  const button = page.getByRole('button', {name:'Tripadvisor follow-ups (0)',exact:true});
  await button.click();
  await expect(page.getByRole('heading', {name:'#TEST-ONLY · Test Customer'})).toHaveCount(1);
  await expect(page.getByRole('link',{name:'Open draft in WhatsApp'})).toHaveCount(0);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.clock.fastForward(40 * 60000);
  await page.getByRole('button',{name:'Tripadvisor follow-ups (1)',exact:true}).click();
  const draft = page.getByRole('link',{name:'Open draft in WhatsApp'});
  expect(new URL(await draft.getAttribute('href')).searchParams.get('text')).toContain('honest experience');
  expect(new URL(await draft.getAttribute('href')).searchParams.get('text')).toContain('UserReviewEdit-d34715134');
  await page.reload();
  await page.addScriptTag({url:'/booking-desk/tripadvisor-followups.js'});
  await page.evaluate(() => window.VendoraReviewFollowups.setAvailable(true));
  await expect(page.getByRole('button',{name:'Tripadvisor follow-ups (1)',exact:true})).toBeVisible();
  await page.evaluate(() => window.VendoraReviewFollowups.reopened('TEST-ONLY'));
  await expect(page.getByRole('button',{name:/Tripadvisor follow-ups/})).toBeHidden();
});

test('GCC homepages keep logo and both services usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', r => r.fulfill({ json: { settings: {}, routes: [] } }));
  for (const path of ['/', '/bahrain-saudi-gcc-transport/', '/bahrain-saudi-gcc-transport/en/']) {
    await page.goto(path);
    await expect(page.locator('.brand img').first()).toBeVisible();
    await expect(page.locator('[data-gcc-service-overview] article')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const cta = page.locator('.hero-actions a[data-wa-message]').first();
    expect(await cta.getAttribute('data-wa-message')).not.toMatch(/Riyadh|الرياض/);
    if (path === '/') await page.screenshot({ path: '../../docs/tripadvisor/website-gcc-mobile.png' });
  }
});

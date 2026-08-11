import { test, expect } from '@playwright/test';
test('report page mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  
  await page.route('https://getvendora.net/bahrain-saudi-gcc-transport/api/transport/admin**', async (route) => {
    const resource = new URL(route.request().url()).searchParams.get('resource') || 'summary';
    const body = { ok: true, summary: { total_visitors: 1, total_pageviews: 1, total: 1 } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  const fileUrl = new URL('../admin/index.html', import.meta.url).href;
  await page.goto(fileUrl);
  await page.locator('#tokenInput').fill('test-token');
  await page.locator('#loginForm').evaluate(form => form.requestSubmit());
  await page.waitForSelector('#dashboardView');
  
  // Resize to mobile FIRST so the button is visible
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(1000);

  // Navigate to reports using the mobile button
  await page.locator('[data-app-jump="reports"]').click();
  await page.waitForSelector('#reportsPanel:not(.hidden)');

  // Wait a bit for charts to render
  await page.waitForTimeout(1000);

  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  const iw = await page.evaluate(() => window.innerWidth);
  console.log(`ScrollWidth: ${w}, InnerWidth: ${iw}`);
  
  // Find which element is wider than window if any
  const overflowingElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => el.getBoundingClientRect().right > window.innerWidth || el.scrollWidth > window.innerWidth)
      .map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        right: el.getBoundingClientRect().right,
        scrollWidth: el.scrollWidth
      }));
  });
  console.log(overflowingElements);

  expect(w).toBe(iw);
});

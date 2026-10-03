import { test, expect } from '@playwright/test';
for (const language of ['', 'en/']) {
  test(`guide ${language || 'Arabic'} directs detailed planning to the dedicated calculator`, async ({ page }) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/bahrain-saudi-gcc-transport/${language}gcc-private-transport-guide/`, {waitUntil:'networkidle'});
    await expect(page.locator('[data-route-planner]')).toHaveCount(0);
    await expect(page.locator(`a[href="/bahrain-saudi-gcc-transport/${language}gcc-transport-planner/"]`).first()).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/AI Concierge|AI Planner|الذكاء الاصطناعي/);
    expect(errors).toEqual([]);
    const hrefs=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
    expect(hrefs.some(href=>/karbala|najaf|bahrain-to-iraq/.test(href))).toBe(false);
  });
  test(`guide ${language || 'Arabic'} preserves structured data and photographs`,async({page})=>{
    await page.goto(`/bahrain-saudi-gcc-transport/${language}gcc-private-transport-guide/`,{waitUntil:'networkidle'});
    for(const raw of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(JSON.parse(raw)['@context']).toBe('https://schema.org');
    expect(await page.locator('img').count()).toBeGreaterThan(0);
    for(const image of await page.locator('img').all()){
      await image.scrollIntoViewIfNeeded();
      await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    }
  });
}

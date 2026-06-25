import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  console.log('Navigating to homepage...');
  await page.goto('http://127.0.0.1:4173/bahrain-saudi-gcc-transport/', { waitUntil: 'load' });
  
  const submit = page.locator('[data-booking-submit]');
  const hrefBefore = await submit.getAttribute('href');
  console.log('href before:', hrefBefore);
  
  // Fill in some details or trigger change
  await page.selectOption('select[name="service"]', { index: 1 });
  await page.selectOption('select[name="from_country"]', { index: 1 });
  
  const hrefAfter = await submit.getAttribute('href');
  console.log('href after interaction:', hrefAfter);
  
  await browser.close();
})();

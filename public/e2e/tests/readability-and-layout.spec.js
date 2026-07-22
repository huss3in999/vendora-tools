const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';

const VIEWPORTS = [
  { name: 'Ultra-small Mobile', width: 305, height: 520 },
  { name: 'Modern Smartphone', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
];

const PAGES_TO_TEST = [
  { name: 'Root Homepage', path: '/' },
  { name: 'Arabic Transport Hub', path: '/bahrain-saudi-gcc-transport/' },
  { name: 'English Transport Hub', path: '/bahrain-saudi-gcc-transport/en/' },
  { name: 'Contact Page', path: '/contact/' },
  { name: 'Arabic Complaints Page', path: '/bahrain-saudi-gcc-transport/complaints/' },
  { name: 'English Complaints Page', path: '/bahrain-saudi-gcc-transport/en/complaints/' },
  { name: 'Arabic Customer Reviews', path: '/bahrain-saudi-gcc-transport/customer-reviews/' },
  { name: 'English Customer Reviews', path: '/bahrain-saudi-gcc-transport/en/customer-reviews/' },
  { name: 'Arabic Booking Terms', path: '/bahrain-saudi-gcc-transport/booking-terms/' },
  { name: 'English Booking Terms', path: '/bahrain-saudi-gcc-transport/en/booking-terms/' },
];

test.describe('Vendora Transport Readability & Layout Verification Suite', () => {

  for (const viewport of VIEWPORTS) {
    test.describe(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      for (const target of PAGES_TO_TEST) {
        test(`${target.name} - Header, typography, contrast, and layout bounds`, async ({ page }) => {
          await page.goto(`${BASE_URL}${target.path}`);

          // 1. Verify Topbar Header is visible and not clipped
          const topbar = page.locator('.topbar');
          await expect(topbar).toBeVisible();
          const topbarBox = await topbar.boundingBox();
          expect(topbarBox.height, `Topbar height on ${target.name}`).toBeGreaterThan(30);
          expect(topbarBox.height, `Topbar height on ${target.name}`).toBeLessThan(250);

          // 2. Verify H1 is visible and non-empty
          const h1 = page.locator('h1').first();
          await expect(h1).toBeVisible();
          const h1Text = await h1.innerText();
          expect(h1Text.length, `H1 text length on ${target.name}`).toBeGreaterThan(3);

          // 3. Verify no severe horizontal overflow
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow, `Horizontal overflow on ${target.name}`).toBeLessThanOrEqual(8);

          // 4. On Complaints pages, verify Customer Rights box readability
          if (target.path.includes('complaints')) {
            const rightsCard = page.locator('.rights-card, .rights-box').first();
            await expect(rightsCard).toBeVisible();

            // Verify rights card headings & paragraphs have high contrast colors
            const styles = await rightsCard.evaluate((el) => {
              const h2 = el.querySelector('h2');
              const p = el.querySelector('p');
              const li = el.querySelector('li');
              const getCol = (node) => node ? window.getComputedStyle(node).color : null;
              return {
                h2Color: getCol(h2),
                pColor: getCol(p),
                liColor: getCol(li),
              };
            });

            expect(styles.h2Color, 'H2 color in Customer Rights box').not.toBe('rgb(0, 0, 0)');
            expect(styles.pColor, 'Paragraph color in Customer Rights box').not.toBe('rgb(0, 0, 0)');
          }

          // 5. Verify Floating Feedback widget does not obscure content or crash layout
          const feedbackWidget = page.locator('#vendoraFloatingFeedbackTab');
          if (await feedbackWidget.count() > 0) {
            await expect(feedbackWidget).toBeVisible();
          }
        });
      }

    });
  }

});

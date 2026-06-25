import { test, expect } from '@playwright/test';

// Define base settings
const origin = 'http://127.0.0.1:4173';
const arPath = '/bahrain-saudi-gcc-transport/gcc-private-transport-guide/';
const enPath = '/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/';

test.describe('Manual-style QA: Upgraded GCC Route Planner', () => {

  // Test 1: Bahrain Airport to Khobar (English)
  test('Scenario 1: Bahrain Airport to Khobar (Flight Number validation)', async ({ page }) => {
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    // Select country & location
    await page.selectOption('select[name="pickupCountry"]', 'Bahrain');
    await page.selectOption('select[name="pickupLocation"]', 'Bahrain International Airport (BAH)');
    
    await page.selectOption('select[name="destinationCountry"]', 'Saudi Arabia');
    await page.selectOption('select[name="destinationLocation"]', 'Khobar');

    // Verify flight number field appears
    const flightField = page.locator('#flightNumberField');
    await expect(flightField).toBeVisible();

    // Fill flight number
    await page.fill('input[name="flightNumber"]', 'GF 123');

    // Trigger update (handled on input/change)
    const submitBtn = page.locator('form[data-route-planner] button[type="submit"]');
    await submitBtn.focus(); // Make sure form registers the inputs
    
    // Extract WhatsApp Link
    const waLink = page.locator('#planner-whatsapp');
    const href = await waLink.getAttribute('href') || '';
    
    console.log('Scenario 1 Link:', href);
    expect(href).toContain('GF%20123');
    expect(href).toContain('Bahrain%20International%20Airport');
    expect(href).toContain('Khobar');
  });

  // Test 2: Manama to Dammam Airport
  test('Scenario 2: Manama to Dammam Airport (Airport Guidance check)', async ({ page }) => {
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    await page.selectOption('select[name="pickupCountry"]', 'Bahrain');
    await page.selectOption('select[name="pickupLocation"]', 'Manama');
    
    await page.selectOption('select[name="destinationCountry"]', 'Saudi Arabia');
    await page.selectOption('select[name="destinationLocation"]', 'King Fahd International Airport (DMM)');

    // Verify airport guidance note appears in result list
    const resultBox = page.locator('#planner-result');
    await expect(resultBox).toContainText('For airport trips, send the flight number');

    const waLink = page.locator('#planner-whatsapp');
    const href = await waLink.getAttribute('href') || '';
    console.log('Scenario 2 Link:', href);
    expect(href).toContain('Manama');
    expect(href).toContain('King%20Fahd%20International%20Airport%20(DMM)');
  });

  // Test 3: Juffair to Riyadh
  test('Scenario 3: Juffair to Riyadh (Long Distance GCC Guidance)', async ({ page }) => {
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    await page.selectOption('select[name="pickupCountry"]', 'Bahrain');
    await page.selectOption('select[name="pickupLocation"]', 'Juffair');
    
    await page.selectOption('select[name="destinationCountry"]', 'Saudi Arabia');
    await page.selectOption('select[name="destinationLocation"]', 'Riyadh');

    // Verify long-distance GCC guidance note appears
    const resultBox = page.locator('#planner-result');
    await expect(resultBox).toContainText('For long-distance GCC trips');

    const waLink = page.locator('#planner-whatsapp');
    const href = await waLink.getAttribute('href') || '';
    console.log('Scenario 3 Link:', href);
    expect(href).toContain('Juffair');
    expect(href).toContain('Riyadh');
  });

  // Test 4: Bahrain to Najaf / Karbala (Iraq)
  test('Scenario 4: Bahrain to Najaf (Iraq / Ziyarat Guidance)', async ({ page }) => {
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    await page.selectOption('select[name="pickupCountry"]', 'Bahrain');
    await page.selectOption('select[name="pickupLocation"]', 'Manama');
    
    await page.selectOption('select[name="destinationCountry"]', 'Iraq');
    await page.selectOption('select[name="destinationLocation"]', 'Najaf');

    // Select travel purpose as Iraq Ziyarat
    await page.selectOption('select[name="purpose"]', 'Iraq Ziyarat');

    // Verify Iraq Ziyarat / Long distance notes appear
    const resultBox = page.locator('#planner-result');
    await expect(resultBox).toContainText('For long-distance GCC trips');

    const waLink = page.locator('#planner-whatsapp');
    const href = await waLink.getAttribute('href') || '';
    console.log('Scenario 4 Link:', href);
    expect(href).toContain('Najaf');
    expect(href).toContain('Iraq%20Ziyarat');
  });

  // Test 5: Other / Not listed
  test('Scenario 5: Other / Not listed location entry', async ({ page }) => {
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    // Select Other for Pickup
    await page.selectOption('select[name="pickupCountry"]', 'Bahrain');
    await page.selectOption('select[name="pickupLocation"]', 'other');

    // Confirm custom pickup field becomes visible
    const customField = page.locator('#pickupCustomField');
    await expect(customField).toBeVisible();

    // Fill exact location
    await page.fill('input[name="pickupCustom"]', 'My Secret Luxury Hotel Saar');

    await page.selectOption('select[name="destinationCountry"]', 'Saudi Arabia');
    await page.selectOption('select[name="destinationLocation"]', 'Khobar');

    const waLink = page.locator('#planner-whatsapp');
    const href = await waLink.getAttribute('href') || '';
    console.log('Scenario 5 Link:', href);
    expect(href).toContain('My%20Secret%20Luxury%20Hotel%20Saar');
  });

  // Test 6: Arabic version checks
  test('Scenario 6: Arabic version translations and layout', async ({ page }) => {
    await page.goto(arPath, { waitUntil: 'domcontentloaded' });

    // Confirm HTML lang and dir
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Confirm label texts are Arabic
    const label = page.locator('label[for="pickupCountry"]');
    await expect(label).toContainText('بلد الانطلاق');

    // Select options in Arabic
    await page.selectOption('select[name="pickupCountry"]', 'البحرين');
    await page.selectOption('select[name="pickupLocation"]', 'المنامة');
    
    await page.selectOption('select[name="destinationCountry"]', 'السعودية');
    await page.selectOption('select[name="destinationLocation"]', 'الخبر');

    // Submit or trigger link
    const waLink = page.locator('#planner-whatsapp');
    const href = await waLink.getAttribute('href') || '';
    const decodedHref = decodeURIComponent(href);
    console.log('Scenario 6 Link:', href);
    console.log('Scenario 6 Decoded Link:', decodedHref);
    
    // Verify Arabic copy inside WhatsApp URL
    expect(decodedHref).toContain('مرحباً');
    expect(decodedHref).toContain('المنامة');
    expect(decodedHref).toContain('الخبر');
  });

  // Test 7: English version check (no Arabic in UI)
  test('Scenario 7: English version UI check', async ({ page }) => {
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    // Confirm HTML lang and dir
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // Check header/labels for absence of Arabic
    const bodyText = await page.locator('form[data-route-planner]').innerText();
    const hasArabic = /[\u0600-\u06FF]/.test(bodyText);
    expect(hasArabic).toBeFalsy();
  });

  // Test 8: Mobile Layout
  test('Scenario 8: Mobile layout check', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(enPath, { waitUntil: 'domcontentloaded' });
    
    // Ensure all selects are interactive and visible
    const pickupSelect = page.locator('select[name="pickupLocation"]');
    await expect(pickupSelect).toBeVisible();

    // Verify there is no horizontal page overflow (scrollWidth should equal clientWidth)
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBeFalsy();
  });

  // Test 9: Safety guidelines (prices, reviews, licenses, guarantees, document notice)
  test('Scenario 9: Safety verification', async ({ page }) => {
    for (const path of [arPath, enPath]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const text = await page.locator('body').innerText();

      // No fake reviews/ratings
      expect(text).not.toContain('★★★★★');
      expect(text).not.toContain('⭐⭐⭐⭐⭐');

      // No border/visa guarantees
      expect(text.toLowerCase()).not.toContain('visa guarantee');
      expect(text.toLowerCase()).not.toContain('border guarantee');
      expect(text).not.toContain('ضمان الجسر');
      expect(text).not.toContain('ضمان الفيزا');

      // Document responsibility is visible
      const hasDocNotice = text.includes('Passenger documents remain passenger responsibility') || 
                           text.includes('مسؤولية المستندات على المسافر') || 
                           text.includes('المسافر مسؤول عن مستنداته ومتطلبات سفره');
      expect(hasDocNotice).toBeTruthy();
    }
  });

  // Test 10: Technical checks (images, js paths)
  test('Scenario 10: Technical resources check', async ({ page }) => {
    await page.goto(arPath, { waitUntil: 'domcontentloaded' });
    
    // Confirm script source is exactly correct
    const scriptSrc = await page.locator('script[src$="gcc-guide.js"]').getAttribute('src');
    expect(scriptSrc).toBe('src/shared/gcc-guide.js');

    // Confirm that the script loads correctly without console errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));
    await page.reload({ waitUntil: 'load' });
    expect(errors.length).toBe(0);
  });
});

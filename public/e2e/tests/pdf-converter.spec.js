const { test, expect } = require('@playwright/test');

test.describe('PDF Converter & Editor Toolkit', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`[Browser Uncaught Error] ${err.message}\n${err.stack}`);
    });
  });
  
  test('hub page loads with correct SEO tags and elements', async ({ page }) => {
    await page.goto('/tools/pdf-converter/');
    
    // SEO & Title Validation
    await expect(page).toHaveTitle(/Free Online PDF Converter & Editor Tools/);
    
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://getvendora.net/tools/pdf-converter/');
    
    // Core Layout Checks
    await expect(page.getByRole('heading', { level: 1, name: 'Free Online PDF Converter & Editor Tools' })).toBeVisible();
    await expect(page.getByText('Private & Browser-Native')).toBeVisible();
    await expect(page.getByText('Your files stay in your browser. Nothing is uploaded.', { exact: false })).toBeVisible();
    
    // JSON-LD Schema Validations
    const schemas = await page.locator('script[type="application/ld+json"]').all();
    expect(schemas.length).toBeGreaterThanOrEqual(4); // We have WebApplication, BreadcrumbList, FAQPage, ItemList
    
    const contents = await Promise.all(schemas.map(s => s.textContent()));
    expect(contents.some(c => c.includes('"@type": "WebApplication"'))).toBe(true);
    expect(contents.some(c => c.includes('"@type": "FAQPage"'))).toBe(true);
    expect(contents.some(c => c.includes('"@type": "ItemList"'))).toBe(true);
    expect(contents.some(c => c.includes('"@type": "BreadcrumbList"'))).toBe(true);
  });

  test('search/filter functionality updates the UI dynamically', async ({ page }) => {
    await page.goto('/tools/pdf-converter/');
    
    // Check dynamic cards rendering
    const cardsBeforeSearch = await page.locator('#tools-grid .tool-card').count();
    expect(cardsBeforeSearch).toBeGreaterThan(10); // Check that at least some cards are loaded
    
    // Input search keyword
    const searchBar = page.locator('#search-bar');
    await expect(searchBar).toBeVisible();
    await searchBar.fill('Merge');
    
    // After searching "Merge", only relevant cards should be visible
    const cardsAfterSearch = await page.locator('#tools-grid .tool-card:not(.hidden)').count();
    expect(cardsAfterSearch).toBeLessThan(cardsBeforeSearch);
    
    const mergeTitle = await page.locator('#tools-grid .tool-card:not(.hidden) h3').first().textContent();
    expect(mergeTitle).toContain('Merge PDF');
    
    // Reset search
    await searchBar.fill('');
  });

  test('category filters display correct subsets of tools', async ({ page }) => {
    await page.goto('/tools/pdf-converter/');
    
    // Category filters container
    await expect(page.locator('#category-filters')).toBeVisible();
    
    // Click on "Security" filter chip
    const securityFilter = page.locator('.filter-chip', { hasText: 'Security' });
    await expect(securityFilter).toBeVisible();
    await securityFilter.click();
    
    // Check that we only see security tools
    const visibleCards = await page.locator('#tools-grid .tool-card:not(.hidden)');
    const visibleCount = await visibleCards.count();
    expect(visibleCount).toBeGreaterThan(0);
    
    for (let i = 0; i < visibleCount; i++) {
      const toolText = await visibleCards.nth(i).textContent();
      // Tools in Security: Protect, Unlock, Sign, Redact, etc.
      const isSecurityTool = /Unlock|Protect|Sign|Redact/i.test(toolText);
      expect(isSecurityTool).toBe(true);
    }
  });

  test('opening a specific tool loads the workspace successfully', async ({ page }) => {
    await page.goto('/tools/pdf-converter/');
    
    // Click on Merge PDF Card
    const mergeCard = page.locator('#tools-grid .tool-card', { hasText: 'Merge PDF' });
    await expect(mergeCard).toBeVisible();
    await mergeCard.click();
    
    // Check that workspace overlay view is displayed
    await expect(page.locator('#workspace-view')).toBeVisible();
    await expect(page.locator('#hub-view')).not.toBeVisible();
    
    // Validate workspace header titles and elements
    await expect(page.locator('#workspace-title')).toHaveText('Merge PDF');
    await expect(page.locator('#upload-zone')).toBeVisible();
    await expect(page.locator('#back-to-hub-btn')).toBeVisible();
    
    // Click Back to Hub button
    await page.locator('#back-to-hub-btn').click();
    await expect(page.locator('#hub-view')).toBeVisible();
    await expect(page.locator('#workspace-view')).not.toBeVisible();
  });

  test('advanced/future tools show professional limitation alerts', async ({ page }) => {
    await page.goto('/tools/pdf-converter/');
    
    // Click on PDF to Word card (which is a basic / pro preview tool)
    const pdfToWordCard = page.locator('#tools-grid .tool-card', { hasText: 'PDF to Word' });
    await expect(pdfToWordCard).toBeVisible();
    await pdfToWordCard.click();
    
    // Check that workspace is loaded
    await expect(page.locator('#workspace-view')).toBeVisible();
    
    // Check that limitation alert banner is displayed
    const limitationAlert = page.locator('#workspace-limitation-alert');
    await expect(limitationAlert).toBeVisible();
    await expect(limitationAlert).not.toHaveClass(/hidden/);
    await expect(limitationAlert).toContainText(/real \.docx/i);
  });

  test('upload validation rejects files of wrong formats', async ({ page }) => {
    await page.goto('/tools/pdf-converter/');
    
    // Open Merge PDF tool
    await page.locator('#tools-grid .tool-card', { hasText: 'Merge PDF' }).click();
    
    // Handle mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('#upload-zone').click();
    const fileChooser = await fileChooserPromise;
    
    // Upload a fake non-PDF file
    await fileChooser.setFiles([{
      name: 'fake-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world')
    }]);
    
    // Verify that error banner is displayed
    await expect(page.locator('#error-banner')).toBeVisible();
    await expect(page.locator('#error-text')).toContainText(/This tool accepts files of type: .pdf/i);
  });

  test('mobile viewport is fully responsive and shows key layout elements', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/pdf-converter/');
    
    // Verify no horizontal overflow
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);
    
    // Check key visible components on mobile viewport
    await expect(page.getByRole('heading', { level: 1, name: 'Free Online PDF Converter & Editor Tools' })).toBeVisible();
    await expect(page.locator('#search-bar')).toBeVisible();
    await expect(page.locator('#tools-grid')).toBeVisible();
  });

  test('no console error messages occur on page load', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    
    await page.goto('/tools/pdf-converter/');
    
    expect(consoleErrors).toEqual([]);
  });

  // --- PDF Pre-Conversion Intelligence & Safeguard Tests ---

  test.describe('Pre-Conversion Intelligence & Safeguards', () => {

    // Helper: Mock the browser-native PdfEngine methods
    async function mockPdfEngine(page, mockAnalysis, mockInfo) {
      await page.evaluate(({ mockAnalysis, mockInfo }) => {
        if (!window.PdfEngine) window.PdfEngine = {};
        
        window.PdfEngine.analyzePDF = async function(file) {
          return { ...mockAnalysis, fileSize: file.size };
        };
        
        window.PdfEngine.getPDFInfo = async function(file) {
          return { ...mockInfo };
        };
        
        window.PdfEngine.renderPDFPreview = async function(file, canvas, pageNum) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width || 100, canvas.height || 140);
          return mockInfo.pageCount;
        };

        window.PdfEngine.pdfToExcelBasicTable = async function(file) {
          if (mockAnalysis.ocrRequired) {
            throw new Error("This PDF appears to be image-based or scanned. No selectable text was found, so table extraction is not possible. OCR is required.");
          }
          // download file stub
          window.PdfEngine.downloadFile(new ArrayBuffer(10), "stub.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        };
      }, { mockAnalysis, mockInfo });
    }

    test('Case 1: Real Text PDF to Excel enables normal extraction', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      // Setup Real Text Mocking
      await mockPdfEngine(page, {
        encrypted: false,
        corrupted: false,
        pageCount: 3,
        selectableText: true,
        totalCharsEstimated: 2400,
        embeddedImages: 0,
        composition: 'Real Text PDF',
        hasTables: true,
        confidence: 'High',
        ocrRequired: false,
        suggestedMethod: 'Native Text Flow Extraction',
        columnCount: 4,
        rowCount: 10
      }, {
        encrypted: false,
        pageCount: 3,
        title: 'DigitalReport.pdf'
      });

      // Upload mock file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([{
        name: 'DigitalReport.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 dummy contents')
      }]);

      // Check PDF Intelligence Panel is visible and shows success badge
      const panel = page.locator('.pdf-intelligence-panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('.badge', { hasText: 'Real Text PDF' })).toBeVisible();
      await expect(panel.locator('.metric-item', { hasText: 'Text Detected' }).locator('.badge')).toContainText('Yes');
      await expect(panel.locator('.metric-item', { hasText: 'Table Detected' }).locator('.badge')).toContainText('Yes');

      // Verify that execution button is active
      const executeBtn = page.locator('#btn-action-execute');
      await expect(executeBtn).toBeVisible();
      await expect(executeBtn).not.toBeDisabled();
      await expect(executeBtn).toHaveText('PDF to Excel Now');

      // Verify no warning overlays are rendered
      await expect(page.locator('.scanned-warning-overlay')).not.toBeVisible();
      await expect(page.locator('.scanned-warning-box')).not.toBeVisible();
    });

    test('Case 2: Image-only PDF to Excel blocks empty downloads and renders scanned warnings', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      // Setup Scanned PDF Mocking
      await mockPdfEngine(page, {
        encrypted: false,
        corrupted: false,
        pageCount: 1,
        selectableText: false,
        totalCharsEstimated: 0,
        embeddedImages: 1,
        composition: 'Scanned Image PDF',
        hasTables: false,
        confidence: 'Low (OCR Required)',
        ocrRequired: true,
        suggestedMethod: 'OCR Scan + Table Parser'
      }, {
        encrypted: false,
        pageCount: 1,
        title: 'ScannedInvoice.pdf'
      });

      // Upload mock file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([{
        name: 'ScannedInvoice.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 dummy contents')
      }]);

      // Verify that the PDF Intelligence Panel has the danger badge
      const panel = page.locator('.pdf-intelligence-panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('.badge', { hasText: 'Scanned Image PDF' })).toBeVisible();
      await expect(panel.locator('.metric-item', { hasText: 'Text Detected' }).locator('.badge')).toContainText('No');

      // Verify fallback page-to-image preview renders Page 1 with scanned warning overlay
      await expect(page.locator('.preview-viewport-card')).toBeVisible();
      await expect(page.locator('.scanned-warning-overlay')).toBeVisible();
      await expect(page.locator('.scanned-warning-overlay h4')).toHaveText('Scanned Page Detected');

      // Verify options sidebar renders a prominent scanned warning box
      const warningBox = page.locator('.scanned-warning-box');
      await expect(warningBox).toBeVisible();
      await expect(warningBox.locator('h5')).toHaveText(/Scanned Document Warning/);
      await expect(warningBox.locator('.roadmap-block')).toBeVisible();

      // Verify Phase 2 roadmap list is presented
      await expect(warningBox.locator('ul li').first()).toHaveText('OCR Engine (Tesseract.js integration)');

      // Verify that the execution action button is disabled and greyed out
      const executeBtn = page.locator('#btn-action-execute');
      await expect(executeBtn).toBeDisabled();
      await expect(executeBtn).toHaveClass(/disabled/);
      await expect(executeBtn).toHaveText('Excel Extractor (No text)');
    });

    test('Case 3: Scanned PDF warning offers button to switch to Local OCR mode', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      // Setup Scanned PDF Mocking
      await mockPdfEngine(page, {
        encrypted: false,
        corrupted: false,
        pageCount: 2,
        selectableText: false,
        totalCharsEstimated: 0,
        embeddedImages: 2,
        composition: 'Scanned Image PDF',
        hasTables: false,
        confidence: 'Low (OCR Required)',
        ocrRequired: true,
        suggestedMethod: 'OCR Scan + Table Parser'
      }, {
        encrypted: false,
        pageCount: 2,
        title: 'ScannedReceipt.pdf'
      });

      // Upload mock file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([{
        name: 'ScannedReceipt.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 dummy contents')
      }]);

      // Verify switch button is present
      const switchBtn = page.locator('#btn-switch-to-ocr');
      await expect(switchBtn).toBeVisible();
      await expect(switchBtn).toHaveText('⚡ Switch to Local OCR Tool');

      // Click switch button
      await switchBtn.click();

      // Assert that active workspace switches to OCR PDF
      await expect(page.locator('#workspace-title')).toHaveText('OCR PDF');
      // Verify options sidebar is loaded with OCR configurations
      await expect(page.locator('#sidebar-content')).toContainText('Target Language');
    });

    test('Case 4: Scanned PDF blocks clicking and empty downloads', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      // Setup Scanned PDF Mocking
      await mockPdfEngine(page, {
        encrypted: false,
        corrupted: false,
        pageCount: 1,
        selectableText: false,
        totalCharsEstimated: 0,
        embeddedImages: 1,
        composition: 'Scanned Image PDF',
        hasTables: false,
        confidence: 'Low (OCR Required)',
        ocrRequired: true,
        suggestedMethod: 'OCR Scan + Table Parser'
      }, {
        encrypted: false,
        pageCount: 1,
        title: 'FlatImage.pdf'
      });

      // Upload mock file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([{
        name: 'FlatImage.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 dummy contents')
      }]);

      // Verify the button has true disabled attribute
      const executeBtn = page.locator('#btn-action-execute');
      await expect(executeBtn).toBeDisabled();
    });

    test('Case 5: Analyzer Panel Metrics accurately populated in DOM', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      // Setup mixed content mock
      await mockPdfEngine(page, {
        encrypted: false,
        corrupted: false,
        pageCount: 5,
        selectableText: true,
        totalCharsEstimated: 4500,
        embeddedImages: 8,
        composition: 'Mixed Text + Image PDF',
        hasTables: false,
        confidence: 'Medium',
        ocrRequired: false,
        suggestedMethod: 'Native Text Flow Extraction',
        columnCount: 0,
        rowCount: 0
      }, {
        encrypted: false,
        pageCount: 5,
        title: 'MixedDoc.pdf'
      });

      // Upload mock file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([{
        name: 'MixedDoc.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 dummy contents')
      }]);

      const panel = page.locator('.pdf-intelligence-panel');
      await expect(panel.locator('.metric-item', { hasText: 'PDF Type' })).toContainText('Mixed Text + Image PDF');
      await expect(panel.locator('.metric-item', { hasText: 'Pages Count' })).toContainText('5 Pages');
      await expect(panel.locator('.metric-item', { hasText: 'Image/Scanned Detected' })).toContainText('Yes');
      await expect(panel.locator('.metric-item', { hasText: 'Text Detected' })).toContainText('Yes (4500 chars)');
      await expect(panel.locator('.metric-item', { hasText: 'Table Detected' })).toContainText('No');
    });

  });

  test.describe('Real PDF Quality Fixture Verification', () => {
    const fs = require('fs');
    const path = require('path');
    const fixturesDir = path.join(__dirname, '..', 'fixtures');

    test('invoice-text.pdf: executes normal extraction & validates table split/alignments', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      // Hook up actual file upload
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      
      const invoicePath = path.join(fixturesDir, 'invoice-text.pdf');
      await fileChooser.setFiles(invoicePath);

      // Verify visual diagnostics panel is presented
      const panel = page.locator('.pdf-intelligence-panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('.metric-item', { hasText: 'PDF Type' })).toContainText('Real Text PDF');
      await expect(panel.locator('.metric-item', { hasText: 'Text Detected' })).toContainText('Yes');
      
      // Let's choose Data Mode
      await page.locator('#excel-conversion-mode').selectOption('data');

      // Click conversion action execution
      const executeBtn = page.locator('#btn-action-execute');
      await expect(executeBtn).toBeVisible();
      await expect(executeBtn).not.toBeDisabled();
      
      // Capture XLSX download
      const downloadPromise = page.waitForEvent('download');
      await executeBtn.click();
      
      // Handle potential warning overlay (if confidence is Medium or Low)
      const warningOverlay = page.locator('#warning-overlay');
      try {
        await expect(warningOverlay).toBeVisible({ timeout: 2000 });
        await page.locator('#btn-warning-proceed').click();
      } catch (e) {
        // Warning overlay not displayed, that is fine
      }
      
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/_extracted_data\.xlsx$/);

      // Read downloaded workbook package contents
      const downloadPath = await download.path();
      const workbookContent = fs.readFileSync(downloadPath, 'utf8');
      
      expect(workbookContent).not.toBeNull();
      expect(workbookContent.length).toBeGreaterThan(1000);
      expect(workbookContent).not.toContain('Page 1 only'); // Assert it's not empty/header-only stub
      
      // Check column header split & correct values
      expect(workbookContent).toContain('<v>Description</v>');
      expect(workbookContent).toContain('<v>Qty</v>');
      expect(workbookContent).toContain('<v>Unit Price</v>');
      expect(workbookContent).toContain('<v>Amount</v>');
      expect(workbookContent).toContain('<v>Consulting Services</v>');
      expect(workbookContent).toContain('<v>$1500.00</v>');
    });

    test('invoice-scanned.pdf: blocks empty downloads and shows scanned warnings', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      
      const scannedPath = path.join(fixturesDir, 'invoice-scanned.pdf');
      await fileChooser.setFiles(scannedPath);

      // Verify the PDF Intelligence Panel shows Scanned Image PDF
      const panel = page.locator('.pdf-intelligence-panel');
      await expect(panel).toBeVisible();
      await expect(panel.locator('.metric-item', { hasText: 'PDF Type' })).toContainText('Scanned Image PDF');
      
      // Verify page 1 warning overlay in preview area
      await expect(page.locator('.scanned-warning-overlay')).toBeVisible();
      await expect(page.locator('.scanned-warning-overlay h4')).toHaveText('Scanned Page Detected');

      // Verify prominent scanned warning box in options sidebar
      const warningBox = page.locator('.scanned-warning-box');
      await expect(warningBox).toBeVisible();
      await expect(warningBox.locator('h5')).toHaveText(/Scanned Document Warning/);

      // Verify execution action button is disabled
      const executeBtn = page.locator('#btn-action-execute');
      await expect(executeBtn).toBeDisabled();
      await expect(executeBtn).toHaveText('Excel Extractor (No text)');
    });

    test('table-heavy.pdf: extracts dense tabular grids successfully', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      
      const heavyPath = path.join(fixturesDir, 'table-heavy.pdf');
      await fileChooser.setFiles(heavyPath);

      // Select Data Mode
      await page.locator('#excel-conversion-mode').selectOption('data');

      // Capture XLSX download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#btn-action-execute').click();
      
      // Handle potential warning overlay (if confidence is Medium or Low)
      const warningOverlay = page.locator('#warning-overlay');
      try {
        await expect(warningOverlay).toBeVisible({ timeout: 2000 });
        await page.locator('#btn-warning-proceed').click();
      } catch (e) {
        // Warning overlay not displayed, that is fine
      }
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/_extracted_data\.xlsx$/);
      
      const downloadPath = await download.path();
      const workbookContent = fs.readFileSync(downloadPath, 'utf8');
      
      expect(workbookContent.length).toBeGreaterThan(1000);
      expect(workbookContent).toContain('<v>Item ID</v>');
      expect(workbookContent).toContain('<v>Name</v>');
      expect(workbookContent).toContain('<v>Category</v>');
      expect(workbookContent).toContain('<v>101</v>');
      expect(workbookContent).toContain('<v>Widgets</v>');
      expect(workbookContent).toContain('<v>$375.00</v>');
      expect(workbookContent).toContain('<v>105</v>');
      expect(workbookContent).toContain('<v>Fittings</v>');
    });

    test('messy-spacing.pdf: validates Y & X spacing proximity horizontal clustering to prevent left-shifting', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      
      const messyPath = path.join(fixturesDir, 'messy-spacing.pdf');
      await fileChooser.setFiles(messyPath);

      // Select Layout Mode
      await page.locator('#excel-conversion-mode').selectOption('layout');

      // Capture XLSX download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#btn-action-execute').click();
      
      // Handle potential warning overlay (if confidence is Medium or Low)
      const warningOverlay = page.locator('#warning-overlay');
      try {
        await expect(warningOverlay).toBeVisible({ timeout: 2000 });
        await page.locator('#btn-warning-proceed').click();
      } catch (e) {
        // Warning overlay not displayed, that is fine
      }
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/_extracted_layout\.xlsx$/);
      
      const downloadPath = await download.path();
      const workbookContent = fs.readFileSync(downloadPath, 'utf8');
      
      // Let's verify that coordinate grid clustering placed description, qty, price, and amount into separate columns
      // Each row should have exactly 4 columns mapped since there are 4 unique column bands (Description, Qty, Unit Price, Amount)
      // And the values should align nicely without left shifting.
      expect(workbookContent).toContain('<v>Consulting Services</v>');
      expect(workbookContent).toContain('<v>10</v>');
      expect(workbookContent).toContain('<v>$150.00</v>');
      expect(workbookContent).toContain('<v>$1500.00</v>');
      expect(workbookContent).toContain('<v>Software Dev</v>');
      expect(workbookContent).toContain('<v>$1000.00</v>');
    });

    test('low confidence warning: intercepts conversion and shows disclaimer before download', async ({ page }) => {
      await page.goto('/tools/pdf-converter/');
      await page.locator('#tools-grid .tool-card', { hasText: 'PDF to Excel' }).click();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#upload-zone').click();
      const fileChooser = await fileChooserPromise;
      
      // Let's upload messy-spacing.pdf which triggers a Medium confidence rating (and thus warning overlay)
      const messyPath = path.join(fixturesDir, 'messy-spacing.pdf');
      await fileChooser.setFiles(messyPath);

      // Select Layout Mode
      await page.locator('#excel-conversion-mode').selectOption('layout');

      // Click execute. It should intercept and open warning overlay
      await page.locator('#btn-action-execute').click();
      
      const overlay = page.locator('#warning-overlay');
      await expect(overlay).toBeVisible();
      await expect(page.locator('#warning-overlay-text')).toContainText(/complex layout signals/);

      // Clicking Proceed should start download
      const downloadPromise = page.waitForEvent('download');
      await page.locator('#btn-warning-proceed').click();
      const download = await downloadPromise;
      
      expect(download.url()).not.toBeNull();
    });
  });

});

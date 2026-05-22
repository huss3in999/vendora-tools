const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

async function main() {
  console.log('Launching browser to generate PDF fixtures...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to a blank page
  await page.goto('about:blank');
  
  // Inject pdf-lib CDN
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js' });
  
  // Verify PDFLib is loaded
  const isLoaded = await page.evaluate(() => typeof window.PDFLib !== 'undefined');
  if (!isLoaded) {
    throw new Error('Failed to load PDFLib inside browser context.');
  }
  
  console.log('PDFLib loaded. Generating binary buffers...');
  
  // 1. Generate invoice-text.pdf
  const invoiceTextBuffer = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    
    // Draw columns headers
    page.drawText('Description', { x: 50, y: 700, font, size: 12 });
    page.drawText('Qty', { x: 200, y: 700, font, size: 12 });
    page.drawText('Unit Price', { x: 300, y: 700, font, size: 12 });
    page.drawText('Amount', { x: 450, y: 700, font, size: 12 });
    
    // Draw line item
    page.drawText('Consulting Services', { x: 50, y: 650, font, size: 10 });
    page.drawText('10', { x: 200, y: 650, font, size: 10 });
    page.drawText('$150.00', { x: 300, y: 650, font, size: 10 });
    page.drawText('$1500.00', { x: 450, y: 650, font, size: 10 });
    
    // Draw totals
    page.drawText('Total Due', { x: 350, y: 550, font, size: 12 });
    page.drawText('$1500.00', { x: 450, y: 550, font, size: 12 });
    
    const bytes = await doc.save();
    return Array.from(bytes); // Convert Uint8Array to array for serialization
  });
  
  // 2. Generate invoice-scanned.pdf (Zero selectable text, image backdrop)
  const invoiceScannedBuffer = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    const page = doc.addPage([600, 800]);
    // Draw visual shapes, no text characters
    page.drawRectangle({
      x: 50,
      y: 100,
      width: 500,
      height: 600,
      color: PDFLib.rgb(0.9, 0.9, 0.9),
      borderColor: PDFLib.rgb(0.5, 0.5, 0.5),
      borderWidth: 2
    });
    
    const bytes = await doc.save();
    return Array.from(bytes);
  });
  
  // 3. Generate table-heavy.pdf
  const tableHeavyBuffer = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    
    // Draw columns headers
    page.drawText('Item ID', { x: 50, y: 700, font, size: 10 });
    page.drawText('Name', { x: 120, y: 700, font, size: 10 });
    page.drawText('Category', { x: 220, y: 700, font, size: 10 });
    page.drawText('Stock', { x: 320, y: 700, font, size: 10 });
    page.drawText('Price', { x: 400, y: 700, font, size: 10 });
    page.drawText('Total', { x: 480, y: 700, font, size: 10 });
    
    const items = [
      ['101', 'Widgets', 'Hardware', '150', '$2.50', '$375.00'],
      ['102', 'Gaskets', 'Hardware', '200', '$1.20', '$240.00'],
      ['103', 'Valves', 'Plumbing', '45', '$15.00', '$675.00'],
      ['104', 'Pipes', 'Plumbing', '80', '$5.50', '$440.00'],
      ['105', 'Fittings', 'Hardware', '300', '$0.80', '$240.00']
    ];
    
    items.forEach((row, idx) => {
      const y = 660 - (idx * 30);
      page.drawText(row[0], { x: 50, y, font, size: 9 });
      page.drawText(row[1], { x: 120, y, font, size: 9 });
      page.drawText(row[2], { x: 220, y, font, size: 9 });
      page.drawText(row[3], { x: 320, y, font, size: 9 });
      page.drawText(row[4], { x: 400, y, font, size: 9 });
      page.drawText(row[5], { x: 480, y, font, size: 9 });
    });
    
    const bytes = await doc.save();
    return Array.from(bytes);
  });
  
  // 4. Generate messy-spacing.pdf
  const messySpacingBuffer = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    
    // Draw columns headers
    page.drawText('Description', { x: 50, y: 700, font, size: 11 });
    page.drawText('Qty', { x: 200, y: 700, font, size: 11 });
    page.drawText('Unit Price', { x: 300, y: 700, font, size: 11 });
    page.drawText('Amount', { x: 450, y: 700, font, size: 11 });
    
    // Row 1: Consulting Services aligns at X=48, Qty 10 aligns at X=202, Unit Price $150.00 at X=298, Amount $1500.00 at X=452
    page.drawText('Consulting Services', { x: 48, y: 650, font, size: 10 });
    page.drawText('10', { x: 202, y: 650, font, size: 10 });
    page.drawText('$150.00', { x: 298, y: 650, font, size: 10 });
    page.drawText('$1500.00', { x: 452, y: 650, font, size: 10 });
    
    // Row 2: Software Dev aligns at X=51, Qty 5 aligns at X=198, Unit Price $200.00 at X=301, Amount $1000.00 at X=448
    page.drawText('Software Dev', { x: 51, y: 620, font, size: 10 });
    page.drawText('5', { x: 198, y: 620, font, size: 10 });
    page.drawText('$200.00', { x: 301, y: 620, font, size: 10 });
    page.drawText('$1000.00', { x: 448, y: 620, font, size: 10 });
    
    // Total Due aligns at X=350, $2500.00 aligns at X=450
    page.drawText('Total Due', { x: 350, y: 550, font, size: 11 });
    page.drawText('$2500.00', { x: 450, y: 550, font, size: 11 });
    
    const bytes = await doc.save();
    return Array.from(bytes);
  });
  
  await browser.close();
  
  // Write files to e2e/fixtures
  const fixturesDir = path.join(__dirname);
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(fixturesDir, 'invoice-text.pdf'), Buffer.from(invoiceTextBuffer));
  fs.writeFileSync(path.join(fixturesDir, 'invoice-scanned.pdf'), Buffer.from(invoiceScannedBuffer));
  fs.writeFileSync(path.join(fixturesDir, 'table-heavy.pdf'), Buffer.from(tableHeavyBuffer));
  fs.writeFileSync(path.join(fixturesDir, 'messy-spacing.pdf'), Buffer.from(messySpacingBuffer));
  
  console.log('Successfully generated all 4 PDF fixtures inside e2e/fixtures/!');
}

main().catch(err => {
  console.error('Error generating PDF fixtures:', err);
  process.exit(1);
});

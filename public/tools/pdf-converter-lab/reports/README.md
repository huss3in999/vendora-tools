# PDF Converter Lab Reports

Generated diagnosis notes and conversion test reports should be saved in this folder.

## Manual PPTX Prototype Test Checklist

Use `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\index.html`.

1. Open the lab page in a browser.
2. Upload a PDF.
3. Confirm the diagnostic panel shows the page count.
4. Confirm the output type says `.pptx`.
5. Confirm real PPTX output says yes.
6. Click `Convert to Real PPTX`.
7. Verify the downloaded file ends with `.pptx`.
8. Open the file in Microsoft PowerPoint, LibreOffice Impress, or Google Slides.
9. Verify each PDF page appears as one slide.
10. Verify the download is not an HTML file.
11. Verify the download is not a ZIP package with an HTML viewer.
12. Confirm the slide content is image-based and not fully editable yet.

## Manual DOCX Prototype Test Checklist

Use selectable-text PDFs first.

1. Open `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\index.html`.
2. Upload `invoice-text.pdf`.
3. Confirm the diagnostic panel shows selectable text.
4. Click `Convert to Editable DOCX`.
5. Confirm the downloaded file ends with `.docx`.
6. Open the file in Microsoft Word, LibreOffice Writer, or Google Docs.
7. Confirm the text is editable Word text, not a screenshot.
8. Upload `table-heavy.pdf`.
9. Convert to DOCX and check that text order is preserved, but do not expect perfect table layout yet.
10. Upload `invoice-scanned.pdf`.
11. Confirm the lab shows `This PDF likely needs OCR before DOCX conversion.`

Current DOCX smoke output:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\actual\invoice-text-lab-editable.docx`

## Manual XLSX Prototype Test Checklist

Use selectable-text PDFs first.

1. Open `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\index.html`.
2. Upload `table-heavy.pdf`.
3. Confirm the diagnostic panel shows selectable text and likely table signals.
4. Click `Convert to Editable XLSX`.
5. Confirm the downloaded file ends with `.xlsx`.
6. Open the file in Microsoft Excel, LibreOffice Calc, or Google Sheets.
7. Confirm the workbook has one sheet per PDF page.
8. Confirm the cells are editable Excel cells, not an HTML table or CSV file.
9. Confirm obvious plain numbers become numeric cells where safe.
10. Upload `invoice-text.pdf` and repeat the conversion.
11. Upload `invoice-scanned.pdf`.
12. Confirm the lab shows `This PDF likely needs OCR before XLSX conversion.`

Current XLSX smoke output:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\actual\table-heavy-lab-editable.xlsx`

## Manual Diagnostic Test Checklist

Use real PDFs where possible and record results in this folder.

1. Simple text PDF
   - Expected: selectable text is `Yes`.
   - Expected: recommendation is usually `docx`.
   - Check that reasoning mentions paragraph-style selectable text.

2. Invoice PDF
   - Expected: table detection may be `Yes` if text positions are aligned.
   - Expected: recommendation may be `xlsx`.
   - Check that warnings explain table detection is heuristic.

3. Table PDF
   - Expected: repeated x/y alignment should increase `likelyHasTables`.
   - Expected: recommendation should lean toward `xlsx`.
   - Check merged cells and borderless tables manually.

4. Arabic PDF
   - Expected: estimated language is `ar` or `mixed`.
   - Expected: warning mentions Arabic reading order and font shaping review.

5. Scanned PDF
   - Expected: selectable text is `No` or very low.
   - Expected: `isLikelyScanned` is `Yes`.
   - Expected: recommendation is `ocr`.

6. Presentation-style PDF
   - Expected: landscape or visual pages should increase `likelyPresentationStyle`.
   - Expected: recommendation may be `pptx`.
   - Check the PPTX output opens as real PowerPoint and each page is one slide.

## Current Expected Result

The prototype should create a real PowerPoint deck where every PDF page is rendered as a full-slide image background.

## Current Known Limitation

The PPTX lab version does not reconstruct editable PowerPoint text boxes, shapes, tables, charts, or images. It is a real `.pptx`, but the slide content is image-based.

The DOCX lab version creates editable Word paragraphs from selectable PDF text. It does not preserve complex layout, exact spacing, merged table cells, images, headers, footers, or scanned text yet.

The XLSX lab version creates editable Excel cells from selectable PDF text positions. It does not preserve merged cells, borders, formulas, exact column widths, images, or scanned tables yet.

The diagnostic system is heuristic. It uses pdf.js text items, rough alignment patterns, page orientation, and image operation counts. It does not guarantee perfect classification, and difficult PDFs should still be tested in multiple output modes.

## Diagnostic Report Runner Checklist

Use the report runner on the lab page only.

1. Open `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\index.html`.
2. Click `Run Diagnostic Test Report`.
3. Confirm the page shows a report preview table.
4. Confirm the browser downloads `latest-report.html`.
5. Confirm the browser downloads `latest-report.json`.
6. Open the HTML report and check it is readable.
7. Open the JSON report and check it includes file name, path, page count, selectable text, recommendation, difficulty, confidence, warnings, status, and notes.
8. Use `Upload Multiple PDFs for Batch Diagnostic Report` for files that are not reachable by browser fetch.

## Report Runner Limitations

The browser cannot reliably scan local folders when the lab page is opened directly from disk with `file://`. The known fixture button attempts to load safe fixture paths, but the manual multi-upload mode is the reliable fallback.

The report runner checks whether diagnostics completed and whether the expected fields exist. It does not test whether the recommendation is objectively correct yet.

If you want the known fixture button to load fixture PDFs automatically, serve the project root with a local static server first, then open the lab page from `http://localhost:PORT/tools/pdf-converter-lab/`. Opening the file directly from disk may block those fetches.

Current saved report files:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\reports\latest-report.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\reports\latest-report.json`

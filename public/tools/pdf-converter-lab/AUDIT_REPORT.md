# Vendora PDF Converter Lab Audit Report

Audit date: 2026-05-22 17:32:40 +03:00

Scope: existing PDF and Office conversion tools inside `E:\Users\Hussain Alyaqoob\Documents\GitHub\public`.

Lab rule followed: this report is audit-only. Live website files were inspected but not edited.

## 1. Existing PDF And Office Tool Pages Found

Primary live tool area:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\README.md`

Dedicated live tool pages:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\merge-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\split-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\rotate-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\compress-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\jpg-to-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\image-to-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\pdf-to-jpg\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\pdf-to-word\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\pdf-to-excel\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\word-to-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\excel-to-pdf\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\add-watermark\index.html`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\add-page-numbers\index.html`

Related testing files:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\tests\pdf-converter.spec.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\fixtures\invoice-text.pdf`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\fixtures\invoice-scanned.pdf`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\fixtures\table-heavy.pdf`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\fixtures\messy-spacing.pdf`

Related discovery file:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\llms.txt`

Unrelated or incidental hits found during the scan:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\inventory-tracker\vendor\xlsx.full.min.js` is for the inventory tracker, not the PDF converter.
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\_site\...` appears to be generated output and should not be treated as the source of truth.
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\node_modules\...` contains package internals and should not be audited as website source.

## 2. Exact Source Files Involved

Core source files used by the PDF converter:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-tools-config.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-converter.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-engine.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-analytics.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-converter.css`

Each dedicated tool page loads the shared engine and config, then sets `window.PdfToolsConfig.defaultToolId` for that page.

## 3. JavaScript Files Involved

- `pdf-tools-config.js`: catalog of tools, categories, status labels, descriptions, limitations, supported formats, and privacy text.
- `pdf-converter.js`: front-end controller for tool selection, upload handling, UI state, progress, validation, and conversion dispatch.
- `pdf-engine.js`: browser-side conversion engine. It loads external libraries from CDNs and performs PDF, image, Word, Excel, OCR, and fallback PowerPoint operations.
- `pdf-analytics.js`: analytics and interaction tracking for the converter UI.

## 4. CSS Files Involved

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-converter.css`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\tool-system.css`

The dedicated pages reference the shared tool system CSS plus the PDF converter CSS.

## 5. Libraries Currently Used

Detected from `pdf-engine.js`:

| Library | Source | Current use |
|---|---|---|
| `pdf-lib` | CDNJS | Reading, copying, editing, saving PDF files |
| `pdf.js` | CDNJS | Rendering PDF pages and extracting selectable text |
| `jsPDF` | CDNJS | Creating PDF output from images/canvas |
| `JSZip` | CDNJS | Creating ZIP output and basic OpenXML DOCX package |
| `SheetJS / XLSX` | CDNJS | Creating real `.xlsx` workbook output |
| `Tesseract.js` | jsDelivr | Browser OCR to text |

Not detected as active PDF converter libraries:

- `PptxGenJS`
- `ExcelJS`
- `docx` package
- server-side OCR tools
- server-side PDF layout engines

## 6. Download And Output Logic Found

Main output helper:

- `pdf-engine.js` has `downloadFile(blobOrBuffer, fileName, mimeType)` that creates a `Blob`, creates a temporary object URL, clicks a temporary `<a download>`, then revokes the URL.

Important output paths:

- PDF operations output real PDF blobs.
- Image extraction creates JPG files and may package multiple images into ZIP.
- Word conversion calls `makeDocxFromPages()` and downloads a `.docx` file.
- Excel conversion calls SheetJS and downloads a `.xlsx` file.
- OCR downloads `.txt`.
- PowerPoint conversion currently downloads a `.zip` package, not `.pptx`.

## 7. Word Output: Real DOCX Or HTML/Text-Based

Current verdict: real but basic `.docx`.

Evidence:

- `pdf-engine.js` contains `makeDocxFromPages()`.
- It builds a minimal Office Open XML package using `JSZip`.
- It downloads with MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- `pdfToWordBasicText()` extracts selectable PDF text with `pdf.js`, then passes page text into the DOCX builder.

Important limitation:

This is not a full professional PDF-to-Word layout reconstruction engine. It is real DOCX packaging, but it is mostly text extraction. It does not preserve complex PDF layout, exact fonts, positioned text boxes, embedded images, scanned pages, tables, headers, footers, or vector objects with Adobe-level fidelity.

## 8. Excel Output: Real XLSX Or CSV/HTML-Based

Current verdict: real but basic `.xlsx`.

Evidence:

- `pdf-engine.js` contains `pdfToExcelBasicTable()`.
- It loads the `XLSX` global from SheetJS.
- It creates a workbook and worksheet, then writes `bookType: 'xlsx'`.
- It downloads with MIME type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

Important limitation:

This is not CSV or HTML pretending to be Excel. It is a real XLSX file. However, the extraction is heuristic. It depends on selectable text positions and row/column detection, so it will not reliably preserve exact PDF table design, merged cells, borders, colors, formulas, images, or complex multi-column layouts.

## 9. PowerPoint Output: Real PPTX Or HTML/Image-Based

Current verdict: not real `.pptx`.

Evidence:

- `pdf-engine.js` contains `pdfToPowerPointBasicImages()`.
- The function renders PDF pages into slide images.
- It packages the slide images plus `slideshow_viewer.html` into a ZIP file.
- It downloads with MIME type `application/zip`.

So the current PowerPoint output is a ZIP containing image slides and an HTML viewer. It is not a PPTX file and it is not an editable PowerPoint deck.

## 10. Why PowerPoint May Download As HTML Instead Of Real PPTX

The current implementation intentionally creates a fallback package:

1. PDF pages are rendered as images.
2. The images are placed into a ZIP.
3. A `slideshow_viewer.html` file is included so the user can preview the images as slides.
4. No PowerPoint OpenXML package is created.
5. No `PptxGenJS` or equivalent PPTX generator is loaded.

Because of this, a user may see an HTML file inside the downloaded package and reasonably think the PowerPoint converter is fake or broken. Technically, it is an image/HTML fallback, not a PowerPoint converter.

## 11. Current Risks And Weak Points

- The tool depends on external CDN libraries. If a CDN is blocked or slow, conversion can fail.
- Some converter config icons appear mojibake/corrupted in `pdf-tools-config.js`, which indicates an encoding issue in that file.
- `pdf-to-powerpoint` is labeled as a converter but does not create a real PPTX file.
- `word-to-pdf` has a dedicated page and a basic status, but no matching conversion case was found in the dispatcher scan.
- `excel-to-pdf` has a dedicated page, but its config status appears future and it should not be marketed as complete.
- `powerpoint-to-pdf` appears in the config as future, but no dedicated page was found in the current source list.
- OCR is browser-side and appears limited. It should be tested on English, Arabic, mixed language, rotated scans, and low-resolution scans before public claims are strengthened.
- DOCX output is real but basic text-only style reconstruction.
- XLSX output is real but heuristic and may fail on borderless tables, merged cells, images, complex invoices, and scanned PDFs.
- Compression appears to flatten rendered pages into image-based PDFs, which can reduce text selectability and accessibility.
- Large files may hit browser memory limits.
- Current testing is stronger for UI and XLSX fixtures than for real DOCX/PPTX/OCR fidelity.

## 12. Files That Should Not Be Touched Yet

Do not touch these during lab-only work:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\**`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\llms.txt`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\robots.txt`
- sitemap files
- homepage files
- package files
- generated `_site` files
- unrelated tools such as inventory tracker, calculators, and transport pages

## 13. Files That May Be Safely Replaced Later

Only after the lab proves a better engine and the user approves live migration:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-engine.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-converter.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter\assets\pdf-tools-config.js`
- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\tests\pdf-converter.spec.js`

For now, only this lab area is safe to edit:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\tools\pdf-converter-lab\`

## 14. Recommended Upgrade Path

1. Place real sample PDFs into the lab fixture folders.
2. Add a lab-only diagnosis script that reports text availability, image density, table signals, OCR need, language signals, page count, and conversion difficulty.
3. Create gold-standard expected outputs in `expected/`.
4. Build lab-only converters for DOCX, XLSX, and PPTX without touching live files.
5. Compare lab outputs against expected files and generate reports in `reports/`.
6. Add regression tests for scanned PDFs, Arabic PDFs, mixed Arabic/English PDFs, borderless tables, invoices, image-heavy pages, forms, and presentation-style PDFs.
7. Only after the lab score is acceptable, migrate the proven engine into the live converter.

## 15. Simple Current Flow Diagram

```text
User opens HTML page
  -> shared config selects the tool
  -> pdf-converter.js handles upload, UI, validation, and dispatch
  -> pdf-engine.js loads CDN libraries as needed
  -> browser processes the file locally
  -> downloadFile() creates Blob output
  -> browser downloads PDF / DOCX / XLSX / TXT / ZIP
```

## 16. Missing Dependencies Or Libraries Needed For Real Office Output

For real PowerPoint output:

- Add `PptxGenJS`, or build a PowerPoint OpenXML `.pptx` package manually with `JSZip`.
- For basic PPTX, each PDF page can become a slide background image.
- For professional PPTX, the lab needs text extraction, image extraction, positioning, fonts, shapes, and editable object mapping.

For better Word output:

- A dedicated DOCX generation library such as `docx` may be easier to maintain than manual OpenXML.
- Professional fidelity still needs layout analysis, image extraction, font/style mapping, table reconstruction, and scanned-page OCR.

For better Excel output:

- SheetJS already exists and is suitable for basic workbook generation.
- `ExcelJS` may help with richer styling, merged cells, borders, column widths, and workbook formatting.
- Real table detection still needs a stronger table extraction layer before workbook generation.

For stronger OCR:

- Tesseract.js exists, but Arabic and mixed Arabic/English OCR need explicit language setup and testing.
- Image preprocessing may be needed: deskew, denoise, contrast, rotation detection, and thresholding.
- Browser-only OCR may remain slow for large scans.

For Adobe/iLovePDF-level accuracy:

- Browser-only code will not reach 100 percent fidelity across all PDFs.
- A professional engine usually needs server-side processing, native PDF libraries, OCR preprocessing, and format-specific reconstruction.

## 17. Playwright Test Coverage

Existing test file:

- `E:\Users\Hussain Alyaqoob\Documents\GitHub\public\e2e\tests\pdf-converter.spec.js`

Current coverage found:

- PDF converter hub layout and SEO checks.
- Search and category filtering.
- Tool opening from cards.
- Limitation alert behavior.
- Upload validation.
- Mobile horizontal overflow and console error checks.
- Mocked pre-conversion intelligence flow.
- Real fixture tests for PDF-to-Excel using text invoices, scanned invoices, table-heavy PDFs, and messy spacing PDFs.
- UI switch coverage for OCR.

Coverage gaps:

- No confirmed real DOCX structure validation.
- No confirmed real PPTX validation because PPTX is not currently produced.
- No full OCR output accuracy test.
- No Arabic OCR fidelity test.
- No mixed Arabic/English fixture comparison.
- No visual comparison against expected Word/Excel/PowerPoint output.
- No test that prevents a ZIP/HTML fallback from being marketed as PPTX.

## 18. Browser-Only Or Backend/Serverless

Current implemented converter flow appears browser-only.

Evidence:

- Tool config repeatedly says files are processed inside the browser.
- `pdf-engine.js` uses client-side libraries and browser Blob downloads.
- No active backend/serverless endpoint was found in the conversion dispatch for the currently implemented PDF-to-Word, PDF-to-Excel, PDF-to-PowerPoint, or OCR flows.

Important note:

The config mentions future AI tools such as summarization and translation that would require consent/upload through `ai-core`, but those are marked future and were not found as active conversion paths in the current dispatcher.

## Final Audit Verdict

The current PDF converter is a useful browser-first toolkit, but it is not yet a professional Adobe/iLovePDF-level conversion engine.

The strongest current areas are simple PDF operations, image/PDF operations, and basic real XLSX/DOCX generation from selectable text.

The weakest current area is PowerPoint conversion, because it does not produce real PPTX. The next most important weakness is conversion fidelity for complex layouts, scanned documents, Arabic OCR, and exact Office formatting.

# PDF / Document Converter Expert Auditor

This auditor is isolated from the live converter implementation. It tests the live PDF converter as a user would, then writes reports and evidence under this lab folder.

## Purpose

The auditor checks whether converter tools preserve the original document as much as possible while making content editable where possible.

It focuses on:

- layout fidelity
- editable text
- image and logo preservation
- table/cell reconstruction
- page size and page count
- reading order
- OCR readiness
- output format validity
- user warnings and error states

## Run

From the project root:

```powershell
node tools\pdf-converter-lab\auditor\converter-expert-auditor.js
```

The script starts a temporary local static server, tests the converter in Playwright, downloads outputs, checks Office package structure, captures screenshots, and writes reports.

## Output

Reports are written to:

- `tools/pdf-converter-lab/auditor/reports/converter-expert-audit.html`
- `tools/pdf-converter-lab/auditor/reports/converter-expert-audit.json`

Evidence is written to:

- `tools/pdf-converter-lab/auditor/reports/screenshots/`
- `tools/pdf-converter-lab/auditor/reports/downloads/`

## Important Limitations

This auditor can verify browser UI behavior, download formats, package structure, and many conversion signals. It cannot fully render DOCX/PPTX/XLSX output for visual comparison unless a local Office/LibreOffice renderer is added later.

For professional before/after visual comparison, the next auditor phase should add LibreOffice or Microsoft Office automation to render generated Office files into images.

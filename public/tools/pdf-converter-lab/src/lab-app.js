(function () {
  "use strict";

  const els = {
    file: document.getElementById("pdf-file"),
    convert: document.getElementById("convert-button"),
    convertDocx: document.getElementById("convert-docx-button"),
    convertXlsx: document.getElementById("convert-xlsx-button"),
    reset: document.getElementById("reset-button"),
    status: document.getElementById("status"),
    docxStatus: document.getElementById("docx-status"),
    xlsxStatus: document.getElementById("xlsx-status"),
    pageCount: document.getElementById("page-count"),
    outputType: document.getElementById("output-type"),
    realPptx: document.getElementById("real-pptx"),
    conversionMode: document.getElementById("conversion-mode"),
    recommendedOutput: document.getElementById("recommended-output"),
    confidenceScore: document.getElementById("confidence-score"),
    difficulty: document.getElementById("difficulty"),
    hasSelectableText: document.getElementById("has-selectable-text"),
    textItemCount: document.getElementById("text-item-count"),
    estimatedLanguage: document.getElementById("estimated-language"),
    isLikelyScanned: document.getElementById("is-likely-scanned"),
    imageHeavy: document.getElementById("image-heavy"),
    likelyHasTables: document.getElementById("likely-has-tables"),
    likelyHasColumns: document.getElementById("likely-has-columns"),
    likelyPresentationStyle: document.getElementById("likely-presentation-style"),
    analyzedPages: document.getElementById("analyzed-pages"),
    warningsBox: document.getElementById("warnings-box"),
    warningsList: document.getElementById("warnings-list"),
    reasoningList: document.getElementById("reasoning-list"),
    runFixtureReport: document.getElementById("run-fixture-report"),
    batchPdfs: document.getElementById("batch-pdfs"),
    runBatchReport: document.getElementById("run-batch-report"),
    reportStatus: document.getElementById("report-status"),
    reportOutput: document.getElementById("report-output"),
    previewCanvas: document.getElementById("preview-canvas")
  };

  let selectedFile = null;
  let currentDiagnostics = null;

  function setStatus(message, isError = false) {
    els.status.textContent = message;
    els.status.classList.toggle("error", isError);
  }

  function setDocxStatus(message, isError = false) {
    els.docxStatus.textContent = message;
    els.docxStatus.classList.toggle("error", isError);
  }

  function setXlsxStatus(message, isError = false) {
    els.xlsxStatus.textContent = message;
    els.xlsxStatus.classList.toggle("error", isError);
  }

  function setBusy(isBusy) {
    els.file.disabled = isBusy;
    els.convert.disabled = isBusy || !selectedFile;
    els.convertDocx.disabled = isBusy || !selectedFile;
    els.convertXlsx.disabled = isBusy || !selectedFile;
    els.reset.disabled = isBusy;
  }

  function setReportBusy(isBusy) {
    els.runFixtureReport.disabled = isBusy;
    els.batchPdfs.disabled = isBusy;
    els.runBatchReport.disabled = isBusy || !(els.batchPdfs.files && els.batchPdfs.files.length);
  }

  function setReportStatus(message, isError = false) {
    els.reportStatus.textContent = message;
    els.reportStatus.classList.toggle("error", isError);
  }

  function yesNo(value) {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Unknown";
  }

  function renderList(listEl, items, fallback) {
    listEl.innerHTML = "";

    const safeItems = Array.isArray(items) && items.length ? items : [fallback];
    safeItems.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      listEl.appendChild(li);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderReportPreview(report) {
    const rows = report.rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.fileName)}</td>
        <td>${escapeHtml(row.pageCount)}</td>
        <td>${escapeHtml(row.selectableText)}</td>
        <td>${escapeHtml(row.recommendedOutput)}</td>
        <td>${escapeHtml(row.difficulty)}</td>
        <td>${escapeHtml(row.confidenceScore)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>
    `).join("");

    els.reportOutput.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Pages</th>
            <th>Selectable</th>
            <th>Recommended</th>
            <th>Difficulty</th>
            <th>Confidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    els.reportOutput.hidden = false;
  }

  function setDiagnostics(data) {
    const next = {
      ...(currentDiagnostics || {}),
      ...(data || {})
    };

    currentDiagnostics = next;

    els.pageCount.textContent = next.pageCount ? String(next.pageCount) : "Not detected";
    els.outputType.textContent = next.outputType || ".pptx";
    els.realPptx.textContent = next.realPptx ? "Yes, real .pptx" : "No";
    els.conversionMode.textContent = next.conversionMode || "page-image-to-slide";
    els.recommendedOutput.textContent = next.recommendedOutput || "unknown";
    els.confidenceScore.textContent = typeof next.confidenceScore === "number" ? `${next.confidenceScore} / 100` : "0 / 100";
    els.difficulty.textContent = next.difficulty || "Unknown";
    els.hasSelectableText.textContent = yesNo(next.hasSelectableText);
    els.textItemCount.textContent = String(next.textItemCount || 0);
    els.estimatedLanguage.textContent = next.estimatedLanguage || "unknown";
    els.isLikelyScanned.textContent = yesNo(next.isLikelyScanned);
    els.imageHeavy.textContent = yesNo(next.imageHeavy);
    els.likelyHasTables.textContent = yesNo(next.likelyHasTables);
    els.likelyHasColumns.textContent = yesNo(next.likelyHasColumns);
    els.likelyPresentationStyle.textContent = yesNo(next.likelyPresentationStyle);
    els.analyzedPages.textContent = String(next.analyzedPages || 0);

    const warnings = Array.isArray(next.warnings) ? next.warnings : [];
    els.warningsBox.hidden = warnings.length === 0;
    renderList(els.warningsList, warnings, "No diagnostic warnings yet.");
    renderList(
      els.reasoningList,
      next.reasoning,
      "Upload a PDF to see why the lab recommends Word, Excel, PowerPoint, OCR, or unknown."
    );
  }

  async function renderPreview(file) {
    const pdf = await window.LabPdfDiagnostic.loadPdfFromFile(file);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = els.previewCanvas;
    const context = canvas.getContext("2d", { alpha: false });

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.hidden = false;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;
  }

  function reset() {
    selectedFile = null;
    currentDiagnostics = null;
    els.file.value = "";
    els.previewCanvas.hidden = true;
    setDiagnostics({
      pageCount: null,
      outputType: ".pptx",
      realPptx: true,
      conversionMode: "page-image-to-slide",
      recommendedOutput: "unknown",
      confidenceScore: 0,
      difficulty: "Unknown",
      hasSelectableText: null,
      textItemCount: 0,
      estimatedLanguage: "unknown",
      isLikelyScanned: null,
      imageHeavy: null,
      likelyHasTables: null,
      likelyHasColumns: null,
      likelyPresentationStyle: null,
      analyzedPages: 0,
      warnings: [],
      reasoning: []
    });
    setStatus("Choose a PDF to begin.");
    setDocxStatus("DOCX conversion needs a selectable-text PDF.");
    setXlsxStatus("XLSX conversion needs a selectable-text PDF.");
    setBusy(false);
  }

  async function handleFileChange() {
    const file = els.file.files && els.file.files[0];
    selectedFile = null;
    setBusy(true);

    try {
      if (!file) {
        reset();
        return;
      }

      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Please select a PDF file.");
      }

      setStatus("Reading PDF diagnostics...");
      const diagnostics = await window.LabPdfDiagnostic.inspectPdf(file);
      selectedFile = file;
      setDiagnostics(diagnostics);
      await renderPreview(file);
      setStatus(`Recommended output: ${diagnostics.recommendedOutput}. PPTX lab conversion is ready if you want slide-image output.`);
      setDocxStatus(
        diagnostics.isLikelyScanned || !diagnostics.hasSelectableText
          ? "This PDF likely needs OCR before DOCX conversion."
          : "DOCX lab conversion is ready for selectable editable text."
      );
      setXlsxStatus(
        diagnostics.isLikelyScanned || !diagnostics.hasSelectableText
          ? "This PDF likely needs OCR before XLSX conversion."
          : "XLSX lab conversion is ready for selectable editable cells."
      );
    } catch (error) {
      selectedFile = null;
      setStatus(error.message || "Could not read this PDF.", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    if (!selectedFile) {
      setStatus("Choose a PDF first.", true);
      return;
    }

    setBusy(true);
    setStatus("Creating real PowerPoint file...");

    try {
      const result = await window.LabPdfToPptx.convertPdfToPptx(selectedFile, {
        onProgress: ({ pageNumber, pageCount }) => {
          setStatus(`Rendering page ${pageNumber} of ${pageCount} into PowerPoint slide...`);
        }
      });

      setDiagnostics({
        ...currentDiagnostics,
        ...result
      });
      setStatus(`Downloaded ${result.fileName}. Real PPTX created with image-based slides.`);
    } catch (error) {
      setStatus(error.message || "Conversion failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleDocxConvert() {
    if (!selectedFile) {
      setDocxStatus("Choose a PDF first.", true);
      return;
    }

    if (currentDiagnostics && (currentDiagnostics.isLikelyScanned || !currentDiagnostics.hasSelectableText)) {
      setDocxStatus("This PDF likely needs OCR before DOCX conversion.", true);
      return;
    }

    setBusy(true);
    setDocxStatus("Creating real editable Word document...");

    try {
      const result = await window.LabPdfToDocx.convertPdfToDocx(selectedFile, {
        diagnostics: currentDiagnostics,
        onProgress: ({ pageNumber, pageCount }) => {
          setDocxStatus(`Extracting page ${pageNumber} of ${pageCount} into editable Word paragraphs...`);
        }
      });

      setDiagnostics({
        ...currentDiagnostics,
        outputType: result.outputType,
        conversionMode: result.conversionMode
      });
      setDocxStatus(`Downloaded ${result.fileName}. Real DOCX created with editable text.`);
    } catch (error) {
      setDocxStatus(error.message || "DOCX conversion failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleXlsxConvert() {
    if (!selectedFile) {
      setXlsxStatus("Choose a PDF first.", true);
      return;
    }

    if (currentDiagnostics && (currentDiagnostics.isLikelyScanned || !currentDiagnostics.hasSelectableText)) {
      setXlsxStatus("This PDF likely needs OCR before XLSX conversion.", true);
      return;
    }

    setBusy(true);
    setXlsxStatus("Creating real editable Excel workbook...");

    try {
      const result = await window.LabPdfToXlsx.convertPdfToXlsx(selectedFile, {
        diagnostics: currentDiagnostics,
        onProgress: ({ pageNumber, pageCount }) => {
          setXlsxStatus(`Extracting page ${pageNumber} of ${pageCount} into editable Excel cells...`);
        }
      });

      setDiagnostics({
        ...currentDiagnostics,
        outputType: result.outputType,
        conversionMode: result.conversionMode
      });
      setXlsxStatus(`Downloaded ${result.fileName}. Real XLSX created with editable cells.`);
    } catch (error) {
      setXlsxStatus(error.message || "XLSX conversion failed.", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleFixtureReport() {
    if (!window.LabPdfTestRunner) {
      setReportStatus("Test runner module is not loaded.", true);
      return;
    }

    setReportBusy(true);

    try {
      const report = await window.LabPdfTestRunner.runKnownFixtureReport(setReportStatus);
      renderReportPreview(report);
      window.LabPdfTestRunner.downloadReport(report);
      setReportStatus(`Report complete: ${report.summary.passed} passed, ${report.summary.failed} failed. Downloaded HTML and JSON copies.`);
    } catch (error) {
      setReportStatus(error.message || "Could not generate fixture report.", true);
    } finally {
      setReportBusy(false);
    }
  }

  async function handleBatchReport() {
    if (!window.LabPdfTestRunner) {
      setReportStatus("Test runner module is not loaded.", true);
      return;
    }

    const files = els.batchPdfs.files;

    if (!files || !files.length) {
      setReportStatus("Choose one or more PDFs first.", true);
      return;
    }

    setReportBusy(true);

    try {
      const report = await window.LabPdfTestRunner.runManualFileReport(files, setReportStatus);
      renderReportPreview(report);
      window.LabPdfTestRunner.downloadReport(report);
      setReportStatus(`Batch report complete: ${report.summary.passed} passed, ${report.summary.failed} failed. Downloaded HTML and JSON copies.`);
    } catch (error) {
      setReportStatus(error.message || "Could not generate batch report.", true);
    } finally {
      setReportBusy(false);
    }
  }

  function handleBatchSelection() {
    const count = els.batchPdfs.files ? els.batchPdfs.files.length : 0;
    els.runBatchReport.disabled = count === 0;
    setReportStatus(count ? `${count} PDF file(s) selected for batch diagnostics.` : "No report generated in this browser session yet.");
  }

  els.file.addEventListener("change", handleFileChange);
  els.convert.addEventListener("click", handleConvert);
  els.convertDocx.addEventListener("click", handleDocxConvert);
  els.convertXlsx.addEventListener("click", handleXlsxConvert);
  els.reset.addEventListener("click", reset);
  els.runFixtureReport.addEventListener("click", handleFixtureReport);
  els.batchPdfs.addEventListener("change", handleBatchSelection);
  els.runBatchReport.addEventListener("click", handleBatchReport);

  reset();
  setReportBusy(false);
})();

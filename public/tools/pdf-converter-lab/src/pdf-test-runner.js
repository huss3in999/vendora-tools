(function () {
  "use strict";

  const KNOWN_FIXTURES = [
    {
      name: "invoice-text.pdf",
      path: "../../e2e/fixtures/invoice-text.pdf",
      notes: "Existing e2e selectable text fixture."
    },
    {
      name: "table-heavy.pdf",
      path: "../../e2e/fixtures/table-heavy.pdf",
      notes: "Existing e2e table-heavy fixture."
    },
    {
      name: "invoice-scanned.pdf",
      path: "../../e2e/fixtures/invoice-scanned.pdf",
      notes: "Existing e2e scanned/low-text fixture."
    }
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildStatus(diagnostic, error) {
    if (error) {
      return {
        status: "fail",
        notes: error.message || "Diagnostic failed."
      };
    }

    const hasRecommendation = ["docx", "xlsx", "pptx", "ocr", "unknown"].includes(diagnostic.recommendedOutput);
    const hasPageCount = Number(diagnostic.pageCount) > 0;

    if (!hasRecommendation || !hasPageCount) {
      return {
        status: "fail",
        notes: "Diagnostic completed but returned incomplete page count or recommendation data."
      };
    }

    return {
      status: "pass",
      notes: "Diagnostic completed. This report checks signal extraction only, not recommendation accuracy."
    };
  }

  async function fetchFixtureAsFile(fixture) {
    const response = await fetch(fixture.path);

    if (!response.ok) {
      throw new Error(`Could not fetch ${fixture.path}. Browser folder scanning may be blocked on file://.`);
    }

    const blob = await response.blob();
    return new File([blob], fixture.name, { type: "application/pdf" });
  }

  async function inspectFile(file, filePath, notes) {
    try {
      const diagnostic = await window.LabPdfDiagnostic.inspectPdf(file);
      const status = buildStatus(diagnostic);

      return {
        fileName: file.name,
        filePath,
        pageCount: diagnostic.pageCount,
        selectableText: diagnostic.hasSelectableText ? "yes" : "no",
        recommendedOutput: diagnostic.recommendedOutput,
        difficulty: diagnostic.difficulty,
        confidenceScore: diagnostic.confidenceScore,
        warnings: diagnostic.warnings || [],
        status: status.status,
        notes: `${status.notes}${notes ? ` ${notes}` : ""}`,
        diagnostic
      };
    } catch (error) {
      const status = buildStatus(null, error);

      return {
        fileName: file ? file.name : "unknown",
        filePath,
        pageCount: 0,
        selectableText: "unknown",
        recommendedOutput: "unknown",
        difficulty: "unknown",
        confidenceScore: 0,
        warnings: [status.notes],
        status: status.status,
        notes: `${status.notes}${notes ? ` ${notes}` : ""}`
      };
    }
  }

  function buildSummary(rows) {
    const passed = rows.filter((row) => row.status === "pass").length;
    const failed = rows.length - passed;

    return {
      totalFiles: rows.length,
      passed,
      failed,
      recommendations: rows.reduce((acc, row) => {
        acc[row.recommendedOutput] = (acc[row.recommendedOutput] || 0) + 1;
        return acc;
      }, {})
    };
  }

  function buildReport(rows, mode) {
    const report = {
      project: "Vendora PDF Converter Lab",
      reportType: "diagnostic-report",
      mode,
      generatedAt: nowIso(),
      summary: buildSummary(rows),
      rows
    };

    report.html = buildHtml(report);
    return report;
  }

  function buildHtml(report) {
    const rowsHtml = report.rows.map((row) => {
      const warnings = row.warnings && row.warnings.length ? row.warnings.join("; ") : "None";

      return `
        <tr>
          <td>${escapeHtml(row.fileName)}</td>
          <td>${escapeHtml(row.filePath)}</td>
          <td>${escapeHtml(row.pageCount)}</td>
          <td>${escapeHtml(row.selectableText)}</td>
          <td>${escapeHtml(row.recommendedOutput)}</td>
          <td>${escapeHtml(row.difficulty)}</td>
          <td>${escapeHtml(row.confidenceScore)}</td>
          <td>${escapeHtml(warnings)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.notes)}</td>
        </tr>`;
    }).join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PDF Converter Lab Diagnostic Report</title>
  <style>
    body { margin: 0; padding: 32px; background: #07111f; color: #f5f7fb; font-family: Arial, Helvetica, sans-serif; }
    h1 { margin: 0 0 8px; }
    p { color: #b6c4d8; }
    .summary { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
    .card { border: 1px solid #274565; border-radius: 8px; background: #102039; padding: 14px; min-width: 140px; }
    .card span { display: block; color: #b6c4d8; font-size: 13px; }
    .card strong { display: block; margin-top: 4px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #102039; }
    th, td { border: 1px solid #274565; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #132845; }
    td { color: #dbe5f5; }
  </style>
</head>
<body>
  <h1>PDF Converter Lab Diagnostic Report</h1>
  <p>Generated: ${escapeHtml(report.generatedAt)}</p>
  <p>Mode: ${escapeHtml(report.mode)}</p>
  <div class="summary">
    <div class="card"><span>Total files</span><strong>${escapeHtml(report.summary.totalFiles)}</strong></div>
    <div class="card"><span>Passed</span><strong>${escapeHtml(report.summary.passed)}</strong></div>
    <div class="card"><span>Failed</span><strong>${escapeHtml(report.summary.failed)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>File name</th>
        <th>File path</th>
        <th>Page count</th>
        <th>Selectable text</th>
        <th>Recommended output</th>
        <th>Difficulty</th>
        <th>Confidence</th>
        <th>Warnings</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
  }

  function downloadTextFile(text, fileName, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function runKnownFixtureReport(onProgress) {
    const rows = [];

    for (const fixture of KNOWN_FIXTURES) {
      if (typeof onProgress === "function") {
        onProgress(`Running diagnostic for ${fixture.name}...`);
      }

      try {
        const file = await fetchFixtureAsFile(fixture);
        rows.push(await inspectFile(file, fixture.path, fixture.notes));
      } catch (error) {
        rows.push(await inspectFile({ name: fixture.name }, fixture.path, `${fixture.notes} ${error.message}`));
      }
    }

    return buildReport(rows, "known-fixtures");
  }

  async function runManualFileReport(files, onProgress) {
    const rows = [];
    const fileList = Array.from(files || []);

    for (const file of fileList) {
      if (typeof onProgress === "function") {
        onProgress(`Running diagnostic for ${file.name}...`);
      }

      rows.push(await inspectFile(file, `manual-upload/${file.name}`, "Manual browser upload."));
    }

    return buildReport(rows, "manual-multi-upload");
  }

  function downloadReport(report) {
    const jsonReport = { ...report };
    delete jsonReport.html;

    downloadTextFile(JSON.stringify(jsonReport, null, 2), "latest-report.json", "application/json;charset=utf-8");
    downloadTextFile(report.html, "latest-report.html", "text/html;charset=utf-8");
  }

  window.LabPdfTestRunner = {
    runKnownFixtureReport,
    runManualFileReport,
    downloadReport,
    buildReport
  };
})();

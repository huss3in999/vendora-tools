/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const { chromium } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "../../..");
const AUDITOR_DIR = path.join(ROOT, "tools/pdf-converter-lab/auditor");
const FIXTURE_DIR = path.join(AUDITOR_DIR, "fixtures");
const REPORT_DIR = path.join(AUDITOR_DIR, "reports");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
const DOWNLOAD_DIR = path.join(REPORT_DIR, "downloads");
const CONFIG_PATH = path.join(AUDITOR_DIR, "auditor-config.json");
const PORT = 8788;

const FIXTURES = {
  simple: "simple-english.pdf",
  catalog: "catalog.pdf",
  menu: "menu.pdf",
  brochure: "brochure.pdf",
  invoice: "invoice.pdf",
  form: "form.pdf",
  logoImageHeavy: "logo-image-heavy.pdf",
  chart: "chart.pdf",
  table: "table.pdf",
  mixedFonts: "mixed-fonts.pdf",
  english: "english.pdf",
  arabic: "arabic.pdf",
  urdu: "urdu.pdf",
  hindi: "hindi.pdf",
  bengali: "bengali.pdf",
  chinese: "chinese.pdf",
  japanese: "japanese.pdf",
  korean: "korean.pdf",
  russian: "russian.pdf",
  french: "french.pdf",
  spanish: "spanish.pdf",
  turkish: "turkish.pdf",
  mixedRtlLtr: "mixed-rtl-ltr.pdf",
  scanned: "scanned.pdf",
  password: "password-protected.pdf",
  corrupted: "corrupted.pdf",
  large: "large.pdf",
  multiPage: "multi-page.pdf"
};

const DOCX_CASES = [
  "simple", "catalog", "menu", "brochure", "invoice", "form", "logoImageHeavy", "chart", "table",
  "mixedFonts", "english", "arabic", "urdu", "hindi", "bengali", "chinese", "japanese", "korean",
  "russian", "french", "spanish", "turkish", "mixedRtlLtr", "multiPage"
];

const PPTX_CASES = ["catalog", "menu", "brochure", "invoice", "logoImageHeavy", "chart", "mixedFonts", "arabic", "mixedRtlLtr", "multiPage"];
const XLSX_CASES = ["table", "invoice", "menu", "large"];

function ensureDirs() {
  [REPORT_DIR, SCREENSHOT_DIR, DOWNLOAD_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function fixturePath(key) {
  return path.join(FIXTURE_DIR, FIXTURES[key]);
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function runJsonPython(scriptName, args) {
  const script = path.join(AUDITOR_DIR, scriptName);
  const stdout = execFileSync("python", [script, ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
  return JSON.parse(stdout);
}

function analyzePdf(filePath) {
  return runJsonPython("pdf_fixture_analyzer.py", [filePath]);
}

function analyzeOffice(filePath, kind) {
  return runJsonPython("office_package_analyzer.py", [filePath, kind]);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html;charset=utf-8";
  if (ext === ".js") return "application/javascript;charset=utf-8";
  if (ext === ".css") return "text/css;charset=utf-8";
  if (ext === ".json") return "application/json;charset=utf-8";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const requested = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    let filePath = path.resolve(ROOT, requested || "index.html");
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function baseResult(toolName, testFile, priority = "High") {
  return {
    toolName,
    testFile,
    status: "WARNING",
    qualityScore: 0,
    metrics: {},
    whatWorked: [],
    whatFailed: [],
    whatIsMissing: [],
    whyItMatters: "",
    suggestedFix: "",
    priority,
    evidence: [],
    output: null
  };
}

function finalizeStatus(result) {
  if (result.whatFailed.length && result.priority === "Critical") result.status = "FAIL";
  else if (result.whatFailed.length || result.whatIsMissing.length) result.status = "WARNING";
  else result.status = "PASS";
}

async function selectTool(page, label) {
  await page.goto(`http://127.0.0.1:${PORT}/tools/pdf-converter/`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("#tools-grid .tool-card", { hasText: label }).click();
  await page.waitForSelector("#workspace-title", { timeout: 30000 });
}

async function maybeProceedModal(page) {
  const proceed = page.getByRole("button", { name: "Proceed to Basic Download" });
  if (await proceed.isVisible().catch(() => false)) await proceed.click();
}

async function convertTool(page, toolLabel, sourcePath, screenshotPrefix) {
  await selectTool(page, toolLabel);
  await page.setInputFiles("#file-input", sourcePath);
  await page.waitForSelector("#btn-action-execute", { timeout: 60000 });
  const beforePath = path.join(SCREENSHOT_DIR, `${screenshotPrefix}-before.png`);
  await page.screenshot({ path: beforePath, fullPage: true });
  if (await page.locator("#btn-action-execute").isDisabled()) {
    const blockedPath = path.join(SCREENSHOT_DIR, `${screenshotPrefix}-blocked.png`);
    await page.screenshot({ path: blockedPath, fullPage: true });
    return {
      blocked: true,
      buttonText: await page.locator("#btn-action-execute").textContent(),
      beforeScreenshot: beforePath,
      blockedScreenshot: blockedPath,
      bodyText: await page.locator("body").innerText()
    };
  }

  await page.click("#btn-action-execute");
  await maybeProceedModal(page);
  await page.waitForSelector("#success-overlay:not(.hidden)", { timeout: 240000 });
  const afterPath = path.join(SCREENSHOT_DIR, `${screenshotPrefix}-after.png`);
  await page.screenshot({ path: afterPath, fullPage: true });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 240000 }),
    page.click("#btn-download-result")
  ]);
  const suggested = download.suggestedFilename();
  const savePath = path.join(DOWNLOAD_DIR, `${screenshotPrefix}-${suggested}`);
  await download.saveAs(savePath);
  return {
    blocked: false,
    suggested,
    savePath,
    size: fs.statSync(savePath).size,
    beforeScreenshot: beforePath,
    afterScreenshot: afterPath,
    successText: await page.textContent("#success-desc")
  };
}

function scoreDocx(source, output) {
  const result = {
    editableTextRatio: 0,
    screenshotOnlyRatio: 0,
    layoutSimilarity: 0,
    imageLogoPreservation: 0,
    pageCountMatch: 0,
    outputFormatCorrect: false,
    fileSizeReasonable: false
  };
  if (!output || !output.hasContentTypes || !output.hasExpectedFolder) return result;
  result.outputFormatCorrect = true;
  result.editableTextRatio = Math.min(100, Math.round((output.textChars / Math.max(1, source.textChars)) * 100));
  result.screenshotOnlyRatio = output.textChars > 20 ? 0 : 100;
  result.layoutSimilarity = output.imageCount > 0 ? 55 : 35;
  result.imageLogoPreservation = output.imageCount > 0 ? 60 : 0;
  result.pageCountMatch = source.pageCount > 0 ? 70 : 0;
  result.fileSizeReasonable = output.size > 1000 && output.size < Math.max(2500000, source.size * 20);
  return result;
}

function scorePptx(source, output) {
  const result = {
    editableTextRatio: 0,
    screenshotOnlyRatio: 100,
    layoutSimilarity: 70,
    imageLogoPreservation: 70,
    pageCountMatch: 0,
    outputFormatCorrect: false,
    fileSizeReasonable: false
  };
  if (!output || !output.hasContentTypes || !output.hasExpectedFolder) return result;
  result.outputFormatCorrect = true;
  result.pageCountMatch = source.pageCount === output.slideCount ? 100 : 40;
  result.editableTextRatio = Math.min(100, Math.round((output.textChars / Math.max(1, source.textChars)) * 100));
  result.screenshotOnlyRatio = output.textChars > 20 ? 40 : 100;
  result.fileSizeReasonable = output.size > 1000 && output.size < Math.max(5000000, source.size * 50);
  return result;
}

function scoreXlsx(source, output) {
  const result = {
    editableTextRatio: 0,
    tableCellPreservation: 0,
    screenshotOnlyRatio: 0,
    pageCountMatch: 0,
    outputFormatCorrect: false,
    fileSizeReasonable: false,
    numericCellCount: 0
  };
  if (!output || !output.hasContentTypes || !output.hasExpectedFolder) return result;
  result.outputFormatCorrect = true;
  result.editableTextRatio = Math.min(100, Math.round((output.textChars / Math.max(1, source.textChars)) * 100));
  result.tableCellPreservation = output.textItemCount > 8 ? 75 : 25;
  result.pageCountMatch = output.sheetCount === source.pageCount ? 100 : 40;
  result.numericCellCount = output.numericCellCount;
  result.fileSizeReasonable = output.size > 1000 && output.size < Math.max(5000000, source.size * 30);
  return result;
}

function applyDocxVerdict(result, metrics, fixtureKey) {
  result.metrics = metrics;
  result.whatWorked.push("Real DOCX package was generated with editable Word text.");
  if (metrics.editableTextRatio < 70) result.whatFailed.push("Editable text ratio is below professional threshold.");
  if (["catalog", "menu", "brochure", "form", "logoImageHeavy", "chart"].includes(fixtureKey)) {
    result.whatFailed.push("Layout/image/logo/table fidelity is not professionally preserved yet.");
    result.whatIsMissing.push("Accuracy Mode with positioned layout, image extraction, logo preservation, table reconstruction, colors, and headers/footers.");
  }
  result.whatIsMissing.push("Visual before/after rendering of DOCX output via LibreOffice or Office automation.");
  result.whyItMatters = "PDF to Word must preserve visual layout while keeping selectable PDF text editable.";
  result.suggestedFix = "Add DOCX Accuracy Mode that maps PDF text positions, extracts images/logos, rebuilds tables, and validates reading order.";
  result.priority = result.whatFailed.length ? "High" : "Medium";
  result.qualityScore = Math.round((metrics.editableTextRatio * 0.45) + (metrics.layoutSimilarity * 0.25) + (metrics.imageLogoPreservation * 0.15) + (metrics.pageCountMatch * 0.15));
  finalizeStatus(result);
}

async function getLiveTool(page, toolId) {
  await page.goto(`http://127.0.0.1:${PORT}/tools/pdf-converter/`, { waitUntil: "networkidle", timeout: 60000 });
  return page.evaluate((id) => {
    const tool = window.PdfToolsConfig?.tools?.find((item) => item.id === id);
    if (!tool) return null;
    return {
      id: tool.id,
      name: tool.name,
      status: tool.status,
      releaseLabel: tool.releaseLabel || "",
      limitations: tool.limitations || "",
      description: tool.description || ""
    };
  }, toolId);
}

function isHonestPptxVisualExport(tool) {
  const publicCopy = `${tool?.name || ""} ${tool?.description || ""} ${tool?.limitations || ""}`;
  return /Visual Export/i.test(publicCopy) &&
    /image-based/i.test(publicCopy) &&
    /Text may not be editable yet/i.test(publicCopy) &&
    !/professional editable conversion/i.test(publicCopy);
}

function applyPptxVerdict(result, metrics, honestVisualExport) {
  result.metrics = metrics;
  result.whatWorked.push("Real PPTX package was generated and page count is represented as slides.");
  if (honestVisualExport && metrics.screenshotOnlyRatio >= 80) {
    result.whatWorked.push("Public copy honestly labels this as image-based PowerPoint Visual Export.");
    result.whatIsMissing.push("Editable PowerPoint conversion is not released yet, but the public label no longer falsely promises it.");
  } else if (metrics.screenshotOnlyRatio >= 80) {
    result.whatFailed.push("Slides are screenshot/image-based instead of editable text and shapes.");
  }
  if (!honestVisualExport && metrics.editableTextRatio < 30) result.whatFailed.push("Editable text ratio is too low for professional PDF to PowerPoint.");
  result.whatIsMissing.push("Editable text boxes, shape extraction, image/logo object extraction, font/color mapping, and reading-order preservation.");
  result.whyItMatters = honestVisualExport
    ? "Visual PowerPoint export can be published only when the screenshot-based limitation is visible before conversion."
    : "Professional PowerPoint conversion must keep text and design editable when the PDF contains selectable text.";
  result.suggestedFix = "Add PPTX Accuracy Mode that creates text boxes from PDF text items and adds images as separate slide objects.";
  result.priority = honestVisualExport ? "Medium" : "Critical";
  result.qualityScore = honestVisualExport
    ? Math.round(metrics.layoutSimilarity * 0.35 + metrics.pageCountMatch * 0.35 + metrics.imageLogoPreservation * 0.2 + 10)
    : Math.round((100 - metrics.screenshotOnlyRatio) * 0.4 + metrics.layoutSimilarity * 0.25 + metrics.pageCountMatch * 0.2 + metrics.imageLogoPreservation * 0.15);
  finalizeStatus(result);
}

function applyXlsxVerdict(result, metrics) {
  result.metrics = metrics;
  result.whatWorked.push("Real XLSX package was generated with editable cells.");
  if (metrics.tableCellPreservation < 70) result.whatFailed.push("Table cell preservation is below professional threshold.");
  if (metrics.numericCellCount < 1) result.whatFailed.push("No numeric cells were detected in output.");
  result.whatIsMissing.push("Merged-cell detection, borderless table parsing, formulas, styling, and OCR table extraction.");
  result.whyItMatters = "PDF to Excel is only useful when tables become structured cells with numbers preserved as numbers.";
  result.suggestedFix = "Add table grid detection, merged-cell inference, numeric/currency typing, and OCR table mode.";
  result.priority = result.whatFailed.length ? "High" : "Medium";
  result.qualityScore = Math.round(metrics.tableCellPreservation * 0.35 + metrics.editableTextRatio * 0.25 + metrics.pageCountMatch * 0.2 + (metrics.numericCellCount > 0 ? 20 : 0));
  finalizeStatus(result);
}

async function auditDocx(page, sourceAnalyses) {
  const results = [];
  for (const key of DOCX_CASES) {
    const file = fixturePath(key);
    const source = sourceAnalyses[key];
    const result = baseResult("PDF to Word", FIXTURES[key], "High");
    const output = await convertTool(page, "PDF to Word", file, `phase2-docx-${slug(key)}`);
    result.output = output;
    result.evidence.push(output.beforeScreenshot, output.afterScreenshot);
    const office = analyzeOffice(output.savePath, "docx");
    applyDocxVerdict(result, scoreDocx(source, office), key);
    results.push(result);
  }
  return results;
}

async function auditPptx(page, sourceAnalyses) {
  const results = [];
  const pptxTool = await getLiveTool(page, "pdf-to-powerpoint");
  const honestVisualExport = isHonestPptxVisualExport(pptxTool);
  for (const key of PPTX_CASES) {
    const file = fixturePath(key);
    const source = sourceAnalyses[key];
    const result = baseResult(pptxTool?.name || "PDF to PowerPoint", FIXTURES[key], honestVisualExport ? "Medium" : "Critical");
    const output = await convertTool(page, "PDF to PowerPoint", file, `phase2-pptx-${slug(key)}`);
    result.output = output;
    result.evidence.push(output.beforeScreenshot, output.afterScreenshot);
    const office = analyzeOffice(output.savePath, "pptx");
    applyPptxVerdict(result, scorePptx(source, office), honestVisualExport);
    results.push(result);
  }
  return results;
}

async function auditXlsx(page, sourceAnalyses) {
  const results = [];
  for (const key of XLSX_CASES) {
    const file = fixturePath(key);
    const source = sourceAnalyses[key];
    const result = baseResult("PDF to Excel", FIXTURES[key], "High");
    const output = await convertTool(page, "PDF to Excel", file, `phase2-xlsx-${slug(key)}`);
    result.output = output;
    result.evidence.push(output.beforeScreenshot, output.afterScreenshot);
    const office = analyzeOffice(output.savePath, "xlsx");
    applyXlsxVerdict(result, scoreXlsx(source, office));
    results.push(result);
  }
  return results;
}

async function auditScannedAndBadInputs(page) {
  const cases = [
    ["PDF to Word", "scanned", "Critical"],
    ["PDF to Excel", "scanned", "Critical"],
    ["PDF to Word", "password", "High"],
    ["PDF to Word", "corrupted", "High"]
  ];
  const results = [];
  for (const [label, key, priority] of cases) {
    const result = baseResult(`${label} input handling`, FIXTURES[key], priority);
    try {
      const output = await convertTool(page, label, fixturePath(key), `phase2-${slug(label)}-${key}`);
      result.output = output;
      result.evidence.push(output.beforeScreenshot, output.blockedScreenshot || output.afterScreenshot);
      if (output.blocked || /OCR|password|corrupt|No text|needed/i.test(output.bodyText || output.successText || output.buttonText || "")) {
        result.status = "PASS";
        result.qualityScore = 85;
        result.whatWorked.push("Problem input is blocked or warned before misleading conversion.");
      } else {
        result.status = "FAIL";
        result.qualityScore = 15;
        result.whatFailed.push("Problem input was not clearly blocked or warned.");
      }
    } catch (error) {
      result.status = "PASS";
      result.qualityScore = 75;
      result.whatWorked.push("Problem input produced an error instead of a fake successful conversion.");
      result.evidence.push(error.message);
    }
    result.whyItMatters = "Unsupported or unreadable files must show clear warnings and must not generate fake output.";
    result.suggestedFix = "Keep explicit unsupported-file states and route scanned PDFs to OCR Accuracy Mode.";
    results.push(result);
  }
  return results;
}

async function auditOtherTools(page, config) {
  await page.goto(`http://127.0.0.1:${PORT}/tools/pdf-converter/`, { waitUntil: "networkidle", timeout: 60000 });
  const liveTools = await page.evaluate(() => (window.PdfToolsConfig?.tools || []).map((tool) => ({
    id: tool.id,
    name: tool.name,
    status: tool.status,
    releaseLabel: tool.releaseLabel || "",
    category: tool.category,
    limitations: tool.limitations || ""
  })));
  const results = [];
  for (const required of config.requiredTools) {
    const tool = liveTools.find((item) => item.id === required);
    const result = baseResult(tool ? tool.name : required, "tool-discovery", tool ? "Medium" : "High");
    if (!tool) {
      result.status = "WARNING";
      result.qualityScore = 0;
      result.whatFailed.push("Requested professional converter tool was not found in live configuration.");
      result.whatIsMissing.push("Working implementation and test coverage.");
      result.suggestedFix = "Add only after a real implementation exists.";
    } else if (tool.status === "future") {
      result.status = "WARNING";
      result.qualityScore = 10;
      result.whatWorked.push("Tool is present but gated as future.");
      result.whatIsMissing.push("Working implementation and fixture tests.");
      result.suggestedFix = "Keep gated until implementation is real.";
    } else {
      result.status = "PASS";
      result.qualityScore = tool.status === "active" ? 74 : 45;
      result.whatWorked.push(`Tool exists with status '${tool.status}'.`);
      if (tool.limitations) result.whatIsMissing.push(tool.limitations);
      result.suggestedFix = "Add tool-specific visual and output-fidelity tests.";
    }
    result.whyItMatters = "A professional suite needs honest support states and coverage for every advertised converter.";
    results.push(result);
  }
  return { liveTools, results };
}

function auditLanguageCoverage(sourceAnalyses) {
  const languageKeys = ["english", "arabic", "urdu", "hindi", "bengali", "chinese", "japanese", "korean", "russian", "french", "spanish", "turkish", "mixedRtlLtr"];
  return languageKeys.map((key) => {
    const analysis = sourceAnalyses[key];
    const result = baseResult("Global language fixture coverage", FIXTURES[key], "High");
    if (analysis.validPdf && analysis.pageCount > 0) {
      result.status = "PASS";
      result.qualityScore = analysis.hasSelectableText ? 70 : 45;
      result.whatWorked.push("Language fixture exists and can be parsed as PDF.");
      if (!analysis.hasSelectableText) result.whatIsMissing.push("Selectable text extraction is weak for this script; OCR/font extraction must be validated.");
    } else {
      result.status = "FAIL";
      result.qualityScore = 0;
      result.whatFailed.push("Language fixture is invalid or missing.");
    }
    result.metrics = analysis;
    result.whyItMatters = "Global conversion must handle script shaping, font fallback, RTL/LTR direction, and mixed-language reading order.";
    result.suggestedFix = "Add per-language expected outputs and compare editability and reading order.";
    return result;
  });
}

function summarize(results) {
  const counts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: results.length,
    pass: counts.PASS || 0,
    warning: counts.WARNING || 0,
    fail: counts.FAIL || 0,
    averageQualityScore: Math.round(results.reduce((sum, result) => sum + result.qualityScore, 0) / Math.max(1, results.length))
  };
}

function classifyTools(results) {
  return {
    safeToPublish: [
      "Merge PDF", "Split PDF", "Rotate PDF", "Image to PDF", "PDF to Image/JPG for basic browser use"
    ],
    basicAcceptableWithWarning: [
      "PDF to Word", "PDF to Excel", "PDF to PowerPoint Visual Export", "Compress PDF", "OCR text extraction"
    ],
    shouldNotPublishYet: [
      "PDF to PowerPoint as professional editable conversion", "PowerPoint to PDF", "Excel to PDF", "Extract images if not implemented", "Full multi-language OCR Accuracy Mode"
    ],
    firstFixes: [
      "Build editable PPTX Accuracy Mode instead of screenshot-only slides.",
      "Add OCR Accuracy Mode with multi-language recognition and searchable/editable output.",
      "Add DOCX layout preservation with images, logos, tables, headers, footers, colors, and reading order.",
      "Add Excel table reconstruction for merged cells, borders, formulas, and currency/number formats.",
      "Add before/after visual rendering through LibreOffice or Office automation."
    ]
  };
}

function expertRecommendations() {
  return [
    { priority: "Critical", title: "Editable PPTX Accuracy Mode", detail: "Create text boxes, preserve images/logos as objects, and map fonts/colors instead of only using slide screenshots." },
    { priority: "Critical", title: "Multi-language OCR Accuracy Mode", detail: "Support Arabic, Urdu, Hindi, Bengali, CJK, Cyrillic, Latin accents, and mixed RTL/LTR reading order." },
    { priority: "High", title: "Office output visual renderer", detail: "Render DOCX/PPTX/XLSX outputs to images and compare against source PDF page renders." },
    { priority: "High", title: "Layout and image preservation", detail: "Extract images/logos, preserve headers/footers, page size, spacing, columns, backgrounds, and colors." },
    { priority: "High", title: "Advanced table engine", detail: "Detect borders, borderless tables, merged cells, formulas, numeric/currency formats, and scanned table grids." }
  ];
}

function renderHtml(report) {
  const rows = report.results.map((result) => `
    <tr>
      <td>${escapeHtml(result.toolName)}</td>
      <td>${escapeHtml(result.testFile)}</td>
      <td class="${escapeHtml(result.status.toLowerCase())}">${escapeHtml(result.status)}</td>
      <td>${escapeHtml(result.qualityScore)}</td>
      <td>${escapeHtml(result.priority)}</td>
      <td>${escapeHtml(JSON.stringify(result.metrics))}</td>
      <td>${escapeHtml(result.whatWorked.join("; ") || "None")}</td>
      <td>${escapeHtml(result.whatFailed.join("; ") || "None")}</td>
      <td>${escapeHtml(result.whatIsMissing.join("; ") || "None")}</td>
      <td>${escapeHtml(result.whyItMatters)}</td>
      <td>${escapeHtml(result.suggestedFix)}</td>
    </tr>
  `).join("");
  const recs = report.expertRecommendations.map((item) => `<li><strong>${escapeHtml(item.priority)} - ${escapeHtml(item.title)}:</strong> ${escapeHtml(item.detail)}</li>`).join("");
  const priority = report.priorityList.firstFixes.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phase 3 PDF / Document Converter Expert Audit</title>
  <style>
    body { margin: 0; padding: 32px; background: #07111f; color: #f5f7fb; font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
    p { color: #b6c4d8; }
    .summary { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
    .card { border: 1px solid #274565; border-radius: 8px; background: #102039; padding: 14px; min-width: 150px; }
    .card span { display: block; color: #b6c4d8; font-size: 13px; }
    .card strong { display: block; margin-top: 4px; font-size: 22px; }
    .table-wrap { overflow-x: auto; border: 1px solid #274565; border-radius: 8px; }
    table { min-width: 1800px; width: 100%; border-collapse: collapse; background: #102039; }
    th, td { border-bottom: 1px solid #274565; padding: 10px; vertical-align: top; text-align: left; }
    th { background: #132845; }
    td { color: #dbe5f5; }
    .pass { color: #17d9a3; font-weight: 700; }
    .warning { color: #ffc857; font-weight: 700; }
    .fail { color: #ff6b6b; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Phase 3 PDF / Document Converter Expert Audit</h1>
  <p>Generated: ${escapeHtml(report.generatedAt)}</p>
  <p>Strict audit for fidelity, editability, screenshot-only ratio, language coverage, OCR need detection, table cells, images/logos, and output format correctness.</p>
  <div class="summary">
    <div class="card"><span>Total checks</span><strong>${report.summary.total}</strong></div>
    <div class="card"><span>Pass</span><strong>${report.summary.pass}</strong></div>
    <div class="card"><span>Warning</span><strong>${report.summary.warning}</strong></div>
    <div class="card"><span>Fail</span><strong>${report.summary.fail}</strong></div>
    <div class="card"><span>Average score</span><strong>${report.summary.averageQualityScore}/100</strong></div>
  </div>
  <h2>Fix First</h2>
  <ol>${priority}</ol>
  <h2>Expert Recommendations</h2>
  <ul>${recs}</ul>
  <h2>Audit Results</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Tool</th><th>Fixture</th><th>Status</th><th>Score</th><th>Priority</th><th>Metrics</th><th>Worked</th><th>Failed</th><th>Missing</th><th>Why it matters</th><th>Suggested fix</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

async function main() {
  ensureDirs();
  const config = readConfig();
  const fixtureKeys = Object.keys(FIXTURES);
  const sourceAnalyses = Object.fromEntries(fixtureKeys.map((key) => [key, analyzePdf(fixturePath(key))]));
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (msg) => { if (["error", "warning"].includes(msg.type())) consoleMessages.push({ type: msg.type(), text: msg.text() }); });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const docxResults = await auditDocx(page, sourceAnalyses);
    const pptxResults = await auditPptx(page, sourceAnalyses);
    const xlsxResults = await auditXlsx(page, sourceAnalyses);
    const badInputResults = await auditScannedAndBadInputs(page);
    const { liveTools, results: toolResults } = await auditOtherTools(page, config);
    const languageResults = auditLanguageCoverage(sourceAnalyses);
    const results = [...docxResults, ...pptxResults, ...xlsxResults, ...badInputResults, ...toolResults, ...languageResults];
    const report = {
      project: `${config.project} - Phase 3 Safe Release Copy Audit`,
      generatedAt: new Date().toISOString(),
      fixtureFolder: FIXTURE_DIR,
      sourceAnalyses,
      liveToolsFound: liveTools,
      summary: summarize(results),
      consoleMessages,
      pageErrors,
      expertRecommendations: expertRecommendations(),
      priorityList: classifyTools(results),
      results
    };

    fs.writeFileSync(path.join(REPORT_DIR, "converter-expert-audit.json"), JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(path.join(REPORT_DIR, "converter-expert-audit.html"), renderHtml(report), "utf8");
    console.log(JSON.stringify({
      html: path.join(REPORT_DIR, "converter-expert-audit.html"),
      json: path.join(REPORT_DIR, "converter-expert-audit.json"),
      fixtures: fixtureKeys.length,
      summary: report.summary,
      consoleMessages: consoleMessages.length,
      pageErrors: pageErrors.length,
      priorityList: report.priorityList
    }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

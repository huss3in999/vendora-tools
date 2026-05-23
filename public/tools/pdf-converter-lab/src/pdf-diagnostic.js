(function () {
  "use strict";

  // Lab-only CDN dependency: this module expects pdf.js to be loaded globally
  // by index.html. The live website converter is not modified by this file.
  const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const MAX_ANALYZED_PAGES = 8;
  const ARABIC_RE = /[\u0600-\u06FF]/;
  const LATIN_RE = /[A-Za-z]/;

  function ensurePdfJs() {
    if (!window.pdfjsLib) {
      throw new Error("pdf.js is not loaded. Check the CDN script in the lab page.");
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return window.pdfjsLib;
  }

  function isPdfFile(file) {
    return Boolean(file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")));
  }

  async function loadPdfFromFile(file) {
    if (!isPdfFile(file)) {
      throw new Error("Please upload a PDF file.");
    }

    const pdfjsLib = ensurePdfJs();
    const buffer = await file.arrayBuffer();
    return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  }

  function roundPosition(value) {
    return Math.round(value / 8) * 8;
  }

  function getTextPosition(item) {
    const transform = item.transform || [];
    return {
      x: Number(transform[4] || 0),
      y: Number(transform[5] || 0),
      width: Number(item.width || 0),
      text: String(item.str || "").trim()
    };
  }

  function countRepeatedPositions(values, minimumRepeats) {
    const counts = new Map();
    values.forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.values()).filter((count) => count >= minimumRepeats).length;
  }

  function countImageOperations(operatorList) {
    const pdfjsLib = ensurePdfJs();
    const ops = pdfjsLib.OPS || {};
    const imageOps = new Set([
      ops.paintImageXObject,
      ops.paintImageXObjectRepeat,
      ops.paintJpegXObject,
      ops.paintInlineImageXObject,
      ops.paintInlineImageXObjectGroup,
      ops.paintImageMaskXObject,
      ops.paintImageMaskXObjectRepeat
    ].filter((value) => typeof value === "number"));

    return operatorList.fnArray.filter((fn) => imageOps.has(fn)).length;
  }

  function estimateLanguage(text) {
    const arabicMatches = text.match(/[\u0600-\u06FF]/g) || [];
    const latinMatches = text.match(/[A-Za-z]/g) || [];
    const arabicCount = arabicMatches.length;
    const latinCount = latinMatches.length;

    if (arabicCount === 0 && latinCount === 0) {
      return "unknown";
    }

    if (arabicCount > 0 && latinCount > 0) {
      const ratio = arabicCount / Math.max(1, arabicCount + latinCount);
      return ratio > 0.25 && ratio < 0.85 ? "mixed" : (ratio >= 0.85 ? "ar" : "en");
    }

    return arabicCount > 0 ? "ar" : "en";
  }

  function scoreDifficulty(flags) {
    let score = 0;

    if (flags.isLikelyScanned) score += 3;
    if (flags.imageHeavy) score += 2;
    if (flags.likelyHasTables) score += 1;
    if (flags.likelyHasColumns) score += 1;
    if (flags.estimatedLanguage === "ar" || flags.estimatedLanguage === "mixed") score += 1;
    if (flags.pageCount > 10) score += 1;

    if (score >= 4) return "hard";
    if (score >= 2) return "medium";
    return "easy";
  }

  function chooseRecommendation(flags, analysis) {
    const reasoning = [];
    let recommendedOutput = "unknown";
    let confidenceScore = 45;

    if (flags.isLikelyScanned) {
      recommendedOutput = "ocr";
      confidenceScore = 86;
      reasoning.push("Very little selectable text was detected, so OCR is the safest first step.");
    } else if (flags.likelyHasTables) {
      recommendedOutput = "xlsx";
      confidenceScore = 78;
      reasoning.push("Repeated text alignment and short row-like items suggest tabular data.");
    } else if (flags.likelyPresentationStyle) {
      recommendedOutput = "pptx";
      confidenceScore = 76;
      reasoning.push("Landscape or visual page-style layout suggests slide-style conversion.");
    } else if (analysis.textItemCount > 5) {
      recommendedOutput = "docx";
      confidenceScore = analysis.textItemCount > 20 ? 72 : 62;
      reasoning.push("Selectable paragraph-style text is present, so Word extraction is a reasonable first output.");
    } else {
      recommendedOutput = "unknown";
      confidenceScore = 38;
      reasoning.push("The document signals are weak, so the best output type is uncertain.");
    }

    if (flags.likelyHasColumns && recommendedOutput !== "xlsx") {
      confidenceScore -= 8;
      reasoning.push("Column-like text positions may make plain Word conversion less accurate.");
    }

    if (flags.imageHeavy && !flags.isLikelyScanned) {
      confidenceScore -= 8;
      reasoning.push("Several image operations were found, so visual layout may matter more than raw text.");
    }

    if (flags.estimatedLanguage === "ar" || flags.estimatedLanguage === "mixed") {
      confidenceScore -= 5;
      reasoning.push("Arabic or mixed-language text was detected; direction and font handling need careful testing.");
    }

    return {
      recommendedOutput,
      confidenceScore: Math.max(0, Math.min(100, Math.round(confidenceScore))),
      reasoning
    };
  }

  async function inspectPdf(file) {
    const pdf = await loadPdfFromFile(file);
    const pageCount = pdf.numPages;
    const pagesToAnalyze = Math.min(pageCount, MAX_ANALYZED_PAGES);
    const textPositions = [];
    const pageSummaries = [];
    let textItemCount = 0;
    let totalTextLength = 0;
    let imageOperationCount = 0;
    let landscapePageCount = 0;
    let combinedText = "";

    for (let pageNumber = 1; pageNumber <= pagesToAnalyze; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const operatorList = await page.getOperatorList();
      const pageTextItems = textContent.items
        .map(getTextPosition)
        .filter((item) => item.text.length > 0);
      const pageText = pageTextItems.map((item) => item.text).join(" ");
      const pageImageOps = countImageOperations(operatorList);

      textPositions.push(...pageTextItems);
      textItemCount += pageTextItems.length;
      totalTextLength += pageText.length;
      imageOperationCount += pageImageOps;
      combinedText += ` ${pageText}`;

      if (viewport.width > viewport.height * 1.08) {
        landscapePageCount += 1;
      }

      pageSummaries.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        textItems: pageTextItems.length,
        imageOperations: pageImageOps,
        isLandscape: viewport.width > viewport.height * 1.08
      });
    }

    const roundedX = textPositions.map((item) => roundPosition(item.x));
    const roundedY = textPositions.map((item) => roundPosition(item.y));
    const repeatedX = countRepeatedPositions(roundedX, 4);
    const repeatedY = countRepeatedPositions(roundedY, 4);
    const shortItems = textPositions.filter((item) => item.text.length > 0 && item.text.length <= 24).length;
    const shortItemRatio = textItemCount ? shortItems / textItemCount : 0;
    const hasSelectableText = textItemCount > 0 && totalTextLength > 30;
    const estimatedLanguage = estimateLanguage(combinedText);
    const isLikelyScanned = !hasSelectableText || (totalTextLength / Math.max(1, pageCount) < 20 && imageOperationCount >= pagesToAnalyze);
    const imageHeavy = imageOperationCount >= Math.max(2, pagesToAnalyze * 2) || (imageOperationCount >= pagesToAnalyze && totalTextLength < 300);
    const likelyHasTables = !isLikelyScanned && repeatedX >= 3 && repeatedY >= 3 && shortItemRatio > 0.45;
    const likelyHasColumns = !isLikelyScanned && repeatedX >= 2 && !likelyHasTables && textItemCount >= 20;
    const likelyPresentationStyle = landscapePageCount >= Math.ceil(pagesToAnalyze * 0.5) || (imageHeavy && textItemCount < 80);
    const flags = {
      pageCount,
      hasSelectableText,
      estimatedLanguage,
      isLikelyScanned,
      imageHeavy,
      likelyHasTables,
      likelyHasColumns,
      likelyPresentationStyle
    };
    const recommendation = chooseRecommendation(flags, { textItemCount });
    const warnings = [];

    if (recommendation.confidenceScore < 60) {
      warnings.push("Confidence is low. Test more than one output format before trusting the result.");
    }

    if (isLikelyScanned) {
      warnings.push("This PDF looks scanned or has very little selectable text. OCR accuracy is not guaranteed.");
    }

    if (estimatedLanguage === "ar" || estimatedLanguage === "mixed") {
      warnings.push("Arabic or mixed-language text was detected. Reading order and font shaping need manual review.");
    }

    if (likelyHasTables) {
      warnings.push("Tables are detected by alignment signals only. Merged cells and borderless tables may still be wrong.");
    }

    if (likelyPresentationStyle) {
      warnings.push("Presentation-style conversion preserves visual layout best as slide images, not editable objects.");
    }

    recommendation.reasoning.push(`Analyzed ${pagesToAnalyze} of ${pageCount} page(s).`);
    recommendation.reasoning.push(`Detected ${textItemCount} selectable text item(s) and ${imageOperationCount} image operation(s).`);

    return {
      fileName: file.name,
      pageCount,
      hasSelectableText,
      textItemCount,
      estimatedLanguage,
      isLikelyScanned,
      imageHeavy,
      likelyHasTables,
      likelyHasColumns,
      likelyPresentationStyle,
      recommendedOutput: recommendation.recommendedOutput,
      difficulty: scoreDifficulty({
        ...flags,
        textItemCount
      }),
      confidenceScore: recommendation.confidenceScore,
      warnings,
      reasoning: recommendation.reasoning,
      outputType: ".pptx",
      realPptx: true,
      conversionMode: "page-image-to-slide",
      analyzedPages: pagesToAnalyze,
      imageOperationCount,
      pageSummaries
    };
  }

  window.LabPdfDiagnostic = {
    inspectPdf,
    loadPdfFromFile
  };
})();

(function () {
  "use strict";

  // Lab-only CDN dependency: this module expects the docx browser bundle to be
  // loaded globally by index.html. It creates a real .docx file, not renamed
  // HTML or plain text.
  const LINE_Y_TOLERANCE = 5;

  function ensureDocx() {
    if (!window.docx) {
      throw new Error("DOCX library is not loaded. Check the CDN script in the lab page.");
    }

    return window.docx;
  }

  function safeOutputName(fileName) {
    const baseName = (fileName || "converted")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim() || "converted";

    return `${baseName}-lab-editable.docx`;
  }

  function fontSizeFromTransform(transform) {
    const t = transform || [];
    const vertical = Math.abs(Number(t[3] || 0));
    const horizontal = Math.abs(Number(t[0] || 0));
    return Number((vertical || horizontal || 10).toFixed(2));
  }

  function isBoldFont(fontName) {
    return /bold|black|heavy|semibold|demi/i.test(String(fontName || ""));
  }

  function median(values) {
    const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) return 10;
    return sorted[Math.floor(sorted.length / 2)];
  }

  function groupTextItemsIntoLines(items) {
    const sorted = items
      .filter((item) => String(item.str || "").trim())
      .map((item) => ({
        text: String(item.str || "").trim(),
        x: Number((item.transform || [])[4] || 0),
        y: Number((item.transform || [])[5] || 0),
        fontSize: fontSizeFromTransform(item.transform),
        fontName: item.fontName || "",
        width: Number(item.width || 0)
      }))
      .sort((a, b) => {
        if (Math.abs(b.y - a.y) > LINE_Y_TOLERANCE) return b.y - a.y;
        return a.x - b.x;
      });

    const lines = [];

    sorted.forEach((item) => {
      const lastLine = lines[lines.length - 1];

      if (!lastLine || Math.abs(lastLine.y - item.y) > LINE_Y_TOLERANCE) {
        lines.push({
          y: item.y,
          items: [item]
        });
        return;
      }

      lastLine.items.push(item);
      lastLine.y = (lastLine.y + item.y) / 2;
    });

    return lines.map((line) => {
      const ordered = line.items.sort((a, b) => a.x - b.x);
      const text = ordered.map((item, index) => {
        const previous = ordered[index - 1];
        const gap = previous ? item.x - (previous.x + previous.width) : 0;
        const spacer = gap > item.fontSize * 1.2 ? "  " : " ";
        return index === 0 ? item.text : `${spacer}${item.text}`;
      }).join("").replace(/\s+/g, " ").trim();
      const fontSizes = ordered.map((item) => item.fontSize);

      return {
        text,
        x: ordered[0] ? ordered[0].x : 0,
        y: line.y,
        fontSize: Math.max(...fontSizes, 10),
        fontName: ordered.map((item) => item.fontName).join(" "),
        boldSignal: ordered.some((item) => isBoldFont(item.fontName))
      };
    }).filter((line) => line.text);
  }

  function classifyLine(line, bodyFontSize) {
    const text = line.text.trim();
    const isBullet = /^([*+\-•‣◦])\s+/.test(text);
    const isNumbered = /^(\d+|[A-Za-z])[.)]\s+/.test(text);
    const headingBySize = line.fontSize >= bodyFontSize * 1.18 && text.length <= 120;
    const headingByBold = line.boldSignal && text.length <= 90 && !/[.!?]$/.test(text);

    return {
      isHeading: headingBySize || headingByBold,
      isBullet,
      isNumbered
    };
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function extractPages(file, onProgress) {
    if (!window.LabPdfDiagnostic) {
      throw new Error("PDF diagnostic module is not loaded.");
    }

    const pdf = await window.LabPdfDiagnostic.loadPdfFromFile(file);
    const pages = [];
    const allFontSizes = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = groupTextItemsIntoLines(textContent.items);

      lines.forEach((line) => allFontSizes.push(line.fontSize));
      pages.push({
        pageNumber,
        lines
      });

      if (typeof onProgress === "function") {
        onProgress({
          pageNumber,
          pageCount: pdf.numPages
        });
      }
    }

    return {
      pageCount: pdf.numPages,
      pages,
      bodyFontSize: median(allFontSizes)
    };
  }

  async function convertPdfToDocx(file, options = {}) {
    const docx = ensureDocx();
    const diagnostics = options.diagnostics || await window.LabPdfDiagnostic.inspectPdf(file);

    if (diagnostics.isLikelyScanned || !diagnostics.hasSelectableText || diagnostics.textItemCount < 1) {
      throw new Error("This PDF likely needs OCR before DOCX conversion.");
    }

    const extracted = await extractPages(file, options.onProgress);
    const children = [];

    extracted.pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        children.push(new docx.Paragraph({
          children: [new docx.PageBreak()]
        }));
      }

      page.lines.forEach((line) => {
        const kind = classifyLine(line, extracted.bodyFontSize);
        const cleanedText = line.text.replace(/^([*+\-•‣◦])\s+/, "").trim();
        const paragraphOptions = {
          children: [
            new docx.TextRun({
              text: kind.isBullet ? cleanedText : line.text,
              bold: kind.isHeading || line.boldSignal,
              size: Math.max(18, Math.min(36, Math.round(line.fontSize * 2)))
            })
          ],
          spacing: {
            after: kind.isHeading ? 180 : 90
          }
        };

        if (kind.isHeading) {
          paragraphOptions.heading = docx.HeadingLevel.HEADING_2;
        } else if (kind.isBullet) {
          paragraphOptions.bullet = { level: 0 };
        }

        children.push(new docx.Paragraph(paragraphOptions));
      });
    });

    if (!children.length) {
      throw new Error("No selectable text could be converted into DOCX paragraphs.");
    }

    const document = new docx.Document({
      creator: "Vendora PDF Converter Lab",
      title: `PDF to DOCX Lab - ${file.name}`,
      description: "Lab-generated editable DOCX from selectable PDF text.",
      sections: [
        {
          properties: {},
          children
        }
      ]
    });
    const blob = await docx.Packer.toBlob(document);
    const fileName = safeOutputName(file.name);

    downloadBlob(blob, fileName);

    return {
      fileName,
      pageCount: extracted.pageCount,
      outputType: ".docx",
      realDocx: true,
      editableText: true,
      conversionMode: "selectable-text-to-editable-docx",
      warning: "This DOCX lab version creates editable Word text from selectable PDFs. Complex layout, exact spacing, tables, and scanned PDFs may need Accuracy Mode."
    };
  }

  window.LabPdfToDocx = {
    convertPdfToDocx
  };
})();

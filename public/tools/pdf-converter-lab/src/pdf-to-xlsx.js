(function () {
  "use strict";

  // Lab-only CDN dependency: this module expects SheetJS/XLSX to be loaded
  // globally by index.html. It creates a real .xlsx workbook, not renamed CSV
  // or HTML.
  const ROW_Y_TOLERANCE = 6;
  const COLUMN_X_TOLERANCE = 22;

  function ensureXlsx() {
    if (!window.XLSX) {
      throw new Error("XLSX library is not loaded. Check the CDN script in the lab page.");
    }

    return window.XLSX;
  }

  function safeOutputName(fileName) {
    const baseName = (fileName || "converted")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim() || "converted";

    return `${baseName}-lab-editable.xlsx`;
  }

  function getTextItem(item) {
    const transform = item.transform || [];

    return {
      text: String(item.str || "").trim(),
      x: Number(transform[4] || 0),
      y: Number(transform[5] || 0),
      width: Number(item.width || 0)
    };
  }

  function groupRows(items) {
    const sorted = items
      .filter((item) => item.text)
      .sort((a, b) => {
        if (Math.abs(b.y - a.y) > ROW_Y_TOLERANCE) return b.y - a.y;
        return a.x - b.x;
      });
    const rows = [];

    sorted.forEach((item) => {
      const lastRow = rows[rows.length - 1];

      if (!lastRow || Math.abs(lastRow.y - item.y) > ROW_Y_TOLERANCE) {
        rows.push({
          y: item.y,
          items: [item]
        });
        return;
      }

      lastRow.items.push(item);
      lastRow.y = (lastRow.y + item.y) / 2;
    });

    return rows.map((row) => ({
      y: row.y,
      items: row.items.sort((a, b) => a.x - b.x)
    }));
  }

  function clusterColumns(items) {
    const sortedX = items
      .filter((item) => item.text)
      .map((item) => item.x)
      .sort((a, b) => a - b);
    const clusters = [];

    sortedX.forEach((x) => {
      const last = clusters[clusters.length - 1];

      if (!last || Math.abs(last.center - x) > COLUMN_X_TOLERANCE) {
        clusters.push({
          center: x,
          values: [x]
        });
        return;
      }

      last.values.push(x);
      last.center = last.values.reduce((sum, value) => sum + value, 0) / last.values.length;
    });

    return clusters.map((cluster) => Number(cluster.center.toFixed(2)));
  }

  function nearestColumnIndex(columns, x) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    columns.forEach((column, index) => {
      const distance = Math.abs(column - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  function hasCurrencySignal(value) {
    return /[$€£¥₹]|BHD|SAR|AED|QAR|KWD|OMR|USD|EUR|GBP/i.test(value);
  }

  function parseCellValue(raw) {
    const value = String(raw || "").trim();

    if (!value) {
      return { value: "" };
    }

    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?%$|^-?\d+(\.\d+)?%$/.test(value) && !hasCurrencySignal(value)) {
      return {
        value: Number(value.replace(/,/g, "").replace("%", "")) / 100,
        format: "0.00%"
      };
    }

    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(value) && !hasCurrencySignal(value)) {
      return {
        value: Number(value.replace(/,/g, ""))
      };
    }

    return { value };
  }

  function rowsToSheetData(rows, columns) {
    return rows.map((row) => {
      const cells = Array.from({ length: Math.max(columns.length, row.items.length) }, () => "");

      row.items.forEach((item) => {
        const index = columns.length ? nearestColumnIndex(columns, item.x) : cells.findIndex((cell) => cell === "");
        const safeIndex = index >= 0 ? index : cells.length;
        const existing = cells[safeIndex];
        cells[safeIndex] = existing ? `${existing} ${item.text}` : item.text;
      });

      return cells.map((cell) => parseCellValue(cell));
    });
  }

  function applySheetFormats(sheet, parsedRows, XLSX) {
    const aoa = parsedRows.map((row) => row.map((cell) => cell.value));
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
    const widths = [];

    for (let rowIndex = 0; rowIndex < parsedRows.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < parsedRows[rowIndex].length; colIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = sheet[address];
        const parsed = parsedRows[rowIndex][colIndex];
        const displayLength = String(aoa[rowIndex][colIndex] ?? "").length;

        widths[colIndex] = Math.max(widths[colIndex] || 10, Math.min(42, displayLength + 2));

        if (cell && parsed.format) {
          cell.z = parsed.format;
        }
      }
    }

    sheet["!cols"] = Array.from({ length: range.e.c + 1 }, (_, index) => ({
      wch: widths[index] || 12
    }));
  }

  function detectTableSignal(rows, columns) {
    const alignedRows = rows.filter((row) => row.items.length >= 2).length;
    return columns.length >= 2 && alignedRows >= Math.max(2, Math.ceil(rows.length * 0.35));
  }

  async function extractPageRows(file, onProgress) {
    if (!window.LabPdfDiagnostic) {
      throw new Error("PDF diagnostic module is not loaded.");
    }

    const pdf = await window.LabPdfDiagnostic.loadPdfFromFile(file);
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = textContent.items.map(getTextItem).filter((item) => item.text);
      const rows = groupRows(items);
      const columns = clusterColumns(items);

      pages.push({
        pageNumber,
        rows,
        columns,
        likelyTable: detectTableSignal(rows, columns)
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
      pages
    };
  }

  async function convertPdfToXlsx(file, options = {}) {
    const XLSX = ensureXlsx();
    const diagnostics = options.diagnostics || await window.LabPdfDiagnostic.inspectPdf(file);

    if (diagnostics.isLikelyScanned || !diagnostics.hasSelectableText || diagnostics.textItemCount < 1) {
      throw new Error("This PDF likely needs OCR before XLSX conversion.");
    }

    const extracted = await extractPageRows(file, options.onProgress);
    const workbook = XLSX.utils.book_new();

    extracted.pages.forEach((page) => {
      const parsedRows = rowsToSheetData(page.rows, page.columns);
      const aoa = parsedRows.map((row) => row.map((cell) => cell.value));
      const sheet = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [["No selectable text detected on this page"]]);

      applySheetFormats(sheet, parsedRows.length ? parsedRows : [[{ value: "No selectable text detected on this page" }]], XLSX);
      XLSX.utils.book_append_sheet(workbook, sheet, `Page ${page.pageNumber}`);
    });

    if (!workbook.SheetNames.length) {
      throw new Error("No selectable text could be converted into Excel cells.");
    }

    const fileName = safeOutputName(file.name);
    XLSX.writeFile(workbook, fileName, {
      bookType: "xlsx",
      compression: true
    });

    return {
      fileName,
      pageCount: extracted.pageCount,
      outputType: ".xlsx",
      realXlsx: true,
      editableCells: true,
      conversionMode: "positioned-text-to-editable-xlsx",
      warning: "This XLSX lab version creates editable Excel cells from selectable PDFs. Borderless tables, merged cells, scanned PDFs, and complex layouts may need Accuracy Mode."
    };
  }

  window.LabPdfToXlsx = {
    convertPdfToXlsx
  };
})();

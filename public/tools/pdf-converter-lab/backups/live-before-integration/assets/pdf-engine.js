/**
 * Vendora PDF Toolkit - Client-Side Processing Engine
 * 
 * Manages dynamic library imports (pdf-lib, pdf.js, jsPDF, jszip) and
 * coordinates async binary operations on files entirely in the browser.
 */
window.PdfEngine = {
  // CDNs configuration
  libraries: {
    'pdf-lib': {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
      global: 'PDFLib'
    },
    'pdfjs-dist': {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      global: 'pdfjsLib',
      workerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    },
    'jspdf': {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      global: 'jspdf'
    },
    'jszip': {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      global: 'JSZip'
    },
    'xlsx': {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      global: 'XLSX'
    },
    'tesseract': {
      url: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
      global: 'Tesseract'
    }
  },

  loaded: {},

  /**
   * Dynamically loads a library script from CDN if not already loaded
   * @param {string} name Library name
   * @returns {Promise<any>} Resolves to the global library object
   */
  loadLibrary: async function(name) {
    if (this.loaded[name]) return this.loaded[name];
    
    const config = this.libraries[name];
    if (!config) throw new Error(`Library ${name} is not configured.`);

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = config.url;
      script.onload = () => {
        let libObj = window[config.global];
        
        // Handle UMD naming quirks
        if (name === 'jspdf') {
          libObj = window.jspdf || (window.window && window.window.jspdf);
        }

        if (!libObj) {
          reject(new Error(`Library ${name} loaded but global ${config.global} not found.`));
          return;
        }

        // Additional initialization if required
        if (name === 'pdfjs-dist') {
          libObj.GlobalWorkerOptions.workerSrc = config.workerUrl;
        }

        this.loaded[name] = libObj;
        console.debug(`[PdfEngine] Dynamically loaded ${name} from CDN`);
        resolve(libObj);
      };
      script.onerror = () => reject(new Error(`Failed to load script ${config.url}`));
      document.head.appendChild(script);
    });
  },

  /**
   * Helper: Read a File object as ArrayBuffer
   */
  readFileAsArrayBuffer: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Helper: Read a File object as Data URL
   */
  readFileAsDataURL: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Helper: Download arraybuffer or blob
   */
  downloadFile: function(blobOrBuffer, fileName, mimeType = 'application/pdf') {
    const blob = blobOrBuffer instanceof Blob ? blobOrBuffer : new Blob([blobOrBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },

  escapeXml: function(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  makeDocxFromPages: async function(pages, fileName) {
    const JSZip = await this.loadLibrary('jszip');
    const zip = new JSZip();
    const paragraphXml = [];

    pages.forEach((page, pageIndex) => {
      paragraphXml.push(
        `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Page ${pageIndex + 1}</w:t></w:r></w:p>`
      );

      page.lines.forEach(line => {
        const text = this.escapeXml(line);
        paragraphXml.push(`<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`);
      });

      if (pageIndex < pages.length - 1) {
        paragraphXml.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
      }
    });

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    zip.folder('word').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
</w:styles>`);
    zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml.join('\n')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`);

    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    this.downloadFile(blob, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  },

  // ==========================================
  // CORE PDF OPERATIONS (pdf-lib)
  // ==========================================

  /**
   * Merge multiple PDFs into a single document
   */
  mergePDFs: async function(files) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const mergedDoc = await PDFLib.PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      try {
        const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedDoc.addPage(page));
      } catch (err) {
        throw new Error(`Error parsing "${file.name}": This file might be encrypted or corrupted. Password protected files must be unlocked before merging.`);
      }
    }

    return await mergedDoc.save();
  },

  /**
   * Split a single PDF into pages or ranges
   */
  splitPDF: async function(file, rangesText) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pageCount = srcDoc.getPageCount();

    // Parse ranges (e.g. "1-3, 5, 8-10")
    const pagesToExtract = [];
    const chunks = rangesText.split(',');
    
    for (let chunk of chunks) {
      chunk = chunk.trim();
      if (!chunk) continue;
      if (chunk.includes('-')) {
        const parts = chunk.split('-');
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end > pageCount || start > end) {
          throw new Error(`Invalid range "${chunk}". Page range must be between 1 and ${pageCount}.`);
        }
        for (let i = start; i <= end; i++) {
          pagesToExtract.push(i - 1);
        }
      } else {
        const pageNum = parseInt(chunk, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > pageCount) {
          throw new Error(`Invalid page index "${chunk}". Page must be between 1 and ${pageCount}.`);
        }
        pagesToExtract.push(pageNum - 1);
      }
    }

    if (pagesToExtract.length === 0) {
      throw new Error("No valid pages selected for extraction.");
    }

    const newDoc = await PDFLib.PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pagesToExtract);
    copiedPages.forEach(page => newDoc.addPage(page));

    return await newDoc.save();
  },

  /**
   * Remove specified pages from a PDF
   */
  removePages: async function(file, pagesArray) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const doc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    // Sort pages descending to delete correctly without shifting indexes
    const sortedPages = [...pagesArray].map(p => p - 1).sort((a, b) => b - a);
    
    for (const pageIndex of sortedPages) {
      doc.removePage(pageIndex);
    }

    return await doc.save();
  },

  /**
   * Extract specified pages into a new PDF
   */
  extractPages: async function(file, pagesArray) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    const newDoc = await PDFLib.PDFDocument.create();
    const indices = pagesArray.map(p => p - 1);
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));

    return await newDoc.save();
  },

  /**
   * Reorder & organize pages from a custom thumbnail map
   */
  organizePDF: async function(file, pagesOrdering) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    const newDoc = await PDFLib.PDFDocument.create();
    const indices = pagesOrdering.map(p => p - 1); // 0-indexed ordering mapping
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach(page => newDoc.addPage(page));

    return await newDoc.save();
  },

  /**
   * Rotate specified pages in a document
   */
  rotatePDF: async function(file, rotationMap) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const doc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    // rotationMap is pageNum -> degrees (e.g. {1: 90, 2: 180})
    for (const [pageNumStr, degrees] of Object.entries(rotationMap)) {
      const pageIndex = parseInt(pageNumStr, 10) - 1;
      const page = doc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      const newAngle = (currentRotation + degrees) % 360;
      page.setRotation(PDFLib.degrees(newAngle));
    }

    return await doc.save();
  },

  /**
   * Compress PDF document locally.
   * Compresses by converting each page to an image, shrinking it, and saving it as an image PDF.
   * Note: Destructive compression (flattens forms and text but guarantees major file size drops).
   */
  compressPDF: async function(file, quality = 0.5) {
    // 1. Load engines
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const jspdf = await this.loadLibrary('jspdf');

    // 2. Read arraybuffer
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    // 3. Rebuild with jsPDF
    const jsPdfDoc = new jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: quality * 2.0 }); // Adjust resolution scale
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Extract as compressed JPEG
      const imgData = canvas.toDataURL('image/jpeg', quality);

      if (i > 1) {
        jsPdfDoc.addPage();
      }

      // Add to jsPDF sheet scaled to margins
      const pdfWidth = jsPdfDoc.internal.pageSize.getWidth();
      const pdfHeight = jsPdfDoc.internal.pageSize.getHeight();
      jsPdfDoc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    return jsPdfDoc.output('arraybuffer');
  },

  /**
   * Protect a PDF using password encryption
   */
  protectPDF: async function(file, password) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const doc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    // Encrypt using standard user password protection
    return await doc.save({
      userPassword: password,
      ownerPassword: password,
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: true,
        annotating: false
      }
    });
  },

  /**
   * Decrypt a password protected PDF
   */
  unlockPDF: async function(file, password) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    
    // Attempt decrypting
    const doc = await PDFLib.PDFDocument.load(arrayBuffer, {
      password: password
    });
    
    // Save in un-encrypted stream state
    return await doc.save();
  },

  // ==========================================
  // EDIT & STAMPING OPERATIONS (pdf-lib)
  // ==========================================

  /**
   * Add a Watermark string overlay to all pages of a PDF
   */
  addWatermark: async function(file, text, options = {}) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const doc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = doc.getPages();

    // Standardize font
    const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    
    const size = options.size || 50;
    const opacity = options.opacity || 0.15;
    const rotation = options.rotation || 45;
    const colorHex = options.color || '#000000';

    // Hex parsing helper
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;
    const color = PDFLib.rgb(r, g, b);

    for (const page of pages) {
      const { width, height } = page.getSize();
      
      page.drawText(text, {
        x: width / 2 - (text.length * size * 0.25),
        y: height / 2,
        size: size,
        font: font,
        color: color,
        opacity: opacity,
        rotate: PDFLib.degrees(rotation),
        originAtCenter: true
      });
    }

    return await doc.save();
  },

  /**
   * Add custom footer Page Numbers to a PDF
   */
  addPageNumbers: async function(file, options = {}) {
    const PDFLib = await this.loadLibrary('pdf-lib');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const doc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = doc.getPages();
    const pageCount = pages.length;

    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const fontSize = options.size || 10;
    const format = options.format || 'page_num'; // 'page_num' or 'page_of_total'
    const position = options.position || 'bottom_right'; // bottom_left, bottom_center, bottom_right, top_center

    for (let i = 0; i < pageCount; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const pageNumStr = String(i + 1);
      const totalStr = String(pageCount);
      
      const label = format === 'page_of_total' 
        ? `Page ${pageNumStr} of ${totalStr}` 
        : pageNumStr;

      let x = width - 50;
      let y = 30;

      if (position === 'bottom_left') {
        x = 50;
      } else if (position === 'bottom_center') {
        x = (width / 2) - (label.length * fontSize * 0.25);
      } else if (position === 'top_center') {
        x = (width / 2) - (label.length * fontSize * 0.25);
        y = height - 30;
      } else if (position === 'top_right') {
        x = width - 50;
        y = height - 30;
      }

      page.drawText(label, {
        x: x,
        y: y,
        size: fontSize,
        font: font,
        color: PDFLib.rgb(0.3, 0.35, 0.45),
        opacity: 0.8
      });
    }

    return await doc.save();
  },

  // ==========================================
  // CONVERT & CONVERT FROM OPERATIONS (pdf.js / jsPDF)
  // ==========================================

  /**
   * Convert multiple image files into a single PDF Document
   */
  imagesToPdf: async function(files, options = {}) {
    const jspdf = await this.loadLibrary('jspdf');
    const jsDoc = new jspdf.jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'pt',
      format: options.pageSize || 'a4'
    });

    const margin = options.margin !== undefined ? Number(options.margin) : 20;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await this.readFileAsDataURL(file);

      if (i > 0) {
        jsDoc.addPage();
      }

      const pdfWidth = jsDoc.internal.pageSize.getWidth();
      const pdfHeight = jsDoc.internal.pageSize.getHeight();
      
      // Calculate printable area
      const printW = pdfWidth - (margin * 2);
      const printH = pdfHeight - (margin * 2);

      // Extract image properties to scale appropriately
      jsDoc.addImage(dataUrl, 'JPEG', margin, margin, printW, printH, undefined, 'MEDIUM');
    }

    return jsDoc.output('arraybuffer');
  },

  /**
   * Render PDF pages as JPEG images.
   * Can trigger progress callbacks, returns array of {pageNum, blob}.
   */
  pdfToJpg: async function(file, onProgress) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const pageImages = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for print-quality JPEGs

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Extract as Blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      pageImages.push({
        pageNum: i,
        blob: blob
      });

      if (typeof onProgress === 'function') {
        onProgress(i, totalPages);
      }
    }

    return pageImages;
  },

  /**
   * ZIP packaging helper using jszip
   */
  zipFiles: async function(items, zipName = 'images.zip') {
    const JSZip = await this.loadLibrary('jszip');
    const zip = new JSZip();

    items.forEach((item, index) => {
      const num = String(item.pageNum).padStart(3, '0');
      zip.file(`page-${num}.jpg`, item.blob);
    });

    const archive = await zip.generateAsync({ type: 'blob' });
    this.downloadFile(archive, zipName, 'application/zip');
  },

  // ==========================================
  // PARSING & PREVIEW & METADATA (pdf.js)
  // ==========================================

  /**
   * Get basic details (title, pageCount, encrypted, etc)
   */
  getPDFInfo: async function(file) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    let pdf;
    
    try {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (err) {
      if (err.name === 'PasswordException') {
        return { encrypted: true, pageCount: 'Locked' };
      }
      throw err;
    }

    const meta = await pdf.getMetadata().catch(() => null);
    
    return {
      encrypted: false,
      pageCount: pdf.numPages,
      title: meta?.info?.Title || file.name,
      creator: meta?.info?.Creator || 'Unknown',
      producer: meta?.info?.Producer || 'Unknown'
    };
  },

  /**
   * Render preview of a specific page onto an HTML Canvas element
   */
  renderPDFPreview: async function(file, canvas, pageNum = 1) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);

    // Dynamic viewport fits canvas width
    const parentWidth = canvas.parentNode ? canvas.parentNode.clientWidth : 200;
    const viewportScale = (parentWidth - 10) / page.getViewport({ scale: 1.0 }).width;
    const viewport = page.getViewport({ scale: viewportScale || 1.0 });

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return pdf.numPages;
  },

  // ==========================================
  // ADVANCED CONVERSIONS & FALLBACKS (text extracts)
  // ==========================================

  /**
   * Smart client-side PDF analyzer.
   * Samples page structures to determine composition, selectable text, images, and tables.
   */
  analyzePDF: async function(file) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (err) {
      if (err.name === 'PasswordException') {
        return {
          encrypted: true,
          corrupted: false,
          pageCount: 0,
          fileSize: file.size,
          selectableText: false,
          embeddedImages: 0,
          composition: 'Encrypted / Locked',
          hasTables: false,
          confidence: 'Low',
          ocrRequired: false,
          suggestedMethod: 'Unlock PDF First',
          recommendedMode: 'None',
          pageSizeName: 'Unknown',
          minFontSize: 0,
          maxFontSize: 0,
          textBlocksCount: 0,
          linesCount: 0,
          columnCount: 0,
          rowCount: 0,
          hasMergedAreas: false,
          hasInvoiceHeader: false,
          hasTotalsSection: false
        };
      }
      return {
        encrypted: false,
        corrupted: true,
        pageCount: 0,
        fileSize: file.size,
        selectableText: false,
        embeddedImages: 0,
        composition: 'Corrupted / Unreadable',
        hasTables: false,
        confidence: 'Low',
        ocrRequired: false,
        suggestedMethod: 'None (File is unreadable)',
        recommendedMode: 'None',
        pageSizeName: 'Unknown',
        minFontSize: 0,
        maxFontSize: 0,
        textBlocksCount: 0,
        linesCount: 0,
        columnCount: 0,
        rowCount: 0,
        hasMergedAreas: false,
        hasInvoiceHeader: false,
        hasTotalsSection: false
      };
    }

    const numPages = pdf.numPages;
    
    // Select sampling pages (up to 5 pages)
    const sampledPages = [];
    if (numPages <= 5) {
      for (let i = 1; i <= numPages; i++) sampledPages.push(i);
    } else {
      sampledPages.push(1);
      sampledPages.push(Math.floor(numPages / 2));
      sampledPages.push(numPages);
      if (numPages > 3) {
        sampledPages.push(2);
      }
      if (numPages > 4) {
        sampledPages.push(numPages - 1);
      }
      sampledPages.sort((a, b) => a - b);
    }

    let totalChars = 0;
    let totalImages = 0;
    let totalTextItems = 0;
    let pathOpsCount = 0;
    
    let globalMinFont = 999;
    let globalMaxFont = 0;
    
    let globalColumnsCount = 0;
    let globalRowsCount = 0;
    
    let hasInvoiceHeader = false;
    let hasTotalsSection = false;
    let hasMergedAreas = false;
    let detectedPageSize = 'A4';
    
    const invoiceKeywords = /invoice|bill to|po number|purchase order|invoice number|invoice date|tax invoice|statement/i;
    const totalsKeywords = /total|subtotal|amount due|balance due|grand total|total due|net amount/i;

    for (const pageNum of sampledPages) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Page Geometry Size
        const viewBox = page.viewBox || [0, 0, 595, 842];
        const w = Math.round(viewBox[2] - viewBox[0]);
        const h = Math.round(viewBox[3] - viewBox[1]);
        if ((Math.abs(w - 595) < 15 && Math.abs(h - 842) < 15) || (Math.abs(w - 842) < 15 && Math.abs(h - 595) < 15)) {
          detectedPageSize = 'A4';
        } else if ((Math.abs(w - 612) < 15 && Math.abs(h - 792) < 15) || (Math.abs(w - 792) < 15 && Math.abs(h - 612) < 15)) {
          detectedPageSize = 'Letter';
        } else {
          detectedPageSize = `${w}x${h} pt (Custom)`;
        }

        const textContent = await page.getTextContent();
        let pageText = '';
        const leftCoords = [];
        const topCoords = [];
        const horizontalRanges = [];

        textContent.items.forEach(item => {
          pageText += item.str + ' ';
          totalTextItems++;
          
          const fontHeight = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || 0;
          if (fontHeight > 0) {
            if (fontHeight < globalMinFont) globalMinFont = fontHeight;
            if (fontHeight > globalMaxFont) globalMaxFont = fontHeight;
          }

          const x = item.transform[4];
          const y = item.transform[5];
          leftCoords.push(x);
          topCoords.push(y);
          
          const widthEst = (item.width || item.str.length * fontHeight * 0.5);
          horizontalRanges.push({ x, y, width: widthEst, str: item.str });
        });
        
        totalChars += pageText.trim().length;

        if (invoiceKeywords.test(pageText)) hasInvoiceHeader = true;
        if (totalsKeywords.test(pageText)) hasTotalsSection = true;

        // Count images and vector paths from operator list
        const opList = await page.getOperatorList();
        const paintImageXObject = pdfjsLib.OPS ? pdfjsLib.OPS.paintImageXObject : 85;
        const paintInlineImage = pdfjsLib.OPS ? pdfjsLib.OPS.paintInlineImage : 82;
        const constructPath = pdfjsLib.OPS ? pdfjsLib.OPS.constructPath : 16;
        
        for (let k = 0; k < opList.fnArray.length; k++) {
          const fn = opList.fnArray[k];
          if (fn === paintImageXObject || fn === paintInlineImage || fn === 85 || fn === 82) {
            totalImages++;
          }
          if (fn === constructPath || fn === 16) {
            pathOpsCount++;
          }
        }

        // X coordinate (columns) clustering
        if (leftCoords.length > 0) {
          leftCoords.sort((a, b) => a - b);
          const colClusters = [];
          leftCoords.forEach(x => {
            let matched = false;
            for (const cluster of colClusters) {
              if (Math.abs(cluster - x) < 15) {
                matched = true;
                break;
              }
            }
            if (!matched) {
              colClusters.push(x);
            }
          });
          globalColumnsCount = Math.max(globalColumnsCount, colClusters.length);
        }

        // Y coordinate (rows) clustering
        if (topCoords.length > 0) {
          topCoords.sort((a, b) => b - a);
          const rowClusters = [];
          topCoords.forEach(y => {
            let matched = false;
            for (const cluster of rowClusters) {
              if (Math.abs(cluster - y) < 6) {
                matched = true;
                break;
              }
            }
            if (!matched) {
              rowClusters.push(y);
            }
          });
          globalRowsCount = Math.max(globalRowsCount, rowClusters.length);
        }

        // Merged area detection: check if text items span overlapping X ranges on the same Y track
        for (let j = 0; j < horizontalRanges.length; j++) {
          for (let m = j + 1; m < horizontalRanges.length; m++) {
            const itemA = horizontalRanges[j];
            const itemB = horizontalRanges[m];
            if (Math.abs(itemA.y - itemB.y) < 6) {
              const minLeft = Math.min(itemA.x, itemB.x);
              const maxLeft = Math.max(itemA.x, itemB.x);
              const firstItem = itemA.x < itemB.x ? itemA : itemB;
              if (firstItem.x + firstItem.width > maxLeft + 5) {
                hasMergedAreas = true;
                break;
              }
            }
          }
          if (hasMergedAreas) break;
        }

      } catch (e) {
        console.error(`[Analyzer] Error parsing page ${pageNum}`, e);
      }
    }

    if (globalMinFont === 999) globalMinFont = 0;

    const avgChars = totalChars / sampledPages.length;
    const avgImages = totalImages / sampledPages.length;
    const hasSelectableText = avgChars > 25;
    const hasImages = totalImages > 0;
    
    let composition = 'Real Text PDF';
    let ocrRequired = false;

    if (!hasSelectableText && hasImages) {
      composition = 'Scanned Image PDF';
      ocrRequired = true;
    } else if (hasSelectableText && hasImages) {
      if (avgChars > 150 && totalImages < 2) {
        composition = 'Real Text PDF';
      } else {
        composition = 'Mixed Text + Image PDF';
      }
    } else if (!hasSelectableText && !hasImages) {
      composition = 'Scanned Image PDF';
      ocrRequired = true;
    }

    const hasTables = globalColumnsCount >= 3 && globalRowsCount >= 4 && hasSelectableText;
    
    let confidence = 'High';
    if (ocrRequired) {
      confidence = 'Low';
    } else if (composition === 'Mixed Text + Image PDF' || hasMergedAreas || globalColumnsCount > 10) {
      confidence = 'Medium';
    }

    let suggestedMethod = 'Data Mode';
    if (ocrRequired) {
      suggestedMethod = 'OCR required (conversion locked)';
    } else if (confidence === 'Medium' || hasMergedAreas) {
      suggestedMethod = 'Layout Mode';
    }

    return {
      encrypted: false,
      corrupted: false,
      pageCount: numPages,
      fileSize: file.size,
      selectableText: hasSelectableText,
      totalCharsEstimated: Math.round(avgChars * numPages),
      embeddedImages: totalImages,
      composition: composition,
      hasTables: hasTables,
      confidence: confidence,
      ocrRequired: ocrRequired,
      suggestedMethod: suggestedMethod,
      recommendedMode: suggestedMethod === 'Data Mode' ? 'Data Mode' : (ocrRequired ? 'None' : 'Layout Mode'),
      pageSizeName: detectedPageSize,
      minFontSize: parseFloat(globalMinFont.toFixed(1)),
      maxFontSize: parseFloat(globalMaxFont.toFixed(1)),
      textBlocksCount: totalTextItems,
      linesCount: pathOpsCount,
      columnCount: globalColumnsCount,
      rowCount: globalRowsCount,
      hasMergedAreas: hasMergedAreas,
      hasInvoiceHeader: hasInvoiceHeader,
      hasTotalsSection: hasTotalsSection
    };
  },

  /**
   * PDF to Word client-side conversion.
   * Extracts selectable text and writes a real .docx package.
   */
  pdfToWordBasicText: async function(file) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;
    const pages = [];
    let totalTextChars = 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const sortedItems = (content.items || [])
        .filter(item => item && item.str && item.str.trim())
        .sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5];
          return Math.abs(yDiff) > 4 ? yDiff : a.transform[4] - b.transform[4];
        });

      const lines = [];
      let currentLine = '';
      let lastY;
      for (const item of sortedItems) {
        if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 8) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
        }
        currentLine += item.str + ' ';
        totalTextChars += item.str.trim().length;
        lastY = item.transform[5];
      }
      if (currentLine.trim()) lines.push(currentLine.trim());
      pages.push({ page: i, lines });
    }

    if (totalTextChars === 0) {
      throw new Error("This PDF appears to be scanned or image-based. No selectable text was found, so OCR is required before creating an editable Word file.");
    }

    const name = file.name.replace(/\.pdf$/i, '') + '_extracted.docx';
    await this.makeDocxFromPages(pages, name);
  },

  /**
   * PDF to Excel client-side conversion.
   * Extracts rows and writes a real .xlsx workbook.
   */
  pdfToExcelBasicTable: async function(file, mode = 'layout') {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const XLSX = await this.loadLibrary('xlsx');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    const workbookRows = [];
    let totalTextChars = 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const rawItems = content.items || [];
      const items = rawItems.filter(item => item && item.str && item.str.trim() !== '');
      
      items.forEach(item => {
        totalTextChars += (item.str || '').trim().length;
      });

      if (items.length === 0) continue;

      // Group items by vertical height (Y coordinate) within a tolerance of 6px
      const rowsMap = {};
      items.forEach(item => {
        const y = Math.round(item.transform[5]);
        let found = false;
        for (const heightKey of Object.keys(rowsMap)) {
          if (Math.abs(Number(heightKey) - y) < 6) {
            rowsMap[heightKey].push(item);
            found = true;
            break;
          }
        }
        if (!found) {
          rowsMap[y] = [item];
        }
      });

      // Sort vertical row heights top-to-bottom (descending Y)
      const heights = Object.keys(rowsMap).map(Number).sort((a, b) => b - a);

      if (mode === 'data') {
        // --- DATA MODE ---
        workbookRows.push([`Page ${i} Table Data`]);

        heights.forEach(h => {
          const rowItems = rowsMap[h];
          rowItems.sort((a, b) => a.transform[4] - b.transform[4]);

          const mergedText = rowItems.map(item => item.str).join(' ').trim();
          const hasNumbers = /[0-9]/.test(mergedText);
          const hasDescription = rowItems.some(item => item.str.length > 5);

          // Filtering visual noise
          if (rowItems.length >= 3 || (rowItems.length >= 2 && hasNumbers && hasDescription)) {
            const cells = rowItems.map(item => item.str.trim());
            workbookRows.push(cells);
          }
        });

      } else {
        // --- LAYOUT MODE (Coordinate Grid Alignment) ---
        const xCoords = [];
        items.forEach(item => {
          xCoords.push(item.transform[4]);
        });

        xCoords.sort((a, b) => a - b);

        // Cluster X coords within a 15pt threshold
        const uniqueColumns = [];
        xCoords.forEach(x => {
          let matched = false;
          for (const col of uniqueColumns) {
            if (Math.abs(col - x) < 15) {
              matched = true;
              break;
            }
          }
          if (!matched) {
            uniqueColumns.push(x);
          }
        });

        // Unique columns are sorted ascending (left-to-right)
        uniqueColumns.sort((a, b) => a - b);

        workbookRows.push([`Page ${i} Visual Layout`]);

        heights.forEach(h => {
          const rowItems = rowsMap[h];
          
          // Build aligned row cells mapping to the unique virtual column slots
          const rowCells = new Array(uniqueColumns.length).fill('');

          rowItems.forEach(item => {
            const itemX = item.transform[4];
            
            // Find closest column track index
            let closestIdx = 0;
            let minDiff = Infinity;
            for (let c = 0; c < uniqueColumns.length; c++) {
              const diff = Math.abs(uniqueColumns[c] - itemX);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = c;
              }
            }

            // Clean cell value
            let val = item.str.trim();
            
            // If another item maps to the same column slot, combine them
            if (rowCells[closestIdx] !== '') {
              rowCells[closestIdx] = `${rowCells[closestIdx]} ${val}`;
            } else {
              rowCells[closestIdx] = val;
            }
          });

          workbookRows.push(rowCells);
        });
      }
    }

    if (totalTextChars === 0) {
      throw new Error("This PDF appears to be image-based or scanned. No selectable text was found, so table extraction is not possible. OCR is required.");
    }

    const worksheet = XLSX.utils.aoa_to_sheet(workbookRows);
    worksheet['!cols'] = workbookRows.reduce((cols, row) => {
      row.forEach((cell, idx) => {
        const width = Math.min(Math.max(String(cell || '').length + 2, 10), 36);
        cols[idx] = { wch: Math.max(cols[idx]?.wch || 10, width) };
      });
      return cols;
    }, []);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, mode === 'data' ? 'Extracted Data' : 'Visual Layout');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const name = file.name.replace(/\.pdf$/i, '') + `_extracted_${mode}.xlsx`;
    this.downloadFile(blob, name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  },

  /**
   * OCR PDF client-side conversion.
   * Renders pages to canvas and extracts text with Tesseract.js.
   */
  ocrPdfToText: async function(file, onProgress) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const Tesseract = await this.loadLibrary('tesseract');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      if (typeof onProgress === 'function') onProgress(i, pdf.numPages, 'render');
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;

      if (typeof onProgress === 'function') onProgress(i, pdf.numPages, 'ocr');
      const result = await Tesseract.recognize(canvas, 'eng');
      const text = (result?.data?.text || '').trim();
      pages.push({
        page: i,
        lines: text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
      });
    }

    const textOutput = pages
      .map(page => `--- Page ${page.page} ---\n${page.lines.join('\n')}`)
      .join('\n\n');

    if (!textOutput.trim()) {
      throw new Error("OCR finished but no readable text was detected. Try a higher-resolution scan or a clearer document.");
    }

    const txtName = file.name.replace(/\.pdf$/i, '') + '_ocr.txt';
    const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
    this.downloadFile(blob, txtName, 'text/plain;charset=utf-8');
  },

  /**
   * PDF to PowerPoint Client-Side Fallback.
   * Grabs PDF pages as JPEGs and downloads as basic HTML slide deck or packages as PPTX templates if possible.
   * For V1 client-side, we download zipped images representing each slide backdrop.
   */
  pdfToPowerPointBasicImages: async function(file, onProgress) {
    const images = await this.pdfToJpg(file, onProgress);
    
    // Packages images into a ZIP archive labeled slide backdrops
    const JSZip = await this.loadLibrary('jszip');
    const zip = new JSZip();
    
    images.forEach((item) => {
      const num = String(item.pageNum).padStart(3, '0');
      zip.file(`slide-${num}.jpg`, item.blob);
    });

    // Also inject a basic HTML slideshow viewer
    const slideshowHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Presentation Slides</title>
        <style>
          body { margin: 0; background: #0b1329; color: #fff; font-family: system-ui; display: grid; place-items: center; min-height: 100vh; overflow: hidden; }
          .slide-container { position: relative; width: 80vw; aspect-ratio: 16/9; box-shadow: 0 20px 50px rgba(0,0,0,0.5); background: #000; border-radius: 8px; overflow: hidden; }
          img { width: 100%; height: 100%; object-fit: contain; }
          .controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; background: rgba(0,0,0,0.6); padding: 8px 16px; border-radius: 30px; backdrop-filter: blur(10px); }
          button { background: none; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
          button:hover { background: rgba(255,255,255,0.1); }
          .counter { padding-top: 4px; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="slide-container">
          <img id="slideImg" src="slide-001.jpg" alt="Slide">
          <div class="controls">
            <button onclick="prev()">Prev</button>
            <span class="counter" id="counter">1 / ${images.length}</span>
            <button onclick="next()">Next</button>
          </div>
        </div>
        <script>
          let current = 1;
          const total = ${images.length};
          function update() {
            const num = String(current).padStart(3, '0');
            document.getElementById('slideImg').src = 'slide-' + num + '.jpg';
            document.getElementById('counter').innerText = current + ' / ' + total;
          }
          function next() { if (current < total) { current++; update(); } }
          function prev() { if (current > 1) { current--; update(); } }
          document.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === ' ') next();
            if (e.key === 'ArrowLeft') prev();
          });
        <\\/script>
      </body>
      </html>
    `;
    
    zip.file('slideshow_viewer.html', slideshowHtml);
    
    const archive = await zip.generateAsync({ type: 'blob' });
    const name = file.name.replace(/\.pdf$/i, '') + '_slides.zip';
    this.downloadFile(archive, name, 'application/zip');
  }
};

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
    'pptxgenjs': {
      url: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
      global: 'PptxGenJS'
    },
    'docx': {
      url: 'https://unpkg.com/docx@8.5.0/build/index.umd.js',
      global: 'docx'
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

        if (name === 'pptxgenjs') {
          libObj = window.PptxGenJS || window.pptxgen || window.pptxgenjs;
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
  getSafeOfficeBaseName: function(file) {
    return (file.name || 'converted')
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .trim() || 'converted';
  },

  getFontSizeFromTransform: function(transform) {
    const t = transform || [];
    const vertical = Math.abs(Number(t[3] || 0));
    const horizontal = Math.abs(Number(t[0] || 0));
    return Number((vertical || horizontal || 10).toFixed(2));
  },

  isBoldLikeFont: function(fontName) {
    return /bold|black|heavy|semibold|demi/i.test(String(fontName || ''));
  },

  medianNumber: function(values) {
    const sorted = values.filter(value => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) return 10;
    return sorted[Math.floor(sorted.length / 2)];
  },

  groupTextItemsIntoLines: function(items, tolerance = 5) {
    const sorted = (items || [])
      .filter(item => item && item.str && item.str.trim())
      .map(item => ({
        text: String(item.str || '').trim(),
        x: Number((item.transform || [])[4] || 0),
        y: Number((item.transform || [])[5] || 0),
        width: Number(item.width || 0),
        fontSize: this.getFontSizeFromTransform(item.transform),
        fontName: item.fontName || ''
      }))
      .sort((a, b) => {
        if (Math.abs(b.y - a.y) > tolerance) return b.y - a.y;
        return a.x - b.x;
      });

    const rows = [];
    sorted.forEach(item => {
      const last = rows[rows.length - 1];
      if (!last || Math.abs(last.y - item.y) > tolerance) {
        rows.push({ y: item.y, items: [item] });
        return;
      }
      last.items.push(item);
      last.y = (last.y + item.y) / 2;
    });

    return rows.map(row => {
      const ordered = row.items.sort((a, b) => a.x - b.x);
      const text = ordered.map((item, index) => {
        const previous = ordered[index - 1];
        const gap = previous ? item.x - (previous.x + previous.width) : 0;
        const spacer = gap > item.fontSize * 1.2 ? '  ' : ' ';
        return index === 0 ? item.text : `${spacer}${item.text}`;
      }).join('').replace(/\s+/g, ' ').trim();

      return {
        text,
        x: ordered[0] ? ordered[0].x : 0,
        y: row.y,
        fontSize: Math.max(...ordered.map(item => item.fontSize), 10),
        fontName: ordered.map(item => item.fontName).join(' '),
        boldSignal: ordered.some(item => this.isBoldLikeFont(item.fontName))
      };
    }).filter(line => line.text);
  },

  classifyDocxLine: function(line, bodyFontSize) {
    const text = line.text.trim();
    return {
      isHeading: (line.fontSize >= bodyFontSize * 1.18 && text.length <= 120) ||
        (line.boldSignal && text.length <= 90 && !/[.!?]$/.test(text)),
      isBullet: /^([*+\-•‣◦])\s+/.test(text)
    };
  },

  groupExcelRows: function(items, tolerance = 6) {
    const sorted = (items || []).filter(item => item.text).sort((a, b) => {
      if (Math.abs(b.y - a.y) > tolerance) return b.y - a.y;
      return a.x - b.x;
    });
    const rows = [];

    sorted.forEach(item => {
      const last = rows[rows.length - 1];
      if (!last || Math.abs(last.y - item.y) > tolerance) {
        rows.push({ y: item.y, items: [item] });
        return;
      }
      last.items.push(item);
      last.y = (last.y + item.y) / 2;
    });

    return rows.map(row => ({
      y: row.y,
      items: row.items.sort((a, b) => a.x - b.x)
    }));
  },

  clusterExcelColumns: function(items, tolerance = 22) {
    const xs = (items || []).filter(item => item.text).map(item => item.x).sort((a, b) => a - b);
    const clusters = [];

    xs.forEach(x => {
      const last = clusters[clusters.length - 1];
      if (!last || Math.abs(last.center - x) > tolerance) {
        clusters.push({ center: x, values: [x] });
        return;
      }
      last.values.push(x);
      last.center = last.values.reduce((sum, value) => sum + value, 0) / last.values.length;
    });

    return clusters.map(cluster => Number(cluster.center.toFixed(2)));
  },

  nearestExcelColumnIndex: function(columns, x) {
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
  },

  hasCurrencySignal: function(value) {
    return /[$€£¥₹]|BHD|SAR|AED|QAR|KWD|OMR|USD|EUR|GBP/i.test(value);
  },

  parseExcelCellValue: function(raw) {
    let value = String(raw || '').trim();
    if (!value) return { value: '' };

    // 1. Check Date formats
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { value, format: 'yyyy-mm-dd' };
    }
    // DD/MM/YYYY or MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
      return { value, format: 'dd/mm/yyyy' };
    }
    // DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(value)) {
      return { value, format: 'dd-mm-yyyy' };
    }

    // 2. Check Currency formats
    const currencyPrefixRegex = /^([$€£¥₹]|BHD|SAR|AED|QAR|KWD|OMR|USD|EUR|GBP)\s*(-?\d{1,3}(,\d{3})*(\.\d+)?|-?\d+(\.\d+)?)$/i;
    const currencySuffixRegex = /^(-?\d{1,3}(,\d{3})*(\.\d+)?|-?\d+(\.\d+)?)\s*([$€£¥₹]|BHD|SAR|AED|QAR|KWD|OMR|USD|EUR|GBP)$/i;

    let currencyMatch = value.match(currencyPrefixRegex);
    let isPrefix = true;
    if (!currencyMatch) {
      currencyMatch = value.match(currencySuffixRegex);
      isPrefix = false;
    }

    if (currencyMatch) {
      const symbol = isPrefix ? currencyMatch[1] : currencyMatch[6];
      const numStr = isPrefix ? currencyMatch[2] : currencyMatch[1];
      const cleanNum = Number(numStr.replace(/,/g, ''));
      if (!isNaN(cleanNum)) {
        let format = '';
        const upperSym = symbol.toUpperCase();
        if (['BHD', 'KWD', 'OMR'].includes(upperSym)) {
          format = `"${upperSym}" #,##0.000`;
        } else if (symbol === '$' || upperSym === 'USD') {
          format = '$#,##0.00';
        } else if (symbol === '€' || upperSym === 'EUR') {
          format = '[$€-2] #,##0.00';
        } else if (symbol === '£' || upperSym === 'GBP') {
          format = '[$£-809] #,##0.00';
        } else {
          format = `"${upperSym}" #,##0.00`;
        }
        return { value: cleanNum, format };
      }
    }

    // 3. Percentage formats
    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?%$|^-?\d+(\.\d+)?%$/.test(value) && !this.hasCurrencySignal(value)) {
      return { value: Number(value.replace(/,/g, '').replace('%', '')) / 100, format: '0.00%' };
    }

    // 4. Standard Number format
    if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(value) && !this.hasCurrencySignal(value)) {
      return { value: Number(value.replace(/,/g, '')) };
    }

    return { value };
  },

  excelRowsToSheetData: function(rows, columns, rowIndexOffset = 0) {
    const merges = [];
    const parsedRows = rows.map((row, rIdx) => {
      const actualRowIndex = rowIndexOffset + rIdx;
      const cells = Array.from({ length: columns.length || 1 }, () => ({ value: '', format: undefined }));

      const sortedItems = [...row.items].sort((a, b) => a.x - b.x);
      sortedItems.forEach(item => {
        if (!columns.length) {
          cells.push(this.parseExcelCellValue(item.text));
          return;
        }

        const startCol = this.nearestExcelColumnIndex(columns, item.x);
        const itemRight = item.x + item.width;
        let endCol = startCol;
        for (let c = startCol + 1; c < columns.length; c++) {
          if (columns[c] < itemRight - 10) {
            endCol = c;
          } else {
            break;
          }
        }

        const parsed = this.parseExcelCellValue(item.text);
        if (cells[startCol] && cells[startCol].value) {
          cells[startCol].value = `${cells[startCol].value} ${parsed.value}`;
        } else {
          cells[startCol] = parsed;
        }

        if (endCol > startCol) {
          merges.push({
            s: { r: actualRowIndex, c: startCol },
            e: { r: actualRowIndex, c: endCol }
          });
          for (let c = startCol + 1; c <= endCol; c++) {
            if (!cells[c] || !cells[c].value) {
              cells[c] = { value: '' };
            }
          }
        }
      });

      return cells;
    });

    return { parsedRows, merges };
  },

  applyExcelSheetFormats: function(sheet, parsedRows, XLSX) {
    const widths = [];

    for (let rowIndex = 0; rowIndex < parsedRows.length; rowIndex++) {
      for (let colIndex = 0; colIndex < parsedRows[rowIndex].length; colIndex++) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = sheet[address];
        const parsed = parsedRows[rowIndex][colIndex];
        const displayLength = String(parsed.value ?? '').length;

        widths[colIndex] = Math.max(widths[colIndex] || 10, Math.min(42, displayLength + 2));
        if (cell && parsed.format) cell.z = parsed.format;
      }
    }

    sheet['!cols'] = widths.map(width => ({ wch: width || 12 }));
  },

  pdfToWordBasicText: async function(file) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const docx = await this.loadLibrary('docx');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    const fontSizes = [];
    let totalTextChars = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines = this.groupTextItemsIntoLines(content.items || []);
      lines.forEach(line => {
        totalTextChars += line.text.length;
        fontSizes.push(line.fontSize);
      });
      pages.push({ page: i, lines });
    }

    if (totalTextChars === 0) {
      throw new Error("This PDF appears to be scanned or image-based. No selectable text was found, so OCR is required before creating an editable Word file.");
    }

    const bodyFontSize = this.medianNumber(fontSizes);
    const children = [];

    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
      }

      page.lines.forEach(line => {
        const kind = this.classifyDocxLine(line, bodyFontSize);
        const text = kind.isBullet ? line.text.replace(/^([*+\-•‣◦])\s+/, '').trim() : line.text;
        const paragraphOptions = {
          children: [
            new docx.TextRun({
              text,
              bold: kind.isHeading || line.boldSignal,
              size: Math.max(18, Math.min(36, Math.round(line.fontSize * 2)))
            })
          ],
          spacing: { after: kind.isHeading ? 180 : 90 }
        };

        if (kind.isHeading) paragraphOptions.heading = docx.HeadingLevel.HEADING_2;
        if (!kind.isHeading && kind.isBullet) paragraphOptions.bullet = { level: 0 };
        children.push(new docx.Paragraph(paragraphOptions));
      });
    });

    if (!children.length) {
      throw new Error("No selectable text could be converted into editable Word paragraphs.");
    }

    const document = new docx.Document({
      creator: "Vendora PDF Toolkit",
      title: `PDF to Word - ${file.name}`,
      description: "Editable DOCX generated in the browser from selectable PDF text.",
      sections: [{ properties: {}, children }]
    });
    const blob = await docx.Packer.toBlob(document);
    const name = `${this.getSafeOfficeBaseName(file)}_editable.docx`;
    this.downloadFile(blob, name, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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
    let totalTextChars = 0;
    const workbook = XLSX.utils.book_new();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = (content.items || [])
        .filter(item => item && item.str && item.str.trim())
        .map(item => ({
          text: String(item.str || '').trim(),
          x: Number((item.transform || [])[4] || 0),
          y: Number((item.transform || [])[5] || 0),
          width: Number(item.width || 0)
        }));

      items.forEach(item => { totalTextChars += item.text.length; });
      const rows = this.groupExcelRows(items);
      const columns = this.clusterExcelColumns(items);
      const { parsedRows, merges } = this.excelRowsToSheetData(rows, columns);
      const aoa = parsedRows.length ? parsedRows.map(row => row.map(cell => cell.value)) : [['No selectable text detected on this page']];
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      if (merges && merges.length > 0) {
        worksheet['!merges'] = merges;
      }
      this.applyExcelSheetFormats(worksheet, parsedRows.length ? parsedRows : [[{ value: 'No selectable text detected on this page' }]], XLSX);
      XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${i}`);
    }

    if (totalTextChars === 0) {
      throw new Error("This PDF appears to be image-based or scanned. No selectable text was found, so table extraction is not possible. OCR is required.");
    }

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const name = `${this.getSafeOfficeBaseName(file)}_extracted_${mode}.xlsx`;
    this.downloadFile(blob, name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  },

  /**
   * OCR PDF client-side conversion.
   * Renders pages to canvas and extracts text with Tesseract.js.
   */
  ocrPdfToText: async function(file, onProgress, options = {}) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const Tesseract = await this.loadLibrary('tesseract');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    
    const lang = options.lang || 'eng';
    const scale = options.scale !== undefined ? Number(options.scale) : 2.0;
    const format = options.format || 'txt';
    
    let confidenceSum = 0;
    let confidenceCount = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      if (typeof onProgress === 'function') onProgress(i, pdf.numPages, 'render');
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;

      if (typeof onProgress === 'function') onProgress(i, pdf.numPages, 'ocr');
      const result = await Tesseract.recognize(canvas, lang);
      const text = (result?.data?.text || '').trim();
      const pageConfidence = result?.data?.confidence || 0;
      
      confidenceSum += pageConfidence;
      confidenceCount++;
      
      pages.push({
        page: i,
        lines: text.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
        confidence: pageConfidence
      });
    }

    const textOutput = pages
      .map(page => `--- Page ${page.page} ---\n${page.lines.join('\n')}`)
      .join('\n\n');

    if (!textOutput.trim()) {
      throw new Error("OCR finished but no readable text was detected. Try a higher-resolution scan or a clearer document.");
    }

    const avgConfidence = confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0;

    if (format === 'docx') {
      const docxName = this.getSafeOfficeBaseName(file) + '_ocr.docx';
      await this.makeDocxFromPages(pages, docxName);
    } else if (format === 'txt') {
      const txtName = file.name.replace(/\.pdf$/i, '') + '_ocr.txt';
      const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
      this.downloadFile(blob, txtName, 'text/plain;charset=utf-8');
    }

    return {
      textOutput,
      pages,
      avgConfidence
    };
  },

  /**
   * PDF to PowerPoint client-side conversion.
   * Creates a real .pptx package with one image-based slide per PDF page.
   */
  pdfToPowerPointBasicImages: async function(file, onProgress, mode = 'image') {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const PptxGenJS = await this.loadLibrary('pptxgenjs');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const firstPage = await pdf.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    const slideWidth = Math.max(4, Math.min(13.333, firstViewport.width / 72));
    const slideHeight = Math.max(4, Math.min(13.333, firstViewport.height / 72));
    const pptx = new PptxGenJS();

    pptx.author = 'Vendora PDF Toolkit';
    pptx.company = 'Vendora';
    pptx.subject = 'Browser PDF to PowerPoint conversion';
    pptx.title = `PDF to PowerPoint - ${file.name}`;
    pptx.lang = 'en-US';
    pptx.defineLayout({
      name: 'PDF_PAGE',
      width: Number(slideWidth.toFixed(3)),
      height: Number(slideHeight.toFixed(3))
    });
    pptx.layout = 'PDF_PAGE';

    for (let i = 1; i <= pdf.numPages; i++) {
      if (typeof onProgress === 'function') onProgress(i, pdf.numPages);
      const page = i === 1 ? firstPage : await pdf.getPage(i);
      
      const viewportBase = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, Math.max(1, 1800 / viewportBase.width));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      
      const textContent = await page.getTextContent();
      const items = textContent.items || [];

      if (mode === 'editable') {
        // Redraw canvas with whited-out text zones
        await page.render({ canvasContext: context, viewport }).promise;

        const viewBox = page.viewBox || [0, 0, 595.3, 841.9];
        const pageWidth = viewBox[2] || 595.3;
        const pageHeight = viewBox[3] || 841.9;

        // Perform text coordinate whiteouts on the template canvas
        context.fillStyle = '#ffffff'; // standard template white background
        
        items.forEach(item => {
          if (!item.str || !item.str.trim()) return;
          
          const fontSize = this.getFontSizeFromTransform(item.transform);
          const x = item.transform[4];
          const y = item.transform[5];
          
          // Convert to canvas space
          const x_canvas = x * scale;
          const y_canvas = (pageHeight - y - fontSize) * scale;
          const w_canvas = item.width * scale;
          const h_canvas = fontSize * scale;
          
          context.fillRect(x_canvas - 2, y_canvas - 2, w_canvas + 4, h_canvas + 4);
        });

        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        slide.addImage({
          data: canvas.toDataURL('image/jpeg', 0.88),
          x: 0,
          y: 0,
          w: Number(slideWidth.toFixed(3)),
          h: Number(slideHeight.toFixed(3))
        });

        // Add editable text overlay
        items.forEach(item => {
          if (!item.str || !item.str.trim()) return;
          
          const fontSize = this.getFontSizeFromTransform(item.transform);
          const x = item.transform[4];
          const y = item.transform[5];
          
          // Map to slide inches (PDF scale: 72 points = 1 inch)
          const x_in = (x / pageWidth) * slideWidth;
          const y_in = ((pageHeight - y - fontSize) / pageHeight) * slideHeight;
          const w_in = (item.width / pageWidth) * slideWidth;
          const h_in = (fontSize / pageHeight) * slideHeight;
          
          const isBold = this.isBoldLikeFont(item.fontName);
          
          slide.addText(item.str, {
            x: Number(x_in.toFixed(3)),
            y: Number(y_in.toFixed(3)),
            w: Number(w_in.toFixed(3)),
            h: Number(h_in.toFixed(3)),
            fontSize: Math.max(5, Math.round(fontSize * 0.95)),
            fontFace: 'Arial',
            color: '000000',
            bold: isBold,
            margin: 0
          });
        });

      } else {
        await page.render({ canvasContext: context, viewport }).promise;

        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        slide.addImage({
          data: canvas.toDataURL('image/jpeg', 0.92),
          x: 0,
          y: 0,
          w: Number(slideWidth.toFixed(3)),
          h: Number(slideHeight.toFixed(3))
        });
      }
    }

    const name = `${this.getSafeOfficeBaseName(file)}_slides.pptx`;
    await pptx.writeFile({ fileName: name });
  },

  /**
   * PDF to Word client-side conversion preserving visual template formatting.
   * Renders each page, whites out digital text bounding boxes, and layers editable text in absolute coordinates over the template.
   */
  pdfToWordLayoutMode: async function(file) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesMarkup = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // high-fidelity template scaling
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Extract text content and coordinates
      const textContent = await page.getTextContent();
      const items = textContent.items || [];
      const textLinesMarkup = [];

      const viewBox = page.viewBox || [0, 0, 595.3, 841.9];
      const pageWidth = viewBox[2] || 595.3;
      const pageHeight = viewBox[3] || 841.9;

      // Perform text coordinate whiteouts on the template canvas
      context.fillStyle = '#ffffff'; // standard template white background
      
      items.forEach(item => {
        if (!item.str || !item.str.trim()) return;
        
        const fontSize = this.getFontSizeFromTransform(item.transform);
        const x = item.transform[4];
        const y = item.transform[5];
        
        // Convert to canvas space
        const x_canvas = x * 2.0;
        const y_canvas = (pageHeight - y - fontSize) * 2.0;
        const w_canvas = item.width * 2.0;
        const h_canvas = fontSize * 2.0;
        
        // Whiteout text on template canvas
        context.fillRect(x_canvas - 2, y_canvas - 2, w_canvas + 4, h_canvas + 4);
        
        // Map to Word points (A4 size: 595.3 x 841.9)
        const x_word = (x / pageWidth) * 595.3;
        const y_word = ((pageHeight - y - fontSize) / pageHeight) * 841.9;
        const w_word = (item.width / pageWidth) * 595.3;
        const h_word = (fontSize / pageHeight) * 841.9;
        
        const isBold = this.isBoldLikeFont(item.fontName);
        
        textLinesMarkup.push(`
          <div class="ocr-text-line" style="left: ${x_word.toFixed(1)}pt; top: ${y_word.toFixed(1)}pt; width: ${w_word.toFixed(1)}pt; height: ${h_word.toFixed(1)}pt; font-size: ${Math.max(6, Math.round(fontSize * 0.95))}pt; font-weight: ${isBold ? 'bold' : 'normal'};">
            ${this.escapeXml(item.str)}
          </div>
        `);
      });

      // Export whiteout template canvas as JPEG
      const bgImgUrl = canvas.toDataURL('image/jpeg', 0.85);

      pagesMarkup.push(`
        <table class="page-container" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 595.3pt; height: 841.9pt; page-break-after: always; border-collapse: collapse;">
          <tr>
            <td background="${bgImgUrl}" valign="top" style="background-image: url('${bgImgUrl}'); background-size: 595.3pt 841.9pt; background-repeat: no-repeat; width: 595.3pt; height: 841.9pt; padding: 0; position: relative;">
              <div style="position: relative; width: 595.3pt; height: 841.9pt; margin: 0; padding: 0;">
                ${textLinesMarkup.join('\n')}
              </div>
            </td>
          </tr>
        </table>
      `);
    }

    const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
@page PageSection {
  size: 595.3pt 841.9pt;
  margin: 0in 0in 0in 0in;
}
.page-container {
  page: PageSection;
  width: 595.3pt;
  height: 841.9pt;
  position: relative;
  page-break-after: always;
}
.page-container:last-child {
  page-break-after: avoid;
}
.ocr-text-line {
  position: absolute;
  font-family: Arial, sans-serif;
  color: #000000;
  background: transparent;
  border: none;
  white-space: nowrap;
}
</style>
</head>
<body style="margin: 0; padding: 0;">
  ${pagesMarkup.join('\n')}
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const name = `${this.getSafeOfficeBaseName(file)}_layout.doc`;
    this.downloadFile(blob, name, 'application/msword;charset=utf-8');
    return { htmlContent };
  },

  /**
   * OCR PDF to Word client-side conversion preserving visual template formatting.
   * Renders each page, runs OCR, whites out OCR text bounding boxes, and layers editable text in absolute coordinates over the template.
   */
  ocrToWordLayoutMode: async function(file, onProgress, options = {}) {
    const pdfjsLib = await this.loadLibrary('pdfjs-dist');
    const Tesseract = await this.loadLibrary('tesseract');
    const arrayBuffer = await this.readFileAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesMarkup = [];
    
    const lang = options.lang || 'eng';
    const scale = options.scale !== undefined ? Number(options.scale) : 2.0;

    let confidenceSum = 0;
    let confidenceCount = 0;
    const allTextLines = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      if (typeof onProgress === 'function') onProgress(i, pdf.numPages, 'render');
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;

      // Extract text content and coordinates via OCR
      if (typeof onProgress === 'function') onProgress(i, pdf.numPages, 'ocr');
      const result = await Tesseract.recognize(canvas, lang);
      const lines = result?.data?.lines || [];
      const textLinesMarkup = [];

      const pageConfidence = result?.data?.confidence || 0;
      confidenceSum += pageConfidence;
      confidenceCount++;

      // Perform text coordinate whiteouts on the template canvas
      context.fillStyle = '#ffffff'; // standard template white background
      
      lines.forEach(line => {
        if (!line.text || !line.text.trim()) return;
        
        const bbox = line.bbox;
        if (!bbox) return;
        
        const w_pixel = bbox.x1 - bbox.x0;
        const h_pixel = bbox.y1 - bbox.y0;
        
        // Whiteout text on template canvas
        context.fillRect(bbox.x0 - 2, bbox.y0 - 2, w_pixel + 4, h_pixel + 4);
        
        // Map to Word points (A4 size: 595.3 x 841.9)
        const x_word = (bbox.x0 / canvas.width) * 595.3;
        const y_word = (bbox.y0 / canvas.height) * 841.9;
        const w_word = (w_pixel / canvas.width) * 595.3;
        const h_word = (h_pixel / canvas.height) * 841.9;
        
        textLinesMarkup.push(`
          <div class="ocr-text-line" style="left: ${x_word.toFixed(1)}pt; top: ${y_word.toFixed(1)}pt; width: ${w_word.toFixed(1)}pt; height: ${h_word.toFixed(1)}pt; font-size: ${Math.max(6, Math.round(h_word * 0.7))}pt;">
            ${this.escapeXml(line.text)}
          </div>
        `);

        allTextLines.push(line.text);
      });

      // Export whiteout template canvas as JPEG
      const bgImgUrl = canvas.toDataURL('image/jpeg', 0.85);

      pagesMarkup.push(`
        <table class="page-container" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 595.3pt; height: 841.9pt; page-break-after: always; border-collapse: collapse;">
          <tr>
            <td background="${bgImgUrl}" valign="top" style="background-image: url('${bgImgUrl}'); background-size: 595.3pt 841.9pt; background-repeat: no-repeat; width: 595.3pt; height: 841.9pt; padding: 0; position: relative;">
              <div style="position: relative; width: 595.3pt; height: 841.9pt; margin: 0; padding: 0;">
                ${textLinesMarkup.join('\n')}
              </div>
            </td>
          </tr>
        </table>
      `);
    }

    const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
@page PageSection {
  size: 595.3pt 841.9pt;
  margin: 0in 0in 0in 0in;
}
.page-container {
  page: PageSection;
  width: 595.3pt;
  height: 841.9pt;
  position: relative;
  page-break-after: always;
}
.page-container:last-child {
  page-break-after: avoid;
}
.ocr-text-line {
  position: absolute;
  font-family: Arial, sans-serif;
  color: #000000;
  background: transparent;
  border: none;
  white-space: nowrap;
}
</style>
</head>
<body style="margin: 0; padding: 0;">
  ${pagesMarkup.join('\n')}
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const name = `${this.getSafeOfficeBaseName(file)}_ocr_layout.doc`;
    this.downloadFile(blob, name, 'application/msword;charset=utf-8');

    const textOutput = allTextLines.join('\n');
    const avgConfidence = confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0;
    
    return {
      textOutput,
      avgConfidence,
      pages: allTextLines.map(line => ({ lines: [line] })),
      htmlContent: htmlContent
    };
  }
};

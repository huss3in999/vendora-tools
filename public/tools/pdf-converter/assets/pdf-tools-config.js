/**
 * Vendora PDF Toolkit Configuration
 * Defines all 32 tools, their categories, descriptions, support levels,
 * icons, and config structures.
 * 
 * Support Levels:
 * - 'active': Fully functional, highly stable client-side tool.
 * - 'basic': Functional client-side tool with documented browser limitations.
 * - 'future': Labelled as a pro/future conversion engine preview.
 */
window.PdfToolsConfig = {
  categories: {
    organize: {
      name: "Organize PDF",
      icon: "📁",
      description: "Reorder, extract, split, or merge pages to manage your document structure."
    },
    optimize: {
      name: "Optimize PDF",
      icon: "⚡",
      description: "Compress or repair documents for faster loading and sharing."
    },
    convertTo: {
      name: "Convert to PDF",
      icon: "📤",
      description: "Convert office documents and images into PDF files."
    },
    convertFrom: {
      name: "Convert from PDF",
      icon: "📥",
      description: "Extract text, images, and tabular data out of PDF documents."
    },
    edit: {
      name: "Edit PDF",
      icon: "✏️",
      description: "Annotate, add page numbers, watermark, or crop pages."
    },
    security: {
      name: "Security Tools",
      icon: "🔒",
      description: "Add or remove passwords, sign, redact, or lock PDFs."
    },
    intelligence: {
      name: "AI & Intelligence",
      icon: "🧠",
      description: "Next-generation PDF utilities powered by OCR and AI engines."
    }
  },

  tools: [
    // --- Organize PDF Category ---
    {
      id: "merge-pdf",
      category: "organize",
      name: "Merge PDF",
      icon: "🔗",
      description: "Combine multiple PDF documents into a single file in seconds.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser. No files are uploaded.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "split-pdf",
      category: "organize",
      name: "Split PDF",
      icon: "✂️",
      description: "Extract specific page ranges or split each page into a separate PDF file.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser. No files are uploaded.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "remove-pages",
      category: "organize",
      name: "Remove Pages",
      icon: "🗑️",
      description: "Select and delete unwanted pages from your PDF document.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "extract-pages",
      category: "organize",
      name: "Extract Pages",
      icon: "📄",
      description: "Choose specific pages and extract them into a brand-new PDF.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "organize-pdf",
      category: "organize",
      name: "Organize Pages",
      icon: "🔄",
      description: "Drag, drop, reorder, or delete pages visually using canvas thumbnails.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "rotate-pdf",
      category: "organize",
      name: "Rotate PDF",
      icon: "↩️",
      description: "Rotate single or multiple pages of your PDF in clockwise or counter-clockwise directions.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },

    // --- Optimize PDF Category ---
    {
      id: "compress-pdf",
      category: "optimize",
      name: "Compress PDF",
      icon: "⚡",
      description: "Reduce file size while maximizing document quality and resolution.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "basic",
      releaseLabel: "Basic",
      limitations: "Best for simple files. Complex layouts, scanned PDFs, tables, images, and multi-language documents may need manual review. Compression may flatten pages and reduce editability."
    },
    {
      id: "repair-pdf",
      category: "optimize",
      name: "Repair PDF",
      icon: "🛠️",
      description: "Fix corrupted PDF files and salvage accessible structure or text stream.",
      supportedFormats: ".pdf",
      privacy: "Analyzes structures locally.",
      status: "future",
      limitations: "Corrupted PDF repairs require structural rebuilding. This tool is a preview; pro-grade repair engine coming soon."
    },

    // --- Convert To PDF Category ---
    {
      id: "jpg-to-pdf",
      category: "convertTo",
      name: "JPG to PDF",
      icon: "🖼️",
      description: "Convert JPEG images to PDF in seconds. Adjust orientation, size, and margin easily.",
      supportedFormats: ".jpg, .jpeg",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "png-to-pdf",
      category: "convertTo",
      name: "PNG to PDF",
      icon: "📐",
      description: "Convert PNG images to PDF. Fully handles transparent backdrops.",
      supportedFormats: ".png",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "image-to-pdf",
      category: "convertTo",
      name: "Image to PDF",
      icon: "🎨",
      description: "Convert multiple JPG, PNG, GIF, or WebP images to a beautifully styled PDF.",
      supportedFormats: ".jpg, .jpeg, .png, .gif, .webp",
      privacy: "Processed entirely inside your browser.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "word-to-pdf",
      category: "convertTo",
      name: "Word to PDF",
      icon: "📝",
      description: "Convert your DOCX Word documents into highly accessible PDF format.",
      supportedFormats: ".docx",
      privacy: "Requires parsing files locally.",
      status: "basic",
      limitations: "Complex layout tables or custom Microsoft word fonts may undergo styling shifts. For critical layouts, a server conversion engine is recommended."
    },
    {
      id: "powerpoint-to-pdf",
      category: "convertTo",
      name: "PowerPoint to PDF",
      icon: "📊",
      description: "Convert PPTX slideshow presentations into standard PDF files.",
      supportedFormats: ".pptx",
      privacy: "Requires local parsing.",
      status: "future",
      limitations: "Slideshow layout rendering requires dedicated Microsoft Office libraries. Available as a preview; full layout-preserving engine coming soon."
    },
    {
      id: "excel-to-pdf",
      category: "convertTo",
      name: "Excel to PDF",
      icon: "📈",
      description: "Export spreadsheet grids and cell tables to standard PDF sheets.",
      supportedFormats: ".xlsx, .xls",
      privacy: "Requires local parsing.",
      status: "future",
      limitations: "Multi-column sheets often wrap or shrink in complex grid layouts. Standardized grid export requires advanced sizing engine. Preview mode only."
    },
    {
      id: "html-to-pdf",
      category: "convertTo",
      name: "HTML to PDF",
      icon: "🌐",
      description: "Convert web pages or local HTML markup code into PDF sheets.",
      supportedFormats: ".html, .htm",
      privacy: "Processed entirely inside your browser.",
      status: "basic",
      limitations: "Renders local markup structure directly. External styles or dynamic scripts are restricted due to sandbox privacy rules."
    },

    // --- Convert From PDF Category ---
    {
      id: "pdf-to-jpg",
      category: "convertFrom",
      name: "PDF to JPG",
      icon: "🖼️",
      description: "Extract images from a PDF or convert each page to an independent JPEG image.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser. No files are uploaded.",
      status: "active",
      releaseLabel: "Ready"
    },
    {
      id: "pdf-to-word",
      category: "convertFrom",
      name: "PDF to Word",
      icon: "📝",
      description: "Extract text from your PDF file and save it as an editable Word document.",
      supportedFormats: ".pdf",
      privacy: "Extracted entirely inside your browser.",
      status: "basic",
      releaseLabel: "Basic",
      limitations: "Best for simple files. Creates a real editable .docx from selectable PDF text. Complex layouts, scanned PDFs, tables, images, and multi-language documents may need manual review."
    },
    {
      id: "pdf-to-powerpoint",
      category: "convertFrom",
      name: "PDF to PowerPoint Visual Export",
      icon: "📊",
      description: "Create a real PowerPoint file where each PDF page becomes an image-based slide.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "basic",
      releaseLabel: "Beta",
      limitations: "This creates image-based slides to preserve the look of the PDF. Text may not be editable yet. This is a visual export, not an editable PowerPoint rebuild."
    },
    {
      id: "pdf-to-excel",
      category: "convertFrom",
      name: "PDF to Excel",
      icon: "📈",
      description: "Extract tables and rows out of PDF documents into an editable spreadsheet.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "basic",
      releaseLabel: "Basic",
      limitations: "Best for simple files. Creates a real .xlsx workbook with editable cells from detected text positions. Complex layouts, scanned PDFs, tables, images, merged cells, formulas, and multi-language documents may need manual review."
    },
    {
      id: "pdf-to-pdfa",
      category: "convertFrom",
      name: "PDF to PDF/A",
      icon: "🏛️",
      description: "Convert PDF documents to PDF/A for long-term archiving and legal compliance.",
      supportedFormats: ".pdf",
      privacy: "Processed locally.",
      status: "future",
      limitations: "PDF/A conformance requires compliance standard embedding (ICC Profiles, metadata headers). Full validator and encoder engine coming soon."
    },

    // --- Edit PDF Category ---
    {
      id: "add-watermark",
      category: "edit",
      name: "Add Watermark",
      icon: "🌊",
      description: "Stamp text watermark overlays on all pages with adjustable rotation, size, and opacity.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "active"
    },
    {
      id: "add-page-numbers",
      category: "edit",
      name: "Add Page Numbers",
      icon: "🔢",
      description: "Number PDF pages. Choose custom formatting, numbering ranges, fonts, and positions.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "active"
    },
    {
      id: "crop-pdf",
      category: "edit",
      name: "Crop PDF",
      icon: "📐",
      description: "Trim margin spacing or select specific bounding areas to crop page sizes.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "basic",
      limitations: "Applies basic page crop bounding box locally. Real-time visual canvas cropping fits best in desktop browsers."
    },

    // --- Security Category ---
    {
      id: "protect-pdf",
      category: "security",
      name: "Protect PDF",
      icon: "🔒",
      description: "Encrypt your PDF with a strong user-owned password to lock viewing access.",
      supportedFormats: ".pdf",
      privacy: "Encrypts locally. Your passwords never leave your browser.",
      status: "active"
    },
    {
      id: "unlock-pdf",
      category: "security",
      name: "Unlock PDF",
      icon: "🔓",
      description: "Remove password security and encryption from your PDF (requires you to supply the password).",
      supportedFormats: ".pdf",
      privacy: "Unlocks locally using standard encryption math in the browser.",
      status: "active"
    },
    {
      id: "sign-pdf",
      category: "security",
      name: "Sign PDF",
      icon: "✍️",
      description: "Draw or upload an image signature to stamp on specific pages.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser.",
      status: "basic",
      limitations: "Basic visual signature stamping. This tool does not embed legal digital certificates (PKI) or audit logs."
    },
    {
      id: "redact-pdf",
      category: "security",
      name: "Redact PDF",
      icon: "🟥",
      description: "Permanently scrub sensitive text strings or coordinates out of a document.",
      supportedFormats: ".pdf",
      privacy: "Processed locally.",
      status: "future",
      limitations: "True redaction requires wiping binary stream structures, not just drawing black rectangles (which can be bypassed). Safe redaction tool is coming soon."
    },

    // --- AI/Future Category ---
    {
      id: "ocr-pdf",
      category: "intelligence",
      name: "OCR PDF",
      icon: "👁️",
      description: "Run client-side Optical Character Recognition on scanned PDF documents to extract text.",
      supportedFormats: ".pdf",
      privacy: "Processed entirely inside your browser using Tesseract.js.",
      status: "basic",
      releaseLabel: "Beta",
      limitations: "Best for simple files. English OCR runs locally in the browser. Complex layouts, scanned PDFs, tables, images, and multi-language documents may need manual review. OCR accuracy depends on image clarity, resolution, and page rotation."
    },
    {
      id: "pdf-summarizer",
      category: "intelligence",
      name: "AI Summarizer",
      icon: "🧠",
      description: "Extract a summary, bullet points, and key metrics out of your PDF document using AI.",
      supportedFormats: ".pdf",
      privacy: "Requires consent. Uploads document content through secure, private Vendora ai-core endpoint.",
      status: "future",
      limitations: "Next-gen AI Tool. Undergoing privacy audits for secure corporate document scanning. Coming soon."
    },
    {
      id: "translate-pdf",
      category: "intelligence",
      name: "Translate PDF",
      icon: "🗣️",
      description: "Translate your PDF layout or raw text into a selected target language using secure AI engines.",
      supportedFormats: ".pdf",
      privacy: "Requires consent. Data sent to secure, private Vendora ai-core endpoint.",
      status: "future",
      limitations: "AI Layout Translation Tool. Currently under development."
    },
    {
      id: "compare-pdf",
      category: "intelligence",
      name: "Compare PDF",
      icon: "⚖️",
      description: "Review two PDF revisions side-by-side to highlight text shifts or drawing updates.",
      supportedFormats: ".pdf",
      privacy: "Processed locally.",
      status: "future",
      limitations: "Requires advanced visual canvas diff engine. Coming soon."
    },
    {
      id: "pdf-forms",
      category: "intelligence",
      name: "PDF Forms",
      icon: "📝",
      description: "Create, fill, edit, or extract interactive field form inputs inside PDFs.",
      supportedFormats: ".pdf",
      privacy: "Processed locally.",
      status: "future",
      limitations: "Interactive AcroForm fields support is currently being validated. Coming soon."
    }
  ]
};

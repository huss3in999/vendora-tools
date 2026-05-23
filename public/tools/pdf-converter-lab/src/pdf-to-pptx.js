(function () {
  "use strict";

  // Lab-only CDN dependency: this module expects PptxGenJS to be loaded globally
  // by index.html. It creates a real .pptx file, not a ZIP/HTML viewer.
  const RENDER_MAX_WIDTH = 1800;

  function ensurePptxGen() {
    if (window.PptxGenJS) {
      return window.PptxGenJS;
    }

    if (window.pptxgen) {
      return window.pptxgen;
    }

    if (window.pptxgenjs) {
      return window.pptxgenjs;
    }

    if (!window.PptxGenJS && !window.pptxgen && !window.pptxgenjs) {
      throw new Error("PptxGenJS is not loaded. Check the CDN script in the lab page.");
    }
  }

  function safeOutputName(fileName) {
    const baseName = (fileName || "converted")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim() || "converted";

    return `${baseName}-lab-real.pptx`;
  }

  function getSlideSizeFromViewport(viewport) {
    const widthInches = Math.max(4, Math.min(13.333, viewport.width / 72));
    const heightInches = Math.max(4, Math.min(13.333, viewport.height / 72));

    return {
      width: Number(widthInches.toFixed(3)),
      height: Number(heightInches.toFixed(3))
    };
  }

  async function renderPageToImage(page, slideSize) {
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = Math.min(2.5, Math.max(1, RENDER_MAX_WIDTH / baseViewport.width));
    const viewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      slideWidth: slideSize.width,
      slideHeight: slideSize.height
    };
  }

  async function convertPdfToPptx(file, options = {}) {
    if (!window.LabPdfDiagnostic) {
      throw new Error("PDF diagnostic module is not loaded.");
    }

    const PptxGenJS = ensurePptxGen();
    const pdf = await window.LabPdfDiagnostic.loadPdfFromFile(file);
    const firstPage = await pdf.getPage(1);
    const firstViewport = firstPage.getViewport({ scale: 1 });
    const slideSize = getSlideSizeFromViewport(firstViewport);

    const pptx = new PptxGenJS();
    pptx.author = "Vendora PDF Converter Lab";
    pptx.company = "Vendora";
    pptx.subject = "Lab PDF to PowerPoint conversion";
    pptx.title = `PDF to PPTX Lab - ${file.name}`;
    pptx.lang = "en-US";
    pptx.defineLayout({
      name: "PDF_PAGE",
      width: slideSize.width,
      height: slideSize.height
    });
    pptx.layout = "PDF_PAGE";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = pageNumber === 1 ? firstPage : await pdf.getPage(pageNumber);
      const rendered = await renderPageToImage(page, slideSize);
      const slide = pptx.addSlide();

      slide.background = { color: "FFFFFF" };
      slide.addImage({
        data: rendered.dataUrl,
        x: 0,
        y: 0,
        w: rendered.slideWidth,
        h: rendered.slideHeight
      });

      if (typeof options.onProgress === "function") {
        options.onProgress({
          pageNumber,
          pageCount: pdf.numPages
        });
      }
    }

    const fileName = safeOutputName(file.name);
    await pptx.writeFile({ fileName });

    return {
      fileName,
      pageCount: pdf.numPages,
      outputType: ".pptx",
      realPptx: true,
      conversionMode: "page-image-to-slide",
      editableContent: false
    };
  }

  window.LabPdfToPptx = {
    convertPdfToPptx
  };
})();

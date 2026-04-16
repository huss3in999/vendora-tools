# QR Menu Generator Map

This tool is powered by:

- [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/index.html)
- [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/styles.css)
- [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/app.js)

## Ownership Map

- Head SEO and analytics:
  - page title, meta tags, canonical, Open Graph, Google Analytics
  - these stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/index.html)
- Style system:
  - all layout, card, preview, export, support button, and mobile CSS live in [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/styles.css)
- Public page structure:
  - hero, QR form, live preview, export actions, bulk section, FAQ, CTA, and schema blocks stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/index.html)
- Calculator/runtime shell:
  - the main app lives in [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/app.js)
- Input and payload helpers:
  - `sanitizeHex(value, fallback)`
  - `getQrLabel()`
  - `getQrPayload()`
  - `getQrUrl(format, content)`
- Validation and conditional UI:
  - `setError(message)`
  - `updateVisibleFields()`
  - `applyPreviewFrameStyle()`
- Core QR rendering:
  - `renderQr()`
  - `removeLogo()`
- Demo and reset helpers:
  - `fillExample()`
  - `resetForm()`
- Export helpers:
  - `downloadFile(url, fileName)`
  - `getFileBaseName()`
  - `downloadPng()`
  - `downloadSvg()`
  - `downloadPoster()`
  - `copyLink()`
  - `testQr()`
  - `printQr()`
- Bulk workflow:
  - `generateBulkPreview()`
- Input wiring:
  - logo upload listeners, text input listeners, and render triggers at the end of the script block

## Editing Rules

- Treat these files as the source of truth for this tool:
  - [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/index.html) for page structure, SEO, analytics, and schema
  - [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/styles.css) for presentation and responsive behavior
  - [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/qr-menu-generator/app.js) for QR logic, rendering, export, and event wiring
- Preserve the browser-only workflow, QR preview behavior, export actions, and mobile layout unless the change explicitly improves them.
- If you add or remove QR modes, change export ownership, or significantly repurpose a section or helper, update this README in the same change.
- If a change affects shared patterns like support buttons, analytics, or landing-page tool discovery, update those connected files in the same change.

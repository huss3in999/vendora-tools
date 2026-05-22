# Vendora PDF Converter & Editor Toolkit

This is a premium, client-side PDF converter and editor suite designed for the Vendora platform. It is built to operate **100% in the user's browser**, ensuring absolute privacy and data security. No documents are ever uploaded to any server.

## Architecture

The toolkit is designed as a modular, single-page application (SPA) with a high-end dark glassmorphic dashboard listing all 32 PDF tools. When a tool is selected, a dedicated workspace module opens in the browser. 

The architecture follows a strict decoupled design:
1. **Config Layer (`pdf-tools-config.js`)**: Defines the metadata, categories, features, and availability of all 32 tools.
2. **Analytics Layer (`pdf-analytics.js`)**: Provides a zero-leak, GDPR-compliant event tracker connected to Vendora's Google Analytics setup.
3. **Core Engine Layer (`pdf-engine.js`)**: Coordinates dynamic CDN library loading and encapsulates browser-safe PDF processing operations.
4. **UI Controller (`pdf-converter.js`)**: Handles DOM operations, tool state transitions, drop zones, custom tool inputs, drag-and-drop page sorting canvas, and error boundaries.
5. **Styles CSS (`pdf-converter.css`)**: Implements glassmorphism card layouts, grid systems, interactive upload areas, page thumbnail displays, drag-and-drop animations, and dark forms.
6. **Main Hub Markup (`index.html`)**: Features SEO schema metadata, responsive layout wrapper, hero headers, tools grids, a search-and-filter system, FAQs, and why-us sections.

## Chosen Browser-Safe Libraries

To maintain a fast initial page load, these libraries are loaded dynamically only when a corresponding active tool is opened:

1. **`pdf-lib` (v1.17.1)**: Loaded for structural PDF manipulations including Merging, Splitting, Page Removal, Page Extraction, Page Rotation, Watermarking, Adding Page Numbers, and Password Encryption. Chosen for its complete client-side execution, stability, and zero exterior calls.
2. **`pdfjs-dist` (v3.11.174)**: Loaded for rendering PDF documents to Canvas context to support page previews, thumbnails, and rendering PDF pages to high-resolution JPEG/PNG images (PDF to JPG conversion).
3. **`jsPDF` (v2.5.1)**: Used to compose, scale, compress, and compile images (JPG, PNG, WebP, SVG) into a single PDF document (Image to PDF).
4. **`jszip` (v3.10.1)**: Leveraged to pack multiple rendered page JPEGs into a single, downloadable `.zip` archive client-side, avoiding dozens of individual file download popups.

## Privacy & Security Guarantees
- **Zero Uploads**: All file parsing, decoding, modifying, rendering, and downloading happen locally in memory.
- **GDPR & Privacy Native**: File names, raw texts, document contents, and metadata are **never** logged, cached, or transmitted.
- **Zero-Leak Analytics**: We only track interaction events (e.g., tool views, conversion success/error) without passing any custom variables detailing the files themselves.

## Development & Maintenance
To update the tool listing, categories, or tool capabilities, modify the `pdf-tools-config.js` file. The UI and engine automatically reflect any status, icon, or metadata changes declared in the config.

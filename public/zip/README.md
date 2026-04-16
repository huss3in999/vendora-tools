# Vendora Shift Scheduler (Rota Builder)

Staff scheduling in the browser. Data is saved in **localStorage** on each device (export JSON backups from **Setup** or **Download Backup** in the header).

## Local development

```bash
npm install
npm run dev
```

## Production build (Cloudflare Pages)

```bash
npm install
npm run build
```

Publish the **`dist/`** folder (or connect this repo in Cloudflare with build command `npm install && npm run build` and output directory **`dist`**). See **`DEPLOY-CLOUDFLARE.txt`** for dashboard steps.

If you deploy the whole **`zip/`** tree as static files (for example under `/zip/` on your site), run **`npm run build`** and commit **`dist/`** plus the generated root **`index.html`**. The root `index.html` points at **`./dist/assets/…`** (no `/src/main.tsx`, which would 404 on a static host). Local development uses **`index.vite.html`**; the Vite config copies it to `index.html` whenever you run **`npm run dev`** or **`npm run build`**.

Optional typecheck: `npm run lint` (`tsc --noEmit`).

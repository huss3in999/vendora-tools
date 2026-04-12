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

If you deploy the whole **`zip/`** tree as static files (for example under `/zip/` on your site), **commit and upload `dist/`** after each `npm run build`. The root `index.html` is only for local `npm run dev`; in production it redirects browsers to **`dist/`** so the bundled app loads instead of the missing `/src/main.tsx` dev entry.

Optional typecheck: `npm run lint` (`tsc --noEmit`).

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

Optional typecheck: `npm run lint` (`tsc --noEmit`).

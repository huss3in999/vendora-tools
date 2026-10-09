# Vendora Smart Journey private preview

This preview serves the existing Vendora transport HTML, CSS, logo, imagery and booking scripts with one added route component. Production source and deployments are unchanged. Arabic and English retain their own canonical URLs and metadata. Preview HTML and response headers are noindex; this is not access control, so keep hosting local or protect a hosted preview with Cloudflare Access.

From this directory:

```powershell
npm start
```

- Arabic: http://127.0.0.1:8791/bahrain-saudi-gcc-transport/bahrain-to-dammam/
- English: http://127.0.0.1:8791/bahrain-saudi-gcc-transport/en/bahrain-to-dammam/

The server binds only to loopback. It serves existing pages and assets and injects `component.js` and `component.css`. The snapshot endpoint uses the shared `providers.mjs` adapter. No traffic polling occurs. Traffic is unknown unless approved direction-specific measurements pass coverage checks. Map and routing require authorized credentials and billing. MET Norway forecasts are real, identified, attributed and cached until expiry. Provider failures preserve booking links. Reviews GET is read-only; every production POST is blocked in this preview. The browser's route sharing/copy actions use the production canonical URL, never the private preview URL.

```powershell
npm test
npm run verify:providers
npm run test:ui
node build.mjs
```

UI QA requires the preview server and the repository's existing `public/node_modules/@playwright/test` installation with Chromium. `artifacts/` contains verification JSON and Arabic/English mobile/desktop screenshots. Unit tests use explicitly synthetic fixtures, never user-visible traffic. No Google geometry is retained by the verification report.

`build.mjs` produces an isolated, ignored `dist/`. `wrangler.jsonc` is staging only, with no custom domains, cron, production D1, R2 or AI bindings. Build copies only transport static assets and the two Dammam pages; unrelated navigation destinations are not included in a hosted bundle. For complete site navigation use the local preview. Do not deploy until credential, cost, privacy and layout review are complete. A dry run is supported through `public/node_modules/wrangler/bin/wrangler.js`; no production config is modified.

`review-draft.mjs` separately prepares optional display names, strict integer ratings, route/language validation, bounded bodies, honeypot and same-origin writes around the existing Cloudflare moderation pipeline. It is intentionally not mounted in the preview or deployed. See the integration inventory for moderation and abuse controls still required before launch.

Actual secrets belong in ignored `.env` locally or Cloudflare secrets. Do not paste them into chat. Copy `.env.example` and supply values privately. Google browser credentials are inherently visible to browser clients: they must be a separate, tightly referrer/API-restricted credential, never a server secret. This preview keeps them out of source HTML, source control and logs. If no credential value may ever reach the browser, the JavaScript Maps API cannot be used; retain the keyless Google Maps link instead.

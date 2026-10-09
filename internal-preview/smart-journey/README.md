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

The owner approved a $5/month Google ceiling. The prepared local SQLite ledger reserves worst-case costs before every request, including verification requests: 200 map loads at $0.007 and 200 routes at $0.010 per UTC month ($3.40 maximum), at most 10 of each per day, with a separate $4 reservation ceiling. Free allowances are not needed for this estimate. Failed requests retain their reservation. Billing approval, verified API/key restrictions and verified provider quotas are all required. Browser keys can be reused outside this application ledger, so provider controls are still essential. The staging worker remains disabled for paid Google requests without an atomic budget binding; no remote budget infrastructure has been created.

Account verification on October 9, 2026: TomTom registration succeeded and its Freemium dashboard is accessible. An existing evaluation key was saved privately in ignored `.env`. Diagnostic probes at 15:34:27–15:34:31 UTC returned six measurement responses and two failures. The two requested direction labels currently use identical candidate coordinates; these results do not verify both carriageways. Customer traffic presentation remains disabled until road geometry, direction and evaluation-use permissions are confirmed. Google has an existing linked paid billing account on `my-swala-store`; creation of a dedicated project is blocked by the account project limit. Existing Firebase/Gemini keys were not reused or modified. No Google paid API call was made.

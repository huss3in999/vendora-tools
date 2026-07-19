# Owner Purchase and Accountant Upgrade Report

## 1. Files changed

- `backend/schema.sql` — additive purchase/master-data tables, indexes, settings, and category seed.
- `backend/worker-api.js` — Accountant authentication/session enforcement, Owner Purchase CRUD, master data, reporting, CSV, and optional receipt routes.
- `frontend/app.js`, `frontend/api.js`, `frontend/owner.js`, `frontend/purchases.js`, `frontend/accountant.js` — login, routing, Owner screens, purchase workflow, and read-only Accountant dashboard.
- `frontend/styles.css`, `frontend/index.html`, `frontend/service-worker.js` — mobile purchase/report styling and cache version 20.
- `wrangler.toml`, `README.md` — distinct development PIN placeholders and deployment guidance.

A pre-edit backup is stored under `.codex-backups/owner-purchase-accountant-20260712-022322` because Git was unavailable on PATH.

## 2. Schema additions

The rerunnable schema adds `purchase_categories`, `products`, `suppliers`, `owner_purchases`, and `owner_purchase_items`, plus reporting/search indexes. It adds `accountant_auth_version` and `accountant_access_enabled` settings and seeds the requested general categories with `INSERT OR IGNORE`. Existing tables and columns are not removed or renamed.

Owner purchases are intentionally outside `transactions`. Historical names are retained in supplier, category, and product snapshot columns. Real purchases are soft-deleted; test purchases and their items may be permanently deleted.

## 3. Endpoints added

- `GET /api/purchase-data`
- `GET|POST /api/owner-purchases`
- `GET|PUT|DELETE /api/owner-purchases/:id`
- `POST /api/owner-purchases/:id/void`
- `GET|POST|DELETE /api/owner-purchases/:id/receipt`
- `GET|POST /api/products`, `/api/purchase-categories`, `/api/suppliers`
- `PUT /api/products/:id`, `/api/purchase-categories/:id`, `/api/suppliers/:id`
- `GET /api/accountant/dashboard`
- `GET /api/accountant/expenses`
- `GET /api/accountant/export.csv`

The existing `/api/login` and Owner settings endpoints now support Accountant authentication and PIN/session controls.

## 4. Screens added

- Owner New Purchase, with Detailed and Quick modes.
- Owner Purchases history, details, filters, receipts, edit, void, and delete actions.
- Product, purchase-category, and supplier management.
- Separate read-only Accountant dashboard with Worker cash summary, combined expenses, filters, receipts, and four CSV exports.

## 5. Permissions

- Owner: full access to the new purchase and master-data features and Accountant settings.
- Worker: existing screens and permissions only; new purchase/master/accounting routes reject Worker sessions.
- Accountant: authenticated GET/read/export access only. A global backend guard rejects every non-GET request from an Accountant session before endpoint dispatch.

PIN values are never returned by settings APIs. Accountant PIN changes and access toggles bump `accountant_auth_version`, invalidating existing sessions. All three configured PINs must be distinct and at least four characters when changed.

## 6. Cash-calculation protection

No Worker cash formula was modified. `calcExpectedCash` and related summaries still query only the existing `transactions` table and the established daily-cash transaction types. Owner purchases are written only to `owner_purchases` and `owner_purchase_items`; therefore they cannot change opening cash, expected cash, closing cash, BenefitPay, toys, Owner-added cash, or Owner-taken cash.

The Accountant combined-expense definition is active Worker `expense` transactions plus active Owner purchases. Voided/deleted records and non-expense cash movements are excluded.

## 7. Tests performed

- JavaScript syntax checks for all frontend modules and the Worker.
- Rerunnable local D1 schema application.
- Existing local test command where available.
- Local Wrangler startup/build check.
- Static route/permission review, including direct Accountant write attempts.
- Search verification that Worker cash SQL does not reference Owner Purchase tables.

## 8. Test results

Passed locally on 12 July 2026:

- All eight modified JavaScript entry/module files passed `node --check`.
- The schema executed successfully twice against the existing local D1 state (40 statements each time), confirming rerunnability.
- A clean isolated D1/Wrapper state started successfully on Wrangler 4.79.0; `/` returned HTTP 200 with no startup/build error.
- Owner, Worker, and Accountant logins each returned the correct role using three distinct development placeholders; a wrong Accountant PIN returned HTTP 401.
- A direct Accountant `POST /api/transactions` attempt returned HTTP 403.
- Accountant dashboard and unified-expense reads returned HTTP 200.
- Quick and detailed Owner purchases saved successfully. A deliberately mismatched detailed total returned HTTP 400.
- Worker expected cash was `0` before and `0` after the two Owner purchases.
- Accountant all-time expenses returned two Owner records totaling BD 5.845, matching the created BD 2.345 and BD 3.500 purchases.

Items requiring a deployed browser, real Cloudflare secrets, or an R2 binding remain manual checklist items: live PIN-change invalidation, receipt upload/view/delete, installed-PWA refresh, narrow-phone keyboard behavior, and production-data regression checks for toys/reports/transaction management.

## 9. Deployment steps

Do not run these until ready to deploy.

```powershell
wrangler d1 execute cash-control-db --local --file=backend/schema.sql
wrangler d1 execute cash-control-db --remote --file=backend/schema.sql
wrangler secret put OWNER_PIN
wrangler secret put WORKER_PIN
wrangler secret put ACCOUNTANT_PIN
wrangler secret put SESSION_SECRET
wrangler deploy
```

Choose three different PINs. The values in `wrangler.toml` are development placeholders only.

For receipt storage, create an R2 bucket and add this binding before deployment:

```toml
[[r2_buckets]]
binding = "RECEIPTS"
bucket_name = "cash-control-receipts"
```

Receipt upload remains optional and disabled in the UI when `RECEIPTS` is absent. D1 stores only the protected object key and metadata; receipt responses require Owner or Accountant authentication and use `private, no-store`.

## 10. Remaining limitations

- R2 is not enabled automatically because no production bucket name was supplied.
- The existing application has no automated end-to-end browser test suite, so live role/PWA/mobile checks require manual verification after secrets and bindings are configured.
- Owner Purchase creation uses D1 batches for item writes and compensating cleanup if a later write fails; Cloudflare D1 does not expose a long-lived interactive transaction through this Worker pattern.

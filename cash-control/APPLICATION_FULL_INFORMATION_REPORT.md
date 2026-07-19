# Application Full Information Report

This report describes the application as inspected on 2026-07-12. It is based on the repository's actual source code. No live database records were created, edited, or deleted. Secret values and credentials are intentionally not reproduced.

## 1. Application summary

Cash Control is a private, English-language, mobile-first progressive web application for a food-cart business. It records and reports three separate kinds of money:

- daily physical cash held by the worker;
- BenefitPay sales, which are reported separately and do not change physical cash;
- toys/coin-machine collections, which have a separate running balance.

It has two shared identities, Owner and Worker, selected on the PIN login screen. Both can record operational money movements. The Owner additionally has transaction and closing management, CSV export, settings, PIN changes, test-data controls, and worker-access controls.

The application is a single-page application (SPA). Screens are JavaScript state names rather than distinct browser URLs: the browser remains on `/`, and direct non-file paths fall back to `index.html`.

## 2. Technology used

- Languages: JavaScript (browser ES modules and Cloudflare Worker), HTML, CSS, SQL, TOML, and JSON.
- Frontend: dependency-free HTML/CSS/JavaScript SPA in `frontend/`.
- Backend: one Cloudflare Worker module in `backend/worker-api.js`.
- Database: Cloudflare D1 (SQLite-compatible), bound as `DB`.
- Static hosting: Cloudflare Workers Static Assets, bound as `ASSETS`.
- Authentication: role-specific PIN comparison on the backend, followed by a custom HMAC-SHA-256 signed bearer token.
- PWA: web manifest, install prompt support, portrait/standalone configuration, icons, and a service worker.
- Browser storage: `sessionStorage` for token, role, and display name; in-memory response caching; Cache API for the PWA shell. Legacy authentication keys are actively removed from `localStorage`.
- Currency presentation: Bahraini dinar as `BD 0.000`.
- There is no `package.json`, build system, UI framework, ORM, external runtime library, or automated test suite in this repository.

## 3. How to start the application

Requirements documented by the project are Node.js 18+, Wrangler, a Cloudflare account, and a D1 database.

1. From the repository root, create/configure the D1 database if necessary: `wrangler d1 create cash-control-db`.
2. Put the returned database identifier in `wrangler.toml` under `[[d1_databases]]`. This repository already contains an identifier; it is not repeated here.
3. Initialize a local database with `wrangler d1 execute cash-control-db --local --file=backend/schema.sql`.
4. Configure non-placeholder PINs and a session-signing secret as Cloudflare secrets for deployment. The names used by the code are `OWNER_PIN`, `WORKER_PIN`, and `SESSION_SECRET`.
5. Start locally with `wrangler dev`, normally serving at `http://localhost:8787`.

For production, apply the schema with `--remote`, configure the same secrets using `wrangler secret put`, then run `wrangler deploy`. No compilation step exists: Wrangler runs `backend/worker-api.js` and serves `frontend/` as static assets.

Important startup caveat: the current repository configuration contains development/fallback PIN variables, and the code also has fallback values if settings/environment values are absent. Those values are intentionally not included in this report. Production safety depends on secrets/settings overriding them. The README's statement that active sessions remain valid after a PIN change is outdated: the current code increments a role-specific authentication version and invalidates existing sessions for that role.

## 4. Complete folder and file map

### Root

- `README.md`: setup, deployment, business-logic overview, endpoint summary, PWA notes, and troubleshooting. Some details lag behind the implementation.
- `wrangler.toml`: Worker name and entry point, compatibility date, assets binding, D1 binding, and fallback environment variables. It contains deployment-specific configuration and must be treated as sensitive configuration even though this report does not reproduce values.
- `wrangler-dev.out.log`, `wrangler-dev.err.log`, `wrangler-live.out.log`: runtime/development output files. They are not application logic and were not used as authoritative behavior or reproduced because logs can contain operational data.
- `APPLICATION_FULL_INFORMATION_REPORT.md`: this inspection report; the only file created by this task.

### `backend/`

- `worker-api.js`: entire server. It serves static assets, routes every API call, validates authentication and authorization, reads/writes settings, assigns business dates, performs balance calculations, runs transaction/closing CRUD, produces dashboards and CSV, and handles errors.
- `schema.sql`: creates the three database tables and indexes and seeds the two role metadata rows plus default settings/options.

### `frontend/`

- `index.html`: SPA shell, private/no-index metadata, PWA links, toast/loading containers, and module entry point.
- `app.js`: shared client state, formatting, login UI, PIN pad, router, logout, shared controls, PWA registration/install behavior, and cash-breakdown display helpers.
- `api.js`: authenticated API client, eight-second timeout, short-lived in-memory GET cache, request de-duplication, automatic cache invalidation after writes, session-expiry handling, and CSV download.
- `worker.js`: all Worker screens, forms, activity report, and event handlers.
- `owner.js`: all Owner screens, quick-entry prompts, reports, editing/void/deletion, closing management, toys, and settings.
- `styles.css`: responsive mobile-first visual design, fixed bottom navigation, forms, cards, reports, status badges, management tabs, loading/toast states, safe-area spacing, and limited larger-phone/tablet sizing.
- `service-worker.js`: caches the versioned application shell; navigation is network-first with offline shell fallback, static resources are cache-first, and `/api/` remains network-only.
- `manifest.json`: PWA name, icons, standalone portrait display, root scope/start URL, and theme colors.
- `robots.txt`: disallows all crawler paths.
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: PWA/install icons.

## 5. Current users and access

There are two current user types. They are fixed shared roles, not individually managed people.

### Owner

- Logs in through the Owner button and Owner PIN.
- Can open both owner and worker dashboard API data, although the normal UI uses the owner dashboard.
- Can create every supported transaction type through the API. The visible owner UI creates cash sales, expenses, owner-added cash, owner-taken cash, toy collections, and toy money taken. Code exists for BenefitPay and closing quick actions, but no visible owner-dashboard buttons currently expose those two handlers.
- Can list all transactions, filter/search them, edit active entries, void entries, delete entries, bulk void/delete, manage closings, export CSV, set today's opening cash through the API/UI cash-binding code, collect toys, change settings/options/PINs, disable worker access, and delete test data.

### Worker

- Logs in through the Worker button and Worker PIN, only while worker access is enabled.
- Can see the worker dashboard and read activity/toys/options.
- Can create cash received, expense/removal, owner-added cash, owner-taken cash, toy collection, and toy-money-taken records through visible forms.
- The backend permits a Worker to create `benefitpay_sale`, and a renderer/binder exists, but no visible navigation button leads to that screen.
- Can submit a day closing through the backend and a complete hidden/unlinked screen implementation exists, but no visible dashboard or bottom-navigation control leads to it.
- Cannot list the owner transaction-management endpoint, edit, void, delete, export, change settings/options, set opening cash, collect toys through the owner-only endpoint, or manage closings.

There are no Accountant, administrator-as-a-separate-role, supplier, customer, or per-employee account types. The `users` table contains only seeded metadata for Owner and Worker; login does not query it.

## 6. Login process

1. Opening `/` loads `index.html` and `app.js`.
2. If `sessionStorage` contains a role and token, the client immediately opens that role's dashboard. Otherwise it renders a PIN pad with “Login as Owner” and “Login as Worker.”
3. The numeric PIN input is visually masked, limited to 20 characters, and sent with the explicitly chosen role to `POST /api/login`.
4. The backend requires a role of exactly `owner` or `worker`. Worker login is rejected if worker access is disabled. It obtains PIN values first from `app_settings`, then environment bindings, then a development fallback.
5. If Owner and Worker PINs are identical, Worker login is refused; Owner login is still checked against the Owner PIN.
6. A successful login receives a base64-encoded token containing JSON session data (`userId`, role, name, expiry, and authentication version) plus an HMAC-SHA-256 signature. The signing secret comes from `SESSION_SECRET`, with a development fallback if missing.
7. The browser stores token, role, and name in `sessionStorage`, not persistent `localStorage`. The session therefore survives reloads in the same tab/session but is not intentionally persisted as a long-term local login.
8. Every protected request sends `Authorization: Bearer <token>`. The backend verifies the signature, 12-hour expiry, current role authentication version, and worker-access state.
9. A 401 clears client authentication and dispatches an `auth-expired` event. `app.js` listens for it, returns to login, and shows an expiry message.
10. Logout is client-side: it removes token/role/name and returns to login. There is no server logout endpoint or token revocation list.

PIN handling is comparison-based, not password hashing. PINs may be stored as plain text in the server-side `app_settings` table or supplied by Worker environment/secrets; actual PINs are never returned by settings APIs. Changing a Worker PIN or worker access invalidates Worker sessions; changing the Owner PIN (which requires the current Owner PIN) invalidates Owner sessions. Minimum new PIN length is four characters. There is no account registration, forgot-PIN/password reset, email, MFA, rate limiting, lockout, or default-admin creation beyond the fixed Owner seed/identity.

## 7. Complete page and screen map

All UI screens share browser route `/`; the “route” below is the internal SPA screen name.

| Screen | Internal route | Controller | Access and behavior |
|---|---|---|---|
| Login | `login` | `app.js` | Public. PIN pad, Owner login, Worker login. Saves session data after success. |
| Worker Dashboard | `worker-dashboard` | `worker.js` | Worker. Shows current physical cash breakdown, today/month/total expense figures, toys balance, test banner, logout, action buttons, activity link, and bottom nav. Reads `/api/dashboard/worker`. |
| Add Cash Received | `add-cash-sale` | `worker.js` | Worker. Required positive amount, optional note; saves `cash_sale`, returns to dashboard. |
| Add Expense / Removal | `add-expense` | `worker.js` | Worker. Required positive amount and option from configured Paid For/Company list; optional note; saves `expense`, returns to dashboard. |
| Owner Added Cash (Worker form) | `owner-added-cash-worker` | `worker.js` | Worker. Required amount and optional note; saves `cash_added_by_owner`. |
| Owner Took Cash (Worker form) | `owner-took-cash-worker` | `worker.js` | Worker. Required amount and optional note; saves `cash_taken_by_owner`; overdraw requires a prompted reason. |
| Add BenefitPay | `add-benefitpay` | `worker.js` | Worker renderer/binder exists but is not visibly linked. Amount and optional note; saves separate `benefitpay_sale`. |
| Close Day | `close-day` | `worker.js` | Worker renderer/binder exists but is not visibly linked. Shows expected cash, accepts nonnegative actual count and optional note, creates closing records, then shows difference and returns home. |
| Toys Money | `worker-toys` | `worker.js` | Worker. Shows all-time active toys balance and up to 20 of 100 returned history rows. Add form requires amount and source/machine; taken form requires amount; both allow note. |
| Activity Details | `worker-activity` | `worker.js` | Worker read-only report. Search, period, wallet, type, from/to date, Apply/Clear, summary totals, category summary, and rows. |
| Owner Dashboard | `owner-dashboard` | `owner.js` | Owner. Cash breakdown, operational totals, prompt-based quick actions, transactions/manage/export links, settings/toys, logout, bottom nav. Reads `/api/dashboard/owner`. |
| Transactions | `transactions` | `owner.js` | Owner report/manage list. Search and filters, summary/category totals, test-only option, row checkboxes, Edit/Void/Delete, bulk void/delete. |
| Manage Entries | `manage-entries` | `owner.js` | Owner. Tabs for Transactions and Closings. Transaction filters/actions plus closing void/delete management. |
| Edit Entry | `edit-entry` | `owner.js` | Owner. Active transaction amount, optional note, expense category when applicable, and mandatory edit reason. Saves in place and returns to prior list. |
| Cash Management | `owner-cash` | `owner.js` | Owner. Visible forms for cash taken from worker and cash added to worker. The binding also looks for an opening-cash form, but the current renderer does not include that form, so manual opening cash is not reachable on this rendered screen. |
| Owner Toys | `owner-toys` | `owner.js` | Owner. Shows toys balance/history; add toys money and take toys money forms. |
| Settings | `settings` | `owner.js` | Owner. PIN management, worker-access toggle, business-day start hour, notification preference, expense/company options, test-mode toggle, CSV export including test data, delete-all-test-data, and install-app control. |

### Popups and transient UI

- Owner quick actions use browser `prompt()` dialogs for amount, category/option, note, and overdraw reason.
- Void, edit, delete, bulk operations, test-data deletion, and PIN changes use combinations of forms, `prompt()`, and `confirm()`.
- Toasts show success/errors for three seconds; a full-screen spinner overlays network actions.
- An install prompt button becomes visible only if the browser emits `beforeinstallprompt` and the app is not already standalone.

The screen names do not change the address bar and browser history is not managed. Direct file requests serve their assets; unknown paths receive `index.html`.

## 8. Complete user journeys

### Worker journey

1. Open the application at its deployed root URL.
2. Enter the shared Worker PIN and press “Login as Worker.”
3. If enabled and valid, arrive at Worker Dashboard.
4. Review previous cash balance, today's cash received/expenses/owner movements, computed cash currently with worker, month/all-time expenses, and separate toys balance.
5. Choose Add Cash, Expense, Owner Added, Owner Took, or Toys from visible controls.
6. Enter the positive amount and relevant required metadata. Expense requires a configured Paid For/Company value. Toys added requires a source/machine name. Notes are optional.
7. Save. The client posts to the API; the server assigns the current Bahrain business date, wallet, test flag, creator name, and timestamp, then inserts into `transactions`.
8. Return to dashboard or remain on Toys. Subsequent dashboard reads aggregate active records and display recalculated totals.
9. Open Activity Details to search/filter previous active records. Worker rows are read-only.
10. Use the power icon to clear the browser session and return to login.

The code also supports unlinked Worker BenefitPay and closing screens. They are real render/bind implementations but are not part of the currently visible journey.

### Owner journey

1. Open the root URL, enter the shared Owner PIN, and choose Owner login.
2. Arrive at Owner Dashboard showing the same physical cash model from an owner perspective.
3. Record common entries through prompt-based quick actions or use dedicated Cash/Toys screens. Saves create the same ledger rows with `created_by = Owner`.
4. Open Transactions to filter/search all records and inspect summary totals. Edit active records with a mandatory reason, void them with a mandatory reason, or delete them. Test deletions are physical; real deletions are status changes.
5. Open Manage Entries to perform the same transaction controls and manage daily closing records.
6. Export transaction data to CSV.
7. Open Settings to manage PINs, worker access, business-day cutoff, notification preference, expense options, test mode, export including test rows, or delete test data.
8. Log out through the power icon.

## 9. Current worker process

The Worker is an operational cash recorder, not a separately named employee account. The Worker can:

- see the calculated physical cash that should be on hand;
- record cash received;
- record expenses/removals against a configured option;
- record that the Owner supplied or took physical cash;
- add toys collections and record toys cash taken;
- inspect active activity with filters and summaries;
- use installable PWA behavior.

Worker-created records are tagged only with the shared literal name `Worker`; there is no separation among multiple workers. The Worker cannot modify history. A withdrawal larger than available daily cash/toys is not absolutely blocked: the backend returns a 409 asking for a reason, and the UI retries with that reason appended to the note.

## 10. Purchases and expenses

The application has no formal purchase, purchase-order, invoice, supplier, product, line-item, quantity, unit-price, tax, or multi-item model. A “purchase” is represented only as one `expense` transaction.

Current expense process:

1. Worker uses Add Expense / Removal; Owner uses a quick prompt.
2. Amount must be a positive number. The UI uses three-decimal steps and a minimum of 0.001.
3. Paid For/Company is required and selected from `expense_options` stored as JSON in `app_settings`. Defaults include general expense labels; Owner can replace the list in Settings.
4. Note is optional.
5. The backend assigns wallet `daily_cash`, current business date, current test-mode flag, shared role name, and timestamp.
6. If the amount exceeds available daily cash by more than 0.0005 BD, a reason is required. That reason is appended to the note as an overdraw explanation.
7. The row appears in activity/transaction reports and reduces physical cash calculations while status is active.
8. Owner may edit amount/category/note with an edit reason, void it, or delete it. Any change is reflected by later aggregate queries.

No receipt photo, file attachment, product selection, supplier table, quantity, unit price, computed line total, or multiple items per expense exists.

## 11. Cash and balance handling

All authoritative calculations happen in backend SQL plus JavaScript arithmetic in `backend/worker-api.js`. Frontend code also calculates display-only “work day net cash” from dashboard values; it does not persist balances.

### Business date

`businessDateStr()` uses Bahrain time (`Asia/Bahrain`) and the configurable `business_day_start_hour` (default 16). Before the configured hour, an entry is assigned to the previous calendar date. This affects transactions, openings, dashboards, and closings.

### Physical daily cash

The implemented formulas are:

`Balance before a date = all earlier active cash sales + all earlier active owner-added cash - all earlier active expenses - all earlier active owner-taken cash + all earlier active corrections`

`Opening cash = manual opening setting for that business date, if present; otherwise balance before that date`

`Expected cash now = opening cash + today's active cash sales + today's active owner-added cash - today's active expenses - today's active owner-taken cash + today's active corrections`

The current `getOpeningCash()` returns `calcBalanceBeforeDate()` immediately. Code below that return that would have used the last actual closing is unreachable. Therefore, despite UI/README wording, a saved actual closing does **not** automatically become the next day's opening cash in the current implementation. Previous active transactions drive carry-forward unless a per-date manual opening setting exists.

`BenefitPay` is assigned wallet `benefitpay`, summed separately, and never included in physical cash formulas.

### Closing

`Closing difference = actual cash counted - expected cash`

Closing inserts one `daily_closings` row and one linked-by-date `closing_count` transaction. `closing_count` is not included in expected-cash calculations. Only one `daily_closings` row can exist per business date because of a UNIQUE constraint, regardless of later status.

### Toys

`Toys balance = all active toy collections - all active toy-collected-by-owner records`

The calculation is all-time, despite the endpoint/screen name containing “month.” Toys remain separate from daily cash and BenefitPay.

### Test and status effects

- Only `status = active` records affect balances.
- When test mode is off, `is_test = 1` records are excluded from dashboard/balance calculations.
- When test mode is on, both live and test active records are included; the UI explicitly warns that test records affect balances.
- Editing an active amount changes future sums immediately.
- Voiding or soft-deleting removes the row from active sums; hard-deleting test rows removes them entirely.
- A manual opening setting can override accumulated prior balance for that date. The setting note supplied by the API is not persisted.

## 12. Database documentation

The schema is applied from `backend/schema.sql` using Wrangler. `CREATE TABLE/INDEX IF NOT EXISTS` makes initialization repeatable, and `INSERT OR IGNORE` seeds fixed metadata/settings. There are no foreign keys, migrations folder, triggers, views, stored procedures, or ORM.

### `users`

Purpose: seeded role metadata only. Authentication currently does not query it.

| Field | Type/rules | Meaning |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Fixed seed IDs 1 Owner, 2 Worker. |
| `name` | TEXT NOT NULL | Display identity. |
| `role` | TEXT NOT NULL CHECK owner/worker | Role label. |
| `pin_key` | TEXT NOT NULL | Metadata key (`owner`/`worker`), not a PIN. |
| `status` | TEXT NOT NULL default `active`, CHECK active/inactive | Metadata status; not enforced by login. |
| `created_at` | TEXT NOT NULL default SQLite UTC `datetime('now')` | Automatic creation timestamp. |

No application CRUD endpoints manage this table. Duplicate role/name prevention is not defined beyond primary key IDs used by seed inserts.

### `transactions`

Purpose: main ledger for all money movements and closing-count audit rows.

| Field | Type/rules | Meaning |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Record identifier. |
| `business_date` | TEXT NOT NULL | Bahrain work-day date, normally `YYYY-MM-DD`. |
| `type` | TEXT NOT NULL CHECK enumerated values | `cash_sale`, `benefitpay_sale`, `expense`, `cash_taken_by_owner`, `cash_added_by_owner`, `closing_count`, `toy_collection`, `toy_collected_by_owner`, or `correction`. |
| `wallet` | TEXT NOT NULL CHECK | `daily_cash`, `benefitpay`, or `toys_monthly`; server derives it from type. |
| `amount` | REAL NOT NULL | Positive for normal transactions; closing amount can be zero. Correction creation is effectively positive through the generic create validator, though calculations would accept signed stored values. |
| `category` | TEXT optional | Expense option, toys source, or `Day closing`. |
| `note` | TEXT optional | User note and possibly appended overdraw explanation. |
| `status` | TEXT NOT NULL default `active`, CHECK | `active`, `voided`, or `deleted`. |
| `is_test` | INTEGER NOT NULL default 0 | Test marker (0/1). |
| `created_by` | TEXT NOT NULL | Shared session name, Owner or Worker. |
| `created_at` | TEXT NOT NULL default UTC datetime | Automatic creation time. |
| `updated_by` | TEXT optional | Owner name after edit/void/delete. |
| `updated_at` | TEXT optional | UTC modification timestamp. |
| `void_reason` | TEXT optional | Reason for void; soft delete stores a deletion marker here. |
| `edit_reason` | TEXT optional | Latest edit reason only. |

Indexes cover date, status, wallet, type, test flag, dashboard aggregation, and toys aggregation. There is no unique/duplicate-prevention rule for transactions and no direct foreign key to users or closings. `createTransaction()` inserts; dashboard/activity/report/toys/export functions read; Owner edit/void/delete and bulk functions update/delete.

Old real records are preserved on void and delete as status-marked rows. Test records are physically deleted by individual/bulk delete or Delete All Test Data. Editing overwrites current amount/category/note and keeps only the latest edit metadata; there is no separate immutable audit-history table.

### `daily_closings`

Purpose: end-of-day expected-versus-actual cash snapshots.

| Field | Type/rules | Meaning |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Closing identifier. |
| `business_date` | TEXT NOT NULL UNIQUE | Exactly one row can ever occupy a date unless physically deleted. |
| `opening_cash` | REAL NOT NULL default 0 | Computed opening at close time. |
| `expected_cash` | REAL NOT NULL | Computed physical cash at close time. |
| `actual_cash` | REAL NOT NULL | User-counted nonnegative cash. |
| `difference` | REAL NOT NULL | Actual minus expected. |
| `note` | TEXT optional | Closing note; void/delete annotations may be appended. |
| `status` | TEXT NOT NULL default `active`, CHECK | active/voided/deleted. |
| `is_test` | INTEGER NOT NULL default 0 | Test marker. |
| `closed_by` | TEXT NOT NULL | Shared role name. |
| `closed_at` | TEXT NOT NULL default UTC datetime | Closing timestamp. |
| `created_at` | TEXT NOT NULL default UTC datetime | Creation timestamp. |

`closeDay()` creates it and a `closing_count` transaction. Owner list/void/delete reads and changes it. Voiding/deleting a closing also changes matching active `closing_count` transactions by business date. Test closing deletion is physical; real closing deletion is soft. There is no update/edit closing function.

### `app_settings`

Purpose: dynamic key/value configuration.

| Field | Type/rules | Meaning |
|---|---|---|
| `key` | TEXT PRIMARY KEY | Setting name. |
| `value` | TEXT NOT NULL | String value; booleans use `0`/`1`, options use JSON. |
| `updated_at` | TEXT NOT NULL default UTC datetime | Automatically set by insert/upsert helper. |

Seeded keys are `test_mode`, `worker_access_enabled`, `notifications_enabled`, `business_day_start_hour`, `auth_version`, `owner_auth_version`, `worker_auth_version`, and `expense_options`. Runtime can add `owner_pin`, `worker_pin`, legacy login keys, and `opening_cash_YYYY-MM-DD` keys. Values are upserted, not versioned; old setting values are not preserved.

## 13. Reports and exports

### Worker Activity Details

- Access: Worker and Owner at API level; visible in Worker UI.
- Data: active transaction rows only.
- Filters: free-text search; all time/today/yesterday/week/month/quarter/year; wallet; transaction type; from/to date; test-only is supported by backend parameters although Worker UI does not expose a test-only checkbox.
- Search fields: type, wallet, category, note, business date, creator, and textual amount.
- Totals: count, positive/negative totals, net movement, expenses, cash sales, BenefitPay, owner added/taken, toys added/taken, and up to eight top expense categories. UI shows applicable summary cards and category summary.
- No print or export button.

### Owner Transactions

- Access: Owner only.
- Same underlying filters/search/summary as above, plus visible Test only checkbox.
- Default client filter is this month; backend accepts up to 1,000 rows, with default 500.
- Rows show type, amount sign/color, date/wallet/status/test, category, note, creator, update metadata, and active-entry controls.
- Also functions as a management report with bulk selection.

### Owner Manage Entries / Closings

- Transaction tab uses the transaction report controls.
- Closing tab lists up to 500 closings with opening, expected, actual, difference, date, status/test, note, and actions. The closing API supports status filtering, though the visible screen requests all with test rows.

### Dashboard reports

- Worker and Owner dashboards show current computed cash, today cash sales/expenses/owner movements, work-day net, month expenses, total expenses, separate toys balance, and a formula breakdown.
- Owner backend additionally returns today/month BenefitPay and last-closing details, although not all returned fields are visibly displayed.

### Toys report

- Access: both roles.
- Shows all-time active balance and up to 100 most recent active toys rows; UI displays a subset of 20 in Worker rendering and history in Owner rendering.
- No date filter, print, or dedicated export.

### CSV export

- Access: Owner only, from dashboard or Settings.
- Contains all non-deleted transaction rows, normally excluding test rows. Settings export explicitly includes test rows; dashboard export follows current test-mode flag.
- Columns: created time, business date, type, wallet, amount, category, note, creator, status, and test flag.
- Order: newest creation first.
- Proper CSV quote escaping is performed. File downloads as a dated `.csv`.
- Export filters are limited to include/exclude test; UI report search/date/type filters are not passed into export.
- There is no PDF, spreadsheet-native, backup archive, or print-specific report.

## 14. Products, categories and suppliers

- Products: do not exist.
- Formal categories table: does not exist.
- Suppliers/companies table: does not exist.
- Expense Paid For/Company options: exist as one JSON array under `app_settings.expense_options`. The Owner edits a newline-separated textarea; server trims, de-duplicates, limits each value to 80 characters, requires at least one option, and limits the list to 100.
- A selected expense option is copied as plain text into `transactions.category`. Changing the settings list does not modify historical rows.
- Toys source/machine names are typed freely and copied into `transactions.category`; there is no machine master list.

## 15. Receipts and file uploads

There is no receipt/image/document upload implementation, API, database field, object-storage binding, file picker, preview, display, or deletion behavior. CSS defines a `.placeholder-upload` style, but no current screen uses it. The PNG files in `frontend/` are application icons, not user uploads.

## 16. Edit and delete behaviour

- Only Owner can edit. Only active transactions can be edited.
- Edit allows amount, note, and category; category control is shown for expenses. Edit reason is mandatory. Amount must remain positive.
- Transaction type, wallet, business date, creator, creation time, and test flag cannot be changed through edit.
- Edit writes `updated_by`, `updated_at`, and latest `edit_reason`; it does not create a revision row.
- Void requires a reason and changes status to `voided`, stores reason/updater/time. If the row is `closing_count`, the matching active `daily_closings` record is also voided and annotated.
- Delete of a test transaction physically removes it. Delete of a real transaction changes status to `deleted`, records Owner/time, and stores a deletion marker. Corresponding closings are deleted/soft-deleted when the transaction is a closing count.
- Bulk void/delete performs the same broad status behavior per selected row. Bulk operations are sequential and not wrapped in a database transaction.
- Closing void requires a reason and also voids matching active closing-count transactions. Closing delete physically deletes test rows and matching transactions; real rows and matching transactions become `deleted`.
- A voided closing still occupies the UNIQUE business date, so another close for that date cannot be inserted unless that closing is physically deleted. This is confirmed by schema/code; no UI restore function exists.
- Because reports and balances query current active rows, edits/voids/deletes recalculate on the next uncached request. Client write calls clear its in-memory cache.

## 17. Validation and error handling

### Validation

- Login requires PIN and explicit valid role.
- New transaction requires a recognized type and finite positive amount.
- Wallet is server-derived; unsupported types are rejected.
- Workers cannot create `correction` through generic transaction creation; all other recognized types, including `closing_count`, are accepted for either authenticated role at API level. The visible closing workflow normally uses `/api/closing`, which creates both coordinated closing records.
- Expense category is required; it is normalized as text but the backend does not require that it remain in the current option list.
- Toys source is required by the visible add form and stored as category; generic backend validation does not separately require it.
- Withdrawals over available daily/toys balance require an overdraw reason; tolerance is 0.0005 BD.
- Closing requires nonnegative actual cash and rejects a date that already has an active closing before the database UNIQUE rule is encountered.
- Edit/void reasons are mandatory; new PINs are at least four characters and Owner/Worker PINs must differ.
- Business start hour must be an integer from 0 through 23.
- Transaction table has no duplicate prevention; closing date has database uniqueness.

### Error behavior

- API routing is wrapped in `try/catch`; known errors carry 4xx status and message, unknown errors return JSON 500.
- Unknown APIs return 404 JSON. Missing/invalid sessions return 401; owner-only failures return 403.
- Client requests time out after eight seconds with a connection-oriented message.
- Forms catch API errors and show toast messages. Buttons/forms are generally re-enabled in `finally` blocks where loading overlays are used.
- Dashboard/load failures display a toast; no durable offline write queue or retry mechanism exists.
- Static service-worker cache can open the UI offline, but APIs are network-only, so records and live reports cannot operate offline.
- The API logs performance timings to console, and the client logs endpoint/cache timing. There is no external monitoring/error-reporting integration in the repository.

## 18. Mobile usability

The application is explicitly phone-first:

- responsive viewport includes `viewport-fit=cover`, prevents zoom, and supports safe areas;
- touch-sized PIN pad, large amount inputs, decimal/numeric input modes, cards, and fixed bottom navigation;
- layout is portrait standalone in the manifest;
- grids collapse to two columns at 430 px and center with a 480 px maximum for selected dashboard areas on larger devices;
- installed PWA shell is cached and launches from `/`;
- both logged-in roles register the service worker and can receive the install control when supported.

No physical-device/browser test was performed. Therefore exact behavior for iOS install prompts, Android browser variants, virtual keyboards, accessibility zoom, and very small/landscape screens could not be confirmed. The CSS/manifest show intended behavior only.

## 19. Existing admin controls

Current Owner controls:

- transaction search/filter/edit/void/soft-or-hard delete;
- bulk void and bulk delete;
- closing list/void/delete;
- physical cash added/taken entries;
- toys add/take entries;
- CSV export, optionally including test records;
- test-mode enable/disable and permanent deletion of all test transactions/closings;
- configurable expense Paid For/Company list;
- Worker login enable/disable;
- Owner and Worker PIN change;
- business-day start hour;
- notification preference flag;
- manual opening cash backend capability (and binding code), but no currently rendered form exposing it.

Not available: individual user management, product/category/supplier masters, receipt management, imports, restore, full application reset, live-data bulk purge, test-data preview before deletion, audit-log viewer beyond metadata on rows, backup scheduler, role creation, password recovery, notification delivery implementation, or database administration UI.

## 20. Security observations

Factual current setup:

- API authorization is enforced server-side; Owner-only actions are not protected only by hidden buttons.
- Tokens are HMAC-SHA-256 signed, expire after 12 hours, and are revalidated against role authentication versions.
- Client authentication is in `sessionStorage`; legacy `localStorage` authentication keys are removed.
- PIN values are not embedded in frontend JavaScript and are not returned by settings endpoints.
- PINs are compared as plain strings and can be stored as plain text in D1 settings. They are not hashed/salted.
- A development fallback session secret and fallback PIN behavior exist if configuration is missing.
- No brute-force rate limit, failed-login counter, lockout, CAPTCHA, MFA, CSRF token, or origin check is implemented. Bearer-token authentication reduces ordinary form-CSRF exposure, but possession of a token grants its role.
- HMAC comparison uses normal string comparison rather than an explicit constant-time comparison.
- User-entered values rendered into transaction/history HTML are not consistently escaped in all renderers; filter values use an escaping helper. This report does not evaluate exploitability against a deployed environment.
- UI values are masked during login; actual secrets are not logged intentionally by application code.
- `noindex` metadata and `robots.txt` discourage indexing but are not access control.
- Static SPA fallback means knowing a URL can load the login shell; protected data still requires a valid token.
- The fixed `users.status` field is not checked, so changing it alone would not disable a role.
- Notification setting is only stored preference; no push keys, subscription endpoints, or notification sender exist.

## 21. Data protection and backups

The repository contains no backup, restore, replication, snapshot, import, or recovery code. CSV export is the only user-facing data extraction and covers transactions only; it omits `daily_closings`, settings, and users and is therefore not a complete database backup. D1 platform-level backup/time-travel behavior and deployed operational procedures cannot be confirmed from this repository.

Preservation behavior:

- real transaction and closing “deletes” are soft status changes;
- voiding preserves rows and reasons;
- test deletes are permanent;
- Delete All Test Data permanently removes all test transactions and test closings;
- settings changes overwrite old values;
- edits overwrite transaction values and preserve only latest edit metadata.

No destructive live-data tests were run.

## 22. Important dependencies between features

- Every money form depends on `api.js`, the bearer session, `createTransaction()` or a specialized endpoint, the type-to-wallet map, business-date calculation, test-mode setting, and D1.
- Physical cash dashboard values depend on active daily-cash transaction types and optional per-date opening settings. BenefitPay, toys, and closing-count rows do not affect this balance.
- Expense and owner-taken entries can trigger the available-cash/overdraw-reason flow.
- Toys forms and report depend on the same `transactions` table but use `toys_monthly` and an all-time add-minus-take calculation.
- Editing, voiding, deleting, and test-data deletion change later dashboard/report results because values are recomputed from status/current amounts.
- Closing management is coupled to `closing_count` transactions by type and `business_date`, not a foreign key.
- Test mode controls the marker assigned to new transactions/closings and whether dashboards include test rows.
- Worker-access/PIN settings change authentication versions, causing existing role sessions to fail later validation.
- Business-day start hour changes which date new entries receive and which records are treated as “today.”
- Expense options affect future form selections; historical categories are copied values and remain unchanged.
- Service-worker cache version query strings must match shell assets; APIs deliberately bypass offline cache.

## 23. Files connected to each major feature

| Feature | Frontend files/functions | Backend routes/functions | Tables/settings |
|---|---|---|---|
| Login/session/logout | `index.html`; `app.js` `renderLogin`, `bindLogin`, `logout`; `api.js` token/request helpers | `POST /api/login`; `login`, `createSessionToken`, `getSession`, `hmacSign`, `getAuthVersion` | `app_settings` PIN/access/auth-version keys; environment secrets; seeded user IDs are embedded in session creation |
| Worker dashboard | `worker.js` `renderWorkerDashboard`, `loadWorkerDashboard`; shared `cashBreakdown`, `heroCashBlock` | `GET /api/dashboard/worker`; `getWorkerDashboard`, balance/sum helpers | `transactions`, `daily_closings`, `app_settings` |
| Owner dashboard | `owner.js` `renderOwnerDashboard`, `loadOwnerDashboard` | `GET /api/dashboard/owner`; `getOwnerDashboard` | same as above |
| Cash/BenefitPay/expense entries | `worker.js` form render/bind functions; `owner.js` quick/cash bindings; `api.js` transaction helpers | `POST /api/transactions`; `createTransaction`, `requireOverdrawReasonIfNeeded` | `transactions`; `app_settings.test_mode`, expense options, business hour |
| Activity/transactions reports | `worker.js` `renderWorkerActivity`; `owner.js` `renderTransactions`; `api.js` getters | `GET /api/activity`, `GET /api/transactions`; `applyTransactionFilters`, `transactionSummary`, list functions | `transactions` |
| Edit/void/delete/bulk | `owner.js` row renderers and binding functions; `api.js` CRUD/bulk helpers | PUT/POST/DELETE transaction routes; update/void/delete/bulk functions | `transactions`; conditionally `daily_closings` |
| Day closing | `worker.js` `renderCloseDay`, `loadCloseDay`; `api.js` `closeDay` | `POST /api/closing`; `closeDay` | `daily_closings`, `transactions` |
| Closing management | `owner.js` Manage Entries closing tab | `GET /api/closings`, void/delete closing routes | `daily_closings`, matching `transactions` |
| Toys | Worker/Owner toys renderers/binders; `api.js` toys helpers | `GET /api/toys/month`, `POST /api/toys/collect`, generic transaction POST; `calcToysBalance`, `getToysMonth`, `collectToys` | `transactions` |
| Settings/PIN/access | `owner.js` `renderAdminSettings`, `loadSettings`; `api.js` settings helpers | `GET/PUT /api/settings`; settings/auth helpers | `app_settings`, environment fallbacks |
| Expense options | Worker expense renderer; Owner settings textarea | `GET/PUT /api/expense-options`; option helpers | `app_settings.expense_options`; copied `transactions.category` |
| Opening cash | `owner.js` binding exists but rendered form absent; `api.js` `setOpeningCash` | `POST /api/opening-cash`; `setOpeningCash`, `getOpeningCash` | dynamic `app_settings.opening_cash_<date>` |
| Test data | Test badges/banners and Owner settings controls | settings update, `DELETE /api/test-data`, active filters | `transactions.is_test`, `daily_closings.is_test`, `app_settings.test_mode` |
| CSV | Owner dashboard/settings; `api.js` `exportCsv` | `GET /api/export.csv`; `exportCsv` | `transactions` |
| PWA/offline shell | `manifest.json`, `service-worker.js`, icons, `app.js` install helpers, `styles.css` | static `serveStatic` | Browser Cache API only |
| Deployment/schema | none | `worker-api.js` entry point | `wrangler.toml`, `schema.sql` |

## 24. Unclear or incomplete areas

- Live D1 contents, record volume, actual users of shared PINs, deployed custom domain, configured Cloudflare secrets, and production settings were not queried. The report documents schema and code behavior, not current production data.
- Logs were not treated as authoritative or reproduced to avoid exposing operational/private information.
- The application was not logged into because doing so would require real credentials and could expose live data.
- No create/edit/delete/close/settings action was tested because each can mutate D1.
- Mobile/PWA behavior was not tested on physical devices.
- Cloudflare platform backup/retention and external operational backups are outside the repository and cannot be confirmed.
- The notification preference has no delivery implementation in this code; whether an external system reads it cannot be confirmed.
- `getOpeningCash()` contains unreachable older closing-based carry-forward code after an unconditional return. The report describes the reachable behavior.
- `owner.js` binds an opening-cash form that its current Cash Management renderer does not output.
- Worker BenefitPay and Close Day screens and related handlers exist but have no visible navigation in the current Worker dashboard/bottom nav.
- Owner quick handlers exist for BenefitPay and Close Day, but their corresponding dashboard buttons are absent. A second owner action grid containing other controls is explicitly `hidden`.
- README endpoint/access summaries and some cash-carry wording do not fully match current code; this report prioritizes code.
- Repository change status could not be checked with Git because the current shell did not expose a `git` executable. File inspection showed no need to alter any existing application file.

## 25. Current application flow diagram

```text
Open root URL
  -> SPA login screen
  -> choose Owner or Worker and enter shared PIN
  -> backend validates role PIN/access
  -> 12-hour signed session token stored in sessionStorage

Worker
  -> Worker Dashboard
  -> view computed physical cash and separate toys balance
  -> add cash received
     OR add expense/removal
     OR record owner added/took cash
     OR add/take toys money
  -> backend assigns Bahrain business date, wallet, creator, and test flag
  -> insert transaction in D1
  -> dashboard/report re-aggregates active records
  -> Activity Details for read-only history
  -> logout clears browser session

Owner
  -> Owner Dashboard
  -> view computed balances/totals
  -> quick-record cash/expense/owner movements or use Cash/Toys screens
  -> Transactions / Manage Entries
     -> filter/search/summarize
     -> edit with reason, void with reason, or delete
     -> manage daily closings
  -> export transaction CSV
  -> Settings
     -> PINs, worker access, business-day time, notification preference,
        expense options, test mode, delete test data
  -> logout clears browser session

Physical cash formula
  -> prior active daily-cash movements (or manual opening override)
  + today's cash sales
  + owner-added cash
  - expenses/removals
  - owner-taken cash
  + corrections
  = expected cash with worker

BenefitPay -> separate wallet/reporting; no physical-cash effect
Toys -> all active collections - all active toys money taken; separate balance
```

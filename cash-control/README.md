# Cash Control

Private mobile-first PWA for managing daily food cart cash, BenefitPay sales, and toys coin collections. Built for Cloudflare Workers + D1.

**This app is private.** It includes `noindex` meta tags and `robots.txt` to block search indexing.

---

## Project Structure

```
cash-control/
├── frontend/           # Static PWA files (HTML, CSS, JS)
│   ├── index.html
│   ├── styles.css
│   ├── app.js          # Router, login, shared UI
│   ├── api.js          # API client
│   ├── worker.js       # Worker role screens
│   ├── owner.js        # Owner role screens
│   ├── manifest.json
│   ├── service-worker.js
│   └── robots.txt
├── backend/
│   ├── worker-api.js   # Cloudflare Worker API + static serving
│   └── schema.sql      # D1 database schema
├── wrangler.toml       # Cloudflare config
└── README.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/): `npm install -g wrangler`
- A Cloudflare account

---

## 1. Create the D1 Database

```bash
cd cash-control
wrangler d1 create cash-control-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cash-control-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

---

## 2. Run the Schema

Apply the database schema to your D1 database:

```bash
# Remote (production)
wrangler d1 execute cash-control-db --remote --file=backend/schema.sql

# Local (for wrangler dev)
wrangler d1 execute cash-control-db --local --file=backend/schema.sql
```

---

## 3. Set PINs and Session Secret

**Never use placeholder PINs in production.** Set real values as Cloudflare secrets:

```bash
wrangler secret put OWNER_PIN
# Enter your owner PIN when prompted (e.g. a 4-6 digit code)

wrangler secret put WORKER_PIN
# Enter your worker PIN when prompted

wrangler secret put SESSION_SECRET
# Enter a long random string (e.g. openssl rand -hex 32)
```

Secrets override the placeholder `[vars]` in `wrangler.toml`. PINs are verified on the server only — they are never embedded in frontend JavaScript.

### Changing PINs Safely

1. Run `wrangler secret put OWNER_PIN` or `wrangler secret put WORKER_PIN`
2. Enter the new PIN when prompted
3. Redeploy: `wrangler deploy`
4. All active sessions remain valid until they expire (12 hours) or users log out

---

## 4. Local Development

```bash
cd cash-control

# Apply schema locally first
wrangler d1 execute cash-control-db --local --file=backend/schema.sql

# Start local dev server
wrangler dev
```

Open the URL shown (usually `http://localhost:8787`).

Default dev PINs (from `wrangler.toml` vars):
- Owner: `CHANGE_ME_OWNER`
- Worker: `CHANGE_ME_WORKER`

---

## 5. Deploy to Cloudflare

```bash
cd cash-control

# Ensure remote schema is applied
wrangler d1 execute cash-control-db --remote --file=backend/schema.sql

# Set secrets (if not done already)
wrangler secret put OWNER_PIN
wrangler secret put WORKER_PIN
wrangler secret put SESSION_SECRET

# Deploy
wrangler deploy
```

Your app will be available at `https://cash-control.<your-subdomain>.workers.dev` (or your custom domain if configured).

### Optional: Custom Domain

Add to `wrangler.toml`:

```toml
routes = [
  { pattern = "cash.yourdomain.com", custom_domain = true }
]
```

---

## Business Logic Summary

### Expected Worker Cash

```
Opening Cash
+ Cash Sales
+ Cash Added By Owner
- Expenses
- Cash Taken By Owner
+ Corrections
= Expected Cash Now
```

Opening cash = previous day's actual closing count.

### BenefitPay

Recorded separately. Does **not** affect worker cash.

### Toys Monthly Balance

```
Toy Collections - Owner Collections = Toys Balance
```

Resets conceptually each month (filtered by current month).

---

## Test Mode

- Toggle in **Owner → Settings**
- When ON, new entries are marked `is_test = 1`
- Test entries show a yellow **TEST** badge
- Owner can **Delete All Test Data** from Settings
- Hard delete permanently removes test records from the database

---

## API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/login` | Public | PIN login |
| GET | `/api/dashboard/worker` | Worker/Owner | Worker dashboard data |
| GET | `/api/dashboard/owner` | Owner | Owner dashboard data |
| POST | `/api/transactions` | Worker/Owner | Create transaction |
| GET | `/api/transactions` | Any | List transactions |
| PUT | `/api/transactions/:id` | Owner | Edit entry |
| POST | `/api/transactions/:id/void` | Owner | Void entry |
| DELETE | `/api/transactions/:id` | Owner | Hard/soft delete |
| POST | `/api/closing` | Worker/Owner | Close day |
| GET | `/api/toys/month` | Any | Toys month summary |
| POST | `/api/toys/collect` | Owner | Owner collects toys |
| GET | `/api/export.csv` | Owner | Export CSV |
| GET | `/api/settings` | Any | Get settings |
| PUT | `/api/settings` | Owner | Update settings |
| DELETE | `/api/test-data` | Owner | Delete all test data |

---

## Security Notes

- `noindex, nofollow` meta tags on all pages
- `robots.txt` blocks all crawlers
- PINs stored as Cloudflare Worker secrets (server-side only)
- Session tokens are HMAC-signed with 12-hour expiry
- Owner-only actions enforced on the backend, not just hidden in UI
- Real records use void (not delete) by default

---

## Currency Format

All amounts display as **BD 0.000** (Bahraini Dinar, 3 decimal places).

---

## PWA Install

On Android (Samsung, etc.):
1. Open the app in Chrome
2. Tap the menu → **Add to Home screen**
3. The app opens fullscreen like a native app

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `database_id` error | Run `wrangler d1 create` and update `wrangler.toml` |
| Login fails | Check secrets with `wrangler secret list`; redeploy after setting |
| 401 after login | Set `SESSION_SECRET` secret and redeploy |
| Schema errors | Re-run `wrangler d1 execute ... --file=backend/schema.sql` |
| Day already closed | Owner must void the closing record in D1 directly (future feature) |

---

## License

Private use only. Not for public distribution.

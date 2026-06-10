# Vendora Branded Smart Links

A standalone Cloudflare Workers project for branded URL short links and smart landing previews.

## Domains

- Public short links: `https://go.getvendora.net/<slug>`
- Optional ultra-short links: `https://g.getvendora.net/<slug>`
- Creator/admin app: `https://links.getvendora.net/`

This project is separate from the existing Vendora website and Smart Page Platform. `smart.getvendora.net` belongs to the Smart Page Platform landing-page app.

## Features

- Branded short links with custom slugs
- Optional branded preview page before redirect
- Instant redirect mode
- Brand profile fields: name, logo URL, brand color, WhatsApp, Instagram, website
- Free no-login creation flow
- Anonymous rate limit: max 3 links per IP hash per day
- 30-day expiry for anonymous links
- KV auto-delete for expiring links
- Admin-selectable URL style: standard, ultra-short, or country-style Vendora path
- Legacy profile links like `/p/<slug>` redirect to the standard `https://go.getvendora.net/<slug>` form
- Admin-selectable expiry: never, 30 days, or 90 days
- Admin dashboard protected by `ADMIN_PASSWORD`
- Create, edit, deactivate, delete, search, filter links
- Copy short link and WhatsApp message
- QR code PNG download
- KV-backed analytics: total clicks, last click, daily clicks, country, referrer, device
- Turnstile-ready spam protection
- Mobile-first HTML/CSS/JS, no React required

## Storage

KV namespace binding: `LINKS_KV`

Keys:

- `link:{slug}` stores link JSON
- `analytics:{slug}` stores analytics summary
- `clicks:{slug}:{date}` stores daily click count
- `anon:{ipHash}:{date}` stores anonymous creation count

Example link JSON:

```json
{
  "slug": "vanilla-menu",
  "url": "https://example.com/menu",
  "brandName": "Vanilla Cafe",
  "brandLogo": "https://example.com/logo.png",
  "brandColor": "#2563eb",
  "redirectMode": "preview",
  "shortDomainMode": "vendora",
  "customDomain": "",
  "brandHandle": "cos",
  "countryCode": "bh",
  "countryUrlStyle": "vendora_path",
  "aliasSlug": "",
  "createdAt": "2026-04-30T00:00:00.000Z",
  "expiresAt": "2026-05-30T00:00:00.000Z",
  "active": true,
  "clicks": 0,
  "lastClickAt": "",
  "whatsapp": "+973...",
  "instagram": "https://instagram.com/brand",
  "website": "https://brand.com"
}
```

## Setup

Install dependencies:

```bash
npm install
```

Create KV namespace:

```bash
wrangler kv namespace create LINKS_KV
```

Copy the returned namespace `id` into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "LINKS_KV"
id = "YOUR_NAMESPACE_ID"
```

Add admin secret:

```bash
wrangler secret put ADMIN_PASSWORD
```

If this repo generated a local admin password for you, it is stored only on this machine in:

```text
.admin-password.local.txt
```

To show it locally:

```powershell
Get-Content .admin-password.local.txt
```

Optional Turnstile:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

Then set the public site key in `wrangler.toml`:

```toml
[vars]
TURNSTILE_SITE_KEY = "YOUR_SITE_KEY"
```

If `TURNSTILE_SECRET_KEY` is missing, local/free creation still works but the homepage shows a setup note. Add Turnstile before real public traffic.

Optional Google and Elastic trackers:

```bash
wrangler secret put GOOGLE_ANALYTICS_API_SECRET
wrangler secret put ELASTIC_API_KEY
```

Set `GOOGLE_ANALYTICS_MEASUREMENT_ID` and `ELASTIC_TRACKER_URL` in `wrangler.toml`. Every short-link click, including instant redirects created by customers, is forwarded server-side when those values are configured.

## Local Dev

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:8787/
http://127.0.0.1:8787/admin
http://127.0.0.1:8787/r/test-slug
```

## Tests

```bash
npm test
```

## Deploy

```bash
npm run deploy
```

Configured custom domains in `wrangler.toml`:

```toml
[[routes]]
pattern = "go.getvendora.net"
custom_domain = true

[[routes]]
pattern = "g.getvendora.net"
custom_domain = true

[[routes]]
pattern = "links.getvendora.net"
custom_domain = true
```

## URL Strategy

The platform supports three URL styles:

1. Standard Vendora short link:

```text
https://go.getvendora.net/brand-offer
```

2. Ultra-short Vendora link:

```text
https://g.getvendora.net/offer
```

3. Country-style Vendora path:

```text
https://go.getvendora.net/cos-bh-offer
```

Only working Vendora-hosted options are shown in the admin. Customer-owned domains are not selectable until DNS activation is implemented.

## Country-Style URL Options

The admin can generate a working country-style Vendora URL from:

- Brand handle, for example `cos`
- Country code, for example `BH`
- Link slug, for example `offer`

Working generated format:

```text
https://go.getvendora.net/cos-bh-offer
```

Important behavior:

- The admin does not show fake customer-owned domains such as `cos.bh` or `cos-bh.com`, because those require DNS ownership before they can work.
- `go.getvendora.net/cos-bh-offer` works immediately because it stays on the Vendora short domain.
- These options are stored per link in KV, so each link can choose a different URL style.

## Expiry and Storage Cleanup

Free public links expire after 30 days and are written to KV with a real KV expiration timestamp. That means Cloudflare removes the stored `link:{slug}` automatically after expiry.

Admin links can be set to:

- Never expire
- Auto-delete after 30 days
- Auto-delete after 90 days

Manual delete from admin removes:

- `link:{slug}`
- `analytics:{slug}`
- `clicks:{slug}:{date}` daily click keys

## Future Custom Customer Domains

Later Business plan support should use Cloudflare for SaaS / Custom Hostnames:

- `go.customerbrand.com/offer`
- `links.customerbrand.com/menu`

Suggested future structure:

- Store customer domain records in durable storage/D1.
- Validate hostname ownership through Cloudflare Custom Hostnames.
- Resolve incoming hostname to customer account/brand profile.
- Keep link slug resolution scoped per hostname.

## Security Notes

- Admin password is a Worker secret and is never sent to frontend JavaScript.
- Admin session cookie is HMAC-signed and `HttpOnly`, `Secure`, `SameSite=Lax`.
- Dangerous URLs are blocked: `javascript:`, `data:`, `file:`, localhost, loopback, and private LAN ranges.
- Anonymous creation is rate-limited by hashed IP and date.
- Analytics avoids storing raw IP addresses.

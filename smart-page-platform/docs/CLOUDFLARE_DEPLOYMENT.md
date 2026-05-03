# Cloudflare Deployment Guide

This guide prepares the Phase 1 `smart-page-platform` Worker for Cloudflare deployment without enabling Phase 2 features.

## Current Cloudflare config

`wrangler.toml` defines one Worker and one D1 binding:

```toml
name = "smart-page-platform"
main = "./build/server/index.js"
compatibility_date = "2026-04-23"

[assets]
directory = "./build/client"

[[d1_databases]]
binding = "DB"
database_name = "smart-page-platform"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "./migrations"
```

The application code reads the D1 database from the `DB` binding. Keep this binding name unchanged unless you update `app/modules/db/db.server.ts` and every deployment environment together.

## Required Cloudflare bindings and secrets

Required Worker bindings:

- `DB`: Cloudflare D1 database binding used by auth, sessions, pages, analytics, admin, and settings.

Required production Worker secret:

- `SESSION_SECRET`: long random string used to sign session cookies.

Seed-only environment variables, used by `scripts/seed-super-admin.mjs` and not required at runtime:

- `SPP_ADMIN_EMAIL`
- `SPP_ADMIN_NAME`
- `SPP_ADMIN_PASSWORD`
- `SPP_D1_DATABASE` optional; defaults to `smart-page-platform`

## Create the D1 database

```bash
npx wrangler d1 create smart-page-platform
```

Cloudflare will print a database id. Copy that value into `wrangler.toml`:

```toml
database_id = "<REAL_DATABASE_ID>"
```

## Run local migration

```bash
npm run db:migrate:local
```

## Run remote migration

After `database_id` is replaced:

```bash
npm run db:migrate:remote
```

## Seed super admin locally

PowerShell:

```powershell
$env:SPP_ADMIN_EMAIL="admin@example.com"
$env:SPP_ADMIN_NAME="Platform Admin"
$env:SPP_ADMIN_PASSWORD="replace-with-a-long-random-password"
npm run seed:super-admin -- --local
```

## Seed super admin remotely

PowerShell:

```powershell
$env:SPP_ADMIN_EMAIL="admin@example.com"
$env:SPP_ADMIN_NAME="Platform Admin"
$env:SPP_ADMIN_PASSWORD="replace-with-a-long-random-password"
npm run seed:super-admin -- --remote
```

## Set production session secret

Use a long random value. Do not commit it.

```bash
npx wrangler secret put SESSION_SECRET
```

## Run local dev

```bash
npm run db:migrate:local
npm run cf:dev
```

## Build and deploy

```bash
npm run typecheck
npm run build
npm run test
npm run cf:deploy
```

## Verify production after deploy

- Open `/healthz` and confirm it returns `ok`.
- Log in with the seeded super admin and open `/admin`.
- Confirm `/admin/users`, `/admin/tenants`, and `/admin/pages` load.
- Sign up as an owner and confirm `/app` loads.
- Create a page, add a block, save, publish, and copy the short link.
- Open `/p/:code` in a logged-out/private browser and confirm the page renders.
- Click a public link/WhatsApp block and confirm analytics appear in `/app/analytics`.
- Confirm a normal owner is redirected away from `/admin`.

## Final Phase 1 launch checklist

- [ ] `npm run typecheck` passes locally.
- [ ] `npm run build` passes locally.
- [ ] `npm run test` passes locally.
- [ ] `npm run db:migrate:local` passes locally.
- [ ] Remote D1 database is created in Cloudflare.
- [ ] Real D1 `database_id` is copied into `wrangler.toml`.
- [ ] `SESSION_SECRET` is set with `wrangler secret put SESSION_SECRET`.
- [ ] `npm run db:migrate:remote` completes successfully.
- [ ] Super admin is seeded remotely.
- [ ] Super admin login is verified.
- [ ] Owner signup is verified.
- [ ] Page create/save/publish is verified.
- [ ] Public `/p/:code` rendering is verified.
- [ ] Admin pages are verified.
- [ ] Analytics page view and click tracking are verified.

# D1 migrations

Phase 1 uses Cloudflare D1 as the durable relational store. Apply migrations locally before running Wrangler against the Worker runtime:

```bash
npm run db:migrate:local
```

After creating a real Cloudflare D1 database, replace the placeholder `database_id` in `wrangler.toml`, then apply remotely:

```bash
npx wrangler d1 migrations apply smart-page-platform --remote
```

## Super admin seed guidance

Do not commit production passwords or password hashes. Seed one admin with environment variables:

```bash
$env:SPP_ADMIN_EMAIL="admin@example.com"
$env:SPP_ADMIN_NAME="Platform Admin"
$env:SPP_ADMIN_PASSWORD="replace-with-a-long-random-password"
npm run seed:super-admin -- --local
```

Use `--remote` instead of `--local` after the real Cloudflare D1 database is configured. The seed script hashes the password before inserting the user.

## smart-page-platform (Phase 1)

Foundation for a Cloudflare-hosted, multi-tenant SaaS that lets small businesses create "smart pages" (landing pages / mini-sites).

### What's included in Phase 1
- D1-backed authentication, sessions, and role protection
- Owner workspace dashboard and settings
- Super admin read-only management dashboard
- Real page creation, block saving, publish/unpublish, and public rendering
- Short links through `/p/:code`
- Basic page view and click analytics
- Cloudflare D1 schema/migrations for the durable backend foundation

### What's explicitly not included (by design)
- Payments, subscriptions
- Custom domains
- Products, bookings, forms
- Advanced AI, automation

### Local dev
```bash
npm install
npm run db:migrate:local
npm run cf:dev
```

### Seed one super admin
```powershell
$env:SPP_ADMIN_EMAIL="admin@example.com"
$env:SPP_ADMIN_NAME="Platform Admin"
$env:SPP_ADMIN_PASSWORD="replace-with-a-long-random-password"
npm run seed:super-admin -- --local
```

### Tests
```bash
npm run typecheck
npm run build
npm run test
```

The default Playwright smoke tests do not require a running server. Full browser E2E coverage is scaffolded in `tests/phase1-e2e.spec.ts`; see `tests/TEST_PLAN.md` for local Cloudflare/D1 setup.

### Cloudflare deployment checklist
For the full deployment runbook, see `docs/CLOUDFLARE_DEPLOYMENT.md`.

1. Create a Cloudflare D1 database named `smart-page-platform`.
2. Copy the real D1 `database_id` into `wrangler.toml` under the `DB` binding.
3. Set the production session secret:

```bash
npx wrangler secret put SESSION_SECRET
```

4. Run remote migrations:

```bash
npm run db:migrate:remote
```

5. Seed one super admin without committing secrets:

```powershell
$env:SPP_ADMIN_EMAIL="admin@example.com"
$env:SPP_ADMIN_NAME="Platform Admin"
$env:SPP_ADMIN_PASSWORD="replace-with-a-long-random-password"
npm run seed:super-admin -- --remote
```

6. Build and deploy:

```bash
npm run typecheck
npm run build
npm run test
npm run cf:deploy
```

7. Verify deployment:
- Log in as super admin and open `/admin`.
- Sign up or log in as an owner and open `/app`.
- Create, save, publish, unpublish, and republish a page.
- Open the published `/p/:code` URL in a logged-out browser.
- Confirm analytics events appear after a page view and button click.

### Phase 1 readiness checklist
- [x] D1 migration applies locally.
- [x] Auth uses hashed passwords.
- [x] Sessions are database-backed and expire.
- [x] `/app` requires a logged-in user.
- [x] `/admin` requires `super_admin`.
- [x] Owner page and analytics queries are workspace-scoped.
- [x] Draft/unpublished pages do not render publicly.
- [x] Analytics avoids raw IP storage.
- [x] TypeScript check passes.
- [x] Production build passes.
- [ ] Replace placeholder D1 `database_id` before remote deploy.
- [ ] Set `SESSION_SECRET` as a Cloudflare Worker secret.
- [ ] Run remote D1 migrations.
- [ ] Seed one super admin with a strong password.
- [ ] Verify owner signup, page publishing, `/p/:code`, admin, and analytics in production.
- [ ] Run manual QA from `tests/TEST_PLAN.md` against the deployed Worker.
- [ ] Rotate the seeded super admin password after first login.

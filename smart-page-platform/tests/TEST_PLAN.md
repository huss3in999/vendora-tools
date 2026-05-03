# Phase 1 QA test plan

## Prerequisites

```powershell
npm install
npm run db:migrate:local
npm run cf:dev
```

For full browser E2E tests in a separate terminal:

```powershell
$env:PLAYWRIGHT_E2E="1"
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:8787"
npm run test
```

## Manual QA coverage

- Logged-out users visiting `/app` and `/admin` redirect to `/login`.
- Owner signup creates a user, workspace, membership, and session.
- Owner login lands in `/app`.
- Owner cannot access `/admin`.
- Owner cannot edit another workspace page by changing the page id in the URL.
- Owner analytics only show their workspace events.
- Page creation handles missing title with an inline error.
- Page editor rejects invalid/missing block fields and keeps current client state.
- Saving a valid block persists after reload.
- Reordering blocks persists after reload.
- Publishing creates one active short link.
- Unpublishing hides the public page.
- Archived pages do not render publicly.
- Public page analytics failure does not block rendering.
- Seeded super admin can access `/admin`, `/admin/users`, `/admin/tenants`, and `/admin/pages`.

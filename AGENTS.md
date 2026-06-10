# Vendora Project Boundaries

These folders are separate production Cloudflare projects. Do not merge their domain routes, environment variables, or URL responsibilities.

## Domain Ownership

- `smart-page-platform` owns `smart.getvendora.net`.
  - This is the Smart Page Platform landing-page app.
  - Customer public pages live at `https://smart.getvendora.net/p/<code>`.
  - Examples that must keep working: `/p/al-maryah-abu-dhabi` and `/p/dubai-mall-uae`.

- `vendora-branded-smart-links` owns only the short-link/admin domains:
  - `go.getvendora.net`
  - `g.getvendora.net`
  - `links.getvendora.net`

Never add `smart.getvendora.net`, `SMART_ORIGIN`, or a `smart` short-domain mode back into `vendora-branded-smart-links`. Doing that sends Smart Page Platform customer landing pages to the shortener app, where they can show expired/not-found errors.

Before deploying either project, verify the relevant checks:

- `vendora-branded-smart-links`: run `npm run check` and `npm test`
- `smart-page-platform`: run `npm run build` and `npm run typecheck`

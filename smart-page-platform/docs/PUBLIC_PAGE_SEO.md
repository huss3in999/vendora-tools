# Public page SEO & indexing

Smart Page separates **platform chrome** (`/`, `/app`, `/admin`, `/login`, `/signup`) from **customer pages** under **`/p/:code`**.

## Page-level SEO fields

Migration [`0004_page_seo.sql`](../migrations/0004_page_seo.sql) adds:

| Column | Purpose |
| --- | --- |
| `seo_title` | Optional override for `<title>` / `og:title`. |
| `seo_description` | Optional override for `<meta name="description">` and Open Graph / Twitter descriptions. |
| `allow_indexing` | `1` (default) allows indexing when published; `0` forces `noindex` even if published. |

The editor saves these fields with each Save alongside blocks and theme.

## Derived defaults

When SEO fields are blank, helpers in [`public-seo.ts`](../app/modules/page-builder/public-seo.ts):

- Build **description** from profile subtitle → header subtitle → first **text** block → fallback sentence including the page title.
- Pick **`og:image`** from the first HTTPS profile image, else gallery, else standalone image block.

## `/p/:code` meta tags

[`app/routes/p.$code.tsx`](../app/routes/p.$code.tsx) loader emits:

- Dynamic `<title>` and `<meta name="description">`
- `<meta name="robots">`: **`index, follow`** only when the page is **published**, **`allow_indexing = 1`**, and loaded from the real published short link
- **`noindex`** for drafts, demos, unknown codes, or when indexing is disabled
- `<link rel="canonical">` using the request origin
- Open Graph (`og:title`, `og:description`, `og:type`, `og:url`, optional `og:image`)
- Twitter card tags (`twitter:card`, `twitter:title`, `twitter:description`, optional `twitter:image`)

## Privacy / opting out

Owners who want a working link but **no Google presence** should turn off **Allow search engines** in the editor. The page stays reachable via `/p/:code`; robots becomes `noindex, nofollow` and the URL is omitted from the platform sitemap (see **Sitemap** below).

## Platform routes vs customer pages

- [`app.tsx`](../app/routes/app.tsx), [`admin.tsx`](../app/routes/admin.tsx), [`login.tsx`](../app/routes/login.tsx), and [`signup.tsx`](../app/routes/signup.tsx) export `robots: noindex, nofollow` so dashboards do not compete with customer landing pages.
- The marketing homepage (`/_index`) keeps default indexing unless you change [`root.tsx`](../app/root.tsx).

## `robots.txt`

[`robots[.]txt.tsx`](../app/routes/robots%5B.%5Dtxt.tsx) allows crawling `/` while disallowing `/app/`, `/admin/`, `/login`, `/signup`, and references the sitemap URL.

## Sitemap

[`sitemap[.]xml.tsx`](../app/routes/sitemap%5B.%5Dxml.tsx) lists **only**:

- Published pages (`pages.status = 'published'`)
- Active short links (`short_links.status = 'active'`)
- `allow_indexing = 1`

Draft pages and platform routes never appear.

Remote/production databases must run [`npm run db:migrate:remote`](../README.md) so SEO columns exist before relying on indexing behavior.

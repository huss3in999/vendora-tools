# Vendora AI Build Rules

These rules apply to every future public Vendora page, tool, calculator, PDF tool, transport page, content page, hub, or important public file update.

The goal is to keep Vendora discoverable by search engines and AI systems without damaging existing rankings, URLs, tools, analytics, or user trust.

## Main Safety Rules

- Do not delete, move, or rename existing public URLs unless the owner explicitly approves redirects and migration.
- Do not change working JavaScript tools, calculators, PDF tools, transport booking flows, analytics, Cloudflare deployment, or page designs unless the task requires it.
- Do not add fake reviews.
- Do not add `AggregateRating` unless real eligible reviews exist and are visible/valid.
- Do not hide SEO text.
- Do not keyword stuff.
- Do not expose API keys, Worker secrets, admin URLs, private URLs, or test URLs.
- Do not add private, admin, API, or test URLs to public sitemaps.

## Required For Every New Public Page

Every new public page must include:

- Unique `<title>`.
- Meta description.
- Canonical URL.
- `robots` set to `index, follow` unless the page is intentionally private or excluded.
- Open Graph title and description.
- Twitter title and description.
- Google Analytics tracking if the site uses global GA.
- Microsoft Clarity or other existing tracking preserved if already part of that page family.
- Proper internal links to relevant hubs, categories, siblings, and related pages.
- One visible H1.
- A useful short intro, summary, or quick answer block near the top.
- Schema JSON-LD when suitable for the page type.
- FAQ schema only when a matching visible FAQ exists on the page.
- User-facing copy that is honest, natural, and useful.

## Required Discovery Updates

Every new public page must be added to the correct discovery files:

- `sitemap.xml` or the correct sitemap file.
- `sitemap-tools.xml` if it is a tool, calculator, or tool-like utility.
- `data/tools-catalog.json` if it is a tool or calculator.
- `llms.txt` if it is important for AI discovery.
- `.well-known/llms.txt` if it mirrors `llms.txt`.
- `ai-index.json` if it belongs to an important site section.
- The relevant hub page, category page, route list, or directory page.

## Internal Linking Rules

- Tool pages must be linked from the tools hub or relevant category.
- PDF pages must be linked from the PDF hub.
- Transport pages must be linked from the transport hub, route list, and relevant nearby route pages.
- Calculator pages must be linked from the correct calculator hub.
- Important pages should have at least one clear path from the homepage, all-tools directory, or a relevant section hub.
- Links must be visible and useful to users, not hidden or added only for crawlers.

## Tracking Rules

- Keep the existing Google Analytics/global tracker active.
- Do not duplicate the GA script if the site already loads one globally.
- If a similar page has analytics events, follow the same event pattern.
- Preserve Microsoft Clarity or other existing tracking if already used in that page family.
- Do not add tracking to private, admin, API, or test pages unless the project already intentionally tracks them.
- Do not break existing analytics loaders or deployment assumptions.

## Schema Rules

- Use schema only when it accurately describes visible page content.
- Use `FAQPage` schema only when the FAQ questions and answers are visible on the page.
- Use `ItemList` only for real visible lists.
- Use `WebPage`, `WebSite`, `Organization`, `SoftwareApplication`, `HowTo`, or tool-specific schema only when suitable.
- Do not invent business details such as phone numbers, addresses, registrations, licenses, ratings, or reviews.

## AI Tool Cost Rules

Vendora uses a cost-first AI architecture.

- Use HTML, CSS, and JavaScript first.
- Use AI only when deterministic code cannot do the job well.
- Reuse the shared `ai-core` Worker where AI is needed.
- Keep daily free limits active.
- Keep upload/file size limits active.
- Compress images in the browser before upload.
- Keep prompts short and strict.
- Request JSON-only output when practical.
- Never send unnecessary data to AI.
- Never expose API keys in frontend code.

## Validation Before Saving

Before finishing any new page or important public update:

- Confirm the page loads locally.
- Confirm metadata is present and unique.
- Confirm canonical URL is correct.
- Confirm the page is reachable by internal links.
- Confirm sitemap and catalog updates are correct.
- Confirm `llms.txt`, `.well-known/llms.txt`, and `ai-index.json` are updated when needed.
- Confirm no private/admin/API/test URL was indexed.
- Confirm no fake reviews or invalid rating schema were added.
- Confirm analytics remains active and not duplicated.

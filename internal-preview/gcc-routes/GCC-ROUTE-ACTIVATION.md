# GCC Route Architecture and Activation

Status: private implementation architecture. This document does not authorize publishing or sitemap changes.

## Sources of truth

- `internal-preview/gcc-routes/config/gcc-countries.json`: country names, country hubs, pickup areas and airports.
- `internal-preview/gcc-routes/config/gcc-routes.json`: all 42 directional country routes and their operational/publication gates.
- `internal-preview/gcc-routes/config/chauffeur-services.json`: chauffeur-service hub and service visibility.
- `public/bahrain-saudi-gcc-transport/config/route-prices.json`: the only source for public numeric route pricing.
- `public/bahrain-saudi-gcc-transport/config/business-config.json`: the only source for public business and contact information.

Do not create a second manually maintained route matrix.

## Operational statuses

- `confirmed_direct`: Vendora has confirmed direct operating capability for the route.
- `confirmed_partner`: an approved operating partner has been confirmed.
- `quotation_review`: the route is being reviewed and cannot be treated as confirmed.
- `unsupported`: the route must not be offered.

`active` and `operational_status` are separate controls. Existing public routes remain active to preserve their current URLs, but they retain `quotation_review` until the new operational fields have been evidenced.

## What active means

For this architecture, setting `active: true` makes a route eligible to appear in generated **private previews** and active-route preview hubs. It does not create a public route page, add a sitemap URL or deploy anything.

Public promotion is a separate gated step that is intentionally not automated in this implementation.

## Exact steps to activate one route

Example: activate `SA-QA` after its Saudi Arabia pickup operation has been approved.

1. Confirm whether Vendora will fulfil the route directly or through an approved partner.
2. Confirm that a driver and suitable vehicle can be assigned from or near the pickup country.
3. Review the complete border process for the operating vehicle and driver.
4. Review the vehicle insurance for every country crossed.
5. Decide whether the route is quotation-only or has an approved entry in `config/route-prices.json`. Do not invent a price.
6. Edit the `SA-QA` record in `internal-preview/gcc-routes/config/gcc-routes.json`:

```json
{
  "route_id": "SA-QA",
  "active": true,
  "legacy_public": false,
  "public_path_ar": null,
  "public_path_en": null,
  "operational_status": "confirmed_partner",
  "pickup_country_supported": true,
  "approved_partner_required": true,
  "border_process_reviewed": true,
  "insurance_reviewed": true,
  "last_operational_review": "YYYY-MM-DD",
  "price_id": null,
  "quotation_status": "quotation_only"
}
```

For direct fulfilment, use `confirmed_direct` and set `approved_partner_required` to `false`.

7. Leave both public paths `null`. Activation is still preview-only.
8. Run:

```powershell
npm run check:gcc-preview
```

9. Review both generated files from the repository root:

```text
planning-output/gcc-preview/ar/routes/saudi-to-qatar/index.html
planning-output/gcc-preview/en/routes/saudi-to-qatar/index.html
```

10. Confirm Arabic and English copy, pickup areas, destination areas, airports, FAQs, quotation wording and reverse links.
11. Confirm the route appears only in the private Saudi Arabia hub and is still absent from all public sitemaps.
12. Complete the separate publication checklist below before any future public-page generation.

## Public promotion checklist

All items must pass before a route receives public paths:

- Operational status is `confirmed_direct` or `confirmed_partner`.
- Pickup-country capability is confirmed.
- Partner approval is recorded where applicable.
- Border process and insurance have been reviewed.
- Last operational review date is current.
- Assigned-driver and assigned-vehicle disclosure is included.
- Arabic and English copy is useful and route-specific.
- English visible copy contains no Arabic text.
- Price comes from `config/route-prices.json`, or the page says quotation required.
- No unconditional time, border, visa or availability guarantee is present.
- Both preview pages pass the architecture validator.
- Canonical and reciprocal hreflang values have been reviewed.
- Organization, Service, Breadcrumb and valid FAQ structured data parse.
- Internal links include both country hubs, the reverse route, related city/airport routes, prices, complaints, reviews and policies.
- HTTP 200 has been verified in the intended deployment environment.
- Titles and descriptions are unique.
- The route is absent from the sitemap until every preceding gate passes.

Only after these checks should public paths be assigned, public HTML generated, and the route added to a controlled sitemap batch. Those actions require a separate approved implementation.

## Private preview output

Run `npm run preview:gcc` to regenerate:

```text
planning-output/gcc-preview/
```

The generator:

- writes outside the deployed `public/` directory;
- includes all ten preserved existing country routes;
- includes inactive routes from the first operational-approval batch for private review;
- creates seven Arabic and seven English country hubs;
- shows active routes only on country hubs;
- creates Arabic and English chauffeur-service hubs;
- adds strict `noindex,nofollow,noarchive,nosnippet` directives;
- adds no canonical URL;
- gives inactive route previews no WhatsApp or booking link;
- records hashes of all public sitemap files in `manifest.json`.

The preview folder must never be used as the public route-page source directory.

## Validation

Run:

```powershell
npm run validate:gcc
npm run validate:central-config
npm run sync -- --check
```

The GCC validator fails when:

- the matrix is not exactly 42 complete directional pairs;
- a reverse mapping is missing or incorrect;
- an inactive route has a public path, price or non-quotation status;
- a newly activated route lacks confirmed operational fields;
- an inactive route appears in a public sitemap;
- a private preview is indexable or claims a canonical URL;
- an inactive preview exposes a booking link;
- a country hub links to an inactive route;
- English preview copy contains visible Arabic characters;
- generated structured data does not parse.

## Existing active routes

These ten directions remain active solely because their bilingual URLs already exist and the implementation decision requires preserving current active routes and URLs:

- `BH-SA`
- `BH-QA`
- `BH-KW`
- `BH-AE`
- `BH-OM`
- `BH-IQ`
- `SA-BH`
- `QA-BH`
- `KW-BH`
- `OM-BH`

They are not reclassified as `confirmed_direct` or `confirmed_partner` without operational evidence.

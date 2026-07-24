# GCC Route Architecture and Activation

Status: internal implementation architecture. Publication batch 1 is controlled by the approved route list and deterministic generator described below.

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

Setting `active: true` makes a route eligible for private previews. A route becomes public only when it also has approved Arabic and English public paths and is included in a reviewed publication batch.

Public promotion is performed by a batch-specific deterministic generator after every operational and content gate passes. The generator does not deploy the site.

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

7. Leave both public paths `null` during preview review.
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

Only after these checks should public paths be assigned, public HTML generated, and the route added to a controlled sitemap batch.

## Publication batch 1

The approved publication command is:

```powershell
npm run publish:gcc-batch-1
npm run validate:gcc-batch-1
npm run test:gcc-batch-1
```

The generator publishes only the ten route IDs declared in
`scripts/generate-gcc-route-batch-1.mjs`, writes their Arabic and English
pages, writes the six approved bilingual country hubs, and updates only
`sitemap-gcc-transport.xml`, `sitemap-gcc-transport-en.xml`, and their
index last-modified dates. Adding a route to the 42-record matrix does not
publish it automatically.

## Private preview output

Run `npm run preview:gcc` to regenerate:

```text
planning-output/gcc-preview/
```

The generator:

- writes outside the deployed `public/` directory;
- includes all active country routes;
- keeps all inactive route records internal;
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

These ten directions remain active because their bilingual URLs existed before publication batch 1:

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

Publication batch 1 additionally approved and published `SA-QA`, `QA-SA`,
`SA-AE`, `AE-SA`, `AE-BH`, `QA-AE`, and `AE-QA`. The three existing
batch routes `BH-AE`, `KW-BH`, and `OM-BH` were upgraded in place. All ten
batch routes record `confirmed_partner` because fulfilment may require an
approved operating partner; this does not promise guaranteed availability.

# Editing Vendora Transport

The public transport site now has three central files. Do not edit the same phone number, price, or color across individual pages.

After changing business details or prices, run this command inside `public/bahrain-saudi-gcc-transport`:

```powershell
npm run sync
```

This refreshes the static HTML fallbacks and generated browser configuration. The Cloudflare Worker also reads the same central defaults and injects current data into delivered HTML.

## To change a phone or WhatsApp number

Open `config/business-config.json`.

- Change `booking_whatsapp_display` and `booking_whatsapp` for WhatsApp.
- Change `support_phone_display` and `support_phone` for support calls.
- Keep normalized values digits-only, for example `97333225954`.
- Run `npm run sync`.

## To change the office address

Open `config/business-config.json`, change `public_address`, then run `npm run sync`.

Change `google_maps_url` in the same file if the map destination changes.

## To change one route price

Open `config/route-prices.json`, search for the route's `route_id`, and change `one_way_price`.

Do not guess a price. For an unsupported route, use:

```json
"price_type": "quotation",
"visibility": "quotation-only",
"one_way_price": null
```

Then update that route's `last_updated` date and run `npm run sync`.

## To change the website colors

Open `assets/vendora-theme.css` and edit the variables at the top, such as:

- `--vendora-navy`
- `--vendora-surface-dark`
- `--vendora-surface-light`
- `--vendora-gold`
- `--vendora-text-on-dark`
- `--vendora-text-on-light`

Common buttons, cards, forms, headers, footers, links, WhatsApp elements, and responsive typography inherit these variables.

## To create a new route page

1. Copy `templates/page-ar.html` for Arabic.
2. Copy `templates/page-en.html` for English.
3. Put each copy in its final page folder as `index.html`.
4. Replace every square-bracket placeholder.
5. Use the same `ROUTE_ID` as `config/route-prices.json`.
6. Keep Arabic pages `lang="ar" dir="rtl"` and English pages `lang="en" dir="ltr"`.
7. Add final canonical and hreflang URLs.
8. Run `npm run sync` and `npm run validate:central-config`.

The template files are `noindex` and are excluded from the public page synchronizer and sitemap.

## To publish changes

1. Make changes on a feature branch, not directly on `main`.
2. Run `npm run sync`.
3. Run `npm run validate:central-config`.
4. Commit and push the feature branch.
5. Open or update a pull request into `main`.
6. Review and merge the pull request only after checks pass.
7. The existing GitHub-to-Cloudflare process publishes `main`. Do not run a manual production deployment unless the normal process specifically requires it.

Never place private tokens, admin passwords, API secrets, or customer information in these public configuration files.

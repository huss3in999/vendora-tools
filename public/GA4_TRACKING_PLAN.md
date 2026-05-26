# GA4 Tracking Plan

This plan keeps the current Vendora GA4 property (`G-DFY197R2MS`) and adds a lightweight categorization layer. It does not add a second GA script and does not change SEO, schemas, URLs, or page content.

## Current Implementation Audit

- Global loader: `assets/analytics-loader.js` loads GA4, Microsoft Clarity, and Cloudflare Web Analytics on pages that include it.
- Transport pages: most pages under `/bahrain-saudi-gcc-transport/` load `../../assets/analytics-loader.js` or `../../../assets/analytics-loader.js` plus `site.js`.
- Legacy pages: many older calculators, guides, and tools include the GA4 snippet inline in each page.
- PDF tools: `/tools/pdf-converter/` pages use inline GA4 plus `tools/pdf-converter/assets/pdf-analytics.js`.
- Existing custom events found:
  - `open_live_demo`
  - `transport_whatsapp_click`
  - `pdf_tool_view`
  - `pdf_tool_select`
  - `pdf_tool_upload_started`
  - `pdf_tool_conversion_success`
  - `pdf_tool_conversion_error`
  - several calculator/tool-specific events through `vendoraTrack`, `vendoraToolEvent`, or direct `gtag('event', ...)`.

## Content Groups

Use `content_group` and `page_category` with these values:

- `transport`: `/bahrain-saudi-gcc-transport/`
- `pdf_tools`: `/tools/pdf-converter/`, `/pdf/`, `/pdf-tools/`
- `calculators`: `/calculator/`, `/calculators/`
- `restaurant_tools`: restaurant calculators and restaurant operation tools
- `business_tools`: `/tools/small-business/`
- `articles`: `/article/`, `/articles/`, `/guide/`, `/guides/`, `/blog/`
- `other`: pages outside the above rules

The machine-readable map is stored in `analytics-category-map.json`.

## Recommended GA4 Custom Dimensions

Create these exact event-scoped custom dimensions in GA4 Admin.

Path in GA4:

`Admin > Data display > Custom definitions > Create custom dimension`

For each one:

- Scope: `Event`
- Event parameter: use the exact parameter name below
- Dimension name: use the same name or a readable label

- `content_group`
- `page_category`
- `route_name`
- `transport_cluster`
- `language`
- `button_location`
- `article_slug`
- `link_url`

Optional extra custom dimensions for deeper tool reports:

- `tool_id`
- `tool_category`
- `pdf_action`
- `calculator_event`
- `calculator_slug`

## Event Parameters Documented

These parameters are currently used by `js/analytics-router.js` and `assets/analytics-loader.js`:

- `page_category`: automatic section category such as `transport`, `pdf_tools`, `calculators`, `restaurant_tools`, `business_tools`, `articles`, or `other`.
- `content_group`: same category value, sent for GA4 content grouping.
- `route_name`: transport route or page slug, for example `bahrain-to-karbala`.
- `transport_cluster`: transport intent cluster, such as `karbala`, `najaf`, `iraq`, `arbaeen`, or `ziyarat`.
- `language`: page language from the `<html lang>` value.
- `button_location`: where a clicked CTA appears, such as `header`, `hero`, `booking`, `floating`, `footer`, or `body`.
- `article_slug`: article or guide slug used by `article_read`.
- `link_url`: clicked WhatsApp/contact/mail/phone URL.

Additional parameters sent but not required as custom dimensions:

- `page_path`
- `page_url`
- `page_title`
- `button_text`
- `scroll_depth`

## Recommended Events

- `transport_page_view`: fired once on transport pages loaded through the global analytics loader.
- `route_interest`: fired once on specific transport route/article pages.
- `whatsapp_click`: fired on WhatsApp CTAs with page, route, language, and button location.
- `contact_click`: fired on contact, mail, or phone links.
- `pdf_tool_use`: fired by the PDF analytics helper on PDF tool selection, upload, success, or error.
- `calculator_use`: fired by shared calculator analytics helpers when calculator pages send calculation events.
- `article_read`: fired after meaningful article engagement, either 50% scroll or about 30 seconds on page.

## Transport Conversion Tracking

Transport reporting should segment by:

- `page_category = transport`
- `route_name`: route/page slug such as `bahrain-to-karbala`, `bahrain-to-najaf`, `arbaeen-transport`
- `transport_cluster`: `karbala`, `najaf`, `iraq`, `arbaeen`, `ziyarat`, or blank
- `language`: page language from the `<html>` tag
- `page_url`

Use `whatsapp_click` as the primary soft conversion and keep the existing `transport_whatsapp_click` event for backward compatibility.

## PDF Tool Usage

PDF tools keep the existing privacy-first events and also emit `pdf_tool_use` with safe fields only:

- `tool_id`
- `tool_category`
- `pdf_action`
- `status_code`
- approximate file count/size where already allowed

Do not send filenames, document text, passwords, or full file metadata.

## Calculator Usage

Shared calculator helpers emit `calculator_use` when calculators call `vendoraTrack`. Use:

- `calculator_event`
- `calculator_slug`
- `page_category`
- `content_group`

Legacy calculators with only inline GA continue to work; new calculator pages should prefer the shared helper.

## Article Engagement

Article/guide reporting should use:

- `article_read`
- `article_slug`
- `scroll_depth`
- `page_category`
- `language`

Transport SEO articles also keep `transport_page_view` and `route_interest` because they belong to the transport section.

## How To Read Reports In GA4

1. Open GA4 Reports or Explore.
2. Use Event name as the main dimension.
3. Filter by `page_category` to separate Transport, PDF tools, Calculators, Restaurant tools, Business tools, and Articles.
4. For transport, add `route_name` and `transport_cluster` to compare Karbala, Najaf, Iraq, Arbaeen, and Ziyarat demand.
5. Treat `whatsapp_click` as the main transport conversion signal.
6. For PDF tools, compare `pdf_tool_use` by `tool_id` and `pdf_action`.
7. For calculators, compare `calculator_use` by `calculator_slug`.
8. For guides, compare `article_read` by `article_slug`.

## Simple Owner Setup Guide

1. Open GA4.
2. Go to `Admin`.
3. Under `Data display`, open `Custom definitions`.
4. Click `Create custom dimension`.
5. Choose scope `Event`.
6. Add each required event parameter:
   - `page_category`
   - `content_group`
   - `route_name`
   - `transport_cluster`
   - `language`
   - `button_location`
   - `article_slug`
   - `link_url`
7. Save each custom dimension.
8. Wait for GA4 processing. New custom dimensions may take time before they appear in reports.

## Simple Testing Guide

1. Open the Karbala page: `https://getvendora.net/bahrain-saudi-gcc-transport/bahrain-to-karbala/`.
2. Open GA4 Realtime.
3. Look for the `transport_page_view` event.
4. Confirm `route_name = bahrain-to-karbala`.
5. Click a WhatsApp button on the Karbala page.
6. Confirm the `whatsapp_click` event appears.
7. Confirm `route_name = bahrain-to-karbala`.
8. Confirm `page_category = transport`.
9. Confirm `button_location` shows where the click happened, such as `hero`, `booking`, or `floating`.

## Safety Rules

- Do not duplicate the GA script.
- Do not track admin, API, private, or test pages.
- Do not send personal data, document contents, filenames, phone numbers typed by users, or free-text notes.
- Keep analytics JavaScript lightweight and defensive.
- Preserve existing GA4, Clarity, Cloudflare Analytics, and transport lead tracking.

# Advanced Blocks

This document covers the now-live advanced blocks in the page editor:

- HTML / embed
- Forms (lead capture)
- Digital products (showcase mode)
- Advanced timer

## 1) HTML / Embed (Safe HTML Only)

The HTML block accepts **limited custom HTML** and applies strict sanitization on save/render.

### Allowed tags

- `div`, `p`, `span`, `strong`, `em`, `b`, `i`
- `ul`, `ol`, `li`, `br`
- `h1`, `h2`, `h3`
- `a` (safe links only)

### Blocked for safety

- `<script>`
- `<iframe>`
- `<object>` / `<embed>`
- inline event handlers (for example `onclick`)
- `javascript:` URLs

### Link safety

Only these link prefixes are accepted in `<a href="...">`:

- `http://`
- `https://`
- `mailto:`
- `tel:`

Editor warning shown to owners:

> Custom HTML is limited for safety.

## 2) Forms (Lead Submissions)

Forms are now usable as lead-capture blocks.

### Owner configuration

Owners can set:

- form title
- submit button text
- enabled fields (any subset of):
  - name
  - phone
  - email
  - message

### Public submissions

Visitors submit to the public `/p/:code` endpoint, and valid leads are stored in D1.

Table: `lead_submissions`

Columns:

- `id`
- `workspace_id`
- `page_id`
- `block_id`
- `name`
- `phone`
- `email`
- `message`
- `metadata_json`
- `created_at`

### Visibility

- Owners can view lead content in `/app/leads`.
- Super admin sees **count only** in dashboard summary.

### Validation and basic abuse control

- email format validated
- phone format validated
- message length capped
- basic rate-limit per page/block/time window
- no public lead listing endpoints

## 3) Digital Products (Showcase Mode)

Digital products are live as a showcase/intent block (no internal checkout yet).

Each item supports:

- title
- description
- price text
- image URL
- button text
- button URL (external checkout / contact / WhatsApp)

Editor label reminds owners:

> Payment integration planned later.

## 4) Advanced Timer

Advanced timer block supports:

- title
- target datetime (`targetIso`)
- fallback display text (`dateTimeText`)
- message before ending
- message after ending

Public behavior:

- lightweight live countdown in browser when JS is available
- fallback text still shown if JS fails or target date is invalid

## What Comes Later

These are intentionally not included yet:

- built-in payment processing
- file upload hosting
- custom domains

Those will be added in later phases with dedicated security and infra work.

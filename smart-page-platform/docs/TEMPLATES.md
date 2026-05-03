# Page templates

Professional presets live in code so owners can apply ready-made **themes**, **layouts**, and **starter blocks** from the page editor—similar to link-in-bio tools (Linktree, Taplink, Beacons), but rendered through Smart Page Platform’s existing theme and block system.

## What a template contains

Each template is a `PageTemplate` record:

| Field | Purpose |
| --- | --- |
| `id` | Stable slug (`creator-personal-brand`, etc.). Not shown to visitors. |
| `name`, `category`, `description` | Editor UI only. |
| `recommendedButtonStyle` | Hint aligned with `PageTheme.buttonStyle` (`rounded`, `pill`, `square`, `shadow`, `outline`). |
| `layoutStyle` | Same values as `PageTheme.layoutStyle` (`centered`, `full_width_mobile`, `card_based`). |
| `footerText` | Copied into `PageTheme.footerText` for the public page footer. |
| `theme` | Full `PageTheme` object (passed through `sanitizePageTheme`). |
| `blocks` | Starter blocks **without** `id`; types and props match Phase 1 `Block` unions. |

Implementation: [`app/modules/page-builder/templates.ts`](../app/modules/page-builder/templates.ts).

Applying a template in the editor calls `sanitizePageTheme`, then `instantiateTemplateBlocks`, which runs each starter block through [`sanitizeBlock`](../app/modules/page-builder/block-sanitize.ts)—the same rules used when saving JSON from the editor—so URLs, phones, and social links stay within supported formats.

## Included business types

| Template ID | Audience |
| --- | --- |
| `creator-personal-brand` | Creators and personal brands |
| `restaurant-food` | Restaurants and food businesses |
| `clothing-store` | Retail / fashion |
| `salon-beauty` | Salons and beauty |
| `driver-transport` | Drivers and transport |
| `freelancer-services` | Freelancers and services |
| `event-booking` | Events and bookings |

## Owner workflow

1. Open `/app/pages/:pageId/edit`.
2. Scroll to **Templates**, choose a card, click **Apply template**.
3. If the page already has blocks, confirm replacement (theme + blocks).
4. Adjust blocks and **Appearance** as needed.
5. **Save** or **Publish** as usual—no separate template persistence layer.

Templates only change client-side editor state until Save/Publish runs through the existing server actions.

## Adding a new template later

1. Open [`templates.ts`](../app/modules/page-builder/templates.ts).
2. Append an object to `PAGE_TEMPLATES` with a unique `id`.
3. Use **only** Phase 1 block types from [`blocks.ts`](../app/modules/page-builder/blocks.ts).
4. For external URLs:
   - Profile and gallery images: `http://` or `https://` (no `javascript:` or other schemes).
   - Link buttons and map buttons: same; `link_button` also allows root-relative paths like `/`.
   - Social links: platforms from the allow list; `email` uses a real email or `mailto:`.
   - WhatsApp / contact phones: E.164 with `+` (e.g. `+15551234567`).
5. Keep copy short so it remains easy to edit in the block fields.
6. Run `npm run typecheck`, `npm run build`, and `npm run test` (smoke checks include template instantiation).

Do not import new block types without updating sanitization, the block library, and the public renderer—the template list is not a separate feature surface.

## Public rendering

No template-specific renderer: published pages use the same `PageTheme` + `RenderBlocks` pipeline as manually built pages.

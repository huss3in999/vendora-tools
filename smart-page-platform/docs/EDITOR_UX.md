# Page editor UX

The editor (`/app/pages/:pageId/edit`) is optimized for **mobile-first** editing with a **desktop preview column**.

## Layout

- **Two-column layout (large screens):** Main controls on the left; a **phone-style preview** on the right (sticky) shows the same `PublicPageFrame` renderer visitors see.
- **Preview dock:** Below the phone bezel there is an **eye** link (when published), a primary **Add block** pill, and a placeholder rail—similar to Taplink’s bottom preview toolbar.
- **Single column (small screens):** Preview appears above the blocks list. A **fixed bottom bar** exposes Save, Publish/Draft, optional View/Copy when published, and **Add block** without scrolling back to the header.

## Add block modal

- Tap **Add block** (blocks card, preview dock under the phone, or mobile bottom bar). A **Taplink-style sheet** opens: dark UI, tabs **Standard blocks** vs **Coming soon**, and a **dense icon grid** (mobile-friendly tap targets).
- **Live** blocks insert through existing `defaultBlock` helpers—you can add **many blocks of the same type** (e.g. multiple images).
- **Coming soon** tab lists placeholders only (HTML injection stays off until sanitization exists).

Implementation lives in [`app/components/page-editor/AddBlockModal.tsx`](../app/components/page-editor/AddBlockModal.tsx) and [`block-catalog.ts`](../app/components/page-editor/block-catalog.ts).

## Block order

- Each block row has a **drag handle** (native HTML5 drag-and-drop) plus **↑ / ↓** for touch devices where drag is awkward.

## Templates

[`TemplatePicker`](../app/components/page-editor/TemplatePicker.tsx) lists every preset from [`templates.ts`](../app/modules/page-builder/templates.ts):

- **Preview** opens a modal with a scaled phone preview using live theme + sanitized starter blocks.
- **Apply** runs the same confirmation as before when blocks already exist, then replaces editor state (Save/Publish persists).

See also [`TEMPLATES.md`](TEMPLATES.md).

## Search visibility (SEO fields)

Owners can set optional **SEO title**, **SEO description**, and **Allow search engines** on the same page—stored on the page row (`seo_*`, `allow_indexing`). Details in [`PUBLIC_PAGE_SEO.md`](PUBLIC_PAGE_SEO.md).

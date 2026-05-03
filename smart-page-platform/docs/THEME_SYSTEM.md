# Theme System

Phase 1 stores page appearance settings in `pages.theme_json`. The field is optional in practice because old pages use code-level defaults when `theme_json` is empty or missing values.

## Supported options

Theme settings are validated through an allowlisted `PageTheme` shape:

- Page background: `solid`, `gradient`, or `image`
- Colors: background, gradient start/end, primary, text, card, and button colors
- Button styles: `rounded`, `pill`, `square`, `shadow`, `outline`
- Font styles: `clean`, `elegant`, `bold`, `minimal`
- Layout styles: `centered`, `full_width_mobile`, `card_based`
- Profile/avatar styles: `circle`, `rounded_square`, `square`
- Branding controls: show/hide Smart Page badge and optional footer text

## Validation

The theme sanitizer rejects unsafe freeform styling by using:

- hex color validation for colors
- `http://` and `https://` only for background image URLs
- allowlisted enum values for layout, fonts, buttons, and profile shapes
- plain text trimming for footer text

No raw HTML or arbitrary CSS is accepted from page owners.

## Public rendering

The public route `/p/:code` loads the published page, blocks, short link, and theme. The renderer applies the theme with safe inline style values and allowlisted CSS class variants. Analytics click tracking continues to work for link and WhatsApp blocks.

## Future templates

Future templates can be built as named presets that generate a valid `PageTheme` object plus optional starter blocks. Templates should not introduce custom CSS from users. If advanced templates are added later, keep them server-defined and map them back to the same allowlisted theme model.

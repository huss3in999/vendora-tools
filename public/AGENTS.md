# Project AI Build Rules

This project uses a cost-first AI architecture.

## Main rule

Use HTML, CSS, and JavaScript first.  
Use AI only when deterministic code cannot do the job well.

## AI is allowed only for

- image understanding
- OCR-like extraction from messy images
- unstructured text extraction
- summarization
- rewriting
- classification
- reasoning across messy or variable input
- flexible recommendations

## AI must NOT be used for

- fixed calculations
- totals
- filtering
- sorting
- searching fixed local data
- validation
- layouts
- PDF export
- simple parsing when regex or JavaScript can do it reliably
- UI behavior
- static business rules

## Backend architecture

- One shared Cloudflare Worker named ai-core
- One shared Gemini API key stored only in Worker secrets
- One shared KV namespace binding named USAGE
- Reuse the same Worker for multiple AI tools using separate endpoints
- Do not create a new Worker for each tool unless clearly required

## Current AI provider

- Gemini 2.5 Flash-Lite

## Current Worker endpoints

- /receipt for image receipt extraction
- /text for general text tools

## Cost control rules

- Always keep daily free limits active
- Always keep file size limits active for uploads
- Compress images in the browser before upload
- Keep prompts short and strict
- Request JSON-only output when possible
- Never send unnecessary data to AI
- Never store uploaded files unless explicitly required
- Never expose API keys in frontend code

## Implementation rule for every new tool

### Step 1
Check if normal code can solve the problem

### Step 2
If normal code cannot solve it well, reuse ai-core

### Step 3
Add a new endpoint only if needed

### Step 4
Keep prompt short, strict, and structured

### Step 5
Return clean JSON whenever possible

## Site structure — where new tools go (mandatory)

This repo historically mixed **`/tools/`**, **`/calculators/`**, **`/calculator/`** (hubs), **`/all-tools/`**, and deep trees such as **`/tools/small-business/calculators/...`**. That is hard to browse and duplicates “index” pages. **For every new tool you add from now on, follow this layout and do not invent new folder chains.**

### One directory per tool type (flat paths)

- **Restaurant / business web apps and interactive tools** that ship as their own mini-site: put them under **`/tools/<tool-slug>/`** only (one folder depth under `tools/`, with `index.html` inside). Example: `tools/menu-price-calculator/`.
- **Single-purpose formula calculators** (static math pages): put them under **`/calculators/<tool-slug>/`** only. Example: `calculators/tdee-calculator/`.
- **Themed hubs** (copy + curated links only, not a second full catalog): **`/calculator/<theme>/`** — e.g. `calculator/food/`, `calculator/finance/`. These pages group links by topic; they do **not** replace the global directory.

### One global discovery page (categories live there, not in new trees)

- **`/all-tools/index.html`** is the **canonical searchable directory** for “everything in one place” with categories and search. When you add a tool, **register it there** (and in generated catalog data such as `tools-catalog.json` / sitemap scripts if the project uses them). Do **not** create another standalone “full tools index” for the same purpose.
- **`/tools/index.html`** may stay as a **restaurant-focused** landing page: it should **link to** `all-tools/` for “see everything”, not grow into a competing full duplicate of the entire site map unless intentionally maintained as one source of truth.

### Do not do this on new work

- Do **not** nest new tools under **`tools/<category>/calculators/<tool>/`** (or similar deep `category → calculators → tool` paths). That pattern is legacy; it multiplies index pages and breaks mental models.
- Do **not** add “yet another” top-level folder that means “all tools” beside `all-tools/`.
- Do **not** add a new category-only `index.html` that re-lists dozens of tools by hand **unless** it is a short hub (a handful of links) pointing at the flat tool URLs and at **`/all-tools/`**.

### Legacy paths

- Existing URLs under **`tools/small-business/`** and elsewhere remain for backward compatibility; **do not add new siblings** that extend the same deep structure. Prefer new **`tools/<slug>/`** or **`calculators/<slug>/`** entries plus a row in **`all-tools/`** (and catalog generation if applicable).

## UI rule

- Make tools look simple, clean, and fast
- Show loading state
- Show user-friendly error messages
- Show result in cards, not raw JSON
- Add reset button
- Add copy button when useful

## Bilingual transport-site rule

For `bahrain-saudi-gcc-transport`, Arabic and English must never be mixed in the user-facing UI.

- Arabic mode must be 100% Arabic for visible customer copy, with `html lang="ar"` and `dir="rtl"`.
- English mode must be 100% English for visible customer copy, with `html lang="en"` and `dir="ltr"`.
- If you add or change Arabic text in any transport HTML page, you must add the matching English phrase to `bahrain-saudi-gcc-transport/site.js` in the translation map during the same change.
- After any transport copy update, run the Playwright audit. The English-language audit must have zero visible Arabic characters.
- Do not rely on partial word replacement such as only translating city names. Translate the full sentence or heading.
- SEO metadata must also be language-aware: titles, descriptions, Open Graph, Twitter metadata, `lang`, `dir`, and structured data should match the active language.
- For true English SEO indexing, use dedicated crawlable English URLs with proper `hreflang` alternates. A JavaScript-only language toggle is useful for users, but it is not enough by itself to guarantee separate English search indexing.
- Keep route keywords clear in both languages, for example: `Bahrain to Saudi Arabia transport`, `Bahrain to Khobar`, `Bahrain to Dammam`, `Bahrain to Riyadh`, and the Arabic equivalents.

### Static HTML calculators (`/calculators/` and related)

- **Navigation links must be relative** to each `index.html` file (for example `../tdee-calculator/`, `../../calculator/food/nutrition-calculators/`), not root-absolute paths like `/calculators/...`. Root-absolute URLs break when the site is opened from disk or from a non-root base path.
- **Dark theme forms:** after `calculators.css`, also link `calculators/assets/calculator-dark-forms.css` on any new calculator page. Native `<select>` / `<option>` often render with a light menu and invisible text on Windows unless `option` gets an explicit dark background and light text; `color-scheme: dark` on the `<select>` helps.
- **Select width:** avoid `w-full` stretching every dropdown edge-to-edge unless the layout needs it; use the shared `nut-select` class (max-width) for compact fields.
- **No white dropdown surfaces on dark tools:** do not leave `<select>` / `<option>` styling to the browser default. Use opaque dark backgrounds and light body text on both the closed control and `option` / `optgroup` (see `tools/tool-system.css` and `calculator/_shared/vendora-calc.css`). Avoid semi-transparent `background` on selects where the OS paints the list against white.
- **Currency list data:** pages that use `calculator/_shared/currency-global.js` load `data/currencies.json`. The script resolves the JSON URL from its own `src` (so `fetch` works on `file://`), falls back to `../../../data/currencies.json` from the page on `file:`, and otherwise uses `/data/currencies.json`. For unusual hosting, set `window.__VENDORA_CURRENCIES_JSON__` to an absolute URL string before the script runs.

## Before building any new AI tool, always explain

- what part is normal code
- what part is AI
- why AI is necessary
- how cost is being controlled

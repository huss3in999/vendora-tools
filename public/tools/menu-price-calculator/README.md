# Menu Price Calculator Map

This tool is powered by:

- [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/index.html)
- [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/styles.css)
- [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/app.js)

## Ownership Map

- Head SEO and analytics:
  - page title, meta tags, canonical, Open Graph, Google Analytics
  - these stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/index.html)
- Style system:
  - all layout, theme, form, result, support button, and mobile CSS live in [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/styles.css)
- Public page structure:
  - hero, calculator controls, results cards, explainer copy, FAQ, CTA, and schema blocks stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/index.html)
- Calculator runtime:
  - the main app lives in [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/app.js)
- Numeric and formatting helpers:
  - `getCurrency()`
  - `getNumber(input)`
  - `formatMoney(value)`
  - `formatPercent(value)`
- Results animation and guidance:
  - `animateValue(element, newText)`
  - `getRecommendation(margin)`
- Mode and business logic:
  - `updateProfitMode()`
  - `calculate()`
- Demo and utility helpers:
  - `fillExample()`
  - `resetInputs()`
  - `buildResultsText()`
  - `copyResults()`
  - `printResults()`
- Input wiring:
  - live calculation and toggle listeners are attached at the bottom of the script block

## Editing Rules

- Treat these files as the source of truth for this tool:
  - [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/index.html) for page structure, SEO, analytics, and schema
  - [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/styles.css) for presentation and responsive behavior
  - [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/menu-price-calculator/app.js) for calculator logic and event wiring
- Keep the tool browser-only, simple, and mobile friendly.
- Preserve analytics, support links, and public SEO copy unless the change explicitly replaces them.
- If you add a new calculator mode, repurpose an existing helper, or significantly rearrange the page blocks, update this README in the same change.
- If a change affects shared tool patterns or landing-page discovery, update those connected files in the same change.

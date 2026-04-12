# Food Cost Calculator Map

This tool is powered by:

- [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/index.html)
- [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/styles.css)
- [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/app.js)

## Ownership Map

- Head SEO and analytics:
  - page title, meta tags, canonical, Open Graph, Google Analytics
  - these stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/index.html)
- Style system:
  - all layout, theme, form, results, support button, and mobile CSS live in [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/styles.css)
- Public page structure:
  - hero, calculator form, results, explanation copy, FAQ, CTA, and schema blocks stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/index.html)
- Calculator runtime:
  - the main app lives in [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/app.js)
- Numeric and formatting helpers:
  - `getNumber(input)`
  - `getCurrency()`
  - `formatMoney(value)`
  - `formatPercent(value)`
- Validation and status copy:
  - `setValidation(message)`
  - `getStatusData(profitMargin)`
- Results animation:
  - `animateValue(element, newText)`
- Core business logic:
  - `calculate()`
- Demo and utility helpers:
  - `resetInputs()`
  - `fillExample()`
  - `buildResultsText()`
  - `copyResults()`
  - `printResults()`
- Input wiring:
  - live calculation and button handlers are attached at the end of the script block

## Editing Rules

- Treat these files as the source of truth for this tool:
  - [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/index.html) for page structure, SEO, analytics, and schema
  - [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/styles.css) for presentation and responsive behavior
  - [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/food-cost-calculator/app.js) for calculator logic and event wiring
- Keep the tool browser-only, fast, and simple for restaurant operators.
- Preserve analytics, SEO, support links, and mobile behavior unless the change is intentionally replacing them.
- If you change ownership of a feature, add a new helper, remove a section, or significantly repurpose the calculator flow, update this README in the same change.
- If a change affects shared tool patterns like floating support buttons or landing-page tool discovery, update the connected files in the same change.

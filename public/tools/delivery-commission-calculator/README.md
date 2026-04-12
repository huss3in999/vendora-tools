# Delivery Commission Calculator Map

This tool is powered by:

- [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/index.html)
- [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/styles.css)
- [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/app.js)

## Ownership Map

- Head SEO and analytics:
  - page title, meta tags, canonical, Open Graph, Google Analytics
  - these stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/index.html)
- Style system:
  - all layout, theme, card, button, floating support button, and mobile CSS live in [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/styles.css)
- Public page structure:
  - hero, calculator form, results cards, trust copy, FAQ, CTA, and schema blocks stay in [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/index.html)
- Calculator runtime:
  - the main app lives in [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/app.js)
- Numeric helpers:
  - `getCurrency()`
  - `getNumber(input)`
  - `formatMoney(value)`
  - `formatPercent(value)`
- Results animation and recommendation copy:
  - `animateValue(element, newText)`
  - `getRecommendation(monthlyLoss, yearlySavings)`
- Core business logic:
  - `calculate()`
- Demo and usability helpers:
  - `fillExample()`
  - `resetInputs()`
  - `buildResultsText()`
  - `copyResults()`
  - `printResults()`
  - `shareResults()`
- Input wiring:
  - live recalculation and button events are attached at the bottom of the script block

## Editing Rules

- Treat these files as the source of truth for this tool:
  - [index.html](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/index.html) for page structure, SEO, analytics, and schema
  - [styles.css](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/styles.css) for presentation and responsive behavior
  - [app.js](C:/Users/Hussain%20Alyaqoob/Desktop/new/new%20try/New%20folder/Vendora%20Landing%20Page/tools/delivery-commission-calculator/app.js) for calculator logic and event wiring
- Keep the calculator browser-only and no-signup.
- Preserve current analytics, mobile friendliness, and public SEO copy unless the change explicitly replaces them.
- If you change feature ownership, add a new helper, remove a section, or significantly repurpose a block, update this README in the same change.
- If a change affects cross-tool patterns like shared support links, analytics, or landing-page tool discovery, update the related tool or landing-page files in the same change.

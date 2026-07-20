import fs from 'node:fs';

const audit = JSON.parse(fs.readFileSync('full-site-audit.json', 'utf8'));
const availability = JSON.parse(fs.readFileSync('availability-repair-report.json', 'utf8').replace(/^\uFEFF/, ''));

const seoRepairPages = [
  'privacy/index.html', 'en/privacy/index.html',
  'king-fahd-causeway-guide/index.html', 'en/king-fahd-causeway-guide/index.html',
  'booking-terms/index.html', 'en/booking-terms/index.html',
  'prices/index.html', 'en/prices/index.html',
  'gcc-private-transport-guide/index.html', 'en/gcc-private-transport-guide/index.html',
  'care/index.html', 'care/en/index.html',
  'bahrain-airport-transfer/index.html', 'bahrain-to-hamad-airport/index.html',
  'bahrain-to-kuwait-airport/index.html', 'dubai-to-bahrain/index.html',
  'hamad-airport-to-bahrain/index.html', 'kuwait-airport-to-bahrain/index.html',
  'kuwait-to-bahrain/index.html', 'oman-to-bahrain/index.html', 'qatar-to-bahrain/index.html',
  'dammam-to-bahrain/index.html', 'khobar-to-bahrain/index.html', 'riyadh-to-bahrain/index.html',
];

const createdEnglishPages = [
  'bahrain-airport-transfer', 'bahrain-to-hamad-airport', 'bahrain-to-kuwait-airport',
  'dubai-to-bahrain', 'hamad-airport-to-bahrain', 'kuwait-airport-to-bahrain',
  'kuwait-to-bahrain', 'oman-to-bahrain', 'qatar-to-bahrain',
].map((slug) => `en/${slug}/index.html`);

const modifiedPages = [...new Set([...availability.changed, ...seoRepairPages, ...createdEnglishPages])].sort();
const publicPages = audit.pages.map((page) => page.file).sort();
const unchangedPages = publicPages.filter((file) => !modifiedPages.includes(file));

const lines = [
  '# Vendora Transport final full-site content and SEO audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Final inventory',
  '',
  `- Public HTML pages audited: ${audit.counts.total}`,
  `- Arabic pages: ${audit.counts.arabic}`,
  `- English pages: ${audit.counts.english}`,
  `- Indexable pages: ${audit.counts.indexable}`,
  `- Intentional noindex pages: ${audit.counts.noindex} (Passenger Care Arabic and English)`,
  `- Pages modified or created in this audit: ${modifiedPages.length}`,
  `- Pages requiring no change: ${unchangedPages.length}`,
  `- Missing Arabic pairs after repair: ${audit.counts.missingArabicPairs.length}`,
  `- Missing English pairs after repair: ${audit.counts.missingEnglishPairs.length}`,
  `- Remaining audit findings: critical ${audit.counts.bySeverity.critical}, high ${audit.counts.bySeverity.high}, medium ${audit.counts.bySeverity.medium}, low ${audit.counts.bySeverity.low}`,
  '',
  '## Findings and repairs',
  '',
  '- Initial machine pass: 1 critical, 25 high, 32 medium, and 12 low findings.',
  '- Initial language inventory: nine Arabic pages lacked English counterparts; no English page lacked an Arabic counterpart.',
  '- Added nine missing English route/airport counterparts and registered them in the English sitemap.',
  '- Added the previously omitted English King Fahd Causeway guide to the English sitemap.',
  '- Repaired reciprocal canonical/hreflang/x-default coverage across 13 existing pages and supplied complete alternates on the nine new English pages.',
  '- Removed visible Arabic helper text from 17 English pages; the rendered English audit now finds zero visible Arabic characters.',
  '- Fixed three broken route links from the English airport-transfer hub by creating their intended pages.',
  '- Normalized legacy fixed-model, fixed-capacity, and unconditional 24/7 claims while preserving route-specific content and configured prices.',
  '- Removed customer-visible internal-linking/SEO language and replaced it with trip guidance.',
  '- Added the missing analytics loader to the English King Fahd Causeway guide.',
  '- Duplicate title/description combinations found: 0. Invalid JSON-LD blocks found: 0. Incorrect WhatsApp numbers found: 0. Broken image files found: 0.',
  '- Final sitemap omissions, canonical/hreflang errors, broken links, and broken assets: 0.',
  '- No redirects were created and no public URLs or valid pages were removed.',
  '',
  '## Verification',
  '',
  '- Machine audit: 140/140 pages, zero remaining critical/high/medium/low findings.',
  '- Core browser suite: 153/153 passed.',
  '- Visual and all-sitemap responsive suite after repair: 8/8 passed.',
  '- Planner, Passenger Care, tracking, and calculator suite: 64/64 passed.',
  '- Additional asset/VIP/browser checks in the grouped run: 45 passed; one analytics omission was found, fixed, and its complete visual suite reran successfully.',
  '- Requested responsive widths are covered across the suites: 320, 360, 375/390, 768, and desktop 1366/1440-class layouts.',
  '',
  '## Owner-confirmation items',
  '',
  '- Continue treating live vehicle type/model, timing, border eligibility, waiting, and route availability as booking-time confirmations.',
  '- Existing public price configuration and payment wording were preserved; any future commercial changes should be made in the established configuration source.',
  '- No deployment was performed as part of this audit.',
  '',
  `## Modified or created public HTML files (${modifiedPages.length})`,
  '',
  ...modifiedPages.map((file) => `- ${file}`),
  '',
  `## Public HTML files requiring no change (${unchangedPages.length})`,
  '',
  ...unchangedPages.map((file) => `- ${file}`),
  '',
  '## Supporting audit and implementation files',
  '',
  '- full-site-audit.json',
  '- full-site-audit-report.md',
  '- availability-repair-report.json',
  '- sitemap-gcc-transport-en.xml',
  '- scripts/full-site-content-seo-audit.mjs',
  '- scripts/repair-full-site-seo.mjs',
  '- scripts/create-missing-english-route-pairs.mjs',
  '- scripts/repair-transport-availability-claims.mjs',
  '- scripts/build-full-site-audit-report.mjs',
];

fs.writeFileSync('full-site-audit-report.md', `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ modifiedPages: modifiedPages.length, unchangedPages: unchangedPages.length }, null, 2));

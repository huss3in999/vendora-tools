import fs from 'fs';

const filePath = 'public/bahrain-saudi-gcc-transport/site.css';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update lines around 3042
const target1 = `  .vip-app-hero,
  .vip-content-hero { padding: 0 !important; }
  .vip-app-hero > .container,
  .vip-content-hero > .container { width: 100% !important; }
  .vip-app-hero-grid,
  .vip-content-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) !important;
    min-height: 500px;
    gap: 0 !important;
  }`;

const replace1 = `  .vip-app-hero,
  .vip-content-hero,
  body.vip-transport:not(.transport-hub) main > :is(.hero, .premium-hero, .planner-hero) { padding: 0 !important; }
  .vip-app-hero > .container,
  .vip-content-hero > .container,
  body.vip-transport:not(.transport-hub) main > :is(.hero, .premium-hero, .planner-hero) > .container { width: 100% !important; max-width: 100% !important; padding-inline: 0 !important; }
  .vip-app-hero-grid,
  .vip-content-hero-grid,
  body.vip-transport:not(.transport-hub) main > :is(.hero, .premium-hero, .planner-hero) :is(.hero-grid, .premium-hero-grid, .planner-hero-grid) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) !important;
    min-height: 0;
    gap: 0 !important;
  }`;

// 2. Update lines around 3231
const target2 = `  .vip-content-hero-grid {
    display: grid;
    min-height: 0;
    background: var(--vip-navy);
  }
  .vip-content-hero-visual {
    position: relative;
    inset: auto;
    order: -1;
    min-height: 220px;
    height: 220px;
    border-bottom: 1px solid rgba(200, 169, 107, 0.3);
  }
  .vip-content-hero-visual .vip-page-hero-image { min-height: 220px; height: 220px; object-position: center; }
  .vip-content-hero-copy {
    position: relative;
    align-self: auto;
    padding: 22px 20px 26px !important;
    background: var(--vip-navy);
  }
  .vip-content-hero-copy .hero-actions { margin-top: 14px; }`;

const replace2 = `  .vip-content-hero-grid,
  body.vip-transport:not(.transport-hub) main > :is(.hero, .premium-hero, .planner-hero) :is(.hero-grid, .premium-hero-grid, .planner-hero-grid) {
    display: grid;
    min-height: 0;
    background: var(--vip-navy);
  }
  .vip-content-hero-visual,
  body.vip-transport:not(.transport-hub) :is(.hero-grid, .premium-hero-grid, .planner-hero-grid) > :is(.hero-side, .hero-media-card, .planner-media-frame) {
    position: relative;
    inset: auto;
    order: -1;
    min-height: 220px;
    height: 220px;
    border-bottom: 1px solid rgba(200, 169, 107, 0.3);
  }
  .vip-content-hero-visual .vip-page-hero-image,
  body.vip-transport:not(.transport-hub) :is(.hero-grid, .premium-hero-grid, .planner-hero-grid) > :is(.hero-side, .hero-media-card, .planner-media-frame) img {
    min-height: 220px;
    height: 220px;
    object-position: center;
  }
  .vip-content-hero-copy,
  body.vip-transport:not(.transport-hub) :is(.hero-grid, .premium-hero-grid, .planner-hero-grid) > :is(.hero-copy, .premium-hero-copy, .planner-hero-copy) {
    position: relative;
    align-self: auto;
    padding: 22px 20px 26px !important;
    background: var(--vip-navy);
  }
  .vip-content-hero-copy .hero-actions,
  body.vip-transport:not(.transport-hub) :is(.hero-grid, .premium-hero-grid, .planner-hero-grid) > :is(.hero-copy, .premium-hero-copy, .planner-hero-copy) .hero-actions {
    margin-top: 14px;
  }`;

// 3. Update lines around 3408
const target3 = `  body.vip-content-app:not(.planner-page) .vip-content-hero-visual {
    min-height: 0;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  body.vip-content-app:not(.planner-page) .vip-content-hero-visual .vip-page-hero-image {
    min-height: 0;
    height: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }`;

const replace3 = `  body.vip-content-app:not(.planner-page) .vip-content-hero-visual,
  body.vip-transport:not(.transport-hub):not(.planner-page) :is(.hero-grid, .premium-hero-grid) > :is(.hero-side, .hero-media-card) {
    min-height: 0;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  body.vip-content-app:not(.planner-page) .vip-content-hero-visual .vip-page-hero-image,
  body.vip-transport:not(.transport-hub):not(.planner-page) :is(.hero-grid, .premium-hero-grid) > :is(.hero-side, .hero-media-card) img {
    min-height: 0;
    height: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }`;

function replaceNormalized(src, search, rep) {
  const normSearch = search.replace(/\r\n/g, '\n');
  const normRep = rep.replace(/\r\n/g, '\n');
  const isCrlf = src.includes('\r\n');
  const normSrc = src.replace(/\r\n/g, '\n');
  if (!normSrc.includes(normSearch)) {
    throw new Error('Search string not found: ' + normSearch.slice(0, 40));
  }
  const result = normSrc.replace(normSearch, normRep);
  return isCrlf ? result.replace(/\n/g, '\r\n') : result;
}

content = replaceNormalized(content, target1, replace1);
content = replaceNormalized(content, target2, replace2);
content = replaceNormalized(content, target3, replace3);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated site.css with CLS layout stabilization rules!');

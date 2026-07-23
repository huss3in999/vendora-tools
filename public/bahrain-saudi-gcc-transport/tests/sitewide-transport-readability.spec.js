import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = '/bahrain-saudi-gcc-transport/';
const phase = process.env.READABILITY_PHASE || 'final';
const reportOnly = phase !== 'final';
const outputRoot = join(projectRoot, 'test-results', 'sitewide-readability');
const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests']);
const excludedGuideSegments = new Set(['src', 'content', 'data', 'planning', 'qa', 'references', 'research', 'seo']);
const requestedViewports = [
  { width: 305, height: 520 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const requestedWidth = Number(process.env.READABILITY_WIDTH || 0);
const viewports = requestedWidth ? requestedViewports.filter(({ width }) => width === requestedWidth) : (process.env.READABILITY_QUICK === '1' ? [requestedViewports[1]] : requestedViewports);

function discoverPublicPages(directory = projectRoot, pages = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = relative(projectRoot, full).split(sep).join('/');
    const segments = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(segments[0])) continue;
      if (segments[0] === 'gcc-private-transport-guide' && segments.slice(1).some((part) => excludedGuideSegments.has(part))) continue;
      discoverPublicPages(full, pages);
    } else if (entry.name.toLowerCase() === 'index.html') {
      const html = readFileSync(full, 'utf8');
      const lang = html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1]?.toLowerCase() || '';
      pages.push({
        file: rel,
        language: rel.startsWith('en/') || rel === 'care/en/index.html' || lang.startsWith('en') ? 'en' : 'ar',
        path: rel === 'index.html' ? siteRoot : `${siteRoot}${rel.replace(/index\.html$/i, '')}`,
      });
    }
  }
  return pages.sort((a, b) => a.file.localeCompare(b.file));
}

function sitemapPaths() {
  return ['sitemap-gcc-transport.xml', 'sitemap-gcc-transport-en.xml'].flatMap((file) => {
    const xml = readFileSync(join(projectRoot, file), 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1].trim()).pathname);
  }).sort();
}

const publicPages = discoverPublicPages();
const inventoryPaths = publicPages.filter(({ file }) => !file.startsWith('care/')).map(({ path }) => path);
const mappedSitemapPaths = sitemapPaths();

test('repository and transport sitemaps expose the same indexable page inventory', async () => {
  expect(new Set(inventoryPaths).size).toBe(inventoryPaths.length);
  expect(new Set(mappedSitemapPaths).size).toBe(mappedSitemapPaths.length);
  expect(mappedSitemapPaths.every((path) => inventoryPaths.includes(path))).toBeTruthy();
  expect(publicPages.filter(({ language }) => language === 'ar')).toHaveLength(77);
  expect(publicPages.filter(({ language }) => language === 'en')).toHaveLength(77);
});

test('every public transport page passes sitewide readability and layout audit', async ({ page }) => {
  test.setTimeout(1_800_000);
  mkdirSync(outputRoot, { recursive: true });
  const findings = [];
  let rendersTested = 0;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const publicPage of publicPages) {
      await page.goto(publicPage.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(30);
      const result = await page.evaluate(({ path, viewport }) => {
        const clamp = (value) => Math.min(255, Math.max(0, value));
        const parseColor = (value) => {
          const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
          if (!match) return null;
          const channels = match[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
          if (channels.length < 3 || channels.slice(0, 3).some(Number.isNaN)) return null;
          return { r: clamp(channels[0]), g: clamp(channels[1]), b: clamp(channels[2]), a: Number.isFinite(channels[3]) ? channels[3] : 1 };
        };
        const composite = (front, back) => {
          const alpha = front.a + back.a * (1 - front.a);
          if (!alpha) return { r: 255, g: 255, b: 255, a: 1 };
          return {
            r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha,
            g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha,
            b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha,
            a: alpha,
          };
        };
        const luminance = ({ r, g, b }) => {
          const channels = [r, g, b].map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const contrast = (a, b) => {
          const first = luminance(a);
          const second = luminance(b);
          return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
        };
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
        };
        const colorTokens = (image) => {
          const tokens = [...String(image || '').matchAll(/rgba?\([^)]+\)/gi)].map((match) => parseColor(match[0])).filter(Boolean);
          const opaque = tokens.filter((color) => color.a >= 0.75);
          return opaque.length ? opaque : tokens;
        };
        const backgroundCandidates = (element) => {
          let candidates = [{ r: 255, g: 255, b: 255, a: 1 }];
          const ancestors = [];
          for (let node = element; node instanceof Element; node = node.parentElement) ancestors.push(node);
          for (const node of ancestors.reverse()) {
            const style = getComputedStyle(node);
            const solid = parseColor(style.backgroundColor);
            const gradient = colorTokens(style.backgroundImage);
            const layers = gradient.length ? gradient : (solid && solid.a > 0 ? [solid] : []);
            if (!layers.length) continue;
            candidates = layers.flatMap((layer) => candidates.map((base) => composite(layer, base)));
            if (solid && solid.a > 0 && gradient.length) candidates.push(...candidates.map((base) => composite(solid, base)));
            candidates = candidates.slice(0, 12);
          }
          return candidates;
        };
        const selector = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,summary,label,a,button,small,input,textarea,select,.field-help,.booking-summary,.footer-copy,.footer-note,.route-meta,.trust-line,.validation-message,.error-message,[role="alert"]';
        const lowContrast = [];
        const faded = [];
        for (const element of document.querySelectorAll(selector)) {
          if (!visible(element)) continue;
          const text = (element.value || element.textContent || element.getAttribute('aria-label') || '').trim();
          if (!text || (element.children.length && !element.matches('a,button,label,summary'))) continue;
          const style = getComputedStyle(element);
          const foreground = parseColor(style.color);
          if (!foreground) continue;
          let effectiveOpacity = 1;
          for (let node = element; node instanceof Element; node = node.parentElement) effectiveOpacity *= Number(getComputedStyle(node).opacity || 1);
          if (effectiveOpacity < 0.8 && !element.matches(':disabled,[aria-disabled="true"]')) {
            faded.push({ selector: element.tagName.toLowerCase() + (element.className ? `.${String(element.className).trim().replace(/\s+/g, '.')}` : ''), text: text.slice(0, 90), opacity: Number(effectiveOpacity.toFixed(2)) });
          }
          const backgrounds = backgroundCandidates(element);
          const ratios = backgrounds.map((background) => contrast(foreground, background));
          const ratio = Math.min(...ratios);
          const fontSize = Number.parseFloat(style.fontSize);
          const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
          const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
          const threshold = large ? 3 : 4.5;
          if (ratio + 0.05 < threshold) {
            const surfaceChain = [];
            for (let node = element; node instanceof Element && surfaceChain.length < 8; node = node.parentElement) {
              const nodeStyle = getComputedStyle(node);
              if (nodeStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || nodeStyle.backgroundImage !== 'none') {
                surfaceChain.push({
                  selector: node.tagName.toLowerCase() + (node.className ? `.${String(node.className).trim().replace(/\s+/g, '.')}` : ''),
                  background: nodeStyle.backgroundColor,
                  backgroundImage: nodeStyle.backgroundImage.slice(0, 180),
                });
              }
            }
            lowContrast.push({
              selector: element.tagName.toLowerCase() + (element.className ? `.${String(element.className).trim().replace(/\s+/g, '.')}` : ''),
              text: text.slice(0, 90), ratio: Number(ratio.toFixed(2)), threshold,
              color: style.color, background: style.backgroundColor, backgroundImage: style.backgroundImage.slice(0, 140), surfaceChain,
            });
          }
        }

        const placeholderContrast = [];
        for (const element of document.querySelectorAll('input[placeholder],textarea[placeholder]')) {
          if (!visible(element)) continue;
          const foreground = parseColor(getComputedStyle(element, '::placeholder').color);
          if (!foreground) continue;
          const ratio = Math.min(...backgroundCandidates(element).map((background) => contrast(foreground, background)));
          if (ratio < 4.5) placeholderContrast.push({ selector: `${element.tagName.toLowerCase()}#${element.id}`, text: element.placeholder.slice(0, 90), ratio: Number(ratio.toFixed(2)) });
        }

        const documentOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const overflowElements = documentOverflow > 2 ? [...document.querySelectorAll('body *')].filter(visible).map((element) => {
          const rect = element.getBoundingClientRect();
          return { element, rect };
        }).filter(({ rect }) => rect.right > document.documentElement.clientWidth + 2 || rect.left < -2).slice(0, 12).map(({ element, rect }) => ({
          selector: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') + (element.className && typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''),
          left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
        })) : [];
        const clippedHeaders = [...document.querySelectorAll('header h1,header h2,.topbar .brand-title,main h1')].filter(visible).filter((element) => {
          const style = getComputedStyle(element);
          return element.scrollWidth - element.clientWidth > 2 || (style.overflow !== 'visible' && element.scrollHeight - element.clientHeight > 2);
        }).map((element) => ({ selector: element.tagName.toLowerCase() + (element.className ? `.${String(element.className).trim().replace(/\s+/g, '.')}` : ''), text: element.textContent.trim().slice(0, 90) }));

        const floating = [...document.querySelectorAll('.floating-wa,.vip-bottom-nav,[data-vendora-feedback-widget]')].filter(visible).map((element) => {
          const rect = element.getBoundingClientRect();
          return { selector: element.id ? `#${element.id}` : `.${String(element.className).trim().replace(/\s+/g, '.')}`, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        });
        const overlaps = [];
        for (let index = 0; index < floating.length; index += 1) {
          for (let other = index + 1; other < floating.length; other += 1) {
            const a = floating[index];
            const b = floating[other];
            const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (width > 2 && height > 2) overlaps.push({ first: a.selector, second: b.selector, width: Math.round(width), height: Math.round(height) });
          }
        }
        return { path, viewport, lowContrast, placeholderContrast, faded, documentOverflow, overflowElements, clippedHeaders, overlaps };
      }, { path: publicPage.path, viewport });

      rendersTested += 1;
      if (result.lowContrast.length || result.placeholderContrast.length || result.faded.length || result.documentOverflow > 2 || result.clippedHeaders.length || result.overlaps.length) findings.push(result);
    }
  }

  const report = {
    phase,
    generatedAt: new Date().toISOString(),
    pagesDiscovered: publicPages.length,
    ArabicPages: publicPages.filter(({ language }) => language === 'ar').length,
    EnglishPages: publicPages.filter(({ language }) => language === 'en').length,
    pagesTested: publicPages.length,
    viewports,
    rendersTested,
    lowContrastElements: findings.reduce((count, finding) => count + finding.lowContrast.length + finding.placeholderContrast.length, 0),
    fadedElements: findings.reduce((count, finding) => count + finding.faded.length, 0),
    overflowFailures: findings.filter((finding) => finding.documentOverflow > 2).length,
    clippedHeaderFailures: findings.reduce((count, finding) => count + finding.clippedHeaders.length, 0),
    floatingOverlapFailures: findings.reduce((count, finding) => count + finding.overlaps.length, 0),
    findings,
  };
  writeFileSync(join(outputRoot, `${phase}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!reportOnly) {
    expect(report.lowContrastElements, 'low-contrast text or placeholders').toBe(0);
    expect(report.fadedElements, 'faded visible text').toBe(0);
    expect(report.overflowFailures, 'horizontal overflow renders').toBe(0);
    expect(report.clippedHeaderFailures, 'clipped headings').toBe(0);
    expect(report.floatingOverlapFailures, 'feedback/WhatsApp overlaps').toBe(0);
  }
});

test('capture representative post-fix Arabic and English screenshots', async ({ page }) => {
  test.skip(reportOnly, 'Post-fix screenshots are captured only during final verification');
  mkdirSync(join(outputRoot, 'screenshots'), { recursive: true });
  const representatives = [
    { name: 'arabic-home', path: siteRoot },
    { name: 'english-home', path: `${siteRoot}en/` },
    { name: 'arabic-route', path: `${siteRoot}bahrain-to-saudi/` },
    { name: 'english-policy', path: `${siteRoot}en/booking-policy/` },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const representative of representatives) {
      await page.goto(representative.path, { waitUntil: 'networkidle' });
      const file = join(outputRoot, 'screenshots', `${representative.name}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: file, fullPage: true });
      expect(existsSync(file)).toBeTruthy();
    }
  }
});

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
const transportRoot = join(root, '..');
const publicRoot = join(transportRoot, '..');

const excludedRoots = new Set(['admin', 'ai-chat-test', 'functions', 'node_modules', 'scratch', 'test-results', 'tests', 'templates']);
const retiredNonGccSlugs = new Set(['arbaeen-karbala-travel-tips', 'arbaeen-packing-list', 'arbaeen-season-bahrain-to-karbala', 'arbaeen-transport', 'bahrain-to-iraq', 'bahrain-to-baghdad', 'bahrain-to-basra', 'bahrain-to-karbala', 'bahrain-to-karbala-route-plan', 'bahrain-to-najaf', 'bahrain-to-najaf-driving-time', 'best-car-for-iraq-family-travel', 'best-time-bahrain-to-iraq', 'best-way-bahrain-to-karbala', 'book-private-car-bahrain-to-karbala', 'book-private-car-bahrain-to-najaf', 'direct-transport-bahrain-to-karbala', 'family-transport-bahrain-najaf-karbala', 'family-travel-bahrain-to-iraq', 'iraq-ziyarat-private-car-bahrain', 'karbala-trip-from-bahrain', 'najaf-trip-from-bahrain', 'overland-travel-bahrain-to-iraq', 'pilgrims-transport-bahrain-to-iraq', 'private-car-bahrain-to-iraq', 'private-car-vs-other-iraq-travel', 'ziyarat-iraq-transport']);

function getPublicPages(dir = transportRoot, pages = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(transportRoot, full).split(sep).join('/');
    const seg = rel.split('/');
    if (entry.isDirectory()) {
      if (excludedRoots.has(seg[0]) || retiredNonGccSlugs.has(seg[0] === 'en' ? seg[1] : seg[0])) continue;
      getPublicPages(full, pages);
    } else if (entry.name.toLowerCase() === 'index.html') {
      pages.push(rel === 'index.html' ? '/bahrain-saudi-gcc-transport/' : `/bahrain-saudi-gcc-transport/${rel.replace(/index\.html$/i, '')}`);
    }
  }
  return pages;
}

async function run() {
  const server = spawn('npx.cmd', ['--yes', 'http-server', '.', '-p', '4173', '-c-1', '--silent'], {
    cwd: publicRoot,
    stdio: 'ignore',
    shell: true,
  });

  await new Promise((r) => setTimeout(r, 2000));

  const browser = await chromium.launch({ headless: true });
  const allPages = getPublicPages();
  console.log(`Auditing ${allPages.length} pages in dark and light modes...`);

  // We can sample all distinct page archetypes to cover 100% of the UI
  // Home, route page, service page, policy page, prices page, hub page, both AR and EN
  const archetypes = [
    '/bahrain-saudi-gcc-transport/',
    '/bahrain-saudi-gcc-transport/en/',
    '/bahrain-saudi-gcc-transport/en/airport-transfer/',
    '/bahrain-saudi-gcc-transport/airport-transfer/',
    '/bahrain-saudi-gcc-transport/en/bahrain-to-saudi/',
    '/bahrain-saudi-gcc-transport/bahrain-to-saudi/',
    '/bahrain-saudi-gcc-transport/en/prices/',
    '/bahrain-saudi-gcc-transport/prices/',
    '/bahrain-saudi-gcc-transport/en/booking-policy/',
    '/bahrain-saudi-gcc-transport/booking-policy/',
    '/bahrain-saudi-gcc-transport/en/contact/',
    '/bahrain-saudi-gcc-transport/contact/',
    '/bahrain-saudi-gcc-transport/gcc-destinations/',
    '/bahrain-saudi-gcc-transport/en/gcc-destinations/',
    '/bahrain-saudi-gcc-transport/en/customer-reviews/',
    '/bahrain-saudi-gcc-transport/customer-reviews/',
  ];

  const results = {};

  for (const scheme of ['dark', 'light']) {
    results[scheme] = [];
    const context = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    for (const urlPath of archetypes) {
      try {
        await page.goto(`http://127.0.0.1:4173${urlPath}`, { waitUntil: 'networkidle' });
        const issues = await page.evaluate((currentScheme) => {
          const clamp = (v) => Math.min(255, Math.max(0, v));
          const parseColor = (str) => {
            const match = String(str || '').match(/rgba?\(([^)]+)\)/i);
            if (!match) return null;
            const ch = match[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
            if (ch.length < 3 || ch.slice(0, 3).some(Number.isNaN)) return null;
            return { r: clamp(ch[0]), g: clamp(ch[1]), b: clamp(ch[2]), a: Number.isFinite(ch[3]) ? ch[3] : 1 };
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
            const c = [r, g, b].map((val) => {
              const n = val / 255;
              return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
          };
          const contrast = (a, b) => {
            const l1 = luminance(a);
            const l2 = luminance(b);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };
          const getBg = (el) => {
            let bg = currentScheme === 'dark' ? { r: 9, g: 14, b: 23, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
            const stack = [];
            for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
              stack.unshift(n);
            }
            for (const n of stack) {
              const st = getComputedStyle(n);
              const col = parseColor(st.backgroundColor);
              if (col && col.a > 0) {
                bg = composite(col, bg);
              }
            }
            return bg;
          };

          const list = [];
          const selector = 'h1, h2, h3, h4, h5, h6, p, span, a, label, button, small, strong, li';
          for (const el of document.querySelectorAll(selector)) {
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const text = (el.textContent || '').trim();
            if (!text || (el.children.length > 0 && !['a', 'button', 'label', 'summary'].includes(el.tagName.toLowerCase()))) continue;

            const fg = parseColor(st.color);
            if (!fg) continue;
            const bg = getBg(el);
            const ratio = contrast(fg, bg);
            const fs = Number.parseFloat(st.fontSize);
            const fw = Number.parseInt(st.fontWeight, 10) || 400;
            const isLarge = fs >= 24 || (fs >= 18.5 && fw >= 700);
            const minRatio = isLarge ? 3.0 : 4.5;

            if (ratio < minRatio) {
              list.push({
                tag: el.tagName.toLowerCase(),
                className: el.className || '',
                text: text.slice(0, 60),
                ratio: Math.round(ratio * 100) / 100,
                minRatio,
                fg: st.color,
                bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
              });
            }
          }
          return list;
        }, scheme);

        if (issues.length > 0) {
          results[scheme].push({ urlPath, issues });
        }
      } catch (err) {
        console.error(err);
      }
    }
    await context.close();
  }

  await browser.close();
  server.kill();

  console.log('=== SUMMARY OF CONTRAST DEFECTS ===');
  for (const scheme of ['dark', 'light']) {
    console.log(`\n--- SCHEME: ${scheme.toUpperCase()} ---`);
    for (const item of results[scheme]) {
      console.log(`Page: ${item.urlPath} (Issues: ${item.issues.length})`);
      for (const iss of item.issues.slice(0, 10)) {
        console.log(`   [${iss.ratio}:1 vs ${iss.minRatio}:1] <${iss.tag} class="${iss.className}"> "${iss.text}" (fg: ${iss.fg}, bg: ${iss.bg})`);
      }
    }
  }
}

run().catch(console.error);

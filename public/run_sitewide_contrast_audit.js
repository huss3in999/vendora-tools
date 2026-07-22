const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const rootDir = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public';
const pagesData = JSON.parse(fs.readFileSync(path.join(rootDir, 'discovered_pages.json'), 'utf8'));

const VIEWPORTS = [
  { name: 'Ultra-small Mobile', width: 305, height: 520 },
  { name: 'Modern Smartphone', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1440, height: 900 },
];

const CONCURRENCY = 8;

async function runAudit() {
  console.log(`Starting Concurrent Sitewide Contrast Audit across ${pagesData.allPages.length} pages...`);
  const browser = await chromium.launch({ headless: true });

  let totalLowContrastElements = 0;

  for (const viewport of VIEWPORTS) {
    console.log(`Auditing viewport: ${viewport.name} (${viewport.width}x${viewport.height})...`);
    
    // Batch processing
    for (let i = 0; i < pagesData.allPages.length; i += CONCURRENCY) {
      const chunk = pagesData.allPages.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (pagePath) => {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        const url = `http://127.0.0.1:4173${pagePath}`;
        try {
          const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (!response || response.status() !== 200) {
            await context.close();
            return;
          }

          const count = await page.evaluate(() => {
            function getEffectiveBgColor(el) {
              let cur = el;
              while (cur && cur !== document.documentElement) {
                const bg = window.getComputedStyle(cur).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                  return bg;
                }
                cur = cur.parentElement;
              }
              return window.getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
            }

            function getLuminanceRGB(r, g, b) {
              const [aR, aG, aB] = [r, g, b].map((v) => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
              });
              return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
            }

            function parseColor(str) {
              const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
              if (!m) return null;
              return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: m[4] !== undefined ? parseFloat(m[4]) : 1.0 };
            }

            function getContrastRatio(fgStr, bgStr) {
              const fg = parseColor(fgStr);
              const bg = parseColor(bgStr);
              if (!fg || !bg) return 21;
              const l1 = getLuminanceRGB(fg.r, fg.g, fg.b);
              const l2 = getLuminanceRGB(bg.r, bg.g, bg.b);
              const max = Math.max(l1, l2);
              const min = Math.min(l1, l2);
              return (max + 0.05) / (min + 0.05);
            }

            const textNodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, a, label, span, button, small, div');
            let lowCount = 0;
            textNodes.forEach((node) => {
              if (!node.innerText || !node.innerText.trim()) return;
              const rect = node.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return;

              const style = window.getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

              const fgColor = style.color;
              const bgColor = getEffectiveBgColor(node);
              const ratio = getContrastRatio(fgColor, bgColor);

              const fontSize = parseFloat(style.fontSize);
              const isBold = parseInt(style.fontWeight) >= 600 || style.fontWeight === 'bold';
              const reqRatio = (fontSize >= 24 || (fontSize >= 18.66 && isBold)) ? 3.0 : 4.5;

              if (ratio < reqRatio) {
                lowCount++;
              }
            });
            return lowCount;
          });

          totalLowContrastElements += count;
        } catch (err) {
          // ignore timeouts
        } finally {
          await context.close();
        }
      }));
    }
  }

  await browser.close();
  console.log(`AUDIT COMPLETE. Total low-contrast elements found across all 159 pages & 4 viewports: ${totalLowContrastElements}`);
  fs.writeFileSync(path.join(rootDir, 'audit_result.json'), JSON.stringify({ totalLowContrastElements }, null, 2));
}

runAudit();

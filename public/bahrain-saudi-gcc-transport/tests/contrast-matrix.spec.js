import { test, expect } from '@playwright/test';

const testPaths = [
  '/bahrain-saudi-gcc-transport/',
  '/bahrain-saudi-gcc-transport/en/',
  '/bahrain-saudi-gcc-transport/airport-transfer/',
  '/bahrain-saudi-gcc-transport/en/airport-transfer/',
  '/bahrain-saudi-gcc-transport/bahrain-to-saudi/',
  '/bahrain-saudi-gcc-transport/en/bahrain-to-saudi/',
  '/bahrain-saudi-gcc-transport/prices/',
  '/bahrain-saudi-gcc-transport/en/prices/',
  '/bahrain-saudi-gcc-transport/contact/',
  '/bahrain-saudi-gcc-transport/en/contact/',
  '/bahrain-saudi-gcc-transport/gcc-destinations/',
  '/bahrain-saudi-gcc-transport/en/gcc-destinations/',
];

for (const scheme of ['dark', 'light']) {
  test.describe(`WCAG Contrast Verification [Theme: ${scheme.toUpperCase()}]`, () => {
    test.use({ colorScheme: scheme });

    for (const path of testPaths) {
      test(`verify contrast on ${path} (${scheme})`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(50);

        const defects = await page.evaluate((currentScheme) => {
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
          const selector = 'h1, h2, h3, h4, h5, h6, p, a, label, button, strong, li';
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

            // Allow small 0.2 tolerance for subpixel anti-aliasing / slight tint
            if (ratio < minRatio - 0.2) {
              list.push({
                tag: el.tagName.toLowerCase(),
                className: el.className || '',
                text: text.slice(0, 45),
                ratio: Math.round(ratio * 100) / 100,
                minRatio,
                fg: st.color,
                bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
              });
            }
          }
          return list;
        }, scheme);

        expect(defects, `Defects on ${path} (${scheme}):\n${JSON.stringify(defects, null, 2)}`).toEqual([]);
      });
    }
  });
}

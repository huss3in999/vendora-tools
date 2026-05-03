import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PAGE_TEMPLATES, instantiateTemplateBlocks } from "../app/modules/page-builder/templates";
import { sanitizePublicHtmlForEmbed } from "../app/modules/page-builder/html-sanitize";
import { sanitizePageTheme } from "../app/modules/page-builder/theme";

test("PAGE_TEMPLATES apply sane themes and blocks", () => {
  expect(PAGE_TEMPLATES.length).toBeGreaterThanOrEqual(7);

  for (const template of PAGE_TEMPLATES) {
    expect(template.id.length).toBeGreaterThan(0);
    expect(template.blocks.length).toBeGreaterThan(0);
    sanitizePageTheme(template.theme);

    const blocks = instantiateTemplateBlocks(template, () => "blk_smoketestvalidation00");
    expect(blocks.length).toBe(template.blocks.length);
    for (const block of blocks) {
      expect(block.id.startsWith("blk_")).toBeTruthy();
    }
  }
});

test("Phase 1 repository documents deployment readiness", async () => {
  const readme = await readFile("README.md", "utf8");
  expect(readme).toContain("Phase 1 readiness checklist");
  expect(readme).toContain("npm run db:migrate:remote");
  expect(readme).toContain("npm run seed:super-admin -- --remote");
});

test("Wrangler config keeps the expected D1 binding", async () => {
  const wrangler = await readFile("wrangler.toml", "utf8");
  expect(wrangler).toContain('binding = "DB"');
  expect(wrangler).toContain('database_name = "smart-page-platform"');
  expect(wrangler).toContain('migrations_dir = "./migrations"');
});

test("HTML embed sanitizer keeps safe markup but blocks dangerous code", () => {
  const input = `\`\`\`html
<style>body{background:#faf8f6}.x{color:#111}</style>
<div class="x"><h2>Hello</h2><a href="https://example.com">Go</a></div>
<script>alert(1)</script>
<iframe src="https://evil.test"></iframe>
<a href="javascript:alert(1)">bad</a>
\`\`\``;

  const out = sanitizePublicHtmlForEmbed(input);
  expect(out).toContain("<style>");
  expect(out).toContain("<h2>");
  expect(out).toContain('href="https://example.com"');
  expect(out).not.toContain("<script");
  expect(out).not.toContain("<iframe");
  expect(out).not.toContain("javascript:");
});

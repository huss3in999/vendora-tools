import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PAGE_TEMPLATES, instantiateTemplateBlocks } from "../app/modules/page-builder/templates";
import {
  buildSandboxedHtmlDocument,
  sanitizeHtmlForSandboxStorage,
  sanitizePublicHtmlForEmbed
} from "../app/modules/page-builder/html-sanitize";
import { sanitizePageTheme } from "../app/modules/page-builder/theme";
import { normalizeAnnualLeaveRange, normalizeRequestTarget, weekStartForDate } from "../app/modules/rota/week";

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

test("trusted hosted HTML preserves authored responsive markup and scripts", () => {
  const input = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>@media (max-width: 600px){.app{width:100%}}</style></head><body><iframe src="https://example.com"></iframe><script>window.hosted = true</script></body></html>`;

  expect(sanitizeHtmlForSandboxStorage(input, undefined, { allowScripts: true })).toBe(input);
  const document = buildSandboxedHtmlDocument(input, undefined, { allowScripts: true });
  expect(document).toContain('content="width=device-width, initial-scale=1, viewport-fit=cover"');
  expect(document).toContain("@media (max-width: 600px)");
  expect(document).toContain('<iframe src="https://example.com"></iframe>');
  expect(document).toContain("window.hosted = true");
  expect(document).not.toContain("ui-sans-serif");
});

test("COS rota weeks run Friday through Thursday", () => {
  expect(weekStartForDate("2026-08-28", 5)).toBe("2026-08-28");
  expect(weekStartForDate("2026-09-03", 5)).toBe("2026-08-28");
});

test("late COS requests move to the next eligible rota week", () => {
  const settings = {
    timezone: "Asia/Bahrain",
    timezoneOffsetMinutes: 180,
    weekStartDay: 5,
    cutoffDay: 0,
    cutoffTime: "23:59",
    totalStaff: 7,
    minimumMorning: 2,
    minimumClosing: 2,
    maxAbsentPerDay: 2,
    allowEmergencyOverride: true,
    shiftTemplatesJson: "{}"
  };
  const onTime = normalizeRequestTarget("2026-08-28", settings, new Date("2026-08-23T20:58:00.000Z"));
  expect(onTime.targetDate).toBe("2026-08-28");
  expect(onTime.isLate).toBeFalsy();

  const late = normalizeRequestTarget("2026-08-28", settings, new Date("2026-08-23T21:01:00.000Z"));
  expect(late.targetDate).toBe("2026-09-04");
  expect(late.weekStart).toBe("2026-09-04");
  expect(late.isLate).toBeTruthy();
});

test("annual leave keeps a From and To range and moves both dates after cutoff", () => {
  const settings = {
    timezone: "Asia/Bahrain", timezoneOffsetMinutes: 180, weekStartDay: 5, cutoffDay: 0,
    cutoffTime: "23:59", totalStaff: 7, minimumMorning: 2, minimumClosing: 2,
    maxAbsentPerDay: 2, allowEmergencyOverride: true, shiftTemplatesJson: "{}"
  };
  const leave = normalizeAnnualLeaveRange("2026-08-28", "2026-09-03", settings, new Date("2026-08-23T21:01:00.000Z"));
  expect(leave.originalTargetDate).toBe("2026-08-28");
  expect(leave.originalEndDate).toBe("2026-09-03");
  expect(leave.targetDate).toBe("2026-09-04");
  expect(leave.endDate).toBe("2026-09-10");
  expect(leave.durationDays).toBe(7);
});

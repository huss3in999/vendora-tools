import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const stripTomlComments = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^"'])#.*/, "$1"))
    .join("\n");

const files = {
  config: stripTomlComments(readFileSync(join(root, "wrangler.toml"), "utf8")),
  source: readFileSync(join(root, "src", "index.js"), "utf8")
};

const forbidden = [
  {
    name: "smart.getvendora.net in shortener config",
    value: /smart\.getvendora\.net/i,
    text: files.config
  },
  {
    name: "SMART_ORIGIN in shortener config",
    value: /\bSMART_ORIGIN\b/,
    text: files.config
  },
  {
    name: "smart short-domain mode in shortener source",
    value: /SHORT_DOMAIN_MODES\s*=\s*new Set\([^)]*["']smart["']/s,
    text: files.source
  },
  {
    name: "smart origin helper in shortener source",
    value: /\bsmartOrigin\s*\(/,
    text: files.source
  },
  {
    name: "smart host wildcard in shortener source",
    value: /startsWith\(["']smart\./,
    text: files.source
  }
];

const failures = forbidden.filter((rule) => rule.value.test(rule.text));

if (failures.length > 0) {
  console.error("Domain ownership check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.name}`);
  }
  console.error(
    "smart.getvendora.net belongs to ../smart-page-platform. Do not route it through vendora-branded-smart-links."
  );
  process.exit(1);
}

console.log("Domain ownership check passed.");

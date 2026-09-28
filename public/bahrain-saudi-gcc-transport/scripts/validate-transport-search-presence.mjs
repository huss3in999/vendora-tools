import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const here = resolve(process.cwd());
const root = resolve(here, "..", "..");
const smart = resolve(root, "smart-page-platform");
const links = resolve(root, "vendora-branded-smart-links");

const failures = [];
const mustContain = async (file, patterns) => {
  const text = await readFile(file, "utf8");
  for (const [label, pattern] of patterns) if (!pattern.test(text)) failures.push(`${label}: ${file}`);
  return text;
};

await mustContain(resolve(root, "public", "worker.js"), [
  ["canonical organization id", /https:\/\/getvendora\.net\/#organization/],
  ["canonical website id", /https:\/\/getvendora\.net\/#website/],
  ["410 retired tools", /status: 410/]
]);
await mustContain(resolve(smart, "app", "entry.server.tsx"), [["Smart central noindex", /X-Robots-Tag.*noindex/s]]);
await mustContain(resolve(smart, "app", "routes", "robots[.]txt.tsx"), [["Smart robots disallow", /Disallow: \/\"/]]);
await mustContain(resolve(smart, "app", "routes", "sitemap[.]xml.tsx"), [["Smart empty sitemap", /<urlset[^>]*><\/urlset>/s]]);
await mustContain(resolve(links, "src", "index.js"), [
  ["shortener HTML noindex", /X-Robots-Tag.*noindex/s],
  ["shortener robots disallow", /Disallow: \/\\n/]
]);
await mustContain(resolve(here, "en", "bahrain-to-kuwait", "index.html"), [["Kuwait title", /Bahrain to Kuwait Private Transport \| Vendora Transport/], ["Kuwait H1", /Bahrain to Kuwait Private Car with Driver/]]);
await mustContain(resolve(here, "en", "bahrain-to-riyadh", "index.html"), [["Bahrain-Riyadh title", /Bahrain to Riyadh Private Transport \| Vendora Transport/]]);
await mustContain(resolve(here, "en", "riyadh-to-bahrain", "index.html"), [["Riyadh-Bahrain title", /Riyadh to Bahrain Private Transport \| Vendora Transport/]]);

const sitemap = await readFile(resolve(root, "public", "sitemap.xml"), "utf8");
const retired = sitemap.match(/https:\/\/getvendora\.net\/(?:tools|calculators|calculator|guides|all-tools)\//i);
if (retired) failures.push("main sitemap advertises retired content");

if (failures.length) {
  console.error(failures.map((item) => `FAIL ${item}`).join("\n"));
  process.exit(1);
}
console.log("Transport search presence regression checks passed.");

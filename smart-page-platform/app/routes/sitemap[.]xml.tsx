import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { pageRepository } from "~/modules/page-builder/page-repository.server";
import { getD1Database } from "~/modules/db/db.server";

function escapeXml(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const db = getD1Database(context);

  const today = new Date().toISOString().slice(0, 10);
  let urls: { loc: string; lastmod: string; changefreq?: string; priority?: string }[] = [
    {
      loc: `${origin}/`,
      lastmod: today,
      changefreq: "weekly",
      priority: "1.0"
    }
  ];

  if (db) {
    const rows = await pageRepository(db).listIndexablePublishedPages();
    urls = [
      ...urls,
      ...rows.map((row) => ({
        loc: `${origin}/p/${encodeURIComponent(row.code)}`,
        lastmod: row.updated_at.slice(0, 10),
        changefreq: "weekly",
        priority: "0.8"
      }))
    ];
  }

  const urlEntries = urls
    .map(
      (entry) =>
        `<url><loc>${escapeXml(entry.loc)}</loc><lastmod>${escapeXml(entry.lastmod)}</lastmod>${entry.changefreq ? `<changefreq>${escapeXml(entry.changefreq)}</changefreq>` : ""}${entry.priority ? `<priority>${escapeXml(entry.priority)}</priority>` : ""}</url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900"
    }
  });
}

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Deliberately empty: Smart pages, demos, and hosted HTML remain reachable
  // for personal use but are never advertised to search engines.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
    }
  });
}

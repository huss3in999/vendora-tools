import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Disallow: /",
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
    }
  });
}

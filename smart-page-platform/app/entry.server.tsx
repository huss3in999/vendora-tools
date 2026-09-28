import { RemixServer } from "@remix-run/react";
import type { EntryContext } from "@remix-run/cloudflare";
import { renderToReadableStream } from "react-dom/server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const stream = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />,
    {
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  // Smart Page Platform is personal-use infrastructure. Keep every response
  // out of public search, including hosted HTML and published customer pages.
  responseHeaders.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  return new Response(stream, {
    status: responseStatusCode,
    headers: responseHeaders
  });
}


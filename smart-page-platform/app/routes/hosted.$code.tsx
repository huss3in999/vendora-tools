import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { HTML_EMBED_MAX_LENGTH, buildSandboxedHtmlDocument } from "~/modules/page-builder/html-sanitize";
import { pageRepository } from "~/modules/page-builder/page-repository.server";
import { isStandaloneHtmlPage } from "~/modules/page-renderer/render";
import { getD1Database } from "~/modules/db/db.server";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const code = params.code ?? "";
  const db = getD1Database(context);
  if (!db || !code) throw new Response("Not found", { status: 404 });

  const publishedPage = await pageRepository(db).getPublishedPageByCode(code);
  if (!publishedPage || !isStandaloneHtmlPage(publishedPage.blocks)) {
    throw new Response("Not found", { status: 404 });
  }

  const block = publishedPage.blocks[0];
  if (block.type !== "html_embed") throw new Response("Not found", { status: 404 });

  const html = buildSandboxedHtmlDocument(block.props.html, HTML_EMBED_MAX_LENGTH, {
    allowScripts: block.props.allowScripts
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    }
  });
}

import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction
} from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import type { Block } from "~/modules/page-builder/blocks";
import {
  pickOgImage,
  resolvePublicMetaDescription,
  resolvePublicMetaTitle
} from "~/modules/page-builder/public-seo";
import {
  PublicPageFrame,
  StandaloneHtmlPageFrame,
  isStandaloneHtmlPage
} from "~/modules/page-renderer/render";
import { pageRepository } from "~/modules/page-builder/page-repository.server";
import { leadRepository } from "~/modules/leads/lead-repository.server";
import { DEFAULT_PAGE_THEME, type PageTheme } from "~/modules/page-builder/theme";
import { getD1Database } from "~/modules/db/db.server";
import { analyticsRepository, getOrCreateVisitorId } from "~/modules/analytics/analytics.server";

export type PublicPageLoaderData = {
  code: string;
  blocks: Block[];
  theme: PageTheme;
  title: string;
  status: string;
  trackingEnabled: boolean;
  robots: string;
  canonicalUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
  leadStatus?: "ok" | "invalid";
};

function demoBlocks(code: string): Block[] {
  return code === "demo"
    ? [
        {
          id: "profile",
          type: "profile",
          props: {
            imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
            name: "Demo creator",
            subtitle: "Links, offers, updates, and contact in one smart page.",
            circular: true
          }
        },
        {
          id: "h",
          type: "header",
          props: { title: "Demo smart page", subtitle: "A richer Phase 1 public page." }
        },
        {
          id: "social",
          type: "social_links",
          props: {
            links: [
              { platform: "instagram", label: "Instagram", href: "https://instagram.com/" },
              { platform: "website", label: "Website", href: "https://example.com" }
            ]
          }
        },
        {
          id: "t",
          type: "text",
          props: {
            text: "Use profiles, links, FAQs, prices, galleries, maps, and announcements without uploads or heavy scripts."
          }
        },
        {
          id: "b",
          type: "link_button",
          props: { label: "Back to home", href: "/" }
        },
        {
          id: "w",
          type: "whatsapp_button",
          props: { label: "Chat on WhatsApp", phoneE164: "+15551234567" }
        },
        {
          id: "faq",
          type: "faq",
          props: {
            items: [
              {
                question: "Can this page be edited?",
                answer: "Yes. Owners can add, reorder, save, and publish blocks from the editor."
              }
            ]
          }
        }
      ]
    : [
        {
          id: "h",
          type: "header",
          props: { title: "Unknown short code", subtitle: `Code: ${code}` }
        },
        { id: "t", type: "text", props: { text: "That page is not published." } },
        { id: "b", type: "link_button", props: { label: "Home", href: "/" } }
      ];
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [{ title: "Public page - Smart Page Platform" }, { name: "robots", content: "noindex, nofollow" }];
  }

  const title = data.metaTitle || data.title || "Smart page";
  const description = data.metaDescription || "";

  const ogTags = data.ogImage
    ? ([
        { property: "og:image", content: data.ogImage },
        { name: "twitter:image", content: data.ogImage }
      ] as const)
    : [];

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: data.robots },
    { tagName: "link", rel: "canonical", href: data.canonicalUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: data.canonicalUrl },
    {
      name: "twitter:card",
      content: data.ogImage ? "summary_large_image" : "summary"
    },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...ogTags
  ];
};

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const leadStatus = (() => {
    const raw = url.searchParams.get("lead");
    return raw === "ok" || raw === "invalid" ? raw : undefined;
  })();
  const code = params.code ?? "unknown";
  const origin = new URL(request.url).origin;
  const canonicalUrl = `${origin}/p/${encodeURIComponent(code)}`;
  const db = getD1Database(context);

  const fallbackMeta = (blocks: Block[], titleFallback: string): Pick<
    PublicPageLoaderData,
    "metaTitle" | "metaDescription" | "ogImage"
  > => ({
    metaTitle: resolvePublicMetaTitle(titleFallback, null),
    metaDescription: resolvePublicMetaDescription(blocks, titleFallback, null),
    ogImage: pickOgImage(blocks)
  });

  if (db) {
    const publishedPage = await pageRepository(db).getPublishedPageByCode(code);
    if (publishedPage) {
      const visitor = await getOrCreateVisitorId(request);
      const blocks = publishedPage.blocks;
      const pageTitle = publishedPage.page.title;
      const metaTitle = resolvePublicMetaTitle(pageTitle, publishedPage.page.seo_title);
      const metaDescription = resolvePublicMetaDescription(blocks, pageTitle, publishedPage.page.seo_description);
      const ogImage = pickOgImage(blocks);
      const allowIndexing = publishedPage.page.allow_indexing !== 0;
      const robots =
        publishedPage.page.status === "published" && allowIndexing ? "index, follow" : "noindex, nofollow";

      try {
        if (publishedPage.shortLink) {
          await analyticsRepository(db).trackEvent({
            workspaceId: publishedPage.page.workspace_id,
            pageId: publishedPage.page.id,
            shortLinkId: publishedPage.shortLink.id,
            eventType: "page_view",
            visitorId: visitor.visitorId,
            userAgent: request.headers.get("User-Agent"),
            referrer: request.headers.get("Referer"),
            metadata: {
              short_code: code
            }
          });
        }
      } catch {
        // Public pages should render even if analytics write fails.
      }

      const payload: PublicPageLoaderData = {
        code,
        blocks,
        theme: publishedPage.theme,
        title: pageTitle,
        status: publishedPage.page.status,
        trackingEnabled: true,
        robots,
        canonicalUrl,
        metaTitle,
        metaDescription,
        ogImage,
        leadStatus
      };

      return json(payload, visitor.setCookie ? { headers: { "Set-Cookie": visitor.setCookie } } : undefined);
    }

    const blocks = demoBlocks("unknown");
    const fm = fallbackMeta(blocks, "Not published");
    return json({
      code,
      blocks,
      theme: DEFAULT_PAGE_THEME,
      title: "Not published",
      status: "draft",
      trackingEnabled: false,
      robots: "noindex, nofollow",
      canonicalUrl,
      metaTitle: fm.metaTitle,
      metaDescription: fm.metaDescription,
      ogImage: fm.ogImage,
      leadStatus
    });
  }

  const blocks = demoBlocks(code);
  const fm = fallbackMeta(blocks, code === "demo" ? "Demo smart page" : "Public page");
  return json({
    code,
    blocks,
    theme: DEFAULT_PAGE_THEME,
    title: code === "demo" ? "Demo smart page" : "Public page",
    status: "draft",
    trackingEnabled: false,
    robots: "noindex, nofollow",
    canonicalUrl,
    metaTitle: fm.metaTitle,
    metaDescription: fm.metaDescription,
    ogImage: fm.ogImage,
    leadStatus
  });
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const code = params.code ?? "unknown";
  const db = getD1Database(context);

  if (!db) {
    return new Response(null, { status: 204 });
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent !== "track_click" && intent !== "submit_lead") {
    return new Response(null, { status: 204 });
  }

  try {
    const publishedPage = await pageRepository(db).getPublishedPageByCode(code);
    if (!publishedPage?.shortLink) {
      return new Response(null, { status: 204 });
    }

    if (intent === "submit_lead") {
      const formBlockId = String(form.get("blockId") ?? "");
      const formBlock = publishedPage.blocks.find((block) => block.id === formBlockId && block.type === "form");
      if (!formBlock || formBlock.type !== "form") {
        return new Response(null, { status: 204 });
      }

      const name = String(form.get("name") ?? "").trim().slice(0, 120);
      const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
      const email = String(form.get("email") ?? "").trim().slice(0, 160);
      const message = String(form.get("message") ?? "").trim().slice(0, 2000);

      const enabled = new Set(formBlock.props.enabledFields);
      const normalized = {
        name: enabled.has("name") ? name : "",
        phone: enabled.has("phone") ? phone : "",
        email: enabled.has("email") ? email : "",
        message: enabled.has("message") ? message : ""
      };
      if (!normalized.name && !normalized.phone && !normalized.email && !normalized.message) {
        return new Response(null, { status: 400 });
      }
      if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
        return Response.redirect(new URL(`/p/${encodeURIComponent(code)}?lead=invalid`, request.url), 302);
      }
      if (normalized.phone && !/^\+?[0-9][0-9\s\-()]{6,20}$/.test(normalized.phone)) {
        return Response.redirect(new URL(`/p/${encodeURIComponent(code)}?lead=invalid`, request.url), 302);
      }

      const now = Date.now();
      const recentIso = new Date(now - 60_000).toISOString();
      const recentCount = await leadRepository(db).recentForBlock(publishedPage.page.id, formBlock.id, recentIso);
      if (recentCount >= 8) {
        return new Response(null, { status: 429 });
      }

      await leadRepository(db).create({
        workspaceId: publishedPage.page.workspace_id,
        pageId: publishedPage.page.id,
        blockId: formBlock.id,
        name: normalized.name || undefined,
        phone: normalized.phone || undefined,
        email: normalized.email || undefined,
        message: normalized.message || undefined,
        metadata: {
          code,
          userAgent: request.headers.get("User-Agent") ?? undefined,
          referrer: request.headers.get("Referer") ?? undefined
        }
      });

      return Response.redirect(new URL(`/p/${encodeURIComponent(code)}?lead=ok`, request.url), 302);
    }

    const blockId = String(form.get("blockId") ?? "");
    const blockType = String(form.get("blockType") ?? "");
    const trackedBlock = publishedPage.blocks.find((block) => block.id === blockId && block.type === blockType);

    if (!trackedBlock || (trackedBlock.type !== "link_button" && trackedBlock.type !== "whatsapp_button")) {
      return new Response(null, { status: 204 });
    }

    const visitor = await getOrCreateVisitorId(request);
    await analyticsRepository(db).trackEvent({
      workspaceId: publishedPage.page.workspace_id,
      pageId: publishedPage.page.id,
      shortLinkId: publishedPage.shortLink.id,
      eventType: trackedBlock.type === "whatsapp_button" ? "whatsapp_click" : "link_click",
      visitorId: visitor.visitorId,
      userAgent: request.headers.get("User-Agent"),
      referrer: request.headers.get("Referer"),
      metadata: {
        block_id: trackedBlock.id,
        block_type: trackedBlock.type,
        target_kind: trackedBlock.type === "whatsapp_button" ? "contact" : "link",
        short_code: code
      }
    });

    return new Response(null, {
      status: 204,
      headers: visitor.setCookie ? { "Set-Cookie": visitor.setCookie } : undefined
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}

export default function PublicPage() {
  const data = useLoaderData<typeof loader>();
  const standaloneHtmlBlock = isStandaloneHtmlPage(data.blocks) && data.blocks[0].type === "html_embed"
    ? data.blocks[0]
    : null;

  if (standaloneHtmlBlock) {
    return <StandaloneHtmlPageFrame block={standaloneHtmlBlock} />;
  }

  return (
    <>
      {data.leadStatus === "ok" ? (
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow">
          Lead submitted successfully.
        </div>
      ) : null}
      {data.leadStatus === "invalid" ? (
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow">
          Please check email/phone format and try again.
        </div>
      ) : null}
      <PublicPageFrame
        code={data.code}
        blocks={data.blocks}
        theme={data.theme}
        trackingCode={data.trackingEnabled ? data.code : undefined}
      />
    </>
  );
}

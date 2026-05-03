import { createCookie } from "@remix-run/cloudflare";
import { createId } from "~/modules/db/db.server";

export type AnalyticsEventType = "page_view" | "link_click" | "whatsapp_click";

export type TrackEventInput = {
  workspaceId: string;
  pageId: string;
  shortLinkId?: string | null;
  eventType: AnalyticsEventType;
  visitorId?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type OwnerAnalyticsSummary = {
  totalPageViews: number;
  totalClicks: number;
  topPages: Array<{ page_id: string; title: string; views: number }>;
  topClickedBlocks: Array<{
    page_id: string;
    page_title: string;
    block_id: string;
    block_type: string;
    clicks: number;
  }>;
};

export type PlatformAnalyticsSummary = {
  totalWorkspaces: number;
  totalPages: number;
  totalPageViews: number;
  totalClicks: number;
};

export const visitorCookie = createCookie("__spp_vid", {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax",
  secure: true
});

function numberFromRow(row: { value: number } | null) {
  return row?.value ?? 0;
}

function sanitizeMetadata(metadata: TrackEventInput["metadata"]) {
  if (!metadata) return "{}";

  const safeEntries = Object.entries(metadata)
    .filter(([key]) => ["block_id", "block_type", "target_kind", "short_code"].includes(key))
    .map(([key, value]) => [key, value]);

  return JSON.stringify(Object.fromEntries(safeEntries));
}

export async function getOrCreateVisitorId(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const existing = await visitorCookie.parse(cookieHeader);

  if (typeof existing === "string" && existing.startsWith("vis_")) {
    return { visitorId: existing, setCookie: null };
  }

  const visitorId = createId("vis");
  return {
    visitorId,
    setCookie: await visitorCookie.serialize(visitorId)
  };
}

export function analyticsRepository(db: D1Database) {
  return {
    async trackEvent(input: TrackEventInput) {
      await db
        .prepare(
          `INSERT INTO analytics_events
            (
              id,
              workspace_id,
              page_id,
              short_link_id,
              event_type,
              visitor_id,
              metadata_json,
              user_agent,
              referrer
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          createId("evt"),
          input.workspaceId,
          input.pageId,
          input.shortLinkId ?? null,
          input.eventType,
          input.visitorId ?? null,
          sanitizeMetadata(input.metadata),
          input.userAgent ?? null,
          input.referrer ?? null
        )
        .run();
    },

    async ownerSummary(workspaceId: string): Promise<OwnerAnalyticsSummary> {
      const [viewsRow, clicksRow, topPagesResult, topClickedBlocksResult] = await Promise.all([
        db
          .prepare(
            "SELECT COUNT(*) AS value FROM analytics_events WHERE workspace_id = ? AND event_type = 'page_view'"
          )
          .bind(workspaceId)
          .first<{ value: number }>(),
        db
          .prepare(
            `SELECT COUNT(*) AS value
            FROM analytics_events
            WHERE workspace_id = ?
              AND event_type IN ('link_click', 'whatsapp_click')`
          )
          .bind(workspaceId)
          .first<{ value: number }>(),
        db
          .prepare(
            `SELECT
              pages.id AS page_id,
              pages.title,
              COUNT(analytics_events.id) AS views
            FROM pages
            LEFT JOIN analytics_events
              ON analytics_events.page_id = pages.id
              AND analytics_events.event_type = 'page_view'
            WHERE pages.workspace_id = ?
            GROUP BY pages.id, pages.title
            ORDER BY views DESC, pages.updated_at DESC
            LIMIT 5`
          )
          .bind(workspaceId)
          .all<{ page_id: string; title: string; views: number }>(),
        db
          .prepare(
            `SELECT
              analytics_events.page_id,
              pages.title AS page_title,
              json_extract(analytics_events.metadata_json, '$.block_id') AS block_id,
              json_extract(analytics_events.metadata_json, '$.block_type') AS block_type,
              COUNT(*) AS clicks
            FROM analytics_events
            JOIN pages ON pages.id = analytics_events.page_id
            WHERE analytics_events.workspace_id = ?
              AND analytics_events.event_type IN ('link_click', 'whatsapp_click')
            GROUP BY analytics_events.page_id, block_id, block_type
            ORDER BY clicks DESC
            LIMIT 5`
          )
          .bind(workspaceId)
          .all<{
            page_id: string;
            page_title: string;
            block_id: string;
            block_type: string;
            clicks: number;
          }>()
      ]);

      return {
        totalPageViews: numberFromRow(viewsRow),
        totalClicks: numberFromRow(clicksRow),
        topPages: topPagesResult.results ?? [],
        topClickedBlocks: topClickedBlocksResult.results ?? []
      };
    },

    async platformSummary(): Promise<PlatformAnalyticsSummary> {
      const [workspacesRow, pagesRow, viewsRow, clicksRow] = await Promise.all([
        db.prepare("SELECT COUNT(*) AS value FROM workspaces").first<{ value: number }>(),
        db.prepare("SELECT COUNT(*) AS value FROM pages").first<{ value: number }>(),
        db
          .prepare("SELECT COUNT(*) AS value FROM analytics_events WHERE event_type = 'page_view'")
          .first<{ value: number }>(),
        db
          .prepare(
            "SELECT COUNT(*) AS value FROM analytics_events WHERE event_type IN ('link_click', 'whatsapp_click')"
          )
          .first<{ value: number }>()
      ]);

      return {
        totalWorkspaces: numberFromRow(workspacesRow),
        totalPages: numberFromRow(pagesRow),
        totalPageViews: numberFromRow(viewsRow),
        totalClicks: numberFromRow(clicksRow)
      };
    }
  };
}

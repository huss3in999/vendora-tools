import type { Block, FaqItem, GalleryImage, PriceItem } from "./blocks";
import {
  cleanFaqItems,
  cleanGalleryImages,
  cleanPriceItems,
  cleanSocialLinks,
  sanitizeBlock
} from "./block-sanitize";
import { createId, type PageBlockRow, type PageRow, type ShortLinkRow } from "~/modules/db/db.server";
import { DEFAULT_PAGE_THEME, parsePageThemeJson, sanitizePageTheme, type PageTheme } from "./theme";

export type PageStatus = "draft" | "published" | "archived";

export type EditablePage = Pick<
  PageRow,
  | "id"
  | "workspace_id"
  | "title"
  | "slug"
  | "status"
  | "theme_json"
  | "seo_title"
  | "seo_description"
  | "allow_indexing"
  | "published_at"
  | "created_at"
  | "updated_at"
>;

export type PageSummary = EditablePage & {
  short_code: string | null;
  short_link_status: "active" | "disabled" | null;
};

export type PageWithBlocks = {
  page: EditablePage;
  blocks: Block[];
  theme: PageTheme;
  shortLink: Pick<ShortLinkRow, "id" | "code" | "status"> | null;
};

/** When migration `0004_page_seo.sql` has not been applied remotely yet. */
function isLikelyMissingSeoColumnsError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("no such column") ||
    msg.includes("doesn't exist") ||
    msg.includes("DOES NOT EXIST")
  );
}

const PAGE_ROW_SELECT_LEGACY = `SELECT id, workspace_id, title, slug, status, theme_json,
          published_at, created_at, updated_at
          FROM pages
          WHERE workspace_id = ? AND id = ?`;

const PAGE_ROW_SELECT_FULL = `SELECT id, workspace_id, title, slug, status, theme_json,
                  seo_title, seo_description, allow_indexing,
                  published_at, created_at, updated_at
          FROM pages
          WHERE workspace_id = ? AND id = ?`;

async function loadEditablePageRow(
  db: D1Database,
  workspaceId: string,
  pageId: string
): Promise<EditablePage | null> {
  try {
    const row = await db.prepare(PAGE_ROW_SELECT_FULL).bind(workspaceId, pageId).first<EditablePage>();
    return row ?? null;
  } catch (error) {
    if (!isLikelyMissingSeoColumnsError(error)) throw error;
    const legacy = await db
      .prepare(PAGE_ROW_SELECT_LEGACY)
      .bind(workspaceId, pageId)
      .first<Omit<EditablePage, "seo_title" | "seo_description" | "allow_indexing">>();
    if (!legacy) return null;
    return {
      ...legacy,
      seo_title: null,
      seo_description: null,
      allow_indexing: 1
    };
  }
}

async function queryPageSummaries(
  db: D1Database,
  workspaceId: string,
  limit?: number
): Promise<PageSummary[]> {
  const fullSql =
    `SELECT
            pages.id,
            pages.workspace_id,
            pages.title,
            pages.slug,
            pages.status,
            pages.theme_json,
            pages.seo_title,
            pages.seo_description,
            pages.allow_indexing,
            pages.published_at,
            pages.created_at,
            pages.updated_at,
            short_links.code AS short_code,
            short_links.status AS short_link_status
          FROM pages
          LEFT JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.workspace_id = ?
            AND pages.status != 'archived'
          ORDER BY pages.updated_at DESC`;

  const legacySql =
    `SELECT
            pages.id,
            pages.workspace_id,
            pages.title,
            pages.slug,
            pages.status,
            pages.theme_json,
            pages.published_at,
            pages.created_at,
            pages.updated_at,
            short_links.code AS short_code,
            short_links.status AS short_link_status
          FROM pages
          LEFT JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.workspace_id = ?
            AND pages.status != 'archived'
          ORDER BY pages.updated_at DESC`;

  const limitTail = limit != null ? " LIMIT ?" : "";

  try {
    const stmt = db.prepare(fullSql + limitTail);
    const result =
      limit != null ? await stmt.bind(workspaceId, limit).all<PageSummary>() : await stmt.bind(workspaceId).all<PageSummary>();
    return result.results ?? [];
  } catch (error) {
    if (!isLikelyMissingSeoColumnsError(error)) throw error;
    const stmt = db.prepare(legacySql + limitTail);
    const result =
      limit != null
        ? await stmt.bind(workspaceId, limit).all<
            Omit<PageSummary, "seo_title" | "seo_description" | "allow_indexing">
          >()
        : await stmt.bind(workspaceId).all<
            Omit<PageSummary, "seo_title" | "seo_description" | "allow_indexing">
          >();
    return (result.results ?? []).map((row) => ({
      ...row,
      seo_title: null,
      seo_description: null,
      allow_indexing: 1
    }));
  }
}

function normalizeSlug(slug: string) {
  return (
    slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `page-${Date.now()}`
  );
}

function parsePropsJson(propsJson: string) {
  try {
    const parsed = JSON.parse(propsJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function rowToBlock(row: PageBlockRow): Block {
  const props = parsePropsJson(row.props_json);

  switch (row.type) {
    case "header":
      return {
        id: row.id,
        type: "header",
        props: {
          title: String(props.title ?? ""),
          subtitle: props.subtitle ? String(props.subtitle) : undefined
        }
      };
    case "text":
      return { id: row.id, type: "text", props: { text: String(props.text ?? "") } };
    case "link_button":
      return {
        id: row.id,
        type: "link_button",
        props: { label: String(props.label ?? ""), href: String(props.href ?? "/") }
      };
    case "image":
      return {
        id: row.id,
        type: "image",
        props: {
          src: String(props.src ?? ""),
          alt: props.alt ? String(props.alt) : undefined
        }
      };
    case "video":
      return { id: row.id, type: "video", props: { src: String(props.src ?? "") } };
    case "whatsapp_button":
      return {
        id: row.id,
        type: "whatsapp_button",
        props: {
          label: String(props.label ?? "Chat on WhatsApp"),
          phoneE164: String(props.phoneE164 ?? ""),
          message: props.message ? String(props.message) : undefined
        }
      };
    case "divider": {
      const normalized = sanitizeBlock({ id: row.id, type: "divider", props });
      if (!normalized || normalized.type !== "divider") {
        return { id: row.id, type: "divider", props: {} };
      }
      return normalized;
    }
    case "profile":
      return {
        id: row.id,
        type: "profile",
        props: {
          imageUrl: String(props.imageUrl ?? ""),
          name: String(props.name ?? ""),
          subtitle: props.subtitle ? String(props.subtitle) : undefined,
          circular: props.circular === true
        }
      };
    case "social_links":
      return { id: row.id, type: "social_links", props: { links: cleanSocialLinks(props.links) } };
    case "faq":
      return { id: row.id, type: "faq", props: { items: cleanFaqItems(props.items) } };
    case "map_location":
      return {
        id: row.id,
        type: "map_location",
        props: {
          title: String(props.title ?? ""),
          mapsUrl: String(props.mapsUrl ?? ""),
          buttonText: String(props.buttonText ?? "Open map")
        }
      };
    case "price_list":
      return {
        id: row.id,
        type: "price_list",
        props: { title: props.title ? String(props.title) : undefined, items: cleanPriceItems(props.items) }
      };
    case "gallery":
      return { id: row.id, type: "gallery", props: { images: cleanGalleryImages(props.images) } };
    case "contact_card":
      return {
        id: row.id,
        type: "contact_card",
        props: {
          phone: props.phone ? String(props.phone) : undefined,
          whatsapp: props.whatsapp ? String(props.whatsapp) : undefined,
          email: props.email ? String(props.email) : undefined,
          address: props.address ? String(props.address) : undefined
        }
      };
    case "countdown":
      return {
        id: row.id,
        type: "countdown",
        props: { title: String(props.title ?? ""), dateTimeText: String(props.dateTimeText ?? "") }
      };
    case "announcement":
      return {
        id: row.id,
        type: "announcement",
        props: {
          title: String(props.title ?? ""),
          message: String(props.message ?? ""),
          style: props.style === "strong" ? "strong" : "soft"
        }
      };
    case "html_embed": {
      const normalized = sanitizeBlock({ id: row.id, type: "html_embed", props });
      if (!normalized || normalized.type !== "html_embed") {
        return { id: row.id, type: "html_embed", props: { html: "<p></p>" } };
      }
      return normalized;
    }
    case "form": {
      const normalized = sanitizeBlock({ id: row.id, type: "form", props });
      if (!normalized || normalized.type !== "form") {
        return {
          id: row.id,
          type: "form",
          props: { title: "Contact form", enabledFields: ["name", "phone", "email", "message"], submitText: "Send" }
        };
      }
      return normalized;
    }
    case "digital_products": {
      const normalized = sanitizeBlock({ id: row.id, type: "digital_products", props });
      if (!normalized || normalized.type !== "digital_products") {
        return { id: row.id, type: "digital_products", props: { items: [] } };
      }
      return normalized;
    }
    case "advanced_timer": {
      const normalized = sanitizeBlock({ id: row.id, type: "advanced_timer", props });
      if (!normalized || normalized.type !== "advanced_timer") {
        return {
          id: row.id,
          type: "advanced_timer",
          props: {
            title: "Countdown",
            targetIso: "",
            dateTimeText: "",
            beforeMessage: "Ends soon",
            afterMessage: "Offer ended"
          }
        };
      }
      return normalized;
    }
  }
}

function uniqueBlocks(blocks: Block[]) {
  const seenIds = new Set<string>();
  return blocks.map((block, index) => {
    const id = block.id && !seenIds.has(block.id) ? block.id : createId("blk");
    seenIds.add(id);
    return {
      ...block,
      id,
      sortOrder: index
    };
  });
}

export function parseBlocksJson(blocksJson: string): Block[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(blocksJson);
  } catch {
    throw new Error("invalid_blocks_json");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("invalid_blocks");
  }

  if (parsed.length > 50) {
    throw new Error("too_many_blocks");
  }

  const blocks = parsed.map(sanitizeBlock);
  if (blocks.some((block) => !block)) {
    throw new Error("invalid_blocks");
  }

  return blocks as Block[];
}

async function ensureUniqueSlug(db: D1Database, workspaceId: string, preferredSlug: string, pageId?: string) {
  const baseSlug = normalizeSlug(preferredSlug);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .prepare("SELECT id FROM pages WHERE workspace_id = ? AND slug = ? AND id != ?")
      .bind(workspaceId, slug, pageId ?? "")
      .first<{ id: string }>();

    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueShortCode(db: D1Database, preferredCode: string, shortLinkId?: string) {
  const baseCode = normalizeSlug(preferredCode);
  let code = baseCode;
  let suffix = 2;

  while (true) {
    const existing = await db
      .prepare("SELECT id FROM short_links WHERE code = ? AND id != ?")
      .bind(code, shortLinkId ?? "")
      .first<{ id: string }>();

    if (!existing) return code;
    code = `${baseCode}-${suffix}`;
    suffix += 1;
  }
}

export function pageRepository(db: D1Database) {
  return {
    async listPages(workspaceId: string): Promise<PageSummary[]> {
      return queryPageSummaries(db, workspaceId);
    },

    async workspacePageStats(workspaceId: string) {
      const [totalRow, publishedRow, draftRow, latestPages] = await Promise.all([
        db
          .prepare("SELECT COUNT(*) AS value FROM pages WHERE workspace_id = ? AND status != 'archived'")
          .bind(workspaceId)
          .first<{ value: number }>(),
        db
          .prepare("SELECT COUNT(*) AS value FROM pages WHERE workspace_id = ? AND status = 'published'")
          .bind(workspaceId)
          .first<{ value: number }>(),
        db
          .prepare("SELECT COUNT(*) AS value FROM pages WHERE workspace_id = ? AND status = 'draft'")
          .bind(workspaceId)
          .first<{ value: number }>(),
        queryPageSummaries(db, workspaceId, 5)
      ]);

      return {
        totalPages: totalRow?.value ?? 0,
        publishedPages: publishedRow?.value ?? 0,
        draftPages: draftRow?.value ?? 0,
        latestPages
      };
    },

    async createPage(input: {
      workspaceId: string;
      userId: string;
      title: string;
      slug?: string;
      pageId?: string;
    }) {
      const pageId = input.pageId ?? createId("pg");
      const slug = await ensureUniqueSlug(db, input.workspaceId, input.slug ?? input.title, pageId);
      const title = input.title.trim() || "Untitled page";
      if (title.length > 120) {
        throw new Error("page_title_too_long");
      }

      await db
        .prepare(
          `INSERT INTO pages
            (id, workspace_id, title, slug, created_by_user_id, updated_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(pageId, input.workspaceId, title, slug, input.userId, input.userId)
        .run();

      return this.getPageForWorkspace(input.workspaceId, pageId);
    },

    async getPageForWorkspace(workspaceId: string, pageId: string): Promise<PageWithBlocks | null> {
      const page = await loadEditablePageRow(db, workspaceId, pageId);

      if (!page) return null;

      const blocksResult = await db
        .prepare(
          `SELECT id, page_id, type, sort_order, props_json, created_at, updated_at
          FROM page_blocks
          WHERE page_id = ?
          ORDER BY sort_order ASC`
        )
        .bind(page.id)
        .all<PageBlockRow>();

      const shortLink = await db
        .prepare("SELECT id, code, status FROM short_links WHERE page_id = ? LIMIT 1")
        .bind(page.id)
        .first<Pick<ShortLinkRow, "id" | "code" | "status">>();

      return {
        page,
        blocks: (blocksResult.results ?? []).map(rowToBlock),
        theme: parsePageThemeJson(page.theme_json),
        shortLink
      };
    },

    async savePage(input: {
      workspaceId: string;
      pageId: string;
      userId: string;
      title: string;
      slug: string;
      blocks: Block[];
      theme?: PageTheme;
      seoTitle?: string | null;
      seoDescription?: string | null;
      allowIndexing?: boolean;
    }) {
      const page = await this.getPageForWorkspace(input.workspaceId, input.pageId);
      if (!page) {
        throw new Error("page_not_found");
      }

      const slug = await ensureUniqueSlug(db, input.workspaceId, input.slug, input.pageId);
      const title = input.title.trim() || "Untitled page";
      if (title.length > 120) {
        throw new Error("page_title_too_long");
      }
      const blocks = uniqueBlocks(input.blocks);
      const previousBlockIds = new Set(page.blocks.map((b) => b.id));
      const nextBlockIds = new Set(blocks.map((b) => b.id));
      const removedBlockIds = Array.from(previousBlockIds).filter((id) => !nextBlockIds.has(id));
      const theme = sanitizePageTheme(input.theme ?? DEFAULT_PAGE_THEME);
      const seoTitle =
        input.seoTitle === undefined
          ? page.page.seo_title
          : input.seoTitle === "" || input.seoTitle === null
            ? null
            : input.seoTitle.trim().slice(0, 70) || null;
      const seoDescription =
        input.seoDescription === undefined
          ? page.page.seo_description
          : input.seoDescription === "" || input.seoDescription === null
            ? null
            : input.seoDescription.trim().slice(0, 320) || null;
      const allowIndexing =
        input.allowIndexing === undefined ? page.page.allow_indexing !== 0 : input.allowIndexing ? 1 : 0;

      try {
        await db
          .prepare(
            `UPDATE pages
          SET title = ?, slug = ?, theme_json = ?,
              seo_title = ?, seo_description = ?, allow_indexing = ?,
              updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND workspace_id = ?`
          )
          .bind(
            title,
            slug,
            JSON.stringify(theme),
            seoTitle,
            seoDescription,
            allowIndexing,
            input.userId,
            input.pageId,
            input.workspaceId
          )
          .run();
      } catch (error) {
        if (!isLikelyMissingSeoColumnsError(error)) throw error;
        await db
          .prepare(
            `UPDATE pages
          SET title = ?, slug = ?, theme_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND workspace_id = ?`
          )
          .bind(title, slug, JSON.stringify(theme), input.userId, input.pageId, input.workspaceId)
          .run();
      }

      await db.batch([
        db.prepare("DELETE FROM page_blocks WHERE page_id = ?").bind(input.pageId),
        ...blocks.map((block) =>
          db
            .prepare(
              `INSERT INTO page_blocks
                (id, page_id, type, sort_order, props_json)
              VALUES (?, ?, ?, ?, ?)`
            )
            .bind(block.id, input.pageId, block.type, block.sortOrder, JSON.stringify(block.props))
        )
      ]);

      if (removedBlockIds.length > 0) {
        await db.batch(
          removedBlockIds.map((blockId) =>
            db.prepare("DELETE FROM lead_submissions WHERE page_id = ? AND block_id = ?").bind(input.pageId, blockId)
          )
        );
      }

      return this.getPageForWorkspace(input.workspaceId, input.pageId);
    },

    async setPublishStatus(input: {
      workspaceId: string;
      pageId: string;
      userId: string;
      status: Extract<PageStatus, "draft" | "published">;
    }) {
      const page = await this.getPageForWorkspace(input.workspaceId, input.pageId);
      if (!page) {
        throw new Error("page_not_found");
      }

      if (input.status === "published") {
        const shortLinkId = page.shortLink?.id ?? createId("sl");
        const shortCode = await ensureUniqueShortCode(db, page.page.slug, page.shortLink?.id);
        await db.batch([
          db
            .prepare(
              `UPDATE pages
              SET status = 'published',
                published_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND workspace_id = ?`
            )
            .bind(input.userId, input.pageId, input.workspaceId),
          db
            .prepare("UPDATE short_links SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE page_id = ? AND id != ?")
            .bind(input.pageId, shortLinkId),
          page.shortLink
            ? db
                .prepare(
                  "UPDATE short_links SET code = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                )
                .bind(shortCode, page.shortLink.id)
            : db
                .prepare(
                  `INSERT INTO short_links
                    (id, workspace_id, page_id, code, created_by_user_id)
                  VALUES (?, ?, ?, ?, ?)`
                )
                .bind(shortLinkId, input.workspaceId, input.pageId, shortCode, input.userId)
        ]);
      } else {
        await db.batch([
          db
            .prepare(
              `UPDATE pages
              SET status = 'draft', updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND workspace_id = ?`
            )
            .bind(input.userId, input.pageId, input.workspaceId),
          db
            .prepare("UPDATE short_links SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE page_id = ?")
            .bind(input.pageId)
        ]);
      }

      return this.getPageForWorkspace(input.workspaceId, input.pageId);
    },

    async getPublishedPageByCode(code: string): Promise<PageWithBlocks | null> {
      const row = await db
        .prepare(
          `SELECT pages.workspace_id, pages.id
          FROM short_links
          JOIN pages ON pages.id = short_links.page_id
          WHERE short_links.code = ?
            AND short_links.status = 'active'
            AND pages.status = 'published'
          LIMIT 1`
        )
        .bind(code)
        .first<{ workspace_id: string; id: string }>();

      if (!row) return null;
      return this.getPageForWorkspace(row.workspace_id, row.id);
    },

    async listIndexablePublishedPages(): Promise<{ code: string; updated_at: string }[]> {
      try {
        const result = await db
          .prepare(
            `SELECT short_links.code AS code, pages.updated_at AS updated_at
          FROM pages
          INNER JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.status = 'published'
            AND pages.allow_indexing = 1
            AND short_links.status = 'active'
          ORDER BY pages.updated_at DESC`
          )
          .all<{ code: string; updated_at: string }>();

        return result.results ?? [];
      } catch (error) {
        if (!isLikelyMissingSeoColumnsError(error)) throw error;
        const result = await db
          .prepare(
            `SELECT short_links.code AS code, pages.updated_at AS updated_at
          FROM pages
          INNER JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.status = 'published'
            AND short_links.status = 'active'
          ORDER BY pages.updated_at DESC`
          )
          .all<{ code: string; updated_at: string }>();

        return result.results ?? [];
      }
    }
  };
}

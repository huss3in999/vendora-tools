import { createId } from "~/modules/db/db.server";

export type LeadInput = {
  workspaceId: string;
  pageId: string;
  blockId: string;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export function leadRepository(db: D1Database) {
  return {
    async create(input: LeadInput) {
      const id = createId("lead");
      await db
        .prepare(
          `INSERT INTO lead_submissions
            (id, workspace_id, page_id, block_id, name, phone, email, message, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          input.workspaceId,
          input.pageId,
          input.blockId,
          input.name ?? null,
          input.phone ?? null,
          input.email ?? null,
          input.message ?? null,
          JSON.stringify(input.metadata ?? {})
        )
        .run();
      return id;
    },

    async recentForWorkspace(workspaceId: string, limit = 200) {
      const result = await db
        .prepare(
          `SELECT
            lead_submissions.id,
            lead_submissions.workspace_id,
            lead_submissions.page_id,
            lead_submissions.block_id,
            lead_submissions.name,
            lead_submissions.phone,
            lead_submissions.email,
            lead_submissions.message,
            lead_submissions.metadata_json,
            lead_submissions.created_at,
            pages.title AS page_title
          FROM lead_submissions
          JOIN pages ON pages.id = lead_submissions.page_id
          WHERE lead_submissions.workspace_id = ?
          ORDER BY lead_submissions.created_at DESC
          LIMIT ?`
        )
        .bind(workspaceId, limit)
        .all<{
          id: string;
          workspace_id: string;
          page_id: string;
          block_id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          message: string | null;
          metadata_json: string;
          created_at: string;
          page_title: string;
        }>();
      return result.results ?? [];
    },

    async countAll() {
      const row = await db.prepare("SELECT COUNT(*) AS value FROM lead_submissions").first<{ value: number }>();
      return row?.value ?? 0;
    },

    async recentForBlock(pageId: string, blockId: string, sinceIso: string) {
      const row = await db
        .prepare(
          `SELECT COUNT(*) AS value
          FROM lead_submissions
          WHERE page_id = ? AND block_id = ? AND created_at >= ?`
        )
        .bind(pageId, blockId, sinceIso)
        .first<{ value: number }>();
      return row?.value ?? 0;
    }
  };
}

import type { User, Workspace } from "~/modules/auth/types";

export type WorkspaceSettings = Workspace & {
  status: "active" | "suspended" | "deleted";
  created_at: string;
  updated_at: string;
};

export type CurrentAccount = Pick<User, "id" | "email" | "name" | "role" | "workspaceId">;

export function workspaceRepository(db: D1Database) {
  return {
    async getWorkspace(workspaceId: string) {
      return db
        .prepare("SELECT id, slug, name, status, created_at, updated_at FROM workspaces WHERE id = ?")
        .bind(workspaceId)
        .first<WorkspaceSettings>();
    },

    async updateWorkspaceName(input: { workspaceId: string; name: string }) {
      const name = input.name.trim();
      if (!name) {
        throw new Error("workspace_name_required");
      }

      await db
        .prepare("UPDATE workspaces SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(name, input.workspaceId)
        .run();

      return this.getWorkspace(input.workspaceId);
    },

    async getCurrentAccount(userId: string, workspaceId: string) {
      return db
        .prepare(
          `SELECT
            users.id,
            users.email,
            users.name,
            CASE
              WHEN users.role = 'super_admin' THEN 'super_admin'
              ELSE workspace_members.role
            END AS role,
            ? AS workspaceId
          FROM users
          LEFT JOIN workspace_members
            ON workspace_members.user_id = users.id
            AND workspace_members.workspace_id = ?
          WHERE users.id = ?
          LIMIT 1`
        )
        .bind(workspaceId, workspaceId, userId)
        .first<CurrentAccount>();
    }
  };
}

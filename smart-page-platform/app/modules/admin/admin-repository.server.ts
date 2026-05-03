export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: "user" | "super_admin";
  created_at: string;
  last_login_at: string | null;
};

export type AdminWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "deleted";
  created_at: string;
  owner_count: number;
  page_count: number;
};

export type AdminPageRow = {
  id: string;
  workspace_name: string;
  workspace_slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  short_code: string | null;
  created_at: string;
  updated_at: string;
};

function rows<T>(result: D1Result<T>) {
  return result.results ?? [];
}

export function adminRepository(db: D1Database) {
  return {
    async listUsers() {
      const result = await db
        .prepare(
          `SELECT id, email, name, role, created_at, last_login_at
          FROM users
          ORDER BY created_at DESC
          LIMIT 100`
        )
        .all<AdminUserRow>();
      return rows(result);
    },

    async listWorkspaces() {
      const result = await db
        .prepare(
          `SELECT
            workspaces.id,
            workspaces.name,
            workspaces.slug,
            workspaces.status,
            workspaces.created_at,
            COUNT(DISTINCT CASE WHEN workspace_members.role = 'owner' THEN workspace_members.user_id END) AS owner_count,
            COUNT(DISTINCT pages.id) AS page_count
          FROM workspaces
          LEFT JOIN workspace_members ON workspace_members.workspace_id = workspaces.id
          LEFT JOIN pages ON pages.workspace_id = workspaces.id
          GROUP BY workspaces.id
          ORDER BY workspaces.created_at DESC
          LIMIT 100`
        )
        .all<AdminWorkspaceRow>();
      return rows(result);
    },

    async listPages() {
      const result = await db
        .prepare(
          `SELECT
            pages.id,
            workspaces.name AS workspace_name,
            workspaces.slug AS workspace_slug,
            pages.title,
            pages.status,
            short_links.code AS short_code,
            pages.created_at,
            pages.updated_at
          FROM pages
          JOIN workspaces ON workspaces.id = pages.workspace_id
          LEFT JOIN short_links
            ON short_links.page_id = pages.id
            AND short_links.status = 'active'
          ORDER BY pages.updated_at DESC
          LIMIT 100`
        )
        .all<AdminPageRow>();
      return rows(result);
    },

    async platformSummary() {
      const [usersRow, workspacesRow, pagesRow, publishedPagesRow, viewsRow, clicksRow, leadsRow] = await Promise.all([
        db.prepare("SELECT COUNT(*) AS value FROM users").first<{ value: number }>(),
        db.prepare("SELECT COUNT(*) AS value FROM workspaces").first<{ value: number }>(),
        db.prepare("SELECT COUNT(*) AS value FROM pages").first<{ value: number }>(),
        db.prepare("SELECT COUNT(*) AS value FROM pages WHERE status = 'published'").first<{ value: number }>(),
        db
          .prepare("SELECT COUNT(*) AS value FROM analytics_events WHERE event_type = 'page_view'")
          .first<{ value: number }>(),
        db
          .prepare(
            "SELECT COUNT(*) AS value FROM analytics_events WHERE event_type IN ('link_click', 'whatsapp_click')"
          )
          .first<{ value: number }>(),
        db.prepare("SELECT COUNT(*) AS value FROM lead_submissions").first<{ value: number }>()
      ]);

      return {
        totalUsers: usersRow?.value ?? 0,
        totalWorkspaces: workspacesRow?.value ?? 0,
        totalPages: pagesRow?.value ?? 0,
        totalPublishedPages: publishedPagesRow?.value ?? 0,
        totalPageViews: viewsRow?.value ?? 0,
        totalClicks: clicksRow?.value ?? 0,
        totalLeads: leadsRow?.value ?? 0
      };
    }
  };
}

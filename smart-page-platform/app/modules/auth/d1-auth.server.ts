import type { AuthStore } from "./store.server";
import type { User, Workspace } from "./types";
import { createId } from "~/modules/db/db.server";
import { hashPassword, verifyPassword } from "./password.server";

export type D1AuthDependencies = {
  db: D1Database;
};

type UserWithMembershipRow = {
  id: string;
  email: string;
  name: string;
  platform_role: "user" | "super_admin";
  password_hash: string | null;
  workspace_id: string | null;
  workspace_role: "owner" | "admin" | "editor" | "viewer" | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function toAuthUser(row: UserWithMembershipRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.platform_role === "super_admin" ? "super_admin" : "owner",
    workspaceId: row.workspace_id ?? ""
  };
}

export function createD1AuthStore(deps: D1AuthDependencies): AuthStore {
  const { db } = deps;

  return {
    async createWorkspace(input: { name: string; slug: string }) {
      const workspace: Workspace = {
        id: createId("ws"),
        name: input.name.trim(),
        slug: normalizeSlug(input.slug)
      };

      await db
        .prepare("INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)")
        .bind(workspace.id, workspace.slug, workspace.name)
        .run();

      return workspace;
    },

    async getWorkspaceById(workspaceId: string) {
      return db
        .prepare("SELECT id, slug, name FROM workspaces WHERE id = ?")
        .bind(workspaceId)
        .first<Workspace>();
    },

    async createUser(input: {
      email: string;
      name: string;
      role: User["role"];
      workspaceId: string;
      password: string;
    }) {
      const normalizedEmail = normalizeEmail(input.email);
      const existing = await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(normalizedEmail)
        .first<{ id: string }>();

      if (existing) {
        throw new Error("email_taken");
      }

      const userId = createId("usr");
      const memberId = createId("wm");
      const passwordHash = await hashPassword(input.password);
      const platformRole = input.role === "super_admin" ? "super_admin" : "user";
      const workspaceRole = input.role === "owner" ? "owner" : "viewer";

      await db.batch([
        db
          .prepare(
            "INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)"
          )
          .bind(userId, normalizedEmail, input.name.trim(), platformRole, passwordHash),
        db
          .prepare(
            "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)"
          )
          .bind(memberId, input.workspaceId, userId, workspaceRole)
      ]);

      return {
        id: userId,
        email: normalizedEmail,
        name: input.name.trim(),
        role: input.role,
        workspaceId: input.workspaceId
      };
    },

    async createOwnerSignup(input: {
      name: string;
      email: string;
      password: string;
      workspaceName: string;
      workspaceSlug: string;
    }) {
      const normalizedEmail = normalizeEmail(input.email);
      const workspaceSlug = normalizeSlug(input.workspaceSlug);
      const existingUser = await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(normalizedEmail)
        .first<{ id: string }>();

      if (existingUser) {
        throw new Error("email_taken");
      }

      const existingWorkspace = await db
        .prepare("SELECT id FROM workspaces WHERE slug = ?")
        .bind(workspaceSlug)
        .first<{ id: string }>();

      if (existingWorkspace) {
        throw new Error("workspace_slug_taken");
      }

      const workspace: Workspace = {
        id: createId("ws"),
        name: input.workspaceName.trim(),
        slug: workspaceSlug
      };
      const user: User = {
        id: createId("usr"),
        email: normalizedEmail,
        name: input.name.trim(),
        role: "owner",
        workspaceId: workspace.id
      };
      const memberId = createId("wm");
      const passwordHash = await hashPassword(input.password);

      await db.batch([
        db
          .prepare("INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)")
          .bind(workspace.id, workspace.slug, workspace.name),
        db
          .prepare(
            "INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, 'user', ?)"
          )
          .bind(user.id, user.email, user.name, passwordHash),
        db
          .prepare(
            "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, 'owner')"
          )
          .bind(memberId, workspace.id, user.id)
      ]);

      return { user, workspace };
    },

    async verifyLogin(input: { email: string; password: string }) {
      const row = await db
        .prepare(
          `SELECT
            users.id,
            users.email,
            users.name,
            users.role AS platform_role,
            users.password_hash,
            workspace_members.workspace_id,
            workspace_members.role AS workspace_role
          FROM users
          LEFT JOIN workspace_members
            ON workspace_members.user_id = users.id
            AND workspace_members.status = 'active'
          WHERE users.email = ?
          ORDER BY
            CASE workspace_members.role
              WHEN 'owner' THEN 1
              WHEN 'admin' THEN 2
              WHEN 'editor' THEN 3
              WHEN 'viewer' THEN 4
              ELSE 5
            END
          LIMIT 1`
        )
        .bind(normalizeEmail(input.email))
        .first<UserWithMembershipRow>();

      if (!row) return null;

      const validPassword = await verifyPassword(input.password, row.password_hash);
      if (!validPassword) return null;

      if (row.platform_role !== "super_admin" && !row.workspace_id) {
        return null;
      }

      await db
        .prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(row.id)
        .run();

      return toAuthUser(row);
    }
  };
}

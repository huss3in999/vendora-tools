import type { User, Workspace } from "./types";

// Temporary Phase 1 fallback only. Durable auth will move to D1 using the
// repository boundary in store.server.ts.
type PasswordRecord = { userId: string; password: string };

const db = {
  usersById: new Map<string, User>(),
  usersByEmail: new Map<string, User>(),
  workspacesById: new Map<string, Workspace>(),
  workspacesBySlug: new Map<string, Workspace>(),
  passwordsByUserId: new Map<string, PasswordRecord>()
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function memoryAuthStore() {
  return {
    async createWorkspace(input: { name: string; slug: string }) {
      const ws: Workspace = { id: id("ws"), ...input };
      db.workspacesById.set(ws.id, ws);
      db.workspacesBySlug.set(ws.slug, ws);
      return ws;
    },

    async getWorkspaceById(workspaceId: string) {
      return db.workspacesById.get(workspaceId) ?? null;
    },

    async createUser(input: {
      email: string;
      name: string;
      role: User["role"];
      workspaceId: string;
      password: string;
    }) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (db.usersByEmail.has(normalizedEmail)) {
        throw new Error("email_taken");
      }
      const user: User = {
        id: id("usr"),
        email: normalizedEmail,
        name: input.name.trim(),
        role: input.role,
        workspaceId: input.workspaceId
      };
      db.usersById.set(user.id, user);
      db.usersByEmail.set(user.email, user);
      db.passwordsByUserId.set(user.id, { userId: user.id, password: input.password });
      return user;
    },

    async createOwnerSignup(input: {
      name: string;
      email: string;
      password: string;
      workspaceName: string;
      workspaceSlug: string;
    }) {
      const workspace = await this.createWorkspace({
        name: input.workspaceName,
        slug: input.workspaceSlug
      });
      const user = await this.createUser({
        email: input.email,
        name: input.name,
        role: "owner",
        workspaceId: workspace.id,
        password: input.password
      });
      return { user, workspace };
    },

    async verifyLogin(input: { email: string; password: string }) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const user = db.usersByEmail.get(normalizedEmail);
      if (!user) return null;
      const rec = db.passwordsByUserId.get(user.id);
      if (!rec) return null;
      if (rec.password !== input.password) return null;
      return user;
    }
  };
}

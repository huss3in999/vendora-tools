import { memoryAuthStore } from "./memory-store.server";
import type { User, Workspace } from "./types";
import { createD1AuthStore } from "./d1-auth.server";
import { getD1Database } from "~/modules/db/db.server";
import type { AppLoadContext } from "@remix-run/cloudflare";

export type AuthStore = {
  createWorkspace(input: { name: string; slug: string }): Promise<Workspace>;
  getWorkspaceById(workspaceId: string): Promise<Workspace | null>;
  createUser(input: {
    email: string;
    name: string;
    role: User["role"];
    workspaceId: string;
    password: string;
  }): Promise<User>;
  createOwnerSignup(input: {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
    workspaceSlug: string;
  }): Promise<{ user: User; workspace: Workspace }>;
  verifyLogin(input: { email: string; password: string }): Promise<User | null>;
};

export function authStore(context?: AppLoadContext): AuthStore {
  const db = context ? getD1Database(context) : null;
  if (db) {
    return createD1AuthStore({ db });
  }
  return memoryAuthStore();
}

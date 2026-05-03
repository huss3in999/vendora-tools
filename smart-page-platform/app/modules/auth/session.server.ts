import { createCookieSessionStorage, redirect } from "@remix-run/cloudflare";
import type { AppLoadContext } from "@remix-run/cloudflare";
import type { Role, User } from "./types";
import { createId, getD1Database, type AppBindings } from "~/modules/db/db.server";

type SessionData = {
  sessionId?: string;
  userId?: string;
};

type SessionFlashData = {
  error?: string;
};

type SessionLoadContext = AppLoadContext & {
  cloudflare?: {
    env?: AppBindings;
  };
  env?: AppBindings;
};

function getSessionSecret(context?: AppLoadContext) {
  const loadContext = context as SessionLoadContext | undefined;
  return (
    loadContext?.cloudflare?.env?.SESSION_SECRET ??
    loadContext?.env?.SESSION_SECRET ??
    "phase1-dev-secret-change-me"
  );
}

function createSessionStorage(context?: AppLoadContext) {
  return createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__spp_session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
      secrets: [getSessionSecret(context)],
      secure: true
    }
  });
}

type SessionUserRow = {
  id: string;
  email: string;
  name: string;
  platform_role: "user" | "super_admin";
  workspace_id: string | null;
  workspace_role: "owner" | "admin" | "editor" | "viewer" | null;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function toSqlDate(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeSessionWorkspaceId(workspaceId: string | null | undefined) {
  const normalized = workspaceId?.trim();
  return normalized ? normalized : null;
}

async function getClientIpHash(request: Request) {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();

  if (!ip) return null;

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toUser(row: SessionUserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.platform_role === "super_admin" ? "super_admin" : "owner",
    workspaceId: row.workspace_id ?? ""
  };
}

export async function getSession(request: Request, context?: AppLoadContext) {
  const cookie = request.headers.get("Cookie");
  return createSessionStorage(context).getSession(cookie);
}

export async function commitSession(
  session: Awaited<ReturnType<typeof getSession>>,
  context?: AppLoadContext
) {
  return createSessionStorage(context).commitSession(session);
}

export async function destroySession(
  session: Awaited<ReturnType<typeof getSession>>,
  context?: AppLoadContext
) {
  return createSessionStorage(context).destroySession(session);
}

export async function getUser(request: Request, context?: AppLoadContext) {
  const session = await getSession(request, context);
  const db = context ? getD1Database(context) : null;

  if (db) {
    const sessionId = session.get("sessionId");
    if (!sessionId) return null;

    const row = await db
      .prepare(
        `SELECT
          users.id,
          users.email,
          users.name,
          users.role AS platform_role,
          sessions.workspace_id,
          workspace_members.role AS workspace_role
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        LEFT JOIN workspace_members
          ON workspace_members.user_id = users.id
          AND workspace_members.workspace_id = sessions.workspace_id
          AND workspace_members.status = 'active'
        WHERE sessions.id = ?
          AND sessions.revoked_at IS NULL
          AND sessions.expires_at > CURRENT_TIMESTAMP
        LIMIT 1`
      )
      .bind(sessionId)
      .first<SessionUserRow>();

    return row ? toUser(row) : null;
  }

  const userId = session.get("userId");
  return userId ? ({ id: userId } as User) : null;
}

export async function requireUser(request: Request, context?: AppLoadContext) {
  const user = await getUser(request, context);
  if (!user) throw redirect("/login");
  return user;
}

export async function requireUserId(request: Request, context?: AppLoadContext) {
  const user = await requireUser(request, context);
  return user.id;
}

export async function requireUserRole(
  request: Request,
  context: AppLoadContext,
  requiredRole: Role
) {
  const user = await requireUser(request, context);
  if (!isRoleAllowed(user.role, requiredRole)) {
    throw redirect(user.role === "super_admin" ? "/admin" : "/app");
  }
  return user;
}

export async function createUserSession(params: {
  request: Request;
  context?: AppLoadContext;
  userId: string;
  workspaceId?: string | null;
  redirectTo: string;
}) {
  const session = await getSession(params.request, params.context);
  const db = params.context ? getD1Database(params.context) : null;

  if (db) {
    const sessionId = createId("ses");
    const expiresAt = toSqlDate(new Date(Date.now() + SESSION_TTL_SECONDS * 1000));
    const workspaceId = normalizeSessionWorkspaceId(params.workspaceId);
    await db
      .prepare(
        `INSERT INTO sessions
          (id, user_id, workspace_id, expires_at, user_agent, ip_hash)
        VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        sessionId,
        params.userId,
        workspaceId,
        expiresAt,
        params.request.headers.get("User-Agent"),
        await getClientIpHash(params.request)
      )
      .run();

    session.set("sessionId", sessionId);
  } else {
    session.set("userId", params.userId);
  }

  return redirect(params.redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(session, params.context)
    }
  });
}

export async function logout(request: Request, context?: AppLoadContext) {
  const session = await getSession(request, context);
  const db = context ? getD1Database(context) : null;
  const sessionId = session.get("sessionId");

  if (db && sessionId) {
    await db
      .prepare(
        "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(sessionId)
      .run();
  }

  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session, context)
    }
  });
}

export function isRoleAllowed(userRole: Role, required: Role) {
  if (required === "owner") return userRole === "owner" || userRole === "super_admin";
  return userRole === "super_admin";
}


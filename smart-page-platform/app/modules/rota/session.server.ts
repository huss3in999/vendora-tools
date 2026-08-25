import { createCookieSessionStorage, redirect } from "@remix-run/cloudflare";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { getAppEnv } from "~/modules/db/db.server";

type RotaSessionData = { staffId?: string };

function storage(context: AppLoadContext) {
  const secret = getAppEnv(context)?.SESSION_SECRET ?? "phase1-dev-secret-change-me";
  return createCookieSessionStorage<RotaSessionData>({
    cookie: {
      name: "__cos_rota_session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secrets: [secret],
      secure: true
    }
  });
}

export async function getRotaStaffId(request: Request, context: AppLoadContext) {
  const session = await storage(context).getSession(request.headers.get("Cookie"));
  return session.get("staffId") ?? null;
}

export async function createRotaSession(request: Request, context: AppLoadContext, staffId: string, redirectTo = "/rota") {
  const store = storage(context);
  const session = await store.getSession(request.headers.get("Cookie"));
  session.set("staffId", staffId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await store.commitSession(session) }
  });
}

export async function destroyRotaSession(request: Request, context: AppLoadContext) {
  const store = storage(context);
  const session = await store.getSession(request.headers.get("Cookie"));
  return redirect("/rota", {
    headers: { "Set-Cookie": await store.destroySession(session) }
  });
}

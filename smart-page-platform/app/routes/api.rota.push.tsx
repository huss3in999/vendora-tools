import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getUser } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";
import { rotaRepository } from "~/modules/rota/rota.server";
import { getRotaStaffId } from "~/modules/rota/session.server";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

export async function action({ request, context }: ActionFunctionArgs) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: "Request rejected." }, { status: 403 });
  }

  const [staffId, manager] = await Promise.all([
    getRotaStaffId(request, context),
    getUser(request, context)
  ]);
  if (!staffId && !manager) return json({ ok: false, error: "Sign in first." }, { status: 401 });

  let body: SubscriptionBody;
  try {
    body = await request.json<SubscriptionBody>();
  } catch {
    return json({ ok: false, error: "Invalid subscription." }, { status: 400 });
  }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  try {
    const repo = rotaRepository(requireD1Database(context));
    await repo.savePushSubscription({
      staffId: staffId ?? undefined,
      managerUserId: staffId ? undefined : manager?.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("User-Agent") ?? undefined
    });
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unable to save subscription." }, { status: 400 });
  }
}

export default function PushSubscriptionRoute() {
  return null;
}

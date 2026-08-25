import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { AppBindings } from "~/modules/db/db.server";
import { rotaRepository } from "./rota.server";

type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };

export function pushIsConfigured(env?: AppBindings) {
  return Boolean(env?.VAPID_PUBLIC_KEY && env?.VAPID_PRIVATE_KEY && env?.VAPID_SUBJECT);
}

async function sendToSubscriptions(
  repo: ReturnType<typeof rotaRepository>,
  subscriptions: StoredSubscription[],
  env: AppBindings | undefined,
  message: { title: string; body: string; url?: string }
) {
  if (!pushIsConfigured(env)) return;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const payload = await buildPushPayload(
          {
            data: JSON.stringify({ ...message, url: message.url ?? "/rota" }),
            options: { ttl: 60 * 60 * 24, urgency: "normal" }
          },
          {
            endpoint: subscription.endpoint,
            expirationTime: null,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          {
            subject: env?.VAPID_SUBJECT,
            publicKey: env?.VAPID_PUBLIC_KEY,
            privateKey: env?.VAPID_PRIVATE_KEY
          }
        );
        const body = new ArrayBuffer(payload.body.byteLength);
        new Uint8Array(body).set(payload.body);
        const response = await fetch(subscription.endpoint, { ...payload, body });
        await repo.recordPushResult(subscription.id, response.ok, response.status === 404 || response.status === 410);
      } catch {
        await repo.recordPushResult(subscription.id, false);
      }
    })
  );
}

export async function pushStaffUpdate(
  db: D1Database,
  env: AppBindings | undefined,
  staffId: string,
  message: { title: string; body: string; url?: string }
) {
  const repo = rotaRepository(db);
  const subscriptions = await repo.pushSubscriptionsForStaff(staffId);
  await sendToSubscriptions(repo, subscriptions, env, { ...message, url: message.url ?? "/rota" });
}

export async function pushManagerUpdate(
  db: D1Database,
  env: AppBindings | undefined,
  managerStaffIds: string[],
  message: { title: string; body: string }
) {
  const repo = rotaRepository(db);
  const subscriptions = (await Promise.all(managerStaffIds.map((id) => repo.pushSubscriptionsForStaff(id)))).flat();
  await sendToSubscriptions(repo, subscriptions, env, { ...message, url: "/rota/manager" });
}

const SERVICE_WORKER = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let message = { title: "COS Rota", body: "You have a new rota update.", url: "/rota" };
  try {
    if (event.data) message = { ...message, ...event.data.json() };
  } catch {
    if (event.data) message.body = event.data.text();
  }
  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body,
    icon: "/icons/cos-rota-192.png",
    badge: "/icons/cos-rota-192.png",
    tag: "cos-rota-" + Date.now(),
    renotify: true,
    data: { url: message.url || "/rota" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/rota", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
`;

export async function loader() {
  return new Response(SERVICE_WORKER, { headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" } });
}

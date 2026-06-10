const CACHE_NAME = "gourmet-tomorrow-v28";
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css",
  "./app.js",
  "./admin.js",
  "./admin-story-export.js",
  "./firebase-config.js",
  "./manifest.json"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching files...");
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Service Worker: Clearing Old Cache...");
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  const requestUrl = new URL(e.request.url);
  const isApiRequest = requestUrl.pathname.startsWith("/api/");
  const isFreshAsset = e.request.mode === "navigate" || /\.(html|js|css|json)$/i.test(requestUrl.pathname);
  const isScriptOrStyle = /\.(js|css)$/i.test(requestUrl.pathname);

  if (isApiRequest || isFreshAsset) {
    e.respondWith(
      fetch(e.request, isScriptOrStyle ? { cache: "no-store" } : undefined).then((response) => {
        if (e.request.method === "GET" && response.ok && !isApiRequest) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (e.request.mode === "navigate") return caches.match("./index.html");
        return new Response("Offline", { status: 503 });
      }))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback for document requests when offline
        if (e.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

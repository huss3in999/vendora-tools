/**
 * Cash Control Service Worker
 * Caches app shell for fast offline loading. API calls always go to network.
 */

const CACHE_NAME = 'cash-control-v1';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/api.js', '/worker.js', '/owner.js', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network only
  if (url.pathname.startsWith('/api/')) return;

  // App shell: cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }),
    ),
  );
});

/**
 * Cash Control Service Worker
 * Caches app shell for fast offline loading. API calls always go to network.
 */

const CACHE_NAME = 'cash-control-v25';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css?v=25',
  '/app.js?v=25',
  '/api.js?v=25',
  '/worker.js?v=25',
  '/owner.js?v=25',
  '/purchases.js?v=25',
  '/accountant.js?v=25',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/robots.txt',
];

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

  // Browser extensions can trigger chrome-extension:// requests from this page.
  // Those schemes cannot be stored in Cache API, so ignore them completely.
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // API requests: network only
  if (url.pathname.startsWith('/api/')) return;

  if (event.request.method !== 'GET') return;

  // Navigations: network first, cached app shell if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Static app shell: cache first, then network, then offline shell fallback.
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET' && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html')),
    ),
  );
});

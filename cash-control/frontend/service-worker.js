/**
 * Cash Control Service Worker
 * Caches app shell for fast offline loading. API calls always go to network.
 */

const CACHE_NAME = 'cash-control-v5';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css?v=5',
  '/app.js',
  '/api.js',
  '/worker.js',
  '/owner.js',
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
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html')),
    ),
  );
});

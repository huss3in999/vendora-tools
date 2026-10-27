/* Vendora Dispatch PWA Service Worker (Cache-First for Static Shell, Network-Only for APIs) */
const CACHE_NAME = 'vendora-dispatch-v20261023-tripadvisor';
const PRECACHE_ASSETS = [
  '/booking-desk/',
  '/booking-desk/index.html',
  '/booking-desk/manifest.webmanifest',
  '/booking-desk/icon-192.png',
  '/booking-desk/icon-512.png',
  '/booking-desk/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Precache failed for', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // Only handle same-origin requests; never intercept cross-origin or extensions
  if (url.origin !== self.location.origin) {
    return;
  }

  // Critical: NEVER intercept or cache API endpoints (always direct network for live sheets safety)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Only handle requests for /booking-desk/ app shell and its assets
  if (!url.pathname.startsWith('/booking-desk/')) {
    return;
  }

  const isHtmlNav = req.mode === 'navigate' || url.pathname === '/booking-desk/' || url.pathname.endsWith('/index.html');

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, clone).catch(() => {});
          }).catch(() => {});
        }
        return networkRes;
      }).catch(() => {
        if (cached) return cached;
        return new Response('Network unavailable offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });

      return isHtmlNav ? fetchPromise : (cached || fetchPromise);
    })
  );
});

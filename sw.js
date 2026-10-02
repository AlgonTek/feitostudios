const CACHE_NAME = 'feito-digital-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/apple-touch-icon.png',
  '/src/assets/images/avatar_rita_thumb.webp',
  '/src/assets/images/avatar_rita_thumb.jpg',
  '/src/assets/images/avatar_arnaldo_thumb.webp',
  '/src/assets/images/avatar_arnaldo_thumb.jpg',
  '/src/assets/images/avatar_cremilda_thumb.webp',
  '/src/assets/images/avatar_cremilda_thumb.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error (non-fatal):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // External static assets (fonts): Cache first
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (e) {
          return cached;
        }
      })
    );
    return;
  }

  // Same origin requests:
  if (url.origin === self.location.origin) {
    // Navigation / HTML documents: Network-first to always reflect updates, fallback to cache if offline
    if (request.mode === 'navigate' || request.destination === 'document') {
      event.respondWith(
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || (await cache.match('/'));
        })
      );
      return;
    }

    // Static assets (images, icons, manifest): Cache first
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          return cached;
        }
      })
    );
  }
});

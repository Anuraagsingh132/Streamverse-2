/**
 * Streamverse PWA Service Worker
 * Version: 2.1.0
 * 
 * Provides offline app shell capabilities, asset caching, and lightning-fast launches
 * while strictly bypassing live media streams and video chunks.
 */

const STATIC_CACHE_NAME = 'streamverse-static-v2';
const IMAGE_CACHE_NAME = 'streamverse-images-v2';
const MAX_IMAGE_CACHE_ENTRIES = 120;

// Essential app shell URLs to precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png'
];

// Domains/paths that must ALWAYS bypass the Service Worker
const BYPASS_PATTERNS = [
  '/api/pixeldrain',
  'pixeldrain.dev',
  'pixeldrain.com',
  'hdhub',
  'pengu',
  'vidsrc',
  'megaplay',
  'videasy',
  'vidfast',
  'vidlux',
  'vidlove',
  'vidrock',
  'mappletv',
  'vixsrc',
  'youtube.com',
  '.m3u8',
  '.ts',
  '.mp4',
  '.webm',
  'range='
];

// Install Event: Precache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache non-fatal error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Purge old cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Strict Bypass: Video segments, streams, player iframes, range requests
  const urlString = request.url.toLowerCase();
  const shouldBypass = BYPASS_PATTERNS.some((pattern) => urlString.includes(pattern)) || request.headers.has('range');
  if (shouldBypass) {
    return;
  }

  // 3. Navigation requests (HTML): Network-first with offline fallback to /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const shell = await caches.match('/index.html');
        if (shell) return shell;
        return caches.match('/');
      })
    );
    return;
  }

  // 4. Static Local Assets (JS, CSS, Fonts, Icons) in /assets/, /icons/, /media/
  const isStaticAsset = url.origin === self.location.origin && (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/media/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background for non-immutable assets
          if (!url.pathname.startsWith('/assets/')) {
            fetch(request).then((netResp) => {
              if (netResp && netResp.status === 200) {
                caches.open(STATIC_CACHE_NAME).then((c) => c.put(request, netResp));
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const respClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, respClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. TMDB Images & Poster Art: Stale-While-Revalidate with bounded cache
  const isTmdbImage = url.hostname.includes('tmdb.org') || url.hostname.includes('images.unsplash.com');
  if (isTmdbImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            // Trim cache if too large
            trimCache(IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_ENTRIES);
          }
          return networkResponse;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});

// Helper: Trim cache to max size
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      trimCache(cacheName, maxItems);
    }
  } catch {}
}

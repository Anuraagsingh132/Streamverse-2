/**
 * Streamverse PWA Service Worker
 * Version: 3.0.0
 * 
 * Provides robust offline app shell capabilities and asset caching for PWA
 * while strictly bypassing cross-origin media, CDNs, and streaming chunks.
 */

const STATIC_CACHE_NAME = 'streamverse-static-v3';

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

// Activate Event: Purge old cache generations (v1, v2, images, etc.)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME) {
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
        const root = await caches.match('/');
        if (root) return root;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // 4. IMPORTANT: Do NOT intercept cross-origin requests (e.g. TMDB, Unsplash, AniList)!
  // By returning here without event.respondWith(), the browser loads them natively.
  // This avoids CSP connect-src violations on <img> elements, prevents opaque caching quotas,
  // and relies on native HTTP browser cache for third-party media assets.
  if (url.origin !== self.location.origin) {
    return;
  }

  // 5. Static Local Assets (JS, CSS, Fonts, Icons) in /assets/, /icons/, /media/
  const isStaticAsset = (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/media/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.webmanifest')
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
      }).catch(() => fetch(request))
    );
    return;
  }
});

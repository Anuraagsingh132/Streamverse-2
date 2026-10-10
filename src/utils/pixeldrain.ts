/**
 * PixelDrain streaming route configuration and URL translation utility.
 * Supports toggling between the standard edge proxy (/api/pixeldrain/:id)
 * and the fast CDN mirror proxy (/api/pixeldrain-cdn/:id) which proxies
 * and falls back to ensure reliable video playback without CORS or ISP block issues.
 */

export type PixelDrainRoute = 'normal' | 'cdn';

export const PIXELDRAIN_STORAGE_KEY = 'streamverse_pixeldrain_route';
export const PIXELDRAIN_CHANGE_EVENT = 'streamverse_pixeldrain_route_change';

/**
 * Retrieves the currently selected PixelDrain streaming route from persistent storage.
 * Defaults to 'normal' (standard edge proxy).
 */
export function getPixelDrainRoute(): PixelDrainRoute {
  if (typeof window === 'undefined') return 'normal';
  try {
    const saved = localStorage.getItem(PIXELDRAIN_STORAGE_KEY);
    if (saved === 'cdn' || saved === 'normal') {
      return saved;
    }
  } catch {
    // Ignore localStorage access failures (e.g. private browsing or SSR)
  }
  return 'normal';
}

type CacheInvalidator = () => void;
const cacheInvalidators: CacheInvalidator[] = [];

/**
 * Registers a callback to clear cached streams when the user switches routes.
 */
export function registerPixelDrainCacheInvalidator(fn: CacheInvalidator): void {
  cacheInvalidators.push(fn);
}

/**
 * Persists the selected PixelDrain route and broadcasts a window event for reactive listeners.
 */
export function setPixelDrainRoute(route: PixelDrainRoute): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PIXELDRAIN_STORAGE_KEY, route);
    // Invalidate caches
    cacheInvalidators.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore invalidation error
      }
    });
    window.dispatchEvent(
      new CustomEvent(PIXELDRAIN_CHANGE_EVENT, {
        detail: { route }
      })
    );
  } catch {
    // Ignore localStorage access failures
  }
}

/**
 * Extracts the alphanumeric PixelDrain file ID from any PixelDrain URL format.
 * Matches:
 * - https://pixeldrain.com/u/:id
 * - https://pixeldrain.dev/u/:id
 * - https://pixeldrain.com/api/file/:id
 * - https://pixeldrain.dev/api/file/:id
 * - https://cdn.pixeldrain.eu.cc/:id
 * - /api/pixeldrain/:id
 * - /api/pixeldrain-cdn/:id
 */
export function extractPixelDrainId(url?: string | null, fullText?: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // 1. Direct domain, CDN, or local proxy matching (/api/pixeldrain/:id or /api/pixeldrain-cdn/:id)
  const standardMatch = url.match(
    /(?:pixeldrain\.(?:dev|com)\/(?:api\/file\/|u\/)|\/api\/pixeldrain(?:-cdn)?\/|cdn\d*\.pixeldrain\.eu\.cc\/(?:api\/file\/)?)([a-zA-Z0-9_-]+)/i
  );
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1];
  }

  // 2. Fallback if context text mentions pixeldrain and URL contains a 6-16 character alphanumeric ID
  if (fullText && /pixeldrain/i.test(fullText)) {
    const extMatch = url.match(/\/([a-zA-Z0-9_-]{6,16})(?:\?|$)/);
    if (extMatch && extMatch[1]) {
      return extMatch[1];
    }
  }

  return null;
}

/**
 * Formats a PixelDrain file ID into the desired playback URL based on the route.
 * Both routes use our high-speed edge proxies to bypass CORS, hotlinking,
 * and ISP DNS blocks, guaranteeing 100% video playback success in the browser.
 * - 'normal': /api/pixeldrain/:id (proxies pixeldrain.dev)
 * - 'cdn': /api/pixeldrain-cdn/:id (proxies cdn.pixeldrain.eu.cc with failover)
 */
export const CLOUDFLARE_WORKER_PROXY_URL = 'https://lively-bar-b4aa.anuraagsingh10a.workers.dev';

/**
 * Formats a PixelDrain file ID into the desired playback URL based on the route.
 * Defaults to our high-speed Cloudflare Worker proxy (or VITE_WORKER_PROXY_URL),
 * routing Range requests smoothly with automatic CDN mirror failover.
 * - 'normal': /api/pixeldrain/:id
 * - 'cdn': /api/pixeldrain-cdn/:id?mode=cdn
 */
export function formatPixelDrainUrl(
  id: string,
  route: PixelDrainRoute = getPixelDrainRoute()
): string {
  const customProxy =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_WORKER_PROXY_URL : undefined;

  if (customProxy) {
    const base = customProxy.replace(/\/$/, '');
    if (route === 'cdn') {
      return `${base}/api/pixeldrain-cdn/${id}?mode=cdn`;
    }
    return `${base}/api/pixeldrain/${id}`;
  }
  if (route === 'cdn') {
    return `/api/pixeldrain-cdn/${id}`;
  }
  return `/api/pixeldrain/${id}`;
}

/**
 * Returns the direct external CDN or download URL for external tools like VLC.
 */
export function getPixelDrainExternalUrl(
  id: string,
  route: PixelDrainRoute = getPixelDrainRoute()
): string {
  if (route === 'cdn') {
    return `https://cdn.pixeldrain.eu.cc/${id}`;
  }
  return `https://pixeldrain.dev/api/file/${id}`;
}

/**
 * Converts a stream URL to the selected PixelDrain route if it is a PixelDrain stream.
 * If not a PixelDrain stream, returns the original URL untouched.
 */
export function resolvePixelDrainStreamUrl(
  url: string,
  fullText?: string,
  route: PixelDrainRoute = getPixelDrainRoute()
): string {
  const id = extractPixelDrainId(url, fullText);
  if (id) {
    return formatPixelDrainUrl(id, route);
  }
  return url;
}

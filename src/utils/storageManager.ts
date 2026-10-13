/**
 * LocalStorage Quota & LRU Eviction Manager
 * Prevents QuotaExceededError by purging expired items and enforcing an LRU cap (default 30 items)
 * across explicit key prefixes (e.g. 'tmdb_', 'anilist_').
 * Strictly protects user preferences (watchlist, settings, playback history, theme) from eviction.
 */

export interface StorageOptions {
  prefix?: string;
  maxItems?: number;
  ttlMs?: number;
}

const DEFAULT_MAX_ITEMS = 30;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const PROTECTED_STORAGE_KEYS = [
  'streamverse_watchlist',
  'streamverse_watchlist_items',
  'streamverse_settings',
  'streamverse_playback_history',
  'streamverse_theme',
  'streamverse_continue_watching',
  'streamverse_pixeldrain_route'
];

export function isProtectedStorageKey(key: string): boolean {
  return PROTECTED_STORAGE_KEYS.some((p) => key === p || key.startsWith(p));
}

interface CachedRecord {
  key: string;
  timestamp: number;
}

const sweepTimers = new Map<string, any>();

/**
 * Debounced background storage sweep to avoid blocking the main thread on every write.
 */
export function debouncedSweepStorage(
  prefix: string,
  maxItems: number = DEFAULT_MAX_ITEMS,
  ttlMs: number = DEFAULT_TTL_MS,
  delayMs: number = 200
): void {
  if (!prefix) return;
  if (sweepTimers.has(prefix)) {
    clearTimeout(sweepTimers.get(prefix));
  }
  const timer = setTimeout(() => {
    sweepTimers.delete(prefix);
    sweepStorage(prefix, maxItems, ttlMs);
  }, delayMs);
  sweepTimers.set(prefix, timer);
}

/**
 * Scans localStorage for keys matching the explicit prefix, deletes expired entries (> ttlMs),
 * and if the remaining count exceeds maxItems, evicts the oldest entries until within quota.
 * Never evicts protected user preference keys.
 */
export function sweepStorage(
  prefix: string,
  maxItems: number = DEFAULT_MAX_ITEMS,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!prefix) return; // Hazardous auto-inferred prefix removed: explicit prefix required

  const now = Date.now();
  const matchedEntries: CachedRecord[] = [];

  // 1. Gather all keys matching prefix and inspect timestamps
  try {
    const totalKeys = window.localStorage.length;
    const keysToCheck: string[] = [];
    for (let i = 0; i < totalKeys; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix) && !isProtectedStorageKey(k)) {
        keysToCheck.push(k);
      }
    }

    for (const k of keysToCheck) {
      if (isProtectedStorageKey(k)) continue;
      try {
        const raw = window.localStorage.getItem(k);
        if (!raw) {
          window.localStorage.removeItem(k);
          continue;
        }

        let timestamp = 0;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.timestamp === 'number') {
            timestamp = parsed.timestamp;
          }
        } catch {
          // If not standard JSON with timestamp, treat as 0 (evictable)
        }

        // Purge if older than TTL
        if (ttlMs > 0 && timestamp > 0 && now - timestamp > ttlMs) {
          window.localStorage.removeItem(k);
        } else {
          matchedEntries.push({ key: k, timestamp });
        }
      } catch {
        // Ignore single item read errors
      }
    }

    // 2. Enforce maxItems quota using LRU / oldest timestamp first
    if (matchedEntries.length >= maxItems) {
      // Sort ascending by timestamp (oldest first)
      matchedEntries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemoveCount = matchedEntries.length - maxItems + 1; // leave room for 1 new item
      for (let i = 0; i < toRemoveCount; i++) {
        const itemKey = matchedEntries[i]?.key;
        if (itemKey && !isProtectedStorageKey(itemKey)) {
          window.localStorage.removeItem(itemKey);
        }
      }
    }
  } catch {
    // Graceful degradation if localStorage iteration fails
  }
}

/**
 * Safely writes an entry to localStorage with automatic TTL sweep and LRU quota capping.
 * Gracefully falls back to sessionStorage if localStorage quota is exceeded or inaccessible.
 */
export function safeSetStorageItem(
  key: string,
  value: string,
  options?: StorageOptions
): boolean {
  if (typeof window === 'undefined') return false;

  // Explicit prefix only - hazardous auto-inferred prefix is removed
  const prefix = options?.prefix;
  const maxItems = options?.maxItems ?? DEFAULT_MAX_ITEMS;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  // Debounced sweep so writing does not block main thread on every write
  if (prefix) {
    debouncedSweepStorage(prefix, maxItems, ttlMs);
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Emergency eviction: purge oldest items with prefix if quota exceeded
    try {
      if (prefix) {
        sweepStorage(prefix, Math.floor(maxItems / 2), ttlMs);
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch {
      // Continue to fallback
    }

    // Fallback to sessionStorage
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return true;
      }
    } catch {
      // Both storages full or disabled
    }
    return false;
  }
}

/**
 * Safely reads an entry from localStorage, falling back to sessionStorage if not found.
 */
export function safeGetStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key) || window.sessionStorage?.getItem(key) || null;
  } catch {
    return null;
  }
}

/**
 * Clears cached media data (TMDB, AniList, stream metadata, logos) from disk (localStorage and sessionStorage).
 * If itemId is passed, clears only keys associated with that media item.
 * Strictly preserves user settings, watchlist, theme, and continue-watching playback history.
 */
export function clearMediaDiskCache(itemId?: string | number): void {
  if (typeof window === 'undefined') return;

  const storages = [window.localStorage, window.sessionStorage].filter(Boolean);
  const idStr = itemId !== undefined && itemId !== null ? String(itemId) : '';

  for (const store of storages) {
    try {
      const keysToRemove: string[] = [];
      const len = store.length;
      for (let i = 0; i < len; i++) {
        const k = store.key(i);
        if (!k) continue;

        // Never clear user settings, watchlist, theme, or playback progress
        if (
          isProtectedStorageKey(k) ||
          k.startsWith('streamverse_watchlist') ||
          k.startsWith('streamverse_settings') ||
          k.startsWith('streamverse_theme') ||
          k.startsWith('streamverse_playback_history') ||
          k.startsWith('streamverse_continue_watching')
        ) {
          continue;
        }

        // Target TMDB, AniList, anime logos, and stream resolvers disk caches
        if (
          k.startsWith('tmdb_') ||
          k.startsWith('anilist_') ||
          k.startsWith('anime_logo_') ||
          k.startsWith('stream_cache_')
        ) {
          if (!idStr || k.includes(`/${idStr}`) || k.includes(`_${idStr}`) || k.includes(`%2F${idStr}`) || k.includes(`=${idStr}`)) {
            keysToRemove.push(k);
          }
        }
      }

      for (const k of keysToRemove) {
        store.removeItem(k);
      }
    } catch {
      // Ignore access errors
    }
  }
}

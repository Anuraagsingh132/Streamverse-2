/**
 * LocalStorage Quota & LRU Eviction Manager
 * Prevents QuotaExceededError by purging expired items and enforcing an LRU cap (default 30 items)
 * across key prefixes (e.g. 'tmdb_', 'anilist_').
 */

export interface StorageOptions {
  prefix?: string;
  maxItems?: number;
  ttlMs?: number;
}

const DEFAULT_MAX_ITEMS = 30;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedRecord {
  key: string;
  timestamp: number;
}

/**
 * Scans localStorage for keys matching the prefix, deletes expired entries (> ttlMs),
 * and if the remaining count exceeds maxItems, evicts the oldest entries until within quota.
 */
export function sweepStorage(
  prefix: string,
  maxItems: number = DEFAULT_MAX_ITEMS,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const now = Date.now();
  const matchedEntries: CachedRecord[] = [];

  // 1. Gather all keys matching prefix and inspect timestamps
  try {
    const totalKeys = window.localStorage.length;
    const keysToCheck: string[] = [];
    for (let i = 0; i < totalKeys; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToCheck.push(k);
      }
    }

    for (const k of keysToCheck) {
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
        window.localStorage.removeItem(matchedEntries[i].key);
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

  const prefix = options?.prefix || (key.includes('_') ? key.split('_')[0] + '_' : '');
  const maxItems = options?.maxItems ?? DEFAULT_MAX_ITEMS;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  // Sweep matching keys before writing
  if (prefix) {
    sweepStorage(prefix, maxItems, ttlMs);
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Emergency eviction: purge all items with prefix
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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaItem } from '../types/media';
import { allMedia } from '../data/mediaData';
import { safeSetStorageItem, safeGetStorageItem } from '../utils/storageManager';

export const WATCHLIST_CHANGE_EVENT = 'streamverse_watchlist_change';

const CANONICAL_STORAGE_KEY = 'streamverse_watchlist';
const LEGACY_ITEMS_KEY = 'streamverse_watchlist_items';

function normalizeMediaItem(item: any): MediaItem {
  return {
    ...item,
    id: String(item.id),
    tmdbId: item.tmdbId ? String(item.tmdbId) : undefined
  };
}

function getInitialWatchlistItems(): MediaItem[] {
  try {
    const raw = safeGetStorageItem(CANONICAL_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return [];
        if (typeof parsed[0] === 'object' && parsed[0] !== null) {
          return parsed.map(normalizeMediaItem);
        }
        // Legacy raw IDs fallback
        return allMedia.filter((m) => parsed.map(String).includes(String(m.id))).map(normalizeMediaItem);
      }
    }

    // Check legacy separate items key
    const rawLegacy = safeGetStorageItem(LEGACY_ITEMS_KEY);
    if (rawLegacy !== null) {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy)) {
        const normalized = parsedLegacy.map(normalizeMediaItem);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(LEGACY_ITEMS_KEY);
          }
          safeSetStorageItem(CANONICAL_STORAGE_KEY, JSON.stringify(normalized));
        } catch {}
        return normalized;
      }
    }

    // First-time visitor default preview items
    const defaultIds = ['258165', '977942', '94605'];
    return allMedia.filter((m) => defaultIds.includes(String(m.id))).map(normalizeMediaItem);
  } catch {
    return [];
  }
}

let globalWatchlistItems: MediaItem[] = getInitialWatchlistItems();

function emitWatchlistChange() {
  try {
    safeSetStorageItem(CANONICAL_STORAGE_KEY, JSON.stringify(globalWatchlistItems));
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEGACY_ITEMS_KEY);
    }
  } catch (err) {
    console.warn('Failed to persist watchlist to storage', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGE_EVENT, { detail: globalWatchlistItems }));
  }
}

/**
 * Global reactive hook for managing the Streamverse Watchlist state
 * with automatic cross-component synchronization, string-standardized IDs, and safe storage persistence.
 */
export function useWatchlistStore() {
  const [items, setItems] = useState<MediaItem[]>(globalWatchlistItems);

  useEffect(() => {
    const handleSync = (e: Event) => {
      if (e instanceof StorageEvent) {
        if (e.key === CANONICAL_STORAGE_KEY) {
          if (e.newValue === null) {
            // Storage was cleared in another tab
            globalWatchlistItems = [];
            setItems([]);
            return;
          }
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeMediaItem);
              globalWatchlistItems = normalized;
              setItems(normalized);
              return;
            }
          } catch {
            // Ignore malformed external storage updates
          }
        }
        return;
      }
      const customEvent = e as CustomEvent<MediaItem[]>;
      if (customEvent.detail) {
        setItems(customEvent.detail);
      } else {
        setItems([...globalWatchlistItems]);
      }
    };

    window.addEventListener(WATCHLIST_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const isInWatchlist = useCallback(
    (id: string | number) => {
      const strId = String(id);
      return items.some((item) => String(item.id) === strId || (item.tmdbId && String(item.tmdbId) === strId));
    },
    [items]
  );

  const addToWatchlist = useCallback((item: MediaItem) => {
    if (!item || !item.id) return;
    const normalizedItem = normalizeMediaItem(item);
    const targetId = String(item.id);
    const targetTmdb = item.tmdbId ? String(item.tmdbId) : undefined;
    const exists = globalWatchlistItems.some(
      (i) => String(i.id) === targetId || (targetTmdb && String(i.tmdbId) === targetTmdb)
    );
    if (!exists) {
      globalWatchlistItems = [normalizedItem, ...globalWatchlistItems];
      emitWatchlistChange();
    }
  }, []);

  const removeFromWatchlist = useCallback((id: string | number) => {
    const strId = String(id);
    globalWatchlistItems = globalWatchlistItems.filter(
      (i) => String(i.id) !== strId && (!i.tmdbId || String(i.tmdbId) !== strId)
    );
    emitWatchlistChange();
  }, []);

  const toggleWatchlist = useCallback(
    (item: MediaItem) => {
      if (!item || !item.id) return;
      if (isInWatchlist(item.id)) {
        removeFromWatchlist(item.id);
      } else {
        addToWatchlist(item);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  const clearWatchlist = useCallback(() => {
    globalWatchlistItems = [];
    emitWatchlistChange();
  }, []);

  const watchlistIds = useMemo(() => items.map((i) => String(i.id)), [items]);

  return {
    items,
    watchlistIds,
    count: items.length,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
  };
}

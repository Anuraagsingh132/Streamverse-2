import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/media';
import { allMedia } from '../data/mediaData';

export const WATCHLIST_CHANGE_EVENT = 'streamverse_watchlist_change';

const STORAGE_KEYS = {
  items: 'streamverse_watchlist_items',
  ids: 'streamverse_watchlist',
} as const;

function getInitialWatchlistItems(): MediaItem[] {
  try {
    const rawItems = localStorage.getItem(STORAGE_KEYS.items);
    if (rawItems) {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawIds = localStorage.getItem(STORAGE_KEYS.ids);
    const savedIds: string[] = rawIds ? JSON.parse(rawIds) : ['258165', '977942', '94605'];
    return allMedia.filter((m) => savedIds.includes(m.id));
  } catch {
    return allMedia.slice(0, 3);
  }
}

let globalWatchlistItems: MediaItem[] = getInitialWatchlistItems();

function emitWatchlistChange() {
  try {
    localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(globalWatchlistItems));
    localStorage.setItem(STORAGE_KEYS.ids, JSON.stringify(globalWatchlistItems.map((i) => i.id)));
  } catch (err) {
    console.warn('Failed to persist watchlist to localStorage', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGE_EVENT, { detail: globalWatchlistItems }));
  }
}

/**
 * Global reactive hook for managing the Streamverse Watchlist state
 * with automatic cross-component synchronization and localStorage persistence.
 */
export function useWatchlistStore() {
  const [items, setItems] = useState<MediaItem[]>(globalWatchlistItems);

  useEffect(() => {
    const handleSync = (e: Event) => {
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
    const exists = globalWatchlistItems.some(
      (i) => String(i.id) === String(item.id) || (item.tmdbId && i.tmdbId === item.tmdbId)
    );
    if (!exists) {
      globalWatchlistItems = [item, ...globalWatchlistItems];
      emitWatchlistChange();
    }
  }, []);

  const removeFromWatchlist = useCallback((id: string | number) => {
    const strId = String(id);
    globalWatchlistItems = globalWatchlistItems.filter(
      (i) => String(i.id) !== strId && String(i.tmdbId) !== strId
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

  return {
    items,
    watchlistIds: items.map((i) => i.id),
    count: items.length,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
  };
}

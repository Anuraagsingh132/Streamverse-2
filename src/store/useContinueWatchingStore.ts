import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/media';

export interface PlaybackRecord {
  id: string | number;
  tmdbId?: string | number;
  media_type: 'movie' | 'tv' | 'anime';
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  progressPercent: number;
  updatedAt: number;
}

export const CONTINUE_WATCHING_STORAGE_KEY = 'streamverse_playback_history';
export const CONTINUE_WATCHING_CHANGE_EVENT = 'streamverse_playback_history_change';
const MAX_HISTORY_RECORDS = 50;

/**
 * Migration & Cleanup: Purges legacy fragmented per-episode keys (DATA-05).
 */
function cleanLegacyZombieKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('streamverse_playback_progress_')) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // Non-blocking
  }
}

function getInitialHistory(): PlaybackRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    cleanLegacyZombieKeys();
    const raw = window.localStorage.getItem(CONTINUE_WATCHING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_RECORDS);
    }
    return [];
  } catch {
    return [];
  }
}

let globalHistory: PlaybackRecord[] = getInitialHistory();

function emitHistoryChange() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CONTINUE_WATCHING_STORAGE_KEY,
      JSON.stringify(globalHistory.slice(0, MAX_HISTORY_RECORDS))
    );
  } catch (err) {
    console.warn('Failed to persist playback history to localStorage', err);
  }

  window.dispatchEvent(
    new CustomEvent(CONTINUE_WATCHING_CHANGE_EVENT, { detail: globalHistory })
  );
}

export function savePlaybackRecord(
  item: Partial<MediaItem> & { id: string | number; title?: string },
  progress: { season?: number; episode?: number; currentTime: number; duration: number }
): void {
  const { currentTime, duration, season, episode } = progress;
  if (!Number.isFinite(currentTime) || currentTime < 5) return;

  const baseId = String(item.tmdbId || item.id);
  const isSeries = item.media_type === 'tv' || item.media_type === 'anime' || season !== undefined;

  // If video is basically finished (last 15 seconds or > 95%), remove from continue watching
  if (duration > 30 && currentTime > duration - 15) {
    removePlaybackRecord(item.id, season, episode);
    return;
  }

  const percent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  const newRecord: PlaybackRecord = {
    id: item.id,
    tmdbId: item.tmdbId,
    media_type: (item.media_type as any) || (isSeries ? 'tv' : 'movie'),
    title: item.title || 'Untitled',
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    season: isSeries ? season || 1 : undefined,
    episode: isSeries ? episode || 1 : undefined,
    currentTime: Math.floor(currentTime),
    duration: Math.floor(duration || 0),
    progressPercent: percent,
    updatedAt: Date.now()
  };

  // Remove matching existing record for same show/season/episode or same movie
  globalHistory = globalHistory.filter((r) => {
    const rBaseId = String(r.tmdbId || r.id);
    if (rBaseId !== baseId) return true;
    if (isSeries) {
      return !(r.season === newRecord.season && r.episode === newRecord.episode);
    }
    return false;
  });

  // Prepend to top (MRU order) and cap at 50
  globalHistory = [newRecord, ...globalHistory].slice(0, MAX_HISTORY_RECORDS);
  emitHistoryChange();
}

export function removePlaybackRecord(
  id: string | number,
  season?: number,
  episode?: number
): void {
  const targetId = String(id);
  globalHistory = globalHistory.filter((r) => {
    const matchId = String(r.id) === targetId || (r.tmdbId && String(r.tmdbId) === targetId);
    if (!matchId) return true;
    if (season !== undefined && episode !== undefined) {
      return !(r.season === season && r.episode === episode);
    }
    return false;
  });
  emitHistoryChange();
}

export function getPlaybackRecord(
  id: string | number,
  season?: number,
  episode?: number
): PlaybackRecord | undefined {
  const targetId = String(id);
  return globalHistory.find((r) => {
    const matchId = String(r.id) === targetId || (r.tmdbId && String(r.tmdbId) === targetId);
    if (!matchId) return false;
    if (season !== undefined && episode !== undefined) {
      return r.season === season && r.episode === episode;
    }
    return true;
  });
}

/**
 * Global reactive hook for Continue Watching / Playback History state.
 */
export function useContinueWatchingStore() {
  const [history, setHistory] = useState<PlaybackRecord[]>(globalHistory);

  useEffect(() => {
    const handleSync = (e: Event) => {
      if (e instanceof StorageEvent) {
        if (e.key === CONTINUE_WATCHING_STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              globalHistory = parsed;
              setHistory(parsed);
              return;
            }
          } catch {
            // ignore
          }
        }
        return;
      }

      const customEvent = e as CustomEvent<PlaybackRecord[]>;
      if (customEvent.detail) {
        setHistory(customEvent.detail);
      } else {
        setHistory([...globalHistory]);
      }
    };

    window.addEventListener(CONTINUE_WATCHING_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(CONTINUE_WATCHING_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const clearHistory = useCallback(() => {
    globalHistory = [];
    emitHistoryChange();
  }, []);

  return {
    history,
    count: history.length,
    saveProgress: savePlaybackRecord,
    removeRecord: removePlaybackRecord,
    getRecord: getPlaybackRecord,
    clearHistory
  };
}

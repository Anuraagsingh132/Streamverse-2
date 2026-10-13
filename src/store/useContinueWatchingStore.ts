import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/media';
import { safeSetStorageItem, safeGetStorageItem } from '../utils/storageManager';

export interface PlaybackRecord {
  id: string;
  tmdbId?: string;
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

function normalizePlaybackRecord(r: any): PlaybackRecord {
  return {
    ...r,
    id: String(r.id),
    tmdbId: r.tmdbId ? String(r.tmdbId) : undefined,
    currentTime: Number(r.currentTime) || 0,
    duration: Number(r.duration) || 0,
    progressPercent: Number(r.progressPercent) || 0,
    updatedAt: Number(r.updatedAt) || 0
  };
}

/**
 * Merges two lists of playback records, resolving duplicate media/episode keys
 * by retaining the record with the most recent `updatedAt` timestamp.
 * Returns records sorted descending by `updatedAt` (MRU order), capped at MAX_HISTORY_RECORDS.
 */
export function mergePlaybackRecords(
  primary: PlaybackRecord[],
  secondary: PlaybackRecord[]
): PlaybackRecord[] {
  const map = new Map<string, PlaybackRecord>();
  const getRecordKey = (r: PlaybackRecord) => {
    const baseId = String(r.tmdbId || r.id);
    const isSeries = r.media_type === 'tv' || r.media_type === 'anime' || r.season !== undefined;
    return isSeries ? `${baseId}_s${r.season || 1}_e${r.episode || 1}` : `${baseId}_movie`;
  };

  for (const r of [...secondary, ...primary]) {
    const key = getRecordKey(r);
    const existing = map.get(key);
    if (!existing || (r.updatedAt || 0) >= (existing.updatedAt || 0)) {
      map.set(key, r);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_HISTORY_RECORDS);
}

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
  cleanLegacyZombieKeys();
  try {
    const raw = safeGetStorageItem(CONTINUE_WATCHING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizePlaybackRecord).slice(0, MAX_HISTORY_RECORDS);
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
    safeSetStorageItem(
      CONTINUE_WATCHING_STORAGE_KEY,
      JSON.stringify(globalHistory.slice(0, MAX_HISTORY_RECORDS))
    );
  } catch (err) {
    console.warn('Failed to persist playback history to storage', err);
  }

  window.dispatchEvent(
    new CustomEvent(CONTINUE_WATCHING_CHANGE_EVENT, { detail: globalHistory })
  );
}

function readDiskRecords(): PlaybackRecord[] {
  try {
    const raw = safeGetStorageItem(CONTINUE_WATCHING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizePlaybackRecord);
    }
  } catch {}
  return [];
}

export function savePlaybackRecord(
  item: Partial<MediaItem> & { id: string | number; title?: string },
  progress: { season?: number; episode?: number; currentTime: number; duration: number }
): void {
  const { currentTime, duration, season, episode } = progress;
  if (!Number.isFinite(currentTime) || currentTime < 5) return;

  const strId = String(item.id);
  const strTmdbId = item.tmdbId ? String(item.tmdbId) : undefined;
  const isSeries = item.media_type === 'tv' || item.media_type === 'anime' || season !== undefined;

  // If video is basically finished (last 15 seconds or > 95%), remove from continue watching
  if (duration > 30 && currentTime > duration - 15) {
    removePlaybackRecord(item.id, season, episode);
    return;
  }

  const percent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  const newRecord: PlaybackRecord = {
    id: strId,
    tmdbId: strTmdbId,
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

  // Merge with latest disk records by updatedAt before saving to prevent multi-tab overwrites
  const diskRecords = readDiskRecords();
  const baseMerged = mergePlaybackRecords(globalHistory, diskRecords);

  // Remove existing matching entry for same media/episode
  const baseId = strTmdbId || strId;
  const filtered = baseMerged.filter((r) => {
    const rBaseId = String(r.tmdbId || r.id);
    if (rBaseId !== baseId) return true;
    if (isSeries) {
      return !(r.season === newRecord.season && r.episode === newRecord.episode);
    }
    return false;
  });

  globalHistory = [newRecord, ...filtered].slice(0, MAX_HISTORY_RECORDS);
  emitHistoryChange();
}

export function removePlaybackRecord(
  id: string | number,
  season?: number,
  episode?: number
): void {
  const targetId = String(id);
  const diskRecords = readDiskRecords();
  const merged = mergePlaybackRecords(globalHistory, diskRecords);

  globalHistory = merged.filter((r) => {
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
        if (e.key === CONTINUE_WATCHING_STORAGE_KEY) {
          if (e.newValue === null) {
            // Storage cleared in another tab
            globalHistory = [];
            setHistory([]);
            return;
          }
          try {
            const parsed = JSON.parse(e.newValue);
            if (Array.isArray(parsed)) {
              const incoming = parsed.map(normalizePlaybackRecord);
              globalHistory = mergePlaybackRecords(incoming, globalHistory);
              setHistory(globalHistory);
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

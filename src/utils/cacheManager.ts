import { clearTmdbCache } from '../services/tmdb';
import { clearAniListCache } from '../services/anilist';
import { clearAnimeResolverCache } from '../services/animeResolver';
import { clearHDHubCache } from '../services/hdhub';
import { clearPenguCache } from '../services/pengu';
import { clearMediaDiskCache } from './storageManager';
import { MediaItem } from '../types/media';

export type PurgeTarget =
  | MediaItem
  | { id: string | number; tmdbId?: string | number; imdbId?: string }
  | string
  | number
  | null
  | undefined;

/**
 * Universal media cache purger.
 * When a user leaves, goes back from, or closes a movie, TV show, anime, or video playback:
 * - Evicts disk cache (localStorage / sessionStorage) for that specific media title
 * - Purges in-memory LRU metadata and stream resolver caches (TMDB, AniList, HDHub, Pengu)
 * - Guarantees that opening or playing this title again makes fresh live network fetches
 * - Strictly protects user preferences (watchlist, settings, theme, continue watching)
 */
export function purgeMediaItemCache(target?: PurgeTarget): void {
  if (!target) {
    try {
      clearTmdbCache();
      clearAniListCache();
      clearAnimeResolverCache();
      clearHDHubCache();
      clearPenguCache();
      clearMediaDiskCache();
    } catch (err) {
      console.warn('[CacheManager] Error during global cache purge:', err);
    }
    return;
  }

  let id: string | number | undefined;
  let tmdbId: string | number | undefined;
  let imdbId: string | undefined;

  if (typeof target === 'object') {
    id = target.id;
    tmdbId = 'tmdbId' in target ? target.tmdbId : undefined;
    imdbId = 'imdbId' in target ? target.imdbId : undefined;
  } else {
    id = target;
  }

  try {
    // 1. Clear TMDB in-memory and disk records
    if (id !== undefined && id !== null) {
      clearTmdbCache(id);
    }
    if (tmdbId !== undefined && tmdbId !== null && tmdbId !== id) {
      clearTmdbCache(tmdbId);
    }

    // 2. Clear AniList in-memory and disk records
    if (id !== undefined && id !== null) {
      clearAniListCache(id);
    }

    // 3. Clear anime-to-TMDB resolver cache
    if (id !== undefined && id !== null) {
      clearAnimeResolverCache(id);
    }

    // 4. Clear stream resolution caches (HDHub & Pengu)
    const streamKeys = [imdbId, tmdbId, id].filter(Boolean);
    for (const key of streamKeys) {
      clearHDHubCache(key);
      clearPenguCache(key);
    }

    // 5. Ensure disk storage entries are thoroughly evicted
    if (id !== undefined && id !== null) {
      clearMediaDiskCache(id);
    }
    if (tmdbId !== undefined && tmdbId !== null && tmdbId !== id) {
      clearMediaDiskCache(tmdbId);
    }
    if (imdbId) {
      clearMediaDiskCache(imdbId);
    }
  } catch (err) {
    console.warn(`[CacheManager] Error purging cache for target ${id}:`, err);
  }
}

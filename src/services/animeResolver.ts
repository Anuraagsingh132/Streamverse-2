import { MediaItem } from '../types/media';
import { searchTmdb, getImdbId } from './tmdb';
import { LRUCache, deduplicateInFlight } from '../utils/lruCache';

export interface ResolvedAnimeMetadata {
  tmdbId: string;
  imdbId?: string;
  season: number;
  tmdbTitle: string;
  backdrop_path?: string;
  poster_path?: string;
  vote_average?: number;
}

// Bounded LRU cache for 200 resolved anime lookups
const animeResolverCache = new LRUCache<string, ResolvedAnimeMetadata | null>(200);

/**
 * Normalizes an anime title for TMDB querying by stripping common season, cour, and part tags
 * while extracting the detected season number.
 */
export function normalizeAnimeTitle(rawTitle: string): { cleanTitle: string; season: number } {
  if (!rawTitle) return { cleanTitle: '', season: 1 };

  let title = rawTitle.trim();
  let season = 1;

  // Detect explicit season patterns: "Season 2", "2nd Season", "Season 3rd", "S2"
  const seasonMatch = title.match(/(?:season\s*(\d+)|(\d+)(?:nd|rd|th|st)\s*season|\bS(\d+)\b)/i);
  if (seasonMatch) {
    const sNum = parseInt(seasonMatch[1] || seasonMatch[2] || seasonMatch[3], 10);
    if (!isNaN(sNum) && sNum > 0) {
      season = sNum;
    }
  }

  // Detect cour / part patterns: "Part 2", "Cour 2"
  const partMatch = title.match(/(?:part|cour)\s*(\d+)/i);
  if (partMatch && season === 1) {
    const pNum = parseInt(partMatch[1], 10);
    if (!isNaN(pNum) && pNum > 1) {
      // Often Part 2 corresponds to Season 2 in TMDB listings
      season = pNum;
    }
  }

  // Strip season phrases, cour indicators, and subtitle arcs for clean search query
  const cleanTitle = title
    .replace(/(?:-\s*)?(?:season\s*\d+|\d+(?:nd|rd|th|st)\s*season|\bS\d+\b)/gi, '')
    .replace(/(?:-\s*)?(?:part\s*\d+|cour\s*\d+)/gi, '')
    .replace(/(?:-\s*)?(?:final\s*season)/gi, '')
    .replace(/\s*:\s*.*season.*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanTitle: cleanTitle.length >= 2 ? cleanTitle : title,
    season,
  };
}

export async function resolveAnimeToTmdb(
  anime: { id: string | number; title?: string; tmdbId?: string | number; imdbId?: string; backdrop_path?: string; poster_path?: string; vote_average?: number; [key: string]: any }
): Promise<ResolvedAnimeMetadata | null> {
  if (!anime || !anime.id) return null;

  // Check cache first
  const cacheKey = `anime-resolve:${anime.id}`;
  if (animeResolverCache.has(cacheKey)) {
    return animeResolverCache.get(cacheKey) ?? null;
  }

  // If anime already has valid numeric tmdbId, quickly resolve IMDb ID
  if (anime.tmdbId && /^\d+$/.test(String(anime.tmdbId))) {
    const imdb = anime.imdbId || (await getImdbId(anime.tmdbId, 'tv')) || undefined;
    const resolved: ResolvedAnimeMetadata = {
      tmdbId: String(anime.tmdbId),
      imdbId: imdb,
      season: 1,
      tmdbTitle: anime.title || 'Anime',
      backdrop_path: anime.backdrop_path,
      poster_path: anime.poster_path,
      vote_average: anime.vote_average,
    };
    animeResolverCache.set(cacheKey, resolved);
    return resolved;
  }

  return deduplicateInFlight(cacheKey, async () => {
    try {
      const isMovie = (anime as any).format === 'MOVIE';
      const searchCandidates: string[] = [];

      // 1. Gather title candidates
      const rawTitles = [
        (anime as any).english_title,
        anime.title,
        (anime as any).romaji_title,
      ].filter((t): t is string => Boolean(t && t.trim()));

      let bestSeason = 1;

      for (const t of rawTitles) {
        const { cleanTitle, season } = normalizeAnimeTitle(t);
        if (cleanTitle && !searchCandidates.includes(cleanTitle)) {
          searchCandidates.push(cleanTitle);
        }
        if (season > bestSeason) bestSeason = season;
      }

      const releaseYear = (anime as any).year ? parseInt(String((anime as any).year), 10) : undefined;

      // 2. Query TMDB with candidate titles
      let matchedItem: MediaItem | null = null;

      for (const candidate of searchCandidates) {
        const results = await searchTmdb(candidate, isMovie ? 'movie' : 'tv');
        if (results && results.length > 0) {
          // Score matches: prefer exact title match, year proximity, and animation genre
          const scored = results.map((res) => {
            let score = 0;
            const resTitle = res.title.toLowerCase();
            const candLower = candidate.toLowerCase();

            if (resTitle === candLower) score += 50;
            else if (resTitle.includes(candLower) || candLower.includes(resTitle)) score += 30;

            if (releaseYear && res.release_date) {
              const resYear = parseInt(res.release_date.substring(0, 4), 10);
              if (!isNaN(resYear)) {
                const diff = Math.abs(resYear - releaseYear);
                if (diff === 0) score += 40;
                else if (diff <= 1) score += 20;
                else if (diff <= 3) score += 5;
              }
            }

            // Prefer items with posters and backdrops
            if (res.poster_path) score += 5;
            if (res.backdrop_path) score += 5;

            return { item: res, score };
          });

          scored.sort((a, b) => b.score - a.score);
          if (scored[0] && scored[0].score >= 20) {
            matchedItem = scored[0].item;
            break;
          }
        }
      }

      // 3. Fallback to multi-search if TV/Movie search gave 0 results
      if (!matchedItem && searchCandidates[0]) {
        const multiResults = await searchTmdb(searchCandidates[0], 'multi');
        if (multiResults.length > 0) {
          matchedItem = multiResults[0];
        }
      }

      if (!matchedItem) {
        animeResolverCache.set(cacheKey, null);
        return null;
      }

      // 4. Resolve external IMDb ID for direct streaming providers
      const imdbId = (await getImdbId(matchedItem.id, matchedItem.media_type || 'tv')) || undefined;

      const resolved: ResolvedAnimeMetadata = {
        tmdbId: String(matchedItem.id),
        imdbId,
        season: bestSeason,
        tmdbTitle: matchedItem.title,
        backdrop_path: matchedItem.backdrop_path || anime.backdrop_path,
        poster_path: matchedItem.poster_path || anime.poster_path,
        vote_average: matchedItem.vote_average || anime.vote_average,
      };

      animeResolverCache.set(cacheKey, resolved);
      return resolved;
    } catch (err) {
      console.warn(`[animeResolver] Failed to resolve anime ${anime.id}:`, err);
      animeResolverCache.set(cacheKey, null);
      return null;
    }
  });
}

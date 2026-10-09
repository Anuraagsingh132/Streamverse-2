import { MediaItem, MediaType, CastMember, CrewMember, StudioOrNetwork, VideoItem, EpisodeItem, SeasonItem } from '../types/media';

export const TMDB_API_KEY = (import.meta.env?.VITE_TMDB_API_KEY as string) || '1cf50e6248dc270629e802686245c2c8';
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// In-memory cache & in-flight deduplication to prevent duplicate requests & improve performance
const cache = new Map<string, { timestamp: number; data: any }>();
const inFlightPromises = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes fresh TTL

function revalidateInBackground(url: string, cacheKey: string) {
  if (inFlightPromises.has(url)) return;
  const p = (async () => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const entry = { timestamp: Date.now(), data };
        cache.set(url, entry);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(entry));
          } catch {}
        }
      }
    } catch {
      // background silent failure is non-blocking
    } finally {
      inFlightPromises.delete(url);
    }
  })();
  inFlightPromises.set(url, p);
}

async function fetchFromTmdb<T = any>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...Object.entries(params).reduce((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  });

  const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
  const cacheKey = `tmdb_${url}`;
  
  // 1. Check in-memory cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  // 2. Check persistent storage (localStorage fallback to sessionStorage)
  try {
    const raw = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) {
        cache.set(url, parsed);
        // If fresh, return immediately (0ms)
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data as T;
        }
        // Stale-While-Revalidate: Return instant cached data and refresh in background
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS * 4) {
          revalidateInBackground(url, cacheKey);
          return parsed.data as T;
        }
      }
    }
  } catch {}

  // 3. Deduplicate in-flight identical requests
  if (inFlightPromises.has(url)) {
    return inFlightPromises.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`TMDB HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const entry = { timestamp: Date.now(), data };
      cache.set(url, entry);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch {}
      }
      return data as T;
    } catch (error) {
      console.error(`TMDB fetch failed for ${endpoint}:`, error);
      throw error;
    } finally {
      inFlightPromises.delete(url);
    }
  })();

  inFlightPromises.set(url, promise);
  return promise;
}

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: 'original' | 'w1280' | 'w780' | 'w500' | 'w300' | 'w185' = 'w1280'
): string {
  if (!path) {
    return 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1280&auto=format&fit=crop';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
};

export const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western'
};

export const GENRE_NAME_TO_MOVIE_ID: Record<string, number> = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Fantasy': 14,
  'History': 36,
  'Horror': 27,
  'Music': 10402,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 878,
  'Thriller': 53,
  'War': 10752,
  'Western': 37
};

export const GENRE_NAME_TO_TV_ID: Record<string, number> = {
  'Action': 10759,
  'Adventure': 10759,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Kids': 10762,
  'Mystery': 9648,
  'Sci-Fi': 10765,
  'War': 10768,
  'Western': 37
};

export const PROVIDER_NAME_TO_ID: Record<string, number> = {
  'netflix': 8,
  'prime': 9,
  'prime video': 9,
  'apple': 350,
  'apple tv+': 350,
  'apple tv': 350,
  'disney': 337,
  'disney+': 337,
  'max': 1899,
  'hbo': 1899,
  'hbo max': 1899,
  'hulu': 15,
  'paramount': 531,
  'paramount+': 531,
  'peacock': 386,
  'crunchyroll': 283,
  'starz': 43,
  'amc': 528,
  'amc+': 528,
  'mubi': 11,
  'shudder': 99,
  'discovery': 526,
  'discovery+': 526,
  'tubi': 73,
  'tubi tv': 73,
  'pluto': 300,
  'pluto tv': 300
};

export function formatTmdbItem(raw: any, explicitType?: MediaType): MediaItem {
  const isMovie = explicitType
    ? explicitType === 'movie'
    : !raw.first_air_date && !raw.name;

  const mediaType: MediaType = explicitType || (isMovie ? 'movie' : 'tv');
  const title = raw.title || raw.name || raw.original_title || raw.original_name || 'Untitled';
  const releaseDate = raw.release_date || raw.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : undefined;

  let genres: string[] = [];
  if (Array.isArray(raw.genres)) {
    genres = raw.genres.map((g: any) => g.name);
  } else if (Array.isArray(raw.genre_ids)) {
    const genreDict = isMovie ? MOVIE_GENRES : TV_GENRES;
    genres = raw.genre_ids.map((id: number) => genreDict[id] || MOVIE_GENRES[id] || TV_GENRES[id]).filter(Boolean);
  }

  let duration: string | undefined = undefined;
  if (raw.runtime) {
    const hours = Math.floor(raw.runtime / 60);
    const mins = raw.runtime % 60;
    duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else if (raw.episode_run_time && raw.episode_run_time.length > 0) {
    duration = `${raw.episode_run_time[0]}m`;
  }

  let trailer_key: string | undefined = undefined;
  let videos: VideoItem[] | undefined = undefined;
  if (raw.videos?.results) {
    const ytVideos = raw.videos.results.filter((v: any) => v.site === 'YouTube');
    const trailer = ytVideos.find(
      (v: any) => v.type === 'Trailer' || v.type === 'Teaser'
    ) || ytVideos[0];
    if (trailer) trailer_key = trailer.key;
    if (ytVideos.length > 0) {
      videos = ytVideos.map((v: any) => ({
        id: v.id,
        key: v.key,
        name: v.name,
        site: v.site,
        type: v.type
      }));
    }
  }

  let logo_path: string | undefined = undefined;
  if (raw.images?.logos && raw.images.logos.length > 0) {
    const enLogo = raw.images.logos.find((l: any) => l.iso_639_1 === 'en') || raw.images.logos[0];
    if (enLogo?.file_path) {
      logo_path = getTmdbImageUrl(enLogo.file_path, 'w500');
    }
  }

  let cast: CastMember[] | undefined = undefined;
  if (raw.credits?.cast) {
    cast = raw.credits.cast.slice(0, 14).map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w185') : undefined
    }));
  }

  let directors: CrewMember[] | undefined = undefined;
  let writers: CrewMember[] | undefined = undefined;
  let producers: CrewMember[] | undefined = undefined;

  if (raw.credits?.crew) {
    directors = raw.credits.crew
      .filter((c: any) => c.job === 'Director')
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        profile_path: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w185') : undefined
      }));
    writers = raw.credits.crew
      .filter((c: any) => ['Writer', 'Screenplay', 'Author', 'Story', 'Teleplay'].includes(c.job))
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        profile_path: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w185') : undefined
      }));
    producers = raw.credits.crew
      .filter((c: any) => ['Producer', 'Executive Producer'].includes(c.job))
      .slice(0, 4)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        job: c.job,
        profile_path: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w185') : undefined
      }));
  }

  if (raw.created_by && Array.isArray(raw.created_by) && (!directors || directors.length === 0)) {
    directors = raw.created_by.map((c: any) => ({
      id: c.id,
      name: c.name,
      job: 'Creator',
      profile_path: c.profile_path ? getTmdbImageUrl(c.profile_path, 'w185') : undefined
    }));
  }

  let studios: StudioOrNetwork[] | undefined = undefined;
  if (raw.production_companies) {
    studios = raw.production_companies
      .filter((p: any) => p.logo_path)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        logo_path: getTmdbImageUrl(p.logo_path, 'w300')
      }));
  }

  let networks: StudioOrNetwork[] | undefined = undefined;
  if (raw.networks) {
    networks = raw.networks
      .filter((n: any) => n.logo_path)
      .map((n: any) => ({
        id: n.id,
        name: n.name,
        logo_path: getTmdbImageUrl(n.logo_path, 'w300')
      }));
  }

  let seasons_list: SeasonItem[] | undefined = undefined;
  if (raw.seasons) {
    seasons_list = raw.seasons.map((s: any) => ({
      id: s.id,
      season_number: s.season_number,
      name: s.name,
      episode_count: s.episode_count,
      poster_path: s.poster_path ? getTmdbImageUrl(s.poster_path, 'w500') : undefined
    }));
  }

  let recommendations: MediaItem[] | undefined = undefined;
  if (raw.recommendations?.results) {
    recommendations = raw.recommendations.results.map((r: any) => formatTmdbItem(r, mediaType));
  }

  let similar: MediaItem[] | undefined = undefined;
  if (raw.similar?.results) {
    similar = raw.similar.results.map((r: any) => formatTmdbItem(r, mediaType));
  }

  let content_rating: string | undefined = undefined;
  if (raw.release_dates?.results) {
    const usRelease = raw.release_dates.results.find((r: any) => r.iso_3166_1 === 'US');
    const cert = usRelease?.release_dates?.find((d: any) => d.certification)?.certification;
    if (cert) content_rating = cert;
  } else if (raw.content_ratings?.results) {
    const usRating = raw.content_ratings.results.find((r: any) => r.iso_3166_1 === 'US');
    if (usRating?.rating) content_rating = usRating.rating;
  }

  return {
    id: String(raw.id),
    tmdbId: String(raw.id),
    imdbId: raw.imdb_id,
    title,
    overview: raw.overview || 'No overview available for this title.',
    backdrop_path: getTmdbImageUrl(raw.backdrop_path || raw.poster_path, 'w1280'),
    poster_path: getTmdbImageUrl(raw.poster_path || raw.backdrop_path, 'w500'),
    vote_average: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : 0,
    vote_count: raw.vote_count,
    media_type: mediaType,
    year,
    genres: genres.length > 0 ? genres : undefined,
    duration,
    seasons: raw.number_of_seasons,
    episodes: raw.number_of_episodes,
    tagline: raw.tagline || undefined,
    trailer_key,
    logo_path,
    title_logo: logo_path,
    cast,
    directors,
    writers,
    producers,
    studios,
    networks,
    videos,
    seasons_list,
    recommendations,
    similar,
    status: raw.status,
    release_date: raw.release_date,
    first_air_date: raw.first_air_date,
    last_air_date: raw.last_air_date,
    original_language: raw.original_language ? String(raw.original_language).toUpperCase() : 'EN',
    content_rating: content_rating || (mediaType === 'movie' ? 'PG-13' : 'TV-MA')
  };
}

// API methods
export async function getTrending(
  type: 'movie' | 'tv' | 'all' = 'movie',
  timeWindow: 'day' | 'week' = 'day',
  page: number = 1
): Promise<MediaItem[]> {
  const data = await fetchFromTmdb(`/trending/${type}/${timeWindow}`, { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, type === 'all' ? undefined : type));
}

export async function getTopRated(type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb(`/${type}/top_rated`, { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, type));
}

export async function getPopular(type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb(`/${type}/popular`, { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, type));
}

export async function getUpcomingMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb('/movie/upcoming', { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, 'movie'));
}

export async function getNowPlayingMovies(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb('/movie/now_playing', { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, 'movie'));
}

export async function getOnTheAirTV(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb('/tv/on_the_air', { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, 'tv'));
}

export async function getAiringTodayTV(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb('/tv/airing_today', { page });
  return (data.results || []).map((item: any) => formatTmdbItem(item, 'tv'));
}

export async function getByGenre(
  genreId: number,
  type: 'movie' | 'tv' = 'movie',
  page: number = 1
): Promise<MediaItem[]> {
  const data = await fetchFromTmdb(`/discover/${type}`, {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page
  });
  return (data.results || []).map((item: any) => formatTmdbItem(item, type));
}

export async function getByProvider(
  providerId: number,
  type: 'movie' | 'tv' = 'movie',
  page: number = 1
): Promise<MediaItem[]> {
  const data = await fetchFromTmdb(`/discover/${type}`, {
    with_watch_providers: providerId,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    page
  });
  return (data.results || []).map((item: any) => formatTmdbItem(item, type));
}

export async function getAnime(page: number = 1): Promise<MediaItem[]> {
  const data = await fetchFromTmdb('/discover/tv', {
    with_genres: 16, // Animation
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
    page
  });
  return (data.results || []).map((item: any) => {
    const formatted = formatTmdbItem(item, 'anime');
    return formatted;
  });
}

export async function getMediaDetails(id: string | number, type: 'movie' | 'tv' | 'anime' = 'movie'): Promise<MediaItem> {
  const apiType = type === 'anime' ? 'tv' : type;
  const data = await fetchFromTmdb(`/${apiType}/${id}`, {
    append_to_response: 'credits,videos,recommendations,similar,images,content_ratings,release_dates',
    include_image_language: 'en,null'
  });
  const formatted = formatTmdbItem(data, type);
  return formatted;
}

export async function getSeasonEpisodes(tvId: string | number, seasonNumber: number = 1): Promise<EpisodeItem[]> {
  try {
    const data = await fetchFromTmdb(`/tv/${tvId}/season/${seasonNumber}`);
    return (data.episodes || []).map((e: any) => ({
      id: e.id,
      episode_number: e.episode_number,
      name: e.name || `Episode ${e.episode_number}`,
      overview: e.overview || 'No description available.',
      still_path: e.still_path ? getTmdbImageUrl(e.still_path, 'w500') : undefined,
      air_date: e.air_date,
      vote_average: e.vote_average ? Number(e.vote_average.toFixed(1)) : undefined,
      runtime: e.runtime
    }));
  } catch (err) {
    console.warn('Error fetching season episodes:', err);
    return [];
  }
}

export async function searchTmdb(
  query: string,
  type: 'multi' | 'movie' | 'tv' = 'multi',
  page: number = 1
): Promise<MediaItem[]> {
  if (!query.trim()) return [];
  const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
  const data = await fetchFromTmdb(endpoint, { query: query.trim(), page });
  
  return (data.results || [])
    .filter((item: any) => item.media_type !== 'person' && (item.poster_path || item.backdrop_path))
    .map((item: any) => {
      const explicitType = item.media_type === 'tv' ? 'tv' : item.media_type === 'movie' ? 'movie' : undefined;
      return formatTmdbItem(item, explicitType);
    });
}

export async function getImdbId(id: string | number, mediaType: 'movie' | 'tv' | 'anime' = 'movie'): Promise<string | null> {
  try {
    const apiType = mediaType === 'anime' ? 'tv' : mediaType;
    const data = await fetchFromTmdb(`/${apiType}/${id}/external_ids`);
    return data.imdb_id || null;
  } catch (err) {
    console.warn('Could not fetch IMDb ID for TMDB ID', id, err);
    return null;
  }
}


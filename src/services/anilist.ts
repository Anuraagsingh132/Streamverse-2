import apothecaryEpisodes from '../data/apothecaryEpisodes.json';

export interface AniListCharacter {
  id: number;
  name: string;
  role: string;
  image: string;
  voiceActor?: {
    name: string;
    image: string;
  };
}

export interface AniListRelation {
  id: number;
  relationType: string;
  title: string;
  format: string;
  image: string;
}

export interface AniListRecommendation {
  id: number;
  title: string;
  rating: number;
  format: string;
  image: string;
}

export interface AniListEpisode {
  id: number;
  episode_number: number;
  title: string;
  rating: number;
  still_path: string;
  overview: string;
}

export interface FullAniListAnimeDetails {
  id: string;
  tmdbId?: string;
  media_type: 'anime';
  title: string;
  native_title: string;
  english_title: string;
  romaji_title: string;
  description: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  year: string;
  season: string;
  status: string;
  format: string;
  episodes: number;
  duration: string;
  source: string;
  rating: string;
  rating_percent: number;
  vote_count: string;
  genres: string[];
  studio: string;
  trailer_key: string | null;
  trailer_thumbnail: string | null;
  anilist_url: string;
  mal_url: string | null;
  characters: AniListCharacter[];
  relations: AniListRelation[];
  recommendations: AniListRecommendation[];
  episodes_list: AniListEpisode[];
}

const GRAPHQL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title {
      english
      native
      romaji
      userPreferred
    }
    synonyms
    countryOfOrigin
    isLicensed
    isAdult
    coverImage {
      extraLarge
      large
      color
    }
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    bannerImage
    season
    seasonYear
    description(asHtml: false)
    type
    format
    status(version: 2)
    episodes
    duration
    trailer {
      id
      site
      thumbnail
    }
    genres
    source
    averageScore
    popularity
    meanScore
    characters(sort: ROLE) {
      edges {
        role
        node {
          id
          name {
            userPreferred
            full
          }
          image {
            large
            medium
          }
        }
        voiceActors(sort: LANGUAGE) {
          id
          languageV2
          name {
            userPreferred
            full
          }
          image {
            large
            medium
          }
        }
      }
    }
    recommendations {
      edges {
        node {
          id
          mediaRecommendation {
            id
            title {
              userPreferred
              english
              romaji
            }
            status
            episodes
            coverImage {
              extraLarge
              large
              medium
            }
            bannerImage
            format
            meanScore
          }
        }
      }
    }
    relations {
      edges {
        id
        relationType
        node {
          id
          title {
            userPreferred
            english
            romaji
          }
          status
          coverImage {
            extraLarge
            large
            medium
          }
          bannerImage
          format
          meanScore
        }
      }
    }
    studios(isMain: true) {
      edges {
        isMain
        node {
          id
          name
        }
      }
    }
  }
}
`;

const detailsCache = new Map<number, FullAniListAnimeDetails>();

export async function fetchAniListAnimeDetails(id: number | string): Promise<FullAniListAnimeDetails | null> {
  const numericId = parseInt(id.toString(), 10);
  if (isNaN(numericId)) return null;

  if (detailsCache.has(numericId)) {
    return detailsCache.get(numericId)!;
  }

  try {
    const cached = localStorage.getItem(`anilist_details_${numericId}`) || sessionStorage.getItem(`anilist_details_${numericId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      detailsCache.set(numericId, parsed);
      return parsed;
    }
  } catch {}

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { id: numericId }
      })
    });

    if (!res.ok) {
      console.warn(`AniList API returned ${res.status} for ID ${id}`);
      return null;
    }

    const json = await res.json();
    const media = json?.data?.Media;
    if (!media) return null;

    // Formatting titles
    const englishTitle = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Anime';
    const nativeTitle = media.title?.native || '';
    const romajiTitle = media.title?.romaji || '';

    // Description: strip tags or format clean
    let cleanDesc = (media.description || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<i>|<\/i>|<b>|<\/b>/gi, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();

    // Studio
    const studioList = (media.studios?.edges || [])
      .map((e: any) => e.node?.name)
      .filter(Boolean)
      .join(', ');

    // Characters
    const characters: AniListCharacter[] = (media.characters?.edges || [])
      .map((edge: any) => {
        const node = edge.node;
        const va = edge.voiceActors?.[0];
        const img = node?.image?.large || node?.image?.medium || '';
        return {
          id: node?.id,
          name: node?.name?.userPreferred || node?.name?.full || '',
          role: edge.role || 'CHARACTER',
          image: img,
          voiceActor: va ? {
            name: va.name?.userPreferred || va.name?.full || '',
            image: va.image?.large || va.image?.medium || ''
          } : undefined
        };
      })
      .filter((c: any) => c.name && c.image && !c.image.includes('default') && !c.image.includes('placeholder'));

    // Relations
    const relations: AniListRelation[] = (media.relations?.edges || [])
      .map((edge: any) => {
        const node = edge.node;
        if (!node) return null;
        return {
          id: node.id,
          relationType: edge.relationType?.replace(/_/g, ' ') || 'RELATED',
          title: node.title?.english || node.title?.userPreferred || node.title?.romaji || '',
          format: (node.format || '').replace(/_/g, ' '),
          image: node.bannerImage || node.coverImage?.extraLarge || node.coverImage?.large || ''
        };
      })
      .filter(Boolean);

    // Recommendations
    const recommendations: AniListRecommendation[] = (media.recommendations?.edges || [])
      .map((edge: any) => {
        const rec = edge.node?.mediaRecommendation;
        if (!rec) return null;
        return {
          id: rec.id,
          title: rec.title?.english || rec.title?.userPreferred || rec.title?.romaji || '',
          rating: rec.meanScore ? +(rec.meanScore / 10).toFixed(1) : 7.5,
          format: (rec.format || 'TV').replace(/_/g, ' '),
          image: rec.bannerImage || rec.coverImage?.extraLarge || rec.coverImage?.large || ''
        };
      })
      .filter((r: any) => r && r.title && r.image);

    // Episodes
    let episodes_list: AniListEpisode[] = [];
    if (numericId === 161645) {
      episodes_list = apothecaryEpisodes as AniListEpisode[];
    } else {
      const epCount = media.episodes || 12;
      const baseBackdrop = media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large;
      for (let i = 1; i <= epCount; i++) {
        episodes_list.push({
          id: i,
          episode_number: i,
          title: `Episode ${i}`,
          rating: media.averageScore ? +(media.averageScore / 10).toFixed(1) : 8.0,
          still_path: baseBackdrop,
          overview: `Episode ${i} of ${englishTitle}.`
        });
      }
    }

    const seasonFormatted = media.season
      ? `${media.season.charAt(0) + media.season.slice(1).toLowerCase()} ${media.seasonYear || media.startDate?.year || ''}`.trim()
      : (media.seasonYear ? String(media.seasonYear) : (media.startDate?.year ? String(media.startDate.year) : '2023'));

    const sourceFormatted = (media.source || 'Light novel')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const statusFormatted = (media.status || 'Finished')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const result: FullAniListAnimeDetails = {
      id: String(media.id),
      tmdbId: String(media.id),
      media_type: 'anime',
      title: englishTitle,
      native_title: nativeTitle,
      english_title: englishTitle,
      romaji_title: romajiTitle,
      description: cleanDesc,
      overview: cleanDesc,
      backdrop_path: media.bannerImage || media.coverImage?.extraLarge || '',
      poster_path: media.coverImage?.extraLarge || media.coverImage?.large || '',
      year: String(media.startDate?.year || media.seasonYear || '2023'),
      season: seasonFormatted,
      status: statusFormatted,
      format: (media.format || 'TV').replace(/_/g, ' '),
      episodes: media.episodes || episodes_list.length,
      duration: media.duration ? `${media.duration} min` : '24 min',
      source: sourceFormatted,
      rating: media.averageScore ? `${media.averageScore}%` : '85%',
      rating_percent: media.averageScore || 85,
      vote_count: media.popularity ? media.popularity.toLocaleString() : '100,000',
      genres: media.genres || [],
      studio: studioList || 'Animation Studio',
      trailer_key: media.trailer?.site === 'youtube' ? media.trailer.id : null,
      trailer_thumbnail: media.trailer?.thumbnail || null,
      anilist_url: `https://anilist.co/anime/${media.id}`,
      mal_url: media.idMal ? `https://myanimelist.net/anime/${media.idMal}` : null,
      characters,
      relations,
      recommendations,
      episodes_list
    };

    detailsCache.set(numericId, result);
    try {
      localStorage.setItem(`anilist_details_${numericId}`, JSON.stringify(result));
    } catch {
      try {
        sessionStorage.setItem(`anilist_details_${numericId}`, JSON.stringify(result));
      } catch {}
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch from AniList GraphQL API:', error);
    return null;
  }
}

const RAIL_GRAPHQL_QUERY = `
query ($page: Int = 1, $perPage: Int = 20, $sort: [MediaSort], $status: MediaStatus, $format: [MediaFormat], $genres: [String]) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: $sort, status: $status, format_in: $format, genre_in: $genres, isAdult: false) {
      id
      title {
        english
        romaji
        userPreferred
        native
      }
      bannerImage
      coverImage {
        extraLarge
        large
        color
      }
      startDate {
        year
        month
        day
      }
      format
      status
      episodes
      duration
      genres
      averageScore
      popularity
    }
  }
}
`;

const railCache = new Map<string, any[]>();
const inFlightRail = new Map<string, Promise<any[]>>();

export async function fetchAniListRail(variables: {
  sort?: string[];
  status?: string;
  format?: string[];
  genres?: string[];
  perPage?: number;
}): Promise<any[]> {
  const cacheKey = JSON.stringify(variables);
  if (railCache.has(cacheKey)) {
    return railCache.get(cacheKey)!;
  }
  try {
    const cached = localStorage.getItem(`anilist_rail_${cacheKey}`) || sessionStorage.getItem(`anilist_rail_${cacheKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        railCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {}

  if (inFlightRail.has(cacheKey)) {
    return inFlightRail.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          query: RAIL_GRAPHQL_QUERY,
          variables: {
            ...variables,
            perPage: variables.perPage || 20
          }
        })
      });

      if (!res.ok) return [];
      const json = await res.json();
      const media = json?.data?.Page?.media || [];
      if (media.length > 0) {
        railCache.set(cacheKey, media);
        try {
          localStorage.setItem(`anilist_rail_${cacheKey}`, JSON.stringify(media));
        } catch {
          try {
            sessionStorage.setItem(`anilist_rail_${cacheKey}`, JSON.stringify(media));
          } catch {}
        }
      }
      return media;
    } catch (e) {
      console.warn('Failed to fetch AniList rail:', e);
      return [];
    } finally {
      inFlightRail.delete(cacheKey);
    }
  })();

  inFlightRail.set(cacheKey, promise);
  return promise;
}


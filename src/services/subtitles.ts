import { MediaType } from '../types/media';

export interface SubtitleTrackItem {
  id: string;
  lang: string;
  label: string;
  url: string;
  isCustom?: boolean;
}

// Map common ISO 639-1 / 639-2 codes to clean readable names
const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'English',
  en: 'English',
  hin: 'Hindi',
  hi: 'Hindi',
  spa: 'Spanish',
  es: 'Spanish',
  fre: 'French',
  fra: 'French',
  fr: 'French',
  deu: 'German',
  ger: 'German',
  de: 'German',
  ita: 'Italian',
  it: 'Italian',
  por: 'Portuguese',
  pob: 'Portuguese (Brazil)',
  pt: 'Portuguese',
  rus: 'Russian',
  ru: 'Russian',
  ara: 'Arabic',
  ar: 'Arabic',
  chi: 'Chinese',
  zho: 'Chinese',
  zh: 'Chinese',
  jpn: 'Japanese',
  ja: 'Japanese',
  kor: 'Korean',
  ko: 'Korean',
  tam: 'Tamil',
  ta: 'Tamil',
  tel: 'Telugu',
  te: 'Telugu',
  mal: 'Malayalam',
  ml: 'Malayalam',
  ben: 'Bengali',
  bn: 'Bengali',
  tur: 'Turkish',
  tr: 'Turkish',
  ind: 'Indonesian',
  id: 'Indonesian',
  pol: 'Polish',
  pl: 'Polish',
  dut: 'Dutch',
  nld: 'Dutch',
  nl: 'Dutch',
  swe: 'Swedish',
  sv: 'Swedish',
  nor: 'Norwegian',
  no: 'Norwegian',
  dan: 'Danish',
  da: 'Danish',
  fin: 'Finnish',
  fi: 'Finnish',
  vie: 'Vietnamese',
  vi: 'Vietnamese',
  tha: 'Thai',
  th: 'Thai'
};

export function getLanguageName(code?: string): string {
  if (!code) return 'English';
  const clean = code.toLowerCase().trim();
  return LANGUAGE_NAMES[clean] || clean.toUpperCase();
}

/**
 * Converts SubRip (.srt) subtitles to WebVTT (.vtt) format for HTML5 video <track>
 */
export function convertSrtToVtt(srtContent: string): string {
  // Normalize line endings
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert comma in SRT timestamps (00:00:16,225) to dot in VTT (00:00:16.225)
  const vttBody = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return `WEBVTT\n\n${vttBody}`;
}

/**
 * Fetches an SRT subtitle file from remote URL and converts it to a local Blob URL
 */
export async function fetchSubtitleVttBlob(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load subtitle file from ${url} (HTTP ${response.status})`);
  }
  const srtText = await response.text();
  const vttContent = convertSrtToVtt(srtText);
  const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
  return URL.createObjectURL(blob);
}

// In-memory cache for subtitles per media item
const subtitleCache = new Map<string, SubtitleTrackItem[]>();

/**
 * Fetches available subtitles from OpenSubtitles public API
 */
export async function fetchAvailableSubtitles(
  imdbId: string,
  mediaType: MediaType,
  season: number = 1,
  episode: number = 1
): Promise<SubtitleTrackItem[]> {
  if (!imdbId) return [];

  const isTV = mediaType === 'tv' || mediaType === 'anime';
  const cacheKey = isTV ? `${imdbId}:s${season}e${episode}` : `${imdbId}:movie`;

  if (subtitleCache.has(cacheKey)) {
    return subtitleCache.get(cacheKey)!;
  }

  const endpoint = isTV
    ? `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`
    : `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data?.subtitles)) return [];

    const seen = new Set<string>();
    const results: SubtitleTrackItem[] = [];

    for (const sub of data.subtitles) {
      if (!sub.url) continue;

      const langCode = (sub.lang || 'eng').toLowerCase();
      const baseName = getLanguageName(langCode);
      const isCC = Boolean(
        sub.movieReleaseName?.toLowerCase().includes('[cc]') ||
        sub.subtitleFileName?.toLowerCase().includes('[cc]')
      );
      const label = isCC ? `${baseName} [CC]` : baseName;

      // Deduplicate so we don't have 10 identical English subtitles
      const dedupeKey = `${langCode}-${isCC ? 'cc' : 'std'}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        results.push({
          id: sub.id ? String(sub.id) : `sub-${results.length}`,
          lang: langCode,
          label,
          url: sub.url
        });
      }
    }

    // Sort: English first, then Hindi, Spanish, French, etc.
    results.sort((a, b) => {
      if (a.lang === 'eng') return -1;
      if (b.lang === 'eng') return 1;
      if (a.lang === 'hin') return -1;
      if (b.lang === 'hin') return 1;
      return a.label.localeCompare(b.label);
    });

    subtitleCache.set(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('Error fetching subtitles for', imdbId, err);
    return [];
  }
}

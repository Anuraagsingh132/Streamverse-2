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
 * Sanitizes subtitle cue text according to strict WebVTT allowed formatting tags:
 * Allowed: <b>, <i>, <u>, <c>, <v>, <lang> and their closing equivalents.
 * Disallows: all other tags (<script>, <iframe>, <img>, <svg>, <object>, <a>, etc.)
 * Strips all inline event handlers (on*), style attributes, and javascript: URIs.
 */
export function sanitizeSubtitleText(text: string): string {
  if (!text) return '';

  // 1. Strip all HTML comments
  let sanitized = text.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Strip SSA / ASS style overrides like {\an8}, {\pos(x,y)}, {\c&H...&}
  sanitized = sanitized.replace(/\{[\\/][^}]*\}/g, '');

  // 3. Strip all tags except strict WebVTT allowed tags: b, i, u, c, v, lang
  sanitized = sanitized.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    const allowedTags = ['b', 'i', 'u', 'c', 'v', 'lang'];
    if (!allowedTags.includes(lowerTag)) {
      return ''; // Strip forbidden tag completely
    }
    if (lowerTag === 'v') {
      const cleanVoice = attrs.replace(/[<>"'=;]/g, '').trim();
      return `<v ${cleanVoice}>`;
    }
    if (lowerTag === 'c') {
      const classMatch = attrs.match(/\.([a-zA-Z0-9_-]+)/);
      return classMatch ? `<c.${classMatch[1]}>` : '<c>';
    }
    return match.startsWith('</') ? `</${lowerTag}>` : `<${lowerTag}>`;
  });

  // 4. Strip any dangling javascript: or event attributes
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  return sanitized;
}

/**
 * Converts SubRip (.srt) subtitles to WebVTT (.vtt) format for HTML5 video <track>
 * - Strips UTF-8 Byte Order Mark (BOM)
 * - Removes SSA / ASS style override tags ({\an8}, {\c&H...&}, {\pos(...)})
 * - Sanitizes dangerous HTML tags using strict whitelist
 * - Converts comma timestamps to dot timestamps with 2-digit hour padding
 */
export function convertSrtToVtt(srtContent: string): string {
  if (!srtContent) return 'WEBVTT\n\n';

  // 1. Strip UTF-8 Byte Order Mark (BOM)
  let clean = srtContent.replace(/^\uFEFF/, '');

  // 2. Normalize line endings
  clean = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Sanitize content using whitelist
  clean = sanitizeSubtitleText(clean);

  // 4. Convert comma in SRT timestamps (00:00:16,225 or 0:00:16,225) to dot in VTT (00:00:16.225)
  const vttBody = clean.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, (_match, time, ms) => {
    const parts = time.split(':');
    if (parts[0].length === 1) parts[0] = '0' + parts[0];
    return `${parts.join(':')}.${ms}`;
  });

  return `WEBVTT\n\n${vttBody.trim()}\n`;
}

/**
 * Sanitizes existing WebVTT content (e.g. from user file uploads)
 */
export function sanitizeVtt(vttContent: string): string {
  if (!vttContent) return 'WEBVTT\n\n';
  let clean = vttContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!clean.startsWith('WEBVTT')) {
    clean = 'WEBVTT\n\n' + clean;
  }
  return sanitizeSubtitleText(clean);
}

/**
 * Revokes a created Blob URL to avoid memory leaks
 */
export function revokeSubtitleBlob(url: string | null | undefined): void {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
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

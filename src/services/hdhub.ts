import { getImdbId } from './tmdb';
import { MediaType } from '../types/media';

const HDHUB_BASE_RESOLVER = 'https://hdhub.thevolecitor.qzz.io/eyJ0b3Jib3giOiJ1bnNldCIsInF1YWxpdGllcyI6IjIxNjBwLDEwODBwLDcyMHAiLCJzb3J0IjoiZGVzYyJ9/stream';

export interface HDHubStream {
  id: string;
  name: string;
  title: string;
  description?: string;
  url: string;
  quality: '2160p' | '1080p' | '720p' | '480p' | 'Unknown';
  codec: 'H.264' | 'H.265' | 'Unknown';
  provider: string;
  audioLanguages?: string[];
  audioLabel?: string;
  sizeFormatted?: string;
  isDownloadOnly?: boolean;
  notWebReady?: boolean;
}

export interface HDHubResolutionResult {
  imdbId: string;
  streams: HDHubStream[];
  error?: string;
}

// In-memory cache for resolved streams
const streamCache = new Map<string, { timestamp: number; result: HDHubResolutionResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function parseAudioLanguages(text: string): { languages: string[]; label: string } {
  const languages: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('hindi') || lower.includes('.hin.') || lower.includes('-hin')) languages.push('Hindi');
  if (lower.includes('english') || lower.includes('.eng.') || lower.includes('-eng')) languages.push('English');
  if (lower.includes('tamil') || lower.includes('.tam.') || lower.includes('-tam')) languages.push('Tamil');
  if (lower.includes('telugu') || lower.includes('.tel.') || lower.includes('-tel')) languages.push('Telugu');
  if (lower.includes('japanese') || lower.includes('.jap.') || lower.includes('.jpn.')) languages.push('Japanese');
  if (lower.includes('korean') || lower.includes('.kor.')) languages.push('Korean');
  if (lower.includes('multi')) languages.push('Multi Audio');
  if (lower.includes('dual')) languages.push('Dual Audio');

  if (languages.length === 0) {
    languages.push('Original');
  }

  const unique = Array.from(new Set(languages));
  return {
    languages: unique,
    label: unique.join(' · ')
  };
}

function parseQuality(text: string): '2160p' | '1080p' | '720p' | '480p' | 'Unknown' {
  if (/2160p|4k/i.test(text)) return '2160p';
  if (/1080p|fhd/i.test(text)) return '1080p';
  if (/720p|hd/i.test(text)) return '720p';
  if (/480p|sd/i.test(text)) return '480p';
  return 'Unknown';
}

function parseCodec(text: string): 'H.264' | 'H.265' | 'Unknown' {
  if (/h\.?265|x265|hevc/i.test(text)) return 'H.265';
  if (/h\.?264|x264|avc/i.test(text)) return 'H.264';
  return 'Unknown';
}

function parseProvider(url: string, text: string): 'Cloudflare R2' | 'PixelDrain' | 'HubCloud' | 'Direct' {
  if (url.includes('r2.cloudflarestorage.com') || /r2|fsl/i.test(text)) return 'Cloudflare R2';
  if (url.includes('pixeldrain') || /pixeldrain/i.test(text)) return 'PixelDrain';
  if (url.includes('hubcloud') || /hubcloud/i.test(text)) return 'HubCloud';
  return 'Direct';
}

function formatBytes(bytes?: number): string | undefined {
  if (!bytes || isNaN(bytes)) return undefined;
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export async function fetchHDHubStreams(
  tmdbId: string | number,
  mediaType: MediaType,
  providedImdbId?: string,
  season: number = 1,
  episode: number = 1
): Promise<HDHubResolutionResult> {
  const isTV = mediaType === 'tv' || mediaType === 'anime';

  // 1. Resolve IMDb ID
  let imdbId = providedImdbId;
  if (!imdbId) {
    imdbId = (await getImdbId(tmdbId, mediaType)) || undefined;
  }

  if (!imdbId) {
    return {
      imdbId: '',
      streams: [],
      error: 'IMDb ID not found for this media title. Direct cloud streams require an IMDb identifier.'
    };
  }

  // Cache key
  const cacheKey = isTV ? `${imdbId}:s${season}e${episode}` : `${imdbId}:movie`;
  const cached = streamCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Query HDHub resolver endpoint
  const targetUrl = isTV
    ? `${HDHUB_BASE_RESOLVER}/series/${imdbId}:${season}:${episode}.json`
    : `${HDHUB_BASE_RESOLVER}/movie/${imdbId}.json`;

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`HDHub resolver responded with HTTP status ${res.status}`);
    }

    const data = await res.json();
    const rawStreams: any[] = Array.isArray(data.streams) ? data.streams : [];

    if (rawStreams.length === 0) {
      const result: HDHubResolutionResult = {
        imdbId,
        streams: [],
        error: 'No active streams found on HDHub for this title yet.'
      };
      streamCache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    }

    // 3. Map and organize streams (filtering out any non-direct streams or donation/discord notices without valid URLs)
    const validStreams = rawStreams.filter(
      (s) => s && typeof s.url === 'string' && s.url.trim().startsWith('http')
    );

    if (validStreams.length === 0) {
      const result: HDHubResolutionResult = {
        imdbId,
        streams: [],
        error: 'No direct video streaming URLs found in HDHub response for this title.'
      };
      streamCache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    }

    const mapped: HDHubStream[] = validStreams.map((s, idx) => {
      const fullText = `${s.name || ''} ${s.description || ''} ${s.title || ''} ${s.url || ''}`;
      const quality = parseQuality(fullText);
      const codec = parseCodec(fullText);
      const provider = parseProvider(s.url || '', fullText);
      const isDownloadOnly = /download only/i.test(fullText);
      const notWebReady = Boolean(s.behaviorHints?.notWebReady);

      // Extract size
      let sizeFormatted = formatBytes(s.behaviorHints?.videoSize);
      if (!sizeFormatted) {
        const match = fullText.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
        if (match) sizeFormatted = match[1];
      }

      const audio = parseAudioLanguages(fullText);

      return {
        id: `hdhub-${idx}-${s.url?.slice(-12) || idx}`,
        name: s.name || `Stream ${idx + 1}`,
        title: s.title || s.name || `HDHub Stream ${idx + 1}`,
        description: s.description,
        url: s.url,
        quality,
        codec,
        provider,
        audioLanguages: audio.languages,
        audioLabel: audio.label,
        sizeFormatted,
        isDownloadOnly,
        notWebReady
      };
    });

    // 4. Sort: Cloudflare R2 first, then PixelDrain, then HubCloud. Within each, 1080p > 720p > 2160p
    const sorted = mapped.sort((a, b) => {
      // Prioritize R2 (supports HTTP Byte Range streaming directly)
      const providerScore = (p: HDHubStream['provider']) => {
        if (p === 'Cloudflare R2') return 3;
        if (p === 'PixelDrain') return 2;
        return 1;
      };

      const pDiff = providerScore(b.provider) - providerScore(a.provider);
      if (pDiff !== 0) return pDiff;

      // Prioritize 1080p > 720p > 2160p > Unknown
      const qualityScore = (q: HDHubStream['quality']) => {
        if (q === '1080p') return 4;
        if (q === '720p') return 3;
        if (q === '2160p') return 2;
        if (q === '480p') return 1;
        return 0;
      };

      const qDiff = qualityScore(b.quality) - qualityScore(a.quality);
      if (qDiff !== 0) return qDiff;

      // Prioritize H.264 over H.265 for broader native browser compatibility
      const codecScore = (c: HDHubStream['codec']) => {
        if (c === 'H.264') return 2;
        if (c === 'H.265') return 1;
        return 0;
      };

      return codecScore(b.codec) - codecScore(a.codec);
    });

    const result: HDHubResolutionResult = {
      imdbId,
      streams: sorted
    };

    streamCache.set(cacheKey, { timestamp: Date.now(), result });
    return result;
  } catch (err: any) {
    console.error('HDHub stream fetch error:', err);
    return {
      imdbId,
      streams: [],
      error: err?.message || 'Failed to fetch streams from HDHub resolver.'
    };
  }
}

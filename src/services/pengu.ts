import { getImdbId } from './tmdb';
import { MediaType } from '../types/media';
import { HDHubStream, parseStreamBitrate, parseAudioCodec } from './hdhub';
import { resolvePixelDrainStreamUrl, registerPixelDrainCacheInvalidator } from '../utils/pixeldrain';

const PENGU_BASE_RESOLVER = 'https://pengu.uk/%7B%22auth_token%22%3A%22QAgjPjVLyWOqIlIqXBXTjGamncIkhZZzliQBgU3x2zg%22%7D/stream';

export interface PenguResolutionResult {
  imdbId: string;
  streams: HDHubStream[];
  error?: string;
}

// In-memory cache for resolved streams
const penguCache = new Map<string, { timestamp: number; result: PenguResolutionResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearPenguCache(): void {
  penguCache.clear();
}

registerPixelDrainCacheInvalidator(() => {
  penguCache.clear();
});

export function parsePenguAudio(text: string): { languages: string[]; label: string } {
  const languages: string[] = [];
  const lower = text.toLowerCase();

  // Check for explicit Audio line like "Audio: English, Hindi"
  const audioMatch = text.match(/audio:\s*([^\n\r]+)/i);
  if (audioMatch && audioMatch[1]) {
    const raw = audioMatch[1].split(/[,/|•+]/);
    raw.forEach((r) => {
      const clean = r.trim();
      if (clean && clean.length > 1) {
        languages.push(clean);
      }
    });
  }

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
  return '1080p'; // Default to 1080p for Pengu
}

function parseCodec(text: string): 'H.264' | 'H.265' | 'Unknown' {
  if (/h\.?265|x265|hevc/i.test(text)) return 'H.265';
  if (/h\.?264|x264|avc/i.test(text)) return 'H.264';
  return 'Unknown';
}

function parseProvider(url: string, text: string, name?: string): string {
  // Check for Source tag e.g. "🛰️ Source: Cinejoy · Lisbon"
  const srcMatch = text.match(/source:\s*([^\n\r]+)/i);
  if (srcMatch && srcMatch[1]) {
    return srcMatch[1].trim();
  }

  // Check name pill e.g. "🐧 PenguPlay 🧊 1080p • Cinejoy · Lisbon"
  if (name && name.includes('•')) {
    const parts = name.split('•');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
  }

  if (url.includes('.m3u8')) return 'Cinejoy (HLS)';
  if (url.includes('r2.cloudflarestorage.com')) return 'Cloudflare R2';
  if (url.includes('pixeldrain')) return 'PixelDrain';
  if (url.includes('pengu.uk/hls')) return 'Pengu HLS';
  if (url.includes('pengu.uk/direct')) return 'Pengu Direct';
  return 'Pengu';
}

function formatBytes(bytes?: number): string | undefined {
  if (!bytes || isNaN(bytes)) return undefined;
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export async function fetchPenguStreams(
  tmdbId: string | number,
  mediaType: MediaType,
  providedImdbId?: string,
  season: number = 1,
  episode: number = 1
): Promise<PenguResolutionResult> {
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
  const cached = penguCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Query Pengu resolver endpoint
  const targetUrl = isTV
    ? `${PENGU_BASE_RESOLVER}/series/${imdbId}:${season}:${episode}.json`
    : `${PENGU_BASE_RESOLVER}/movie/${imdbId}.json`;

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`Pengu resolver responded with HTTP status ${res.status}`);
    }

    const data = await res.json();
    const rawStreams: any[] = Array.isArray(data.streams) ? data.streams : [];

    if (rawStreams.length === 0) {
      const result: PenguResolutionResult = {
        imdbId,
        streams: [],
        error: 'No active streams found on Pengu for this title yet.'
      };
      penguCache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    }

    // Filter valid streaming URLs (exclude unsupported DASH formats like .mpd or /dash/ which cannot play in Hls.js/HTML5 video)
    const validStreams = rawStreams.filter(
      (s) =>
        s &&
        typeof s.url === 'string' &&
        s.url.trim().startsWith('http') &&
        !s.url.includes('/dash/') &&
        !s.url.includes('.mpd')
    );

    if (validStreams.length === 0) {
      const result: PenguResolutionResult = {
        imdbId,
        streams: [],
        error: 'No direct video streaming URLs found in Pengu response for this title.'
      };
      penguCache.set(cacheKey, { timestamp: Date.now(), result });
      return result;
    }

    const mapped: HDHubStream[] = validStreams.map((s, idx) => {
      const fullText = `${s.name || ''} ${s.description || ''} ${s.behaviorHints?.filename || ''} ${s.url || ''}`;
      const quality = parseQuality(fullText);
      const codec = parseCodec(fullText);
      const provider = parseProvider(s.url || '', fullText, s.name);
      const isHLS = Boolean(s.url?.includes('.m3u8') || fullText.toLowerCase().includes('hls'));

      // Extract size
      let sizeFormatted = formatBytes(s.behaviorHints?.videoSize);
      if (!sizeFormatted) {
        const match = fullText.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
        if (match) sizeFormatted = match[1];
      }

      const audio = parsePenguAudio(fullText);
      const audioCodecInfo = parseAudioCodec(fullText, isHLS);
      const bitrateInfo = parseStreamBitrate(fullText, s.behaviorHints?.videoSize, isTV);

      // Route PixelDrain URLs through our local /api/pixeldrain proxy or direct CDN based on route settings
      const streamUrl = resolvePixelDrainStreamUrl(s.url, fullText);

      return {
        id: `pengu-${idx}-${s.url?.slice(-12) || idx}`,
        name: s.name || `Pengu Stream ${idx + 1}`,
        title: s.name ? s.name.replace(/^🐧\s*/, '') : `Pengu Stream ${idx + 1}`,
        description: s.description,
        url: streamUrl,
        quality,
        codec,
        provider: provider as any,
        bitrate: bitrateInfo.bitrate,
        bitrateMbps: bitrateInfo.bitrateMbps,
        requiredSpeed: bitrateInfo.requiredSpeed,
        isHls: isHLS,
        audioLanguages: audio.languages,
        audioLabel: audio.label,
        audioCodec: audioCodecInfo.audioCodec,
        isWebAudio: audioCodecInfo.isWebAudio,
        sizeFormatted,
        isDownloadOnly: false,
        notWebReady: !isHLS && Boolean(s.behaviorHints?.notWebReady)
      };
    });

    // Sort order:
    // 1. Deprioritize known blocked/failing upstream domains (e.g. Lisbon / cheaptruckrepairs)
    // 2. Streams with browser-compatible audio (AAC, HLS, Stereo) first
    // 3. Prioritize PixelDrain (working proxy) and HLS
    // 4. Resolution (1080p > 720p > 4K)
    mapped.sort((a, b) => {
      // 1. Deprioritize known blocked/failing upstream domains (e.g. Lisbon / cheaptruckrepairs)
      const aIsBlocked = a.provider?.toLowerCase().includes('lisbon') || a.url.includes('cheaptruckrepairs');
      const bIsBlocked = b.provider?.toLowerCase().includes('lisbon') || b.url.includes('cheaptruckrepairs');
      if (aIsBlocked !== bIsBlocked) return aIsBlocked ? 1 : -1;

      // 2. Streams with browser-compatible audio (AAC, HLS, Stereo) first
      if (a.isWebAudio !== b.isWebAudio) {
        return (b.isWebAudio ? 1 : 0) - (a.isWebAudio ? 1 : 0);
      }

      // 3. Provider reliability:
      // - Cinejoy (HLS .m3u8) is #1 most reliable web source in Pengu (score 5)
      // - PixelDrain is #2 (proxied with full seek support, score 4)
      // - 2Peckle (MP4) is #3 (score 3)
      // - Arctic / HubCloud / GDFlix is #4 (score 2)
      // - Cloudflare R2 / VegaMovies / CineFreak (score 1, prone to 3h expiration)
      const providerScore = (p: string, isHls?: boolean, url?: string) => {
        const lowerP = (p || '').toLowerCase();
        const lowerUrl = (url || '').toLowerCase();
        if (isHls || lowerP.includes('cinejoy') || lowerUrl.includes('.m3u8')) return 5;
        if (lowerP.includes('r2') || lowerUrl.includes('r2.cloudflarestorage') || lowerP.includes('vegamovies') || lowerP.includes('cinefreak')) return 4;
        if (lowerP.includes('pixeldrain') || lowerUrl.includes('pixeldrain')) return 3;
        if (lowerP.includes('2peckle') || lowerUrl.includes('.mp4')) return 2;
        if (lowerP.includes('arctic') || lowerUrl.includes('hubcloud') || lowerUrl.includes('gdflix')) return 1;
        return 1;
      };
      const pDiff = providerScore(b.provider, b.isHls, b.url) - providerScore(a.provider, a.isHls, a.url);
      if (pDiff !== 0) return pDiff;

      // 4. Resolution: 1080p > 720p > 2160p > 480p > Unknown
      const qualityScore = (q: string) => {
        if (q === '1080p') return 4;
        if (q === '720p') return 3;
        if (q === '2160p') return 2;
        if (q === '480p') return 1;
        return 0;
      };
      const qDiff = qualityScore(b.quality) - qualityScore(a.quality);
      if (qDiff !== 0) return qDiff;

      // 5. Codec: H.264 > H.265
      const codecScore = (c: string) => {
        if (c === 'H.264') return 2;
        if (c === 'H.265') return 1;
        return 0;
      };
      return codecScore(b.codec) - codecScore(a.codec);
    });

    const result: PenguResolutionResult = {
      imdbId,
      streams: mapped
    };

    penguCache.set(cacheKey, { timestamp: Date.now(), result });
    return result;
  } catch (err: any) {
    console.error('Pengu stream fetch error:', err);
    return {
      imdbId,
      streams: [],
      error: err?.message || 'Failed to fetch streams from Pengu resolver.'
    };
  }
}

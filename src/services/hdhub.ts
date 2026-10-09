import { getImdbId } from './tmdb';
import { MediaType } from '../types/media';
import { resolvePixelDrainStreamUrl, registerPixelDrainCacheInvalidator } from '../utils/pixeldrain';

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
  bitrate?: string;
  bitrateMbps?: number;
  requiredSpeed?: string;
  isHls?: boolean;
  audioLanguages?: string[];
  audioLabel?: string;
  audioCodec?: 'AAC' | 'DDP 5.1' | 'TrueHD' | 'DTS' | 'AC3' | 'Stereo' | 'Unknown';
  isWebAudio?: boolean;
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

export function clearHDHubCache(): void {
  streamCache.clear();
}

registerPixelDrainCacheInvalidator(() => {
  streamCache.clear();
});

export function parseAudioCodec(
  text: string,
  isHls: boolean
): { audioCodec: 'AAC' | 'DDP 5.1' | 'TrueHD' | 'DTS' | 'AC3' | 'Stereo' | 'Unknown'; isWebAudio: boolean } {
  const lower = text.toLowerCase();

  // TrueHD / Atmos (Not supported by HTML5 video in Chrome/Firefox)
  if (lower.includes('truehd') || lower.includes('atmos')) {
    return { audioCodec: 'TrueHD', isWebAudio: false };
  }

  // DTS / DTS-HD / DTS-HD MA (Not supported by HTML5 video in browsers)
  if (lower.includes('dts-hd') || lower.includes('dts') || lower.includes('dts5.1')) {
    return { audioCodec: 'DTS', isWebAudio: false };
  }

  // Dolby Digital Plus / DDP / E-AC-3 (Not supported by Chrome on Windows in MKV container)
  if (
    lower.includes('ddp') ||
    lower.includes('dd+') ||
    lower.includes('eac3') ||
    lower.includes('e-ac-3') ||
    lower.includes('dolby digital plus')
  ) {
    return { audioCodec: 'DDP 5.1', isWebAudio: false };
  }

  // Dolby Digital / AC3 (Frequently silent or unsupported without AC3 hardware/extension)
  if (lower.includes('dd5.1') || lower.includes('ac3') || lower.includes('ac-3') || lower.includes('dolby digital')) {
    return { audioCodec: 'AC3', isWebAudio: false };
  }

  // AAC or HLS web streams (100% native browser support)
  if (isHls || lower.includes('aac') || lower.includes('mp4a') || lower.includes('2peckle') || lower.includes('web-ready')) {
    return { audioCodec: 'AAC', isWebAudio: true };
  }

  if (lower.includes('.mp4')) {
    return { audioCodec: 'AAC', isWebAudio: true };
  }

  if (lower.includes('.mkv')) {
    // Unspecified MKVs frequently have multi-channel AC3/DDP audio
    return { audioCodec: 'Unknown', isWebAudio: false };
  }

  return { audioCodec: 'Stereo', isWebAudio: true };
}

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

export function parseStreamBitrate(
  fullText: string,
  videoSizeBytes?: number,
  isTV: boolean = false
): { bitrate?: string; bitrateMbps?: number; requiredSpeed?: string } {
  let mbps: number | undefined;

  // 1. Check explicit bitrate in metadata or description
  // Matches e.g. "~1.0 Mbps", "6.2 Mbps", "~10.7Mbps", "6Mbps", "4.8 Mbit/s", "3.2 Mb/s"
  const explicitMatch = fullText.match(/(?:~|≈)?\s*(\d+(?:\.\d+)?)\s*(?:mbps|mbit\/s|mb\/s)/i);
  if (explicitMatch && explicitMatch[1]) {
    const parsed = parseFloat(explicitMatch[1]);
    if (!isNaN(parsed) && parsed > 0 && parsed < 200) {
      mbps = parsed;
    }
  }

  // 2. Check if kbps is specified (e.g. "4500 kbps", "~800 kbps")
  if (!mbps) {
    const kbpsMatch = fullText.match(/(?:~|≈)?\s*(\d+)\s*(?:kbps|kbit\/s|kb\/s)/i);
    if (kbpsMatch && kbpsMatch[1]) {
      const parsedKbps = parseFloat(kbpsMatch[1]);
      if (!isNaN(parsedKbps) && parsedKbps > 0) {
        mbps = parseFloat((parsedKbps / 1000).toFixed(1));
      }
    }
  }

  // 3. Fallback: calculate from videoSizeBytes if available
  // Average standard durations: Movie ~ 110 min (6600s), TV Episode ~ 45 min (2700s)
  if (!mbps && videoSizeBytes && videoSizeBytes > 0) {
    const durationSeconds = isTV ? 45 * 60 : 110 * 60;
    const bits = videoSizeBytes * 8;
    const calc = bits / (durationSeconds * 1_000_000);
    if (!isNaN(calc) && calc > 0.1) {
      mbps = parseFloat(calc.toFixed(1));
    }
  }

  // 4. Fallback: parse file size string if videoSizeBytes was undefined (e.g., "2.15 GB", "850 MB")
  if (!mbps) {
    const sizeMatch = fullText.match(/(\d+(?:\.\d+)?)\s*(gb|mb)/i);
    if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
      const val = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      const bytes = unit === 'GB' ? val * 1024 * 1024 * 1024 : val * 1024 * 1024;
      const durationSeconds = isTV ? 45 * 60 : 110 * 60;
      const bits = bytes * 8;
      const calc = bits / (durationSeconds * 1_000_000);
      if (!isNaN(calc) && calc > 0.1) {
        mbps = parseFloat(calc.toFixed(1));
      }
    }
  }

  // 5. Default baseline based on resolution if no size or bitrate could be extracted
  if (!mbps) {
    if (/2160p|4k/i.test(fullText)) {
      mbps = 15.0;
    } else if (/1080p|fhd/i.test(fullText)) {
      mbps = 5.0;
    } else if (/720p|hd/i.test(fullText)) {
      mbps = 2.5;
    } else if (/480p|sd/i.test(fullText)) {
      mbps = 1.2;
    }
  }

  if (mbps !== undefined && mbps > 0) {
    const formattedBitrate = `~${mbps >= 10 ? mbps.toFixed(0) : mbps.toFixed(1)} Mbps`;

    // Required network speed: 1.5x - 1.8x headroom to prevent stuttering/buffering
    const rawReq = mbps * 1.6;
    let reqSpeed = 5;
    if (rawReq <= 3) reqSpeed = 3;
    else if (rawReq <= 5) reqSpeed = 5;
    else if (rawReq <= 10) reqSpeed = 10;
    else if (rawReq <= 15) reqSpeed = 15;
    else if (rawReq <= 20) reqSpeed = 20;
    else if (rawReq <= 25) reqSpeed = 25;
    else if (rawReq <= 35) reqSpeed = 35;
    else if (rawReq <= 50) reqSpeed = 50;
    else if (rawReq <= 75) reqSpeed = 75;
    else reqSpeed = Math.ceil(rawReq / 25) * 25;

    return {
      bitrate: formattedBitrate,
      bitrateMbps: mbps,
      requiredSpeed: `≥ ${reqSpeed} Mbps`
    };
  }

  return {};
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
      const fullText = `${s.name || ''} ${s.description || ''} ${s.title || ''} ${s.url || ''} ${s.behaviorHints?.filename || ''}`;
      const quality = parseQuality(fullText);
      const codec = parseCodec(fullText);
      const provider = parseProvider(s.url || '', fullText);
      const isDownloadOnly = /download only/i.test(fullText);
      const notWebReady = Boolean(s.behaviorHints?.notWebReady);
      const isHls = Boolean(s.url?.includes('.m3u8') || fullText.toLowerCase().includes('hls'));

      // Extract size
      let sizeFormatted = formatBytes(s.behaviorHints?.videoSize);
      if (!sizeFormatted) {
        const match = fullText.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
        if (match) sizeFormatted = match[1];
      }

      const audio = parseAudioLanguages(fullText);
      const audioCodecInfo = parseAudioCodec(fullText, isHls);
      const bitrateInfo = parseStreamBitrate(fullText, s.behaviorHints?.videoSize, isTV);

      // Route PixelDrain URLs through our local /api/pixeldrain proxy or direct CDN based on route settings
      const streamUrl = resolvePixelDrainStreamUrl(s.url, fullText);

      return {
        id: `hdhub-${idx}-${s.url?.slice(-12) || idx}`,
        name: s.name || `Stream ${idx + 1}`,
        title: s.title || s.name || `HDHub Stream ${idx + 1}`,
        description: s.description,
        url: streamUrl,
        quality,
        codec,
        provider,
        bitrate: bitrateInfo.bitrate,
        bitrateMbps: bitrateInfo.bitrateMbps,
        requiredSpeed: bitrateInfo.requiredSpeed,
        isHls,
        audioLanguages: audio.languages,
        audioLabel: audio.label,
        audioCodec: audioCodecInfo.audioCodec,
        isWebAudio: audioCodecInfo.isWebAudio,
        sizeFormatted,
        isDownloadOnly,
        notWebReady
      };
    });

    // 4. Sort: Web-compatible audio first, then Cloudflare R2 (zero compute), then PixelDrain. Within each, 1080p > 720p > 2160p
    const sorted = mapped.sort((a, b) => {
      // Prioritize Cloudflare R2 (direct zero-compute CDN streaming) over PixelDrain
      const providerScore = (p: HDHubStream['provider']) => {
        if (p === 'Cloudflare R2') return 4;
        if (p === 'PixelDrain') return 2;
        if (p === 'HubCloud') return 1;
        return 1;
      };

      const pDiff = providerScore(b.provider) - providerScore(a.provider);
      if (pDiff !== 0) return pDiff;

      // Prioritize streams with native web browser audio (AAC / Stereo) over DDP 5.1/TrueHD
      if (a.isWebAudio !== b.isWebAudio) {
        return (b.isWebAudio ? 1 : 0) - (a.isWebAudio ? 1 : 0);
      }

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

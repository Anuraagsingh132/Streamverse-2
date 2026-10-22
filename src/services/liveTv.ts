import {
  LiveStream,
  StreamCategory,
  LiveStreamsResponse,
  PingResponse,
  StreamStatus,
  StreamFilterOptions
} from '../types/liveTv';

// Default mirror domains discovered from ping endpoint with api prefix
const DEFAULT_MIRROR_DOMAINS = [
  'https://api.ppv.st',
  'https://api.ppv.tj',
  'https://api.ppvs.pk',
  'https://api.ppv.rw',
  'https://api.ppv.ms',
  'https://api.ppv.bi',
  'https://api.ppv.ug'
];

// Active mirror pool (auto-updated by ping)
let mirrorPool: string[] = [...DEFAULT_MIRROR_DOMAINS];
let activeMirrorIndex = 0;

// Cache settings (60s fresh TTL per API guideline)
const CACHE_TTL_MS = 60 * 1000;
let cachedData: { timestamp: number; categories: StreamCategory[]; allStreams: LiveStream[] } | null = null;
let inFlightRequest: Promise<{ categories: StreamCategory[]; allStreams: LiveStream[] }> | null = null;

/**
 * Returns the currently active base domain.
 */
export function getActiveBaseUrl(): string {
  return mirrorPool[activeMirrorIndex] || DEFAULT_MIRROR_DOMAINS[0];
}

/**
 * Queries the /api/ping endpoint to refresh the mirror domains pool.
 */
export async function refreshMirrorDomains(): Promise<string[]> {
  for (let i = 0; i < mirrorPool.length; i++) {
    const base = mirrorPool[i];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}/api/ping`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: PingResponse = await res.json();
        if (data.success && Array.isArray(data.domains) && data.domains.length > 0) {
          const discovered = data.domains.map((d) => `https://api.${d}`);
          // Ensure discovered mirrors merge with default without duplicates
          const unique = Array.from(new Set([base, ...discovered, ...DEFAULT_MIRROR_DOMAINS]));
          mirrorPool = unique;
          activeMirrorIndex = mirrorPool.indexOf(base);
          return unique;
        }
      }
    } catch {
      // Try next mirror silently
    }
  }
  return mirrorPool;
}

/**
 * Executes a fetch request with automatic failover across mirror domains.
 */
async function fetchWithMirrorFailover<T>(endpoint: string, timeoutMs = 8000): Promise<T> {
  const startIndex = activeMirrorIndex;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < mirrorPool.length; attempt++) {
    const currIndex = (startIndex + attempt) % mirrorPool.length;
    const base = mirrorPool[currIndex];
    const url = `${base}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as T;
        activeMirrorIndex = currIndex;
        return data;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error(`All mirror domains failed for endpoint ${endpoint}`);
}

/**
 * Fetches all live TV channels and live sports streams with smart 60s caching and mirror failover.
 */
export async function fetchLiveStreams(forceRefresh = false): Promise<{
  success: boolean;
  categories: StreamCategory[];
  allStreams: LiveStream[];
  timestamp: number;
}> {
  const now = Date.now();

  if (!forceRefresh && cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      categories: cachedData.categories,
      allStreams: cachedData.allStreams,
      timestamp: cachedData.timestamp
    };
  }

  if (inFlightRequest) {
    const result = await inFlightRequest;
    return {
      success: true,
      categories: result.categories,
      allStreams: result.allStreams,
      timestamp: cachedData?.timestamp || now
    };
  }

  inFlightRequest = (async () => {
    try {
      const data = await fetchWithMirrorFailover<LiveStreamsResponse>('/api/streams');
      const categories: StreamCategory[] = Array.isArray(data.streams) ? data.streams : [];
      const allStreams: LiveStream[] = categories.flatMap((cat) =>
        (cat.streams || []).map((stream) => ({
          ...stream,
          category_name: stream.category_name || cat.category
        }))
      );

      cachedData = {
        timestamp: now,
        categories,
        allStreams
      };

      // Trigger mirror discovery in background to keep list fresh
      refreshMirrorDomains().catch(() => {});

      return { categories, allStreams };
    } finally {
      inFlightRequest = null;
    }
  })();

  const result = await inFlightRequest;
  return {
    success: true,
    categories: result.categories,
    allStreams: result.allStreams,
    timestamp: now
  };
}

/**
 * Computes stream playback status: 'live' | 'upcoming' | 'ended'.
 */
export function getStreamStatus(stream: LiveStream, nowSeconds = Math.floor(Date.now() / 1000)): StreamStatus {
  // Linear 24/7 channels are always live
  if (stream.always_live === 1 || stream.always_live === true) {
    return 'live';
  }

  // Channels with no start or end time defined default to live
  if ((!stream.starts_at || stream.starts_at <= 0) && (!stream.ends_at || stream.ends_at <= 0)) {
    return 'live';
  }

  if (stream.ends_at && stream.ends_at > 0 && nowSeconds > stream.ends_at) {
    return 'ended';
  }

  if (stream.starts_at && stream.starts_at > 0 && nowSeconds < stream.starts_at) {
    return 'upcoming';
  }

  return 'live';
}

/**
 * Retrieves the local user timezone abbreviation (e.g. IST, EDT, PST, UTC).
 */
export function getUserTimeZoneAbbr(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Formats start and end times into localized human readable string,
 * e.g. "Today, 8:00 PM IST", "Tomorrow, 3:30 AM IST", or "Sat, Oct 25 · 8:00 PM IST".
 */
export function formatStreamTime(startsAt: number, _endsAt = 0, withTimezone = true): string {
  if (!startsAt || startsAt <= 0) return '24/7 Channel';

  const date = new Date(startsAt * 1000);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const tz = withTimezone ? getUserTimeZoneAbbr() : '';
  const formattedTime = tz ? `${timeStr} ${tz}` : timeStr;

  if (isToday) return `Today, ${formattedTime}`;
  if (isTomorrow) return `Tomorrow, ${formattedTime}`;

  const weekday = date.toLocaleDateString([], { weekday: 'short' });
  const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${weekday}, ${monthDay} · ${formattedTime}`;
}

export interface MatchTeams {
  isMatch: boolean;
  team1?: string;
  team2?: string;
  score?: string;
  cleanTitle: string;
}

/**
 * Parses match titles (e.g. "Arsenal vs Chelsea", "Pelicans at Pacers (98-91)")
 * into separate team names, scores, and clean title.
 */
export function parseMatchTeams(name: string): MatchTeams {
  if (!name) return { isMatch: false, cleanTitle: '' };

  let title = name.trim();
  let score: string | undefined;

  // Extract score if present e.g. (98-91) or [2 - 1]
  const scoreRegex = /[([{](\d+\s*[-–:]\s*\d+)[)\]}]/;
  const scoreMatch = title.match(scoreRegex);
  if (scoreMatch) {
    score = scoreMatch[1].trim();
    title = title.replace(scoreMatch[0], '').trim();
  }

  // Split on " vs ", " vs. ", " at ", " v ", or " - "
  const splitRegex = /\s+(?:vs\.?|at|v\.?|-)\s+/i;
  const parts = title.split(splitRegex);

  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
    return {
      isMatch: true,
      team1: parts[0].trim(),
      team2: parts[1].trim(),
      score,
      cleanTitle: title
    };
  }

  return {
    isMatch: false,
    score,
    cleanTitle: title
  };
}

export interface ProviderInfo {
  label: string;
  short: string;
  bg: string;
  text: string;
}

/**
 * Maps stream tags and broadcaster labels to recognizable visual provider badges.
 */
export function getProviderBadge(sourceTag?: string, tag?: string): ProviderInfo {
  const provider = (sourceTag || tag || '').trim();
  const lower = provider.toLowerCase();

  if (lower.includes('sky')) return { label: 'Sky Sports', short: 'SKY', bg: '#00205B', text: '#FFFFFF' };
  if (lower.includes('espn')) return { label: 'ESPN', short: 'ESPN', bg: '#CC0000', text: '#FFFFFF' };
  if (lower.includes('tnt')) return { label: 'TNT Sports', short: 'TNT', bg: '#FEEB00', text: '#000000' };
  if (lower.includes('fox')) return { label: 'FOX Sports', short: 'FOX', bg: '#003366', text: '#FFFFFF' };
  if (lower.includes('willow')) return { label: 'Willow Cricket', short: 'WIL', bg: '#1B5E20', text: '#FFFFFF' };
  if (lower.includes('paramount')) return { label: 'Paramount+', short: 'P+', bg: '#0064FF', text: '#FFFFFF' };
  if (lower.includes('kayo')) return { label: 'Kayo Sports', short: 'KAYO', bg: '#10B981', text: '#FFFFFF' };
  if (lower.includes('cbs')) return { label: 'CBS Sports', short: 'CBS', bg: '#002E6E', text: '#FFFFFF' };
  if (lower.includes('nbc') || lower.includes('peacock')) return { label: 'Peacock', short: 'NBC', bg: '#111827', text: '#FFFFFF' };
  if (lower.includes('dazn')) return { label: 'DAZN', short: 'DAZN', bg: '#F8F852', text: '#000000' };
  if (lower.includes('sony')) return { label: 'Sony LIV', short: 'SONY', bg: '#000000', text: '#FFFFFF' };
  if (lower.includes('star')) return { label: 'Star Sports', short: 'STAR', bg: '#1E3A8A', text: '#FFFFFF' };
  if (lower.includes('bein')) return { label: 'beIN Sports', short: 'beIN', bg: '#5D2E8C', text: '#FFFFFF' };

  const short = provider.slice(0, 3).toUpperCase() || 'TV';
  return { label: provider || 'HD Feed', short, bg: '#1E293B', text: '#FFFFFF' };
}

/**
 * Returns a subtle theme color for corner radial glow.
 */
export function getStreamThemeColor(stream: LiveStream): string {
  if (stream.colors && stream.colors.length > 0 && stream.colors[0]) {
    return stream.colors[0];
  }

  const cat = (stream.category_name || '').toLowerCase();
  if (cat.includes('cricket')) return '#10b981';
  if (cat.includes('football') && !cat.includes('american')) return '#3b82f6';
  if (cat.includes('american') || cat.includes('nfl')) return '#ef4444';
  if (cat.includes('basket')) return '#f97316';
  if (cat.includes('combat') || cat.includes('wrestl')) return '#dc2626';
  if (cat.includes('hockey')) return '#06b6d4';
  if (cat.includes('24/7')) return '#6366f1';

  return '#4f46e5';
}

/**
 * Returns a human-friendly countdown string for upcoming events.
 */
export function getStreamCountdown(startsAt: number, nowSeconds = Math.floor(Date.now() / 1000)): string {
  if (!startsAt || startsAt <= 0) return '';
  const diffSec = startsAt - nowSeconds;
  if (diffSec <= 0) return 'Live Now';

  const mins = Math.floor(diffSec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  return `in ${Math.max(1, mins)}m`;
}

/**
 * Filters a list of streams based on search query, category, and live status.
 */
export function filterStreams(streams: LiveStream[], options: StreamFilterOptions): LiveStream[] {
  const { category, query, status } = options;
  const nowSec = Math.floor(Date.now() / 1000);
  const q = query ? query.trim().toLowerCase() : '';

  return streams.filter((stream) => {
    // 1. Category Filter
    if (category && category !== 'All') {
      if (category === '24/7 Streams' || category === '24/7 Channels') {
        const is247 =
          stream.always_live === 1 ||
          stream.always_live === true ||
          stream.category_name?.toLowerCase().includes('24/7') ||
          stream.tag?.toLowerCase().includes('24/7');
        if (!is247) return false;
      } else if (stream.category_name?.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }

    // 2. Status Filter
    if (status && status !== 'all') {
      const streamStatus = getStreamStatus(stream, nowSec);
      if (status === 'live' && streamStatus !== 'live') return false;
      if (status === 'upcoming' && streamStatus !== 'upcoming') return false;
      if (status === '24/7') {
        const is247 = stream.always_live === 1 || stream.always_live === true;
        if (!is247) return false;
      }
    }

    // 3. Search Query Filter
    if (q) {
      const nameMatch = stream.name?.toLowerCase().includes(q);
      const tagMatch = stream.tag?.toLowerCase().includes(q);
      const sourceMatch = stream.source_tag?.toLowerCase().includes(q);
      const catMatch = stream.category_name?.toLowerCase().includes(q);
      if (!nameMatch && !tagMatch && !sourceMatch && !catMatch) return false;
    }

    return true;
  });
}

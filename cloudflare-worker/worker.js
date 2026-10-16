/**
 * Cloudflare Worker for Streamverse Video Proxy
 * Endpoint: https://lively-bar-b4aa.anuraagsingh10a.workers.dev
 *
 * Provides high-speed video chunk streaming with:
 * - Full HTTP 206 Partial Content & Range request support (crucial for scrubber seeking)
 * - Permissive CORS headers for browser video playback
 * - Multi-mirror failover (EU CDN mirror -> pixeldrain.dev -> pixeldrain.com)
 * - Automatic timeout handling and path traversal protection
 * - ZERO compute/bandwidth charge on Vercel
 */

// Hop-by-hop headers that must never be forwarded between proxies
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function getAuthorizedOrigin(request, env) {
  const origin = request.headers.get('origin') || request.headers.get('referer');
  if (!origin) {
    // Direct browser media requests (<video src="...">, audio tag, curl, VLC) do not send Origin
    return '*';
  }
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const rawPatterns = env?.ALLOWED_ORIGIN_PATTERNS || 'localhost,127.0.0.1,streamverse.app,streamverse.vercel.app';
    const allowedPatterns = rawPatterns.split(',');
    for (const pattern of allowedPatterns) {
      const p = pattern.trim().toLowerCase();
      if (originHost === p || originHost.endsWith('.' + p)) {
        return origin;
      }
    }
  } catch {
    // Malformed origin URL
  }
  return env?.FALLBACK_ORIGIN || 'https://streamverse.app';
}

const TMDB_DEFAULT_KEY = '1cf50e6248dc270629e802686245c2c8';

// ==============================================================================
// DUAL-TIER EDGE CACHE (L1 In-Isolate RAM + L2 Cloudflare Cache API)
// ==============================================================================
const L1_CACHE = new Map();
const L1_MAX_ITEMS = 500;

function setL1(key, data, ttlSeconds) {
  if (L1_CACHE.size >= L1_MAX_ITEMS) {
    const firstKey = L1_CACHE.keys().next().value;
    L1_CACHE.delete(firstKey);
  }
  L1_CACHE.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function getL1(key) {
  const item = L1_CACHE.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    L1_CACHE.delete(key);
    return null;
  }
  return item.data;
}

function buildCachedResponse(data, allowedOrigin, ttlSeconds, cacheHeader) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Vary': 'Origin, Accept-Encoding',
      'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`,
      'X-Edge-Cache': cacheHeader,
      'CF-Cache-Status': cacheHeader.includes('HIT') ? 'HIT' : 'MISS',
    },
  });
}

async function fetchAndCacheTmdb(request, upstreamUrl, allowedOrigin, ttlSeconds = 900, ctx = null) {
  const cacheKeyStr = request ? request.url : upstreamUrl;

  // 1. Check L1 In-Isolate RAM (sub-millisecond)
  const l1Hit = getL1(cacheKeyStr);
  if (l1Hit) {
    return buildCachedResponse(l1Hit, allowedOrigin, ttlSeconds, 'HIT-L1-RAM');
  }

  // 2. Check L2 Cloudflare Edge Cache API (2ms - 10ms)
  let cfCache = null;
  try {
    cfCache = typeof caches !== 'undefined' ? caches.default : null;
  } catch {}

  const cfCacheKey = new Request(cacheKeyStr, { method: 'GET' });
  if (cfCache) {
    try {
      const match = await cfCache.match(cfCacheKey);
      if (match) {
        const data = await match.json();
        setL1(cacheKeyStr, data, ttlSeconds);
        return buildCachedResponse(data, allowedOrigin, ttlSeconds, 'HIT-L2-CF');
      }
    } catch {}
  }

  // 3. Cache Miss: Fetch from upstream TMDB once
  try {
    const res = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamverse-BFF/2.0'
      }
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Upstream error ${res.status}` }), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Vary': 'Origin'
        }
      });
    }
    const data = await res.json();

    // Store in L1 RAM
    setL1(cacheKeyStr, data, ttlSeconds);

    // Build response with cache headers
    const response = buildCachedResponse(data, allowedOrigin, ttlSeconds, 'MISS-ORIGIN');

    // Store in L2 Cloudflare Cache asynchronously
    if (cfCache) {
      try {
        const putPromise = cfCache.put(cfCacheKey, response.clone()).catch(() => {});
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil(putPromise);
        }
      } catch {}
    }

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'Upstream fetch failed' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Vary': 'Origin'
      }
    });
  }
}

async function fetchAndSanitizeDetails(request, upstreamUrl, mediaType, allowedOrigin, ttlSeconds = 3600, ctx = null) {
  const cacheKeyStr = request ? request.url : upstreamUrl;

  // 1. Check L1 In-Isolate RAM (sub-millisecond)
  const l1Hit = getL1(cacheKeyStr);
  if (l1Hit) {
    return buildCachedResponse(l1Hit, allowedOrigin, ttlSeconds, 'HIT-L1-RAM');
  }

  // 2. Check L2 Cloudflare Edge Cache API (2ms - 10ms)
  let cfCache = null;
  try {
    cfCache = typeof caches !== 'undefined' ? caches.default : null;
  } catch {}

  const cfCacheKey = new Request(cacheKeyStr, { method: 'GET' });
  if (cfCache) {
    try {
      const match = await cfCache.match(cfCacheKey);
      if (match) {
        const data = await match.json();
        setL1(cacheKeyStr, data, ttlSeconds);
        return buildCachedResponse(data, allowedOrigin, ttlSeconds, 'HIT-L2-CF');
      }
    } catch {}
  }

  // 3. Cache Miss: Fetch upstream from TMDB once, sanitize 1.2MB -> 20KB, and cache
  try {
    const res = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Streamverse-BFF/2.0'
      }
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Upstream error ${res.status}` }), {
        status: res.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
          'Vary': 'Origin'
        }
      });
    }
    const raw = await res.json();

    const sanitized = {
      id: raw.id,
      title: raw.title || raw.name,
      name: raw.name || raw.title,
      original_title: raw.original_title,
      original_name: raw.original_name,
      overview: raw.overview,
      backdrop_path: raw.backdrop_path,
      poster_path: raw.poster_path,
      tagline: raw.tagline,
      vote_average: raw.vote_average,
      vote_count: raw.vote_count,
      release_date: raw.release_date,
      first_air_date: raw.first_air_date,
      runtime: raw.runtime,
      episode_run_time: raw.episode_run_time,
      status: raw.status,
      media_type: mediaType,
      genres: raw.genres || [],
      credits: {
        cast: (raw.credits?.cast || []).slice(0, 14).map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path
        })),
        crew: (raw.credits?.crew || [])
          .filter((c) => ['Director', 'Writer', 'Screenplay', 'Author', 'Story', 'Teleplay', 'Producer', 'Executive Producer'].includes(c.job))
          .slice(0, 8)
          .map((c) => ({
            id: c.id,
            name: c.name,
            job: c.job,
            profile_path: c.profile_path
          }))
      },
      created_by: raw.created_by,
      videos: {
        results: (raw.videos?.results || [])
          .filter((v) => v.site === 'YouTube')
          .slice(0, 8)
          .map((v) => ({
            id: v.id,
            key: v.key,
            name: v.name,
            site: v.site,
            type: v.type
          }))
      },
      images: {
        logos: (raw.images?.logos || [])
          .filter((l) => l.iso_639_1 === 'en' || !l.iso_639_1)
          .slice(0, 3)
          .map((l) => ({
            file_path: l.file_path,
            iso_639_1: l.iso_639_1
          }))
      },
      seasons: (raw.seasons || []).map((s) => ({
        id: s.id,
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count,
        poster_path: s.poster_path
      })),
      recommendations: {
        results: (raw.recommendations?.results || []).slice(0, 12).map((r) => ({
          id: r.id,
          title: r.title || r.name,
          name: r.name || r.title,
          poster_path: r.poster_path,
          backdrop_path: r.backdrop_path,
          vote_average: r.vote_average,
          media_type: r.media_type || mediaType,
          genre_ids: r.genre_ids,
          release_date: r.release_date,
          first_air_date: r.first_air_date
        }))
      },
      release_dates: raw.release_dates,
      content_ratings: raw.content_ratings
    };

    // Store in L1 RAM
    setL1(cacheKeyStr, sanitized, ttlSeconds);

    // Build response with cache headers
    const response = buildCachedResponse(sanitized, allowedOrigin, ttlSeconds, 'MISS-ORIGIN');

    // Store in L2 Cloudflare Cache asynchronously
    if (cfCache) {
      try {
        const putPromise = cfCache.put(cfCacheKey, response.clone()).catch(() => {});
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil(putPromise);
        }
      } catch {}
    }

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'Details fetch failed' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Vary': 'Origin'
      }
    });
  }
}

async function handleMediaRequest(url, request, env, allowedOrigin, ctx = null) {
  const apiKey = env?.TMDB_API_KEY || TMDB_DEFAULT_KEY;
  const path = url.pathname;

  if (path === '/api/media/trending') {
    const type = url.searchParams.get('type') || 'all';
    const timeWindow = url.searchParams.get('timeWindow') || 'day';
    const upstreamUrl = `https://api.themoviedb.org/3/trending/${type}/${timeWindow}?api_key=${apiKey}&language=en-US`;
    return fetchAndCacheTmdb(request, upstreamUrl, allowedOrigin, 900, ctx);
  }

  if (path === '/api/media/top-rated') {
    const type = url.searchParams.get('type') || 'movie';
    const page = url.searchParams.get('page') || '1';
    const upstreamUrl = `https://api.themoviedb.org/3/${type}/top_rated?api_key=${apiKey}&language=en-US&page=${page}`;
    return fetchAndCacheTmdb(request, upstreamUrl, allowedOrigin, 1800, ctx);
  }

  if (path === '/api/media/popular') {
    const type = url.searchParams.get('type') || 'movie';
    const page = url.searchParams.get('page') || '1';
    const upstreamUrl = `https://api.themoviedb.org/3/${type}/popular?api_key=${apiKey}&language=en-US&page=${page}`;
    return fetchAndCacheTmdb(request, upstreamUrl, allowedOrigin, 1800, ctx);
  }

  const detailsMatch = path.match(/^\/api\/media\/details\/(movie|tv)\/([0-9]+)$/);
  if (detailsMatch) {
    const [, mediaType, id] = detailsMatch;
    const upstreamUrl = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&append_to_response=credits,videos,recommendations,images,content_ratings,release_dates&include_image_language=en,null`;
    return fetchAndSanitizeDetails(request, upstreamUrl, mediaType, allowedOrigin, 3600, ctx);
  }

  return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin
    }
  });
}

async function handleRequest(request, env, ctx) {
  const allowedOrigin = getAuthorizedOrigin(request, env);

  // 1. CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    });
  }

  // 2. Method lockdown
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Origin': allowedOrigin,
        Vary: 'Origin',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  const url = new URL(request.url);

  // Check for media BFF endpoints
  if (url.pathname.startsWith('/api/media/')) {
    return handleMediaRequest(url, request, env, allowedOrigin, ctx);
  }

  // 3. Extract and sanitize file ID
  const parts = url.pathname.split('/').filter(Boolean);
  const rawId = parts[parts.length - 1]?.replace(/\?.*$/, '') || '';
  let id = '';

  try {
    id = decodeURIComponent(rawId).trim();
  } catch {
    return new Response('Malformed URI parameter', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Path traversal check & strict regex validation
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\') || !/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return new Response('Invalid or missing file ID. Usage: /:id or /api/pixeldrain/:id', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const isCdn = url.searchParams.get('mode') === 'cdn' || url.pathname.includes('pixeldrain-cdn');
  const range = request.headers.get('range');

  const clientUa = request.headers.get('user-agent');
  const upstreamHeaders = {
    'Accept': '*/*',
    'User-Agent': (clientUa && !clientUa.includes('Chrome/120.0.0.0'))
      ? clientUa
      : 'Streamverse/2.0 (Video Player)'
  };
  if (range) {
    upstreamHeaders['Range'] = range;
  }

  // Fast mirror cascade (prioritize high-speed CORS-enabled dev and CDN endpoints)
  const candidateUrls = isCdn
    ? [
        `https://cdn.pixeldrain.eu.cc/${id}`,
        `https://pixeldrain.dev/api/file/${id}`,
        `https://pixeldrain.com/api/file/${id}`,
      ]
    : [
        `https://pixeldrain.dev/api/file/${id}`,
        `https://cdn.pixeldrain.eu.cc/${id}`,
        `https://pixeldrain.com/api/file/${id}`,
      ];

  let upstreamRes = null;
  const errors = [];

  for (const targetUrl of candidateUrls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(targetUrl, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Valid streaming responses include 200 (OK), 206 (Partial Content), and 416 (Range Not Satisfiable)
      // Only break on valid streaming responses; do not break early on 404
      if (res.ok || res.status === 206 || res.status === 416) {
        upstreamRes = res;
        break;
      } else {
        errors.push(`${targetUrl} -> ${res.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      errors.push(`${targetUrl} -> ${err?.message || 'timeout/network error'}`);
    }
  }

  if (!upstreamRes) {
    const is404 = errors.length > 0 && errors.every((e) => e.includes('-> 404'));
    return new Response(`All upstream PixelDrain mirrors failed: ${errors.join(' | ')}`, {
      status: is404 ? 404 : 502,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        Vary: 'Origin',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  }

  // 4. Sanitize and forward response headers
  const responseHeaders = new Headers();
  responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
  responseHeaders.set('Vary', 'Origin');
  responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Content-Security-Policy', "default-src 'none'; sandbox");

  // Cache-Control: do not cache 404 for 24h
  if (upstreamRes.status === 404) {
    responseHeaders.set('Cache-Control', 'no-cache, no-store');
  } else {
    responseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
  }

  // MIME whitelist: force application/octet-stream and attachment if non-media
  const rawContentType = (upstreamRes.headers.get('content-type') || '').toLowerCase().trim();
  const isAllowedMime =
    rawContentType.startsWith('video/') ||
    rawContentType.startsWith('audio/') ||
    rawContentType.startsWith('application/octet-stream');

  if (isAllowedMime) {
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'application/octet-stream');
    responseHeaders.set('Content-Disposition', 'inline');
  } else {
    responseHeaders.set('Content-Type', 'application/octet-stream');
    responseHeaders.set('Content-Disposition', 'attachment');
  }

  const forwardableHeaders = ['content-length', 'content-range', 'last-modified', 'etag'];
  for (const h of forwardableHeaders) {
    const v = upstreamRes.headers.get(h);
    if (v && !HOP_BY_HOP_HEADERS.has(h.toLowerCase())) {
      responseHeaders.set(h, v);
    }
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}

// Support both ES Module export and legacy Service Worker syntax
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};

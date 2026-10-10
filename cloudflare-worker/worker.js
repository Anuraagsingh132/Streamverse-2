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
    const rawPatterns = env?.ALLOWED_ORIGIN_PATTERNS || 'localhost,127.0.0.1,streamverse.app,streamverse.vercel.app,workers.dev';
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

async function handleRequest(request, env) {
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

  // 3. Extract and sanitize file ID
  const url = new URL(request.url);
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
    try {
      const res = await fetch(targetUrl, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok || res.status === 206 || res.status === 416 || res.status === 404) {
        upstreamRes = res;
        break;
      } else {
        errors.push(`${targetUrl} -> ${res.status}`);
      }
    } catch (err) {
      errors.push(`${targetUrl} -> ${err?.message || 'timeout/network error'}`);
    }
  }

  if (!upstreamRes) {
    return new Response(`All upstream PixelDrain mirrors failed: ${errors.join(' | ')}`, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 4. Sanitize and forward response headers
  const responseHeaders = new Headers();
  responseHeaders.set('Access-Control-Allow-Origin', allowedOrigin);
  responseHeaders.set('Vary', 'Origin');
  responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Content-Disposition', 'inline');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');

  const forwardableHeaders = ['content-type', 'content-length', 'content-range', 'last-modified', 'etag'];
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
  async fetch(request, env, _ctx) {
    return handleRequest(request, env);
  },
};

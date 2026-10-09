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

async function handleRequest(request) {
  // 1. CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 2. Method lockdown
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Origin': '*',
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
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Path traversal check & strict regex validation
  if (!id || id.includes('..') || id.includes('/') || id.includes('\\') || !/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return new Response('Invalid or missing file ID. Usage: /:id or /api/pixeldrain/:id', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const isCdn = url.searchParams.get('mode') === 'cdn' || url.pathname.includes('pixeldrain-cdn');
  const range = request.headers.get('range');

  const upstreamHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (range) {
    upstreamHeaders['Range'] = range;
  }

  // Fast mirror cascade
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
  let lastError = null;

  for (const targetUrl of candidateUrls) {
    try {
      const res = await fetch(targetUrl, {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok || res.status === 206 || res.status === 416 || res.status === 404) {
        upstreamRes = res;
        break;
      } else {
        lastError = new Error(`Upstream ${targetUrl} returned status ${res.status}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!upstreamRes) {
    return new Response(lastError?.message || 'Upstream fetch failed or timed out', {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 4. Sanitize and forward response headers
  const responseHeaders = new Headers();
  responseHeaders.set('Access-Control-Allow-Origin', '*');
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
  async fetch(request, env, ctx) {
    return handleRequest(request);
  },
};

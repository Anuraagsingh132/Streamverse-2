export const config = {
  runtime: 'edge',
};

// Hop-by-hop headers that should never be forwarded between proxies
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

function getAuthorizedOrigin(req) {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  if (!origin) {
    // Direct media playback requests (<video src="...">, audio, VLC, curl) don't send Origin
    return '*';
  }
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const allowed = ['localhost', '127.0.0.1', 'streamverse.app'];
    if (
      allowed.some((host) => originHost === host || originHost.endsWith('.' + host)) ||
      originHost.endsWith('vercel.app')
    ) {
      return origin;
    }
  } catch {
    // Malformed origin URL
  }
  return 'https://streamverse.app';
}

export default async function handler(req) {
  const allowedOrigin = getAuthorizedOrigin(req);

  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    });
  }

  // 2. Strict HTTP method lockdown (GET and HEAD only)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Origin': allowedOrigin,
        Vary: 'Origin',
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  }

  // 3. Extract and sanitize file ID against path traversal and malicious encoding
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const rawId = parts[parts.length - 1]?.replace(/\?.*$/, '') || '';
  let id = '';

  try {
    id = decodeURIComponent(rawId).trim();
  } catch {
    return new Response('Malformed URI parameter', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin', 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // Path traversal check & strict regex validation
  if (
    !id ||
    id.includes('..') ||
    id.includes('/') ||
    id.includes('\\') ||
    !/^[a-zA-Z0-9_-]{4,32}$/.test(id)
  ) {
    return new Response('Invalid or missing file ID', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin', 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const isCdn = url.searchParams.get('mode') === 'cdn' || url.pathname.includes('pixeldrain-cdn');
  const range = req.headers.get('range');

  const clientUa = req.headers.get('user-agent');
  const upstreamHeaders = {
    'Accept': '*/*',
    'User-Agent': (clientUa && !clientUa.includes('Chrome/120.0.0.0'))
      ? clientUa
      : 'Streamverse/2.0 (Video Player)'
  };
  if (range) {
    upstreamHeaders['Range'] = range;
  }

  // If CDN mode is requested, prioritize direct CDN mirror, followed by pixeldrain.dev and pixeldrain.com
  const candidateUrls = isCdn
    ? [
        `https://cdn.pixeldrain.eu.cc/${id}`,
        `https://pixeldrain.dev/api/file/${id}`,
        `https://pixeldrain.com/api/file/${id}`
      ]
    : [
        `https://pixeldrain.dev/api/file/${id}`,
        `https://cdn.pixeldrain.eu.cc/${id}`,
        `https://pixeldrain.com/api/file/${id}`
      ];

  let upstreamRes = null;
  const errors = [];

  for (const targetUrl of candidateUrls) {
    try {
      // 4. AbortSignal.timeout(10000) prevents hanging requests on slow/dead upstream servers (T3-09)
      const res = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });

      // Valid streaming responses include 200 (OK), 206 (Partial Content), and 416 (Range Not Satisfiable)
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
      headers: { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin', 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // 5. Sanitize and forward response headers
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
    headers: responseHeaders
  });
}

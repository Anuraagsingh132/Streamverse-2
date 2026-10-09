export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
      }
    });
  }

  // Restrict to allowed methods
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1]?.replace(/\?.*$/, '');

  // Validate ID format (alphanumeric, underscores, dashes only)
  if (!id || !/^[a-zA-Z0-9_-]{4,32}$/.test(id)) {
    return new Response('Invalid or missing file ID', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  const isCdn = url.searchParams.get('mode') === 'cdn' || url.pathname.includes('pixeldrain-cdn');

  const range = req.headers.get('range');
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (range) {
    headers['Range'] = range;
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
        `https://pixeldrain.com/api/file/${id}`
      ];

  let upstreamRes = null;
  let lastError = null;

  for (const targetUrl of candidateUrls) {
    try {
      const res = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers,
        redirect: 'follow'
      });

      // Valid streaming responses include 200 (OK), 206 (Partial Content), and 416 (Range Not Satisfiable)
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
    return new Response(lastError?.message || 'Upstream fetch failed', {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Content-Disposition', 'inline');

  const forwardHeaders = ['content-type', 'content-length', 'content-range', 'last-modified', 'etag'];
  for (const h of forwardHeaders) {
    const v = upstreamRes.headers.get(h);
    if (v) responseHeaders.set(h, v);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: responseHeaders
  });
}

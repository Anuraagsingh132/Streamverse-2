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
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1]?.replace(/\?.*$/, '');

  if (!id) {
    return new Response('Missing file ID', { status: 400 });
  }

  const range = req.headers.get('range');
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (range) {
    headers['Range'] = range;
  }

  // Try pixeldrain.dev first, fallback to pixeldrain.com if network fails
  const domains = ['pixeldrain.dev', 'pixeldrain.com'];
  let upstreamRes = null;
  let lastError = null;

  for (const domain of domains) {
    try {
      const targetUrl = `https://${domain}/api/file/${id}`;
      const res = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers
      });

      if (res.ok || res.status === 206) {
        upstreamRes = res;
        break;
      } else if (res.status === 404) {
        upstreamRes = res;
        break;
      } else {
        lastError = new Error(`Upstream ${domain} returned status ${res.status}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!upstreamRes) {
    return new Response(lastError?.message || 'Upstream fetch failed', { status: 502 });
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

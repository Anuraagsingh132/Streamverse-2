export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const id = parts[parts.length - 1]?.replace(/\?.*$/, '');

  if (!id) {
    return new Response('Missing file ID', { status: 400 });
  }

  const targetUrl = `https://pixeldrain.dev/api/file/${id}`;
  const range = req.headers.get('range');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (range) {
    headers['Range'] = range;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
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
  } catch (err) {
    return new Response(err?.message || 'Upstream fetch failed', { status: 502 });
  }
}

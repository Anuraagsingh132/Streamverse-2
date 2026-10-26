export const config = {
  runtime: 'edge',
};

const TMDB_API_KEY = '1cf50e6248dc270629e802686245c2c8';
const DEFAULT_SITE_NAME = 'StreamVerse';
const DEFAULT_TITLE = 'StreamVerse — Movies, Anime, TV Shows & Live Sports';
const DEFAULT_DESCRIPTION = 'Discover movies, explore TV shows and anime, and find live sports on StreamVerse—all in one place.';
const DEFAULT_IMAGE = 'https://streamverse.anuraag.studio/og/streamverse-home.jpg';
const DEFAULT_BASE_URL = 'https://streamverse.anuraag.studio';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchTmdbMedia(type, id) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchAniListMedia(id) {
  const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        title {
          english
          romaji
          native
        }
        description(asHtml: false)
        bannerImage
        coverImage {
          extraLarge
          large
        }
        startDate {
          year
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { id: Number(id) },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.Media || null;
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'streamverse.anuraag.studio';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}`;

  const type = (url.searchParams.get('type') || 'movie').toLowerCase();
  const id = url.searchParams.get('id');
  const season = url.searchParams.get('s') || url.searchParams.get('season');
  const episode = url.searchParams.get('ep') || url.searchParams.get('episode');

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_IMAGE;
  let canonicalUrl = `${baseUrl}/`;
  let ogType = 'website';

  if (id) {
    if (type === 'anime') {
      ogType = 'video.tv_show';
      const anime = await fetchAniListMedia(id);
      if (anime) {
        const rawTitle = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Anime';
        const year = anime.startDate?.year ? ` (${anime.startDate.year})` : '';
        const epSuffix = episode ? ` · Episode ${episode}` : '';
        title = `${rawTitle}${year}${epSuffix} — StreamVerse`;

        if (anime.description) {
          const cleaned = anime.description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
          description = cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
        } else {
          description = `Watch ${rawTitle} in high definition with English subtitles on StreamVerse.`;
        }

        image = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || DEFAULT_IMAGE;
        canonicalUrl = episode ? `${baseUrl}/watch/anime/${id}/${episode}` : `${baseUrl}/watch/anime/${id}`;
      } else {
        canonicalUrl = `${baseUrl}/watch/anime/${id}`;
      }
    } else {
      // Movie or TV Show via TMDB
      const mediaType = type === 'tv' ? 'tv' : 'movie';
      ogType = mediaType === 'tv' ? 'video.tv_show' : 'video.movie';
      const media = await fetchTmdbMedia(mediaType, id);

      if (media) {
        const rawTitle = media.title || media.name || (mediaType === 'tv' ? 'TV Show' : 'Movie');
        const rawDate = media.release_date || media.first_air_date || '';
        const year = rawDate ? ` (${rawDate.slice(0, 4)})` : '';
        const tvSuffix = mediaType === 'tv' && season && episode ? ` · S${season}:E${episode}` : '';
        title = `${rawTitle}${year}${tvSuffix} — StreamVerse`;

        if (media.overview) {
          const cleaned = media.overview.replace(/\s+/g, ' ').trim();
          description = cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
        } else {
          description = `Watch ${rawTitle} on StreamVerse with instant buffering and multi-server streaming.`;
        }

        if (media.backdrop_path) {
          image = `https://image.tmdb.org/t/p/w1280${media.backdrop_path}`;
        } else if (media.poster_path) {
          image = `https://image.tmdb.org/t/p/w780${media.poster_path}`;
        }

        if (mediaType === 'tv') {
          canonicalUrl = season && episode
            ? `${baseUrl}/watch/tv/${id}?season=${season}&episode=${episode}`
            : `${baseUrl}/watch/tv/${id}`;
        } else {
          canonicalUrl = `${baseUrl}/watch/movie/${id}`;
        }
      } else {
        canonicalUrl = `${baseUrl}/watch/${mediaType}/${id}`;
      }
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(canonicalUrl);

  const imgWidth = id ? '1280' : '1200';
  const imgHeight = id ? '720' : '630';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph / WhatsApp / Facebook / Telegram / Discord -->
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:site_name" content="${DEFAULT_SITE_NAME}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:secure_url" content="${safeImage}" />
  <meta property="og:image:width" content="${imgWidth}" />
  <meta property="og:image:height" content="${imgHeight}" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta property="og:url" content="${safeUrl}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@StreamVerse" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta name="twitter:image:alt" content="${safeTitle}" />

  <!-- Instant browser redirect for non-crawler visitors -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</head>
<body style="background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box;">
  <div style="text-align:center;max-width:560px;">
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0 0 10px 0;">${safeTitle}</h1>
    <p style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 24px 0;">${safeDesc}</p>
    <a href="${safeUrl}" style="display:inline-block;padding:12px 28px;background:#e50914;color:#fff;text-decoration:none;border-radius:9999px;font-weight:700;font-size:14px;transition:opacity 0.2s;">Open in StreamVerse</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=7200, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}

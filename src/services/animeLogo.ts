// Service to fetch official TVDB ClearLogo for Anime using the dynamic API

const logoCache: Record<string | number, string | null> = {
  195516: "https://artworks.thetvdb.com/banners/v4/series/431162/clearlogo/660f5238334b2.png",
  189046: "https://artworks.thetvdb.com/banners/v4/series/305089/clearlogo/611be52a428ea.png",
  21: "https://artworks.thetvdb.com/banners/series/81797/icons/5eee2a0450c0e.jpg",
  178789: "https://artworks.thetvdb.com/banners/v4/series/371310/clearlogo/611e10939affb.png",
  180136: "https://artworks.thetvdb.com/banners/v4/series/453028/clearlogo/6a5124c21ca8a.png",
  182205: "https://artworks.thetvdb.com/banners/v4/series/352408/icons/60e89458acaf4.png",
  159042: "https://artworks.thetvdb.com/banners/v4/series/410378/clearlogo/62f3d54438534.png",
  161645: "https://artworks.thetvdb.com/banners/v4/series/431162/clearlogo/660f5238334b2.png",
  16498: "https://artworks.thetvdb.com/banners/v4/series/267440/clearlogo/611bc029705a3.png",
  101922: "https://artworks.thetvdb.com/banners/v4/series/358587/clearlogo/611e155c8da81.png",
  113415: "https://artworks.thetvdb.com/banners/v4/series/388273/clearlogo/611e16f39faec.png",
  1535: "https://artworks.thetvdb.com/banners/v4/series/79465/clearlogo/611bc6488d5e8.png",
  21459: "https://artworks.thetvdb.com/banners/v4/series/305288/clearlogo/611e19488a0b3.png",
  11061: "https://artworks.thetvdb.com/banners/v4/series/252322/clearlogo/611bc19e5de6e.png",
  21087: "https://artworks.thetvdb.com/banners/v4/series/293088/clearlogo/611e1bd766f6e.png",
  20605: "https://artworks.thetvdb.com/banners/v4/series/281630/clearlogo/611bc32e5de8e.png",
  5114: "https://artworks.thetvdb.com/banners/v4/series/85249/clearlogo/611bc21c17fae.png",
  20: "https://artworks.thetvdb.com/banners/v4/series/78857/clearlogo/611e15112fa3a.png"
};

const pendingPromises = new Map<number | string, Promise<string | null>>();

export async function fetchAnimeLogo(animeId: number | string): Promise<string | null> {
  if (!animeId) return null;

  if (logoCache[animeId] !== undefined) {
    return logoCache[animeId];
  }

  // Check sessionStorage
  try {
    const cached = sessionStorage.getItem(`anime_logo_${animeId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      logoCache[animeId] = parsed;
      return parsed;
    }
  } catch (e) {
    // ignore
  }

  if (pendingPromises.has(animeId)) {
    return pendingPromises.get(animeId)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/anime/logo?id=${animeId}`);
      if (!res.ok) {
        logoCache[animeId] = null;
        return null;
      }
      const data = await res.json();
      const logo = data?.clearLogo || null;
      logoCache[animeId] = logo;
      try {
        sessionStorage.setItem(`anime_logo_${animeId}`, JSON.stringify(logo));
      } catch (e) {}
      return logo;
    } catch (err) {
      console.warn(`Could not load logo for anime ${animeId}:`, err);
      logoCache[animeId] = null;
      return null;
    } finally {
      pendingPromises.delete(animeId);
    }
  })();

  pendingPromises.set(animeId, promise);
  return promise;
}

export function getCachedAnimeLogo(animeId: number | string): string | null {
  return logoCache[animeId] || null;
}

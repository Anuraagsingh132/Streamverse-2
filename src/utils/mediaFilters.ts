import { MediaItem } from '../types/media';

/**
 * Filters a raw list of media items to ensure only items with valid image backdrops are kept,
 * and merges them with curated fallback items so the leading positions preserve recognizable
 * CinemaOS layout and branding while enriching the remaining slots from live TMDB data.
 *
 * @param items Raw media items received from TMDB or external API.
 * @param fallback Curated fallback media items to preserve in initial positions.
 * @param maxItems Maximum total items to return (defaults to 15).
 * @returns Combined, deduplicated media items list with valid backdrops.
 */
export function mergeValidMediaWithFallback(
  items: MediaItem[] | undefined,
  fallback: MediaItem[],
  maxItems: number = 15
): MediaItem[] {
  if (!items || items.length === 0) return fallback.slice(0, maxItems);
  const valid = items.filter((i) => Boolean(i.backdrop_path && i.backdrop_path.trim() !== ''));
  if (valid.length === 0) return fallback.slice(0, maxItems);

  // Preserve curated logo_path/title_logo for items where TMDB list response lacks logos
  const enrichedValid = valid.map((item) => {
    if (!item.logo_path && !item.title_logo) {
      const match = fallback.find(
        (f) => String(f.id) === String(item.id) || f.title.toLowerCase() === item.title.toLowerCase()
      );
      if (match && (match.logo_path || match.title_logo)) {
        return {
          ...item,
          logo_path: match.logo_path || item.logo_path,
          title_logo: match.title_logo || item.title_logo
        };
      }
    }
    return item;
  });

  // Fresh live updated items take full priority in their actual ranking order
  const merged = [
    ...enrichedValid,
    ...fallback.filter((f) => !valid.some((v) => String(v.id) === String(f.id)))
  ];
  return merged.slice(0, maxItems);
}

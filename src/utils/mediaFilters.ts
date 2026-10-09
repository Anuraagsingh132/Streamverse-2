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
  if (!items || items.length === 0) return fallback;
  const valid = items.filter((i) => Boolean(i.backdrop_path && i.backdrop_path.trim() !== ''));
  const leadingFallback = fallback.slice(0, 4);
  const merged = [
    ...leadingFallback,
    ...valid.filter((v) => !leadingFallback.some((f) => f.id === v.id))
  ];
  return merged.slice(0, maxItems);
}

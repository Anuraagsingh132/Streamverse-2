/**
 * Shared image resolution and CDN optimization utilities.
 * Ensures consistent fallback handling and responsive image sizing across rails and cards.
 */

export const FALLBACK_BACKDROP =
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=1280&auto=format&fit=crop';

/**
 * Optimizes TMDB image URLs to target appropriate CDN dimensions.
 *
 * @param url Raw image URL.
 * @param target Sizing target ('poster' for 2:3 vertical cards, 'backdrop' for 16:9 horizontal rails).
 * @returns Optimized image URL with fallback.
 */
export function optimizeTmdbImage(
  url: string | undefined | null,
  target: 'poster' | 'backdrop' = 'backdrop'
): string {
  if (!url) return FALLBACK_BACKDROP;

  if (url.includes('image.tmdb.org/t/p/')) {
    if (target === 'poster') {
      return url.replace(/\/t\/p\/(original|w1280|w780)\//, '/t/p/w500/');
    }
    return url.replace(/\/t\/p\/(original|w1280)\//, '/t/p/w780/');
  }

  return url;
}

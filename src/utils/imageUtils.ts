/**
 * Shared image resolution and CDN optimization utilities.
 * Ensures consistent fallback handling and responsive image sizing across rails and cards.
 */

export const FALLBACK_BACKDROP =
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&q=75&auto=format&fit=crop';

export const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=400&q=75&auto=format&fit=crop';

export type TmdbImageTarget = 'poster' | 'backdrop' | 'card' | 'thumb';

/**
 * Optimizes TMDB image URLs to target appropriate CDN dimensions.
 *
 * @param url Raw image URL.
 * @param target Sizing target ('poster' for 2:3 vertical cards, 'card' for horizontal rails, 'backdrop' for full hero headers, 'thumb' for small Up Next thumbnails).
 * @returns Optimized image URL with fallback.
 */
export function optimizeTmdbImage(
  url: string | undefined | null,
  target: TmdbImageTarget = 'backdrop'
): string {
  if (!url) return target === 'poster' ? FALLBACK_POSTER : FALLBACK_BACKDROP;

  if (url.includes('image.tmdb.org/t/p/')) {
    if (target === 'poster' || target === 'card') {
      return url.replace(/\/t\/p\/(original|w1280|w780|w500)\//, '/t/p/w342/');
    }
    if (target === 'thumb') {
      return url.replace(/\/t\/p\/(original|w1280|w780|w500)\//, '/t/p/w300/');
    }
    return url.replace(/\/t\/p\/(original|w1280)\//, '/t/p/w780/');
  }

  return url;
}

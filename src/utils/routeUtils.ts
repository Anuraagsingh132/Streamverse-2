/**
 * Route to semantic canonical URL path mapping helper.
 * Ensures consistent canonical URL targets across Navbar, Footer, MobileNav, and Sitemap.
 */
export function getRouteHref(route: string): string {
  switch (route) {
    case 'home':
      return '/';
    case 'movie':
    case 'movies':
      return '/movies';
    case 'tv':
      return '/tv';
    case 'anime':
      return '/anime';
    case 'ai':
    case 'discover':
    case 'search':
      return '/ai';
    case 'providers':
      return '/providers';
    case 'livesports':
    case 'sports':
      return '/sports';
    case 'music':
      return '/music';
    case 'watchlist':
    case 'continue-watching':
      return '/watchlist';
    case 'settings':
      return '/settings';
    default:
      return route.startsWith('/') ? route : `/${route}`;
  }
}

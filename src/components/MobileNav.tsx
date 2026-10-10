import React from 'react';
import { motion } from 'motion/react';
import { 
  House, 
  Film, 
  Tv, 
  Cat, 
  Volleyball, 
  Search, 
  LayoutGrid 
} from 'lucide-react';
import { getRouteHref } from '../utils/routeUtils';

interface MobileNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentRoute,
  onNavigate,
  onOpenSearch
}) => {
  const items = [
    { label: 'Home', route: 'home', icon: House, slot: 0 },
    { label: 'Movies', route: 'movie', icon: Film, slot: 1 },
    { label: 'TV', route: 'tv', icon: Tv, slot: 2 },
    { label: 'Anime', route: 'anime', icon: Cat, slot: 3 },
    { label: 'Sports', route: 'livesports', icon: Volleyball, slot: 4 },
    { label: 'Search', route: 'search', icon: Search, slot: 5, action: onOpenSearch },
    { label: 'More', route: 'settings', icon: LayoutGrid, slot: 6 },
  ];

  const prefetchMobileRoute = (route: string) => {
    switch (route) {
      case 'home':
        import('../pages/HomePage');
        break;
      case 'movie':
        import('../pages/MoviesPage');
        break;
      case 'tv':
        import('../pages/TVShowsPage');
        break;
      case 'anime':
        import('../pages/AnimePage');
        break;
      case 'livesports':
        import('../pages/LiveSportsPage');
        break;
      case 'settings':
        import('../pages/SettingsPage');
        break;
    }
  };

  return (
    <div 
      className="fixed inset-x-3 z-40 lg:hidden" 
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <nav 
        className="relative flex h-[58px] items-center overflow-hidden rounded-2xl border border-border bg-background/20 shadow-lg backdrop-blur-xl" 
        aria-label="Mobile navigation"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          const content = (
            <>
              <span className="relative z-20 flex h-full w-full items-center justify-center">
                <Icon 
                  className={`transition duration-200 ${
                    isActive ? 'text-foreground' : 'text-foreground/38'
                  }`}
                  style={{ width: '19px', height: '19px' }}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
              </span>
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-indicator"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  aria-hidden="true" 
                  className="pointer-events-none absolute inset-0 z-10 p-1"
                >
                  <div 
                    className="h-full w-full rounded-xl bg-foreground/10 backdrop-blur-md border border-white/10"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                  />
                  <div className="absolute inset-x-3 top-1 h-px rounded-full bg-foreground/20" />
                </motion.div>
              )}
            </>
          );

          if (item.action) {
            return (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                key={item.label}
                data-slot={item.slot}
                aria-label={item.label}
                onClick={item.action}
                className="relative flex flex-1 h-full items-center justify-center active:opacity-50 transition-opacity duration-100 cursor-pointer"
              >
                {content}
              </motion.button>
            );
          }

          return (
            <motion.a
              href={getRouteHref(item.route)}
              whileTap={{ scale: 0.92 }}
              key={item.label}
              data-slot={item.slot}
              aria-label={item.label}
              onTouchStart={() => prefetchMobileRoute(item.route)}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.route);
              }}
              className="relative flex flex-1 h-full items-center justify-center active:opacity-50 transition-opacity duration-100 cursor-pointer"
            >
              {content}
            </motion.a>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;

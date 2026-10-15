import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  House, 
  Film, 
  Tv, 
  Cat, 
  LayoutGrid,
  Volleyball, 
  Search, 
  Tv2,
  Bookmark,
  Settings,
  X,
  ChevronRight
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Smooth scroll-direction reaction: hide gently on scroll down, snap back on scroll up
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY <= 60) {
            setIsVisible(true);
          } else if (currentY > lastScrollY.current + 8) {
            // Scrolling down -> hide
            setIsVisible(false);
          } else if (currentY < lastScrollY.current - 8) {
            // Scrolling up -> show
            setIsVisible(true);
          }
          lastScrollY.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 5 Capped Primary Mobile Tabs with Labels
  const primaryTabs = [
    { label: 'Home', route: 'home', icon: House },
    { label: 'Movies', route: 'movie', icon: Film },
    { label: 'TV', route: 'tv', icon: Tv },
    { label: 'Anime', route: 'anime', icon: Cat },
    { label: 'More', isAction: true, icon: LayoutGrid },
  ];

  // Secondary Items housed cleanly inside the "More" Drawer
  const moreItems = [
    { 
      label: 'Search', 
      description: 'Find movies, series & anime', 
      icon: Search, 
      action: () => {
        setIsMoreOpen(false);
        onOpenSearch();
      }
    },
    { 
      label: 'Live Sports', 
      description: 'Live match streams & events', 
      icon: Volleyball, 
      route: 'livesports'
    },
    { 
      label: 'Providers', 
      description: 'Netflix, Disney+, HBO, Apple TV+', 
      icon: Tv2, 
      route: 'providers'
    },
    { 
      label: 'Watchlist', 
      description: 'Your saved favorites & queue', 
      icon: Bookmark, 
      route: 'watchlist'
    },
    { 
      label: 'Settings', 
      description: 'Playback, audio & preferences', 
      icon: Settings, 
      route: 'settings'
    },
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
      case 'providers':
      case 'watchlist':
        import('../pages/ComingSoonPage');
        break;
      case 'settings':
        import('../pages/SettingsPage');
        break;
    }
  };

  return (
    <>
      {/* Apple Liquid Glass Floating Tab Bar (Strictly Mobile Only: lg:hidden) */}
      <motion.div 
        className="fixed z-40 lg:hidden pointer-events-auto" 
        style={{ 
          left: '14px', 
          right: '14px', 
          bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' 
        }}
        animate={{ 
          y: isVisible || isMoreOpen ? 0 : 88,
          opacity: isVisible || isMoreOpen ? 1 : 0
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      >
        <nav 
          className="liquid-glass-bar" 
          aria-label="Mobile navigation"
        >
          {/* Diagonal sheen reflection across the full glass pill */}
          <div className="liquid-glass-sheen" aria-hidden="true" />

          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const isTabActive = !item.isAction && (
              currentRoute === item.route ||
              (item.route === 'movie' && currentRoute === 'movies') ||
              (item.route === 'anime' && currentRoute === 'anime-details')
            );
            const isMoreActive = item.isAction && isMoreOpen;
            const isActive = isTabActive || isMoreActive;

            const content = (
              <div className="relative flex flex-col items-center justify-center w-full h-full pt-1 pb-1 z-10">
                <span className="relative flex items-center justify-center">
                  <Icon 
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-white/60'
                    }`}
                    style={{ width: '22px', height: '22px' }}
                    strokeWidth={isActive ? 2.0 : 1.75}
                  />
                </span>
                <span 
                  className={`relative mt-1 text-[11px] leading-tight tracking-tight transition-colors duration-200 ${
                    isActive ? 'text-white font-semibold' : 'text-white/60 font-medium'
                  }`}
                >
                  {item.label}
                </span>

                {/* Sliding Glass Lens behind the active tab */}
                {isActive && (
                  <motion.div 
                    layoutId="liquid-glass-lens"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    aria-hidden="true" 
                    className="pointer-events-none absolute inset-0 liquid-glass-lens -z-10"
                  >
                    {/* Top specular highlight edge on the lens */}
                    <div className="absolute inset-x-3.5 top-0 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-white/85 to-transparent" />
                  </motion.div>
                )}
              </div>
            );

            if (item.isAction) {
              return (
                <button
                  type="button"
                  key={item.label}
                  aria-label="More navigation options"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className="relative flex flex-col items-center justify-center h-full w-full select-none cursor-pointer [-webkit-tap-highlight-color:transparent] active:scale-[0.96] transition-transform duration-100"
                >
                  {content}
                </button>
              );
            }

            return (
              <a
                href={getRouteHref(item.route!)}
                key={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onTouchStart={() => prefetchMobileRoute(item.route!)}
                onClick={(e) => {
                  e.preventDefault();
                  setIsMoreOpen(false);
                  onNavigate(item.route!);
                }}
                className="relative flex flex-col items-center justify-center h-full w-full select-none cursor-pointer [-webkit-tap-highlight-color:transparent] active:scale-[0.96] transition-transform duration-100"
              >
                {content}
              </a>
            );
          })}
        </nav>
      </motion.div>

      {/* Slide-Up "More" Sheet Modal for Overflow Items */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Bottom Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-zinc-950/95 p-5 shadow-[0_-12px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
              style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Drag Handle Indicator */}
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

              {/* Sheet Header */}
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Explore More</h3>
                  <p className="text-xs text-white/50">Browse all features & stream sections</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/15 hover:text-white active:scale-95 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = item.route && currentRoute === item.route;

                  const rowContent = (
                    <div className="flex items-center gap-3.5">
                      <div className={`flex h-10 w-10 min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-xl border ${
                        isCurrent 
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-400' 
                          : 'border-white/10 bg-white/5 text-white/80 group-hover:bg-white/10 group-hover:text-white'
                      }`}>
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white leading-tight">
                          {item.label}
                        </div>
                        <div className="mt-0.5 text-xs text-white/45 truncate">
                          {item.description}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
                    </div>
                  );

                  if (item.action) {
                    return (
                      <button
                        type="button"
                        key={item.label}
                        onClick={item.action}
                        className="group w-full min-h-[48px] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.08] active:scale-[0.98] cursor-pointer [-webkit-tap-highlight-color:transparent]"
                      >
                        {rowContent}
                      </button>
                    );
                  }

                  return (
                    <a
                      href={getRouteHref(item.route!)}
                      key={item.label}
                      onTouchStart={() => prefetchMobileRoute(item.route!)}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMoreOpen(false);
                        onNavigate(item.route!);
                      }}
                      className="group block w-full min-h-[48px] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.08] active:scale-[0.98] cursor-pointer [-webkit-tap-highlight-color:transparent]"
                    >
                      {rowContent}
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;

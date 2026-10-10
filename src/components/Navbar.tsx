import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clapperboard, 
  House, 
  Film, 
  Tv, 
  Cat, 
  Sparkles, 
  Music, 
  ChevronDown, 
  Search, 
  Sun, 
  Moon, 
  CircleUser,
  Compass,
  Radio,
  Bookmark,
  Settings,
  History,
  Tv2
} from 'lucide-react';
import { getRouteHref } from '../utils/routeUtils';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
  watchlistCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onOpenSearch,
  watchlistCount
}) => {
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('streamverse_theme') !== 'light';
    } catch {
      return true;
    }
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsBrowseOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      localStorage.setItem('streamverse_theme', nextDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to persist theme preference:', e);
    }
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navLinks = [
    { label: 'Home', route: 'home', icon: House },
    { label: 'Movies', route: 'movie', icon: Film },
    { label: 'TV Shows', route: 'tv', icon: Tv },
    { label: 'Anime', route: 'anime', icon: Cat },
    { label: 'AI Search', route: 'ai', icon: Sparkles },
    { label: 'Music', route: 'music', icon: Music },
  ];

  const browseItems = [
    { label: 'Discover', route: 'discover', icon: Compass, description: 'Filter & explore titles' },
    { label: 'Providers', route: 'providers', icon: Tv2, description: 'Browse by streaming service' },
    { label: 'Live Sports', route: 'livesports', icon: Radio, description: 'Live sports streams' },
    { label: 'Continue Watching', route: 'continue-watching', icon: History, description: 'Pick up where you left off' },
    { label: `Watchlist (${watchlistCount})`, route: 'watchlist', icon: Bookmark, description: 'Saved movies & shows' },
    { label: 'Settings', route: 'settings', icon: Settings, description: 'Preferences & appearance' },
  ];

  // Prefetch route chunks during mouse hover or keyboard focus before click occurs
  const prefetchRoute = (route: string) => {
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
      case 'ai':
        import('../pages/AISearchPage');
        break;
      case 'music':
        import('../pages/MusicPage');
        break;
      case 'livesports':
        import('../pages/LiveSportsPage');
        break;
      case 'providers':
        import('../pages/ProvidersPage');
        break;
      case 'watchlist':
        import('../pages/WatchlistPage');
        break;
      case 'settings':
        import('../pages/SettingsPage');
        break;
    }
  };

  return (
    <header className="fixed left-1/2 top-3 sm:top-4 z-[100] -translate-x-1/2 rounded-full border border-white/10 bg-[#060812]/92 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-200">
      <div className="flex h-14 items-center px-2.5 sm:px-3 gap-1">
        {/* Brand Logo Link */}
        <motion.a
          href={getRouteHref('home')}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          onMouseEnter={() => prefetchRoute('home')}
          onFocus={() => prefetchRoute('home')}
          aria-label="Streamverse Home"
          title="Streamverse Home"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/75 hover:text-white hover:bg-white/10 transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <Clapperboard className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </motion.a>

        {/* Left Divider (Desktop) */}
        <div className="hidden lg:block h-5 w-[1px] bg-white/10 mx-1 shrink-0" aria-hidden="true" />

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route || (item.route === 'anime' && currentRoute === 'anime-details');
            return (
              <a
                key={item.route}
                href={getRouteHref(item.route)}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.route);
                }}
                onMouseEnter={() => prefetchRoute(item.route)}
                onFocus={() => prefetchRoute(item.route)}
                className={`relative inline-flex h-10 items-center gap-2 px-3.5 rounded-full text-sm whitespace-nowrap transition duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                  isActive
                    ? 'bg-white/[0.08] ring-1 ring-inset ring-white/10 text-white font-medium shadow-sm'
                    : 'text-white/65 hover:text-white hover:bg-white/5 font-normal bg-transparent ring-0 border-0 shadow-none'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-white/65'}`} strokeWidth={1.5} />
                <span>{item.label}</span>
              </a>
            );
          })}

          {/* Browse Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsBrowseOpen(!isBrowseOpen)}
              onMouseEnter={() => {
                prefetchRoute('providers');
                prefetchRoute('livesports');
              }}
              className={`relative inline-flex h-10 items-center gap-1.5 px-3.5 rounded-full text-sm whitespace-nowrap transition duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                isBrowseOpen 
                  ? 'bg-white/[0.08] ring-1 ring-inset ring-white/10 text-white font-medium shadow-sm' 
                  : 'text-white/65 hover:text-white hover:bg-white/5 font-normal bg-transparent ring-0 border-0 shadow-none'
              }`}
            >
              <span>Browse</span>
              <ChevronDown className={`h-3.5 w-3.5 opacity-65 transition-transform duration-200 ${isBrowseOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </button>

            <AnimatePresence>
              {isBrowseOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -2 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-2xl z-50 origin-top-left"
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Discover More
                  </div>
                  <div className="mx-1 my-1.5 h-px bg-white/10" />
                  {browseItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.route}
                        href={getRouteHref(item.route)}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(item.route);
                          setIsBrowseOpen(false);
                        }}
                        onMouseEnter={() => prefetchRoute(item.route)}
                        onFocus={() => prefetchRoute(item.route)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/10 transition group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/70 group-hover:text-white">
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-none text-white">{item.label}</p>
                          <p className="mt-0.5 text-[11px] text-white/40 truncate">{item.description}</p>
                        </div>
                      </a>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right Divider (Desktop) */}
        <div className="hidden lg:block h-5 w-[1px] bg-white/10 mx-1 shrink-0" aria-hidden="true" />

        {/* Right Section Controls */}
        <div className="flex items-center gap-1">
          {/* Search Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onOpenSearch}
            aria-label="Search"
            title="Search (Ctrl+K)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/10 transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </motion.button>

          {/* Theme Toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/10 transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            {isDark ? (
              <Sun className="h-[18px] w-[18px]" strokeWidth={1.5} />
            ) : (
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.5} />
            )}
          </motion.button>

          {/* Discord Button */}
          <a 
            target="_blank" 
            rel="noopener noreferrer" 
            href="https://discord.gg/38yFnFCJnA"
            aria-label="Join Discord"
            title="Join Discord"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-full"
          >
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/10 transition duration-150 cursor-pointer"
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 15 15" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-[18px] w-[18px]"
              >
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M5.07451 1.82584C5.03267 1.81926 4.99014 1.81825 4.94803 1.82284C4.10683 1.91446 2.82673 2.36828 2.07115 2.77808C2.02106 2.80525 1.97621 2.84112 1.93869 2.88402C1.62502 3.24266 1.34046 3.82836 1.11706 4.38186C0.887447 4.95076 0.697293 5.55032 0.588937 5.98354C0.236232 7.39369 0.042502 9.08728 0.0174948 10.6925C0.0162429 10.7729 0.0351883 10.8523 0.0725931 10.9234C0.373679 11.496 1.02015 12.027 1.66809 12.4152C2.32332 12.8078 3.08732 13.1182 3.70385 13.1778C3.85335 13.1922 4.00098 13.1358 4.10282 13.0255C4.2572 12.8581 4.5193 12.4676 4.71745 12.1643C4.80739 12.0267 4.89157 11.8953 4.95845 11.7901C5.62023 11.9106 6.45043 11.9801 7.50002 11.9801C8.54844 11.9801 9.37796 11.9107 10.0394 11.7905C10.1062 11.8957 10.1903 12.0269 10.2801 12.1643C10.4783 12.4676 10.7404 12.8581 10.8947 13.0255C10.9966 13.1358 11.1442 13.1922 11.2937 13.1778C11.9102 13.1182 12.6742 12.8078 13.3295 12.4152C13.9774 12.027 14.6239 11.496 14.925 10.9234C14.9624 10.8523 14.9813 10.7729 14.9801 10.6925C14.9551 9.08728 14.7613 7.39369 14.4086 5.98354C14.3003 5.55032 14.1101 4.95076 13.8805 4.38186C13.6571 3.82836 13.3725 3.24266 13.0589 2.88402C13.0214 2.84112 12.9765 2.80525 12.9264 2.77808C12.1708 2.36828 10.8907 1.91446 10.0495 1.82284C10.0074 1.81825 9.96489 1.81926 9.92305 1.82584C9.71676 1.85825 9.5391 1.96458 9.40809 2.06355C9.26977 2.16804 9.1413 2.29668 9.0304 2.42682C8.86968 2.61544 8.71437 2.84488 8.61428 3.06225C8.27237 3.03501 7.90138 3.02 7.5 3.02C7.0977 3.02 6.72593 3.03508 6.38337 3.06244C6.28328 2.84501 6.12792 2.61549 5.96716 2.42682C5.85626 2.29668 5.72778 2.16804 5.58947 2.06355C5.45846 1.96458 5.2808 1.85825 5.07451 1.82584ZM11.0181 11.5382C11.0395 11.5713 11.0615 11.6051 11.0838 11.6392C11.2169 11.843 11.3487 12.0385 11.4508 12.1809C11.8475 12.0916 12.352 11.8818 12.8361 11.5917C13.3795 11.2661 13.8098 10.8918 14.0177 10.5739C13.9852 9.06758 13.7993 7.50369 13.4773 6.21648C13.38 5.82759 13.2038 5.27021 12.9903 4.74117C12.7893 4.24326 12.5753 3.82162 12.388 3.5792C11.7376 3.24219 10.7129 2.88582 10.0454 2.78987C10.0308 2.79839 10.0113 2.81102 9.98675 2.82955C9.91863 2.881 9.84018 2.95666 9.76111 3.04945C9.71959 3.09817 9.68166 3.1471 9.64768 3.19449C9.953 3.25031 10.2253 3.3171 10.4662 3.39123C11.1499 3.6016 11.6428 3.89039 11.884 4.212C12.0431 4.42408 12.0001 4.72494 11.788 4.884C11.5759 5.04306 11.2751 5.00008 11.116 4.788C11.0572 4.70961 10.8001 4.4984 10.1838 4.30877C9.58933 4.12585 8.71356 3.98 7.5 3.98C6.28644 3.98 5.41067 4.12585 4.81616 4.30877C4.19988 4.4984 3.94279 4.70961 3.884 4.788C3.72494 5.00008 3.42408 5.04306 3.212 4.884C2.99992 4.72494 2.95694 4.42408 3.116 4.212C3.35721 3.89039 3.85011 3.6016 4.53383 3.39123C4.77418 3.31727 5.04571 3.25062 5.35016 3.19488C5.31611 3.14738 5.27808 3.09831 5.23645 3.04945C5.15738 2.95666 5.07893 2.881 5.01081 2.82955C4.98628 2.81102 4.96674 2.79839 4.95217 2.78987C4.28464 2.88582 3.25999 3.24219 2.60954 3.5792C2.42226 3.82162 2.20825 4.24326 2.00729 4.74117C1.79376 5.27021 1.61752 5.82759 1.52025 6.21648C1.19829 7.50369 1.01236 9.06758 0.97986 10.5739C1.18772 10.8918 1.61807 11.2661 2.16148 11.5917C2.64557 11.8818 3.15003 12.0916 3.5468 12.1809C3.64885 12.0385 3.78065 11.843 3.9138 11.6392C3.93626 11.6048 3.95838 11.5708 3.97996 11.5375C3.19521 11.2591 2.77361 10.8758 2.50064 10.4664C2.35359 10.2458 2.4132 9.94778 2.63377 9.80074C2.85435 9.65369 3.15236 9.71329 3.29941 9.93387C3.56077 10.3259 4.24355 11.0201 7.50002 11.0201C10.7565 11.0201 11.4392 10.326 11.7006 9.93386C11.8477 9.71329 12.1457 9.65369 12.3663 9.80074C12.5869 9.94779 12.6465 10.2458 12.4994 10.4664C12.2262 10.8762 11.8041 11.2598 11.0181 11.5382ZM4.08049 7.01221C4.32412 6.74984 4.65476 6.60162 5.00007 6.59998C5.34538 6.60162 5.67603 6.74984 5.91966 7.01221C6.16329 7.27459 6.30007 7.62974 6.30007 7.99998C6.30007 8.37021 6.16329 8.72536 5.91966 8.98774C5.67603 9.25011 5.34538 9.39833 5.00007 9.39998C4.65476 9.39833 4.32412 9.25011 4.08049 8.98774C3.83685 8.72536 3.70007 8.37021 3.70007 7.99998C3.70007 7.62974 3.83685 7.27459 4.08049 7.01221ZM9.99885 6.59998C9.65354 6.60162 9.3229 6.74984 9.07926 7.01221C8.83563 7.27459 8.69885 7.62974 8.69885 7.99998C8.69885 8.37021 8.83563 8.72536 9.07926 8.98774C9.3229 9.25011 9.65354 9.39833 9.99885 9.39998C10.3442 9.39833 10.6748 9.25011 10.9184 8.98774C11.1621 8.72536 11.2989 8.37021 11.2989 7.99998C11.2989 7.62974 11.1621 7.27459 10.9184 7.01221C10.6748 6.74984 10.3442 6.60162 9.99885 6.59998Z" 
                fill="currentColor"
              />
            </svg>
          </motion.button>
        </a>

        {/* Account Profile Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          aria-label="Profile"
          title="Profile Settings"
          onClick={() => onNavigate('settings')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/65 hover:text-white hover:bg-white/10 transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <CircleUser className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </motion.button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;


import React from 'react';
import { Clapperboard } from 'lucide-react';
import { getRouteHref } from '../utils/routeUtils';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const links = [
    { label: 'Movies', route: 'movie' },
    { label: 'TV Shows', route: 'tv' },
    { label: 'Anime', route: 'anime' },
    { label: 'Discover', route: 'discover' },
    { label: 'Providers', route: 'providers' },
    { label: 'Live Sports', route: 'livesports' },
    { label: 'Watchlist', route: 'watchlist' },
    { label: 'Settings', route: 'settings' },
  ];

  return (
    <footer className="relative mx-3 mt-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl sm:mx-4 sm:mt-12 mb-[calc(106px+env(safe-area-inset-bottom,0px))] lg:mb-4">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Brand Logo */}
          <a 
            href={getRouteHref('home')}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }} 
            className="group inline-flex items-center gap-2.5 text-left transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
              <Clapperboard className="lucide lucide-clapperboard h-4 w-4 text-primary" />
            </span>
            <span className="text-base font-black tracking-tight text-white">Streamverse</span>
          </a>

          {/* Links: Clean 2-column on mobile, 4-column on tablet, flex row on desktop */}
          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap gap-2.5 sm:gap-x-5 sm:gap-y-2">
            {links.map((link) => (
              <a
                key={link.label}
                href={getRouteHref(link.route)}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(link.route);
                }}
                className="flex items-center min-h-[36px] text-sm text-white/60 transition-colors duration-200 hover:text-white active:opacity-75"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-4 text-[13px] leading-relaxed text-white/80 md:flex-row md:items-center md:justify-between md:gap-6">
          <p className="max-w-2xl">
            Streamverse doesn't host any files — all content comes from third-party providers. Direct DMCA requests to the respective providers.
          </p>
          <p className="shrink-0 text-white/70">
            © 2026 Streamverse · Data by{' '}
            <a 
              href="https://www.themoviedb.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white font-medium hover:underline underline-offset-2"
            >
              TMDB
            </a>{' '}
            &amp;{' '}
            <a 
              href="https://anilist.co" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/80 hover:text-white underline underline-offset-2"
            >
              AniList
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

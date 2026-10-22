import React from 'react';
import { Clapperboard } from 'lucide-react';
import { getRouteHref } from '../utils/routeUtils';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const browseLinks = [
    { label: 'Movies', route: 'movie' },
    { label: 'TV Shows', route: 'tv' },
    { label: 'Anime', route: 'anime' },
    { label: 'Live TV & Sports', route: 'livesports' },
    { label: 'Discover', route: 'discover' },
    { label: 'Providers', route: 'providers' },
  ];

  const accountLinks = [
    { label: 'Home', route: 'home' },
    { label: 'Watchlist', route: 'watchlist' },
    { label: 'Settings', route: 'settings' },
  ];

  return (
    <footer 
      className="relative mt-20 border-t border-white/10 bg-black/60 backdrop-blur-2xl footer-mobile-spacer"
    >
      {/* Top ambient highlight line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-14 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">
          {/* Brand & Mission column */}
          <div className="md:col-span-5 lg:col-span-6 space-y-4">
            <a 
              href={getRouteHref('home')}
              onClick={(e) => {
                e.preventDefault();
                onNavigate('home');
              }} 
              className="group inline-flex items-center gap-3 text-left transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-black/40 transition-colors group-hover:border-primary/50 group-hover:bg-primary/15">
                <Clapperboard className="h-5 w-5 text-primary" />
              </span>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">Streamverse</span>
            </a>
            
            <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
              Cinematic streaming destination for movies, television shows, anime, and 24/7 live sports coverage worldwide.
            </p>
          </div>

          {/* Grouped Links: Browse & Account */}
          <div className="md:col-span-7 lg:col-span-6 grid grid-cols-2 gap-8 sm:gap-12">
            {/* Browse Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
                Browse
              </h3>
              <ul className="space-y-2.5">
                {browseLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={getRouteHref(link.route)}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(link.route);
                      }}
                      className="inline-flex items-center text-[15px] font-medium text-zinc-300 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded py-0.5"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account & Library Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
                Account
              </h3>
              <ul className="space-y-2.5">
                {accountLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={getRouteHref(link.route)}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(link.route);
                      }}
                      className="inline-flex items-center text-[15px] font-medium text-zinc-300 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded py-0.5"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer & Legal Notice */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs sm:text-sm text-zinc-400 leading-relaxed">
          <p className="max-w-2xl">
            Streamverse does not host any files on its servers. All contents are provided by non-affiliated third parties. Direct DMCA inquiries to the relevant host providers.
          </p>
          <p className="shrink-0 text-zinc-400">
            © 2026 Streamverse · Powered by{' '}
            <a 
              href="https://www.themoviedb.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white font-medium hover:underline underline-offset-4"
            >
              TMDB
            </a>{' '}
            &amp;{' '}
            <a 
              href="https://anilist.co" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white font-medium hover:underline underline-offset-4"
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

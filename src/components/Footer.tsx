import React from 'react';
import { Clapperboard } from 'lucide-react';

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
    <footer className="relative mx-3 mb-24 mt-12 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl sm:mx-4 lg:mb-4">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Brand Logo */}
          <button 
            onClick={() => onNavigate('home')} 
            className="inline-flex items-center gap-2.5 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10">
              <Clapperboard className="lucide lucide-clapperboard h-4 w-4 text-primary" />
            </span>
            <span className="text-base font-black tracking-tight text-white">Streamverse</span>
          </button>

          {/* Links */}
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((link) => (
              <button
                key={link.label}
                onClick={() => onNavigate(link.route)}
                className="text-sm text-white/60 transition hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40 md:flex-row md:items-center md:justify-between md:gap-6">
          <p className="max-w-2xl">
            Streamverse doesn't host any files — all content comes from third-party providers. Direct DMCA requests to the respective providers.
          </p>
          <p className="shrink-0">
            © 2026 Streamverse · Data by{' '}
            <a 
              href="https://www.themoviedb.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/60 hover:text-white"
            >
              TMDB
            </a>{' '}
            &amp;{' '}
            <a 
              href="https://anilist.co" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/60 hover:text-white"
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

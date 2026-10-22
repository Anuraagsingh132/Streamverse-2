import React from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Target,
  Tv,
  RefreshCw
} from 'lucide-react';

// Sport-specific crisp vector SVG icons
const SoccerBallIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="12 7 15 10 14 14 10 14 9 10" />
    <path d="M12 7V2" />
    <path d="M15 10l4.5-2" />
    <path d="M14 14l3.5 3.5" />
    <path d="M10 14l-3.5 3.5" />
    <path d="M9 10L4.5 8" />
  </svg>
);

const BasketballIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2v20" />
    <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
    <path d="M4.93 19.07a10 10 0 0 0 14.14 0" />
  </svg>
);

const FootballIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-45 12 12)" />
    <path d="M8 8l8 8" />
    <path d="M10 10l-1.5 1.5" />
    <path d="M12 12l-1.5 1.5" />
    <path d="M14 14l-1.5 1.5" />
  </svg>
);

const HockeyIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 3l8 13h5a3 3 0 0 0 3-3v-1" />
    <circle cx="18" cy="20" r="2" fill="currentColor" />
  </svg>
);

const CricketIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 19l8-8 3 3-8 8H5v-3z" />
    <path d="M13 11l4-4 2 2-4 4" />
    <circle cx="18" cy="6" r="2" fill="currentColor" />
  </svg>
);

const BoxingGloveIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 10c0-4.4 3.6-8 8-8s8 3.6 8 8c0 3-1.6 5.6-4 7v3H8v-3c-1.2-.7-2-2-2-3.5V10z" />
    <path d="M4 11a3 3 0 0 0 3 3h1" />
    <path d="M8 18h8v3H8z" />
  </svg>
);

export interface SportCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  { id: 'All', label: 'All Feeds', icon: Globe },
  { id: 'Football', label: 'Football', icon: SoccerBallIcon },
  { id: 'Basketball', label: 'Basketball', icon: BasketballIcon },
  { id: 'American Football', label: 'NFL', icon: FootballIcon },
  { id: 'Ice Hockey', label: 'Ice Hockey', icon: HockeyIcon },
  { id: 'Cricket', label: 'Cricket', icon: CricketIcon },
  { id: 'Combat Sports', label: 'Combat', icon: BoxingGloveIcon },
  { id: 'Darts & World Sports', label: 'World Sports', icon: Target },
  { id: '24/7 Channels', label: '24/7 TV', icon: Tv }
];

interface LiveCategoryStripProps {
  selectedSport: string;
  onSelectSport: (sportId: string) => void;
  statusFilter: 'all' | 'live' | 'upcoming';
  onSelectStatus: (status: 'all' | 'live' | 'upcoming') => void;
  liveCount: number;
  upcomingCount: number;
  totalCount: number;
  onRefresh: () => void;
  refreshing: boolean;
  timeAgoText: string;
}

export const LiveCategoryStrip: React.FC<LiveCategoryStripProps> = ({
  selectedSport,
  onSelectSport,
  statusFilter,
  onSelectStatus,
  liveCount,
  upcomingCount,
  totalCount,
  onRefresh,
  refreshing,
  timeAgoText
}) => {
  return (
    <section className="relative pt-2 pb-0 select-none">
      {/* Category Header Row (Aligns with content grid, no clipping) */}
      <div className="px-6 sm:px-10 lg:px-14 max-w-[1600px] mx-auto">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 mb-1.5">
              Browse by sport
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
              Sports &amp; Leagues
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Segmented Toggle: On exact same baseline as heading */}
            <div className="flex h-9 min-h-[36px] items-center rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-xl relative">
              <button
                type="button"
                onClick={() => onSelectStatus('all')}
                className={`relative flex items-center justify-center rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                  statusFilter === 'all'
                    ? 'text-black'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {statusFilter === 'all' && (
                  <motion.div
                    layoutId="sports-status-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-md"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">All ({totalCount})</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectStatus('live')}
                className={`relative flex items-center justify-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                  statusFilter === 'live'
                    ? 'text-black'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {statusFilter === 'live' && (
                  <motion.div
                    layoutId="sports-status-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-md"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      statusFilter === 'live' ? 'bg-red-600' : 'bg-red-500'
                    } animate-pulse shrink-0 inline-block align-middle`}
                  />
                  <span>Live ({liveCount})</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectStatus('upcoming')}
                className={`relative flex items-center justify-center rounded-full px-3.5 py-1 text-xs font-bold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                  statusFilter === 'upcoming'
                    ? 'text-black'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                {statusFilter === 'upcoming' && (
                  <motion.div
                    layoutId="sports-status-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-md"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">Upcoming ({upcomingCount})</span>
              </button>
            </div>

            {/* Clear "Updated just now" Refresh Pill */}
            <div className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 backdrop-blur-xl">
              <span className="text-xs font-semibold text-zinc-300 hidden sm:inline select-none">
                Updated {timeAgoText}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title={`Last updated ${timeAgoText}. Click to refresh feed.`}
                aria-label="Refresh feed"
                className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-rose-400' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Borderless Squircle Icon Strip with filled active highlight & sport-specific icons */}
      <div
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 px-6 sm:px-10 lg:px-14 max-w-[1600px] mx-auto scrollbar-none"
        style={{
          maskImage:
            'linear-gradient(to right, black 0%, black calc(100% - 40px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, black 0%, black calc(100% - 40px), transparent 100%)'
        }}
      >
        {SPORT_CATEGORIES.map((cat) => {
          const isSelected = selectedSport === cat.id;
          const Icon = cat.icon;

          return (
            <motion.button
              key={cat.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => onSelectSport(cat.id)}
              className="group flex w-[68px] sm:w-[76px] shrink-0 flex-col items-center gap-2 cursor-pointer focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
              aria-pressed={isSelected}
            >
              <span
                className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-[20px] sm:rounded-[22px] transition-all duration-300 ${
                  isSelected
                    ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-[#060812] bg-white text-black font-extrabold shadow-[0_4px_24px_rgba(255,255,255,0.4)]'
                    : 'border border-white/10 bg-[#12151E] text-zinc-300 opacity-85 hover:scale-105 hover:opacity-100 hover:text-white hover:border-white/30'
                }`}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <span
                className={`w-full truncate text-center text-xs transition-colors ${
                  isSelected
                    ? 'text-white font-bold'
                    : 'text-zinc-300 font-medium group-hover:text-white'
                }`}
              >
                {cat.label}
              </span>
              {isSelected ? (
                <motion.div
                  layoutId="active-sport-dot"
                  className="h-1 w-3.5 rounded-full bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              ) : (
                <div className="h-1 w-3.5" />
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default LiveCategoryStrip;

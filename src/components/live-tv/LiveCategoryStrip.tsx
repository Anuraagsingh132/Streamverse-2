import React from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Trophy,
  Flame,
  Award,
  Zap,
  Shield,
  Swords,
  Target,
  Tv,
  RefreshCw
} from 'lucide-react';

export interface SportCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SPORT_CATEGORIES: SportCategory[] = [
  { id: 'All', label: 'All Feeds', icon: Globe },
  { id: 'Cricket', label: 'Cricket', icon: Trophy },
  { id: 'Football', label: 'Football', icon: Flame },
  { id: 'Basketball', label: 'Basketball', icon: Award },
  { id: 'American Football', label: 'NFL', icon: Zap },
  { id: 'Ice Hockey', label: 'Ice Hockey', icon: Shield },
  { id: 'Combat Sports', label: 'Combat', icon: Swords },
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
    <section className="relative py-4 select-none">
      {/* Category Header Row (1:1 with Movies Streaming Providers Rail) */}
      <div className="px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-500">
              Browse by sport
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">
              Sports &amp; Leagues
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status Segmented Toggle matching Movies/TV Shows toggle on Movies page */}
            <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl relative">
              <button
                type="button"
                onClick={() => onSelectStatus('all')}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                  statusFilter === 'all'
                    ? 'text-black'
                    : 'text-white/70 hover:text-white'
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
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                  statusFilter === 'live'
                    ? 'text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {statusFilter === 'live' && (
                  <motion.div
                    layoutId="sports-status-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-md"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      statusFilter === 'live' ? 'bg-red-600' : 'bg-red-500'
                    } animate-pulse`}
                  />
                  <span>Live ({liveCount})</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectStatus('upcoming')}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                  statusFilter === 'upcoming'
                    ? 'text-black'
                    : 'text-white/70 hover:text-white'
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

            {/* Compact Refresh & Timestamp Pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 backdrop-blur-xl">
              <span className="text-[11px] font-medium text-white/50 pl-1 pr-1 hidden sm:inline select-none">
                {timeAgoText}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title={`Last updated ${timeAgoText}. Click to refresh feed.`}
                aria-label="Refresh feed"
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-red-400' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Borderless Squircle Icon Strip (Matching Movies ProviderRail) */}
      <div
        className="flex gap-3.5 sm:gap-4.5 overflow-x-auto pb-4 pt-1 px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto scrollbar-none"
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
              className="group flex w-[64px] sm:w-[74px] shrink-0 flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
              aria-pressed={isSelected}
            >
              <span
                className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-[20px] sm:rounded-[22px] transition-all duration-300 ${
                  isSelected
                    ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-[#060812] border-white/40 bg-white/15 text-white shadow-[0_0_22px_rgba(255,255,255,0.2)]'
                    : 'border border-white/10 bg-[#12151E] text-zinc-400 opacity-80 hover:scale-105 hover:opacity-100 hover:text-white hover:border-white/25'
                }`}
              >
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <span
                className={`w-full truncate text-center text-xs transition-colors ${
                  isSelected
                    ? 'text-white font-bold'
                    : 'text-zinc-400 font-medium group-hover:text-white'
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

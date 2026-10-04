import React, { useState, useRef } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';
import { liveTrendingIndiaMovies, liveTrendingIndiaShows } from '../data/cinemaosLiveMatch';

interface TrendingIndiaRowProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onBrowseAll?: () => void;
}

export const TrendingIndiaRow: React.FC<TrendingIndiaRowProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onBrowseAll
}) => {
  const [filterType, setFilterType] = useState<'movie' | 'tv'>('movie');
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = filterType === 'movie' ? liveTrendingIndiaMovies : liveTrendingIndiaShows;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const amount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - amount : scrollLeft + amount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-6 cv-auto">
      {/* Header */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-3.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                TRENDING IN INDIA
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              Trending in India
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Movies / TV Shows Toggle */}
            <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
              <button
                onClick={() => setFilterType('movie')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filterType === 'movie'
                    ? 'bg-white text-black shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setFilterType('tv')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filterType === 'tv'
                    ? 'bg-white text-black shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                TV Shows
              </button>
            </div>

            {onBrowseAll && (
              <button
                onClick={onBrowseAll}
                className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white sm:flex"
              >
                Browse all <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rail */}
      <div className="group/rail relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/90 shadow-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/90 shadow-xl"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-8 pt-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14"
          style={{
            maskImage: 'linear-gradient(to right, black 0%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black 100%)'
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="w-[70vw] shrink-0 sm:w-[280px] lg:w-[310px] 2xl:w-[340px]"
            >
              <MediaCard
                item={item}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                isWatchlist={watchlist.includes(item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingIndiaRow;

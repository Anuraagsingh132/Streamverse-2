import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Play, Plus, Check, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types/media';

interface TopTenRowProps {
  title: string;
  subtitle: string;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onBrowseAll?: () => void;
  typeFilter?: 'movie' | 'tv';
  onTypeFilterChange?: (type: 'movie' | 'tv') => void;
}

import { optimizeTmdbImage } from '../utils/imageUtils';

export const TopTenRow: React.FC<TopTenRowProps> = ({
  title,
  subtitle,
  items,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onBrowseAll,
  typeFilter,
  onTypeFilterChange
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <motion.section
      className="py-6 cv-auto"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-3.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                {subtitle}
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {typeFilter && onTypeFilterChange && (
              <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('movie')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    typeFilter === 'movie'
                      ? 'bg-white text-black shadow'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('tv')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    typeFilter === 'tv'
                      ? 'bg-white text-black shadow'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  TV Shows
                </button>
              </div>
            )}

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

      <div className="group/rail relative">
        {/* Left Arrow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/90 shadow-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>

        {/* Right Arrow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/90 shadow-xl"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>

        <div 
          ref={scrollRef}
          className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-8 pt-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14" 
          style={{
            maskImage: 'linear-gradient(to right, black 0%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black 100%)'
          }}
        >
          {items.slice(0, 10).map((item, idx) => {
            const isSaved = watchlist.includes(item.id);
            return (
              <div 
                key={`${item.id}-${idx}`} 
                className="group/rank relative flex shrink-0 items-start pl-14 sm:pl-16 lg:pl-20"
              >
                {/* Giant Outlined Rank Number */}
                <span 
                  aria-hidden="true" 
                  className="pointer-events-none absolute left-0 top-1/2 -translate-y-[62%] select-none text-[110px] font-black leading-none tracking-tighter text-transparent transition-transform duration-500 group-hover/rank:-translate-x-1 sm:text-[130px] lg:text-[160px]" 
                  style={{
                    WebkitTextStroke: '2px rgba(255,255,255,0.35)',
                    backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent 85%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text'
                  }}
                >
                  {idx + 1}
                </span>

                {/* Card Container */}
                <div className="relative z-10 w-[78vw] sm:w-[300px] lg:w-[330px] 2xl:w-[360px]">
                  <div 
                    onClick={() => onOpenDetails(item)} 
                    onMouseEnter={() => {
                      if (item.media_type === 'anime') {
                        import('../pages/AnimeDetailsPage');
                      } else {
                        import('../pages/DetailsPage');
                      }
                    }}
                    className="group block cursor-pointer"
                  >
                    <div className="card-3d relative rounded-xl">
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                        <img 
                          alt={item.title} 
                          loading={idx < 3 ? "eager" : "lazy"} 
                          decoding="async" 
                          className="object-cover transition-[filter,transform] duration-700 group-hover:scale-105 h-full w-full" 
                          src={optimizeTmdbImage(item.backdrop_path || item.poster_path, 'backdrop')} 
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=1280&auto=format&fit=crop';
                            if (item.poster_path && target.src !== item.poster_path) {
                              target.src = item.poster_path;
                            } else if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                        {/* Add to watchlist button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(item);
                          }}
                          title={isSaved ? "In Watchlist" : "Add to watchlist"} 
                          className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-sm transition duration-200 opacity-0 group-hover:opacity-100 ${
                            isSaved 
                              ? 'bg-primary text-white' 
                              : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>

                        {/* Play button overlay on hover */}
                        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item);
                            }}
                            className="rounded-full bg-white/20 p-3 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110"
                          >
                            <Play className="h-5 w-5 fill-white text-white" />
                          </button>
                        </div>
                      </div>
                      <span className="card-3d-glare" aria-hidden="true" />
                    </div>

                    {/* Card Metadata */}
                    <div className="mt-2 px-0.5">
                      <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">
                        {item.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                          {item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Movie'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.year || 2026}
                        </span>
                        <span className="ml-auto flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {item.vote_average ? item.vote_average.toFixed(1) : '8.0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default TopTenRow;

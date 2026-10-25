import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Play, Plus, Check, Star, ChevronLeft, ChevronRight, Film, Tv } from 'lucide-react';
import { MediaItem } from '../types/media';
import { optimizeTmdbImage, FALLBACK_BACKDROP } from '../utils/imageUtils';

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

const TopTenRowComponent: React.FC<TopTenRowProps> = ({
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
    <section className="py-4" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 397px' }}>
      {/* Header matching user reference image exactly */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm leading-none">|</span>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                {subtitle}
              </p>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {typeFilter && onTypeFilterChange && (
              <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1  relative">
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('movie')}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-semibold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                    typeFilter === 'movie'
                      ? 'text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {typeFilter === 'movie' && (
                    <motion.div
                      layoutId="topten-type-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-md"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5" />
                    Movies
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('tv')}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-semibold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                    typeFilter === 'tv'
                      ? 'text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {typeFilter === 'tv' && (
                    <motion.div
                      layoutId="topten-type-pill"
                      className="absolute inset-0 rounded-full bg-white shadow-md"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Tv className="h-3.5 w-3.5" />
                    TV Shows
                  </span>
                </button>
              </div>
            )}

            {onBrowseAll && (
              <button
                type="button"
                onClick={onBrowseAll}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-semibold text-white/90  transition hover:bg-white/20 hover:text-white cursor-pointer [-webkit-tap-highlight-color:transparent]"
              >
                <span>Browse all</span>
                <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="group/rail relative">
        {/* Left Arrow on Hover */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-[38%] z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white border border-white/20  opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/95 shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>

        {/* Right Arrow on Hover */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-[38%] z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white border border-white/20  opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/95 shadow-2xl cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>

        {/* Cards Row */}
        <div 
          ref={scrollRef}
          className="scrollbar-hide overflow-x-auto scroll-smooth overscroll-x-contain will-change-scroll flex gap-3 sm:gap-4 px-5 pb-6 pt-2 sm:px-8 lg:px-10 xl:px-12 2xl:px-14" 
          /* Pure hardware compositing */
        >
          {items.slice(0, 10).map((item, idx) => {
            const isSaved = watchlist.includes(item.id);
            const rank = idx + 1;

            return (
              <div 
                key={`${item.id}-${idx}`} 
                className="group/rank relative flex shrink-0 items-start pl-12 sm:pl-12 lg:pl-16"
              >
                {/* Giant Outlined Rank Number overlapping the card corner (1:1 with reference image) */}
                <div 
                  aria-hidden="true" 
                  className="pointer-events-none absolute left-0 top-0 flex h-[42vw] sm:h-[163px] lg:h-[180px] 2xl:h-[197px] items-center select-none z-0"
                >
                  <span 
                    className="font-black leading-none tracking-tighter text-transparent select-none text-[110px] sm:text-[145px] lg:text-[170px] 2xl:text-[190px]" 
                    style={{
                      WebkitTextStroke: '2px rgba(255, 255, 255, 0.45)',
                      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    } as React.CSSProperties}
                  >
                    {rank}
                  </span>
                </div>

                {/* Card Container */}
                <div className="relative z-10 w-[74vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]">
                  <div 
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for #${rank} ${item.title}`}
                    onClick={() => onOpenDetails(item)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenDetails(item);
                      }
                    }}
                    onMouseEnter={() => {
                      if (item.media_type === 'anime') {
                        import('../pages/AnimeDetailsPage');
                      } else {
                        import('../pages/DetailsPage');
                      }
                    }}
                    className="group block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    {/* Landscape 16:9 Image */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:border-white/25">
                      <img 
                        alt={item.title} 
                        loading={idx < 4 ? "eager" : "lazy"} 
                        decoding="async" 
                        className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 h-full w-full" 
                        src={optimizeTmdbImage(item.backdrop_path || item.poster_path, 'backdrop')} 
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (item.poster_path && target.src !== item.poster_path) {
                            target.src = item.poster_path;
                          } else if (target.src !== FALLBACK_BACKDROP) {
                            target.src = FALLBACK_BACKDROP;
                          }
                        }}
                      />

                      {/* Subtle Top & Bottom vignette gradient */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

                      {/* Add to Watchlist Button */}
                      <motion.button 
                        type="button"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        aria-label={isSaved ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(item);
                        }}
                        title={isSaved ? "In Watchlist" : "Add to watchlist"} 
                        className={`absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/85 transition-colors duration-200 opacity-0 group-hover:opacity-100 cursor-pointer ${
                          isSaved 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-black/60 text-white hover:bg-black/85'
                        }`}
                      >
                        {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </motion.button>

                      {/* Play Button Overlay on Hover */}
                      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                        <div 
                          className="h-12 w-12 rounded-full bg-black/80 ring-1 ring-white/50 text-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        >
                          <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Card Metadata Below Card (1:1 with Reference Image) */}
                    <div className="mt-2.5 px-0.5">
                      <h3 className="truncate text-sm sm:text-base font-bold leading-tight text-white group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        {/* Tag Pill */}
                        <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/90">
                          {item.media_type === 'tv' ? 'SERIES' : item.media_type === 'anime' ? 'ANIME' : 'MOVIE'}
                        </span>
                        
                        {/* Year */}
                        <span className="text-xs font-medium text-white/60">
                          {item.year || 2026}
                        </span>

                        {/* Rating in gold */}
                        <span className="ml-auto flex items-center gap-1 text-xs sm:text-[13px] font-bold text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{item.vote_average ? item.vote_average.toFixed(1) : '8.0'}</span>
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
    </section>
  );
};

export const TopTenRow = React.memo(TopTenRowComponent, (prev, next) => {
  if (
    prev.title !== next.title ||
    prev.subtitle !== next.subtitle ||
    prev.items !== next.items ||
    prev.typeFilter !== next.typeFilter ||
    prev.onTypeFilterChange !== next.onTypeFilterChange ||
    prev.onPlay !== next.onPlay ||
    prev.onOpenDetails !== next.onOpenDetails
  ) {
    return false;
  }
  if (prev.watchlist !== next.watchlist) {
    const prevSet = new Set(prev.watchlist);
    const nextSet = new Set(next.watchlist);
    const anyChanged = prev.items.slice(0, 10).some((item) => prevSet.has(item.id) !== nextSet.has(item.id));
    if (anyChanged) return false;
  }
  return true;
});
export default TopTenRow;

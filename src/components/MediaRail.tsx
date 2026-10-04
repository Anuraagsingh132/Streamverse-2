import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Play, Plus, Check, Star } from 'lucide-react';
import { MediaItem } from '../types/media';

interface MediaRailProps {
  title: string;
  subtitle: string;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onBrowseAll?: () => void;
  posterAspect?: boolean; // false = 16:9 backdrop, true = 2:3 poster
}

const FALLBACK_BACKDROP = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=1280&auto=format&fit=crop';

const optimizeRailImg = (url: string | undefined, isPoster: boolean): string => {
  if (!url) return FALLBACK_BACKDROP;
  if (url.includes('image.tmdb.org/t/p/')) {
    if (isPoster) {
      return url.replace(/\/t\/p\/(original|w1280|w780)\//, '/t/p/w500/');
    }
    return url.replace(/\/t\/p\/(original|w1280)\//, '/t/p/w780/');
  }
  return url;
};

export const MediaRail: React.FC<MediaRailProps> = ({
  title,
  subtitle,
  items,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onBrowseAll,
  posterAspect = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
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
      {/* Rail Header */}
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

      {/* Rail Track with Hover Nav Arrows */}
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
          {items.map((item, idx) => {
            const isSaved = watchlist.includes(item.id);
            return (
              <div
                key={`${item.id}-${idx}`}
                className={
                  posterAspect
                    ? 'w-[42vw] shrink-0 sm:w-[170px] lg:w-[190px] 2xl:w-[210px]'
                    : 'w-[78vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]'
                }
              >
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
                    <div
                      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 ${
                        posterAspect ? 'aspect-[2/3]' : 'aspect-[16/9]'
                      }`}
                    >
                      <img
                        alt={item.title}
                        loading={idx < 3 ? "eager" : "lazy"}
                        decoding="async"
                        className="object-cover transition-[filter,transform] duration-700 group-hover:scale-105 h-full w-full"
                        src={optimizeRailImg(
                          posterAspect
                            ? (item.poster_path || item.backdrop_path)
                            : (item.backdrop_path || item.poster_path),
                          posterAspect
                        )}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (item.poster_path && target.src !== item.poster_path) {
                            target.src = item.poster_path;
                          } else if (target.src !== FALLBACK_BACKDROP) {
                            target.src = FALLBACK_BACKDROP;
                          }
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                      {/* Add to watchlist button */}
                      <button
                        title={isSaved ? 'In watchlist' : 'Add to watchlist'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(item);
                        }}
                        className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-sm transition duration-200 ${
                          isSaved
                            ? 'opacity-100 bg-rose-600 text-white'
                            : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white hover:bg-black/70'
                        }`}
                      >
                        {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>

                      {/* Hover play button icon */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(item);
                        }}
                        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      >
                        <div className="rounded-full bg-white/20 p-3 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                          <Play className="h-5 w-5 fill-white text-white" />
                        </div>
                      </div>
                    </div>
                    <span className="card-3d-glare" aria-hidden="true" />
                  </div>

                  {/* Metadata */}
                  <div className="mt-2 px-0.5">
                    <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">
                      {item.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                        {item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Movie'}
                      </span>
                      {item.year && <span className="text-[11px] text-muted-foreground">{item.year}</span>}
                      {item.vote_average && (
                        <span className="ml-auto flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      )}
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

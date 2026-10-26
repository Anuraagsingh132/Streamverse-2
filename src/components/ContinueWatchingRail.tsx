import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useContinueWatchingStore, PlaybackRecord } from '../store/useContinueWatchingStore';
import { MediaItem } from '../types/media';
import { optimizeTmdbImage, FALLBACK_BACKDROP } from '../utils/imageUtils';

interface ContinueWatchingRailProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
}

const ContinueWatchingRailComponent: React.FC<ContinueWatchingRailProps> = ({
  onPlay,
  onOpenDetails
}) => {
  const { history, removeRecord } = useContinueWatchingStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter out invalid items, 0% watched, or items with less than 2% progress
  const validHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    const seen = new Set<string>();
    return history.filter((record) => {
      if (!record.progressPercent || record.progressPercent < 2) return false;
      const key = `${record.id}_${record.season || 0}_${record.episode || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [history]);

  if (validHistory.length === 0) {
    return null;
  }

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

  const handlePlayRecord = (record: PlaybackRecord) => {
    const mediaItem: MediaItem = {
      id: String(record.id),
      tmdbId: record.tmdbId ? String(record.tmdbId) : undefined,
      title: record.title,
      media_type: record.media_type,
      poster_path: record.poster_path || '',
      backdrop_path: record.backdrop_path || '',
      overview: '',
      vote_average: 8.0,
      release_date: '',
      genres: []
    };
    onPlay(mediaItem);
  };

  const handleOpenDetails = (record: PlaybackRecord) => {
    const mediaItem: MediaItem = {
      id: String(record.id),
      tmdbId: record.tmdbId ? String(record.tmdbId) : undefined,
      title: record.title,
      media_type: record.media_type,
      poster_path: record.poster_path || '',
      backdrop_path: record.backdrop_path || '',
      overview: '',
      vote_average: 8.0,
      release_date: '',
      genres: []
    };
    onOpenDetails(mediaItem);
  };

  return (
    <section aria-label="Continue Watching" className="relative z-20 py-2 sm:py-3 cv-auto">
      {/* Consistent Section Header matching Top 10 and other rows */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-3.5 w-[3px] rounded-full bg-rose-500" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            Resume playback
          </p>
        </div>
        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
          Continue watching
        </h2>
      </div>

      <div className="group/rail relative">
        {/* Left Scroll Arrow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/90 shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>

        {/* Right Scroll Arrow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/90 shadow-2xl cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>

        {/* Cards Row - Exact same grid, padding, width, and gap as the rows below */}
        <div 
          ref={scrollRef}
          className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-4 pt-1 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 overscroll-x-contain will-change-scroll"
          /* Zero composite mask overhead */
        >
          <AnimatePresence mode="popLayout">
            {validHistory.map((record) => {
              const imageSrc = optimizeTmdbImage(record.backdrop_path || record.poster_path, 'backdrop');
              const isSeries = record.media_type === 'tv' || record.media_type === 'anime';

              // Calculate clean remaining duration if available
              let timeLabel = `${record.progressPercent}% watched`;
              if (record.duration && record.duration > 0 && record.currentTime) {
                const remainingSec = Math.max(0, record.duration - record.currentTime);
                const remainingMin = Math.round(remainingSec / 60);
                if (remainingMin > 0) {
                  timeLabel = `${remainingMin} min left`;
                }
              }

              const subtitleLine = isSeries && record.season !== undefined && record.episode !== undefined
                ? `S${record.season} · E${record.episode} · ${timeLabel}`
                : timeLabel;

              return (
                <div key={`${record.id}_${record.season || 0}_${record.episode || 0}`} className="group relative flex-none w-[74vw] sm:w-[300px] lg:w-[330px] 2xl:w-[360px] transition-transform duration-300">
                  {/* 16:9 Landscape Card with Info on the Image */}
                  <div
                    onClick={() => handlePlayRecord(record)}
                    className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl cursor-pointer transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-white/25 focus-within:ring-2 focus-within:ring-rose-500"
                  >
                    {/* Always a Backdrop Still */}
                    <img
                      src={imageSrc}
                      alt={record.title}
                      loading="lazy"
                      decoding="async"
                      width={500}
                      height={281}
                      className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== FALLBACK_BACKDROP) {
                          target.src = FALLBACK_BACKDROP;
                        }
                      }}
                    />

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none" />

                    {/* Centered Play Button on Hover */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="h-12 w-12 rounded-full bg-white/25 text-white flex items-center justify-center ring-1 ring-white/50 backdrop-blur-md shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Remove (Dismiss) Button at Top-Right on Hover */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      aria-label={`Remove ${record.title} from continue watching`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecord(record.id, record.season, record.episode);
                      }}
                      className="absolute top-2.5 right-2.5 z-30 h-7 w-7 rounded-full bg-black/60 text-white/70 hover:text-white hover:bg-black/90 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer border border-white/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>

                    {/* Info Positioned Directly on the Image */}
                    <div className="absolute inset-x-0 bottom-3 z-10 px-4 pointer-events-none">
                      <p className="text-sm sm:text-base font-bold text-white truncate drop-shadow-md">
                        {record.title}
                      </p>
                      <p className="text-xs font-medium text-white/75 mt-0.5 drop-shadow">
                        {subtitleLine}
                      </p>
                    </div>

                    {/* Clear 4px Progress Bar Along the Very Bottom Edge */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 z-20 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(2, Math.min(100, record.progressPercent))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
export const ContinueWatchingRail = React.memo(ContinueWatchingRailComponent);
export default ContinueWatchingRail;

import React from 'react';
import { motion } from 'motion/react';
import { Play, Star, Plus, Check } from 'lucide-react';
import { MediaItem } from '../types/media';

import { optimizeTmdbImage, FALLBACK_BACKDROP } from '../utils/imageUtils';

interface MediaCardProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  isWatchlist?: boolean;
  onToggleWatchlist?: (item: MediaItem) => void;
}

const MediaCardComponent: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  onOpenDetails,
  isWatchlist = false,
  onToggleWatchlist
}) => {
  const imageSrc = optimizeTmdbImage(item.backdrop_path || item.poster_path, 'card');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenDetails(item);
    }
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      aria-label={`View details for ${item.title}`}
      onClick={() => onOpenDetails(item)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        if (item.media_type === 'anime') {
          import('../pages/AnimeDetailsPage');
        } else {
          import('../pages/DetailsPage');
        }
      }}
      className="group block cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 active:scale-[0.98] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      <div className="card-3d relative rounded-2xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl">
          <img
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 blur-0"
            src={imageSrc}
            onError={(e) => {
              const target = e.currentTarget;
              if (item.poster_path && target.src !== item.poster_path) {
                target.src = item.poster_path;
              } else if (target.src !== FALLBACK_BACKDROP) {
                target.src = FALLBACK_BACKDROP;
              }
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          
          {/* Watchlist button */}
          {onToggleWatchlist && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.82 }}
              aria-label={isWatchlist ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
              title={isWatchlist ? "In Watchlist" : "Add to watchlist"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(item);
              }}
              className={`absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-md transition-[opacity,background-color,border-color] duration-200 opacity-0 group-hover:opacity-100 ${
                isWatchlist 
                  ? 'bg-primary text-white shadow-sm border-primary' 
                  : 'bg-black/60 text-white hover:bg-black/85'
              }`}
            >
              {isWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </motion.button>
          )}

          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-250 ease-out group-hover:opacity-100">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              aria-label={`Play ${item.title}`}
              title={`Play ${item.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onPlay(item);
              }}
              className="h-12 w-12 rounded-full bg-white/25 ring-1 ring-white/50 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-250 ease-out cursor-pointer"
            >
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </motion.button>
          </div>
        </div>
        <span className="card-3d-glare" aria-hidden="true" />
      </div>

      {/* Card Metadata (Raised 1-2px, High Contrast) */}
      <div className="mt-2.5 px-0.5">
        <h3 className="truncate text-sm sm:text-base font-bold leading-tight text-white group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/90">
            {item.media_type === 'tv' ? 'SERIES' : item.media_type === 'anime' ? 'ANIME' : 'MOVIE'}
          </span>
          <span className="text-xs font-medium text-white/60">
            {item.year || 2026}
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs sm:text-[13px] font-bold text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{item.vote_average ? item.vote_average.toFixed(1) : '8.0'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export const MediaCard = React.memo(MediaCardComponent, (prev, next) => {
  return prev.item.id === next.item.id &&
         prev.isWatchlist === next.isWatchlist &&
         prev.item.vote_average === next.item.vote_average &&
         prev.item.title === next.item.title;
});

export default MediaCard;

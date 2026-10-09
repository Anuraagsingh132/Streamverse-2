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
  const imageSrc = optimizeTmdbImage(item.backdrop_path || item.poster_path, 'backdrop');

  return (
    <motion.div 
      onClick={() => onOpenDetails(item)}
      onMouseEnter={() => {
        if (item.media_type === 'anime') {
          import('../pages/AnimeDetailsPage');
        } else {
          import('../pages/DetailsPage');
        }
      }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="group block cursor-pointer will-change-transform"
    >
      <div className="card-3d relative rounded-xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
          <img
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-[filter,transform] duration-700 group-hover:scale-105 blur-0"
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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
          
          {/* Watchlist button */}
          {onToggleWatchlist && (
            <button
              title={isWatchlist ? "In Watchlist" : "Add to watchlist"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist(item);
              }}
              className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-sm transition duration-200 opacity-0 group-hover:opacity-100 ${
                isWatchlist 
                  ? 'bg-primary text-white' 
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              {isWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Hover Play Button Overlay */}
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

      {/* Card Metadata matching cinemaos.tech */}
      <div className="mt-2 px-0.5">
        <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground dark:text-white">
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
            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
            {item.vote_average ? item.vote_average.toFixed(1) : '8.0'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const MediaCard = React.memo(MediaCardComponent, (prev, next) => {
  return prev.item.id === next.item.id &&
         prev.isWatchlist === next.isWatchlist &&
         prev.item.vote_average === next.item.vote_average &&
         prev.item.title === next.item.title;
});

export default MediaCard;

import React from 'react';
import { motion } from 'motion/react';
import { Play, Star } from 'lucide-react';
import { MediaItem } from '../types/media';

import { optimizeTmdbImage, FALLBACK_POSTER } from '../utils/imageUtils';

interface PosterCardProps {
  item: MediaItem;
  onOpenDetails: (item: MediaItem) => void;
  onPlay?: (item: MediaItem) => void;
  showRatingBadge?: boolean;
}

const PosterCardComponent: React.FC<PosterCardProps> = ({
  item,
  onOpenDetails,
  onPlay,
  showRatingBadge = true
}) => {
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '7.5';
  const year = item.year || (item.release_date ? new Date(item.release_date).getFullYear() : 2026);
  const typeLabel = item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Movie';

  const optimizedPosterSrc = optimizeTmdbImage(item.poster_path || item.backdrop_path, 'poster');

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
      className="group/card block w-[140px] flex-none origin-center cursor-pointer sm:w-[160px] lg:w-[180px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.97] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 will-change-transform"
    >
      <div className="card-3d relative rounded-xl">
        <div className="relative isolate aspect-[2/3] overflow-hidden rounded-xl bg-white/5 shadow-xl shadow-black/40">
          <img
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-[transform,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:scale-[1.04] lg:group-hover/card:brightness-50"
            src={optimizedPosterSrc}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== FALLBACK_POSTER) {
                target.src = FALLBACK_POSTER;
              }
            }}
          />

          {/* Top Left Rating Badge */}
          {showRatingBadge && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md transition-opacity duration-300 lg:group-hover/card:opacity-0">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {rating}
            </span>
          )}

          {/* Hover Glare Gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-500 ease-out lg:group-hover/card:opacity-100" />

          {/* Center Hover Action Overlay */}
          <div className="absolute inset-0 hidden translate-y-3 flex-col items-center justify-center p-4 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:translate-y-0 group-hover/card:opacity-100 lg:flex">
            <motion.button
              type="button"
              aria-label={`Play ${item.title}`}
              title={`Play ${item.title}`}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={(e) => {
                if (onPlay) {
                  e.stopPropagation();
                  onPlay(item);
                }
              }}
              className="mb-3 rounded-full bg-white p-3 text-black shadow-lg shadow-white/20 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <Play className="h-5 w-5 fill-current" />
            </motion.button>
            <h3 className="line-clamp-2 text-center text-sm font-bold leading-tight text-white drop-shadow-md">
              {item.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
              <span>{year}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {rating}
              </span>
            </p>
          </div>
        </div>
        <span className="card-3d-glare" aria-hidden="true" />
      </div>

      {/* Underneath Metadata */}
      <div className="mt-2.5 px-0.5">
        <p className="truncate text-sm font-semibold text-white/95">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-white/65">
          {year} · {typeLabel}
        </p>
      </div>
    </div>
  );
};

export const PosterCard = React.memo(PosterCardComponent, (prev, next) => {
  return prev.item.id === next.item.id &&
         prev.item.vote_average === next.item.vote_average &&
         prev.item.title === next.item.title &&
         prev.showRatingBadge === next.showRatingBadge;
});

export default PosterCard;

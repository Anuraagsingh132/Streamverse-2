import React from 'react';
import { motion } from 'motion/react';
import { Play, Star } from 'lucide-react';
import { MediaItem } from '../types/media';

import { optimizeTmdbImage } from '../utils/imageUtils';

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
  const typeLabel = item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Film';

  const optimizedPosterSrc = optimizeTmdbImage(item.poster_path || item.backdrop_path, 'poster');

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
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="group/card block w-[140px] flex-none origin-center cursor-pointer sm:w-[160px] lg:w-[180px] will-change-transform"
    >
      <div className="card-3d relative rounded-xl">
        <div className="relative isolate aspect-[2/3] overflow-hidden rounded-xl bg-white/5 shadow-xl shadow-black/40">
          <img
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 lg:group-hover/card:brightness-50"
            src={optimizedPosterSrc}
          />

          {/* Top Left Rating Badge */}
          {showRatingBadge && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md transition-opacity lg:group-hover/card:opacity-0">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              {rating}
            </span>
          )}

          {/* Hover Glare Gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-500 lg:group-hover/card:opacity-100" />

          {/* Center Hover Action Overlay */}
          <div className="absolute inset-0 hidden translate-y-4 flex-col items-center justify-center p-4 opacity-0 transition duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100 lg:flex">
            <motion.span
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                if (onPlay) {
                  e.stopPropagation();
                  onPlay(item);
                }
              }}
              className="mb-3 rounded-full bg-white p-3 text-black shadow-lg shadow-white/20 transition-transform group-hover/card:scale-110 hover:bg-white/90"
            >
              <Play className="h-5 w-5 fill-current" />
            </motion.span>
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
        <p className="truncate text-[13px] font-semibold text-white/90">
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-white/40">
          {year} · {typeLabel}
        </p>
      </div>
    </motion.div>
  );
};

export const PosterCard = React.memo(PosterCardComponent, (prev, next) => {
  return prev.item.id === next.item.id &&
         prev.item.vote_average === next.item.vote_average &&
         prev.item.title === next.item.title &&
         prev.showRatingBadge === next.showRatingBadge;
});

export default PosterCard;

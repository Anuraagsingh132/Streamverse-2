import React from 'react';
import { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';
import { ChevronRight } from 'lucide-react';

interface MediaGridProps {
  title: string;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onViewAll?: () => void;
  icon?: React.ReactNode;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  title,
  items,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onViewAll,
  icon
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-rose-500">{icon}</span>}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition group"
          >
            <span>View All</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
        {items.map((item, idx) => (
          <MediaCard
            key={`${item.id}-${idx}`}
            item={item}
            onPlay={onPlay}
            onOpenDetails={onOpenDetails}
            isWatchlist={watchlist.includes(item.id)}
            onToggleWatchlist={onToggleWatchlist}
          />
        ))}
      </div>
    </section>
  );
};

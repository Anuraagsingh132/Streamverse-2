import React from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { MediaItem } from '../types/media';
import { allMedia } from '../data/mediaData';
import { MediaCard } from '../components/MediaCard';

interface WatchlistPageProps {
  watchlist: string[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onClearWatchlist: () => void;
  onNavigate: (route: string) => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  watchlist,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  onClearWatchlist,
  onNavigate
}) => {
  const savedItems = allMedia.filter((item) => watchlist.includes(item.id));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 font-bold">
            <Bookmark className="h-6 w-6" />
            <span className="text-xs uppercase tracking-widest">Personal Library</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            My Watchlist
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Keep track of movies, anime, and TV series you want to watch later.
          </p>
        </div>

        {savedItems.length > 0 && (
          <button
            onClick={onClearWatchlist}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Content */}
      {savedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500">
            <Bookmark className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Your watchlist is empty</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Explore trending titles and click the "+" icon on any poster to save it here for later.
            </p>
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition"
          >
            Explore Titles
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {savedItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              isWatchlist={true}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};

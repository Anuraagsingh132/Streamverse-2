import React, { useState, useMemo } from 'react';
import { Bookmark, Trash2, Film, Tv, Cat, Sparkles, AlertTriangle } from 'lucide-react';
import { MediaItem } from '../types/media';
import { allMedia } from '../data/mediaData';
import { MediaCard } from '../components/MediaCard';

interface WatchlistPageProps {
  watchlist: string[];
  savedItems?: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
  onClearWatchlist: () => void;
  onNavigate: (route: string) => void;
}

type FilterCategory = 'all' | 'movie' | 'tv' | 'anime';

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  watchlist,
  savedItems: providedSavedItems,
  onPlay,
  onOpenDetails,
  onToggleWatchlist,
  onClearWatchlist,
  onNavigate
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Resolve saved items from props or fallback to matching allMedia
  const allSavedItems = useMemo(() => {
    if (providedSavedItems && providedSavedItems.length > 0) {
      return providedSavedItems;
    }
    return allMedia.filter((item) => watchlist.includes(item.id));
  }, [providedSavedItems, watchlist]);

  // Counts per category
  const counts = useMemo(() => {
    const movieCount = allSavedItems.filter((i) => i.media_type === 'movie').length;
    const tvCount = allSavedItems.filter((i) => i.media_type === 'tv').length;
    const animeCount = allSavedItems.filter((i) => i.media_type === 'anime').length;
    return {
      all: allSavedItems.length,
      movie: movieCount,
      tv: tvCount,
      anime: animeCount
    };
  }, [allSavedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allSavedItems;
    return allSavedItems.filter((item) => item.media_type === activeFilter);
  }, [allSavedItems, activeFilter]);

  const handleConfirmClear = () => {
    onClearWatchlist();
    setShowClearConfirm(false);
  };

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

        {allSavedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      {allSavedItems.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>All Titles</span>
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
              activeFilter === 'all' ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-400'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('movie')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'movie'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>Movies</span>
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
              activeFilter === 'movie' ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-400'
            }`}>
              {counts.movie}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('tv')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'tv'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            <span>TV Series</span>
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
              activeFilter === 'tv' ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-400'
            }`}>
              {counts.tv}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('anime')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'anime'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Cat className="h-3.5 w-3.5" />
            <span>Anime</span>
            <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
              activeFilter === 'anime' ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-400'
            }`}>
              {counts.anime}
            </span>
          </button>
        </div>
      )}

      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500">
            <Bookmark className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {allSavedItems.length === 0 ? 'Your watchlist is empty' : `No ${activeFilter} titles saved`}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              {allSavedItems.length === 0
                ? 'Explore trending titles and click the "+" icon on any poster to save it here for later.'
                : `You haven't added any ${activeFilter} titles to your watchlist yet.`}
            </p>
          </div>
          {allSavedItems.length === 0 ? (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition cursor-pointer"
            >
              Explore Titles
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
            >
              View All Saved Titles
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {filteredItems.map((item) => (
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

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear entire watchlist?</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-zinc-300">
              Are you sure you want to remove all {allSavedItems.length} saved movies, anime, and series from your personal library?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

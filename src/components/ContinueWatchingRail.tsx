import React from 'react';
import { Play, X, Clock } from 'lucide-react';
import { useContinueWatchingStore, PlaybackRecord } from '../store/useContinueWatchingStore';
import { MediaItem } from '../types/media';
import { optimizeTmdbImage, FALLBACK_BACKDROP } from '../utils/imageUtils';

interface ContinueWatchingRailProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
}

export const ContinueWatchingRail: React.FC<ContinueWatchingRailProps> = ({
  onPlay,
  onOpenDetails
}) => {
  const { history, removeRecord } = useContinueWatchingStore();

  if (!history || history.length === 0) {
    return null;
  }

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
    <section 
      aria-label="Continue Watching" 
      className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-rose-500" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Continue Watching
          </h2>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth">
        {history.map((record) => {
          const imageSrc = optimizeTmdbImage(record.backdrop_path || record.poster_path, 'card');
          const isSeries = record.media_type === 'tv' || record.media_type === 'anime';

          return (
            <div
              key={`${record.id}_${record.season || 0}_${record.episode || 0}`}
              className="group relative flex-none w-[240px] sm:w-[280px] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-white/25 transition-all duration-200 hover:-translate-y-1"
            >
              <div 
                className="relative aspect-[16/9] w-full overflow-hidden cursor-pointer"
                onClick={() => handlePlayRecord(record)}
              >
                <img
                  src={imageSrc}
                  alt={record.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_BACKDROP) {
                      target.src = FALLBACK_BACKDROP;
                    }
                  }}
                />

                {/* Ambient Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Series badge */}
                {isSeries && record.season !== undefined && record.episode !== undefined && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/10">
                    S{record.season} E{record.episode}
                  </div>
                )}

                {/* Dismiss Button */}
                <button
                  type="button"
                  aria-label={`Remove ${record.title} from continue watching`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecord(record.id, record.season, record.episode);
                  }}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white/70 hover:text-white hover:bg-black/90 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                {/* Progress bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${Math.max(5, Math.min(100, record.progressPercent))}%` }}
                  />
                </div>
              </div>

              {/* Title and metadata */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div 
                  className="min-w-0 cursor-pointer"
                  onClick={() => handleOpenDetails(record)}
                >
                  <p className="text-sm font-semibold text-white truncate hover:text-rose-400 transition-colors">
                    {record.title}
                  </p>
                  <p className="text-xs text-white/60">
                    {record.progressPercent}% watched
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

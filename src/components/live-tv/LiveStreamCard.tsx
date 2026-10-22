import React from 'react';
import { motion } from 'motion/react';
import { Play, Radio, Tv, Clock, Layers } from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import { getStreamStatus, getStreamCountdown, formatStreamTime } from '../../services/liveTv';

interface LiveStreamCardProps {
  stream: LiveStream;
  onPlay: (stream: LiveStream) => void;
}

export const LiveStreamCard: React.FC<LiveStreamCardProps> = ({ stream, onPlay }) => {
  const isLive = stream.always_live === 1 || getStreamStatus(stream) === 'live';
  const is247 = stream.always_live === 1 || stream.always_live === true;
  const countdown = getStreamCountdown(stream.starts_at);
  const substreamCount = stream.substreams?.length || 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPlay(stream);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Watch ${stream.name}`}
      onClick={() => onPlay(stream)}
      onKeyDown={handleKeyDown}
      className="group block cursor-pointer transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 active:scale-[0.98] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      <div className="card-3d relative rounded-2xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl">
          {/* Card Thumbnail / Poster */}
          {stream.poster ? (
            <img
              src={stream.poster}
              alt={stream.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
              <Radio className="h-8 w-8 text-zinc-600" />
            </div>
          )}

          {/* Vignette Gradients */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

          {/* Top Status & Broadcaster Badges */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
            {is247 ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white shadow-lg shadow-emerald-500/20 uppercase tracking-wider">
                <Tv className="h-3 w-3" />
                24/7 TV
              </span>
            ) : isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600/95 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white shadow-lg shadow-rose-600/30 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                Live Now
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30 shadow-sm">
                <Clock className="h-3 w-3" />
                {countdown || formatStreamTime(stream.starts_at)}
              </span>
            )}

            {/* Broadcaster Logo / Source Tag */}
            <span className="rounded-full border border-white/20 bg-black/65 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              {stream.source_tag || stream.tag || stream.category_name}
            </span>
          </div>

          {/* Bottom Feeds Badge (when substreams exist) */}
          {substreamCount > 0 && (
            <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
              <span className="flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-600/30 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-rose-200">
                <Layers className="h-2.5 w-2.5" />
                +{substreamCount} Feeds
              </span>
            </div>
          )}

          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-250 ease-out group-hover:opacity-100">
            <motion.div
              whileTap={{ scale: 0.92 }}
              className="h-12 w-12 rounded-full bg-white/25 ring-1 ring-white/50 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-250 ease-out cursor-pointer"
            >
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </motion.div>
          </div>

          <span className="card-3d-glare" aria-hidden="true" />
        </div>
      </div>

      {/* Card Metadata */}
      <div className="mt-2.5 px-0.5 space-y-1">
        <h3 className="truncate text-sm sm:text-base font-bold leading-tight text-white group-hover:text-rose-400 transition-colors">
          {stream.name}
        </h3>
        <div className="flex items-center justify-between text-xs text-white/60">
          <span className="truncate max-w-[70%] font-medium">
            {stream.tag || stream.category_name}
          </span>
          <span className="font-semibold text-zinc-400">
            {is247 ? 'Continuous' : formatStreamTime(stream.starts_at)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamCard;

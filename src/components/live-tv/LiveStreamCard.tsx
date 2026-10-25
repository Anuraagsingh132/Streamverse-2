import React, { useState, useMemo, memo } from 'react';
import { Play } from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import {
  getStreamStatus,
  formatStreamTime,
  parseMatchTeams,
  getStreamThemeColor,
  cleanStreamTitle
} from '../../services/liveTv';

interface LiveStreamCardProps {
  stream: LiveStream;
  onPlay: (stream: LiveStream) => void;
  compactChannel?: boolean;
}

const LiveStreamCardComponent: React.FC<LiveStreamCardProps> = ({
  stream,
  onPlay,
  compactChannel = false
}) => {
  const [imgError, setImgError] = useState(false);
  const is247 = stream.always_live === 1 || stream.always_live === true;
  const status = getStreamStatus(stream);
  const isLive = is247 || status === 'live';

  const matchInfo = useMemo(() => parseMatchTeams(stream.name), [stream.name]);
  const themeColor = useMemo(() => getStreamThemeColor(stream), [stream]);
  const formattedTime = useMemo(() => formatStreamTime(stream.starts_at), [stream.starts_at]);
  const displayTitle = useMemo(
    () => cleanStreamTitle(matchInfo.cleanTitle || stream.name),
    [matchInfo.cleanTitle, stream.name]
  );
  const isDarts = useMemo(
    () => (stream.category_name || '').toLowerCase().includes('dart'),
    [stream.category_name]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPlay(stream);
    }
  };

  // Helper for generating clean team initials
  const getInitials = (teamName?: string) => {
    if (!teamName) return 'VS';
    const words = teamName.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  };

  // League label for meta line 2
  const leagueName = useMemo(() => {
    return is247 || stream.category_name?.toLowerCase().includes('24/7')
      ? 'Channel'
      : stream.category_name || 'Live Sports';
  }, [is247, stream.category_name]);

  // Format short kickoff time for the thumbnail pill
  const shortTime = useMemo(
    () => (formattedTime.includes('·') ? formattedTime.split('·')[1].trim() : formattedTime),
    [formattedTime]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Watch ${displayTitle}`}
      onClick={() => onPlay(stream)}
      onKeyDown={handleKeyDown}
      className="group block cursor-pointer select-none transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl w-full"
    >
      {/* 16:9 Aspect Ratio (or 16:10 for compact channels), 16px radius, unified dark slate #12151E */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#12151E] transition-colors duration-300 group-hover:border-white/30 ${
          compactChannel ? 'aspect-[16/10]' : 'aspect-[16/9]'
        }`}
      >
        {/* Visual Content Layer */}
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          {stream.poster && !imgError ? (
            <img
              src={stream.poster}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              onError={() => {
                React.startTransition(() => {
                  setImgError(true);
                });
              }}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : isDarts ? (
            /* Darts per-event clean tile with dark backdrop */
            <div className="relative flex flex-col items-center justify-center p-6 text-center w-full h-full bg-[#12151E]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                {stream.category_name || 'Darts'}
              </span>
              <h4 className="mt-1 text-sm sm:text-base font-semibold text-white line-clamp-2 px-2">
                {displayTitle}
              </h4>
              <span className="mt-1 text-[11px] text-zinc-400 font-medium">
                {formattedTime}
              </span>
            </div>
          ) : is247 || compactChannel ? (
            /* Channel Fallback Tile: Dark slate base #12151E, clean centered channel name */
            <div className="flex flex-col items-center justify-center p-5 text-center w-full h-full bg-[#12151E]">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase line-clamp-2 px-2 drop-shadow">
                {displayTitle}
              </span>
              <span className="mt-1 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Network Feed
              </span>
            </div>
          ) : matchInfo.isMatch ? (
            /* Match Card: Dual team pattern Logo - VS - Logo with bold VS divider */
            <div className="flex h-full w-full items-center justify-center px-4 gap-3 bg-[#12151E]">
              {/* Team 1 */}
              <div className="flex flex-col items-center text-center w-20">
                <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08]">
                  <span className="text-base sm:text-lg font-black tracking-wider text-white">
                    {getInitials(matchInfo.team1)}
                  </span>
                </div>
                <span className="mt-1.5 text-xs font-semibold text-white/90 truncate w-full">
                  {matchInfo.team1}
                </span>
              </div>

              {/* Clean Bold VS Divider */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-200 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
                  VS
                </span>
                {matchInfo.score && (
                  <span className="mt-1 text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                    {matchInfo.score}
                  </span>
                )}
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center text-center w-20">
                <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08]">
                  <span className="text-base sm:text-lg font-black tracking-wider text-white">
                    {getInitials(matchInfo.team2)}
                  </span>
                </div>
                <span className="mt-1.5 text-xs font-semibold text-white/90 truncate w-full">
                  {matchInfo.team2}
                </span>
              </div>
            </div>
          ) : (
            /* Clean Fallback Tile */
            <div className="flex flex-col items-center justify-center p-5 text-center w-full h-full bg-[#12151E]">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white line-clamp-2 px-2">
                {displayTitle}
              </span>
              <span className="mt-1 text-xs text-zinc-300 font-medium">
                {stream.category_name}
              </span>
            </div>
          )}
        </div>

        {/* Smooth Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Top-Left: Prominent Pill on Thumbnail (LIVE / Time / ENDED / 24/7) */}
        {isLive && !is247 ? (
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
        ) : is247 ? (
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-black/85 border border-white/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              24/7
            </span>
          </div>
        ) : status === 'ended' ? (
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex h-6 items-center rounded-full bg-zinc-850/95 border border-zinc-700 px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 shadow-md">
              ENDED
            </span>
          </div>
        ) : formattedTime ? (
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex h-6 items-center rounded-full bg-black/85 border border-white/20 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              {shortTime}
            </span>
          </div>
        ) : null}

        {/* Hover: Circular 48px Play Button fading in */}
        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-md transition-transform duration-200 group-hover:scale-105">
            <Play className="h-5 w-5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2-Line High-Contrast Metadata Container Below Card Thumbnail */}
      <div className="mt-2.5 px-0.5 space-y-1">
        <p className="text-[14px] sm:text-[15px] font-bold text-white line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors drop-shadow-sm min-h-[2.5rem]">
          {displayTitle}
        </p>
        <p className="text-xs sm:text-[13px] text-zinc-300 font-medium truncate flex items-center gap-1.5">
          <span>{leagueName}</span>
          <span className="text-zinc-500">•</span>
          <span className={isLive && !is247 ? 'text-rose-400 font-semibold' : status === 'ended' ? 'text-zinc-500 font-medium' : 'text-zinc-300'}>
            {isLive ? (is247 ? '24/7 Stream' : 'Live Now') : status === 'ended' ? 'Ended' : formattedTime}
          </span>
        </p>
      </div>
    </div>
  );
};

export const LiveStreamCard = memo(LiveStreamCardComponent);
export default LiveStreamCard;

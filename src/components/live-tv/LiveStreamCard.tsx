import React, { useState } from 'react';
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

export const LiveStreamCard: React.FC<LiveStreamCardProps> = ({
  stream,
  onPlay,
  compactChannel = false
}) => {
  const [imgError, setImgError] = useState(false);
  const is247 = stream.always_live === 1 || stream.always_live === true;
  const status = getStreamStatus(stream);
  const isLive = is247 || status === 'live';
  const matchInfo = parseMatchTeams(stream.name);
  const themeColor = getStreamThemeColor(stream);
  const formattedTime = formatStreamTime(stream.starts_at);
  const displayTitle = cleanStreamTitle(matchInfo.cleanTitle || stream.name);
  const isDarts = (stream.category_name || '').toLowerCase().includes('dart');

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
  const leagueName = is247 || stream.category_name?.toLowerCase().includes('24/7')
    ? 'Channel'
    : stream.category_name || 'Live Sports';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Watch ${displayTitle}`}
      onClick={() => onPlay(stream)}
      onKeyDown={handleKeyDown}
      className="group block cursor-pointer select-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl w-full"
    >
      {/* 16:9 Aspect Ratio (or 16:10 for compact channels), 16px radius, unified dark slate #12151E */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12151E] shadow-lg transition-colors group-hover:border-white/20 ${
          compactChannel ? 'aspect-[16/10]' : 'aspect-[16/9]'
        }`}
      >
        {/* Subtle 15% opacity radial glow behind team logos */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-15"
          style={{
            background: `radial-gradient(circle at center, ${themeColor} 0%, transparent 70%)`
          }}
        />

        {/* Visual Content Layer */}
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          {isDarts ? (
            /* Darts per-event clean tile with dark backdrop */
            <div className="relative flex flex-col items-center justify-center p-6 text-center w-full h-full bg-[#12151E]">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                PDC World Series
              </span>
              <h4 className="mt-1 text-sm sm:text-base font-semibold text-white line-clamp-2 px-2">
                {displayTitle}
              </h4>
              <span className="mt-1 text-[11px] text-zinc-400 font-medium">
                {formattedTime}
              </span>
            </div>
          ) : stream.poster && !imgError ? (
            <img
              src={stream.poster}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
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
            /* Match Card: Dual team pattern Logo - VS - Logo with subtle VS divider */
            <div className="flex h-full w-full items-center justify-center px-4 gap-3 bg-[#12151E]">
              {/* Team 1 */}
              <div className="flex flex-col items-center text-center w-20">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-md backdrop-blur-md">
                  <span className="text-sm font-black tracking-wider text-white">
                    {getInitials(matchInfo.team1)}
                  </span>
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-white/80 truncate w-full">
                  {matchInfo.team1}
                </span>
              </div>

              {/* Clean VS Divider */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  VS
                </span>
                {matchInfo.score && (
                  <span className="mt-1 text-[11px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                    {matchInfo.score}
                  </span>
                )}
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center text-center w-20">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-md backdrop-blur-md">
                  <span className="text-sm font-black tracking-wider text-white">
                    {getInitials(matchInfo.team2)}
                  </span>
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-white/80 truncate w-full">
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
              <span className="mt-1 text-[11px] text-zinc-400 font-medium">
                {stream.category_name}
              </span>
            </div>
          )}
        </div>

        {/* Smooth Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Top-Left: Minimalist Status Badge */}
        {isLive && !is247 ? (
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-rose-600/90 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          </div>
        ) : is247 ? (
          <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-black/60 border border-white/10 px-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
              24/7
            </span>
          </div>
        ) : null}

        {/* Hover: Circular 48px Play Button fading in */}
        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform duration-200 group-hover:scale-105">
            <Play className="h-5 w-5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* Strictly 2 Lines Below Each Card (Matching Movies Typography) */}
      <div className="mt-2 px-0.5 space-y-0.5">
        {/* Line 1: Event/Match Title */}
        <p className="text-sm font-semibold text-white truncate group-hover:text-rose-400 transition-colors">
          {displayTitle}
        </p>

        {/* Line 2: League Name • Start Time */}
        <p className="text-xs text-zinc-400 truncate">
          {leagueName} • {is247 ? 'Linear Network' : formattedTime}
        </p>
      </div>
    </div>
  );
};

export default LiveStreamCard;
import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import {
  getStreamStatus,
  getStreamCountdown,
  formatStreamTime,
  getProviderBadge,
  parseMatchTeams,
  getStreamThemeColor
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
  const countdown = getStreamCountdown(stream.starts_at);
  const provider = getProviderBadge(stream.source_tag, stream.tag);
  const matchInfo = parseMatchTeams(stream.name);
  const themeColor = getStreamThemeColor(stream);
  const formattedTime = formatStreamTime(stream.starts_at);

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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Watch ${stream.name}`}
      onClick={() => onPlay(stream)}
      onKeyDown={handleKeyDown}
      className="group block cursor-pointer select-none transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-2xl"
    >
      {/* 16:9 Aspect Ratio (or 16:10 for compact channels), 16px radius, 1px rgba(255,255,255,.08) border, dark base #0f1424 */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1424] shadow-xl group-hover:border-white/20 transition-colors ${
          compactChannel ? 'aspect-[16/10]' : 'aspect-[16/9]'
        }`}
      >
        {/* Subtle Team/Sport Color Glow in Corner (Radial Gradient at 30% opacity, never saturated rainbow) */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-30"
          style={{
            background: `radial-gradient(circle at top right, ${themeColor} 0%, transparent 65%)`
          }}
        />

        {/* Visual Content: Poster OR Dual Team / Clean Channel Monogram */}
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          {stream.poster && !imgError ? (
            <img
              src={stream.poster}
              alt={stream.name}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : is247 || compactChannel ? (
            /* Channel Card: Logo or clean typography monogram centered at 96px on dark base */
            <div className="flex flex-col items-center justify-center p-4">
              <div
                className="flex h-12 w-24 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-lg backdrop-blur-md"
                style={{ borderColor: `${themeColor}40` }}
              >
                <span className="text-sm font-black tracking-widest text-white uppercase">
                  {provider.short || stream.name.slice(0, 4).toUpperCase()}
                </span>
              </div>
              <span className="mt-2 text-xs font-semibold text-white/50 truncate max-w-[140px] text-center">
                {stream.name}
              </span>
            </div>
          ) : matchInfo.isMatch ? (
            /* Match Card: Dual team presentation with logos/monograms at 64px and small 'VS' in center */
            <div className="flex h-full w-full items-center justify-center px-4 gap-3">
              {/* Team 1 */}
              <div className="flex flex-col items-center text-center w-20">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-md backdrop-blur-md">
                  <span className="text-sm font-black tracking-wider text-white">
                    {getInitials(matchInfo.team1)}
                  </span>
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-white/80 truncate w-full">
                  {matchInfo.team1}
                </span>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-rose-400/90 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  VS
                </span>
                {matchInfo.score && (
                  <span className="mt-1 text-xs font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                    {matchInfo.score}
                  </span>
                )}
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center text-center w-20">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-md backdrop-blur-md">
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
            /* Single event fallback monogram */
            <div className="flex flex-col items-center justify-center p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-md">
                <span className="text-base font-black tracking-wider text-white">
                  {stream.category_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="mt-2 text-xs font-semibold text-white/60 truncate max-w-[160px] text-center">
                {stream.name}
              </span>
            </div>
          )}
        </div>

        {/* Smooth Bottom Vignette Overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

        {/* Top Row: ONE Status Chip on Left, 24px Round Provider Logo on Right */}
        <div className="absolute top-2.5 inset-x-2.5 z-30 flex items-center justify-between gap-1.5 pointer-events-none">
          {/* Status Chip */}
          {is247 ? (
            <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              24/7
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {countdown ? `Starts ${countdown}` : 'Upcoming'}
            </span>
          )}

          {/* 24px Round Provider Logo */}
          <div
            title={provider.label}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 shadow-md"
            style={{ backgroundColor: provider.bg, color: provider.text }}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">
              {provider.short.slice(0, 3)}
            </span>
          </div>
        </div>

        {/* Score or Period Badge (for live matches) */}
        {isLive && matchInfo.score && (
          <div className="absolute bottom-2.5 left-2.5 z-30 pointer-events-none">
            <span className="inline-flex items-center gap-1 rounded bg-black/80 border border-white/15 px-1.5 py-0.5 text-[11px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {matchInfo.score}
            </span>
          </div>
        )}

        {/* Bottom of Image: Circular 48px Play Button on Hover */}
        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform duration-200 group-hover:scale-105">
            <Play className="h-5 w-5 fill-black text-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* Below the Card Metadata */}
      <div className="mt-2.5 px-0.5 space-y-0.5">
        {/* Line 1: Title, 15px, weight 600, max 2 lines (wrap instead of truncating) */}
        <h3 className="text-[15px] font-semibold text-white leading-tight line-clamp-2 group-hover:text-rose-400 transition-colors">
          {matchInfo.cleanTitle || stream.name}
        </h3>

        {/* Line 2: League · Today, 8:00 PM IST, 13px, 60% opacity */}
        <p className="text-[13px] text-white/60 truncate font-normal">
          {stream.category_name} · {is247 ? '24/7 TV' : formattedTime}
        </p>
      </div>
    </div>
  );
};

export default LiveStreamCard;
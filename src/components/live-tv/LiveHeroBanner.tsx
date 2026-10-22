import React, { useState, useEffect } from 'react';
import {
  Play,
  Info,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Radio,
  Tv
} from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import {
  getStreamStatus,
  getStreamCountdown,
  getProviderBadge,
  parseMatchTeams
} from '../../services/liveTv';

interface LiveHeroBannerProps {
  items: LiveStream[];
  onPlay: (stream: LiveStream) => void;
  onOpenDetails?: (stream: LiveStream) => void;
  savedStreamIds?: number[];
  onToggleBookmark?: (stream: LiveStream) => void;
}

export const LiveHeroBanner: React.FC<LiveHeroBannerProps> = ({
  items,
  onPlay,
  onOpenDetails,
  savedStreamIds = [],
  onToggleBookmark
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [savedLocal, setSavedLocal] = useState<number[]>(savedStreamIds);
  const [showInfoModal, setShowInfoModal] = useState<LiveStream | null>(null);

  // Auto-advance slides every 8 seconds (matching Movies hero)
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [items.length, isPaused]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex] || items[0];
  const is247 = current.always_live === 1 || current.always_live === true;
  const status = getStreamStatus(current);
  const isLive = is247 || status === 'live';
  const countdown = getStreamCountdown(current.starts_at);
  const provider = getProviderBadge(current.source_tag, current.tag);
  const matchInfo = parseMatchTeams(current.name);
  const isSaved = savedLocal.includes(current.id);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      const diffX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) handlePrev();
        else handleNext();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(10); } catch {}
        }
      }
    }
    setTouchStartX(null);
    setIsPaused(false);
  };

  const toggleBookmark = (stream: LiveStream) => {
    if (onToggleBookmark) {
      onToggleBookmark(stream);
    }
    setSavedLocal((prev) =>
      prev.includes(stream.id) ? prev.filter((id) => id !== stream.id) : [...prev, stream.id]
    );
  };

  // Up Next 3 items for right-hand preview strip
  const upNextIndices = [
    (currentIndex + 1) % items.length,
    (currentIndex + 2) % items.length,
    (currentIndex + 3) % items.length
  ];
  const upNextItems = upNextIndices.map((idx, pos) => ({ item: items[idx], idx, pos }));

  return (
    <section
      aria-label="Featured Sports Broadcast"
      id="sports-hero"
      className="relative w-full overflow-hidden bg-[#060812]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 560-640px hero with 96px top padding so floating nav never overlaps */}
      <div className="relative h-[560px] md:h-[600px] lg:h-[640px] w-full select-none pt-24">
        {/* Background Visuals Layer */}
        <div className="absolute inset-0 overflow-hidden">
          {items.map((item, idx) => {
            const isActive = idx === currentIndex;
            const isNear =
              Math.abs(idx - currentIndex) <= 1 ||
              (currentIndex === 0 && idx === items.length - 1) ||
              (currentIndex === items.length - 1 && idx === 0);

            if (!isNear) return null;

            const isChannel = item.always_live === 1 || item.always_live === true;

            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* For live matches: full-bleed team/stadium photo; for 24/7 channels: dark background with clean logo centered on right at 40% opacity, never blurred */}
                {isChannel ? (
                  <div className="relative h-full w-full bg-[#0a0d1a]">
                    {item.poster ? (
                      <div className="absolute right-12 lg:right-32 top-1/2 -translate-y-1/2 w-80 lg:w-[480px] max-h-[380px] flex items-center justify-center opacity-40 pointer-events-none">
                        <img
                          src={item.poster}
                          alt={item.name}
                          loading={isActive ? 'eager' : 'lazy'}
                          className="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                        />
                      </div>
                    ) : (
                      <div className="absolute right-20 top-1/2 -translate-y-1/2 text-8xl font-black uppercase tracking-widest text-white/[0.08] pointer-events-none">
                        {item.name.slice(0, 4)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      animation: isActive ? 'hero-kenburns 12000ms ease-out forwards' : 'none'
                    }}
                  >
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.name}
                        fetchPriority={isActive ? 'high' : 'auto'}
                        loading={isActive ? 'eager' : 'lazy'}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#0a0d1a]" />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Gradients: Left to right (#0a0d1a at 95% to transparent at 60%) and bottom into page background */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background:
                'linear-gradient(to right, #0a0d1a 0%, rgba(10,13,26,0.95) 30%, rgba(10,13,26,0.6) 60%, transparent 100%)'
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 z-20 h-52 sm:h-64 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, #060812, rgba(6,8,18,0.8) 50%, transparent)'
            }}
          />
          <div
            className="absolute inset-x-0 top-0 z-20 h-28 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(6,8,18,0.7), transparent)'
            }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-20 flex h-full flex-col justify-end px-5 sm:px-8 lg:px-12 pb-10 sm:pb-12 max-w-[1600px] mx-auto w-full">
          <div className="flex items-end justify-between gap-8">
            {/* Left Column: Badges, Title, Description, Buttons, Progress */}
            <div className="flex max-w-[620px] flex-col gap-3 sm:gap-3.5">
              {/* One Badge Row: Max 3 chips, all at 12px */}
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                {/* Chip 1: Pulsing Status */}
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-white shadow-md shadow-rose-600/30">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    LIVE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    {countdown || 'UPCOMING'}
                  </span>
                )}

                {/* Chip 2: League / Category */}
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
                  {current.category_name || 'Sports'}
                </span>

                {/* Chip 3: Provider / Broadcaster */}
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-md">
                  {provider.label}
                </span>
              </div>

              {/* Title: 56px, weight 800, tight tracking, max 2 lines, never clipped */}
              <h1
                key={`hero-title-${current.id}`}
                className="text-3xl sm:text-4xl lg:text-[48px] xl:text-[56px] font-extrabold tracking-tight text-white leading-[1.08] line-clamp-2 drop-shadow-2xl"
              >
                {matchInfo.cleanTitle || current.name}
              </h1>

              {/* Description: 16px, 70% white opacity, max 520px wide */}
              <p className="text-[15px] sm:text-base text-white/70 max-w-[520px] line-clamp-2 leading-relaxed">
                {is247
                  ? `24/7 continuous linear high-definition broadcast network for ${current.name}. Available without blackout restrictions.`
                  : `Live broadcast direct from ${provider.label} in crystal clear HD. Experience full satellite stadium relay on Streamverse.`}
              </p>

              {/* Action Buttons (Matches Movies hero: 48px tall, pill shape) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Watch Now Button */}
                <button
                  type="button"
                  onClick={() => onPlay(current)}
                  className="flex h-12 min-h-[48px] items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black shadow-xl hover:bg-white/90 active:scale-95 transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-black text-black" />
                  Watch Now
                </button>

                {/* Ghost More Info Button */}
                <button
                  type="button"
                  onClick={() => (onOpenDetails ? onOpenDetails(current) : setShowInfoModal(current))}
                  className="flex h-12 min-h-[48px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition cursor-pointer"
                >
                  <Info className="h-4 w-4 text-white" />
                  More Info
                </button>

                {/* Bookmark Icon Button */}
                <button
                  type="button"
                  onClick={() => toggleBookmark(current)}
                  title={isSaved ? 'Remove from Saved' : 'Save for Later'}
                  aria-label={isSaved ? 'Remove from Saved' : 'Save for Later'}
                  className={`flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-white/20 backdrop-blur-md hover:bg-white/20 active:scale-95 transition cursor-pointer ${
                    isSaved ? 'bg-rose-600/30 text-rose-400 border-rose-500/50' : 'bg-white/10 text-white'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Segmented Indicator & Nav Arrows (Matching Movies hero) */}
              <div className="mt-4 flex items-center gap-3 w-full max-w-[520px]">
                {/* Segmented Progress Bars */}
                <div className="flex flex-1 gap-1.5 py-1">
                  {items.slice(0, 10).map((_, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className="group h-5 flex-1 py-1.5 cursor-pointer"
                      >
                        <span className="relative block h-1.5 overflow-hidden rounded-full bg-white/20 transition group-hover:bg-white/35">
                          {isActive && (
                            <span
                              key={`progress-${idx}`}
                              className="absolute inset-0 origin-left bg-white shadow-sm"
                              style={{
                                animation: 'hero-progress 8000ms linear forwards',
                                animationPlayState: isPaused ? 'paused' : 'running'
                              }}
                            />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Chevrons */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: "Up Next" Strip of 3 Thumbnails (Matches Movies hero, fills empty right side) */}
            <div className="hidden xl:flex flex-col gap-2.5 w-[320px] shrink-0 bg-black/40 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                  Up Next on Streamverse
                </span>
                <span className="text-[10px] font-semibold text-rose-400">
                  {currentIndex + 1} / {items.length}
                </span>
              </div>

              <div className="space-y-2">
                {upNextItems.map(({ item, idx, pos }) => {
                  const isItemLive =
                    item.always_live === 1 || getStreamStatus(item) === 'live';
                  const itemCountdown = getStreamCountdown(item.starts_at);

                  return (
                    <button
                      key={`up-next-${item.id}-${pos}`}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className="group flex items-center gap-3 w-full p-1.5 rounded-xl text-left hover:bg-white/10 transition cursor-pointer"
                    >
                      {/* 16:9 Thumbnail preview */}
                      <div className="relative aspect-[16/9] w-20 shrink-0 overflow-hidden rounded-lg bg-[#0f1424] border border-white/10">
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt=""
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/40">
                            {item.always_live ? <Tv className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                          </div>
                        )}
                        {isItemLive && (
                          <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {item.category_name} ·{' '}
                          {isItemLive ? (
                            <span className="text-rose-400 font-semibold">Live</span>
                          ) : (
                            itemCountdown || 'Soon'
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal / Drawer Fallback */}
      {showInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setShowInfoModal(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-3xl border border-white/15 bg-[#0f1424] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                {showInfoModal.category_name}
              </span>
              <button
                type="button"
                onClick={() => setShowInfoModal(null)}
                className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <h3 className="text-2xl font-bold text-white">{showInfoModal.name}</h3>

            <p className="text-sm text-white/70 leading-relaxed">
              Broadcasted via {showInfoModal.source_tag || showInfoModal.tag || 'Official Stream'}.
              {showInfoModal.substreams && showInfoModal.substreams.length > 0 && (
                <span className="block mt-2 text-rose-300">
                  Includes {showInfoModal.substreams.length} alternate camera & commentary feeds.
                </span>
              )}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowInfoModal(null);
                  onPlay(showInfoModal);
                }}
                className="flex-1 rounded-full bg-white py-3 text-sm font-bold text-black hover:bg-white/90 transition text-center"
              >
                Watch Broadcast Now
              </button>
              <button
                type="button"
                onClick={() => setShowInfoModal(null)}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default LiveHeroBanner;
import React, { useState, useEffect } from 'react';
import {
  Play,
  Info,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Tv,
  Radio
} from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import {
  getStreamStatus,
  getProviderBadge,
  parseMatchTeams,
  cleanStreamTitle
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

  // Auto-advance hero slides every 8 seconds (matching Movies hero)
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

  // Up Next 3 items for bottom-right floating preview strip (matching Movies hero)
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
      className="relative w-full overflow-hidden bg-[#0A0C12]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 500-560px on desktop with 96px top padding and vertically centered text block */}
      <div className="relative h-[500px] md:h-[530px] lg:h-[560px] w-full select-none pt-24 pb-8 flex items-center">
        {/* Full-Bleed Backdrop Image Layer */}
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
                {/* Full-bleed background imagery with Ken Burns motion */}
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
                  ) : isChannel ? (
                    <div className="h-full w-full bg-[#12151E] flex items-center justify-end pr-20">
                      <span className="text-9xl font-black uppercase tracking-widest text-white/[0.05]">
                        {cleanStreamTitle(item.name).slice(0, 4)}
                      </span>
                    </div>
                  ) : (
                    <div className="h-full w-full bg-[#12151E]" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Smooth Left and Bottom Vignettes into Page Background */}
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-[#0A0C12] via-[#0A0C12]/70 to-transparent" />
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-[#0A0C12] via-[#0A0C12]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-20 h-40 pointer-events-none bg-gradient-to-t from-[#060812] to-transparent" />
        </div>

        {/* Vertically Centered Content Container */}
        <div className="relative z-20 px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto w-full my-auto">
          <div className="flex items-center justify-between gap-8">
            {/* Left Column: Badges, Title, Description, Buttons, Progress */}
            <div className="flex max-w-[580px] flex-col gap-3">
              {/* Badge Row */}
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md shadow-rose-600/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    LIVE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
                    UPCOMING
                  </span>
                )}

                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
                  {current.category_name || 'Sports'}
                </span>

                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
                  {provider.label}
                </span>
              </div>

              {/* Title: 48-56px, weight 800, tight tracking */}
              <h1
                key={`hero-title-${current.id}`}
                className="text-3xl sm:text-4xl lg:text-[48px] xl:text-[54px] font-extrabold tracking-tight text-white leading-[1.08] line-clamp-2 drop-shadow-2xl"
              >
                {matchInfo.cleanTitle || cleanStreamTitle(current.name)}
              </h1>

              {/* Description: Max 2 lines, max 520px wide */}
              <p className="text-[15px] sm:text-base text-white/70 max-w-[520px] line-clamp-2 leading-relaxed">
                {is247
                  ? `24/7 continuous linear high-definition broadcast network for ${cleanStreamTitle(current.name)}. Available without blackout restrictions.`
                  : `Live broadcast direct from ${provider.label} in crystal clear HD. Stadium relay feed on Streamverse.`}
              </p>

              {/* Action Buttons (Matches Movies hero: 48px tall, pill shape) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onPlay(current)}
                  className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black shadow-xl hover:bg-white/90 active:scale-95 transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-black text-black" />
                  Watch Now
                </button>

                <button
                  type="button"
                  onClick={() => (onOpenDetails ? onOpenDetails(current) : setShowInfoModal(current))}
                  className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition cursor-pointer"
                >
                  <Info className="h-4 w-4 text-white" />
                  More Info
                </button>

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

              {/* Compact Progress Bar & Chevrons (Matching Movies Hero) */}
              <div className="mt-3 flex items-center gap-3 w-full max-w-[520px]">
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

            {/* Right-Side: 3 Borderless Horizontal Preview Cards Floating in Bottom-Right Corner (Matches Movies hero) */}
            <div className="hidden xl:flex flex-col gap-2.5 shrink-0 self-end mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                <span className="h-3.5 w-[3px] rounded-full bg-rose-500" />
                Up Next on Streamverse
              </div>
              <div className="flex gap-3">
                {upNextItems.map(({ item, idx, pos }) => (
                  <button
                    key={`up-next-${item.id}-${pos}`}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className="group w-36 text-left xl:w-44 cursor-pointer"
                  >
                    <div className="card-3d relative rounded-xl">
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-lg">
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt={cleanStreamTitle(item.name)}
                            loading="lazy"
                            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#12151E] text-white/40">
                            {item.always_live ? <Tv className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-white/80 transition-colors group-hover:text-white">
                      {cleanStreamTitle(item.name)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal Fallback */}
      {showInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setShowInfoModal(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-3xl border border-white/15 bg-[#12151E] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                {showInfoModal.category_name}
              </span>
              <button
                type="button"
                onClick={() => setShowInfoModal(null)}
                className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <h3 className="text-2xl font-bold text-white">
              {cleanStreamTitle(showInfoModal.name)}
            </h3>

            <p className="text-sm text-white/70 leading-relaxed">
              Broadcasted via {showInfoModal.source_tag || showInfoModal.tag || 'Official Stream'}.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowInfoModal(null);
                  onPlay(showInfoModal);
                }}
                className="flex-1 rounded-full bg-white py-3 text-sm font-bold text-black hover:bg-white/90 transition text-center cursor-pointer"
              >
                Watch Broadcast Now
              </button>
              <button
                type="button"
                onClick={() => setShowInfoModal(null)}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition cursor-pointer"
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
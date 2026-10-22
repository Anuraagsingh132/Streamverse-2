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

// High-resolution photographic arena/stadium backdrops for hero showcase
const SPORT_HERO_BACKDROPS: Record<string, string> = {
  football: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=2560&q=85',
  cricket: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=2560&q=85',
  basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=2560&q=85',
  'american football': 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=2560&q=85',
  'ice hockey': 'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=2560&q=85',
  combat: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=2560&q=85',
  motorsports: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=2560&q=85',
  darts: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=2560&q=85',
  default: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=2560&q=85'
};

const getSportHeroBackdrop = (categoryName?: string, streamName?: string): string => {
  const cat = (categoryName || '').toLowerCase();
  const name = (streamName || '').toLowerCase();

  if (cat.includes('ice hockey') || cat.includes('hockey') || name.includes('nhl')) {
    return SPORT_HERO_BACKDROPS['ice hockey'];
  }
  if (cat.includes('american football') || cat.includes('nfl') || name.includes('nfl')) {
    return SPORT_HERO_BACKDROPS['american football'];
  }
  if (cat.includes('cricket') || name.includes('cricket') || name.includes('willow')) {
    return SPORT_HERO_BACKDROPS['cricket'];
  }
  if (cat.includes('basketball') || name.includes('nba')) {
    return SPORT_HERO_BACKDROPS['basketball'];
  }
  if (cat.includes('football') || cat.includes('soccer')) {
    return SPORT_HERO_BACKDROPS['football'];
  }
  if (
    cat.includes('combat') ||
    cat.includes('wrestling') ||
    cat.includes('boxing') ||
    cat.includes('mma') ||
    cat.includes('ufc')
  ) {
    return SPORT_HERO_BACKDROPS['combat'];
  }
  if (cat.includes('motor') || cat.includes('racing') || cat.includes('rally')) {
    return SPORT_HERO_BACKDROPS['motorsports'];
  }
  if (cat.includes('dart')) {
    return SPORT_HERO_BACKDROPS['darts'];
  }
  return SPORT_HERO_BACKDROPS['default'];
};

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

  const toggleBookmark = (stream: LiveStream) => {
    if (onToggleBookmark) {
      onToggleBookmark(stream);
    }
    setSavedLocal((prev) =>
      prev.includes(stream.id) ? prev.filter((id) => id !== stream.id) : [...prev, stream.id]
    );
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStartX(null);
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
      className="relative w-full overflow-hidden bg-[#060812]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 520-560px on desktop with 96px top padding and vertically centered text block */}
      <div className="relative min-h-[500px] md:min-h-[540px] lg:h-[560px] w-full select-none pt-24 pb-8 flex items-center">
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
            const highResBackdrop = getSportHeroBackdrop(item.category_name, item.name);
            const isApiThumbnail =
              item.poster?.includes('-thumbnail.jpg') || item.poster?.includes('/thumb/');

            return (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Full-bleed high-res arena/stadium background with Ken Burns motion */}
                <div
                  className="absolute inset-0"
                  style={{
                    animation: isActive ? 'hero-kenburns 12000ms ease-out forwards' : 'none'
                  }}
                >
                  <img
                    src={!isChannel && item.poster && !isApiThumbnail ? item.poster : highResBackdrop}
                    alt={item.name}
                    fetchPriority={isActive ? 'high' : 'auto'}
                    loading={isActive ? 'eager' : 'lazy'}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
            );
          })}

          {/* Deep Solid Left-to-Right Scrim: Guarantees stadium boards NEVER look like strikethrough lines through text */}
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-[#060812] via-[#060812]/95 via-[#060812]/70 via-[#060812]/30 to-transparent" />
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-[#060812] via-[#060812]/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-20 h-44 pointer-events-none bg-gradient-to-t from-[#060812] to-transparent" />
        </div>

        {/* Vertically Centered Content Container with uniform margins */}
        <div className="relative z-20 px-6 sm:px-10 lg:px-14 max-w-[1600px] mx-auto w-full my-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            {/* Left Column: Badges, Title, Description, Buttons, Progress */}
            <div className="flex w-full md:max-w-lg lg:max-w-[48%] xl:max-w-[520px] flex-col gap-3.5 z-30">
              {/* Badge Row (High contrast, bold pills) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/40">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    LIVE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
                    UPCOMING
                  </span>
                )}

                <span className="inline-flex items-center rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
                  {current.category_name || 'Sports'}
                </span>

                <span className="inline-flex items-center rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md backdrop-blur-md">
                  {provider.label}
                </span>
              </div>

              {/* Title: 44-54px, weight 800, tight tracking */}
              <h1
                key={`hero-title-${current.id}`}
                className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-extrabold tracking-tight text-white leading-[1.08] line-clamp-2 drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]"
              >
                {matchInfo.cleanTitle || cleanStreamTitle(current.name)}
              </h1>

              {/* Description: Capped at max-w-xl so it NEVER collides with Up Next */}
              <p className="text-sm sm:text-[15px] font-normal text-zinc-300 leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] line-clamp-2">
                {is247
                  ? `24/7 continuous linear high-definition broadcast network for ${cleanStreamTitle(current.name)}. Available without blackout restrictions.`
                  : `Live broadcast direct from ${provider.label} in crystal clear HD. Stadium relay feed on Streamverse.`}
              </p>

              {/* Action Buttons (High contrast, bold borders) */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
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
                  className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/15 px-6 text-sm font-semibold text-white backdrop-blur-xl hover:bg-white/25 hover:border-white/40 active:scale-95 transition cursor-pointer shadow-lg"
                >
                  <Info className="h-4 w-4 text-white" />
                  More Info
                </button>

                <button
                  type="button"
                  onClick={() => toggleBookmark(current)}
                  title={isSaved ? 'Remove from Saved' : 'Save for Later'}
                  aria-label={isSaved ? 'Remove from Saved' : 'Save for Later'}
                  className={`flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border backdrop-blur-xl hover:scale-105 active:scale-95 transition cursor-pointer shadow-lg ${
                    isSaved
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'border-white/25 bg-white/15 text-white hover:bg-white/25 hover:border-white/40'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Carousel Progress Bar & Chevrons on a single neat baseline */}
              <div className="mt-2 flex items-center gap-3 w-full max-w-[480px]">
                <div className="flex flex-1 items-center gap-1.5 py-1">
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
                        <span className="relative block h-1.5 overflow-hidden rounded-full bg-white/30 transition group-hover:bg-white/50">
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

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right-Side: 3 Borderless Horizontal Preview Cards in Dark Glass Panel */}
            <div className="hidden xl:flex flex-col gap-2.5 shrink-0 self-end mb-1 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-3.5 shadow-2xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white">
                <span className="h-3 w-1 rounded-full bg-rose-500" />
                Up Next on Streamverse
              </div>
              <div className="flex gap-3">
                {upNextItems.map(({ item, idx, pos }) => (
                  <button
                    key={`up-next-${item.id}-${pos}`}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className="group w-32 xl:w-36 text-left cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 bg-[#12151E] shadow-lg">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={cleanStreamTitle(item.name)}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#12151E] text-white/40">
                          {item.always_live ? <Tv className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
                        </div>
                      )}
                      {/* Dark bottom gradient scrim on thumbnail */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs font-bold text-white transition-colors group-hover:text-rose-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
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

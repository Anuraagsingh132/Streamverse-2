import React, { useState, useEffect } from 'react';
import {
  Play,
  Info,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Tv,
  Radio,
  Clapperboard
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
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient Backdrop Glow: Matches Movies Hero (Contained to hero on mobile, creates deep rich atmosphere) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[85vh] md:fixed md:inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {items.map((item, idx) => {
          const isActive = idx === currentIndex;
          const highResBackdrop = getSportHeroBackdrop(item.category_name, item.name);
          const bgUrl = item.poster && !item.poster.includes('-thumbnail') ? item.poster : highResBackdrop;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                isActive ? 'opacity-30 dark:opacity-25' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 20%',
                filter: 'blur(80px) saturate(150%)',
                transform: 'scale(1.2)'
              }}
            />
          );
        })}
      </div>

      {/* Main Hero Container: Matches Movies Hero height (lg:h-screen, giving expansive breathing room under navbar) */}
      <div className="relative h-[min(68svh,560px)] sm:h-[75vh] lg:h-screen w-full select-none">
        {/* Full-Bleed Backdrop Image Layer with Top Mask & Ken Burns Animation */}
        <div 
          className="absolute inset-x-0 top-0 overflow-hidden h-full lg:h-[calc(100%+20vh)]"
          style={{
            maskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)'
          }}
        >
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
                    className="h-full w-full object-cover object-top sm:object-center"
                  />
                </div>
              </div>
            );
          })}

          {/* Gradients matching Movies hero: Deep left scrim + subtle top scrim + soft bottom fade */}
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-[#060812] via-[#060812]/95 via-[#060812]/70 via-[#060812]/30 to-transparent" />
          <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-20 h-48 sm:h-64 pointer-events-none" style={{ background: 'linear-gradient(to top, #060812, rgba(6,8,18,0.8) 50%, transparent)' }} />

          {/* Mobile-Only Scrims */}
          <div className="md:hidden absolute inset-x-0 top-0 z-20 pointer-events-none" style={{ height: '120px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.25) 50%, transparent)' }} />
          <div className="md:hidden absolute inset-x-0 bottom-0 z-20 pointer-events-none" style={{ height: '70%', background: 'linear-gradient(to top, #060812, rgba(6,8,18,0.9) 40%, transparent)' }} />
        </div>

        {/* Vertical Watermark */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 select-none text-[11px] font-black uppercase tracking-[0.6em] text-white/15 [writing-mode:vertical-rl] lg:block xl:right-5"
        >
          Streamverse
        </div>

        {/* Content Container: Cleanly elevated on desktop with items-end pb-5 sm:pb-32 md:pb-36 lg:pb-64 (1:1 with Movies hero) */}
        <div className="relative z-10 flex h-full items-end pb-5 sm:pb-32 md:pb-36 lg:pb-64 4xl:pb-80">
          <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
            <div className="flex max-w-xl flex-col gap-2.5 sm:gap-4 2xl:max-w-2xl">
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

              {/* Title: 44-56px, weight 800+, tight tracking */}
              <h1
                key={`hero-title-${current.id}`}
                className="text-2xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both leading-tight"
                style={{
                  filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.85)) drop-shadow(0 4px 20px rgba(0,0,0,0.75))'
                }}
              >
                {matchInfo.cleanTitle || cleanStreamTitle(current.name)}
              </h1>

              {/* Description: Capped at max-w-xl */}
              <p className="line-clamp-2 text-xs sm:text-sm lg:text-base leading-relaxed text-zinc-100 drop-shadow-md duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both max-w-xl">
                {is247
                  ? `24/7 continuous linear high-definition broadcast network for ${cleanStreamTitle(current.name)}. Available without blackout restrictions.`
                  : `Live broadcast direct from ${provider.label} in crystal clear HD. Stadium relay feed on Streamverse.`}
              </p>

              {/* Action Buttons (1:1 styling with Movies hero buttons) */}
              <div className="flex items-center gap-2.5 pt-1 duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both">
                <button
                  type="button"
                  onClick={() => onPlay(current)}
                  className="flex h-11 min-h-[44px] items-center gap-2 rounded-full bg-white px-5 sm:px-6 text-sm font-bold text-black shadow-lg transition hover:bg-white/85 active:scale-95 select-none cursor-pointer"
                >
                  <Play className="lucide lucide-play h-4 w-4 fill-current" />
                  Watch Now
                </button>

                <button
                  type="button"
                  onClick={() => (onOpenDetails ? onOpenDetails(current) : setShowInfoModal(current))}
                  className="flex h-11 min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-black/50 md:bg-white/15 px-4 sm:px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 select-none cursor-pointer"
                >
                  <Info className="lucide lucide-info h-4 w-4" />
                  More Info
                </button>

                <button
                  type="button"
                  onClick={() => toggleBookmark(current)}
                  title={isSaved ? 'Remove from Saved' : 'Save for Later'}
                  aria-label={isSaved ? 'Remove from Saved' : 'Save for Later'}
                  className={`inline-flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border border-white/20 backdrop-blur-md hover:bg-white/25 active:scale-95 transition cursor-pointer ${
                    isSaved
                      ? 'bg-primary/25 text-primary border-primary/40'
                      : 'bg-black/50 md:bg-white/15 text-white'
                  }`}
                >
                  <Bookmark className={`lucide lucide-bookmark h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Slider Progress Bars & Chevrons on single neat baseline */}
              <div className="mt-4 sm:mt-6 flex max-w-xl items-center gap-3">
                {/* Desktop Indicators: 10 progress bars matching Movies Hero */}
                <div className="hidden md:flex flex-1 gap-1.5">
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
                        <span className="relative block h-1.5 overflow-hidden rounded-full bg-white/25 transition group-hover:bg-white/40">
                          {isActive && (
                            <span
                              key={`progress-${idx}`}
                              className="absolute inset-0 origin-left bg-rose-500 shadow-sm shadow-rose-500/50"
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

                {/* Mobile Indicators: Capped at 5 with wide solid active pill */}
                <div className="flex md:hidden items-center gap-2 py-1 mt-1 sm:mt-2">
                  {items.slice(0, 5).map((_, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={`mob-${idx}`}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className="flex h-9 min-h-[36px] min-w-[28px] items-center justify-center p-1 active:scale-90 transition-transform cursor-pointer"
                      >
                        <span
                          className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                            isActive
                              ? 'w-7 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                              : 'w-2 bg-white/35 hover:bg-white/50'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Chevrons */}
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous slide"
                    title="Previous slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ChevronLeft className="lucide lucide-chevron-left h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next slide"
                    title="Next slide"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ChevronRight className="lucide lucide-chevron-right h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Up Next Section on Right: 1:1 with Movies Hero Placement */}
            <div 
              className="absolute right-5 hidden flex-col gap-2.5 sm:bottom-32 md:bottom-36 lg:bottom-64 lg:right-10 xl:right-12 xl:flex 2xl:right-14 4xl:bottom-80"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                <span className="h-3.5 w-[3px] rounded-full bg-primary" />
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
                        <img
                          src={item.poster || getSportHeroBackdrop(item.category_name, item.name)}
                          alt={cleanStreamTitle(item.name)}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                      </div>
                      <span className="card-3d-glare" aria-hidden="true" />
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

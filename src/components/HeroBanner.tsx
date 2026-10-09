import React, { useState, useEffect } from 'react';
import { 
  Clapperboard, 
  Play, 
  Info, 
  Bookmark, 
  Star, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { MediaItem } from '../types/media';

interface HeroBannerProps {
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({
  items,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);

    return () => {
      clearInterval(timer);
    };
  }, [items.length, isPaused]);

  const currentId = items && items.length > 0 ? (items[currentIndex]?.id || items[0]?.id) : undefined;

  useEffect(() => {
    setLogoError(false);
  }, [currentIndex, currentId]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex] || items[0];
  const isSaved = watchlist.includes(current.id);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  // Up next items (next 3 in cycle)
  const upNextIndices = [
    (currentIndex + 1) % items.length,
    (currentIndex + 2) % items.length,
    (currentIndex + 3) % items.length,
  ];
  const upNextItems = upNextIndices.map((idx) => items[idx]);

  return (
    <section 
      className="relative" 
      id="hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {/* 1:1 CinemaOS Ambient Fixed Backdrop Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {items.map((item, idx) => {
          const isActive = idx === currentIndex;
          const isNear = Math.abs(idx - currentIndex) <= 1 || 
            (currentIndex === 0 && idx === items.length - 1) || 
            (currentIndex === items.length - 1 && idx === 0);
          if (!isNear) return null;

          let thumb = item.backdrop_path || item.poster_path || '';
          if (thumb.includes('image.tmdb.org/t/p/')) {
            thumb = thumb.replace(/\/t\/p\/(original|w\d+)\//, '/t/p/w300/');
          } else if (thumb && !thumb.includes('wsrv.nl') && !thumb.startsWith('data:')) {
            thumb = `https://wsrv.nl/?url=${encodeURIComponent(thumb)}&w=300&output=webp&q=65`;
          }

          return (
            <img 
              key={`glow-${item.id}`} 
              alt="" 
              src={thumb} 
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                isActive ? 'opacity-60' : 'opacity-0'
              }`}
              style={{
                filter: 'blur(48px) saturate(1.4)',
                WebkitFilter: 'blur(48px) saturate(1.4)',
                transform: 'translate3d(0, 0, 0) scale(1.15)',
                opacity: isActive ? 0.6 : 0,
                transition: 'opacity 1000ms ease',
                contain: 'paint'
              }}
            />
          );
        })}
      </div>

      <div className="relative h-[95vh] w-full select-none lg:h-screen">
        {/* Background Ken Burns Container with mask */}
        <div 
          className="absolute inset-x-0 top-0 overflow-hidden" 
          style={{
            height: 'calc(100% + 20vh)',
            maskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)'
          }}
        >
          {items.map((item, idx) => {
            const isActive = idx === currentIndex;
            // Only keep active and immediate neighbor slides in DOM to avoid GPU memory overhead
            const isNear = Math.abs(idx - currentIndex) <= 1 || 
              (currentIndex === 0 && idx === items.length - 1) || 
              (currentIndex === items.length - 1 && idx === 0);
            if (!isNear) return null;

            return (
              <div 
                key={item.id} 
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <div 
                  className="absolute inset-0" 
                  style={{ 
                    animation: isActive ? 'hero-kenburns 10000ms ease-out forwards' : 'none' 
                  }}
                >
                  <img 
                    alt={item.title} 
                    decoding="async" 
                    fetchPriority={isActive ? "high" : "auto"}
                    loading={isActive ? "eager" : "lazy"}
                    className="object-cover object-top h-full w-full" 
                    src={item.backdrop_path} 
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (item.poster_path && target.src !== item.poster_path) {
                        target.src = item.poster_path;
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Gradients */}
          <div className="absolute inset-0 z-20 bg-gradient-to-r from-white/80 via-white/30 to-transparent dark:from-black/85 dark:via-black/40 dark:to-transparent" />
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-white/10 via-transparent to-transparent dark:from-black/40 dark:via-transparent dark:to-transparent" />
        </div>

        {/* Vertical Watermark */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 select-none text-[11px] font-black uppercase tracking-[0.6em] text-white/15 [writing-mode:vertical-rl] lg:block xl:right-5"
        >
          Streamverse
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex h-full items-end pb-[36vh] sm:pb-32 md:pb-36 lg:pb-64 4xl:pb-80">
          <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
            <div className="flex max-w-xl flex-col gap-3 sm:gap-4 2xl:max-w-2xl">
              {/* Badge & Trending Row */}
              <div 
                className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-800 duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both dark:text-white/70"
                style={{ animationDelay: '0ms' }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-900 backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white">
                  <Clapperboard className="lucide lucide-clapperboard h-3 w-3 text-primary" aria-hidden="true" />
                  Streamverse
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {current.badge || `#${currentIndex + 1} Trending  ·  ${current.media_type === 'tv' ? 'Series' : 'Movie'}  ·  ${current.year || 2026}`}
                </span>
              </div>

              {/* Title or Title Logo */}
              {(current.logo_path || current.title_logo) && !logoError ? (
                <div 
                  className="h-20 w-full max-w-[260px] duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both sm:h-24 sm:max-w-sm lg:h-32 lg:max-w-lg" 
                  style={{ animationDelay: '90ms' }}
                >
                  <img 
                    key={`logo-${current.id}`}
                    src={current.logo_path || current.title_logo} 
                    alt={current.title} 
                    loading="eager" 
                    className="object-contain transition-opacity duration-300 h-full w-full object-left-bottom" 
                    style={{ filter: 'drop-shadow(rgba(0, 0, 0, 0.75) 0px 2px 10px) drop-shadow(rgba(0, 0, 0, 0.5) 0px 0px 2px)' }}
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <h1 
                  key={`title-${current.id}`}
                  className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both leading-none"
                  style={{ 
                    animationDelay: '90ms',
                    filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.75))'
                  }}
                >
                  {current.title}
                </h1>
              )}

              {/* Rating & Genres */}
              <div 
                className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-800 duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both dark:text-white/80 sm:text-sm" 
                style={{ animationDelay: '180ms' }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    <Star className="lucide lucide-star h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <Star className="lucide lucide-star h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <Star className="lucide lucide-star h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <Star className="lucide lucide-star h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <Star className="lucide lucide-star h-3.5 w-3.5 fill-transparent text-gray-400/60 dark:text-white/30" />
                  </span>
                  <span className="font-semibold">{Math.round((current.vote_average || 8.3) * 10)}%</span>
                </span>
                {current.genres?.slice(0, 3).map((g) => (
                  <span 
                    key={g} 
                    className="rounded-full border border-black/10 bg-white/30 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md dark:border-white/15 dark:bg-white/10"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p 
                className="line-clamp-2 text-sm leading-relaxed text-gray-800 drop-shadow-lg duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both dark:text-white/80 sm:line-clamp-3 lg:text-base" 
                style={{ animationDelay: '260ms' }}
              >
                {current.overview}
              </p>

              {/* Action Buttons */}
              <div 
                className="flex items-center gap-2.5 pt-1 duration-700 animate-in fade-in slide-in-from-bottom-3 fill-mode-both" 
                style={{ animationDelay: '340ms' }}
              >
                {/* Play Button */}
                <button 
                  onClick={() => onPlay(current)}
                  className="flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black shadow-lg transition hover:bg-white/85"
                >
                  <Play className="lucide lucide-play h-4 w-4 fill-current" />
                  Play
                </button>

                {/* More Info */}
                <button 
                  onClick={() => onOpenDetails(current)}
                  className="flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/15 px-5 text-sm font-semibold text-gray-900 backdrop-blur-md transition hover:bg-white/25 dark:text-white"
                >
                  <Info className="lucide lucide-info h-4 w-4" />
                  More Info
                </button>

                {/* Watch Later / Bookmark */}
                <button 
                  type="button"
                  onClick={() => onToggleWatchlist(current)}
                  title={isSaved ? "Remove from Watchlist" : "Watch Later"}
                  aria-label={isSaved ? "Remove from Watchlist" : "Watch Later"}
                  className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border hover:text-accent-foreground h-11 w-11 rounded-full border-white/20 backdrop-blur-md hover:bg-white/25 ${
                    isSaved ? 'bg-primary/25 text-primary border-primary/40' : 'bg-white/15 text-gray-900 dark:text-white'
                  }`}
                >
                  <Bookmark className={`lucide lucide-bookmark h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Slider Progress Bars & Chevrons */}
            <div className="mt-6 flex max-w-xl items-center gap-3">
              <div className="flex flex-1 gap-1.5">
                {items.slice(0, 10).map((_, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => goToSlide(idx)}
                      aria-label={`Go to slide ${idx + 1}`} 
                      className="group h-4 flex-1 py-1.5"
                    >
                      <span className="relative block h-1 overflow-hidden rounded-full bg-gray-500/30 transition group-hover:bg-gray-500/50 dark:bg-white/20 dark:group-hover:bg-white/35">
                        {isActive && (
                          <span 
                            key={`progress-${idx}`}
                            className="absolute inset-0 origin-left bg-gray-900 dark:bg-white" 
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
              <div className="hidden items-center gap-1.5 sm:flex">
                <button 
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous slide" 
                  title="Previous slide"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/30 text-gray-900 backdrop-blur-md transition hover:bg-white/50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft className="lucide lucide-chevron-left h-4 w-4" />
                </button>
                <button 
                  type="button"
                  onClick={handleNext}
                  aria-label="Next slide" 
                  title="Next slide"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/30 text-gray-900 backdrop-blur-md transition hover:bg-white/50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight className="lucide lucide-chevron-right h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Up Next Section on Right */}
          <div className="absolute bottom-[36vh] right-5 hidden flex-col gap-2.5 sm:bottom-32 md:bottom-36 lg:bottom-64 lg:right-10 xl:right-12 xl:flex 2xl:right-14 4xl:bottom-80">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-800 dark:text-white/60">
              <span className="h-3.5 w-[3px] rounded-full bg-primary" />
              Up next
            </div>
            <div className="flex gap-3">
              {upNextItems.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => onOpenDetails(item)}
                  className="group w-36 text-left xl:w-44"
                >
                  <div className="card-3d relative rounded-xl">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-lg">
                      <img 
                        src={item.backdrop_path} 
                        alt={item.title} 
                        loading="lazy" 
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (item.poster_path && target.src !== item.poster_path) {
                            target.src = item.poster_path;
                          }
                        }}
                        className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" 
                      />
                    </div>
                    <span className="card-3d-glare" aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-xs font-medium text-gray-800 dark:text-white/70 dark:group-hover:text-white">
                    {item.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default HeroBanner;

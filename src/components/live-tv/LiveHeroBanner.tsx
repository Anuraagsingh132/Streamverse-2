import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Radio,
  Tv,
  Clock,
  Share2,
  Check
} from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import { getStreamStatus, getStreamCountdown, formatStreamTime } from '../../services/liveTv';

interface LiveHeroBannerProps {
  items: LiveStream[];
  onPlay: (stream: LiveStream) => void;
}

export const LiveHeroBanner: React.FC<LiveHeroBannerProps> = ({ items, onPlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-advance hero slides every 8 seconds
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);

    return () => clearInterval(timer);
  }, [items.length, isPaused]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex] || items[0];
  const isLive = current.always_live === 1 || getStreamStatus(current) === 'live';
  const is247 = current.always_live === 1 || current.always_live === true;
  const countdown = getStreamCountdown(current.starts_at);
  const substreamCount = current.substreams?.length || 0;

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

  const handleCopyLink = () => {
    const url = `${window.location.origin}/sports?stream=${current.uri_name || current.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Ambient Blur Glow Behind Hero */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {items.map((item, idx) => {
          const isActive = idx === currentIndex;
          if (!isActive || !item.poster) return null;
          return (
            <img
              key={`glow-${item.id}`}
              src={item.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 opacity-35 md:opacity-50"
              style={{
                filter: 'blur(54px) saturate(1.5)',
                transform: 'scale(1.2)',
                contain: 'paint'
              }}
            />
          );
        })}
      </div>

      {/* Main Viewport Container */}
      <div className="relative h-[min(70svh,580px)] w-full select-none lg:h-[86vh]">
        {/* Background Ken Burns Container */}
        <div
          className="absolute inset-x-0 top-0 overflow-hidden h-full lg:h-[calc(100%+16vh)]"
          style={{
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 98%)'
          }}
        >
          {items.map((item, idx) => {
            const isActive = idx === currentIndex;
            const isNear =
              Math.abs(idx - currentIndex) <= 1 ||
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
                    <div className="h-full w-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Cinematic Vignette Gradients */}
          <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          <div
            className="absolute inset-x-0 bottom-0 z-20 h-48 sm:h-64 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, #060812, rgba(6,8,18,0.85) 50%, transparent)'
            }}
          />

          {/* Mobile Top and Bottom Shadow Scrims */}
          <div
            className="md:hidden absolute inset-x-0 top-0 z-20 pointer-events-none"
            style={{
              height: '120px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
            }}
          />
          <div
            className="md:hidden absolute inset-x-0 bottom-0 z-20 pointer-events-none"
            style={{
              height: '75%',
              background: 'linear-gradient(to top, #060812, rgba(6,8,18,0.95) 45%, transparent)'
            }}
          />
        </div>

        {/* Vertical Watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 select-none text-[11px] font-black uppercase tracking-[0.6em] text-white/15 [writing-mode:vertical-rl] lg:block xl:right-6"
        >
          Streamverse Live
        </div>

        {/* Hero Content Section */}
        <div className="relative z-10 flex h-full items-end pb-12 sm:pb-28 md:pb-32 lg:pb-52">
          <div className="w-full px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
            <div className="flex max-w-xl flex-col gap-3 sm:gap-4 2xl:max-w-2xl">
              {/* Badge & Metadata Pill */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                  Streamverse Relay
                </span>

                {is247 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                    <Tv className="h-3 w-3" />
                    24/7 Live Network
                  </span>
                ) : isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                    Live On Air Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                    <Clock className="h-3 w-3" />
                    {countdown}
                  </span>
                )}

                <span className="hidden sm:inline-block rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 backdrop-blur-md">
                  {current.category_name}
                </span>
              </div>

              {/* Title */}
              <h1
                key={`title-${current.id}`}
                className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white drop-shadow-2xl leading-tight"
                style={{
                  filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.85)) drop-shadow(0 4px 20px rgba(0,0,0,0.75))'
                }}
              >
                {current.name}
              </h1>

              {/* Tags & Broadcaster Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                <span className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-300 backdrop-blur-md">
                  {current.source_tag || current.tag || 'Live Feed'}
                </span>
                <span className="text-zinc-400">·</span>
                <span className="font-semibold text-zinc-300">
                  {is247 ? 'Continuous 24/7 TV Stream' : formatStreamTime(current.starts_at)}
                </span>
                <span className="hidden sm:inline text-zinc-400">·</span>
                <span className="hidden sm:inline font-medium text-emerald-400">
                  Ultra-Low Latency CDN
                </span>
              </div>

              {/* Subtitle / Context */}
              <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-zinc-200 drop-shadow-md sm:line-clamp-3">
                {is247
                  ? `Live 24/7 continuous broadcast feed for ${current.name}. Available uninterrupted in crystal clear high definition.`
                  : `High definition live satellite feed for ${current.name} in ${current.category_name}. Broadcasted via ${current.source_tag || current.tag || 'Official Live Stream'}.`}
              </p>

              {/* Call to Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Primary Watch Button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPlay(current)}
                  className="flex h-11 min-h-[44px] items-center gap-2.5 rounded-full bg-white px-6 text-sm font-bold text-black shadow-xl hover:bg-white/90 transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current text-black" />
                  {is247 ? 'Watch Channel' : isLive ? 'Watch Live Now' : 'Open Stream'}
                </motion.button>

                {/* Substream / Feeds Button */}
                {substreamCount > 0 && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPlay(current)}
                    className="flex h-11 min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                  >
                    <Layers className="h-4 w-4 text-rose-400" />
                    <span>+{substreamCount} Alternate Feeds</span>
                  </motion.button>
                )}

                {/* Share / Copy Stream Link */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyLink}
                  title="Copy Stream Link"
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                </motion.button>
              </div>
            </div>

            {/* Slider Progress Bars & Chevrons */}
            <div className="mt-5 sm:mt-8 flex max-w-xl items-center gap-3">
              {/* Desktop Indicators */}
              <div className="hidden md:flex flex-1 gap-1.5">
                {items.slice(0, 8).map((_, idx) => {
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
                            className="absolute inset-0 origin-left bg-rose-600 shadow-sm shadow-rose-600/50"
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

              {/* Mobile Indicators */}
              <div className="flex md:hidden items-center gap-1.5 py-1">
                {items.slice(0, 6).map((_, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isActive ? 'w-6 bg-rose-600' : 'w-1.5 bg-white/30'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  );
                })}
              </div>

              {/* Prev / Next Arrows */}
              <div className="hidden sm:flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/70 hover:text-white transition border border-white/10 cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/70 hover:text-white transition border border-white/10 cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveHeroBanner;

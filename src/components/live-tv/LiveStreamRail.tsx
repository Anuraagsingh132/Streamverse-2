import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import { LiveStreamCard } from './LiveStreamCard';

interface LiveStreamRailProps {
  title: string;
  subtitle: string;
  items: LiveStream[];
  onPlay: (stream: LiveStream) => void;
  onBrowseAll?: () => void;
  compactChannel?: boolean;
  featured?: boolean;
  unitLabel?: string;
}

export const LiveStreamRail: React.FC<LiveStreamRailProps> = ({
  title,
  subtitle,
  items,
  onPlay,
  onBrowseAll,
  compactChannel = false,
  featured = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ensure row starts with scrollLeft = 0 and resets whenever items update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <motion.section
      className="relative py-2 select-none"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Cinematic Ambient Glow for Featured Rail */}
      {featured && (
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 20%, rgba(220, 38, 38, 0.12) 0%, rgba(10, 20, 24, 0.04) 55%, transparent 80%)'
          }}
          aria-hidden="true"
        />
      )}

      {/* Section Header (Uniform max-w-[1600px] px-6 sm:px-10 lg:px-14) */}
      <div className="px-6 sm:px-10 lg:px-14 max-w-[1600px] mx-auto">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {/* High-contrast uppercase eyebrow */}
            <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-300">
              {subtitle}
            </p>

            {/* Clean bold white section title */}
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
          </div>

          {/* Minimal "Browse all ->" pill on the right */}
          {onBrowseAll && (
            <button
              type="button"
              onClick={onBrowseAll}
              className="group flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/35 active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Browse all</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Rail Track with 48px Right Fade Cue */}
      <div className="group/rail relative">
        {/* Left Track Hover Arrow Button */}
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label={`Scroll ${title} left`}
          className="absolute left-3 lg:left-6 top-1/2 z-30 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/85 text-white border border-white/25 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black hover:border-white/40 shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Track Hover Arrow Button */}
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label={`Scroll ${title} right`}
          className="absolute right-3 lg:right-6 top-1/2 z-30 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/85 text-white border border-white/25 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black shadow-2xl cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Scroll Container with 48px Right Fade and Clean Gutter */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto px-6 sm:px-10 lg:px-14 pb-4 scrollbar-none snap-x snap-mandatory max-w-[1600px] mx-auto scroll-pl-6 sm:scroll-pl-10 lg:scroll-pl-14"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            maskImage:
              'linear-gradient(to right, black 0%, black calc(100% - 48px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, black 0%, black calc(100% - 48px), transparent 100%)'
          }}
        >
          {items.map((stream, idx) => {
            const rank = idx + 1;
            return (
              <div
                key={stream.id}
                className={`shrink-0 snap-start relative ${
                  featured
                    ? 'pl-10 sm:pl-12 lg:pl-14 w-[76vw] sm:w-[320px] md:w-[340px] lg:w-[360px]'
                    : compactChannel
                    ? 'w-[60vw] sm:w-[240px] lg:w-[260px]'
                    : 'w-[76vw] sm:w-[320px] md:w-[340px] lg:w-[360px]'
                }`}
              >
                {/* Giant Outlined Rank Number for Featured Highlights (Matching Top 10 Today) */}
                {featured && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-0 flex h-[42vw] sm:h-[180px] lg:h-[200px] items-center select-none z-0"
                  >
                    <span
                      className="font-black leading-none tracking-tighter text-transparent select-none text-[100px] sm:text-[135px] lg:text-[160px]"
                      style={{
                        WebkitTextStroke: '2px rgba(255, 255, 255, 0.45)',
                        fontFamily:
                          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}
                    >
                      {rank}
                    </span>
                  </div>
                )}

                <div className="relative z-10">
                  <LiveStreamCard
                    stream={stream}
                    onPlay={onPlay}
                    compactChannel={compactChannel}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default LiveStreamRail;

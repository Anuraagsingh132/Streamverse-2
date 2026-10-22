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
  unitLabel?: string; // 'matches' | 'channels' | 'broadcasts' | 'fixtures' | 'games'
}

export const LiveStreamRail: React.FC<LiveStreamRailProps> = ({
  title,
  subtitle,
  items,
  onPlay,
  onBrowseAll,
  compactChannel = false,
  unitLabel = 'matches'
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

  const countDisplay = `${items.length} ${items.length === 1 ? unitLabel.replace(/es$|s$/, '') : unitLabel}`;

  return (
    <motion.section
      className="py-5 select-none"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Section Header (1:1 with Movies design system) */}
      <div className="px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {/* White 2px Eyebrow Bar + 11px uppercase label with 0.14em tracking (max 2 items) */}
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-[2px] rounded-full bg-white" aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                {subtitle}
              </p>
            </div>

            {/* Title: 28px with 12px gap, 14px text at 50% white, dropping parentheses */}
            <h2 className="mt-1 text-xl sm:text-2xl lg:text-[28px] font-bold tracking-tight text-white flex items-baseline flex-wrap">
              <span>{title}</span>
              <span className="ml-3 text-sm font-normal text-white/50 tracking-normal">
                {countDisplay}
              </span>
            </h2>
          </div>

          {/* Right Header Controls: Navigation Chevrons + Browse all button */}
          <div className="flex items-center gap-2">
            {/* Header Arrow Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label={`Scroll ${title} left`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label={`Scroll ${title} right`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Browse all button on right */}
            {onBrowseAll && (
              <button
                type="button"
                onClick={onBrowseAll}
                className="group flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white cursor-pointer ml-1"
              >
                <span>Browse all</span>
                <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Rail Track with 48px Right Fade Cue */}
      <div className="group/rail relative">
        {/* Left Track Hover Arrow Button */}
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label={`Scroll ${title} left`}
          className="absolute left-2 lg:left-4 top-1/2 z-30 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Track Hover Arrow Button */}
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label={`Scroll ${title} right`}
          className="absolute right-2 lg:right-4 top-1/2 z-30 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black shadow-2xl cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Scroll Container with 48px Right Fade and Clean Gutter */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto px-5 sm:px-8 lg:px-12 pb-4 scrollbar-none snap-x snap-mandatory max-w-[1600px] mx-auto scroll-pl-5 sm:scroll-pl-8 lg:scroll-pl-12"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 48px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 48px), transparent 100%)'
          }}
        >
          {items.map((stream) => (
            <div
              key={stream.id}
              className={`shrink-0 snap-start ${
                compactChannel
                  ? 'w-[60vw] sm:w-[240px] lg:w-[260px]'
                  : 'w-[72vw] sm:w-[320px] md:w-[340px] lg:w-[360px]'
              }`}
            >
              <LiveStreamCard
                stream={stream}
                onPlay={onPlay}
                compactChannel={compactChannel}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default LiveStreamRail;
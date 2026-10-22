import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LiveStream } from '../../types/liveTv';
import { LiveStreamCard } from './LiveStreamCard';

interface LiveStreamRailProps {
  title: string;
  subtitle: string;
  badge?: string;
  items: LiveStream[];
  onPlay: (stream: LiveStream) => void;
  accentColor?: string; // Optional custom accent color (defaults to rose)
}

export const LiveStreamRail: React.FC<LiveStreamRailProps> = ({
  title,
  subtitle,
  badge,
  items,
  onPlay,
  accentColor = '#e11d48'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
      className="py-6 cv-auto select-none"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Rail Header */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="h-3.5 w-[3px] rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                {subtitle}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                {title}
              </h2>
              {badge ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-zinc-300">
                  {badge}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-400">
                  {items.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rail Track with Hover Nav Arrows */}
      <div className="group/rail relative">
        {/* Left Arrow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 z-30 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/95 shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </motion.button>

        {/* Right Arrow */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 z-30 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black/95 shadow-2xl cursor-pointer"
        >
          <ChevronRight className="h-6 w-6" />
        </motion.button>

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 pb-4 scrollbar-none snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {items.map((stream) => (
            <div
              key={stream.id}
              className="w-[280px] sm:w-[320px] md:w-[340px] lg:w-[360px] shrink-0 snap-start"
            >
              <LiveStreamCard stream={stream} onPlay={onPlay} />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default LiveStreamRail;

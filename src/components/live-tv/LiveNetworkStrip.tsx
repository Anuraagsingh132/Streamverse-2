import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { LiveStream } from '../../types/liveTv';

interface LiveNetworkStripProps {
  title?: string;
  subtitle?: string;
  channels: LiveStream[];
  onPlay: (channel: LiveStream) => void;
  onBrowseAll?: () => void;
}

const cleanChannelName = (name: string): string => {
  return name.replace(/^24\/7\s+/i, '').trim();
};

const getChannelInitials = (name: string): string => {
  const clean = cleanChannelName(name);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return clean.slice(0, 4).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
};

const NetworkTile: React.FC<{
  channel: LiveStream;
  onPlay: (s: LiveStream) => void;
}> = ({ channel, onPlay }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const cleanName = cleanChannelName(channel.name);
  const initials = getChannelInitials(channel.name);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={() => onPlay(channel)}
      className="group flex w-[68px] sm:w-[80px] shrink-0 flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-none [-webkit-tap-highlight-color:transparent]"
      title={`Watch ${cleanName}`}
    >
      <span className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-[20px] sm:rounded-[22px] border border-white/10 bg-[#12151E] opacity-85 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:border-white/30 group-hover:shadow-[0_0_22px_rgba(255,255,255,0.15)]">
        {!imgFailed && channel.poster ? (
          <img
            src={channel.poster}
            alt={cleanName}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2 text-center">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
              {initials}
            </span>
          </div>
        )}
      </span>
      <span className="w-full truncate text-center text-xs font-medium text-zinc-400 group-hover:text-white transition-colors">
        {cleanName}
      </span>
    </motion.button>
  );
};

export const LiveNetworkStrip: React.FC<LiveNetworkStripProps> = ({
  title = '24/7 TV Networks',
  subtitle = '24/7 CHANNELS',
  channels,
  onPlay,
  onBrowseAll
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!channels || channels.length === 0) return null;

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

  return (
    <motion.section
      className="py-2 select-none"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-500">
              {subtitle}
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">
              {title}
            </h2>
          </div>

          {onBrowseAll && (
            <button
              type="button"
              onClick={onBrowseAll}
              className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white cursor-pointer"
            >
              <span>Browse all</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Rail Track with Hover Nav Arrows */}
      <div className="group/rail relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 lg:left-4 top-1/2 z-30 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 lg:right-4 top-1/2 z-30 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover/rail:opacity-100 transition-opacity hover:bg-black shadow-2xl cursor-pointer"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Scrollable Squircle Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto px-5 sm:px-8 lg:px-12 pb-4 scrollbar-none max-w-[1600px] mx-auto scroll-pl-5 sm:scroll-pl-8 lg:scroll-pl-12"
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
          {channels.map((channel) => (
            <NetworkTile
              key={channel.id}
              channel={channel}
              onPlay={onPlay}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default LiveNetworkStrip;

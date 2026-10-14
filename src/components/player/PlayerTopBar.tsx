import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Server,
  Sparkles,
  Check,
  ListVideo
} from 'lucide-react';
import { MediaItem } from '../../types/media';
import { HDHubStream } from '../../services/hdhub';
import { dropdownMenuVariants } from '../../utils/motion';

export interface PlayerTopBarProps {
  showControls: boolean;
  onClose: () => void;
  serverDropdownRef: React.RefObject<HTMLDivElement | null>;
  isServerDropdownOpen: boolean;
  setIsServerDropdownOpen: (open: boolean) => void;
  qualityDropdownRef: React.RefObject<HTMLDivElement | null>;
  isQualityDropdownOpen: boolean;
  setIsQualityDropdownOpen: (open: boolean) => void;
  setIsSettingsMenuOpen: (open: boolean) => void;
  currentServerName: string;
  currentServerId: string;
  serversList: { id: string; name: string; badge?: string; description?: string }[];
  onSwitchServer?: (serverId: string) => void;
  streams: HDHubStream[];
  selectedStreamIndex: number;
  selectedStream: HDHubStream | null;
  setSelectedStreamIndex: (idx: number) => void;
  showToast: (msg: string) => void;
  item: MediaItem;
  isTV: boolean;
  season: number;
  episode: number;
  totalEpisodes: number;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onOpenEpisodeDrawer?: () => void;
  isEpisodeDrawerOpen: boolean;
  playbackError?: boolean;
}

export const PlayerTopBar: React.FC<PlayerTopBarProps> = ({
  showControls,
  onClose,
  serverDropdownRef,
  isServerDropdownOpen,
  setIsServerDropdownOpen,
  qualityDropdownRef,
  isQualityDropdownOpen,
  setIsQualityDropdownOpen,
  setIsSettingsMenuOpen,
  currentServerName,
  currentServerId,
  serversList,
  onSwitchServer,
  streams,
  selectedStreamIndex,
  selectedStream,
  setSelectedStreamIndex,
  showToast,
  item,
  isTV,
  season,
  episode,
  totalEpisodes,
  onPrevEpisode,
  onNextEpisode,
  onOpenEpisodeDrawer,
  isEpisodeDrawerOpen,
  playbackError
}) => {
  // Collapsed state: show only 2160p (or "4K") with the sparkle icon
  const qualityDisplayLabel = useMemo(() => {
    if (!selectedStream) return 'Auto';
    const q = selectedStream.quality;
    if (q === '2160p') return '4K';
    if (q === '1080p') return '1080p';
    if (q === '720p') return '720p';
    if (q === '480p') return '480p';
    return q || 'Auto';
  }, [selectedStream]);

  // Extract release year from release_date or first_air_date
  const releaseYear = useMemo(() => {
    const date = item.release_date || item.first_air_date;
    return date ? date.slice(0, 4) : null;
  }, [item]);

  // When an Auto option is clicked: select first (optimal) stream
  const handleSelectAuto = () => {
    if (streams.length > 0) {
      setSelectedStreamIndex(0);
      setIsQualityDropdownOpen(false);
      showToast('Auto (Best Available)');
    }
  };

  return (
    <div
      className={`absolute top-0 inset-x-0 z-40 transition-all duration-300 ease-out ${
        showControls
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      {/* Top 120px Gradient: 80% black fading to transparent */}
      <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Main Bar: 43px side margin alignment */}
      <div className="relative flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-[43px] pt-4 sm:pt-5 pb-6">
        {/* Left Section: Back Button + Title & Metadata */}
        <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
          {/* 1. Back button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-white/20 hover:text-white active:bg-white/25 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
            title="Back"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
          </button>

          {/* 2. Title & Context */}
          <div className="flex flex-col min-w-0 select-none">
            <h1
              className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              title={item.title}
            >
              {item.title}
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-xs sm:text-[13px] font-medium text-white/75 tracking-wide truncate mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {isTV ? (
                <>
                  <span className="text-primary font-semibold">S{season} · E{episode}</span>
                  {totalEpisodes > 0 && <span>(of {totalEpisodes} eps)</span>}
                </>
              ) : (
                <>
                  {releaseYear && <span>{releaseYear}</span>}
                  {releaseYear && item.vote_average ? <span>•</span> : null}
                  {item.vote_average ? <span>★ {item.vote_average.toFixed(1)}</span> : null}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: (Episodes if TV) + Source selector + Quality selector */}
        <div className="flex items-center gap-3 shrink-0">
          {/* TV Episode navigation pill */}
          {isTV && onOpenEpisodeDrawer && (
            <div className="flex h-10 items-center gap-1 rounded-full border border-white/[0.12] bg-[#0a0c14]/75 px-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              {onPrevEpisode && (
                <button
                  type="button"
                  onClick={onPrevEpisode}
                  disabled={episode <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                  title="Previous Episode"
                  aria-label="Previous Episode"
                >
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenEpisodeDrawer}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  isEpisodeDrawerOpen
                    ? 'bg-white/20 text-white ring-1 ring-white/20'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
                title="Select Episode"
              >
                <ListVideo className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.8} />
                <span className="leading-none">S{season} E{episode}</span>
              </button>
              {onNextEpisode && (
                <button
                  type="button"
                  onClick={onNextEpisode}
                  disabled={episode >= totalEpisodes}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                  title="Next Episode"
                  aria-label="Next Episode"
                >
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          )}

          {/* 3. Source Selector Pill (HDHub) */}
          <div className="relative" ref={serverDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsServerDropdownOpen(!isServerDropdownOpen);
                setIsQualityDropdownOpen(false);
                setIsSettingsMenuOpen(false);
              }}
              className={`flex h-10 items-center gap-2 rounded-full border px-3.5 sm:px-4 text-sm font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                isServerDropdownOpen
                  ? 'bg-white/20 border-white/30 text-white ring-1 ring-white/25'
                  : 'border-white/[0.12] bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
              }`}
              title="Select Streaming Source"
              aria-label="Select Streaming Source"
            >
              <Server className="h-4 w-4 text-primary shrink-0" strokeWidth={1.8} />
              <span className="leading-none whitespace-nowrap">{currentServerName}</span>
              {playbackError && (
                <span
                  className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30 animate-pulse shrink-0"
                  title="Source alert"
                />
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${
                  isServerDropdownOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Source Dropdown Popover (Right-aligned!) */}
            <AnimatePresence>
              {isServerDropdownOpen && (
                <motion.div
                  key="server-dropdown"
                  variants={dropdownMenuVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  data-lenis-prevent
                  className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-2xl border border-white/15 bg-[#111115]/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50"
                >
                  <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Select Source</span>
                    <span className="text-[10px] text-primary font-semibold">{serversList.length} Options</span>
                  </div>
                  <div
                    style={{ maxHeight: '236px', overflowY: 'auto' }}
                    className="max-h-60 overflow-y-auto space-y-1 pr-1 drawer-scroll overscroll-contain server-dropdown-scroll"
                  >
                    {serversList.map((srv) => {
                      const isSelected = srv.id === currentServerId;
                      const isDirect = srv.id === 'hdhub' || srv.id === 'pengu' || srv.id === 'cinemaos';
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => {
                            if (onSwitchServer) onSwitchServer(srv.id);
                            setIsServerDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left cursor-pointer ${
                            isSelected
                              ? 'bg-white/15 text-white font-semibold shadow-sm border border-white/10'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                isDirect
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                  : 'bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              }`}
                              title={isDirect ? 'Direct Stream' : 'Fast Mirror'}
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white truncate">{srv.name}</span>
                                {srv.badge && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-white/10 text-white/60">
                                    {srv.badge}
                                  </span>
                                )}
                              </div>
                              {srv.description && (
                                <span className="text-[10px] text-white/40 truncate mt-0.5">{srv.description}</span>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4. Quality Selector Pill */}
          {streams.length > 0 && (
            <div className="relative" ref={qualityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsQualityDropdownOpen(!isQualityDropdownOpen);
                  setIsServerDropdownOpen(false);
                  setIsSettingsMenuOpen(false);
                }}
                className={`flex h-10 items-center gap-2 rounded-full border px-3.5 sm:px-4 text-sm font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  isQualityDropdownOpen
                    ? 'bg-white/20 border-white/30 text-white ring-1 ring-white/25'
                    : 'border-white/[0.12] bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
                }`}
                title="Select Stream Quality"
                aria-label="Select Stream Quality"
              >
                <Sparkles className="h-4 w-4 text-primary shrink-0" strokeWidth={1.8} />
                <span className="leading-none whitespace-nowrap">{qualityDisplayLabel}</span>
                {selectedStream?.bitrate && (
                  <span className="text-[11px] font-normal text-white/40 hidden xl:inline">
                    · {selectedStream.bitrate}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${
                    isQualityDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Quality Dropdown Popover (Right-aligned!) */}
              <AnimatePresence>
                {isQualityDropdownOpen && (
                  <motion.div
                    key="quality-dropdown"
                    variants={dropdownMenuVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    data-lenis-prevent
                    className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-2xl border border-white/15 bg-[#111115]/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50 drawer-scroll server-dropdown-scroll"
                  >
                    <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Stream Quality</span>
                      <span className="text-[10px] text-primary font-semibold">{streams.length} Available</span>
                    </div>

                    {/* Auto (Best Available) Option */}
                    <button
                      type="button"
                      onClick={handleSelectAuto}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition mb-1 cursor-pointer ${
                        selectedStreamIndex === 0
                          ? 'bg-white/15 text-white font-semibold border border-white/10 shadow-sm'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">Auto</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                            Best Available
                          </span>
                        </div>
                        <span className="text-[10px] text-white/40 mt-0.5">
                          Automatically selects highest bandwidth & web audio stream
                        </span>
                      </div>
                      {selectedStreamIndex === 0 && <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />}
                    </button>

                    {/* Stream Options */}
                    <div className="space-y-1">
                      {streams.map((s, idx) => {
                        const isSelected = idx === selectedStreamIndex;
                        const providerLabel = s.provider === 'Cloudflare R2' ? 'Cloudflare Fast CDN' : s.provider;
                        const speedLabel = s.bitrate ? `Current speed: ${s.bitrate}` : null;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStreamIndex(idx);
                              setIsQualityDropdownOpen(false);
                              showToast(`${s.quality === '2160p' ? '4K' : s.quality} · ${providerLabel}`);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition cursor-pointer ${
                              isSelected
                                ? 'bg-white/15 text-white font-semibold border border-white/10 shadow-sm'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-xs">
                                  {s.quality === '2160p' ? '4K · 2160p' : s.quality}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                                  {s.codec}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium truncate max-w-[130px]">
                                  {providerLabel}
                                </span>
                                {s.isHls && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                                    HLS
                                  </span>
                                )}
                                {s.isWebAudio ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                                    🎧 Web Audio
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                                    ⚠️ {s.audioCodec || 'DDP'} (VLC)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-white/50 flex-wrap">
                                {s.sizeFormatted && <span>{s.sizeFormatted}</span>}
                                {speedLabel && (
                                  <>
                                    {s.sizeFormatted && <span className="text-white/20">•</span>}
                                    <span className="text-white/60">{speedLabel}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

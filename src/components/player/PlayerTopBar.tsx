import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Server,
  Sparkles,
  Check,
  Zap,
  Wifi,
  ListVideo
} from 'lucide-react';
import { MediaItem } from '../../types/media';
import { HDHubStream } from '../../services/hdhub';

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
  isEpisodeDrawerOpen
}) => {
  return (
    <div
      className={`absolute top-4 inset-x-0 sm:top-5 z-40 flex items-center justify-center px-4 transition-all duration-300 ease-out pointer-events-none ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {/* Top-Left Group: Back Button + Server Switcher + Quality Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Back Button matching glass circle style */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/10 bg-[#0a0c14]/75 text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          title="Exit Player (Esc)"
          aria-label="Exit Player"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>

        {/* Server Switcher Pill */}
        <div className="relative" ref={serverDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsServerDropdownOpen(!isServerDropdownOpen);
              setIsQualityDropdownOpen(false);
              setIsSettingsMenuOpen(false);
            }}
            className={`flex h-10 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              isServerDropdownOpen
                ? 'bg-white/20 border-white/25 text-white ring-1 ring-white/20'
                : 'border-white/10 bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
            }`}
            title="Change Video Server"
          >
            <Server className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
            <span className="leading-none whitespace-nowrap">{currentServerName}</span>
            <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${isServerDropdownOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {/* Server Dropdown Popover */}
          {isServerDropdownOpen && (
            <div
              data-lenis-prevent
              className="absolute left-0 top-full mt-2 w-60 sm:w-64 rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50"
            >
              <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Select Server</span>
                <span className="text-[10px] text-primary font-semibold">{serversList.length} Options</span>
              </div>
              <div className="space-y-1">
                {serversList.map((srv) => {
                  const isSelected = srv.id === currentServerId;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        if (onSwitchServer) onSwitchServer(srv.id);
                        setIsServerDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left ${
                        isSelected
                          ? 'bg-white/15 text-white font-semibold shadow-sm border border-white/10'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{srv.name}</span>
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
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quality Pill (Clean main quality label + dimmer host name) */}
        {streams.length > 0 && (
          <div className="relative" ref={qualityDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsQualityDropdownOpen(!isQualityDropdownOpen);
                setIsServerDropdownOpen(false);
                setIsSettingsMenuOpen(false);
              }}
              className={`flex h-10 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isQualityDropdownOpen
                  ? 'bg-white/20 border-white/25 text-white ring-1 ring-white/20'
                  : 'border-white/10 bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
              }`}
              title="Select Stream Quality"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
              <span className="font-bold text-white">{selectedStream?.quality || '1080p'}</span>
              <span className="text-[10px] font-normal text-white/50 hidden sm:inline">
                {selectedStream?.provider === 'Cloudflare R2' ? 'R2' : selectedStream?.provider || ''}
              </span>
              {selectedStream?.bitrate && (
                <span className="text-[10px] font-medium text-amber-400/90 hidden lg:inline">
                  · {selectedStream.bitrate}
                </span>
              )}
              <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${isQualityDropdownOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Quality Dropdown Popover */}
            {isQualityDropdownOpen && (
              <div
                data-lenis-prevent
                className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50 drawer-scroll"
              >
                <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Stream Sources</span>
                  <span className="text-[10px] text-primary font-semibold">{streams.length} Available</span>
                </div>
                <div className="space-y-1">
                  {streams.map((s, idx) => {
                    const isSelected = idx === selectedStreamIndex;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStreamIndex(idx);
                          setIsQualityDropdownOpen(false);
                          showToast(`${s.quality} · ${s.provider}${s.bitrate ? ` (${s.bitrate})` : ''}`);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition ${
                          isSelected
                            ? 'bg-white/15 text-white font-semibold border border-white/10 shadow-sm'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs">{s.quality}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                              {s.codec}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium truncate max-w-[120px]">
                              {s.provider}
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
                            {s.bitrate && (
                              <>
                                {s.sizeFormatted && <span className="text-white/20">•</span>}
                                <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                                  <Zap className="h-2.5 w-2.5 inline shrink-0" />
                                  {s.bitrate}
                                </span>
                              </>
                            )}
                            {s.requiredSpeed && (
                              <>
                                <span className="text-white/20">•</span>
                                <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                                  <Wifi className="h-2.5 w-2.5 inline shrink-0" />
                                  Req {s.requiredSpeed}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top-Center Group: Show Name & Context Pill */}
      <div className="hidden md:flex items-center">
        <div className="flex h-10 sm:h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0a0c14]/75 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150">
          <h2 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate max-w-xs lg:max-w-md">
            {item.title}
          </h2>
          {isTV && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-xs font-semibold text-primary/90 whitespace-nowrap">
                S{season} · E{episode}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Top-Right Group: Episode Switcher Pill */}
      {isTV && (
        <div className="flex h-10 sm:h-11 items-center gap-1 rounded-full border border-white/10 bg-[#0a0c14]/75 px-1.5 sm:px-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150">
          {/* Previous Episode */}
          <button
            type="button"
            onClick={onPrevEpisode}
            disabled={episode <= 1}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
            title="Previous Episode"
            aria-label="Previous Episode"
          >
            <ChevronLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.8} />
          </button>

          {/* S1 E1 Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenEpisodeDrawer}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
              isEpisodeDrawerOpen
                ? 'bg-white/20 text-white border border-white/20 ring-1 ring-white/20 shadow-sm'
                : 'bg-white/[0.08] text-white/90 border border-white/10 hover:bg-white/15 hover:text-white shadow-sm'
            }`}
            title="Select Episode"
          >
            <ListVideo className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.8} />
            <span className="leading-none">S{season} E{episode}</span>
          </button>

          {/* Next Episode */}
          <button
            type="button"
            onClick={onNextEpisode}
            disabled={episode >= totalEpisodes}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
            title="Next Episode"
            aria-label="Next Episode"
          >
            <ChevronRight className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

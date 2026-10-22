import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  Server,
  Radio,
  Clapperboard,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveStream } from '../../types/liveTv';
import { cleanStreamTitle, getProviderBadge } from '../../services/liveTv';

interface CinemaOSLivePlayerProps {
  stream: LiveStream;
  onClose: () => void;
}

export const CinemaOSLivePlayer: React.FC<CinemaOSLivePlayerProps> = ({ stream, onClose }) => {
  const [selectedSubstreamId, setSelectedSubstreamId] = useState<number | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [isFeedDropdownOpen, setIsFeedDropdownOpen] = useState<boolean>(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const feedDropdownRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll while player is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Controls auto-hide timer (fades after 4s of mouse inactivity)
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isFeedDropdownOpen) {
        setShowControls(false);
      }
    }, 4000);
  }, [isFeedDropdownOpen]);

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Click outside to close feed dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (feedDropdownRef.current && !feedDropdownRef.current.contains(e.target as Node)) {
        setIsFeedDropdownOpen(false);
      }
    };
    if (isFeedDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFeedDropdownOpen]);

  // Close dropdown when user clicks into iframe (window blur)
  useEffect(() => {
    if (!isFeedDropdownOpen) return;
    const handleBlur = () => setIsFeedDropdownOpen(false);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isFeedDropdownOpen]);

  // Keyboard shortcuts (Escape = close, F = fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFeedDropdownOpen) {
          setIsFeedDropdownOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFeedDropdownOpen]);

  // Resolve active embed iframe URL (supports substreams)
  const activeEmbedUrl = useMemo(() => {
    if (selectedSubstreamId && stream.substreams) {
      const sub = stream.substreams.find((s) => s.id === selectedSubstreamId);
      if (sub?.iframe) return sub.iframe;
    }
    return stream.iframe || null;
  }, [stream, selectedSubstreamId]);

  // Current active feed label
  const activeFeedLabel = useMemo(() => {
    if (selectedSubstreamId && stream.substreams) {
      const sub = stream.substreams.find((s) => s.id === selectedSubstreamId);
      return sub?.source_tag || sub?.name || `Feed #${sub?.id}`;
    }
    return stream.source_tag || stream.tag || 'Primary Feed';
  }, [stream, selectedSubstreamId]);

  const provider = getProviderBadge(stream.source_tag, stream.tag);
  const displayTitle = cleanStreamTitle(stream.name);
  const is247 = stream.always_live === 1 || stream.always_live === true;

  // All available feeds (main + substreams) for feed switcher
  const allFeeds = useMemo(() => {
    const feeds: { id: number | null; label: string; badge?: string }[] = [
      {
        id: null,
        label: stream.source_tag || 'Primary',
        badge: 'Main Feed'
      }
    ];
    if (stream.substreams) {
      stream.substreams.forEach((sub) => {
        feeds.push({
          id: sub.id,
          label: sub.source_tag || sub.name || `Feed #${sub.id}`,
          badge: sub.name || undefined
        });
      });
    }
    return feeds;
  }, [stream]);

  const hasMultipleFeeds = allFeeds.length > 1;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Live Player - ${displayTitle}`}
      tabIndex={-1}
      onMouseMove={resetHideTimer}
      onPointerMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className="fixed inset-0 z-[9999] bg-black text-white w-screen h-screen overflow-hidden select-none animate-in fade-in duration-200 focus:outline-none"
    >
      {/* 100% Full-bleed Embed Player without anything pushing or cutting it */}
      <div className="absolute inset-0 w-full h-full bg-black">
        {activeEmbedUrl ? (
          <>
            {/* Loading Spinner behind iframe until loaded */}
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 space-y-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-white/90">
                    Connecting to relay...
                  </p>
                  <p className="text-xs text-white/40">
                    {activeFeedLabel} · {provider.label}
                  </p>
                </div>
              </div>
            )}

            <iframe
              key={activeEmbedUrl}
              src={activeEmbedUrl}
              title={displayTitle}
              onLoad={() => setIframeLoaded(true)}
              className="absolute inset-0 w-full h-full border-0 bg-black"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-center p-6 text-white/60">
            <Clapperboard className="h-12 w-12 text-rose-500/40 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-white mb-1">Broadcast Unavailable</h3>
            <p className="text-xs text-white/40 max-w-sm">
              The relay provider has not attached an active embed URL to this broadcast.
            </p>
          </div>
        )}
      </div>

      {/* Floating Top Controls (Auto-hides after 4s) — Matches Movies CinemaOSPlayer exactly */}
      <div
        onMouseEnter={() => {
          setShowControls(true);
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        }}
        onMouseLeave={resetHideTimer}
        className={`absolute top-0 inset-x-0 z-50 transition-all duration-300 ease-out ${
          showControls || isFeedDropdownOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Top Gradient Scrim */}
        <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Main Bar */}
        <div className="relative flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-[43px] pt-4 sm:pt-5 pb-6">
          {/* Left: Back Button + Title & Context */}
          <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-white/20 hover:text-white active:bg-white/25 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
              title="Back (Esc)"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
            </button>

            <div className="flex flex-col min-w-0 select-none">
              <h1
                className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                title={displayTitle}
              >
                {displayTitle}
              </h1>
              <div className="hidden sm:flex items-center gap-2 text-xs sm:text-[13px] font-medium text-white/75 tracking-wide truncate mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                {is247 ? (
                  <>
                    <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <Radio className="h-3 w-3" />
                      24/7 Channel
                    </span>
                    <span>•</span>
                    <span>{stream.category_name}</span>
                  </>
                ) : (
                  <>
                    <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Live
                    </span>
                    <span>•</span>
                    <span>{stream.category_name}</span>
                    <span>•</span>
                    <span>{provider.label}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Feed Switcher Pill (matches Movies Server Switcher exactly) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Feed Switcher Pill & Dropdown */}
            <div className="relative" ref={feedDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFeedDropdownOpen((prev) => !prev)}
                className={`flex h-10 items-center gap-2 rounded-full border px-3.5 sm:px-4 text-sm font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer ${
                  isFeedDropdownOpen
                    ? 'bg-white/20 border-white/30 text-white ring-1 ring-white/25'
                    : 'border-white/[0.12] bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
                }`}
                title={hasMultipleFeeds ? 'Change Feed Source' : 'Current Feed'}
                aria-label="Change Feed Source"
              >
                <Server className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.8} />
                <span className="leading-none whitespace-nowrap">{activeFeedLabel}</span>
                {hasMultipleFeeds && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${
                      isFeedDropdownOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                )}
              </button>

              {/* Feed Dropdown Popover (Right-aligned, matching Movies server dropdown) */}
              <AnimatePresence>
                {isFeedDropdownOpen && hasMultipleFeeds && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 z-50 w-64 sm:w-72 rounded-2xl border border-white/15 bg-[#111115]/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
                  >
                    <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                        Select Feed
                      </span>
                      <span className="text-[10px] text-rose-400 font-semibold">
                        {allFeeds.length} Available
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                      {allFeeds.map((feed) => {
                        const isSelected = feed.id === selectedSubstreamId;
                        return (
                          <button
                            key={feed.id ?? 'main'}
                            type="button"
                            onClick={() => {
                              setSelectedSubstreamId(feed.id);
                              setIframeLoaded(false);
                              setIsFeedDropdownOpen(false);
                              resetHideTimer();
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all duration-150 text-left ${
                              isSelected
                                ? 'bg-white/15 text-white ring-1 ring-white/20'
                                : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                            } cursor-pointer`}
                          >
                            <div className="flex flex-col min-w-0 gap-0.5">
                              <span className="font-semibold text-[13px] truncate">
                                {feed.label}
                              </span>
                              {feed.badge && (
                                <span className="text-[10px] text-white/40 truncate">
                                  {feed.badge}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-rose-400 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinemaOSLivePlayer;

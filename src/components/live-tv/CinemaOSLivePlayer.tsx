import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  Maximize,
  Minimize,
  ExternalLink,
  X,
  AlertCircle
} from 'lucide-react';
import { LiveStream } from '../../types/liveTv';

interface CinemaOSLivePlayerProps {
  stream: LiveStream;
  onClose: () => void;
}

export const CinemaOSLivePlayer: React.FC<CinemaOSLivePlayerProps> = ({ stream, onClose }) => {
  const [selectedSubstreamId, setSelectedSubstreamId] = useState<number | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      setShowControls(false);
    }, 4000);
  }, []);

  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts (Escape = close, F = fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, toggleFullscreen]);

  // Sync fullscreen change state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Resolve active embed iframe URL (supports substreams)
  const activeEmbedUrl = useMemo(() => {
    if (selectedSubstreamId && stream.substreams) {
      const sub = stream.substreams.find((s) => s.id === selectedSubstreamId);
      if (sub?.iframe) return sub.iframe;
    }
    return stream.iframe || null;
  }, [stream, selectedSubstreamId]);

  const activeFeedLabel = useMemo(() => {
    if (selectedSubstreamId && stream.substreams) {
      const sub = stream.substreams.find((s) => s.id === selectedSubstreamId);
      return sub?.source_tag || sub?.name || `Feed #${sub?.id}`;
    }
    return stream.source_tag || stream.tag || 'Primary Feed';
  }, [stream, selectedSubstreamId]);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden"
    >
      {/* Dynamic Ambient Glow Behind Player */}
      {stream.poster && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <img
            src={stream.poster}
            alt=""
            className="h-full w-full object-cover blur-[80px] scale-125"
          />
        </div>
      )}

      {/* Floating Top Controls Bar (CinemaOS Style) */}
      <div
        className={`absolute top-0 inset-x-0 z-50 transition-all duration-300 ease-out ${
          showControls
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        {/* Top Gradient Scrim */}
        <div className="absolute inset-x-0 top-0 h-28 sm:h-36 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 pt-4 sm:pt-6 pb-6">
          {/* Left Section: Back Button & Title */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.1] text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
              title="Close Player (Esc)"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
            </button>

            <div className="flex flex-col min-w-0 select-none">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  {stream.always_live ? '24/7 Channel' : 'Live Satellite Feed'}
                </span>
                <span className="text-white/40">·</span>
                <span className="text-xs font-semibold text-zinc-300">
                  {stream.category_name}
                </span>
              </div>
              <h1
                className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight truncate drop-shadow-md"
                title={stream.name}
              >
                {stream.name}
              </h1>
            </div>
          </div>

          {/* Center / Right Section: Substream Switcher & Player Tools */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Substream Selector Pills (if multiple feeds available) */}
            {stream.substreams && stream.substreams.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-md mr-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubstreamId(null);
                    setIframeLoaded(false);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    selectedSubstreamId === null
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Main ({stream.source_tag || 'Primary'})
                </button>
                {stream.substreams.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubstreamId(sub.id);
                      setIframeLoaded(false);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                      selectedSubstreamId === sub.id
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {sub.source_tag || sub.name || `Feed #${sub.id}`}
                  </button>
                ))}
              </div>
            )}

            {/* Popout Link */}
            {activeEmbedUrl && (
              <a
                href={activeEmbedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/[0.08] text-white/90 backdrop-blur-xl transition hover:bg-white/20 active:scale-95 cursor-pointer"
                title="Open stream in external tab"
              >
                <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/[0.08] text-white/90 backdrop-blur-xl transition hover:bg-white/20 active:scale-95 cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/[0.08] text-white/90 backdrop-blur-xl transition hover:bg-rose-600 active:scale-95 cursor-pointer"
              title="Close player"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile-Only Feed Selector Pill Rail */}
        {stream.substreams && stream.substreams.length > 0 && (
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto px-4 pb-2 scrollbar-none">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">
              Feeds:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedSubstreamId(null);
                setIframeLoaded(false);
              }}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                selectedSubstreamId === null
                  ? 'bg-rose-600 text-white'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              Main ({stream.source_tag || 'Primary'})
            </button>
            {stream.substreams.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setSelectedSubstreamId(sub.id);
                  setIframeLoaded(false);
                }}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                  selectedSubstreamId === sub.id
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {sub.source_tag || sub.name || `Feed #${sub.id}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Video Viewport (Full-Bleed Responsive Canvas) */}
      <div className="relative z-10 flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
        {activeEmbedUrl ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Loading Indicator behind iframe until loaded */}
            {!iframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 space-y-3">
                <div className="h-10 w-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold text-zinc-400">
                  Connecting to {activeFeedLabel} relay...
                </p>
              </div>
            )}

            <iframe
              key={activeEmbedUrl}
              src={activeEmbedUrl}
              title={stream.name}
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-rose-500" />
            <h3 className="text-base font-bold text-white">Broadcast Stream Unavailable</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              The broadcast relay provider has not attached an active embed URL to this event.
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Telemetry Bar (CinemaOS Style) */}
      <div
        className={`absolute bottom-0 inset-x-0 z-50 transition-all duration-300 ease-out ${
          showControls
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        {/* Bottom Gradient Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-24 sm:h-28 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 md:px-8 lg:px-12 pb-4 sm:pb-6 pt-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-zinc-200">Streamverse Live Relay</span>
            <span className="text-zinc-600">·</span>
            <span>Feed: <strong className="text-white">{activeFeedLabel}</strong></span>
            <span className="hidden sm:inline text-zinc-600">·</span>
            <span className="hidden sm:inline text-emerald-400 font-medium">1080p60 · Ultra-Low Latency</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
              {stream.tag || stream.category_name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinemaOSLivePlayer;

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Clapperboard, 
  ListVideo,
  Play,
  Check
} from 'lucide-react';
import { MediaItem, EpisodeItem } from '../types/media';

export interface CinemaOSPlayerProps {
  item: MediaItem | null;
  initialSeason?: number;
  initialEpisode?: number;
  episodesList?: EpisodeItem[];
  onClose: () => void;
  onEpisodeChange?: (season: number, episode: number) => void;
}

export const CinemaOSPlayer: React.FC<CinemaOSPlayerProps> = ({
  item,
  initialSeason = 1,
  initialEpisode = 1,
  episodesList = [],
  onClose,
  onEpisodeChange
}) => {
  const [season, setSeason] = useState<number>(initialSeason || 1);
  const [episode, setEpisode] = useState<number>(initialEpisode || 1);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState<boolean>(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedEpRef = useRef<HTMLButtonElement | null>(null);
  const seasonDropdownRef = useRef<HTMLDivElement | null>(null);
  const episodeListRef = useRef<HTMLDivElement | null>(null);

  // Auto-hide floating controls after 4 seconds of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (!isEpisodeDrawerOpen) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000); // 4 seconds
    }
  }, [isEpisodeDrawerOpen]);

  // Start hide timer on mount & when episode drawer state changes
  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  // Auto-scroll to selected episode when drawer opens
  useEffect(() => {
    if (isEpisodeDrawerOpen) {
      const timer = setTimeout(() => {
        selectedEpRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isEpisodeDrawerOpen, episode, season]);

  // Click outside to close season dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(e.target as Node)) {
        setIsSeasonDropdownOpen(false);
      }
    };
    if (isSeasonDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSeasonDropdownOpen]);

  // Auto-hide drawer if user clicks directly into the cross-origin video iframe (triggers window blur)
  useEffect(() => {
    if (!isEpisodeDrawerOpen) return;
    const handleBlur = () => {
      setIsEpisodeDrawerOpen(false);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isEpisodeDrawerOpen]);

  // Sync initial props
  useEffect(() => {
    if (initialSeason) setSeason(initialSeason);
    if (initialEpisode) setEpisode(initialEpisode);
  }, [initialSeason, initialEpisode, item?.id]);

  // Lock body scroll while player is mounted
  useEffect(() => {
    if (!item) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [item]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (isEpisodeDrawerOpen) {
          setIsEpisodeDrawerOpen(false);
        } else {
          onClose();
        }
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEpisodeDrawerOpen, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isAnime = item?.media_type === 'anime';
  const isTV = item?.media_type === 'tv' || isAnime;
  const tmdbId = item?.tmdbId || item?.id || '';

  // Max seasons and episodes
  const totalSeasons = useMemo(() => {
    if (!item) return 1;
    if (item.seasons) return item.seasons;
    if (item.seasons_list?.length) return item.seasons_list.length;
    return 1;
  }, [item]);

  const totalEpisodesForSeason = useMemo(() => {
    if (!item) return 12;
    if (episodesList.length > 0) return episodesList.length;
    if (item.episodes) return item.episodes;
    return 24;
  }, [item, episodesList]);

  const handleSelectEpisode = (epNum: number, sNum: number = season) => {
    setSeason(sNum);
    setEpisode(epNum);
    setIsEpisodeDrawerOpen(false);
    if (onEpisodeChange) {
      onEpisodeChange(sNum, epNum);
    }
  };

  const handlePrevEpisode = () => {
    if (episode > 1) {
      handleSelectEpisode(episode - 1, season);
    }
  };

  const handleNextEpisode = () => {
    if (episode < totalEpisodesForSeason) {
      handleSelectEpisode(episode + 1, season);
    }
  };

  // Construct iframe embed URL based on CinemaOS Player documentation
  const embedUrl = useMemo(() => {
    if (!item || !tmdbId) return '';

    if (!isTV) {
      // Movie: https://cinemaos.tech/player/{tmdb_id}?theme=ffffff
      return `https://cinemaos.tech/player/${tmdbId}?theme=ffffff`;
    }
    // TV Show / Anime: https://cinemaos.tech/player/{tmdb_id}/{season}/{episode}?theme=ffffff
    return `https://cinemaos.tech/player/${tmdbId}/${season}/${episode}?theme=ffffff`;
  }, [item, tmdbId, isTV, season, episode]);

  if (!item) return null;

  return (
    <div 
      onMouseMove={resetHideTimer}
      onPointerMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className="fixed inset-0 z-[9999] bg-black text-white w-screen h-screen overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* 100% Full-bleed Embed Player without anything pushing or cutting it */}
      <div className="absolute inset-0 w-full h-full bg-black">
        {embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={item.title}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allowFullScreen
            referrerPolicy="origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-center p-6 text-white/60">
            <Clapperboard className="h-12 w-12 text-primary/40 mb-3 animate-pulse" />
            <p className="text-sm font-medium">Preparing CinemaOS Player stream...</p>
          </div>
        )}
      </div>

      {/* Floating Series / Episode Navigation Pill on Top of Player (Auto-hides after 4s) */}
      {isTV && (
        <div
          onMouseEnter={() => {
            setShowControls(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={resetHideTimer}
          className={`absolute top-4 right-4 sm:top-5 sm:right-6 z-50 transition-all duration-300 ease-out ${
            showControls || isEpisodeDrawerOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="flex h-10 sm:h-11 items-center gap-1 rounded-full border border-white/10 bg-[#0a0c14]/65 px-1.5 sm:px-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150">
            {/* Previous Episode Arrow Button */}
            <button
              type="button"
              onClick={handlePrevEpisode}
              disabled={episode <= 1}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black/50 disabled:opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              title="Previous Episode"
              aria-label="Previous Episode"
            >
              <ChevronLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.8} />
            </button>

            {/* Center "S1 E1" in lighter inner pill */}
            <button
              type="button"
              onClick={() => setIsEpisodeDrawerOpen(!isEpisodeDrawerOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black/50 ${
                isEpisodeDrawerOpen 
                  ? 'bg-white/20 text-white border border-white/20 ring-1 ring-white/20 shadow-sm' 
                  : 'bg-white/[0.08] text-white/90 border border-white/10 hover:bg-white/15 hover:text-white shadow-sm'
              }`}
              title="Select Season & Episode"
              aria-label="Select Season & Episode"
            >
              <ListVideo className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.8} />
              <span className="leading-none">S{season} E{episode}</span>
            </button>

            {/* Next Episode Arrow Button */}
            <button
              type="button"
              onClick={handleNextEpisode}
              disabled={episode >= totalEpisodesForSeason}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black/50 disabled:opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              title="Next Episode"
              aria-label="Next Episode"
            >
              <ChevronRight className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {/* Dimmed backdrop covering the player to hide episode drawer when clicking inside player */}
      {isTV && isEpisodeDrawerOpen && (
        <div 
          onClick={() => {
            setIsEpisodeDrawerOpen(false);
            resetHideTimer();
          }}
          className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-all duration-300 animate-in fade-in cursor-pointer"
          aria-label="Close episode selector and return to player"
          title="Click to resume playback"
        />
      )}

      {/* Episode Selection Drawer for Series */}
      {isTV && isEpisodeDrawerOpen && (
        <aside 
          data-lenis-prevent
          className="absolute right-0 top-0 bottom-0 z-50 w-full max-w-sm sm:max-w-md h-full max-h-screen bg-zinc-950/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 pointer-events-auto"
        >
          {/* Drawer Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <ListVideo className="h-4 w-4 text-primary" strokeWidth={1.8} />
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Select Episode
                </h2>
              </div>

              {/* Season Selector Dropdown next to SELECT EPISODE */}
              {totalSeasons > 1 && (
                <div className="relative" ref={seasonDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                    className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    title="Switch Season"
                  >
                    <span>S{season}</span>
                    <ChevronDown className={`h-3 w-3 text-white/70 transition-transform duration-200 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSeasonDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                      <div 
                        data-lenis-prevent
                        onWheel={(e) => e.stopPropagation()}
                        className="max-h-48 overflow-y-auto space-y-0.5 drawer-scroll"
                      >
                        {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((sNum) => (
                          <button
                            key={sNum}
                            type="button"
                            onClick={() => {
                              setSeason(sNum);
                              setIsSeasonDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition ${
                              season === sNum
                                ? 'bg-white/15 text-white font-bold'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span>Season {sNum}</span>
                            {season === sNum && <Check className="h-3.5 w-3.5 text-primary" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Close Button matching glass circle style */}
            <button
              type="button"
              onClick={() => setIsEpisodeDrawerOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Season Selector Tabs */}
          {totalSeasons > 1 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-2.5 border-b border-white/10 scrollbar-hide">
              {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((sNum) => (
                <button
                  key={sNum}
                  type="button"
                  onClick={() => setSeason(sNum)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 transition ${
                    season === sNum
                      ? 'bg-primary text-black font-bold shadow-sm'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  Season {sNum}
                </button>
              ))}
            </div>
          )}

          {/* Episodes List */}
          <div 
            ref={episodeListRef}
            data-lenis-prevent
            onWheel={(e) => e.stopPropagation()}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 drawer-scroll"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.25) transparent',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            {episodesList.length > 0 ? (
              episodesList.map((ep) => {
                const isSelected = ep.episode_number === episode;
                const isStarted = ep.episode_number <= episode;
                const progressPercent = ep.episode_number < episode ? 100 : ep.episode_number === episode ? 35 : 0;

                return (
                  <button
                    key={ep.id || ep.episode_number}
                    ref={isSelected ? selectedEpRef : null}
                    type="button"
                    onClick={() => handleSelectEpisode(ep.episode_number)}
                    className={`group w-full flex items-start gap-3.5 p-3 rounded-xl text-left transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      isSelected
                        ? 'bg-white/[0.09] border border-white/15 shadow-sm'
                        : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10'
                    }`}
                  >
                    {/* 16:9 Larger Thumbnail */}
                    <div className="relative aspect-video w-32 sm:w-36 shrink-0 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shadow-md">
                      <img
                        src={ep.still_path || item.backdrop_path || item.poster_path}
                        alt={ep.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Hover / Tap Play Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition-transform group-hover:scale-105">
                          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                        </span>
                      </div>

                      {/* Progress Bar for Started Episodes */}
                      {isStarted && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60 overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${progressPercent}%` }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Text Details Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                          {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                        </h3>
                        {isSelected && (
                          <span className="shrink-0 rounded bg-primary/20 border border-primary/40 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                            NOW PLAYING
                          </span>
                        )}
                      </div>

                      {ep.runtime && (
                        <p className="text-[11px] font-medium text-white/45 mt-0.5">
                          {ep.runtime} min
                        </p>
                      )}

                      {ep.overview && (
                        <p className="text-xs text-white/60 leading-relaxed line-clamp-2 md:line-clamp-3 mt-1">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {Array.from({ length: totalEpisodesForSeason }, (_, i) => i + 1).map((epNum) => {
                  const isSelected = epNum === episode;
                  return (
                    <button
                      key={epNum}
                      ref={isSelected ? selectedEpRef : null}
                      type="button"
                      onClick={() => handleSelectEpisode(epNum)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                        isSelected
                          ? 'border-primary/50 bg-primary/20 text-primary font-bold shadow-lg'
                          : 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/15'
                      }`}
                    >
                      <span className="text-xs font-bold">E{epNum}</span>
                      <span className="text-[9px] text-white/50 mt-0.5">Ep {epNum}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default CinemaOSPlayer;

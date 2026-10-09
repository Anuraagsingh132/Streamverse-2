import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Clapperboard, 
  ListVideo,
  Play,
  Check,
  Server
} from 'lucide-react';
import { MediaItem, EpisodeItem } from '../types/media';
import { HDHubPlayer } from './HDHubPlayer';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useUserSettings } from '../hooks/useUserSettings';

interface ServerOption {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  getUrl: (id: string | number, isTV: boolean, season: number, episode: number) => string;
}

// Anime-specific streaming servers (MegaPlay Sub & Dub powered by AniList ID + Episode)
export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'megaplay-sub',
    name: 'MegaPlay (Sub)',
    badge: 'Anime · Subbed',
    description: 'Fast HD Japanese audio with subtitles (Default)',
    getUrl: (id, _isTV, _season, episode) => `https://megaplay.buzz/stream/ani/${id}/${episode}/sub`
  },
  {
    id: 'megaplay-dub',
    name: 'MegaPlay (Dub)',
    badge: 'Anime · English Dub',
    description: 'English dubbed anime stream',
    getUrl: (id, _isTV, _season, episode) => `https://megaplay.buzz/stream/ani/${id}/${episode}/dub`
  },
  {
    id: 'cinemaos',
    name: 'CinemaOS',
    badge: 'Mirror 1 · HD',
    description: 'CinemaOS official embed player',
    getUrl: (tmdbId, isTV, season, episode) => {
      if (!isTV) {
        return `https://cinemaos.tech/player/${tmdbId}?theme=ffffff`;
      }
      return `https://cinemaos.tech/player/${tmdbId}/${season}/${episode}?theme=ffffff`;
    }
  },
  {
    id: 'hdhub',
    name: 'HDHub',
    badge: 'Direct Stream · HD',
    description: 'Direct stream extractor fallback',
    getUrl: () => ''
  },
  {
    id: 'pengu',
    name: 'Pengu',
    badge: 'Direct & HLS · Fast',
    description: 'Pengu cloud streams fallback',
    getUrl: () => ''
  }
];

// Configurable video streaming servers list for Movies and TV Shows
export const MOVIE_TV_SERVERS: ServerOption[] = [
  {
    id: 'hdhub',
    name: 'HDHub',
    badge: 'Direct Stream · HD',
    description: 'High-speed PixelDrain & Cloudflare direct streams (Default)',
    getUrl: () => ''
  },
  {
    id: 'pengu',
    name: 'Pengu',
    badge: 'Direct & HLS · Fast',
    description: 'Pengu cloud streams with native HLS and multi-source mirrors',
    getUrl: () => ''
  },
  {
    id: 'cinemaos',
    name: 'CinemaOS',
    badge: 'Server 1 · HD',
    description: 'CinemaOS official embed player',
    getUrl: (tmdbId, isTV, season, episode) => {
      if (!isTV) {
        return `https://cinemaos.tech/player/${tmdbId}?theme=ffffff`;
      }
      return `https://cinemaos.tech/player/${tmdbId}/${season}/${episode}?theme=ffffff`;
    }
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    badge: 'Mirror 1',
    description: 'Alternative fast streaming mirror',
    getUrl: (tmdbId, isTV, season, episode) => {
      if (!isTV) {
        return `https://vidsrc.to/embed/movie/${tmdbId}`;
      }
      return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
    }
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    badge: 'Mirror 2',
    description: 'Multi-source reliable backup server',
    getUrl: (tmdbId, isTV, season, episode) => {
      if (!isTV) {
        return `https://player.autoembed.cc/embed/movie/${tmdbId}`;
      }
      return `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}`;
    }
  }
];

const SERVERS = MOVIE_TV_SERVERS;

class HDHubErrorBoundary extends React.Component<
  { children: React.ReactNode; onFallback: () => void },
  { hasError: boolean; error: string | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Player rendering error' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('HDHub Player Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white">
          <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <X className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Playback Component Error</h3>
          <p className="text-xs text-white/60 max-w-sm mt-1">{this.state.error}</p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onFallback();
            }}
            className="mt-4 px-4 py-2 rounded-full bg-primary text-black font-semibold text-xs hover:brightness-110 active:scale-95 transition"
          >
            Switch to CinemaOS Server
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const { settings } = useUserSettings();
  const [season, setSeason] = useState<number>(initialSeason || 1);
  const [episode, setEpisode] = useState<number>(initialEpisode || 1);
  const [selectedServerId, setSelectedServerId] = useState<string>(() => {
    if (item?.media_type === 'anime') {
      return 'megaplay-sub';
    }
    return settings.defaultServer || 'hdhub';
  });

  useEffect(() => {
    if (item?.media_type === 'anime') {
      setSelectedServerId((prev) => (prev === 'megaplay-dub' ? 'megaplay-dub' : 'megaplay-sub'));
    } else {
      setSelectedServerId(settings.defaultServer || 'hdhub');
    }
  }, [item?.id, item?.media_type, settings.defaultServer]);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState<boolean>(false);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState<boolean>(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const modalRef = useFocusTrap<HTMLDivElement>(Boolean(item));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedEpRef = useRef<HTMLButtonElement | null>(null);
  const seasonDropdownRef = useRef<HTMLDivElement | null>(null);
  const serverDropdownRef = useRef<HTMLDivElement | null>(null);
  const episodeListRef = useRef<HTMLDivElement | null>(null);

  // Auto-hide floating controls after 4 seconds of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (!isEpisodeDrawerOpen && !isServerDropdownOpen) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000); // 4 seconds
    }
  }, [isEpisodeDrawerOpen, isServerDropdownOpen]);

  // Start hide timer on mount & when menus state change
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

  // Click outside to close server dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target as Node)) {
        setIsServerDropdownOpen(false);
      }
    };
    if (isServerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isServerDropdownOpen]);

  // Auto-hide menus if user clicks directly into the cross-origin video iframe (triggers window blur)
  useEffect(() => {
    if (!isEpisodeDrawerOpen && !isServerDropdownOpen) return;
    const handleBlur = () => {
      setIsEpisodeDrawerOpen(false);
      setIsServerDropdownOpen(false);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isEpisodeDrawerOpen, isServerDropdownOpen]);

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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (isServerDropdownOpen) {
          setIsServerDropdownOpen(false);
        } else if (isEpisodeDrawerOpen) {
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
  }, [isEpisodeDrawerOpen, isServerDropdownOpen, onClose, toggleFullscreen]);

  const isAnime = item?.media_type === 'anime';
  const isTV = item?.media_type === 'tv' || isAnime;
  const tmdbId = item?.tmdbId || item?.id || '';

  const activeServers = useMemo(() => (isAnime ? ANIME_SERVERS : MOVIE_TV_SERVERS), [isAnime]);

  // Current active server configuration
  const currentServer = useMemo(() => {
    return activeServers.find((s) => s.id === selectedServerId) || activeServers[0];
  }, [activeServers, selectedServerId]);

  // Available seasons (including Season 0 / Specials if present in seasons_list)
  const availableSeasons = useMemo<{ seasonNumber: number; label: string; episodeCount?: number }[]>(() => {
    if (!item) return [{ seasonNumber: 1, label: 'Season 1' }];
    if (item.seasons_list && item.seasons_list.length > 0) {
      return item.seasons_list.map((s) => ({
        seasonNumber: s.season_number,
        label: s.name || (s.season_number === 0 ? 'Specials' : `Season ${s.season_number}`),
        episodeCount: s.episode_count,
      }));
    }
    const count = item.seasons || 1;
    return Array.from({ length: count }, (_, i) => ({
      seasonNumber: i + 1,
      label: `Season ${i + 1}`,
    }));
  }, [item]);

  const totalSeasons = availableSeasons.length;

  const totalEpisodesForSeason = useMemo(() => {
    if (!item) return 12;
    if (episodesList.length > 0) return episodesList.length;
    const currentSeasonObj = availableSeasons.find((s) => s.seasonNumber === season);
    if (currentSeasonObj?.episodeCount) return currentSeasonObj.episodeCount;
    if (item.episodes) return item.episodes;
    return 24;
  }, [item, episodesList, availableSeasons, season]);

  const handleSelectSeason = (sNum: number) => {
    setSeason(sNum);
    setEpisode(1);
    setIsSeasonDropdownOpen(false);
    if (onEpisodeChange) {
      onEpisodeChange(sNum, 1);
    }
  };

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

  // Construct iframe embed URL based on selected server configuration
  const isDirectPlayer = selectedServerId === 'hdhub' || selectedServerId === 'pengu';
  const embedUrl = useMemo(() => {
    if (!item || isDirectPlayer) return '';
    // MegaPlay for anime takes item.id (AniList ID) directly
    if (isAnime && (selectedServerId === 'megaplay-sub' || selectedServerId === 'megaplay-dub')) {
      return currentServer.getUrl(item.id, isTV, season, episode);
    }
    if (!tmdbId) return '';
    return currentServer.getUrl(tmdbId, isTV, season, episode);
  }, [item, isAnime, selectedServerId, currentServer, isTV, season, episode, isDirectPlayer, tmdbId]);

  if (!item) return null;

  return (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Video Player - ${item.title}`}
      tabIndex={-1}
      onMouseMove={resetHideTimer}
      onPointerMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className="fixed inset-0 z-[9999] bg-black text-white w-screen h-screen overflow-hidden select-none animate-in fade-in duration-200 focus:outline-none"
    >
      {/* 100% Full-bleed Embed / Direct Player without anything pushing or cutting it */}
      <div className="absolute inset-0 w-full h-full bg-black">
        {isDirectPlayer ? (
          <HDHubErrorBoundary onFallback={() => setSelectedServerId('cinemaos')}>
            <HDHubPlayer
              item={item}
              season={season}
              episode={episode}
              totalEpisodes={totalEpisodesForSeason}
              totalSeasons={totalSeasons}
              onClose={onClose}
              onPrevEpisode={handlePrevEpisode}
              onNextEpisode={handleNextEpisode}
              onOpenEpisodeDrawer={() => setIsEpisodeDrawerOpen(true)}
              isEpisodeDrawerOpen={isEpisodeDrawerOpen}
              onSwitchServer={(serverId) => setSelectedServerId(serverId)}
              currentServerId={selectedServerId}
              serversList={activeServers}
            />
          </HDHubErrorBoundary>
        ) : embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={item.title}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allowFullScreen
            scrolling="no"
            referrerPolicy="no-referrer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-center p-6 text-white/60">
            <Clapperboard className="h-12 w-12 text-primary/40 mb-3 animate-pulse" />
            <p className="text-sm font-medium">Preparing {currentServer.name} stream...</p>
          </div>
        )}
      </div>

      {/* Floating Top Controls (Exit button + Server Switcher + Episode Nav if Series) (Auto-hides after 4s) - Only for iframe servers */}
      {!isDirectPlayer && (
        <div
          onMouseEnter={() => {
            setShowControls(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={resetHideTimer}
          className={`absolute top-4 inset-x-4 sm:top-5 sm:inset-x-6 z-50 flex items-center justify-between transition-all duration-300 ease-out ${
            showControls || isEpisodeDrawerOpen || isServerDropdownOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          {/* Top-Left Exit Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/10 bg-[#0a0c14]/75 text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title="Exit Player (Esc)"
            aria-label="Exit Player"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Top-Right: Server Switcher & Series Navigation */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick SUB / DUB toggle for Anime */}
            {isAnime && (
              <div className="flex items-center rounded-full border border-white/10 bg-[#0a0c14]/75 p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setSelectedServerId('megaplay-sub')}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-150 ${
                    selectedServerId === 'megaplay-sub'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Switch to Subbed Audio"
                >
                  SUB
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedServerId('megaplay-dub')}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-150 ${
                    selectedServerId === 'megaplay-dub'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Switch to English Dubbed Audio"
                >
                  DUB
                </button>
              </div>
            )}

            {/* Server Switcher Pill & Dropdown */}
            <div className="relative" ref={serverDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsServerDropdownOpen((prev) => !prev);
              if (isEpisodeDrawerOpen) setIsEpisodeDrawerOpen(false);
            }}
            className={`flex h-10 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1 focus-visible:ring-offset-black/50 ${
              isServerDropdownOpen
                ? 'bg-[#0a0c14]/90 border-white/25 text-white ring-1 ring-white/20'
                : 'bg-[#0a0c14]/65 border-white/10 text-white/90 hover:bg-[#0a0c14]/85 hover:text-white hover:border-white/20'
            }`}
            title="Switch Video Server"
            aria-label="Switch Video Server"
          >
            <Server className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" strokeWidth={1.8} />
            <span className="leading-none whitespace-nowrap">{currentServer.name}</span>
            <ChevronDown
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/60 transition-transform duration-200 ${
                isServerDropdownOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Server Dropdown Popover */}
          {isServerDropdownOpen && (
            <div
              data-lenis-prevent
              className="absolute right-0 top-full mt-2 z-50 w-60 sm:w-64 rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between px-3 py-1.5 mb-1 border-b border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Select Server
                </span>
                <span className="text-[10px] text-primary font-semibold">
                  {activeServers.length} Available
                </span>
              </div>

              <div className="space-y-1">
                {activeServers.map((srv) => {
                  const isSelected = srv.id === selectedServerId;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        setSelectedServerId(srv.id);
                        setIsServerDropdownOpen(false);
                        resetHideTimer();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all duration-150 text-left ${
                        isSelected
                          ? 'bg-white/15 text-white font-semibold shadow-sm border border-white/10'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white">{srv.name}</span>
                          {srv.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                                isSelected
                                  ? 'bg-primary/25 text-primary border border-primary/35'
                                  : 'bg-white/10 text-white/60 border border-white/10'
                              }`}
                            >
                              {srv.badge}
                            </span>
                          )}
                        </div>
                        {srv.description && (
                          <span className="text-[10px] text-white/40 truncate mt-0.5">
                            {srv.description}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Floating Series / Episode Navigation Pill on Top of Player (Auto-hides after 4s) */}
        {isTV && (
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
              onClick={() => {
                setIsEpisodeDrawerOpen(!isEpisodeDrawerOpen);
                if (isServerDropdownOpen) setIsServerDropdownOpen(false);
              }}
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
          )}
        </div>
      </div>
      )}

      {/* Dimmed backdrop covering the player to hide episode drawer and server dropdown when clicking inside player */}
      {(isEpisodeDrawerOpen || isServerDropdownOpen) && (
        <div 
          onClick={() => {
            setIsEpisodeDrawerOpen(false);
            setIsServerDropdownOpen(false);
            resetHideTimer();
          }}
          className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-all duration-300 animate-in fade-in cursor-pointer"
          aria-label="Close menus and return to player"
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
              {availableSeasons.length > 1 && (
                <div className="relative" ref={seasonDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                    className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    title="Switch Season"
                  >
                    <span>{availableSeasons.find(s => s.seasonNumber === season)?.label || (season === 0 ? 'Specials' : `S${season}`)}</span>
                    <ChevronDown className={`h-3 w-3 text-white/70 transition-transform duration-200 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSeasonDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                      <div 
                        data-lenis-prevent
                        onWheel={(e) => e.stopPropagation()}
                        className="max-h-48 overflow-y-auto space-y-0.5 drawer-scroll"
                      >
                        {availableSeasons.map((sObj) => (
                          <button
                            key={sObj.seasonNumber}
                            type="button"
                            onClick={() => handleSelectSeason(sObj.seasonNumber)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition ${
                              season === sObj.seasonNumber
                                ? 'bg-white/15 text-white font-bold'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span>{sObj.label}</span>
                            {season === sObj.seasonNumber && <Check className="h-3.5 w-3.5 text-primary" />}
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
          {availableSeasons.length > 1 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-2.5 border-b border-white/10 scrollbar-hide">
              {availableSeasons.map((sObj) => (
                <button
                  key={sObj.seasonNumber}
                  type="button"
                  onClick={() => handleSelectSeason(sObj.seasonNumber)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 transition ${
                    season === sObj.seasonNumber
                      ? 'bg-primary text-black font-bold shadow-sm'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {sObj.label}
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

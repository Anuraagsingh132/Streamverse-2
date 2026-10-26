import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { getSeasonEpisodes } from '../services/tmdb';
import { resolveAnimeToTmdb } from '../services/animeResolver';
import { purgeMediaItemCache } from '../utils/cacheManager';
import { useContinueWatchingStore, savePlaybackRecord, getPlaybackRecord } from '../store/useContinueWatchingStore';
import { dropdownMenuVariants, drawerVariants, modalBackdropVariants } from '../utils/motion';
import { trackServerSelect } from '../services/analytics';

interface ServerOption {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  getUrl: (id: string | number, isTV: boolean, season: number, episode: number) => string;
}

// Anime-specific streaming servers (Vidy, Cinezo, FramexTV, CinemaOS, FlaxMovies, HDHub, Pengu, VidSrc, MegaPlay)
const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'vidy',
    name: 'Vidy (Universal)',
    badge: 'Server 1 · Universal (Default)',
    description: 'Official Vidy universal player with AniList episode mapping and multi-audio',
    referrerPolicy: 'origin',
    getUrl: (id, _isTV, _season, episode) =>
      `https://vidy.st/anime/${encodeURIComponent(id)}/${encodeURIComponent(episode)}?color=DC2626&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`
  },
  {
    id: 'cinezo-sub',
    name: 'Cinezo (Sub)',
    badge: 'Server 2 · Anime Subbed',
    description: 'Cinezo universal player with English subtitles',
    getUrl: (id, _isTV, _season, episode) =>
      `https://player.cinezo.live/embed/anime/${encodeURIComponent(id)}/${encodeURIComponent(episode)}?dub=false`
  },
  {
    id: 'cinezo-dub',
    name: 'Cinezo (Dub)',
    badge: 'Server 3 · English Dub',
    description: 'Cinezo universal player with English audio dub',
    getUrl: (id, _isTV, _season, episode) =>
      `https://player.cinezo.live/embed/anime/${encodeURIComponent(id)}/${encodeURIComponent(episode)}?dub=true`
  },
  {
    id: 'framextv',
    name: 'FramexTV',
    badge: 'Server 3 · Fast HD',
    description: 'FramexTV high-performance streaming mirror',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://framextv.cc/embed/${cleanId}`;
      }
      return `https://framextv.cc/embed/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'atlantic',
    name: 'Atlantic',
    badge: 'Server 4 · Fast HD',
    description: 'Atlantic high-performance streaming embed with TMDB sync',
    referrerPolicy: 'origin',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://atlantic.st/embed/movie/${cleanId}`;
      }
      return `https://atlantic.st/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'cinemaos',
    name: 'CinemaOS',
    badge: 'Server 4 · Official Mirror',
    description: 'CinemaOS official embed player',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://cinemaos.tech/player/${cleanId}?theme=ffffff`;
      }
      return `https://cinemaos.tech/player/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}?theme=ffffff`;
    }
  },
  {
    id: 'flaxmovies',
    name: 'FlaxMovies',
    badge: 'Server 5 · Fast HD',
    description: 'FlaxMovies streaming player',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://flaxmovies.xyz/embed/movie/${cleanId}`;
      }
      return `https://flaxmovies.xyz/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'hdhub',
    name: 'HDHub',
    badge: 'Server 6 · Direct Stream',
    description: 'Direct stream extractor fallback',
    getUrl: () => ''
  },
  {
    id: 'pengu',
    name: 'Pengu',
    badge: 'Server 7 · Direct & HLS',
    description: 'Pengu cloud streams fallback',
    getUrl: () => ''
  },
  {
    id: 'vidsrc-sh',
    name: 'VidSrc (SH)',
    badge: 'Server 8 · Multi-Audio',
    description: 'VidSrc.sh streaming embed',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vidsrc.sh/embed/movie/${cleanId}`;
      }
      return `https://vidsrc.sh/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'megaplay-sub',
    name: 'MegaPlay (Sub)',
    badge: 'MegaPlay · Japanese Audio',
    description: 'Fast HD Japanese audio with English subtitles',
    getUrl: (id, _isTV, _season, episode) =>
      `https://megaplay.buzz/stream/ani/${encodeURIComponent(id)}/${encodeURIComponent(episode)}/sub`
  },
  {
    id: 'megaplay-dub',
    name: 'MegaPlay (Dub)',
    badge: 'MegaPlay · English Dub',
    description: 'English dubbed anime stream with multi-bitrate',
    getUrl: (id, _isTV, _season, episode) =>
      `https://megaplay.buzz/stream/ani/${encodeURIComponent(id)}/${encodeURIComponent(episode)}/dub`
  }
];

// Configurable video streaming servers list for Movies and TV Shows (Vidy -> Cinezo -> FramexTV -> CinemaOS -> FlaxMovies -> HDHub -> Pengu -> VidSrc -> rest)
const MOVIE_TV_SERVERS: ServerOption[] = [
  {
    id: 'vidy',
    name: 'Vidy',
    badge: 'Server 1 · Universal (Default)',
    description: 'Vidy official universal embed player with instant buffer and adaptive quality',
    referrerPolicy: 'origin',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vidy.st/movie/${cleanId}?color=DC2626`;
      }
      return `https://vidy.st/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}?color=DC2626&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`;
    }
  },
  {
    id: 'atlantic',
    name: 'Atlantic',
    badge: 'Server 2 · Fast HD',
    description: 'Atlantic high-performance embed player with direct TMDB routing',
    referrerPolicy: 'origin',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://atlantic.st/embed/movie/${cleanId}`;
      }
      return `https://atlantic.st/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'cinezo',
    name: 'Cinezo',
    badge: 'Server 2 · Fast HD',
    description: 'Universal high-speed streaming player for movies and series',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://player.cinezo.live/embed/movie/${cleanId}`;
      }
      return `https://player.cinezo.live/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'framextv',
    name: 'FramexTV',
    badge: 'Server 2 · Fast HD',
    description: 'FramexTV high-performance streaming mirror',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://framextv.cc/embed/${cleanId}`;
      }
      return `https://framextv.cc/embed/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'cinemaos',
    name: 'CinemaOS',
    badge: 'Server 3 · Official Mirror',
    description: 'CinemaOS official embed player',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://cinemaos.tech/player/${cleanId}?theme=ffffff`;
      }
      return `https://cinemaos.tech/player/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}?theme=ffffff`;
    }
  },
  {
    id: 'flaxmovies',
    name: 'FlaxMovies',
    badge: 'Server 4 · Fast HD',
    description: 'FlaxMovies streaming player with multi-resolution',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://flaxmovies.xyz/embed/movie/${cleanId}`;
      }
      return `https://flaxmovies.xyz/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'hdhub',
    name: 'HDHub',
    badge: 'Server 5 · Direct Stream',
    description: 'High-speed PixelDrain & Cloudflare direct streams',
    getUrl: () => ''
  },
  {
    id: 'pengu',
    name: 'Pengu',
    badge: 'Server 6 · Direct & HLS',
    description: 'Pengu cloud streams with native HLS and multi-source mirrors',
    getUrl: () => ''
  },
  {
    id: 'vidsrc-sh',
    name: 'VidSrc (SH)',
    badge: 'Server 7 · Multi-Audio',
    description: 'VidSrc.sh high-speed multi-audio streaming embed',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vidsrc.sh/embed/movie/${cleanId}`;
      }
      return `https://vidsrc.sh/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'videasy',
    name: 'Videasy',
    badge: 'Server 8 · Fast HD',
    description: 'Videasy multi-quality adaptive streaming player',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://player.videasy.to/movie/${cleanId}`;
      }
      return `https://player.videasy.to/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    badge: 'Mirror 3 · 1080p',
    description: 'Fast CDN streaming mirror with adaptive bitrate',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vidfast.vc/movie/${cleanId}`;
      }
      return `https://vidfast.vc/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'vidlux',
    name: 'VidLux',
    badge: 'Mirror 4',
    description: 'VidLux high-availability embed player',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vidlux.xyz/embed/movie/${cleanId}`;
      }
      return `https://vidlux.xyz/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'vidlove',
    name: 'VidLove',
    badge: 'Mirror 5',
    description: 'VidLove reliable stream host',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://player.vidlove.cc/embed/movie/${cleanId}`;
      }
      return `https://player.vidlove.cc/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'vidrock',
    name: 'VidRock',
    badge: 'Mirror 6 · Backup',
    description: 'VidRock multi-source backup server',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vidrock.net/api/movie/${cleanId}`;
      }
      return `https://vidrock.net/api/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'mappletv',
    name: 'MappleTV',
    badge: 'Mirror 7 · HD',
    description: 'MappleTV fast cloud mirror',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://mappletv.uk/embed/movie/${cleanId}`;
      }
      return `https://mappletv.uk/embed/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  },
  {
    id: 'vixsrc',
    name: 'VixSrc',
    badge: 'Mirror 8 · Direct',
    description: 'VixSrc high-speed streaming server',
    referrerPolicy: 'origin',
    getUrl: (tmdbId, isTV, season, episode) => {
      const cleanId = encodeURIComponent(tmdbId);
      if (!isTV) {
        return `https://vixsrc.to/movie/${cleanId}`;
      }
      return `https://vixsrc.to/tv/${cleanId}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
    }
  }
];

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
            Switch to Vidy Server
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const EMPTY_EPISODES: EpisodeItem[] = [];

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
  episodesList = EMPTY_EPISODES,
  onClose,
  onEpisodeChange
}) => {
  const { settings } = useUserSettings();
  const { getRecord } = useContinueWatchingStore();
  const [season, setSeason] = useState<number>(initialSeason || 1);
  const [episode, setEpisode] = useState<number>(initialEpisode || 1);
  const [selectedServerId, setSelectedServerId] = useState<string>(() => {
    if (item?.media_type === 'anime') {
      return 'vidy';
    }
    const current = settings.defaultServer;
    return (!current) ? 'vidy' : current;
  });

  const [prevItemIdForServer, setPrevItemIdForServer] = useState(item?.id);
  if (item?.id !== prevItemIdForServer) {
    setPrevItemIdForServer(item?.id);
    if (item?.media_type === 'anime') {
      setSelectedServerId((prev) => (prev === 'cinezo-dub' || prev === 'megaplay-dub' ? 'cinezo-dub' : prev === 'cinezo-sub' ? 'cinezo-sub' : 'vidy'));
    } else {
      const current = settings.defaultServer;
      setSelectedServerId((!current) ? 'vidy' : current);
    }
  }

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

  // Start hide timer when menus state change
  useEffect(() => {
    if (!isEpisodeDrawerOpen && !isServerDropdownOpen) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isEpisodeDrawerOpen, isServerDropdownOpen]);

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

  // Sync initial props when switching to a different media item
  const [prevItemId, setPrevItemId] = useState(item?.id);
  if (item?.id !== prevItemId) {
    setPrevItemId(item?.id);
    if (initialSeason) setSeason(initialSeason);
    if (initialEpisode) setEpisode(initialEpisode);
  }

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

  const handleExit = useCallback(() => {
    purgeMediaItemCache(item);
    onClose();
  }, [item, onClose]);

  // Purge disk & in-memory media cache on player unmount
  useEffect(() => {
    return () => {
      purgeMediaItemCache(item);
    };
  }, [item]);

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
          handleExit();
        }
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEpisodeDrawerOpen, isServerDropdownOpen, handleExit, toggleFullscreen]);

  const isAnime = item?.media_type === 'anime';
  const isTV = item?.media_type === 'tv' || isAnime;
  const tmdbId = item?.tmdbId || item?.id || '';

  // Dynamic TMDB resolution for anime items (BIZ-01)
  const [resolvedAnimeTmdbId, setResolvedAnimeTmdbId] = useState<string | null>(() => {
    if (item?.tmdbId && /^\d+$/.test(String(item.tmdbId))) {
      return String(item.tmdbId);
    }
    return null;
  });

  useEffect(() => {
    if (!isAnime || !item) return;
    if (item.tmdbId && /^\d+$/.test(String(item.tmdbId))) return;

    let isMounted = true;
    resolveAnimeToTmdb(item)
      .then((resolved) => {
        if (isMounted && resolved?.tmdbId) {
          setResolvedAnimeTmdbId(resolved.tmdbId);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isAnime, item]);

  // Anime servers: show CinemaOS/HDHub only when TMDB ID is resolved to avoid crashes (BIZ-01)
  const activeServers = useMemo(() => {
    if (!isAnime) return MOVIE_TV_SERVERS;
    if (resolvedAnimeTmdbId) {
      return ANIME_SERVERS;
    }
    return ANIME_SERVERS.filter((s) =>
      s.id === 'vidy' ||
      s.id === 'cinezo-sub' ||
      s.id === 'cinezo-dub' ||
      s.id === 'megaplay-sub' ||
      s.id === 'megaplay-dub'
    );
  }, [isAnime, resolvedAnimeTmdbId]);

  // Fallback if current selectedServerId is unavailable in activeServers
  const effectiveServerId = useMemo(() => {
    if (activeServers.some((s) => s.id === selectedServerId)) {
      return selectedServerId;
    }
    return activeServers[0]?.id || selectedServerId;
  }, [activeServers, selectedServerId]);

  // Current active server configuration
  const currentServer = useMemo(() => {
    return activeServers.find((s) => s.id === effectiveServerId) || activeServers[0];
  }, [activeServers, effectiveServerId]);

  // Dynamic TV season episodes fetching (BIZ-05)
  const [fetchedSeasonEpisodes, setFetchedSeasonEpisodes] = useState<EpisodeItem[]>(EMPTY_EPISODES);

  useEffect(() => {
    if (!isTV || isAnime) return;
    const targetId = tmdbId || item?.id;
    if (!targetId) return;

    let isMounted = true;
    getSeasonEpisodes(targetId, season)
      .then((eps) => {
        if (isMounted && eps && eps.length > 0) {
          setFetchedSeasonEpisodes(eps);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isTV, isAnime, tmdbId, item?.id, season]);

  // Derived effective episodes list: dynamically fetched season episodes, or static episodesList prop
  const currentEpisodes = useMemo(() => {
    if (fetchedSeasonEpisodes.length > 0) {
      return fetchedSeasonEpisodes;
    }
    return episodesList || EMPTY_EPISODES;
  }, [fetchedSeasonEpisodes, episodesList]);

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
    if (currentEpisodes.length > 0) return currentEpisodes.length;
    const currentSeasonObj = availableSeasons.find((s) => s.seasonNumber === season);
    if (currentSeasonObj?.episodeCount) return currentSeasonObj.episodeCount;
    if (item.episodes) return item.episodes;
    return 24;
  }, [item, currentEpisodes, availableSeasons, season]);

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
  const isDirectPlayer = effectiveServerId === 'hdhub' || effectiveServerId === 'pengu';
  const effectiveTmdbId = isAnime ? (resolvedAnimeTmdbId || '') : tmdbId;

  const embedUrl = useMemo(() => {
    if (!item || isDirectPlayer) return '';
    // AniList-based servers for anime take item.id (AniList ID) directly
    if (isAnime && (
      effectiveServerId === 'vidy' ||
      effectiveServerId === 'cinezo-sub' ||
      effectiveServerId === 'cinezo-dub' ||
      effectiveServerId === 'megaplay-sub' ||
      effectiveServerId === 'megaplay-dub'
    )) {
      return currentServer.getUrl(item.id, isTV, season, episode);
    }
    if (!effectiveTmdbId) return '';
    return currentServer.getUrl(effectiveTmdbId, isTV, season, episode);
  }, [item, isAnime, effectiveServerId, currentServer, isTV, season, episode, isDirectPlayer, effectiveTmdbId]);

  // Record initial playback state and listen to messages when an iframe player mounts so Continue Watching is saved for anime and fallback mirrors
  useEffect(() => {
    if (!isDirectPlayer && embedUrl && item) {
      const existing = getPlaybackRecord(item.id, isTV ? season : undefined, isTV ? episode : undefined);
      savePlaybackRecord(item, {
        season: isTV ? season : undefined,
        episode: isTV ? episode : undefined,
        currentTime: existing?.currentTime && existing.currentTime >= 5 ? existing.currentTime : 5,
        duration: existing?.duration && existing.duration > 0 ? existing.duration : 100
      });

      const handleMessage = (e: MessageEvent) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data && typeof data === 'object') {
            const currentTime = data.currentTime ?? data.time ?? data.progress;
            const duration = data.duration ?? data.total;
            if (typeof currentTime === 'number' && currentTime >= 5) {
              savePlaybackRecord(item, {
                season: isTV ? season : undefined,
                episode: isTV ? episode : undefined,
                currentTime,
                duration: typeof duration === 'number' ? duration : 100
              });
            }
          }
        } catch {
          // ignore non-json messages
        }
      };

      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [isDirectPlayer, embedUrl, item, isTV, season, episode]);

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
          <HDHubErrorBoundary onFallback={() => setSelectedServerId('vidy')}>
            <HDHubPlayer
              item={isAnime && resolvedAnimeTmdbId ? { ...item, tmdbId: resolvedAnimeTmdbId } : item}
              season={season}
              episode={episode}
              totalEpisodes={totalEpisodesForSeason}
              totalSeasons={totalSeasons}
              onClose={handleExit}
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
            key={`${selectedServerId}-${embedUrl}`}
            src={embedUrl}
            title={item.title}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allowFullScreen
            scrolling="no"
            referrerPolicy={currentServer.referrerPolicy || (selectedServerId === 'vixsrc' ? 'origin' : 'no-referrer')}
            allow="accelerometer; autoplay *; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen *"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-center p-6 text-white/60">
            <Clapperboard className="h-12 w-12 text-primary/40 mb-3 animate-pulse" />
            <p className="text-sm font-medium">Preparing {currentServer.name} stream...</p>
          </div>
        )}
      </div>

      {/* Floating Top Controls (Auto-hides after 4s) - Only for iframe servers */}
      {!isDirectPlayer && (
        <div
          onMouseEnter={() => {
            setShowControls(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={resetHideTimer}
          className={`absolute top-0 inset-x-0 z-50 transition-all duration-300 ease-out ${
            showControls || isEpisodeDrawerOpen || isServerDropdownOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          {/* Top 120px Gradient: 80% black fading to transparent */}
          <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Main Bar: 43px side margin alignment */}
          <div className="relative flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-[43px] pt-4 sm:pt-5 pb-6">
            {/* Left Section: Back Button + Title & Context */}
            <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
              <button
                type="button"
                onClick={handleExit}
                className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-white/20 hover:text-white active:bg-white/25 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
                title="Back (Esc)"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
              </button>

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
                      {totalEpisodesForSeason > 0 && <span>(of {totalEpisodesForSeason} eps)</span>}
                    </>
                  ) : (
                    <>
                      {(item.release_date || item.first_air_date) && (
                        <span>{(item.release_date || item.first_air_date)?.slice(0, 4)}</span>
                      )}
                      {(item.release_date || item.first_air_date) && item.vote_average ? <span>•</span> : null}
                      {item.vote_average ? <span>★ {item.vote_average.toFixed(1)}</span> : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section: SUB/DUB (if anime) + Episode switcher (if TV) + Server Selector Pill */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Quick SUB / DUB toggle for Anime */}
              {isAnime && (
                <div className="flex items-center rounded-full border border-white/[0.12] bg-[#0a0c14]/75 p-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedServerId.startsWith('megaplay')) {
                        setSelectedServerId('megaplay-sub');
                      } else {
                        setSelectedServerId('cinezo-sub');
                      }
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-150 ${
                      selectedServerId === 'cinezo-sub' || selectedServerId === 'megaplay-sub'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Switch to Subbed Audio"
                  >
                    SUB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedServerId.startsWith('megaplay')) {
                        setSelectedServerId('megaplay-dub');
                      } else {
                        setSelectedServerId('cinezo-dub');
                      }
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-150 ${
                      selectedServerId === 'cinezo-dub' || selectedServerId === 'megaplay-dub'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Switch to English Dubbed Audio"
                  >
                    DUB
                  </button>
                </div>
              )}

              {/* Series / Episode Navigation Pill for TV */}
              {isTV && (
                <div className="flex h-10 items-center gap-1 rounded-full border border-white/[0.12] bg-[#0a0c14]/75 px-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={handlePrevEpisode}
                    disabled={episode <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-20 disabled:pointer-events-none"
                    title="Previous Episode"
                    aria-label="Previous Episode"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEpisodeDrawerOpen(!isEpisodeDrawerOpen);
                      if (isServerDropdownOpen) setIsServerDropdownOpen(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                      isEpisodeDrawerOpen 
                        ? 'bg-white/20 text-white ring-1 ring-white/20 shadow-sm' 
                        : 'text-white/90 hover:bg-white/10 hover:text-white shadow-sm'
                    }`}
                    title="Select Season & Episode"
                    aria-label="Select Season & Episode"
                  >
                    <ListVideo className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.8} />
                    <span className="leading-none">S{season} E{episode}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextEpisode}
                    disabled={episode >= totalEpisodesForSeason}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-20 disabled:pointer-events-none"
                    title="Next Episode"
                    aria-label="Next Episode"
                  >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* Server Switcher Pill & Dropdown (Right-aligned!) */}
              <div className="relative" ref={serverDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsServerDropdownOpen((prev) => !prev);
                    if (isEpisodeDrawerOpen) setIsEpisodeDrawerOpen(false);
                  }}
                  className={`flex h-10 items-center gap-2 rounded-full border px-3.5 sm:px-4 text-sm font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isServerDropdownOpen
                      ? 'bg-white/20 border-white/30 text-white ring-1 ring-white/25'
                      : 'border-white/[0.12] bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
                  }`}
                  title="Change Video Server"
                  aria-label="Change Video Server"
                >
                  <Server className="h-4 w-4 text-primary shrink-0" strokeWidth={1.8} />
                  <span className="leading-none whitespace-nowrap">{currentServer.name}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${
                      isServerDropdownOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Server Dropdown Popover (Right-aligned!) */}
                <AnimatePresence>
                  {isServerDropdownOpen && (
                    <motion.div
                      variants={dropdownMenuVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      data-lenis-prevent
                      className="absolute right-0 top-full mt-2 z-50 w-64 sm:w-72 rounded-2xl border border-white/15 bg-[#111115]/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
                    >
                      <div className="flex items-center justify-between px-3 py-2 mb-1 border-b border-white/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                          Select Server
                        </span>
                        <span className="text-[10px] text-primary font-semibold">
                          {activeServers.length} Available
                        </span>
                      </div>

                      <div
                        style={{ maxHeight: '236px', overflowY: 'auto' }}
                        className="max-h-60 overflow-y-auto space-y-1 pr-1 drawer-scroll overscroll-contain server-dropdown-scroll"
                      >
                        {activeServers.map((srv) => {
                          const isSelected = srv.id === selectedServerId;
                          const isDirect = srv.id === 'hdhub' || srv.id === 'pengu' || srv.id === 'cinemaos';
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              onClick={() => {
                                trackServerSelect(item.id, item.title, srv.name, isTV ? 'tv' : 'movie', season, episode);
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
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />
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
      )}

      {/* Dimmed backdrop covering the player to hide episode drawer and server dropdown when clicking inside player */}
      <AnimatePresence>
        {(isEpisodeDrawerOpen || isServerDropdownOpen) && (
          <motion.div 
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => {
              setIsEpisodeDrawerOpen(false);
              setIsServerDropdownOpen(false);
              resetHideTimer();
            }}
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] cursor-pointer"
            aria-label="Close menus and return to player"
            title="Click to resume playback"
          />
        )}
      </AnimatePresence>

      {/* Episode Selection Drawer for Series */}
      <AnimatePresence>
        {isTV && isEpisodeDrawerOpen && (
          <motion.aside 
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            data-lenis-prevent
            className="absolute right-0 top-0 bottom-0 z-50 w-full max-w-sm sm:max-w-md h-full max-h-screen bg-zinc-950/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden pointer-events-auto"
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

                  <AnimatePresence>
                    {isSeasonDropdownOpen && (
                      <motion.div
                        variants={dropdownMenuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute left-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl"
                      >
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
                      </motion.div>
                    )}
                  </AnimatePresence>
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
            {currentEpisodes.length > 0 ? (
              currentEpisodes.map((ep) => {
                const isSelected = ep.episode_number === episode;
                const epRecord = getRecord(item.id, season, ep.episode_number);
                const progressPercent = epRecord
                  ? epRecord.progressPercent
                  : ep.episode_number < episode
                  ? 100
                  : 0;
                const isStarted = progressPercent > 0;

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
        </motion.aside>
      )}
      </AnimatePresence>
    </div>
  );
};

export default CinemaOSPlayer;

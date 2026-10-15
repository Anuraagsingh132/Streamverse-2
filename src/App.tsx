import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams
} from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { Footer } from './components/Footer';
import { MediaItem } from './types/media';
import { getMediaDetails } from './services/tmdb';
import { useWatchlistStore } from './store/useWatchlistStore';
import { getRouteHref } from './utils/routeUtils';
import { pageMotionVariants } from './utils/motion';
import { ArrowLeft, Home, Compass } from 'lucide-react';

// Lazy-loaded route views
const HomePage = React.lazy(() => import('./pages/HomePage'));
const MoviesPage = React.lazy(() => import('./pages/MoviesPage'));
const TVShowsPage = React.lazy(() => import('./pages/TVShowsPage'));
const AnimePage = React.lazy(() => import('./pages/AnimePage'));
const AISearchPage = React.lazy(() => import('./pages/AISearchPage'));
const LiveSportsPage = React.lazy(() => import('./pages/LiveSportsPage').then(m => ({ default: m.LiveSportsPage })));
const MusicPage = React.lazy(() => import('./pages/MusicPage').then(m => ({ default: m.MusicPage })));
const ProvidersPage = React.lazy(() => import('./pages/ProvidersPage').then(m => ({ default: m.ProvidersPage })));
const WatchlistPage = React.lazy(() => import('./pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DetailsPage = React.lazy(() => import('./pages/DetailsPage'));
const AnimeDetailsPage = React.lazy(() => import('./pages/AnimeDetailsPage').then(m => ({ default: m.AnimeDetailsPage })));
const CinemaOSPlayer = React.lazy(() => import('./components/CinemaOSPlayer').then(m => ({ default: m.CinemaOSPlayer })));
const SearchModal = React.lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const ComingSoonPage = React.lazy(() => import('./pages/ComingSoonPage'));

function getRouteKeyFromPath(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/movie/') || pathname.startsWith('/tv/')) return 'details';
  if (pathname === '/movies' || pathname === '/movie') return 'movie';
  if (pathname === '/tv' || pathname === '/tv-shows') return 'tv';
  if (pathname === '/anime' || pathname === '/anime/browse') return 'anime';
  if (pathname.startsWith('/anime/')) return 'anime-details';
  if (pathname.startsWith('/watch/')) return 'watch';
  if (pathname === '/sports' || pathname === '/livesports') return 'livesports';
  if (pathname === '/music') return 'music';
  if (pathname === '/providers') return 'providers';
  if (pathname === '/watchlist') return 'watchlist';
  if (pathname === '/continue-watching') return 'continue-watching';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/discover') return 'discover';
  if (pathname.startsWith('/ai') || pathname.startsWith('/search')) return 'ai';
  return 'home';
}

// Dynamic loader for route-based media resolution (avoids bundling large static datasets into root bundle)
// Dynamic loader for route-based media resolution (avoids bundling large static datasets into root bundle)
async function resolveRouteMedia(id: string, type: 'movie' | 'tv' | 'anime'): Promise<MediaItem | null> {
  if (type === 'movie' && id === '1248832') {
    const { diggerCuratedDetails } = await import('./data/cinemaosLiveMatch');
    return diggerCuratedDetails;
  }
  if (type === 'tv' && id === '95350') {
    const { lanternsCuratedDetails } = await import('./data/cinemaosLiveMatch');
    return lanternsCuratedDetails;
  }
  try {
    const { allMedia } = await import('./data/mediaData');
    const match = allMedia.find((m) => m.id === id);
    if (match) return match;
  } catch {
    // Fall through to TMDB or fallback
  }
  if (type === 'anime') {
    try {
      const { extractedAnime } = await import('./data/animeData');
      const animeMatch = extractedAnime.find((m) => m.id === id);
      if (animeMatch) return animeMatch;
    } catch {
      // Fall through to TMDB
    }
    try {
      return await getMediaDetails(id, 'tv');
    } catch {
      return null;
    }
  }
  try {
    return await getMediaDetails(id, type);
  } catch {
    return null;
  }
}

// ---------------- Route Handlers with Automatic Param Resolution ----------------

interface DetailsRouteProps {
  type: 'movie' | 'tv';
  selectedItem: MediaItem | null;
  setSelectedItem: (item: MediaItem | null) => void;
  onPlay: (item: MediaItem, ep?: number, season?: number) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onBack: () => void;
}

const NotFoundState: React.FC<{
  title: string;
  description: string;
  onBack: () => void;
}> = ({ title, description, onBack }) => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[75vh] pt-36 sm:pt-44 pb-20 flex-col items-center justify-center px-4 text-center relative z-10">
      <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/50 mb-5 shadow-2xl backdrop-blur-xl">
        <Compass className="h-8 w-8 text-rose-500 animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold text-white sm:text-3xl tracking-tight">{title}</h2>
      <p className="mt-2.5 max-w-md text-sm text-white/65 leading-relaxed">
        {description}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go Back</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95 cursor-pointer shadow-lg shadow-white/10"
        >
          <Home className="h-4 w-4" />
          <span>Go Home</span>
        </button>
      </div>
    </div>
  );
};

const DetailsRoute: React.FC<DetailsRouteProps> = ({
  type,
  selectedItem,
  setSelectedItem,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onBack
}) => {
  const { id } = useParams<{ id: string }>();
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeItem = (selectedItem && selectedItem.id === id) ? selectedItem : (resolvedItem && resolvedItem.id === id) ? resolvedItem : null;

  useEffect(() => {
    if (!id) return;
    if (selectedItem && selectedItem.id === id) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    resolveRouteMedia(id, type)
      .then((resolved) => {
        if (isMounted) {
          if (resolved) {
            setResolvedItem(resolved);
            setSelectedItem(resolved);
          } else {
            setNotFound(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [id, type, selectedItem, setSelectedItem]);

  if (notFound) {
    return (
      <NotFoundState
        title="Title Not Found"
        description={`The requested ${type === 'tv' ? 'TV show' : 'movie'} could not be found or is currently unavailable.`}
        onBack={onBack}
      />
    );
  }

  if (isLoading || !activeItem) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return (
    <DetailsPage
      item={activeItem}
      onBack={onBack}
      onPlay={onPlay}
      onOpenDetails={onOpenDetails}
      watchlist={watchlist}
      onToggleWatchlist={onToggleWatchlist}
    />
  );
};

const DetailsRouteAlias: React.FC<{ type: 'movie' | 'tv' | 'anime' }> = ({ type }) => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/${type}/${id || ''}`} replace />;
};

interface AnimeDetailsRouteProps {
  selectedItem: MediaItem | null;
  setSelectedItem: (item: MediaItem | null) => void;
  onPlay: (item: MediaItem, ep?: number, season?: number) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onBack: () => void;
}

const AnimeDetailsRoute: React.FC<AnimeDetailsRouteProps> = ({
  selectedItem,
  setSelectedItem,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onBack
}) => {
  const { id } = useParams<{ id: string }>();
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeItem = (selectedItem && selectedItem.id === id) ? selectedItem : (resolvedItem && resolvedItem.id === id) ? resolvedItem : null;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    if (selectedItem && selectedItem.id === id) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    resolveRouteMedia(id, 'anime')
      .then((resolved) => {
        if (isMounted) {
          if (resolved) {
            setResolvedItem(resolved);
            setSelectedItem(resolved);
          } else {
            setNotFound(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [id, selectedItem, setSelectedItem]);

  if (notFound) {
    return (
      <NotFoundState
        title="Anime Not Found"
        description="The requested anime title could not be found or is currently unavailable."
        onBack={onBack}
      />
    );
  }

  if (isLoading || !activeItem) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return (
    <AnimeDetailsPage
      item={activeItem}
      onBack={onBack}
      onPlay={(item, ep) => onPlay(item, ep || 1, 1)}
      onOpenDetails={onOpenDetails}
      watchlist={watchlist}
      onToggleWatchlist={onToggleWatchlist}
    />
  );
};

interface WatchMovieRouteProps {
  playingItem: MediaItem | null;
  setPlayingItem: (item: MediaItem | null) => void;
  onClose: () => void;
}

const WatchMovieRoute: React.FC<WatchMovieRouteProps> = ({
  playingItem,
  setPlayingItem,
  onClose
}) => {
  const { id } = useParams<{ id: string }>();
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeItem = (playingItem && playingItem.id === id) ? playingItem : (resolvedItem && resolvedItem.id === id) ? resolvedItem : null;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    if (playingItem && playingItem.id === id) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    resolveRouteMedia(id, 'movie')
      .then((resolved) => {
        if (isMounted) {
          if (resolved) {
            setResolvedItem(resolved);
            setPlayingItem(resolved);
          } else {
            setNotFound(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [id, playingItem, setPlayingItem]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Video Unavailable</h2>
        <p className="mt-2 text-sm text-white/60">
          The requested movie could not be found or cannot be played.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 cursor-pointer"
        >
          Close Player
        </button>
      </div>
    );
  }

  if (isLoading || !activeItem) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <CinemaOSPlayer
      item={activeItem}
      initialSeason={1}
      initialEpisode={1}
      episodesList={activeItem.episodes_list}
      onClose={onClose}
    />
  );
};

interface WatchTvRouteProps {
  playingItem: MediaItem | null;
  setPlayingItem: (item: MediaItem | null) => void;
  onClose: () => void;
}

const WatchTvRoute: React.FC<WatchTvRouteProps> = ({
  playingItem,
  setPlayingItem,
  onClose
}) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const season = Number(searchParams.get('season')) || 1;
  const episode = Number(searchParams.get('episode')) || 1;
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeItem = (playingItem && playingItem.id === id) ? playingItem : (resolvedItem && resolvedItem.id === id) ? resolvedItem : null;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    if (playingItem && playingItem.id === id) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    resolveRouteMedia(id, 'tv')
      .then((resolved) => {
        if (isMounted) {
          if (resolved) {
            setResolvedItem(resolved);
            setPlayingItem(resolved);
          } else {
            setNotFound(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [id, playingItem, setPlayingItem]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Video Unavailable</h2>
        <p className="mt-2 text-sm text-white/60">
          The requested TV show could not be found or cannot be played.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 cursor-pointer"
        >
          Close Player
        </button>
      </div>
    );
  }

  if (isLoading || !activeItem) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <CinemaOSPlayer
      item={activeItem}
      initialSeason={season}
      initialEpisode={episode}
      episodesList={activeItem.episodes_list}
      onClose={onClose}
      onEpisodeChange={(s, ep) => {
        setSearchParams({ season: String(s), episode: String(ep) });
      }}
    />
  );
};

interface WatchAnimeRouteProps {
  playingItem: MediaItem | null;
  setPlayingItem: (item: MediaItem | null) => void;
  onClose: () => void;
}

const WatchAnimeRoute: React.FC<WatchAnimeRouteProps> = ({
  playingItem,
  setPlayingItem,
  onClose
}) => {
  const { id, episode: epParam } = useParams<{ id: string; episode?: string }>();
  const navigate = useNavigate();
  const episode = Number(epParam) || 1;
  const [resolvedItem, setResolvedItem] = useState<MediaItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const activeItem = (playingItem && playingItem.id === id) ? playingItem : (resolvedItem && resolvedItem.id === id) ? resolvedItem : null;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    if (playingItem && playingItem.id === id) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);
    resolveRouteMedia(id, 'anime')
      .then((resolved) => {
        if (isMounted) {
          if (resolved) {
            setResolvedItem(resolved);
            setPlayingItem(resolved);
          } else {
            setNotFound(true);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [id, playingItem, setPlayingItem]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Video Unavailable</h2>
        <p className="mt-2 text-sm text-white/60">
          The requested anime could not be found or cannot be played.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 cursor-pointer"
        >
          Close Player
        </button>
      </div>
    );
  }

  if (isLoading || !activeItem) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <CinemaOSPlayer
      item={activeItem}
      initialSeason={1}
      initialEpisode={episode}
      episodesList={activeItem.episodes_list}
      onClose={onClose}
      onEpisodeChange={(_s, ep) => {
        navigate(`/watch/anime/${activeItem.id}/${ep}`, { replace: true });
      }}
    />
  );
};

// ---------------- Main Router Application Shell ----------------

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const lenisRef = useRef<Lenis | null>(null);

  const isWatchRoute = location.pathname.startsWith('/watch/');
  const currentRouteKey = getRouteKeyFromPath(location.pathname);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.088,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      gestureOrientation: 'vertical',
      respectReducedMotion: true,
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Pause Lenis when video player is full-screened or search modal is open
  useEffect(() => {
    if (isWatchRoute || isSearchOpen) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [isWatchRoute, isSearchOpen]);

  // Scroll to top on non-watch page navigation cleanly without Lenis scroll race
  useEffect(() => {
    if (!isWatchRoute) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [location.pathname, isWatchRoute]);

  // Watchlist store
  const {
    items: savedMediaItems,
    watchlistIds: watchlist,
    toggleWatchlist: handleToggleWatchlist,
    clearWatchlist: handleClearWatchlist,
  } = useWatchlistStore();

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const handleNavigate = useCallback(
    (route: string) => {
      setSelectedItem(null);
      navigate(getRouteHref(route));
    },
    [navigate]
  );

  const handleOpenDetails = useCallback(
    (item: MediaItem) => {
      setSelectedItem(item);
      if (item.media_type === 'anime') {
        navigate(`/anime/${item.id}`);
      } else {
        navigate(`/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`);
      }
    },
    [navigate]
  );

  const handlePlay = useCallback(
    (item: MediaItem, episode: number = 1, season: number = 1) => {
      setPlayingItem(item);
      if (item.media_type === 'movie') {
        navigate(`/watch/movie/${item.id}`);
      } else if (item.media_type === 'anime') {
        navigate(`/watch/anime/${item.id}/${episode || 1}`);
      } else {
        navigate(`/watch/tv/${item.id}?season=${season || 1}&episode=${episode || 1}`);
      }
    },
    [navigate]
  );

  const handleClosePlayer = useCallback(() => {
    setPlayingItem(null);
    if (selectedItem) {
      if (selectedItem.media_type === 'anime') {
        navigate(`/anime/${selectedItem.id}`);
      } else {
        navigate(`/${selectedItem.media_type === 'tv' ? 'tv' : 'movie'}/${selectedItem.id}`);
      }
    } else {
      navigate(-1);
    }
  }, [selectedItem, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col font-sans bg-transparent text-foreground">
      {/* Header Navigation - Hidden on watch page */}
      {!isWatchRoute && (
        <Navbar
          currentRoute={currentRouteKey}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
          watchlistCount={watchlist.length}
        />
      )}

      {/* Main Page View with Animated Transitions */}
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageMotionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <React.Suspense fallback={<div className="min-h-screen bg-transparent transition-opacity duration-200" />}>
              <Routes location={location}>
                {/* Core Top-Level Routes */}
                <Route
                  path="/"
                  element={
                    <HomePage
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onNavigate={handleNavigate}
                    />
                  }
                />
                <Route
                  path="/movies"
                  element={
                    <MoviesPage
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onNavigate={handleNavigate}
                    />
                  }
                />
                <Route path="/movie" element={<Navigate to="/movies" replace />} />
                <Route
                  path="/tv"
                  element={
                    <TVShowsPage
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onNavigate={handleNavigate}
                    />
                  }
                />
                <Route path="/tv-shows" element={<Navigate to="/tv" replace />} />
                <Route
                  path="/anime"
                  element={
                    <AnimePage
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onNavigate={handleNavigate}
                    />
                  }
                />
                <Route path="/anime/browse" element={<Navigate to="/anime" replace />} />
                <Route path="/sports" element={<ComingSoonPage feature="sports" onNavigate={handleNavigate} />} />
                <Route path="/livesports" element={<ComingSoonPage feature="sports" onNavigate={handleNavigate} />} />
                <Route path="/music" element={<ComingSoonPage feature="music" onNavigate={handleNavigate} />} />
                <Route path="/providers" element={<ComingSoonPage feature="providers" onNavigate={handleNavigate} />} />
                <Route path="/watchlist" element={<ComingSoonPage feature="watchlist" onNavigate={handleNavigate} />} />
                <Route path="/continue-watching" element={<ComingSoonPage feature="continue-watching" onNavigate={handleNavigate} />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/ai" element={<ComingSoonPage feature="ai" onNavigate={handleNavigate} />} />
                <Route path="/ai-search" element={<ComingSoonPage feature="ai" onNavigate={handleNavigate} />} />
                <Route path="/search" element={<ComingSoonPage feature="ai" onNavigate={handleNavigate} />} />
                <Route path="/discover" element={<ComingSoonPage feature="discover" onNavigate={handleNavigate} />} />

                <Route path="/details/movie/:id" element={<DetailsRouteAlias type="movie" />} />
                <Route path="/details/tv/:id" element={<DetailsRouteAlias type="tv" />} />
                <Route path="/details/anime/:id" element={<DetailsRouteAlias type="anime" />} />

                {/* Media Details Routes */}
                <Route
                  path="/movie/:id"
                  element={
                    <DetailsRoute
                      type="movie"
                      selectedItem={selectedItem}
                      setSelectedItem={setSelectedItem}
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onBack={() => {
                        handleNavigate('home');
                      }}
                    />
                  }
                />
                <Route
                  path="/tv/:id"
                  element={
                    <DetailsRoute
                      type="tv"
                      selectedItem={selectedItem}
                      setSelectedItem={setSelectedItem}
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onBack={() => {
                        handleNavigate('home');
                      }}
                    />
                  }
                />
                <Route
                  path="/anime/:id"
                  element={
                    <AnimeDetailsRoute
                      selectedItem={selectedItem}
                      setSelectedItem={setSelectedItem}
                      onPlay={handlePlay}
                      onOpenDetails={handleOpenDetails}
                      watchlist={watchlist}
                      onToggleWatchlist={handleToggleWatchlist}
                      onBack={() => {
                        handleNavigate('anime');
                      }}
                    />
                  }
                />

                {/* Full-Page Player Routes */}
                <Route
                  path="/watch/movie/:id"
                  element={
                    <WatchMovieRoute
                      playingItem={playingItem}
                      setPlayingItem={setPlayingItem}
                      onClose={handleClosePlayer}
                    />
                  }
                />
                <Route
                  path="/watch/tv/:id"
                  element={
                    <WatchTvRoute
                      playingItem={playingItem}
                      setPlayingItem={setPlayingItem}
                      onClose={handleClosePlayer}
                    />
                  }
                />
                <Route
                  path="/watch/anime/:id/:episode?"
                  element={
                    <WatchAnimeRoute
                      playingItem={playingItem}
                      setPlayingItem={setPlayingItem}
                      onClose={handleClosePlayer}
                    />
                  }
                />

                {/* Catch-all Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer - Hidden on watch page */}
      {!isWatchRoute && <Footer onNavigate={handleNavigate} />}

      {/* Mobile-Only Ambient Bottom Color Scrim for Liquid Glass Optical Refraction */}
      {!isWatchRoute && (
        <div className="liquid-glass-ambient-scrim" aria-hidden="true" />
      )}

      {/* Floating Mobile Dock - Hidden on watch page */}
      {!isWatchRoute && (
        <MobileNav
          currentRoute={currentRouteKey}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <React.Suspense fallback={null}>
            <SearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onPlay={handlePlay}
              onOpenDetails={handleOpenDetails}
              onNavigate={handleNavigate}
            />
          </React.Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;

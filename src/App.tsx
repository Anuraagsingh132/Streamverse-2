import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { Footer } from './components/Footer';
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
import { MediaItem } from './types/media';
import { allMedia } from './data/mediaData';
import { diggerCuratedDetails, lanternsCuratedDetails } from './data/cinemaosLiveMatch';
import { getMediaDetails } from './services/tmdb';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [previousRoute, setPreviousRoute] = useState<string>('home');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<number>(1);
  const [playingSeason, setPlayingSeason] = useState<number>(1);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis smooth natural scroll
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
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
    if (currentRoute === 'watch' || isSearchOpen) {
      lenisRef.current?.stop();
    } else {
      lenisRef.current?.start();
    }
  }, [currentRoute, isSearchOpen]);

  // Watchlist persisted in localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('streamverse_watchlist');
      return saved ? JSON.parse(saved) : ['258165', '977942', '94605'];
    } catch {
      return ['258165', '977942', '94605'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('streamverse_watchlist', JSON.stringify(watchlist));
    } catch (e) {
      console.error('Failed to save watchlist to localStorage', e);
    }
  }, [watchlist]);

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

  // Sync route and media details with window.location.pathname
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      if (path.startsWith('/movie/')) {
        const id = path.replace('/movie/', '').replace(/\/$/, '');
        if (id === '1248832') {
          setSelectedItem(diggerCuratedDetails);
          setCurrentRoute('details');
        } else {
          const match = allMedia.find((m) => m.id === id);
          if (match) {
            setSelectedItem(match);
            setCurrentRoute('details');
          } else {
            getMediaDetails(id, 'movie').then((m) => {
              setSelectedItem(m);
              setCurrentRoute('details');
            }).catch(() => {
              setSelectedItem(diggerCuratedDetails);
              setCurrentRoute('details');
            });
          }
        }
      } else if (path.startsWith('/tv/')) {
        const id = path.replace('/tv/', '').replace(/\/$/, '');
        if (id === '95350') {
          setSelectedItem(lanternsCuratedDetails);
          setCurrentRoute('details');
        } else {
          const match = allMedia.find((m) => m.id === id);
          if (match) {
            setSelectedItem(match);
            setCurrentRoute('details');
          } else {
            getMediaDetails(id, 'tv').then((m) => {
              setSelectedItem(m);
              setCurrentRoute('details');
            }).catch(() => {
              setSelectedItem(lanternsCuratedDetails);
              setCurrentRoute('details');
            });
          }
        }
      } else if (path.startsWith('/anime/')) {
        const id = path.replace('/anime/', '').replace(/\/$/, '');
        const match = allMedia.find((m) => m.id === id);
        if (match) {
          setSelectedItem(match);
        } else {
          setSelectedItem({
            id,
            title: 'Anime',
            overview: '',
            media_type: 'anime',
            poster_path: '',
            backdrop_path: '',
            vote_average: 8.5
          });
        }
        setCurrentRoute('anime-details');
      } else if (path.startsWith('/watch/movie/')) {
        const id = path.replace('/watch/movie/', '').replace(/\/$/, '');
        const match = allMedia.find((m) => m.id === id);
        if (match) {
          setPlayingItem(match);
          setPlayingEpisode(1);
          setPlayingSeason(1);
          setCurrentRoute('watch');
        } else {
          getMediaDetails(id, 'movie').then((m) => {
            setPlayingItem(m);
            setPlayingEpisode(1);
            setPlayingSeason(1);
            setCurrentRoute('watch');
          }).catch(() => {
            setCurrentRoute('home');
          });
        }
      } else if (path.startsWith('/watch/tv/')) {
        const urlObj = new URL(window.location.href);
        const sParam = Number(urlObj.searchParams.get('season')) || 1;
        const epParam = Number(urlObj.searchParams.get('episode')) || 1;
        const id = path.replace('/watch/tv/', '').split('?')[0].replace(/\/$/, '');
        const match = allMedia.find((m) => m.id === id);
        if (match) {
          setPlayingItem(match);
          setPlayingSeason(sParam);
          setPlayingEpisode(epParam);
          setCurrentRoute('watch');
        } else {
          getMediaDetails(id, 'tv').then((m) => {
            setPlayingItem(m);
            setPlayingSeason(sParam);
            setPlayingEpisode(epParam);
            setCurrentRoute('watch');
          }).catch(() => {
            setCurrentRoute('home');
          });
        }
      } else if (path.startsWith('/watch/anime/')) {
        const parts = path.replace('/watch/anime/', '').split('/');
        const id = parts[0];
        const epParam = Number(parts[1]) || 1;
        const match = allMedia.find((m) => m.id === id);
        if (match) {
          setPlayingItem(match);
        } else {
          setPlayingItem({
            id,
            title: 'Anime',
            overview: '',
            media_type: 'anime',
            poster_path: '',
            backdrop_path: '',
            vote_average: 8.5
          });
        }
        setPlayingSeason(1);
        setPlayingEpisode(epParam);
        setCurrentRoute('watch');
      } else if (path === '/movies' || path === '/movie') {
        setCurrentRoute('movie');
      } else if (path === '/tv' || path === '/tv-shows') {
        setCurrentRoute('tv');
      } else if (path === '/anime') {
        setCurrentRoute('anime');
      } else if (path === '/sports' || path === '/livesports') {
        setCurrentRoute('livesports');
      } else if (path === '/music') {
        setCurrentRoute('music');
      } else if (path === '/providers') {
        setCurrentRoute('providers');
      } else if (path === '/watchlist') {
        setCurrentRoute('watchlist');
      } else if (path === '/settings') {
        setCurrentRoute('settings');
      } else if (path === '/ai' || path === '/ai-search' || path === '/search') {
        setCurrentRoute('ai');
      } else {
        setCurrentRoute('home');
      }
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  const handleNavigate = useCallback((route: string) => {
    setCurrentRoute(route);
    setSelectedItem(null);
    let targetUrl = `/${route}`;
    if (route === 'home') targetUrl = '/';
    if (route === 'livesports') targetUrl = '/sports';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: false });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleOpenDetails = useCallback((item: MediaItem) => {
    setSelectedItem(item);
    if (item.media_type === 'anime') {
      setCurrentRoute('anime-details');
      const targetUrl = `/anime/${item.id}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, '', targetUrl);
      }
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: false });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setCurrentRoute('details');
    const targetUrl = `/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: false });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handlePlay = useCallback((item: MediaItem, episode: number = 1, season: number = 1) => {
    setPlayingSeason(season || 1);
    setPlayingEpisode(episode || 1);
    setPlayingItem(item);
    setPreviousRoute(currentRoute);
    setCurrentRoute('watch');

    let watchUrl = '';
    if (item.media_type === 'movie') {
      watchUrl = `/watch/movie/${item.id}`;
    } else if (item.media_type === 'anime') {
      watchUrl = `/watch/anime/${item.id}/${episode || 1}`;
    } else {
      watchUrl = `/watch/tv/${item.id}?season=${season || 1}&episode=${episode || 1}`;
    }

    if (window.location.pathname !== watchUrl) {
      window.history.pushState({}, '', watchUrl);
    }
  }, [currentRoute]);

  const handleClosePlayer = useCallback(() => {
    setPlayingItem(null);
    if (selectedItem) {
      if (selectedItem.media_type === 'anime') {
        setCurrentRoute('anime-details');
        const targetUrl = `/anime/${selectedItem.id}`;
        if (window.location.pathname !== targetUrl) {
          window.history.pushState({}, '', targetUrl);
        }
      } else {
        setCurrentRoute('details');
        const targetUrl = `/${selectedItem.media_type === 'tv' ? 'tv' : 'movie'}/${selectedItem.id}`;
        if (window.location.pathname !== targetUrl) {
          window.history.pushState({}, '', targetUrl);
        }
      }
    } else {
      const backRoute = previousRoute === 'watch' ? 'home' : (previousRoute || 'home');
      setCurrentRoute(backRoute);
      let targetUrl = `/${backRoute}`;
      if (backRoute === 'home') targetUrl = '/';
      if (backRoute === 'livesports') targetUrl = '/sports';
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, '', targetUrl);
      }
    }
  }, [selectedItem, previousRoute]);

  const handleToggleWatchlist = useCallback((item: MediaItem) => {
    setWatchlist((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  }, []);

  const handleClearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col font-sans bg-transparent text-foreground">
      {/* Header Navigation - Hidden on watch page */}
      {currentRoute !== 'watch' && (
        <Navbar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
          watchlistCount={watchlist.length}
        />
      )}

      {/* Main Page View */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoute + (selectedItem?.id ? `-${selectedItem.id}` : '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <React.Suspense fallback={<div className="min-h-screen bg-transparent" />}>
              {/* Dedicated Full-Page CinemaOS Player */}
              {currentRoute === 'watch' && playingItem && (
                <CinemaOSPlayer
                  item={playingItem}
                  initialSeason={playingSeason}
                  initialEpisode={playingEpisode}
                  episodesList={playingItem?.episodes_list}
                  onClose={handleClosePlayer}
                  onEpisodeChange={(s, ep) => {
                    setPlayingSeason(s);
                    setPlayingEpisode(ep);
                    if (playingItem.media_type === 'tv') {
                      window.history.replaceState({}, '', `/watch/tv/${playingItem.id}?season=${s}&episode=${ep}`);
                    } else if (playingItem.media_type === 'anime') {
                      window.history.replaceState({}, '', `/watch/anime/${playingItem.id}/${ep}`);
                    }
                  }}
                />
              )}

              {currentRoute === 'home' && (
                <HomePage
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                  onNavigate={handleNavigate}
                />
              )}

              {currentRoute === 'movie' && (
                <MoviesPage
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}

              {currentRoute === 'tv' && (
                <TVShowsPage
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}

              {currentRoute === 'anime' && (
                <AnimePage
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}

              {currentRoute === 'ai' && (
                <AISearchPage
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}

              {currentRoute === 'livesports' && <LiveSportsPage />}

              {currentRoute === 'music' && <MusicPage />}

              {currentRoute === 'providers' && (
                <ProvidersPage
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}

              {currentRoute === 'watchlist' && (
                <WatchlistPage
                  watchlist={watchlist}
                  onPlay={handlePlay}
                  onOpenDetails={handleOpenDetails}
                  onToggleWatchlist={handleToggleWatchlist}
                  onClearWatchlist={handleClearWatchlist}
                  onNavigate={handleNavigate}
                />
              )}

              {currentRoute === 'settings' && <SettingsPage />}

              {currentRoute === 'anime-details' && selectedItem && (
                <AnimeDetailsPage
                  item={selectedItem}
                  onBack={() => handleNavigate('anime')}
                  onPlay={(item, ep) => handlePlay(item, ep || 1, 1)}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}

              {currentRoute === 'details' && selectedItem && (
                <DetailsPage
                  item={selectedItem}
                  onBack={() => handleNavigate('home')}
                  onPlay={(item, ep, season) => handlePlay(item, ep || 1, season || 1)}
                  onOpenDetails={handleOpenDetails}
                  watchlist={watchlist}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer - Hidden on watch page */}
      {currentRoute !== 'watch' && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Floating Mobile Dock - Hidden on watch page */}
      {currentRoute !== 'watch' && (
        <MobileNav
          currentRoute={currentRoute}
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
              items={allMedia}
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

export default App;

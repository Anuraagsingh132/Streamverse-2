import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/HeroBanner';
import { TopTenRow } from '../components/TopTenRow';
import { ProviderRail } from '../components/ProviderRail';
import { GenreRail } from '../components/GenreRail';
import { PlatformsMarquee } from '../components/PlatformsMarquee';
import { SEOHead } from '../components/SEOHead';
import { ContinueWatchingRail } from '../components/ContinueWatchingRail';
import { MediaItem } from '../types/media';
import { 
  liveHeroItems, 
  liveTop10Movies, 
  liveTop10Shows, 
  liveTopRatedMovies, 
  liveTopRatedShows 
} from '../data/cinemaosLiveMatch';
import { getTrending, getTopRated } from '../services/tmdb';
import { mergeValidMediaWithFallback } from '../utils/mediaFilters';

interface HomePageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onNavigate
}) => {
  const [heroItemsList] = useState<MediaItem[]>(liveHeroItems);
  const [moviesList, setMoviesList] = useState<MediaItem[]>(liveTop10Movies);
  const [showsList, setShowsList] = useState<MediaItem[]>(liveTop10Shows);
  const [topRatedFilter, setTopRatedFilter] = useState<'movie' | 'tv'>('movie');
  const [topRatedMoviesList, setTopRatedMoviesList] = useState<MediaItem[]>(liveTopRatedMovies);
  const [topRatedShowsList, setTopRatedShowsList] = useState<MediaItem[]>(liveTopRatedShows);

  // Progressive background fetch to enrich data from TMDB API while keeping valid backdrops
  useEffect(() => {
    let isMounted = true;

    getTrending('movie', 'day')
      .then((res) => {
        if (isMounted && res?.length) {
          setMoviesList(mergeValidMediaWithFallback(res, liveTop10Movies));
        }
      })
      .catch(() => {});

    getTrending('tv', 'day')
      .then((res) => {
        if (isMounted && res?.length) {
          setShowsList(mergeValidMediaWithFallback(res, liveTop10Shows));
        }
      })
      .catch(() => {});

    getTopRated('movie')
      .then((res) => {
        if (isMounted && res?.length) {
          setTopRatedMoviesList(mergeValidMediaWithFallback(res, liveTopRatedMovies));
        }
      })
      .catch(() => {});

    getTopRated('tv')
      .then((res) => {
        if (isMounted && res?.length) {
          setTopRatedShowsList(mergeValidMediaWithFallback(res, liveTopRatedShows));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTopRated = topRatedFilter === 'movie' ? topRatedMoviesList : topRatedShowsList;

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Streamverse - Watch Movies, Anime, TV Shows & Live Sports"
        description="Discover and stream popular movies, trending anime, binge-worthy TV series and live sports with high-definition playback on Streamverse."
      />
      {/* Hero Showcase with Ambient Glow & Up Next Rail (10 slides) */}
      <HeroBanner
        items={heroItemsList}
        onPlay={onPlay}
        onOpenDetails={onOpenDetails}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />

      {/* Main Content Overlapping Hero with exact negative margin */}
      <div className="relative z-10 -mt-[32vh] sm:-mt-20 md:-mt-24 lg:-mt-52 4xl:-mt-72 space-y-6">
        {/* Continue Watching Rail */}
        <ContinueWatchingRail onPlay={onPlay} onOpenDetails={onOpenDetails} />

        {/* Top 10 Movies */}
        <TopTenRow
          title="Top 10 movies"
          subtitle="Trending today"
          items={moviesList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate('movie')}
        />

        {/* Top 10 Shows */}
        <TopTenRow
          title="Top 10 shows"
          subtitle="Trending today"
          items={showsList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate('tv')}
        />

        {/* Streaming Providers Rail */}
        <ProviderRail
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateAll={() => onNavigate('providers')}
        />

        {/* Top 10 Rated with Movies / TV Shows toggle */}
        <TopTenRow
          title="Top 10 rated"
          subtitle="All-time favourites"
          items={activeTopRated}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate('movie')}
          typeFilter={topRatedFilter}
          onTypeFilterChange={setTopRatedFilter}
        />

        {/* Browse by Genre */}
        <GenreRail
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateGenre={() => onNavigate('movie')}
        />

        {/* Platforms Marquee */}
        <PlatformsMarquee />
      </div>
    </div>
  );
};

export default HomePage;

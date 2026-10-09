import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import { HeroBanner } from '../components/HeroBanner';
import { TopTenRow } from '../components/TopTenRow';
import { MediaRail } from '../components/MediaRail';
import { ProviderRail } from '../components/ProviderRail';
import { SEOHead } from '../components/SEOHead';
import { 
  movieHeroItems, 
  movieTop10Items, 
  moviePopularItems, 
  movieActionItems, 
  movieComedyItems, 
  movieNowPlayingItems, 
  movieTopRatedItems, 
  movieUpcomingItems 
} from '../data/cinemaosMovieMatch';
import { 
  getPopular, 
  getTopRated, 
  getByGenre, 
  getTrending, 
  getNowPlayingMovies, 
  getUpcomingMovies 
} from '../services/tmdb';

import { mergeValidMediaWithFallback } from '../utils/mediaFilters';

interface MoviesPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigate?: (tab: string) => void;
}

export const MoviesPage: React.FC<MoviesPageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onNavigate
}) => {
  const [heroMoviesList] = useState<MediaItem[]>(movieHeroItems);
  const [trendingMoviesList, setTrendingMoviesList] = useState<MediaItem[]>(movieTop10Items);
  const [popularMoviesList, setPopularMoviesList] = useState<MediaItem[]>(moviePopularItems);
  const [actionMoviesList, setActionMoviesList] = useState<MediaItem[]>(movieActionItems);
  const [comedyMoviesList, setComedyMoviesList] = useState<MediaItem[]>(movieComedyItems);
  const [nowPlayingList, setNowPlayingList] = useState<MediaItem[]>(movieNowPlayingItems);
  const [topRatedList, setTopRatedList] = useState<MediaItem[]>(movieTopRatedItems);
  const [upcomingMoviesList, setUpcomingMoviesList] = useState<MediaItem[]>(movieUpcomingItems);

  // Progressive background fetch to enrich data from TMDB API while keeping valid backdrops
  useEffect(() => {
    let isMounted = true;

    // Progressive asynchronous streaming: update each rail immediately upon arrival
    getTrending('movie', 'day')
      .then(res => { if (isMounted && res?.length) setTrendingMoviesList(mergeValidMediaWithFallback(res, movieTop10Items)); })
      .catch(() => {});

    getPopular('movie')
      .then(res => { if (isMounted && res?.length) setPopularMoviesList(mergeValidMediaWithFallback(res, moviePopularItems)); })
      .catch(() => {});

    getTopRated('movie')
      .then(res => { if (isMounted && res?.length) setTopRatedList(mergeValidMediaWithFallback(res, movieTopRatedItems)); })
      .catch(() => {});

    getByGenre(28, 'movie')
      .then(res => { if (isMounted && res?.length) setActionMoviesList(mergeValidMediaWithFallback(res, movieActionItems)); })
      .catch(() => {});

    getByGenre(35, 'movie')
      .then(res => { if (isMounted && res?.length) setComedyMoviesList(mergeValidMediaWithFallback(res, movieComedyItems)); })
      .catch(() => {});

    getNowPlayingMovies()
      .then(res => { if (isMounted && res?.length) setNowPlayingList(mergeValidMediaWithFallback(res, movieNowPlayingItems)); })
      .catch(() => {});

    getUpcomingMovies()
      .then(res => { if (isMounted && res?.length) setUpcomingMoviesList(mergeValidMediaWithFallback(res, movieUpcomingItems)); })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Browse Movies"
        description="Stream popular, top rated, and upcoming blockbuster movies in 4K and 1080p on Streamverse."
      />
      {/* Hero Showcase (Movie Focus - Resident Evil lead with stylized red logo) */}
      <HeroBanner
        items={heroMoviesList}
        onPlay={onPlay}
        onOpenDetails={onOpenDetails}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />

      {/* Main Content Overlapping Hero */}
      <div className="relative z-10 -mt-[32vh] sm:-mt-20 md:-mt-24 lg:-mt-52 4xl:-mt-72 space-y-6 pb-12">
        {/* Top 10 Today Row */}
        <TopTenRow
          title="Top 10 today"
          subtitle="Trending today"
          items={trendingMoviesList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Popular Movies Rail */}
        <MediaRail
          title="Popular Movies"
          subtitle="Fan favourites"
          items={popularMoviesList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Action Movies Rail */}
        <MediaRail
          title="Action Movies"
          subtitle="By genre"
          items={actionMoviesList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Streaming Providers Rail */}
        <ProviderRail
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateAll={() => onNavigate?.('providers')}
          defaultType="movie"
        />

        {/* Comedy Movies Rail */}
        <MediaRail
          title="Comedy Movies"
          subtitle="By genre"
          items={comedyMoviesList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Now Playing Rail */}
        <MediaRail
          title="Now Playing"
          subtitle="In theatres"
          items={nowPlayingList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Top Rated Rail */}
        <MediaRail
          title="Top Rated"
          subtitle="Critically acclaimed"
          items={topRatedList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Upcoming Movies Rail */}
        <MediaRail
          title="Upcoming Movies"
          subtitle="Coming soon"
          items={upcomingMoviesList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />
      </div>
    </div>
  );
};

export default MoviesPage;

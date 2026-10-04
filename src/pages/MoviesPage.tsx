import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import { HeroBanner } from '../components/HeroBanner';
import { TopTenRow } from '../components/TopTenRow';
import { MediaRail } from '../components/MediaRail';
import { ProviderRail } from '../components/ProviderRail';
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

interface MoviesPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

export const MoviesPage: React.FC<MoviesPageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  const [heroMoviesList, setHeroMoviesList] = useState<MediaItem[]>(movieHeroItems);
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

    // Helper to keep only items with valid image backdrops
    const filterValid = (items: MediaItem[] | undefined, fallback: MediaItem[]) => {
      if (!items || items.length === 0) return fallback;
      const valid = items.filter(i => Boolean(i.backdrop_path && i.backdrop_path.trim() !== ''));
      // Merge with curated items so top positions keep the recognizable CinemaOS look
      const merged = [...fallback.slice(0, 4), ...valid.filter(v => !fallback.slice(0, 4).some(f => f.id === v.id))];
      return merged.slice(0, 15);
    };

    // Progressive asynchronous streaming: update each rail immediately upon arrival
    getTrending('movie', 'day')
      .then(res => { if (isMounted && res?.length) setTrendingMoviesList(filterValid(res, movieTop10Items)); })
      .catch(() => {});

    getPopular('movie')
      .then(res => { if (isMounted && res?.length) setPopularMoviesList(filterValid(res, moviePopularItems)); })
      .catch(() => {});

    getTopRated('movie')
      .then(res => { if (isMounted && res?.length) setTopRatedList(filterValid(res, movieTopRatedItems)); })
      .catch(() => {});

    getByGenre(28, 'movie')
      .then(res => { if (isMounted && res?.length) setActionMoviesList(filterValid(res, movieActionItems)); })
      .catch(() => {});

    getByGenre(35, 'movie')
      .then(res => { if (isMounted && res?.length) setComedyMoviesList(filterValid(res, movieComedyItems)); })
      .catch(() => {});

    getNowPlayingMovies()
      .then(res => { if (isMounted && res?.length) setNowPlayingList(filterValid(res, movieNowPlayingItems)); })
      .catch(() => {});

    getUpcomingMovies()
      .then(res => { if (isMounted && res?.length) setUpcomingMoviesList(filterValid(res, movieUpcomingItems)); })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
        />

        {/* Streaming Providers Rail */}
        <ProviderRail
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
        />
      </div>
    </div>
  );
};

export default MoviesPage;

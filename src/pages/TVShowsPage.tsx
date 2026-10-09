import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import { HeroBanner } from '../components/HeroBanner';
import { TopTenRow } from '../components/TopTenRow';
import { MediaRail } from '../components/MediaRail';
import { ProviderRail } from '../components/ProviderRail';
import { SEOHead } from '../components/SEOHead';
import { 
  tvHeroItems, 
  tvTop10Items, 
  tvPopularItems, 
  tvDramaItems, 
  tvComedyItems, 
  tvAiringTodayItems, 
  tvTopRatedItems, 
  tvOnTheAirItems 
} from '../data/cinemaosTvMatch';
import { 
  getPopular, 
  getTopRated, 
  getByGenre, 
  getTrending, 
  getAiringTodayTV, 
  getOnTheAirTV 
} from '../services/tmdb';

import { mergeValidMediaWithFallback } from '../utils/mediaFilters';

interface TVShowsPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigate?: (tab: string) => void;
}

export const TVShowsPage: React.FC<TVShowsPageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onNavigate
}) => {
  const [heroShowsList] = useState<MediaItem[]>(tvHeroItems);
  const [trendingShowsList, setTrendingShowsList] = useState<MediaItem[]>(tvTop10Items);
  const [popularShowsList, setPopularShowsList] = useState<MediaItem[]>(tvPopularItems);
  const [dramaShowsList, setDramaShowsList] = useState<MediaItem[]>(tvDramaItems);
  const [comedyShowsList, setComedyShowsList] = useState<MediaItem[]>(tvComedyItems);
  const [airingTodayList, setAiringTodayList] = useState<MediaItem[]>(tvAiringTodayItems);
  const [topRatedShowsList, setTopRatedShowsList] = useState<MediaItem[]>(tvTopRatedItems);
  const [onTheAirList, setOnTheAirList] = useState<MediaItem[]>(tvOnTheAirItems);

  // Progressive background fetch to enrich data from TMDB API while keeping valid backdrops
  useEffect(() => {
    let isMounted = true;

    // Progressive asynchronous streaming: update each rail immediately upon arrival
    getTrending('tv', 'day')
      .then(res => { if (isMounted && res?.length) setTrendingShowsList(mergeValidMediaWithFallback(res, tvTop10Items)); })
      .catch(() => {});

    getPopular('tv')
      .then(res => { if (isMounted && res?.length) setPopularShowsList(mergeValidMediaWithFallback(res, tvPopularItems)); })
      .catch(() => {});

    getTopRated('tv')
      .then(res => { if (isMounted && res?.length) setTopRatedShowsList(mergeValidMediaWithFallback(res, tvTopRatedItems)); })
      .catch(() => {});

    getByGenre(18, 'tv')
      .then(res => { if (isMounted && res?.length) setDramaShowsList(mergeValidMediaWithFallback(res, tvDramaItems)); })
      .catch(() => {});

    getByGenre(35, 'tv')
      .then(res => { if (isMounted && res?.length) setComedyShowsList(mergeValidMediaWithFallback(res, tvComedyItems)); })
      .catch(() => {});

    getAiringTodayTV()
      .then(res => { if (isMounted && res?.length) setAiringTodayList(mergeValidMediaWithFallback(res, tvAiringTodayItems)); })
      .catch(() => {});

    getOnTheAirTV()
      .then(res => { if (isMounted && res?.length) setOnTheAirList(mergeValidMediaWithFallback(res, tvOnTheAirItems)); })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Browse TV Shows"
        description="Stream trending series, award-winning dramas, and new releases with full season episode support on Streamverse."
      />
      {/* Hero Showcase (TV Focus - Coven Academy lead) */}
      <HeroBanner
        items={heroShowsList}
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
          items={trendingShowsList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Popular Shows Rail */}
        <MediaRail
          title="Popular Shows"
          subtitle="Fan favourites"
          items={popularShowsList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Drama Shows Rail */}
        <MediaRail
          title="Drama Shows"
          subtitle="By genre"
          items={dramaShowsList}
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
          defaultType="tv"
        />

        {/* Comedy Shows Rail */}
        <MediaRail
          title="Comedy Shows"
          subtitle="By genre"
          items={comedyShowsList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Airing Today Rail */}
        <MediaRail
          title="Airing Today"
          subtitle="New episodes"
          items={airingTodayList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* Top Rated Shows Rail */}
        <MediaRail
          title="Top Rated Shows"
          subtitle="Critically acclaimed"
          items={topRatedShowsList}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onBrowseAll={() => onNavigate?.('providers')}
        />

        {/* On the Air Rail */}
        <MediaRail
          title="On the Air"
          subtitle="Currently airing"
          items={onTheAirList}
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

export default TVShowsPage;

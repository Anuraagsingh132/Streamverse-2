import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types/media';
import { HeroBanner } from '../components/HeroBanner';
import { TopTenRow } from '../components/TopTenRow';
import { MediaRail } from '../components/MediaRail';
import { ProviderRail } from '../components/ProviderRail';
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

interface TVShowsPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

export const TVShowsPage: React.FC<TVShowsPageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  const [heroShowsList, setHeroShowsList] = useState<MediaItem[]>(tvHeroItems);
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

    // Helper to keep only items with valid image backdrops
    const filterValid = (items: MediaItem[] | undefined, fallback: MediaItem[]) => {
      if (!items || items.length === 0) return fallback;
      const valid = items.filter(i => Boolean(i.backdrop_path && i.backdrop_path.trim() !== ''));
      // Merge with curated items so top positions keep the recognizable CinemaOS look
      const merged = [...fallback.slice(0, 4), ...valid.filter(v => !fallback.slice(0, 4).some(f => f.id === v.id))];
      return merged.slice(0, 15);
    };

    // Progressive asynchronous streaming: update each rail immediately upon arrival
    getTrending('tv', 'day')
      .then(res => { if (isMounted && res?.length) setTrendingShowsList(filterValid(res, tvTop10Items)); })
      .catch(() => {});

    getPopular('tv')
      .then(res => { if (isMounted && res?.length) setPopularShowsList(filterValid(res, tvPopularItems)); })
      .catch(() => {});

    getTopRated('tv')
      .then(res => { if (isMounted && res?.length) setTopRatedShowsList(filterValid(res, tvTopRatedItems)); })
      .catch(() => {});

    getByGenre(18, 'tv')
      .then(res => { if (isMounted && res?.length) setDramaShowsList(filterValid(res, tvDramaItems)); })
      .catch(() => {});

    getByGenre(35, 'tv')
      .then(res => { if (isMounted && res?.length) setComedyShowsList(filterValid(res, tvComedyItems)); })
      .catch(() => {});

    getAiringTodayTV()
      .then(res => { if (isMounted && res?.length) setAiringTodayList(filterValid(res, tvAiringTodayItems)); })
      .catch(() => {});

    getOnTheAirTV()
      .then(res => { if (isMounted && res?.length) setOnTheAirList(filterValid(res, tvOnTheAirItems)); })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen">
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
        />

        {/* Streaming Providers Rail */}
        <ProviderRail
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          watchlist={watchlist}
          onToggleWatchlist={onToggleWatchlist}
          onNavigateAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
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
          onBrowseAll={() => {}}
        />
      </div>
    </div>
  );
};

export default TVShowsPage;

import React, { useState } from 'react';
import { popularProviders, allMedia } from '../data/mediaData';
import { MediaCard } from '../components/MediaCard';
import { MediaItem } from '../types/media';
import { Film, Tv, TrendingUp, ArrowDownAZ } from 'lucide-react';
import { SEOHead } from '../components/SEOHead';

interface ProvidersPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('Netflix');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortMode, setSortMode] = useState<'popular' | 'alpha'>('popular');

  const extendedProviders = [
    ...popularProviders,
    { id: 'p7', name: 'Paramount+', logo: 'https://image.tmdb.org/t/p/w154/fi83B1oztoS47xxcemFdPMhIzK.png', count: 650, color: 'from-blue-700/20' },
    { id: 'p8', name: 'Hulu', logo: 'https://image.tmdb.org/t/p/w154/bxBlRTAjqM2zbVq5wfslVZaUlIl.png', count: 820, color: 'from-emerald-600/20' },
    { id: 'p9', name: 'Peacock', logo: 'https://image.tmdb.org/t/p/w154/8VCV78eh0RFFdYsTRuPqXH87bvU.png', count: 490, color: 'from-amber-500/20' },
    { id: 'p10', name: 'BBC iPlayer', logo: 'https://image.tmdb.org/t/p/w154/wRbj1hLd9xV4k70w198B75L4o.png', count: 340, color: 'from-red-700/20' },
    { id: 'p11', name: 'Discovery+', logo: 'https://image.tmdb.org/t/p/w154/f5T163pY9eWp6j8U74v0q0e1z0p.png', count: 410, color: 'from-blue-500/20' },
    { id: 'p12', name: 'AMC+', logo: 'https://image.tmdb.org/t/p/w154/uF9T4aJm0iN2Pq6y9v5x0e3a1b.png', count: 280, color: 'from-zinc-700/20' }
  ];

  let providerMedia = allMedia.filter(
    (item) => item.provider?.toLowerCase() === selectedProvider.toLowerCase()
  );

  // If specific provider has few mock items, supplement with relevant media items
  if (providerMedia.length < 4) {
    if (selectedProvider === 'Netflix') {
      providerMedia = allMedia.slice(0, 8);
    } else if (selectedProvider === 'Apple TV+') {
      providerMedia = allMedia.filter((m) => m.year === 2026).slice(0, 8);
    } else if (selectedProvider === 'Disney+') {
      providerMedia = allMedia.filter((m) => m.genres?.includes('Action') || m.genres?.includes('Adventure')).slice(0, 8);
    } else if (selectedProvider === 'Crunchyroll') {
      providerMedia = allMedia.filter((m) => m.media_type === 'anime').slice(0, 8);
    } else {
      providerMedia = allMedia.slice(2, 9);
    }
  }

  if (mediaFilter !== 'all') {
    providerMedia = providerMedia.filter((m) => m.media_type === mediaFilter);
  }

  if (sortMode === 'alpha') {
    providerMedia = [...providerMedia].sort((a, b) => a.title.localeCompare(b.title));
  } else {
    providerMedia = [...providerMedia].sort((a, b) => b.vote_average - a.vote_average);
  }

  return (
    <div className="relative min-h-screen pt-28 pb-16">
      <SEOHead
        title="Streaming Providers - Watch by Platform"
        description="Browse films, television series, and anime by popular streaming networks and studios including Netflix, Disney+, Apple TV+, and more."
      />
      {/* Header matching providers.html */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 mb-8">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            Streamverse
          </p>
        </div>
        <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-white md:text-6xl">
          Every service. One place.
        </h1>
        <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-xl">
          Browse what's popular on dozens of streaming services.
        </p>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMediaFilter(mediaFilter === 'movie' ? 'all' : 'movie')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition backdrop-blur-md border ${
              mediaFilter === 'movie'
                ? 'bg-white text-black border-white'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            Movies
          </button>

          <button
            onClick={() => setMediaFilter(mediaFilter === 'tv' ? 'all' : 'tv')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition backdrop-blur-md border ${
              mediaFilter === 'tv'
                ? 'bg-white text-black border-white'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            TV Shows
          </button>

          <button
            onClick={() => setSortMode('popular')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition backdrop-blur-md border ${
              sortMode === 'popular'
                ? 'bg-white text-black border-white'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Most watched
          </button>

          <button
            onClick={() => setSortMode('alpha')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition backdrop-blur-md border ${
              sortMode === 'alpha'
                ? 'bg-white text-black border-white'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/20'
            }`}
          >
            <ArrowDownAZ className="h-3.5 w-3.5" />
            A to Z
          </button>
        </div>
      </div>

      {/* Popular Services Section */}
      <section className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl mb-4">
          Popular services
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {popularProviders.map((p) => {
            const isSelected = selectedProvider.toLowerCase() === p.name.toLowerCase();
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.name)}
                className={`group relative flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition duration-300 ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-105'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 p-2 shadow-inner ring-1 ring-white/10">
                  <img src={p.logo} alt={p.name} className="h-full w-full object-contain" />
                </div>
                <div className="text-xs font-bold text-white">{p.name}</div>
                <div className="text-[10px] text-zinc-400">{p.count}+ titles</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* All Services Grid */}
      <section className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl mb-4">
          All services
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2.5">
          {extendedProviders.map((p) => {
            const isSelected = selectedProvider.toLowerCase() === p.name.toLowerCase();
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.name)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition text-center ${
                  isSelected
                    ? 'border-primary bg-primary/15'
                    : 'border-white/5 bg-white/[0.03] hover:border-white/20'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 p-1.5">
                  <img src={p.logo} alt={p.name} className="h-full w-full object-contain" />
                </div>
                <span className="text-[11px] font-medium text-white truncate max-w-full">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Content for Selected Provider */}
      <section className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">
            Available on {selectedProvider} ({providerMedia.length})
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {providerMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              isWatchlist={watchlist.includes(item.id)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

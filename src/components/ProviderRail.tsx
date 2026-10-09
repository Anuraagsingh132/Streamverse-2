import React, { useState, useEffect, useRef } from 'react';
import { Film, Tv, ArrowUpRight, Play, Plus, Check, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MediaItem } from '../types/media';
import { exactNetflixMovies } from '../data/cinemaosRichData';
import { tvNetflixItems } from '../data/cinemaosTvMatch';
import { allMedia } from '../data/mediaData';
import { getByProvider, PROVIDER_NAME_TO_ID } from '../services/tmdb';

import { FALLBACK_BACKDROP } from '../utils/imageUtils';

interface ProviderRailProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigateAll?: () => void;
  items?: MediaItem[];
  defaultType?: 'movie' | 'tv';
}

export const ProviderRail: React.FC<ProviderRailProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onNavigateAll,
  items = allMedia,
  defaultType = 'movie'
}) => {
  const [selectedProvider, setSelectedProvider] = useState('Netflix');
  const [filterType, setFilterType] = useState<'movie' | 'tv'>(defaultType);
  const [providerItems, setProviderItems] = useState<MediaItem[]>(defaultType === 'tv' ? tvNetflixItems : exactNetflixMovies);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const providers = [
    { name: 'Netflix', id: 8, logo: 'https://image.tmdb.org/t/p/w154/rK1KljqmbvO9HQa1PBFLILWah72.png', color: 'rgba(229,9,20,0.55)' },
    { name: 'Prime Video', id: 9, logo: 'https://image.tmdb.org/t/p/w154/gMZdpavHmxFNnLpMHwVxfqeux2g.png', color: 'rgba(0,168,225,0.55)' },
    { name: 'Apple TV+', id: 350, logo: 'https://image.tmdb.org/t/p/w154/9icYBfYFcwgCbky5VdGUIKJ4C5i.png', color: 'rgba(255,255,255,0.35)' },
    { name: 'Disney+', id: 337, logo: 'https://image.tmdb.org/t/p/w154/5eZ872CghnHFLB1j8grszbrx0dx.png', color: 'rgba(17,60,207,0.55)' },
    { name: 'Max', id: 1899, logo: 'https://image.tmdb.org/t/p/w154/skypuy7SXuugIQeYg0IglmzoKaS.png', color: 'rgba(0,40,250,0.55)' },
    { name: 'Hulu', id: 15, logo: 'https://image.tmdb.org/t/p/w154/44uAnmSqvA4yBOdbPWN8YgQHjWm.png', color: 'rgba(28,231,131,0.55)' },
    { name: 'Paramount+', id: 531, logo: 'https://image.tmdb.org/t/p/w154/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png', color: 'rgba(0,100,230,0.55)' },
    { name: 'Peacock', id: 386, logo: 'https://image.tmdb.org/t/p/w154/a1UIdq5BrkcAxnxcUhFsNbXnxeu.png', color: 'rgba(234,179,8,0.55)' },
    { name: 'Crunchyroll', id: 283, logo: 'https://image.tmdb.org/t/p/w154/uFL3c4Cq8M6WoLymlC5Y8bmGytV.png', color: 'rgba(244,117,33,0.55)' },
    { name: 'Starz', id: 43, logo: 'https://image.tmdb.org/t/p/w154/h25xjouKmiSmFiiqw0aDXbxGZo7.png', color: 'rgba(120,113,108,0.55)' },
    { name: 'AMC+', id: 528, logo: 'https://image.tmdb.org/t/p/w154/wsCUflcmL4dCkzBUaGP8cj1cTkh.png', color: 'rgba(239,68,68,0.55)' },
    { name: 'MUBI', id: 11, logo: 'https://image.tmdb.org/t/p/w154/k7iSlvgWzZuO4zU5PcBjhABMuia.png', color: 'rgba(59,130,246,0.55)' },
    { name: 'Shudder', id: 99, logo: 'https://image.tmdb.org/t/p/w154/58O6yqUFM6qoOiBNAddJs7xNKc.png', color: 'rgba(220,38,38,0.55)' },
    { name: 'Discovery+', id: 526, logo: 'https://image.tmdb.org/t/p/w154/tHseJEgZaUdVlLtBpOGmKPfzbQ8.png', color: 'rgba(14,165,233,0.55)' },
    { name: 'Tubi', id: 73, logo: 'https://image.tmdb.org/t/p/w154/9dEuvA8wg5TSeFBZlPxSVxFdimJ.png', color: 'rgba(234,88,12,0.55)' },
    { name: 'Pluto TV', id: 300, logo: 'https://image.tmdb.org/t/p/w154/fN4czqaMQNLeF6sSSIjGbAWzvwK.png', color: 'rgba(250,204,21,0.55)' },
  ];

  const currentProviderObj = providers.find((p) => p.name === selectedProvider) || providers[0];

  // Fetch live TMDB titles when provider or media type changes
  useEffect(() => {
    let isMounted = true;

    // For Netflix on first load, exact curated items provide instant 1:1 render matching CinemaOS
    if (selectedProvider === 'Netflix') {
      setProviderItems(filterType === 'tv' ? tvNetflixItems : exactNetflixMovies);
      return;
    }

    const fetchProviderData = async () => {
      setIsLoading(true);
      try {
        const providerId = currentProviderObj.id || PROVIDER_NAME_TO_ID[selectedProvider.toLowerCase()] || 8;
        const results = await getByProvider(providerId, filterType);
        if (isMounted && results.length > 0) {
          setProviderItems(results);
        }
      } catch (err) {
        console.warn('TMDB Provider fetch error:', err);
        if (isMounted) {
          // Fallback to local filtering
          const fallback = items.filter(
            (i) => i.provider === selectedProvider || i.media_type === filterType
          ).concat(items.slice(0, 6)).slice(0, 8);
          setProviderItems(fallback);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProviderData();
    return () => {
      isMounted = false;
    };
  }, [selectedProvider, filterType, currentProviderObj.id, items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const amount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - amount : scrollLeft + amount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-6 cv-auto">
      {/* Section Header */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Where to watch
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              Streaming providers
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Movies / TV Shows Toggle */}
            <div className="flex rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setFilterType('movie')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filterType === 'movie'
                    ? 'bg-white text-black shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                Movies
              </button>
              <button
                type="button"
                onClick={() => setFilterType('tv')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filterType === 'tv'
                    ? 'bg-white text-black shadow'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Tv className="h-3.5 w-3.5" />
                TV Shows
              </button>
            </div>

            {/* View All Providers Link */}
            {onNavigateAll && (
              <button
                type="button"
                onClick={onNavigateAll}
                className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white sm:flex"
              >
                All <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Platform Switcher Buttons Rail */}
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 pt-2 sm:gap-5 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        {providers.map((p) => {
          const isSelected = selectedProvider === p.name;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => setSelectedProvider(p.name)}
              className="group flex w-16 shrink-0 flex-col items-center gap-2 sm:w-[72px]"
              aria-pressed={isSelected}
            >
              <span
                className={`relative h-14 w-14 overflow-hidden rounded-[18px] transition duration-300 sm:h-16 sm:w-16 bg-zinc-950 p-2 ${
                  isSelected
                    ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-transparent'
                    : 'opacity-60 grayscale-[60%] group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0'
                }`}
                style={{
                  boxShadow: isSelected
                    ? `0 10px 30px -6px ${p.color}`
                    : '0 8px 20px -10px rgba(0,0,0,0.7)'
                }}
              >
                <img
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                  src={p.logo}
                />
              </span>
              <span
                className={`w-full truncate text-center text-[11px] font-medium transition-colors ${
                  isSelected ? 'text-white font-semibold' : 'text-zinc-400 group-hover:text-white'
                }`}
              >
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Provider Sub-Header Card (1:1 CinemaOS) */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 mt-4">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 overflow-hidden rounded-xl bg-zinc-950 p-1.5 ring-1 ring-white/10">
              <img
                alt={selectedProvider}
                className="h-full w-full object-contain"
                src={currentProviderObj.logo}
              />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Popular {filterType === 'tv' ? 'series' : 'movies'} on
              </p>
              <h3 className="truncate text-lg font-bold text-white flex items-center gap-2">
                {selectedProvider}
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-rose-500" />}
              </h3>
            </div>
          </div>

          {onNavigateAll && (
            <button
              type="button"
              onClick={onNavigateAll}
              className="flex shrink-0 items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-white/85"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Media Cards Rail */}
      <div className="mt-2">
        <div className="group/rail relative">
          {/* Scroll Arrows */}
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 z-30 -translate-y-1/2 hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl backdrop-blur-md transition duration-300 hover:scale-110 hover:bg-black/80 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 z-30 -translate-y-1/2 hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl backdrop-blur-md transition duration-300 hover:scale-110 hover:bg-black/80 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-8 pt-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14"
            style={{
              maskImage: 'linear-gradient(to right, black 0%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 100%)'
            }}
          >
            {providerItems.map((item, idx) => {
              const isSaved = watchlist.includes(item.id);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="w-[78vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]"
                >
                  <div
                    onClick={() => onOpenDetails(item)}
                    onMouseEnter={() => {
                      if (item.media_type === 'anime') {
                        import('../pages/AnimeDetailsPage');
                      } else {
                        import('../pages/DetailsPage');
                      }
                    }}
                    className="group block cursor-pointer"
                  >
                    <div className="card-3d relative rounded-xl">
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                        <img
                          alt={item.title}
                          loading={idx < 3 ? "eager" : "lazy"}
                          decoding="async"
                          className="object-cover transition-[filter,transform] duration-700 group-hover:scale-105 h-full w-full"
                          src={
                            (item.backdrop_path || item.poster_path)?.includes('image.tmdb.org/t/p/')
                              ? (item.backdrop_path || item.poster_path)!.replace(/\/t\/p\/(original|w1280)\//, '/t/p/w780/')
                              : (item.backdrop_path || item.poster_path || FALLBACK_BACKDROP)
                          }
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (item.poster_path && target.src !== item.poster_path) {
                              target.src = item.poster_path;
                            } else if (target.src !== FALLBACK_BACKDROP) {
                              target.src = FALLBACK_BACKDROP;
                            }
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                        {/* Add to watchlist */}
                        <button
                          title={isSaved ? 'In watchlist' : 'Add to watchlist'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(item);
                          }}
                          className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-sm transition duration-200 ${
                            isSaved
                              ? 'opacity-100 bg-rose-600 text-white'
                              : 'opacity-0 group-hover:opacity-100 bg-black/50 text-white hover:bg-black/70'
                          }`}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>

                        {/* Play button on hover */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(item);
                          }}
                          className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        >
                          <div className="rounded-full bg-white/20 p-3 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                            <Play className="h-5 w-5 fill-white text-white" />
                          </div>
                        </div>
                      </div>
                      <span className="card-3d-glare" aria-hidden="true" />
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="truncate text-[13px] font-semibold leading-tight text-white">
                        {item.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded-full bg-rose-600/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-rose-400">
                          {item.media_type === 'tv' ? 'Series' : 'Movie'}
                        </span>
                        <span className="text-[11px] text-zinc-400">{item.year || 2026}</span>
                        <span className="ml-auto flex items-center gap-0.5 text-[11px] text-zinc-400">
                          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                          {item.vote_average ? item.vote_average.toFixed(1) : '8.0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProviderRail;

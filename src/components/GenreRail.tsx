import React, { useState, useEffect, useRef } from 'react';
import { Film, Tv, ArrowUpRight, Play, Plus, Check, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MediaItem } from '../types/media';
import { liveActionMovies, liveGenreConfigs } from '../data/cinemaosLiveMatch';
import { allMedia } from '../data/mediaData';
import { getByGenre, GENRE_NAME_TO_MOVIE_ID, GENRE_NAME_TO_TV_ID } from '../services/tmdb';
import { mergeValidMediaWithFallback } from '../utils/mediaFilters';

interface GenreRailProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigateGenre?: (genre: string) => void;
  items?: MediaItem[];
}

export const GenreRail: React.FC<GenreRailProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onNavigateGenre,
  items = allMedia
}) => {
  const [selectedGenre, setSelectedGenre] = useState('Action');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [genreItems, setGenreItems] = useState<MediaItem[]>(liveActionMovies);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const genres = liveGenreConfigs.map(g => ({
    name: g.name,
    image: g.img,
    color: g.gradient,
    glow: g.glowColor,
    dot: g.glowColor
  }));

  const currentGenreObj = genres.find((g) => g.name === selectedGenre) || genres[0];

  // Fetch live TMDB titles when genre or media type changes
  useEffect(() => {
    let isMounted = true;

    const fetchGenreData = async () => {
      setIsLoading(true);
      try {
        const genreId = mediaType === 'movie'
          ? (GENRE_NAME_TO_MOVIE_ID[selectedGenre] || 28)
          : (GENRE_NAME_TO_TV_ID[selectedGenre] || 10759);

        const results = await getByGenre(genreId, mediaType);
        if (isMounted && results.length > 0) {
          if (selectedGenre === 'Action' && mediaType === 'movie') {
            setGenreItems(mergeValidMediaWithFallback(results, liveActionMovies));
          } else {
            setGenreItems(results);
          }
        }
      } catch (err) {
        console.warn('TMDB Genre fetch error:', err);
        if (isMounted) {
          const fallback = items.filter(
            (item) => item.genres?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()) || item.media_type === mediaType
          ).concat(items.slice(0, 6)).slice(0, 8);
          setGenreItems(fallback);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGenreData();
    return () => {
      isMounted = false;
    };
  }, [selectedGenre, mediaType, items]);

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
    <section id="genres">
      <section className="py-10">
        {/* Section Header */}
        <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Find your mood
                </p>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Browse by genre
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Movies / TV Shows Toggle */}
              <div className="flex rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setMediaType('movie')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    mediaType === 'movie'
                      ? 'bg-white text-black shadow'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Film className="h-3.5 w-3.5" />
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('tv')}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    mediaType === 'tv'
                      ? 'bg-white text-black shadow'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5" />
                  TV Shows
                </button>
              </div>

              {onNavigateGenre && (
                <button
                  type="button"
                  onClick={() => onNavigateGenre(selectedGenre)}
                  className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white sm:flex"
                >
                  Browse {selectedGenre} <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Genre Buttons Horizontal Rail */}
        <div className="group/rail relative">
          <div
            className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-3 pb-3 pt-1 sm:gap-4 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14"
            style={{
              maskImage: 'linear-gradient(to right, black 0%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 100%)'
            }}
          >
            {genres.map((genre) => {
              const isSelected = selectedGenre === genre.name;
              return (
                <button
                  key={genre.name}
                  type="button"
                  onClick={() => setSelectedGenre(genre.name)}
                  aria-pressed={isSelected}
                  className={`group relative aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-2xl text-left transition duration-300 sm:w-48 lg:w-52 ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-black/0 scale-100 opacity-100'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 14px 34px -10px ${genre.glow}` : undefined
                  }}
                >
                  <img
                    alt={genre.name}
                    loading="eager"
                    decoding="async"
                    className="object-cover transition-transform duration-700 group-hover:scale-110 h-full w-full"
                    src={genre.image}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${genre.color} 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.85) 100%)`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3.5 right-3 text-base font-black leading-tight tracking-tight text-white drop-shadow-lg sm:text-lg">
                    {genre.name}
                  </span>
                  {isSelected && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black">
                      Showing
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-header (1:1 with CinemaOS) */}
        <div className="mt-6 flex items-center gap-2.5 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: currentGenreObj.dot }}
          />
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {selectedGenre}{' '}
            <span className="font-medium text-white/40">
              · {mediaType === 'tv' ? 'Series' : 'Movies'}
            </span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-rose-500" />}
          </h3>
        </div>

        {/* Media Rail for Selected Genre */}
        <div className="group/rail relative mt-2">
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
            {genreItems.map((item, idx) => {
              const isSaved = watchlist.includes(item.id);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="w-[78vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${item.title}`}
                    onClick={() => onOpenDetails(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenDetails(item);
                      }
                    }}
                    onMouseEnter={() => {
                      if (item.media_type === 'anime') {
                        import('../pages/AnimeDetailsPage');
                      } else {
                        import('../pages/DetailsPage');
                      }
                    }}
                    className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <div className="card-3d relative rounded-xl">
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                        <img
                          alt={item.title}
                          loading={idx < 3 ? "eager" : "lazy"}
                          decoding="async"
                          className="object-cover transition-[filter,transform] duration-700 group-hover:scale-105 h-full w-full"
                          src={
                            item.backdrop_path?.includes('image.tmdb.org/t/p/')
                              ? item.backdrop_path.replace(/\/t\/p\/(original|w1280)\//, '/t/p/w780/')
                              : item.backdrop_path
                          }
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                        <button
                          type="button"
                          aria-label={isSaved ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
                          title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(item);
                          }}
                          className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-sm transition duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                            isSaved
                              ? 'bg-rose-600 text-white'
                              : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>

                        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            aria-label={`Play ${item.title}`}
                            title={`Play ${item.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item);
                            }}
                            className="rounded-full bg-white/20 p-3 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <Play className="h-5 w-5 fill-white text-white" />
                          </button>
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
      </section>
    </section>
  );
};

export default GenreRail;

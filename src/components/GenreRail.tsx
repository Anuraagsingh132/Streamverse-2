import { deferUntilScrollIdle } from '../utils/scrollScheduler';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Film, Tv, ArrowUpRight, Play, Plus, Check, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MediaItem } from '../types/media';
import { liveActionMovies, liveGenreConfigs } from '../data/cinemaosLiveMatch';
import { allMedia } from '../data/mediaData';
import { getByGenre, GENRE_NAME_TO_MOVIE_ID, GENRE_NAME_TO_TV_ID } from '../services/tmdb';
import { mergeValidMediaWithFallback } from '../utils/mediaFilters';
import { FALLBACK_BACKDROP } from '../utils/imageUtils';

interface GenreRailProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigateGenre?: (genre: string) => void;
  items?: MediaItem[];
}

const GenreRailComponent: React.FC<GenreRailProps> = ({
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
    <section id="genres" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 450px' }}>
      <section className="py-4 sm:py-10">
        {/* Section Header */}
        <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-4 sm:mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  Find your mood
                </p>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Browse by genre
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Movies / TV Shows Toggle (Standardized Segmented Control) */}
              <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1  relative">
                <button
                  type="button"
                  onClick={() => setMediaType('movie')}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-semibold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                    mediaType === 'movie'
                      ? 'text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {mediaType === 'movie' && (
                    <motion.div
                      layoutId="genre-media-type-pill"
                      className="absolute inset-0 rounded-full bg-white shadow"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5" />
                    Movies
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaType('tv')}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-semibold transition cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                    mediaType === 'tv'
                      ? 'text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {mediaType === 'tv' && (
                    <motion.div
                      layoutId="genre-media-type-pill"
                      className="absolute inset-0 rounded-full bg-white shadow"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Tv className="h-3.5 w-3.5" />
                    TV Shows
                  </span>
                </button>
              </div>

              {onNavigateGenre && (
                <button
                  type="button"
                  onClick={() => onNavigateGenre(selectedGenre)}
                  className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80  transition hover:bg-white/20 hover:text-white sm:flex"
                >
                  Browse all <ArrowUpRight className="h-3.5 w-3.5" />
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
              /* Pure hardware compositing */
            }}
          >
            {genres.map((genre) => {
              const isSelected = selectedGenre === genre.name;
              return (
                <motion.button
                  key={genre.name}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  onClick={() => setSelectedGenre(genre.name)}
                  aria-pressed={isSelected}
                  className={`group relative h-[84px] w-36 shrink-0 sm:h-auto sm:w-48 sm:aspect-[16/10] lg:w-52 overflow-hidden rounded-2xl text-left transition-[transform,opacity,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer border ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-black border-white/40 scale-[1.03] opacity-100 z-10'
                      : 'border-white/10 opacity-60 hover:opacity-90 hover:scale-[1.01]'
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 14px 34px -8px ${genre.glow}` : undefined
                  }}
                >
                  <img
                    alt={genre.name}
                    loading="eager"
                    decoding="async"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 h-full w-full brightness-105"
                    src={genre.image}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${genre.color} 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)`
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-14 sm:h-16 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2.5 left-3 right-2 text-sm font-black leading-tight tracking-tight text-white drop-shadow-lg sm:bottom-3 sm:left-3.5 sm:right-3 sm:text-lg">
                    {genre.name}
                  </span>
                  {isSelected && (
                    <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-black shadow-md sm:right-2.5 sm:top-2.5">
                      Showing
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Curated Genre Sub-Header (Standard Eyebrow + Heading Style) */}
        <div className="mt-6 sm:mt-10 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: currentGenreObj.dot }}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              Curated {selectedGenre}
            </p>
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {selectedGenre}{' '}
            <span className="font-medium text-white/40">
              · {mediaType === 'tv' ? 'Series' : 'Movies'}
            </span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-rose-500" />}
          </h3>
        </div>

        {/* Media Rail for Selected Genre with generous spacing */}
        <div className="group/rail relative mt-3 sm:mt-4">
          {/* Scroll Arrows */}
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="absolute left-2 top-1/2 z-30 -translate-y-1/2 hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl  transition duration-300 hover:scale-110 hover:bg-black/80 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="absolute right-2 top-1/2 z-30 -translate-y-1/2 hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl  transition duration-300 hover:scale-110 hover:bg-black/80 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-8 pt-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 overscroll-x-contain will-change-scroll"
            style={{


            }}
          >
            {genreItems.map((item, idx) => {
              const isSaved = watchlist.includes(item.id);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="w-[74vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]"
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
                    <div className="relative rounded-xl">
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:border-white/25">
                        <img
                          alt={item.title}
                          loading={idx < 3 ? "eager" : "lazy"}
                          decoding="async"
                          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 h-full w-full"
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

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          aria-label={isSaved ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
                          title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(item);
                          }}
                          className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30  transition-colors duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer ${
                            isSaved
                              ? 'bg-rose-600 text-white'
                              : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </motion.button>

                        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.18 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                            aria-label={`Play ${item.title}`}
                            title={`Play ${item.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item);
                            }}
                            className="rounded-full bg-white/20 p-3 ring-1 ring-white/40  transition-transform duration-300 group-hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer shadow-lg"
                          >
                            <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                          </motion.button>
                        </div>
                      </div>
                      <span className="card-3d-glare" aria-hidden="true" />
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="truncate text-[13px] font-semibold leading-tight text-white">
                        {item.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/90">
                          {item.media_type === 'tv' ? 'SERIES' : 'MOVIE'}
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

export const GenreRail = React.memo(GenreRailComponent, (prev, next) => {
  if (
    prev.onPlay !== next.onPlay ||
    prev.onOpenDetails !== next.onOpenDetails ||
    prev.onNavigateGenre !== next.onNavigateGenre
  ) {
    return false;
  }
  if (prev.watchlist !== next.watchlist) {
    const prevSet = new Set(prev.watchlist);
    const nextSet = new Set(next.watchlist);
    const anyChanged = (prev.items || []).some((item) => prevSet.has(item.id) !== nextSet.has(item.id));
    if (anyChanged) return false;
  }
  return true;
});
export default GenreRail;

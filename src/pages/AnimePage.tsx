import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MediaItem } from '../types/media';
import { HeroBanner } from '../components/HeroBanner';
import { ArrowUpRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import animeInitialData from '../data/animeInitialData.json';
import animeHeroSlides from '../data/animeHeroSlides.json';
import { fetchAniListRail } from '../services/anilist';
import { getCachedAnimeLogo } from '../services/animeLogo';

interface AnimePageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
  onNavigate?: (route: string) => void;
}

const GENRES = [
  "All", "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Mecha", "Mystery", "Psychological", "Romance", 
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
];

const RAILS = [
  { key: "trending", title: "Top 10 anime", eyebrow: "Trending today", ranked: true },
  { key: "popular", title: "Most Popular", eyebrow: "Anime", ranked: false },
  { key: "airing", title: "Airing This Season", eyebrow: "Anime", ranked: false },
  { key: "topRated", title: "Top Rated", eyebrow: "Anime", ranked: false },
  { key: "action", title: "Action", eyebrow: "Anime", ranked: false },
  { key: "romance", title: "Romance", eyebrow: "Anime", ranked: false },
  { key: "fantasy", title: "Fantasy", eyebrow: "Anime", ranked: false },
  { key: "comedy", title: "Comedy", eyebrow: "Anime", ranked: false },
  { key: "sliceOfLife", title: "Slice of Life", eyebrow: "Anime", ranked: false },
  { key: "movies", title: "Anime Movies", eyebrow: "Anime", ranked: false }
] as const;

function formatAnimeItemToMediaItem(d: any): MediaItem {
  const rawTitle = d.title;
  const title = typeof rawTitle === 'string'
    ? rawTitle
    : rawTitle?.english || rawTitle?.userPreferred || rawTitle?.romaji || rawTitle?.native || 'Unknown Title';

  const image = d.bannerImage || d.coverImage?.extraLarge || d.coverImage?.large || '';
  const score = d.averageScore ? Number((d.averageScore / 10).toFixed(1)) : (d.vote_average || 8.0);
  const year = d.startDate?.year || d.year || d.seasonYear || 2026;
  const logo = d.logoUrl || getCachedAnimeLogo(d.id);

  return {
    id: String(d.id),
    title,
    overview: d.overview || (d.description ? d.description.replace(/<[^>]+>/g, '') : ''),
    poster_path: d.coverImage?.extraLarge || d.coverImage?.large || image,
    backdrop_path: image,
    vote_average: score,
    media_type: 'anime',
    year,
    genres: d.genres || ['Anime', 'Animation'],
    title_logo: logo || undefined,
    logo_path: logo || undefined,
    badge: d.badge || undefined
  };
}

export const AnimePage: React.FC<AnimePageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  onNavigate
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [genreResults, setGenreResults] = useState<any[]>([]);
  const [isLoadingGenre, setIsLoadingGenre] = useState<boolean>(false);
  const [railsData, setRailsData] = useState<Record<string, any[]>>(animeInitialData);
  const [heroSlides] = useState<any[]>(animeHeroSlides);
  const hasLoadedRef = useRef(false);

  // Progressive background fetch for rails to keep UI snappy without 429 errors or lag
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    let isMounted = true;

    async function loadRailsProgressively() {
      const railDefinitions = [
        { key: 'trending', vars: { sort: ['TRENDING_DESC'], perPage: 10 } },
        { key: 'popular', vars: { sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'airing', vars: { status: 'RELEASING', sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'topRated', vars: { sort: ['SCORE_DESC'], perPage: 20 } },
        { key: 'action', vars: { genres: ['Action'], sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'romance', vars: { genres: ['Romance'], sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'fantasy', vars: { genres: ['Fantasy'], sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'comedy', vars: { genres: ['Comedy'], sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'sliceOfLife', vars: { genres: ['Slice of Life'], sort: ['POPULARITY_DESC'], perPage: 20 } },
        { key: 'movies', vars: { format: ['MOVIE'], sort: ['POPULARITY_DESC'], perPage: 20 } }
      ];

      for (const rDef of railDefinitions) {
        if (!isMounted) break;
        try {
          const items = await fetchAniListRail(rDef.vars);
          if (isMounted && items && items.length > 0) {
            setRailsData((prev) => ({
              ...prev,
              [rDef.key]: items
            }));
          }
        } catch {
          // Gracefully continue using initial data
        }
        // Small pause between background fetches
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    loadRailsProgressively();

    return () => {
      isMounted = false;
    };
  }, []);

  // Convert hero slides to standard MediaItem format with TVDB Clearlogo PNG
  const heroItems: MediaItem[] = useMemo(() => {
    return heroSlides.map((slide: any) => ({
      id: String(slide.id),
      title: slide.title,
      overview: slide.overview,
      poster_path: slide.backdropUrl || '',
      backdrop_path: slide.backdropUrl || '',
      vote_average: slide.vote_average || 8.8,
      year: slide.year || 2026,
      media_type: 'anime',
      genres: slide.genreNames?.length ? slide.genreNames : ['Anime', 'Animation'],
      title_logo: slide.logoUrl || undefined,
      logo_path: slide.logoUrl || undefined,
      badge: slide.badge || undefined
    }));
  }, [heroSlides]);

  // Fetch or filter genre items on change
  const handleSelectGenre = useCallback(async (genre: string) => {
    setSelectedGenre(genre);
    if (genre === 'All') {
      setGenreResults([]);
      return;
    }

    setIsLoadingGenre(true);
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `query ($genre: String) {
            Page(page: 1, perPage: 20) {
              media(genre: $genre, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                id
                title { english userPreferred romaji native }
                coverImage { extraLarge large }
                bannerImage
                averageScore
                startDate { year }
                genres
                description
              }
            }
          }`,
          variables: { genre }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const media = data?.data?.Page?.media || [];
        setGenreResults(media);
      } else {
        const allLists = Object.values(animeInitialData).flat();
        const localMatches = allLists.filter((item: any) => 
          item.genres?.some((g: string) => g.toLowerCase() === genre.toLowerCase())
        );
        setGenreResults(localMatches);
      }
    } catch (err) {
      console.warn('Genre load error, falling back to local matches:', err);
      const allLists = Object.values(animeInitialData).flat();
      const localMatches = allLists.filter((item: any) => 
        item.genres?.some((g: string) => g.toLowerCase() === genre.toLowerCase())
      );
      setGenreResults(localMatches);
    } finally {
      setIsLoadingGenre(false);
    }
  }, []);

  const handleCardClick = useCallback((rawItem: any) => {
    const formatted = formatAnimeItemToMediaItem(rawItem);
    onOpenDetails(formatted);
  }, [onOpenDetails]);

  return (
    <div className="relative min-h-screen">
      {/* 1:1 Anime Hero Banner with Clearlogo PNG */}
      <HeroBanner
        items={heroItems}
        onPlay={onPlay}
        onOpenDetails={onOpenDetails}
        watchlist={watchlist}
        onToggleWatchlist={onToggleWatchlist}
      />

      {/* Main Content Overlapping Hero Banner (1:1 with cinemaos.tech) */}
      <div className="relative z-10 -mt-[32vh] sm:-mt-20 md:-mt-24 lg:-mt-52 4xl:-mt-72">
        <div className="flex w-full flex-col gap-0">
          
          {/* Sticky Genre Pills Filter Bar */}
          <div className="sticky top-14 z-20 w-full backdrop-blur-sm">
            <div className="scrollbar-hide flex gap-2 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleSelectGenre(genre)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition duration-150 cursor-pointer ${
                    selectedGenre === genre
                      ? 'border-white bg-white text-black shadow'
                      : 'border-white/15 bg-white/10 text-white/70 backdrop-blur-md hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* When a specific Genre is active */}
          {selectedGenre !== 'All' && (
            <div className="w-full pt-6 duration-500 animate-in fade-in-50 slide-in-from-bottom-4">
              <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-3.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        Anime genre
                      </p>
                    </div>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                      {selectedGenre}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate('ai');
                      }
                    }}
                    className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white sm:flex cursor-pointer"
                  >
                    <span>Browse all</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Genre Rail Container with No Scrollbar */}
              <div className="group/rail relative">
                <div className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-8 pt-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14" style={{ maskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)' }}>
                  {isLoadingGenre ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-[78vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]">
                        <div className="aspect-video w-full rounded-xl bg-white/[0.06] animate-pulse" />
                        <div className="mt-2 h-3 w-2/3 rounded bg-white/[0.06] animate-pulse" />
                      </div>
                    ))
                  ) : (
                    genreResults.map((item, idx) => (
                      <div
                        key={item.id ?? idx}
                        className="w-[78vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]"
                      >
                        <AnimeCard item={item} onClick={() => handleCardClick(item)} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* When 'All' is active: Render all 10 curated rails */}
          {selectedGenre === 'All' && (
            <div className="flex w-full flex-col gap-4 pt-6 lg:gap-6">
              {RAILS.map((rail) => {
                const railData = (railsData as any)[rail.key] || (animeInitialData as any)[rail.key] || [];
                const displayItems = rail.ranked ? railData.slice(0, 10) : railData;

                return (
                  <AnimeRailSection
                    key={rail.key}
                    rail={rail}
                    displayItems={displayItems}
                    onCardClick={handleCardClick}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Memoized 1:1 Rail Section matching CinemaOS with Outline Ranks and Hover Buttons
const AnimeRailSection = React.memo(function AnimeRailSection({
  rail,
  displayItems,
  onCardClick,
  onNavigate
}: {
  rail: any;
  displayItems: any[];
  onCardClick: (item: any) => void;
  onNavigate?: (route: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
  }, []);

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -600 : 600;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  }, [checkScroll]);

  return (
    <div className="w-full duration-700 animate-in fade-in-50 slide-in-from-bottom-4">
      {/* Header */}
      <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-3.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                {rail.eyebrow}
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              {rail.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('ai');
              }
            }}
            className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white sm:flex cursor-pointer"
          >
            <span>Browse all</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Rail Container with CinemaOS Hover Arrows */}
      <div className="group/rail relative">
        {/* Left Arrow Button */}
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => handleScroll('left')}
          className={`absolute top-[38%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition duration-300 hover:scale-110 hover:bg-black/75 sm:flex left-2 lg:left-4 ${
            canScrollLeft ? 'opacity-0 focus-visible:opacity-100 group-hover/rail:opacity-100 cursor-pointer' : 'pointer-events-none opacity-0'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Right Arrow Button */}
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => handleScroll('right')}
          className={`absolute top-[38%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition duration-300 hover:scale-110 hover:bg-black/75 sm:flex right-2 lg:right-4 ${
            canScrollRight ? 'opacity-0 focus-visible:opacity-100 group-hover/rail:opacity-100 cursor-pointer' : 'pointer-events-none opacity-0'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 px-5 pb-8 pt-3 sm:px-8 lg:px-10 xl:px-12 2xl:px-14"
          style={{
            maskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)'
          }}
        >
          {displayItems.map((item: any, idx: number) => {
            if (rail.ranked) {
              return (
                <div
                  key={item.id ?? idx}
                  className="group/rank relative flex shrink-0 items-start pl-14 sm:pl-16 lg:pl-20"
                >
                  {/* Hollow Outline Rank Number 1-10 matching CinemaOS */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-1/2 -translate-y-[62%] select-none text-[110px] font-black leading-none tracking-tighter text-transparent transition-transform duration-500 group-hover/rank:-translate-x-1 sm:text-[130px] lg:text-[160px]"
                    style={{
                      WebkitTextStroke: '2px rgba(255,255,255,0.35)',
                      backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent 85%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div className="relative z-10 w-[70vw] sm:w-[280px] lg:w-[310px] 2xl:w-[340px]">
                    <AnimeCard item={item} onClick={() => onCardClick(item)} />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id ?? idx}
                className="w-[78vw] shrink-0 sm:w-[300px] lg:w-[330px] 2xl:w-[360px]"
              >
                <AnimeCard item={item} onClick={() => onCardClick(item)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// Memoized 1:1 AnimeCard Component matching CinemaOS
const AnimeCard = React.memo(function AnimeCard({ item, onClick }: { item: any; onClick: () => void }) {
  const rawTitle = item.title;
  const title = typeof rawTitle === 'string'
    ? rawTitle
    : rawTitle?.english || rawTitle?.userPreferred || rawTitle?.romaji || rawTitle?.native || 'Unknown Title';

  const image = item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large;
  const score = item.averageScore ? (item.averageScore / 10).toFixed(1) : (item.vote_average ? Number(item.vote_average).toFixed(1) : null);
  const year = item.startDate?.year ? item.startDate.year.toString() : (item.year ? item.year.toString() : null);

  return (
    <div className="card-3d relative rounded-xl">
      <div
        onClick={onClick}
        className="group relative flex aspect-video w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition duration-200 hover:border-primary/40 hover:shadow-lg hover:ring-1 hover:ring-primary/20 cursor-pointer"
      >
        {image && (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
            loading="lazy"
            decoding="async"
          />
        )}
        
        {/* Dark bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Hover play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-white/20 p-2.5 ring-1 ring-white/40 backdrop-blur-sm">
            <div className="ml-0.5 h-0 w-0 border-b-[6px] border-l-[9px] border-t-[6px] border-b-transparent border-l-white border-t-transparent" />
          </div>
        </div>

        {/* Top right yellow star rating badge */}
        {score && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
            <span>{score}</span>
          </div>
        )}

        {/* Bottom Title & Year */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="line-clamp-1 text-xs font-semibold text-white drop-shadow">
            {title}
          </p>
          {year && (
            <p className="mt-0.5 text-[10px] text-white/60">
              {year}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default AnimePage;

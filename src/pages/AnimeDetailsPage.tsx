import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Clapperboard,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  GalleryHorizontal,
  X,
  Bookmark,
  Share2
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { fetchAniListAnimeDetails, FullAniListAnimeDetails } from '../services/anilist';
import { fetchAnimeLogo, getCachedAnimeLogo } from '../services/animeLogo';

interface AnimeDetailsPageProps {
  item: MediaItem;
  onBack: () => void;
  onPlay: (item: MediaItem, episode?: number) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

export const AnimeDetailsPage: React.FC<AnimeDetailsPageProps> = ({
  item: initialItem,
  onBack: _onBack,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  const [animeData, setAnimeData] = useState<FullAniListAnimeDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [descExpanded, setDescExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'horizontal'>('horizontal');
  const [trailerOpen, setTrailerOpen] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [heroLogo, setHeroLogo] = useState<string | null>(
    initialItem.title_logo || initialItem.logo_path || getCachedAnimeLogo(initialItem.id)
  );

  useEffect(() => {
    let isMounted = true;
    const currentCached = initialItem.title_logo || initialItem.logo_path || getCachedAnimeLogo(initialItem.id);
    if (currentCached) {
      setHeroLogo(currentCached);
      return;
    }

    fetchAnimeLogo(initialItem.id).then((logo) => {
      if (isMounted && logo) {
        setHeroLogo(logo);
      }
    });

    return () => { isMounted = false; };
  }, [initialItem.id, initialItem.title_logo, initialItem.logo_path]);

  // Rail refs for horizontal scrolling
  const episodesRailRef = useRef<HTMLDivElement>(null);
  const charactersRailRef = useRef<HTMLDivElement>(null);
  const relatedRailRef = useRef<HTMLDivElement>(null);
  const recsRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchAniListAnimeDetails(initialItem.id).then((data) => {
      if (isMounted) {
        if (data) {
          setAnimeData(data);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialItem.id]);

  const scrollRail = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const amount = clientWidth * 0.75;
      ref.current.scrollTo({
        left: direction === 'left' ? scrollLeft - amount : scrollLeft + amount,
        behavior: 'smooth'
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const isSaved = watchlist.includes(initialItem.id);

  if (loading && !animeData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground">Loading Anime details...</p>
        </div>
      </div>
    );
  }

  const d = animeData || {
    id: initialItem.id,
    title: initialItem.title,
    native_title: '',
    english_title: initialItem.title,
    romaji_title: initialItem.title,
    description: initialItem.overview,
    overview: initialItem.overview,
    backdrop_path: initialItem.backdrop_path || '',
    poster_path: initialItem.poster_path || '',
    year: initialItem.year || '2023',
    season: 'Fall 2023',
    status: 'Finished',
    format: 'TV',
    episodes: 24,
    duration: '23 min',
    source: 'Light novel',
    rating: '88%',
    rating_percent: 88,
    vote_count: '330,800',
    genres: ['Drama', 'Mystery'],
    studio: 'OLM, TOHO animation STUDIO',
    trailer_key: 'oyHqh8ue4zw',
    trailer_thumbnail: 'https://img.youtube.com/vi/oyHqh8ue4zw/hqdefault.jpg',
    anilist_url: `https://anilist.co/anime/${initialItem.id}`,
    mal_url: 'https://myanimelist.net/anime/54492',
    characters: [],
    relations: [],
    recommendations: [],
    episodes_list: [],
    tmdbId: initialItem.tmdbId
  };

  const isApothecary = d.id === '161645' || d.id === '195516';
  const heroBackdrop = isApothecary && !d.backdrop_path?.includes('artworks')
    ? 'https://artworks.thetvdb.com/banners/v4/series/431162/backgrounds/677ed0320e43e.jpg'
    : (d.backdrop_path || d.poster_path);

  const handlePlayAnime = (ep: number = 1) => {
    onPlay({
      ...initialItem,
      tmdbId: d.tmdbId || initialItem.tmdbId,
      title: d.title,
      poster_path: d.poster_path,
      backdrop_path: d.backdrop_path,
      episodes: d.episodes,
      seasons: 1,
      media_type: 'anime',
      vote_average: d.rating_percent ? d.rating_percent / 10 : 8.5,
      episodes_list: d.episodes_list?.map((epItem) => ({
        id: epItem.id,
        episode_number: epItem.episode_number,
        name: epItem.title || `Episode ${epItem.episode_number}`,
        overview: epItem.overview || '',
        still_path: epItem.still_path || '',
        vote_average: epItem.rating || 8.0
      }))
    }, ep);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* 1. HERO SECTION */}
      <section className="relative w-full">
        {/* Ambient Blur Layer */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <img
            alt=""
            className="h-full w-full scale-[1.2] object-cover opacity-60  saturate-150"
            src={
              heroBackdrop?.includes('image.tmdb.org/t/p/')
                ? heroBackdrop.replace(/\/t\/p\/(original|w\d+)\//, '/t/p/w300/')
                : heroBackdrop
            }
            style={{
              filter: 'blur(48px) saturate(1.4)',
              WebkitFilter: 'blur(48px) saturate(1.4)',
              transform: 'translate3d(0, 0, 0) scale(1.15)',
              opacity: 0.6,
              contain: 'paint'
            }}
          />
          <div
            className="absolute left-0 top-0 h-[45vh] w-full opacity-25 "
            style={{
              backgroundImage: `url(${heroBackdrop})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              filter: 'blur(50px)',
              maskImage: 'linear-gradient(black 0%, transparent 100%)'
            }}
          />
        </div>

        {/* Kenburns Zoom Backdrop */}
        <div
          className="absolute inset-x-0 top-0 h-[90svh] overflow-hidden lg:h-[100svh]"
          style={{
            maskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)'
          }}
        >
          <div className="absolute inset-0" style={{ animation: 'hero-kenburns 20s ease-out forwards' }}>
            <img
              alt={d.title}
              className="h-full w-full object-cover object-top"
              src={heroBackdrop}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        {/* Streamverse Vertical Watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 select-none text-[11px] font-black uppercase tracking-[0.6em] text-white/15 [writing-mode:vertical-rl] lg:block xl:right-5"
        >
          Streamverse
        </div>

        {/* Content Container aligned to bottom */}
        <div className="relative z-10 flex min-h-[90svh] flex-col justify-end px-5 pb-8 pt-28 sm:px-8 lg:min-h-[100svh] lg:px-10 lg:pb-12 xl:px-12 2xl:px-14">
          <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            {/* Left Column (Meta & Synopsis) */}
            <div className="flex min-w-0 max-w-2xl flex-col gap-3 duration-700 animate-in fade-in slide-in-from-bottom-3 sm:gap-4">
              {/* Badge Strip */}
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Clapperboard className="h-3.5 w-3.5 text-primary" />
                  Streamverse
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Anime • {d.year} • {d.format} • {d.episodes} eps
                </span>
              </div>

              {/* Title Art / Logo */}
              {heroLogo ? (
                <div className="h-20 w-full max-w-[280px] sm:h-24 sm:max-w-sm lg:h-32 lg:max-w-lg">
                  <img
                    src={heroLogo}
                    alt={d.title}
                    className="h-full w-full object-contain object-left-bottom"
                    style={{
                      filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.75)) drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {d.native_title && (
                    <span className="text-sm font-medium tracking-wide text-white/60">
                      {d.native_title}
                    </span>
                  )}
                  <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
                    {d.title}
                  </h1>
                </div>
              )}

              {/* Ratings and Genres */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/80 sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= Math.round(d.rating_percent / 20)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-transparent text-white/30'
                        }`}
                      />
                    ))}
                  </span>
                  <span className="font-semibold text-white">{d.rating_percent}%</span>
                  <span className="text-white/40">({d.vote_count})</span>
                </span>
                {d.genres.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <div className="relative text-xs leading-relaxed text-white/80 sm:text-sm">
                <p className={descExpanded ? '' : 'line-clamp-3'}>
                  {d.description || d.overview}
                </p>
                {(d.description?.length || 0) > 180 && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="mt-1 text-xs font-semibold text-white underline-offset-2 hover:underline"
                  >
                    {descExpanded ? 'Show less' : 'Read More'}
                  </button>
                )}
              </div>

              {/* Studio */}
              {d.studio && (
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  STUDIO <span className="font-bold text-white/90 ml-1">{d.studio}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handlePlayAnime(1)}
                  className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black shadow-lg transition hover:bg-white/90 active:scale-95 sm:px-6"
                >
                  <Play className="h-4 w-4 fill-black text-black" />
                  Watch now
                </button>

                {d.trailer_key && (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    className="flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:px-5"
                  >
                    <Clapperboard className="h-4 w-4" />
                    Trailer
                  </button>
                )}

                <a
                  href={d.anilist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:px-4"
                >
                  AniList
                  <ExternalLink className="h-3.5 w-3.5 text-white/70" />
                </a>

                {d.mal_url && (
                  <a
                    href={d.mal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:px-4"
                  >
                    MAL
                    <ExternalLink className="h-3.5 w-3.5 text-white/70" />
                  </a>
                )}

                <button
                  onClick={() => onToggleWatchlist(initialItem)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-95 ${
                    isSaved
                      ? 'border-primary bg-primary text-black'
                      : 'border-white/20 bg-white/15 text-white hover:bg-white/25'
                  }`}
                  aria-label="Add to Watchlist"
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-black' : ''}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>

                {copiedShare && (
                  <span className="text-xs font-semibold text-green-400">
                    Copied link!
                  </span>
                )}
              </div>
            </div>

            {/* Right Column (Official Trailer Card) */}
            {d.trailer_key && (
              <div className="w-full max-w-sm shrink-0 lg:max-w-[340px] xl:max-w-[380px]">
                <div className="relative w-full rounded-3xl border border-white/10 bg-black/30 p-4 shadow-2xl backdrop-blur-xl">
                  <div
                    onClick={() => setTrailerOpen(true)}
                    className="group block cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/5">
                      <img
                        src={d.trailer_thumbnail || `https://img.youtube.com/vi/${d.trailer_key}/hqdefault.jpg`}
                        alt={d.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        Official trailer
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
                          <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                        </span>
                      </span>
                      <span className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white drop-shadow">
                        {d.title}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-white/70 transition group-hover:text-white">
                      <span>Watch trailer</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Strip Bar below Hero */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-xl sm:p-5">
            <dl className="grid grid-cols-2 gap-4 divide-y divide-white/10 sm:grid-cols-3 lg:flex lg:items-center lg:divide-x lg:divide-y-0">
              <div className="min-w-0 lg:px-6 lg:first:pl-0">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Format
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white">
                  {d.format}
                </dd>
              </div>
              <div className="min-w-0 pt-3 sm:pt-0 lg:px-6">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Episodes
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white">
                  {d.episodes}
                </dd>
              </div>
              <div className="min-w-0 pt-3 sm:pt-0 lg:px-6">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Status
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white">
                  {d.status}
                </dd>
              </div>
              <div className="min-w-0 pt-3 lg:pt-0 lg:px-6">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Season
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white">
                  {d.season}
                </dd>
              </div>
              <div className="min-w-0 pt-3 lg:pt-0 lg:px-6">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Duration
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white">
                  {d.duration}
                </dd>
              </div>
              <div className="min-w-0 pt-3 lg:pt-0 lg:px-6">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Source
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-white">
                  {d.source}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* 2. EPISODES SECTION (#watch) */}
      <section id="watch" className="scroll-mt-24 px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        {/* Section Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
              <span className="h-3 w-1 rounded-full bg-primary" />
              START WATCHING
            </div>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Episodes
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {d.episodes_list.length} AVAILABLE
            </span>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setViewMode('horizontal')}
                className={`rounded p-1.5 transition ${
                  viewMode === 'horizontal' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                }`}
                title="Slider View"
              >
                <GalleryHorizontal className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 transition ${
                  viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Slider Navigation Arrows */}
            {viewMode === 'horizontal' && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <button
                  onClick={() => scrollRail(episodesRailRef, 'left')}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollRail(episodesRailRef, 'right')}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Episode Cards Grid or Horizontal Slider */}
        {viewMode === 'horizontal' ? (
          <div
            ref={episodesRailRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 pt-1"
          >
            {d.episodes_list.map((ep) => (
              <div
                key={ep.id}
                onClick={() => handlePlayAnime(ep.episode_number)}
                className="group relative w-[80vw] shrink-0 cursor-pointer sm:w-[320px] lg:w-[350px] xl:w-[380px]"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-[20px] border border-border/50 bg-muted transition duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
                  <img
                    src={ep.still_path || d.backdrop_path}
                    alt={ep.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-500 group-hover:opacity-90" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                    </div>
                  </div>

                  {/* Top Right Badges */}
                  <div className="absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-1.5">
                    <span className="rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                      Ep {ep.episode_number}
                    </span>
                    <span className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      {ep.rating}
                    </span>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="line-clamp-1 font-semibold text-white drop-shadow">
                      {ep.title}
                    </h3>
                    {ep.overview && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/70">
                        {ep.overview}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {d.episodes_list.map((ep) => (
              <div
                key={ep.id}
                onClick={() => handlePlayAnime(ep.episode_number)}
                className="group relative cursor-pointer"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-[20px] border border-border/50 bg-muted transition duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
                  <img
                    src={ep.still_path || d.backdrop_path}
                    alt={ep.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-500 group-hover:opacity-90" />

                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                    </div>
                  </div>

                  <div className="absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-1.5">
                    <span className="rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                      Ep {ep.episode_number}
                    </span>
                    <span className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      {ep.rating}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="line-clamp-1 font-semibold text-white drop-shadow">
                      {ep.title}
                    </h3>
                    {ep.overview && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/70">
                        {ep.overview}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. CHARACTERS SECTION */}
      {d.characters && d.characters.length > 0 && (
        <section className="mt-10 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
                <span className="h-3 w-1 rounded-full bg-primary" />
                VOICE CAST
              </div>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Characters
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollRail(charactersRailRef, 'left')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollRail(charactersRailRef, 'right')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={charactersRailRef}
            className="scrollbar-hide flex gap-3 overflow-x-auto pb-4 pt-1"
          >
            {d.characters
              .filter((char) => char.image && !char.image.includes('default'))
              .map((char) => (
                <div
                  key={char.id}
                  className="group flex w-[120px] shrink-0 flex-col gap-2 sm:w-[140px] md:w-[150px] lg:w-[160px]"
                >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border/50 bg-muted transition duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
                  <img
                    src={char.image}
                    alt={char.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div>
                  <p className="truncate text-xs font-semibold text-white">
                    {char.name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {char.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. RELATED ANIME SECTION */}
      {d.relations && d.relations.length > 0 && (
        <section className="mt-10 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
                <span className="h-3 w-1 rounded-full bg-primary" />
                SAME UNIVERSE
              </div>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Related anime
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollRail(relatedRailRef, 'left')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollRail(relatedRailRef, 'right')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={relatedRailRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 pt-1"
          >
            {d.relations.map((rel) => (
              <div
                key={rel.id}
                onClick={() =>
                  onOpenDetails({
                    id: String(rel.id),
                    title: rel.title,
                    overview: '',
                    media_type: 'anime',
                    poster_path: rel.image,
                    backdrop_path: rel.image,
                    vote_average: 8.5
                  })
                }
                className="group flex w-[260px] shrink-0 cursor-pointer flex-col gap-2 sm:w-[280px] lg:w-[310px]"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-muted transition duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
                  <img
                    src={rel.image}
                    alt={rel.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="absolute left-2.5 top-2.5 rounded-md border border-white/10 bg-secondary/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground backdrop-blur-md">
                    {rel.relationType}
                  </span>
                </div>
                <div>
                  <p className="truncate text-xs font-semibold text-white">
                    {rel.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground capitalize">
                    {rel.format}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. RECOMMENDATIONS ("More like this") */}
      {d.recommendations && d.recommendations.length > 0 && (
        <section className="mt-10 px-5 pb-16 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
                <span className="h-3 w-1 rounded-full bg-primary" />
                PICKED FOR YOU
              </div>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                More like this
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollRail(recsRailRef, 'left')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollRail(recsRailRef, 'right')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/15"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={recsRailRef}
            className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 pt-1"
          >
            {d.recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() =>
                  onOpenDetails({
                    id: String(rec.id),
                    title: rec.title,
                    overview: '',
                    media_type: 'anime',
                    poster_path: rec.image,
                    backdrop_path: rec.image,
                    vote_average: rec.rating || 8.0
                  })
                }
                className="group flex w-[260px] shrink-0 cursor-pointer flex-col gap-2 sm:w-[280px] lg:w-[310px]"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/50 bg-muted transition duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
                  <img
                    src={rec.image}
                    alt={rec.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                    {rec.rating}
                  </span>
                </div>
                <div>
                  <p className="truncate text-xs font-semibold text-white">
                    {rec.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground capitalize">
                    {rec.format}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trailer Modal */}
      {trailerOpen && d.trailer_key && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-white">
                  {d.title} — Official Trailer
                </span>
              </div>
              <button
                onClick={() => setTrailerOpen(false)}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${d.trailer_key}?autoplay=1&rel=0`}
                title={`${d.title} Trailer`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

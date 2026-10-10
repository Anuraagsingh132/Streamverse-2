import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Bookmark, 
  Share2, 
  Download, 
  Clapperboard, 
  Star, 
  UsersRound, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  LayoutGrid,
  List,
  GalleryHorizontal,
  X
} from 'lucide-react';
import { MediaItem, EpisodeItem } from '../types/media';
import { allMedia } from '../data/mediaData';
import { PosterCard } from '../components/PosterCard';
import { getMediaDetails, getSeasonEpisodes } from '../services/tmdb';
import { diggerCuratedDetails, lanternsCuratedDetails } from '../data/cinemaosLiveMatch';
import { SEOHead } from '../components/SEOHead';
import { GlassBackButton } from '../components/details/GlassBackButton';
import { purgeMediaItemCache } from '../utils/cacheManager';

interface DetailsPageProps {
  item: MediaItem;
  onBack: () => void;
  onPlay: (item: MediaItem, episode?: number, season?: number) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(dateStr)) return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export const DetailsPage: React.FC<DetailsPageProps> = ({
  item: initialItem,
  onBack,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  // Use curated 1:1 CinemaOS data for Digger and Lanterns if matching, else initialItem
  const initialData = initialItem.id === '1248832' || initialItem.title.toLowerCase() === 'digger'
    ? { ...initialItem, ...diggerCuratedDetails }
    : (initialItem.id === '95350' || initialItem.title.toLowerCase() === 'lanterns'
      ? { ...initialItem, ...lanternsCuratedDetails }
      : initialItem);

  const [item, setItem] = useState<MediaItem>(initialData);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>(initialData.episodes_list || []);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'horizontal'>('list');
  const [trailerModalOpen, setTrailerModalOpen] = useState<boolean>(false);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(initialData.trailer_key || null);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState<boolean>(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const trailerRailRef = useRef<HTMLDivElement>(null);
  const moreLikeRailRef = useRef<HTMLDivElement>(null);
  const recommendedRailRef = useRef<HTMLDivElement>(null);
  const [prevInitialId, setPrevInitialId] = useState<string | number>(initialItem.id);

  // Sync state when initialItem changes (React official render-time pattern)
  if (initialItem.id !== prevInitialId) {
    setPrevInitialId(initialItem.id);
    const freshData = initialItem.id === '1248832' || initialItem.title.toLowerCase() === 'digger'
      ? { ...initialItem, ...diggerCuratedDetails }
      : (initialItem.id === '95350' || initialItem.title.toLowerCase() === 'lanterns'
        ? { ...initialItem, ...lanternsCuratedDetails }
        : initialItem);
    setItem(freshData);
    setSelectedSeason(1);
    setEpisodes(freshData.episodes_list || []);
    setActiveVideoKey(freshData.trailer_key || null);
    setTrailerModalOpen(false);
  }

  // Fetch full details from TMDB
  useEffect(() => {
    let isMounted = true;
    const fetchFullDetails = async () => {
      try {
        const fullDetails = await getMediaDetails(initialItem.tmdbId || initialItem.id, initialItem.media_type);
        if (isMounted) {
          const isCurated = initialItem.id === '1248832' || initialItem.id === '95350';
          setItem((prev) => ({
            ...prev,
            ...fullDetails,
            backdrop_path: fullDetails.backdrop_path || prev.backdrop_path,
            poster_path: fullDetails.poster_path || prev.poster_path,
            overview: fullDetails.overview || prev.overview,
            logo_path: fullDetails.logo_path || prev.logo_path,
            title_logo: fullDetails.logo_path || prev.title_logo,
            budget: isCurated ? (prev.budget || 180000000) : (fullDetails.budget || prev.budget),
            revenue: isCurated ? (prev.revenue || 3400000) : (fullDetails.revenue || prev.revenue),
            cast: isCurated ? prev.cast : ((fullDetails.cast && fullDetails.cast.length > 0) ? fullDetails.cast : prev.cast),
            directors: isCurated ? prev.directors : ((fullDetails.directors && fullDetails.directors.length > 0) ? fullDetails.directors : prev.directors),
            writers: isCurated ? prev.writers : ((fullDetails.writers && fullDetails.writers.length > 0) ? fullDetails.writers : prev.writers),
            producers: isCurated ? prev.producers : ((fullDetails.producers && fullDetails.producers.length > 0) ? fullDetails.producers : prev.producers),
            studios: isCurated ? prev.studios : ((fullDetails.studios && fullDetails.studios.length > 0) ? fullDetails.studios : prev.studios),
            networks: isCurated ? prev.networks : ((fullDetails.networks && fullDetails.networks.length > 0) ? fullDetails.networks : prev.networks),
            videos: isCurated ? prev.videos : ((fullDetails.videos && fullDetails.videos.length > 0) ? fullDetails.videos : prev.videos),
            trailer_key: isCurated ? prev.trailer_key : (fullDetails.trailer_key || prev.trailer_key),
            similar: isCurated ? prev.similar : (fullDetails.similar || prev.similar),
            recommendations: isCurated ? prev.recommendations : (fullDetails.recommendations || prev.recommendations)
          }));

          if (fullDetails.trailer_key) {
            setActiveVideoKey((prev) => prev || fullDetails.trailer_key || null);
          }

          // If TV show, fetch season episodes
          if (initialItem.media_type === 'tv' && episodes.length === 0) {
            const seasonEps = await getSeasonEpisodes(initialItem.tmdbId || initialItem.id, selectedSeason);
            if (isMounted && seasonEps) {
              setEpisodes(seasonEps);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch extra TMDB details for id', initialItem.id, err);
      }
    };

    fetchFullDetails();
    return () => {
      isMounted = false;
    };
  }, [initialItem.id, initialItem.media_type, initialItem.tmdbId, selectedSeason, episodes.length]);

  // When season changes, load that season's episodes
  const handleSeasonChange = async (seasonNum: number) => {
    setSelectedSeason(seasonNum);
    setSeasonDropdownOpen(false);
    setLoadingEpisodes(true);
    try {
      const eps = await getSeasonEpisodes(item.tmdbId || item.id, seasonNum);
      setEpisodes(eps || []);
    } catch (e) {
      console.warn('Failed to load season episodes:', e);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const isSaved = watchlist.includes(item.id);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

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

  // Crew display logic
  const directorList = item.directors && item.directors.length > 0 ? item.directors : [];
  const writerList = item.writers && item.writers.length > 0 ? item.writers : [];
  const producerList = item.producers && item.producers.length > 0 ? item.producers : [];
  const primaryDirectorName = directorList.length > 0 
    ? directorList.map((d) => d.name).join(', ') 
    : (item.media_type === 'tv' ? 'Creator N/A' : 'Director N/A');

  // Primary trailer / right aside card
  const primaryTrailer = item.videos && item.videos.length > 0 ? item.videos[0] : null;
  const officialTrailerKey = item.trailer_key || (primaryTrailer ? primaryTrailer.key : '');

  // Similar and Recommended list
  const similarItems = (item.similar && item.similar.length > 0)
    ? item.similar
    : allMedia.filter((m) => m.id !== item.id).slice(0, 10);

  const recommendedItems = (item.recommendations && item.recommendations.length > 0)
    ? item.recommendations
    : allMedia.filter((m) => m.id !== item.id && m.media_type === item.media_type).slice(0, 10);

  const votePercent = Math.round(item.vote_average * 10) || 75;
  const ratingStars = Math.round(item.vote_average / 2) || 4;
  const releaseYear = item.release_date ? item.release_date.split('-')[0] : (item.year ? String(item.year) : '');

  const handleBackClick = () => {
    purgeMediaItemCache(item);
    onBack();
  };

  return (
    <div className="relative min-h-screen text-white">
      <SEOHead
        title={`${item.title}${releaseYear ? ` (${releaseYear})` : ''}`}
        description={item.overview || `Watch ${item.title} in HD on Streamverse.`}
        image={item.backdrop_path || item.poster_path}
        type={item.media_type === 'tv' ? 'video.tv_show' : 'video.movie'}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': item.media_type === 'tv' ? 'TVSeries' : 'Movie',
          name: item.title,
          description: item.overview,
          image: item.backdrop_path || item.poster_path,
          datePublished: item.release_date,
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: item.vote_average,
            bestRating: 10,
            ratingCount: item.vote_count || 100,
          },
        }}
      />
      {/* 1:1 CinemaOS Ambient Fixed Backdrop Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <img
          alt=""
          className="h-full w-full scale-[1.2] object-cover opacity-60  saturate-150"
          src={
            item.backdrop_path?.includes('image.tmdb.org/t/p/')
              ? item.backdrop_path.replace(/\/t\/p\/(original|w\d+)\//, '/t/p/w300/')
              : item.backdrop_path
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
            backgroundImage: `url(${item.backdrop_path})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            filter: 'blur(50px)',
            maskImage: 'linear-gradient(black 0%, transparent 100%)'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative w-full">
        {/* Ken-Burns Background */}
        <div
          className="absolute inset-x-0 top-0 h-[90svh] overflow-hidden lg:h-[100svh]"
          style={{
            maskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 45%, transparent 98%)'
          }}
        >
          <div className="absolute inset-0">
            <img
              alt={item.title}
              className="h-full w-full object-cover object-[center_15%] sm:object-[center_12%] lg:object-[center_15%]"
              src={item.backdrop_path}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        {/* Vertical Watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 select-none text-[11px] font-medium uppercase tracking-[0.6em] text-white/20 [writing-mode:vertical-rl] md:block"
        >
          Streamverse
        </div>

        {/* Hero Content Overlays */}
        <div className="relative z-10 flex min-h-[90svh] flex-col justify-end px-5 pb-8 pt-28 sm:px-8 lg:min-h-[100svh] lg:px-10 lg:pb-12 xl:px-12 2xl:px-14">
          <GlassBackButton
            onClick={handleBackClick}
            className="absolute left-5 top-20 z-30 sm:left-8 lg:left-10"
          />
          <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            {/* Left Column: Metadata, Logo, Overview, CTAs */}
            <div className="flex min-w-0 max-w-2xl flex-col gap-3 duration-700 animate-in fade-in slide-in-from-bottom-3 sm:gap-4">
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-900 backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white">
                  <Clapperboard className="h-3 w-3 text-rose-500" />
                  Streamverse
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {item.media_type === 'tv'
                    ? `Series  ·  ${item.year || 2026}–  ·  ${item.seasons || 1} Season${(item.seasons || 1) > 1 ? 's' : ''}  ·  ${item.content_rating || 'TV-MA'}`
                    : `Movie  ·  ${item.year || 2026}  ·  ${item.duration || '2h 9m'}  ·  ${item.content_rating || 'R'}`}
                </span>
              </div>

              {/* Title Logo (1:1 with transparent PNG or typography fallback) */}
              <div className="h-20 w-full max-w-[280px] sm:h-24 sm:max-w-sm lg:h-32 lg:max-w-lg">
                {item.logo_path ? (
                  <img
                    src={item.logo_path}
                    alt={item.title}
                    loading="eager"
                    className="h-full w-full object-contain object-left-bottom transition-opacity duration-300"
                    style={{
                      filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.75)) drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                    }}
                  />
                ) : (
                  <h1 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-md sm:text-5xl lg:text-6xl">
                    {item.title}
                  </h1>
                )}
              </div>

              {/* Tagline */}
              {item.tagline && (
                <p className="text-sm italic text-white/60 md:text-base">{item.tagline}</p>
              )}

              {/* Ratings & Genres */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/80 sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= ratingStars
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-transparent text-white/30'
                        }`}
                      />
                    ))}
                  </span>
                  <span className="font-semibold text-white">{votePercent}%</span>
                  <span className="text-white/40">({item.vote_count || 80})</span>
                </span>

                {item.imdbId && (
                  <a
                    href={`https://www.imdb.com/title/${item.imdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-yellow-400 px-1.5 py-px text-[11px] font-black text-black transition hover:bg-yellow-300"
                  >
                    IMDb
                  </a>
                )}

                {item.genres?.slice(0, 3).map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Overview */}
              <div className="max-w-xl">
                <p className="text-sm leading-relaxed text-white/80 line-clamp-3">
                  {item.overview}
                </p>
              </div>

              {/* Directed / Created by */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {item.media_type === 'tv' ? 'Created by' : 'Directed by'}
                <span className="ml-2 text-sm font-medium normal-case tracking-normal text-white/90">
                  {primaryDirectorName}
                </span>
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* Play CTA */}
                <button
                  type="button"
                  onClick={() => onPlay({ ...item, episodes_list: episodes }, 1, selectedSeason)}
                  className="flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black shadow-lg transition hover:bg-white/85 sm:px-7"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play
                </button>

                {/* Trailer CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveVideoKey(officialTrailerKey);
                    setTrailerModalOpen(true);
                  }}
                  className="flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25 sm:px-5"
                >
                  <Clapperboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Trailer</span>
                </button>

                {/* Watch Later / Bookmark */}
                <button
                  type="button"
                  onClick={() => onToggleWatchlist(item)}
                  title={isSaved ? 'In Watchlist' : 'Watch Later'}
                  aria-label={isSaved ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 backdrop-blur-md transition ${
                    isSaved ? 'bg-rose-600 text-white border-rose-500' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                </button>

                {/* Share */}
                <button
                  type="button"
                  onClick={handleShare}
                  title={copiedShare ? 'Copied URL!' : 'Share'}
                  aria-label="Share"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  {copiedShare ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
                </button>

                {/* Download */}
                <button
                  type="button"
                  onClick={() => onPlay({ ...item, episodes_list: episodes }, 1, selectedSeason)}
                  title="Download"
                  aria-label="Download"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Preview Card (Aside) */}
            <aside className="w-full max-w-md shrink-0 duration-700 animate-in fade-in slide-in-from-right-4 lg:w-80 lg:max-w-none xl:w-96">
              <div className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-4 shadow-2xl backdrop-blur-xl">
                {item.media_type === 'movie' ? (
                  /* Official Trailer Preview Card */
                  <div
                    onClick={() => {
                      setActiveVideoKey(officialTrailerKey);
                      setTrailerModalOpen(true);
                    }}
                    className="group block cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/5">
                      <img
                        alt={primaryTrailer?.name || `${item.title} trailer`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={`https://img.youtube.com/vi/${officialTrailerKey}/hqdefault.jpg`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        Official trailer
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-white/25">
                          <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                        </span>
                      </span>
                      <div className="absolute inset-x-3 bottom-3">
                        <p className="line-clamp-1 text-sm font-semibold text-white">
                          {primaryTrailer ? primaryTrailer.name : `${item.title} Trailer`}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          +{Math.max(1, (item.videos?.length || 8) - 1)} more videos
                        </p>
                      </div>
                    </div>
                    <span className="mt-3 flex items-center justify-between text-xs font-semibold text-white/70 transition group-hover:text-white">
                      Watch trailer <span aria-hidden="true">→</span>
                    </span>
                  </div>
                ) : (
                  /* TV Show Next Episode Preview Card */
                  <div
                    onClick={() => {
                      const latestEp = episodes.length > 0 ? episodes[episodes.length - 1] : null;
                      const nextEpNum = latestEp?.episode_number || episodes.length || 1;
                      onPlay({ ...item, episodes_list: episodes }, nextEpNum, selectedSeason);
                    }}
                    className="group block cursor-pointer"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-white/5">
                      <img
                        alt={`${item.title} - ${episodes[0]?.name || 'Next episode'}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={episodes[0]?.still_path || item.backdrop_path}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        Next episode
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-white/25">
                          <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                        </span>
                      </span>
                      <div className="absolute inset-x-3 bottom-3">
                        <p className="line-clamp-1 text-sm font-semibold text-white">
                          {episodes[episodes.length - 1]?.name || 'Dirt and Stars'}
                        </p>
                        <p className="mt-0.5 text-xs text-white/60">
                          S1 · E{episodes.length || 8} · Airs Oct 4, 2026
                        </p>
                      </div>
                    </div>
                    <span className="mt-3 flex items-center justify-between text-xs font-semibold text-white/70 transition group-hover:text-white">
                      Catch up on the latest episode <span aria-hidden="true">→</span>
                    </span>
                  </div>
                )}

                {/* Starring Cast Stack */}
                {item.cast && item.cast.length > 0 && (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Starring
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex -space-x-2.5">
                        {item.cast.slice(0, 5).map((actor) => (
                          <div
                            key={actor.id}
                            title={`${actor.name} as ${actor.character}`}
                            className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-black/60 transition hover:z-10 hover:scale-110"
                          >
                            <img
                              alt={actor.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              src={actor.profile_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="line-clamp-2 min-w-0 text-xs leading-snug text-white/70">
                        {item.cast.slice(0, 3).map((a) => a.name).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Metadata Bar (1:1 with cinemaos.tech) */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 shadow-2xl backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Metadata Stats Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:flex lg:flex-nowrap lg:items-center lg:gap-0 lg:divide-x lg:divide-white/10">
                <div className="min-w-0 lg:pr-6">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Status</span>
                  <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                    {item.status || (item.media_type === 'tv' ? 'Returning Series' : 'Released')}
                  </span>
                </div>

                {item.media_type === 'movie' ? (
                  <div className="min-w-0 lg:px-6">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Runtime</span>
                    <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                      {item.duration || '1h 45m'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 lg:px-6">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Seasons</span>
                      <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                        {item.seasons || 1}
                      </span>
                    </div>
                    <div className="min-w-0 lg:px-6">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Episodes</span>
                      <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                        {item.episodes || episodes.length || 8}
                      </span>
                    </div>
                  </>
                )}

                <div className="min-w-0 lg:px-6">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Language</span>
                  <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white uppercase">
                    {item.original_language || 'EN'}
                  </span>
                </div>

                <div className="min-w-0 lg:px-6">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    {item.media_type === 'tv' ? 'First aired' : 'Released'}
                  </span>
                  <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                    {formatDisplayDate(item.release_date || item.first_air_date)}
                  </span>
                </div>

                {item.media_type === 'movie' && item.budget && item.budget > 0 ? (
                  <div className="min-w-0 lg:px-6">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Budget</span>
                    <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                      ${item.budget.toLocaleString('en-US')}
                    </span>
                  </div>
                ) : null}

                {item.media_type === 'movie' && item.revenue && item.revenue > 0 ? (
                  <div className="min-w-0 lg:px-6">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Revenue</span>
                    <span className="mt-1 block truncate text-xs sm:text-sm font-semibold text-white">
                      ${item.revenue.toLocaleString('en-US')}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Studios / Network Branding */}
              {(((item.media_type === 'tv' ? item.networks : item.studios)?.filter((p) => Boolean(p.logo_path)).length || 0) > 0) && (
                <div className="flex items-center gap-3 border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 shrink-0 [writing-mode:horizontal-tb] lg:rotate-180 lg:[writing-mode:vertical-rl]">
                    {item.media_type === 'tv' ? 'Network' : 'Studios'}
                  </span>
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap overflow-hidden">
                    {(item.media_type === 'tv' ? item.networks : item.studios)
                      ?.filter((partner) => Boolean(partner.logo_path))
                      .slice(0, 4)
                      .map((partner) => (
                        <img
                          key={partner.id}
                          src={partner.logo_path}
                          alt={partner.name}
                          title={partner.name}
                          loading="lazy"
                          className="h-6 w-auto max-w-[90px] sm:max-w-[110px] object-contain opacity-70 transition-opacity duration-300 hover:opacity-100"
                          style={{
                            filter: 'grayscale(1) invert(1) brightness(1.15) contrast(1.1)'
                          }}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TV Show: Episodes Section (1:1 with cinemaos.tech) */}
      {item.media_type === 'tv' && (
        <section className="px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Season {selectedSeason} · {episodes.length} episodes
                </p>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Episodes
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
                <button
                  type="button"
                  aria-label="Horizontal view"
                  onClick={() => setViewMode('horizontal')}
                  className={`flex h-7 w-8 items-center justify-center rounded-full transition ${
                    viewMode === 'horizontal' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <GalleryHorizontal className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-7 w-8 items-center justify-center rounded-full transition ${
                    viewMode === 'grid' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setViewMode('list')}
                  className={`flex h-7 w-8 items-center justify-center rounded-full transition ${
                    viewMode === 'list' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Season Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                  className="group flex h-9 max-w-[210px] items-center gap-2 rounded-full border border-white/15 bg-white/10 pl-1.5 pr-3 text-sm font-semibold text-white outline-none backdrop-blur-md transition hover:bg-white/15"
                >
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-black">
                    S{selectedSeason}
                  </span>
                  <span className="truncate">
                    {item.seasons_list?.find((s) => s.season_number === selectedSeason)?.name || 'Season ' + selectedSeason}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white/60 transition-transform group-hover:rotate-180" />
                </button>

                {seasonDropdownOpen && item.seasons_list && (
                  <div className="absolute right-0 top-11 z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/15 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md">
                    {item.seasons_list.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSeasonChange(s.season_number)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                          selectedSeason === s.season_number ? 'bg-white text-black' : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="font-bold">S{s.season_number}</span>
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Episode List */}
          {loadingEpisodes ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-4 rounded-2xl p-3 bg-white/[0.03] animate-pulse">
                  <div className="w-36 sm:w-56 md:w-64 aspect-video rounded-xl bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-4 w-48 bg-white/10 rounded" />
                    <div className="h-3 w-32 bg-white/10 rounded" />
                    <div className="h-3 w-full bg-white/10 rounded mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : episodes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="group flex gap-4 rounded-2xl p-2 transition hover:bg-white/[0.06] sm:p-3"
                >
                  {/* 16:9 Thumbnail */}
                  <div className="w-36 shrink-0 sm:w-56 md:w-64">
                    <div
                      onClick={() => onPlay({ ...item, episodes_list: episodes }, ep.episode_number, selectedSeason)}
                      className="card-3d relative cursor-pointer rounded-xl"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <img
                          alt={ep.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          src={ep.still_path || item.backdrop_path}
                        />
                        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                          E{ep.episode_number}
                        </span>
                        {ep.runtime && (
                          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                            {ep.runtime}m
                          </span>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                          </span>
                        </div>
                      </div>
                      <span className="card-3d-glare" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Episode Details */}
                  <div className="flex min-w-0 flex-1 flex-col py-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Episode {ep.episode_number}
                    </p>
                    <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold text-white md:text-base">
                      {ep.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/50">
                      {ep.air_date || '2026'} · {ep.runtime || 50} min · ★ {ep.vote_average || '7.5'}
                    </p>
                    <p className="mt-2 line-clamp-2 hidden text-xs leading-relaxed text-white/60 sm:block md:text-sm">
                      {ep.overview}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => onPlay({ ...item, episodes_list: episodes }, ep.episode_number, selectedSeason)}
                        className="flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-black transition hover:bg-white/85"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={() => onPlay({ ...item, episodes_list: episodes }, ep.episode_number, selectedSeason)}
                        className="flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center bg-white/[0.02]">
              <p className="text-sm font-medium text-white/60">No episode information available for this season.</p>
            </div>
          )}
        </section>
      )}

      {/* Movie: Trailers & Teasers Section (1:1 with cinemaos.tech) */}
      {item.media_type === 'movie' && item.videos && item.videos.length > 0 && (
        <section className="px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Watch the
                </p>
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Trailers &amp; teasers
              </h2>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {item.videos.length} videos
            </span>
          </div>

          <div className="group/rail relative">
            <button
              type="button"
              onClick={() => scrollRail(trailerRailRef, 'left')}
              className="absolute left-2 top-[38%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 sm:flex opacity-0 group-hover/rail:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(trailerRailRef, 'right')}
              className="absolute right-2 top-[38%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 sm:flex opacity-0 group-hover/rail:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              ref={trailerRailRef}
              className="scrollbar-hide overflow-x-auto scroll-smooth flex gap-4 pb-4 pt-2"
              style={{
                maskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)'
              }}
            >
              {item.videos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => {
                    setActiveVideoKey(vid.key);
                    setTrailerModalOpen(true);
                  }}
                  className="group w-64 shrink-0 cursor-pointer md:w-72"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10">
                    <img
                      alt={vid.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={`https://img.youtube.com/vi/${vid.key}/hqdefault.jpg`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/10">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                        <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium text-white/80">
                    {vid.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cast & Crew Section (1:1 with cinemaos.tech) */}
      <section className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-14" aria-labelledby="cast-crew-heading">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Featuring
                </p>
              </div>
              <h2 id="cast-crew-heading" className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Cast &amp; crew
              </h2>
            </div>
            <div className="inline-flex items-center rounded-md border-0 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {item.cast?.length || 10} credited
            </div>
          </div>

          <div className="grid divide-y divide-white/10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:divide-x lg:divide-y-0">
            {/* Left: Starring Column */}
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/70">
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                Starring
              </div>
              <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                {item.cast?.map((actor) => (
                  <div key={actor.id} className="flex min-w-0 items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
                      <img
                        alt={actor.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        src={actor.profile_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{actor.name}</p>
                      <p className="truncate text-sm text-white/50" title={actor.character}>
                        {actor.character}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Creative team Column */}
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/70">
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Creative team
              </div>
              <dl className="space-y-4">
                {/* Directed by */}
                {directorList.length > 0 && (
                  <div>
                    <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
                      {item.media_type === 'tv' ? 'Created by' : 'Directed by'}
                    </dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-2">
                      {directorList.map((dir) => (
                        <div key={dir.id} className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
                            <img
                              alt={dir.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              src={dir.profile_path || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                            />
                          </div>
                          <span className="max-w-32 truncate text-sm font-medium text-white">
                            {dir.name}
                          </span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}

                {/* Written by */}
                {writerList.length > 0 && (
                  <div>
                    <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
                      Written by
                    </dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-2">
                      {writerList.map((writer) => (
                        <div key={writer.id} className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
                            <img
                              alt={writer.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              src={writer.profile_path || 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100'}
                            />
                          </div>
                          <span className="max-w-32 truncate text-sm font-medium text-white">
                            {writer.name}
                          </span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}

                {/* Produced by */}
                {producerList.length > 0 && (
                  <div>
                    <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">
                      Produced by
                    </dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-2">
                      {producerList.map((producer) => (
                        <div key={producer.id} className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
                            <img
                              alt={producer.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                              src={producer.profile_path || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'}
                            />
                          </div>
                          <span className="max-w-32 truncate text-sm font-medium text-white">
                            {producer.name}
                          </span>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* More Like This (Vertical Poster Cards matching 1:1) */}
      <section className="mt-10 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Keep watching
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              More like this
            </h2>
          </div>
        </div>

        <div className="group/rail relative">
          <button
            type="button"
            onClick={() => scrollRail(moreLikeRailRef, 'left')}
            className="absolute left-2 top-[40%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(moreLikeRailRef, 'right')}
            className="absolute right-2 top-[40%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={moreLikeRailRef}
            className="scrollbar-hide overflow-x-auto scroll-smooth isolate flex items-start gap-4 pb-10 pt-4 sm:px-2 lg:gap-5"
            style={{
              maskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)'
            }}
          >
            {similarItems.map((similarItem) => (
              <PosterCard
                key={similarItem.id}
                item={similarItem}
                onOpenDetails={onOpenDetails}
                onPlay={onPlay}
                showRatingBadge={false}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Recommended movies / Recommended shows (Vertical Poster Cards matching 1:1) */}
      <section className="px-5 py-4 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-3.5 w-[3px] rounded-full bg-rose-600" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Picked for you
              </p>
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white md:text-2xl">
              {item.media_type === 'tv' ? 'Recommended shows' : 'Recommended movies'}
            </h2>
          </div>
        </div>

        <div className="group/rail relative">
          <button
            type="button"
            onClick={() => scrollRail(recommendedRailRef, 'left')}
            className="absolute left-2 top-[40%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(recommendedRailRef, 'right')}
            className="absolute right-2 top-[40%] z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 sm:flex opacity-0 group-hover/rail:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={recommendedRailRef}
            className="scrollbar-hide overflow-x-auto scroll-smooth isolate flex items-start gap-4 pb-10 pt-4 sm:px-2 lg:gap-5"
            style={{
              maskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 94%, transparent 100%)'
            }}
          >
            {recommendedItems.map((recItem) => (
              <PosterCard
                key={recItem.id}
                item={recItem}
                onOpenDetails={onOpenDetails}
                onPlay={onPlay}
                showRatingBadge={false}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trailer & Video Player Modal */}
      {trailerModalOpen && activeVideoKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
            <button
              onClick={() => setTrailerModalOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/40 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="aspect-video w-full">
              <iframe
                title={item.title}
                src={`https://www.youtube.com/embed/${activeVideoKey}?autoplay=1&rel=0`}
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

export default DetailsPage;

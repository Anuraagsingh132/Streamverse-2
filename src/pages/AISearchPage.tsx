import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Star, 
  Play, 
  Plus, 
  Check, 
  Clock, 
  RotateCcw,
  Flame,
  Zap,
  Smile,
  Coffee,
  ArrowUpRight
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { allMedia } from '../data/mediaData';
import { searchTmdb } from '../services/tmdb';

interface AISearchPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

const COMPACT_SUGGESTIONS = [
  'Time travel',
  'Romantic Paris',
  'Mind-bending',
  'Space sci-fi',
  'Crime drama',
  'Fantasy dragons',
];

const MOOD_CARDS = [
  {
    title: 'Cozy Night',
    subtitle: 'Heartwarming comfort watches & warm stories',
    query: 'Heartwarming cozy movies and comfort shows',
    image: 'https://image.tmdb.org/t/p/w1280/8WGq5Q0tmTe30YZetLnU2dkOJZf.jpg',
    icon: Coffee,
    colorAccent: 'text-amber-400'
  },
  {
    title: 'Mind-Bending',
    subtitle: 'Complex puzzles, alternate timelines & twists',
    query: 'Mind-bending psychological thrillers with plot twists',
    image: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    icon: Zap,
    colorAccent: 'text-indigo-400'
  },
  {
    title: 'Feel-Good',
    subtitle: 'High energy comedies, optimism & feel-good vibes',
    query: 'Feel-good upbeat comedies and adventure movies',
    image: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    icon: Smile,
    colorAccent: 'text-emerald-400'
  },
  {
    title: 'Edge of Seat',
    subtitle: 'High-octane non-stop suspense & intense thrillers',
    query: 'High tension suspense action thrillers',
    image: 'https://image.tmdb.org/t/p/w1280/y0reRTsewsPh0ePtgvDeLIsb5Wk.jpg',
    icon: Flame,
    colorAccent: 'text-rose-400'
  }
];

export const AISearchPage: React.FC<AISearchPageProps> = ({
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist
}) => {
  const [prompt, setPrompt] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('streamverse_ai_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('streamverse_ai_recent', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('streamverse_ai_recent');
    } catch {}
  };

  const handleSearch = async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;
    setActiveQuery(cleanQuery);
    setIsAnalyzing(true);
    saveRecentSearch(cleanQuery);

    try {
      const tmdbResults = await searchTmdb(cleanQuery, 'multi');
      if (tmdbResults && tmdbResults.length > 0) {
        setResults(tmdbResults);
        setIsAnalyzing(false);
        return;
      }
    } catch (err) {
      console.warn('TMDB search fallback:', err);
    }

    const q = cleanQuery.toLowerCase();
    const keywords = q.split(/\s+/).filter((w) => w.length > 2);

    const scored = allMedia.map((item) => {
      let score = 0;
      const text = `${item.title} ${item.overview || ''} ${item.genres?.join(' ') || ''}`.toLowerCase();
      keywords.forEach((k) => {
        if (text.includes(k)) score += 3;
      });

      if (q.includes('action') && item.genres?.includes('Action')) score += 4;
      if (q.includes('sci-fi') && (item.genres?.includes('Sci-Fi') || item.genres?.includes('Science Fiction'))) score += 4;
      if (q.includes('thriller') && item.genres?.includes('Thriller')) score += 4;
      if (q.includes('drama') && item.genres?.includes('Drama')) score += 3;
      if (q.includes('fantasy') && item.genres?.includes('Fantasy')) score += 4;
      if (q.includes('comedy') && item.genres?.includes('Comedy')) score += 4;
      if (q.includes('romance') && item.genres?.includes('Romance')) score += 4;
      if (q.includes('show') && item.media_type === 'tv') score += 2;
      if (q.includes('movie') && item.media_type === 'movie') score += 2;

      return { item, score };
    });

    const matched = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    setResults(matched.length > 0 ? matched : allMedia.slice(0, 12));
    setIsAnalyzing(false);
  };

  const handleClearResults = () => {
    setActiveQuery('');
    setResults([]);
    setPrompt('');
  };

  return (
    <div className="relative min-h-screen bg-[#060812] text-white pt-28 sm:pt-32 pb-24 overflow-hidden select-none">
      {/* Clean Background: Very Soft Ambient Glow Centered Behind Title (Nothing Else) */}
      <div 
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[360px] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.08),rgba(56,189,248,0.02),transparent_70%)] blur-2xl z-0" 
      />

      {/* Unified Master Container: All Left and Right Edges Strictly Line Up */}
      <div className="relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6 space-y-12 sm:space-y-16">
        
        {/* Hero Section */}
        <div className="text-center">
          {/* One Small Label Only */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md mb-4 shadow-sm">
            <Sparkles className="h-3 w-3 text-white/80" />
            <span>AI Powered · Beta</span>
          </div>

          {/* Solid White Centered Title on a Single Line */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-sm whitespace-normal sm:whitespace-nowrap">
            Discover with AI Search
          </h1>

          {/* Balanced Subtitle in Softer White */}
          <p className="mt-4 text-sm sm:text-base text-white/65 leading-relaxed max-w-[520px] mx-auto text-balance">
            Describe what you're in the mood for, and let our AI discover the perfect movies and shows from TMDB for you.
          </p>

          {/* Search Area */}
          <div className="w-full mt-8 sm:mt-10">
            {/* The Search Bar: Focal Point with Brighter Border and Ample Left Padding */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(prompt);
              }}
              className="relative flex items-center w-full rounded-2xl sm:rounded-full border border-white/20 bg-[#0a0c14]/85 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 hover:border-white/25 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/20 focus-within:shadow-[0_0_40px_rgba(255,255,255,0.08)]"
            >
              {/* Sparkle Icon with Left Padding (Never touches the border) */}
              <Sparkles className="h-5 w-5 text-white/45 shrink-0 ml-5 sm:ml-6 mr-3 transition-colors group-focus-within:text-white/80" />
              
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a plot, feeling, actor, or genre combination..."
                className="w-full bg-transparent py-4 sm:py-4.5 pl-0 pr-32 sm:pr-36 text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none"
              />

              <div className="absolute right-2 sm:right-2.5 flex items-center gap-2">
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-white/10 bg-white/[0.06] text-[10px] font-mono text-white/40 select-none">
                  Enter ↵
                </kbd>

                {/* Discover Button: Crisp White Pill with Bold Black Text & Icon */}
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:bg-white/90 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: '#000000', fill: '#000000' }} />
                  <span className="font-bold tracking-wide" style={{ color: '#000000' }}>Discover</span>
                </button>
              </div>
            </form>

            {/* Recent Searches: Small Quiet Chips on ONE Single Line with "Clear" at the End */}
            {recentSearches.length > 0 && !activeQuery && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-white/40">
                <span className="text-[10px] uppercase tracking-wider text-white/35 mr-1 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Recent:
                </span>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setPrompt(item);
                      handleSearch(item);
                    }}
                    className="inline-flex items-center rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-white/55 hover:border-white/15 hover:bg-white/[0.07] hover:text-white transition cursor-pointer"
                  >
                    <span>{item}</span>
                  </button>
                ))}
                <span className="text-white/20 select-none">·</span>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-[10px] text-white/35 hover:text-white/70 underline underline-offset-2 transition cursor-pointer"
                  title="Clear recent searches"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Compact Suggestion Chips: Single Row of Small Chips Directly Under Search Bar (No Big Heading) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
              {COMPACT_SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => {
                    setPrompt(text);
                    handleSearch(text);
                  }}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs text-white/70 backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.09] hover:text-white active:scale-95 cursor-pointer shadow-sm"
                >
                  <span>{text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State Skeleton */}
        {isAnalyzing && (
          <div className="space-y-6 pt-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-3 py-4 text-white/60">
              <Sparkles className="h-4 w-4 animate-spin text-white/80" />
              <span className="text-xs sm:text-sm font-medium">Synthesizing recommendations from TMDB catalogue...</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="aspect-[2/3] w-full rounded-xl bg-white/[0.05] border border-white/10" />
                  <div className="h-3.5 w-3/4 rounded bg-white/[0.08]" />
                  <div className="h-2.5 w-1/2 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results State */}
        {!isAnalyzing && activeQuery && (
          <div className="space-y-6 pt-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 w-[3px] rounded-full bg-primary" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Results for "{activeQuery}"
                </h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                  {results.length} titles
                </span>
              </div>
              <button 
                onClick={handleClearResults}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {results.map((item) => {
                  const isSaved = watchlist.includes(item.id);
                  const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.0';
                  const posterImg = item.poster_path || item.backdrop_path || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=780';
                  const optimizedImg = posterImg.includes('image.tmdb.org/t/p/')
                    ? posterImg.replace(/\/t\/p\/(original|w1280|w780)\//, '/t/p/w500/')
                    : posterImg;

                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => onOpenDetails(item)}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="group/card block cursor-pointer select-none"
                    >
                      <div className="card-3d relative rounded-xl">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-md">
                          <img
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                            src={optimizedImg}
                          />

                          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                            {rating}
                          </span>

                          <button
                            title={isSaved ? 'In Watchlist' : 'Add to watchlist'}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(item);
                            }}
                            className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 backdrop-blur-sm transition duration-200 ${
                              isSaved 
                                ? 'opacity-100 bg-primary text-black' 
                                : 'opacity-0 group-hover/card:opacity-100 bg-black/50 text-white hover:bg-black/70'
                            }`}
                          >
                            {isSaved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>

                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item);
                            }}
                            className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 bg-black/30"
                          >
                            <div className="rounded-full bg-white/20 p-3 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover/card:scale-110">
                              <Play className="h-4 w-4 fill-white text-white" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 px-0.5">
                        <h3 className="truncate text-xs sm:text-[13px] font-semibold text-white">
                          {item.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">
                            {item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Movie'}
                          </span>
                          {item.year && (
                            <span className="text-[11px] text-white/40">{item.year}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-white/50 text-sm">
                No matching titles found. Try adjusting your query or click one of the suggestions above.
              </div>
            )}
          </div>
        )}

        {/* Moods Section: The Only Content Section on Default View */}
        {!activeQuery && !isAnalyzing && (
          <div className="space-y-6 pt-4">
            {/* Centered Moods Header with Perfectly Aligned Label Bar */}
            <div className="flex flex-col items-center text-center gap-1">
              <div className="inline-flex items-center gap-2">
                <div className="h-3 w-[2.5px] rounded-full bg-primary" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Curated Moods
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                Try These Moods
              </h2>
              <p className="text-xs text-white/40">
                Jump straight into a cinematic vibe with a single click
              </p>
            </div>

            {/* 4 Mood Cards: Lighter Headings, High-Contrast Darkened Images, Readable Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
              {MOOD_CARDS.map((mood) => {
                const MoodIcon = mood.icon;
                return (
                  <motion.div
                    key={mood.title}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setPrompt(mood.query);
                      handleSearch(mood.query);
                    }}
                    className="group relative h-40 sm:h-44 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 cursor-pointer shadow-lg transition duration-200"
                  >
                    {/* Darkened Image Layer */}
                    <img 
                      src={mood.image} 
                      alt={mood.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover brightness-[0.55] contrast-105 transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Multi-Stop Dark Bottom Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/30 transition-opacity duration-300 group-hover:opacity-95" />

                    <div className="relative h-full p-4 flex flex-col justify-end">
                      <div className="flex items-center gap-1.5 text-white mb-1">
                        <MoodIcon className={`h-4 w-4 ${mood.colorAccent}`} />
                        <h3 className="text-sm sm:text-[15px] font-bold tracking-tight text-white">
                          {mood.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                        {mood.subtitle}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-white/70 group-hover:text-white transition">
                        <span>Explore mood</span>
                        <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISearchPage;

import React, { useState } from 'react';
import { Sparkles, Bot } from 'lucide-react';
import { MediaItem } from '../types/media';
import { allMedia } from '../data/mediaData';
import { MediaCard } from '../components/MediaCard';
import { searchTmdb } from '../services/tmdb';

interface AISearchPageProps {
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlist: string[];
  onToggleWatchlist: (item: MediaItem) => void;
}

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

  const inspirationQueries = [
    'Action movies with time travel',
    'Romantic comedies in Paris',
    'Shows like Breaking Bad',
    'Fantasy with dragons',
    'Thrillers with plot twists',
    'Sci-fi space adventures'
  ];

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setActiveQuery(queryText);
    setIsAnalyzing(true);

    try {
      // First attempt live TMDB search for the terms
      const tmdbResults = await searchTmdb(queryText, 'multi');
      if (tmdbResults && tmdbResults.length > 0) {
        setResults(tmdbResults);
        setIsAnalyzing(false);
        return;
      }
    } catch (err) {
      console.warn('TMDB AI Search failed, using heuristic:', err);
    }

    // Heuristic fallback over allMedia
    const q = queryText.toLowerCase();
    const keywords = q.split(/\s+/).filter((w) => w.length > 2);

    const scored = allMedia.map((item) => {
      let score = 0;
      const text = `${item.title} ${item.overview} ${item.genres?.join(' ')}`.toLowerCase();
      keywords.forEach((k) => {
        if (text.includes(k)) score += 3;
      });

      if (q.includes('action') && item.genres?.includes('Action')) score += 4;
      if (q.includes('sci-fi') && item.genres?.includes('Sci-Fi')) score += 4;
      if (q.includes('thriller') && item.genres?.includes('Thriller')) score += 4;
      if (q.includes('drama') && item.genres?.includes('Drama')) score += 3;
      if (q.includes('fantasy') && item.genres?.includes('Fantasy')) score += 4;
      if (q.includes('comedy') && item.genres?.includes('Comedy')) score += 4;
      if (q.includes('show') && item.media_type === 'tv') score += 2;
      if (q.includes('movie') && item.media_type === 'movie') score += 2;

      return { item, score };
    });

    const matched = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);

    setResults(matched.length > 0 ? matched : allMedia.slice(0, 8));
    setIsAnalyzing(false);
  };

  return (
    <div className="relative min-h-screen pt-28 pb-16 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Header matching ai.html */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-400">
            <Sparkles className="h-4 w-4" />
            <span>AI Content Discovery</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            AI Content Discovery
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto">
            Describe what you're in the mood for, and let our AI find the perfect movies and shows from TMDB for you
          </p>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(prompt);
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a plot, feeling, actor, or genre combination..."
            className="w-full rounded-2xl border border-white/15 bg-zinc-900/90 py-4 pl-5 pr-28 text-sm md:text-base text-white placeholder-zinc-500 shadow-2xl focus:border-rose-500 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-rose-500 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Discover</span>
          </button>
        </form>

        {/* Need inspiration? matching ai.html */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Need inspiration?
          </h3>
          <p className="text-xs text-zinc-500">
            Try one of these popular searches or describe exactly what you're in the mood for
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {inspirationQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setPrompt(q);
                  handleSearch(q);
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 hover:border-white/30 hover:bg-white/[0.08] hover:text-white transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Analysis State */}
        {isAnalyzing && (
          <div className="flex items-center justify-center gap-3 py-12 text-zinc-400">
            <Sparkles className="h-5 w-5 animate-spin text-rose-500" />
            <span className="text-sm">Synthesizing recommendations with TMDB neural match...</span>
          </div>
        )}

        {/* Results Section */}
        {!isAnalyzing && activeQuery && (
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
              <Bot className="h-6 w-6 text-rose-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                  AI Recommendation Engine
                </div>
                <div className="text-sm text-zinc-200 mt-0.5">
                  Found <strong className="text-white">{results.length} titles</strong> matching your search for "{activeQuery}".
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
              {results.map((item) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AISearchPage;

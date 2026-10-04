import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  Film, 
  Tv, 
  Cat, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  CornerDownLeft, 
  Star 
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { searchTmdb } from '../services/tmdb';

interface SearchResultItem {
  key: string;
  id: string | number;
  href: string;
  title: string;
  meta?: string;
  badge: string;
  rating?: number;
  poster?: string;
  banner?: string;
  overview?: string;
  media_type?: string;
  rawItem?: MediaItem;
}

interface RecentSearch {
  term: string;
  category: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onNavigate?: (route: string) => void;
}

const CATEGORY_TABS = [
  { value: 'all', label: 'Movies & TV', icon: Film },
  { value: 'movie', label: 'Movie', icon: Film },
  { value: 'tv', label: 'TV', icon: Tv },
  { value: 'anime', label: 'Anime', icon: Cat },
  { value: 'manga', label: 'Manga', icon: BookOpen },
  { value: 'recent', label: 'Recent', icon: Clock },
] as const;

type SearchCategory = typeof CATEGORY_TABS[number]['value'];

// Helper to query AniList GraphQL for Manga & Anime (matches cinemaos.tech)
async function searchAniList(search: string, type: 'MANGA' | 'ANIME'): Promise<any[]> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query: `query ($search: String, $type: MediaType) {
          Page(page: 1, perPage: 20) {
            media(search: $search, type: $type, sort: SEARCH_MATCH) {
              id
              title { userPreferred english romaji }
              coverImage { large medium }
              bannerImage
              chapters
              episodes
              format
              status
              averageScore
              description
            }
          }
        }`,
        variables: { search: search.trim(), type }
      })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.Page?.media || [];
  } catch (err) {
    console.warn('AniList search failed:', err);
    return [];
  }
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  items,
  onPlay: _onPlay,
  onOpenDetails,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = useCallback((term: string, category: string) => {
    if (!term.trim()) return;
    try {
      const cleanTerm = term.trim();
      setRecentSearches((prev) => {
        const next = [
          { term: cleanTerm, category },
          ...prev.filter((p) => !(p.term.toLowerCase() === cleanTerm.toLowerCase() && p.category === category))
        ].slice(0, 15);
        localStorage.setItem('recentSearches', JSON.stringify(next));
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  const removeRecentSearch = useCallback((idx: number) => {
    try {
      setRecentSearches((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        localStorage.setItem('recentSearches', JSON.stringify(next));
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  // Reset focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset focusedIndex when results or category change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchResults, activeCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-idx="${focusedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Live search execution with debounce
  useEffect(() => {
    if (!query.trim() || activeCategory === 'recent') {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const q = query.trim();
        if (activeCategory === 'manga') {
          const mangaData = await searchAniList(q, 'MANGA');
          const mapped: SearchResultItem[] = mangaData.map((m: any) => ({
            key: `manga-${m.id}`,
            id: m.id,
            href: `/manga/${m.id}`,
            title: m.title?.userPreferred || m.title?.english || m.title?.romaji || 'Unknown Title',
            meta: m.chapters ? `${m.chapters} ch` : m.status ? m.status.replace(/_/g, ' ').toLowerCase() : undefined,
            badge: 'Manga',
            rating: m.averageScore ? m.averageScore / 10 : undefined,
            poster: m.coverImage?.large || m.coverImage?.medium,
            banner: m.bannerImage,
            overview: m.description,
            media_type: 'manga'
          }));
          setSearchResults(mapped);
        } else if (activeCategory === 'anime') {
          // Query AniList for anime
          const animeData = await searchAniList(q, 'ANIME');
          if (animeData && animeData.length > 0) {
            const mapped: SearchResultItem[] = animeData.map((a: any) => ({
              key: `anime-${a.id}`,
              id: a.id,
              href: `/anime/${a.id}`,
              title: a.title?.userPreferred || a.title?.english || a.title?.romaji || 'Unknown Title',
              meta: a.episodes ? `${a.episodes} eps` : a.format || undefined,
              badge: 'Anime',
              rating: a.averageScore ? a.averageScore / 10 : undefined,
              poster: a.coverImage?.large || a.coverImage?.medium,
              banner: a.bannerImage,
              overview: a.description,
              media_type: 'anime'
            }));
            setSearchResults(mapped);
          } else {
            // Fallback to local / TMDB anime
            const tmdbRes = await searchTmdb(q, 'multi');
            const animeOnly = tmdbRes
              .filter((m) => m.genres?.some((g) => g.toLowerCase() === 'animation') || m.media_type === 'tv')
              .map((m) => ({
                key: `anime-${m.id}`,
                id: m.id,
                href: `/anime/${m.id}`,
                title: m.title,
                meta: m.year ? String(m.year) : undefined,
                badge: 'Anime',
                rating: m.vote_average,
                poster: m.poster_path,
                overview: m.overview,
                media_type: 'anime',
                rawItem: m
              }));
            setSearchResults(animeOnly);
          }
        } else {
          // 'all', 'movie', 'tv'
          const tmdbType = activeCategory === 'all' ? 'multi' : activeCategory;
          const tmdbRes = await searchTmdb(q, tmdbType);
          const mapped: SearchResultItem[] = tmdbRes.map((m) => {
            const isTv = m.media_type === 'tv';
            return {
              key: `${m.media_type}-${m.id}`,
              id: m.id,
              href: `/${m.media_type}/${m.id}`,
              title: m.title,
              meta: m.year ? String(m.year) : undefined,
              badge: isTv ? 'TV' : 'Movie',
              rating: m.vote_average,
              poster: m.poster_path,
              banner: m.backdrop_path,
              overview: m.overview,
              media_type: m.media_type,
              rawItem: m
            };
          });
          setSearchResults(mapped);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, activeCategory]);

  const handleSelectItem = useCallback(
    (item: SearchResultItem) => {
      saveRecentSearch(query.trim() || item.title, activeCategory);
      if (item.rawItem) {
        onOpenDetails(item.rawItem);
      } else {
        // Construct MediaItem
        const synthesized: MediaItem = {
          id: String(item.id),
          title: item.title,
          overview: item.overview || '',
          poster_path: item.poster || '',
          backdrop_path: item.banner || item.poster || '',
          vote_average: item.rating || 7.5,
          media_type: (item.media_type === 'tv' ? 'tv' : item.media_type === 'anime' ? 'anime' : 'movie') as any,
          year: item.meta ? parseInt(item.meta) || 2025 : 2025,
          genres: [item.badge]
        };
        onOpenDetails(synthesized);
      }
      onClose();
    },
    [query, activeCategory, saveRecentSearch, onOpenDetails, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && searchResults.length > 0) {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp' && searchResults.length > 0) {
      e.preventDefault();
      setFocusedIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      if (query.trim()) {
        saveRecentSearch(query.trim(), activeCategory);
      }
      if (focusedIndex >= 0 && searchResults[focusedIndex]) {
        e.preventDefault();
        handleSelectItem(searchResults[focusedIndex]);
      } else if (searchResults.length > 0) {
        e.preventDefault();
        handleSelectItem(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Global Esc & Cmd+K
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleGlobalKey);
    }
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, onClose]);

  // Placeholder text depending on active tab (1:1 with CinemaOS)
  const placeholderText = useMemo(() => {
    if (activeCategory === 'recent') return 'Recent searches…';
    if (activeCategory === 'all') return 'Search movies, shows, anime…';
    const tab = CATEGORY_TABS.find((t) => t.value === activeCategory);
    return `Search ${tab?.label || ''}…`;
  }, [activeCategory]);

  if (!isOpen) return null;

  return (
    <motion.div 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm p-3 pt-4 sm:pt-[12vh]"
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()} 
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 p-0 shadow-2xl backdrop-blur-2xl sm:max-h-[76vh] sm:rounded-3xl"
      >
        {/* Top Search Input Bar (1:1 with cinemaos.tech) */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-white/50" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/30"
          />
          <div className="flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate(query.trim() ? `search?q=${encodeURIComponent(query.trim())}` : 'search');
                }
                onClose();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="Advanced search"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/60">
              ESC
            </kbd>
          </div>
        </div>

        {/* Filter Pills Bar (1:1 with cinemaos.tech) */}
        <div className="no-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/10 px-4 py-2.5">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeCategory === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveCategory(tab.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition duration-150 ${
                  isSelected
                    ? 'bg-white text-black'
                    : 'border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results / Suggestions Container */}
        <div ref={listRef} className="min-h-[8rem] flex-1 overflow-y-auto overscroll-contain p-2">
          {/* Skeleton loading */}
          {isLoading && (
            <div className="space-y-0.5 p-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
                  <div className="aspect-[2/3] w-10 shrink-0 rounded-md bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/5 rounded bg-white/10 animate-pulse" />
                    <div className="h-2.5 w-1/4 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Search Results */}
          {!isLoading && query.trim() && searchResults.length > 0 && (
            <div className="space-y-0.5">
              {/* Sub-header counter matching cinemaos.tech */}
              <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-2">
                <span className="h-3 w-[3px] rounded-full bg-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {searchResults.length} {searchResults.length === 1 ? 'RESULT' : 'RESULTS'}
                </span>
              </div>

              {searchResults.map((item, idx) => {
                const isFocused = focusedIndex === idx;
                return (
                  <div
                    key={item.key || idx}
                    data-idx={idx}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => focusedIndex !== idx && setFocusedIndex(idx)}
                    className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors cursor-pointer ${
                      isFocused ? 'bg-white/10 ring-1 ring-inset ring-white/25' : 'hover:bg-white/10'
                    }`}
                  >
                    {/* Poster thumbnail */}
                    <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-md bg-white/10">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-white/5" />
                      )}
                    </div>

                    {/* Title & metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
                        {item.meta && <span>{item.meta}</span>}
                        {item.rating ? (
                          <span className="flex items-center gap-0.5">
                            {item.meta && <span>·</span>}
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {item.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    {/* Category pill badge matching cinemaos.tech */}
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                      {item.badge}
                    </span>

                    {/* Right hover arrow */}
                    <ArrowRight
                      className={`hidden h-4 w-4 shrink-0 text-white/60 transition-opacity sm:block ${
                        isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* No results empty state */}
          {!isLoading && query.trim() && searchResults.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search className="h-6 w-6 text-white/20" />
              <p className="text-sm font-medium text-white/70">
                No results for “{query}”
              </p>
              <p className="text-xs text-white/40">
                Try another title or switch category.
              </p>
            </div>
          )}

          {/* Empty query: Show recent searches or helper text */}
          {!query.trim() && activeCategory !== 'recent' && (
            <div className="px-1 py-2">
              {recentSearches.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-2">
                    <span className="h-3 w-[3px] rounded-full bg-primary" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Recent searches
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-2.5 pt-1">
                    {recentSearches.slice(0, 8).map((rec, i) => (
                      <span
                        key={`${rec.term}-${rec.category}-${i}`}
                        className="group flex items-center rounded-full border border-white/15 bg-white/10 text-xs text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                      >
                        <button
                          className="flex items-center gap-1.5 py-1.5 pl-3 pr-1.5"
                          onClick={() => {
                            setActiveCategory(rec.category === 'recent' ? 'all' : (rec.category as any));
                            setQuery(rec.term);
                          }}
                        >
                          <Clock className="h-3 w-3 text-white/40" />
                          <span>{rec.term}</span>
                        </button>
                        <button
                          aria-label={`Remove ${rec.term}`}
                          onClick={() => removeRecentSearch(i)}
                          className="mr-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white/40 hover:bg-white/20 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Search className="h-6 w-6 text-white/20" />
                  <p className="text-sm text-white/40">
                    Start typing to search. Press{' '}
                    <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/60">
                      Enter
                    </kbd>{' '}
                    to save a search.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recent Tab Explicit View */}
          {activeCategory === 'recent' && (
            <div className="space-y-0.5">
              {recentSearches.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-2">
                    <span className="h-3 w-[3px] rounded-full bg-primary" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Recent
                    </span>
                  </div>
                  {recentSearches.map((rec, i) => (
                    <div
                      key={`${rec.term}-${i}`}
                      className="group flex items-center rounded-xl transition-colors hover:bg-white/10"
                    >
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2.5 text-left"
                        onClick={() => {
                          setActiveCategory(rec.category as any);
                          setQuery(rec.term);
                        }}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-white/30" />
                        <span className="flex-1 truncate text-sm font-medium text-white">
                          {rec.term}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] capitalize text-white/60">
                          {rec.category}
                        </span>
                      </button>
                      <button
                        aria-label={`Remove ${rec.term}`}
                        onClick={() => removeRecentSearch(i)}
                        className="mr-2 flex h-6 w-6 items-center justify-center rounded-full text-white/30 hover:bg-white/15 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <p className="py-12 text-center text-sm text-white/40">
                  No recent searches
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (1:1 with cinemaos.tech) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5">
          <div className="hidden items-center gap-3 text-[11px] text-white/40 sm:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/60">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/60">
                <CornerDownLeft className="inline h-2.5 w-2.5" />
              </kbd>{' '}
              open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/60">
                esc
              </kbd>{' '}
              close
            </span>
          </div>
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate(query.trim() ? `search?q=${encodeURIComponent(query.trim())}` : 'search');
              }
              onClose();
            }}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-white/60 transition-colors hover:text-white cursor-pointer"
          >
            <span>See all results</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SearchModal;

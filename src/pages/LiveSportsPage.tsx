import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Tv,
  Play,
  Maximize,
  ExternalLink,
  X,
  Search,
  RefreshCw,
  Clock,
  Layers,
  AlertCircle
} from 'lucide-react';
import {
  fetchLiveStreams,
  getStreamStatus,
  formatStreamTime,
  getStreamCountdown,
  filterStreams
} from '../services/liveTv';
import { LiveStream } from '../types/liveTv';
import { SEOHead } from '../components/SEOHead';
import { modalBackdropVariants, modalContentVariants } from '../utils/motion';

export const LiveSportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allStreams, setAllStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | '24/7'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  // Player state
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [selectedSubstreamId, setSelectedSubstreamId] = useState<number | null>(null);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Load streams from public API
  const loadStreams = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchLiveStreams(isManualRefresh);
      setAllStreams(data.allStreams);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to live streams relay.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and 60-second periodic revalidation
  useEffect(() => {
    loadStreams();

    const intervalId = setInterval(() => {
      // Revalidate in background without full loading flicker
      if (document.visibilityState === 'visible') {
        loadStreams(true);
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [loadStreams]);

  // Deep-linking via ?stream=uri_name query param
  useEffect(() => {
    const streamParam = searchParams.get('stream');
    if (streamParam && allStreams.length > 0 && !selectedStream) {
      const matched = allStreams.find(
        (s) => s.uri_name === streamParam || String(s.id) === streamParam
      );
      if (matched) {
        setSelectedStream(matched);
        setSelectedSubstreamId(null);
      }
    }
  }, [searchParams, allStreams, selectedStream]);

  // Handle stream selection & URL update
  const handleOpenStream = (stream: LiveStream) => {
    setSelectedStream(stream);
    setSelectedSubstreamId(null);
    setSearchParams({ stream: stream.uri_name || String(stream.id) }, { replace: true });
  };

  const handleCloseStream = useCallback(() => {
    setSelectedStream(null);
    setSelectedSubstreamId(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('stream');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Close player modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedStream) {
        handleCloseStream();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStream, handleCloseStream]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Category counts and distinct list
  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    allStreams.forEach((s) => {
      if (s.always_live === 1 || s.always_live === true) {
        unique.add('24/7 Channels');
      } else if (s.category_name) {
        unique.add(s.category_name);
      }
    });
    return ['All', ...Array.from(unique)];
  }, [allStreams]);

  // Filtered streams list
  const filteredStreams = useMemo(() => {
    return filterStreams(allStreams, {
      category: selectedCategory,
      query: searchQuery,
      status: statusFilter
    });
  }, [allStreams, selectedCategory, searchQuery, statusFilter]);

  // Metric counts
  const metrics = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    let liveCount = 0;
    let upcomingCount = 0;
    let twentyFourSevenCount = 0;

    allStreams.forEach((s) => {
      if (s.always_live === 1 || s.always_live === true) {
        twentyFourSevenCount++;
        liveCount++;
      } else {
        const status = getStreamStatus(s, nowSec);
        if (status === 'live') liveCount++;
        else if (status === 'upcoming') upcomingCount++;
      }
    });

    return { liveCount, upcomingCount, twentyFourSevenCount, total: allStreams.length };
  }, [allStreams]);

  // Featured Hero stream (Top live match or popular 24/7 channel)
  const featuredStream = useMemo(() => {
    if (allStreams.length === 0) return null;
    const liveNow = allStreams.find(
      (s) =>
        (s.always_live === 1 || getStreamStatus(s) === 'live') &&
        s.poster &&
        Boolean(s.iframe)
    );
    return liveNow || allStreams[0];
  }, [allStreams]);

  // Resolve active embed iframe URL (supporting substreams)
  const activeEmbedUrl = useMemo(() => {
    if (!selectedStream) return null;
    if (selectedSubstreamId && selectedStream.substreams) {
      const sub = selectedStream.substreams.find((s) => s.id === selectedSubstreamId);
      if (sub?.iframe) return sub.iframe;
    }
    return selectedStream.iframe || null;
  }, [selectedStream, selectedSubstreamId]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 lg:pt-24 pb-20 space-y-8">
      <SEOHead
        title="Live TV & Sports Hub | Streamverse"
        description="Stream live sports matches, global satellite broadcasts, and 24/7 linear TV channels on Streamverse."
      />

      {/* Header & Status Section */}
      <div className="border-b border-white/10 pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
                Live Broadcast Network
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                Edge Relay Active
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Live TV & Sports
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Real-time global sports fixtures, television networks, and uninterrupted 24/7 linear channels with multi-feed switching.
            </p>
          </div>

          {/* Quick Metrics & Refresh Button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 p-1.5 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                {metrics.liveCount} Live
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold">
                <Tv className="h-3.5 w-3.5" />
                {metrics.twentyFourSevenCount} 24/7 TV
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {metrics.upcomingCount} Upcoming
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => loadStreams(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-white/25 hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
              title={`Last refreshed at ${lastUpdated.toLocaleTimeString()}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Featured Stream Hero Banner (when available) */}
      {featuredStream && !searchQuery && selectedCategory === 'All' && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl">
          {/* Subtle Ambient Background Accent */}
          <div
            className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{
              backgroundColor: featuredStream.colors?.[0] || '#e11d48'
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-rose-600/25 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  Featured Broadcast
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                  {featuredStream.category_name}
                </span>
                {featuredStream.source_tag && (
                  <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                    {featuredStream.source_tag}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {featuredStream.name}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-400">
                {featuredStream.always_live
                  ? 'Continuous 24/7 live television broadcast feed. Click below to begin streaming instantly.'
                  : `Scheduled match relay. ${formatStreamTime(featuredStream.starts_at)}.`}
              </p>

              <div className="pt-2 flex items-center gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleOpenStream(featuredStream)}
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Watch Stream Now
                </motion.button>
              </div>
            </div>

            {/* Poster Preview */}
            {featuredStream.poster && (
              <div className="relative aspect-video w-full md:w-80 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner">
                <img
                  src={featuredStream.poster}
                  alt={featuredStream.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold text-white/90">
                  <span>{featuredStream.tag || 'Live Feed'}</span>
                  <span className="text-rose-400 font-bold uppercase tracking-wider">● On Air</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams, channels, leagues (e.g. South Park, NFL, Premier League)..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-2.5 pl-10 pr-9 text-xs text-white placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Segmented Buttons */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/60 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({allStreams.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('live')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'live'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
              Live Now
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('24/7')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === '24/7'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              24/7 TV
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('upcoming')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Upcoming
            </button>
          </div>
        </div>

        {/* Category Filter Pills Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist">
          {categoryOptions.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <motion.button
                key={cat}
                role="tab"
                aria-selected={isSelected}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => setSelectedCategory(cat)}
                className={`relative shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'text-white'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="live-category-pill"
                    className="absolute inset-0 rounded-full bg-rose-600 shadow-md shadow-rose-600/30"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Stream Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl border border-white/5 bg-zinc-900/40 p-4 animate-pulse flex flex-col justify-between"
            >
              <div className="h-36 rounded-xl bg-white/5" />
              <div className="space-y-2 mt-3">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error && allStreams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 p-12 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Live Relay Currently Unavailable</h3>
            <p className="text-xs text-zinc-400 max-w-md">
              {error}. We are attempting to reconnect via mirror domains automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadStreams(true)}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredStreams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center space-y-3">
          <Search className="h-8 w-8 text-zinc-500" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No streams match your filter</h3>
            <p className="text-xs text-zinc-400">
              Try adjusting your search query, status selector, or category rail.
            </p>
          </div>
          {(searchQuery || selectedCategory !== 'All' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setStatusFilter('all');
              }}
              className="rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredStreams.map((stream) => {
            const isLive = stream.always_live === 1 || getStreamStatus(stream) === 'live';
            const is247 = stream.always_live === 1 || stream.always_live === true;
            const countdown = getStreamCountdown(stream.starts_at);
            const substreamCount = stream.substreams?.length || 0;

            return (
              <motion.div
                key={stream.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 hover:border-rose-500/40 hover:bg-zinc-900/90 transition hover:shadow-xl hover:shadow-black/50"
              >
                {/* Poster / Thumbnail Area */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/80">
                  {stream.poster ? (
                    <img
                      src={stream.poster}
                      alt={stream.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <Radio className="h-8 w-8 text-zinc-600" />
                    </div>
                  )}

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/20 to-transparent" />

                  {/* Top Status & Category Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                    {is247 ? (
                      <span className="flex items-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        <Tv className="h-3 w-3" />
                        24/7 LIVE
                      </span>
                    ) : isLive ? (
                      <span className="flex items-center gap-1 rounded-md bg-rose-600/95 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-zinc-900/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-white/10">
                        <Clock className="h-3 w-3" />
                        {countdown || formatStreamTime(stream.starts_at)}
                      </span>
                    )}

                    <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-white/10">
                      {stream.category_name}
                    </span>
                  </div>

                  {/* Broadcaster & Substreams Tag */}
                  <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between text-[11px] font-semibold text-zinc-300 pointer-events-none">
                    <span className="truncate max-w-[65%] text-zinc-400">
                      {stream.source_tag || stream.tag || 'Relay'}
                    </span>
                    {substreamCount > 0 && (
                      <span className="flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                        <Layers className="h-2.5 w-2.5" />
                        +{substreamCount} feeds
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content & Action Button */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider line-clamp-1">
                      {stream.tag || stream.category_name}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition line-clamp-2 leading-snug">
                      {stream.name}
                    </h3>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleOpenStream(stream)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-semibold text-white hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-600/30 transition cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    {is247 ? 'Watch Channel' : isLive ? 'Watch Live' : 'Open Stream'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CinemaOS Live Stream Player Modal */}
      <AnimatePresence>
        {selectedStream && (
          <motion.div
            key="stream-player-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedStream.name} Live Player`}
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 md:p-6 backdrop-blur-md"
          >
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-5xl rounded-2xl bg-zinc-950 border border-white/15 overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-zinc-900/90">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {selectedStream.name}
                  </h3>
                  <span className="rounded bg-rose-600/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 uppercase border border-rose-500/30 hidden sm:inline-block">
                    {selectedStream.always_live ? '24/7 Channel' : 'Live Broadcast'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeEmbedUrl && (
                    <a
                      href={activeEmbedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-zinc-800 p-2 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
                      title="Open in new window"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="rounded-lg bg-zinc-800 p-2 text-zinc-300 hover:text-white hover:bg-zinc-700 transition cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseStream}
                    className="rounded-lg bg-zinc-800 p-2 text-zinc-300 hover:text-white hover:bg-zinc-700 transition cursor-pointer"
                    title="Close player"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Substream Feed Selector (if multiple feeds exist) */}
              {selectedStream.substreams && selectedStream.substreams.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 bg-zinc-900/60 border-b border-white/5 scrollbar-none">
                  <span className="text-[11px] font-bold text-zinc-400 shrink-0">Available Feeds:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubstreamId(null)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 cursor-pointer ${
                      selectedSubstreamId === null
                        ? 'bg-rose-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    Main ({selectedStream.source_tag || 'Primary Feed'})
                  </button>
                  {selectedStream.substreams.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubstreamId(sub.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 cursor-pointer ${
                        selectedSubstreamId === sub.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {sub.source_tag || sub.name || `Feed #${sub.id}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Responsive 16:9 Player Viewport */}
              <div
                ref={playerContainerRef}
                className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center"
              >
                {activeEmbedUrl ? (
                  <iframe
                    key={activeEmbedUrl}
                    src={activeEmbedUrl}
                    title={selectedStream.name}
                    className="absolute inset-0 h-full w-full border-0 bg-black"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                    <p className="text-sm font-semibold text-white">Stream embed unavailable</p>
                    <p className="text-xs text-zinc-400">
                      The broadcaster has not published an active embed URL for this event yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Player Bottom Info Bar */}
              <div className="p-3 sm:p-4 bg-zinc-900/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Streamverse Relay: <strong className="text-zinc-200">{selectedStream.source_tag || 'Live Edge'}</strong>
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span>{selectedStream.category_name}</span>
                </div>

                <div className="flex items-center gap-3">
                  {selectedStream.starts_at > 0 && (
                    <span>
                      Air Time: <strong className="text-zinc-300">{formatStreamTime(selectedStream.starts_at)}</strong>
                    </span>
                  )}
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                    Low-Latency Relay
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

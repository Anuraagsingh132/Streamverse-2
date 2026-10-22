import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search,
  X,
  Tv,
  LayoutGrid,
  Rows,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  fetchLiveStreams,
  getStreamStatus,
  filterStreams
} from '../services/liveTv';
import { LiveStream } from '../types/liveTv';
import { SEOHead } from '../components/SEOHead';
import { LiveHeroBanner } from '../components/live-tv/LiveHeroBanner';
import { LiveStreamRail } from '../components/live-tv/LiveStreamRail';
import { LiveStreamCard } from '../components/live-tv/LiveStreamCard';
import { CinemaOSLivePlayer } from '../components/live-tv/CinemaOSLivePlayer';

export const LiveSportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allStreams, setAllStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & View State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | '24/7'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rails' | 'grid'>('rails');

  // Active Stream for Full-Page CinemaOS Player
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);

  // Load streams from public API
  const loadStreams = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchLiveStreams(isManualRefresh);
      setAllStreams(data.allStreams);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to live stream relay.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and 60-second periodic background revalidation
  useEffect(() => {
    loadStreams();

    const intervalId = setInterval(() => {
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
      }
    }
  }, [searchParams, allStreams, selectedStream]);

  // Open stream in full-page player
  const handleOpenStream = (stream: LiveStream) => {
    setSelectedStream(stream);
    setSearchParams({ stream: stream.uri_name || String(stream.id) }, { replace: true });
  };

  // Close player
  const handleCloseStream = useCallback(() => {
    setSelectedStream(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('stream');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Hero Showcase Items (Top 8 premier live and popular 24/7 streams)
  const heroItems = useMemo(() => {
    if (allStreams.length === 0) return [];
    
    // Prioritize high-res items: 24/7 channels and active live events
    const priority247 = allStreams.filter(
      (s) => (s.always_live === 1 || s.always_live === true) && Boolean(s.poster)
    );
    const priorityLive = allStreams.filter(
      (s) => getStreamStatus(s) === 'live' && !s.always_live && Boolean(s.poster)
    );
    const otherWithPosters = allStreams.filter(
      (s) => Boolean(s.poster) && !priority247.includes(s) && !priorityLive.includes(s)
    );

    return [...priority247, ...priorityLive, ...otherWithPosters].slice(0, 8);
  }, [allStreams]);

  // Categorized stream buckets for cinematic horizontal rails
  const railsData = useMemo(() => {
    const liveNow = allStreams.filter((s) => s.always_live === 1 || getStreamStatus(s) === 'live');
    const twentyFourSeven = allStreams.filter(
      (s) =>
        s.always_live === 1 ||
        s.always_live === true ||
        s.category_name?.toLowerCase().includes('24/7')
    );
    const football = allStreams.filter(
      (s) => s.category_name?.toLowerCase() === 'football' && !s.always_live
    );
    const americanFootball = allStreams.filter(
      (s) => s.category_name?.toLowerCase() === 'american football' && !s.always_live
    );
    const basketball = allStreams.filter(
      (s) => s.category_name?.toLowerCase() === 'basketball' && !s.always_live
    );
    const wrestling = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('wrestling') ||
        s.category_name?.toLowerCase().includes('combat')
    );
    const iceHockey = allStreams.filter(
      (s) => s.category_name?.toLowerCase().includes('ice hockey')
    );
    const upcoming = allStreams.filter(
      (s) => getStreamStatus(s) === 'upcoming' && !s.always_live
    );

    return {
      liveNow,
      twentyFourSeven,
      football,
      americanFootball,
      basketball,
      wrestling,
      iceHockey,
      upcoming
    };
  }, [allStreams]);

  // Filtered streams list for Grid / Search view
  const filteredStreams = useMemo(() => {
    return filterStreams(allStreams, {
      category: selectedCategory,
      query: searchQuery,
      status: statusFilter
    });
  }, [allStreams, selectedCategory, searchQuery, statusFilter]);

  // Dynamic category options derived from data
  const categoryPills = useMemo(() => {
    const list = [
      { id: 'All', label: 'All Feeds' },
      { id: '24/7 Channels', label: '📺 24/7 TV' },
      { id: 'Football', label: '⚽ Football' },
      { id: 'American Football', label: '🏈 NFL' },
      { id: 'Basketball', label: '🏀 Basketball' },
      { id: 'Wrestling', label: '🥊 Combat' },
      { id: 'Ice Hockey', label: '🏒 Hockey' }
    ];
    return list;
  }, []);

  const isSearchActive = searchQuery.trim().length > 0;
  const isFilteredCategory = selectedCategory !== 'All';
  const isFilteredStatus = statusFilter !== 'all';
  const shouldRenderGrid = viewMode === 'grid' || isSearchActive || isFilteredCategory || isFilteredStatus;

  return (
    <div className="relative min-h-screen bg-black">
      <SEOHead
        title="Live TV & Sports | Streamverse"
        description="Stream live sports matches, NFL broadcasts, UEFA Champions League games, and 24/7 cult TV networks in high definition on Streamverse."
      />

      {/* Hero Showcase (Matching Movies & TV Shows Banner) */}
      {!loading && heroItems.length > 0 && !isSearchActive && (
        <LiveHeroBanner items={heroItems} onPlay={handleOpenStream} />
      )}

      {/* Main Content Overlapping Hero with consistent Streamverse -48px rhythm */}
      <div
        className="relative z-10 space-y-10 sm:space-y-14 pb-20 bg-[#060812]"
        style={{ marginTop: heroItems.length > 0 && !isSearchActive ? '-48px' : '0' }}
      >
        {/* Sticky Filter & Search Control Bar */}
        <div className="sticky top-16 z-30 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-4 pb-3 bg-[#060812]/90 backdrop-blur-2xl border-b border-white/10">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            {/* Search Input Bar */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 200+ live matches, teams, channels (e.g. South Park, NFL, Arsenal)..."
                className="w-full rounded-full border border-white/15 bg-white/[0.06] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-white/40 backdrop-blur-xl focus:border-rose-500/60 focus:bg-white/[0.1] focus:outline-none transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 hover:text-white transition cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Segment Status & View Mode Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              {/* Status Segment */}
              <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-xl text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  All ({allStreams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('live')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition cursor-pointer ${
                    statusFilter === 'live'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                  Live ({railsData.liveNow.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('24/7')}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
                    statusFilter === '24/7'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5" />
                  24/7 ({railsData.twentyFourSeven.length})
                </button>
              </div>

              {/* View Mode Switcher (Rails vs Grid) */}
              <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('rails')}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition cursor-pointer ${
                    viewMode === 'rails' && !isSearchActive
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Cinematic Rails View"
                  aria-label="Rails view"
                >
                  <Rows className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition cursor-pointer ${
                    viewMode === 'grid' || isSearchActive
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title="Grid View"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* Manual Refresh */}
              <button
                type="button"
                onClick={() => loadStreams(true)}
                disabled={refreshing}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/15 hover:text-white transition backdrop-blur-xl cursor-pointer disabled:opacity-50"
                title="Refresh stream feed"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Category Filter Pills Rail */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none" role="tablist">
            {categoryPills.map((pill) => {
              const isSelected = selectedCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(pill.id)}
                  className={`relative shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'text-white'
                      : 'border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="sports-active-pill"
                      className="absolute inset-0 rounded-full bg-rose-600 shadow-lg shadow-rose-600/30"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="space-y-12 px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-8">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="space-y-4">
                <div className="h-6 w-48 rounded-lg bg-white/10 animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, c) => (
                    <div
                      key={c}
                      className="aspect-[16/9] rounded-2xl bg-white/[0.06] border border-white/5 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error && allStreams.length === 0 ? (
          <div className="mx-5 sm:mx-8 lg:mx-12 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-12 text-center space-y-4 max-w-xl mx-auto my-12">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Relay Connection Unavailable</h3>
              <p className="text-xs text-white/70">
                {error}. Attempting to reconnect automatically across backup mirror domains.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadStreams(true)}
              className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black shadow-lg hover:bg-white/90 transition cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : shouldRenderGrid ? (
          /* Grid View (When searching, category filtering, or grid mode toggled) */
          <div className="px-5 sm:px-8 lg:px-10 xl:px-12 2xl:px-14 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  {isSearchActive ? 'Search Results' : selectedCategory}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {filteredStreams.length} Broadcast{filteredStreams.length === 1 ? '' : 's'} Found
                </h2>
              </div>
            </div>

            {filteredStreams.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Search className="h-10 w-10 text-white/40 mx-auto" />
                <h3 className="text-base font-bold text-white">No active broadcasts found</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  Try adjusting your search keywords, status filter, or select "All Feeds".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setStatusFilter('all');
                  }}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                {filteredStreams.map((stream) => (
                  <LiveStreamCard
                    key={stream.id}
                    stream={stream}
                    onPlay={handleOpenStream}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Cinematic Horizontal Rails View (Matching Movies & TV Shows 1:1) */
          <div className="space-y-6 sm:space-y-10">
            {/* Rail 1: Live Broadcasts Airing Now */}
            <LiveStreamRail
              title="Live Broadcasts On Air"
              subtitle="Active Satellite Relays"
              badge="🔴 Live Now"
              items={railsData.liveNow}
              onPlay={handleOpenStream}
              accentColor="#e11d48"
            />

            {/* Rail 2: 24/7 TV Channels */}
            <LiveStreamRail
              title="24/7 TV Networks & Cult Channels"
              subtitle="Continuous Linear Television"
              badge="📺 24/7 Live"
              items={railsData.twentyFourSeven}
              onPlay={handleOpenStream}
              accentColor="#10b981"
            />

            {/* Rail 3: Football / Soccer */}
            <LiveStreamRail
              title="European & World Football"
              subtitle="Premier League · Champions League"
              items={railsData.football}
              onPlay={handleOpenStream}
              accentColor="#3b82f6"
            />

            {/* Rail 4: American Football */}
            <LiveStreamRail
              title="NFL & American Football"
              subtitle="Gridiron Action & College Relays"
              items={railsData.americanFootball}
              onPlay={handleOpenStream}
              accentColor="#f97316"
            />

            {/* Rail 5: Basketball */}
            <LiveStreamRail
              title="NBA & Global Basketball"
              subtitle="Courtside Broadcast Relays"
              items={railsData.basketball}
              onPlay={handleOpenStream}
              accentColor="#eab308"
            />

            {/* Rail 6: Wrestling & Combat */}
            <LiveStreamRail
              title="Wrestling, MMA & Combat Sports"
              subtitle="WWE · AEW · TNA Heavyweight Action"
              items={railsData.wrestling}
              onPlay={handleOpenStream}
              accentColor="#a855f7"
            />

            {/* Rail 7: Ice Hockey */}
            <LiveStreamRail
              title="Ice Hockey & Winter Sports"
              subtitle="Rinkside Satellite Feeds"
              items={railsData.iceHockey}
              onPlay={handleOpenStream}
              accentColor="#06b6d4"
            />

            {/* Rail 8: Upcoming Fixtures */}
            <LiveStreamRail
              title="Upcoming Fixtures & Schedule"
              subtitle="Scheduled Satellite Feeds"
              badge="⏱️ Upcoming"
              items={railsData.upcoming}
              onPlay={handleOpenStream}
              accentColor="#f59e0b"
            />
          </div>
        )}
      </div>

      {/* Full-Page CinemaOS Live Player Viewport */}
      {selectedStream && (
        <CinemaOSLivePlayer
          stream={selectedStream}
          onClose={handleCloseStream}
        />
      )}
    </div>
  );
};

export default LiveSportsPage;

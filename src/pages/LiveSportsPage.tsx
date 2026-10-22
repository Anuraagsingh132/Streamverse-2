import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Tv,
  LayoutGrid,
  Rows,
  RefreshCw,
  AlertCircle,
  Globe,
  Trophy,
  Flame,
  Zap,
  ShieldAlert,
  Radio
} from 'lucide-react';
import {
  fetchLiveStreams,
  getStreamStatus,
  filterStreams,
  getStreamCountdown
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

  // Time tracking for "Updated Xm ago" label
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [timeAgoText, setTimeAgoText] = useState<string>('just now');
  const [currentSec, setCurrentSec] = useState<number>(() => Math.floor(Date.now() / 1000));

  // Filters & View State
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | '24/7'>('all');
  const [dayFilter, setDayFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rails' | 'grid'>('rails');

  // Active Stream for CinemaOS Player
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);

  // Watchlist / Saved stream IDs persisted in localStorage
  const [savedStreamIds, setSavedStreamIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem('streamverse_saved_sports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toggle bookmark handler
  const handleToggleBookmark = useCallback((stream: LiveStream) => {
    setSavedStreamIds((prev) => {
      const next = prev.includes(stream.id)
        ? prev.filter((id) => id !== stream.id)
        : [...prev, stream.id];
      try {
        localStorage.setItem('streamverse_saved_sports', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Update relative time label and current second every 15 seconds
  useEffect(() => {
    const updateLabel = () => {
      const now = Date.now();
      setCurrentSec(Math.floor(now / 1000));
      const diffSec = Math.floor((now - lastUpdated) / 1000);
      if (diffSec < 45) setTimeAgoText('just now');
      else if (diffSec < 90) setTimeAgoText('1m ago');
      else setTimeAgoText(`${Math.floor(diffSec / 60)}m ago`);
    };

    updateLabel();
    const timer = setInterval(updateLabel, 15000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Global ⌘K / Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load streams from multi-mirror relay
  const loadStreams = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchLiveStreams(isManualRefresh);
      setAllStreams(data.allStreams);
      setLastUpdated(Date.now());
      setTimeAgoText('just now');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to live stream relay.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and 60-second periodic background revalidation
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
  const handleOpenStream = useCallback(
    (stream: LiveStream) => {
      setSelectedStream(stream);
      setSearchParams({ stream: stream.uri_name || String(stream.id) }, { replace: true });
    },
    [setSearchParams]
  );

  // Close player
  const handleCloseStream = useCallback(() => {
    setSelectedStream(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('stream');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Hero Showcase Items (Top 8 premier live matches & channels with valid posters)
  const heroItems = useMemo(() => {
    if (allStreams.length === 0) return [];

    const nowSec = currentSec;
    // 1. Live high profile matches
    const priorityLive = allStreams.filter(
      (s) => getStreamStatus(s, nowSec) === 'live' && !s.always_live && Boolean(s.poster)
    );
    // 2. Marquee 24/7 channels
    const priority247 = allStreams.filter(
      (s) => (s.always_live === 1 || s.always_live === true) && Boolean(s.poster)
    );
    // 3. Upcoming matches with posters
    const priorityUpcoming = allStreams.filter(
      (s) => getStreamStatus(s, nowSec) === 'upcoming' && !s.always_live && Boolean(s.poster)
    );

    return [...priorityLive, ...priority247, ...priorityUpcoming].slice(0, 8);
  }, [allStreams, currentSec]);

  // Content Rails with Deduplication & Sparse Rows Combined
  const railsData = useMemo(() => {
    const nowSec = currentSec;

    // 1. Live Matches (Real live matches only, no 24/7 channels)
    const liveMatches = allStreams
      .filter((s) => !s.always_live && getStreamStatus(s, nowSec) === 'live')
      .sort((a, b) => (b.starts_at || 0) - (a.starts_at || 0));

    // Starting soon matches within next 8 hours
    const startingSoonMatches = allStreams
      .filter(
        (s) =>
          !s.always_live &&
          s.starts_at > nowSec &&
          s.starts_at <= nowSec + 8 * 3600
      )
      .sort((a, b) => a.starts_at - b.starts_at);

    // Combined Live & Starting Soon row (Live matches first, then upcoming)
    const liveAndStartingSoon = [...liveMatches, ...startingSoonMatches];
    const featuredIds = new Set(liveAndStartingSoon.map((s) => s.id));

    // Next upcoming match for empty live state banner
    const nextUpcomingMatch = startingSoonMatches[0] || null;

    // 2. Cricket Channels & Fixtures (Willow, Fox Cricket, tests, IPL)
    const cricket = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('cricket') ||
        s.name?.toLowerCase().includes('cricket') ||
        s.tag?.toLowerCase().includes('cricket') ||
        s.source_tag?.toLowerCase().includes('willow')
    );

    // 3. Football (Soccer) - strictly exclude items already featured above
    const football = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase() === 'football' &&
        !s.always_live &&
        !featuredIds.has(s.id)
    );

    // 4. Basketball (NBA, EuroLeague) - exclude items already featured
    const basketball = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('basketball') &&
        !s.always_live &&
        !featuredIds.has(s.id)
    );

    // 5. American Football (NFL) - exclude items already featured
    const americanFootball = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('american football') &&
        !s.always_live &&
        !featuredIds.has(s.id)
    );

    // 6. Ice Hockey (NHL) - exclude items already featured
    const iceHockey = allStreams.filter(
      (s) =>
        (s.category_name?.toLowerCase().includes('ice hockey') ||
          s.category_name?.toLowerCase().includes('hockey')) &&
        !s.always_live &&
        !featuredIds.has(s.id)
    );

    // 7. Combat Sports (Wrestling, UFC, Boxing, MMA merged so no sparse rows)
    const combatSports = allStreams.filter(
      (s) =>
        (s.category_name?.toLowerCase().includes('wrestling') ||
          s.category_name?.toLowerCase().includes('combat') ||
          s.category_name?.toLowerCase().includes('boxing') ||
          s.category_name?.toLowerCase().includes('mma')) &&
        !featuredIds.has(s.id)
    );

    // 8. Darts & World Sports (Darts, Motorsports, Rugby, Golf) - Fox Footy moved to 24/7 channels
    const dartsAndMore = allStreams.filter((s) => {
      if (s.always_live || featuredIds.has(s.id)) return false;
      const cat = s.category_name?.toLowerCase() || '';
      const name = s.name?.toLowerCase() || '';
      if (name.includes('fox footy')) return false;
      return (
        cat.includes('dart') ||
        cat.includes('motor') ||
        cat.includes('rugby') ||
        cat.includes('golf')
      );
    });

    // 9. 24/7 TV Networks & Channels (Linear channels with always_live, including Fox Footy)
    const twentyFourSeven = allStreams.filter(
      (s) =>
        s.always_live === 1 ||
        s.always_live === true ||
        s.category_name?.toLowerCase().includes('24/7') ||
        s.tag?.toLowerCase().includes('24/7') ||
        s.name?.toLowerCase().includes('fox footy')
    );

    return {
      liveMatches,
      startingSoonMatches,
      liveAndStartingSoon,
      nextUpcomingMatch,
      cricket,
      football,
      basketball,
      americanFootball,
      iceHockey,
      combatSports,
      dartsAndMore,
      twentyFourSeven
    };
  }, [allStreams, currentSec]);

  // Filtered streams list for Grid or Search view (includes Day filter)
  const filteredStreams = useMemo(() => {
    return filterStreams(allStreams, {
      category: selectedSport,
      query: searchQuery,
      status: statusFilter,
      day: dayFilter
    });
  }, [allStreams, selectedSport, searchQuery, statusFilter, dayFilter]);

  // Comprehensive Sport Categories with Icons (Row 2 Chips: 40px tall, 14px text, 16px icons)
  const sportChips = useMemo(
    () => [
      { id: 'All', label: 'All Feeds', icon: Globe },
      { id: 'Cricket', label: 'Cricket', icon: Trophy },
      { id: 'Football', label: 'Football', icon: Flame },
      { id: 'Basketball', label: 'Basketball', icon: Trophy },
      { id: 'American Football', label: 'NFL', icon: Zap },
      { id: 'Ice Hockey', label: 'Ice Hockey', icon: Zap },
      { id: 'Combat Sports', label: 'Combat Sports', icon: ShieldAlert },
      { id: 'Darts & World Sports', label: 'Darts & More', icon: Trophy },
      { id: '24/7 Channels', label: '24/7 TV', icon: Tv }
    ],
    []
  );

  const isSearchActive = searchQuery.trim().length > 0;
  const isFilteredSport = selectedSport !== 'All';
  const isFilteredStatus = statusFilter !== 'all';
  const isFilteredDay = dayFilter !== 'all';
  const shouldRenderGrid =
    viewMode === 'grid' || isSearchActive || isFilteredSport || isFilteredStatus || isFilteredDay;

  return (
    <div className="relative min-h-screen bg-[#060812] text-white">
      <SEOHead
        title="Live Sports & Live TV | Streamverse"
        description="Stream live football, cricket, NFL broadcasts, basketball, and continuous 24/7 TV networks in high definition on Streamverse."
      />

      {/* Hero Banner: 480-560px on desktop, vertically centered, no nav overlap */}
      {!loading && heroItems.length > 0 && !isSearchActive && (
        <LiveHeroBanner
          items={heroItems}
          onPlay={handleOpenStream}
          savedStreamIds={savedStreamIds}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Main Content Area */}
      <div className="relative z-10 space-y-6 sm:space-y-10 pb-24">
        {/* Sticky Search and Filter Bar: 64px tall, blur background under nav */}
        <div className="sticky top-16 z-30 bg-[#060812]/90 backdrop-blur-2xl border-b border-white/10 px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto w-full transition-all">
          {/* Row 1: Search Box + Segmented Control + Icon Group */}
          <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
            {/* Left: Search box with flex: 1, min-width: 0 and ⌘K hint hidden on touch */}
            <div className="relative flex-1 min-w-0 max-w-sm sm:max-w-md h-11 shrink">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search matches, teams, channels..."
                className="w-full h-full rounded-full border border-white/15 bg-white/[0.06] pl-10 pr-12 text-sm text-white placeholder-white/40 backdrop-blur-xl focus:border-white/30 focus:bg-white/[0.1] focus:outline-none transition shadow-inner"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/50 hidden sm:inline-block">
                  ⌘K
                </kbd>
              )}
            </div>

            {/* Right: Controls with shrink-0 preventing clipping */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Segmented Control for All / Live / Upcoming / 24/7 */}
              <div className="hidden sm:flex items-center rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-xl text-xs">
                {/* All */}
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

                {/* Live with red dot */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('live')}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition cursor-pointer ${
                    statusFilter === 'live'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  Live ({railsData.liveMatches.length})
                </button>

                {/* Upcoming */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('upcoming')}
                  className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
                    statusFilter === 'upcoming'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Upcoming ({railsData.startingSoonMatches.length})
                </button>

                {/* 24/7 */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('24/7')}
                  className={`rounded-full px-3 py-1 font-semibold transition cursor-pointer ${
                    statusFilter === '24/7'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  24/7 ({railsData.twentyFourSeven.length})
                </button>
              </div>

              {/* Day Filter (All Days / Today / Tomorrow / This Week) */}
              <div className="hidden xl:flex items-center rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-xl text-xs">
                {(['all', 'today', 'tomorrow', 'week'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayFilter(d)}
                    className={`rounded-full px-2.5 py-1 font-semibold transition cursor-pointer capitalize ${
                      dayFilter === d
                        ? 'bg-white text-black shadow-md'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {d === 'all' ? 'All Days' : d === 'week' ? 'This Week' : d === 'today' ? 'Today' : 'Tomorrow'}
                  </button>
                ))}
              </div>

              {/* View Toggle and Refresh into Single Icon Group */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 backdrop-blur-xl">
                {/* View toggle button */}
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'rails' ? 'grid' : 'rails')}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white transition cursor-pointer"
                  title={viewMode === 'rails' ? 'Switch to Grid View' : 'Switch to Rails View'}
                  aria-label="Toggle view mode"
                >
                  {viewMode === 'rails' ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <Rows className="h-4 w-4" />
                  )}
                </button>

                <div className="h-4 w-[1px] bg-white/15" />

                {/* "Updated 2m ago" label */}
                <span className="text-[11px] font-medium text-white/50 pl-1 pr-1.5 hidden md:inline select-none">
                  Updated {timeAgoText}
                </span>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={() => loadStreams(true)}
                  disabled={refreshing}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white transition cursor-pointer disabled:opacity-50"
                  title="Refresh stream feed"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-rose-400' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Sport Chips with 32px Right Edge Fade Mask */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none"
            style={{
              maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 32px), transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 32px), transparent 100%)'
            }}
            role="tablist"
          >
            {sportChips.map((chip) => {
              const isSelected = selectedSport === chip.id;
              const Icon = chip.icon;

              return (
                <button
                  key={chip.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedSport(chip.id)}
                  className={`h-10 px-4 rounded-full flex items-center gap-2 text-sm shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 font-medium'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeletons in Exact Card Shape */}
        {loading ? (
          <div className="space-y-12 px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto pt-6">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="space-y-4">
                <div className="h-7 w-52 rounded-lg bg-white/10 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, c) => (
                    <div
                      key={c}
                      className="aspect-[16/9] rounded-2xl bg-[#0f1424] border border-white/[0.08] animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error && allStreams.length === 0 ? (
          /* Error State */
          <div className="mx-5 sm:px-8 lg:px-12 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-12 text-center space-y-4 max-w-xl mx-auto my-16">
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
          /* Grid View (When searching, category filter active, or grid mode toggled) */
          <div className="px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                  {isSearchActive ? 'Search Results' : selectedSport}
                </p>
                <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight mt-0.5">
                  {filteredStreams.length} {filteredStreams.length === 1 ? 'Broadcast' : 'Broadcasts'} Found
                </h2>
              </div>
            </div>

            {filteredStreams.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <Search className="h-10 w-10 text-white/40 mx-auto" />
                <h3 className="text-base font-bold text-white">No active broadcasts found</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  Try adjusting your search terms, changing the status filter, or selecting "All Feeds".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSport('All');
                    setStatusFilter('all');
                    setDayFilter('all');
                  }}
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
          /* Cinematic Rails View (Strictly deduplicated & sparse rows merged per audit) */
          <div className="space-y-4 sm:space-y-8">
            {/* Empty state banner when there are 0 live matches */}
            {railsData.liveMatches.length === 0 && (
              <div className="px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <Radio className="h-5 w-5 text-white/40" />
                    <div>
                      <p className="text-sm font-semibold text-white">No live matches right now</p>
                      <p className="text-xs text-white/50">
                        {railsData.nextUpcomingMatch
                          ? `Next scheduled fixture kicks off ${getStreamCountdown(railsData.nextUpcomingMatch.starts_at, currentSec)} (${railsData.nextUpcomingMatch.name})`
                          : 'Explore 24/7 television channels or upcoming fixtures below.'}
                      </p>
                    </div>
                  </div>
                  {railsData.nextUpcomingMatch && (
                    <button
                      type="button"
                      onClick={() => handleOpenStream(railsData.nextUpcomingMatch!)}
                      className="hidden sm:inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
                    >
                      View Next Fixture
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 1. Live & Starting Soon: Combined row (Live first, then next 8 hours) */}
            {railsData.liveAndStartingSoon.length > 0 && (
              <LiveStreamRail
                title="Live & Starting Soon"
                subtitle="LIVE RELAYS · NEXT 8 HOURS"
                items={railsData.liveAndStartingSoon}
                onPlay={handleOpenStream}
                onBrowseAll={() => setStatusFilter('live')}
                unitLabel="matches"
              />
            )}

            {/* 2. Cricket Channels & Feeds (High audience priority) */}
            {railsData.cricket.length > 0 && (
              <LiveStreamRail
                title="Cricket Channels & Feeds"
                subtitle="WILLOW · FOX CRICKET"
                items={railsData.cricket}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Cricket')}
                unitLabel="channels"
              />
            )}

            {/* 3. European & World Football */}
            {railsData.football.length > 0 && (
              <LiveStreamRail
                title="European & World Football"
                subtitle="PREMIER LEAGUE · CHAMPIONS LEAGUE"
                items={railsData.football}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Football')}
                unitLabel="matches"
              />
            )}

            {/* 4. Basketball */}
            {railsData.basketball.length > 0 && (
              <LiveStreamRail
                title="NBA & Basketball"
                subtitle="REGULAR SEASON · EUROLEAGUE"
                items={railsData.basketball}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Basketball')}
                unitLabel="games"
              />
            )}

            {/* 5. NFL & American Football */}
            {railsData.americanFootball.length > 0 && (
              <LiveStreamRail
                title="NFL & American Football"
                subtitle="NATIONAL FOOTBALL LEAGUE"
                items={railsData.americanFootball}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('American Football')}
                unitLabel="games"
              />
            )}

            {/* 6. Ice Hockey */}
            {railsData.iceHockey.length > 0 && (
              <LiveStreamRail
                title="NHL & Ice Hockey"
                subtitle="NATIONAL HOCKEY LEAGUE"
                items={railsData.iceHockey}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Ice Hockey')}
                unitLabel="matches"
              />
            )}

            {/* 7. Combat Sports & Wrestling (WWE, UFC, Boxing merged together) */}
            {railsData.combatSports.length > 0 && (
              <LiveStreamRail
                title="Combat Sports & Wrestling"
                subtitle="WWE · UFC · BOXING"
                items={railsData.combatSports}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Combat Sports')}
                unitLabel="bouts"
              />
            )}

            {/* 8. Darts & World Sports */}
            {railsData.dartsAndMore.length > 0 && (
              <LiveStreamRail
                title="Darts & World Sports"
                subtitle="PDC WORLD SERIES · RUGBY"
                items={railsData.dartsAndMore}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Darts & World Sports')}
                unitLabel="events"
              />
            )}

            {/* 9. 24/7 TV Networks & Cult Channels (Fox Footy, NFL Network, etc. with compactChannel=true) */}
            {railsData.twentyFourSeven.length > 0 && (
              <LiveStreamRail
                title="24/7 TV Networks & Cult Channels"
                subtitle="CONTINUOUS LINEAR BROADCASTS"
                items={railsData.twentyFourSeven}
                onPlay={handleOpenStream}
                onBrowseAll={() => setStatusFilter('24/7')}
                compactChannel={true}
                unitLabel="channels"
              />
            )}
          </div>
        )}
      </div>

      {/* Full-Page CinemaOS Live Player Modal */}
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
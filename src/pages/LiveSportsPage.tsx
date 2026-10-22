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
  ShieldAlert
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

  // Time tracking for "Updated Xm ago" label
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [timeAgoText, setTimeAgoText] = useState<string>('just now');
  const [currentSec, setCurrentSec] = useState<number>(() => Math.floor(Date.now() / 1000));

  // Filters & View State
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | '24/7'>('all');
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

  // Content Rails with Strict Deduplication & Content Hierarchy
  const railsData = useMemo(() => {
    const nowSec = currentSec;

    // 1. Live Now: ONLY real live matches (always_live === 0 and status is live)
    // Strictly NO 24/7 channels mixed in! Sorted by start time.
    const liveNow = allStreams
      .filter((s) => !s.always_live && getStreamStatus(s, nowSec) === 'live')
      .sort((a, b) => (b.starts_at || 0) - (a.starts_at || 0));

    // 2. Starting Soon: Next 6 hours
    const startingSoon = allStreams
      .filter(
        (s) =>
          !s.always_live &&
          s.starts_at > nowSec &&
          s.starts_at <= nowSec + 6 * 3600
      )
      .sort((a, b) => a.starts_at - b.starts_at);

    // 3. Cricket: Cricket category or cricket tags (Willow, Fox Cricket, IPL, tests)
    const cricket = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('cricket') ||
        s.name?.toLowerCase().includes('cricket') ||
        s.tag?.toLowerCase().includes('cricket') ||
        s.source_tag?.toLowerCase().includes('willow')
    );

    // 4. European & World Football (Soccer)
    const football = allStreams.filter(
      (s) => s.category_name?.toLowerCase() === 'football' && !s.always_live
    );

    // 5. NFL & American Football
    const americanFootball = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('american football') &&
        !s.always_live
    );

    // 6. Basketball (NBA, EuroLeague, NCAA)
    const basketball = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('basketball') &&
        !s.always_live
    );

    // 7. Combat Sports (Wrestling, UFC, Boxing, MMA - merged to avoid sparse rows)
    const combatSports = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('wrestling') ||
        s.category_name?.toLowerCase().includes('combat') ||
        s.category_name?.toLowerCase().includes('boxing') ||
        s.category_name?.toLowerCase().includes('mma')
    );

    // 8. Ice Hockey (NHL)
    const iceHockey = allStreams.filter(
      (s) =>
        s.category_name?.toLowerCase().includes('ice hockey') ||
        s.category_name?.toLowerCase().includes('hockey')
    );

    // 9. Motorsports, Darts & World Sports (Darts, Motorsports, Rugby, Golf, Australian Football)
    const otherSports = allStreams.filter((s) => {
      const cat = s.category_name?.toLowerCase() || '';
      return (
        cat.includes('dart') ||
        cat.includes('motor') ||
        cat.includes('rugby') ||
        cat.includes('golf') ||
        cat.includes('australian')
      );
    });

    // 10. 24/7 TV Networks & Channels (Linear channels with always_live === 1)
    const twentyFourSeven = allStreams.filter(
      (s) =>
        s.always_live === 1 ||
        s.always_live === true ||
        s.category_name?.toLowerCase().includes('24/7') ||
        s.tag?.toLowerCase().includes('24/7')
    );

    return {
      liveNow,
      startingSoon,
      cricket,
      football,
      americanFootball,
      basketball,
      combatSports,
      iceHockey,
      otherSports,
      twentyFourSeven
    };
  }, [allStreams, currentSec]);

  // Filtered streams list for Grid or Search view
  const filteredStreams = useMemo(() => {
    return filterStreams(allStreams, {
      category: selectedSport,
      query: searchQuery,
      status: statusFilter
    });
  }, [allStreams, selectedSport, searchQuery, statusFilter]);

  // Comprehensive Sport Categories with Icons (Row 2 Chips: 40px tall, 14px text, 16px icons)
  const sportChips = useMemo(
    () => [
      { id: 'All', label: 'All Feeds', icon: Globe },
      { id: 'Cricket', label: 'Cricket', icon: Trophy },
      { id: 'Football', label: 'Football', icon: Flame },
      { id: 'American Football', label: 'NFL', icon: Zap },
      { id: 'Basketball', label: 'Basketball', icon: Trophy },
      { id: 'Combat Sports', label: 'Combat Sports', icon: ShieldAlert },
      { id: 'Ice Hockey', label: 'Ice Hockey', icon: Zap },
      { id: '24/7 Channels', label: '24/7 TV', icon: Tv },
      { id: 'Motorsports & More', label: 'World Sports', icon: Trophy }
    ],
    []
  );

  const isSearchActive = searchQuery.trim().length > 0;
  const isFilteredSport = selectedSport !== 'All';
  const isFilteredStatus = statusFilter !== 'all';
  const shouldRenderGrid = viewMode === 'grid' || isSearchActive || isFilteredSport || isFilteredStatus;

  return (
    <div className="relative min-h-screen bg-[#060812] text-white">
      <SEOHead
        title="Live Sports & Live TV | Streamverse"
        description="Stream live football, cricket, NFL broadcasts, basketball, and continuous 24/7 TV networks in high definition on Streamverse."
      />

      {/* Hero Banner: 560-640px, 96px top padding so nav never overlaps */}
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
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Search box, 360px wide, 44px tall, with ⌘K hint on right */}
            <div className="relative w-full sm:w-[360px] h-11 shrink-0">
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
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
                  ⌘K
                </kbd>
              )}
            </div>

            {/* Right: Segmented Control + Icon Group */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Segmented Control for All / Live / Upcoming / 24/7 */}
              <div className="hidden sm:flex items-center rounded-full border border-white/15 bg-white/[0.06] p-1 backdrop-blur-xl text-xs">
                {/* All */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-full px-3.5 py-1.5 font-semibold transition cursor-pointer ${
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
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-bold transition cursor-pointer ${
                    statusFilter === 'live'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  Live ({railsData.liveNow.length})
                </button>

                {/* Upcoming */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('upcoming')}
                  className={`rounded-full px-3.5 py-1.5 font-semibold transition cursor-pointer ${
                    statusFilter === 'upcoming'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Upcoming ({railsData.startingSoon.length})
                </button>

                {/* 24/7 */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('24/7')}
                  className={`rounded-full px-3.5 py-1.5 font-semibold transition cursor-pointer ${
                    statusFilter === '24/7'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  24/7 ({railsData.twentyFourSeven.length})
                </button>
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

          {/* Row 2: Sport Chips (40px tall, 14px text, 16px icons) */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none"
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

        {/* Loading Skeletons */}
        {loading ? (
          <div className="space-y-12 px-5 sm:px-8 lg:px-12 max-w-[1600px] mx-auto pt-6">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="space-y-4">
                <div className="h-7 w-52 rounded-lg bg-white/10 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          /* Error / Relay failover state */
          <div className="mx-5 sm:mx-8 lg:px-12 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-12 text-center space-y-4 max-w-xl mx-auto my-16">
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
          /* Cinematic Rails View (Strictly deduplicated, ordered per audit specification) */
          <div className="space-y-4 sm:space-y-8">
            {/* 1. Live Now: ONLY real live matches, sorted by start time (No 24/7 duplicate mixing!) */}
            {railsData.liveNow.length > 0 && (
              <LiveStreamRail
                title="Live Matches On Air"
                subtitle="Active Stadium Relays"
                items={railsData.liveNow}
                onPlay={handleOpenStream}
                onBrowseAll={() => setStatusFilter('live')}
                unitLabel="matches"
              />
            )}

            {/* 2. Starting Soon: Next 6 hours */}
            {railsData.startingSoon.length > 0 && (
              <LiveStreamRail
                title="Starting Soon"
                subtitle="Next 6 Hours Schedule"
                items={railsData.startingSoon}
                onPlay={handleOpenStream}
                onBrowseAll={() => setStatusFilter('upcoming')}
                unitLabel="fixtures"
              />
            )}

            {/* 3. Cricket: Top priority user request (Fox Cricket, Willow, IPL, tests) */}
            {railsData.cricket.length > 0 && (
              <LiveStreamRail
                title="Cricket World Tournaments"
                subtitle="Test Series · T20 Leagues · Live"
                items={railsData.cricket}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Cricket')}
                unitLabel="matches"
              />
            )}

            {/* 4. European & World Football */}
            {railsData.football.length > 0 && (
              <LiveStreamRail
                title="European & World Football"
                subtitle="Premier League · Champions League · La Liga"
                items={railsData.football}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Football')}
                unitLabel="matches"
              />
            )}

            {/* 5. NFL & American Football */}
            {railsData.americanFootball.length > 0 && (
              <LiveStreamRail
                title="NFL & American Football"
                subtitle="National Football League · College"
                items={railsData.americanFootball}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('American Football')}
                unitLabel="games"
              />
            )}

            {/* 6. Basketball */}
            {railsData.basketball.length > 0 && (
              <LiveStreamRail
                title="NBA & Basketball"
                subtitle="NBA Regular Season · EuroLeague"
                items={railsData.basketball}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Basketball')}
                unitLabel="games"
              />
            )}

            {/* 7. Combat Sports (Wrestling, Boxing, UFC, MMA combined to avoid sparse rows) */}
            {railsData.combatSports.length > 0 && (
              <LiveStreamRail
                title="Combat Sports & Wrestling"
                subtitle="WWE · UFC · Championship Boxing"
                items={railsData.combatSports}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Combat Sports')}
                unitLabel="bouts"
              />
            )}

            {/* 8. Ice Hockey */}
            {railsData.iceHockey.length > 0 && (
              <LiveStreamRail
                title="NHL & Ice Hockey"
                subtitle="National Hockey League"
                items={railsData.iceHockey}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Ice Hockey')}
                unitLabel="matches"
              />
            )}

            {/* 9. Motorsports, Darts & World Sports */}
            {railsData.otherSports.length > 0 && (
              <LiveStreamRail
                title="Motorsports, Darts & World Sports"
                subtitle="F1 · Darts Championships · Rugby"
                items={railsData.otherSports}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Motorsports & More')}
                unitLabel="events"
              />
            )}

            {/* 10. 24/7 TV Networks & Channels: Distinct 16:10 Logo Card Style */}
            {railsData.twentyFourSeven.length > 0 && (
              <LiveStreamRail
                title="24/7 TV Networks & Cult Channels"
                subtitle="Continuous Linear Television"
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
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Search,
  ArrowUpRight
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
import { LiveCategoryStrip } from '../components/live-tv/LiveCategoryStrip';
import { LiveNetworkStrip } from '../components/live-tv/LiveNetworkStrip';
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

  // Filters & State
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('q') || '');

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

  // Content Rails with Deduplication & Sparse Rows Combined per Design Audit
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

    // Featured Highlight row: Live matches first, followed by marquee starting soon matches
    const liveAndStartingSoon = [...liveMatches, ...startingSoonMatches].slice(0, 10);
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

    // 3. Football (Soccer) - strictly exclude items already in featured top row
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

    // 7. Combat Sports (Wrestling, UFC, Boxing, MMA)
    const combatSports = allStreams.filter(
      (s) =>
        (s.category_name?.toLowerCase().includes('wrestling') ||
          s.category_name?.toLowerCase().includes('combat') ||
          s.category_name?.toLowerCase().includes('boxing') ||
          s.category_name?.toLowerCase().includes('mma')) &&
        !featuredIds.has(s.id)
    );

    // 8. World Sports, Racing & Tournaments (Darts, Motorsports, Rugby, Golf, Australian Football)
    const worldSportsBase = allStreams.filter((s) => {
      if (s.always_live || featuredIds.has(s.id)) return false;
      const cat = s.category_name?.toLowerCase() || '';
      const name = s.name?.toLowerCase() || '';
      if (name.includes('fox footy')) return false;
      return (
        cat.includes('dart') ||
        cat.includes('motor') ||
        cat.includes('rugby') ||
        cat.includes('golf') ||
        cat.includes('australian football')
      );
    });

    // Eliminate sparse rows: If combat sports has < 4 items, merge into world sports!
    const shouldMergeCombat = combatSports.length > 0 && combatSports.length < 4;
    const finalCombatSports = shouldMergeCombat ? [] : combatSports;
    const worldSports = shouldMergeCombat
      ? [...combatSports, ...worldSportsBase]
      : worldSportsBase;

    // 9. 24/7 TV Networks & Channels (Linear channels with always_live, including Fox Footy, Willow, Fox Cricket)
    const rawTwentyFourSeven = allStreams.filter(
      (s) =>
        s.always_live === 1 ||
        s.always_live === true ||
        s.category_name?.toLowerCase().includes('24/7') ||
        s.tag?.toLowerCase().includes('24/7') ||
        s.name?.toLowerCase().includes('fox footy') ||
        s.name?.toLowerCase().includes('willow') ||
        s.name?.toLowerCase().includes('fox cricket')
    );

    // Deduplicate 24/7 channels by name
    const seenNames = new Set<string>();
    const twentyFourSeven: LiveStream[] = [];
    for (const ch of rawTwentyFourSeven) {
      const key = ch.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        twentyFourSeven.push(ch);
      }
    }

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
      combatSports: finalCombatSports,
      worldSports,
      twentyFourSeven
    };
  }, [allStreams, currentSec]);

  // Filtered streams list for Grid view (when specific category or status is selected)
  const filteredStreams = useMemo(() => {
    return filterStreams(allStreams, {
      category: selectedSport,
      query: searchQuery,
      status: statusFilter,
      day: 'all'
    });
  }, [allStreams, selectedSport, searchQuery, statusFilter]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isFilteredSport = selectedSport !== 'All';
  const isFilteredStatus = statusFilter !== 'all';
  const shouldRenderGrid = isSearchActive || isFilteredSport || isFilteredStatus;

  return (
    <div className="relative min-h-screen bg-[#060812] text-white">
      <SEOHead
        title="Live Sports &amp; Live TV | Streamverse"
        description="Stream live football, cricket, NFL broadcasts, basketball, and continuous 24/7 TV networks in high definition on Streamverse."
      />

      {/* Hero Showcase (480-560px, vertically centered, full bleed with vignette) */}
      {!loading && heroItems.length > 0 && !isSearchActive && (
        <LiveHeroBanner
          items={heroItems}
          onPlay={handleOpenStream}
          savedStreamIds={savedStreamIds}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Main Content Area Overlapping Hero with consistent spacing rhythm (1:1 with Movies page) */}
      <div 
        className="relative z-10 space-y-14 sm:space-y-16 pb-20 bg-[#060812]"
        style={{ marginTop: '-48px' }}
      >
        {/* Sport Category Icon Strip & Segmented Status Toggle (1:1 with Movies ProviderRail) */}
        {!loading && allStreams.length > 0 && (
          <LiveCategoryStrip
            selectedSport={selectedSport}
            onSelectSport={setSelectedSport}
            statusFilter={statusFilter}
            onSelectStatus={setStatusFilter}
            liveCount={railsData.liveMatches.length}
            upcomingCount={railsData.startingSoonMatches.length}
            totalCount={allStreams.length}
            onRefresh={() => loadStreams(true)}
            refreshing={refreshing}
            timeAgoText={timeAgoText}
          />
        )}

        {/* Loading Skeletons in 16:9 Card Shape */}
        {loading ? (
          <div className="space-y-12 px-6 sm:px-10 lg:px-14 max-w-[1600px] mx-auto pt-4">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="space-y-4">
                <div className="h-6 w-48 rounded-lg bg-white/10 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, c) => (
                    <div
                      key={c}
                      className="aspect-[16/9] rounded-2xl bg-[#12151E] border border-white/10 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error && allStreams.length === 0 ? (
          /* Error State */
          <div className="mx-6 sm:px-10 lg:px-14 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-12 text-center space-y-4 max-w-xl mx-auto my-16">
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
          /* Clean Filtered Grid View (When sport category or status toggle is active) */
          <div className="px-6 sm:px-10 lg:px-14 max-w-[1600px] mx-auto space-y-6 pt-2">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                  {selectedSport !== 'All'
                    ? selectedSport
                    : statusFilter !== 'all'
                    ? `${statusFilter} streams`
                    : 'Search results'}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {filteredStreams.length} {filteredStreams.length === 1 ? 'Broadcast' : 'Broadcasts'} Available
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedSport('All');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="group flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/35 cursor-pointer shadow-sm"
              >
                <span>View All Rails</span>
                <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            {filteredStreams.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <Search className="h-10 w-10 text-white/40 mx-auto" />
                <h3 className="text-base font-bold text-white">No active broadcasts found</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Try adjusting your filter selection or switching to "All Feeds".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSport('All');
                    setStatusFilter('all');
                    setSearchQuery('');
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
          /* Cinematic Rails View (Strictly deduplicated & sparse rows merged per design audit) */
          <div className="space-y-14 sm:space-y-16">
            {/* 1. Live & Starting Soon: Featured Highlight Row (Merged empty banner directly into rail subtitle) */}
            {railsData.liveAndStartingSoon.length > 0 && (
              <LiveStreamRail
                title="Live &amp; Starting Soon"
                subtitle={
                  railsData.liveMatches.length > 0
                    ? `${railsData.liveMatches.length} MATCHES LIVE NOW`
                    : railsData.nextUpcomingMatch
                    ? `NEXT FIXTURE IN ${getStreamCountdown(
                        railsData.nextUpcomingMatch.starts_at,
                        currentSec
                      ).toUpperCase()}`
                    : 'UPCOMING BROADCASTS'
                }
                items={railsData.liveAndStartingSoon}
                onPlay={handleOpenStream}
                onBrowseAll={() => setStatusFilter('live')}
                featured={true}
                unitLabel="matches"
              />
            )}

            {/* 2. 24/7 TV Networks: Horizontal Network Logo Squircle Strip (Matching Movies ProviderRail) */}
            {railsData.twentyFourSeven.length > 0 && (
              <LiveNetworkStrip
                title="24/7 TV Networks"
                subtitle="24/7 LINEAR CHANNELS"
                channels={railsData.twentyFourSeven}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('24/7 Channels')}
              />
            )}

            {/* 3. Cricket Channels & Feeds (Rendered only when >= 4 fixtures to prevent sparse 2-card rows) */}
            {railsData.cricket.length >= 4 && (
              <LiveStreamRail
                title="Cricket Channels &amp; Feeds"
                subtitle="CRICKET"
                items={railsData.cricket}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Cricket')}
                unitLabel="channels"
              />
            )}

            {/* 4. European & World Football */}
            {railsData.football.length > 0 && (
              <LiveStreamRail
                title="European &amp; World Football"
                subtitle="FOOTBALL"
                items={railsData.football}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Football')}
                unitLabel="matches"
              />
            )}

            {/* 5. NBA & Basketball */}
            {railsData.basketball.length > 0 && (
              <LiveStreamRail
                title="NBA &amp; Basketball"
                subtitle="BASKETBALL"
                items={railsData.basketball}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Basketball')}
                unitLabel="games"
              />
            )}

            {/* 6. NFL & American Football */}
            {railsData.americanFootball.length > 0 && (
              <LiveStreamRail
                title="NFL &amp; American Football"
                subtitle="AMERICAN FOOTBALL"
                items={railsData.americanFootball}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('American Football')}
                unitLabel="games"
              />
            )}

            {/* 7. NHL & Ice Hockey */}
            {railsData.iceHockey.length > 0 && (
              <LiveStreamRail
                title="NHL &amp; Ice Hockey"
                subtitle="ICE HOCKEY"
                items={railsData.iceHockey}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Ice Hockey')}
                unitLabel="matches"
              />
            )}

            {/* 8. Combat Sports & Wrestling (Merged when >= 4 items) */}
            {railsData.combatSports.length >= 4 && (
              <LiveStreamRail
                title="Combat Sports &amp; Wrestling"
                subtitle="COMBAT SPORTS"
                items={railsData.combatSports}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Combat Sports')}
                unitLabel="bouts"
              />
            )}

            {/* 9. World Sports & Championships (Darts, Motorsports, Rugby, Golf, Australian Football) */}
            {railsData.worldSports.length > 0 && (
              <LiveStreamRail
                title="World Sports &amp; Championships"
                subtitle="DARTS &amp; MORE"
                items={railsData.worldSports}
                onPlay={handleOpenStream}
                onBrowseAll={() => setSelectedSport('Darts & World Sports')}
                unitLabel="events"
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

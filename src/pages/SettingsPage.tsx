import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Server,
  Play,
  Check,
  Zap,
  Subtitles,
  RotateCcw,
  Database,
  Trash2,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
  Sliders,
  Film,
  HardDrive
} from 'lucide-react';
import { useUserSettings, VideoServerId, VideoQuality, SubtitleSize } from '../hooks/useUserSettings';
import { PixelDrainRoute } from '../utils/pixeldrain';
import { SEOHead } from '../components/SEOHead';
import { purgeMediaItemCache } from '../utils/cacheManager';

type SettingsTab = 'all' | 'servers' | 'playback' | 'subtitles' | 'storage';

interface ServerOption {
  id: VideoServerId;
  name: string;
  badge: string;
  category: 'direct' | 'official' | 'mirror';
  protocol: string;
  ping: string;
  desc: string;
}

const SERVER_OPTIONS: ServerOption[] = [
  {
    id: 'vidy',
    name: 'Vidy Universal',
    badge: 'Universal · Default',
    category: 'mirror',
    protocol: 'Universal Embed API',
    ping: '~20ms ping',
    desc: 'Vidy official universal embed player for Movies, Series, and Anime with instant buffer start and AniList sync.'
  },
  {
    id: 'cinezo',
    name: 'Cinezo Universal',
    badge: 'Fast HD',
    category: 'mirror',
    protocol: 'Universal Embed',
    ping: '~26ms ping',
    desc: 'All-in-one universal streaming embed for Movies, TV shows, and Anime with instant buffer start.'
  },
  {
    id: 'framextv',
    name: 'FramexTV',
    badge: 'Fast HD',
    category: 'mirror',
    protocol: 'Fast CDN Mirror',
    ping: '~28ms ping',
    desc: 'FramexTV high-performance edge streaming network for movies and TV shows.'
  },
  {
    id: 'cinemaos',
    name: 'CinemaOS Embed',
    badge: 'Official Mirror',
    category: 'official',
    protocol: 'Official Embed',
    ping: '~28ms ping',
    desc: 'CinemaOS official embed player with automatic server failover and built-in episode drawer.'
  },
  {
    id: 'flaxmovies',
    name: 'FlaxMovies',
    badge: 'Fast HD',
    category: 'mirror',
    protocol: 'Fast CDN Mirror',
    ping: '~30ms ping',
    desc: 'High-speed FlaxMovies stream host with multi-resolution support for movies and TV episodes.'
  },
  {
    id: 'hdhub',
    name: 'HDHub Direct Stream',
    badge: 'Fast Direct',
    category: 'direct',
    protocol: 'Direct MP4 / HLS',
    ping: '~32ms ping',
    desc: 'Primary direct cloud stream with multi-track audio switching, custom subtitle engines, and adaptive bitrates.'
  },
  {
    id: 'pengu',
    name: 'Pengu Cloud',
    badge: 'Direct & HLS',
    category: 'direct',
    protocol: 'Cloud HLS Stream',
    ping: '~34ms ping',
    desc: 'High-availability Pengu cloud mirror with redundant fallback stream channels and lossless audio.'
  },
  {
    id: 'vidsrc-sh',
    name: 'VidSrc (SH)',
    badge: 'Fast HD',
    category: 'mirror',
    protocol: 'Multi-Audio Embed',
    ping: '~35ms ping',
    desc: 'VidSrc high-speed global mirror with multi-language subtitle tracks, lossless audio, and rapid buffer start.'
  },
  {
    id: 'videasy',
    name: 'Videasy',
    badge: 'Mirror 1 · Adaptive',
    category: 'mirror',
    protocol: 'Adaptive Embed',
    ping: '~42ms ping',
    desc: 'Videasy low-latency player with automatic resolution scaling from 360p up to 1080p.'
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    badge: 'Mirror 3 · 1080p',
    category: 'mirror',
    protocol: 'Fast CDN Mirror',
    ping: '~38ms ping',
    desc: 'High-bandwidth edge delivery network optimized for bufferless 1080p Full HD streaming.'
  },
  {
    id: 'vidlux',
    name: 'VidLux',
    badge: 'Mirror 4',
    category: 'mirror',
    protocol: 'High-Availability',
    ping: '~55ms ping',
    desc: 'VidLux redundant fallback embed with automatic regional CDN routing.'
  },
  {
    id: 'vidlove',
    name: 'VidLove',
    badge: 'Mirror 5',
    category: 'mirror',
    protocol: 'Reliable Embed',
    ping: '~61ms ping',
    desc: 'VidLove reliable stream host with minimal buffering overhead and cross-platform compatibility.'
  },
  {
    id: 'vidrock',
    name: 'VidRock',
    badge: 'Mirror 6 · Backup',
    category: 'mirror',
    protocol: 'Multi-Source',
    ping: '~64ms ping',
    desc: 'VidRock multi-source backup server for handling peak-traffic times and catalog edge-cases.'
  },
  {
    id: 'mappletv',
    name: 'MappleTV',
    badge: 'Mirror 7 · HD',
    category: 'mirror',
    protocol: 'Cloud Mirror',
    ping: '~49ms ping',
    desc: 'MappleTV high-speed cloud mirror with direct media pass-through and rapid stream seeking.'
  },
  {
    id: 'vixsrc',
    name: 'VixSrc',
    badge: 'Mirror 8 · Direct',
    category: 'mirror',
    protocol: 'Direct Server',
    ping: '~44ms ping',
    desc: 'VixSrc direct high-speed streaming server offering high-definition video feeds with zero ads.'
  }
];

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useUserSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>('all');
  const [serverFilter, setServerFilter] = useState<'all' | 'direct' | 'mirror'>('all');
  const [savedNotification, setSavedNotification] = useState<string | null>(null);
  const [cachePurgedNotification, setCachePurgedNotification] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);
  const [isFpsEnabled, setIsFpsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('streamverse_show_fps') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleFps = () => {
    const next = !isFpsEnabled;
    setIsFpsEnabled(next);
    try {
      localStorage.setItem('streamverse_show_fps', String(next));
      window.dispatchEvent(new Event('toggle-fps-monitor'));
    } catch {}
    triggerSaved(`Real-time FPS HUD ${next ? 'enabled (Shift + F)' : 'disabled'}`);
  };

  const triggerSaved = (msg: string = 'Settings automatically saved & synced across all players!') => {
    setSavedNotification(msg);
    setTimeout(() => setSavedNotification(null), 2500);
  };

  const handleServerChange = (server: VideoServerId) => {
    updateSettings({ defaultServer: server });
    triggerSaved(`Default server set to ${server.toUpperCase()}`);
  };

  const handleRouteChange = (route: PixelDrainRoute) => {
    updateSettings({ pixelDrainRoute: route });
    triggerSaved(`PixelDrain stream route updated to ${route === 'cdn' ? 'Fast CDN Mirror' : 'Standard Edge Proxy'}`);
  };

  const handleAutoplayToggle = () => {
    const next = !settings.autoplayNext;
    updateSettings({ autoplayNext: next });
    triggerSaved(`Auto-play next episode ${next ? 'enabled' : 'disabled'}`);
  };

  const handleQualityChange = (quality: VideoQuality) => {
    updateSettings({ defaultQuality: quality });
    triggerSaved(`Default resolution target set to ${quality.toUpperCase()}`);
  };

  const handleSubtitleSizeChange = (size: SubtitleSize) => {
    updateSettings({ subtitleSize: size });
    triggerSaved(`Subtitle size set to ${size}`);
  };

  const handleSubtitleOffsetChange = (offset: number) => {
    const rounded = Math.round(offset * 10) / 10;
    updateSettings({ subtitleOffset: rounded });
    triggerSaved(`Subtitle timing offset set to ${rounded > 0 ? `+${rounded}` : rounded}s`);
  };

  const handlePurgeCache = () => {
    try {
      purgeMediaItemCache();
      setCachePurgedNotification(true);
      triggerSaved('Media cache & thumbnail buffers successfully cleared!');
      setTimeout(() => setCachePurgedNotification(false), 3000);
    } catch (e) {
      console.warn('Failed to purge cache:', e);
    }
  };

  const handleConfirmReset = () => {
    resetSettings();
    setConfirmResetOpen(false);
    triggerSaved('All preferences restored to factory defaults!');
  };

  // Local storage usage calculation
  const storageStats = useMemo(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { usedKb: 0, count: 0 };
    }
    try {
      let totalChars = 0;
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          totalChars += key.length + val.length;
          count++;
        }
      }
      return {
        usedKb: Math.max(1, Math.round((totalChars * 2) / 1024)),
        count
      };
    } catch {
      return { usedKb: 0, count: 0 };
    }
  }, [savedNotification, cachePurgedNotification]);

  const filteredServers = useMemo(() => {
    if (serverFilter === 'direct') {
      return SERVER_OPTIONS.filter((s) => s.category === 'direct' || s.category === 'official');
    }
    if (serverFilter === 'mirror') {
      return SERVER_OPTIONS.filter((s) => s.category === 'mirror' || s.category === 'official');
    }
    return SERVER_OPTIONS;
  }, [serverFilter]);

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'All Settings', icon: Sliders },
    { id: 'servers', label: 'Servers & CDN', icon: Server },
    { id: 'playback', label: 'Playback Engine', icon: Play },
    { id: 'subtitles', label: 'Subtitles & Audio', icon: Subtitles },
    { id: 'storage', label: 'Storage & Cache', icon: Database },
  ];

  const activeServerName = SERVER_OPTIONS.find((s) => s.id === settings.defaultServer)?.name || settings.defaultServer;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 lg:pt-28 pb-24">
      <SEOHead
        title="Settings & Playback Preferences | Streamverse"
        description="Configure your default video server, PixelDrain CDN stream routes, subtitle typography, and playback behavior on Streamverse."
      />

      {/* Atmospheric Ambient Glow Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(circle at 50% 12%, rgba(244, 63, 94, 0.12), rgba(139, 92, 246, 0.05) 45%, transparent 75%)'
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#060812]/80 p-6 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          {/* Subtle top accent gradient */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                <Settings className="h-3.5 w-3.5" />
                <span>Cinematic Engine · Studio Preferences</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Player & App Settings
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm text-white/70 leading-relaxed">
                Fine-tune streaming server priorities, PixelDrain CDN acceleration, subtitle typography, and playback persistence across your devices.
              </p>
            </div>

            {/* Quick Status Stats Pill Box */}
            <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t border-white/5 lg:border-t-0">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-zinc-300">
                  Server: <strong className="text-white font-semibold">{activeServerName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-xl">
                <HardDrive className="h-3.5 w-3.5 text-white/70" />
                <span className="text-xs text-zinc-300">
                  Local Cache: <strong className="text-white font-semibold">~{storageStats.usedKb} KB</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Category Navigation Bar */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'text-white'
                        : 'border border-white/5 bg-white/[0.02] text-white/70 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-tab-pill"
                        className="absolute inset-0 rounded-xl border border-rose-500/50 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <TabIcon className={`h-3.5 w-3.5 transition ${isActive ? 'text-rose-400' : 'text-white/70 group-hover:text-white'}`} />
                      <span>{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: SERVERS & NETWORKS */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'servers') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-white/10 bg-[#060812]/80 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6"
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 text-rose-500">
                  <Server className="h-5 w-5" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Default Video Server</h2>
                </div>
                <p className="text-xs text-white/70">
                  Choose which streaming provider loads first when starting movies or TV shows.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-white/10 bg-white/[0.02] p-1">
                {(['all', 'direct', 'mirror'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setServerFilter(filter)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition cursor-pointer ${
                      serverFilter === filter
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? `All (${SERVER_OPTIONS.length})` : filter === 'direct' ? 'Direct Streams' : 'Embed Mirrors'}
                  </button>
                ))}
              </div>
            </div>

            {/* Server Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServers.map((srv) => {
                const isSelected = settings.defaultServer === srv.id;
                const isDefaultFastest = srv.id === 'vidy';
                return (
                  <div
                    key={srv.id}
                    onClick={() => handleServerChange(srv.id)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-5.5 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-rose-500/80 bg-rose-500/15 shadow-[0_0_30px_rgba(244,63,94,0.22)] ring-1 ring-rose-500/50'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div>
                      {/* Top Bar inside card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                                : 'border-white/20 bg-transparent group-hover:border-white/40'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                          <span className="text-sm font-bold text-white tracking-tight">{srv.name}</span>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border shrink-0 transition ${
                            isDefaultFastest
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                              : 'bg-white/5 text-white/60 border-white/10'
                          }`}
                        >
                          {srv.badge}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
                        {srv.desc}
                      </p>
                    </div>

                    {/* Metadata Footer inside card */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/70">
                      <span className="flex items-center gap-1 font-mono text-white/55">
                        <Layers className="h-3 w-3" />
                        <span>{srv.protocol}</span>
                      </span>

                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <Activity className="h-3 w-3" />
                        <span>{srv.ping}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PixelDrain CDN Stream Route */}
            <div className="mt-8 border-t border-white/10 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-500">
                  <Zap className="h-5 w-5" />
                  <h3 className="text-base font-bold text-white">PixelDrain Stream Route</h3>
                </div>
                <span className="self-start sm:self-auto rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                  Direct Cloud Acceleration
                </span>
              </div>

              <p className="text-xs text-white/70 max-w-2xl">
                Configure how PixelDrain cloud video chunks are routed to your browser. Toggle between the local proxy to bypass ISP restrictions or the ultra-fast European CDN mirror.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  {
                    id: 'normal',
                    name: 'Normal (Edge Proxy)',
                    badge: 'Recommended for ISP Blocks',
                    icon: ShieldCheck,
                    badgeStyle: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
                    desc: 'Proxies video chunks through the application edge proxy. Best for bypassing ISP firewalls and domain blocks.',
                    pattern: '/api/pixeldrain/:id'
                  },
                  {
                    id: 'cdn',
                    name: 'Fast CDN Mirror',
                    badge: 'Direct High-Speed EU CDN',
                    icon: Zap,
                    badgeStyle: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                    desc: 'Streams directly from the European CDN mirror with high throughput and instant seeking for 4K / 1080p.',
                    pattern: '/api/pixeldrain-cdn/:id'
                  }
                ].map((routeOpt) => {
                  const isSelected = settings.pixelDrainRoute === routeOpt.id;
                  const RouteIcon = routeOpt.icon;
                  return (
                    <div
                      key={routeOpt.id}
                      onClick={() => handleRouteChange(routeOpt.id as PixelDrainRoute)}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-rose-500/60 bg-rose-500/10 shadow-[0_0_24px_rgba(244,63,94,0.15)]'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 ${isSelected ? 'bg-rose-500 text-white' : 'bg-white/5 text-zinc-300'}`}>
                              <RouteIcon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-bold text-white">{routeOpt.name}</span>
                          </div>

                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${routeOpt.badgeStyle}`}>
                            {routeOpt.badge}
                          </span>
                        </div>

                        <p className="text-xs text-white/70 leading-relaxed">
                          {routeOpt.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="font-mono text-white/55 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                          {routeOpt.pattern}
                        </span>
                        <span className={`font-semibold ${isSelected ? 'text-rose-400' : 'text-white/55'}`}>
                          {isSelected ? 'Active Route' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time Performance & Framerate HUD Setting */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold">Real-Time FPS &amp; Smoothness Monitor</h3>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                      Live HUD
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed max-w-xl">
                    Displays a real-time hardware frame counter (FPS), frame-time latency (ms), and hitch detection anywhere on the site. Toggle quickly with <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono text-[11px] border border-white/15">Shift + F</kbd> or via <code className="bg-white/10 px-1 py-0.5 rounded text-rose-300 font-mono text-[11px]">?fps=true</code> in the URL.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFps}
                  aria-pressed={isFpsEnabled}
                  className={`inline-flex items-center gap-2 self-start sm:self-auto rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer border ${
                    isFpsEnabled
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isFpsEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  <span>{isFpsEnabled ? 'HUD Enabled' : 'Enable FPS HUD'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: PLAYBACK & VIDEO */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'playback') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-white/10 bg-[#060812]/80 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6"
          >
            {/* Section Header */}
            <div className="border-b border-white/10 pb-5">
              <div className="flex items-center gap-2.5 text-rose-500">
                <Play className="h-5 w-5" />
                <h2 className="text-lg font-bold text-white tracking-tight">Playback Engine & Quality</h2>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Configure auto-progression, default resolution targets, and video playback behaviors.
              </p>
            </div>

            {/* Auto-Play Toggle Card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6 transition hover:border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-white">Auto-Play Next Episode</span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    Binge Mode
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-zinc-300 max-w-xl leading-relaxed">
                  Automatically advances and starts the next episode in the TV season when credits roll.
                </p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className={`text-xs font-bold tracking-wider uppercase transition ${
                  settings.autoplayNext ? 'text-rose-400 font-semibold' : 'text-white/40'
                }`}>
                  {settings.autoplayNext ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  onClick={handleAutoplayToggle}
                  aria-pressed={settings.autoplayNext}
                  aria-label="Toggle Auto-Play Next Episode"
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                    settings.autoplayNext
                      ? 'bg-rose-600 border-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.4)]'
                      : 'bg-white/15 border-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out mt-[1px] ml-[1px] ${
                      settings.autoplayNext ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Video Resolution Options */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Default Video Quality Target</h3>
                  <p className="text-xs text-white/70">Preferred streaming resolution when multi-bitrate streams are detected.</p>
                </div>
                <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                  Selected: {settings.defaultQuality}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: '1080p', label: '1080p Full HD', badge: 'Standard', desc: 'Crisp 1080p high bitrate' },
                  { id: '4k', label: '4K Ultra HD', badge: 'Cinema 2160p', desc: 'Maximum 4K HDR quality' },
                  { id: '720p', label: '720p HD', badge: 'Data Saver', desc: 'Optimized for slow connections' },
                  { id: 'auto', label: 'Auto / Adaptive', badge: 'HLS Dynamic', desc: 'Dynamically adapts to network' }
                ].map((q) => {
                  const isSelected = settings.defaultQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleQualityChange(q.id as VideoQuality)}
                      className={`flex flex-col justify-between rounded-2xl border p-4.5 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-rose-500/80 bg-rose-500/15 shadow-[0_0_24px_rgba(244,63,94,0.22)] ring-1 ring-rose-500/40 text-white'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] text-zinc-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{q.label}</span>
                          <span
                            className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                                : 'border-white/20 bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <span className={`inline-block text-xs font-semibold ${isSelected ? 'text-rose-300' : 'text-white/70'}`}>
                          {q.badge}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs text-white/70 leading-snug">{q.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: SUBTITLES & AUDIO */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'subtitles') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-white/10 bg-[#060812]/80 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6"
          >
            {/* Section Header */}
            <div className="border-b border-white/10 pb-5">
              <div className="flex items-center gap-2.5 text-rose-500">
                <Subtitles className="h-5 w-5" />
                <h2 className="text-lg font-bold text-white tracking-tight">Subtitle Typography & Engine</h2>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Preview and calibrate subtitle typography, readability contrast, and millisecond audio synchronization.
              </p>
            </div>

            {/* Interactive Cinema Subtitle Preview Frame */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950/90 to-black p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl">
              {/* Cinema Frame Details */}
              <div className="flex items-center justify-between text-xs text-white/55 mb-6">
                <span className="flex items-center gap-1.5 font-semibold text-white/70">
                  <Film className="h-3.5 w-3.5 text-rose-500" />
                  <span>Interactive Cinema Subtitle Preview</span>
                </span>
                <span className="font-mono text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                  Offset: {settings.subtitleOffset > 0 ? `+${settings.subtitleOffset.toFixed(1)}s` : `${settings.subtitleOffset.toFixed(1)}s`}
                </span>
              </div>

              {/* Simulated Screen with Film Glow */}
              <div className="relative min-h-[120px] sm:min-h-[140px] flex items-end justify-center pb-4 rounded-xl border border-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/60 via-black/80 to-black p-4">
                <span
                  className={`inline-block rounded-xl border border-white/10 bg-black/75 px-5 py-2 text-white font-sans transition-all duration-200 shadow-2xl backdrop-blur-md ${
                    settings.subtitleSize === 'small'
                      ? 'text-xs sm:text-sm'
                      : settings.subtitleSize === 'large'
                      ? 'text-base sm:text-lg font-semibold'
                      : 'text-sm sm:text-base font-medium'
                  }`}
                  style={{
                    textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8)'
                  }}
                >
                  "The secret of great cinema is that it's all about rhythm and truth."
                </span>
              </div>

              <div className="mt-3 text-xs text-white/55">
                Rendered with high-legibility Inter typeface and double-pass contrast shielding.
              </div>
            </div>

            {/* Subtitle Size Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Subtitle Text Scale</h3>
                  <p className="text-xs text-white/70">Adjust the font size across fullscreen and windowed viewports.</p>
                </div>
                <span className="text-xs font-semibold text-rose-400 capitalize">
                  {settings.subtitleSize}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['small', 'medium', 'large'] as const).map((size) => {
                  const isSelected = settings.subtitleSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSubtitleSizeChange(size)}
                      className={`flex flex-col items-center justify-center rounded-2xl border py-3 px-4 transition cursor-pointer ${
                        isSelected
                          ? 'border-rose-500/80 bg-rose-500/15 text-white shadow-[0_0_20px_rgba(244,63,94,0.22)] ring-1 ring-rose-500/40'
                          : 'border-white/5 bg-white/[0.02] text-white/70 hover:border-white/15 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold capitalize">{size}</span>
                        {isSelected && <Check className="h-3 w-3 text-rose-400 stroke-[2.5]" />}
                      </div>
                      <span className={`text-xs mt-0.5 ${isSelected ? 'text-rose-200' : 'text-white/55'}`}>
                        {size === 'small' ? 'Compact · 14px' : size === 'medium' ? 'Cinema · 18px' : 'Large · 22px'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtitle Offset Adjustment */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Dialogue Audio Synchronization Offset</h3>
                  <p className="text-xs text-white/70">Shift subtitles forward or backward to fix vocal desync.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                    {settings.subtitleOffset > 0 ? `+${settings.subtitleOffset.toFixed(1)}s` : `${settings.subtitleOffset.toFixed(1)}s`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSubtitleOffsetChange(0)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                    title="Reset to 0.0s"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              {/* Slider bar */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs font-medium text-white/70">
                  <span>Earlier (-5.0s)</span>
                  <span className="text-white/55">In-Sync (0.0s)</span>
                  <span>Later (+5.0s)</span>
                </div>

                <input
                  type="range"
                  min={-5.0}
                  max={5.0}
                  step={0.5}
                  value={settings.subtitleOffset}
                  onChange={(e) => handleSubtitleOffsetChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  aria-label="Subtitle Timing Offset Slider"
                />
              </div>

              {/* Quick Offset Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[-2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSubtitleOffsetChange(val)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition cursor-pointer ${
                      settings.subtitleOffset === val
                        ? 'border-rose-500/60 bg-rose-500/20 text-white font-bold'
                        : 'border-white/5 bg-white/[0.02] text-white/70 hover:border-white/15 hover:text-white'
                    }`}
                  >
                    {val > 0 ? `+${val.toFixed(1)}s` : `${val.toFixed(1)}s`}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 4: STORAGE & CACHE */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'storage') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border border-white/10 bg-[#060812]/80 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6"
          >
            {/* Section Header */}
            <div className="border-b border-white/10 pb-5">
              <div className="flex items-center gap-2.5 text-rose-500">
                <Database className="h-5 w-5" />
                <h2 className="text-lg font-bold text-white tracking-tight">Storage, Memory & Cache Management</h2>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Manage your browser's local cache quota, flush stale thumbnail and stream buffers, and reset preferences.
              </p>
            </div>

            {/* Storage Meter Card */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Browser Local Storage Usage</span>
                <span className="font-mono text-white/70">
                  {storageStats.usedKb} KB of ~5,120 KB ({storageStats.count} cached keys)
                </span>
              </div>

              {/* Meter bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(2, (storageStats.usedKb / 5120) * 100))}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/55">
                <span>Safe Quota (Well within browser limit)</span>
                <span>Auto-LRU cleanup enabled</span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Purge Cache Button Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-white">
                    <Trash2 className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold">Flush Media Cache</h3>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Clears temporary TMDB posters, AniList records, and stale video stream resolver caches. Keeps your watchlist and settings completely safe.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePurgeCache}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Flush Media Cache</span>
                </button>
              </div>

              {/* Factory Reset Button Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-white">
                    <RotateCcw className="h-4 w-4 text-rose-400" />
                    <h3 className="text-sm font-bold">Reset to Default Settings</h3>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Restores HDHub as default server, 1080p resolution, Medium subtitle size, and normal proxy route.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset All Defaults</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Global Floating Auto-Save Notification */}
        <AnimatePresence>
          {savedNotification && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-[#060812]/95 px-5 py-3 text-xs font-semibold text-emerald-300 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{savedNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {confirmResetOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setConfirmResetOpen(false)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-white/10 bg-[#060812] p-6 sm:p-8 shadow-2xl space-y-5"
              >
                <div className="flex items-center gap-3 text-rose-500">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Reset Preferences?</h3>
                    <p className="text-xs text-white/70">Restore default player & server options</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  This will reset your default server, subtitle offset, and quality preferences to factory defaults. Your watchlist and history will remain untouched.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 transition cursor-pointer shadow-lg shadow-rose-600/30"
                  >
                    Yes, Reset Defaults
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsPage;

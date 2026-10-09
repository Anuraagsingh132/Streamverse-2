import React, { useState } from 'react';
import { Settings, Server, Play, Check, Zap, Subtitles, RotateCcw } from 'lucide-react';
import { useUserSettings, VideoServerId, VideoQuality } from '../hooks/useUserSettings';
import { PixelDrainRoute } from '../utils/pixeldrain';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useUserSettings();
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const handleServerChange = (server: VideoServerId) => {
    updateSettings({ defaultServer: server });
    triggerSaved();
  };

  const handleRouteChange = (route: PixelDrainRoute) => {
    updateSettings({ pixelDrainRoute: route });
    triggerSaved();
  };

  const handleAutoplayToggle = () => {
    updateSettings({ autoplayNext: !settings.autoplayNext });
    triggerSaved();
  };

  const handleQualityChange = (quality: VideoQuality) => {
    updateSettings({ defaultQuality: quality });
    triggerSaved();
  };

  const handleSubtitleOffsetChange = (offset: number) => {
    updateSettings({ subtitleOffset: Math.round(offset * 10) / 10 });
    triggerSaved();
  };

  const triggerSaved = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2000);
  };

  const serverOptions: { id: VideoServerId; name: string; badge: string; desc: string }[] = [
    {
      id: 'hdhub',
      name: 'HDHub Direct Stream',
      badge: 'Default · Fastest',
      desc: 'High-speed PixelDrain & Cloudflare direct streams with custom audio and subtitle engines.'
    },
    {
      id: 'pengu',
      name: 'Pengu Cloud',
      badge: 'Direct & HLS',
      desc: 'Pengu cloud streams with native HLS and multi-source mirror fallbacks.'
    },
    {
      id: 'cinemaos',
      name: 'CinemaOS Official',
      badge: 'Embed Player',
      desc: 'CinemaOS official embed player with built-in UI and ad-shielding.'
    },
    {
      id: 'vidsrc',
      name: 'VidSrc Pro',
      badge: 'Mirror 1',
      desc: 'Alternative multi-CDN streaming mirror with high availability.'
    },
    {
      id: 'autoembed',
      name: 'AutoEmbed Cloud',
      badge: 'Mirror 2',
      desc: 'Reliable fallback embed player with automatic resolution scaling.'
    }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-rose-500 font-bold">
          <Settings className="h-6 w-6" />
          <span className="text-xs uppercase tracking-widest">Preferences</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
          Player & App Settings
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Customize default streaming servers, subtitle timing offsets, and playback preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Playback Section */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-rose-500" />
              <h2 className="text-base font-bold text-white">Default Video Server</h2>
            </div>
            <span className="text-xs text-zinc-400">
              Active: <span className="font-semibold text-rose-400 capitalize">{settings.defaultServer}</span>
            </span>
          </div>

          <div className="space-y-3">
            {serverOptions.map((srv) => (
              <label
                key={srv.id}
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  settings.defaultServer === srv.id
                    ? 'border-rose-500/60 bg-rose-500/10'
                    : 'border-white/5 bg-zinc-950/60 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="server"
                  checked={settings.defaultServer === srv.id}
                  onChange={() => handleServerChange(srv.id)}
                  className="mt-1 accent-rose-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{srv.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/10 text-white/70 border border-white/10">
                      {srv.badge}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{srv.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* PixelDrain Route Configuration */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-rose-500" />
              <h2 className="text-base font-bold text-white">PixelDrain Stream Route</h2>
            </div>
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
              Direct Cloud Engine
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Choose how PixelDrain cloud streams are fetched. Toggle between the local application proxy and the direct high-speed CDN mirror.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'normal',
                name: 'Normal (Proxy)',
                badge: 'Recommended for ISP Blocks',
                urlPattern: '/api/pixeldrain/:id',
                desc: 'Proxies video chunks through the application edge proxy to bypass hotlinking and ISP firewall restrictions.'
              },
              {
                id: 'cdn',
                name: 'Fast CDN Mirror',
                badge: 'Direct High-Speed EU CDN',
                urlPattern: '/api/pixeldrain-cdn/:id',
                desc: 'Proxies the high-speed European CDN mirror with ORB & CORS bypass for smooth video playback.'
              }
            ].map((routeOpt) => (
              <label
                key={routeOpt.id}
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition ${
                  settings.pixelDrainRoute === routeOpt.id
                    ? 'border-rose-500/60 bg-rose-500/10'
                    : 'border-white/5 bg-zinc-950/60 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="pixeldrain_route"
                    checked={settings.pixelDrainRoute === routeOpt.id}
                    onChange={() => handleRouteChange(routeOpt.id as PixelDrainRoute)}
                    className="mt-1 accent-rose-600"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{routeOpt.name}</span>
                      <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                        {routeOpt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{routeOpt.desc}</p>
                    <div className="pt-1">
                      <span className="text-[10px] text-zinc-500 font-mono bg-black/40 px-2 py-1 rounded border border-white/5 inline-block">
                        {routeOpt.urlPattern}
                      </span>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Subtitle Preferences */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Subtitles className="h-5 w-5 text-rose-500" />
              <h2 className="text-base font-bold text-white">Subtitle Timing Offset</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-rose-400">
                {settings.subtitleOffset > 0 ? `+${settings.subtitleOffset.toFixed(1)}s` : `${settings.subtitleOffset.toFixed(1)}s`}
              </span>
              <button
                type="button"
                onClick={() => handleSubtitleOffsetChange(0)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-white/10 hover:bg-white/15 text-white/80 transition"
                title="Reset to 0.0s"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Shift subtitle timing forward or backward to fix subtitle desync with dialogue audio.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Earlier (-5.0s)</span>
              <span>In-sync (0.0s)</span>
              <span>Later (+5.0s)</span>
            </div>
            <input
              type="range"
              min={-5.0}
              max={5.0}
              step={0.5}
              value={settings.subtitleOffset}
              onChange={(e) => handleSubtitleOffsetChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              aria-label="Subtitle Timing Offset Slider"
            />
          </div>
        </div>

        {/* Video Behavior */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Play className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Playback Options</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Auto-Play Next Episode</div>
              <div className="text-xs text-zinc-400">Automatically advance to the next TV episode when the current one ends</div>
            </div>
            <button
              type="button"
              onClick={handleAutoplayToggle}
              aria-pressed={settings.autoplayNext}
              aria-label="Toggle Auto-Play Next Episode"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.autoplayNext ? 'bg-rose-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${
                  settings.autoplayNext ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div>
              <div className="text-sm font-semibold text-white">Default Video Quality</div>
              <div className="text-xs text-zinc-400">Target streaming resolution when multiple streams are available</div>
            </div>
            <select
              value={settings.defaultQuality}
              onChange={(e) => handleQualityChange(e.target.value as VideoQuality)}
              className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
              <option value="4k">4K Ultra HD (Beta)</option>
              <option value="auto">Auto / Adaptive</option>
            </select>
          </div>
        </div>

        {/* Reset & Status Footer */}
        <div className="flex items-center justify-between pt-2">
          {savedNotification ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 animate-in fade-in">
              <Check className="h-4 w-4" />
              <span>Preferences automatically synced across all players!</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">Settings save automatically as you adjust them.</span>
          )}

          <button
            type="button"
            onClick={resetSettings}
            className="rounded-xl border border-white/10 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-zinc-700 hover:text-white transition"
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Settings, Server, Play, Check, Zap } from 'lucide-react';
import { getPixelDrainRoute, setPixelDrainRoute, PixelDrainRoute } from '../utils/pixeldrain';

export const SettingsPage: React.FC = () => {
  const [defaultServer, setDefaultServer] = useState<'vidsrc' | 'autoembed' | 'vidsrcxyz'>('vidsrc');
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [defaultQuality, setDefaultQuality] = useState<'1080p' | '720p' | '4k'>('1080p');
  const [pixelDrainRoute, setPixelDrainRouteState] = useState<PixelDrainRoute>('normal');
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  useEffect(() => {
    setPixelDrainRouteState(getPixelDrainRoute());

    try {
      const savedServer = localStorage.getItem('streamverse_default_server');
      if (savedServer && ['vidsrc', 'autoembed', 'vidsrcxyz'].includes(savedServer)) {
        setDefaultServer(savedServer as any);
      }
      const savedAutoplay = localStorage.getItem('streamverse_autoplay');
      if (savedAutoplay !== null) {
        setAutoplayNext(savedAutoplay === 'true');
      }
      const savedQuality = localStorage.getItem('streamverse_quality');
      if (savedQuality && ['1080p', '720p', '4k'].includes(savedQuality)) {
        setDefaultQuality(savedQuality as any);
      }
    } catch {
      // Ignore localStorage access failures
    }
  }, []);

  const handlePixelDrainRouteChange = (newRoute: PixelDrainRoute) => {
    setPixelDrainRouteState(newRoute);
    setPixelDrainRoute(newRoute);
  };

  const saveSettings = () => {
    setPixelDrainRoute(pixelDrainRoute);

    try {
      localStorage.setItem('streamverse_default_server', defaultServer);
      localStorage.setItem('streamverse_autoplay', String(autoplayNext));
      localStorage.setItem('streamverse_quality', defaultQuality);
    } catch {
      // Ignore localStorage access failures
    }

    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
  };

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
          Customize playback servers, subtitle preferences, and display behaviors.
        </p>
      </div>

      <div className="space-y-6">
        {/* Playback Section */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Server className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Streaming Server Priority</h2>
          </div>

          <div className="space-y-3">
            {[
              { id: 'vidsrc', name: 'VidSrc Pro', desc: 'Fastest multi-CDN streaming with multi-language subtitle tracks' },
              { id: 'autoembed', name: 'AutoEmbed Cloud', desc: 'Reliable fallback player with automatic resolution scaling' },
              { id: 'vidsrcxyz', name: 'VidStream Mirrors', desc: 'High-definition 1080p streams with low buffering' },
            ].map((srv) => (
              <label
                key={srv.id}
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  defaultServer === srv.id
                    ? 'border-rose-500/60 bg-rose-500/10'
                    : 'border-white/5 bg-zinc-950/60 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="server"
                  checked={defaultServer === srv.id}
                  onChange={() => setDefaultServer(srv.id as any)}
                  className="mt-1 accent-rose-600"
                />
                <div>
                  <div className="text-sm font-semibold text-white">{srv.name}</div>
                  <div className="text-xs text-zinc-400">{srv.desc}</div>
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
                  pixelDrainRoute === routeOpt.id
                    ? 'border-rose-500/60 bg-rose-500/10'
                    : 'border-white/5 bg-zinc-950/60 hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="pixeldrain_route"
                    checked={pixelDrainRoute === routeOpt.id}
                    onChange={() => handlePixelDrainRouteChange(routeOpt.id as PixelDrainRoute)}
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

        {/* Video Behavior */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Play className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Playback Options</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Auto-Play Next Episode</div>
              <div className="text-xs text-zinc-400">Automatically load the next TV episode when the current one ends</div>
            </div>
            <button
              onClick={() => setAutoplayNext(!autoplayNext)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                autoplayNext ? 'bg-rose-600' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${
                  autoplayNext ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div>
              <div className="text-sm font-semibold text-white">Default Video Quality</div>
              <div className="text-xs text-zinc-400">Target streaming resolution when available</div>
            </div>
            <select
              value={defaultQuality}
              onChange={(e) => setDefaultQuality(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
              <option value="4k">4K Ultra HD (Beta)</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          {savedNotification ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 animate-in fade-in">
              <Check className="h-4 w-4" />
              <span>Settings saved successfully!</span>
            </div>
          ) : (
            <span />
          )}

          <button
            onClick={saveSettings}
            className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Settings, Server, Play, Shield, Globe, Moon, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [defaultServer, setDefaultServer] = useState<'vidsrc' | 'autoembed' | 'vidsrcxyz'>('vidsrc');
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);
  const [defaultQuality, setDefaultQuality] = useState<'1080p' | '720p' | '4k'>('1080p');
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const saveSettings = () => {
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

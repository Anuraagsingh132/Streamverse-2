import React, { useState, useEffect } from 'react';
import { X, Server, Layers, Star, ExternalLink, AlertCircle } from 'lucide-react';
import { MediaItem } from '../types/media';

interface VideoPlayerModalProps {
  item: MediaItem | null;
  initialEpisode?: number;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ item, initialEpisode = 1, onClose }) => {
  const [selectedServer, setSelectedServer] = useState<'vidsrc' | 'autoembed' | 'vidsrcxyz'>('vidsrc');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(initialEpisode || 1);

  useEffect(() => {
    if (initialEpisode) {
      setEpisode(initialEpisode);
    }
  }, [initialEpisode, item?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const isAnime = item.media_type === 'anime';
  const isTV = item.media_type === 'tv' || isAnime;

  // Generate stream URL based on server
  let streamUrl = '';
  if (isAnime) {
    if (selectedServer === 'autoembed') {
      streamUrl = `https://player.autoembed.cc/embed/anime/${item.id}/${episode}`;
    } else {
      streamUrl = `https://vidsrc.to/embed/anime/${item.id}/${episode}`;
    }
  } else if (selectedServer === 'vidsrc') {
    streamUrl = isTV
      ? `https://vidsrc.to/embed/tv/${item.id}/${season}/${episode}`
      : `https://vidsrc.to/embed/movie/${item.id}`;
  } else if (selectedServer === 'autoembed') {
    streamUrl = isTV
      ? `https://player.autoembed.cc/embed/tv/${item.id}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${item.id}`;
  } else {
    streamUrl = isTV
      ? `https://vidsrc.xyz/embed/tv?tmdb=${item.id}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${item.id}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] max-h-[850px] rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-zinc-900/60">
          <div className="flex items-center gap-2 truncate">
            <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {item.media_type}
            </span>
            <h2 className="truncate text-base font-bold text-white">
              {item.title}
              {isTV && <span className="text-zinc-400 font-normal ml-2">S{season} : E{episode}</span>}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player Frame Container */}
        <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
          <iframe
            src={streamUrl}
            title={item.title}
            className="w-full h-full border-0"
            allowFullScreen
            referrerPolicy="origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          />
        </div>

        {/* Bottom Bar: Server and Episode Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 p-3 sm:p-4 bg-zinc-900/90">
          {/* Server Switcher */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-zinc-400">
              <Server className="h-3.5 w-3.5" /> Server:
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'vidsrc', label: 'VidSrc Pro' },
                { id: 'autoembed', label: 'AutoEmbed' },
                { id: 'vidsrcxyz', label: 'VidStream' },
              ].map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => setSelectedServer(srv.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedServer === srv.id
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {srv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Season and Episode Pickers for Series */}
          {isTV && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Layers className="h-3.5 w-3.5" />
                <span>Season:</span>
                <select
                  value={season}
                  onChange={(e) => {
                    setSeason(Number(e.target.value));
                    setEpisode(1);
                  }}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-white border border-white/10 focus:outline-none"
                >
                  {Array.from({ length: item.seasons || 3 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      Season {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Ep:</span>
                <select
                  value={episode}
                  onChange={(e) => setEpisode(Number(e.target.value))}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-white border border-white/10 focus:outline-none"
                >
                  {Array.from({ length: item.episodes || 12 }, (_, i) => i + 1).map((ep) => (
                    <option key={ep} value={ep}>
                      Episode {ep}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

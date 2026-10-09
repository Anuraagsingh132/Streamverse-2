import React, { useState } from 'react';
import { Music, Play, Pause, Volume2 } from 'lucide-react';
import { musicTracksData } from '../data/mediaData';
import { MusicTrack } from '../types/media';

export const MusicPage: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(musicTracksData[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const togglePlay = (track: MusicTrack) => {
    if (currentTrack.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-rose-500 font-bold">
          <Music className="h-6 w-6" />
          <span className="text-xs uppercase tracking-widest">Original Soundtracks</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
          Cinema Soundscapes & OSTs
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Listen to iconic movie and anime opening themes, orchestral compositions, and official scores.
        </p>
      </div>

      {/* Featured Player Showcase */}
      <div className="relative flex flex-col md:flex-row items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl">
        <div className="relative h-48 w-48 sm:h-56 sm:w-56 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/80">
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
              Now Playing · {currentTrack.sourceMedia}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-zinc-400">{currentTrack.artist}</p>
          </div>

          {/* Progress Bar Mock */}
          <div className="space-y-1 max-w-md mx-auto md:mx-0">
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full bg-rose-600 rounded-full transition duration-300 ${
                  isPlaying ? 'w-2/3' : 'w-1/4'
                }`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>{isPlaying ? '1:45' : '0:35'}</span>
              <span>{currentTrack.duration}</span>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <button
              onClick={() => togglePlay(currentTrack)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 hover:bg-rose-500 hover:scale-105 active:scale-95 transition"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Volume2 className="h-4 w-4" />
              <span>Stereo Hi-Fi 320kbps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white">Tracklist</h3>
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-zinc-950/60 overflow-hidden">
          {musicTracksData.map((track, i) => {
            const isThisPlaying = currentTrack.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                onClick={() => togglePlay(track)}
                className="group flex cursor-pointer items-center justify-between p-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-4">
                  <span className="w-4 text-xs font-semibold text-zinc-500">
                    {i + 1}
                  </span>
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div>
                    <div className={`text-sm font-semibold transition ${isThisPlaying ? 'text-rose-500' : 'text-white'}`}>
                      {track.title}
                    </div>
                    <div className="text-xs text-zinc-400">{track.artist} · {track.sourceMedia}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{track.duration}</span>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition">
                    {isThisPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white ml-0.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

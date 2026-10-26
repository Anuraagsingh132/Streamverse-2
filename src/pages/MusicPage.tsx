import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Sparkles
} from 'lucide-react';
import { musicTracksData } from '../data/mediaData';
import { MusicTrack } from '../types/media';
import { SEOHead } from '../components/SEOHead';

export const MusicPage: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const currentTrack = musicTracksData[currentTrackIndex] || musicTracksData[0];

  // Helper to format seconds to mm:ss
  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  // Sync play/pause with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Audio play request failed:', err);
          setIsPlaying(false);
        }
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  // Volume & mute sync
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Toggle play/pause for selected track
  const togglePlayTrack = (track: MusicTrack, index: number) => {
    if (currentTrack.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  // Next / Previous track
  const handleNextTrack = useCallback(() => {
    if (isShuffling) {
      const nextIdx = Math.floor(Math.random() * musicTracksData.length);
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % musicTracksData.length);
    }
    setCurrentTime(0);
    setIsPlaying(true);
  }, [isShuffling]);

  const handlePrevTrack = useCallback(() => {
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setCurrentTrackIndex((prev) => (prev - 1 + musicTracksData.length) % musicTracksData.length);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [currentTime]);

  // Scrubber seek handler
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = scrubberRef.current?.getBoundingClientRect();
    if (!rect || !duration || duration <= 0) return;
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 lg:pt-28 pb-16 space-y-8">
      <SEOHead
        title="Cinema Soundscapes & OSTs"
        description="Listen to iconic film soundtracks, anime opening themes, and orchestral motion picture scores on StreamVerse."
      />

      {/* Hidden Native HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        preload="metadata"
        loop={isLooping}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          if (!isLooping) {
            handleNextTrack();
          }
        }}
      />

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
          Listen to iconic movie and anime themes, orchestral compositions, and official scores with integrated HTML5 audio playback.
        </p>
      </div>

      {/* Featured Player Showcase */}
      <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-8 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl">
        {/* Cover Art with Live Equalizer Animation */}
        <div className="relative h-48 w-48 sm:h-56 sm:w-56 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/80 border border-white/10">
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className={`h-full w-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl hover:scale-110 active:scale-95 transition"
              aria-label={isPlaying ? 'Pause track' : 'Play track'}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-white ml-0.5" />}
            </button>
          </div>

          {isPlaying && (
            <div className="absolute bottom-2.5 right-2.5 flex items-end gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
              <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDuration: '600ms' }} />
              <span className="w-1 h-5 bg-rose-400 rounded-full animate-bounce" style={{ animationDuration: '400ms' }} />
              <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDuration: '800ms' }} />
            </div>
          )}
        </div>

        {/* Player Controls & Info */}
        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
                Now Playing · {currentTrack.sourceMedia}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                <Sparkles className="h-2.5 w-2.5" />
                Hi-Fi
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-zinc-400">{currentTrack.artist}</p>
          </div>

          {/* Interactive Progress Bar & Seek Scrubber */}
          <div className="space-y-1.5 max-w-lg mx-auto md:mx-0">
            <div
              ref={scrubberRef}
              onClick={handleScrubberClick}
              role="slider"
              tabIndex={0}
              aria-label="Seek time"
              aria-valuemin={0}
              aria-valuemax={duration || 100}
              aria-valuenow={currentTime}
              className="relative h-2 w-full rounded-full bg-zinc-800 cursor-pointer group py-1"
            >
              <div className="h-full w-full rounded-full overflow-hidden bg-zinc-800">
                <div
                  className="h-full bg-rose-600 rounded-full transition-all duration-100 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {/* Draggable thumb indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${progressPercent}% - 7px)` }}
              />
            </div>

            <div className="flex justify-between text-xs text-zinc-500 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : currentTrack.duration}</span>
            </div>
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center justify-center md:justify-start gap-3 sm:gap-5 pt-1">
            {/* Shuffle */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => setIsShuffling(!isShuffling)}
              className={`p-2 rounded-full transition cursor-pointer ${isShuffling ? 'text-rose-400 bg-rose-500/20' : 'text-zinc-400 hover:text-white'}`}
              title="Shuffle Playlist"
              aria-label="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </motion.button>

            {/* Previous */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={handlePrevTrack}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Previous Track"
              aria-label="Previous Track"
            >
              <SkipBack className="h-5 w-5" />
            </motion.button>

            {/* Play/Pause Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 hover:bg-rose-500 transition cursor-pointer"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
            </motion.button>

            {/* Next */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={handleNextTrack}
              className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Next Track"
              aria-label="Next Track"
            >
              <SkipForward className="h-5 w-5" />
            </motion.button>

            {/* Repeat */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-full transition cursor-pointer ${isLooping ? 'text-rose-400 bg-rose-500/20' : 'text-zinc-400 hover:text-white'}`}
              title="Repeat Single Track"
              aria-label="Repeat Track"
            >
              <Repeat className="h-4 w-4" />
            </motion.button>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/10">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="text-zinc-400 hover:text-white transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-20 accent-rose-500 cursor-pointer h-1.5 rounded-lg bg-zinc-800"
                aria-label="Volume slider"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Curated OST Tracklist</h3>
          <span className="text-xs text-zinc-400">{musicTracksData.length} Tracks</span>
        </div>

        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-zinc-950/60 overflow-hidden">
          {musicTracksData.map((track, i) => {
            const isThisCurrent = currentTrack.id === track.id;
            const isThisPlaying = isThisCurrent && isPlaying;

            return (
              <div
                key={track.id}
                onClick={() => togglePlayTrack(track, i)}
                className={`group flex cursor-pointer items-center justify-between p-4 transition-colors ${
                  isThisCurrent ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="w-5 text-center text-xs font-semibold text-zinc-500 group-hover:text-white transition">
                    {isThisPlaying ? (
                      <span className="flex items-center justify-center gap-0.5">
                        <span className="w-0.5 h-3 bg-rose-500 animate-pulse" />
                        <span className="w-0.5 h-4 bg-rose-400 animate-pulse" />
                      </span>
                    ) : (
                      i + 1
                    )}
                  </span>

                  <img
                    src={track.cover}
                    alt={track.title}
                    className="h-11 w-11 rounded-lg object-cover shrink-0 border border-white/10"
                  />

                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold truncate transition ${isThisCurrent ? 'text-rose-400 font-bold' : 'text-white'}`}>
                      {track.title}
                    </div>
                    <div className="text-xs text-zinc-400 truncate mt-0.5">
                      {track.artist} · <span className="text-zinc-500">{track.sourceMedia}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400 shrink-0">
                  <span className="font-mono">{track.duration}</span>
                  <button
                    type="button"
                    aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    title={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-95 ${
                      isThisPlaying
                        ? 'bg-rose-600 text-white opacity-100'
                        : 'bg-zinc-800 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600'
                    }`}
                  >
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

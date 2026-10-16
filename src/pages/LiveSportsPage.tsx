import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Users,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ExternalLink,
  X,
  Info,
  Server,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { liveSportsData } from '../data/mediaData';
import { LiveSport } from '../types/media';
import { SEOHead } from '../components/SEOHead';
import { modalBackdropVariants, modalContentVariants } from '../utils/motion';

// Genuine high-reliability public video streams for sports broadcast demo playback
const DEMO_STREAM_URLS = {
  primary: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  backup: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
};

export const LiveSportsPage: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState<LiveSport | null>(null);
  const [category, setCategory] = useState<string>('All');
  const [streamSource, setStreamSource] = useState<'primary' | 'backup'>('primary');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'broadcast' | 'stats'>('broadcast');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const categories = ['All', 'Football', 'Basketball', 'Motorsport', 'Fighting'];

  const filteredSports = category === 'All'
    ? liveSportsData
    : liveSportsData.filter((s) => s.category === category);

  // Sync video play/pause & mute
  useEffect(() => {
    if (selectedSport && videoRef.current) {
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [selectedSport, isPlaying, isMuted, streamSource]);

  // Handle escape key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSport) {
        setSelectedSport(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSport]);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 lg:pt-28 pb-16 space-y-8">
      <SEOHead
        title="Live Sports & Broadcasts (Demo Showcase)"
        description="Stream live football matches, NBA games, Formula 1 Grand Prix races, and combat sports events on Streamverse."
      />

      {/* Header with Demo Badge */}
      <div className="border-b border-white/10 pb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-rose-500 font-bold">
            <Radio className="h-5 w-5 animate-pulse" />
            <span className="text-xs uppercase tracking-widest">Live Broadcasts</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <Info className="h-3 w-3" />
            Interactive Demo Preview
          </span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Streamverse Live Sports
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Live satellite relays, telemetry trackers, and event match-ups. Matches are badged as interactive demo streams with functional media playback.
          </p>
        </div>

        {/* Demo Disclaimer Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3.5 text-xs text-zinc-400">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Note:</strong> Full linear television feeds require genuine broadcast network authorization. This preview showcases our ultra-low latency player pipeline with live telemetry and stream failover.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Sports categories">
        {categories.map((c) => {
          const isSelected = category === c;
          return (
            <motion.button
              key={c}
              role="tab"
              aria-selected={isSelected}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => setCategory(c)}
              className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? 'text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="sports-category-pill"
                  className="absolute inset-0 rounded-full bg-rose-600 shadow-md shadow-rose-600/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{c}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Sports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSports.map((sport) => (
          <div
            key={sport.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-5 hover:border-rose-500/40 transition hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-red-600/20 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/30">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                {sport.time}
              </span>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Users className="h-3.5 w-3.5" />
                <span>{sport.viewers} watching</span>
              </div>
            </div>

            <div className="my-6 space-y-1">
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {sport.tournament}
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-rose-400 transition">
                {sport.homeTeam} <span className="text-zinc-500 font-normal">vs</span> {sport.awayTeam}
              </h3>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => {
                setSelectedSport(sport);
                setIsPlaying(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              Watch Live Stream (Demo)
            </motion.button>
          </div>
        ))}
      </div>

      {/* Live Stream Dialog */}
      <AnimatePresence>
        {selectedSport && (
          <motion.div
            key="sports-stream-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedSport.title} Live Stream`}
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md"
          >
            <motion.div
              variants={modalContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-4xl rounded-2xl bg-zinc-950 border border-white/15 overflow-hidden shadow-2xl flex flex-col"
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-zinc-900/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-sm font-bold text-white truncate">
                  {selectedSport.title}
                </h3>
                <span className="rounded bg-rose-600/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase border border-rose-500/30 hidden sm:inline-block">
                  Live
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSport(null)}
                  className="rounded-lg bg-zinc-800 p-1.5 text-white/70 hover:text-white hover:bg-zinc-700 transition"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Functional Video Player Viewport */}
            <div
              ref={playerContainerRef}
              className="relative aspect-video w-full bg-black overflow-hidden group select-none"
            >
              <video
                ref={videoRef}
                src={DEMO_STREAM_URLS[streamSource]}
                playsInline
                loop
                autoPlay
                muted={isMuted}
                className="w-full h-full object-contain"
              />

              {/* Watermark / Score Overlay */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs text-white">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold">{selectedSport.homeTeam} 2 - 1 {selectedSport.awayTeam}</span>
                <span className="text-white/40">|</span>
                <span className="text-white/70 text-[11px] font-medium">{selectedSport.time}</span>
              </div>

              {/* Stream Telemetry Pill */}
              <div className="absolute top-3 right-3 z-20 hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-zinc-300">
                <Activity className="h-3 w-3 text-emerald-400" />
                <span>1080p60 · 6.2 Mbps · 1.1s Latency</span>
              </div>

              {/* Bottom Video Controls Overlay */}
              <div className="absolute inset-x-0 bottom-0 z-20 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between opacity-95 transition-opacity">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition active:scale-95"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition active:scale-95"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>

                  <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider hidden sm:inline-block">
                    ● Live Broadcast
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStreamSource(streamSource === 'primary' ? 'backup' : 'primary')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium text-white transition"
                    title="Switch Relay Stream"
                  >
                    <Server className="h-3 w-3 text-primary" />
                    <span>{streamSource === 'primary' ? 'Relay EU' : 'Relay US'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition active:scale-95"
                    aria-label="Toggle Fullscreen"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Meta & Tabs */}
            <div className="p-4 bg-zinc-900/60 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('broadcast')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      activeTab === 'broadcast'
                        ? 'bg-white/15 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Broadcast Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stats')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      activeTab === 'stats'
                        ? 'bg-white/15 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Match Telemetry
                  </button>
                </div>

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedSport.title + ' live highlights')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition"
                >
                  <span>Official Highlights on YouTube</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {activeTab === 'broadcast' ? (
                <div className="text-xs text-zinc-400 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Connected to Streamverse Live Edge Relay. High definition streaming feed running on <strong>{streamSource === 'primary' ? 'Frankfurt AWS (Primary)' : 'Virginia Cloudflare (Backup)'}</strong> with automatic bitrate adaptation.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Possession</span>
                    <p className="text-sm font-bold text-white mt-0.5">58% - 42%</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Shots on Target</span>
                    <p className="text-sm font-bold text-white mt-0.5">7 - 4</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Fouls</span>
                    <p className="text-sm font-bold text-white mt-0.5">9 - 11</p>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Corners</span>
                    <p className="text-sm font-bold text-white mt-0.5">5 - 3</p>
                  </div>
                </div>
              )}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

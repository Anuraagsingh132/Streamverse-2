import React, { useState } from 'react';
import { Radio, Users, Trophy, Play } from 'lucide-react';
import { liveSportsData } from '../data/mediaData';
import { LiveSport } from '../types/media';

export const LiveSportsPage: React.FC = () => {
  const [selectedSport, setSelectedSport] = useState<LiveSport | null>(null);
  const [category, setCategory] = useState<string>('All');

  const categories = ['All', 'Football', 'Basketball', 'Motorsport', 'Fighting'];

  const filteredSports = category === 'All'
    ? liveSportsData
    : liveSportsData.filter((s) => s.category === category);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-rose-500 font-bold">
          <Radio className="h-6 w-6 animate-pulse" />
          <span className="text-xs uppercase tracking-widest">Live Broadcasts</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
          Streamverse Live Sports
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Stream live football matches, NBA games, Formula 1 Grand Prix races, and combat sports.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              category === c
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            {c}
          </button>
        ))}
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

            <button
              onClick={() => setSelectedSport(sport)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition"
            >
              <Play className="h-4 w-4 fill-white" />
              Watch Live Stream
            </button>
          </div>
        ))}
      </div>

      {/* Live Stream Dialog */}
      {selectedSport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/80">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-sm font-bold text-white">
                  {selectedSport.title} - LIVE
                </h3>
              </div>
              <button
                onClick={() => setSelectedSport(null)}
                className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
            <div className="aspect-video w-full bg-black flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Trophy className="h-16 w-16 text-rose-500" />
              <div className="text-lg font-bold text-white">
                Live Broadcast Feed Connected
              </div>
              <p className="text-xs text-zinc-400 max-w-md">
                Stream audio/video feed initialized from high-speed relay server. Enjoy the match in 1080p HD.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

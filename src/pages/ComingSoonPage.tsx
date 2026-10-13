import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  Tv2,
  Radio,
  History,
  Bookmark,
  Music,
  Sparkles,
  Bell,
  Check,
  ArrowLeft,
  Film,
  House,
  Clock,
  Layers,
  Zap,
  ShieldCheck,
  Trophy,
  Headphones,
  Search,
  Star,
  Activity,
  Smartphone,
  Users,
  Volume2,
  MessageSquare
} from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import { getRouteHref } from '../utils/routeUtils';

export interface ComingSoonPageProps {
  feature?: 'discover' | 'providers' | 'sports' | 'continue-watching' | 'watchlist' | 'music' | 'ai' | string;
  onNavigate?: (route: string) => void;
}

interface HighlightItem {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface FeatureMetadata {
  key: string;
  badge: string;
  title: string;
  subtitle: string;
  seoDescription: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  glowGradient: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  iconColor: string;
  progressPercent: number;
  eta: string;
  highlights: HighlightItem[];
}

const FEATURE_CONFIGS: Record<string, FeatureMetadata> = {
  discover: {
    key: 'discover',
    badge: 'Curated Engine · Coming Soon',
    title: 'Advanced Content Discovery',
    subtitle:
      'We are engineering an intelligent exploratory engine to help you unearth hidden cinematic treasures, multi-filter across decades, subgenres, and curated mood playlists.',
    seoDescription: 'Discover cinematic masterpieces, hidden gems, and curated genres on Streamverse.',
    icon: Compass,
    accentColor: '#06b6d4',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(6, 182, 212, 0.18), transparent 70%)',
    badgeBorder: 'border-cyan-500/30',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-300',
    iconColor: 'text-cyan-400',
    progressPercent: 82,
    eta: 'Beta Launching Soon',
    highlights: [
      {
        title: 'Deep Sub-Genre Filters',
        desc: 'Filter by cyber-noir, slow-cinema, space opera, indie psychological, and niche categories.',
        icon: Layers
      },
      {
        title: 'Mood & Aesthetic Browsing',
        desc: 'Explore cinema by color palette, pacing, emotional resonance, and soundtrack ambiance.',
        icon: Sparkles
      },
      {
        title: 'Decade & Box-Office Eras',
        desc: 'Journey through the 1960s French New Wave to 2000s cult indies and modern festival darlings.',
        icon: Clock
      },
      {
        title: 'Personalized Taste Radar',
        desc: 'Dynamic similarity matrix calculating director, cinematographer, and thematic crossovers.',
        icon: Star
      }
    ]
  },
  providers: {
    key: 'providers',
    badge: 'Network Aggregator · Coming Soon',
    title: 'Streaming Networks Hub',
    subtitle:
      'Unified network portals for Netflix, HBO Max, Apple TV+, Disney+, Amazon Prime Video, Hulu, and Paramount+ with real-time library synchronization.',
    seoDescription: 'Explore movies and TV series curated by streaming platforms and global networks on Streamverse.',
    icon: Tv2,
    accentColor: '#f59e0b',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.18), transparent 70%)',
    badgeBorder: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-300',
    iconColor: 'text-amber-400',
    progressPercent: 88,
    eta: 'Beta Launching Soon',
    highlights: [
      {
        title: '40+ Worldwide Networks',
        desc: 'Direct portals into catalogs from top international studios, cable networks, and streamers.',
        icon: Tv2
      },
      {
        title: 'Originals & Exclusives Filter',
        desc: 'Instantly surface flagship network exclusives without needing multiple subscriptions.',
        icon: Star
      },
      {
        title: 'Live Catalogue Sync',
        desc: 'Real-time updates as movies and shows rotate onto networks each month.',
        icon: Clock
      },
      {
        title: 'Studio & Franchise Hubs',
        desc: 'Curated spaces for A24, HBO Originals, Marvel, BBC Earth, Criterion, and Studio Ghibli.',
        icon: Film
      }
    ]
  },
  sports: {
    key: 'sports',
    badge: 'Live Stadium Feeds · Coming Soon',
    title: 'Live Sports Broadcasts',
    subtitle:
      'Real-time HD stadium broadcasts covering Champions League, Premier League, NBA, Formula 1, UFC, and Grand Slams with adaptive low-latency streaming.',
    seoDescription: 'Watch live HD sports broadcasts, match schedules, and stadium streams on Streamverse.',
    icon: Radio,
    accentColor: '#10b981',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.18), transparent 70%)',
    badgeBorder: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-300',
    iconColor: 'text-emerald-400',
    progressPercent: 78,
    eta: 'In Active Development',
    highlights: [
      {
        title: 'Ultra HD 60FPS Feeds',
        desc: 'Silky smooth high-framerate stadium feeds with adaptive multi-server redundancy.',
        icon: Trophy
      },
      {
        title: 'Live Box Scores & Stats',
        desc: 'Real-time possession, scoring alerts, live player ratings, and interactive team lineups.',
        icon: Activity
      },
      {
        title: 'Multi-Track Audio',
        desc: 'Seamlessly toggle between domestic commentary, international commentary, and pure stadium ambient sound.',
        icon: Headphones
      },
      {
        title: 'Instant Replays & Highlights',
        desc: 'Jump back to pivotal goals, buzzer beaters, and knockout finishes with scrubable markers.',
        icon: History
      }
    ]
  },
  'continue-watching': {
    key: 'continue-watching',
    badge: 'Seamless Playback Sync · Coming Soon',
    title: 'Cloud Continue Watching',
    subtitle:
      'Synchronize your exact playback timestamps across all your devices seamlessly. Pick up the exact second where you left off on desktop, mobile, tablet, or TV.',
    seoDescription: 'Resume your favorite movies and series across all your devices with Streamverse Continue Watching.',
    icon: History,
    accentColor: '#0ea5e9',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(14, 165, 233, 0.18), transparent 70%)',
    badgeBorder: 'border-sky-500/30',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-300',
    iconColor: 'text-sky-400',
    progressPercent: 90,
    eta: 'Beta Launching Soon',
    highlights: [
      {
        title: 'Millisecond Timestamp Resume',
        desc: 'Never lose your spot or scramble to remember what episode you were watching.',
        icon: Clock
      },
      {
        title: 'Cross-Device Cloud Sync',
        desc: 'Seamlessly transition from your phone on the train to your TV at home with zero friction.',
        icon: Smartphone
      },
      {
        title: 'Smart Episode Auto-Advance',
        desc: 'Automatically queues up the next unwatched episode with progress markers.',
        icon: Film
      },
      {
        title: 'Hover Scrubbing Previews',
        desc: 'Interactive thumbnail scrubbing right from your home feed without opening the player.',
        icon: Sparkles
      }
    ]
  },
  watchlist: {
    key: 'watchlist',
    badge: 'Cloud Collections · Coming Soon',
    title: 'Cloud Watchlist & Custom Lists',
    subtitle:
      'Create unlimited custom collections, collaborate with friends on shared watch parties, and get notified when your anticipated releases drop.',
    seoDescription: 'Save and organize your favorite movies, series, and anime with custom lists on Streamverse.',
    icon: Bookmark,
    accentColor: '#f43f5e',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(244, 63, 94, 0.18), transparent 70%)',
    badgeBorder: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-300',
    iconColor: 'text-rose-400',
    progressPercent: 86,
    eta: 'Beta Launching Soon',
    highlights: [
      {
        title: 'Unlimited Custom Folders',
        desc: 'Organize your backlog into custom marathons, spooky season picks, or weekend queues.',
        icon: Bookmark
      },
      {
        title: 'Release Countdown Alerts',
        desc: 'Instant countdowns and notifications when upcoming movies and seasons hit digital streams.',
        icon: Bell
      },
      {
        title: 'Collaborative Watch Parties',
        desc: 'Share links with friends and vote on what to watch during group movie nights.',
        icon: Users
      },
      {
        title: 'Trakt & Letterboxd Sync',
        desc: 'One-click two-way import and export with your Letterboxd and Trakt profiles.',
        icon: ShieldCheck
      }
    ]
  },
  music: {
    key: 'music',
    badge: 'Lossless Audio Engine · Coming Soon',
    title: 'Soundtracks & OST Player',
    subtitle:
      'Stream official cinema soundtracks, anime openings, and orchestral scores in lossless FLAC audio with synchronized lyrics, album art, and background playback.',
    seoDescription: 'Stream cinematic soundtracks, orchestral scores, and anime OSTs in lossless audio on Streamverse.',
    icon: Music,
    accentColor: '#d946ef',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(217, 70, 239, 0.18), transparent 70%)',
    badgeBorder: 'border-fuchsia-500/30',
    badgeBg: 'bg-fuchsia-500/10',
    badgeText: 'text-fuchsia-300',
    iconColor: 'text-fuchsia-400',
    progressPercent: 75,
    eta: 'In Active Development',
    highlights: [
      {
        title: '24-bit Lossless Audio',
        desc: 'Studio-master FLAC fidelity engineered for orchestral richness and deep sub-bass.',
        icon: Headphones
      },
      {
        title: 'Anime Openings & Themes',
        desc: 'Complete curated collection of full Japanese OST tracks, character songs, and themes.',
        icon: Music
      },
      {
        title: 'Synchronized Lyrics & Artwork',
        desc: 'Time-aligned lyric scrolls and high-resolution vinyl artwork for every track.',
        icon: Sparkles
      },
      {
        title: 'Background Minibar Player',
        desc: 'Listen to your favorite film scores in the background while exploring titles.',
        icon: Volume2
      }
    ]
  },
  ai: {
    key: 'ai',
    badge: 'Neural Discovery · Coming Soon',
    title: 'AI Natural Language Search',
    subtitle:
      'Next-generation cinematic AI assistant. Search by feeling, dialogue memory, atmospheric mood, or complex plot queries like "rainy 90s thriller with saxophone soundtrack".',
    seoDescription: 'Search movies and TV shows using natural language and semantic AI on Streamverse.',
    icon: Sparkles,
    accentColor: '#8b5cf6',
    glowGradient: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.18), transparent 70%)',
    badgeBorder: 'border-violet-500/30',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-300',
    iconColor: 'text-violet-400',
    progressPercent: 92,
    eta: 'Public Beta Coming Soon',
    highlights: [
      {
        title: 'Natural Language Queries',
        desc: 'Describe vague memories, specific scene tropes, or feelings in plain English.',
        icon: Search
      },
      {
        title: 'Cinematography & Vibe Search',
        desc: 'Surface titles by visual style, neon lighting, grain texture, or pacing tempo.',
        icon: Sparkles
      },
      {
        title: 'Thematic Character Arcs',
        desc: 'Find stories matching specific character dynamics, morally gray villains, and twists.',
        icon: Layers
      },
      {
        title: 'Interactive Movie Buff',
        desc: 'Chat with an AI cinema historian for personalized double features and deep trivia.',
        icon: MessageSquare
      }
    ]
  }
};

const DEFAULT_METADATA: FeatureMetadata = {
  key: 'general',
  badge: 'Exciting Update · Coming Soon',
  title: 'Feature Coming Soon',
  subtitle:
    'This module is actively being engineered to deliver the best cinematic streaming experience. Check back soon for launch announcements!',
  seoDescription: 'This feature is coming soon to Streamverse.',
  icon: Clock,
  accentColor: '#e11d48',
  glowGradient: 'radial-gradient(circle at 50% 30%, rgba(225, 29, 72, 0.18), transparent 70%)',
  badgeBorder: 'border-rose-500/30',
  badgeBg: 'bg-rose-500/10',
  badgeText: 'text-rose-300',
  iconColor: 'text-rose-400',
  progressPercent: 85,
  eta: 'In Active Development',
  highlights: [
    {
      title: 'High-Performance Engine',
      desc: 'Optimized with modern caching and low-latency delivery protocols.',
      icon: Zap
    },
    {
      title: 'Glassmorphic Cinema Design',
      desc: 'Handcrafted responsive UI designed for immersive late-night viewing.',
      icon: Sparkles
    },
    {
      title: 'Seamless Cross-Platform Sync',
      desc: 'Unified state across phones, tablets, and full-screen desktop screens.',
      icon: ShieldCheck
    },
    {
      title: 'Zero Bloatware',
      desc: 'Instant interactions with lightweight zero-friction navigation.',
      icon: Clock
    }
  ]
};

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ feature, onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve feature key from prop or current pathname
  const activeFeatureKey = useMemo(() => {
    if (feature && FEATURE_CONFIGS[feature]) return feature;
    const path = location.pathname.toLowerCase();
    if (path.includes('music')) return 'music';
    if (path.includes('sports') || path.includes('livesports')) return 'sports';
    if (path.includes('provider')) return 'providers';
    if (path.includes('continue')) return 'continue-watching';
    if (path.includes('watchlist')) return 'watchlist';
    if (path.includes('discover')) return 'discover';
    if (path.includes('ai') || path.includes('search')) return 'ai';
    return 'general';
  }, [feature, location.pathname]);

  const meta = FEATURE_CONFIGS[activeFeatureKey] || DEFAULT_METADATA;
  const FeatureIcon = meta.icon;

  // Local notification subscription state
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('streamverse_coming_soon_alerts');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.includes(meta.key);
      }
    } catch {
      // Fallback
    }
    return false;
  });

  const [notificationToast, setNotificationToast] = useState<boolean>(false);

  // Sync state if active feature changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem('streamverse_coming_soon_alerts');
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsSubscribed(Array.isArray(parsed) && parsed.includes(meta.key));
      } else {
        setIsSubscribed(false);
      }
    } catch {
      setIsSubscribed(false);
    }
  }, [meta.key]);

  const handleToggleNotify = () => {
    const nextState = !isSubscribed;
    setIsSubscribed(nextState);
    try {
      const stored = localStorage.getItem('streamverse_coming_soon_alerts');
      let parsed: string[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) parsed = [];

      if (nextState) {
        if (!parsed.includes(meta.key)) parsed.push(meta.key);
        setNotificationToast(true);
        setTimeout(() => setNotificationToast(false), 3000);
      } else {
        parsed = parsed.filter((k) => k !== meta.key);
      }
      localStorage.setItem('streamverse_coming_soon_alerts', JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to save notification preference:', e);
    }
  };

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      navigate('/');
    }
  };

  const handleExploreMovies = () => {
    if (onNavigate) {
      onNavigate('movie');
    } else {
      navigate('/movies');
    }
  };

  return (
    <div className="relative min-h-[85vh] overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 pb-20">
      <SEOHead title={`${meta.title} | Streamverse`} description={meta.seoDescription} />

      {/* Atmospheric Ambient Glow Backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-700"
        style={{ background: meta.glowGradient }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-4xl">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleGoHome}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </button>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Roadmap 2026
          </span>
        </div>

        {/* Hero Card Container */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#060812]/80 p-6 sm:p-10 lg:p-12 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          {/* Subtle Top Accent Glow Line */}
          <div
            className="absolute inset-x-0 top-0 h-1 transition-colors duration-500"
            style={{
              background: `linear-gradient(90deg, transparent, ${meta.accentColor}, transparent)`
            }}
          />

          <div className="mx-auto max-w-2xl text-center">
            {/* Feature Icon + Badge */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex flex-col items-center gap-3"
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/5 shadow-inner backdrop-blur-xl"
                style={{
                  boxShadow: `0 8px 32px ${meta.accentColor}25`
                }}
              >
                <FeatureIcon className={`h-8 w-8 ${meta.iconColor}`} />
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide ${meta.badgeBorder} ${meta.badgeBg} ${meta.badgeText}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <span>{meta.badge}</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance] max-w-xl mx-auto"
            >
              {meta.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.14, duration: 0.3 }}
              className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base sm:leading-relaxed"
            >
              {meta.subtitle}
            </motion.p>

            {/* Progress / Development Status Bar */}
            <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left">
              <div className="flex items-center justify-between text-xs font-medium text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Engineering Status: <span className="text-white font-semibold">{meta.eta}</span>
                </span>
                <span className="font-mono text-white/90">{meta.progressPercent}% Completed</span>
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${meta.progressPercent}%` }}
                  transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full transition-all"
                  style={{
                    background: `linear-gradient(90deg, ${meta.accentColor}bb, ${meta.accentColor})`
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Notify Me Button */}
              <button
                type="button"
                onClick={handleToggleNotify}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold transition shadow-lg cursor-pointer ${
                  isSubscribed
                    ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-white text-black hover:bg-white/90 hover:scale-[1.02]'
                }`}
              >
                {isSubscribed ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>On Early Access List</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    <span>Notify Me When Live</span>
                  </>
                )}
              </button>

              {/* Contextual Secondary Button */}
              <button
                type="button"
                onClick={handleExploreMovies}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-white hover:bg-white/10 hover:border-white/20 transition cursor-pointer"
              >
                {meta.key === 'music' || meta.key === 'sports' ? (
                  <>
                    <House className="h-4 w-4 text-white/70" />
                    <span>Browse Home</span>
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4 text-white/70" />
                    <span>Explore Trending Movies</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback Toast */}
            <AnimatePresence>
              {notificationToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300"
                >
                  <Check className="h-4 w-4" />
                  <span>You're on the early access priority list!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Highlights / Features Grid */}
          <div className="mt-12 border-t border-white/10 pt-8 sm:pt-10">
            <h2 className="text-center text-xs font-bold uppercase tracking-widest text-white/50 mb-6">
              What to Expect on Launch
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {meta.highlights.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
                    className="group flex items-start gap-3.5 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 group-hover:text-white transition">
                      <ItemIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white group-hover:text-white transition">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-white/60">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Helpful Navigation Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-white/50">
          <span>Looking for something to watch right now?</span>
          <button
            type="button"
            onClick={handleExploreMovies}
            className="font-semibold text-white/80 underline decoration-white/20 underline-offset-4 hover:text-white transition cursor-pointer"
          >
            Explore Popular Titles →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;

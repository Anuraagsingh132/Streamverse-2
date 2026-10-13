import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Sparkles,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Film,
  Server
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { fetchHDHubStreams, HDHubStream } from '../services/hdhub';
import { fetchPenguStreams } from '../services/pengu';
import {
  getPixelDrainRoute,
  setPixelDrainRoute,
  PixelDrainRoute,
  extractPixelDrainId,
  formatPixelDrainUrl,
  PIXELDRAIN_CHANGE_EVENT
} from '../utils/pixeldrain';
import { useUserSettings } from '../hooks/useUserSettings';
import { usePlayerShortcuts } from './player/usePlayerShortcuts';
import { useScrubberDrag } from './player/useScrubberDrag';
import { useHlsPlayback } from './player/useHlsPlayback';
import { useSubtitlePipeline } from './player/useSubtitlePipeline';
import { PlayerTopBar } from './player/PlayerTopBar';
import { PlayerBottomBar } from './player/PlayerBottomBar';
import { PlayerErrorModal } from './player/PlayerErrorModal';
import { AudioOptionItem } from './player/PlayerSettingsModal';
import { savePlaybackRecord, removePlaybackRecord } from '../store/useContinueWatchingStore';

export interface HDHubPlayerProps {
  item: MediaItem;
  season?: number;
  episode?: number;
  totalEpisodes?: number;
  totalSeasons?: number;
  onClose: () => void;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onOpenEpisodeDrawer?: () => void;
  isEpisodeDrawerOpen?: boolean;
  onSwitchServer?: (serverId: string) => void;
  currentServerId?: string;
  serversList?: { id: string; name: string; badge?: string; description?: string }[];
}

export const HDHubPlayer: React.FC<HDHubPlayerProps> = ({
  item,
  season = 1,
  episode = 1,
  totalEpisodes = 24,
  onClose,
  onPrevEpisode,
  onNextEpisode,
  onOpenEpisodeDrawer,
  isEpisodeDrawerOpen = false,
  onSwitchServer,
  currentServerId = 'hdhub',
  serversList = []
}) => {
  // Streams resolution state
  const [loading, setLoading] = useState<boolean>(true);
  const [streams, setStreams] = useState<HDHubStream[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(0);

  // Popover menus state
  const [isQualityDropdownOpen, setIsQualityDropdownOpen] = useState<boolean>(false);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState<boolean>(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'quality' | 'aspect' | 'audio' | 'subtitles' | 'pixeldrain'>('main');
  const [pixelDrainRoute, setPixelDrainRouteState] = useState<PixelDrainRoute>(getPixelDrainRoute);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('streamverse_player_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('streamverse_player_volume');
      return saved ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.85;
    } catch {
      return 0.85;
    }
  });
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [objectFit, setObjectFit] = useState<'contain' | 'cover'>('contain');
  const [copied, setCopied] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Audio state
  const [selectedAudioLang, setSelectedAudioLang] = useState<string>('default');

  // Scrubber element ref & Video ref
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualityDropdownRef = useRef<HTMLDivElement | null>(null);
  const serverDropdownRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const lastTapTimeRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User settings
  const { settings, updateSettings } = useUserSettings();
  const subtitleOffset = settings.subtitleOffset;
  const subtitleSize = settings.subtitleSize || 'medium';
  const subtitleFontSize = useMemo(() => {
    switch (subtitleSize) {
      case 'small':
        return 'clamp(1.1rem, 2.0vw, 1.6rem)';
      case 'large':
        return 'clamp(1.65rem, 3.2vw, 2.75rem)';
      case 'medium':
      default:
        return 'clamp(1.35rem, 2.5vw, 2.15rem)';
    }
  }, [subtitleSize]);

  const lastTimeUpdateRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const failoverAttemptedRef = useRef<boolean>(false);
  const pendingSeekTimeRef = useRef<{ time: number; play: boolean } | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applyPendingSeek = useCallback(() => {
    if (pendingSeekTimeRef.current !== null && videoRef.current) {
      const { time, play } = pendingSeekTimeRef.current;
      if (time > 0) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
        if (play) {
          videoRef.current.play().catch(() => {});
        }
      }
      pendingSeekTimeRef.current = null;
    }
  }, []);

  const isTV = item.media_type === 'tv' || item.media_type === 'anime';

  // Progress saver
  const saveProgress = useCallback(
    (time: number, dur: number) => {
      if (!Number.isFinite(time) || time < 5) return;
      try {
        if (dur > 0 && time > dur - 10) {
          removePlaybackRecord(item.id, isTV ? season : undefined, isTV ? episode : undefined);
          return;
        }
        savePlaybackRecord(item, {
          season: isTV ? season : undefined,
          episode: isTV ? episode : undefined,
          currentTime: time,
          duration: dur
        });
      } catch {
        // ignore
      }
    },
    [item, isTV, season, episode]
  );

  useEffect(() => {
    failoverAttemptedRef.current = false;
  }, [item.id, season, episode, selectedStreamIndex]);

  const videoInstanceRef = useRef<HTMLVideoElement | null>(null);

  // Cleanup & save on unmount
  useEffect(() => {
    return () => {
      const video = videoInstanceRef.current;
      if (video && video.currentTime > 5) {
        saveProgress(video.currentTime, video.duration);
      }
    };
  }, [saveProgress]);

  const selectedStream = streams[selectedStreamIndex] || null;

  // Resolve current server name for UI labels
  const currentServerName = useMemo(() => {
    const s = serversList.find((srv) => srv.id === currentServerId);
    if (s) return s.name;
    if (currentServerId === 'pengu') return 'Pengu';
    return 'HDHub';
  }, [serversList, currentServerId]);

  // Onscreen toast display
  const showToast = useCallback((msg: string) => {
    if (msg.toLowerCase() === 'play' || msg.toLowerCase() === 'pause') return;
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 1200);
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        const valid = Math.max(0, Math.min(duration || 0, time));
        videoRef.current.currentTime = valid;
        setCurrentTime(valid);
      }
    },
    [duration]
  );

  const handleSkip = useCallback(
    (seconds: number) => {
      if (!videoRef.current) return;
      const dur = videoRef.current.duration || 100;
      const target = Math.max(0, Math.min(dur, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = target;
      setCurrentTime(target);
      showToast(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    },
    [showToast]
  );

  // Scrubber drag hook
  const {
    isDragging,
    hoverProgress,
    handleMouseDown: handleScrubberMouseDown,
    handleTouchStart: handleScrubberTouchStart,
    handleMouseMove: handleScrubberMouseMove,
    handleMouseLeave: handleScrubberMouseLeave,
    handleKeyDown: handleScrubberKeyDown
  } = useScrubberDrag({
    scrubberRef,
    videoRef,
    duration,
    onSeek: handleSeek,
    onSkip: handleSkip
  });

  const handleResetBuffered = useCallback(() => setBufferedPercent(0), []);

  // HLS Playback hook (ARCH-05)
  const {
    hlsRef,
    nativeAudioTracks,
    setNativeAudioTracks,
    playbackError,
    setPlaybackError
  } = useHlsPlayback({
    videoRef,
    selectedStream,
    onResetBuffered: handleResetBuffered
  });

  // Subtitle pipeline hook (ARCH-05)
  const {
    subtitlesList,
    selectedSubtitleId,
    currentSubtitleUrl,
    subtitlesLoading,
    fileInputRef,
    handleSelectSubtitle,
    handleUploadCustomSubtitle,
    handleTrackLoad
  } = useSubtitlePipeline({
    item,
    season,
    episode,
    subtitleOffset,
    videoRef,
    showToast,
    onCloseSettings: () => {
      setIsSettingsMenuOpen(false);
      setSettingsTab('main');
    }
  });

  // Controls auto-hide timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (
      !isQualityDropdownOpen &&
      !isServerDropdownOpen &&
      !isSettingsMenuOpen &&
      !isEpisodeDrawerOpen &&
      !isDragging
    ) {
      hideControlsTimer.current = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused && !isDragging) {
          setShowControls(false);
        }
      }, 3000);
    }
  }, [isQualityDropdownOpen, isServerDropdownOpen, isSettingsMenuOpen, isEpisodeDrawerOpen, isDragging]);

  // Fetch streams
  useEffect(() => {
    let isCancelled = false;

    async function loadStreams() {
      setLoading(true);
      setError(null);
      setPlaybackError(false);

      try {
        const fetchFn = currentServerId === 'pengu' ? fetchPenguStreams : fetchHDHubStreams;
        const res = await fetchFn(
          item.tmdbId || item.id,
          item.media_type,
          item.imdbId,
          season,
          episode
        );

        if (isCancelled) return;

        if (res.error && res.streams.length === 0) {
          setError(res.error);
          setStreams([]);
        } else {
          setStreams(res.streams);
          setSelectedStreamIndex(0);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || `Failed to resolve streams from ${currentServerName}.`);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadStreams();

    return () => {
      isCancelled = true;
    };
  }, [item.id, item.tmdbId, item.media_type, item.imdbId, season, episode, currentServerId, currentServerName, setPlaybackError]);

  // Handle stream index change during render
  const [prevStreamIndex, setPrevStreamIndex] = useState<number>(selectedStreamIndex);
  if (selectedStreamIndex !== prevStreamIndex) {
    setPrevStreamIndex(selectedStreamIndex);
    setPlaybackError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setBufferedPercent(0);
    setNativeAudioTracks([]);
    setSelectedAudioLang('default');
  }

  // Volume synchronization
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    try {
      localStorage.setItem('streamverse_player_volume', String(volume));
      localStorage.setItem('streamverse_player_muted', String(isMuted));
    } catch (e) {
      console.warn('Failed to save player volume preference:', e);
    }
  }, [volume, isMuted]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Dismiss dropdowns outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(target)) {
        setIsQualityDropdownOpen(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(target)) {
        setIsServerDropdownOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(target)) {
        setIsSettingsMenuOpen(false);
        setSettingsTab('main');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') {
            setIsPlaying(false);
            return;
          }
          console.warn('Playback play request error:', err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
    resetControlsTimer();
  }, [resetControlsTimer, saveProgress]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = performance.now();

    if (now - lastSaveTimeRef.current >= 5000) {
      lastSaveTimeRef.current = now;
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }

    if (now - lastTimeUpdateRef.current < 250) {
      return;
    }
    lastTimeUpdateRef.current = now;

    if (!isDragging) {
      setCurrentTime(videoRef.current.currentTime);
    }

    const d = videoRef.current.duration;
    if (d && Number.isFinite(d) && d > 0 && d !== duration) {
      setDuration(d);
    }

    const effectiveDuration = d && Number.isFinite(d) && d > 0 ? d : duration;
    if (videoRef.current.buffered.length > 0 && effectiveDuration > 0) {
      try {
        const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferedPercent(Math.min(100, (end / effectiveDuration) * 100));
      } catch {}
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      if (d && Number.isFinite(d) && d > 0) {
        setDuration(d);
      }
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackSpeed;
      setPlaybackError(false);

      const v = videoRef.current as any;
      if (v && v.audioTracks && v.audioTracks.length > 0) {
        const list: { id: string; label: string; language?: string; index: number }[] = [];
        for (let i = 0; i < v.audioTracks.length; i++) {
          const t = v.audioTracks[i];
          list.push({
            id: `native-${i}`,
            label: t.label || `Audio Track ${i + 1} (${t.language || 'Default'})`,
            language: t.language,
            index: i
          });
        }
        setNativeAudioTracks(list);
      }

      applyPendingSeek();
    }
  };

  const handleSelectStreamIndex = useCallback(
    (idx: number) => {
      if (idx !== selectedStreamIndex) {
        const prevTime = videoRef.current?.currentTime || 0;
        const wasPlaying = isPlaying;
        if (prevTime > 0) {
          pendingSeekTimeRef.current = { time: prevTime, play: wasPlaying };
        }
        setSelectedStreamIndex(idx);
      }
    },
    [selectedStreamIndex, isPlaying]
  );

  // Audio options builder
  const audioOptions = useMemo<AudioOptionItem[]>(() => {
    if (nativeAudioTracks.length > 1) {
      return nativeAudioTracks.map((t) => ({
        id: t.id,
        label: t.label,
        isNative: true,
        nativeIndex: t.index
      }));
    }

    const map = new Map<string, AudioOptionItem>();
    streams.forEach((s, idx) => {
      const langs = s.audioLanguages && s.audioLanguages.length > 0 ? s.audioLanguages : ['Original'];
      langs.forEach((lang) => {
        if (!map.has(lang)) {
          map.set(lang, {
            id: `lang-${lang}`,
            label: `${lang} (${s.quality})`,
            streamIndex: idx
          });
        }
      });
    });

    if (map.size === 0) {
      return [{ id: 'default', label: 'Default Audio (Stereo)', streamIndex: selectedStreamIndex }];
    }

    return Array.from(map.values());
  }, [nativeAudioTracks, streams, selectedStreamIndex]);

  const activeAudioLabel = useMemo(() => {
    if (selectedAudioLang !== 'default') return selectedAudioLang;
    return selectedStream?.audioLabel || 'Default Audio';
  }, [selectedAudioLang, selectedStream]);

  const handleSelectAudioOption = (opt: AudioOptionItem) => {
    const v = videoRef.current as any;
    const hasNativeTracks = Boolean(v && v.audioTracks && v.audioTracks.length > 1);

    if (hlsRef.current && opt.nativeIndex !== undefined) {
      hlsRef.current.audioTrack = opt.nativeIndex;
      setSelectedAudioLang(opt.label);
      showToast(`Audio: ${opt.label}`);
    } else if (opt.isNative && opt.nativeIndex !== undefined && hasNativeTracks) {
      for (let i = 0; i < v.audioTracks.length; i++) {
        v.audioTracks[i].enabled = i === opt.nativeIndex;
      }
      setSelectedAudioLang(opt.label);
      showToast(`Audio: ${opt.label}`);
    } else if (opt.streamIndex !== undefined && opt.streamIndex !== selectedStreamIndex) {
      const prevTime = videoRef.current?.currentTime || 0;
      const wasPlaying = isPlaying;
      if (prevTime > 0) {
        pendingSeekTimeRef.current = { time: prevTime, play: wasPlaying };
      }
      setSelectedStreamIndex(opt.streamIndex);
      setSelectedAudioLang(opt.label);
      showToast(`Switched to ${opt.label}`);
    } else {
      setSelectedAudioLang(opt.label);
      if (!hasNativeTracks && !hlsRef.current) {
        showToast(`Browser locked to Track 1 — Open in VLC for ${opt.label}`);
      } else {
        showToast(`Audio: ${opt.label}`);
      }
    }
    setIsSettingsMenuOpen(false);
    setSettingsTab('main');
  };

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      showToast(nextMuted ? 'Muted' : `Volume ${Math.round(volume * 100)}%`);
    }
  }, [isMuted, volume, showToast]);

  const handleVolumeAdjust = useCallback(
    (delta: number) => {
      if (videoRef.current) {
        const nextVol = Math.max(0, Math.min(1, Math.round((volume + delta) * 10) / 10));
        videoRef.current.volume = nextVol;
        videoRef.current.muted = nextVol === 0;
        setVolume(nextVol);
        setIsMuted(nextVol === 0);
        showToast(nextVol === 0 ? 'Muted' : `Volume ${Math.round(nextVol * 100)}%`);
      }
    },
    [volume, showToast]
  );

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setVolume(val);
      setIsMuted(val === 0);
    }
  };

  const handleToggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleTogglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP not supported or blocked:', err);
    }
  };

  const handleScreenshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const a = document.createElement('a');
        a.download = `${item.title.replace(/\s+/g, '_')}_Frame.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Screenshot Captured');
      }
    } catch {
      showToast('Screenshot Unavailable');
    }
  };

  const handleCopyLink = () => {
    if (!selectedStream?.url) return;
    navigator.clipboard.writeText(selectedStream.url);
    setCopied(true);
    showToast('Stream URL Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectPixelDrainRoute = useCallback(
    (route: PixelDrainRoute) => {
      const prevTime = videoRef.current?.currentTime || 0;
      const wasPlaying = isPlaying;
      if (prevTime > 0) {
        pendingSeekTimeRef.current = { time: prevTime, play: wasPlaying };
      }
      setPlaybackError(false);
      setPixelDrainRoute(route);
      setPixelDrainRouteState(route);
      setStreams((prev) =>
        prev.map((s) => {
          const pdId = extractPixelDrainId(s.url);
          if (pdId) {
            return { ...s, url: formatPixelDrainUrl(pdId, route) };
          }
          return s;
        })
      );
      showToast(`PixelDrain: ${route === 'cdn' ? 'Fast CDN Mirror' : 'Normal Proxy'}`);
      setIsSettingsMenuOpen(false);
      setSettingsTab('main');
    },
    [isPlaying, showToast, setPlaybackError]
  );

  useEffect(() => {
    const handleExternalRouteChange = (e: any) => {
      const nextRoute = (e?.detail?.route as PixelDrainRoute) || getPixelDrainRoute();
      setPlaybackError(false);
      setPixelDrainRouteState(nextRoute);
      setStreams((prev) =>
        prev.map((s) => {
          const pdId = extractPixelDrainId(s.url);
          if (pdId) {
            return { ...s, url: formatPixelDrainUrl(pdId, nextRoute) };
          }
          return s;
        })
      );
    };

    window.addEventListener(PIXELDRAIN_CHANGE_EVENT, handleExternalRouteChange);
    return () => {
      window.removeEventListener(PIXELDRAIN_CHANGE_EVENT, handleExternalRouteChange);
    };
  }, [setPlaybackError]);

  usePlayerShortcuts({
    onTogglePlay: handleTogglePlay,
    onSkip: handleSkip,
    onVolumeAdjust: handleVolumeAdjust,
    onToggleMute: handleToggleMute,
    onToggleFullscreen: handleToggleFullscreen,
    onCloseMenus: () => {
      if (isQualityDropdownOpen) setIsQualityDropdownOpen(false);
      else if (isServerDropdownOpen) setIsServerDropdownOpen(false);
      else if (isSettingsMenuOpen) setIsSettingsMenuOpen(false);
    },
    enabled: true
  });

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    const rect = playerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const width = rect.width;

    if (now - lastTapTimeRef.current.time < 300) {
      if (x < width * 0.35) {
        handleSkip(-10);
      } else if (x > width * 0.65) {
        handleSkip(10);
      }
    }
    lastTapTimeRef.current = { time: now, x };
    resetControlsTimer();
  };

  const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const playedPercent = validDuration > 0 ? Math.min(100, Math.max(0, (currentTime / validDuration) * 100)) : 0;
  const isNearEnd = isTV && validDuration > 60 && validDuration - currentTime <= 30 && Boolean(onNextEpisode);

  return (
    <div
      ref={playerContainerRef}
      role="region"
      aria-label={`Video Player - ${item.title}`}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full bg-black select-none overflow-hidden flex items-center justify-center font-sans ${
        !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Hidden File Input for Custom Subtitle Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,.vtt"
        onChange={handleUploadCustomSubtitle}
        className="hidden"
      />

      {/* 1. HTML5 Video Stream */}
      {selectedStream && (
        <video
          ref={(node) => {
            videoRef.current = node;
            if (node) videoInstanceRef.current = node;
          }}
          key={selectedStream.url}
          playsInline
          {...({ referrerPolicy: 'no-referrer' } as any)}
          muted={isMuted}
          style={{ objectFit }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            if (videoRef.current) {
              saveProgress(videoRef.current.currentTime, videoRef.current.duration);
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={applyPendingSeek}
          onError={() => {
            const err = videoRef.current?.error;
            console.warn('Stream playback error on stream index', selectedStreamIndex, err);

            if (err?.code === 4) {
              setPlaybackError(true);
              return;
            }

            const pdId = extractPixelDrainId(selectedStream?.url);
            if (pdId && videoRef.current && !failoverAttemptedRef.current) {
              failoverAttemptedRef.current = true;
              const cdnMirror = `https://cdn.pixeldrain.eu.cc/${pdId}`;
              console.info('[HDHubPlayer] Network error detected. Attempting direct EU CDN mirror failover once:', cdnMirror);
              videoRef.current.src = cdnMirror;
              videoRef.current.load();
              videoRef.current.play().catch(() => {});
              return;
            }

            setPlaybackError(true);
          }}
          onClick={handleTogglePlay}
          className="w-full h-full cursor-pointer bg-black"
        >
          {currentSubtitleUrl && (
            <track
              key={currentSubtitleUrl}
              kind="subtitles"
              src={currentSubtitleUrl}
              label={subtitlesList.find((s) => s.id === selectedSubtitleId)?.label || 'Subtitles'}
              srcLang={subtitlesList.find((s) => s.id === selectedSubtitleId)?.lang || 'en'}
              default
              onLoad={handleTrackLoad}
            />
          )}
        </video>
      )}

      {/* Modern Cinema-Grade Subtitle Cue Styling */}
      <style>{`
        video::cue, ::cue {
          background-color: rgba(0, 0, 0, 0.75) !important;
          color: #ffffff !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          font-size: ${subtitleFontSize} !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          letter-spacing: 0.025em !important;
          text-shadow: 
            0 0 2px #000000, 
            0 1px 3px rgba(0, 0, 0, 0.95), 
            0 2px 6px rgba(0, 0, 0, 0.9), 
            0 0 10px rgba(0, 0, 0, 0.75) !important;
          padding: 0.2em 0.55em !important;
          border-radius: 6px !important;
          white-space: pre-line !important;
        }
      `}</style>

      {/* Top & Bottom Atmospheric Gradients */}
      <div
        className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/90 via-black/45 to-transparent pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 2. Top Control Bar Subcomponent */}
      <PlayerTopBar
        showControls={showControls}
        onClose={onClose}
        serverDropdownRef={serverDropdownRef}
        isServerDropdownOpen={isServerDropdownOpen}
        setIsServerDropdownOpen={setIsServerDropdownOpen}
        qualityDropdownRef={qualityDropdownRef}
        isQualityDropdownOpen={isQualityDropdownOpen}
        setIsQualityDropdownOpen={setIsQualityDropdownOpen}
        setIsSettingsMenuOpen={setIsSettingsMenuOpen}
        currentServerName={currentServerName}
        currentServerId={currentServerId}
        serversList={serversList}
        onSwitchServer={onSwitchServer}
        streams={streams}
        selectedStreamIndex={selectedStreamIndex}
        selectedStream={selectedStream}
        setSelectedStreamIndex={handleSelectStreamIndex}
        showToast={showToast}
        item={item}
        isTV={isTV}
        season={season}
        episode={episode}
        totalEpisodes={totalEpisodes}
        onPrevEpisode={onPrevEpisode}
        onNextEpisode={onNextEpisode}
        onOpenEpisodeDrawer={onOpenEpisodeDrawer}
        isEpisodeDrawerOpen={isEpisodeDrawerOpen}
        playbackError={playbackError}
      />

      {/* 3. Center Play Button & 10s Skip Controls */}
      {!loading && (!error || streams.length > 0) && (
        <div
          className={`absolute inset-0 z-30 flex items-center justify-center pointer-events-none transition-all duration-300 ${
            showControls || !isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-4 sm:gap-8 pointer-events-auto">
            {/* Skip -10s */}
            <button
              type="button"
              onClick={() => handleSkip(-10)}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 shadow-2xl backdrop-blur-xl transition hover:bg-white/20 hover:text-white hover:scale-105 active:scale-90"
              title="Rewind 10s"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Main Play/Pause Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] transition hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 sm:h-10 sm:w-10 fill-current" />
              ) : (
                <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-current ml-1" />
              )}
            </button>

            {/* Skip +10s */}
            <button
              type="button"
              onClick={() => handleSkip(10)}
              className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/80 shadow-2xl backdrop-blur-xl transition hover:bg-white/20 hover:text-white hover:scale-105 active:scale-90"
              title="Forward 10s"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Center Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-6 text-center animate-in fade-in">
          <div className="relative mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center animate-pulse">
              <Sparkles className="h-8 w-8 text-primary animate-spin" />
            </div>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">Resolving Cloud Stream</h3>
          <p className="text-xs text-white/50 max-w-sm mt-1 leading-relaxed">
            Scanning {currentServerName} sources for {item.title}...
          </p>
        </div>
      )}

      {/* 5. Error State (No Streams Found) */}
      {!loading && error && streams.length === 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#060812]/95 backdrop-blur-md p-6 text-center animate-in fade-in">
          <div className="flex flex-col items-center justify-center max-w-md w-full mx-auto p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">No Streams Found on {currentServerName}</h3>
            <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">{error}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  const fetchFn = currentServerId === 'pengu' ? fetchPenguStreams : fetchHDHubStreams;
                  fetchFn(item.tmdbId || item.id, item.media_type, item.imdbId, season, episode, true)
                    .then((res) => {
                      if (!isMountedRef.current) return;
                      setStreams(res.streams);
                      if (res.streams.length > 0) setSelectedStreamIndex(0);
                      else setError(res.error || 'No streams available');
                    })
                    .finally(() => {
                      if (isMountedRef.current) setLoading(false);
                    });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition active:scale-95 border border-white/10 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Search</span>
              </button>
              {onSwitchServer && (
                <button
                  type="button"
                  onClick={() => {
                    const altServer = serversList.find((s) => s.id !== currentServerId)?.id || 'cinemaos';
                    onSwitchServer(altServer);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-primary text-black hover:brightness-110 transition active:scale-95 shadow-md cursor-pointer"
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>Try another server</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Next Episode Floating Prompt (Last 30 seconds) */}
      {isNearEnd && (
        <div className="absolute bottom-20 right-4 sm:bottom-24 sm:right-8 z-40 animate-in slide-in-from-bottom duration-300">
          <div className="p-3.5 rounded-2xl border border-white/20 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Up Next</span>
              <span className="text-xs font-semibold text-white">Episode {episode + 1}</span>
            </div>
            <button
              type="button"
              onClick={onNextEpisode}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-110 transition active:scale-95 shadow-md"
            >
              <span>Play Next</span>
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* 7. Bottom Progress Bar & Player Controls Subcomponent */}
      <PlayerBottomBar
        showControls={showControls && !(!loading && Boolean(error) && streams.length === 0)}
        scrubberRef={scrubberRef}
        validDuration={validDuration}
        currentTime={currentTime}
        handleScrubberKeyDown={handleScrubberKeyDown}
        handleScrubberMouseDown={handleScrubberMouseDown}
        handleScrubberTouchStart={handleScrubberTouchStart}
        handleScrubberMouseMove={handleScrubberMouseMove}
        handleScrubberMouseLeave={handleScrubberMouseLeave}
        hoverProgress={hoverProgress}
        formatTime={formatTime}
        isDragging={isDragging}
        bufferedPercent={bufferedPercent}
        playedPercent={playedPercent}
        isPlaying={isPlaying}
        handleTogglePlay={handleTogglePlay}
        handleSkip={handleSkip}
        isMuted={isMuted}
        volume={volume}
        handleToggleMute={handleToggleMute}
        handleVolumeSliderChange={handleVolumeSliderChange}
        handleScreenshot={handleScreenshot}
        handleTogglePiP={handleTogglePiP}
        selectedSubtitleId={selectedSubtitleId}
        isSettingsMenuOpen={isSettingsMenuOpen}
        setIsSettingsMenuOpen={setIsSettingsMenuOpen}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        setIsQualityDropdownOpen={setIsQualityDropdownOpen}
        settingsMenuRef={settingsMenuRef}
        isFullscreen={isFullscreen}
        handleToggleFullscreen={handleToggleFullscreen}
        activeAudioLabel={activeAudioLabel}
        selectedAudioLang={selectedAudioLang}
        audioOptions={audioOptions}
        handleSelectAudioOption={handleSelectAudioOption}
        selectedStream={selectedStream}
        handleCopyLink={handleCopyLink}
        copied={copied}
        fileInputRef={fileInputRef}
        subtitlesLoading={subtitlesLoading}
        subtitlesList={subtitlesList}
        handleSelectSubtitle={handleSelectSubtitle}
        subtitleSize={subtitleSize}
        subtitleOffset={subtitleOffset}
        updateSettings={updateSettings}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        videoRef={videoRef}
        showToast={showToast}
        objectFit={objectFit}
        setObjectFit={setObjectFit}
        pixelDrainRoute={pixelDrainRoute}
        handleSelectPixelDrainRoute={handleSelectPixelDrainRoute}
        streams={streams}
        selectedStreamIndex={selectedStreamIndex}
        setSelectedStreamIndex={handleSelectStreamIndex}
      />

      {/* 8. Codec / MKV Notice Modal Subcomponent */}
      <PlayerErrorModal
        playbackError={playbackError}
        selectedStream={selectedStream}
        streams={streams}
        selectedStreamIndex={selectedStreamIndex}
        setSelectedStreamIndex={handleSelectStreamIndex}
        setPlaybackError={setPlaybackError}
        handleCopyLink={handleCopyLink}
        copied={copied}
        onSwitchServer={onSwitchServer}
      />

      {/* 9. Feedback Toast Pill */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 border border-white/20 text-white font-medium text-xs shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

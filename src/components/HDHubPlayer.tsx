import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Maximize, 
  Minimize, 
  Settings, 
  Camera, 
  PictureInPicture2, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft, 
  X, 
  Sparkles, 
  Server, 
  HardDrive, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  Film, 
  ListVideo,
  AlertCircle,
  Subtitles,
  AudioLines,
  Upload,
  FileText,
  Zap,
  Wifi
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { fetchHDHubStreams, HDHubStream } from '../services/hdhub';
import { fetchPenguStreams } from '../services/pengu';
import type Hls from 'hls.js';
import { getImdbId } from '../services/tmdb';
import { 
  fetchAvailableSubtitles, 
  fetchSubtitleVttBlob, 
  convertSrtToVtt, 
  sanitizeVtt,
  revokeSubtitleBlob,
  SubtitleTrackItem 
} from '../services/subtitles';
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

  // Subtitles state
  const [subtitlesList, setSubtitlesList] = useState<SubtitleTrackItem[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [currentSubtitleUrl, setCurrentSubtitleUrl] = useState<string | null>(null);
  const [subtitlesLoading, setSubtitlesLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio state
  const [nativeAudioTracks, setNativeAudioTracks] = useState<{ id: string; label: string; language?: string; index: number }[]>([]);
  const [selectedAudioLang, setSelectedAudioLang] = useState<string>('default');

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
  const [playbackError, setPlaybackError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Scrubber element ref
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  // Quick feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualityDropdownRef = useRef<HTMLDivElement | null>(null);
  const serverDropdownRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const lastTapTimeRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());

  // Unified user settings & subtitle preferences
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
  const prevSubtitleOffsetRef = useRef<number>(subtitleOffset);
  const lastTimeUpdateRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const hasResumedRef = useRef<boolean>(false);
  const failoverAttemptedRef = useRef<boolean>(false);

  const isTV = item.media_type === 'tv' || item.media_type === 'anime';

  const saveProgress = useCallback((time: number, dur: number) => {
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
  }, [item, isTV, season, episode]);

  useEffect(() => {
    hasResumedRef.current = false;
    failoverAttemptedRef.current = false;
  }, [item.id, season, episode, selectedStreamIndex]);

  // Cleanup all allocated Object URLs and save progress on unmount
  useEffect(() => {
    const video = videoRef.current;
    const blobUrls = Array.from(createdBlobUrlsRef.current);
    const createdBlobUrls = createdBlobUrlsRef.current;
    return () => {
      if (video && video.currentTime > 5) {
        saveProgress(video.currentTime, video.duration);
      }
      blobUrls.forEach((url) => {
        revokeSubtitleBlob(url);
      });
      createdBlobUrls.clear();
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

  // Onscreen toast display (skips play/pause text)
  const showToast = useCallback((msg: string) => {
    if (msg.toLowerCase() === 'play' || msg.toLowerCase() === 'pause') return;
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 1200);
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      const valid = Math.max(0, Math.min(duration || 0, time));
      videoRef.current.currentTime = valid;
      setCurrentTime(valid);
    }
  }, [duration]);

  const handleSkip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 100;
    const target = Math.max(0, Math.min(dur, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
    showToast(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
  }, [showToast]);

  // Encapsulated scrubber drag, touch tracking, percent clamp math, and preview tooltips
  const {
    isDragging,
    hoverProgress,
    handleMouseDown: handleScrubberMouseDown,
    handleTouchStart: handleScrubberTouchStart,
    handleMouseMove: handleScrubberMouseMove,
    handleMouseLeave: handleScrubberMouseLeave,
    handleKeyDown: handleScrubberKeyDown,
  } = useScrubberDrag({
    scrubberRef,
    videoRef,
    duration,
    onSeek: handleSeek,
    onSkip: handleSkip,
  });

  // Controls auto-hide timer (3 seconds while playing, stays visible when paused or scrubbing)
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

  // 1. Fetch available Direct / Cloud streams (HDHub or Pengu)
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
  }, [item.id, item.tmdbId, item.media_type, item.imdbId, season, episode, currentServerId, currentServerName]);

  // 2. Fetch available Subtitles for this title
  useEffect(() => {
    let isCancelled = false;

    async function loadSubs() {
      setSubtitlesLoading(true);
      setSelectedSubtitleId(null);
      setCurrentSubtitleUrl(null);

      try {
        let imdbId = item.imdbId;
        if (!imdbId) {
          imdbId = (await getImdbId(item.tmdbId || item.id, item.media_type)) || undefined;
        }
        if (!imdbId || isCancelled) return;

        const subs = await fetchAvailableSubtitles(imdbId, item.media_type, season, episode);
        if (!isCancelled) {
          setSubtitlesList(subs);
        }
      } catch (err) {
        console.warn('Subtitles fetch error:', err);
      } finally {
        if (!isCancelled) setSubtitlesLoading(false);
      }
    }

    loadSubs();

    return () => {
      isCancelled = true;
    };
  }, [item.id, item.tmdbId, item.media_type, item.imdbId, season, episode]);

  // Handle stream change during render (React official pattern)
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

  // HLS ref & stream attachment effect
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedStream?.url) return;

    setPlaybackError(false);
    setBufferedPercent(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = selectedStream.url.includes('.m3u8') || selectedStream.url.includes('/hls/');
    let isDisposed = false;

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support in Safari / iOS
        video.src = selectedStream.url;
        video.load();
      } else {
        // Dynamically load HLS.js only when stream requires it on browsers without native HLS
        import('hls.js')
          .then(({ default: HlsClass }) => {
            if (isDisposed) return;
            if (HlsClass.isSupported()) {
              const hls = new HlsClass({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90
              });

              hls.loadSource(selectedStream.url);
              hls.attachMedia(video);

              hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
                setPlaybackError(false);
                if (hls.audioTracks && hls.audioTracks.length > 0) {
                  const list = hls.audioTracks.map((t, idx) => ({
                    id: `hls-${idx}`,
                    label: t.name || t.lang || `Audio Track ${idx + 1}`,
                    language: t.lang,
                    index: idx
                  }));
                  setNativeAudioTracks(list);
                }
              });

              hls.on(HlsClass.Events.AUDIO_TRACKS_UPDATED, () => {
                if (hls.audioTracks && hls.audioTracks.length > 0) {
                  const list = hls.audioTracks.map((t, idx) => ({
                    id: `hls-${idx}`,
                    label: t.name || t.lang || `Audio Track ${idx + 1}`,
                    language: t.lang,
                    index: idx
                  }));
                  setNativeAudioTracks(list);
                }
              });

              hls.on(HlsClass.Events.ERROR, (_event, data) => {
                if (
                  data.details === HlsClass.ErrorDetails.AUDIO_TRACK_LOAD_ERROR || 
                  data.details === HlsClass.ErrorDetails.AUDIO_TRACK_LOAD_TIMEOUT
                ) {
                  console.warn('HLS audio track error, recovering...', data.details);
                  if (hls.audioTracks && hls.audioTracks.length > 1) {
                    hls.audioTrack = (hls.audioTrack + 1) % hls.audioTracks.length;
                  }
                  return;
                }

                if (data.fatal) {
                  switch (data.type) {
                    case HlsClass.ErrorTypes.NETWORK_ERROR:
                      console.warn('HLS Network error, attempting recovery...');
                      hls.startLoad();
                      break;
                    case HlsClass.ErrorTypes.MEDIA_ERROR:
                      console.warn('HLS Media error, attempting recovery...');
                      hls.recoverMediaError();
                      break;
                    default:
                      console.error('Fatal HLS error, destroying instance:', data);
                      hls.destroy();
                      hlsRef.current = null;
                      setPlaybackError(true);
                      break;
                  }
                }
              });

              hlsRef.current = hls;
            } else {
              video.src = selectedStream.url;
              video.load();
            }
          })
          .catch((err) => {
            console.error('Failed to dynamically load HLS library:', err);
            if (!isDisposed) {
              video.src = selectedStream.url;
              video.load();
            }
          });
      }
    } else {
      video.src = selectedStream.url;
      video.load();
    }

    return () => {
      isDisposed = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedStream?.url]);

  // Synchronize volume and muted state directly on video element without rebuilding stream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Persist volume settings safely
  useEffect(() => {
    try {
      localStorage.setItem('streamverse_player_volume', String(volume));
      localStorage.setItem('streamverse_player_muted', String(isMuted));
    } catch (e) {
      console.warn('Failed to save player volume preference:', e);
    }
  }, [volume, isMuted]);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Dismiss dropdowns when clicking outside
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

  // Video playback controls
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
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

  // Throttled timeupdate handler (4-5Hz) with 5s periodic progress persistence (T3-04 & T3-05)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = performance.now();

    // Auto-save progress every 5 seconds
    if (now - lastSaveTimeRef.current >= 5000) {
      lastSaveTimeRef.current = now;
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    }

    // Throttle React state updates to 4-5Hz (~250ms) to avoid frame drops
    if (now - lastTimeUpdateRef.current < 250) {
      return;
    }
    lastTimeUpdateRef.current = now;

    if (!isDragging) {
      setCurrentTime(videoRef.current.currentTime);
    }
    
    // Dynamically sync duration if updated after initial metadata
    const d = videoRef.current.duration;
    if (d && Number.isFinite(d) && d > 0 && d !== duration) {
      setDuration(d);
    }

    // Update buffered progress
    const effectiveDuration = (d && Number.isFinite(d) && d > 0) ? d : duration;
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

      // Playback auto-resume disabled to prevent cold-start buffering stalls on large containers (starts fresh from 0:00)
      /*
      if (!hasResumedRef.current) {
        hasResumedRef.current = true;
          const record = getPlaybackRecord(item.id, isTV ? season : undefined, isTV ? episode : undefined);
          if (record) {
            const savedTime = record.currentTime || 0;
            const effectiveDuration = d || duration;
            if (savedTime > 10 && (!effectiveDuration || savedTime < effectiveDuration - 30)) {
              videoRef.current.currentTime = savedTime;
              setCurrentTime(savedTime);
              showToast(`Resumed from ${formatTime(savedTime)}`);
            }
          }
      }
      */

      // Detect native audio tracks if exposed by browser
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
    }
  };

  // Dynamically shift subtitle cues when timing offset changes (T3-08)
  useEffect(() => {
    if (!videoRef.current) return;
    const delta = subtitleOffset - prevSubtitleOffsetRef.current;
    prevSubtitleOffsetRef.current = subtitleOffset;
    if (delta === 0) return;

    try {
      const tracks = videoRef.current.textTracks;
      if (!tracks) return;
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (track.cues) {
          for (let j = 0; j < track.cues.length; j++) {
            const cue = track.cues[j];
            cue.startTime = Math.max(0, cue.startTime + delta);
            cue.endTime = Math.max(0, cue.endTime + delta);
          }
        }
      }
    } catch (e) {
      console.warn('Error adjusting subtitle cues:', e);
    }
  }, [subtitleOffset]);

  const handleTrackLoad = useCallback(() => {
    if (subtitleOffset !== 0 && videoRef.current) {
      try {
        const tracks = videoRef.current.textTracks;
        if (!tracks) return;
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          if (track.cues) {
            for (let j = 0; j < track.cues.length; j++) {
              const cue = track.cues[j];
              cue.startTime = Math.max(0, cue.startTime + subtitleOffset);
              cue.endTime = Math.max(0, cue.endTime + subtitleOffset);
            }
          }
        }
        prevSubtitleOffsetRef.current = subtitleOffset;
      } catch {}
    }
  }, [subtitleOffset]);

interface AudioOptionItem {
  id: string;
  label: string;
  isNative?: boolean;
  nativeIndex?: number;
  streamIndex?: number;
}

  // Audio tracks list (combines native browser audio tracks & stream-specific dubs)
  const audioOptions = useMemo<AudioOptionItem[]>(() => {
    if (nativeAudioTracks.length > 1) {
      return nativeAudioTracks.map((t) => ({
        id: t.id,
        label: t.label,
        isNative: true,
        nativeIndex: t.index
      }));
    }

    // Stream-based audio language options
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

  // Active audio label
  const activeAudioLabel = useMemo(() => {
    if (selectedAudioLang !== 'default') return selectedAudioLang;
    return selectedStream?.audioLabel || 'Default Audio';
  }, [selectedAudioLang, selectedStream]);

  // Select audio track
  const handleSelectAudioOption = (opt: AudioOptionItem) => {
    const v = videoRef.current as any;
    const hasNativeTracks = Boolean(v && v.audioTracks && v.audioTracks.length > 1);

    if (hlsRef.current && opt.nativeIndex !== undefined) {
      hlsRef.current.audioTrack = opt.nativeIndex;
      setSelectedAudioLang(opt.label);
      showToast(`Audio: ${opt.label}`);
    } else if (opt.isNative && opt.nativeIndex !== undefined && hasNativeTracks) {
      for (let i = 0; i < v.audioTracks.length; i++) {
        v.audioTracks[i].enabled = (i === opt.nativeIndex);
      }
      setSelectedAudioLang(opt.label);
      showToast(`Audio: ${opt.label}`);
    } else if (opt.streamIndex !== undefined && opt.streamIndex !== selectedStreamIndex) {
      const prevTime = videoRef.current?.currentTime || 0;
      const wasPlaying = isPlaying;
      setSelectedStreamIndex(opt.streamIndex);
      setSelectedAudioLang(opt.label);
      showToast(`Switched to ${opt.label}`);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = prevTime;
          if (wasPlaying) videoRef.current.play().catch(() => {});
        }
      }, 150);
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

  // Select subtitle track
  const handleSelectSubtitle = async (sub: SubtitleTrackItem | null) => {
    if (!sub) {
      setSelectedSubtitleId(null);
      setCurrentSubtitleUrl(null);
      showToast('Subtitles Off');
      setIsSettingsMenuOpen(false);
      setSettingsTab('main');
      return;
    }

    try {
      showToast(`Loading ${sub.label}...`);
      let vttUrl = sub.url;
      if (sub.url.startsWith('http')) {
        vttUrl = await fetchSubtitleVttBlob(sub.url);
        createdBlobUrlsRef.current.add(vttUrl);
      }
      setSelectedSubtitleId(sub.id);
      setCurrentSubtitleUrl(vttUrl);
      showToast(`Subtitles: ${sub.label}`);
      setIsSettingsMenuOpen(false);
      setSettingsTab('main');
    } catch (err) {
      console.error('Failed to load subtitle track:', err);
      showToast('Failed to load subtitle');
    }
  };

  // Upload custom subtitle (.srt, .vtt)
  const handleUploadCustomSubtitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let vttContent = content;
        if (file.name.toLowerCase().endsWith('.srt')) {
          vttContent = convertSrtToVtt(content);
        } else {
          vttContent = sanitizeVtt(content);
        }
        const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        createdBlobUrlsRef.current.add(blobUrl);

        const customSub: SubtitleTrackItem = {
          id: `custom-${Date.now()}`,
          lang: 'custom',
          label: `${file.name.replace(/\.(srt|vtt)$/i, '')} (Custom)`,
          url: blobUrl,
          isCustom: true
        };

        setSubtitlesList((prev) => [customSub, ...prev]);
        setSelectedSubtitleId(customSub.id);
        setCurrentSubtitleUrl(blobUrl);
        showToast(`Loaded: ${customSub.label}`);
        setIsSettingsMenuOpen(false);
        setSettingsTab('main');
      } catch (err) {
        console.error('Failed to parse custom subtitle file:', err);
        showToast('Invalid Subtitle File');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleMute = useCallback(() => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      showToast(nextMuted ? 'Muted' : `Volume ${Math.round(volume * 100)}%`);
    }
  }, [isMuted, volume, showToast]);

  const handleVolumeAdjust = useCallback((delta: number) => {
    if (videoRef.current) {
      const nextVol = Math.max(0, Math.min(1, Math.round((volume + delta) * 10) / 10));
      videoRef.current.volume = nextVol;
      videoRef.current.muted = nextVol === 0;
      setVolume(nextVol);
      setIsMuted(nextVol === 0);
      showToast(nextVol === 0 ? 'Muted' : `Volume ${Math.round(nextVol * 100)}%`);
    }
  }, [volume, showToast]);

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

  // Switch PixelDrain streaming route between normal proxy and fast CDN
  const handleSelectPixelDrainRoute = useCallback((route: PixelDrainRoute) => {
    const prevTime = videoRef.current?.currentTime || 0;
    const wasPlaying = isPlaying;
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
    setTimeout(() => {
      if (videoRef.current && prevTime > 0) {
        videoRef.current.currentTime = prevTime;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    }, 150);
  }, [isPlaying, showToast]);

  // Synchronize with external PixelDrain route changes (e.g. from SettingsPage)
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
  }, []);

  // Modular keyboard navigation & shortcuts hook (T4-03)
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
    enabled: true,
  });

  // Double tap to seek on mobile
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
          ref={videoRef}
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
          onError={() => {
            const err = videoRef.current?.error;
            console.warn('Stream playback error on stream index', selectedStreamIndex, err);

            // If the browser encounters a container/codec format error (MEDIA_ERR_SRC_NOT_SUPPORTED === 4),
            // switching mirrors cannot bypass native browser decoder constraints (e.g. MKV with AC-3).
            // Directly display the MKV/Codec notice modal so user can switch streams or open in VLC.
            if (err?.code === 4) {
              setPlaybackError(true);
              return;
            }

            // Automatic PixelDrain proxy failover to direct EU CDN mirror for network drops (one attempt only)
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

      {/* 2. Top Dark Atmospheric Gradient Overlay */}
      <div 
        className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/90 via-black/45 to-transparent pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 3. Bottom Dark Atmospheric Gradient Overlay */}
      <div 
        className={`absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 4. Top Unified Control Bar (Exact matching height h-10 sm:h-11 and glass material) */}
      <div 
        className={`absolute top-4 inset-x-4 sm:top-5 sm:inset-x-6 z-40 flex items-center justify-between transition-all duration-300 ease-out ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {/* Top-Left Group: Back Button + Server Switcher + Quality Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Back Button matching glass circle style */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/10 bg-[#0a0c14]/75 text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/15 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title="Exit Player (Esc)"
            aria-label="Exit Player"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Server Switcher Pill */}
          <div className="relative" ref={serverDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsServerDropdownOpen(!isServerDropdownOpen);
                setIsQualityDropdownOpen(false);
                setIsSettingsMenuOpen(false);
              }}
              className={`flex h-10 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isServerDropdownOpen 
                  ? 'bg-white/20 border-white/25 text-white ring-1 ring-white/20' 
                  : 'border-white/10 bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
              }`}
              title="Change Video Server"
            >
              <Server className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
              <span className="leading-none whitespace-nowrap">{currentServerName}</span>
              <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${isServerDropdownOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Server Dropdown Popover */}
            {isServerDropdownOpen && (
              <div 
                data-lenis-prevent
                className="absolute left-0 top-full mt-2 w-60 sm:w-64 rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50"
              >
                <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Select Server</span>
                  <span className="text-[10px] text-primary font-semibold">{serversList.length} Options</span>
                </div>
                <div className="space-y-1">
                  {serversList.map((srv) => {
                    const isSelected = srv.id === currentServerId;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => {
                          if (onSwitchServer) onSwitchServer(srv.id);
                          setIsServerDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left ${
                          isSelected
                            ? 'bg-white/15 text-white font-semibold shadow-sm border border-white/10'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{srv.name}</span>
                            {srv.badge && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-white/10 text-white/60">
                                {srv.badge}
                              </span>
                            )}
                          </div>
                          {srv.description && (
                            <span className="text-[10px] text-white/40 truncate mt-0.5">{srv.description}</span>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quality Pill (Clean main quality label + dimmer host name) */}
          {streams.length > 0 && (
            <div className="relative" ref={qualityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsQualityDropdownOpen(!isQualityDropdownOpen);
                  setIsServerDropdownOpen(false);
                  setIsSettingsMenuOpen(false);
                }}
                className={`flex h-10 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-3.5 text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  isQualityDropdownOpen
                    ? 'bg-white/20 border-white/25 text-white ring-1 ring-white/20'
                    : 'border-white/10 bg-[#0a0c14]/75 text-white/90 hover:bg-white/15 hover:text-white'
                }`}
                title="Select Stream Quality"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                <span className="font-bold text-white">{selectedStream?.quality || '1080p'}</span>
                <span className="text-[10px] font-normal text-white/50 hidden sm:inline">
                  {selectedStream?.provider === 'Cloudflare R2' ? 'R2' : selectedStream?.provider || ''}
                </span>
                {selectedStream?.bitrate && (
                  <span className="text-[10px] font-medium text-amber-400/90 hidden lg:inline">
                    · {selectedStream.bitrate}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 text-white/60 transition-transform ${isQualityDropdownOpen ? 'rotate-180 text-white' : ''}`} />
              </button>

              {/* Quality Dropdown Popover */}
              {isQualityDropdownOpen && (
                <div 
                  data-lenis-prevent
                  className="absolute left-0 top-full mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50 drawer-scroll"
                >
                  <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Stream Sources</span>
                    <span className="text-[10px] text-primary font-semibold">{streams.length} Available</span>
                  </div>
                  <div className="space-y-1">
                    {streams.map((s, idx) => {
                      const isSelected = idx === selectedStreamIndex;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStreamIndex(idx);
                            setIsQualityDropdownOpen(false);
                            showToast(`${s.quality} · ${s.provider}${s.bitrate ? ` (${s.bitrate})` : ''}`);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition ${
                            isSelected
                              ? 'bg-white/15 text-white font-semibold border border-white/10 shadow-sm'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-xs">{s.quality}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                                {s.codec}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium truncate max-w-[120px]">
                                {s.provider}
                              </span>
                              {s.isHls && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                                  HLS
                                </span>
                              )}
                              {s.isWebAudio ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                                  🎧 Web Audio
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                                  ⚠️ {s.audioCodec || 'DDP'} (VLC)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/50 flex-wrap">
                              {s.sizeFormatted && (
                                <span>{s.sizeFormatted}</span>
                              )}
                              {s.bitrate && (
                                <>
                                  {s.sizeFormatted && <span className="text-white/20">•</span>}
                                  <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                                    <Zap className="h-2.5 w-2.5 inline shrink-0" />
                                    {s.bitrate}
                                  </span>
                                </>
                              )}
                              {s.requiredSpeed && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                                    <Wifi className="h-2.5 w-2.5 inline shrink-0" />
                                    Req {s.requiredSpeed}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Center Group: Show Name & Context Pill */}
        <div className="hidden md:flex items-center">
          <div className="flex h-10 sm:h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0a0c14]/75 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150">
            <h2 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate max-w-xs lg:max-w-md">
              {item.title}
            </h2>
            {isTV && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-xs font-semibold text-primary/90 whitespace-nowrap">
                  S{season} · E{episode}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top-Right Group: Episode Switcher Pill */}
        {isTV && (
          <div className="flex h-10 sm:h-11 items-center gap-1 rounded-full border border-white/10 bg-[#0a0c14]/75 px-1.5 sm:px-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150">
            {/* Previous Episode */}
            <button
              type="button"
              onClick={onPrevEpisode}
              disabled={episode <= 1}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
              title="Previous Episode"
              aria-label="Previous Episode"
            >
              <ChevronLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.8} />
            </button>

            {/* S1 E1 Drawer Trigger */}
            <button
              type="button"
              onClick={onOpenEpisodeDrawer}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                isEpisodeDrawerOpen
                  ? 'bg-white/20 text-white border border-white/20 ring-1 ring-white/20 shadow-sm'
                  : 'bg-white/[0.08] text-white/90 border border-white/10 hover:bg-white/15 hover:text-white shadow-sm'
              }`}
              title="Select Episode"
            >
              <ListVideo className="h-3.5 w-3.5 shrink-0 text-white/80" strokeWidth={1.8} />
              <span className="leading-none">S{season} E{episode}</span>
            </button>

            {/* Next Episode */}
            <button
              type="button"
              onClick={onNextEpisode}
              disabled={episode >= totalEpisodes}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
              title="Next Episode"
              aria-label="Next Episode"
            >
              <ChevronRight className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* 5. Center Play Button & 10s Skip Controls */}
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
            className="group flex flex-col items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-white/15 bg-[#0a0c14]/70 text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:scale-105 hover:bg-white/20 hover:text-white active:scale-90"
            title="Rewind 10 Seconds (Left Arrow)"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 group-hover:-rotate-12 transition-transform" strokeWidth={1.8} />
            <span className="text-[9px] font-bold mt-0.5 leading-none">10</span>
          </button>

          {/* Large Translucent Center Play / Pause Circle (84px) */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="group flex items-center justify-center h-20 w-20 sm:h-22 sm:w-22 rounded-full border border-white/25 bg-[#0a0c14]/75 text-white shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/15 transition-all duration-200 hover:scale-105 hover:bg-[#0a0c14]/90 hover:border-white/35 active:scale-95"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 sm:h-9 sm:w-9 fill-current transition-transform group-hover:scale-105" />
            ) : (
              <Play className="h-8 w-8 sm:h-9 sm:w-9 fill-current ml-1 transition-transform group-hover:scale-105" />
            )}
          </button>

          {/* Skip +10s */}
          <button
            type="button"
            onClick={() => handleSkip(10)}
            className="group flex flex-col items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-white/15 bg-[#0a0c14]/70 text-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:scale-105 hover:bg-white/20 hover:text-white active:scale-90"
            title="Fast Forward 10 Seconds (Right Arrow)"
            aria-label="Fast forward 10 seconds"
          >
            <RotateCw className="h-5 w-5 sm:h-6 sm:w-6 group-hover:rotate-12 transition-transform" strokeWidth={1.8} />
            <span className="text-[9px] font-bold mt-0.5 leading-none">10</span>
          </button>
        </div>
      </div>

      {/* 6. On-Screen Shortcut Toast Feedback (Positioned at top so it never blocks center controls) */}
      {toastMessage && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="px-5 py-2 rounded-full border border-white/20 bg-black/85 text-white font-semibold text-xs sm:text-sm shadow-2xl backdrop-blur-2xl tracking-wide flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 7. Loading Indicator */}
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

      {/* 8. Error State (No Streams Found) */}
      {!loading && error && streams.length === 0 && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center max-w-md mx-auto">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Streams Found on {currentServerName}</h3>
          <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{error}</p>
          <div className="flex items-center gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                const fetchFn = currentServerId === 'pengu' ? fetchPenguStreams : fetchHDHubStreams;
                fetchFn(item.tmdbId || item.id, item.media_type, item.imdbId, season, episode, true)
                  .then((res) => {
                    setStreams(res.streams);
                    if (res.streams.length > 0) setSelectedStreamIndex(0);
                    else setError(res.error || 'No streams available');
                  })
                  .finally(() => setLoading(false));
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition active:scale-95 border border-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Search</span>
            </button>
            {onSwitchServer && (
              <button
                type="button"
                onClick={() => onSwitchServer('cinemaos')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-primary text-black hover:brightness-110 transition active:scale-95 shadow-md"
              >
                <Film className="h-3.5 w-3.5 fill-current" />
                <span>Switch to CinemaOS</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 9. Next Episode Floating Prompt (Last 30 seconds) */}
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

      {/* 10. Bottom Progress Bar & Player Controls */}
      <div 
        className={`absolute bottom-0 inset-x-0 z-40 p-4 sm:p-6 transition-all duration-300 ease-out ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        {/* Progress Bar with Designer Spec: 24px/40px hit area, 4px resting -> 8px hover, hover preview line, 14px handle, glass tooltip */}
        <div 
          ref={scrubberRef}
          role="slider"
          tabIndex={0}
          aria-label="Video scrubber"
          aria-valuemin={0}
          aria-valuemax={Math.round(validDuration)}
          aria-valuenow={Math.round(currentTime)}
          onKeyDown={handleScrubberKeyDown}
          onMouseDown={handleScrubberMouseDown}
          onTouchStart={handleScrubberTouchStart}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
          className="relative group/progress mb-3 sm:mb-4 h-10 sm:h-6 flex items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full"
        >
          {/* Time Tooltip on Hover / Drag (Dark glass pill above pointer) */}
          {hoverProgress && (
            <div 
              style={{ left: `${Math.max(2, Math.min(98, hoverProgress.xPercent))}%` }}
              className="absolute -top-10 -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-white/20 text-white font-mono text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-30"
            >
              <span>{formatTime(hoverProgress.time)}</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-zinc-950/90" />
            </div>
          )}

          {/* Visual Track Bar: Resting 4px, Expands to 8px on hover or drag with 150ms ease */}
          <div className={`relative w-full rounded-full bg-white/20 overflow-hidden transition-all duration-150 ease-out ${
            isDragging ? 'h-2' : 'h-1 group-hover/progress:h-2'
          }`}>
            {/* 1. Buffered Layer (White at ~35% opacity) */}
            <div 
              style={{ width: `${Math.max(0, Math.min(100, bufferedPercent))}%` }}
              className="absolute top-0 bottom-0 left-0 bg-white/35 rounded-full transition-all duration-200 pointer-events-none"
            />

            {/* 2. Hover Preview Line (Slightly brighter section from start to cursor) */}
            {hoverProgress && (
              <div 
                style={{ width: `${Math.max(0, Math.min(100, hoverProgress.xPercent))}%` }}
                className="absolute top-0 bottom-0 left-0 bg-white/25 rounded-full pointer-events-none transition-all duration-75"
              />
            )}

            {/* 3. Played Layer (Solid Primary Accent) */}
            <div 
              style={{ width: `${Math.max(0, Math.min(100, playedPercent))}%` }}
              className="absolute top-0 bottom-0 left-0 bg-primary rounded-full pointer-events-none transition-all duration-75"
            />
          </div>

          {/* 4. Handle Dot (14px white circle, soft shadow, appears on hover, always visible on mobile, grows when dragging) */}
          <div 
            style={{ left: `${Math.max(0, Math.min(100, playedPercent))}%` }}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-150 ease-out ${
              isDragging 
                ? 'opacity-100 scale-125' 
                : 'opacity-100 sm:opacity-0 sm:group-hover/progress:opacity-100 scale-100 sm:scale-90 sm:group-hover/progress:scale-100'
            }`}
          />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play/Pause Button (40px hit area) */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center group/vol">
              <button
                type="button"
                onClick={handleToggleMute}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                aria-label="Mute / Unmute"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" strokeWidth={1.8} />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <Volume2 className="h-5 w-5" strokeWidth={1.8} />
                )}
              </button>

              {/* Expanding Horizontal Slider */}
              <div className="w-0 group-hover/vol:w-20 transition-all duration-200 overflow-hidden flex items-center pr-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeSliderChange}
                  className="w-18 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary"
                  title="Volume"
                  aria-label="Volume slider"
                />
              </div>
            </div>

            {/* Time Indicators (Tabular Numbers) */}
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums ml-1 select-none">
              <span className="font-semibold text-white">{formatTime(currentTime)}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality Badge, Screenshot, PiP, Settings, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Stream Quality Pill (Opens Quality Menu) */}
            {selectedStream && (
              <button
                type="button"
                onClick={() => setIsQualityDropdownOpen(!isQualityDropdownOpen)}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 transition active:scale-95"
                title="Change Stream Quality"
              >
                <span>{selectedStream.quality}</span>
                <span className="text-[10px] text-white/50 font-normal">({selectedStream.codec})</span>
              </button>
            )}

            {/* Screenshot Button (Hidden on Mobile) */}
            <button
              type="button"
              onClick={handleScreenshot}
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95"
              title="Capture Screenshot"
              aria-label="Capture Screenshot"
            >
              <Camera className="h-5 w-5" strokeWidth={1.8} />
            </button>

            {/* Picture-in-Picture (Hidden on Mobile) */}
            <button
              type="button"
              onClick={handleTogglePiP}
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white transition active:scale-95"
              title="Picture-in-Picture"
              aria-label="Picture-in-Picture"
            >
              <PictureInPicture2 className="h-5 w-5" strokeWidth={1.8} />
            </button>

            {/* Subtitles / CC Quick Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (isSettingsMenuOpen && settingsTab === 'subtitles') {
                  setIsSettingsMenuOpen(false);
                  setSettingsTab('main');
                } else {
                  setIsSettingsMenuOpen(true);
                  setSettingsTab('subtitles');
                  setIsQualityDropdownOpen(false);
                }
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
                selectedSubtitleId
                  ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                  : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
              title="Subtitles & Closed Captions"
              aria-label="Subtitles & Closed Captions"
            >
              <Subtitles className="h-5 w-5" strokeWidth={1.8} />
            </button>

            {/* Settings Menu Button */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen(!isSettingsMenuOpen);
                  setSettingsTab('main');
                  setIsQualityDropdownOpen(false);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
                  isSettingsMenuOpen ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
                title="Playback Settings"
                aria-label="Playback Settings"
              >
                <Settings className={`h-5 w-5 transition-transform duration-200 ${isSettingsMenuOpen ? 'rotate-45' : ''}`} strokeWidth={1.8} />
              </button>

              {/* Settings Dropdown Popover */}
              {isSettingsMenuOpen && (
                <div 
                  data-lenis-prevent
                  className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl border border-white/15 bg-zinc-950/95 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50 max-h-[80vh] overflow-y-auto"
                >
                  {settingsTab === 'main' ? (
                    <div className="space-y-1">
                      <div className="px-3 py-1.5 border-b border-white/10 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Playback Settings</span>
                      </div>

                      {/* Audio Track Submenu */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab('audio')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AudioLines className="h-3.5 w-3.5 text-white/60 shrink-0" />
                          <span>Audio Track</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/50 min-w-0 max-w-[120px]">
                          <span className="truncate">{activeAudioLabel}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        </div>
                      </button>

                      {/* Subtitles Submenu */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab('subtitles')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Subtitles className="h-3.5 w-3.5 text-white/60 shrink-0" />
                          <span>Subtitles (CC)</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/50 min-w-0 max-w-[120px]">
                          <span className="truncate">
                            {selectedSubtitleId ? (subtitlesList.find((s) => s.id === selectedSubtitleId)?.label || 'On') : 'Off'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        </div>
                      </button>

                      {/* Playback Speed Submenu */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab('speed')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2">
                          <RotateCw className="h-3.5 w-3.5 text-white/60" />
                          <span>Playback Speed</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/50">
                          <span>{playbackSpeed}x</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>

                      {/* Aspect Ratio Submenu */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab('aspect')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Film className="h-3.5 w-3.5 text-white/60" />
                          <span>Aspect Ratio</span>
                        </div>
                        <div className="flex items-center gap-1 text-white/50">
                          <span className="capitalize">{objectFit}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>

                      {/* Stream Quality Submenu */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab('quality')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-3.5 w-3.5 text-white/60" />
                          <span>Source Quality</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/50">
                          <span>{selectedStream?.quality || '1080p'}</span>
                          {selectedStream?.bitrate && (
                            <span className="text-amber-400/90 font-medium text-[11px]">· {selectedStream.bitrate}</span>
                          )}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>

                      {/* PixelDrain Route Submenu */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab('pixeldrain')}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-rose-400" />
                          <span>PixelDrain Route</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/50">
                          <span>{pixelDrainRoute === 'cdn' ? 'Fast CDN' : 'Normal'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>

                      {/* Copy Stream Link */}
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition border-t border-white/10 mt-1"
                      >
                        <div className="flex items-center gap-2">
                          <Copy className="h-3.5 w-3.5 text-white/60" />
                          <span>Copy Stream Link</span>
                        </div>
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ChevronRight className="h-3.5 w-3.5 opacity-0" />}
                      </button>
                    </div>
                  ) : settingsTab === 'audio' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                        <button
                          type="button"
                          onClick={() => setSettingsTab('main')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-bold text-white">Audio Tracks</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                        {audioOptions.map((opt: AudioOptionItem) => {
                          const isSelected = activeAudioLabel === opt.label || (selectedAudioLang === opt.label);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectAudioOption(opt)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition ${
                                isSelected
                                  ? 'bg-white/15 text-white font-semibold'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <AudioLines className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                                <span className="truncate">{opt.label}</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </button>
                          );
                        })}

                        {/* Informational card for audio compatibility */}
                        {selectedStream?.url && (
                          <div className={`mt-2.5 p-2.5 rounded-xl border space-y-2 ${
                            selectedStream.isWebAudio === false 
                              ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' 
                              : 'bg-white/5 border-white/10 text-white/80'
                          }`}>
                            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {selectedStream.isWebAudio === false 
                                  ? `${selectedStream.audioCodec || 'DDP 5.1'} Audio (No Web Sound)` 
                                  : 'Multi-Audio Tracks & VLC'}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/70 leading-relaxed">
                              {selectedStream.isWebAudio === false
                                ? 'Web browsers lack Dolby Digital Plus / TrueHD decoders. Open directly in VLC media player for loud, full multi-channel surround sound, or pick an AAC/HLS stream in Stream Sources.'
                                : 'Web browsers can only play Track 1 from direct video files. To switch secondary audio languages or Atmos dubs, open directly in VLC:'}
                            </p>
                            <div className="flex flex-col gap-1.5 pt-0.5">
                              <a
                                href={`vlc://${selectedStream.url}`}
                                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-primary text-black font-semibold text-[11px] hover:brightness-110 active:scale-95 transition text-center shadow-sm"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Open in VLC (Full Audio & Surround)</span>
                              </a>
                              <button
                                type="button"
                                onClick={handleCopyLink}
                                className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-[11px] transition"
                              >
                                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>{copied ? 'Link Copied!' : 'Copy Stream Link for VLC/MPV'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : settingsTab === 'subtitles' ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSettingsTab('main')}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-bold text-white">Subtitles</span>
                        </div>
                        {/* Upload Custom Subtitle Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                          title="Upload .srt or .vtt subtitle"
                        >
                          <Upload className="h-3 w-3" />
                          <span>Upload</span>
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                        {/* Option: Off */}
                        <button
                          type="button"
                          onClick={() => handleSelectSubtitle(null)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition ${
                            !selectedSubtitleId
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span>Off</span>
                          {!selectedSubtitleId && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>

                        {/* Loading State */}
                        {subtitlesLoading && subtitlesList.length === 0 && (
                          <div className="py-4 text-center text-xs text-white/40">
                            Searching subtitles...
                          </div>
                        )}

                        {/* Subtitles List */}
                        {subtitlesList.map((sub) => {
                          const isSelected = selectedSubtitleId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSelectSubtitle(sub)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition ${
                                isSelected
                                  ? 'bg-white/15 text-white font-semibold'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                {sub.isCustom ? (
                                  <FileText className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                                ) : (
                                  <Subtitles className="h-3.5 w-3.5 text-white/40 shrink-0" />
                                )}
                                <span className="truncate">{sub.label}</span>
                                {sub.isCustom && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 shrink-0">
                                    Local
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </button>
                          );
                        })}

                        {!subtitlesLoading && subtitlesList.length === 0 && (
                          <div className="py-3 px-2 text-center text-xs text-white/40">
                            No cloud subtitles found. You can upload your own .srt / .vtt file above.
                          </div>
                        )}
                      </div>

                      {/* Subtitle Size Selector */}
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-white/80">Subtitle Size</span>
                          <span className="text-[10px] font-bold text-primary capitalize">{subtitleSize}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(['small', 'medium', 'large'] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => updateSettings({ subtitleSize: size })}
                              className={`py-1 rounded-lg text-[10px] font-semibold capitalize transition ${
                                subtitleSize === size
                                  ? 'bg-primary text-black font-bold shadow'
                                  : 'bg-white/10 hover:bg-white/15 text-white/70 hover:text-white'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subtitle Timing Offset Control (T3-08) */}
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-white/80">Timing Offset</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-primary">
                              {subtitleOffset > 0 ? `+${subtitleOffset.toFixed(1)}s` : `${subtitleOffset.toFixed(1)}s`}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateSettings({ subtitleOffset: 0 })}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 transition"
                              title="Reset subtitle offset to 0 seconds"
                              aria-label="Reset subtitle offset to 0 seconds"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={-5.0}
                          max={5.0}
                          step={0.5}
                          value={subtitleOffset}
                          onChange={(e) => updateSettings({ subtitleOffset: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                          aria-label="Subtitle timing offset slider"
                        />
                        <div className="flex justify-between text-[9px] text-white/40">
                          <span>Earlier (-5s)</span>
                          <span>Sync (0s)</span>
                          <span>Later (+5s)</span>
                        </div>
                      </div>
                    </div>
                  ) : settingsTab === 'speed' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                        <button
                          type="button"
                          onClick={() => setSettingsTab('main')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-bold text-white">Playback Speed</span>
                      </div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => {
                            setPlaybackSpeed(spd);
                            if (videoRef.current) videoRef.current.playbackRate = spd;
                            showToast(`${spd}x Speed`);
                            setIsSettingsMenuOpen(false);
                            setSettingsTab('main');
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition ${
                            playbackSpeed === spd
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span>{spd === 1 ? 'Normal (1.0x)' : `${spd}x`}</span>
                          {playbackSpeed === spd && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  ) : settingsTab === 'aspect' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                        <button
                          type="button"
                          onClick={() => setSettingsTab('main')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-bold text-white">Aspect Ratio</span>
                      </div>
                      {[
                        { id: 'contain', label: 'Contain (Default 16:9)' },
                        { id: 'cover', label: 'Cover (Zoom to Fill)' }
                      ].map((asp) => (
                        <button
                          key={asp.id}
                          type="button"
                          onClick={() => {
                            setObjectFit(asp.id as 'contain' | 'cover');
                            showToast(`Aspect: ${asp.id}`);
                            setIsSettingsMenuOpen(false);
                            setSettingsTab('main');
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition ${
                            objectFit === asp.id
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span>{asp.label}</span>
                          {objectFit === asp.id && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  ) : settingsTab === 'pixeldrain' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                        <button
                          type="button"
                          onClick={() => setSettingsTab('main')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-bold text-white">PixelDrain Route</span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {[
                          {
                            id: 'normal',
                            name: 'Normal (Proxy)',
                            desc: '/api/pixeldrain/:id'
                          },
                          {
                            id: 'cdn',
                            name: 'Fast CDN Mirror',
                            desc: '/api/pixeldrain-cdn/:id'
                          }
                        ].map((r) => {
                          const isSelected = pixelDrainRoute === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleSelectPixelDrainRoute(r.id as PixelDrainRoute)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition ${
                                isSelected
                                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">{r.name}</span>
                                  {isSelected && (
                                    <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-white/40 font-mono">{r.desc}</div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-rose-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/10 mb-1">
                        <button
                          type="button"
                          onClick={() => setSettingsTab('main')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-xs font-bold text-white">Stream Sources</span>
                      </div>
                      {streams.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStreamIndex(idx);
                            setIsSettingsMenuOpen(false);
                            setSettingsTab('main');
                            showToast(`${s.quality} · ${s.provider}${s.bitrate ? ` (${s.bitrate})` : ''}`);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition ${
                            idx === selectedStreamIndex
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-xs">{s.quality}</span>
                              <span className="text-[10px] text-white/60">({s.provider})</span>
                              {s.isHls && (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                  HLS
                                </span>
                              )}
                              {s.isWebAudio ? (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                                  🎧 Web Audio
                                </span>
                              ) : (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                                  ⚠️ {s.audioCodec || 'DDP'} (VLC)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50 flex-wrap">
                              {s.bitrate && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                                  <Zap className="h-2.5 w-2.5 inline shrink-0" />
                                  {s.bitrate}
                                </span>
                              )}
                              {s.requiredSpeed && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                                    <Wifi className="h-2.5 w-2.5 inline shrink-0" />
                                    Req {s.requiredSpeed}
                                  </span>
                                </>
                              )}
                              {s.sizeFormatted && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span>{s.sizeFormatted}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {idx === selectedStreamIndex && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/15 hover:text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <Maximize className="h-5 w-5" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 11. Codec / MKV Notice Modal (When browser native decoder fails on multi-channel MKV/DDP) */}
      {playbackError && selectedStream && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-lg w-full rounded-2xl border border-white/15 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => setPlaybackError(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
              title="Dismiss Notice"
              aria-label="Dismiss Notice"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3.5 mb-4 pr-6">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Browser Playback Notice</h4>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    MKV / DDP 5.1
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  This direct stream is encoded in an <strong>MKV container</strong> with multi-channel audio from <strong className="text-white/80">{selectedStream.provider}</strong>. Your current browser cannot natively decode this audio format without an external player.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-white/10">
              <a
                href={`vlc://${selectedStream.url}`}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-black font-semibold text-xs transition hover:brightness-110 active:scale-95 shadow-md text-center"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Open in VLC Player</span>
              </a>

              <a
                href={selectedStream.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs transition hover:bg-white/20 active:scale-95 border border-white/10 text-center"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Direct Stream</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white font-medium text-xs transition hover:bg-white/10 active:scale-95 border border-white/10"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Stream Link'}</span>
              </button>

              {streams.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = (selectedStreamIndex + 1) % streams.length;
                    setSelectedStreamIndex(next);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 text-white/80 hover:text-white font-medium text-xs transition hover:bg-white/10 active:scale-95 border border-white/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Try Alternate Stream</span>
                </button>
              )}

              {onSwitchServer && (
                <button
                  type="button"
                  onClick={() => onSwitchServer('cinemaos')}
                  className="sm:col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition active:scale-95 border border-white/10 text-center"
                >
                  <Film className="h-3.5 w-3.5 text-primary" />
                  <span>Switch back to CinemaOS Web Player (Instant)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HDHubPlayer;

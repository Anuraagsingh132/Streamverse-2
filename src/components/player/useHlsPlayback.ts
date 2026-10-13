import { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { HDHubStream } from '../../services/hdhub';

export interface NativeAudioTrack {
  id: string;
  label: string;
  language?: string;
  index: number;
}

export interface UseHlsPlaybackOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  selectedStream: HDHubStream | null;
  onResetBuffered?: () => void;
}

export interface UseHlsPlaybackReturn {
  hlsRef: React.RefObject<Hls | null>;
  nativeAudioTracks: NativeAudioTrack[];
  setNativeAudioTracks: React.Dispatch<React.SetStateAction<NativeAudioTrack[]>>;
  playbackError: boolean;
  setPlaybackError: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useHlsPlayback({
  videoRef,
  selectedStream,
  onResetBuffered
}: UseHlsPlaybackOptions): UseHlsPlaybackReturn {
  const hlsRef = useRef<Hls | null>(null);
  const [nativeAudioTracks, setNativeAudioTracks] = useState<NativeAudioTrack[]>([]);
  const [playbackError, setPlaybackError] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedStream?.url) return;

    setPlaybackError(false);
    onResetBuffered?.();

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
                backBufferLength: 20,
                maxBufferSize: 30 * 1024 * 1024
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
      if (video && !isHls) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [selectedStream?.url, videoRef, onResetBuffered]);

  return {
    hlsRef,
    nativeAudioTracks,
    setNativeAudioTracks,
    playbackError,
    setPlaybackError
  };
}

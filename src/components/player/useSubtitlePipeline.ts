import { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem } from '../../types/media';
import { getImdbId } from '../../services/tmdb';
import {
  fetchAvailableSubtitles,
  fetchSubtitleVttBlob,
  convertSrtToVtt,
  sanitizeVtt,
  revokeSubtitleBlob,
  SubtitleTrackItem
} from '../../services/subtitles';

export interface UseSubtitlePipelineOptions {
  item: MediaItem;
  season?: number;
  episode?: number;
  subtitleOffset?: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showToast: (msg: string) => void;
  onCloseSettings?: () => void;
}

export interface UseSubtitlePipelineReturn {
  subtitlesList: SubtitleTrackItem[];
  selectedSubtitleId: string | null;
  currentSubtitleUrl: string | null;
  subtitlesLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleSelectSubtitle: (sub: SubtitleTrackItem | null) => Promise<void>;
  handleUploadCustomSubtitle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTrackLoad: () => void;
  setSelectedSubtitleId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentSubtitleUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useSubtitlePipeline({
  item,
  season = 1,
  episode = 1,
  subtitleOffset = 0,
  videoRef,
  showToast,
  onCloseSettings
}: UseSubtitlePipelineOptions): UseSubtitlePipelineReturn {
  const [subtitlesList, setSubtitlesList] = useState<SubtitleTrackItem[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [currentSubtitleUrl, setCurrentSubtitleUrl] = useState<string | null>(null);
  const [subtitlesLoading, setSubtitlesLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());
  const prevSubtitleOffsetRef = useRef<number>(subtitleOffset);
  const latestSelectionIdRef = useRef<number>(0);
  const currentSubtitleUrlRef = useRef<string | null>(null);

  // 1. Fetch available Subtitles for this title
  useEffect(() => {
    let isCancelled = false;

    async function loadSubs() {
      setSubtitlesLoading(true);
      if (currentSubtitleUrlRef.current) {
        revokeSubtitleBlob(currentSubtitleUrlRef.current);
        createdBlobUrlsRef.current.delete(currentSubtitleUrlRef.current);
        currentSubtitleUrlRef.current = null;
      }
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

  // 2. Dynamically shift subtitle cues when timing offset changes
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
  }, [subtitleOffset, videoRef]);

  // 3. Track load callback for initial offset application
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
  }, [subtitleOffset, videoRef]);

  // 4. Select subtitle track
  const handleSelectSubtitle = useCallback(
    async (sub: SubtitleTrackItem | null) => {
      const selectionId = ++latestSelectionIdRef.current;

      // Revoke previous blob URL immediately when a new subtitle track is selected
      if (currentSubtitleUrlRef.current && currentSubtitleUrlRef.current !== sub?.url) {
        revokeSubtitleBlob(currentSubtitleUrlRef.current);
        createdBlobUrlsRef.current.delete(currentSubtitleUrlRef.current);
        currentSubtitleUrlRef.current = null;
      }

      if (!sub) {
        setSelectedSubtitleId(null);
        setCurrentSubtitleUrl(null);
        showToast('Subtitles Off');
        onCloseSettings?.();
        return;
      }

      try {
        showToast(`Loading ${sub.label}...`);
        let vttUrl = sub.url;
        if (sub.url.startsWith('http')) {
          vttUrl = await fetchSubtitleVttBlob(sub.url);
          // If another selection occurred while fetching, clean up and abandon
          if (selectionId !== latestSelectionIdRef.current) {
            revokeSubtitleBlob(vttUrl);
            return;
          }
          createdBlobUrlsRef.current.add(vttUrl);
        } else if (selectionId !== latestSelectionIdRef.current) {
          return;
        }

        currentSubtitleUrlRef.current = vttUrl;
        setSelectedSubtitleId(sub.id);
        setCurrentSubtitleUrl(vttUrl);
        showToast(`Subtitles: ${sub.label}`);
        onCloseSettings?.();
      } catch (err) {
        if (selectionId !== latestSelectionIdRef.current) return;
        console.error('Failed to load subtitle track:', err);
        showToast('Failed to load subtitle');
      }
    },
    [showToast, onCloseSettings]
  );

  // 5. Upload custom subtitle (.srt, .vtt)
  const handleUploadCustomSubtitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const selectionId = ++latestSelectionIdRef.current;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (selectionId !== latestSelectionIdRef.current) return;
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

          // Revoke previous blob URL immediately
          if (currentSubtitleUrlRef.current && currentSubtitleUrlRef.current !== blobUrl) {
            revokeSubtitleBlob(currentSubtitleUrlRef.current);
            createdBlobUrlsRef.current.delete(currentSubtitleUrlRef.current);
          }

          currentSubtitleUrlRef.current = blobUrl;
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
          onCloseSettings?.();
        } catch (err) {
          console.error('Failed to parse custom subtitle file:', err);
          showToast('Invalid Subtitle File');
        }
      };
      reader.readAsText(file);
      // Reset input value so users can re-upload if needed
      e.target.value = '';
    },
    [showToast, onCloseSettings]
  );

  // 6. Cleanup all allocated Object URLs on unmount
  useEffect(() => {
    const urls = createdBlobUrlsRef.current;
    return () => {
      urls.forEach((url) => {
        revokeSubtitleBlob(url);
      });
      urls.clear();
    };
  }, []);

  return {
    subtitlesList,
    selectedSubtitleId,
    currentSubtitleUrl,
    subtitlesLoading,
    fileInputRef,
    handleSelectSubtitle,
    handleUploadCustomSubtitle,
    handleTrackLoad,
    setSelectedSubtitleId,
    setCurrentSubtitleUrl
  };
}

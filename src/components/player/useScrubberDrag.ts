import { useState, useRef, useEffect, useCallback, RefObject } from 'react';

export interface UseScrubberDragProps {
  scrubberRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  duration: number;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
}

export interface HoverProgress {
  xPercent: number;
  time: number;
}

export function computeScrubPosition(
  clientX: number,
  rect: { left: number; width: number },
  duration: number
): { percent: number; time: number } {
  const rawX = clientX - rect.left;
  const clampedX = Math.max(0, Math.min(rect.width, rawX));
  const percent = rect.width > 0 ? (clampedX / rect.width) * 100 : 0;
  const validDur = Number.isFinite(duration) && duration > 0 ? duration : 100;
  const time = Math.max(0, Math.min(validDur, (percent / 100) * validDur));
  return { percent, time };
}

/**
 * Custom hook to encapsulate the scrubber bar dragging, touch tracking,
 * percentage clamp math, and hover time preview calculations for HTML5 video playback.
 */
export function useScrubberDrag({
  scrubberRef,
  videoRef,
  duration,
  onSeek,
  onSkip,
}: UseScrubberDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<HoverProgress | null>(null);
  const wasPlayingBeforeDragRef = useRef(false);

  const calculateScrubTime = useCallback(
    (clientX: number): { percent: number; time: number } => {
      if (!scrubberRef.current) return { percent: 0, time: 0 };
      const rect = scrubberRef.current.getBoundingClientRect();
      return computeScrubPosition(clientX, rect, duration);
    },
    [duration, scrubberRef]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsDragging(true);
      wasPlayingBeforeDragRef.current = Boolean(videoRef.current && !videoRef.current.paused);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      const { percent, time } = calculateScrubTime(e.clientX);
      setHoverProgress({ xPercent: percent, time });
      onSeek(time);
    },
    [calculateScrubTime, onSeek, videoRef]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) return;
      setIsDragging(true);
      wasPlayingBeforeDragRef.current = Boolean(videoRef.current && !videoRef.current.paused);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      const { percent, time } = calculateScrubTime(e.touches[0].clientX);
      setHoverProgress({ xPercent: percent, time });
      onSeek(time);
    },
    [calculateScrubTime, onSeek, videoRef]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging) return;
      const { percent, time } = calculateScrubTime(e.clientX);
      setHoverProgress({ xPercent: percent, time });
    },
    [isDragging, calculateScrubTime]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverProgress(null);
    }
  }, [isDragging]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSkip(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSkip(5);
      } else if (e.key === 'Home') {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (duration > 0) onSeek(duration);
      }
    },
    [duration, onSeek, onSkip]
  );

  // Global window listeners while actively dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const { percent, time } = calculateScrubTime(e.clientX);
      setHoverProgress({ xPercent: percent, time });
      onSeek(time);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const { percent, time } = calculateScrubTime(e.touches[0].clientX);
      setHoverProgress({ xPercent: percent, time });
      onSeek(time);
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      setHoverProgress(null);
      const { time } = calculateScrubTime(e.clientX);
      onSeek(time);
      if (wasPlayingBeforeDragRef.current && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };

    const handleWindowTouchEnd = (e: TouchEvent) => {
      setIsDragging(false);
      setHoverProgress(null);
      const touch = e.changedTouches[0];
      if (touch) {
        const { time } = calculateScrubTime(touch.clientX);
        onSeek(time);
      }
      if (wasPlayingBeforeDragRef.current && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [isDragging, calculateScrubTime, onSeek, videoRef]);

  return {
    isDragging,
    hoverProgress,
    handleMouseDown,
    handleTouchStart,
    handleMouseMove,
    handleMouseLeave,
    handleKeyDown,
  };
}

import { useEffect, useRef } from 'react';

export interface PlayerShortcutsHandlers {
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onVolumeAdjust: (delta: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onCloseMenus: () => void;
  enabled?: boolean;
}

/**
 * Custom hook to handle comprehensive cinema hotkeys (Space, K, J, L, Arrow keys, F, M, Esc)
 * while safely ignoring inputs and textareas.
 */
export function usePlayerShortcuts(handlers: PlayerShortcutsHandlers) {
  const handlersRef = useRef<PlayerShortcutsHandlers>(handlers);
  handlersRef.current = handlers;

  const enabled = handlers.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing into an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Spacebar guard: do not toggle playback if focused element is a BUTTON, SELECT, or input
      if (key === ' ' || e.code === 'Space') {
        if (
          target &&
          (target.tagName === 'BUTTON' ||
            target.tagName === 'SELECT' ||
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        handlersRef.current.onTogglePlay();
        return;
      }

      switch (key) {
        case 'k':
          e.preventDefault();
          handlersRef.current.onTogglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          handlersRef.current.onSkip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          handlersRef.current.onSkip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handlersRef.current.onVolumeAdjust(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          handlersRef.current.onVolumeAdjust(-0.1);
          break;
        case 'm':
          e.preventDefault();
          handlersRef.current.onToggleMute();
          break;
        case 'f':
          e.preventDefault();
          handlersRef.current.onToggleFullscreen();
          break;
        case 'escape':
          handlersRef.current.onCloseMenus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}

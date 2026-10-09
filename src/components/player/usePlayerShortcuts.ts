import { useEffect } from 'react';

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
  const {
    onTogglePlay,
    onSkip,
    onVolumeAdjust,
    onToggleMute,
    onToggleFullscreen,
    onCloseMenus,
    enabled = true,
  } = handlers;

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

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          onSkip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          onSkip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          onVolumeAdjust(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          onVolumeAdjust(-0.1);
          break;
        case 'm':
          e.preventDefault();
          onToggleMute();
          break;
        case 'f':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'escape':
          onCloseMenus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    onTogglePlay,
    onSkip,
    onVolumeAdjust,
    onToggleMute,
    onToggleFullscreen,
    onCloseMenus,
  ]);
}

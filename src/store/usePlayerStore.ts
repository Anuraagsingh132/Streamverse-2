import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/media';

export const PLAYER_CHANGE_EVENT = 'streamverse_player_change';

export interface PlayerState {
  item: MediaItem | null;
  season: number;
  episode: number;
  isOpen: boolean;
}

let globalPlayerState: PlayerState = {
  item: null,
  season: 1,
  episode: 1,
  isOpen: false,
};

function emitPlayerChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PLAYER_CHANGE_EVENT, { detail: globalPlayerState }));
  }
}

/**
 * Global reactive hook for video player state orchestration across Streamverse.
 */
export function usePlayerStore() {
  const [state, setState] = useState<PlayerState>(globalPlayerState);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<PlayerState>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      } else {
        setState({ ...globalPlayerState });
      }
    };

    window.addEventListener(PLAYER_CHANGE_EVENT, handleSync);
    return () => {
      window.removeEventListener(PLAYER_CHANGE_EVENT, handleSync);
    };
  }, []);

  const playMedia = useCallback((item: MediaItem, episode: number = 1, season: number = 1) => {
    globalPlayerState = {
      item,
      season: season || 1,
      episode: episode || 1,
      isOpen: true,
    };
    emitPlayerChange();
  }, []);

  const closePlayer = useCallback(() => {
    globalPlayerState = {
      ...globalPlayerState,
      item: null,
      isOpen: false,
    };
    emitPlayerChange();
  }, []);

  const setEpisode = useCallback((episode: number, season: number = 1) => {
    globalPlayerState = {
      ...globalPlayerState,
      episode,
      season,
    };
    emitPlayerChange();
  }, []);

  return {
    playingItem: state.item,
    playingSeason: state.season,
    playingEpisode: state.episode,
    isPlayerOpen: state.isOpen,
    playMedia,
    closePlayer,
    setEpisode,
  };
}

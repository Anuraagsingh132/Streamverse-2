import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '../types/media';

export const UI_CHANGE_EVENT = 'streamverse_ui_change';

export interface UIState {
  currentRoute: string;
  previousRoute: string;
  isSearchOpen: boolean;
  selectedItem: MediaItem | null;
  toastMessage: string | null;
}

let globalUIState: UIState = {
  currentRoute: 'home',
  previousRoute: 'home',
  isSearchOpen: false,
  selectedItem: null,
  toastMessage: null,
};

let toastTimeout: any = null;

function emitUIChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UI_CHANGE_EVENT, { detail: globalUIState }));
  }
}

/**
 * Global reactive hook for application navigation, modal state, and UI notifications.
 */
export function useUIStore() {
  const [state, setState] = useState<UIState>(globalUIState);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<UIState>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      } else {
        setState({ ...globalUIState });
      }
    };

    window.addEventListener(UI_CHANGE_EVENT, handleSync);
    return () => {
      window.removeEventListener(UI_CHANGE_EVENT, handleSync);
    };
  }, []);

  const setRoute = useCallback((route: string) => {
    globalUIState = {
      ...globalUIState,
      previousRoute: globalUIState.currentRoute,
      currentRoute: route,
    };
    emitUIChange();
  }, []);

  const setSearchOpen = useCallback((open: boolean) => {
    globalUIState = {
      ...globalUIState,
      isSearchOpen: open,
    };
    emitUIChange();
  }, []);

  const toggleSearch = useCallback(() => {
    globalUIState = {
      ...globalUIState,
      isSearchOpen: !globalUIState.isSearchOpen,
    };
    emitUIChange();
  }, []);

  const setSelectedItem = useCallback((item: MediaItem | null) => {
    globalUIState = {
      ...globalUIState,
      selectedItem: item,
    };
    emitUIChange();
  }, []);

  const showToast = useCallback((message: string, duration: number = 3000) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    globalUIState = {
      ...globalUIState,
      toastMessage: message,
    };
    emitUIChange();

    toastTimeout = setTimeout(() => {
      globalUIState = {
        ...globalUIState,
        toastMessage: null,
      };
      emitUIChange();
    }, duration);
  }, []);

  return {
    currentRoute: state.currentRoute,
    previousRoute: state.previousRoute,
    isSearchOpen: state.isSearchOpen,
    selectedItem: state.selectedItem,
    toastMessage: state.toastMessage,
    setRoute,
    setSearchOpen,
    toggleSearch,
    setSelectedItem,
    showToast,
  };
}

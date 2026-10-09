import { useState, useEffect, useCallback } from 'react';
import { getPixelDrainRoute, setPixelDrainRoute, PixelDrainRoute } from '../utils/pixeldrain';

export type VideoServerId = 'hdhub' | 'pengu' | 'cinemaos' | 'vidsrc' | 'autoembed' | 'smashystream';
export type VideoQuality = '1080p' | '720p' | '4k' | 'auto';

export interface UserSettings {
  defaultServer: VideoServerId;
  autoplayNext: boolean;
  defaultQuality: VideoQuality;
  pixelDrainRoute: PixelDrainRoute;
  subtitleOffset: number; // in seconds, from -5.0 to +5.0
}

export const SETTINGS_CHANGE_EVENT = 'streamverse_settings_change';

const STORAGE_KEYS = {
  defaultServer: 'streamverse_default_server',
  autoplay: 'streamverse_autoplay',
  quality: 'streamverse_quality',
  subtitleOffset: 'streamverse_subtitle_offset',
} as const;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultServer: 'hdhub',
  autoplayNext: true,
  defaultQuality: '1080p',
  pixelDrainRoute: 'normal',
  subtitleOffset: 0.0,
};

export function getStoredUserSettings(): UserSettings {
  try {
    const rawServer = localStorage.getItem(STORAGE_KEYS.defaultServer);
    const validServers: VideoServerId[] = ['hdhub', 'pengu', 'cinemaos', 'vidsrc', 'autoembed', 'smashystream'];
    const defaultServer = (rawServer && validServers.includes(rawServer as VideoServerId))
      ? (rawServer as VideoServerId)
      : DEFAULT_USER_SETTINGS.defaultServer;

    const rawAutoplay = localStorage.getItem(STORAGE_KEYS.autoplay);
    const autoplayNext = rawAutoplay !== null ? rawAutoplay === 'true' : DEFAULT_USER_SETTINGS.autoplayNext;

    const rawQuality = localStorage.getItem(STORAGE_KEYS.quality);
    const validQualities: VideoQuality[] = ['1080p', '720p', '4k', 'auto'];
    const defaultQuality = (rawQuality && validQualities.includes(rawQuality as VideoQuality))
      ? (rawQuality as VideoQuality)
      : DEFAULT_USER_SETTINGS.defaultQuality;

    const pixelDrainRoute = getPixelDrainRoute();

    const rawOffset = localStorage.getItem(STORAGE_KEYS.subtitleOffset);
    const parsedOffset = rawOffset !== null ? parseFloat(rawOffset) : 0.0;
    const subtitleOffset = Number.isFinite(parsedOffset) ? Math.max(-5.0, Math.min(5.0, parsedOffset)) : 0.0;

    return {
      defaultServer,
      autoplayNext,
      defaultQuality,
      pixelDrainRoute,
      subtitleOffset,
    };
  } catch {
    return { ...DEFAULT_USER_SETTINGS, pixelDrainRoute: getPixelDrainRoute() };
  }
}

export function saveUserSettings(partial: Partial<UserSettings>): UserSettings {
  const current = getStoredUserSettings();
  const next: UserSettings = { ...current, ...partial };

  try {
    if (partial.defaultServer !== undefined) {
      localStorage.setItem(STORAGE_KEYS.defaultServer, next.defaultServer);
    }
    if (partial.autoplayNext !== undefined) {
      localStorage.setItem(STORAGE_KEYS.autoplay, String(next.autoplayNext));
    }
    if (partial.defaultQuality !== undefined) {
      localStorage.setItem(STORAGE_KEYS.quality, next.defaultQuality);
    }
    if (partial.pixelDrainRoute !== undefined) {
      setPixelDrainRoute(next.pixelDrainRoute);
    }
    if (partial.subtitleOffset !== undefined) {
      localStorage.setItem(STORAGE_KEYS.subtitleOffset, String(next.subtitleOffset));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: next }));
    }
  } catch (err) {
    console.warn('Failed to persist user settings:', err);
  }

  return next;
}

/**
 * React hook to synchronize and manage user playback settings across the application.
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(getStoredUserSettings);

  useEffect(() => {
    const handleSync = () => {
      setSettings(getStoredUserSettings());
    };

    window.addEventListener(SETTINGS_CHANGE_EVENT, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    const updated = saveUserSettings(partial);
    setSettings(updated);
  }, []);

  const resetSettings = useCallback(() => {
    updateSettings(DEFAULT_USER_SETTINGS);
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { getPixelDrainRoute, setPixelDrainRoute, PixelDrainRoute } from '../utils/pixeldrain';

export type VideoServerId = 'hdhub' | 'pengu' | 'cinemaos' | 'vidsrc' | 'autoembed';
export type VideoQuality = '1080p' | '720p' | '4k' | 'auto';
export type SubtitleSize = 'small' | 'medium' | 'large';

export interface UserSettings {
  defaultServer: VideoServerId;
  autoplayNext: boolean;
  defaultQuality: VideoQuality;
  pixelDrainRoute: PixelDrainRoute;
  subtitleOffset: number; // in seconds, from -5.0 to +5.0
  subtitleSize: SubtitleSize;
}

export const SETTINGS_CHANGE_EVENT = 'streamverse_settings_change';

const STORAGE_KEYS = {
  defaultServer: 'streamverse_default_server',
  autoplay: 'streamverse_autoplay',
  quality: 'streamverse_quality',
  subtitleOffset: 'streamverse_subtitle_offset',
  subtitleSize: 'streamverse_subtitle_size',
} as const;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultServer: 'hdhub',
  autoplayNext: true,
  defaultQuality: '1080p',
  pixelDrainRoute: 'normal',
  subtitleOffset: 0.0,
  subtitleSize: 'medium',
};

export function clampSubtitleOffset(raw: number | string | null | undefined): number {
  if (raw === null || raw === undefined) return 0.0;
  const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
  return Number.isFinite(parsed) ? Math.max(-5.0, Math.min(5.0, parsed)) : 0.0;
}

export function validateSubtitleSize(raw: string | null | undefined): SubtitleSize {
  const validSubSizes: SubtitleSize[] = ['small', 'medium', 'large'];
  return (raw && validSubSizes.includes(raw as SubtitleSize))
    ? (raw as SubtitleSize)
    : DEFAULT_USER_SETTINGS.subtitleSize;
}

export function getStoredUserSettings(): UserSettings {
  try {
    const rawServer = localStorage.getItem(STORAGE_KEYS.defaultServer);
    const validServers: VideoServerId[] = ['hdhub', 'pengu', 'cinemaos', 'vidsrc', 'autoembed'];
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
    const subtitleOffset = clampSubtitleOffset(rawOffset);

    const rawSubSize = localStorage.getItem(STORAGE_KEYS.subtitleSize);
    const subtitleSize = validateSubtitleSize(rawSubSize);

    return {
      defaultServer,
      autoplayNext,
      defaultQuality,
      pixelDrainRoute,
      subtitleOffset,
      subtitleSize,
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
    if (partial.subtitleSize !== undefined) {
      localStorage.setItem(STORAGE_KEYS.subtitleSize, next.subtitleSize);
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

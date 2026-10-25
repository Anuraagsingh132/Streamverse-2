import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import posthog from 'posthog-js';

// PostHog Configuration from Vite Environment
export const POSTHOG_PROJECT_TOKEN =
  (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_POSTHOG_PROJECT_TOKEN : '') || '';
export const POSTHOG_HOST =
  (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_POSTHOG_HOST : '') ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? `${window.location.origin}/ingest` : 'https://us.i.posthog.com');

let isInitialized = false;

/**
 * Initializes PostHog with full autocapture, session replay, and SPA routing support.
 */
export function initPostHog(): typeof posthog {
  if (typeof window === 'undefined') return posthog;
  if (isInitialized) return posthog;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local'));

  // Disable in local development and localhost to prevent ad-blockers from throwing net::ERR_BLOCKED_BY_CLIENT
  if (isLocalhost || import.meta.env?.DEV) {
    isInitialized = true;
    return posthog;
  }

  if (!POSTHOG_PROJECT_TOKEN) {
    if (import.meta.env?.DEV) {
      console.warn('[PostHog] VITE_POSTHOG_PROJECT_TOKEN is missing. Analytics operating in stub mode.');
    }
    return posthog;
  }

  try {
    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: POSTHOG_HOST,
      autocapture: true, // Automatically captures button clicks, inputs, UI interactions
      capture_pageview: false, // Handled by React Router PostHogPageViewTracker for exact SPA accuracy
      capture_pageleave: true, // Tracks drop-offs, bounce rate, and time on page
      disable_session_recording: true,
      disable_surveys: true,
      capture_dead_clicks: false,
      session_recording: {
        maskAllElementAttributes: false,
        maskAllInputs: false,
      },
      persistence: 'localStorage+cookie',
      cross_subdomain_cookie: false,
      loaded: (ph) => {
        if (import.meta.env?.DEV) {
          console.log('[PostHog] Initialized successfully with autocapture and session replay');
        }
      },
    });
    isInitialized = true;
  } catch (err) {
    console.error('[PostHog] Initialization error:', err);
  }

  return posthog;
}

/**
 * React Router component that tracks SPA pageviews on every route change.
 * Place inside <BrowserRouter>.
 */
export function PostHogPageViewTracker(): null {
  const location = useLocation();

  useEffect(() => {
    if (!POSTHOG_PROJECT_TOKEN) return;

    try {
      const fullUrl = window.location.href;
      const pageTitle = document.title || 'Streamverse';

      posthog.capture('$pageview', {
        $current_url: fullUrl,
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        title: pageTitle,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[PostHog] Pageview tracking failed:', err);
    }
  }, [location.pathname, location.search]);

  return null;
}

// ==============================================================================
// STREAMVERSE CUSTOM ANALYTICS EVENT HELPERS
// ==============================================================================

export interface TrackMediaProps {
  id: string | number;
  title?: string;
  name?: string;
  media_type?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

/**
 * Tracks when a user starts video playback for a Movie, TV Show episode, or Anime.
 */
export function trackMediaPlay(
  item: TrackMediaProps,
  episode: number = 1,
  season: number = 1,
  server?: string
): void {
  const title = item.title || item.name || 'Unknown Title';
  const mediaType = item.media_type || 'movie';

  posthog.capture('media_playback_started', {
    media_id: String(item.id),
    title,
    media_type: mediaType,
    episode,
    season,
    server: server || 'default',
    rating: item.vote_average,
    release_date: item.release_date || item.first_air_date,
  });
}

/**
 * Tracks when a user clicks on a media card to open the Details page.
 */
export function trackMediaDetailsOpen(item: TrackMediaProps, sourcePage?: string): void {
  const title = item.title || item.name || 'Unknown Title';
  const mediaType = item.media_type || 'movie';

  posthog.capture('media_details_opened', {
    media_id: String(item.id),
    title,
    media_type: mediaType,
    rating: item.vote_average,
    source_page: sourcePage || window.location.pathname,
  });
}

/**
 * Tracks when a user switches between streaming servers in the player.
 */
export function trackServerSelect(
  mediaId: string | number,
  title: string,
  serverName: string,
  mediaType: string = 'movie',
  season: number = 1,
  episode: number = 1
): void {
  posthog.capture('player_server_switched', {
    media_id: String(mediaId),
    title,
    selected_server: serverName,
    media_type: mediaType,
    season,
    episode,
  });
}

/**
 * Tracks search queries executed by the user.
 */
export function trackSearchQuery(query: string, resultsCount?: number, category?: string): void {
  if (!query || query.trim().length === 0) return;

  posthog.capture('search_executed', {
    search_query: query.trim().toLowerCase(),
    results_count: resultsCount,
    category: category || 'all',
  });
}

/**
 * Tracks adding or removing items from the Watchlist/Bookmarks.
 */
export function trackWatchlistAction(
  item: TrackMediaProps,
  action: 'added' | 'removed'
): void {
  const title = item.title || item.name || 'Unknown Title';
  const mediaType = item.media_type || 'movie';

  posthog.capture('watchlist_updated', {
    action,
    media_id: String(item.id),
    title,
    media_type: mediaType,
  });
}

/**
 * Generic custom event tracker for any feature or interaction.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  posthog.capture(eventName, properties);
}

export { posthog };
export default posthog;

import * as Sentry from '@sentry/react';

/**
 * Initializes Sentry for application-wide error observability (OPS-12).
 * Captures:
 * 1. React ErrorBoundary component stack crashes
 * 2. Unhandled promise rejections
 * 3. Window runtime errors and uncaught worker exceptions
 */
export function initSentry(): void {
  const dsn = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SENTRY_DSN : undefined;
  const isProd = typeof import.meta !== 'undefined' ? import.meta.env?.PROD : false;

  Sentry.init({
    dsn: dsn || (isProd ? 'https://placeholder@o0.ingest.sentry.io/0' : undefined),
    enabled: Boolean(dsn) || isProd,
    environment: isProd ? 'production' : 'development',
    release: 'streamverse@2.0.0',
    tracesSampleRate: isProd ? 0.2 : 1.0,
    // Filter out expected media abort or network cancellation errors
    beforeSend(event, hint) {
      const error = hint.originalException as any;
      if (
        error?.name === 'AbortError' ||
        error?.message?.includes('The play() request was interrupted') ||
        error?.message?.includes('ResizeObserver loop completed')
      ) {
        return null;
      }
      return event;
    }
  });

  // Global listeners for unhandled rejections & worker errors
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Streamverse] Unhandled Promise Rejection:', event.reason);
      Sentry.captureException(event.reason || new Error('Unhandled Promise Rejection'));
    });

    window.addEventListener('error', (event) => {
      console.error('[Streamverse] Global Window Error:', event.error || event.message);
      if (event.error) {
        Sentry.captureException(event.error);
      }
    });
  }
}

/**
 * Captures an explicit exception with contextual metadata.
 */
export function captureException(error: unknown, context?: Record<string, any>): void {
  console.error('[Streamverse Exception]:', error, context);
  Sentry.captureException(error, {
    extra: context
  });
}

/**
 * Captures an informational or warning observability message.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

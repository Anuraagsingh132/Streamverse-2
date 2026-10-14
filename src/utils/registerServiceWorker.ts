/**
 * Progressive Web App (PWA) Service Worker Registration
 * 
 * Registers the service worker after initial window load to avoid competing
 * with critical path rendering.
 */

export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // In production or when hosted, register sw.js
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Listen for new worker updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new update is available in the background
                  window.dispatchEvent(new CustomEvent('pwa_update_available'));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

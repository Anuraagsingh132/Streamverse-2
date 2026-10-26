import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initSecurityDefense } from './utils/securityDefense.ts'
import { registerPwaServiceWorker } from './utils/registerServiceWorker.ts'

// Initialize production security policies & console hygiene
initSecurityDefense()

// Initialize high-quality PWA service worker after window load
registerPwaServiceWorker()

import { initPostHog } from './services/analytics.ts';

// Defer analytics and error monitoring to idle to maximize initial main thread responsiveness & 0ms TBT
if (typeof window !== 'undefined') {
  const initIdleServices = async () => {
    try {
      const { initSentry } = await import('./utils/sentry.ts');
      initSentry();
      initPostHog();
    } catch {
      // Telemetry non-blocking failure
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initIdleServices, { timeout: 3000 });
  } else {
    setTimeout(initIdleServices, 1500);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

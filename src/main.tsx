import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initSentry } from './utils/sentry.ts'
import { initSecurityDefense } from './utils/securityDefense.ts'
import { registerPwaServiceWorker } from './utils/registerServiceWorker.ts'
import { initPostHog } from './services/analytics.ts'

// Initialize production security & anti-inspection defense (Vercel only)
initSecurityDefense()

// Initialize high-quality PWA service worker after window load
registerPwaServiceWorker()

// Defer analytics and error monitoring to idle to maximize initial main thread responsiveness & 0ms TBT
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      initSentry();
      initPostHog();
    }, { timeout: 3000 });
  } else {
    setTimeout(() => {
      initSentry();
      initPostHog();
    }, 1500);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

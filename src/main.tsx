import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initSentry } from './utils/sentry.ts'
import { initSecurityDefense } from './utils/securityDefense.ts'
import { registerPwaServiceWorker } from './utils/registerServiceWorker.ts'
import { PostHogProvider } from '@posthog/react'
import { posthog, initPostHog } from './services/analytics.ts'

// Initialize Sentry error observability (OPS-12)
initSentry()

// Initialize PostHog product analytics, autocapture & session replay
initPostHog()

// Initialize production security & anti-inspection defense (Vercel only)
initSecurityDefense()

// Initialize high-quality PWA service worker
registerPwaServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </PostHogProvider>
  </StrictMode>,
)

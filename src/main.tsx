import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initSentry } from './utils/sentry.ts'
import { initSecurityDefense } from './utils/securityDefense.ts'

// Initialize Sentry error observability (OPS-12)
initSentry()

// Initialize production security & anti-inspection defense (Vercel only)
initSecurityDefense()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import * as Sentry from '@sentry/react'

inject() // Enables Vercel Analytics — tracks page views and visitors automatically

// Crash reporting — silently does nothing until VITE_SENTRY_DSN is set (see
// README/session notes: create a free project at sentry.io, then add
// VITE_SENTRY_DSN as an environment variable in Vercel project settings).
// Once configured this catches two things previously invisible to anyone but
// the person hitting the bug: (1) errors during React rendering, reported
// via the ErrorBoundary in utils.jsx, and (2) errors in event handlers /
// async code (e.g. a click handler throwing) that a React error boundary
// never sees at all -- Sentry's default browser integration installs a
// global window.onerror / unhandledrejection listener for those.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0, // errors only, no performance tracing (keeps free-tier usage low)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

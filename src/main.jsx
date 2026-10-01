import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { inject } from '@vercel/analytics'
import * as Sentry from '@sentry/react'
import { installAiIntakeTestHarness } from './aiIntakeTestHarness.js'
import { installButtonRipple } from './rippleEffect.js'
import { initNativeApp } from './nativeApp.js'
import { installGlobalErrorReporting } from './analytics/errorReporter.js'
import { registerServiceWorker } from './pwa/registerServiceWorker.js'
import PwaBanners from './pwa/PwaBanners.jsx'

inject() // Enables Vercel Analytics — tracks page views and visitors automatically

// Android hardware back button + status bar setup -- no-ops on the web
// build, only active inside the Capacitor-wrapped app. See nativeApp.js.
initNativeApp()

// On-demand console test tool for the AI intake pipeline -- attaches
// window.physioAITest but runs nothing automatically. Open DevTools on
// the live app and run physioAITest.runAll() to send 15 real patient
// narratives through the actual /api/parse -> field mapping ->
// interpretation -> SOAP pipeline and see the results. See
// aiIntakeTestHarness.js for what it does and why it's opt-in only.
installAiIntakeTestHarness()

// Adds a real tap-press feel (depress + ripple) to every purple "primary"
// button across the app -- was previously pure CSS with zero :active
// feedback. See rippleEffect.js for why this is one global listener
// instead of touching every .primary-btn call site.
installButtonRipple()

// Reports uncaught errors and rejected promises to the admin analytics
// dashboard (Errors section) -- independent of the Sentry setup below, so
// this works today with zero extra accounts/config. Doesn't see React
// render crashes on its own (see the ErrorBoundary in utils.jsx for those).
installGlobalErrorReporting()

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

// A deploy replaces hashed chunk files; a tab opened before it then fails to
// import a lazy chunk ("Failed to fetch dynamically imported module").
// Reload once to pick up the new build; the sessionStorage flag stops loops.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('pm_chunk_reload')) return;
    sessionStorage.setItem('pm_chunk_reload', '1');
    e.preventDefault();
    window.location.reload();
  } catch { /* storage blocked: fall through to normal error */ }
});
window.addEventListener('load', () => {
  setTimeout(() => { try { sessionStorage.removeItem('pm_chunk_reload'); } catch { /* ignore */ } }, 10000);
});

// Offline shell + push alerts + "new version ready" (production web build only).
registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PwaBanners />
  </React.StrictMode>
)

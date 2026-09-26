import { trackEvent } from './trackEvent.js';

// Independent of Sentry (main.jsx/utils.jsx) -- this works whether or not
// VITE_SENTRY_DSN is ever configured, and feeds the admin analytics
// dashboard directly instead of a third-party dashboard, per Aditi's
// "dashboard only, no phone/email ping" choice. Same trackEvent() pipe as
// every other tracked action -- no anonymous errors (matches trackEvent's
// existing "no anonymous events" rule), so a crash on the signed-out login
// screen won't be captured yet.

const MAX_REPORTS_PER_LOAD = 20; // safety valve for a crash loop
const DEDUP_WINDOW_MS = 10_000; // the same error repeating shouldn't spam the dashboard

let reportedCount = 0;
let lastKey = null;
let lastKeyAt = 0;

function truncate(str, max) {
  if (typeof str !== 'string') return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// `window.__pmScreen` is set at the app's one nav choke point (navTo() in
// AppFull.jsx) and `window.__pmSubScreen` by PhysioFeed's own internal
// router (see ScreenTrackerBridge in PhysioFeedEntry.jsx) -- reading these
// globals here means every existing call site keeps working unchanged.
export function reportClientError(errorOrMessage, extra = {}) {
  try {
    const message = errorOrMessage?.message || String(errorOrMessage ?? 'Unknown error');
    const stack = errorOrMessage?.stack || '';
    const screen = window.__pmScreen || 'unknown';
    const key = `${message}|${screen}`;
    const now = Date.now();
    if (key === lastKey && now - lastKeyAt < DEDUP_WINDOW_MS) return;
    lastKey = key;
    lastKeyAt = now;
    if (reportedCount >= MAX_REPORTS_PER_LOAD) return;
    reportedCount += 1;

    trackEvent('client_error', {
      entityType: 'screen',
      entityId: screen,
      properties: {
        message: truncate(message, 500),
        stack: truncate(stack, 2000),
        subScreen: window.__pmSubScreen || null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...extra,
      },
    });
  } catch {
    /* error reporting itself must never throw */
  }
}

// Catches what a React error boundary can't: errors thrown from event
// handlers, timers, and async code, plus rejected promises nobody caught.
export function installGlobalErrorReporting() {
  window.addEventListener('error', (e) => reportClientError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason));
}

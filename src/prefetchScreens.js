// Quietly downloads the screens people open next (an assessment, a patient's
// profile) once the first screen is up and the phone is idle. The first visit
// stays light because these are no longer part of it, and opening them a moment
// later is still instant because they are already on the phone. Skipped when the
// person has Data Saver on or is on a very slow connection.

const SLOW = new Set(["slow-2g", "2g"]);

export function shouldPrefetch(nav = typeof navigator !== "undefined" ? navigator : {}) {
  const c = nav.connection;
  if (!c) return true;
  if (c.saveData) return false;
  return !SLOW.has(c.effectiveType);
}

// Each loader is a function returning import(...) -- the same specifiers the app
// itself uses, so the browser reuses the download when the screen is opened.
export const DEFAULT_LOADERS = [
  () => import("./OrthoAssessmentNew.jsx"),
  () => import("./SpecialtyPatientProfile.jsx"),
];

export function prefetchLikelyScreens({ loaders = DEFAULT_LOADERS, nav, idle, delayMs = 4000 } = {}) {
  if (!shouldPrefetch(nav)) return () => {};
  const runIdle = idle || ((fn) => (typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 8000 }) : setTimeout(fn, 1)));
  let cancelled = false;
  const timer = setTimeout(() => {
    runIdle(async () => {
      for (const load of loaders) {
        if (cancelled) return;
        try { await load(); } catch { /* a failed prefetch is harmless: the screen loads when opened */ }
      }
    });
  }, delayMs);
  return () => { cancelled = true; clearTimeout(timer); };
}

// loadTimer.js -- how long the app takes to open for a real student, and on what kind of
// connection. One small event ("app_loaded") per page load, no patient data: only times,
// the connection type the browser reports, and a rough size band of the patient list.
//
// Why: the pilot week should show real numbers for the "is it slow?" question instead of
// guesses. The admin page shows them (api/admin/_lib/analyticsMath.js buildSpeedStats).
//
// Times are measured from the start of the page load (performance.now()):
//   appReadyMs      the signed-in app is on screen
//   patientsReadyMs the saved patients are in (read from the phone's copy and checked with the
//                   cloud); null when that had not finished 30 s after the app was on screen
// A load where the page was hidden at any point (the student switched app while it opened) is
// not reported, because the times would be wrong.
import { trackEvent } from "./trackEvent.js";

const GIVE_UP_AFTER_MS = 30000;
const SEEN_KEY = "pm_load_seen";

let hiddenDuringLoad = false;
let reported = false;
let appReadyMs = null;
let patientsReadyMs = null;
let patientCount = null;
let patientsFailed = false;
let giveUpTimer = null;

if (typeof document !== "undefined") {
  if (document.visibilityState === "hidden") hiddenDuringLoad = true;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") hiddenDuringLoad = true; });
}

const now = () => Math.round(performance.now());

function patientBand(n) {
  if (n == null) return "unknown";
  if (n === 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  return "21+";
}

// What the browser tells us about the connection (not available in Safari: then "unknown").
export function connectionFacts(nav = typeof navigator !== "undefined" ? navigator : {}) {
  const c = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!c) return { connection: "unknown", downlinkMbps: null, rttMs: null, saveData: false };
  return {
    connection: c.effectiveType || "unknown",
    downlinkMbps: typeof c.downlink === "number" ? c.downlink : null,
    rttMs: typeof c.rtt === "number" ? c.rtt : null,
    saveData: !!c.saveData,
  };
}

function firstContentfulPaintMs() {
  try {
    const entry = performance.getEntriesByName("first-contentful-paint")[0];
    return entry ? Math.round(entry.startTime) : null;
  } catch { return null; }
}

function visitKind() {
  let returning = false;
  try { returning = !!localStorage.getItem(SEEN_KEY); localStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked */ }
  let reload = false;
  try { reload = performance.getEntriesByType("navigation")[0]?.type === "reload"; } catch { /* not supported */ }
  if (reload) return "reload";
  return returning ? "return" : "first";
}

function report() {
  if (reported) return;
  reported = true;
  clearTimeout(giveUpTimer);
  if (hiddenDuringLoad || appReadyMs == null) return;
  try { sendReport(); } catch { /* measuring must never get in the way of the app */ }
}

function sendReport() {
  trackEvent("app_loaded", {
    entityType: "performance",
    properties: {
      appReadyMs,
      patientsReadyMs,
      patientsFailed,
      patients: patientBand(patientCount),
      fcpMs: firstContentfulPaintMs(),
      visit: visitKind(),
      appCached: !!(typeof navigator !== "undefined" && navigator.serviceWorker && navigator.serviceWorker.controller),
      ...connectionFacts(),
    },
  });
}

// The signed-in app has just been drawn.
export function markAppReady() {
  if (appReadyMs != null) return;
  appReadyMs = now();
  giveUpTimer = setTimeout(report, GIVE_UP_AFTER_MS);
}

// The patient list has finished loading (`ok` false when the cloud could not be read).
export function markPatientsReady({ count, ok = true } = {}) {
  if (patientsReadyMs != null || reported) return;
  patientsReadyMs = now();
  patientCount = typeof count === "number" ? count : null;
  patientsFailed = !ok;
  report();
}

export function resetLoadTimerForTests() {
  hiddenDuringLoad = false; reported = false; appReadyMs = null; patientsReadyMs = null;
  patientCount = null; patientsFailed = false; clearTimeout(giveUpTimer); giveUpTimer = null;
}

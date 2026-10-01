import React, { useEffect, useState } from "react";
import { UPDATE_READY_EVENT, isNativeApp } from "./registerServiceWorker.js";

// PwaBanners — the two small messages that make the web app behave like an
// installed app (the "Offline mode" bar at the top of the screen already
// exists elsewhere in the app):
//   1. "A new version is ready" when a newer build was deployed while the app
//      was open, with a one-tap refresh.
//   2. "Install PhysioMind" -- Android/desktop Chrome via the browser's own
//      install prompt, and a how-to for iPhone Safari (which has no prompt).
//      Only offered to someone who has come back at least once and has been
//      using the app for a while, never inside the installed app, and not
//      again for 30 days after "Not now".

export const INSTALL_DISMISSED_KEY = "pm_install_dismissed_at";
export const VISIT_COUNT_KEY = "pm_visit_count";
const VISIT_COUNTED_KEY = "pm_visit_counted";
const DISMISS_DAYS = 30;
const DEFAULT_ENGAGED_AFTER_MS = 45_000;
const MIN_VISITS = 2;

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

function isStandalone() {
  return safe(() => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true, false);
}

function isIosSafari() {
  const ua = safe(() => window.navigator.userAgent, "");
  const ios = /iPhone|iPad|iPod/.test(ua);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && safari;
}

function recentlyDismissed() {
  const at = Number(safe(() => localStorage.getItem(INSTALL_DISMISSED_KEY), 0));
  return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

// Counts one visit per browser session.
function countVisit() {
  return safe(() => {
    let n = Number(localStorage.getItem(VISIT_COUNT_KEY) || 0);
    if (!sessionStorage.getItem(VISIT_COUNTED_KEY)) {
      n += 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(n));
      sessionStorage.setItem(VISIT_COUNTED_KEY, "1");
    }
    return n;
  }, 0);
}

const bar = {
  position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 10000,
  bottom: "calc(var(--pm-bnav-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)",
  width: "calc(100% - 24px)", maxWidth: 440, boxSizing: "border-box",
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", fontSize: "0.85rem", lineHeight: 1.35,
  fontFamily: "inherit",
};
const primaryBtn = { flexShrink: 0, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", background: "#fff", color: "#6d28d9", fontFamily: "inherit" };
const ghostBtn = { flexShrink: 0, border: "none", background: "transparent", color: "inherit", opacity: 0.85, fontSize: "0.8rem", cursor: "pointer", padding: "7px 4px", fontFamily: "inherit" };

export default function PwaBanners({ engagedAfterMs = DEFAULT_ENGAGED_AFTER_MS, onRefresh = () => window.location.reload() }) {
  const [updateReady, setUpdateReady] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [engaged, setEngaged] = useState(false);
  const [dismissed, setDismissed] = useState(() => recentlyDismissed());
  const [visits] = useState(() => countVisit());

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    const onInstallPrompt = (e) => { e.preventDefault(); setInstallEvent(e); };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener(UPDATE_READY_EVENT, onUpdate);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener(UPDATE_READY_EVENT, onUpdate);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setEngaged(true), engagedAfterMs);
    return () => clearTimeout(t);
  }, [engagedAfterMs]);

  const dismissInstall = () => {
    safe(() => localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now())));
    setDismissed(true);
  };
  const install = async () => {
    const ev = installEvent;
    if (!ev) return;
    setInstallEvent(null);
    try { await ev.prompt(); } catch { /* the browser refused; nothing to do */ }
    dismissInstall(); // asked once; don't ask again right away either way
  };

  const canOfferInstall = engaged && !dismissed && visits >= MIN_VISITS && !isNativeApp() && !isStandalone();
  const showAndroidInstall = canOfferInstall && !!installEvent;
  const showIosInstall = canOfferInstall && !installEvent && isIosSafari();

  // Stack the messages above one another, most important nearest the bottom.
  const items = [];
  if (updateReady) items.push(
    <div key="update" role="status" style={{ ...bar, background: "#6d28d9", color: "#fff" }}>
      <span style={{ flex: 1 }}>✨ A new version of PhysioMind is ready.</span>
      <button type="button" style={primaryBtn} onClick={onRefresh}>Refresh</button>
      <button type="button" style={ghostBtn} onClick={() => setUpdateReady(false)} aria-label="Later">Later</button>
    </div>
  );
  if (showAndroidInstall) items.push(
    <div key="install" role="status" style={{ ...bar, background: "#6d28d9", color: "#fff" }}>
      <span style={{ flex: 1 }}>📲 Install PhysioMind on this device. It opens like an app and updates by itself.</span>
      <button type="button" style={primaryBtn} onClick={install}>Install</button>
      <button type="button" style={ghostBtn} onClick={dismissInstall}>Not now</button>
    </div>
  );
  if (showIosInstall) items.push(
    <div key="ios" role="status" style={{ ...bar, background: "#6d28d9", color: "#fff" }}>
      <span style={{ flex: 1 }}>📲 To install: tap the Share button, then <b>Add to Home Screen</b>.</span>
      <button type="button" style={primaryBtn} onClick={dismissInstall}>Got it</button>
    </div>
  );

  if (items.length === 0) return null;
  // Each banner is fixed to the same spot, so lift later ones above earlier ones.
  return <>{items.map((el, i) => React.cloneElement(el, { style: { ...el.props.style, bottom: `calc(var(--pm-bnav-h, 0px) + env(safe-area-inset-bottom, 0px) + ${12 + i * 64}px)` } }))}</>;
}

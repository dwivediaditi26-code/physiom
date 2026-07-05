// InstallPrompt.jsx — "Add to Home Screen" banner
//
// Most patients/therapists never open a browser menu to find "Add to Home
// Screen" on their own, so this surfaces it directly in the app instead of
// relying on the OS's own (often invisible-by-default) install UI.
//
// Two very different platforms to handle:
//   - Android / desktop Chrome/Edge: the browser fires `beforeinstallprompt`
//     when the manifest + service worker installability criteria are met.
//     We capture that event, suppress the browser's own mini-infobar, and
//     show our own styled banner with an "Install" button that replays the
//     captured event via `.prompt()`.
//   - iOS Safari: Apple never fires `beforeinstallprompt` and does not allow
//     a site to trigger the install flow programmatically at all. The only
//     option is a banner that shows the manual steps (Share -> Add to Home
//     Screen).
//
// Dismissal is remembered in localStorage for DISMISS_DAYS so returning
// users aren't nagged every session.

import React, { useState, useEffect } from "react";

const DISMISS_KEY = "pm_install_dismissed_at";
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = window.navigator?.standalone === true; // iOS Safari-specific flag
  return Boolean(mq || iosStandalone);
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function recentlyDismissed() {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const days = (Date.now() - Number(ts)) / 86400000;
  return days < DISMISS_DAYS;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // "android" | "ios"

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    if (isIOS()) {
      // iOS never fires beforeinstallprompt — show static instructions right away.
      setPlatform("ios");
      setVisible(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault(); // suppress the browser's own mini-infobar
      setDeferredPrompt(e);
      setPlatform("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // If the app gets installed some other way (e.g. browser menu), hide the banner.
    const onInstalled = () => { setVisible(false); localStorage.setItem(DISMISS_KEY, String(Date.now())); };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice; // resolves regardless of accept/dismiss
    } catch { /* ignore */ }
    // Either way, don't show our banner again immediately — if declined, the
    // user can still use the browser's native install option later.
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Add PhysioMind Pro to your Home Screen"
      style={{
        position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9998,
        maxWidth: 420, margin: "0 auto",
        background: "#ffffff", border: "1px solid #E0E0E2", borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: "14px 16px",
        display: "flex", alignItems: "flex-start", gap: 12,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <img src="/icon-192.png" alt="" width="36" height="36" style={{ borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", marginBottom: 2 }}>
          Add PhysioMind Pro to your Home Screen
        </div>
        {platform === "ios" ? (
          <div style={{ fontSize: 12.5, color: "#6B6B6B", lineHeight: 1.4 }}>
            Tap the <b>Share</b> icon in Safari's toolbar, then scroll down and tap{" "}
            <b>"Add to Home Screen"</b>.
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "#6B6B6B", lineHeight: 1.4 }}>
            Install for one-tap access and a full-screen, app-like view — no app store needed.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {platform === "android" && (
            <button
              onClick={install}
              style={{
                background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8,
                padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            style={{
              background: "transparent", color: "#6B6B6B", border: "1px solid #E0E0E2",
              borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            {platform === "ios" ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: "none", border: "none", color: "#6B6B6B", fontSize: 18,
          lineHeight: 1, cursor: "pointer", padding: 0, marginLeft: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

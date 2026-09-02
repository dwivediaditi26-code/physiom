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
// 2026-09-02, Aditi: "can it pop constant till therapist install it... how
// will we know that they installed it" -- two changes from the original
// version:
//   1) Dismissing ("Not now"/"X") used to be remembered in localStorage for
//      14 days, so a therapist who dismissed it once wouldn't see it again
//      for two weeks even on a fresh app open. Now dismissal only lasts for
//      the current page load (component-local state, not persisted) --
//      still closeable so it never traps someone mid-task, but it comes
//      back on every fresh visit until the app is actually installed
//      (isStandalone() true), not just until the dismiss timer expires.
//   2) There was previously no record anywhere of who actually installed.
//      Every meaningful step (banner shown, Install tapped, dismissed, and
//      the real `appinstalled` event) now fires a Vercel Analytics
//      track() call -- same mechanism AppFull.jsx's navTo already uses for
//      module-open tracking, so these show up in the same dashboard, no
//      new backend needed. For a signed-in (non-guest) therapist, a real
//      `appinstalled` also writes installed_at onto their own Supabase
//      auth user_metadata, so "did this specific therapist install it" is
//      answerable by looking up their account (Supabase dashboard ->
//      Authentication -> Users -> that user's metadata), not just an
//      aggregate count.

import React, { useState, useEffect } from "react";
import { track } from "@vercel/analytics";
import { supabase } from "./supabase.js";

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

export default function InstallPrompt({ currentUser }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // "android" | "ios"
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  useEffect(() => {
    if (isStandalone() || hiddenThisSession) return;

    if (isIOS()) {
      // iOS never fires beforeinstallprompt — show static instructions right away.
      setPlatform("ios");
      setVisible(true);
      try { track("pwa_install_shown", { platform: "ios" }); } catch {}
      return;
    }

    const handler = (e) => {
      e.preventDefault(); // suppress the browser's own mini-infobar
      setDeferredPrompt(e);
      setPlatform("android");
      setVisible(true);
      try { track("pwa_install_shown", { platform: "android" }); } catch {}
    };
    window.addEventListener("beforeinstallprompt", handler);

    // The one reliable signal that installation actually happened (fires
    // whether the therapist used our button or the browser's own menu).
    const onInstalled = () => {
      setVisible(false);
      try { track("pwa_installed", { platform: "android" }); } catch {}
      if (currentUser?.id) {
        supabase.auth.updateUser({ data: { pwa_installed_at: new Date().toISOString() } }).catch(() => {});
      }
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [hiddenThisSession, currentUser?.id]);

  const dismiss = () => {
    try { track("pwa_install_dismissed", { platform }); } catch {}
    setHiddenThisSession(true);
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    try { track("pwa_install_clicked", { platform }); } catch {}
    deferredPrompt.prompt();
    let outcome = "unknown";
    try { outcome = (await deferredPrompt.userChoice)?.outcome || "unknown"; } catch { /* ignore */ }
    // `appinstalled` (above) is the real confirmation; this just records
    // what the browser's own choice dialog reported, which can lag or
    // (rarely) never fire on some browsers -- belt and suspenders, not a
    // replacement for the appinstalled tracking.
    try { track("pwa_install_choice", { platform, outcome }); } catch {}
    setDeferredPrompt(null);
    setVisible(false);
    // Only hide for this session -- if they declined, it should still
    // come back next time they open the app rather than going quiet.
    if (outcome !== "accepted") setHiddenThisSession(true);
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

// PushOptInBanner.jsx — one-time ask for reminder notifications, shown a
// short beat after InstallPrompt so the two never stack. Notification
// permission prompts convert far better when tied to a concrete value
// ("get reminders") than when fired blind on page load, and browsers
// throttle/auto-deny permission requests not triggered by a real click —
// so this always waits for the student to tap "Enable", never calls
// Notification.requestPermission() on mount.
import React, { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { pushSupported, pushPermission, isSubscribedToPush, subscribeToPush } from "./pushNotifications.js";

const DISMISSED_KEY = "physio_push_optin_dismissed_v1";

export default function PushOptInBanner({ currentUser }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentUser?.id || !pushSupported()) return;
    if (pushPermission() !== "default") return; // already granted or denied — nothing to ask
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISSED_KEY) === "1"; } catch {}
    if (dismissed) return;

    let cancelled = false;
    // Stagger behind InstallPrompt (which shows immediately) so a student
    // isn't hit with two overlapping banners the instant the app opens.
    const t = setTimeout(async () => {
      const already = await isSubscribedToPush().catch(() => false);
      if (!cancelled && !already) setVisible(true);
    }, 4000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [currentUser?.id]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    try { track("push_optin_dismissed"); } catch {}
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try { track("push_optin_clicked"); } catch {}
    const result = await subscribeToPush(currentUser.id);
    setBusy(false);
    try { track(result.ok ? "push_optin_granted" : "push_optin_failed", { reason: result.reason }); } catch {}
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Enable reminder notifications"
      style={{
        position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9997,
        maxWidth: 420, margin: "0 auto",
        background: "#ffffff", border: "1px solid #E0E0E2", borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: "14px 16px",
        display: "flex", alignItems: "flex-start", gap: 12,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", marginBottom: 2 }}>
          Get reminders from PhysioMind
        </div>
        <div style={{ fontSize: 12.5, color: "#6B6B6B", lineHeight: 1.4 }}>
          Turn on notifications for deadline and follow-up reminders.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={enable}
            disabled={busy}
            style={{
              background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8,
              padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Enabling…" : "Enable"}
          </button>
          <button
            onClick={dismiss}
            style={{
              background: "transparent", color: "#6B6B6B", border: "1px solid #E0E0E2",
              borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Not now
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

import React, { useEffect, useState } from "react";
import { pushSupported, pushPermission, isSubscribedToPush, subscribeToPush, unsubscribeFromPush, isIosDevice, isStandalone } from "./pushNotifications.js";
import { authHeader } from "./supabase.js";
import { apiUrl } from "./apiUrl.js";

// A real place to turn phone notifications on/off after the first ask
// (2026-10-02, Aditi: "how can we test notification" -- PushOptInBanner.jsx
// only ever asks once per browser and never shows again once permission
// is set or the banner's dismissed, so there was no way to re-enable it
// once declined, or even to check whether it's actually on).
export default function NotificationsSettingsCard({ currentUser, isGuest }) {
  const [subscribed, setSubscribed] = useState(null); // null = checking
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, message }
  const supported = pushSupported();
  // iPhone/iPad only get notifications from the app added to the Home Screen.
  const needsHomeScreen = !supported && isIosDevice() && !isStandalone();
  const permission = pushPermission();
  const canUse = !!currentUser?.id && !isGuest;

  useEffect(() => {
    if (!supported) { setSubscribed(false); return; }
    isSubscribedToPush().then(setSubscribed).catch(() => setSubscribed(false));
  }, [supported]);

  const enable = async () => {
    setBusy(true); setStatus("");
    const result = await subscribeToPush(currentUser.id);
    setBusy(false);
    if (result.ok) { setSubscribed(true); setStatus("Notifications enabled."); }
    else setStatus(result.reason === "denied" ? "Blocked — enable notifications for this site in your browser/phone settings, then try again." : "Couldn't enable notifications right now.");
  };

  // Sends one real notification to this account's own phones and says which
  // step failed if nothing arrives (see api/pushTest.js).
  const sendTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(apiUrl("/api/pushTest"), { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: "{}" });
      const json = await res.json().catch(() => ({}));
      setTestResult({ ok: !!json.ok, message: json.message || json.error || "Could not run the test right now." });
    } catch {
      setTestResult({ ok: false, message: "Could not reach the server — check your internet connection and try again." });
    }
    setTesting(false);
  };

  const disable = async () => {
    setBusy(true); setStatus("");
    await unsubscribeFromPush(currentUser?.id);
    setBusy(false);
    setSubscribed(false);
    setStatus("Notifications turned off.");
  };

  return (
    <div style={{ margin: "16px 0", padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>🔔 Notifications</div>
      <div style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 12px", lineHeight: 1.5 }}>
        Get a phone notification for new messages, connection requests, application updates, and new jobs/conferences in News.
      </div>

      {needsHomeScreen ? (
        <div style={{ fontSize: 12.5, color: "#b45309", lineHeight: 1.5 }}>
          On iPhone, notifications only work from the app on your Home Screen. In Safari tap Share, then "Add to Home Screen", open PhysioMind from that icon, then come back here and turn notifications on.
        </div>
      ) : !supported ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Not supported in this browser.</div>
      ) : !canUse ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Sign in to enable notifications.</div>
      ) : permission === "denied" ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Blocked in your browser/phone settings — enable notifications for this site there, then reopen this page.</div>
      ) : subscribed === null ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Checking…</div>
      ) : subscribed ? (
        <button type="button" onClick={disable} disabled={busy}
          style={{ width: "100%", padding: "11px 14px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", color: "#475569", fontWeight: 700, fontSize: 14, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Turning off…" : "Turn off notifications"}
        </button>
      ) : (
        <button type="button" onClick={enable} disabled={busy}
          style={{ width: "100%", padding: "11px 14px", border: "none", borderRadius: 12, background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 14, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Enabling…" : "Enable notifications"}
        </button>
      )}
      {subscribed && canUse && (
        <>
          <button type="button" onClick={sendTest} disabled={testing}
            style={{ width: "100%", marginTop: 8, padding: "11px 14px", border: "1px solid #ddd6fe", borderRadius: 12, background: "#f5f3ff", color: "#6d28d9", fontWeight: 700, fontSize: 14, cursor: testing ? "not-allowed" : "pointer" }}>
            {testing ? "Sending…" : "Send me a test notification"}
          </button>
          {testResult && <div role="status" style={{ fontSize: 12.5, marginTop: 8, fontWeight: 600, lineHeight: 1.5, color: testResult.ok ? "#059669" : "#dc2626" }}>{testResult.message}</div>}
        </>
      )}
      {status && <div role="status" style={{ fontSize: 12.5, marginTop: 8, fontWeight: 600, color: status.startsWith("Couldn't") || status.startsWith("Blocked") ? "#dc2626" : "#059669" }}>{status}</div>}
    </div>
  );
}

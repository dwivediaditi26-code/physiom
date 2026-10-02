import React, { useEffect, useState } from "react";
import { UPDATE_READY_EVENT } from "./registerServiceWorker.js";

// PwaBanners -- "A new version is ready" with a one-tap refresh, shown when a
// newer build was deployed while the app was open (an installed app kept open
// in the background used to stay on the old version until restarted). The
// "Offline mode" bar lives in OfflineBanner.jsx and the "Add to Home Screen"
// popup in InstallPrompt.jsx; there is deliberately only ONE install popup.

const bar = {
  position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 10000,
  bottom: "calc(var(--pm-bnav-h, env(safe-area-inset-bottom, 0px)) + 12px)",
  width: "calc(100% - 24px)", maxWidth: 440, boxSizing: "border-box",
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", fontSize: "0.85rem", lineHeight: 1.35,
  fontFamily: "inherit",
};
const primaryBtn = { flexShrink: 0, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", background: "#fff", color: "#6d28d9", fontFamily: "inherit" };
const ghostBtn = { flexShrink: 0, border: "none", background: "transparent", color: "inherit", opacity: 0.85, fontSize: "0.8rem", cursor: "pointer", padding: "7px 4px", fontFamily: "inherit" };

export default function PwaBanners({ onRefresh = () => window.location.reload() }) {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener(UPDATE_READY_EVENT, onUpdate);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onUpdate);
  }, []);

  if (!updateReady) return null;
  return (
    <div role="status" style={{ ...bar, background: "#6d28d9", color: "#fff" }}>
      <span style={{ flex: 1 }}>✨ A new version of PhysioMind is ready.</span>
      <button type="button" style={primaryBtn} onClick={onRefresh}>Refresh</button>
      <button type="button" style={ghostBtn} onClick={() => setUpdateReady(false)} aria-label="Later">Later</button>
    </div>
  );
}

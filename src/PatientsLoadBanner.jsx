import React, { useEffect, useState } from "react";

// Tells the person what is happening while their saved patients are read back
// from the cloud, and -- instead of silently showing an empty list -- when
// that failed, with a Retry button. Nothing is lost in either case: the
// patients are safe in the cloud, this only reports whether the app could
// read them just now.
//
// state: "loading" | "ok" | "error". "loading" only shows if it takes more
// than a moment AND there is nothing on screen yet (hasPatients false).

const bar = {
  position: "fixed", left: "50%", transform: "translateX(-50%)", zIndex: 9990,
  bottom: "calc(var(--pm-bnav-h, env(safe-area-inset-bottom, 0px)) + 12px)",
  width: "calc(100% - 24px)", maxWidth: 440, boxSizing: "border-box",
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", fontSize: "0.85rem", lineHeight: 1.35,
  fontFamily: "inherit",
};
const btn = { flexShrink: 0, border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" };

export default function PatientsLoadBanner({ state, skipped = 0, hasPatients, onRetry, loadingDelayMs = 1200 }) {
  const [slow, setSlow] = useState(false);
  const [dismissedFor, setDismissedFor] = useState(null);

  useEffect(() => {
    if (state !== "loading") { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), loadingDelayMs);
    return () => clearTimeout(t);
  }, [state, loadingDelayMs]);

  if (state === "loading" && slow && !hasPatients) {
    return (
      <div role="status" style={{ ...bar, background: "#fff", color: "#1f2937", border: "1px solid #E5E7EB" }}>
        <span style={{ flex: 1 }}>Loading your saved patients…</span>
      </div>
    );
  }

  if (state === "error" && dismissedFor !== skipped + ":" + state) {
    return (
      <div role="alert" style={{ ...bar, background: "#FEF3C7", color: "#78350F", border: "1px solid #FCD34D" }}>
        <span style={{ flex: 1 }}>
          {skipped > 0
            ? `Couldn't open ${skipped} saved patient${skipped === 1 ? "" : "s"} just now. They are safe in the cloud.`
            : "Couldn't load your saved patients just now. They are safe in the cloud."}
        </span>
        <button type="button" style={{ ...btn, background: "#78350F", color: "#fff" }} onClick={onRetry}>Try again</button>
        <button type="button" aria-label="Dismiss" style={{ ...btn, background: "transparent", color: "inherit", padding: "7px 4px" }} onClick={() => setDismissedFor(skipped + ":" + state)}>✕</button>
      </div>
    );
  }
  return null;
}

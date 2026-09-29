// OfflineBanner.jsx — App Store Guideline 4.2 requires that losing
// connectivity show "a clean in-app banner... never a blank white page or
// broken connection screen." The app shell itself (nav, condition
// libraries, assessment forms) is already all local React state/bundled
// JSON, so it keeps working offline on its own -- this banner only tells
// the user that cloud-dependent features (AI intake parsing, Supabase
// sync) are paused, so a stalled "Saving..." status doesn't look broken.
//
// @capacitor/network gives a reliable native signal inside the wrapped
// app; navigator.onLine + the browser's online/offline events cover the
// plain web build (Vercel) where that plugin resolves to a web stub.
import React, { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { supabase } from "./supabase.js";
import { isSyncDirty, flushPendingSync } from "./PatientDatabase.jsx";

// "syncing" is shown briefly right after reconnect, while a save made
// offline is being retried -- without it, connectivity flips back to
// "online" instantly but the actual upsert (and therefore confirmation
// that the offline work actually reached Supabase) can lag a second or
// two behind, which otherwise looks indistinguishable from "nothing is
// happening."
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let sub;
    const checkDirty = () => {
      supabase.auth.getUser().then(({ data }) => {
        const uid = data?.user?.id;
        if (uid && isSyncDirty(uid)) {
          setSyncing(true);
          flushPendingSync(uid).finally(() => setSyncing(false));
        }
      }).catch(() => {});
    };

    Network.getStatus().then((s) => setOnline(s.connected)).catch(() => {});
    Network.addListener("networkStatusChange", (s) => {
      setOnline(s.connected);
      if (s.connected) checkDirty();
    }).then((handle) => { sub = handle; }).catch(() => {});

    const onOnline = () => { setOnline(true); checkDirty(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      sub?.remove?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online && !syncing) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998,
      background: online ? "#334155" : "#1e293b", color: "#fff", fontSize: "0.76rem", fontWeight: 600,
      textAlign: "center", padding: "7px 12px",
      paddingTop: "max(7px, env(safe-area-inset-top))",
    }}>
      {online
        ? "Syncing your offline work to the cloud…"
        : "Offline mode — cloud sync paused. Your work keeps saving locally."}
    </div>
  );
}

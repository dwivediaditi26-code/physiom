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

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let sub;
    Network.getStatus().then((s) => setOnline(s.connected)).catch(() => {});
    Network.addListener("networkStatusChange", (s) => setOnline(s.connected))
      .then((handle) => { sub = handle; })
      .catch(() => {});

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      sub?.remove?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998,
      background: "#1e293b", color: "#fff", fontSize: "0.76rem", fontWeight: 600,
      textAlign: "center", padding: "7px 12px",
      paddingTop: "max(7px, env(safe-area-inset-top))",
    }}>
      Offline mode — cloud sync paused. Your work keeps saving locally.
    </div>
  );
}

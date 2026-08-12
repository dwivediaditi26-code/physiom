// AuthRequiredPrompt.jsx — the popup a guest sees when they tap a feature
// that genuinely requires a real account (currently: the AI-backed
// features, since the server hard-requires a Supabase login token for
// those). Shown by AppInner via requireAuth() -- see AppFull.jsx.

import React from "react";

const A = "#7c3aed", A2 = "#9333ea", TX = "#1a1025", MU = "#7e6a9a", BD = "#e4d9f2";

export default function AuthRequiredPrompt({ feature, onSignIn, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,16,37,0.55)", zIndex: 300,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: "'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff", borderRadius: 18, border: `1px solid ${BD}`, maxWidth: 360, width: "100%",
        padding: "26px 22px 22px", textAlign: "center", boxShadow: "0 8px 40px rgba(124,58,237,0.18)",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: "1.02rem", color: TX, marginBottom: 6 }}>
          Sign in to use {feature}
        </div>
        <div style={{ fontSize: "0.82rem", color: MU, lineHeight: 1.55, marginBottom: 20 }}>
          AI features run on a rate-limited server endpoint tied to your account, so this one genuinely needs
          a sign-in — everything else in guest mode stays open.
        </div>
        <button type="button" onClick={onSignIn} style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg,${A},${A2})`, color: "#fff",
          fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8,
        }}>Sign in / Create free account →</button>
        <button type="button" onClick={onClose} style={{
          width: "100%", padding: "10px", borderRadius: 10, border: "none",
          background: "transparent", color: MU, fontSize: "0.8rem", fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>Not now</button>
      </div>
    </div>
  );
}

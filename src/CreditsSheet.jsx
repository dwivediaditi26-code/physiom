import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "./orthoFieldKit.jsx";
import { useAiCredits, adminSetBalance, adminSetPays, adminResetCase } from "./aiCredits.js";

// "Get credits" box (Aditi, 2026-10-10). There is no payment provider connected yet, so for now it explains
// what credits do and how to ask for more; when a provider is added, the button below is what changes.
export const CREDITS_EMAIL = "physiomind3@gmail.com";

// Only for admins (you and Anupam), on your OWN account: switch between "charge me like a normal user" and unlimited, set your
// own balance, and reset a case so Analyze Case counts as the first analysis again -- to try the credits without any SQL.
function AdminCreditTools({ caseKey }) {
  const credits = useAiCredits(caseKey);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function run(label, fn) {
    setBusy(true);
    setNote("");
    const r = await fn();
    setBusy(false);
    setNote(r.ok ? `✓ ${label}` : "Couldn't do that. Check your connection and try again.");
  }
  const btn = { border: "1px solid #D9D2F3", background: "#fff", color: BRAND.purpleDark, fontWeight: 700, fontFamily: "inherit", fontSize: 12.5, borderRadius: 9, padding: "0 12px", height: 32, cursor: "pointer" };
  return (
    <div data-testid="admin-credit-tools" style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: "#F6F3FF", border: "1px dashed #CFC4F5" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.ink }}>Admin test tools <span style={{ fontWeight: 600, color: BRAND.gray }}>(only you can see this)</span></div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", fontSize: 13, color: BRAND.ink }}>
        <input type="checkbox" checked={credits.adminPays} disabled={busy} onChange={(e) => run(e.target.checked ? "You are now charged like a normal user." : "You are now unlimited.", () => adminSetPays(e.target.checked, caseKey))} />
        Charge me like a normal user
      </label>
      <div style={{ fontSize: 12, color: BRAND.gray, marginBottom: 4 }}>Set my credits to</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[0, 1, 5, 50, 500].map((n) => (
          <button key={n} type="button" style={btn} disabled={busy} onClick={() => run(`You now have ${n} credit${n === 1 ? "" : "s"}.`, () => adminSetBalance(n, caseKey))}>{n}</button>
        ))}
      </div>
      {caseKey && (
        <button type="button" style={{ ...btn, marginTop: 8 }} disabled={busy} onClick={() => run("This case is reset: the next Analyze Case is a first analysis again.", () => adminResetCase(caseKey))}>
          Reset this case
        </button>
      )}
      {note && <div role="status" style={{ marginTop: 8, fontSize: 12.5, color: note.startsWith("✓") ? "#166534" : "#92400E" }}>{note}</div>}
    </div>
  );
}

export default function CreditsSheet({ open, onClose, balance = 0, unlimited = false, signedIn = true, reason, isAdmin = false, caseKey }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus?.();
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const mail = `mailto:${CREDITS_EMAIL}?subject=${encodeURIComponent("PhysioMind credits")}&body=${encodeURIComponent("Hi, I would like more PhysioMind credits.\n\nRegistered email:\nHow many:\n")}`;
  const row = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4, color: BRAND.ink, padding: "6px 0" };
  const tag = (free) => ({ flexShrink: 0, minWidth: 54, textAlign: "center", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: free ? "#ECFDF3" : BRAND.purpleFaint, color: free ? "#166534" : BRAND.purpleDark });

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(20,10,45,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
      data-testid="credits-sheet-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-sheet-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: "18px 18px 0 0", padding: "18px 16px calc(18px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)", maxHeight: "88vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 id="credits-sheet-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BRAND.ink, flex: 1 }}>Get credits</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: BRAND.purpleFaint, color: BRAND.purpleDark, width: 32, height: 32, borderRadius: 10, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: BRAND.purpleFaint, fontSize: 14, fontWeight: 700, color: BRAND.purpleDark }} data-testid="credits-sheet-balance">
          {!signedIn ? "Sign in to see your credits" : unlimited ? "Unlimited credits (admin)" : `You have ${balance} credit${balance === 1 ? "" : "s"}`}
        </div>
        {reason && signedIn && !unlimited && balance < 1 && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#92400E", background: "#FFF7E6", borderRadius: 10, padding: "8px 10px", lineHeight: 1.4 }} role="status">{reason}</div>
        )}

        <div style={{ marginTop: 12 }}>
          <div style={row}><span style={tag(false)}>1 credit</span><span><b>Generate with AI</b> in "Fill in a paragraph" (only when the AI answers)</span></div>
          <div style={row}><span style={tag(false)}>1 credit</span><span><b>Analyze Case</b> the first time for a case</span></div>
          <div style={row}><span style={tag(true)}>Free</span><span>The <b>first 3</b> meaningful re-analyses of the same case</span></div>
          <div style={row}><span style={tag(true)}>Free</span><span>Spelling or formatting edits, opening a saved analysis, and adding findings</span></div>
          <div style={row}><span style={tag(false)}>1 credit</span><span>Each meaningful re-analysis after those 3</span></div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12.5, color: BRAND.gray, lineHeight: 1.45 }}>
          Buying credits inside the app is not open yet. To top up, email us from the address you registered with and say how many you need.
        </div>
        {isAdmin && signedIn && <AdminCreditTools caseKey={caseKey} />}
        <a href={mail} style={{ display: "block", marginTop: 12, textAlign: "center", textDecoration: "none", background: BRAND.purple, color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 12px", borderRadius: 12 }}>
          Email {CREDITS_EMAIL}
        </a>
      </div>
    </div>,
    document.body
  );
}

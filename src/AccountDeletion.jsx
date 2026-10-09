// AccountDeletion.jsx — self-service "export, then delete" account flow.
//
// Backs the Privacy Policy's promise that a user can "request deletion of
// your account and all associated patient data" (LegalPages.jsx, section 6)
// with real, immediate, user-triggered code instead of a manual process
// someone has to remember to run by hand. Deleting the auth user cascades
// to every patient row they own (ON DELETE CASCADE on patients.user_id --
// see supabase_rls_setup.sql), via api/deleteAccount.js.
//
// Exporting first is offered, not required -- DPDP's right to erasure isn't
// conditional on also exercising the portability right first, and some
// users genuinely just want their account gone.
//
// Two screens (2026-10, Aditi: "it should show what will happen ... ask are you
// sure ... ask password then only they can delete"): 1) what will be erased
// and what will not, with the optional download; 2) "Are you sure?" plus the
// account password. The password is checked on the server (api/deleteAccount.js),
// not just here, so this dialog cannot be skipped by calling the API directly.

import React, { useState } from "react";
import { supabase, authHeader } from "./supabase.js";
import { apiUrl } from "./apiUrl.js";
import { clearSessionKey } from "./localCrypto.js";
import { clearPatientCache, forgetDeviceCopy } from "./PatientDatabase.jsx";

function downloadPatientsJSON(patients) {
  const data = JSON.stringify(patients, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `physiomind_patient_export_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const BTN = { padding: "10px", borderRadius: 9, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" };

export default function DeleteAccountButton({ patients, buttonStyle }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("info"); // "info" -> "confirm"
  const [exported, setExported] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const patientCount = Array.isArray(patients) ? patients.length : 0;

  const close = () => {
    setOpen(false); setStage("info"); setPassword(""); setShowPassword(false); setError("");
  };

  const handleDelete = async (e) => {
    e?.preventDefault();
    if (busy || !password) return;
    setBusy(true); setError("");
    try {
      let uid = null;
      try { uid = (await supabase.auth.getSession())?.data?.session?.user?.id || null; } catch { /* only needed to forget this device's copy */ }
      const res = await fetch(apiUrl("/api/deleteAccount"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not delete your account. Please try again or email support.");
        if (body.code === "wrong_password") setPassword("");
        setBusy(false);
        return;
      }
      // The account (and, via cascade, every patient row) is already gone
      // server-side at this point. Wipe the local encrypted cache + the
      // in-memory key -- there is no account left for either to belong to
      // -- then sign out. signOut() is wrapped in try/catch: it may try to
      // invalidate a refresh token for a user that no longer exists, but
      // must not block the client-side cleanup that actually matters here.
      clearPatientCache();
      clearSessionKey();
      try { if (uid) await forgetDeviceCopy(uid); } catch { /* the account is gone either way */ }
      try { await supabase.auth.signOut(); } catch {}
    } catch (e) {
      setError("Network error — please try again.");
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={buttonStyle || {
        padding: "6px 12px", borderRadius: 9, border: "1px solid #FCA5A5",
        background: "transparent", color: "#DC2626", fontSize: "0.8rem",
        fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
      }}>
        Delete account
      </button>
    );
  }

  const li = { marginBottom: 6 };

  return (
    <div onClick={() => !busy && close()} style={{
      position: "fixed", inset: 0, background: "rgba(15,8,30,0.75)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div role="dialog" aria-modal="true" aria-label="Delete your account" onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>

        {stage === "info" && (
          <>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#1a1025", marginBottom: 6 }}>Delete your account?</div>
            <p style={{ fontSize: "0.84rem", color: "#4B5563", lineHeight: 1.6, marginBottom: 12 }}>
              Please read this first. Deleting your account is <strong>permanent</strong> and <strong>cannot be undone</strong>.
            </p>

            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#991B1B", marginBottom: 6 }}>What will happen</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "#4B5563", lineHeight: 1.5 }}>
                <li style={li}>You will be signed out and can <strong>never sign in to this account again</strong>. You can sign up again later, but you will start from zero.</li>
                <li style={li}>
                  {patientCount > 0
                    ? <>All <strong>{patientCount} patient record{patientCount === 1 ? "" : "s"}</strong> and assessments you saved are erased for good.</>
                    : <>Every patient record and assessment you saved is erased for good.</>}
                </li>
                <li style={li}>Your PhysioFeed profile, posts, comments, stories, saved items, job applications and notifications are erased.</li>
                <li style={li}>Your messages are erased, <strong>including from other people's inboxes</strong>.</li>
                <li style={li}>Photos, videos, documents and CVs you uploaded are erased.</li>
                <li style={li}>Backup copies are removed within 90 days. Some technical usage records may be kept for a while — see the Privacy Policy.</li>
                <li style={{ ...li, marginBottom: 0 }}>Nobody, including us, can bring any of this back afterwards.</li>
              </ul>
            </div>

            <div style={{ background: "#F5F0FB", border: "1px solid #D8CCE8", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1a1025", marginBottom: 6 }}>Want to keep a copy first? (recommended)</div>
              <p style={{ fontSize: "0.78rem", color: "#6B5B7A", marginBottom: 10 }}>
                Download all your patient data as a file before it is gone. On a phone, this saves to your Downloads / Files app so you keep a copy.
              </p>
              <button onClick={() => { downloadPatientsJSON(patients); setExported(true); }} style={{
                padding: "9px 14px", borderRadius: 9, border: "none", background: "#7c3aed", color: "#fff",
                fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
              }}>
                {exported ? "✓ Downloaded — download again" : "⬇ Download my patient data"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={close} style={{ ...BTN, flex: 1, border: "1px solid #D8CCE8", background: "#fff", color: "#4B5563" }}>
                Keep my account
              </button>
              <button onClick={() => setStage("confirm")} style={{ ...BTN, flex: 1, border: "none", background: "#DC2626", color: "#fff" }}>
                Continue
              </button>
            </div>
          </>
        )}

        {stage === "confirm" && (
          <form onSubmit={handleDelete}>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#1a1025", marginBottom: 6 }}>Are you sure you want to delete this account?</div>
            <p style={{ fontSize: "0.84rem", color: "#4B5563", lineHeight: 1.6, marginBottom: 16 }}>
              This is your last chance. Everything listed on the previous screen will be erased for good. To confirm it is really you, enter your password.
            </p>

            <label htmlFor="delete-account-password" style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#1a1025", marginBottom: 6 }}>Your password</label>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <input id="delete-account-password" type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} autoComplete="current-password" autoFocus disabled={busy}
                placeholder="Enter your password" style={{
                  width: "100%", padding: "10px 60px 10px 12px", borderRadius: 8, border: "1.5px solid #D8CCE8",
                  fontSize: "1rem", boxSizing: "border-box",
                }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"} style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none",
                color: "#7c3aed", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", padding: "6px 8px",
              }}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && (
              <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 8, padding: "9px 12px", fontSize: "0.78rem", marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => { setStage("info"); setError(""); setPassword(""); }} disabled={busy}
                style={{ ...BTN, flex: 1, border: "1px solid #D8CCE8", background: "#fff", color: "#4B5563" }}>
                Go back
              </button>
              <button type="submit" disabled={busy || !password} style={{
                ...BTN, flex: 1.4, border: "none",
                background: (busy || !password) ? "#F3A6A6" : "#DC2626",
                color: "#fff", cursor: (busy || !password) ? "default" : "pointer",
              }}>
                {busy ? "Deleting…" : "Yes, permanently delete my account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

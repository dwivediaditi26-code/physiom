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

import React, { useState } from "react";
import { supabase, authHeader } from "./supabase.js";
import { clearSessionKey } from "./localCrypto.js";
import { clearPatientCache } from "./PatientDatabase.jsx";

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

export default function DeleteAccountButton({ patients, buttonStyle }) {
  const [open, setOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const patientCount = Array.isArray(patients) ? patients.length : 0;

  const handleDelete = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/deleteAccount", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not delete your account. Please try again or email support.");
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

  return (
    <div onClick={() => !busy && setOpen(false)} style={{
      position: "fixed", inset: 0, background: "rgba(15,8,30,0.75)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#1a1025", marginBottom: 6 }}>Delete your account</div>
        <p style={{ fontSize: "0.84rem", color: "#4B5563", lineHeight: 1.6, marginBottom: 16 }}>
          This permanently deletes your account and all {patientCount} patient record{patientCount === 1 ? "" : "s"} — this cannot be undone.
        </p>

        <div style={{ background: "#F5F0FB", border: "1px solid #D8CCE8", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1a1025", marginBottom: 6 }}>Step 1 — Save a copy first (recommended)</div>
          <p style={{ fontSize: "0.78rem", color: "#6B5B7A", marginBottom: 10 }}>
            Download all your patient data as a file before it's gone. On a phone, this saves to your Downloads / Files app so you keep a copy.
          </p>
          <button onClick={() => { downloadPatientsJSON(patients); setExported(true); }} style={{
            padding: "9px 14px", borderRadius: 9, border: "none", background: "#7c3aed", color: "#fff",
            fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
          }}>
            {exported ? "✓ Downloaded — download again" : "⬇ Download my patient data"}
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1a1025", marginBottom: 6 }}>Step 2 — Confirm deletion</div>
          <p style={{ fontSize: "0.78rem", color: "#6B5B7A", marginBottom: 8 }}>Type <strong>DELETE</strong> to confirm.</p>
          <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" style={{
            width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #D8CCE8", fontSize: "0.85rem", boxSizing: "border-box",
          }} />
        </div>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 8, padding: "9px 12px", fontSize: "0.78rem", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setOpen(false)} disabled={busy} style={{
            flex: 1, padding: "10px", borderRadius: 9, border: "1px solid #D8CCE8", background: "#fff",
            color: "#4B5563", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={busy || confirmText !== "DELETE"} style={{
            flex: 1, padding: "10px", borderRadius: 9, border: "none",
            background: (busy || confirmText !== "DELETE") ? "#F3A6A6" : "#DC2626",
            color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: (busy || confirmText !== "DELETE") ? "default" : "pointer",
          }}>
            {busy ? "Deleting…" : "Permanently delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

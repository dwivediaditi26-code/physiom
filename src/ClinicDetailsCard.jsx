import React, { useState } from "react";
import { supabase } from "./supabase.js";

// Saved on the therapist's own account (auth user_metadata), which is exactly
// where the PDF reports already read clinician / clinic details from, so
// filling this in once puts them at the top of every report.
const FIELDS = [
  { key: "full_name", label: "Your name (clinician)", placeholder: "e.g. Aditi Sharma", autoComplete: "name" },
  { key: "clinic_name", label: "Clinic name", placeholder: "e.g. PhysioMind Therapy Centre" },
  { key: "clinic_address", label: "Clinic address", placeholder: "Street, city, PIN", multiline: true },
  { key: "clinic_phone", label: "Clinic phone", placeholder: "+91 98765 43210", type: "tel", autoComplete: "tel" },
];

export default function ClinicDetailsCard({ currentUser, isGuest }) {
  const meta = currentUser?.user_metadata || {};
  const [vals, setVals] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, meta[f.key] || ""])));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const canSave = !!currentUser?.id && !isGuest;

  const save = async () => {
    setSaving(true); setStatus("");
    const data = Object.fromEntries(FIELDS.map((f) => [f.key, vals[f.key].trim()]));
    const { error } = await supabase.auth.updateUser({ data });
    setSaving(false);
    setStatus(error ? "Couldn't save — check your connection and try again." : "Saved. These now appear at the top of your PDF reports.");
  };

  const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "#fff" };
  return (
    <div style={{ margin: "16px 0", padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>🏥 Clinic details for reports</div>
      <div style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 12px", lineHeight: 1.5 }}>
        Fill these in once. They appear at the top of every PDF you create (assessment, treatment plan, home programme), so you don't type them each time.
      </div>
      {FIELDS.map((f) => (
        <label key={f.key} style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#475569", marginBottom: 4 }}>{f.label}</span>
          {f.multiline
            ? <textarea rows={2} style={{ ...input, resize: "vertical" }} value={vals[f.key]} placeholder={f.placeholder} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
            : <input style={input} type={f.type || "text"} autoComplete={f.autoComplete} value={vals[f.key]} placeholder={f.placeholder} onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />}
        </label>
      ))}
      <button type="button" onClick={save} disabled={!canSave || saving}
        style={{ width: "100%", padding: "11px 14px", border: "none", borderRadius: 12, background: canSave ? "#7c3aed" : "#cbd5e1", color: "#fff", fontWeight: 700, fontSize: 14, cursor: canSave && !saving ? "pointer" : "not-allowed" }}>
        {saving ? "Saving…" : "Save clinic details"}
      </button>
      {!canSave && <div style={{ fontSize: 12, color: "#b45309", marginTop: 8 }}>Sign in to save these to your account.</div>}
      {status && <div role="status" style={{ fontSize: 12.5, marginTop: 8, fontWeight: 600, color: status.startsWith("Couldn't") ? "#dc2626" : "#059669" }}>{status}</div>}
    </div>
  );
}

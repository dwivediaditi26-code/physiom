import React, { useState, useCallback, lazy, Suspense } from "react";

// ════════════════════════════════════════════════════════════════════════
// TesterEntry — standalone preview build for external testers.
//
// Built 2026-09-24 (Aditi: wants 2-3 outside professionals to try Ortho/
// Neuro/Cardio without access to the real app — no login, no patient
// database, no PhysioFeed/Clinical/Learn/Settings). Deliberately a SEPARATE
// entry point (tester.html -> src/main-tester.jsx -> this file) rather than
// a mode flag inside AppFull.jsx: AppFull.jsx has another session's
// in-progress uncommitted work sitting in it, and this whole page never
// needs to touch it — Ortho/Neuro/Cardio already take a clean, decoupled
// prop contract ({patientData, activePatientId, onSave, onNav, navContext,
// requireAuth}), same as they're given in AppFull.jsx (see the
// LazyOrthoAssessmentNew/LazyNeuroAssessment/LazyCardioAssessment mounts
// there) — reused unmodified here, not reimplemented.
//
// Nothing here ever writes to Supabase: `data`/`set` below is pure local
// React state (same merge pattern as AppFull.jsx's own `set`), and
// `activePatientId` stays null forever, which all three modules already
// treat as a normal, fully-supported "no patient yet" state. Any deep
// feature that DOES call Supabase directly (template save/load) will just
// fail quietly with "not signed in", same as guest mode elsewhere in this
// app — acceptable for a throwaway preview.
// ════════════════════════════════════════════════════════════════════════

// Change this to whatever you want to hand testers. Anyone with this string
// (or who reads the deployed JS bundle) can get in — this is a soft
// deterrent against the link being casually forwarded/crawled, not real
// access control, since it's checked entirely client-side.
const TESTER_PASSCODE = "physiomind-preview";
const SESSION_KEY = "pm_tester_unlocked";

const LazyOrtho = lazy(() => import("./OrthoAssessmentNew.jsx"));
const LazyNeuro = lazy(() => import("./NeurologicalAssessment.jsx"));
const LazyCardio = lazy(() => import("./CardiopulmonaryAssessment.jsx"));

const ACCENT = "#7c3aed", ACCENT2 = "#9333ea", BORDER = "#E0E0E2", TEXT = "#0D0D0D", MUTED = "#6B6B6B";

const TOOLS = [
  { key: "ortho", label: "Orthopaedic Assessment", icon: "🦴", desc: "Pathway → region → condition → full clinical wizard.", Component: LazyOrtho },
  { key: "neuro", label: "Neurological Assessment", icon: "🧠", desc: "Full neuro exam: history, screening, exam, outcomes.", Component: LazyNeuro },
  { key: "cardio", label: "Cardiopulmonary Assessment", icon: "🫀", desc: "Vitals, cardiovascular/respiratory exam, functional capacity.", Component: LazyCardio },
];

function PasscodeGate({ onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (val.trim() === TESTER_PASSCODE) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      onUnlock();
    } else {
      setErr(true);
    }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8fc", padding: 20 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 360, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(90,40,130,0.10)" }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: TEXT, marginBottom: 4 }}>PhysioMind — Assessment Preview</div>
        <div style={{ fontSize: "0.85rem", color: MUTED, marginBottom: 18 }}>Enter the access code you were given to continue.</div>
        <input
          type="password" value={val} autoFocus
          onChange={(e) => { setVal(e.target.value); setErr(false); }}
          placeholder="Access code"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${err ? "#dc2626" : BORDER}`, fontSize: "0.9rem", outline: "none", marginBottom: err ? 6 : 16, boxSizing: "border-box" }}
        />
        {err && <div style={{ color: "#dc2626", fontSize: "0.78rem", marginBottom: 12 }}>That code isn't right — check with whoever sent you the link.</div>}
        <button type="submit" style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
          Continue
        </button>
      </form>
    </div>
  );
}

function Picker({ onPick }) {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8fc", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontWeight: 800, fontSize: "1.4rem", color: TEXT, marginBottom: 6 }}>PhysioMind — Assessment Preview</div>
        <div style={{ fontSize: "0.9rem", color: MUTED, marginBottom: 28 }}>
          Pick an assessment to try. This is a preview build — nothing you enter here is saved, and it resets if you reload.
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {TOOLS.map((t) => (
            <button key={t.key} onClick={() => onPick(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left", padding: "18px 20px", borderRadius: 14, border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,20,50,0.05)" }}>
              <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>{t.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: TEXT }}>{t.label}</div>
                <div style={{ fontSize: "0.82rem", color: MUTED, marginTop: 2 }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Notice({ text, onClose }) {
  if (!text) return null;
  return (
    <div style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", zIndex: 9999, background: "#1a1025", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", maxWidth: "90vw", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
      <span>{text}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", opacity: 0.7, cursor: "pointer", fontSize: "0.9rem" }}>✕</button>
    </div>
  );
}

export default function TesterEntry() {
  const [unlocked, setUnlocked] = useState(() => { try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; } });
  const [toolKey, setToolKey] = useState(null); // null = picker
  const [data, setData] = useState({});
  const [notice, setNotice] = useState("");

  const set = useCallback((idOrObj, val) => {
    if (typeof idOrObj === "object" && idOrObj !== null) {
      setData((prev) => ({ ...prev, ...idOrObj }));
    } else {
      setData((prev) => ({ ...prev, [idOrObj]: val }));
    }
  }, []);

  // Same gate shape as AppFull.jsx's requireAuth(featureLabel, bodyText) --
  // there is no real account here, ever, so this always blocks (like a
  // permanent guest) instead of prompting sign-in.
  const requireAuth = useCallback((featureLabel) => {
    setNotice(`"${featureLabel || "This feature"}" needs a real account and isn't available in this preview.`);
    return false;
  }, []);

  // Ortho/Neuro/Cardio all call onNav("clinical") to exit back to the app;
  // Cardio/Neuro also call onNav("physiofeed", {...}) from their Share
  // button. Neither destination exists standalone -- map the real exit
  // back to the picker, and surface anything else as a friendly no-op.
  const onNav = useCallback((key) => {
    if (key === "clinical") { setToolKey(null); return; }
    setNotice("That action isn't available in this preview build.");
  }, []);

  if (!unlocked) return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  if (!toolKey) return <Picker onPick={setToolKey} />;

  const tool = TOOLS.find((t) => t.key === toolKey);
  const Component = tool.Component;

  return (
    <>
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: MUTED }}>Loading…</div>}>
        <Component patientData={data} activePatientId={null} onSave={set} onNav={onNav} navContext={{}} requireAuth={requireAuth} />
      </Suspense>
      <Notice text={notice} onClose={() => setNotice("")} />
    </>
  );
}

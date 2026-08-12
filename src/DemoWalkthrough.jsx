// DemoWalkthrough.jsx — pre-login, scripted, read-only preview of the core
// workflow (Subjective -> AI Intake -> ROM -> SOAP) using one canned demo
// patient (Rahul). Deliberately NOT an interactive guest mode: no writes,
// no Supabase calls, no real data entry -- just enough of the real
// workflow visible that a visitor understands what they'd be signing up
// for, before hitting a "Create your free account" CTA. See SKILL notes
// in AuthScreen.jsx for why a full unauthenticated guest flow was
// intentionally NOT built here.

import React, { useState } from "react";

const A = "#7c3aed", A2 = "#9333ea", BG = "#faf8fc", SUR = "#ffffff",
  BD = "#e4d9f2", TX = "#1a1025", MU = "#7e6a9a", S2 = "#f5f0fb";

// Canned demo data -- same patient used across every step so the walkthrough
// reads as one coherent case, not disconnected screenshots.
const DEMO = {
  name: "Rahul", age: 28, gender: "Male",
  cc: "Neck pain", onset: "Gradual", duration: "4 months", pain: 6,
  aggravating: "Prolonged laptop work",
  narrative: "Neck pain for 4 months. Gradual onset. Pain increases with prolonged laptop work.",
  rom: [
    { label: "Flexion", value: "45°" },
    { label: "Extension", value: "40°" },
    { label: "Right Lateral Flexion", value: "30°" },
    { label: "Left Lateral Flexion", value: "28°" },
    { label: "Right Rotation", value: "60°" },
    { label: "Left Rotation", value: "55°" },
  ],
  soap: {
    s: "Neck pain for 4 months. Gradual onset. Increases with prolonged laptop work. Pain score 6/10.",
    o: "Forward head posture. ROM limited in lateral flexion. Spurling's test positive. MMT: weakness in deep neck flexors.",
    a: "Mechanical neck pain with postural dysfunction.",
    p: "Manual therapy, posture correction, strengthening, stretching, HEP. Review in 7 days.",
  },
};

function StepChrome({ step, total, title, onBack, onClose, children }) {
  return (
    <div style={{
      background: SUR, borderRadius: 20, border: `1px solid ${BD}`,
      boxShadow: "0 4px 32px rgba(124,58,237,0.1)", overflow: "hidden",
      width: "100%", maxWidth: 420,
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 18px", borderBottom: `1px solid ${BD}`, background: S2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {step > 1 && (
            <button type="button" onClick={onBack} aria-label="Back"
              style={{ background: "none", border: "none", color: A, fontSize: "1.1rem",
                cursor: "pointer", padding: 2, lineHeight: 1 }}>←</button>
          )}
          <div style={{ fontWeight: 800, fontSize: "0.92rem", color: TX, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: MU }}>{step}/{total}</span>
          <button type="button" onClick={onClose} aria-label="Close demo"
            style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${BD}`,
              background: SUR, color: MU, fontSize: "0.85rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      </div>
      {/* Demo banner -- always visible, never lets this be mistaken for a real record */}
      <div style={{ padding: "8px 18px", background: "#fef9e7", borderBottom: `1px solid ${BD}`,
        fontSize: "0.72rem", color: "#92720c", fontWeight: 600, textAlign: "center" }}>
        👤 Exploring demo patient "{DEMO.name}" — nothing here is saved
      </div>
      <div style={{ padding: "20px 18px" }}>{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: MU, textTransform: "uppercase",
        letterSpacing: "0.6px", marginBottom: 4 }}>{label}</div>
      <div style={{ padding: "10px 12px", borderRadius: 10, background: S2,
        border: `1.5px solid ${BD}`, fontSize: "0.85rem", color: TX, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function StepSubjective() {
  return (
    <div>
      <Field label="Chief Complaint" value={DEMO.cc} />
      <Field label="Onset" value={DEMO.onset} />
      <Field label="Duration" value={DEMO.duration} />
      <Field label={`Pain (0–10)`} value={`${DEMO.pain} / 10`} />
      <Field label="Aggravating Factors" value={DEMO.aggravating} />
    </div>
  );
}

function StepAIIntake() {
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: A2, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
          flexShrink: 0 }}>🧑‍⚕️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: MU, marginBottom: 3 }}>You (Therapist)</div>
          <div style={{ padding: "10px 12px", borderRadius: "4px 12px 12px 12px", background: S2,
            border: `1px solid ${BD}`, fontSize: "0.82rem", color: TX, lineHeight: 1.5 }}>{DEMO.narrative}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: A, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
          flexShrink: 0 }}>✦</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: MU, marginBottom: 3 }}>AI Assistant</div>
          <div style={{ padding: "12px 14px", borderRadius: "4px 12px 12px 12px",
            background: "linear-gradient(135deg,#f5f3ff,#faf5ff)", border: `1px solid #ddd6fe` }}>
            <div style={{ fontSize: "0.72rem", color: MU, marginBottom: 8 }}>
              Structured subjective information, extracted from the narrative above:
            </div>
            {[["Chief Complaint", DEMO.cc], ["Onset", DEMO.onset], ["Duration", DEMO.duration],
              ["Pain", `${DEMO.pain}/10`], ["Aggravating Factors", DEMO.aggravating]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0",
                fontSize: "0.78rem" }}>
                <span style={{ color: MU, fontWeight: 600 }}>{l}</span>
                <span style={{ color: TX, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.65rem", color: MU, marginTop: 6 }}>
            AI-assisted extraction — the therapist reviews and confirms every field before it's saved.
          </div>
        </div>
      </div>
    </div>
  );
}

function StepROM() {
  return (
    <div>
      <div style={{ fontSize: "0.78rem", color: MU, marginBottom: 14 }}>Recorded range-of-motion values</div>
      {DEMO.rom.map(r => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "11px 2px", borderBottom: `1px solid ${BD}` }}>
          <span style={{ fontSize: "0.82rem", color: TX, fontWeight: 600 }}>{r.label}</span>
          <span style={{ fontSize: "0.88rem", color: A, fontWeight: 800 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function StepSOAP() {
  const rows = [["S", "Subjective", DEMO.soap.s], ["O", "Objective", DEMO.soap.o],
    ["A", "Assessment", DEMO.soap.a], ["P", "Plan", DEMO.soap.p]];
  return (
    <div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
        borderRadius: 99, background: "#f5f3ff", border: "1px solid #ddd6fe", marginBottom: 14 }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: A }}>✦ AI-Generated Draft</span>
      </div>
      {rows.map(([letter, label, text]) => (
        <div key={letter} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: A, color: "#fff",
              fontSize: "0.68rem", fontWeight: 800, display: "flex", alignItems: "center",
              justifyContent: "center" }}>{letter}</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: MU }}>{label}</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: TX, lineHeight: 1.55, paddingLeft: 26 }}>{text}</div>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { key: "subjective", title: "Subjective Assessment", Comp: StepSubjective },
  { key: "ai", title: "AI Patient Intake", Comp: StepAIIntake },
  { key: "rom", title: "ROM — Neck", Comp: StepROM },
  { key: "soap", title: "SOAP Notes + AI", Comp: StepSOAP },
];

export default function DemoWalkthrough({ onClose, onCreateAccount }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const { title, Comp } = STEPS[i];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,16,37,0.55)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      fontFamily: "'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <StepChrome step={i + 1} total={STEPS.length} title={title}
        onBack={() => setI(v => Math.max(0, v - 1))} onClose={onClose}>
        <Comp />
        <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
          {!last ? (
            <button type="button" onClick={() => setI(v => v + 1)} style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${A},${A2})`, color: "#fff",
              fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Next →</button>
          ) : (
            <button type="button" onClick={onCreateAccount} style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${A},${A2})`, color: "#fff",
              fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Create your free account →</button>
          )}
        </div>
        {last && (
          <div style={{ textAlign: "center", marginTop: 10, fontSize: "0.72rem", color: MU }}>
            This was demo patient "{DEMO.name}" — your real patients save securely to your own account.
          </div>
        )}
      </StepChrome>
    </div>
  );
}

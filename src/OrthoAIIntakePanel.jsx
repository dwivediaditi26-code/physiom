import React, { useEffect, useRef, useState } from "react";
import { Hint } from "./orthoFieldKit.jsx";
import { authHeader } from "./supabase.js";
import { mapParseResultToOrthoUpdates } from "./orthoAiIntake.js";

/* ============================================================
   OrthoAIIntakePanel — "say your assessment in your own words"
   for the new Ortho Outpatient wizard's Subjective step. Reuses
   the old flow's proven mechanism (Web Speech API for voice,
   POST /api/parse for extraction) but applies the result to this
   wizard's nested data.subjective/data.pain shape via
   orthoAiIntake.js instead of the old flow's flat field names.

   onApply(updates) receives { subjective, pain, flags, ... } from
   mapParseResultToOrthoUpdates — the caller decides how to merge it
   (SubjectiveSection merges into both data.subjective and data.pain
   via the wizard's top-level setData).
   ============================================================ */
export default function OrthoAIIntakePanel({ onApply, requireAuth, defaultOpen }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | recording | processing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef(null);

  function openPanel() {
    if (requireAuth && !requireAuth("AI Assessment Intake")) return;
    setOpen(true);
  }

  // "Start with AI" from the New Assessment picker opens straight into this
  // box instead of landing on the collapsed toggle -- still goes through the
  // same requireAuth gate a manual tap would.
  useEffect(() => {
    if (defaultOpen) openPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen]);

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input requires the Chrome browser.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      let combined = "";
      for (let i = 0; i < e.results.length; i++) combined += e.results[i][0].transcript + " ";
      setText(combined.trim());
    };
    rec.onerror = () => setStatus("idle");
    rec.onend = () => setStatus((s) => (s === "recording" ? "idle" : s));
    rec.start();
    recognitionRef.current = rec;
    setStatus("recording");
  }
  function stopRecording() {
    recognitionRef.current?.stop();
    setStatus("idle");
  }

  async function runParse() {
    if (!text.trim()) return;
    setStatus("processing");
    setErrorMsg("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Parse failed — try again.");
      setResult(json);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong.");
      setStatus("error");
    }
  }

  function apply() {
    onApply(mapParseResultToOrthoUpdates(result));
    close();
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setText("");
  }

  if (!open) {
    return (
      <button type="button" className="ai-intake-toggle" onClick={openPanel}>
        ✨ Say your assessment in your own words
      </button>
    );
  }

  return (
    <div className="ai-intake-panel">
      <div className="ai-intake-head">
        <span>✨ AI Assessment Intake</span>
        <button type="button" className="sheet-close" onClick={close} aria-label="Close">
          ✕
        </button>
      </div>
      <Hint>Describe the patient's history in your own words — AI structures it into Subjective and Pain below for you to review and edit before anything is saved.</Hint>

      {status !== "done" && (
        <>
          <textarea
            className="ai-intake-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 45 year old office worker, gradual onset right shoulder pain over 6 weeks, worse overhead and at night, no trauma..."
            rows={5}
            disabled={status === "processing" || status === "recording"}
          />
          <div className="ai-intake-actions">
            {status === "recording" ? (
              <button type="button" className="primary-btn" onClick={stopRecording}>
                ⏹ Stop recording
              </button>
            ) : (
              <button type="button" className="ghost-btn" onClick={startRecording} disabled={status === "processing"}>
                🎤 Voice
              </button>
            )}
            <button type="button" className="primary-btn" onClick={runParse} disabled={!text.trim() || status === "processing" || status === "recording"}>
              {status === "processing" ? "Parsing…" : "✦ Parse with AI"}
            </button>
          </div>
          {status === "error" && <div className="ai-intake-error">{errorMsg}</div>}
        </>
      )}

      {status === "done" && result && (
        <div className="ai-intake-review">
          {(() => {
            // Same "Extracted Patient Information" card as the old flow's
            // AI intake review (SubjectiveObjective.jsx) -- icon + label on
            // the left, bold value on the right, so a clinician moving
            // between the old and new tools sees the same review shape
            // instead of a plain key:value list. `result` here is the raw
            // /api/parse response, same shape the old flow's card reads.
            const v = result;
            const fmtList = (arr) => (Array.isArray(arr) && arr.length ? arr.join(", ") : null);
            const agg = fmtList([...(v.aggMovements || []), ...(v.aggActivities || [])]);
            const radiation = v.hasRadiation === false ? "No radiation"
              : v.radiationArea ? v.radiationArea + (v.radiationSide ? ` (${v.radiationSide})` : "")
              : v.hasRadiation === true ? "Yes" : null;
            const region = v.region ? v.region + (v.laterality ? ` (${v.laterality})` : "") : null;
            const hasRedFlags = Array.isArray(v.flags) && v.flags.length > 0;

            // "Onset" shows TIME-SINCE (the real `duration` field) --
            // separate from "Mechanism of Injury" (the real `onset` field,
            // which holds the HOW-it-started enum) -- same split the old
            // flow's card uses so the two concepts read the same way.
            const rows = [
              { icon: "🧑", label: "Age", value: v.age ? `${v.age} Years` : null },
              { icon: "⚧", label: "Gender", value: v.sex || null },
              { icon: "💼", label: "Occupation", value: v.occupation || null },
              { icon: "🧭", label: "Region", value: region },
              { icon: "🎯", label: "Chief Complaint", value: v.chiefComplaint || null },
              { icon: "📅", label: "Onset", value: v.duration || null },
              { icon: "💥", label: "Mechanism of Injury", value: v.onset || null },
              { icon: "❔", label: "Mechanism Detail", value: v.onsetContext || null },
              { icon: "⚡", label: "Aggravating Factors", value: agg },
              { icon: "🍃", label: "Relieving Factors", value: fmtList(v.relMovements) },
              { icon: "🌡️", label: "Pain Now (NRS 0–10)", value: v.nrsNow != null ? `${v.nrsNow} / 10` : null, pill: true },
              { icon: "📈", label: "Pain Worst (NRS 0–10)", value: v.nrsWorst != null ? `${v.nrsWorst} / 10` : null, pill: true },
              { icon: "📉", label: "Pain Best (NRS 0–10)", value: v.nrsBest != null ? `${v.nrsBest} / 10` : null, pill: true },
              { icon: "🩹", label: "Pain Quality", value: fmtList(v.painQuality) },
              { icon: "📊", label: "Pain Behaviour", value: v.symptomPattern || v.diurnalPattern || null },
              { icon: "📍", label: "Location", value: v.locationDescription || null },
              { icon: "🔀", label: "Radiation", value: radiation },
              { icon: "✨", label: "Numbness / Tingling", value: fmtList(v.neuroSymptoms) },
              { icon: "🚩", label: "Red Flags", value: Array.isArray(v.flags) ? (hasRedFlags ? v.flags.join(", ") : "No red flags reported") : null, tint: Array.isArray(v.flags) ? (hasRedFlags ? "red" : "green") : undefined },
              { icon: "🏁", label: "Patient Goals", value: v.patientGoals || null },
              { icon: "😟", label: "Main Concern", value: v.patientConcern || null },
              { icon: "💭", label: "Patient's Belief", value: v.patientBelief || null },
              { icon: "🔁", label: "Prior Episode", value: v.priorEpisodeCount ? `${v.priorEpisodeCount} (${v.priorEpisodeOutcome || "outcome not stated"})` : null },
              { icon: "💊", label: "Treatment Tried", value: v.priorTreatmentTried || null },
              { icon: "📋", label: "Medical History", value: v.medicalHistory || null },
              { icon: "💊", label: "Medications", value: v.medications || null },
              { icon: "🚫", label: "Functional Limitations", value: fmtList(v.functionalLimitations) },
            ].filter((r) => r.value != null && r.value !== "");

            return (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EDEBFB", boxShadow: "0 2px 10px rgba(124,58,237,0.06)", overflow: "hidden", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #F0EEFB" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", flexShrink: 0 }}>🩺</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0D0D0D" }}>Extracted Patient Information</div>
                    <div style={{ fontSize: "0.72rem", color: "#8B8B8D" }}>Review and confirm the details below</div>
                  </div>
                  <button type="button" onClick={runParse} title="Re-parse this narrative" style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #E0E0E2", background: "transparent", color: "#7c3aed", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↻</button>
                </div>
                {rows.map((r, i) => {
                  const tintBg = r.tint === "red" ? "#fef2f2" : r.tint === "green" ? "#f0fdf4" : "#f5f3ff";
                  return (
                    <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < rows.length - 1 ? "1px solid #F3F2F9" : "none" }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: tintBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>{r.icon}</span>
                      <span style={{ fontSize: "0.78rem", color: "#8B8B8D", flexShrink: 0 }}>{r.label}</span>
                      {r.pill ? (
                        <span style={{ marginLeft: "auto", fontSize: "0.76rem", fontWeight: 800, color: "#5b21b6", background: "#f5f3ff", padding: "3px 10px", borderRadius: 99, flexShrink: 0 }}>{r.value}</span>
                      ) : (
                        <span style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 700, color: "#0D0D0D", textAlign: "right", maxWidth: "55%" }}>{r.value}</span>
                      )}
                    </div>
                  );
                })}
                <div style={{ padding: "8px 14px 10px", fontSize: "0.7rem", color: "#8B8B8D" }}>
                  {rows.length} field{rows.length === 1 ? "" : "s"} extracted
                </div>
              </div>
            );
          })()}

          <div className="ai-intake-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setStatus("idle");
                setResult(null);
              }}
            >
              Re-try
            </button>
            <button type="button" className="primary-btn" onClick={apply}>
              ✓ Apply to Subjective &amp; Pain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

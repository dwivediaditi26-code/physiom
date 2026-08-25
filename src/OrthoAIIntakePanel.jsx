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
          <div className="subheading" style={{ marginTop: 0 }}>
            Review before applying
          </div>
          {result.chiefComplaint && (
            <div className="ai-intake-row">
              <b>Chief complaint:</b> {result.chiefComplaint}
            </div>
          )}
          {result.onset && (
            <div className="ai-intake-row">
              <b>Onset:</b> {result.onset}
            </div>
          )}
          {result.duration && (
            <div className="ai-intake-row">
              <b>Duration:</b> {result.duration}
            </div>
          )}
          {(result.nrsNow != null || result.nrsWorst != null || result.nrsBest != null) && (
            <div className="ai-intake-row">
              <b>Pain (NRS):</b> now {result.nrsNow ?? "—"}, worst {result.nrsWorst ?? "—"}, best {result.nrsBest ?? "—"}
            </div>
          )}
          {result.painQuality?.length > 0 && (
            <div className="ai-intake-row">
              <b>Pain quality:</b> {result.painQuality.join(", ")}
            </div>
          )}
          {result.aggMovements?.length > 0 && (
            <div className="ai-intake-row">
              <b>Aggravating:</b> {result.aggMovements.join(", ")}
            </div>
          )}
          {result.relMovements?.length > 0 && (
            <div className="ai-intake-row">
              <b>Relieving:</b> {result.relMovements.join(", ")}
            </div>
          )}
          {result.functionalLimitations?.length > 0 && (
            <div className="ai-intake-row">
              <b>Function:</b> {result.functionalLimitations.join(", ")}
            </div>
          )}
          {result.flags?.length > 0 && (
            <div className="ai-intake-row ai-intake-flag">
              🚩 <b>Flags to review:</b> {result.flags.join(", ")}
            </div>
          )}
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

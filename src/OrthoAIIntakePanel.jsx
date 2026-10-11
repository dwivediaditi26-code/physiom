import React, { useEffect, useRef, useState } from "react";
import { Hint } from "./orthoFieldKit.jsx";
import { authHeader } from "./supabase.js";
import { apiUrl } from "./apiUrl.js";
import { mapParseResultToOrthoUpdates } from "./orthoAiIntake.js";
import { useIsAdmin } from "./useIsAdmin.js";
import { useAiCredits, creditsEnforced, applyServerBalance, newRequestId } from "./aiCredits.js";
import CreditsSheet from "./CreditsSheet.jsx";

const PROVIDER_NAMES = { groq: "Groq", gemini: "Gemini" };

// Rough price of one intake from the token line the server sends, using the
// paid prices per 1M tokens (USD): Gemini 3.5 Flash-Lite 0.30 in / 2.50 out
// (thinking counts as out), Groq gpt-oss-120b 0.15 in / 0.60 out; ~87 rupees a dollar.
// Admin-only guide, not a bill.
const PRICE_PER_MILLION = { gemini: [0.30, 2.50], groq: [0.15, 0.60] };
export function estimateRupees(note) {
  let usd = 0;
  String(note || "").split("|").forEach((part) => {
    const m = /^\s*(\w+): in (\d+), out (\d+)(?:, thinking (\d+))?/.exec(part);
    const price = m && PRICE_PER_MILLION[m[1]];
    if (price) usd += (Number(m[2]) * price[0] + (Number(m[3]) + Number(m[4] || 0)) * price[1]) / 1e6;
  });
  return usd ? (usd * 87).toFixed(2) : "";
}

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
export default function OrthoAIIntakePanel({ onApply, requireAuth, defaultOpen, variant }) {
  // variant="card" is the AI path's Subjective step (Aditi, 2026-10-10): a small, always-visible,
  // OPTIONAL "Fill in a paragraph" card above the manual form. It never opens itself or runs by
  // itself, and the sign-in check waits for the moment someone taps Voice or Generate, so a guest
  // can still see the card and go straight to typing. The default variant is the old toggle + panel.
  const card = variant === "card";
  const [open, setOpen] = useState(card);
  const [applied, setApplied] = useState(false);
  // Credits: a paragraph costs 1 credit, taken by the server (api/parse.js) only when the AI answers. Here we only
  // show the cost, stop a tap when the balance is 0 (opening Get credits instead), and show the new balance.
  const credits = useAiCredits();
  const enforced = creditsEnforced(credits.state, !!requireAuth);
  const costsCredit = enforced && !credits.unlimited;
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingRequest = useRef(null); // same id for a retry after a lost reply, so it is never charged twice
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | recording | processing | done | error
  const [result, setResult] = useState(null);
  const [provider, setProvider] = useState(null); // which AI answered (admins see it, see below)
  const [usageNote, setUsageNote] = useState(null); // token counts of this intake (admins)
  const [orderNote, setOrderNote] = useState(null); // which AIs the server has keys for, in the order it tries them
  const [skippedNote, setSkippedNote] = useState(null); // why a provider that was tried first was skipped
  const isAdmin = useIsAdmin();
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
    if (card && requireAuth && !requireAuth("AI Assessment Intake")) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input requires the Chrome browser.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    // Summing e.results[0..length] on every event (the old code) double-
    // counts on a long dictation: continuous mode periodically re-segments
    // and the browser/webview can hand back already-finalized entries again
    // alongside new ones, so re-flattening the whole array each time
    // re-appends old text on top of itself -- "I have I have a I have a
    // serious..." (2026-09-25, Aditi, speaking the Subjective narrative).
    // `finalTranscript` is a plain closure variable (one per recording
    // session, since `start`/`onresult` are recreated fresh each press) that
    // only ever grows by appending truly-final segments starting at
    // `e.resultIndex` -- the one index the API guarantees is where THIS
    // event's new/changed results begin -- so older, already-committed
    // indices are never re-summed no matter how the engine re-emits them.
    let finalTranscript = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += transcript + " ";
        else interim += transcript;
      }
      setText((finalTranscript + interim).trim());
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
    // A second tap while the first is still running must not send the paragraph again.
    if (!text.trim() || status === "processing") return;
    if (card && requireAuth && !requireAuth("AI Assessment Intake")) return;
    // No credits: open Get credits instead of calling the AI at all.
    if (credits.state === "ready" && !credits.unlimited && credits.balance < 1) { setSheetOpen(true); return; }
    if (!pendingRequest.current || pendingRequest.current.text !== text) pendingRequest.current = { text, id: newRequestId() };
    setStatus("processing");
    setErrorMsg("");
    setApplied(false);
    try {
      const headers = await authHeader();
      const res = await fetch(apiUrl("/api/parse"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Request-Id": pendingRequest.current.id, ...headers },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      pendingRequest.current = null; // the server really answered, so the next tap is a new request
      applyServerBalance(res.headers?.get?.("X-AI-Credits"));
      if (res.status === 402) {
        applyServerBalance(String(json.balance ?? 0));
        setStatus("idle");
        setSheetOpen(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Parse failed — try again.");
      // Which AI answered (api/_lib/llm.js sets this header). Printed to the
      // browser console so a test build can show Groq vs Gemini; no patient text.
      const answeredBy = res.headers?.get?.("X-AI-Provider") || null;
      if (answeredBy) console.info("[AI intake] answered by", answeredBy);
      setProvider(answeredBy);
      setSkippedNote(res.headers?.get?.("X-AI-Fallback") || null);
      setOrderNote(res.headers?.get?.("X-AI-Order") || null);
      setUsageNote(res.headers?.get?.("X-AI-Usage") || null);
      setResult({ ...json, _narrative: text });
      setStatus("done");
    } catch (e) {
      setErrorMsg(e.message || "Something went wrong.");
      setStatus("error");
    }
  }

  function apply() {
    onApply(mapParseResultToOrthoUpdates(result));
    if (card) {
      // The card stays on the page; it only says what happened. Everything AI filled is already
      // in the form below, where it can be edited like anything typed by hand.
      setStatus("idle");
      setResult(null);
      setErrorMsg("");
      setText("");
      setApplied(true);
    } else close();
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
    <div className={"ai-intake-panel" + (card ? " ai-card" : "")}>
      <CreditsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        balance={credits.balance}
        unlimited={credits.unlimited}
        signedIn={credits.state !== "guest"}
        reason="You need 1 credit to generate with AI. Typing the history yourself is always free."
      />
      {card ? (
        <>
          <div className="ai-card-head">
            <span className="ai-card-spark" aria-hidden="true">✨</span>
            <h3 className="ai-card-title">Fill in a paragraph</h3>
            <span className="ai-card-optional">{costsCredit ? "Optional · 1 credit" : "Optional"}</span>
          </div>
          <p className="ai-card-desc">Describe the history in your own words. AI organizes it into the form below for you to review and edit.</p>
        </>
      ) : (
        <>
          <div className="ai-intake-head">
            <span>✨ AI Assessment Intake</span>
            <button type="button" className="sheet-close" onClick={close} aria-label="Close">
              ✕
            </button>
          </div>
          <Hint>Describe the patient's history in your own words — AI structures it into Subjective and Pain below for you to review and edit before anything is saved.</Hint>
        </>
      )}

      {status !== "done" && (
        <>
          <textarea
            className="ai-intake-textarea"
            value={text}
            onChange={(e) => { setText(e.target.value); if (applied) setApplied(false); }}
            placeholder={card
              ? "45-year-old with gradual onset of right shoulder pain for 6 weeks…"
              : "e.g. 45 year old office worker, gradual onset right shoulder pain over 6 weeks, worse overhead and at night, no trauma..."}
            aria-label={card ? "Patient history in your own words" : undefined}
            rows={card ? 2 : 5}
            disabled={status === "processing" || status === "recording"}
          />
          <div className="ai-intake-actions">
            {status === "recording" ? (
              <button type="button" className={"primary-btn" + (card ? " ai-card-btn" : "")} onClick={stopRecording}>
                ⏹ Stop recording
              </button>
            ) : (
              <button type="button" className={"ghost-btn" + (card ? " ai-card-btn" : "")} onClick={startRecording} disabled={status === "processing"}>
                🎤 Voice
              </button>
            )}
            <button type="button" className={"primary-btn" + (card ? " ai-card-btn ai-card-generate" : "")} onClick={runParse} disabled={!text.trim() || status === "processing" || status === "recording"}>
              {status === "processing" ? (card ? "Generating…" : "Parsing…") : (card ? (costsCredit ? "Generate with AI · 1 credit" : "Generate with AI") : "✦ Parse with AI")}
            </button>
          </div>
          {status === "error" && <div className="ai-intake-error" role="alert">{errorMsg}</div>}
          {applied && <div className="ai-card-success" role="status">✓ Added to the form below. Review and edit anything before you continue.</div>}
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
                  {isAdmin && provider && <span data-testid="ai-provider-note" style={{ float: "right", color: "#7c3aed", fontWeight: 700 }}>AI engine: {PROVIDER_NAMES[provider] || provider}</span>}
                  {isAdmin && orderNote && <div data-testid="ai-order-note" style={{ color: "#6b7280", marginTop: 4, fontSize: "0.68rem" }}>Server tries: {orderNote.split(",").map((p) => PROVIDER_NAMES[p] || p).join(" → ") || "none"}</div>}
                  {isAdmin && usageNote && <div data-testid="ai-usage-note" style={{ color: "#6b7280", marginTop: 4, fontSize: "0.68rem" }}>Tokens: {usageNote}{estimateRupees(usageNote) ? ` · about ₹${estimateRupees(usageNote)} if billed` : ""}</div>}
                  {isAdmin && skippedNote && <div data-testid="ai-skipped-note" style={{ color: "#b45309", marginTop: 4, fontSize: "0.68rem" }}>Skipped first: {skippedNote}</div>}
                </div>
              </div>
            );
          })()}

          <div className="ai-intake-actions">
            <button
              type="button"
              className={"ghost-btn" + (card ? " ai-card-btn" : "")}
              onClick={() => {
                setStatus("idle");
                setResult(null);
              }}
            >
              Re-try
            </button>
            <button type="button" className={"primary-btn" + (card ? " ai-card-btn" : "")} onClick={apply}>
              ✓ Apply to Subjective &amp; Pain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

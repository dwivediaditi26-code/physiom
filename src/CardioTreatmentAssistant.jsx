import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { suggestCardioTreatment, toArray } from "./cardioTreatmentSuggestions.js";
import { CARDIO_EVIDENCE, EVIDENCE_TIER_LABEL } from "./cardioEvidence.js";

/* ============================================================
   CardioTreatmentAssistant — shown after a Cardiopulmonary
   Assessment is complete. Turns documented findings into
   treatment OPTIONS (not prescriptions): each option states what,
   why, its phase, what to monitor, precautions, and its evidence
   tier -- therapist accepts/modifies/skips every one. Accepted
   options are written to data.treatmentPlan for SOAP/next-session
   use later; nothing here calls an LLM -- see cardioTreatmentSuggestions.js
   for the (deterministic, documented-finding-driven) rule engine.
   ============================================================ */

const PHASES = [
  { id: "acute", label: "Acute / Stabilization", color: "#16A34A" },
  { id: "functional", label: "Functional Recovery", color: "#2563EB" },
  { id: "conditioning", label: "Conditioning", color: "#7C3AED" },
  { id: "discharge", label: "Discharge / Self-management", color: "#6B7280" },
];

function Sheet({ open, onClose, eyebrow, title, children }) {
  if (!open) return null;
  return createPortal(
    <div className="cta-sheet-backdrop" onClick={onClose}>
      <div className="cta-sheet-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="cta-sheet-head">
          <span className="cta-sheet-eyebrow">{eyebrow}</span>
          <button type="button" className="cta-sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {title && <div className="cta-sheet-title">{title}</div>}
        <div className="cta-sheet-scroll">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function EvidenceSheet({ open, onClose, option }) {
  const entries = (option?.evidenceIds || []).map((id) => ({ id, ...CARDIO_EVIDENCE[id] })).filter((e) => e.title);
  const maxTier = entries.length ? Math.min(...entries.map((e) => e.tier)) : null;
  return (
    <Sheet open={open} onClose={onClose} eyebrow="EVIDENCE & REFERENCES" title={option?.label}>
      {entries.map((e) => (
        <div className="cta-evidence-row" key={e.id}>
          <div className="cta-evidence-tier">TIER {e.tier} · {EVIDENCE_TIER_LABEL[e.tier]}</div>
          <div className="cta-evidence-source">{e.source} — {e.year}</div>
          <div className="cta-evidence-title">{e.title}</div>
          {e.note && <div className="cta-evidence-note">{e.note}</div>}
        </div>
      ))}
      {maxTier != null && (
        <div className="cta-evidence-confidence">
          Evidence confidence: {maxTier <= 1 ? "Moderate–High" : maxTier === 2 ? "Moderate" : "Limited — supporting/contextual"}
        </div>
      )}
      <div className="cta-evidence-disclaimer">
        Evidence may not directly apply to every individual patient. Consider the patient's diagnosis, current medical status, precautions, medications, response to treatment and local hospital protocols.
      </div>
    </Sheet>
  );
}

function WhySheet({ open, onClose, option }) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="WHY SUGGESTED?" title={option?.label}>
      <p className="cta-why-text">{option?.why}</p>
      {option?.monitor?.length > 0 && (
        <>
          <div className="cta-section-label">Monitor</div>
          <div className="cta-chip-row">
            {option.monitor.map((m) => (
              <span className="cta-chip" key={m}>
                {m}
              </span>
            ))}
          </div>
        </>
      )}
      {option?.precautionsNote && (
        <>
          <div className="cta-section-label" style={{ marginTop: 10 }}>
            Precautions
          </div>
          <div className="cta-precaution-note">⚠ {option.precautionsNote}</div>
        </>
      )}
    </Sheet>
  );
}

function TreatmentCard({ option, decision, onDecide }) {
  const [sheet, setSheet] = useState(null); // null | "why" | "evidence"
  const bestTier = Math.min(...(option.evidenceIds || []).map((id) => CARDIO_EVIDENCE[id]?.tier || 9));
  return (
    <div className={"cta-card" + (decision === "added" ? " cta-card-added" : decision === "skipped" ? " cta-card-skipped" : "")}>
      <div className="cta-card-top">
        <span className="cta-card-icon">{option.icon}</span>
        <span className="cta-card-label">{option.label}</span>
        {decision === "added" && <span className="cta-card-status cta-card-status-added">✓ Added</span>}
        {decision === "skipped" && <span className="cta-card-status cta-card-status-skipped">Skipped</span>}
      </div>
      <div className="cta-card-goal">{option.goal}</div>
      <div className="cta-card-evidence-badge">
        {bestTier <= 1 ? "🟢 Guideline-supported" : bestTier === 2 ? "🔵 Position-statement supported" : "📘 Reference-supported"}
        {" · "}
        {(option.evidenceIds || []).length} reference{(option.evidenceIds || []).length === 1 ? "" : "s"}
      </div>
      <div className="cta-card-actions">
        <button type="button" className="cta-link" onClick={() => setSheet("why")}>
          Why?
        </button>
        <button type="button" className="cta-link" onClick={() => setSheet("evidence")}>
          📚 Evidence
        </button>
        <span style={{ flex: 1 }} />
        {decision === "added" ? (
          <button type="button" className="cta-btn-outline" onClick={() => onDecide(option.id, null)}>
            Remove
          </button>
        ) : (
          <>
            <button type="button" className="cta-btn-primary" onClick={() => onDecide(option.id, "added")}>
              Add to plan
            </button>
            <button type="button" className="cta-btn-ghost" onClick={() => onDecide(option.id, "skipped")}>
              Skip
            </button>
          </>
        )}
      </div>
      <WhySheet open={sheet === "why"} onClose={() => setSheet(null)} option={option} />
      <EvidenceSheet open={sheet === "evidence"} onClose={() => setSheet(null)} option={option} />
    </div>
  );
}

export default function CardioTreatmentAssistant({ data, setData, setting, onClose }) {
  const functional = data.functional || {};
  const exercise = data.exercise || {};
  const resp = data.resp || {};

  const options = useMemo(() => suggestCardioTreatment({ functional, exercise, resp, setting }), [functional, exercise, resp, setting]);
  const phase = options[0]?.phase;
  const plan = data.treatmentPlan?.decisions || {};

  function decide(id, decision) {
    const nextDecisions = { ...plan };
    if (decision) nextDecisions[id] = decision;
    else delete nextDecisions[id];
    setData((prev) => ({ ...prev, treatmentPlan: { ...(prev.treatmentPlan || {}), decisions: nextDecisions } }));
  }

  const addedCount = Object.values(plan).filter((v) => v === "added").length;

  const findings = [];
  if (functional.mobility) findings.push(`Mobility: ${functional.mobility}`);
  if (functional.walking) findings.push(`Walking: ${functional.walking}`);
  if (functional.tolerance) findings.push(`Activity tolerance: ${functional.tolerance}`);
  if (exercise.distance) findings.push(`Distance: ${exercise.distance} m`);
  const exerciseSymptomsArr = toArray(exercise.symptoms);
  if (exerciseSymptomsArr.length && !exerciseSymptomsArr.includes("No symptoms")) findings.push(`Symptoms on activity: ${exerciseSymptomsArr.join(", ")}`);
  if (resp.dyspneaActivity) findings.push(`Dyspnea (activity): ${resp.dyspneaActivity}/10`);

  return (
    <>
      <style>{CTA_STYLES}</style>
      <div className="cta-header">
        <button type="button" className="cta-back" onClick={onClose} aria-label="Back to summary">
          ←
        </button>
        <div>
          <div className="cta-header-title">✨ AI Treatment Assistant</div>
          <div className="cta-header-sub">Based on your documented findings — not a live AI call</div>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="cta-findings">
          <div className="cta-section-label">Key findings</div>
          <ul className="cta-findings-list">
            {findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {phase && (
        <div className="cta-phase-row">
          {PHASES.map((p) => (
            <div key={p.id} className={"cta-phase-pill" + (p.id === phase.id ? " cta-phase-pill-active" : "")} style={p.id === phase.id ? { borderColor: p.color, color: p.color, background: p.color + "14" } : undefined}>
              {p.label}
            </div>
          ))}
        </div>
      )}

      <div className="cta-section-label" style={{ margin: "14px 0 8px" }}>
        🎯 Today's treatment priorities
      </div>
      {options.map((opt) => (
        <TreatmentCard key={opt.id} option={opt} decision={plan[opt.id]} onDecide={decide} />
      ))}

      <div className="cta-plan-summary">
        <div className="cta-plan-summary-count">{addedCount} treatment{addedCount === 1 ? "" : "s"} added to today's plan</div>
        <button type="button" className="cta-btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
          Done — back to Summary
        </button>
      </div>
    </>
  );
}

const CTA_STYLES = `
  .cta-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .cta-back { border: none; background: #F3F0FF; color: #6C4DFF; width: 32px; height: 32px; border-radius: 10px; font-size: 16px; cursor: pointer; flex-shrink: 0; }
  .cta-header-title { font-weight: 800; font-size: 16px; color: #1A1A2E; }
  .cta-header-sub { font-size: 11px; color: #9C9CAE; margin-top: 1px; }

  .cta-findings { background: #F3F0FF; border: 1px solid #ECE9F7; border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; }
  .cta-findings-list { margin: 4px 0 0; padding-left: 18px; font-size: 12.5px; color: #1A1A2E; line-height: 1.7; }

  .cta-phase-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
  .cta-phase-pill { font-size: 10.5px; font-weight: 700; padding: 5px 10px; border-radius: 999px; border: 1px solid #ECE9F7; color: #9C9CAE; }
  .cta-phase-pill-active { font-weight: 800; }

  .cta-section-label { font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: #6C4DFF; }

  .cta-card { border: 1.5px solid #ECE9F7; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; background: #fff; }
  .cta-card-added { border-color: #6C4DFF; background: #F3F0FF; }
  .cta-card-skipped { opacity: .55; }
  .cta-card-top { display: flex; align-items: center; gap: 8px; }
  .cta-card-icon { font-size: 16px; }
  .cta-card-label { font-weight: 700; font-size: 14px; color: #1A1A2E; flex: 1; }
  .cta-card-status { font-size: 10.5px; font-weight: 800; }
  .cta-card-status-added { color: #6C4DFF; }
  .cta-card-status-skipped { color: #9C9CAE; }
  .cta-card-goal { font-size: 12px; color: #6B6B7A; margin-top: 4px; line-height: 1.5; }
  .cta-card-evidence-badge { font-size: 10.5px; color: #6B6B7A; margin-top: 8px; }
  .cta-card-actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
  .cta-link { border: none; background: none; padding: 0; color: #5638E0; font-weight: 700; font-size: 12px; cursor: pointer; }
  .cta-btn-primary { border: none; background: linear-gradient(90deg, #6C4DFF, #5638E0); color: #fff; font-weight: 700; font-size: 12px; padding: 7px 14px; border-radius: 20px; cursor: pointer; }
  .cta-btn-ghost { border: 1px solid #ECE9F7; background: #fff; color: #6B6B7A; font-weight: 700; font-size: 12px; padding: 7px 14px; border-radius: 20px; cursor: pointer; }
  .cta-btn-outline { border: 1px solid #ECE9F7; background: #fff; color: #6B6B7A; font-weight: 700; font-size: 12px; padding: 7px 14px; border-radius: 20px; cursor: pointer; }

  .cta-plan-summary { margin-top: 16px; padding: 12px 14px; border: 1px dashed #ECE9F7; border-radius: 14px; text-align: center; }
  .cta-plan-summary-count { font-size: 12.5px; font-weight: 700; color: #1A1A2E; }

  .cta-sheet-backdrop { position: fixed; inset: 0; background: rgba(20,10,45,.45); z-index: 1070; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .cta-sheet-panel { position: relative; z-index: 1071; background: #fff; border-radius: 22px; padding: 14px 18px; width: 60vw; height: 60vh; max-width: 480px; max-height: 640px; min-width: 300px; min-height: 380px; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(40,10,90,.35); }
  .cta-sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-shrink: 0; }
  .cta-sheet-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: #6C4DFF; }
  .cta-sheet-close { border: none; background: #F3F0FF; color: #5638E0; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; cursor: pointer; }
  .cta-sheet-title { font-weight: 800; font-size: 18px; margin: 4px 0 10px; flex-shrink: 0; }
  .cta-sheet-scroll { flex: 1; overflow-y: auto; min-height: 0; }

  .cta-why-text { font-size: 13px; color: #1A1A2E; line-height: 1.6; margin: 0 0 10px; }
  .cta-chip-row { display: flex; flex-wrap: wrap; gap: 5px; }
  .cta-chip { font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 999px; background: #F3F0FF; color: #5638E0; }
  .cta-precaution-note { font-size: 12px; color: #D97706; background: #FEF6E7; border: 1px solid #FBE7B8; border-radius: 10px; padding: 8px 10px; margin-top: 4px; }

  .cta-evidence-row { border-bottom: 1px solid #ECE9F7; padding: 10px 0; }
  .cta-evidence-row:first-child { padding-top: 0; }
  .cta-evidence-tier { font-size: 9.5px; font-weight: 800; letter-spacing: .04em; color: #6C4DFF; text-transform: uppercase; }
  .cta-evidence-source { font-size: 11.5px; font-weight: 700; color: #1A1A2E; margin-top: 3px; }
  .cta-evidence-title { font-size: 12.5px; color: #1A1A2E; margin-top: 2px; line-height: 1.5; }
  .cta-evidence-note { font-size: 11px; color: #9C9CAE; margin-top: 3px; font-style: italic; }
  .cta-evidence-confidence { font-size: 12px; font-weight: 700; color: #1A1A2E; margin-top: 10px; }
  .cta-evidence-disclaimer { font-size: 10.5px; color: #9C9CAE; margin-top: 10px; line-height: 1.5; }
`;

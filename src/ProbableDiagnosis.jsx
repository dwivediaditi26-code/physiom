// ProbableDiagnosis.jsx — "SUGGEST PROBABLE DIAGNOSIS" button for the SOAP Notes
// Assessment section. On click it runs the deterministic reasoning engine
// (src/reasoningEngine) over the current subjective + objective data and shows a
// ranked, explainable probable-diagnosis list. No LLM at runtime; same input ->
// same output. Self-contained so the monolith only needs a one-line insertion.

import React, { useState } from "react";
import { runReasoningFromData } from "./reasoningEngine/index";

const TEAL = "#0891b2";

// Regions the deterministic engine currently covers end-to-end. Exported so
// other UI (e.g. ClinicalModules.jsx's SOAP Assessment tab) can hide the OLDER
// interpretationEngine's auto-rendered suggestions once a region is migrated
// here, instead of showing two competing diagnosis panels.
export const SUPPORTED = ["shoulder", "cervical", "lumbar", "hip", "knee", "elbow", "thoracic", "ankle", "wrist"];

// Detect the working region from the app's data. Order of trust:
// explicit selected-regions -> chief complaint keywords.
function detectRegion(data) {
  const KEYWORDS = {
    shoulder: ["shoulder", "rotator cuff", "gh joint", "ac joint", "subacromial"],
    cervical: ["cervical", "neck", "c-spine", "c/s"],
    lumbar: ["lumbar", "low back", "lower back", "l-spine", "lbp", "sacroiliac", "si joint"],
    hip: ["hip", "groin", "trochanter", "gluteal", "labral"],
    knee: ["knee", "patella", "patellar", "acl", "pcl", "meniscus", "meniscal"],
    elbow: ["elbow", "epicondyle", "epicondylitis", "epicondylalgia", "olecranon", "cubital tunnel"],
    thoracic: ["thoracic", "t-spine", "mid back", "upper back", "rib", "costochondritis", "costovertebral", "interscapular"],
    ankle: ["ankle", "achilles", "talus", "talar", "malleolus", "syndesmosis", "peroneal", "tarsal tunnel"],
    wrist: ["wrist", "carpal tunnel", "scaphoid", "de quervain", "tfcc", "scapholunate", "trigger finger", "cmc joint"],
  };
  let selected = [];
  try {
    const raw = data.cx_selected_regions;
    selected = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
  } catch { selected = []; }
  const hay = [...(Array.isArray(selected) ? selected : []), data.cc_main || ""]
    .join(" ").toLowerCase();
  for (const [region, kws] of Object.entries(KEYWORDS)) {
    if (region === (String(selected[0] || "")).toLowerCase()) return region;
    if (kws.some((k) => hay.includes(k))) return region;
  }
  return null;
}

const BAND_STYLE = {
  High:     { bg: "#ECFDF5", border: "#6EE7B7", badge: "#059669" },
  Moderate: { bg: "#FFFBEB", border: "#FDE68A", badge: "#D97706" },
  Low:      { bg: "#F9FAFB", border: "#E5E7EB", badge: "#6B7280" },
};

function Chips({ label, items, color }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginTop: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{label}: </span>
      {items.map((t, i) => (
        <span key={i} style={{ display: "inline-block", fontSize: 11, color, background: "#fff",
          border: `1px solid ${color}33`, borderRadius: 6, padding: "1px 6px", margin: "2px 3px 0 0" }}>{t}</span>
      ))}
    </div>
  );
}

export default function ProbableDiagnosis({ data = {} }) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | ok | unsupported | error
  const [region, setRegion] = useState(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    try {
      const r = detectRegion(data);
      setRegion(r);
      if (!r || !SUPPORTED.includes(r)) {
        setStatus("unsupported");
        setResult(null);
      } else {
        setResult(runReasoningFromData(data, r));
        setStatus("ok");
      }
    } catch (e) {
      setStatus("error");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const candidates = (result?.differentials || []).filter((d) => !d.excluded && d.diagnosticMatchScore > 0);

  return (
    <div style={{ margin: "10px 0 4px" }}>
      <button
        onClick={run}
        disabled={running}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12, border: "none",
          background: TEAL, color: "#fff", fontWeight: 800, fontSize: 14.5, letterSpacing: 0.4,
          cursor: running ? "default" : "pointer", boxShadow: "0 2px 8px rgba(8,145,178,0.25)",
        }}
      >
        {running ? "Analysing…" : "🧠 SUGGEST PROBABLE DIAGNOSIS"}
      </button>
      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
        Deterministic decision-support from the recorded subjective + objective assessment — not a diagnosis. Verify clinically.
      </div>

      {status === "unsupported" && (
        <div style={{ marginTop: 10, padding: "12px 14px", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 13, color: "#6B7280" }}>
          {region
            ? `The deterministic engine doesn't yet cover "${region}".`
            : "Couldn't determine the region — select a region in the Subjective assessment first."}
          {" "}It currently supports: shoulder, cervical spine, lumbar spine, hip, knee, elbow, thoracic spine, ankle, wrist (more regions are being added).
        </div>
      )}

      {status === "error" && (
        <div style={{ marginTop: 10, padding: "12px 14px", background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, fontSize: 13, color: "#991B1B" }}>
          Couldn't run the analysis on the current data. Check the assessment entries and try again.
        </div>
      )}

      {status === "ok" && result && result.stopped && (
        <div style={{ marginTop: 10, padding: "12px 14px", background: "#FEF2F2", border: "2px solid #FECACA", borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#991B1B", marginBottom: 6 }}>🚨 Red flag screen positive — probable-diagnosis suggestions withheld</div>
          {result.redFlag.flags.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: "#7F1D1D", marginBottom: 3, lineHeight: 1.5 }}>• {f.message}</div>
          ))}
          <div style={{ fontSize: 12, color: "#991B1B", marginTop: 4, fontStyle: "italic" }}>Address the red flag(s) before relying on a differential — the safety screen runs first and blocks suggestions until it's clear.</div>
        </div>
      )}

      {status === "ok" && result && !result.stopped && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 8, padding: "8px 10px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8 }}>
            <b style={{ textTransform: "capitalize" }}>{result.region}</b> · Evidence completeness{" "}
            <b>{result.completeness.evidenceConfidence}%</b>
            {result.completeness.missingCritical.length > 0 && (
              <span> · still outstanding: {result.completeness.missingCritical.map((m) => m.exam).join(", ")}</span>
            )}
          </div>

          {candidates.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6B7280", fontStyle: "italic" }}>
              Not enough findings to prioritise a differential yet — complete the recommended examination, then re-run.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46", marginBottom: 6 }}>💡 Probable Diagnoses (ranked)</div>
              {candidates.map((d, i) => {
                const cs = BAND_STYLE[d.band] || BAND_STYLE.Low;
                return (
                  <div key={i} style={{ padding: "10px 12px", background: cs.bg, border: `1.5px solid ${cs.border}`, borderRadius: 10, marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: "#111827", flex: 1 }}>{i + 1}. {d.name}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: cs.badge, color: "#fff" }}>
                        {d.band} {d.diagnosticMatchScore}%
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2 }}>
                      Match {d.diagnosticMatchScore}% · Evidence confidence {d.evidenceConfidence}% · {d.source}
                    </div>
                    <div style={{ fontSize: 12, color: "#374151" }}>{d.whySuggested}</div>
                    <Chips label="Supports" items={d.supportingFindings} color="#059669" />
                    <Chips label="Against" items={d.conflictingFindings} color="#DC2626" />
                    <Chips label="Not yet tested" items={d.missingFindings} color="#6B7280" />
                    {d.recommendedAdditional && d.recommendedAdditional.length > 0 && (
                      <Chips label="To raise confidence" items={d.recommendedAdditional} color={TEAL} />
                    )}
                    {d.whyConfidenceReduced && d.whyConfidenceReduced.length > 0 && (
                      <div style={{ fontSize: 11, color: "#92400E", marginTop: 5 }}>⚠ {d.whyConfidenceReduced.join(" ")}</div>
                    )}
                  </div>
                );
              })}
              {result.interpretation?.referralRecommendation && (
                <div style={{ fontSize: 12.5, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 10px", marginTop: 4 }}>
                  <b>Referral:</b> {result.interpretation.referralRecommendation}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

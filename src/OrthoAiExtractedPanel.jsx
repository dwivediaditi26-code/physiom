import React, { useState } from "react";

/* Read-only "as extracted" panel -- shows the AI's own extraction
   verbatim (2026-09-03, Aditi: "Subjective assessment from AI should
   [be] shown same as it is as extracted"). The structured mapping
   fills the form fields it has a home for; this shows every extracted
   value, including the ones this wizard has no dedicated field for,
   so nothing the clinician dictated silently disappears. */
const FIELD_ICON = {
  chiefComplaint: "🎯", age: "🧑", sex: "⚧", occupation: "💼",
  region: "🧭", additionalRegions: "🧭", laterality: "🧭",
  conditionCategory: "🏷️", locationDescription: "📍",
  duration: "📅", onset: "💥", onsetContext: "❔",
  nrsNow: "🌡️", nrsWorst: "📈", nrsBest: "📉",
  painQuality: "🩹", symptomPattern: "📊", diurnalPattern: "📊",
  morningSymptoms: "🌅", nightSymptoms: "🌙",
  aggMovements: "⚡", aggActivities: "⚡", relMovements: "🍃",
  hasRadiation: "🔀", radiationArea: "🔀", radiationSide: "🔀",
  neuroSymptoms: "✨", hasBladderBowelSymptoms: "⚠️",
  priorEpisodeCount: "🔁", priorEpisodeOutcome: "🔁",
  priorTreatmentTried: "💊", medicalHistory: "📋", medications: "💊",
  functionalLimitations: "🚫", patientGoals: "🏁",
  patientConcern: "😟", patientBelief: "💭", flags: "🚩",
};
const NRS_KEYS = new Set(["nrsNow", "nrsWorst", "nrsBest"]);

export function AiExtractedPanel({ rows = [] }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  return (
    <>
      <button type="button" className={"obj-findings-toggle" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
        <span>✨ AI extracted from your narrative · {rows.length}</span>
        <span className="obj-findings-chev">⌄</span>
      </button>
      {open && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #EDEBFB", boxShadow: "0 2px 10px rgba(124,58,237,0.06)", overflow: "hidden", marginBottom: 10, marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #F0EEFB" }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", flexShrink: 0 }}>🩺</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0D0D0D" }}>Extracted Patient Information</div>
              <div style={{ fontSize: "0.72rem", color: "#8B8B8D" }}>{rows.length} field{rows.length === 1 ? "" : "s"} extracted from your narrative</div>
            </div>
          </div>
          {rows.map((row, i) => {
            const icon = FIELD_ICON[row.key] || "📝";
            const isNrs = NRS_KEYS.has(row.key);
            const isFlag = row.key === "flags";
            const tintBg = isFlag ? (row.value === "No red flags reported" ? "#f0fdf4" : "#fef2f2") : "#f5f3ff";
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < rows.length - 1 ? "1px solid #F3F2F9" : "none" }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: tintBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: "0.78rem", color: "#8B8B8D", flexShrink: 0 }}>{row.label}</span>
                {isNrs ? (
                  <span style={{ marginLeft: "auto", fontSize: "0.76rem", fontWeight: 800, color: "#5b21b6", background: "#f5f3ff", padding: "3px 10px", borderRadius: 99, flexShrink: 0 }}>{row.value} / 10</span>
                ) : (
                  <span style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 700, color: "#0D0D0D", textAlign: "right", maxWidth: "55%" }}>{row.value}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

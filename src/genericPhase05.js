// genericPhase05.js — data-driven Phase 0.5 condition matches for the Layer-2
// regions that have no bespoke Phase 0.5 screen (hip, knee, ankle/foot,
// elbow/wrist/hand). Runs the same deterministic engine as SOAP's "Suggest
// Probable Diagnosis" and returns condition cards with the merged objective
// assessment (keyExams + assessmentModules) already attached to each differential.

import { runReasoningFromData } from "./reasoningEngine/index";

// Region-family (as selected in the UI) -> Layer-2 engine region key(s).
// Families that bundle several regions run all of them (companion pattern).
const FAMILY_ENGINE = {
  "Hip / Groin": ["hip"],
  "Knee (L)": ["knee"], "Knee (R)": ["knee"],
  "Ankle / Foot": ["ankle", "foot"],
  "Elbow/Wrist/Hand": ["elbow", "wrist", "hand"],
};

export function familyHasGenericPhase05(region) {
  return !!FAMILY_ENGINE[region];
}

function tierOf(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match";
}
const PFX = { hip: "HP", knee: "KN", ankle: "AK", foot: "FT", elbow: "EL", wrist: "WR", hand: "HN" };

export function runGenericPhase05(data, region) {
  const engines = FAMILY_ENGINE[region];
  if (!engines) return null;
  let stopped = false, redFlag = null;
  const conditions = [];
  engines.forEach((reg) => {
    let res;
    try { res = runReasoningFromData(data, reg); } catch { return; }
    if (res.stopped) { stopped = true; redFlag = res.redFlag || redFlag; }
    (res.differentials || []).forEach((d, i) => {
      if (d.excluded) return;
      conditions.push({
        id: (PFX[reg] || "DX") + String(i + 1).padStart(2, "0"),
        name: d.name,
        engineRegion: reg,
        matchTier: tierOf(d),
        supporting: d.supportingFindings || [],
        refuting: d.conflictingFindings || [],
        unknownCount: (d.missingFindings || []).length,
        note: d.whySuggested,
        keyExams: d.recommendedAdditional || [],
        assessmentModules: d.assessmentModules || [],
        score: d.diagnosticMatchScore || 0,
      });
    });
  });
  conditions.sort((a, b) => b.score - a.score);
  return { stopped, redFlag, conditions: conditions.slice(0, 8) };
}

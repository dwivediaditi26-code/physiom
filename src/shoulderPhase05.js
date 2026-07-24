// shoulderPhase05.js — adapter that plugs the EXISTING, already-tested Shoulder
// reasoningEngine (src/reasoningEngine/, used by ProbableDiagnosis.jsx) into the
// same Phase 0 / Phase 0.5 UI shape that Lumbar/Cervical/Thoracic already show in
// SubjectiveObjective.jsx. This is a pure display-layer translation -- no clinical
// scoring logic is reimplemented or duplicated here. Everything about *which
// condition scores what* comes straight from runShoulderReasoningFromData(), which
// itself reuses shoulder.evidence.json (the same evidence model already grounded
// in JOSPT/APTA CPG, Magee, Dutton, McGee and fixed/regression-tested this session).
//
// Two things this file DOES add, both purely presentational / derivable from data
// already in the evidence model, never new clinical judgment:
//   1. A translation from the shoulder engine's score/band/excluded vocabulary into
//      the same "Strong match / Possible match / Weak match / Insufficient data /
//      Unlikely" tier language Lumbar/Cervical/Thoracic already use, so the card
//      reads identically across all four regions.
//   2. A static per-condition "suggested objective tests" catalog, built once from
//      each condition's requiredFindings/supportingFindings codes (converted to a
//      real test name + a click-to-navigate target), mirroring the hardcoded
//      objectiveTests.{required,recommended} lists already in lumbarReasoningEngine.js
//      / cervicalReasoningEngine.js / thoracicReasoningEngine.js. Codes whose domain
//      is "history" or "painBehaviour" are excluded -- those are subjective items
//      already answered on the form, not something to suggest testing for.

import { runShoulderReasoningFromData, normalizeFromData } from "./reasoningEngine/index";
import { FINDING_DOMAIN } from "./reasoningEngine/findings";
import shoulderEvidence from "./reasoningEngine/regions/shoulder.evidence.json";

// ── Finding code -> { display label, nav target (or null = honest gap) } ───────
// nav shapes mirror lumbarTestNav/cervicalTestNav/thoracicTestNav's real,
// already-shipped targets for shoulder (see REGION_NAV["Shoulder (L)"] for the
// same specialRegion/mmtRegion/romRegion/nktRegion strings) -- not invented here.
//
// One deliberate judgment call: "painful_arc" is tagged domain:"specialTests" in
// the evidence model, but this app actually records it via a Subjective-side
// dropdown (shl_arc / aggravating movements), not the Special Tests module.
// Clinically it IS elicited during active abduction, so it's pointed at the
// Shoulder ROM module rather than left non-clickable.
const SHOULDER_TEST_MAP = {
  hawkins_positive: { label: "Hawkins-Kennedy Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_hawkins" }, why: "79% sensitivity for subacromial impingement — most sensitive impingement test." } },
  neer_positive: { label: "Neer's Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_neer" }, why: "Passive forced flexion reproduces subacromial impingement pain." } },
  painful_arc: { label: "Painful Arc (active abduction)", nav: { icon: "📐", col: "#9333ea", nav: "rom", ctx: { romRegion: "Shoulder", romHighlights: ["rom_sabd"] }, why: "Painful arc (60–120° abduction) is elicited during active abduction — assess as part of Shoulder ROM, not a separate special test." } },
  empty_can_positive: { label: "Empty Can / Jobe Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_empty_can" }, why: "Supraspinatus integrity — combine with Hawkins/Neer for RC tear/tendinopathy screening." } },
  er_lag_positive: { label: "External Rotation Lag Sign", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_er_lag" }, why: "High-specificity sign for a massive/full-thickness posterosuperior cuff tear." } },
  drop_arm_positive: { label: "Drop-Arm Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_er_lag" }, why: "Inability to smoothly lower the arm from abduction — large/full-thickness cuff tear." } },
  lift_off_positive: { label: "Lift-Off Test (Gerber)", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_lift_off" }, why: "Subscapularis integrity — inability to lift the hand off the lower back." } },
  ac_scarf_positive: { label: "Cross-Arm / Scarf Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_cross_arm" }, why: "Horizontal adduction compresses the AC joint — reproduces localised AC pain." } },
  obrien_positive: { label: "O'Brien's Test (Active Compression)", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_obrien" }, why: "Differentiates SLAP/labral pain (deep, relieved by supination) from AC joint (pain on top)." } },
  apprehension_positive: { label: "Apprehension Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_apprehension" }, why: "Anterior instability — apprehension with abduction + external rotation at end-range." } },
  relocation_positive: { label: "Relocation Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_relocation" }, why: "Confirms apprehension findings — relief with posterior humeral head pressure." } },
  speeds_positive: { label: "Speed's Test", nav: { icon: "🔬", col: "#0891b2", nav: "special", ctx: { specialRegion: "shoulder", highlightTest: "st_speeds" }, why: "Biceps long head / SLAP provocation — resisted forward flexion, supinated forearm." } },
  spurling_positive: { label: "Spurling's Test (cervical screen)", nav: { icon: "🔬", col: "#dc2626", nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_spurling" }, why: "Rules out cervical radiculopathy masquerading as shoulder pain — always screen the neck when arm symptoms are present." } },
  capsular_pattern: { label: "Passive ROM — Capsular Pattern (ER>Abd>IR)", nav: { icon: "📐", col: "#9333ea", nav: "rom", ctx: { romRegion: "Shoulder", romHighlights: ["rom_ser", "rom_sabd", "rom_sir"] }, why: "Adhesive capsulitis/OA hallmark: external rotation lost proportionally more than abduction, more than internal rotation." } },
  global_rom_loss: { label: "Passive ROM — Global Assessment", nav: { icon: "📐", col: "#9333ea", nav: "rom", ctx: { romRegion: "Shoulder", romHighlights: ["rom_ser", "rom_sabd", "rom_sir", "rom_sflex"] }, why: "Marked loss across all planes supports a capsular process rather than an isolated contractile lesion." } },
  capsular_end_feel: { label: "End-Feel Assessment (passive ROM)", nav: { icon: "📐", col: "#9333ea", nav: "rom", ctx: { romRegion: "Shoulder", romHighlights: ["rom_ser"] }, why: "A firm/capsular end-feel distinguishes true capsular restriction from guarding or pain-limited ROM." } },
  abduction_weak: { label: "MMT — Abduction (Supraspinatus)", nav: { icon: "💪", col: "#7c3aed", nav: "mmt", ctx: { mmtRegion: "Shoulder & Scapula", mmtHighlights: ["mmt_supra"] }, why: "Supraspinatus initiates abduction 0–30° — most common rotator cuff tear/tendinopathy site." } },
  er_weak: { label: "MMT — External Rotation (Infraspinatus)", nav: { icon: "💪", col: "#7c3aed", nav: "mmt", ctx: { mmtRegion: "Shoulder & Scapula", mmtHighlights: ["mmt_infra"] }, why: "Infraspinatus weakness on resisted ER — second most common cuff involvement." } },
  ir_weak: { label: "MMT — Internal Rotation (Subscapularis)", nav: { icon: "💪", col: "#7c3aed", nav: "mmt", ctx: { mmtRegion: "Shoulder & Scapula", mmtHighlights: ["mmt_subscap"] }, why: "Subscapularis weakness on resisted IR / lift-off — anterior cuff involvement." } },
  painful_weak_resist: { label: "Resisted Isometrics (pain on contraction)", nav: { icon: "💪", col: "#7c3aed", nav: "mmt", ctx: { mmtRegion: "Shoulder & Scapula", mmtHighlights: ["mmt_supra", "mmt_infra", "mmt_subscap"] }, why: "Pain (not just weakness) on resisted contraction points to a contractile/tendon source (Cyriax selective tension testing)." } },
  ac_joint_tender: { label: "Palpation — AC Joint" },
  greater_tuberosity_tender: { label: "Palpation — Greater Tuberosity" },
  bicipital_groove_tender: { label: "Palpation — Bicipital Groove" },
  imaging_calcific: { label: "Imaging — X-ray/US (calcific deposit)" },
  imaging_full_thickness_tear: { label: "Imaging — US/MRI (cuff integrity)" },
  imaging_oa: { label: "Imaging — X-ray (OA / joint-space)" },
};

// Label -> nav target lookup, built once. Palpation/imaging entries above have
// no `nav` key, so they correctly return null -- rendered non-clickable by the
// same NavActionBtn fallback the other three regions already use for their own
// honest gaps (imaging, palpation, PA glides, outcome measures).
const LABEL_TO_NAV = (() => {
  const m = new Map();
  Object.values(SHOULDER_TEST_MAP).forEach((entry) => { if (entry.nav) m.set(entry.label, entry.nav); });
  return m;
})();

export function shoulderTestNav(testStr) {
  return LABEL_TO_NAV.get(String(testStr || "")) || null;
}

// Static per-condition objectiveTests.{required,recommended} catalog, built
// once from shoulder.evidence.json's requiredFindings/supportingFindings --
// exactly mirroring how lumbarReasoningEngine.js/cervicalReasoningEngine.js/
// thoracicReasoningEngine.js hardcode this per condition, just derived instead
// of hand-duplicated, so it can never drift out of sync with the evidence model.
function buildObjectiveTestsCatalog() {
  const catalog = {};
  for (const model of shoulderEvidence.diagnoses) {
    const toTestList = (codes) => {
      const seen = new Set();
      const out = [];
      for (const code of codes) {
        const domain = FINDING_DOMAIN[code];
        if (domain === "history" || domain === "painBehaviour") continue; // already-asked subjective items, not a test to suggest
        const entry = SHOULDER_TEST_MAP[code];
        if (!entry || seen.has(entry.label)) continue;
        seen.add(entry.label);
        out.push(entry.label);
      }
      return out;
    };
    const requiredSet = new Set(model.requiredFindings);
    catalog[model.name] = {
      required: toTestList(model.requiredFindings),
      recommended: toTestList(model.supportingFindings.filter((c) => !requiredSet.has(c))),
    };
  }
  return catalog;
}
const SHOULDER_OBJECTIVE_TESTS = buildObjectiveTestsCatalog();

// Stable per-condition id (SH01..SH10), assigned from the evidence model's
// declared order -- NOT from score rank, so a condition keeps the same id
// across different patients the way L01-L11/C01-C11/T01-T11 do.
const FIXED_ID_BY_NAME = {};
shoulderEvidence.diagnoses.forEach((m, i) => { FIXED_ID_BY_NAME[m.name] = `SH${String(i + 1).padStart(2, "0")}`; });

function scoreToTier(d) {
  if (d.excluded) return "Unlikely";
  if (!d.supportingFindings || d.supportingFindings.length === 0) return "Insufficient data";
  if (d.band === "Low") return "Weak match";
  if (d.band === "Moderate") return "Possible match";
  return "Strong match"; // High
}

// Main entry point -- pure function of `data` (the same flat record every
// other region's extractor already reads), safe to call on every render/
// rehydrate with no separate persisted blob needed (unlike Lumbar/Cervical/
// Thoracic, which persist a merged-with-AI-notes blob because their Pass 2 is
// an async AI call over free text; Shoulder's engine already reads cc_main
// free text synchronously via normalizeFromData, so there is no async merge
// step to preserve across navigation).
export function runShoulderPhase05(data) {
  const result = runShoulderReasoningFromData(data);
  const subjective = normalizeFromData(data).subjective;

  const flags = (result.redFlag && result.redFlag.flags) || [];
  const redFlagOverride = {
    triggered: !!(result.redFlag && result.redFlag.triggered),
    urgency: flags.some((f) => f.id === "cauda_equina") ? "EMERGENCY" : "URGENT",
    reason: flags.map((f) => f.message).join(" "),
    action: flags.length ? "Address the red flag(s) above before relying on the suggestions below." : "",
  };

  const conditions = (result.differentials || []).map((d) => ({
    id: FIXED_ID_BY_NAME[d.name] || "SH?",
    name: d.name,
    matchTier: scoreToTier(d),
    supportingMatched: d.supportingFindings || [],
    refutingMatched: d.conflictingFindings || [],
    unknownCount: (d.missingFindings || []).length,
    note: d.whySuggested,
    objectiveTests: SHOULDER_OBJECTIVE_TESTS[d.name] || { required: [], recommended: [] },
  }));

  return {
    subjective,
    redFlagOverride,
    conditions,
    stopped: !!result.stopped,
    completeness: result.completeness,
  };
}

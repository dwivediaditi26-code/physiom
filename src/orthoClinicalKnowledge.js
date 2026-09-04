// orthoClinicalKnowledge.js — the Ortho clinical knowledge base.
//
// Mirrors neuroClinicalKnowledge.js: DATA + RULES kept out of the UI so the
// same shared Care Plan component (CarePlanSection in NeuroCarePlan.jsx) can
// drive both specialties — only the knowledge changes (2026-09-04, Aditi:
// "ui will be same as neuro but main knowledge is changed").
//
// Ortho differs from Neuro structurally: it is organised by REGION × CONDITION
// × SETTING, and the assessment stores a JSON snapshot rather than a live
// nested object. So this module is a FACTORY — buildOrthoKnowledge(ctx) closes
// over the patient's selected regions and their exercises, and generates
// region-appropriate problems / goals / ranked interventions. Condition
// (surgery) and setting layers stack on top, same "suggest, never auto-apply"
// rule as Neuro.
//
// SOURCING. Standard orthopaedic references, cited (no text reproduced):
//   Magee    — examination, findings, special tests → problem list
//   Brotzman — post-op & condition rehab protocols, precautions → goals
//   Kisner   — exercise prescription / progression / dosage → treatment
//   Donatelli— region-specific rehabilitation
import { EXERCISE_DB } from "./sharedClinicalData.js";

export const REFERENCES = {
  magee: { id: "magee", citation: "Magee DJ. Orthopedic Physical Assessment. 4th ed. Philadelphia: Saunders/Elsevier; 2006.", useFor: "Examination, findings, special tests" },
  brotzman: { id: "brotzman", citation: "Brotzman SB, Manske RC. Clinical Orthopaedic Rehabilitation: An Evidence-Based Approach. 3rd ed. Philadelphia: Elsevier Mosby; 2011.", useFor: "Post-operative & condition rehabilitation protocols, precautions" },
  kisner: { id: "kisner", citation: "Kisner C, Colby LA. Therapeutic Exercise: Foundations and Techniques. Philadelphia: F.A. Davis.", useFor: "Exercise prescription, progression, dosage" },
  donatelli: { id: "donatelli", citation: "Donatelli RA, Wooden MJ, eds. Orthopaedic Physical Therapy. 4th ed. St. Louis: Churchill Livingstone/Elsevier; 2010.", useFor: "Region-specific rehabilitation" },
};

export const EVIDENCE_LEVELS = { A: "Guideline / systematic review", B: "Established textbook practice", C: "Reasonable practice, limited evidence" };

export const PROBLEM_CATEGORIES = [
  { id: "pain", label: "Pain", icon: "🔥" },
  { id: "rom", label: "Range of motion", icon: "🔄" },
  { id: "strength", label: "Strength", icon: "💪" },
  { id: "swelling", label: "Swelling / effusion", icon: "💧" },
  { id: "flexibility", label: "Flexibility", icon: "🧎" },
  { id: "function", label: "Functional / ADL", icon: "🛠️" },
  { id: "gait", label: "Gait / weight-bearing", icon: "🚶" },
  { id: "stability", label: "Joint stability", icon: "🔗" },
  { id: "other", label: "Other", icon: "📋" },
];

// Reused for the dose "Assistance" dropdown and any ADL/gait goal targets.
export const ASSIST_LADDER = ["Independent", "Supervision", "Contact guard", "Minimal assist", "Moderate assist", "Maximal assist", "Dependent"];

export function categoryLabel(id) { return (PROBLEM_CATEGORIES.find((c) => c.id === id) || {}).label || "Other"; }

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const uniq = (a) => [...new Set(a)];
const prettyRegion = (id) => String(id || "").replace(/[_/-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Assessment region id -> EXERCISE_DB key. The assessment uses ids like
// cervical/lumbar/shoulder/knee/wrist/hand/ankle/foot; the exercise DB merges
// wrist+hand and covers foot under ankle.
const REGION_EX_KEY = {
  cervical: "cervical", neck: "cervical", thoracic: "thoracic",
  lumbar: "lumbar", lumbosacral: "lumbar", "lumbar/si": "lumbar", si: "lumbar", "lumbar_si": "lumbar",
  shoulder: "shoulder", elbow: "elbow",
  wrist: "wrist_hand", hand: "wrist_hand", "wrist/hand": "wrist_hand", wrist_hand: "wrist_hand",
  hip: "hip", knee: "knee", ankle: "ankle", foot: "ankle", "ankle/foot": "ankle",
};
const exKeyFor = (id) => REGION_EX_KEY[String(id || "").toLowerCase()] || null;

/* ============================================================
   IMPAIRMENT TYPES — generic, region-instantiated.
   Each produces one suggestion per affected region (pain is global).
   catMatch selects which of that region's exercise categories are
   clinically relevant, so the treatment sheet opens filtered and the
   ranked suggestions come from the right category.
   ============================================================ */
const IMPAIRMENTS = [
  {
    key: "pain", label: "Pain", category: "pain", global: true, refs: ["magee", "kisner"], evidence: "B",
    catMatch: /mobil|flex|range|strength/i,
    goal: (b) => ({ measure: "Pain (NRS)", unit: "/10", baseline: b.painWorst != null || b.painNow != null ? `${b.painWorst ?? "—"}/10 worst → ${b.painNow ?? "—"}/10 now` : "To be recorded", target: "Reduced by ≥2/10 and not limiting function", baselineValue: b.painNow, targetValue: null }),
  },
  {
    key: "rom", label: "range of motion", category: "rom", refs: ["magee", "kisner"], evidence: "B",
    catMatch: /mobil|flex|range|mckenzie|extension/i,
    goal: (b) => ({ measure: `${b.regionLabel} range of motion`, unit: "°/level", baseline: "To be recorded", target: "Restore functional / full pain-free range", baselineValue: null, targetValue: null }),
  },
  {
    key: "strength", label: "muscle weakness", category: "strength", refs: ["magee", "kisner"], evidence: "B",
    catMatch: /strength|quadric|hamstring|glute|cuff|rotator|scapular|core|loading|stabilis/i,
    goal: (b) => ({ measure: `${b.regionLabel} strength`, unit: "MMT/level", baseline: "To be recorded", target: "Improve ≥1 MMT grade / functional strength", baselineValue: null, targetValue: null }),
  },
  {
    key: "swelling", label: "swelling / effusion", category: "swelling", refs: ["brotzman"], evidence: "B", acuteOnly: true,
    catMatch: /mobil|range|flex/i,
    goal: (b) => ({ measure: `${b.regionLabel} swelling / effusion`, unit: "level", baseline: "Present", target: "Minimal / resolved effusion", baselineValue: null, targetValue: null }),
  },
  {
    key: "function", label: "functional limitation", category: "function", refs: ["kisner", "donatelli"], evidence: "B",
    catMatch: /loading|functional|integration|strength|mobil|stabil/i,
    goal: (b) => ({ measure: `${b.regionLabel} functional task`, unit: "level", baseline: "Limited", target: "Independent in target functional tasks", baselineValue: null, targetValue: null }),
  },
];
const impByKey = (key) => IMPAIRMENTS.find((i) => i.key === key);

/* ============================================================
   CONDITION (surgery) PROBLEMS — filled in Step 3 (Brotzman).
   SETTING overlays — filled in Step 4.
   Keyed to the assessment's own condition ids (fracture, fractureORIF,
   jointReplacement, ligamentReconstruction, tendonRepair, arthroscopy,
   spineSurgery, dislocation, spine, ...) and settings (outpatient/ipd/postop).
   ============================================================ */
export const CONDITION_PROBLEMS = [];
export const SETTING_PROBLEMS = [];
export const SETTING_PROFILES = {
  outpatient: { label: "Outpatient", timeframeScale: 1, precautions: [] },
  ipd: { label: "Inpatient (acute)", timeframeScale: 0.5, precautions: [] },
  postop: { label: "Post-operative", timeframeScale: 0.6, precautions: [] },
};
const CONDITION_LABELS = {
  fracture: "Fracture", fractureORIF: "Fracture ORIF", jointReplacement: "Joint replacement",
  ligamentReconstruction: "Ligament reconstruction", tendonRepair: "Tendon repair",
  tendonTransfer: "Tendon transfer", arthroscopy: "Arthroscopy", dislocation: "Dislocation",
  jointStabilization: "Joint stabilization", spine: "Spinal condition", spineSurgery: "Spinal surgery",
  softTissue: "Soft-tissue injury", softTissueMuscle: "Soft-tissue / muscle", painFunctional: "Pain / functional",
  deconditioning: "Deconditioning", arthritis: "Arthritis", amputation: "Amputation",
};

export function conditionLabel(id) { return CONDITION_LABELS[id] || null; }
export function settingLabel(id) { return (SETTING_PROFILES[id] || {}).label || null; }
export function conditionSettingPrecautions(condition, setting) {
  const c = (CONDITION_PROBLEMS.find((p) => p.id === "__precaution__" + condition) || {}).precautions || [];
  const s = (SETTING_PROFILES[setting] || {}).precautions || [];
  return [...c, ...s];
}
function scaleWeeks(weeks, scale) { return typeof weeks === "number" ? Math.max(1, Math.round(weeks * (scale || 1))) : weeks; }

/* ============================================================
   PROGRESS — identical to neuro: derived from session measures.
   ============================================================ */
export function goalProgress(goal, entries) {
  const pts = (entries || []).filter((e) => e && e.value != null);
  const bv = typeof goal.baselineValue === "number" ? goal.baselineValue : null;
  const tv = typeof goal.targetValue === "number" ? goal.targetValue : null;
  const latest = pts.length ? pts[pts.length - 1].value : bv;
  if (bv === null || tv === null || typeof latest !== "number" || tv === bv) return { pct: null, latest, achieved: false };
  const pct = Math.max(0, Math.min(100, Math.round(((latest - bv) / (tv - bv)) * 100)));
  return { pct, latest, achieved: pct >= 100 };
}

/* ============================================================
   FACTORY — buildOrthoKnowledge(ctx)
   ctx = { condition, setting, regions:[{id,label,side}], pain:{now,worst} }
   Returns a knowledge object of the same shape CarePlanSection expects.
   ============================================================ */
export function buildOrthoKnowledge(ctx = {}) {
  const regions = Array.isArray(ctx.regions) ? ctx.regions : [];
  const regionKeys = uniq(regions.map((r) => exKeyFor(r.id)).filter(Boolean));

  // Merge the selected regions' exercise categories into one browse set.
  const exerciseCategories = {};
  regionKeys.forEach((k) => {
    const cats = EXERCISE_DB[k]?.categories || {};
    Object.entries(cats).forEach(([c, list]) => { exerciseCategories[c] = (exerciseCategories[c] || []).concat(list); });
  });
  const allExercises = Object.entries(exerciseCategories).flatMap(([c, list]) => list.map((e) => ({ ...e, _cat: c })));

  // Which category names of a given region match an impairment's catMatch.
  const matchedCats = (regionKey, catMatch) => Object.keys(EXERCISE_DB[regionKey]?.categories || {}).filter((c) => catMatch.test(c));

  const srcFor = (refs) => (refs || []).map((r) => REFERENCES[r]?.citation.split(".")[0]).filter(Boolean).join("; ");

  // Build one derived problem object for an impairment + region.
  function makeProblem(imp, region, extra) {
    const regionLabel = region ? (region.label || prettyRegion(region.id)) : "";
    const regionKey = region ? exKeyFor(region.id) : null;
    const name = imp.global ? imp.label : `${regionLabel} ${imp.label}`;
    // Keyword-matched categories first; if a region names its categories in a
    // way the keywords miss (e.g. knee has Quadriceps/Hamstrings, no "ROM"),
    // fall back to all of that region's categories so the sheet still opens
    // filtered to the right region rather than empty.
    let treatmentCategories = regionKey ? matchedCats(regionKey, imp.catMatch) : [];
    if (regionKey && !treatmentCategories.length) treatmentCategories = Object.keys(EXERCISE_DB[regionKey]?.categories || {});
    const findings = imp.global
      ? [{ label: "Pain (NRS)", value: (extra.painWorst != null || extra.painNow != null) ? `${extra.painWorst ?? "—"}/10 worst → ${extra.painNow ?? "—"}/10 now` : "recorded" }]
      : [{ label: "Suggested for", value: regionLabel }];
    return {
      id: imp.global ? "pain" : `${imp.key}__${region.id}`,
      name, category: imp.category, refs: imp.refs, evidence: imp.evidence,
      treatmentCategories,
      findings,
      baseline: { regionLabel, regionId: region?.id || null, regionKey, impKey: imp.key, painNow: extra.painNow ?? null, painWorst: extra.painWorst ?? null },
    };
  }

  function deriveProblems(data) {
    const meta = data?.meta || {};
    const pain = data?.pain || {};
    const setting = meta.setting || ctx.setting || null;
    const condition = meta.condition || ctx.condition || null;
    const regs = Array.isArray(meta.regions) && meta.regions.length ? meta.regions : regions;
    const out = [];

    // Pain (global) — only when a pain value was recorded.
    const painNow = num(pain.now), painWorst = num(pain.worst);
    if (painNow != null || painWorst != null) out.push(makeProblem(impByKey("pain"), null, { painNow, painWorst }));

    // Region impairments — suggestions per selected region.
    for (const r of regs) {
      for (const imp of IMPAIRMENTS) {
        if (imp.global) continue;
        if (imp.acuteOnly && !(setting === "ipd" || setting === "postop")) continue;
        out.push(makeProblem(imp, r, {}));
      }
    }

    // Condition-specific (Step 3) — gated by selected condition.
    if (condition) {
      for (const p of CONDITION_PROBLEMS) {
        if (!p.conditions || !p.conditions.includes(condition)) continue;
        out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories || [], findings: [{ label: "Condition", value: p.finding }], baseline: { impKey: null, conditionId: condition }, conditionSpecific: true, _goals: p.goals });
      }
    }
    // Setting-specific (Step 4) — gated by setting.
    if (setting) {
      for (const p of SETTING_PROBLEMS) {
        if (!p.settings || !p.settings.includes(setting)) continue;
        out.push({ id: p.id, name: p.name, category: p.category, refs: p.refs, evidence: p.evidence, treatmentCategories: p.treatmentCategories || [], findings: [{ label: "Setting priority", value: p.finding }], baseline: { impKey: null, settingId: setting }, settingSpecific: true, _goals: p.goals });
      }
    }
    return out;
  }

  // Goal templates for a problem (by its sourceId). baseline carries the
  // region label / impairment key so we can rebuild the right template.
  function buildGoalsForProblem(problemId, baseline, setting) {
    const scale = SETTING_PROFILES[setting]?.timeframeScale ?? 1;
    // Condition / setting problems carry their own goal templates.
    const cond = CONDITION_PROBLEMS.find((p) => p.id === problemId) || SETTING_PROBLEMS.find((p) => p.id === problemId);
    if (cond) {
      return (cond.goals || []).map((g) => ({ templateId: g.id, label: g.label, term: g.term, weeks: scaleWeeks(g.weeks, scale), problemId, ...g.build() }));
    }
    // Impairment problems: derive the type from the id / baseline.
    const impKey = baseline?.impKey || (problemId === "pain" ? "pain" : String(problemId).split("__")[0]);
    const imp = impByKey(impKey);
    if (!imp) return [];
    const weeks = imp.key === "pain" ? 4 : imp.key === "function" ? 8 : 6;
    const built = imp.goal(baseline || {});
    return [{ templateId: imp.key, label: `Improve ${imp.global ? "pain" : baseline?.regionLabel + " " + imp.label}`, term: imp.key === "pain" || imp.key === "swelling" ? "short" : "long", weeks: scaleWeeks(weeks, scale), problemId, ...built }];
  }

  // Ranked, book-referenced exercise suggestions for a problem.
  function recommendInterventions(problemId) {
    const cond = CONDITION_PROBLEMS.find((p) => p.id === problemId) || SETTING_PROBLEMS.find((p) => p.id === problemId);
    if (cond && cond.interventions) {
      return cond.interventions.map((r) => ({ ...r })).filter((r) => allExercises.some((e) => e.id === r.exId));
    }
    const impKey = problemId === "pain" ? "pain" : String(problemId).split("__")[0];
    const regionId = String(problemId).split("__")[1] || null;
    const imp = impByKey(impKey);
    if (!imp) return [];
    const regionKey = regionId ? exKeyFor(regionId) : null;
    // Candidate exercises: from this region's matching categories (or, for
    // global pain, from any matching category in the merged set).
    let pool = allExercises.filter((e) => imp.catMatch.test(e._cat));
    if (regionKey) {
      const regionCatNames = Object.keys(EXERCISE_DB[regionKey]?.categories || {});
      const scoped = pool.filter((e) => regionCatNames.includes(e._cat));
      pool = scoped.length ? scoped : allExercises.filter((e) => regionCatNames.includes(e._cat));
    }
    const source = srcFor(imp.refs);
    // Prefer stronger-evidence, earlier-phase exercises first.
    const rank = (e) => (/(strongest)/i.test(e.evidence || "") ? 0 : /strong/i.test(e.evidence || "") ? 1 : 2);
    return pool.sort((a, b) => rank(a) - rank(b)).slice(0, 5).map((e) => ({ exId: e.id, note: e.target || "", source }));
  }

  function problemById(id) {
    const cond = CONDITION_PROBLEMS.find((p) => p.id === id) || SETTING_PROBLEMS.find((p) => p.id === id);
    if (cond) return cond;
    const impKey = id === "pain" ? "pain" : String(id).split("__")[0];
    const imp = impByKey(impKey);
    return imp ? { id, category: imp.category } : null;
  }

  return {
    deriveProblems, buildGoalsForProblem, recommendInterventions, problemById, categoryLabel,
    PROBLEM_CATEGORIES, REFERENCES, ASSIST_LADDER, goalProgress,
    conditionLabel, settingLabel, conditionSettingPrecautions,
    exerciseCategories,
  };
}

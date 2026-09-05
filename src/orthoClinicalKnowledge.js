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
/* ============================================================
   CONDITION / SURGERY PROBLEMS (Step 3) — gated by the condition id the
   assessment recorded (rawCondition). Each carries surgery-specific
   goals + precautions, grounded in Brotzman & Manske 3rd ed. (page
   anchors in comments). Suggestions only; precautions inform, never gate.
   ============================================================ */
const g = (id, label, term, weeks, measure, baseline, target) => ({ id, label, term, weeks, build: () => ({ measure, unit: "level", baseline, target, baselineValue: null, targetValue: null }) });

export const CONDITION_PROBLEMS = [
  {
    id: "cond_acl", conditions: ["ligamentReconstruction"], name: "Protect reconstructed ligament / restore controlled motion",
    category: "stability", refs: ["brotzman"], evidence: "A", treatmentCategories: [],
    finding: "Ligament reconstruction — protect the graft and progress motion/loading by phase (Brotzman ch.4, ACL p.211)",
    goals: [
      g("acl_ext", "Restore full knee extension early", "short", 3, "Knee extension", "Limited / guarded", "Full symmetrical passive extension"),
      g("acl_flex", "Restore knee flexion", "long", 8, "Knee flexion", "Limited", "Flexion to ≥120° (functional for floor-sitting)"),
      g("acl_quad", "Restore quadriceps control/strength", "long", 10, "Quadriceps activation/strength", "Inhibited", "Symmetrical quadriceps strength, good control"),
      g("acl_rts", "Meet return-to-activity criteria", "long", 16, "Return-to-sport criteria", "Not met", "Meets strength/hop/functional criteria"),
    ],
  },
  {
    id: "cond_tendon", conditions: ["tendonRepair", "tendonTransfer"], name: "Protect the repair through healing phases",
    category: "other", refs: ["brotzman"], evidence: "A", treatmentCategories: [],
    finding: "Tendon repair — respect protected phase; passive→active→resisted by protocol (Brotzman: RC repair p.99, Achilles p.350, flexor tendon p.1)",
    goals: [
      g("tr_prom", "Maintain protected passive range", "short", 4, "Protected passive ROM", "Restricted per protocol", "Full available passive range without stressing repair"),
      g("tr_arom", "Restore active range as cleared", "long", 8, "Active ROM", "Not permitted early", "Full active range once repair healed"),
      g("tr_strength", "Progressive strengthening after healing", "long", 12, "Strength", "Deferred", "Functional strength once cleared"),
    ],
  },
  {
    id: "cond_jr", conditions: ["jointReplacement"], name: "Restore mobility & function after joint replacement",
    category: "function", refs: ["brotzman"], evidence: "A", treatmentCategories: [],
    finding: "Joint replacement — regain motion/function within precautions (Brotzman: THR p.374, TKR p.386)",
    goals: [
      g("jr_rom", "Regain joint range early", "long", 8, "Joint ROM", "Limited", "Knee flexion ≥90–120° / hip functional range"),
      g("jr_transfer", "Independent transfers & gait with aid", "short", 3, "Transfers / gait", "Assisted", "Independent transfers and gait with prescribed aid"),
      g("jr_strength", "Restore lower-limb strength", "long", 10, "Hip/knee strength", "Weak", "Functional quadriceps/gluteal strength"),
    ],
  },
  {
    id: "cond_fracture", conditions: ["fracture", "fractureORIF"], name: "Protected mobilization respecting fracture fixation",
    category: "function", refs: ["brotzman"], evidence: "B", treatmentCategories: [],
    finding: "Fracture / ORIF — mobilize within the prescribed weight-bearing & immobilization limits (Brotzman: distal radius p.24; AO loading principles)",
    goals: [
      g("fx_adj", "Maintain range of adjacent joints", "short", 3, "Adjacent-joint ROM", "At risk of stiffness", "Full range of joints above/below maintained"),
      g("fx_rom", "Restore range at the involved joint once cleared", "long", 8, "Involved-joint ROM", "Restricted", "Functional range restored"),
      g("fx_load", "Progressive loading as healing allows", "long", 10, "Loading / weight-bearing", "Restricted", "Progressed to full weight-bearing / loading per surgeon"),
    ],
  },
  {
    id: "cond_spine_surg", conditions: ["spineSurgery"], name: "Protected spinal recovery after surgery",
    category: "function", refs: ["brotzman"], evidence: "B", treatmentCategories: [],
    finding: "Spinal surgery — protect early; progress core control and walking (Brotzman: rehab after lumbar disc surgery p.491)",
    goals: [
      g("ss_mob", "Pain-free functional mobility (walking, transfers)", "short", 4, "Functional mobility", "Guarded", "Independent walking/transfers without symptom flare"),
      g("ss_core", "Restore trunk/core endurance", "long", 8, "Core stabilization endurance", "Reduced", "Adequate core endurance for daily tasks"),
      g("ss_rtw", "Return to work / ADL", "long", 12, "Return to work/ADL", "Restricted", "Resumes target work/ADL roles"),
    ],
  },
  {
    id: "cond_arthroscopy", conditions: ["arthroscopy"], name: "Restore motion & strength after arthroscopy",
    category: "function", refs: ["brotzman"], evidence: "B", treatmentCategories: [],
    finding: "Arthroscopy — control effusion, restore motion, progress loading (Brotzman: meniscus p.261, rotator cuff p.99)",
    goals: [
      g("ar_effusion", "Control effusion & restore full extension/motion", "short", 3, "Effusion / ROM", "Effused / limited", "Effusion resolved, full motion"),
      g("ar_strength", "Restore strength & function", "long", 8, "Strength / function", "Reduced", "Functional strength and return to activity"),
    ],
  },
  {
    id: "cond_instability", conditions: ["dislocation", "jointStabilization"], name: "Restore stability while protecting healing structures",
    category: "stability", refs: ["brotzman"], evidence: "B", treatmentCategories: [],
    finding: "Dislocation / stabilization — protect the at-risk position, then progress (Brotzman: shoulder instability p.106)",
    goals: [
      g("inst_rom", "Protected range then full range", "long", 8, "Range within safe arc", "Protected", "Full range regained within timeline"),
      g("inst_strength", "Dynamic stabilizer strength", "long", 10, "Cuff/scapular or dynamic stabilizer strength", "Weak", "Good dynamic stability strength"),
      g("inst_return", "Return to activity without instability", "long", 12, "Return to activity", "At risk", "Returns to activity without recurrent instability"),
    ],
  },
  {
    id: "cond_spine_cons", conditions: ["spine"], name: "Mechanical spinal pain — classification-based management",
    category: "function", refs: ["brotzman"], evidence: "A", treatmentCategories: [],
    finding: "Spinal condition — treatment-based classification / directional preference (Brotzman: LBP classification p.465, McKenzie p.482, core stabilization p.467)",
    goals: [
      g("sc_centralize", "Centralize / reduce symptoms", "short", 3, "Symptom centralization", "Peripheralized / painful", "Symptoms centralized / reduced"),
      g("sc_core", "Build core/trunk endurance", "long", 8, "Core endurance", "Reduced", "Adequate core endurance"),
      g("sc_function", "Return to functional activity", "long", 8, "Functional activity", "Limited", "Resumes target activities"),
    ],
  },
];

// condition id -> precaution lines (shown in the banner). Grounded in Brotzman.
const CONDITION_PRECAUTIONS = {
  ligamentReconstruction: [
    "Protect the graft — follow the surgeon's weight-bearing and bracing timeline.",
    "In early ACL rehab, avoid resisted open-chain terminal knee extension (last ~40°) to limit graft strain; restore full passive extension early.",
  ],
  tendonRepair: [
    "Respect the protected phase — no active/loaded movement of the repaired tendon until the surgeon clears it; passive/assisted motion only early.",
    "Progress to active then resisted strengthening only once the repair has healed per protocol.",
  ],
  tendonTransfer: ["Protect the transfer — respect the immobilization and re-education timeline before active/resisted use."],
  jointReplacement: [
    "Hip replacement: observe the precautions for the surgical approach (commonly avoid deep flexion, crossing midline, and rotation early); deep squatting/floor-sitting only if a high-flex implant and the surgeon allow.",
    "Knee replacement: prioritise regaining flexion AND full extension early to avoid stiffness.",
    "Follow the prescribed weight-bearing status and gait aid.",
  ],
  fracture: ["Respect the prescribed weight-bearing status (NWB/TTWB/PWB/WBAT/FWB) and immobilization; avoid stressing the fracture site.", "Progress loading only as bony/fixation healing allows per surgeon."],
  fractureORIF: ["Respect the prescribed weight-bearing status and any immobilization; avoid stressing the fixation.", "Mobilize joints above and below within allowed range; progress loading per surgeon."],
  spineSurgery: ["Early on avoid bending, lifting and twisting (BLT) beyond the surgeon's limits.", "Avoid heavy lifting until cleared; progress core stabilization and walking within tolerance."],
  dislocation: ["Avoid the position of instability early (e.g., abduction + external rotation after anterior shoulder dislocation)."],
  jointStabilization: ["Respect the protected range after stabilization; avoid the at-risk position until cleared, then progress range and strengthening on the surgeon's timeline."],
  arthroscopy: ["Manage effusion and restore full extension/motion early; progress weight-bearing and loading as effusion and pain allow."],
};

/* ============================================================
   SETTING OVERLAYS (Step 4) — care priorities for the level of care,
   gated by setting (outpatient/ipd/postop). Appear from the setting alone
   so the Care Plan is populated & relevant in every setting. Suggestions
   only. Grounded in Brotzman post-op principles + Kisner exercise staging.
   ============================================================ */
export const SETTING_PROBLEMS = [
  // ---- Inpatient (acute) ----
  {
    id: "set_ipd_earlymob", settings: ["ipd"], name: "Early safe mobilization within precautions", category: "function",
    refs: ["brotzman", "kisner"], evidence: "B", treatmentCategories: [],
    finding: "Acute inpatient — progress bed mobility → sitting → standing → walking with aid, within precautions",
    goals: [g("ipd_mob", "Progress early mobility (bed → sit → stand → walk)", "short", 2, "Early mobility level", "Bed / dependent", "Sitting out of bed and walking with aid")],
  },
  {
    id: "set_ipd_complications", settings: ["ipd", "postop"], name: "Prevent post-operative complications (DVT / respiratory)", category: "other",
    refs: ["brotzman"], evidence: "B", treatmentCategories: [],
    finding: "Post-op — ankle pumps, early mobility and deep breathing to reduce DVT/respiratory risk",
    goals: [g("ipd_complic", "No avoidable post-op complication", "short", 2, "DVT / respiratory status", "At risk", "No avoidable DVT/respiratory complication")],
  },
  // ---- Post-operative ----
  {
    id: "set_postop_woundswell", settings: ["postop"], name: "Wound protection & swelling management", category: "swelling",
    refs: ["brotzman"], evidence: "B", treatmentCategories: [],
    finding: "Post-op — protect the wound and control swelling (elevation, cryotherapy, compression) as activity increases",
    goals: [g("po_swell", "Control swelling; protect wound healing", "short", 3, "Swelling / wound", "Swollen / early healing", "Swelling controlled, wound healing uncompromised")],
  },
  {
    id: "set_postop_pain", settings: ["postop"], name: "Pain-limited activity tolerance", category: "pain",
    refs: ["brotzman", "kisner"], evidence: "C", treatmentCategories: [],
    finding: "Post-op — grade activity to pain; time sessions with analgesia",
    goals: [g("po_pain", "Increase activity within acceptable pain", "short", 3, "Pain-limited activity", "Markedly limited", "Completes planned activity with acceptable pain")],
  },
  // ---- Outpatient ----
  {
    id: "set_opd_return", settings: ["outpatient"], name: "Return to work / sport / functional activity", category: "function",
    refs: ["kisner", "donatelli"], evidence: "B", treatmentCategories: [],
    finding: "Outpatient — progress toward the patient's target work/sport/functional roles",
    goals: [g("opd_return", "Resume target role / activity", "long", 8, "Role / activity", "Restricted", "Resumes target work/sport/ADL role")],
  },
  {
    id: "set_opd_selfmgmt", settings: ["outpatient"], name: "Self-management / home programme adherence", category: "function",
    refs: ["kisner"], evidence: "B", treatmentCategories: [],
    finding: "Outpatient — establish an independent, progressing home exercise programme",
    goals: [g("opd_hep", "Independent, progressing home programme", "long", 6, "Home programme", "Not established", "Performs and progresses HEP independently")],
  },
];
export const SETTING_PROFILES = {
  outpatient: { label: "Outpatient", timeframeScale: 1, precautions: [] },
  ipd: { label: "Inpatient (acute)", timeframeScale: 0.5, precautions: [
    "Confirm the patient's weight-bearing status and any post-operative precautions before mobilizing.",
    "Watch for signs of DVT/PE after lower-limb surgery — encourage ankle pumps and early mobility.",
  ] },
  postop: { label: "Post-operative", timeframeScale: 0.6, precautions: [
    "Respect the surgeon's weight-bearing and range-of-motion restrictions at all times.",
    "Protect and monitor the surgical wound; manage swelling (elevation, cryotherapy, compression) as activity increases.",
  ] },
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
  const c = CONDITION_PRECAUTIONS[condition] || [];
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

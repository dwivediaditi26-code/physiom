// subjectiveTiering.js — adaptive/tiered Subjective assessment logic.
//
// Turns each region's flat field list into three tiers so the form shows a
// focused CORE set by default, reveals CONDITIONAL blocks only when a trigger
// question warrants them, and tucks DEEP-DIVE detail behind an expander.
//
// This module is intentionally dependency-free (pure data + pure functions) so
// it can be imported by both sharedClinicalData.js (to inject consolidated
// notes fields) and SubjectiveObjective.jsx (to drive rendering + progress)
// without creating an import cycle.
//
// NOTHING here removes clinical content. Fields not tagged core/conditional are
// still rendered (under "Add more detail"), and conditional fields that ARE
// filled still flow to the differential engine exactly as before. Legacy
// per-subsection Notes fields are preserved and shown whenever they already
// hold data (safe migration); new consolidated Notes are additive.

// ── helpers ──────────────────────────────────────────────────────────
const toArr = (v) => Array.isArray(v) ? v : (v == null || v === "" ? [] : String(v).split(/\|\|\||\n/));
const J = (v) => toArr(v).join(" | ").toLowerCase();

// Selected value(s) that represent a real positive (ignoring "No…"/"Not…"/N/A)
const hasReal = (v, negRe) =>
  toArr(v).some((x) => x && !negRe.test(String(x).toLowerCase()));

const NEG_GENERIC = /^(no\b|no\s|none|not applicable|n\/a|not )/i;
const NEG_RADIATION = /^(no radiation|no\b|not applicable|not dermatomal)/i;
const NEG_MECH = /^(no clear|insidious|no identified|no\b)/i;

// A whiplash/traumatic/acute-injury mechanism is present
const TRAUMA_RE = /whiplash|hyperflex|hyperext|trauma|diving|fall|mva|accident|impact|\bpop\b|twist|contact|inversion|sprain|direct|lifting|deadlift|dislocat/i;
const traumaMOI = (v) => TRAUMA_RE.test(J(v));

const radiationPresent = (v) => hasReal(v, NEG_RADIATION);
const mechPresent = (v) => hasReal(v, NEG_MECH);
const yes = (v) => /^yes/i.test(String(toArr(v)[0] || "")) ||
  toArr(v).some((x) => /^yes/i.test(String(x)));

// ── per-region tiering config ────────────────────────────────────────
// core      : always visible + counted toward "Core X/N complete"
// triggers  : gating QUESTIONS — always visible so the clinician can answer
//             (not counted as core), their dependent block is a gate below
// gates     : { fields:[…dependent ids], when:(data)=>bool } — shown only when
//             the trigger/condition is met; hidden (and not required) otherwise
// Everything else in a region module that isn't core/trigger/gate/note falls
// through to the DEEP tier (rendered under "Add more detail").
export const SUBJ_TIER = {
  // ── Universal Red Flag Screen (grf_*, shared by every region) ──
  // Was previously untiered -- classifyField() falls through to "core" for
  // any prefix with no SUBJ_TIER entry, so all 6 category checklists
  // (Systemic/Cancer/Fracture/Infection/Neuro/Vascular) plus Action Taken
  // rendered inline, always, for every patient regardless of presentation
  // (2026-08-18 user feedback: "don't show a giant list ... Any concerning
  // symptoms? No concerns / Possible concern"). Only the Action Taken
  // summary field (already reads as a plain "No red flags — proceed with
  // assessment" / "GP referral — urgent" / etc. select) stays inline; the
  // category checklists move one tap away behind "+ Add more detail",
  // exactly like every other region's deep-tier detail -- nothing removed
  // from the data model, still fully documentable, just not front-loaded.
  grf: { core: ["grf_action"], triggers: [], gates: [] },

  // ── Chief Complaint (cc_*, universal Core section) ──
  // Was previously untiered like grf above -- classifyField() falls
  // through to "core" for any prefix with no SUBJ_TIER entry, so
  // cc_vas_best ("Best pain past week") always rendered as a second NRS
  // slider alongside cc_vas_now. 2026-08-18 user feedback: only one Pain
  // NRS slider in Core. cc_vas_best is NOT removed from the data model --
  // it's just deep-tier now, one tap away under Core's own "+ more
  // detail" expander like everything else demoted this way.
  cc: { core: ["cc_main","cc_onset","cc_duration","cc_vas_now","cc_quality"], triggers: [], gates: [] },

  // ── Cervical — trimmed 2026-08-18 per direct user feedback: the
  // original 15-field core list (agreed spec) was still too long for a
  // phone screen mid-interview. Dropped to the fields that actually change
  // clinical decision-making; the rest (secondary aggravating/relieving
  // factors, morning/night sub-pattern, 24hr pattern, trajectory) are one
  // tap away under "+ Add more detail", not removed from the data model. ──
  cx: {
    core: ["cx_loc","cx_radiation","cx_moi","cx_agg_mov",
           "cx_rel_mov","cx_pattern",
           "cx_irritability","cx_rf_myelopathy","cx_rf_vbi","cx_rf_instability","cx_fn_adl"],
    triggers: ["cx_arm_present","cx_ha_present"],
    // Gate lists trimmed too (2026-08-18): "yes" to arm/headache still
    // reveals the handful of fields that actually change what you'd assess
    // next, not every related field. Dermatomal distribution no longer
    // auto-reveals on radiation at all -- per user feedback that's an
    // objective/neuro-exam determination, not a first-interview question;
    // it's still there, just under "+ Add more detail" like any deep field.
    gates: [
      { fields:["cx_moi_wad","cx_moi_loc","cx_moi_first"], when:(d)=>traumaMOI(d.cx_moi) },
      { fields:["cx_arm_quality","cx_arm_fingers","cx_arm_neuro"], when:(d)=>yes(d.cx_arm_present) },
      { fields:["cx_ha_location","cx_ha_frequency"], when:(d)=>yes(d.cx_ha_present) },
    ],
  },
  // ── Lumbar / SI — trimmed 2026-08-18, same rule as Cervical: one
  // aggravating field, one relieving field, pattern+irritability only
  // (night/24hr moved to deep). below_knee and both red-flag fields kept
  // (radiculopathy/cauda equina screen -- changes clinical decision-making,
  // never trimmed). ──
  lx: {
    core: ["lx_loc","lx_radiation","lx_below_knee","lx_moi",
           "lx_agg_mov","lx_rel_best","lx_pattern",
           "lx_irritability","lx_rf_cauda","lx_rf_serious","lx_fn_adl"],
    triggers: ["lx_neuro_present"],
    gates: [
      { fields:["lx_moi_load","lx_moi_position"], when:(d)=>mechPresent(d.lx_moi) },
      { fields:["lx_dermatomal"], when:(d)=>radiationPresent(d.lx_radiation) },
      { fields:["lx_neuro_quality","lx_neuro_signs","lx_claudication","lx_bladder_baseline"], when:(d)=>yes(d.lx_neuro_present) },
    ],
  },
  // ── Shoulder / Knee / Hip / Ankle / Elbow-Wrist-Hand / Thoracic --
  // trimmed 2026-08-18, same rule applied consistently: keep ONE
  // aggravating field (drop the second "activities aggravate" duplicate),
  // keep pattern+irritability (drop morning/night sub-pattern where
  // present), never trim red-flag fields or a region's own distinctive
  // diagnostic sign (knee giving-way/locking, ankle swelling, wrist/hand
  // neuro signs, hip mechanical pattern) since those directly change what
  // you'd assess next -- exactly the "does it change decision-making"
  // principle requested. ──
  // ── Shoulder (L) ──
  shl: {
    core: ["shl_loc","shl_radiation","shl_moi","shl_agg_mov",
           "shl_rel_post","shl_pattern","shl_stiffness","shl_irritability","shl_rf","shl_fn"],
    triggers: [],
    gates: [ { fields:["shl_moi_pop","shl_moi_first"], when:(d)=>traumaMOI(d.shl_moi) } ],
  },
  // ── Shoulder (R) ──
  shr: {
    core: ["shr_loc","shr_radiation","shr_moi","shr_agg_mov",
           "shr_rel_post","shr_pattern","shr_stiffness","shr_irritability","shr_rf","shr_fn"],
    triggers: [],
    gates: [ { fields:["shr_moi_pop"], when:(d)=>traumaMOI(d.shr_moi) } ],
  },
  // ── Knee (L) ──
  knl: {
    core: ["knl_loc","knl_radiation","knl_moi","knl_agg_mov",
           "knl_rel_post","knl_pattern","knl_giving_way","knl_locking","knl_irritability","knl_rf","knl_fn"],
    triggers: [],
    gates: [ { fields:["knl_pop","knl_swelling","knl_weightbear","knl_prev_surgery"], when:(d)=>traumaMOI(d.knl_moi) } ],
  },
  // ── Knee (R) ──
  knr: {
    core: ["knr_loc","knr_radiation","knr_moi","knr_agg_mov",
           "knr_rel","knr_pattern","knr_giving_way","knr_locking","knr_irritability","knr_rf","knr_fn"],
    triggers: [],
    gates: [ { fields:["knr_pop","knr_swelling","knr_prev_surgery"], when:(d)=>traumaMOI(d.knr_moi) } ],
  },
  // ── Hip / Groin ──
  hp: {
    core: ["hp_loc","hp_loc_pattern","hp_moi","hp_agg_mov",
           "hp_rel_post","hp_pattern","hp_mechanical","hp_irritability","hp_rf","hp_fn"],
    triggers: [],
    gates: [],
  },
  // ── Ankle / Foot ──
  af: {
    core: ["af_loc","af_radiation","af_moi","af_agg_mov",
           "af_rel_mov","af_pattern","af_swelling","af_irritability","af_rf","af_fn"],
    triggers: [],
    gates: [ { fields:["af_moi_pop","af_moi_weightbear","af_prev_sprains"], when:(d)=>traumaMOI(d.af_moi) } ],
  },
  // ── Elbow / Wrist / Hand ──
  ew: {
    core: ["ew_loc","ew_radiation","ew_moi","ew_agg_mov",
           "ew_rel","ew_pattern","ew_neuro","ew_irritability","ew_rf","ew_fn"],
    triggers: [],
    gates: [],
  },
  // ── Thoracic ──
  tx: {
    core: ["tx_loc","tx_radiation","tx_moi","tx_agg_mov",
           "tx_rel","tx_pattern","tx_irritability","tx_rf","tx_fn"],
    triggers: [],
    gates: [],
  },
};

// ── consolidated Notes (ADD; legacy per-subsection notes are kept) ────
// 2–3 running clinical-notes fields per region, grouped by major theme.
const NOTE_GROUPS = (p) => [
  { id:`${p}_notes_history`, label:"Clinical Notes — History / Mechanism / Location",
    type:"textarea", placeholder:"Onset, mechanism, location, pain character, relevant history…", tierNote:true },
  { id:`${p}_notes_aggrel`, label:"Clinical Notes — Aggravating / Relieving / Behaviour",
    type:"textarea", placeholder:"Aggravating & relieving factors, 24-hour pattern, irritability…", tierNote:true },
  { id:`${p}_notes_safety`, label:"Clinical Notes — Safety / Neuro / Function",
    type:"textarea", placeholder:"Red-flag screening detail, neuro symptoms, functional impact…", tierNote:true },
];

export const SUBJ_NOTES = Object.keys(SUBJ_TIER).reduce((acc, p) => {
  acc[p] = NOTE_GROUPS(p);
  return acc;
}, {});

// Set of all NEW consolidated note ids (used to tell them apart from legacy).
export const NEW_NOTE_IDS = new Set(
  Object.values(SUBJ_NOTES).flatMap((arr) => arr.map((f) => f.id))
);

// prefix → REG_MOD_S region key (for injecting the consolidated notes)
export const PREFIX_TO_REGION = {
  cx:"Cervical spine", lx:"Lumbar / SI", shl:"Shoulder (L)", shr:"Shoulder (R)",
  knl:"Knee (L)", knr:"Knee (R)", hp:"Hip / Groin", af:"Ankle / Foot",
  ew:"Elbow/Wrist/Hand", tx:"Thoracic spine",
};

// Append the consolidated notes into each region module's LAST section, so they
// persist / export / feed the engine through the existing generic pipeline.
export function injectConsolidatedNotes(REG_MOD_S) {
  Object.entries(SUBJ_NOTES).forEach(([p, notes]) => {
    const region = PREFIX_TO_REGION[p];
    const mod = REG_MOD_S[region];
    if (!mod || !mod.sections) return;
    const keys = Object.keys(mod.sections);
    const lastKey = keys[keys.length - 1];
    const sec = mod.sections[lastKey];
    if (!sec || !Array.isArray(sec.fields)) return;
    notes.forEach((nf) => {
      if (!sec.fields.some((f) => f.id === nf.id)) sec.fields.push(nf);
    });
  });
  return REG_MOD_S;
}

// prefix from a field id: "cx_loc" -> "cx", "shl_moi" -> "shl"
const prefixOf = (id) => String(id || "").split("_")[0];

// A field counts as a "note" ONLY if its id ends with _notes (the legacy
// per-subsection notes) or it is one of the new consolidated notes. We must NOT
// treat every textarea as a note — real free-text fields like the chief
// complaint (cc_main, patient's own words) are textareas and must always show.
const isNoteField = (f) => /_notes$/.test(f.id) || f.tierNote === true || NEW_NOTE_IDS.has(f.id);

// ── the core classifier used by the renderer + progress counter ──────
// Returns { visible, tier } where tier ∈ 'core' | 'conditional' | 'deep' | 'note'.
// Fields in regions without a tier config (universal sections) are all shown as
// 'core' so existing behaviour is preserved.
export function classifyField(field, data = {}) {
  const id = field.id;
  const p = prefixOf(id);
  const cfg = SUBJ_TIER[p];

  if (isNoteField(field)) {
    if (NEW_NOTE_IDS.has(id)) return { visible: true, tier: "note" };
    // legacy note: only surface if it already holds data (safe migration)
    const val = data[id];
    return { visible: !!(val && String(val).trim()), tier: "note" };
  }

  if (!cfg) return { visible: true, tier: "core" };

  if (cfg.core.includes(id)) return { visible: true, tier: "core" };
  if ((cfg.triggers || []).includes(id)) return { visible: true, tier: "conditional" };
  for (const g of cfg.gates || []) {
    if (g.fields.includes(id)) {
      let on = false;
      try { on = !!g.when(data); } catch { on = false; }
      return { visible: on, tier: "conditional" };
    }
  }
  return { visible: true, tier: "deep" };
}

// Core completion for a set of section objects (region modules only).
export function coreProgress(sectionList, data = {}) {
  let total = 0, filled = 0;
  sectionList.forEach((s) => {
    (s.fields || []).forEach((f) => {
      const p = prefixOf(f.id);
      if (!SUBJ_TIER[p]) return;              // skip universal sections
      if (!SUBJ_TIER[p].core.includes(f.id)) return;
      total += 1;
      const v = data[f.id];
      if (Array.isArray(v) ? v.length : (v != null && v !== "")) filled += 1;
    });
  });
  return { total, filled };
}

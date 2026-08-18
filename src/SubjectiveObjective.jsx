// SubjectiveObjective.jsx — Special Tests, Subjective, CPA, KineticChain, FMS, Fascia, Ergo
import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from "react";
import { r1, r2, mid, vis, px, MIN_VIS, calcAngleDeg, C, getC, RegionPickerButton, RegionChips, applyPersistentHighlight } from "./utils.jsx";
import { SPECIAL_TESTS_DATA, CYRIAX_REGIONS_DATA, UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S, needsBPS_S, resolveRegMod, needsSleep_S, needsSport_S, needsHypermobility_S, NKT_REGIONS, KC_REGIONS, downloadPDFFromHTML, PDF_BASE_STYLES, makePDFPage, classifyField, coreProgress } from "./sharedClinicalData.js";
import { ErgoModule } from "./ErgoModule.jsx";
import { generateDiagnosis } from "./generateDiagnosis.jsx";
import { FMASection, FasciaSection, NKTSection, CyriaxRegionTests } from "./FasciaNKT.jsx";
import { FunctionalScreenHub } from "./RegionalFunctionalScreens.jsx";
import { KineticChainSection, MOVEMENTS } from "./KineticChainFMS.jsx";
import { mapParseResultToUpdates } from "./aiIntakeParser.js";
import { authHeader } from "./supabase.js";
import { extractLumbarVariablesStructured, mergeLumbarVariables } from "./lumbarVariableExtractor.js";
import { runLumbarReasoningEngine } from "./lumbarReasoningEngine.js";
import { extractCervicalVariablesStructured, mergeCervicalVariables } from "./cervicalVariableExtractor.js";
import { runCervicalReasoningEngine } from "./cervicalReasoningEngine.js";
import { extractThoracicVariablesStructured, mergeThoracicVariables } from "./thoracicVariableExtractor.js";
import { runThoracicReasoningEngine } from "./thoracicReasoningEngine.js";
import { runShoulderPhase05, shoulderTestNav } from "./shoulderPhase05.js";
import { spineAssessmentModules } from "./spineLayeredAssessment.js";
import { runGenericPhase05 } from "./genericPhase05.js";
import { genericTestNav } from "./genericTestNav.js";
import { LAYER_ICON, LAYER_TEACH } from "./layerTeaching.js";
import { Chips } from "./ProbableDiagnosis.jsx";

// Map a condition's authored fascia description to the specific Fascia-module
// test cards to open, so tapping the "Fascia" suggestion deep-links straight to
// the relevant line (e.g. deep-front-arm line) instead of the section top.
function fasciaHighlightsFromDetail(detail = "") {
  const d = String(detail).toLowerCase();
  const ids = [];
  if (/deep.?front|dfl|arm.?line|biceps|pec|coracoid|anterior/.test(d)) ids.push("fa_passive_tension", "fa_densification");
  if (/sbl|back.?line|hamstring|posterior/.test(d)) ids.push("fa_sbl_hamstring");
  if (/spiral/.test(d)) ids.push("fa_spiral_rot");
  if (/lateral/.test(d)) ids.push("fa_ll_test");
  if (/thoracolumbar|tlf/.test(d)) ids.push("fa_tlf");
  if (!ids.length) ids.push("fa_skin_roll", "fa_passive_tension", "fa_densification");
  return [...new Set(ids)];
}
// Build the NavActionBtn descriptor for an authored assessment-layer module,
// attaching a specific ctx where the target module supports deep-linking.
// ── CPA (NKT) + Kinetic-chain deep-link mapping ──
// Which NKT module region each patient region family maps to.
const NKT_REGION_FOR = {
  "Cervical spine": "cervical", "Thoracic spine": "shoulder", "Lumbar / SI": "core",
  "Shoulder (L)": "shoulder", "Shoulder (R)": "shoulder", "Hip / Groin": "hip",
  "Knee (L)": "knee", "Knee (R)": "knee", "Ankle / Foot": "ankle", "Elbow/Wrist/Hand": "upper_limb",
};
// NKT muscle-card id -> which module region it lives under (so we only highlight
// cards that actually exist in the region we open).
const NKT_ID_REGION = {
  nkt_dnf:"cervical", nkt_scm:"cervical", nkt_suboccip:"cervical", nkt_upper_trap:"cervical", nkt_scalenes:"cervical", nkt_levator_scap:"cervical", nkt_splenius:"cervical", nkt_semispinalis:"cervical",
  nkt_lower_trap:"shoulder", nkt_serratus:"shoulder", nkt_infraspinatus:"shoulder", nkt_subscapularis:"shoulder", nkt_mid_trap:"shoulder", nkt_pec_minor:"shoulder", nkt_ant_deltoid:"shoulder", nkt_post_deltoid:"shoulder", nkt_teres_major:"shoulder",
  nkt_ta:"core", nkt_multifidus:"core", nkt_diaphragm:"core", nkt_ql:"core", nkt_psoas:"core", nkt_erector_spinae:"core", nkt_obliques:"core", nkt_pelvic_floor:"core",
  nkt_gmax:"hip", nkt_gmed:"hip", nkt_piriformis:"hip", nkt_hip_flex_fo:"hip",
  nkt_vmo:"knee", nkt_hamstrings:"knee", nkt_adductors:"knee", nkt_tfl:"knee", nkt_rectus_fem:"knee", nkt_popliteus:"knee",
  nkt_tib_ant:"ankle", nkt_tib_post:"ankle", nkt_gastroc:"ankle", nkt_peroneals:"ankle", nkt_fhl:"ankle", nkt_foot_intrinsics:"ankle",
  nkt_biceps:"upper_limb", nkt_triceps:"upper_limb", nkt_wrist_ext:"upper_limb", nkt_wrist_flex:"upper_limb", nkt_pronator:"upper_limb", nkt_grip:"upper_limb",
};
// Keyword -> NKT card id (matched against the authored CPA detail text).
const NKT_KEYWORDS = [
  ["deep neck flex","nkt_dnf"],["deep-neck-flex","nkt_dnf"],["dnf","nkt_dnf"],["sternocleido","nkt_scm"],["scm","nkt_scm"],["suboccip","nkt_suboccip"],["upper trap","nkt_upper_trap"],["scalene","nkt_scalenes"],["levator","nkt_levator_scap"],["splenius","nkt_splenius"],["semispinalis","nkt_semispinalis"],
  ["lower trap","nkt_lower_trap"],["serratus","nkt_serratus"],["infraspinatus","nkt_infraspinatus"],["subscap","nkt_subscapularis"],["mid trap","nkt_mid_trap"],["rhomboid","nkt_mid_trap"],["pec minor","nkt_pec_minor"],["pectoral","nkt_pec_minor"],["pec ","nkt_pec_minor"],
  ["transversus","nkt_ta"],["deep-core","nkt_ta"],["deep core","nkt_ta"],[" ta ","nkt_ta"],["multifidus","nkt_multifidus"],["diaphragm","nkt_diaphragm"],["quadratus","nkt_ql"],[" ql","nkt_ql"],["psoas","nkt_psoas"],["iliopsoas","nkt_psoas"],["erector","nkt_erector_spinae"],["oblique","nkt_obliques"],["pelvic floor","nkt_pelvic_floor"],
  ["gluteus maximus","nkt_gmax"],["glute max","nkt_gmax"],["gmax","nkt_gmax"],["gluteus medius","nkt_gmed"],["glute med","nkt_gmed"],["gmed","nkt_gmed"],["piriformis","nkt_piriformis"],
  ["vmo","nkt_vmo"],["vastus","nkt_vmo"],["hamstring","nkt_hamstrings"],["adductor","nkt_adductors"],["tfl","nkt_tfl"],["tensor fasc","nkt_tfl"],["rectus fem","nkt_rectus_fem"],["popliteus","nkt_popliteus"],
  ["tibialis anterior","nkt_tib_ant"],["tib ant","nkt_tib_ant"],["tibialis posterior","nkt_tib_post"],["tib post","nkt_tib_post"],["gastroc","nkt_gastroc"],["soleus","nkt_gastroc"],["calf","nkt_gastroc"],["peroneal","nkt_peroneals"],["foot intrins","nkt_foot_intrinsics"],
];
function nktCtxFromDetail(detail, family) {
  const region = NKT_REGION_FOR[family];
  if (!region) return null;
  const d = " " + String(detail || "").toLowerCase() + " ";
  const ids = [];
  for (const [kw, id] of NKT_KEYWORDS) if (d.includes(kw) && NKT_ID_REGION[id] === region && !ids.includes(id)) ids.push(id);
  return ids.length ? { nktRegion: region, nktHighlights: ids } : { nktRegion: region };
}
// Kinetic-chain module region for each patient region family (the detail spans
// several regions, so we deterministically open the patient's own region).
const KC_REGION_FOR = {
  "Cervical spine": "cervical", "Thoracic spine": "thoracic", "Lumbar / SI": "lumbar",
  "Shoulder (L)": "scapula", "Shoulder (R)": "scapula", "Hip / Groin": "hip",
  "Knee (L)": "knee", "Knee (R)": "knee", "Ankle / Foot": "foot_ankle",
};
function kcHighlightsFromDetail(detail = "") {
  const d = String(detail).toLowerCase();
  const ids = [];
  if (/hip/.test(d)) {
    if (/ext/.test(d)) ids.push("kc_hip_ext_mob");
    if (/rotat|\bir\b|\ber\b|internal|external/.test(d)) ids.push("kc_hip_er_mob", "kc_hip_ir_mob");
    if (/abduct|glut|med/.test(d)) ids.push("kc_hip_abd_mob");
    if (!ids.length) ids.push("kc_hip_ext_mob", "kc_hip_er_mob");
  }
  if (/thoracic/.test(d)) ids.push("kc_thoracic_rotation", "kc_thoracic_extension");
  if (/rib/.test(d)) ids.push("kc_rib_mobility");
  if (/ankle|dorsiflex|\bdf\b/.test(d)) ids.push("kc_ankle_df");
  if (/subtalar|pronat|foot/.test(d)) ids.push("kc_subtalar");
  if (/lumbar|core|stability|control/.test(d)) ids.push("kc_lumbar_stability");
  if (/knee/.test(d)) ids.push("kc_knee_stability");
  if (/scapul|shoulder|rhythm/.test(d)) ids.push("kc_scapulohumeral_rhythm");
  return [...new Set(ids)];
}
function kcCtxFromDetail(detail, family) {
  const region = KC_REGION_FOR[family];
  if (!region) return null;
  const kcHighlights = kcHighlightsFromDetail(detail);
  return kcHighlights.length ? { kcRegion: region, kcHighlights } : { kcRegion: region };
}

// Family -> FunctionalScreenHub (Functional Movement Screen) region id.
// Without this, every region's "Functional (FMA)" layer card opened
// FunctionalScreenHub with ctx:null, and FunctionalScreenHub defaults to
// "lumbar" whenever navContext.fsRegion is missing (RegionalFunctionalScreens.jsx
// ~line 4222) -- same wrong-default-region bug class as Special Tests/ROM had.
// "Elbow/Wrist/Hand" -> "wrist": FunctionalScreenHub has no combined elbow+
// wrist+hand region, only separate "elbow" and "wrist" (labelled "Wrist/Hand")
// -- "wrist" is the closer match of the two, not a guess at a 1:1 test.
const FS_REGION_FOR = {
  "Cervical spine": "cervical", "Thoracic spine": "thoracic", "Lumbar / SI": "lumbar",
  "Shoulder (L)": "shoulder", "Shoulder (R)": "shoulder", "Hip / Groin": "hip",
  "Knee (L)": "knee", "Knee (R)": "knee", "Ankle / Foot": "ankle", "Elbow/Wrist/Hand": "wrist",
};

function layerNavBtn(m, onNav, family) {
  let ctx = null;
  if (m.key === "fascia") ctx = { fasciaHighlights: fasciaHighlightsFromDetail(m.detail) };
  else if (m.key === "nkt") ctx = nktCtxFromDetail(m.detail, family);
  else if (m.key === "kinetic") ctx = kcCtxFromDetail(m.detail, family);
  else if (m.key === "fma") ctx = FS_REGION_FOR[family] ? { fsRegion: FS_REGION_FOR[family] } : null;
  // why = generic teaching only (shown under "?"); detail = the patient-specific
  // line, shown directly in the block below the label.
  return { label: m.label, icon: LAYER_ICON[m.key] || "\u2022", col: "#0891b2", nav: (onNav && m.key) ? m.key : null, ctx, why: LAYER_TEACH[m.key] || "", detail: m.detail };
}
// The specific special tests for a condition are already rendered as their own
// buttons above the layer row, so the generic "Special tests"/"STTT" layer
// buttons are redundant -- drop them.
const REDUNDANT_LAYER_KEYS = new Set(["special", "cyriax_full"]);

// Suggested outcome measures should be individual clickable buttons (like the
// special tests), deep-linking straight into the questionnaire when the app
// implements it. Map a measure name to its in-app scale id.
const OUTCOME_SCALE_IDS = {
  spadi: "spadi", dash: "dash", quickdash: "dash", "quick dash": "dash",
  ndi: "ndi", odi: "odi", oswestry: "odi", lefs: "lefs", psfs: "psfs",
  "koos-jr": "koosjr", koosjr: "koosjr", "hoos-jr": "hoosjr", hoosjr: "hoosjr",
  faam: "faam", "tsk": "tsk", fabq: "fabqpa", pcs: "pcs", rmdq: "rmdq", roland: "rmdq",
  // "oxford" alone used to catch ANY "Oxford ___ Score" and send it to "oks"
  // (Oxford KNEE Score) -- the app only has the knee version implemented, so
  // hip's "Oxford Hip Score", shoulder's "Oxford Shoulder Score", and foot's
  // "Manchester-Oxford Foot Questionnaire (MOXFQ)" were all being silently
  // routed to the wrong questionnaire (Oxford Knee) instead of correctly
  // falling back to "no in-app questionnaire yet". Only match the specific,
  // actually-implemented one.
  womac: "womac", "oxford knee": "oks",
  "visa-a": "visaa", visaa: "visaa", "visa-p": "visap", "visa-pf": "visap", visap: "visap",
  constant: "constant", ases: "ases", lysholm: "lysholm", ikdc: "ikdc", prtee: "prtee",
  quebec: "qbpds", "start back": "startback", nprs: "nprs",
  // Added 2026-08-06 once oxfordhip/hoos/hagos/ihot33 existed as real
  // scales (sharedClinicalData.js) -- previously these fell through to
  // "no in-app questionnaire yet" even though hip.evidence.json recommends
  // them for several conditions. Placed after "hoos-jr"/hoosjr above so a
  // "HOOS-JR" name still matches that specific key first (object key order
  // is checked in insertion order in outcomeScaleId's loop) -- only plain
  // "HOOS" (no "-jr") falls through to this bare "hoos" key.
  "oxford hip": "oxfordhip", hoos: "hoos", hagos: "hagos", "ihot-33": "ihot33",
};
function outcomeScaleId(name = "") {
  const n = String(name).toLowerCase();
  for (const key of Object.keys(OUTCOME_SCALE_IDS)) if (n.includes(key)) return OUTCOME_SCALE_IDS[key];
  return null;
}
function splitOutcomeMeasures(detail = "") {
  return String(detail).split(/\s*[;,]\s*|\s+or\s+/i).map((x) => x.trim()).filter((x) => x.length > 1);
}
function layerNavButtons(m, mi, onNav, PC, family) {
  if (m.key === "outcome") {
    const teachBase = LAYER_TEACH[m.key] || "";
    const measures = splitOutcomeMeasures(m.detail);
    if (measures.length) {
      return measures.map((name, i) => {
        const sid = outcomeScaleId(name);
        const btn = sid
          ? { label: name, icon: "\uD83D\uDCC8", col: "#0891b2", nav: onNav ? "outcome" : null, ctx: { scaleId: sid }, why: teachBase }
          : { label: name, icon: "\uD83D\uDCC8", col: PC.muted, nav: null, ctx: null, why: "No in-app questionnaire for this measure yet -- score it externally.\n\n" + teachBase };
        return <NavActionBtn key={"lay" + mi + "om" + i} btn={btn} onNav={onNav} PC={PC} />;
      });
    }
  }
  return [<NavActionBtn key={"lay" + mi} btn={layerNavBtn(m, onNav, family)} onNav={onNav} PC={PC} alwaysShowWhy />];
}

// ── Redesigned genericPhase05 condition card (2026-08-06) ─────────────────
// Replaces the old two-section layout (a "priority tests" box, then a
// separate "assess by layer" set of cards) with one flat, ordered "next best
// actions" list -- both were just "go check this" actions to a clinician,
// split into two systems for no functional reason. Also collapses the
// supporting/against/not-tested finding chips behind a tap (they could run
// to 7+ items) and replaces the redundant "matchTier text + score%" pair
// with a single compact strength bar.
const LAYER_TAG_COLOR = {
  observation: "#6B7280", posture: "#D97706", fma: "#059669",
  rom: "#9333ea", fascia: "#DB2777", outcome: "#0891b2",
};

function ActionRow({ a, onNav, PC }) {
  const [showWhy, setShowWhy] = useState(false);
  const clickable = !!a.nav;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
        background: clickable ? `${a.col}0d` : PC.s3, border:`1px solid ${clickable ? a.col+"30" : PC.border}`,
        borderRadius:8 }}>
        <span style={{ fontSize:"0.95rem", flexShrink:0 }}>{a.icon}</span>
        <span
          onClick={clickable ? () => onNav(a.nav, a.ctx || {}) : undefined}
          style={{ flex:1, fontSize:"0.72rem", fontWeight:700, color: clickable ? PC.text : PC.muted, cursor: clickable ? "pointer" : "default" }}>
          {a.label}
        </span>
        {a.tag && (
          <span style={{ fontSize:"0.6rem", fontWeight:700, color:a.col, background:`${a.col}14`, padding:"2px 6px", borderRadius:99, whiteSpace:"nowrap" }}>
            {a.tag}
          </span>
        )}
        <button type="button" onClick={() => setShowWhy((w) => !w)}
          style={{ padding:"2px 6px", background:"transparent", border:"none", color:PC.muted, cursor:"pointer", fontSize:"0.7rem", fontWeight:800 }}>
          ?
        </button>
      </div>
      {showWhy && a.why && (
        <div style={{ fontSize:"0.72rem", color:PC.muted, padding:"5px 8px", lineHeight:1.5, whiteSpace:"pre-line" }}>{a.why}</div>
      )}
    </div>
  );
}

function GenericConditionCard({ c, ci, regCol, tierColor, onNav, PC, family }) {
  const [expanded, setExpanded] = useState(false);

  const testFirst = new Set(c.keyExams.map((t) => String(t).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]).filter(Boolean));
  const layers = c.assessmentModules.filter((m) => !REDUNDANT_LAYER_KEYS.has(m.key) && !testFirst.has(String(m.label).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]));

  const actions = [];
  c.keyExams.forEach((t) => {
    const target = genericTestNav(c.engineRegion, t);
    if (target) {
      const KIND_STYLE = { rom: ["#9333ea", "ROM"], mmt: ["#f97316", "MMT"], palpation: ["#78716c", "Palpation"], special: ["#0891b2", "Special test"] };
      const [kindCol, kindTag] = KIND_STYLE[target.kind] || KIND_STYLE.special;
      actions.push({
        key: "ke" + t, icon: target.icon, label: t,
        col: kindCol, tag: kindTag,
        nav: onNav ? target.nav : null, ctx: target.ctx, why: target.why,
      });
    } else {
      actions.push({ key:"ke"+t, icon:"📋", label:t, col:PC.muted, tag:null, nav:null, ctx:null,
        why:"No dedicated module for this test in the app yet -- shown for completeness, not clickable." });
    }
  });
  layers.forEach((m, mi) => {
    if (m.key === "outcome") {
      const teachBase = LAYER_TEACH[m.key] || "";
      splitOutcomeMeasures(m.detail).forEach((name, i) => {
        const sid = outcomeScaleId(name);
        actions.push(sid
          ? { key:"om"+mi+i, icon:"📈", label:name, col:LAYER_TAG_COLOR.outcome, tag:"Outcome measure", nav:onNav?"outcome":null, ctx:{scaleId:sid}, why:teachBase }
          : { key:"om"+mi+i, icon:"📈", label:name, col:PC.muted, tag:"Outcome measure", nav:null, ctx:null, why:"No in-app questionnaire for this measure yet -- score it externally.\n\n"+teachBase });
      });
    } else {
      const btn = layerNavBtn(m, onNav, family);
      actions.push({ key:"lay"+mi, icon:btn.icon, label: btn.detail || btn.label, col: LAYER_TAG_COLOR[m.key] || "#0891b2", tag: btn.label, nav: btn.nav, ctx: btn.ctx, why: btn.why });
    }
  });

  const scoreSegs = Math.max(0, Math.min(5, Math.round((c.score || 0) / 20)));
  const tierDotColor = tierColor[c.matchTier] || "#6B7280";

  return (
    <div style={{ background: ci===0 ? regCol+"12" : PC.surface, border:`1px solid ${ci===0 ? regCol+"44" : PC.border}`, borderRadius:10, padding:"10px 12px", marginBottom:7 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:"0.8rem", fontWeight:700, color:PC.text }}>{c.name}</span>
        <span style={{ fontSize:"0.7rem", color:PC.muted }}>{c.score}% · {String(c.matchTier).toLowerCase()}</span>
      </div>
      <div style={{ display:"flex", gap:3, marginBottom:8 }}>
        {[0,1,2,3,4].map((i) => (
          <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i < scoreSegs ? tierDotColor : PC.border }} />
        ))}
      </div>

      <button type="button" onClick={() => setExpanded((e) => !e)}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:12, fontSize:"0.68rem", padding:"4px 0", background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
        <span style={{ color:"#059669" }}>✓ {c.supporting.length} supports</span>
        <span style={{ color:PC.muted }}>✕ {c.refuting.length} against</span>
        <span style={{ color:PC.muted }}>○ {c.unknownCount} not yet tested</span>
        <span style={{ marginLeft:"auto", color:PC.muted }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={{ padding:"2px 0 6px", borderTop:`1px solid ${PC.border}`, marginTop:2 }}>
          <Chips label="Supports" items={c.supporting} color="#059669" />
          <Chips label="Against" items={c.refuting} color="#DC2626" />
          <Chips label="Not yet tested" items={c.missing} color="#6B7280" />
          {c.evidenceConfidence != null && <div style={{ fontSize:"0.7rem", color:PC.muted, marginTop:4 }}>Evidence confidence: <b>{c.evidenceConfidence}%</b></div>}
          {c.note && <div style={{ fontSize:"0.7rem", color:PC.muted, marginTop:4, fontStyle:"italic" }}>{c.note}</div>}
          {c.whyConfidenceReduced && c.whyConfidenceReduced.length > 0 && (
            <div style={{ fontSize:"0.7rem", color:"#92400E", marginTop:4 }}>⚠ {c.whyConfidenceReduced.join(" ")}</div>
          )}
        </div>
      )}

      {actions.length > 0 && (
        <div style={{ marginTop:8 }}>
          <div style={{ fontSize:"0.62rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:PC.muted, marginBottom:6 }}>
            Next best actions, in order
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {actions.map((a) => <ActionRow key={a.key} a={a} onNav={onNav} PC={PC} />)}
          </div>
        </div>
      )}
    </div>
  );
}

const TEST_SVG = {
  // ─── SHOULDER ───────────────────────────────────────────────────────────
  neer: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <rect x="45" y="0" width="20" height="50" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="55" cy="55" rx="18" ry="18" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="38" y="68" width="14" height="55" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <path d="M55,55 L30,30" stroke="#ff4d6d" strokeWidth="2" strokeDasharray="4,2"/>
      <text x="5" y="28" fontSize="9" fill="#ff4d6d">Force</text>
      <path d="M45,15 Q20,20 15,40" stroke="#00e5ff" strokeWidth="1.5" fill="none" markerEnd="url(#arr)"/>
      <text x="5" y="115" fontSize="8" fill="#94a3b8">IR + Flex</text>
      <text x="5" y="125" fontSize="8" fill="#94a3b8">to end range</text>
      <circle cx="55" cy="55" r="4" fill="#ff4d6d"/>
    </svg>
  ),
  hawkins: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <rect x="45" y="0" width="20" height="45" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="55" cy="50" rx="18" ry="18" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="25" y="52" width="55" height="12" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <rect x="18" y="60" width="12" height="50" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <path d="M80,58 Q90,58 90,68 Q90,78 80,78" stroke="#ff4d6d" strokeWidth="2" fill="none"/>
      <text x="5" y="130" fontSize="8" fill="#94a3b8">90° flex → IR</text>
      <circle cx="55" cy="50" r="4" fill="#ff4d6d"/>
    </svg>
  ),
  empty_can: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <rect x="45" y="0" width="18" height="42" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="54" cy="47" rx="17" ry="17" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="22" y="46" width="60" height="11" rx="5" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(-30,54,47)"/>
      <rect x="15" y="63" width="11" height="50" rx="5" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(-30,54,47)"/>
      <path d="M70,35 L85,28" stroke="#ff4d6d" strokeWidth="2.5" markerEnd="url(#arr)"/>
      <text x="5" y="125" fontSize="8" fill="#94a3b8">Scap plane 30°</text>
      <text x="5" y="135" fontSize="8" fill="#94a3b8">IR (thumb down)</text>
    </svg>
  ),
  lachman: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="10" y="20" width="50" height="22" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <rect x="70" y="20" width="55" height="22" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <ellipse cx="65" cy="31" rx="14" ry="14" fill="#FFFFFF" stroke="#b45309" strokeWidth="1.5"/>
      <path d="M58,25 L72,38" stroke="#ff4d6d" strokeWidth="1.5"/>
      <path d="M90,65 L90,55" stroke="#00e5ff" strokeWidth="3" markerEnd="url(#arr)"/>
      <text x="92" y="62" fontSize="9" fill="#00e5ff">Ant</text>
      <path d="M30,65 L30,55" stroke="#ffb300" strokeWidth="3"/>
      <text x="10" y="62" fontSize="9" fill="#ffb300">Fix</text>
      <text x="20" y="115" fontSize="8" fill="#94a3b8">20-30° flex. Ant</text>
      <text x="20" y="125" fontSize="8" fill="#94a3b8">tibial translation</text>
      <rect x="20" y="75" width="100" height="18" rx="6" fill="#192435" stroke="#1a2d45"/>
      <text x="35" y="87" fontSize="8" fill="#94a3b8">Tibia</text>
      <rect x="20" y="95" width="100" height="18" rx="6" fill="#192435" stroke="#1a2d45"/>
      <text x="35" y="107" fontSize="8" fill="#94a3b8">Femur stabilised</text>
    </svg>
  ),
  slr: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="5" y="55" width="130" height="20" rx="6" fill="#FFFFFF" stroke="#E0E0E2"/>
      <ellipse cx="20" cy="62" rx="14" ry="10" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="28" y="48" width="18" height="55" rx="7" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5" transform="rotate(-45,37,62)"/>
      <rect x="28" y="65" width="18" height="55" rx="7" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <path d="M42,22 L42,10" stroke="#ff4d6d" strokeWidth="2" markerEnd="url(#arr)"/>
      <text x="48" y="20" fontSize="9" fill="#ff4d6d">Lift</text>
      <text x="5" y="120" fontSize="8" fill="#94a3b8">Knee extended</text>
      <text x="5" y="130" fontSize="8" fill="#94a3b8">Raise until resistance</text>
    </svg>
  ),
  spurling: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <ellipse cx="60" cy="30" rx="22" ry="25" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="50" y="53" width="20" height="30" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <path d="M30,15 Q25,30 35,45" stroke="#ff4d6d" strokeWidth="1.5" strokeDasharray="3,2" fill="none"/>
      <path d="M60,0 L60,12" stroke="#ff4d6d" strokeWidth="3" markerEnd="url(#arr)"/>
      <text x="65" y="10" fontSize="9" fill="#ff4d6d">↓ Compress</text>
      <path d="M60,25 Q75,25 75,35" stroke="#ffb300" strokeWidth="1.5" fill="none"/>
      <text x="5" y="120" fontSize="8" fill="#94a3b8">Compress + side</text>
      <text x="5" y="130" fontSize="8" fill="#94a3b8">flex + extension</text>
    </svg>
  ),
  mcmurray: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="15" y="5" width="22" height="55" rx="9" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="26" cy="62" rx="16" ry="16" fill="#FFFFFF" stroke="#b45309" strokeWidth="1.5"/>
      <rect x="14" y="76" width="22" height="50" rx="9" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(50,26,62)"/>
      <path d="M42,62 Q55,50 55,65 Q55,80 42,80" stroke="#ff4d6d" strokeWidth="2" fill="none"/>
      <text x="58" y="65" fontSize="9" fill="#ff4d6d">ER+</text>
      <text x="58" y="75" fontSize="9" fill="#ff4d6d">Valgus</text>
      <text x="5" y="120" fontSize="8" fill="#94a3b8">Full flex → extend</text>
      <text x="5" y="130" fontSize="8" fill="#94a3b8">ER=medial, IR=lateral</text>
    </svg>
  ),
  thomas_test: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="5" y="60" width="130" height="20" rx="4" fill="#FFFFFF" stroke="#E0E0E2"/>
      <ellipse cx="20" cy="65" rx="14" ry="11" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="28" y="55" width="18" height="22" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5" transform="rotate(-80,37,65)"/>
      <rect x="50" y="55" width="18" height="55" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(20,59,65)"/>
      <path d="M70,52 L82,45" stroke="#ff4d6d" strokeWidth="2"/>
      <text x="84" y="44" fontSize="9" fill="#ff4d6d">+ve</text>
      <text x="5" y="118" fontSize="8" fill="#94a3b8">Both hips flex → lower</text>
      <text x="5" y="128" fontSize="8" fill="#94a3b8">one leg → observe</text>
    </svg>
  ),
  slump: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <ellipse cx="60" cy="20" rx="18" ry="18" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <path d="M60,36 Q40,55 42,90" stroke="#7f5af0" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <rect x="30" y="90" width="60" height="15" rx="5" fill="#FFFFFF" stroke="#E0E0E2"/>
      <rect x="40" y="100" width="15" height="35" rx="6" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <rect x="65" y="100" width="15" height="35" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <path d="M55,130 L55,118" stroke="#ff4d6d" strokeWidth="2"/>
      <text x="32" y="112" fontSize="8" fill="#ff4d6d">Knee ext</text>
      <text x="5" y="8" fontSize="8" fill="#94a3b8">Slump → neck flex</text>
      <text x="5" y="18" fontSize="8" fill="#94a3b8">→ knee extend → DF</text>
    </svg>
  ),
  trendelenburg: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <ellipse cx="55" cy="18" rx="18" ry="18" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="40" y="34" width="28" height="35" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5"/>
      <rect x="25" y="65" width="22" height="45" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <rect x="65" y="75" width="22" height="35" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(15,76,85)"/>
      <path d="M15,68 L95,78" stroke="#ff4d6d" strokeWidth="2" strokeDasharray="4,2"/>
      <text x="5" y="90" fontSize="9" fill="#ff4d6d">↘ Pelvis drops</text>
      <text x="5" y="128" fontSize="8" fill="#94a3b8">Single leg stance</text>
      <text x="5" y="138" fontSize="8" fill="#94a3b8">Watch pelvis level</text>
    </svg>
  ),
  apprehension: (
    <svg viewBox="0 0 120 140" width="100%" height="100">
      <rect x="42" y="0" width="22" height="45" rx="9" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="53" cy="50" rx="18" ry="18" fill="#FFFFFF" stroke="#b45309" strokeWidth="1.5"/>
      <rect x="30" y="52" width="55" height="13" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(-35,53,50)"/>
      <rect x="18" y="65" width="13" height="50" rx="6" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(-35,53,50)"/>
      <path d="M45,42 L28,30" stroke="#ff4d6d" strokeWidth="2.5" markerEnd="url(#arr)"/>
      <text x="5" y="28" fontSize="8" fill="#ff4d6d">Ant pressure</text>
      <text x="5" y="128" fontSize="8" fill="#94a3b8">90° abd + ER</text>
      <text x="5" y="138" fontSize="8" fill="#94a3b8">Watch for fear</text>
    </svg>
  ),
  phalen: (
    <svg viewBox="0 0 140 120" width="100%" height="100">
      <rect x="10" y="30" width="50" height="18" rx="7" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <rect x="55" y="18" width="18" height="50" rx="7" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(90,64,40)"/>
      <rect x="72" y="30" width="50" height="18" rx="7" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5" transform="rotate(180,97,39)"/>
      <path d="M60,55 Q70,70 80,55" stroke="#ff4d6d" strokeWidth="2" fill="none"/>
      <text x="30" y="90" fontSize="9" fill="#94a3b8">Both wrists fully</text>
      <text x="30" y="102" fontSize="9" fill="#94a3b8">flexed 60 seconds</text>
      <text x="30" y="114" fontSize="8" fill="#ff4d6d">+ve = tingling thumb/index</text>
    </svg>
  ),
  thompson: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="5" y="5" width="130" height="20" rx="5" fill="#FFFFFF" stroke="#E0E0E2"/>
      <rect x="45" y="22" width="50" height="70" rx="12" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="70" cy="92" rx="22" ry="10" fill="#FFFFFF" stroke="#9333ea" strokeWidth="1.5"/>
      <path d="M35,55 Q40,55 40,65 Q40,70 35,70" stroke="#ff4d6d" strokeWidth="2.5" fill="none"/>
      <text x="5" y="65" fontSize="9" fill="#ff4d6d">Squeeze</text>
      <path d="M100,92 Q115,92 115,105" stroke="#00e5ff" strokeWidth="2" fill="none" strokeDasharray="3,2"/>
      <text x="90" y="118" fontSize="8" fill="#00e5ff">No PF</text>
      <text x="5" y="125" fontSize="8" fill="#94a3b8">Squeeze calf — no PF = rupture</text>
    </svg>
  ),
  windlass: (
    <svg viewBox="0 0 140 120" width="100%" height="100">
      <rect x="10" y="55" width="120" height="18" rx="5" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5"/>
      <ellipse cx="20" cy="63" rx="14" ry="9" fill="#FFFFFF" stroke="#9333ea" strokeWidth="1.5"/>
      <rect x="28" y="55" width="70" height="12" rx="4" fill="#192435" stroke="#ffb300" strokeWidth="1"/>
      <path d="M95,55 Q105,45 110,35" stroke="#ff4d6d" strokeWidth="2.5" fill="none"/>
      <circle cx="110" cy="32" r="8" fill="#FFFFFF" stroke="#dc2626" strokeWidth="1.5"/>
      <text x="5" y="102" fontSize="8" fill="#94a3b8">Great toe extension</text>
      <text x="5" y="112" fontSize="8" fill="#ff4d6d">+ve = plantar fascia pain</text>
    </svg>
  ),
  ober: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="5" y="55" width="130" height="20" rx="5" fill="#FFFFFF" stroke="#E0E0E2"/>
      <ellipse cx="22" cy="62" rx="16" ry="12" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="32" y="48" width="20" height="60" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(20,42,62)"/>
      <rect x="52" y="48" width="20" height="60" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5" transform="rotate(-10,62,62)"/>
      <path d="M62,30 L62,18" stroke="#ff4d6d" strokeWidth="2" markerEnd="url(#arr)"/>
      <text x="66" y="25" fontSize="9" fill="#ff4d6d">Adduct</text>
      <path d="M62,30 Q80,30 80,50" stroke="#ffb300" strokeWidth="1.5" strokeDasharray="3,2" fill="none"/>
      <text x="5" y="125" fontSize="8" fill="#94a3b8">Sidelying: abduct then adduct</text>
      <text x="5" y="135" fontSize="8" fill="#ff4d6d">+ve = leg stays elevated</text>
    </svg>
  ),
  fadir: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="5" y="60" width="130" height="20" rx="6" fill="#FFFFFF" stroke="#E0E0E2"/>
      <ellipse cx="20" cy="67" rx="14" ry="11" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="28" y="42" width="20" height="55" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(-50,38,67)"/>
      <rect x="15" y="58" width="20" height="45" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5" transform="rotate(-80,25,67)"/>
      <text x="65" y="45" fontSize="8" fill="#ff4d6d">Flex+Add+IR</text>
      <path d="M55,50 L65,40" stroke="#ff4d6d" strokeWidth="2"/>
      <text x="5" y="120" fontSize="8" fill="#94a3b8">Hip: 90° flex → adduct → IR</text>
      <text x="5" y="130" fontSize="8" fill="#ff4d6d">+ve = groin pain (FAI/labrum)</text>
    </svg>
  ),
  faber: (
    <svg viewBox="0 0 140 130" width="100%" height="100">
      <rect x="5" y="60" width="130" height="20" rx="6" fill="#FFFFFF" stroke="#E0E0E2"/>
      <ellipse cx="20" cy="67" rx="14" ry="11" fill="#FFFFFF" stroke="#7c3aed" strokeWidth="1.5"/>
      <rect x="28" y="50" width="18" height="50" rx="8" fill="#1a2d45" stroke="#7f5af0" strokeWidth="1.5" transform="rotate(-45,37,67)"/>
      <rect x="18" y="65" width="18" height="45" rx="8" fill="#1a2d45" stroke="#00e5ff" strokeWidth="1.5" transform="rotate(-80,27,67)"/>
      <path d="M30,40 Q50,35 60,45" stroke="#ffb300" strokeWidth="1.5" fill="none"/>
      <text x="60" y="42" fontSize="9" fill="#ffb300">Fig-4</text>
      <text x="5" y="120" fontSize="8" fill="#94a3b8">Figure-4: foot on opp knee</text>
      <text x="5" y="130" fontSize="8" fill="#ff4d6d">+ve = SI or hip pain</text>
    </svg>
  ),
};

// ─── COMPLETE SPECIAL TESTS DATABASE 100+ ────────────────────────────────────
const CLOUDINARY_BASE_SO = "https://res.cloudinary.com/dr15y1pwj/image/upload";

function ImageModal_SO({ src, title, onClose }) {
  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:"95vw",maxHeight:"93vh",position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{color:"#fff",fontWeight:700,fontSize:"0.88rem"}}>{title}</span>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:6,color:"#fff",fontWeight:800,cursor:"pointer",padding:"4px 14px",fontSize:"0.75rem",marginLeft:12}}>✕ Close</button>
        </div>
        <img src={src} alt={title}
          style={{maxWidth:"90vw",maxHeight:"84vh",objectFit:"contain",borderRadius:10,display:"block"}}/>
      </div>
    </div>
  );
}

// ClinicalImageCard — shows Cloudinary image with tap-to-expand, hides silently if not uploaded yet
function ClinicalImageCard({ id, title, fallbackSvg, C, color }) {
  const [exists, setExists] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const thumb = `${CLOUDINARY_BASE_SO}/f_auto,q_auto,w_110,h_90,c_fill/${id}`;
  const full  = `${CLOUDINARY_BASE_SO}/f_auto,q_auto/${id}`;
  return (
    <div style={{background:C.s2,borderRadius:8,padding:8,border:`1px solid ${C.border}`,width:124,flexShrink:0,textAlign:"center"}}>
      {exists ? (
        <>
          <img src={thumb} alt={title}
            onError={()=>setExists(false)}
            onClick={()=>setOpen(true)}
            style={{width:108,height:84,objectFit:"cover",borderRadius:6,cursor:"pointer",display:"block",border:"1px solid rgba(124,58,237,0.2)"}}
          />
          {open && <ImageModal_SO src={full} title={title} onClose={()=>setOpen(false)}/>}
          <div style={{fontSize:"0.78rem",color:C.muted,marginTop:3}}>📸 Tap to enlarge</div>
        </>
      ) : (
        <>
          {fallbackSvg || (
            <svg viewBox="0 0 120 100" width="108" height="84">
              <text x="50%" y="40%" textAnchor="middle" fontSize="22" fill={color||"#7c3aed"}>⚕</text>
              <text x="50%" y="65%" textAnchor="middle" fontSize="9" fill={C?.muted||"#6B6B6B"}>{(title||"").split(" ")[0]}</text>
            </svg>
          )}
          <div style={{fontSize:"0.78rem",color:C.muted,marginTop:3}}>Illustration</div>
        </>
      )}
    </div>
  );
}

// TestInfoThumb — the "i" info button beside each test name; shows the
// uploaded clinical photo as a small thumbnail when one exists for this
// test ID, falling back to a plain info glyph when nothing's been
// uploaded yet. Clicking it opens the same info modal either way.
function TestInfoThumb({ id, color, onClick }) {
  const [imgOk, setImgOk] = React.useState(true);
  const thumb = `${CLOUDINARY_BASE_SO}/f_auto,q_auto,w_64,h_64,c_fill/${id}`;
  const c = color || "#7c5af0";
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: imgOk ? 0 : "3px 9px",
        width: imgOk ? 32 : undefined, height: imgOk ? 32 : undefined,
        background: "rgba(127,90,240,0.15)", border: `1px solid ${c}40`,
        borderRadius: 6, color: c, fontSize: "0.82rem", fontWeight: 700,
        cursor: "pointer", overflow: "hidden", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
      {imgOk ? (
        <img src={thumb} alt="" onError={() => setImgOk(false)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/>
      ) : "ℹ"}
    </button>
  );
}

// SmallClinicalImg — compact inline thumbnail (for tables / rows)
function SmallClinicalImg({ id, title }) {
  const [exists, setExists] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  if (!exists) return null;
  const thumb = `${CLOUDINARY_BASE_SO}/f_auto,q_auto,w_48,h_48,c_fill/${id}`;
  const full  = `${CLOUDINARY_BASE_SO}/f_auto,q_auto/${id}`;
  return (
    <>
      <img src={thumb} alt={title||id}
        onError={()=>setExists(false)}
        onClick={e=>{e.stopPropagation();setOpen(true);}}
        title={`Tap to view: ${title||id}`}
        style={{width:44,height:44,objectFit:"cover",borderRadius:7,cursor:"pointer",border:"2px solid rgba(124,58,237,0.25)",flexShrink:0,display:"block"}}
      />
      {open && <ImageModal_SO src={full} title={title||id} onClose={()=>setOpen(false)}/>}
    </>
  );
}

function SpecialTestsSection({ data, set, navContext={} }) {
  const VALID_ST_REGIONS = Object.keys(SPECIAL_TESTS_DATA);
  const [region, setRegion] = useState(()=>{
    if(navContext.specialRegion && VALID_ST_REGIONS.includes(navContext.specialRegion)) return navContext.specialRegion;
    return "shoulder";
  });
  const [openTest, setOpenTest] = useState(()=>navContext.highlightTest||null);
  const stHlRef = React.useRef({});

  React.useEffect(()=>{
    if(navContext.specialRegion && VALID_ST_REGIONS.includes(navContext.specialRegion)) setRegion(navContext.specialRegion);
    if(navContext.highlightTest) setOpenTest(navContext.highlightTest);
  },[navContext.specialRegion, navContext.highlightTest]);

  // Scroll + highlight target test after region change settles
  React.useEffect(()=>{
    if(navContext.highlightTest && stHlRef.current[navContext.highlightTest]){
      const el = stHlRef.current[navContext.highlightTest];
      setTimeout(()=>{
        el.scrollIntoView({ behavior:"smooth", block:"center" });
        applyPersistentHighlight(el);
      }, 400);
    }
  },[navContext.highlightTest, region]);
  const [modalTest, setModalTest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stSearchOpen, setStSearchOpen] = useState(false);

  const reg = SPECIAL_TESTS_DATA[region];
  const allTests = Object.values(SPECIAL_TESTS_DATA).flatMap(r => r.tests);
  const totalCount = allTests.length;
  const completedCount = allTests.filter(t => {
    const lv = data[t.id+"_left"], rv = data[t.id+"_right"], sv = data[t.id];
    return lv || rv || sv;
  }).length;

  const getTestResult = (testId) => {
    return data[testId+"_left"] || data[testId+"_right"] || data[testId] || "";
  };
  const setTestResult = (testId, side, val) => {
    if (side === "left") set(testId+"_left", val);
    else if (side === "right") set(testId+"_right", val);
    else set(testId, val);
  };

  const isPositive = (val) => val && (val.includes("Positive") || val.includes("positive") || val.includes("+ve") || val.includes("Grade") || val.includes("deficit") || val.includes("REFER") || val.includes("rupture") || val.includes("tear") || val.includes("instability") || val.includes("Severe"));

  const filteredTests = searchTerm
    ? Object.entries(SPECIAL_TESTS_DATA).flatMap(([rKey, r]) => {
        const q = searchTerm.toLowerCase();
        return r.tests.filter(t =>
          (t.label||"").toLowerCase().includes(q) ||
          (t.structure||"").toLowerCase().includes(q) ||
          (t.positive||"").toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q)
        ).map(t => ({ ...t, regionKey: rKey, regionLabel: r.label, regionColor: r.color }));
      })
    : null;

  return (
    <div>
      {/* Header stats */}
      {/* Stats card — desktop only (hidden on mobile) */}
      <div className="pm-section-stats pm-desktop-only" style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontWeight:800, color:C.text }}>🔬 Special Tests Library — {totalCount} Tests</div>
          <span style={{ fontWeight:800, color:C.accent, fontSize:"0.85rem" }}>{completedCount}/{totalCount} completed</span>
        </div>
        <div style={{ height:5, background:C.s3, borderRadius:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${Math.round(completedCount/totalCount*100)}%`, background:`linear-gradient(90deg,${C.accent},${C.a2})`, borderRadius:5, transition:"width 0.3s" }} />
        </div>
      </div>

      {/* Search — desktop: always visible input. Mobile: magnifying glass toggle */}
      <div className="pm-desktop-only" style={{ marginBottom:12 }}>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔍 Search by test name, structure or condition..."
          style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"9px 12px", fontSize:"0.82rem", fontFamily:"inherit", outline:"none" }} />
      </div>
      {/* Mobile search toggle */}
      <div className="pm-mobile-only" style={{ marginBottom: stSearchOpen ? 0 : 6 }}>
        {!stSearchOpen ? (
          <button onClick={()=>setStSearchOpen(true)}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 12px", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontSize:"0.82rem", fontFamily:"inherit", cursor:"pointer", width:"100%", minHeight:36 }}>
            <span style={{fontSize:"1rem"}}>🔍</span>
            <span style={{color:C.muted, fontSize:"0.8rem"}}>Search tests...</span>
          </button>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <span style={{fontSize:"1rem",flexShrink:0}}>🔍</span>
            <input autoFocus type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by test name or condition..."
              style={{ flex:1, background:C.s2, border:`1px solid ${C.accent}60`, borderRadius:8, color:C.text, padding:"6px 10px", fontSize:"0.82rem", fontFamily:"inherit", outline:"none", minHeight:36 }} />
            <button onClick={()=>{ setStSearchOpen(false); setSearchTerm(""); }}
              style={{ flexShrink:0, padding:"4px 10px", background:"none", border:`1px solid ${C.border}`, borderRadius:7, color:C.accent, fontSize:"0.78rem", fontWeight:700, cursor:"pointer", minHeight:34 }}>✕</button>
          </div>
        )}
      </div>

      {/* Region Chips */}
      {!searchTerm && (
        <RegionChips
          regions={Object.entries(SPECIAL_TESTS_DATA).map(([key,r])=>({
            key,
            label: r.label,
            filled: r.tests.filter(t=>getTestResult(t.id)).length,
          }))}
          active={region}
          onSelect={k=>{setRegion(k);setOpenTest(null);}}
        />
      )}

      {/* Render tests */}
      {(() => {
        const testsToRender = filteredTests || reg.tests.map(t => ({ ...t, regionColor: reg.color }));
        return testsToRender.map((t) => {
          const isOpen = openTest === t.id;
          const leftVal = data[t.id+"_left"] || "";
          const rightVal = data[t.id+"_right"] || "";
          const singleVal = data[t.id] || "";
          const anyVal = leftVal || rightVal || singleVal;
          const anyPositive = isPositive(leftVal) || isPositive(rightVal) || isPositive(singleVal);
          const color = t.regionColor || reg?.color || C.accent;
          const svgEl = TEST_SVG[t.id.replace("st_","")];

          return (
            <div key={t.id} ref={el=>{ if(el) stHlRef.current[t.id]=el; }} style={{ background:C.surface, border:`1px solid ${anyPositive ? C.red+"60" : anyVal ? color+"40" : C.border}`, borderRadius:12, marginBottom:9, overflow:"hidden" }}>
              {/* Header row */}
              <div onClick={() => setOpenTest(isOpen ? null : t.id)}
                className="pm-test-card-hdr"
                style={{ padding:"11px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderLeft:`3px solid ${anyPositive ? C.red : anyVal ? color : "#1a2d45"}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:3, flexWrap:"wrap" }}>
                    <span style={{ fontSize:"0.75rem", fontWeight:700, color:color }}>{t.label}</span>
                    {anyPositive && <span style={{ padding:"1px 7px", borderRadius:8, background:"rgba(255,77,109,0.2)", color:C.red, fontSize:"0.75rem", fontWeight:700 }}>⚠ POSITIVE</span>}
                    {anyVal && !anyPositive && <span style={{ padding:"1px 7px", borderRadius:8, background:"rgba(0,201,122,0.15)", color:C.green, fontSize:"0.75rem", fontWeight:700 }}>✓ Recorded</span>}
                  </div>
                  <div className="pm-test-card-sub" style={{ fontSize:"0.8rem", color:C.muted }}>Structure: {t.structure}</div>
                  <div className="pm-test-card-sub" style={{ fontSize:"0.78rem", color:C.muted }}>Sens: {t.sensitivity} · Spec: {t.specificity}</div>
                  {anyVal && (
                    <div style={{ marginTop:4, fontSize:"0.82rem", color:anyPositive ? C.red : C.green, fontWeight:600 }}>
                      {leftVal && `L: ${leftVal}`}{leftVal && rightVal && " | "}{rightVal && `R: ${rightVal}`}{singleVal && singleVal}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:7, alignItems:"center", flexShrink:0, marginLeft:10 }}>
                  <TestInfoThumb id={t.id} color={C.a2} onClick={e => { e.stopPropagation(); setModalTest(t); }}/>
                  <span style={{ color:C.muted, fontSize:"0.82rem" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ padding:"0 14px 14px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:14, marginBottom:12 }}>
                    {/* Clinical image — Cloudinary (falls back to SVG if not uploaded) */}
                    <ClinicalImageCard
                      id={t.id}
                      title={t.label}
                      fallbackSvg={svgEl}
                      C={C}
                      color={color}
                    />

                    {/* How to + sensitivity */}
                    <div>
                      <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:8, padding:10, marginBottom:8 }}>
                        <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>👐 How to Perform</div>
                        <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.7 }}>{t.how}</div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                        <div style={{ background:"rgba(0,201,122,0.08)", border:"1px solid rgba(0,201,122,0.25)", borderRadius:7, padding:"6px 9px" }}>
                          <div style={{ fontSize:"0.8rem", fontWeight:700, color:C.green, marginBottom:2 }}>✓ NEGATIVE means</div>
                          <div style={{ fontSize:"0.82rem", color:C.text }}>{t.negative}</div>
                        </div>
                        <div style={{ background:"rgba(255,77,109,0.08)", border:"1px solid rgba(255,77,109,0.25)", borderRadius:7, padding:"6px 9px" }}>
                          <div style={{ fontSize:"0.8rem", fontWeight:700, color:C.red, marginBottom:2 }}>⚠ POSITIVE means</div>
                          <div style={{ fontSize:"0.82rem", color:C.text }}>{t.positive}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Result selection — bilateral where needed */}
                  <div>
                    <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>📊 Record Result</div>
                    {["cervical","shoulder","elbow_wrist","neural","ankle_foot","knee","hip"].includes(region) || t.id.includes("_l_") || t.id.includes("ultt") || t.id.includes("spurling") || t.id.includes("neer") || t.id.includes("hawkins") || t.id.includes("empty_can") || t.id.includes("full_can") || t.id.includes("lift_off") || t.id.includes("belly") || t.id.includes("bear") || t.id.includes("er_lag") || t.id.includes("hornblower") || t.id.includes("obrien") || t.id.includes("speeds") || t.id.includes("yergason") || t.id.includes("apprehension") || t.id.includes("relocation") || t.id.includes("sulcus") || t.id.includes("cozens") || t.id.includes("mills") || t.id.includes("golfers") || t.id.includes("phalen") || t.id.includes("tinel") || t.id.includes("finkelstein") || t.id.includes("watson") || t.id.includes("grind") || t.id.includes("valgus_stress") || t.id.includes("fadir") || t.id.includes("faber_test") || t.id.includes("hip_scour") || t.id.includes("trendelenburg_test") || t.id.includes("thomas_test") || t.id.includes("ober_test") || t.id.includes("piriformis") || t.id.includes("lachmans") || t.id.includes("anterior_drawer") || t.id.includes("posterior_drawer") || t.id.includes("pivot") || t.id.includes("mcmurray_test") || t.id.includes("apley") || t.id.includes("thessaly") || t.id.includes("clarkes") || t.id.includes("patellar") || t.id.includes("noble") || t.id.includes("ant_drawer_ankle") || t.id.includes("talar_tilt") || t.id.includes("thompson_test") || t.id.includes("windlass") || t.id.includes("navicular") || t.id.includes("tinel_ankle") || t.id.includes("royal_london") || t.id.includes("ultt") || t.id.includes("femoral") || t.id.includes("single_leg") ? (
                      // Bilateral
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        {["left","right"].map(side => {
                          const sideVal = data[t.id+"_"+side] || "";
                          const sidePos = isPositive(sideVal);
                          return (
                            <div key={side}>
                              <div style={{ fontSize:"0.75rem", fontWeight:700, color:sidePos ? C.red : C.muted, marginBottom:4 }}>{side.toUpperCase()} {sidePos && "⚠"}</div>
                              <select value={sideVal} onChange={e => setTestResult(t.id, side, e.target.value)}
                                style={{ width:"100%", background:C.s3, border:`1px solid ${sidePos ? C.red : C.border}`, borderRadius:7, color:C.text, padding:"7px 9px", fontSize:"0.76rem", outline:"none", fontFamily:"inherit" }}>
                                <option value="">— not tested —</option>
                                {t.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Single
                      <select value={singleVal} onChange={e => setTestResult(t.id, null, e.target.value)}
                        style={{ width:"100%", background:C.s3, border:`1px solid ${isPositive(singleVal) ? C.red : C.border}`, borderRadius:7, color:C.text, padding:"7px 9px", fontSize:"0.76rem", outline:"none", fontFamily:"inherit" }}>
                        <option value="">— not tested —</option>
                        {t.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        });
      })()}

      {/* MODAL */}
      {modalTest && (
        <div onClick={() => setModalTest(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:C.surface, border:`1px solid ${C.accent}40`, borderRadius:14, padding:24, maxWidth:560, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, color:C.accent, fontSize:"1.05rem" }}>{modalTest.label}</div>
                <div style={{ fontSize:"0.82rem", color:C.muted, marginTop:3 }}>Structure: {modalTest.structure}</div>
                <div style={{ fontSize:"0.8rem", color:C.muted }}>Sensitivity: {modalTest.sensitivity} · Specificity: {modalTest.specificity}</div>
              </div>
              <button onClick={() => setModalTest(null)} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"3px 9px", cursor:"pointer" }}>✕</button>
            </div>

            {/* Illustration -- uploaded clinical photo if one exists for this test
                (same ClinicalImageCard used in the expanded inline card), falling
                back to the generic SVG only when nothing has been uploaded. Tap
                the image to open it full-size. */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
              <ClinicalImageCard
                id={modalTest.id}
                title={modalTest.label}
                fallbackSvg={TEST_SVG[modalTest.id.replace("st_","")]}
                C={C}
                color={C.accent}
              />
            </div>

            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.yellow, textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>👐 How to Perform</div>
              <div style={{ background:C.s2, borderRadius:8, padding:14, fontSize:"0.82rem", color:C.text, lineHeight:1.8 }}>{modalTest.how}</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div style={{ background:"rgba(0,201,122,0.08)", border:"1px solid rgba(0,201,122,0.25)", borderRadius:8, padding:10 }}>
                <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.green, textTransform:"uppercase", marginBottom:5 }}>✓ Negative</div>
                <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.6 }}>{modalTest.negative}</div>
              </div>
              <div style={{ background:"rgba(255,77,109,0.08)", border:"1px solid rgba(255,77,109,0.25)", borderRadius:8, padding:10 }}>
                <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.red, textTransform:"uppercase", marginBottom:5 }}>⚠ Positive</div>
                <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.6 }}>{modalTest.positive}</div>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:"0.73rem", fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>📊 Result Options</div>
              {modalTest.options.map((o, i) => (
                <div key={i} style={{ padding:"6px 10px", borderRadius:7, marginBottom:5, background:C.s2, border:`1px solid ${C.border}`, fontSize:"0.78rem", color:isPositive(o) ? C.red : C.text }}>
                  {isPositive(o) ? "⚠ " : "○ "}{o}
                </div>
              ))}
            </div>

            <button onClick={() => setModalTest(null)} style={{ width:"100%", padding:"9px", background:C.a2, border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// CYRIAX COMPLETE ASSESSMENT MODULE
// Full STTT • Active/Passive ROM • End-Feel • Resisted Tests • Joint Play
// Auto Clinical Reasoning • Tissue Diagnosis • Treatment Direction
// ═══════════════════════════════════════════════════════════════════════════

// ─── CYRIAX CORE DATA ────────────────────────────────────────────────────────

const CYRIAX_STTT_INTERPRETATION = {
  "Strong & Painless": {
    color:"#00c97a", icon:"✅",
    tissue:"Normal contractile tissue",
    meaning:"No lesion in the tested contractile unit. The muscle, musculotendinous junction, and tendon are intact and healthy. Look elsewhere for the pain source.",
    nextStep:"Test passive movements (inert tissue). If passive also normal, consider referred pain or visceral source.",
    dx:"Normal — no contractile lesion at this movement",
  },
  "Strong & Painful": {
    color:"#ffb300", icon:"⚠️",
    tissue:"Minor contractile lesion",
    meaning:"The contractile unit can generate near-normal force BUT the lesion is provoked by tension. Indicates MINOR lesion: partial muscle tear, tendinopathy, tenoperiosteal lesion, or musculotendinous junction injury. The structure is intact enough to generate force.",
    nextStep:"Palpate the exact site of lesion. Deep Transverse Friction Massage (DTFM) at the exact lesion site. Eccentric loading protocol.",
    dx:"Minor lesion of contractile tissue — tendinopathy / partial tear / tenoperiosteal",
  },
  "Weak & Painless": {
    color:"#7f5af0", icon:"⚡",
    tissue:"Neurological deficit OR complete rupture",
    meaning:"Cannot generate force AND no pain. Two possible causes: (1) Complete structural rupture (tendon/muscle torn completely — cannot generate force, no tissue left to be painful), OR (2) Neurological inhibition — nerve root lesion, peripheral nerve palsy, or UMN lesion. Must differentiate urgently.",
    nextStep:"Check dermatomes, myotomes, reflexes. If neurological: refer for nerve conduction study / MRI spine. If complete rupture: refer for imaging and surgical consultation.",
    dx:"Neurological deficit OR complete structural rupture — REFER for imaging",
  },
  "Weak & Painful": {
    color:"#ff4d6d", icon:"🚨",
    tissue:"Serious lesion — refer",
    meaning:"Cannot generate force AND painful. SERIOUS FINDING. May indicate: (1) Gross lesion with bleeding, (2) Acute complete rupture with surrounding tissue inflammation, (3) Neoplasm affecting contractile unit, (4) Fracture through muscle origin/insertion, (5) Significant nerve root compression with muscle involvement.",
    nextStep:"URGENT: Do NOT load or treat. Refer for imaging immediately (X-ray, MRI). Rule out fracture, neoplasm, acute complete rupture. Consider emergency referral.",
    dx:"SERIOUS LESION — URGENT IMAGING REFERRAL REQUIRED",
  },
};

const ENDFEEL_DATA = {
  "Bone-to-Bone (Hard)": { color:"#00c97a", normal:"Elbow extension, knee extension at limits", abnormal:"Elsewhere = osteophyte, loose body, myositis ossificans", tx:"Joint mobilisation, traction if OA" },
  "Tissue Approximation (Soft)": { color:"#00c97a", normal:"Elbow/knee flexion (soft tissue meets soft tissue)", abnormal:"If very mushy and boggy = oedema/effusion", tx:"Oedema management if abnormal" },
  "Capsular/Leathery": { color:"#ffb300", normal:"Normal capsular end-feel — firm, leathery", abnormal:"Premature capsular feel = capsulitis/fibrosis/OA", tx:"Grade III–IV joint mobilisation, sustained end-range stretching, heat" },
  "Springy/Rebound": { color:"#ff8c42", normal:"No normal joints", abnormal:"Always abnormal = loose body (OA fragment), torn meniscus, articular cartilage flap", tx:"Refer orthopaedic — may need arthroscopy" },
  "Empty (No End-Feel)": { color:"#ff4d6d", normal:"No normal joints", abnormal:"ALWAYS serious — pain stops movement before mechanical limit reached. Bursitis, neoplasm, abscess, fracture, psychogenic", tx:"REFER — serious pathology. Do NOT force range." },
  "Muscle Spasm": { color:"#ff4d6d", normal:"No normal joints", abnormal:"Acute inflammation, instability (body protective), nerve root irritation", tx:"Acute: PRICE, gentle Grade I–II mobilisation. Do NOT manipulate in spasm." },
};

const CAPSULAR_PATTERNS = {
  shoulder: { name:"Shoulder (GH)", pattern:"ER most limited > Abduction > IR", dx:"GH capsulitis / adhesive capsulitis / OA / post-surgical capsular fibrosis" },
  elbow: { name:"Elbow", pattern:"Flexion > Extension (both limited)", dx:"Elbow OA / post-fracture stiffness / capsulitis" },
  wrist: { name:"Wrist (radiocarpal)", pattern:"Flexion = Extension equally limited", dx:"Wrist OA / capsulitis / post-Colles fracture" },
  hip: { name:"Hip", pattern:"IR most limited = Flexion = Abduction", dx:"Hip OA / capsulitis / avascular necrosis" },
  knee: { name:"Knee (tibiofemoral)", pattern:"Flexion >> Extension", dx:"Knee OA / capsulitis / after immobilisation" },
  ankle: { name:"Ankle (talocrural)", pattern:"Plantarflexion > Dorsiflexion", dx:"Ankle OA / post-sprain capsulitis" },
  cervical: { name:"Cervical spine", pattern:"Side-flex equally both ways = Rotation = Flex/Ext (all equally limited)", dx:"Cervical OA / spondylosis / RA" },
  lumbar: { name:"Lumbar spine", pattern:"Side-flex both directions equally, Extension > Flexion", dx:"Lumbar OA / spondylosis / disc degeneration" },
};

// ─── CYRIAX REGION DATA ───────────────────────────────────────────────────────
function cyriaxAutoReason(regionId, data) {
  const reg = CYRIAX_REGIONS_DATA[regionId];
  if (!reg) return null;

  const v = (id) => data[`cyriax_${regionId}_${id}`] || "";
  const findings = [];
  const diagnoses = [];
  const treatment = [];
  let tissueType = "";
  let confidence = "Low";

  // Check resisted tests for tissue type
  const resistedResults = reg.resistedTests.map(t => ({ id: t.id, result: v(`res_${t.id}`), label: t.label, muscle: t.muscle }));
  const strongPainful = resistedResults.filter(r => r.result === "Strong & Painful");
  const weakPainless = resistedResults.filter(r => r.result === "Weak & Painless");
  const weakPainful = resistedResults.filter(r => r.result === "Weak & Painful");
  const strongPainless = resistedResults.filter(r => r.result === "Strong & Painless");

  // Passive ROM / end-feel
  const passiveEndfeels = reg.passiveROM.map(t => ({ id: t.id, ef: v(`pass_ef_${t.id}`), label: t.label }));
  const abnormalEndfeels = passiveEndfeels.filter(e => e.ef && !["Normal/Capsular","Tissue Approximation (normal)","Hard (normal at 0°)","Bone-to-Bone (normal at 0°)"].some(n => e.ef.startsWith(n)));

  // Active ROM
  const activeROMs = reg.activeROM.map(t => ({ id: t.id, pain: v(`act_pain_${t.id}`), limited: v(`act_limited_${t.id}`), label: t.label }));
  const painfulMovements = activeROMs.filter(r => r.pain && r.pain.includes("Pain"));
  const limitedMovements = activeROMs.filter(r => r.limited && r.limited !== "Full" && r.limited !== "Normal");

  // Capsular pattern detection
  const capsPattern = v("capsular_pattern");
  const hasCapsular = capsPattern === "Yes — capsular pattern confirmed";

  // TISSUE TYPE DETERMINATION
  if (weakPainful.length > 0) {
    tissueType = "⚠️ SERIOUS CONTRACTILE LESION";
    confidence = "High";
    findings.push(`🚨 SERIOUS: ${weakPainful.map(r => r.label).join(", ")} — Weak & Painful`);
    diagnoses.push({ name:"Serious Contractile Lesion", confidence:"High", detail:"Weak + painful = serious: complete rupture + surrounding tissue damage, fracture through insertion, or neoplasm. URGENT imaging required." });
    treatment.push("URGENT: Do NOT load or treat. Refer for imaging (X-ray + MRI) immediately.", "Rule out fracture, complete rupture, neoplasm.", "Surgical consultation if rupture confirmed.");
  } else if (weakPainless.length > 0) {
    tissueType = "⚡ NEUROLOGICAL DEFICIT OR COMPLETE RUPTURE";
    confidence = "High";
    findings.push(`⚡ Neurological finding: ${weakPainless.map(r => `${r.label} (${r.muscle})`).join(", ")} — Weak & Painless`);
    diagnoses.push({ name:"Neurological Deficit or Complete Structural Rupture", confidence:"High", detail:"Weak + painless = nerve root lesion (check dermatomes + reflexes) OR complete rupture (no structure left to be painful)." });
    treatment.push("Neurological assessment: dermatomes, myotomes, reflexes.", "If neurological: nerve conduction study, MRI spine.", "If complete rupture: refer orthopaedic.");
  } else if (strongPainful.length > 0 && abnormalEndfeels.length === 0) {
    tissueType = "🎯 CONTRACTILE TISSUE LESION";
    confidence = "High";
    findings.push(`Minor contractile lesion: ${strongPainful.map(r => `${r.label} (${r.muscle})`).join(", ")}`);
    strongPainful.forEach(r => {
      diagnoses.push({ name:`${r.muscle} — Tendinopathy / Partial Tear`, confidence:"High", detail:`Strong & Painful on ${r.label}. Contractile unit generates force but lesion provoked. Minor lesion at muscle, MTJ, tendon, or tenoperiosteal junction.` });
      treatment.push(`Deep Transverse Friction Massage (DTFM) to exact palpated lesion site — ${r.muscle}`, `Eccentric loading protocol for ${r.muscle}`, "Load management — avoid aggravating movements initially");
    });
  } else if (hasCapsular || (abnormalEndfeels.length > 0 && strongPainful.length === 0 && weakPainless.length === 0)) {
    tissueType = "🔒 INERT TISSUE LESION";
    confidence = "High";
    if (hasCapsular) {
      findings.push(`Capsular pattern confirmed for ${reg.name || regionId}`);
      const cp = CAPSULAR_PATTERNS[regionId];
      if (cp) diagnoses.push({ name:`Capsulitis / ${cp.dx}`, confidence:"High", detail:`Capsular pattern: ${cp.pattern}. Inert tissue (capsule) involved. Consider: ${cp.dx}.` });
      treatment.push("Grade III–IV joint mobilisation (address capsular restriction)", "Sustained end-range stretching", "Heat before mobilisation, ice after", "Progressive ROM restoration");
    }
    abnormalEndfeels.forEach(e => {
      findings.push(`Abnormal end-feel at ${e.label}: ${e.ef}`);
      const efData = ENDFEEL_DATA[e.ef];
      if (efData) {
        diagnoses.push({ name:`${e.ef} end-feel at ${e.label}`, confidence:"Moderate", detail:efData.abnormal });
        treatment.push(efData.tx);
      }
    });
  } else if (strongPainless.length === resistedResults.filter(r => r.result).length && resistedResults.filter(r => r.result).length > 0) {
    tissueType = "✅ ALL CONTRACTILE TESTS NORMAL";
    confidence = "Moderate";
    findings.push("All resisted tests strong and painless — contractile tissue normal");
    diagnoses.push({ name:"Inert Tissue Pathology (all contractile normal)", confidence:"Moderate", detail:"Pain is not arising from contractile tissue. Inert structures (capsule, ligament, bursa, disc) are the source. Focus passive assessment." });
    treatment.push("Focus on passive assessment and joint play", "Inert tissue treatment: mobilisation, manipulation, support");
  }

  // Painful arc detection
  const painArc = v("painful_arc");
  if (painArc && painArc !== "None") {
    findings.push(`Painful arc: ${painArc}`);
    if (painArc.includes("Impingement")) diagnoses.push({ name:"Subacromial Impingement (painful arc)", confidence:"Moderate", detail:"Pain 60–120° = subacromial arc = supraspinatus or bursa impingement." });
  }

  // Related assessment suggestions
  const nextTests = [];
  if (tissueType.includes("CONTRACTILE")) {
    nextTests.push("Palpate exact lesion site (deep transverse friction point)", "Ultrasound imaging to confirm partial vs complete lesion", "Neural tension tests if referred symptoms");
  }
  if (tissueType.includes("INERT") || hasCapsular) {
    nextTests.push("X-ray (OA staging)", "Joint play assessment (grade mobility)", "Arthroscopy referral if springy end-feel (loose body)", "MRI if empty end-feel (serious pathology)");
  }
  if (tissueType.includes("NEUROLOGICAL")) {
    nextTests.push("Full neurological exam (dermatomes, myotomes, reflexes)", "MRI spine", "Nerve conduction study + EMG", "Neurosurgeon referral if progressive");
  }

  return { findings, diagnoses: diagnoses.slice(0, 5), treatment: [...new Set(treatment)].slice(0, 8), tissueType, confidence, nextTests, differentials: reg.differentials };
}

// ─── CYRIAX MODULE COMPONENT ─────────────────────────────────────────────────
function CyriaxModule({ data, set, navContext={} }) {
    const [region, setRegion] = useState("shoulder");
  const [tab, setTab] = useState("active");
  const [reasoning, setReasoning] = useState(null);
  const [showRed, setShowRed] = useState(false);

  const reg = CYRIAX_REGIONS_DATA[region];
  const prefix = `cyriax_${region}_`;

  // Deep-link: switch region+tab, scroll+highlight specific movement cards
  React.useEffect(()=>{
    const targets = navContext.cyriaxHighlights
      ? navContext.cyriaxHighlights
      : navContext.cyriaxHighlight ? [navContext.cyriaxHighlight] : [];
    if(!targets.length) return;
    // Infer region + tab from first target ID prefix
    const first = targets[0];
    const regionMap = { cx:"cervical", sh:"shoulder", el:"elbow", wr:"wrist_hand" };
    const tabMap = { a:"active", p:"passive", r:"resisted", jp:"joint_play" };
    const parts = first.split("_");  // e.g. "sh_a_abd" → ["sh","a","abd"]
    const inferredRegion = regionMap[parts[0]] || region;
    const inferredTab = tabMap[parts[1]] || "active";
    setRegion(inferredRegion);
    setTab(inferredTab);
    setTimeout(()=>{
      let scrolled = false;
      targets.forEach(id => {
        const el = document.querySelector(`[data-cy-id="${id}"]`);
        if(el){
          if(!scrolled){ el.scrollIntoView({ behavior:"smooth", block:"center" }); scrolled=true; }
          applyPersistentHighlight(el);
        }
      });
    }, 500);
  },[navContext.cyriaxHighlight, navContext.cyriaxHighlights]);
  const v = (id) => data[prefix + id] || "";
  const sv = (id, val) => set(prefix + id, val);

  const selectStyle = { width:"100%", background:"#FFFFFF", border:"1px solid #E0E0E2", borderRadius:8, color:"#0D0D0D", padding:"7px 10px", fontSize:"0.78rem", outline:"none", fontFamily:"inherit", WebkitAppearance:"none", appearance:"none" };
  const labelStyle = { fontSize:"0.82rem", fontWeight:700, color:"#6B6B6B", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.5px" };
  const boxStyle = { background:"#ffffff", border:"1px solid #E0E0E2", borderRadius:10, padding:13, marginBottom:10 };
  const RESULT_OPTIONS = ["","Strong & Painless","Strong & Painful","Weak & Painless","Weak & Painful"];
  const PAIN_OPTIONS = ["","No pain","Pain on initiation","Pain at mid-range","Pain at end range","Painful arc","Pain throughout range","Referred pain with movement"];
  const LIMITED_OPTIONS = ["","Full range","Mildly limited","Moderately limited","Severely limited","Cannot perform","Hypermobile — above normal range"];

  const resColor = (val) => {
    if (!val) return "#1a2d45";
    const c = CYRIAX_STTT_INTERPRETATION[val];
    return c ? c.color : "#1a2d45";
  };

  const runReasoning = () => setReasoning(cyriaxAutoReason(region, data));

  // Pain at Range is a multi-select (Beginning / Mid-range / End-range /
  // Throughout / etc. can all apply at once) but stored as a single
  // ", "-joined string, matching the plain-string shape every other reader
  // of this field already expects. "No pain" is mutually exclusive with
  // every other option in both directions.
  const togglePainAtRange = (fieldKey, option) => {
    const current = v(fieldKey) ? v(fieldKey).split(", ").filter(Boolean) : [];
    let next;
    if (option === "No pain") {
      next = current.includes("No pain") ? [] : ["No pain"];
    } else {
      const withoutNoPain = current.filter(o => o !== "No pain");
      next = withoutNoPain.includes(option) ? withoutNoPain.filter(o => o !== option) : [...withoutNoPain, option];
    }
    sv(fieldKey, next.join(", "));
  };

  const tabStyle = (t) => ({ padding:"8px 16px", cursor:"pointer", fontSize:"0.8rem", fontWeight:tab===t?700:500, color:tab===t?C.accent:C.muted, background:"none", border:"none", borderBottom:`2px solid ${tab===t?C.accent:"transparent"}` });

  const [cyriaxHelpOpen, setCyriaxHelpOpen] = React.useState(() => !localStorage.getItem("pm_stt_seen"));
  return (
    <div>
      {/* ── STT Framework Explainer ── */}
      <div style={{border:`1px solid #7c3aed44`,borderRadius:12,overflow:"hidden",marginBottom:14}}>
        <div onClick={()=>{setCyriaxHelpOpen(o=>!o); localStorage.setItem("pm_stt_seen","1");}}
          style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",cursor:"pointer",background:"#7c3aed0a"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"1rem"}}>📚</span>
            <span style={{fontWeight:700,fontSize:"0.85rem",color:"#7c3aed"}}>What is STT Assessment?</span>
            <span style={{fontSize:"0.75rem",color:"#7c3aed88",fontStyle:"italic"}}>Tap to {cyriaxHelpOpen?"hide":"show"} guide</span>
          </div>
          <span style={{fontSize:"0.75rem",color:"#7c3aed"}}>{cyriaxHelpOpen?"▲":"▼"}</span>
        </div>
        {cyriaxHelpOpen && (
          <div style={{padding:"14px 16px",borderTop:"1px solid #7c3aed22",background:"#F2F2F4",fontSize:"0.82rem",color:"#3b2a6a",lineHeight:1.7}}>
            <p style={{margin:"0 0 10px"}}><strong>Selective Tissue Tension (STT)</strong> is a systematic orthopaedic assessment approach that identifies the source of musculoskeletal pain by classifying structures as <strong>contractile</strong> (muscle, tendon, enthesis) or <strong>inert</strong> (joint capsule, ligament, bursa, nerve, cartilage). Systematic loading of each tissue type isolates the structure at fault.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div style={{background:"#7c3aed0d",borderRadius:8,padding:10}}>
                <div style={{fontWeight:700,marginBottom:4,color:"#7c3aed"}}>📋 STT Assessment order</div>
                <div>1. <strong>Active ROM</strong> — patient moves (both structures + neuromuscular)<br/>2. <strong>Passive ROM</strong> — examiner moves (inert structures only)<br/>3. <strong>Resisted tests</strong> — isometric (contractile structures only)</div>
              </div>
              <div style={{background:"#059669 0d",borderRadius:8,padding:10}}>
                <div style={{fontWeight:700,marginBottom:4,color:"#059669"}}>🔍 Interpreting findings</div>
                <div><strong>Strong &amp; Painless</strong> = normal contractile<br/><strong>Strong &amp; Painful</strong> = minor lesion (tendinopathy)<br/><strong>Weak &amp; Painful</strong> = serious lesion / fracture<br/><strong>Weak &amp; Painless</strong> = neurological / rupture</div>
              </div>
            </div>
            <div style={{background:"#b4530910",borderRadius:8,padding:10,border:"1px solid #b4530925"}}>
              <strong style={{color:"#b45309"}}>⚠ Capsular vs Non-capsular pattern</strong><br/>
              Capsular pattern = proportional restriction across a joint (e.g. shoulder: ER &gt; Abd &gt; IR). Suggests arthritis, adhesive capsulitis. Non-capsular = selective restriction, suggests ligament, bursitis, or internal derangement.
            </div>
          </div>
        )}
      </div>

      {/* Region Chips */}
      <RegionChips
        regions={Object.entries(CYRIAX_REGIONS_DATA).map(([key,r])=>({
          key,
          label: r.label||key,
          filled: Object.keys(data).filter(k=>k.startsWith(`cyriax_${key}_`)&&data[k]).length,
        }))}
        active={region}
        onSelect={k=>{setRegion(k);setTab("active");setReasoning(null);}}
      />

      {/* Anatomy banner */}
      <div style={{ ...boxStyle, borderColor:reg.color+"30" }}>
        <div style={{ fontSize:"0.75rem", fontWeight:700, color:reg.color, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>📚 Regional Anatomy</div>
        <div style={{ fontSize:"0.76rem", color:C.muted, lineHeight:1.7 }}>{reg.anatomy}</div>
        <div style={{ marginTop:8, padding:"6px 10px", background:`${reg.color}10`, borderRadius:7, fontSize:"0.74rem", color:C.text }}>
          <strong style={{ color:reg.color }}>Capsular Pattern: </strong>{reg.capsularPattern}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:16 }}>
        {[["active","Active ROM"],["passive","Passive ROM"],["resisted","Resisted Tests"],["joint_play","Joint Play"],["reason","🧠 Reasoning"]].map(([t,l]) => (
          <button key={t} type="button" onClick={()=>setTab(t)} style={tabStyle(t)}>{l}</button>
        ))}
      </div>

      {/* ── ACTIVE ROM TAB ── */}
      {tab === "active" && (
        <div>
          <div style={{ ...boxStyle, borderColor:"rgba(0,229,255,0.2)" }}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Active Range of Motion — All Directions</div>

            {/* Painful arc */}
            <div style={{ marginBottom:12 }}>
              <div style={labelStyle}>Painful Arc</div>
              <select value={v("painful_arc")} onChange={e=>sv("painful_arc",e.target.value)} style={selectStyle}>
                <option value="">— select —</option>
                {["None","Impingement arc (60–120°) — supraspinatus/bursa","Full range painful — capsular","Mid-range pain eases — disc","End range only — capsule/facet","Pain increases progressively — inflammatory","Painful on return (latent pain)"].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {reg.activeROM.map(t => (
              <div key={t.id} data-cy-id={t.id} style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:9, padding:12, marginBottom:9 }}>
                <div style={{ fontWeight:700, color:C.text, marginBottom:6, fontSize:"0.82rem" }}>{t.label} <span style={{ color:C.muted, fontWeight:400, fontSize:"0.82rem" }}>Normal: {t.normal}</span></div>
                <div style={{ background:C.s3, borderRadius:7, padding:9, marginBottom:8, fontSize:"0.74rem", color:C.muted, lineHeight:1.6, display:"flex", gap:10, alignItems:"flex-start" }}>
                  <SmallClinicalImg id={t.id} title={t.label} />
                  <div style={{flex:1}}><strong style={{ color:C.yellow }}>How: </strong>{t.how}</div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  <div>
                    <div style={labelStyle}>ROM Value</div>
                    <input type="text" value={v(`act_rom_${t.id}`)} onChange={e=>sv(`act_rom_${t.id}`,e.target.value)} placeholder={`e.g. ${t.normal}`} style={selectStyle}/>
                  </div>
                  <div>
                    <div style={labelStyle}>Range</div>
                    <select value={v(`act_limited_${t.id}`)} onChange={e=>sv(`act_limited_${t.id}`,e.target.value)} style={{...selectStyle, borderColor:v(`act_limited_${t.id}`)&&v(`act_limited_${t.id}`)!=="Full"?"#ffb300":"#1a2d45"}}>
                      {LIMITED_OPTIONS.map(o=><option key={o} value={o}>{o||"— range? —"}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop:7 }}>
                  <div style={labelStyle}>Pain at Range <span style={{ fontWeight:400, textTransform:"none", letterSpacing:"normal", color:C.muted }}>(select all that apply)</span></div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {PAIN_OPTIONS.filter(Boolean).map(o=>{
                      const selected = v(`act_pain_${t.id}`) ? v(`act_pain_${t.id}`).split(", ").filter(Boolean) : [];
                      const checked = selected.includes(o);
                      return (
                        <button key={o} type="button" onClick={()=>togglePainAtRange(`act_pain_${t.id}`, o)}
                          style={{ padding:"5px 10px", borderRadius:20, fontSize:"0.74rem", fontWeight:checked?700:500,
                            border:`1px solid ${checked?"#ff4d6d":C.border}`,
                            background:checked?"rgba(255,77,109,0.12)":"transparent",
                            color:checked?"#ff4d6d":C.muted, cursor:"pointer", fontFamily:"inherit" }}>
                          {checked?"☑":"☐"} {o}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop:6 }}>
                  <div style={labelStyle}>Compensation / Quality Notes</div>
                  <input type="text" value={v(`act_comp_${t.id}`)} onChange={e=>sv(`act_comp_${t.id}`,e.target.value)} placeholder="e.g. trunk lean, painful arc 60–120°, shoulder shrug..." style={selectStyle}/>
                </div>
              </div>
            ))}

            {/* Active vs Passive comparison */}
            <div style={{ marginTop:10 }}>
              <div style={labelStyle}>Active vs Passive Comparison (STTT Key Rule)</div>
              <select value={v("act_pass_comparison")} onChange={e=>sv("act_pass_comparison",e.target.value)} style={selectStyle}>
                <option value="">— select —</option>
                {["Passive ROM greater than active — inert or contractile lesion (both possible)","Passive ROM same as active — capsular/inert lesion (contractile not involved)","Passive ROM less than active — muscular/contractile over-activity","Active more restricted than passive — contractile inhibition or pain avoidance","Both equally restricted — capsular pattern"].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── PASSIVE ROM TAB ── */}
      {tab === "passive" && (
        <div>
          <div style={{ ...boxStyle, borderColor:"rgba(127,90,240,0.3)" }}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.a2, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Passive ROM — Inert Tissue Testing</div>

            {/* Capsular pattern */}
            <div style={{ background:"rgba(127,90,240,0.08)", border:`1px solid ${C.a2}40`, borderRadius:9, padding:12, marginBottom:12 }}>
              <div style={labelStyle}>Capsular Pattern Assessment</div>
              <select value={v("capsular_pattern")} onChange={e=>sv("capsular_pattern",e.target.value)} style={{...selectStyle, borderColor:v("capsular_pattern")?.includes("Yes")?"#7f5af0":"#1a2d45"}}>
                <option value="">— assess capsular pattern —</option>
                <option value="Yes — capsular pattern confirmed">Yes — capsular pattern confirmed</option>
                <option value="Non-capsular — specific direction limited">Non-capsular — specific direction limited</option>
                <option value="No restriction — all passive full">No restriction — all passive full</option>
                <option value="Partial capsular — not all directions limited">Partial capsular pattern — not all directions</option>
              </select>
              {CAPSULAR_PATTERNS[region] && (
                <div style={{ marginTop:8, padding:"6px 9px", background:C.s3, borderRadius:6, fontSize:"0.82rem", color:C.text }}>
                  <strong style={{ color:C.a2 }}>Expected pattern: </strong>{CAPSULAR_PATTERNS[region].pattern}
                  <br/><strong style={{ color:C.a2 }}>Suggests: </strong>{CAPSULAR_PATTERNS[region].dx}
                </div>
              )}
            </div>

            {reg.passiveROM.map(t => (
              <div key={t.id} data-cy-id={t.id} style={{ ...boxStyle }}>
                <div style={{ fontWeight:700, color:C.text, marginBottom:6, fontSize:"0.82rem" }}>{t.label}</div>
                <div style={{ background:C.s3, borderRadius:7, padding:9, marginBottom:8, fontSize:"0.74rem", color:C.muted, lineHeight:1.6 }}>
                  <strong style={{ color:C.yellow }}>Method: </strong>{t.how}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:7 }}>
                  <div>
                    <div style={labelStyle}>ROM (degrees or cm)</div>
                    <input type="text" value={v(`pass_rom_${t.id}`)} onChange={e=>sv(`pass_rom_${t.id}`,e.target.value)} placeholder="e.g. 90° or less than active" style={selectStyle}/>
                  </div>
                  <div>
                    <div style={labelStyle}>Pain at End Range</div>
                    <select value={v(`pass_pain_${t.id}`)} onChange={e=>sv(`pass_pain_${t.id}`,e.target.value)} style={{...selectStyle, borderColor:v(`pass_pain_${t.id}`)?.includes("Pain")?"#ff4d6d":"#1a2d45"}}>
                      {["","No pain at end range","Pain at end range — same as active","Pain at end range — more than active (inert lesion)","Pain before end range","Referred pain with passive movement"].map(o=><option key={o} value={o}>{o||"— end range pain? —"}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom:7 }}>
                  <div style={labelStyle}>End-Feel</div>
                  <select value={v(`pass_ef_${t.id}`)} onChange={e=>sv(`pass_ef_${t.id}`,e.target.value)}
                    style={{...selectStyle, borderColor:v(`pass_ef_${t.id}`)&&!["Normal/Capsular","Tissue Approximation (normal)","Hard (normal at 0°)","Bone-to-Bone (normal at 0°)"].some(n=>v(`pass_ef_${t.id}`).startsWith(n))?"#ffb300":"#1a2d45"}}>
                    <option value="">— select end-feel —</option>
                    {(t.endfeel_options||Object.keys(ENDFEEL_DATA)).map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  {v(`pass_ef_${t.id}`) && ENDFEEL_DATA[v(`pass_ef_${t.id}`)] && (
                    <div style={{ marginTop:6, padding:"6px 9px", background:C.s3, borderRadius:6, fontSize:"0.82rem", color:C.text, lineHeight:1.5 }}>
                      <strong style={{ color:ENDFEEL_DATA[v(`pass_ef_${t.id}`)].color }}>Clinical significance: </strong>
                      {ENDFEEL_DATA[v(`pass_ef_${t.id}`)].abnormal}
                      <br/><strong style={{ color:C.a3 }}>Treatment: </strong>{ENDFEEL_DATA[v(`pass_ef_${t.id}`)].tx}
                    </div>
                  )}
                </div>
                <div>
                  <div style={labelStyle}>Overpressure Response</div>
                  <select value={v(`pass_ovp_${t.id}`)} onChange={e=>sv(`pass_ovp_${t.id}`,e.target.value)} style={selectStyle}>
                    {["","No pain with overpressure","Mild pain with overpressure","Significant pain with overpressure","Pain before overpressure applied","Reproduction of patient's symptoms"].map(o=><option key={o} value={o}>{o||"— overpressure —"}</option>)}
                  </select>
                </div>
              </div>
            ))}

            {/* Active vs Passive summary */}
            <div style={{ background:"rgba(0,229,255,0.06)", border:`1px solid ${C.accent}25`, borderRadius:9, padding:12 }}>
              <div style={labelStyle}>STTT A vs P Summary</div>
              <div style={{ fontSize:"0.74rem", color:C.muted, marginBottom:6 }}>Key rule: if passive ROM is GREATER than active, the contractile unit is restricting (not the joint). If passive = active, joint/inert structure.</div>
              <textarea value={v("passive_summary")} onChange={e=>sv("passive_summary",e.target.value)}
                placeholder="Summarise passive findings and active vs passive comparison..."
                style={{ ...selectStyle, minHeight:60, resize:"vertical", display:"block" }}/>
            </div>
          </div>
        </div>
      )}

      {/* ── RESISTED TESTS TAB ── */}
      {tab === "resisted" && (
        <div>
          {/* STTT Key */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            {Object.entries(CYRIAX_STTT_INTERPRETATION).map(([key, val]) => (
              <div key={key} style={{ background:`${val.color}10`, border:`1px solid ${val.color}40`, borderRadius:9, padding:"8px 11px" }}>
                <div style={{ fontWeight:700, color:val.color, fontSize:"0.74rem", marginBottom:3 }}>{val.icon} {key}</div>
                <div style={{ fontSize:"0.78rem", color:C.text, lineHeight:1.5 }}>{val.tissue}</div>
              </div>
            ))}
          </div>

          <div style={boxStyle}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.a4, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Selective Tissue Tension — Resisted Isometric Tests</div>

            {reg.resistedTests.map(t => {
              const res = v(`res_${t.id}`);
              const interp = CYRIAX_STTT_INTERPRETATION[res];
              return (
                <div key={t.id} style={{ background:res?`${resColor(res)}10`:C.s2, border:`1px solid ${res?resColor(res)+"50":C.border}`, borderRadius:9, padding:12, marginBottom:9 }}>
                  <div style={{ fontWeight:700, color:C.text, marginBottom:3, fontSize:"0.82rem" }}>{t.label}</div>
                  <div style={{ fontSize:"0.8rem", color:C.muted, marginBottom:6 }}>🎯 Muscle tested: {t.muscle}</div>
                  <div style={{ background:C.s3, borderRadius:7, padding:8, marginBottom:8, fontSize:"0.74rem", color:C.muted, lineHeight:1.6 }}>
                    <strong style={{ color:C.yellow }}>How: </strong>{t.how}
                  </div>
                  <select value={res} onChange={e=>sv(`res_${t.id}`,e.target.value)} style={{...selectStyle, borderColor:resColor(res), fontWeight:res?700:400}}>
                    {RESULT_OPTIONS.map(o=><option key={o} value={o}>{o||"— select result —"}</option>)}
                  </select>
                  {interp && (
                    <div style={{ marginTop:8, padding:"8px 10px", background:`${interp.color}12`, border:`1px solid ${interp.color}40`, borderRadius:7 }}>
                      <div style={{ fontWeight:700, color:interp.color, fontSize:"0.74rem", marginBottom:3 }}>{interp.icon} {interp.tissue}</div>
                      <div style={{ fontSize:"0.82rem", color:C.text, lineHeight:1.6, marginBottom:4 }}>{interp.meaning}</div>
                      <div style={{ fontSize:"0.8rem", color:C.a3 }}><strong>Next step: </strong>{interp.nextStep}</div>
                    </div>
                  )}
                  <div style={{ marginTop:6 }}>
                    <input type="text" value={v(`res_notes_${t.id}`)} onChange={e=>sv(`res_notes_${t.id}`,e.target.value)} placeholder="Additional notes (e.g. painful at specific range, bilateral comparison)..." style={selectStyle}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── JOINT PLAY TAB ── */}
      {tab === "joint_play" && (
        <div>
          <div style={boxStyle}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.a3, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Joint Play / Accessory Motion Assessment</div>
            <div style={{ background:"rgba(0,201,122,0.06)", border:`1px solid ${C.a3}30`, borderRadius:8, padding:10, marginBottom:12, fontSize:"0.76rem", color:C.text, lineHeight:1.7 }}>
              Joint play tests assess the ACCESSORY MOVEMENTS that accompany physiological motion. Restriction in joint play → restriction in full ROM. Grade using Maitland (I–IV) or Kaltenborn (0–6). Hypomobile = mobilise. Hypermobile = stabilise.
            </div>

            {reg.jointPlay.map(t => (
              <div key={t.id} style={boxStyle}>
                <div style={{ fontWeight:700, color:C.text, marginBottom:5, fontSize:"0.82rem" }}>{t.label}</div>
                <div style={{ background:C.s3, borderRadius:7, padding:9, marginBottom:8, fontSize:"0.74rem", color:C.muted, lineHeight:1.6 }}>
                  <strong style={{ color:C.yellow }}>Method: </strong>{t.how}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div>
                    <div style={labelStyle}>Mobility Grade</div>
                    <select value={v(`jp_grade_${t.id}`)} onChange={e=>sv(`jp_grade_${t.id}`,e.target.value)} style={selectStyle}>
                      {["","0 — Ankylosed (no motion)","1 — Considerable restriction","2 — Slight restriction","3 — Normal","4 — Slight hypermobility","5 — Considerable hypermobility","6 — Unstable"].map(o=><option key={o} value={o}>{o||"— grade —"}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>Pain Response</div>
                    <select value={v(`jp_pain_${t.id}`)} onChange={e=>sv(`jp_pain_${t.id}`,e.target.value)} style={{...selectStyle, borderColor:v(`jp_pain_${t.id}`)?.includes("Pain")?"#ff4d6d":"#1a2d45"}}>
                      {["","No pain","Pain at end of range","Pain throughout movement","Pain reproduced = local","Pain reproduced = referred","Discomfort only"].map(o=><option key={o} value={o}>{o||"— pain? —"}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop:7 }}>
                  <div style={labelStyle}>Notes / Treatment Grade Indicated</div>
                  <input type="text" value={v(`jp_notes_${t.id}`)} onChange={e=>sv(`jp_notes_${t.id}`,e.target.value)} placeholder="e.g. Grade III PA mobilisation indicated, hypomobile L4/5..." style={selectStyle}/>
                </div>
              </div>
            ))}

            {/* Palpation section */}
            <div style={{ ...boxStyle, borderColor:`${reg.color}30` }}>
              <div style={{ fontWeight:700, color:reg.color, marginBottom:8, fontSize:"0.82rem" }}>Palpation — Exact Lesion Localisation</div>
              <div style={{ fontSize:"0.74rem", color:C.muted, marginBottom:8, lineHeight:1.6 }}>After STTT identifies the tissue type, palpate to find the EXACT site of lesion. This is where DTFM is applied. STTT rule: all treatment must reach the lesion.</div>
              <div style={{ marginBottom:7 }}>
                <div style={labelStyle}>Lesion Site (palpation)</div>
                <input type="text" value={v("palpation_site")} onChange={e=>sv("palpation_site",e.target.value)} placeholder="e.g. Infraspinatus tendon, 2cm proximal to insertion at greater tuberosity" style={selectStyle}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <div style={labelStyle}>Tissue Texture</div>
                  <select value={v("palp_texture")} onChange={e=>sv("palp_texture",e.target.value)} style={selectStyle}>
                    {["","Normal","Thickened / indurated","Ropy / nodular (trigger point)","Boggy / oedematous","Hard / fibrotic","Crepitus on movement","Warmth present"].map(o=><option key={o} value={o}>{o||"— texture —"}</option>)}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Temperature</div>
                  <select value={v("palp_temp")} onChange={e=>sv("palp_temp",e.target.value)} style={selectStyle}>
                    {["","Normal","Warm / hot (acute inflammation)","Cool (chronic / circulatory)","Localised warmth only"].map(o=><option key={o} value={o}>{o||"— temperature —"}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CLINICAL REASONING TAB ── */}
      {tab === "reason" && (
        <div>
          <button type="button" onClick={runReasoning}
            style={{ width:"100%", padding:"12px", background:`linear-gradient(135deg,${C.accent},${C.a2})`, border:"none", borderRadius:10, color:"#000", fontWeight:800, fontSize:"0.88rem", cursor:"pointer", marginBottom:16 }}>
            🧠 Generate STTT Clinical Reasoning
          </button>

          {reasoning ? (
            <div>
              {/* Tissue type banner */}
              <div style={{ background:"rgba(0,229,255,0.08)", border:`1px solid ${C.accent}40`, borderRadius:10, padding:14, marginBottom:12, textAlign:"center" }}>
                <div style={{ fontSize:"1.1rem", fontWeight:800, color:C.accent, marginBottom:4 }}>{reasoning.tissueType}</div>
                <div style={{ fontSize:"0.75rem", color:C.muted }}>Confidence: {reasoning.confidence}</div>
              </div>

              {/* Red flags */}
              <div style={{ background:"rgba(255,77,109,0.08)", border:`1px solid ${C.red}40`, borderRadius:10, padding:12, marginBottom:12 }}>
                <div style={{ fontWeight:800, color:C.red, marginBottom:8, fontSize:"0.85rem", cursor:"pointer" }} onClick={()=>setShowRed(r=>!r)}>🚨 Red Flags for {reg.label} {showRed?"▲":"▼"}</div>
                {showRed && reg.redFlags.map((rf,i)=><div key={i} style={{ padding:"4px 8px", fontSize:"0.76rem", color:C.text, borderBottom:`1px solid rgba(255,77,109,0.1)` }}>⚠ {rf}</div>)}
              </div>

              {/* Findings */}
              {reasoning.findings.length > 0 && (
                <div style={{ ...boxStyle }}>
                  <div style={labelStyle}>Clinical Findings Summary</div>
                  {reasoning.findings.map((f,i)=><div key={i} style={{ padding:"5px 0", fontSize:"0.78rem", color:C.text, borderBottom:`1px solid ${C.border}` }}>• {f}</div>)}
                </div>
              )}

              {/* Diagnoses */}
              {reasoning.diagnoses.length > 0 && (
                <div style={{ ...boxStyle }}>
                  <div style={labelStyle}>Probable Diagnoses</div>
                  {reasoning.diagnoses.map((d,i)=>(
                    <div key={i} style={{ background:C.s3, borderRadius:8, padding:10, marginBottom:7, borderLeft:`3px solid ${i===0?C.accent:i===1?C.a2:C.a3}` }}>
                      <div style={{ fontWeight:700, color:C.text, marginBottom:3 }}>{i+1}. {d.name}</div>
                      <div style={{ fontSize:"0.8rem", color:C.muted, marginBottom:3 }}>{d.detail}</div>
                      <span style={{ fontSize:"0.75rem", padding:"1px 7px", borderRadius:8, background:d.confidence==="High"?"rgba(0,201,122,0.15)":"rgba(255,179,0,0.15)", color:d.confidence==="High"?C.green:C.yellow }}>{d.confidence} Confidence</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Differentials */}
              <div style={{ ...boxStyle }}>
                <div style={labelStyle}>Differential Diagnoses</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {reasoning.differentials.map((d,i)=><span key={i} style={{ padding:"3px 9px", borderRadius:10, fontSize:"0.82rem", background:C.s3, color:C.muted, border:`1px solid ${C.border}` }}>{d}</span>)}
                </div>
              </div>

              {/* Treatment */}
              {reasoning.treatment.length > 0 && (
                <div style={{ background:"rgba(0,201,122,0.06)", border:`1px solid ${C.a3}30`, borderRadius:10, padding:12, marginBottom:12 }}>
                  <div style={labelStyle}>Treatment Direction</div>
                  {reasoning.treatment.map((t,i)=>(
                    <div key={i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                      <span style={{ color:C.a3, fontWeight:700, flexShrink:0 }}>→</span>
                      <span style={{ fontSize:"0.78rem", color:C.text }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Next assessments */}
              <div style={{ ...boxStyle }}>
                <div style={labelStyle}>Suggested Next Assessments</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {reasoning.nextTests.map((t,i)=><span key={i} style={{ padding:"3px 9px", borderRadius:10, fontSize:"0.82rem", background:"rgba(0,229,255,0.1)", color:C.accent, border:`1px solid ${C.accent}30` }}>→ {t}</span>)}
                </div>
              </div>

              {/* Clinical notes */}
              <div style={boxStyle}>
                <div style={labelStyle}>Clinical Reasoning Notes</div>
                <textarea value={v("reasoning_notes")} onChange={e=>sv("reasoning_notes",e.target.value)}
                  placeholder="Add clinical reasoning, working diagnosis, treatment plan, follow-up..."
                  style={{ ...selectStyle, minHeight:80, resize:"vertical", display:"block" }}/>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:30, color:C.muted, background:C.s2, borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>⚕</div>
              <div style={{ fontWeight:700, color:C.text, marginBottom:4 }}>Complete Active, Passive, and Resisted tabs</div>
              <div style={{ fontSize:"0.8rem" }}>Then click Generate to receive STTT clinical reasoning, tissue diagnosis, and treatment direction.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const SEP_S="|||";
const RC_S={"Cervical spine":"#7c3aed","Thoracic spine":"#d97706","Lumbar / SI":"#dc2626","Shoulder (L)":"#0891b2","Shoulder (R)":"#06b6d4","Elbow/Wrist/Hand":"#059669","Hip / Groin":"#FBCFE8","Knee (L)":"#f59e0b","Knee (R)":"#eab308","Ankle / Foot":"#16a34a"};
const ALL_REGIONS_S=Object.keys(RC_S);
// Baby-pink (Hip/Groin) is too light for white text/labels to stay
// readable against it -- everywhere regCol is used as a *text* color
// (region header title/tags, active region-tab label) needs a darker
// on-brand variant instead. All other region colors are dark/saturated
// enough that white or the raw color already reads fine as text, so
// this only overrides the one region that needed it.
const RC_TEXT_OVERRIDE={"Hip / Groin":"#9d174d"};
function NavActionBtn({ btn, onNav, PC, alwaysShowWhy = false }) {
  const [showWhy, setShowWhy] = React.useState(false);
  const whyOpen = alwaysShowWhy || showWhy;
  const clickable = !!btn.nav;
  const col = clickable ? btn.col : PC.muted;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", gap:4 }}>
        <button
          onClick={clickable ? ()=>onNav(btn.nav, btn.ctx || {}) : undefined}
          disabled={!clickable}
          style={{ flex:1, display:"flex", alignItems:"center", gap:6, padding:"7px 10px",
            background:`${col}12`, border:`1px solid ${col}30`, borderRadius:"7px 0 0 7px",
            color:col, cursor: clickable ? "pointer" : "default", fontSize:"0.67rem", fontWeight:700,
            textAlign:"left", transition:"all 0.15s" }}>
          <span style={{fontSize:"0.9rem",flexShrink:0}}>{btn.icon}</span>
          <span>{btn.label}</span>
        </button>
        <button
          onClick={()=>setShowWhy(w=>!w)}
          style={{ padding:"7px 8px", background:`${col}08`,
            border:`1px solid ${col}20`, borderLeft:"none",
            borderRadius:"0 7px 7px 0", color:PC.muted, cursor:"pointer",
            fontSize:"0.78rem", fontWeight:800 }}>
          ?
        </button>
      </div>
      {btn.detail && (
        <div style={{ fontSize:"0.8rem", color:PC.text, padding:"1px 4px 2px", lineHeight:1.45 }}>
          <span style={{ color:col, fontWeight:700 }}>For this patient: </span>{btn.detail}
        </div>
      )}
      {whyOpen && btn.why && (
        <div style={{ fontSize: alwaysShowWhy ? "0.78rem" : "0.82rem", color:PC.muted,
          padding: alwaysShowWhy ? "2px 4px 3px" : "5px 8px",
          background: alwaysShowWhy ? "transparent" : PC.s3,
          borderRadius: alwaysShowWhy ? 0 : "0 0 6px 6px",
          border: alwaysShowWhy ? "none" : `1px solid ${col}20`, borderTop:"none",
          lineHeight:1.5, whiteSpace:"pre-line", fontStyle: alwaysShowWhy ? "italic" : "normal" }}>
          {btn.why}
        </div>
      )}
    </div>
  );
}



// ══════════════════════════════════════════════════════════════════════════════
// LUMBAR ENGINE (L01-L11) OBJECTIVE TEST -> NAV TARGET MAPPING
// The lumbarReasoningEngine.js objectiveTests.{required,recommended} arrays
// are free-text test names (grounded in Magee/Kisner&Colby, not app internals).
// This maps ONLY the subset that has a real, unambiguous 1:1 implemented
// module in this app -- same accuracy bar as the rest of this engine: no
// invented mappings. A test with no genuine implemented equivalent (imaging,
// palpation, outcome-measure questionnaires, PA glides, PPIVMs, Farfan/
// Pheasant/H&I, etc.) is deliberately left non-clickable rather than pointed
// at a module that doesn't actually test it.
// ══════════════════════════════════════════════════════════════════════════════
const LUMBAR_ROM_HIGHLIGHTS = ["rom_lflex","rom_lext","rom_llfl","rom_llfr","rom_lrotl","rom_lrotr"];
const LUMBAR_NEURO_HIGHLIGHTS = ["n_l4","n_l5","n_s1","n_s2","nt_slr","nt_slump"];
const LUMBAR_CORE_MMT_HIGHLIGHTS = ["mmt_multif","mmt_ta","mmt_ql","mmt_diaphragm","mmt_oblique"];

function lumbarTestNav(testStr) {
  const s = String(testStr || "");
  // Exclusions first: tests that share a word with a mapped test but are
  // clinically distinct and have no dedicated implementation of their own.
  if (/active slr|active straight leg|\baslr\b/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_active_slr" },
      why:"Active SLR (Mens) - a lumbopelvic load-transfer test, NOT the neural SLR. Heaviness raising the leg that eases with manual pelvic compression = impaired force closure / SIJ dysfunction (87% sens, 94% spec)." };
  if (/crossed slr/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_slr_test" },
      why:"Crossed SLR - raising the UNAFFECTED leg reproduces the patient's radicular pain. ~90% specific for lumbar disc herniation. Recorded as the Crossed SLR positive option on the SLR test card." };

  if (/slump test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_slump_test" },
      why:"Slump — more sensitive than SLR for disc herniation. Reproduces radicular symptoms in flexed posture." };
  if (/femoral nerve tension test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_femoral_nerve_stretch" },
      why:"FNST — 88% sensitivity for L2/3/4 femoral nerve tension. Prone knee flexion reproducing anterior thigh pain = positive." };
  if (/quadrant test|kemp'?s test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_kemp" },
      why:"Kemp's — facet loading test. Positive = ipsilateral facet referral or foraminal stenosis." };
  if (/stork/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_stork" },
      why:"Stork Test — single-leg lumbar extension loading. Ipsilateral LBP in a young athlete is highly suspicious for spondylolysis/spondylolisthesis." };
  if (/sij provocation cluster/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar" },
      why:"A cluster, not one test — Compression, Distraction, Sacral Thrust (Thigh Thrust), Gaenslen's all live on this page. 3+ positive = 91% specific for SIJ." };
  if (/standing.*flexion|sitting.*flexion|flexion test|gillet|stork.*sij|piedallu/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar" },
      why:"Standing/sitting flexion (Gillet / Piedallu) motion tests have weak inter-rater reliability on their own — cross-check against the SIJ provocation cluster (Compression, Distraction, Thigh Thrust, Gaenslen's) on this page. 3+ positive = 91% specific for SIJ." };
  if (/faber/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"hip", highlightTest:"st_faber_test" },
      why:"FABER/Patrick's — SIJ and hip joint provocation. 77% sensitivity. Cross-check against the SIJ cluster above." };
  if (/\bslr\b/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_slr_test" },
      why:"SLR — 80% sensitivity for L4/L5/S1 nerve root compression. Positive < 60° = neural involvement." };

  if (/neuro(logical)? screen/i.test(s))
    return { icon:"\u26a1", col:"#dc2626", nav:"neuro", ctx:{ neuroHighlights: LUMBAR_NEURO_HIGHLIGHTS },
      why:"L1-S2 dermatomes, myotomes, patella/achilles reflexes. Localise disc level. Rule out cauda equina." };

  if (/core\/?lumbopelvic motor control|core assessment/i.test(s))
    return { icon:"\ud83d\udcaa", col:"#7c3aed", nav:"mmt", ctx:{ mmtRegion:"Spine & Core", mmtHighlights: LUMBAR_CORE_MMT_HIGHLIGHTS },
      why:"Multifidus atrophies within 24hrs of acute LBP and does not recover spontaneously (Hides 1994). Transversus abdominis is the first-to-fire stabiliser and its activation is delayed in LBP (Hodges 1996). Assess both before any loading programme." };

  if (/functional (movement )?screen|functional testing/i.test(s))
    return { icon:"\ud83c\udfc3", col:"#059669", nav:"fma", ctx:{ fsRegion:"lumbar" },
      why:"Forward bend — hip hinge vs lumbar flexion. Squat — global lower chain. Single-leg — SIJ control." };

  if (/lumbar arom|repeated movement/i.test(s))
    return { icon:"\ud83d\udcd0", col:"#9333ea", nav:"rom", ctx:{ romRegion:"Lumbar", romHighlights: LUMBAR_ROM_HIGHLIGHTS },
      why:"Flexion — discogenic aggravator; test for centralisation with repeated movements (McKenzie). Extension — facet/stenosis pattern, reproduces symptoms and tests centralisation the opposite direction. Side flexion asymmetry — lateral shift/disc protrusion screen." };


  if (/passive lumbar extension/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_passive_lumbar_ext" },
      why:"Passive Lumbar Extension — the most accurate test for lumbar instability (84% sens, 90% spec). LBP/heaviness that eases on lowering the legs = positive." };
  if (/pheasant test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_pheasant" },
      why:"Pheasant — prone PA pressure with passive lumbar hyperextension; radiating pain or a segment 'giving' suggests instability." };
  if (/farfan torsion/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_farfan_torsion" },
      why:"Farfan Torsion — controlled rotational stress across a segment; reproduces facet/annular pain under torsion." };
  if (/h and i stability|h & i/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_h_and_i" },
      why:"McKenzie H and I tests — map the direction of a mechanical block to establish the direction of preference." };
  if (/bicycle test|van gelderen/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_bicycle_van_gelderen" },
      why:"Bicycle Test of van Gelderen — symptoms eased by forward-lean (flexion) despite continued effort = neurogenic (stenosis); unchanged = vascular claudication." };
  if (/stoop test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_stoop" },
      why:"Stoop Test — walking-induced leg pain relieved by trunk flexion; characteristic of neurogenic claudication from canal stenosis." };
  if (/observation|posture screen/i.test(s))
    return { icon:"\ud83d\udc41\ufe0f", col:"#7c3aed", nav:"observation", ctx:{ obsRegion:"lx" },
      why:"Lumbar lordosis (loss = disc/guarding, increased = facet), lateral shift/scoliosis, pelvic obliquity, paraspinal bulk asymmetry, and antalgic/Trendelenburg gait." };
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// CERVICAL ENGINE (C01-C11) OBJECTIVE TEST -> NAV TARGET MAPPING
// Same design and same accuracy bar as lumbarTestNav() above: only maps the
// subset of cervicalReasoningEngine.js's objectiveTests.{required,recommended}
// strings that have a real, unambiguous 1:1 implemented module in this app.
// Imaging, palpation, PA glides, outcome measures (NDI), and Tinel's sign
// (no dedicated distal-entrapment module yet) are deliberately left
// non-clickable rather than pointed at a module that doesn't actually test
// them -- an honest gap, not a wrong pointer.
// ══════════════════════════════════════════════════════════════════════════════
const CERVICAL_ROM_HIGHLIGHTS = ["rom_crotl","rom_crotr","rom_cflex","rom_cext","rom_clatl","rom_clatr"];
const CERVICAL_NEURO_HIGHLIGHTS = ["n_c5","n_c6","n_c7","n_c8","n_t1","nt_ultt1","nt_slump"];
const CERVICAL_MMT_HIGHLIGHTS = ["mmt_dnf","mmt_scm","mmt_trapU","mmt_scalenes","mmt_suboccip"];

function cervicalTestNav(testStr) {
  const s = String(testStr || "");

  if (/tinel'?s sign at wrist/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"elbow_wrist", highlightTest:"st_tinel_wrist" },
      why:"Tinel's at the wrist — median nerve / carpal tunnel. A positive result here (not at the neck) points to a distal peripheral entrapment (C09), not cervical radiculopathy (C02)." };
  if (/tinel'?s sign at elbow/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"elbow_wrist", highlightTest:"st_tinel_elbow" },
      why:"Tinel's at the elbow — ulnar nerve / cubital tunnel. Same logic as the wrist version: a distal, single-nerve finding argues against a cervical nerve-root source." };
  if (/ultt1/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_ultt1" },
      why:"ULTT1 — median nerve tension. Upper-limb equivalent of the SLR; double-crush check against cervical nerve root involvement." };
  if (/ultt2/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_ultt2" },
      why:"ULTT2 — radial nerve bias. Differentiates radial nerve tension from median (ULTT1) or ulnar (ULTT3) involvement." };
  if (/ultt3/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_ultt3" },
      why:"ULTT3 — ulnar nerve bias. Completes the three-nerve upper limb tension screen alongside ULTT1/2." };
  if (/spurling'?s test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_spurling" },
      why:"Spurling's — highest specificity (~92%) for cervical radiculopathy. Foraminal compression test; run first if arm symptoms present." };
  if (/cervical distraction test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_distraction" },
      why:"Distraction — relief with axial traction supports a foraminal/nerve-root source, the mirror image of Spurling's." };
  if (/sharp-?purser test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_sharp_purser" },
      why:"Sharp-Purser — atlantoaxial (C1-C2) instability screen. Mandatory before any upper cervical manipulation." };
  if (/alar ligament test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_alar" },
      why:"Alar ligament stress test — C1-C2 stability. Run alongside Sharp-Purser before end-range cervical rotation testing." };
  if (/3-part test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_vbi" },
      why:"VBI / 3-Part Test — vertebral artery patency screen. Mandatory before manipulation or sustained end-range rotation." };
  if (/flexion-rotation test|\bfrt\b/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_flex_rot" },
      why:"Flexion-Rotation Test — positive for pain/dysfunction at C1-C2 in cervicogenic headache (Magee)." };
  if (/jackson'?s compression test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_jackson" },
      why:"Jackson's Compression — axial loading reproduces facet or nerve-root referral pain." };
  if (/cervical rotation lateral flexion|\bcrlf\b/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_cervical_rotation_lt" },
      why:"CRLF — screens for first-rib elevation restricting cervical rotation/lateral flexion." };
  if (/adson'?s test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_adson" },
      why:"Adson's — thoracic outlet / scalene compression of the subclavian artery. Weight symptom reproduction over pulse change alone." };
  if (/costoclavicular|military brace/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_costoclavicular" },
      why:"Costoclavicular (Military Brace) — narrows the space between clavicle and first rib to reproduce TOS symptoms." };
  if (/roos test|elevated arm stress|\beast\b/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_roos_east" },
      why:"Roos / EAST — 3-minute elevated-arm stress test; the most sensitive screen for thoracic outlet syndrome." };
  if (/cyriax release test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_cyriax_release" },
      why:"Cyriax Release — unloading the shoulder girdle provokes a release-phenomenon paraesthesia in TOS." };
  if (/first thoracic nerve root|t1 nerve root stretch/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_t1_nerve_stretch" },
      why:"First thoracic nerve root stretch — arm abducted with elbow flexed; scapular/medial-arm pain implicates a T1 root lesion." };

  if (/neurological screen/i.test(s))
    return { icon:"\u26a1", col:"#dc2626", nav:"neuro", ctx:{ neuroHighlights: CERVICAL_NEURO_HIGHLIGHTS },
      why:"C5-T1 dermatomes, myotomes, biceps/brachioradialis/triceps reflexes. Localise nerve root level; screen for myelopathic signs." };

  if (/functional (movement )?screen|functional testing/i.test(s))
    return { icon:"\ud83c\udfc3", col:"#059669", nav:"fma", ctx:{ fsRegion:"cervical" },
      why:"Deep neck flexor endurance and functional overhead/rotation tasks under load -- reveals compensation patterns a static exam misses." };

  if (/postural assessment/i.test(s))
    return { icon:"\ud83e\uddcd", col:"#059669", nav:"posture", ctx:{ region:"Cervical" },
      why:"Forward head posture, CVA, thoracic kyphosis — all increase cervical loading and headache trigger load." };

  if (/gait assessment/i.test(s))
    return { icon:"\ud83d\udeb6", col:"#059669", nav:"gait", ctx:{},
      why:"A wide-based, unsteady, or myelopathic gait pattern is a key sign of cervical cord compression — screen before proceeding." };

  if (/cervical arom/i.test(s))
    return { icon:"\ud83d\udcd0", col:"#9333ea", nav:"rom", ctx:{ romRegion:"Cervical", romHighlights: CERVICAL_ROM_HIGHLIGHTS },
      why:"Rotation L+R — most clinically relevant plane; restriction below ~60° (of a ~90° norm) suggests C1-C2 involvement, cross-check with the Flexion-Rotation Test. Flexion — discogenic aggravator, test for centralisation. Extension + rotation quadrant — facet loading, reproduces facet or radicular pain." };

  if (/cervical mmt|deep cervical flexor/i.test(s))
    return { icon:"\ud83d\udcaa", col:"#7c3aed", nav:"mmt", ctx:{ mmtRegion:"Cervical", mmtHighlights: CERVICAL_MMT_HIGHLIGHTS },
      why:"Deep cervical flexors (craniocervical flexion test) are the most commonly inhibited muscle group in cervical dysfunction and a key forward-head-posture driver (Jull 2008). Deep neck extensors (cervical multifidus) atrophy in chronic cervical pain (Elliott 2006)." };


  if (/observation|posture screen/i.test(s))
    return { icon:"\ud83d\udc41\ufe0f", col:"#7c3aed", nav:"observation", ctx:{ obsRegion:"cx" },
      why:"Forward head posture and thoracic kyphosis, scapular elevation / upper-trap hypertrophy, resting cervical rotation asymmetry, and shoulder height." };
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// THORACIC ENGINE (T01-T11) OBJECTIVE TEST -> NAV TARGET MAPPING
// Same accuracy bar as lumbarTestNav()/cervicalTestNav(): only maps the
// subset of thoracicReasoningEngine.js's objectiveTests.{required,recommended}
// strings that have a real, unambiguous 1:1 implemented module in this app.
// Confirmed via grep that this app has NO dedicated Adson's, Costoclavicular,
// Roos/EAST, Cyriax Release, First Thoracic Nerve Root Stretch, Passive
// Scapular Approximation, or Evjenth-Gloeck breath-hold modules -- these
// stay non-clickable (honest gap, not a wrong pointer), same policy as
// imaging/palpation/outcome-measure strings across all three engines.
// ══════════════════════════════════════════════════════════════════════════════
const THORACIC_ROM_HIGHLIGHTS = ["rom_throtl","rom_throtr","rom_thflex","rom_thext"];
const THORACIC_MMT_HIGHLIGHTS = ["mmt_trapL","mmt_trapM","mmt_serratus","mmt_trapU","mmt_rhomb"];

function thoracicTestNav(testStr) {
  const s = String(testStr || "");

  if (/slump test/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_slump_test" },
      why:"Slump Test (add trunk rotation per Butler for intercostal nerve stress) -- reproduces radicular/dural symptoms in a flexed, loaded posture." };
  if (/cervical rotation lateral flexion|\bcrlf\b/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_cervical_rotation_lt" },
      why:"CRLF -- Magee-described as testing first-rib elevation restricting cervical rotation/lateral flexion, directly relevant to thoracic outlet syndrome (T04)." };

  if (/rib spring|rib springing/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"thoracic", highlightTest:"st_rib_spring" },
      why:"Rib Springing -- prone PA spring over each rib angle, level by level, comparing sides; localised pain/stiffness implicates costovertebral/costotransverse dysfunction (or a fractured rib -- spring gently)." };
  if (/passive scapular approximation/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"thoracic", highlightTest:"st_passive_scapular_approx" },
      why:"Passive Scapular Approximation -- prone scapular retraction reproducing upper-thoracic/scapular pain implicates a T1-T4 root or facet source rather than local muscle." };
  if (/forestier|bowstring/i.test(s))
    return { icon:"\ud83d\udd2c", col:"#0891b2", nav:"special", ctx:{ specialRegion:"thoracic", highlightTest:"st_forestier_bowstring" },
      why:"Forestier's Bowstring Sign -- contralateral paraspinals staying taut on side-flexion; associated with ankylosing spondylitis and marked paraspinal guarding." };
  if (/rib mobility|functional (movement )?screen|functional testing/i.test(s))
    return { icon:"\ud83c\udfc3", col:"#059669", nav:"fma", ctx:{ fsRegion:"thoracic" },
      why:"Pump handle (ribs 1-5) and bucket handle (ribs 6-10) rib-mobility screens live in this functional module." };

  if (/neurological screen/i.test(s))
    return { icon:"\u26a1", col:"#dc2626", nav:"neuro", ctx:{},
      why:"Screen for cord-compression signs (bilateral leg weakness/sensory change, hyperreflexia) before proceeding -- this app has no dedicated T2-T12 dermatome table, so nothing is pre-highlighted; use the neuro module's general reflex/sensation testing." };

  if (/postural assessment/i.test(s))
    return { icon:"\ud83e\uddcd", col:"#059669", nav:"posture", ctx:{ region:"Thoracic" },
      why:"Kyphosis angle, forward head, scapular position -- the postural drivers behind both round-back kyphosis (T06) and thoracic outlet loading (T04)." };

  if (/thoracic arom/i.test(s))
    return { icon:"\ud83d\udcd0", col:"#9333ea", nav:"rom", ctx:{ romRegion:"Thoracic", romHighlights: THORACIC_ROM_HIGHLIGHTS },
      why:"Rotation -- most thoracic-sensitive plane (Magee); <30\u00b0 bilateral = significant restriction. Extension -- capsular pattern check. Compare for a hinge point vs. even, distributed motion." };

  if (/thoracic mmt/i.test(s))
    return { icon:"\ud83d\udcaa", col:"#7c3aed", nav:"mmt", ctx:{ mmtRegion:"Shoulder & Scapula", mmtHighlights: THORACIC_MMT_HIGHLIGHTS },
      why:"Lower/mid/upper trapezius, serratus anterior, rhomboids -- weakness here maintains a kyphotic, round-back posture (T06) and is the muscle group most often implicated in thoracic myofascial referral (T09, Magee Table 8-8)." };


  if (/observation|posture screen/i.test(s))
    return { icon:"\ud83d\udc41\ufe0f", col:"#7c3aed", nav:"observation", ctx:{ obsRegion:"th" },
      why:"Thoracic kyphosis / scoliosis (Adams forward bend), rib-cage symmetry, scapular position and winging, and breathing pattern (thoracic vs diaphragmatic)." };
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// REGION-SPECIFIC NAV CONFIG
// Maps each subjective region → exact module + navContext payload
// All region keys must match runEngineV6 output strings exactly.
// ══════════════════════════════════════════════════════════════════════════════
const REGION_NAV = {
  "Cervical spine": [
    { label:"Cervical ROM",       icon:"📐", nav:"rom",    ctx:{ romRegion:"Cervical", romHighlights:["rom_crotl","rom_crotr","rom_cflex","rom_cext","rom_clatl","rom_clatr"] }, col:"#9333ea", why:"Cervical rotation — most restricted in facet arthropathy and disc. Compare bilateral immediately." },
    { label:"Cervical MMT",       icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Cervical", mmtHighlights:["mmt_dnf","mmt_scm","mmt_trapU","mmt_scalenes","mmt_suboccip"] },        col:"#7c3aed", why:"Deep neck flexors — the single most important cervical motor control test (CCFT protocol)." },
    { label:"Spurling Test",      icon:"🔬", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_spurling" },                            col:"#0891b2", why:"Highest specificity (92%) for cervical radiculopathy — foramen closure test. Run first if arm symptoms." },
    { label:"Slump / ULTT",       icon:"🔬", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_slump_test" },                            col:"#0891b2", why:"Slump test — neural tension screen. ULTT 1-4 differentiates median, radial, ulnar nerve involvement." },
    { label:"Neurological Screen",icon:"⚡", nav:"neuro",   ctx:{ neuroHighlights:["n_c5","n_c6","n_c7","n_c8","n_t1","nt_ultt1","nt_slump"] }, col:"#dc2626", why:"C5-T1 dermatomes, myotomes, biceps/brachio/triceps reflexes. Localise nerve root level." },
    { label:"Posture Analysis",   icon:"🧍", nav:"posture", ctx:{ region:"Cervical" },                                                                col:"#059669", why:"CVA, forward head, thoracic kyphosis — all increase cervical loading. Assess before treating." },
    { label:"CPA Assessment",     icon:"⚡", nav:"nkt",     ctx:{ nktRegion:"cervical", nktHighlights:["nkt_dnf","nkt_scm","nkt_upper_trap","nkt_scalenes","nkt_levator_scap","nkt_suboccip"] }, col:"#d97706", why:"DNF inhibition → SCM/scalene dominance → FHP maintained. CPA identifies the exact inhibitor." },
    { label:"Kinetic Chain",      icon:"⛓️", nav:"kinetic", ctx:{ kcRegion:"thoracic", kcHighlights:["kc_thoracic_rotation","kc_thoracic_extension","kc_rib_mobility","kc_cervical_thoracic_jct"] }, col:"#7c3aed", why:"Thoracic kyphosis is the primary driver of cervical loading. Address thoracic before cervical." },
    { label:"STTT Screen",       icon:"🦴", nav:"cyriax_full", ctx:{ cyriaxHighlights:["cx_a_flex","cx_a_ext","cx_a_rotl","cx_a_rotr","cx_r_flex","cx_r_ext"] }, col:"#f59e0b", why:"Selective tissue tension — differentiate contractile vs non-contractile cervical pain source." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_skin_roll","fa_passive_tension","fa_densification"] }, col:"#059669", why:"Cervical fascial lines — skin rolling and passive tension identify SBL and thoracolumbar restriction." },
  ],
  "Lumbar / SI": [
    { label:"Lumbar ROM",           icon:"📐", nav:"rom",    ctx:{ romRegion:"Lumbar", romHighlights:["rom_lflex","rom_lext","rom_llfl","rom_llfr","rom_lrotl","rom_lrotr"] },                                     col:"#9333ea", why:"Lumbar flexion — establishes direction of pain provocation. McKenzie: flexion or extension preference?" },

    { label:"Core MMT",            icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Spine & Core", mmtHighlights:["mmt_multif","mmt_ta","mmt_ql","mmt_diaphragm","mmt_oblique"] },                              col:"#7c3aed", why:"Multifidus — segmental stabiliser most inhibited in LBP. Assess before any loading programme." },
    { label:"SLR Test",            icon:"🔬", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_slr_test" },                             col:"#0891b2", why:"SLR — 80% sensitivity for L4/L5/S1 nerve root compression. Positive < 60° = neural involvement." },
    { label:"Slump Test",          icon:"🔬", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_slump_test" },                           col:"#0891b2", why:"Slump — more sensitive than SLR for disc herniation. Reproduces radicular symptoms in flexed posture." },
    { label:"Kemp's Test",         icon:"🔬", nav:"special", ctx:{ specialRegion:"lumbar", highlightTest:"st_kemp" },                                 col:"#0891b2", why:"Kemp's — facet loading test. Positive = ipsilateral facet referral or foraminal stenosis." },
    { label:"Neurological Screen", icon:"⚡", nav:"neuro",   ctx:{ neuroHighlights:["n_l4","n_l5","n_s1","n_s2","nt_slr","nt_slump"] }, col:"#dc2626", why:"L1-S2 dermatomes, myotomes, patella/achilles reflexes. Localise disc level. Rule out cauda equina." },
    { label:"Functional Screen",   icon:"🏃", nav:"fma",     ctx:{ fsRegion:"lumbar" }, col:"#059669", why:"Forward bend — observe hip hinge vs lumbar flexion. Squat — global lower chain. Single-leg — SIJ control." },
  ],
  "Shoulder (L)": [
    { label:"STTT Screen",       icon:"🦴", nav:"cyriax_full", ctx:{ cyriaxHighlights:["sh_a_flex","sh_a_abd","sh_a_er","sh_r_abd","sh_r_er","sh_r_ir","sh_jp_inferior"] }, col:"#f59e0b", why:"Shoulder STTT — painful arc pattern differentiates subacromial vs capsular vs AC joint vs contractile source." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_passive_tension","fa_active_line_load","fa_sbl_hamstring","fa_tlf"] }, col:"#059669", why:"TLF and SBL — thoracolumbar fascia is the primary fascial structure linking lumbar extensors to contralateral shoulder." },
    { label:"Shoulder ROM",         icon:"📐", nav:"rom",    ctx:{ romRegion:"Shoulder", romHighlights:["rom_sabd","rom_ser","rom_sflex","rom_sir","rom_sext","rom_sadd"] }, col:"#9333ea", why:"Painful arc 60-120° = subacromial. Full loss = capsular. Immediate clinical differentiator." },

    { label:"Shoulder MMT",         icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Shoulder & Scapula", mmtHighlights:["mmt_supra","mmt_infra","mmt_serratus","mmt_trapL","mmt_subscap"] },                         col:"#7c3aed", why:"Supraspinatus — initiates abduction 0-30°. Most common RC tear location. Empty can position." },

    { label:"Hawkins-Kennedy",     icon:"🔬", nav:"special", ctx:{ specialRegion:"shoulder", highlightTest:"st_hawkins" },                            col:"#0891b2", why:"79% sensitivity for subacromial impingement. Most sensitive impingement test. Run first for overhead pain." },
    { label:"Empty Can Test",      icon:"🔬", nav:"special", ctx:{ specialRegion:"shoulder", highlightTest:"st_empty_can" },                          col:"#0891b2", why:"Supraspinatus integrity — 69% sensitivity. Combine with full can for RC tear screening." },
    { label:"CPA Assessment",      icon:"⚡", nav:"nkt",     ctx:{ nktRegion:"shoulder", nktHighlights:["nkt_upper_trap","nkt_pec_minor","nkt_lower_trap","nkt_serratus","nkt_infraspinatus"] }, col:"#d97706", why:"Upper trap/pec minor overactive → lower trap/serratus inhibited. Primary impingement motor pattern." },
    { label:"Functional Screen",    icon:"🏃", nav:"fma",     ctx:{ fsRegion:"shoulder" }, col:"#059669", why:"Push-up plus — best functional screen for serratus anterior. Scapular winging visible immediately." },
  ],
  "Shoulder (R)": [
    { label:"STTT Screen",       icon:"🦴", nav:"cyriax_full", ctx:{ cyriaxHighlights:["sh_a_flex","sh_a_abd","sh_a_er","sh_r_abd","sh_r_er","sh_r_ir","sh_jp_inferior"] }, col:"#f59e0b", why:"Painful arc pattern differentiates subacromial vs capsular vs AC joint vs contractile source." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_skin_roll","fa_passive_tension","fa_densification"] }, col:"#059669", why:"Anterior/lateral fascial lines — pec minor and bicipital groove fascia restrict shoulder mobility." },
    { label:"Shoulder ROM",         icon:"📐", nav:"rom",    ctx:{ romRegion:"Shoulder", romHighlights:["rom_sabd","rom_ser","rom_sflex","rom_sir","rom_sext","rom_sadd"] }, col:"#9333ea", why:"Painful arc 60-120° = subacromial. Full loss = capsular. Primary ROM differentiator." },

    { label:"Shoulder MMT",         icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Shoulder & Scapula", mmtHighlights:["mmt_supra","mmt_infra","mmt_serratus","mmt_trapL","mmt_subscap"] },                         col:"#7c3aed", why:"Supraspinatus — most common RC tear site. Empty can test position." },
    { label:"Serratus Anterior",   icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Shoulder & Scapula", mmtHighlight:"mmt_serratus" },                      col:"#7c3aed", why:"Serratus anterior — scapular winging indicates inhibition. Run wall push-up plus." },
    { label:"Hawkins-Kennedy",     icon:"🔬", nav:"special", ctx:{ specialRegion:"shoulder", highlightTest:"st_hawkins" },                            col:"#0891b2", why:"79% sensitivity for subacromial impingement. Most useful first impingement test." },
    { label:"Empty Can Test",      icon:"🔬", nav:"special", ctx:{ specialRegion:"shoulder", highlightTest:"st_empty_can" },                          col:"#0891b2", why:"Supraspinatus integrity test. Combine with full can for RC tear probability." },
    { label:"CPA Assessment",      icon:"⚡", nav:"nkt",     ctx:{ nktRegion:"shoulder", nktHighlights:["nkt_upper_trap","nkt_pec_minor","nkt_lower_trap","nkt_serratus","nkt_infraspinatus"] }, col:"#d97706", why:"Identify pec minor / upper trap inhibiting lower trap / serratus — the impingement motor pattern." },
    { label:"Functional Screen",    icon:"🏃", nav:"fma",     ctx:{ fsRegion:"shoulder" }, col:"#059669", why:"Push-up plus screens serratus anterior function dynamically." },
  ],
  "Knee (L)": [
    { label:"Knee ROM",             icon:"📐", nav:"rom",    ctx:{ romRegion:"Knee", romHighlights:["rom_kflex","rom_kext"] },                          col:"#9333ea", why:"Knee flexion loss indicates joint effusion, posterior capsule tightness, or meniscal block. Measure first." },
    { label:"STTT Screen",       icon:"🦴", nav:"cyriax_full", ctx:{ cyriaxHighlights:["kn_a_flex","kn_a_ext","kn_r_ext","kn_r_flex","kn_jp_tib_fem","kn_jp_medial_lat","kn_p_patellar"] }, col:"#f59e0b", why:"Knee STTT — resisted extension/flexion isolate quadriceps vs hamstring; joint play differentiates tibiofemoral vs patellofemoral source." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_sbl_hamstring","fa_passive_tension","fa_skin_roll"] }, col:"#059669", why:"SBL posterior chain — hamstring and IT band fascial restriction drives patellofemoral and knee pain patterns." },
    { label:"Knee MMT",             icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Knee", mmtHighlights:["mmt_quad","mmt_gastroc","mmt_poplit"] },           col:"#7c3aed", why:"VMO inhibition is the primary driver of PFJ maltracking. Single most important knee MMT." },
    { label:"Hip MMT",              icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Hip & Pelvis", mmtHighlights:["mmt_gmed","mmt_gmax","mmt_tfl","mmt_adduc","mmt_gmin"] }, col:"#7c3aed", why:"Glute med weakness drives dynamic knee valgus — assess proximal before isolating the knee." },
    { label:"Lachman Test",        icon:"🔬", nav:"special", ctx:{ specialRegion:"knee", highlightTest:"st_lachmans" },                               col:"#0891b2", why:"86% sensitivity for ACL. Best ACL test at 20-30° flexion. Run before pivot shift." },
    { label:"McMurray Test",       icon:"🔬", nav:"special", ctx:{ specialRegion:"knee", highlightTest:"st_mcmurray_test" },                          col:"#0891b2", why:"McMurray — meniscal integrity. Medial: valgus + ER. Lateral: varus + IR. Listen for click." },
    { label:"Step-Down Test",      icon:"🏃", nav:"fma",     ctx:{ fsRegion:"knee" }, col:"#059669", why:"Step-down — highest sensitivity test for PFJ and glute med weakness. Observe dynamic valgus." },
    { label:"Kinetic Chain",       icon:"⛓️", nav:"kinetic", ctx:{ kcRegion:"knee", kcHighlights:["kc_ankle_df","kc_hip_ir_mob","kc_knee_stability","kc_patellar_mobility","kc_hip_abd_mob"] }, col:"#7c3aed", why:"Ankle DF restriction and hip abductor weakness both drive knee valgus. Assess chain first." },
  ],
  "Knee (R)": [
    { label:"Knee ROM",             icon:"📐", nav:"rom",    ctx:{ romRegion:"Knee", romHighlights:["rom_kflex","rom_kext"] },                          col:"#9333ea", why:"Flexion loss indicates effusion, capsule tightness, or meniscal block." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_sbl_hamstring","fa_passive_tension","fa_skin_roll"] }, col:"#059669", why:"SBL posterior chain — hamstring and IT band fascial restriction drives patellofemoral and knee pain patterns." },
    { label:"Knee MMT",             icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Knee", mmtHighlights:["mmt_quad","mmt_gastroc","mmt_poplit"] },           col:"#7c3aed", why:"VMO inhibition drives PFJ maltracking. Primary knee MMT." },
    { label:"Hip MMT",              icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Hip & Pelvis", mmtHighlights:["mmt_gmed","mmt_gmax","mmt_tfl","mmt_adduc","mmt_gmin"] }, col:"#7c3aed", why:"Proximal hip abductor weakness drives dynamic valgus — always assess before knee." },
    { label:"Lachman Test",        icon:"🔬", nav:"special", ctx:{ specialRegion:"knee", highlightTest:"st_lachmans" },                               col:"#0891b2", why:"86% sensitivity for ACL. Gold standard test at 20-30° flexion." },
    { label:"McMurray Test",       icon:"🔬", nav:"special", ctx:{ specialRegion:"knee", highlightTest:"st_mcmurray_test" },                          col:"#0891b2", why:"Meniscal integrity — medial and lateral compartment provocation." },
    { label:"Step-Down Test",      icon:"🏃", nav:"fma",     ctx:{ fsRegion:"knee" }, col:"#059669", why:"Highest sensitivity for PFJ / glute med — observe dynamic valgus under load." },
    { label:"Kinetic Chain",       icon:"⛓️", nav:"kinetic", ctx:{ kcRegion:"knee", kcHighlights:["kc_ankle_df","kc_hip_ir_mob","kc_knee_stability","kc_patellar_mobility","kc_hip_abd_mob"] }, col:"#7c3aed", why:"Ankle DF and hip abductor chain — both drive valgus. Address before isolated knee work." },
  ],
  "Hip / Groin": [
    { label:"Hip ROM",              icon:"📐", nav:"rom",    ctx:{ romRegion:"Hip", romHighlights:["rom_hir","rom_her","rom_hflex","rom_hext","rom_habd","rom_hadd"] },                                          col:"#9333ea", why:"IR most restricted in hip OA (capsular pattern: IR > ER > abduction). FADIR reproduces impingement." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_sbl_hamstring","fa_passive_tension","fa_ll_test"] }, col:"#059669", why:"Lateral line + SBL — TFL/ITB and hamstring fascial restriction drive lateral hip and groin loading patterns." },
    { label:"Hip MMT",              icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Hip & Pelvis", mmtHighlights:["mmt_gmax","mmt_gmed","mmt_tfl","mmt_adduc","mmt_psoas"] },                                col:"#7c3aed", why:"Glute max — primary hip stabiliser and load transfer muscle. Prone hip extension with knee bent." },
    { label:"FADIR Test",          icon:"🔬", nav:"special", ctx:{ specialRegion:"hip", highlightTest:"st_fadir_test" },                              col:"#0891b2", why:"FADIR — hip impingement (FAI) provocation. Flexion + adduction + IR reproduces anterior groin pain." },
    { label:"FABER Test",          icon:"🔬", nav:"special", ctx:{ specialRegion:"hip", highlightTest:"st_faber_test" },                              col:"#0891b2", why:"FABER — hip, SIJ, and adductor provocation. Figure-4 position stresses all three simultaneously." },
    { label:"Step-Down / SLS",     icon:"🏃", nav:"fma",     ctx:{ fsRegion:"hip" }, col:"#059669", why:"Single-leg stance and step-down — reveal hip strategy and Trendelenburg under functional load." },
    { label:"Kinetic Chain",       icon:"⛓️", nav:"kinetic", ctx:{ kcRegion:"hip", kcHighlights:["kc_hip_ir_mob","kc_hip_ext_mob","kc_hip_er_mob","kc_hip_abd_mob","kc_lumbar_stability"] }, col:"#7c3aed", why:"Hip is the stability joint. Restricted ER drives lumbar and knee chain overload." },
  ],
  "Ankle / Foot": [
    { label:"Ankle ROM",            icon:"📐", nav:"rom",    ctx:{ romRegion:"Ankle", romHighlights:["rom_adf","rom_apf","rom_ainv","rom_aev"] },                                        col:"#9333ea", why:"Dorsiflexion — <35° weight-bearing is clinically significant. Primary kinetic chain driver." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_sbl_hamstring","fa_passive_tension","fa_active_line_load"] }, col:"#059669", why:"SBL / plantar fascia continuity — posterior chain restriction from hamstring to plantar fascia drives heel and midfoot pain." },
    { label:"Ankle MMT",            icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Ankle & Foot", mmtHighlights:["mmt_tp","mmt_ta","mmt_soleus","mmt_peronls","mmt_ehl"] },                                  col:"#7c3aed", why:"Tibialis posterior — medial arch controller. Weakness = pronation, tibial IR, knee valgus cascade." },
    { label:"Anterior Drawer",     icon:"🔬", nav:"special", ctx:{ specialRegion:"ankle_foot", highlightTest:"st_ant_drawer_ankle" },                 col:"#0891b2", why:"Anterior drawer — ATFL integrity. Most commonly injured ankle ligament. 73% sensitivity." },
    { label:"Thompson Test",       icon:"🔬", nav:"special", ctx:{ specialRegion:"ankle_foot", highlightTest:"st_thompson_test" },                    col:"#0891b2", why:"Thompson test — Achilles tendon rupture screen. 96% sensitivity. Squeeze calf = plantarflexion response." },
    { label:"Windlass Test",       icon:"🔬", nav:"special", ctx:{ specialRegion:"ankle_foot", highlightTest:"st_windlass_test" },                    col:"#0891b2", why:"Windlass — plantar fascia load test. Hallux extension tightens plantar fascia. Reproduces heel pain." },
    { label:"Foot / Ankle Chain",  icon:"⛓️", nav:"kinetic", ctx:{ kcRegion:"foot_ankle", kcHighlights:["kc_ankle_df","kc_subtalar","kc_great_toe","kc_tibiofemoral_rot"] }, col:"#7c3aed", why:"Ankle DF restriction drives tibial IR → knee valgus → hip adduction → lumbar extension cascade." },
    { label:"Gait Analysis",       icon:"🚶", nav:"gait",   ctx:{},                                                                                   col:"#059669", why:"Observe heel strike, midstance pronation control, push-off — ankle function visible in gait." },
  ],
  "Elbow/Wrist/Hand": [
    { label:"Elbow / Wrist ROM",   icon:"📐", nav:"rom",    ctx:{ romRegion:"Elbow", romHighlights:["rom_eflex","rom_eext","rom_esup","rom_epro","rom_wflex","rom_wext"] },                                      col:"#9333ea", why:"Elbow flexion/extension, forearm sup/pro — establish mobility baseline and end-feel quality." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_skin_roll","fa_passive_tension","fa_densification"] }, col:"#059669", why:"Upper-limb superficial front/back arm lines — forearm and bicipital fascia densification restricts elbow and wrist mobility." },
    { label:"Elbow / Wrist MMT",   icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Wrist & Hand", mmtHighlights:["mmt_ecrb","mmt_fcr","mmt_bicep","mmt_tricep","mmt_brachio"] },                                col:"#7c3aed", why:"ECRB — primary lateral epicondylalgia culprit. Test in elbow extension for maximum provocation." },
    { label:"Cozen's Test",        icon:"🔬", nav:"special", ctx:{ specialRegion:"elbow_wrist", highlightTest:"st_cozens" },                          col:"#0891b2", why:"Cozen's — lateral epicondylalgia provocation. Resisted wrist extension with pronation. High specificity." },
    { label:"Phalen's Test",       icon:"🔬", nav:"special", ctx:{ specialRegion:"elbow_wrist", highlightTest:"st_phalen" },                          col:"#0891b2", why:"Phalen's — carpal tunnel screen. 68% sensitivity. Wrist flexion 60s reproduces median nerve symptoms." },
    { label:"Cervical Screen",     icon:"🔬", nav:"special", ctx:{ specialRegion:"cervical", highlightTest:"st_spurling" },                           col:"#dc2626", why:"Always screen cervical — C5/C6 referral mimics lateral elbow pain. Spurling test before isolating elbow." },
    { label:"ULTT Neural",         icon:"🔬", nav:"special", ctx:{ specialRegion:"neural", highlightTest:"st_ultt1" },                                col:"#0891b2", why:"ULTT 1-4 — upper limb neural tension. Double crush phenomenon: cervical + peripheral nerve." },
    { label:"Functional Reach",    icon:"🏃", nav:"fma",     ctx:{ fsRegion:"elbow" }, col:"#059669", why:"Upper limb functional reach — assesses full proximal chain contribution to elbow/wrist loading." },
  ],
  "Thoracic spine": [
    { label:"Thoracic ROM",          icon:"📐", nav:"rom",   ctx:{ romRegion:"Thoracic", romHighlights:["rom_throtl","rom_throtr","rom_thflex","rom_thext"] },                                  col:"#9333ea", why:"Thoracic rotation — most clinically significant thoracic ROM. <30° bilateral = significant restriction." },
    { label:"Thoracic MMT",         icon:"💪", nav:"mmt",    ctx:{ mmtRegion:"Shoulder & Scapula", mmtHighlights:["mmt_trapL","mmt_trapM","mmt_serratus","mmt_trapU","mmt_rhomb"] },                         col:"#7c3aed", why:"Lower trapezius — scapular depression and posterior tilt. Weakness = shoulder and thoracic impingement driver." },
    { label:"Posture Analysis",    icon:"🧍", nav:"posture", ctx:{ region:"Thoracic" },                                                               col:"#059669", why:"Kyphosis angle, scoliotic curve, rib symmetry, scapular position — thoracic posture drives all chains above and below." },
    { label:"Kinetic Chain",       icon:"⛓️", nav:"kinetic", ctx:{ kcRegion:"thoracic", kcHighlights:["kc_thoracic_rotation","kc_thoracic_extension","kc_rib_mobility","kc_scapulohumeral_rhythm"] }, col:"#7c3aed", why:"Thoracic is the MOBILITY joint driving cervical, shoulder, and lumbar STABILITY demands." },
    { label:"CPA Assessment",      icon:"⚡", nav:"nkt",     ctx:{ nktRegion:"shoulder", nktHighlights:["nkt_pec_minor","nkt_upper_trap","nkt_lower_trap","nkt_serratus","nkt_mid_trap"] }, col:"#d97706", why:"Pec major/minor overactive → lower trap/serratus inhibited → kyphosis maintained. Treat motor pattern." },
    { label:"Functional Screen",   icon:"🏃", nav:"fma",     ctx:{ fsRegion:"thoracic" }, col:"#059669", why:"Overhead reach (thoracic extension demand), rotary stability (anti-rotation), push-up plus (scapular chain)." },
    { label:"Fascia Screen",        icon:"🕸️", nav:"fascia",      ctx:{ fasciaHighlights:["fa_passive_tension","fa_active_line_load","fa_densification","fa_sbl_hamstring"] }, col:"#059669", why:"TLF and SBL — thoracolumbar fascia links lumbar extensors to contralateral shoulder girdle." },
  ],
};

// runEngineV6's per-region results are keyed by the specific, laterality-
// suffixed region the clinician selected (e.g. "Elbow (R)", "Ankle/Foot (L)"),
// but REGION_NAV above only defines one shared entry per region *family*
// (bare "Elbow/Wrist/Hand", "Ankle / Foot", etc — Shoulder and Knee are the
// only two families broken out per-side, matching how REGION_NAV happens to
// key them). Without this mapping, REGION_NAV[r.region] silently misses for
// every region except Shoulder/Knee, since the exact strings never match --
// the "Guided assessment workflow" smart-action grid and the results engine's
// own analysis-module lookup both need this same translation, so it's shared
// here rather than defined twice (it used to be redeclared inside
// runEngineV6 as a local named _RKEY2).
const REGION_FAMILY_KEY = {
  "Cervical (L)":"Cervical spine","Cervical (R)":"Cervical spine",
  "Thoracic (L)":"Thoracic spine","Thoracic (R)":"Thoracic spine",
  "Lumbar/SI (L)":"Lumbar / SI","Lumbar/SI (R)":"Lumbar / SI",
  "Elbow (L)":"Elbow/Wrist/Hand","Elbow (R)":"Elbow/Wrist/Hand",
  "Wrist/Hand (L)":"Elbow/Wrist/Hand","Wrist/Hand (R)":"Elbow/Wrist/Hand",
  "Hip/Groin (L)":"Hip / Groin","Hip/Groin (R)":"Hip / Groin",
  "Ankle/Foot (L)":"Ankle / Foot","Ankle/Foot (R)":"Ankle / Foot",
};

function runEngineV6(data, selectedRegions) {
  if (!selectedRegions || selectedRegions.length === 0) return null;

  // ── Utility functions ──────────────────────────────────────────────
  const av = (k) => { const x = data[k]; if (!x) return ""; return String(x).split(SEP_S).filter(Boolean).join(", "); };
  const vl = (k) => String(data[k] || "").trim();
  const L  = (s) => String(s || "").toLowerCase();
  const any = (txt, ...keys) => keys.some(k => L(txt).includes(L(k)));
  const count = (txt, ...keys) => keys.filter(k => L(txt).includes(L(k))).length;

  // ── Universal data ─────────────────────────────────────────────────
  const nrsNow    = parseFloat(vl("cc_vas_now"))    || 0;
  const nrsWorst  = parseFloat(vl("cc_vas_worst"))  || 0;
  const nrsBest   = parseFloat(vl("cc_vas_best"))   || 0;
  const dur       = L(vl("cc_duration"));
  const onset     = L(vl("cc_onset"));
  const pmh       = L(av("pmh_conditions"));
  const meds      = L(av("med_current"));
  const grf       = L(av("grf_systemic"));
  const grfCancer = L(av("grf_cancer"));
  const grfFract  = L(av("grf_fracture"));
  const pedAge    = L(vl("ped_age_group"));
  const hmScreen  = L(av("hm_screen"));
  const bpsBeliefs= L(av("bps_beliefs"));
  const bpsFear   = L(av("bps_fear"));
  const bpsWork   = L(av("bps_work_facs"));

  // ── Duration classification ────────────────────────────────────────
  const isAcute    = /< 1 week|1–2 weeks|2–6 weeks/.test(dur);
  const isSubacute = /6 weeks–3 months/.test(dur);
  const isChronic  = /3–6 months|6–12|1–2 years|> 2 years|recurring/.test(dur);

  // ── NRS severity classification ────────────────────────────────────
  const nrsSevere   = nrsWorst >= 8;
  const nrsModerate = nrsWorst >= 5 && nrsWorst < 8;
  const nrsMild     = nrsWorst > 0 && nrsWorst < 5;
  const nrsVariance = nrsWorst - nrsBest; // large variance = mechanical

  // ── Global red flags ───────────────────────────────────────────────
  const globalRedFlags = [];
  const malignancy = any(grfCancer,"active cancer","past cancer — <5 years","known bone metastases") || any(grf,"unexplained weight loss","night sweats","fever");
  const fracRisk   = any(grfFract,"major trauma","known osteoporosis","long-term corticosteroid","point bone tenderness","fragility fractures");
  if (malignancy) globalRedFlags.push("⚠ URGENT — Possible malignancy / serious pathology: urgent medical review before physiotherapy");
  if (fracRisk)   globalRedFlags.push("⚠ Fracture risk indicators: imaging before loading; manipulation contraindicated");

  // ── Psychosocial load ──────────────────────────────────────────────
  const psychLoad = count(bpsBeliefs,"catastrophising","hopeless","believes cannot recover","nocebo","passive") +
                    count(bpsFear,"severe avoidance","kinesiophobia","catastrophising") +
                    count(bpsWork,"litigation","compensation","solicitor");
  const highPsych = psychLoad >= 2;

  // ── Hypermobility / paediatric flags ──────────────────────────────
  const isHypermobile = count(hmScreen,"multiple joint disloc","beighton","loose","since childhood") >= 1;
  const isPaediatric  = any(pedAge,"child","adolescent","growth");

  // ══════════════════════════════════════════════════════════════════
  // PER-REGION ANALYSIS
  // ══════════════════════════════════════════════════════════════════
  const regionResults = selectedRegions.map(region => {
    const mod = REG_MOD_S[REGION_FAMILY_KEY[region]||region];
    if (!mod) return null;
    const px = mod.prefix;
    const rf = (suf) => av(`${px}_${suf}`);
    const rv = (suf) => vl(`${px}_${suf}`);

    // Field reads
    const inAggMov  = L(rf("agg_mov"));
    const inAggPost = L(rf("agg_post"));
    const inAggAct  = L(rf("agg_act"));
    const inAggOther= L(rf("agg_other"));
    const inRelMov  = L(rf("rel_mov"));
    const inRelPost = L(rf("rel_post"));
    const inRelMan  = L(rf("rel_manual") || rf("rel"));
    const inRelMed  = L(rf("rel_med") || rf("rel"));
    const inPattern = L(rf("pattern"));
    const inMorning = L(rf("morning"));
    const inNight   = L(rf("night"));
    const inIrrit   = L(rv("irritability"));
    const inRad     = L(rf("radiation") || rf("loc_radiation"));
    const inLoc     = L(rf("loc") || rf("location"));
    const inMoi     = L(rf("moi"));
    const inSb24hr  = L(rf("sb_24hr") || rf("24hr"));

    // ── Irritability (Maitland SIN) with NRS override ──────────────
    let irritLevel = inIrrit;
    if (!irritLevel && nrsWorst >= 8 && isAcute) irritLevel = "high";
    else if (!irritLevel && nrsWorst >= 6) irritLevel = "moderate";
    else if (!irritLevel && nrsMild) irritLevel = "low";
    const highIrrit = irritLevel === "high" || irritLevel === "very high";
    const modIrrit  = irritLevel === "moderate";
    const lowIrrit  = irritLevel === "low";

    const tags = [];
    const prec = [];
    const differentials = []; // [{label, confidence, evidence, tests}]
    let urgentFlag = false;
    let primaryPattern = "";
    let confidence = "LOW";
    let objTests = [];

    // Duration tag
    if (isAcute) tags.push("Acute");
    else if (isSubacute) tags.push("Subacute");
    else if (isChronic) tags.push("Chronic");

    // NRS severity tag
    if (nrsWorst > 0) {
      if (nrsSevere) tags.push(`Severe pain NRS ${nrsWorst}/10`);
      else if (nrsModerate) tags.push(`Moderate pain NRS ${nrsWorst}/10`);
      else if (nrsMild) tags.push(`Mild pain NRS ${nrsWorst}/10`);
    }

    // Irritability tags
    if (highIrrit) tags.push("⚠ High irritability");
    else if (modIrrit) tags.push("Moderate irritability");
    else if (lowIrrit) tags.push("Low irritability");

    // Irritability precautions
    if (highIrrit) prec.push("High irritability — short-duration low-load testing; no end-range or combined loading; monitor 24hr response (Maitland)");

    // ── Universal pattern analysis ─────────────────────────────────
    const constantPain   = any(inPattern, "constant — never goes away", "constant — varies");
    const morningStiff30 = any(inMorning, ">30 min", "stays bad", "stays painful all morning", ">1 hour", "30–60 min");
    const easesWithMove  = any(inRelMov, "walking") || any(inPattern, "eases with movement", "improves with movement");
    const warmUpPattern  = any(inPattern, "warms up") || any(inPattern, "eases after");
    const postActDelay   = any(inPattern, "post-activity delayed", "delayed 24 hours", "next day");
    const largeNrsVar    = nrsVariance >= 5;
    const nsaidEffective = any(inRelMed, "nsaids — effective", "nsaids very effective");
    const noMedHelps     = any(inRelMed, "no medication helps", "no meds help", "no meds effective");

    // ── Inflammatory pattern ───────────────────────────────────────
    const inflammatoryPattern = (morningStiff30 && easesWithMove) ||
      any(inSb24hr, "inflammatory") ||
      any(rf("rf_inflammatory"), "morning stiffness", "improves with movement", "alternating buttock") ||
      (nsaidEffective && morningStiff30);
    if (inflammatoryPattern) tags.push("Inflammatory pattern");

    // ── Mechanical pattern ─────────────────────────────────────────
    const aggCount = (inAggMov + inAggPost + inAggAct).split(",").filter(s => s.trim()).length;
    const relCount = (inRelMov + inRelPost + inRelMan).split(",").filter(s => s.trim()).length;
    const mechanicalPattern = !constantPain && aggCount >= 2 && relCount >= 1 && largeNrsVar;
    if (mechanicalPattern) tags.push("Mechanical");

    // ── Tendinopathic pattern ──────────────────────────────────────
    const tendinopathicPattern = warmUpPattern && (
      any(onset, "repetitive", "overuse", "gradual", "sport") ||
      postActDelay ||
      any(inMoi, "overuse", "repetitive", "gradual", "marathon", "training load")
    );

    // ── Neural signals ─────────────────────────────────────────────
    const neuralQuality = any(rf("arm_quality"), "burning", "shooting", "tingling", "numbness", "electric") ||
                          any(rf("neuro_quality"), "burning", "shooting", "tingling", "numbness") ||
                          any(rf("neuro"), "burning", "shooting", "tingling", "numbness", "electric");
    const hasRadiation  = inRad && !inRad.includes("no radiation") && inRad.length > 5;
    const neuroDeficit  = any(rf("arm_neuro"), "weakness", "numbness", "dropping") ||
                          any(rf("neuro_signs"), "foot drop", "weakness", "reduced reflex", "saddle");
    const dermatomalDist= any(rf("dermatomal"), "c5", "c6", "c7", "c8", "l4", "l5", "s1") &&
                          !any(rf("dermatomal"), "not dermatomal", "not applicable");
    // Radiculopathy: neural quality + (deficit OR dermatomal) + radiation — partial data tolerant
    const radiculopathyScore = (neuralQuality ? 1 : 0) + (neuroDeficit ? 1 : 0) +
                                (dermatomalDist ? 1 : 0) + (hasRadiation ? 1 : 0);
    const radiculopathySig  = radiculopathyScore >= 2; // partial data tolerant
    const neurodynamicSig   = neuralQuality && radiculopathyScore < 2;

    if (radiculopathySig) tags.push("Radiculopathy");
    else if (neurodynamicSig) tags.push("Neurodynamic");

    // ── Nociplastic signal ─────────────────────────────────────────
    const nociplasticSig = (isChronic && constantPain && noMedHelps) ||
                           (isChronic && highPsych && constantPain) ||
                           (selectedRegions.length >= 3);
    if (nociplasticSig && !urgentFlag) tags.push("Nociplastic risk");

    // ══════════════════════════════════════════════════════════════
    // REGION-SPECIFIC PATTERN RECOGNITION
    // ══════════════════════════════════════════════════════════════

    // ─── CERVICAL SPINE ──────────────────────────────────────────
    if (region === "Cervical spine") {
      const myelop  = any(av("cx_rf_myelopathy"), "bilateral hand", "fine motor", "gait disturbance", "ataxia", "bladder", "bowel", "lhermitte");
      const vbi     = any(av("cx_rf_vbi"), "dizziness", "diplopia", "drop attacks", "dysarthria", "dysphagia", "thunderclap", "horner");
      const instab  = any(av("cx_rf_instability"), "rheumatoid arthritis", "down syndrome", "recent significant trauma", "post-surgical cervical");
      const fracSc  = any(av("cx_fracture_screen"), "high-energy", "axial loading", "cannot move neck", "neurological symptoms from time", "nexus", "canadian c-spine");
      const headache= L(rv("ha_present")).includes("yes");
      const haType  = L(rv("ha_type"));
      const armRelief = any(rf("arm_position"), "better with arm overhead", "shoulder abduction relief sign");
      const discogenic = any(inAggMov, "flexion — looking down") && any(inAggPost, "computer", "sitting") && any(inRelMov, "chin tuck", "retraction", "extension");
      const facet = any(inAggMov, "combined extension + rotation", "quadrant") && !any(inAggMov, "flexion — looking down");
      const postural = any(inAggPost, "computer", "looking down", "sustained") && !radiculopathySig;
      const cxCervicogenic = headache && any(haType, "cervicogenic");

      // Urgent flags first
      if (fracSc)  { prec.push("⚠ URGENT — Cervical fracture indicators: immobilise; do not move; emergency department"); urgentFlag = true; tags.push("⚠ Fracture screen"); }
      if (myelop)  { prec.push("⚠ URGENT — Myelopathy features: neurosurgical opinion before any cervical loading or manipulation"); urgentFlag = true; tags.push("⚠ Myelopathy"); }
      if (vbi)     { prec.push("⚠ URGENT — VBI screen positive: cervical manipulation absolutely contraindicated; urgent medical review"); urgentFlag = true; tags.push("⚠ VBI"); }
      if (instab)  { prec.push("⚠ Craniovertebral instability risk — Sharp-Purser / alar ligament testing before any mobilisation"); tags.push("Instability risk"); }

      // Build differentials
      if (radiculopathySig) {
        const dermLevel = any(rf("dermatomal"),"c6") ? "C6" : any(rf("dermatomal"),"c7") ? "C7" : any(rf("dermatomal"),"c8") ? "C8" : any(rf("dermatomal"),"c5") ? "C5" : "C5-C8";
        differentials.push({
          label: `Cervical radiculopathy — ${dermLevel}`,
          confidence: radiculopathyScore >= 3 ? "HIGH" : "MODERATE",
          evidence: `Neural quality symptoms${dermatomalDist?" with dermatomal distribution":""}${hasRadiation?" radiating to arm/hand":""}${neuroDeficit?" with neurological deficit":""}`,
          tests: ["Upper limb neurological exam (dermatomes C5-T1, myotomes, reflexes)","ULNT 1–4 (Butler)","Spurling's test","Cervical AROM with overpressure","Distraction test"],
        });
      }
      if (armRelief) {
        tags.push("Abduction relief sign +ve");
        if (!differentials.some(d => d.label.includes("radiculopathy")))
          differentials.push({ label:"C5/C6 nerve root compression", confidence:"MODERATE", evidence:"Shoulder abduction relief sign — arm overhead reduces symptoms", tests:["Spurling's R/L","ULNT1","Cervical traction test"] });
      }
      if (discogenic) {
        differentials.push({ label:"Cervical discogenic pain", confidence: (any(inAggAct,"coughing") || any(inAggMov,"flexion — looking down")) ? "MODERATE" : "LOW",
          evidence:"Flexion + sustained posture aggravates; retraction / extension relieves (McKenzie pattern)",
          tests:["Repeated cervical movements — centralisation","PA intervertebral pressures (Maitland)","Cervical flexion AROM","Upper limb neurological screen"] });
      }
      if (facet) {
        differentials.push({ label:"Cervical facet joint syndrome", confidence: any(inAggMov,"quadrant") ? "MODERATE" : "LOW",
          evidence:"Combined extension + rotation aggravates; localised pain without radiation",
          tests:["Combined movement quadrant testing","PA pressures C2-C7","Facet loading in extension + rotation","Passive physiological intervertebral movements (PIVMs)"] });
      }
      if (postural && !radiculopathySig && !discogenic && !facet) {
        differentials.push({ label:"Cervical postural / myofascial dysfunction", confidence:"LOW",
          evidence:"Sustained posture (computer / phone) primary aggravator; no neurological features",
          tests:["Postural assessment","Cervical AROM all planes","Muscle length — levator scapulae / upper trapezius","Scapular stability assessment"] });
      }
      if (cxCervicogenic) {
        differentials.push({ label:"Cervicogenic headache", confidence:"MODERATE",
          evidence:"Headache reproduced / altered with neck movement; unilateral without autonomic features",
          tests:["C1/C2/C3 PPIVM","Flexion-rotation test (FRT — C1/C2)","Upper cervical pressures","Head eye movement coordination test"] });
      }
      if (inflammatoryPattern && !radiculopathySig) {
        differentials.push({ label:"Cervical inflammatory arthropathy (RA / AS)", confidence:any(pmh,"rheumatoid","ankylosing")?"MODERATE":"LOW",
          evidence:"Morning stiffness >30 min easing with movement; PMH relevant",
          tests:["Neurological screen (RA — atlantoaxial)","Sharp-Purser if RA","Referral for ESR/CRP/RF if not yet done","Bilateral assessment"] });
      }

      // Primary pattern from highest confidence differential
      if (urgentFlag) primaryPattern = differentials.length > 0 ? `⚠ ${differentials[0].label} — Urgent` : "⚠ Urgent referral required";
      else if (differentials.length > 0) {
        differentials.sort((a,b) => (b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0) - (a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
        primaryPattern = differentials[0].label;
        confidence = differentials[0].confidence;
      } else primaryPattern = "Cervical pain — insufficient data for pattern classification";

      // Objective tests
      objTests = urgentFlag ? ["Do not load cervically until urgent consultation complete"] :
        ["Postural observation — head/neck/shoulder alignment","Cervical AROM all planes with overpressure",
         "Passive physiological intervertebral movements (PIVMs)","PA intervertebral pressures (Maitland)",
         ...(radiculopathySig ? ["Full upper limb neurological exam","ULNT 1–4","Spurling's","Distraction test"] : []),
         ...(headache ? ["Flexion-rotation test (C1/C2)","Upper cervical PPIVM"] : []),
         highIrrit ? "HIGH IRRITABILITY — limit to 1–2 test movements; assess 24hr response before progressing" : ""];
    }

    // ─── LUMBAR / SI ──────────────────────────────────────────────
    if (region === "Lumbar / SI") {
      const cauda    = any(av("lx_rf_cauda"), "bilateral leg weakness", "saddle", "bladder retention", "bladder incontinence", "bowel incontinence", "rapidly progressive");
      const lxFract  = any(av("lx_rf_fracture"), "major high-energy", "known osteoporosis", "long-term corticosteroid", "point bone tenderness") || fracRisk;
      const inflammL = any(av("lx_rf_inflammatory"), "morning stiffness >30", "improves with movement", "alternating buttock", "nsaids very effective", "uveitis", "psoriasis", "ibd") || (inflammatoryPattern && any(pmh, "ankylosing", "psoriatic", "reactive"));
      const spondylo = any(av("lx_spondylo_screen"), "young athlete", "extension pain", "pars stress", "sport with repeated extension", "single leg extension", "forward slip");
      const discogenic = any(inAggMov, "forward bending") && (any(inAggAct, "coughing", "sneezing", "straining") || any(inAggPost, "sitting >30", "sitting >1 hour")) &&
                         (any(inRelMov, "extension", "press-up") || any(inRelPost, "walking") || any(rv("directional"), "extension preference"));
      const facet    = (any(inAggMov, "backward bending", "extension", "rotation") && !any(inAggMov, "forward bending")) && any(inRelPost, "lying", "knees bent", "sitting");
      const stenosis = any(inAggAct, "walking — extended", "prolonged walking", "bilateral leg") && (any(inRelPost, "leaning forward", "hands and knees", "sitting") || any(inRelMov, "walking"));
      const sijPatt  = any(inLoc, "si joint") && any(inAggMov, "fadir", "faber") && !radiculopathySig;
      const spondylolisthesis = any(inAggMov, "backward bending") && any(av("lx_spondylo_screen"), "forward slip", "spondylolisthesis", "young athlete");

      // Urgent flags
      if (cauda)   { prec.push("⚠ URGENT — Cauda equina indicators: same-day emergency medical review; do not defer (NICE NG59)"); urgentFlag = true; tags.push("⚠ Cauda equina"); }
      if (lxFract) { prec.push("⚠ Fracture risk: imaging before any loading; manipulation absolutely contraindicated"); tags.push("⚠ Fracture risk"); }
      if (inflammL && !urgentFlag) prec.push("Inflammatory / spondyloarthropathy features — rheumatology referral; ESR, CRP, HLA-B27");

      // Build differentials — all confidence scored
      if (radiculopathySig) {
        const dermLevel = any(rf("dermatomal"),"l4") ? "L4" : any(rf("dermatomal"),"l5") ? "L5" : any(rf("dermatomal"),"s1") ? "S1" : "L4-S1";
        const belowKnee = any(rv("below_knee"), "below knee", "extends to foot");
        differentials.push({ label:`Lumbar radiculopathy — ${dermLevel}`,
          confidence: radiculopathyScore >= 3 || belowKnee ? "HIGH" : "MODERATE",
          evidence:`Pain below knee${dermatomalDist?" with dermatomal pattern":""}; neural quality${neuroDeficit?" with neurological signs":""}`,
          tests:["Full lower limb neurological exam (L3-S1)","SLR with sensitisation (Bragard / Brudzinski)","Slump test","Repeated lumbar extension — centralisation?","Femoral nerve stretch (if L2-L4)"] });
      }
      if (discogenic) {
        differentials.push({ label:"Lumbar discogenic pain",
          confidence: any(inAggAct,"coughing","sneezing") && any(inRelMov,"extension") ? "HIGH" : "MODERATE",
          evidence:`Flexion / Valsalva aggravates${any(rv("directional"),"extension preference")?" + extension centralises (McKenzie)":""}; sustained sitting aggravates`,
          tests:["Repeated extension standing + lying (McKenzie)","PA pressures L1-L5","Centralisation testing","SLR if leg symptoms","Upper / lower quarter neurological screen"] });
      }
      if (facet) {
        differentials.push({ label:"Lumbar facet / zygapophyseal joint syndrome",
          confidence: any(inAggMov,"rotation") && any(inAggMov,"backward bending") ? "MODERATE" : "LOW",
          evidence:"Extension + rotation aggravates; flexion / lying with knees bent relieves",
          tests:["Lumbar quadrant test (extension + rotation + side bend)","PA intervertebral pressures","Passive physiological movements (PIVMs)","Spring testing"] });
      }
      if (stenosis) {
        differentials.push({ label:"Lumbar spinal stenosis (neurogenic claudication)",
          confidence: any(inAggAct,"bilateral leg") && any(inRelPost,"leaning forward") ? "HIGH" : "MODERATE",
          evidence:"Walking provokes bilateral leg symptoms; leaning forward / sitting relieves (shopping trolley sign)",
          tests:["Treadmill walking test","Bicycle test (can cycle — flexed — further than walk)","Neurological screen both lower limbs","SLR bilateral"] });
      }
      if (inflammL) {
        differentials.push({ label:"Inflammatory lumbar / spondyloarthropathy",
          confidence: any(av("lx_rf_inflammatory"),"alternating buttock","morning stiffness >30") ? "MODERATE" : "LOW",
          evidence:`Morning stiffness >30 min; eases with movement${nsaidEffective?" + NSAID responsive":""}${any(pmh,"ankylosing","psoriatic")?" + relevant PMH":""}`,
          tests:["FABER test (SIJ provocation)","Posterior SIJ shear","Active straight leg raise","Referral: ESR, CRP, HLA-B27","Sacroiliac imaging if clinical"] });
      }
      if (sijPatt) {
        differentials.push({ label:"Sacroiliac joint dysfunction",
          confidence: count(inAggMov,"fadir","faber") >= 1 && any(inLoc,"si joint") ? "MODERATE" : "LOW",
          evidence:"SI joint location; FADIR / FABER aggravates; unilateral buttock / SI area",
          tests:["SIJ provocation cluster (Laslett) — FABER, posterior shear, compression, distraction","Active straight leg raise","Sacral spring","Gillet test"] });
      }
      if (spondylo || spondylolisthesis) {
        differentials.push({ label: spondylolisthesis ? "Spondylolisthesis" : "Spondylolysis (pars stress fracture)",
          confidence: isPaediatric || any(onset,"sport") ? "MODERATE" : "LOW",
          evidence:`Young athlete with extension pain${isPaediatric?" during growth phase":""}; sport with repetitive lumbar extension`,
          tests:["Single leg extension (Stork) test — unilateral pain reproduction","Lumbar AROM — extension pain","Lumbar x-ray (AP + lateral + oblique)","SPECT / MRI if x-ray negative and clinical suspicion high","Hamstring length"] });
      }
      if (!differentials.length) {
        differentials.push({ label:"Non-specific low back pain (mechanical)", confidence:"LOW",
          evidence:"Insufficient specific features for classification — mechanical pattern likely",
          tests:["Lumbar AROM all planes","PA pressures","Repeated movements","SLR if any leg symptoms","STarT Back Tool"] });
      }

      // STarT Back
      const startBack = L(rv("yf_startback"));
      if (any(startBack,"high risk")) { prec.push("STarT Back HIGH RISK — psychologically-informed physiotherapy (PIP); standard physio alone insufficient"); tags.push("STarT High"); }
      else if (any(startBack,"medium risk")) { prec.push("STarT Back MEDIUM RISK — enhanced physiotherapy addressing psychosocial factors"); tags.push("STarT Medium"); }

      primaryPattern = urgentFlag ? "⚠ Urgent referral required" :
        (differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0)), differentials[0].label);
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";

      objTests = urgentFlag ? ["Do not proceed — urgent cauda equina assessment"] :
        ["Postural observation — lumbar/pelvic alignment","Lumbar AROM all planes (standing)",
         "Repeated movements — centralisation testing (McKenzie)","PA intervertebral pressures L1-S1",
         ...(radiculopathySig ? ["Full lower limb neurological exam (L3-S1)","SLR + sensitisation","Slump test","Femoral nerve stretch"] : []),
         ...(spondylo ? ["Stork / single leg extension test"] : []),
         ...(sijPatt ? ["SIJ provocation cluster (Laslett 2 of 5)"] : []),
         highIrrit ? "HIGH IRRITABILITY — assess single movement then stop; 24hr monitoring" : ""];
    }

    // ─── SHOULDER ─────────────────────────────────────────────────
    if (region === "Shoulder (L)" || region === "Shoulder (R)") {
      const nightSleep   = any(rv("night"), "wakes multiple", "cannot sleep on affected", "constant night pain");
      const painfulArc   = any(rv("arc"), "60", "120°");
      const acjArc       = any(rv("arc"), "above 120");
      const capsPattern  = any(rv("stiffness"), "cannot externally rotate", "all directions", "capsular pattern");
      const progStiff    = any(inPattern, "progressive stiffness");
      const instab       = any(rv("instability"), "recurrent dislocation", "single dislocation", "apprehension") || isHypermobile;
      const slap         = any(inAggMov, "deceleration of overhead");
      const dropArm      = any(rf("weakness"), "drop arm", "cannot hold arm up against gravity");
      const suddenWeak   = any(rf("moi_first"), "immediate weakness") && isAcute;
      const brachNeuritis= any(av(`${px}_brachial_neuritis`), "sudden severe", "profound weakness", "rapidly followed");
      const bilateral    = any(rv("bilateral"), "symmetrical bilateral");
      const rfField      = av(`${px}_rf`);
      const proxBicepsR  = any(av(`${px}_extra`) || "", "felt pop in upper arm", "popeye sign");

      // Urgent flags
      if (any(rfField,"suspected fracture","suspected unreduced","acute hot","vascular compromise")) { prec.push(`⚠ Red flags — ${region}: urgent orthopaedic review`); urgentFlag = true; }
      if (dropArm && isAcute) { prec.push(`⚠ Drop arm sign — possible acute massive rotator cuff tear: urgent orthopaedic referral`); urgentFlag = true; tags.push("⚠ Drop arm"); }
      if (brachNeuritis) { prec.push("⚠ Possible brachial neuritis (Parsonage-Turner) — urgent neurology referral; EMG/NCS; do not exercise into weakness"); urgentFlag = true; tags.push("⚠ Brachial neuritis"); }

      // Differentials
      if (capsPattern || (progStiff && isChronic)) {
        differentials.push({ label:`Adhesive capsulitis (frozen shoulder) — ${region}`,
          confidence: capsPattern && progStiff ? "HIGH" : "MODERATE",
          evidence:`Capsular pattern loss (ER > ABD > IR)${progStiff?" with progressive stiffness over months":""}`,
          tests:["Passive GH ROM all planes — capsular end-feel","ER / abduction / IR measurement","Rule out: glenohumeral OA (x-ray)","Diabetes screen if not done"] });
      }
      if ((nightSleep || painfulArc) && !capsPattern) {
        differentials.push({ label:`Rotator cuff-related shoulder pain — ${region}`,
          confidence: nightSleep && painfulArc ? "HIGH" : nightSleep || painfulArc ? "MODERATE" : "LOW",
          evidence:`${nightSleep?"Night pain waking patient; ":""}${painfulArc?"painful arc 60-120°":""}`,
          tests:["Hawkins-Kennedy","Neer sign","Empty can (supraspinatus)","ER lag sign","Belly press / bear hug (subscapularis)","Drop arm test","Scapular dyskinesis assessment"] });
      }
      if (acjArc) {
        differentials.push({ label:`AC joint pathology — ${region}`,
          confidence:"MODERATE",
          evidence:"Painful arc above 120° (AC joint loading range); localised AC joint tenderness likely",
          tests:["AC joint palpation","Horizontal adduction (cross-body adduction)","AC shear test","O'Brien's test"] });
      }
      if (instab) {
        differentials.push({ label:`Glenohumeral instability — ${region}`,
          confidence: any(rv("instability"),"recurrent dislocation") ? "HIGH" : "MODERATE",
          evidence:`${any(rv("instability"),"recurrent dislocation")?"Recurrent dislocation history":"Apprehension / sense of looseness"}${isHypermobile?" + generalised hypermobility":""}`,
          tests:["Apprehension test (anterior)","Relocation test","Sulcus sign (inferior)","Posterior stress test","Anterior/posterior load and shift","Kim test (posterior-inferior)"] });
      }
      if (slap) {
        differentials.push({ label:`SLAP lesion / labral pathology — ${region}`,
          confidence:"MODERATE",
          evidence:"Overhead deceleration mechanism aggravates; deep pain with overhead loading",
          tests:["O'Brien's active compression test","Speed's test (bicipital groove)","Kim test","Biceps load test II","ULNT if neural component"] });
      }
      if (brachNeuritis) {
        differentials.push({ label:"Brachial neuritis (Parsonage-Turner syndrome)",
          confidence:"HIGH",
          evidence:"Sudden severe pain then profound multi-muscle weakness; post-viral / post-vaccination",
          tests:["EMG / NCS (gold standard)","MRI brachial plexus","Cervical spine screen","Manual muscle testing all shoulder muscles","Diaphragm function if phrenic nerve"] });
      }
      if (proxBicepsR) {
        differentials.push({ label:`Proximal biceps long head rupture — ${region}`,
          confidence:"HIGH",
          evidence:"Pop in upper arm/anterior shoulder with Popeye sign visible",
          tests:["Speed's test","Yergason's test","Visible muscle deformity — Popeye sign","Urgency: orthopaedic review for surgical candidates"] });
      }

      if (!differentials.length) {
        differentials.push({ label:`Mechanical shoulder dysfunction — ${region}`, confidence:"LOW",
          evidence:"Insufficient specific features for classification",
          tests:["Full shoulder AROM + PROM","Rotator cuff isometric testing","Scapular dyskinesis","Cervical screen"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral required"}` : differentials[0].label;
      confidence = urgentFlag ? "HIGH" : differentials[0].confidence;
      objTests = urgentFlag ? ["Do not load shoulder — urgent referral"] :
        ["Postural observation — shoulder height / scapular position","GH AROM all planes","Rotator cuff isometric testing (ER/IR/abduction)","Scapular dyskinesis assessment",
         ...(painfulArc||nightSleep?["Hawkins-Kennedy","Neer","Empty can","ER lag sign","Drop arm test"]:[]),
         ...(capsPattern||progStiff?["Passive GH ROM — capsular end-feel","ER measurement"]:[]),
         ...(instab?["Apprehension / relocation test","Sulcus sign"]:[]),
         highIrrit?"HIGH IRRITABILITY — assess resting position only first session":""];
    }

    // ─── KNEE ─────────────────────────────────────────────────────
    if (region === "Knee (L)" || region === "Knee (R)") {
      const pop         = any(rv("pop"), "clear pop");
      const haemSwelling= any(rv("swelling"), "immediate within 2", "immediate <2hrs", "haemarthrosis");
      const rfField     = av(`${px}_rf`);
      const locked      = any(rfField, "irreducible locked");
      const pfps        = any(rv("movie"), "yes — typical pfps") || any(rv("descent"), "worse going down");
      const ottawa      = any(rfField, "unable to bear weight for 4", "bony tenderness fibular", "bony tenderness patella");
      const septic      = any(rfField, "acute hot", "septic arthritis");
      const patellarT   = any(inLoc, "patellar tendon") && (warmUpPattern || any(inAggAct,"jumping","stairs — up"));
      const itb         = any(inLoc, "itb attachment") && any(inAggAct, "running — downhill", "running");
      const meniscal    = (any(inLoc, "medial joint line","lateral joint line")) && (any(rv("locking"),"true locking") || any(rv("clicking"),"clunk","catching"));
      const pcl         = any(av(`${px}_pcl`) || "", "dashboard", "direct blow to anterior tibia", "fall onto flexed knee", "posterior");
      const plc         = any(av(`${px}_plc`) || "", "varus stress", "hyperextension + varus", "varus thrust");
      const bursa       = any(av(`${px}_bursa`) || "", "prepatellar", "infrapatellar", "pes anserine", "occupational");
      const osgood      = any(inLoc, "tibial tuberosity") && isPaediatric;
      const pfpsConfidence = (any(rv("movie"),"yes — typical pfps") ? 1:0) + (any(rv("descent"),"worse going down")?1:0) + (any(inAggAct,"sitting prolonged")?1:0);

      // ── NEW: MCL / LCL sprain detection ──────────────────────────────
      const mclMoi      = any(inMoi, "direct blow medial", "valgus stress");
      const lclMoi      = any(inMoi, "direct blow lateral", "varus stress");
      const mclLoc      = any(inLoc, "medial collateral region");
      const lclLoc      = any(inLoc, "lateral collateral region", "fibular head");
      const mcl         = (mclMoi || mclLoc) && !pop; // pop = likely ACL not isolated MCL
      const lcl         = (lclMoi || lclLoc) && !pop;

      // ── NEW: Knee OA detection ────────────────────────────────────────
      const oaCrep      = any(rv("clicking"), "grinding / crepitus — coarse", "grinding");
      const oaPattern   = any(inPattern, "morning stiffness", "warms up", "getting worse over time");
      const oaAge       = parseInt(data.dem_dob ? (new Date().getFullYear() - parseInt((data.dem_dob||"").split("/")[2]||"0")) : 0) >= 45;
      const oaLoc       = any(inLoc, "medial joint line","lateral joint line","whole knee — diffuse");
      const oaAggAct    = any(inAggAct,"prolonged walking","standing","getting up from low chair");
      const oaScore     = (oaCrep?2:0)+(oaPattern?1:0)+(oaAge?1:0)+(oaLoc?1:0)+(oaAggAct?1:0)+(isChronic?1:0);
      const kneeOA      = oaScore >= 3 && !isPaediatric;

      // ── NEW: Fat pad (Hoffa) impingement detection ────────────────────
      const fatPad      = any(inLoc, "patellar tendon — inferior pole", "anterior knee — diffuse") &&
                          any(inAggAct, "stairs — going up", "hills — going up", "full extension", "prolonged standing") &&
                          !patellarT; // distinguish from patellar tendinopathy

      // Urgent flags
      if (locked)  { prec.push(`⚠ Locked knee ${region} — possible bucket-handle meniscal tear: urgent orthopaedic referral`); urgentFlag = true; }
      if (septic)  { prec.push(`⚠ Possible septic arthritis ${region} — same-day emergency medical review`); urgentFlag = true; }
      if (ottawa)  { prec.push(`Ottawa Rules positive — ${region}: x-ray required; do not load until cleared`); tags.push("⚠ Ottawa +ve"); }
      if (pcl && haemSwelling && isAcute) { prec.push(`⚠ Possible PCL injury — ${region}: posterior drawer test; imaging`); tags.push("⚠ PCL suspected"); }

      // Differentials
      if (pop && haemSwelling) {
        differentials.push({ label:`ACL injury — ${region}`,
          confidence: pop && haemSwelling && any(inMoi,"twisting","non-contact","contact") ? "HIGH" : "MODERATE",
          evidence:`Clear pop + immediate haemarthrosis + twisting mechanism`,
          tests:["Lachman test (best sensitivity/specificity)","Anterior drawer","Pivot shift test","Valgus/varus stress (exclude associated MCL/LCL)","Ottawa Rules — x-ray if indicated","Urgent MRI if Lachman positive"] });
      }
      if (mcl) {
        const mclConf = (mclMoi && mclLoc) ? "HIGH" : mclMoi || mclLoc ? "MODERATE" : "LOW";
        differentials.push({ label:`MCL sprain — ${region}`,
          confidence: mclConf,
          evidence:`${mclMoi?"Valgus / medial blow mechanism; ":""}${mclLoc?"Medial collateral region pain; ":""}no haemarthrosis (isolated MCL)`,
          tests:[
            "Valgus stress test at 0° (MCL + posterior capsule) AND 30° (isolated MCL)",
            "Grade laxity: 1 = pain only, 2 = 5–10mm opening, 3 = >10mm (complete)",
            "Medial joint line + MCL palpation (femoral vs tibial attachment)",
            "Lachman test — exclude concurrent ACL injury",
            "X-ray if Ottawa Rules positive or Grade 3 laxity",
            "MRI if Grade 2–3 or multi-ligament injury suspected"
          ] });
      }
      if (lcl) {
        differentials.push({ label:`LCL sprain — ${region}`,
          confidence: lclMoi && lclLoc ? "MODERATE" : "LOW",
          evidence:`${lclMoi?"Varus / lateral blow mechanism; ":""}${lclLoc?"Lateral collateral / fibular head pain":""}`,
          tests:[
            "Varus stress test at 0° (LCL + PCL + posterolateral corner) AND 30° (isolated LCL)",
            "Fibular head palpation — LCL attaches here",
            "Peroneal nerve screen — common peroneal wraps fibular neck (foot drop risk)",
            "Posterolateral corner screen — Dial test if combined instability suspected",
            "MRI if Grade 2–3 or concurrent PCL / PLC injury suspected"
          ] });
      }
      if (pfps) {
        differentials.push({ label:`Patellofemoral pain syndrome — ${region}`,
          confidence: pfpsConfidence >= 2 ? "HIGH" : pfpsConfidence === 1 ? "MODERATE" : "LOW",
          evidence:`${any(rv("movie"),"yes")?"Movie sign (prolonged sitting)":""}${any(rv("descent"),"worse going down")?" + worse stairs descent":""}${any(inAggAct,"sitting prolonged")?" + prolonged sitting":""}`,
          tests:["Single leg squat — dynamic valgus assessment","Clarke's test","VMO assessment","Patellar mobility","Hip abductor / external rotator strength","Foot pronation assessment","Patellar taping trial"] });
      }
      if (patellarT && !urgentFlag) {
        differentials.push({ label:`Patellar tendinopathy — ${region}`,
          confidence: warmUpPattern && any(inAggAct,"jumping") ? "MODERATE" : "LOW",
          evidence:`Patellar tendon location + ${warmUpPattern?"warm-up pattern":""}${any(inAggAct,"jumping")?" + jumping aggravates":""}`,
          tests:["VISA-P questionnaire","Single leg decline squat (most sensitive)","Palpation inferior pole patella","VISA-P score","US if diagnosis unclear","Load assessment (training volume)"] });
      }
      if (fatPad && !urgentFlag) {
        differentials.push({ label:`Infrapatellar fat pad impingement (Hoffa's) — ${region}`,
          confidence: any(inAggAct,"full extension","prolonged standing") && any(inLoc,"anterior knee") ? "MODERATE" : "LOW",
          evidence:`Anterior / infrapatellar pain; aggravated by full extension and stairs up; no warm-up pattern (distinguishes from tendinopathy)`,
          tests:[
            "Hoffa's test — compress fat pad bilaterally below patella during passive extension; positive = pain reproduced",
            "Passive knee extension — end-range compression pain",
            "Palpation — medial and lateral to patellar tendon (fat pad borders)",
            "Observe hyperextension posture — chronic fat pad loading",
            "Patellar taping (unload fat pad) — therapeutic trial",
            "US or MRI if diagnosis uncertain (fat pad oedema visible)"
          ] });
      }
      if (itb) {
        differentials.push({ label:`ITB syndrome — ${region}`,
          confidence: any(inAggAct,"running — downhill") && any(inLoc,"itb") ? "MODERATE" : "LOW",
          evidence:"ITB attachment location; downhill running aggravates; overuse running mechanism",
          tests:["Ober test","Noble compression test (lateral femoral condyle)","Single leg squat — hip drop","Hip abductor strength","Running analysis if available","Training load assessment"] });
      }
      if (meniscal) {
        differentials.push({ label:`Meniscal pathology — ${region}`,
          confidence: any(rv("locking"),"true locking") || (pop && any(inLoc,"joint line")) ? "MODERATE" : "LOW",
          evidence:`Joint line location${any(rv("locking"),"true locking")?" + true locking":""}${any(rv("clicking"),"clunk")?" + clunk":""}`,
          tests:["McMurray test","Thessaly test (3° and 20° flexion)","Apley compression","Joint line palpation","MRI if clinical diagnosis uncertain"] });
      }
      if (kneeOA) {
        const oaConf = oaScore >= 5 ? "HIGH" : oaScore >= 3 ? "MODERATE" : "LOW";
        differentials.push({ label:`Knee OA — ${region}`,
          confidence: oaConf,
          evidence:`${oaCrep?"Coarse crepitus; ":""}${oaPattern?"Morning stiffness / warms up pattern; ":""}${oaAge?"Age ≥45; ":""}${isChronic?"Chronic duration; ":""}${oaLoc?"Joint line / diffuse location":""}`,
          tags:["Consider x-ray","GP referral if severe"],
          tests:[
            "Knee AROM — loss of flexion > extension (OA capsular pattern)",
            "Passive knee flexion + extension — capsular end-feel",
            "Valgus/varus alignment observation — medial vs lateral compartment loading",
            "Effusion sweep test — low-grade synovitis common in OA",
            "Single leg squat — load tolerance and valgus collapse",
            "Weight-bearing x-ray (AP + lateral + skyline) — joint space narrowing, osteophytes",
            "GP referral if severe pain / significant restriction — surgical review if indicated",
            "WOMAC or Oxford Knee Score — baseline function",
            isChronic && oaScore >= 4 ? "Refer for x-ray if not yet done — confirm OA grade (Kellgren-Lawrence)" : ""
          ].filter(Boolean) });
        if (oaScore >= 5 && isChronic) prec.push(`Knee OA pattern — ${region}: weight-bearing x-ray recommended; GP referral if not yet investigated`);
      }
      if (pcl) {
        differentials.push({ label:`PCL injury — ${region}`,
          confidence:"MODERATE",
          evidence:"Dashboard / direct anterior tibial blow mechanism; posterior knee fullness",
          tests:["Posterior drawer test (90° flexion)","Posterior sag sign (Godfrey)","Quadriceps active test","Associated LCL / posterolateral corner screen"] });
      }
      if (plc) {
        differentials.push({ label:`Posterolateral corner injury — ${region}`,
          confidence:"MODERATE",
          evidence:"Varus + hyperextension mechanism; lateral knee instability; varus thrust in gait",
          tests:["Dial test (30° + 90° — increased ER vs other knee)","Varus stress 0° + 30°","Posterolateral drawer","External rotation recurvatum test","Urgent orthopaedic referral if confirmed"] });
      }
      if (bursa) {
        differentials.push({ label:`Knee bursitis — ${region}`,
          confidence:"MODERATE",
          evidence:"Occupational kneeling or direct blow; fluctuant soft swelling; localised",
          tests:["Bursae palpation — prepatellar / infrapatellar / pes anserine","Temperature comparison","Fluctuance assessment","Septic bursitis: urgent aspiration if hot + systemically unwell"] });
      }
      if (osgood) {
        differentials.push({ label:`Osgood-Schlatter disease — ${region}`,
          confidence: isPaediatric && any(inLoc,"tibial tuberosity") ? "HIGH" : "LOW",
          evidence:"Adolescent athlete; tibial tuberosity pain; jumping / sport aggravates",
          tests:["Tibial tuberosity palpation","Knee AROM","Resisted knee extension — SLR","Quad flexibility — Ely test","X-ray if diagnosis uncertain"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || `Mechanical knee dysfunction — ${region}`;
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Defer loading — urgent referral as above"] :
        ["Gait observation — antalgic / varus thrust / valgus alignment","Knee AROM — extension and flexion (OA: flexion > extension loss)","Valgus/varus stress 0° + 30°",
         ...(pop&&haemSwelling?["Lachman","Anterior drawer","Pivot shift"]:meniscal?["McMurray","Thessaly","Apley"]:[]),
         ...(mcl?["Valgus stress test 0° + 30° — grade MCL laxity","Medial joint line palpation","Peroneal nerve screen if LCL"]:
             lcl?["Varus stress test 0° + 30° — grade LCL laxity","Fibular head palpation","Peroneal nerve screen (foot drop risk)"]:[]),
         ...(pfps?["Single leg squat","VMO assessment","Patellar mobility","Hip abductor strength"]:[]),
         ...(patellarT?["Single leg decline squat","VISA-P"]:itb?["Ober test","Noble compression test"]:[]),
         ...(fatPad?["Hoffa's test","Passive extension end-range compression","Fat pad palpation bilateral to patellar tendon"]:[]),
         ...(kneeOA?["Effusion sweep test","Passive ROM — capsular end-feel","Weight-bearing x-ray if not done","WOMAC / Oxford Knee Score"]:[]),
         highIrrit?"HIGH IRRITABILITY — passive ROM only first session":""];
    }

    // ─── HIP / GROIN ──────────────────────────────────────────────
    if (region === "Hip / Groin") {
      const rfField    = av("hp_rf");
      const avn        = any(rfField,"avascular necrosis");
      const fracHip    = any(rfField,"suspected neck of femur","cannot weight bear","elderly");
      const septicHip  = any(rfField,"acute hot swollen hip","septic arthritis");
      const cSign      = L(rv("c_sign")).includes("yes — typical");
      const locPatt    = L(rv("loc_pattern"));
      const fadir      = any(inAggMov,"fadir");
      const hamstrPT   = any(inLoc,"ischial tuberosity") && any(inAggAct,"sitting on hard surface","sprinting");
      const adductor   = any(inLoc,"adductor") && any(inAggMov,"resisted adduction");
      const hamstrStrain= any(av("hp_hamstring_onset")||"","sudden onset sprinting","felt pop","immediate sharp","bruising appeared");
      const quadStrain = any(av("hp_quad_onset")||"","sudden onset kicking","direct blow","immediate","cannot fully flex knee");
      const piriform   = any(av("hp_piriformis")||"","deep buttock pain","hip internal rotation","sciatica-like","sitting causes buttock");
      const meralgia   = any(av("hp_meralgia")||"","lateral thigh burning","no back pain","worse standing","tight clothing","pregnancy");
      const pubicSPD   = any(inLoc,"pubic symphysis") && any(inMoi,"post-partum","pregnancy");

      if (avn)      { prec.push("⚠ Avascular necrosis risk — urgent imaging before weight-bearing; no loading until MRI"); urgentFlag = true; }
      if (fracHip)  { prec.push("⚠ Possible hip fracture — non-weight bearing; emergency imaging"); urgentFlag = true; }
      if (septicHip){ prec.push("⚠ Possible septic hip — same-day emergency medical review; aspiration"); urgentFlag = true; }

      if (hamstrStrain) {
        differentials.push({ label:"Hamstring muscle strain",
          confidence: any(av("hp_hamstring_onset")||"","felt pop","bruising appeared","immediate sharp") ? "HIGH" : "MODERATE",
          evidence:`Sprinting / overstretching mechanism; sudden posterior thigh pain${any(av("hp_hamstring_onset")||"","bruising")?" + bruising":""}`,
          tests:["Palpation — musculotendinous junction / myotendinous","Passive straight leg raise — neural vs muscle","Resisted knee flexion at 15°","Resisted knee flexion at 90° (proximal vs distal)","Imaging: US / MRI for grading","MRI scan: grade 1/2/3 and location"] });
      }
      if (quadStrain) {
        differentials.push({ label:"Quadriceps muscle strain",
          confidence:"MODERATE",
          evidence:"Kicking / direct blow mechanism; anterior thigh pain; knee flexion restricted",
          tests:["Palpation anterior thigh — locate defect","Passive knee flexion range","Resisted knee extension isometric","Myositis ossificans risk — do not massage acutely if >48hrs","US if haematoma suspected"] });
      }
      if (cSign || (any(locPatt,"groin-dominant") && fadir)) {
        differentials.push({ label:"Intra-articular hip pathology (FAI / labral tear / OA)",
          confidence: cSign && fadir ? "HIGH" : fadir || cSign ? "MODERATE" : "LOW",
          evidence:`${cSign?"C-sign positive (patient cups anterolateral hip); ":""}${fadir?"FADIR aggravates (FAI pattern); ":""}groin-dominant location`,
          tests:["FADIR test (sensitivity: labral)","FABER test","Hip quadrant / scour test","Hip passive ROM all planes","Limb length assessment","X-ray hip (FAI — cam / pincer morphology)","MR arthrogram if labral tear suspected"] });
      }
      if (hamstrPT && !hamstrStrain) {
        differentials.push({ label:"Proximal hamstring tendinopathy",
          confidence:"MODERATE",
          evidence:"Ischial tuberosity pain; sitting on hard surfaces aggravates; sprinting / lunging aggravates",
          tests:["Ischial tuberosity palpation","Resisted knee flexion at 15° vs 90°","VISA-H questionnaire","Passive straight leg raise — stretch pain","US or MRI if diagnosis uncertain","Avoid stretching in acute phase (Kujala)"] });
      }
      if (adductor) {
        differentials.push({ label:"Adductor strain / tendinopathy",
          confidence:"MODERATE",
          evidence:"Adductor location; resisted adduction aggravates; kicking / sprinting mechanism",
          tests:["Resisted adduction — isometric","Squeeze test (0° and 45° hip flexion)","Adductor palpation","Pubic symphysis tenderness — athletic pubalgia screen","Resisted hip flexion (iliopsoas differentiation)"] });
      }
      if (any(locPatt,"lateral hip")) {
        differentials.push({ label:"Greater trochanteric pain syndrome (GTPS) / abductor tendinopathy",
          confidence: any(inAggAct,"lying on affected side","crossing legs","climbing stairs") ? "MODERATE" : "LOW",
          evidence:"Lateral hip pain over greater trochanter; lying on side / crossing legs aggravates",
          tests:["FABER test — lateral hip pain reproduction","Single leg stance — Trendelenburg","Hip abductor strength (side-lying)","30-second single-leg standing test","Avoid compressive positions (crossing legs / lying on affected side advice)"] });
      }
      if (piriform) {
        differentials.push({ label:"Piriformis / deep gluteal syndrome",
          confidence:"LOW",
          evidence:"Deep buttock pain without lumbar cause; hip internal rotation aggravates; sitting triggers sciatica",
          tests:["FAIR test (hip flexion + adduction + internal rotation)","Beatty test (side-lying hip ABD)","Palpation deep gluteal (piriformis point)","Lumbar screen — SLR to exclude radiculopathy","ULNT differential if neural component"] });
      }
      if (meralgia) {
        differentials.push({ label:"Meralgia paraesthetica (lateral femoral cutaneous nerve)",
          confidence: any(av("hp_meralgia")||"","no back pain","lateral thigh burning") ? "MODERATE" : "LOW",
          evidence:"Lateral thigh burning / numbness; no motor weakness; worse standing / walking; no lumbar cause",
          tests:["Sensory testing lateral thigh (LFCN territory)","Lumbar AROM + SLR to exclude lumbar cause","Hip quadrant — local vs referred","LFCN provocation (Tinel below inguinal ligament)","GP referral if persistent — possible nerve block"] });
      }
      if (pubicSPD) {
        differentials.push({ label:"Pubic symphysis dysfunction / SPD",
          confidence:"MODERATE",
          evidence:"Pubic symphysis location; post-partum / pregnancy; adductor / pubic pain",
          tests:["Active straight leg raise (ASLR)","Posterior pelvic pain provocation (P4/PPPP)","Palpation pubic symphysis","Hip adductor squeeze test","Sacral thrust","Pelvic floor referral"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? "⚠ Urgent referral required" : differentials[0]?.label || "Hip / groin dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Emergency referral — no loading"] :
        ["Gait observation — Trendelenburg / antalgic","Hip AROM all planes (flexion/ER/IR/abduction)",
         "FADIR test","FABER test","Thomas test (hip flexor length)",
         ...(hamstrStrain?["Hamstring palpation","Resisted knee flexion 15° + 90°","SLR — muscle vs neural"]:
             hamstrPT?["Ischial tuberosity palpation","Resisted knee flexion 15°"]:
             any(locPatt,"lateral hip")?["Single leg stance","Hip abductor strength"]:[]),
         "Lumbar screen if posterior / radiating symptoms",
         highIrrit?"Limit to passive ROM and observation first session":""];
    }

    // ─── ANKLE / FOOT ─────────────────────────────────────────────
    if (region === "Ankle / Foot") {
      const rfField    = av("af_rf");
      const plantar    = any(rv("morning"), "first step severely painful", "first step painful — then eases", "plantar fascia classic");
      const rupture    = any(rv("moi_pop"), "felt at achilles insertion", "felt at mid-achilles");
      const ottawaAF   = any(rfField,"ottawa rules — bony","ottawa rules — cannot weight bear","navicular","5th metatarsal");
      const tendinMid  = any(inLoc,"mid-portion achilles") && (warmUpPattern || any(inAggAct,"running"));
      const insertAch  = any(inLoc,"insertional") && any(rf("morning"),"achilles stiff");
      const mortons    = any(inLoc,"3rd / 4th interspace") && any(inAggAct,"tight shoes","narrow toe box");
      const tibPost    = any(inLoc,"tibialis posterior") && any(inAggAct,"walking","standing prolonged");
      const calfStrain = any(av("af_calf_onset")||"","sudden onset sprint","felt pop","shot in back of leg","immediate sharp","bruising appeared","visible defect");
      const achRupture = any(av("af_calf_onset")||"","cannot rise on tiptoe","felt like shot","achilles rupture");
      const shinPain   = any(av("af_shin_pain")||"","medial tibial","stress reaction","mtss","stress fracture");
      const lisfranc   = any(av("af_lisfranc")||"","midfoot pain","bruising on plantar","sole of foot");
      const peroneal   = any(av("af_peroneal")||"","clicking / snapping behind lateral","felt tendon flick");

      if (rupture || achRupture) { prec.push("⚠ Possible Achilles rupture — Thompson test urgently; do not weight bear; urgent orthopaedic referral"); urgentFlag = true; tags.push("⚠ Achilles rupture"); }
      if (ottawaAF) { prec.push("Ottawa Rules positive — ankle x-ray required before physiotherapy loading"); tags.push("⚠ Ottawa +ve"); }
      if (lisfranc) { prec.push("⚠ Possible Lisfranc injury — urgent orthopaedic review; non-weight bearing until x-ray + CT cleared"); tags.push("⚠ Lisfranc screen"); urgentFlag = true; }
      if (any(rfField,"compartment syndrome")) { prec.push("⚠ Compartment syndrome — emergency surgical review"); urgentFlag = true; }

      if (calfStrain || any(inMoi,"inversion sprain") && any(inLoc,"calf")) {
        differentials.push({ label:"Calf muscle strain (gastrocnemius / soleus)",
          confidence: any(av("af_calf_onset")||"","sudden onset sprint","shot in back","felt pop","bruising") ? "HIGH" : "MODERATE",
          evidence:`Sudden onset sprint / push-off mechanism; posterior calf pain${any(av("af_calf_onset")||"","bruising")?" + bruising":""}${any(av("af_calf_onset")||"","visible defect")?" + visible defect (grade 3)":""}`,
          tests:["Palpation gastrocnemius / soleus — locate tear","Thompson test (Achilles rupture exclusion)","Passive dorsiflexion — stretch pain","Resisted plantarflexion — pain + weakness","Single heel raise — endurance","US / MRI for grade 2-3 tears"] });
      }
      if (plantar) {
        differentials.push({ label:"Plantar fasciopathy",
          confidence: any(rv("morning"),"first step severely painful","then eases") ? "HIGH" : "MODERATE",
          evidence:"First-step morning pain easing with walking (classic plantar fascia pattern)",
          tests:["Windlass test (great toe extension)","Plantar fascia palpation — medial calcaneal attachment","Weight-bearing ankle DF ROM","Silfverskiöld test (equinus?)","Footwear assessment","VISA-PF questionnaire"] });
      }
      if (tendinMid) {
        differentials.push({ label:"Mid-portion Achilles tendinopathy",
          confidence: warmUpPattern && any(inAggAct,"running") ? "MODERATE" : "LOW",
          evidence:`Mid-portion Achilles location; ${warmUpPattern?"warms up with activity (classic tendinopathy)":""}; running / overuse mechanism`,
          tests:["Palpation mid-portion Achilles (2-7cm above insertion)","Single leg heel raise — endurance (30 reps)","VISA-A questionnaire","Hop test — pain provocation","Royal London Hospital test (arc sign)","US if diagnosis uncertain"] });
      }
      if (insertAch) {
        differentials.push({ label:"Insertional Achilles tendinopathy / Haglund's",
          confidence:"MODERATE",
          evidence:"Achilles insertion pain; morning stiffness; aggravated by shoe counter",
          tests:["Insertional palpation (anterior fibres)","Squeeze test — insertional","Passive DF — posterior impingement","Haglund's — bony prominence visible / palpable","VISA-A","Heel raise modification (relieve compressive load)"] });
      }
      if (mortons) {
        differentials.push({ label:"Morton's neuroma (interdigital nerve)",
          confidence:"MODERATE",
          evidence:"3rd/4th interspace burning; tight shoes aggravate; relieved by removing shoes",
          tests:["Mulder's click test (webspace compression + forefoot squeeze)","Webspace palpation — 3rd/4th space","Metatarsal compression test","Toe splay — neural tension","US confirms diagnosis (gold standard for Morton's)"] });
      }
      if (tibPost) {
        differentials.push({ label:"Tibialis posterior tendinopathy / insufficiency",
          confidence:"MODERATE",
          evidence:"Medial ankle / tibialis posterior location; walking / standing aggravates; progressive flatfoot",
          tests:["Too many toes sign (hindfoot valgus / flatfoot)","Single heel raise — inability to invert heel","Tibialis posterior palpation","Too many toes test","Resisted plantarflexion + inversion","US / MRI if rupture suspected (stage II-IV)"] });
      }
      if (shinPain) {
        differentials.push({ label: any(av("af_shin_pain")||"","focal","stress fracture","at rest") ? "Tibial stress fracture" : "Medial tibial stress syndrome (MTSS / shin splints)",
          confidence: any(av("af_shin_pain")||"","focal","at rest","stress fracture") ? "MODERATE" : "LOW",
          evidence:`${any(av("af_shin_pain")||"","focal","at rest")?"Focal tibial tenderness at rest — stress fracture screen":"Diffuse medial tibial pain with running overload"}`,
          tests:["Tibial palpation — focal vs diffuse","Ottawa-equivalent: focal + unable to hop","If stress fracture suspected: MRI (gold standard) or bone scan","Training load assessment","Running biomechanics","Bone density if recurrent"] });
      }
      if (peroneal) {
        differentials.push({ label:"Peroneal tendon subluxation / tendinopathy",
          confidence:"MODERATE",
          evidence:"Lateral ankle clicking / snapping behind fibula; felt tendon flick out of groove",
          tests:["Peroneal tendon palpation posterior to fibula","Resisted eversion","Circumduction test — reproduce subluxation","US — dynamic assessment (gold standard for subluxation)"] });
      }

      if (!differentials.length && !urgentFlag) {
        if (any(inMoi,"inversion sprain")) {
          differentials.push({ label:"Lateral ankle ligament sprain",
            confidence: any(rv("prev_sprains"),"first time") && isAcute ? "MODERATE" : "LOW",
            evidence:"Inversion mechanism; lateral ankle pain",
            tests:["Ottawa Rules (clear fracture)","Anterior drawer (ATFL)","Talar tilt (CFL)","Syndesmosis squeeze test (high ankle)","Peroneal tendons (associated injury screen)","Proprioception / balance assessment"] });
        } else {
          differentials.push({ label:"Ankle / foot dysfunction — insufficient data",
            confidence:"LOW", evidence:"Insufficient specific features for classification",
            tests:["Ankle AROM all planes","Weight-bearing DF ROM","Single leg heel raise","Gait observation","Ottawa Rules"] });
        }
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || "Ankle / foot dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Emergency referral — no loading until cleared"] :
        ["Gait observation — antalgic / foot mechanics","Ankle AROM all planes","Weight-bearing DF ROM (knee-to-wall test)",
         ...(plantar?["Windlass test","Plantar fascia palpation"]:tendinMid?["Heel raise endurance (30 reps)","VISA-A"]:mortons?["Mulder's click","Webspace palpation"]:[]),
         ...(shinPain?["Tibial palpation — focal vs diffuse","Hop test"]:calfStrain?["Thompson test","Calf palpation"]:[]),
         "Ottawa Rules if acute",
         highIrrit?"Limit to observation + gentle PROM only":""];
    }

    // ─── ELBOW / WRIST / HAND ─────────────────────────────────────
    if (region === "Elbow/Wrist/Hand") {
      const rfField    = av("ew_rf");
      const scaph      = any(rfField,"suspected scaphoid","anatomical snuffbox");
      const compartment= any(rfField,"acute compartment syndrome");
      const crps       = any(rfField,"reflex sympathetic","crps");
      const cts        = any(rf("neuro"),"median nerve","night — wakes","improves with shaking hand");
      const cub        = any(rf("neuro"),"ulnar nerve — worse with elbow flexion","cubital tunnel");
      const lateralEpi = any(inAggMov,"wrist extension (resisted)") && any(inAggAct,"tennis","computer mouse","lifting kettle");
      const medialEpi  = any(inAggMov,"wrist flexion (resisted)") && any(inAggAct,"golf","medial","throwing");
      const deQ        = any(rf("neuro"),"de quervain's","thumb base pain","finkelstein") || (any(inAggMov,"thumb extension / abduction") && any(inAggAct,"new parent","lifting baby"));
      const tfing      = any(rf("neuro"),"trigger finger","click / lock with flexion");
      const tfcc       = any(av("ew_tfcc")||"","ulnar wrist pain","forearm rotation","clicking / clunking at ulnar wrist");
      const ucl        = any(av("ew_ucl")||"","overhead throwing","medial elbow","valgus stress","throwing velocity");
      const olecBursa  = any(av("ew_olecranon")||"","posterior elbow swelling","visible bump","direct trauma to posterior");
      const bicepsR    = any(av("ew_biceps_rupture")||"","pop in anterior elbow","hook test","distal","visible muscle deformity");
      const pectR      = any(av("ew_pect_rupture")||"","bench press","pop in chest","immediate weakness horizontal");

      if (scaph)      { prec.push("⚠ Suspected scaphoid fracture — immobilise in scaphoid cast; MRI/CT recommended (x-ray false negative up to 20%); orthopaedic referral"); urgentFlag = true; tags.push("⚠ Scaphoid"); }
      if (compartment){ prec.push("⚠ Acute compartment syndrome — emergency surgical review; do not elevate above heart level"); urgentFlag = true; }
      if (crps)       { prec.push("⚠ CRPS features — pain clinic referral; avoid aggressive manual therapy; graded motor imagery approach"); tags.push("⚠ CRPS"); urgentFlag = true; }
      if (bicepsR)    { prec.push("⚠ Possible distal biceps rupture — urgent orthopaedic review within 2 weeks for surgical candidates"); tags.push("⚠ Biceps rupture"); urgentFlag = true; }

      if (lateralEpi) {
        differentials.push({ label:"Lateral epicondylalgia (common extensor tendinopathy)",
          confidence: any(inAggAct,"tennis","computer mouse") && any(inAggMov,"wrist extension (resisted)") ? "HIGH" : "MODERATE",
          evidence:`Lateral epicondyle; wrist extension resisted aggravates; ${any(inAggAct,"tennis")?"racquet sport":"overuse"} mechanism`,
          tests:["Cozen's test (resisted wrist extension)","Mill's test (passive wrist flexion + elbow extension)","Lateral epicondyle palpation","Grip strength comparison","PRTEE questionnaire","Cervical screen — C6 referral"] });
      }
      if (medialEpi) {
        differentials.push({ label:"Medial epicondylalgia (common flexor tendinopathy)",
          confidence:"MODERATE",
          evidence:"Medial epicondyle; wrist flexion resisted aggravates; golf / throwing mechanism",
          tests:["Resisted wrist flexion + pronation","Medial epicondyle palpation","UCL screen (valgus stress)","Ulnar nerve screen (cubital tunnel)","PRTEE questionnaire"] });
      }
      if (cts) {
        differentials.push({ label:"Carpal tunnel syndrome (median nerve)",
          confidence: any(rf("neuro"),"night — wakes","improves with shaking") ? "HIGH" : "MODERATE",
          evidence:`Median nerve distribution${any(rf("neuro"),"night — wakes")?" waking at night (classic)":""}${any(rf("neuro"),"improves with shaking")?" + flick test positive":""}`,
          tests:["Phalen's test (wrist flexion 60s)","Tinel's test at carpal tunnel","ULNT median","Two-point discrimination index finger","Nerve conduction study (gold standard)","Boston CTS questionnaire"] });
      }
      if (cub) {
        differentials.push({ label:"Cubital tunnel syndrome (ulnar nerve at elbow)",
          confidence:"MODERATE",
          evidence:"Ulnar nerve distribution (little + ring); worse with elbow flexion sustained (phone call)",
          tests:["Elbow flexion test (sustained 60s)","Tinel's at cubital tunnel","ULNT ulnar","Two-point discrimination little finger","Nerve conduction study","Intrinsic muscle wasting assessment"] });
      }
      if (deQ) {
        differentials.push({ label:"De Quervain's tenosynovitis (1st dorsal compartment)",
          confidence: any(inAggAct,"new parent","lifting baby") && any(inAggMov,"thumb extension / abduction") ? "HIGH" : "MODERATE",
          evidence:`Thumb base / radial wrist; thumb extension aggravates${any(inAggAct,"new parent","lifting baby")?" + new parent (classic)":""}`,
          tests:["Finkelstein's test","Thumb CMC loading / grinding test (exclude CMC OA)","1st dorsal compartment palpation","US if diagnosis uncertain","Thumb spica splint trial"] });
      }
      if (tfcc) {
        differentials.push({ label:"TFCC injury (triangular fibrocartilage complex)",
          confidence:"MODERATE",
          evidence:"Ulnar wrist pain; rotation (pronation/supination) aggravates; clicking with forearm rotation",
          tests:["TFCC compression test (ulnar deviation + axial load)","Piano key test (distal radioulnar joint)","Passive forearm rotation — pain arc","Fovea sign (ulnar styloid fovea palpation)","MR arthrogram (gold standard)"] });
      }
      if (ucl) {
        differentials.push({ label:"UCL elbow (medial collateral ligament — thrower's elbow)",
          confidence:"MODERATE",
          evidence:"Overhead throwing athlete; medial elbow pain at late cocking / ball release; valgus stress",
          tests:["Valgus stress test 30° flexion (moving valgus stress test)","Milking manoeuvre","Medial epicondyle vs UCL palpation","Ulnar nerve screen (associated cubital tunnel)","MRI (high sensitivity for UCL)"] });
      }
      if (tfing) {
        differentials.push({ label:"Trigger finger (digital flexor tenosynovitis)",
          confidence:"HIGH",
          evidence:"Clicking / locking with finger flexion; finger gets stuck in flexion",
          tests:["Passive / active finger flexion — trigger reproduction","A1 pulley palpation","Finger locking assessment (stuck in flexion)","GP referral for steroid injection as first line"] });
      }
      if (olecBursa) {
        differentials.push({ label:"Olecranon bursitis",
          confidence:"MODERATE",
          evidence:"Posterior elbow visible swelling; direct trauma or occupational (leaning on elbows)",
          tests:["Olecranon palpation","Fluctuance assessment","Temperature comparison","Septic bursitis: urgent aspiration if hot + systemically unwell","Gout screen if crystalline suspected"] });
      }

      if (!differentials.length && !urgentFlag) {
        differentials.push({ label:"Upper limb peripheral dysfunction — insufficient data", confidence:"LOW",
          evidence:"Insufficient specific features", tests:["Elbow/wrist/hand AROM","Grip + pinch strength","ULNT 1-4","Cervical screen"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || "Upper limb dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Defer assessment — urgent referral as above"] :
        ["Observation — wasting / deformity / posture","AROM — elbow / wrist / fingers / thumb","Grip strength (dynamometer)","Pinch strength",
         ...(cts?["Phalen's","Tinel's at carpal tunnel","ULNT median"]:cub?["Elbow flexion test","Tinel's at cubital tunnel","ULNT ulnar"]:
             lateralEpi?["Cozen's test","Mill's test","Grip strength comparison"]:deQ?["Finkelstein's","Thumb CMC loading"]:[]),
         "Cervical screen — AROM + ULNT (exclude double crush)"];
    }

    // ─── THORACIC ─────────────────────────────────────────────────
    if (region === "Thoracic spine") {
      const txRF   = av("tx_rf");
      const cardiac= any(txRF,"cardiac symptoms","cardiac history","radiation to left arm / jaw");
      const cord   = any(txRF,"neurological symptoms in legs","bilateral leg weakness");
      const fracT  = any(txRF,"recent trauma","known osteoporosis","pathological fracture") || fracRisk;
      const serious= txRF && !txRF.toLowerCase().includes("no red flags") && txRF.length > 5;
      const rib    = any(av("tx_rib_screen")||"","direct trauma","stress fracture","point tenderness over specific rib","rib spring");
      const costch  = any(av("tx_rib_screen")||"","costochondritis","anterior chest","cartilage tenderness","tietze");
      const facet  = any(inAggMov,"rotation") && mechanicalPattern && !constantPain;
      const postural= any(inAggPost,"computer","sitting","driving","backpack") && !constantPain;

      if (cardiac) { prec.push("⚠ Cardiac symptoms with thoracic pain — urgent ECG / medical review; not MSK until cardiac excluded"); urgentFlag = true; tags.push("⚠ Cardiac screen"); }
      if (cord)    { prec.push("⚠ Cord compression signs — urgent neurosurgical opinion"); urgentFlag = true; }
      if (fracT)   { prec.push("⚠ Thoracic fracture risk — imaging before loading; manipulation contraindicated"); tags.push("⚠ Fracture risk"); }
      if (serious && !cardiac && !cord) { prec.push("⚠ Thoracic red flags: visceral, malignancy, fracture differentials require urgent medical screening"); urgentFlag = true; }

      if (rib) {
        differentials.push({ label: any(av("tx_rib_screen")||"","stress fracture","rowing","coughing athlete") ? "Rib stress fracture" : "Rib fracture / contusion",
          confidence: any(av("tx_rib_screen")||"","direct trauma","point tenderness") ? "MODERATE" : "LOW",
          evidence:`${any(av("tx_rib_screen")||"","direct trauma")?"Direct trauma; ":""}${any(av("tx_rib_screen")||"","point tenderness")?"point rib tenderness; ":""}worse breathing / coughing`,
          tests:["Rib spring test (anterior-posterior chest compression)","Localised rib palpation","Chest x-ray (insensitive acutely — bone scan / CT better)","Breathing assessment","Spirometry if respiratory compromise"] });
      }
      if (costch) {
        differentials.push({ label:"Costochondritis / Tietze syndrome",
          confidence:"MODERATE",
          evidence:"Anterior chest wall; cartilage tenderness; no trauma; worse deep breath / cough",
          tests:["Costochondral junction palpation (2nd-5th ribs most common)","Tietze: swelling present at junction","Horizontal shoulder adduction — chest wall stress","Cardiac exclusion first if any chest symptoms"] });
      }
      if (facet && !serious) {
        differentials.push({ label:"Thoracic facet / costovertebral dysfunction",
          confidence:"MODERATE",
          evidence:"Rotation aggravates; localised thoracic pain; mechanical pattern; responds to manipulation",
          tests:["Thoracic AROM — rotation especially","PA central + unilateral pressures T1-T12","Rib springing","Costovertebral palpation","Combined movement assessment"] });
      }
      if (postural && !serious) {
        differentials.push({ label:"Thoracic postural / myofascial dysfunction",
          confidence:"LOW",
          evidence:"Sustained desk / screen posture aggravates; mechanical; no red flags",
          tests:["Thoracic kyphosis assessment","Scapular position / winging","Pectoralis minor length","Mid-thoracic AROM","PA pressures"] });
      }
      if (!differentials.length) {
        differentials.push({ label: serious ? "⚠ Thoracic pain with red flag indicators" : "Mechanical thoracic dysfunction", confidence: serious ? "HIGH" : "LOW",
          evidence: serious ? "Red flags identified — require urgent medical screening" : "Mechanical pattern, no specific classification features",
          tests: serious ? ["Urgent medical referral — do not treat as MSK yet"] : ["Thoracic AROM","PA pressures","Rib springing","Postural assessment"] });
      }

      differentials.sort((a,b)=>(b.confidence==="HIGH"?2:b.confidence==="MODERATE"?1:0)-(a.confidence==="HIGH"?2:a.confidence==="MODERATE"?1:0));
      primaryPattern = urgentFlag ? `⚠ ${differentials[0]?.label || "Urgent referral"}` : differentials[0]?.label || "Thoracic dysfunction";
      confidence = urgentFlag ? "HIGH" : differentials[0]?.confidence || "LOW";
      objTests = urgentFlag ? ["Urgent medical referral — do not treat as MSK until cleared"] :
        ["Postural observation — thoracic kyphosis","Thoracic AROM all planes","PA central + unilateral pressures T1-T12",
         "Rib springing","Costovertebral palpation",
         ...(rib?["Rib spring test","Localised rib palpation"]:costch?["Costochondral palpation","Horizontal shoulder adduction"]:facet?["Rotation AROM","Combined movements"]:[]),
         highIrrit?"Limit to observation + gentle PROM only":""];
    }

    // Final output for this region
    return {
      region, tags, primaryPattern, confidence, urgentFlag,
      differentials: differentials.slice(0, 3), // Top 3 only
      precautions: [...globalRedFlags, ...prec].filter(Boolean),
      objTests: objTests.filter(Boolean),
      highIrrit, modIrrit,
      inflammatoryPattern, mechanicalPattern, tendinopathicPattern,
      radiculopathySig, neurodynamicSig, nociplasticSig,
      nrsNow, nrsWorst, isAcute, isSubacute, isChronic,
    };
  }).filter(Boolean);

  // ══════════════════════════════════════════════════════════════════
  // CROSS-REGION ANALYSIS (unchanged — clinically correct)
  // ══════════════════════════════════════════════════════════════════
  const cross = [];
  const rgs = selectedRegions;
  const hasCx  = rgs.includes("Cervical spine");
  const hasLx  = rgs.includes("Lumbar / SI");
  const hasTx  = rgs.includes("Thoracic spine");
  const hasSHL = rgs.includes("Shoulder (L)");
  const hasSHR = rgs.includes("Shoulder (R)");
  const hasKnL = rgs.includes("Knee (L)");
  const hasKnR = rgs.includes("Knee (R)");
  const hasAF  = rgs.includes("Ankle / Foot");
  const hasHp  = rgs.includes("Hip / Groin");
  const hasEW  = rgs.includes("Elbow/Wrist/Hand");

  if (hasCx && (hasSHL || hasSHR))
    cross.push({type:"Differential",title:"Cervical vs Shoulder — Referred Pain",detail:"Concurrent cervical and shoulder: C4=top of shoulder; C5=deltoid region. ULNT reproducing shoulder symptoms = cervical origin. Shoulder special tests negative in pure cervical referral. Shoulder abduction relief sign (arm overhead relieves arm symptoms) = C5/C6 root. Assess cervical AROM first.",refs:"Magee Ch.3+Ch.5 / Butler (ULNT) / Wainner"});
  if (hasLx && (hasKnL || hasKnR))
    cross.push({type:"Differential",title:"Lumbar vs Knee — L3/L4 Referral",detail:"L3 radiculopathy refers to anterior thigh and medial knee. L4 to medial lower leg. Obturator nerve (L2-L4) mimics knee/groin pain. Screen lumbar AROM + SLR before knee loading. If lumbar reproduces knee symptoms, lumbar takes priority.",refs:"Magee Ch.9+Ch.12 / Butler"});
  if (hasLx && hasHp)
    cross.push({type:"Clinical note",title:"Lumbar + Hip — Kinetic Chain",detail:"Hip OA refers to groin/medial knee. Restricted hip flexion/IR increases lumbar demand through hip-lumbar rhythm. Thomas test, FABER, hip quadrant early. If hip ROM restricted, address hip before attributing all symptoms to lumbar.",refs:"Sahrmann / Magee Ch.9+Ch.11"});
  if (hasHp && (hasKnL || hasKnR))
    cross.push({type:"Clinical note",title:"Hip + Knee — Kinetic Chain",detail:"Hip abductor weakness drives dynamic knee valgus — PFPS, ITB syndrome, medial knee overload. Ankle DF restriction increases tibial internal rotation and knee valgus. Assess hip abductor strength and ankle DF ROM as part of knee evaluation.",refs:"Brukner & Khan / Cook & Purdam / BJSM"});
  if (hasAF && (hasKnL || hasKnR))
    cross.push({type:"Clinical note",title:"Ankle + Knee — Kinetic Chain",detail:"Ankle DF restriction (<35-38° weight-bearing) increases tibial internal rotation during squat/landing, loading the medial knee and patellofemoral joint. Foot hyperpronation drives dynamic valgus. Previous ankle sprains alter proprioception affecting knee stability.",refs:"Brukner & Khan / Cook & Purdam"});
  if (hasCx && hasLx)
    cross.push({type:"Clinical note",title:"Cervical + Lumbar — Multi-level Spinal",detail:"Multi-level spinal raises: axial spondyloarthropathy (AS), DISH, generalised degenerative polyarthropathy, or nociplastic pain. ESR, CRP, HLA-B27, spinal x-rays, rheumatology review if constitutional symptoms. Multi-site pain alone increases nociplastic probability.",refs:"Magee Ch.3+Ch.9 / ASAS / NICE"});
  if (hasSHL && hasSHR)
    cross.push({type:"⚠ Clinical flag",title:"Bilateral Shoulder — Systemic Screen",detail:"Screen for: PMR (age >50, bilateral shoulder + pelvic girdle, elevated ESR, prednisolone responsive — classically missed), bilateral RCT, RA, thoracic outlet. Check ESR, CRP, RF urgently. PMR responds dramatically to low-dose prednisolone.",refs:"EULAR PMR guidelines / Magee Ch.5 / BSR"});
  if (hasKnL && hasKnR)
    cross.push({type:"Clinical note",title:"Bilateral Knee — Systemic Screen",detail:"Screen for: crystal arthropathy (gout/pseudogout — acute hot joint), inflammatory arthritis (RA, psoriatic, reactive), obesity-related bilateral OA, bilateral PFPS in adolescent females. ESR, CRP, uric acid if inflammatory pattern suspected.",refs:"Magee Ch.12 / NICE / BSR"});
  if (hasCx && hasEW)
    cross.push({type:"Differential",title:"Cervical + Elbow/Wrist — Double Crush",detail:"Proximal nerve compression (cervical disc) sensitises nerve distally for compression at elbow (cubital tunnel) or wrist (carpal tunnel). ULNT 1-4 differentiates source. Treat proximal before distal. Both sites may need simultaneous treatment.",refs:"Magee Ch.3 / Butler (ULNT) / Upton & McComas (1973)"});
  if (hasLx && hasTx)
    cross.push({type:"Clinical note",title:"Thoracic + Lumbar — Combined Spinal",detail:"T12-L1 is a common hinge point — T12 refers to iliac crest/groin mimicking lumbar. Thoracic red flags must be screened carefully (higher serious pathology rate). Thoracolumbar fascia connects both regions.",refs:"Magee Ch.8+Ch.9"});
  if (hasHp && hasAF)
    cross.push({type:"Clinical note",title:"Hip + Ankle — Pelvic Kinetic Chain",detail:"Hip abductor weakness + ankle hyperpronation often co-exist driving a medial collapse pattern. Address both simultaneously. Meralgia paraesthetica (LFCN) can be aggravated by hip position changes secondary to ankle pronation compensation.",refs:"Sahrmann / Brukner & Khan"});
  if (rgs.length >= 3)
    cross.push({type:"⚠ Clinical flag",title:`${rgs.length} Simultaneous Regions — Nociplastic Screening`,detail:`${rgs.length} simultaneous pain regions significantly raises the prior probability of nociplastic pain regardless of local structural findings. The number of pain sites is independently predictive of central sensitisation. Complete: CSI (≥40 = positive), STarT Back, Örebro, PCS-13, TSK-11. Prioritise pain neurophysiology education and multidisciplinary assessment.`,refs:"Woolf (nociplastic pain — IASP 2017) / Moseley & Butler / Nijs"});

  const anyUrgent = regionResults.some(r => r.urgentFlag);
  return { regionResults, cross, anyUrgent };
}
// CollapsibleNavGroup kept for compatibility but replaced by compact 2-row nav below


function CollapsibleMulticheck({ f, val, PC, toggleMulti, searchTerm, SEP_S }) {
  const VISIBLE = 6; // always-visible options
  const selected = val ? String(val).split(SEP_S).filter(Boolean) : [];
  const opts = searchTerm
    ? f.options.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()))
    : f.options;
  const hasSelected = selected.length > 0;
  const [showMore, setShowMore] = React.useState(false);

  // Sort: selected options first, then rest in original order
  const sortedOpts = [
    ...opts.filter(o => selected.includes(o)),
    ...opts.filter(o => !selected.includes(o)),
  ];
  const visibleOpts = showMore ? sortedOpts : sortedOpts.slice(0, VISIBLE);
  const hiddenCount = sortedOpts.length - VISIBLE;

  const PillBtn = ({ opt }) => {
    const on = selected.includes(opt);
    const isUrgent = opt.toLowerCase().includes("urgent") || opt.startsWith("⚠");
    return (
      <button type="button" onClick={() => toggleMulti(f.id, opt)}
        style={{
          padding:"9px 14px", borderRadius:99, cursor:"pointer",
          border:`1.5px solid ${on ? (isUrgent ? PC.red : PC.accent) : PC.border}`,
          background: on ? (isUrgent ? PC.red+"15" : PC.accent+"15") : PC.s2,
          color: on ? (isUrgent ? PC.red : PC.accent) : PC.muted,
          fontSize:"0.88rem", fontWeight: on ? 700 : 500,
          lineHeight:1.4, minHeight:38, transition:"all 110ms",
        }}>
        {opt}
      </button>
    );
  };

  return (
    // Flat, unboxed pill row -- no outer card/border, no separate "selected
    // tags" summary strip. Selection state shows purely via each pill's own
    // filled/highlighted style, matching the confirmed lightweight mockup
    // (numbered line-wise fields, no boxed containers around chip choices).
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {visibleOpts.map(opt => <PillBtn key={opt} opt={opt} />)}
      {!showMore && hiddenCount > 0 && (
        <button type="button" onClick={() => setShowMore(true)}
          style={{ padding:"9px 14px", borderRadius:99, cursor:"pointer",
            border:`1.5px dashed ${PC.border}`, background:"transparent",
            color:PC.muted, fontSize:"0.82rem", fontWeight:600,
            lineHeight:1.4, minHeight:38 }}>
          +{hiddenCount} more
        </button>
      )}
      {showMore && hiddenCount > 0 && (
        <button type="button" onClick={() => setShowMore(false)}
          style={{ padding:"9px 14px", borderRadius:99, cursor:"pointer",
            border:`1.5px dashed ${PC.border}`, background:"transparent",
            color:PC.muted, fontSize:"0.82rem", fontWeight:600,
            lineHeight:1.4, minHeight:38 }}>
          Show less ▲
        </button>
      )}
    </div>
  );
}


// ── Field-level clinical help text (shown as ⓘ tooltip) ──────────────────────
const FIELD_HELP = {
  // Pain descriptors
  "grf_irritability": "Irritability = how easily symptoms are provoked AND how long they take to settle. HIGH: minimal activity causes severe prolonged pain. LOW: requires significant load, settles quickly. Guides how aggressively to assess.",
  "sub_vas": "Visual Analogue Scale 0–10. 0 = no pain. 10 = worst imaginable pain. Ask: 'right now' and 'worst in past 24 hours'. >7 = severe, treat as high irritability.",
  "cc_vas_now": "VAS 0–10 right now. 0 = no pain, 10 = worst imaginable. Use for baseline comparison across sessions.",
  // Behaviour
  "cx_behaviour": "Behaviour describes how symptoms change with movement and time. Mechanical: varies with posture/load. Inflammatory: worse at rest, better with movement. Chemical: constant, unrelated to position.",
  "lx_behaviour": "Mechanical: varies with load/posture. Inflammatory: morning stiffness >30min, improves with movement. Chemical (tissue irritation): constant pain, little postural relief.",
  // Neurological
  "lx_dermatomal": "A dermatome is a skin area supplied by a single spinal nerve root. Dermatomal pain suggests nerve root irritation (radiculopathy). Non-dermatomal referred pain is more likely somatic (joints/muscles).",
  "lx_rf_cauda": "Cauda Equina Syndrome (CES) = compression of the cauda equina nerve roots. EMERGENCY. Classic presentation: saddle anaesthesia, bilateral leg weakness, bladder/bowel dysfunction. Requires immediate emergency referral.",
  "lx_neuro_signs": "Neurological signs suggest nerve root or cord involvement. Dermatomal numbness = sensory root. Weakness = motor root. Absent reflex = arc interruption. Bilateral signs elevate concern for central pathology.",
  // Special questions
  "lx_bladder_baseline": "ALWAYS establish baseline BEFORE onset. New bladder/bowel dysfunction since pain started = potential cauda equina flag. Pre-existing problems are less clinically significant.",
  "cx_upper_limb": "Cervical myelopathy (cord compression) can cause upper limb clumsiness, grip weakness, and fine motor difficulty. Ask about: dropping objects, difficulty with buttons, handwriting changes.",
  "cx_instability": "Clinical instability = ligamentous laxity after trauma (e.g. whiplash, RA). Sharp pain with head movement, 'clunking', feeling head will fall off. Cervical manipulation is CONTRAINDICATED if instability suspected.",
  // Psychosocial
  "cx_yellow_flags": "Yellow Flags (Kendall 1997) = psychosocial risk factors for chronic pain. Negative beliefs (pain = harm), passive coping, low job satisfaction, and fear-avoidance predict poor outcome more than physical findings.",
  "lx_yellow_flags": "Yellow Flags = psychosocial risk factors for chronic disability. Include: belief pain is harmful, depression, anxiety, poor work relationships, compensation issues. Screen with STarT MSK or Örebro tools.",
  // ROM
  "cx_rom_active": "Active ROM tests contractile and inert structures + neurodynamics. Note: range (degrees if goniometer), end-feel, and pain response (P1 = onset, P2 = end of range). Compare to contralateral side.",
  "lx_rom_active": "Active lumbar ROM. Flexion: normally >60°. Extension: 25°. Lateral flexion: 25° each. Rotation: 30° each. Instability flag: painful arc on return from flexion, or 'catch' with extension.",
  // Sleep
  "cx_night": "Night pain quality matters. Position-dependent = mechanical. Constant regardless of position = potentially serious (inflammatory, neoplastic). Waking from sleep repeatedly with no relief = red flag.",
  "lx_night": "Night pain: can patient get comfortable? Positional night pain = mechanical. Constant unable to get comfortable = inflammatory or serious pathology. Bladder waking since onset — compare to pre-pain baseline.",
};

// ══════════════════════════════════════════════════════════════════
// SETTINGS-STYLE ASSESSMENT UI — reusable row components
// (iOS Settings pattern: label left, value right-aligned, hairline
// dividers only — no per-field borders/boxes, no per-row icons.
// Suggestions live in a bottom sheet instead of on-screen at all times)
// ══════════════════════════════════════════════════════════════════

// Kept only for backward compatibility with any external caller —
// per-row icons were removed from the redesign (icons now live only
// in section headers, per feedback that per-row emoji stopped adding
// value after the first row).
// Best-effort icon per field, based on id/label keywords. Falls back
// to a neutral dot so every row still has a left-hand anchor even for
// fields this map doesn't recognise (custom/region-specific fields).
function fieldIcon_S(f) {
  const id = (f.id || "").toLowerCase();
  const label = (f.label || "").toLowerCase();
  const has = (s) => id.includes(s) || label.includes(s);
  if (has("chief") || has("main complaint")) return "🎯";
  if (has("goal")) return "🎯";
  if (has("onset")) return "📅";
  if (has("duration")) return "⏳";
  if (has("mechanism")) return "🚗";
  if (has("radiat")) return "☀️";
  if (has("location") || has("site")) return "📍";
  if (has("worst") && has("pain")) return "⚡";
  if (has("behav")) return "↗️";
  if (has("aggravat")) return "📈";
  if (has("reliev")) return "🍃";
  if (has("associated")) return "👤";
  if (has("red flag") || has("rf_") || has("_rf")) return "🚩";
  if (has("previous") || has("episode") || has("past history")) return "📋";
  if (has("medication")) return "💊";
  if (has("imaging") || has("report")) return "🖼️";
  if (has("occupation") || has("work")) return "💼";
  if (has("sleep") || has("night")) return "🌙";
  if (has("sport")) return "🏃";
  if (has("note") || has("detail")) return "📝";
  if (has("quality")) return "〰️";
  if (has("pain")) return "⚡";
  if (f.type === "range") return "⚡";
  if (f.type === "multicheck") return "📈";
  if (f.type === "textarea") return "📝";
  return "•";
}

// One row: small icon + label on the left (~30% width, fixed so
// every row lines up), the field's input on the right (~70%). A
// hairline divider is the only separator — rows are compact at rest
// and grow only as far as their content needs.
function AssessmentRow({ label, helpText, PC, children, last, stacked }) {
  return (
    <div className="pm-arow" style={{
      display: "flex",
      flexDirection: stacked ? "column" : "row",
      alignItems: stacked ? "stretch" : "center",
      gap: stacked ? 6 : 10,
      padding: "8px 2px",
      borderBottom: last ? "none" : "0.5px solid #EFEDF7",
    }}>
      <span className="pm-arow-label" style={{ width: stacked ? "100%" : "42%", flexShrink: 0, fontSize: "0.84rem", fontWeight: 400, color: "#5C5C6B", lineHeight: 1.25 }}>
        {label}
        {helpText && (
          <span title={helpText} style={{
            display: "inline-flex", marginLeft: 4, color: PC.accent,
            fontSize: "0.62rem", cursor: "help", verticalAlign: "top",
          }}>ⓘ</span>
        )}
      </span>
      <div style={{ width: stacked ? "100%" : "auto", flex: stacked ? "none" : 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

const autoGrow_S = (el) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
};

// Free-typed field: an auto-growing textarea — never truncates or
// hides text, it just wraps and gets taller as the therapist types.
function SmartInput({ value, onChange, PC, multiline }) {
  const taRef = useRef(null);
  useEffect(() => { autoGrow_S(taRef.current); }, [value]);
  return (
    <textarea ref={taRef} rows={1} value={value}
      onChange={e => { onChange(e); autoGrow_S(taRef.current); }}
      placeholder="Type or tap to enter..."
      className="pm-sinput-box pm-sinput-text"
      style={{
        width: "100%", boxSizing: "border-box", border: "1px solid #E4E1F5",
        borderRadius: 10, background: "#fff", padding: "8px 12px", fontSize: "0.82rem", fontWeight: 500,
        color: "#2D2D3A", fontFamily: "inherit", outline: "none", resize: "none", overflow: "hidden",
        lineHeight: 1.3, minHeight: 36,
      }} />
  );
}

// Compact pain slider — track + numeric readout in one row, no card.
function PainSliderCompact({ value, onChange, PC, label }) {
  const num = parseInt(value || 0, 10) || 0;
  // Found via an axe-core accessibility audit (item-5 testing pass): this
  // range input had no accessible name at all -- a screen-reader user had
  // no way to tell what a bare "0" was, let alone that moving it set a
  // 0-10 pain score. aria-label falls back to a generic label when the
  // caller doesn't pass the field's real one (defensive, not expected to
  // trigger from renderField below since every "range"-type field has one).
  const accessibleLabel = label || "Pain score, 0 to 10";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", boxSizing: "border-box",
      border: "1px solid #E4E1F5", borderRadius: 10, background: "#fff", padding: "6px 12px", minHeight: 36,
    }}>
      <span className="pm-slider-end" style={{ fontSize: "0.8rem", color: "#9A98AC", width: 12, flexShrink: 0 }}>0</span>
      <input type="range" min={0} max={10} step={1} value={num}
        onChange={e => onChange(e.target.value)}
        className="pm-nrs-range"
        aria-label={accessibleLabel}
        aria-valuetext={`${num} out of 10`}
        style={{ flex: 1, minWidth: 0, accentColor: "#6C5CE7", cursor: "pointer", height: 28, touchAction: "none" }} />
      <span className="pm-slider-end" style={{ fontSize: "0.8rem", color: "#9A98AC", width: 16, flexShrink: 0 }}>10</span>
      <span className="pm-slider-val" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#2D2D3A", minWidth: 34, textAlign: "right", flexShrink: 0 }}>{num}/10</span>
    </div>
  );
}

// Combo field: pick-or-type. An auto-growing textarea that the
// therapist can type into directly, plus a small round arrow beside
// it that opens a compact list anchored to THIS field only (not a
// full-screen sheet). Selecting an option fills the text; the text
// stays editable afterward. Used for both single-select and
// multi-select fields — multi joins picks into a comma-separated
// line that's still hand-editable.
function ComboField({ f, val, PC, isMulti, setField, toggleMulti, SEP_S }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => { autoGrow_S(taRef.current); }, [val]);

  const selectedList = isMulti ? (val ? String(val).split(SEP_S).filter(Boolean) : []) : [];
  const textValue = isMulti ? selectedList.join(", ") : (val || "");

  const handleTyped = (e) => {
    const v = e.target.value;
    if (isMulti) {
      setField(f.id, v.split(",").map(s => s.trim()).filter(Boolean).join(SEP_S));
    } else {
      setField(f.id, v);
    }
    autoGrow_S(taRef.current);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <div className="pm-cfield-box" onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "flex-start", gap: 6, cursor: "pointer",
        border: `1px solid ${textValue ? "#C9C1F0" : "#E4E1F5"}`, borderRadius: 10,
        background: "#fff", padding: "0 8px 0 12px", minHeight: 36, boxSizing: "border-box",
      }}>
        <textarea ref={taRef} rows={1} value={textValue} onChange={handleTyped}
          onClick={e => e.stopPropagation()}
          placeholder={isMulti ? "Tap to select..." : "Tap to select..."}
          className="pm-cfield-text"
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            fontSize: "0.82rem", fontWeight: textValue ? 600 : 400,
            color: textValue ? "#7B68EE" : "#9A98AC", fontFamily: "inherit",
            resize: "none", overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word",
            lineHeight: 1.35, padding: "7px 0", margin: 0,
          }} />
        <button type="button" onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          className="pm-cfield-chevron" style={{
          flexShrink: 0, width: 24, height: 24, marginTop: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#6C5CE7", color: "#fff", fontSize: "0.85rem", cursor: "pointer",
          borderRadius: "50%", border: "none", lineHeight: 1,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 120ms ease",
        }}>⌄</button>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 40,
          background: "#fff", border: `1px solid ${PC.border}`, borderRadius: 12,
          boxShadow: "0 10px 28px rgba(0,0,0,0.14)", maxHeight: 210, overflowY: "auto", padding: 6,
        }}>
          {(f.options || []).map(o => {
            const isSel = isMulti ? selectedList.includes(o) : val === o;
            return (
              <button key={o} type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (isMulti) { toggleMulti(f.id, o); } else { setField(f.id, o); setOpen(false); }
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  textAlign: "left", border: "none", background: isSel ? PC.accent + "10" : "transparent",
                  padding: "9px 10px", borderRadius: 8, fontSize: "0.88rem", color: PC.text,
                  cursor: "pointer", fontFamily: "inherit", fontWeight: isSel ? 700 : 500,
                }}>
                <span>{o}</span>
                {isSel && <span style={{ color: PC.accent, fontWeight: 900 }}>✓</span>}
              </button>
            );
          })}
          {(f.options || []).length === 0 && (
            <div style={{ padding: 16, textAlign: "center", color: PC.muted, fontSize: "0.82rem" }}>No options</div>
          )}
        </div>
      )}
    </div>
  );
}

function SubjectiveModule({ data, set, onNav, onTabChange, navContext={}, requireAuth, viewStep }) {
  // viewStep lets the master workflow stepper (AppFull.jsx) show this
  // component's Hero/AI panel, Region picker, and main form as separate
  // full-page steps instead of one long scroll. Omitting the prop (or any
  // other call site not passing it) shows everything, unchanged from
  // before -- so this is purely additive.
  const showHeroAI = !viewStep || viewStep === "ai";
  const showRegionPicker = !viewStep || viewStep === "region";
  const showFormArea = !viewStep || viewStep === "form";
  const PC = typeof getC === "function" ? getC() : {
    surface:"#ffffff", s2:"#FFFFFF", s3:"#FFFFFF", border:"#E0E0E2",
    accent:"#7c3aed", a2:"#9333ea", a3:"#059669", text:"#0D0D0D",
    muted:"#6B6B6B", red:"#dc2626", yellow:"#b45309", green:"#059669",
    isDark:false, inputBg:"#FFFFFF", inputBorder:"#E0E0E2",
  };

  const [activeSection, setActiveSection] = useState("complaint");
  const [deepOpen, setDeepOpen] = useState({}); // section key -> show deep-dive fields
  const sectionTopRef = React.useRef(null);
  const groupTabsRef = React.useRef(null); // the region/group tab card — scroll target so a tab tap lands at the top of the region, keeping the tabs visible
  const [selectedRegions, setSelectedRegions] = useState(()=>{
    try{ return JSON.parse(data.cx_selected_regions||"[]"); }catch{ return []; }
  });
  const [insight, setInsight] = useState(()=>{
    try{ return data.cx_insight?JSON.parse(data.cx_insight):null; }catch{ return null; }
  });
  // Guards the four cx_lumbar_* rehydrations just below: only trust the
  // persisted lumbar blob if the persisted region selection actually still
  // includes Lumbar/SI. Without this, a stale cx_lumbar_variables sitting
  // alongside a `data` blob whose selected regions had since changed to
  // something else would render Phase 0/0.5 for a region that isn't even
  // selected any more.
  const dataHasLumbarRegionSelected = (() => {
    try {
      const regs = JSON.parse(data.cx_selected_regions || "[]");
      return regs.some(reg => (REGION_FAMILY_KEY[reg] || reg) === "Lumbar / SI");
    } catch { return false; }
  })();
  const [showInsight, setShowInsight] = useState(true);
  // Lumbar Variable Extractor state -- Pass 1 (deterministic, from
  // structured lx_* fields) is synchronous, set alongside `insight` in
  // runInterpretation(). Pass 2 (AI over free-text notes only) is async,
  // fetched separately and merged in once it resolves -- never blocks or
  // delays showing Pass 1's result.
  // Rehydrated from `data.cx_lumbar_*` (same pattern as `insight`/cx_insight
  // above) so Phase 0/0.5 survive navigating away to ROM/MMT/Special Tests
  // and back -- previously these four lived in local state only, with no
  // persisted source, so switching tabs unmounted this component and
  // switching back remounted it with everything reset to null/[], forcing
  // a re-click of "Review & Run Analysis" even though `insight` (the older
  // Phase 1 engine) correctly survived the same navigation.
  const [lumbarVariables, setLumbarVariables] = useState(()=>{
    try{ return (dataHasLumbarRegionSelected && data.cx_lumbar_variables)?JSON.parse(data.cx_lumbar_variables):null; }catch{ return null; }
  });
  const [lumbarNoteFindings, setLumbarNoteFindings] = useState(()=>{
    try{ return (dataHasLumbarRegionSelected && data.cx_lumbar_note_findings)?JSON.parse(data.cx_lumbar_note_findings):[]; }catch{ return []; }
  });
  const [lumbarNotesLoading, setLumbarNotesLoading] = useState(false);
  // Which fields in lumbarVariables were filled by the AI note pass
  // (Pass 2) rather than a checkbox (Pass 1) -- drives the "AI
  // extracted" badge in the Phase 0 display so a clinician can tell the
  // two sources apart at a glance.
  const [lumbarAiFilledFields, setLumbarAiFilledFields] = useState(()=>{
    try{ return (dataHasLumbarRegionSelected && data.cx_lumbar_ai_filled)?JSON.parse(data.cx_lumbar_ai_filled):[]; }catch{ return []; }
  });
  // Red-flag-category AI findings are never auto-merged into
  // redFlags.*.state (patient safety) -- they land here instead, purely
  // for on-screen review, so a clinician has to look and decide.
  const [lumbarPendingRedFlagReview, setLumbarPendingRedFlagReview] = useState(()=>{
    try{ return (dataHasLumbarRegionSelected && data.cx_lumbar_pending_rf)?JSON.parse(data.cx_lumbar_pending_rf):[]; }catch{ return []; }
  });
  // Layer 3 (Reasoning Engine) output -- recomputed synchronously
  // alongside lumbarVariables in runInterpretation(), since it's a pure
  // function of the already-extracted variables and needs no AI call.
  // On rehydration, re-derive it the same way from the rehydrated
  // lumbarVariables above rather than persisting a second redundant blob.
  const [lumbarReasoning, setLumbarReasoning] = useState(()=>{
    try{
      const lv0 = (dataHasLumbarRegionSelected && data.cx_lumbar_variables)?JSON.parse(data.cx_lumbar_variables):null;
      return lv0 ? runLumbarReasoningEngine(lv0) : null;
    }catch{ return null; }
  });
  // Cervical Variable Extractor / Reasoning Engine state -- exact mirror of
  // the Lumbar block above, including persistence from the start (this is
  // the bug already fixed once for Lumbar in a follow-up patch; built in
  // proactively here so it never has to be reported for Cervical).
  const dataHasCervicalRegionSelected = (() => {
    try {
      const regs = JSON.parse(data.cx_selected_regions || "[]");
      return regs.some(reg => (REGION_FAMILY_KEY[reg] || reg) === "Cervical spine");
    } catch { return false; }
  })();
  const [cervicalVariables, setCervicalVariables] = useState(()=>{
    try{ return (dataHasCervicalRegionSelected && data.cx_cervical_variables)?JSON.parse(data.cx_cervical_variables):null; }catch{ return null; }
  });
  const [cervicalNoteFindings, setCervicalNoteFindings] = useState(()=>{
    try{ return (dataHasCervicalRegionSelected && data.cx_cervical_note_findings)?JSON.parse(data.cx_cervical_note_findings):[]; }catch{ return []; }
  });
  const [cervicalNotesLoading, setCervicalNotesLoading] = useState(false);
  const [cervicalAiFilledFields, setCervicalAiFilledFields] = useState(()=>{
    try{ return (dataHasCervicalRegionSelected && data.cx_cervical_ai_filled)?JSON.parse(data.cx_cervical_ai_filled):[]; }catch{ return []; }
  });
  const [cervicalPendingRedFlagReview, setCervicalPendingRedFlagReview] = useState(()=>{
    try{ return (dataHasCervicalRegionSelected && data.cx_cervical_pending_rf)?JSON.parse(data.cx_cervical_pending_rf):[]; }catch{ return []; }
  });
  const [cervicalReasoning, setCervicalReasoning] = useState(()=>{
    try{
      const cv0 = (dataHasCervicalRegionSelected && data.cx_cervical_variables)?JSON.parse(data.cx_cervical_variables):null;
      return cv0 ? runCervicalReasoningEngine(cv0) : null;
    }catch{ return null; }
  });
  // Thoracic Variable Extractor / Reasoning Engine state -- exact mirror of
  // the Lumbar/Cervical blocks above, persistence built in from the start.
  const dataHasThoracicRegionSelected = (() => {
    try {
      const regs = JSON.parse(data.cx_selected_regions || "[]");
      return regs.some(reg => (REGION_FAMILY_KEY[reg] || reg) === "Thoracic spine");
    } catch { return false; }
  })();
  const [thoracicVariables, setThoracicVariables] = useState(()=>{
    try{ return (dataHasThoracicRegionSelected && data.cx_thoracic_variables)?JSON.parse(data.cx_thoracic_variables):null; }catch{ return null; }
  });
  const [thoracicNoteFindings, setThoracicNoteFindings] = useState(()=>{
    try{ return (dataHasThoracicRegionSelected && data.cx_thoracic_note_findings)?JSON.parse(data.cx_thoracic_note_findings):[]; }catch{ return []; }
  });
  const [thoracicNotesLoading, setThoracicNotesLoading] = useState(false);
  const [thoracicAiFilledFields, setThoracicAiFilledFields] = useState(()=>{
    try{ return (dataHasThoracicRegionSelected && data.cx_thoracic_ai_filled)?JSON.parse(data.cx_thoracic_ai_filled):[]; }catch{ return []; }
  });
  const [thoracicPendingRedFlagReview, setThoracicPendingRedFlagReview] = useState(()=>{
    try{ return (dataHasThoracicRegionSelected && data.cx_thoracic_pending_rf)?JSON.parse(data.cx_thoracic_pending_rf):[]; }catch{ return []; }
  });
  const [thoracicReasoning, setThoracicReasoning] = useState(()=>{
    try{
      const tv0 = (dataHasThoracicRegionSelected && data.cx_thoracic_variables)?JSON.parse(data.cx_thoracic_variables):null;
      return tv0 ? runThoracicReasoningEngine(tv0) : null;
    }catch{ return null; }
  });

  // Shoulder Phase 0 / 0.5 -- reuses the existing, already-tested Shoulder
  // reasoningEngine (src/reasoningEngine/) via shoulderPhase05.js's adapter,
  // rather than a separate Lumbar/Cervical/Thoracic-style extractor. Unlike
  // those three, this needs NO separate persisted blob: runShoulderPhase05(data)
  // is a pure, synchronous function of the same `data` record that's already
  // persisted for the whole form (no async Pass-2 AI note merge to preserve
  // across navigation), so simply re-deriving it from `data` on every mount/
  // rehydrate is both correct and sufficient.
  const dataHasShoulderRegionSelected = (() => {
    try {
      const regs = JSON.parse(data.cx_selected_regions || "[]");
      return regs.some(reg => reg === "Shoulder (L)" || reg === "Shoulder (R)");
    } catch { return false; }
  })();
  const [shoulderReasoning, setShoulderReasoning] = useState(()=>{
    try{ return dataHasShoulderRegionSelected ? runShoulderPhase05(data) : null; }catch{ return null; }
  });
  const [activeTab, setActiveTab] = useState(()=>data.cx_insight?"results":"form");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  // Re-sync selected regions from the loaded patient's saved record.
  // selectedRegions is seeded once in its useState initializer, which never
  // re-runs when a *different* patient is loaded into the same mounted module
  // -- so the newly loaded patient's regions weren't showing after switching
  // patients. This keeps state in step with data.cx_selected_regions. It's a
  // no-op when a local region toggle is the source (persisted value already
  // equals state), so it cannot loop.
  useEffect(() => {
    let persisted = [];
    try { persisted = JSON.parse(data.cx_selected_regions || "[]"); } catch { persisted = []; }
    setSelectedRegions(prev => (JSON.stringify(prev) === JSON.stringify(persisted) ? prev : persisted));
  }, [data.cx_selected_regions]);
  const [activeReviewRegion, setActiveReviewRegion] = useState(null); // which region tab is showing in the Interpretation results screen
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [openRegions, setOpenRegions] = useState({});
  const [regionSearch, setRegionSearch] = useState(""); // flat-list search, dedicated Body Regions step only

  // ── Field update helpers ────────────────────────────────────────────
  const setField = useCallback((id, val) => set({ ...data, [id]: val }), [data, set]);
  const toggleMulti = useCallback((id, opt) => {
    const cur = data[id] ? String(data[id]).split(SEP_S).filter(Boolean) : [];
    const next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt];
    set({ ...data, [id]: next.join(SEP_S) });
  }, [data, set]);

  // Toggle region selection (max 3)
  const toggleRegion = useCallback((r) => {
    setSelectedRegions(prev => {
      const next = prev.includes(r)
        ? prev.filter(x => x !== r)
        : prev.length >= 3 ? prev : [...prev, r];
      // Persist to patient data so navigation doesn't lose selection
      set({ cx_selected_regions: JSON.stringify(next), cx_insight: null,
        cx_lumbar_variables: null, cx_lumbar_note_findings: null, cx_lumbar_ai_filled: null, cx_lumbar_pending_rf: null,
        cx_cervical_variables: null, cx_cervical_note_findings: null, cx_cervical_ai_filled: null, cx_cervical_pending_rf: null,
        cx_thoracic_variables: null, cx_thoracic_note_findings: null, cx_thoracic_ai_filled: null, cx_thoracic_pending_rf: null });
      return next;
    });
    setInsight(null);
    setLumbarVariables(null);
    setLumbarNoteFindings([]);
    setLumbarAiFilledFields([]);
    setLumbarPendingRedFlagReview([]);
    setLumbarReasoning(null);
    setCervicalVariables(null);
    setCervicalNoteFindings([]);
    setCervicalAiFilledFields([]);
    setCervicalPendingRedFlagReview([]);
    setCervicalReasoning(null);
    setThoracicVariables(null);
    setThoracicNoteFindings([]);
    setThoracicAiFilledFields([]);
    setThoracicPendingRedFlagReview([]);
    setThoracicReasoning(null);
  }, [set, data]);

  // ── AI Parser state ────────────────────────────────────────────────
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState("text"); // "text" | "voice"
  const [aiText, setAiText] = useState("");
  const [aiStatus, setAiStatus] = useState("idle"); // "idle"|"recording"|"processing"|"done"|"error"
  const [aiResult, setAiResult] = useState(null);
  const [aiReview, setAiReview] = useState(false);
  const [aiShowAudit, setAiShowAudit] = useState(false); // zero-hallucination review: narrative vs extraction toggle

  const [aiSuccess, setAiSuccess] = useState(null); // { count, fields[] }
  const aiRecognitionRef = React.useRef(null);

  // Auto-open the AI Parser when arriving here via a "jump straight to intake
  // parser" navigation (e.g. Home screen's Patient Intake quick-launch).
  // Gated the same as the AI/Mic buttons below -- a guest landing here via
  // that deep link gets the sign-in prompt instead of a panel that would
  // just fail on submit.
  useEffect(() => {
    if (navContext && navContext.autoOpenAI) {
      if (requireAuth && !requireAuth("AI Patient Intake")) return;
      setAiOpen(true);
      setAiMode(navContext.aiMode === "voice" ? "voice" : "text");
      setAiStatus("idle");
    }
  }, [navContext]);

  const stopRecording = React.useCallback(() => {
    if (aiRecognitionRef.current) { try { aiRecognitionRef.current.stop(); } catch(e){} aiRecognitionRef.current = null; }
    setAiStatus("idle");
  }, []);

  const startRecording = React.useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome browser."); return; }
    setAiText(""); setAiStatus("recording"); setAiMode("voice");
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-IN";
    r.onresult = (e) => {
      let final = ""; let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setAiText((final + interim).trim());
    };
    r.onerror = () => { setAiStatus("error"); };
    r.onend = () => { setAiStatus(s => s === "recording" ? "idle" : s); };
    r.start();
    aiRecognitionRef.current = r;
  }, []);

  const runParse = React.useCallback(async (textToParse) => {
    if (!textToParse.trim()) return;
    stopRecording();
    setAiStatus("processing");

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ text: textToParse.trim() }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || "Server error");
      setAiResult(parsed);
      setAiStatus("done");
      setAiReview(true);
    } catch (e) {
      setAiStatus("error");
      setAiResult({ _errorMsg: e.message });
      console.error("AI parse error:", e);
    }
  }, [stopRecording]);

  const applyAiResult = React.useCallback((result) => {
    // Shared with the AI Assistant chat's own extraction flow -- see
    // aiIntakeParser.js. Previously this field mapping lived only here,
    // duplicated by hand anywhere else that wanted the same capability.
    const { updates, region: reg, filledLabels, redFlagsToReview, extractionMeta } = mapParseResultToUpdates(result, data, aiText);

    // Compute the merged region list synchronously, then set() it below
    // in the SAME updates object that carries every other field.
    // setSelectedRegions(prevFn) alone isn't enough here: React doesn't
    // run a functional updater inline -- it's deferred to the next
    // render -- so mutating `updates` from inside that callback and then
    // immediately calling set(updates) right after (as this used to do)
    // shipped `updates` to set() BEFORE the mutation had actually
    // happened, silently dropping cx_selected_regions. Caught by a real
    // render test simulating a remount after applying an AI result for a
    // brand-new region: the field was persisted as undefined, so a
    // reload would show the AI-filled data but no region tab selected
    // and "Review & Run Analysis" stuck disabled.
    if (reg && !selectedRegions.includes(reg) && selectedRegions.length < 3) {
      const next = [...selectedRegions, reg];
      updates.cx_selected_regions = JSON.stringify(next);
      setSelectedRegions(next);
    }

    // Red flags the AI noticed in the narrative -- previously extracted
    // by /api/parse and then silently discarded here, never shown to the
    // clinician. Surfaced as a prompt to go screen them properly, never
    // auto-marked positive/negative -- that stays a clinical judgement.
    if (redFlagsToReview.length) {
      // Append (not overwrite) to the real, already-visible clinician
      // notes field on the Neurological Red Flags screening tab, so this
      // actually surfaces somewhere a clinician would look, rather than
      // sitting in a field nothing renders.
      const existingNotes = data.neuro_clinician_notes || "";
      const aiNote = "AI noticed in intake narrative, please screen: " + redFlagsToReview.join("; ");
      updates.neuro_clinician_notes = existingNotes ? (existingNotes + String.fromCharCode(10) + aiNote) : aiNote;
      // Also surface these in the Red Flag Alert Banner (which only reads
      // structured fields, not the free-text notes above) by storing them
      // in a dedicated multi-value field the banner scans.
      const existingAiRF = data.ai_red_flags ? String(data.ai_red_flags).split(SEP_S).filter(Boolean) : [];
      const mergedAiRF = [...existingAiRF];
      for (const rf of redFlagsToReview) { if (rf && !mergedAiRF.includes(rf)) mergedAiRF.push(rf); }
      updates.ai_red_flags = mergedAiRF.join(SEP_S);
    }

    // Extraction audit trail (zero-hallucination spec): verbatim
    // narrative + per-field confidence/source quotes + missing-info
    // checklist, stored as ONE new field -- never written into cc_main,
    // dem_age, or any other real field, so every existing consumer
    // (SOAP, interpretation engine, Patient Profile) keeps reading
    // plain values exactly as before.
    if (extractionMeta) {
      updates.ai_extraction_audit = JSON.stringify({ ...extractionMeta, appliedAt: new Date().toISOString() });
    }

    set(updates);
    setAiOpen(false);
    setAiReview(false);
    setAiStatus("idle");
    setAiText("");
    setActiveSection("complaint");
    if (sectionTopRef.current) sectionTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setAiSuccess({ count: filledLabels.length, fields: redFlagsToReview.length ? [...filledLabels, `⚠ ${redFlagsToReview.length} possible red flag(s) to screen`] : filledLabels });
    setTimeout(() => setAiSuccess(null), 8000);
  }, [data, set, selectedRegions, aiText]);

  // ── Build active sections ───────────────────────────────────────────
  const sections = useMemo(() => {
    // ORDER:
    // 1. Chief Complaint (always first)
    // 2. Region-specific modules (the clinical meat — loaded by selection)
    // 3. Trailing universal sections (goals, history, red flags, PMH, lifestyle, paediatric, hypermobility)
    // 4. Conditional: Sleep, Sport (auto-loaded)
    // 5. Biopsychosocial (always last)

    const m = {};

    // ── Step 1: Core opening sections (complaint only) ──
    m.complaint      = UNIV_S.complaint;

    // ── Step 2: Region-specific modules ───────────────────────────────
    const _RKEY = {
      "Cervical (L)":"Cervical spine","Cervical (R)":"Cervical spine",
      "Thoracic (L)":"Thoracic spine","Thoracic (R)":"Thoracic spine",
      "Lumbar/SI (L)":"Lumbar / SI","Lumbar/SI (R)":"Lumbar / SI",
      "Elbow (L)":"Elbow/Wrist/Hand","Elbow (R)":"Elbow/Wrist/Hand",
      "Wrist/Hand (L)":"Elbow/Wrist/Hand","Wrist/Hand (R)":"Elbow/Wrist/Hand",
      "Hip/Groin (L)":"Hip / Groin","Hip/Groin (R)":"Hip / Groin",
      "Ankle/Foot (L)":"Ankle / Foot","Ankle/Foot (R)":"Ankle / Foot",
    };
    const _seenMods = new Set();
    selectedRegions.forEach(r => {
      const modKey = _RKEY[r] || r;
      if (_seenMods.has(modKey)) return;
      _seenMods.add(modKey);
      const mod = REG_MOD_S[modKey];
      if (!mod) return;
      Object.entries(mod.sections).forEach(([k, s]) => { m[k] = s; });
    });

    // ── Step 3: Trailing universal sections ───────────────────────────
    m.goals          = UNIV_S.goals;
    m.history        = UNIV_S.history;
    m.red_flags      = UNIV_S.red_flags;
    m.pmh            = UNIV_S.pmh;
    m.lifestyle      = UNIV_S.lifestyle;

    // ── Step 4: Conditional sections ──────────────────────────────────
    // Paediatric — if age <18 or paediatric selected
    const age = parseInt(data.dem_age || "99");
    if (age < 18 || /child|adolescent/.test((data.ped_age_group||"").toLowerCase()))
      m.paediatric = UNIV_S.paediatric;

    // Hypermobility — if indicators present
    if (needsHypermobility_S(data)) m.hypermobility = UNIV_S.hypermobility;

    // Sleep — if night pain reported
    if (needsSleep_S(data, selectedRegions)) Object.assign(m, SLEEP_S);

    // Sport — if sport-related onset or sport region
    if (needsSport_S(data, selectedRegions)) Object.assign(m, SPORT_S);

    // ── Step 5: Biopsychosocial — always last ──────────────────────────
    if (needsBPS_S(data)) Object.assign(m, BPS_S);

    return m;
  }, [data, selectedRegions]);


  // ── Progress (exclude notes fields) ────────────────────────────────
  const { totalF, totalD, pct } = useMemo(() => {
    const notesTypes = ["textarea"];
    const noteIds = ["_notes","_psfs","_detail","_findings"];
    const isNotes = (f) => noteIds.some(n => f.id.endsWith(n)) || f.type === "textarea";
    const scoredFields = Object.values(sections).flatMap(s => s.fields.filter(f => !isNotes(f)));
    const filled = scoredFields.filter(f => data[f.id] && data[f.id] !== "");
    const pct = Math.round((filled.length / Math.max(scoredFields.length, 1)) * 100);
    return { totalF: scoredFields.length, totalD: filled.length, pct };
  }, [sections, data]);

  const countFilled = (key) => {
    const s = sections[key]; if (!s) return 0;
    return s.fields.filter(f => data[f.id] && data[f.id] !== "").length;
  };

  // ── Run engine ──────────────────────────────────────────────────────
  const runInterpretation = () => {
    if (selectedRegions.length === 0) return;
    const result = runEngineV6(data, selectedRegions);
    setInsight(result);
    setActiveTab("results"); onTabChange&&onTabChange("results");
    setShowInsight(true);

    // ── Lumbar Variable Extractor (Pass 1 + Pass 2) ──────────────────
    // Runs alongside runEngineV6, does not replace or block it. Pass 1
    // reads the same structured lx_* fields deterministically -- see
    // src/lumbarVariableExtractor.js for why this is a separate,
    // zero-hallucination-risk read rather than folded into runEngineV6's
    // own ad-hoc field reads. Pass 2 asks AI to check ONLY the free-text
    // note fields for anything Pass 1 didn't already capture.
    if (selectedRegions.some(reg => (REGION_FAMILY_KEY[reg] || reg) === "Lumbar / SI")) {
      const lv = extractLumbarVariablesStructured(data);
      setLumbarVariables(lv);
      setLumbarNoteFindings([]);
      setLumbarAiFilledFields([]);
      setLumbarPendingRedFlagReview([]);
      setLumbarReasoning(runLumbarReasoningEngine(lv));
      // NOTE: pass only the changed keys here, not `...data` -- set() already
      // merges against the true latest state internally (setData(prev => ({...prev,
      // ...patch}))), and this call sits before an async Pass-2 completion further
      // below that must not clobber it with a stale `data` snapshot spread.
      try { set({ cx_lumbar_variables: JSON.stringify(lv), cx_lumbar_note_findings: JSON.stringify([]),
        cx_lumbar_ai_filled: JSON.stringify([]), cx_lumbar_pending_rf: JSON.stringify([]) }); } catch {}

      // Variables Pass 1 already resolved definitively -- Pass 2 is told
      // never to re-derive or contradict these.
      const already = [];
      if (lv.location.belowKneePain !== "unknown") already.push("belowKneePain");
      if (lv.location.dermatomal.state !== "unknown") already.push("dermatomalPattern");
      if (lv.mechanism.acuteLiftingMechanism !== "unknown") already.push("acuteLiftingMechanism");
      if (lv.aggravating.flexionAggravates) already.push("flexionAggravates");
      if (lv.aggravating.extensionAggravates) already.push("extensionAggravates");
      if (lv.aggravating.rotationAggravates) already.push("rotationAggravates");
      if (lv.aggravating.sittingAggravates) already.push("sittingAggravates");
      if (lv.aggravating.coughSneezeAggravates) already.push("coughSneezeAggravates");
      if (lv.aggravating.valsalvaAggravates) already.push("valsalvaAggravates");
      if (lv.relieving.extensionRelieves) already.push("extensionRelieves");
      if (lv.relieving.flexionRelieves) already.push("flexionRelieves");
      if (lv.relieving.walkingRelieves) already.push("walkingRelieves");
      if (lv.symptomBehaviour.constantUnremitting) already.push("constantUnremitting");
      if (lv.symptomBehaviour.constantNightPain) already.push("constantNightPain");
      if (lv.symptomBehaviour.morningStiffnessOver60) already.push("morningStiffnessOver60");
      if (lv.history.priorEpisodeCount) already.push("priorEpisodeCount");
      if (lv.neurological.hasLegNeuro !== "unknown") already.push("hasLegNeuro");
      if (lv.neurological.footDrop) already.push("footDrop");
      if (lv.neurological.neurogenicClaudication) already.push("neurogenicClaudication");
      if (lv.redFlags.cauda.state !== "unknown") already.push("caudaEquinaConcern");
      if (lv.redFlags.fracture.state !== "unknown") already.push("fractureRiskConcern");
      if (lv.redFlags.inflammatory.state !== "unknown") already.push("inflammatoryConcern");
      if (lv.redFlags.serious.state !== "unknown") already.push("otherSeriousPathologyConcern");
      if (lv.yellowFlags.highPsychosocialLoad) already.push("highPsychosocialLoad");

      const hasAnyNote = Object.values(lv._notesForAiPass || {}).some(t => t && t.trim());
      if (hasAnyNote && (!requireAuth || requireAuth("AI Note Analysis"))) {
        setLumbarNotesLoading(true);
        authHeader().then(h => fetch("/api/extractLumbarNoteVariables", {
          method: "POST", headers: { "Content-Type": "application/json", ...h },
          body: JSON.stringify({ notes: lv._notesForAiPass, alreadyKnown: already }),
        })).then(r => r.json()).then(j => {
          const findings = Array.isArray(j.findings) ? j.findings : [];
          setLumbarNoteFindings(findings);
          // Merge AI note findings into the Pass 1 variables before
          // re-scoring -- without this, Phase 0 keeps showing "Not
          // asked" for fields the AI plainly found, and Phase 0.5 keeps
          // scoring against Pass-1-only data (the exact bug reported:
          // L02 read "Insufficient data" despite a textbook
          // radiculopathy case because none of the AI-found variables
          // ever reached the matching engine).
          const { merged, aiFilledFields, pendingRedFlagReview } = mergeLumbarVariables(lv, findings);
          setLumbarVariables(merged);
          setLumbarAiFilledFields(aiFilledFields);
          setLumbarPendingRedFlagReview(pendingRedFlagReview);
          setLumbarReasoning(runLumbarReasoningEngine(merged));
          // Same reasoning as the sync persist above: only the changed keys,
          // no `...data` spread -- this callback's `data` closure is frozen at
          // whatever it was when runInterpretation() started, so spreading it
          // here would silently re-write cx_insight back to its pre-run value.
          try { set({ cx_lumbar_variables: JSON.stringify(merged), cx_lumbar_note_findings: JSON.stringify(findings),
            cx_lumbar_ai_filled: JSON.stringify(aiFilledFields), cx_lumbar_pending_rf: JSON.stringify(pendingRedFlagReview) }); } catch {}
        }).catch(() => { setLumbarNoteFindings([]); })
          .finally(() => setLumbarNotesLoading(false));
      }
    } else {
      setLumbarVariables(null);
      setLumbarNoteFindings([]);
      setLumbarAiFilledFields([]);
      setLumbarPendingRedFlagReview([]);
      setLumbarReasoning(null);
      try { set({ cx_lumbar_variables: null, cx_lumbar_note_findings: null,
        cx_lumbar_ai_filled: null, cx_lumbar_pending_rf: null }); } catch {}
    }

    // ── Cervical Variable Extractor (Pass 1 + Pass 2) ────────────────
    // Independent of the Lumbar block above -- a clinician can select both
    // Lumbar/SI and Cervical spine as two of their up-to-3 regions, so this
    // is a separate if/else, not nested inside the Lumbar one, and never
    // clears Lumbar's persisted keys or vice versa.
    if (selectedRegions.some(reg => (REGION_FAMILY_KEY[reg] || reg) === "Cervical spine")) {
      const cv = extractCervicalVariablesStructured(data);
      setCervicalVariables(cv);
      setCervicalNoteFindings([]);
      setCervicalAiFilledFields([]);
      setCervicalPendingRedFlagReview([]);
      setCervicalReasoning(runCervicalReasoningEngine(cv));
      try { set({ cx_cervical_variables: JSON.stringify(cv), cx_cervical_note_findings: JSON.stringify([]),
        cx_cervical_ai_filled: JSON.stringify([]), cx_cervical_pending_rf: JSON.stringify([]) }); } catch {}

      // Variables Pass 1 already resolved definitively -- Pass 2 is told
      // never to re-derive or contradict these.
      const alreadyC = [];
      if (cv.location.armHandPain !== "unknown") alreadyC.push("armHandPain");
      if (cv.location.dermatomal.state !== "unknown") alreadyC.push("dermatomalPattern");
      if (cv.mechanism.type.state !== "unknown") alreadyC.push("whiplashMechanism");
      if (cv.aggravating.movements.state !== "unknown") {
        alreadyC.push("flexionAggravates", "extensionAggravates", "rotationAggravates", "quadrantAggravates");
      }
      if (cv.aggravating.postures.state !== "unknown") alreadyC.push("sustainedPostureAggravates");
      if (cv.aggravating.other.state !== "unknown") alreadyC.push("coughSneezeAggravates");
      if (cv.relieving.movements.state !== "unknown") alreadyC.push("chinTuckRelieves", "armOverheadRelievesArmSymptoms");
      if (cv.symptomBehaviour.overallPattern.state !== "unknown") alreadyC.push("constantUnremitting");
      if (cv.symptomBehaviour.morning.state !== "unknown") alreadyC.push("morningStiffnessOver30");
      if (cv.symptomBehaviour.night.state !== "unknown") alreadyC.push("constantNightPain");
      if (cv.headache.location.state !== "unknown") alreadyC.push("occipitalHeadache");
      if (cv.headache.triggers.state !== "unknown") alreadyC.push("headacheTriggeredByNeckMovement");
      if (cv.armHand.neuroSigns.state !== "unknown") alreadyC.push("objectiveNeuroSigns");
      if (cv.armHand.lhermitte.state !== "unknown") alreadyC.push("lhermittePositive");
      if (cv.history.priorEpisodeCount) alreadyC.push("priorEpisodeCount");
      if (cv.redFlags.myelopathy.state !== "unknown") alreadyC.push("myelopathyConcern");
      if (cv.redFlags.vbi.state !== "unknown") alreadyC.push("vbiConcern");
      if (cv.redFlags.instability.state !== "unknown") alreadyC.push("instabilityConcern");
      if (cv.redFlags.other.state !== "unknown") alreadyC.push("otherSeriousPathologyConcern");

      const hasAnyNoteC = Object.values(cv._notesForAiPass || {}).some(t => t && t.trim());
      if (hasAnyNoteC && (!requireAuth || requireAuth("AI Note Analysis"))) {
        setCervicalNotesLoading(true);
        authHeader().then(h => fetch("/api/extractCervicalNoteVariables", {
          method: "POST", headers: { "Content-Type": "application/json", ...h },
          body: JSON.stringify({ notes: cv._notesForAiPass, alreadyKnown: alreadyC }),
        })).then(r => r.json()).then(j => {
          const findings = Array.isArray(j.findings) ? j.findings : [];
          setCervicalNoteFindings(findings);
          const { merged, aiFilledFields, pendingRedFlagReview } = mergeCervicalVariables(cv, findings);
          setCervicalVariables(merged);
          setCervicalAiFilledFields(aiFilledFields);
          setCervicalPendingRedFlagReview(pendingRedFlagReview);
          setCervicalReasoning(runCervicalReasoningEngine(merged));
          // Same reasoning as Lumbar's async callback: only the changed keys,
          // no `...data` spread -- this callback's `data` closure is frozen at
          // whatever it was when runInterpretation() started.
          try { set({ cx_cervical_variables: JSON.stringify(merged), cx_cervical_note_findings: JSON.stringify(findings),
            cx_cervical_ai_filled: JSON.stringify(aiFilledFields), cx_cervical_pending_rf: JSON.stringify(pendingRedFlagReview) }); } catch {}
        }).catch(() => { setCervicalNoteFindings([]); })
          .finally(() => setCervicalNotesLoading(false));
      }
    } else {
      setCervicalVariables(null);
      setCervicalNoteFindings([]);
      setCervicalAiFilledFields([]);
      setCervicalPendingRedFlagReview([]);
      setCervicalReasoning(null);
      try { set({ cx_cervical_variables: null, cx_cervical_note_findings: null,
        cx_cervical_ai_filled: null, cx_cervical_pending_rf: null }); } catch {}
    }

    // ── Thoracic Variable Extractor (Pass 1 + Pass 2) ──────────
    // Independent of the Lumbar/Cervical blocks above -- a separate if/else,
    // never clears their persisted keys or vice versa.
    if (selectedRegions.some(reg => (REGION_FAMILY_KEY[reg] || reg) === "Thoracic spine")) {
      const tv = extractThoracicVariablesStructured(data);
      setThoracicVariables(tv);
      setThoracicNoteFindings([]);
      setThoracicAiFilledFields([]);
      setThoracicPendingRedFlagReview([]);
      setThoracicReasoning(runThoracicReasoningEngine(tv));
      try { set({ cx_thoracic_variables: JSON.stringify(tv), cx_thoracic_note_findings: JSON.stringify([]),
        cx_thoracic_ai_filled: JSON.stringify([]), cx_thoracic_pending_rf: JSON.stringify([]) }); } catch {}

      // Variables Pass 1 already resolved definitively -- Pass 2 is told
      // never to re-derive or contradict these.
      const alreadyT = [];
      if (tv.aggravating.movements.state !== "unknown") {
        alreadyT.push("rotationAggravates", "sideBendingAggravates", "extensionAggravates", "flexionAggravates",
          "coughSneezeLaughAggravates", "breathingAggravates", "overheadReachingAggravates");
      }
      if (tv.aggravating.postures.state !== "unknown") alreadyT.push("sustainedPostureAggravates");
      if (tv.relieving.treatments.state !== "unknown") alreadyT.push("manipulationSignificantRelief");
      if (tv.symptomBehaviour.pattern.state !== "unknown") {
        alreadyT.push("mechanicalPattern", "constantUnaffectedPattern", "breathingRelatedPattern", "morningStiffness");
      }
      if (tv.location.primaryLocation.state !== "unknown") alreadyT.push("costovertebralLocation");
      if (tv.history.priorEpisodeCount) alreadyT.push("priorEpisodeCount");
      // tx_rf is a single combined screen -- if it was answered at all
      // (positive or negative), every red-flag category it covers is
      // already known, not just one.
      if (tv.redFlags.redFlagScreen !== "incomplete") {
        alreadyT.push("cardiacConcern", "respiratoryConcern", "visceralConcern", "oncologicConcern",
          "infectionConcern", "fractureConcern", "cordCompressionConcern");
      }

      const hasAnyNoteT = Object.values(tv._notesForAiPass || {}).some(t => t && t.trim());
      if (hasAnyNoteT && (!requireAuth || requireAuth("AI Note Analysis"))) {
        setThoracicNotesLoading(true);
        authHeader().then(h => fetch("/api/extractThoracicNoteVariables", {
          method: "POST", headers: { "Content-Type": "application/json", ...h },
          body: JSON.stringify({ notes: tv._notesForAiPass, alreadyKnown: alreadyT }),
        })).then(r => r.json()).then(j => {
          const findings = Array.isArray(j.findings) ? j.findings : [];
          setThoracicNoteFindings(findings);
          const { merged, aiFilledFields, pendingRedFlagReview } = mergeThoracicVariables(tv, findings);
          setThoracicVariables(merged);
          setThoracicAiFilledFields(aiFilledFields);
          setThoracicPendingRedFlagReview(pendingRedFlagReview);
          setThoracicReasoning(runThoracicReasoningEngine(merged));
          // Same reasoning as Lumbar/Cervical's async callback: only the
          // changed keys, no `...data` spread -- this callback's `data`
          // closure is frozen at whatever it was when runInterpretation()
          // started.
          try { set({ cx_thoracic_variables: JSON.stringify(merged), cx_thoracic_note_findings: JSON.stringify(findings),
            cx_thoracic_ai_filled: JSON.stringify(aiFilledFields), cx_thoracic_pending_rf: JSON.stringify(pendingRedFlagReview) }); } catch {}
        }).catch(() => { setThoracicNoteFindings([]); })
          .finally(() => setThoracicNotesLoading(false));
      }
    } else {
      setThoracicVariables(null);
      setThoracicNoteFindings([]);
      setThoracicAiFilledFields([]);
      setThoracicPendingRedFlagReview([]);
      setThoracicReasoning(null);
      try { set({ cx_thoracic_variables: null, cx_thoracic_note_findings: null,
        cx_thoracic_ai_filled: null, cx_thoracic_pending_rf: null }); } catch {}
    }

    // -- Shoulder Phase 0 / 0.5 -- no Pass 1/Pass 2 split, no persisted blob:
    // runShoulderPhase05(data) is a pure function of `data`, computed fresh
    // here (same trigger point as the other three) and again automatically
    // on remount from the useState initializer above.
    if (selectedRegions.some(reg => reg === "Shoulder (L)" || reg === "Shoulder (R)")) {
      try { setShoulderReasoning(runShoulderPhase05(data)); } catch { setShoulderReasoning(null); }
    } else {
      setShoulderReasoning(null);
    }

    // Persist insight so it survives navigation to ROM/MMT and back
    try { set({ ...data, cx_insight: JSON.stringify(result), cx_selected_regions: JSON.stringify(selectedRegions) }); } catch {}
    // Show saved confirmation toast
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // ── Inline field renderer — compact line-wise EMR style ─────────────
  // Every field type renders as the RIGHT-hand content of one
  // AssessmentRow (icon + label lives in the row wrapper, added where
  // sections are laid out below). Nothing here is a card; suggestions
  // for select/multicheck fields live behind a bottom sheet so the
  // screen stays blank and scannable until the therapist taps in.
  const renderField = (f) => {
    const val = data[f.id] || "";

    if (f.type === "multicheck") {
      return <ComboField f={f} val={val} PC={PC} isMulti setField={setField} toggleMulti={toggleMulti} SEP_S={SEP_S} />;
    }

    if (f.type === "select") {
      return <ComboField f={f} val={val} PC={PC} setField={setField} toggleMulti={toggleMulti} SEP_S={SEP_S} />;
    }

    if (f.type === "range") {
      return <PainSliderCompact value={val} onChange={v => setField(f.id, v)} PC={PC} label={f.label} />;
    }

    return <SmartInput value={val} onChange={e => setField(f.id, e.target.value)} PC={PC} />;
  };

  // ── Confidence colour helpers ───────────────────────────────────────
  const confColor = (c) => c === "HIGH" ? PC.green : c === "MODERATE" ? PC.yellow : PC.muted;
  const confBg    = (c) => c === "HIGH" ? PC.green+"12" : c === "MODERATE" ? PC.yellow+"12" : PC.s2;

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════
  // ── Red flag detection ─────────────────────────────────────────────
  const SEP = SEP_S || "|||";
  const getMulti = (id) => (data[id] ? String(data[id]).split(SEP).filter(Boolean) : []);
  const caudalFlags = getMulti("lx_rf_cauda").filter(v => !v.startsWith("No cauda"));
  const hasUrgentCauda = caudalFlags.some(v =>
    v.includes("Saddle") || v.includes("Bladder retention") || v.includes("Bowel incontinence") || v.includes("Bladder incontinence")
  );
  const allRedFlags = [
    ...caudalFlags,
    ...getMulti("grf_neuro").filter(v => !v.startsWith("No")),
    ...getMulti("grf_vascular").filter(v => !v.startsWith("No")),
    ...getMulti("lx_rf_serious").filter(v => !v.startsWith("No")),
    ...getMulti("lx_rf_inflammatory").filter(v => !v.startsWith("No")),
    ...getMulti("cx_rf_other").filter(v => !v.startsWith("No")),
    ...getMulti("shl_rf").filter(v => !v.startsWith("No")),
    ...getMulti("shr_rf").filter(v => !v.startsWith("No")),
    ...getMulti("knl_rf").filter(v => !v.startsWith("No")),
    ...getMulti("knr_rf").filter(v => !v.startsWith("No")),
    ...getMulti("hp_rf").filter(v => !v.startsWith("No")),
    ...getMulti("ai_red_flags").filter(Boolean),
  ];
  const hasAnyRedFlag = allRedFlags.length > 0;

  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:14, maxWidth:"100%",
      fontFamily: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Red Flag Alert Banner ─────────────────────────────────── */}
      {hasAnyRedFlag && (
        <div style={{
          background: hasUrgentCauda ? "rgba(220,38,38,0.1)" : "rgba(180,83,9,0.09)",
          border: `2px solid ${hasUrgentCauda ? "#dc2626" : "#b45309"}`,
          borderRadius:12, padding:"12px 16px",
          animation: hasUrgentCauda ? "rfpulse 1.5s ease-in-out infinite" : undefined,
        }}>
          <style>{`@keyframes rfpulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.25)}50%{box-shadow:0 0 0 6px rgba(220,38,38,0)}}`}</style>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:"1.2rem",flexShrink:0}}>{hasUrgentCauda ? "🚨" : "⚠️"}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:900,fontSize:"0.92rem",color: hasUrgentCauda ? "#dc2626" : "#b45309",marginBottom:4}}>
                {hasUrgentCauda
                  ? "URGENT — Possible Cauda Equina Syndrome"
                  : `Clinical Red Flag${allRedFlags.length>1?"s":""} Noted`}
              </div>
              {hasUrgentCauda && (
                <div style={{fontSize:"0.82rem",fontWeight:700,color:"#dc2626",marginBottom:6,padding:"6px 10px",background:"rgba(220,38,38,0.08)",borderRadius:8,border:"1px solid rgba(220,38,38,0.3)"}}>
                  ⛔ Do not continue routine assessment. Consider immediate referral to emergency services. Document findings and time of assessment.
                </div>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:4}}>
                {allRedFlags.slice(0,8).map((f,i)=>(
                  <span key={i} style={{fontSize:"0.75rem",padding:"3px 8px",borderRadius:99,background: hasUrgentCauda ? "rgba(220,38,38,0.12)" : "rgba(180,83,9,0.1)",color: hasUrgentCauda ? "#dc2626" : "#b45309",fontWeight:700,border:`1px solid ${hasUrgentCauda?"rgba(220,38,38,0.3)":"rgba(180,83,9,0.25)"}`}}>
                    {f.replace(/\(.*?\)/g,"").trim()}
                  </span>
                ))}
                {allRedFlags.length > 8 && <span style={{fontSize:"0.75rem",color:"#b45309",fontWeight:600}}>+{allRedFlags.length-8} more</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {(showHeroAI || showFormArea) && (<>
      {/* ── Hero Header — Subjective + AI + Regions ────────────────── */}
      <div style={{ borderRadius:14, overflow:"hidden",
        background:"linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)",
        boxShadow:"0 4px 18px rgba(124,58,237,0.28), 0 1px 4px rgba(0,0,0,0.1)" }}>

        {/* Row 1: Title + AI / Mic buttons */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px 10px" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.6rem", fontWeight:700, color:"rgba(255,255,255,0.55)",
              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>Step 2</div>
            <div style={{ fontSize:"1rem", fontWeight:800, color:"#fff", lineHeight:1.15 }}>📝 Subjective</div>
            <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.5)", letterSpacing:"0.05em",
              textTransform:"uppercase", marginTop:1 }}>History &amp; Complaint</div>
          </div>

          {showHeroAI && (<>
          {/* ✦ AI button — white 3D block */}
          <button type="button"
            onClick={() => { if (requireAuth && !requireAuth("AI Patient Intake")) return; setAiOpen(true); setAiMode("text"); setAiStatus("idle"); setAiText(""); setAiResult(null); setAiReview(false); }}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px",
              borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit",
              background:"#ffffff",
              boxShadow:"0 3px 0 rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
              transform:"translateY(0)", transition:"all 100ms",
            }}
            onMouseDown={e=>e.currentTarget.style.transform="translateY(2px)"}
            onMouseUp={e=>e.currentTarget.style.transform="translateY(0)"}
          >
            <span style={{ fontSize:"0.85rem" }}>✦</span>
            <span style={{ fontSize:"0.72rem", fontWeight:700, color:"#7c3aed" }}>AI</span>
          </button>

          {/* 🎤 Mic button — white 3D block */}
          <button type="button"
            onClick={() => { if (requireAuth && !requireAuth("AI Patient Intake")) return; setAiOpen(true); setAiMode("voice"); setAiStatus("idle"); setAiText(""); setAiResult(null); setAiReview(false); }}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px",
              borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit",
              background:"#ffffff",
              boxShadow:"0 3px 0 rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
              transform:"translateY(0)", transition:"all 100ms",
            }}
            onMouseDown={e=>e.currentTarget.style.transform="translateY(2px)"}
            onMouseUp={e=>e.currentTarget.style.transform="translateY(0)"}
          >
            <span style={{ fontSize:"0.85rem" }}>🎤</span>
          </button>
          </>)}
        </div>

        {showHeroAI && (<>
        {/* Row 2: Body region chips — white 3D blocks */}
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 14px 12px",
          overflowX:"auto", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
          <span style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.6)", flexShrink:0 }}>📍</span>
          {selectedRegions.length === 0 ? (
            <button type="button" onClick={() => setRegionPickerOpen(true)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px",
                borderRadius:8, border:"1.5px dashed rgba(255,255,255,0.4)",
                background:"rgba(255,255,255,0.1)", cursor:"pointer", fontFamily:"inherit",
                color:"rgba(255,255,255,0.7)", fontSize:"0.7rem", fontWeight:600 }}>
              + Add body region
            </button>
          ) : (
            <>
              {selectedRegions.map(r => (
                <button key={r} type="button" onClick={() => setRegionPickerOpen(o => !o)}
                  style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 11px",
                    borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit", flexShrink:0,
                    background:"#ffffff",
                    boxShadow:"0 3px 0 rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95)",
                  }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background:RC_S[r]||"#7c3aed", display:"inline-block" }}/>
                  <span style={{ fontSize:"0.68rem", fontWeight:700, color:"#0D0D0D", whiteSpace:"nowrap" }}>{r}</span>
                </button>
              ))}
              <button type="button" onClick={() => setRegionPickerOpen(o => !o)}
                style={{ display:"inline-flex", alignItems:"center", padding:"5px 9px",
                  borderRadius:8, border:"1.5px dashed rgba(255,255,255,0.4)",
                  background:"rgba(255,255,255,0.12)", cursor:"pointer", fontFamily:"inherit", flexShrink:0,
                  color:"rgba(255,255,255,0.75)", fontSize:"0.7rem", fontWeight:600 }}>
                {regionPickerOpen ? "▲" : "+ Edit"}
              </button>
            </>
          )}
        </div>
        </>)}

        {showHeroAI && (<>
        {/* Expanded AI panel — slides in below hero when aiOpen */}
        {aiOpen && (
          <div style={{ background:"#fff", borderTop:"1px solid rgba(255,255,255,0.15)", padding:"12px 14px" }}>
            {/* Header row */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#5b21b6" }}>
                {aiStatus === "recording" ? "🔴 Listening..." : aiStatus === "processing" ? "⏳ Groq reading..." : aiStatus === "done" ? "✓ Done" : aiStatus === "error" ? "⚠ Error" : "✦ AI Parser"}
              </span>
              <button type="button" onClick={() => { stopRecording(); setAiOpen(false); setAiStatus("idle"); }}
                style={{ background:"transparent", border:"none", color:"#7c3aed", fontSize:"1rem", cursor:"pointer" }}>✕</button>
            </div>

            {/* Privacy note: unlike buildPatientContext() (AI chat), this
                narrative is sent to Groq verbatim -- there is no identifier
                whitelist/strip step for /api/parse. Warn students up front
                rather than silently forwarding a real name if they say/type
                one. */}
            <div style={{ fontSize:"0.68rem", color:"#7c3aed", background:"#f5f3ff",
              border:"1px solid #ddd6fe", borderRadius:8, padding:"6px 10px", marginBottom:10, lineHeight:1.4 }}>
              🔒 Don't include the patient's name or other identifying details here — describe age, sex, and clinical findings only. This text is sent to our AI provider (Groq) to draft the fields.
            </div>

            {/* Voice mode */}
            {aiMode === "voice" && aiStatus !== "done" && (
              <div>
                {(aiStatus === "idle" || aiStatus === "error") ? (
                  <button type="button" onClick={startRecording}
                    style={{ width:"100%", padding:"10px", borderRadius:10, background:"#7c3aed",
                      color:"#fff", border:"none", fontSize:"0.82rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:8 }}>
                    🎤 Tap to start recording
                  </button>
                ) : aiStatus === "recording" ? (
                  <div>
                    <div style={{ background:"#fee2e2", borderRadius:8, padding:"8px 12px", marginBottom:8,
                      fontSize:"0.82rem", color:"#b91c1c", display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
                        background:"#dc2626", animation:"pulse 1s infinite" }}></span>
                      Recording — speak naturally, then tap Stop
                    </div>
                    {aiText && <div style={{ fontSize:"0.82rem", color:"#5b21b6", background:"#f5f3ff",
                      borderRadius:8, padding:"8px 10px", marginBottom:8, lineHeight:1.5 }}>{aiText}</div>}
                    <div style={{ display:"flex", gap:8 }}>
                      <button type="button" onClick={() => { stopRecording(); if (aiText) runParse(aiText); }}
                        style={{ flex:1, padding:"8px", borderRadius:10, background:"#dc2626", color:"#fff",
                          border:"none", fontSize:"0.78rem", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        ⬛ Stop & Parse
                      </button>
                      <button type="button" onClick={() => { stopRecording(); setAiMode("text"); }}
                        style={{ padding:"8px 12px", borderRadius:10, background:"transparent", color:"#7c3aed",
                          border:"1px solid #a78bfa", fontSize:"0.82rem", cursor:"pointer", fontFamily:"inherit" }}>
                        Switch to type
                      </button>
                    </div>
                  </div>
                ) : aiStatus === "processing" ? (
                  <div style={{ textAlign:"center", padding:"12px", color:"#92400e", fontSize:"0.78rem" }}>
                    ⏳ Sending to Groq AI...
                  </div>
                ) : null}
                {aiStatus === "error" && (
                  <div style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:8,
                    padding:"8px 12px", fontSize:"0.82rem", color:"#b91c1c", marginTop:6 }}>
                    {aiResult?._errorMsg || "Parse failed — check internet connection or try typing instead."}
                  </div>
                )}
              </div>
            )}

            {/* Text mode */}
            {(aiMode === "text" || (aiMode === "voice" && aiStatus === "done" && !aiReview)) && aiStatus !== "processing" && !aiReview && (
              <div>
                <textarea
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  placeholder="e.g. 34M LBP 3mo lifting, worse sitting+bending, better walking+heat, 7/10"
                  style={{ width:"100%", minHeight:64, padding:"8px 10px", borderRadius:8,
                    border:"1px solid #c4b5fd", background:"#fff", color:"#0D0D0D",
                    fontSize:"0.78rem", fontFamily:"monospace", resize:"vertical",
                    lineHeight:1.5, outline:"none", boxSizing:"border-box", marginBottom:8 }}
                />
                <div style={{ display:"flex", gap:8 }}>
                  <button type="button"
                    onClick={() => runParse(aiText)}
                    disabled={!aiText.trim() || aiStatus === "processing"}
                    style={{ flex:1, padding:"9px", borderRadius:10,
                      background: aiText.trim() ? "#7c3aed" : "#c4b5fd",
                      color:"#fff", border:"none", fontSize:"0.8rem", fontWeight:700,
                      cursor: aiText.trim() ? "pointer" : "not-allowed", fontFamily:"inherit" }}>
                    {aiStatus === "processing" ? "Parsing..." : "✦ Parse with Groq AI"}
                  </button>
                  <button type="button" onClick={() => { setAiMode("voice"); setAiStatus("idle"); }}
                    style={{ padding:"9px 12px", borderRadius:10, background:"transparent", color:"#7c3aed",
                      border:"1px solid #a78bfa", fontSize:"0.82rem", cursor:"pointer", fontFamily:"inherit" }}>
                    🎤
                  </button>
                </div>
              </div>
            )}

            {/* Review panel */}
            {aiReview && aiResult && !aiResult._errorMsg && (
              <div>
                {(() => {
                  // Polished, human-readable review card -- icon + label on
                  // the left, bold value on the right, divided rows, no
                  // per-row box. Replaces the old dense "key: value" chip
                  // list per user feedback comparing it against the
                  // confirmed mockup. The technical confidence/source-quote
                  // audit view right below this is UNCHANGED -- this card
                  // is a friendly summary sitting on top of it, not a
                  // replacement for the zero-hallucination detail there.
                  const v = aiResult;
                  const fmtList = (arr) => Array.isArray(arr) && arr.length ? arr.join(", ") : null;
                  const agg = fmtList([...(v.aggMovements||[]), ...(v.aggActivities||[])]);
                  const radiation = v.hasRadiation === false ? "No radiation"
                    : v.radiationArea ? v.radiationArea + (v.radiationSide ? ` (${v.radiationSide})` : "")
                    : v.hasRadiation === true ? "Yes" : null;
                  const region = v.region ? v.region + (v.laterality ? ` (${v.laterality})` : "") : null;
                  const hasRedFlags = Array.isArray(v.flags) && v.flags.length > 0;

                  // "Onset" here intentionally shows TIME-SINCE (the real
                  // `duration` field, e.g. "2-6 weeks") -- separate from
                  // "Mechanism of Injury" (the real `onset` field, which
                  // actually holds the HOW-it-started enum, e.g. "Lifting
                  // injury"). Matches how a clinician reads these two
                  // concepts apart in the confirmed mockup.
                  const rows = [
                    { icon:"🧑", label:"Age", value: v.age ? `${v.age} Years` : null },
                    { icon:"⚧", label:"Gender", value: v.sex || null },
                    { icon:"💼", label:"Occupation", value: v.occupation || null },
                    { icon:"🧭", label:"Region", value: region },
                    { icon:"🎯", label:"Chief Complaint", value: v.chiefComplaint || null },
                    { icon:"📅", label:"Onset", value: v.duration || null },
                    { icon:"💥", label:"Mechanism of Injury", value: v.onset || null },
                    { icon:"❔", label:"Mechanism Detail", value: v.onsetContext || null },
                    { icon:"⚡", label:"Aggravating Factors", value: agg },
                    { icon:"🍃", label:"Relieving Factors", value: fmtList(v.relMovements) },
                    { icon:"🌡️", label:"Pain Now (NRS 0–10)", value: v.nrsNow != null ? `${v.nrsNow} / 10` : null, pill:true },
                    { icon:"📈", label:"Pain Worst (NRS 0–10)", value: v.nrsWorst != null ? `${v.nrsWorst} / 10` : null, pill:true },
                    { icon:"📉", label:"Pain Best (NRS 0–10)", value: v.nrsBest != null ? `${v.nrsBest} / 10` : null, pill:true },
                    { icon:"🩹", label:"Pain Quality", value: fmtList(v.painQuality) },
                    { icon:"📊", label:"Pain Behaviour", value: v.symptomPattern || v.diurnalPattern || null },
                    { icon:"📍", label:"Location", value: v.locationDescription || null },
                    { icon:"🔀", label:"Radiation", value: radiation },
                    { icon:"✨", label:"Numbness / Tingling", value: fmtList(v.neuroSymptoms) },
                    { icon:"🚩", label:"Red Flags", value: Array.isArray(v.flags) ? (hasRedFlags ? v.flags.join(", ") : "No red flags reported") : null, tint: Array.isArray(v.flags) ? (hasRedFlags ? "red" : "green") : undefined },
                    { icon:"🏁", label:"Patient Goals", value: v.patientGoals || null },
                    { icon:"😟", label:"Main Concern", value: v.patientConcern || null },
                    { icon:"💭", label:"Patient's Belief", value: v.patientBelief || null },
                    { icon:"🔁", label:"Prior Episode", value: v.priorEpisodeCount ? `${v.priorEpisodeCount} (${v.priorEpisodeOutcome || "outcome not stated"})` : null },
                    { icon:"💊", label:"Treatment Tried", value: v.priorTreatmentTried || null },
                    { icon:"📋", label:"Medical History", value: v.medicalHistory || null },
                    { icon:"💊", label:"Medications", value: v.medications || null },
                    { icon:"🚫", label:"Functional Limitations", value: fmtList(v.functionalLimitations) },
                  ].filter(r => r.value != null && r.value !== "");

                  return (
                    <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EDEBFB",
                      boxShadow:"0 2px 10px rgba(124,58,237,0.06)", overflow:"hidden", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderBottom:"1px solid #F0EEFB" }}>
                        <span style={{ width:30, height:30, borderRadius:9, background:"#f5f3ff", display:"flex",
                          alignItems:"center", justifyContent:"center", fontSize:"0.95rem", flexShrink:0 }}>🩺</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"0.85rem", fontWeight:800, color:"#0D0D0D" }}>Extracted Patient Information</div>
                          <div style={{ fontSize:"0.72rem", color:"#8B8B8D" }}>Review and confirm the details below</div>
                        </div>
                        <button type="button" onClick={() => runParse(aiText)} title="Re-parse this narrative"
                          style={{ width:26, height:26, borderRadius:"50%", border:"1px solid #E0E0E2",
                            background:"transparent", color:"#7c3aed", cursor:"pointer", fontSize:"0.85rem",
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>↻</button>
                      </div>
                      {rows.map((r, i) => {
                        const tintBg = r.tint === "red" ? "#fef2f2" : r.tint === "green" ? "#f0fdf4" : "#f5f3ff";
                        return (
                        <div key={r.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px",
                          borderBottom: i < rows.length - 1 ? "1px solid #F3F2F9" : "none" }}>
                          <span style={{ width:26, height:26, borderRadius:8, background:tintBg, display:"flex",
                            alignItems:"center", justifyContent:"center", fontSize:"0.8rem", flexShrink:0 }}>{r.icon}</span>
                          <span style={{ fontSize:"0.78rem", color:"#8B8B8D", flexShrink:0 }}>{r.label}</span>
                          {r.pill ? (
                            <span style={{ marginLeft:"auto", fontSize:"0.76rem", fontWeight:800, color:"#5b21b6",
                              background:"#f5f3ff", padding:"3px 10px", borderRadius:99, flexShrink:0 }}>{r.value}</span>
                          ) : (
                            <span style={{ marginLeft:"auto", fontSize:"0.8rem", fontWeight:700, color:"#0D0D0D",
                              textAlign:"right", maxWidth:"55%" }}>{r.value}</span>
                          )}
                        </div>
                        );
                      })}
                      <div style={{ padding:"8px 14px 10px", fontSize:"0.7rem", color:"#8B8B8D" }}>
                        {rows.length} field{rows.length===1?"":"s"} extracted
                      </div>
                    </div>
                  );
                })()}

                {/* Zero-hallucination review: original speech side by side
                    with what was extracted, per-field confidence + the
                    source quote, and what's still missing -- computed here
                    purely for display (same pure function applyAiResult
                    itself uses when actually saving), so nothing is taken
                    on faith before it's confirmed. */}
                {(() => {
                  const preview = mapParseResultToUpdates(aiResult, data, aiText);
                  const meta = preview.extractionMeta || {};
                  return (
                    <>
                      <button type="button" onClick={() => setAiShowAudit(v => !v)} style={{
                        display:"block", width:"100%", textAlign:"left", padding:"6px 10px",
                        marginBottom:8, borderRadius:8, border:"1px solid #E0E0E2",
                        background:"transparent", color:"#6B6B6B", fontSize:"0.7rem", fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit" }}>
                        {aiShowAudit ? "▾ Hide" : "▸ Show"} original speech vs. extracted fields (confidence + source per field)
                      </button>
                      {aiShowAudit && (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
                          marginBottom:8, padding:10, borderRadius:8, background:"#FAFAFA", border:"1px solid #E0E0E2" }}>
                          <div>
                            <div style={{ fontSize:"0.66rem", fontWeight:800, color:"#6B6B6B", textTransform:"uppercase", marginBottom:5 }}>Original speech</div>
                            <div style={{ fontSize:"0.74rem", color:"#0D0D0D", lineHeight:1.5, fontStyle:"italic" }}>"{meta.narrative || aiText || "(not available)"}"</div>
                          </div>
                          <div>
                            <div style={{ fontSize:"0.66rem", fontWeight:800, color:"#6B6B6B", textTransform:"uppercase", marginBottom:5 }}>Extracted fields</div>
                            {Object.entries(aiResult).filter(([k,v])=>!k.startsWith("_")&&v!=null&&v!==""&&!(Array.isArray(v)&&v.length===0)).map(([k,v])=>{
                              const conf = meta.confidence?.[k];
                              const src = meta.sourceQuotes?.[k];
                              const needsReview = conf!=null && conf<90;
                              const displayVal = Array.isArray(v) ? v.join(", ") : String(v);
                              return (
                                <div key={k} style={{ marginBottom:6, paddingBottom:6, borderBottom:"1px solid #E0E0E2" }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", gap:6 }}>
                                    <span style={{ fontSize:"0.72rem", fontWeight:700, color:"#0D0D0D" }}>{k}: {displayVal}</span>
                                    {conf!=null && (
                                      <span style={{ fontSize:"0.62rem", fontWeight:800, padding:"1px 6px", borderRadius:99, flexShrink:0,
                                        background: needsReview ? "#FEF2F2" : "#f0fdf4", color: needsReview ? "#B91C1C" : "#166534" }}>
                                        {needsReview ? `⚠ ${conf}% — Needs Review` : `${conf}%`}
                                      </span>
                                    )}
                                  </div>
                                  {src && <div style={{ fontSize:"0.68rem", color:"#6B6B6B", marginTop:2 }}>"{src}"</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {meta.missingInfo?.length > 0 && (
                        <div style={{ padding:"8px 10px", borderRadius:8, marginBottom:8, background:"#FFFBEB", border:"1px solid #FDE68A" }}>
                          <div style={{ fontSize:"0.7rem", fontWeight:800, color:"#92400E", marginBottom:3 }}>Not mentioned — worth asking about:</div>
                          <div style={{ fontSize:"0.72rem", color:"#92400E" }}>{meta.missingInfo.join(" · ")}</div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div style={{ display:"flex", gap:8 }}>
                  <button type="button" onClick={() => applyAiResult(aiResult)}
                    style={{ flex:1, padding:"9px", borderRadius:10, background:"#7c3aed",
                      color:"#fff", border:"none", fontSize:"0.8rem", fontWeight:700,
                      cursor:"pointer", fontFamily:"inherit" }}>
                    ✓ Apply to form
                  </button>
                  <button type="button" onClick={() => { setAiReview(false); setAiStatus("idle"); setAiText(""); setAiResult(null); }}
                    style={{ padding:"9px 12px", borderRadius:10, background:"transparent", color:"#7c3aed",
                      border:"1px solid #a78bfa", fontSize:"0.82rem", cursor:"pointer", fontFamily:"inherit" }}>
                    Re-try
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </>)}
      </div>

      {/* ── AI success banner ── */}
      {showHeroAI && aiSuccess && (
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10,
          padding:"10px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
          <span style={{ fontSize:"1.1rem" }}>✅</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#166534", marginBottom:3 }}>
              {aiSuccess.count} fields auto-filled! Scroll down to review.
            </div>
            <div style={{ fontSize:"0.78rem", color:"#166534", lineHeight:1.6 }}>
              {aiSuccess.fields.join(" · ")}
            </div>
            <div style={{ fontSize:"0.75rem", color:"#4ade80", marginTop:4 }}>
              Check Demographics → Chief Complaint sections below ↓
            </div>
          </div>
          <button type="button" onClick={() => setAiSuccess(null)}
            style={{ background:"none", border:"none", color:"#166534", cursor:"pointer",
              fontSize:"1rem", lineHeight:1, padding:0 }}>×</button>
        </div>
      )}
      </>)}

      {showRegionPicker && (<>
      {/* ── Region selector — two-level collapsible accordion ── */}
      {(()=>{
        const REGION_GROUPS = [
          { id:"spine", label:"Spine", icon:"🪴", regions:[
            { id:"cervical", name:"Cervical spine", lr:true, keys:{ L:"Cervical (L)", R:"Cervical (R)", B_L:"Cervical (L)", B_R:"Cervical (R)" } },
            { id:"thoracic", name:"Thoracic spine", lr:true, keys:{ L:"Thoracic (L)", R:"Thoracic (R)", B_L:"Thoracic (L)", B_R:"Thoracic (R)" } },
            { id:"lumbar",   name:"Lumbar / SI",    lr:true, keys:{ L:"Lumbar/SI (L)", R:"Lumbar/SI (R)", B_L:"Lumbar/SI (L)", B_R:"Lumbar/SI (R)" } },
          ]},
          { id:"upper", label:"Upper limb", icon:"💪", regions:[
            { id:"shoulder", name:"Shoulder",    lr:true, keys:{ L:"Shoulder (L)",   R:"Shoulder (R)",   B_L:"Shoulder (L)",   B_R:"Shoulder (R)" } },
            { id:"elbow",    name:"Elbow",        lr:true, keys:{ L:"Elbow (L)",      R:"Elbow (R)",      B_L:"Elbow (L)",      B_R:"Elbow (R)" } },
            { id:"wrist",    name:"Wrist / Hand", lr:true, keys:{ L:"Wrist/Hand (L)", R:"Wrist/Hand (R)", B_L:"Wrist/Hand (L)", B_R:"Wrist/Hand (R)" } },
          ]},
          { id:"lower", label:"Lower limb", icon:"🦵", regions:[
            { id:"hip",   name:"Hip / Groin",  lr:true, keys:{ L:"Hip/Groin (L)",   R:"Hip/Groin (R)",   B_L:"Hip/Groin (L)",   B_R:"Hip/Groin (R)" } },
            { id:"knee",  name:"Knee",          lr:true, keys:{ L:"Knee (L)",        R:"Knee (R)",        B_L:"Knee (L)",        B_R:"Knee (R)" } },
            { id:"ankle", name:"Ankle / Foot",  lr:true, keys:{ L:"Ankle/Foot (L)", R:"Ankle/Foot (R)", B_L:"Ankle/Foot (L)", B_R:"Ankle/Foot (R)" } },
          ]},
          { id:"thorax", label:"Thorax / Ribs", icon:"🫁", regions:[
            { id:"thorax_r", name:"Thorax",     lr:true, keys:{ L:"Thorax (L)", R:"Thorax (R)", B_L:"Thorax (L)", B_R:"Thorax (R)" } },
            { id:"ribs",     name:"Ribs",        lr:true, keys:{ L:"Ribs (L)",   R:"Ribs (R)",   B_L:"Ribs (L)",   B_R:"Ribs (R)" } },
          ]},
          { id:"other", label:"Other", icon:"🔵", regions:[
            { id:"tmj",  name:"TMJ / Jaw",  lr:true, keys:{ L:"TMJ (L)", R:"TMJ (R)", B_L:"TMJ (L)", B_R:"TMJ (R)" } },
            { id:"head",  name:"Head / Face", lr:false, keys:{ B:"Head / Face" } },
          ]},
        ];

        const allRegs = REGION_GROUPS.flatMap(g => g.regions);

        const getActiveSide = (rid, lrEnabled) => {
          const reg = allRegs.find(x => x.id === rid);
          if (!reg) return null;
          if (!lrEnabled) return selectedRegions.includes(reg.keys.B) ? "B" : null;
          const hasL = selectedRegions.includes(reg.keys.L);
          const hasR = selectedRegions.includes(reg.keys.R);
          if (hasL && hasR) return "B";
          if (hasL) return "L";
          if (hasR) return "R";
          return null;
        };

        const countSlots = (pool) => {
          let n = 0;
          allRegs.forEach(r => { if (Object.values(r.keys).some(k => pool.includes(k))) n++; });
          return n;
        };

        const handleSidePick = (reg, side) => {
          setSelectedRegions(prev => {
            const allKeys = Object.values(reg.keys);
            let next = prev.filter(r => !allKeys.includes(r));
            const curSide = getActiveSide(reg.id, reg.lr);
            if (curSide === side) {
              // Removing -- still needs to persist below (matching the add
              // path), not just the local-only early return this used to
              // do. Without this, a pick here only ever updated local
              // selectedRegions state, never data.cx_selected_regions --
              // which reads as "region deselects itself" the moment
              // anything reads from `data` instead of this component's own
              // state (the workflow stepper's done-check, and critically
              // Subjective/Objective, which decide which region-specific
              // fields to show from data.cx_selected_regions, not from
              // this local array).
              set({ cx_selected_regions: JSON.stringify(next) });
              return next;
            }
            if (countSlots(next) >= 3) return next;
            const toAdd = reg.lr
              ? (side === "L" ? [reg.keys.L] : side === "R" ? [reg.keys.R] : [reg.keys.B_L, reg.keys.B_R])
              : [reg.keys.B];
            next = [...next, ...toAdd];
            // Persist immediately -- same reasoning as above. Also clears
            // stale region-specific AI variables (same fields toggleRegion
            // already clears) so switching/adding a region doesn't leave
            // another region's AI-derived findings hanging around.
            set({ cx_selected_regions: JSON.stringify(next), cx_insight: null,
              cx_lumbar_variables: null, cx_lumbar_note_findings: null, cx_lumbar_ai_filled: null, cx_lumbar_pending_rf: null,
              cx_cervical_variables: null, cx_cervical_note_findings: null, cx_cervical_ai_filled: null, cx_cervical_pending_rf: null,
              cx_thoracic_variables: null, cx_thoracic_note_findings: null, cx_thoracic_ai_filled: null, cx_thoracic_pending_rf: null });
            return next;
          });
          setInsight(null);
        };

        const totalSlots = countSlots(selectedRegions);
        const sideColors = { L:"#3B82F6", R:"#10B981", B:"#7c3aed" };
        const sideLabels = { L:"Left", R:"Right", B:"Both" };

        // Flat, searchable list for the dedicated Body Regions step (matches
        // the provided reference design: white cards, chips-with-× row up
        // top, plain "+ " list below, no grouping/accordion). The compact
        // popup opened from the AI step's chip row (regionPickerOpen)
        // keeps the original grouped accordion below -- different context
        // (small drop-down inside another screen), left alone so as not to
        // risk that separately-tested interaction.
        if (viewStep === "region") {
          const flatRows = REGION_GROUPS.flatMap(group => group.regions.flatMap(reg =>
            reg.lr
              ? [{ reg, side:"L", label:`Left ${reg.name}` }, { reg, side:"R", label:`Right ${reg.name}` }]
              : [{ reg, side:"B", label:reg.name }]
          ));
          const q = regionSearch.trim().toLowerCase();
          const visibleRows = q ? flatRows.filter(row => row.label.toLowerCase().includes(q)) : flatRows;
          const chips = allRegs
            .map(reg => ({ reg, side: getActiveSide(reg.id, reg.lr) }))
            .filter(x => x.side)
            .map(x => ({ ...x, label: x.reg.lr ? `${sideLabels[x.side]} ${x.reg.name}` : x.reg.name }));

          return (
            <div style={{ background:PC.surface, borderRadius:14, border:`1px solid ${PC.border}` }}>
              <div style={{ padding:"16px 16px 4px" }}>
                <div style={{ fontSize:"1.1rem", fontWeight:800, color:PC.text, marginBottom:4 }}>Select Body Region</div>
                <div style={{ fontSize:"0.82rem", color:PC.muted, marginBottom:14 }}>Select up to 3 regions</div>

                {chips.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                    {chips.map(c => (
                      <span key={c.reg.id+c.side} style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:"0.85rem", fontWeight:700, padding:"8px 14px", borderRadius:99, background:PC.accent, color:"#fff" }}>
                        {c.label}
                        <span onClick={()=>handleSidePick(c.reg, c.side)} style={{ cursor:"pointer", fontSize:"0.95rem", lineHeight:1, opacity:0.85 }}>×</span>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  value={regionSearch}
                  onChange={e=>setRegionSearch(e.target.value)}
                  placeholder="Search body region..."
                  style={{ width:"100%", background:PC.s2, border:`1px solid ${PC.border}`, borderRadius:10, color:PC.text, fontFamily:"inherit", outline:"none", padding:"11px 14px", fontSize:"0.88rem", boxSizing:"border-box", marginBottom:8 }}
                />
              </div>

              <div>
                {visibleRows.map(row => {
                  const isSelected = getActiveSide(row.reg.id, row.reg.lr) === row.side;
                  const isDisabled = !isSelected && totalSlots >= 3;
                  return (
                    <div key={row.reg.id+row.side}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderTop:`1px solid ${PC.border}` }}>
                      <span style={{ fontSize:"0.92rem", color:PC.text, fontWeight:500 }}>{row.label}</span>
                      <button type="button"
                        disabled={isDisabled}
                        onClick={()=>handleSidePick(row.reg, row.side)}
                        aria-label={`${isSelected?"Remove":"Add"} ${row.label}`}
                        style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${isSelected?PC.accent:PC.border}`,
                          background: isSelected?PC.accent:PC.s2, color: isSelected?"#fff":PC.muted,
                          fontSize:"1.1rem", fontWeight:700, lineHeight:1, cursor:isDisabled?"not-allowed":"pointer",
                          opacity:isDisabled?0.4:1, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {isSelected ? "✓" : "+"}
                      </button>
                    </div>
                  );
                })}
                {visibleRows.length===0 && (
                  <div style={{ padding:"20px 16px", textAlign:"center", fontSize:"0.85rem", color:PC.muted }}>No regions match "{regionSearch}"</div>
                )}
              </div>

              <div style={{ padding:"12px 16px", borderTop:`1px solid ${PC.border}`, textAlign:"center", fontSize:"0.82rem", fontWeight:600, color:PC.muted }}>
                {totalSlots} of 3 selected
              </div>
            </div>
          );
        }

        return regionPickerOpen ? (
          <div style={{ background:PC.surface, borderRadius:10, border:`1px solid ${PC.border}`, overflow:"hidden",
            boxShadow:"0 4px 16px rgba(0,0,0,0.08)" }}>

            {REGION_GROUPS.map((group, gi) => {
              const groupOpen = !!openGroups[group.id];
              const groupCount = group.regions.filter(r => getActiveSide(r.id, r.lr) !== null).length;
              const isLastGroup = gi === REGION_GROUPS.length - 1;
              return (
                <div key={group.id} style={{ borderBottom: isLastGroup && !groupOpen ? "none" : `1px solid ${PC.border}` }}>
                  {/* Group header */}
                  <div onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px", background:PC.s2, cursor:"pointer", userSelect:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:"0.72rem", fontWeight:700, color:PC.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                      <span>{group.icon}</span>{group.label}
                      {groupCount > 0 && <span style={{ fontSize:"0.6rem", background:PC.accent, color:"#fff", borderRadius:99, padding:"1px 6px" }}>{groupCount}</span>}
                    </div>
                    <span style={{ fontSize:"0.65rem", color:PC.muted, display:"inline-block", transition:"transform 0.18s", transform: groupOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>

                  {/* Group body */}
                  {groupOpen && group.regions.map((reg, ri) => {
                    const regionOpen = !!openRegions[reg.id];
                    const activeSide = getActiveSide(reg.id, reg.lr);
                    const isLastReg = ri === group.regions.length - 1;
                    return (
                      <div key={reg.id} style={{ borderTop:`1px solid ${PC.border}` }}>
                        {/* Region row */}
                        <div onClick={() => setOpenRegions(prev => ({ ...prev, [reg.id]: !prev[reg.id] }))}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px 8px 20px", cursor:"pointer", userSelect:"none", background:PC.surface }}>
                          <span style={{ fontSize:"0.8rem", color:PC.text, flex:1 }}>{reg.name}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            {activeSide && (
                              <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"2px 8px", borderRadius:99, background:sideColors[activeSide]+"22", color:sideColors[activeSide], border:`1px solid ${sideColors[activeSide]}44` }}>
                                {sideLabels[activeSide]}
                              </span>
                            )}
                            <span style={{ fontSize:"0.65rem", color:PC.muted, display:"inline-block", transition:"transform 0.18s", transform: regionOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                          </div>
                        </div>
                        {/* Options panel */}
                        {regionOpen && (
                          <div style={{ padding:"8px 14px 10px 20px", background:PC.s2, borderTop:`1px solid ${PC.border}` }}>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {(reg.lr ? ["L","R","B"] : ["B"]).map(side => {
                                const isActive = activeSide === side;
                                const isDisabled = !isActive && totalSlots >= 3;
                                const col = sideColors[side];
                                return (
                                  <button key={side} type="button"
                                    onClick={e => { e.stopPropagation(); if (!isDisabled) handleSidePick(reg, side); }}
                                    style={{ fontSize:"0.72rem", fontWeight:600, padding:"5px 14px", borderRadius:99,
                                      border:`1px solid ${isActive ? col : PC.border}`,
                                      background: isActive ? col : PC.surface,
                                      color: isActive ? "#fff" : isDisabled ? PC.border : PC.muted,
                                      cursor: isDisabled ? "not-allowed" : "pointer",
                                      opacity: isDisabled ? 0.3 : 1, transition:"all 0.1s", fontFamily:"inherit" }}>
                                    {reg.lr ? (side === "B" ? "Both" : side === "L" ? "Left" : "Right") : "Select"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Selected summary */}
            {selectedRegions.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"7px 14px", borderTop:`1px solid ${PC.border}`, background:PC.s2 }}>
                {selectedRegions.map(r => (
                  <span key={r} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.68rem", fontWeight:700, padding:"2px 8px", borderRadius:99,
                    background:(RC_S[r]||PC.accent)+"18", color:RC_S[r]||PC.accent, border:`1px solid ${(RC_S[r]||PC.accent)}44` }}>
                    {r}
                    <span onClick={e=>{ e.stopPropagation(); toggleRegion(r); }} style={{ fontSize:"0.7rem", cursor:"pointer", opacity:0.7 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null;
      })()}
      </>)}

      {showFormArea && (<>
      {/* ── Progress bar — grouped status pills (removed per request) ── */}
      {false && (()=>{
        // Core group: complaint + universal sections
        const coreKeys = Object.keys(UNIV_S||{});
        const coreFields = Object.values(UNIV_S||{}).flatMap(s=>s.fields||[]).filter(f=>f.id);
        const coreDone = coreFields.filter(f=>data[f.id]&&data[f.id]!=="").length;
        const coreTotal = coreFields.length;

        // Region group: region-specific sections
        const regFields = Object.values(REG_MOD_S||{}).flatMap(mod=>
          Object.values(mod.sections||mod||{}).flatMap(s=>s.fields?s.fields:[])
        ).filter(f=>f&&f.id);
        const regDone = regFields.filter(f=>data[f.id]&&data[f.id]!=="").length;
        const regTotal = regFields.length;

        // BPS group
        const bpsFields = Object.values(BPS_S||{}).flatMap(s=>s.fields||[]).filter(f=>f.id);
        const bpsDone = bpsFields.filter(f=>data[f.id]&&data[f.id]!=="").length;
        const bpsTotal = bpsFields.length;

        const hasRegion = selectedRegions.length > 0;
        const hasBPS = needsBPS_S(data);

        // Tiered CORE (the mandatory clinical minimum) for the loaded region
        // module(s) — separate from the optional deep-dive fields.
        const cp = coreProgress(Object.values(sections||{}), data);

        const groups = [
          { label:"Core", done: coreDone >= Math.round(coreTotal*0.5), pct: Math.round(coreDone/Math.max(coreTotal,1)*100) },
          hasRegion && cp.total > 0 && { label:`Core ${cp.filled}/${cp.total}`, done: cp.filled >= cp.total, pct: Math.round(cp.filled/Math.max(cp.total,1)*100) },
          hasRegion && { label:"Region", done: regDone > 0 && regDone >= Math.round(regTotal*0.4), pct: Math.round(regDone/Math.max(regTotal,1)*100) },
          hasBPS && { label:"BPS", done: bpsDone > 0, pct: Math.round(bpsDone/Math.max(bpsTotal,1)*100) },
        ].filter(Boolean);

        return (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 2px", flexWrap:"wrap" }}>
            <div style={{ flex:1, height:4, background: PC.s3, borderRadius:99, overflow:"hidden", minWidth:60 }}>
              <div style={{ width:`${pct}%`, height:"100%", borderRadius:99, transition:"width 300ms",
                background:`linear-gradient(90deg, ${PC.accent}, ${PC.green})` }} />
            </div>
            {groups.map(g => (
              <span key={g.label} style={{
                fontSize:"0.73rem", fontWeight:700, padding:"2px 8px", borderRadius:99,
                background: g.done ? PC.green+"18" : PC.s3,
                color: g.done ? PC.green : PC.muted,
                border: `1px solid ${g.done ? PC.green+"44" : PC.border}`,
                whiteSpace:"nowrap",
              }}>
                {g.done ? "✓ " : ""}{g.label}{!g.done && g.pct > 0 ? ` ${g.pct}%` : ""}
              </span>
            ))}
            {groups.length === 0 && (
              <span style={{ fontSize:"0.73rem", color: PC.muted }}>{pct}%</span>
            )}
          </div>
        );
      })()}

      {/* ── Summary modal — shows filled values as readable text ── */}
      {showSummary && (()=>{
        const SEP = "|";
        // Some fields matched by the broad *_agg/*_rel/*radiation* key scans
        // below are written as arrays by multi-select/checkbox-group inputs
        // elsewhere in this file (see rget()'s loc_radiation/cc_onset
        // handling above for the same class of field) rather than as a
        // SEP-joined string -- v()/arr() need to tolerate that instead of
        // assuming every matched key is always a string.
        const v = (k) => {
          const val = data[k];
          if (Array.isArray(val)) return val.filter(Boolean).join(SEP);
          return typeof val === "string" ? val : (val ? String(val) : "");
        };
        const arr = (k) => {
          const val = data[k];
          if (Array.isArray(val)) return val.filter(Boolean);
          return v(k) ? v(k).split(SEP).filter(Boolean) : [];
        };
        const hasAny = (keys) => keys.some(k=>v(k));

        // Build readable summary rows from actual filled data
        const rows = [];

        // Demographics
        const dem = [data.dem_name, data.dem_age&&`${data.dem_age}${data.dem_sex?` ${data.dem_sex}`:""}`, data.dem_occupation].filter(Boolean).join(" · ");
        if(dem) rows.push({label:"Patient",val:dem,col:"#534AB7"});

        // Chief complaint
        if(v("cc_main")) rows.push({label:"Complaint",val:v("cc_main"),col:"#dc2626"});
        const pain=[v("cc_vas_now")&&`Pain now ${v("cc_vas_now")}/10`,v("cc_vas_worst")&&`Worst ${v("cc_vas_worst")}/10`].filter(Boolean).join(" · ");
        if(pain) rows.push({label:"Pain score",val:pain,col:"#dc2626"});

        // Onset & duration
        const onset=[v("cc_onset_date")||v("cx_onset_date"),v("cc_duration"),v("cc_mechanism")||v("cc_mech_type")].filter(Boolean).join(" · ");
        if(onset) rows.push({label:"Onset",val:onset,col:"#d97706"});

        // Location
        const loc=Object.entries(data).filter(([k,val])=>k.endsWith("_loc")||k.endsWith("_location")).map(([,val])=>val).filter(Boolean).join("; ");
        if(loc) rows.push({label:"Location",val:loc,col:"#7c3aed"});

        // Aggravating — collect all *_agg* fields
        const aggKeys=Object.keys(data).filter(k=>k.includes("_agg")&&data[k]);
        const aggVals=[...new Set(aggKeys.flatMap(k=>arr(k)))].filter(v2=>v2&&v2.length>2).slice(0,6).join(", ");
        if(aggVals) rows.push({label:"Aggravating",val:aggVals,col:"#dc2626"});

        // Relieving
        const relKeys=Object.keys(data).filter(k=>k.includes("_rel")&&data[k]);
        const relVals=[...new Set(relKeys.flatMap(k=>arr(k)))].filter(v2=>v2&&v2.length>2).slice(0,5).join(", ");
        if(relVals) rows.push({label:"Relieving",val:relVals,col:"#059669"});

        // Symptom pattern / 24hr
        const patKeys=["cc_24hr","cx_24hr","lx_24hr","kn_24hr","hp_24hr","sh_24hr","af_24hr"];
        const pat=patKeys.map(k=>v(k)).filter(Boolean)[0];
        if(pat) rows.push({label:"24-hr pattern",val:pat,col:"#7c3aed"});

        const trajKeys=["cx_trajectory","lx_trajectory","kn_trajectory","hp_trajectory","sh_trajectory"];
        const traj=trajKeys.map(k=>v(k)).filter(Boolean)[0];
        if(traj) rows.push({label:"Trajectory",val:traj,col:"#7c3aed"});

        // Radiation
        const radKeys=Object.keys(data).filter(k=>k.includes("radiation")||k.includes("_rad")&&data[k]);
        const radVals=[...new Set(radKeys.flatMap(k=>arr(k)))].filter(v2=>v2&&v2.length>2&&!v2.toLowerCase().includes("no rad")).slice(0,4).join(", ");
        if(radVals) rows.push({label:"Radiation",val:radVals,col:"#f97316"});

        // Red flags
        const rfAction=v("grf_action");
        if(rfAction) rows.push({label:"Red flags",val:rfAction,col:rfAction.includes("No red flags")?"#059669":"#dc2626"});

        // Goals
        const goals=[v("ar_goal_function"),v("ar_goal_pain"),v("ar_goal_return"),v("sub_goals")].filter(Boolean).slice(0,2).join("; ");
        if(goals) rows.push({label:"Goals",val:goals,col:"#059669"});

        // PMH
        const pmh=arr("pmh_conditions").filter(v2=>!v2.includes("No significant")).slice(0,3).join(", ");
        if(pmh) rows.push({label:"Past history",val:pmh,col:"#6b7280"});

        // Medications
        const meds=arr("med_current").filter(v2=>!v2.includes("None")).slice(0,3).join(", ");
        if(meds) rows.push({label:"Medications",val:meds,col:"#6b7280"});

        const rfSec=Object.entries(sections).find(([k])=>k==="red_flags");
        const rfSkipped=rfSec?rfSec[1].fields.filter(f=>!data[f.id]||data[f.id]==="").length:0;
        const hasBlocker=rfSkipped>0;

        return(
          <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
            onClick={()=>setShowSummary(false)}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,background:PC.surface,borderRadius:"16px 16px 0 0",padding:"20px 16px 28px",maxHeight:"82vh",overflowY:"auto"}}>
              <div style={{width:40,height:4,borderRadius:99,background:PC.border,margin:"0 auto 16px"}}/>
              <div style={{fontSize:15,fontWeight:800,color:PC.text,marginBottom:14}}>What you've documented</div>
              {rows.length===0?(
                <div style={{textAlign:"center",padding:"24px 0",color:PC.muted,fontSize:13}}>Nothing filled yet — complete the assessment sections first.</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:0,marginBottom:14,borderRadius:12,overflow:"hidden",border:`1px solid ${PC.border}`}}>
                  {rows.map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:10,padding:"10px 14px",background:i%2===0?PC.s2:PC.surface,borderBottom:i<rows.length-1?`1px solid ${PC.border}`:"none",alignItems:"flex-start"}}>
                      <span style={{fontSize:11,fontWeight:700,color:r.col,minWidth:86,flexShrink:0,paddingTop:1,textTransform:"uppercase",letterSpacing:"0.4px"}}>{r.label}</span>
                      <span style={{fontSize:12.5,color:PC.text,lineHeight:1.55,flex:1}}>{r.val}</span>
                    </div>
                  ))}
                </div>
              )}
              {hasBlocker&&(
                <div style={{padding:"10px 12px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,marginBottom:12}}>
                  <div style={{fontSize:11.5,fontWeight:800,color:"#A32D2D",marginBottom:2}}>⚠ Red flag screen incomplete</div>
                  <div style={{fontSize:10.5,color:"#991B1B"}}>Complete before running the clinical engine</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={()=>setShowSummary(false)}
                  style={{padding:"11px",borderRadius:10,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  Continue editing
                </button>
                <button onClick={()=>{setShowSummary(false);runInterpretation();}}
                  disabled={selectedRegions.length===0}
                  style={{padding:"11px",borderRadius:10,border:"none",
                    background:selectedRegions.length>0?`linear-gradient(135deg,${PC.accent},${PC.a2})`:PC.s3,
                    color:selectedRegions.length>0?"#fff":PC.muted,fontWeight:800,fontSize:13,
                    cursor:selectedRegions.length>0?"pointer":"not-allowed",fontFamily:"inherit"}}>
                  🧠 Run analysis
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tabs ── */}
      <div style={{ display:"flex", borderBottom:`1px solid ${PC.border}`, gap:0 }}>
        {/* "bodychart" tab removed (2026-08-17) -- Body Chart now has
            its own dedicated Chart/Palpation step, showing it here too
            was a duplicate entry point into the same LazyBodyChart. */}
        {[["form","📝 Assessment"],["results","🧠 Interpretation"]].map(([t, label]) => (
          <button key={t} type="button" onClick={() => { setActiveTab(t); onTabChange&&onTabChange(t); }} style={{
            padding:"8px 16px", background:"transparent", border:"none", cursor:"pointer",
            borderBottom: activeTab===t ? `2px solid ${PC.accent}` : "2px solid transparent",
            color: activeTab===t ? PC.accent : PC.muted,
            fontWeight: activeTab===t ? 700 : 500, fontSize:"0.78rem", fontFamily:"inherit",
          }}>
            {label}
            {t==="results" && insight && (
              <span style={{ marginLeft:5, background: insight.anyUrgent ? PC.red : PC.green,
                color:"#fff", fontSize:"0.75rem", padding:"1px 6px", borderRadius:99, fontWeight:700 }}>
                {insight.anyUrgent ? "⚠" : "✓"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          FORM TAB
      ════════════════════════════════════════════════════ */}
      {activeTab === "form" && (
        <>
          {/* ── Run Analysis — pinned to the top of the Assessment tab,
               sticky so it stays visible while scrolling through the
               section list below instead of only being reachable after
               scrolling all the way to the bottom of a long form ── */}
          <button type="button" onClick={()=>setShowSummary(true)}
            disabled={selectedRegions.length === 0}
            style={{
              position:"sticky", top:0, zIndex:20,
              width:"100%", padding:"12px 16px", borderRadius:10, border:"none",
              background: selectedRegions.length > 0
                ? `linear-gradient(135deg, ${PC.accent}, ${PC.a2})`
                : PC.s3,
              color: selectedRegions.length > 0 ? "#fff" : PC.muted,
              fontWeight:800, fontSize:"0.85rem",
              cursor: selectedRegions.length > 0 ? "pointer" : "not-allowed",
              boxShadow: selectedRegions.length > 0 ? `0 4px 14px ${PC.accent}33` : "none",
              fontFamily:"inherit", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, marginBottom:12,
            }}>
            🧠 Suggest probable objective assessment
            {selectedRegions.length > 0 && (
              <span style={{ fontSize:"0.75rem", background:"rgba(255,255,255,0.2)",
                padding:"2px 8px", borderRadius:10, fontWeight:600 }}>
                {selectedRegions.length} region{selectedRegions.length>1?"s":""}
              </span>
            )}
          </button>

          {/* ══════════════════════════════════════════════════════
              Section nav + continuous field list. One top-level group
              (Core / a body region / General / ...) is active at a time --
              switching groups still switches which region's fields you're
              viewing, same as before. But WITHIN a group, every section is
              now rendered top to bottom in one continuous scroll instead of
              being stepped through one section at a time behind a
              "N / M" counter and Prev/Next buttons.
          ══════════════════════════════════════════════════════ */}
          {(() => {
            // Build groups: core universal keys, then one group per selected region, then trailing universal
            const CORE_KEYS = ["complaint"];
            const TRAILING_KEYS = ["goals","history","red_flags","pmh","lifestyle","paediatric","hypermobility"];
            const SLEEP_KEYS = ["sleep","sleep_pattern","sleep_impact"];
            const SPORT_KEYS = ["sport","sport_load","sport_return"];
            const BPS_KEYS = ["bps","bps_social","bps_psycho"];

            const allKeys = Object.keys(sections);

            // Region keys per selected region
            // Map picker region keys → REG_MOD_S canonical keys
            const REGION_MOD_KEY = {
              "Cervical (L)":"Cervical spine","Cervical (R)":"Cervical spine",
              "Thoracic (L)":"Thoracic spine","Thoracic (R)":"Thoracic spine",
              "Lumbar/SI (L)":"Lumbar / SI","Lumbar/SI (R)":"Lumbar / SI",
              "Elbow (L)":"Elbow/Wrist/Hand","Elbow (R)":"Elbow/Wrist/Hand",
              "Wrist/Hand (L)":"Elbow/Wrist/Hand","Wrist/Hand (R)":"Elbow/Wrist/Hand",
              "Hip/Groin (L)":"Hip / Groin","Hip/Groin (R)":"Hip / Groin",
              "Ankle/Foot (L)":"Ankle / Foot","Ankle/Foot (R)":"Ankle / Foot",
            };
            const seenModKeys = new Map();
            const regionGroups = [];
            selectedRegions.forEach(r => {
              const modKey = REGION_MOD_KEY[r] || r;
              const mod = REG_MOD_S[modKey];
              if (!mod) { regionGroups.push({ label: r, col: RC_S[r]||PC.accent, keys: [] }); return; }
              if (seenModKeys.has(modKey)) {
                // Already have this group — append side label if needed
                const g = seenModKeys.get(modKey);
                const side = r.match(/\([LR]\)/)?.[0];
                if (side && !g.label.includes(side)) g.label = g.label.replace(/ \([LR]\)/,"") + " (L+R)";
                return;
              }
              const group = { label: r, col: RC_S[r]||PC.accent, keys: Object.keys(mod.sections).filter(k => allKeys.includes(k)) };
              seenModKeys.set(modKey, group);
              regionGroups.push(group);
            });

            // Gather remaining keys that don't fit above buckets
            const knownKeys = new Set([
              ...CORE_KEYS,
              ...regionGroups.flatMap(g => g.keys),
              ...TRAILING_KEYS, ...SLEEP_KEYS, ...SPORT_KEYS, ...BPS_KEYS,
            ]);
            const trailingPresent = allKeys.filter(k => TRAILING_KEYS.includes(k));
            const sleepPresent = allKeys.filter(k => SLEEP_KEYS.includes(k));
            const sportPresent = allKeys.filter(k => SPORT_KEYS.includes(k));
            const bpsPresent = allKeys.filter(k => BPS_KEYS.includes(k));
            const extraPresent = allKeys.filter(k => !knownKeys.has(k));

            const groups = [
              { label:"Core", col: PC.accent, keys: CORE_KEYS.filter(k => allKeys.includes(k)) },
              ...regionGroups,
              ...(trailingPresent.length ? [{ label:"General", col:"#6b7280", keys: trailingPresent }] : []),
              ...(sleepPresent.length ? [{ label:"Sleep", col:"#7c3aed", keys: sleepPresent }] : []),
              ...(sportPresent.length ? [{ label:"Sport", col:"#16a34a", keys: sportPresent }] : []),
              ...(bpsPresent.length ? [{ label:"Psychosocial", col:"#d97706", keys: bpsPresent }] : []),
              ...(extraPresent.length ? [{ label:"Other", col: PC.muted, keys: extraPresent }] : []),
            ].filter(g => g.keys.length > 0);

            // Find active group
            const activeGroup = groups.find(g => g.keys.includes(activeSection)) || groups[0];
            const agCol = activeGroup ? activeGroup.col : PC.accent;

            const jumpToGroup = (key) => {
              setActiveSection(key);
              setSearchTerm("");
              setTimeout(() => {
                // Scroll to the tab card (not the section body) so the tabs stay
                // visible and the region's first section shows right below,
                // instead of flinging the page into the middle of the content.
                const target = groupTabsRef.current || sectionTopRef.current;
                if (target) target.scrollIntoView({ behavior:"smooth", block:"start" });
              }, 30);
            };
            const jumpToSection = (key) => {
              setActiveSection(key);
              const el = document.getElementById(`subj-sec-${key}`);
              if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
            };

            const groupSections = activeGroup ? activeGroup.keys.map(k => sections[k]).filter(Boolean) : [];
            const groupHasMulticheck = groupSections.some((s, i) => activeGroup.keys[i] !== "complaint" && s.fields.some(f => f.type === "multicheck"));
            // Continuous "N." numbering across every field in the active group
            // (matches the confirmed mockup) -- resets to 1 whenever the group
            // tab changes, since this is recomputed fresh on every render.
            let fieldNum = 0;

            return (
              <>
                <div ref={groupTabsRef} style={{ background:"#fff", borderRadius:14, overflow:"hidden",
                  border:"1px solid rgba(0,0,0,0.07)",
                  boxShadow:"0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}>

                  {/* ── Row 1: Group tabs — plain text, purple underline ── */}
                  <div style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none",
                    WebkitOverflowScrolling:"touch", borderBottom:"1px solid #F0F0F0",
                    padding:"0 4px" }}>
                    {groups.map((g) => {
                      const isAct = activeGroup && g.label === activeGroup.label;
                      return (
                        <button key={g.label} type="button" data-testid={`subj-group-tab-${g.label}`}
                          onClick={()=>jumpToGroup(g.keys[0])}
                          style={{
                            padding:"10px 12px 8px",
                            background:"transparent",
                            borderBottom: isAct ? `2.5px solid ${g.col}` : "2.5px solid transparent",
                            border:"none", borderRadius:0, cursor:"pointer", fontFamily:"inherit",
                            flexShrink:0, whiteSpace:"nowrap", transition:"color 120ms",
                          }}>
                          <span style={{
                            fontSize:"0.75rem", fontWeight: isAct ? 700 : 500,
                            color: isAct ? g.col : "#888",
                          }}>{g.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Row 2: Section pills — jump to that section below; every
                       section stays visible, this just scrolls to it ── */}
                  {activeGroup && (
                    <div style={{ display:"flex", overflowX:"auto", gap:6, padding:"8px 10px",
                      scrollbarWidth:"none", WebkitOverflowScrolling:"touch", flexWrap:"nowrap" }}>
                      {activeGroup.keys.map(key => {
                        const s = sections[key]; if (!s) return null;
                        const isAct = key === activeSection;
                        return (
                          <button key={key} type="button"
                            onClick={()=>jumpToSection(key)}
                            style={{
                              display:"flex", alignItems:"center", gap:5,
                              padding:"6px 13px",
                              borderRadius:99, cursor:"pointer", fontFamily:"inherit",
                              flexShrink:0, whiteSpace:"nowrap", transition:"all 120ms",
                              border: isAct ? "none" : "1.5px solid #E8E8E8",
                              background: isAct ? agCol : "#F5F5F5",
                              boxShadow: isAct ? `0 2px 8px ${agCol}40` : "none",
                            }}>
                            <span style={{ fontSize:"0.8rem", lineHeight:1 }}>{s.icon}</span>
                            <span style={{
                              fontSize:"0.72rem", fontWeight: isAct ? 700 : 500,
                              color: isAct ? "#fff" : "#555",
                            }}>
                              {s.label.replace(/^[^—]+ — /,"").replace(/^[^—]+ \(.\) — /,"")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* No region selected prompt */}
                {selectedRegions.length === 0 && !["complaint","goals","history","red_flags","pmh","lifestyle"].includes(activeSection) && (
                  <div style={{ background:"#fffbeb", border:`1px solid ${PC.yellow}55`, borderRadius:10,
                    padding:"12px 16px", color: PC.yellow, fontSize:"0.78rem" }}>
                    ⚠ Select at least one region above to load the region-specific assessment module
                  </div>
                )}

                {/* Every section in the active group, stacked top to bottom --
                    one continuous scroll instead of one section at a time. */}
                <div ref={sectionTopRef} style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  {groupSections.map((s, si) => {
                    const key = activeGroup.keys[si];
                    const sColor = s.color || PC.accent;
                    return (
                      <div key={key} id={`subj-sec-${key}`}>

                        {/* Small, subtle section header — icon lives here only */}
                        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 4px 6px" }}>
                          <span style={{ fontSize:"0.78rem" }}>{s.icon}</span>
                          <span style={{ fontSize:"0.74rem", fontWeight:800, letterSpacing:"0.06em",
                            textTransform:"uppercase", color: PC.text }}>{s.label}</span>
                        </div>
                        {s.description && (
                          <div style={{ fontSize:"0.76rem", color: PC.muted, fontStyle:"italic", padding:"0 4px 6px", lineHeight:1.5 }}>
                            {s.description}
                          </div>
                        )}

                        {/* Adaptive tiering: CORE + triggered CONDITIONAL (+ any
                            legacy note that already holds data) render inline;
                            DEEP-dive detail sits behind an "Add more detail"
                            expander. Non-visible gated fields are omitted (their
                            data, if ever set, still flows to the engine). */}
                        {(() => {
                          const classified = s.fields.map((field) => ({ field, ...classifyField(field, data) }));
                          const mainFields = classified.filter((c) => c.visible && c.tier !== "deep");
                          const deepFields = classified.filter((c) => c.visible && c.tier === "deep");
                          const open = !!deepOpen[key];
                          return (
                            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                              {mainFields.map(({ field }, fi) => (
                                <AssessmentRow key={field.id} label={field.label}
                                  helpText={FIELD_HELP[field.id]} PC={PC} stacked={field.type === "range"} last={fi === mainFields.length - 1 && deepFields.length === 0}>
                                  {renderField(field)}
                                </AssessmentRow>
                              ))}
                              {deepFields.length > 0 && (
                                <>
                                  <button type="button" data-testid={`subj-deep-toggle-${key}`}
                                    onClick={() => setDeepOpen((o) => ({ ...o, [key]: !o[key] }))}
                                    style={{ alignSelf:"flex-start", display:"flex", alignItems:"center", gap:6,
                                      padding:"7px 12px", borderRadius:99, cursor:"pointer", fontFamily:"inherit",
                                      border:`1.5px dashed ${sColor}66`, background:"transparent",
                                      color:sColor, fontSize:"0.72rem", fontWeight:700 }}>
                                    {open ? "▲ Hide extra detail" : `＋ Add more detail (${deepFields.length})`}
                                  </button>
                                  {open && deepFields.map(({ field }, fi) => (
                                    <AssessmentRow key={field.id} label={field.label}
                                      helpText={FIELD_HELP[field.id]} PC={PC} stacked={field.type === "range"} last={fi === deepFields.length - 1}>
                                      {renderField(field)}
                                    </AssessmentRow>
                                  ))}
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

        </>
      )}

      {/* ════════════════════════════════════════════════════
          RESULTS TAB
      ════════════════════════════════════════════════════ */}
      {/* Was `minHeight:200` — an empty placeholder nothing else in the
          codebase targets (checked: no portal, no test references this id).
          The real body chart (LazyBodyChart) renders as a sibling right
          after this whole module in AppFull.jsx, so that 200px of dead
          space was exactly what pushed it below the fold, forcing a scroll
          on load (2026-07-30). Left the id in case something starts using
          it as a scroll anchor later. */}
      {activeTab === "bodychart" && (
        <div id="subjective-bodychart-slot"/>
      )}

      {activeTab === "results" && !insight && (
        <div style={{ background: PC.surface, borderRadius:12, padding:28,
          border:`1px solid ${PC.border}`, textAlign:"center", color: PC.muted, fontSize:"0.8rem" }}>
          Complete the assessment and click Generate Clinical Interpretation
        </div>
      )}

      {activeTab === "results" && insight && showInsight && (() => {
        const allRegionResults = insight.regionResults || [];
        const regionIds = allRegionResults.map(r => r.region);
        // Tabbing only kicks in with 2+ regions -- a single-region review has
        // nothing to switch between, so effectiveActiveRegion is null and
        // both maps below render every (i.e. the one) result as before.
        const effectiveActiveRegion = regionIds.length > 1
          ? (regionIds.includes(activeReviewRegion) ? activeReviewRegion : regionIds[0])
          : null;
        return (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* ── REGION TABS — one clinical review per region instead of every
               region's full interpretation stacked into one long scroll ── */}
          {effectiveActiveRegion && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", position:"sticky", top:0, zIndex:15,
              background: PC.bg, padding:"6px 0", marginBottom:2 }}>
              {allRegionResults.map((r, ri) => {
                const regCol = r.urgentFlag ? PC.red : (RC_S[REGION_FAMILY_KEY[r.region] || r.region] || PC.accent);
                const regTextCol = r.urgentFlag ? regCol : (RC_TEXT_OVERRIDE[REGION_FAMILY_KEY[r.region] || r.region] || regCol);
                const isActive = r.region === effectiveActiveRegion;
                return (
                  <button key={ri} type="button" onClick={() => setActiveReviewRegion(r.region)}
                    style={{ padding:"7px 14px", borderRadius:20, fontSize:"0.78rem", fontWeight:isActive?800:600,
                      border:`1.5px solid ${isActive?regCol:PC.border}`,
                      background: isActive ? `${regCol}18` : "transparent",
                      color: isActive ? regTextCol : PC.muted, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:5 }}>
                    {r.urgentFlag && <span>🚨</span>}
                    {r.region}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── URGENT FLAGS BANNER ── */}
          {insight.anyUrgent && (
            <div style={{ background: PC.red+"12", border:`2px solid ${PC.red}`, borderRadius:12,
              padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:"1.2rem" }}>🚨</span>
              <div>
                <div style={{ fontWeight:800, color: PC.red, fontSize:"0.82rem", marginBottom:4 }}>
                  URGENT FLAGS PRESENT — Do not proceed with loading or manual therapy until cleared
                </div>
                {insight.regionResults.filter(r=>r.urgentFlag).map((r,i)=>(
                  r.precautions.map((p,j)=>(
                    <div key={`${i}-${j}`} style={{ fontSize:"0.82rem", color: PC.red, marginBottom:3, lineHeight:1.5 }}>• {p}</div>
                  ))
                ))}
              </div>
            </div>
          )}

          {/* ── SUGGESTED PROBABLE DIAGNOSIS — removed from this view 2026-08-06 ──
              Was mounted here 2026-07-30 (<ProbableDiagnosis autoRun hideButton>).
              Duplicated genericPhase05's card below for Hip/Knee/Ankle-Foot/
              Elbow-Wrist-Hand -- both pull from the identical differential
              object (same runReasoningFromData call), just different UI. User
              decision (see HANDOFF.md): keep genericPhase05 as the one card --
              its priority-test buttons are clickable with a "?" why-explanation
              and (after the 2026-08-06 fixes) actually deep-link to the right
              module/region/test, unlike ProbableDiagnosis's plain text chips.
              genericPhase05's card below now also carries ProbableDiagnosis's
              score badge / colored finding chips (via the shared `Chips`
              export) so nothing is lost visually by dropping this mount.
              ProbableDiagnosis.jsx itself, and its separate SOAP-tab "Suggest
              Probable Diagnosis" mount in ClinicalModules.jsx, are untouched. ── */}

          {/* ══════════════════════════════════════════════
              PER-REGION: 7-PHASE CLINICAL REASONING
          ══════════════════════════════════════════════ */}
          {insight.regionResults.map((r, ri) => {
            if (effectiveActiveRegion && r.region !== effectiveActiveRegion) return null;
            const regCol = RC_S[REGION_FAMILY_KEY[r.region] || r.region] || PC.accent;
            const regTextCol = RC_TEXT_OVERRIDE[REGION_FAMILY_KEY[r.region] || r.region] || "#fff";

            // ── Derive observation suggestions from pattern ──
            const obsItems = [];
            if (r.inflammatoryPattern) obsItems.push({item:"Joint swelling / synovitis signs",why:"Inflammatory pattern detected — assess for active synovitis"});
            if (r.mechanicalPattern)   obsItems.push({item:"Antalgic posture / guarding",why:"Mechanical pattern — look for protective posture and movement avoidance"});
            if (r.radiculopathySig)    obsItems.push({item:"Dermatome sensory changes + muscle wasting",why:"Radiculopathy signals — observe for atrophy, altered sensation territory"});
            if (r.nociplasticSig)      obsItems.push({item:"Hypervigilance / pain behaviour",why:"Nociplastic risk — observe for catastrophising body language, exaggerated guarding"});
            const regionObs = {
              "Cervical spine":[{item:"Forward head posture + thoracic kyphosis",why:"Cervical load increases 4-5x per 2.5cm anterior head translation (Hansraj 2014)"},{item:"Scapular elevation / upper trap hypertrophy",why:"Upper trap compensating for inhibited deep cervical flexors — classic UCS"},{item:"Cervical rotation asymmetry at rest",why:"Segmental restriction or muscle guarding — note side"},{item:"Thoracic kyphosis angle",why:"Hyperkyphosis drives cervical compensatory extension and FHP"},{item:"TMJ tension / jaw posture",why:"Cervicogenic headache often co-presents with TMJ dysfunction"}],
              "Thoracic spine":[{item:"Thoracic kyphosis — increased / decreased / scoliosis",why:"Hyperkyphosis drives FHP; scoliosis screen with Adam's forward bend + scoliometer (>5 degrees = refer)"},{item:"Rib cage symmetry — bilateral",why:"Rib asymmetry suggests thoracic rotation or scoliosis component"},{item:"Scapular position — bilateral comparison",why:"Winging / elevation / depression asymmetry reflects thoracic rotation and muscle imbalance"},{item:"Breathing pattern — thoracic vs diaphragmatic",why:"Thoracic breathing = accessory muscle overuse (scalenes, upper trap) — common in thoracic pain"},{item:"Skin changes — shingles / visceral signs",why:"T4-T8 dermatomal rash = shingles; visceral referral must be excluded before MSK treatment"}],
              "Shoulder (L)":[{item:"Scapular winging / dyskinesis (Kibler Type I-III)",why:"Serratus anterior or lower trap inhibition drives subacromial impingement — anterior tilt reduces space 28% (Lukasiewicz)"},{item:"Rounded shoulder / pec minor tightness",why:"Anterior tilt + IR = reduced subacromial clearance; palpate coracoid"},{item:"Muscle wasting supraspinatus / infraspinatus fossa",why:"Chronic RCT or suprascapular nerve entrapment — posterior fossa wasting"},{item:"Dominant arm IR resting posture",why:"IR resting = anterior capsule tightness / posterior capsule contracture (GIRD pattern)"},{item:"Cervicothoracic posture",why:"T4-T6 kyphosis reduces scapular upward rotation — indirect impingement driver"}],
              "Shoulder (R)":[{item:"Scapular winging / dyskinesis",why:"Serratus anterior or lower trap inhibition — drives subacromial impingement"},{item:"Rounded shoulder / pec minor tightness",why:"Anterior tilt reduces subacromial space — palpate coracoid process"},{item:"Muscle wasting supraspinatus / infraspinatus fossa",why:"Chronic RCT or suprascapular nerve entrapment"},{item:"Dominant arm IR resting posture",why:"Posterior capsule tightness — GIRD pattern in throwing athletes"},{item:"Cervicothoracic posture",why:"Kyphosis reduces scapular upward rotation — indirect impingement"}],
              "Lumbar / SI":[{item:"Lumbar lordosis — increased / decreased / flat",why:"Loss of lordosis = disc / guarding; increased = facet / spondylolisthesis; flat = stenosis flexed preference"},{item:"Lateral shift / scoliosis — from behind",why:"Lateral shift = disc with nerve root compression; ipsilateral = lateral herniation; contralateral = medial"},{item:"Pelvic obliquity + tilt asymmetry",why:"SIJ dysfunction, leg length discrepancy, or hip flexor imbalance driving lumbar load"},{item:"Gait — antalgic / Trendelenburg / foot drop",why:"L5 foot drop; S1 = push-off weakness; Trendelenburg = gluteus medius inhibition"},{item:"Paraspinal muscle bulk asymmetry",why:"Unilateral wasting = chronic denervation; bilateral = multifidus atrophy (Hides)"}],
              "Hip / Groin":[{item:"Pelvic tilt — anterior / posterior / obliquity",why:"Anterior tilt = hip flexor dominance + glute inhibition; posterior = hamstring tightness + posterior capsule"},{item:"Trendelenburg sign — static and walking",why:"Gluteus medius inhibition — drives lateral hip pain + ipsilateral knee valgus chain"},{item:"Lower limb alignment — femoral anteversion / torsion",why:"Increased anteversion = in-toeing + FAI risk; excessive ER = posterior hip capsule tightness"},{item:"Adductor bulk / groin contour symmetry",why:"Adductor strain — observe bruising, asymmetric bulk; palpate pubic ramus insertion"},{item:"Hip flexor length — Thomas test visual screen",why:"Hip flexor tightness drives anterior pelvic tilt and lumbar extension — common driver"}],
              "Knee (L)":[{item:"Valgus / varus alignment — static and dynamic squat",why:"Static valgus = structural; dynamic valgus = kinetic chain failure (glute med + ankle DF restriction)"},{item:"Quadriceps / VMO bulk — bilateral comparison",why:"VMO atrophy with effusion inhibition — arthrogenic muscle inhibition (Young 1987): 20mL sufficient"},{item:"Effusion — visible fullness / loss of patellar definition",why:"Effusion inhibits VMO reflexively — assess sweep test and ballottement"},{item:"Patellar position — alta / baja / lateral tilt / glide",why:"Patellar alta = PFPS risk; lateral tilt = tight lateral retinaculum; baja = post-patellar tendon surgery"},{item:"Tibial rotation / tibiofemoral alignment",why:"Excessive tibial IR (from foot pronation) causes medial knee overload and MCL stress"}],
              "Knee (R)":[{item:"Valgus / varus alignment — static and dynamic",why:"Dynamic valgus = kinetic chain (glute med + ankle DF); structural valgus = MCL laxity"},{item:"VMO bulk — bilateral comparison",why:"Arthrogenic inhibition with effusion — VMO first to atrophy in knee pathology"},{item:"Effusion — fullness in parapatellar gutters",why:"Sweep test for small effusion; ballottement for large — inhibits VMO"},{item:"Patellar position and tracking",why:"Lateral tilt = lateral retinaculum tightness; alta = tendinopathy risk"},{item:"Tibial alignment and foot position",why:"Pronated foot causes tibial IR and medial knee loading — kinetic chain screen"}],
              "Ankle / Foot":[{item:"Foot pronation / arch collapse — static and single leg dynamic",why:"Hyperpronation drives tibial IR → knee valgus → hip adduction — full lower limb kinetic chain"},{item:"Heel position — valgus (pronation) / varus (supination)",why:"Rearfoot valgus = overpronation; varus = supinator / lateral ankle instability risk"},{item:"Achilles tendon contour — thickening / Haglund's bump",why:"Tendon thickening = mid-portion tendinopathy; Haglund's deformity = posterior/insertional"},{item:"Toe alignment — hallux valgus / claw / hammer toes",why:"Hallux valgus alters forefoot loading; toe deformities = intrinsic muscle inhibition"},{item:"Ankle swelling pattern — location",why:"Lateral = ligament sprain; medial = deltoid / tibialis posterior; diffuse = effusion / synovitis"}],
              "Elbow/Wrist/Hand":[{item:"Carrying angle — cubitus valgus / varus",why:"Cubitus valgus >15 degrees = increased MCL valgus stress; post-fracture deformity screen"},{item:"Muscle wasting — thenar / hypothenar / intrinsic",why:"Thenar wasting = CTS / median nerve; hypothenar = ulnar nerve (cubital / Guyon's canal)"},{item:"Swelling location — joint line vs soft tissue",why:"Lateral epicondyle = tendinopathy; olecranon = bursitis; radiocarpal = synovitis / TFCC"},{item:"Finger deformity — swan neck / boutonniere / Heberden's",why:"Swan neck / boutonniere = RA / post-injury; Heberden's / Bouchard's = OA"},{item:"Skin — colour change / trophic / dystrophic nails",why:"CRPS signs: allodynia, colour change, disproportionate swelling, temperature asymmetry"}],
            };
            const obsForRegion = (regionObs[r.region] || []).concat(obsItems).slice(0, 5);
            const OBS_REGION_CODE = { "Cervical spine":"cx","Thoracic spine":"th","Lumbar / SI":"lx","Shoulder (L)":"sh","Shoulder (R)":"sh","Knee (L)":"kn","Knee (R)":"kn","Hip / Groin":"hp","Ankle / Foot":"af","Elbow/Wrist/Hand":"wh" };
            const obsCode = OBS_REGION_CODE[REGION_FAMILY_KEY[r.region] || r.region] || null;
            const POSTURE_REGION = { "Cervical spine":"Cervical","Thoracic spine":"Thoracic","Lumbar / SI":"Lumbar","Shoulder (L)":"Shoulder","Shoulder (R)":"Shoulder","Hip / Groin":"Hip","Knee (L)":"Knee","Knee (R)":"Knee","Ankle / Foot":"Ankle" };
            const postureRegion = POSTURE_REGION[REGION_FAMILY_KEY[r.region] || r.region] || null;

            // ── ROM priority from pattern ──
            const romPriority = {
              "Cervical spine":    [{mv:"Rotation L + R",imp:"High",why:"Most clinically relevant — C1/C2 restriction (FRT); 90° norm; <60° = significant"},{mv:"Flexion",imp:"High",why:"Discogenic aggravator — centralisation testing; chin to chest norm"},{mv:"Extension + rotation quadrant",imp:"High",why:"Facet loading — reproduces facet / radicular pain"},{mv:"Side flexion L + R",imp:"Moderate",why:"Lateral canal narrowing — radiculopathy screen"}],
              "Thoracic spine":    [{mv:"Rotation (seated)",imp:"High",why:"Most restricted in thoracic dysfunction; norm 35-45 degrees; compare bilaterally"},{mv:"Flexion — forward bend",imp:"High",why:"Thoracic kyphosis angle + rib hump screen (scoliosis); segmental stiffness"},{mv:"Extension",imp:"High",why:"Facet / costovertebral provocation — restricted in hyperkyphosis"},{mv:"Rib cage expansion",imp:"Moderate",why:"Costochondritis / rib fracture — compare inhalation expansion bilaterally (norm >5cm)"}],
              "Shoulder (L)":      [{mv:"Abduction",imp:"High",why:"Painful arc 60-120 degrees = subacromial; full loss = capsular (STTT)"},{mv:"External Rotation",imp:"High",why:"First to restrict in capsular pattern — compare bilaterally"},{mv:"Hand-behind-back (IR)",imp:"High",why:"Functional IR — reaching / dressing limitation"},{mv:"Horizontal adduction",imp:"Moderate",why:"AC joint reproduction test; posterior capsule tightness (GIRD)"}],
              "Shoulder (R)":      [{mv:"Abduction",imp:"High",why:"Painful arc = subacromial pattern; full loss = capsular"},{mv:"External Rotation",imp:"High",why:"Capsular pattern — first movement restricted; compare bilaterally"},{mv:"Hand-behind-back",imp:"High",why:"Functional IR — ADL impact"},{mv:"Horizontal adduction",imp:"Moderate",why:"AC joint / posterior capsule tightness"}],
              "Lumbar / SI":       [{mv:"Flexion (fingertip to floor)",imp:"High",why:"Discogenic aggravator — centralisation? Repeated movements (McKenzie); lateral shift?"},{mv:"Extension",imp:"High",why:"Facet / stenosis pattern — reproduces symptoms + centralisation testing"},{mv:"Side flexion L + R",imp:"High",why:"Lateral shift screen — disc protrusion pattern; asymmetry = relevant level"},{mv:"Rotation (sitting)",imp:"Moderate",why:"Combined movements — facet quadrant loading"}],
              "Hip / Groin":       [{mv:"Internal rotation (prone 90 degrees flexion)",imp:"High",why:"MOST restricted in OA capsular pattern (STTT); <35 degrees = LBP risk driver"},{mv:"FADIR combined",imp:"High",why:"FAI / labral provocation — most sensitive combination test"},{mv:"Flexion (hip-lumbar rhythm)",imp:"High",why:"Observe pelvic compensation at end range — hip-lumbar rhythm disruption"},{mv:"Abduction",imp:"Moderate",why:"Gluteus medius / abductor tendinopathy — compare bilaterally"}],
              "Knee (L)":          [{mv:"Flexion (passive + active)",imp:"High",why:"Capsular restriction (OA: flexion > extension loss); spring end-feel = meniscal block"},{mv:"Extension — full hyperextension check",imp:"High",why:"Inability = effusion inhibition or mechanical block; hyperextension = PCL / posterior capsule"},{mv:"Tibial rotation at 90 degrees",imp:"Moderate",why:"Restricted IR = LCL / IT band; restricted ER = MCL / medial capsule"}],
              "Knee (R)":          [{mv:"Flexion (passive + active)",imp:"High",why:"Capsular restriction or meniscal block — note end-feel"},{mv:"Extension — full check",imp:"High",why:"Effusion or mechanical block — compare to other side"},{mv:"Tibial rotation at 90 degrees",imp:"Moderate",why:"Ligament restriction — IR vs ER asymmetry"}],
              "Ankle / Foot":      [{mv:"Dorsiflexion — weight-bearing lunge test",imp:"High",why:"<10cm from wall = restricted DF — primary kinetic chain driver; compare bilaterally"},{mv:"Inversion / eversion",imp:"High",why:"Ligament integrity (inversion) + tibialis posterior (eversion)"},{mv:"Plantarflexion",imp:"Moderate",why:"Achilles / posterior impingement — passive overpressure"},{mv:"Subtalar neutral + midfoot mobility",imp:"Moderate",why:"Pronation / supination pattern — functional foot alignment"}],
              "Elbow/Wrist/Hand":  [{mv:"Elbow flexion / extension",imp:"High",why:"Capsular restriction (OA / post-fracture); loss of extension = bursitis / effusion"},{mv:"Forearm supination / pronation",imp:"High",why:"Supination restricted = lateral epicondylalgia; pronation restricted = medial / TFCC"},{mv:"Wrist flexion / extension",imp:"High",why:"Extensor restriction + pain = lateral epicondylalgia; flexor = medial; TFCC = end range"},{mv:"Grip strength (dynamometer)",imp:"High",why:"Lateral epicondylalgia: grip pain; CTS: grip weakness; compare bilaterally"},{mv:"Finger flexion / extension + opposition",imp:"Moderate",why:"Trigger finger, Dupuytren, nerve entrapment — functional hand screen"}],
            };
            const romForRegion = romPriority[r.region] || [{mv:"All planes AROM",imp:"High",why:"Screen all movement directions"}];

            // ── MMT from pattern ──
            const mmtForRegion = {
              "Cervical spine":   [{m:"Deep cervical flexors (craniocervical flexion test)",why:"Most commonly inhibited in cervical dysfunction — forward head posture driver (Jull 2008)"},{m:"Lower trapezius",why:"Scapular stabiliser — inhibited in cervical + shoulder patterns; test prone"},{m:"Serratus anterior",why:"Inhibition causes scapular winging and cervical overload"},{m:"Deep neck extensors (multifidus cervical)",why:"Segmental stabiliser — atrophies in chronic cervical pain (Elliott 2006)"}],
              "Thoracic spine":   [{m:"Thoracic multifidus / erector spinae",why:"Segmental thoracic stabiliser — inhibited in thoracic pain and kyphosis"},{m:"Lower trapezius",why:"Scapular retraction and depression — critical for thoracic postural correction"},{m:"Serratus anterior",why:"Rib cage stability + scapular protraction — inhibited in thoracic dysfunction"},{m:"Diaphragm (breath hold test)",why:"Diaphragm is primary thoracic stabiliser — poor control = thoracic accessory muscle overuse"},{m:"Rhomboids",why:"Scapular retraction — often inhibited; upper trap compensates in thoracic kyphosis"}],
              "Shoulder (L)":     [{m:"Supraspinatus (empty can / full can)",why:"Initiates abduction 0-30 degrees; most common RCT location — grade and compare"},{m:"Infraspinatus / Teres minor (ER at 0 and 90 degrees)",why:"ER power and endurance; wasting = posterior RCT or suprascapular nerve"},{m:"Subscapularis (lift-off / belly press / IR at 0 degrees)",why:"IR strength — most commonly missed RCT component; internal impingement"},{m:"Lower + middle trapezius (prone Y and T)",why:"Scapular upward rotation force couple — inhibited in impingement (Cools 2004)"},{m:"Serratus anterior (wall push-up plus)",why:"Scapular protraction — winging = inhibited; primary lateral scapular rotator"}],
              "Shoulder (R)":     [{m:"Supraspinatus (empty can / full can)",why:"Most common RCT — grade and compare bilaterally"},{m:"Infraspinatus / Teres minor (ER)",why:"ER weakness = RCT / posterior impingement"},{m:"Subscapularis (lift-off / belly press)",why:"IR strength — internal impingement pattern"},{m:"Lower + middle trapezius (prone Y and T)",why:"Scapular force couple — inhibited in impingement"},{m:"Serratus anterior (wall push-up plus)",why:"Scapular protraction / winging assessment"}],
              "Lumbar / SI":      [{m:"Multifidus — segmental (real-time ultrasound preferred)",why:"Atrophies within 24hrs of acute LBP and does not spontaneously recover (Hides 1994)"},{m:"Transversus abdominis (ADIM)",why:"First-to-fire stabiliser — delayed activation in LBP (Hodges 1996)"},{m:"Gluteus maximus (prone hip extension)",why:"Primary hip extensor — inhibited in LBP; poor activation drives lumbar compensation"},{m:"Gluteus medius (side-lying hip abduction)",why:"Frontal plane stability — Trendelenburg and SIJ load driver"},{m:"Hip flexors (modified Thomas test)",why:"Overactive in anterior pelvic tilt pattern — inhibits gluteus maximus reciprocally"}],
              "Hip / Groin":      [{m:"Gluteus medius / minimus (side-lying + single leg stance)",why:"Lateral hip stabiliser — GTPS driver; Trendelenburg gait; knee valgus chain"},{m:"Gluteus maximus (prone + single leg bridge)",why:"Primary hip extensor — commonly inhibited; reciprocally inhibited by hip flexors"},{m:"Adductors (squeeze test at 0, 45, 90 degrees)",why:"Groin strain / tendinopathy severity — most sensitive at 45 degrees (Holmich)"},{m:"Iliopsoas (modified Thomas test + resisted flexion)",why:"Hip flexor tendinopathy or FAI pattern; overactivity drives anterior pelvic tilt"},{m:"Hip external rotators (prone ER resisted)",why:"GTPS / piriformis — deep external rotators commonly inhibited"}],
              "Knee (L)":         [{m:"Vastus medialis oblique (VMO — terminal knee extension)",why:"Patellar tracking control; inhibited by effusion >= 20mL (arthrogenic inhibition)"},{m:"Gluteus medius (side-lying hip abduction)",why:"Proximal driver of dynamic knee valgus — PFPS / ITB / ACL risk"},{m:"Hamstrings (prone knee flexion + functional)",why:"ACL co-contraction and deceleration — crucial in instability and RTS rehab"},{m:"Gastrocnemius / soleus (single heel raise endurance)",why:"Distal kinetic chain — ankle DF restriction drives knee loading"}],
              "Knee (R)":         [{m:"VMO (terminal knee extension)",why:"Patellar tracking; inhibited by effusion — arthrogenic inhibition"},{m:"Gluteus medius (side-lying)",why:"Dynamic valgus driver — treat proximal before knee"},{m:"Hamstrings",why:"Knee stability co-contraction — ACL protection"},{m:"Gastrocnemius / soleus (single heel raise)",why:"Ankle DF kinetic chain — distal driver of knee loading"}],
              "Ankle / Foot":     [{m:"Tibialis posterior (resisted inversion + single heel raise)",why:"Arch control — inhibited in flatfoot / PTTD; single heel raise failure = insufficiency"},{m:"Peroneus longus / brevis (resisted eversion)",why:"Lateral stability — inhibited after lateral ankle sprain; peroneal subluxation screen"},{m:"Gastrocnemius / soleus (single heel raise x30)",why:"Achilles load tolerance — <25 reps = significant deficit (Alfredson); compare bilaterally"},{m:"Intrinsic foot muscles (toe spread + short foot)",why:"Arch support — inhibited in plantar fasciitis; short foot exercise baseline"},{m:"Tibialis anterior (resisted DF)",why:"L4 nerve root; foot drop screen; ankle sprain — anterior compartment"}],
              "Elbow/Wrist/Hand": [{m:"Grip strength (dynamometer — 3 trials each side)",why:"Lateral epicondylalgia: gripping reproduces pain; CTS: weakness without pain; compare bilaterally"},{m:"Wrist extensors (resisted extension at 0 degrees elbow)",why:"Lateral epicondylalgia — Cozen's resisted wrist extension reproduces pain at lateral epicondyle"},{m:"Wrist flexors (resisted flexion + pronation)",why:"Medial epicondylalgia pattern — resisted flexion + pronation reproduces medial epicondyle pain"},{m:"Thenar muscles (opposition + abductor pollicis brevis)",why:"CTS / median nerve — thenar wasting and weakness confirm advanced compression"},{m:"Intrinsic hand muscles (interossei + lumbricals)",why:"Ulnar nerve (cubital / Guyon's) — intrinsic wasting = advanced ulnar neuropathy; Froment's sign"}],
            };
            const mmtItems = mmtForRegion[r.region] || [{m:"Full MMT all planes",why:"Screen all muscle groups"}];

            // ── Functional assessment ──
            const funcForRegion = {
              "Cervical spine":   ["Sustained sitting posture (computer/phone) — time to symptom onset","Cervical rotation for driving — bilateral range check","Overhead reach — axial cervical load provocation","Sustained reading position — flexion tolerance","Lifting / carrying — assess breath hold and axial load strategy"],
              "Thoracic spine":   ["Sustained sitting — thoracic kyphosis and symptom onset","Rotation for driving / sport — bilateral symmetry","Overhead bilateral reach — thoracic extension demand","Deep breathing / cough — costovertebral / rib provocation","Forward bend functional screen — thoracic vs lumbar contribution"],
              "Shoulder (L)":     ["Overhead reach bilateral comparison — functional arc","Hand-behind-back — dressing / hygiene (functional IR)","Lateral lift 1kg to shoulder height — painful arc provocation","Wall push-up plus — scapular control screen","Throwing / tennis serve / swimming catch (if sport relevant)"],
              "Shoulder (R)":     ["Overhead reach bilateral comparison","Hand-behind-back — dressing / hygiene","Lateral lift to shoulder height — arc provocation","Wall push-up plus — scapular dyskinesis screen","Sport-specific overhead demand (throwing / racquet / swim)"],
              "Lumbar / SI":      ["Sit-to-stand from low chair — flexion to extension transition and strategy","Forward bend (toe touch) — lateral shift + centralisation screen","Single leg stance 30 sec — SIJ and lumbopelvic control","Squat pattern — hip-lumbar rhythm and pelvic compensation","Step-up 20cm — gluteal activation and lumbopelvic stability"],
              "Hip / Groin":      ["Single leg stance — Trendelenburg sign and pelvic drop observation","Hip hinge deadlift pattern — posterior chain loading","Lateral squat / side lunge — adductor load provocation","Running gait analysis (treadmill if available) — hip extension deficit","Sit-to-stand — hip flexor / posterior chain loading strategy"],
              "Knee (L)":         ["Single leg squat — dynamic valgus / pelvic control (most informative)","Step-down 20cm box — most provocative for PFPS and VMO assessment","Double leg squat — depth + alignment + bilateral comparison","Forward lunge — sagittal plane control + patellar tracking","Hop tests (single / triple / crossover) — RTS readiness after ACL / ligament"],
              "Knee (R)":         ["Single leg squat — dynamic valgus / pelvic control","Step-down 20cm box — PFPS and VMO provocation","Double leg squat — depth and alignment","Forward lunge — sagittal plane and patellar tracking","Hop tests — RTS readiness assessment"],
              "Ankle / Foot":     ["Single heel raise — endurance x30 reps target (Alfredson protocol baseline)","Bilateral squat — ankle DF restriction screen","Lunge test to wall — weight-bearing DF norm 10cm+ (Bennell)","Walk and run gait — pronation pattern and push-off quality","Step-down — pronation control and tibialis posterior function"],
              "Elbow/Wrist/Hand": ["Grip and release — jar opening, door handle, bag carrying","Keyboard / mouse sustained posture — time to symptom onset","Overhead or shoulder height lifting — elbow valgus load","Fine motor tasks — buttoning, writing, pinch (CTS / ulnar neuropathy)","Throwing / racquet sport / tool use — relevant sport or work demand"],
            };
            const funcItems = funcForRegion[r.region] || ["Functional movement screen relevant to complaint"];

            // ── Special tests from suspicion ──
            // Already in differentials[].tests — extract and label by suspicion level
            const testsByDx = r.differentials.map((d,di)=>({
              label: d.label,
              suspicion: d.confidence,
              tests: d.tests || [],
              why: `Suspicion level ${d.confidence} based on: ${d.evidence}`,
            }));

            // ── Treatment direction from patterns ──
            const txDir = [];
            if (r.mechanicalPattern && !r.radiculopathySig) txDir.push({phase:"Load Management",detail:"Identify movement threshold and stay 20% below — gradual graded exposure (O'Sullivan, CSEP)"});
            if (r.inflammatoryPattern) txDir.push({phase:"Inflammation Control",detail:"Activity modification, relative rest, ice/NSAID phase, avoid compressive loading — 3–5 day acute phase"});
            if (r.tendinopathicPattern) txDir.push({phase:"Tendon Loading",detail:"Isometric loading immediately (pain ≤4/10), progress to isotonic eccentric/heavy slow resistance — AVOID stretching acutely (Brukner & Khan / Docking & Cook)"});
            if (r.radiculopathySig)  txDir.push({phase:"Neural Mobilisation",detail:"Nerve gliding (slider then tensioner), directional preference (McKenzie), posture correction to reduce neural tension"});
            if (r.nociplasticSig)    txDir.push({phase:"Pain Neurophysiology Education",detail:"Explain central sensitisation — use Explain Pain (Moseley & Butler). Goal: reconceptualise pain as danger signal not damage signal. Graded exposure, psychological input"});
            if (!txDir.length)       txDir.push({phase:"Mechanical Rehabilitation",detail:"Progressive loading program: mobility → motor control → strength → functional → sport-specific"});
            // Add kinetic chain and region-specific rehab direction
            if (["Knee (L)","Knee (R)"].includes(r.region)) txDir.push({phase:"Kinetic Chain",detail:"Address ankle DF restriction + gluteus medius inhibition BEFORE isolated knee work — treating only the knee will fail (Cook & Purdam). Sequence: ankle DF mobility → glute med activation → VMO → functional loading"});
            if (["Shoulder (L)","Shoulder (R)"].includes(r.region)) txDir.push({phase:"Kinetic Chain",detail:"Thoracic extension mobility + scapular control (lower trapezius + serratus anterior) before rotator cuff loading (Kibler / Burkhart). Sequence: thoracic mob → scapular setting → rotator cuff → overhead loading"});
            if (r.region === "Lumbar / SI") txDir.push({phase:"Motor Control",detail:"Transversus abdominis + multifidus activation — segmental stability before global loading. Deep to superficial hierarchy (Richardson & Hodges). Progress: ADIM → functional stabilisation → whole-body movement"});
            if (r.region === "Thoracic spine") txDir.push({phase:"Thoracic Mobility First",detail:"Thoracic mobility drives cervical, shoulder and lumbar function. Sequence: thoracic extension (foam roller / SNAG) → rotation mobility → breathing re-education → postural correction → scapular control loading (Maitland / Mulligan)"});
            if (r.region === "Hip / Groin") txDir.push({phase:"Kinetic Chain",detail:"Hip strategy drives lumbar spine and knee loading. Sequence: hip ER + abductor activation (glute med / max) → hip hinge motor control → posterior chain loading → sport/work specific return (Cook & Purdam / Reiman)"});
            if (r.region === "Ankle / Foot") txDir.push({phase:"Kinetic Chain",detail:"Ankle is the base of the kinetic chain — restricted DF and pronation drive tibial IR, knee valgus and hip adduction. Sequence: DF mobility → tibialis posterior activation → intrinsic foot → proprioception → return to load"});
            if (r.region === "Elbow/Wrist/Hand") txDir.push({phase:"Kinetic Chain",detail:"Upper limb kinetic chain: thoracic rotation → shoulder ER / scapular control → elbow → wrist → hand. In throwing / racquet sport, proximal strength deficit drives distal overload (Kibler). Assess cervical and shoulder before isolating elbow/wrist"});
            if (r.region === "Cervical spine") txDir.push({phase:"Motor Control",detail:"Deep cervical flexor (DNF) training using craniocervical flexion test protocol (Jull 2008). Progress: CCFT biofeedback (22-26 mmHg) → functional positions → sustained posture endurance → cervical loading. Address thoracic kyphosis concurrently"});

            // ── CPA / Motor Control ──
            const nktMap = {
              "Cervical spine":   {over:["Upper trapezius","Sternocleidomastoid","Suboccipital muscles","Scalenes (accessory breathing)"],under:["Deep cervical flexors (DNF)","Lower trapezius","Serratus anterior","Cervical multifidus (segmental)"]},
              "Thoracic spine":   {over:["Superficial thoracic erectors","Upper trapezius","Scalenes","Pectoralis major / minor"],under:["Thoracic multifidus","Lower trapezius","Serratus anterior","Rhomboids","Diaphragm (stabiliser role)"]},
              "Shoulder (L)":     {over:["Upper trapezius","Pectoralis minor","Levator scapulae","Subscapularis (in IR dominance pattern)"],under:["Lower trapezius","Serratus anterior","Infraspinatus / teres minor","Middle trapezius"]},
              "Shoulder (R)":     {over:["Upper trapezius","Pectoralis minor","Levator scapulae","Subscapularis"],under:["Lower trapezius","Serratus anterior","Infraspinatus / teres minor","Middle trapezius"]},
              "Lumbar / SI":      {over:["Iliopsoas","Rectus femoris","Thoracolumbar erectors (superficial)","Hamstrings (posterior chain dominance)"],under:["Transversus abdominis","Multifidus (segmental)","Gluteus maximus","Gluteus medius"]},
              "Hip / Groin":      {over:["Iliopsoas","Adductors","TFL / IT band","Rectus femoris"],under:["Gluteus maximus","Gluteus medius","Deep hip external rotators (piriformis, obturators)","Pelvic floor"]},
              "Knee (L)":         {over:["Rectus femoris","TFL / IT band","Adductors","Gastrocnemius"],under:["VMO (vastus medialis oblique)","Gluteus medius","Tibialis posterior","Popliteus"]},
              "Knee (R)":         {over:["Rectus femoris","TFL / IT band","Adductors","Gastrocnemius"],under:["VMO","Gluteus medius","Tibialis posterior","Popliteus"]},
              "Ankle / Foot":     {over:["Gastrocnemius / soleus (ankle plantarflexors)","Peroneals (after sprain — protective overactivity)","Tibialis anterior (after immobilisation)"],under:["Tibialis posterior","Intrinsic foot muscles (FHB, interossei)","Gluteus medius (proximal kinetic chain)","Peroneus longus (arch control)"]},
              "Elbow/Wrist/Hand": {over:["Wrist flexors / pronators (medial epicondyle pattern)","Wrist extensors / supinators (lateral epicondyle)","Upper trapezius (proximal compensation)","Brachioradialis"],under:["Deep wrist stabilisers (interossei)","Lower trapezius / serratus (proximal)","Thenar muscles (CTS)","Intrinsic hand muscles (ulnar neuropathy)"]},
            };
            const nkt = nktMap[r.region] || {over:["Regional overactive compensators"],under:["Regional underactive stabilisers"]};

            return (
              <div key={ri} style={{
                background: r.urgentFlag ? "#fff5f5" : PC.surface,
                borderRadius:14, overflow:"hidden",
                border:`2px solid ${r.urgentFlag ? PC.red : regCol}`,
                boxShadow:`0 2px 10px ${r.urgentFlag ? PC.red+"22" : regCol+"18"}`,
              }}>
                {/* Region header bar */}
                <div style={{ background: r.urgentFlag ? PC.red : regCol, padding:"10px 16px",
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontWeight:800, color: r.urgentFlag ? "#fff" : regTextCol, fontSize:"0.82rem" }}>
                    {r.region}
                  </div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {r.tags.slice(0,4).map(t => (
                      <span key={t} style={{ fontSize:"0.78rem", fontWeight:700, padding:"2px 7px",
                        borderRadius:99,
                        background: r.urgentFlag ? "rgba(255,255,255,0.25)" : (regTextCol === "#fff" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)"),
                        color: r.urgentFlag ? "#fff" : regTextCol }}>{t}</span>
                    ))}
                  </div>
                </div>

                <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>

                  {/* ── PHASE 0: EXTRACTED CLINICAL VARIABLES (Lumbar only) ──
                       Shows what the Lumbar Variable Extractor read from the
                       Subjective Assessment -- Pass 1 (structured fields,
                       deterministic, instant) plus Pass 2 (AI over free-text
                       notes only, async) -- as the actual input the Phase 1
                       hypotheses below are built from. Present/Absent/Unknown
                       are shown explicitly rather than collapsing Unknown
                       into a "no" -- unknown data should lower confidence,
                       not count as evidence against a hypothesis. ── */}
                  {false && (REGION_FAMILY_KEY[r.region] || r.region) === "Lumbar / SI" && lumbarVariables && (() => {
                    const lv = lumbarVariables;
                    const Chip = ({ state, children }) => (
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:4,
                        fontSize:"0.72rem", fontWeight:700, padding:"3px 9px", borderRadius:99,
                        background: state==="present" ? "#dc262618" : state==="absent" ? "#05966918" : "#94a3b818",
                        color: state==="present" ? "#dc2626" : state==="absent" ? "#059669" : "#64748b",
                        border: `1px solid ${state==="present" ? "#dc262644" : state==="absent" ? "#05966944" : "#94a3b844"}`,
                      }}>
                        {state==="present" ? "✓" : state==="absent" ? "—" : "?"} {children}
                      </span>
                    );
                    // fieldKey lets a row look itself up in
                    // lumbarAiFilledFields -- when the AI note pass
                    // filled this exact field (not just found *a*
                    // mention of it somewhere), the row shows a
                    // distinct "AI extracted" badge instead of a plain
                    // Yes/No, so a clinician can see at a glance which
                    // answers came from a checkbox vs. a note.
                    const row = (label, state, detail, fieldKey) => {
                      const aiFilled = fieldKey && lumbarAiFilledFields.includes(fieldKey);
                      return (
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                          <span style={{ fontSize:"0.74rem", color: PC.muted, minWidth:150 }}>{label}</span>
                          <Chip state={state}>{state==="unknown" ? "Not asked" : (detail || (state==="present"?"Yes":"No"))}</Chip>
                          {aiFilled && (
                            <span style={{
                              fontSize:"0.66rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                              background:"#7c3aed18", color:"#7c3aed", border:"1px solid #7c3aed44",
                            }}>
                              ✓ AI extracted
                            </span>
                          )}
                        </div>
                      );
                    };
                    const redFlagState = (f) => f.state;
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:`4px solid #0891b2` }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#0891b2", marginBottom:8 }}>
                          Phase 0 — Extracted Clinical Variables
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Read from the Subjective Assessment (checkboxes + notes, filled by hand or by AI) — this is the input the hypotheses below are built from
                        </div>

                        {row("Below-knee pain", lv.location.belowKneePain==="unknown"?"unknown":lv.location.belowKneePain?"present":"absent",
                          lv.location.belowKneePain==="bilateral"?"Bilateral":undefined, "belowKneePain")}
                        {row("Dermatomal pattern", lv.location.dermatomal.state, lv.location.dermatomal.values.join(", "), "dermatomalPattern")}
                        {row("Acute lifting mechanism", lv.mechanism.acuteLiftingMechanism==="unknown"?"unknown":lv.mechanism.acuteLiftingMechanism?"present":"absent", undefined, "acuteLiftingMechanism")}
                        {row("Flexion aggravates", lv.aggravating.movements.state==="unknown"?"unknown":lv.aggravating.flexionAggravates?"present":"absent", undefined, "flexionAggravates")}
                        {row("Extension aggravates", lv.aggravating.movements.state==="unknown"?"unknown":lv.aggravating.extensionAggravates?"present":"absent", undefined, "extensionAggravates")}
                        {row("Sitting aggravates", lv.aggravating.postures.state==="unknown"?"unknown":lv.aggravating.sittingAggravates?"present":"absent", undefined, "sittingAggravates")}
                        {row("Cough/sneeze aggravates", lv.aggravating.activities.state==="unknown"?"unknown":lv.aggravating.coughSneezeAggravates?"present":"absent", undefined, "coughSneezeAggravates")}
                        {row("Extension relieves", lv.relieving.movements.state==="unknown"?"unknown":lv.relieving.extensionRelieves?"present":"absent", undefined, "extensionRelieves")}
                        {row("Walking relieves", lv.relieving.movements.state==="unknown"?"unknown":lv.relieving.walkingRelieves?"present":"absent", undefined, "walkingRelieves")}
                        {row("Constant, unremitting pain", lv.symptomBehaviour.overallPattern.state==="unknown"?"unknown":lv.symptomBehaviour.constantUnremitting?"present":"absent", undefined, "constantUnremitting")}
                        {row("Constant night pain", lv.symptomBehaviour.night.state==="unknown"?"unknown":lv.symptomBehaviour.constantNightPain?"present":"absent", undefined, "constantNightPain")}
                        {row("Leg neurological symptoms", lv.neurological.hasLegNeuro==="unknown"?"unknown":lv.neurological.hasLegNeuro?"present":"absent", undefined, "hasLegNeuro")}
                        {row("Neurogenic claudication pattern", lv.neurological.claudication.state==="unknown"?"unknown":lv.neurological.neurogenicClaudication?"present":"absent", undefined, "neurogenicClaudication")}

                        <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", margin:"10px 0 5px" }}>Red flag screen (mandatory)</div>
                        {row("Cauda equina indicators", redFlagState(lv.redFlags.cauda), lv.redFlags.cauda.values.join(", "))}
                        {row("Fracture risk indicators", redFlagState(lv.redFlags.fracture), lv.redFlags.fracture.values.join(", "))}
                        {row("Inflammatory indicators", redFlagState(lv.redFlags.inflammatory), lv.redFlags.inflammatory.values.join(", "))}
                        {row("Other serious pathology", redFlagState(lv.redFlags.serious), lv.redFlags.serious.values.join(", "))}

                        {lumbarNotesLoading && (
                          <div style={{ fontSize:"0.73rem", color: PC.muted, marginTop:8, fontStyle:"italic" }}>
                            🔄 Checking free-text notes for anything not already captured…
                          </div>
                        )}
                        {!lumbarNotesLoading && lumbarNoteFindings.length > 0 && (
                          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${PC.border}` }}>
                            <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#7c3aed", marginBottom:5 }}>
                              Found in your notes (AI — merged into the variables above where a checkbox hadn't already answered that field)
                            </div>
                            {lumbarNoteFindings.map((f, fi) => (
                              <div key={fi} style={{ fontSize:"0.73rem", color: PC.text, marginBottom:4 }}>
                                <b>{f.variable}</b>: {f.value} <span style={{ color: PC.muted }}>— "{f.sourceQuote}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!lumbarNotesLoading && lumbarPendingRedFlagReview.length > 0 && (
                          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed #dc2626` }}>
                            <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", marginBottom:5 }}>
                              ⚠ Possible red-flag mentions in your notes — NOT auto-applied, please review the red flag screen above yourself
                            </div>
                            {lumbarPendingRedFlagReview.map((f, fi) => (
                              <div key={fi} style={{ fontSize:"0.73rem", color: PC.text, marginBottom:4 }}>
                                <b>{f.variable}</b>: {f.value} <span style={{ color: PC.muted }}>— "{f.sourceQuote}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0.5: LUMBAR REASONING ENGINE (Layer 3) ──
                       Separate from Phase 1 below, which is the older,
                       unweighted runEngineV6 differential logic. This is
                       the new engine covering all 11 lumbar condition
                       hypotheses (L01-L11), built off the same
                       lumbarVariables Phase 0 extracted above. Also
                       unweighted -- count-based match tiers, not a
                       probability -- per the explicit build order this
                       project has followed (variables before weights). ── */}
                  {(REGION_FAMILY_KEY[r.region] || r.region) === "Lumbar / SI" && lumbarReasoning && (() => {
                    const lr = lumbarReasoning;
                    const tierColor = { "Strong match":"#dc2626", "Possible match":"#d97706", "Weak match":"#64748b", "Insufficient data":"#94a3b8", "Unlikely":"#cbd5e1" };
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:"4px solid #7c3aed" }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#7c3aed", marginBottom:8 }}>
                          Phase 0.5 — Lumbar Condition Matches (L01–L11)
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Unweighted, count-based matches against all 11 lumbar hypotheses — not a probability. Weighting is a deliberately deferred future step.
                        </div>

                        {lr.redFlagOverride.triggered && (
                          <div style={{ background:"#FEF2F2", border:"2px solid #dc2626", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                            <div style={{ fontWeight:800, color:"#dc2626", fontSize:"0.78rem", marginBottom:3 }}>
                              🚨 {lr.redFlagOverride.urgency === "EMERGENCY" ? "EMERGENCY — Cauda Equina Indicators" : "URGENT REFERRAL INDICATED"}
                            </div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", marginBottom:3 }}>{lr.redFlagOverride.reason}</div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", fontWeight:600 }}>{lr.redFlagOverride.action}</div>
                          </div>
                        )}
                        {lr.redFlagOverride.urgency === "SCREEN_INCOMPLETE" && (
                          <div style={{ background:"#FFFBEB", border:"1px solid #d97706", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                            <div style={{ fontSize:"0.73rem", color:"#92400E" }}>⚠ {lr.redFlagOverride.action}</div>
                          </div>
                        )}

                        {lr.conditions.slice(0, 6).map((c, ci) => (
                          <div key={c.id} style={{
                            background: ci===0 ? "#7c3aed12" : PC.surface,
                            border: `1px solid ${ci===0 ? "#7c3aed44" : PC.border}`,
                            borderRadius:8, padding:"9px 12px", marginBottom:6,
                          }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                              <span style={{ fontSize:"0.8rem", fontWeight:700 }}>
                                {c.id} — {c.name}{c.lowConfidence ? " ⚠" : ""}
                              </span>
                              <span style={{ fontSize:"0.72rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                                background: tierColor[c.matchTier]+"18", color: tierColor[c.matchTier] }}>
                                {c.matchTier}
                              </span>
                            </div>
                            <div style={{ fontSize:"0.72rem", color: PC.muted }}>
                              {c.supportingMatched.length} supporting · {c.refutingMatched.length} refuting · {c.unknownCount} unknown
                              {c.note && <div style={{ marginTop:2, fontStyle:"italic" }}>{c.note}</div>}
                            </div>
                            {c.matchTier !== "Unlikely" && ((c.objectiveTests && (c.objectiveTests.required?.length > 0 || c.objectiveTests.recommended?.length > 0)) || spineAssessmentModules(c.id).length > 0) && (() => {
                              const priTests = [...(c.objectiveTests?.required || []), ...(c.objectiveTests?.recommended || [])];
                              const testFirst = new Set(priTests.map((t) => String(t).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]).filter(Boolean));
                              const layers = spineAssessmentModules(c.id).filter((m) => !REDUNDANT_LAYER_KEYS.has(m.key) && !testFirst.has(String(m.label).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]));
                              return (
                                <div style={{ marginTop:8, background:"#fff", border:"1px solid #ECE7F7", borderRadius:12, padding:"10px 12px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                                  <div style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color: tierColor[c.matchTier], marginBottom:6 }}>
                                    Objective assessment — for this condition (tap ? for why &amp; what it tells you)
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
                                    {priTests.map((t, ti) => {
                                      const target = lumbarTestNav(t);
                                      const btn = target
                                        ? { label:t, icon:target.icon, col:target.col, nav:target.nav, ctx:target.ctx, why:target.why }
                                        : { label:t, icon:"📋", col:PC.muted, nav:null, ctx:null, why:"No dedicated module for this test in the app yet -- shown for completeness, not clickable." };
                                      return <NavActionBtn key={"pri"+ti} btn={btn} onNav={onNav} PC={PC}/>;
                                    })}
                                    {layers.flatMap((m, mi) => layerNavButtons(m, mi, onNav, PC, REGION_FAMILY_KEY[r.region] || r.region))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0 (CERVICAL): EXTRACTED CLINICAL VARIABLES ──
                       Exact mirror of the Lumbar Phase 0 block above, reading
                       cervicalVariables instead. See that block's comment for
                       the full rationale (Present/Absent/Unknown tri-state,
                       AI-extracted badges, etc). ── */}
                  {false && (REGION_FAMILY_KEY[r.region] || r.region) === "Cervical spine" && cervicalVariables && (() => {
                    const cv = cervicalVariables;
                    const Chip = ({ state, children }) => (
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:4,
                        fontSize:"0.72rem", fontWeight:700, padding:"3px 9px", borderRadius:99,
                        background: state==="present" ? "#dc262618" : state==="absent" ? "#05966918" : "#94a3b818",
                        color: state==="present" ? "#dc2626" : state==="absent" ? "#059669" : "#64748b",
                        border: `1px solid ${state==="present" ? "#dc262644" : state==="absent" ? "#05966944" : "#94a3b844"}`,
                      }}>
                        {state==="present" ? "✓" : state==="absent" ? "—" : "?"} {children}
                      </span>
                    );
                    const row = (label, state, detail, fieldKey) => {
                      const aiFilled = fieldKey && cervicalAiFilledFields.includes(fieldKey);
                      return (
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                          <span style={{ fontSize:"0.74rem", color: PC.muted, minWidth:150 }}>{label}</span>
                          <Chip state={state}>{state==="unknown" ? "Not asked" : (detail || (state==="present"?"Yes":"No"))}</Chip>
                          {aiFilled && (
                            <span style={{
                              fontSize:"0.66rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                              background:"#7c3aed18", color:"#7c3aed", border:"1px solid #7c3aed44",
                            }}>
                              ✓ AI extracted
                            </span>
                          )}
                        </div>
                      );
                    };
                    const redFlagState = (f) => f.state;
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:`4px solid #0891b2` }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#0891b2", marginBottom:8 }}>
                          Phase 0 — Extracted Clinical Variables
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Read from the Subjective Assessment (checkboxes + notes, filled by hand or by AI) — this is the input the hypotheses below are built from
                        </div>

                        {row("Arm/hand pain", cv.location.armHandPain==="unknown"?"unknown":cv.location.armHandPain?"present":"absent",
                          cv.location.armHandPain==="bilateral"?"Bilateral":undefined, "armHandPain")}
                        {row("Dermatomal pattern", cv.location.dermatomal.state, cv.location.dermatomal.values.join(", "), "dermatomalPattern")}
                        {row("Whiplash mechanism", cv.mechanism.type.state==="unknown"?"unknown":cv.mechanism.whiplashMechanism?"present":"absent", undefined, "whiplashMechanism")}
                        {row("Flexion aggravates", cv.aggravating.movements.state==="unknown"?"unknown":cv.aggravating.flexionAggravates?"present":"absent", undefined, "flexionAggravates")}
                        {row("Extension aggravates", cv.aggravating.movements.state==="unknown"?"unknown":cv.aggravating.extensionAggravates?"present":"absent", undefined, "extensionAggravates")}
                        {row("Rotation aggravates", cv.aggravating.movements.state==="unknown"?"unknown":cv.aggravating.rotationAggravates?"present":"absent", undefined, "rotationAggravates")}
                        {row("Quadrant position aggravates", cv.aggravating.movements.state==="unknown"?"unknown":cv.aggravating.quadrantAggravates?"present":"absent", undefined, "quadrantAggravates")}
                        {row("Sustained posture aggravates", cv.aggravating.postures.state==="unknown"?"unknown":cv.aggravating.sustainedPostureAggravates?"present":"absent", undefined, "sustainedPostureAggravates")}
                        {row("Cough/sneeze aggravates", cv.aggravating.other.state==="unknown"?"unknown":cv.aggravating.coughSneezeAggravates?"present":"absent", undefined, "coughSneezeAggravates")}
                        {row("Chin tuck relieves", cv.relieving.movements.state==="unknown"?"unknown":cv.relieving.chinTuckRelieves?"present":"absent", undefined, "chinTuckRelieves")}
                        {row("Arm-overhead relieves arm symptoms", cv.relieving.movements.state==="unknown"?"unknown":cv.relieving.armOverheadRelievesArmSymptoms?"present":"absent", undefined, "armOverheadRelievesArmSymptoms")}
                        {row("Constant, unremitting pain", cv.symptomBehaviour.overallPattern.state==="unknown"?"unknown":cv.symptomBehaviour.constantUnremitting?"present":"absent", undefined, "constantUnremitting")}
                        {row("Constant night pain", cv.symptomBehaviour.night.state==="unknown"?"unknown":cv.symptomBehaviour.constantNightPain?"present":"absent", undefined, "constantNightPain")}
                        {row("Occipital / base-of-skull headache", cv.headache.location.state==="unknown"?"unknown":cv.headache.occipitalHeadache?"present":"absent", undefined, "occipitalHeadache")}
                        {row("Headache triggered by neck movement", cv.headache.triggers.state==="unknown"?"unknown":cv.headache.headacheTriggeredByNeckMovement?"present":"absent", undefined, "headacheTriggeredByNeckMovement")}
                        {row("Objective neurological signs", cv.armHand.neuroSigns.state==="unknown"?"unknown":cv.armHand.objectiveNeuroSigns?"present":"absent", undefined, "objectiveNeuroSigns")}
                        {row("Lhermitte's sign positive", cv.armHand.lhermitte.state==="unknown"?"unknown":cv.armHand.lhermittePositive?"present":"absent", undefined, "lhermittePositive")}

                        <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", margin:"10px 0 5px" }}>Red flag screen (mandatory)</div>
                        {row("Cervical myelopathy indicators", redFlagState(cv.redFlags.myelopathy), cv.redFlags.myelopathy.values.join(", "))}
                        {row("Vertebrobasilar insufficiency indicators", redFlagState(cv.redFlags.vbi), cv.redFlags.vbi.values.join(", "))}
                        {row("Upper cervical instability indicators", redFlagState(cv.redFlags.instability), cv.redFlags.instability.values.join(", "))}
                        {row("Other serious pathology", redFlagState(cv.redFlags.other), cv.redFlags.other.values.join(", "))}

                        {cervicalNotesLoading && (
                          <div style={{ fontSize:"0.73rem", color: PC.muted, marginTop:8, fontStyle:"italic" }}>
                            🔄 Checking free-text notes for anything not already captured…
                          </div>
                        )}
                        {!cervicalNotesLoading && cervicalNoteFindings.length > 0 && (
                          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${PC.border}` }}>
                            <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#7c3aed", marginBottom:5 }}>
                              Found in your notes (AI — merged into the variables above where a checkbox hadn't already answered that field)
                            </div>
                            {cervicalNoteFindings.map((f, fi) => (
                              <div key={fi} style={{ fontSize:"0.73rem", color: PC.text, marginBottom:4 }}>
                                <b>{f.variable}</b>: {f.value} <span style={{ color: PC.muted }}>— "{f.sourceQuote}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!cervicalNotesLoading && cervicalPendingRedFlagReview.length > 0 && (
                          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed #dc2626` }}>
                            <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", marginBottom:5 }}>
                              ⚠ Possible red-flag mentions in your notes — NOT auto-applied, please review the red flag screen above yourself
                            </div>
                            {cervicalPendingRedFlagReview.map((f, fi) => (
                              <div key={fi} style={{ fontSize:"0.73rem", color: PC.text, marginBottom:4 }}>
                                <b>{f.variable}</b>: {f.value} <span style={{ color: PC.muted }}>— "{f.sourceQuote}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0.5 (CERVICAL): REASONING ENGINE (Layer 3) ──
                       Exact mirror of the Lumbar Phase 0.5 block above,
                       reading cervicalReasoning / cervicalTestNav instead.
                       ── */}
                  {(REGION_FAMILY_KEY[r.region] || r.region) === "Cervical spine" && cervicalReasoning && (() => {
                    const cr = cervicalReasoning;
                    const tierColor = { "Strong match":"#dc2626", "Possible match":"#d97706", "Weak match":"#64748b", "Insufficient data":"#94a3b8", "Unlikely":"#cbd5e1" };
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:"4px solid #7c3aed" }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#7c3aed", marginBottom:8 }}>
                          Phase 0.5 — Cervical Condition Matches (C01–C11)
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Unweighted, count-based matches against all 11 cervical hypotheses — not a probability. Weighting is a deliberately deferred future step.
                        </div>

                        {cr.redFlagOverride.triggered && (
                          <div style={{ background:"#FEF2F2", border:"2px solid #dc2626", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                            <div style={{ fontWeight:800, color:"#dc2626", fontSize:"0.78rem", marginBottom:3 }}>
                              🚨 {cr.redFlagOverride.urgency === "EMERGENCY" ? "EMERGENCY — Myelopathy / VBI Indicators" : "URGENT REFERRAL INDICATED"}
                            </div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", marginBottom:3 }}>{cr.redFlagOverride.reason}</div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", fontWeight:600 }}>{cr.redFlagOverride.action}</div>
                          </div>
                        )}
                        {cr.redFlagOverride.urgency === "SCREEN_INCOMPLETE" && (
                          <div style={{ background:"#FFFBEB", border:"1px solid #d97706", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                            <div style={{ fontSize:"0.73rem", color:"#92400E" }}>⚠ {cr.redFlagOverride.action}</div>
                          </div>
                        )}

                        {cr.conditions.slice(0, 6).map((c, ci) => (
                          <div key={c.id} style={{
                            background: ci===0 ? "#7c3aed12" : PC.surface,
                            border: `1px solid ${ci===0 ? "#7c3aed44" : PC.border}`,
                            borderRadius:8, padding:"9px 12px", marginBottom:6,
                          }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                              <span style={{ fontSize:"0.8rem", fontWeight:700 }}>
                                {c.id} — {c.name}{c.lowConfidence ? " ⚠" : ""}
                              </span>
                              <span style={{ fontSize:"0.72rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                                background: tierColor[c.matchTier]+"18", color: tierColor[c.matchTier] }}>
                                {c.matchTier}
                              </span>
                            </div>
                            <div style={{ fontSize:"0.72rem", color: PC.muted }}>
                              {c.supportingMatched.length} supporting · {c.refutingMatched.length} refuting · {c.unknownCount} unknown
                              {c.note && <div style={{ marginTop:2, fontStyle:"italic" }}>{c.note}</div>}
                            </div>
                            {c.matchTier !== "Unlikely" && ((c.objectiveTests && (c.objectiveTests.required?.length > 0 || c.objectiveTests.recommended?.length > 0)) || spineAssessmentModules(c.id).length > 0) && (() => {
                              const priTests = [...(c.objectiveTests?.required || []), ...(c.objectiveTests?.recommended || [])];
                              const testFirst = new Set(priTests.map((t) => String(t).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]).filter(Boolean));
                              const layers = spineAssessmentModules(c.id).filter((m) => !REDUNDANT_LAYER_KEYS.has(m.key) && !testFirst.has(String(m.label).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]));
                              return (
                                <div style={{ marginTop:8, background:"#fff", border:"1px solid #ECE7F7", borderRadius:12, padding:"10px 12px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                                  <div style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color: tierColor[c.matchTier], marginBottom:6 }}>
                                    Objective assessment — for this condition (tap ? for why &amp; what it tells you)
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
                                    {priTests.map((t, ti) => {
                                      const target = cervicalTestNav(t);
                                      const btn = target
                                        ? { label:t, icon:target.icon, col:target.col, nav:target.nav, ctx:target.ctx, why:target.why }
                                        : { label:t, icon:"📋", col:PC.muted, nav:null, ctx:null, why:"No dedicated module for this test in the app yet -- shown for completeness, not clickable." };
                                      return <NavActionBtn key={"pri"+ti} btn={btn} onNav={onNav} PC={PC}/>;
                                    })}
                                    {layers.flatMap((m, mi) => layerNavButtons(m, mi, onNav, PC, REGION_FAMILY_KEY[r.region] || r.region))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0 (THORACIC): EXTRACTED CLINICAL VARIABLES ──
                       Exact mirror of the Lumbar/Cervical Phase 0 blocks above,
                       reading thoracicVariables instead. ── */}
                  {false && (REGION_FAMILY_KEY[r.region] || r.region) === "Thoracic spine" && thoracicVariables && (() => {
                    const tv = thoracicVariables;
                    const Chip = ({ state, children }) => (
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:4,
                        fontSize:"0.72rem", fontWeight:700, padding:"3px 9px", borderRadius:99,
                        background: state==="present" ? "#dc262618" : state==="absent" ? "#05966918" : "#94a3b818",
                        color: state==="present" ? "#dc2626" : state==="absent" ? "#059669" : "#64748b",
                        border: `1px solid ${state==="present" ? "#dc262644" : state==="absent" ? "#05966944" : "#94a3b844"}`,
                      }}>
                        {state==="present" ? "✓" : state==="absent" ? "—" : "?"} {children}
                      </span>
                    );
                    const row = (label, state, detail, fieldKey) => {
                      const aiFilled = fieldKey && thoracicAiFilledFields.includes(fieldKey);
                      return (
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                          <span style={{ fontSize:"0.74rem", color: PC.muted, minWidth:150 }}>{label}</span>
                          <Chip state={state}>{state==="unknown" ? "Not asked" : (detail || (state==="present"?"Yes":"No"))}</Chip>
                          {aiFilled && (
                            <span style={{
                              fontSize:"0.66rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                              background:"#7c3aed18", color:"#7c3aed", border:"1px solid #7c3aed44",
                            }}>
                              ✓ AI extracted
                            </span>
                          )}
                        </div>
                      );
                    };
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:`4px solid #0891b2` }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#0891b2", marginBottom:8 }}>
                          Phase 0 — Extracted Clinical Variables
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Read from the Subjective Assessment (checkboxes + notes, filled by hand or by AI) — this is the input the hypotheses below are built from
                        </div>

                        {row("Rotation aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.rotationAggravates?"present":"absent", undefined, "rotationAggravates")}
                        {row("Side bending aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.sideBendingAggravates?"present":"absent", undefined, "sideBendingAggravates")}
                        {row("Extension aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.extensionAggravates?"present":"absent", undefined, "extensionAggravates")}
                        {row("Flexion aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.flexionAggravates?"present":"absent", undefined, "flexionAggravates")}
                        {row("Cough/sneeze/laugh aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.coughSneezeLaughAggravates?"present":"absent", undefined, "coughSneezeLaughAggravates")}
                        {row("Deep breathing aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.breathingAggravates?"present":"absent", undefined, "breathingAggravates")}
                        {row("Reaching overhead aggravates", tv.aggravating.movements.state==="unknown"?"unknown":tv.aggravating.overheadReachingAggravates?"present":"absent", undefined, "overheadReachingAggravates")}
                        {row("Sustained posture aggravates", tv.aggravating.postures.state==="unknown"?"unknown":tv.aggravating.sustainedPostureAggravates?"present":"absent", undefined, "sustainedPostureAggravates")}
                        {row("Manipulation — significant relief", tv.relieving.treatments.state==="unknown"?"unknown":tv.relieving.manipulationSignificantRelief?"present":"absent", undefined, "manipulationSignificantRelief")}
                        {row("Mechanical pattern", tv.symptomBehaviour.pattern.state==="unknown"?"unknown":tv.symptomBehaviour.mechanicalPattern?"present":"absent", undefined, "mechanicalPattern")}
                        {row("Constant, unaffected pattern", tv.symptomBehaviour.pattern.state==="unknown"?"unknown":tv.symptomBehaviour.constantUnaffectedPattern?"present":"absent", undefined, "constantUnaffectedPattern")}
                        {row("Breathing-related pattern", tv.symptomBehaviour.pattern.state==="unknown"?"unknown":tv.symptomBehaviour.breathingRelatedPattern?"present":"absent", undefined, "breathingRelatedPattern")}
                        {row("Morning stiffness / inflammatory pattern", tv.symptomBehaviour.pattern.state==="unknown"?"unknown":tv.symptomBehaviour.morningStiffness?"present":"absent", undefined, "morningStiffness")}
                        {row("Costovertebral-pattern location", tv.location.primaryLocation.state==="unknown"?"unknown":tv.location.costovertebralLocation?"present":"absent", undefined, "costovertebralLocation")}
                        {row("Interscapular referral", tv.location.primaryLocation.state==="unknown"?"unknown":tv.location.interscapularLocation?"present":"absent")}
                        {row("Cardiac-like radiation (urgent flag)", tv.location.radiation.state==="unknown"?"unknown":tv.location.cardiacLikeRadiation?"present":"absent")}
                        {row("Traumatic mechanism", tv.mechanism.type.state==="unknown"?"unknown":tv.mechanism.traumaticMechanism?"present":"absent")}
                        {row("Insidious, postural onset", tv.mechanism.type.state==="unknown"?"unknown":tv.mechanism.insidiousPosturalOnset?"present":"absent")}
                        {row("Post-viral costochondritis history", tv.mechanism.type.state==="unknown"?"unknown":tv.mechanism.postViralCostochondritis?"present":"absent")}

                        <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", margin:"10px 0 5px" }}>Red flag screen (mandatory — single combined checklist, Magee Table 8-1)</div>
                        {row("Red flag screen answered", tv.redFlags.screen.state, tv.redFlags.screen.values.join(", "))}
                        {row("Cardiac indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.cardiac?"present":"absent")}
                        {row("Respiratory indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.respiratory?"present":"absent")}
                        {row("Visceral/GI indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.visceral?"present":"absent")}
                        {row("Oncologic indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.oncologic?"present":"absent")}
                        {row("Infection indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.infection?"present":"absent")}
                        {row("Fracture-risk indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.fracture?"present":"absent")}
                        {row("Cord compression indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.cordCompression?"present":"absent")}
                        {row("General serious-pathology indicators", tv.redFlags.screen.state==="unknown"?"unknown":tv.redFlags.generalSerious?"present":"absent")}

                        {thoracicNotesLoading && (
                          <div style={{ fontSize:"0.73rem", color: PC.muted, marginTop:8, fontStyle:"italic" }}>
                            🔄 Checking free-text notes for anything not already captured…
                          </div>
                        )}
                        {!thoracicNotesLoading && thoracicNoteFindings.length > 0 && (
                          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${PC.border}` }}>
                            <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#7c3aed", marginBottom:5 }}>
                              Found in your notes (AI — merged into the variables above where a checkbox hadn't already answered that field)
                            </div>
                            {thoracicNoteFindings.map((f, fi) => (
                              <div key={fi} style={{ fontSize:"0.73rem", color: PC.text, marginBottom:4 }}>
                                <b>{f.variable}</b>: {f.value} <span style={{ color: PC.muted }}>— "{f.sourceQuote}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!thoracicNotesLoading && thoracicPendingRedFlagReview.length > 0 && (
                          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed #dc2626` }}>
                            <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", marginBottom:5 }}>
                              ⚠ Possible red-flag mentions in your notes — NOT auto-applied, please review the red flag screen above yourself
                            </div>
                            {thoracicPendingRedFlagReview.map((f, fi) => (
                              <div key={fi} style={{ fontSize:"0.73rem", color: PC.text, marginBottom:4 }}>
                                <b>{f.variable}</b>: {f.value} <span style={{ color: PC.muted }}>— "{f.sourceQuote}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0.5 (THORACIC): REASONING ENGINE (Layer 3) ──
                       Exact mirror of the Lumbar/Cervical Phase 0.5 blocks
                       above, reading thoracicReasoning / thoracicTestNav
                       instead. T11's override treats cardiac, respiratory,
                       AND cord-compression as EMERGENCY (not just one
                       category, unlike L11/C11) -- Magee Table 8-1 lists
                       MI, PE, and pneumothorax side-by-side as equally
                       immediate-danger presentations. ── */}
                  {(REGION_FAMILY_KEY[r.region] || r.region) === "Thoracic spine" && thoracicReasoning && (() => {
                    const tr = thoracicReasoning;
                    const tierColor = { "Strong match":"#dc2626", "Possible match":"#d97706", "Weak match":"#64748b", "Insufficient data":"#94a3b8", "Unlikely":"#cbd5e1" };
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:"4px solid #7c3aed" }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#7c3aed", marginBottom:8 }}>
                          Phase 0.5 — Thoracic Condition Matches (T01–T11)
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Unweighted, count-based matches against all 11 thoracic hypotheses — not a probability. Weighting is a deliberately deferred future step.
                        </div>

                        {tr.redFlagOverride.triggered && (
                          <div style={{ background:"#FEF2F2", border:"2px solid #dc2626", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                            <div style={{ fontWeight:800, color:"#dc2626", fontSize:"0.78rem", marginBottom:3 }}>
                              🚨 {tr.redFlagOverride.urgency === "EMERGENCY" ? "EMERGENCY — Cardiac / Respiratory / Cord Compression Indicators" : "URGENT REFERRAL INDICATED"}
                            </div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", marginBottom:3 }}>{tr.redFlagOverride.reason}</div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", fontWeight:600 }}>{tr.redFlagOverride.action}</div>
                          </div>
                        )}
                        {tr.redFlagOverride.urgency === "SCREEN_INCOMPLETE" && (
                          <div style={{ background:"#FFFBEB", border:"1px solid #d97706", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                            <div style={{ fontSize:"0.73rem", color:"#92400E" }}>⚠ {tr.redFlagOverride.action}</div>
                          </div>
                        )}

                        {tr.conditions.slice(0, 6).map((c, ci) => (
                          <div key={c.id} style={{
                            background: ci===0 ? "#7c3aed12" : PC.surface,
                            border: `1px solid ${ci===0 ? "#7c3aed44" : PC.border}`,
                            borderRadius:8, padding:"9px 12px", marginBottom:6,
                          }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                              <span style={{ fontSize:"0.8rem", fontWeight:700 }}>
                                {c.id} — {c.name}{c.lowConfidence ? " ⚠" : ""}
                              </span>
                              <span style={{ fontSize:"0.72rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                                background: tierColor[c.matchTier]+"18", color: tierColor[c.matchTier] }}>
                                {c.matchTier}
                              </span>
                            </div>
                            <div style={{ fontSize:"0.72rem", color: PC.muted }}>
                              {c.supportingMatched.length} supporting · {c.refutingMatched.length} refuting · {c.unknownCount} unknown
                              {c.note && <div style={{ marginTop:2, fontStyle:"italic" }}>{c.note}</div>}
                            </div>
                            {c.matchTier !== "Unlikely" && ((c.objectiveTests && (c.objectiveTests.required?.length > 0 || c.objectiveTests.recommended?.length > 0)) || spineAssessmentModules(c.id).length > 0) && (() => {
                              const priTests = [...(c.objectiveTests?.required || []), ...(c.objectiveTests?.recommended || [])];
                              const testFirst = new Set(priTests.map((t) => String(t).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]).filter(Boolean));
                              const layers = spineAssessmentModules(c.id).filter((m) => !REDUNDANT_LAYER_KEYS.has(m.key) && !testFirst.has(String(m.label).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]));
                              return (
                                <div style={{ marginTop:8, background:"#fff", border:"1px solid #ECE7F7", borderRadius:12, padding:"10px 12px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                                  <div style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color: tierColor[c.matchTier], marginBottom:6 }}>
                                    Objective assessment — for this condition (tap ? for why &amp; what it tells you)
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
                                    {priTests.map((t, ti) => {
                                      const target = thoracicTestNav(t);
                                      const btn = target
                                        ? { label:t, icon:target.icon, col:target.col, nav:target.nav, ctx:target.ctx, why:target.why }
                                        : { label:t, icon:"📋", col:PC.muted, nav:null, ctx:null, why:"No dedicated module for this test in the app yet -- shown for completeness, not clickable." };
                                      return <NavActionBtn key={"pri"+ti} btn={btn} onNav={onNav} PC={PC}/>;
                                    })}
                                    {layers.flatMap((m, mi) => layerNavButtons(m, mi, onNav, PC, REGION_FAMILY_KEY[r.region] || r.region))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0 (SHOULDER): EXTRACTED CLINICAL VARIABLES ──
                       Shoulder has no dedicated structured subjective module
                       (unlike Lumbar/Cervical/Thoracic's lx_, cx_, tx_ prefixed
                       checklists) -- its signals come from the free-text
                       chief complaint (cc_main) plus cc_onset/red-flag
                       checklists, read via the same normalizeFromData() the
                       reasoningEngine itself uses (negation-safe). Because a
                       keyword search over free text can only ever return
                       true/false, NOT a genuine tri-state "not asked" the
                       way a checkbox can, this card is honest about that --
                       two states only (Found / Not mentioned), not three. ── */}
                  {false && (r.region === "Shoulder (L)" || r.region === "Shoulder (R)") && shoulderReasoning && (() => {
                    const sv = shoulderReasoning.subjective;
                    const Chip = ({ found, children }) => (
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:4,
                        fontSize:"0.72rem", fontWeight:700, padding:"3px 9px", borderRadius:99,
                        background: found ? "#dc262618" : "#94a3b818",
                        color: found ? "#dc2626" : "#64748b",
                        border: `1px solid ${found ? "#dc262644" : "#94a3b844"}`,
                      }}>
                        {found ? "✓" : "—"} {children}
                      </span>
                    );
                    const row = (label, found) => (
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
                        <span style={{ fontSize:"0.74rem", color: PC.muted, minWidth:150 }}>{label}</span>
                        <Chip found={found}>{found ? "Found in your notes" : "Not mentioned"}</Chip>
                      </div>
                    );
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:`4px solid #0891b2` }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#0891b2", marginBottom:8 }}>
                          Phase 0 — Extracted Clinical Variables
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Read from the chief complaint / onset / red-flag text — negation-safe (e.g. "no night pain" is correctly read as absent). "Not mentioned" means either genuinely absent or simply not yet typed; unlike the checkbox-based regions, free text can't distinguish the two.
                        </div>

                        {row("Night pain", sv.nightPain)}
                        {row("Constant pain", sv.constantPain)}
                        {row("Eases with rest", sv.easesWithRest)}
                        {row("Paraesthesia / tingling", sv.paresthesia)}
                        {row("Radiation below elbow (cervical concern)", sv.radiationBelowElbow)}
                        {row("Traumatic onset", sv.onsetTraumatic)}
                        {row("Insidious onset", sv.onsetInsidious)}
                        {row("Overhead activity aggravates", sv.overheadAggravation)}
                        {row("Progressive global stiffness", sv.progressiveStiffness)}
                        {row("Age 50+ (degenerative risk factor)", sv.ageOver50)}

                        <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#dc2626", margin:"10px 0 5px" }}>Red flag screen (mandatory)</div>
                        {row("Suspected fracture / unreduced dislocation", sv.traumaHistory)}
                        {row("Unexplained weight loss", sv.unexplainedWeightLoss)}
                        {row("Systemic illness signs", sv.systemicIllness)}
                        {row("Cancer history", sv.malignancyHistory)}
                        {row("Unrelieved night pain (malignancy pattern)", sv.nightPainUnrelieved)}
                        {row("Hot, swollen joint (septic joint)", sv.hotSwollenJoint)}
                        {row("Vascular compromise signs", sv.vascularCompromiseSigns)}
                        {row("Cervical myelopathy signs", sv.myelopathySigns)}
                        {row("Cardiac / respiratory / abdominal referral pattern", sv.thoracicCardiacSymptoms || sv.thoracicCardiacLikeRadiation || sv.thoracicRespiratorySymptoms || sv.thoracicAbdominalSymptoms)}
                      </div>
                    );
                  })()}

                  {/* ── PHASE 0.5 (SHOULDER): REASONING ENGINE ──
                       Same visual card as Lumbar/Cervical/Thoracic's Phase
                       0.5, but the scoring underneath is the EXISTING,
                       already-tested Shoulder reasoningEngine (src/
                       reasoningEngine/), reused via shoulderPhase05.js's
                       adapter -- not a rebuilt/duplicated clinical model.
                       See that file's header comment for exactly what the
                       adapter does and does not do. ── */}
                  {(r.region === "Shoulder (L)" || r.region === "Shoulder (R)") && shoulderReasoning && (() => {
                    const sr = shoulderReasoning;
                    const tierColor = { "Strong match":"#dc2626", "Possible match":"#d97706", "Weak match":"#64748b", "Insufficient data":"#94a3b8", "Unlikely":"#cbd5e1" };
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", borderLeft:"4px solid #7c3aed" }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase",
                          letterSpacing:1.5, color:"#7c3aed", marginBottom:8 }}>
                          Phase 0.5 — Shoulder Condition Matches (SH01–SH10)
                        </div>
                        <div style={{ fontSize:"0.74rem", color: PC.muted, marginBottom:10, fontStyle:"italic" }}>
                          Deterministic, weighted matches against all 10 shoulder differentials (JOSPT/APTA CPG, Magee, Dutton, McGee) — same engine that powers "Suggest Probable Diagnosis" in SOAP Notes, run here off Subjective data only to guide the objective exam.
                        </div>

                        {sr.redFlagOverride.triggered && (
                          <div style={{ background:"#FEF2F2", border:"2px solid #dc2626", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                            <div style={{ fontWeight:800, color:"#dc2626", fontSize:"0.78rem", marginBottom:3 }}>
                              🚨 {sr.redFlagOverride.urgency === "EMERGENCY" ? "EMERGENCY — Urgent Indicators" : "URGENT REFERRAL INDICATED"}
                            </div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", marginBottom:3 }}>{sr.redFlagOverride.reason}</div>
                            <div style={{ fontSize:"0.73rem", color:"#991B1B", fontWeight:600 }}>{sr.redFlagOverride.action}</div>
                          </div>
                        )}

                        {sr.conditions.length === 0 && !sr.redFlagOverride.triggered && (
                          <div style={{ fontSize:"0.74rem", color: PC.muted, fontStyle:"italic" }}>Insufficient data — complete the Subjective assessment first.</div>
                        )}

                        {sr.conditions.slice(0, 6).map((c, ci) => (
                          <div key={c.id} style={{
                            background: ci===0 ? "#7c3aed12" : PC.surface,
                            border: `1px solid ${ci===0 ? "#7c3aed44" : PC.border}`,
                            borderRadius:8, padding:"9px 12px", marginBottom:6,
                          }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                              <span style={{ fontSize:"0.8rem", fontWeight:700 }}>
                                {c.id} — {c.name}
                              </span>
                              <span style={{ fontSize:"0.72rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
                                background: tierColor[c.matchTier]+"18", color: tierColor[c.matchTier] }}>
                                {c.matchTier}
                              </span>
                            </div>
                            <div style={{ fontSize:"0.72rem", color: PC.muted }}>
                              {c.supportingMatched.length} supporting · {c.refutingMatched.length} refuting · {c.unknownCount} not yet tested
                              {c.note && <div style={{ marginTop:2, fontStyle:"italic" }}>{c.note}</div>}
                            </div>
                            {c.matchTier !== "Unlikely" && ((c.objectiveTests && (c.objectiveTests.required?.length > 0 || c.objectiveTests.recommended?.length > 0)) || c.assessmentModules.length > 0) && (() => {
                              const priTests = [...(c.objectiveTests?.required || []), ...(c.objectiveTests?.recommended || [])];
                              const testFirst = new Set(priTests.map((t) => String(t).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]).filter(Boolean));
                              const layers = c.assessmentModules.filter((m) => !REDUNDANT_LAYER_KEYS.has(m.key) && !testFirst.has(String(m.label).toLowerCase().replace(/[^a-z]+/g," ").trim().split(" ")[0]));
                              return (
                                <div style={{ marginTop:8, background:"#fff", border:"1px solid #ECE7F7", borderRadius:12, padding:"10px 12px", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                                  <div style={{ fontSize:"0.68rem", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color: tierColor[c.matchTier], marginBottom:6 }}>
                                    Objective assessment — for this condition (tap ? for why &amp; what it tells you)
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:8 }}>
                                    {priTests.map((t, ti) => {
                                      const target = shoulderTestNav(t);
                                      const btn = target
                                        ? { label:t, icon:target.icon, col:target.col, nav:target.nav, ctx:target.ctx, why:target.why }
                                        : { label:t, icon:"📋", col:PC.muted, nav:null, ctx:null, why:"No dedicated module for this test in the app yet -- shown for completeness, not clickable." };
                                      return <NavActionBtn key={"pri"+ti} btn={btn} onNav={onNav} PC={PC}/>;
                                    })}
                                    {layers.flatMap((m, mi) => layerNavButtons(m, mi, onNav, PC, REGION_FAMILY_KEY[r.region] || r.region))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {["Hip / Groin","Knee (L)","Knee (R)","Ankle / Foot","Elbow/Wrist/Hand"].includes(REGION_FAMILY_KEY[r.region] || r.region) && (() => {
                    const gp = runGenericPhase05(data, REGION_FAMILY_KEY[r.region] || r.region);
                    if (!gp) return null;
                    const tierColor = { "Strong match":"#dc2626", "Possible match":"#d97706", "Weak match":"#64748b", "Insufficient data":"#94a3b8", "Unlikely":"#cbd5e1" };
                    if (gp.stopped) {
                      return (
                        <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
                          <div style={{ fontSize:"0.8rem", fontWeight:800, color:"#991B1B" }}>Red flag screen positive — condition matches withheld</div>
                          <div style={{ fontSize:"0.75rem", color:"#7F1D1D", marginTop:4 }}>Address the red flag(s) before relying on a differential.</div>
                        </div>
                      );
                    }
                    if (!gp.conditions.length) return null;
                    const famLabel = REGION_FAMILY_KEY[r.region] || r.region;
                    return (
                      <div style={{ background: PC.s2, borderRadius:10, padding:"12px 14px", marginBottom:12, borderLeft:`4px solid ${regCol}` }}>
                        <div style={{ fontSize:"0.8rem", fontWeight:800, textTransform:"uppercase", letterSpacing:1.2, color: regCol, marginBottom:4 }}>
                          💡 Phase 0.5 — {famLabel} condition matches (ranked)
                        </div>
                        <div style={{ fontSize:"0.72rem", color:PC.muted, fontStyle:"italic", marginBottom:8 }}>
                          Deterministic matches against the {famLabel} differentials, run off subjective data to guide the objective exam.
                        </div>
                        {gp.conditions.slice(0,6).map((c, ci) => (
                          <GenericConditionCard key={c.id} c={c} ci={ci} regCol={regCol} tierColor={tierColor} onNav={onNav} PC={PC} family={REGION_FAMILY_KEY[r.region] || r.region} />
                        ))}
                      </div>
                    );
                  })()}

                </div>{/* end padding wrapper */}
              </div>
            );
          })}

          {/* ── KINETIC CHAIN / CROSS-REGION ── */}
          {insight.cross && insight.cross.length > 0 && (
            <div style={{ background: PC.surface, borderRadius:12, padding:"14px 16px",
              border:`1px solid ${PC.accent}33` }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase",
                letterSpacing:1.2, color: PC.accent, marginBottom:12 }}>
                🔗 Kinetic Chain & Cross-Region Analysis — {insight.cross.length} interactions
              </div>
              {insight.cross.map((cf, i) => (
                <div key={i} style={{ marginBottom:12, paddingBottom:12,
                  borderBottom: i < insight.cross.length-1 ? `1px solid ${PC.border}` : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <span style={{ fontSize:"0.78rem", fontWeight:700, padding:"2px 8px",
                      borderRadius:99,
                      background: cf.type.includes("flag") ? PC.red+"12" : cf.type==="Differential" ? PC.accent+"12" : PC.s3,
                      color: cf.type.includes("flag") ? PC.red : cf.type==="Differential" ? PC.accent : PC.muted,
                      border:`1px solid ${cf.type.includes("flag") ? PC.red+"33" : cf.type==="Differential" ? PC.accent+"33" : PC.border}` }}>
                      {cf.type}
                    </span>
                    <span style={{ fontSize:"0.76rem", fontWeight:700, color: PC.text }}>
                      {cf.title}
                    </span>
                  </div>
                  <div style={{ fontSize:"0.8rem", color: PC.muted, lineHeight:1.55, marginBottom:4 }}>
                    {cf.detail}
                  </div>
                  <div style={{ fontSize:"0.8rem", color: PC.accent, fontStyle:"italic", opacity:0.7 }}>
                    Ref: {cf.refs}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SUMMARY FOOTER ── */}
          <div style={{ background: PC.green+"08", border:`1px solid ${PC.green}33`,
            borderRadius:12, padding:"12px 16px" }}>
            <div style={{ fontSize:"0.75rem", fontWeight:700, textTransform:"uppercase",
              letterSpacing:1, color: PC.green, marginBottom:8 }}>
              Clinical Summary
            </div>
            <div style={{ fontSize:"0.74rem", color: PC.text, lineHeight:1.7 }}>
              {insight.regionResults.length} region{insight.regionResults.length>1?"s":""} assessed.{" "}
              {insight.anyUrgent && (
                <span style={{ color: PC.red, fontWeight:700 }}>
                  ⚠ Urgent flags present — do not defer.{" "}
                </span>
              )}
              {insight.cross && insight.cross.length > 0 &&
                `${insight.cross.length} kinetic chain interaction${insight.cross.length>1?"s":""} identified. `}
              {selectedRegions.length >= 3 &&
                <span style={{ color: PC.yellow }}>Multi-region — nociplastic screening recommended (CSI ≥40, PCS-13, TSK-11).</span>}
            </div>
            <div style={{ fontSize:"0.78rem", color: PC.muted, marginTop:8,
              borderTop:`1px solid ${PC.green}22`, paddingTop:6, fontStyle:"italic" }}>
              Engine v6 · 7-Phase Clinical Reasoning · Evidence base:
              Magee(7th) · Petty(5th) · Maitland(8th) · Sahrmann · Butler · McKenzie · Brukner & Khan(5th) · Cook & Purdam · Moseley & Butler · Hides · Richardson & Hodges · NICE NG59 · ASAS · Woolf(IASP 2017)
            </div>
          </div>
        </div>
        ); })()}
      </>)}

      {/* ── Saved confirmation toast ── */}
      {showSavedToast && (
        <div style={{
          position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)",
          background:"#059669", color:"#fff",
          padding:"10px 22px", borderRadius:50,
          fontSize:"0.88rem", fontWeight:700,
          boxShadow:"0 4px 20px rgba(5,150,105,0.35)",
          zIndex:9999, display:"flex", alignItems:"center", gap:8,
          animation:"fadeUp 0.25s ease",
          pointerEvents:"none",
        }}>
          <span style={{fontSize:"1rem"}}>✓</span> Assessment saved
        </div>
      )}
    </div>
  );
}






// ─── MAIN FMA SECTION ─────────────────────────────────────────────────────────
const FMS_STORAGE_KEY2="fms_clinical_v1";
function loadFMSReport(){try{return JSON.parse(localStorage.getItem(FMS_STORAGE_KEY2)||"{}");}catch{return{};}}
function saveFMSReport(r){try{localStorage.setItem(FMS_STORAGE_KEY2,JSON.stringify(r));}catch{}}


// ─── DIAGNOSIS ENGINE ────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════════
// GAIT ANALYSIS MODULE
// ═══════════════════════════════════════════════════════════════════════════════


export { SpecialTestsSection, SubjectiveModule, NKTSection, KineticChainSection, FMASection, FasciaSection, NKT_REGIONS, KC_REGIONS, UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S, runEngineV6, ErgoModule, CyriaxModule, CyriaxRegionTests, CYRIAX_REGIONS_DATA, generateDiagnosis, PDF_BASE_STYLES, makePDFPage, MOVEMENTS, downloadPDFFromHTML, SPECIAL_TESTS_DATA, REGION_NAV, REGION_FAMILY_KEY, RC_S, lumbarTestNav, cervicalTestNav, thoracicTestNav, SmallClinicalImg, FunctionalScreenHub };

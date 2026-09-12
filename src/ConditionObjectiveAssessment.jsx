// ConditionObjectiveAssessment.jsx
//
// Standalone, condition-wise Objective Assessment page for the AI Outpatient
// Ortho wizard — a faithful clone of the claude.ai artifact prototypes
// (Cervical/Thoracic/Lumbar/Shoulder/Hip/Knee/Ankle-Foot). NOT a rendering
// of the app's existing ROM/MMT/Special Tests/Cyriax/NKT modules — those
// stay completely untouched; this is new, self-contained UI.
//
// The one thing it reuses from the rest of the app is the front door: which
// condition is ranked top for whichever region was picked in Subjective
// comes from the real Phase 0.5 differential the app already runs. Beyond
// that, every module/chip/field is this page's own state, written into its
// own data.conditionAssessment_<region> section via the same useSectionData
// pattern every other wizard step already uses.
//
// Two data schemas coexist here, by design:
//   - "v2" (Cervical/Thoracic/Lumbar/Shoulder): backed by
//     cervicalConditions.json / thoracicConditions.json / lumbarConditions.json
//     / shoulderConditions.json — a clean, uniform, PDF-verbatim data package
//     (physiom-integration-package.md) another session produced and verified.
//     sttt.resisted/passive, cpa.muscles, kineticChain.fields,
//     functionalScreen.fields are all arrays (arbitrary length/shape), and
//     sttt.findings/interpretation are STATIC authored reference text for
//     that diagnosis, not derived from what's tapped. "Doesn't apply" is
//     always {applicable:false, reason}.
//   - "v1" (Hip/Knee/Ankle-Foot): my own earlier, bespoke data files
//     (hip/knee/ankleFootConditionAssessmentData.js), sourced from the same
//     PDF + the app's real evidence.json files, kept as-is — reshaping 33
//     already-verified conditions into v2's shape for no functional gain
//     wasn't worth the risk of introducing transcription errors.
//
// Shoulder has one real wrinkle: its live reasoning engine (shoulderPhase05.js,
// reading shoulder.evidence.json) generates ids SH01..SH10, but
// shoulderConditions.json uses S01..S10. The condition NAMES match 1:1, so
// the "front door" ranking is bridged by normalized name, not id (see
// `matchByName` below) — shoulderPhase05.js itself is untouched.
import React, { useEffect, useMemo, useState } from "react";
import { BRAND, useSectionData, Stepper, Segmented, InfoButton } from "./orthoFieldKit.jsx";
import { RESTRICTION_GRADE, spineRegionData, ROM_DATA, SPECIAL_TESTS_DATA } from "./orthoClinicalData.js";
import { romRichItem, specialRichItem } from "./orthoRegionAssessments.jsx";
import { runCervicalDifferential, hasCervicalChecklistData } from "./orthoCervicalReasoning.js";
import { runThoracicDifferential, hasThoracicChecklistData } from "./orthoThoracicReasoning.js";
import { runLumbarDifferential, hasLumbarChecklistData } from "./orthoLumbarReasoning.js";
import { runShoulderDifferential, hasShoulderChecklistData } from "./orthoShoulderReasoning.js";
import { runHipDifferential, hasHipChecklistData } from "./orthoHipReasoning.js";
import { runKneeDifferential, hasKneeChecklistData } from "./orthoKneeReasoning.js";
import { runAnkleFootDifferential, hasAnkleFootChecklistData } from "./orthoAnkleFootReasoning.js";
import { runElbowWristHandDifferential, hasElbowWristHandChecklistData } from "./orthoElbowWristHandReasoning.js";
import cervicalConditionsRaw from "./cervicalConditions.json";
import thoracicConditionsRaw from "./thoracicConditions.json";
import lumbarConditionsRaw from "./lumbarConditions.json";
import shoulderConditionsRaw from "./shoulderConditions.json";
import hipConditionsRaw from "./hipConditions.json";
import kneeConditionsRaw from "./kneeConditions.json";
import ankleFootConditionsRaw from "./ankleFootConditions.json";
import elbowWristHandConditionsRaw from "./elbowWristHandConditions.json";
import { HIP_ROM_MOVEMENTS } from "./hipConditionAssessmentData.js";
import { KNEE_ROM_MOVEMENTS } from "./kneeConditionAssessmentData.js";
import { ANKLE_FOOT_ROM_MOVEMENTS } from "./ankleFootConditionAssessmentData.js";
import { MEASURES, matchMeasureIdForInstrument } from "./orthoOutcomeMeasureData.js";

const HAIRLINE = "#E5E7EB";

// Drop the hard-override red-flag entry (C11/T11/L11) from the tappable
// condition set — same treatment as before, that condition is handled by
// the live red-flag banner (from the real reasoning engine), not a module
// card. Shoulder has no red-flag entry in its evidence model.
function loadConditions(raw, excludeId) {
  const order = Object.keys(raw).filter((id) => id !== excludeId);
  return { conditions: raw, order };
}
const { conditions: CERVICAL_CONDITIONS, order: CERVICAL_CONDITION_ORDER } = loadConditions(cervicalConditionsRaw, "C11");
const { conditions: THORACIC_CONDITIONS, order: THORACIC_CONDITION_ORDER } = loadConditions(thoracicConditionsRaw, "T11");
const { conditions: LUMBAR_CONDITIONS, order: LUMBAR_CONDITION_ORDER } = loadConditions(lumbarConditionsRaw, "L11");
const { conditions: SHOULDER_CONDITIONS, order: SHOULDER_CONDITION_ORDER } = loadConditions(shoulderConditionsRaw, null);
const { conditions: HIP_CONDITIONS, order: HIP_CONDITION_ORDER } = loadConditions(hipConditionsRaw, null);
const { conditions: KNEE_CONDITIONS, order: KNEE_CONDITION_ORDER } = loadConditions(kneeConditionsRaw, null);
const { conditions: ANKLE_FOOT_CONDITIONS, order: ANKLE_FOOT_CONDITION_ORDER } = loadConditions(ankleFootConditionsRaw, null);
const { conditions: ELBOW_WRIST_HAND_CONDITIONS, order: ELBOW_WRIST_HAND_CONDITION_ORDER } = loadConditions(elbowWristHandConditionsRaw, null);

// Real AROM movements + normal-value degrees, same sourcing as Hip/Knee/
// Ankle-Foot's (PatientDatabase.jsx's own ROM lookup / the app's real ROM
// module) — not invented.
const CERVICAL_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 80 }, { id: "ext", label: "Extension", normal: 70 },
  { id: "latl", label: "Side Flex Left", normal: 45 }, { id: "latr", label: "Side Flex Right", normal: 45 },
  { id: "rotl", label: "Rotation Left", normal: 80 }, { id: "rotr", label: "Rotation Right", normal: 80 },
];
const THORACIC_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 50 }, { id: "ext", label: "Extension", normal: 25 },
  { id: "rotl", label: "Rotation Left", normal: 35 }, { id: "rotr", label: "Rotation Right", normal: 35 },
];
const LUMBAR_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 60 }, { id: "ext", label: "Extension", normal: 25 },
  { id: "latl", label: "Lateral Flexion Left", normal: 25 }, { id: "latr", label: "Lateral Flexion Right", normal: 25 },
  { id: "rotl", label: "Rotation Left", normal: 30 }, { id: "rotr", label: "Rotation Right", normal: 30 },
];
const SHOULDER_ROM_MOVEMENTS = [
  { id: "flex", label: "Flexion", normal: 180 }, { id: "abd", label: "Abduction", normal: 180 },
  { id: "er", label: "External Rotation", normal: 90 }, { id: "ir", label: "Internal Rotation", normal: 70 },
];
const ELBOW_WRIST_HAND_ROM_MOVEMENTS = [
  { id: "eflex", label: "Elbow Flexion", normal: 145 }, { id: "eext", label: "Elbow Extension", normal: 0 },
  { id: "esup", label: "Supination", normal: 90 }, { id: "epro", label: "Pronation", normal: 90 },
  { id: "wflex", label: "Wrist Flexion", normal: 80 }, { id: "wext", label: "Wrist Extension", normal: 70 },
  { id: "wrad", label: "Radial Deviation", normal: 20 }, { id: "wuln", label: "Ulnar Deviation", normal: 30 },
];

// Real Cloudinary reference photos for ROM/Special Tests already exist,
// keyed by id, in the app's own ROM_DATA/SPECIAL_TESTS_DATA (shared with
// the real ROM/MMT/Special Tests screens in orthoRegionAssessments.jsx --
// see romRichItem/specialRichItem there) -- 2026-09-11, Aditi: "put the
// images of ROM and special test... I have already put images in that
// section." This page's own ROM_MOVEMENTS arrays use their own short ids
// (not always identical to ROM_DATA's), so ROM_ID_TO_DATA_ID bridges them;
// Hip/Knee/Ankle-Foot/Elbow-Wrist-Hand happen to already share ids 1:1.
// Regions/movements with no photo on file just fall back to a plain icon
// tile (InfoButton's own fallbackIcon) -- no fabricated images.
const ROM_DATA_BUCKET = { cervical: "Cervical", thoracic: "Thoracic", lumbar: "Lumbar", shoulder: "Shoulder", hip: "Hip", knee: "Knee", ankleFoot: null, elbowWristHand: null };
const ROM_ID_TO_DATA_ID = {
  cervical: { flex: "rom_cflex", ext: "rom_cext", latl: "rom_clatl", latr: "rom_clatr", rotl: "rom_crotl", rotr: "rom_crotr" },
  thoracic: { flex: "rom_thflex", ext: "rom_thext", rotl: "rom_throtl", rotr: "rom_throtr" },
  lumbar: { flex: "rom_lflex", ext: "rom_lext", latl: "rom_llfl", latr: "rom_llfr", rotl: "rom_lrotl", rotr: "rom_lrotr" },
  shoulder: { flex: "rom_sflex", abd: "rom_sabd", er: "rom_ser", ir: "rom_sir" },
  hip: { hflex: "rom_hflex", hext: "rom_hext", habd: "rom_habd", hadd: "rom_hadd", her: "rom_her", hir: "rom_hir" },
  knee: { kflex: "rom_kflex", kext: "rom_kext" },
  ankleFoot: {}, // Ankle/Foot ROM_DATA is split across two buckets ("Ankle"/"Foot") this page doesn't currently disambiguate -- falls back to icon rather than guess wrong.
  elbowWristHand: { eflex: "rom_eflex", eext: "rom_eext", esup: "rom_esup", epro: "rom_epro", wflex: "rom_wflex", wext: "rom_wext", wrad: "rom_wrad", wuln: "rom_wuln" },
};
function romRichItemFor(regionKey, movementId) {
  const bucket = ROM_DATA_BUCKET[regionKey];
  const dataId = ROM_ID_TO_DATA_ID[regionKey]?.[movementId];
  if (!bucket || !dataId) return null;
  const entry = (ROM_DATA[bucket] || []).find((e) => e.id === dataId);
  return entry ? romRichItem(entry) : null;
}

// Special Tests library only has a shared photo bucket for these 6 regions
// (SPECIAL_TESTS_DATA has no Ankle-Foot/Elbow-Wrist-Hand entries) --
// matched by normalized test name since the condition library's own test
// names are free text, not ids. No match just falls back to a plain icon.
const SPECIAL_TEST_DATA_BUCKET = { cervical: "cervical", thoracic: "thoracic", lumbar: "lumbar", shoulder: "shoulder", hip: "hip", knee: "knee", ankleFoot: null, elbowWristHand: null };
function specialRichItemFor(regionKey, testName) {
  const bucket = SPECIAL_TEST_DATA_BUCKET[regionKey];
  if (!bucket) return null;
  const target = normalizeName(testName);
  const entry = (SPECIAL_TESTS_DATA[bucket]?.tests || []).find((t) => normalizeName(t.label) === target);
  return entry ? specialRichItem(entry) : null;
}

function normalizeName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function idByName(conditions) {
  return Object.fromEntries(Object.values(conditions).map((c) => [normalizeName(c.name), c.id]));
}
// Several live reasoning engines emit their own ids (SH0x, HP0x, KN0x, AK0x/
// FT0x) that don't match the condition-library JSON's ids (S0x, H0x, K0x,
// AF0x) — but the condition NAMES match 1:1 in every case, so each of these
// regions bridges engine id -> library id by normalized name.
const SHOULDER_ID_BY_NAME = idByName(SHOULDER_CONDITIONS);
const HIP_ID_BY_NAME = idByName(HIP_CONDITIONS);
const KNEE_ID_BY_NAME = idByName(KNEE_CONDITIONS);
const ANKLE_FOOT_ID_BY_NAME = idByName(ANKLE_FOOT_CONDITIONS);
// The Elbow/Wrist/Hand engine's own diagnosis names lack the library's
// "(Wrist model)"/"(Hand model)" disambiguation suffix on its two "trigger
// finger" entries — added explicitly since automatic name-matching would
// otherwise miss both.
const ELBOW_WRIST_HAND_ID_BY_NAME = {
  ...idByName(ELBOW_WRIST_HAND_CONDITIONS),
  [normalizeName("Trigger finger / flexor tenosynovitis")]: "W10",
  [normalizeName("Trigger finger / thumb (stenosing flexor tenosynovitis)")]: "H03",
};

function fieldKey(conditionId, module, sub) {
  return `${conditionId}::${module}${sub ? `::${sub}` : ""}`;
}

function cervicalRedFlag(engineResult) {
  const rf = engineResult?.redFlagOverride;
  if (!rf?.triggered) return null;
  return {
    title: rf.urgency === "EMERGENCY" ? "EMERGENCY — Myelopathy / VBI / Fracture Indicators" : "URGENT REFERRAL INDICATED",
    lines: [rf.reason, rf.action].filter(Boolean),
  };
}
function evidenceModelRedFlag(engineResult) {
  const rf = engineResult?.redFlag;
  if (!rf?.triggered) return null;
  return { title: "RED FLAG DETECTED", lines: (rf.flags || []).map((f) => f.message).filter(Boolean) };
}

const REGION_CONFIGS = [
  {
    key: "cervical", label: "Cervical Spine", schema: "v2",
    matchesRegion: (r) => r.id === "cervical",
    hasData: (data) => hasCervicalChecklistData(data.subjective?.regions?.cervical) || !!spineRegionData(data, { id: "cervical" }, "cervical"),
    run: (data) => runCervicalDifferential(spineRegionData(data, { id: "cervical" }, "cervical") || data.subjective?.regions?.cervical, data.subjective),
    conditions: CERVICAL_CONDITIONS, order: CERVICAL_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: CERVICAL_ROM_MOVEMENTS, romLabel: "Cervical ROM",
    emptyNote: "Pick Cervical as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "thoracic", label: "Thoracic Spine", schema: "v2",
    matchesRegion: (r) => r.id === "thoracic",
    hasData: (data) => hasThoracicChecklistData(data.subjective?.regions?.thoracic) || !!spineRegionData(data, { id: "thoracic" }, "thoracic"),
    run: (data) => runThoracicDifferential(spineRegionData(data, { id: "thoracic" }, "thoracic") || data.subjective?.regions?.thoracic, data.subjective),
    conditions: THORACIC_CONDITIONS, order: THORACIC_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: THORACIC_ROM_MOVEMENTS, romLabel: "Thoracic ROM",
    emptyNote: "Pick Thoracic as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "lumbar", label: "Lumbar / SI", schema: "v2",
    matchesRegion: (r) => ["lumbar", "sacrum", "pelvis"].includes(r.id),
    hasData: (data) => hasLumbarChecklistData(data.subjective?.regions?.lumbarSI) || !!spineRegionData(data, { id: "lumbarSI" }, "lumbarSI"),
    run: (data) => runLumbarDifferential(spineRegionData(data, { id: "lumbarSI" }, "lumbarSI") || data.subjective?.regions?.lumbarSI, data.subjective),
    conditions: LUMBAR_CONDITIONS, order: LUMBAR_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: LUMBAR_ROM_MOVEMENTS, romLabel: "Lumbar ROM",
    emptyNote: "Pick Lumbar/SI as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "shoulder", label: "Shoulder", schema: "v2",
    matchesRegion: (r) => ["shoulder", "upperArm"].includes(r.id),
    hasData: (data) => hasShoulderChecklistData(data),
    run: (data) => runShoulderDifferential(data),
    matchByName: true, nameIdMap: SHOULDER_ID_BY_NAME,
    conditions: SHOULDER_CONDITIONS, order: SHOULDER_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: SHOULDER_ROM_MOVEMENTS, romLabel: "Shoulder ROM", romBilateral: true,
    emptyNote: "Pick Shoulder as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "hip", label: "Hip / Groin", schema: "v2",
    matchesRegion: (r) => r.id === "hip",
    hasData: (data) => hasHipChecklistData(data),
    run: (data) => runHipDifferential(data),
    matchByName: true, nameIdMap: HIP_ID_BY_NAME,
    conditions: HIP_CONDITIONS, order: HIP_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: HIP_ROM_MOVEMENTS, romLabel: "Hip ROM", romBilateral: true,
    emptyNote: "Pick Hip as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "knee", label: "Knee", schema: "v2",
    matchesRegion: (r) => r.id === "knee",
    hasData: (data) => hasKneeChecklistData(data),
    run: (data) => runKneeDifferential(data),
    matchByName: true, nameIdMap: KNEE_ID_BY_NAME,
    conditions: KNEE_CONDITIONS, order: KNEE_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: KNEE_ROM_MOVEMENTS, romLabel: "Knee ROM", romBilateral: true,
    emptyNote: "Pick Knee as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "ankleFoot", label: "Ankle / Foot", schema: "v2",
    matchesRegion: (r) => r.id === "ankle" || r.id === "foot",
    hasData: (data) => hasAnkleFootChecklistData(data),
    run: (data) => runAnkleFootDifferential(data),
    matchByName: true, nameIdMap: ANKLE_FOOT_ID_BY_NAME,
    conditions: ANKLE_FOOT_CONDITIONS, order: ANKLE_FOOT_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: ANKLE_FOOT_ROM_MOVEMENTS, romLabel: "Ankle ROM", romBilateral: true,
    emptyNote: "Pick Ankle or Foot as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "elbowWristHand", label: "Elbow / Wrist / Hand", schema: "v2",
    matchesRegion: (r) => ["elbow", "forearm", "wrist", "hand"].includes(r.id),
    hasData: (data) => hasElbowWristHandChecklistData(data),
    run: (data) => runElbowWristHandDifferential(data),
    matchByName: true, nameIdMap: ELBOW_WRIST_HAND_ID_BY_NAME,
    conditions: ELBOW_WRIST_HAND_CONDITIONS, order: ELBOW_WRIST_HAND_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    romMovements: ELBOW_WRIST_HAND_ROM_MOVEMENTS, romLabel: "Elbow / Wrist ROM", romBilateral: true,
    emptyNote: "Pick Elbow, Forearm, Wrist, or Hand as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
];

/* ---------- small building blocks, matching the artifact's flat/hairline/
   purple-only-on-selected visual language ---------- */

// Same percentage-match-card look as the old "Suggested Objective" step's
// ConditionMatchRow (OrthoSuggestObjectiveStep.jsx) — reusing its own
// .obj-match-row/.obj-match-card/.obj-match-pct/.obj-match-name classes
// (defined once in orthoStyles.js, already injected on this page by
// OrthoOutpatientAssessment.jsx) rather than a second, drifting copy of the
// same styling. Percentage is the same real supportingMatched/supportingTotal
// count every region's differential engine already returns — not a new score.
const MATCH_TIER_TONE = { "Strong match": "#16a34a", "Possible match": "#d97706", "Weak match": "#6b7280", "Insufficient data": "#9ca3af", "Unlikely": "#9ca3af" };

function conditionMatchPct(m) {
  if (!m || !m.supportingTotal) return null;
  return Math.round((m.supportingMatched.length / m.supportingTotal) * 100);
}

function ConditionTabs({ conditions, order, matchById, activeId, onSelect }) {
  return (
    <div className="obj-match-row">
      {order.map((id) => {
        const c = conditions[id];
        if (!c) return null;
        const m = matchById[id];
        const pct = conditionMatchPct(m);
        const isActive = id === activeId;
        return (
          <button
            key={id}
            type="button"
            className={"obj-match-card" + (isActive ? " obj-match-card-active" : "")}
            onClick={() => onSelect(id)}
          >
            {pct != null ? (
              <span className="obj-match-pct">{pct}%</span>
            ) : m ? (
              <span className="obj-match-pct" style={{ color: MATCH_TIER_TONE[m.matchTier] }}>{m.matchTier}</span>
            ) : (
              <span className="obj-match-pct" style={{ fontSize: 13 }}>{id}</span>
            )}{" "}
            <span className="obj-match-name">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// sub: one-line general "how to assess" instruction shown right under the
// section title (2026-09-11, Aditi: "put in palpation observation and
// posture how to look assess instruction just below the topic name") --
// general technique guidance, not per-condition/per-finding content.
// Palpation's line is drawn from the app's own Palpation study mode
// ("How to palpate", src/physiofeed/learn/palpationIntroTopics.js);
// Observation/Posture are standard orthopedic-exam teaching (inspection
// from multiple views before hands-on testing), not tied to any one book.
function ModuleCard({ label, sub, color, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: `1px solid ${HAIRLINE}`, padding: "14px 2px" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        role="button"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
      >
        <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: color || BRAND.gray }}>
          {label}
        </span>
        <span style={{ fontSize: "0.76rem", fontWeight: 600, color: BRAND.purple }}>{open ? "Close ↑" : "Open →"}</span>
      </div>
      {open && sub && <div style={{ fontSize: "0.74rem", color: BRAND.gray, lineHeight: 1.4, marginTop: 6, fontStyle: "italic" }}>{sub}</div>}
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

const MODULE_HOW_TO = {
  observation: "Observe before touching the patient — posture, gait, guarding, and skin changes from anterior, lateral, and posterior views.",
  posture: "Assess static alignment in standing (or sitting) from anterior, lateral, and posterior views, comparing bony landmarks left to right.",
  palpation: "Palpate systematically from superficial to deep, comparing left and right, using finger pads with steady, graded pressure — locate the structure first, then judge its condition.",
};

// Subtopics shown as a horizontal, scrollable "piano row" below the
// condition selector — page-by-page assessment instead of every module
// stacked on one long scroll (2026-09-11, approved chat mockup: purple
// gradient bar, active tab pops up as a white card). Extra modules that
// don't get their own tab fold into the nearest clinically-related one:
// Posture + Fascia -> Observation; CPA-NKT -> Palpation; Kinetic Chain ->
// Functional. Special Tests, STTT-Cyriax, and Outcome Measures each get
// their own page (2026-09-11: "make sttt and special test and outcome
// measure each page different").
const SUBTOPICS = [
  { key: "observation", label: "Observation", icon: "ti-eye" },
  { key: "palpation", label: "Palpation", icon: "ti-hand-stop" },
  { key: "rom", label: "ROM", icon: "ti-arrows-maximize" },
  { key: "functional", label: "Functional", icon: "ti-walk" },
  { key: "special", label: "Special tests", icon: "ti-clipboard-check" },
  { key: "sttt", label: "STTT / Cyriax", icon: "ti-stethoscope" },
  { key: "outcome", label: "Outcome measures", icon: "ti-chart-line" },
];

// Scrolling the row itself drives selection -- whichever tile's center is
// nearest the track's center becomes active, like a piano-roll/wheel picker
// (2026-09-11: "whoever in the middle will show"). Tapping a tile still
// works and scrolls it to center; both paths converge on the same
// nearest-to-center logic so they never fight each other.
function SubtopicTabs({ active, onSelect }) {
  const scrollRef = React.useRef(null);
  const tileRefs = React.useRef({});
  const settleTimer = React.useRef(null);

  const centerOn = (key, smooth = true) => {
    const el = tileRefs.current[key];
    const track = scrollRef.current;
    if (!el || !track) return;
    const target = el.offsetLeft - (track.clientWidth - el.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  };

  const nearestToCenter = () => {
    const track = scrollRef.current;
    if (!track) return null;
    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    let best = null, bestDist = Infinity;
    for (const s of SUBTOPICS) {
      const el = tileRefs.current[s.key];
      if (!el) continue;
      const tileCenter = el.offsetLeft + el.clientWidth / 2;
      const dist = Math.abs(tileCenter - trackCenter);
      if (dist < bestDist) { bestDist = dist; best = s.key; }
    }
    return best;
  };

  const handleScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const key = nearestToCenter();
      if (key && key !== active) onSelect(key);
    }, 120);
  };

  const handleTap = (key) => {
    onSelect(key);
    centerOn(key);
  };

  const scrollBy = (dx) => scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  // Back/Next buttons and the condition-switch reset change `active` from
  // outside this component -- follow along so the centered tile always
  // matches whichever page is actually showing.
  useEffect(() => { centerOn(active); }, [active]);

  return (
    <div className="obj-subtopic-bar">
      <button type="button" className="obj-subtopic-scroll-btn" aria-label="Scroll left" onClick={() => scrollBy(-90)}>
        <i className="ti ti-chevron-left" aria-hidden="true"></i>
      </button>
      <div className="obj-subtopic-tabs" ref={scrollRef} onScroll={handleScroll}>
        {SUBTOPICS.map((s) => (
          <button
            key={s.key}
            ref={(el) => { tileRefs.current[s.key] = el; }}
            type="button"
            className={"obj-subtopic-tab" + (active === s.key ? " obj-subtopic-tab-active" : "")}
            onClick={() => handleTap(s.key)}
          >
            <i className={"ti " + s.icon} aria-hidden="true"></i>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <button type="button" className="obj-subtopic-scroll-btn" aria-label="Scroll right" onClick={() => scrollBy(90)}>
        <i className="ti ti-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 13px", borderRadius: 9, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", outline: "none",
        border: active ? `1px solid ${BRAND.purple}` : `1px dashed ${HAIRLINE}`,
        background: active ? BRAND.purple : "#fff",
        color: active ? "#fff" : BRAND.ink,
        boxShadow: active ? "0 4px 10px rgba(108,77,255,.24)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function ChipGroup({ options, selected, onToggle, multi = true }) {
  const values = multi ? (selected ? selected.split(", ").filter(Boolean) : []) : selected ? [selected] : [];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Chip key={o} active={values.includes(o)} onClick={() => onToggle(o)}>{o}</Chip>
      ))}
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ padding: "10px 12px", border: `1px dashed ${HAIRLINE}`, borderRadius: 8, fontSize: "0.78rem", color: BRAND.grayLight, fontStyle: "italic" }}>
      {children}
    </div>
  );
}

// Purple-accent treatment (2026-09-10, Aditi: picked option A from font
// mockups — "basic black" default and the old flat BRAND.gray were both
// rejected) — field/group labels read as an intentional design choice
// instead of disabled-looking muted text. Shared by every module that
// reuses SubLabel/CategoryLabel: STTT, Kinetic Chain, Functional Screen,
// Outcome Measures, CPA.
const LABEL_ACCENT = "#534AB7";
const LABEL_ACCENT_DARK = "#26215C";

function SubLabel({ children }) {
  return <div style={{ fontSize: "0.8rem", fontWeight: 700, color: LABEL_ACCENT_DARK, letterSpacing: 0.2, marginBottom: 6 }}>{children}</div>;
}

// Small uppercase category label, same treatment as ModuleCard's own
// section headers (e.g. "SPECIAL TESTS") — for a sub-grouping within a
// module (e.g. "Side" vs "Result") rather than a field name.
function CategoryLabel({ children }) {
  return (
    <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: LABEL_ACCENT, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function GreenBox({ title, children }) {
  return (
    <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: BRAND.greenBg, border: `1px solid ${BRAND.green}33` }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.green, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}
function PurpleBox({ title, children }) {
  return (
    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, background: BRAND.purpleFaint, border: `1px solid ${BRAND.purple}33` }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.purpleDark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "0.8rem", color: BRAND.purpleDark, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
function BlueBox({ title, children }) {
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#1D4ED8", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "0.78rem", color: "#1E3A8A", lineHeight: 1.5 }}>✓ {children}</div>
    </div>
  );
}

// Card-list variant of ChipGroup+FindingInterpretations for Observation/
// Posture/Palpation (2026-09-11, per approved chat mockup: "put it in all
// observation posture and palpation of all regions") -- one square icon
// tile per finding (numbered, checkmark badge when selected) instead of a
// pill, with that finding's clinical interpretation expanding directly
// under its own card on tap instead of in a separate list below every
// chip. Same condition.findingInterpretations[category][label] source as
// before -- findings without authored interpretation text just don't show
// a panel, no fabricated content. One representative icon per category
// (not per finding -- the condition library has no per-finding icon
// mapping and inventing one per finding/condition wouldn't be maintainable).
function FindingCard({ index, icon, label, active, interpretation, onToggle }) {
  return (
    <div style={{ borderRadius: 12, border: active ? `1.5px solid ${BRAND.purple}` : `1px solid ${HAIRLINE}`, background: "#fff", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", padding: 12, width: "100%", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        <div style={{ position: "relative", flex: "0 0 auto", width: 64, height: 64, borderRadius: 12, background: active ? BRAND.purpleFaint : "#F6F5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={"ti " + icon} style={{ fontSize: 28, color: active ? BRAND.purpleDark : BRAND.grayLight }} aria-hidden="true"></i>
          <span style={{ position: "absolute", top: -6, left: -6, width: 20, height: 20, borderRadius: 6, background: BRAND.purple, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{index}</span>
          {active && (
            <span style={{ position: "absolute", bottom: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: BRAND.purple, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true"></i>
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: BRAND.ink }}>{label}</div>
        </div>
        <i className="ti ti-chevron-down" style={{ fontSize: 18, color: BRAND.grayLight, transform: active ? "rotate(180deg)" : "none", flexShrink: 0 }} aria-hidden="true"></i>
      </button>
      {active && interpretation && (
        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: BRAND.purpleFaint }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.purpleDark, marginBottom: 4 }}>Clinical interpretation</div>
            <div style={{ fontSize: "0.78rem", color: BRAND.ink, lineHeight: 1.5 }}>{interpretation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const FINDING_CATEGORY_ICON = { observation: "ti-eye", posture: "ti-walk", palpation: "ti-hand-stop" };

function FindingCardList({ category, options, selected, onToggle, interpretations }) {
  const values = selected ? selected.split(", ").filter(Boolean) : [];
  const icon = FINDING_CATEGORY_ICON[category] || "ti-eye";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {options.map((o, i) => (
        <FindingCard
          key={o}
          index={i + 1}
          icon={icon}
          label={o}
          active={values.includes(o)}
          interpretation={interpretations?.[o]?.text}
          onToggle={() => onToggle(o)}
        />
      ))}
    </div>
  );
}

export default function ConditionObjectiveAssessment({ data, setData, selectedRegions, onStartOutcomeMeasure }) {
  const regions = selectedRegions || [];
  const config = REGION_CONFIGS.find((cfg) => regions.some(cfg.matchesRegion)) || REGION_CONFIGS[0];

  const [state, setField] = useSectionData(data, setData, `conditionAssessment_${config.key}`);
  const [activeId, setActiveId] = useState(null);
  const [activeSubtopic, setActiveSubtopic] = useState("observation");
  const [analysisRun, setAnalysisRun] = useState(false);
  // Brief "thinking" state between tap and the ranked conditions appearing
  // — purely a UI beat (the real differential itself is synchronous), so
  // the AI-assistant framing reads as doing work rather than an instant
  // toggle (2026-09-10, Aditi: "motion graphic when we click on it").
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  function runSuggestAnalysis() {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setTimeout(() => { setAnalysisRun(true); setIsAnalyzing(false); }, 550);
  }

  const regionPicked = regions.some(config.matchesRegion);

  const engineResult = useMemo(() => {
    if (!regionPicked) return null;
    try {
      if (!config.hasData(data)) return null;
      return config.run(data);
    } catch { return null; }
  }, [regionPicked, config, data]);

  // Shoulder bridges SH0x engine ids -> S0x condition-library ids by
  // normalized name (see SHOULDER_ID_BY_NAME above); every other region's
  // engine already emits the same ids the condition library uses.
  const matchById = useMemo(() => {
    if (!engineResult) return {};
    if (!config.matchByName) return Object.fromEntries(engineResult.conditions.map((c) => [c.id, c]));
    const out = {};
    engineResult.conditions.forEach((c) => {
      const realId = config.nameIdMap[normalizeName(c.name)];
      if (realId) out[realId] = c;
    });
    return out;
  }, [engineResult, config]);

  const rankedIds = useMemo(() => {
    if (!engineResult) return [];
    if (!config.matchByName) return engineResult.conditions.filter((c) => c.matchTier !== "Unlikely").map((c) => c.id);
    return Object.entries(matchById).filter(([, m]) => m.matchTier !== "Unlikely").map(([id]) => id);
  }, [engineResult, config, matchById]);

  const order = useMemo(
    () => [...rankedIds, ...config.order.filter((id) => !rankedIds.includes(id))],
    [rankedIds, config]
  );
  const selectedId = activeId || rankedIds[0] || config.order[0];
  const condition = config.conditions[selectedId];

  // Switching condition jumps back to the first subtopic page.
  useEffect(() => { setActiveSubtopic("observation"); }, [selectedId]);

  const redFlag = config.getRedFlag(engineResult);

  const v = (module, sub) => state[fieldKey(selectedId, module, sub)] || "";
  const sv = (module, sub, val) => setField(fieldKey(selectedId, module, sub), val);
  const toggleMulti = (module, sub, option) => {
    const cur = v(module, sub) ? v(module, sub).split(", ").filter(Boolean) : [];
    sv(module, sub, (cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option]).join(", "));
  };
  const toggleSingle = (module, sub, option) => sv(module, sub, v(module, sub) === option ? "" : option);

  if (!regionPicked || !condition) {
    return <EmptyNote>{config.emptyNote}</EmptyNote>;
  }

  const isV1 = config.schema === "v1";
  const matchedCondition = matchById[selectedId];
  const specialTestItems = isV1 ? condition.keyExams : condition.specialTests;
  const rankedCount = rankedIds.length;

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: BRAND.purple }}>
          Physiom · Ortho Outpatient
        </div>
        <div style={{ fontSize: "1.15rem", fontWeight: 700, color: BRAND.ink, marginTop: 2 }}>{config.label} — Objective Assessment</div>
        <div style={{ fontSize: "0.8rem", color: BRAND.gray, marginTop: 3 }}>
          Tap a condition below — every module updates to that condition's authored findings.
        </div>
      </div>

      {/* Same sticky "assistant card" button/copy as the Subjective step's
          own "🧠 Suggest probable objective assessment" (SubjectiveObjective.jsx)
          — reruns the real Phase 0.5 differential for this region and reveals
          the ranked, percentage-matched condition cards below rather than
          showing them unconditionally. */}
      <button
        type="button"
        className={"obj-ai-suggest-btn" + (isAnalyzing ? " thinking" : "")}
        onClick={runSuggestAnalysis}
        disabled={isAnalyzing}
        style={{
          position: "sticky", top: 0, zIndex: 20, width: "100%", minHeight: 52, padding: "12px 14px", borderRadius: 12,
          cursor: isAnalyzing ? "default" : "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, marginBottom: 4, textAlign: "left",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="obj-ai-suggest-title" style={{ fontSize: "0.78rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 5, lineHeight: 1.35 }}>
            <span className={isAnalyzing ? "obj-ai-thinking-icon" : undefined}>🧠</span>
            {isAnalyzing ? "Analyzing…" : "Suggest probable objective assessment"}
          </span>
          <span className="obj-ai-suggest-sub" style={{ fontSize: "0.7rem", lineHeight: 1.3 }}>
            {engineResult ? `${config.label} — ${rankedCount} condition${rankedCount === 1 ? "" : "s"} matched from Subjective` : `${config.label} — no Subjective data yet`}
          </span>
        </span>
        {!isAnalyzing && (
          <span className="obj-ai-suggest-cta" style={{ fontSize: "0.76rem", fontWeight: 800, flexShrink: 0 }}>{analysisRun ? "Re-run →" : "Review →"}</span>
        )}
      </button>

      {!analysisRun ? (
        <EmptyNote>Tap "Suggest probable objective assessment" above to see conditions ranked by percentage match against what's documented in Subjective.</EmptyNote>
      ) : (
        <>
          {redFlag && (
            <div style={{ marginTop: 12, marginBottom: 10, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${BRAND.red}`, background: BRAND.redBg }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: BRAND.red, marginBottom: 3 }}>🚨 {redFlag.title}</div>
              {redFlag.lines.map((l, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: BRAND.red, marginTop: i === 0 ? 0 : 3 }}>{l}</div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <ConditionTabs conditions={config.conditions} order={order} matchById={matchById} activeId={selectedId} onSelect={setActiveId} />
          </div>

          {matchedCondition && (
            <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginBottom: 6 }}>
              {matchedCondition.matchTier} · {matchedCondition.supportingMatched.length}/{matchedCondition.supportingTotal} supporting signs from Subjective
            </div>
          )}

          <SubtopicTabs active={activeSubtopic} onSelect={setActiveSubtopic} />
          <div className="obj-subtopic-page">

          <ModuleCard label="Suggested tests" color={BRAND.purple}>
            {config.suggestedTestsMode === "split" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <SubLabel>Required</SubLabel>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: BRAND.ink, lineHeight: 1.6 }}>
                    {(isV1 ? condition.requiredTests : condition.required).map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
                <div>
                  <SubLabel>Recommended</SubLabel>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: BRAND.gray, lineHeight: 1.6 }}>
                    {(isV1 ? condition.recommendedTests : condition.recommended).map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <SubLabel>Key Exams</SubLabel>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: BRAND.ink, lineHeight: 1.6 }}>
                  {condition.keyExams.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
          </ModuleCard>

          {activeSubtopic === "observation" && <>
          <ModuleCard label="Observation" sub={MODULE_HOW_TO.observation} color="#7C3AED">
            <FindingCardList category="observation" options={isV1 ? condition.observationChecklist : condition.observation} selected={v("observation", "chips")} onToggle={(o) => toggleMulti("observation", "chips", o)} interpretations={condition.findingInterpretations?.observation} />
          </ModuleCard>

          <ModuleCard label="Posture" sub={MODULE_HOW_TO.posture} color="#3B82F6">
            <FindingCardList category="posture" options={isV1 ? condition.postureChecklist : condition.posture} selected={v("posture", "chips")} onToggle={(o) => toggleMulti("posture", "chips", o)} interpretations={condition.findingInterpretations?.posture} />
          </ModuleCard>

          {condition.fascia && (
            <ModuleCard label="Fascia" color="#EC4899" defaultOpen={false}>
              <div style={{ fontSize: "0.8rem", color: BRAND.ink, lineHeight: 1.5 }}>{condition.fascia}</div>
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "palpation" && <>
          <ModuleCard label="Palpation" sub={MODULE_HOW_TO.palpation} color={BRAND.red}>
            {isV1 ? (
              condition.palpationZones ? (
                <FindingCardList category="palpation" options={condition.palpationZones} selected={v("palpation", "chips")} onToggle={(o) => toggleMulti("palpation", "chips", o)} interpretations={condition.findingInterpretations?.palpation} />
              ) : (
                <EmptyNote>Not specified in condition library.</EmptyNote>
              )
            ) : condition.palpation.length > 0 ? (
              <FindingCardList category="palpation" options={condition.palpation} selected={v("palpation", "chips")} onToggle={(o) => toggleMulti("palpation", "chips", o)} interpretations={condition.findingInterpretations?.palpation} />
            ) : (
              <EmptyNote>Not specified in condition library.</EmptyNote>
            )}
          </ModuleCard>

          <ModuleCard label="CPA — NKT" color="#D97706">
            {isV1 ? (
              <>
                {condition.cpaNkt.muscle && <SubLabel>{condition.cpaNkt.muscle}</SubLabel>}
                <div style={{ fontSize: "0.8rem", color: BRAND.ink, lineHeight: 1.5, marginBottom: 10 }}>{condition.cpaNkt.narrative}</div>
                <ChipGroup options={["Facilitated", "Inhibited", "Overactive"]} selected={v("cpaNkt", "state")} onToggle={(o) => toggleSingle("cpaNkt", "state", o)} multi={false} />
              </>
            ) : condition.cpa.applicable === false ? (
              <EmptyNote>{condition.cpa.reason}</EmptyNote>
            ) : (
              <>
                {condition.cpa.muscles.map((m, i) => {
                  const sel = v("cpa", "m" + i);
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <SubLabel>{m.name} — <span style={{ color: BRAND.amber }}>{m.state}</span></SubLabel>
                      <ChipGroup options={["Facilitated", "Inhibited", "Overactive"]} selected={sel} onToggle={(o) => toggleSingle("cpa", "m" + i, o)} multi={false} />
                    </div>
                  );
                })}
                <PurpleBox title="Clinical Interpretation">{condition.cpa.pattern}</PurpleBox>
              </>
            )}
          </ModuleCard>
          </>}

          {activeSubtopic === "rom" && config.romMovements && (
            <ModuleCard label={config.romLabel} color="#059669">
              {/* Same Stepper + "Normal — document" quick-fill + Active/
                  Passive/Resisted mode toggle the app's real Range of
                  Motion step (RomSection/RomMovementCard in
                  orthoRegionAssessments.jsx) already uses — not a
                  lookalike, the actual shared components. Limb-joint
                  regions get L/R columns (config.romBilateral), matching
                  ROM_DATA's own bilateral:true for those joints; spine
                  regions already model Left/Right as separate movement
                  rows (e.g. "Rotation Left"/"Rotation Right"), same as
                  ROM_DATA's bilateral:false there, so stay single-column. */}
              <div style={{ marginBottom: 8 }}>
                <Segmented
                  options={["Active", "Passive", "Resisted"]}
                  value={v("rom", "mode") || "Active"}
                  onChange={(mode) => sv("rom", "mode", mode)}
                />
              </div>
              {config.romBilateral && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 68px", gap: 8, paddingBottom: 6, borderBottom: "1.5px solid #ECE9F7", marginBottom: 2 }}>
                  <span style={{ fontSize: "0.656rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.grayLight }}>Movement</span>
                  <span style={{ fontSize: "0.656rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.grayLight, textAlign: "center" }}>L</span>
                  <span style={{ fontSize: "0.656rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: BRAND.grayLight, textAlign: "center" }}>R</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {config.romMovements.map((m, i) => {
                  const max = m.normal ? m.normal * 2 : 200;
                  const rowStyle = { borderTop: i === 0 ? "none" : "1px solid #F5F3FB", padding: "9px 0" };

                  const normalStr = m.normal != null ? String(m.normal) : "";

                  if (config.romBilateral) {
                    const rawL = v("rom", m.id + "_left");
                    const rawR = v("rom", m.id + "_right");
                    const valL = rawL || normalStr;
                    const valR = rawR || normalStr;
                    // Grade is judged off what was actually confirmed, not
                    // the suggested-normal default the Stepper shows before
                    // that — otherwise every untouched row would flash "WNL".
                    const gradeL = m.normal && rawL ? RESTRICTION_GRADE(Number(rawL), m.normal) : null;
                    const gradeR = m.normal && rawR ? RESTRICTION_GRADE(Number(rawR), m.normal) : null;
                    return (
                      <div key={m.id} style={rowStyle}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 68px", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <InfoButton imageTrigger fallbackIcon="ti-arrows-maximize" title={m.label} richItem={romRichItemFor(config.key, m.id)} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.845rem", color: BRAND.ink, letterSpacing: "-0.01em" }}>{m.label}</div>
                              <div style={{ fontSize: "0.656rem", color: BRAND.grayLight, fontWeight: 500 }}>Normal {m.normal}°</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Stepper value={valL} onChange={(nv) => sv("rom", m.id + "_left", nv)} min={0} max={max} />
                            {gradeL && <span style={{ fontSize: "0.53rem", fontWeight: 700, color: gradeL.color }}>{gradeL.label}</span>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <Stepper value={valR} onChange={(nv) => sv("rom", m.id + "_right", nv)} min={0} max={max} />
                            {gradeR && <span style={{ fontSize: "0.53rem", fontWeight: 700, color: gradeR.color }}>{gradeR.label}</span>}
                          </div>
                        </div>
                        {m.normal != null && (
                          <div style={{ marginTop: 7 }}>
                            <button
                              type="button" className="rom-normal-btn"
                              onClick={() => { sv("rom", m.id + "_left", String(m.normal)); sv("rom", m.id + "_right", String(m.normal)); }}
                            >
                              ✓ Normal — document N={m.normal}°
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const rawVal = v("rom", m.id);
                  const val = rawVal || normalStr;
                  const grade = m.normal && rawVal ? RESTRICTION_GRADE(Number(rawVal), m.normal) : null;
                  return (
                    <div key={m.id} style={rowStyle}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <InfoButton imageTrigger fallbackIcon="ti-arrows-maximize" title={m.label} richItem={romRichItemFor(config.key, m.id)} />
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.845rem", color: BRAND.ink, letterSpacing: "-0.01em" }}>{m.label}</span>
                            <span style={{ fontSize: "0.656rem", color: BRAND.grayLight, fontWeight: 500 }}>Normal {m.normal}°</span>
                          </div>
                        </div>
                        <Stepper value={val} onChange={(nv) => sv("rom", m.id, nv)} min={0} max={max} />
                      </div>
                      {grade && (
                        <div style={{ fontSize: "0.53rem", fontWeight: 700, color: grade.color, textAlign: "right", marginTop: 1 }}>{grade.label}</div>
                      )}
                      {m.normal != null && (
                        <div style={{ marginTop: 7 }}>
                          <button type="button" className="rom-normal-btn" onClick={() => sv("rom", m.id, String(m.normal))}>
                            ✓ Normal — document N={m.normal}°
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ModuleCard>
          )}

          {activeSubtopic === "special" && <>
          <ModuleCard label="Special Tests" color="#8B5CF6">
            {specialTestItems && specialTestItems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {specialTestItems.map((raw, i) => {
                  // Thoracic's specialTests are {name} objects; other v2
                  // regions use plain strings — normalize both.
                  const t = typeof raw === "string" ? raw : raw.name;
                  return (
                    <div key={t} style={{ borderTop: i === 0 ? "none" : "1px solid #F5F3FB", padding: "10px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <InfoButton imageTrigger fallbackIcon="ti-clipboard-check" title={t} richItem={specialRichItemFor(config.key, t)} />
                        <div style={{ fontSize: "0.85rem", color: BRAND.ink, fontWeight: 700, minWidth: 0 }}>{t}</div>
                      </div>
                      <CategoryLabel>Side</CategoryLabel>
                      <ChipGroup options={["Right", "Left", "Bilateral"]} selected={v("special", t + "_side")} onToggle={(o) => toggleSingle("special", t + "_side", o)} multi={false} />
                      <div style={{ marginTop: 10 }}>
                        <CategoryLabel>Result</CategoryLabel>
                        <ChipGroup options={["Negative", "Positive", "Equivocal"]} selected={v("special", t)} onToggle={(o) => toggleSingle("special", t, o)} multi={false} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyNote>Not specified in condition library.</EmptyNote>
            )}
          </ModuleCard>
          </>}

          {activeSubtopic === "sttt" && <>
          {isV1 ? (
            <ModuleCard label="STTT — Cyriax" color="#0D9488">
              <SubLabel>{condition.resistedNarrative}</SubLabel>
              <div style={{ marginTop: 6 }}>
                <SubLabel>{condition.resistedTestName}</SubLabel>
                <ChipGroup options={RESISTED_TEST_OPTIONS_V1} selected={v("resisted", "test")} onToggle={(o) => toggleSingle("resisted", "test", o)} multi={false} />
              </div>
              {v("resisted", "test") && (
                <GreenBox title="Findings">
                  <div style={{ fontSize: "0.78rem", color: "#166534" }}>✓ {condition.resistedTestName} — {v("resisted", "test")}</div>
                  {interpretSttOption(v("resisted", "test")) && (
                    <div style={{ fontSize: "0.76rem", color: "#166534", marginTop: 4, opacity: 0.85 }}>{interpretSttOption(v("resisted", "test"))}</div>
                  )}
                </GreenBox>
              )}
              <PurpleBox title="Clinical Interpretation">
                {sttOverallInterpretation([v("resisted", "test")], []) || condition.resistedNarrative}
              </PurpleBox>
            </ModuleCard>
          ) : (
            <ModuleCard label="STTT — Cyriax" color="#0D9488">
              {condition.sttt.applicable === false ? (
                <EmptyNote>{condition.sttt.reason}</EmptyNote>
              ) : (
                <>
                  {/* Thoracic's own sttt shape has no resisted/passive/interpretation
                      fields (its STTT/CPA content is extrapolated from general Cyriax
                      principles rather than a dedicated Thoracic catalogue, per its own
                      "caveat" flag) — findings-only for that region, verified against
                      the actual JSON rather than assumed from the schema doc. */}
                  {condition.sttt.caveat && (
                    <div style={{ fontSize: "0.72rem", fontStyle: "italic", color: BRAND.grayLight, marginBottom: 10 }}>
                      Extrapolated from general Cyriax principles — no dedicated catalogue for this region in the source library.
                    </div>
                  )}
                  {condition.sttt.naText && (
                    <div style={{ fontSize: "0.78rem", color: BRAND.red, fontWeight: 600, marginBottom: 10 }}>
                      ⚠ {condition.sttt.naText}
                    </div>
                  )}
                  {(condition.sttt.resisted || []).length > 0 && (
                    <>
                      <CategoryLabel>Resisted</CategoryLabel>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {condition.sttt.resisted.map((f, i) => {
                          const sel = v("sttt", "r" + i);
                          const line = interpretSttOption(sel);
                          return (
                            <div key={i}>
                              <SubLabel>{f.label}</SubLabel>
                              <ChipGroup options={f.options} selected={sel} onToggle={(o) => toggleSingle("sttt", "r" + i, o)} multi={false} />
                              {line && <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {line}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {(condition.sttt.passive || []).length > 0 && (
                    <>
                      <div style={{ marginTop: 16 }}><CategoryLabel>Passive</CategoryLabel></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {condition.sttt.passive.map((f, i) => {
                          const sel = v("sttt", "p" + i);
                          const line = interpretSttOption(sel);
                          return (
                            <div key={i}>
                              <SubLabel>{f.label}</SubLabel>
                              <ChipGroup options={f.options} selected={sel} onToggle={(o) => toggleSingle("sttt", "p" + i, o)} multi={false} />
                              {line && <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {line}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {(() => {
                    const resistedSelections = (condition.sttt.resisted || []).map((_, i) => v("sttt", "r" + i));
                    const passiveSelections = (condition.sttt.passive || []).map((_, i) => v("sttt", "p" + i));
                    const anySelected = [...resistedSelections, ...passiveSelections].some(Boolean);
                    const findingsRows = [
                      ...(condition.sttt.resisted || []).map((f, i) => resistedSelections[i] && { label: f.label, value: resistedSelections[i] }),
                      ...(condition.sttt.passive || []).map((f, i) => passiveSelections[i] && { label: f.label, value: passiveSelections[i] }),
                    ].filter(Boolean);
                    const overall = sttOverallInterpretation(resistedSelections, passiveSelections);
                    return (
                      <>
                        {(anySelected ? findingsRows.length > 0 : (condition.sttt.findings || []).length > 0) && (
                          <GreenBox title="Findings">
                            {anySelected
                              ? findingsRows.map((r, i) => (
                                  <div key={i} style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 3 }}>✓ {r.label} — {r.value}</div>
                                ))
                              : (condition.sttt.findings || []).map((f, i) => (
                                  <div key={i} style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 3 }}>✓ {f}</div>
                                ))}
                          </GreenBox>
                        )}
                        <PurpleBox title="Clinical Interpretation">
                          {anySelected ? (overall || "Select a finding above to see the clinical interpretation.") : condition.sttt.interpretation}
                        </PurpleBox>
                      </>
                    );
                  })()}
                </>
              )}
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "functional" && <>
          {isV1 ? (
            <ModuleCard label="Kinetic Chain" color="#4F46E5" defaultOpen={!condition.kineticChain.notApplicable}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink, marginBottom: 10 }}>{condition.kineticChain.testName}</div>
              {condition.kineticChain.notApplicable ? (
                <div style={{ fontSize: "0.8rem", color: BRAND.grayLight, lineHeight: 1.5, fontStyle: "italic" }}>{condition.kineticChain.chainEffect}</div>
              ) : (
                <>
                  <ChipGroup options={condition.kineticChain.chipOptions} selected={v("kineticChain", "state")} onToggle={(o) => toggleSingle("kineticChain", "state", o)} multi={false} />
                  {interpretSttOption(v("kineticChain", "state")) && (
                    <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, marginBottom: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("kineticChain", "state"))}</div>
                  )}
                  <BlueBox title="Chain Effect">{condition.kineticChain.chainEffect}</BlueBox>
                </>
              )}
            </ModuleCard>
          ) : (
            <ModuleCard label="Kinetic Chain" color="#4F46E5" defaultOpen={condition.kineticChain.applicable !== false}>
              {condition.kineticChain.applicable === false ? (
                <EmptyNote>{condition.kineticChain.reason}</EmptyNote>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink, marginBottom: 10 }}>{condition.kineticChain.name}</div>
                  {condition.kineticChain.fields.map((f, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <SubLabel>{f.label}</SubLabel>
                      <ChipGroup options={f.options} selected={v("kineticChain", "f" + i)} onToggle={(o) => toggleSingle("kineticChain", "f" + i, o)} multi={false} />
                      {interpretSttOption(v("kineticChain", "f" + i)) && (
                        <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("kineticChain", "f" + i))}</div>
                      )}
                    </div>
                  ))}
                  <BlueBox title="Chain Effect">{condition.kineticChain.chainEffect}</BlueBox>
                </>
              )}
            </ModuleCard>
          )}

          {isV1 ? (
            <ModuleCard label="Functional Screen" color="#16A34A">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink }}>{condition.functionalScreen.testName}</span>
                {condition.functionalScreen.note && <InfoButton small title={condition.functionalScreen.testName} text={condition.functionalScreen.note} eyebrow="NOTE" />}
              </div>
              {condition.functionalScreen.measure.type === "number" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}>
                  <span style={{ fontSize: "0.78rem", color: BRAND.gray, flex: 1 }}>{condition.functionalScreen.measure.label}</span>
                  <input
                    type="number" value={v("functionalScreen", "measure")} onChange={(e) => sv("functionalScreen", "measure", e.target.value)}
                    placeholder="—" style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", textAlign: "center", outline: "none" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: BRAND.grayLight }}>{condition.functionalScreen.measure.unit} {condition.functionalScreen.measure.hint}</span>
                </div>
              )}
              {condition.functionalScreen.measure.type === "choice" && (
                <div style={{ marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}>
                  <SubLabel>{condition.functionalScreen.measure.label}</SubLabel>
                  <ChipGroup options={condition.functionalScreen.measure.options} selected={v("functionalScreen", "measure")} onToggle={(o) => toggleSingle("functionalScreen", "measure", o)} multi={false} />
                  {interpretSttOption(v("functionalScreen", "measure")) && (
                    <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("functionalScreen", "measure"))}</div>
                  )}
                </div>
              )}
              {condition.functionalScreen.measure.type === "text" && (
                <input
                  type="text" value={v("functionalScreen", "measure")} onChange={(e) => sv("functionalScreen", "measure", e.target.value)}
                  placeholder={condition.functionalScreen.measure.label}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none", marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}
                />
              )}
              {condition.functionalScreen.secondaryChip && (
                <div>
                  <SubLabel>{condition.functionalScreen.secondaryChip.label}</SubLabel>
                  <ChipGroup options={condition.functionalScreen.secondaryChip.options} selected={v("functionalScreen", "secondary")} onToggle={(o) => toggleSingle("functionalScreen", "secondary", o)} multi={false} />
                  {interpretSttOption(v("functionalScreen", "secondary")) && (
                    <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("functionalScreen", "secondary"))}</div>
                  )}
                </div>
              )}
            </ModuleCard>
          ) : (
            <ModuleCard label="Functional Screen" color="#16A34A">
              {condition.functionalScreen.applicable === false ? (
                <EmptyNote>{condition.functionalScreen.reason}</EmptyNote>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: BRAND.ink }}>{condition.functionalScreen.name}</span>
                    {condition.functionalScreen.note && <InfoButton small title={condition.functionalScreen.name} text={condition.functionalScreen.note} eyebrow="NOTE" />}
                  </div>
                  {condition.functionalScreen.fields.map((f, i) => f.type === "number" ? (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: "0.78rem", color: BRAND.gray, flex: 1 }}>{f.label}</span>
                      <input
                        type="number" value={v("functionalScreen", "f" + i)} onChange={(e) => sv("functionalScreen", "f" + i, e.target.value)}
                        placeholder="—" style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontSize: "0.75rem", color: BRAND.grayLight }}>{f.unit} {f.normal}</span>
                    </div>
                  ) : (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <SubLabel>{f.label}</SubLabel>
                      <ChipGroup options={f.options} selected={v("functionalScreen", "f" + i)} onToggle={(o) => toggleSingle("functionalScreen", "f" + i, o)} multi={false} />
                      {interpretSttOption(v("functionalScreen", "f" + i)) && (
                        <div style={{ fontSize: "0.74rem", color: BRAND.gray, marginTop: 6, lineHeight: 1.4 }}>→ {interpretSttOption(v("functionalScreen", "f" + i))}</div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </ModuleCard>
          )}
          </>}

          {activeSubtopic === "outcome" && <>
          <ModuleCard label="Outcome Measures" color={BRAND.gray}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(isV1 ? condition.outcome.split(";").map((s) => s.trim()).filter(Boolean) : condition.outcomeMeasures).map((instrument) => {
                const measureId = matchMeasureIdForInstrument(instrument);
                const measure = measureId ? MEASURES[measureId] : null;
                const history = measure ? data.outcomeMeasure?.instances?.[measureId]?.history : null;
                const latest = history?.length ? history[history.length - 1] : null;
                const interp = latest ? measure.interpret(latest.score) : null;
                return (
                  <div key={instrument}>
                    <SubLabel>{instrument}</SubLabel>
                    {measure ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {latest ? (
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, background: "#FAFAFB" }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: interp?.color || BRAND.ink }}>{latest.score}{measure.unit}</span>
                            {interp && <span style={{ fontSize: "0.72rem", fontWeight: 700, color: interp.color }}>{interp.label}</span>}
                          </div>
                        ) : (
                          <input
                            type="text" value={v("outcome", instrument)} onChange={(e) => sv("outcome", instrument, e.target.value)}
                            placeholder="Enter score / activity" style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none" }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onStartOutcomeMeasure?.(measureId)}
                          style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 8, border: "none", background: BRAND.purple || "#7C3AED", color: "#fff", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          {latest ? "↻ Reassess" : "▶ Fill guided form"}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text" value={v("outcome", instrument)} onChange={(e) => sv("outcome", instrument, e.target.value)}
                        placeholder="Enter score / activity" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </ModuleCard>
          </>}

          </div>
          <div className="obj-subtopic-nav">
            <button
              type="button" className="obj-subtopic-nav-btn back"
              disabled={SUBTOPICS.findIndex((s) => s.key === activeSubtopic) === 0}
              onClick={() => {
                const i = SUBTOPICS.findIndex((s) => s.key === activeSubtopic);
                if (i > 0) setActiveSubtopic(SUBTOPICS[i - 1].key);
              }}
            >
              ← Back
            </button>
            <button
              type="button" className="obj-subtopic-nav-btn next"
              disabled={SUBTOPICS.findIndex((s) => s.key === activeSubtopic) === SUBTOPICS.length - 1}
              onClick={() => {
                const i = SUBTOPICS.findIndex((s) => s.key === activeSubtopic);
                if (i < SUBTOPICS.length - 1) setActiveSubtopic(SUBTOPICS[i + 1].key);
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// v1-only (Hip/Knee/Ankle-Foot's own resisted-test chip vocabulary — same
// Cyriax strong/weak x painful/painless vocabulary CYRIAX_REGIONS_DATA
// already uses elsewhere in the app).
const RESISTED_TEST_OPTIONS_V1 = ["Strong + Painless", "Strong + Painful", "Weak + Painless", "Weak + Painful"];

// The textbook Cyriax reading of the classic Strong/Weak x Painful/Painless
// resisted-test combo — exact per standard selective tension testing
// teaching, used whenever a chip matches one of these four (v1's own
// RESISTED_TEST_OPTIONS_V1, or any v2 condition whose "resisted" options
// happen to use the same wording, e.g. rotator cuff Empty Can). Matched by
// prefix so parenthetical condition-specific suffixes like "Strong +
// Painful (tendinopathy)" still hit.
const CLASSIC_RESISTED_INTERPRETATION = [
  [/^strong\s*\+\s*painless/i, "Normal — no significant lesion of the contractile unit (muscle/tendon) indicated."],
  [/^strong\s*\+\s*painful/i, "Minor lesion of the contractile unit — e.g. tendinopathy or a minor muscle/tendon strain."],
  [/^weak\s*\+\s*painless/i, "Suggests a complete rupture of the muscle/tendon, or a neurological lesion (nerve root or peripheral nerve). Painless weakness is a red flag — correlate with myotome/reflex testing."],
  [/^weak\s*\+\s*painful/i, "Suggests a major partial tear or a more serious lesion of the contractile unit — correlate clinically and consider imaging."],
];

// Generic flag classifier for the enormous free-text option vocabulary
// used across every condition's sttt.resisted/passive options (AC joint's
// "No localized AC pain" vs a myotome's "Weak" vs a ligament test's
// "Excessive range, soft/hypermobile end-feel", etc.) — keyword-matched
// so every STTT chip in the app gets a genuinely reactive interpretation
// instead of the same static per-condition text regardless of selection
// (2026-09-10, Aditi: "whatever we select, it should interpret what it
// should mean, according to the saved knowledge of STT").
function sttFlags(text) {
  const t = (text || "").toLowerCase();
  const has = (re) => re.test(t);
  let pain = null;
  if (has(/\bpainless\b|no\s+[a-z\- ]*pain|no\s+(groin|leg|arm|joint-line|lateral|snap|nodule|change|reproduction)|\bnegative\b|non-?provocative|no reproduction|preserved\/?normal|usually preserved|no true weakness/)) pain = false;
  else if (has(/\bpainful\b|\bpositive\b|reproduc|laxity reproduced|catching|clunk|pain reproduced|tender/)) pain = true;
  let weak = null;
  if (has(/\bweak\b|absent\/severely weak|diminished|altered/)) weak = true;
  else if (has(/\bstrong\b|normal sensation|full active extension/)) weak = false;
  let restricted = null;
  if (has(/restrict|hypomobile|capsular|rigid|bony end-feel|guard/)) restricted = true;
  else if (has(/hypermobile|excessive.*(range|mobility)/)) restricted = false;
  let hypermobile = has(/hypermobile|excessive.*(range|mobility)/) ? true : null;
  return { pain, weak, restricted, hypermobile };
}

// One reactive line per selected chip — checked against the exact Cyriax
// wording first (precise textbook teaching), falling back to the generic
// flag classifier for every other free-text option in the library.
function interpretSttOption(option) {
  if (!option) return null;
  for (const [re, text] of CLASSIC_RESISTED_INTERPRETATION) {
    if (re.test(option.trim())) return text;
  }
  const { pain, weak, restricted, hypermobile } = sttFlags(option);
  const parts = [];
  if (pain === true) parts.push("reproduces symptoms — suggests this structure/movement is a pain source");
  if (pain === false) parts.push("no symptoms reproduced — this structure/movement is less likely the primary pain source");
  if (weak === true) parts.push("reduced strength noted — consider partial/complete tear or neurological involvement");
  if (weak === false) parts.push("strength preserved");
  if (restricted === true) parts.push("restricted/capsular-pattern movement — suggests joint capsule or periarticular involvement");
  if (hypermobile === true) parts.push("excessive range/laxity — consider ligamentous insufficiency or instability");
  if (!parts.length) return null;
  const line = parts.join("; ");
  return line.charAt(0).toUpperCase() + line.slice(1) + ".";
}

// Combined paragraph for the Clinical Interpretation box, synthesizing
// every selected resisted + passive chip instead of a single fixed string
// — same classic-pattern-first, generic-fallback approach as
// interpretSttOption, plus the specific resisted+passive interplay Cyriax
// teaches (painful resisted + painless passive = contractile source;
// painful passive too = inert structure also implicated).
function sttOverallInterpretation(resistedSelections, passiveSelections) {
  const resisted = resistedSelections.filter(Boolean);
  const passive = passiveSelections.filter(Boolean);
  if (!resisted.length && !passive.length) return null;

  const sentences = [];
  const classicHit = resisted.map((o) => CLASSIC_RESISTED_INTERPRETATION.find(([re]) => re.test(o.trim()))).find(Boolean);
  if (classicHit) sentences.push(classicHit[1]);

  resisted.forEach((o) => {
    if (CLASSIC_RESISTED_INTERPRETATION.some(([re]) => re.test(o.trim()))) return; // already covered by classicHit
    const line = interpretSttOption(o);
    if (line) sentences.push(line);
  });

  const passiveFlags = passive.map(sttFlags);
  if (passiveFlags.some((f) => f.pain === true)) {
    sentences.push("Painful passive movement also implicates an inert structure (joint capsule, ligament, or bursa) — or a more significant contractile lesion stretched passively.");
  } else if (passiveFlags.some((f) => f.pain === false) && !classicHit) {
    sentences.push("Passive movement was pain-free, which points away from primary inert-structure involvement at this position.");
  } else {
    passive.forEach((o) => {
      const line = interpretSttOption(o);
      if (line) sentences.push(line);
    });
  }

  return sentences.length ? sentences.join(" ") : null;
}

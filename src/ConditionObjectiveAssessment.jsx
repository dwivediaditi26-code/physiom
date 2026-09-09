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
import React, { useMemo, useState } from "react";
import { BRAND, useSectionData } from "./orthoFieldKit.jsx";
import { runCervicalDifferential, hasCervicalChecklistData } from "./orthoCervicalReasoning.js";
import { runThoracicDifferential, hasThoracicChecklistData } from "./orthoThoracicReasoning.js";
import { runLumbarDifferential, hasLumbarChecklistData } from "./orthoLumbarReasoning.js";
import { runShoulderDifferential, hasShoulderChecklistData } from "./orthoShoulderReasoning.js";
import { runHipDifferential, hasHipChecklistData } from "./orthoHipReasoning.js";
import { runKneeDifferential, hasKneeChecklistData } from "./orthoKneeReasoning.js";
import { runAnkleFootDifferential, hasAnkleFootChecklistData } from "./orthoAnkleFootReasoning.js";
import cervicalConditionsRaw from "./cervicalConditions.json";
import thoracicConditionsRaw from "./thoracicConditions.json";
import lumbarConditionsRaw from "./lumbarConditions.json";
import shoulderConditionsRaw from "./shoulderConditions.json";
import hipConditionsRaw from "./hipConditions.json";
import kneeConditionsRaw from "./kneeConditions.json";
import ankleFootConditionsRaw from "./ankleFootConditions.json";
import { HIP_ROM_MOVEMENTS } from "./hipConditionAssessmentData.js";
import { KNEE_ROM_MOVEMENTS } from "./kneeConditionAssessmentData.js";
import { ANKLE_FOOT_ROM_MOVEMENTS } from "./ankleFootConditionAssessmentData.js";

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
    hasData: (data) => hasCervicalChecklistData(data.subjective?.regions?.cervical),
    run: (data) => runCervicalDifferential(data.subjective?.regions?.cervical, data.subjective),
    conditions: CERVICAL_CONDITIONS, order: CERVICAL_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: CERVICAL_ROM_MOVEMENTS, romLabel: "Cervical ROM",
    emptyNote: "Pick Cervical as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "thoracic", label: "Thoracic Spine", schema: "v2",
    matchesRegion: (r) => r.id === "thoracic",
    hasData: (data) => hasThoracicChecklistData(data.subjective?.regions?.thoracic),
    run: (data) => runThoracicDifferential(data.subjective?.regions?.thoracic, data.subjective),
    conditions: THORACIC_CONDITIONS, order: THORACIC_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    romMovements: THORACIC_ROM_MOVEMENTS, romLabel: "Thoracic ROM",
    emptyNote: "Pick Thoracic as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "lumbar", label: "Lumbar / SI", schema: "v2",
    matchesRegion: (r) => ["lumbar", "sacrum", "pelvis"].includes(r.id),
    hasData: (data) => hasLumbarChecklistData(data.subjective?.regions?.lumbarSI),
    run: (data) => runLumbarDifferential(data.subjective?.regions?.lumbarSI, data.subjective),
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
    romMovements: SHOULDER_ROM_MOVEMENTS, romLabel: "Shoulder ROM",
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
    romMovements: HIP_ROM_MOVEMENTS, romLabel: "Hip ROM",
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
    romMovements: KNEE_ROM_MOVEMENTS, romLabel: "Knee ROM",
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
    romMovements: ANKLE_FOOT_ROM_MOVEMENTS, romLabel: "Ankle ROM",
    emptyNote: "Pick Ankle or Foot as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
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

function ModuleCard({ label, color, defaultOpen = true, children }) {
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
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
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
        background: active ? BRAND.purpleFaint : "#fff",
        color: active ? BRAND.purpleDark : BRAND.ink,
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

function SubLabel({ children }) {
  return <div style={{ fontSize: "0.76rem", fontWeight: 600, color: BRAND.gray, marginBottom: 6 }}>{children}</div>;
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

export default function ConditionObjectiveAssessment({ data, setData, selectedRegions }) {
  const regions = selectedRegions || [];
  const config = REGION_CONFIGS.find((cfg) => regions.some(cfg.matchesRegion)) || REGION_CONFIGS[0];

  const [state, setField] = useSectionData(data, setData, `conditionAssessment_${config.key}`);
  const [activeId, setActiveId] = useState(null);
  const [analysisRun, setAnalysisRun] = useState(false);

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
        onClick={() => setAnalysisRun(true)}
        style={{
          position: "sticky", top: 0, zIndex: 20, width: "100%", height: 52, padding: "0 14px", borderRadius: 12,
          border: `1px solid ${BRAND.purple}30`, background: `${BRAND.purple}0f`, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, marginBottom: 4, textAlign: "left",
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: BRAND.purple, display: "flex", alignItems: "center", gap: 5 }}>
            🧠 Suggest probable objective assessment
          </span>
          <span style={{ fontSize: "0.7rem", color: BRAND.gray }}>
            {engineResult ? `${config.label} — ${rankedCount} condition${rankedCount === 1 ? "" : "s"} matched from Subjective` : `${config.label} — no Subjective data yet`}
          </span>
        </span>
        <span style={{ fontSize: "0.76rem", fontWeight: 800, color: BRAND.purple, flexShrink: 0 }}>{analysisRun ? "Re-run →" : "Review →"}</span>
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

          <ModuleCard label="Observation" color="#7C3AED">
            <ChipGroup options={isV1 ? condition.observationChecklist : condition.observation} selected={v("observation", "chips")} onToggle={(o) => toggleMulti("observation", "chips", o)} />
          </ModuleCard>

          <ModuleCard label="Posture" color="#3B82F6">
            <ChipGroup options={isV1 ? condition.postureChecklist : condition.posture} selected={v("posture", "chips")} onToggle={(o) => toggleMulti("posture", "chips", o)} />
          </ModuleCard>

          <ModuleCard label="Palpation" color={BRAND.red}>
            {isV1 ? (
              condition.palpationZones ? (
                <ChipGroup options={condition.palpationZones} selected={v("palpation", "chips")} onToggle={(o) => toggleMulti("palpation", "chips", o)} />
              ) : (
                <EmptyNote>Not specified in condition library.</EmptyNote>
              )
            ) : condition.palpation.length > 0 ? (
              <ChipGroup options={condition.palpation} selected={v("palpation", "chips")} onToggle={(o) => toggleMulti("palpation", "chips", o)} />
            ) : (
              <EmptyNote>Not specified in condition library.</EmptyNote>
            )}
          </ModuleCard>

          {config.romMovements && (
            <ModuleCard label={config.romLabel} color="#059669">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {config.romMovements.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8rem", color: BRAND.ink, fontWeight: 600 }}>{m.label}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        value={v("rom", m.id)}
                        onChange={(e) => sv("rom", m.id, e.target.value)}
                        placeholder="—"
                        style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", textAlign: "center", outline: "none" }}
                      />
                      <span style={{ fontSize: "0.75rem", color: BRAND.grayLight }}>° normal {m.normal}°</span>
                    </span>
                  </div>
                ))}
              </div>
            </ModuleCard>
          )}

          <ModuleCard label="Special Tests" color="#8B5CF6">
            {specialTestItems && specialTestItems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {specialTestItems.map((raw) => {
                  // Thoracic's specialTests are {name} objects; other v2
                  // regions use plain strings — normalize both.
                  const t = typeof raw === "string" ? raw : raw.name;
                  return (
                    <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: BRAND.ink }}>{t}</span>
                      <ChipGroup options={["Negative", "Positive"]} selected={v("special", t)} onToggle={(o) => toggleSingle("special", t, o)} multi={false} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyNote>Not specified in condition library.</EmptyNote>
            )}
          </ModuleCard>

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
                </GreenBox>
              )}
              <PurpleBox title="Clinical Interpretation">{condition.resistedNarrative}</PurpleBox>
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
                  {(condition.sttt.resisted || []).length > 0 && (
                    <>
                      <div style={{ marginBottom: 12, fontSize: "0.72rem", fontWeight: 700, color: BRAND.gray, textTransform: "uppercase" }}>Resisted</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {condition.sttt.resisted.map((f, i) => (
                          <div key={i}>
                            <SubLabel>{f.label}</SubLabel>
                            <ChipGroup options={f.options} selected={v("sttt", "r" + i)} onToggle={(o) => toggleSingle("sttt", "r" + i, o)} multi={false} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {(condition.sttt.passive || []).length > 0 && (
                    <>
                      <div style={{ marginTop: 16, marginBottom: 8, fontSize: "0.72rem", fontWeight: 700, color: BRAND.gray, textTransform: "uppercase" }}>Passive</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {condition.sttt.passive.map((f, i) => (
                          <div key={i}>
                            <SubLabel>{f.label}</SubLabel>
                            <ChipGroup options={f.options} selected={v("sttt", "p" + i)} onToggle={(o) => toggleSingle("sttt", "p" + i, o)} multi={false} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {(condition.sttt.findings || []).length > 0 && (
                    <GreenBox title="Findings">
                      {condition.sttt.findings.map((f, i) => (
                        <div key={i} style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 3 }}>✓ {f}</div>
                      ))}
                    </GreenBox>
                  )}
                  {condition.sttt.interpretation && (
                    <PurpleBox title="Clinical Interpretation">{condition.sttt.interpretation}</PurpleBox>
                  )}
                </>
              )}
            </ModuleCard>
          )}

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
                {condition.cpa.muscles.map((m, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <SubLabel>{m.name} — <span style={{ color: BRAND.amber }}>{m.state}</span></SubLabel>
                    <Chip active={!!v("cpa", "m" + i)} onClick={() => toggleSingle("cpa", "m" + i, v("cpa", "m" + i) ? "" : "confirmed")}>✓ Confirmed on exam</Chip>
                  </div>
                ))}
                <PurpleBox title="Clinical Interpretation">{condition.cpa.pattern}</PurpleBox>
              </>
            )}
          </ModuleCard>

          {isV1 ? (
            <ModuleCard label="Kinetic Chain" color="#4F46E5" defaultOpen={!condition.kineticChain.notApplicable}>
              <SubLabel>{condition.kineticChain.testName}</SubLabel>
              {condition.kineticChain.notApplicable ? (
                <div style={{ fontSize: "0.8rem", color: BRAND.grayLight, lineHeight: 1.5, fontStyle: "italic" }}>{condition.kineticChain.chainEffect}</div>
              ) : (
                <>
                  <ChipGroup options={condition.kineticChain.chipOptions} selected={v("kineticChain", "state")} onToggle={(o) => toggleSingle("kineticChain", "state", o)} multi={false} />
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
                  <SubLabel>{condition.kineticChain.name}</SubLabel>
                  {condition.kineticChain.fields.map((f, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <SubLabel>{f.label}</SubLabel>
                      <ChipGroup options={f.options} selected={v("kineticChain", "f" + i)} onToggle={(o) => toggleSingle("kineticChain", "f" + i, o)} multi={false} />
                    </div>
                  ))}
                  <BlueBox title="Chain Effect">{condition.kineticChain.chainEffect}</BlueBox>
                </>
              )}
            </ModuleCard>
          )}

          {isV1 ? (
            <ModuleCard label="Functional Screen" color="#16A34A" defaultOpen={false}>
              <SubLabel>{condition.functionalScreen.testName}</SubLabel>
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
                </div>
              )}
              {condition.functionalScreen.note && <PurpleBox title="Note">{condition.functionalScreen.note}</PurpleBox>}
            </ModuleCard>
          ) : (
            <ModuleCard label="Functional Screen" color="#16A34A" defaultOpen={false}>
              {condition.functionalScreen.applicable === false ? (
                <EmptyNote>{condition.functionalScreen.reason}</EmptyNote>
              ) : (
                <>
                  <SubLabel>{condition.functionalScreen.name}</SubLabel>
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
                    </div>
                  ))}
                  {condition.functionalScreen.note && <PurpleBox title="Note">{condition.functionalScreen.note}</PurpleBox>}
                </>
              )}
            </ModuleCard>
          )}

          {condition.fascia && (
            <ModuleCard label="Fascia" color="#EC4899" defaultOpen={false}>
              <div style={{ fontSize: "0.8rem", color: BRAND.ink, lineHeight: 1.5 }}>{condition.fascia}</div>
            </ModuleCard>
          )}

          <ModuleCard label="Outcome Measures" color={BRAND.gray} defaultOpen={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(isV1 ? condition.outcome.split(";").map((s) => s.trim()).filter(Boolean) : condition.outcomeMeasures).map((instrument) => (
                <div key={instrument}>
                  <SubLabel>{instrument}</SubLabel>
                  <input
                    type="text" value={v("outcome", instrument)} onChange={(e) => sv("outcome", instrument, e.target.value)}
                    placeholder="Enter score / activity" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none" }}
                  />
                </div>
              ))}
            </div>
          </ModuleCard>
        </>
      )}
    </div>
  );
}

// v1-only (Hip/Knee/Ankle-Foot's own resisted-test chip vocabulary — same
// Cyriax strong/weak x painful/painless vocabulary CYRIAX_REGIONS_DATA
// already uses elsewhere in the app).
const RESISTED_TEST_OPTIONS_V1 = ["Strong + Painless", "Strong + Painful", "Weak + Painless", "Weak + Painful"];

// ConditionObjectiveAssessment.jsx
//
// Standalone, condition-wise Objective Assessment page for the AI Outpatient
// Ortho wizard — a faithful clone of the claude.ai artifact prototype
// originally built for Cervical, now generalized across every region that
// has one: Cervical, Hip, Knee, Ankle/Foot. NOT a rendering of the app's
// existing ROM/MMT/Special Tests/Cyriax/NKT modules — those stay completely
// untouched; this is new, self-contained UI.
//
// The one thing it reuses from the rest of the app is the front door: which
// condition is ranked top for whichever region was picked in Subjective
// comes from the real Phase 0.5 differential the app already runs
// (runCervicalDifferential / runHipDifferential / runKneeDifferential /
// runAnkleFootDifferential — all unmodified, read-only imports). Everything
// after that — every module, every chip, every field — is this page's own
// state, written into its own data.conditionAssessment_<region> section via
// the same useSectionData pattern every other wizard step already uses, so
// it can't collide with the old "suggest" step's fields.
//
// Cervical runs on a hand-authored condition library (required/recommended
// test split, a fixed 6-movement Cyriax resisted/passive battery). Hip/Knee/
// Ankle-Foot run on the app's real evidence-model engine (hip.evidence.json
// / knee.evidence.json / ankle.evidence.json+foot.evidence.json) — each
// condition carries one Key Exams list instead of a required/recommended
// split, and one specific resisted test (per that condition's own STTT
// prose) instead of a fixed 6-movement resisted grid. Every region does get
// its own numeric AROM grid, though — each region's `romMovements` list
// uses the same real movement ids/normal-value degrees the app's actual ROM
// module and each orthoXReasoning.js's own ROM_IDS already use (Hip:
// flex/ext/abd/add/ER/IR; Knee: flex/ext; Ankle: DF/PF/inversion/eversion).
// Both content sources were verified against the real reference PDF
// page-by-page (see the per-region data files' own header comments for
// exactly what's verbatim vs. structured from verbatim text).
import React, { useMemo, useState } from "react";
import { BRAND, useSectionData } from "./orthoFieldKit.jsx";
import { runCervicalDifferential, hasCervicalChecklistData } from "./orthoCervicalReasoning.js";
import { runHipDifferential, hasHipChecklistData } from "./orthoHipReasoning.js";
import { runKneeDifferential, hasKneeChecklistData } from "./orthoKneeReasoning.js";
import { runAnkleFootDifferential, hasAnkleFootChecklistData } from "./orthoAnkleFootReasoning.js";
import {
  CERVICAL_CONDITIONS, CERVICAL_CONDITION_ORDER, CERVICAL_ROM_MOVEMENTS,
  RESISTED_TEST_OPTIONS, PASSIVE_ROM_OPTIONS, PASSIVE_PATTERN_OPTIONS, PASSIVE_PAIN_OPTIONS,
} from "./cervicalConditionAssessmentData.js";
import { HIP_CONDITIONS, HIP_CONDITION_ORDER, HIP_ROM_MOVEMENTS } from "./hipConditionAssessmentData.js";
import { KNEE_CONDITIONS, KNEE_CONDITION_ORDER, KNEE_ROM_MOVEMENTS } from "./kneeConditionAssessmentData.js";
import { ANKLE_FOOT_CONDITIONS, ANKLE_FOOT_CONDITION_ORDER, ANKLE_FOOT_ROM_MOVEMENTS } from "./ankleFootConditionAssessmentData.js";

const HAIRLINE = "#E5E7EB";

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

// One entry per supported region. `sttMode: "cervical"` renders the fixed
// 6-movement Cyriax resisted/passive battery; "single" renders one
// resisted-test chip group tied to that condition's own named test (per
// the PDF's condition-specific STTT prose). `romMovements` is a real,
// region-specific AROM list (same ids/normals orthoXReasoning.js's own
// ROM_IDS and the app's real ROM module use) — every region gets a ROM
// grid, just with each region's own real movement set.
const REGION_CONFIGS = [
  {
    key: "cervical", label: "Cervical Spine",
    matchesRegion: (r) => r.id === "cervical",
    hasData: (data) => hasCervicalChecklistData(data.subjective?.regions?.cervical),
    run: (data) => runCervicalDifferential(data.subjective?.regions?.cervical, data.subjective),
    conditions: CERVICAL_CONDITIONS, order: CERVICAL_CONDITION_ORDER,
    getRedFlag: cervicalRedFlag,
    suggestedTestsMode: "split",
    sttMode: "cervical",
    romMovements: CERVICAL_ROM_MOVEMENTS, romLabel: "Cervical ROM",
    emptyNote: "Pick Cervical as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "hip", label: "Hip / Groin",
    matchesRegion: (r) => r.id === "hip",
    hasData: (data) => hasHipChecklistData(data),
    run: (data) => runHipDifferential(data),
    conditions: HIP_CONDITIONS, order: HIP_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    sttMode: "single",
    romMovements: HIP_ROM_MOVEMENTS, romLabel: "Hip ROM",
    emptyNote: "Pick Hip as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "knee", label: "Knee",
    matchesRegion: (r) => r.id === "knee",
    hasData: (data) => hasKneeChecklistData(data),
    run: (data) => runKneeDifferential(data),
    conditions: KNEE_CONDITIONS, order: KNEE_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    sttMode: "single",
    romMovements: KNEE_ROM_MOVEMENTS, romLabel: "Knee ROM",
    emptyNote: "Pick Knee as a region in Subjective first — this page shows the condition-wise objective assessment for it.",
  },
  {
    key: "ankleFoot", label: "Ankle / Foot",
    matchesRegion: (r) => r.id === "ankle" || r.id === "foot",
    hasData: (data) => hasAnkleFootChecklistData(data),
    run: (data) => runAnkleFootDifferential(data),
    conditions: ANKLE_FOOT_CONDITIONS, order: ANKLE_FOOT_CONDITION_ORDER,
    getRedFlag: evidenceModelRedFlag,
    suggestedTestsMode: "single",
    sttMode: "single",
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

export default function ConditionObjectiveAssessment({ data, setData, selectedRegions }) {
  const regions = selectedRegions || [];
  const config = REGION_CONFIGS.find((cfg) => regions.some(cfg.matchesRegion)) || REGION_CONFIGS[0];

  const [state, setField] = useSectionData(data, setData, `conditionAssessment_${config.key}`);
  const [activeId, setActiveId] = useState(null);

  const regionPicked = regions.some(config.matchesRegion);

  const engineResult = useMemo(() => {
    if (!regionPicked) return null;
    try {
      if (!config.hasData(data)) return null;
      return config.run(data);
    } catch { return null; }
  }, [regionPicked, config, data]);

  const matchById = useMemo(
    () => Object.fromEntries((engineResult?.conditions || []).map((c) => [c.id, c])),
    [engineResult]
  );
  const rankedIds = useMemo(
    () => (engineResult ? engineResult.conditions.filter((c) => c.matchTier !== "Unlikely").map((c) => c.id) : []),
    [engineResult]
  );
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

  const isCervical = config.sttMode === "cervical";

  // Findings — only what's actually been tapped on this page so far, no
  // invented claims. Built from the same fields the chip groups below write.
  const findings = [];
  if (isCervical) {
    const resistedSummary = CERVICAL_ROM_MOVEMENTS.map((m) => v("resisted", m.id)).filter(Boolean);
    if (resistedSummary.length) findings.push(`Resisted tests: ${resistedSummary.length} of ${CERVICAL_ROM_MOVEMENTS.length} movements recorded`);
    if (v("passive", "rom")) findings.push(`Passive/active ROM — ${v("passive", "rom")}`);
    if (v("passive", "pattern")) findings.push(`Pattern — ${v("passive", "pattern")}`);
    if (v("passive", "pain")) findings.push(`Pain — ${v("passive", "pain")}`);
  } else {
    if (v("resisted", "test")) findings.push(`${condition.resistedTestName} — ${v("resisted", "test")}`);
  }
  if (config.romMovements) {
    const romEntered = config.romMovements.filter((m) => v("rom", m.id)).length;
    if (romEntered) findings.push(`${config.romLabel} — ${romEntered} of ${config.romMovements.length} movements measured`);
  }
  if (v("observation", "chips")) findings.push(`Observation — ${v("observation", "chips")}`);
  if (v("posture", "chips")) findings.push(`Posture — ${v("posture", "chips")}`);

  const matchedCondition = engineResult?.conditions.find((c) => c.id === selectedId);
  const specialTestItems = isCervical ? condition.specialTests : condition.keyExams;

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
                {condition.requiredTests.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <div>
              <SubLabel>Recommended</SubLabel>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: BRAND.gray, lineHeight: 1.6 }}>
                {condition.recommendedTests.map((t, i) => <li key={i}>{t}</li>)}
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
        <ChipGroup options={condition.observationChecklist} selected={v("observation", "chips")} onToggle={(o) => toggleMulti("observation", "chips", o)} />
      </ModuleCard>

      <ModuleCard label="Posture" color="#3B82F6">
        <ChipGroup options={condition.postureChecklist} selected={v("posture", "chips")} onToggle={(o) => toggleMulti("posture", "chips", o)} />
      </ModuleCard>

      <ModuleCard label="Palpation" color={BRAND.red}>
        {condition.palpationZones ? (
          <ChipGroup options={condition.palpationZones} selected={v("palpation", "chips")} onToggle={(o) => toggleMulti("palpation", "chips", o)} />
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
        {specialTestItems ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {specialTestItems.map((t) => (
              <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: BRAND.ink }}>{t}</span>
                <ChipGroup options={["Negative", "Positive"]} selected={v("special", t)} onToggle={(o) => toggleSingle("special", t, o)} multi={false} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote>Not specified in condition library.</EmptyNote>
        )}
      </ModuleCard>

      <ModuleCard label="STTT — Cyriax" color="#0D9488">
        <SubLabel>{condition.resistedNarrative}</SubLabel>

        {isCervical ? (
          <>
            <div style={{ marginTop: 6, marginBottom: 12, fontSize: "0.72rem", fontWeight: 700, color: BRAND.gray, textTransform: "uppercase" }}>Resisted</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CERVICAL_ROM_MOVEMENTS.map((m) => (
                <div key={m.id}>
                  <SubLabel>Resisted {m.label}</SubLabel>
                  <ChipGroup options={RESISTED_TEST_OPTIONS} selected={v("resisted", m.id)} onToggle={(o) => toggleSingle("resisted", m.id, o)} multi={false} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, marginBottom: 8, fontSize: "0.72rem", fontWeight: 700, color: BRAND.gray, textTransform: "uppercase" }}>Passive</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <SubLabel>Active/Passive ROM</SubLabel>
                <ChipGroup options={PASSIVE_ROM_OPTIONS} selected={v("passive", "rom")} onToggle={(o) => toggleSingle("passive", "rom", o)} multi={false} />
              </div>
              <div>
                <SubLabel>Pattern</SubLabel>
                <ChipGroup options={PASSIVE_PATTERN_OPTIONS} selected={v("passive", "pattern")} onToggle={(o) => toggleSingle("passive", "pattern", o)} multi={false} />
              </div>
              <div>
                <SubLabel>Pain</SubLabel>
                <ChipGroup options={PASSIVE_PAIN_OPTIONS} selected={v("passive", "pain")} onToggle={(o) => toggleSingle("passive", "pain", o)} multi={false} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 6 }}>
            <SubLabel>{condition.resistedTestName}</SubLabel>
            <ChipGroup options={RESISTED_TEST_OPTIONS} selected={v("resisted", "test")} onToggle={(o) => toggleSingle("resisted", "test", o)} multi={false} />
          </div>
        )}

        {findings.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: BRAND.greenBg, border: `1px solid ${BRAND.green}33` }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.green, marginBottom: 6 }}>Findings</div>
            {findings.map((f, i) => (
              <div key={i} style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 3 }}>✓ {f}</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 10, background: BRAND.purpleFaint, border: `1px solid ${BRAND.purple}33` }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.purpleDark, marginBottom: 6 }}>Clinical Interpretation</div>
          <div style={{ fontSize: "0.8rem", color: BRAND.purpleDark, lineHeight: 1.5 }}>{condition.resistedNarrative}</div>
        </div>
      </ModuleCard>

      <ModuleCard label="CPA — NKT" color="#D97706">
        {condition.cpaNkt.muscle && <SubLabel>{condition.cpaNkt.muscle}</SubLabel>}
        <div style={{ fontSize: "0.8rem", color: BRAND.ink, lineHeight: 1.5, marginBottom: 10 }}>{condition.cpaNkt.narrative}</div>
        <ChipGroup options={["Facilitated", "Inhibited", "Overactive"]} selected={v("cpaNkt", "state")} onToggle={(o) => toggleSingle("cpaNkt", "state", o)} multi={false} />
      </ModuleCard>

      <ModuleCard label="Kinetic Chain" color="#4F46E5" defaultOpen={!condition.kineticChain.notApplicable}>
        <SubLabel>{condition.kineticChain.testName}</SubLabel>
        {condition.kineticChain.notApplicable ? (
          <div style={{ fontSize: "0.8rem", color: BRAND.grayLight, lineHeight: 1.5, fontStyle: "italic" }}>{condition.kineticChain.chainEffect}</div>
        ) : (
          <>
            <ChipGroup options={condition.kineticChain.chipOptions} selected={v("kineticChain", "state")} onToggle={(o) => toggleSingle("kineticChain", "state", o)} multi={false} />
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#1D4ED8", marginBottom: 6 }}>Chain Effect</div>
              <div style={{ fontSize: "0.78rem", color: "#1E3A8A", lineHeight: 1.5 }}>✓ {condition.kineticChain.chainEffect}</div>
            </div>
          </>
        )}
      </ModuleCard>

      <ModuleCard label="Functional Screen" color="#16A34A" defaultOpen={false}>
        <SubLabel>{condition.functionalScreen.testName}</SubLabel>
        {condition.functionalScreen.measure.type === "number" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: condition.functionalScreen.secondaryChip ? 14 : 0 }}>
            <span style={{ fontSize: "0.78rem", color: BRAND.gray, flex: 1 }}>{condition.functionalScreen.measure.label}</span>
            <input
              type="number"
              value={v("functionalScreen", "measure")}
              onChange={(e) => sv("functionalScreen", "measure", e.target.value)}
              placeholder="—"
              style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", textAlign: "center", outline: "none" }}
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
            type="text"
            value={v("functionalScreen", "measure")}
            onChange={(e) => sv("functionalScreen", "measure", e.target.value)}
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
        {condition.functionalScreen.note && (
          <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: BRAND.purpleFaint, border: `1px solid ${BRAND.purple}33` }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: BRAND.purpleDark, marginBottom: 6 }}>Note</div>
            <div style={{ fontSize: "0.78rem", color: BRAND.purpleDark, lineHeight: 1.5 }}>{condition.functionalScreen.note}</div>
          </div>
        )}
      </ModuleCard>

      <ModuleCard label="Fascia" color="#EC4899" defaultOpen={false}>
        <div style={{ fontSize: "0.8rem", color: BRAND.ink, lineHeight: 1.5 }}>{condition.fascia}</div>
      </ModuleCard>

      <ModuleCard label="Outcome Measures" color={BRAND.gray} defaultOpen={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {condition.outcome.split(";").map((s) => s.trim()).filter(Boolean).map((instrument) => (
            <div key={instrument}>
              <SubLabel>{instrument}</SubLabel>
              <input
                type="text"
                value={v("outcome", instrument)}
                onChange={(e) => sv("outcome", instrument, e.target.value)}
                placeholder="Enter score / activity"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${HAIRLINE}`, fontSize: "0.8rem", outline: "none" }}
              />
            </div>
          ))}
        </div>
      </ModuleCard>
    </div>
  );
}

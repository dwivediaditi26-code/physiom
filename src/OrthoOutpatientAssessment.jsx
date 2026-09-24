import React, { useState, useMemo, useEffect } from "react";
import { StepNav, SelectField, SectionIntro, useSectionData, fmtVal, MissingDemographicsModal, missingDemographicsFields, BRAND } from "./orthoFieldKit.jsx";
import { AiJourneyDots, AiHubNav, RegionPicker } from "./orthoSetupKit.jsx";
import { Icon } from "./StepIcons.jsx";
import { formatBodyChartSummary } from "./BodyChartPro.jsx";
import { regionDisplayLabel, regionLabelList } from "./orthoRegionLibrary.js";
import { RomSection, MmtSection, SpecialTestsSection, JointMobilitySection, formatRomSection, formatMmtSection, formatSpecialTestsSection, formatJointMobilitySection } from "./orthoRegionAssessments.jsx";
import { VitalsSection, PainSection, GaitSection, BalanceSection, ActivityToleranceSection, NeuroScreenSection, LimbLengthSection, formatLimbLengthSection } from "./orthoCommonSections.jsx";
import { DemographicsSection, RedFlagScreenSection, SubjectiveSection, formatSubjectiveSection, PalpationSection, FunctionalAssessmentSection, ClinicalAssessmentSection, TreatmentTechniquesSection, formatTreatmentTechniquesSection, ProgressFollowUpSection } from "./orthoOutpatientSections.jsx";
import { ExercisePrescriptionSection, formatExercisePrescriptionSection } from "./orthoExercisePrescription.jsx";
import { HomeProtocolSection } from "./orthoHomeProtocol.jsx";
import { GeneralObservationSection, formatGeneralObservationSection } from "./orthoGeneralObservation.jsx";
import { formatRedFlagsSection } from "./orthoRedFlagScreen.jsx";
import { palpationStructureRows } from "./orthoPalpationData.js";
import { KineticChainSection, CpaSection, SttSection, FmaSection, FasciaSection, formatKineticChainSection, formatCpaSection, formatSttSection, formatFmaSection, formatFasciaSection } from "./orthoAdvancedTools.jsx";
import OrthoSuggestObjectiveStep from "./OrthoSuggestObjectiveStep.jsx";
import ConditionObjectiveAssessment, { formatConditionObjectiveSection } from "./ConditionObjectiveAssessment.jsx";
import { OrthoCarePlanStep } from "./OrthoCarePlan.jsx";
import { formatCarePlanSection } from "./NeuroCarePlan.jsx";
import OrthoOutcomeMeasureFlow, { formatOutcomeMeasureSection } from "./OrthoOutcomeMeasureFlow.jsx";
import { useWizardStepHistory } from "./useWizardStepHistory.js";
import { AssessmentSummary } from "./orthoSummary.jsx";
import { saveTemplate } from "./orthoTemplates.js";
import { orthoStyles } from "./orthoStyles.js";

function regionLabelOf(r) {
  return [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ");
}

// Pain and Palpation both carry a JSON-blob field (the body chart / the
// palpation pin map) alongside their normal fields -- without these, the
// generic Object.entries fallback in orthoSummary.jsx would just dump the
// raw JSON string as one unreadable row. Chart/pin rows render first, then
// every other field in the section falls back to the normal formatting.
function restRows(rest) {
  return Object.entries(rest)
    .filter(([k]) => !k.startsWith("__"))
    .map(([k, v]) => ({ label: k, value: fmtVal(v) }))
    .filter((r) => r.value);
}
function formatPainSection(section) {
  const { body_chart_pro, ...rest } = section;
  return [...formatBodyChartSummary(body_chart_pro), ...restRows(rest)];
}
function formatPalpationSection(section) {
  // structures = the region-wise, structure-by-structure findings the
  // Palpation screen now records (orthoPalpationData.js); palp_pins = the
  // body map's own pins. Both are objects, so without these two the generic
  // Object.entries fallback would print them as unreadable blobs.
  const { palp_pins, structures, ...rest } = section;
  const structureRows = palpationStructureRows(structures || {});
  let pins = [];
  try { pins = JSON.parse(palp_pins || "[]"); } catch {}
  const pinRows = pins.map((p) => ({
    label: `${p.label}${p.side ? ` (${p.side === "front" ? "Anterior" : "Posterior"})` : ""}`,
    value: [
      (p.structure || []).length ? p.structure.join(", ") : null,
      p.tenderness ? `Grade ${p.tenderness} tenderness` : null,
      p.temp,
      (p.texture || []).length ? p.texture.join(", ") : null,
      p.notes,
    ].filter(Boolean).join(", ") || "marked, no detail",
  }));
  return [...structureRows, ...pinRows, ...restRows(rest)];
}

// Exported alongside buildOrthoAssessSteps (see below) so
// SpecialtyPatientProfile.jsx's Ortho Assessment tab can render nested,
// region-driven sections (ROM/MMT/Special Tests/Palpation/...) correctly
// instead of falling back to the generic Object.entries flattener.
export const orthoSummaryFormatters = {
  carePlanPlan: formatCarePlanSection,
  objectiveAI: (section) => section,
  subjective: formatSubjectiveSection,
  redFlags: formatRedFlagsSection,
  pain: formatPainSection,
  palpation: formatPalpationSection,
  observation: formatGeneralObservationSection,
  rom: formatRomSection,
  mmt: formatMmtSection,
  jointMobility: formatJointMobilitySection,
  specialTests: formatSpecialTestsSection,
  limbLength: formatLimbLengthSection,
  kineticChain: formatKineticChainSection,
  cpa: formatCpaSection,
  sttt: formatSttSection,
  fma: formatFmaSection,
  fascia: formatFasciaSection,
  outcomeMeasure: formatOutcomeMeasureSection,
  techniques: formatTreatmentTechniquesSection,
  exercisePrescription: formatExercisePrescriptionSection,
};

/* ============================================================
   CONDITION TEMPLATE ENGINE — Outpatient / Musculoskeletal
   pathway. Region + condition are chosen one screen earlier
   (see OrthoAssessment.jsx) — this module only builds and runs
   the resulting assessment. Lighter than IPD/Post-op: no bed
   mobility, no ward-level precautions/vitals by default.
   ============================================================ */
export const OUTPATIENT_CONDITIONS = [
  { id: "arthritis", icon: "🦴", label: "Arthritis / Degenerative", desc: "Chronic joint pain and functional decline", promote: ["balance", "activityTolerance", "outcomeMeasure"] },
  { id: "softTissue", icon: "🧵", label: "Soft-tissue Injury", desc: "Sprain, strain, tendinopathy", promote: ["edema", "activityTolerance", "outcomeMeasure", "cpa"] },
  { id: "spine", icon: "🦴", label: "Spine Condition", desc: "Neck / back pain, radiculopathy screen", promote: ["specialTests", "neuroScreen", "sttt", "activityTolerance", "outcomeMeasure"] },
  { id: "sportsOveruse", icon: "🏃", label: "Sports Injury / Overuse", desc: "Repetitive strain, sport-specific injury", promote: ["specialTests", "kineticChain", "fma", "activityTolerance", "outcomeMeasure"] },
  { id: "postSurgicalFollowUp", icon: "🩺", label: "Post-surgical Follow-up", desc: "OPD-stage recovery after discharge", promote: ["edema", "activityTolerance", "outcomeMeasure"] },
  { id: "painFunctional", icon: "😣", label: "Pain / Functional Limitation", desc: "No clear structural diagnosis yet", promote: ["cpa", "activityTolerance", "outcomeMeasure"] },
  { id: "other", icon: "❓", label: "Other", desc: "Doesn't fit the templates above", promote: ["activityTolerance"] },
];
const FALLBACK_PROMOTE = ["activityTolerance", "outcomeMeasure"];

// Order changed (2026-09-18, Aditi: "put the care plan after the problem
// list, care plan goal, care plan treatment then it should come the care
// plan and the care plan progress remove that") -- Care Plan (the plan
// overview) used to lead the group, ahead of Problem List; now it reads
// as the natural clinical sequence Problems -> Goals -> Treatment -> Plan
// -> Sessions. Care Plan Progress dropped from the active step list per
// the same request -- kept in STEP_META (below) so a record saved before
// this change still renders its old Progress step in Review/Summary,
// same as how "techniques" was retired.
const CAREPLAN_STEP_IDS = ["carePlanProblems", "carePlanGoals", "carePlanTreatment", "carePlanPlan", "carePlanSessions"];
const CAREPLAN_PHASE_BY_STEP = { carePlanProblems: "problems", carePlanGoals: "goals", carePlanTreatment: "treatment", carePlanPlan: "plan", carePlanSessions: "sessions", carePlanProgress: "progress" };
// specialTests moved from OPTIONAL_IDS to BASE_IDS (2026-09-16, Aditi:
// "why the special test is not showing constantly? It should show") -- it
// used to only appear when a condition's `promote` list named it (Spine,
// Sports/Overuse) or the therapist added it manually; now it's a standard
// step like ROM/MMT for every Outpatient entry.
// neuroScreen moved the same way (2026-09-18, Aditi: "there is neuro
// screen in the ortho outpatient. It's not showing in this assessment
// list. It should show permanently") -- it used to only appear when the
// Spine Condition complaint promoted it or the therapist added it
// manually via "Add assessment"; its findings now also feed the Care
// Plan's Problem List (orthoClinicalKnowledge.js's NEURO_SCREEN_PROBLEMS),
// so it needs to be available on every entry, not just Spine ones.
// "techniques" (Treatment Techniques) dropped from the default step list
// (2026-09-16, Aditi: "remove the treatment techniques as it's already in
// the care plan treatment") -- Care Plan Treatment (carePlanTreatment,
// part of CAREPLAN_STEP_IDS below) already records this, so it was a
// duplicate entry screen. Kept out of OPTIONAL_IDS too (not offered via
// "Add assessment"); still in ORDERED_ALL/STEP_META so a patient record
// saved before this change still renders correctly in Review/Summary.
// "exercisePrescription" retired the same way (2026-09-18, Aditi: "remove
// this exercise prescription that is present duplicate okay before the
// home protocol") -- Care Plan Treatment's own General Library tab already
// browses the full EXERCISE_DB by region (orthoClinicalKnowledge.js's
// fullExerciseLibrary flag, added 2026-09-11 specifically so it wasn't a
// narrower subset of this step's data), so this standalone step was a
// second, redundant exercise browser. Same backward-compat treatment: kept
// in ORDERED_ALL/STEP_META for old saved records.
// kineticChain / cpa / sttt / fma moved from OPTIONAL_IDS to BASE_IDS
// (2026-09-18, Aditi: "put the functional screen, kinetic chain, CPA, STTT,
// make it constant in the outpatient orthopedic assessment") -- same move
// specialTests/neuroScreen got: standard steps on every Outpatient entry
// instead of only when a condition promoted them or the therapist added
// them. AI-assisted entry skips them (AI_ENTRY_SKIP_IDS) since AI Objective
// already has CPA / Kinetic chain / Functional / STTT tabs inline.
// outcomeMeasure moved from OPTIONAL_IDS to BASE_IDS too (Aditi: "put the
// outcome measure in the general assessment") -- same move
// specialTests/neuroScreen/kineticChain/cpa/sttt/fma already got, standard
// on every Outpatient entry (General included) instead of only via
// "Add assessment" or a condition's own promote list.
const BASE_IDS = ["demographics", "subjective", "redFlags", "pain", "observation", "palpation", "suggest", "objectiveAI", "rom", "mmt", "jointMobility", "specialTests", "neuroScreen", "limbLength", "kineticChain", "cpa", "sttt", "fma", "functionalAssessment", "outcomeMeasure", "clinicalAssessment", ...CAREPLAN_STEP_IDS, "homeProtocol", "review"];
// General Assessment (2026-09-22, Aditi: split "how do you want to start"
// into General vs Advanced) -- General is now the quick/core OPD set;
// Advanced keeps the full BASE_IDS list above unchanged. Body Chart isn't
// its own step id (it's a sub-widget inside "pain", PainSection's own
// body_chart_pro field) so it isn't listed here -- it used to be hidden
// specifically in General Assessment (PainSection's hideBodyChart prop),
// dropped (Aditi: "why the pain assessment the body chart is removed") so
// Pain looks the same in General and Advanced.
// Palpation dropped back out of this trim list (Aditi: "the palpation is
// removed. Put the palpation... why did the palpation is removed?") --
// General Assessment now keeps it like every other core Objective step.
const GENERAL_TRIMMED_IDS = ["kineticChain", "cpa", "sttt", "fma", "carePlanSessions", "homeProtocol"];
const GENERAL_BASE_IDS = BASE_IDS.filter((id) => !GENERAL_TRIMMED_IDS.includes(id));
// AI Assisted Assessment entry only -- goes straight from Subjective into
// AI Objective Assessment (which already inline-covers Observation/
// Palpation/ROM/MMT itself), skipping these as separate steps in between.
// Condition-wise/General/Templates entries keep the full BASE_IDS sequence.
// "demographics" is skipped too (2026-09-16, Aditi: "first show demographic
// data") -- OrthoAssessment.jsx now collects it pre-wizard, one screen
// before Region, and feeds it in via initialAiUpdates.demographics exactly
// like an AI-parsed narrative already did.
const AI_ENTRY_SKIP_IDS = ["demographics", "redFlags", "pain", "observation", "palpation", "rom", "mmt", "specialTests", "kineticChain", "cpa", "sttt", "fma"];
const OPTIONAL_IDS = ["vitals", "edema", "fascia", "gait", "balance", "activityTolerance", "progress"];
// The AI-assisted journey's "Summary" stage (5th dot) -- everything after AI
// Objective Assessment, freely jumpable rather than forced Next-Next-Next
// (2026-09-16, Aditi: "we can select it from anywhere... it's not stuck").
const AI_HUB_IDS = ["functionalAssessment", "clinicalAssessment", ...CAREPLAN_STEP_IDS, "homeProtocol", "review"];
// Demographics(0)/Region(1) already happened pre-wizard for AI entry, so
// this component's own stages start at Subjective(2); anything in
// AI_HUB_IDS collapses onto the single "Summary" dot (4).
function aiStageIndexFor(id) {
  if (id === "demographics") return 0;
  if (id === "region") return 1;
  if (id === "subjective") return 2;
  if (id === "objectiveAI") return 3;
  return 4;
}
// All 5 stages are reachable from inside the wizard now (2026-09-16, Aditi:
// "why can't we select again the demographic and region... I can't go
// back") -- Demographics/Region via the one-off pseudo-steps
// jumpToDemographics()/jumpToRegion() insert; Subjective/AI Objective/
// Summary are already real steps.
const AI_WIZARD_JUMPABLE = new Set([0, 1, 2, 3, 4]);

const ORDERED_ALL = ["demographics", "subjective", "redFlags", "vitals", "pain", "observation", "palpation", "suggest", "objectiveAI", "edema", "rom", "mmt", "jointMobility", "specialTests", "neuroScreen", "limbLength", "kineticChain", "cpa", "sttt", "fma", "fascia", "gait", "balance", "functionalAssessment", "activityTolerance", "outcomeMeasure", "clinicalAssessment", ...CAREPLAN_STEP_IDS, "techniques", "exercisePrescription", "homeProtocol", "progress", "review"];

// Exported so SpecialtyPatientProfile.jsx's Ortho Assessment tab can render
// the EXACT same summary the wizard's own Review step uses (same pattern as
// CardiopulmonaryAssessment's buildCardioAssessSteps/SummarySection) instead
// of a separately-built generic renderer. The saved snapshot (onSave below)
// doesn't persist stepOrder, so this always returns the full canonical
// order -- AssessmentSummary already skips any step with no data.
export function buildOrthoAssessSteps() {
  return ORDERED_ALL.map((id) => ({ id, ...STEP_META[id] }));
}

const STEP_META = {
  demographics: { icon: <Icon name="clipboard" />, label: "Demographics" },
  // Not in BASE_IDS/ORDERED_ALL -- a one-off pseudo-step, inserted into
  // stepOrder on demand by jumpToRegion() (AI-assisted entry only), the
  // same trick jumpToDemographics() already uses.
  region: { icon: <Icon name="compass" />, label: "Body Region" },
  subjective: { icon: <Icon name="notes" />, label: "Subjective" },
  redFlags: { icon: <Icon name="flag" />, label: "Red Flag Screen" },
  vitals: { icon: <Icon name="heart" />, label: "Vital Signs" },
  pain: { icon: <Icon name="pain" />, label: "Pain" },
  observation: { icon: <Icon name="eye" />, label: "General Observation" },
  palpation: { icon: <Icon name="hand" />, label: "Palpation" },
  suggest: { icon: <Icon name="brain" />, label: "Suggested Objective" },
  objectiveAI: { icon: <Icon name="compass" />, label: "AI Objective Assessment" },
  edema: { icon: <Icon name="droplet" />, label: "Edema" },
  rom: { icon: <Icon name="ruler" />, label: "ROM" },
  mmt: { icon: <Icon name="muscle" />, label: "MMT" },
  jointMobility: { icon: <Icon name="bone" />, label: "Joint Mobility" },
  specialTests: { icon: <Icon name="microscope" />, label: "Special Tests" },
  neuroScreen: { icon: <Icon name="bolt" />, label: "Neuro Screen" },
  limbLength: { icon: <Icon name="ruler" />, label: "Limb Length" },
  kineticChain: { icon: <Icon name="chain" />, label: "Kinetic Chain" },
  cpa: { icon: <Icon name="brain" />, label: "CPA (NKT)" },
  sttt: { icon: <Icon name="bone" />, label: "STTT (Cyriax)" },
  fma: { icon: <Icon name="run" />, label: "Functional Movement" },
  fascia: { icon: <Icon name="thread" />, label: "Fascia" },
  gait: { icon: <Icon name="walk" />, label: "Gait / Movement" },
  balance: { icon: <Icon name="scale" />, label: "Balance" },
  functionalAssessment: { icon: <Icon name="run" />, label: "Functional Assessment" },
  activityTolerance: { icon: <Icon name="run" />, label: "Activity Tolerance" },
  outcomeMeasure: { icon: <Icon name="chart" />, label: "Outcome Measure" },
  clinicalAssessment: { icon: <Icon name="brain" />, label: "Clinical Assessment" },
  carePlanProblems: { icon: <Icon name="puzzle" />, label: "Problem List" },
  carePlanGoals: { icon: <Icon name="target" />, label: "Care Plan Goals" },
  carePlanTreatment: { icon: <Icon name="dumbbell" />, label: "Care Plan Treatment" },
  carePlanPlan: { icon: <Icon name="clipboard" />, label: "Care Plan" },
  carePlanSessions: { icon: <Icon name="calendar" />, label: "Sessions" },
  carePlanProgress: { icon: <Icon name="trend" />, label: "Care Plan Progress" },
  techniques: { icon: <Icon name="handshake" />, label: "Treatment Techniques" },
  exercisePrescription: { icon: <Icon name="dumbbell" />, label: "Exercise Prescription" },
  homeProtocol: { icon: <Icon name="home" />, label: "Home Protocol" },
  progress: { icon: <Icon name="trend" />, label: "Progress / Follow-up" },
  review: { icon: <Icon name="check" />, label: "Final Review" },
};

const ADD_LIBRARY = OPTIONAL_IDS.map((id) => ({ id, ...STEP_META[id] }));

function AddAssessmentModal({ activeIds, onToggle, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const items = query ? ADD_LIBRARY.filter((it) => it.label.toLowerCase().includes(query)) : ADD_LIBRARY;
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">🚶 Add Assessment</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ct-search-wrap">
        <input className="ct-search" placeholder="🔍 Search assessment..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      <div className="ct-modal-body">
        <div className="ct-group">
          <div className="ct-group-title">AVAILABLE ASSESSMENTS</div>
          {items.map((it) => {
            const checked = activeIds.has(it.id);
            return (
              <button type="button" key={it.id} className={"ct-item" + (checked ? " ct-item-checked" : "")} onClick={() => onToggle(it.id)}>
                <span className="ct-checkbox">{checked ? "☑" : "☐"}</span>
                <span>
                  {it.icon} {it.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="ct-modal-footer">
        <button type="button" className="primary-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function SaveTemplateModal({ defaultName, onSave, onClose }) {
  const [name, setName] = useState(defaultName || "");
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">💾 Save as Template</div>
        <button type="button" className="ct-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="ct-modal-body">
        <div className="hint" style={{ marginBottom: 10 }}>
          Saves this assessment's section list (not the patient data) so you can start from the same set of assessments next time — from Setup, pick "My Templates".
        </div>
        <div className="text-input-wrap">
          <input className="text-input" autoFocus placeholder="Template name, e.g. Knee OA — quick clinic visit" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div className="ct-modal-footer">
        <button type="button" className="primary-btn" disabled={!name.trim()} onClick={() => onSave(name)}>
          Save Template
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP — mounted by OrthoAssessment.jsx once region +
   condition have been picked on the preceding two screens.
   ============================================================ */
export default function OrthoOutpatientAssessment({ selectedRegions: initialSelectedRegions, condition: initialCondition, customConditionLabel, initialStepOrder, templateName, onExit, onNav, navContext, onSave, activePatientId, patientData, requireAuth, autoOpenAI, initialAiUpdates, entryMode, initialData, initialStep }) {
  // Editable, not a fixed prop (2026-09-16, Aditi: "why can't we select
  // again the demographic and region... I can't go back") -- AI-assisted
  // entry picks regions on a pre-wizard screen (OrthoAssessment.jsx) that
  // no longer exists once this component mounts, so re-opening that choice
  // has to live here now; see the "region" pseudo-step below.
  const [selectedRegions, setSelectedRegions] = useState(initialSelectedRegions);
  // See AI_ENTRY_SKIP_IDS above -- the one place both the initial stepOrder
  // and handleConditionDetected's later re-union need to agree on which
  // base steps are actually in play, so a mid-session condition detection
  // can never silently re-add a step the AI-entry sequence deliberately skipped.
  // "suggest" (Suggested Objective) is dropped for every entry mode
  // (2026-09-12, Aditi: "remove this objective assessment duplicate old
  // from AI section") -- once a condition is picked inside AI Objective
  // Assessment, that step's own Observation/Palpation subtopic tabs cover
  // the exact same ground Suggested Objective used to, making it pure
  // duplication for AI entry too, not just General/Condition-wise entry.
  // "AI Objective Assessment" is only useful for the AI-assisted entry
  // (it's the step that covers Observation/Palpation/ROM/MMT inline for
  // that flow) -- General/Condition-wise entry already gets those as their
  // own plain steps below, so showing objectiveAI there too was a second,
  // redundant tab (2026-09-16, Aditi: "remove the AI objective assessment
  // tab it should be normally basic").
  const effectiveBaseIds = (initialCondition === "general" ? GENERAL_BASE_IDS : BASE_IDS).filter(
    (id) => id !== "suggest" && (entryMode !== "ai" || !AI_ENTRY_SKIP_IDS.includes(id)) && (id !== "objectiveAI" || entryMode === "ai")
  );
  // `condition` used to be a plain prop, fixed for the whole assessment --
  // AI Assisted Assessment always enters with condition="general", which
  // meant Suggested Objective (orthoObjectiveSuggestions.js) could never
  // give condition-specific suggestions for an AI-assisted session, only
  // ever the generic baseline. Now it's live state: once the AI intake
  // panel (inside SubjectiveSection) classifies a specific condition from
  // the patient's own narrative, handleConditionDetected below promotes it
  // exactly as if the clinician had picked it manually on the
  // Condition-wise screen.
  // A condition the landing-screen extraction already classified (the AI
  // entry always arrives with condition="general") is promoted at mount,
  // exactly as handleConditionDetected does for an in-wizard extraction --
  // otherwise Suggested Objective spent the whole session on the generic
  // baseline even though the narrative had already been classified.
  const aiDetectedCondition =
    initialCondition === "general" && initialAiUpdates?.conditionCategory && initialAiUpdates.conditionCategory !== "other"
      ? OUTPATIENT_CONDITIONS.find((c) => c.id === initialAiUpdates.conditionCategory) || null
      : null;
  const [condition, setCondition] = useState(aiDetectedCondition ? aiDetectedCondition.id : initialCondition);
  const [detectedConditionLabel, setDetectedConditionLabel] = useState(aiDetectedCondition ? aiDetectedCondition.label : null);
  const conditionMeta = OUTPATIENT_CONDITIONS.find((c) => c.id === condition);
  const conditionLabel = templateName ? templateName : condition === "general" ? "General Assessment" : condition === "advanced" ? "Advanced Assessment" : conditionMeta ? conditionMeta.label : customConditionLabel || "Other";
  // Red-star "required for this condition" badge on StepNav (2026-09-16,
  // Aditi) -- reads the same promote list that already drives step
  // ordering, just surfaces it visually instead of only reordering silently.
  const requiredStepIds = useMemo(() => new Set(conditionMeta ? conditionMeta.promote : []), [conditionMeta]);

  const [stepOrder, setStepOrder] = useState(() => {
    if (initialStepOrder && initialStepOrder.length) return initialStepOrder.filter((id) => STEP_META[id]);
    const promoted = aiDetectedCondition ? aiDetectedCondition.promote : (initialCondition === "general" || initialCondition === "advanced") ? [] : conditionMeta ? conditionMeta.promote : FALLBACK_PROMOTE;
    // AI entry normally skips Red Flags and Pain as separate steps
    // (AI_ENTRY_SKIP_IDS) -- but not when the intake itself produced answers
    // for them: an extraction that recorded an NRS score or a red flag the
    // patient actually mentioned would otherwise fill a step the therapist
    // is never shown, which is exactly the "extracted but not in the form"
    // problem (2026-09-03, Aditi).
    const seeded = [];
    if (initialAiUpdates?.pain && Object.keys(initialAiUpdates.pain).length) seeded.push("pain");
    if (initialAiUpdates?.redFlags && Object.keys(initialAiUpdates.redFlags).length) seeded.push("redFlags");
    return ORDERED_ALL.filter((id) => effectiveBaseIds.includes(id) || promoted.includes(id) || seeded.includes(id));
  });
  // Only fires from SubjectiveSection's AI intake (orthoOutpatientSections.jsx),
  // and only if condition is still "general" -- never overrides a condition
  // the clinician picked explicitly on the Condition-wise screen. Unions the
  // detected condition's promoted steps into the existing stepOrder (by
  // canonical ORDERED_ALL position) rather than replacing it outright, so
  // any assessment already added manually is never lost.
  function handleConditionDetected(newCondition) {
    if (condition !== "general") return;
    const meta = OUTPATIENT_CONDITIONS.find((c) => c.id === newCondition);
    if (!meta) return;
    setCondition(newCondition);
    setDetectedConditionLabel(meta.label);
    setStepOrder((prev) => {
      const activeSet = new Set(prev);
      meta.promote.forEach((id) => activeSet.add(id));
      return ORDERED_ALL.filter((id) => effectiveBaseIds.includes(id) || activeSet.has(id));
    });
  }

  // initialStep (2026-09-02, Aditi: "edit assessment... should take us to
  // last page of assessment summary and review, not to pathway/region
  // selection") -- "Edit" from the patient profile resumes straight into
  // this wizard already on Review with the saved data loaded, instead of
  // always starting fresh at step 0. Falls back to 0 (the wizard's own
  // normal start) when there's nothing to resume.
  const [step, setStep] = useState(() => {
    if (!initialStep) return 0;
    const idx = stepOrder.indexOf(initialStep);
    return idx >= 0 ? idx : 0;
  });
  // Every wizard step shares the same scroll container, so it never gets a
  // fresh scrollTop of its own -- tapping a StepNav circle after scrolling
  // deep into the previous step used to land the new step already scrolled
  // down instead of at its top (2026-09-16, Aditi: "when I click on the
  // second tab, it takes me to that end scrolling page"). Same reset
  // AppFull.jsx's own navTo() already does for top-level tab switches.
  useEffect(() => {
    try { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; window.scrollTo(0, 0); } catch {}
  }, [step]);
  // Seeds Subjective/Pain once, up front, from whatever the AI-intake
  // landing screen produced (OrthoAssessment.jsx) -- either an AI parse of
  // the clinician's own words, or an import of this same patient's existing
  // Subjective Assessment from the older flow. A plain mount-only merge
  // (not a controlled/live prop) because after this the wizard's own
  // SubjectiveSection AI panel and manual edits are the only things
  // touching data.subjective/data.pain from here on.
  // initialData (same 2026-09-02 fix) -- the full saved wizard data from a
  // previous session, restored verbatim when resuming via Edit; takes
  // priority over the AI-intake seed since a resumed edit already has
  // real answers, not just an AI-parsed starting point.
  // 2026-09-03, Aditi: "the extracted AI subjective assessment is not fully
  // filled in the subjective assessment form" -- the seed used to be
  // subjective+pain only, so the age/sex/occupation/affected side and any
  // red flag the same extraction produced never reached Demographics or the
  // Red Flag Screen. `extracted` rides along on data.subjective.__aiExtracted
  // (a "__" key, so every summary formatter already skips it) to render the
  // read-only "as extracted" panel on the Subjective step.
  const [data, setData] = useState(() => {
    if (initialData) return initialData;
    if (!initialAiUpdates) return {};
    const seeded = {
      subjective: { ...initialAiUpdates.subjective },
      pain: { ...initialAiUpdates.pain },
    };
    if (initialAiUpdates.extracted?.length) seeded.subjective.__aiExtracted = initialAiUpdates.extracted;
    if (initialAiUpdates.demographics && Object.keys(initialAiUpdates.demographics).length) seeded.demographics = { ...initialAiUpdates.demographics };
    if (initialAiUpdates.redFlags && Object.keys(initialAiUpdates.redFlags).length) seeded.redFlags = { ...initialAiUpdates.redFlags };
    return seeded;
  });
  const [visited, setVisited] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [missingDemFields, setMissingDemFields] = useState(null);

  const steps = useMemo(() => stepOrder.map((id) => ({ id, ...STEP_META[id] })), [stepOrder]);
  const current = steps[step] || steps[0];
  // OrthoCarePlanStep persists straight to the patient record
  // (patientData.ortho_care_plan via onSave), bypassing this wizard's own
  // local data/setData -- so the "carePlan" step's data never lands in
  // `data.carePlan`. The Review screen reads data[step.id] for every step,
  // so without this merge it always saw an empty carePlan section.
  const reviewData = useMemo(() => ({ ...data, carePlanPlan: patientData?.ortho_care_plan || data.carePlanPlan, objectiveAI: formatConditionObjectiveSection(data) }), [data, patientData]);

  useEffect(() => {
    if (current) setVisited((v) => new Set(v).add(current.id));
  }, [current]);

  function goNext() {
    if (step < steps.length - 1) setStep(step + 1);
  }
  function goBack() {
    if (step > 0) { setStep(step - 1); return; }
    // jumpToDemographics()/jumpToRegion() insert their pseudo-step at index
    // 0 -- without this, hitting Back right after jumping there from
    // partway through the assessment would exit the whole thing instead of
    // just backing out of the edit (2026-09-16, Aditi: dots jump in from
    // anywhere, so Back landing here is now the common case, not an edge
    // case). Drop the pseudo-step and stay put instead.
    if (current.id === "demographics" || current.id === "region") {
      setStepOrder((prev) => prev.filter((id) => id !== current.id));
      return;
    }
    onExit?.();
  }
  function jumpTo(id) {
    const idx = stepOrder.indexOf(id);
    if (idx >= 0) setStep(idx);
  }
  // Browser/hardware Back & Forward inside this wizard (see
  // useWizardStepHistory.js) -- replays through the exact same jumpTo/onExit
  // this step machine already uses for StepNav clicks and its own Back
  // button, just triggered from real history instead of a click.
  useWizardStepHistory({
    wizardKey: "ortho_new_assessment",
    stepId: current?.id,
    onNav,
    navContext,
    onExternalStep: jumpTo,
    onBeforeFirstStep: onExit,
  });
  // AI-assisted entry drops "demographics" from stepOrder entirely (it's
  // collected pre-wizard in OrthoAssessment.jsx instead) -- but if a student
  // skipped name/age there, MissingDemographicsModal's "Go to Patient Info"
  // still needs somewhere real to send them. Same one-off-insert pattern as
  // openGait() below: add it back in at the front, then jump there.
  function jumpToDemographics() {
    if (!stepOrder.includes("demographics")) {
      setStepOrder((prev) => ["demographics", ...prev]);
    }
    setStep(0);
  }
  // Same for "region" -- AI-assisted entry picks it on a pre-wizard screen
  // that's gone once this component mounts, but the journey-dots header
  // still shows a "Region" stage and it needs to actually go somewhere
  // (2026-09-16, Aditi: "why can't we select again the demographic and
  // region... I can't go back").
  function jumpToRegion() {
    if (!stepOrder.includes("region")) {
      setStepOrder((prev) => ["region", ...prev]);
    }
    setStep(0);
  }
  function openGait() {
    setStepOrder((prev) => {
      let next = prev;
      if (!prev.includes("gait")) {
        const reviewIdx = prev.indexOf("review");
        const insertAt = reviewIdx === -1 ? prev.length : reviewIdx;
        const anchor = ORDERED_ALL.indexOf("gait");
        let pos = insertAt;
        for (let i = 0; i < prev.length; i++) {
          if (ORDERED_ALL.indexOf(prev[i]) > anchor) {
            pos = i;
            break;
          }
        }
        next = [...prev];
        next.splice(pos, 0, "gait");
      }
      setStep(next.indexOf("gait"));
      return next;
    });
  }
  // "Fill guided form" on a Condition Objective Assessment instrument
  // (ConditionObjectiveAssessment.jsx's Outcome Measures card) -- adds the
  // outcomeMeasure step if the condition didn't already promote it (same
  // insert-in-canonical-order pattern as openGait above), then jumps
  // straight into that measure's guided fill flow via the pendingStart flag
  // OrthoOutcomeMeasureFlow.jsx reads on mount.
  function openOutcomeMeasure(measureId) {
    setData((prev) => ({ ...prev, outcomeMeasure: { ...prev.outcomeMeasure, pendingStart: { measureId, returnTo: "objectiveAI" } } }));
    setStepOrder((prev) => {
      let next = prev;
      if (!prev.includes("outcomeMeasure")) {
        const reviewIdx = prev.indexOf("review");
        const insertAt = reviewIdx === -1 ? prev.length : reviewIdx;
        const anchor = ORDERED_ALL.indexOf("outcomeMeasure");
        let pos = insertAt;
        for (let i = 0; i < prev.length; i++) {
          if (ORDERED_ALL.indexOf(prev[i]) > anchor) {
            pos = i;
            break;
          }
        }
        next = [...prev];
        next.splice(pos, 0, "outcomeMeasure");
      }
      setStep(next.indexOf("outcomeMeasure"));
      return next;
    });
  }
  function toggleAssessment(id) {
    const active = stepOrder.includes(id);
    if (active) {
      setStepOrder((prev) => prev.filter((x) => x !== id));
      if (current && current.id === id) setStep((s) => Math.max(0, s - 1));
    } else {
      setStepOrder((prev) => {
        const reviewIdx = prev.indexOf("review");
        const insertAt = reviewIdx === -1 ? prev.length : reviewIdx;
        const anchor = ORDERED_ALL.indexOf(id);
        let pos = insertAt;
        for (let i = 0; i < prev.length; i++) {
          if (ORDERED_ALL.indexOf(prev[i]) > anchor) {
            pos = i;
            break;
          }
        }
        const next = [...prev];
        next.splice(pos, 0, id);
        return next;
      });
    }
  }

  const regionsLabel = regionLabelList(selectedRegions) || "—";
  const demographicsName = (data.demographics?.name || "").trim();

  // Persist a snapshot on the active patient record -- same set(key,value)
  // pattern Cardio/Neuro's own Final Review "Save" already uses. Keyed by
  // patient so switching patients doesn't show a stale assessment.
  function saveAssessment() {
    if (!onSave) return;
    onSave("ortho_outpatient_assessment", JSON.stringify({
      savedAt: new Date().toISOString(),
      patientId: activePatientId || null,
      regions: regionsLabel,
      condition: conditionLabel,
      data,
      // Raw (not display-formatted) resume fields (2026-09-02, Aditi:
      // "edit assessment should take us to last page... not to pathway or
      // region selection") -- regionsLabel/conditionLabel above are
      // already-joined display strings, not usable to reconstruct the
      // wizard's actual selectedRegions/condition props on Edit. These
      // let SpecialtyPatientProfile.jsx's "Edit" button rebuild the exact
      // original selection and skip straight to Review with this data.
      selectedRegions,
      rawCondition: condition,
      customConditionLabel: condition === "custom" ? customConditionLabel : undefined,
    }));
    // PatientDatabase.jsx's IPD/Outpatient/Post-op filter pills read this
    // top-level field directly (2026-08-31) -- same convention IPD/Post-op
    // now write on their own save.
    onSave("care_setting", "outpatient");
    // 2026-09-02, Aditi: "not saving patient... patient name... nothing
    // saving" -- this was the missing piece for Outpatient specifically:
    // IPD/Post-op already mirror their own Case Info name onto the
    // app-wide dem_name field on save, but Outpatient never did, so the
    // app-wide "create a patient row once dem_name appears" effect
    // (AppFull.jsx) never had anything to fire on -- Outpatient could
    // never actually create/persist a patient at all, autosave or not.
    if (demographicsName) onSave("dem_name", demographicsName);
    // Age/sex mirrored the same way (2026-09-17, Aditi: "patient
    // information" card on the profile Overview showing empty except for
    // the Show-less toggle) -- name was already mirrored here, but age/sex
    // never were. SpecialtyPatientProfile.jsx's Patient Information card
    // reads patient.data.dem_age/dem_sex directly, so without this they
    // stayed permanently blank for every patient assessed through this
    // wizard, even though Demographics collects both (orthoOutpatientSections.jsx).
    if (data.demographics?.age) onSave("dem_age", data.demographics.age);
    if (data.demographics?.sex) onSave("dem_sex", data.demographics.sex);
    // Same gap for phone/address/occupation (2026-09-17, Aditi: "why
    // patient information not showing here" -- phone/address/occupation).
    if (data.demographics?.phone) onSave("dem_phone", data.demographics.phone);
    if (data.demographics?.address) onSave("dem_address", data.demographics.address);
    if (data.demographics?.occupation) onSave("dem_occupation", data.demographics.occupation);
    if (data.demographics?.dob) onSave("dem_dob", data.demographics.dob);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  // The explicit "Save Assessment" tap, gated on name+age -- silent 2s
  // auto-save above still runs regardless so in-progress work always
  // survives a crash/tab-close, this just stops the therapist from
  // believing a *named, findable* record was saved when it wasn't.
  function handleSaveClick() {
    const missing = missingDemographicsFields(data.demographics);
    if (missing.length) { setMissingDemFields(missing); return; }
    saveAssessment();
  }

  // Auto-save (2026-09-02, Aditi: "not saving... automatically") -- this
  // whole wizard keeps its own local `data` state (see the useState near
  // the top of this component), entirely separate from the app-wide
  // data/set pair AppFull.jsx's real autosave (2s-debounced, local draft +
  // Supabase) actually watches. Previously nothing here ever reached that
  // pipeline until the therapist manually scrolled all the way to Review
  // and tapped Save -- closing the app, switching patients, or just not
  // reaching that last step meant the whole assessment (and the patient
  // record itself, per demographicsName above) silently never existed.
  // Debounced auto-save calls the exact same saveAssessment() the Save
  // button does, just automatically, ~2s after the last edit -- same
  // pattern every other module's autosave already uses.
  useEffect(() => {
    if (Object.keys(data).length === 0) return;
    const t = setTimeout(() => saveAssessment(), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="app-shell">
      <style>{orthoStyles()}</style>

      <div className="app-inner">
        <div className="topbar">
          <div className="topbar-row">
            <button className="back-btn" onClick={goBack} aria-label="Back">
              ←
            </button>
            <div style={{ flex: 1 }}>
              <div className="topbar-title">
                {current.icon} {current.label}
              </div>
              <div className="topbar-breadcrumb">
                {regionsLabel} · {conditionLabel}
                {entryMode !== "ai" && (
                  <span className="topbar-step-count"> · Step {step + 1}/{steps.length}</span>
                )}
              </div>
            </div>
            {current.id !== "review" && (
              <button className="back-btn" onClick={() => setReviewOpen(true)} aria-label="Review filled so far" title="Review filled so far">
                ✅
              </button>
            )}
          </div>
          {/* AI-assisted entry keeps the same journey-dots header the two
              pre-wizard screens (OrthoAssessment.jsx) already used for
              Demographics/Region, instead of switching to this wizard's own
              full icon-strip + "Step X of Y" (2026-09-16, Aditi: didn't want
              "this whole old outpatient" chrome taking over once past
              Region). The Summary stage additionally gets the non-linear hub
              pill-nav so Problem List/Goals/Treatment/... are all reachable
              from any of the others, not forced into a fixed order. */}
          {entryMode === "ai" ? (
            <>
              <AiJourneyDots
                activeIndex={aiStageIndexFor(current.id)}
                jumpableIndices={AI_WIZARD_JUMPABLE}
                onJump={(i) => {
                  if (i === 0) jumpToDemographics();
                  else if (i === 1) jumpToRegion();
                  else if (i === 2) jumpTo("subjective");
                  else if (i === 3) jumpTo("objectiveAI");
                  else if (i === 4) jumpTo(AI_HUB_IDS.find((id) => stepOrder.includes(id)) || "review");
                }}
              />
              {AI_HUB_IDS.includes(current.id) && (
                <AiHubNav
                  items={AI_HUB_IDS.filter((id) => stepOrder.includes(id)).map((id) => ({ id, label: STEP_META[id].label }))}
                  activeId={current.id}
                  visited={visited}
                  onJump={jumpTo}
                />
              )}
            </>
          ) : (
            <>
              <div className="stepnav-wrap">
                <StepNav steps={steps} currentIndex={step} visited={visited} onJump={setStep} onAddClick={() => setAddOpen(true)} requiredIds={requiredStepIds} />
              </div>
            </>
          )}
        </div>

        <div className="content">
          {current.id === "demographics" && <DemographicsSection data={data} setData={setData} />}
          {current.id === "region" && (
            <>
              <SectionIntro icon="🧭" title="Body Region" sub="What area are you assessing? Select up to 3 — you can always pull in another region later from within ROM, MMT, or Special Tests." />
              <RegionPicker
                selectedRegions={selectedRegions}
                setSelectedRegions={setSelectedRegions}
                excludeIds={["upperArm", "forearm", "thigh", "leg", "wholeBody", "multiple"]}
              />
            </>
          )}
          {current.id === "subjective" && (
            <SubjectiveSection
              data={data}
              setData={setData}
              selectedRegions={selectedRegions}
              setSelectedRegions={setSelectedRegions}
              regionLabelOf={regionLabelOf}
              requireAuth={requireAuth}
              autoOpenAI={autoOpenAI}
              onConditionDetected={handleConditionDetected}
              detectedConditionLabel={detectedConditionLabel}
              patientData={patientData}
            />
          )}
          {current.id === "redFlags" && <RedFlagScreenSection data={data} setData={setData} />}
          {current.id === "vitals" && <VitalsSection data={data} setData={setData} />}
          {current.id === "pain" && <PainSection data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} />}
          {current.id === "observation" && (
            <GeneralObservationSection
              data={data}
              setData={setData}
              selectedRegions={selectedRegions}
              regionLabelOf={regionLabelOf}
              onOpenGait={openGait}
            />
          )}
          {current.id === "palpation" && <PalpationSection data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} />}
          {current.id === "suggest" && (
            <OrthoSuggestObjectiveStep
              data={data}
              setData={setData}
              selectedRegions={selectedRegions}
              condition={condition}
              activeIds={new Set(stepOrder)}
              onToggle={toggleAssessment}
              library={ADD_LIBRARY}
              onJump={jumpTo}
            />
          )}
          {current.id === "objectiveAI" && (
            <>
              {/* Nothing on this screen previously explained where the ranked
                  condition cards below actually come from -- a student
                  landing here with no context had no way to connect it back
                  to the Subjective answers they'd just filled in (2026-09-15,
                  Aditi: wants this "stepwise" and clear for students new to
                  the app). That explanation used to be a full SectionIntro
                  (icon + big title + info button), then just an isolated (i)
                  button floating with nothing beside it, then a plain line of
                  text sitting above the AI-suggest button -- 2026-09-24,
                  Aditi: "isko button ke andar hi rakho" (put it inside the
                  button itself) -- a floating instruction above a button it
                  describes reads as two disconnected things. The explanation
                  is now the button's own subtitle (see
                  ConditionObjectiveAssessment's obj-ai-suggest-sub), so
                  there's one self-explaining control, not a caption + a
                  button. */}
              <ConditionObjectiveAssessment
                data={data}
                setData={setData}
                selectedRegions={selectedRegions}
                onStartOutcomeMeasure={openOutcomeMeasure}
              />
            </>
          )}
          {current.id === "edema" && (
            <>
              <SectionIntro icon={<Icon name="droplet" />} title="Edema" />
              <EdemaFields data={data} setData={setData} />
            </>
          )}
          {current.id === "rom" && <RomSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "mmt" && <MmtSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "jointMobility" && <JointMobilitySection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "specialTests" && <SpecialTestsSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "neuroScreen" && <NeuroScreenSection data={data} setData={setData} />}
          {current.id === "limbLength" && <LimbLengthSection data={data} setData={setData} />}
          {current.id === "kineticChain" && <KineticChainSection data={data} setData={setData} />}
          {current.id === "cpa" && <CpaSection data={data} setData={setData} />}
          {current.id === "sttt" && <SttSection data={data} setData={setData} />}
          {current.id === "fma" && <FmaSection data={data} setData={setData} />}
          {current.id === "fascia" && <FasciaSection data={data} setData={setData} />}
          {current.id === "gait" && <GaitSection data={data} setData={setData} />}
          {current.id === "balance" && <BalanceSection data={data} setData={setData} />}
          {current.id === "functionalAssessment" && <FunctionalAssessmentSection data={data} setData={setData} />}
          {current.id === "activityTolerance" && <ActivityToleranceSection data={data} setData={setData} />}
          {current.id === "outcomeMeasure" && <OrthoOutcomeMeasureFlow data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} condition={condition} jumpTo={jumpTo} />}
          {current.id === "clinicalAssessment" && <ClinicalAssessmentSection data={data} setData={setData} />}
          {/* CAREPLAN_PHASE_BY_STEP, not CAREPLAN_STEP_IDS -- the latter is
              trimmed to the active default steps (Progress removed,
              2026-09-18), but a record saved before that still has
              carePlanProgress in its own stepOrder, and it must still
              mount the shared Care Plan component when its turn comes up
              in the step nav, not render blank. */}
          {CAREPLAN_PHASE_BY_STEP[current.id] != null && (
            <>
              <style>{orthoStyles()}</style>
              <OrthoCarePlanStep
                patientData={patientData}
                onSave={onSave}
                selectedRegions={selectedRegions}
                condition={condition}
                setting="outpatient"
                pain={{ now: data.pain?.nrs_now ?? data.pain?.now, worst: data.pain?.nrs_worst ?? data.pain?.worst }}
                neuroScreen={data.neuroScreen}
                requireAuth={requireAuth}
                phase={CAREPLAN_PHASE_BY_STEP[current.id]}
                onAdvance={goNext}
              />
            </>
          )}
          {current.id === "techniques" && <TreatmentTechniquesSection data={data} setData={setData} />}
          {current.id === "exercisePrescription" && <ExercisePrescriptionSection data={data} setData={setData} selectedRegions={selectedRegions} requireAuth={requireAuth} />}
          {current.id === "homeProtocol" && <HomeProtocolSection patientData={patientData} onSave={onSave} selectedRegions={selectedRegions} />}
          {current.id === "progress" && <ProgressFollowUpSection data={data} setData={setData} />}
          {current.id === "review" && (
            <>
              <AssessmentSummary
                icon={<Icon name="check" />}
                title="Outpatient Musculoskeletal Assessment"
                sub={`${regionsLabel} · ${conditionLabel}`}
                steps={steps}
                data={reviewData}
                onEdit={jumpTo}
                exportHeaderLines={[`OUTPATIENT / MUSCULOSKELETAL ASSESSMENT`, `Region(s): ${regionsLabel}`, `Clinical context: ${conditionLabel}`]}
                formatters={orthoSummaryFormatters}
                onShare={onNav ? (text) => onNav("physiofeed", { pfShareDiscussion: { text } }) : undefined}
              />
              {onSave && (
                <button type="button" className="primary-btn" style={{ width: "100%", marginTop: 10 }} onClick={handleSaveClick}>
                  {savedFlash ? "Saved ✓" : "💾 Save Assessment"}
                </button>
              )}
              <button type="button" className="info-btn-full" style={{ marginTop: 10 }} onClick={() => setSaveTemplateOpen(true)}>
                💾 Save as Template
              </button>
            </>
          )}
        </div>

        <div className="bottombar">
          <button className="ghost-btn" onClick={goBack}>
            Back
          </button>
          {current.id === "review" ? (
            <button className="primary-btn" onClick={onExit}>
              Start new assessment
            </button>
          ) : (
            <button className="primary-btn" onClick={goNext}>
              {step === steps.length - 2 ? "Review & complete" : "Next"}
            </button>
          )}
        </div>

        {addOpen && <AddAssessmentModal activeIds={new Set(stepOrder)} onToggle={toggleAssessment} onClose={() => setAddOpen(false)} />}
        {missingDemFields && (
          <MissingDemographicsModal
            missing={missingDemFields}
            onClose={() => setMissingDemFields(null)}
            onGoToDemographics={() => { setMissingDemFields(null); jumpToDemographics(); }}
          />
        )}

        {saveTemplateOpen && (
          <SaveTemplateModal
            defaultName={`${regionsLabel} · ${conditionLabel}`}
            onClose={() => setSaveTemplateOpen(false)}
            onSave={(name) => {
              saveTemplate({ name, stepOrder, regionsLabel, conditionLabel });
              setSaveTemplateOpen(false);
            }}
          />
        )}

        {reviewOpen && (
          <div className="ct-modal">
            <div className="ct-modal-header">
              <div className="ct-modal-title">✅ Review So Far</div>
              <button type="button" className="ct-modal-close" onClick={() => setReviewOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="ct-modal-body">
              <AssessmentSummary
                icon={<Icon name="check" />}
                title="Outpatient Musculoskeletal Assessment"
                sub={`${regionsLabel} · ${conditionLabel}`}
                steps={steps}
                data={reviewData}
                onEdit={(id) => {
                  jumpTo(id);
                  setReviewOpen(false);
                }}
                exportHeaderLines={[`OUTPATIENT / MUSCULOSKELETAL ASSESSMENT`, `Region(s): ${regionsLabel}`, `Clinical context: ${conditionLabel}`]}
                formatters={orthoSummaryFormatters}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EdemaFields({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "edema");
  return (
    <>
      <SelectField label="Location" type="multi" options={["Ankle", "Foot", "Knee", "Lower leg", "Wrist", "Hand", "Elbow", "Shoulder"]} value={d.location} onChange={(v) => set("location", v)} />
      <SelectField label="Severity" type="single" options={["Mild", "Moderate", "Severe"]} value={d.severity} onChange={(v) => set("severity", v)} />
    </>
  );
}

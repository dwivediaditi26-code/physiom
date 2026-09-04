import React, { useState, useMemo, useEffect } from "react";
import { StepNav, SelectField, SectionIntro, useSectionData, fmtVal } from "./orthoFieldKit.jsx";
import { formatBodyChartSummary } from "./BodyChartPro.jsx";
import { regionDisplayLabel, regionLabelList } from "./orthoRegionLibrary.js";
import { RomSection, MmtSection, SpecialTestsSection, formatRomSection, formatMmtSection, formatSpecialTestsSection } from "./orthoRegionAssessments.jsx";
import { VitalsSection, PainSection, GaitSection, BalanceSection, ActivityToleranceSection, NeuroScreenSection } from "./orthoCommonSections.jsx";
import { DemographicsSection, RedFlagScreenSection, SubjectiveSection, formatSubjectiveSection, PalpationSection, FunctionalAssessmentSection, ClinicalAssessmentSection, GoalsSection, TreatmentPlanSection, TreatmentTechniquesSection, formatTreatmentTechniquesSection, ProgressFollowUpSection } from "./orthoOutpatientSections.jsx";
import { ExercisePrescriptionSection, formatExercisePrescriptionSection } from "./orthoExercisePrescription.jsx";
import { HomeProtocolSection } from "./orthoHomeProtocol.jsx";
import { GeneralObservationSection, formatGeneralObservationSection } from "./orthoGeneralObservation.jsx";
import { formatRedFlagsSection } from "./orthoRedFlagScreen.jsx";
import { palpationStructureRows } from "./orthoPalpationData.js";
import { KineticChainSection, CpaSection, SttSection, FmaSection, FasciaSection, formatKineticChainSection, formatCpaSection, formatSttSection, formatFmaSection, formatFasciaSection } from "./orthoAdvancedTools.jsx";
import OrthoSuggestObjectiveStep from "./OrthoSuggestObjectiveStep.jsx";
import OrthoOutcomeMeasureFlow, { formatOutcomeMeasureSection } from "./OrthoOutcomeMeasureFlow.jsx";
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
  subjective: formatSubjectiveSection,
  redFlags: formatRedFlagsSection,
  pain: formatPainSection,
  palpation: formatPalpationSection,
  observation: formatGeneralObservationSection,
  rom: formatRomSection,
  mmt: formatMmtSection,
  specialTests: formatSpecialTestsSection,
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

const BASE_IDS = ["demographics", "subjective", "redFlags", "pain", "observation", "palpation", "suggest", "rom", "mmt", "functionalAssessment", "clinicalAssessment", "goals", "treatmentPlan", "techniques", "exercisePrescription", "homeProtocol", "review"];
// AI Assisted Assessment entry only -- goes straight from Subjective into
// Suggested Objective (which already inline-covers Observation/Palpation
// itself), skipping these four as separate steps in between. Condition-
// wise/General/Templates entries keep the full BASE_IDS sequence.
const AI_ENTRY_SKIP_IDS = ["redFlags", "pain", "observation", "palpation"];
const OPTIONAL_IDS = ["vitals", "edema", "specialTests", "neuroScreen", "kineticChain", "cpa", "sttt", "fma", "fascia", "gait", "balance", "activityTolerance", "outcomeMeasure", "progress"];

const ORDERED_ALL = ["demographics", "subjective", "redFlags", "vitals", "pain", "observation", "palpation", "suggest", "edema", "rom", "mmt", "specialTests", "neuroScreen", "kineticChain", "cpa", "sttt", "fma", "fascia", "gait", "balance", "functionalAssessment", "activityTolerance", "outcomeMeasure", "clinicalAssessment", "goals", "treatmentPlan", "techniques", "exercisePrescription", "homeProtocol", "progress", "review"];

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
  demographics: { icon: "📋", label: "Demographics" },
  subjective: { icon: "📝", label: "Subjective" },
  redFlags: { icon: "🚩", label: "Red Flag Screen" },
  vitals: { icon: "❤️", label: "Vital Signs" },
  pain: { icon: "😖", label: "Pain" },
  observation: { icon: "👁️", label: "General Observation" },
  palpation: { icon: "🖐️", label: "Palpation" },
  suggest: { icon: "🧠", label: "Suggested Objective" },
  edema: { icon: "💧", label: "Edema" },
  rom: { icon: "📐", label: "ROM" },
  mmt: { icon: "💪", label: "MMT" },
  specialTests: { icon: "🔬", label: "Special Tests" },
  neuroScreen: { icon: "⚡", label: "Neuro Screen" },
  kineticChain: { icon: "⛓️", label: "Kinetic Chain" },
  cpa: { icon: "🧠", label: "CPA (NKT)" },
  sttt: { icon: "🦴", label: "STTT (Cyriax)" },
  fma: { icon: "🏃", label: "Functional Movement" },
  fascia: { icon: "🧵", label: "Fascia" },
  gait: { icon: "🚶", label: "Gait / Movement" },
  balance: { icon: "⚖️", label: "Balance" },
  functionalAssessment: { icon: "🏃", label: "Functional Assessment" },
  activityTolerance: { icon: "🏃", label: "Activity Tolerance" },
  outcomeMeasure: { icon: "📊", label: "Outcome Measure" },
  clinicalAssessment: { icon: "🧠", label: "Clinical Assessment" },
  goals: { icon: "🎯", label: "Goals" },
  treatmentPlan: { icon: "📋", label: "Treatment Plan" },
  techniques: { icon: "🤲", label: "Treatment Techniques" },
  exercisePrescription: { icon: "🏋", label: "Exercise Prescription" },
  homeProtocol: { icon: "🏠", label: "Home Protocol" },
  progress: { icon: "📈", label: "Progress / Follow-up" },
  review: { icon: "✅", label: "Final Review" },
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
export default function OrthoOutpatientAssessment({ selectedRegions, condition: initialCondition, customConditionLabel, initialStepOrder, templateName, onExit, onSave, activePatientId, patientData, requireAuth, autoOpenAI, initialAiUpdates, entryMode, initialData, initialStep }) {
  // See AI_ENTRY_SKIP_IDS above -- the one place both the initial stepOrder
  // and handleConditionDetected's later re-union need to agree on which
  // base steps are actually in play, so a mid-session condition detection
  // can never silently re-add a step the AI-entry sequence deliberately skipped.
  const effectiveBaseIds = entryMode === "ai" ? BASE_IDS.filter((id) => !AI_ENTRY_SKIP_IDS.includes(id)) : BASE_IDS;
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
  const conditionLabel = templateName ? templateName : condition === "general" ? "General Assessment" : conditionMeta ? conditionMeta.label : customConditionLabel || "Other";

  const [stepOrder, setStepOrder] = useState(() => {
    if (initialStepOrder && initialStepOrder.length) return initialStepOrder.filter((id) => STEP_META[id]);
    const promoted = aiDetectedCondition ? aiDetectedCondition.promote : initialCondition === "general" ? [] : conditionMeta ? conditionMeta.promote : FALLBACK_PROMOTE;
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

  const steps = useMemo(() => stepOrder.map((id) => ({ id, ...STEP_META[id] })), [stepOrder]);
  const current = steps[step] || steps[0];

  useEffect(() => {
    if (current) setVisited((v) => new Set(v).add(current.id));
  }, [current]);

  function goNext() {
    if (step < steps.length - 1) setStep(step + 1);
  }
  function goBack() {
    if (step > 0) setStep(step - 1);
    else onExit?.();
  }
  function jumpTo(id) {
    const idx = stepOrder.indexOf(id);
    if (idx >= 0) setStep(idx);
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
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
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
              </div>
            </div>
            {current.id !== "review" && (
              <button className="back-btn" onClick={() => setReviewOpen(true)} aria-label="Review filled so far" title="Review filled so far">
                ✅
              </button>
            )}
          </div>
          <div className="stepnav-wrap">
            <StepNav steps={steps} currentIndex={step} visited={visited} onJump={setStep} onAddClick={() => setAddOpen(true)} />
          </div>
          <div className="progress-label">
            Step {step + 1} of {steps.length}
          </div>
        </div>

        <div className="content">
          {current.id === "demographics" && <DemographicsSection data={data} setData={setData} />}
          {current.id === "subjective" && (
            <SubjectiveSection
              data={data}
              setData={setData}
              selectedRegions={selectedRegions}
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
          {current.id === "edema" && (
            <>
              <SectionIntro icon="💧" title="Edema" />
              <EdemaFields data={data} setData={setData} />
            </>
          )}
          {current.id === "rom" && <RomSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "mmt" && <MmtSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "specialTests" && <SpecialTestsSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "neuroScreen" && <NeuroScreenSection data={data} setData={setData} />}
          {current.id === "kineticChain" && <KineticChainSection data={data} setData={setData} />}
          {current.id === "cpa" && <CpaSection data={data} setData={setData} />}
          {current.id === "sttt" && <SttSection data={data} setData={setData} />}
          {current.id === "fma" && <FmaSection data={data} setData={setData} />}
          {current.id === "fascia" && <FasciaSection data={data} setData={setData} />}
          {current.id === "gait" && <GaitSection data={data} setData={setData} />}
          {current.id === "balance" && <BalanceSection data={data} setData={setData} />}
          {current.id === "functionalAssessment" && <FunctionalAssessmentSection data={data} setData={setData} />}
          {current.id === "activityTolerance" && <ActivityToleranceSection data={data} setData={setData} />}
          {current.id === "outcomeMeasure" && <OrthoOutcomeMeasureFlow data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} condition={condition} />}
          {current.id === "clinicalAssessment" && <ClinicalAssessmentSection data={data} setData={setData} />}
          {current.id === "goals" && <GoalsSection data={data} setData={setData} />}
          {current.id === "treatmentPlan" && <TreatmentPlanSection data={data} setData={setData} />}
          {current.id === "techniques" && <TreatmentTechniquesSection data={data} setData={setData} />}
          {current.id === "exercisePrescription" && <ExercisePrescriptionSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "homeProtocol" && <HomeProtocolSection patientData={patientData} onSave={onSave} />}
          {current.id === "progress" && <ProgressFollowUpSection data={data} setData={setData} />}
          {current.id === "review" && (
            <>
              <AssessmentSummary
                icon="✅"
                title="Outpatient Musculoskeletal Assessment"
                sub={`${regionsLabel} · ${conditionLabel}`}
                steps={steps}
                data={data}
                onEdit={jumpTo}
                exportHeaderLines={[`OUTPATIENT / MUSCULOSKELETAL ASSESSMENT`, `Region(s): ${regionsLabel}`, `Clinical context: ${conditionLabel}`]}
                formatters={orthoSummaryFormatters}
              />
              {onSave && (
                <button type="button" className="primary-btn" style={{ width: "100%", marginTop: 10 }} onClick={saveAssessment}>
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
                icon="✅"
                title="Outpatient Musculoskeletal Assessment"
                sub={`${regionsLabel} · ${conditionLabel}`}
                steps={steps}
                data={data}
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

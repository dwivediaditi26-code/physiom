import React, { useState, useMemo, useEffect } from "react";
import { StepNav, SelectField, SectionIntro, useSectionData } from "./orthoFieldKit.jsx";
import { regionDisplayLabel, regionLabelList } from "./orthoRegionLibrary.js";
import { RomSection, MmtSection, SpecialTestsSection, formatRomSection, formatMmtSection, formatSpecialTestsSection } from "./orthoRegionAssessments.jsx";
import { VitalsSection, PainSection, GaitSection, BalanceSection, ActivityToleranceSection } from "./orthoCommonSections.jsx";
import { DemographicsSection, RedFlagScreenSection, SubjectiveSection, formatSubjectiveSection, PalpationSection, FunctionalAssessmentSection, ClinicalAssessmentSection, GoalsSection, TreatmentPlanSection, TreatmentTechniquesSection, formatTreatmentTechniquesSection, ProgressFollowUpSection } from "./orthoOutpatientSections.jsx";
import { ExercisePrescriptionSection, formatExercisePrescriptionSection } from "./orthoExercisePrescription.jsx";
import { GeneralObservationSection, formatGeneralObservationSection } from "./orthoGeneralObservation.jsx";
import { formatRedFlagsSection } from "./orthoRedFlagScreen.jsx";
import { KineticChainSection, CpaSection, SttSection, FmaSection, formatKineticChainSection, formatCpaSection, formatSttSection, formatFmaSection } from "./orthoAdvancedTools.jsx";
import OrthoSuggestObjectiveStep from "./OrthoSuggestObjectiveStep.jsx";
import OrthoOutcomeMeasureFlow, { formatOutcomeMeasureSection } from "./OrthoOutcomeMeasureFlow.jsx";
import { AssessmentSummary } from "./orthoSummary.jsx";
import { saveTemplate } from "./orthoTemplates.js";
import { orthoStyles } from "./orthoStyles.js";

function regionLabelOf(r) {
  return [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ");
}

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
  { id: "spine", icon: "🦴", label: "Spine Condition", desc: "Neck / back pain, radiculopathy screen", promote: ["specialTests", "sttt", "activityTolerance", "outcomeMeasure"] },
  { id: "sportsOveruse", icon: "🏃", label: "Sports Injury / Overuse", desc: "Repetitive strain, sport-specific injury", promote: ["specialTests", "kineticChain", "fma", "activityTolerance", "outcomeMeasure"] },
  { id: "postSurgicalFollowUp", icon: "🩺", label: "Post-surgical Follow-up", desc: "OPD-stage recovery after discharge", promote: ["edema", "activityTolerance", "outcomeMeasure"] },
  { id: "painFunctional", icon: "😣", label: "Pain / Functional Limitation", desc: "No clear structural diagnosis yet", promote: ["cpa", "activityTolerance", "outcomeMeasure"] },
  { id: "other", icon: "❓", label: "Other", desc: "Doesn't fit the templates above", promote: ["activityTolerance"] },
];
const FALLBACK_PROMOTE = ["activityTolerance", "outcomeMeasure"];

const BASE_IDS = ["demographics", "subjective", "redFlags", "pain", "observation", "palpation", "suggest", "rom", "mmt", "functionalAssessment", "clinicalAssessment", "goals", "treatmentPlan", "review"];
const OPTIONAL_IDS = ["vitals", "edema", "specialTests", "kineticChain", "cpa", "sttt", "fma", "gait", "balance", "activityTolerance", "outcomeMeasure", "techniques", "exercisePrescription", "progress"];

const ORDERED_ALL = ["demographics", "subjective", "redFlags", "vitals", "pain", "observation", "palpation", "suggest", "edema", "rom", "mmt", "specialTests", "kineticChain", "cpa", "sttt", "fma", "gait", "balance", "functionalAssessment", "activityTolerance", "outcomeMeasure", "clinicalAssessment", "goals", "treatmentPlan", "techniques", "exercisePrescription", "progress", "review"];

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
  kineticChain: { icon: "⛓️", label: "Kinetic Chain" },
  cpa: { icon: "🧠", label: "CPA (NKT)" },
  sttt: { icon: "🦴", label: "STTT (Cyriax)" },
  fma: { icon: "🏃", label: "Functional Movement" },
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
export default function OrthoOutpatientAssessment({ selectedRegions, condition, customConditionLabel, initialStepOrder, templateName, onExit }) {
  const conditionMeta = OUTPATIENT_CONDITIONS.find((c) => c.id === condition);
  const conditionLabel = templateName ? templateName : condition === "general" ? "General Assessment" : conditionMeta ? conditionMeta.label : customConditionLabel || "Other";

  const [stepOrder, setStepOrder] = useState(() => {
    if (initialStepOrder && initialStepOrder.length) return initialStepOrder.filter((id) => STEP_META[id]);
    const promoted = condition === "general" ? [] : conditionMeta ? conditionMeta.promote : FALLBACK_PROMOTE;
    return ORDERED_ALL.filter((id) => BASE_IDS.includes(id) || promoted.includes(id));
  });
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [visited, setVisited] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

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
  const summaryFormatters = {
    subjective: formatSubjectiveSection,
    redFlags: formatRedFlagsSection,
    observation: formatGeneralObservationSection,
    rom: formatRomSection,
    mmt: formatMmtSection,
    specialTests: formatSpecialTestsSection,
    kineticChain: formatKineticChainSection,
    cpa: formatCpaSection,
    sttt: formatSttSection,
    fma: formatFmaSection,
    outcomeMeasure: formatOutcomeMeasureSection,
    techniques: formatTreatmentTechniquesSection,
    exercisePrescription: formatExercisePrescriptionSection,
  };

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
          {current.id === "subjective" && <SubjectiveSection data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} />}
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
              selectedRegions={selectedRegions}
              condition={condition}
              activeIds={new Set(stepOrder)}
              onToggle={toggleAssessment}
              library={ADD_LIBRARY}
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
          {current.id === "kineticChain" && <KineticChainSection data={data} setData={setData} />}
          {current.id === "cpa" && <CpaSection data={data} setData={setData} />}
          {current.id === "sttt" && <SttSection data={data} setData={setData} />}
          {current.id === "fma" && <FmaSection data={data} setData={setData} />}
          {current.id === "gait" && <GaitSection data={data} setData={setData} />}
          {current.id === "balance" && <BalanceSection data={data} setData={setData} />}
          {current.id === "functionalAssessment" && <FunctionalAssessmentSection data={data} setData={setData} />}
          {current.id === "activityTolerance" && <ActivityToleranceSection data={data} setData={setData} />}
          {current.id === "outcomeMeasure" && <OrthoOutcomeMeasureFlow data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} condition={condition} />}
          {current.id === "clinicalAssessment" && <ClinicalAssessmentSection data={data} setData={setData} />}
          {current.id === "goals" && <GoalsSection data={data} setData={setData} />}
          {current.id === "treatmentPlan" && <TreatmentPlanSection data={data} setData={setData} />}
          {current.id === "techniques" && <TreatmentTechniquesSection data={data} setData={setData} />}
          {current.id === "exercisePrescription" && <ExercisePrescriptionSection data={data} setData={setData} />}
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
                formatters={summaryFormatters}
              />
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
                formatters={summaryFormatters}
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

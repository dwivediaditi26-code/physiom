import React, { useState, useMemo, useEffect } from "react";
import { TextField, SelectField, Segmented, TextArea, YesNo, SectionIntro, StepNav, useSectionData } from "./orthoFieldKit.jsx";
import { regionDisplayLabel, regionLabelList } from "./orthoRegionLibrary.js";
import { RomSection, MmtSection, JointMobilitySection, SpecialTestsSection, formatRomSection, formatMmtSection, formatJointMobilitySection, formatSpecialTestsSection } from "./orthoRegionAssessments.jsx";
import {
  CaseInfoSection,
  VitalsSection,
  PainSection,
  ObservationSection,
  FunctionalMobilitySection,
  GaitSection,
  BalanceSection,
  ActivityToleranceSection,
  OutcomeMeasureSection,
  ImpressionSection,
} from "./orthoCommonSections.jsx";
import { AssessmentSummary } from "./orthoSummary.jsx";
import { SurgicalDetailsSection } from "./orthoSurgicalDetails.jsx";
import { orthoStyles } from "./orthoStyles.js";

function regionLabelOf(r) {
  return [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ");
}

/* ============================================================
   CONDITION TEMPLATE ENGINE — IPD pathway
   Region + Condition are chosen one screen earlier (see
   OrthoAssessment.jsx) — this module only builds and runs the
   resulting assessment.
   ============================================================ */
export const IPD_CONDITIONS = [
  { id: "fracture", icon: "🦴", label: "Fracture / Trauma", desc: "Trauma, immobilization, weight-bearing restrictions", optional: ["edema", "wound", "neurovascular", "rom", "mmt", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "postop", icon: "🏥", label: "Post-operative", desc: "General surgical recovery on the ward", optional: ["edema", "wound", "neurovascular", "rom", "mmt", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "jointReplacement", icon: "🦿", label: "Joint Replacement", desc: "TKR / THR / shoulder / other arthroplasty", optional: ["edema", "wound", "neurovascular", "rom", "mmt", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "dislocation", icon: "🚨", label: "Dislocation", desc: "Reduction history, precautions, neurovascular status", optional: ["edema", "neurovascular", "rom", "mmt", "balance", "activityTolerance"] },
  { id: "arthritis", icon: "🦴", label: "Arthritis / Degenerative", desc: "Chronic joint pain and functional decline", optional: ["rom", "mmt", "jointMobility", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "infection", icon: "🦠", label: "Infection", desc: "Medically-documented infection under treatment", optional: ["edema", "wound", "neurovascular", "rom", "mmt", "activityTolerance"] },
  { id: "softTissue", icon: "🧵", label: "Soft-tissue Injury", desc: "Sprain, strain, contusion", optional: ["edema", "rom", "mmt", "jointMobility", "activityTolerance", "outcomeMeasure"] },
  { id: "spine", icon: "🦴", label: "Spine Condition", desc: "Neck / back pathology with neuro screening", optional: ["neurovascular", "rom", "mmt", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "amputation", icon: "🦿", label: "Amputation", desc: "Residual limb and prosthetic pathway", optional: ["edema", "wound", "rom", "mmt", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "painFunctional", icon: "😣", label: "Pain / Functional Limitation", desc: "No clear structural diagnosis yet", optional: ["rom", "mmt", "jointMobility", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "deconditioning", icon: "🧍", label: "Deconditioning / Mobility Limitation", desc: "Generalised weakness / reduced mobility", optional: ["rom", "mmt", "balance", "activityTolerance", "outcomeMeasure"] },
  { id: "other", icon: "❓", label: "Other", desc: "Doesn't fit the templates above", optional: ["rom", "mmt", "activityTolerance"] },
  { id: "notDiagnosed", icon: "❔", label: "Not Yet Diagnosed", desc: "Safest generic pathway — nothing promoted", optional: ["edema", "neurovascular", "rom", "mmt", "activityTolerance"] },
];
const FALLBACK_OPTIONAL = ["edema", "neurovascular", "rom", "mmt", "activityTolerance"];

const BASE_IDS = ["caseInfo", "medicalReview", "precautions", "vitals", "subjective", "pain", "observation", "functionalMobility", "gait", "impression", "review"];
const OPTIONAL_IDS = ["edema", "wound", "neurovascular", "rom", "mmt", "jointMobility", "balance", "activityTolerance", "outcomeMeasure", "specialTests"];

const ORDERED_ALL = [
  "caseInfo",
  "medicalReview",
  "precautions",
  "vitals",
  "subjective",
  "pain",
  "observation",
  "edema",
  "wound",
  "neurovascular",
  "rom",
  "mmt",
  "jointMobility",
  "specialTests",
  "functionalMobility",
  "gait",
  "balance",
  "activityTolerance",
  "outcomeMeasure",
  "impression",
  "review",
];

const STEP_META = {
  caseInfo: { icon: "📋", label: "Patient / Case Info" },
  medicalReview: { icon: "🗂️", label: "Medical / Chart Review" },
  precautions: { icon: "🚩", label: "Precautions & Safety" },
  vitals: { icon: "❤️", label: "Vital Signs" },
  subjective: { icon: "📝", label: "Subjective" },
  pain: { icon: "😖", label: "Pain" },
  observation: { icon: "👁️", label: "Observation" },
  edema: { icon: "💧", label: "Edema" },
  wound: { icon: "🩹", label: "Wound / Surgical Site" },
  neurovascular: { icon: "🧠", label: "Neurovascular" },
  rom: { icon: "📐", label: "ROM" },
  mmt: { icon: "💪", label: "MMT" },
  jointMobility: { icon: "🦴", label: "Joint Mobility" },
  specialTests: { icon: "🔬", label: "Special Tests" },
  functionalMobility: { icon: "🛏️", label: "Functional Mobility" },
  gait: { icon: "🚶", label: "Gait / Ambulation" },
  balance: { icon: "⚖️", label: "Balance" },
  activityTolerance: { icon: "🏃", label: "Activity Tolerance" },
  outcomeMeasure: { icon: "📊", label: "Outcome Measure" },
  impression: { icon: "🧠", label: "Clinical Impression" },
  review: { icon: "✅", label: "Final Review" },
};

const ADD_LIBRARY = OPTIONAL_IDS.map((id) => ({ id, ...STEP_META[id] }));

/* ============================================================
   SECTION CONTENT
   ============================================================ */
function MedicalReviewSection({ data, setData, condition, selectedRegions }) {
  const [d, set] = useSectionData(data, setData, "medicalReview");
  const showReduction = condition === "dislocation";
  const showAmputation = condition === "amputation";
  return (
    <>
      <SectionIntro icon="🗂️" title="Medical / Chart Review" />
      <TextArea label="Medical record review" value={d.recordReview} onChange={(v) => set("recordReview", v)} placeholder="Relevant history, comorbidities, prior functional level..." />
      <TextField label="Mechanism of injury / onset" value={d.mechanism} onChange={(v) => set("mechanism", v)} />
      <TextField label="Date of injury / surgery" value={d.eventDate} onChange={(v) => set("eventDate", v)} placeholder="DD/MM/YYYY" />
      <TextArea label="Physician restrictions" value={d.restrictions} onChange={(v) => set("restrictions", v)} placeholder="e.g. no active SLR, no resisted knee extension..." />

      {showReduction && (
        <>
          <div className="subheading">🚨 Reduction history</div>
          <TextField label="Reduction method" value={d.reductionMethod} onChange={(v) => set("reductionMethod", v)} placeholder="If documented" />
          <TextField label="Date / time of reduction" value={d.reductionDateTime} onChange={(v) => set("reductionDateTime", v)} />
        </>
      )}
      {showAmputation && (
        <>
          <div className="subheading">🦿 Amputation detail</div>
          <TextField label="Cause / medical context" value={d.amputationCause} onChange={(v) => set("amputationCause", v)} />
        </>
      )}

      <SurgicalDetailsSection data={data} setData={setData} sectionKey="medicalReview" selectedRegions={selectedRegions} conditionId={condition} />
    </>
  );
}

const PRECAUTION_OPTIONS = ["Fall risk", "Monitor vitals during mobilization", "Cardiac precautions", "Pulmonary precautions", "DVT precautions", "Bleeding / anticoagulation precautions", "Isolation precautions", "Cognitive / delirium precautions"];
function PrecautionsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "precautions");
  return (
    <>
      <SectionIntro icon="🚩" title="Precautions & Safety" />
      <SelectField label="Precautions" type="multi" options={PRECAUTION_OPTIONS} value={d.selected} onChange={(v) => set("selected", v)} />
      <Segmented label="Movement restrictions in place?" options={["Yes", "No"]} value={d.restrictionsPresent} onChange={(v) => set("restrictionsPresent", v)} />
      {d.restrictionsPresent === "Yes" && <TextArea label="Movement restriction detail" value={d.restrictionDetail} onChange={(v) => set("restrictionDetail", v)} />}
      <TextArea label="Additional safety notes" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

function EdemaSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "edema");
  return (
    <>
      <SectionIntro icon="💧" title="Edema" info="Press firmly over bone (shin/ankle) for a few seconds — pitting leaves a visible indentation. In bed-bound patients also check the sacrum, since fluid pools there instead of the ankles." />
      <Segmented label="Side" options={["Right", "Left", "Bilateral"]} value={d.side} onChange={(v) => set("side", v)} />
      <SelectField label="Location" type="multi" options={["Ankle", "Foot", "Knee", "Lower leg", "Wrist", "Hand", "Generalized", "Sacral"]} value={d.location} onChange={(v) => set("location", v)} />
      <Segmented label="Severity" options={["None", "Mild", "Moderate", "Severe"]} value={d.severity} onChange={(v) => set("severity", v)} />
      <YesNo label="Pitting" value={d.pitting} onChange={(v) => set("pitting", v)} />
      {d.pitting === "Yes" && <Segmented label="Pitting grade" options={["1+", "2+", "3+", "4+"]} value={d.pittingGrade} onChange={(v) => set("pittingGrade", v)} />}
    </>
  );
}

function WoundSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "wound");
  return (
    <>
      <SectionIntro icon="🩹" title="Wound / Surgical Site" info="Describe what you observe — do not infer infection from appearance alone. Escalate concerning findings (spreading redness, purulent drainage, fever) to the medical team." />
      <YesNo label="Wound present?" value={d.present} onChange={(v) => set("present", v)} />
      {d.present === "Yes" && (
        <>
          <TextField label="Location" value={d.location} onChange={(v) => set("location", v)} />
          <Segmented label="Type" options={["Surgical", "Traumatic", "Other"]} value={d.type} onChange={(v) => set("type", v)} />
          <SelectField label="Appearance" type="multi" options={["Clean", "Redness", "Swelling", "Drainage", "Gaping", "Other"]} value={d.appearance} onChange={(v) => set("appearance", v)} />
          <Segmented label="Dressing" options={["Intact", "Changed", "Other"]} value={d.dressing} onChange={(v) => set("dressing", v)} />
          <Segmented label="Drain" options={["None", "Present"]} value={d.drain} onChange={(v) => set("drain", v)} />
        </>
      )}
    </>
  );
}

function NeurovascularSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "neurovascular");
  return (
    <>
      <SectionIntro icon="🧠" title="Neurovascular" info="Compare distal to the injury/surgery site against the contralateral limb. Any acute deterioration (new numbness, pallor, absent pulse) is a medical emergency — escalate immediately." />
      <Segmented label="Side" options={["Right", "Left", "Bilateral"]} value={d.side} onChange={(v) => set("side", v)} />
      <Segmented label="Capillary refill" options={["Normal", "Delayed"]} value={d.capRefill} onChange={(v) => set("capRefill", v)} />
      <Segmented label="Distal pulse" options={["Present", "Reduced", "Absent", "Not assessed"]} value={d.pulse} onChange={(v) => set("pulse", v)} />
      <Segmented label="Sensation" options={["Intact", "Reduced", "Absent", "Not assessed"]} value={d.sensation} onChange={(v) => set("sensation", v)} />
      <Segmented label="Motor function" options={["Intact", "Reduced", "Not assessed"]} value={d.motor} onChange={(v) => set("motor", v)} />
    </>
  );
}

/* ============================================================
   MAIN APP — mounted by OrthoAssessment.jsx once region +
   condition have been picked on the preceding two screens.
   ============================================================ */
export default function OrthoIPDAssessment({ selectedRegions, condition, customConditionLabel, onExit }) {
  const conditionMeta = IPD_CONDITIONS.find((c) => c.id === condition);
  const conditionLabel = conditionMeta ? conditionMeta.label : customConditionLabel || "Other";

  const [stepOrder, setStepOrder] = useState(() => {
    const promoted = conditionMeta ? conditionMeta.optional : FALLBACK_OPTIONAL;
    return ORDERED_ALL.filter((id) => BASE_IDS.includes(id) || promoted.includes(id));
  });
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [visited, setVisited] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);

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

  const caseInfo = data.caseInfo || {};
  const patientHeader = [caseInfo.name, [caseInfo.age && `${caseInfo.age}y`, caseInfo.sex].filter(Boolean).join(" / "), caseInfo.caseId].filter(Boolean);
  const regionsLabel = regionLabelList(selectedRegions) || "—";

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
                {patientHeader.length > 0 ? ` · ${patientHeader.join(" / ")}` : ""}
              </div>
            </div>
          </div>
          <div className="stepnav-wrap">
            <StepNav steps={steps} currentIndex={step} visited={visited} onJump={setStep} onAddClick={() => setAddOpen(true)} />
          </div>
          <div className="progress-label">
            Step {step + 1} of {steps.length}
          </div>
        </div>

        <div className="content">
          {current.id === "caseInfo" && <CaseInfoSection data={data} setData={setData} />}
          {current.id === "medicalReview" && <MedicalReviewSection data={data} setData={setData} condition={condition} selectedRegions={selectedRegions} />}
          {current.id === "precautions" && <PrecautionsSection data={data} setData={setData} />}
          {current.id === "vitals" && <VitalsSection data={data} setData={setData} />}
          {current.id === "subjective" && <SubjectiveSection data={data} setData={setData} />}
          {current.id === "pain" && <PainSection data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} />}
          {current.id === "observation" && <ObservationSection data={data} setData={setData} />}
          {current.id === "edema" && <EdemaSection data={data} setData={setData} />}
          {current.id === "wound" && <WoundSection data={data} setData={setData} />}
          {current.id === "neurovascular" && <NeurovascularSection data={data} setData={setData} />}
          {current.id === "rom" && <RomSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "mmt" && <MmtSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "jointMobility" && <JointMobilitySection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "specialTests" && <SpecialTestsSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "functionalMobility" && <FunctionalMobilitySection data={data} setData={setData} />}
          {current.id === "gait" && <GaitSection data={data} setData={setData} />}
          {current.id === "balance" && <BalanceSection data={data} setData={setData} />}
          {current.id === "activityTolerance" && <ActivityToleranceSection data={data} setData={setData} />}
          {current.id === "outcomeMeasure" && <OutcomeMeasureSection data={data} setData={setData} />}
          {current.id === "impression" && <ImpressionSection data={data} setData={setData} />}
          {current.id === "review" && (
            <AssessmentSummary
              icon="✅"
              title="IPD Orthopedic Assessment"
              sub={`${regionsLabel} · ${conditionLabel}`}
              steps={steps}
              data={data}
              onEdit={jumpTo}
              exportHeaderLines={[`IPD ORTHOPEDIC ASSESSMENT`, `Region(s): ${regionsLabel}`, `Clinical context: ${conditionLabel}`]}
              formatters={{ rom: formatRomSection, mmt: formatMmtSection, jointMobility: formatJointMobilitySection, specialTests: formatSpecialTestsSection }}
            />
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
      </div>
    </div>
  );
}

function SubjectiveSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "subjective");
  return (
    <>
      <SectionIntro icon="📝" title="Subjective" />
      <SelectField label="Chief complaint" type="multi" options={["Pain", "Weakness", "Reduced mobility", "Swelling", "Stiffness", "Instability", "Numbness / tingling", "Other"]} value={d.chiefComplaint} onChange={(v) => set("chiefComplaint", v)} />
      <SelectField label="Aggravating activities" type="multi" options={["Walking", "Standing", "Sitting", "Stairs", "Transfers", "Lying down", "Movement of joint"]} value={d.aggravating} onChange={(v) => set("aggravating", v)} />
      <SelectField label="Relieving factors" type="multi" options={["Rest", "Position change", "Medication", "Ice / heat", "Elevation"]} value={d.relieving} onChange={(v) => set("relieving", v)} />
      <TextArea label="Functional goals (patient-reported)" value={d.goals} onChange={(v) => set("goals", v)} placeholder="What matters most to the patient right now" />
      <TextArea label="Additional observations" value={d.notes} onChange={(v) => set("notes", v)} />
    </>
  );
}

function AddAssessmentModal({ activeIds, onToggle, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const items = query ? ADD_LIBRARY.filter((it) => it.label.toLowerCase().includes(query)) : ADD_LIBRARY;
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">🦴 Add Assessment</div>
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

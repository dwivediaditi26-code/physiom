import React, { useState, useMemo, useEffect } from "react";
import { Hint, TextField, DateField, SelectField, Segmented, NumberField, TextArea, YesNo, Alert, SectionIntro, StepNav, useSectionData, MissingDemographicsModal, missingDemographicsFields } from "./orthoFieldKit.jsx";
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
  ImpressionSection,
} from "./orthoCommonSections.jsx";
import OrthoOutcomeMeasureFlow, { formatOutcomeMeasureSection } from "./OrthoOutcomeMeasureFlow.jsx";
import { AssessmentSummary } from "./orthoSummary.jsx";
import { SurgicalDetailsSection } from "./orthoSurgicalDetails.jsx";
import { orthoStyles } from "./orthoStyles.js";
import { OrthoCarePlanStep } from "./OrthoCarePlan.jsx";

function regionLabelOf(r) {
  return [r.side, regionDisplayLabel(r)].filter(Boolean).join(" ");
}

/* ============================================================
   CONDITION TEMPLATE ENGINE — Post-operative Rehab pathway
   Region + type of surgery are chosen one screen earlier (see
   OrthoAssessment.jsx) — this module only builds and runs the
   resulting assessment.

   SAFETY RULE: precautions and progression must follow the
   documented surgeon/rehab protocol when available. This module
   only organizes and surfaces assessments — it never infers or
   suggests a safe movement/loading level on its own.
   ============================================================ */
const PROTOCOL_SAFETY_NOTE =
  "Precautions and progression must follow the documented surgeon / rehabilitation protocol when available. This app organizes and surfaces assessments — it does not determine or suggest a safe movement or loading level.";

export const POSTOP_CONDITIONS = [
  { id: "jointReplacement", icon: "🦿", label: "Joint Replacement", desc: "TKR / THR / shoulder / other arthroplasty", promote: ["jointMobility"], fields: [{ key: "jointReplaced", label: "Joint replaced" }] },
  { id: "fractureORIF", icon: "🦴", label: "Fracture Fixation / ORIF", desc: "Internal fixation of a fracture", promote: [], fields: [{ key: "fractureLocation", label: "Fracture location" }, { key: "fixationMethod", label: "Fixation method", placeholder: "If documented" }] },
  { id: "ligamentReconstruction", icon: "🦵", label: "Ligament Reconstruction", desc: "e.g. ACL / PCL / MCL reconstruction", promote: [], fields: [{ key: "ligamentReconstructed", label: "Ligament reconstructed" }, { key: "graft", label: "Graft", placeholder: "If documented" }] },
  { id: "tendonRepair", icon: "🧵", label: "Tendon Repair", desc: "e.g. Achilles / rotator cuff / flexor tendon", promote: [], fields: [{ key: "tendonRepaired", label: "Tendon repaired" }, { key: "repairDetails", label: "Repair details", placeholder: "If documented" }] },
  { id: "arthroscopy", icon: "🔭", label: "Arthroscopy", desc: "Scope-guided procedure, region determines detail", promote: ["jointMobility"], fields: [{ key: "jointOperated", label: "Joint" }, { key: "findings", label: "Findings", placeholder: "If documented" }] },
  { id: "spineSurgery", icon: "🧠", label: "Spine Surgery", desc: "Discectomy, fusion, decompression, etc.", promote: ["neuroScreen"], fields: [{ key: "spineLevel", label: "Spine level" }] },
  { id: "jointStabilization", icon: "🦴", label: "Joint Stabilization / Repair", desc: "e.g. shoulder stabilization, labral repair", promote: ["jointMobility"], fields: [{ key: "jointStabilized", label: "Joint" }, { key: "repairPerformed", label: "Repair performed" }] },
  { id: "softTissueMuscle", icon: "💪", label: "Soft-Tissue / Muscle Surgery", desc: "Muscle or soft-tissue procedure", promote: [], fields: [{ key: "tissueMuscle", label: "Tissue / muscle" }] },
  { id: "amputation", icon: "🦿", label: "Amputation", desc: "Residual limb and prosthetic pathway", promote: ["residualLimb", "prosthesis"], fields: [{ key: "amputationLevel", label: "Level" }] },
  { id: "tendonTransfer", icon: "🔄", label: "Tendon Transfer / Reconstruction", desc: "Tendon transfer procedure", promote: [], fields: [{ key: "tendonTransferred", label: "Tendon transferred" }] },
  { id: "deformityCorrection", icon: "🦴", label: "Deformity Correction", desc: "e.g. osteotomy, limb alignment correction", promote: [], fields: [{ key: "deformity", label: "Deformity" }, { key: "fixation", label: "Fixation", placeholder: "If documented" }] },
  { id: "other", icon: "❓", label: "Other Orthopedic Surgery", desc: "Doesn't fit the templates above", promote: [], fields: [] },
];
const FALLBACK_PROMOTE = [];

// Typical incision/portal approaches per operation type (2026-09-03, Aditi:
// "the surgical site list should be made according to that [region +
// operation] so that we can select from it for time saving, same for the
// incision type") -- SelectField still lets the clinician type their own
// text over these, so an unusual approach is never blocked, just not the
// default typing burden for the common ones.
const INCISION_TYPES_BY_CONDITION = {
  jointReplacement: ["Anterior (direct anterior)", "Anterolateral", "Posterolateral / Posterior", "Lateral", "Medial parapatellar", "Subvastus", "Midvastus"],
  fractureORIF: ["Lateral", "Medial", "Anterior", "Posterior", "Percutaneous / minimally invasive"],
  ligamentReconstruction: ["Anteromedial portal", "Anterolateral portal", "Medial parapatellar", "Graft harvest incision (hamstring)", "Graft harvest incision (patellar tendon)"],
  tendonRepair: ["Longitudinal", "Curvilinear", "Percutaneous", "Deltopectoral", "Kocher"],
  arthroscopy: ["Anterior portal", "Posterior portal", "Anterolateral portal", "Anteromedial portal", "Accessory portal"],
  spineSurgery: ["Posterior midline", "Posterolateral", "Anterior (ALIF)", "Lateral (XLIF/DLIF)", "Minimally invasive / tubular"],
  jointStabilization: ["Deltopectoral (anterior shoulder)", "Posterior shoulder", "Arthroscopic portals", "Lateral"],
  softTissueMuscle: ["Longitudinal", "Transverse", "Curvilinear", "Percutaneous"],
  amputation: ["Long posterior flap", "Skew flap", "Fish-mouth (equal anteroposterior)", "Guillotine (to be revised)"],
  tendonTransfer: ["Dorsal", "Volar", "Longitudinal", "Curvilinear"],
  deformityCorrection: ["Medial", "Lateral", "Anterior", "Percutaneous osteotomy", "Minimally invasive"],
};
const GENERIC_INCISION_TYPES = ["Anterior", "Posterior", "Medial", "Lateral", "Anterolateral", "Posterolateral", "Percutaneous / minimally invasive", "Arthroscopic portal(s)"];

/* Always present for every post-op patient, regardless of surgery type. */
const BASE_IDS = ["caseInfo", "surgicalReview", "vitals", "pain", "observation", "surgicalSite", "rom", "mmt", "functionalMobility", "gait", "balance", "activityTolerance", "outcomeMeasure", "impression", "carePlan", "review"];
/* Only added via "+ Add Assessment" unless a condition promotes them. */
const OPTIONAL_IDS = ["jointMobility", "specialTests", "neuroScreen", "residualLimb", "prosthesis"];

const ORDERED_ALL = [
  "caseInfo",
  "surgicalReview",
  "vitals",
  "pain",
  "observation",
  "surgicalSite",
  "residualLimb",
  "prosthesis",
  "neuroScreen",
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
  "carePlan",
  "review",
];

const STEP_META = {
  caseInfo: { icon: "📋", label: "Patient / Case Info" },
  surgicalReview: { icon: "🩺", label: "Surgical Review" },
  vitals: { icon: "❤️", label: "Vital Signs" },
  pain: { icon: "😖", label: "Pain" },
  observation: { icon: "👁️", label: "Observation" },
  surgicalSite: { icon: "🩹", label: "Surgical Site" },
  residualLimb: { icon: "🦵", label: "Residual Limb" },
  prosthesis: { icon: "🦿", label: "Prosthesis" },
  neuroScreen: { icon: "🧠", label: "Neurological Screen" },
  rom: { icon: "📐", label: "ROM" },
  mmt: { icon: "💪", label: "MMT / Muscle Activation" },
  jointMobility: { icon: "🦴", label: "Joint Mobility" },
  specialTests: { icon: "🔬", label: "Special Tests" },
  functionalMobility: { icon: "🛏️", label: "Functional Mobility" },
  gait: { icon: "🚶", label: "Gait / Ambulation" },
  balance: { icon: "⚖️", label: "Balance" },
  activityTolerance: { icon: "🏃", label: "Activity Tolerance" },
  outcomeMeasure: { icon: "📊", label: "Outcome Measure" },
  impression: { icon: "🧠", label: "Clinical Impression" },
  carePlan: { icon: "🎯", label: "Problems, Goals & Plan" },
  review: { icon: "✅", label: "Final Review" },
};

const ADD_LIBRARY = OPTIONAL_IDS.map((id) => ({ id, ...STEP_META[id] }));

// Exported so SpecialtyPatientProfile.jsx's Ortho Assessment tab can render
// the EXACT same summary this wizard's own Final Review step uses (same
// pattern as OrthoOutpatientAssessment.jsx's buildOrthoAssessSteps /
// orthoSummaryFormatters).
export function buildOrthoPostOpAssessSteps() {
  return ORDERED_ALL.map((id) => ({ id, ...STEP_META[id] }));
}
export const orthoPostOpSummaryFormatters = { rom: formatRomSection, mmt: formatMmtSection, jointMobility: formatJointMobilitySection, specialTests: formatSpecialTestsSection };

/* ============================================================
   SECTION CONTENT
   ============================================================ */
function SurgicalReviewSection({ data, setData, condition, selectedRegions }) {
  const [d, set] = useSectionData(data, setData, "surgicalReview");
  return (
    <>
      <SectionIntro icon="🩺" title="Surgical Review" />
      <Alert tone="amber">{PROTOCOL_SAFETY_NOTE}</Alert>
      <DateField label="Date of surgery" value={d.surgeryDate} onChange={(v) => set("surgeryDate", v)} />
      <NumberField label="Post-operative day / week" value={d.postOpDay} onChange={(v) => set("postOpDay", v)} unit="POD" />
      <TextArea label="Surgeon instructions" value={d.surgeonInstructions} onChange={(v) => set("surgeonInstructions", v)} placeholder="Copy the documented protocol — do not paraphrase into a new plan" />
      <Segmented label="Drain" options={["None", "Present"]} value={d.drain} onChange={(v) => set("drain", v)} />

      <SurgicalDetailsSection data={data} setData={setData} sectionKey="surgicalReview" selectedRegions={selectedRegions} conditionId={condition} />
    </>
  );
}

function SurgicalSiteSection({ data, setData, condition, selectedRegions }) {
  const [d, set] = useSectionData(data, setData, "surgicalSite");
  const siteOptions = selectedRegions?.length ? selectedRegions.map((r) => regionLabelOf(r)) : ["Not specified"];
  const incisionOptions = INCISION_TYPES_BY_CONDITION[condition] || GENERIC_INCISION_TYPES;
  return (
    <>
      <SectionIntro icon="🩹" title="Surgical Site" info="Describe what you observe — do not infer infection from appearance alone. Escalate concerning findings (spreading redness, purulent drainage, fever) to the medical team." />
      <SelectField label="Surgical site" type="multi" options={siteOptions} value={d.site} onChange={(v) => set("site", v)} />
      <SelectField label="Incision type" type="single" options={incisionOptions} value={d.incisionType} onChange={(v) => set("incisionType", v)} />
      <div className="subheading">Incision / wound</div>
      <SelectField label="Appearance" type="multi" options={["Clean", "Redness", "Swelling", "Drainage", "Gaping", "Other"]} value={d.appearance} onChange={(v) => set("appearance", v)} />
      <Segmented label="Dressing" options={["Intact", "Changed", "Other"]} value={d.dressing} onChange={(v) => set("dressing", v)} />
      <Segmented label="Drainage present" options={["None", "Present"]} value={d.drainage} onChange={(v) => set("drainage", v)} />

      <div className="subheading">Edema</div>
      <Segmented label="Side" options={["Right", "Left", "Bilateral"]} value={d.edemaSide} onChange={(v) => set("edemaSide", v)} />
      <Segmented label="Severity" options={["None", "Mild", "Moderate", "Severe"]} value={d.edemaSeverity} onChange={(v) => set("edemaSeverity", v)} />
      <YesNo label="Pitting" value={d.pitting} onChange={(v) => set("pitting", v)} />
      {d.pitting === "Yes" && <Segmented label="Pitting grade" options={["1+", "2+", "3+", "4+"]} value={d.pittingGrade} onChange={(v) => set("pittingGrade", v)} />}

      <div className="subheading">Skin</div>
      <SelectField label="Skin" type="multi" options={["Normal", "Bruising", "Redness", "Pallor", "Pressure area", "Broken skin"]} value={d.skin} onChange={(v) => set("skin", v)} />

      <div className="subheading">Neurovascular</div>
      <Segmented label="Capillary refill" options={["Normal", "Delayed"]} value={d.capRefill} onChange={(v) => set("capRefill", v)} />
      <Segmented label="Distal pulse" options={["Present", "Reduced", "Absent", "Not assessed"]} value={d.pulse} onChange={(v) => set("pulse", v)} />
      <Segmented label="Sensation" options={["Intact", "Reduced", "Absent", "Not assessed"]} value={d.sensation} onChange={(v) => set("sensation", v)} />
      <Hint>Any acute deterioration (new numbness, pallor, absent pulse) is a medical emergency — escalate immediately.</Hint>
    </>
  );
}

function ResidualLimbSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "residualLimb");
  return (
    <>
      <SectionIntro icon="🦵" title="Residual Limb" />
      <TextField label="Shape" value={d.shape} onChange={(v) => set("shape", v)} placeholder="e.g. cylindrical, conical" />
      <Segmented label="Wound" options={["Healing well", "Delayed healing", "Dehiscence", "Not applicable"]} value={d.wound} onChange={(v) => set("wound", v)} />
      <Segmented label="Edema" options={["None", "Mild", "Moderate", "Severe"]} value={d.edema} onChange={(v) => set("edema", v)} />
      <SelectField label="Skin" type="multi" options={["Normal", "Redness", "Breakdown", "Pressure area"]} value={d.skin} onChange={(v) => set("skin", v)} />
      <Segmented label="Sensitivity" options={["Normal", "Hypersensitive", "Reduced", "Absent"]} value={d.sensitivity} onChange={(v) => set("sensitivity", v)} />
      <NumberField label="Residual limb pain" value={d.pain} onChange={(v) => set("pain", v)} unit="/10" />
      <SelectField label="Phantom limb symptoms" type="multi" options={["None", "Phantom sensation", "Phantom pain", "Telescoping"]} value={d.phantom} onChange={(v) => set("phantom", v)} />
    </>
  );
}

function ProsthesisSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "prosthesis");
  return (
    <>
      <SectionIntro icon="🦿" title="Prosthesis" />
      <Segmented label="Prosthetic status" options={["Not yet fitted", "Temporary/preparatory", "Definitive", "Not applicable"]} value={d.status} onChange={(v) => set("status", v)} />
      <Segmented label="Prosthetic tolerance" options={["Good", "Fair", "Poor", "Not applicable"]} value={d.tolerance} onChange={(v) => set("tolerance", v)} />
      <TextArea label="Prosthetic training needs" value={d.trainingNeeds} onChange={(v) => set("trainingNeeds", v)} />
    </>
  );
}

function NeuroScreenSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "neuroScreen");
  return (
    <>
      <SectionIntro icon="🧠" title="Neurological Screen" info="A brief screen post spine surgery — full myotome/dermatome testing only if clinically indicated or per protocol." />
      <SelectField label="Motor screen" type="multi" options={["Grossly intact", "Weakness — upper limb", "Weakness — lower limb", "Not assessed"]} value={d.motor} onChange={(v) => set("motor", v)} />
      <SelectField label="Sensory screen" type="multi" options={["Grossly intact", "Numbness", "Tingling / paraesthesia", "Not assessed"]} value={d.sensory} onChange={(v) => set("sensory", v)} />
      <Segmented label="Reflexes" options={["Normal", "Diminished", "Absent", "Not tested"]} value={d.reflexes} onChange={(v) => set("reflexes", v)} />
      <SelectField label="Neural symptoms" type="multi" options={["None", "Radiating pain", "Numbness", "Tingling"]} value={d.neuralSymptoms} onChange={(v) => set("neuralSymptoms", v)} />
      <TextArea label="Functional neurological status" value={d.functionalStatus} onChange={(v) => set("functionalStatus", v)} />
    </>
  );
}

/* ============================================================
   ADD ASSESSMENT MODAL
   ============================================================ */
function AddAssessmentModal({ activeIds, onToggle, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const items = query ? ADD_LIBRARY.filter((it) => it.label.toLowerCase().includes(query)) : ADD_LIBRARY;
  return (
    <div className="ct-modal">
      <div className="ct-modal-header">
        <div className="ct-modal-title">🛏️ Add Assessment</div>
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

/* ============================================================
   MAIN APP — mounted by OrthoAssessment.jsx once region + type
   of surgery have been picked on the preceding two screens.
   ============================================================ */
export default function OrthoPostOpAssessment({ selectedRegions, condition, customConditionLabel, onExit, onSave, activePatientId, patientData, initialData, initialStep }) {
  const conditionMeta = POSTOP_CONDITIONS.find((c) => c.id === condition);
  const conditionLabel = conditionMeta ? conditionMeta.label : customConditionLabel || "Other";

  const [stepOrder, setStepOrder] = useState(() => {
    const promoted = conditionMeta ? conditionMeta.promote : FALLBACK_PROMOTE;
    return ORDERED_ALL.filter((id) => BASE_IDS.includes(id) || promoted.includes(id));
  });
  // initialStep (2026-09-02, Aditi: "edit assessment should take us to
  // last page... not to pathway or region selection") -- resuming via
  // Edit lands straight on Review with the saved data.
  const [step, setStep] = useState(() => {
    if (!initialStep) return 0;
    const idx = stepOrder.indexOf(initialStep);
    return idx >= 0 ? idx : 0;
  });
  // Seed Case Info's name/age/sex from the patient already open (if any) so
  // this doesn't ask the physio to re-type demographics that already exist
  // on the record, and so Save below writes back onto the same person
  // instead of an unnamed/mismatched one. initialData (same 2026-09-02
  // fix) takes priority -- a resumed Edit already has real saved answers.
  const [data, setData] = useState(() => {
    if (initialData) return initialData;
    const dem = patientData || {};
    const caseInfo = {};
    if (dem.dem_name) caseInfo.name = dem.dem_name;
    if (dem.dem_age) caseInfo.age = dem.dem_age;
    if (dem.dem_sex) caseInfo.sex = dem.dem_sex;
    return Object.keys(caseInfo).length ? { caseInfo } : {};
  });
  const [visited, setVisited] = useState(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [missingDemFields, setMissingDemFields] = useState(null);

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

  // Persist a snapshot on the active patient record -- same set(key,value)
  // pattern Outpatient/Cardio/Neuro's own Final Review "Save" already uses.
  // This was entirely missing before (2026-08-31 fix): this component never
  // received onSave/activePatientId at all, so a full post-op assessment
  // vanished the moment you left the screen.
  function saveAssessment() {
    if (!onSave) return;
    onSave("ortho_postop_assessment", JSON.stringify({
      savedAt: new Date().toISOString(),
      patientId: activePatientId || null,
      regions: regionsLabel,
      condition: conditionLabel,
      data,
      // Raw resume fields (2026-09-02, Aditi: "edit assessment should
      // take us to last page... not to pathway or region selection") --
      // regions/condition above are already-joined display strings, not
      // usable to reconstruct selectedRegions/condition props on Edit.
      selectedRegions,
      rawCondition: condition,
      customConditionLabel,
    }));
    if (caseInfo.name) onSave("dem_name", caseInfo.name);
    // PatientDatabase.jsx's IPD/Outpatient/Post-op filter pills read this
    // top-level field directly.
    onSave("care_setting", "postop");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  // The explicit "Save Assessment" tap, gated on name+age -- silent 2s
  // auto-save above still runs regardless so in-progress work always
  // survives a crash/tab-close, this just stops the therapist from
  // believing a *named, findable* record was saved when it wasn't.
  function handleSaveClick() {
    const missing = missingDemographicsFields(caseInfo);
    if (missing.length) { setMissingDemFields(missing); return; }
    saveAssessment();
  }

  // Auto-save (2026-09-02, Aditi: "not saving patient and assessment
  // automatically... nothing saving") -- this wizard keeps its own local
  // `data` state, separate from the app-wide data/set pair AppFull.jsx's
  // real autosave (2s-debounced local draft + Supabase) actually watches.
  // Previously nothing here reached that pipeline until the therapist
  // manually reached Review and tapped Save -- leaving mid-assessment
  // lost everything, patient record included (see saveAssessment's
  // dem_name mirror above). Debounced auto-save calls the same
  // saveAssessment() automatically, ~2s after the last edit, same as
  // every other module's autosave.
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
          {current.id === "surgicalReview" && <SurgicalReviewSection data={data} setData={setData} condition={condition} selectedRegions={selectedRegions} />}
          {current.id === "vitals" && <VitalsSection data={data} setData={setData} />}
          {current.id === "pain" && <PainSection data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} />}
          {current.id === "observation" && <ObservationSection data={data} setData={setData} showResponseToActivity />}
          {current.id === "surgicalSite" && <SurgicalSiteSection data={data} setData={setData} condition={condition} selectedRegions={selectedRegions} />}
          {current.id === "residualLimb" && <ResidualLimbSection data={data} setData={setData} />}
          {current.id === "prosthesis" && <ProsthesisSection data={data} setData={setData} />}
          {current.id === "neuroScreen" && <NeuroScreenSection data={data} setData={setData} />}
          {current.id === "rom" && <RomSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "mmt" && <MmtSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "jointMobility" && <JointMobilitySection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "specialTests" && <SpecialTestsSection data={data} setData={setData} selectedRegions={selectedRegions} />}
          {current.id === "functionalMobility" && <FunctionalMobilitySection data={data} setData={setData} />}
          {current.id === "gait" && <GaitSection data={data} setData={setData} showStairs />}
          {current.id === "balance" && <BalanceSection data={data} setData={setData} />}
          {current.id === "activityTolerance" && <ActivityToleranceSection data={data} setData={setData} />}
          {current.id === "outcomeMeasure" && <OrthoOutcomeMeasureFlow data={data} setData={setData} selectedRegions={selectedRegions} regionLabelOf={regionLabelOf} />}
          {current.id === "impression" && <ImpressionSection data={data} setData={setData} />}
          {current.id === "carePlan" && (
            <>
              <style>{orthoStyles()}</style>
              <OrthoCarePlanStep patientData={patientData} onSave={onSave} selectedRegions={selectedRegions} condition={condition} setting="postop" pain={{ now: data.pain?.nrs_now ?? data.pain?.now, worst: data.pain?.nrs_worst ?? data.pain?.worst }} />
            </>
          )}
          {current.id === "review" && (
            <>
              <AssessmentSummary
                icon="✅"
                title="Post-operative Rehab Assessment"
                sub={`${regionsLabel} · ${conditionLabel}`}
                steps={steps}
                data={data}
                onEdit={jumpTo}
                exportHeaderLines={[`POST-OPERATIVE ORTHOPEDIC REHAB ASSESSMENT`, `Region(s): ${regionsLabel}`, `Surgery: ${conditionLabel}`]}
                extra={<Alert tone="amber">{PROTOCOL_SAFETY_NOTE}</Alert>}
                formatters={{ rom: formatRomSection, mmt: formatMmtSection, jointMobility: formatJointMobilitySection, specialTests: formatSpecialTestsSection, outcomeMeasure: formatOutcomeMeasureSection }}
              />
              {onSave && (
                <button type="button" className="primary-btn" style={{ width: "100%", marginTop: 10 }} onClick={handleSaveClick}>
                  {savedFlash ? "Saved ✓" : "💾 Save Assessment"}
                </button>
              )}
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
            onGoToDemographics={() => { setMissingDemFields(null); jumpTo("caseInfo"); }}
          />
        )}
      </div>
    </div>
  );
}

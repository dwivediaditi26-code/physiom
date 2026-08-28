import React, { useState, lazy, Suspense } from "react";
import { SectionIntro, TextField, SelectField, Segmented, TextArea, NumberField, Stepper, Hint, useSectionData, fmtVal } from "./orthoFieldKit.jsx";
import { RedFlagFields } from "./orthoRedFlagScreen.jsx";
import { subjectiveFieldsForRegion } from "./orthoSubjectiveRegionData.js";
import { hasOldSubjectiveData, importOldSubjectiveData } from "./orthoAiIntake.js";

// Same SVG anatomical hotspot map used by the old Palpation flow
// (ClinicalModules.jsx's PalpationModule) -- lazy-loaded for the same reason
// as Pain's body chart: large, self-contained, only needed once opened.
const LazyPalpationModule = lazy(() => import("./lazy_palpation.jsx"));

// AI text/voice intake for Subjective -- lazy-loaded since most sessions
// won't open it, and it pulls in its own fetch/speech-recognition logic.
const LazyOrthoAIIntakePanel = lazy(() => import("./OrthoAIIntakePanel.jsx"));

/* ============================================================
   Outpatient / Musculoskeletal — sections specific to the full
   first-visit OPD assessment. These are NOT shared with IPD or
   Post-op (see orthoCommonSections.jsx for the sections that
   are shared across all three pathways).
   ============================================================ */

function RegionField({ field, value, onChange }) {
  if (field.type === "multi" || field.type === "single") {
    return <SelectField label={field.label} type={field.type} options={field.options} value={value} onChange={onChange} />;
  }
  if (field.type === "textarea") return <TextArea label={field.label} value={value} onChange={onChange} />;
  return <TextField label={field.label} value={value} onChange={onChange} />;
}

/* Tab row reusing the exact .region-tab-row-wrap/.region-tab CSS already
   used by ROM/MMT (orthoRegionAssessments.jsx) — one tab per region picked
   at Setup, each showing that region's own core subjective field set. */
function RegionSubjectiveTabs({ selectedRegions, regionLabelOf, regions, setRegions }) {
  const [activeIdx, setActiveIdx] = useState(0);
  if (!selectedRegions.length) return null;
  const region = selectedRegions[Math.min(activeIdx, selectedRegions.length - 1)];
  const fields = subjectiveFieldsForRegion(region);
  const regionData = regions[region.id] || {};
  function setField(fieldId, value) {
    setRegions({ ...regions, [region.id]: { ...regionData, [fieldId]: value } });
  }
  return (
    <>
      <div className="subheading">Region-specific subjective</div>
      <div className="region-tab-row-wrap">
        <div className="region-tab-row">
          {selectedRegions.map((r, i) => (
            <button type="button" key={r.id + i} className={"region-tab" + (activeIdx === i ? " region-tab-active" : "")} onClick={() => setActiveIdx(i)}>
              {regionLabelOf(r)}
            </button>
          ))}
        </div>
      </div>
      {fields.map((f) => (
        <RegionField key={f.id} field={f} value={regionData[f.id]} onChange={(v) => setField(f.id, v)} />
      ))}
    </>
  );
}

export function DemographicsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "demographics");
  return (
    <>
      <SectionIntro icon="📋" title="Demographics" />
      <TextField label="Full name" value={d.name} onChange={(v) => set("name", v)} placeholder="Patient's full name" />
      <div className="row-2">
        <TextField label="Date of birth" value={d.dob} onChange={(v) => set("dob", v)} placeholder="DD/MM/YYYY" />
        <SelectField label="Sex" type="single" options={["Male", "Female", "Other", "Prefer not to say"]} value={d.sex} onChange={(v) => set("sex", v)} />
      </div>
      <SelectField label="Hand dominance" type="single" options={["Right", "Left", "Ambidextrous"]} value={d.dominant} onChange={(v) => set("dominant", v)} />
      <div className="row-2">
        <TextField label="Occupation" value={d.occupation} onChange={(v) => set("occupation", v)} />
        <TextField label="Employer / industry" value={d.employer} onChange={(v) => set("employer", v)} />
      </div>
      <SelectField label="Work status" type="single" options={["Full time", "Part time", "Self employed", "Off work — injury", "Off work — illness", "Retired", "Unemployed", "Student", "Home duties"]} value={d.workStatus} onChange={(v) => set("workStatus", v)} />
      <SelectField label="Referred by" type="single" options={["Self referred", "GP", "Orthopaedic surgeon", "Rheumatologist", "Neurologist", "Emergency dept", "Employer", "Insurer", "Solicitor", "Other"]} value={d.referral} onChange={(v) => set("referral", v)} />
      <TextField label="GP name & practice" value={d.gp} onChange={(v) => set("gp", v)} />
      <Segmented label="Affected side" options={["Right", "Left", "Bilateral"]} value={d.affectedSide} onChange={(v) => set("affectedSide", v)} />
      <TextField label="Provisional diagnosis" value={d.provisionalDiagnosis} onChange={(v) => set("provisionalDiagnosis", v)} placeholder="Working / referral diagnosis" />
      <SelectField label="Consent" type="single" options={["Yes — verbal", "Yes — written", "Not yet"]} value={d.consent} onChange={(v) => set("consent", v)} />
      <TextArea label="Notes" value={d.notes} onChange={(v) => set("notes", v)} placeholder="Any additional context" />
    </>
  );
}

export function RedFlagScreenSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "redFlags");
  return (
    <>
      <SectionIntro icon="🚩" title="Red Flag Screen" info="A quick systemic screen — not a diagnosis, just a prompt to escalate or refer when indicated." />
      <RedFlagFields d={d} set={set} />
    </>
  );
}

export function SubjectiveSection({ data, setData, selectedRegions = [], regionLabelOf, requireAuth, autoOpenAI, onConditionDetected, detectedConditionLabel, patientData }) {
  const [d, set] = useSectionData(data, setData, "subjective");

  // Same old-flow import OrthoAssessment.jsx's AI-intake landing screen
  // offers (see orthoAiIntake.js) -- surfaced here too since a therapist
  // who skips that screen (manual/condition-wise/template entry, or just
  // scrolled past it) never sees that option otherwise. Only fills fields
  // still blank so it can't silently clobber anything already typed here.
  function loadOldSubjective() {
    const { subjective } = importOldSubjectiveData(patientData);
    setData((prev) => {
      const existing = prev.subjective || {};
      const merged = { ...existing };
      Object.entries(subjective).forEach(([k, v]) => {
        if (!String(existing[k] || "").trim()) merged[k] = v;
      });
      return { ...prev, subjective: merged };
    });
  }

  // AI intake writes into both Subjective and Pain in one go -- it needs
  // the wizard's top-level setData, not this section's own scoped `set`
  // (which can only ever touch data.subjective).
  function applyAiUpdates(updates) {
    setData((prev) => ({
      ...prev,
      subjective: { ...prev.subjective, ...updates.subjective },
      pain: { ...prev.pain, ...updates.pain },
    }));
    // Real fix for "AI Assisted Assessment always suggests generic Objective
    // tests" -- the wizard was hardcoding condition="general" for the whole
    // session regardless of what the patient's own narrative describes.
    // onConditionDetected (only passed when this is that AI-assisted
    // "general" entry -- see OrthoOutpatientAssessment.jsx) promotes the
    // matching OUTPATIENT_CONDITIONS bucket the same way picking it
    // manually on the Condition-wise screen would, so Suggested Objective
    // (orthoObjectiveSuggestions.js reads `condition`) actually tailors its
    // suggestions instead of only ever showing the baseline set.
    if (onConditionDetected && updates.conditionCategory && updates.conditionCategory !== "other") {
      onConditionDetected(updates.conditionCategory);
    }
  }

  return (
    <>
      <SectionIntro icon="📝" title="Subjective Assessment" />
      {hasOldSubjectiveData(patientData) && (
        <button type="button" className="ghost-btn" style={{ width: "100%", marginBottom: 12 }} onClick={loadOldSubjective}>
          📋 Load from this patient's existing Subjective Assessment
        </button>
      )}
      <Suspense fallback={<Hint>Loading AI intake…</Hint>}>
        <LazyOrthoAIIntakePanel onApply={applyAiUpdates} requireAuth={requireAuth} defaultOpen={autoOpenAI} />
      </Suspense>
      {detectedConditionLabel && (
        <Hint>✨ Detected clinical context from your narrative: <b>{detectedConditionLabel}</b> — relevant objective tests will be suggested accordingly on the Suggested Objective step.</Hint>
      )}
      <TextArea label="Chief complaint" value={d.chiefComplaint} onChange={(v) => set("chiefComplaint", v)} placeholder="In the patient's own words..." />
      <div className="row-2">
        <SelectField label="Onset" type="single" options={["Sudden", "Gradual", "Insidious", "Post-exercise", "Post-injury"]} value={d.onset} onChange={(v) => set("onset", v)} />
        <TextField label="Duration" value={d.duration} onChange={(v) => set("duration", v)} placeholder="e.g. 3 weeks" />
      </div>
      <TextArea label="Previous treatment" value={d.previousTreatment} onChange={(v) => set("previousTreatment", v)} placeholder="Prior physio, injections, medication, surgery..." />
      <TextArea label="Relevant medical history" value={d.medicalHistory} onChange={(v) => set("medicalHistory", v)} />
      <TextField label="Medication" value={d.medication} onChange={(v) => set("medication", v)} />
      <TextArea label="Functional limitations" value={d.functionalLimitations} onChange={(v) => set("functionalLimitations", v)} placeholder="What the patient can no longer do..." />
      <TextArea label="Patient goals" value={d.patientGoals} onChange={(v) => set("patientGoals", v)} placeholder="What matters most to the patient right now" />

      <RegionSubjectiveTabs
        selectedRegions={selectedRegions}
        regionLabelOf={regionLabelOf}
        regions={d.regions || {}}
        setRegions={(next) => set("regions", next)}
      />
    </>
  );
}

/* formatters[stepId] contract for orthoSummary.jsx: (section) => [{label, value}] */
export function formatSubjectiveSection(section) {
  const rows = Object.entries(section)
    .filter(([k]) => k !== "regions" && !k.startsWith("__"))
    .map(([k, v]) => ({ label: k, value: fmtVal(v) }))
    .filter((r) => r.value);
  const regions = section.regions || {};
  Object.entries(regions).forEach(([regionId, regionData]) => {
    Object.entries(regionData).forEach(([fieldId, v]) => {
      const val = fmtVal(v);
      if (val) rows.push({ label: `${regionId} — ${fieldId}`, value: val });
    });
  });
  return rows;
}

export function PalpationSection({ data, setData, selectedRegions = [], regionLabelOf }) {
  const [d, set] = useSectionData(data, setData, "palpation");
  const [mapOpen, setMapOpen] = useState(true);
  return (
    <>
      <SectionIntro icon="🖐️" title="Palpation" />
      <button type="button" className="collapsible-head" onClick={() => setMapOpen((o) => !o)}>
        <span>Body Map</span>
        <span className={"collapsible-chevron" + (mapOpen ? " open" : "")}>⌄</span>
      </button>
      {mapOpen && (
        <Suspense fallback={<Hint>Loading palpation body map…</Hint>}>
          <LazyPalpationModule data={d} set={set} />
        </Suspense>
      )}
      <div className="subheading">Findings</div>
      <Segmented label="Swelling" options={["None", "Mild", "Moderate", "Severe"]} value={d.swelling} onChange={(v) => set("swelling", v)} />
      <SelectField label="Muscle tone" type="multi" options={["Normal", "Hypertonic", "Hypotonic", "Spasm", "Guarding"]} value={d.muscleTone} onChange={(v) => set("muscleTone", v)} />
      <TextArea label="Trigger points" value={d.triggerPoints} onChange={(v) => set("triggerPoints", v)} placeholder="Location and referral pattern..." />
      <SelectField label="Scar / tissue mobility" type="multi" options={["N/A", "Normal", "Adherent", "Restricted", "Hypersensitive"]} value={d.scarMobility} onChange={(v) => set("scarMobility", v)} />
    </>
  );
}

const TASK_OPTIONS = ["Normal", "Modified", "Limited", "Unable", "Not assessed"];
function TaskField({ label, value, onChange }) {
  return <Segmented label={label} options={TASK_OPTIONS} value={value} onChange={onChange} wrap />;
}

export function FunctionalAssessmentSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "functionalAssessment");
  return (
    <>
      <SectionIntro icon="🏃" title="Functional Assessment" info="Rate the tasks relevant to this patient's region/condition — not every task applies to every case." />
      <TaskField label="Sit-to-stand" value={d.sitToStand} onChange={(v) => set("sitToStand", v)} />
      <TaskField label="Squat" value={d.squat} onChange={(v) => set("squat", v)} />
      <TaskField label="Stairs" value={d.stairs} onChange={(v) => set("stairs", v)} />
      <TaskField label="Walking" value={d.walking} onChange={(v) => set("walking", v)} />
      <TaskField label="Running" value={d.running} onChange={(v) => set("running", v)} />
      <TaskField label="Reaching" value={d.reaching} onChange={(v) => set("reaching", v)} />
      <TaskField label="Lifting" value={d.lifting} onChange={(v) => set("lifting", v)} />
      <TaskField label="ADLs" value={d.adls} onChange={(v) => set("adls", v)} />
      <TextField label="Sport / work-specific task" value={d.sportWorkTask} onChange={(v) => set("sportWorkTask", v)} placeholder="e.g. Overhead throw, squat-lift at work..." />
      <TaskField label="Sport / work task performance" value={d.sportWorkPerformance} onChange={(v) => set("sportWorkPerformance", v)} />
    </>
  );
}

export function ClinicalAssessmentSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "clinicalAssessment");
  return (
    <>
      <SectionIntro icon="🧠" title="Clinical Assessment" info="Clinician's own reasoning from the findings above — not an AI-generated diagnosis." />
      <TextArea label="Key findings" value={d.keyFindings} onChange={(v) => set("keyFindings", v)} />
      <TextArea label="Impairments" value={d.impairments} onChange={(v) => set("impairments", v)} />
      <TextArea label="Movement dysfunction" value={d.movementDysfunction} onChange={(v) => set("movementDysfunction", v)} />
      <TextArea label="Contributing factors" value={d.contributingFactors} onChange={(v) => set("contributingFactors", v)} />
      <TextArea label="Clinical impression" value={d.clinicalImpression} onChange={(v) => set("clinicalImpression", v)} />
      <TextArea label="Problem list" value={d.problemList} onChange={(v) => set("problemList", v)} placeholder="Key problems in priority order..." />
    </>
  );
}

export function GoalsSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "goals");
  return (
    <>
      <SectionIntro icon="🎯" title="Goals" />
      <div className="subheading">Short-term goals</div>
      <TextField label="Pain" value={d.stPain} onChange={(v) => set("stPain", v)} />
      <TextField label="ROM" value={d.stRom} onChange={(v) => set("stRom", v)} />
      <TextField label="Strength" value={d.stStrength} onChange={(v) => set("stStrength", v)} />
      <TextField label="Function" value={d.stFunction} onChange={(v) => set("stFunction", v)} />
      <div className="subheading">Long-term goals</div>
      <TextField label="ADL" value={d.ltAdl} onChange={(v) => set("ltAdl", v)} />
      <TextField label="Work" value={d.ltWork} onChange={(v) => set("ltWork", v)} />
      <TextField label="Sport" value={d.ltSport} onChange={(v) => set("ltSport", v)} />
      <TextField label="Independence" value={d.ltIndependence} onChange={(v) => set("ltIndependence", v)} />
    </>
  );
}

export function TreatmentPlanSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "treatmentPlan");
  return (
    <>
      <SectionIntro icon="📋" title="Treatment Plan" />
      <SelectField label="Manual therapy" type="multi" options={["Joint mobilization", "Soft tissue release", "Myofascial release", "Manipulation", "Dry needling"]} value={d.manualTherapy} onChange={(v) => set("manualTherapy", v)} />
      <SelectField label="Exercise therapy" type="multi" options={["Mobility exercises", "Strengthening", "Stretching", "Neuromuscular training", "Gait training", "Balance training"]} value={d.exerciseTherapy} onChange={(v) => set("exerciseTherapy", v)} />
      <SelectField label="Modalities" type="multi" options={["N/A", "Heat", "Ice", "TENS", "Ultrasound", "IFT", "Laser"]} value={d.modalities} onChange={(v) => set("modalities", v)} />
      <TextArea label="Education" value={d.education} onChange={(v) => set("education", v)} placeholder="Posture, ergonomics, activity modification, pacing..." />
      <TextArea label="Home exercise program" value={d.hep} onChange={(v) => set("hep", v)} />
      <div className="row-2">
        <TextField label="Frequency" value={d.frequency} onChange={(v) => set("frequency", v)} placeholder="e.g. 3x/week" />
        <TextField label="Duration" value={d.duration} onChange={(v) => set("duration", v)} placeholder="e.g. 6 weeks" />
      </div>
      <TextField label="Follow-up" value={d.followUp} onChange={(v) => set("followUp", v)} placeholder="Next review date / interval" />
    </>
  );
}

/* ============================================================
   TREATMENT TECHNIQUES — the same per-technique log Treatment's
   own Techniques tab (ClinicalModules.jsx's TreatmentTechniquesModule,
   data.tx_techniques) has always recorded: Joint Mob (Maitland grade),
   Dry Needling, Soft Tissue, Taping, Ultrasound, Electrotherapy, Other,
   each with its own dosage/response fields, saved as a running list you
   can edit or delete. Same feature, rebuilt on this file's own field-kit
   (SectionIntro/Segmented/SelectField/TextArea/NumberField) instead of
   ClinicalModules.jsx's older inline-styled form, so it looks and
   behaves like every other Ortho Outpatient step. Storage is local to
   this pathway's own `techniques.entries` (useSectionData), matching
   how every other section here stores its own namespaced data.
   ============================================================ */
const TECHNIQUE_TYPES = [
  { key: "manual", label: "Joint Mob", icon: "🦴" },
  { key: "dn", label: "Dry Needling", icon: "🪡" },
  { key: "st", label: "Soft Tissue", icon: "👐" },
  { key: "taping", label: "Taping", icon: "🎗️" },
  { key: "us", label: "Ultrasound", icon: "〰️" },
  { key: "electro", label: "Electrotherapy", icon: "⚡" },
  { key: "other", label: "Other", icon: "➕" },
];
const MAITLAND_GRADES = [
  { grade: "I", desc: "Small amplitude, beginning of range — pain control, acute" },
  { grade: "II", desc: "Large amplitude, within range (no resistance) — pain control" },
  { grade: "III", desc: "Large amplitude into resistance — stiffness/pain" },
  { grade: "IV", desc: "Small amplitude into resistance — stiffness predominant" },
  { grade: "IV+", desc: "End range, high velocity — HVLAT manipulation" },
];
const BODY_REGIONS_TX = ["Cervical", "Thoracic", "Lumbar", "Sacroiliac", "Shoulder", "Elbow", "Wrist/Hand", "Hip", "Knee", "Ankle/Foot", "Rib", "TMJ"];
const MANUAL_TECHNIQUES = ["PA Central", "PA Unilateral", "AP", "Transverse", "Rotation", "Traction", "SNAG", "NAG", "Mulligan MWM", "Quadrant", "Combined technique"];
const DN_MUSCLES = ["Upper trapezius", "Levator scapulae", "SCM", "Infraspinatus", "Supraspinatus", "Subscapularis", "Rhomboids", "Erector spinae", "Multifidus", "QL", "Gluteus maximus", "Gluteus medius", "Piriformis", "TFL", "Rectus femoris", "Hamstrings", "Gastrocnemius", "Soleus", "Tibialis anterior", "Pectoralis minor", "Pectoralis major", "Scalenes", "Suboccipitals"];
const ST_TECHNIQUES = ["Deep tissue massage", "Myofascial release", "Trigger point release", "Friction massage", "IASTM", "Cupping", "Foam roller prescription", "PNF stretching", "Contract-relax stretching", "Passive stretching"];
const TAPING_TYPES = ["McConnell — Patellar medial glide", "McConnell — Patellar tilt correction", "Kinesio — Pain inhibition", "Kinesio — Muscle facilitation", "Kinesio — Fascia correction", "Rigid sports tape", "Leukotape — posture correction", "Dynamic tape — load transfer"];
const US_FREQ = ["1 MHz (deep — 3–5cm)", "3 MHz (superficial — 1–2cm)"];
const US_MODE = ["Pulsed 20%", "Pulsed 50%", "Continuous"];
const ELECTRO_TYPES = ["TENS — conventional (80–150Hz)", "TENS — acupuncture-like (2–4Hz)", "IFT — 80–150Hz (pain)", "IFT — 1–10Hz (muscle stim)", "SWD", "NMES", "Russian stim", "LASER — class 3B/4", "Shockwave"];

const BLANK_TECHNIQUE = { id: null, type: "manual", region: "", technique: "", grade: "", laterality: "", sets: "", durationMin: "", frequency: "", dosage: "", duration: "", response: "", notes: "", dnMuscle: "", dnNeedles: "", dnDepth: "", dnTwitch: "", usFreq: "", usIntensity: "", usMode: "", usArea: "", tapeType: "", tapeGoal: "", stTechnique: "", stRegion: "", electroType: "", electroParams: "" };

/* +/- stepper dosage field -- Sets / Duration (min) / Frequency (x per
   week) as tap-to-adjust counters instead of free-typed text (2026-08-26,
   user feedback: wanted these "in a plus/minus format", not typed
   manually). Duration is always in minutes. */
function StepperField({ label, value, onChange, unit, max = 60 }) {
  return (
    <div className="vital-field">
      <div className="vital-label-row">
        <span className="vital-label">{label}</span>
      </div>
      <Stepper value={value} onChange={onChange} min={0} max={max} step={1} />
      {unit && <div className="hint" style={{ marginTop: 2 }}>{unit}</div>}
    </div>
  );
}

function DosageSteppers({ form, set }) {
  return (
    <div className="row-2" style={{ flexWrap: "wrap", gap: 12 }}>
      <StepperField label="Sets" unit="sets" value={form.sets} onChange={(v) => set("sets", v)} max={20} />
      <StepperField label="Duration" unit="min" value={form.durationMin} onChange={(v) => set("durationMin", v)} max={60} />
      <StepperField label="Frequency" unit="x / week" value={form.frequency} onChange={(v) => set("frequency", v)} max={14} />
    </div>
  );
}

function TechniqueGradeField({ value, onChange }) {
  return (
    <div className="grade-row">
      <div className="grade-row-label">Maitland Grade</div>
      <div className="grade-chips">
        {MAITLAND_GRADES.map((g) => (
          <button type="button" key={g.grade} className={"grade-chip" + (value === g.grade ? " grade-chip-active" : "")} onClick={() => onChange(value === g.grade ? "" : g.grade)}>
            {g.grade}
          </button>
        ))}
      </div>
      {value && <div className="hint">💡 {MAITLAND_GRADES.find((g) => g.grade === value)?.desc}</div>}
    </div>
  );
}

function techniqueEntryForm(type, form, set) {
  switch (type) {
    case "manual":
      return (
        <>
          <div className="row-2">
            <SelectField label="Region / joint" type="single" options={BODY_REGIONS_TX} value={form.region} onChange={(v) => set("region", v)} />
            <Segmented label="Laterality" wrap options={["Left", "Right", "Bilateral", "Central"]} value={form.laterality} onChange={(v) => set("laterality", v)} />
          </div>
          <SelectField label="Technique" type="single" options={MANUAL_TECHNIQUES} value={form.technique} onChange={(v) => set("technique", v)} />
          <TechniqueGradeField value={form.grade} onChange={(v) => set("grade", v)} />
          <DosageSteppers form={form} set={set} />
        </>
      );
    case "dn":
      return (
        <>
          <SelectField label="Target muscle" type="single" options={DN_MUSCLES} value={form.dnMuscle} onChange={(v) => set("dnMuscle", v)} />
          <Segmented label="Laterality" options={["Left", "Right", "Bilateral"]} value={form.laterality} onChange={(v) => set("laterality", v)} />
          <div className="row-2">
            <NumberField label="No. of needles" value={form.dnNeedles} onChange={(v) => set("dnNeedles", v)} placeholder="e.g. 4" />
            <TextField label="Needle depth" value={form.dnDepth} onChange={(v) => set("dnDepth", v)} placeholder="e.g. 30mm" />
          </div>
          <Segmented label="Local twitch response" wrap options={["Elicited", "Partial", "Not elicited", "N/A"]} value={form.dnTwitch} onChange={(v) => set("dnTwitch", v)} />
        </>
      );
    case "st":
      return (
        <>
          <SelectField label="Soft tissue technique" type="single" options={ST_TECHNIQUES} value={form.stTechnique} onChange={(v) => set("stTechnique", v)} />
          <TextField label="Region / structure" value={form.stRegion} onChange={(v) => set("stRegion", v)} placeholder="e.g. upper trap, thoracic paraspinals" />
          <Segmented label="Laterality" options={["Left", "Right", "Bilateral"]} value={form.laterality} onChange={(v) => set("laterality", v)} />
          <DosageSteppers form={form} set={set} />
          <TextField label="Pressure / parameters" value={form.dosage} onChange={(v) => set("dosage", v)} placeholder="e.g. moderate pressure, 30s holds" />
        </>
      );
    case "taping":
      return (
        <>
          <SelectField label="Taping type / pattern" type="single" options={TAPING_TYPES} value={form.tapeType} onChange={(v) => set("tapeType", v)} />
          <Segmented label="Laterality" options={["Left", "Right", "Bilateral"]} value={form.laterality} onChange={(v) => set("laterality", v)} />
          <TextField label="Goal / rationale" value={form.tapeGoal} onChange={(v) => set("tapeGoal", v)} placeholder="e.g. medial patellar glide — PFPS pain reduction" />
        </>
      );
    case "us":
      return (
        <>
          <div className="row-2">
            <SelectField label="Frequency" type="single" options={US_FREQ} value={form.usFreq} onChange={(v) => set("usFreq", v)} />
            <Segmented label="Mode" options={US_MODE} value={form.usMode} onChange={(v) => set("usMode", v)} />
          </div>
          <TextField label="Intensity (W/cm²)" value={form.usIntensity} onChange={(v) => set("usIntensity", v)} placeholder="e.g. 1.0" />
          <DosageSteppers form={form} set={set} />
          <TextField label="Treatment area / structure" value={form.usArea} onChange={(v) => set("usArea", v)} placeholder="e.g. supraspinatus insertion" />
        </>
      );
    case "electro":
      return (
        <>
          <SelectField label="Modality" type="single" options={ELECTRO_TYPES} value={form.electroType} onChange={(v) => set("electroType", v)} />
          <TextField label="Parameters" value={form.electroParams} onChange={(v) => set("electroParams", v)} placeholder="e.g. 100Hz, 20 min, pad placement" />
        </>
      );
    default:
      return (
        <>
          <TextField label="Technique / intervention" value={form.technique} onChange={(v) => set("technique", v)} placeholder="Describe technique" />
          <TextField label="Region / structure" value={form.region} onChange={(v) => set("region", v)} />
          <DosageSteppers form={form} set={set} />
        </>
      );
  }
}

function dosageMeta(t) {
  const parts = [];
  if (t.sets) parts.push(`${t.sets} sets`);
  if (t.durationMin) parts.push(`${t.durationMin} min`);
  if (t.frequency) parts.push(`${t.frequency}x/wk`);
  if (t.dosage) parts.push(t.dosage);
  if (t.duration) parts.push(t.duration);
  return parts.join(" · ");
}

function techniqueLabel(t) {
  if (t.type === "manual") return `${t.technique || "Joint mob"}${t.grade ? ` — Grade ${t.grade}` : ""}${t.region ? ` (${t.region})` : ""}`;
  if (t.type === "dn") return `Dry Needling — ${t.dnMuscle || "unknown muscle"}${t.laterality ? ` (${t.laterality})` : ""}`;
  if (t.type === "st") return `${t.stTechnique || "Soft tissue"}${t.stRegion ? ` — ${t.stRegion}` : ""}`;
  if (t.type === "taping") return `${t.tapeType || "Taping"}${t.laterality ? ` (${t.laterality})` : ""}`;
  if (t.type === "us") return `Ultrasound${t.usFreq ? ` — ${t.usFreq}` : ""}${t.usArea ? ` / ${t.usArea}` : ""}`;
  if (t.type === "electro") return t.electroType || "Electrotherapy";
  return t.technique || "Other";
}

export function TreatmentTechniquesSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "techniques");
  const entries = Array.isArray(d.entries) ? d.entries : [];
  const [form, setForm] = useState(BLANK_TECHNIQUE);
  const [editingId, setEditingId] = useState(null);
  const fset = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function saveEntries(next) {
    set("entries", next);
  }
  function commit() {
    const entry = { ...form, id: form.id || Math.random().toString(36).slice(2, 9) };
    const next = editingId ? entries.map((t) => (t.id === editingId ? entry : t)) : [...entries, entry];
    saveEntries(next);
    setForm(BLANK_TECHNIQUE);
    setEditingId(null);
  }
  function editEntry(t) {
    setForm({ ...BLANK_TECHNIQUE, ...t });
    setEditingId(t.id);
  }
  function deleteEntry(id) {
    saveEntries(entries.filter((t) => t.id !== id));
    if (editingId === id) { setForm(BLANK_TECHNIQUE); setEditingId(null); }
  }

  return (
    <>
      <SectionIntro icon="🤲" title="Treatment Techniques" info="Log each manual therapy, dry needling, soft tissue, taping, ultrasound, or electrotherapy intervention given this session." />

      <div className="subheading">{editingId ? "Edit technique" : "Add a technique"}</div>
      <Segmented
        variant="chips"
        options={TECHNIQUE_TYPES.map((t) => ({ label: t.label, icon: t.icon }))}
        value={TECHNIQUE_TYPES.find((t) => t.key === form.type)?.label}
        onChange={(label) => fset("type", TECHNIQUE_TYPES.find((t) => t.label === label)?.key || "manual")}
      />
      {techniqueEntryForm(form.type, form, fset)}
      <TextArea label="Patient response during technique" value={form.response} onChange={(v) => fset("response", v)} placeholder="e.g. pain reproduction +, ROM improved, comfortable" />
      {form.type !== "dn" && form.type !== "taping" && <TextArea label="Additional notes" value={form.notes} onChange={(v) => fset("notes", v)} />}

      <div className="row-2" style={{ marginTop: 4 }}>
        <button type="button" className="primary-btn" onClick={commit}>
          {editingId ? "💾 Update technique" : "+ Add technique"}
        </button>
        {editingId && (
          <button type="button" className="ghost-btn" onClick={() => { setForm(BLANK_TECHNIQUE); setEditingId(null); }}>
            Cancel
          </button>
        )}
      </div>

      <div className="subheading">Techniques this session ({entries.length})</div>
      {entries.length === 0 && <div className="summary-empty">No techniques recorded yet — add your first above.</div>}
      {entries.map((t) => (
        <div className="tech-card" key={t.id}>
          <div className="tech-card-head">
            <div className="tech-card-title">{techniqueLabel(t)}</div>
            <div className="tech-card-actions">
              <button type="button" className="tech-card-edit" onClick={() => editEntry(t)} aria-label="Edit">✏️</button>
              <button type="button" className="tech-card-del" onClick={() => deleteEntry(t.id)} aria-label="Delete">✕</button>
            </div>
          </div>
          {dosageMeta(t) && <div className="tech-card-meta">{dosageMeta(t)}</div>}
          {t.response && <div className="tech-card-meta">↳ {t.response}</div>}
          {t.notes && <div className="tech-card-note">{t.notes}</div>}
        </div>
      ))}

      <div className="subheading">Maitland grade reference</div>
      {MAITLAND_GRADES.map((g) => (
        <div className="summary-row" key={g.grade}>
          <span className="summary-key">Grade {g.grade}</span>
          <span className="summary-val">{g.desc}</span>
        </div>
      ))}
    </>
  );
}

/* formatters[stepId] contract for orthoSummary.jsx */
export function formatTreatmentTechniquesSection(section) {
  const entries = Array.isArray(section.entries) ? section.entries : [];
  if (!entries.length) return [];
  return entries.map((t, i) => ({ label: `Technique ${i + 1}`, value: `${techniqueLabel(t)}${t.dosage ? ` — ${t.dosage}` : ""}` }));
}

function ProgressRow({ label, prev, curr, onPrev, onCurr, change, onChange }) {
  return (
    <div className="progress-row" style={{ marginBottom: 10 }}>
      <div className="field-label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="row-2">
        <TextField label="Previous" value={prev} onChange={onPrev} />
        <TextField label="Current" value={curr} onChange={onCurr} />
      </div>
      <TextField label="Change" value={change} onChange={onChange} placeholder="Improved / same / worse..." />
    </div>
  );
}

export function ProgressFollowUpSection({ data, setData }) {
  const [d, set] = useSectionData(data, setData, "progress");
  const rows = [
    ["pain", "Pain"],
    ["rom", "ROM"],
    ["strength", "Strength"],
    ["functionalAbility", "Functional ability"],
    ["objectiveFindings", "Key objective findings"],
  ];
  return (
    <>
      <SectionIntro icon="📈" title="Progress / Follow-up" info="For subsequent OPD visits — compare against the previous session." />
      {rows.map(([key, label]) => (
        <ProgressRow
          key={key}
          label={label}
          prev={d[`${key}Prev`]}
          curr={d[`${key}Curr`]}
          change={d[`${key}Change`]}
          onPrev={(v) => set(`${key}Prev`, v)}
          onCurr={(v) => set(`${key}Curr`, v)}
          onChange={(v) => set(`${key}Change`, v)}
        />
      ))}
      <TextArea label="Treatment given" value={d.treatmentGiven} onChange={(v) => set("treatmentGiven", v)} />
      <TextArea label="Response to treatment" value={d.responseToTreatment} onChange={(v) => set("responseToTreatment", v)} />
      <TextArea label="Progress toward goals" value={d.progressTowardGoals} onChange={(v) => set("progressTowardGoals", v)} />
      <TextArea label="Next-session plan" value={d.nextSessionPlan} onChange={(v) => set("nextSessionPlan", v)} />
    </>
  );
}

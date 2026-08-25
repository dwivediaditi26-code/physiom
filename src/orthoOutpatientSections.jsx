import React, { useState, lazy, Suspense } from "react";
import { SectionIntro, TextField, SelectField, Segmented, TextArea, Hint, useSectionData, fmtVal } from "./orthoFieldKit.jsx";
import { RedFlagFields } from "./orthoRedFlagScreen.jsx";
import { subjectiveFieldsForRegion } from "./orthoSubjectiveRegionData.js";

// Same SVG anatomical hotspot map used by the old Palpation flow
// (ClinicalModules.jsx's PalpationModule) -- lazy-loaded for the same reason
// as Pain's body chart: large, self-contained, only needed once opened.
const LazyPalpationModule = lazy(() => import("./lazy_palpation.jsx"));

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

export function SubjectiveSection({ data, setData, selectedRegions = [], regionLabelOf }) {
  const [d, set] = useSectionData(data, setData, "subjective");
  return (
    <>
      <SectionIntro icon="📝" title="Subjective Assessment" />
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
  const locationOptions = selectedRegions.length ? selectedRegions.map((r) => regionLabelOf(r)) : ["Not specified"];
  return (
    <>
      <SectionIntro icon="🖐️" title="Palpation" />
      <div className="subheading">Body Map</div>
      <Suspense fallback={<Hint>Loading palpation body map…</Hint>}>
        <LazyPalpationModule data={d} set={set} />
      </Suspense>
      <div className="subheading">Findings</div>
      <SelectField label="Region(s) palpated" type="multi" options={locationOptions} value={d.regionsPalpated} onChange={(v) => set("regionsPalpated", v)} />
      <SelectField label="Tenderness" type="multi" options={["None", "Mild", "Moderate", "Severe", "Localized", "Diffuse"]} value={d.tenderness} onChange={(v) => set("tenderness", v)} />
      <TextField label="Tenderness location" value={d.tendernessLocation} onChange={(v) => set("tendernessLocation", v)} />
      <Segmented label="Temperature" options={["Normal", "Warm", "Hot", "Cool"]} value={d.temperature} onChange={(v) => set("temperature", v)} />
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

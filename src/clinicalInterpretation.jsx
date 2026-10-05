import React from "react";
import { SectionIntro, SelectField, TextField, TextArea, useSectionData } from "./orthoFieldKit.jsx";
import { diagnosisOptionsFor } from "./orthoRegionDiagnoses.js";

/* ============================================================
   CLINICAL INTERPRETATION — one page for every assessment.

   Ortho (Outpatient, IPD, Post-op), Neuro and Cardio all show the same
   sections in the same order (ICF: impairments -> activity ->
   participation, then diagnosis, differential, investigations, red flags,
   impression, problem list). What changes is the pick-list in each box:
   every list is "pick from the list or type your own" (SelectField, multi).

   Each wizard keeps its own saved section and field names (so saved
   patients are unaffected); `keys` maps this page's field names to them, and
   `extras` adds a wizard's own extra boxes (goals, plan ...) at the end.
   ============================================================ */

export const INTERPRETATION_LISTS = {
  ortho: {
    impairments: ["Pain", "Reduced ROM", "Joint stiffness", "Muscle weakness", "Reduced muscle endurance", "Joint instability", "Swelling / effusion", "Reduced flexibility", "Poor movement control", "Proprioceptive deficit", "Postural impairment", "Gait abnormality", "Balance impairment", "Tenderness", "Reduced tissue extensibility"],
    activityLimitations: ["Walking", "Running", "Squatting", "Stair climbing", "Sit-to-stand", "Reaching", "Lifting", "Dressing", "Gripping", "Transfers", "Bed mobility"],
    participationRestrictions: ["Work", "Sport", "School", "Household roles", "Social activities", "Community mobility", "Recreation"],
    differential: ["Tendinopathy", "Ligament sprain", "Muscle strain", "Osteoarthritis", "Radiculopathy", "Referred pain", "Joint instability", "Bursitis", "Nerve entrapment", "Inflammatory arthropathy", "Stress fracture", "Post-surgical complication"],
    investigations: ["X-ray", "MRI", "CT", "Ultrasound", "Blood investigations", "Surgical report", "Specialist report", "Other"],
    redFlags: ["Suspected fracture", "Cauda equina signs", "Progressive neurological deficit", "Unexplained weight loss", "Constant night pain", "Signs of infection", "Signs of DVT", "Wound concern", "Weight-bearing restriction", "ROM restriction from surgeon"],
  },
  neuro: {
    impairments: ["Weakness", "Abnormal tone", "Spasticity", "Hypotonia", "Reduced selective motor control", "Synergy patterns", "Motor planning deficit", "Reduced light touch", "Proprioceptive deficit", "Pain / temperature deficit", "Sensory integration deficit", "Dysmetria", "Ataxia", "Tremor", "Reduced coordination", "Static balance deficit", "Dynamic balance deficit", "Postural control deficit", "Reduced gait speed", "Asymmetrical gait", "Foot clearance deficit", "Reduced step length", "Assistive-device dependence", "Cognitive impairment", "Communication impairment", "Reduced endurance", "Pain"],
    activityLimitations: ["Bed mobility", "Rolling", "Sitting", "Sit-to-stand", "Transfers", "Standing", "Walking", "Stairs", "Reaching", "Hand function", "Dressing", "Feeding"],
    participationRestrictions: ["Work", "School", "Family role", "Community mobility", "Recreation", "Social participation"],
    differential: ["Stroke (ischaemic)", "Stroke (haemorrhagic)", "TIA", "Parkinson's disease", "Peripheral neuropathy", "Myelopathy", "Multiple sclerosis", "Guillain-Barré syndrome", "Vestibular disorder", "Functional neurological disorder", "Brain tumour", "Normal pressure hydrocephalus"],
    investigations: ["MRI", "CT", "EMG / NCS", "EEG", "Laboratory investigations", "Specialist report", "Other"],
    redFlags: ["Acute neurological deterioration", "Fall risk", "Seizure precautions", "Aspiration risk", "Orthostatic intolerance", "Cognitive / communication considerations"],
  },
  cardio: {
    impairments: ["Reduced exercise tolerance", "Reduced aerobic capacity", "Abnormal HR response", "Blood pressure abnormality", "Reduced cardiovascular endurance", "Peripheral oedema", "Dyspnoea", "Reduced SpO₂", "Abnormal respiratory rate", "Altered breathing pattern", "Reduced chest expansion", "Reduced ventilatory capacity", "Secretion clearance impairment", "Reduced walking tolerance", "Reduced stair tolerance", "Fatigue"],
    activityLimitations: ["Walking", "Stairs", "Transfers", "Exercise", "ADLs", "Household activities", "Community mobility"],
    participationRestrictions: ["Work", "Sport", "Household role", "Community participation", "Recreation"],
    differential: ["Cardiac cause", "Pulmonary cause", "Musculoskeletal cause", "Deconditioning", "Anaemia", "Anxiety / dysfunctional breathing", "Medication side effect"],
    investigations: ["ECG", "Echocardiogram", "Stress test", "Chest X-ray", "CT", "PFT", "ABG", "Blood investigations", "Specialist report"],
    redFlags: ["Abnormal BP response", "Significant desaturation", "Chest pain", "Severe dyspnoea", "Dizziness / syncope", "Arrhythmia concern", "Exercise termination criteria", "Medical restrictions"],
  },
};

const PICK_OR_TYPE = "Tap to pick from the list, or type your own";

// Easier to read and clearly fillable (2026-10-05, Aditi: "can we read it ...
// the font should be black ... so that people should fill it"): the pale grey
// hint text was hard to read, so hints are dark slate, what you type is near
// black, and the boxes have a clearer outline. Scoped to this page.
const READABLE_CSS = `
.ci-page .text-input-wrap, .ci-page .select-wrap, .ci-page .textarea { border-color: #c4b5fd; }
.ci-page .text-input-wrap:focus-within, .ci-page .select-wrap:focus-within, .ci-page .textarea:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.14); }
.ci-page .text-input, .ci-page .select-input, .ci-page .textarea { color: #0f172a; font-size: 15px; font-weight: 500; }
.ci-page .text-input::placeholder, .ci-page .select-input::placeholder, .ci-page .textarea::placeholder { color: #475569; opacity: 1; font-weight: 500; }
.ci-page .field-label { color: #0f172a; font-weight: 700; }
`;

/* kind: "ortho" | "neuro" | "cardio"   section: saved section id
   keys: { impairments, activityLimitations, participationRestrictions,
           investigations, redFlags, impression, problemList } -> saved field names
   extras: [{ key, label, placeholder? }] extra text boxes shown last
   top: anything to show under the title (Cardio's automatic flags)
   intro: extra props for SectionIntro (sub / info)

   The three diagnosis boxes are their own page, right after this one
   (DiagnosisSection below). */
export function ClinicalInterpretationSection({ data, setData, kind, section = "interpretation", keys = {}, extras = [], top = null, intro = {}, title = "Clinical Interpretation", problemHowTo }) {
  const [d, set] = useSectionData(data, setData, section);
  const lists = INTERPRETATION_LISTS[kind];
  const k = (name) => keys[name] || name;
  const pick = (name, label, options) => (
    <SelectField label={label} type="multi" options={options} value={d[k(name)]} onChange={(v) => set(k(name), v)} placeholder={PICK_OR_TYPE} />
  );
  return (
    <div className="ci-page">
      <style>{READABLE_CSS}</style>
      <SectionIntro icon="🧠" title={title} {...intro} />
      {top}
      {pick("impairments", "Key impairments", lists.impairments)}
      {pick("activityLimitations", "Activity limitations", lists.activityLimitations)}
      {pick("participationRestrictions", "Participation restrictions", lists.participationRestrictions)}
      {pick("investigations", "Investigations reviewed", lists.investigations)}
      {pick("redFlags", "Red flags / precautions", lists.redFlags)}
      <TextArea label="Clinical impression / hypothesis" value={d[k("impression")]} onChange={(v) => set(k("impression"), v)} placeholder="How the findings, diagnosis, impairments and daily-life limits fit together" />
      <TextArea label="Physiotherapy problem list" value={d[k("problemList")]} onChange={(v) => set(k("problemList"), v)} placeholder="Key problems in priority order..." howTo={problemHowTo} />
      {extras.map((x) => (
        <TextArea key={x.key} label={x.label} value={d[x.key]} onChange={(v) => set(x.key, v)} placeholder={x.placeholder} />
      ))}
    </div>
  );
}

/* The Diagnosis page (2026-10-05, Aditi: "make diagnosis and differential
   diagnosis, medical diagnosis -- separate tab after clinical assessment"):
   medical / referral diagnosis, physiotherapy diagnosis, differential diagnosis.
   Saved in its own "diagnosis" section.

   Before this page existed those three boxes lived on the Clinical page, saved
   in `legacy.section` under the old names. Assessments saved that way still
   show their entries here, and the old copy is cleared the first time a box is
   edited so the Summary does not list it twice.
   legacy: { section, keys } -- keys maps this page's names (referralDiagnosis,
   physioDiagnosis, differentialDiagnosis) to the names used there. */
export function DiagnosisSection({ data, setData, kind, selectedRegions, legacy = {} }) {
  const [d, set] = useSectionData(data, setData, "diagnosis");
  const [old, setOld] = useSectionData(data, setData, legacy.section || "__none");
  const oldKeys = { referralDiagnosis: "referralDiagnosis", physioDiagnosis: "physioDiagnosis", differentialDiagnosis: "differentialDiagnosis", ...(legacy.keys || {}) };
  const lists = INTERPRETATION_LISTS[kind];
  // Ortho: options for the case's own region(s).
  const regional = kind === "ortho" ? diagnosisOptionsFor(selectedRegions) : { diagnoses: [], differentials: [], label: "" };
  const differentialOptions = regional.differentials.length ? regional.differentials : lists.differential;

  const value = (key, oldName) => (d[key] !== undefined ? d[key] : old[oldKeys[oldName]]);
  const change = (key, oldName, v) => {
    set(key, v);
    if (legacy.section && old[oldKeys[oldName]]) setOld(oldKeys[oldName], "");
  };

  return (
    <div className="ci-page">
      <style>{READABLE_CSS}</style>
      <SectionIntro icon="🩺" title="Diagnosis" info="What the referral says, what you conclude, and what else it could be." />
      <TextField label="Medical diagnosis" value={value("medicalDiagnosis", "referralDiagnosis")} onChange={(v) => change("medicalDiagnosis", "referralDiagnosis", v)} placeholder="Type the diagnosis written on the referral" />
      {regional.diagnoses.length > 0 ? (
        <SelectField label="Physiotherapy diagnosis" type="multi" options={regional.diagnoses} value={value("physiotherapyDiagnosis", "physioDiagnosis")} onChange={(v) => change("physiotherapyDiagnosis", "physioDiagnosis", v)} placeholder={`Tap to pick a ${regional.label} diagnosis, or type your own`} />
      ) : (
        <TextField label="Physiotherapy diagnosis" value={value("physiotherapyDiagnosis", "physioDiagnosis")} onChange={(v) => change("physiotherapyDiagnosis", "physioDiagnosis", v)} placeholder="Type your clinical diagnosis" />
      )}
      <SelectField label="Differential diagnosis" type="multi" options={differentialOptions} value={value("differentialDiagnosis", "differentialDiagnosis")} onChange={(v) => change("differentialDiagnosis", "differentialDiagnosis", v)} placeholder={PICK_OR_TYPE} />
    </div>
  );
}

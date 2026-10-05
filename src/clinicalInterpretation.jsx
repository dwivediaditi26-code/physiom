import React from "react";
import { SectionIntro, SelectField, TextField, TextArea, useSectionData } from "./orthoFieldKit.jsx";

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

const PICK_OR_TYPE = "Pick from the list or type your own";

/* kind: "ortho" | "neuro" | "cardio"   section: saved section id
   keys: { impairments, activityLimitations, participationRestrictions,
           referralDiagnosis, physioDiagnosis, differentialDiagnosis,
           investigations, redFlags, impression, problemList } -> saved field names
   extras: [{ key, label, placeholder? }] extra text boxes shown last
   top: anything to show under the title (Cardio's automatic flags)
   intro: extra props for SectionIntro (sub / info) */
export function ClinicalInterpretationSection({ data, setData, kind, section = "interpretation", keys = {}, extras = [], top = null, intro = {}, title = "Clinical Interpretation", problemHowTo }) {
  const [d, set] = useSectionData(data, setData, section);
  const lists = INTERPRETATION_LISTS[kind];
  const k = (name) => keys[name] || name;
  const pick = (name, label, options) => (
    <SelectField label={label} type="multi" options={options} value={d[k(name)]} onChange={(v) => set(k(name), v)} placeholder={PICK_OR_TYPE} />
  );
  return (
    <>
      <SectionIntro icon="🧠" title={title} {...intro} />
      {top}
      {pick("impairments", "Key impairments", lists.impairments)}
      {pick("activityLimitations", "Activity limitations", lists.activityLimitations)}
      {pick("participationRestrictions", "Participation restrictions", lists.participationRestrictions)}
      <TextField label="Medical / referral diagnosis" value={d[k("referralDiagnosis")]} onChange={(v) => set(k("referralDiagnosis"), v)} placeholder="Type the diagnosis from the referral" />
      <TextField label="Physiotherapy diagnosis" value={d[k("physioDiagnosis")]} onChange={(v) => set(k("physioDiagnosis"), v)} placeholder="Your clinical diagnosis" />
      {pick("differentialDiagnosis", "Differential diagnosis", lists.differential)}
      {pick("investigations", "Investigations reviewed", lists.investigations)}
      {pick("redFlags", "Red flags / precautions", lists.redFlags)}
      <TextArea label="Clinical impression / hypothesis" value={d[k("impression")]} onChange={(v) => set(k("impression"), v)} placeholder="How the findings, diagnosis, impairments and daily-life limits fit together" />
      <TextArea label="Physiotherapy problem list" value={d[k("problemList")]} onChange={(v) => set(k("problemList"), v)} placeholder="Key problems in priority order..." howTo={problemHowTo} />
      {extras.map((x) => (
        <TextArea key={x.key} label={x.label} value={d[x.key]} onChange={(v) => set(x.key, v)} placeholder={x.placeholder} />
      ))}
    </>
  );
}

// Which module each top-level screen shows (screen key -> label, icon and the
// module token AppFull.jsx renders). Small and needed on the very first screen, so
// it lives in its own file: it used to sit inside sharedClinicalData.js, which made
// the first screen download that whole 900 KB library just to read this list.
export const ALL_TESTS = {
  home:{ label:"Home", icon:"🏠", desc:"App Overview & Features", groups:{ "Welcome":"HOME_MODULE" }},
  dashboard:{ label:"Dashboard", icon:"📊", desc:"Therapist Overview", groups:{ "Therapist Dashboard":"DASHBOARD_MODULE" }},
  physiofeed:{ label:"PhysioFeed", icon:"📡", desc:"Community & Case Discussions", groups:{ "PhysioFeed":"PHYSIOFEED_MODULE" }},
  learn:{ label:"Learn", icon:"📚", desc:"Clinical Learning Library", groups:{ "Learn":"LEARN_MODULE" }},
  profile:{ label:"Profile", icon:"👤", desc:"Your profile", groups:{ "Profile":"PROFILE_MODULE" }},
  settings:{ label:"Settings", icon:"⚙️", desc:"Clinic & account settings", groups:{ "Settings":"SETTINGS_MODULE" }},
  clinical:{ label:"Clinical", icon:"🩺", desc:"Patients & Assessments", groups:{ "Clinical":"CLINICAL_MODULE" }},
  demographics:{ label:"Demographics", icon:"👤", desc:"Patient Information", groups:{ "Demographic Data":"DEMOGRAPHICS_MODULE" }},
  subjective:{ label:"Subjective", icon:"📝", desc:"History & Complaint", groups:{ "Full Subjective Assessment":"SUBJECTIVE_MODULE" }},
  palpation:{ label:"Palpation", icon:"🖐️", desc:"Tissue Assessment", groups:{ "Palpation Findings":"PALPATION_MODULE" }},
  posture:{ label:"Posture Analysis", icon:"🧍", desc:"AI Posture Screening", groups:{}},
  observation:{ label:"Observation", icon:"👁️", desc:"Visual Inspection — Magee's", groups:{
    "Clinical Observation":"OBSERVATION_MODULE",
  }},
  rom:{ label:"ROM", icon:"📐", desc:"Range of Motion", groups:{ "Full ROM Assessment":"ROM_MODULE" }},
  mmt:{ label:"Muscle MMT", icon:"💪", groups:{ "Full MMT Assessment":"MMT_MODULE" }},
  special:{ label:"Special Tests (100+)", icon:"🔬", groups:{ "All Special Tests":"SPECIAL_TESTS_MODULE" }},
  neuro:{ label:"Neurological", icon:"⚡", groups:{ "Full Neurological Assessment":"NEURO_MODULE" }},
  neurotemplates:{ label:"Neuro Templates", icon:"🧩", groups:{ "Neuro Templates":"NEURO_TEMPLATES_MODULE" }},
  gait:{ label:"Gait Analysis", icon:"🚶", groups:{ "Full Gait Analysis":"GAIT_MODULE" }},
  nkt:{ label:"CPA — Compensation Pattern Analysis", icon:"🧠", groups:{ "Compensation Pattern Tests":"NKT_REGION" }},
  kinetic:{ label:"Kinetic Chain", icon:"⛓️", groups:{ "Joint-by-Joint Assessment":"KC_REGION" }},
  fascia:{ label:"Fascia Integration", icon:"🕸️", groups:{ "Fascial Assessment":"FASCIA_REGION" }},
  fma:{ label:"Functional Movement", icon:"🏃", groups:{ "Movement Analysis":"FMA_REGION" }},
  cyriax_full:{ label:"STTT — Selective Tissue Tension Test", icon:"🦴", groups:{ "Complete STTT Assessment":"CYRIAX_MODULE" }},
  outcome:{ label:"Outcome Measures", icon:"📈", groups:{ "Validated Outcome Measures":"OUTCOME_MODULE" }},
  treatment:{ label:"Treatment", icon:"💊", desc:"Exercise & Treatment Techniques", groups:{ "Treatment":"TREATMENT_MODULE" }},
  exercise:{ label:"Treatment Prescription", icon:"💊", desc:"Exercise & Treatment Plan", groups:{ "Exercise Prescription":"EXERCISE_MODULE" }},
  tx_techniques:{ label:"Tx Techniques", icon:"🤲", groups:{ "Treatment Techniques":"TX_TECHNIQUES_MODULE" }},
  tx_sessions:{ label:"Session Log", icon:"📋", desc:"Follow-Up Visit Notes", groups:{ "Treatment Session Log":"TX_SESSION_MODULE" }},
};

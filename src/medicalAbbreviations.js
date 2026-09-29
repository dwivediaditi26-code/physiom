// Shared by orthoSummary.jsx and NeurologicalAssessment.jsx's Summary &
// Review step (2026-09-11, Aditi: "neuro ortho assessment have small font
// not capital and not full form medical terms here in assessment summary")
// -- the generic row flattener falls back to the raw data-field key as the
// label (e.g. "hpc", "pmh"), which for camelCase keys at least gets split
// into words, but a lowercase abbreviation like "hpc" has no case/word
// boundary to split on, so it only ever showed capitalized-first-letter
// ("Hpc") instead of the actual clinical term. This table expands the
// abbreviations that show up across the Subjective/Chart Review/outcome-
// measure fields to their full name (with the abbreviation kept alongside
// for clinicians who know it by that name).
const MEDICAL_ABBREVIATIONS = {
  hpc: "History of Presenting Complaint (HPC)",
  pmh: "Past Medical History (PMH)",
  cc: "Chief Complaint",
  dob: "Date of Birth",
  bmi: "BMI",
  vas: "VAS (Visual Analogue Scale)",
  nrs: "NRS (Numeric Rating Scale)",
  mrs: "Modified Rankin Scale (mRS)",
  edss: "EDSS (Expanded Disability Status Scale)",
  sara: "SARA (Scale for Assessment and Rating of Ataxia)",
  dgi: "DGI (Dynamic Gait Index)",
  dhi: "DHI (Dizziness Handicap Inventory)",
  rr: "Respiratory Rate",
  spo2: "SpO2",
  nli: "Neurological Level of Injury",
  ais: "AIS (ASIA Impairment Scale)",
  pta: "PTA (Post-Traumatic Amnesia)",
  hit: "Head Impulse Test",
  rom: "ROM (Range of Motion)",
  mmt: "MMT (Manual Muscle Testing)",
  adl: "ADL (Activities of Daily Living)",
  hep: "HEP (Home Exercise Programme)",
  // Vitals and other short field names that read as raw keys ("Bp Sys",
  // "Hr") on the summary screens. Wording matches the input screens' labels.
  bpsys: "Blood Pressure (Systolic)",
  bpdia: "Blood Pressure (Diastolic)",
  hr: "Heart Rate",
  temp: "Temperature",
  spo2: "SpO₂ (Oxygen Saturation)",
  fio2: "FiO₂ (Fraction of Inspired Oxygen)",
  o2flow: "Oxygen Flow",
  o2requirement: "Oxygen Requirement",
  exo2: "Oxygen Requirement",
  caprefill: "Capillary Refill",
  abg: "ABG (Arterial Blood Gas) Findings",
  cxr: "Chest X-ray Findings",
  ecg: "ECG",
  jvp: "JVP (Jugular Venous Pressure)",
  dtr: "DTR (Deep Tendon Reflexes)",
  mas: "MAS (Modified Ashworth Scale)",
  mip: "MIP (Maximal Inspiratory Pressure)",
  pef: "PEF (Peak Expiratory Flow)",
  fga: "FGA (Functional Gait Assessment)",
  cat: "CAT Score",
  dvt: "DVT Precautions",
  loc: "Level of Consciousness",
  locadmission: "Level of Consciousness on Admission",
  ram: "Rapid Alternating Movements",
  hmf: "Higher Mental Functions (HMF)",
  gp: "GP Name & Practice",
  aid: "Walking Aid Used",
  ad: "Autonomic Dysreflexia (AD) Signs",
  adsigns: "Autonomic Dysreflexia — Signs Present",
  adtrigger: "Autonomic Dysreflexia — Suspected Trigger",
  cn1: "CN I (Olfactory)",
  cn2: "CN II (Optic)",
  cn346: "CN III, IV, VI (Eye Movements / Pupils)",
  cn5: "CN V (Trigeminal)",
  cn7: "CN VII (Facial)",
  cn8: "CN VIII (Vestibulocochlear)",
  cn910: "CN IX, X (Glossopharyngeal / Vagus)",
  cn11: "CN XI (Accessory)",
  cn12: "CN XII (Hypoglossal)",
  cogconcerns: "Cognitive / Communication Concerns",
  ptanotes: "PTA Orientation / Memory Notes",
  postopday: "Post-operative Day",
  bedchair: "Bed-to-Chair Transfer",
  bedtochair: "Bed-to-Chair Transfer",
  cardiohx: "Cardiovascular History",
  drughx: "Drug History",
  familyhx: "Family History",
  generalobs: "General Observation",
};

// Word-level fallback for keys with no whole-key entry above: camelCase
// keys like "duringHR" / "peakBPs" split into words, and each known short
// word is spelled out ("During Heart Rate", "Peak Blood Pressure").
const WORD_EXPANSIONS = {
  hr: "Heart Rate", bp: "Blood Pressure", bps: "Blood Pressure", sys: "Systolic", dia: "Diastolic",
  spo2: "SpO₂", o2: "O₂", fio2: "FiO₂", rpe: "RPE (Rate of Perceived Exertion)",
  hx: "History", obs: "Observation", le: "Lower Extremity", ue: "Upper Extremity",
};

export function humanizeKey(k) {
  const lower = String(k).toLowerCase();
  if (MEDICAL_ABBREVIATIONS[lower]) return MEDICAL_ABBREVIATIONS[lower];
  const words = String(k)
    .replace(/(SpO2|Spo2)/g, "Spo2")
    .replace(/(FiO2|Fio2)/g, "Fio2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => WORD_EXPANSIONS[w.toLowerCase()] || w);
  const text = words.join(" ");
  return text.replace(/^./, (c) => c.toUpperCase());
}

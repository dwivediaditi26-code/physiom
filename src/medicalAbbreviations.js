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
};

export function humanizeKey(k) {
  const lower = String(k).toLowerCase();
  if (MEDICAL_ABBREVIATIONS[lower]) return MEDICAL_ABBREVIATIONS[lower];
  return String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

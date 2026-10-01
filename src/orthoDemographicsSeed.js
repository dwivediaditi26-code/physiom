// orthoDemographicsSeed.js — the patient details the clinician already typed
// before the Ortho Outpatient wizard opened, turned into the wizard's own
// Demographics step data (data.demographics).
//
// The quick "New assessment" form and the New Patient form both leave the
// details on the app-wide patient record as flat keys (dem_name, dem_age,
// dem_sex, dem_phone, ...; the quick form also sets a small nested
// `demographics` object). The Neuro, Cardio and IPD wizards already pick them
// up; the Outpatient wizard started with an empty Demographics step, so the
// clinician had to type the name (and age, sex) a second time.

const FIELDS = [
  ["name", "dem_name"],
  ["age", "dem_age"],
  ["sex", "dem_sex"],
  ["phone", "dem_phone"],
  ["occupation", "dem_occupation"],
  ["address", "dem_address"],
];

// Only the fields that have a value; nothing else (no empty strings), so
// merging it over or under other data never blanks anything out.
export function demographicsFromPatient(patientData) {
  const p = patientData || {};
  const nested = p.demographics || {};
  const out = {};
  for (const [key, flatKey] of FIELDS) {
    const v = nested[key] ?? p[flatKey];
    const s = v == null ? "" : String(v).trim();
    if (s) out[key] = s;
  }
  return out;
}

// What the wizard starts with: details extracted by the AI intake as the
// base, with what the clinician typed themselves on top (a typed name or age
// is deliberate; the AI's is a guess from free text).
export function initialDemographics(aiDemographics, patientData) {
  return { ...(aiDemographics || {}), ...demographicsFromPatient(patientData) };
}

// The two practice patients every new account starts with (Priya Sharma and
// Arjun Kapoor, seeded in PatientDatabase.jsx). They carry the same fixed id in
// every account, which is how they are told apart from real patients: they get
// a "Sample" tag, they are left out of the patient counts, and they never
// leave the device (see syncPatientsToSupabase).
export const SAMPLE_PATIENT_IDS = ["pt_priya_sharma_01", "pt_arjun_kapoor_01"];

export const isSamplePatient = (p) => !!p && SAMPLE_PATIENT_IDS.includes(p.id);

export const withoutSamples = (patients = []) => patients.filter((p) => !isSamplePatient(p));

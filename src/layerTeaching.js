// layerTeaching.js — shared icons + teaching notes for the layered objective-assessment
// modules, used by both the Phase 0.5 screens (SubjectiveObjective) and the SOAP
// "Suggest Probable Diagnosis" card (ProbableDiagnosis). One source of truth so the
// educational content can't drift between surfaces.

export const LAYER_ICON = {
  observation: "👁", posture: "🧍", fma: "🏃", special: "🔬", cyriax_full: "🦴",
  nkt: "🧠", kinetic: "⛓", rom: "📐", palpation: "🖐", fascia: "🕸", outcome: "📈",
};

// WHY we assess each layer + HOW to interpret a finding — so students / interns /
// therapists learn the reasoning behind every objective assessment, not just the checklist.
export const LAYER_TEACH = {
  observation: "WHY: a structured visual screen before you touch the patient — flags the structural, postural and neuromuscular drivers (asymmetry, wasting, swelling, deformity) that localise the problem and shape the rest of the exam.",
  posture: "WHY: resting posture exposes the length–tension and load faults that predispose to and perpetuate the condition. WHAT YOU GET: the modifiable postural driver to correct alongside the local tissue.",
  fma: "WHY: loads the region the way daily life / sport does. WHAT YOU GET: whether the functional task reproduces the pain and how movement quality (control, compensation) fails — the rehab starting point.",
  special: "WHY: provocation / special tests confirm or refute a specific structure. INTERPRET: a positive reproduces the patient's pain or shows laxity; most are strongest as a CLUSTER — one positive in isolation rarely confirms.",
  cyriax_full: "WHY: resisted isometrics isolate the contractile unit (muscle–tendon). INTERPRET (Cyriax): strong+painful = tendinopathy/local lesion; weak+painful = significant tear; weak+painless = neurological; strong+painless = normal.",
  nkt: "WHY: maps which muscles are INHIBITED vs OVERACTIVE (the compensation pattern). WHAT YOU GET: what to release (overactive) and what to activate (inhibited) — the motor-control plan, not just the painful tissue.",
  kinetic: "WHY: pain is often driven by a mobility/stability deficit ABOVE or BELOW the joint. WHAT YOU GET: the joint-by-joint restriction (e.g. ankle dorsiflexion, thoracic rotation) that offloads the symptomatic region when addressed.",
  rom: "WHY: range + end-feel + pattern differentiate the source — a CAPSULAR pattern points to arthropathy/OA, a NON-capsular loss to a mechanical block or soft-tissue restriction; a painful arc localises impingement.",
  palpation: "WHY: localises the tender structure to confirm the differential. INTERPRET: point tenderness over the suspected structure supports it; diffuse/widespread tenderness suggests sensitisation — correlate, don't rely on it alone.",
  fascia: "WHY: assesses the myofascial lines that transmit load into the region. WHAT YOU GET: fascial restrictions contributing to the pattern and a soft-tissue treatment direction.",
  outcome: "WHY: a validated patient-reported outcome measure baselines severity, tracks change over time, and (some) stratify risk — turns 'feels better' into measurable progress.",
};

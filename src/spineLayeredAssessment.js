// spineLayeredAssessment.js — per-condition layered objective-assessment data for
// the Layer-3 spine Phase 0.5 screens (lumbar L01–, cervical C01–, thoracic T01–).
// Condition-specific Observation / Posture / Functional + region-level CPA /
// Kinetic chain / Fascia / Outcome, mirroring the SOAP layered view. Each row maps
// to an app module key so the Phase 0.5 card can render a clickable "Open →".

const REGION_LAYERS = {
  L: { cpa: "Gluteus maximus / deep-core inhibition vs erector-spinae / hamstring / TFL overactivity",
       kinetic: "Hip mobility (extension/rotation), thoracic mobility, ankle dorsiflexion offload",
       fascia: "Thoracolumbar fascia, superficial back line, lateral line",
       outcome: "Oswestry Disability Index or Roland-Morris (RMDQ); STarT Back risk stratification" },
  C: { cpa: "Deep-neck-flexor inhibition vs SCM / scalene / upper-trapezius overactivity (craniocervical flexion)",
       kinetic: "Cervicothoracic junction & thoracic mobility, first-rib position, shoulder girdle",
       fascia: "Suboccipital / superficial back line, deep front line",
       outcome: "Neck Disability Index (NDI); PSFS; NPRS" },
  T: { cpa: "Lower-trapezius / serratus inhibition vs pectoral / latissimus overactivity; diaphragm & core control",
       kinetic: "Thoracic extension & rotation hub, rib mobility, cervical & lumbar links, hip rotation",
       fascia: "Spiral line, superficial front/back line, thoracolumbar fascia",
       outcome: "PSFS + NPRS; Oswestry/RMDQ adapted for spine" },
};

// [observation, posture, functionalScreen] per condition id
const COND = {
  L01: ["Guarded lumbar movement, no neurological signs", "Lower-crossed / hyper- or hypo-lordotic posture", "Repeated flexion/extension & sit-to-stand — no peripheralisation of leg symptoms"],
  L02: ["Antalgic lateral shift, dermatomal sensory/motor signs, possible foot-drop", "Loss of lordosis, flexion-intolerant posture", "Repeated flexion peripheralises / extension centralises; SLR & slump"],
  L03: ["Localised paraspinal guarding, no leg signs", "Hyperlordotic / extension-loading posture", "Extension-rotation quadrant reproduces local pain"],
  L04: ["Stooped 'shopping-trolley' posture, bilateral leg fatigue on walking", "Flexed lumbar posture that relieves symptoms", "Walking provokes, flexion/sitting relieves (treadmill / bicycle test)"],
  L05: ["PSIS / sulcus tenderness, single-leg-stance pelvic drop", "Pelvic tilt / rotation asymmetry", "Provocation cluster (thigh-thrust, distraction, compression) + ASLR load-transfer"],
  L06: ["Painful arc / 'catch' through range, aberrant movement (Gower's sign)", "Poor segmental control, sway posture", "Prone instability test; observe aberrant motion returning from flexion"],
  L07: ["Possible palpable step, prominent hamstring guarding", "Increased lordosis (young athlete)", "Single-leg hyperextension (stork) reproduces pain"],
  L08: ["Localised muscle tenderness after a load event, no neuro signs", "Antalgic guarded posture", "Resisted trunk movement reproduces pain; contractile vs neural differentiation"],
  L09: ["Palpable taut bands / trigger points, referred pain map", "Chronic protective posture", "Sustained-posture provocation, trigger-point palpation reproduces referral"],
  L10: ["Reduced spinal mobility, alternating buttock features", "Progressive loss of lumbar lordosis", "Prolonged morning stiffness pattern; Schober's reduced — refer for imaging/bloods"],
  L11: ["Screen for serious pathology — see red-flag screen", "N/A — safety screen", "Complete the red-flag screen before mechanical testing"],

  C01: ["Localised guarding, no neurological signs", "Forward-head / upper-crossed posture", "Extension-rotation quadrant reproduces local neck pain"],
  C02: ["Antalgic head tilt away from side, arm dermatomal signs", "Forward-head posture loading lower cervical", "Spurling & upper-limb tension reproduce arm symptoms; relief on distraction"],
  C03: ["Segmental tenderness, restricted rotation, no arm signs", "Forward-head posture", "Extension-rotation quadrant; segmental PA reproduces local pain"],
  C04: ["Unilateral suboccipital tenderness, restricted C1-2 rotation", "Forward-head posture", "Flexion-rotation test reproduces headache; sustained-posture provocation"],
  C05: ["Diffuse guarding, protective stiffness", "Protective forward-head / elevated-shoulder posture", "Global painful/limited AROM, poor deep-neck-flexor endurance"],
  C06: ["Visible muscle spasm, torticollis, head held to one side", "Antalgic side-bent/rotated posture", "Active ROM markedly limited by pain/spasm in one direction"],
  C07: ["Reduced multi-level mobility, ± hand wasting", "Fixed forward-head, stiff extension", "Multi-plane ROM loss; screen for myelopathy if long-tract signs"],
  C08: ["Trauma to neck/shoulder, transient burning arm symptoms", "Protective posture", "Provocative shoulder depression / lateral flexion reproduces burner; neuro screen"],
  C09: ["Distal entrapment signs (Tinel at wrist/elbow), intrinsic wasting", "Sustained-posture / repetitive-load posture", "Distal nerve provocation (Phalen / elbow-flexion) & ULTT bias distal, not root"],
  C10: ["Palpable taut bands / trigger points, referred pain map", "Chronic protective posture", "Sustained-posture provocation; trigger-point palpation reproduces referral"],
  C11: ["Screen for myelopathy / VBI / instability / fracture — red-flag screen", "N/A — safety screen", "Complete the red-flag screen before end-range or manipulation"],

  T01: ["Localised paraspinal guarding, no neuro signs", "Increased thoracic kyphosis", "Rotation & combined extension-rotation reproduce local pain"],
  T02: ["Band-like sensory change, possible cord signs", "Guarded trunk posture", "Trunk movement provokes dermatomal band; screen cord signs"],
  T03: ["Rib-angle tenderness, altered one-sided breathing", "Kyphotic / protracted posture", "Deep breath & Evjenth-Gloeck breath-hold flexion localise the rib source"],
  T04: ["Vascular/neuro changes in the arm, altered posture", "Rounded-shoulder / drooped posture", "Provocative TOS tests (Adson / Roos / costoclavicular) reproduce arm symptoms"],
  T05: ["Rigid structural adolescent kyphosis, apex tenderness", "Fixed increased kyphosis not correcting on extension", "Prone extension does NOT reverse the kyphosis (vs postural)"],
  T06: ["Correctable round-back, upper-crossed pattern", "Increased kyphosis + protracted scapulae, forward head", "Kyphosis reduces on active extension / cueing (vs Scheuermann's)"],
  T07: ["Rib hump on Adam's forward-bend, shoulder/pelvis asymmetry", "Lateral spinal curve, trunk shift", "Adam's forward-bend test; scoliometer; screen curve progression"],
  T08: ["Anterior chest tenderness ± costochondral swelling (Tietze)", "Protracted / slumped posture", "Anterior chest-wall loading (springing, horizontal adduction) reproduces pain"],
  T09: ["Palpable taut bands / trigger points, referred map", "Chronic protective posture", "Sustained-posture provocation; trigger-point palpation reproduces referral"],
  T10: ["Reduced chest expansion & spinal mobility, inflammatory features", "Progressive kyphosis / loss of lordosis", "Chest-expansion & Schober's reduced; inflammatory-back-pain pattern — refer"],
  T11: ["Screen for cardiac/respiratory/visceral & fracture — red-flag screen", "N/A — safety screen", "Complete the red-flag screen before mechanical treatment"],
};

const LAYER_KEYS = { observation: "observation", posture: "posture", functionalScreen: "fma", cpa: "nkt", kinetic: "kinetic", fascia: "fascia", outcome: "outcome" };
const LABELS = { observation: "Observation", posture: "Posture", functionalScreen: "Functional (FMA)", cpa: "CPA", kinetic: "Kinetic chain", fascia: "Fascia", outcome: "Outcome" };

// Build the clickable layered-assessment modules for a spine condition id (e.g. "L02").
export function spineAssessmentModules(id) {
  const c = COND[id];
  if (!c) return [];
  const reg = REGION_LAYERS[id[0]] || {};
  const notNA = (v) => v && !String(v).toUpperCase().startsWith("N/A");
  const rows = [
    ["observation", c[0]], ["posture", c[1]], ["functionalScreen", c[2]],
    ["cpa", reg.cpa], ["kinetic", reg.kinetic], ["fascia", reg.fascia], ["outcome", reg.outcome],
  ];
  return rows.filter(([, d]) => notNA(d)).map(([k, detail]) => ({ label: LABELS[k], key: LAYER_KEYS[k], detail }));
}

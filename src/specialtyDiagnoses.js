// Condition-specific diagnosis options for the Neuro and Cardio Diagnosis page
// (2026-10-05, Aditi: "in ortho [it is region specific] ... why in neuro and
// cardio not?"). Same idea as orthoRegionDiagnoses.js: the page offers the
// physiotherapy diagnoses and the differential diagnoses that normally go with
// the case, as pick-or-type suggestions -- never filled in for the clinician.
//
//   Neuro  -- by the condition chosen (Stroke, Parkinson's, TBI, SCI ...) and by
//             any condition assessments added from the Neuro library.
//   Cardio -- by the system (cardiovascular / respiratory / combined) and the
//             setting (ICU, post-operative, rehabilitation add a few more).
//
// Standard physiotherapy teaching content, written to be reviewed by a
// clinician before it is relied on.

const unique = (list) => [...new Set(list)];

/* ------------------------------ NEURO ------------------------------ */

export const NEURO_DIAGNOSES = {
  stroke: {
    label: "Stroke",
    diagnoses: ["Hemiparesis (upper and lower limb)", "Hemiplegia", "Post-stroke spasticity", "Impaired selective motor control with synergy patterns", "Hemiplegic shoulder pain / subluxation", "Unilateral neglect", "Impaired sitting and standing balance", "Impaired gait with high fall risk", "Reduced functional mobility and transfers", "Cognitive-perceptual impairment", "Reduced endurance / deconditioning"],
    differentials: ["Ischaemic stroke", "Haemorrhagic stroke", "Transient ischaemic attack (TIA)", "Brain tumour", "Subdural haematoma", "Todd's paralysis (after a seizure)", "Hypoglycaemia", "Migraine with aura", "Functional neurological disorder"],
  },
  parkinsons: {
    label: "Parkinson's",
    diagnoses: ["Bradykinesia with reduced movement amplitude", "Rigidity (cogwheel / lead-pipe)", "Resting tremor", "Postural instability with high fall risk", "Freezing of gait / festinating gait", "Impaired transfers and bed mobility", "Reduced trunk rotation and axial mobility", "Reduced chest expansion / hypophonia (refer to speech therapy)", "Motor fluctuations (on / off)", "Reduced endurance / deconditioning"],
    differentials: ["Parkinson's disease", "Atypical parkinsonism (MSA, PSP, CBD)", "Drug-induced parkinsonism", "Vascular parkinsonism", "Essential tremor", "Normal pressure hydrocephalus", "Lewy body dementia", "Depression with slowing of movement"],
  },
  tbi: {
    label: "TBI",
    diagnoses: ["Impaired arousal / level of consciousness", "Hemiparesis / motor impairment", "Spasticity / abnormal tone", "Ataxia / incoordination", "Impaired balance and gait", "Post-traumatic cognitive-behavioural impairment", "Vestibular dysfunction", "Post-concussion symptoms", "Contracture / heterotopic ossification risk"],
    differentials: ["Diffuse axonal injury", "Contusion / intracerebral haemorrhage", "Subdural or extradural haematoma", "Post-traumatic seizure", "Hydrocephalus", "Cervical spine injury", "Hypoxic brain injury", "Functional or psychological cause"],
  },
  sci: {
    label: "Spinal cord injury",
    diagnoses: ["Tetraplegia", "Paraplegia", "Complete injury (AIS A)", "Incomplete injury (AIS B-D)", "Incomplete injury syndrome (central cord, Brown-Séquard, anterior cord)", "Impaired trunk control and sitting balance", "Spasticity / spasms", "Impaired respiratory function (cervical / high thoracic)", "Impaired transfers and wheelchair mobility", "Orthostatic hypotension", "Pressure injury risk", "Neurogenic bladder / bowel (refer)"],
    differentials: ["Non-traumatic cause (tumour, infection, vascular)", "Cauda equina syndrome", "Cervical myelopathy", "Transverse myelitis", "Spinal cord tumour or compression", "Epidural abscess or haematoma", "Guillain-Barré syndrome"],
  },
  ms: {
    label: "Multiple sclerosis",
    diagnoses: ["Fatigue", "Spasticity / spasms", "Ataxia / incoordination", "Impaired balance and gait", "Pyramidal weakness", "Sensory disturbance", "Visual impairment (optic neuritis / diplopia)", "Heat sensitivity (Uhthoff's phenomenon)", "Cognitive fatigue", "Bladder dysfunction (refer)"],
    differentials: ["Multiple sclerosis (relapsing-remitting)", "Progressive multiple sclerosis", "Neuromyelitis optica", "Transverse myelitis", "Stroke", "Vitamin B12 deficiency", "Cervical myelopathy", "Functional neurological disorder", "Infection (e.g. Lyme disease)"],
  },
  vestibular: {
    label: "Vestibular",
    diagnoses: ["Positional vertigo (BPPV, canal-specific)", "Vestibular hypofunction", "Gaze instability", "Impaired balance (sensory organisation)", "Motion sensitivity", "Cervicogenic dizziness", "Fear of falling / dizziness handicap"],
    differentials: ["BPPV", "Vestibular neuritis / labyrinthitis", "Ménière's disease", "Vestibular migraine", "Central cause (posterior circulation stroke, cerebellar lesion)", "Orthostatic hypotension", "Cervicogenic dizziness", "Medication side effect", "Anxiety / persistent postural-perceptual dizziness"],
  },
  peripheral: {
    label: "Peripheral nerve / neuromuscular",
    diagnoses: ["Symmetrical distal weakness", "Ascending weakness / flaccid paralysis", "Sensory loss (glove and stocking)", "Neuropathic pain", "Foot drop", "Impaired balance (sensory ataxia)", "Hand function impairment", "Reduced endurance / fatigue", "Respiratory muscle weakness (monitor)", "Contracture risk"],
    differentials: ["Guillain-Barré syndrome", "Chronic inflammatory demyelinating polyneuropathy (CIDP)", "Diabetic neuropathy", "Vitamin B12 deficiency", "Alcohol-related neuropathy", "Charcot-Marie-Tooth disease", "Myasthenia gravis", "Motor neurone disease", "Radiculopathy", "Entrapment neuropathy", "Critical illness polyneuropathy / myopathy"],
  },
  ataxia: {
    label: "Ataxia",
    diagnoses: ["Cerebellar ataxia (limb and gait)", "Truncal ataxia", "Dysmetria / intention tremor", "Sensory ataxia", "Impaired balance with high fall risk", "Impaired coordination and dexterity"],
    differentials: ["Cerebellar stroke", "Multiple sclerosis", "Cerebellar tumour", "Alcohol-related cerebellar degeneration", "Hereditary ataxia", "Vitamin deficiency (B12, E)", "Medication or toxin effect", "Vestibular cause"],
  },
};

// The condition templates the Neuro wizard offers, by their ids.
const NEURO_BUCKET_OF_TEMPLATE = {
  stroke: "stroke", parkinsons: "parkinsons", tbi: "tbi", sci: "sci", ms: "ms",
  gbs: "peripheral", peripheralneuropathy: "peripheral", neuromusculartemplate: "peripheral",
  vestibulartemplate: "vestibular",
};

// Assessments added from the Neuro library have ids "nx-<category>-<item>".
const NEURO_BUCKET_OF_LIBRARY_PREFIX = [
  ["nx-stroke-", "stroke"], ["nx-parkinson-s-disease-", "parkinsons"], ["nx-traumatic-brain-injury-", "tbi"],
  ["nx-spinal-cord-injury-", "sci"], ["nx-multiple-sclerosis-", "ms"], ["nx-vestibular-disorders-", "vestibular"],
  ["nx-peripheral-nerve-", "peripheral"], ["nx-ataxia-", "ataxia"],
];

// condition: the chosen template id; stepOrder: the assessment's steps (added
// condition assessments show up there). Empty lists when the case has no
// condition of its own (e.g. "General Neurological").
export function neuroDiagnosisOptionsFor({ condition, stepOrder } = {}) {
  const buckets = [];
  if (NEURO_BUCKET_OF_TEMPLATE[condition]) buckets.push(NEURO_BUCKET_OF_TEMPLATE[condition]);
  for (const id of stepOrder || []) {
    const hit = NEURO_BUCKET_OF_LIBRARY_PREFIX.find(([prefix]) => typeof id === "string" && id.startsWith(prefix));
    if (hit) buckets.push(hit[1]);
  }
  const used = unique(buckets);
  return {
    diagnoses: unique(used.flatMap((b) => NEURO_DIAGNOSES[b].diagnoses)),
    differentials: unique(used.flatMap((b) => NEURO_DIAGNOSES[b].differentials)),
    label: used.map((b) => NEURO_DIAGNOSES[b].label).join(" / "),
  };
}

/* ------------------------------ CARDIO ------------------------------ */

export const CARDIO_DIAGNOSES = {
  cardio: {
    label: "Cardiovascular",
    diagnoses: ["Reduced aerobic capacity / exercise intolerance", "Post-myocardial infarction deconditioning", "Heart failure with reduced exercise tolerance", "Post-CABG / post-sternotomy mobility and breathing impairment", "Post-valve surgery impairment", "Abnormal heart rate or blood pressure response to exercise", "Chronotropic incompetence", "Peripheral oedema / venous insufficiency", "Intermittent claudication (peripheral arterial disease)", "Orthostatic intolerance", "Reduced functional mobility"],
    differentials: ["Myocardial infarction", "Unstable angina", "Heart failure", "Atrial fibrillation / other arrhythmia", "Valvular heart disease", "Cardiomyopathy", "Pulmonary embolism", "Pericarditis", "Aortic dissection (red flag)", "Anaemia", "Deconditioning", "Anxiety / panic", "Musculoskeletal chest wall pain", "Medication effect (e.g. beta-blocker)", "Thyroid disease"],
  },
  resp: {
    label: "Respiratory",
    diagnoses: ["Impaired airway clearance / sputum retention", "Reduced lung volumes / atelectasis", "Dyspnoea on exertion", "Altered breathing pattern / hyperinflation", "Reduced chest wall expansion", "Respiratory muscle weakness", "Hypoxaemia on exertion", "Post-operative pulmonary complication risk", "Reduced exercise tolerance", "Dysfunctional breathing"],
    differentials: ["COPD exacerbation", "Asthma", "Pneumonia", "Bronchiectasis", "Interstitial lung disease", "Pleural effusion", "Pneumothorax", "Pulmonary embolism", "Heart failure (pulmonary oedema)", "Lung cancer", "Dysfunctional breathing / hyperventilation", "Anaemia", "Deconditioning", "Neuromuscular weakness"],
  },
};

// A few extra suggestions that depend on where the patient is being seen.
const CARDIO_SETTING_EXTRA = {
  icu: {
    diagnoses: ["ICU-acquired weakness", "Prolonged mechanical ventilation (weaning)", "Delirium limiting mobilisation", "Haemodynamic instability limiting activity"],
    differentials: ["Critical illness myopathy / polyneuropathy", "Ventilator-associated pneumonia", "Sepsis-related deterioration"],
  },
  postop: {
    diagnoses: ["Post-operative reduced mobility", "Post-operative pain limiting breathing and mobility"],
    differentials: ["Post-operative pulmonary complication", "Wound or sternal infection", "Post-operative arrhythmia", "Deep vein thrombosis"],
  },
  rehab: {
    diagnoses: ["Reduced exercise capacity for structured rehabilitation", "Poor risk-factor control / lifestyle risk"],
    differentials: [],
  },
};

const CARDIO_BUCKETS_OF_SYSTEM = { cardio: ["cardio"], resp: ["resp"], combined: ["cardio", "resp"] };

export function cardioDiagnosisOptionsFor({ setting, system } = {}) {
  const buckets = CARDIO_BUCKETS_OF_SYSTEM[system] || [];
  const extra = CARDIO_SETTING_EXTRA[setting];
  if (!buckets.length) return { diagnoses: [], differentials: [], label: "" };
  return {
    diagnoses: unique([...buckets.flatMap((b) => CARDIO_DIAGNOSES[b].diagnoses), ...(extra?.diagnoses || [])]),
    differentials: unique([...buckets.flatMap((b) => CARDIO_DIAGNOSES[b].differentials), ...(extra?.differentials || [])]),
    label: buckets.map((b) => CARDIO_DIAGNOSES[b].label).join(" / "),
  };
}

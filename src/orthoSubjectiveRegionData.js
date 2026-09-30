/* ============================================================
   orthoSubjectiveRegionData.js — core-tier, region-specific
   Subjective field sets for the Outpatient / Musculoskeletal
   pathway. Content is our own phrasing of standard MSK physio
   subjective-exam concepts (location / radiation / mechanism /
   aggravating-relieving / 24h pattern / irritability / a
   region-specific red-flag screen / function) — not copied from
   any single source. Field shape matches every other section in
   this module: { id, label, type: "multi"|"single"|"text"|"textarea", options? }.
   ============================================================ */

const PATTERN_OPTIONS = ["Constant", "Intermittent", "Worse in morning", "Worse at night", "Activity-related", "Improves through the day"];
const IRRITABILITY_OPTIONS = ["Low — settles quickly", "Moderate", "High", "Very high — slow to settle"];
const NONE_ABOVE = "None of the above";

export const REGION_CONTENT_KEY_MAP = {
  cervical: "cervical",
  thoracic: "thoracic",
  lumbar: "lumbarSI",
  sacrum: "lumbarSI",
  pelvis: "lumbarSI",
  shoulder: "shoulder",
  upperArm: "shoulder",
  elbow: "elbowWristHand",
  forearm: "elbowWristHand",
  wrist: "elbowWristHand",
  hand: "elbowWristHand",
  hip: "hip",
  thigh: "hip",
  knee: "knee",
  leg: "ankleFoot",
  ankle: "ankleFoot",
  foot: "ankleFoot",
};

export function contentKeyForRegion(region) {
  if (!region) return null;
  return REGION_CONTENT_KEY_MAP[region.id] || null;
}

export const SUBJECTIVE_REGION_FIELDS = {
  // Real, structured Cervical checklist — ported field-for-field (same
  // option wording) from the older Ortho flow's Phase 0.5 Cervical
  // Reasoning Engine screen (sharedClinicalData.js cx_* fields, see
  // the old cervicalVariableExtractor.js), so orthoCervicalReasoning.js's
  // differential matcher gets the same real evidence that engine was
  // built and tuned against, not a shallower reinterpretation -- same
  // approach lumbarSI below already used.
  cervical: [
    // Trimmed 43 -> 17 fields (2026-09-29, Aditi: "region specific subjective
    // assessment... too much"). Dropped: dermatomal, the WAD-grade/LOC/
    // first-symptom mechanism sub-fields, the arm-symptom quality/fingers/
    // position breakdown (kept just armPresent as a flag), the aggravating/
    // relieving postures/activities/other/best-single-factor sub-fields
    // (kept one representative field each), morning/night/24hr-type/
    // trajectory (folded under overallPattern), and the headache location/
    // quality/triggers/classification/frequency breakdown (kept just
        // haPresent). orthoCervicalReasoning.js reads nearly every field this
    // checklist ever had, so this IS a real trade against "AI Objective
    // Assessment" match quality for dropped fields -- explicitly accepted.
    // Every red-flag/fracture screen field, plus Lhermitte's sign, is kept
    // in full: those are safety screens, not stylistic detail, and stay
    // untouched regardless of length pressure.
    { id: "location", label: "Primary pain location", type: "multi", options: ["Suboccipital / base of skull", "Upper cervical (C0-C3)", "Mid cervical (C4-C5)", "Lower cervical (C6-T1)", "Anterior neck", "Posterior neck (central)", "Lateral neck (L)", "Lateral neck (R)", "Cervico-thoracic junction", "Trapezius (L)", "Trapezius (R)", "Levator scapulae", "Sternocleidomastoid", "Scalene"] },
    { id: "radiation", label: "Radiation pattern", type: "multi", options: ["No radiation — local only", "Into occiput / back of head", "Behind the eye / retro-orbital", "Temporal region", "Jaw / TMJ region", "Ear / periauricular", "Top of shoulder (C4 pattern)", "Shoulder / upper arm (L)", "Shoulder / upper arm (R)", "Down arm to elbow (L)", "Down arm to elbow (R)", "To hand / fingers (L)", "To hand / fingers (R)", "Bilateral upper limb", "Around chest / anterior chest wall", "Between shoulder blades"] },
    { id: "mechanismType", label: "Mechanism type", type: "multi", options: ["No clear mechanism — insidious onset", "Whiplash — rear-end MVA", "Whiplash — front-end MVA", "Whiplash — side impact MVA", "Hyperflexion (head forced forward)", "Hyperextension (head forced back)", "Combined flexion + rotation", "Direct trauma to head / neck", "Diving / swimming impact", "Sustained poor posture over time", "Sleeping position", "Lifting heavy load", "Post-surgical", "Post-illness / meningism"] },
    { id: "armPresent", label: "Arm / hand symptoms present?", type: "single", options: ["No arm or hand symptoms", "Yes — unilateral (L)", "Yes — unilateral (R)", "Yes — bilateral (concerning for cord)"] },
    { id: "lhermitte", label: "Lhermitte's sign (electric shock down spine with neck flexion)?", type: "single", options: ["No", "Yes — electric shock down spine with neck flexion (myelopathy / MS flag)", "Unsure", "Not assessed"] },
    { id: "aggMovements", label: "Movements aggravate", type: "multi", options: ["Flexion — looking down", "Extension — looking up", "Rotation left", "Rotation right", "Side bend left", "Side bend right", "Combined extension + rotation left (quadrant)", "Combined extension + rotation right (quadrant)", "Combined flexion + rotation", "Sustained end-range any direction", "Quick / sudden movements", "All movements equally"] },
    { id: "relMovements", label: "Movements relieve", type: "multi", options: ["Chin tuck (cranio-cervical flexion)", "Cervical retraction", "Cervical extension", "Cervical flexion", "Rotation left", "Rotation right", "Specific direction (McKenzie preference)", "Shoulder blade retraction / squeeze", "Shoulder elevation (unloads C4/C5)", "Arm overhead — relieves arm symptoms (shoulder abduction relief sign)", "Gentle stretching", "Hot shower with water on neck"] },
    { id: "overallPattern", label: "Overall symptom pattern", type: "multi", options: ["Constant — never goes away", "Constant — varies in intensity", "Intermittent — clear triggers", "Intermittent — unpredictable", "Activity-related only", "Position-related only", "Morning dominant", "Evening dominant", "Night dominant", "Episodic flare-ups on background constant pain", "Warms up — eases with movement", "Completely gone between episodes"] },
    { id: "irritability", label: "Irritability (Maitland SIN)", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "haPresent", label: "Headache as part of presentation?", type: "single", options: ["No headache", "Yes — primary complaint", "Yes — secondary to neck pain", "Yes — concurrent but possibly unrelated", "Previous headache history — not current"] },
    { id: "redFlagsMyelopathy", label: "⚠ Myelopathy / UMN screen", type: "multi", options: ["No myelopathy signs", "Bilateral hand symptoms (grip clumsiness / numbness)", "Loss of fine motor control (buttons / writing)", "Gait disturbance / wide-based gait / ataxia", "Unexplained falls", "Bilateral lower limb weakness or stiffness", "Hyperreflexia (known)", "Babinski positive (known)", "Hoffman's sign (known)", "Bladder dysfunction — new onset", "Bowel dysfunction — new onset", "Lhermitte's sign", "Rapidly progressive neurological symptoms"] },
    { id: "redFlagsVbi", label: "⚠ VBI / vertebrobasilar screen (5 Ds + 3 Ns)", type: "multi", options: ["No VBI signs", "Dizziness with neck movement — specific", "Diplopia (double vision)", "Drop attacks", "Dysarthria (slurred speech)", "Dysphagia (difficulty swallowing)", "Ataxia (coordination loss)", "Nausea with neck movement", "Nystagmus (eye oscillation)", "Numbness — face or bilateral limbs", "Thunderclap headache — sudden worst ever", "Horner's syndrome (drooping eyelid + small pupil)"] },
    { id: "redFlagsInstability", label: "⚠ Craniovertebral instability screen", type: "multi", options: ["No instability signs", "Rheumatoid arthritis — known", "Down syndrome / trisomy 21", "Recent significant trauma", "Post-surgical cervical fusion", "Sense of head not stable on neck", "Constant occipital / suboccipital pain unrelieved", "Muscle spasm severe — guarding", "Sharp pain on neck flexion"] },
    { id: "redFlagsOther", label: "Other cervical red flags", type: "multi", options: ["No other red flags", "Carotid / vertebral artery dissection symptoms", "Thunderclap headache — sudden onset worst ever", "Known cervical cancer / tumour", "Recent high-energy trauma to neck", "Torticollis — acute with fever (retropharyngeal abscess risk)", "Constitutional symptoms with neck pain"] },
    { id: "fractureScreen", label: "Cervical fracture indicators", type: "multi", options: ["Not applicable", "High-energy trauma (MVA / fall >1m / diving)", "Axial loading mechanism (head impact)", "Immediate severe pain + muscle spasm", "Cannot move neck at all — voluntary splinting", "Neurological symptoms from time of injury", "Odontoid peg fracture risk — elderly + fall", "NEXUS criteria not cleared", "Canadian C-Spine Rule — high risk features", "Bilateral facet dislocation — high energy", "Clay shoveler fracture — sudden load / whip"] },
    { id: "rfAction", label: "Action taken", type: "single", options: ["No red flags — proceed with assessment", "Red flags noted — monitor and reassess", "GP referral — routine", "GP referral — urgent", "Emergency department referral", "Urgent neurology / neurosurgery referral", "Manipulation contraindicated — mobilisation only", "Manipulation contraindicated — exercise only"] },
    { id: "fnAdl", label: "Activities limited", type: "multi", options: ["No functional limitation", "Driving — head rotation restricted", "Looking over shoulder — road safety concern", "Computer / screen use", "Reading / desk work", "Watching TV", "Sleeping — position difficulty", "Hair washing / drying", "Overhead activities", "Carrying / lifting", "Sport / exercise", "Work duties", "Childcare", "Sexual activity", "Concentration / cognitive (headache)", "Social activities"] },
  ],
  // Real, structured Thoracic checklist — ported field-for-field (same
  // option wording) from the older Ortho flow's Phase 0.5 Thoracic
  // Reasoning Engine screen (sharedClinicalData.js tx_* fields, see
  // the old thoracicVariableExtractor.js), so orthoThoracicReasoning.js's
  // differential matcher gets the same real evidence that engine was
  // built and tuned against -- same approach cervical/lumbarSI already use.
  thoracic: [
    // Trimmed 12 -> 9 fields (2026-09-29, same pass as cervical/lumbarSI --
    // dropped ribScreen and aggPostures (folded under aggMovements) and
    // fnPsfs (folded under fnAdl). redFlags kept in full, untouched.
    { id: "location", label: "Primary pain location", type: "multi", options: ["Upper thoracic T1–T4", "Mid thoracic T5–T8", "Lower thoracic T9–T12", "Cervico-thoracic junction C7–T2", "Thoracolumbar junction T12–L1", "Interscapular — central", "Interscapular — left", "Interscapular — right", "Costovertebral — lateral", "Lateral chest wall", "Anterior chest wall", "Sternal / midline anterior", "Around chest — dermatomal band", "Bilateral paraspinal"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation — local", "Around chest wall — dermatomal", "To shoulder blade — interscapular referred", "To anterior chest — cardiac / visceral differential", "To abdomen — visceral differential", "To groin / hip — lower thoracic referred", "Bilateral chest / girdle", "Cardiac-like radiation — left chest / arm (urgent flag)"] },
    { id: "mechanismType", label: "Mechanism type", type: "multi", options: ["Insidious — postural / sustained", "Lifting injury", "Rotation injury", "Fall / direct trauma", "MVA — thoracic component", "Prolonged computer / desk posture", "Post-surgical", "Post-partum — breastfeeding posture", "Osteoporotic fracture — minimal trauma", "Viral illness — post-viral costochondritis", "No clear mechanism"] },
    { id: "aggMovements", label: "Movements aggravate", type: "multi", options: ["Rotation (most thoracic sensitive to)", "Side bending", "Extension", "Flexion", "Combined movements", "Deep breathing in", "Deep breathing out", "Coughing", "Sneezing", "Laughing", "Sustained end-range posture", "Quick / sudden movements", "Lifting", "Reaching overhead"] },
    { id: "relTreatments", label: "What helps?", type: "multi", options: ["Heat", "Ice", "Manipulation — significant relief", "Mobilisation", "Stretching", "Breathing exercises", "Postural correction", "Taping", "NSAIDs effective", "Paracetamol effective", "Muscle relaxants", "No treatment helps"] },
    { id: "pattern", label: "Pattern", type: "multi", options: ["Mechanical — movement and posture related", "Constant — unrelated to movement (red flag)", "Breathing-related — with respiration", "Activity-dependent", "Night dominant", "Morning stiffness", "Inflammatory — morning stiffness / eases with movement"] },
    { id: "irritability", label: "Irritability", type: "single", options: ["Low", "Moderate", "High", "Very high"] },
    { id: "redFlags", label: "Red flag screen", type: "multi", options: ["No red flags", "Constant pain completely unaffected by position or movement", "Night pain — awakens patient — progressive", "Progressive worsening despite conservative treatment", "Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw", "Cardiac history — pain reproduces cardiac pattern", "Respiratory symptoms — shortness of breath / haemoptysis", "Abdominal symptoms — pain with eating / weight loss", "Cancer history — any — thoracic metastases risk", "Unexplained weight loss + thoracic pain", "Fever + thoracic pain (discitis / osteomyelitis)", "Recent trauma — fracture risk", "Known osteoporosis — pathological fracture risk", "Neurological symptoms in legs — cord compression", "Bilateral leg weakness or sensory change (cord level)", "Age >50 — first episode without cause", "Systemically unwell — malaise + thoracic pain"] },
    { id: "fnAdl", label: "Limited activities", type: "multi", options: ["No limitations", "Deep breathing", "Coughing / sneezing", "Sitting tolerance", "Driving", "Computer work", "Sport", "Lifting", "Sleeping", "Work tasks"] },
  ],
  lumbarSI: [
    // Trimmed 46 -> 15 fields (2026-09-29, same pass as cervical/thoracic).
    // Dropped: dermatomal, belowKnee, the load/position/first-symptom
    // mechanism sub-fields, spondyloScreen, the aggravating/relieving
    // movements/activities/manual/medications/directional-preference
    // sub-fields (kept one representative field each), morning/night/
    // 24hr-type/trajectory (folded under overallPattern), the leg-symptom
    // quality/signs/claudication breakdown (kept just neuroPresent +
    // bladderBaseline), the entire psychosocial yellow-flags battery,
    // sitting/standing/walking-tolerance (folded under adlRestrictions),
    // and prior-episode history. orthoLumbarReasoning.js reads nearly
    // every field this checklist ever had -- explicitly accepted trade
    // against "AI Objective Assessment" match quality for what's dropped.
    // Every red-flag screen is kept in full, plus bladderBaseline (needed
    // to correctly interpret a cauda equina bladder-symptom answer as new
    // vs pre-existing) -- safety screens stay untouched regardless of
    // length pressure.
    { id: "location", label: "Primary pain location", type: "multi", options: ["Upper lumbar (L1-L2)", "Mid lumbar (L3)", "Lower lumbar (L4-L5)", "Lumbosacral junction (L5-S1)", "Central / midline", "Paraspinal right of midline", "Paraspinal left of midline", "Bilateral / band", "Sacrum (central)", "SI joint (L)", "SI joint (R)", "Bilateral SI joints", "Coccyx", "Buttock (L) — upper", "Buttock (L) — lower", "Buttock (R) — upper", "Buttock (R) — lower", "Ischial tuberosity (L)", "Ischial tuberosity (R)"] },
    { id: "radiation", label: "Radiation pattern", type: "multi", options: ["No radiation — local only", "Across lower back (belt distribution)", "Into groin (L)", "Into groin (R)", "To buttock (L)", "To buttock (R)", "To posterior thigh (L)", "To posterior thigh (R)", "To anterior thigh (L)", "To anterior thigh (R)", "To lateral thigh", "To knee (L)", "To knee (R)", "To calf (L)", "To calf (R)", "To lateral lower leg (L5)", "To medial lower leg (L4)", "To dorsum of foot (L5)", "To sole of foot (S1)", "To toes (L)", "To toes (R)", "Bilateral lower limb — concerning"] },
    { id: "mechanismType", label: "Mechanism type", type: "multi", options: ["No clear mechanism — insidious onset", "Lifting — spine flexed", "Lifting — spine rotated", "Lifting — spine flexed AND rotated (most common disc mechanism)", "Lifting — from floor (deadlift position)", "Twisting without lifting", "Bending forward without lifting", "Coughing / sneezing — onset", "Straining on toilet (Valsalva)", "Stumble / trip without full fall", "Fall onto back / buttocks", "Fall from height", "Motor vehicle accident", "Sport — specific (notes)", "Sustained poor posture over time", "Post-surgical", "Post-partum", "Post-illness", "No identified mechanism"] },
    { id: "aggPostures", label: "Postures aggravate", type: "multi", options: ["Sitting — any duration", "Sitting >15 minutes", "Sitting >30 minutes", "Sitting >1 hour", "Soft / unsupported seating", "Standing — any duration", "Standing >15 minutes", "Standing >30 minutes", "Lying supine (flat)", "Lying prone (face down)", "Lying on left side", "Lying on right side", "Driving (duration — specify in notes)", "Reading in bed", "Slumped / flexed posture", "Forward bent posture (e.g. over sink)", "Twisted / asymmetric posture"] },
    { id: "relPostures", label: "Postures relieve", type: "multi", options: ["Lying flat (supine)", "Lying with knees bent (crook lying)", "Lying with pillow under knees", "Lying on side — knees together", "Lying on side — pillow between knees", "Lying prone (face down)", "Prone on elbows (extension load)", "Sitting with good lumbar support", "Sitting on firm chair", "Standing — weight shifted", "Walking slowly", "Hands and knees (flexion unloading)", "Leaning forward on trolley / counter (stenosis pattern)", "Sitting with legs elevated"] },
    { id: "overallPattern", label: "Overall symptom pattern", type: "multi", options: ["Constant — never goes away", "Constant — varies in intensity hour to hour", "Intermittent — clear triggers", "Intermittent — unpredictable", "Only with specific loading", "Only at rest / worse at rest", "Morning dominant", "Evening dominant — worse after day's activities", "Night dominant", "Activity-proportional (warms up then fades)", "Delayed onset — pain next day after activity", "Worse second half of night (AS inflammatory pattern)", "Unpredictable — no pattern (nociplastic flag)"] },
    { id: "irritability", label: "Irritability (Maitland SIN)", type: "single", options: ["Low — hard to provoke, settles quickly", "Moderate — provoked with sustained activity, settles reasonably", "High — easily provoked, slow to settle (hours)", "Very high — minimal provocation, prolonged aggravation (24hrs+)"] },
    { id: "neuroPresent", label: "Leg neurological symptoms?", type: "single", options: ["No leg neurological symptoms", "Yes — unilateral (L)", "Yes — unilateral (R)", "Yes — bilateral (cauda equina / stenosis flag)"] },
    { id: "bladderBaseline", label: "Bladder / bowel baseline BEFORE pain started", type: "single", options: ["Normal bladder and bowel before pain onset", "Pre-existing bladder issues — specify in notes", "Pre-existing bowel issues — specify in notes", "Not asked — needs clarifying", "Uncertain"] },
    { id: "redFlagsCauda", label: "⚠ Cauda equina screen (urgent)", type: "multi", options: ["No cauda equina signs", "Bilateral leg weakness — new onset", "Saddle area anaesthesia — perineum / inner thighs", "Bladder retention — cannot urinate", "Bladder incontinence — new onset / unexpected", "Bowel incontinence — new onset / unexpected", "Reduced anal tone (if assessed)", "Sexual dysfunction — new onset", "Rapidly progressive bilateral neurological deficit", "Bilateral sciatica — new onset"] },
    { id: "redFlagsFracture", label: "Fracture risk indicators", type: "multi", options: ["No fracture indicators", "Major high-energy trauma", "Minor trauma + known osteoporosis", "Minor trauma + age >70", "Long-term corticosteroid use", "History of previous vertebral fracture", "Point bone tenderness on spinous process", "Severe unrelenting pain unaffected by position", "Post-menopausal woman + acute onset"] },
    { id: "redFlagsInflammatory", label: "Inflammatory / spondyloarthropathy indicators (ASAS)", type: "multi", options: ["No inflammatory features", "Age of onset <45", "Insidious onset over weeks-months", "Morning stiffness >30 minutes", "Stiffness improves with movement / exercise", "Worse with rest — restlessness at night", "Alternating buttock pain (R to L)", "Family history of AS / psoriasis / IBD / uveitis", "Psoriasis — personal history", "IBD (Crohn's / colitis) — personal history", "Uveitis / iritis — personal history", "Peripheral joint involvement", "NSAIDs very effective (ASAS criterion)", "HLA-B27 positive (known)", "Elevated ESR / CRP (known)"] },
    { id: "redFlagsSerious", label: "Other serious pathology indicators", type: "multi", options: ["No other red flags", "Constant pain — completely unaffected by position or movement", "Progressive night pain", "Thoracic pain accompanying lumbar pain", "Abdominal pain accompanying", "Pulsatile abdominal mass (AAA)", "Unexplained weight loss", "History of cancer — any", "IV drug use — risk of discitis", "Recent bacterial infection elsewhere", "Fever / systemically unwell with back pain", "Pain radiating to flank / loin (renal / ureteric)"] },
    { id: "adlRestrictions", label: "ADL restrictions", type: "multi", options: ["No ADL restrictions", "Putting on shoes and socks", "Bending to floor level", "Lifting children", "Lifting shopping / moderate loads", "Vacuuming / mopping / floor cleaning", "Bed mobility — turning over", "Getting out of bed", "Getting in / out of bath", "Driving", "Sexual activity", "Gardening", "Housework generally", "Childcare / parenting duties"] },
    { id: "workImpact", label: "Work impact", type: "single", options: ["No work impact", "Mild discomfort — full duties", "Modified duties", "Reduced hours", "Off work — short term (<4 weeks)", "Off work — medium term (4–12 weeks)", "Off work — long term (>12 weeks)", "Unemployed — job loss", "Unable to return to previous occupation"] },
  ],
  shoulder: [
    // Trimmed 10 -> 8 fields (2026-09-29): dropped stiffness (frozen-
    // shoulder pattern still capturable via pattern/notes) and irritability.
    { id: "location", label: "Pain location", type: "multi", options: ["Anterior shoulder", "Lateral shoulder (deltoid)", "Posterior shoulder", "AC joint", "Bicipital groove", "Subacromial", "Scapular border", "Upper arm"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Down to elbow", "Down to hand (consider cervical origin)", "Up to neck", "Between shoulder blades"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Fall onto shoulder / outstretched hand", "Direct blow", "Forced overhead / rotation movement", "Repetitive overhead activity", "Throwing / racquet sport", "Lifting overhead", "Post-surgical", "Age-related / degenerative"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Overhead reaching", "Reaching behind back", "Reaching across the body", "Lying on the shoulder", "Lifting", "Painful arc (mid-range)"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Supportive positioning", "Ice / heat", "Medication", "Avoiding overhead activity"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Suspected fracture (recent fall / trauma)", "Cannot lift arm at all after trauma", "Constant progressive pain unrelated to movement", "Night pain unrelated to position", "Palpable mass", "Redness / warmth / swelling (possible infection)", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Overhead activities", "Reaching behind back", "Dressing", "Carrying / lifting", "Sleeping on that side", "Work / sport demands"] },
  ],
  elbowWristHand: [
    // Trimmed 10 -> 9 fields (2026-09-29): dropped irritability. Kept
    // neuro -- median vs ulnar nerve pattern is a defining differential
    // clue for this region, not a stylistic add-on.
    { id: "location", label: "Pain location", type: "multi", options: ["Lateral elbow", "Medial elbow", "Posterior elbow", "Anterior elbow", "Forearm", "Dorsal wrist", "Volar (palm-side) wrist", "Radial wrist / thumb side", "Ulnar wrist", "Thumb", "Fingers", "Palm"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Into the fingers", "Up the forearm", "Numbness / tingling — thumb, index, middle finger (median nerve pattern)", "Numbness / tingling — ring and little finger (ulnar nerve pattern)"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Fall onto outstretched hand", "Repetitive gripping / lifting", "Racquet sport (lateral elbow)", "Golf / throwing (medial elbow)", "Repetitive thumb use (e.g. new parent lifting baby)", "Direct trauma", "Vibration exposure"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Gripping", "Lifting", "Wrist extension against resistance", "Wrist flexion against resistance", "Thumb movements", "Repetitive typing / mouse use", "Sustained grip"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Splint / brace", "Ice", "Activity modification", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "neuro", label: "Neurological symptoms", type: "multi", options: ["None", "Numbness / tingling — night-dominant (carpal tunnel pattern)", "Numbness / tingling — worse with elbow flexion (cubital tunnel pattern)", "Weakness in grip", "Dropping objects", "Wasting of hand muscles"] },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Suspected fracture (fall / trauma + deformity)", "Snuffbox tenderness after a fall (possible scaphoid fracture)", "Sudden inability to extend a finger (tendon rupture)", "Rapidly increasing swelling / severe pain (compartment syndrome)", "Hot / red / swollen joint", "Bilateral symptoms (systemic screen)", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Gripping / carrying", "Typing / writing", "Fine motor tasks", "Lifting", "Sport / work demands"] },
  ],
  hip: [
    // Trimmed 14 -> 9 fields (2026-09-29): dropped irritability and the
    // four narrow sub-condition screens (cSign/piriformisSigns/
    // meralgiaSigns/hamstringOnsetPattern) -- redFlags/mechanical (the
    // core mechanical-symptoms screen) stay untouched.
    { id: "location", label: "Pain location", type: "multi", options: ["Anterior groin", "Anterior hip / hip flexor region", "Lateral hip (greater trochanter)", "Posterior hip / deep buttock", "Ischial tuberosity", "Adductor / inner thigh", "Pubic symphysis", "SI joint"] },
    { id: "locationPattern", label: "Dominant pattern", type: "single", options: ["Groin-dominant", "Lateral hip-dominant", "Posterior / buttock-dominant", "Adductor-dominant", "Diffuse / mixed"] },
    // Wording matches orthoHipReasoning.js's runHipReasoningFromData()
    // keyword checks exactly (e.g. "insidious onset", "kicking mechanism") --
    // the original wording here used different phrasing ("Insidious /
    // overuse", "Sprint / kicking") that never matched, silently leaving
    // onsetInsidious/onsetTraumatic/kickingOrSprintMechanism unreachable
    // from this checklist (2026-09-15, real gap found auditing Hip/Ankle
    // alongside Shoulder's identical class of bug).
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious onset / overuse", "Age-related degenerative", "Twisting / pivoting mechanism", "Fall", "Kicking mechanism", "Lunging mechanism", "High-speed sport", "Return to sport after time off", "Post-partum", "Post hip replacement"] },
    // FADIR/FABER combined + sitting-on-hard-surface/lying-on-affected-side
    // are real signals the engine checks (fadirAggravation,
    // faberAggravation, ischialSittingPain, worseLyingOnAffectedSide) that
    // had no matching option at all before.
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["FADIR combined (flexion-adduction-internal rotation)", "FABER combined (flexion-abduction-external rotation)", "Sitting cross-legged", "Prolonged sitting", "Sitting on hard surface", "Lying on affected side", "Walking", "Stairs", "Getting out of a car"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Position change", "Heat", "Medication", "Reduced impact activity"] },
    // Bespoke options (not the shared PATTERN_OPTIONS) so night pain/
    // constant/morning stiffness -- all real engine signals -- have
    // something to actually match, same reasoning as Lumbar/Cervical's
    // own bespoke pattern fields.
    { id: "pattern", label: "24-hour pattern", type: "single", options: ["Intermittent — activity-related", "Constant — rarely eases", "Night pain", "Morning stiffness", "Improves through the day", "Worse through the day"] },
    { id: "mechanical", label: "Mechanical symptoms", type: "multi", options: ["None", "Clicking — painless", "Clicking — with pain", "Catching sensation", "Giving way", "Locking — intermittent", "Internal snapping (anterior, iliopsoas)", "External snapping (lateral, IT band)", "Crepitus / grinding"] },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Suspected fracture / cannot weight bear (elderly + fall)", "Suspected fracture neck of femur", "Acute hot swollen hip joint", "Avascular necrosis risk (steroid use, sickle cell, alcohol excess)", "Constant progressive pain unrelated to loading", "Referred pain from abdomen / pelvis", "Gynaecological referral suspected", "Testicular referral suspected", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Walking tolerance", "Stairs", "Getting up from low chairs", "Sport / running", "Sitting tolerance"] },
  ],
  knee: [
    // Trimmed 11 -> 10 fields (2026-09-29): dropped irritability only --
    // givingWay/locking kept, they're defining differential clues here
    // (meniscus/ligament vs patellofemoral), not stylistic detail.
    { id: "location", label: "Pain location", type: "multi", options: ["Anterior / diffuse", "Around the kneecap", "Below the kneecap (patellar tendon)", "Above the kneecap (quad tendon)", "Medial joint line", "Lateral joint line", "Behind the knee (popliteal)", "Below the joint line (tibial tuberosity)", "Diffuse"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Referred from the hip", "Referred from the lower back", "Down the shin"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Non-contact twisting", "Direct blow", "Hyperextension", "Landing from a jump", "Pivoting / cutting movement", "Post-surgical"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Stairs (up)", "Stairs (down)", "Squatting", "Prolonged sitting (\"movie sign\")", "Running", "Twisting / pivoting"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Ice", "Elevation", "Support / brace", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "givingWay", label: "Giving way?", type: "single", options: ["No", "Yes — with pivoting / twisting", "Yes — on stairs", "Yes — unpredictable / no clear trigger"] },
    { id: "locking", label: "Locking?", type: "single", options: ["No", "Yes — true mechanical locking", "Yes — momentary / pseudo-locking"] },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Unable to bear weight for 4 steps", "Immediate marked swelling after injury (possible haemarthrosis)", "Locked knee that won't straighten", "Hot red severely tender joint", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Stairs", "Squatting / kneeling", "Running", "Walking distance", "Sport participation"] },
  ],
  ankleFoot: [
    // Trimmed 19 -> 9 fields (2026-09-29). NOTE: unlike the other trims in
    // this pass, the 9 dropped screens below (previousSprains through
    // peronealSymptoms) WERE verified matching-relevant to
    // orthoAnkleFootReasoning.js (added deliberately on 2026-09-15 to close
    // real gaps in its differential matching) -- cutting them is a bigger
    // hit to "AI Objective Assessment" match quality for this region than
    // most other regions' trims, explicitly accepted anyway per Aditi's
    // "just want to trim... region specific" (2026-09-29). redFlags kept
    // in full, untouched.
    { id: "location", label: "Pain location", type: "multi", options: ["Lateral ankle ligaments", "Medial ankle ligaments", "Anterior ankle", "Posterior ankle", "Achilles tendon — insertional", "Achilles tendon — mid-portion", "Plantar heel / arch", "1st big toe joint", "Forefoot / metatarsals", "Between the toes", "Top of the foot", "Shin"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Referred from the lower back", "Tarsal tunnel — burning into the sole/toes (posterior tibial nerve)", "Burning between the toes", "Into the sole of the foot"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious onset / overuse", "Inversion sprain (rolled inward)", "Eversion sprain (rolled outward)", "High ankle sprain (syndesmosis)", "Direct impact", "Fall from height", "Landing from a jump", "Change in footwear / surface", "Sudden increase in training"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["First steps in the morning", "Walking / running", "Downhill running", "Dorsiflexion (e.g. squatting, stairs down)", "Stairs", "Barefoot on a hard floor", "Tight / narrow footwear"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Ice", "Supportive footwear", "Stretching", "Taping / brace", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: ["Intermittent — activity-related", "Constant — never fully eases", "Worse in morning, improves through day", "Warms up then worsens (tendinopathy pattern)", "Night dominant (screen for serious pathology)", "Burning / night pain"] },
    { id: "swelling", label: "Swelling", type: "single", options: ["None", "Mild — settles same day", "Moderate — persistent low-grade swelling", "Severe / recurrent swelling after activity"] },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Ottawa rules — bony tenderness at malleolus", "Ottawa rules — cannot weight bear 4 steps", "Suspected Achilles rupture (unable to rise on toes)", "Suspected complete ATFL rupture", "Stress fracture suspected (focal tibial tenderness)", "Peroneal tendon subluxation", "Acute hot swollen joint", "Compartment syndrome / vascular compromise", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Walking distance", "Running", "Stairs", "Standing tolerance", "Sport participation"] },
  ],
};

/* Fallback for regions with no dedicated content cluster (Multiple regions,
   Whole body, custom write-ins) — same concepts, free-text so nothing is
   ever blocked by a missing region-specific option list. */
export const GENERIC_REGION_FIELDS = [
  { id: "location", label: "Pain location", type: "text" },
  { id: "radiation", label: "Radiation", type: "text" },
  { id: "mechanism", label: "Mechanism of injury", type: "textarea" },
  { id: "aggravating", label: "Aggravating factors", type: "textarea" },
  { id: "relieving", label: "Relieving factors", type: "textarea" },
  { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
  { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
  { id: "redFlags", label: "Red flags noted", type: "textarea" },
  { id: "function", label: "Functional limitations", type: "textarea" },
];

export function subjectiveFieldsForRegion(region) {
  const key = contentKeyForRegion(region);
  return (key && SUBJECTIVE_REGION_FIELDS[key]) || GENERIC_REGION_FIELDS;
}

// Groups each region's (long) field list into named, collapsible sections
// for RegionSubjectiveTabs (orthoOutpatientSections.jsx) to render (2026-09-29,
// Aditi: the region-specific subjective form is "too long" as one flat list,
// especially in the AI flow -- collapse it into sections instead of removing
// any fields). Field IDs only, so this never duplicates label/type/options --
// SUBJECTIVE_REGION_FIELDS above stays the single source of truth for those.
// Any field id present in a region's list but NOT named in its grouping here
// (e.g. a future addition someone forgot to file into a section) still shows,
// under a trailing "Other" section, rather than silently disappearing.
const SECTION_GROUPS = {
  // Cervical/Thoracic/Lumbar keep dedicated groupings -- even trimmed,
  // they're still the longest lists (9-17 fields). Shoulder/Elbow-Wrist-
  // Hand/Hip/Knee/Ankle-Foot are short enough post-trim (8-10 fields) to
  // just fall through to GENERIC_SECTION_GROUPS below, which already
  // matches their field naming (mechanism/aggravating/relieving/pattern/
  // redFlags/function); anything that doesn't match (locationPattern,
  // mechanical, neuro, givingWay/locking, swelling) lands in the
  // "Other" section via sectionedFieldsForRegion()'s own leftover net.
  cervical: [
    { title: "Location & Mechanism", ids: ["location", "radiation", "mechanismType"] },
    { title: "Arm / Neuro Signs", ids: ["armPresent", "lhermitte"] },
    { title: "Aggravating & Relieving", ids: ["aggMovements", "relMovements"] },
    { title: "Pattern", ids: ["overallPattern", "irritability"] },
    { title: "Headache", ids: ["haPresent"] },
    { title: "Red Flag Screens", ids: ["redFlagsMyelopathy", "redFlagsVbi", "redFlagsInstability", "redFlagsOther", "fractureScreen", "rfAction"] },
    { title: "Function", ids: ["fnAdl"] },
  ],
  thoracic: [
    { title: "Location & Mechanism", ids: ["location", "radiation", "mechanismType"] },
    { title: "Aggravating & Relieving", ids: ["aggMovements", "relTreatments"] },
    { title: "Pattern", ids: ["pattern", "irritability"] },
    { title: "Red Flags", ids: ["redFlags"] },
    { title: "Function", ids: ["fnAdl"] },
  ],
  lumbarSI: [
    { title: "Location & Mechanism", ids: ["location", "radiation", "mechanismType"] },
    { title: "Leg Neuro Symptoms", ids: ["neuroPresent", "bladderBaseline"] },
    { title: "Aggravating & Relieving", ids: ["aggPostures", "relPostures"] },
    { title: "Pattern", ids: ["overallPattern", "irritability"] },
    { title: "Red Flag Screens", ids: ["redFlagsCauda", "redFlagsFracture", "redFlagsInflammatory", "redFlagsSerious"] },
    { title: "Function", ids: ["adlRestrictions", "workImpact"] },
  ],
};

// Own small grouping for the generic write-in fallback too, same "collapse,
// don't cut" treatment as every named region above.
const GENERIC_SECTION_GROUPS = [
  { title: "Location & Radiation", ids: ["location", "radiation"] },
  { title: "Mechanism, Aggravating & Relieving", ids: ["mechanism", "aggravating", "relieving"] },
  { title: "Pattern", ids: ["pattern", "irritability"] },
  { title: "Red Flags", ids: ["redFlags"] },
  { title: "Function", ids: ["function"] },
];

export function sectionedFieldsForRegion(region) {
  const fields = subjectiveFieldsForRegion(region);
  const key = contentKeyForRegion(region);
  const groups = (key && SECTION_GROUPS[key]) || GENERIC_SECTION_GROUPS;
  const byId = new Map(fields.map((f) => [f.id, f]));
  const used = new Set();
  const sections = groups
    .map((g) => {
      const groupFields = g.ids.map((id) => byId.get(id)).filter(Boolean);
      groupFields.forEach((f) => used.add(f.id));
      return { title: g.title, fields: groupFields };
    })
    .filter((s) => s.fields.length);
  const leftover = fields.filter((f) => !used.has(f.id));
  if (leftover.length) sections.push({ title: "Other", fields: leftover });
  return sections;
}

// Which fields actually change what "AI Objective Assessment" suggests --
// verified directly against each region's differential-matching adapter
// (2026-09-15, following the Shoulder/Hip/Ankle keyword-matching audit &
// fix). Cervical/Thoracic/Lumbar's own Phase 0.5 engines read almost their
// entire checklist by field id (confirmed by grep against
// orthoCervicalReasoning.js/orthoThoracicReasoning.js/orthoLumbarReasoning.js),
// so those three are starred wholesale rather than field-by-field. The
// others list only fields a real keyword/value match was verified against;
// anything left off (e.g. Knee's radiation/relieving/irritability/function,
// same class of gap Shoulder/Hip/Ankle had before this fix) is collected
// for the record but does not currently change the ranking -- said
// honestly rather than starred aspirationally.
// Ids trimmed out of SUBJECTIVE_REGION_FIELDS on 2026-09-29 were also
// dropped from these lists (a stale id here is harmless -- it just never
// matches a rendered field -- but there's no reason to keep dead entries).
const FULLY_WIRED_REGIONS = ["cervical", "thoracic", "lumbarSI"];
const MATCHING_RELEVANT_FIELDS = {
  shoulder: ["mechanism", "aggravating", "relieving", "pattern", "radiation", "redFlags"],
  hip: ["location", "locationPattern", "mechanism", "aggravating", "pattern", "mechanical", "redFlags"],
  knee: ["location", "mechanism", "givingWay", "locking", "pattern", "redFlags"],
  ankleFoot: ["location", "radiation", "mechanism", "aggravating", "pattern", "swelling", "redFlags"],
  elbowWristHand: ["location", "radiation", "mechanism", "aggravating", "pattern", "neuro", "redFlags"],
};
export function isMatchingRelevant(region, fieldId) {
  const key = contentKeyForRegion(region);
  if (!key) return false;
  if (FULLY_WIRED_REGIONS.includes(key)) return true;
  return (MATCHING_RELEVANT_FIELDS[key] || []).includes(fieldId);
}

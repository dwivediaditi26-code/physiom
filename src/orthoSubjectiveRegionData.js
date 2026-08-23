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
  cervical: [
    { id: "location", label: "Pain location", type: "multi", options: ["Suboccipital / base of skull", "Upper cervical", "Mid cervical", "Lower cervical", "Anterior neck", "Central posterior neck", "Lateral neck (left)", "Lateral neck (right)", "Cervico-thoracic junction", "Trapezius", "Levator scapulae"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Occiput", "Temple / forehead", "Jaw / TMJ", "Ear", "Top of shoulder", "Down arm to elbow", "Into hand / fingers", "Bilateral arms", "Between shoulder blades"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / no clear cause", "Whiplash (motor vehicle)", "Hyperflexion", "Hyperextension", "Combined flexion + rotation", "Direct trauma", "Sustained / poor posture", "Sleeping position", "Lifting", "Post-surgical"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Flexion", "Extension", "Rotation", "Side bending", "Looking up", "Prolonged desk work / driving", "Overhead reaching", "Cold draught"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Heat", "Ice", "Gentle movement", "Supportive pillow", "Massage", "Medication", "Position change"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlagsCord", label: "Red flags — cord / vascular screen", type: "multi", options: ["Bilateral hand clumsiness", "Gait disturbance / unsteadiness", "Unexplained falls", "Bilateral leg weakness", "New bladder / bowel change", "Dizziness with neck movement", "Double vision", "Slurred speech", "Difficulty swallowing", NONE_ABOVE] },
    { id: "redFlagsInstability", label: "Red flags — instability screen", type: "multi", options: ["Known rheumatoid arthritis", "Recent significant trauma", "Post cervical fusion", "Head feels unsupported / unstable", "Severe muscle guarding", "Sharp pain on flexion", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Driving", "Computer / desk work", "Sleeping", "Carrying bags", "Reversing car / looking over shoulder", "Household chores"] },
  ],
  thoracic: [
    { id: "location", label: "Pain location", type: "multi", options: ["Upper thoracic (T1–T4)", "Mid thoracic (T5–T8)", "Lower thoracic (T9–T12)", "Cervico-thoracic junction", "Thoracolumbar junction", "Central interscapular", "Costovertebral (rib) region", "Anterior chest wall", "Bilateral paraspinal"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Around ribcage (band-like)", "Anterior chest", "Radiating to arm — chest-pain-like (urgent flag)", "Between shoulder blades"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / postural", "Lifting", "Rotation injury", "Fall / trauma", "Prolonged desk posture", "Post-surgical", "Post-partum / breastfeeding posture", "Minimal trauma with known osteoporosis"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Rotation", "Side bending", "Extension", "Deep breathing", "Coughing / sneezing / laughing", "Prolonged sitting"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Heat", "Position change", "Gentle movement", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: ["Mechanical / movement-related", "Constant — unrelated to movement", "Breathing-related", "Worse at night"] },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Constant pain unaffected by position", "Progressive night pain", "Chest tightness / pain radiating to left arm or jaw", "Shortness of breath", "Fever or feeling unwell", "Unexplained weight loss", "Cancer history", "Known osteoporosis", "Neurological symptoms in the legs", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Desk work", "Breathing / deep breaths", "Lifting", "Sleeping", "Sport / exercise"] },
  ],
  lumbarSI: [
    { id: "location", label: "Pain location", type: "multi", options: ["Upper lumbar", "Mid lumbar", "Lower lumbar", "Lumbosacral", "Central", "Paraspinal (left)", "Paraspinal (right)", "SI joint (left)", "SI joint (right)", "Buttock", "Coccyx"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Groin", "Buttock", "Posterior thigh", "Anterior thigh", "Lateral leg", "Below the knee", "Into the foot", "Bilateral legs"] },
    { id: "belowKnee", label: "Radiation below the knee?", type: "single", options: ["No", "Yes — one side", "Yes — both sides"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious", "Lifting (flexed / rotated)", "Bending forward", "Twisting", "Sudden load (cough / sneeze)", "Fall", "Motor vehicle accident", "Post-partum"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Forward bending", "Prolonged sitting", "Prolonged standing", "Walking", "Extension / arching back", "First thing in the morning"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Lying down", "Change of position", "Walking", "Leaning forward (e.g. on a trolley)", "Heat"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlagsCauda", label: "Red flags — cauda equina screen (urgent)", type: "multi", options: ["New bilateral leg weakness", "Saddle numbness", "New bladder retention or incontinence", "New bowel incontinence", "New sexual dysfunction", "Rapidly progressive symptoms", NONE_ABOVE] },
    { id: "redFlagsSerious", label: "Red flags — other serious pathology", type: "multi", options: ["Constant pain unaffected by position", "Progressive night pain", "Unexplained weight loss", "Cancer history", "Fever / feeling unwell", "Recent significant trauma", "Known osteoporosis + minor trauma", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Sitting tolerance", "Standing tolerance", "Walking distance", "Lifting", "Household chores", "Work duties"] },
  ],
  shoulder: [
    { id: "location", label: "Pain location", type: "multi", options: ["Anterior shoulder", "Lateral shoulder (deltoid)", "Posterior shoulder", "AC joint", "Bicipital groove", "Subacromial", "Scapular border", "Upper arm"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Down to elbow", "Down to hand (consider cervical origin)", "Up to neck", "Between shoulder blades"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Fall onto shoulder / outstretched hand", "Direct blow", "Forced overhead / rotation movement", "Repetitive overhead activity", "Throwing / racquet sport", "Lifting overhead", "Post-surgical", "Age-related / degenerative"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Overhead reaching", "Reaching behind back", "Reaching across the body", "Lying on the shoulder", "Lifting", "Painful arc (mid-range)"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Supportive positioning", "Ice / heat", "Medication", "Avoiding overhead activity"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "stiffness", label: "Stiffness pattern", type: "multi", options: ["No significant stiffness", "Mild — end-range only", "Progressive stiffness in all directions (frozen shoulder pattern)", "Worse in the morning"] },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Suspected fracture (recent fall / trauma)", "Cannot lift arm at all after trauma", "Constant progressive pain unrelated to movement", "Night pain unrelated to position", "Palpable mass", "Redness / warmth / swelling (possible infection)", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Overhead activities", "Reaching behind back", "Dressing", "Carrying / lifting", "Sleeping on that side", "Work / sport demands"] },
  ],
  elbowWristHand: [
    { id: "location", label: "Pain location", type: "multi", options: ["Lateral elbow", "Medial elbow", "Posterior elbow", "Anterior elbow", "Forearm", "Dorsal wrist", "Volar (palm-side) wrist", "Radial wrist / thumb side", "Ulnar wrist", "Thumb", "Fingers", "Palm"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Into the fingers", "Up the forearm", "Numbness / tingling — thumb, index, middle finger (median nerve pattern)", "Numbness / tingling — ring and little finger (ulnar nerve pattern)"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Fall onto outstretched hand", "Repetitive gripping / lifting", "Racquet sport (lateral elbow)", "Golf / throwing (medial elbow)", "Repetitive thumb use (e.g. new parent lifting baby)", "Direct trauma", "Vibration exposure"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Gripping", "Lifting", "Wrist extension against resistance", "Wrist flexion against resistance", "Thumb movements", "Repetitive typing / mouse use", "Sustained grip"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Splint / brace", "Ice", "Activity modification", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "neuro", label: "Neurological symptoms", type: "multi", options: ["None", "Numbness / tingling — night-dominant (carpal tunnel pattern)", "Numbness / tingling — worse with elbow flexion (cubital tunnel pattern)", "Weakness in grip", "Dropping objects", "Wasting of hand muscles"] },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Suspected fracture (fall / trauma + deformity)", "Snuffbox tenderness after a fall (possible scaphoid fracture)", "Sudden inability to extend a finger (tendon rupture)", "Rapidly increasing swelling / severe pain (compartment syndrome)", "Hot / red / swollen joint", "Bilateral symptoms (systemic screen)", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Gripping / carrying", "Typing / writing", "Fine motor tasks", "Lifting", "Sport / work demands"] },
  ],
  hip: [
    { id: "location", label: "Pain location", type: "multi", options: ["Anterior groin", "Anterior hip / hip flexor region", "Lateral hip (greater trochanter)", "Posterior hip / deep buttock", "Ischial tuberosity", "Adductor / inner thigh", "Pubic symphysis", "SI joint"] },
    { id: "locationPattern", label: "Dominant pattern", type: "single", options: ["Groin-dominant", "Lateral hip-dominant", "Posterior / buttock-dominant", "Adductor-dominant", "Diffuse / mixed"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Twisting / pivoting", "Fall", "Sprint / kicking", "Sudden lunge", "Return to sport after time off", "Post-partum", "Post hip replacement", "Age-related / degenerative"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Combined flexion + rotation", "Sitting cross-legged", "Prolonged sitting", "Walking", "Stairs", "Getting out of a car"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Position change", "Heat", "Medication", "Reduced impact activity"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "mechanical", label: "Mechanical symptoms", type: "multi", options: ["None", "Clicking (painless)", "Clicking with pain", "Catching", "Giving way", "Locking", "Grinding / crepitus"] },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Suspected fracture (elderly + fall, cannot weight bear)", "Acute hot swollen hip", "Constant progressive pain unrelated to loading", "Possible referred pain from abdomen / pelvis", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Walking tolerance", "Stairs", "Getting up from low chairs", "Sport / running", "Sitting tolerance"] },
  ],
  knee: [
    { id: "location", label: "Pain location", type: "multi", options: ["Anterior / diffuse", "Around the kneecap", "Below the kneecap (patellar tendon)", "Above the kneecap (quad tendon)", "Medial joint line", "Lateral joint line", "Behind the knee (popliteal)", "Below the joint line (tibial tuberosity)", "Diffuse"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Referred from the hip", "Referred from the lower back", "Down the shin"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Non-contact twisting", "Direct blow", "Hyperextension", "Landing from a jump", "Pivoting / cutting movement", "Post-surgical"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["Stairs (up)", "Stairs (down)", "Squatting", "Prolonged sitting (\"movie sign\")", "Running", "Twisting / pivoting"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Ice", "Elevation", "Support / brace", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "givingWay", label: "Giving way?", type: "single", options: ["No", "Yes — with pivoting / twisting", "Yes — on stairs", "Yes — unpredictable / no clear trigger"] },
    { id: "locking", label: "Locking?", type: "single", options: ["No", "Yes — true mechanical locking", "Yes — momentary / pseudo-locking"] },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Unable to bear weight for 4 steps", "Immediate marked swelling after injury (possible haemarthrosis)", "Locked knee that won't straighten", "Hot red severely tender joint", "Cancer history", NONE_ABOVE] },
    { id: "function", label: "Functional limitations", type: "multi", options: ["Stairs", "Squatting / kneeling", "Running", "Walking distance", "Sport participation"] },
  ],
  ankleFoot: [
    { id: "location", label: "Pain location", type: "multi", options: ["Lateral ankle ligaments", "Medial ankle ligaments", "Achilles insertion", "Achilles mid-portion", "Plantar heel / arch", "1st big toe joint", "Forefoot / metatarsals", "Between the toes", "Top of the foot", "Shin"] },
    { id: "radiation", label: "Radiation", type: "multi", options: ["No radiation", "Referred from the lower back", "Burning between the toes", "Into the sole of the foot"] },
    { id: "mechanism", label: "Mechanism of injury", type: "multi", options: ["Insidious / overuse", "Inversion (rolled inward)", "Eversion (rolled outward)", "Direct impact", "Landing from a jump", "Change in footwear / surface", "Sudden increase in training"] },
    { id: "aggravating", label: "Aggravating movement", type: "multi", options: ["First steps in the morning", "Walking / running", "Downhill running", "Stairs", "Barefoot on a hard floor", "Tight / narrow footwear"] },
    { id: "relieving", label: "Relieving factor", type: "multi", options: ["Rest", "Ice", "Supportive footwear", "Stretching", "Taping / brace", "Medication"] },
    { id: "pattern", label: "24-hour pattern", type: "single", options: PATTERN_OPTIONS },
    { id: "swelling", label: "Swelling", type: "single", options: ["None", "Mild", "Moderate", "Severe"] },
    { id: "irritability", label: "Irritability", type: "single", options: IRRITABILITY_OPTIONS },
    { id: "redFlags", label: "Red flags", type: "multi", options: ["Unable to bear weight for 4 steps", "Bone tenderness at the ankle malleolus", "Suspected Achilles rupture (unable to rise on toes)", "Hot red severely tender joint", NONE_ABOVE] },
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

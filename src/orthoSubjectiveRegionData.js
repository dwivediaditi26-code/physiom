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
    // Real, structured Lumbar/SI checklist — ported field-for-field (same
    // option wording) from the older Ortho flow's Phase 0.5 Lumbar Reasoning
    // Engine screen (sharedClinicalData.js lx_* fields), so the differential
    // matcher in orthoLumbarReasoning.js gets the same real evidence that
    // engine was built and tuned against, not a shallower reinterpretation.
    { id: "location", label: "Primary pain location", type: "multi", options: ["Upper lumbar (L1-L2)", "Mid lumbar (L3)", "Lower lumbar (L4-L5)", "Lumbosacral junction (L5-S1)", "Central / midline", "Paraspinal right of midline", "Paraspinal left of midline", "Bilateral / band", "Sacrum (central)", "SI joint (L)", "SI joint (R)", "Bilateral SI joints", "Coccyx", "Buttock (L) — upper", "Buttock (L) — lower", "Buttock (R) — upper", "Buttock (R) — lower", "Ischial tuberosity (L)", "Ischial tuberosity (R)"] },
    { id: "radiation", label: "Radiation pattern", type: "multi", options: ["No radiation — local only", "Across lower back (belt distribution)", "Into groin (L)", "Into groin (R)", "To buttock (L)", "To buttock (R)", "To posterior thigh (L)", "To posterior thigh (R)", "To anterior thigh (L)", "To anterior thigh (R)", "To lateral thigh", "To knee (L)", "To knee (R)", "To calf (L)", "To calf (R)", "To lateral lower leg (L5)", "To medial lower leg (L4)", "To dorsum of foot (L5)", "To sole of foot (S1)", "To toes (L)", "To toes (R)", "Bilateral lower limb — concerning"] },
    { id: "dermatomal", label: "Dermatomal distribution", type: "multi", options: ["Not dermatomal", "L1 — groin / upper inner thigh", "L2 — anterior thigh", "L3 — medial thigh / medial knee", "L4 — medial lower leg / big toe", "L5 — lateral lower leg / dorsum foot / great toe", "S1 — posterior calf / lateral foot / sole", "S2 — posterior thigh", "S3-4 — saddle (perineum) — cauda equina flag", "Bilateral — cauda equina flag"] },
    { id: "belowKnee", label: "Does pain extend below the knee?", type: "single", options: ["No leg pain — back pain only", "Leg pain — thigh only / above knee", "Leg pain — below knee (radiculopathy threshold)", "Leg pain — extends to foot", "Leg pain — bilateral (cauda equina / stenosis flag)"] },
    { id: "mechanismType", label: "Mechanism type", type: "multi", options: ["No clear mechanism — insidious onset", "Lifting — spine flexed", "Lifting — spine rotated", "Lifting — spine flexed AND rotated (most common disc mechanism)", "Lifting — from floor (deadlift position)", "Twisting without lifting", "Bending forward without lifting", "Coughing / sneezing — onset", "Straining on toilet (Valsalva)", "Stumble / trip without full fall", "Fall onto back / buttocks", "Fall from height", "Motor vehicle accident", "Sport — specific (notes)", "Sustained poor posture over time", "Post-surgical", "Post-partum", "Post-illness", "No identified mechanism"] },
    { id: "mechanismLoad", label: "Load estimate at injury", type: "single", options: ["N/A — no trauma", "Body weight only", "Light (<10kg)", "Moderate (10–25kg)", "Heavy (25–50kg)", "Very heavy / awkward (>50kg)", "Repetitive load — accumulated", "Unknown"] },
    { id: "mechanismPosition", label: "Spine position at injury", type: "multi", options: ["Not applicable", "Flexed forward", "Extended backward", "Rotated left", "Rotated right", "Side bent", "Flexed + rotated (highest disc risk)", "Flexed + side bent", "Neutral — unexpected load", "Asymmetric / awkward"] },
    { id: "mechanismFirstSymptom", label: "First symptom timing", type: "single", options: ["Not applicable", "Immediate pain at moment of injury", "Immediate stiffness", "Within first hour", "Next morning — woke with it", "24–48 hours later", "Gradual development over days", "Progressive over weeks"] },
    { id: "spondyloScreen", label: "Spondylolysis / Spondylolisthesis indicators", type: "multi", options: ["Not applicable", "Young athlete (10–25 years) with low back pain", "Extension pain — worse arching backward", "Unilateral lower lumbar pain — pars stress", "Sport with repeated extension loading (gymnastics / cricket fast bowling / swimming butterfly / weightlifting)", "Single leg extension test reproduces pain (Stork test)", "No radiculopathy", "Bilateral L5 pars fracture — spondylolysis", "Forward slip of vertebra on x-ray — spondylolisthesis", "Hamstring tightness prominent feature", "Pain after growth spurt"] },
    { id: "aggPostures", label: "Postures aggravate", type: "multi", options: ["Sitting — any duration", "Sitting >15 minutes", "Sitting >30 minutes", "Sitting >1 hour", "Soft / unsupported seating", "Standing — any duration", "Standing >15 minutes", "Standing >30 minutes", "Lying supine (flat)", "Lying prone (face down)", "Lying on left side", "Lying on right side", "Driving (duration — specify in notes)", "Reading in bed", "Slumped / flexed posture", "Forward bent posture (e.g. over sink)", "Twisted / asymmetric posture"] },
    { id: "aggMovements", label: "Movements aggravate", type: "multi", options: ["Forward bending (flexion)", "Backward bending (extension)", "Side bend left", "Side bend right", "Rotation left", "Rotation right", "Combined flexion + rotation left", "Combined flexion + rotation right", "Combined extension + rotation (quadrant)", "Quick / sudden movements", "Repetitive bending", "End-range any direction", "Transitional movements (sit to stand etc)"] },
    { id: "aggActivities", label: "Activities aggravate", type: "multi", options: ["Coughing (discogenic indicator)", "Sneezing (discogenic indicator)", "Straining — toilet (Valsalva)", "Getting up from sitting", "Getting in / out of car", "Getting out of bed", "Turning over in bed", "Putting on shoes and socks", "Bending to floor", "Lifting any weight", "Lifting children", "Carrying shopping", "Pushing / pulling", "Vacuuming / mopping", "Gardening / weeding", "Walking — short distance", "Walking — extended duration", "Walking downhill (facet loading)", "Stairs — going up", "Stairs — going down", "Running", "Sport activities", "Sexual intercourse", "Standing from toilet", "Sitting on hard surface"] },
    { id: "aggOther", label: "Other aggravating factors", type: "multi", options: ["Cold / damp weather", "Barometric pressure change", "Stress / emotional state", "Fatigue / tiredness", "Poor sleep", "Menstrual cycle", "Pregnancy / post-partum", "Recent weight gain", "Specific footwear / hard floors", "Old / sagging mattress", "Morning stiffness first 30 steps", "Prolonged walking bilateral leg symptoms (stenosis)"] },
    { id: "relPostures", label: "Postures relieve", type: "multi", options: ["Lying flat (supine)", "Lying with knees bent (crook lying)", "Lying with pillow under knees", "Lying on side — knees together", "Lying on side — pillow between knees", "Lying prone (face down)", "Prone on elbows (extension load)", "Sitting with good lumbar support", "Sitting on firm chair", "Standing — weight shifted", "Walking slowly", "Hands and knees (flexion unloading)", "Leaning forward on trolley / counter (stenosis pattern)", "Sitting with legs elevated"] },
    { id: "relMovements", label: "Movements relieve", type: "multi", options: ["Extension — McKenzie press-up / cobra", "Flexion — knee to chest", "Rotation stretching", "Walking", "Specific directional preference (centralisation)", "Pelvic tilts", "Cat-cow / spinal mobility", "Self-traction (hanging from bar)", "Gentle exercise — general", "Swimming", "Cycling (if tolerated)", "Yoga / pilates", "Core stability exercises"] },
    { id: "relManual", label: "Manual / physical treatments", type: "multi", options: ["Heat — hot water bottle", "Heat — heat pad", "Hot bath / shower", "Ice / cold pack", "Massage — general", "Massage — deep tissue", "Spinal manipulation — significant relief", "Spinal mobilisation", "TENS machine", "Acupuncture / dry needling", "Lumbar support / brace", "Inversion table", "Epidural steroid injection (history)", "Hydrotherapy / pool therapy", "Specific physio exercises"] },
    { id: "relMedications", label: "Medications relieve", type: "multi", options: ["NSAIDs — very effective (inflammatory indicator)", "NSAIDs — moderately effective", "Paracetamol — effective", "Codeine / weak opioids — effective", "Strong opioids — effective", "Muscle relaxants — effective", "Neuropathic medication — effective (neural indicator)", "Cortisone injection — effective", "Cortisone injection — short-lived only", "No medication helps", "Not tried / not prescribed", "Medication helps but side effects problematic"] },
    { id: "directionalPreference", label: "Directional preference (McKenzie)", type: "single", options: ["Not assessed yet", "Extension preference — press-up centralises symptoms", "Flexion preference — knee-to-chest centralises", "Lateral shift correction needed", "No clear directional preference", "Peripheralises with extension", "Peripheralises with flexion", "Inconsistent response"] },
    { id: "overallPattern", label: "Overall symptom pattern", type: "multi", options: ["Constant — never goes away", "Constant — varies in intensity hour to hour", "Intermittent — clear triggers", "Intermittent — unpredictable", "Only with specific loading", "Only at rest / worse at rest", "Morning dominant", "Evening dominant — worse after day's activities", "Night dominant", "Activity-proportional (warms up then fades)", "Delayed onset — pain next day after activity", "Worse second half of night (AS inflammatory pattern)", "Unpredictable — no pattern (nociplastic flag)"] },
    { id: "morning", label: "Morning symptoms", type: "single", options: ["No morning symptoms", "Pain free on waking — comes on with activity", "Stiff only — eases within 10 min", "Stiff — eases within 30 min", "Stiff — takes 30–60 min to ease", "Stiff — takes >1 hour to ease (inflammatory flag)", "Painful on waking — stays painful all morning", "First 30 steps very painful then eases", "Worst on waking — most severe time of day"] },
    { id: "night", label: "Night symptoms", type: "multi", options: ["No night symptoms", "Difficulty finding comfortable position", "Pain on turning over in bed", "Gets up to walk (restlessness / inflammatory)", "Wakes once from pain", "Wakes 2–3 times from pain", "Wakes multiple times — >3", "Constant night pain — cannot sleep", "Leg pain at night — neural", "Bladder waking — note if changed since onset", "Severe night sweats accompanying pain (red flag)"] },
    { id: "pattern24hr", label: "24-hour pattern classification", type: "single", options: ["Mechanical — worse with load and posture, better with rest", "Inflammatory — worse at rest / morning stiffness >30 min / eases with movement", "Neuropathic — constant burning / shooting, worse at night", "Postural — sustained position dependent only", "Neurogenic claudication — walking provokes bilateral leg symptoms relieved by flexion", "No clear 24-hour pattern", "Unpredictable — no recognisable pattern"] },
    { id: "trajectory", label: "Symptom trajectory", type: "single", options: ["Improving steadily", "Improving slowly", "Plateau — no change", "Fluctuating — variable", "Slowly worsening", "Rapidly worsening", "Worsening despite treatment", "Changed in character recently (red flag)"] },
    { id: "irritability", label: "Irritability (Maitland SIN)", type: "single", options: ["Low — hard to provoke, settles quickly", "Moderate — provoked with sustained activity, settles reasonably", "High — easily provoked, slow to settle (hours)", "Very high — minimal provocation, prolonged aggravation (24hrs+)"] },
    { id: "neuroPresent", label: "Leg neurological symptoms?", type: "single", options: ["No leg neurological symptoms", "Yes — unilateral (L)", "Yes — unilateral (R)", "Yes — bilateral (cauda equina / stenosis flag)"] },
    { id: "neuroQuality", label: "Leg symptom quality", type: "multi", options: ["Not applicable", "Aching — diffuse", "Sharp — specific", "Burning — constant", "Shooting — intermittent", "Electric shock quality", "Tingling", "Pins and needles", "Numbness — objective", "Weakness — functional limitation", "Heaviness", "Cramping", "Cold sensation", "Hot sensation", "Hypersensitivity — light touch painful"] },
    { id: "neuroSigns", label: "Neurological signs reported", type: "multi", options: ["No neurological signs", "Numbness — specific dermatome", "Foot drop — difficulty clearing foot", "Heel walking difficult (L4/L5)", "Toe walking difficult (S1)", "Quad weakness — difficulty stairs", "Reduced or absent ankle reflex (S1)", "Reduced or absent knee reflex (L3/L4)", "Saddle area numbness (S3/S4) — cauda equina flag", "Bladder difficulty — retention — cauda flag", "Bladder incontinence — new onset — cauda flag", "Bowel incontinence — new onset — cauda flag", "Sexual dysfunction — new onset — cauda flag", "Bilateral lower limb involvement"] },
    { id: "claudication", label: "Walking / claudication pattern", type: "single", options: ["No claudication pattern", "Limited by back pain only", "Limited by unilateral leg pain", "Limited by bilateral leg pain / heaviness", "Relieved by sitting down", "Relieved by leaning forward / bending (neurogenic claudication — stenosis)", "Can walk further uphill than downhill (neurogenic)", "Distance consistent — relieved by rest (vascular pattern)"] },
    { id: "bladderBaseline", label: "Bladder / bowel baseline BEFORE pain started", type: "single", options: ["Normal bladder and bowel before pain onset", "Pre-existing bladder issues — specify in notes", "Pre-existing bowel issues — specify in notes", "Not asked — needs clarifying", "Uncertain"] },
    { id: "redFlagsCauda", label: "⚠ Cauda equina screen (urgent)", type: "multi", options: ["No cauda equina signs", "Bilateral leg weakness — new onset", "Saddle area anaesthesia — perineum / inner thighs", "Bladder retention — cannot urinate", "Bladder incontinence — new onset / unexpected", "Bowel incontinence — new onset / unexpected", "Reduced anal tone (if assessed)", "Sexual dysfunction — new onset", "Rapidly progressive bilateral neurological deficit", "Bilateral sciatica — new onset"] },
    { id: "redFlagsFracture", label: "Fracture risk indicators", type: "multi", options: ["No fracture indicators", "Major high-energy trauma", "Minor trauma + known osteoporosis", "Minor trauma + age >70", "Long-term corticosteroid use", "History of previous vertebral fracture", "Point bone tenderness on spinous process", "Severe unrelenting pain unaffected by position", "Post-menopausal woman + acute onset"] },
    { id: "redFlagsInflammatory", label: "Inflammatory / spondyloarthropathy indicators (ASAS)", type: "multi", options: ["No inflammatory features", "Age of onset <45", "Insidious onset over weeks-months", "Morning stiffness >30 minutes", "Stiffness improves with movement / exercise", "Worse with rest — restlessness at night", "Alternating buttock pain (R to L)", "Family history of AS / psoriasis / IBD / uveitis", "Psoriasis — personal history", "IBD (Crohn's / colitis) — personal history", "Uveitis / iritis — personal history", "Peripheral joint involvement", "NSAIDs very effective (ASAS criterion)", "HLA-B27 positive (known)", "Elevated ESR / CRP (known)"] },
    { id: "redFlagsSerious", label: "Other serious pathology indicators", type: "multi", options: ["No other red flags", "Constant pain — completely unaffected by position or movement", "Progressive night pain", "Thoracic pain accompanying lumbar pain", "Abdominal pain accompanying", "Pulsatile abdominal mass (AAA)", "Unexplained weight loss", "History of cancer — any", "IV drug use — risk of discitis", "Recent bacterial infection elsewhere", "Fever / systemically unwell with back pain", "Pain radiating to flank / loin (renal / ureteric)"] },
    { id: "yellowBeliefs", label: "Beliefs about low back pain", type: "multi", options: ["No unhelpful beliefs", "Believes pain = damage / structural harm", "Believes activity will cause serious harm", "Believes rest is the only effective treatment", "Believes this is serious / progressive disease", "Catastrophising — magnification", "Catastrophising — helplessness / hopelessness", "Catastrophising — rumination", "Negative expectation of recovery", "Believes will never return to previous function", "Received alarming / nocebo advice from clinician", "Conflicting diagnoses received", "Expects passive treatment only"] },
    { id: "yellowFear", label: "Fear-avoidance", type: "single", options: ["No fear-avoidance behaviour", "Mild — some avoidance of certain activities", "Moderate — significant avoidance affecting daily function", "Severe — markedly restricted / near housebound", "Tampa Scale elevated (if scored)", "Avoids all exercise due to fear"] },
    { id: "yellowEmotion", label: "Emotional / psychological factors", type: "multi", options: ["No emotional / psychological concerns", "Mild low mood", "Moderate depression", "Severe depression", "Mild anxiety", "Moderate anxiety", "Severe anxiety", "Anger — about injury / circumstances", "Grief / bereavement concurrent", "PTSD — current or history", "Excessive health anxiety", "Sleep significantly disrupted by psychological factors"] },
    { id: "yellowWork", label: "Work / compensation factors", type: "multi", options: ["No work-related yellow flags", "Job dissatisfaction prior to injury", "Conflict with employer / manager", "Believe job caused or worsened condition", "Fear of returning to same job", "Expect job loss", "Compensation claim active", "Personal injury litigation ongoing", "Solicitor engaged", "Financial stress — significant", "Employer pressure to return too early", "Employer unsupportive", "History of workplace bullying"] },
    { id: "yellowSocial", label: "Social factors", type: "multi", options: ["Adequate social support", "Social isolation", "Family overprotective — reinforcing disability", "Family dismissive / unsupportive", "Cultural / language barriers to care", "No social support network", "Relationship strain related to pain"] },
    { id: "yellowStartBack", label: "STarT Back Screening Tool result", type: "single", options: ["Not yet assessed", "Low risk (total 0–3)", "Medium risk (total ≥4, subscale <4)", "High risk (total ≥4, subscale ≥4)", "Referred for STarT-matched care"] },
    { id: "sittingTolerance", label: "Sitting tolerance", type: "single", options: ["No limitation", "Comfortable for >1 hour", "Comfortable for 30–60 min", "Comfortable for 15–30 min", "Comfortable for <15 min", "Cannot sit comfortably at all"] },
    { id: "standingTolerance", label: "Standing tolerance", type: "single", options: ["No limitation", "Comfortable for >1 hour", "Comfortable for 30–60 min", "Comfortable for 15–30 min", "Comfortable for <15 min", "Cannot stand comfortably"] },
    { id: "walkingTolerance", label: "Walking tolerance", type: "single", options: ["No walking limitation", "Walks unlimited distance", "Walks >1 km", "Walks 500m–1km", "Walks 100–500m", "Walks <100m", "Walks <50m", "Household ambulation only", "Walking aid required"] },
    { id: "adlRestrictions", label: "ADL restrictions", type: "multi", options: ["No ADL restrictions", "Putting on shoes and socks", "Bending to floor level", "Lifting children", "Lifting shopping / moderate loads", "Vacuuming / mopping / floor cleaning", "Bed mobility — turning over", "Getting out of bed", "Getting in / out of bath", "Driving", "Sexual activity", "Gardening", "Housework generally", "Childcare / parenting duties"] },
    { id: "workImpact", label: "Work impact", type: "single", options: ["No work impact", "Mild discomfort — full duties", "Modified duties", "Reduced hours", "Off work — short term (<4 weeks)", "Off work — medium term (4–12 weeks)", "Off work — long term (>12 weeks)", "Unemployed — job loss", "Unable to return to previous occupation"] },
    { id: "priorEpisodes", label: "Number of previous episodes", type: "single", options: ["First episode", "2–3 episodes", "4–6 episodes", "More than 6", "Continuous since onset"] },
    { id: "priorEpisodeOutcome", label: "Previous episode resolved by", type: "single", options: ["N/A — first episode", "Resolved fully on its own", "Physiotherapy helped", "Medication helped", "Injection helped", "Surgery helped", "Did not fully resolve", "Never fully resolved"] },
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

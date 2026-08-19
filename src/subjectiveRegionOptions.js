// Region-specific pick-list content for the simplified Subjective Assessment
// design (SubjectiveAssessmentNew.jsx). Standard, generic MSK subjective-
// history vocabulary (not proprietary/licensed content, unlike the outcome
// measure scales elsewhere in this app) -- common locations, mechanisms of
// injury, and aggravating/relieving factors per body region, capped at 10
// options per field per Aditi's request (2026-08-19: "purple triangle
// button show all list region specific list maximum of 10 options").
//
// Region ids match REGION_GROUPS in SubjectiveObjective.jsx (src/
// SubjectiveObjective.jsx ~line 4640) so this can line up with the real
// engine's region taxonomy later if/when this design gets wired to real
// data -- for now this file is only consumed by the standalone preview
// (SubjectiveAssessmentNew.jsx / SubjectiveCompare.jsx), nothing here
// touches Supabase or the real patient record.

export const REGIONS = [
  { id: "cervical", name: "Cervical Spine", icon: "🦴" },
  { id: "thoracic", name: "Thoracic Spine", icon: "🦴" },
  { id: "lumbar",   name: "Lumbar / SI",    icon: "🍑" },
  { id: "shoulder", name: "Shoulder",       icon: "💪" },
  { id: "elbow",    name: "Elbow",          icon: "💪" },
  { id: "wrist",    name: "Wrist / Hand",   icon: "✋" },
  { id: "hip",      name: "Hip / Groin",    icon: "🦵" },
  { id: "knee",     name: "Knee",           icon: "🦵" },
  { id: "ankle",    name: "Ankle / Foot",   icon: "🦶" },
  { id: "thorax",   name: "Thorax",         icon: "🫁" },
  { id: "ribs",     name: "Ribs",           icon: "🫁" },
  { id: "tmj",      name: "TMJ / Jaw",      icon: "😬" },
  { id: "head",     name: "Head / Face",    icon: "🧠" },
];

export const REGION_FIELD_OPTIONS = {
  cervical: {
    location: ["Central neck", "Left side of neck", "Right side of neck", "Base of skull", "Neck radiating to shoulder", "Neck radiating to arm", "Neck and upper back", "Across shoulders / trapezius", "Neck and headache", "Whole neck"],
    mechanism: ["Poor posture / desk work", "Whiplash (RTA)", "Sudden movement / turn", "Sleeping position", "Repetitive strain", "Sports injury", "Fall / trauma", "Insidious / unknown onset", "Post-surgical", "Prolonged phone/device use"],
    aggravating: ["Looking down (phone/desk)", "Turning head", "Prolonged sitting", "Driving", "Looking up", "Carrying bags", "Stress / tension", "End-of-day fatigue", "Sleeping position", "Overhead activity"],
    relieving: ["Rest", "Change of position", "Heat", "Gentle neck stretches", "Massage", "Over-the-counter pain relief", "Supportive pillow", "Avoiding prolonged postures", "Ice", "Posture correction"],
  },
  thoracic: {
    location: ["Central upper/mid back", "Left side of upper back", "Right side of upper back", "Between shoulder blades", "Thoracic radiating to ribs", "Upper back and neck", "Lower thoracic / mid back", "Around shoulder blade", "Across whole upper back", "Thoracic and chest wall"],
    mechanism: ["Poor posture / desk work", "Repetitive strain", "Sudden twist", "Lifting", "Sports injury", "Fall / trauma", "Insidious / unknown onset", "Post-surgical", "Prolonged sitting", "Heavy backpack / bag"],
    aggravating: ["Prolonged sitting", "Slouched posture", "Deep breathing", "Twisting / rotating", "Reaching overhead", "Carrying bags", "Prolonged standing", "End-of-day fatigue", "Lying on back", "Desk work"],
    relieving: ["Change of position", "Postural correction", "Heat", "Gentle stretching", "Rest", "Massage", "Over-the-counter pain relief", "Deep breathing exercises", "Walking", "Ergonomic adjustments"],
  },
  lumbar: {
    location: ["Central low back", "Left low back", "Right low back", "Across low back (bilateral)", "Sacroiliac (SI) joint", "Low back radiating to buttock", "Low back radiating to leg", "Low back and hip", "Coccyx / tailbone", "Low back and groin"],
    mechanism: ["Post-partum", "Lifting / bending", "Prolonged sitting", "Sudden twist", "Repetitive bending", "Fall / trauma", "Insidious / unknown onset", "Post-surgical", "Pregnancy-related", "Heavy manual work"],
    aggravating: ["Bending forward", "Prolonged sitting", "Prolonged standing", "Lifting", "Twisting / rotating", "Standing on one leg (e.g. dressing)", "Turning in bed", "Climbing stairs", "Coughing / sneezing", "First movements in the morning"],
    relieving: ["Lying down", "Change of position", "Walking", "Gentle stretching", "Heat", "Rest", "Sitting", "Lumbar support / pillow", "Over-the-counter pain relief", "Avoiding aggravating movement"],
  },
  shoulder: {
    location: ["Front of shoulder", "Side of shoulder (deltoid)", "Back of shoulder", "Top of shoulder / trapezius", "Shoulder radiating to arm", "Shoulder blade", "Deep inside shoulder joint", "Shoulder and neck", "Across whole shoulder", "Shoulder radiating to hand"],
    mechanism: ["Overhead activity / sport", "Fall onto arm/shoulder", "Repetitive strain", "Sudden lift or pull", "Sleeping on shoulder", "Sports injury", "Post-surgical", "Insidious / unknown onset", "Direct trauma / collision", "Heavy lifting"],
    aggravating: ["Overhead reaching", "Lying on affected side", "Lifting", "Reaching behind back", "Carrying weight in that arm", "Throwing / sports movement", "Putting on jacket/bra", "Driving", "Pushing / pulling", "Combing hair"],
    relieving: ["Rest", "Ice", "Supportive positioning", "Avoiding overhead movement", "Heat", "Gentle range-of-motion exercise", "Over-the-counter pain relief", "Sling / support", "Change of position", "Massage"],
  },
  elbow: {
    location: ["Outer elbow (lateral)", "Inner elbow (medial)", "Front of elbow", "Back of elbow (tip)", "Elbow radiating to forearm", "Elbow radiating to hand", "Whole elbow joint", "Elbow and wrist", "Deep inside joint", "Elbow and shoulder"],
    mechanism: ["Repetitive gripping / typing", "Racquet sport / overuse", "Fall onto outstretched hand", "Direct trauma / knock", "Heavy lifting", "Sudden pull / twist", "Insidious / unknown onset", "Post-surgical", "Manual / repetitive work", "Sports injury"],
    aggravating: ["Gripping / lifting objects", "Twisting motion (turning door handle)", "Typing / computer use", "Carrying bags", "Repetitive wrist/forearm movement", "Racquet sport / throwing", "Pushing / pulling", "Shaking hands", "Resting on elbow", "Lifting with straight arm"],
    relieving: ["Rest", "Ice", "Avoiding gripping activities", "Stretching forearm muscles", "Support brace/strap", "Over-the-counter pain relief", "Change of activity", "Massage", "Heat", "Reduced repetitive load"],
  },
  wrist: {
    location: ["Palm side of wrist", "Back of wrist", "Thumb side (radial)", "Little-finger side (ulnar)", "Base of thumb", "Whole hand", "Specific finger(s)", "Wrist radiating to forearm", "Both wrists", "Palm / grip area"],
    mechanism: ["Repetitive typing / computer use", "Fall onto outstretched hand", "Direct trauma / crush", "Repetitive gripping (manual work)", "Sudden twist / sprain", "Sports injury", "Post-surgical", "Insidious / unknown onset", "Pregnancy / postpartum (e.g. carrying baby)", "New/repetitive lifting activity"],
    aggravating: ["Typing / computer use", "Gripping objects", "Lifting with wrist bent", "Twisting jars/door handles", "Carrying baby / heavy bag", "Repetitive fine motor tasks", "Weight-bearing through hand (e.g. push-up)", "Phone use / texting", "Writing", "Cold weather"],
    relieving: ["Rest", "Splint / brace", "Ice", "Avoiding repetitive gripping", "Stretching", "Over-the-counter pain relief", "Change of activity", "Warm water / heat", "Elevation", "Ergonomic adjustments"],
  },
  hip: {
    location: ["Front of hip / groin", "Outer hip (lateral)", "Buttock / deep gluteal", "Hip radiating to thigh", "Hip radiating to knee", "Deep inside hip joint", "Groin only", "Hip and low back", "Across whole hip", "Hip radiating to groin"],
    mechanism: ["Post-partum", "Sports injury (kicking/running)", "Sudden twist / pivot", "Fall / trauma", "Repetitive strain (running/cycling)", "Insidious / unknown onset", "Post-surgical", "Prolonged sitting", "Degenerative / gradual onset", "Heavy lifting"],
    aggravating: ["Standing on one leg (dressing)", "Walking / prolonged walking", "Climbing stairs", "Getting up from sitting", "Crossing legs", "Lying on affected side", "Running / sport", "Turning in bed", "Prolonged sitting", "Getting in/out of car"],
    relieving: ["Rest", "Change of position", "Walking within comfort", "Heat", "Avoiding aggravating movement", "Over-the-counter pain relief", "Gentle stretching", "Supportive positioning (pillow between knees)", "Ice", "Reduced weight-bearing"],
  },
  knee: {
    location: ["Front of knee (anterior)", "Inner knee (medial)", "Outer knee (lateral)", "Back of knee (posterior)", "Under kneecap", "Whole knee joint", "Knee radiating to shin", "Knee and thigh", "Knee and hip", "Both knees"],
    mechanism: ["Twisting injury (pivoting)", "Direct trauma / fall", "Sports injury", "Overuse / running", "Sudden giving way", "Insidious / unknown onset", "Post-surgical", "Degenerative / gradual onset", "Repetitive squatting/kneeling", "Landing from a jump"],
    aggravating: ["Stairs (up or down)", "Squatting / kneeling", "Running", "Prolonged sitting (knees bent)", "Standing from sitting", "Twisting / pivoting", "Prolonged standing", "Walking on uneven ground", "Weight-bearing", "Impact activity (jumping)"],
    relieving: ["Rest", "Ice", "Elevation", "Avoiding weight-bearing", "Support brace", "Over-the-counter pain relief", "Gentle range-of-motion exercise", "Change of position", "Compression", "Reduced activity"],
  },
  ankle: {
    location: ["Outer ankle (lateral)", "Inner ankle (medial)", "Achilles / back of ankle", "Top of foot", "Sole of foot (plantar)", "Heel", "Toes", "Ankle radiating up calf", "Whole ankle joint", "Both feet"],
    mechanism: ["Inversion sprain (rolled ankle)", "Direct trauma / fall", "Sports injury", "Overuse / running", "Sudden step on uneven ground", "Insidious / unknown onset", "Post-surgical", "Repetitive impact (running/jumping)", "New/increased footwear or activity", "Degenerative / gradual onset"],
    aggravating: ["Walking on uneven ground", "First steps in the morning", "Running / impact activity", "Prolonged standing", "Stairs", "Walking barefoot", "Weight-bearing", "Push-off (heel raise)", "Prolonged walking", "Tight or unsupportive footwear"],
    relieving: ["Rest", "Ice", "Elevation", "Compression / support strap", "Supportive footwear", "Over-the-counter pain relief", "Avoiding weight-bearing", "Gentle stretching", "Reduced activity", "Change of surface"],
  },
  thorax: {
    location: ["Central chest wall", "Left side of ribcage", "Right side of ribcage", "Around one rib", "Chest and upper back", "Below the breastbone", "Along rib margin", "Chest wall with breathing", "Across whole ribcage", "Chest and shoulder"],
    mechanism: ["Direct trauma / fall", "Coughing / sneezing episode", "Repetitive strain", "Sudden twist", "Sports injury", "Post-surgical", "Insidious / unknown onset", "Heavy lifting", "Prolonged coughing illness", "Postural strain"],
    aggravating: ["Deep breathing", "Coughing / sneezing", "Twisting / rotating trunk", "Reaching overhead", "Lying on affected side", "Prolonged sitting", "Laughing", "Pressing on the area", "Carrying weight", "Movement of the trunk"],
    relieving: ["Rest", "Shallow / guarded breathing", "Change of position", "Heat", "Over-the-counter pain relief", "Supportive positioning", "Avoiding aggravating movement", "Gentle stretching", "Ice", "Time (settling gradually)"],
  },
  ribs: {
    location: ["One specific rib", "Front of ribcage", "Side of ribcage", "Back of ribcage", "Along rib margin", "Rib and chest wall", "Multiple ribs", "Rib and upper back", "Under the arm (lateral ribs)", "Rib and abdomen"],
    mechanism: ["Direct trauma / fall", "Coughing / sneezing episode", "Sports injury (impact)", "Repetitive strain (e.g. rowing/golf)", "Sudden twist", "Post-surgical", "Insidious / unknown onset", "Heavy lifting", "Prolonged forceful coughing", "Contact sport collision"],
    aggravating: ["Deep breathing", "Coughing / sneezing", "Twisting trunk", "Pressing on the rib", "Lying on affected side", "Reaching overhead", "Laughing", "Carrying weight", "Prolonged sitting", "Sudden movement"],
    relieving: ["Rest", "Shallow breathing", "Supportive positioning", "Heat", "Over-the-counter pain relief", "Avoiding aggravating movement", "Ice", "Change of position", "Gentle rib mobility exercise", "Time (settling gradually)"],
  },
  tmj: {
    location: ["Front of ear (jaw joint)", "One side of jaw", "Both sides of jaw", "Jaw radiating to temple", "Jaw radiating to ear", "Jaw and neck", "Cheek / masseter area", "Jaw with clicking/locking", "Whole jaw", "Jaw radiating to teeth"],
    mechanism: ["Teeth grinding / clenching (bruxism)", "Wide yawning", "Direct trauma to jaw", "Prolonged dental work", "Stress-related tension", "Repetitive gum chewing", "Insidious / unknown onset", "Post-surgical / post-dental", "Poor jaw/neck posture", "Malocclusion / bite issue"],
    aggravating: ["Chewing (especially hard food)", "Wide opening (yawning)", "Talking for long periods", "Stress / clenching", "Cold weather", "Waking up (morning)", "Prolonged jaw use", "Cold or hard foods", "Jaw clicking on movement", "Poor posture"],
    relieving: ["Rest / limiting jaw movement", "Soft food diet", "Heat", "Avoiding wide opening / gum", "Jaw relaxation exercises", "Over-the-counter pain relief", "Stress management", "Night guard (if prescribed)", "Gentle jaw stretches", "Massage of jaw muscles"],
  },
  head: {
    location: ["One-sided headache", "Both sides of head", "Front of head / forehead", "Back of head", "Temples", "Base of skull", "Behind the eyes", "Whole head", "Head radiating to neck", "Face / sinus area"],
    mechanism: ["Tension / stress-related", "Neck-related (cervicogenic)", "Migraine pattern", "Direct trauma / concussion", "Sleep disturbance", "Screen / posture related", "Insidious / unknown onset", "Sinus-related", "Dehydration / missed meals", "Post-surgical"],
    aggravating: ["Screen time / bright light", "Stress", "Poor posture", "Loud noise", "Neck movement", "Lack of sleep", "Dehydration / skipping meals", "Prolonged desk work", "Physical exertion", "Certain foods / triggers"],
    relieving: ["Rest in a dark, quiet room", "Hydration", "Over-the-counter pain relief", "Sleep", "Neck stretches / posture correction", "Reduced screen time", "Massage", "Cold compress", "Regular meals", "Stress management"],
  },
};

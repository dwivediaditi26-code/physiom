/* ============================================================
   orthoOutcomeMeasureData.js — condensed, original-wording
   outcome measures for the Outpatient pathway's suggest -> fill
   -> score -> save -> reassess flow (OrthoOutcomeMeasureFlow.jsx).

   Item wording/options below are written fresh for this app —
   not copied from any copyrighted instrument. Scale names (NDI,
   SPADI, Oxford Knee Score, etc.) are standard clinical
   terminology, used as labels only; the actual questions are our
   own condensed phrasing of the underlying clinical concept.
   ============================================================ */

const SEVERITY_5 = [
  { label: "No difficulty / no problem", value: 0 },
  { label: "Mild", value: 1 },
  { label: "Moderate", value: 2 },
  { label: "Severe", value: 3 },
  { label: "Unable / worst possible", value: 4 },
];

function sumScore(items) {
  return (answers) => {
    const vals = items.map((it) => answers[it.id]).filter((v) => v !== undefined && v !== "");
    if (vals.length < items.length) return null;
    return vals.reduce((a, b) => a + Number(b), 0);
  };
}

function interpretByBands(bands) {
  // bands: [{max, label, color}] ascending, evaluated against a 0-100 normalized percent
  return (pct) => {
    for (const b of bands) if (pct <= b.max) return { label: b.label, color: b.color };
    return bands[bands.length - 1];
  };
}

const DISABILITY_BANDS = interpretByBands([
  { max: 20, label: "Minimal disability", color: "#16A34A" },
  { max: 40, label: "Moderate disability", color: "#D97706" },
  { max: 60, label: "Severe disability", color: "#DC2626" },
  { max: 100, label: "Very severe / crippled", color: "#8A1F1F" },
]);

function pctInterpret(maxScore, bands) {
  return (score) => bands(Math.round((score / maxScore) * 100));
}

// Barthel: 0-20 total dependence, 21-60 severe, 61-90 moderate, 91-99 slight, 100 independent.
function barthelInterpret(score) {
  if (score <= 20) return { label: "Total dependence", color: "#8A1F1F" };
  if (score <= 60) return { label: "Severe dependence", color: "#DC2626" };
  if (score <= 90) return { label: "Moderate dependence", color: "#D97706" };
  if (score <= 99) return { label: "Slight dependence", color: "#65A30D" };
  return { label: "Independent", color: "#16A34A" };
}

// Braden: 19-23 no risk, 15-18 mild, 13-14 moderate, 10-12 high, 9 or less very high.
function bradenInterpret(score) {
  if (score >= 19) return { label: "No risk", color: "#16A34A" };
  if (score >= 15) return { label: "Mild risk", color: "#65A30D" };
  if (score >= 13) return { label: "Moderate risk", color: "#D97706" };
  if (score >= 10) return { label: "High risk", color: "#DC2626" };
  return { label: "Very high risk", color: "#8A1F1F" };
}

export const MEASURES = {
  ndi: {
    id: "ndi",
    label: "NDI",
    full: "Neck Disability Index",
    region: "cervical",
    icon: "🦴",
    maxScore: 40,
    unit: "/40",
    mcid: 5,
    items: [
      { id: "ndi_pain", prompt: "How would you rate your current neck pain?", options: SEVERITY_5 },
      { id: "ndi_personal", prompt: "How much does neck pain limit washing/dressing yourself?", options: SEVERITY_5 },
      { id: "ndi_lifting", prompt: "How much does neck pain limit lifting objects?", options: SEVERITY_5 },
      { id: "ndi_reading", prompt: "How much does neck pain limit reading?", options: SEVERITY_5 },
      { id: "ndi_headache", prompt: "How often do headaches accompany the neck pain?", options: SEVERITY_5 },
      { id: "ndi_concentration", prompt: "How much does neck pain limit concentration?", options: SEVERITY_5 },
      { id: "ndi_work", prompt: "How much does neck pain limit work capacity?", options: SEVERITY_5 },
      { id: "ndi_driving", prompt: "How much does neck pain limit driving?", options: SEVERITY_5 },
      { id: "ndi_sleep", prompt: "How much does neck pain disturb sleep?", options: SEVERITY_5 },
      { id: "ndi_recreation", prompt: "How much does neck pain limit recreational activities?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  lumbarDisability: {
    id: "lumbarDisability",
    label: "Lumbar Disability Index",
    full: "Lumbar Functional Disability Index",
    region: "lumbarSI",
    icon: "🦴",
    maxScore: 40,
    unit: "/40",
    mcid: 5,
    items: [
      { id: "ld_pain", prompt: "How would you rate your current low back pain?", options: SEVERITY_5 },
      { id: "ld_personal", prompt: "How much does back pain limit washing/dressing yourself?", options: SEVERITY_5 },
      { id: "ld_lifting", prompt: "How much does back pain limit lifting objects?", options: SEVERITY_5 },
      { id: "ld_walking", prompt: "How much does back pain limit walking distance?", options: SEVERITY_5 },
      { id: "ld_sitting", prompt: "How much does back pain limit sitting tolerance?", options: SEVERITY_5 },
      { id: "ld_standing", prompt: "How much does back pain limit standing tolerance?", options: SEVERITY_5 },
      { id: "ld_sleep", prompt: "How much does back pain disturb sleep?", options: SEVERITY_5 },
      { id: "ld_social", prompt: "How much does back pain limit social activities?", options: SEVERITY_5 },
      { id: "ld_travel", prompt: "How much does back pain limit travelling?", options: SEVERITY_5 },
      { id: "ld_work", prompt: "How much does back pain limit work / daily duties?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  spadi: {
    id: "spadi",
    label: "SPADI",
    full: "Shoulder Pain and Disability Index",
    region: "shoulder",
    icon: "🦴",
    maxScore: 32,
    unit: "/32",
    mcid: 4,
    items: [
      { id: "spadi_worst", prompt: "How severe is your shoulder pain at its worst?", options: SEVERITY_5 },
      { id: "spadi_lying", prompt: "How severe is the pain lying on the affected side?", options: SEVERITY_5 },
      { id: "spadi_reach_shelf", prompt: "How much difficulty reaching for a high shelf?", options: SEVERITY_5 },
      { id: "spadi_wash_back", prompt: "How much difficulty washing your back?", options: SEVERITY_5 },
      { id: "spadi_pull_shirt", prompt: "How much difficulty putting on a pullover/shirt overhead?", options: SEVERITY_5 },
      { id: "spadi_carry", prompt: "How much difficulty carrying a heavy object (~5kg)?", options: SEVERITY_5 },
      { id: "spadi_overhead", prompt: "How much difficulty with overhead work tasks?", options: SEVERITY_5 },
      { id: "spadi_comb", prompt: "How much difficulty combing your hair?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  oks: {
    id: "oks",
    label: "Oxford Knee Score",
    full: "Oxford Knee Score",
    region: "knee",
    icon: "🦵",
    maxScore: 48,
    unit: "/48",
    mcid: 5,
    items: [
      { id: "oks_pain", prompt: "How would you describe the pain you usually have from your knee?", options: SEVERITY_5 },
      { id: "oks_washing", prompt: "How much trouble washing/drying yourself because of your knee?", options: SEVERITY_5 },
      { id: "oks_transport", prompt: "How much trouble getting in/out of a car because of your knee?", options: SEVERITY_5 },
      { id: "oks_walking", prompt: "How much difficulty walking for 15 minutes?", options: SEVERITY_5 },
      { id: "oks_sitting", prompt: "How much difficulty getting up from a chair after sitting?", options: SEVERITY_5 },
      { id: "oks_limping", prompt: "How much do you limp when walking, because of your knee?", options: SEVERITY_5 },
      { id: "oks_kneeling", prompt: "How much difficulty kneeling down and getting up afterwards?", options: SEVERITY_5 },
      { id: "oks_night", prompt: "How much has the knee troubled you in bed at night?", options: SEVERITY_5 },
      { id: "oks_work", prompt: "How much has knee pain interfered with your usual work?", options: SEVERITY_5 },
      { id: "oks_giving_way", prompt: "How often has the knee given way/felt unstable?", options: SEVERITY_5 },
      { id: "oks_shopping", prompt: "How much difficulty with shopping/housework?", options: SEVERITY_5 },
      { id: "oks_stairs", prompt: "How much difficulty going down a flight of stairs?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  oxfordHip: {
    id: "oxfordHip",
    label: "Oxford Hip Score",
    full: "Oxford Hip Score",
    region: "hip",
    icon: "🦴",
    maxScore: 48,
    unit: "/48",
    mcid: 5,
    items: [
      { id: "ohs_pain", prompt: "How would you describe the pain you usually have from your hip?", options: SEVERITY_5 },
      { id: "ohs_washing", prompt: "How much trouble washing/drying yourself because of your hip?", options: SEVERITY_5 },
      { id: "ohs_transport", prompt: "How much trouble getting in/out of a car because of your hip?", options: SEVERITY_5 },
      { id: "ohs_socks", prompt: "How much difficulty putting on socks/stockings?", options: SEVERITY_5 },
      { id: "ohs_shopping", prompt: "How much difficulty with shopping/housework because of your hip?", options: SEVERITY_5 },
      { id: "ohs_walking", prompt: "How much pain walking for 15 minutes?", options: SEVERITY_5 },
      { id: "ohs_stairs", prompt: "How much difficulty going up/down a flight of stairs?", options: SEVERITY_5 },
      { id: "ohs_standing", prompt: "How much difficulty standing up after sitting in a chair?", options: SEVERITY_5 },
      { id: "ohs_limping", prompt: "How often do you limp when walking, because of your hip?", options: SEVERITY_5 },
      { id: "ohs_night", prompt: "How much has the hip troubled you in bed at night?", options: SEVERITY_5 },
      { id: "ohs_work", prompt: "How much has hip pain interfered with your usual work?", options: SEVERITY_5 },
      { id: "ohs_sudden", prompt: "Have you had sudden severe pain from the hip?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  quickDash: {
    id: "quickDash",
    label: "QuickDASH",
    full: "Quick Disabilities of the Arm, Shoulder and Hand",
    region: "elbowWristHand",
    icon: "✋",
    maxScore: 44,
    unit: "/44",
    mcid: 8,
    items: [
      { id: "qd_jar", prompt: "How much difficulty opening a tight/new jar?", options: SEVERITY_5 },
      { id: "qd_heavy", prompt: "How much difficulty doing heavy household chores?", options: SEVERITY_5 },
      { id: "qd_carry", prompt: "How much difficulty carrying a shopping bag/briefcase?", options: SEVERITY_5 },
      { id: "qd_wash_back", prompt: "How much difficulty washing your back?", options: SEVERITY_5 },
      { id: "qd_sharp", prompt: "How much difficulty using a knife to cut food?", options: SEVERITY_5 },
      { id: "qd_recreation", prompt: "How much difficulty with recreational activities needing some force/impact through the arm?", options: SEVERITY_5 },
      { id: "qd_sleep", prompt: "How much has arm/wrist/hand pain disturbed your sleep?", options: SEVERITY_5 },
      { id: "qd_severity", prompt: "How severe has the pain in your arm/shoulder/hand been?", options: SEVERITY_5 },
      { id: "qd_tingling", prompt: "How severe has tingling/numbness in the arm been?", options: SEVERITY_5 },
      { id: "qd_activity", prompt: "How much has the problem limited normal social activities?", options: SEVERITY_5 },
      { id: "qd_work", prompt: "How much has the problem limited your usual work/daily activities?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  faam: {
    id: "faam",
    label: "FAAM",
    full: "Foot and Ankle Ability Measure",
    region: "ankleFoot",
    icon: "🦶",
    maxScore: 32,
    unit: "/32",
    mcid: 5,
    items: [
      { id: "faam_standing", prompt: "How much difficulty standing, because of the ankle/foot?", options: SEVERITY_5 },
      { id: "faam_walk_flat", prompt: "How much difficulty walking on flat ground?", options: SEVERITY_5 },
      { id: "faam_walk_uneven", prompt: "How much difficulty walking on uneven ground?", options: SEVERITY_5 },
      { id: "faam_stairs_up", prompt: "How much difficulty going up stairs?", options: SEVERITY_5 },
      { id: "faam_stairs_down", prompt: "How much difficulty going down stairs?", options: SEVERITY_5 },
      { id: "faam_run", prompt: "How much difficulty running, if attempted?", options: SEVERITY_5 },
      { id: "faam_twist", prompt: "How much difficulty twisting/pivoting on the leg?", options: SEVERITY_5 },
      { id: "faam_activity", prompt: "How much has the ankle/foot limited your usual level of activity?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  lefs: {
    id: "lefs",
    label: "LEFS",
    full: "Lower Extremity Functional Scale",
    region: "general",
    icon: "🦵",
    maxScore: 32,
    unit: "/32",
    mcid: 9,
    items: [
      { id: "lefs_usual_work", prompt: "How much difficulty with your usual work/daily tasks?", options: SEVERITY_5 },
      { id: "lefs_walk", prompt: "How much difficulty walking a distance outdoors?", options: SEVERITY_5 },
      { id: "lefs_stairs", prompt: "How much difficulty going up/down stairs?", options: SEVERITY_5 },
      { id: "lefs_stand", prompt: "How much difficulty standing for an hour?", options: SEVERITY_5 },
      { id: "lefs_sit", prompt: "How much difficulty sitting for an hour?", options: SEVERITY_5 },
      { id: "lefs_squat", prompt: "How much difficulty squatting?", options: SEVERITY_5 },
      { id: "lefs_run", prompt: "How much difficulty running on even ground, if attempted?", options: SEVERITY_5 },
      { id: "lefs_recreation", prompt: "How much difficulty with recreational/sport activities?", options: SEVERITY_5 },
    ],
    score: null,
    interpret: null,
  },
  psfs: {
    id: "psfs",
    label: "PSFS",
    full: "Patient-Specific Functional Scale",
    region: "general",
    icon: "🎯",
    maxScore: 10,
    unit: "/10 (avg)",
    mcid: 2,
    isPsfs: true,
    items: [
      { id: "psfs_a1", prompt: "Name an activity the patient can no longer do, or is limited in, because of this problem. Rate current ability (0 = unable, 10 = normal).", isScale: true },
      { id: "psfs_a2", prompt: "Second activity (optional). Rate current ability (0 = unable, 10 = normal).", isScale: true, optional: true },
      { id: "psfs_a3", prompt: "Third activity (optional). Rate current ability (0 = unable, 10 = normal).", isScale: true, optional: true },
    ],
    score: null,
    interpret: null,
  },
  // ADL independence for inpatients. Standard Barthel Index structure (10
  // activities, 0-100, higher = more independent); item wording written fresh
  // for this app, scoring points and bands follow the published convention.
  barthel: {
    id: "barthel",
    label: "Barthel Index",
    full: "Barthel Index of Activities of Daily Living",
    region: "general",
    icon: "🛏️",
    maxScore: 100,
    unit: "/100",
    mcid: null,
    higherIsBetter: true,
    items: [
      { id: "bi_feeding", prompt: "Feeding", options: [{ label: "Unable to feed self", value: 0 }, { label: "Needs help, e.g. cutting food or spreading", value: 5 }, { label: "Independent, eats within a reasonable time", value: 10 }] },
      { id: "bi_bathing", prompt: "Bathing", options: [{ label: "Needs help", value: 0 }, { label: "Independent (bath or shower)", value: 5 }] },
      { id: "bi_grooming", prompt: "Grooming (face, hair, teeth, shaving)", options: [{ label: "Needs help", value: 0 }, { label: "Independent", value: 5 }] },
      { id: "bi_dressing", prompt: "Dressing", options: [{ label: "Dependent", value: 0 }, { label: "Needs some help, does about half unaided", value: 5 }, { label: "Independent, including fastenings and footwear", value: 10 }] },
      { id: "bi_bowels", prompt: "Bowels", options: [{ label: "Incontinent (or needs enemas)", value: 0 }, { label: "Occasional accident", value: 5 }, { label: "Continent", value: 10 }] },
      { id: "bi_bladder", prompt: "Bladder", options: [{ label: "Incontinent, or catheter the patient cannot manage alone", value: 0 }, { label: "Occasional accident", value: 5 }, { label: "Continent, or manages a catheter independently", value: 10 }] },
      { id: "bi_toilet", prompt: "Toilet use", options: [{ label: "Dependent", value: 0 }, { label: "Needs some help, manages part alone", value: 5 }, { label: "Independent (on/off, clothing, hygiene)", value: 10 }] },
      { id: "bi_transfer", prompt: "Transfer, bed to chair and back", options: [{ label: "Unable, no sitting balance", value: 0 }, { label: "Major help from one or two people, can sit", value: 5 }, { label: "Minor help, verbal or physical", value: 10 }, { label: "Independent", value: 15 }] },
      { id: "bi_mobility", prompt: "Mobility on level ground", options: [{ label: "Immobile, or cannot walk 50 m", value: 0 }, { label: "Independent in a wheelchair for 50 m, including corners", value: 5 }, { label: "Walks 50 m with help from one person", value: 10 }, { label: "Independent for 50 m (walking aid allowed)", value: 15 }] },
      { id: "bi_stairs", prompt: "Stairs", options: [{ label: "Unable", value: 0 }, { label: "Needs help (verbal, physical or carrying an aid)", value: 5 }, { label: "Independent up and down", value: 10 }] },
    ],
    score: null,
    interpret: null,
    custom: true,
  },
  // Pressure-injury risk (Braden-style, 6 subscales, 6-23, LOWER = higher
  // risk). Wording written fresh; ranges and risk bands follow the standard.
  braden: {
    id: "braden",
    label: "Braden Scale",
    full: "Pressure injury risk (Braden)",
    region: "general",
    icon: "🩹",
    maxScore: 23,
    unit: "/23",
    mcid: null,
    higherIsBetter: true,
    items: [
      { id: "br_sensory", prompt: "Sensory perception (ability to respond to pressure discomfort)", options: [{ label: "Completely limited — no response or cannot feel over most of the body", value: 1 }, { label: "Very limited — responds only to painful stimuli", value: 2 }, { label: "Slightly limited — responds to commands but cannot always say they are uncomfortable", value: 3 }, { label: "No impairment", value: 4 }] },
      { id: "br_moisture", prompt: "Moisture (skin exposed to moisture)", options: [{ label: "Constantly moist", value: 1 }, { label: "Very moist — linen changed at least every shift", value: 2 }, { label: "Occasionally moist — extra linen change about daily", value: 3 }, { label: "Rarely moist", value: 4 }] },
      { id: "br_activity", prompt: "Activity", options: [{ label: "Bedfast", value: 1 }, { label: "Chairfast — cannot bear own weight, needs help into chair", value: 2 }, { label: "Walks occasionally, short distances", value: 3 }, { label: "Walks frequently", value: 4 }] },
      { id: "br_mobility", prompt: "Mobility (ability to change and control body position)", options: [{ label: "Completely immobile", value: 1 }, { label: "Very limited — only slight position changes", value: 2 }, { label: "Slightly limited — makes frequent small changes", value: 3 }, { label: "No limitation", value: 4 }] },
      { id: "br_nutrition", prompt: "Nutrition (usual food intake)", options: [{ label: "Very poor — eats less than a third of meals", value: 1 }, { label: "Probably inadequate — about half of meals", value: 2 }, { label: "Adequate — eats most meals", value: 3 }, { label: "Excellent — eats nearly all meals", value: 4 }] },
      { id: "br_friction", prompt: "Friction and shear", options: [{ label: "Problem — needs moderate to maximum help to move, slides down in bed or chair", value: 1 }, { label: "Potential problem — moves feebly or needs minimum help", value: 2 }, { label: "No apparent problem — moves independently", value: 3 }] },
    ],
    score: null,
    interpret: null,
    custom: true,
  },
};

// Wire score/interpret after object literal so functions can reference each measure's own item list cleanly.
Object.values(MEASURES).forEach((m) => {
  if (m.custom) {
    m.score = sumScore(m.items);
    m.interpret = m.id === "barthel" ? barthelInterpret : bradenInterpret;
  } else if (m.isPsfs) {
    m.score = (answers) => {
      const vals = m.items.map((it) => answers[it.id]).filter((v) => v !== undefined && v !== "" && v !== null);
      if (!vals.length) return null;
      return Math.round((vals.reduce((a, b) => a + Number(b), 0) / vals.length) * 10) / 10;
    };
    m.interpret = (score) => (score === null ? { label: "—", color: "#9C9CAE" } : score >= 7 ? { label: "Good function", color: "#16A34A" } : score >= 4 ? { label: "Moderate limitation", color: "#D97706" } : { label: "Severe limitation", color: "#DC2626" });
  } else {
    m.score = sumScore(m.items);
    m.interpret = pctInterpret(m.maxScore, DISABILITY_BANDS);
  }
});

/* Suggest measures for the picked regions/condition — primary region match
   first (Recommended), PSFS always offered (Other suitable, any region),
   LEFS offered for any lower-limb region. */
const LOWER_LIMB_CLUSTERS = ["hip", "knee", "ankleFoot", "lumbarSI"];

export function suggestMeasures({ selectedRegions = [], contentKeyForRegion, extraRecommended = [] } = {}) {
  const clusters = selectedRegions.map((r) => (contentKeyForRegion ? contentKeyForRegion(r) : null)).filter(Boolean);
  const recommended = [];
  const seen = new Set();
  function addRecommended(id, reason) {
    if (seen.has(id)) return;
    seen.add(id);
    recommended.push({ id, reason });
  }
  Object.values(MEASURES).forEach((m) => {
    if (m.region !== "general" && clusters.includes(m.region)) {
      addRecommended(m.id, `Matches the selected region (${m.label} is a standard measure for this area).`);
    }
  });

  // Pathway-level suggestions (e.g. the inpatient pathway recommends Barthel
  // for every patient and Braden for immobile ones) -- region-independent.
  extraRecommended.forEach((e) => { if (MEASURES[e.id]) addRecommended(e.id, e.reason); });

  const otherSuitable = [];
  const seenOther = new Set([...seen]);
  function addOther(id, reason) {
    if (seenOther.has(id)) return;
    seenOther.add(id);
    otherSuitable.push({ id, reason });
  }
  if (clusters.some((c) => LOWER_LIMB_CLUSTERS.includes(c))) addOther("lefs", "General lower-extremity function measure, useful alongside a region-specific score.");
  addOther("psfs", "Lets the patient rate their own most affected activities — useful for any region or condition.");

  return { recommended, otherSuitable };
}

/* Display label per region/category — used to group the outcome measure
   list the same way the reference app groups its scale library by
   category (region name header, small count pill, always-visible list —
   no separate region-filter control). */
export const REGION_GROUP_LABELS = {
  cervical: "Cervical",
  thoracic: "Thoracic",
  lumbarSI: "Lumbar / SI",
  shoulder: "Shoulder",
  elbowWristHand: "Elbow / Wrist / Hand",
  hip: "Hip",
  knee: "Knee",
  ankleFoot: "Ankle / Foot",
  general: "General",
};

/* Maps a condition's free-text instrument name (shoulderConditions.json etc.,
   e.g. "SPADI or DASH/QuickDASH", "Oxford Hip Score or HOOS") to a MEASURES
   id that has a guided digital form -- so ConditionObjectiveAssessment.jsx's
   Outcome Measures card can offer "Fill guided form" for scales we actually
   have items for, falling back to the old free-text box for the rest (e.g.
   Constant-Murley, WOSI, PRTEE -- not yet digitized). Checks each "or"/"/"
   separated token against known aliases, first match wins. */
const INSTRUMENT_ALIASES = {
  spadi: ["spadi"],
  quickDash: ["quickdash", "dash"],
  oks: ["oxford knee score", "oxford knee"],
  oxfordHip: ["oxford hip score", "oxford hip"],
  faam: ["faam"],
  lefs: ["lefs"],
  psfs: ["psfs"],
  ndi: ["neck disability index", "ndi"],
  lumbarDisability: ["oswestry disability index", "odi", "roland-morris", "rmdq"],
  barthel: ["barthel"],
  braden: ["braden"],
};

export function matchMeasureIdForInstrument(label) {
  if (!label) return null;
  const tokens = String(label).toLowerCase().split(/\s+or\s+|\//).map((t) => t.trim());
  for (const token of tokens) {
    for (const [id, aliases] of Object.entries(INSTRUMENT_ALIASES)) {
      if (aliases.some((a) => token.includes(a))) return id;
    }
  }
  return null;
}

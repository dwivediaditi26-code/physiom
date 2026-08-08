// ortho-cases.fixtures.ts — 10 complete, SYNTHETIC orthopedic test cases.
//
// These are NOT real patients. Names/DOBs are fabricated; the clinical
// findings are textbook-realistic so the automated suite exercises the same
// code paths a real assessment would, with zero PHI exposure.
//
// Consumed by ortho-cases.spec.ts. Each case describes the full therapist
// workflow: Subjective -> Review -> Objective (ROM / MMT / Special tests) ->
// Clinical Impression -> Save.
//
// NOTES on how values map to the app's real UI:
//  - MMT: the app only offers COARSE grades (5/5, 4/5, 3/5, 2/5, 1/5, 0/5).
//    Textbook "4-/5" / "3+/5" therefore map to the nearest whole grade. The
//    `grade` field below is already the coarse option string the <select>
//    actually contains ("4/5 Good" etc.).
//  - ROM: entered as a number of degrees into the movement card's "°" input.
//  - Special tests: `result` is "Positive"/"Negative"; the helper picks the
//    matching option from that test card's dropdown by substring.

export type Side = "Right" | "Left" | "Bilateral";

export interface RomFinding {
  movement: string; side?: Side; degrees?: string; note?: string;
}
export interface MmtFinding {
  muscle: string; side?: Side; grade: string;
}
export interface SpecialFinding {
  test: string; result: "Positive" | "Negative";
}
export interface OrthoCase {
  id: string;
  diagnosis: string;
  age: number;
  gender: "Male" | "Female";
  region: { group: string; name: string };
  chiefComplaint: string;
  subjectiveNotes: string[];
  observation: string[];
  rom: RomFinding[];
  mmt: MmtFinding[];
  special: SpecialFinding[];
  expectImpression: RegExp;
}

const SPINE = "Spine";
const UPPER = "Upper limb";
const LOWER = "Lower limb";

export const ORTHO_CASES: OrthoCase[] = [
  {
    id: "adhesive-capsulitis", diagnosis: "Adhesive Capsulitis",
    age: 52, gender: "Male", region: { group: UPPER, name: "Shoulder" },
    chiefComplaint: "E2ECASE1 right shoulder pain 5 months gradual onset night pain",
    subjectiveNotes: ["Difficulty combing hair","Difficulty wearing shirt","Unable to reach behind back","Night pain","Pain 7/10","Diabetic"],
    observation: ["Protective posture","Shoulder held close to body","Mild deltoid wasting"],
    rom: [
      { movement: "Flexion", side: "Right", degrees: "110" },
      { movement: "Flexion", side: "Left", degrees: "180" },
      { movement: "Abduction", side: "Right", degrees: "85" },
      { movement: "Abduction", side: "Left", degrees: "180" },
      { movement: "External Rotation", side: "Right", degrees: "20" },
      { movement: "External Rotation", side: "Left", degrees: "90" },
      { movement: "Internal Rotation", side: "Right", note: "IR to L5 (vs T8 left)" },
    ],
    mmt: [
      { muscle: "Flexion", side: "Right", grade: "4/5 Good" },
      { muscle: "Abduction", side: "Right", grade: "4/5 Good" },
      { muscle: "External Rotation", side: "Right", grade: "4/5 Good" },
      { muscle: "Internal Rotation", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Neer", result: "Positive" },
      { test: "Hawkins", result: "Positive" },
      { test: "Apley", result: "Positive" },
      { test: "Painful Arc", result: "Negative" },
    ],
    expectImpression: /capsulitis|frozen|capsular|shoulder/i,
  },
  {
    id: "acl-tear", diagnosis: "ACL Tear",
    age: 24, gender: "Male", region: { group: LOWER, name: "Knee" },
    chiefComplaint: "E2ECASE2 football injury pop sound immediate swelling instability pain 8/10",
    subjectiveNotes: ["Football injury","Pop sound","Immediate swelling","Instability","Pain 8/10"],
    observation: ["Large knee effusion","Antalgic gait"],
    rom: [
      { movement: "Flexion", side: "Right", degrees: "90" },
      { movement: "Extension", side: "Right", degrees: "-10" },
    ],
    mmt: [
      { muscle: "Quadriceps", side: "Right", grade: "3/5 Fair" },
      { muscle: "Hamstrings", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Lachman", result: "Positive" },
      { test: "Anterior Drawer", result: "Positive" },
      { test: "Pivot Shift", result: "Positive" },
      { test: "Posterior Drawer", result: "Negative" },
      { test: "Valgus", result: "Negative" },
      { test: "Varus", result: "Negative" },
    ],
    expectImpression: /acl|cruciate|instability|knee/i,
  },
  {
    id: "knee-oa", diagnosis: "Knee Osteoarthritis",
    age: 61, gender: "Female", region: { group: LOWER, name: "Knee" },
    chiefComplaint: "E2ECASE3 knee pain 3 years stairs painful morning stiffness 15 min crepitus",
    subjectiveNotes: ["Pain for 3 years","Stairs painful","Morning stiffness 15 min","Crepitus"],
    observation: ["Varus knee","Mild swelling"],
    rom: [
      { movement: "Flexion", side: "Right", degrees: "105" },
      { movement: "Extension", side: "Right", degrees: "-5" },
    ],
    mmt: [
      { muscle: "Quadriceps", side: "Right", grade: "4/5 Good" },
      { muscle: "Hamstrings", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Patellar Grind", result: "Positive" },
      { test: "McMurray", result: "Negative" },
      { test: "Lachman", result: "Negative" },
    ],
    expectImpression: /osteoarthritis|oa|degenerat|knee/i,
  },
  {
    id: "cervical-radiculopathy", diagnosis: "Cervical Radiculopathy",
    age: 38, gender: "Female", region: { group: SPINE, name: "Cervical spine" },
    chiefComplaint: "E2ECASE4 neck pain radiates to thumb tingling computer worker",
    subjectiveNotes: ["Neck pain","Radiates to thumb","Tingling","Computer worker"],
    observation: ["Forward head posture"],
    rom: [
      { movement: "Flexion", degrees: "45" },
      { movement: "Extension", degrees: "30" },
      { movement: "Rotation", side: "Right", degrees: "50" },
      { movement: "Rotation", side: "Left", degrees: "75" },
    ],
    mmt: [
      { muscle: "Biceps", side: "Right", grade: "4/5 Good" },
      { muscle: "Grip", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Spurling", result: "Positive" },
      { test: "Distraction", result: "Positive" },
      { test: "Upper Limb Tension", result: "Positive" },
    ],
    expectImpression: /radiculopath|cervical|nerve root|c6/i,
  },
  {
    id: "lumbar-disc-herniation", diagnosis: "Lumbar Disc Herniation",
    age: 29, gender: "Male", region: { group: SPINE, name: "Lumbar / SI" },
    chiefComplaint: "E2ECASE5 low back pain after lifting pain into calf cough increases pain",
    subjectiveNotes: ["Low back pain after lifting","Pain into calf","Cough increases pain"],
    observation: ["Reduced lumbar lordosis"],
    rom: [
      { movement: "Flexion", degrees: "30" },
      { movement: "Extension", degrees: "15" },
      { movement: "Side Flexion", side: "Left", degrees: "15" },
    ],
    mmt: [
      { muscle: "Core", side: "Bilateral", grade: "3/5 Fair" },
    ],
    special: [
      { test: "Straight Leg Raise", result: "Positive" },
      { test: "Slump", result: "Positive" },
      { test: "Crossed", result: "Positive" },
      { test: "Femoral", result: "Negative" },
    ],
    expectImpression: /disc|herniat|radiculopath|lumbar|sciatic|l5|s1/i,
  },
  {
    id: "lateral-epicondylitis", diagnosis: "Lateral Epicondylitis",
    age: 45, gender: "Female", region: { group: UPPER, name: "Elbow" },
    chiefComplaint: "E2ECASE6 pain while gripping opening jars difficult computer work",
    subjectiveNotes: ["Pain while gripping","Opening jars difficult","Computer work"],
    observation: ["Tender lateral epicondyle"],
    rom: [],
    mmt: [
      { muscle: "Wrist Extension", side: "Right", grade: "4/5 Good" },
      { muscle: "Grip", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Cozen", result: "Positive" },
      { test: "Mill", result: "Positive" },
      { test: "Maudsley", result: "Positive" },
    ],
    expectImpression: /epicondyl|tennis elbow|lateral|elbow/i,
  },
  {
    id: "plantar-fasciitis", diagnosis: "Plantar Fasciitis",
    age: 34, gender: "Male", region: { group: LOWER, name: "Ankle / Foot" },
    chiefComplaint: "E2ECASE7 morning heel pain first steps painful standing worse",
    subjectiveNotes: ["Morning heel pain","First steps painful","Standing worse"],
    observation: ["Pes planus"],
    rom: [
      { movement: "Dorsiflexion", side: "Right", degrees: "10" },
      { movement: "Plantarflexion", side: "Right", degrees: "45" },
    ],
    mmt: [
      { muscle: "Plantarflex", side: "Right", grade: "5/5 Normal" },
      { muscle: "Intrinsic", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Windlass", result: "Positive" },
      { test: "Calcaneal", result: "Negative" },
    ],
    expectImpression: /plantar|fascii|heel|foot/i,
  },
  {
    id: "patellofemoral-pain", diagnosis: "Patellofemoral Pain Syndrome",
    age: 27, gender: "Female", region: { group: LOWER, name: "Knee" },
    chiefComplaint: "E2ECASE8 pain during stairs pain after sitting runner",
    subjectiveNotes: ["Pain during stairs","Pain after sitting","Runner"],
    observation: ["Dynamic valgus"],
    rom: [],
    mmt: [
      { muscle: "Hip Abduct", side: "Right", grade: "4/5 Good" },
      { muscle: "Quadriceps", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Patellar Grind", result: "Positive" },
      { test: "Step Down", result: "Positive" },
      { test: "Clarke", result: "Positive" },
      { test: "McConnell", result: "Positive" },
    ],
    expectImpression: /patellofemoral|pfps|patella|knee/i,
  },
  {
    id: "rotator-cuff-tendinopathy", diagnosis: "Rotator Cuff Tendinopathy",
    age: 42, gender: "Male", region: { group: UPPER, name: "Shoulder" },
    chiefComplaint: "E2ECASE9 pain after overhead painting night pain pain lifting objects",
    subjectiveNotes: ["Pain after overhead painting","Night pain","Pain lifting objects"],
    observation: ["No swelling"],
    rom: [
      { movement: "Flexion", side: "Right", degrees: "150" },
      { movement: "Abduction", side: "Right", degrees: "140" },
      { movement: "External Rotation", side: "Right", degrees: "60" },
    ],
    mmt: [
      { muscle: "Supraspinatus", side: "Right", grade: "4/5 Good" },
      { muscle: "External Rotation", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Empty Can", result: "Positive" },
      { test: "Hawkins", result: "Positive" },
      { test: "Neer", result: "Positive" },
      { test: "Drop Arm", result: "Negative" },
    ],
    expectImpression: /rotator cuff|tendinopath|supraspinatus|impingement|shoulder/i,
  },
  {
    id: "gtps", diagnosis: "Greater Trochanteric Pain Syndrome",
    age: 58, gender: "Female", region: { group: LOWER, name: "Hip / Groin" },
    chiefComplaint: "E2ECASE10 lateral hip pain sleeping difficult pain climbing stairs",
    subjectiveNotes: ["Lateral hip pain","Sleeping difficult","Pain climbing stairs"],
    observation: ["Trendelenburg gait"],
    rom: [
      { movement: "Abduction", side: "Right", degrees: "30" },
      { movement: "Internal Rotation", side: "Right", degrees: "20" },
      { movement: "External Rotation", side: "Right", degrees: "35" },
    ],
    mmt: [
      { muscle: "Abduct", side: "Right", grade: "3/5 Fair" },
      { muscle: "Glute", side: "Right", grade: "4/5 Good" },
    ],
    special: [
      { test: "Trendelenburg", result: "Positive" },
      { test: "FABER", result: "Positive" },
      { test: "FADIR", result: "Negative" },
      { test: "Single Leg Stance", result: "Positive" },
    ],
    expectImpression: /trochanteric|gtps|gluteal|hip|abductor/i,
  },
];

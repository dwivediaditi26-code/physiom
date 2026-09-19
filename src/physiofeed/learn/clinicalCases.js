// Clinical cases for Learn -> Clinical Learning -> Clinical Cases.
// Each case is a patient, revealed step by step: profile -> chief complaint
// -> history -> subjective -> objective -> assessment -> clinical reasoning
// -> treatment plan -> follow-up. `quiz` (optional) is a reasoning question
// shown at the Clinical Reasoning step, same shape as the special-test Quick
// Check. Case 01 is a teaching case written for this app -- review clinical
// wording before relying on it.

export const CASE_SPECIALTIES = [
  { key: "all", label: "All" },
  { key: "msk", label: "MSK" },
  { key: "neuro", label: "Neuro" },
  { key: "sports", label: "Sports" },
  { key: "cardio", label: "Cardio" },
  { key: "paeds", label: "Pediatrics" },
  { key: "geri", label: "Geriatrics" },
];

export const DIFFICULTY = {
  beginner: { label: "Beginner", hint: "Straightforward case", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  intermediate: { label: "Intermediate", hint: "Multiple findings / differential diagnosis", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  advanced: { label: "Advanced", hint: "Complex case, conflicting findings, decision-making", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
};

export const CLINICAL_CASES = [
  {
    id: "case-01-lbp",
    conditionId: "L01",
    number: "01",
    specialty: "msk",
    difficulty: "beginner",
    title: "Low Back Pain",
    stem: "32-year-old male with low back pain for 3 weeks after lifting a heavy box.",
    steps: [
      {
        key: "profile", title: "Patient profile",
        items: [
          ["Age / sex", "32-year-old male"],
          ["Occupation", "Warehouse supervisor — mixed desk work and lifting"],
          ["Build", "BMI 27, right-hand dominant, non-smoker"],
          ["Past history", "No previous significant back pain, no surgery, no chronic illness"],
        ],
      },
      {
        key: "complaint", title: "Chief complaint",
        text: "Central and right-sided low back pain for 3 weeks. Pain is 6/10 at worst and 3/10 at rest (NPRS). He is worried he has \"slipped a disc\" and has reduced his gym and work lifting.",
      },
      {
        key: "history", title: "History of the problem",
        items: [
          ["Onset", "Lifting a 20 kg box from the floor with a bent and twisted trunk; sudden ache, able to keep working"],
          ["Progress", "Stiff the next morning; slowly improving but not settled"],
          ["Medication", "Paracetamol as needed, partial relief"],
          ["Red flags asked", "No trauma, fever, unexplained weight loss, night pain, bladder/bowel change, or saddle numbness"],
        ],
      },
      {
        key: "subjective", title: "Subjective assessment",
        items: [
          ["Aggravating", "Sitting more than 30 minutes, forward bending, standing up from a chair, rolling over in bed"],
          ["Easing", "Walking, lying with knees bent, changing position"],
          ["Morning stiffness", "About 20 minutes"],
          ["Leg symptoms", "None — no pain, tingling or weakness in either leg"],
          ["Goals", "Return to full work duties and gym in 4–6 weeks"],
        ],
      },
      {
        key: "objective", title: "Objective findings",
        items: [
          ["Observation", "Guarded posture, mild flattening of lordosis, muscle guarding right paraspinals"],
          ["Lumbar AROM", "Flexion about 50% with end-range pain; extension mildly limited; right side flexion limited and tight"],
          ["Neurological", "Myotomes L2–S1 5/5, light touch intact, knee and ankle reflexes normal"],
          ["Special tests", "SLR negative both sides (to 70°), slump negative"],
          ["Palpation", "Tender right L4–L5 paraspinals; PA spring L4/L5 provocative and stiff"],
          ["Outcome measures", "NPRS 6/10, ODI 28%, STarT Back — medium risk"],
        ],
      },
      {
        key: "assessment", title: "Assessment",
        text: "Acute-to-subacute mechanical (non-specific) low back pain with a likely lumbar facet and paraspinal muscle source. No red flags and no neurological deficit. Contributing factors: prolonged sitting, reduced deep trunk stabiliser control, and fear of movement.",
      },
      {
        key: "reasoning", title: "Clinical reasoning",
        items: [
          ["Why not disc herniation with radiculopathy?", "No leg pain, SLR and slump negative, normal neurology"],
          ["Why not serious pathology?", "No red flags in history, no night pain, no systemic signs"],
          ["Why this pattern?", "Movement-related pain that eases with walking and position change fits a mechanical source"],
          ["Risk stratification", "STarT Back medium risk — active treatment plus education on fear-avoidance"],
        ],
        quiz: {
          question: "Which finding most strongly argues against a disc herniation with radiculopathy in this patient?",
          options: [
            { id: "A", text: "Pain on forward bending" },
            { id: "B", text: "Negative SLR with no leg symptoms and normal neurology" },
            { id: "C", text: "Morning stiffness of 20 minutes" },
            { id: "D", text: "Tenderness over the right paraspinals" },
          ],
          correctOptionId: "B",
          explanation: "Radiculopathy from a disc usually gives leg pain or paraesthesia, a positive SLR or slump, and often a myotome, dermatome or reflex change. This patient has none of these. Forward-bending pain, stiffness and paraspinal tenderness are all common in mechanical back pain and do not separate the two.",
        },
      },
      {
        key: "plan", title: "Treatment plan",
        items: [
          ["Education", "Reassure that the outlook is good; explain that hurt does not equal harm; stay active"],
          ["Manual therapy", "Lumbar PA mobilisation (grade III) and soft-tissue release to the paraspinals"],
          ["Exercise", "Transversus abdominis activation, pelvic tilts, bridging, walking programme, graded return to lifting"],
          ["Ergonomics", "Sitting breaks every 30 minutes; hip-hinge lifting technique"],
          ["Frequency", "2 sessions a week for 4 weeks plus a daily home programme"],
        ],
      },
      {
        key: "followup", title: "Follow-up and outcome",
        items: [
          ["Week 4", "NPRS 1/10, ODI 8%, full ROM, returned to full work duties"],
          ["Discharge", "Home exercise programme and advice on when to seek review"],
          ["Safety-net", "Return promptly for leg weakness, numbness, bladder or bowel change, or fever"],
        ],
      },
    ],
  },
];

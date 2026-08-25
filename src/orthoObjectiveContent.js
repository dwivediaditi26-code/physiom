/* ============================================================
   orthoObjectiveContent.js — standardized WHY / HOW / WHAT content
   for each objective-assessment category on the Suggested Objective
   screen. Deliberately generic (category-level, not per-condition or
   per-specific-test) -- same scope as the category cards themselves
   (ROM, MMT, Special Tests, ...), not a replacement for the detailed
   per-test "How to Perform" sheets already inside ROM/MMT/Special
   Tests once a therapist is actually filling them in.
   ============================================================ */
export const OBJECTIVE_CONTENT = {
  edema: {
    why: "Swelling can limit range of motion, delay healing, and signal ongoing inflammation or vascular compromise.",
    what: ["Girth difference (cm)", "Pitting vs non-pitting", "Skin temperature/colour changes"],
    how: {
      purpose: "Quantify soft-tissue swelling to track healing and guide load progression.",
      position: "Expose the limb; compare bilaterally where possible.",
      needs: ["Tape measure or figure-8 method", "Goniometer for joint effusion if relevant"],
      steps: ["Identify bony landmarks for consistent measurement points.", "Measure girth at fixed intervals from the landmark.", "Repeat on the unaffected side for comparison.", "Note pitting vs non-pitting, and skin temperature/colour."],
    },
  },
  rom: {
    why: "Establishes a baseline of available movement and identifies which directions are painful or restricted, guiding the rest of the exam.",
    what: ["Degrees of motion per plane", "Pain during movement", "End-feel (if passive)", "Left/right symmetry"],
    how: {
      purpose: "Measure active (and passive, if indicated) range of motion in each relevant plane.",
      position: "Seated or standing depending on region; stabilize the proximal segment.",
      needs: ["Goniometer or inclinometer", "Clear view of the joint axis"],
      steps: ["Ask the patient to move actively through each plane first.", "Note range, pain, and any compensation.", "If active range is limited, assess passive range and end-feel.", "Compare to the uninvolved side or normative values."],
    },
  },
  mmt: {
    why: "Identifies specific strength deficits driving functional limitations, and screens for a possible neurological cause.",
    what: ["MMT grade per muscle (0-5)", "Pain with resisted testing", "Substitution/compensation patterns"],
    how: {
      purpose: "Grade the strength of key muscle groups using the Oxford/MRC 0-5 scale.",
      position: "Standard test position for each muscle, stabilizing proximal to the joint.",
      needs: ["A firm surface", "Clear verbal cues for the patient"],
      steps: ["Position the limb and stabilize proximally.", "Ask the patient to hold against your resistance through range.", "Grade using the 0-5 MMT scale.", "Note pain or substitution patterns during the test."],
    },
  },
  specialTests: {
    why: "Region-specific special tests help narrow the differential diagnosis by stressing specific structures.",
    what: ["Positive/negative/equivocal per test", "Reproduction of the patient's symptoms", "Any pain or apprehension response"],
    how: {
      purpose: "Perform validated orthopaedic special tests relevant to the region and suspected pathology.",
      position: "As specified for each individual test.",
      needs: ["Familiarity with the specific test protocol", "A relaxed, cooperative patient"],
      steps: ["Explain the test to the patient before performing it.", "Perform the test exactly per its standard protocol.", "Note a positive, negative, or equivocal result.", "Correlate with the rest of the clinical picture — no single test is diagnostic alone."],
    },
  },
  neuroScreen: {
    why: "Numbness, tingling, or radiating pain can indicate nerve root or peripheral nerve involvement that changes the treatment plan.",
    what: ["Myotome grade per level", "Dermatome sensation per level", "Reflex grade", "Any asymmetry"],
    how: {
      purpose: "Screen key myotomes, dermatomes, and reflexes relevant to the region.",
      position: "Seated for reflexes; supine or seated for sensation testing.",
      needs: ["Reflex hammer", "A way to test light touch (cotton wisp, finger)"],
      steps: ["Test key myotomes with resisted MMT.", "Test key dermatomes for light touch/sensation.", "Elicit deep tendon reflexes.", "Screen for pathological reflexes if indicated."],
    },
  },
  kineticChain: {
    why: "Many overuse injuries are driven by a deficit upstream or downstream of the painful area, not just the site of pain itself.",
    what: ["Segment(s) with an identified deficit", "Type of deficit (mobility vs control)", "Relevance to the primary complaint"],
    how: {
      purpose: "Screen adjacent segments in the kinetic chain for mobility or control deficits contributing to the presentation.",
      position: "Varies by the segment being screened.",
      needs: ["Enough space to observe a functional movement pattern"],
      steps: ["Observe a relevant functional movement (e.g. squat, overhead reach).", "Identify where in the chain compensation occurs.", "Screen the specific segment identified for mobility/control deficits.", "Correlate findings with the primary complaint."],
    },
  },
  cpa: {
    why: "Central or peripheral sensitization can perpetuate pain independent of ongoing tissue damage, which changes the treatment approach.",
    what: ["Signs of central sensitization present/absent", "Disproportionate pain response", "Psychosocial flags"],
    how: {
      purpose: "Screen for signs of a sensitized nervous system contributing to the pain presentation.",
      position: "As per the specific screening tool used.",
      needs: ["A standardized sensitization screening questionnaire/tool"],
      steps: ["Ask about pain behaviour inconsistent with tissue healing timelines.", "Screen for widespread or disproportionate pain.", "Note any allodynia or hyperalgesia on examination.", "Consider the psychosocial contribution to the presentation."],
    },
  },
  sttt: {
    why: "A structured soft-tissue and neural tension screen (Cyriax-based) helps differentiate contractile from inert tissue involvement.",
    what: ["Passive vs resisted findings", "Strong/weak, painful/painless combinations", "Neural tension response"],
    how: {
      purpose: "Apply Cyriax-style selective tissue tension testing to localize the lesion to contractile or inert tissue.",
      position: "As per the specific structure being tested.",
      needs: ["Clear understanding of resisted vs passive test differentiation"],
      steps: ["Test passive movement for inert-tissue involvement.", "Test resisted (isometric) movement for contractile-tissue involvement.", "Note pain and strength on resisted testing.", "Add a neural tension test if radicular symptoms are present."],
    },
  },
  fma: {
    why: "A functional movement screen identifies the movement fault underlying the injury, not just the site of pain.",
    what: ["Movement quality per pattern", "Asymmetries or compensations", "Pain during any pattern"],
    how: {
      purpose: "Observe a series of fundamental movement patterns to identify compensations or asymmetries.",
      position: "Standing, with enough space to move freely.",
      needs: ["Open space", "A way to view the patient from multiple angles"],
      steps: ["Cue the patient through each screening movement.", "Observe from front, side, and behind.", "Note compensations, asymmetries, or pain.", "Correlate findings with the primary complaint."],
    },
  },
  gait: {
    why: "Gait deviations can both result from and contribute to the patient's condition, and are relevant to falls risk and function.",
    what: ["Gait pattern description", "Symmetry/asymmetry", "Assistive device use", "Falls risk flags"],
    how: {
      purpose: "Observe the patient's walking pattern for deviations from normal gait mechanics.",
      position: "Walking in a straight line with enough space to observe several full cycles.",
      needs: ["A walkway of at least a few metres", "Any usual assistive device the patient uses"],
      steps: ["Observe stance and swing phase for each limb.", "Note step length, cadence, and symmetry.", "Note use of and reliance on any assistive device.", "Ask about falls or near-falls history if relevant."],
    },
  },
  balance: {
    why: "Balance deficits are a key falls-risk factor and are often missed if not specifically assessed.",
    what: ["Balance grade/score", "Assistance required", "Safety/falls risk"],
    how: {
      purpose: "Assess static and/or dynamic balance relevant to the patient's function and falls risk.",
      position: "Standing, near a wall or support surface for safety.",
      needs: ["A safe space with something to hold if needed", "A stopwatch if timing a standardized test"],
      steps: ["Assess static standing balance (eyes open, then closed if safe).", "Assess dynamic balance with a functional task if indicated.", "Grade or time the result per your chosen standardized measure.", "Note assistance required and safety."],
    },
  },
  activityTolerance: {
    why: "A baseline of functional/activity tolerance is needed to set realistic goals and measure progress over the episode of care.",
    what: ["Duration/reps/distance achieved", "Symptoms during and after", "Baseline for future comparison"],
    how: {
      purpose: "Establish the patient's current tolerance for relevant functional activities.",
      position: "Task-dependent.",
      needs: ["Space/equipment relevant to the activity being tested"],
      steps: ["Identify the activity most relevant to the patient's goals.", "Have the patient perform it to their tolerance.", "Note duration/repetitions achieved and symptoms during/after.", "Record as a baseline to compare against at future visits."],
    },
  },
  outcomeMeasure: {
    why: "A validated outcome measure gives an objective, comparable score to track progress and justify the treatment plan.",
    what: ["Total score", "Sub-scale scores if applicable", "Baseline for future comparison"],
    how: {
      purpose: "Administer a condition-appropriate validated outcome measure.",
      position: "Seated, able to complete a questionnaire or physical performance test.",
      needs: ["The relevant outcome measure form/tool"],
      steps: ["Select the outcome measure appropriate to the region/condition.", "Administer per its standard instructions.", "Score per the tool's scoring key.", "Record as the baseline score."],
    },
  },
};

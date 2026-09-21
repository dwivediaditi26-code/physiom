// Low back pain -- pilot content for the notebook-redesigned Clinical
// Learning journey (2026-09-20, Aditi's brief). Replaces the old L01 entry's
// thin, assessment-engine-only data (src/lumbarConditions.json) as the
// source for this screen; that JSON file is untouched and still feeds the
// Ortho assessment wizard's reasoning engine, which is a separate consumer.
//
// Source hierarchy actually used, per Aditi's rule (guidelines/systematic
// reviews first, textbooks for foundational anatomy/physiology only):
//   - Academy of Orthopaedic Physical Therapy / APTA -- JOSPT 2021;51(11):
//     "Interventions for the Management of Acute and Chronic Low Back Pain:
//     Revision 2021" (CPG).
//   - WHO -- "Guideline for non-surgical management of chronic primary low
//     back pain in adults in primary and community care settings," 2023.
//   - NICE NG59 -- "Low back pain and sciatica in over 16s: assessment and
//     management," updated Jul 2026 (checked live -- see note on the
//     withdrawn psychological-therapy recommendation below).
//   - Brinjikji et al., "Systematic Literature Review of Imaging Features of
//     Spinal Degeneration in Asymptomatic Populations," AJNR 2015.
//   - Neumann, Kinesiology of the Musculoskeletal System (foundational
//     anatomy/biomechanics only).
//   - Magee, Orthopedic Physical Assessment (examination technique; already
//     the source the app's own L01 findingInterpretations cite).
// Where evidence is genuinely unsettled this file says so rather than
// picking a side -- see the NICE 2026 note under Management.

export const LOW_BACK_PAIN = {
  id: "nsclbp",
  legacyConditionId: "L01", // links to the existing Case 01 in clinicalCases.js
  name: "Low back pain",
  specialty: "msk",
  region: "Lumbar spine",
  level: "Beginner",
  tagline: "Let's understand what's really happening.",

  overview:
    "Low back pain is pain, muscle tension or stiffness felt between the bottom of the ribs and the buttock creases, with or without pain referred into one or both legs. Most episodes are classed clinically as non-specific -- no single reliably identifiable anatomical source -- rather than tied to one visible structural lesion.",

  anatomy: {
    tier: "foundational",
    intro: "Meet the structures first -- the lumbar spine is a stack of five vertebrae sharing load through a three-joint complex at every level.",
    structures: [
      { label: "Vertebral body", note: "Bears most of the compressive load; five lumbar vertebrae (L1-L5) stack on the sacrum." },
      { label: "Intervertebral disc", note: "Nucleus pulposus (gel core) + annulus fibrosus (layered fibrous ring) between each vertebral body." },
      { label: "Facet (zygapophyseal) joints", note: "A pair of synovial joints at the back of each level; share load with the disc, guide and limit movement." },
      { label: "Spinal canal & nerve roots", note: "L4, L5 and S1 roots exit low in the lumbar spine and are the roots most often involved in radicular leg pain." },
      { label: "Ligaments", note: "Anterior/posterior longitudinal ligaments and ligamentum flavum resist excess movement at each segment." },
      { label: "Paraspinal muscles", note: "Erector spinae (global) and multifidus (segmental) control and stabilise the lumbar spine; thoracolumbar fascia links them to the trunk and hip." },
    ],
    pearl: "Each lumbar level is a three-joint complex -- one disc plus two facet joints sharing the same load. That's one reason low back pain is so often non-specific: several structures at the same level can each plausibly contribute, and clinical exam usually can't isolate a single one.",
  },

  physiology: {
    tier: "foundational",
    intro: "Before learning what goes wrong, know what should normally happen.",
    flow: [
      { label: "Normal structure", note: "Healthy disc and facet joints, adequate segmental muscle control." },
      { label: "Normal movement", note: "Full, pain-free lumbar flexion / extension / rotation / side-flexion." },
      { label: "Normal loading", note: "Disc shares compressive load hydrostatically; facets share load too, more so in extension and rotation." },
      { label: "Normal function", note: "Pain-free sitting, standing, bending, lifting and transitional movements." },
    ],
    detail:
      "The nucleus pulposus behaves like a hydrostatic cushion, distributing compressive load radially into the annulus fibres; the disc loses fluid under load through the day and rehydrates overnight (people are measurably taller in the morning). Segmental muscles (multifidus, deep abdominals) provide feed-forward stiffness just before limb movement, giving the spine control through its range rather than just strength at the end of it.",
    pearl: "Tissue signalling load is not the same as tissue damage. Normal, healthy discs and joints are designed to be loaded -- that's what they're for.",
  },

  functionalAnatomy: {
    tier: "moderate",
    intro: "How the lumbar spine contributes to real movement.",
    items: [
      { task: "Sit to stand / transitional movements", note: "Momentary high compressive and shear load through the lumbar segments -- a common aggravating movement in non-specific LBP (matches this app's own Case 01)." },
      { task: "Bending and lifting", note: "Load can be taken more through hip flexion (\"hip hinge\") or more through lumbar flexion; the exact contribution of technique to injury risk is debated -- treat this as a movement-variability question, not a single \"correct\" technique to enforce." },
      { task: "Walking and gait", note: "Trunk rotation and reciprocal arm swing rely on rotational control through the lumbar and thoracic spine." },
      { task: "Prolonged sitting", note: "Sustained lumbar flexion under low load; a common symptom trigger reported by patients, though evidence that sitting itself causes LBP (as opposed to provoking existing symptoms) is weak." },
    ],
  },

  whatHappens: {
    tier: "strong",
    intro: "Okay -- so what actually changes?",
    flow: [
      { label: "Normal", note: "Pain-free loading and movement." },
      { label: "Trigger", note: "Mechanical overload, unaccustomed or repetitive load, deconditioning -- or, often, no clearly identifiable trigger at all." },
      { label: "Tissue-level change", note: "Possible: annulus microtrauma, facet capsule irritation, muscle/fascial strain. In most patients no single lesion can be reliably identified on exam or imaging." },
      { label: "Physiological response", note: "Local nociceptor sensitisation and inflammatory mediators; protective paraspinal muscle guarding; central sensitisation can develop if pain persists." },
      { label: "Symptoms", note: "Axial pain, stiffness, guarding, reduced tolerance to load." },
      { label: "Functional consequence", note: "Reduced range and sitting/standing tolerance, activity avoidance, and -- if avoidance persists -- a deconditioning cycle that itself maintains disability." },
    ],
    established:
      "Established, high-confidence point (WHO 2023; APTA/JOSPT 2021 CPG; NICE NG59): the large majority of low back pain is classified clinically as non-specific. Imaging findings such as disc bulges, degeneration and annular tears are common in people with no back pain at all, so their presence doesn't reliably explain a given patient's symptoms (Brinjikji et al., AJNR 2015, systematic review of imaging in asymptomatic populations).",
    uncertain:
      "Plausible but not settled: the exact peripheral nociceptive source in a given non-specific case usually cannot be confirmed clinically. Present tissue-level explanations to patients as \"possible contributors,\" not as a confirmed diagnosis.",
    pearl: "Don't present a proposed mechanism as proven fact to a patient. \"Non-specific\" is a real clinical classification, not a gap in your exam.",
  },

  clinicalPresentation: {
    tier: "moderate",
    intro: "If this patient walks into your clinic, what might you actually see?",
    symptoms: ["Axial low back pain, central or one-sided", "Stiffness, especially on first movement after rest", "Referred (non-dermatomal) buttock/thigh ache in some patients -- distinct from dermatomal radicular pain", "Reduced tolerance for sustained postures"],
    aggravating: ["Prolonged sitting or standing", "Forward bending", "Transitional movements -- sit-to-stand, rolling over in bed", "End-range lumbar movement"],
    easing: ["Position change / movement variability", "Short periods of rest (prolonged bed rest is not recommended -- evidence: strong)"],
    signs: ["Paraspinal muscle guarding", "Reduced lumbar active range of motion, often multi-directional rather than one clear pattern", "Antalgic posture or lateral shift in some patients", "Normal neurological exam in non-specific LBP -- an abnormal neuro screen points toward a radicular differential instead"],
    note: "Presentation is genuinely variable between patients -- this list describes common patterns, not a fixed checklist every patient will match.",
  },

  differentialDiagnosis: {
    tier: "moderate",
    intro: "What else could look like this?",
    items: [
      { name: "Lumbar radiculopathy / disc herniation with nerve root involvement", clue: "Dermatomal leg pain, often below the knee; positive SLR/slump; may have reduced reflexes, sensation or myotomal strength." },
      { name: "Lumbar spinal stenosis", clue: "Older adult; neurogenic claudication -- bilateral leg symptoms worse on walking/extension, eased by sitting or forward flexion." },
      { name: "Spondylolisthesis / spondylolysis", clue: "Younger, active patients (e.g. gymnasts, fast bowlers); pain with extension; may have a palpable \"step\" at the level." },
      { name: "Axial spondyloarthritis (inflammatory back pain)", clue: "Onset under 45, morning stiffness over 30 minutes, improves with activity not rest, insidious onset -- screen for this pattern, don't assume mechanical." },
      { name: "Vertebral compression fracture", clue: "Older adult or known osteoporosis, or trauma; localised tenderness, sudden onset." },
    ],
    caution: "No single finding above confirms a diagnosis on its own -- treat these as clues that raise or lower probability, combined with the full picture.",
  },

  redFlags: {
    tier: "strong",
    intro: "Don't miss this.",
    groups: [
      {
        name: "Cauda equina syndrome",
        concern: "Saddle anaesthesia, new bladder or bowel dysfunction, bilateral leg pain/weakness, sexual dysfunction.",
        why: "A surgical emergency -- delayed decompression risks permanent neurological deficit.",
        action: "Same-day emergency referral. Do not manage in an outpatient physiotherapy setting.",
      },
      {
        name: "Malignancy",
        concern: "History of cancer, unexplained weight loss, age over 50 with new-onset pain, night pain unrelieved by position, failure to improve after 4-6 weeks of care.",
        why: "Possible spinal metastasis or primary tumour.",
        action: "Refer for medical assessment and imaging.",
      },
      {
        name: "Spinal infection",
        concern: "Fever, IV drug use, recent spinal procedure or injection, immunosuppression.",
        why: "Discitis / vertebral osteomyelitis / epidural abscess.",
        action: "Urgent medical referral.",
      },
      {
        name: "Vertebral fracture",
        concern: "Significant trauma at any age, or minor trauma with osteoporosis, long-term corticosteroid use, or age over 70.",
        why: "Structural instability risk.",
        action: "Imaging and medical referral before loading the spine further.",
      },
      {
        name: "Progressive neurological deficit",
        concern: "Worsening (not just present) motor weakness or sensory loss.",
        why: "May indicate ongoing nerve root or cord compression.",
        action: "Escalate to medical/surgical review; don't wait out a standard review interval if it's clearly worsening.",
      },
    ],
    caution: "Don't overcall this either -- an isolated, non-progressive, mild finding (e.g. one dermatome of altered sensation with a clear mechanical story) is common in radiculopathy and is not, by itself, cauda equina.",
  },

  assessment: {
    tier: "moderate",
    intro: "Be systematic. Look for the big picture, screen for what you must not miss, then examine what changes your management.",
    order: [
      { step: "Subjective history", note: "Onset, behaviour, red-flag screen, aggravating/easing factors, patient's own beliefs about the pain." },
      { step: "Observation", note: "Posture, gait, guarding, any visible lateral shift." },
      { step: "Functional movement", note: "Sit-to-stand, forward bend, squat -- the movements the patient actually struggles with." },
      { step: "Lumbar active range of motion", note: "Flexion, extension, side-flexion, rotation; note pain behaviour and any directional preference." },
      { step: "Neurological screen", note: "Myotomes, dermatomes, reflexes (expect normal in non-specific LBP)." },
      { step: "Special tests", note: "SLR / slump to screen for neural involvement -- used to rule radiculopathy in or out, not to diagnose non-specific LBP itself." },
      { step: "Outcome measures", note: "A validated baseline measure plus a risk-stratification tool (see below) at the first visit." },
    ],
    investigations:
      "Imaging is not routinely recommended for non-specific low back pain in the absence of red flags (strong consensus: NICE NG59, APTA/JOSPT 2021, WHO 2023). Reserve MRI for suspected serious pathology (see Red Flags) or when surgery is genuinely being considered. Imaging findings are common in people without any back pain, so a positive finding doesn't automatically explain this patient's symptoms -- and an unnecessary scan can create unhelpful labelling and worry rather than change management.",
    outcomeMeasureNote:
      "The STarT Back Tool (or an equivalent stratification tool) is recommended by NICE and APTA/JOSPT to identify patients at higher risk of a poor/persistent outcome so care can be matched to risk, alongside a straightforward pain/disability measure (see Outcome Measures under Management).",
  },

  clinicalReasoning: {
    tier: "moderate",
    intro: "Don't just memorise -- think. Connect the dots.",
    worked: [
      { label: "Finding", note: "Pain worse with sitting, eased by walking; no leg pain past the knee; normal neuro screen." },
      { label: "What could it mean?", note: "Pattern consistent with non-specific mechanical low back pain." },
      { label: "What else could explain it?", note: "Screen out a facet-dominant (extension-provoked) pattern, a discogenic (flexion-provoked, sitting-intolerant) pattern, and SIJ-related pain before settling on \"non-specific.\"" },
      { label: "What should I check next?", note: "Repeated-movement / directional-preference testing, a functional screen, and a brief psychosocial screen (e.g. fear-avoidance, STarT Back) -- because those, not more special tests, are what actually change the management plan." },
    ],
    note:
      "The APTA/JOSPT 2021 CPG organises non-specific LBP into ICF-linked subgroups (for example: acute low back pain with mobility deficits; movement coordination impairments; radiating pain with related lower-extremity impairment; related cognitive or affective tendencies; related generalised pain) rather than a single diagnosis -- reasoning here is about matching the patient's pattern to a subgroup, not finding one special test that names the condition.",
  },

  management: {
    tier: "strong",
    intro: "Individualise. Educate. Keep the patient moving.",
    goals: ["Reduce pain and disability", "Restore function and movement confidence", "Prevent progression to persistent/chronic pain", "Support return to work, sport or usual activity"],
    recommended: [
      { item: "Patient education and reassurance", note: "Favourable natural history, \"hurt does not equal harm,\" encourage normal activity." },
      { item: "Advice to stay active", note: "Avoid prolonged bed rest; continuing ordinary activity (as tolerated) is consistently favoured over rest." },
      { item: "Exercise therapy", note: "Individualised, progressive exercise -- no single exercise type is clearly superior for non-specific LBP in general; match approach to the patient's presentation and preference." },
      { item: "Group exercise programmes", note: "Explicitly supported for consideration in the NICE NG59 2026 update." },
    ],
    consider: [
      { item: "Manual therapy", note: "As an adjunct alongside exercise, not as a standalone long-term treatment." },
      { item: "Directional-preference-based exercise (e.g. McKenzie/MDT)", note: "For patients who show a clear, consistent direction of relief on repeated-movement testing." },
      { item: "Motor control exercise", note: "For patients with movement coordination impairments as the dominant pattern." },
    ],
    notRecommended: [
      "Belts or corsets",
      "Foot orthotics for low back pain",
      "Traction",
      "Acupuncture, ultrasound and most other passive electrophysical agents",
      "Prolonged bed rest",
    ],
    evidenceUpdateNote:
      "Evidence changes -- and this is a real example, not a hypothetical. NICE updated NG59 in July 2026 and formally withdrew its earlier recommendations on psychological therapy and combined physical-psychological programmes for low back pain, because part of the evidence base behind them had since been retracted. Don't assume older summaries (including textbooks) still reflect this; psychosocial factors still matter clinically (see Prognosis), but a specific \"add formal psychological therapy\" recommendation is no longer current guidance.",
    exercise: {
      intro: "Principles, not a fixed protocol -- guidelines deliberately do not mandate one dosage for every patient.",
      principles: [
        "Start pain-guided and at a tolerable load, not a fixed generic starting point.",
        "Progress load and movement complexity gradually as tolerance improves.",
        "Blend general conditioning with any directional-preference-specific work a patient shows.",
        "Add functional / return-to-work-or-sport-specific retraining later in the plan.",
      ],
    },
    patientEducation: [
      "Low back pain is common -- most adults experience it at some point.",
      "Most episodes improve substantially within weeks.",
      "Pain does not necessarily mean tissue damage -- \"hurt\" and \"harm\" are not the same thing.",
      "Staying active supports recovery better than resting and waiting for pain to disappear first.",
      "Imaging is often unnecessary for non-specific LBP and can occasionally add worry without changing the plan.",
    ],
    prognosis:
      "Most acute non-specific low back pain improves substantially within about six weeks. Recurrence within the following year is common, so \"resolved\" is better framed to patients as \"settled for now\" with a plan if it flares again. A more persistent course is associated with psychosocial risk factors -- fear-avoidance beliefs, pain catastrophising, low job satisfaction, and high baseline pain/disability -- which is exactly what stratification tools like STarT Back are trying to flag early, not with any single structural finding.",
    outcomeMeasures: [
      { name: "Oswestry Disability Index (ODI)", use: "Condition-specific disability measure; widely used to track LBP-related function over time." },
      { name: "Numeric Pain Rating Scale (NPRS) / VAS", use: "Simple pain intensity tracking at rest and at worst." },
      { name: "Roland-Morris Disability Questionnaire", use: "Alternative disability measure, often preferred for milder disability or primary care settings." },
      { name: "STarT Back Tool", use: "Risk-stratifies patients (low/medium/high risk of poor outcome) to help match treatment intensity to risk." },
      { name: "Patient-Specific Functional Scale", use: "Patient names their own limited activities and rates them -- useful when standardised scales don't capture what matters to that patient." },
    ],
  },

  keyTakeaways: [
    "Most low back pain is classified as non-specific -- there usually isn't one confirmable structural cause, and that's a real diagnosis, not a shrug.",
    "Imaging findings are common in people with no pain at all, so don't over-interpret a scan; imaging isn't routinely needed without red flags.",
    "Screen every patient for red flags, every time -- but don't overcall an isolated, non-progressive finding as an emergency.",
    "Stay-active advice, education and individualised exercise are the consistent, strongly-supported core of management.",
    "Evidence moves -- NICE's 2026 withdrawal of its psychological-therapy recommendation is a live example of why guidelines (not just textbooks) need to stay your primary reference for current management.",
  ],

  references: [
    { tier: 1, text: "Academy of Orthopaedic Physical Therapy, APTA. Interventions for the Management of Acute and Chronic Low Back Pain: Revision 2021. Journal of Orthopaedic & Sports Physical Therapy, 2021;51(11):CPG1-CPG60." },
    { tier: 1, text: "World Health Organization. WHO guideline for non-surgical management of chronic primary low back pain in adults in primary and community care settings. 2023." },
    { tier: 1, text: "National Institute for Health and Care Excellence. Low back pain and sciatica in over 16s: assessment and management. NICE guideline NG59, updated July 2026." },
    { tier: 2, text: "Brinjikji W, et al. Systematic Literature Review of Imaging Features of Spinal Degeneration in Asymptomatic Populations. American Journal of Neuroradiology, 2015." },
    { tier: 3, text: "Neumann DA. Kinesiology of the Musculoskeletal System: Foundations for Rehabilitation." },
    { tier: 3, text: "Magee DJ. Orthopedic Physical Assessment." },
  ],
};

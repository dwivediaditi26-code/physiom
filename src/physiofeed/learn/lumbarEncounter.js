// Lumbar Case 1 as a patient encounter -- clinical content only.
//
// Source of truth: the case text and screen wording Aditi supplied (adapted
// from "Low Back Pain -- Case Two", Chapter 8) and her mockup of the encounter.
// The patient's answers, the examination findings and the options/feedback are
// hers. Nothing here invents a patient response, an examination finding or a
// red-flag negative: where the case does not say, the screen says so.
//
// How it plays (EncounterEngine.jsx): the student chooses what to ask or
// examine, the patient answers, the clinical record fills up with only what was
// asked, and a reasoning question checks what the student does with it.
//
// Picture: the male low-back-pain character from Aditi's character sheet
// (public/sim/patient-3). The case text itself describes a 49-year-old woman;
// the wording has not been changed to match the picture.
//
// Reasons for options that Aditi did not write out are marked `derived: true`.
// They restate her own teaching points; they should be checked by her.

export const TAGS = {
  DOCUMENTED: { label: "Documented", hint: "Directly provided in the source case." },
  INTERPRETATION: { label: "Interpretation", hint: "A reasonable clinical interpretation of documented information." },
  "STILL TO CHECK": { label: "Still to check", hint: "Missing, or needs further assessment." },
};
const D = "DOCUMENTED";
const S = "STILL TO CHECK";
const r = (text, tag = D) => ({ text, tag });

// An option: id, text, why. `derived` marks a reason restated from her teaching.
const o = (id, text, why, derived = false) => ({ id, text, why, derived });

export const ENCOUNTER = {
  id: "lumbar-case-1",
  title: "Lumbar Case 1",
  subtitle: "Persistent low back pain — clinical reasoning encounter",
  crumbs: ["Clinical Learning", "Musculoskeletal", "Lumbar Spine", "Lumbar Cases"],
  difficulty: "Intermediate",
  sourceNote: "Adapted from the supplied Low Back Pain — Case Two, Chapter 8 case material.",

  // Progress: 12 milestones, as in the mockup's n/12.
  milestones: ["onset", "aggravating", "easing", "distribution", "previous", "psychosocial", "safety", "examination", "imaging", "impression", "management", "report"],

  intro: {
    art: "patient-3",
    quote: "I injured my back at work, and I've been having problems ever since. It has become difficult to do my normal activities.",
    info: [
      ["user", "Age", "49 years"],
      ["work", "Occupation", "Automotive assembly worker"],
      ["pain", "Chief complaint", "Low back pain"],
    ],
    instruction: "You are the treating physiotherapist. Begin your subjective assessment. Choose the question you want to ask the patient.",
  },

  // ───────────── history topics (any order, all required) ─────────────
  topics: [
    {
      id: "onset", milestone: "onset", icon: "clock", label: "Ask about onset and duration of symptoms",
      quote: "I injured my back while installing car upholstery at work about 14 months ago. I took three days off initially. It improved slowly during the first three months, but then the pain gradually got worse.",
      record: [r("Onset: work-related injury."), r("Duration: approximately 14 months."), r("Initial course: some improvement during the first three months."), r("Subsequent course: gradual worsening.")],
      mcq: {
        id: "q_onset",
        q: "Her pain has persisted for 14 months, worsened after the first three months, and has not improved during six months away from work. What is the most important implication for your clinical reasoning?",
        options: [
          o("A", "The original injury must still be unhealed.", "Incorrect. A prolonged course does not prove that tissue healing has failed.", true),
          o("B", "The presentation should be understood through physical, psychological, functional and occupational factors—not just the original injury.", "Correct. The prolonged course and disability call for a broader understanding of the problem. They do not prove that tissue healing has failed or that imaging explains the symptoms."),
          o("C", "The CT findings must explain the persistent pain.", "Incorrect. Imaging findings do not, by themselves, explain the symptoms or establish the pain source.", true),
          o("D", "The patient should avoid physical activity until the pain disappears.", "Incorrect. Waiting for all pain to disappear before any activity may reinforce avoidance.", true),
        ],
        correct: "B",
      },
      keyPoint: "Duration helps you understand the course of the problem. It does not, by itself, tell you the exact cause.",
    },
    {
      id: "aggravating", milestone: "aggravating", icon: "walk", label: "Ask what makes the pain worse",
      quote: "Walking, standing and sitting for more than about 15 minutes make it worse. Shopping and housework are difficult too.",
      record: [r("Sitting tolerance: approximately 15 minutes."), r("Standing tolerance: approximately 15 minutes."), r("Walking tolerance: approximately 15 minutes."), r("Shopping and housework: difficult.")],
      mcq: {
        id: "q_aggravating",
        q: "What is the most useful interpretation of this?",
        options: [
          o("A", "These findings confirm lumbar disc herniation.", "Incorrect. Activity-related pain is not specific to disc herniation."),
          o("B", "The patient has reduced tolerance for several everyday activities, but the cause requires further assessment.", "Correct. These findings show clear functional limitations with several everyday activities. They do not identify a specific pain generator."),
          o("C", "The patient should stop all physical activity.", "Incorrect. Avoiding all activity is not an evidence-based approach."),
          o("D", "These symptoms prove the patient is exaggerating the pain.", "Incorrect. The patient's report must be taken seriously."),
        ],
        correct: "B",
      },
      keyPoint: "History of aggravating factors helps you understand the functional impact and guides your next assessment.",
    },
    {
      id: "easing", milestone: "easing", icon: "heal", label: "Ask what makes the pain better",
      quote: "Lying down helps, but only for about 30 minutes. Then I start to feel stiff.",
      record: [r("Easing factor: lying down."), r("Duration of relief: approximately 30 minutes."), r("Additional symptom: stiffness after lying down.")],
      mcq: {
        id: "q_easing",
        q: "What does this tell you?",
        options: [
          o("A", "The patient definitely has inflammatory spinal disease.", "Incorrect. One easing factor does not establish an inflammatory condition; it needs the rest of the history and examination.", true),
          o("B", "Lying down provides temporary relief, but this response is not diagnostic on its own.", "Correct. An easing factor helps describe symptom behaviour. It should be interpreted with the rest of the history and examination, rather than used alone to make a diagnosis."),
          o("C", "The pain must be caused by a disc.", "Incorrect. Relief with lying down is not specific to a disc; it does not identify the pain source.", true),
          o("D", "The patient requires bed rest.", "Incorrect. Relief for about 30 minutes does not mean bed rest is the answer; waiting for pain to disappear before any activity may reinforce avoidance.", true),
        ],
        correct: "B",
      },
      keyPoint: "An easing factor describes symptom behaviour. On its own it does not point to one diagnosis.",
    },
    {
      id: "distribution", milestone: "distribution", icon: "pin", label: "Ask where exactly the pain is, and whether it travels anywhere",
      quote: "The pain is in the middle of my lower back and spreads into both buttock areas. I don't have pain down my legs.",
      record: [r("Central lumbar pain."), r("Radiation to both gluteal regions."), r("No leg pain reported.")],
      mcq: {
        id: "q_distribution",
        q: "How do you interpret this finding?",
        options: [
          o("A", "Bilateral gluteal pain confirms bilateral nerve-root compression.", "Incorrect. Bilateral gluteal pain does not confirm nerve-root compression."),
          o("B", "The symptom distribution is documented, but it does not confirm a nerve-root syndrome.", "Correct. Bilateral gluteal radiation can occur in different low back pain presentations. The absence of leg pain does not prove a nerve-root syndrome. You should continue with safety screening and relevant physical examination."),
          o("C", "The patient definitely has facet joint pain.", "Incorrect. Distribution alone does not confirm facet joint pain."),
          o("D", "The absence of leg pain means a neurological assessment is unnecessary.", "Incorrect. A neurological assessment is still appropriate."),
        ],
        correct: "B",
      },
      keyPoint: "Symptom distribution helps shape your hypotheses. It does not, by itself, establish the diagnosis.",
    },
    {
      id: "previous", milestone: "previous", icon: "history", label: "Ask about previous episodes and treatment",
      quote: "I've had occasional back pain for about 15 years, but it normally settled after a few days. I've tried manipulative physiotherapy, mobilisation, traction and chiropractic treatment this time, but none of them has helped.",
      record: [r("Previous intermittent low back pain: about 15 years."), r("Previous episodes: usually short-lived."), r("Current episode: more persistent and disabling."), r("Previous treatment: no reported benefit.")],
      mcq: {
        id: "q_previous",
        q: "What is the most important implication?",
        options: [
          o("A", "The patient definitely needs more intensive manipulation.", "Incorrect. Lack of benefit from previous treatment is a reason to reassess the overall approach, not automatically increase passive treatment."),
          o("B", "The current episode differs from her previous episodes, so the assessment and management approach should be reconsidered.", "Correct. The current episode has a different course and substantially greater functional impact than previous episodes. This warrants reassessment of the whole presentation, treatment goals and barriers to recovery."),
          o("C", "Previous treatment failure proves the condition is psychological.", "Incorrect. Failure of previous treatment does not establish a psychological cause. Persistent pain can involve interacting physical, psychological and social factors."),
          o("D", "The patient cannot benefit from exercise.", "Incorrect. Nothing in the case shows that she cannot benefit from exercise; individualised active management is appropriate.", true),
        ],
        correct: "B",
      },
      keyPoint: "A different course from her usual episodes is a reason to rethink the approach, not to repeat what has not helped.",
    },
    {
      id: "psychosocial", milestone: "psychosocial", icon: "heart", label: "Explore how this affects work and daily life",
      quote: "I am worried that the disc changes on my scan mean my back is damaged. I avoid doing things because I do not want to make it worse. I keep thinking that I need to find the right person who can fix it.",
      record: [
        r("Concerned about the CT report and disc pathology."), r("Believes the right practitioner will fix the problem."), r("Reduced activity to avoid pain."),
        r("Assessed as depressed; antidepressant medication for three months."), r("Poor sleep: difficulty finding a comfortable position, wakes when turning in bed."),
        r("Short-tempered with family and friends."), r("Spouse has taken over housework and shopping."), r("Off work for six months; being off work has not led to improvement."),
      ],
      mcq: {
        id: "q_psychosocial",
        q: "Which combination of findings warrants further exploration as potential barriers to recovery?",
        options: [
          o("A", "Mild facet degeneration alone.", "Incorrect. Mild imaging changes alone do not explain the patient's functional presentation or establish a recovery barrier."),
          o("B", "Fear of damage, activity avoidance, depression, prolonged work absence and concern about the scan.", "Correct. These factors may interact with pain, confidence, activity and participation. They should be assessed respectfully. They do not prove that the pain is psychological or that the patient is responsible for her disability."),
          o("C", "Gluteal pain alone.", "Incorrect. Gluteal pain is part of the symptom distribution, but it does not identify the psychosocial factors affecting recovery."),
          o("D", "A previous cholecystectomy alone.", "Incorrect. The previous surgery belongs in the medical history, but no connection to the current presentation is established in the source case."),
        ],
        correct: "B",
      },
      keyPoint: "These are signals to assess and address potentially modifiable barriers—not proof that pain is psychological. Ask what she believes, fears and needs in order to resume meaningful activities.",
    },
  ],

  // ───────────── safety screening (a topic with its own list) ─────────────
  safety: {
    id: "safety", milestone: "safety", label: "Begin safety screening",
    bubble: "It's important to check for any serious symptoms. What would you like to ask?",
    note: {
      title: "Important note",
      warning: "This specific information is not provided in the supplied case.",
      body: "In a real consultation, you must ask the patient and document the actual response. Do not assume that the answer is negative.",
      why: ["Some safety findings require urgent medical assessment.", "Always ask and record the patient's actual response.", "If concerning symptoms are present, stop routine examination and refer appropriately."],
    },
    topics: [
      { id: "s_bb", label: "Bladder or bowel changes, saddle numbness", questions: ["Any new difficulty passing urine or loss of bladder control?", "Any new loss of bowel control?", "Any new numbness around the saddle or perineal region?"] },
      { id: "s_neuro", label: "New or progressive weakness", questions: ["Any new or progressive leg weakness?", "Any new bilateral leg symptoms or rapidly worsening neurological changes?"] },
      { id: "s_cancer", label: "History of cancer or systemic symptoms", questions: ["Any previous history of cancer?", "Any unexplained weight loss?", "Any fever, chills or systemic illness?", "Any other relevant risk factors or concerning symptom pattern?"] },
      { id: "s_trauma", label: "Significant trauma or fracture risk", questions: ["Any significant trauma?", "Any relevant osteoporosis or prolonged corticosteroid use, where clinically appropriate?"] },
      { id: "s_other", label: "Infection or inflammatory features", questions: ["Relevant infection risks, recent infection or immunosuppression?", "Features that suggest an inflammatory condition?"] },
    ],
    // What the case does document that bears on safety.
    documented: [
      r("Symptoms have persisted for 14 months."), r("Poor sleep."), r("Weight increased by approximately 6 kg over the 14 months. This is not unexplained weight loss and is not proof of serious pathology."),
      r("CT reports minor disc bulges and no nerve-root involvement."), r("The supplied case reports no neurological abnormality detected."),
    ],
    stillToCheck: [r("Individual cauda equina screening questions.", S), r("Detailed progressive neurological history.", S), r("Other relevant red-flag history and clinical context.", S)],
    mcq: {
      id: "q_safety",
      q: "During this consultation, the patient reports new urinary retention and numbness around the saddle region. What is the most appropriate action?",
      options: [
        o("A", "Continue routine lumbar mobility testing and reassess next week.", "Incorrect. These symptoms may indicate a time-critical neurological emergency and should not wait for routine reassessment."),
        o("B", "Start lumbar strengthening and provide reassurance that the symptoms are caused by chronic pain.", "Incorrect. Exercise and reassurance must not delay urgent assessment when a serious cause is suspected."),
        o("C", "Arrange urgent emergency medical assessment for possible cauda equina syndrome.", "Correct. New urinary retention with saddle sensory disturbance requires urgent emergency assessment for possible cauda equina syndrome."),
        o("D", "Interpret the symptoms as fear-avoidance because the patient is worried about her back.", "Incorrect. Psychosocial factors must never be used to dismiss possible serious pathology."),
      ],
      correct: "C",
    },
    escalation: "Escalation required if present: new urinary retention or loss of bladder control, new loss of bowel control, new saddle numbness, or new or progressive leg weakness. Arrange urgent emergency medical assessment. Do not continue the ordinary case workflow.",
    keyPoint: "Safety screening comes before routine rehabilitation decisions. If serious pathology is suspected, act on the clinical urgency rather than completing the ordinary case workflow.",
  },

  // ───────────── physical examination (all six, any order) ─────────────
  exam: {
    milestone: "examination",
    title: "Physical Examination",
    prompt: "Choose an examination to perform.",
    domains: [
      {
        id: "obs", icon: "eye", label: "General observation and gait", findingsTitle: "Observation and Gait — Findings",
        findings: [r("Grimacing and placing a hand on the back."), r("Frequent changes between sitting and standing."), r("Slow, guarded gait.")],
        mcq: {
          id: "q_obs", q: "What does this show?",
          options: [
            o("A", "Proves disc herniation.", "Incorrect. These observations do not prove disc herniation.", true),
            o("B", "Demonstrates functional limitations and pain behaviour.", "Correct. These observations demonstrate functional limitations and pain behaviour. They do not identify the exact pain generator. They should be interpreted alongside the rest of the history and examination."),
            o("C", "Indicates no physical problem.", "Incorrect. The patient has documented pain, limited movement and substantial functional disability.", true),
            o("D", "Confirms nerve-root compression.", "Incorrect. The case reports no leg pain and no neurological abnormality; these observations do not confirm nerve-root compression.", true),
          ],
          correct: "B",
        },
        keyPoint: "Observation helps you understand how the patient moves and copes with their symptoms. It is one part of the overall clinical picture.",
      },
      {
        id: "move", icon: "move", label: "Lumbar active movements", findingsTitle: "Lumbar Active Movements — Findings",
        findings: [r("Flexion: limited to approximately 2 cm above the knee."), r("Extension: moderately limited, approximately half the expected range."), r("Seated rotation: approximately 40° bilaterally.")],
        mcq: {
          id: "q_move", q: "What do these findings establish?",
          options: [
            o("A", "They confirm a specific lumbar structure is responsible for the pain.", "Incorrect. Movement findings help describe impairment and guide functional assessment, but do not independently establish the exact pain generator."),
            o("B", "They demonstrate restricted lumbar movement that should be interpreted alongside symptoms and function.", "Correct. The patient has documented movement restrictions. These findings help describe impairment and guide functional assessment, but do not independently establish the exact pain generator."),
            o("C", "They prove the patient has nerve-root compression.", "Incorrect. Lumbar movement limits do not prove nerve-root compression; the case reports no leg pain and no neurological abnormality.", true),
            o("D", "They show the patient has no physical impairment.", "Incorrect. The patient has documented pain, limited movement and substantial functional disability."),
          ],
          correct: "B",
        },
        keyPoint: "Movement findings describe impairment and help you plan function-focused reassessment. They do not name the pain source.",
      },
      {
        id: "palp", icon: "hand", label: "Lumbar palpation", findingsTitle: "Lumbar Palpation — Findings",
        findings: [r("Central L1–L5 palpation is painful."), r("Unilateral pressures are painful on both sides from L1–L5.")],
        teaching: "Palpation tenderness is nonspecific and cannot independently confirm the exact pain generator.",
      },
      {
        id: "neuro", icon: "neuro", label: "Neurological examination", findingsTitle: "Neurological Examination — Findings",
        findings: [r("No neurological abnormality detected in the supplied case.")],
        teaching: "This finding should be interpreted alongside the history. It does not mean that future neurological symptoms can be ignored.",
      },
      {
        id: "neural", icon: "nerve", label: "Neural mobility (SLR, slump)", findingsTitle: "Neural Mobility — Findings",
        findings: [r("SLR right: 50°."), r("SLR left: 50°."), r("Full knee extension possible in upright sitting."), r("Slump test: not evaluated.", S)],
        teaching: "Do not label these results as proof of nerve-root compression. Interpret them alongside symptom reproduction, neurological findings and the broader presentation. The source does not provide enough information to classify every neural mobility finding independently.",
      },
      {
        id: "func", icon: "walk", label: "Functional assessment", findingsTitle: "Functional Assessment — Findings",
        findings: [r("Sitting, standing and walking tolerance: approximately 15 minutes."), r("Oswestry Disability Score: 72%."), r("VAS pain: 7.5 after 15 minutes of standing or sitting.")],
        teaching: "These measures describe a substantial symptom and functional burden and give you a baseline to measure progress against. They do not identify a specific damaged structure, and no post-treatment score exists for this patient.",
      },
    ],
  },

  // ───────────── imaging ─────────────
  imaging: {
    milestone: "imaging",
    title: "Interpret the imaging",
    tabs: [
      { id: "xray", label: "X-ray", caption: "Mild bilateral L4–L5 facet degeneration." },
      { id: "ct", label: "CT Scan", caption: "Minor disc bulges at L4–L5 and L5–S1, with no nerve-root involvement reported." },
    ],
    mcq: {
      id: "q_imaging", q: "Which interpretation is best supported?",
      options: [
        o("A", "The disc bulges prove nerve-root compression.", "Incorrect. The CT explicitly reports no nerve-root involvement, and the case does not report leg pain."),
        o("B", "Facet degeneration proves that the facet joints are the sole pain source.", "Incorrect. Mild facet degeneration does not independently establish that the facets are the sole source of pain."),
        o("C", "The imaging findings must be interpreted alongside the clinical presentation and do not establish a single pain generator.", "Correct. Imaging findings do not automatically identify the source of pain. The patient's symptoms, examination and functional limitations remain clinically important."),
        o("D", "Minor imaging findings mean the patient's symptoms are not real.", "Incorrect. Lack of a major structural explanation does not mean that pain is imaginary or exclusively psychological."),
      ],
      correct: "C",
    },
    keyPoint: "Imaging is evidence to interpret, not a diagnosis to copy into the clinical impression. Do not confuse a structural finding with a confirmed pain source, and do not use a scan to dismiss the patient's symptoms.",
  },

  // ───────────── clinical impression ─────────────
  impression: {
    milestone: "impression",
    title: "Form the clinical impression",
    mcq: {
      id: "q_impression", q: "Which impression best integrates the evidence?",
      options: [
        o("A", "Confirmed severe disc herniation with radiculopathy.", "Incorrect. The source does not document a severe herniation, leg pain or a neurological abnormality supporting this diagnosis."),
        o("B", "Persistent disabling low back pain with physical limitations and relevant psychosocial and occupational factors that may influence recovery.", "Correct. This interpretation reflects the duration, functional burden, examination and wider context without claiming a confirmed single pain generator."),
        o("C", "Confirmed facet joint pain as the sole pain source.", "Incorrect. Mild facet degeneration and local tenderness are insufficient to prove that the facets are the sole pain source."),
        o("D", "No genuine physical problem because the imaging findings are minor.", "Incorrect. The patient has documented pain, limited movement and substantial functional disability. Minor imaging findings do not invalidate these symptoms."),
      ],
      correct: "B",
    },
    model: [
      "Persistent disabling low back pain of approximately 14 months' duration, with restricted lumbar movement, guarded gait, substantial functional limitations and relevant psychosocial and occupational factors.",
      "The available information does not confirm a single structural pain generator or establish a nerve-root syndrome.",
    ],
    keyPoint: "A clinical impression is a synthesis of the available evidence, not a list of scan findings or an unsupported structural diagnosis.",
  },

  // ───────────── management ─────────────
  management: {
    milestone: "management",
    title: "Management Planning",
    bubble: "We've gathered a lot of information. Let's plan the next steps.",
    mcq: {
      id: "q_management", q: "Which management approach is most appropriate for this patient now?",
      options: [
        o("A", "Continue passive treatment only.", "Incorrect. Passive treatment alone does not address the full functional and psychosocial picture. Waiting for all pain to disappear before any activity may reinforce avoidance."),
        o("B", "Prescribe the same exercise programme for everyone.", "Incorrect. Exercise should be tailored to the patient's needs, capability, preferences and response."),
        o("C", "Individualised plan: education, graded activity, exercise, address psychosocial factors and return-to-work planning.", "Correct. The patient's care should be collaborative and tailored to her symptoms, goals, capabilities and circumstances. The plan should support function and self-management while monitoring progress and reassessing when necessary."),
        o("D", "Tell the patient the scan is normal and return her to full duties immediately.", "Incorrect. The scan is not entirely normal, the patient has substantial symptoms and disability, and return to work should be planned collaboratively and safely."),
      ],
      correct: "C",
    },
    plan: {
      title: "Management plan builder",
      prompt: "Choose three initial priorities. Each choice is checked against the documented problems.",
      picks: 3,
      options: [
        { id: "edu", label: "Education and shared understanding of the condition", link: "Documented: concern about the CT report and disc pathology; believes the right practitioner will fix her problem." },
        { id: "act", label: "Graded activity and individualised exercise", link: "Documented: sitting, standing and walking limited to approximately 15 minutes; limited lumbar movement, guarded gait and activity reduced to avoid pain." },
        { id: "goal", label: "Functional goals and activity tolerance", link: "Documented: difficulty with shopping and housework, which her spouse has taken over; standing tolerance approximately 15 minutes." },
        { id: "fear", label: "Exploration of fear-avoidance and confidence", link: "Documented: fear of worsening damage and reduced activity to avoid pain." },
        { id: "psy", label: "Psychological support when indicated", link: "Documented: assessed as depressed, antidepressants for three months, short-tempered with family and friends." },
        { id: "work", label: "Workplace assessment and graded return-to-work planning", link: "Documented: assembly work, off work for six months, original injury at work, being off work has not led to improvement." },
        { id: "out", label: "Outcome monitoring and reassessment", link: "Documented: Oswestry Disability Score 72%, VAS 7.5 after 15 minutes of standing or sitting." },
      ],
      afterNote: "Every option here is relevant to a documented problem, so there is no single right set of three. What matters is that your choices connect to what the case documents. Safety monitoring continues alongside whatever you choose.",
    },
    keyPoint: "Management should target meaningful function and the patient's individual barriers. Active rehabilitation, education and appropriate psychosocial and occupational support can be combined according to clinical need.",
  },

  completion: "You have completed Lumbar Case 1. Review how your clinical reasoning developed from the initial complaint to the final management plan.",

  references: [
    {
      title: "National Institute for Health and Care Excellence (NICE). Low back pain and sciatica in over 16s: assessment and management. Guideline NG59.",
      url: "https://www.nice.org.uk/guidance/ng59/chapter/recommendations",
      points: ["Consider risk stratification.", "Tailor support to the patient's risk and needs.", "Provide information and advice that supports self-management.", "Encourage appropriate normal activity.", "Consider exercise programmes based on patient needs and capabilities.", "Consider psychological approaches as part of an appropriate treatment package.", "Consider combined physical and psychological programmes for persistent low back pain with significant psychosocial obstacles.", "Do not routinely offer imaging in non-specialist settings; imaging should be considered when it is likely to change management."],
    },
    {
      title: "World Health Organization. WHO guideline for non-surgical management of chronic primary low back pain in adults in primary and community care settings. Geneva: WHO; 2023.",
      url: "https://www.who.int/publications/b/71563",
      url2: "https://www.ncbi.nlm.nih.gov/books/NBK599213/",
      points: ["A thorough clinical assessment from a biopsychosocial perspective is important.", "Personalised education and advice can support self-management.", "Structured exercise programmes may be offered as part of care.", "Psychological interventions such as cognitive behavioural therapy may form part of an appropriate plan.", "Multicomponent biopsychosocial care may be appropriate when physical, psychological and social needs interact.", "Recommendations must be interpreted in the context of the patient's needs, available evidence and clinical circumstances."],
    },
    {
      title: "Supplied source case: “Low Back Pain — Case Two,” Chapter 8, supplied by the user.",
      points: ["The authority for the patient's age, occupation, symptom history, examination measurements, imaging results, outcome scores and documented psychosocial factors.", "Full bibliographic details (author, title, publisher, edition, year, page) have not been supplied, so none are shown."],
    },
  ],
};

// Every question in the case, in play order of the data (used for review/tests).
export function allQuestions(e = ENCOUNTER) {
  return [
    ...e.topics.map((t) => t.mcq),
    e.safety.mcq,
    ...e.exam.domains.filter((d) => d.mcq).map((d) => d.mcq),
    e.imaging.mcq, e.impression.mcq, e.management.mcq,
  ];
}

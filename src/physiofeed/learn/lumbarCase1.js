// Lumbar Case 1 -- clinical content, kept apart from the screens that show it.
//
// Source of truth: the case text Aditi supplied (adapted from "Low Back Pain --
// Case Two", Chapter 8). Nothing here is generated. Every fact carries a tag so
// the screen can show it as DOCUMENTED, INTERPRETATION or STILL TO CHECK, and
// nothing that is not in the source case is turned into a finding. Edit this
// file to change the clinical wording; the screens (CaseEngine.jsx) do not
// need to change.
//
// Screen shape:
//   { id, title, task, objective, mood, quote?, blocks[], mcqs[], reveal[],
//     takeaway, nextLabel }
// An MCQ is { id, q, options:[{ id, text, why }], correct }. Blocks listed in
// `reveal` appear only after every MCQ on the screen has been submitted.

const D = "DOCUMENTED";
const I = "INTERPRETATION";
const S = "STILL TO CHECK";

export const TAGS = {
  [D]: { label: "Documented", hint: "Directly provided in the source case." },
  [I]: { label: "Interpretation", hint: "A reasonable clinical interpretation of documented information." },
  [S]: { label: "Still to check", hint: "Missing, or needs further assessment." },
};

const f = (text, tag = D, label, icon) => ({ text, tag, label, icon });

export const LUMBAR_CASE_1 = {
  id: "lumbar-case-1",
  title: "Lumbar Case 1",
  crumbs: ["Clinical Learning", "Musculoskeletal", "Lumbar Spine", "Lumbar Cases"],
  subtitle: "Persistent low back pain — clinical reasoning case",
  difficulty: "Intermediate",
  sourceNote: "Adapted from the supplied Low Back Pain — Case Two, Chapter 8 case material.",
  outcomes: [
    "Obtain a structured subjective history for persistent low back pain.",
    "Identify important safety-screening questions and recognise when urgent referral may be needed.",
    "Identify psychosocial and occupational barriers to recovery without blaming the patient.",
    "Interpret lumbar imaging cautiously and distinguish imaging findings from a confirmed pain source.",
    "Select relevant lumbar, neurological, neural mobility and functional examinations.",
    "Interpret the combined subjective and objective findings.",
    "Form a defensible physiotherapy clinical impression.",
    "Prioritise problems and set measurable functional goals.",
    "Develop an individualised, active, biopsychosocial management plan.",
    "Explain the rationale for treatment, referral and graded return to work.",
    "Reassess outcomes and modify management according to progress.",
  ],
  // Facts shown in the "Case file" side panel (all DOCUMENTED).
  caseFile: [
    ["Patient", "Case patient L1"],
    ["Age / sex", "49 years, female"],
    ["Occupation", "Assembly worker, automotive manufacturer"],
    ["Complaint", "Persistent central low back pain, about 14 months"],
    ["Work status", "Off work for six months"],
  ],

  screens: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "s1", title: "Lumbar Case 1: Meet Your Patient",
      task: "Meet the patient and understand the clinical context. Not everything about the case is shown yet.",
      objective: "Recognise the broad presentation and understand that the patient's problem includes more than the presence of pain alone.",
      mood: "Uncomfortable and concerned, with a guarded posture",
      art: "lumbar-patient-pain",
      quote: "I injured my back while installing car upholstery at work about 14 months ago. It improved a little initially, but now my pain keeps getting worse. I have been off work for six months, and I still cannot manage my normal activities.",
      quoteNote: "A concise educational summary of the supplied case, not a verbatim source quotation.",
      blocks: [
        { type: "facts", title: "Patient information", items: [
          f("49 years", D, "Age", "user"),
          f("Automotive assembly worker", D, "Occupation", "work"),
          f("Persistent low back pain", D, "Main complaint", "pain"),
          f("14 months", D, "Duration", "clock"),
          f("Difficulty with prolonged sitting, standing, walking and daily activities", D, "Main concern", "walk"),
        ] },
      ],
      mcqs: [{
        id: "q1", q: "What is the most important initial task when beginning this consultation?",
        options: [
          { id: "A", text: "Immediately identify the exact lumbar structure responsible for the pain.", why: "Incorrect. A specific pain source should not be assumed before an appropriate assessment." },
          { id: "B", text: "Establish the patient's presenting complaint, history, functional impact and relevant safety concerns.", why: "Correct. The first task is to understand the patient's history, current presentation, function and safety needs." },
          { id: "C", text: "Prescribe lumbar strengthening exercises before taking a history.", why: "Incorrect. Exercise selection should follow an appropriate assessment and consideration of the patient's needs and capabilities." },
          { id: "D", text: "Assume the CT findings explain the patient's symptoms.", why: "Incorrect. Imaging findings must be interpreted in clinical context." },
        ],
        correct: "B",
      }],
      reveal: [],
      takeaway: "A clinical case starts by understanding the person, their symptoms, their function and their safety—not by guessing a diagnosis.",
      nextLabel: "Start Subjective Assessment",
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "s2", title: "Listen, Ask and Understand",
      task: "Organise the subjective history and recognise features of a persistent, disabling presentation.",
      objective: "Identify symptom duration, onset, distribution, aggravating and easing factors, daily pattern, previous history, treatment response and functional consequences.",
      mood: "Talking with the physiotherapist",
      blocks: [
        { type: "history", title: "Structured history (tap a section)", sections: [
          { title: "Onset and duration", quote: "I hurt my back installing car upholstery at work about 14 months ago.", facts: [f("Onset: injured her back installing car upholstery at work."), f("Duration: 14 months."), f("Took three days off work initially; improved slowly over the first three months, then became persistent and increasingly disabling.")] },
          { title: "Symptom location and distribution", quote: "The pain is in the middle of my lower back and spreads into both buttock areas. I do not have pain down my legs.", facts: [f("Central low back pain radiating into both gluteal regions."), f("Leg pain: none reported.")] },
          { title: "Aggravating factors", quote: "Walking, standing or sitting for more than about 15 minutes makes it worse. Shopping and housework are difficult.", facts: [f("Walking, standing and sitting: approximately 15 minutes."), f("Shopping."), f("Housework.")] },
          { title: "Easing factors", quote: "Lying down helps a little, but after about 30 minutes I get stiff.", facts: [f("Lying down gives some relief."), f("Relief lasts approximately 30 minutes before stiffness becomes problematic.")] },
          { title: "Sleep and daily pattern", quote: "I struggle to get comfortable and wake up when I turn in bed.", facts: [f("Difficulty finding a comfortable position at night; wakes when turning in bed; poor sleep."), f("Symptoms gradually become worse towards the end of the day.")] },
          { title: "Previous history and treatment", quote: "I have had occasional back pain for years, but it normally settled after a few days. I have tried physiotherapy treatments, traction and chiropractic treatment, but they have not helped.", facts: [f("About 15 years of intermittent low back pain; episodes usually lasted only a few days and did not previously cause prolonged work absence."), f("Previous treatment: manipulative physiotherapy, mobilisation, traction and chiropractic treatment. No benefit reported."), f("Past surgery: cholecystectomy six years ago.")] },
          { title: "Work and functional impact", facts: [f("Off work for six months. Being off work has not resulted in improvement."), f("Reduced participation in household and community activities."), f("Approximately 6 kg weight gain over the 14-month period.")] },
        ] },
        { type: "facts", title: "Structured history card", items: [
          f("14 months", D, "Duration"), f("15 years", D, "Previous intermittent low back pain"), f("Six months", D, "Off work"),
          f("None reported", D, "Leg pain"), f("Approximately 15 minutes", D, "Sitting tolerance"), f("Approximately 15 minutes", D, "Standing tolerance"),
          f("Approximately 15 minutes", D, "Walking tolerance"), f("Temporary relief, followed by stiffness", D, "Lying down"),
          f("Poor and interrupted", D, "Sleep"), f("No reported benefit", D, "Previous treatment response"),
        ] },
      ],
      mcqs: [{
        id: "q2", q: "Which interpretation of this history is most appropriate?",
        options: [
          { id: "A", text: "The original work injury proves that a specific lumbar structure is still damaged.", why: "Incorrect. The original injury is relevant, but it does not prove that a specific structure remains damaged 14 months later." },
          { id: "B", text: "This is a persistent, disabling low back pain presentation requiring further assessment of physical, psychosocial and occupational factors.", why: "Correct. The prolonged course, work absence, functional limitation and unsuccessful previous treatment warrant a broader assessment." },
          { id: "C", text: "Pain in both gluteal regions confirms bilateral nerve-root compression.", why: "Incorrect. Gluteal pain without reported leg pain does not confirm nerve-root compression." },
          { id: "D", text: "Failure of previous manual therapy proves that the pain is psychological.", why: "Incorrect. Failure of previous treatment does not establish a psychological cause. Persistent pain can involve interacting physical, psychological and social factors." },
        ],
        correct: "B",
      }],
      reveal: [],
      takeaway: "The subjective history establishes the pattern, duration and impact of symptoms. It informs the next steps but does not, by itself, confirm the pain generator.",
      nextLabel: "Continue to Safety Screening",
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "s3", title: "First, Check for Serious Pathology",
      task: "Consider serious pathology before routine examination and rehabilitation.",
      objective: "Understand that a prolonged history and imaging report do not replace a clinically appropriate safety screen.",
      mood: "Listening",
      blocks: [
        { type: "note", tone: "amber", text: "The supplied case does not list the patient's answers to individual red-flag questions. No answers are made up here: the items below are questions the clinician should ask, not facts about this patient." },
        { type: "safety", title: "Safety questions for the encounter", groups: [
          { title: "Bladder and bowel function", items: ["Any new difficulty passing urine or loss of bladder control?", "Any new loss of bowel control?", "Any new numbness around the saddle or perineal region?"] },
          { title: "Neurological symptoms", items: ["Any new or progressive leg weakness?", "Any new bilateral leg symptoms or rapidly worsening neurological changes?"] },
          { title: "Possible fracture or significant trauma", items: ["Any significant trauma?", "Any relevant osteoporosis or prolonged corticosteroid use, where clinically appropriate?"] },
          { title: "Possible malignancy or systemic illness", items: ["Any previous history of cancer?", "Any unexplained weight loss?", "Any fever, chills or systemic illness?", "Any other relevant risk factors or concerning symptom pattern?"] },
          { title: "Possible infection or inflammatory pathology", items: ["Relevant infection risks, recent infection or immunosuppression?", "Features that suggest an inflammatory condition?"] },
        ], footer: "These are screening prompts, not assumed patient answers. A clinician should tailor the questions to the history and presentation." },
        { type: "facts", title: "What the case documents", items: [
          f("Symptoms have persisted for 14 months."), f("The patient has poor sleep."),
          f("Weight increased by approximately 6 kg during the 14-month period. This is not unexplained weight loss and is not proof of serious pathology.", D),
          f("CT reports minor disc bulges and no nerve-root involvement."), f("The supplied case reports no neurological abnormality detected."),
        ] },
        { type: "facts", title: "Still to check", items: [
          f("Individual cauda equina screening questions.", S), f("Detailed progressive neurological history.", S), f("Other relevant red-flag history and clinical context.", S),
        ] },
      ],
      mcqs: [{
        id: "q3", q: "During this consultation, the patient reports new urinary retention and numbness around the saddle region. What is the most appropriate action?",
        options: [
          { id: "A", text: "Continue routine lumbar mobility testing and reassess next week.", why: "Incorrect. These symptoms may indicate a time-critical neurological emergency and should not wait for routine reassessment." },
          { id: "B", text: "Start lumbar strengthening and provide reassurance that the symptoms are caused by chronic pain.", why: "Incorrect. Exercise and reassurance must not delay urgent assessment when a serious cause is suspected." },
          { id: "C", text: "Arrange urgent emergency medical assessment for possible cauda equina syndrome.", why: "Correct. New urinary retention with saddle sensory disturbance requires urgent emergency assessment for possible cauda equina syndrome." },
          { id: "D", text: "Interpret the symptoms as fear-avoidance because the patient is worried about her back.", why: "Incorrect. Psychosocial factors must never be used to dismiss possible serious pathology." },
        ],
        correct: "C",
      }],
      reveal: [
        { type: "note", tone: "red", text: "Escalation required if present: new urinary retention or loss of bladder control, new loss of bowel control, new saddle numbness, or new or progressive leg weakness. Arrange urgent emergency medical assessment. Do not continue the ordinary case workflow." },
      ],
      takeaway: "Safety screening comes before routine rehabilitation decisions. If serious pathology is suspected, act on the clinical urgency rather than completing the ordinary case workflow.",
      nextLabel: "Continue to Psychosocial and Occupational Assessment",
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "s4", title: "Understand What May Be Maintaining Disability",
      task: "Recognise potentially modifiable psychosocial and occupational barriers without blaming the patient.",
      objective: "Identify relevant fear-avoidance beliefs, expectations, mood, activity changes, social effects and work-related factors.",
      mood: "Worried and uncertain",
      art: "lumbar-patient-think",
      quote: "I am worried that the disc changes on my scan mean my back is damaged. I avoid doing things because I do not want to make it worse. I keep thinking that I need to find the right person who can fix it.",
      blocks: [
        { type: "groups", title: "Factors influencing recovery", groups: [
          { title: "Beliefs and expectations", icon: "brain", items: [f("The patient believes the right practitioner will fix her problem."), f("She is concerned about the CT report and disc pathology.")] },
          { title: "Activity", icon: "walk", items: [f("She has reduced activity to avoid pain.")] },
          { title: "Mood and social participation", icon: "heart", items: [f("She has been assessed as depressed."), f("She has taken antidepressants for three months."), f("She has become short-tempered with family and friends.")] },
          { title: "Family and household", icon: "home", items: [f("Her spouse has taken over housework and shopping.")] },
          { title: "Work", icon: "work", items: [f("She has been off work for six months."), f("The original injury occurred during automotive assembly work."), f("The job involves a physical work context.")] },
        ] },
        { type: "terms", title: "Know the terms", terms: [
          ["Yellow flags", "Psychosocial factors that may be associated with a poorer outcome or barriers to recovery, such as fear of movement, unhelpful beliefs, distress or low confidence."],
          ["Occupational factors", "Work demands, workplace support, job expectations, work absence and barriers to a feasible return-to-work plan."],
          ["Protective factors", "Resources that may support recovery, such as supportive relationships, meaningful activities and access to appropriate care. Do not assume their strength without assessment."],
        ] },
      ],
      mcqs: [{
        id: "q4", q: "Which group of findings most strongly suggests that psychosocial and occupational factors should be explored further?",
        options: [
          { id: "A", text: "Mild facet degeneration alone.", why: "Incorrect. Mild imaging changes alone do not explain the patient's functional presentation or establish a recovery barrier." },
          { id: "B", text: "Fear of worsening damage, reduced activity, depression, prolonged work absence and concerns about the CT report.", why: "Correct. These documented findings indicate several potentially relevant barriers and justify a person-centred biopsychosocial assessment." },
          { id: "C", text: "Gluteal pain alone.", why: "Incorrect. Gluteal pain is part of the symptom distribution, but it does not identify the psychosocial factors affecting recovery." },
          { id: "D", text: "A history of cholecystectomy six years ago.", why: "Incorrect. The previous surgery belongs in the medical history, but no connection to the current presentation is established in the source case." },
        ],
        correct: "B",
      }],
      reveal: [],
      takeaway: "Yellow flags are signals to assess and address potentially modifiable barriers—not proof that pain is psychological. Ask what the patient believes, fears and needs to resume meaningful activities.",
      nextLabel: "Continue to Objective Examination",
    },

    // ───────────────────────── 5 ─────────────────────────
    {
      id: "s5", title: "Choose Your Examination",
      task: "Decide what to assess before the documented findings are shown. This is a decision-making simulation.",
      objective: "Select a focused, safe examination that considers lumbar movement, neurological status, neural mobility and functional limitations.",
      mood: "Waiting for the examination",
      blocks: [
        { type: "examPicker", title: "Tap the examinations you would perform", cards: [
          { id: "obs", label: "General observation and gait", icon: "eye", relevant: true },
          { id: "rom", label: "Lumbar active range of motion", icon: "move", images: ["rom_lflex", "rom_lext", "rom_lrotl", "rom_lrotr"], relevant: true },
          { id: "palp", label: "Lumbar palpation", icon: "hand", relevant: true },
          { id: "neuro", label: "Lower-limb neurological examination", icon: "neuro", relevant: true },
          { id: "neural", label: "Neural mobility", icon: "nerve", images: ["st_slr_test"], relevant: true },
          { id: "func", label: "Functional tolerance and activity", icon: "walk", relevant: true },
          { id: "other", label: "Other relevant examination based on the history", icon: "plus", relevant: false, note: "No other examination findings are documented in this case." },
        ] },
      ],
      mcqs: [{
        id: "q5", q: "Which examination strategy is most appropriate for this presentation?",
        options: [
          { id: "A", text: "Examine only lumbar palpation because local tenderness will identify the exact pain source.", why: "Incorrect. Palpation tenderness is nonspecific and cannot independently confirm the exact pain generator." },
          { id: "B", text: "Use a structured, symptom-guided examination of lumbar movement, neurological status, neural mobility, gait and relevant function.", why: "Correct. A structured examination integrates movement, neurological status, neural mobility and function with the history and safety assessment." },
          { id: "C", text: "Perform repeated high-force spinal manipulation to determine whether the pain is mechanical.", why: "Incorrect. Repeated high-force procedures are not an appropriate substitute for a reasoned assessment." },
          { id: "D", text: "Avoid all physical examination because the patient has depression.", why: "Incorrect. Depression does not remove the need for an appropriate physical examination." },
        ],
        correct: "B",
      }],
      reveal: [
        { type: "groups", title: "Documented examination findings", groups: [
          { title: "General observation and gait", items: [f("Grimacing and placing a hand on the back."), f("Frequent changes between sitting and standing."), f("Slow, guarded gait.")] },
          { title: "Palpation", items: [f("Central L1–L5 palpation is painful."), f("Unilateral pressures are painful on both sides from L1–L5.")] },
          { title: "Lumbar movement", items: [f("Flexion: limited to approximately 2 cm above the knee."), f("Extension: moderately limited, approximately half the expected range."), f("Seated rotation: approximately 40° to each side.")] },
          { title: "Neural mobility", items: [f("SLR right: 50°."), f("SLR left: 50°."), f("Full knee extension possible in upright sitting."), f("Slump test: not evaluated.", S)] },
          { title: "Neurological examination", items: [f("No neurological abnormality detected in the supplied case.")] },
        ] },
        { type: "facts", title: "Clinical interpretation", items: [
          f("These findings indicate limited lumbar movement, pain on palpation, guarded movement and reduced tolerance. They must be interpreted alongside the history and functional limitations.", I),
          f("The SLR values alone do not establish nerve-root compression. The source case does not report leg pain or an abnormal neurological examination.", I),
        ] },
      ],
      takeaway: "A useful examination tests a reasoned hypothesis, screens relevant systems and measures meaningful functional limitations. No single finding should be treated as the diagnosis.",
      nextLabel: "Next: Investigations and Interpretation",
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "s6", title: "What Do the Imaging Results Actually Mean?",
      task: "Interpret imaging without attributing all symptoms to structural findings.",
      objective: "Integrate imaging, symptoms and examination results to develop a cautious, evidence-informed clinical interpretation.",
      mood: "Waiting for the results",
      blocks: [
        { type: "imaging", title: "Investigations", cards: [
          { title: "X-ray", text: "Mild bilateral L4–L5 facet degeneration." },
          { title: "CT", text: "Minor disc bulges at L4–L5 and L5–S1, with no nerve-root involvement reported." },
        ] },
      ],
      mcqs: [
        {
          id: "q6a", q: "Which interpretation of the imaging is most appropriate?",
          options: [
            { id: "A", text: "The disc bulges prove that the patient has nerve-root compression.", why: "Incorrect. The CT explicitly reports no nerve-root involvement, and the case does not report leg pain." },
            { id: "B", text: "Mild facet degeneration proves that both facet joints are the sole pain source.", why: "Incorrect. Mild facet degeneration does not independently establish that the facets are the sole source of pain." },
            { id: "C", text: "The imaging shows relatively minor structural changes that must be interpreted alongside symptoms and examination findings; the reports do not establish a single pain generator.", why: "Correct. Imaging is one part of the clinical picture. The symptom pattern, examination, function and broader context also matter." },
            { id: "D", text: "The scan proves that the pain is psychological.", why: "Incorrect. Lack of a major structural explanation does not mean that pain is imaginary or exclusively psychological." },
          ],
          correct: "C",
        },
        {
          id: "q6b", q: "Which finding most directly argues against assuming a clinically significant nerve-root syndrome from the available information?",
          options: [
            { id: "A", text: "Pain in both gluteal regions.", why: "Incorrect. Gluteal pain alone is insufficient to establish a nerve-root syndrome." },
            { id: "B", text: "No leg pain reported, no neurological abnormality detected and no nerve-root involvement reported on CT.", why: "Correct. These documented features do not support confidently diagnosing a nerve-root syndrome from the supplied case. They do not remove the need to reassess if new symptoms develop." },
            { id: "C", text: "The patient's weight gain.", why: "Incorrect. Weight gain is relevant to general health and activity but does not establish nerve-root involvement." },
            { id: "D", text: "Poor sleep.", why: "Incorrect. Poor sleep is clinically important but does not establish nerve-root compression." },
          ],
          correct: "B",
        },
      ],
      reveal: [],
      takeaway: "Imaging must be interpreted in context. Do not confuse a structural finding with a confirmed pain source, and do not use a scan to dismiss the patient's symptoms.",
      nextLabel: "Continue to Clinical Impression",
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "s7", title: "Bring the Findings Together",
      task: "Synthesise the history, examination, investigations and recovery barriers.",
      objective: "Form a defensible physiotherapy clinical impression without overdiagnosing a specific structure or attributing symptoms to a single domain.",
      mood: "Thinking",
      blocks: [
        { type: "groups", title: "Evidence panel", groups: [
          { title: "Subjective", items: [f("14-month history of worsening low back pain."), f("Central pain radiating to both gluteal regions."), f("No leg pain reported."), f("Pain and stiffness limit sitting, standing, walking, shopping and housework."), f("Poor sleep."), f("Six months off work.")] },
          { title: "Objective", items: [f("Slow, guarded gait."), f("Limited lumbar flexion, extension and rotation."), f("Painful lumbar palpation."), f("SLR 50° bilaterally."), f("No neurological abnormality detected.")] },
          { title: "Investigations", items: [f("Mild L4–L5 facet degeneration."), f("Minor L4–L5 and L5–S1 disc bulges without reported nerve-root involvement.")] },
          { title: "Psychosocial and occupational context", items: [f("Fear of worsening damage."), f("Reduced activity."), f("Concern about scan findings."), f("Depression."), f("Prolonged work absence."), f("Household activity changes.")] },
        ] },
      ],
      mcqs: [{
        id: "q7", q: "Which clinical impression best integrates the available evidence?",
        options: [
          { id: "A", text: "Confirmed L5 radiculopathy due to a severe disc herniation.", why: "Incorrect. The source does not document a severe herniation, leg pain or a neurological abnormality supporting this diagnosis." },
          { id: "B", text: "Persistent disabling low back pain with movement and functional limitations, alongside psychosocial and occupational factors that may influence recovery.", why: "Correct. This interpretation reflects the duration, functional burden, examination and wider context without claiming a confirmed single pain generator." },
          { id: "C", text: "Facet joint pain is definitively the sole source of the patient's symptoms.", why: "Incorrect. Mild facet degeneration and local tenderness are insufficient to prove that the facets are the sole pain source." },
          { id: "D", text: "The patient has no genuine physical problem because the imaging changes are minor.", why: "Incorrect. The patient has documented pain, limited movement and substantial functional disability. Minor imaging findings do not invalidate these symptoms." },
        ],
        correct: "B",
      }],
      reveal: [
        { type: "impression", title: "Physiotherapy clinical impression",
          paragraphs: [
            "Persistent disabling low back pain of approximately 14 months' duration, with central lumbar pain radiating into both gluteal regions, restricted lumbar movement, painful palpation, guarded gait and substantial activity limitation.",
            "The supplied findings do not establish a single structural pain generator or confirm a nerve-root syndrome. Fear of harm, activity avoidance, depression, scan-related concerns and prolonged work absence are important factors to assess and address as part of an individualised biopsychosocial rehabilitation plan.",
          ],
          lists: [
            ["Key impairments", ["Pain.", "Reduced lumbar movement.", "Guarded movement and gait.", "Reduced tolerance for prolonged positions and walking."]],
            ["Functional limitations", ["Sitting, standing and walking limited to approximately 15 minutes.", "Difficulty shopping and completing housework.", "Poor sleep.", "Unable to return to work for six months."]],
            ["Important clinical considerations", ["Continue appropriate safety monitoring.", "Reassess if symptoms change.", "Explore beliefs, goals, mood, confidence and occupational barriers.", "Avoid assuming a single structural cause from imaging alone."]],
          ] },
      ],
      takeaway: "Clinical reasoning is the integration of evidence. A strong impression describes what is known, what matters functionally, what may influence recovery and what remains uncertain.",
      nextLabel: "Continue to Management",
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "s8", title: "Build an Individualised Management Plan",
      task: "Prioritise active rehabilitation, self-management, functional goals and barriers to return to work.",
      objective: "Choose a management approach that addresses physical limitations, patient beliefs, activity avoidance and occupational needs while remaining person-centred.",
      mood: "Hopeful but unsure",
      blocks: [
        { type: "priorities", title: "Management priorities", items: [
          ["Priority 1: Shared understanding and reassurance", ["Ask what the patient thinks the scan means.", "Explain that the scan reports minor changes and no nerve-root involvement.", "Explain that scan findings alone do not establish the source or severity of pain.", "Avoid dismissive statements such as “nothing is wrong.”", "Validate the pain and its effect on daily life."]],
          ["Priority 2: Gradual return to activity", ["Agree on achievable activity goals with the patient.", "Use graded, individualised activity rather than prescribing a one-size-fits-all programme.", "Build tolerance for walking, sitting, standing and meaningful daily activities.", "Monitor symptom response and function.", "Progress according to capability, preferences, response and clinical reassessment."]],
          ["Priority 3: Exercise and functional rehabilitation", ["Select suitable exercise based on assessment, capability, preferences and goals.", "Develop lumbar and general physical capacity progressively.", "Include meaningful functional practice.", "Avoid implying that a specific exercise is mandatory for every patient."]],
          ["Priority 4: Address psychosocial barriers", ["Explore fear of movement and beliefs about damage.", "Discuss self-management and confidence.", "Consider psychological support or a combined physical and psychological approach when indicated.", "Treat depression respectfully and coordinate with appropriate health professionals when needed."]],
          ["Priority 5: Occupational rehabilitation", ["Explore the patient's job demands and concerns about returning to work.", "Consider workplace assessment and appropriate liaison with the employer or occupational health services, with consent.", "Develop a feasible graded return-to-work plan where appropriate.", "Consider temporary task modification and pacing.", "Do not assume that the patient can return immediately to full duties."]],
          ["Priority 6: Review outcomes", ["Reassess pain, function, movement, activity tolerance, confidence and work participation.", "Use the Oswestry Disability Index and an appropriately standardised pain rating when suitable.", "Review whether the plan needs adjustment.", "Escalate or refer if new concerning findings arise."]],
        ] },
      ],
      mcqs: [{
        id: "q8", q: "Which management approach is most appropriate for this patient?",
        options: [
          { id: "A", text: "Continue passive treatment indefinitely and wait for pain to disappear before increasing activity.", why: "Incorrect. Passive treatment alone does not address the full functional and psychosocial picture. Waiting for all pain to disappear before any activity may reinforce avoidance." },
          { id: "B", text: "Prescribe the same intensive exercise programme used for every patient with low back pain.", why: "Incorrect. Exercise should be tailored to the patient's needs, capability, preferences and response." },
          { id: "C", text: "Develop a collaborative, individualised programme combining education, graded activity/exercise, functional goals, psychosocial support where appropriate and return-to-work planning.", why: "Correct. This plan addresses the interacting physical, psychological and occupational factors documented in the case." },
          { id: "D", text: "Tell the patient that the scan is normal and that she must return to full work immediately.", why: "Incorrect. The scan is not entirely normal, the patient has substantial symptoms and disability, and return to work should be planned collaboratively and safely." },
        ],
        correct: "C",
      }],
      reveal: [
        { type: "planBuilder", title: "Management plan builder", prompt: "Choose three initial priorities, then say why. Each choice is checked against the documented problems.", picks: 3, options: [
          { id: "edu", label: "Patient education and shared understanding", link: "Documented: concern about the CT report and disc pathology; believes the right practitioner will fix her problem." },
          { id: "walk", label: "Graded walking and activity tolerance", link: "Documented: sitting, standing and walking limited to approximately 15 minutes; activity reduced to avoid pain." },
          { id: "ex", label: "Individualised exercise", link: "Documented: limited lumbar movement, guarded gait and reduced activity." },
          { id: "func", label: "Functional practice for daily activities", link: "Documented: difficulty with shopping and housework; spouse has taken these over." },
          { id: "fear", label: "Confidence and fear-avoidance discussion", link: "Documented: fear of worsening damage and reduced activity to avoid pain." },
          { id: "psy", label: "Psychological support when appropriate", link: "Documented: assessed as depressed, antidepressants for three months, short-tempered with family and friends." },
          { id: "occ", label: "Occupational or workplace assessment", link: "Documented: assembly work, off work for six months, original injury at work." },
          { id: "rtw", label: "Graded return-to-work planning", link: "Documented: off work for six months; being off work has not led to improvement." },
          { id: "out", label: "Outcome monitoring and reassessment", link: "Documented: Oswestry Disability Score 72%, VAS 7.5 after 15 minutes of standing or sitting." },
        ], afterNote: "Every option here is relevant to a documented problem, so there is no single right set of three. What matters is that your choices and your reasons connect to what the case documents. Safety monitoring continues alongside whatever you choose." },
      ],
      takeaway: "Management should target meaningful function and the patient's individual barriers. Active rehabilitation, education and appropriate psychosocial and occupational support can be combined according to clinical need.",
      nextLabel: "Complete the Case",
      needs: "planBuilder",
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "s9", title: "Case Complete: What Have You Learned?",
      task: "Consolidate your clinical reasoning with a summary of the case.",
      objective: "Review the whole case and the principle that links it together.",
      mood: "Relieved",
      blocks: [
        { type: "report", title: "Final case summary", rows: [
          ["Patient", "49-year-old female automotive assembly worker."],
          ["Presentation", "Persistent low back pain for approximately 14 months, radiating into both gluteal regions, with no leg pain reported."],
          ["Main functional limitations", "Sitting, standing and walking for approximately 15 minutes; shopping, housework, sleep and work participation."],
          ["Objective findings", "Guarded gait, limited lumbar movement, painful lumbar palpation, SLR 50° bilaterally and no neurological abnormality detected in the supplied case."],
          ["Outcome measures", "Oswestry Disability Score 72%. VAS pain 7.5 after 15 minutes of standing or sitting."],
          ["Investigations", "Mild bilateral L4–L5 facet degeneration and minor L4–L5/L5–S1 disc bulges without reported nerve-root involvement."],
          ["Important recovery factors", "Fear of worsening damage, reduced activity, concern about imaging, depression and prolonged work absence."],
          ["Clinical impression", "Persistent disabling low back pain with physical limitations and relevant psychosocial and occupational contributors. The available information does not confirm a single structural pain generator."],
        ], listTitle: "Initial management priorities", list: [
          "Appropriate safety screening and ongoing monitoring.", "Education and shared understanding.", "Individualised graded activity and exercise.", "Functional goal-setting.",
          "Psychosocial support where indicated.", "Occupational and return-to-work planning.", "Reassessment using appropriate outcome measures.",
        ] },
      ],
      mcqs: [{
        id: "q9", q: "Which principle best summarises the reasoning required in this case?",
        options: [
          { id: "A", text: "Every patient with persistent back pain must have one identifiable structural lesion.", why: "Incorrect. Persistent low back pain may not have a single confirmed structural pain generator." },
          { id: "B", text: "A patient with depression should be managed primarily as a psychological case.", why: "Incorrect. Depression is relevant, but the patient's physical symptoms and functional needs must also be assessed and managed." },
          { id: "C", text: "Effective clinical reasoning integrates the patient's history, examination, investigations, function, safety and personal context while recognising uncertainty.", why: "Correct. A sound clinical impression integrates multiple domains, avoids unsupported conclusions and guides an individualised plan." },
          { id: "D", text: "If previous treatment fails, the only next step is more intensive passive treatment.", why: "Incorrect. Lack of benefit from previous treatment is a reason to reassess the overall approach, not automatically increase passive treatment." },
        ],
        correct: "C",
      }],
      reveal: [],
      takeaway: "A physiotherapist must understand the whole presentation, assess safety, interpret findings in context, identify modifiable barriers and collaborate with the patient on a realistic plan for improved function.",
      nextLabel: null,
    },
  ],

  references: [
    {
      title: "National Institute for Health and Care Excellence (NICE). Low back pain and sciatica in over 16s: assessment and management. Guideline NG59.",
      url: "https://www.nice.org.uk/guidance/ng59/chapter/recommendations",
      points: [
        "Consider risk stratification.", "Tailor support to the patient's risk and needs.", "Provide information and advice that supports self-management.", "Encourage appropriate normal activity.",
        "Consider exercise programmes based on patient needs and capabilities.", "Consider psychological approaches as part of an appropriate treatment package.",
        "Consider combined physical and psychological programmes for persistent low back pain with significant psychosocial obstacles.",
        "Do not routinely offer imaging in non-specialist settings; imaging should be considered when it is likely to change management.",
      ],
    },
    {
      title: "World Health Organization. WHO guideline for non-surgical management of chronic primary low back pain in adults in primary and community care settings. Geneva: WHO; 2023.",
      url: "https://www.who.int/publications/b/71563",
      url2: "https://www.ncbi.nlm.nih.gov/books/NBK599213/",
      points: [
        "A thorough clinical assessment from a biopsychosocial perspective is important.", "Personalised education and advice can support self-management.",
        "Structured exercise programmes may be offered as part of care.", "Psychological interventions such as cognitive behavioural therapy may form part of an appropriate plan.",
        "Multicomponent biopsychosocial care may be appropriate when physical, psychological and social needs interact.",
        "Recommendations must be interpreted in the context of the patient's needs, available evidence and clinical circumstances.",
      ],
    },
    {
      title: "Supplied source case: “Low Back Pain — Case Two,” Chapter 8, supplied by the user.",
      points: [
        "The authority for the patient's age, occupation, symptom history, examination measurements, imaging results, outcome scores and documented psychosocial factors.",
        "Full bibliographic details (author, title, publisher, edition, year, page) have not been supplied, so none are shown.",
      ],
    },
  ],
};

// Case Simulator content: "Case 1: Knee Pain" (45-year-old man).
// Copied word for word from Aditi's mockup screens (2026-10-10), which she
// confirmed is clinically right -- nothing here was written by the app's
// developer. Review the wording before relying on it.
//
// Stages 5-7 (findings, clinical reasoning, summary) come from her later
// mockup. Where the mockup does not show something, it is left out or shown as
// "not available" -- nothing is invented:
//  - a "why" for the right answers of stages 2-6 (only stage 1 shows one);
//  - findings for Special Tests and the Patellofemoral assessment;
//  - Learning Points and References;
//  - marks/points per question.
// The right answer of stages 2-6 is the option the mockup follows or marks.
//
// Pictures: an existing app picture (Cloudinary id) is only used where the app
// really has one for that assessment (rom_kflex, rom_kext, mmt_quad). The app
// has none for knee observation, sit-to-stand or a physio examining a patient,
// so those show no picture.

export const SIM_PATIENTS = [
  { id: "knee", art: "patient-1", title: "Knee Pain", tag: "Orthopaedics", sub: "45 y/o male", line: "Difficulty with stairs", live: true },
  { id: "neck", art: "patient-2", title: "Neck Pain", tag: "Musculoskeletal", sub: "28 y/o female", line: "Office worker" },
  { id: "back", art: "patient-3", title: "Low Back Pain", tag: "Spine", sub: "52 y/o male", line: "Pain while bending" },
  { id: "shoulder", art: "patient-4", title: "Shoulder Pain", tag: "Orthopaedics", sub: "35 y/o female", line: "Difficulty reaching" },
  { id: "breath", art: "patient-5", title: "Breathlessness", tag: "Cardiorespiratory", sub: "60 y/o male", line: "Reduced exercise tolerance" },
];

export const KNEE_CASE = {
  title: "Case 1: Knee Pain",
  stages: [
    {
      patient: [
        "Hi Doctor... My right knee has been hurting for the past two months.",
        "It hurts more when I climb stairs or get up from a chair.",
        "Sometimes it feels stiff in the morning.",
      ],
      ask: "Let's start with your assessment. What would you like to do first?",
      options: [
        "Ask more questions about symptoms and history",
        "Screen for red flags",
        "Perform special tests now",
        "Make a diagnosis",
      ],
      correct: 0,
      goodChoice: "Good choice!",
      goodLine: "It's important to understand the patient's story first.",
      explain: "Start with a focused subjective assessment. This helps you understand symptom behaviour, functional limitations and screen for red flags.",
    },
    {
      patient: [
        "The pain started around two months ago. I don't remember any injury. It's worse with stairs and walking.",
        "In the morning it feels stiff, but it gets better after I start moving.",
      ],
      notice: "Before proceeding, it is important to screen for concerning symptoms.",
      ask: "Which question would be the best next priority?",
      options: [
        "Does your knee make a clicking sound when you walk?",
        "Have you had any fever, red hot swollen knee or feeling unwell?",
        "Can you perform a deep squat so I can observe your knee?",
        "Have you had an X-ray?",
      ],
      correct: 1,
      reply: {
        patient: ["No, I haven't had a fever or felt unwell. My knee isn't particularly hot or red. I can still walk. It's just painful when I do too much."],
        checklistTitle: "Red flag screen",
        checklist: ["No fever or systemic illness", "No hot, red swollen knee", "No major trauma", "Can still walk"],
        bot: "Great! No concerning red flags. Now let's explore the symptom behaviour and functional limitations.",
      },
    },
    {
      ask: "Which follow-up question would best help you understand the symptom behaviour and its impact on daily function?",
      options: [
        "Does your knee hurt more when you walk downhill than uphill?",
        "How long does the morning stiffness last, does the pain settle with rest, and which daily activities are you now unable to do?",
        "Can you point to the exact ligament you think is injured?",
        "Would you like me to perform the Lachman test now?",
      ],
      correct: 1,
      reply: {
        patient: [
          "The stiffness lasts about 10 minutes in the morning.",
          "If I walk for 20–30 minutes or climb stairs, the pain increases. It settles when I rest.",
          "Getting up from a low chair is difficult, so I try to avoid stairs now.",
        ],
        infoTitle: "Key information",
        info: [
          ["Morning stiffness", "~10 minutes"],
          ["Worse with", "walking, stairs, rising from chair"],
          ["Better with", "rest"],
          ["Functional impact", "difficulty with low chair, avoids stairs"],
        ],
      },
    },
    {
      historyDone: {
        patient: "As I told you, my knee is stiff for about 10 minutes in the morning. It gets easier after I start moving. If I walk for 20–30 minutes or climb stairs, the pain increases. Getting up from a low chair is difficult, so I avoid stairs when possible.",
        bot: "Great! You've gathered the patient's history. Now let's decide what to examine.",
        infoTitle: "Patient information (from your questions)",
        info: [
          ["clock", "Morning stiffness", "~ 10 minutes"],
          ["walk", "Worse with", "Walking, stairs"],
          ["leaf", "Better with", "Rest"],
          ["person", "Functional limitations", "Difficulty low chair, avoids stairs"],
        ],
      },
      ask: "You are now ready for the physical examination. What is the best initial approach?",
      options: [
        "Perform Lachman test and anterior drawer immediately.",
        "Start with observation, pain location, swelling and knee ROM, then functional assessment.",
        "Perform deep squat and repeated stair climbing until the pain appears.",
        "Diagnose osteoarthritis and start strengthening.",
      ],
      correct: 1,
    },
    {
      kind: "findings",
      examTitle: "Select an examination to perform",
      exams: [
        { id: "obs", label: "Observation & Swelling", icon: "eye", findings: ["Mild swelling around the joint", "No redness or warmth", "Normal skin appearance", "Mild varus alignment (visual observation)"] },
        { id: "rom", label: "Knee Range of Motion", icon: "move", images: ["rom_kflex", "rom_kext"], findings: ["Flexion slightly reduced"] },
        { id: "mmt", label: "Muscle Strength (MMT)", icon: "dumbbell", images: ["mmt_quad"], findings: ["Quadriceps mild weakness"] },
        { id: "func", label: "Functional Test (Sit to Stand)", icon: "person", findings: ["Difficulty sit to stand"] },
        { id: "special", label: "Special Tests", icon: "flask" },
        { id: "pf", label: "Patellofemoral Assessment", icon: "knee" },
      ],
      ask: "Based on the findings so far, which is the most appropriate next examination to assess functional impact?",
      options: [
        "Assess knee range of motion (flexion and extension).",
        "Perform muscle strength testing of quadriceps.",
        "Assess functional task such as sit to stand or step up.",
        "Perform a McMurray test immediately.",
      ],
      correct: 2,
    },
    {
      kind: "reasoning",
      ask: "What is the most likely clinical impression based on the history and examination findings in this case?",
      options: [
        "Knee osteoarthritis (degenerative knee joint changes)",
        "Patellofemoral pain syndrome",
        "Medial meniscus tear",
        "Rheumatoid arthritis",
      ],
      correct: 0,
    },
  ],
  summary: {
    level: "Intermediate",
    clinical: [
      ["person", "45 y/o male", "Knee pain, difficulty with stairs"],
      ["clock", "Morning stiffness", "~ 10 minutes"],
      ["walk", "Worse with", "Walking, stairs, prolonged activity"],
      ["leaf", "Better with", "Rest"],
      ["person", "Functional limitations", "Difficulty low chair, avoids stairs"],
    ],
    findings: [
      ["eye", "Observation", "Mild swelling, mild varus alignment"],
      ["move", "Range of Motion", "Flexion slightly reduced"],
      ["dumbbell", "Muscle Strength", "Quadriceps mild weakness"],
      ["person", "Functional Test", "Difficulty sit to stand"],
    ],
    tutor: "Well done! You used a structured approach, gathered the key information and interpreted the findings logically. Remember: this is a clinical impression based on the available data, not a confirmed diagnosis.",
    // Not in the mockup, so those two tabs say "not available yet".
    learningPoints: null,
    references: null,
  },
};

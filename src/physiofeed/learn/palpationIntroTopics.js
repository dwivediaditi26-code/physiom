// General palpation-technique orientation content shown above the body-
// region grid in Palpation study mode. Written originally for this app --
// not sourced or paraphrased from any single reference. "What is
// palpation?" and "How to palpate" cover the same ground any manual-
// therapy foundations course does (touch as an assessment skill,
// pressure/pace/landmark technique); "Normal vs abnormal findings" and
// "Clinical precautions" are standard clinical-practice knowledge, not
// specific to any one textbook.
export const PALPATION_INTRO_TOPICS = [
  {
    id: "what_is_palpation",
    icon: "❓",
    title: "What is palpation?",
    summary: "Touch as a clinical assessment skill",
    body: [
      "Palpation is the use of touch to gather clinical information — locating a specific anatomical structure, then judging its condition once you're on it. It sits alongside observation and history-taking as one of the three core hands-on assessment skills.",
      "Two separate jobs happen every time you palpate. First, you locate the target structure and confirm its borders — where it starts, where it ends, what's next to it. Second, once located, you assess it: is the tissue supple or guarded, tender or comfortable, symmetric with the other side or not. Skipping straight to assessment without confidently locating the structure first is the most common source of unreliable findings.",
      "Palpation isn't purely a hands skill — it's a hands-plus-anatomy-knowledge skill. The more clearly you can picture what's under your fingers (which layer, which direction the fibres run, what's deep to it), the more useful the sensory information you pick up becomes.",
    ],
  },
  {
    id: "how_to_palpate",
    icon: "✋",
    title: "How to palpate",
    summary: "Pressure, pace, and landmark technique",
    body: [
      "A few habits separate reliable palpation from guesswork:",
      "• Slow down. Interpreting what your fingers are feeling takes a moment — moving quickly from spot to spot doesn't give that process time to happen.",
      "• Match pressure to purpose. Superficial, easily-visible structures (an epicondyle, a well-developed muscle belly) need only light contact. Deeper structures need firmer, sustained pressure to reach past the tissue in front of them. Either way, sink in until you feel resistance build (a \"tissue barrier\"), then explore that layer rather than forcing through it.",
      "• Use finger pads, not fingertips. Pads are more sensitive and read as a palpation to the client rather than a poke.",
      "• Find a landmark first, then move off it. Locating a clear reference point (a bony prominence, the edge of an adjacent muscle) and stepping a known distance off it is far more reliable than trying to find a deep or ambiguous structure directly.",
      "• Bring the muscle to life, then let it rest. Cueing a small, controlled contraction of the target muscle — then having the client relax — lets you compare active and resting tone, and confirms you're actually on the structure you think you are.",
      "• Brush across the fibres, not along them. Palpating perpendicular to a muscle's fibre direction (\"strumming\") makes its borders and texture far easier to distinguish from the tissue around it.",
      "• Work in small increments (\"baby steps\") when tracing a structure toward a hard-to-reach attachment, confirming with a contraction cue every step or two rather than jumping straight to the end point.",
      "• Palpation doesn't stop when treatment starts. Keep reading tissue response while you work, not just during the initial assessment — it should inform how you adjust pressure and technique in real time.",
    ],
  },
  {
    id: "normal_abnormal",
    icon: "✅",
    title: "Normal vs abnormal findings",
    summary: "What you're comparing against",
    body: [
      "Most palpation findings only mean something in comparison — to the other side of the body, to the surrounding tissue, or to what's expected for that structure and that client.",
      "Normal: tissue that's supple and yields evenly to pressure, a muscle belly that contracts and fully relaxes back to a soft resting tone, no focal tenderness beyond mild discomfort at genuinely deep or sensitive structures, and symmetry between left and right when comparing a paired structure.",
      "Worth flagging: taut, rope-like bands or a distinct nodule within a muscle (often with a reproducible referred pain pattern when pressed); tissue that stays guarded/tense even once the client is told to relax; tenderness clearly out of proportion to normal palpation pressure; noticeable asymmetry in tone, size, or texture between the two sides; warmth, swelling, or boggy tissue suggesting inflammation; and restricted or gritty movement of a structure that should glide smoothly.",
      "A single finding rarely confirms a diagnosis on its own — palpation findings are one input alongside history, observation, and movement testing.",
    ],
  },
  {
    id: "clinical_precautions",
    icon: "⚠️",
    title: "Clinical precautions",
    summary: "Structures and situations that need extra care",
    body: [
      "A handful of regions and situations call for lighter pressure, a different technique, or holding off entirely:",
      "• Vascular structures. The carotid sinus (deep to the SCM) can trigger a reflex drop in blood pressure under firm flat pressure — use a gentle pincer-style contact there instead. Any location with a palpable pulse under your fingers means you've drifted onto a vessel; reposition rather than pressing through it.",
      "• Nerves and neurovascular bundles. The brachial plexus (between the anterior and middle scalenes), the facial nerve (near the styloid process), and similar neurovascular corridors need cautious, aware palpation rather than firm sustained pressure.",
      "• Fragile anterior-neck structures. The trachea and the airway generally should be palpated gently — excessive pressure can trigger coughing or discomfort well before it provides useful clinical information.",
      "• Acute injury or inflammation. Fresh fractures, suspected DVT, acute unhealed wounds, or actively inflamed joints are generally precautions or contraindications for routine palpation until cleared.",
      "• Client comfort and consent. Explain what you're about to do and where, especially before palpating anywhere sensitive, and check in on pressure tolerance as you go rather than assuming.",
      "• Hygiene and hand care. Short, smooth fingernails avoid inadvertently scratching or catching skin, and hands should be clean before and between clients.",
    ],
  },
];

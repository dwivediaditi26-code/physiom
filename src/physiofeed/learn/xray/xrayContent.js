import { makeFixedQuestion } from "../quizKit.js";

// Content lives as plain authored data, same convention as every other Learn
// module (clinicalCases.js, assessmentQuiz.js) -- no CMS/workflow UI exists
// anywhere else in this app either. Each image record still carries
// attribution/license/review-status fields as plain data so a real licensed
// photo can be dropped in later (set cloudinaryName) without touching any
// component. Annotation coordinates are illustrative placements authored for
// teaching purposes, not measurements off a real photo -- reviewerStatus
// flags that they need a clinical eye once a real image is attached.

export const XRAY_REGIONS = [
  { id: "knee", label: "Knee", available: true },
  { id: "shoulder", label: "Shoulder", available: false },
  { id: "spine_cervical", label: "Cervical spine", available: false },
  { id: "spine_lumbar", label: "Lumbar spine", available: false },
  { id: "pelvis_hip", label: "Pelvis and hip", available: false },
  { id: "ankle_foot", label: "Ankle and foot", available: false },
  { id: "elbow_wrist_hand", label: "Elbow, wrist and hand", available: false },
  { id: "chest", label: "Chest", available: false },
];

const apImage = {
  cloudinaryName: "",
  alt: "Normal knee X-ray, AP view",
  projection: "AP view",
  side: "Right knee",
  source: "Placeholder — licensed image pending",
  attribution: "",
  license: "pending",
  reviewerStatus: "placeholder_pending_review",
  annotations: [
    { id: "femur", x: 50, y: 12, label: "Femur", labelX: 22, labelY: 10 },
    { id: "medial-condyle", x: 40, y: 40, label: "Medial condyle", labelX: 18, labelY: 46 },
    { id: "lateral-condyle", x: 60, y: 40, label: "Lateral condyle", labelX: 82, labelY: 40 },
    { id: "joint-space", x: 50, y: 46, label: "Joint space", labelX: 50, labelY: 58 },
    { id: "tibia", x: 50, y: 70, label: "Tibia", labelX: 22, labelY: 78 },
    { id: "fibular-head", x: 62, y: 62, label: "Fibular head", labelX: 84, labelY: 70 },
  ],
};

const lateralImage = {
  cloudinaryName: "",
  alt: "Normal knee X-ray, lateral view",
  projection: "Lateral view",
  side: "Right knee",
  source: "Placeholder — licensed image pending",
  attribution: "",
  license: "pending",
  reviewerStatus: "placeholder_pending_review",
  annotations: [],
};

const oaImage = {
  cloudinaryName: "",
  alt: "Knee X-ray showing osteoarthritis, AP view",
  projection: "AP view, weight-bearing",
  side: "Left knee",
  source: "Placeholder — licensed image pending",
  attribution: "",
  license: "pending",
  reviewerStatus: "placeholder_pending_review",
  annotations: [
    { id: "narrowing", x: 40, y: 47, label: "1 · Narrowing", labelX: 16, labelY: 50 },
    { id: "osteophyte", x: 58, y: 36, label: "2 · Osteophyte", labelX: 84, labelY: 32 },
    { id: "sclerosis", x: 42, y: 55, label: "3 · Sclerosis", labelX: 16, labelY: 68 },
  ],
};

const normalCompareImage = { ...apImage, annotations: [] };

export const KNEE_FINDINGS = [
  {
    id: 1,
    label: "Joint-space narrowing",
    lookAt: "The gap between the femoral condyle and tibial plateau, medial and lateral compartments separately.",
    visible: "A reduced, often non-uniform gap — usually more pronounced in one compartment than the other.",
    difference: "A normal joint space is roughly even across both compartments and clearly wider.",
    relevance: "Suggests compartmental cartilage thinning; distribution (medial vs lateral) helps localize the problem.",
    limitations: "Apparent width changes with positioning and whether the view is weight-bearing — compare like with like.",
  },
  {
    id: 2,
    label: "Marginal osteophytes",
    lookAt: "The edges of the femoral condyles and tibial plateau, where bone meets joint margin.",
    visible: "Small bony outgrowths projecting from the joint margin.",
    difference: "Normal joint margins are smooth, without bony spurs.",
    relevance: "A classic osteoarthritic remodeling response; more osteophytes generally track with more advanced change.",
    limitations: "Small osteophytes can be subtle or overlap with other structures depending on the view.",
  },
  {
    id: 3,
    label: "Subchondral sclerosis",
    lookAt: "The bone directly beneath the joint surface, in the narrowed compartment.",
    visible: "An area of increased bone density/whiteness just under the articular surface.",
    difference: "Normal subchondral bone density is even and matches the rest of the surrounding bone.",
    relevance: "Reflects the bone's response to altered joint loading in that compartment.",
    limitations: "Can be mimicked by projection/positioning artefact — read alongside joint-space and osteophyte findings, not alone.",
  },
];

const q1a = makeFixedQuestion({
  id: "knee-normal-q1",
  topic: "Views",
  question: "Which knee X-ray view is usually taken with the patient standing and bearing weight through the joint?",
  options: ["Weight-bearing AP view", "Standard lateral view", "Skyline (patellar) view", "Non-weight-bearing AP view"],
  correct: "Weight-bearing AP view",
  explanation: "A weight-bearing AP view loads the joint like it is loaded in daily life, which makes true joint-space narrowing easier to see than on a non-weight-bearing film.",
});
const q2a = makeFixedQuestion({
  id: "knee-normal-q2",
  topic: "Anatomy",
  question: "On a normal knee X-ray, the tibiofemoral joint space you see represents:",
  options: [
    "The articular cartilage and meniscus between femur and tibia, which are not directly visible on X-ray",
    "A gap that is always exactly the same width in every patient",
    "The patella's position over the femur",
    "A shadow caused by the fibula",
  ],
  correct: "The articular cartilage and meniscus between femur and tibia, which are not directly visible on X-ray",
  explanation: "X-ray shows bone. The 'joint space' is really the radiolucent gap where cartilage and meniscus sit — its width is an indirect clue to their thickness, not a direct picture of them.",
});
const q3a = makeFixedQuestion({
  id: "knee-normal-q3",
  topic: "Anatomy",
  question: "Which structure sits on the outer (lateral) side of the tibia, just below the knee joint?",
  options: ["Fibular head", "Tibial tuberosity", "Medial malleolus", "Femoral condyle"],
  correct: "Fibular head",
  explanation: "The fibular head articulates with the lateral tibial condyle just below the joint line and is a useful lateral landmark on the AP view.",
});
const q4a = makeFixedQuestion({
  id: "knee-normal-q4",
  topic: "Limitations",
  question: "Which of the following is NOT directly visible on a routine knee X-ray?",
  options: ["The anterior cruciate ligament", "The femoral condyles", "The patella", "The tibial plateau"],
  correct: "The anterior cruciate ligament",
  explanation: "Routine X-rays show bone well but do not directly show ligaments, menisci, most tendons or articular cartilage — those need MRI or other imaging.",
});
const q5a = makeFixedQuestion({
  id: "knee-normal-q5",
  topic: "Systematic reading",
  question: "What is the first step in a systematic knee X-ray reading sequence?",
  options: ["Check alignment", "Measure exact joint-space width in millimetres", "Look for fractures only", "Note the patient's age"],
  correct: "Check alignment",
  explanation: "A reliable sequence starts broad (alignment) before narrowing in on bones, joint spaces, bone density/trabecular pattern and finally soft-tissue clues — checking alignment first avoids missing the bigger picture while focused on a small detail.",
});

const q1b = makeFixedQuestion({
  id: "knee-oa-q1",
  topic: "Osteoarthritis",
  question: "Which feature is characteristic of osteoarthritis but not seen in a normal joint?",
  options: ["Marginal osteophytes", "A symmetrical, even joint space", "Smooth cortical outlines", "A uniform trabecular pattern"],
  correct: "Marginal osteophytes",
  explanation: "Marginal osteophytes are bony outgrowths at the joint margin — a classic osteoarthritic remodeling response not seen on a normal joint.",
});
const q2b = makeFixedQuestion({
  id: "knee-oa-q2",
  topic: "Osteoarthritis",
  question: "Joint-space narrowing in knee osteoarthritis is typically:",
  options: [
    "Non-uniform, often worse in one compartment than the other",
    "Perfectly even across the whole joint",
    "Only ever visible on the lateral view",
    "Removed by taking a non-weight-bearing film",
  ],
  correct: "Non-uniform, often worse in one compartment than the other",
  explanation: "Osteoarthritic narrowing usually affects one compartment (commonly medial) more than the other, unlike a normal, roughly even joint space.",
});
const q3b = makeFixedQuestion({
  id: "knee-oa-q3",
  topic: "Osteoarthritis",
  question: "Subchondral sclerosis refers to:",
  options: [
    "Increased bone density just beneath the joint surface",
    "A soft-tissue swelling around the joint",
    "A fracture line through the bone",
    "Loss of the patella's normal outline",
  ],
  correct: "Increased bone density just beneath the joint surface",
  explanation: "Sclerosis appears as an area of increased whiteness/density in the subchondral bone, reflecting the bone's response to altered loading.",
});
const q4b = makeFixedQuestion({
  id: "knee-oa-q4",
  topic: "Technique",
  question: "Why does a weight-bearing view matter when assessing for knee osteoarthritis?",
  options: [
    "It loads the joint, making true joint-space narrowing easier to see",
    "It removes the need to ever take a lateral view",
    "It shows the meniscus directly",
    "It has no real effect on how the joint space appears",
  ],
  correct: "It loads the joint, making true joint-space narrowing easier to see",
  explanation: "An unloaded (non-weight-bearing) film can make joint space look wider than it really is during function, understating true narrowing.",
});
const q5b = makeFixedQuestion({
  id: "knee-oa-q5",
  topic: "Clinical reasoning",
  question: "Joint-space narrowing and osteophytes on X-ray, on their own, tell you:",
  options: [
    "A radiographic pattern consistent with osteoarthritis — not the patient's pain level or prognosis",
    "Exactly how much pain the patient will have",
    "That surgery is definitely required",
    "Nothing useful without an MRI first",
  ],
  correct: "A radiographic pattern consistent with osteoarthritis — not the patient's pain level or prognosis",
  explanation: "Radiographic severity correlates poorly with pain and function. Findings describe structure, not the patient's symptoms or outlook — always interpret alongside the clinical picture.",
});

export const KNEE_CHAPTERS = [
  { id: "intro", num: 1, title: "Introduction to Knee X-rays", desc: "Views, positioning and key principles", minutes: 5, available: false },
  {
    id: "normal-anatomy",
    num: 2,
    title: "Normal Knee Anatomy",
    desc: "Anatomical structures and normal appearance",
    minutes: 10,
    available: true,
    lesson: {
      title: "Understanding a Normal Knee X-ray",
      subtitle: "Learn the anatomy and the systematic sequence used to inspect a knee radiograph.",
      objectives: [
        "Identify normal anatomical structures on a knee X-ray",
        "Understand what each standard view is used for",
        "Apply a systematic reading approach",
        "Recognize what a normal radiograph does and doesn't show",
      ],
      blocks: [
        { type: "heading", text: "Why views matter" },
        {
          type: "paragraph",
          text: "A knee series is rarely just one image. The AP (anteroposterior) view shows overall alignment and the joint from front to back. The lateral view shows the patella and the front-to-back relationship of femur and tibia. A weight-bearing AP loads the joint the way it's loaded in daily life, which matters most for judging joint-space width. A patellar (skyline) view looks along the kneecap's groove, useful for patellofemoral problems.",
        },
        { type: "image", image: apImage, caption: "AP view — tap Show labels to reveal the annotated structures below." },
        { type: "heading", text: "Normal anatomy" },
        {
          type: "paragraph",
          text: "On a normal AP view you should be able to trace: the distal femur and its two femoral condyles (medial and lateral), the tibial plateau just below the joint line, the fibular head on the outer side, and — when the view includes it — the patella. The tibiofemoral joint space is the gap between condyle and plateau; the patellofemoral relationship describes how the patella sits over the femoral groove. Cortical outlines (the dense white edge of each bone) should be smooth and continuous, and overall alignment should look straight.",
        },
        { type: "image", image: lateralImage, caption: "Lateral view — femur, tibia and patella from the side." },
        { type: "heading", text: "Systematic reading checklist" },
        {
          type: "list",
          items: [
            "Alignment — does the femur sit straight over the tibia?",
            "Bones — is every cortical outline smooth and continuous?",
            "Joint spaces — even width, both compartments?",
            "Density and trabecular pattern — any area unusually dense or unusually lucent?",
            "Soft-tissue clues — any swelling or effusion suggested around the joint?",
          ],
        },
        { type: "heading", text: "Normal versus abnormal" },
        {
          type: "paragraph",
          text: "A normal radiograph is the baseline everything else gets compared against. Knowing exactly what 'normal' looks like — smooth cortex, even joint space, straight alignment — is what makes a genuine abnormality stand out later.",
        },
        { type: "heading", text: "Important limitations" },
        {
          type: "paragraph",
          text: "Routine X-rays show bone very well, but they do not directly show the menisci, the cruciate ligaments, most tendons, or articular cartilage itself. A normal X-ray does not rule out injury to any of these soft structures — it only tells you the bones look normal.",
        },
      ],
      commonMistakes: [
        "Judging joint-space width from a non-weight-bearing film and assuming it reflects the loaded joint.",
        "Assuming a 'normal' X-ray rules out a meniscus or ligament injury.",
        "Skipping the alignment check and going straight to looking for fractures.",
      ],
      quiz: [q1a, q2a, q3a, q4a, q5a],
      references: [
        { text: "Standard musculoskeletal radiographic anatomy — physiotherapy MSK imaging curriculum." },
        { text: "Systematic radiograph reading approach (Alignment–Bone–Cartilage/joint space–Soft tissue), as commonly taught in orthopaedic and physiotherapy training." },
      ],
    },
  },
  { id: "systematic-interpretation", num: 3, title: "Systematic X-ray Interpretation", desc: "A step-by-step reading approach", minutes: 10, available: false },
  {
    id: "osteoarthritis",
    num: 4,
    title: "Knee Osteoarthritis",
    desc: "Radiographic features and examples",
    minutes: 15,
    available: true,
    lesson: {
      title: "Recognizing Knee Osteoarthritis on X-ray",
      subtitle: "Understand the common radiographic features and how they differ from normal.",
      objectives: [
        "Recognize the core radiographic features of knee osteoarthritis",
        "Describe how each feature differs from a normal joint",
        "Understand why projection and weight-bearing affect what you see",
        "Avoid over-interpreting radiographic severity as pain or prognosis",
      ],
      blocks: [
        { type: "heading", text: "The core features" },
        {
          type: "paragraph",
          text: "Knee osteoarthritis has a recognizable radiographic pattern: non-uniform joint-space narrowing (usually worse in one compartment), marginal osteophytes at the joint edges, subchondral sclerosis (increased bone density just under the joint surface), and — in more advanced cases — subchondral cysts and bony remodeling or deformity. These features tend to cluster in one compartment rather than spreading evenly, which is itself a useful clue.",
        },
        { type: "heading", text: "Why projection and loading matter" },
        {
          type: "paragraph",
          text: "A weight-bearing view loads the joint, so true cartilage thinning shows up as real narrowing. A non-weight-bearing film can look deceptively normal. Positioning and beam angle also affect how clearly osteophytes and sclerosis show up — always read findings in the context of how the image was taken.",
        },
        { type: "findings", items: KNEE_FINDINGS },
        { type: "image", image: oaImage, caption: "Numbered findings above correspond to the labels on this image." },
      ],
      commonMistakes: [
        "Reading joint-space width from a non-weight-bearing view and missing true narrowing.",
        "Treating radiographic severity as a direct measure of the patient's pain or function.",
        "Missing that narrowing is compartmental (medial vs lateral) rather than checking the whole joint evenly.",
      ],
      quiz: [q1b, q2b, q3b, q4b, q5b],
      compare: {
        normalImage: normalCompareImage,
        abnormalImage: oaImage,
        explanation: "The normal joint (left) has an even joint space and smooth margins throughout. The osteoarthritic joint (right) shows narrowing concentrated in one compartment, with osteophytes at the margins and a denser band of subchondral bone beneath the narrowed side.",
      },
      references: [
        { text: "Radiographic features of osteoarthritis (joint-space narrowing, osteophytes, subchondral sclerosis) — standard orthopaedic and MSK radiology teaching." },
      ],
    },
  },
  { id: "fractures", num: 5, title: "Knee Fractures", desc: "Patella, tibia, femur and common patterns", minutes: 15, available: false },
  { id: "other-abnormalities", num: 6, title: "Other Radiographic Abnormalities", desc: "Beyond osteoarthritis and fracture", minutes: 12, available: false },
  { id: "clinical-limitations", num: 7, title: "Clinical Interpretation and Limitations", desc: "What an X-ray can and can't tell you", minutes: 8, available: false },
  { id: "practice-cases", num: 8, title: "Practice Cases and Revision", desc: "Test yourself on real-style cases", minutes: 10, available: true },
];

export const KNEE_PRACTICE_CASES = [
  {
    id: "case-1",
    image: apImage,
    question: makeFixedQuestion({
      id: "practice-case-1",
      topic: "Identify the view",
      question: "What view is this X-ray?",
      options: ["AP (anteroposterior) view", "Lateral view", "Skyline (patellar) view", "Oblique view"],
      correct: "AP (anteroposterior) view",
      explanation: "This is an AP view — femur, tibia and fibular head are seen from front to back, with both femoral condyles visible side by side.",
    }),
    explanation: "Structures visible: femur, medial and lateral femoral condyles, tibia, fibular head, and the tibiofemoral joint space.",
  },
  {
    id: "case-2",
    image: oaImage,
    question: makeFixedQuestion({
      id: "practice-case-2",
      topic: "Identify the abnormality",
      question: "Which abnormality, if any, is visible on this X-ray?",
      options: ["Joint-space narrowing with marginal osteophytes", "A displaced fracture", "A normal joint", "A dislocated patella"],
      correct: "Joint-space narrowing with marginal osteophytes",
      explanation: "The compartment shows narrowing, marginal osteophytes and subchondral sclerosis — the pattern taught in the Osteoarthritis chapter. This describes the radiographic appearance only, not the patient's pain level.",
    }),
    explanation: "Supporting findings: non-uniform narrowing, osteophytes at the joint margin, and increased subchondral bone density. Limitation: a single static image can't show how the joint behaves under load through movement.",
  },
];

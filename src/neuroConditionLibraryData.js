// Neuro Condition Library — rich "How to Perform" content (same InfoCard.jsx
// shape as cardiovascularData.js / respiratoryData.js / neuroCoreLibraryData.js)
// for every condition-specific checklist item in NEURO_LIBRARY /
// NEURO_RENDERERS (NeurologicalAssessment.jsx) -- Stroke, Parkinson's
// Disease, Spinal Cord Injury, Multiple Sclerosis, Traumatic Brain Injury,
// Vestibular Disorders, Neuro-Respiratory, Communication/Bulbar,
// Peripheral Nerve, and Ataxia.
//
// Keyed "Category|||Label" -- the exact [cat, label] pairs already used as
// NEURO_LIBRARY items and NEURO_RENDERERS keys, read via condInfo(cat,label)
// in NeurologicalAssessment.jsx. `image: null` throughout — real reference
// photos can be dropped in later without touching any of this structure or
// the renderer wiring, same placeholder pattern InfoCard.jsx already uses.

export const neuroConditionLibraryData = {

  /* ===================== STROKE ===================== */

  "Stroke|||Higher mental function screen": {
    title: "Higher Mental Function Screen",
    icon: "🧠",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Judgement, problem-solving, initiation, safety awareness",
      boxes: [
        { tone: "", label: "👤 Position", text: "Quiet setting, patient alert and able to attend; screen early in the session before fatigue sets in." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe and probe judgement (e.g. 'what would you do if you smelled smoke?'), problem-solving (a simple multi-step task), initiation (does the patient start tasks unprompted or need cueing), and safety awareness (do they recognise their own limitations, e.g. attempting to stand unsupervised when unsafe)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Right-hemisphere strokes classically impair insight/safety awareness more than left-hemisphere strokes — a patient who 'looks fine' cognitively can still be a high fall risk from impaired judgement alone." },
        { tone: "amber", label: "⚠️ Tip", text: "Document objectively (what the patient did/said), not just a global impression — 'attempted to stand without calling for help despite non-weight-bearing precaution' is more useful than 'poor safety awareness'." },
      ],
    },
    scaleLabel: "Domains screened",
    scale: { type: "table", rows: [
      { k: "Judgement", v: "Reasoning through a hypothetical scenario" },
      { k: "Problem-solving", v: "Completing a simple multi-step task" },
      { k: "Initiation", v: "Starts tasks spontaneously vs. needs cueing" },
      { k: "Safety awareness", v: "Recognises own physical/cognitive limitations" },
    ]},
    interpret: {
      normal: ["Intact judgement, initiates appropriately, accurate safety awareness"],
      abnormal: ["Impaired safety awareness → high fall/injury risk, needs close supervision and structured safety education", "Impaired initiation → needs cueing strategies built into the treatment plan"],
      redFlags: ["Impulsivity combined with physical impairment (e.g. non-weight-bearing) — flag prominently for the whole care team, not just therapy notes"],
      note: "This is a bedside screen — formal neuropsychological testing is warranted when findings are equivocal or drive major discharge/return-to-work decisions.",
    },
  },

  "Stroke|||Neglect / inattention": {
    title: "Neglect / Inattention",
    icon: "👁️",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Line bisection, cancellation task, clock drawing",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated at a table, paper centred on their own midline, both eyes open." },
        { tone: "blue", label: "🖐️ Technique", text: "Line bisection: patient marks the midpoint of a horizontal line — a shift toward the non-neglected side is positive. Cancellation/star cancellation: patient crosses out targets scattered across the page — missed targets cluster on the neglected side. Clock drawing: ask the patient to draw a clock face with numbers and set a specific time — crowding or omission on one side suggests neglect." },
        { tone: "purple", label: "🩺 Special consideration", text: "Personal neglect (ignoring the affected limb/body side, e.g. not dressing it, letting it hang off the wheelchair) and extrapersonal neglect (ignoring space around the body) are distinct from visual neglect and each needs its own screen." },
        { tone: "amber", label: "⚠️ Tip", text: "Anosognosia (denial of the deficit itself) often accompanies right-hemisphere neglect — the patient may insist their weak arm is fine even when shown otherwise; this changes the education/safety strategy needed." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Line bisection", v: "Midpoint mark shifted toward non-neglected side = positive" },
      { k: "Cancellation task", v: "Missed targets cluster on the neglected side" },
      { k: "Clock drawing", v: "Numbers crowded/omitted on the affected side" },
    ]},
    interpret: {
      normal: ["Symmetrical performance on bisection/cancellation/clock drawing"],
      abnormal: ["Left visual neglect → most common after right MCA stroke, significantly impacts safety (collisions, missed food on one side of the plate) and rehab potential"],
      note: "Neglect is a stronger negative predictor of functional recovery than motor weakness alone — flag it early to the whole team, not just document it.",
    },
  },

  "Stroke|||Visual field screen": {
    title: "Visual Field Screen (Confrontation)",
    icon: "👁️",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Compare patient's fields to examiner's own, quadrant by quadrant",
      boxes: [
        { tone: "", label: "👤 Position", text: "Sit facing the patient at arm's length, eyes level." },
        { tone: "blue", label: "🖐️ Technique", text: "Cover one of the patient's eyes; ask them to fixate on your face. Bring a wiggling target (finger or pen) in from the periphery in each of the four quadrants and ask the patient to say when they first see it — compare against your own (assumed normal) field at the same point. Repeat for the other eye." },
        { tone: "purple", label: "🩺 Special consideration", text: "A homonymous hemianopia (same-side field loss in both eyes) suggests a lesion posterior to the optic chiasm — very common after posterior circulation/occipital stroke and a major safety hazard (collisions on the affected side)." },
        { tone: "amber", label: "⚠️ Tip", text: "Test each eye separately, not both together — binocular testing can mask a mild unilateral field cut." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Full fields", v: "Target detected in all 4 quadrants, both eyes" },
      { k: "Homonymous hemianopia", v: "Same-side loss in both eyes" },
      { k: "Quadrantanopia", v: "Loss confined to one quadrant" },
    ]},
    interpret: {
      normal: ["Full fields to confrontation, both eyes"],
      abnormal: ["Homonymous hemianopia → scanning/compensation training needed, significant fall and collision risk, affects reading and driving eligibility"],
      note: "Field loss and visual neglect can look similar at the bedside but need different treatment strategies — a field cut is a sensory loss the patient is usually aware of, while neglect is an attentional deficit the patient is often unaware of.",
    },
  },

  "Stroke|||Synergy pattern (UE/LE)": {
    title: "Synergy Pattern (UE/LE)",
    icon: "🦾",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Observe voluntary movement attempts for stereotyped mass patterns",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or supine, limb supported to start; ask for active movement (e.g. 'try to reach forward' or 'try to lift your leg')." },
        { tone: "blue", label: "🖐️ Technique", text: "Watch whether the limb moves as isolated joint motion or as an obligatory mass pattern. Flexor UE synergy: scapular retraction/elevation, shoulder abduction/external rotation, elbow flexion, forearm supination. Extensor UE synergy: scapular protraction, shoulder adduction/internal rotation, elbow extension, forearm pronation. Flexor LE synergy: hip flexion/abduction/external rotation, knee flexion, ankle dorsiflexion/inversion. Extensor LE synergy: hip extension/adduction/internal rotation, knee extension, ankle plantarflexion/inversion." },
        { tone: "purple", label: "🩺 Special consideration", text: "Synergy dominance is a hallmark of Brunnstrom stages II–III — as recovery progresses (stage IV+), movement begins to break free of the obligatory pattern, which is what selective motor control testing captures." },
        { tone: "amber", label: "⚠️ Tip", text: "Test the same movement request in different positions (e.g. gravity-eliminated vs. against gravity) — synergy dominance can look different depending on the demand placed on the limb." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "None", v: "Isolated, selective joint movement available" },
      { k: "Flexor synergy", v: "Obligatory flexor mass pattern on attempted movement" },
      { k: "Extensor synergy", v: "Obligatory extensor mass pattern on attempted movement" },
      { k: "Mixed / emerging", v: "Some out-of-synergy movement beginning to appear" },
    ]},
    interpret: {
      normal: ["No synergy dominance — full isolated joint control"],
      abnormal: ["Strong synergy dominance → early-stage motor recovery (Brunnstrom II–III), treatment focuses on breaking the pattern and facilitating out-of-synergy movement"],
      note: "Document synergy findings alongside the Brunnstrom stage and selective motor control result — together they give a complete picture of upper motor neuron recovery stage.",
    },
  },

  "Stroke|||Selective motor control": {
    title: "Selective Motor Control",
    icon: "🎯",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Ask for an isolated single-joint movement, out of the synergy pattern",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, limb relaxed at the side or supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Request a single-joint, isolated movement that is NOT part of the dominant synergy pattern (e.g. elbow extension with the shoulder held still, rather than the full flexor-synergy reach). Watch for whether the patient can perform it in isolation or whether it triggers the whole mass pattern instead." },
        { tone: "purple", label: "🩺 Special consideration", text: "Selective motor control is the functional counterpart to the Brunnstrom stage — a patient can be 'stage IV' by Brunnstrom criteria yet still have very limited practical selective control in specific joints that matters most for the tasks they need to perform." },
        { tone: "amber", label: "⚠️ Tip", text: "Grade the SAME joint/movement over successive sessions for a meaningful trend — selective control can vary joint to joint within one limb." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "Normal isolated movement", v: "Full, selective, out-of-synergy control" },
      { k: "Movement only within synergy", v: "Joint moves only as part of the mass pattern" },
      { k: "Minimal isolated movement emerging", v: "Small, inconsistent selective movement appearing" },
      { k: "No volitional movement", v: "No active movement at that joint at all" },
    ]},
    interpret: {
      normal: ["Full, selective, isolated control at the joint tested"],
      abnormal: ["Movement confined to synergy → prioritise out-of-synergy facilitation techniques over strengthening within the pattern, which can reinforce it"],
      note: "Selective control, not raw strength, is usually the rate-limiting factor for functional task performance in early post-stroke recovery — weight treatment planning accordingly.",
    },
  },

  "Stroke|||Brunnstrom recovery stage": {
    title: "Brunnstrom Recovery Stage",
    icon: "🔄",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "6-stage model of post-stroke motor recovery, scored separately for arm/hand/leg",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or supine, limb free to move; assess arm, hand, and leg separately as each can be at a different stage." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe spontaneous and requested movement against the 6-stage criteria: I flaccid, no movement → II synergy begins to emerge with rising spasticity → III synergy performed voluntarily, spasticity marked → IV movement starting to break away from synergy → V relative independence from synergy → VI near-normal isolated coordination." },
        { tone: "purple", label: "🩺 Special consideration", text: "The hand has its own criteria distinct from the arm (mass grasp without release → lateral prehension with some release → palmar prehension and cylindrical/spherical grasp → near-normal finger individuation) because hand recovery classically lags behind proximal arm recovery." },
        { tone: "amber", label: "⚠️ Tip", text: "Re-stage regularly (not just at admission) — Brunnstrom stage is one of the most useful ways to communicate a patient's motor recovery trajectory across the whole team in a single shared language." },
      ],
    },
    scaleLabel: "6 stages (Arm / Hand / Leg)",
    scale: { type: "table", rows: [
      { k: "I", v: "Flaccid, no active movement" },
      { k: "II", v: "Synergy begins to emerge, spasticity rising" },
      { k: "III", v: "Synergy performed voluntarily, spasticity marked" },
      { k: "IV", v: "Movement starts to break out of synergy" },
      { k: "V", v: "Relative independence from synergy" },
      { k: "VI", v: "Near-normal isolated movement, spasticity minimal" },
    ]},
    interpret: {
      normal: ["Stage VI — near-normal coordinated movement"],
      abnormal: ["Lower stages (I–III) → treatment prioritises facilitating any voluntary movement and managing rising spasticity; higher stages (IV–VI) → shift toward refining isolated control and functional skill"],
      note: "Compare arm, hand, and leg stages together — a common and clinically important pattern is faster leg recovery than arm/hand, which should shape which functional goals are realistic first.",
    },
  },

  "Stroke|||Fugl-Meyer Assessment": {
    title: "Fugl-Meyer Assessment (FMA)",
    icon: "📊",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Standardised post-stroke impairment measure — UE motor /66, LE motor /34, Balance /14, Sensation /24",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated (most UE/sensation items) and standing/moving for balance items, per the standardised protocol." },
        { tone: "blue", label: "🖐️ Technique", text: "Administer the standardised item set across four domains — upper extremity motor function, lower extremity motor function, balance, and sensation — each item scored 0 (cannot perform) to 2 (performs fully), summed per domain." },
        { tone: "purple", label: "🩺 Special consideration", text: "FMA is an impairment-level measure (what the joint/muscle can do), distinct from activity-level measures like the ARAT — the two are complementary, not interchangeable, and are often paired in stroke rehab research and practice." },
        { tone: "amber", label: "⚠️ Tip", text: "Reserve full FMA administration for baseline and re-assessment milestones (it's lengthy) — use quicker screens like Brunnstrom stage or selective motor control for session-to-session tracking." },
      ],
    },
    scaleLabel: "4 domains (/138 total)",
    scale: { type: "table", rows: [
      { k: "UE motor", v: "/66" },
      { k: "LE motor", v: "/34" },
      { k: "Balance", v: "/14" },
      { k: "Sensation", v: "/24" },
    ]},
    interpret: {
      normal: ["Near-maximal domain scores — minimal residual motor/sensory impairment"],
      abnormal: ["Lower UE motor scores in particular are one of the more validated predictors of upper limb functional recovery potential and candidacy for constraint-induced movement therapy"],
      note: "Track domain sub-scores over time, not just the total — UE and LE motor recovery frequently diverge and each should be discussed against its own trajectory.",
    },
  },

  "Stroke|||Modified Rankin Scale": {
    title: "Modified Rankin Scale (mRS)",
    icon: "📈",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Global 7-point disability scale, 0 (no symptoms) to 6 (death)",
      boxes: [
        { tone: "", label: "👤 Position", text: "Structured interview with the patient and/or a reliable caregiver, ideally using the validated structured mRS interview to reduce inter-rater variability." },
        { tone: "blue", label: "🖐️ Technique", text: "Rate overall global disability and functional independence — not any single impairment — against the 7 defined grades, from no symptoms at all (0) through death (6)." },
        { tone: "purple", label: "🩺 Special consideration", text: "mRS is a single global rating, not a sum of item scores — it deliberately trades granularity for simplicity and is the primary outcome measure in most major stroke trials, which is why it's so widely recognised across the care team." },
        { tone: "amber", label: "⚠️ Tip", text: "Grade based on the patient's usual level of function over the relevant recall period, not just what you observe in one session — corroborate with a caregiver when the patient's own report may be unreliable (e.g. impaired insight)." },
      ],
    },
    scaleLabel: "0–6 (higher = worse)",
    scale: { type: "meter", rows: [
      { chip: "0", color: "#16A34A", name: "No symptoms", desc: "Fully asymptomatic" },
      { chip: "1", color: "#16A34A", name: "No significant disability", desc: "Some symptoms, no limitation in usual activities" },
      { chip: "2", color: "#F59E0B", name: "Slight disability", desc: "Unable to carry out all previous activities, but independent" },
      { chip: "3", color: "#F59E0B", name: "Moderate disability", desc: "Requires some help, walks unassisted" },
      { chip: "4", color: "#E9484B", name: "Moderately severe", desc: "Unable to attend own bodily needs without assistance" },
      { chip: "5", color: "#E9484B", name: "Severe disability", desc: "Bedridden, incontinent, requires constant care" },
      { chip: "6", color: "#7C3AED", name: "Death", desc: "" },
    ]},
    interpret: {
      normal: ["0–1 — no meaningful residual disability"],
      abnormal: ["≥3 → generally considered a 'poor outcome' threshold in stroke research, useful shorthand when discussing prognosis and discharge planning with the team"],
      note: "mRS is coarse by design — pair it with a domain-specific measure (FMA, ARAT, DGI) whenever you need to explain WHY a patient sits at a given grade.",
    },
  },

  "Stroke|||Functional mobility (stroke)": {
    title: "Functional Mobility (Stroke)",
    icon: "🚶",
    category: "Learn · Neuro · Stroke",
    perform: {
      image: null,
      caption: "Bed mobility, transfers, and ambulation, rated by assistance level",
      boxes: [
        { tone: "", label: "👤 Position", text: "Observe the patient's usual functional tasks in their real environment where possible (bed, chair, bathroom) rather than only a flat, clear therapy gym." },
        { tone: "blue", label: "🖐️ Technique", text: "Grade the level of physical assistance actually required — independent, supervision only, minimal/moderate/maximal physical assist, or fully dependent — across bed mobility, transfers, and ambulation." },
        { tone: "purple", label: "🩺 Special consideration", text: "Assistance level can vary by time of day (fatigue, medication timing) and task complexity — note the specific task and context alongside the grade, not just the grade alone." },
        { tone: "amber", label: "⚠️ Tip", text: "Use consistent assistance-level terminology across the whole care team (nursing, OT, PT) so handoffs and discharge planning don't lose information in translation." },
      ],
    },
    scaleLabel: "Assistance levels",
    scale: { type: "table", rows: [
      { k: "Independent", v: "No assistance or supervision needed" },
      { k: "Supervision", v: "Standby only, no hands-on assist" },
      { k: "Minimal / Moderate / Maximal assist", v: "Increasing hands-on physical assistance required" },
      { k: "Dependent", v: "Task performed for the patient" },
    ]},
    interpret: {
      normal: ["Independent across bed mobility, transfers, and ambulation"],
      abnormal: ["Higher assistance levels → drives staffing/equipment needs and discharge destination planning (home vs. rehab facility)"],
      note: "Track the trend across the admission — the trajectory of assistance level often matters more for discharge planning than any single session's grade.",
    },
  },

  /* ===================== PARKINSON'S DISEASE ===================== */

  "Parkinson's Disease|||Bradykinesia": {
    title: "Bradykinesia",
    icon: "🐌",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Finger tapping, hand movements, leg agility, facial expression, handwriting",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, hands visible and relaxed to start; adequate lighting to observe facial expression." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to tap index finger and thumb together as fast and as widely as possible (watch for decreasing amplitude/speed with repetition), open/close the hand repeatedly, tap the foot, and observe spontaneous facial expression and arm swing during gait. Ask about recent handwriting changes." },
        { tone: "purple", label: "🩺 Special consideration", text: "The hallmark of true parkinsonian bradykinesia is progressive DECREMENT in amplitude/speed with repetition, not just being globally slow — this distinguishes it from simple weakness or general slowness of other causes." },
        { tone: "amber", label: "⚠️ Tip", text: "Hypomimia (reduced facial expression, 'masked face') and micrographia (progressively smaller handwriting) are easy bedside clues that are often missed if you don't specifically look/ask for them." },
      ],
    },
    scaleLabel: "Findings observed",
    scale: { type: "table", rows: [
      { k: "Finger tapping", v: "Decrementing amplitude/speed with repetition" },
      { k: "Arm swing", v: "Reduced or absent, often asymmetric" },
      { k: "Hypomimia", v: "Reduced spontaneous facial expression" },
      { k: "Micrographia", v: "Progressively smaller handwriting" },
    ]},
    interpret: {
      normal: ["Fast, sustained-amplitude finger tapping, normal facial expression and arm swing"],
      abnormal: ["Decrementing bradykinesia is one of the core UPDRS/diagnostic criteria for Parkinson's disease, typically asymmetric at onset"],
      note: "Bradykinesia is one of the 3 cardinal PD signs (with rigidity and resting tremor) — document all three together for a complete motor picture.",
    },
  },

  "Parkinson's Disease|||Rigidity type": {
    title: "Rigidity Type",
    icon: "🔩",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Passive ROM through the wrist/elbow, feel resistance quality",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated and relaxed, arm supported; ask the patient to relax and not resist." },
        { tone: "blue", label: "🖐️ Technique", text: "Slowly and passively move the wrist and/or elbow through flexion/extension while feeling resistance quality; consider having the patient perform a simple contralateral task (e.g. tapping the other hand) to bring out latent rigidity (activation manoeuvre/Froment's sign)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Cogwheel rigidity = ratchety, catch-and-release resistance, often with a superimposed tremor. Lead-pipe rigidity = smooth, uniform resistance throughout the range, without the ratcheting quality." },
        { tone: "amber", label: "⚠️ Tip", text: "Rigidity is velocity-INdependent (unlike spasticity, which is velocity-dependent) — moving the joint faster doesn't change the resistance felt, which is a useful way to distinguish the two at the bedside." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "None", v: "Normal, smooth passive ROM" },
      { k: "Cogwheel rigidity", v: "Ratchety resistance, often with tremor" },
      { k: "Lead-pipe rigidity", v: "Smooth, uniform resistance throughout range" },
    ]},
    interpret: {
      normal: ["No resistance to passive movement beyond normal joint stiffness"],
      abnormal: ["Cogwheel/lead-pipe rigidity → one of the 3 cardinal PD signs; typically improves somewhat with dopaminergic medication, useful to note timing relative to the patient's medication schedule"],
      note: "Rigidity commonly starts asymmetrically (same side as the resting tremor) in early PD — always compare both sides.",
    },
  },

  "Parkinson's Disease|||Resting tremor": {
    title: "Resting Tremor",
    icon: "✋",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Observe hands/limbs fully at rest, supported, patient distracted",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, forearms resting fully supported on their lap or the chair arms, muscles relaxed." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe the limb completely at rest (not held out or performing a task) for several seconds; a mental distraction task (e.g. serial subtraction, naming months backward) often brings out or increases a subtle resting tremor. Note distribution — hand, leg, jaw/chin, or head." },
        { tone: "purple", label: "🩺 Special consideration", text: "Classic PD tremor is a 4–6 Hz 'pill-rolling' resting tremor that characteristically REDUCES or disappears with voluntary movement — this is the opposite pattern to essential tremor, which is a higher-frequency action/postural tremor that worsens with movement and reaching." },
        { tone: "amber", label: "⚠️ Tip", text: "PD tremor classically starts unilaterally (or markedly asymmetric) — a tremor that is symmetric from onset should prompt consideration of other causes (essential tremor, medication-induced, etc.)." },
      ],
    },
    scaleLabel: "Severity (0–4)",
    scale: { type: "meter", rows: [
      { chip: "0", color: "#16A34A", name: "Absent", desc: "No tremor observed at rest" },
      { chip: "1–2", color: "#F59E0B", name: "Mild–moderate", desc: "Present, limited amplitude" },
      { chip: "3–4", color: "#E9484B", name: "Marked–severe", desc: "Large amplitude, interferes with function" },
    ]},
    interpret: {
      normal: ["No resting tremor"],
      abnormal: ["4–6 Hz pill-rolling resting tremor, reduces with action → classic PD tremor pattern, typically starts unilaterally"],
      note: "Document distribution and whether it reduces with voluntary movement — this pattern distinction is more clinically useful than amplitude alone.",
    },
  },

  "Parkinson's Disease|||Postural instability (pull test)": {
    title: "Postural Instability — Pull Test",
    icon: "⚖️",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Sharp backward pull on the shoulders from behind, ready to catch",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient standing, feet comfortably apart, examiner standing close behind — close enough to catch the patient if they fall." },
        { tone: "blue", label: "🖐️ Technique", text: "Warn the patient a pull is coming and to try to recover their balance. Give a single firm, sudden pull backward on the shoulders. A normal response is 1–2 steps back (or none) with full recovery; more than 2 retropulsive steps, or a fall/near-fall requiring catching, is abnormal." },
        { tone: "purple", label: "🩺 Special consideration", text: "Postural instability is typically a LATE finding in PD, appearing after bradykinesia, rigidity, and tremor are already established — early prominent postural instability should raise suspicion for an atypical parkinsonian syndrome (e.g. progressive supranuclear palsy) rather than idiopathic PD." },
        { tone: "amber", label: "⚠️ Tip", text: "Perform this test yourself close enough to physically catch the patient — this is not a test to delegate to distance or verbal instruction alone given the fall risk." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Recovers independently within 1–2 steps or none" },
      { k: "Retropulsion, recovers", v: "More than 2 steps back, self-recovers" },
      { k: "Retropulsion, unrecovered", v: "Would fall without examiner catching them" },
      { k: "Unable to stand for test", v: "Too unstable to safely attempt" },
    ]},
    interpret: {
      normal: ["Recovers within 1–2 steps or no retropulsion at all"],
      abnormal: ["Absent postural response / needing to be caught → significant fall risk, prioritise balance training and consider assistive device / environmental modification"],
      note: "A positive pull test correlates strongly with real-world fall risk — treat it as a red flag for the home safety and mobility aid conversation.",
    },
  },

  "Parkinson's Disease|||Freezing of gait": {
    title: "Freezing of Gait",
    icon: "🧊",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Observe gait initiation, turning, doorways, dual-tasking",
      boxes: [
        { tone: "", label: "👤 Position", text: "Adequate walking space including at least one doorway/narrow passage and space to turn 180°, if available." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe the patient initiating gait from standing, walking through a doorway or narrow space, turning, approaching a destination/chair, and walking while performing a secondary task — freezing (feet appear glued to the floor despite the intention to move, often with small trembling steps in place) can be triggered by any of these." },
        { tone: "purple", label: "🩺 Special consideration", text: "Freezing is distinct from simple slowness or hesitation — it is an abrupt, brief (usually seconds) inability to progress despite ongoing intent to walk, and it is a major independent fall-risk and disability factor in PD, often more disabling than the tremor itself." },
        { tone: "amber", label: "⚠️ Tip", text: "External cueing strategies (rhythmic auditory cues, visual floor markers/stripes, 'step over my foot' verbal cues) can immediately break a freezing episode — worth trialling and documenting what works for this specific patient." },
      ],
    },
    scaleLabel: "Triggers observed",
    scale: { type: "table", rows: [
      { k: "None observed", v: "No freezing during the observed tasks" },
      { k: "On initiation", v: "Freezing at gait start" },
      { k: "On turning", v: "Freezing during turns" },
      { k: "At doorways / narrow spaces", v: "Freezing on passing through a constriction" },
      { k: "On approaching destination", v: "Freezing near a chair/target" },
      { k: "With dual-tasking", v: "Freezing while performing a secondary task" },
    ]},
    interpret: {
      normal: ["No freezing episodes across all triggers tested"],
      abnormal: ["Any freezing episode → significant independent fall-risk factor, warrants cueing strategy training and environmental review (remove floor clutter/narrow paths where possible)"],
      note: "Note which specific trigger(s) provoke freezing for this patient — cueing strategies are most effective when matched to the individual's specific trigger pattern.",
    },
  },

  "Parkinson's Disease|||Turning / axial rotation": {
    title: "Turning / Axial Rotation",
    icon: "🔄",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Ask the patient to turn 180°, observe strategy used",
      boxes: [
        { tone: "", label: "👤 Position", text: "Standing, adequate space to turn a full 180°." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to turn around fully (e.g. 'turn and face the other way'); observe whether they pivot smoothly on the spot, or turn 'en bloc' (rigid trunk, many small shuffling steps to reorient) which reflects loss of normal axial (trunk/neck) rotation." },
        { tone: "purple", label: "🩺 Special consideration", text: "En-bloc turning reflects loss of the normal dissociated trunk-pelvis rotation seen in healthy turning, and is closely linked to axial rigidity — it's also a common site for freezing episodes to occur." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask the patient to take a wider turning arc rather than pivoting sharply — this is often a simple, immediately effective compensation to trial and teach." },
      ],
    },
    scaleLabel: "Strategy observed",
    scale: { type: "table", rows: [
      { k: "Normal pivot turn", v: "Smooth, dissociated trunk-pelvis rotation" },
      { k: "En-bloc", v: "Rigid trunk, multiple small steps to reorient" },
      { k: "Requires multiple attempts", v: "Cannot complete the turn in one continuous motion" },
      { k: "Freezing on turn", v: "Freezing episode triggered by turning" },
    ]},
    interpret: {
      normal: ["Smooth pivot turn with normal trunk-pelvis dissociation"],
      abnormal: ["En-bloc turning → linked to fall risk, especially in tight spaces (bathrooms); teach wide-arc turning and consider environmental modification"],
      note: "Turning is one of the highest fall-risk moments in daily life for people with PD — worth specific, repeated practice in therapy.",
    },
  },

  "Parkinson's Disease|||Dual-task gait": {
    title: "Dual-Task Gait",
    icon: "🧠",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "Compare gait with and without a simultaneous cognitive/motor task",
      boxes: [
        { tone: "", label: "👤 Position", text: "A clear, level walking path of at least several metres, walked twice — once undisturbed, once with a concurrent task." },
        { tone: "blue", label: "🖐️ Technique", text: "Time/observe normal gait first, then repeat while the patient performs a simultaneous cognitive task (counting backward, naming animals) or a motor task (carrying a tray, texting). Compare gait speed, step length, and freezing/festination between the two conditions." },
        { tone: "purple", label: "🩺 Special consideration", text: "A marked slowing or new freezing under dual-task conditions reflects reduced automaticity of gait in PD — walking that has become effortful and reliant on conscious cognitive control rather than automatic, which is precisely what breaks down when attention is divided." },
        { tone: "amber", label: "⚠️ Tip", text: "Dual-task decline correlates with real-world fall risk (most falls happen while doing something else, not while walking in a clear, undistracted hallway) — this makes it one of the more ecologically valid tests in the exam." },
      ],
    },
    scaleLabel: "What to compare",
    scale: { type: "table", rows: [
      { k: "Gait speed", v: "Single-task vs. dual-task" },
      { k: "Step length", v: "Single-task vs. dual-task" },
      { k: "Freezing/festination", v: "Present only under dual-task load?" },
    ]},
    interpret: {
      normal: ["Minimal change in gait parameters between single- and dual-task conditions"],
      abnormal: ["Marked slowing or new freezing under dual-task load → real-world fall risk higher than single-task assessment alone suggests; incorporate dual-task practice into gait training"],
      note: "Document the specific secondary task used — findings should be interpreted in that context, not treated as a fixed, task-independent score.",
    },
  },

  "Parkinson's Disease|||Hoehn & Yahr staging": {
    title: "Hoehn & Yahr Staging",
    icon: "📈",
    category: "Learn · Neuro · Parkinson's",
    perform: {
      image: null,
      caption: "5-stage global disease severity scale based on distribution and balance impairment",
      boxes: [
        { tone: "", label: "👤 Position", text: "Global clinical assessment combining history and observed exam findings across the visit, not a single isolated test." },
        { tone: "blue", label: "🖐️ Technique", text: "Stage based on two key features: whether motor signs are unilateral or bilateral, and whether postural instability is present. Stage I = unilateral only. Stage II = bilateral, no balance impairment. Stage III = bilateral with postural instability, still independent. Stage IV = severe disability but able to walk/stand unassisted. Stage V = wheelchair-bound or bedridden unless aided." },
        { tone: "purple", label: "🩺 Special consideration", text: "Hoehn & Yahr is a global staging scale (like an mRS for PD), not a fine-grained impairment measure — it's most useful for communicating overall disease severity and stage-appropriate goals across the team, complementing (not replacing) detailed exam findings." },
        { tone: "amber", label: "⚠️ Tip", text: "Re-stage periodically rather than once at diagnosis — Hoehn & Yahr stage generally progresses over the disease course and helps track overall trajectory." },
      ],
    },
    scaleLabel: "5 stages",
    scale: { type: "table", rows: [
      { k: "I", v: "Unilateral involvement only" },
      { k: "II", v: "Bilateral, no balance impairment" },
      { k: "III", v: "Bilateral, postural instability, physically independent" },
      { k: "IV", v: "Severe disability, still able to walk/stand unassisted" },
      { k: "V", v: "Wheelchair-bound or bedridden unless aided" },
    ]},
    interpret: {
      normal: ["N/A — this scale describes disease severity, not a normal/abnormal binary"],
      abnormal: ["Stage III+ → postural instability present, prioritise fall-prevention strategies; Stage IV–V → significant equipment/caregiver support needs to plan for"],
      note: "Pair Hoehn & Yahr with a functional outcome measure (e.g. Timed Up and Go, DGI) for a fuller picture — the stage alone doesn't capture within-stage variability.",
    },
  },

  /* ===================== SPINAL CORD INJURY ===================== */

  "Spinal Cord Injury|||Neurological level of injury": {
    title: "Neurological Level of Injury (NLI)",
    icon: "🦴",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "Derived from completed myotome + dermatome grading, per ISNCSCI/ASIA",
      boxes: [
        { tone: "", label: "👤 Position", text: "Requires the full myotome (key muscle) and dermatome (key sensory point) grading to be completed first, on both sides." },
        { tone: "blue", label: "🖐️ Technique", text: "The neurological level of injury is the most CAUDAL segment with normal (intact) sensory AND motor function on BOTH sides of the body — determine sensory level and motor level separately per side first, then NLI is the most rostral (highest) of those four levels." },
        { tone: "purple", label: "🩺 Special consideration", text: "NLI often differs from the bony/vertebral level of fracture or the level named on imaging — always report the NEUROLOGICAL level (determined by exam) as distinct from the skeletal level, and expect the two to sometimes differ by a segment or more." },
        { tone: "amber", label: "⚠️ Tip", text: "Document sensory and motor levels for each side separately before combining into a single NLI — asymmetric injuries are extremely common and this detail matters for prognosis and goal-setting." },
      ],
    },
    scaleLabel: "Determination logic",
    scale: { type: "table", rows: [
      { k: "Sensory level (R/L)", v: "Most caudal dermatome with normal sensation" },
      { k: "Motor level (R/L)", v: "Most caudal myotome graded ≥3, with the level above graded 5" },
      { k: "NLI", v: "Most rostral of the four levels above" },
    ]},
    interpret: {
      normal: ["N/A — a level, not a normal/abnormal finding"],
      abnormal: ["Higher (more rostral) NLI → generally more extensive functional impact, drives expected functional outcome discussions (e.g. respiratory involvement at C3-5, hand function at C6-8)"],
      note: "NLI, together with the AIS grade, forms the core classification used to communicate SCI severity and expected functional prognosis across the whole care team.",
    },
  },

  "Spinal Cord Injury|||Myotome grading (ASIA key muscles)": {
    title: "Myotome Grading (ASIA Key Muscles)",
    icon: "💪",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "10 key muscles per side, graded 0–5, per ISNCSCI protocol",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated, tested position standardised per the ISNCSCI worksheet for each muscle (e.g. supine for most, against gravity where specified)." },
        { tone: "blue", label: "🖐️ Technique", text: "Test each of the 10 key muscles per side against the standard 0–5 MMT scale: C5 elbow flexors, C6 wrist extensors, C7 elbow extensors, C8 finger flexors, T1 finger abductors, L2 hip flexors, L3 knee extensors, L4 ankle dorsiflexors, L5 great toe extensors, S1 ankle plantarflexors." },
        { tone: "purple", label: "🩺 Special consideration", text: "A muscle graded 3 or better, with the segment immediately above graded normal (5), is what defines the motor level for that side — the specific pattern, not just individual grades, is what determines classification." },
        { tone: "amber", label: "⚠️ Tip", text: "Grade strictly to the standard 0–5 scale (not modifiers like 4+/4-) for ISNCSCI purposes — the official worksheet uses whole-number grades only, plus specific 'NT' (not testable) where appropriate." },
      ],
    },
    scaleLabel: "10 key muscles, MMT 0–5",
    scale: { type: "table", rows: [
      { k: "C5", v: "Elbow flexors" },
      { k: "C6", v: "Wrist extensors" },
      { k: "C7", v: "Elbow extensors" },
      { k: "C8", v: "Finger flexors" },
      { k: "T1", v: "Finger abductors" },
      { k: "L2", v: "Hip flexors" },
      { k: "L3", v: "Knee extensors" },
      { k: "L4", v: "Ankle dorsiflexors" },
      { k: "L5", v: "Great toe extensors" },
      { k: "S1", v: "Ankle plantarflexors" },
    ]},
    interpret: {
      normal: ["All 10 key muscles graded 5 bilaterally"],
      abnormal: ["Graded pattern of weakness below a level → contributes to motor level and, combined with sensory findings and sacral sparing, the AIS grade"],
      note: "Always test T2–L1 myotomes are NOT part of the key-muscle set (no reliable key muscle exists at those levels) — motor level there is inferred from the sensory level per ISNCSCI convention.",
    },
  },

  "Spinal Cord Injury|||Dermatome grading (ASIA sensory)": {
    title: "Dermatome Grading (ASIA Sensory)",
    icon: "🖐️",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "Light touch + pinprick at each of 28 key sensory points per side, graded 0–2",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine, eyes closed, key sensory points exposed per the ISNCSCI dermatome map." },
        { tone: "blue", label: "🖐️ Technique", text: "Test light touch (cotton wisp) and pinprick (disposable pin, sharp vs. dull) separately at each key sensory point, comparing to a known-normal area (e.g. cheek) as the reference for 'normal'; grade each modality 0 (absent), 1 (impaired/altered), or 2 (normal) at each point." },
        { tone: "purple", label: "🩺 Special consideration", text: "The S4-5 (perianal) sensory point is critical — sensory preservation there specifically, combined with voluntary anal contraction, defines 'sacral sparing' and distinguishes AIS B (sensory incomplete) from AIS A (complete)." },
        { tone: "amber", label: "⚠️ Tip", text: "Test light touch and pinprick as two SEPARATE passes over the whole body, not modality-by-modality-per-point — this is both the standard protocol and easier for the patient to track reliably." },
      ],
    },
    scaleLabel: "Key sensory points, graded 0–2",
    scale: { type: "table", rows: [
      { k: "0", v: "Absent" },
      { k: "1", v: "Altered / impaired" },
      { k: "2", v: "Normal" },
      { k: "Key points", v: "C2–S4-5, incl. T4 (nipple), T10 (umbilicus), S4-5 (perianal)" },
    ]},
    interpret: {
      normal: ["All key points graded 2 for both light touch and pinprick, bilaterally"],
      abnormal: ["Sensory level and pattern feed directly into NLI and AIS grade determination — document light touch and pinprick findings separately, as they can be graded differently at the same point"],
      note: "S4-5 sensory grading (sacral sparing) is one of the single most important individual findings in the whole SCI exam — never skip it.",
    },
  },

  "Spinal Cord Injury|||ASIA Impairment Scale (AIS)": {
    title: "ASIA Impairment Scale (AIS)",
    icon: "🏷️",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "A–E grade, determined from completed myotome + dermatome + sacral sparing exam",
      boxes: [
        { tone: "", label: "👤 Position", text: "Requires the complete ISNCSCI exam (myotomes, dermatomes, and specifically sacral sparing — S4-5 sensation and voluntary anal contraction) to be finished first." },
        { tone: "blue", label: "🖐️ Technique", text: "Apply the ISNCSCI algorithm: Grade A if no sensory or motor function is preserved in S4-5. Grade B if sensory but not motor function is preserved below the level, including S4-5. Grade C if motor function is preserved below the level but fewer than half of key muscles below the NLI grade ≥3. Grade D if half or more grade ≥3. Grade E if sensory and motor function are entirely normal." },
        { tone: "purple", label: "🩺 Special consideration", text: "Sacral sparing (any sensory or motor function at S4-5, including voluntary anal contraction) is the single deciding factor between AIS A (complete) and B (sensory incomplete) — always check it explicitly rather than inferring from limb findings alone." },
        { tone: "amber", label: "⚠️ Tip", text: "AIS grade at 72 hours post-injury (once spinal shock has resolved) is far more prognostically reliable than a grade taken immediately post-injury — document the timing of grading relative to injury." },
      ],
    },
    scaleLabel: "5 grades",
    scale: { type: "table", rows: [
      { k: "A", v: "Complete — no motor or sensory function in S4-5" },
      { k: "B", v: "Sensory incomplete — sensory (not motor) preserved below level, incl. S4-5" },
      { k: "C", v: "Motor incomplete — <50% of key muscles below level grade ≥3" },
      { k: "D", v: "Motor incomplete — ≥50% of key muscles below level grade ≥3" },
      { k: "E", v: "Normal — motor and sensory function entirely normal" },
    ]},
    interpret: {
      normal: ["Grade E — normal sensory and motor function throughout"],
      abnormal: ["Grade A/B → complete or sensory-incomplete injury, generally more guarded functional prognosis; Grade C/D → motor-incomplete, generally better ambulation prognosis, especially Grade D"],
      note: "AIS conversion (e.g. A to B, or C to D) over the early months post-injury is one of the most important prognostic signals in the whole recovery trajectory — always compare against the most recent prior grading, not just the current single grade.",
    },
  },

  "Spinal Cord Injury|||Sitting balance (SCI)": {
    title: "Sitting Balance (SCI)",
    icon: "⚖️",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "Static (unsupported hold) and dynamic (reaching, perturbation) sitting balance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated on a firm, stable surface (mat or bed edge) with feet unsupported, hips/knees at ~90°." },
        { tone: "blue", label: "🖐️ Technique", text: "Static: ask the patient to sit unsupported with arms free, time how long they can maintain the position and note any need for hand support. Dynamic: ask them to reach outside their base of support in multiple directions, or apply a gentle perturbation, and grade their ability to recover balance without falling or needing to catch themselves." },
        { tone: "purple", label: "🩺 Special consideration", text: "Sitting balance in SCI depends heavily on trunk control, which correlates closely with the neurological level — higher (more cervical/upper thoracic) injuries typically have more impaired trunk control and therefore poorer sitting balance than lower thoracic/lumbar injuries." },
        { tone: "amber", label: "⚠️ Tip", text: "Always test WITH a spotter/guard given fall risk, especially early post-injury or with any uncertainty about the patient's balance capacity." },
      ],
    },
    scaleLabel: "Grading (static & dynamic)",
    scale: { type: "table", rows: [
      { k: "Independent", v: "No hand support needed, full unsupported balance" },
      { k: "Fair (hand support)", v: "Requires one or both hands for support" },
      { k: "Poor", v: "Unable to maintain sitting even with hand support" },
    ]},
    interpret: {
      normal: ["Independent static and dynamic sitting balance, full reach in all directions"],
      abnormal: ["Poor sitting balance → foundational goal before higher-level mobility (transfers, wheelchair skills) can progress; prioritise trunk control training early"],
      note: "Sitting balance is a prerequisite skill that gates progress in transfers and wheelchair mobility — track it as its own goal, not just a byproduct of other training.",
    },
  },

  "Spinal Cord Injury|||Transfer ability": {
    title: "Transfer Ability",
    icon: "↔️",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "Bed-to-chair, chair-to-toilet, etc. — graded by assistance and equipment needed",
      boxes: [
        { tone: "", label: "👤 Position", text: "Observe the patient's actual transfer technique between real surfaces they'll use (bed, wheelchair, toilet, car) rather than only a single standardised transfer." },
        { tone: "blue", label: "🖐️ Technique", text: "Grade the level of physical assistance and equipment actually required — fully independent, modified independent (uses a slide board or other equipment but no human help), supervision only, or increasing levels of physical assistance up to requiring a mechanical hoist/lift." },
        { tone: "purple", label: "🩺 Special consideration", text: "Transfer technique and independence level correlate strongly with neurological level and upper limb strength — expected transfer potential differs substantially between, for example, a C6 and a T10 injury, and goals should be set accordingly rather than against a single universal standard." },
        { tone: "amber", label: "⚠️ Tip", text: "Note which SPECIFIC transfer surfaces/directions were tested — a patient may be independent bed-to-chair but not yet safe for a car transfer, and these shouldn't be assumed equivalent." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "Independent", v: "No assistance or equipment needed" },
      { k: "Modified independent", v: "Uses equipment (e.g. slide board), no human assistance" },
      { k: "Supervision → Maximal assist", v: "Increasing levels of hands-on physical help" },
      { k: "Requires hoist/lift", v: "Mechanical lift needed for safe transfer" },
    ]},
    interpret: {
      normal: ["Independent or modified independent across all relevant transfer surfaces"],
      abnormal: ["Higher assistance needs → drives equipment prescription (slide board, hoist) and caregiver training needs before discharge"],
      note: "Transfer independence is one of the most important single predictors of discharge destination and required home support level — document it thoroughly.",
    },
  },

  "Spinal Cord Injury|||Wheelchair mobility": {
    title: "Wheelchair Mobility",
    icon: "🦽",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "Propulsion technique and independence, indoors and outdoors, manual vs. power",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated in their actual (or trial) wheelchair, on both level indoor flooring and, where possible, outdoor/uneven terrain and ramps." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe propulsion technique (stroke pattern, symmetry, endurance for manual chairs; joystick control and safety awareness for power chairs), and grade independence separately for indoor and outdoor environments, since outdoor mobility (ramps, curbs, uneven ground, distance) is typically the harder skill." },
        { tone: "purple", label: "🩺 Special consideration", text: "Manual wheelchair candidacy depends heavily on upper limb strength/endurance and shoulder health — a patient may be a poor candidate for full-time manual propulsion (e.g. high cervical injury, or shoulder overuse risk in a long-term manual user) and need power mobility instead." },
        { tone: "amber", label: "⚠️ Tip", text: "Screen for early signs of upper limb overuse (shoulder pain, wrist symptoms) in long-term manual wheelchair users — repetitive strain injury from propulsion is a major long-term complication worth proactively addressing." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "Wheelchair type", v: "Manual / Power / Not yet indicated" },
      { k: "Independent indoors + outdoors", v: "Full independence in both environments" },
      { k: "Independent indoors only", v: "Needs assistance for outdoor mobility" },
      { k: "Requires assistance / Dependent", v: "Cannot propel/operate independently" },
    ]},
    interpret: {
      normal: ["Independent indoor and outdoor mobility with the prescribed chair"],
      abnormal: ["Independent indoors only → common intermediate stage, prioritise outdoor/community mobility training and terrain-specific skills (ramps, curbs) before discharge"],
      note: "Wheelchair skills training (curb negotiation, ramps, transfers into/out of the chair) is a distinct, teachable skill set — don't assume basic propulsion ability implies community mobility readiness.",
    },
  },

  "Spinal Cord Injury|||Autonomic dysreflexia screen": {
    title: "Autonomic Dysreflexia Screen",
    icon: "🚨",
    category: "Learn · Neuro · Spinal Cord Injury",
    perform: {
      image: null,
      caption: "Applies mainly at T6 and above — sudden BP rise + trigger symptoms",
      boxes: [
        { tone: "", label: "👤 Position", text: "Any position — this is a screen for signs/symptoms during ANY session, not a positional test; have a blood pressure cuff available for any patient with an injury at T6 or above." },
        { tone: "blue", label: "🖐️ Technique", text: "Watch for a sudden onset of hypertension together with any of: pounding headache, flushing/sweating above the level of injury, bradycardia, blurred vision, or nasal congestion during the session — and actively search for a triggering stimulus (most commonly a distended bladder, bowel impaction, or a tight/restrictive item like clothing or a leg bag)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Autonomic dysreflexia is a MEDICAL EMERGENCY — untreated, it can progress to seizure, stroke, or death from the extreme hypertension. It occurs almost exclusively at T6 and above, where the injury disconnects the splanchnic sympathetic outflow from higher-centre regulation." },
        { tone: "amber", label: "⚠️ Tip", text: "If suspected: sit the patient upright immediately (to use gravity to lower BP), loosen any tight clothing/straps, and search for and remove the triggering stimulus while someone else alerts medical staff — do not lay the patient flat." },
      ],
    },
    scaleLabel: "Signs to screen for",
    scale: { type: "table", rows: [
      { k: "Sudden hypertension", v: "Key defining sign, often marked" },
      { k: "Pounding headache", v: "Very common accompanying symptom" },
      { k: "Flushing / sweating above level", v: "Classic autonomic sign" },
      { k: "Bradycardia, blurred vision, nasal congestion", v: "Additional supporting signs" },
    ]},
    interpret: {
      normal: ["No signs present, stable vitals"],
      abnormal: ["Any combination of the above signs with a BP rise → treat as a medical emergency immediately; do not continue the therapy session"],
      redFlags: ["Sudden severe hypertension with headache in a T6-or-above SCI patient — sit upright, search for and remove the trigger, alert medical staff urgently"],
      note: "Educate every at-risk patient and their caregivers on recognising early AD signs and the immediate upright + search-for-trigger response — this is a core patient safety education point, not just a therapist skill.",
    },
  },

  /* ===================== MULTIPLE SCLEROSIS ===================== */

  "Multiple Sclerosis|||Fatigue screen": {
    title: "Fatigue Screen",
    icon: "🔋",
    category: "Learn · Neuro · Multiple Sclerosis",
    perform: {
      image: null,
      caption: "Rate severity and ask about pattern separately from mood",
      boxes: [
        { tone: "", label: "👤 Position", text: "Interview-based, ideally at a consistent time of day across visits for comparable tracking." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to rate their fatigue severity on a 0–10 scale, and separately ask about its pattern — timing across the day, relationship to heat/exertion, and impact on specific activities (work, self-care, exercise tolerance)." },
        { tone: "purple", label: "🩺 Special consideration", text: "MS fatigue ('lassitude') is typically disproportionate to the level of activity performed and often worsens as the day progresses or with heat exposure — this pattern helps distinguish it from depression-related fatigue, which doesn't follow the same activity/heat relationship." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask about fatigue and mood SEPARATELY, even though they can co-occur and interact — conflating the two risks missing a treatable component of either." },
      ],
    },
    scaleLabel: "Severity (0–10)",
    scale: { type: "meter", rows: [
      { chip: "0-3", color: "#16A34A", name: "Mild", desc: "Minimal impact on activity" },
      { chip: "4-6", color: "#F59E0B", name: "Moderate", desc: "Noticeably limits some activities" },
      { chip: "7-10", color: "#E9484B", name: "Severe", desc: "Major limitation on daily function" },
    ]},
    interpret: {
      normal: ["Low, activity-proportionate fatigue with minimal functional impact"],
      abnormal: ["Moderate–severe, activity-disproportionate fatigue → energy conservation strategies, activity pacing, and cooling strategies (if heat-sensitive) should be built into the treatment plan"],
      note: "Fatigue is one of the most disabling and under-recognised MS symptoms — actively screen for it at every visit rather than waiting for the patient to volunteer it.",
    },
  },

  "Multiple Sclerosis|||Nystagmus / INO screen": {
    title: "Nystagmus / INO Screen",
    icon: "👀",
    category: "Learn · Neuro · Multiple Sclerosis",
    perform: {
      image: null,
      caption: "Observe eye movements through the full range, watch each eye individually",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, head still, following your finger or a pen torch through the full range of gaze." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to follow your finger through horizontal and vertical gaze; observe for nystagmus (rhythmic involuntary eye oscillation) at rest or at end-range, and specifically watch EACH eye individually during lateral gaze for internuclear ophthalmoplegia (INO) — impaired adduction of one eye with nystagmus in the abducting fellow eye." },
        { tone: "purple", label: "🩺 Special consideration", text: "INO is caused by a lesion in the medial longitudinal fasciculus (MLF) connecting the two eye-movement nuclei, and while it has several causes, it is classically and strongly associated with MS, especially when bilateral or in a younger patient." },
        { tone: "amber", label: "⚠️ Tip", text: "Watch the ADDUCTING eye specifically (not just the more obvious nystagmus in the abducting eye) — the subtle adduction lag is the key finding and easy to miss if you're not looking for it specifically." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Full, smooth conjugate eye movements, no nystagmus" },
      { k: "Nystagmus present", v: "Rhythmic involuntary oscillation noted" },
      { k: "INO", v: "Impaired adduction one eye + nystagmus in abducting eye" },
      { k: "Diplopia reported", v: "Patient reports double vision" },
    ]},
    interpret: {
      normal: ["Full, smooth eye movements, no nystagmus, no adduction lag"],
      abnormal: ["INO (especially bilateral) → classic MS finding; correlate with the patient's reported visual symptoms and functional impact (reading, driving)"],
      note: "Diplopia and nystagmus significantly affect balance and gait via impaired visual stabilisation — factor eye-movement findings into the balance/gait assessment, not just as an isolated cranial finding.",
    },
  },

  "Multiple Sclerosis|||Lhermitte's sign": {
    title: "Lhermitte's Sign",
    icon: "⚡",
    category: "Learn · Neuro · Multiple Sclerosis",
    perform: {
      image: null,
      caption: "Passive neck flexion, ask about an electric-shock sensation",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or supine, neck relaxed and starting in neutral." },
        { tone: "blue", label: "🖐️ Technique", text: "Passively (or actively, on request) flex the patient's neck, bringing the chin toward the chest, and ask if this produces an electric-shock-like sensation shooting down the spine and/or into the limbs." },
        { tone: "purple", label: "🩺 Special consideration", text: "Lhermitte's sign reflects mechanosensitivity of demyelinated dorsal column fibres in the cervical cord — while classically associated with MS, it can also occur with cervical spondylosis, vitamin B12 deficiency, and other cervical cord pathology, so it's suggestive rather than diagnostic in isolation." },
        { tone: "amber", label: "⚠️ Tip", text: "Perform gently and stop immediately if it reproduces significant symptoms — this is a screening manoeuvre, not something to sustain or repeat unnecessarily once positive." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Negative", v: "No sensation produced with neck flexion" },
      { k: "Positive", v: "Electric-shock sensation down spine/limbs on flexion" },
      { k: "Not tested", v: "Deferred, e.g. due to acute neck pain/precaution" },
    ]},
    interpret: {
      normal: ["Negative — no shock-like sensation with neck flexion"],
      abnormal: ["Positive → suggests cervical cord dorsal column involvement; correlate with imaging and the broader clinical picture rather than treating as diagnostic alone"],
      note: "A positive Lhermitte's sign is a useful symptom to track over time as a marker of cervical cord irritability, alongside imaging and other exam findings.",
    },
  },

  "Multiple Sclerosis|||Uhthoff's phenomenon": {
    title: "Uhthoff's Phenomenon",
    icon: "🌡️",
    category: "Learn · Neuro · Multiple Sclerosis",
    perform: {
      image: null,
      caption: "History-based — ask specifically about heat/exertion-related symptom worsening",
      boxes: [
        { tone: "", label: "👤 Position", text: "Interview-based; can be observed directly if the patient exercises or is in a warm environment during the session and symptoms change." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask specifically whether symptoms (vision, strength, sensation, fatigue) transiently worsen with heat exposure — hot showers/baths, warm weather, fever, or exercise — and whether they reliably RESOLVE again with cooling down." },
        { tone: "purple", label: "🩺 Special consideration", text: "Uhthoff's phenomenon reflects temporary conduction failure in demyelinated axons at higher body temperature — it is NOT a sign of disease worsening or a new relapse, which is an important distinction to educate the patient on, as it can otherwise cause significant anxiety." },
        { tone: "amber", label: "⚠️ Tip", text: "This finding directly informs exercise prescription — cooling strategies (pre-cooling, cooling vests, exercising in a cool environment, timing sessions to cooler parts of the day) can allow more exercise tolerance without triggering symptomatic worsening." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Not reported", v: "No heat-related symptom pattern noted" },
      { k: "Reported", v: "Symptoms worsen with heat/exertion, resolve on cooling" },
      { k: "Not tested", v: "Not specifically asked about yet" },
    ]},
    interpret: {
      normal: ["No heat-sensitivity pattern reported"],
      abnormal: ["Reported heat-sensitivity → build cooling strategies into the exercise/treatment plan; explicitly educate that this is a transient conduction phenomenon, not true disease progression"],
      note: "Always pair a positive finding here with clear patient education distinguishing it from a true relapse — this reassurance itself has real therapeutic value.",
    },
  },

  "Multiple Sclerosis|||EDSS staging": {
    title: "EDSS Staging",
    icon: "📊",
    category: "Learn · Neuro · Multiple Sclerosis",
    perform: {
      image: null,
      caption: "Expanded Disability Status Scale, 0–10 in 0.5 steps, based on functional systems + ambulation",
      boxes: [
        { tone: "", label: "👤 Position", text: "Requires assessment across 8 functional systems (pyramidal, cerebellar, brainstem, sensory, bowel/bladder, visual, cerebral, other) plus an ambulation assessment." },
        { tone: "blue", label: "🖐️ Technique", text: "Score each of the 8 functional systems individually, then combine with the ambulation grade per the standardised EDSS algorithm to arrive at the overall 0 (normal) to 10 (death due to MS) score, in 0.5-point steps." },
        { tone: "purple", label: "🩺 Special consideration", text: "EDSS is heavily weighted toward ambulation in the mid-to-upper range of the scale (roughly 4.0–7.0 is largely defined by walking distance/aid needed) — this means it can under-represent significant upper-limb, cognitive, or fatigue-related disability in an ambulatory patient." },
        { tone: "amber", label: "⚠️ Tip", text: "EDSS is typically formally scored by a neurologist/trained rater using the full protocol — as a PT, focus on documenting the specific functional findings (gait distance, aid used, functional system deficits) that feed into it, and record the score if it's been formally assigned." },
      ],
    },
    scaleLabel: "0–10 (0.5 steps)",
    scale: { type: "table", rows: [
      { k: "0", v: "Normal neurological exam" },
      { k: "1.0–3.5", v: "No/minimal disability, fully ambulatory" },
      { k: "4.0–5.5", v: "Ambulatory but with increasing limitation (walking distance restricted)" },
      { k: "6.0–6.5", v: "Requires unilateral/bilateral walking aid" },
      { k: "7.0–7.5", v: "Wheelchair-dependent" },
      { k: "8.0–9.5", v: "Restricted to bed/chair, increasing dependence" },
      { k: "10", v: "Death due to MS" },
    ]},
    interpret: {
      normal: ["EDSS 0 — normal neurological exam"],
      abnormal: ["Rising EDSS over time → disease progression, re-evaluate treatment/support needs; a single high score should prompt review of ALL functional systems, not just gait"],
      note: "Track EDSS trend over time rather than a single score in isolation — the trajectory is what drives most clinical decision-making in MS management.",
    },
  },

  "Multiple Sclerosis|||Bladder / bowel function": {
    title: "Bladder / Bowel Function",
    icon: "🚻",
    category: "Learn · Neuro · Multiple Sclerosis",
    perform: {
      image: null,
      caption: "Interview-based screen — urgency, frequency, incontinence, retention, constipation",
      boxes: [
        { tone: "", label: "👤 Position", text: "Private, comfortable interview setting — this is a sensitive topic many patients won't volunteer unprompted." },
        { tone: "blue", label: "🖐️ Technique", text: "Directly and specifically ask about urinary urgency, frequency, incontinence episodes, and any sense of incomplete emptying or retention; separately ask about bowel symptoms — constipation and any bowel incontinence. Note any catheter use (intermittent or indwelling)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Bladder/bowel dysfunction is extremely common in MS (affecting a majority of patients over the disease course) but is under-reported unless asked about directly — patients often don't realise it's disease-related or are reluctant to raise it unprompted." },
        { tone: "amber", label: "⚠️ Tip", text: "A NEW or acutely worsening bladder/bowel change can be a relapse symptom or signal a urinary tract infection (which itself can transiently worsen other MS symptoms via a pseudo-relapse) — flag new changes for medical review rather than assuming baseline." },
      ],
    },
    scaleLabel: "Symptoms screened",
    scale: { type: "table", rows: [
      { k: "Bladder", v: "Urgency / frequency / incontinence / retention" },
      { k: "Bowel", v: "Constipation / incontinence" },
      { k: "Equipment", v: "Catheter in situ (intermittent/indwelling)" },
    ]},
    interpret: {
      normal: ["No urinary or bowel symptoms reported"],
      abnormal: ["Any positive symptom → refer for formal continence assessment/management as appropriate; significantly impacts community participation and exercise session planning"],
      note: "Bladder/bowel symptoms strongly influence a patient's willingness to engage in community-based exercise and outings — address it as a genuine participation barrier, not a peripheral detail.",
    },
  },

  /* ===================== TRAUMATIC BRAIN INJURY ===================== */

  "Traumatic Brain Injury|||Rancho Los Amigos level": {
    title: "Rancho Los Amigos Level of Cognitive Functioning",
    icon: "🧠",
    category: "Learn · Neuro · Traumatic Brain Injury",
    perform: {
      image: null,
      caption: "8-level scale describing the typical cognitive-behavioural recovery trajectory after TBI",
      boxes: [
        { tone: "", label: "👤 Position", text: "Observe the patient's spontaneous behaviour and response to stimuli/interaction across the session, in their usual environment where possible." },
        { tone: "blue", label: "🖐️ Technique", text: "Rate the patient's current level against the 8-stage description: I no response, II generalised non-specific response, III localised response to specific stimuli, IV confused/agitated (high activity, no processing), V confused/inappropriate (can follow simple commands, distractible), VI confused/appropriate (goal-directed with cueing), VII automatic/appropriate (routine tasks fine, poor judgement in novel situations), VIII purposeful/appropriate (independent, may have subtle residual deficits)." },
        { tone: "purple", label: "🩺 Special consideration", text: "The Rancho level directly guides intervention style — levels IV–V (confused/agitated) need a calm, low-stimulation, structured environment and simple redirection rather than complex instruction or reasoning, since the patient cannot yet process it." },
        { tone: "amber", label: "⚠️ Tip", text: "Re-rate regularly, not just at admission — patients can and do move between levels (including transiently backward with fatigue/overstimulation) and treatment approach should adapt in real time to the level observed that session." },
      ],
    },
    scaleLabel: "8 levels",
    scale: { type: "table", rows: [
      { k: "I", v: "No response to any stimuli" },
      { k: "II", v: "Generalised, non-specific response" },
      { k: "III", v: "Localised response to specific stimuli" },
      { k: "IV", v: "Confused, agitated — high activity, no processing" },
      { k: "V", v: "Confused, inappropriate — follows simple commands, distractible" },
      { k: "VI", v: "Confused, appropriate — goal-directed with cueing" },
      { k: "VII", v: "Automatic, appropriate — routine tasks fine, poor novel judgement" },
      { k: "VIII", v: "Purposeful, appropriate — independent function" },
    ]},
    interpret: {
      normal: ["N/A — a recovery-stage description, not a normal/abnormal binary"],
      abnormal: ["Level IV–V → agitation management, environmental modification, and simple structured cueing take priority over complex cognitive-motor training"],
      note: "Communicate the Rancho level clearly to family/caregivers — it reframes 'difficult' behaviour (e.g. agitation at level IV) as an expected recovery stage rather than something to be frustrated by, which meaningfully changes how they interact with the patient.",
    },
  },

  "Traumatic Brain Injury|||Post-traumatic amnesia screen": {
    title: "Post-Traumatic Amnesia (PTA) Screen",
    icon: "🕓",
    category: "Learn · Neuro · Traumatic Brain Injury",
    perform: {
      image: null,
      caption: "Continuous memory + orientation, best judged with a validated tool (e.g. GOAT/WPTAS)",
      boxes: [
        { tone: "", label: "👤 Position", text: "Brief, repeated bedside orientation/memory checks across the day/session, ideally using a validated structured tool rather than impression alone." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask orientation questions (person, place, time) and test ability to form and retain new continuous memories (e.g. recall of recent events, repeated questions indicating no memory of having just asked). PTA formally ends when the patient can consistently form continuous day-to-day memories, not simply when they become 'alert' or start following commands." },
        { tone: "purple", label: "🩺 Special consideration", text: "A patient can be fully alert, conversational, and even follow commands appropriately while STILL being in PTA — PTA is specifically about the inability to lay down new continuous memories, which is a distinct capacity from arousal or command-following." },
        { tone: "amber", label: "⚠️ Tip", text: "Duration of PTA is one of the strongest available predictors of long-term outcome after TBI — document it as accurately as possible using a validated tool rather than clinical impression, since it directly informs prognosis discussions." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Currently in PTA", v: "Yes / No / Unclear" },
      { k: "Orientation", v: "Person / Place / Time — note which are intact" },
      { k: "Memory pattern", v: "e.g. repeats questions, cannot recall recent events" },
    ]},
    interpret: {
      normal: ["Out of PTA — consistent continuous memory formation, correctly oriented"],
      abnormal: ["Still in PTA → safety supervision needs remain high regardless of otherwise-good physical function; avoid relying on the patient's own memory for safety instructions (e.g. weight-bearing precautions) until PTA has resolved"],
      note: "While in PTA, repeat safety instructions each session rather than assuming retention from prior sessions — this is a practical, not just documentation, implication of the finding.",
    },
  },

  "Traumatic Brain Injury|||Agitation / behaviour screen": {
    title: "Agitation / Behaviour Screen",
    icon: "😤",
    category: "Learn · Neuro · Traumatic Brain Injury",
    perform: {
      image: null,
      caption: "Observe behaviour across the session, note triggers and effective de-escalation strategies",
      boxes: [
        { tone: "", label: "👤 Position", text: "Observe throughout the natural course of the session rather than as a single isolated test — behaviour often varies with fatigue, time of day, and environmental stimulation." },
        { tone: "blue", label: "🖐️ Technique", text: "Note the behaviours observed — calm/cooperative, restless, agitated, aggressive, disinhibited, perseverative, or impulsive — and specifically what preceded any escalation (overstimulation, a specific demand/task, fatigue, pain) and what successfully de-escalated it." },
        { tone: "purple", label: "🩺 Special consideration", text: "Agitation in the acute-to-subacute phase after TBI is typically part of the expected recovery trajectory (often coinciding with Rancho levels IV–V) rather than a fixed personality change — this framing matters both for staff approach and for family education/expectations." },
        { tone: "amber", label: "⚠️ Tip", text: "Document specific, reproducible triggers and effective de-escalation strategies in the chart in concrete, actionable terms (e.g. 'reduce background noise, use short single-step instructions') so the whole team can apply a consistent approach." },
      ],
    },
    scaleLabel: "Behaviours to screen for",
    scale: { type: "table", rows: [
      { k: "Calm / cooperative", v: "No agitation observed" },
      { k: "Restless / agitated", v: "Increased motor activity, distress" },
      { k: "Aggressive", v: "Verbal or physical aggression" },
      { k: "Disinhibited / perseverative / impulsive", v: "Frontal-lobe-pattern behaviours" },
    ]},
    interpret: {
      normal: ["Calm, cooperative throughout the session"],
      abnormal: ["Agitation/aggression → adjust the environment (reduce stimulation), simplify instructions, and document reproducible triggers/effective strategies for the team"],
      redFlags: ["Escalating aggression posing a safety risk to the patient or staff — follow your facility's behavioural emergency protocol"],
      note: "A consistent, structured, low-stimulation approach across ALL team members (not just therapy) tends to reduce agitation frequency and severity more than any single session's technique.",
    },
  },

  /* ===================== VESTIBULAR DISORDERS ===================== */

  "Vestibular Disorders|||Dix-Hallpike test": {
    title: "Dix-Hallpike Test",
    icon: "🌀",
    category: "Learn · Neuro · Vestibular",
    perform: {
      image: null,
      caption: "45° head turn, rapid move to supine with head extended over the table edge",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated on a plinth positioned so that when they lie back, their head can extend ~20° below horizontal over the table edge, supported by the examiner." },
        { tone: "blue", label: "🖐️ Technique", text: "Turn the patient's head 45° toward the side being tested, then rapidly move them from sitting to supine with the head extended 20° over the table edge, keeping the 45° rotation. Observe the eyes closely for nystagmus and ask about vertigo, noting latency, duration, and whether it fatigues with repetition." },
        { tone: "purple", label: "🩺 Special consideration", text: "A positive test reproduces vertigo with a characteristic torsional, upbeating nystagmus after a short latency (a few seconds), consistent with posterior canal benign paroxysmal positional vertigo (BPPV) — this specific nystagmus pattern is what confirms the diagnosis, not vertigo alone." },
        { tone: "amber", label: "⚠️ Tip", text: "Avoid this test with cervical spine instability, severe carotid artery disease/recent TIA, unstable cardiovascular disease, or a recent cervical/vertebral fracture — screen for these contraindications before performing." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Negative bilaterally", v: "No vertigo/nystagmus reproduced either side" },
      { k: "Positive right/left", v: "Vertigo + torsional/upbeating nystagmus, that side, posterior canal" },
      { k: "Not performed", v: "Contraindicated — document why" },
    ]},
    interpret: {
      normal: ["Negative bilaterally — no reproduced vertigo or nystagmus"],
      abnormal: ["Positive → posterior canal BPPV on that side, proceed to canalith repositioning (e.g. Epley manoeuvre) as indicated"],
      redFlags: ["Nystagmus that is purely vertical/downbeating, non-fatiguing, or accompanied by other neurological signs — atypical for peripheral BPPV, consider central cause and refer appropriately"],
      note: "Always document nystagmus direction, latency, duration, and fatigability in detail — this pattern is what distinguishes peripheral BPPV from a central cause requiring urgent referral.",
    },
  },

  "Vestibular Disorders|||Head impulse test": {
    title: "Head Impulse Test (HIT)",
    icon: "🎯",
    category: "Learn · Neuro · Vestibular",
    perform: {
      image: null,
      caption: "Rapid, small-amplitude passive head turns, patient fixates your nose",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated facing the examiner, holding your head still with both hands, instructed to keep looking at your nose throughout." },
        { tone: "blue", label: "🖐️ Technique", text: "Deliver rapid, small-amplitude, unpredictable passive head turns (roughly 10–20°) to each side while the patient maintains fixation on your nose; watch the patient's eyes closely for a corrective 'catch-up' saccade immediately after the turn." },
        { tone: "purple", label: "🩺 Special consideration", text: "A visible catch-up saccade indicates a deficient vestibulo-ocular reflex (VOR) on the side the head was turned TOWARD — this indicates a peripheral vestibular deficit on that side. A normal HIT (no catch-up saccade) in a patient with acute severe vertigo is actually a warning sign for a CENTRAL cause (part of the 'HINTS' exam)." },
        { tone: "amber", label: "⚠️ Tip", text: "This test is part of the broader HINTS battery (Head Impulse, Nystagmus, Test of Skew) used to distinguish peripheral from central causes of acute vertigo — a normal HIT with direction-changing nystagmus and skew deviation is concerning for central pathology (e.g. stroke) and warrants urgent medical evaluation." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "No catch-up saccade either side" },
      { k: "Abnormal right/left", v: "Catch-up saccade on turning that direction — peripheral deficit on that side" },
    ]},
    interpret: {
      normal: ["No catch-up saccade — intact VOR bilaterally"],
      abnormal: ["Catch-up saccade → peripheral vestibular hypofunction on that side, guides vestibular rehabilitation (gaze stabilisation exercises) prescription"],
      redFlags: ["A normal HIT in a patient with acute, severe, continuous vertigo is paradoxically concerning for a CENTRAL cause — combine with nystagmus pattern and skew testing, and refer urgently if central features are present"],
      note: "Interpret HIT alongside nystagmus pattern and the full clinical picture (HINTS) rather than in isolation, especially in acute presentations where distinguishing peripheral from central cause is time-critical.",
    },
  },

  "Vestibular Disorders|||Nystagmus assessment": {
    title: "Nystagmus Assessment",
    icon: "👁️",
    category: "Learn · Neuro · Vestibular",
    perform: {
      image: null,
      caption: "Observe eyes at rest and through range of gaze, note direction and pattern",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, good lighting; ideally use Frenzel goggles or similar if available to remove visual fixation suppression, which can mask peripheral nystagmus." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe the eyes at primary gaze and through the range of horizontal and vertical gaze for spontaneous nystagmus; classify by direction (horizontal, vertical, torsional), whether it changes direction with gaze direction, and whether it's gaze-evoked (only present on eccentric gaze)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Peripheral nystagmus is typically unidirectional (same fast-phase direction regardless of gaze direction) and suppresses with visual fixation. Direction-CHANGING nystagmus (fast phase reverses with gaze direction) is a red flag for a central cause." },
        { tone: "amber", label: "⚠️ Tip", text: "Removing fixation (Frenzel goggles, or simply having the patient close their eyes briefly then observing immediately on opening) can unmask nystagmus that fixation was suppressing — important not to miss a peripheral finding." },
      ],
    },
    scaleLabel: "Pattern classification",
    scale: { type: "table", rows: [
      { k: "None", v: "No spontaneous nystagmus" },
      { k: "Horizontal / Vertical / Torsional", v: "Direction of the beat" },
      { k: "Direction-changing", v: "Fast phase reverses with gaze — central red flag" },
      { k: "Gaze-evoked", v: "Only present on eccentric gaze" },
    ]},
    interpret: {
      normal: ["No spontaneous nystagmus"],
      abnormal: ["Unidirectional, fixation-suppressible → typically peripheral", "Direction-changing, vertical, or fixation-resistant → concerning for central cause, refer promptly"],
      redFlags: ["Direction-changing or purely vertical nystagmus with acute vertigo — treat as possible central (e.g. cerebellar/brainstem stroke) until proven otherwise"],
      note: "Nystagmus pattern is one of the most important bedside features for peripheral-vs-central triage in acute vertigo — document direction and behaviour precisely, not just 'nystagmus present'.",
    },
  },

  "Vestibular Disorders|||Dynamic Gait Index": {
    title: "Dynamic Gait Index (DGI)",
    icon: "🚶",
    category: "Learn · Neuro · Vestibular",
    perform: {
      image: null,
      caption: "8-item gait test with head turns, pace changes, obstacles, and stairs, /24",
      boxes: [
        { tone: "", label: "👤 Position", text: "A clear walkway of adequate length, plus items needed for specific tasks (an object to step over, stairs if included in the version used)." },
        { tone: "blue", label: "🖐️ Technique", text: "Administer the 8 standardised items — gait on a level surface, gait with speed changes, gait with horizontal head turns, gait with vertical head turns, gait and pivot turn, stepping over an obstacle, stepping around obstacles, and steps — scoring each 0 (severe impairment) to 3 (normal)." },
        { tone: "purple", label: "🩺 Special consideration", text: "DGI was specifically developed and validated in vestibular/balance-impaired populations, and remains one of the standard tools for tracking dynamic gait/balance change over a course of vestibular rehabilitation." },
        { tone: "amber", label: "⚠️ Tip", text: "The Functional Gait Assessment (FGA) is a related, extended 10-item version with added narrow-base/eyes-closed/backward-walking items that better avoids a ceiling effect in higher-functioning patients — use FGA instead if the patient scores near the DGI maximum early on." },
      ],
    },
    scaleLabel: "8 items, /24",
    scale: { type: "table", rows: [
      { k: "Score", v: "0-24, each of 8 items scored 0 (severe) to 3 (normal)" },
      { k: "≤19/24", v: "Associated with increased fall risk" },
    ]},
    interpret: {
      normal: ["≥19/24 (specific cutoffs vary by population studied)"],
      abnormal: ["Low score → increased fall risk, prioritise dynamic balance and gait training addressing the specific failed items (e.g. head turns, obstacle negotiation)"],
      note: "Note WHICH specific items were failed, not just the total — this directs which specific skill to target in vestibular rehabilitation.",
    },
  },

  "Vestibular Disorders|||Dizziness Handicap Inventory screen": {
    title: "Dizziness Handicap Inventory (DHI)",
    icon: "📋",
    category: "Learn · Neuro · Vestibular",
    perform: {
      image: null,
      caption: "25-item self-report questionnaire, physical/emotional/functional impact, 0–100",
      boxes: [
        { tone: "", label: "👤 Position", text: "Self-administered or interview-administered questionnaire; a quiet setting where the patient can consider each item without time pressure." },
        { tone: "blue", label: "🖐️ Technique", text: "The patient rates 25 items across physical, emotional, and functional domains describing how dizziness has affected their life (e.g. 'does looking up increase your problem?', 'because of your problem, are you afraid to stay home alone?'), each scored and summed to a total out of 100." },
        { tone: "purple", label: "🩺 Special consideration", text: "DHI captures the PERCEIVED HANDICAP/impact of dizziness on daily life and psychological wellbeing — it doesn't measure vestibular function directly, and a patient can have significant DHI impact with relatively mild objective exam findings (or vice versa), reflecting genuinely different constructs." },
        { tone: "amber", label: "⚠️ Tip", text: "Re-administer periodically over the course of vestibular rehab as an outcome measure — DHI is sensitive to meaningful change and captures the patient's own experience of improvement, which objective balance measures alone can miss." },
      ],
    },
    scaleLabel: "0–100 (higher = greater self-perceived handicap)",
    scale: { type: "meter", rows: [
      { chip: "0-30", color: "#16A34A", name: "Mild handicap", desc: "" },
      { chip: "31-60", color: "#F59E0B", name: "Moderate handicap", desc: "" },
      { chip: "61-100", color: "#E9484B", name: "Severe handicap", desc: "" },
    ]},
    interpret: {
      normal: ["Low score — minimal self-perceived impact on daily life"],
      abnormal: ["High score → significant impact on daily function/participation, worth addressing psychological/anxiety components alongside physical vestibular rehabilitation"],
      note: "A high emotional-domain sub-score specifically flags anxiety/avoidance behaviour around movement, which itself needs to be addressed as part of graded exposure in vestibular rehab, not treated as separate from the physical program.",
    },
  },

  /* ===================== NEURO-RESPIRATORY ===================== */

  "Neuro-Respiratory|||Respiratory status": {
    title: "Respiratory Status",
    icon: "🫁",
    category: "Learn · Neuro · Neuro-Respiratory",
    perform: {
      image: null,
      caption: "Rate, SpO2, chest expansion, and respiratory muscle strength",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or semi-reclined, chest visible, pulse oximeter attached." },
        { tone: "blue", label: "🖐️ Technique", text: "Count respiratory rate over a full 60 seconds, record SpO2, and measure chest expansion (tape measure at a consistent landmark, e.g. xiphoid, comparing full inspiration to full expiration). Assess respiratory muscle strength by observing accessory muscle use, effort, and voice/breath support during conversation." },
        { tone: "purple", label: "🩺 Special consideration", text: "This is particularly relevant in high cervical/thoracic SCI (diaphragm is C3-5, intercostals are thoracic level — the higher the injury, the more respiratory involvement expected), neuromuscular disease, and any patient after prolonged ICU/ventilator stay." },
        { tone: "amber", label: "⚠️ Tip", text: "Screen respiratory status BEFORE mobilising any at-risk patient (high SCI, neuromuscular disease, recent prolonged bed rest) rather than after — this is a safety-first screen, not just a documentation item." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Respiratory rate", v: "Normal 12–20/min" },
      { k: "SpO2", v: "Normal ≥95% on room air (context-dependent)" },
      { k: "Respiratory muscle strength", v: "Normal / Reduced / Severely reduced (ventilator-dependent)" },
    ]},
    interpret: {
      normal: ["RR 12–20/min, SpO2 within normal limits, normal respiratory muscle strength, no accessory muscle use"],
      abnormal: ["Reduced strength with accessory muscle use → screen before mobilising, consider respiratory therapy involvement, monitor closely during activity"],
      redFlags: ["Marked desaturation, severe accessory muscle use, or inability to complete sentences — escalate to medical/respiratory team before proceeding"],
      note: "Respiratory status can change quickly in progressive neuromuscular conditions — reassess at each visit rather than relying on a baseline finding from days/weeks prior.",
    },
  },

  "Neuro-Respiratory|||Cough effectiveness": {
    title: "Cough Effectiveness",
    icon: "😮‍💨",
    category: "Learn · Neuro · Neuro-Respiratory",
    perform: {
      image: null,
      caption: "Ask the patient to cough forcefully, listen and observe the result",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated upright if possible (upright position generally supports a more effective cough than supine/reclined)." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to take a deep breath and cough as forcefully as they can; listen for the strength and quality of the cough and observe whether it produces an effective, audible expulsion or is weak/breathy and ineffective at moving secretions." },
        { tone: "purple", label: "🩺 Special consideration", text: "Cough strength depends on both inspiratory capacity (to get a large enough breath in) AND expiratory muscle strength (abdominals, intercostals) to generate the force — a weak cough in cervical/high-thoracic SCI or neuromuscular disease reflects loss of expiratory muscle innervation/strength specifically." },
        { tone: "amber", label: "⚠️ Tip", text: "A weak or absent cough is a red flag for secretion retention risk — consider manually assisted cough techniques (quad coughing/abdominal thrust assist) or mechanical insufflation-exsufflation as indicated, and involve respiratory therapy." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "Strong / effective", v: "Forceful, clears secretions well" },
      { k: "Weak but functional", v: "Reduced force, adequate for now" },
      { k: "Ineffective", v: "Cannot clear secretions unaided" },
      { k: "Absent", v: "No functional cough at all" },
    ]},
    interpret: {
      normal: ["Strong, effective cough"],
      abnormal: ["Weak/ineffective/absent → secretion retention risk, teach assisted cough techniques and involve respiratory therapy for airway clearance planning"],
      note: "Reassess cough effectiveness whenever respiratory infection risk is elevated (e.g. during a chest infection) — it can decline acutely even in a patient with a previously adequate cough.",
    },
  },

  "Neuro-Respiratory|||Breathing pattern": {
    title: "Breathing Pattern",
    icon: "〰️",
    category: "Learn · Neuro · Neuro-Respiratory",
    perform: {
      image: null,
      caption: "Observe chest/abdominal movement through several breath cycles",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, semi-reclined or supine, chest and abdomen both visible." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe the relative movement of chest and abdomen through several natural breath cycles without the patient consciously altering their breathing (announce you're just observing generally, not asking them to breathe differently). Note whether it's normal diaphragmatic, paradoxical (abdomen moves inward on inspiration instead of out), accessory-muscle dominant, shallow, or irregular/ataxic." },
        { tone: "purple", label: "🩺 Special consideration", text: "Paradoxical (abdominal) breathing — the abdomen sucking IN on inspiration instead of expanding out — suggests diaphragm weakness/paralysis, since the diaphragm normally descends and pushes the abdominal contents out; the accessory muscles are compensating instead." },
        { tone: "amber", label: "⚠️ Tip", text: "Irregular or 'ataxic' breathing patterns (erratic rate and depth) can reflect brainstem respiratory centre involvement and are a more concerning central finding — differentiate this from simple shallow breathing due to pain or weakness." },
      ],
    },
    scaleLabel: "Patterns observed",
    scale: { type: "table", rows: [
      { k: "Normal / diaphragmatic", v: "Coordinated chest/abdomen expansion" },
      { k: "Paradoxical (abdominal)", v: "Abdomen moves IN on inspiration — diaphragm weakness" },
      { k: "Accessory muscle dominant", v: "Neck/shoulder muscles doing the work" },
      { k: "Shallow / Irregular-ataxic", v: "Reduced depth / erratic rate and depth" },
    ]},
    interpret: {
      normal: ["Coordinated diaphragmatic breathing, minimal accessory muscle use"],
      abnormal: ["Paradoxical pattern → diaphragm weakness, correlates with cervical SCI level; consider positioning and respiratory muscle training as tolerated"],
      redFlags: ["New irregular/ataxic pattern → possible brainstem involvement, escalate for urgent medical review"],
      note: "Document pattern findings alongside respiratory rate and SpO2 for a complete respiratory picture — the pattern often explains WHY the rate/effort findings look the way they do.",
    },
  },

  "Neuro-Respiratory|||Secretion assessment": {
    title: "Secretion Assessment",
    icon: "💧",
    category: "Learn · Neuro · Neuro-Respiratory",
    perform: {
      image: null,
      caption: "Auscultate and observe for audible/visible secretions and clearance ability",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or positioned as tolerated; stethoscope available if auscultating." },
        { tone: "blue", label: "🖐️ Technique", text: "Listen for audible secretions (rattling, gurgling sounds with breathing) and observe whether the patient is managing to clear them independently through coughing/swallowing, or whether they're pooling and require assistance (manual techniques, suctioning)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Secretion burden interacts directly with cough effectiveness — a patient with both a weak cough AND significant secretions is at meaningfully higher risk of airway obstruction/aspiration pneumonia than either finding alone, so consider them together." },
        { tone: "amber", label: "⚠️ Tip", text: "Copious secretions requiring suction is a trigger to loop in respiratory therapy/nursing promptly rather than managing in isolation during a therapy session — this is a shared airway-safety concern across the team." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "None / minimal", v: "No concerning secretion burden" },
      { k: "Present, clearing independently", v: "Patient managing without assistance" },
      { k: "Present, needs assistance", v: "Requires assisted cough/positioning to clear" },
      { k: "Copious, suction required", v: "Beyond assisted-cough capacity" },
    ]},
    interpret: {
      normal: ["Minimal secretions, clearing independently"],
      abnormal: ["Needs assistance/suction → coordinate airway clearance plan with respiratory therapy/nursing, consider positioning (postural drainage where appropriate) and timing of mobilisation around clearance"],
      note: "Reassess secretion burden at the start of every session for at-risk patients — it can change meaningfully day to day, especially during an active respiratory illness.",
    },
  },

  /* ===================== COMMUNICATION / BULBAR ===================== */

  "Communication / Bulbar|||Dysarthria screen": {
    title: "Dysarthria Screen",
    icon: "🗣️",
    category: "Learn · Neuro · Communication / Bulbar",
    perform: {
      image: null,
      caption: "Listen during conversation and structured speech tasks — bedside screen only",
      boxes: [
        { tone: "", label: "👤 Position", text: "Quiet environment to minimise background noise interference with listening." },
        { tone: "blue", label: "🖐️ Technique", text: "Listen to the patient's spontaneous conversational speech and, if needed, a structured task (reading a short passage, repeating words) for quality — clear/normal, slurred, slow/effortful, hypophonic (quiet), or nasal-sounding." },
        { tone: "purple", label: "🩺 Special consideration", text: "Different dysarthria patterns can suggest different underlying causes (e.g. hypophonic/monotone speech in Parkinson's, slurred/slow speech with UMN weakness, nasal quality with palatal weakness) — but this is a BEDSIDE SCREEN, not a diagnostic classification." },
        { tone: "amber", label: "⚠️ Tip", text: "Any suspected speech impairment should be formally referred to speech-language pathology for diagnostic assessment and management — this screen is to flag the need for referral, not to replace it." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Clear / normal", v: "No speech quality concerns" },
      { k: "Slurred / slow-effortful", v: "Reduced articulatory precision or speed" },
      { k: "Hypophonic", v: "Reduced volume" },
      { k: "Nasal quality", v: "Suggests palatal/velopharyngeal involvement" },
    ]},
    interpret: {
      normal: ["Clear, normal speech"],
      abnormal: ["Any dysarthria pattern → refer to speech-language pathology for formal assessment; note the impact on the patient's ability to communicate needs (including pain, distress) during therapy"],
      note: "A patient with dysarthria may have completely intact cognition and language content — don't let unclear speech lead to assumptions about cognitive status.",
    },
  },

  "Communication / Bulbar|||Voice / speech intelligibility": {
    title: "Voice / Speech Intelligibility",
    icon: "🔊",
    category: "Learn · Neuro · Communication / Bulbar",
    perform: {
      image: null,
      caption: "Rate how understandable speech is in practice, in context",
      boxes: [
        { tone: "", label: "👤 Position", text: "Natural conversation setting, both with and without contextual cues (e.g. topic known in advance vs. unknown) if possible." },
        { tone: "blue", label: "🖐️ Technique", text: "Rate overall functional intelligibility — how much of what the patient says can actually be understood — rather than rating specific articulation errors in isolation; note whether intelligibility depends on the listener already knowing the topic/context or being familiar with the patient." },
        { tone: "purple", label: "🩺 Special consideration", text: "Intelligibility 'only to familiar listeners' (family, regular carers) but not to unfamiliar staff has direct, practical implications for safety communication (e.g. reporting pain or an urgent need to a new nurse) and should be flagged explicitly to the team." },
        { tone: "amber", label: "⚠️ Tip", text: "If intelligibility is significantly reduced, establish and document a backup communication method (yes/no signals, a communication board, writing) proactively rather than reactively during an urgent situation." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "Fully intelligible", v: "Understood by any listener" },
      { k: "Intelligible with effort/context", v: "Understandable but requires listener effort" },
      { k: "Intelligible only to familiar listeners", v: "Family/regular carers only" },
      { k: "Unintelligible", v: "Not functionally understood by speech alone" },
    ]},
    interpret: {
      normal: ["Fully intelligible to any listener"],
      abnormal: ["Reduced intelligibility → establish a backup communication method with the whole care team, refer to speech-language pathology"],
      note: "Reassess intelligibility in different contexts (quiet vs. noisy, familiar vs. unfamiliar listener, fatigued vs. rested) — it can vary meaningfully and a single rating may not capture the full picture.",
    },
  },

  "Communication / Bulbar|||Swallowing screen": {
    title: "Swallowing Screen",
    icon: "🥤",
    category: "Learn · Neuro · Communication / Bulbar",
    perform: {
      image: null,
      caption: "Bedside observation only — not a diagnostic swallow evaluation",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated as upright as possible; only proceed with any oral trial if the patient is alert and this is within your scope/facility protocol." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe for overt signs during any oral intake or trial swallow (per your facility's protocol) — coughing during or after swallowing, a wet/gurgly voice quality after the swallow, delayed initiation of the swallow, or drooling." },
        { tone: "purple", label: "🩺 Special consideration", text: "This is a BEDSIDE SCREEN, not a diagnostic swallow evaluation — a formal instrumental assessment (videofluoroscopy or FEES) performed by speech-language pathology is needed to properly characterise aspiration risk, especially since 'silent aspiration' (no cough response) can occur without any overt bedside sign." },
        { tone: "amber", label: "⚠️ Tip", text: "Any positive sign — or significant clinical suspicion even without an overt sign in a high-risk patient (e.g. brainstem stroke, bulbar ALS) — warrants holding oral intake and an urgent formal speech-language pathology referral rather than proceeding on a 'wait and see' basis." },
      ],
    },
    scaleLabel: "Signs screened",
    scale: { type: "table", rows: [
      { k: "No overt signs", v: "No coughing, wet voice, or drooling observed" },
      { k: "Coughing with intake", v: "During or after swallow" },
      { k: "Wet / gurgly voice after swallow", v: "Suggests residue in the airway" },
      { k: "Delayed swallow initiation / Drooling", v: "Additional positive signs" },
    ]},
    interpret: {
      normal: ["No overt signs on bedside screen"],
      abnormal: ["Any positive sign → hold oral intake, refer urgently to speech-language pathology for formal dysphagia evaluation before advancing diet"],
      redFlags: ["High clinical suspicion in a high-risk diagnosis even with a 'clean' bedside screen — silent aspiration is possible; don't let a negative bedside screen alone clear a high-risk patient for full oral intake"],
      note: "Document referral status explicitly (referred/pending/completed) — this is a patient-safety handoff item, not just a clinical note.",
    },
  },

  /* ===================== PERIPHERAL NERVE ===================== */

  "Peripheral Nerve|||Neurodynamic / neural mobility testing": {
    title: "Neurodynamic / Neural Mobility Testing",
    icon: "🧵",
    category: "Learn · Neuro · Peripheral Nerve",
    perform: {
      image: null,
      caption: "SLR, upper limb tension test, slump test — each sensitised by a remote/distal movement",
      boxes: [
        { tone: "", label: "👤 Position", text: "Supine for SLR and ULTT; seated (or the standardised slump position) for the slump test." },
        { tone: "blue", label: "🖐️ Technique", text: "Straight leg raise (SLR): passively raise the extended leg and note the range/symptoms, then sensitise with ankle dorsiflexion. Upper limb tension test (ULTT): a sequenced combination of shoulder, elbow, wrist, and finger positioning to load the brachial plexus/peripheral nerves, sensitised with cervical lateral flexion away from/toward the test side. Slump test: seated slump posture with neck flexion and knee extension, sensitised with ankle dorsiflexion." },
        { tone: "purple", label: "🩺 Special consideration", text: "A positive neurodynamic test specifically REPRODUCES THE PATIENT'S FAMILIAR SYMPTOMS and is meaningfully altered by the remote sensitising movement (e.g. symptoms change with ankle dorsiflexion during SLR) — this structural differentiation is what confirms a neural, rather than purely muscular, source." },
        { tone: "amber", label: "⚠️ Tip", text: "Always compare bilaterally, and stop at the first onset of the patient's familiar symptoms rather than pushing to end-range discomfort — the test is about symptom reproduction, not maximal range." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Negative", v: "No symptom reproduction, or reproduction not altered by sensitising movement" },
      { k: "Positive", v: "Reproduces familiar symptoms, altered by remote sensitising movement" },
    ]},
    interpret: {
      normal: ["Negative — full, symmetrical, symptom-free range on all tests performed"],
      abnormal: ["Positive → suggests neural tissue involvement/reduced mobility at the level implicated by the specific test and sensitising component; guides neural mobilisation treatment planning"],
      note: "Document which SPECIFIC sensitising component reproduced symptoms (e.g. 'positive SLR at 40°, symptoms increase with ankle dorsiflexion') — this level of detail is what makes the finding clinically actionable and trackable over time.",
    },
  },

  "Peripheral Nerve|||Tinel's sign": {
    title: "Tinel's Sign",
    icon: "👆",
    category: "Learn · Neuro · Peripheral Nerve",
    perform: {
      image: null,
      caption: "Light tapping over the suspected nerve entrapment/injury site",
      boxes: [
        { tone: "", label: "👤 Position", text: "The suspected nerve site exposed and accessible (e.g. volar wrist for median nerve/carpal tunnel, posterior elbow for ulnar nerve/cubital tunnel, fibular head for common peroneal nerve)." },
        { tone: "blue", label: "🖐️ Technique", text: "Tap lightly but firmly with a finger or reflex hammer directly over the suspected nerve entrapment or injury site, working from distal to proximal (or at the specific site of concern) and ask the patient to report any tingling/paraesthesia and exactly where it's felt." },
        { tone: "purple", label: "🩺 Special consideration", text: "A positive test reproduces tingling specifically in the distribution of the nerve being tapped (e.g. thumb/index/middle finger for median nerve) — tingling in a different distribution, or generalised discomfort from the tapping itself, is not a true positive." },
        { tone: "amber", label: "⚠️ Tip", text: "Tinel's sign can also be used PROGRESSIVELY to track nerve regeneration after injury/repair — tapping along the nerve's course and finding the most DISTAL point that reproduces tingling gives a rough indication of how far the regenerating nerve has grown ('advancing Tinel's')." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Negative", v: "No tingling reproduced with tapping" },
      { k: "Positive", v: "Reproduces tingling in the nerve's sensory distribution" },
    ]},
    interpret: {
      normal: ["Negative at the site tested"],
      abnormal: ["Positive → supports nerve entrapment/irritation at that site (e.g. positive at the wrist supports carpal tunnel syndrome); correlate with the broader clinical picture and other special tests"],
      note: "Tinel's has good sensitivity but only moderate specificity for entrapment neuropathies — use it as one supporting finding alongside history, other special tests, and (where available) nerve conduction studies.",
    },
  },

  "Peripheral Nerve|||Muscle wasting": {
    title: "Muscle Wasting / Atrophy",
    icon: "📉",
    category: "Learn · Neuro · Peripheral Nerve",
    perform: {
      image: null,
      caption: "Visual inspection and bilateral comparison, note distribution",
      boxes: [
        { tone: "", label: "👤 Position", text: "Adequate exposure of the limb/area being examined, good lighting, both sides visible for comparison." },
        { tone: "blue", label: "🖐️ Technique", text: "Visually inspect and, where useful, measure circumference at a consistent landmark bilaterally, looking specifically for asymmetric muscle bulk loss. Note the exact distribution — a single muscle, a group sharing one peripheral nerve, or a broader myotomal/root pattern." },
        { tone: "purple", label: "🩺 Special consideration", text: "The DISTRIBUTION pattern is highly localising — e.g. isolated thenar eminence wasting specifically suggests median nerve (carpal tunnel) involvement, while wasting following a broader nerve root/myotomal pattern suggests a more proximal (root/plexus) lesion instead." },
        { tone: "amber", label: "⚠️ Tip", text: "Look for fasciculations (fine, spontaneous muscle twitches) at rest alongside wasting — fasciculations combined with wasting and weakness is a pattern that should prompt consideration of a lower motor neuron process and appropriate referral." },
      ],
    },
    scaleLabel: "Documentation",
    scale: { type: "table", rows: [
      { k: "Distribution", v: "Single muscle / peripheral nerve territory / myotomal-root pattern" },
      { k: "Symmetry", v: "Unilateral (focal) vs. bilateral" },
      { k: "Associated findings", v: "Fasciculations present? Sensory changes in the same distribution?" },
    ]},
    interpret: {
      normal: ["Symmetrical muscle bulk, no focal wasting"],
      abnormal: ["Focal wasting in a specific nerve distribution → supports a corresponding entrapment/injury diagnosis; correlate with strength and sensory findings in the same distribution"],
      redFlags: ["Wasting with fasciculations and progressive weakness — consider motor neuron disease, refer to neurology promptly"],
      note: "Photograph or precisely measure and document wasting at baseline where possible — this is one of the more objectively trackable findings for monitoring nerve recovery or disease progression over time.",
    },
  },

  "Peripheral Nerve|||Peripheral sensory/motor distribution": {
    title: "Peripheral Sensory/Motor Distribution",
    icon: "🗺️",
    category: "Learn · Neuro · Peripheral Nerve",
    perform: {
      image: null,
      caption: "Map the exact boundary of any sensory/motor deficit against known patterns",
      boxes: [
        { tone: "", label: "👤 Position", text: "Full exposure of the affected area, systematic mapping from normal into affected tissue." },
        { tone: "blue", label: "🖐️ Technique", text: "Carefully map the exact boundary of any sensory loss or motor weakness found elsewhere in the exam, and compare the pattern against three reference templates: a dermatomal/myotomal (nerve root) pattern, a single peripheral nerve's known cutaneous/motor territory, or a symmetrical distal 'glove-and-stocking' pattern." },
        { tone: "purple", label: "🩺 Special consideration", text: "This pattern recognition is one of the most powerful localizing tools in the whole peripheral nervous system exam — a dermatomal pattern points to a nerve root problem, a single peripheral nerve territory points to a focal entrapment/injury, and a symmetrical glove-and-stocking pattern points to a length-dependent polyneuropathy (e.g. diabetic)." },
        { tone: "amber", label: "⚠️ Tip", text: "Draw or clearly describe the boundary in the chart (not just 'reduced sensation in the hand') — precise mapping is what actually distinguishes between these three patterns and drives the differential diagnosis." },
      ],
    },
    scaleLabel: "Pattern reference",
    scale: { type: "table", rows: [
      { k: "Dermatomal / myotomal", v: "Suggests nerve root involvement" },
      { k: "Single peripheral nerve territory", v: "Suggests focal entrapment/injury" },
      { k: "Glove-and-stocking (symmetric, distal)", v: "Suggests polyneuropathy" },
    ]},
    interpret: {
      normal: ["No deficit, or a pattern fully consistent with a known, already-diagnosed lesion"],
      abnormal: ["Pattern that doesn't fit the expected distribution for the presumed diagnosis → reconsider the differential, correlate with nerve conduction studies/imaging as needed"],
      note: "This finding is most powerful when triangulated with the muscle wasting distribution and reflex findings from the same exam — look for a single, coherent pattern across all three rather than reading each in isolation.",
    },
  },

  /* ===================== ATAXIA ===================== */

  "Ataxia|||SARA (Scale for Assessment and Rating of Ataxia)": {
    title: "SARA (Scale for Assessment and Rating of Ataxia)",
    icon: "🧭",
    category: "Learn · Neuro · Ataxia",
    perform: {
      image: null,
      caption: "8-item clinical scale, /40 total, higher = more severe ataxia",
      boxes: [
        { tone: "", label: "👤 Position", text: "Requires standing space for gait/stance items and a seated position for the limb/speech items — plan the room setup before starting." },
        { tone: "blue", label: "🖐️ Technique", text: "Administer the 8 standardised items in sequence: gait, stance, sitting, speech disturbance, finger-chase, nose-finger test, fast alternating hand movements, and heel-shin slide — each scored per the SARA manual's defined criteria, summed to a total out of 40." },
        { tone: "purple", label: "🩺 Special consideration", text: "SARA is widely used as both a clinical severity measure and an outcome measure in ataxia research/trials — its item set deliberately spans axial (gait, stance, sitting), speech, and appendicular (limb) domains for a comprehensive severity picture in one scale." },
        { tone: "amber", label: "⚠️ Tip", text: "Administer in the same order each time and under similar conditions (e.g. fatigue level, time of day) for the most reliable tracking of change over successive assessments." },
      ],
    },
    scaleLabel: "8 items, /40",
    scale: { type: "table", rows: [
      { k: "0", v: "No ataxia" },
      { k: "Higher score", v: "Progressively more severe ataxia" },
      { k: "40", v: "Maximum severity across all 8 items" },
    ]},
    interpret: {
      normal: ["Low total score, near 0 — minimal ataxic signs"],
      abnormal: ["Rising score → progressive ataxia severity; track sub-scores (e.g. gait vs. speech vs. limb items) to see which domain is driving the change"],
      note: "In progressive ataxic conditions, SARA trend over time is generally more clinically meaningful than any single absolute score.",
    },
  },

  "Ataxia|||Truncal ataxia screen": {
    title: "Truncal Ataxia Screen",
    icon: "🧍",
    category: "Learn · Neuro · Ataxia",
    perform: {
      image: null,
      caption: "Observe unsupported sitting/standing trunk control",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated unsupported on a firm surface with feet unsupported (or standing, if safe, feet together) — a spotter present given fall risk." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe the trunk at rest for spontaneous titubation (rhythmic to-and-fro swaying/tremor of the trunk/head) and assess how well the patient maintains an upright unsupported position without excessive sway or the need to catch themselves." },
        { tone: "purple", label: "🩺 Special consideration", text: "Truncal (axial) ataxia specifically implicates the CEREBELLAR VERMIS (midline structures), whereas limb/appendicular ataxia (dysmetria, intention tremor on finger-to-nose) more typically implicates the cerebellar hemispheres — this is a useful localizing distinction when a patient has one pattern more than the other." },
        { tone: "amber", label: "⚠️ Tip", text: "A patient can have significant truncal ataxia with relatively PRESERVED limb coordination (or vice versa) — always test both, don't assume one implies the other." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Stable, no excessive sway" },
      { k: "Mild sway/instability", v: "Some observable sway, maintains position" },
      { k: "Marked truncal ataxia", v: "Unable to sit unsupported" },
    ]},
    interpret: {
      normal: ["Stable unsupported sitting/standing, no titubation"],
      abnormal: ["Marked truncal ataxia → unable to sit unsupported, prioritise trunk control/core stability work as a foundation before higher-level balance and gait training can meaningfully progress"],
      note: "Document whether truncal ataxia is out of proportion to limb findings — this pattern specifically points toward cerebellar vermis involvement and is worth flagging in the clinical interpretation.",
    },
  },
};

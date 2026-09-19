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

const HANDWRITTEN_CASES = [
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

// Compact case format -> the step list the case player renders.
function buildCase(c) {
  return {
    id: c.id, number: c.number, specialty: c.specialty, difficulty: c.difficulty, title: c.title, stem: c.stem,
    conditionId: c.conditionId,
    steps: [
      { key: "profile", title: "Patient profile", items: c.profile },
      { key: "complaint", title: "Chief complaint", text: c.complaint },
      { key: "history", title: "History of the problem", items: c.history },
      { key: "subjective", title: "Subjective assessment", items: c.subjective },
      { key: "objective", title: "Objective findings", items: c.objective },
      { key: "assessment", title: "Assessment", text: c.assessment },
      { key: "reasoning", title: "Clinical reasoning", items: c.reasoning, quiz: c.quiz },
      { key: "plan", title: "Treatment plan", items: c.plan },
      { key: "followup", title: "Follow-up and outcome", items: c.followup },
    ],
  };
}
const opts = (a, b, c, d) => [{ id: "A", text: a }, { id: "B", text: b }, { id: "C", text: c }, { id: "D", text: d }];

const COMPACT_CASES = [
  {
    id: "case-02-frozen-shoulder", number: "02", specialty: "msk", difficulty: "intermediate", title: "Frozen Shoulder",
    stem: "54-year-old woman with diabetes, 5 months of right shoulder pain and stiffness.",
    profile: [["Age / sex", "54-year-old woman"], ["Occupation", "Secretary, right-hand dominant"], ["Medical history", "Type 2 diabetes for 8 years, HbA1c 8.1%"], ["Medication", "Metformin, gliclazide"]],
    complaint: "Right shoulder pain and progressive stiffness for 5 months. She cannot reach behind her back to fasten her bra or lift her arm to wash her hair, and pain wakes her at night.",
    history: [["Onset", "Insidious, no injury"], ["Progress", "Pain first, then increasing stiffness over 3 months"], ["Investigations", "GP X-ray normal (no arthritis, no calcific deposit)"], ["Neck", "No neck pain, no arm tingling"], ["Systemic", "No fever, weight loss, or history of cancer"]],
    subjective: [["Pain", "5/10 at rest, 8/10 with sudden movement"], ["Night", "Cannot lie on the right side; wakes 2–3 times"], ["Aggravating", "Reaching overhead or behind, dressing"], ["Irritability", "Moderate — pain settles within minutes of resting"], ["Goal", "Dress independently and sleep through the night"]],
    objective: [["Observation", "Guarded right arm, mild shoulder hitching on lifting"], ["Active ROM", "Flexion 95°, abduction 80° with hitching, external rotation 10°, internal rotation to buttock"], ["Passive ROM", "Same as active, with a firm capsular end-feel; external rotation most limited, then abduction, then internal rotation"], ["Resisted tests", "Strong; mild pain only"], ["Neck screen", "Full cervical movement, Spurling negative, neurology normal"], ["Outcome measures", "SPADI 68%, NPRS 5/10"]],
    assessment: "Adhesive capsulitis (frozen shoulder), diabetes-associated, in the freezing to early frozen stage: painful and progressively stiff. No red flags.",
    reasoning: [["Why not a rotator cuff tear?", "Passive movement is as limited as active movement and resisted tests are strong"], ["Why not glenohumeral arthritis?", "X-ray normal and the pattern is capsular with a firm, not bony, end-feel"], ["Why not neck referral?", "Neck movement does not change the shoulder pain and neurology is normal"], ["Risk factor", "Diabetes strongly increases risk and can slow recovery"]],
    quiz: { question: "Which finding best separates frozen shoulder from a rotator cuff tear?", options: opts("Night pain", "Passive movement is limited as much as active, with external rotation most affected", "Pain on reaching overhead", "Age over 50"), correctOptionId: "B", explanation: "In a cuff tear, passive range is usually preserved while active range is weak. In frozen shoulder the capsule itself is tight, so active and passive range are both limited in a capsular pattern, external rotation first. Night pain, painful reaching and age occur in both." },
    plan: [["Education", "Explain the usual course: painful, stiff, then thawing, often taking 1–3 years; most people recover well"], ["Painful stage", "Pain-guided gentle range within tolerance, grade I–II mobilisation, heat, sleeping positions; discuss a corticosteroid injection with the GP"], ["Stiff stage", "Grade III–IV glides, external rotation and elevation stretches, wand and table-slide self-stretches"], ["Avoid", "Forceful stretching while irritable, which can flare pain"], ["Medical", "Liaise with GP about glucose control"]],
    followup: [["Week 12", "NPRS 2/10, flexion 140°, external rotation 40°, SPADI 30%"], ["Sleep", "Sleeping through, lying on the right side again"], ["Outlook", "Continue home stretching; further gains can continue for months"]],
  },
  {
    id: "case-03-knee-oa", number: "03", specialty: "msk", difficulty: "beginner", title: "Knee Osteoarthritis",
    stem: "62-year-old woman with 2 years of worsening right knee pain on stairs.",
    profile: [["Age / sex", "62-year-old woman"], ["Occupation", "Retired teacher"], ["Build", "BMI 31"], ["Medical history", "Hypertension, no previous knee injury"]],
    complaint: "Right knee pain going up and down stairs and after sitting, getting worse over the last 3 months. She now walks for 10 minutes instead of 40.",
    history: [["Onset", "Gradual over 2 years, no injury"], ["Swelling", "Occasional after long walks"], ["Locking / giving way", "Neither"], ["Medication", "Paracetamol, partial relief"], ["Systemic", "No fever, other swollen joints, or night pain at rest"]],
    subjective: [["Pain", "5/10 on stairs, 2/10 at rest"], ["Stiffness", "Brief after sitting, morning stiffness under 20 minutes"], ["Aggravating", "Stairs, getting up from low chairs, long walks"], ["Goal", "Walk to the park for 30 minutes and play with her grandchildren"]],
    objective: [["Observation", "Mild bow-legged alignment, quadriceps wasting, small bony enlargement"], ["Gait", "Shortened stance on the right, antalgic"], ["ROM", "Right flexion 115° (left 135°), lacks 5° extension, crepitus"], ["Palpation", "Tender medial joint line, no warmth"], ["Special tests", "Ligaments stable, McMurray negative"], ["Strength", "Quadriceps 4/5, hip abductors 4-/5"], ["Function", "30-second chair stand 8 (below normal), TUG 11 s"], ["Outcome measures", "KOOS and WOMAC recorded"]],
    assessment: "Medial compartment knee osteoarthritis, mild to moderate. No red flags. Contributing factors: obesity, quadriceps and hip abductor weakness.",
    reasoning: [["Why diagnose clinically?", "Age over 45, activity-related pain, and morning stiffness of 30 minutes or less allow a clinical diagnosis without imaging"], ["Why not inflammatory arthritis?", "Brief stiffness, one joint, no systemic features"], ["Why not a meniscal tear?", "No injury, no locking, McMurray negative"], ["Target", "Strength, weight and activity are modifiable and drive symptoms"]],
    quiz: { question: "Which is the recommended core treatment for knee osteoarthritis?", options: opts("Arthroscopic lavage", "Education, exercise and weight management", "Rest until pain settles", "Immobilisation in a brace"), correctOptionId: "B", explanation: "Guidelines place education, exercise (strength and aerobic) and weight management first for every patient. Arthroscopic lavage is not recommended and prolonged rest or immobilisation weaken the muscles that protect the joint." },
    plan: [["Education", "OA is not simply wear and tear; movement is safe and helpful"], ["Exercise", "Quadriceps and hip abductor strengthening, aerobic walking or cycling, 2–3 times a week"], ["Weight", "Aim for a 5–10% loss with dietary advice"], ["Symptom relief", "Heat, cushioned footwear, pacing; analgesia via GP or pharmacist"], ["Function", "Sit-to-stand and step practice, gradual return to stairs"]],
    followup: [["Week 8", "NPRS 2/10, chair stand 12, TUG 8.5 s"], ["Activity", "Walking 30 minutes to the park"], ["Plan", "Self-managed gym programme with a review at 3 months"]],
  },
  {
    id: "case-04-cervical-radiculopathy", number: "04", specialty: "msk", difficulty: "intermediate", title: "Neck and Arm Pain",
    stem: "45-year-old software developer with neck pain and tingling in the right thumb and index finger.",
    profile: [["Age / sex", "45-year-old man"], ["Occupation", "Software developer, long hours at a desk"], ["Medical history", "Nothing significant, ex-smoker"]],
    complaint: "Right arm pain and tingling in the thumb and index finger for 2 weeks after waking with a stiff neck.",
    history: [["Onset", "Woke with neck stiffness, arm symptoms followed over 3 days"], ["Trauma", "None"], ["Red flags asked", "No bilateral symptoms, gait change, clumsy hands, bladder change, weight loss, or fever"], ["Treatment so far", "Ibuprofen, little relief"]],
    subjective: [["Pain", "Neck 4/10, arm 6/10"], ["Aggravating", "Looking up or to the right, long computer use"], ["Easing", "Resting the hand on top of the head"], ["Night", "Arm pain disturbs sleep"], ["Grip", "Feels slightly weak"]],
    objective: [["Observation", "Forward head posture, guarded neck"], ["Neck movement", "Extension and right rotation limited (under 60°) and reproduce arm symptoms"], ["Myotomes", "Wrist extension 4/5, biceps 4+/5, triceps 5/5"], ["Sensation", "Reduced light touch, thumb and index finger"], ["Reflexes", "Biceps and brachioradialis reduced on the right"], ["Neck tests", "Spurling positive, distraction relieves, upper limb neurodynamic test 1 positive"], ["Wrist", "Tinel and Phalen negative"], ["Upper motor neuron", "Hoffmann negative, gait normal"]],
    assessment: "Right C6 cervical radiculopathy, most likely from foraminal narrowing at C5–C6. No signs of myelopathy and no red flags.",
    reasoning: [["Test cluster", "Spurling, distraction, neurodynamic test and rotation under 60° were all positive; four of four makes radiculopathy highly likely"], ["Why not carpal tunnel?", "Wrist tests negative, reflexes reduced, and neck movement changes the symptoms"], ["Myelopathy screen", "Normal gait, no Hoffmann sign, no bilateral hand symptoms"], ["Prognosis", "Most cases improve within weeks to months with conservative care"]],
    quiz: { question: "Which finding most supports C6 root involvement rather than carpal tunnel syndrome?", options: opts("Tingling in the thumb and index finger", "Reduced biceps and brachioradialis reflexes, with neck movement reproducing the arm symptoms", "Symptoms at night", "Mild grip weakness"), correctOptionId: "B", explanation: "Carpal tunnel also gives thumb and index finger tingling, night symptoms and grip weakness. Reflex changes at C5–C6 and symptoms provoked or relieved by neck position point to the root, not the wrist." },
    plan: [["Education", "Explain the good prognosis and what to avoid: sustained extension and rotation towards the painful side"], ["Positions", "Shoulder-abduction relief position, workstation set-up, regular breaks"], ["Exercise", "Deep neck flexor training, scapular and thoracic mobility, gentle nerve sliders (not tensioners)"], ["Manual", "Thoracic mobilisation and a trial of cervical traction"], ["Monitor", "Re-check neurology each visit; refer urgently for progressive weakness or myelopathy signs"]],
    followup: [["Week 6", "Arm pain 1/10, tingling occasional, power 5/5, reflexes returning"], ["NDI", "34% at start, 10% at week 6"], ["Plan", "Independent programme, review if symptoms return"]],
  },
  {
    id: "case-05-ankle-sprain", number: "05", specialty: "sports", difficulty: "beginner", title: "Ankle Sprain",
    stem: "22-year-old footballer, lateral ankle pain and swelling after an inversion injury 4 days ago.",
    profile: [["Age / sex", "22-year-old man"], ["Sport", "Amateur footballer, plays twice a week"], ["Previous", "Sprained the same ankle a year ago"]],
    complaint: "Right ankle pain and swelling since landing on an opponent's foot during a match.",
    history: [["Mechanism", "Landed on another player's foot, ankle turned inwards"], ["Immediately", "Sharp pain, could take a few steps but limped off"], ["Since", "Ice, compression bandage, walking with a limp"], ["Numbness or tingling", "None"]],
    subjective: [["Pain", "5/10 walking, 2/10 resting"], ["Symptoms", "Swelling and bruising on the outer ankle; the ankle feels like it might give way"], ["Goal", "Back to football in 6 weeks"]],
    objective: [["Observation", "Swelling and bruising over the lateral malleolus and foot"], ["Ottawa ankle rules", "No bony tenderness at the posterior edge or tip of either malleolus, navicular, or base of 5th metatarsal; able to take 4 steps"], ["Ligament tests", "Anterior drawer mildly increased and painful, talar tilt mildly increased"], ["Syndesmosis", "Squeeze and external rotation stress tests negative"], ["ROM", "Dorsiflexion 8°, plantarflexion 40°, inversion painful"], ["Strength", "Peroneals 4/5"], ["Balance", "Reduced single-leg balance on the right"]],
    assessment: "Grade II lateral ankle sprain (anterior talofibular and possibly calcaneofibular ligaments). No fracture indicated by the Ottawa rules and no syndesmotic injury.",
    reasoning: [["Why no X-ray?", "The Ottawa ankle rules are negative"], ["High ankle sprain?", "Squeeze and external rotation tests negative, so a syndesmotic injury is unlikely"], ["Recurrence", "A previous sprain and mechanical laxity raise the risk of chronic ankle instability"], ["Priority", "Restore movement and control early, then rebuild sport-specific load"]],
    quiz: { question: "Which finding means an X-ray is not needed under the Ottawa ankle rules?", options: opts("Swelling and pain", "Able to take 4 steps and no bony tenderness at the malleolar edges, navicular or 5th metatarsal base", "No bruising", "Age under 30"), correctOptionId: "B", explanation: "The Ottawa rules ask for bony tenderness in defined places and inability to bear weight for four steps. If both are absent, fracture is very unlikely. Swelling, bruising and age do not decide it." },
    plan: [["Early", "Protect and optimally load: brace or tape for support, walk as pain allows, elevate and compress"], ["Range", "Ankle circles, calf stretch, early dorsiflexion"], ["Strength", "Peroneal strengthening with bands, calf raises"], ["Control", "Single-leg stance, wobble board, hopping progressions"], ["Return to play", "Pain-free jogging, cutting and hop tests before matches"], ["Prevention", "Brace or tape and neuromuscular training when back to sport"]],
    followup: [["Week 6", "Back to matches with a brace"], ["Function", "Balance symmetrical, hop tests within 10% of the other side"], ["Plan", "Continue balance training twice a week"]],
  },
  {
    id: "case-06-acl", number: "06", specialty: "sports", difficulty: "intermediate", title: "ACL Injury",
    stem: "24-year-old netball player who felt a pop and swelling after a landing 10 days ago.",
    profile: [["Age / sex", "24-year-old woman"], ["Sport", "Competitive netball, centre position"], ["Goal", "Return to top-level netball"]],
    complaint: "Right knee swelling and instability after a non-contact pivot while landing from a jump.",
    history: [["Mechanism", "Landed and twisted, felt and heard a pop"], ["Swelling", "Large, within 2 hours"], ["Since", "Could not continue playing, using one crutch"], ["Previous", "No earlier knee injuries"]],
    subjective: [["Pain", "3/10 at rest"], ["Function", "The knee gives way on turning; she cannot straighten it fully"], ["Concerns", "Whether she needs surgery and how long until she can play"]],
    objective: [["Effusion", "Moderate on the stroke test"], ["ROM", "5° to 100° (lacks extension)"], ["Quadriceps", "Inhibited, straight leg raise with a 10° lag"], ["Lachman", "Positive with a soft end-feel"], ["Anterior drawer", "Positive"], ["Pivot shift", "Not tolerated due to guarding"], ["Collaterals", "Stable at 0° and 30°"], ["Meniscus", "McMurray inconclusive"], ["Outcome measure", "IKDC recorded"]],
    assessment: "Suspected ACL rupture with possible meniscal injury; request MRI. Currently swollen and stiff, with a loss of extension.",
    reasoning: [["Which test?", "Lachman is the most sensitive test in the acute knee; pivot shift is specific but often cannot be done"], ["Why not operate now?", "A swollen, stiff knee with poor extension has a higher risk of stiffness after surgery"], ["Decision", "For a young pivoting athlete, reconstruction is usually recommended, after pre-operative rehabilitation"], ["Watch", "Locking would suggest a bucket-handle meniscal tear needing earlier review"]],
    quiz: { question: "Which test is most sensitive for an acute ACL tear?", options: opts("Pivot shift", "Lachman", "Posterior drawer", "Valgus stress"), correctOptionId: "B", explanation: "Lachman has the best sensitivity in the acute knee. Pivot shift is very specific but is difficult to perform when the patient is guarding. Posterior drawer tests the PCL and valgus stress the MCL." },
    plan: [["Pre-operative (3–4 weeks)", "Settle swelling, regain full extension and flexion, wake up the quadriceps (with electrical stimulation if needed), normal walking"], ["After surgery", "Early motion and extension, closed-chain strength, then running at around 12 weeks"], ["Later", "Change of direction and jumping from about 6 months, criteria-based not time-based"], ["Return to sport", "Not before 9 months; at least 90% limb symmetry on strength and hop tests, and psychological readiness"]],
    followup: [["Month 9", "Quadriceps and hop limb symmetry 93%"], ["Confidence", "ACL-RSI 74"], ["Outcome", "Back in full training, continuing neuromuscular and strength work"]],
  },
  {
    id: "case-07-tennis-elbow", number: "07", specialty: "sports", difficulty: "beginner", title: "Tennis Elbow",
    stem: "41-year-old recreational tennis player with 8 weeks of outer elbow pain.",
    profile: [["Age / sex", "41-year-old man"], ["Occupation", "Office worker, heavy mouse use"], ["Sport", "Recreational tennis, increased play recently"]],
    complaint: "Pain on the outside of the right elbow when gripping a cup, shaking hands, and hitting a backhand.",
    history: [["Onset", "Gradual over 8 weeks after playing more often"], ["Neck", "No neck pain"], ["Sensory", "No numbness or tingling"], ["Previous treatment", "Rested for a week, symptoms returned on restarting"]],
    subjective: [["Pain", "6/10 with gripping, 1/10 at rest"], ["Night", "Only mild ache"], ["Goal", "Play tennis without pain and grip comfortably at work"]],
    objective: [["Palpation", "Tender at the lateral epicondyle and common extensor origin"], ["Cozen's test", "Positive"], ["Mill's test", "Positive"], ["Grip", "Pain-free grip 22 kg on the right versus 34 kg on the left"], ["ROM", "Full elbow and wrist movement"], ["Neck and nerve", "Neck screen and radial nerve tension test negative"], ["Radial tunnel", "No tenderness 4 cm below the epicondyle"], ["Outcome measure", "PRTEE 48"]],
    assessment: "Lateral epicondylalgia (tendinopathy of the common extensor origin), load-related, reactive to degenerative stage.",
    reasoning: [["Why tendinopathy?", "Load-related pain at the tendon origin, worse on resisted wrist extension and gripping"], ["Why not radial tunnel syndrome?", "Tenderness is at the epicondyle, not over the supinator 4 cm distal, and the nerve test is negative"], ["Why not neck?", "Neck movement does not change the elbow pain"], ["Approach", "Load management and graded loading, not complete rest"]],
    quiz: { question: "Which finding points to lateral epicondylalgia rather than radial tunnel syndrome?", options: opts("Night pain", "Tenderness and pain on resisted wrist extension at the lateral epicondyle", "Pain when gripping", "Pain radiating to the forearm"), correctOptionId: "B", explanation: "Epicondylalgia is tender at the common extensor origin and provoked by resisted wrist and finger extension. Radial tunnel syndrome is tender over the supinator about 3–4 cm distal and is often provoked by resisted supination or middle finger extension. Night pain, grip pain and forearm spread occur in both." },
    plan: [["Education", "Explain that tendons need load to recover; reduce, not stop, aggravating activity"], ["Early", "Isometric wrist extensor holds for pain relief"], ["Progressive loading", "Wrist extension strengthening in stages (isotonic, then heavier and slower), then grip strengthening"], ["Ergonomics", "Mouse and keyboard set-up, racquet grip size and backhand technique"], ["Optional", "Counterforce strap during aggravating tasks"], ["Injection", "Corticosteroid gives short-term relief but worse long-term outcomes, so it is not first-line"]],
    followup: [["Week 12", "Pain-free grip 32 kg, PRTEE 12"], ["Function", "Back playing tennis with a pain-free backhand"]],
  },
  {
    id: "case-08-stroke", number: "08", specialty: "neuro", difficulty: "intermediate", title: "Stroke",
    stem: "66-year-old man, 10 days after a right middle cerebral artery stroke, now on the rehabilitation ward.",
    profile: [["Age / sex", "66-year-old man"], ["Medical history", "Hypertension and atrial fibrillation on anticoagulant"], ["Before the stroke", "Independent and working part-time"], ["Home", "Lives with his wife, 3 steps at the front door"]],
    complaint: "\"My left arm feels heavy and I can't walk safely.\" His wife is worried about him going home.",
    history: [["Event", "Sudden left weakness and slurred speech, CT confirmed right MCA infarct"], ["Progress", "Medically stable, catheter removed, on a modified diet"], ["Mood", "Low, frightened of falling"]],
    subjective: [["Patient goals", "Walk again and return home"], ["Family goals", "Safe transfers, be able to manage the front steps"]],
    objective: [["Alert and following commands", "GCS 15; left visuospatial neglect on line bisection"], ["Tone", "Modified Ashworth 1+ at the left elbow flexors, 1 at the ankle plantarflexors"], ["Power (left)", "Shoulder 2/5, elbow 3/5, wrist 2/5, hip flexion 3/5, knee extension 3+/5, ankle dorsiflexion 2/5"], ["Sensation", "Reduced left arm proprioception"], ["Shoulder", "One-finger subluxation, no pain"], ["Balance", "Sits with fair control; needs help to stand; Berg 22/56"], ["Gait", "One-person assist, left foot drop, swings the leg outwards"], ["Function", "Barthel 55, modified Rankin 4"]],
    assessment: "Sub-acute right MCA stroke with left hemiparesis, left neglect, and impaired balance and gait. Risks: falls, shoulder subluxation and pain, contracture, and deep vein thrombosis.",
    reasoning: [["Priorities", "Early, frequent, task-specific practice and preventing secondary problems"], ["Neglect", "Changes safety and set-up: approach from the right, cue scanning to the left"], ["Shoulder", "Protect the arm, avoid pulling it, position it supported"], ["Foot drop", "Assess for an orthosis or electrical stimulation to allow gait practice"]],
    quiz: { question: "Which approach has the best evidence for improving walking after stroke?", options: opts("Passive stretching only", "Repetitive, task-specific gait training with progressive intensity", "Bed rest until strength returns", "Splinting both wrists"), correctOptionId: "B", explanation: "Walking improves with more practice of walking itself, progressed in intensity. Passive stretching, rest and splints do not train the task and rest increases weakness and complications." },
    plan: [["Positioning", "Supported left arm, correct bed and chair positioning, regular changes"], ["Function", "Sit-to-stand, weight transfer, standing balance, then walking, using body-weight support or a treadmill as needed"], ["Foot drop", "Trial of an ankle-foot orthosis or functional electrical stimulation"], ["Arm", "Task-oriented practice, supported weight-bearing, protect the shoulder"], ["Neglect", "Cueing and scanning tasks; involve the family"], ["Team and discharge", "Occupational therapy and speech therapy, home assessment, rails for the steps"]],
    followup: [["Week 6", "Berg 41, walks 10 m at 0.6 m/s with a stick and orthosis"], ["Function", "Barthel 85, managing the steps with supervision"], ["Plan", "Discharged home with outpatient rehabilitation"]],
  },
  {
    id: "case-09-parkinsons", number: "09", specialty: "neuro", difficulty: "intermediate", title: "Parkinson's Disease",
    stem: "70-year-old man with Parkinson's disease, freezing at doorways and two falls in 3 months.",
    profile: [["Age / sex", "70-year-old man"], ["Diagnosis", "Parkinson's disease for 6 years, Hoehn and Yahr 2.5"], ["Medication", "Levodopa four times a day"], ["Home", "Lives with his wife"]],
    complaint: "His feet \"stick to the floor\" entering the kitchen and turning, and he has fallen twice.",
    history: [["Falls", "Both when turning, one at a doorway"], ["Fluctuations", "Worse about an hour before the next dose"], ["Other", "Smaller handwriting, quiet voice, some light-headedness on standing"]],
    subjective: [["Fear", "Avoids going out alone"], ["Goals", "Walk in the park with his wife and stop falling"]],
    objective: [["Tested \"on\" medication", "Stooped, reduced arm swing, shuffling steps"], ["Tremor and tone", "Right resting tremor, mild cogwheel rigidity"], ["Bradykinesia", "Reduced amplitude and speed on finger taps"], ["Gait", "Short steps, freezing on turning and at a doorway"], ["Balance", "Pull test: takes several steps back and needs to be caught"], ["Measures", "TUG 16 s, Berg 44/56, MDS-UPDRS III 28, FOG-Q 14"], ["Blood pressure", "No significant orthostatic drop"]],
    assessment: "Parkinson's disease with freezing of gait and postural instability, high fall risk.",
    reasoning: [["Timing", "Train in the \"on\" phase and note \"off\" phase problems"], ["Type of cue", "External cues (a line, a beat) work better than telling the patient to try harder"], ["Turning", "Wide turns instead of pivoting"], ["Dual tasking", "Avoid talking or carrying things while walking through a doorway"]],
    quiz: { question: "Which is the best physiotherapy strategy for freezing at a doorway?", options: opts("Hurry through before it happens", "External cues such as a line on the floor or a rhythmic beat, and a wide turn", "Wait still until the freeze passes", "Concentrate on each step silently"), correctOptionId: "B", explanation: "Freezing is a problem with automatic movement. External cues bypass it and a wide turn reduces the demand. Hurrying worsens freezing, waiting still can prolong it and attending to each step internally is less effective than an external cue." },
    plan: [["Amplitude training", "Large-amplitude movement training (LSVT BIG style)"], ["Gait", "Cueing with lines and a metronome, treadmill practice, turning practice"], ["Balance and strength", "Progressive balance and leg strength, tai chi or dance classes"], ["Falls prevention", "Home changes, footwear, remove thresholds, a plan for getting up"], ["Medication", "Share timing problems with the physician"], ["Education", "Include his wife in cueing strategies"]],
    followup: [["Week 12", "TUG 11 s, FOG-Q 9"], ["Falls", "None in the last 2 months"], ["Plan", "Maintenance classes and 6-month review"]],
  },
  {
    id: "case-10-cauda-equina", number: "10", specialty: "msk", difficulty: "advanced", title: "Back Pain With Urinary Change",
    stem: "38-year-old delivery driver with back pain, pain in both legs, and difficulty passing urine.",
    profile: [["Age / sex", "38-year-old man"], ["Occupation", "Delivery driver, lifts parcels"], ["Medical history", "Nothing significant, no cancer history"]],
    complaint: "Low back pain for 3 weeks, now pain down both legs. For the last 24 hours he has struggled to start passing urine and \"feels numb when wiping\".",
    history: [["Onset", "Lifting a heavy parcel 3 weeks ago; leg pain started 5 days ago and became bilateral"], ["Bladder", "Hesitancy for 2 days, weak stream and reduced sensation of a full bladder since yesterday"], ["Bowel", "Constipated for 3 days"], ["Sexual function", "Reduced erection"], ["Other", "No fever or trauma; ibuprofen not helping"]],
    subjective: [["Pain", "Bilateral leg pain 7/10, back 5/10"], ["Sensation", "\"Like sitting on a cold cushion\""], ["Worry", "Cannot sleep, wants an appointment this week"]],
    objective: [["Observation", "Walks normally, guarded back"], ["Lumbar movement", "Flexion limited by pain"], ["SLR", "Negative on both sides"], ["Power", "Mostly 5/5, plantarflexion 4/5 on both sides"], ["Sensation", "Reduced pinprick around the saddle area (S2–S4)"], ["Reflexes", "Ankle jerks reduced on both sides"], ["Note", "Negative SLR and near-normal power can falsely reassure"]],
    assessment: "Suspected cauda equina syndrome. This is a surgical emergency and needs same-day hospital assessment. Not a case for physiotherapy treatment.",
    reasoning: [["Red-flag cluster", "Bilateral leg pain, saddle sensory change, bladder and bowel disturbance and sexual dysfunction"], ["Conflicting findings", "A negative SLR and good power do not exclude it"], ["Time", "Outcomes depend on how quickly the compression is relieved"], ["Duty", "Act on the history and sensory findings; do not wait for more signs"]],
    quiz: { question: "What is the correct next action?", options: opts("Start lumbar traction and review next week", "Send him to the emergency department now for urgent MRI, with a phone handover", "Book a follow-up in a week and give exercises", "Advise rest and stronger anti-inflammatories"), correctOptionId: "B", explanation: "The combination of bilateral leg symptoms, saddle sensory change and bladder disturbance is treated as cauda equina until proven otherwise. He needs same-day emergency assessment and MRI. Treatment, delay, or reassurance because SLR was negative could cost him bladder, bowel and sexual function." },
    plan: [["Do not treat", "No manual therapy, traction or exercise"], ["Refer", "Emergency department today; he should not drive himself"], ["Handover", "Phone ahead using a structured summary: symptoms, timing, saddle findings, bladder changes"], ["Document", "Findings, time of referral and the advice given"], ["Support", "Explain calmly why this cannot wait"]],
    followup: [["Hospital", "MRI showed a large central L4–L5 disc; emergency decompression within 24 hours"], ["After surgery", "Bladder function slowly improving; rehabilitation started once cleared by the surgeon"], ["Learning", "Early recognition preserved recovery"]],
  },
  {
    id: "case-11-copd", number: "11", specialty: "cardio", difficulty: "intermediate", title: "COPD",
    stem: "68-year-old ex-smoker with COPD, breathless walking 100 metres.",
    profile: [["Age / sex", "68-year-old man"], ["Smoking", "40 pack-years, stopped 3 years ago"], ["Diagnosis", "COPD for 6 years, GOLD 3, two exacerbations last year"], ["Home", "Second-floor flat, lives with his wife"]],
    complaint: "Breathless walking more than 100 metres, morning cough with sputum, and he avoids activity for fear of getting breathless.",
    history: [["Treatment", "LAMA and LABA inhalers, no home oxygen"], ["Exacerbations", "Two in the last 12 months, one admitted"], ["Sleep", "Sleeps propped up on pillows"]],
    subjective: [["Dyspnoea", "MRC grade 3"], ["CAT score", "22"], ["Goals", "Manage the stairs and walk to the shops"]],
    objective: [["Observation", "Barrel chest, pursed-lip breathing, accessory muscle use, resting rate 22"], ["SpO2", "93% at rest, falls to 88% on exertion"], ["Chest", "Reduced air entry, prolonged expiration, scattered wheeze, no crackles"], ["Spirometry", "FEV1 42% predicted"], ["6-minute walk", "260 m, nadir SpO2 87%, Borg dyspnoea 6/10"], ["Strength", "One-minute sit-to-stand 12, quadriceps weak"], ["Posture", "Hunched, shoulders elevated"]],
    assessment: "COPD (GOLD 3) with exercise limitation, deconditioning and dyspnoea-driven avoidance. Exertional desaturation needs monitoring during exercise.",
    reasoning: [["Main driver", "Breathlessness leads to inactivity, which causes muscle weakness and more breathlessness"], ["Best evidence", "Pulmonary rehabilitation improves exercise capacity, breathlessness and quality of life"], ["Airway clearance", "Only needed if sputum retention is a problem; here it is mild"], ["Safety", "Monitor SpO2 and Borg scores; consider ambulatory oxygen if desaturation is significant"]],
    quiz: { question: "Which intervention has the strongest evidence for improving exercise capacity and breathlessness in stable COPD?", options: opts("Chest percussion", "Pulmonary rehabilitation with exercise training", "Bed rest", "High-flow oxygen at rest for everyone"), correctOptionId: "B", explanation: "Structured pulmonary rehabilitation with aerobic and strength training and education is the best-evidenced treatment for stable COPD. Chest percussion and rest do not improve capacity, and oxygen at rest is only for those who meet the criteria." },
    plan: [["Exercise", "8-week supervised programme, twice a week: walking or cycling at a Borg 4–6 level, plus arm and leg strength"], ["Breathing", "Pursed-lip and breathing control, forward-lean positions for recovery"], ["Pacing", "Energy conservation, planning stairs with rests"], ["Airway clearance", "Active cycle of breathing if sputum is troublesome"], ["Education", "Inhaler technique, exacerbation action plan, staying smoke-free"], ["Monitoring", "SpO2 and dyspnoea during sessions"]],
    followup: [["Week 8", "6-minute walk 340 m (+80 m), CAT 16, Borg 4"], ["Function", "Manages the stairs with two rests"], ["Plan", "Maintenance exercise class and home programme"]],
  },
  {
    id: "case-12-post-cabg", number: "12", specialty: "cardio", difficulty: "intermediate", title: "After Heart Surgery",
    stem: "60-year-old man, day 3 after coronary artery bypass surgery, first physiotherapy review on the ward.",
    profile: [["Age / sex", "60-year-old man"], ["Surgery", "CABG x3 through a sternotomy, vein taken from the left leg"], ["Risk factors", "Hypertension, type 2 diabetes, ex-smoker"]],
    complaint: "Sore chest wound, tired, and worried about coughing and moving.",
    history: [["Course", "Extubated the day of surgery, out of intensive care on day 2"], ["Rhythm", "Brief atrial fibrillation on day 2, now in sinus rhythm"], ["Medication", "Analgesia, beta-blocker, aspirin, statin"]],
    subjective: [["Pain", "4/10 at the sternum, worse on coughing"], ["Goal", "Get home and walk again"]],
    objective: [["Vital signs", "BP 118/72, HR 88 sinus, SpO2 95% on room air, RR 16"], ["Sternum", "Stable, wound clean and dry"], ["Leg wound", "Mild swelling, clean"], ["Chest", "Reduced bibasal air entry, no added sounds"], ["Mobility", "Walks 20 m with a nurse, RPE 11, heart rate rise 15 bpm, no symptoms"]],
    assessment: "Uncomplicated post-CABG on day 3, phase I cardiac rehabilitation. Mild basal atelectasis risk.",
    reasoning: [["Priorities", "Early mobilisation, chest clearance and sternal protection"], ["Sternal precautions", "Splint with a pillow when coughing, avoid pushing or pulling with the arms and heavy lifting per local protocol"], ["Monitoring", "Symptoms, heart rate, blood pressure, SpO2 and effort before and after activity"], ["Stop signs", "New chest pain, dizziness with a fall in blood pressure, new irregular rhythm or marked breathlessness"]],
    quiz: { question: "Which is a reason to stop exercise during early post-CABG rehabilitation?", options: opts("Heart rate rising by 15 bpm", "New chest pain, dizziness with a fall in systolic blood pressure, or a new irregular rhythm", "RPE of 11", "Mild wound tenderness"), correctOptionId: "B", explanation: "These are signs of inadequate cardiac output or ischaemia and exercise must stop. A modest rise in heart rate, a low-to-moderate effort rating and expected wound tenderness are normal during early mobilisation." },
    plan: [["Breathing", "Deep breathing, incentive spirometry, supported huffing and coughing"], ["Mobilisation", "Out of bed and walking twice a day, distance increasing as symptoms allow"], ["Legs", "Ankle and leg exercises, monitor the vein-harvest wound"], ["Posture and shoulders", "Gentle shoulder and postural movements within precautions"], ["Education", "Precautions, symptoms to report, risk factors"], ["Next phase", "Refer to outpatient cardiac rehabilitation"]],
    followup: [["Day 6", "Walking 200 m twice a day, discharged home"], ["Week 6", "Started phase II outpatient rehabilitation"], ["Week 12", "6-minute walk 470 m, exercising independently"]],
  },
  {
    id: "case-13-cerebral-palsy", number: "13", specialty: "paeds", difficulty: "intermediate", title: "Cerebral Palsy",
    stem: "5-year-old boy with spastic diplegic cerebral palsy, toe-walking and tripping before starting school.",
    profile: [["Age / sex", "5-year-old boy"], ["Diagnosis", "Spastic diplegic cerebral palsy, GMFCS level II"], ["Birth", "Born at 30 weeks, periventricular leukomalacia on MRI"], ["Cognition and speech", "Age-appropriate"]],
    complaint: "His parents are worried about falls, toe-walking and scissoring, and how he will cope at school.",
    history: [["Milestones", "Walked independently at 3 years"], ["Treatment", "Botulinum toxin to the calves a year ago, helpful for about 6 months"], ["Hips", "Annual hip X-ray, migration percentage 22%"], ["Equipment", "No orthoses at present"]],
    subjective: [["Parent goals", "Run with friends and keep up at school"], ["Child", "Tires quickly and trips on uneven ground"]],
    objective: [["Gait", "Bilateral equinus with toe-walking, internal rotation and scissoring"], ["Tone", "Modified Ashworth 2 in gastrocnemius and adductors, 1+ in hamstrings"], ["ROM", "Ankle dorsiflexion −10° with the knee straight, +5° with the knee bent; popliteal angle 50°; hip abduction 30° each side"], ["Motor control", "Reduced selective control, weak hip abductors and dorsiflexors"], ["Balance", "Single-leg stance 3 seconds"], ["Measures", "10-metre walk 0.9 m/s, GMFM-66 recorded"]],
    assessment: "Spastic diplegic cerebral palsy, GMFCS II, with dynamic equinus mainly from gastrocnemius tightness, adductor spasticity, and weakness; needs ongoing hip surveillance.",
    reasoning: [["Spasticity or contracture?", "Compare ankle dorsiflexion with the knee straight and bent (Silfverskiöld test)"], ["Hips", "Migration percentage of 22% needs continued monitoring"], ["Goal setting", "Family-centred, activity- and participation-focused goals"], ["Approach", "Strength and task practice matter more than stretching alone"]],
    quiz: { question: "Ankle dorsiflexion is better with the knee bent than with the knee straight. What does this indicate?", options: opts("Gastrocnemius tightness", "Soleus contracture", "Tibialis anterior spasm", "A fixed joint deformity"), correctOptionId: "A", explanation: "Bending the knee slackens the gastrocnemius, which crosses the knee. If dorsiflexion improves, the gastrocnemius is the tight structure. If it stays limited in both positions, the soleus or joint is the limiter." },
    plan: [["Goals", "Goal Attainment Scaling with the family"], ["Strength and function", "Progressive strengthening of hip abductors, dorsiflexors and extensors, treadmill walking, stairs, balance"], ["Muscle length", "Calf and adductor stretching, standing programme"], ["Orthoses", "Consider hinged ankle-foot orthoses; discuss serial casting or repeat botulinum toxin with the team"], ["Hip surveillance", "Continue scheduled X-rays"], ["School", "Plan for mobility, fatigue and adapted PE; swimming and group activities"]],
    followup: [["Month 6", "GMFM-66 improved by 3 points, 10-metre walk 1.1 m/s"], ["Function", "Fewer falls, managing school corridors"], ["Goals", "Two of three family goals achieved"]],
  },
  {
    id: "case-14-dmd", number: "14", specialty: "paeds", difficulty: "intermediate", title: "Muscular Dystrophy",
    stem: "6-year-old boy with confirmed Duchenne muscular dystrophy, frequent falls and difficulty on stairs.",
    profile: [["Age / sex", "6-year-old boy"], ["Diagnosis", "Duchenne muscular dystrophy confirmed genetically 6 months ago"], ["Medication", "Daily corticosteroid"], ["School", "Mainstream school"]],
    complaint: "Parents report frequent falls, difficulty climbing stairs and getting up from the floor.",
    history: [["Milestones", "Walked at 18 months, always slower than peers"], ["Investigations", "CK about 20 times normal"], ["Cardiac", "Normal echocardiogram"], ["Respiratory", "No breathing symptoms"]],
    subjective: [["Function", "Tires quickly, cannot run like classmates"], ["Parent goals", "Keep him walking as long as possible"]],
    objective: [["Observation", "Calf pseudohypertrophy, lumbar lordosis, waddling gait"], ["Gowers' sign", "Positive, climbs up his legs to rise"], ["Power", "Neck flexors 3/5, hip extensors 3/5, proximal shoulder 4-/5"], ["ROM", "Ankle dorsiflexion limited to −5°, tight hip flexors and iliotibial bands"], ["Function", "10-metre walk 5.5 s, North Star Ambulatory Assessment 26/34"], ["Respiratory", "FVC 95%"]],
    assessment: "Duchenne muscular dystrophy in the early ambulatory stage. Priorities: preserve function and joint range, monitor respiratory and cardiac status.",
    reasoning: [["Exercise", "Regular submaximal activity is helpful; high-load or eccentric work can damage muscle"], ["Contracture risk", "Calves, hip flexors and iliotibial bands tighten early"], ["Steroids", "Increase fracture and growth risks, so bone health and safe play matter"], ["Team", "Neuromuscular team follows heart, lung and orthopaedic needs"]],
    quiz: { question: "Which exercise principle applies in Duchenne muscular dystrophy?", options: opts("High-load eccentric strengthening", "Regular submaximal, functional activity, avoiding overwork and eccentric fatigue", "Complete rest", "Passive movements only"), correctOptionId: "B", explanation: "Muscle in DMD is fragile and easily damaged by high-load eccentric work, but inactivity leads to more weakness. Submaximal, enjoyable activity such as swimming and cycling is encouraged with attention to fatigue." },
    plan: [["Stretching", "Daily stretches for calves, hip flexors and iliotibial bands; night splints if calf range falls"], ["Activity", "Swimming, cycling, play; avoid exercise to exhaustion"], ["Function", "Practise stairs and floor transfers safely, energy planning at school"], ["Bone and falls", "Safe play, vitamin D and bone health through the team"], ["Monitoring", "Regular review of range, function scores, breathing and heart with the specialist team"], ["Family", "Education and support, equipment planning for later stages"]],
    followup: [["Month 6", "Calf range stable, NSAA 26/34"], ["Function", "Still climbing stairs with a rail"], ["Plan", "3-monthly reviews, wheelchair planning when needed"]],
  },
  {
    id: "case-15-falls", number: "15", specialty: "geri", difficulty: "intermediate", title: "Falls in an Older Adult",
    stem: "78-year-old woman with three falls in six months, the latest on the way to the bathroom at night.",
    profile: [["Age / sex", "78-year-old woman"], ["Home", "Lives alone in a two-storey house"], ["Medical history", "Hypertension, osteoporosis, cataracts"], ["Medication", "Four blood pressure medicines including a diuretic, and a sleeping tablet"]],
    complaint: "Three falls in six months. The last was 2 weeks ago at night, causing a wrist bruise. She now fears falling.",
    history: [["Falls", "No loss of consciousness, felt dizzy when standing on two occasions"], ["Night", "Gets up three times to pass urine, wears loose slippers"], ["Other", "No chest pain, palpitations or confusion"]],
    subjective: [["Fear of falling", "Avoids stairs and going out alone"], ["Goals", "Stay independent at home and feel safe"]],
    objective: [["Mobility", "TUG 17 s, 30-second chair stand 5, Berg 40/56, single-leg stance under 2 s"], ["Gait", "Slow, short steps"], ["Blood pressure", "Lying 150/80, standing at 1 minute 118/70, dizzy"], ["Strength", "Quadriceps 4-/5, ankle dorsiflexors 4/5"], ["Sensation", "Reduced vibration sense in the feet"], ["Vision", "6/18"], ["Confidence", "FES-I 28"], ["Bone health", "T-score −2.7"], ["Home", "Loose rug, poor night lighting, no bathroom rails"]],
    assessment: "Multifactorial high falls risk: orthostatic hypotension (medication-related), lower-limb weakness and poor balance, sedative medication, peripheral neuropathy, reduced vision, nocturia, and home hazards. High fracture risk with osteoporosis.",
    reasoning: [["Orthostatic hypotension", "A systolic drop of 20 mmHg or more with symptoms is significant and needs medical review"], ["Multifactorial", "Every modifiable factor is addressed together"], ["Exercise", "Progressive strength and balance training reduces falls"], ["Fear", "Fear of falling leads to inactivity and more weakness"]],
    quiz: { question: "Which intervention has the strongest evidence for reducing falls in community-dwelling older people?", options: opts("A progressive strength and balance exercise programme such as Otago", "Bed rest", "Hip protectors alone", "A walking frame for everyone"), correctOptionId: "A", explanation: "Regular progressive strength and balance training reduces both the rate of falls and the risk of falling. Bed rest weakens, hip protectors reduce injury but not falls, and a frame given to everyone can reduce activity and does not treat the causes." },
    plan: [["Refer", "GP review of blood pressure medication, sleeping tablet, nocturia, vision and bone health"], ["Exercise", "Otago-style strength and balance three times a week plus walking"], ["Positional change", "Sit, ankle pumps, then stand slowly"], ["Home", "Occupational therapy visit: remove the rug, night lights, bathroom rails, sturdy slippers"], ["Confidence", "Graded return to stairs and outings, floor-recovery practice"], ["Safety", "Alert pendant"]],
    followup: [["Week 12", "TUG 11.5 s, chair stand 9, Berg 49, FES-I 21"], ["Medication", "Regimen changed, standing blood pressure drop now 12 mmHg"], ["Falls", "None since starting"]],
  },
  {
    id: "case-16-neck-dizziness", number: "16", specialty: "msk", difficulty: "advanced", title: "Neck Pain With Dizziness",
    stem: "48-year-old woman with sudden neck pain, headache and dizziness after gardening.",
    profile: [["Age / sex", "48-year-old woman"], ["Medical history", "Hypertension, migraine with aura, on the oral contraceptive pill"], ["Occupation", "Primary school teacher"]],
    complaint: "Sudden severe pain at the back and right side of the neck and a headache different from her usual migraine, with dizziness, since yesterday after reaching overhead in the garden.",
    history: [["Onset", "Sudden, after sustained neck extension and rotation"], ["Headache", "Severe, new, \"unlike any before\""], ["Dizziness", "Constant, not just with movement, with nausea"], ["Vision and speech", "One episode of double vision this morning, slight slurring noted by her husband"], ["Trauma", "No injury other than the movement"]],
    subjective: [["Pain", "Neck 8/10, headache 8/10"], ["Associated", "Drooping of the right eyelid noticed in the mirror"], ["Wish", "Wants manual therapy to release the neck"]],
    objective: [["Blood pressure", "168/98"], ["Face and eyes", "Mild right ptosis and a smaller right pupil"], ["Coordination", "Mild unsteadiness walking heel to toe"], ["Cranial nerves", "Mild right facial numbness"], ["Neck", "Movement limited by pain"], ["Note", "Neck movement testing or manipulation could worsen a vascular lesion"]],
    assessment: "Suspected cervical artery dissection with early neurological signs (Horner's-type signs, facial numbness, unsteadiness). This needs emergency medical assessment. Neck movement testing and treatment are contraindicated.",
    reasoning: [["Why this is not mechanical", "New, severe, unusual headache with neck pain plus neurological and autonomic signs"], ["Risk factors", "Hypertension, migraine, hormonal contraception, sustained neck rotation and extension"], ["Stop", "Do not continue neck testing or provide manual therapy"], ["Time", "Stroke risk is highest in the first hours to days"]],
    quiz: { question: "What is the appropriate action?", options: opts("Perform cervical manipulation to relieve the pain", "Stop the examination, keep her seated and safe, and arrange emergency transfer with a clear handover", "Book her for a treatment session tomorrow", "Advise a hot pack and painkillers at home"), correctOptionId: "B", explanation: "The presentation strongly suggests an arterial dissection. Manipulation or provocative neck testing can propagate the tear and cause a stroke. She needs emergency assessment, so stop, keep her safe, call for transfer and hand over the findings." },
    plan: [["Stop", "No further neck movement testing and no treatment"], ["Emergency", "Call an ambulance; do not let her drive or travel alone"], ["Monitor", "Observe alertness, speech, face and limb strength while waiting"], ["Handover", "Record onset, symptoms, risk factors and blood pressure and pass them to the ambulance crew"], ["Document", "Findings, times and actions"]],
    followup: [["Hospital", "CT angiography confirmed a right internal carotid artery dissection"], ["Treatment", "Anticoagulation started, no infarct on MRI"], ["Rehabilitation", "Gradual return to activity guided by the medical team; no neck manipulation in future"]],
  },
];

// Shuffles each quiz's options deterministically (by case id) so the correct
// answer is not always in the same slot, then re-letters them A-D.
function shuffleQuiz(c) {
  const step = c.steps.find((x) => x.quiz);
  if (!step) return c;
  const q = step.quiz;
  const h = (t) => { let x = 0; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) | 0; return Math.abs(x); };
  const correctText = q.options.find((o) => o.id === q.correctOptionId).text;
  const ordered = q.options.map((o) => ({ text: o.text, k: h(c.id + "|" + o.text) })).sort((a, b) => a.k - b.k).map((o, i) => ({ id: "ABCD"[i], text: o.text }));
  const quiz = { ...q, options: ordered, correctOptionId: ordered.find((o) => o.text === correctText).id };
  return { ...c, steps: c.steps.map((x) => (x === step ? { ...x, quiz } : x)) };
}

export const CLINICAL_CASES = [...HANDWRITTEN_CASES, ...COMPACT_CASES.map(buildCase)].map(shuffleQuiz);

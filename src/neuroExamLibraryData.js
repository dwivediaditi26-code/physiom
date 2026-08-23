// Neuro Exam Library — rich "How to Perform" content (same InfoCard.jsx
// shape as cardiovascularData.js / neuroConditionLibraryData.js) for the
// core cranial nerve, reflex, and coordination exam items in
// NeurologicalAssessment.jsx's CranialNervesSection / ToneReflexSection /
// CoordinationSection.
//
// Content is adapted directly from CRANIAL_NERVES / REFLEXES /
// COORDINATION_TESTS in sharedClinicalData.js -- the exact same real,
// already-validated dataset the app's "old" Neuro Learn section
// (physiofeed/learn/NeuroStudy.jsx) and the real clinical exam screen
// (PhysioNeuro.jsx) already use -- not freshly authored content, so it
// stays consistent with what's already in the app. `image: null`
// throughout, same placeholder pattern as the rest of the InfoCard system.
//
// Keyed by the exact field id used in NeurologicalAssessment.jsx
// (d.cn1, d.cn2, ... d.dtr's row labels, d.fingerNose, etc.).

export const neuroExamLibraryData = {

  /* ===================== CRANIAL NERVES ===================== */

  cn1: {
    title: "CN I — Olfactory",
    icon: "👃",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Smell identification, each nostril separately, eyes closed",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, eyes closed, one nostril occluded at a time." },
        { tone: "blue", label: "🖐️ Technique", text: "Present a familiar, non-irritating smell (coffee, mint, soap) to one nostril while the other is occluded; ask the patient to identify it, then repeat on the other side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Often the first cranial nerve lost after frontal/basal skull TBI (shearing of the olfactory filaments) — rarely tested acutely but worth screening before discharge." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Smell identified bilaterally" },
      { k: "Impaired", v: "Reduced or absent (anosmia)" },
    ]},
    interpret: {
      normal: ["Smell identified correctly, both sides"],
      abnormal: ["Anosmia → consider frontal lobe mass, head trauma (cribriform plate injury), or nasal congestion as a confounder"],
      note: "Always rule out a simple nasal/sinus cause before attributing anosmia to a central lesion.",
    },
  },

  cn2: {
    title: "CN II — Optic",
    icon: "👁️",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Visual acuity, fields by confrontation, fundoscopy if trained",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated facing the examiner at arm's length, room adequately lit." },
        { tone: "blue", label: "🖐️ Technique", text: "Test visual acuity (Snellen chart, or finger-counting if unavailable), visual fields by confrontation across all 4 quadrants each eye, and fundoscopy if trained/equipped." },
        { tone: "purple", label: "🩺 Special consideration", text: "Field cuts localize the lesion — homonymous hemianopia points to the optic tract/radiation or occipital lobe (post-chiasmal), well past the retina itself." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact / Impaired", v: "Note acuity and any field-cut location + laterality" },
    ]},
    interpret: {
      normal: ["Full visual fields, normal acuity"],
      abnormal: ["Homonymous hemianopia → post-chiasmal lesion (e.g. stroke affecting optic radiation/occipital cortex)", "Bitemporal hemianopia → chiasmal lesion (e.g. pituitary mass)"],
      note: "The pattern of any visual field defect is highly localizing — describe it precisely rather than just noting 'abnormal'.",
    },
  },

  cn346: {
    title: "CN III, IV, VI — Eye Movements",
    icon: "👀",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Pupillary light reflex, full 'H'-pattern extraocular movements, ptosis, diplopia",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, head still, following your finger or a pen torch." },
        { tone: "blue", label: "🖐️ Technique", text: "Test pupillary light reflex (direct + consensual), extraocular movements through the full 6 cardinal directions ('H' pattern), observe for ptosis, and ask about diplopia at the extremes of gaze." },
        { tone: "purple", label: "🩺 Special consideration", text: "CN III palsy with a dilated, unreactive pupil is a neurosurgical emergency — uncal herniation compressing CN III against the tentorium until proven otherwise." },
        { tone: "amber", label: "⚠️ Tip", text: "CN VI (abducens) controls lateral gaze; CN IV (trochlear) controls downward/inward gaze — patients with a CN IV palsy often report vertical diplopia worse looking down (reading, stairs)." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact / Impaired", v: "Note which direction limited, which eye" },
      { k: "Ptosis", v: "Present / Absent" },
      { k: "Diplopia", v: "Present / Absent" },
    ]},
    interpret: {
      normal: ["Full smooth eye movements in all directions, equal reactive pupils, no ptosis or diplopia"],
      abnormal: ["Isolated nerve palsy pattern → correlate with pupil involvement, ptosis, and diplopia direction to localize"],
      redFlags: ["New CN III palsy with a dilated, unreactive pupil — treat as a neurosurgical emergency until an aneurysm/compressive lesion is excluded"],
      note: "A pupil-involving third-nerve palsy is a red flag for compression; a pupil-sparing one is more often microvascular — both need urgent medical assessment.",
    },
  },

  cn5: {
    title: "CN V — Trigeminal",
    icon: "😐",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Facial sensation (3 divisions), jaw clench, corneal reflex",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, eyes closed for sensory testing." },
        { tone: "blue", label: "🖐️ Technique", text: "Test light touch to forehead, cheek, and jaw (the 3 divisions); test jaw clench strength against resistance; test the corneal reflex with a cotton wisp, watching for a bilateral blink." },
        { tone: "purple", label: "🩺 Special consideration", text: "An absent corneal reflex with an otherwise normal exam can indicate a cerebellopontine angle lesion or brainstem involvement." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact / Impaired", v: "Note which division(s) and side" },
    ]},
    interpret: {
      normal: ["Symmetrical facial sensation all 3 divisions, strong symmetrical jaw clench, intact corneal reflex"],
      abnormal: ["Sensory loss in one division → may localize to a specific branch lesion", "Jaw deviation on opening → ipsilateral motor weakness"],
      note: "Trigeminal neuralgia presents with severe paroxysmal pain but usually a normal examination — a history clue, not an exam finding.",
    },
  },

  cn7: {
    title: "CN VII — Facial",
    icon: "😊",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Symmetry at rest, raise eyebrows, screw eyes shut, smile, puff cheeks",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated facing the examiner, good lighting to see facial symmetry clearly." },
        { tone: "blue", label: "🖐️ Technique", text: "Compare the face at rest for symmetry, then ask the patient to raise their eyebrows, screw their eyes shut tightly, smile, and puff out their cheeks." },
        { tone: "purple", label: "🩺 Special consideration", text: "The UMN-vs-LMN distinction is the single most useful bedside finding here: forehead-sparing weakness (lower face only) points to a central/cortical lesion (stroke, TBI); full hemiface weakness including the forehead points to a peripheral facial nerve lesion (Bell's palsy), since the forehead gets bilateral cortical innervation." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Symmetrical at rest and with movement" },
      { k: "UMN pattern", v: "Forehead spared, lower face weak" },
      { k: "LMN pattern", v: "Entire hemiface weak, including forehead" },
    ]},
    interpret: {
      normal: ["Symmetrical facial movement, forehead wrinkles bilaterally"],
      abnormal: ["Forehead spared, lower face weak → central lesion (e.g. stroke)", "Whole side weak including forehead → peripheral lesion (e.g. Bell's palsy)"],
      redFlags: ["New facial weakness with other focal neuro signs (arm/leg weakness, speech change) — treat as possible acute stroke, urgent referral"],
      note: "This forehead-sparing distinction is one of the most clinically useful localizing signs in the entire neuro exam.",
    },
  },

  cn8: {
    title: "CN VIII — Vestibulocochlear",
    icon: "👂",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Gross hearing, Weber test, Rinne test",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, quiet room for hearing screen." },
        { tone: "blue", label: "🖐️ Technique", text: "Screen gross hearing (finger rub or whisper each ear). Weber test: tuning fork on the midline forehead — lateralizes TO the affected ear in conductive loss, AWAY from it in sensorineural loss. Rinne test: compares air vs. bone conduction at the mastoid." },
        { tone: "purple", label: "🩺 Special consideration", text: "New sensorineural loss after head trauma suggests a temporal bone fracture or labyrinthine concussion." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Hears whispered voice each side" },
      { k: "Conductive loss", v: "Weber lateralizes to affected ear" },
      { k: "Sensorineural loss", v: "Weber lateralizes away from affected ear" },
    ]},
    interpret: {
      normal: ["Hearing intact both sides, midline Weber"],
      abnormal: ["Conductive vs. sensorineural pattern → guides likely cause and appropriate referral (ENT vs. audiology)"],
      note: "Vestibular (balance) function from this nerve is screened separately — see the Romberg / vestibular tests.",
    },
  },

  cn910: {
    title: "CN IX, X — Glossopharyngeal / Vagus",
    icon: "🗣️",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Palatal rise, gag reflex, voice quality, swallow screen",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, mouth open, adequate lighting to view the palate/uvula." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe palatal rise on 'ahh' (should be symmetric, uvula stays midline); cautiously test the gag reflex if indicated; assess voice quality (hoarse/nasal); perform a formal swallow screen if there is any concern." },
        { tone: "purple", label: "🩺 Special consideration", text: "The uvula deviates AWAY from the side of the lesion — a common point of confusion." },
        { tone: "amber", label: "⚠️ Tip", text: "Any swallow concern here should trigger a formal speech-language pathology swallow assessment before oral intake — aspiration risk." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Symmetrical palate elevation, clear voice, intact gag" },
      { k: "Impaired", v: "Note uvula deviation direction and any swallow concern" },
    ]},
    interpret: {
      normal: ["Symmetrical palate elevation, normal voice quality"],
      abnormal: ["Asymmetric elevation with deviation → suggests a IX/X lesion on the non-elevating side"],
      redFlags: ["New dysphagia or absent gag with aspiration risk — hold oral intake, refer for formal swallow assessment before feeding"],
      note: "Coordinate closely with speech-language therapy whenever a swallowing concern arises from this exam.",
    },
  },

  cn11: {
    title: "CN XI — Accessory",
    icon: "💪",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Shoulder shrug and head turn against resistance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, examiner positioned to apply resistance safely." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to shrug both shoulders against downward resistance (trapezius), and to turn their head to each side against resistance from your hand on their jaw/cheek (sternocleidomastoid)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Sternocleidomastoid turns the head to the OPPOSITE side when it contracts — weakness turning the head left reflects a problem with the RIGHT sternocleidomastoid." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Symmetrical strength both muscles" },
      { k: "Weak", v: "Note which muscle and side" },
    ]},
    interpret: {
      normal: ["Symmetrical shoulder shrug and head turn strength"],
      abnormal: ["Isolated CN XI weakness → consider a peripheral nerve lesion, worth asking about relevant neck surgery/lymph node biopsy history"],
      note: "Isolated CN XI palsy is uncommon in TBI but worth screening if there was any neck/skull base trauma.",
    },
  },

  cn12: {
    title: "CN XII — Hypoglossal",
    icon: "👅",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      image: null,
      caption: "Tongue protrusion, look for deviation, atrophy, or fasciculations",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, mouth open, good lighting to view the tongue clearly." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to protrude their tongue straight out and observe for deviation; check for fasciculations and bulk with the tongue relaxed in the floor of the mouth (not while protruded, which can mask fine fasciculations)." },
        { tone: "purple", label: "🩺 Special consideration", text: "The tongue deviates TOWARD the side of a lower motor neuron lesion — the opposite convention from facial droop, which trips people up." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Protrudes straight, no deviation, no fasciculations" },
      { k: "Deviates on protrusion", v: "Toward the weak side" },
    ]},
    interpret: {
      normal: ["Tongue protrudes straight, full movement, no fasciculations"],
      abnormal: ["Deviation toward one side → ipsilateral hypoglossal nerve lesion"],
      redFlags: ["Fasciculations combined with wasting and progressive weakness — consider motor neuron disease, refer to neurology promptly"],
      note: "Correlate any fasciculation finding here with muscle bulk and reflex findings elsewhere in the exam.",
    },
  },

  /* ===================== COORDINATION ===================== */

  fingerNose: {
    title: "Finger-to-Nose Test",
    icon: "👆",
    category: "Learn · Neuro · Coordination",
    perform: {
      image: null,
      caption: "Alternately touch examiner's moving finger and own nose",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, adequate arm room, examiner's finger held at a comfortable arm's-length distance." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to alternate touching their own nose and your finger, at a comfortable pace, both arms — vary your finger's position between repetitions." },
        { tone: "purple", label: "🩺 Special consideration", text: "Tests cerebellar coordination of the upper limb. Dysmetria (past-pointing/overshoot) suggests ipsilateral cerebellar pathology." },
        { tone: "amber", label: "⚠️ Tip", text: "Watch specifically for the finger overshooting/undershooting the target (dysmetria) and for tremor that worsens as it approaches the target (intention tremor)." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Smooth and accurate" },
      { k: "Mild dysmetria", v: "Slight overshoot/undershoot" },
      { k: "Marked dysmetria", v: "Significant past-pointing" },
      { k: "Unable to perform", v: "Cannot complete the task" },
    ]},
    interpret: {
      normal: ["Smooth, accurate movement bilaterally"],
      abnormal: ["Dysmetria/intention tremor → suggests ipsilateral cerebellar involvement (cerebellar signs are typically ipsilateral to the lesion)"],
      note: "Always test bilaterally and note asymmetry — a unilateral finding is more localizing than a bilateral one.",
    },
  },

  heelShin: {
    title: "Heel-to-Shin Test",
    icon: "🦵",
    category: "Learn · Neuro · Coordination",
    perform: {
      image: null,
      caption: "Slide heel smoothly down the opposite shin, knee to ankle",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine, legs extended and relaxed." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to slide the heel of one foot smoothly down the shin of the opposite leg, from knee to ankle and back, repeated a few times." },
        { tone: "purple", label: "🩺 Special consideration", text: "Lower-limb equivalent of finger-to-nose. Also affected by proprioceptive loss, not just cerebellar disease — check the sensory exam alongside this finding." },
        { tone: "amber", label: "⚠️ Tip", text: "Watch for the heel wavering off the shin line or an irregular, jerky descent rather than one smooth movement." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Smooth trajectory" },
      { k: "Mild ataxia", v: "Some wobble off the shin" },
      { k: "Marked ataxia", v: "Heel repeatedly slides off" },
      { k: "Unable to perform", v: "Cannot complete the task" },
    ]},
    interpret: {
      normal: ["Smooth, well-controlled movement bilaterally"],
      abnormal: ["Ataxic pattern → suggests ipsilateral cerebellar or proprioceptive involvement — check Romberg and proprioception to help distinguish the two"],
      note: "Combine with finger-to-nose findings — a consistent pattern across upper and lower limbs supports a single unifying cause.",
    },
  },

  ram: {
    title: "Rapid Alternating Movements",
    icon: "🔄",
    category: "Learn · Neuro · Coordination",
    perform: {
      image: null,
      caption: "Rapid pronation/supination, or thumb-to-finger tapping in sequence",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, forearm resting on the thigh or held out." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to rapidly pronate and supinate the forearm against the opposite palm, or tap thumb to each finger in sequence, as fast as possible." },
        { tone: "purple", label: "🩺 Special consideration", text: "Dysdiadochokinesia (inability to perform rapid alternating movements smoothly — slow, irregular, or clumsy) is a classic cerebellar sign, usually ipsilateral to the lesion." },
        { tone: "amber", label: "⚠️ Tip", text: "Distinguish from parkinsonian bradykinesia, which shows progressive DECREMENT in amplitude rather than irregular rhythm." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Regular rhythm and speed" },
      { k: "Mild dysdiadochokinesia", v: "Some irregularity" },
      { k: "Marked dysdiadochokinesia", v: "Slow, irregular, or unable to alternate" },
      { k: "Unable to perform", v: "Cannot complete the task" },
    ]},
    interpret: {
      normal: ["Fast, smooth, rhythmic alternating movement bilaterally"],
      abnormal: ["Dysdiadochokinesia → suggests ipsilateral cerebellar dysfunction"],
      note: "Compare speed, rhythm, and amplitude directly between sides for the clearest picture.",
    },
  },

  /* ===================== REFLEXES ===================== */

  reflexBiceps: {
    title: "Biceps Reflex (C5–C6)",
    icon: "💪",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Thumb on biceps tendon, tap thumb with reflex hammer",
      boxes: [
        { tone: "", label: "👤 Position", text: "Elbow flexed to ~90°, arm relaxed and supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Place your thumb firmly on the biceps tendon in the antecubital fossa. Tap your thumb with the reflex hammer and observe/feel for elbow flexion." },
        { tone: "purple", label: "🩺 Special consideration", text: "Diminished or absent = C5/C6 LMN involvement (radiculopathy, peripheral nerve). Brisk/hyperactive = UMN (myelopathy, cord compression above C5). Asymmetry is always significant." },
      ],
    },
    scaleLabel: "0–4+ grading",
    scale: { type: "table", rows: [
      { k: "0", v: "Absent" },
      { k: "1+", v: "Diminished" },
      { k: "2+", v: "Normal" },
      { k: "3+", v: "Brisk" },
      { k: "4+", v: "Hyperactive / clonus" },
    ]},
    interpret: {
      normal: ["2+ bilaterally"],
      abnormal: ["Diminished/absent → C5/6 LMN lesion", "Brisk/hyperreflexic → UMN lesion above C5"],
      note: "Always compare side to side — asymmetry is more diagnostic than any single grade.",
    },
  },

  reflexBrachioradialis: {
    title: "Brachioradialis Reflex (C5–C6)",
    icon: "💪",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Tap the tendon 2–3cm proximal to the radial styloid",
      boxes: [
        { tone: "", label: "👤 Position", text: "Forearm in neutral (semi-pronated), resting on the thigh." },
        { tone: "blue", label: "🖐️ Technique", text: "Tap the brachioradialis tendon 2–3cm proximal to the radial styloid. Normal response is forearm flexion plus slight supination." },
        { tone: "purple", label: "🩺 Special consideration", text: "An INVERTED reflex — brachioradialis absent but finger flexors contract instead — is pathognomonic of cervical myelopathy at C5/6 and needs urgent attention." },
      ],
    },
    scaleLabel: "0–4+ grading",
    scale: { type: "table", rows: [
      { k: "0", v: "Absent" },
      { k: "1+", v: "Diminished" },
      { k: "2+", v: "Normal" },
      { k: "3+", v: "Brisk" },
      { k: "4+", v: "Hyperactive / clonus" },
    ]},
    interpret: {
      normal: ["2+ bilaterally, no inverted response"],
      abnormal: ["Absent → C5/6 radiculopathy"],
      redFlags: ["Inverted brachioradialis reflex (absent BR + finger flexor contraction) — pathognomonic of C5/6 cervical myelopathy, urgent MRI referral"],
      note: "The inverted reflex pattern here is one of the highest-yield individual findings in the whole cervical exam — don't miss it.",
    },
  },

  reflexTriceps: {
    title: "Triceps Reflex (C7–C8)",
    icon: "💪",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Tap directly above the olecranon",
      boxes: [
        { tone: "", label: "👤 Position", text: "Support the arm at 90° abduction, or drape it over the forearm." },
        { tone: "blue", label: "🖐️ Technique", text: "Tap the triceps tendon directly above the olecranon and observe elbow extension." },
        { tone: "purple", label: "🩺 Special consideration", text: "Diminished/absent bilaterally suggests peripheral polyneuropathy or motor neuron disease rather than a single-level radiculopathy." },
      ],
    },
    scaleLabel: "0–4+ grading",
    scale: { type: "table", rows: [
      { k: "0", v: "Absent" },
      { k: "1+", v: "Diminished" },
      { k: "2+", v: "Normal" },
      { k: "3+", v: "Brisk" },
      { k: "4+", v: "Hyperactive / clonus" },
    ]},
    interpret: {
      normal: ["2+ bilaterally"],
      abnormal: ["Diminished/absent → C7 radiculopathy (most common single cause)", "Brisk → UMN lesion above C7"],
      note: "Bilateral absence points away from a single-level radiculopathy and toward a more generalized peripheral process.",
    },
  },

  reflexPatellar: {
    title: "Patellar (Quadriceps) Reflex (L3–L4)",
    icon: "🦵",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Tap the patellar tendon, seated or supine with knee supported",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated with legs hanging freely, or supine with the knee supported at 20–30° flexion." },
        { tone: "blue", label: "🖐️ Technique", text: "Tap the patellar tendon briskly and observe quadriceps contraction / knee extension." },
        { tone: "purple", label: "🩺 Special consideration", text: "Diminished is most commonly from L3/4 disc herniation. Brisk plus a positive Babinski points toward cord/UMN pathology rather than a root-level problem." },
      ],
    },
    scaleLabel: "0–4+ grading",
    scale: { type: "table", rows: [
      { k: "0", v: "Absent" },
      { k: "1+", v: "Diminished" },
      { k: "2+", v: "Normal" },
      { k: "3+", v: "Brisk" },
      { k: "4+", v: "Hyperactive / clonus" },
    ]},
    interpret: {
      normal: ["2+ bilaterally"],
      abnormal: ["Diminished → L3/4 disc herniation (most common cause)", "Absent → severe radiculopathy or femoral neuropathy", "Brisk + Babinski → cord/UMN pathology"],
      note: "Pair with the Babinski finding — the combination distinguishes a root-level from a cord-level explanation.",
    },
  },

  reflexAchilles: {
    title: "Achilles (Ankle) Reflex (S1)",
    icon: "🦶",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Dorsiflex the foot to tension the tendon, then tap",
      boxes: [
        { tone: "", label: "👤 Position", text: "Knee flexed, hip externally rotated (patient kneeling or prone works well)." },
        { tone: "blue", label: "🖐️ Technique", text: "Gently dorsiflex the foot to put light tension on the tendon, then tap the Achilles tendon and observe the plantarflexion jerk." },
        { tone: "purple", label: "🩺 Special consideration", text: "The most sensitive bedside indicator of the S1 root. Absent bilaterally is more suggestive of a peripheral polyneuropathy (e.g. diabetes, alcohol) than a single-level radiculopathy." },
      ],
    },
    scaleLabel: "0–4+ grading",
    scale: { type: "table", rows: [
      { k: "0", v: "Absent" },
      { k: "1+", v: "Diminished" },
      { k: "2+", v: "Normal" },
      { k: "3+", v: "Brisk" },
      { k: "4+", v: "Hyperactive / clonus" },
    ]},
    interpret: {
      normal: ["2+ bilaterally"],
      abnormal: ["Diminished/absent unilaterally → S1 radiculopathy (L5/S1 disc)", "Absent bilaterally → consider peripheral polyneuropathy"],
      note: "Screen for a peripheral cause (diabetes, alcohol use, vitamin deficiency) whenever this is absent bilaterally rather than assuming a spinal cause.",
    },
  },

  babinski: {
    title: "Babinski Sign (Plantar Response)",
    icon: "🦶",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Stroke firmly along the lateral sole, heel to ball, curving medially",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine and relaxed." },
        { tone: "blue", label: "🖐️ Technique", text: "Using a blunt object (reflex hammer handle or key), stroke firmly from the lateral heel along the plantar surface, curving medially to the ball of the foot. Observe the great toe and other toes." },
        { tone: "purple", label: "🩺 Special consideration", text: "Positive (abnormal in adults) = the great toe extends upward, often with fanning of the other toes — indicates a corticospinal tract (UMN) lesion anywhere from the motor cortex down to the S1 cord level. Normal adult response is toe plantarflexion (downgoing)." },
        { tone: "amber", label: "⚠️ Tip", text: "Normal in infants under ~12 months (the corticospinal tract is still unmyelinated) — don't apply the adult interpretation to a young infant." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Flexor (normal/downgoing)", v: "Toes curl down — normal in adults" },
      { k: "Extensor (positive/upgoing)", v: "Great toe extends ± fanning — abnormal in adults, UMN sign" },
      { k: "Equivocal", v: "Ambiguous response" },
      { k: "Absent / mute", v: "No response at all" },
    ]},
    interpret: {
      normal: ["Flexor (downgoing) response in an adult"],
      abnormal: ["Extensor (upgoing) response → corticospinal tract (UMN) lesion — stroke, cord compression, myelopathy, MS, TBI, ALS"],
      note: "Confirm with an alternative technique (Chaddock's or Oppenheim's) if the standard stroke is equivocal or the patient can't tolerate plantar stimulation.",
    },
  },

  hoffmann: {
    title: "Hoffmann's Sign",
    icon: "✋",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Flick the middle finger's distal phalanx downward, watch the thumb",
      boxes: [
        { tone: "", label: "👤 Position", text: "Hold the patient's middle finger loosely, forearm slightly pronated." },
        { tone: "blue", label: "🖐️ Technique", text: "Flick the distal phalanx of the middle finger DOWNWARD (a sudden release). Observe the thumb and index finger." },
        { tone: "purple", label: "🩺 Special consideration", text: "Positive = the thumb FLEXES and adducts involuntarily — an upper motor neuron sign indicating a corticospinal tract lesion at or above C8/T1, suggesting cervical myelopathy or cord compression." },
        { tone: "amber", label: "⚠️ Tip", text: "Can be a normal variant in an otherwise hyperreflexic individual — always interpret alongside the rest of the clinical picture. Bilateral positive findings are more significant than a unilateral one." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Negative", v: "No thumb flexion" },
      { k: "Positive", v: "Involuntary thumb flexion/adduction" },
    ]},
    interpret: {
      normal: ["Negative"],
      abnormal: ["Positive, especially bilateral → suspect cervical myelopathy, refer for cervical spine MRI"],
      note: "Trömner's sign (flicking the palmar surface upward instead) has equivalent significance and can be used to confirm an equivocal Hoffmann's.",
    },
  },

  clonus: {
    title: "Clonus (Ankle / Patellar / Wrist)",
    icon: "🦵",
    category: "Learn · Neuro · Reflexes",
    perform: {
      image: null,
      caption: "Sudden sustained stretch, count rhythmic beats",
      boxes: [
        { tone: "", label: "👤 Position", text: "Ankle: knee in slight flexion, foot supported. Patellar: supine, leg extended. Wrist: forearm supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Ankle: cup the foot and apply sudden, sustained DORSIFLEXION pressure, maintaining the force. Patellar: grasp the patella and apply a sudden sustained DOWNWARD thrust. Wrist: apply a sudden sustained EXTENSION force. In each case, count the rhythmic beats of oscillation and note how long they persist." },
        { tone: "purple", label: "🩺 Special consideration", text: "Positive = 3 or more sustained beats. Reflects loss of descending inhibition on the gamma motor neurons — an upper motor neuron sign. 1–2 beats can be a normal variant in an anxious or fatigued patient; sustained (>10 beats) clonus signals severe UMN involvement." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Absent", v: "No rhythmic contraction" },
      { k: "Unsustained (1–2 beats)", v: "May be a normal variant" },
      { k: "Sustained (≥3 beats)", v: "Abnormal — UMN sign" },
    ]},
    interpret: {
      normal: ["Absent, or a few unsustained beats"],
      abnormal: ["Sustained clonus (≥3 beats) → UMN lesion — cord compression, myelopathy, stroke, MS, cerebral palsy"],
      redFlags: ["Sustained clonus (>10 beats) → severe UMN involvement, urgent MRI + neurosurgical referral"],
      note: "Interpret alongside DTRs and tone — clonus rarely appears as an isolated finding in significant UMN pathology.",
    },
  },
};

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

// Real Cloudinary photos, same asset ids used by physiofeed/learn/
// NeuroStudy.jsx's reflexCard()/dermatomeCard()/myotomeCard() -- confirmed
// present on Cloudinary for every reflex id, and for a subset of dermatome/
// myotome ids (the rest fall back to InfoCard.jsx's own placeholder when
// image is left undefined, same as everywhere else in this system).
const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/";
const img = (id) => `${CLOUDINARY_BASE}${id}`;

export const neuroExamLibraryData = {

  /* ===================== CRANIAL NERVES ===================== */

  cn1: {
    title: "CN I — Olfactory",
    icon: "👃",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      images: [img("n_cn1"), img("n_cn1_2"), img("n_cn1_3")],
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
      images: [img("n_cn2"), img("n_cn2_2"), img("n_cn2_3")],
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
      images: [img("n_cn3_4_6"), img("n_cn3_4_6_2"), img("n_cn3_4_6_3")],
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
      images: [img("n_cn5"), img("n_cn5_2"), img("n_cn5_3")],
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
      images: [img("n_cn7"), img("n_cn7_2"), img("n_cn7_3")],
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
      images: [img("n_cn8"), img("n_cn8_2"), img("n_cn8_3")],
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
      images: [img("n_cn9_10"), img("n_cn9_10_2"), img("n_cn9_10_3")],
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
      images: [img("n_cn11"), img("n_cn11_2"), img("n_cn11_3")],
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
      images: [img("n_cn12"), img("n_cn12_2"), img("n_cn12_3")],
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
      images: [img("n_finger_nose"), img("n_finger_nose_2"), img("n_finger_nose_3")],
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
      images: [img("n_heel_shin"), img("n_heel_shin_2"), img("n_heel_shin_3")],
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
      images: [img("n_ram"), img("n_ram_2"), img("n_ram_3")],
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
      images: [img("n_ref_bicep"), img("n_ref_bicep_2"), img("n_ref_bicep_3")],
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
      images: [img("n_ref_brad"), img("n_ref_brad_2"), img("n_ref_brad_3")],
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
      images: [img("n_ref_tricep"), img("n_ref_tricep_2"), img("n_ref_tricep_3")],
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
      images: [img("n_ref_patella"), img("n_ref_patella_2"), img("n_ref_patella_3")],
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
      images: [img("n_ref_achilles"), img("n_ref_achilles_2"), img("n_ref_achilles_3")],
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
      images: [img("n_ref_babinski"), img("n_ref_babinski_2"), img("n_ref_babinski_3")],
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
      images: [img("n_ref_hoffmann"), img("n_ref_hoffmann_2"), img("n_ref_hoffmann_3")],
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
      images: [img("n_ref_clonus_ankle"), img("n_ref_clonus_ankle_2"), img("n_ref_clonus_ankle_3")],
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

  /* ===================== DERMATOMES (per ASIA key sensory point) =====================
     Content and images from DERMATOMES in sharedClinicalData.js -- the same
     source physiofeed/learn/NeuroStudy.jsx's dermatomeCard() uses. Keyed by
     the exact row label used in the Spinal Cord Injury condition library's
     "Dermatome grading (ASIA sensory)" LRGrid. */

  dermC5: {
    title: "Dermatome C5",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_c5"), img("n_c5_2"), img("n_c5_3")],
      caption: "Lateral arm / deltoid badge region",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch (cotton) + pinprick at the key point over the lateral arm/deltoid badge region. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level C4/5. Associated reflex: Biceps (C5–C6). Associated myotome: Shoulder abduction / elbow flexion." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with C5 myotome (shoulder abduction/elbow flexion) and biceps reflex for a full C5 picture"],
      note: "Hyperaesthesia can be an early sign of nerve root irritation; reduced/absent suggests axonal compromise.",
    },
  },

  dermC6: {
    title: "Dermatome C6",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_c6"), img("n_c6_2"), img("n_c6_3")],
      caption: "Lateral forearm / thumb + index finger",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the lateral forearm and thumb/index finger. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level C5/6. Associated reflex: Brachioradialis. Associated myotome: Wrist extension (ECRL/ECRB)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with C6 myotome (wrist extension) and the brachioradialis reflex, including the inverted-reflex red flag"],
      note: "The most commonly affected root in cervical radiculopathy alongside C7 — always test both.",
    },
  },

  dermC7: {
    title: "Dermatome C7",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_c7"), img("n_c7_2"), img("n_c7_3")],
      caption: "Middle finger",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the middle finger. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level C6/7. Associated reflex: Triceps. Associated myotome: Elbow extension / wrist flexion." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with C7 myotome (elbow extension) and the triceps reflex"],
      note: "The single most commonly affected cervical nerve root in disc herniation.",
    },
  },

  dermC8: {
    title: "Dermatome C8",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_c8"), img("n_c8_2"), img("n_c8_3")],
      caption: "Little + ring finger / medial forearm",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the little and ring fingers and medial forearm. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level C7/T1. No standard associated reflex. Associated myotome: Finger flexion / intrinsics." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with C8 myotome (finger flexion/grip strength)"],
      note: "No standard tendon reflex tests C8 directly — rely on the sensory and motor findings together.",
    },
  },

  dermT1: {
    title: "Dermatome T1",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_t1"), img("n_t1_2"), img("n_t1_3")],
      caption: "Medial forearm / elbow",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the medial forearm/elbow. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level T1/2. Associated myotome: Finger abduction (1st dorsal interosseous)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with T1 myotome (finger abduction)"],
      note: "T1 involvement with a droopy eyelid/miosis raises suspicion for Horner's syndrome (sympathetic chain involvement) — screen for it.",
    },
  },

  "dermT4 (nipple)": {
    title: "Dermatome T4 (Nipple Line)",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_t4"), img("n_t4_2"), img("n_t4_3")],
      caption: "Nipple line — key ASIA sensory landmark",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, chest exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick at the nipple line. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "One of the standard ASIA key sensory landmarks used to define the sensory level in thoracic SCI, alongside T10 (umbilicus)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Loss at/below this level → supports a thoracic sensory level at or above T4"],
      note: "Thoracic dermatomes have no corresponding key muscle in the ISNCSCI myotome chart — sensory testing alone defines the level here.",
    },
  },

  "dermT10 (umbilicus)": {
    title: "Dermatome T10 (Umbilicus)",
    icon: "🖐️",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_t10"), img("n_t10_2"), img("n_t10_3")],
      caption: "Umbilicus — key ASIA sensory landmark",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, abdomen exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick at the umbilicus. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "One of the standard ASIA key sensory landmarks used to define the sensory level in thoracic SCI, alongside T4 (nipple line)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Loss at/below this level → supports a thoracic sensory level at or above T10"],
      note: "Beevor's sign (umbilicus moves upward on a trunk curl) can help confirm a T10 motor level when lower abdominals are weak relative to upper.",
    },
  },

  dermL3: {
    title: "Dermatome L3",
    icon: "🦵",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_l3"), img("n_l3_2"), img("n_l3_3")],
      caption: "Medial knee / lower anterior thigh",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the medial knee/lower anterior thigh. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level L3/4. Shares the patellar reflex (L3–L4) with L4. Associated myotome: Knee extension (quadriceps)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with L3 myotome (knee extension) and the patellar reflex"],
      note: "L3 and L4 share the patellar reflex — use the sensory distribution and myotome pattern to distinguish between the two levels.",
    },
  },

  dermL4: {
    title: "Dermatome L4",
    icon: "🦵",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_l4"), img("n_l4_2"), img("n_l4_3")],
      caption: "Medial leg / medial foot",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the medial leg/medial foot. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level L4/5. Shares the patellar reflex (L3–L4) with L3. Associated myotome: Ankle dorsiflexion (tibialis anterior)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with L4 myotome (ankle dorsiflexion)"],
      note: "L4 radiculopathy classically presents with medial leg pain and a weak tibialis anterior (foot drop pattern with intact eversion).",
    },
  },

  dermL5: {
    title: "Dermatome L5",
    icon: "🦵",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_l5"), img("n_l5_2"), img("n_l5_3")],
      caption: "Dorsum of foot / 1st–2nd web space",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the dorsum of the foot / 1st–2nd web space. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level L4/5. No reliable standard reflex. Associated myotome: Great toe extension (EHL)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with L5 myotome (great toe/EHL extension) — the most common single-root cause of foot drop"],
      note: "No reliable tendon reflex tests L5 directly — rely on sensory and motor findings together.",
    },
  },

  dermS1: {
    title: "Dermatome S1",
    icon: "🦶",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_s1"), img("n_s1_2"), img("n_s1_3")],
      caption: "Lateral foot / heel / sole",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, limb relaxed and exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Test with light touch + pinprick over the lateral foot/heel/sole. Compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Disc level L5/S1. Associated reflex: Achilles. Associated myotome: Ankle plantarflexion (gastrocnemius)." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact, symmetrical sensation, grade 2"],
      abnormal: ["Reduced/absent → correlate with S1 myotome (ankle plantarflexion) and the Achilles reflex"],
      note: "The most commonly affected lumbosacral root alongside L5 — always test both together.",
    },
  },

  "dermS4-5 (perianal)": {
    title: "Dermatome S4-5 (Perianal)",
    icon: "🚨",
    category: "Learn · Neuro · Dermatomes",
    perform: {
      images: [img("n_s4s5"), img("n_s4s5_2"), img("n_s4s5_3")],
      caption: "Perianal / saddle region — the single most important sensory point in SCI",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient positioned for a dignified, private perianal exam." },
        { tone: "blue", label: "🖐️ Technique", text: "Test light touch + pinprick at the perianal/saddle region. Also assess the anal wink reflex and voluntary anal contraction as part of the same sacral-sparing check." },
        { tone: "purple", label: "🩺 Special consideration", text: "Sacral sparing (any sensory or motor function preserved at S4-5) is THE deciding factor between AIS A (complete) and AIS B (sensory incomplete) — never skip this test." },
      ],
    },
    scaleLabel: "0–2 grading",
    scale: { type: "table", rows: [{ k: "0", v: "Absent" }, { k: "1", v: "Altered" }, { k: "2", v: "Normal" }] },
    interpret: {
      normal: ["Intact sensation, grade 2, present anal wink and voluntary contraction"],
      abnormal: ["Any preserved sensation here → sacral sparing present → the injury is sensory incomplete at minimum (AIS B or better), a major prognostic distinction"],
      redFlags: ["New loss of perianal sensation with saddle anaesthesia and bowel/bladder change → possible cauda equina syndrome, emergency referral"],
      note: "This single sensory point changes the entire AIS classification — always document it explicitly, never infer it from limb findings.",
    },
  },

  /* ===================== MYOTOMES (per ASIA key muscle) =====================
     Content from MYOTOMES in sharedClinicalData.js -- same source
     physiofeed/learn/NeuroStudy.jsx's myotomeCard() uses. Keyed by the
     exact row label used in the Spinal Cord Injury condition library's
     "Myotome grading (ASIA key muscles)" LRGrid. */

  "myoC5 Elbow flexors": {
    title: "Myotome C5 — Elbow Flexors",
    icon: "💪",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_c5"), img("myo_c5_2"), img("myo_c5_3")],
      caption: "Shoulder abduction / elbow flexion — arm abduction 0–90° against resistance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, arm at side to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Resist arm abduction through 0–90°, or resist elbow flexion (biceps)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for compensation via trunk lean or shoulder hike substituting for true deltoid/biceps activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness with trunk lean/shoulder hike compensation → suggests C5 involvement, correlate with the C5 dermatome and biceps reflex"],
      note: "C5 is typically the highest level with meaningful function preserved in a mid-cervical SCI — small gains here have large functional impact (self-feeding, transfers).",
    },
  },

  "myoC6 Wrist extensors": {
    title: "Myotome C6 — Wrist Extensors",
    icon: "💪",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_c6"), img("myo_c6_2"), img("myo_c6_3")],
      caption: "Wrist extension — make a fist, extend wrist against resistance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Forearm supported, wrist in neutral to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to make a fist and extend the wrist against your resistance." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for supinator/brachioradialis substitution rather than true wrist extensor (ECRL/ECRB) activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with C6 dermatome and brachioradialis reflex"],
      note: "C6 wrist extension is functionally critical — it enables tenodesis grasp, one of the most important functional targets in a C6 tetraplegia rehab plan.",
    },
  },

  "myoC7 Elbow extensors": {
    title: "Myotome C7 — Elbow Extensors",
    icon: "💪",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_c7"), img("myo_c7_2"), img("myo_c7_3")],
      caption: "Elbow extension / wrist flexion — triceps push, wrist curl against resistance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Arm supported at 90° abduction or elbow flexed to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Resist elbow extension (triceps push) and/or wrist flexion (wrist curl)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for shoulder external rotation or extra elbow flexion substituting for true triceps activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with C7 dermatome and triceps reflex"],
      note: "The most commonly affected myotome in cervical radiculopathy alongside C6.",
    },
  },

  "myoC8 Finger flexors": {
    title: "Myotome C8 — Finger Flexors",
    icon: "💪",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_c8"), img("myo_c8_2"), img("myo_c8_3")],
      caption: "Finger flexion (grip) — grip dynamometer or resist 3rd–5th DIP flexion",
      boxes: [
        { tone: "", label: "👤 Position", text: "Forearm supported, fingers relaxed to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Use a grip dynamometer, or resist DIP flexion of the 3rd–5th fingers." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for wrist flexor dominance substituting for true intrinsic/extrinsic finger flexor activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with C8 dermatome (no standard reflex tests C8 directly)"],
      note: "Grip strength here is a key functional target for hand function in lower cervical tetraplegia.",
    },
  },

  "myoT1 Finger abductors": {
    title: "Myotome T1 — Finger Abductors",
    icon: "💪",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_t1"), img("myo_t1_2"), img("myo_t1_3")],
      caption: "Finger abduction — spread fingers, resist adduction",
      boxes: [
        { tone: "", label: "👤 Position", text: "Hand relaxed, fingers together to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to spread their fingers and resist you pushing them back together (1st dorsal interosseous)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for flexor override — using finger flexion instead of true intrinsic abduction." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with T1 dermatome; screen for Horner's syndrome if T1 root/sympathetic chain involvement is suspected"],
      note: "The most caudal key muscle in the ISNCSCI upper-limb chain — intrinsic hand function.",
    },
  },

  "myoL2 Hip flexors": {
    title: "Myotome L1-L2 — Hip Flexors",
    icon: "🦵",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_l1_l2"), img("myo_l1_l2_2"), img("myo_l1_l2_3")],
      caption: "Hip flexion — seated, resist hip flexion 0–90°",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, hip and knee flexed to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Resist hip flexion through 0–90° of range." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for quadratus lumborum substitution or trunk lean backward compensating for true hip flexor (iliopsoas) weakness." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness with trunk-lean compensation → suggests L1/L2 involvement"],
      note: "L2 is graded as part of the combined L1–L2 hip flexor test in this dataset since no single reliable muscle isolates L1 alone at the bedside.",
    },
  },

  "myoL3 Knee extensors": {
    title: "Myotome L3 — Knee Extensors",
    icon: "🦵",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_l3"), img("myo_l3_2"), img("myo_l3_3")],
      caption: "Knee extension — extend knee from 90° against resistance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, knee flexed to 90° to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Resist knee extension from 90° through to full extension (quadriceps)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for hip flexor assistance substituting for true quadriceps activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with L3 dermatome and the patellar reflex"],
      note: "Quadriceps strength here is one of the most important single predictors of ambulation potential after incomplete SCI.",
    },
  },

  "myoL4 Ankle dorsiflexors": {
    title: "Myotome L4 — Ankle Dorsiflexors",
    icon: "🦶",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_l4"), img("myo_l4_2"), img("myo_l4_3")],
      caption: "Ankle dorsiflexion — walk on heels, or resist dorsiflexion",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or standing to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Resist ankle dorsiflexion (tibialis anterior), or observe heel-walking." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for EHL (great toe extensor) dominance substituting for true tibialis anterior activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with L4 dermatome; a classic foot-drop pattern"],
      note: "Foot drop from L4/L5 weakness needs an AFO assessment for safe gait — flag early rather than waiting for full recovery.",
    },
  },

  "myoL5 Great toe extensors": {
    title: "Myotome L5 — Great Toe Extensors",
    icon: "🦶",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_l5"), img("myo_l5_2"), img("myo_l5_3")],
      caption: "Great toe extension — lift big toe against resistance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or supine, foot relaxed to start." },
        { tone: "blue", label: "🖐️ Technique", text: "Resist great toe (hallux) extension (extensor hallucis longus)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for extensor digitorum brevis firing or ankle inversion substituting for true EHL activation." },
      ],
    },
    scaleLabel: "0–5 MMT grading",
    scale: { type: "table", rows: [{ k: "5", v: "Normal — full resistance" }, { k: "3", v: "Full ROM against gravity only" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["Grade 5, no compensation"],
      abnormal: ["Weakness → correlate with L5 dermatome — the most common single-root cause of foot drop"],
      note: "L5 is the most frequently affected lumbar nerve root in disc herniation.",
    },
  },

  "myoS1 Ankle plantarflexors": {
    title: "Myotome S1 — Ankle Plantarflexors",
    icon: "🦶",
    category: "Learn · Neuro · Myotomes",
    perform: {
      images: [img("myo_s1"), img("myo_s1_2"), img("myo_s1_3")],
      caption: "Ankle plantarflexion — 25 single-leg calf raises",
      boxes: [
        { tone: "", label: "👤 Position", text: "Standing, holding support for balance." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to perform single-leg calf raises (up to 25 reps) — a far more sensitive test of S1 strength than manual resistance alone, since the gastrocnemius/soleus can overpower most examiners." },
        { tone: "purple", label: "🩺 Special consideration", text: "Watch for peroneal or flexor hallucis longus substitution masking true gastrocnemius/soleus weakness." },
      ],
    },
    scaleLabel: "0–5 MMT / rep-count grading",
    scale: { type: "table", rows: [{ k: "Normal", v: "≥25 single-leg heel raises" }, { k: "Weak", v: "<25 reps, or unable to complete" }, { k: "0", v: "No contraction" }] },
    interpret: {
      normal: ["≥25 single-leg heel raises, symmetrical"],
      abnormal: ["Reduced rep count or asymmetry → correlate with S1 dermatome and the Achilles reflex"],
      note: "Manual resistance alone is a poor test of this myotome given normal gastroc/soleus strength — always use the single-leg heel raise as the primary test.",
    },
  },

  /* ===================== TONE / GAIT / SENSORY / MENTAL STATUS — HIGH-YIELD ADDITIONS ===================== */

  mas: {
    title: "Modified Ashworth Scale (Spasticity)",
    icon: "🦾",
    category: "Learn · Neuro · Tone / Reflexes",
    perform: {
      images: [img("n_mas"), img("n_mas_2"), img("n_mas_3")],
      caption: "Passively move the limb through range at a moderate, consistent speed",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed and supported, limb positioned in a neutral resting posture before starting." },
        { tone: "blue", label: "🖐️ Technique", text: "Move the target joint passively through its full available range at a constant, moderate speed (roughly 1 second per movement) and grade the resistance felt to passive stretch." },
        { tone: "purple", label: "🩺 Special consideration", text: "Test the same joint at the same speed each time — a faster stretch always feels stiffer, which is exactly what makes MAS unreliable across examiners unless technique is standardised." },
        { tone: "amber", label: "⚠️ Tip", text: "Grade immediately after the movement while the sensation is fresh — don't try to recall it later in the session." },
      ],
    },
    scaleLabel: "0–4 grading (Bohannon & Smith)",
    scale: { type: "table", rows: [
      { k: "0", v: "No increase in tone" },
      { k: "1", v: "Slight increase — catch and release, or minimal resistance at end of range" },
      { k: "1+", v: "Slight increase — catch, then minimal resistance through <50% of ROM" },
      { k: "2", v: "More marked increase through most of ROM, limb still moved easily" },
      { k: "3", v: "Considerable increase, passive movement difficult" },
      { k: "4", v: "Rigid in flexion or extension" },
    ]},
    interpret: {
      normal: ["0 across all tested muscle groups"],
      abnormal: ["≥1+ in an UMN-lesion pattern (e.g. elbow/wrist flexors, knee extensors, ankle plantarflexors) is consistent with spasticity from stroke, SCI, or TBI"],
      note: "Document per muscle group, not a single global score — the distribution itself is diagnostic (e.g. UE flexors + LE extensors is the classic post-stroke pattern).",
    },
  },

  romberg: {
    title: "Romberg Test",
    icon: "🧍",
    category: "Learn · Neuro · Balance",
    perform: {
      images: [img("n_romberg"), img("n_romberg_2"), img("n_romberg_3")],
      caption: "Feet together, eyes open then closed, stand ready to catch",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient stands with feet together, arms at sides, on a firm surface." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe sway for ~30 seconds with eyes open, then ask the patient to close their eyes and observe for the same duration. Stand close enough to catch a fall." },
        { tone: "purple", label: "🩺 Special consideration", text: "A positive Romberg (marked increase in sway only with eyes closed) localises to a proprioceptive or vestibular deficit — cerebellar ataxia causes sway with eyes open too, so a 'positive' finding in an already-ataxic patient isn't a true Romberg sign." },
        { tone: "amber", label: "⚠️ Tip", text: "Stand at the patient's side, not in front, so you can catch a fall in either direction without blocking your own view." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Negative", v: "Stable, minimal sway, both conditions" },
      { k: "Positive", v: "Marked increase in sway or loss of balance, eyes closed only" },
      { k: "Unable to test", v: "Cannot stand feet together even with eyes open" },
    ]},
    interpret: {
      normal: ["Negative — stable with eyes open and closed"],
      abnormal: ["Positive → proprioceptive loss (e.g. dorsal column, peripheral neuropathy) or vestibular dysfunction"],
      note: "Always rule out cerebellar ataxia first — sway present with eyes open makes this test non-localising.",
    },
  },

  vibration: {
    title: "Vibration Sense (128Hz Tuning Fork)",
    icon: "🔔",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [img("n_vibration"), img("n_vibration_2"), img("n_vibration_3")],
      caption: "Strike the fork, apply to a bony prominence, patient reports when it stops",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, eyes closed, limb supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Strike the 128Hz tuning fork and place it firmly over a distal bony prominence (e.g. wrist, ankle malleolus). Ask the patient to say 'now' the moment they stop feeling the vibration, and compare to your own perception at the same site." },
        { tone: "purple", label: "🩺 Special consideration", text: "Test distal to proximal — if impaired distally, move to a more proximal bony point to find the level where sensation returns to normal." },
        { tone: "amber", label: "⚠️ Tip", text: "Dampen the fork with your fingers between tests to reset it to a consistent starting vibration." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Vibration duration matches examiner's own perception" },
      { k: "Reduced", v: "Stops earlier than examiner's perception" },
      { k: "Absent", v: "No vibration sensation reported" },
    ]},
    interpret: {
      normal: ["Intact bilaterally, matching examiner"],
      abnormal: ["Reduced/absent distally → dorsal column pathology (peripheral neuropathy, B12 deficiency, tabes dorsalis, MS)"],
      note: "Vibration and proprioception travel in the same dorsal column pathway — an isolated deficit in one without the other is unusual and worth double-checking technique.",
    },
  },

  twoPoint: {
    title: "Two-Point Discrimination",
    icon: "📍",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [img("n_two_point"), img("n_two_point_2"), img("n_two_point_3")],
      caption: "Calibrated two-point discriminator, gradually narrowing distance",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, testing surface (typically fingertip) relaxed and supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Touch the skin with one or two points simultaneously using a calibrated discriminator (or an opened paperclip), varying whether one or two points are used unpredictably, and find the minimum distance at which the patient reliably distinguishes two points from one." },
        { tone: "purple", label: "🩺 Special consideration", text: "Normal two-point discrimination varies hugely by body region — fingertip (~2-4mm) vs. back (~40mm+) — always compare against the expected normal for that specific site, not a single number." },
        { tone: "amber", label: "⚠️ Tip", text: "Randomise one-point vs two-point presentations so the patient can't simply guess a pattern." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Distinguishes two points at the expected distance for that site" },
      { k: "Impaired", v: "Requires a larger distance than expected, or cannot distinguish" },
      { k: "Not tested", v: "—" },
    ]},
    interpret: {
      normal: ["Within expected range for the tested site"],
      abnormal: ["Impaired → cortical (parietal lobe) or dorsal column pathway involvement"],
      note: "This is a cortical integration test, not a peripheral nerve test — it can be abnormal even when light touch and pain sensation are both normal.",
    },
  },

  lightTouch: {
    title: "Light Touch Sensation",
    icon: "🖐️",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [null, null, null],
      caption: "Wisp of cotton wool, eyes closed, compare side to side",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed with eyes closed so they can't anticipate where or when you'll touch." },
        { tone: "blue", label: "🖐️ Technique", text: "Use a wisp of cotton wool (or fingertip) to lightly touch each dermatome/region, alternating unpredictably between sides. Ask the patient to say 'yes' each time they feel it, and compare side to side and proximal to distal." },
        { tone: "purple", label: "🩺 Special consideration", text: "Map the border of any deficit carefully — a sensory level (e.g. a clear cutoff at a spinal segment) points to cord pathology, while a stocking/glove pattern points to peripheral polyneuropathy." },
        { tone: "amber", label: "⚠️ Tip", text: "Demonstrate the stimulus on an unaffected area first (e.g. the sternum) with eyes open, so the patient knows what 'a touch' should feel like before testing with eyes closed." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Touch felt and localised correctly, both sides" },
      { k: "Impaired", v: "Reduced sensation (hypoesthesia)" },
      { k: "Absent", v: "No sensation reported" },
      { k: "Hyperesthesia", v: "Increased/exaggerated sensitivity" },
    ]},
    interpret: {
      normal: ["Intact and symmetric across all tested regions"],
      abnormal: ["Dermatomal pattern → nerve root involvement", "Stocking/glove pattern → peripheral polyneuropathy", "Clear sensory level → spinal cord lesion at that level"],
      note: "Always test light touch alongside pain/pinprick — a dissociated sensory loss (one modality affected, the other spared) is itself diagnostically significant (e.g. Brown-Séquard, syringomyelia).",
    },
  },

  sensoryTemperature: {
    title: "Temperature Sensation",
    icon: "🌡️",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [null, null, null],
      caption: "Warm and cold objects, eyes closed, compare side to side",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, eyes closed, limb exposed and supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Use two test tubes (or the warm/cold ends of a tuning fork/metal object) — one warm, one cold — and touch each to the skin unpredictably. Ask the patient to identify 'warm' or 'cold' and compare side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Temperature and pain travel together in the spinothalamic tract — an isolated temperature deficit with normal light touch/proprioception suggests a spinothalamic (anterolateral) lesion." },
        { tone: "amber", label: "⚠️ Tip", text: "If dedicated warm/cold rollers aren't available, pain/pinprick testing is an acceptable proxy since both travel the same pathway." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Correctly identifies warm/cold, both sides" },
      { k: "Impaired", v: "Reduced discrimination or delayed response" },
      { k: "Absent", v: "Cannot distinguish warm from cold" },
    ]},
    interpret: {
      normal: ["Intact and symmetric"],
      abnormal: ["Loss with preserved light touch/proprioception → spinothalamic tract lesion (e.g. syringomyelia, anterior cord syndrome)"],
      note: "A dissociated loss of pain/temperature with preserved touch/proprioception (or vice versa) localises to a specific tract, not just 'sensory loss' generally.",
    },
  },

  proprioception: {
    title: "Proprioception (Joint Position Sense)",
    icon: "🦵",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [null, null, null],
      caption: "Move digit up/down with eyes closed, patient names the direction",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's eyes closed, digit held by its sides (not the pad) to avoid giving pressure cues." },
        { tone: "blue", label: "🖐️ Technique", text: "Hold the digit by its sides, move it up or down a small amount with the patient's eyes closed, and ask them to name the direction moved. Start distally (fingers/toes) and move proximally if impaired." },
        { tone: "purple", label: "🩺 Special consideration", text: "Impaired proprioception is a major fall-risk factor and often goes unnoticed by the patient until directly tested — always screen it before a functional mobility assessment." },
        { tone: "amber", label: "⚠️ Tip", text: "Demonstrate 'up' and 'down' with eyes open first so the patient understands the two response options before eyes-closed testing begins." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Correctly identifies direction of movement" },
      { k: "Impaired", v: "Inconsistent or delayed identification" },
      { k: "Absent", v: "Cannot identify direction, or reports movement that didn't occur" },
    ]},
    interpret: {
      normal: ["Intact distally, both sides"],
      abnormal: ["Impaired distally → dorsal column pathology (peripheral neuropathy, B12 deficiency, MS, tabes dorsalis) — correlate with vibration sense, which travels the same pathway"],
      note: "Proprioceptive loss with a normal motor exam can still cause significant functional impairment (sensory ataxia) — don't assume gait/balance is fine just because strength is normal.",
    },
  },

  gcs: {
    title: "Glasgow Coma Scale (GCS)",
    icon: "🧠",
    category: "Learn · Neuro · Mental Status",
    perform: {
      images: [img("n_gcs"), img("n_gcs_2"), img("n_gcs_3")],
      caption: "Score Eye, Verbal, and Motor response independently, then sum",
      boxes: [
        { tone: "", label: "👤 Position", text: "Any position — this is an observation + graded-stimulus scale, not a positional test." },
        { tone: "blue", label: "🖐️ Technique", text: "Score each of the three components independently against its own criteria: Eye opening (4 to 1), Verbal response (5 to 1), Motor response (6 to 1). Use the best response obtained, escalating the stimulus from voice to pain only as needed. Sum for a total out of 15." },
        { tone: "purple", label: "🩺 Special consideration", text: "Document each component separately (e.g. E3V4M5) as well as the total — the total alone hides which domain is actually impaired, which changes management." },
        { tone: "amber", label: "⚠️ Tip", text: "A drop of 2 or more points from a previous GCS score is a medical emergency regardless of the absolute total — trend matters as much as the single number." },
      ],
    },
    scaleLabel: "Total /15 severity bands",
    scale: { type: "table", rows: [
      { k: "13–15", v: "Mild" },
      { k: "9–12", v: "Moderate" },
      { k: "≤8", v: "Severe — airway protection typically required" },
    ]},
    interpret: {
      normal: ["15/15, fully alert and oriented"],
      abnormal: ["Any reduction from baseline — reassess the trend, not just the single value"],
      redFlags: ["GCS ≤8, or a drop of ≥2 points from a prior score — escalate for urgent medical review before continuing therapy"],
      note: "In TBI/neurosurgical patients, always check the most recent medical GCS before starting treatment, and stop if it has dropped.",
    },
  },

  gcsEye: {
    title: "GCS — Eye Opening (E)",
    icon: "👁️",
    category: "Learn · Neuro · Mental Status",
    perform: {
      images: [null, null, null],
      caption: "Best eye-opening response, escalating the stimulus only as needed",
      boxes: [
        { tone: "", label: "👤 Position", text: "Observe first without any stimulus — check whether the eyes are already open spontaneously before saying or doing anything." },
        { tone: "blue", label: "🖐️ Technique", text: "Score the best response obtained: 4 = spontaneous (already open before any stimulus), 3 = opens to speech (a normal or loud verbal request/name), 2 = opens only to a painful stimulus, 1 = no eye opening at any stimulus. Escalate speech → pain only if the previous level got no response." },
        { tone: "purple", label: "🩺 Special consideration", text: "Record 'C' instead of a score if the eyes cannot open due to swelling, ptosis, orbital trauma, or bandaging — never guess or default to 1, since a closed-but-untestable eye is not the same as no response." },
        { tone: "amber", label: "⚠️ Tip", text: "Eyes open does not mean aware — 'eye opening' scores arousal, not awareness, so a spontaneously-open eye can still accompany a very low verbal or motor score." },
      ],
    },
    scaleLabel: "Eye opening (E) score",
    scale: { type: "table", rows: [
      { k: "4", v: "Spontaneous" },
      { k: "3", v: "To speech" },
      { k: "2", v: "To pain" },
      { k: "1", v: "None" },
    ]},
    interpret: {
      normal: ["4 — spontaneous"],
      abnormal: ["Any score <4 → note the exact stimulus that was needed to elicit opening"],
      note: "If eyes are closed by swelling or trauma rather than reduced consciousness, document 'C' (not testable) rather than scoring 1 — this changes how the total GCS should be interpreted.",
    },
  },

  gcsVerbal: {
    title: "GCS — Verbal Response (V)",
    icon: "🗣️",
    category: "Learn · Neuro · Mental Status",
    perform: {
      images: [null, null, null],
      caption: "Best verbal response to voice, escalating to pain if needed",
      boxes: [
        { tone: "", label: "👤 Position", text: "Address the patient by name in a normal tone before escalating to a louder voice or painful stimulus." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask an orientation question (name, place, date). Score the best response: 5 = oriented, 4 = confused conversation, 3 = inappropriate words (no conversation), 2 = incomprehensible sounds (moaning), 1 = no verbal response." },
        { tone: "purple", label: "🩺 Special consideration", text: "Record 'T' instead of a verbal score if the patient is intubated — never estimate or omit; note it clearly since it affects how the total GCS is interpreted." },
        { tone: "amber", label: "⚠️ Tip", text: "A patient who is oriented to person but not place/time still scores 4 (confused), not 5 — 5 requires full orientation to person, place, and time." },
      ],
    },
    scaleLabel: "Verbal response (V) score",
    scale: { type: "table", rows: [
      { k: "5", v: "Oriented" },
      { k: "4", v: "Confused conversation" },
      { k: "3", v: "Inappropriate words" },
      { k: "2", v: "Incomprehensible sounds" },
      { k: "1", v: "None" },
    ]},
    interpret: {
      normal: ["5 — fully oriented"],
      abnormal: ["Any score <5 → reassess for delirium, intoxication, or a new neurological event"],
      note: "Verbal score is the component most confounded by intubation, sedation, aphasia, or a language barrier — always note the reason a full verbal score wasn't obtainable rather than just recording a low number.",
    },
  },

  gcsMotor: {
    title: "GCS — Motor Response (M)",
    icon: "🤲",
    category: "Learn · Neuro · Mental Status",
    perform: {
      images: [null, null, null],
      caption: "Best motor response to command, then to a painful stimulus",
      boxes: [
        { tone: "", label: "👤 Position", text: "Start with a simple verbal command (e.g. 'squeeze my hand'); only apply a painful stimulus if there is no response to voice." },
        { tone: "blue", label: "🖐️ Technique", text: "Score the single best response from either limb: 6 = obeys commands, 5 = localises to pain (a limb crosses the midline toward the stimulus), 4 = withdraws from pain, 3 = abnormal flexion (decorticate), 2 = abnormal extension (decerebrate), 1 = none." },
        { tone: "purple", label: "🩺 Special consideration", text: "Use a central painful stimulus (trapezius pinch or supraorbital pressure), not just a peripheral nail-bed pinch, since a peripheral stimulus can trigger a spinal reflex withdrawal that looks like a better response than the patient's true best." },
        { tone: "amber", label: "⚠️ Tip", text: "Abnormal flexion (decorticate, 3) and abnormal extension (decerebrate, 2) are both ominous signs of significant brain injury — either should trigger urgent escalation, not just a documented score." },
      ],
    },
    scaleLabel: "Motor response (M) score",
    scale: { type: "table", rows: [
      { k: "6", v: "Obeys commands" },
      { k: "5", v: "Localises to pain" },
      { k: "4", v: "Withdraws from pain" },
      { k: "3", v: "Abnormal flexion (decorticate)" },
      { k: "2", v: "Abnormal extension (decerebrate)" },
      { k: "1", v: "None" },
    ]},
    interpret: {
      normal: ["6 — obeys commands"],
      abnormal: ["≤4 → significant impairment; ≤3 (abnormal flexion/extension) is a medical emergency"],
      redFlags: ["New abnormal flexion or extension posturing — escalate for urgent medical review immediately"],
      note: "Motor is the single most predictive GCS component for outcome after TBI — a falling motor score deserves the fastest escalation of the three.",
    },
  },

  balance: {
    title: "Balance Assessment (Sitting / Standing)",
    icon: "⚖️",
    category: "Learn · Neuro · Balance",
    perform: {
      images: [null, null, null],
      caption: "Static and dynamic balance, sitting and standing, with stand-by guard",
      boxes: [
        { tone: "", label: "👤 Position", text: "Test sitting balance before standing, and always have a stand-by guard/gait belt ready for standing balance in an at-risk patient." },
        { tone: "blue", label: "🖐️ Technique", text: "Static: ask the patient to maintain the position (sitting/standing) unsupported and observe steadiness. Dynamic: ask them to reach, turn, or perturb their base of support (e.g. weight shifts, reaching outside base) while maintaining balance." },
        { tone: "purple", label: "🩺 Special consideration", text: "Dynamic balance typically fails before static balance as impairment progresses — a patient who looks steady sitting still may be unsafe the moment they reach or turn." },
        { tone: "amber", label: "⚠️ Tip", text: "Pair this with a standardised outcome measure (Berg Balance Scale, Functional Reach) whenever possible so change over time is measurable, not just descriptive." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Maintains position/task without any loss of balance" },
      { k: "Good", v: "Minor unsteadiness, no loss of balance, no support needed" },
      { k: "Fair", v: "Requires occasional support or contact guard" },
      { k: "Poor", v: "Requires continuous support/assistance" },
      { k: "Absent", v: "Unable to maintain the position even with support" },
    ]},
    interpret: {
      normal: ["Normal static and dynamic balance, sitting and standing"],
      abnormal: ["Impaired dynamic > static balance → early/mild impairment", "Impaired static balance → significant impairment, high fall risk"],
      note: "Balance impairment is multifactorial (proprioceptive, vestibular, visual, motor, cognitive) — pair this exam with the sensory and coordination findings to localise the likely contributor(s).",
    },
  },

  dvt: {
    title: "DVT Precautions",
    icon: "🩸",
    category: "Learn · Neuro · Safety Screen",
    perform: {
      images: [null, null, null],
      caption: "Screen for calf pain/swelling/warmth before mobilising a high-risk patient",
      boxes: [
        { tone: "", label: "👤 Position", text: "Inspect and gently palpate both calves with the patient supine, comparing side to side." },
        { tone: "blue", label: "🖐️ Technique", text: "Check for unilateral calf swelling, warmth, redness, and tenderness. Ask about calf pain, especially on dorsiflexion. Review the chart for any known DVT/PE history, anticoagulation status, or recent immobility (post-op, prolonged bed rest, stroke, SCI)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Homans' sign (calf pain on forced ankle dorsiflexion) is neither sensitive nor specific for DVT and should never be relied on alone to rule a DVT in or out." },
        { tone: "amber", label: "⚠️ Tip", text: "Stroke, SCI, and prolonged post-op immobility are all independent high-risk states for DVT — have a low threshold to flag for medical review even with a normal-looking calf." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Not applicable", v: "No known risk factors or concerning findings" },
      { k: "Confirmed/suspected", v: "Avoid limb massage/vigorous mobilisation of that limb, monitor for signs of PE, escalate to medical team" },
    ]},
    interpret: {
      normal: ["No calf swelling, warmth, redness, or tenderness; no known DVT risk factors"],
      abnormal: ["Unilateral calf swelling/warmth/tenderness in an at-risk patient → suspect DVT, do not massage or vigorously mobilise the limb, escalate immediately"],
      redFlags: ["Sudden dyspnea, pleuritic chest pain, or tachycardia in a patient with suspected DVT → possible pulmonary embolism, medical emergency"],
      note: "This is a precautions screen, not a diagnostic test — a normal-looking calf never fully excludes DVT; when risk factors are present, defer to imaging/medical workup rather than clinical exam alone.",
    },
  },

  pronatorDrift: {
    title: "Pronator Drift Test",
    icon: "🙌",
    category: "Learn · Neuro · Motor",
    perform: {
      images: [img("n_pronator_drift"), img("n_pronator_drift_2"), img("n_pronator_drift_3")],
      caption: "Arms outstretched, palms up, eyes closed, watch for drift",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient standing or seated, both arms fully extended forward at shoulder height, palms facing up." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to close their eyes and hold the position for 10-20 seconds. Watch for one arm drifting downward and/or pronating (turning palm-down)." },
        { tone: "purple", label: "🩺 Special consideration", text: "Drift with pronation is a sensitive early sign of subtle upper motor neuron (corticospinal tract) weakness, often present before weakness is obvious on formal MMT." },
        { tone: "amber", label: "⚠️ Tip", text: "Tapping the outstretched arms briefly, or asking the patient to keep their eyes closed a little longer, can bring out a subtle drift not visible in the first few seconds." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Negative", v: "Arms held steady, no drift/pronation" },
      { k: "Positive", v: "One arm drifts down and/or pronates" },
    ]},
    interpret: {
      normal: ["Negative bilaterally"],
      abnormal: ["Positive (unilateral) → mild UMN weakness on that side, corticospinal tract involvement"],
      note: "A cerebellar lesion can also cause upward drift without pronation — note the exact pattern, not just 'positive/negative'.",
    },
  },

  tandemGait: {
    title: "Tandem Gait (Heel-to-Toe Walking)",
    icon: "🚶",
    category: "Learn · Neuro · Gait",
    perform: {
      images: [img("n_tandem_gait"), img("n_tandem_gait_2"), img("n_tandem_gait_3")],
      caption: "Walk heel-to-toe in a straight line, arms at sides",
      boxes: [
        { tone: "", label: "👤 Position", text: "Clear, straight path at least a few metres long, therapist walking alongside for safety." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to walk heel-to-toe in a straight line, placing the heel of one foot directly in front of the toes of the other, for about 10 steps." },
        { tone: "purple", label: "🩺 Special consideration", text: "A sensitive test for mild cerebellar ataxia or vestibular dysfunction that may not show up on normal gait observation alone." },
        { tone: "amber", label: "⚠️ Tip", text: "Stay close enough to assist but avoid touching unless needed — physical contact can mask a genuine balance deficit." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Completes without significant deviation" },
      { k: "Impaired", v: "Steps off the line, wide-based compensations, or unable without support" },
      { k: "Unable", v: "Cannot attempt safely" },
    ]},
    interpret: {
      normal: ["Completes 10 steps with minimal deviation"],
      abnormal: ["Consistent deviation to one side → suggests a unilateral cerebellar or vestibular lesion on that side", "Wide-based, irregular stepping → cerebellar ataxia"],
      note: "Combine with Romberg — cerebellar ataxia impairs tandem gait with eyes open, while a pure proprioceptive/vestibular deficit may perform reasonably with eyes open but worsen with eyes closed.",
    },
  },

  pupillaryLight: {
    title: "Pupillary Light Reflex",
    icon: "👁️",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      images: [img("n_pupillary_light"), img("n_pupillary_light_2"), img("n_pupillary_light_3")],
      caption: "Shine a light into one eye, observe direct and consensual response",
      boxes: [
        { tone: "", label: "👤 Position", text: "Dim room, patient looking at a distant fixed point to control accommodation." },
        { tone: "blue", label: "🖐️ Technique", text: "Shine a penlight into one pupil from the side and observe constriction in that eye (direct response) and the other eye (consensual response). Repeat for the other eye." },
        { tone: "purple", label: "🩺 Special consideration", text: "The direct response tests CN II (afferent, that eye) + CN III (efferent, that eye); the consensual response tests CN II (afferent, that eye) + CN III (efferent, other eye) — a discrepancy between the two localises which nerve/side is affected." },
        { tone: "amber", label: "⚠️ Tip", text: "A relative afferent pupillary defect (RAPD) is best picked up with the swinging-flashlight test — move the light rhythmically eye to eye and watch for paradoxical dilation." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Brisk, equal constriction, direct and consensual, both sides" },
      { k: "Sluggish", v: "Slowed constriction" },
      { k: "Fixed", v: "No constriction" },
      { k: "Anisocoria", v: "Unequal pupil size at baseline" },
    ]},
    interpret: {
      normal: ["PERRLA — pupils equal, round, reactive to light and accommodation"],
      abnormal: ["Fixed/dilated unilateral pupil → CN III palsy (consider compressive lesion) until proven otherwise", "RAPD (Marcus Gunn pupil) → optic nerve (CN II) pathology on that side"],
      redFlags: ["A new unilateral fixed and dilated pupil, especially with reduced GCS, is a neurosurgical emergency (raised ICP / herniation) — escalate immediately"],
      note: "Always check pupil size/reactivity at baseline — roughly 20% of people have a small, physiological, non-pathological difference between pupils (physiological anisocoria).",
    },
  },

  /* ===================== MEDIUM-PRIORITY ADDITIONS — CORTICAL SENSATION / TONE / REFLEXES / GAIT ===================== */

  stereognosis: {
    title: "Stereognosis",
    icon: "🖐️",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [img("n_stereognosis"), img("n_stereognosis_2"), img("n_stereognosis_3")],
      caption: "Eyes closed, identify a familiar object placed in the hand",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, eyes closed, hand relaxed and supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Place a familiar object (coin, key, paperclip) in the patient's hand and ask them to identify it by feel alone, without looking. Test each hand separately." },
        { tone: "purple", label: "🩺 Special consideration", text: "Requires intact primary sensation (light touch, proprioception) to be interpretable — test those first, since impaired stereognosis with impaired primary sensation isn't a cortical finding, it's just downstream of the peripheral loss." },
        { tone: "amber", label: "⚠️ Tip", text: "Use objects the patient would recognise regardless of cultural or visual background — a coin and a key are safer defaults than something unfamiliar." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Correctly identifies object" },
      { k: "Impaired", v: "Cannot identify despite intact primary sensation" },
      { k: "Not testable", v: "Primary sensation too impaired to interpret" },
    ]},
    interpret: {
      normal: ["Intact bilaterally, with normal primary sensation"],
      abnormal: ["Impaired with intact primary sensation → astereognosis, localises to the contralateral parietal lobe (primary somatosensory cortex)"],
      note: "Always confirm light touch and proprioception are intact in that hand before attributing a failed test to a cortical rather than peripheral cause.",
    },
  },

  graphesthesia: {
    title: "Graphesthesia",
    icon: "✍️",
    category: "Learn · Neuro · Sensory",
    perform: {
      images: [img("n_graphesthesia"), img("n_graphesthesia_2"), img("n_graphesthesia_3")],
      caption: "Eyes closed, trace a number on the palm, patient identifies it",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, eyes closed, palm facing up and supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Using a blunt object (pen cap, fingertip), trace a single-digit number on the patient's palm and ask them to identify it. Repeat with different numbers on each hand." },
        { tone: "purple", label: "🩺 Special consideration", text: "Like stereognosis, this requires intact primary sensation to be interpretable as a cortical sign — check light touch and proprioception first." },
        { tone: "amber", label: "⚠️ Tip", text: "Trace numbers large enough and slowly enough that a correct identification reflects genuine cortical integration, not a lucky guess." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Intact", v: "Correctly identifies traced number" },
      { k: "Impaired", v: "Cannot identify despite intact primary sensation" },
      { k: "Not testable", v: "Primary sensation too impaired to interpret" },
    ]},
    interpret: {
      normal: ["Intact bilaterally, with normal primary sensation"],
      abnormal: ["Impaired with intact primary sensation → localises to the contralateral parietal lobe, same significance as astereognosis"],
      note: "Stereognosis and graphesthesia are both cortical sensory integration tests — an isolated deficit in one hand with normal primary sensation is a useful, focal parietal lobe finding.",
    },
  },

  toneRigidity: {
    title: "Rigidity Assessment (Cogwheel / Lead-pipe)",
    icon: "🦾",
    category: "Learn · Neuro · Tone / Reflexes",
    perform: {
      images: [img("n_rigidity"), img("n_rigidity_2"), img("n_rigidity_3")],
      caption: "Passively move the limb through range, feel for resistance quality",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, seated or supine, limb fully supported by the examiner." },
        { tone: "blue", label: "🖐️ Technique", text: "Passively flex and extend the wrist or elbow at a slow, constant speed, independent of velocity (unlike spasticity, which is velocity-dependent). Ask the patient to perform a distracting task with the opposite limb (e.g. opening and closing the other fist) to bring out latent rigidity." },
        { tone: "purple", label: "🩺 Special consideration", text: "Cogwheel rigidity (a ratchety, catch-release quality, classic in Parkinson's) and lead-pipe rigidity (smooth, uniform resistance throughout range) are distinguishable by feel — document which pattern, not just 'rigid'." },
        { tone: "amber", label: "⚠️ Tip", text: "Rigidity is present equally in both flexion and extension and doesn't vary with speed — this is what distinguishes it from spasticity (which is speed-dependent and direction-specific, typically a 'catch' only in one direction)." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "None", v: "Normal tone, no resistance beyond expected" },
      { k: "Cogwheel", v: "Ratchety, catch-release resistance throughout range" },
      { k: "Lead-pipe", v: "Smooth, uniform resistance throughout range" },
      { k: "Mixed/unclear", v: "Pattern not clearly one or the other" },
    ]},
    interpret: {
      normal: ["No rigidity, normal passive resistance"],
      abnormal: ["Cogwheel rigidity → classic extrapyramidal (Parkinson's/parkinsonism) finding, especially with a resting tremor and bradykinesia", "Lead-pipe rigidity → also extrapyramidal, but seen without tremor overlay (e.g. some atypical parkinsonian syndromes)"],
      note: "Distinguish carefully from spasticity (velocity-dependent, seen with corticospinal/UMN lesions) — the two have very different underlying pathology and different management.",
    },
  },

  abdominalReflexes: {
    title: "Superficial Abdominal Reflexes",
    icon: "🔲",
    category: "Learn · Neuro · Reflexes",
    perform: {
      images: [img("n_abdominal_reflexes"), img("n_abdominal_reflexes_2"), img("n_abdominal_reflexes_3")],
      caption: "Lightly stroke each abdominal quadrant, watch for muscle contraction toward the stimulus",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine, abdomen relaxed and exposed, room warm (a cold or tense abdomen suppresses the response)." },
        { tone: "blue", label: "🖐️ Technique", text: "Lightly stroke each of the four abdominal quadrants from lateral to medial with a blunt object (handle end of a reflex hammer, or a wooden applicator). Observe for contraction of the underlying muscle, pulling the umbilicus toward the stimulated quadrant." },
        { tone: "purple", label: "🩺 Special consideration", text: "Upper quadrants test T7-T9, lower quadrants test T10-T12 — a level-specific absence can help localise a thoracic cord lesion." },
        { tone: "amber", label: "⚠️ Tip", text: "Can be physiologically absent or diminished in obesity, multiparity, or after abdominal surgery — don't over-interpret absence in isolation without other UMN signs." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Present", v: "Umbilicus deviates toward the stimulated quadrant, all four quadrants" },
      { k: "Diminished", v: "Weak or inconsistent response" },
      { k: "Absent", v: "No visible contraction" },
    ]},
    interpret: {
      normal: ["Present and symmetrical, all four quadrants"],
      abnormal: ["Unilateral absence with other UMN signs (hyperreflexia, upgoing plantar) on the same side → supports a corticospinal tract lesion above the tested spinal level", "Bilateral absence alone, with no other findings, is often a normal variant (especially with the confounders above)"],
      note: "This reflex is most useful when it's asymmetrical and paired with other UMN signs — an isolated bilateral absence is low-yield on its own.",
    },
  },

  cornealReflex: {
    title: "Corneal Reflex",
    icon: "👁️",
    category: "Learn · Neuro · Cranial Nerves",
    perform: {
      images: [img("n_corneal_reflex"), img("n_corneal_reflex_2"), img("n_corneal_reflex_3")],
      caption: "Lightly touch the cornea with a wisp of cotton, watch for bilateral blink",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient looking away from the side being tested, to avoid a visual blink reflex confounding the result." },
        { tone: "blue", label: "🖐️ Technique", text: "Approach from the side (out of the patient's direct line of sight) and lightly touch the edge of the cornea (not just the sclera) with a fine wisp of cotton wool. Observe for a blink in both the touched eye (direct) and the other eye (consensual)." },
        { tone: "purple", label: "🩺 Special consideration", text: "The afferent limb is CN V (trigeminal, ophthalmic division) and the efferent limb is CN VII (facial) — an absent direct response with an intact consensual response on retesting the other side localises to CN V; an absent response on both sides when testing one eye but normal when testing the other localises to CN VII on the side that failed to blink." },
        { tone: "amber", label: "⚠️ Tip", text: "Contact lens wearers can have a physiologically reduced corneal reflex from chronic corneal desensitisation — ask about lens wear before interpreting a reduced response." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Present", v: "Brisk bilateral blink, both sides tested" },
      { k: "Reduced", v: "Sluggish or partial blink" },
      { k: "Absent", v: "No blink response" },
    ]},
    interpret: {
      normal: ["Present bilaterally, both direct and consensual"],
      abnormal: ["Absent direct response, intact consensual on the other side → CN V (afferent) lesion on the tested side", "Absent blink in the eye being watched regardless of which side is touched → CN VII (efferent) lesion on that side"],
      note: "A reduced or absent corneal reflex, especially with facial numbness or weakness, warrants correlating with the rest of the CN V/VII exam findings rather than being read in isolation.",
    },
  },

  gaitPattern: {
    title: "Gait Pattern Recognition",
    icon: "🚶",
    category: "Learn · Neuro · Gait",
    perform: {
      images: [img("n_gait_pattern"), img("n_gait_pattern_2"), img("n_gait_pattern_3")],
      caption: "Observe from front, side, and behind over several strides",
      boxes: [
        { tone: "", label: "👤 Position", text: "Clear walkway, adequate lighting, patient in appropriate footwear (or barefoot if assessing foot clearance/positioning)." },
        { tone: "blue", label: "🖐️ Technique", text: "Watch the patient walk from the front, side, and behind over at least several full strides each, before naming a pattern — a single glance can miss the diagnostic phase of gait." },
        { tone: "purple", label: "🩺 Special consideration", text: "Hemiplegic: circumducted stiff leg with flexed UE. Ataxic: wide-based, irregular, staggering. Spastic: scissoring from hip adductor overactivity. Festinating: short, accelerating steps typical of Parkinson's. Steppage: high-stepping to clear a foot drop. Trendelenburg: contralateral pelvic drop from hip abductor weakness." },
        { tone: "amber", label: "⚠️ Tip", text: "Name the pattern AND describe what you actually observed (e.g. 'right circumduction with flexed right UE, consistent with hemiplegic pattern') — the description survives even if the pattern label is later disputed or refined." },
      ],
    },
    scaleLabel: "Common patterns",
    scale: { type: "table", rows: [
      { k: "Hemiplegic", v: "Circumducted stiff leg, flexed UE — post-stroke/UMN" },
      { k: "Ataxic", v: "Wide-based, irregular, staggering — cerebellar" },
      { k: "Spastic (scissoring)", v: "Hip adductor overactivity — bilateral UMN (e.g. cerebral palsy, myelopathy)" },
      { k: "Festinating", v: "Short, accelerating steps — Parkinson's" },
      { k: "Steppage", v: "High-stepping to clear foot drop — peripheral nerve (e.g. common peroneal)" },
      { k: "Trendelenburg", v: "Contralateral pelvic drop — hip abductor weakness" },
    ]},
    interpret: {
      normal: ["Normal reciprocal gait, no compensations"],
      abnormal: ["Any consistent pattern above → correlates with a specific lesion location/type, and should be cross-checked against tone, MMT, and sensory findings"],
      note: "A mixed or atypical pattern is common and worth describing in plain terms rather than forcing it into a single named category.",
    },
  },

  /* ===================== LOWER-PRIORITY / CONDITION-SPECIFIC ADDITIONS ===================== */

  meningealSigns: {
    title: "Meningeal Signs (Kernig's / Brudzinski's / Nuchal Rigidity)",
    icon: "🚩",
    category: "Learn · Neuro · Safety Screen",
    perform: {
      images: [img("n_meningeal"), img("n_meningeal_2"), img("n_meningeal_3")],
      caption: "Passive neck flexion and hip/knee manoeuvres, watch for involuntary guarding",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine, relaxed, on a firm surface." },
        { tone: "blue", label: "🖐️ Technique", text: "Nuchal rigidity: passively flex the neck, chin toward chest — resistance/pain is positive. Brudzinski's sign: passively flex the neck and watch for involuntary flexion of the hips and knees. Kernig's sign: flex the hip and knee to 90°, then slowly extend the knee — pain/resistance in the hamstrings or spine, or involuntary flexion of the opposite leg, is positive." },
        { tone: "purple", label: "🩺 Special consideration", text: "These are screening signs for meningeal irritation (meningitis, subarachnoid haemorrhage) — a positive finding, especially combined with fever, severe headache, or photophobia, is a medical emergency, not a routine physiotherapy finding to simply document and continue." },
        { tone: "amber", label: "⚠️ Tip", text: "Sensitivity is limited (roughly 5-30% in confirmed meningitis in adult studies) — a negative test does NOT rule out meningeal irritation. Never let a negative Kernig's/Brudzinski's override a strong clinical suspicion from history (fever, severe headache, neck stiffness, photophobia)." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Negative", v: "No resistance/pain, no involuntary flexion, all three signs" },
      { k: "Positive", v: "Resistance/pain and/or involuntary flexion on any manoeuvre" },
      { k: "Not tested", v: "Deferred — e.g. known cervical instability/precautions" },
    ]},
    interpret: {
      normal: ["Negative — full pain-free neck flexion, negative Kernig's and Brudzinski's"],
      abnormal: ["Any positive sign, especially with fever/severe headache/photophobia → urgent medical referral for suspected meningitis or subarachnoid haemorrhage, before any further physiotherapy assessment or treatment"],
      redFlags: ["Positive meningeal signs with fever, severe headache ('worst of life'), photophobia, or reduced GCS — treat as a medical emergency, do not proceed with exertional or provocative testing"],
      note: "Do not rely on these tests alone to rule anything out — they have poor sensitivity. Trust the overall clinical picture and escalate on suspicion, not just on a positive test.",
    },
  },

  primitiveReflexes: {
    title: "Primitive / Frontal Release Reflexes",
    icon: "👶",
    category: "Learn · Neuro · Reflexes",
    perform: {
      images: [img("n_primitive_reflexes"), img("n_primitive_reflexes_2"), img("n_primitive_reflexes_3")],
      caption: "Grasp reflex: stroke the palm. Palmomental reflex: stroke the thenar eminence, watch the chin.",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, hand resting supported, face visible to the examiner." },
        { tone: "blue", label: "🖐️ Technique", text: "Grasp reflex: stroke the patient's palm with your fingers and observe whether they involuntarily grasp, even after being asked not to. Palmomental reflex: stroke the thenar eminence (base of thumb) with a blunt object and watch for an involuntary twitch of the chin/mentalis muscle on the same side." },
        { tone: "purple", label: "🩺 Special consideration", text: "These are 'frontal release signs' — normally present in infancy, suppressed by an intact frontal lobe, and re-emerging when frontal lobe inhibition is lost. A present grasp reflex in an adult is abnormal and specific for frontal lobe pathology; a mild palmomental reflex can occasionally be a normal variant in older adults, so weight it less heavily in isolation." },
        { tone: "amber", label: "⚠️ Tip", text: "Explicitly ask the patient not to grasp before testing the grasp reflex — an involuntary grasp despite instruction not to is what makes the finding pathological, rather than simple cooperation." },
      ],
    },
    scaleLabel: "Recording",
    scale: { type: "table", rows: [
      { k: "Absent", v: "No involuntary response, either test" },
      { k: "Present — grasp", v: "Involuntary grasp despite instruction not to" },
      { k: "Present — palmomental", v: "Involuntary ipsilateral chin twitch" },
    ]},
    interpret: {
      normal: ["Absent in a cognitively intact adult"],
      abnormal: ["Present grasp reflex → suggests frontal lobe dysfunction (dementia, frontal lobe lesion, diffuse cerebral pathology)", "Present palmomental reflex → supportive but less specific, can occur as a normal variant in some older adults"],
      note: "Interpret alongside the rest of the cognitive/mental status exam — an isolated palmomental reflex in an otherwise cognitively intact patient is low-yield, but a present grasp reflex plus cognitive impairment is a more meaningful combination.",
    },
  },

  mocaMmse: {
    title: "Cognitive Screening (MMSE / MoCA)",
    icon: "🧩",
    category: "Learn · Neuro · Mental Status",
    perform: {
      images: [img("n_moca_mmse"), img("n_moca_mmse_2"), img("n_moca_mmse_3")],
      caption: "Standardised, scored questionnaire — administered exactly as written, not adapted on the fly",
      boxes: [
        { tone: "", label: "👤 Position", text: "Quiet room, minimal distraction, patient seated comfortably with their glasses/hearing aids in place if used." },
        { tone: "blue", label: "🖐️ Technique", text: "Administer the standardised MMSE (30 points: orientation, registration, attention/calculation, recall, language) or MoCA (30 points: adds executive function, visuospatial, and a clock-drawing task, more sensitive to mild cognitive impairment) exactly per the published instrument — don't paraphrase or skip items." },
        { tone: "purple", label: "🩺 Special consideration", text: "Both are screening tools, not diagnostic instruments — always adjust interpretation for the patient's education level and first language, both of which meaningfully shift the expected score." },
        { tone: "amber", label: "⚠️ Tip", text: "Use the SAME instrument on repeat testing for a given patient wherever possible — MMSE and MoCA scores are not directly interchangeable, so switching between them mid-episode-of-care makes trend-tracking unreliable." },
      ],
    },
    scaleLabel: "Score bands",
    scale: { type: "table", rows: [
      { k: "MMSE ≥25/30", v: "Normal" },
      { k: "MMSE 21–24/30", v: "Mild impairment" },
      { k: "MMSE 10–20/30", v: "Moderate impairment" },
      { k: "MMSE <10/30", v: "Severe impairment" },
      { k: "MoCA ≥26/30", v: "Normal (add 1 point if ≤12 years education)" },
    ]},
    interpret: {
      normal: ["MMSE ≥25/30 or MoCA ≥26/30, adjusted for education"],
      abnormal: ["Below the normal cutoff → correlate with functional observations and consider referral for formal neuropsychological assessment if not already screened medically"],
      note: "A single low score is a prompt to look closer, not a diagnosis — document the actual score and instrument used every time, not just a global 'cognitively impaired' label.",
    },
  },
};

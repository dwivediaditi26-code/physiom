// Cardiovascular Assessment Library — Final V1
// Matches the user's 30-card recommended structure (Basic exam, Auscultation
// by site, Peripheral vascular, Exercise response, Functional capacity)
// plus 6 additional cards kept from the earlier build (Pulse Pressure,
// Clubbing, Homans'/DVT, ABI, Allen's Test, NYHA).
// This file REPLACES the earlier cardiovascularData.js — same schema.
//
// Deferred to a later "+ Add Cardiovascular Assessment" batch (per the
// user's own phased plan): 2-Minute Walk Test, Incremental Shuttle Walk
// Test, Sit-to-Stand Test, Step Test, and the 3 Cardiac Rehab cards
// (pre-exercise / monitoring / recovery assessment).

const CLOUDINARY_BASE = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/";
const img = (id) => `${CLOUDINARY_BASE}${id}`;

export const cardiovascularData = {

  /* ===================== 1–10: BASIC EXAMINATION ===================== */

  heartRate: {
    title: "Heart Rate / Pulse Rate",
    icon: "❤️",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_heart_rate"), img("c_heart_rate_2"), img("c_heart_rate_3")],
      caption: "Radial or carotid pulse, index + middle finger",
      boxes: [
        { tone: "", label: "👤 Position", text: "Seated or supine, arm relaxed and fully supported — an unsupported arm raises the reading." },
        { tone: "blue", label: "🖐️ Technique", text: "Lightly palpate the radial or carotid pulse with your index and middle fingertip pads. Count for a full 60 seconds for the most accurate reading." },
        { tone: "purple", label: "🩺 Special consideration", text: "An apical pulse can be taken by placing a stethoscope at the 4th–5th intercostal space, midclavicular line — useful when a peripheral pulse is irregular or hard to palpate." },
        { tone: "amber", label: "⚠️ Tip", text: "Take heart rate before blood pressure in the same sitting — activity and anxiety transiently raise it." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Adult resting", v: "60–100 bpm" },
      { k: "Bradycardia", v: "<60 bpm (may be normal in trained athletes)" },
      { k: "Tachycardia", v: ">100 bpm" },
    ]},
    interpret: {
      normal: ["60–100 bpm at rest, regular rhythm", "Rate rises appropriately and predictably with activity"],
      abnormal: ["Resting tachycardia → anxiety, fever, anaemia, dehydration, or cardiac pathology", "Resting bradycardia → may be normal in athletes, or indicate conduction disease/medication effect"],
      redFlags: ["New, unexplained tachycardia at rest with chest pain or breathlessness", "Very slow rate (<40 bpm) with dizziness or fainting"],
      note: "A single resting value means little in isolation — trend it against activity and how the patient feels.",
    },
  },

  pulseRhythm: {
    title: "Pulse Rhythm",
    icon: "〰️",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_pulse_rhythm"), img("c_pulse_rhythm_2"), img("c_pulse_rhythm_3")],
      caption: "Palpate radial pulse, assess regularity over 30–60s",
      boxes: [
        { tone: "", label: "👤 Position", text: "Seated or supine, wrist relaxed and supported." },
        { tone: "blue", label: "🖐️ Technique", text: "Palpate the radial pulse and assess whether beats occur at regular intervals, or whether the rhythm is irregular, over at least 30 seconds." },
        { tone: "purple", label: "🩺 Special consideration", text: "An irregularly irregular rhythm (no discernible pattern) suggests atrial fibrillation; a regularly irregular rhythm (e.g. a dropped beat at a set interval) suggests a different arrhythmia — the pattern itself is diagnostic." },
        { tone: "amber", label: "⚠️ Tip", text: "If irregular, confirm with an apical pulse count via stethoscope — peripheral pulse can under-count true rate in AF due to a pulse deficit." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Regular", v: "Even spacing between beats" },
      { k: "Regularly irregular", v: "Irregular but follows a repeating pattern" },
      { k: "Irregularly irregular", v: "No discernible pattern — classic for AF" },
    ]},
    interpret: {
      normal: ["Regular rhythm with even spacing between beats"],
      abnormal: ["Regularly irregular → consider ectopic beats or 2nd-degree heart block", "Irregularly irregular → strongly suggests atrial fibrillation"],
      redFlags: ["New irregular rhythm with chest pain, dizziness, or breathlessness — needs prompt medical review"],
      note: "Document the pattern, not just 'irregular' — the type of irregularity narrows the likely cause considerably.",
    },
  },

  pulseVolume: {
    title: "Pulse Volume / Amplitude",
    icon: "📶",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_pulse_volume"), img("c_pulse_volume_2"), img("c_pulse_volume_3")],
      caption: "Assess force of each beat, compare sides",
      boxes: [
        { tone: "", label: "👤 Position", text: "Limb relaxed and supported, palpating the pulse point with light-to-moderate pressure." },
        { tone: "blue", label: "🖐️ Technique", text: "Note the force of the pulse under your fingertips at each beat — how easily it's felt and how much pressure is needed to obliterate it — comparing side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "Pulsus alternans (alternating strong/weak beats) or pulsus paradoxus (marked weakening on inspiration) are specific patterns worth naming separately from a simply 'weak' pulse." },
        { tone: "amber", label: "⚠️ Tip", text: "Grade amplitude consistently 0–4+ so a change is genuinely comparable across visits." },
      ],
    },
    scaleLabel: "Amplitude",
    scale: { type: "meter", rows: [
      { chip: "0", color: "#E9484B", name: "Absent", desc: "Not palpable" },
      { chip: "1+", color: "#F59E0B", name: "Diminished", desc: "Weak, thready" },
      { chip: "2+", color: "#16A34A", name: "Normal", desc: "Easily palpable" },
      { chip: "3+", color: "#F59E0B", name: "Full / increased", desc: "Stronger than expected" },
      { chip: "4+", color: "#E9484B", name: "Bounding", desc: "Hyperdynamic circulation" },
    ]},
    interpret: {
      normal: ["2+ amplitude, symmetrical bilaterally"],
      abnormal: ["Reduced amplitude → lower stroke volume or arterial narrowing proximally", "Bounding → high-output states or aortic regurgitation", "Pulsus alternans → often a marker of significant LV dysfunction"],
      redFlags: ["Pulsus paradoxus >10 mmHg → consider cardiac tamponade or a severe asthma/COPD exacerbation, urgent review"],
      note: "Amplitude reflects stroke volume and arterial compliance — always compare to the contralateral side.",
    },
  },

  pulses: {
    title: "Peripheral Pulse Palpation",
    icon: "💓",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_pulses"), img("c_pulses_2"), img("c_pulses_3")],
      caption: "Radial · brachial · carotid · femoral · popliteal · pedal",
      boxes: [
        { tone: "", label: "👤 Position", text: "Supine or seated, room warm, limb relaxed and fully supported so muscle tension doesn't mask the pulse." },
        { tone: "blue", label: "🖐️ Technique", text: "Palpate each point with index + middle fingertips: radial, brachial, carotid, femoral, popliteal, posterior tibial, dorsalis pedis. Compare right vs left at each site." },
        { tone: "purple", label: "🩺 Special consideration", text: "Popliteal and pedal pulses are normally harder to feel — pedal pulses are naturally absent in roughly 1 in 8 healthy people. Confirm with a handheld Doppler before documenting 'absent'." },
        { tone: "amber", label: "⚠️ Tip", text: "Never palpate both carotid pulses at the same time — bilateral compression can reduce cerebral blood flow." },
      ],
    },
    scaleLabel: "Sites checked",
    scale: { type: "table", rows: [
      { k: "Upper limb", v: "Radial, brachial" },
      { k: "Central", v: "Carotid" },
      { k: "Lower limb", v: "Femoral, popliteal, posterior tibial, dorsalis pedis" },
    ]},
    interpret: {
      normal: ["All sites palpable and symmetrical, rate 60–100 bpm"],
      abnormal: ["Absent/diminished at one site → arterial occlusive disease along that limb, refer for vascular assessment"],
      redFlags: ["Sudden absence of a previously present pulse with a cold, pale, painful limb — acute limb ischaemia, medical emergency"],
      note: "Use the Pulse Rhythm and Pulse Volume cards for rate/rhythm/amplitude detail — this card is about site-by-site technique.",
    },
  },

  bloodPressure: {
    title: "Blood Pressure",
    icon: "🩸",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_bp"), img("c_bp_2"), img("c_bp_3")],
      caption: "Cuff at heart level, mid-bladder over brachial artery",
      boxes: [
        { tone: "", label: "👤 Position", text: "Seated with legs uncrossed, arm fully exposed and supported at heart level, after a minimum 5-minute rest." },
        { tone: "blue", label: "🖐️ Technique", text: "Locate the brachial artery in the antecubital fossa. Position the cuff so the bladder midpoint sits over the artery, 2–3 cm above the crease." },
        { tone: "purple", label: "🩺 Special consideration", text: "Measure both arms on the first visit to screen for aortic coarctation or upper-limb arterial obstruction; record the higher reading going forward." },
        { tone: "amber", label: "⚠️ Tip", text: "A cuff that's too small overestimates BP; too large underestimates it — match cuff size to arm circumference." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "<120/80 mmHg" },
      { k: "Elevated", v: "120–129 / <80 mmHg" },
      { k: "Stage 1 hypertension", v: "130–139 / 80–89 mmHg" },
      { k: "Stage 2 hypertension", v: "≥140/90 mmHg" },
      { k: "Hypotension", v: "<90/60 mmHg (context-dependent)" },
    ]},
    interpret: {
      normal: ["Consistent readings <120/80 mmHg across repeated measures"],
      abnormal: ["Sustained elevation → hypertension, needs medical management alongside exercise prescription", "Consistently low + symptomatic → may limit safe exercise intensity"],
      redFlags: ["Severely elevated BP (≥180/120 mmHg) with headache, chest pain, or visual changes — urgent referral", "Symptomatic hypotension with dizziness/fainting during activity"],
      note: "A single office reading is a snapshot, not a diagnosis — trend it across visits.",
    },
  },

  orthostatic: {
    title: "Orthostatic Blood Pressure",
    icon: "🧍",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_orthostatic"), img("c_orthostatic_2"), img("c_orthostatic_3")],
      caption: "Supine → standing, measured at set intervals",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine for at least 5 minutes, then stands. Have a chair ready and stay close in case of dizziness." },
        { tone: "blue", label: "🖐️ Technique", text: "Measure BP and HR while supine, then again at 1 minute and 3 minutes after standing. Ask about symptoms at each stage." },
        { tone: "purple", label: "🩺 Special consideration", text: "Medications such as antihypertensives, diuretics, and some antidepressants increase orthostatic risk — check the medication list before testing." },
        { tone: "amber", label: "⚠️ Tip", text: "Stand close enough to catch the patient if they become unsteady." },
      ],
    },
    scaleLabel: "Diagnostic criteria",
    scale: { type: "table", rows: [
      { k: "Positive test", v: "Systolic drop ≥20 mmHg or diastolic drop ≥10 mmHg within 3 min of standing" },
      { k: "Compensatory response", v: "HR typically rises somewhat on standing" },
      { k: "Symptoms", v: "Dizziness, light-headedness, visual dimming, near-syncope" },
    ]},
    interpret: {
      normal: ["BP drop within normal limits, HR compensates appropriately, no symptoms"],
      abnormal: ["Significant BP drop with symptoms → orthostatic hypotension, affects transfers/gait/exercise Rx", "Little HR compensation despite a large drop → possible autonomic dysfunction"],
      redFlags: ["Near-syncope or actual loss of consciousness on standing — stop testing, keep the patient safe"],
      note: "Positive testing directly changes your treatment plan — build in seated-to-standing transitions and monitor closely.",
    },
  },

  capRefill: {
    title: "Capillary Refill",
    icon: "⏱️",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_cap_refill"), img("c_cap_refill_2"), img("c_cap_refill_3")],
      caption: "Press nail bed, release, time the colour return",
      boxes: [
        { tone: "", label: "👤 Position", text: "Hand at heart level, room at a comfortable temperature — cold hands falsely prolong refill time." },
        { tone: "blue", label: "🖐️ Technique", text: "Press firmly on a fingertip or nail bed for about 5 seconds until it blanches, then release and time colour return." },
        { tone: "purple", label: "🩺 Special consideration", text: "Can also be assessed on toes for lower-limb perfusion, and is a quick adjunct when a pedal pulse is difficult to palpate." },
        { tone: "amber", label: "⚠️ Tip", text: "Compare both hands/feet — asymmetry is often more meaningful than the absolute time." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "≤2 seconds (adults)" },
      { k: "Delayed", v: ">2–3 seconds — reduced peripheral perfusion" },
      { k: "Markedly delayed", v: ">4 seconds — significant perfusion concern" },
    ]},
    interpret: {
      normal: ["Colour returns within 2 seconds, symmetrical both sides"],
      abnormal: ["Delayed refill → reduced peripheral perfusion — dehydration, hypothermia, shock, or arterial insufficiency"],
      redFlags: ["Markedly delayed refill in a cold, pale, painful limb — possible acute limb ischaemia, urgent referral"],
      note: "Ambient temperature strongly affects this test — interpret alongside limb warmth and colour, not alone.",
    },
  },

  edema: {
    title: "Peripheral Edema / Pitting Edema",
    icon: "🦶",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_edema"), img("c_edema_2"), img("c_edema_3")],
      caption: "Press firmly over the tibia or sacrum for ~5 seconds",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated, ankles and lower legs exposed; check the sacrum in bed-bound patients." },
        { tone: "blue", label: "🖐️ Technique", text: "Press firmly with a thumb over the anterior tibia (or sacrum) for about 5 seconds, release, and observe whether a pit remains and how long it resolves." },
        { tone: "purple", label: "🩺 Special consideration", text: "Edema may also come from a low albumin level, impaired venous/lymphatic drainage, or high-dose steroids — check whether it's unilateral (local cause) or bilateral (systemic)." },
        { tone: "amber", label: "⚠️ Tip", text: "In bed-bound patients, edema often pools at the sacrum rather than the ankles — check both." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "meter", rows: [
      { chip: "1+", color: "#16A34A", name: "Trace", desc: "Barely detectable pit, resolves almost immediately" },
      { chip: "2+", color: "#F59E0B", name: "Mild", desc: "Pit resolves within ~15 seconds" },
      { chip: "3+", color: "#F59E0B", name: "Moderate", desc: "Pit resolves within ~30 seconds" },
      { chip: "4+", color: "#E9484B", name: "Severe", desc: "Deep pit lasting >30 seconds" },
    ]},
    interpret: {
      normal: ["No pitting on firm sustained pressure"],
      abnormal: ["Bilateral edema → systemic cause, e.g. cardiac, renal, or hepatic", "Unilateral edema → local cause, e.g. DVT, venous insufficiency"],
      redFlags: ["New unilateral leg swelling with calf pain/warmth — possible DVT, do not massage, escalate"],
      note: "Unilateral swelling should never be treated as routine cardiac edema until DVT has been reasonably excluded.",
    },
  },

  jvp: {
    title: "Jugular Venous Pressure",
    icon: "🫀",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_jvp"), img("c_jvp_2"), img("c_jvp_3")],
      caption: "Reclined 45°, head turned slightly away, good light",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient reclined at 45°, head turned slightly away, neck relaxed and well lit." },
        { tone: "blue", label: "🖐️ Technique", text: "Identify the internal jugular vein's flickering, biphasic pulsation lateral to sternocleidomastoid. Measure the vertical height above the sternal angle." },
        { tone: "purple", label: "🩺 Special consideration", text: "JVP is a vertical height, not a diagonal distance along the neck — a common measurement error." },
        { tone: "amber", label: "⚠️ Tip", text: "Distinguish from the carotid pulse: JVP isn't palpable, has a double flicker, and changes with position." },
      ],
    },
    scaleLabel: "Range",
    scale: { type: "table", rows: [
      { k: "Normal", v: "3–4 cm above the sternal angle at 45°" },
      { k: "Elevated", v: "Suggests right heart strain or fluid overload" },
      { k: "Flat (only visible supine)", v: "May suggest volume depletion" },
    ]},
    interpret: {
      normal: ["Visible only at the base of the neck when reclined ~45°", "Height roughly 3–4 cm above the sternal angle"],
      abnormal: ["Elevated JVP → right heart failure, fluid overload, tricuspid regurgitation, or cor pulmonale"],
      redFlags: ["Markedly elevated JVP with edema, breathlessness, and crackles — decompensated heart failure, needs prompt review"],
      note: "Always correlate JVP with peripheral edema and lung auscultation before concluding fluid overload.",
    },
  },

  cardiacAuscultation: {
    title: "Cardiac Auscultation (Overview)",
    icon: "🩺",
    category: "Learn · Cardiovascular · Basic Examination",
    perform: {
      images: [img("c_ausc_overview"), img("c_ausc_overview_2"), img("c_ausc_overview_3")],
      caption: "All four areas, diaphragm and bell, systematic sequence",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated, chest exposed, quiet room. Left lateral brings out mitral sounds; leaning forward brings out aortic sounds." },
        { tone: "blue", label: "🖐️ Technique", text: "Work through the four classic areas — aortic, pulmonic, tricuspid, mitral — in sequence with both the diaphragm and the bell, listening through a full breath cycle at each." },
        { tone: "purple", label: "🩺 Special consideration", text: "This card is the general survey — use the four site-specific cards (Aortic, Pulmonary, Tricuspid, Mitral) for detailed technique at each point, and the S1/S2 and Additional Heart Sounds cards for sound-specific interpretation." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask the patient to briefly hold their breath in expiration when a sound is unclear — this reduces lung-sound interference." },
      ],
    },
    scaleLabel: "The 4 areas",
    scale: { type: "table", rows: [
      { k: "Aortic", v: "2nd right intercostal space" },
      { k: "Pulmonic", v: "2nd left intercostal space" },
      { k: "Tricuspid", v: "Lower left sternal border" },
      { k: "Mitral", v: "5th left intercostal space, midclavicular line" },
    ]},
    interpret: {
      normal: ["Clear S1 and S2 at all four areas, no added sounds or murmurs"],
      abnormal: ["Any added sound or murmur → follow up with the relevant site-specific card for detailed interpretation"],
      redFlags: ["New murmur or added sound with chest pain, breathlessness, or instability — needs prompt medical assessment"],
      note: "Use this card as your entry point, then drill into the specific area or sound cards for detail.",
    },
  },

  /* ===================== 11–17: AUSCULTATION BY SITE / SOUND ===================== */

  aorticArea: {
    title: "Auscultation — Aortic Area",
    icon: "🅰️",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_ausc_aortic"), img("c_ausc_aortic_2"), img("c_ausc_aortic_3")],
      caption: "2nd right intercostal space, sternal border",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated, sometimes leaning forward in expiration to bring the area closer to the chest wall." },
        { tone: "blue", label: "🖐️ Technique", text: "Place the diaphragm at the 2nd right intercostal space, just lateral to the sternum, and listen through a full cycle." },
        { tone: "purple", label: "🩺 Special consideration", text: "This is the classic listening point for aortic stenosis murmurs, which often radiate up into the carotid arteries — check there too if a murmur is heard." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask the patient to briefly hold their breath in expiration for the clearest sound." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Clear S2 (A2 component), no murmur" },
      { k: "Abnormal", v: "Systolic murmur radiating to the carotids — consider aortic stenosis" },
    ]},
    interpret: {
      normal: ["Clear heart sounds, no murmur at this site"],
      abnormal: ["Systolic ejection murmur radiating to the carotids → suggests aortic stenosis, refer for further evaluation"],
      note: "Correlate any finding here with the Murmur Assessment card for full grading and description.",
    },
  },

  pulmonaryArea: {
    title: "Auscultation — Pulmonary Area",
    icon: "🅿️",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_ausc_pulmonary"), img("c_ausc_pulmonary_2"), img("c_ausc_pulmonary_3")],
      caption: "2nd left intercostal space, sternal border",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated." },
        { tone: "blue", label: "🖐️ Technique", text: "Place the diaphragm at the 2nd left intercostal space, just lateral to the sternum." },
        { tone: "purple", label: "🩺 Special consideration", text: "A physiological split S2 (P2 slightly after A2) that widens with inspiration is normal, especially in younger patients — don't mistake it for an abnormal added sound." },
        { tone: "amber", label: "⚠️ Tip", text: "Compare P2 intensity to A2 — a loud P2 can suggest pulmonary hypertension." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Clear S2, physiological split with inspiration" },
      { k: "Abnormal", v: "Fixed/widely split S2, loud P2, or a murmur" },
    ]},
    interpret: {
      normal: ["Clear S2 with a normal, inspiration-varying split"],
      abnormal: ["Fixed split S2 → consider atrial septal defect", "Loud P2 → consider pulmonary hypertension"],
      note: "Correlate with the Murmur Assessment card if a murmur is present at this site.",
    },
  },

  tricuspidArea: {
    title: "Auscultation — Tricuspid Area",
    icon: "🅃",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_ausc_tricuspid"), img("c_ausc_tricuspid_2"), img("c_ausc_tricuspid_3")],
      caption: "Lower left sternal border, 4th–5th ICS",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated." },
        { tone: "blue", label: "🖐️ Technique", text: "Place the diaphragm at the lower left sternal border, around the 4th–5th intercostal space." },
        { tone: "purple", label: "🩺 Special consideration", text: "Tricuspid murmurs classically increase in intensity with inspiration (Carvallo's sign) — a useful way to distinguish them from nearby mitral murmurs." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask the patient to take a deep breath in and hold briefly while you listen, to check for this inspiratory change." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Clear S1/S2, no murmur" },
      { k: "Abnormal", v: "Pansystolic murmur increasing with inspiration — tricuspid regurgitation" },
    ]},
    interpret: {
      normal: ["Clear heart sounds, no murmur at this site"],
      abnormal: ["Murmur increasing with inspiration → suggests tricuspid regurgitation"],
      note: "Correlate with elevated JVP and peripheral edema if tricuspid regurgitation is suspected.",
    },
  },

  mitralArea: {
    title: "Auscultation — Mitral Area",
    icon: "🅼",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_ausc_mitral"), img("c_ausc_mitral_2"), img("c_ausc_mitral_3")],
      caption: "5th left ICS, midclavicular line (apex)",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine, or left lateral decubitus to bring the apex closer to the chest wall." },
        { tone: "blue", label: "🖐️ Technique", text: "Place the diaphragm (and bell, lightly, for low-pitched sounds) at the apex — 5th left intercostal space, midclavicular line." },
        { tone: "purple", label: "🩺 Special consideration", text: "This is the best site to hear S3 and S4, and mitral murmurs — use the bell specifically for these lower-pitched sounds." },
        { tone: "amber", label: "⚠️ Tip", text: "Left lateral positioning brings the apex closer to the chest wall and often makes subtle findings clearer." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Clear S1/S2, no added sounds or murmur" },
      { k: "Abnormal", v: "Pansystolic murmur radiating to axilla — mitral regurgitation" },
    ]},
    interpret: {
      normal: ["Clear heart sounds at the apex, no added sounds or murmur"],
      abnormal: ["Murmur radiating to the axilla → suggests mitral regurgitation", "S3 at the apex in an adult → consider heart failure"],
      note: "The apex is the most sensitive site for S3/S4 — always include it even if other areas sound clear.",
    },
  },

  s1s2: {
    title: "S1 / S2 Assessment",
    icon: "1️⃣",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_s1s2"), img("c_s1s2_2"), img("c_s1s2_3")],
      caption: "Identify and characterize the two primary heart sounds",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or seated, chest exposed, quiet room." },
        { tone: "blue", label: "🖐️ Technique", text: "Identify S1 (marks systole start) and S2 (marks diastole start); note their relative intensity, and whether either is split." },
        { tone: "purple", label: "🩺 Special consideration", text: "Use the carotid pulse as a timing reference if S1 vs S2 is hard to distinguish — S1 coincides with the pulse upstroke." },
        { tone: "amber", label: "⚠️ Tip", text: "Loud S1 can suggest mitral stenosis or a hyperdynamic circulation; soft S1 can suggest a long PR interval or poor contractility." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Clear S1 and S2, appropriate relative intensity" },
      { k: "Abnormal", v: "Loud/soft S1, widely split or fixed S2" },
    ]},
    interpret: {
      normal: ["Both sounds clear, S1 louder at the apex, S2 louder at the base"],
      abnormal: ["Loud S1 → mitral stenosis or hyperdynamic state", "Soft S1 → prolonged PR interval or reduced contractility", "Fixed split S2 → consider atrial septal defect"],
      note: "S1/S2 characteristics are often subtle — repeated practice listening to normal hearts builds the baseline needed to spot deviations.",
    },
  },

  additionalHeartSounds: {
    title: "Additional Heart Sounds (S3 / S4)",
    icon: "3️⃣",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_s3s4"), img("c_s3s4_2"), img("c_s3s4_3")],
      caption: "Bell, lightly applied, at the apex",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine or left lateral decubitus, apex exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Apply the bell lightly at the apex and listen specifically for a third sound after S2 (S3) or a fourth sound before S1 (S4)." },
        { tone: "purple", label: "🩺 Special consideration", text: "S3 in a young, healthy adult (especially under ~30–40) can be a normal physiological finding — always interpret in the context of age and other findings." },
        { tone: "amber", label: "⚠️ Tip", text: "Left lateral positioning and light bell pressure both make these quiet, low-pitched sounds easier to detect." },
      ],
    },
    scaleLabel: "Sounds",
    scale: { type: "meter", rows: [
      { chip: "S3", color: "#F59E0B", name: "Rapid filling sound", desc: "May be normal in youth; suggests failure in older adults" },
      { chip: "S4", color: "#F59E0B", name: "Atrial kick sound", desc: "Suggests a stiff or hypertrophied ventricle" },
    ]},
    interpret: {
      normal: ["No S3 or S4 present (or a physiological S3 in a young, otherwise well patient)"],
      abnormal: ["New S3 in an older adult → suggests heart failure", "S4 → suggests hypertension, aortic stenosis, or hypertrophic cardiomyopathy"],
      note: "Always interpret S3/S4 alongside age, other exam findings, and any known cardiac history.",
    },
  },

  murmurs: {
    title: "Murmur Assessment",
    icon: "🔊",
    category: "Learn · Cardiovascular · Auscultation",
    perform: {
      images: [img("c_murmur"), img("c_murmur_2"), img("c_murmur_3")],
      caption: "Timing, location, radiation, and grade",
      boxes: [
        { tone: "", label: "👤 Position", text: "Same setup as heart sound auscultation — supine/seated, plus left lateral and leaning-forward positions if needed." },
        { tone: "blue", label: "🖐️ Technique", text: "Note timing (systolic vs diastolic), location of maximum intensity, radiation, and grade using the standard 1–6 scale." },
        { tone: "purple", label: "🩺 Special consideration", text: "A murmur of valvular incompetence is caused by backward flow across the valve; a murmur from a stenotic valve is caused by turbulent forward flow through a narrowed opening." },
        { tone: "amber", label: "⚠️ Tip", text: "Radiation direction is a useful clue — aortic stenosis classically radiates to the carotids, mitral regurgitation to the axilla." },
      ],
    },
    scaleLabel: "Grading",
    scale: { type: "meter", rows: [
      { chip: "I", color: "#16A34A", name: "Barely audible", desc: "Only heard with special effort" },
      { chip: "II", color: "#16A34A", name: "Faint", desc: "Heard immediately but quiet" },
      { chip: "III", color: "#F59E0B", name: "Moderate", desc: "Clearly audible, no thrill" },
      { chip: "IV", color: "#F59E0B", name: "Loud", desc: "Palpable thrill" },
      { chip: "V", color: "#E9484B", name: "Very loud", desc: "Stethoscope edge barely touching" },
      { chip: "VI", color: "#E9484B", name: "Audible without stethoscope", desc: "Heard just off the chest" },
    ]},
    interpret: {
      normal: ["No murmur; or a soft, innocent flow murmur with no other abnormal findings"],
      abnormal: ["Diastolic murmurs are generally pathological", "Systolic murmurs grade III+ with a thrill warrant evaluation"],
      redFlags: ["New murmur with syncope, chest pain, or signs of heart failure — refer promptly"],
      note: "Your role is accurate, reproducible description — let the referring physician make the diagnosis.",
    },
  },

  /* ===================== 18–22: PERIPHERAL VASCULAR ===================== */

  skinColour: {
    title: "Skin Colour",
    icon: "🎨",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_skin_colour"), img("c_skin_colour_2"), img("c_skin_colour_3")],
      caption: "Inspect limbs, compare both sides",
      boxes: [
        { tone: "", label: "👤 Position", text: "Limbs exposed, good natural or white lighting." },
        { tone: "blue", label: "🖐️ Technique", text: "Visually inspect skin colour of both limbs — pink, pale, red, mottled, or cyanotic — comparing side to side and proximal to distal." },
        { tone: "purple", label: "🩺 Special consideration", text: "Dependent rubor (redness when the limb hangs down that pales on elevation) is a specific sign of significant arterial insufficiency, distinct from simple pallor." },
        { tone: "amber", label: "⚠️ Tip", text: "Assess in good lighting — colour changes can be subtle and easy to miss under poor lighting." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Pink, symmetrical both sides" },
      { k: "Pale", v: "Reduced arterial perfusion" },
      { k: "Mottled", v: "Poor perfusion, often systemic" },
      { k: "Dependent rubor", v: "Redness when dependent, pales on elevation" },
    ]},
    interpret: {
      normal: ["Pink, symmetrical colour throughout"],
      abnormal: ["Pale or mottled → reduced perfusion, correlate with pulses and temperature", "Dependent rubor → significant arterial insufficiency"],
      note: "Skin colour findings mean little in isolation — always cross-check with temperature, pulses, and capillary refill.",
    },
  },

  skinTemperature: {
    title: "Skin Temperature",
    icon: "🌡️",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_skin_temp"), img("c_skin_temp_2"), img("c_skin_temp_3")],
      caption: "Back of hand, proximal to distal, both sides",
      boxes: [
        { tone: "", label: "👤 Position", text: "Limbs exposed, room at a comfortable ambient temperature." },
        { tone: "blue", label: "🖐️ Technique", text: "Use the back of your hand (more temperature-sensitive than the palm) to compare warmth proximally to distally and side to side." },
        { tone: "purple", label: "🩺 Special consideration", text: "A sharp temperature 'cut-off' at a specific level on the limb can help localize the level of an arterial occlusion." },
        { tone: "amber", label: "⚠️ Tip", text: "Warm your hands first — cold examiner hands make accurate comparison difficult." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "Warm, symmetrical both sides" },
      { k: "Cool", v: "Reduced arterial perfusion" },
      { k: "Cool with a clear cut-off", v: "May localize the level of arterial occlusion" },
    ]},
    interpret: {
      normal: ["Warm, symmetrical temperature throughout both limbs"],
      abnormal: ["Cool limb → reduced arterial flow", "Asymmetric temperature → localized vascular problem on the cooler side"],
      redFlags: ["Sudden onset cold limb with pain and pallor — possible acute limb ischaemia"],
      note: "Temperature findings are most useful combined with pulses and capillary refill, not read alone.",
    },
  },

  peripheralPerfusion: {
    title: "Peripheral Perfusion (Overview)",
    icon: "🩸",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_perfusion"), img("c_perfusion_2"), img("c_perfusion_3")],
      caption: "Combine colour, temperature, pulses, and refill",
      boxes: [
        { tone: "", label: "👤 Position", text: "Limbs exposed, comfortable ambient room temperature." },
        { tone: "blue", label: "🖐️ Technique", text: "Bring together the findings from skin colour, skin temperature, capillary refill, and pulse palpation into one overall perfusion picture for the limb." },
        { tone: "purple", label: "🩺 Special consideration", text: "No single sign reliably confirms good or poor perfusion alone — it's the pattern across all four checks that's clinically meaningful." },
        { tone: "amber", label: "⚠️ Tip", text: "Document as a summary statement (e.g. 'warm, pink, brisk refill, pulses 2+ throughout') rather than scattering the findings across the note." },
      ],
    },
    scaleLabel: "Overall picture",
    scale: { type: "table", rows: [
      { k: "Good perfusion", v: "Warm, pink, refill <2s, pulses palpable" },
      { k: "Reduced perfusion", v: "Cool, pale, delayed refill, weak/absent pulses" },
      { k: "Critical perfusion", v: "Cold, mottled/dusky, no refill, no palpable pulse" },
    ]},
    interpret: {
      normal: ["Warm, pink, brisk capillary refill, palpable pulses — good overall perfusion"],
      abnormal: ["Any combination of cool, pale, delayed refill, or reduced pulses → reduced perfusion, investigate the cause"],
      redFlags: ["Cold, mottled or dusky limb with no palpable pulse and no capillary refill — acute limb ischaemia, medical emergency"],
      note: "This card is a synthesis — perform the individual checks first (colour, temperature, refill, pulses), then summarise here.",
    },
  },

  limbSymmetry: {
    title: "Limb Symmetry",
    icon: "⚖️",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_limb_symmetry"), img("c_limb_symmetry_2"), img("c_limb_symmetry_3")],
      caption: "Compare circumference, colour, temperature side to side",
      boxes: [
        { tone: "", label: "👤 Position", text: "Both limbs exposed and positioned identically for a fair comparison." },
        { tone: "blue", label: "🖐️ Technique", text: "Compare both limbs for differences in size, colour, temperature, and swelling; measure circumference at a consistent landmark if a difference is suspected." },
        { tone: "purple", label: "🩺 Special consideration", text: "New unilateral swelling is a different clinical concern (e.g. DVT) than longstanding bilateral changes (e.g. chronic venous or cardiac causes)." },
        { tone: "amber", label: "⚠️ Tip", text: "Measure circumference at a fixed distance from a bony landmark (e.g. 10cm below the tibial tuberosity) for reproducible tracking." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Symmetrical", v: "No meaningful difference between limbs" },
      { k: "Asymmetrical", v: "Difference in size, colour, or temperature between sides" },
    ]},
    interpret: {
      normal: ["Limbs symmetrical in size, colour, and temperature"],
      abnormal: ["New unilateral swelling/asymmetry → consider DVT or localized pathology", "Longstanding bilateral changes → consider a systemic cause"],
      redFlags: ["New unilateral leg swelling with pain and warmth — possible DVT, refer promptly"],
      note: "Measure at a consistent landmark if tracking a circumference difference over time.",
    },
  },

  peripheralVascularInspection: {
    title: "Peripheral Vascular Inspection",
    icon: "🔍",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_pv_inspection"), img("c_pv_inspection_2"), img("c_pv_inspection_3")],
      caption: "General visual survey of the limbs",
      boxes: [
        { tone: "", label: "👤 Position", text: "Limbs fully exposed, good lighting, patient standing if assessing for varicosities." },
        { tone: "blue", label: "🖐️ Technique", text: "Visually survey for varicose veins, hair loss pattern, skin thinning or shininess, ulcers, scars, and trophic changes." },
        { tone: "purple", label: "🩺 Special consideration", text: "Ulcer location is informative — arterial ulcers typically occur over pressure points/toes and are painful; venous ulcers typically occur over the medial malleolus and are less painful." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask about any wounds that haven't healed as expected — patients don't always volunteer this unprompted." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Normal", v: "No varicosities, ulcers, or trophic changes" },
      { k: "Arterial changes", v: "Hair loss, shiny thin skin, painful distal ulcers" },
      { k: "Venous changes", v: "Varicosities, pigmentation, less painful medial malleolar ulcers" },
    ]},
    interpret: {
      normal: ["No varicosities, ulcers, or significant trophic skin changes"],
      abnormal: ["Signs of arterial insufficiency → hair loss, shiny skin, painful distal ulcers", "Signs of venous insufficiency → varicosities, pigmentation, medial ulcers"],
      note: "This general survey often flags a chronic vascular issue that pulses and capillary refill alone might miss.",
    },
  },

  /* ===================== 23–29: EXERCISE / CV RESPONSE ===================== */

  restingCVResponse: {
    title: "Resting Cardiovascular Response",
    icon: "🛋️",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_resting_response"), img("c_resting_response_2"), img("c_resting_response_3")],
      caption: "Baseline HR, BP, SpO₂ before starting exercise",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated and rested for at least 5 minutes before measuring." },
        { tone: "blue", label: "🖐️ Technique", text: "Record resting HR, BP, SpO₂, and any symptoms before beginning an exercise session, to establish a safe starting baseline." },
        { tone: "purple", label: "🩺 Special consideration", text: "Compare today's resting values against the patient's own recent baseline, not just population norms — a change from their usual is often more informative than the absolute number." },
        { tone: "amber", label: "⚠️ Tip", text: "If resting values are outside the patient's usual safe range, address this before starting activity rather than proceeding and monitoring." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "HR", v: "60–100 bpm (individualized ranges may apply)" },
      { k: "BP", v: "<140/90 mmHg generally acceptable, per local protocol" },
      { k: "SpO₂", v: "Within the patient's prescribed target range" },
    ]},
    interpret: {
      normal: ["Resting values within the patient's usual safe range for exercise"],
      abnormal: ["Resting values notably different from baseline → clarify before proceeding with planned intensity"],
      redFlags: ["Resting chest pain, marked hyper/hypotension, or arrhythmia symptoms — do not proceed with exercise, escalate"],
      note: "This is your go/no-go checkpoint before exercise — document it every session, not just at initial assessment.",
    },
  },

  exerciseHRResponse: {
    title: "Exercise Heart-Rate Response",
    icon: "📈",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_ex_hr"), img("c_ex_hr_2"), img("c_ex_hr_3")],
      caption: "Monitor HR through increasing workload",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient actively exercising, HR monitored continuously or at set intervals." },
        { tone: "blue", label: "🖐️ Technique", text: "Record HR at baseline and at regular intervals through the activity, tracking the trend as workload increases." },
        { tone: "purple", label: "🩺 Special consideration", text: "Compare the observed rise to age-predicted maximum HR and any prescribed target zone, factoring in rate-limiting medications like beta-blockers." },
        { tone: "amber", label: "⚠️ Tip", text: "Stop and reassess if HR rises much faster than expected for the workload, or fails to rise at all." },
      ],
    },
    scaleLabel: "Expected pattern",
    scale: { type: "table", rows: [
      { k: "Normal response", v: "HR rises progressively and proportionally with workload" },
      { k: "Chronotropic incompetence", v: "HR fails to rise appropriately despite increasing workload" },
      { k: "Exaggerated response", v: "HR rises disproportionately for a low workload" },
    ]},
    interpret: {
      normal: ["HR rises progressively and proportionally, staying within the prescribed target zone"],
      abnormal: ["Chronotropic incompetence → may indicate conduction disease or medication effect", "Exaggerated rise for low workload → deconditioning or another limiting factor"],
      note: "Always check for rate-limiting medication before interpreting a blunted HR response as pathological.",
    },
  },

  exerciseBPResponse: {
    title: "Exercise Blood-Pressure Response",
    icon: "📉",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_ex_bp"), img("c_ex_bp_2"), img("c_ex_bp_3")],
      caption: "Monitor systolic/diastolic BP through workload",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient actively exercising, BP checked at rest and at set intervals or workload increments." },
        { tone: "blue", label: "🖐️ Technique", text: "Measure BP at baseline and intervals through activity; systolic should rise progressively while diastolic stays roughly stable or falls slightly." },
        { tone: "purple", label: "🩺 Special consideration", text: "Failure of systolic BP to rise, or an actual drop, with increasing workload is one of the more specific exercise red flags — often reflecting limited cardiac reserve." },
        { tone: "amber", label: "⚠️ Tip", text: "Take readings during brief pauses in dynamic exercise where possible — movement affects manual auscultation accuracy." },
      ],
    },
    scaleLabel: "Expected pattern",
    scale: { type: "table", rows: [
      { k: "Normal response", v: "Systolic BP rises progressively with workload" },
      { k: "Hypotensive response", v: "Systolic BP fails to rise or drops with increasing workload" },
      { k: "Hypertensive response", v: "Systolic BP rises excessively for the workload" },
    ]},
    interpret: {
      normal: ["Systolic BP rises appropriately with workload, diastolic stable or slightly reduced"],
      abnormal: ["Hypotensive response → concerning, may indicate limited cardiac reserve or ischaemia", "Hypertensive response → may need medical review before continuing higher intensity"],
      redFlags: ["Systolic BP drop ≥10 mmHg with increasing workload — stop exercise immediately"],
      note: "One of the most important stop-exercise indicators — know the threshold and act on it promptly.",
    },
  },

  hrRecovery: {
    title: "Heart-Rate Recovery",
    icon: "⏳",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_hr_recovery"), img("c_hr_recovery_2"), img("c_hr_recovery_3")],
      caption: "HR at 1 and 2 minutes after stopping exercise",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or lying quietly immediately after stopping exercise." },
        { tone: "blue", label: "🖐️ Technique", text: "Record HR immediately at the end of exercise, then again at 1 and 2 minutes into recovery; calculate the drop from peak at each interval." },
        { tone: "purple", label: "🩺 Special consideration", text: "Influenced by fitness level, autonomic function, and rate-limiting medications — interpret trends over time for an individual patient rather than a single fixed cut-off alone." },
        { tone: "amber", label: "⚠️ Tip", text: "Keep the patient seated and still during measurement — standing or moving slows the natural HR decline." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "HR drops ≥12 bpm from peak within 1 minute of stopping" },
      { k: "Blunted recovery", v: "HR drops <12 bpm within 1 minute — associated with higher CV risk" },
    ]},
    interpret: {
      normal: ["HR drops ≥12 bpm within the first minute of recovery"],
      abnormal: ["Blunted recovery (<12 bpm drop at 1 minute) → associated with increased cardiovascular risk, flag for medical review"],
      note: "Improving HR recovery over a rehab programme is a meaningful, trackable sign of improving cardiovascular fitness.",
    },
  },

  bpRecovery: {
    title: "Blood-Pressure Recovery",
    icon: "📊",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_bp_recovery"), img("c_bp_recovery_2"), img("c_bp_recovery_3")],
      caption: "BP at 1, 3, and 5 minutes after stopping exercise",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated quietly after stopping exercise." },
        { tone: "blue", label: "🖐️ Technique", text: "Measure BP immediately post-exercise, then again at set intervals until it trends back toward the resting baseline." },
        { tone: "purple", label: "🩺 Special consideration", text: "A BP that stays elevated well beyond the expected window, or drops excessively (post-exercise hypotension), both warrant closer attention." },
        { tone: "amber", label: "⚠️ Tip", text: "Keep monitoring symptoms (dizziness, nausea) during recovery, not just the numbers." },
      ],
    },
    scaleLabel: "Expected pattern",
    scale: { type: "table", rows: [
      { k: "Normal", v: "BP trends back toward resting baseline within a few minutes" },
      { k: "Delayed recovery", v: "BP remains significantly elevated well beyond expected" },
      { k: "Post-exercise hypotension", v: "BP drops notably below baseline during recovery" },
    ]},
    interpret: {
      normal: ["BP returns toward resting baseline within the expected recovery window"],
      abnormal: ["Delayed recovery → may warrant a longer cool-down or medical review", "Post-exercise hypotension → increased fall risk during recovery, monitor closely"],
      note: "Don't rush a patient to stand or leave immediately after exercise — allow BP to genuinely trend back before ending monitoring.",
    },
  },

  borgRPE: {
    title: "Borg RPE (Cardiovascular)",
    icon: "🎚️",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_borg_rpe"), img("c_borg_rpe_2"), img("c_borg_rpe_3")],
      caption: "6–20 or 0–10 scale shown during activity",
      boxes: [
        { tone: "", label: "👤 Position", text: "Used during or immediately after an exercise task." },
        { tone: "blue", label: "🖐️ Technique", text: "Show the patient the Borg scale (6–20 classic, or 0–10 modified) and ask them to point to the number matching overall perceived exertion right now." },
        { tone: "purple", label: "🩺 Special consideration", text: "Useful when HR response is unreliable (e.g. beta-blockers, pacemaker, arrhythmia) since perceived effort doesn't depend on an accurate HR reading." },
        { tone: "amber", label: "⚠️ Tip", text: "Use the same version of the scale consistently with a given patient so readings stay comparable across sessions." },
      ],
    },
    scaleLabel: "Scale (6–20)",
    scale: { type: "table", rows: [
      { k: "6–8", v: "No exertion at all" },
      { k: "11–12", v: "Light" },
      { k: "13–14", v: "Somewhat hard" },
      { k: "15–16", v: "Hard" },
      { k: "17–19", v: "Very hard" },
      { k: "20", v: "Maximal exertion" },
    ]},
    interpret: {
      normal: ["RPE appropriate for the prescribed intensity (typically 12–14 for moderate cardiac rehab intensity)"],
      abnormal: ["RPE much higher than expected for the workload → possible reduced cardiac reserve or another limiting factor"],
      note: "In patients on rate-limiting medication, RPE is often a more reliable intensity guide than heart rate alone.",
    },
  },

  dyspneaRating: {
    title: "Dyspnea Rating (Exercise)",
    icon: "💨",
    category: "Learn · Cardiovascular · Exercise Response",
    perform: {
      images: [img("c_dyspnea"), img("c_dyspnea_2"), img("c_dyspnea_3")],
      caption: "0–10 breathlessness scale during activity",
      boxes: [
        { tone: "", label: "👤 Position", text: "Used during or immediately after an exercise task." },
        { tone: "blue", label: "🖐️ Technique", text: "Show the patient a 0–10 breathlessness scale and ask them to rate current shortness of breath at a consistent point in the task." },
        { tone: "purple", label: "🩺 Special consideration", text: "Dyspnea and general exertion (RPE) can diverge — a patient may report high breathlessness with relatively low overall exertion, or vice versa; this split is itself clinically informative." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask both RPE and dyspnea rating separately rather than assuming they'll match — they often don't." },
      ],
    },
    scaleLabel: "Scale",
    scale: { type: "table", rows: [
      { k: "0", v: "No breathlessness at all" },
      { k: "3", v: "Moderate breathlessness" },
      { k: "5", v: "Severe breathlessness" },
      { k: "7–9", v: "Very severe breathlessness" },
      { k: "10", v: "Maximal, unable to continue" },
    ]},
    interpret: {
      normal: ["Rating proportional to the exercise intensity being performed"],
      abnormal: ["High dyspnea rating disproportionate to workload → possible cardiac or pulmonary limitation"],
      redFlags: ["Dyspnea score of 8+ that doesn't settle with rest — stop the activity and reassess"],
      note: "Track dyspnea alongside RPE — a widening gap between the two over a rehab programme can flag a specific cardiac vs general fitness issue.",
    },
  },

  /* ===================== 30: FUNCTIONAL CAPACITY ===================== */

  sixMWT: {
    title: "6-Minute Walk Test",
    icon: "🚶",
    category: "Learn · Cardiovascular · Functional Capacity",
    perform: {
      images: [img("c_6mwt"), img("c_6mwt_2"), img("c_6mwt_3")],
      caption: "30m flat corridor, cones at each end",
      boxes: [
        { tone: "", label: "👤 Position", text: "Flat, enclosed corridor at least 30m long, marked with cones at each turnaround point." },
        { tone: "blue", label: "🖐️ Technique", text: "Patient walks at their own pace for 6 minutes, covering as much ground as possible; rests are allowed but the clock keeps running." },
        { tone: "purple", label: "🩺 Special consideration", text: "Use only standardized, scripted encouragement phrases at fixed intervals — inconsistent or excessive encouragement significantly affects the distance and reduces test-retest reliability." },
        { tone: "amber", label: "⚠️ Tip", text: "Monitor SpO₂, HR, and Borg dyspnea/RPE at baseline, during, and immediately post-test." },
      ],
    },
    scaleLabel: "Protocol",
    scale: { type: "table", rows: [
      { k: "Monitor", v: "SpO₂, HR, Borg dyspnoea/fatigue throughout" },
      { k: "Stop if", v: "Chest pain, severe dyspnoea, dizziness, significant SpO₂ drop" },
      { k: "Record", v: "Total distance, number of stops, symptoms, end SpO₂/HR" },
    ]},
    interpret: {
      normal: ["Distance within the predicted reference range for age/sex/height"],
      abnormal: ["Distance well below predicted → reduced functional capacity, correlate with the underlying cardiac condition"],
      redFlags: ["Chest pain, significant desaturation, or dizziness during the test — stop immediately, do not push to complete 6 minutes"],
      note: "Track distance across serial visits — the trend over time often matters more than any single test result.",
    },
  },

  /* ===================== EXTRAS (kept per user's decision) ===================== */

  pulsePressure: {
    title: "Pulse Pressure",
    icon: "📏",
    category: "Learn · Cardiovascular · General",
    perform: {
      images: [img("c_pulse_pressure"), img("c_pulse_pressure_2"), img("c_pulse_pressure_3")],
      caption: "Systolic minus diastolic, same brachial reading",
      boxes: [
        { tone: "", label: "👤 Position", text: "Same setup as a standard blood pressure measurement — seated, arm supported at heart level." },
        { tone: "blue", label: "🖐️ Technique", text: "Measure systolic and diastolic pressure as usual, then calculate: Pulse Pressure = Systolic − Diastolic." },
        { tone: "purple", label: "🩺 Special consideration", text: "Pulse pressure tends to widen naturally with age as large arteries stiffen — interpret an isolated value in the context of age and overall cardiovascular risk." },
        { tone: "amber", label: "⚠️ Tip", text: "Calculate this every time you take a BP — it costs nothing extra and adds real information." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "~40 mmHg (roughly 25–50% of systolic value)" },
      { k: "Narrow", v: "<25% of systolic — consider reduced stroke volume" },
      { k: "Wide", v: ">100 mmHg — arterial stiffness, aortic regurgitation" },
    ]},
    interpret: {
      normal: ["Pulse pressure roughly a quarter to half of the systolic value"],
      abnormal: ["Narrow → may reflect reduced stroke volume, e.g. heart failure or hypovolemia", "Wide → arterial stiffness and increased cardiovascular risk, especially in older adults"],
      note: "A useful cardiovascular risk marker to track over time, not a single diagnostic threshold.",
    },
  },

  clubbing: {
    title: "Clubbing",
    icon: "✋",
    category: "Learn · Cardiovascular · Observation",
    perform: {
      images: [img("c_clubbing"), img("c_clubbing_2"), img("c_clubbing_3")],
      caption: "Schamroth's window test — oppose corresponding nails",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, hands relaxed and well supported, good lighting." },
        { tone: "blue", label: "🖐️ Technique", text: "Inspect the nail bed angle from the side. Perform Schamroth's window test by opposing corresponding fingernails together." },
        { tone: "purple", label: "🩺 Special consideration", text: "Clubbing develops gradually — comparing to old photos or previous notes is more reliable than a single snapshot judgement." },
        { tone: "amber", label: "⚠️ Tip", text: "Loss of the Schamroth window is often the earliest, most reliable sign." },
      ],
    },
    scaleLabel: "Stages",
    scale: { type: "meter", rows: [
      { chip: "1", color: "#16A34A", name: "Softening of nail bed", desc: "Earliest, subtle change" },
      { chip: "2", color: "#F59E0B", name: "Loss of nail angle", desc: "Angle exceeds 180°" },
      { chip: "3", color: "#F59E0B", name: "Increased curvature", desc: "Nail bed visibly enlarges" },
      { chip: "4", color: "#E9484B", name: "Drumstick fingers", desc: "Bulbous, spongy nail bed" },
    ]},
    interpret: {
      normal: ["Normal nail angle ~160°", "Schamroth window shows a visible diamond-shaped gap"],
      abnormal: ["Loss of the Schamroth window → early clubbing", "Bulbous, spongy fingertips → advanced clubbing"],
      redFlags: ["New clubbing with unexplained weight loss or haemoptysis — prompt work-up for malignancy"],
      note: "Clubbing is a sign, not a diagnosis — always needs medical follow-up.",
    },
  },

  homans: {
    title: "Homans' Sign / DVT Screening",
    icon: "🦵",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_homans"), img("c_homans_2"), img("c_homans_3")],
      caption: "Passive ankle dorsiflexion with knee extended",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine, knee extended and relaxed." },
        { tone: "blue", label: "🖐️ Technique", text: "Passively dorsiflex the ankle with the knee held in extension, and ask about calf pain. Palpate for warmth, swelling, tenderness." },
        { tone: "purple", label: "🩺 Special consideration", text: "Poor sensitivity/specificity alone — never use it alone to rule DVT in or out. Combine with a validated clinical prediction rule (e.g. Wells' criteria)." },
        { tone: "amber", label: "⚠️ Tip", text: "Avoid vigorous calf palpation or massage if DVT is genuinely suspected." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Negative", v: "No calf pain, no swelling/warmth" },
      { k: "Positive sign", v: "Calf pain reproduced on dorsiflexion" },
      { k: "Associated signs", v: "Unilateral swelling, warmth, tenderness, dilated veins" },
    ]},
    interpret: {
      normal: ["No calf pain, tenderness, warmth, or swelling"],
      abnormal: ["Positive sign with unilateral swelling/warmth → raises DVT suspicion, needs formal scoring + referral"],
      redFlags: ["Suspected DVT with new breathlessness or chest pain — possible pulmonary embolism, treat as an emergency"],
      note: "A negative Homans' sign does NOT rule out DVT — use a proper clinical prediction rule.",
    },
  },

  abi: {
    title: "Ankle-Brachial Index (ABI)",
    icon: "📐",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_abi"), img("c_abi_2"), img("c_abi_3")],
      caption: "Doppler pressures — highest ankle ÷ highest arm",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient supine and rested 5–10 minutes, arms and ankles exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Using Doppler and cuff, record systolic pressure at both brachial arteries and ankles. ABI = highest ankle pressure ÷ highest arm pressure, per leg." },
        { tone: "purple", label: "🩺 Special consideration", text: "Falsely elevated ABI can occur in diabetes or renal disease due to calcified, non-compressible vessels." },
        { tone: "amber", label: "⚠️ Tip", text: "Use the higher arm reading as the denominator; repeat if arm readings differ by more than 10–15 mmHg." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "1.0–1.4" },
      { k: "Borderline", v: "0.91–0.99" },
      { k: "Mild–moderate PAD", v: "0.41–0.90" },
      { k: "Severe PAD", v: "≤0.40" },
      { k: "Non-compressible", v: ">1.40" },
    ]},
    interpret: {
      normal: ["ABI between 1.0 and 1.4 in both legs"],
      abnormal: ["Low ABI → peripheral arterial disease, severity roughly proportional to how low", "Very high ABI → likely non-compressible vessels, not true normal perfusion"],
      note: "ABI guides safe exercise prescription in PAD — a low value doesn't rule out walking-based rehab.",
    },
  },

  allensTest: {
    title: "Allen's Test (Hand Circulation)",
    icon: "🤚",
    category: "Learn · Cardiovascular · Peripheral Vascular",
    perform: {
      images: [img("c_allens"), img("c_allens_2"), img("c_allens_3")],
      caption: "Occlude both wrist arteries, release one at a time",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, hand elevated and the fist clenched tightly to drain blood from the palm." },
        { tone: "blue", label: "🖐️ Technique", text: "Compress both radial and ulnar arteries; open the hand (pale). Release one artery, keeping the other occluded, and time colour return." },
        { tone: "purple", label: "🩺 Special consideration", text: "Repeat releasing the other artery separately to assess both contributions individually — matters before radial artery procedures." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask the patient to relax the hand fully once open — an overly extended hand gives a falsely pale result." },
      ],
    },
    scaleLabel: "Result",
    scale: { type: "table", rows: [
      { k: "Normal (negative)", v: "Colour returns within 5–7 seconds" },
      { k: "Abnormal (positive)", v: "Delayed beyond ~10–15 seconds" },
    ]},
    interpret: {
      normal: ["Rapid, even flushing of the palm within about 5–7 seconds"],
      abnormal: ["Delayed or absent flushing → inadequate collateral circulation through that artery"],
      note: "Most relevant when a procedure involving the radial artery is being planned — flag an abnormal result clearly.",
    },
  },

  nyha: {
    title: "NYHA Functional Classification",
    icon: "📋",
    category: "Learn · Cardiovascular · Functional",
    perform: {
      images: [img("c_nyha"), img("c_nyha_2"), img("c_nyha_3")],
      caption: "Patient-reported symptoms with activity",
      boxes: [
        { tone: "", label: "👤 Position", text: "Interview format — best done with a family member present who can corroborate typical activity tolerance." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask about symptoms at rest and with ordinary vs less-than-ordinary activity, and match to a NYHA class." },
        { tone: "purple", label: "🩺 Special consideration", text: "Because it relies on the patient's own activity level, NYHA class can under- or over-estimate limitation — cross-check against an objective measure like the 6MWT where possible." },
        { tone: "amber", label: "⚠️ Tip", text: "Reassess NYHA class at intervals — a change of class is often more useful than the class itself at one point in time." },
      ],
    },
    scaleLabel: "Classes",
    scale: { type: "meter", rows: [
      { chip: "I", color: "#16A34A", name: "No limitation", desc: "Ordinary activity doesn't cause symptoms" },
      { chip: "II", color: "#16A34A", name: "Slight limitation", desc: "Comfortable at rest; ordinary activity causes symptoms" },
      { chip: "III", color: "#F59E0B", name: "Marked limitation", desc: "Comfortable at rest; less-than-ordinary activity causes symptoms" },
      { chip: "IV", color: "#E9484B", name: "Severe limitation", desc: "Symptoms at rest, worsened by any activity" },
    ]},
    interpret: {
      normal: ["Class I — no meaningful functional limitation"],
      abnormal: ["Class II–III → progressive limitation, should shape exercise intensity", "Class IV → symptoms at rest, needs direct medical guidance"],
      note: "Document the specific symptoms that led to the classification, not just the class number.",
    },
  },
};

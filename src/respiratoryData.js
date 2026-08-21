// Respiratory assessment cards. Same shape as cardioPulmonaryData.js —
// import both into your assessment screens; InfoCard.jsx renders either.

export const respiratoryData = {
  respRate: {
    title: "Respiratory Rate & Pattern",
    icon: "🌬️",
    category: "Learn · Respiratory",
    perform: {
      caption: "Count for a full 60s, unnoticed by the patient",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, seated or supine, chest visible; count without their awareness to avoid altering the pattern." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe or lightly place a hand on the chest/abdomen and count breaths for a full 60 seconds, noting rate, depth and regularity." },
        { tone: "amber", label: "⚠️ Tip", text: "Count immediately after taking the pulse, while your fingers are still on the wrist — patients breathe differently once they know they're being watched." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal (adult)", v: "12–20 breaths/min" },
      { k: "Tachypnoea", v: ">20 breaths/min" },
      { k: "Bradypnoea", v: "<12 breaths/min" },
    ]},
    interpret: {
      normal: ["Regular rate 12–20/min in adults", "Equal, effortless inspiration:expiration ratio"],
      abnormal: ["Tachypnoea → hypoxia, pain, anxiety, or metabolic acidosis", "Bradypnoea → opioid effect, CNS depression, severe fatigue", "Irregular pattern → possible neurological involvement"],
      note: "Always relate the rate to how comfortable the patient looks — a 'normal' rate can still reflect real effort.",
    },
  },

  chestShape: {
    title: "Chest Shape & Wall Deformities",
    icon: "🫁",
    category: "Learn · Respiratory",
    perform: {
      caption: "View from front, side, and behind",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated or standing, chest fully exposed, good lighting from front and side." },
        { tone: "blue", label: "🖐️ Technique", text: "Compare transverse vs anteroposterior diameter and note symmetry, spinal curvature, and sternal contour." },
        { tone: "amber", label: "⚠️ Tip", text: "View from the foot of the bed as well as side-on — some deformities are easy to miss from directly in front." },
      ],
    },
    scaleLabel: "Patterns",
    scale: { type: "meter", rows: [
      { chip: "N", color: "#16A34A", name: "Normal", desc: "AP < transverse diameter, ~45° rib angle" },
      { chip: "B", color: "#F59E0B", name: "Barrel chest", desc: "Increased AP diameter — chronic hyperinflation" },
      { chip: "PE", color: "#F59E0B", name: "Pectus excavatum", desc: "Sternum depressed inward" },
      { chip: "PC", color: "#F59E0B", name: "Pectus carinatum", desc: "Sternum protrudes outward" },
      { chip: "KS", color: "#E9484B", name: "Kyphoscoliosis", desc: "Combined curvature — can restrict lung volumes" },
    ]},
    interpret: {
      normal: ["Symmetrical chest, ribs descending ~45° from spine", "AP diameter less than transverse diameter"],
      abnormal: ["Barrel chest → chronic hyperinflation, e.g. severe emphysema", "Kyphoscoliosis → restrictive pattern, may progress to respiratory failure if severe", "Pectus deformities rarely affect lung function but should still be noted"],
      note: "Chest shape gives context for breathing pattern findings — read them together, not in isolation.",
    },
  },

  breathingPattern: {
    title: "Breathing Pattern",
    icon: "🌀",
    category: "Learn · Respiratory",
    perform: {
      caption: "Watch chest and abdomen together",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient relaxed, chest and abdomen visible." },
        { tone: "blue", label: "🖐️ Technique", text: "Watch the relative movement of chest wall and abdomen over several breath cycles; note diaphragmatic vs upper-chest dominance." },
        { tone: "amber", label: "⚠️ Tip", text: "Paradoxical movement (abdomen drawing in on inspiration) is easiest to see with the patient supine, eyes level with the abdomen." },
      ],
    },
    scaleLabel: "Patterns",
    scale: { type: "meter", rows: [
      { chip: "Dia", color: "#16A34A", name: "Diaphragmatic", desc: "Abdomen rises on inspiration — efficient pattern" },
      { chip: "Tho", color: "#F59E0B", name: "Thoracic / apical", desc: "Upper chest dominant — anxiety or restrictive disease" },
      { chip: "Par", color: "#E9484B", name: "Paradoxical", desc: "Abdomen draws in on inspiration — diaphragm fatigue" },
      { chip: "PL", color: "#F59E0B", name: "Pursed-lip", desc: "Prolonged expiration through pursed lips — common in COPD" },
    ]},
    interpret: {
      normal: ["Diaphragmatic-dominant, smooth and effortless"],
      abnormal: ["Paradoxical movement → diaphragm fatigue/weakness, e.g. neuromuscular disease or impending failure", "Persistent apical breathing → restrictive pattern or guarding from pain"],
      note: "Pursed-lip breathing is often a helpful patient-adopted strategy in COPD — don't discourage it without reason.",
    },
  },

  workOfBreathing: {
    title: "Work of Breathing / Accessory Muscles",
    icon: "💪",
    category: "Learn · Respiratory",
    perform: {
      caption: "Look at neck, shoulders, and intercostal spaces",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated upright if possible, neck and chest exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Observe sternocleidomastoid and scalene activity, shoulder elevation, and intercostal/subcostal recession during quiet breathing." },
        { tone: "amber", label: "⚠️ Tip", text: "Nasal flaring and tracheal tug are additional signs, especially relevant in children." },
      ],
    },
    scaleLabel: "Severity",
    scale: { type: "table", rows: [
      { k: "Mild", v: "Slightly increased rate, no visible accessory use" },
      { k: "Moderate", v: "Visible sternocleidomastoid/scalene use, some recession" },
      { k: "Severe", v: "Marked accessory use, tracheal tug, unable to speak in full sentences" },
    ]},
    interpret: {
      normal: ["Quiet, effortless breathing, no visible accessory muscle activity"],
      abnormal: ["Accessory muscle use → increased work of breathing, e.g. airway obstruction or distress", "Intercostal/subcostal recession in children is a key severity marker"],
      note: "Increasing accessory muscle use over time is often a more urgent sign than the respiratory rate alone.",
    },
  },

  trachea: {
    title: "Trachea Position",
    icon: "🎯",
    category: "Learn · Respiratory",
    perform: {
      caption: "Gentle palpation in the suprasternal notch",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, neck slightly flexed and relaxed." },
        { tone: "blue", label: "🖐️ Technique", text: "Place an index finger gently in the suprasternal notch on either side of the trachea and compare the space each side." },
        { tone: "amber", label: "⚠️ Tip", text: "Never force the assessment — deviation, if present, is usually a significant finding needing medical correlation." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Central", v: "Trachea midline, equal space each side" },
      { k: "Deviated towards", v: "Collapse / fibrosis on that side" },
      { k: "Deviated away from", v: "Tension pneumothorax or large effusion on that side" },
    ]},
    interpret: {
      normal: ["Trachea central and midline"],
      abnormal: ["Deviation toward a lesion → volume loss, e.g. collapse or fibrosis", "Deviation away from a lesion → space-occupying process, e.g. tension pneumothorax or large effusion"],
      note: "Acute tracheal deviation with respiratory distress needs immediate medical escalation, not routine documentation.",
    },
  },

  chestExpansion: {
    title: "Chest Expansion",
    icon: "📐",
    category: "Learn · Respiratory",
    perform: {
      caption: "Thumbs together at midline, hands on ribs",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, examiner behind or in front depending on the level being assessed." },
        { tone: "blue", label: "🖐️ Technique", text: "Place hands on the chest wall with thumbs meeting at the midline; ask the patient to breathe out fully then in maximally, and observe thumb separation." },
        { tone: "amber", label: "⚠️ Tip", text: "Assess upper, middle and lower zones separately, comparing both sides at each level." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "3–5 cm symmetrical excursion (varies by zone/age)" },
      { k: "Reduced unilateral", v: "Effusion, collapse, or pain-related splinting" },
      { k: "Reduced bilateral", v: "Restrictive disease or hyperinflation" },
    ]},
    interpret: {
      normal: ["Symmetrical expansion at all three zones"],
      abnormal: ["Reduced on one side → localized pathology, e.g. effusion, pneumothorax, splinting", "Bilateral reduction → restrictive disease, hyperinflation, or deconditioning"],
      note: "Pain-related splinting can mimic true restriction — ask about pain before concluding a structural cause.",
    },
  },

  fremitus: {
    title: "Tactile (Vocal) Fremitus",
    icon: "🖐️",
    category: "Learn · Respiratory",
    perform: {
      caption: "Ulnar borders of hands, patient says '99'",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, back exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Place the ulnar borders of both hands symmetrically on the chest wall; ask the patient to repeat a phrase like 'ninety-nine' while comparing vibration on each side." },
        { tone: "amber", label: "⚠️ Tip", text: "Move systematically from apex to base, comparing left and right at each level." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Increased", v: "Consolidation — solid lung transmits vibration better" },
      { k: "Decreased / absent", v: "Pneumothorax, effusion, or excess air trapping" },
      { k: "Normal", v: "Equal, moderate vibration bilaterally" },
    ]},
    interpret: {
      normal: ["Symmetrical fremitus at all levels"],
      abnormal: ["Increased → likely consolidation", "Decreased/absent → fluid, air, or thickened pleura blocking transmission"],
      note: "Fremitus findings should always be cross-checked against percussion and auscultation at the same spot.",
    },
  },

  surgicalEmphysema: {
    title: "Surgical (Subcutaneous) Emphysema",
    icon: "🫧",
    category: "Learn · Respiratory",
    perform: {
      caption: "Palpate for crackling under the skin",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, chest/neck exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Gently palpate the skin over the chest wall and neck, feeling for a crackling or crepitant sensation under the fingers." },
        { tone: "amber", label: "⚠️ Tip", text: "Mark the extent with a skin pen if present, so any spread can be monitored over time." },
      ],
    },
    scaleLabel: "Findings",
    scale: { type: "table", rows: [
      { k: "Present", v: "Crackling sensation — air trapped in subcutaneous tissue" },
      { k: "Common cause", v: "Chest drain issue, pneumothorax, post-thoracic surgery" },
      { k: "Monitor", v: "Extent, and whether it's increasing or stable" },
    ]},
    interpret: {
      normal: ["No crepitus felt"],
      abnormal: ["Palpable crepitus → air has tracked into subcutaneous tissue, often from a pneumothorax or drain issue"],
      note: "Report new or spreading surgical emphysema promptly — it can signal an evolving pneumothorax.",
    },
  },

  breathSounds: {
    title: "Auscultation — Breath Sounds",
    icon: "🩺",
    category: "Learn · Respiratory",
    perform: {
      caption: "Systematic apex-to-base, side to side",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, chest exposed, breathing through an open mouth." },
        { tone: "blue", label: "🖐️ Technique", text: "Auscultate systematically from apex to base, comparing left and right at each level through a full inspiration and expiration." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask the patient to breathe a little deeper and slightly faster than normal if sounds are hard to hear." },
      ],
    },
    scaleLabel: "Sound types",
    scale: { type: "meter", rows: [
      { chip: "Ves", color: "#16A34A", name: "Vesicular", desc: "Normal, soft rustling — heard over most lung fields" },
      { chip: "Bro", color: "#F59E0B", name: "Bronchial", desc: "Harsher, hollow — normal only over trachea/manubrium" },
      { chip: "Dec", color: "#E9484B", name: "Decreased / absent", desc: "Reduced air entry — effusion, pneumothorax, collapse" },
    ]},
    interpret: {
      normal: ["Vesicular sounds over peripheral lung fields", "Bronchial sounds only over the trachea and large airways"],
      abnormal: ["Bronchial sounds heard peripherally → consolidation", "Decreased/absent sounds → effusion, pneumothorax, or collapse blocking air entry"],
      note: "Always note where on the chest a finding is heard — location narrows the likely cause considerably.",
    },
  },

  addedSounds: {
    title: "Adventitious (Added) Sounds",
    icon: "🔊",
    category: "Learn · Respiratory",
    perform: {
      caption: "Note timing, and whether coughing clears it",
      boxes: [
        { tone: "", label: "👤 Position", text: "Same as breath sounds — seated, chest exposed." },
        { tone: "blue", label: "🖐️ Technique", text: "Listen for extra sounds superimposed on the normal breath sounds; note whether they occur in inspiration, expiration, or both, and whether coughing clears them." },
        { tone: "amber", label: "⚠️ Tip", text: "Coarse crackles that clear after a cough are usually secretions; fine crackles that persist often indicate fibrosis or fluid." },
      ],
    },
    scaleLabel: "Sound types",
    scale: { type: "meter", rows: [
      { chip: "Cr", color: "#F59E0B", name: "Crackles", desc: "Discontinuous — fluid, secretions, or fibrosis" },
      { chip: "Wh", color: "#F59E0B", name: "Wheeze", desc: "Continuous, musical — narrowed airways" },
      { chip: "Rh", color: "#F59E0B", name: "Rhonchi", desc: "Low-pitched, snoring — larger airway secretions" },
      { chip: "St", color: "#E9484B", name: "Stridor", desc: "High-pitched, inspiratory — upper airway obstruction, urgent" },
    ]},
    interpret: {
      normal: ["No added sounds"],
      abnormal: ["Fine crackles → fibrosis or early pulmonary oedema", "Coarse crackles → secretions, may clear with cough", "Wheeze → bronchospasm or airway narrowing", "Stridor → upper airway obstruction, requires urgent attention"],
      note: "Stridor is a red flag — escalate immediately rather than continuing routine assessment.",
    },
  },

  cough: {
    title: "Cough Assessment",
    icon: "😤",
    category: "Learn · Respiratory",
    perform: {
      caption: "Voluntary cough vs huff",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated, supported if post-surgical." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to cough voluntarily; assess strength, effectiveness at clearing secretions, and any pain limiting effort." },
        { tone: "amber", label: "⚠️ Tip", text: "Compare a huff (open glottis) with a full cough — a huff is often better tolerated post-operatively and still clears secretions." },
      ],
    },
    scaleLabel: "Effectiveness",
    scale: { type: "table", rows: [
      { k: "Effective", v: "Strong, produces audible secretion movement or expectoration" },
      { k: "Weak", v: "Reduced force, may not clear secretions fully" },
      { k: "Ineffective", v: "Minimal force — risk of retention/atelectasis" },
    ]},
    interpret: {
      normal: ["Strong, effective voluntary cough"],
      abnormal: ["Weak/ineffective cough → risk of secretion retention, especially post-op or in neuromuscular disease", "Pain-limited cough → may need splinting techniques or analgesia review"],
      note: "An ineffective cough is a key reason to prioritise airway clearance techniques in the treatment plan.",
    },
  },

  sputum: {
    title: "Sputum Analysis",
    icon: "🧫",
    category: "Learn · Respiratory",
    perform: {
      caption: "Colour, consistency, and quantity",
      boxes: [
        { tone: "", label: "👤 Position", text: "Collect a sample if possible, or ask the patient to describe it." },
        { tone: "blue", label: "🖐️ Technique", text: "Note colour, consistency (mucoid, purulent, frothy), and approximate daily quantity." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask directly — patients may feel embarrassed to volunteer details about sputum unprompted." },
      ],
    },
    scaleLabel: "Types",
    scale: { type: "meter", rows: [
      { chip: "Muc", color: "#16A34A", name: "Mucoid", desc: "Clear/white — typically no infection" },
      { chip: "Pur", color: "#F59E0B", name: "Purulent", desc: "Yellow/green, thick — suggests infection" },
      { chip: "Fro", color: "#F59E0B", name: "Frothy", desc: "Pink or white, thin — may suggest pulmonary oedema" },
      { chip: "Hae", color: "#E9484B", name: "Haemoptysis", desc: "Blood-streaked to frank blood — needs medical review" },
    ]},
    interpret: {
      normal: ["Minimal clear/mucoid sputum, or none"],
      abnormal: ["Purulent sputum → likely infective process", "Frothy pink sputum → possible pulmonary oedema", "Haemoptysis → always requires medical follow-up, however small"],
      note: "Track colour and volume day to day — a trend is often more useful than a single description.",
    },
  },

  peakCoughFlow: {
    title: "Peak Cough Flow",
    icon: "📊",
    category: "Learn · Respiratory",
    perform: {
      caption: "Peak flow meter with a cough manoeuvre",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated upright, using a peak flow meter with a mouthpiece." },
        { tone: "blue", label: "🖐️ Technique", text: "Patient takes a maximal inspiration, seals lips around the mouthpiece, and coughs as forcefully as possible into the device." },
        { tone: "amber", label: "⚠️ Tip", text: "Take the best of three attempts, allowing brief rest between each." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Effective cough", v: ">270 L/min (adult)" },
      { k: "Borderline", v: "160–270 L/min — assisted techniques may help" },
      { k: "Ineffective", v: "<160 L/min — high risk of secretion retention" },
    ]},
    interpret: {
      normal: ["Peak cough flow adequate for independent secretion clearance"],
      abnormal: ["Low value → increased risk of retained secretions and chest infection", "Very low values are a key consideration before extubation or discharge in neuromuscular patients"],
      note: "Peak cough flow is especially important to track in progressive neuromuscular conditions.",
    },
  },

  spo2: {
    title: "Pulse Oximetry (SpO₂)",
    icon: "💡",
    category: "Learn · Respiratory",
    perform: {
      caption: "Probe on finger or earlobe, wait for a stable trace",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient's hand warm and relaxed; nail polish or false nails removed if possible." },
        { tone: "blue", label: "🖐️ Technique", text: "Attach the probe and wait for a stable reading with a good waveform before recording; note the value alongside supplemental oxygen if any." },
        { tone: "amber", label: "⚠️ Tip", text: "Always document SpO₂ together with the oxygen flow rate/device — the number alone is meaningless without it." },
      ],
    },
    scaleLabel: "Reference",
    scale: { type: "table", rows: [
      { k: "Normal", v: "94–98% on room air (adult)" },
      { k: "COPD target range", v: "88–92% in some patients — check prescribed target" },
      { k: "Concerning", v: "<90% — assess for other distress signs, escalate as needed" },
    ]},
    interpret: {
      normal: ["SpO₂ within the patient's prescribed target range"],
      abnormal: ["Desaturation on exertion → possible exercise-induced hypoxaemia, e.g. interstitial lung disease", "Desaturation at rest → escalate promptly, especially with other distress signs"],
      note: "A single reading can mislead — trend the value with activity and rest.",
    },
  },

  cyanosis: {
    title: "Cyanosis (Central vs Peripheral)",
    icon: "🔵",
    category: "Learn · Respiratory",
    perform: {
      caption: "Check tongue/lips (central) and nail beds (peripheral)",
      boxes: [
        { tone: "", label: "👤 Position", text: "Good natural or white light, patient's mouth and hands visible." },
        { tone: "blue", label: "🖐️ Technique", text: "Inspect the tongue and lips for a bluish tinge (central) and the nail beds, fingers, and toes separately (peripheral)." },
        { tone: "amber", label: "⚠️ Tip", text: "Central cyanosis is the more urgent finding — it reflects low blood oxygen, not just poor local circulation." },
      ],
    },
    scaleLabel: "Types",
    scale: { type: "table", rows: [
      { k: "Central", v: "Bluish tongue/lips — low arterial oxygen saturation" },
      { k: "Peripheral", v: "Bluish fingers/toes with pink tongue — poor peripheral circulation" },
    ]},
    interpret: {
      normal: ["Pink tongue, lips, and nail beds"],
      abnormal: ["Central cyanosis → significant hypoxaemia, needs prompt escalation", "Peripheral cyanosis alone → check limb warmth/circulation before assuming a respiratory cause"],
      note: "Cyanosis is a late sign of hypoxaemia — don't rely on it alone; correlate with SpO₂.",
    },
  },

  spirometry: {
    title: "Spirometry Interpretation",
    icon: "📈",
    category: "Learn · Respiratory",
    perform: {
      caption: "FEV₁, FVC, and their ratio",
      boxes: [
        { tone: "", label: "👤 Position", text: "Patient seated upright, nose clip on, good lip seal around the mouthpiece." },
        { tone: "blue", label: "🖐️ Technique", text: "Patient takes a full maximal inspiration, then exhales as hard and fast as possible for as long as possible into the spirometer." },
        { tone: "amber", label: "⚠️ Tip", text: "At least three technically acceptable, reproducible attempts are needed before trusting the result." },
      ],
    },
    scaleLabel: "Reference pattern",
    scale: { type: "table", rows: [
      { k: "Obstructive", v: "Reduced FEV₁/FVC ratio (<0.7) — e.g. asthma, COPD" },
      { k: "Restrictive", v: "Reduced FVC, preserved/high ratio — e.g. fibrosis, chest wall disease" },
      { k: "Normal", v: "Ratio ≥0.7 with values within predicted range" },
    ]},
    interpret: {
      normal: ["FEV₁/FVC ratio ≥ 0.7", "Both FEV₁ and FVC within predicted range for age/height/sex"],
      abnormal: ["Reduced ratio → obstructive pattern", "Reduced FVC with normal/high ratio → restrictive pattern"],
      note: "Spirometry should always be read alongside the clinical picture — the pattern narrows the differential, it doesn't diagnose alone.",
    },
  },

  mmrc: {
    title: "mMRC Dyspnoea Scale",
    icon: "📋",
    category: "Learn · Respiratory",
    perform: {
      caption: "Patient-reported breathlessness with activity",
      boxes: [
        { tone: "", label: "👤 Position", text: "Interview format — no special positioning needed." },
        { tone: "blue", label: "🖐️ Technique", text: "Ask the patient to select the grade that best matches their usual level of breathlessness during activity." },
        { tone: "amber", label: "⚠️ Tip", text: "Use the patient's own words for activities where possible — it helps track meaningful change over time." },
      ],
    },
    scaleLabel: "Grades",
    scale: { type: "meter", rows: [
      { chip: "0", color: "#16A34A", name: "None", desc: "Breathless only with strenuous exercise" },
      { chip: "1", color: "#16A34A", name: "Mild", desc: "Breathless hurrying on the flat or a slight hill" },
      { chip: "2", color: "#F59E0B", name: "Moderate", desc: "Walks slower than peers, or stops for breath on the flat" },
      { chip: "3", color: "#F59E0B", name: "Severe", desc: "Stops for breath after ~100m or a few minutes on the flat" },
      { chip: "4", color: "#E9484B", name: "Very severe", desc: "Too breathless to leave the house, or breathless dressing" },
    ]},
    interpret: {
      normal: ["Grade 0–1 — minimal functional limitation from breathlessness"],
      abnormal: ["Grade 2+ → breathlessness is limiting daily function", "Grade 4 → severe limitation, needs close functional support"],
      note: "mMRC grade correlates with disease severity and commonly guides pulmonary rehab referral.",
    },
  },

  borg: {
    title: "Borg Scale (Dyspnoea / RPE)",
    icon: "🎚️",
    category: "Learn · Respiratory",
    perform: {
      caption: "0–10 scale shown during activity",
      boxes: [
        { tone: "", label: "👤 Position", text: "Used during or immediately after an exercise task." },
        { tone: "blue", label: "🖐️ Technique", text: "Show the patient the 0–10 scale and ask them to point to the number matching their breathlessness or exertion right now." },
        { tone: "amber", label: "⚠️ Tip", text: "Ask at a consistent point in the task each time (e.g. immediately at task end) for comparable readings." },
      ],
    },
    scaleLabel: "Scale",
    scale: { type: "table", rows: [
      { k: "0", v: "Nothing at all" },
      { k: "3", v: "Moderate" },
      { k: "5", v: "Severe / heavy" },
      { k: "7–9", v: "Very severe" },
      { k: "10", v: "Maximal" },
    ]},
    interpret: {
      normal: ["Score appropriate for the exertion level performed"],
      abnormal: ["Disproportionately high score for a low-intensity task → possible deconditioning or underlying pathology limiting exercise tolerance"],
      note: "Track the Borg score against workload over time — improving tolerance at the same score is a good outcome marker.",
    },
  },
};

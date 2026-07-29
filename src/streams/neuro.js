/* ─────────────────────────────────────────────────────────────────────────
   NEURO stream config (Step 2 · refined)

   Pure data consumed by AssessmentEngine.
   Refinements:
   • Added missing clinical fields (tone by palpation, clonus, coordination
     detail, spasticity pattern, respiratory, RASS, skin/pressure areas,
     dysphagia, sitting/standing balance, home environment, caregiver).
   • Condition selector drives condition-specific outcome measures
     (Stroke / TBI / SCI / Parkinson's / GBS / MS / CP) via `showIf`.
   • Setting-aware: ICU/Ward/OPD/Home change which fields appear via `showIf`.
   • Reorganized groupings and relabelled for clarity.
   ───────────────────────────────────────────────────────────────────────── */

const LIMBS = ["Right UE", "Left UE", "Right LE", "Left LE"];
const ASHWORTH = ["0", "1", "1+", "2", "3", "4"];
const OXFORD = ["0", "1", "2", "3", "4", "5"];
const DTR = ["0 Absent", "1+ Diminished", "2+ Normal", "3+ Brisk", "4+ Clonus"];
const BRUNNSTROM = ["1", "2", "3", "4", "5", "6"];
const SENS_GRADE = ["Intact", "Decreased", "Absent", "Exaggerated", "Inaccurate", "Untested"];
const SENS_REGIONS = ["Face", "Right UE", "Left UE", "Trunk", "Right LE", "Left LE"];
const SENS_MODES = ["Light touch", "Pain", "Temperature", "Proprioception", "Vibration"];
const NA = ["Normal", "Abnormal", "Untested"];
const ASSIST = ["Independent", "Supervision", "Min assist", "Mod assist", "Max assist", "Unable"];
const BAL_GRADE = ["Normal", "Good", "Fair", "Poor", "Nil"];
const SETTINGS = ["ICU / bedside", "Ward", "OPD / clinic", "Home / community"];
const CONDITIONS = ["Stroke", "TBI", "Spinal cord injury", "Parkinson's", "GBS / Neuropathy", "Multiple sclerosis", "Cerebral palsy", "Other"];

// setting groups
const ICU = ["ICU / bedside"];
const ICU_WARD = ["ICU / bedside", "Ward"];
const HOME = ["Home / community"];
const cond = (c) => ({ key:"condition", in:[c] });

const neuro = {
  id: "neuro",
  label: "Neuro",
  phases: [
    {
      id: "templates", label: "Templates", icon: "🧩",
      subtitle: "Condition-specific guided templates — TBI, Stroke, SCI, Parkinson's, MS. Each step deep-links to the relevant assessment tool.",
      sections: [{ fields: [
        { type:"component", key:"templatesHub", widget:"Templates" },
      ]}]
    },
    {
      id: "demographics", label: "Demographics", icon: "👤",
      subtitle: "Patient identity, care setting, condition, and referring diagnosis.",
      sections: [{ fields: [
        { type:"text", key:"name", label:"Patient name" },
        { type:"text", key:"age", label:"Age", mono:true },
        { type:"select", key:"sex", label:"Sex", options:["Male","Female","Other"] },
        { type:"select", key:"setting", label:"Assessment setting", options:SETTINGS },
        { type:"select", key:"condition", label:"Primary condition", options:CONDITIONS },
        { type:"text", key:"onsetDate", label:"Date / duration since onset" },
        { type:"text", key:"occupation", label:"Occupation" },
        { type:"select", key:"handDominance", label:"Hand dominance", options:["Right","Left","Ambidextrous"] },
        { type:"text", key:"ipop", label:"IP / OP number", mono:true },
        { type:"text", key:"date", label:"Date of assessment" },
        { type:"text", key:"diagnosis", label:"Medical diagnosis", layout:"full" },
        { type:"text", key:"referredBy", label:"Referred by" },
        { type:"textarea", key:"chiefComplaint", label:"Chief complaint (patient's / caregiver's words)", layout:"full", rows:2 },
      ]}]
    },
    {
      id: "subjective", label: "Subjective", icon: "📝",
      subtitle: "History, onset, comorbidities, premorbid status, and pain.",
      sections: [
        { fields: [
          { type:"select", key:"onset", label:"Mode of onset", options:["Sudden","Gradual","Insidious","Traumatic","Progressive","Relapsing-remitting"] },
          { type:"text", key:"goals", label:"Patient / family goals" },
          { type:"select", key:"fatigue", label:"Fatigue (esp. MS, post-stroke)", options:["None","Mild","Moderate","Severe"] },
          { type:"textarea", key:"hopi", label:"History of present illness", layout:"full", rows:3 },
          { type:"textarea", key:"pmh", label:"Past medical / surgical history", rows:2 },
          { type:"textarea", key:"comorbidities", label:"Comorbidities & risk factors (HTN, DM, cardiac, smoking)", rows:2 },
          { type:"textarea", key:"meds", label:"Current medications", layout:"full", rows:2 },
          { type:"textarea", key:"developmental", label:"Developmental / birth history (if relevant)", rows:2,
            showIf:{ key:"condition", in:["Cerebral palsy"] } },
          { type:"textarea", key:"premorbid", label:"Premorbid functional status", rows:2 },
          { type:"textarea", key:"social", label:"Personal / social / occupational history", layout:"full", rows:2 },
        ]},
        { heading:"Pain assessment", fields: [
          { type:"text", key:"painSite", label:"Site" },
          { type:"text", key:"painType", label:"Type / nature" },
          { type:"text", key:"painAggr", label:"Aggravating factors" },
          { type:"text", key:"painRel", label:"Relieving factors" },
          { type:"text", key:"vas", label:"VAS (0–10)", mono:true },
          { type:"select", key:"painNeuropathic", label:"Neuropathic features (burning, shooting, allodynia)", options:["No","Yes — consider DN4 / LANSS"] },
          { type:"select", key:"centralPain", label:"Central / post-stroke pain suspected", options:["No","Yes"] },
        ]}
      ]
    },
    {
      id: "objective", label: "Objective", icon: "🩺",
      subtitle: "Observation, mental status, cranial nerves, sensory, motor, coordination, gait, function.",
      sections: [
        { heading:"General observation & vitals", fields: [
          { type:"text", key:"built", label:"Built" },
          { type:"text", key:"posture", label:"Posture (supine/sitting/standing)" },
          { type:"textarea", key:"attitude", label:"Attitude of limbs (synergy pattern)", rows:2 },
          { type:"textarea", key:"appliances", label:"External appliances (lines, catheter, splints, orthosis)", rows:2 },
          { type:"text", key:"vitals", label:"Vitals (BP / Pulse / RR / Temp)", layout:"full" },
        ]},
        { heading:"Critical-care status", showIf:{ key:"setting", in:ICU }, fields: [
          { type:"select", key:"rass", label:"RASS / sedation level", options:["+4 Combative","+1 Restless","0 Alert & calm","-1 Drowsy","-2 Light sedation","-3 Moderate sedation","-4 Deep sedation","-5 Unarousable"] },
          { type:"text", key:"spo2", label:"SpO₂ (%)", mono:true },
          { type:"select", key:"ventilation", label:"Ventilation support", options:["Room air","Nasal O₂","NIV / BiPAP","Invasive ventilation","Tracheostomy"] },
          { type:"select", key:"haemodynamic", label:"Haemodynamic stability", options:["Stable","On inotropes","Unstable"] },
        ]},
        { heading:"Respiratory", showIf:{ anyOf:[{ key:"setting", in:ICU_WARD },{ key:"condition", in:["Spinal cord injury","GBS / Neuropathy"] }] }, fields: [
          { type:"select", key:"breathPattern", label:"Breathing pattern", options:["Normal","Shallow","Paradoxical","Apneustic","Cheyne-Stokes"] },
          { type:"select", key:"cough", label:"Cough / secretion clearance", options:["Effective","Weak","Absent"] },
          { type:"text", key:"chestExpansion", label:"Chest expansion / auscultation notes" },
        ]},
        { heading:"Higher mental function", fields: [
          { type:"select", key:"consciousness", label:"Consciousness", options:["Alert","Drowsy","Confused","Lethargic","Obtunded","Stuporous","Comatose"] },
          { type:"component", key:"gcs", widget:"GCS", match:"gcs_" },
          { type:"text", key:"orientation", label:"Orientation (time/place/person)" },
          { type:"text", key:"memory", label:"Memory & attention" },
          { type:"text", key:"mmse", label:"MMSE (/30)", mono:true },
          { type:"text", key:"moca", label:"MoCA (/30)", mono:true },
          { type:"select", key:"aphasia", label:"Speech / aphasia", options:["None","Broca's (expressive)","Wernicke's (receptive)","Global","Dysarthria only"] },
          { type:"select", key:"dysphagia", label:"Swallow / dysphagia screen", options:["Safe","Impaired — needs SLT referral","NBM / NG feeding"] },
        ]},
        { heading:"Cognitive / perceptual screen", fields: [
          { type:"component", key:"perceptual", widget:"Perceptual", match:"perc_" },
        ]},
        { heading:"Cranial nerves", fields: [
          { type:"component", key:"cranial", widget:"Cranial", match:"cn_" },
        ]},
        { heading:"Sensory system", fields: [
          { type:"component", key:"sensory", widget:"Sensory", match:["n_c","n_t","n_l","n_s"] },
          { type:"component", key:"myotomes", widget:"Myotome", match:"myo_" },
          { type:"text", key:"stereognosis", label:"Stereognosis" },
          { type:"text", key:"graphesthesia", label:"Graphesthesia" },
          { type:"text", key:"twoPoint", label:"Two-point discrimination" },
          { type:"text", key:"sensoryLevel", label:"Sensory level (dermatome)", showIf:cond("Spinal cord injury") },
        ]},
        { heading:"Neural tension / neurodynamics", fields: [
          { type:"component", key:"neuraltension", widget:"NeuralTension", match:"nt_" },
        ]},
        { heading:"Motor system", fields: [
          { type:"select", key:"tonePalpation", label:"Tone (palpation)", options:["Normal","Hypertonic","Hypotonic","Flaccid","Rigid"] },
          { type:"text", key:"spasticityPattern", label:"Spasticity pattern / distribution" },
          { type:"select", key:"clonus", label:"Clonus", options:["Absent","Ankle — few beats","Ankle — sustained","Present elsewhere"] },
          { type:"note", tag:"⊕ Motor in UMN", text:"Isolated Oxford MMT is not valid where spasticity or synergy dominate (O’Sullivan). Grade movement quality, selective motor control and Brunnstrom stage; use Motricity Index for validated strength." },
          { type:"select", key:"tardieuGrade", label:"Tardieu spasticity grade", options:["0 — no resistance","1 — slight catch","2 — clear catch + release","3 — fatigable clonus <10s","4 — non-fatigable clonus >10s"] },
          { type:"text", key:"tardieuAngles", label:"Tardieu R1 / R2 angles" },
          { type:"text", key:"motricityIndex", label:"Motricity Index (/100)", mono:true },
          { type:"textarea", key:"movementQuality", label:"Movement quality — synergy pattern & selective motor control", layout:"full", rows:2 },
          { type:"textarea", key:"associatedReactions", label:"Associated reactions / associated movements", rows:2 },
          { type:"limbtable", key:"motor", label:"Tone / power / DTR / Brunnstrom",
            rows:LIMBS, columns:[
              { label:"Tone (Ashworth)", options:ASHWORTH },
              { label:"Power (Oxford)", options:OXFORD },
              { label:"DTR", options:DTR },
              { label:"Brunnstrom", options:BRUNNSTROM }] },
          { type:"component", key:"reflexes", widget:"Reflexes", match:"n_ref_" },
          { type:"checkgrid", key:"involuntary", label:"Involuntary movements", options:[
            "Resting tremor","Intention tremor","Rigidity (cogwheel)","Rigidity (lead-pipe)","Bradykinesia","Dystonia","Chorea/athetosis","Fasciculations","Myoclonus"] },
          { type:"textarea", key:"romGirth", label:"ROM, contractures & muscle girth notes", layout:"full", rows:2 },
        ]},
        { heading:"Coordination, balance & gait", fields: [
          { type:"component", key:"coordination", widget:"Coordination", match:"coord_" },
          { type:"component", key:"vestibular", widget:"Vestibular", match:"vest_" },
          { type:"select", key:"romberg", label:"Romberg", options:["Negative","Positive"] },
          { type:"select", key:"sittingBal", label:"Sitting balance (static/dynamic)", options:BAL_GRADE },
          { type:"select", key:"standingBal", label:"Standing balance (static/dynamic)", options:BAL_GRADE },
          { type:"select", key:"rightingReactions", label:"Righting reactions", options:["Present","Impaired","Absent"] },
          { type:"select", key:"equilibriumReactions", label:"Equilibrium reactions", options:["Present","Impaired","Absent"] },
          { type:"select", key:"protectiveReactions", label:"Protective / saving reactions", options:["Present","Impaired","Absent"] },
          { type:"text", key:"berg", label:"Berg Balance (/56)", mono:true },
          { type:"text", key:"tug", label:"Timed Up & Go (s)", mono:true },
          { type:"checkgrid", key:"gaitDev", label:"Gait deviations", options:[
            "Foot drop","Circumduction","Hip hiking","Steppage","Ataxic","Festinating",
            "Scissoring","Antalgic","Trendelenburg","Reduced arm swing","Wide base"] },
          { type:"text", key:"gaitDevice", label:"Assistive device" },
        ]},
        { heading:"Functional movement analysis", fields: [
          { type:"note", tag:"⊕ Task analysis", text:"Assess the quality of movement (Carr & Shepherd motor relearning), not just independence — note missing components and compensations." },
          { type:"textarea", key:"bedMobility", label:"Bed mobility / rolling", rows:2 },
          { type:"textarea", key:"sitToStand", label:"Sit-to-stand", rows:2 },
          { type:"textarea", key:"transferQuality", label:"Transfers — quality & compensations", rows:2 },
          { type:"textarea", key:"posturalControl", label:"Sitting & standing postural control", rows:2 },
        ]},
        { heading:"Stroke / hemiplegia-specific", showIf:{ key:"condition", in:["Stroke","TBI"] }, fields: [
          { type:"select", key:"shoulderSublux", label:"Glenohumeral subluxation (finger-breadths)", options:["None","½ finger","1 finger","1½ fingers","2+ fingers"] },
          { type:"select", key:"pusher", label:"Pusher behaviour / contraversive pushing (SCP)", options:["Absent","Mild","Moderate","Severe"] },
          { type:"select", key:"shoulderPain", label:"Hemiplegic shoulder pain", options:["No","Yes"] },
        ]},
        { heading:"Hand function, bladder & ADL", fields: [
          { type:"checkgrid", key:"grip", label:"Grip patterns intact", options:["Spherical","Hook","Pinch","Tip-to-tip"] },
          { type:"select", key:"bladder", label:"Bowel / bladder", options:["Normal","UMN type","LMN type","Catheterised"] },
          { type:"select", key:"skin", label:"Skin / pressure areas", options:["Intact","At risk","Grade 1–2 breakdown","Grade 3–4 breakdown"],
            showIf:{ key:"setting", in:["ICU / bedside","Ward","Home / community"] } },
          { type:"select", key:"feeding", label:"Feeding", options:ASSIST },
          { type:"select", key:"dressing", label:"Dressing", options:ASSIST },
          { type:"select", key:"bathing", label:"Bathing", options:ASSIST },
          { type:"select", key:"transfers", label:"Transfers", options:ASSIST },
          { type:"select", key:"ambulation", label:"Ambulation", options:ASSIST },
          { type:"text", key:"barthel", label:"Barthel Index / FIM", mono:true },
        ]},
        { heading:"Home & environment", showIf:{ key:"setting", in:HOME }, fields: [
          { type:"textarea", key:"homeAccess", label:"Home access (steps, ramps, bathroom, bedroom layout)", rows:2 },
          { type:"select", key:"caregiver", label:"Caregiver support", options:["Lives alone","Part-time caregiver","Full-time caregiver","Family present"] },
          { type:"textarea", key:"homeEquipment", label:"Equipment at home (rails, commode, wheelchair, walker)", rows:2 },
          { type:"textarea", key:"fallsHistory", label:"Falls history & home hazards", rows:2 },
        ]},
        { heading:"Condition-specific outcome measures", fields: [
          // Stroke
          { type:"text", key:"nihss", label:"NIHSS score", mono:true, showIf:cond("Stroke") },
          { type:"text", key:"fuglUE", label:"Fugl-Meyer — Upper limb", mono:true, showIf:cond("Stroke") },
          { type:"text", key:"fuglLE", label:"Fugl-Meyer — Lower limb", mono:true, showIf:cond("Stroke") },
          { type:"text", key:"trunkImp", label:"Trunk Impairment Scale", mono:true, showIf:cond("Stroke") },
          { type:"text", key:"mrs", label:"Modified Rankin Scale", mono:true, showIf:cond("Stroke") },
          // TBI
          { type:"select", key:"rancho", label:"Rancho Los Amigos level", options:["I","II","III","IV","V","VI","VII","VIII"], showIf:cond("TBI") },
          { type:"text", key:"drs", label:"Disability Rating Scale", mono:true, showIf:cond("TBI") },
          // SCI
          { type:"select", key:"asiaGrade", label:"ASIA impairment grade", options:["A","B","C","D","E"], showIf:cond("Spinal cord injury") },
          { type:"text", key:"asiaMotor", label:"ASIA motor score (/100)", mono:true, showIf:cond("Spinal cord injury") },
          { type:"text", key:"asiaSensory", label:"ASIA sensory score", mono:true, showIf:cond("Spinal cord injury") },
          { type:"text", key:"neuroLevel", label:"Neurological level of injury", showIf:cond("Spinal cord injury") },
          { type:"text", key:"scim", label:"SCIM (Spinal Cord Independence Measure)", mono:true, showIf:cond("Spinal cord injury") },
          // Parkinson's
          { type:"text", key:"updrs", label:"UPDRS total score", mono:true, showIf:cond("Parkinson's") },
          { type:"select", key:"hoehnYahr", label:"Hoehn & Yahr stage", options:["1","1.5","2","2.5","3","4","5"], showIf:cond("Parkinson's") },
          { type:"text", key:"pdq39", label:"PDQ-39 (quality of life)", mono:true, showIf:cond("Parkinson's") },
          // GBS / neuropathy
          { type:"select", key:"gbsDisability", label:"GBS disability scale", options:["0 Healthy","1 Minor symptoms","2 Walks unaided","3 Walks with aid","4 Bed/chair bound","5 Assisted ventilation","6 Death"], showIf:cond("GBS / Neuropathy") },
          { type:"text", key:"mrcSum", label:"MRC sum score (/60)", mono:true, showIf:cond("GBS / Neuropathy") },
          // MS
          { type:"text", key:"edss", label:"EDSS score", mono:true, showIf:cond("Multiple sclerosis") },
          // CP
          { type:"select", key:"gmfcs", label:"GMFCS level", options:["I","II","III","IV","V"], showIf:cond("Cerebral palsy") },
          { type:"select", key:"macs", label:"MACS level", options:["I","II","III","IV","V"], showIf:cond("Cerebral palsy") },
          // Other
          { type:"text", key:"otherScale", label:"Condition-specific scale (specify)", layout:"full", showIf:cond("Other") },
        ]},
        { heading:"Neurological red flags", fields: [
          { type:"component", key:"redflags", widget:"RedFlags", match:"nrf_" },
        ]},
      ]
    },
    {
      id: "plan", label: "Plan", icon: "✅",
      subtitle: "ICF-based diagnosis, goals, and plan of care.",
      sections: [
        { heading:"Investigations", fields: [
          { type:"text", key:"ctmri", label:"CT / MRI findings", layout:"full" },
          { type:"text", key:"otherInv", label:"Other investigations (NCS/EMG, bloods)", layout:"full" },
        ]},
        { heading:"Physical & functional diagnosis (ICF)", fields: [
          { type:"textarea", key:"impairments", label:"Impairments (body structure/function)", rows:2 },
          { type:"textarea", key:"activity", label:"Activity limitations", rows:2 },
          { type:"textarea", key:"participation", label:"Participation restriction", rows:2 },
          { type:"textarea", key:"contextual", label:"Contextual factors (personal/environmental)", rows:2 },
        ]},
        { heading:"Impression & plan", fields: [
          { type:"textarea", key:"problemList", label:"Problem list", layout:"full", rows:3 },
          { type:"textarea", key:"stg", label:"Short-term goals", rows:3 },
          { type:"textarea", key:"ltg", label:"Long-term goals", rows:3 },
          { type:"textarea", key:"plan", label:"Plan / aims & means (treatment strategy)", layout:"full", rows:3 },
        ]}
      ]
    }
  ],
  // ── Guided workflow checklists (ported from Neuro Templates) ──
  // Each step jumps to a phase and highlights the target engine field.
  checklists: {
    "Stroke": [
      { label:"Consciousness & GCS", phase:"objective", fieldKey:"consciousness" },
      { label:"Communication / aphasia screen", phase:"objective", fieldKey:"aphasia" },
      { label:"Perceptual / neglect screen", phase:"objective", fieldKey:"perceptual" },
      { label:"Cranial nerve exam", phase:"objective", fieldKey:"cranial" },
      { label:"Sensory testing", phase:"objective", fieldKey:"sensory" },
      { label:"Motor: tone / power / Brunnstrom", phase:"objective", fieldKey:"motor" },
      { label:"Coordination & balance", phase:"objective", fieldKey:"sittingBal" },
      { label:"Gait analysis", phase:"objective", fieldKey:"gaitDev" },
      { label:"NIHSS", phase:"objective", fieldKey:"nihss" },
      { label:"Fugl-Meyer motor assessment", phase:"objective", fieldKey:"fuglUE" },
      { label:"ADL / Barthel", phase:"objective", fieldKey:"barthel" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "TBI": [
      { label:"GCS (E/V/M)", phase:"objective", fieldKey:"gcs" },
      { label:"RASS / sedation (if ICU)", phase:"objective", fieldKey:"rass" },
      { label:"Orientation & cognition", phase:"objective", fieldKey:"orientation" },
      { label:"Cranial nerve exam", phase:"objective", fieldKey:"cranial" },
      { label:"Tone, power & reflexes", phase:"objective", fieldKey:"motor" },
      { label:"Coordination", phase:"objective", fieldKey:"coordination" },
      { label:"Rancho Los Amigos level", phase:"objective", fieldKey:"rancho" },
      { label:"Balance", phase:"objective", fieldKey:"standingBal" },
      { label:"ADL / Barthel", phase:"objective", fieldKey:"barthel" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "Spinal cord injury": [
      { label:"Sensory level (dermatome)", phase:"objective", fieldKey:"sensoryLevel" },
      { label:"Motor / myotome testing", phase:"objective", fieldKey:"motor" },
      { label:"ASIA impairment grade", phase:"objective", fieldKey:"asiaGrade" },
      { label:"ASIA motor & sensory scores", phase:"objective", fieldKey:"asiaMotor" },
      { label:"Bowel / bladder", phase:"objective", fieldKey:"bladder" },
      { label:"Skin / pressure areas", phase:"objective", fieldKey:"skin" },
      { label:"Respiratory (high lesions)", phase:"objective", fieldKey:"breathPattern" },
      { label:"Transfers & function", phase:"objective", fieldKey:"transfers" },
      { label:"SCIM", phase:"objective", fieldKey:"scim" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "Parkinson's": [
      { label:"Rigidity & bradykinesia", phase:"objective", fieldKey:"involuntary" },
      { label:"Tone (palpation)", phase:"objective", fieldKey:"tonePalpation" },
      { label:"Postural stability / Romberg", phase:"objective", fieldKey:"romberg" },
      { label:"Gait (festination, freezing)", phase:"objective", fieldKey:"gaitDev" },
      { label:"Balance / TUG", phase:"objective", fieldKey:"tug" },
      { label:"UPDRS", phase:"objective", fieldKey:"updrs" },
      { label:"Hoehn & Yahr stage", phase:"objective", fieldKey:"hoehnYahr" },
      { label:"ADL / Barthel", phase:"objective", fieldKey:"barthel" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "GBS / Neuropathy": [
      { label:"Respiratory function", phase:"objective", fieldKey:"breathPattern" },
      { label:"Motor power (distal → proximal)", phase:"objective", fieldKey:"motor" },
      { label:"Sensory testing", phase:"objective", fieldKey:"sensory" },
      { label:"MRC sum score", phase:"objective", fieldKey:"mrcSum" },
      { label:"GBS disability scale", phase:"objective", fieldKey:"gbsDisability" },
      { label:"Autonomic / vitals", phase:"objective", fieldKey:"vitals" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "Multiple sclerosis": [
      { label:"Fatigue & symptom history", phase:"subjective", fieldKey:"hopi" },
      { label:"Cranial nerves (optic, diplopia)", phase:"objective", fieldKey:"cranial" },
      { label:"Sensory testing", phase:"objective", fieldKey:"sensory" },
      { label:"Motor & spasticity", phase:"objective", fieldKey:"motor" },
      { label:"Cerebellar / coordination", phase:"objective", fieldKey:"coordination" },
      { label:"Balance (Berg)", phase:"objective", fieldKey:"berg" },
      { label:"EDSS", phase:"objective", fieldKey:"edss" },
      { label:"Bladder function", phase:"objective", fieldKey:"bladder" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "Cerebral palsy": [
      { label:"Developmental history", phase:"subjective", fieldKey:"developmental" },
      { label:"Tone / spasticity", phase:"objective", fieldKey:"tonePalpation" },
      { label:"Motor & selective control", phase:"objective", fieldKey:"motor" },
      { label:"GMFCS level", phase:"objective", fieldKey:"gmfcs" },
      { label:"MACS level", phase:"objective", fieldKey:"macs" },
      { label:"Gait", phase:"objective", fieldKey:"gaitDev" },
      { label:"ADL / Barthel", phase:"objective", fieldKey:"barthel" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
    "_default": [
      { label:"Higher mental function", phase:"objective", fieldKey:"consciousness" },
      { label:"Cranial nerve exam", phase:"objective", fieldKey:"cranial" },
      { label:"Sensory testing", phase:"objective", fieldKey:"sensory" },
      { label:"Motor system", phase:"objective", fieldKey:"motor" },
      { label:"Coordination & balance", phase:"objective", fieldKey:"coordination" },
      { label:"Gait", phase:"objective", fieldKey:"gaitDev" },
      { label:"ADL / function", phase:"objective", fieldKey:"barthel" },
      { label:"Goals & plan", phase:"plan", fieldKey:"plan" },
    ],
  }
};

export default neuro;

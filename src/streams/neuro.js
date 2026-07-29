/* ─────────────────────────────────────────────────────────────────────────
   NEURO stream config (Step 2)

   Pure data consumed by AssessmentEngine. Covers the full neuro flow:
   Demographics → Subjective → Objective → Plan. Adapted from the
   NeuroAssessmentForm draft. Add other streams by cloning this shape.
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
const SETTINGS = ["ICU / bedside", "Ward", "OPD / clinic", "Home / community"];

const neuro = {
  id: "neuro",
  label: "Neuro",
  phases: [
    {
      id: "demographics", label: "Demographics", icon: "👤",
      subtitle: "Patient identity, setting, and referring diagnosis.",
      sections: [{ fields: [
        { type:"text", key:"name", label:"Patient name" },
        { type:"text", key:"age", label:"Age", mono:true },
        { type:"select", key:"sex", label:"Sex", options:["Male","Female","Other"] },
        { type:"select", key:"setting", label:"Assessment setting", options:SETTINGS },
        { type:"text", key:"occupation", label:"Occupation" },
        { type:"select", key:"handDominance", label:"Hand dominance", options:["Right","Left","Ambidextrous"] },
        { type:"text", key:"ipop", label:"IP / OP number", mono:true },
        { type:"text", key:"date", label:"Date of assessment" },
        { type:"text", key:"diagnosis", label:"Medical diagnosis", layout:"full" },
        { type:"text", key:"referredBy", label:"Referred by" },
        { type:"textarea", key:"chiefComplaint", label:"Chief complaint (patient's words)", layout:"full", rows:2 },
      ]}]
    },
    {
      id: "subjective", label: "Subjective", icon: "📝",
      subtitle: "History, onset, premorbid status, and pain.",
      sections: [
        { fields: [
          { type:"select", key:"onset", label:"Mode / date of onset", options:["Sudden","Gradual","Insidious","Traumatic"] },
          { type:"text", key:"goals", label:"Patient goals" },
          { type:"textarea", key:"hopi", label:"History of present illness", layout:"full", rows:3 },
          { type:"textarea", key:"pmh", label:"Past medical / surgical / family history", layout:"full", rows:2 },
          { type:"textarea", key:"meds", label:"Current medications", layout:"full", rows:2 },
          { type:"textarea", key:"developmental", label:"Developmental / birth history (if relevant)", rows:2 },
          { type:"textarea", key:"premorbid", label:"Premorbid functional status", rows:2 },
          { type:"textarea", key:"social", label:"Personal / social / environmental history", layout:"full", rows:2 },
        ]},
        { heading:"Pain assessment", fields: [
          { type:"text", key:"painSite", label:"Site" },
          { type:"text", key:"painType", label:"Type / nature" },
          { type:"text", key:"painAggr", label:"Aggravating factors" },
          { type:"text", key:"painRel", label:"Relieving factors" },
          { type:"text", key:"vas", label:"VAS (0–10)", mono:true },
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
          { type:"textarea", key:"appliances", label:"External appliances (lines, catheter, splints)", rows:2 },
          { type:"text", key:"vitals", label:"Vitals (BP / Pulse / RR / Temp)", layout:"full" },
        ]},
        { heading:"Higher mental function", fields: [
          { type:"select", key:"consciousness", label:"Consciousness", options:["Alert","Drowsy","Confused","Lethargic","Obtunded","Stuporous","Comatose"] },
          { type:"text", key:"gcs", label:"GCS (E/V/M)", mono:true },
          { type:"text", key:"orientation", label:"Orientation (time/place/person)" },
          { type:"text", key:"memory", label:"Memory & attention" },
          { type:"select", key:"aphasia", label:"Speech / aphasia", options:["None","Broca's (expressive)","Wernicke's (receptive)","Global","Dysarthria only"] },
        ]},
        { heading:"Cognitive / perceptual screen", fields: [
          { type:"checkgrid", key:"perceptual", label:"Deficits noted", options:[
            "Unilateral neglect","Anosognosia","Somatoagnosia","Right-left discrimination deficit",
            "Finger agnosia","Spatial relation deficit","Topographical disorientation",
            "Visual agnosia","Ideomotor apraxia","Ideational apraxia","Constructional apraxia"] },
        ]},
        { heading:"Cranial nerves", fields: [
          { type:"limbtable", key:"cranial", label:"Cranial nerve screen",
            rows:["CN I","CN II","CN III/IV/VI","CN V","CN VII","CN VIII","CN IX/X","CN XI","CN XII"],
            columns:[{ label:"Status", options:NA }] },
        ]},
        { heading:"Sensory system", fields: [
          { type:"sensorytable", key:"sensory", label:"Sensation by region",
            regions:SENS_REGIONS, modes:SENS_MODES, grades:SENS_GRADE },
          { type:"text", key:"stereognosis", label:"Stereognosis" },
          { type:"text", key:"graphesthesia", label:"Graphesthesia" },
          { type:"text", key:"twoPoint", label:"Two-point discrimination" },
        ]},
        { heading:"Motor system", fields: [
          { type:"limbtable", key:"motor", label:"Tone / power / DTR / Brunnstrom",
            rows:LIMBS, columns:[
              { label:"Tone (Ashworth)", options:ASHWORTH },
              { label:"Power (Oxford)", options:OXFORD },
              { label:"DTR", options:DTR },
              { label:"Brunnstrom", options:BRUNNSTROM }] },
          { type:"select", key:"babinski", label:"Babinski / plantar", options:["Flexor (normal)","Extensor — right","Extensor — left","Extensor — bilateral"] },
          { type:"checkgrid", key:"involuntary", label:"Involuntary movements", options:[
            "Resting tremor","Intention tremor","Rigidity","Dystonia","Chorea/athetosis","Fasciculations","Myoclonus"] },
          { type:"textarea", key:"romGirth", label:"ROM & muscle girth notes", layout:"full", rows:2 },
        ]},
        { heading:"Coordination, balance & gait", fields: [
          { type:"select", key:"fingerNose", label:"Finger-to-nose", options:NA },
          { type:"select", key:"heelShin", label:"Heel-to-shin", options:NA },
          { type:"select", key:"dysdiado", label:"Dysdiadochokinesia", options:NA },
          { type:"select", key:"romberg", label:"Romberg", options:["Negative","Positive"] },
          { type:"text", key:"berg", label:"Berg Balance (/56)", mono:true },
          { type:"text", key:"tug", label:"Timed Up & Go (s)", mono:true },
          { type:"checkgrid", key:"gaitDev", label:"Gait deviations", options:[
            "Foot drop","Circumduction","Hip hiking","Steppage","Ataxic","Festinating",
            "Scissoring","Antalgic","Trendelenburg","Reduced arm swing","Wide base"] },
          { type:"text", key:"gaitDevice", label:"Assistive device" },
        ]},
        { heading:"Hand function, bladder & ADL", fields: [
          { type:"checkgrid", key:"grip", label:"Grip patterns intact", options:["Spherical","Hook","Pinch","Tip-to-tip"] },
          { type:"select", key:"bladder", label:"Bowel/bladder", options:["Normal","UMN type","LMN type"] },
          { type:"select", key:"feeding", label:"Feeding", options:ASSIST },
          { type:"select", key:"dressing", label:"Dressing", options:ASSIST },
          { type:"select", key:"bathing", label:"Bathing", options:ASSIST },
          { type:"select", key:"transfers", label:"Transfers", options:ASSIST },
          { type:"select", key:"ambulation", label:"Ambulation", options:ASSIST },
          { type:"text", key:"barthel", label:"Barthel Index / FIM", mono:true },
        ]},
      ]
    },
    {
      id: "plan", label: "Plan", icon: "✅",
      subtitle: "ICF-based diagnosis, goals, and plan of care.",
      sections: [
        { heading:"Investigations", fields: [
          { type:"text", key:"ctmri", label:"CT / MRI findings", layout:"full" },
          { type:"text", key:"otherInv", label:"Other investigations", layout:"full" },
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
  ]
};

export default neuro;

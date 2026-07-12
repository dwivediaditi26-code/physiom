// sharedClinicalData.js — pure data/constants shared across SubjectiveObjective.jsx,
// ClinicalModules.jsx, OutcomeMeasuresPro.jsx, PhysioNeuro.jsx, and their external
// consumers (AppFull.jsx, PatientDatabase.jsx, AppModules.jsx, DashboardModules.jsx,
// HomeProtocolTab.jsx).
//
// Why this file exists: those 4 source files are each 2,000-15,000 lines of heavy
// React UI components. Real, measured discovery while fixing this: Vite/Rollup's
// manualChunks, when given a fixed *name* for a module that's reached from several
// different React.lazy()/dynamic import() call sites, hoists that named chunk into a
// STATIC import of the entry bundle -- completely defeating every lazy() wrapper
// pointing at it. Confirmed by diffing the built entry bundle's own top-of-file
// `import` statements before/after removing one manual chunk-name pin. The actual
// fix has two parts: (1) stop manually naming those chunks in vite.config.js, and
// (2) make sure NOTHING outside each heavy file has a genuine remaining static
// import of it -- otherwise Rollup will (correctly) still bundle it eagerly. This
// file is part (2): the small, real, cross-file data every consumer actually needs
// (sidebar completion percentages, label lookups, PDF export helpers) moved out so
// consumers can import a few KB of data instead of an entire heavy component chunk.
// The original files import these same names back for their own internal use, so
// behavior is unchanged; only what has to load eagerly shrinks.

// ─── from OutcomeMeasuresPro.jsx ───────────────────────────────────────────
const SCALES = {
  ndi:{id:"ndi",label:"NDI",full:"Neck Disability Index",icon:"🔄",category:"Cervical Spine",
    maxScore:100,unit:"%",mcid:8,
    interpret:(s)=>s<=8?{label:"No disability",color:"#16a34a"}:s<=28?{label:"Mild",color:"#0891b2"}:s<=48?{label:"Moderate",color:"#d97706"}:s<=64?{label:"Severe",color:"#ea580c"}:{label:"Complete",color:"#dc2626"},
    fields:[
      {id:"ndi_pain",label:"Pain Intensity",options:["0 — No pain","1 — Very mild","2 — Moderate","3 — Fairly severe","4 — Very severe","5 — Worst imaginable"]},
      {id:"ndi_personal",label:"Personal Care",options:["0 — Normal, no extra pain","1 — Normal but painful","2 — Slow and careful","3 — Some help needed","4 — Help every day","5 — Unable to care"]},
      {id:"ndi_lifting",label:"Lifting",options:["0 — Heavy without extra pain","1 — Heavy but extra pain","2 — Cannot lift heavy from floor","3 — Cannot lift heavy from table","4 — Can lift only very light","5 — Cannot lift at all"]},
      {id:"ndi_reading",label:"Reading",options:["0 — As long as I like","1 — As long as I like, slight pain","2 — As long as I like, moderate pain","3 — Not as long as I like","4 — Hardly at all","5 — Cannot read at all"]},
      {id:"ndi_headache",label:"Headaches",options:["0 — No headaches","1 — Slight, infrequent","2 — Moderate, infrequent","3 — Moderate, frequent","4 — Severe, frequent","5 — All the time"]},
      {id:"ndi_concentration",label:"Concentration",options:["0 — No difficulty","1 — Slight difficulty","2 — Moderate difficulty","3 — Great difficulty","4 — Very great difficulty","5 — Cannot concentrate"]},
      {id:"ndi_work",label:"Work",options:["0 — As much as I like","1 — Usual work only","2 — Most usual work","3 — Cannot do usual work","4 — Hardly any work","5 — Cannot work"]},
      {id:"ndi_driving",label:"Driving",options:["0 — Without any pain","1 — Slight pain","2 — Moderate pain","3 — Severe pain","4 — Hardly at all","5 — Cannot drive"]},
      {id:"ndi_sleeping",label:"Sleeping",options:["0 — No problem","1 — Slight difficulty","2 — Moderate difficulty","3 — Great difficulty","4 — Very great difficulty","5 — Cannot sleep"]},
      {id:"ndi_recreation",label:"Recreation",options:["0 — No limitation","1 — Slight limitation","2 — Moderate limitation","3 — Significant limitation","4 — Hardly any recreation","5 — No recreation"]},
    ],
    score:(v)=>{const ids=["ndi_pain","ndi_personal","ndi_lifting","ndi_reading","ndi_headache","ndi_concentration","ndi_work","ndi_driving","ndi_sleeping","ndi_recreation"];const s=ids.map(id=>v[id]?+v[id].split(" — ")[0]:null).filter(x=>x!==null);return s.length?Math.round(s.reduce((a,b)=>a+b,0)/(s.length*5)*100):null;}
  },
  odi:{id:"odi",label:"ODI",full:"Oswestry Disability Index",icon:"🦴",category:"Lumbar Spine",
    maxScore:100,unit:"%",mcid:10,
    interpret:(s)=>s<=20?{label:"Minimal",color:"#16a34a"}:s<=40?{label:"Moderate",color:"#0891b2"}:s<=60?{label:"Severe",color:"#d97706"}:s<=80?{label:"Crippling",color:"#ea580c"}:{label:"Bed-bound",color:"#dc2626"},
    fields:[
      {id:"odi_pain",label:"Pain Intensity",options:["0 — No pain","1 — Very mild","2 — Moderate","3 — Fairly severe","4 — Very severe","5 — Worst imaginable"]},
      {id:"odi_personal",label:"Personal Care",options:["0 — Normal, no extra pain","1 — Normal but painful","2 — Slow and careful","3 — Need some help","4 — Need help every day","5 — Unable"]},
      {id:"odi_lifting",label:"Lifting",options:["0 — Heavy without extra pain","1 — Heavy but extra pain","2 — Floor lift only if positioned","3 — Light if positioned","4 — Only very light","5 — Cannot lift"]},
      {id:"odi_walking",label:"Walking",options:["0 — No limitation","1 — Pain before 1.5km","2 — Pain before 800m","3 — Pain before 100m","4 — Only with stick/crutch","5 — Mostly in bed"]},
      {id:"odi_sitting",label:"Sitting",options:["0 — Any chair, as long as I like","1 — Favourite chair only","2 — Over 1 hour","3 — Over 30 minutes","4 — Over 10 minutes","5 — Cannot sit at all"]},
      {id:"odi_standing",label:"Standing",options:["0 — As long as I like","1 — Over 1 hour","2 — Over 30 minutes","3 — Over 10 minutes","4 — With extra pain","5 — Cannot stand"]},
      {id:"odi_sleeping",label:"Sleeping",options:["0 — No problem","1 — Occasional disturbance","2 — Less than 6 hours","3 — Less than 4 hours","4 — Less than 2 hours","5 — Cannot sleep"]},
      {id:"odi_sex",label:"Sex Life",options:["0 — Normal, no extra pain","1 — Normal but painful","2 — Nearly normal, very painful","3 — Severely restricted","4 — Nearly absent","5 — N/A"]},
      {id:"odi_social",label:"Social Life",options:["0 — Normal, no extra pain","1 — Normal but extra pain","2 — No effect except energetic","3 — Restricted, home-based","4 — No social life","5 — Pain everywhere"]},
      {id:"odi_travel",label:"Travelling",options:["0 — Anywhere, no extra pain","1 — Anywhere but extra pain","2 — Over 2 hours","3 — Under 1 hour","4 — Under 30 minutes","5 — Doctor/hospital only"]},
    ],
    score:(v)=>{const ids=["odi_pain","odi_personal","odi_lifting","odi_walking","odi_sitting","odi_standing","odi_sleeping","odi_sex","odi_social","odi_travel"];const s=ids.map(id=>v[id]?+v[id].split(" — ")[0]:null).filter(x=>x!==null);return s.length?Math.round(s.reduce((a,b)=>a+b,0)/(s.length*5)*100):null;}
  },
  dash:{id:"dash",label:"DASH",full:"Disabilities of Arm, Shoulder & Hand",icon:"💪",category:"Upper Limb",
    maxScore:100,unit:"%",mcid:10,
    interpret:(s)=>s<=20?{label:"Minimal",color:"#16a34a"}:s<=40?{label:"Mild",color:"#0891b2"}:s<=60?{label:"Moderate",color:"#d97706"}:s<=80?{label:"Severe",color:"#ea580c"}:{label:"Extreme",color:"#dc2626"},
    fields:[
      {id:"dash_q1",label:"Open a tight jar",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q2",label:"Write",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q3",label:"Turn a key",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q4",label:"Prepare a meal",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q5",label:"Push open a heavy door",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q6",label:"Place object on shelf above head",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q7",label:"Heavy household chores",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q8",label:"Garden or do yard work",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q9",label:"Make a bed",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q10",label:"Carry a shopping bag",options:["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"]},
      {id:"dash_q21",label:"Pain — usual activities",options:["1 — None","2 — Mild","3 — Moderate","4 — Severe","5 — Extreme"]},
      {id:"dash_q22",label:"Arm/shoulder/hand pain during activity",options:["1 — None","2 — Mild","3 — Moderate","4 — Severe","5 — Extreme"]},
    ],
    score:(v)=>{const ids=Object.keys(v).filter(k=>k.startsWith("dash_q"));const s=ids.map(id=>parseFloat(v[id])).filter(x=>x>0);return s.length>=10?Math.round(((s.reduce((a,b)=>a+b,0)/s.length)-1)/4*100):null;}
  },
  psfs:{id:"psfs",label:"PSFS",full:"Patient Specific Functional Scale",icon:"🎯",category:"Function",
    maxScore:10,unit:"/10",mcid:2,
    interpret:(s)=>s>=7?{label:"Good function",color:"#16a34a"}:s>=4?{label:"Moderate",color:"#d97706"}:{label:"Poor function",color:"#dc2626"},
    fields:[
      {id:"psfs_act1",label:"Activity 1 — name & rate",options:["0","1","2","3","4","5","6","7","8","9","10"],type:"activity"},
      {id:"psfs_act2",label:"Activity 2 — name & rate",options:["0","1","2","3","4","5","6","7","8","9","10"],type:"activity"},
      {id:"psfs_act3",label:"Activity 3 — name & rate",options:["0","1","2","3","4","5","6","7","8","9","10"],type:"activity"},
    ],
    score:(v)=>{const s=[v.psfs_score1,v.psfs_score2,v.psfs_score3].map(x=>parseFloat(x)).filter(x=>!isNaN(x));return s.length?Math.round(s.reduce((a,b)=>a+b,0)/s.length*10)/10:null;}
  },
  tsk:{id:"tsk",label:"TSK-11",full:"Tampa Scale of Kinesiophobia",icon:"🧠",category:"Psychological",
    maxScore:44,unit:"/44",mcid:4,
    interpret:(s)=>s<23?{label:"Low fear",color:"#16a34a"}:s<33?{label:"Moderate fear",color:"#d97706"}:{label:"High fear-avoidance",color:"#dc2626"},
    fields:[
      {id:"tsk1",label:"I'm afraid I might hurt myself if I exercise",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk2",label:"If I push through pain I could hurt myself",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk3",label:"My body is telling me something dangerous",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk4",label:"People don't understand how serious my pain is",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk5",label:"My accident/injury has put my body at risk",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk6",label:"Pain means I have injured myself",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk7",label:"Simply being careful prevents pain from worsening",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk8",label:"I would not have this much pain if something was not wrong",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk9",label:"I am afraid I might injure myself accidentally",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk10",label:"The safest way is to avoid activities that cause pain",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
      {id:"tsk11",label:"I wouldn't have this pain if there wasn't something medically wrong",options:["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"]},
    ],
    score:(v)=>{const ids=Array.from({length:11},(_,i)=>`tsk${i+1}`);const s=ids.map(id=>v[id]?+v[id].split(" — ")[0]:null).filter(x=>x!==null);return s.length===11?s.reduce((a,b)=>a+b,0):null;}
  },
  vas:{id:"vas",label:"VAS",full:"Visual Analogue Scale — Pain",icon:"📏",category:"Pain",
    maxScore:10,unit:"/10",mcid:2,
    interpret:(s)=>s<=3?{label:"Mild pain",color:"#16a34a"}:s<=6?{label:"Moderate pain",color:"#d97706"}:{label:"Severe pain",color:"#dc2626"},
    fields:[{id:"vas_score",label:"Current pain level (0 = no pain, 10 = worst imaginable)",options:["0","1","2","3","4","5","6","7","8","9","10"],type:"slider"}],
    score:(v)=>v.vas_score!==undefined?+v.vas_score:null
  },
};

Object.assign(SCALES, {

  // ── BERG BALANCE SCALE ──────────────────────────────────────────────────────
  bbs:{id:"bbs",label:"BBS",full:"Berg Balance Scale",icon:"⚖️",category:"Balance / Gait",
    maxScore:56,unit:"/56",mcid:4,
    interpret:(s)=>s>=45?{label:"Low fall risk",color:"#16a34a"}:s>=36?{label:"Medium fall risk",color:"#d97706"}:{label:"High fall risk",color:"#dc2626"},
    score:(v)=>{
      const ids=Array.from({length:14},(_,i)=>`bbs_${i+1}`);
      const s=ids.map(id=>v[id]!==undefined?+v[id]:null).filter(x=>x!==null);
      return s.length===14?s.reduce((a,b)=>a+b,0):null;
    },
    fields:[
      {id:"bbs_1",label:"1. Sitting to standing — without using hands",options:["4 — Able to stand without using hands, stable independently","3 — Able to stand independently using hands","2 — Able to stand using hands after several tries","1 — Needs minimal aid to stand or stabilise","0 — Needs moderate or maximum assistance to stand"]},
      {id:"bbs_2",label:"2. Standing unsupported — 2 minutes",options:["4 — Able to stand safely for 2 minutes","3 — Able to stand for 2 minutes with supervision","2 — Able to stand for 30 seconds unsupported","1 — Needs several tries to stand 30 seconds","0 — Unable to stand 30 seconds unassisted"]},
      {id:"bbs_3",label:"3. Sitting unsupported — feet on floor, 2 min",options:["4 — Able to sit safely and securely for 2 minutes","3 — Able to sit for 2 minutes with supervision","2 — Able to sit for 30 seconds","1 — Able to sit for 10 seconds","0 — Unable to sit without support for 10 seconds"]},
      {id:"bbs_4",label:"4. Standing to sitting",options:["4 — Sits safely with minimal use of hands","3 — Controls descent using hands","2 — Uses back of legs against chair to control","1 — Sits independently but has uncontrolled descent","0 — Needs assistance to sit"]},
      {id:"bbs_5",label:"5. Transfers",options:["4 — Able to transfer safely with minor use of hands","3 — Able to transfer safely, needs hands","2 — Able to transfer with verbal cuing and/or supervision","1 — Needs one person to assist","0 — Needs two people to assist or supervise"]},
      {id:"bbs_6",label:"6. Standing unsupported with eyes closed — 10 sec",options:["4 — Able to stand for 10 seconds safely","3 — Able to stand for 10 seconds with supervision","2 — Able to stand for 3 seconds","1 — Unable to keep eyes closed 3 seconds but stays safely","0 — Needs help to keep from falling"]},
      {id:"bbs_7",label:"7. Standing with feet together — unsupported 1 min",options:["4 — Independently places feet together and stands 1 minute","3 — Independently places feet together and stands 1 minute with supervision","2 — Independently places feet together and stands 30 seconds","1 — Needs help to attain position but stands 15 seconds","0 — Needs help to attain position and unable to stand 15 seconds"]},
      {id:"bbs_8",label:"8. Reaching forward with outstretched arm",options:["4 — Can reach forward >25 cm (10 inches) confidently","3 — Can reach forward >12.5 cm (5 inches) safely","2 — Can reach forward >5 cm (2 inches) safely","1 — Reaches forward but needs supervision","0 — Loses balance while trying / needs external support"]},
      {id:"bbs_9",label:"9. Retrieve object from floor (standing)",options:["4 — Able to pick up object safely and easily","3 — Able to pick up object but needs supervision","2 — Unable to pick up object — reaches 2–5 cm, maintains balance","1 — Unable to pick up object, needs supervision while trying","0 — Unable to try / needs assistance to keep from losing balance"]},
      {id:"bbs_10",label:"10. Turning to look behind — both sides",options:["4 — Looks behind from both sides and weight shifts well","3 — Looks behind one side only; less weight shift","2 — Turns to side only but maintains balance","1 — Needs supervision when turning","0 — Needs assistance to keep from losing balance"]},
      {id:"bbs_11",label:"11. Turn 360 degrees",options:["4 — Able to turn 360 safely in ≤4 seconds each side","3 — Able to turn 360 safely to one side only in ≤4 seconds","2 — Able to turn 360 safely but slowly","1 — Needs close supervision or verbal cuing","0 — Needs assistance while turning"]},
      {id:"bbs_12",label:"12. Alternating foot taps — 8 total on step",options:["4 — Able to stand independently and complete 8 steps in ≤20 seconds","3 — Able to stand independently and complete 8 steps in >20 seconds","2 — Able to complete 4 steps without aid with supervision","1 — Able to complete >2 steps, needs minimal assist","0 — Needs assistance to keep from falling / unable to try"]},
      {id:"bbs_13",label:"13. Standing with one foot in front (tandem) — 30 sec",options:["4 — Able to place foot tandem independently and hold 30 seconds","3 — Able to place foot ahead of other independently and hold 30 seconds","2 — Able to take small step independently and hold 30 seconds","1 — Needs help to step but can hold 15 seconds","0 — Loses balance while stepping or standing"]},
      {id:"bbs_14",label:"14. Standing on one leg — unsupported",options:["4 — Able to lift leg independently and hold >10 seconds","3 — Able to lift leg independently and hold 5–10 seconds","2 — Able to lift leg independently and hold ≥3 seconds","1 — Tries to lift leg, unable to hold 3 seconds, remains standing","0 — Unable to try or needs assistance to prevent fall"]},
    ]
  },

  // ── TUG ────────────────────────────────────────────────────────────────────
  tug:{id:"tug",label:"TUG",full:"Timed Up and Go Test",icon:"⏱",category:"Balance / Gait",
    maxScore:30,unit:"sec",mcid:3.5,
    interpret:(s)=>s<=10?{label:"Freely mobile",color:"#16a34a"}:s<=13.5?{label:"Mostly independent",color:"#0891b2"}:s<=20?{label:"Variable mobility",color:"#d97706"}:{label:"High fall risk",color:"#dc2626"},
    score:(v)=>v.tug_time?+v.tug_time:null,
    fields:[
      {id:"tug_time",label:"Time (seconds) — Rise from chair, walk 3m, turn, return, sit",options:[],type:"timer"},
      {id:"tug_aid",label:"Walking aid used",options:["None — independent","Stick / cane","Crutches","Frame / walker","Wheelchair"]},
    ]
  },

  // ── 10MWT ─────────────────────────────────────────────────────────────────
  mwt10:{id:"mwt10",label:"10MWT",full:"10 Metre Walk Test",icon:"🚶",category:"Balance / Gait",
    maxScore:2.5,unit:"m/s",mcid:0.1,
    interpret:(s)=>s>=1.2?{label:"Community ambulator",color:"#16a34a"}:s>=0.8?{label:"Limited community",color:"#0891b2"}:s>=0.4?{label:"Household ambulat.",color:"#d97706"}:{label:"Non-functional",color:"#dc2626"},
    score:(v)=>v.mwt_time&&+v.mwt_time>0?+((10/+v.mwt_time).toFixed(2)):null,
    fields:[
      {id:"mwt_time",label:"Time to walk 10 metres (seconds) — middle 10m of 14m course",options:[],type:"timer"},
      {id:"mwt_trials",label:"Number of trials averaged",options:["1 trial","Average of 2 trials","Average of 3 trials"]},
    ]
  },

  // ── DGI ────────────────────────────────────────────────────────────────────
  dgi:{id:"dgi",label:"DGI",full:"Dynamic Gait Index",icon:"🏃",category:"Balance / Gait",
    maxScore:24,unit:"/24",mcid:3,
    interpret:(s)=>s>=22?{label:"Community ambulation",color:"#16a34a"}:s>=19?{label:"Some fall risk",color:"#d97706"}:{label:"High fall risk",color:"#dc2626"},
    score:(v)=>{const ids=Array.from({length:8},(_,i)=>`dgi_${i+1}`);const s=ids.map(id=>v[id]!==undefined?+v[id]:null).filter(x=>x!==null);return s.length===8?s.reduce((a,b)=>a+b,0):null;},
    fields:[
      {id:"dgi_1",label:"1. Gait on level surface — 6 metres",options:["3 — Normal, no assistive device, good pace, no imbalance","2 — Mild — uses device, slower speed, mild gait deviations","1 — Moderate — slow speed, abnormal gait, evidence of imbalance","0 — Severe — cannot walk without assistance, severe imbalance"]},
      {id:"dgi_2",label:"2. Gait with speed changes (normal → fast → slow)",options:["3 — Performs smoothly, no difficulty, no gait deviation","2 — Mild — unable to change speed smoothly, minor deviations","1 — Moderate — unable to change speed, significant deviations","0 — Severe — cannot change speed, loses balance"]},
      {id:"dgi_3",label:"3. Gait with horizontal head turns (look left/right)",options:["3 — Performs smoothly, no change in gait","2 — Mild — gait speed changes, smooth head movement","1 — Moderate — gait problems with head turns, slows down","0 — Severe — stops or loses balance"]},
      {id:"dgi_4",label:"4. Gait with vertical head turns (look up/down)",options:["3 — Performs smoothly, no change in gait","2 — Mild — gait speed changes, smooth head movement","1 — Moderate — gait problems with head turns","0 — Severe — stops or loses balance"]},
      {id:"dgi_5",label:"5. Gait with pivot turn",options:["3 — Pivots safely in ≤3 steps, no loss of balance","2 — Pivots safely in >4 steps, no loss of balance","1 — Pivots slowly, requires verbal cuing, steps to prevent fall","0 — Cannot pivot safely, requires assistance"]},
      {id:"dgi_6",label:"6. Step over obstacle (shoebox on floor)",options:["3 — Able to step over, no change in gait","2 — Steps over but slows down","1 — Steps over but significantly slows or requires supervision","0 — Cannot step over, trips"]},
      {id:"dgi_7",label:"7. Step around two obstacles (cones)",options:["3 — Able to walk around, no change in gait","2 — Moves around both cones, slows down slightly","1 — Significant slowing, requires supervision","0 — Cannot walk around obstacles without assistance"]},
      {id:"dgi_8",label:"8. Steps — up and down stairs",options:["3 — Alternating feet, no rail","2 — Alternating feet, must use rail","1 — Two feet per step, must use rail","0 — Cannot do safely"]},
    ]
  },

  // ── FAC ────────────────────────────────────────────────────────────────────
  fac:{id:"fac",label:"FAC",full:"Functional Ambulation Classification",icon:"🦽",category:"Balance / Gait",
    maxScore:5,unit:"/5",mcid:1,
    interpret:(s)=>s>=5?{label:"Independent all terrain",color:"#16a34a"}:s>=3?{label:"Supervised / limited",color:"#0891b2"}:s>=1?{label:"Dependent — assist needed",color:"#d97706"}:{label:"Non-ambulatory",color:"#dc2626"},
    score:(v)=>v.fac_score!==undefined?+v.fac_score:null,
    fields:[
      {id:"fac_score",label:"Functional Ambulation Level",options:["0 — Non-functional: unable to ambulate, uses wheelchair","1 — Dependent level 2: requires physical assist — continuous","2 — Dependent level 1: requires physical assist — intermittent","3 — Supervised: requires supervision but no physical contact","4 — Independent level 1: on level surfaces only","5 — Independent level 2: any surface, stairs, slopes, uneven"]}
    ]
  },

  // ── ASIA SCALE ─────────────────────────────────────────────────────────────
  asia:{id:"asia",label:"ASIA",full:"ASIA Impairment Scale (SCI Classification)",icon:"🦾",category:"Neurological / SCI",
    maxScore:100,unit:" motor pts",mcid:4,
    adminNote:"Test each key muscle bilaterally using standard 0-5 MMT grading, and each dermatome bilaterally for pinprick and light touch, following the official ASIA worksheet and dermatome map. The Neurological Level of Injury (NLI) is the most caudal level with normal motor and sensory function on both sides. Grade A through E is then determined by whether any sacral sparing (S4-5) is present and how much motor function remains below the NLI.",
    interpret:(s)=>s>=80?{label:"AIS D/E — Incomplete",color:"#16a34a"}:s>=50?{label:"AIS C/D — Incomplete",color:"#0891b2"}:s>=20?{label:"AIS B/C — Incomplete",color:"#d97706"}:{label:"AIS A/B — Severe",color:"#dc2626"},
    score:(v)=>{
      const levels=["c5","c6","c7","c8","t1","l2","l3","l4","l5","s1"];
      const s=levels.flatMap(l=>[`asia_m_${l}_l`,`asia_m_${l}_r`]).map(id=>v[id]?+v[id]:null).filter(x=>x!==null);
      return s.length===20?s.reduce((a,b)=>a+b,0):null;
    },
    fields:[
      // Grade first
      {id:"asia_grade",label:"ASIA Impairment Scale Grade",options:["A — Complete: no motor/sensory function below injury level","B — Incomplete: sensory only below injury level","C — Incomplete: motor preserved, >50% key muscles below NLI grade <3","D — Incomplete: motor preserved, ≥50% key muscles below NLI grade ≥3","E — Normal: motor and sensory function normal"]},
      {id:"asia_nli",label:"Neurological Level of Injury (NLI)",options:["C1","C2","C3","C4","C5","C6","C7","C8","T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5","S1","S2","S3","S4-5"]},
      // Upper extremity motor (bilateral, 0-5 each)
      {id:"asia_m_c5_r",label:"Motor: C5 — Elbow Flexors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c5_l",label:"Motor: C5 — Elbow Flexors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c6_r",label:"Motor: C6 — Wrist Extensors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c6_l",label:"Motor: C6 — Wrist Extensors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c7_r",label:"Motor: C7 — Elbow Extensors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c7_l",label:"Motor: C7 — Elbow Extensors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c8_r",label:"Motor: C8 — Finger Flexors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_c8_l",label:"Motor: C8 — Finger Flexors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_t1_r",label:"Motor: T1 — Finger Abductors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_t1_l",label:"Motor: T1 — Finger Abductors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      // Lower extremity motor (bilateral)
      {id:"asia_m_l2_r",label:"Motor: L2 — Hip Flexors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l2_l",label:"Motor: L2 — Hip Flexors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l3_r",label:"Motor: L3 — Knee Extensors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l3_l",label:"Motor: L3 — Knee Extensors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l4_r",label:"Motor: L4 — Ankle Dorsiflexors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l4_l",label:"Motor: L4 — Ankle Dorsiflexors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l5_r",label:"Motor: L5 — Long Toe Extensors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_l5_l",label:"Motor: L5 — Long Toe Extensors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_s1_r",label:"Motor: S1 — Ankle Plantar Flexors (Right)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      {id:"asia_m_s1_l",label:"Motor: S1 — Ankle Plantar Flexors (Left)",options:["0 — Total paralysis","1 — Palpable/visible contraction","2 — Active movement, gravity eliminated","3 — Active movement against gravity","4 — Active movement against some resistance","5 — Normal"]},
      // Sacral sparing
      {id:"asia_vac",label:"VAC — Voluntary Anal Contraction",options:["Present — voluntary contraction felt (motor incomplete)","Absent — no voluntary contraction"]},
      {id:"asia_dap",label:"DAP — Deep Anal Pressure",options:["Present — any anal sensation","Absent"]},
    ]
  },
});
Object.assign(SCALES, {

  spadi:{id:"spadi",label:"SPADI",full:"Shoulder Pain & Disability Index",icon:"💪",category:"Shoulder",
    maxScore:100,unit:"%",mcid:13,
    interpret:(s)=>s<30?{label:"Mild",color:"#16a34a"}:s<60?{label:"Moderate",color:"#d97706"}:{label:"Severe disability",color:"#dc2626"},
    fields:[
      {id:"spadi_p1",label:"Pain — At its worst",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_p2",label:"Pain — Lying on involved side",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_p3",label:"Pain — Reaching for something on a high shelf",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_p4",label:"Pain — Touching the back of your neck",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_p5",label:"Pain — Pushing with the involved arm",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d1",label:"Disability — Washing your hair",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d2",label:"Disability — Washing your back",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d3",label:"Disability — Putting on an undershirt or jumper",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d4",label:"Disability — Putting on a shirt that buttons down the front",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d5",label:"Disability — Putting on your trousers",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d6",label:"Disability — Placing an object on a high shelf",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d7",label:"Disability — Carrying a heavy object (5 kg)",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
      {id:"spadi_d8",label:"Disability — Removing something from your back pocket",options:["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]},
    ],
    score:(v)=>{const ids=Object.keys(v).filter(k=>/^spadi_(p|d)\d+$/.test(k));const s=ids.map(id=>parseFloat(v[id])).filter(x=>!isNaN(x));return s.length>=10?Math.round(s.reduce((a,b)=>a+b,0)/(s.length*10)*100):null;}
  },

  koosjr:{id:"koosjr",label:"KOOS-JR",full:"Knee Injury & Osteoarthritis Outcome Score (Joint Replacement short form)",icon:"🦵",category:"Knee",
    maxScore:28,unit:"/28",mcid:5,
    interpret:(s)=>s<=7?{label:"Mild",color:"#16a34a"}:s<=14?{label:"Moderate",color:"#d97706"}:{label:"Severe",color:"#dc2626"},
    fields:[
      {id:"koosjr_1",label:"Stiffness — how severe is your knee stiffness after sitting/lying/resting later in the day?",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"koosjr_2",label:"Pain — twisting/pivoting on your knee",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"koosjr_3",label:"Pain — straightening knee fully",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"koosjr_4",label:"Pain — going up or down stairs",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"koosjr_5",label:"Pain — standing upright",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"koosjr_6",label:"Function — rising from sitting",options:["0 — No difficulty", "1 — Slight difficulty", "2 — Moderate difficulty", "3 — Extreme difficulty", "4 — Unable to do"]},
      {id:"koosjr_7",label:"Function — bending to floor / picking up an object",options:["0 — No difficulty", "1 — Slight difficulty", "2 — Moderate difficulty", "3 — Extreme difficulty", "4 — Unable to do"]},
    ],
    score:(v)=>{const ids=Array.from({length:7},(_,i)=>`koosjr_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length===7?s.reduce((a,b)=>a+b,0):null;}
  },

  hoosjr:{id:"hoosjr",label:"HOOS-JR",full:"Hip Disability & Osteoarthritis Outcome Score (Joint Replacement short form)",icon:"🦴",category:"Hip",
    maxScore:24,unit:"/24",mcid:5,
    interpret:(s)=>s<=6?{label:"Mild",color:"#16a34a"}:s<=12?{label:"Moderate",color:"#d97706"}:{label:"Severe",color:"#dc2626"},
    fields:[
      {id:"hoosjr_1",label:"Pain — going up or down stairs",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"hoosjr_2",label:"Pain — walking on an uneven surface",options:["0 — None", "1 — Mild", "2 — Moderate", "3 — Severe", "4 — Extreme"]},
      {id:"hoosjr_3",label:"Function — rising from sitting",options:["0 — No difficulty", "1 — Slight difficulty", "2 — Moderate difficulty", "3 — Extreme difficulty", "4 — Unable to do"]},
      {id:"hoosjr_4",label:"Function — bending to floor / picking up an object",options:["0 — No difficulty", "1 — Slight difficulty", "2 — Moderate difficulty", "3 — Extreme difficulty", "4 — Unable to do"]},
      {id:"hoosjr_5",label:"Function — lying in bed (turning over, maintaining hip position)",options:["0 — No difficulty", "1 — Slight difficulty", "2 — Moderate difficulty", "3 — Extreme difficulty", "4 — Unable to do"]},
      {id:"hoosjr_6",label:"Function — sitting",options:["0 — No difficulty", "1 — Slight difficulty", "2 — Moderate difficulty", "3 — Extreme difficulty", "4 — Unable to do"]},
    ],
    score:(v)=>{const ids=Array.from({length:6},(_,i)=>`hoosjr_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length===6?s.reduce((a,b)=>a+b,0):null;}
  },

  faam:{id:"faam",label:"FAAM",full:"Foot & Ankle Ability Measure — ADL subscale",icon:"🦶",category:"Foot & Ankle",
    maxScore:100,unit:"%",mcid:8,
    interpret:(s)=>s>=90?{label:"Normal function",color:"#16a34a"}:s>=70?{label:"Mild deficit",color:"#0891b2"}:s>=50?{label:"Moderate deficit",color:"#d97706"}:{label:"Severe deficit",color:"#dc2626"},
    fields:[
      {id:"faam_1",label:"Standing",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_2",label:"Walking on even ground",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_3",label:"Walking on even ground without shoes",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_4",label:"Walking up hills",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_5",label:"Walking down hills",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_6",label:"Going up stairs",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_7",label:"Going down stairs",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_8",label:"Walking on uneven ground",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_9",label:"Stepping up and down curbs",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_10",label:"Squatting",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_11",label:"Coming up on your toes",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_12",label:"Walking initially",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_13",label:"Walking 5 minutes or less",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_14",label:"Walking approximately 10 minutes",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_15",label:"Walking 15 minutes or more",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_16",label:"Home responsibilities",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_17",label:"Activities of daily living",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_18",label:"Personal care",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_19",label:"Light to moderate work (standing, walking)",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_20",label:"Heavy work (push/pull, climbing, carrying)",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
      {id:"faam_21",label:"Recreational activities",options:["4 — No difficulty", "3 — Slight difficulty", "2 — Moderate difficulty", "1 — Extreme difficulty", "0 — Unable to do"]},
    ],
    score:(v)=>{const ids=Array.from({length:21},(_,i)=>`faam_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length>=19?Math.round(s.reduce((a,b)=>a+b,0)/(s.length*4)*100):null;}
  },

  lefs:{id:"lefs",label:"LEFS",full:"Lower Extremity Functional Scale",icon:"🦿",category:"Lower Limb",
    maxScore:80,unit:"/80",mcid:9,
    interpret:(s)=>s>=60?{label:"Good function",color:"#16a34a"}:s>=40?{label:"Moderate limitation",color:"#0891b2"}:s>=20?{label:"Significant limitation",color:"#d97706"}:{label:"Severe limitation",color:"#dc2626"},
    fields:[
      {id:"lefs_1",label:"Any of your usual work, housework or school activities",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_2",label:"Your usual hobbies, recreational or sporting activities",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_3",label:"Getting into or out of the bath",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_4",label:"Walking between rooms",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_5",label:"Putting on your shoes or socks",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_6",label:"Squatting",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_7",label:"Lifting an object from the floor",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_8",label:"Performing light activities around your home",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_9",label:"Performing heavy activities around your home",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_10",label:"Getting into or out of a car",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_11",label:"Walking 2 blocks",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_12",label:"Walking 1.6 km (a mile)",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_13",label:"Going up or down 10 stairs",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_14",label:"Standing for 1 hour",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_15",label:"Sitting for 1 hour",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_16",label:"Running on even ground",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_17",label:"Running on uneven ground",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_18",label:"Making sharp turns while running fast",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_19",label:"Hopping",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
      {id:"lefs_20",label:"Rolling over in bed",options:["0 — Extreme difficulty / unable", "1 — Quite a bit of difficulty", "2 — Moderate difficulty", "3 — A little bit of difficulty", "4 — No difficulty"]},
    ],
    score:(v)=>{const ids=Array.from({length:20},(_,i)=>`lefs_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length===20?s.reduce((a,b)=>a+b,0):null;}
  },

  fabqpa:{id:"fabqpa",label:"FABQ-PA",full:"Fear-Avoidance Beliefs Questionnaire — Physical Activity",icon:"🧠",category:"Psychological",
    maxScore:24,unit:"/24",mcid:4,
    interpret:(s)=>s<=14?{label:"Low fear-avoidance",color:"#16a34a"}:{label:"High fear-avoidance (>14)",color:"#dc2626"},
    fields:[
      {id:"fabqpa_1",label:"Physical activity makes my pain worse",options:["0 — Completely disagree", "1", "2", "3", "4", "5", "6 — Completely agree"]},
      {id:"fabqpa_2",label:"Physical activity might harm my back/body",options:["0 — Completely disagree", "1", "2", "3", "4", "5", "6 — Completely agree"]},
      {id:"fabqpa_3",label:"I should not do physical activities which (might) make my pain worse",options:["0 — Completely disagree", "1", "2", "3", "4", "5", "6 — Completely agree"]},
      {id:"fabqpa_4",label:"I cannot do physical activities which (might) make my pain worse",options:["0 — Completely disagree", "1", "2", "3", "4", "5", "6 — Completely agree"]},
    ],
    score:(v)=>{const ids=Array.from({length:4},(_,i)=>`fabqpa_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length===4?s.reduce((a,b)=>a+b,0):null;}
  },

  pcs:{id:"pcs",label:"PCS",full:"Pain Catastrophizing Scale",icon:"💭",category:"Psychological",
    maxScore:52,unit:"/52",mcid:6,
    interpret:(s)=>s<20?{label:"Low catastrophising",color:"#16a34a"}:s<30?{label:"Moderate",color:"#d97706"}:{label:"Clinically significant (≥30)",color:"#dc2626"},
    fields:[
      {id:"pcs_1",label:"I worry all the time about whether the pain will end",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_2",label:"I feel I can't go on",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_3",label:"It's terrible and I think it's never going to get any better",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_4",label:"It's awful and I feel that it overwhelms me",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_5",label:"I feel I can't stand it anymore",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_6",label:"I become afraid that the pain will get worse",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_7",label:"I keep thinking of other painful events",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_8",label:"I anxiously want the pain to go away",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_9",label:"I can't seem to keep it out of my mind",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_10",label:"I keep thinking about how much it hurts",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_11",label:"I keep thinking about how badly I want the pain to stop",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_12",label:"There's nothing I can do to reduce the intensity of the pain",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
      {id:"pcs_13",label:"I wonder whether something serious may happen",options:["0 — Not at all", "1 — To a slight degree", "2 — To a moderate degree", "3 — To a great degree", "4 — All the time"]},
    ],
    score:(v)=>{const ids=Array.from({length:13},(_,i)=>`pcs_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length===13?s.reduce((a,b)=>a+b,0):null;}
  },

  rmdq:{id:"rmdq",label:"RMDQ",full:"Roland-Morris Disability Questionnaire",icon:"🔙",category:"Lumbar Spine",
    maxScore:24,unit:"/24",mcid:5,
    interpret:(s)=>s<4?{label:"Minimal disability",color:"#16a34a"}:s<=14?{label:"Moderate",color:"#d97706"}:{label:"Severe disability",color:"#dc2626"},
    fields:[
      {id:"rmdq_1",label:"I stay at home most of the time because of my back",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_2",label:"I change position frequently to try to get comfortable",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_3",label:"I walk more slowly than usual",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_4",label:"I am not doing any of the jobs I usually do around the house",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_5",label:"I use a handrail to get upstairs",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_6",label:"I lie down to rest more often",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_7",label:"I have to hold on to something to get out of an easy chair",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_8",label:"I try to get other people to do things for me",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_9",label:"I get dressed more slowly than usual",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_10",label:"I only stand for short periods of time",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_11",label:"I try not to bend or kneel down",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_12",label:"I find it difficult to get out of a chair",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_13",label:"My back is painful almost all the time",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_14",label:"I find it difficult to turn over in bed",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_15",label:"My appetite is not very good",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_16",label:"I have trouble putting on my socks/stockings",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_17",label:"I only walk short distances",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_18",label:"I sleep less well on my back",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_19",label:"I get dressed with help from someone else",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_20",label:"I sit down for most of the day",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_21",label:"I avoid heavy jobs around the house",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_22",label:"I am more irritable and bad tempered than usual",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_23",label:"I go upstairs more slowly than usual",options:["0 — No", "1 — Yes"]},
      {id:"rmdq_24",label:"I stay in bed most of the time",options:["0 — No", "1 — Yes"]},
    ],
    score:(v)=>{const ids=Array.from({length:24},(_,i)=>`rmdq_${i+1}`);const s=ids.map(id=>v[id]!==undefined&&v[id]!==""?parseFloat(v[id]):null).filter(x=>x!==null&&!isNaN(x));return s.length===24?s.reduce((a,b)=>a+b,0):null;}
  },
});
Object.assign(SCALES, {

  nihss:{id:"nihss",label:"NIHSS",full:"NIH Stroke Scale",icon:"🧠",category:"Stroke",
    maxScore:42,unit:"/42",mcid:2,
    adminNote:"Score each item in the order presented, using the first response given -- do not coach or repeat commands beyond what the protocol allows. Score what the patient actually does, not what they seem capable of. If a limb is amputated, jointed, or otherwise untestable, mark that item separately and exclude it from the total rather than scoring it as normal.",
    interpret:(s)=>s===0?{label:"No stroke symptoms",color:"#16a34a"}:s<=4?{label:"Minor stroke",color:"#65a30d"}:s<=15?{label:"Moderate stroke",color:"#d97706"}:s<=20?{label:"Moderate-severe stroke",color:"#ea580c"}:{label:"Severe stroke",color:"#dc2626"},
    fields:[
      {id:"nihss_1a",label:"1a. Level of Consciousness (LOC)",options:["0 — Alert, keenly responsive","1 — Not alert, arousable by minor stimulation","2 — Not alert, requires repeated stimulation or obtunded","3 — Unresponsive, or only reflex motor/autonomic responses"]},
      {id:"nihss_1b",label:"1b. LOC Questions (ask month, age)",options:["0 — Answers both correctly","1 — Answers one correctly","2 — Answers neither correctly"]},
      {id:"nihss_1c",label:"1c. LOC Commands (open/close eyes, grip/release)",options:["0 — Performs both correctly","1 — Performs one correctly","2 — Performs neither correctly"]},
      {id:"nihss_2",label:"2. Best Gaze",options:["0 — Normal","1 — Partial gaze palsy","2 — Forced deviation or total gaze paresis"]},
      {id:"nihss_3",label:"3. Visual Fields",options:["0 — No visual loss","1 — Partial hemianopia","2 — Complete hemianopia","3 — Bilateral hemianopia (including cortical blindness)"]},
      {id:"nihss_4",label:"4. Facial Palsy",options:["0 — Normal symmetrical movement","1 — Minor paralysis (flattened nasolabial fold)","2 — Partial paralysis (near-total lower face paralysis)","3 — Complete paralysis of upper + lower face, one or both sides"]},
      {id:"nihss_5a",label:"5a. Motor Arm — Left (hold 90°/45° x10sec)",options:["0 — No drift","1 — Drift, doesn't hit bed","2 — Some effort against gravity, drifts to bed","3 — No effort against gravity, limb falls","4 — No movement"]},
      {id:"nihss_5b",label:"5b. Motor Arm — Right (hold 90°/45° x10sec)",options:["0 — No drift","1 — Drift, doesn't hit bed","2 — Some effort against gravity, drifts to bed","3 — No effort against gravity, limb falls","4 — No movement"]},
      {id:"nihss_6a",label:"6a. Motor Leg — Left (hold 30° x5sec)",options:["0 — No drift","1 — Drift, doesn't hit bed","2 — Some effort against gravity","3 — No effort against gravity, falls immediately","4 — No movement"]},
      {id:"nihss_6b",label:"6b. Motor Leg — Right (hold 30° x5sec)",options:["0 — No drift","1 — Drift, doesn't hit bed","2 — Some effort against gravity","3 — No effort against gravity, falls immediately","4 — No movement"]},
      {id:"nihss_7",label:"7. Limb Ataxia (finger-nose, heel-shin)",options:["0 — Absent","1 — Present in one limb","2 — Present in two limbs"]},
      {id:"nihss_8",label:"8. Sensory (pinprick, withdrawal to pain)",options:["0 — Normal, no sensory loss","1 — Mild-moderate sensory loss","2 — Severe to total sensory loss"]},
      {id:"nihss_9",label:"9. Best Language",options:["0 — No aphasia","1 — Mild-moderate aphasia","2 — Severe aphasia","3 — Mute, global aphasia"]},
      {id:"nihss_10",label:"10. Dysarthria",options:["0 — Normal articulation","1 — Mild-moderate dysarthria, slurring but understandable","2 — Severe dysarthria, unintelligible or anarthric"]},
      {id:"nihss_11",label:"11. Extinction / Inattention (neglect)",options:["0 — No abnormality","1 — Mild — inattention/extinction to one modality","2 — Severe — hemi-inattention to more than one modality"]},
    ],
    score:(v)=>{const ids=["nihss_1a","nihss_1b","nihss_1c","nihss_2","nihss_3","nihss_4","nihss_5a","nihss_5b","nihss_6a","nihss_6b","nihss_7","nihss_8","nihss_9","nihss_10","nihss_11"];const s=ids.map(id=>v[id]?+v[id].split(" — ")[0]:null).filter(x=>x!==null);return s.length?s.reduce((a,b)=>a+b,0):null;}
  },

  brunnstrom:{id:"brunnstrom",label:"Brunnstrom",full:"Brunnstrom Stages of Stroke Recovery — Arm, Hand, Leg",icon:"🔄",category:"Stroke",
    maxScore:18,unit:"/18",mcid:1,
    adminNote:"Stage each segment separately -- arm, hand, and leg often recover at different rates, so a single combined score can hide clinically important differences between them. Base each rating on the best movement quality observed, not just whether a movement happened at all.",
    interpret:(s)=>{
      const avg=s/3;
      return avg<2?{label:"Severe — flaccid to early synergy",color:"#dc2626"}:avg<3.5?{label:"Moderate — synergy-dependent movement",color:"#d97706"}:avg<5?{label:"Good — movement beyond synergy",color:"#0891b2"}:{label:"Near-full recovery — isolated joint control",color:"#16a34a"};
    },
    fields:[
      {id:"brunnstrom_arm",label:"Arm",options:["1 — I. Flaccid: no voluntary movement can be initiated","2 — II. Spasticity begins to appear; minimal voluntary movement, synergy patterns emerge as associated reactions","3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy","4 — IV. Spasticity declining; some movement combinations outside basic synergy are mastered","5 — V. Spasticity continues to decline; more complex movement combinations independent of synergy","6 — VI. Spasticity minimal or absent; isolated joint movement possible, coordination near normal"]},
      {id:"brunnstrom_hand",label:"Hand",options:["1 — I. Flaccid: no voluntary movement can be initiated","2 — II. Spasticity begins to appear; minimal voluntary movement, synergy patterns emerge as associated reactions","3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy","4 — IV. Spasticity declining; some movement combinations outside basic synergy are mastered","5 — V. Spasticity continues to decline; more complex movement combinations independent of synergy","6 — VI. Spasticity minimal or absent; isolated joint movement possible, coordination near normal"]},
      {id:"brunnstrom_leg",label:"Leg",options:["1 — I. Flaccid: no voluntary movement can be initiated","2 — II. Spasticity begins to appear; minimal voluntary movement, synergy patterns emerge as associated reactions","3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy","4 — IV. Spasticity declining; some movement combinations outside basic synergy are mastered","5 — V. Spasticity continues to decline; more complex movement combinations independent of synergy","6 — VI. Spasticity minimal or absent; isolated joint movement possible, coordination near normal"]},
    ],
    score:(v)=>{
      const ids=["brunnstrom_arm","brunnstrom_hand","brunnstrom_leg"];
      const vals=ids.map(id=>v[id]?+v[id].split(" — ")[0]:null).filter(x=>x!==null);
      return vals.length===3?vals.reduce((a,b)=>a+b,0):null;
    }
  },

  rankin:{id:"rankin",label:"mRS",full:"Modified Rankin Scale — Global Disability",icon:"🎯",category:"Stroke",
    maxScore:6,unit:"/6",mcid:1,
    adminNote:"Rate based on the patient current functional state, not their pre-stroke baseline or their potential with further rehab. When in doubt between two adjacent grades, the standard convention is to select the higher (more disabled) grade.",
    interpret:(s)=>s<=1?{label:"No significant disability",color:"#16a34a"}:s===2?{label:"Slight disability",color:"#65a30d"}:s===3?{label:"Moderate disability",color:"#d97706"}:s===4?{label:"Moderately severe disability",color:"#ea580c"}:s===5?{label:"Severe disability",color:"#dc2626"}:{label:"Death",color:"#450a0a"},
    fields:[
      {id:"rankin_grade",label:"Modified Rankin Scale Grade",options:[
        "0 — No residual symptoms",
        "1 — No significant disability; able to carry out all pre-stroke activities",
        "2 — Slight disability; able to look after own affairs without assistance, but unable to carry out all previous activities",
        "3 — Moderate disability; requires some help, but able to walk unassisted",
        "4 — Moderately severe disability; unable to attend to own bodily needs without assistance, unable to walk unassisted",
        "5 — Severe disability; bedridden, incontinent, requires constant nursing care and attention",
        "6 — Death",
      ]},
    ],
    score:(v)=>v.rankin_grade?+v.rankin_grade.split(" — ")[0]:null
  },

  hoehnyahr:{id:"hoehnyahr",label:"H&Y",full:"Hoehn and Yahr Scale — Parkinson Disease Staging",icon:"🌀",category:"Parkinson's",
    maxScore:5,unit:"",mcid:1,
    adminNote:"Base the stage on the patient current, medicated (\"on\") state unless you are specifically documenting an \"off\" period, and note which state you assessed in. Stage reflects bilateral vs unilateral involvement and postural stability, not tremor severity alone.",
    interpret:(s)=>s===0?{label:"No signs of disease",color:"#16a34a"}:s===1?{label:"Unilateral involvement only",color:"#65a30d"}:s===2?{label:"Bilateral involvement, no balance impairment",color:"#0891b2"}:s===3?{label:"Bilateral involvement with mild-moderate postural instability, physically independent",color:"#d97706"}:s===4?{label:"Severe disability, still able to walk or stand unassisted",color:"#ea580c"}:{label:"Wheelchair-bound or bedridden unless aided",color:"#dc2626"},
    fields:[
      {id:"hoehnyahr_stage",label:"Hoehn and Yahr Stage",options:[
        "0 — No signs of disease",
        "1 — Unilateral involvement only, usually minimal or no functional impairment",
        "2 — Bilateral or midline involvement, without impairment of balance",
        "3 — Bilateral disease with mild to moderate postural instability, physically independent",
        "4 — Severely disabling disease, still able to walk or stand unassisted",
        "5 — Confined to bed or wheelchair unless aided",
      ]},
    ],
    score:(v)=>v.hoehnyahr_stage!==undefined?+v.hoehnyahr_stage.split(" — ")[0]:null
  },

  pdrigidity:{id:"pdrigidity",label:"Rigidity",full:"Parkinsonian Rigidity Grading (per limb)",icon:"🔗",category:"Parkinson's",
    maxScore:4,unit:"/4",mcid:1,
    adminNote:"Rigidity is NOT the same as spasticity -- it is a constant resistance through the full range regardless of movement speed (unlike spasticity, which is velocity-dependent), often with a ratchety \"cogwheel\" quality when tremor is superimposed on lead-pipe rigidity. Move each limb slowly through its full passive range with the patient relaxed and not anticipating the movement -- ask them to look away or perform a distracting task (e.g. tapping the opposite hand) since voluntary relaxation is difficult and distraction reveals true tone.",
    interpret:(s)=>s===0?{label:"No rigidity",color:"#16a34a"}:s===1?{label:"Mild, detectable only with reinforcement",color:"#65a30d"}:s===2?{label:"Mild to moderate",color:"#d97706"}:s===3?{label:"Marked, full range still easily achieved",color:"#ea580c"}:{label:"Severe, range achieved with difficulty",color:"#dc2626"},
    fields:[
      {id:"pdrigidity_upper",label:"Upper limb",options:["0 — No rigidity","1 — Mild, only detectable with reinforcement (e.g. clenching the opposite fist)","2 — Mild to moderate","3 — Marked, but full range of motion still easily achieved","4 — Severe, range of motion achieved with difficulty"]},
      {id:"pdrigidity_lower",label:"Lower limb",options:["0 — No rigidity","1 — Mild, only detectable with reinforcement","2 — Mild to moderate","3 — Marked, but full range of motion still easily achieved","4 — Severe, range of motion achieved with difficulty"]},
      {id:"pdrigidity_neck",label:"Neck",options:["0 — No rigidity","1 — Mild, only detectable with reinforcement","2 — Mild to moderate","3 — Marked, but full range of motion still easily achieved","4 — Severe, range of motion achieved with difficulty"]},
    ],
    score:(v)=>{
      const ids=["pdrigidity_upper","pdrigidity_lower","pdrigidity_neck"];
      const vals=ids.map(id=>v[id]!==undefined?+v[id].split(" — ")[0]:null).filter(x=>x!==null);
      return vals.length?Math.max(...vals):null;
    }
  },

  updrs:{id:"updrs",label:"UPDRS",full:"MDS-UPDRS — Part Summary",icon:"📋",category:"Parkinson's",
    maxScore:260,unit:" pts",mcid:5,
    adminNote:"The MDS-UPDRS is copyrighted by the International Parkinson and Movement Disorder Society and cannot be embedded in software without a separate paid licence -- this records only the 4 part totals after you administer the official, licensed instrument (free individual training/certification is available at movementdisorders.org) elsewhere. Part I: non-motor experiences of daily living (max 52). Part II: motor experiences of daily living (max 52). Part III: motor examination (max 132). Part IV: motor complications (max 24).",
    interpret:(s)=>s<=32?{label:"Mild overall burden",color:"#16a34a"}:s<=58?{label:"Mild-moderate overall burden",color:"#65a30d"}:s<=89?{label:"Moderate overall burden",color:"#d97706"}:{label:"Severe overall burden",color:"#dc2626"},
    fields:[
      {id:"updrs_part1",label:"Part I — Non-motor experiences of daily living",note:"Total from the official Part I questionnaire (cognition, mood, sleep, autonomic symptoms).",options:["0","5","10","15","20","25","30","35","40","45","52"]},
      {id:"updrs_part2",label:"Part II — Motor experiences of daily living",note:"Total from the official Part II questionnaire (speech, swallowing, dressing, hygiene, walking, tremor impact).",options:["0","5","10","15","20","25","30","35","40","45","52"]},
      {id:"updrs_part3",label:"Part III — Motor examination",note:"Total from the official Part III motor exam (rigidity, bradykinesia, tremor, gait, postural stability).",options:["0","10","20","30","40","50","60","70","80","90","100","110","120","132"]},
      {id:"updrs_part4",label:"Part IV — Motor complications",note:"Total from the official Part IV (dyskinesias and motor fluctuations).",options:["0","4","8","12","16","20","24"]},
    ],
    score:(v)=>{
      const ids=["updrs_part1","updrs_part2","updrs_part3","updrs_part4"];
      const vals=ids.map(id=>v[id]!==undefined?+v[id]:null).filter(x=>x!==null);
      return vals.length?vals.reduce((a,b)=>a+b,0):null;
    }
  },

  edss:{id:"edss",label:"EDSS",full:"Kurtzke Expanded Disability Status Scale",icon:"🧬",category:"MS",
    maxScore:10,unit:"",mcid:1,
    adminNote:"The EDSS is not a simple sum of the 8 Functional System Scores (FSS) below -- Kurtzke overall grade combines the FSS pattern with ambulation status through a set of clinical rules with exceptions, so the FSS entries here are for documentation and tracking, while the overall grade is entered directly as your considered clinical judgement (in 0.5-point steps) rather than auto-calculated, to avoid giving a false impression of precision an automated sum cannot deliver.",
    interpret:(s)=>s<1?{label:"Normal neurological exam",color:"#16a34a"}:s<=2.5?{label:"Minimal disability, fully ambulatory",color:"#65a30d"}:s<=4?{label:"Moderate disability, ambulatory without aid or rest",color:"#0891b2"}:s<=5.5?{label:"Ambulation limited, requires rest or assistance to walk",color:"#d97706"}:s<=6.5?{label:"Requires a walking aid",color:"#ea580c"}:s<=7.5?{label:"Wheelchair-dependent",color:"#dc2626"}:{label:"Bedridden or restricted to bed/chair",color:"#450a0a"},
    fields:[
      {id:"edss_pyramidal",label:"Pyramidal Functional System",note:"Weakness or difficulty with movement due to corticospinal tract involvement.",options:["0 — Normal","1 — Abnormal signs, no disability","2 — Minimal disability","3 — Mild to moderate paraparesis or hemiparesis; severe monoparesis","4 — Marked paraparesis or hemiparesis; moderate quadriparesis; or monoplegia","5 — Paraplegia, hemiplegia, or marked quadriparesis","6 — Quadriplegia"]},
      {id:"edss_cerebellar",label:"Cerebellar Functional System",note:"Ataxia, tremor, or coordination difficulty.",options:["0 — Normal","1 — Abnormal signs, no disability","2 — Mild ataxia","3 — Moderate truncal or limb ataxia","4 — Severe ataxia, all limbs","5 — Unable to perform coordinated movements due to ataxia"]},
      {id:"edss_brainstem",label:"Brainstem Functional System",note:"Nystagmus, dysarthria, dysphagia, facial weakness.",options:["0 — Normal","1 — Signs only","2 — Moderate nystagmus or other mild disability","3 — Severe nystagmus, marked weakness, or moderate disability of other cranial nerves","4 — Marked dysarthria or other marked disability","5 — Unable to swallow or speak"]},
      {id:"edss_sensory",label:"Sensory Functional System",note:"Touch, pain, proprioception, vibration.",options:["0 — Normal","1 — Vibration or figure-writing decrease only, 1-2 limbs","2 — Mild decrease in touch, pain, or position sense, 1-2 limbs","3 — Moderate decrease in touch, pain, or position sense; or loss of vibration, 1-2 limbs","4 — Marked decrease in touch or pain, or loss of proprioception, 1-2 limbs","5 — Sensation essentially lost, 1-2 limbs","6 — Sensation essentially lost below the head"]},
      {id:"edss_bowelbladder",label:"Bowel and Bladder Functional System",note:"Urgency, hesitancy, incontinence, catheterization need.",options:["0 — Normal","1 — Mild urinary hesitancy, urgency, or retention","2 — Moderate hesitancy, urgency, retention, or rare incontinence","3 — Frequent urinary incontinence","4 — In need of almost constant catheterization","5 — Loss of bladder function","6 — Loss of bowel and bladder function"]},
      {id:"edss_visual",label:"Visual Functional System",note:"Scotoma and visual acuity, worse eye.",options:["0 — Normal","1 — Scotoma with acuity better than 20/30","2 — Worse eye scotoma, max acuity 20/30 to 20/59","3 — Worse eye large scotoma or moderate field decrease, max acuity 20/60 to 20/99","4 — Worse eye marked field decrease, max acuity 20/100 to 20/200","5 — Worse eye max acuity below 20/200","6 — Grade 5 plus better eye significantly affected"]},
      {id:"edss_cerebral",label:"Cerebral (Mental) Functional System",note:"Mood, cognition, mentation.",options:["0 — Normal","1 — Mood alteration only","2 — Mild decrease in mentation","3 — Moderate decrease in mentation","4 — Marked decrease in mentation","5 — Dementia or chronic brain syndrome, severe"]},
      {id:"edss_other",label:"Other Functional System",note:"Any other neurological finding attributable to MS.",options:["0 — None","1 — Any other neurological findings attributed to MS"]},
      {id:"edss_overall",label:"Overall EDSS grade (clinical judgement)",note:"Integrate the Functional System pattern above with ambulation status. Enter in 0.5-point steps per standard convention.",options:["0","1","1.5","2","2.5","3","3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5","9","9.5","10"]},
    ],
    score:(v)=>v.edss_overall!==undefined&&v.edss_overall!==""?+v.edss_overall:null
  },

  mas:{id:"mas",label:"MAS",full:"Modified Ashworth Scale — Spasticity (more-affected side)",icon:"💪",category:"Stroke",
    maxScore:4,unit:"/4",mcid:1,
    adminNote:"Move the limb through its full range passively at a moderate, consistent speed, roughly one second through range, and grade the resistance felt rather than the resistance expected. Test each muscle group in the same starting position every time for reliable comparison across sessions. Grade 1+ is recorded as 1.5 for scoring purposes.",
    interpret:(s)=>s===0?{label:"Normal tone",color:"#16a34a"}:s<1.5?{label:"Mild spasticity",color:"#65a30d"}:s<2.5?{label:"Moderate spasticity",color:"#d97706"}:s<3.5?{label:"Considerable spasticity",color:"#ea580c"}:{label:"Severe rigidity",color:"#dc2626"},
    fields:[
      {id:"mas_elbow_flex",label:"Elbow Flexors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_elbow_ext",label:"Elbow Extensors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_wrist_flex",label:"Wrist Flexors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_finger_flex",label:"Finger Flexors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_hip_add",label:"Hip Adductors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_knee_ext",label:"Knee Extensors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_knee_flex",label:"Knee Flexors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
      {id:"mas_ankle_pf",label:"Ankle Plantarflexors",options:["0 — No increase in muscle tone","1 — Slight increase: catch and release at end of ROM","1.5 — Slight increase: catch + minimal resistance through <50% ROM (documented as 1+)","2 — Marked increase through most of ROM, easily moved","3 — Considerable increase, passive movement difficult","4 — Rigid in flexion or extension"]},
    ],
    score:(v)=>{const ids=["mas_elbow_flex","mas_elbow_ext","mas_wrist_flex","mas_finger_flex","mas_hip_add","mas_knee_ext","mas_knee_flex","mas_ankle_pf"];const s=ids.map(id=>v[id]?parseFloat(v[id].split(" — ")[0]):null).filter(x=>x!==null&&!isNaN(x));return s.length?Math.round((s.reduce((a,b)=>a+b,0)/s.length)*10)/10:null;}
  },

  fma:{id:"fma",label:"FMA",full:"Fugl-Meyer Assessment — Motor (Full standardised 50-item instrument: UE /66 + LE /34 = /100, per Fugl-Meyer et al. 1975 / Univ. of Gothenburg international protocol)",icon:"🎯",category:"Stroke",
    adminNote:"Every item uses the same 3-point convention: 0 means cannot perform at all, 1 means performs partially, 2 means performs fully and correctly. Test the more-affected side only, following the standard proximal-to-distal sequence -- reflexes, then synergy patterns, then movement out of synergy, then wrist and hand, then coordination and speed. Demonstrate each movement once before asking the patient to attempt it.",
    maxScore:100,unit:"/100",mcid:6,
    interpret:(s)=>s<50?{label:"Severe motor impairment",color:"#dc2626"}:s<=84?{label:"Marked motor impairment",color:"#ea580c"}:s<=95?{label:"Moderate motor impairment",color:"#d97706"}:s<100?{label:"Slight motor impairment",color:"#65a30d"}:{label:"No motor impairment",color:"#16a34a"},
    fields:[
      // ── A. UPPER EXTREMITY, sitting ──
      {id:"fma_ue_reflex_flex",label:"A-I. Reflex: Flexors (biceps + finger flexors, at least one)",options:["0 — None can be elicited","2 — Can be elicited"]},
      {id:"fma_ue_reflex_ext",label:"A-I. Reflex: Extensors (triceps)",options:["0 — None can be elicited","2 — Can be elicited"]},
      {id:"fma_ue_flex_retract",label:"A-II. Flexor Synergy: Shoulder retraction",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_flex_elevate",label:"A-II. Flexor Synergy: Shoulder elevation",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_flex_abduct90",label:"A-II. Flexor Synergy: Shoulder abduction (90°)",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_flex_extrot",label:"A-II. Flexor Synergy: Shoulder external rotation",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_flex_elbowflex",label:"A-II. Flexor Synergy: Elbow flexion",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_flex_forearmsup",label:"A-II. Flexor Synergy: Forearm supination",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_ext_addir",label:"A-II. Extensor Synergy: Shoulder adduction / internal rotation",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_ext_elbowext",label:"A-II. Extensor Synergy: Elbow extension",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_ext_forearmpro",label:"A-II. Extensor Synergy: Forearm pronation",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_ue_mix_lumbar",label:"A-III. Hand to Lumbar Spine",options:["0 — Cannot perform or hand in front of ASIS","1 — Hand behind ASIS (without compensation)","2 — Hand to lumbar spine (without compensation)"]},
      {id:"fma_ue_mix_shflex",label:"A-III. Shoulder Flexion 0–90° (elbow at 0°, forearm neutral)",options:["0 — Immediate abduction or elbow flexion","1 — Abduction or elbow flexion during movement","2 — Flexion 90°, no shoulder abduction or elbow flexion"]},
      {id:"fma_ue_mix_pronsup",label:"A-III. Pronation-Supination (elbow at 90°, shoulder at 0°)",options:["0 — No pronation/supination, starting position impossible","1 — Limited pronation/supination, maintains starting position","2 — Full pronation/supination, maintains starting position"]},
      {id:"fma_ue_out_abduct90",label:"A-IV. Shoulder Abduction 0–90° (elbow at 0°, forearm pronated)",options:["0 — Immediate supination or elbow flexion","1 — Supination or elbow flexion during movement","2 — Abduction 90°, maintains extension and pronation"]},
      {id:"fma_ue_out_flex180",label:"A-IV. Shoulder Flexion 90–180° (elbow at 0°)",options:["0 — Immediate abduction or elbow flexion","1 — Abduction or elbow flexion during movement","2 — Flexion 180°, no shoulder abduction or elbow flexion"]},
      {id:"fma_ue_out_pronsup",label:"A-IV. Pronation/Supination (elbow at 0°, shoulder ~30° flexion)",options:["0 — No pronation/supination, starting position impossible","1 — Limited pronation/supination, maintains starting position","2 — Full pronation/supination, maintains starting position"]},
      {id:"fma_ue_normreflex",label:"A-V. Normal Reflex Activity — biceps/triceps/finger flexors (only score if A-IV = 6)",options:["0 — 2 of 3 reflexes markedly hyperactive","1 — 1 reflex markedly hyperactive, or at least 2 lively","2 — Maximum of 1 reflex lively, none hyperactive"]},
      // ── B. WRIST ──
      {id:"fma_wrist_stab90",label:"B. Wrist Stability at 15° dorsiflexion (elbow at 90°, forearm pronated)",options:["0 — Less than 15° active dorsiflexion","1 — Dorsiflexion 15°, no resistance tolerated","2 — Maintains dorsiflexion against resistance"]},
      {id:"fma_wrist_rep90",label:"B. Repeated Wrist Dorsi/Volar Flexion (elbow at 90°)",options:["0 — Cannot perform volitionally","1 — Limited active range of motion","2 — Full active range of motion, smoothly"]},
      {id:"fma_wrist_stab0",label:"B. Wrist Stability at 15° dorsiflexion (elbow at 0°)",options:["0 — Less than 15° active dorsiflexion","1 — Dorsiflexion 15°, no resistance tolerated","2 — Maintains dorsiflexion against resistance"]},
      {id:"fma_wrist_rep0",label:"B. Repeated Wrist Dorsi/Volar Flexion (elbow at 0°)",options:["0 — Cannot perform volitionally","1 — Limited active range of motion","2 — Full active range of motion, smoothly"]},
      {id:"fma_wrist_circum",label:"B. Wrist Circumduction",options:["0 — Cannot perform volitionally","1 — Jerky movement or incomplete","2 — Complete and smooth circumduction"]},
      // ── C. HAND ──
      {id:"fma_hand_massflex",label:"C. Mass Flexion (from full active/passive extension)",options:["0 — Cannot perform","1 — Performs partially","2 — Performs fully"]},
      {id:"fma_hand_massext",label:"C. Mass Extension (from full active/passive flexion)",options:["0 — Cannot perform","1 — Performs partially","2 — Performs fully"]},
      {id:"fma_hand_hook",label:"C. Hook Grasp (flexion PIP/DIP II–V, extension MCP II–V)",options:["0 — Cannot be performed","1 — Can hold position but weak","2 — Maintains position against resistance"]},
      {id:"fma_hand_thumbadd",label:"C. Thumb Adduction (scrap of paper, 1st CMC/MCP/IP at 0°)",options:["0 — Cannot be performed","1 — Can hold paper but not against a tug","2 — Can hold paper against a tug"]},
      {id:"fma_hand_pincer",label:"C. Pincer Grasp / Opposition (pencil)",options:["0 — Cannot be performed","1 — Can hold pencil but not against a tug","2 — Can hold pencil against a tug"]},
      {id:"fma_hand_cylinder",label:"C. Cylinder Grasp (small can)",options:["0 — Cannot be performed","1 — Can hold cylinder but not against a tug","2 — Can hold cylinder against a tug"]},
      {id:"fma_hand_spherical",label:"C. Spherical Grasp (tennis ball)",options:["0 — Cannot be performed","1 — Can hold ball but not against a tug","2 — Can hold ball against a tug"]},
      // ── D. COORDINATION/SPEED — finger-to-nose x5, eyes closed ──
      {id:"fma_ue_tremor",label:"D. Tremor (finger-to-nose, eyes closed)",options:["0 — Marked tremor","1 — Slight tremor","2 — No tremor"]},
      {id:"fma_ue_dysmetria",label:"D. Dysmetria (finger-to-nose, eyes closed)",options:["0 — Pronounced or unsystematic","1 — Slight and systematic","2 — No dysmetria"]},
      {id:"fma_ue_time",label:"D. Time (finger-to-nose x5 vs unaffected side)",options:["0 — ≥6 seconds slower than unaffected side","1 — 2–5 seconds slower than unaffected side","2 — Less than 2 seconds difference"]},
      // ── E. LOWER EXTREMITY ──
      {id:"fma_le_reflex_flex",label:"E-I. Reflex: Flexors (knee flexors)",options:["0 — None can be elicited","2 — Can be elicited"]},
      {id:"fma_le_reflex_ext",label:"E-I. Reflex: Extensors (patellar, Achilles — at least one)",options:["0 — None can be elicited","2 — Can be elicited"]},
      {id:"fma_le_flex_hip",label:"E-II. Flexor Synergy: Hip flexion (supine)",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_flex_knee",label:"E-II. Flexor Synergy: Knee flexion (supine)",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_flex_ankle",label:"E-II. Flexor Synergy: Ankle dorsiflexion (supine)",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_ext_hipext",label:"E-II. Extensor Synergy: Hip extension",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_ext_hipadd",label:"E-II. Extensor Synergy: Hip adduction",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_ext_kneeext",label:"E-II. Extensor Synergy: Knee extension",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_ext_ankleplant",label:"E-II. Extensor Synergy: Ankle plantar flexion",options:["0 — No movement","1 — Partial movement","2 — Full movement"]},
      {id:"fma_le_mix_kneeflex",label:"E-III. Knee Flexion >90° (sitting, knee 10cm from edge)",options:["0 — No active motion","1 — Less than 90° active flexion (palpate hamstring tendons)","2 — More than 90° active flexion"]},
      {id:"fma_le_mix_ankledf",label:"E-III. Ankle Dorsiflexion (sitting)",options:["0 — No active motion","1 — Limited dorsiflexion","2 — Complete dorsiflexion"]},
      {id:"fma_le_out_kneeflex90",label:"E-IV. Knee Flexion to 90° (standing, hip at 0°)",options:["0 — No active motion, or immediate simultaneous hip flexion","1 — Less than 90° knee flexion and/or hip flexion during movement","2 — At least 90° knee flexion without simultaneous hip flexion"]},
      {id:"fma_le_out_ankledf",label:"E-IV. Ankle Dorsiflexion (standing)",options:["0 — No active motion","1 — Limited dorsiflexion","2 — Complete dorsiflexion"]},
      {id:"fma_le_normreflex",label:"E-V. Normal Reflex Activity — knee flexors/patellar/Achilles (only score if E-IV = 4)",options:["0 — 2 of 3 reflexes markedly hyperactive","1 — 1 reflex markedly hyperactive, or at least 2 lively","2 — Maximum of 1 reflex lively, none hyperactive"]},
      // ── F. COORDINATION/SPEED — heel-to-knee x5, eyes closed, supine ──
      {id:"fma_le_tremor",label:"F. Tremor (heel-to-knee, eyes closed)",options:["0 — Marked tremor","1 — Slight tremor","2 — No tremor"]},
      {id:"fma_le_dysmetria",label:"F. Dysmetria (heel-to-knee, eyes closed)",options:["0 — Pronounced or unsystematic","1 — Slight and systematic","2 — No dysmetria"]},
      {id:"fma_le_time",label:"F. Time (heel-to-knee x5 vs unaffected side)",options:["0 — ≥6 seconds slower than unaffected side","1 — 2–5 seconds slower than unaffected side","2 — Less than 2 seconds difference"]},
    ],
    score:(v)=>{const ids=["fma_ue_reflex_flex","fma_ue_reflex_ext","fma_ue_flex_retract","fma_ue_flex_elevate","fma_ue_flex_abduct90","fma_ue_flex_extrot","fma_ue_flex_elbowflex","fma_ue_flex_forearmsup","fma_ue_ext_addir","fma_ue_ext_elbowext","fma_ue_ext_forearmpro","fma_ue_mix_lumbar","fma_ue_mix_shflex","fma_ue_mix_pronsup","fma_ue_out_abduct90","fma_ue_out_flex180","fma_ue_out_pronsup","fma_ue_normreflex","fma_wrist_stab90","fma_wrist_rep90","fma_wrist_stab0","fma_wrist_rep0","fma_wrist_circum","fma_hand_massflex","fma_hand_massext","fma_hand_hook","fma_hand_thumbadd","fma_hand_pincer","fma_hand_cylinder","fma_hand_spherical","fma_ue_tremor","fma_ue_dysmetria","fma_ue_time","fma_le_reflex_flex","fma_le_reflex_ext","fma_le_flex_hip","fma_le_flex_knee","fma_le_flex_ankle","fma_le_ext_hipext","fma_le_ext_hipadd","fma_le_ext_kneeext","fma_le_ext_ankleplant","fma_le_mix_kneeflex","fma_le_mix_ankledf","fma_le_out_kneeflex90","fma_le_out_ankledf","fma_le_normreflex","fma_le_tremor","fma_le_dysmetria","fma_le_time"];const s=ids.map(id=>v[id]!==undefined?+v[id].split(" — ")[0]:null).filter(x=>x!==null);return s.length?s.reduce((a,b)=>a+b,0):null;}
  },


  moca:{id:"moca",label:"MoCA",full:"Montreal Cognitive Assessment — Domain Summary",icon:"🧠",category:"TBI",
    maxScore:30,unit:"/30",mcid:2,
    adminNote:"MoCA is a copyrighted instrument. Embedding the actual test items in software requires a separate commercial licence from MoCA Cognition -- this form only records the resulting domain sub-scores after you administer the official test from your own licensed/registered form (free clinician registration at mocacognition.com). Enter the score your patient achieved in each domain below.",
    interpret:(s)=>s>=26?{label:"Within normal range",color:"#16a34a"}:s>=18?{label:"Mild cognitive impairment",color:"#d97706"}:s>=10?{label:"Moderate cognitive impairment",color:"#ea580c"}:{label:"Severe cognitive impairment",color:"#dc2626"},
    fields:[
      {id:"moca_visuospatial",label:"Visuospatial / Executive",note:"Covers the trail-making, cube copy, and clock-drawing sub-tests on the official form.",options:["0","1","2","3","4","5"]},
      {id:"moca_naming",label:"Naming",note:"Object-naming sub-test.",options:["0","1","2","3"]},
      {id:"moca_attention",label:"Attention",note:"Digit span, vigilance, and serial subtraction sub-tests combined.",options:["0","1","2","3","4","5","6"]},
      {id:"moca_language",label:"Language",note:"Sentence repetition and verbal fluency sub-tests.",options:["0","1","2","3"]},
      {id:"moca_abstraction",label:"Abstraction",note:"Similarity-pair reasoning sub-test.",options:["0","1","2"]},
      {id:"moca_delayed_recall",label:"Delayed Recall",note:"Unassisted recall of the word list introduced earlier in the test.",options:["0","1","2","3","4","5"]},
      {id:"moca_orientation",label:"Orientation",note:"Date, month, year, day, place, and city.",options:["0","1","2","3","4","5","6"]},
      {id:"moca_education_adjust",label:"Education adjustment",note:"Standard MoCA correction: add 1 point to the total if the patient has 12 years of formal education or fewer.",options:["0 — Not applied","1 — Applied (plus 1 point)"]},
    ],
    score:(v)=>{
      const domains=["moca_visuospatial","moca_naming","moca_attention","moca_language","moca_abstraction","moca_delayed_recall","moca_orientation"];
      const vals=domains.map(id=>v[id]!==undefined?+v[id]:null).filter(x=>x!==null);
      if(!vals.length) return null;
      let total=vals.reduce((a,b)=>a+b,0);
      if(v.moca_education_adjust==="1 — Applied (plus 1 point)") total+=1;
      return Math.min(30,total);
    }
  },

  mmse:{id:"mmse",label:"MMSE",full:"Mini-Mental State Examination — Domain Summary",icon:"📝",category:"TBI",
    maxScore:30,unit:"/30",mcid:2,
    adminNote:"MMSE is a proprietary instrument; Psychological Assessment Resources (PAR) has held exclusive commercial rights since 2001. PAR's own published guidance is not to reproduce the MMSE items in software -- only to record that it was administered and document the score. This form records the resulting domain sub-scores after you administer the official test from your own PAR-licensed materials.",
    interpret:(s)=>s>=24?{label:"Within normal range",color:"#16a34a"}:s>=18?{label:"Mild cognitive impairment",color:"#d97706"}:s>=10?{label:"Moderate cognitive impairment",color:"#ea580c"}:{label:"Severe cognitive impairment",color:"#dc2626"},
    fields:[
      {id:"mmse_orientation_time",label:"Orientation to Time",note:"Year, season, date, day, and month.",options:["0","1","2","3","4","5"]},
      {id:"mmse_orientation_place",label:"Orientation to Place",note:"Country or state, county, town, building, and floor.",options:["0","1","2","3","4","5"]},
      {id:"mmse_registration",label:"Registration",note:"Immediate repetition of a short word list.",options:["0","1","2","3"]},
      {id:"mmse_attention",label:"Attention & Calculation",note:"Serial subtraction or backward-spelling task.",options:["0","1","2","3","4","5"]},
      {id:"mmse_recall",label:"Recall",note:"Delayed recall of the same word list from Registration.",options:["0","1","2","3"]},
      {id:"mmse_language",label:"Language",note:"Naming, repetition, a multi-step command, reading, and writing combined.",options:["0","1","2","3","4","5","6","7","8"]},
      {id:"mmse_construction",label:"Visual Construction",note:"Copying an intersecting geometric figure.",options:["0","1"]},
    ],
    score:(v)=>{
      const domains=["mmse_orientation_time","mmse_orientation_place","mmse_registration","mmse_attention","mmse_recall","mmse_language","mmse_construction"];
      const vals=domains.map(id=>v[id]!==undefined?+v[id]:null).filter(x=>x!==null);
      return vals.length?Math.min(30,vals.reduce((a,b)=>a+b,0)):null;
    }
  },

  minicog:{id:"minicog",label:"Mini-Cog",full:"Mini-Cog — 3-Item Recall and Clock Draw",icon:"🕐",category:"TBI",
    maxScore:5,unit:"/5",mcid:1,
    adminNote:"Mini-Cog is free to use, reproduce, and distribute for clinical and educational use without a licensing agreement. Say the three words clearly and ask the patient to repeat them back immediately so you know they were heard correctly. Then have them draw a clock: put in all the numbers, then set the hands to 11:10 (ten past eleven). Give up to 3 minutes. Finally, ask them to recall the three words from the start, without any hints.",
    interpret:(s)=>s>=4?{label:"Low likelihood of dementia",color:"#16a34a"}:s===3?{label:"Borderline — use clinical judgement",color:"#d97706"}:{label:"Positive screen — further cognitive evaluation indicated",color:"#dc2626"},
    fields:[
      {id:"minicog_wordlist",label:"Word list used",note:"Rotate between lists across visits to reduce practice effects.",options:["Banana, Sunrise, Chair","Daughter, Heaven, Mountain","Village, Kitchen, Baby","River, Nation, Finger","Captain, Garden, Picture","Leader, Season, Table"]},
      {id:"minicog_recall",label:"3-word recall (after clock draw)",note:"1 point for each word correctly recalled, unprompted. No partial credit for cued recall.",options:["0 — None recalled","1 — One word recalled","2 — Two words recalled","3 — All three words recalled"]},
      {id:"minicog_clock",label:"Clock draw",note:"Normal = all 12 numbers present, in correct sequence and roughly correct position, hands pointing to 11 and 2 (11:10). Any error, or inability/refusal to draw, is abnormal.",options:["0 — Abnormal or not attempted","2 — Normal"]},
    ],
    score:(v)=>{
      const recall=v.minicog_recall!==undefined?+v.minicog_recall.split(" — ")[0]:null;
      const clock=v.minicog_clock!==undefined?+v.minicog_clock.split(" — ")[0]:null;
      if(recall===null||clock===null) return null;
      return recall+clock;
    }
  },

  rancho:{id:"rancho",label:"Rancho",full:"Rancho Los Amigos Scale — Levels of Cognitive Functioning",icon:"🧩",category:"TBI",
    maxScore:8,unit:"/8",mcid:1,
    adminNote:"This is an observational rating based on behaviour over the recent session or shift, not a single-moment test -- base the level on typical functioning, not the single best or worst moment observed. When behaviour spans two adjacent levels, select the lower, less-recovered level, since the scale describes a recovery trajectory and functioning is expected to be inconsistent during transitions between levels.",
    interpret:(s)=>s<=3?{label:"Low level of function",color:"#dc2626"}:s<=5?{label:"Confused / agitated or inappropriate",color:"#ea580c"}:s===6?{label:"Confused but appropriate",color:"#d97706"}:{label:"Automatic-to-purposeful — good recovery",color:"#16a34a"},
    fields:[
      {id:"rancho_level",label:"Select current cognitive/behavioural level",options:[
        "1 — I. No Response: Total Assistance",
        "2 — II. Generalized Response: Total Assistance",
        "3 — III. Localized Response: Total Assistance",
        "4 — IV. Confused / Agitated: Maximal Assistance",
        "5 — V. Confused, Inappropriate, Non-Agitated: Maximal Assistance",
        "6 — VI. Confused, Appropriate: Moderate Assistance",
        "7 — VII. Automatic, Appropriate: Minimal Assistance for Daily Living Skills",
        "8 — VIII. Purposeful, Appropriate: Stand-By Assistance",
      ]},
    ],
    score:(v)=>v.rancho_level?+v.rancho_level.split(" — ")[0]:null
  },

  goat:{id:"goat",label:"GOAT",full:"Galveston Orientation & Amnesia Test — official Levin, O'Donnell & Grossman (1979) point deductions",icon:"🗓️",category:"TBI",
    maxScore:100,unit:"/100",mcid:10,
    adminNote:"Ask each question conversationally rather than reading it like a script, and accept an approximate answer as correct where the scoring allows, for example within 30 minutes for time. This is typically repeated daily until the patient scores above 75 on 2 consecutive days, which operationally marks the end of post-traumatic amnesia.",
    interpret:(s)=>s>75?{label:"Normal orientation — no PTA",color:"#16a34a"}:s>=66?{label:"Borderline",color:"#d97706"}:{label:"Impaired — post-traumatic amnesia (PTA) present",color:"#dc2626"},
    fields:[
      {id:"goat_name",label:"1. What is your name? (max error 2)",options:["0 — Correct","2 — Incorrect"]},
      {id:"goat_birthdate",label:"When were you born? (max error 4)",options:["0 — Correct","4 — Incorrect"]},
      {id:"goat_address",label:"Where do you live? (max error 4)",options:["0 — Correct","4 — Incorrect"]},
      {id:"goat_city",label:"2. Where are you now — city? (max error 5)",options:["0 — Correct","5 — Incorrect"]},
      {id:"goat_hospital",label:"Where are you now — hospital/building? (unnecessary to state name; max error 5)",options:["0 — Correct","5 — Incorrect"]},
      {id:"goat_admitdate",label:"3. On what date were you admitted to this hospital? (max error 5)",options:["0 — Correct","5 — Incorrect"]},
      {id:"goat_arrival",label:"How did you get to the hospital? (max error 5)",options:["0 — Correct","5 — Incorrect"]},
      {id:"goat_firstevent",label:"4. What is the first event you can remember after the injury? (max error 5)",options:["0 — Correct","5 — Incorrect / cannot recall"]},
      {id:"goat_firsteventdetail",label:"Can you describe in detail (date, time, companions) the first event you recall after the injury? (max error 5)",options:["0 — Correct","5 — Incorrect / cannot recall"]},
      {id:"goat_lastevent",label:"5. What is the last event you can recall before the injury? (max error 5)",options:["0 — Correct","5 — Incorrect / cannot recall"]},
      {id:"goat_lasteventdetail",label:"Can you describe in detail (date, time, companions) the last event you recall before the injury? (max error 5)",options:["0 — Correct","5 — Incorrect / cannot recall"]},
      {id:"goat_time",label:"6. What time is it now? (1pt per half-hour off, max error 5)",options:["0 — Correct (within 30 min)","1 — Off by ~1 hour","2 — Off by ~1.5 hours","3 — Off by ~2 hours","4 — Off by ~2.5 hours","5 — Off by ≥3 hours (max error)"]},
      {id:"goat_dayweek",label:"7. What day of the week is it? (1pt per day off, max error 3)",options:["0 — Correct","1 — Off by 1 day","2 — Off by 2 days","3 — Off by 3+ days (max error)"]},
      {id:"goat_daymonth",label:"8. What day of the month is it? (1pt per day off, max error 5)",options:["0 — Correct","1 — Off by 1 day","2 — Off by 2 days","3 — Off by 3 days","4 — Off by 4 days","5 — Off by 5+ days (max error)"]},
      {id:"goat_month",label:"9. What is the month? (5pt per month off, max error 15)",options:["0 — Correct","5 — Off by 1 month","10 — Off by 2 months","15 — Off by 3+ months (max error)"]},
      {id:"goat_year",label:"10. What is the year? (10pt per year off, max error 30)",options:["0 — Correct","10 — Off by 1 year","20 — Off by 2 years","30 — Off by 3+ years (max error)"]},
    ],
    score:(v)=>{const ids=["goat_name","goat_birthdate","goat_address","goat_city","goat_hospital","goat_admitdate","goat_arrival","goat_firstevent","goat_firsteventdetail","goat_lastevent","goat_lasteventdetail","goat_time","goat_dayweek","goat_daymonth","goat_month","goat_year"];const errs=ids.map(id=>v[id]!==undefined?+v[id].split(" — ")[0]:null).filter(x=>x!==null);if(!errs.length)return null;const totalError=errs.reduce((a,b)=>a+b,0);return Math.max(0,100-totalError);}
  },


  barthel:{id:"barthel",label:"Barthel",full:"Barthel Index — Activities of Daily Living",icon:"🛁",category:"TBI",
    maxScore:100,unit:"/100",mcid:10,
    adminNote:"Score based on what the patient actually does, not what they could do with more practice or what they did before the injury -- if in doubt between two grades, score the lower, more dependent one. Base it on direct observation or reliable carer report over the preceding 24 to 48 hours, not a single in-clinic demonstration.",
    interpret:(s)=>s>=100?{label:"Independent",color:"#16a34a"}:s>=91?{label:"Slight dependence",color:"#65a30d"}:s>=61?{label:"Moderate dependence",color:"#d97706"}:s>=21?{label:"Severe dependence",color:"#ea580c"}:{label:"Total dependence",color:"#dc2626"},
    fields:[
      {id:"barthel_feeding",label:"Feeding",options:["10 — Independent","5 — Needs help (e.g. cutting, spreading butter)","0 — Unable"]},
      {id:"barthel_bathing",label:"Bathing",options:["5 — Independent (or in shower)","0 — Dependent"]},
      {id:"barthel_grooming",label:"Grooming",options:["5 — Independent (face/hair/teeth/shaving)","0 — Needs help"]},
      {id:"barthel_dressing",label:"Dressing",options:["10 — Independent (buttons, zips, laces)","5 — Needs help but does about half unaided","0 — Dependent"]},
      {id:"barthel_bowels",label:"Bowels",options:["10 — Continent","5 — Occasional accident","0 — Incontinent (or needs enemas)"]},
      {id:"barthel_bladder",label:"Bladder",options:["10 — Continent","5 — Occasional accident","0 — Incontinent, or catheterised and unable to manage"]},
      {id:"barthel_toilet",label:"Toilet Use",options:["10 — Independent","5 — Needs some help","0 — Dependent"]},
      {id:"barthel_transfer",label:"Transfers (bed to chair)",options:["15 — Independent","10 — Minor help needed (verbal or physical)","5 — Major help needed (one strong/able person), can sit","0 — Unable, no sitting balance"]},
      {id:"barthel_mobility",label:"Mobility (on level surfaces, 50m)",options:["15 — Independent (may use aid)","10 — Walks with help of one person","5 — Wheelchair independent, including corners","0 — Immobile"]},
      {id:"barthel_stairs",label:"Stairs",options:["10 — Independent","5 — Needs help (verbal, physical, carrying aid)","0 — Unable"]},
    ],
    score:(v)=>{const ids=["barthel_feeding","barthel_bathing","barthel_grooming","barthel_dressing","barthel_bowels","barthel_bladder","barthel_toilet","barthel_transfer","barthel_mobility","barthel_stairs"];const s=ids.map(id=>v[id]!==undefined?+v[id].split(" — ")[0]:null).filter(x=>x!==null);return s.length?s.reduce((a,b)=>a+b,0):null;}
  },

});

// ─── from PhysioNeuro.jsx ───────────────────────────────────────────────────
const ALL_TESTS = {
  home:{ label:"Home", icon:"🏠", desc:"App Overview & Features", groups:{ "Welcome":"HOME_MODULE" }},
  dashboard:{ label:"Dashboard", icon:"📊", desc:"Therapist Overview", groups:{ "Therapist Dashboard":"DASHBOARD_MODULE" }},
  demographics:{ label:"Demographics", icon:"👤", desc:"Patient Information", groups:{ "Demographic Data":"DEMOGRAPHICS_MODULE" }},
  subjective:{ label:"Subjective", icon:"📝", desc:"History & Complaint", groups:{ "Full Subjective Assessment":"SUBJECTIVE_MODULE" }},
  palpation:{ label:"Palpation", icon:"🖐️", desc:"Tissue Assessment", groups:{ "Palpation Findings":"PALPATION_MODULE" }},
  posture:{ label:"Posture Analysis", icon:"🧍", desc:"AI Posture Screening", groups:{}},
  observation:{ label:"Observation", icon:"👁️", desc:"Visual Inspection — Magee's", groups:{
    "Clinical Observation":"OBSERVATION_MODULE",
  }},
  rom:{ label:"ROM", icon:"📐", desc:"Range of Motion", groups:{ "Full ROM Assessment":"ROM_MODULE" }},
  mmt:{ label:"Muscle MMT", icon:"💪", groups:{ "Full MMT Assessment":"MMT_MODULE" }},
  special:{ label:"Special Tests (100+)", icon:"🔬", groups:{ "All Special Tests":"SPECIAL_TESTS_MODULE" }},
  neuro:{ label:"Neurological", icon:"⚡", groups:{ "Full Neurological Assessment":"NEURO_MODULE" }},
  tbi:{ label:"TBI Template", icon:"🧠", groups:{ "TBI Assessment Checklist":"TBI_MODULE" }},
  stroke:{ label:"Stroke Template", icon:"❤️‍🩹", groups:{ "Stroke Assessment Checklist":"STROKE_MODULE" }},
  sci:{ label:"SCI Template", icon:"🦾", groups:{ "SCI Assessment Checklist":"SCI_MODULE" }},
  parkinsons:{ label:"Parkinson's Template", icon:"🌀", groups:{ "Parkinson's Assessment Checklist":"PARKINSONS_MODULE" }},
  ms:{ label:"MS Template", icon:"🧬", groups:{ "MS Assessment Checklist":"MS_MODULE" }},
  gait:{ label:"Gait Analysis", icon:"🚶", groups:{ "Full Gait Analysis":"GAIT_MODULE" }},
  nkt:{ label:"CPA — Compensation Pattern Analysis", icon:"🧠", groups:{ "Compensation Pattern Tests":"NKT_REGION" }},
  kinetic:{ label:"Kinetic Chain", icon:"⛓️", groups:{ "Joint-by-Joint Assessment":"KC_REGION" }},
  fascia:{ label:"Fascia Integration", icon:"🕸️", groups:{ "Fascial Assessment":"FASCIA_REGION" }},
  fma:{ label:"Functional Movement", icon:"🏃", groups:{ "Movement Analysis":"FMA_REGION" }},
  cyriax_full:{ label:"STTT — Selective Tissue Tension Test", icon:"🦴", groups:{ "Complete STTT Assessment":"CYRIAX_MODULE" }},
  outcome:{ label:"Outcome Measures", icon:"📈", groups:{ "Validated Outcome Measures":"OUTCOME_MODULE" }},
  treatment:{ label:"Treatment", icon:"💊", desc:"Exercise & Treatment Techniques", groups:{ "Treatment":"TREATMENT_MODULE" }},
  exercise:{ label:"Treatment Prescription", icon:"💊", desc:"Exercise & Treatment Plan", groups:{ "Exercise Prescription":"EXERCISE_MODULE" }},
  tx_techniques:{ label:"Tx Techniques", icon:"🤲", groups:{ "Treatment Techniques":"TX_TECHNIQUES_MODULE" }},
  tx_sessions:{ label:"Session Log", icon:"📋", groups:{ "Treatment Session Log":"TX_SESSION_MODULE" }},
  soap:{ label:"SOAP Notes", icon:"📋", desc:"SOAP Documentation", groups:{ "SOAP Note Generator":"SOAP_MODULE" }},
  ai_assistant:{ label:"AI Assistant", icon:"🤖", desc:"AI Clinical Assistant", groups:{ "AI Clinical Assistant":"AI_MODULE" }},
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROM MODULE — Advanced Range of Motion Assessment
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Cloudinary Clinical Image System ──────────────────────────────────────
// Cloud name: dr15y1pwj
// Upload images to Cloudinary with names matching clinical IDs (e.g. rom_cflex, n_c3)
// If image doesn't exist → component renders nothing automatically
const ROM_DATA={
  "Cervical":[
    {id:"rom_cflex",mv:"Flexion",bilateral:false,normal:45,unit:"°",plane:"Sagittal",axis:"Frontal (coronal)",
     start:"Seated, head neutral, stabilise thorax",gonio:"Axis: C7 SP; Fixed: vertical ref; Moving: along mastoid/ear",
     muscles:"Sternocleidomastoid, longus colli/capitis, anterior scalenes",
     endfeel:{normal:"Firm (ligamentous — posterior structures)",abnormal:"Hard=OA/disc; Empty=fracture/neoplasm; Springy=meniscoid"},
     compensation:"Thoracic flexion, chin poke (forward head)",
     capsular:"Lateral flex=Rot>Flex=Ext (cervical facet capsular pattern)",
     adl:"Looking down at phone, eating, reading",
     pathology:"Limited painfully: disc herniation (C4/5 or C5/6), facet OA; painless: muscle tightness",
     redflag:"Bilateral arm paresthesia on flex = cord compression; trauma + limited = C-spine fracture protocol",
     pediatric:"Neonatal: limited = torticollis, Klippel-Feil. Children: normal=80°",
     geriatric:"Degenerative changes reduce all planes by 25–30% by age 70"},
    {id:"rom_cext",mv:"Extension",bilateral:false,normal:45,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Seated, head neutral",gonio:"Axis: C7 SP; Fixed: vertical ref; Moving: along mastoid",
     muscles:"Semispinalis capitis, splenius capitis, upper trapezius, suboccipitals",
     endfeel:{normal:"Firm (anterior ligaments)",abnormal:"Hard=OA/stenosis; Empty=instability; Springy=disc"},
     compensation:"Thoracic extension, mouth opening",
     capsular:"Extension often more limited than flexion in degenerative disease",
     adl:"Looking up at ceiling, overhead activities, reversing car",
     pathology:"Limited: cervical stenosis, OA, disc osteophyte. Pain on ext: facet compression",
     redflag:"Bilateral LE symptoms on extension = spinal stenosis. Dizziness = VBI — stop, perform VBI screen"},
    {id:"rom_clatl",mv:"Lat Flex L",bilateral:false,normal:45,unit:"°",plane:"Frontal",axis:"AP (anterior-posterior)",
     start:"Seated, stabilise ipsilateral shoulder to prevent elevation",gonio:"Axis: C7 SP; Fixed: vertical; Moving: along midline skull",
     muscles:"Ipsilateral: scalenes, SCM, upper trap, splenius; Contralateral: stretched",
     endfeel:{normal:"Firm (contralateral capsule + muscles)",abnormal:"Hard=OA/Unco; Springy=disc"},
     compensation:"Shoulder elevation (shrug), trunk lateral lean",
     capsular:"Asymmetric restriction: facet OA pattern",
     adl:"Ear to shoulder stretch, lateral reach activities",
     pathology:"Unilateral limitation: unilateral facet OA, disc herniation, scalene tightness",
     redflag:"Arm pain reproduced = radiculopathy (C4–C8). Lhermitte's sign on any cervical movement = cord lesion"},
    {id:"rom_clatr",mv:"Lat Flex R",bilateral:false,normal:45,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, stabilise contralateral shoulder",gonio:"Axis: C7 SP; Fixed: vertical; Moving: along skull midline",
     muscles:"Ipsilateral scalenes, SCM, upper trap, splenius capitis/cervicis",
     endfeel:{normal:"Firm",abnormal:"Hard=OA; Empty=trauma"},
     compensation:"Shoulder elevation, trunk lean opposite direction",
     capsular:"Compare L vs R: asymmetry >10° clinically significant",
     adl:"Phone held to ear, lateral reaching",
     pathology:"Same as Lat Flex L — compare sides for asymmetry",
     redflag:"Pain down ipsilateral arm = Spurling's positive cluster"},
    {id:"rom_crotl",mv:"Rotation L",bilateral:false,normal:60,unit:"°",plane:"Transverse",axis:"Vertical (longitudinal)",
     start:"Seated, head neutral, stabilise thorax",gonio:"Axis: crown of head; Fixed: acromial line; Moving: nose direction",
     muscles:"Contralateral SCM, ipsilateral splenius, suboccipitals",
     endfeel:{normal:"Firm (capsule + alar ligament)",abnormal:"Hard=OA/fixation; Springy=disc protrusion"},
     compensation:"Trunk rotation, chin elevation",
     capsular:"Rotation most limited in atlantoaxial OA (C1/C2)",
     adl:"Checking blind spot driving, looking sideways",
     pathology:"C1/2 OA: rotation limited bilaterally. Disc: often asymmetric + painful arc",
     redflag:"<30° rotation = atlantoaxial instability or end-stage OA. VBI symptoms: dizziness, nystagmus, diplopia"},
    {id:"rom_crotr",mv:"Rotation R",bilateral:false,normal:60,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Same as rotation L",gonio:"Same method",
     muscles:"Same contralateral pattern as rotation L",
     endfeel:{normal:"Firm",abnormal:"Same as rotation L"},
     compensation:"Trunk rotation, chin elevation",
     capsular:"RA: atlantoaxial instability — bilateral rotation severely limited",
     adl:"Same as rotation L",
     pathology:"Unilateral loss: facet OA, unilateral disc; Bilateral equal loss: C1/2",
     redflag:"RA patient: odontoid fracture risk — <30° rotation → X-ray"},
  ],
  "Thoracic":[
    {id:"rom_thflex",mv:"Flexion",bilateral:false,normal:50,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Seated or standing, arms crossed",gonio:"Axis: T12; Fixed: vertical; Moving: spinous process line",
     muscles:"Rectus abdominis, external obliques",
     endfeel:{normal:"Firm (posterior ligaments + facets)",abnormal:"Hard=OA/AS; Springy=disc (rare thoracic)"},
     compensation:"Lumbar flexion (monitor separately), hip flex",
     capsular:"Thoracic: Ext>Lat Flex>Rot in spondylosis; symmetric in AS",
     adl:"Bending forward (combined with lumbar), stooping",
     pathology:"AS: reduced chest expansion + all planes; Osteoporotic wedge: flexion + kyphosis",
     redflag:"Severe flexion pain with percussion tenderness = vertebral fracture. Thoracic mass: bilateral UMN signs"},
    {id:"rom_thext",mv:"Extension",bilateral:false,normal:25,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing or prone, lumbar stabilised",gonio:"Axis: T12; Fixed: vertical; Moving: spinous process",
     muscles:"Erector spinae, multifidus, semispinalis",
     endfeel:{normal:"Firm (anterior longitudinal ligament + disc)",abnormal:"Hard=OA/AS; Empty=malignancy"},
     compensation:"Lumbar hyperextension",
     capsular:"Extension earliest limited in thoracic OA",
     adl:"Upright posture, overhead reach, back bend",
     pathology:"Thoracic kyphosis: extension severely limited; Scheuermann's: fixed kyphosis",
     redflag:"Night pain + weight loss + extension pain = malignancy/infection"},
    {id:"rom_throtl",mv:"Rotation L",bilateral:false,normal:35,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Seated, arms crossed, pelvis fixed",gonio:"Axis: T1; Fixed: pelvis line; Moving: shoulder line",
     muscles:"Ipsilateral internal oblique + contralateral external oblique",
     endfeel:{normal:"Firm",abnormal:"Hard=AS/costovertebral joint restriction"},
     compensation:"Lumbar rotation, trunk lateral lean",
     capsular:"AS: marked bilateral symmetric restriction",
     adl:"Golf swing, tennis serve, trunk twisting in daily life",
     pathology:"Costovertebral joint restriction: local thoracic pain + limited ipsilateral rotation",
     redflag:"Rib pain with rotation = costovertebral joint pathology, stress fracture in athletes"},
    {id:"rom_throtr",mv:"Rotation R",bilateral:false,normal:35,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Same as rotation L",gonio:"Same",muscles:"Same contralateral pattern",
     endfeel:{normal:"Firm",abnormal:"Hard=costovertebral restriction"},
     compensation:"Lumbar rotation",capsular:"Compare L vs R",
     adl:"Same as rotation L",
     pathology:"Asymmetric restriction: scoliosis, unilateral facet OA",
     redflag:"Rib fracture: localized pain + limited rotation + crepitus"},
  ],
  "Lumbar":[
    {id:"rom_lflex",mv:"Flexion",bilateral:false,normal:60,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing, knees extended; also assess fingertip-to-floor distance (N=<7cm)",gonio:"Axis: S2; Fixed: vertical; Moving: T12 spinous process line; ALTERNATIVE: Schober's test (distraction from S2+10cm line: N≥5cm increase)",
     muscles:"Psoas, rectus abdominis, obliques (assist); Erector spinae eccentric control",
     endfeel:{normal:"Firm (posterior ligaments, disc tension)",abnormal:"Springy=disc herniation; Hard=OA/end-stage; Empty=fracture/malignancy"},
     compensation:"Hip flexion substituting for lumbar flex, thoracic flexion, knee bend",
     capsular:"Lumbar capsular: Ext>Lat Flex>Rot (facet joints)",
     adl:"Picking up objects, dressing, tying shoes, toileting",
     pathology:"Limited painfully: disc herniation, acute facet lock, spondylolisthesis; Painful return from flexion = disc",
     redflag:"Bowel/bladder symptoms + LBP = cauda equina — URGENT. Painful arc in flexion/return = disc pathology"},
    {id:"rom_lext",mv:"Extension",bilateral:false,normal:25,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing, hands on posterior iliac crests for stabilisation",gonio:"Axis: greater trochanter; Fixed: vertical; Moving: mid-axillary line",
     muscles:"Erector spinae, multifidus, quadratus lumborum",
     endfeel:{normal:"Firm (anterior disc/ALL + facet joint approximation)",abnormal:"Hard=OA severe; Springy=facet impingement; Empty=instability"},
     compensation:"Hip extension (gluteal contraction), knee flexion",
     capsular:"Facet OA: extension most limited + painful",
     adl:"Standing from seated, walking, reaching overhead, bending backward",
     pathology:"Limited painfully: facet OA, spondylolysis/listhesis, spinal stenosis; Pain in extension = neurogenic claudication",
     redflag:"Bilateral leg pain on extension relieved by sitting = spinal stenosis. Instability = spondylolisthesis (step sign)"},
    {id:"rom_llfl",mv:"Lat Flex L",bilateral:false,normal:25,unit:"°",plane:"Frontal",axis:"AP",
     start:"Standing, knees extended, arms at sides — measure fingertip distance traveled down leg",gonio:"Axis: S2; Fixed: vertical; Moving: T12 SP",
     muscles:"Ipsilateral: QL, erector spinae, obliques; Contralateral: stretched",
     endfeel:{normal:"Firm (contralateral ligaments + muscles)",abnormal:"Hard=OA/scoliosis; Springy=disc"},
     compensation:"Trunk rotation, lateral hip shift, knee flexion",
     capsular:"Asymmetric restriction: unilateral facet OA or disc herniation",
     adl:"Side bending for reaching, lateral reaching in ADLs",
     pathology:"Painful limited: disc herniation (list toward or away from disc depending on HNP position relative to nerve root)",
     redflag:"Lateral list: disc herniation or muscle spasm. Scoliosis: structural vs functional"},
    {id:"rom_llfr",mv:"Lat Flex R",bilateral:false,normal:25,unit:"°",plane:"Frontal",axis:"AP",
     start:"Same as Lat Flex L",gonio:"Same",muscles:"Same contralateral pattern",
     endfeel:{normal:"Firm",abnormal:"Springy=disc"},
     compensation:"Trunk rotation, hip shift",capsular:"Compare L vs R",
     adl:"Same",pathology:"Compare with L — asymmetry >10° significant",
     redflag:"Painful list = disc pathology — assess dermatomes"},
    {id:"rom_lrotl",mv:"Rotation L",bilateral:false,normal:5,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Seated, arms crossed, pelvis fixed to chair",gonio:"Axis: midline between PSIS; Fixed: pelvis; Moving: shoulder girdle line",
     muscles:"Ipsilateral internal oblique + multifidus; Contralateral external oblique",
     endfeel:{normal:"Firm (disc + capsule)",abnormal:"Hard=OA; Springy=disc"},
     compensation:"Pelvic rotation, trunk lateral lean",
     capsular:"NOTE: lumbar rotation is very limited (5°) — restriction most significant in acute disc",
     adl:"Rolling in bed, getting in/out of car, twisting",
     pathology:"Painful rotation: disc herniation (early sign), spondylodiscitis; Symmetric loss: AS",
     redflag:"Severe bilateral rotation loss + SI joint involvement = AS — check BASMI"},
    {id:"rom_lrotr",mv:"Rotation R",bilateral:false,normal:5,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Same as rotation L",gonio:"Same",muscles:"Same",
     endfeel:{normal:"Firm",abnormal:"Springy=disc"},
     compensation:"Pelvic rotation",capsular:"Compare L vs R",
     adl:"Same",pathology:"Same as rotation L",redflag:"Same"},
  ],
  "TMJ":[
    {id:"rom_topen",mv:"Mouth Opening",bilateral:false,normal:45,unit:"mm",plane:"Sagittal",axis:"Frontal",
     start:"Seated, teeth in crest-to-crest occlusion; measure interincisal distance",gonio:"Ruler: between upper and lower central incisors",
     muscles:"Bilateral lateral pterygoid, digastric, mylohyoid (opening); masseter, temporalis, medial pterygoid (close)",
     endfeel:{normal:"Firm (muscle/capsule at end range)",abnormal:"Springy=anterior disc displacement with reduction (click); Hard=bony block/closed lock; Empty=acute inflammation"},
     compensation:"Forward head posture to gain opening, jaw deviation (note deviation direction)",
     capsular:"TMJ capsular: limitation in opening=protrusion=contralateral deviation (ipsilateral condyle restriction)",
     adl:"Eating, yawning, talking, dental treatment",
     pathology:"<30mm = significant trismus; Clicking with opening: disc displacement with reduction; No click + limited: disc displacement without reduction (closed lock)",
     redflag:"Sudden inability to open after locking = closed lock — urgent referral. Trismus + fever = infection"},
    {id:"rom_tlatl",mv:"Lat Deviation L",bilateral:false,normal:10,unit:"mm",plane:"Frontal",axis:"Vertical",
     start:"Seated, mouth slightly open, measure deviation of lower midline from upper",gonio:"Ruler from upper to lower central incisor midlines",
     muscles:"Ipsilateral medial pterygoid + contralateral lateral pterygoid",
     endfeel:{normal:"Firm",abnormal:"Hard=bony block; Limited=ipsilateral disc; Painful=synovitis"},
     compensation:"Head tilt to compensate",capsular:"Reduced ipsilateral deviation = ipsilateral disc/capsule restriction",
     adl:"Chewing (lateral grinding movement)",
     pathology:"Deviation toward affected side on opening = ipsilateral disc or muscle pathology",
     redflag:"Unilateral deviation + pain + swelling = septic arthritis or condylar fracture"},
    {id:"rom_tlatr",mv:"Lat Deviation R",bilateral:false,normal:10,unit:"mm",plane:"Frontal",axis:"Vertical",
     start:"Same",gonio:"Same",muscles:"Contralateral pattern",
     endfeel:{normal:"Firm",abnormal:"Hard/Springy"},
     compensation:"Head tilt",capsular:"Compare L vs R",adl:"Chewing",pathology:"Same as L",redflag:"Same"},
    {id:"rom_tpro",mv:"Protrusion",bilateral:false,normal:8,unit:"mm",plane:"Sagittal",axis:"Frontal",
     start:"Seated, teeth together; measure forward movement of lower incisor beyond upper",gonio:"Ruler measurement",
     muscles:"Bilateral lateral pterygoid",
     endfeel:{normal:"Firm (temporomandibular ligament)",abnormal:"Hard=bony/OA; Reduced=capsular restriction"},
     compensation:"Forward head posture",capsular:"Reduced protrusion: bilateral capsular pattern",
     adl:"Chewing tough foods, mandibular positioning",
     pathology:"Reduced protrusion: bilateral disc displacement, OA, fibrosis post-infection",
     redflag:"Malocclusion post-trauma = condylar fracture"},
  ],
  "Shoulder":[
    {id:"rom_sflex",mv:"Flexion",bilateral:true,normal:180,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine or seated; scapula stabilised after 60°",gonio:"Axis: lateral shoulder (GH joint); Fixed: mid-axillary line; Moving: lateral humerus to lateral epicondyle",
     muscles:"Anterior deltoid, coracobrachialis (0–90°); upper trap + serratus anterior (scapular upward rotation 60–180°)",
     endfeel:{normal:"Firm (posterior capsule + infraspinatus/teres minor)",abnormal:"Hard=OA/calcification; Springy=subacromial impingement; Empty=septic/acute RC tear"},
     compensation:"Trunk extension (lean back), elbow flex, shoulder hike (upper trap), scapular winging",
     capsular:"GH capsular pattern: ER>Abd>IR (STTT); impingement pattern: painful arc 60–120°",
     adl:"Reaching overhead (shelf, hair wash), throwing, swimming",
     pathology:"Arc 60–120°: impingement or partial RC. Arc 120–180° on ascent: AC joint. Full loss: frozen shoulder",
     redflag:"Sudden painless loss after trauma = complete RC tear. Fever + hot joint = septic arthritis"},
    {id:"rom_sext",mv:"Extension",bilateral:true,normal:60,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Prone or standing; stabilise scapula to prevent anterior tipping",gonio:"Axis: lateral GH; Fixed: mid-axillary line; Moving: lateral humerus",
     muscles:"Posterior deltoid, teres major, latissimus dorsi, long head triceps",
     endfeel:{normal:"Firm (anterior capsule + coracohumeral ligament)",abnormal:"Hard=OA; Springy=biceps long head"},
     compensation:"Trunk flexion, scapular anterior tipping, shoulder IR",
     capsular:"Extension less affected in GH capsular pattern than ER/Abd",
     adl:"Reaching behind back (hand to back pocket, bra hook), pushing off from chair",
     pathology:"Limited: anterior capsule tightness, biceps tendon pathology, pec major tightness",
     redflag:"Pain at extreme extension = anterior instability, SLAP lesion"},
    {id:"rom_sabd",mv:"Abduction",bilateral:true,normal:180,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, elbow extended, thumb up (scapular plane preferred = 30° forward)",gonio:"Axis: posterior GH joint; Fixed: parallel to spine; Moving: posterior humerus",
     muscles:"Supraspinatus (0–15°), deltoid (15–90°), serratus + trap (60–180° scapular rotation)",
     endfeel:{normal:"Firm (inferior GH capsule + adductors)",abnormal:"Hard=OA/calcification; Springy=subacromial impingement; Empty=fracture/acute tear"},
     compensation:"Trunk lateral lean (Trendelenburg shoulder), shoulder hike, scapular winging, elbow flex",
     capsular:"Primary GH restriction: ER>Abd>IR. Assess scapulohumeral rhythm (N = 2:1 GH:scap ratio)",
     adl:"Reaching out to side, dressing (arm into sleeve), carrying objects at side",
     pathology:"Arc 60–120°: impingement or partial RC; Full loss: frozen shoulder, GH OA, complete RC tear",
     redflag:"Acute painful arc + weakness + trauma = complete RC tear. Document scapulohumeral rhythm deviation"},
    {id:"rom_sadd",mv:"Adduction",bilateral:true,normal:30,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, assess cross-body adduction (horizontal adduction)",gonio:"Axis: anterior GH; Fixed: acromion to acromion line; Moving: humerus",
     muscles:"Pec major, latissimus dorsi, teres major, anterior deltoid",
     endfeel:{normal:"Soft (arm contact with trunk) or firm",abnormal:"Pain at extreme: AC joint pathology (horizontal add)"},
     compensation:"Trunk lean",capsular:"AC joint positive: horizontal adduction most painful",
     adl:"Hugging, crossing arms, ADL cross-body reach",
     pathology:"Horizontal adduction pain: AC joint OA, ACJ injury, subacromial pathology",
     redflag:"Cross-body pain after fall = ACJ sprain — assess step deformity"},
    {id:"rom_ser",mv:"ER",bilateral:true,normal:90,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine, shoulder 0° abduction, elbow 90°; ALSO test at 90° abduction",gonio:"Axis: olecranon; Fixed: vertical/perpendicular to table; Moving: ulna/forearm",
     muscles:"Infraspinatus, teres minor, posterior deltoid",
     endfeel:{normal:"Firm (anterior capsule + subscapularis)",abnormal:"Hard=OA; Springy=impingement; Empty=acute"},
     compensation:"Shoulder elevation, trunk rotation, scapular protraction",
     capsular:"ER most limited in GH capsular pattern (frozen shoulder) — key diagnostic finding",
     adl:"Combing hair, overhead reach, throwing wind-up",
     pathology:"ER loss primary sign of GH capsular restriction. ER loss at 90° = posterior capsule tightness → impingement",
     redflag:"ER lag sign (passive > active by >5°) = infraspinatus tear. Profound ER weakness = axillary nerve injury"},
    {id:"rom_sir",mv:"IR",bilateral:true,normal:70,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine, shoulder 0° abduction, elbow 90°; assess thumb-to-back (functional IR) = N: T8–T10 level",gonio:"Axis: olecranon; Fixed: vertical; Moving: ulna",
     muscles:"Subscapularis, anterior deltoid, teres major, pec major, latissimus",
     endfeel:{normal:"Firm (posterior capsule + muscles)",abnormal:"Hard=OA; Springy=posterior capsule restriction"},
     compensation:"Shoulder protraction, trunk rotation, scapular anterior tipping",
     capsular:"Posterior capsule tightness: IR limited → GIRD (glenohumeral internal rotation deficit) in throwers",
     adl:"Reaching behind back, bra hook, tucking shirt, toileting",
     pathology:"GIRD: IR loss >15° vs opposite in overhead athletes → impingement risk. Posterior labral tear",
     redflag:"Internal rotation lag sign = subscapularis tear. Belly press weakness = subscapularis rupture"},
    {id:"rom_shabd",mv:"Horiz Abduction",bilateral:true,normal:45,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine or seated, shoulder 90° abduction → assess horizontal abd",gonio:"Axis: AC joint; Fixed: acromion line; Moving: humerus",
     muscles:"Posterior deltoid, infraspinatus, teres minor",
     endfeel:{normal:"Firm (anterior capsule + pec major)",abnormal:"Springy=posterior capsule impingement"},
     compensation:"Trunk rotation",capsular:"Horizontal ABD stretches posterior capsule: reproduce posterior shoulder pain",
     adl:"Throwing follow-through, backstroke",
     pathology:"Limited horizontal ABD + posterior pain: posterior capsule tightness or posterior labral tear",
     redflag:"Instability testing: apprehension with horizontal ABD + ER = anterior instability"},
    {id:"rom_shadd",mv:"Horiz Adduction",bilateral:true,normal:135,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Shoulder 90° flex → add horizontally across body",gonio:"Axis: posterior GH; Fixed: shoulder line; Moving: humerus",
     muscles:"Pec major (sternal), anterior deltoid, coracobrachialis",
     endfeel:{normal:"Soft (contact) or firm",abnormal:"Pain at end: AC joint pathology"},
     compensation:"Trunk rotation",capsular:"AC joint: positive horizontal ADD — Scarf/cross-body test",
     adl:"Reaching across body, hugging",
     pathology:"Horizontal ADD pain at AC joint = AC pathology (Scarf test); posterior = subacromial",
     redflag:"AC joint injury grading: I (sprain), II (ACJ step), III (complete)"},
  ],
  "Elbow":[
    {id:"rom_eflex",mv:"Flexion",bilateral:true,normal:145,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Anatomical position, forearm supinated",gonio:"Axis: lateral epicondyle; Fixed: lateral humerus mid-axillary; Moving: lateral forearm to radial styloid",
     muscles:"Biceps brachii, brachialis, brachioradialis",
     endfeel:{normal:"Soft (muscle bulk contact) or hard (bone-to-bone in lean patients)",abnormal:"Hard (osteophyte/loose body); Springy (anterior capsule issue)"},
     compensation:"Shoulder flex/abd to assist",capsular:"Elbow capsular: Flex>Ext (lateral pivot shift pattern)",
     adl:"Feeding, grooming, phone use, pulling objects",
     pathology:"Limited flex: posterior osteophyte, loose body, OA; pain at end range: posterior impingement",
     redflag:"Effusion: check fat pad sign (X-ray). Valgus stress pain with flexion = UCL injury"},
    {id:"rom_eext",mv:"Extension",bilateral:true,normal:0,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Anatomical position",gonio:"Same as flexion",
     muscles:"Triceps brachii, anconeus",
     endfeel:{normal:"Hard (bone-to-bone: olecranon in fossa)",abnormal:"Firm (capsular — common in OA); Springy (loose body)"},
     compensation:"Shoulder elevation, wrist flex",capsular:"Extension loss primary sign elbow OA/capsular",
     adl:"Pushing, pressing, reaching far, overhead work",
     pathology:"Extension loss: OA, posterior impingement, loose body, flexion contracture post-fracture; Hyperextension: laxity/UCL injury",
     redflag:"Extension loss after trauma = fracture (radial head, coronoid). Hyperextension = posterior dislocation risk"},
    {id:"rom_esup",mv:"Supination",bilateral:true,normal:90,unit:"°",plane:"Transverse",axis:"Longitudinal",
     start:"Elbow 90° flexion, arm at side (eliminates shoulder rotation compensation)",gonio:"Axis: third finger; Fixed: parallel to humerus; Moving: dorsal forearm/pencil held in hand",
     muscles:"Biceps brachii (primary), supinator",
     endfeel:{normal:"Firm (interosseous membrane, pronator teres, oblique cord)",abnormal:"Hard=radial head OA/DRUJ arthritis; Springy=ligamentous"},
     compensation:"Shoulder ER, trunk rotation",capsular:"DRUJ capsular: supination>pronation",
     adl:"Receiving change, carrying soup bowl, turning door handle (external knob), hammering upward blow",
     pathology:"Limited supination: radial head fracture/OA, DRUJ arthritis, interosseous membrane injury",
     redflag:"Supination pain + lateral elbow = radial head fracture post-fall. DRUJ dislocation"},
    {id:"rom_epro",mv:"Pronation",bilateral:true,normal:90,unit:"°",plane:"Transverse",axis:"Longitudinal",
     start:"Elbow 90° flexion, arm at side",gonio:"Same as supination",
     muscles:"Pronator teres, pronator quadratus",
     endfeel:{normal:"Firm (interosseous membrane + supinator stretch)",abnormal:"Hard=DRUJ OA; Empty=acute fracture"},
     compensation:"Shoulder IR, trunk rotation",capsular:"DRUJ: pronation often better preserved than supination",
     adl:"Typing, cutting food, writing, pouring liquid",
     pathology:"Limited pronation: DRUJ arthritis, distal radius malunion, interosseous membrane",
     redflag:"Loss after distal radius fracture = DRUJ injury. Pronator syndrome: painful pronation + median nerve symptoms"},
  ],
  "Wrist":[
    {id:"rom_wflex",mv:"Wrist Flexion",bilateral:true,normal:80,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Forearm supported in pronation, wrist neutral",gonio:"Axis: lateral wrist (triquetrum); Fixed: ulna; Moving: 5th metacarpal",
     muscles:"FCR, FCU, palmaris longus; FDP/FDS assist",
     endfeel:{normal:"Firm (posterior capsule + extensor muscle stretch)",abnormal:"Hard=OA/Kienböck; Springy=TFCC/SL ligament"},
     compensation:"Forearm supination, finger extension",capsular:"Wrist capsular: flex=ext restriction in symmetry (capsular) or asymmetric (ligamentous)",
     adl:"Typing (neutral preferred), prayer position, push-up position",
     pathology:"Limited painful flex: dorsal ganglia, DISI instability, dorsal wrist impingement; Wrist OA",
     redflag:"Limited + painful with swelling = scaphoid fracture (snuffbox tenderness). TFCC: ulnar sided pain + limited"},
    {id:"rom_wext",mv:"Wrist Extension",bilateral:true,normal:70,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Forearm supported in pronation",gonio:"Axis: lateral wrist; Fixed: ulna; Moving: 5th metacarpal",
     muscles:"ECRL, ECRB, ECU",
     endfeel:{normal:"Firm (anterior capsule + flexor stretch)",abnormal:"Hard=OA; Springy=volar plate laxity"},
     compensation:"Forearm pronation, finger flex",capsular:"Wrist OA: both flex and ext equally limited",
     adl:"Push-up, weight bearing on hands, typing (slight extension), keyboard use",
     pathology:"Limited extension: tennis elbow (wrist ext pain); distal radius fracture malunion; volar ganglia",
     redflag:"<30° extension after Colles fracture = malunion — DRUJ check"},
    {id:"rom_wrad",mv:"Radial Deviation",bilateral:true,normal:20,unit:"°",plane:"Frontal",axis:"AP",
     start:"Forearm pronated on table, wrist neutral",gonio:"Axis: middle of wrist (capitate); Fixed: forearm midline; Moving: 3rd metacarpal",
     muscles:"FCR (with ECRL), APL, EPB",
     endfeel:{normal:"Firm (ulnar collateral ligament + ECU/FCU)",abnormal:"Hard=OA/scaphoid impingement; Springy=radial styloid"},
     compensation:"Forearm supination",capsular:"RA: radial deviation restricted early",
     adl:"Keyboard use, pouring, hammering",
     pathology:"Limited radial deviation: scaphoid OA, radial styloid impingement, intersection syndrome",
     redflag:"Painful radial deviation after fall = de Quervain's (Finkelstein test). Scaphoid fracture"},
    {id:"rom_wuln",mv:"Ulnar Deviation",bilateral:true,normal:30,unit:"°",plane:"Frontal",axis:"AP",
     start:"Forearm pronated on table, wrist neutral",gonio:"Same as radial deviation",
     muscles:"FCU, ECU",
     endfeel:{normal:"Firm (radial collateral ligament + muscles)",abnormal:"Hard=OA; Springy=TFCC"},
     compensation:"Forearm pronation",capsular:"RA: ulnar deviation is deformity direction — assess actively",
     adl:"Hammering, wringing, reaching lateral objects",
     pathology:"TFCC injury: painful ulnar deviation; Ulnar impaction: ulnar wrist pain + limited ulnar dev",
     redflag:"RA: ulnar drift deformity — do not force ulnar deviation. TFCC + ulnar impaction"},
  ],
  "Hand & Fingers":[
    {id:"rom_mcp",mv:"MCP Flexion",bilateral:true,normal:90,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Wrist neutral, assess each finger MCP individually",gonio:"Axis: dorsal MCP joint; Fixed: metacarpal shaft; Moving: proximal phalanx dorsum",
     muscles:"Flexor digitorum superficialis/profundus, lumbricals, interossei",
     endfeel:{normal:"Firm (collateral ligaments + joint capsule)",abnormal:"Springy=flexor tenosynovitis; Hard=OA/Dupuytren"},
     compensation:"Wrist flexion, finger abd/add",capsular:"RA: MCP volar subluxation + ulnar drift — assess passively with care",
     adl:"Gripping, keyboard, writing, pinching",
     pathology:"Limited MCP flex: Dupuytren's contracture, flexor tenosynovitis, RA/OA, post-fracture",
     redflag:"Sudden triggering = trigger finger (stenosing tenosynovitis). RA: MCPs swollen bilaterally = synovitis"},
    {id:"rom_pip",mv:"PIP Flexion",bilateral:true,normal:100,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"MCP neutral, assess each PIP",gonio:"Axis: lateral PIP; Fixed: proximal phalanx; Moving: middle phalanx",
     muscles:"FDS (primary PIP flexor)",
     endfeel:{normal:"Soft (tissue contact, lean) or firm",abnormal:"Springy=volar plate laxity; Hard=OA/bony block"},
     compensation:"MCP flex, wrist flex",capsular:"PIP capsular: flex>ext",
     adl:"All grip functions",
     pathology:"PIP limited: Boutonnière deformity (RA/trauma), volar plate injury, fracture, post-immobilisation contracture",
     redflag:"PIP swelling after injury = volar plate avulsion (jammed finger). Boutonnière = PIP flex + DIP ext deformity"},
    {id:"rom_dip",mv:"DIP Flexion",bilateral:true,normal:90,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"PIP in extension; assess DIP flex/ext",gonio:"Axis: lateral DIP; Fixed: middle phalanx; Moving: distal phalanx",
     muscles:"FDP (sole DIP flexor)",
     endfeel:{normal:"Firm (dorsal capsule + extensor mechanism)",abnormal:"Hard=Heberden's nodes (OA); Springy=extensor mechanism"},
     compensation:"PIP flex",capsular:"DIP: OA causes Heberden's nodes + limited flex",
     adl:"Fine pinch, typing, intricate hand work",
     pathology:"DIP extension loss: mallet finger (extensor digitorum avulsion). DIP OA: Heberden's nodes",
     redflag:"Mallet finger: DIP rests in flex, cannot actively extend = extensor avulsion — splint 6 weeks"},
    {id:"rom_thopp",mv:"Thumb Opposition",bilateral:true,normal:null,unit:"",plane:"Multi",axis:"Multi",
     start:"Assess little finger pad contact with thumb pad",gonio:"Kapandji index (0–10 scale): 0=thumb cannot reach index; 10=full opposition past little finger base",
     muscles:"Opponens pollicis, FPB, APB, FPL",
     endfeel:{normal:"Firm (1st CMC joint + AdPoll + EP)",abnormal:"Hard=CMC OA; Springy=UCL laxity (Skier's thumb)"},
     compensation:"Wrist flex, forearm pronation",capsular:"1st CMC OA: adduction + extension most limited → Z-deformity",
     adl:"Pinching, writing, buttoning, feeding, key grip",
     pathology:"CMC OA (common in women >50): adduction/extension limited → pain base thumb. CTS: APB weakness → opposition weakness",
     redflag:"CMC OA grading: I (ligamentous laxity), II–IV (progressive narrowing). Grind test positive"},
    {id:"rom_thabdm",mv:"Thumb Abd/Ext",bilateral:true,normal:70,unit:"°",plane:"Frontal",axis:"AP",
     start:"Wrist neutral, thumb alongside index; palmar abduction (out of palm plane)",gonio:"Axis: 1st MCP; Fixed: 1st metacarpal; Moving: proximal phalanx",
     muscles:"APB, APL (abduction); EPL, EPB (extension)",
     endfeel:{normal:"Firm (adductor pollicis + 1st dorsal interosseous)",abnormal:"Hard=1st CMC OA; Springy=UCL"},
     compensation:"Wrist radial deviation",capsular:"1st CMC: abduction + extension restriction in OA",
     adl:"Holding large objects, typing space bar, jar opening",
     pathology:"de Quervain's: APL/EPB tenosynovitis — painful abduction; Limited: CMC OA",
     redflag:"UCL injury (Skier's thumb): valgus stress test at MCP. Stener lesion = surgical"},
  ],
  "Hip":[
    {id:"rom_hflex",mv:"Flexion",bilateral:true,normal:120,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine, knee flexed (eliminates hamstring restriction) — assess also with knee extended",gonio:"Axis: greater trochanter; Fixed: mid-axillary line; Moving: lateral femur to lateral condyle",
     muscles:"Iliopsoas (primary), rectus femoris, TFL, sartorius",
     endfeel:{normal:"Soft (anterior thigh-abdomen contact) or firm",abnormal:"Firm early=capsular/OA; Hard=CAM impingement; Empty=acute"},
     compensation:"Lumbar flexion (monitor: loss of lordosis), contralateral hip flex, posterior pelvic tilt",
     capsular:"Hip capsular: IR>Flex>Abd (late stage: all planes)",
     adl:"Sitting, stair climbing, getting out of car, sexual activity, tying shoes",
     pathology:"Limited flex: hip OA (capsular), CAM/pincer FAI, iliopsoas tendinopathy, labral tear",
     redflag:"Groin pain at end-range flex = labral tear (FADIR positive). Trauma + loss = fracture/dislocation"},
    {id:"rom_hext",mv:"Extension",bilateral:true,normal:20,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Prone, stabilise pelvis; knee extended (test hip capsule) + knee flexed 90° (test iliopsoas)",gonio:"Axis: greater trochanter; Fixed: mid-axillary line; Moving: lateral femur",
     muscles:"Gluteus maximus, hamstrings (knee extended), posterior adductor magnus",
     endfeel:{normal:"Firm (iliofemoral ligament + anterior capsule)",abnormal:"Hard=OA/CAM; Springy=posterior impingement"},
     compensation:"Lumbar hyperextension (anterior pelvic tilt), knee flex (to use hamstrings)",
     capsular:"Hip OA: extension + IR restricted earliest",
     adl:"Walking push-off, stair descending, standing from seated",
     pathology:"Hip ext loss: hip flexor contracture (Thomas test), hip OA, lumbar facet compensation",
     redflag:"Bilateral hip ext loss + fixed flexion = AS. Thomas test positive = psoas/rectus tightness"},
    {id:"rom_habd",mv:"Abduction",bilateral:true,normal:45,unit:"°",plane:"Frontal",axis:"AP",
     start:"Supine, pelvis level; stabilise contralateral ASIS",gonio:"Axis: ASIS; Fixed: ASIS-to-ASIS line; Moving: midline of thigh to midpoint of patella",
     muscles:"Gluteus medius/minimus, TFL, piriformis (at 0° flex)",
     endfeel:{normal:"Firm (adductors + pubofemoral ligament + medial capsule)",abnormal:"Hard=OA/CAM; Springy=labrum"},
     compensation:"Lateral pelvic tilt (hip hike), lumbar lateral flex, trunk lean",
     capsular:"Hip OA: abduction limited with internal rotation (combined movement most restricted)",
     adl:"Getting in/out of car, stepping sideways, putting on trousers/socks",
     pathology:"Limited abd: OA, labral tear (CAM), adductor tightness, Legg-Calvé-Perthes, DDH",
     redflag:"Bilateral abd loss in child = DDH/LCP — urgent referral. Trendelenburg sign = Gmed weakness"},
    {id:"rom_hadd",mv:"Adduction",bilateral:true,normal:30,unit:"°",plane:"Frontal",axis:"AP",
     start:"Supine, move test leg across midline; stabilise contralateral ASIS",gonio:"Axis: ASIS; Fixed: ASIS line; Moving: midline thigh",
     muscles:"Adductor longus/brevis/magnus, gracilis, pectineus",
     endfeel:{normal:"Firm (IT band + abductors + lateral capsule)",abnormal:"Springy=adductor strain; Hard=OA"},
     compensation:"Contralateral pelvis drop, trunk lean ipsilateral",capsular:"Less restricted than abd in OA",
     adl:"Crossing legs, horseback riding",
     pathology:"Painful adduction: adductor strain, osteitis pubis, sports hernia",
     redflag:"Adductor squeeze test <18cmHg = groin strain. Groin pain in child/adolescent = SUFE — urgent X-ray"},
    {id:"rom_her",mv:"ER",bilateral:true,normal:45,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Supine, hip + knee 90° (seated) OR prone, knee 90° (pelvis stabilised)",gonio:"Axis: knee (midpoint); Fixed: vertical; Moving: distal fibula/tibia (pendulum method)",
     muscles:"Piriformis, obturator internus/externus, gemelli, gluteus maximus (posterior fibers)",
     endfeel:{normal:"Firm (anterior capsule + iliofemoral ligament + internal rotators)",abnormal:"Hard=OA; Springy=labral tear"},
     compensation:"Lateral pelvic tilt, lumbar rotation",capsular:"Hip OA: IR more limited than ER (early); Both limited end-stage",
     adl:"Cross-legged sitting, walking toe-out gait, external rotation in sport",
     pathology:"Piriformis syndrome: painful ER + sciatic symptoms; Hip OA: ER preserved longer than IR",
     redflag:"Bilateral ER loss in child = SUFE. Painful ER in trauma = posterior hip dislocation"},
    {id:"rom_hir",mv:"IR",bilateral:true,normal:45,unit:"°",plane:"Transverse",axis:"Vertical",
     start:"Prone knee 90° (most reliable); or supine hip 90°",gonio:"Same pendulum method as ER",
     muscles:"Gluteus medius (anterior), TFL, adductor longus",
     endfeel:{normal:"Firm (posterior capsule + external rotators + ischiofemoral ligament)",abnormal:"Hard=OA/FAI; Empty=acute; Springy=labrum"},
     compensation:"Trunk rotation, pelvic rotation",capsular:"Hip IR FIRST AND MOST LIMITED in early hip OA — key diagnostic sign",
     adl:"Getting in/out of car, sitting cross-legged is limited, pivoting",
     pathology:"IR loss: hip OA (earliest sign), CAM FAI, posterior capsule tightness; GIRD equivalent at hip",
     redflag:"IR loss + groin pain in middle-aged = hip OA. Sudden IR loss in child = SUFE/LCP — X-ray"},
  ],
  "Knee":[
    {id:"rom_kflex",mv:"Flexion",bilateral:true,normal:140,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine or prone; assess both actively and passively",gonio:"Axis: lateral knee (lateral condyle); Fixed: lateral femur (greater trochanter to condyle line); Moving: lateral fibula to lateral malleolus",
     muscles:"Hamstrings (primary), gastrocnemius (assists at end range), popliteus (initiates)",
     endfeel:{normal:"Soft (posterior calf-thigh contact) or firm (capsule in lean patients)",abnormal:"Springy=meniscal block; Hard=OA/loose body; Empty=acute hemarthrosis"},
     compensation:"Hip flex to assist, ankle plantar flex to increase apparent knee flex",
     capsular:"Knee capsular: Flex>Ext (3:1 ratio in OA)",
     adl:"Stair climbing (N=85°), sitting (N=90°), squatting (N=130°), kneeling (N=140°)",
     pathology:"Limited flex: knee OA, effusion (30° is maximum comfortable flexion in effusion), patellofemoral OA, quadriceps contracture",
     redflag:"Springy block = meniscal tear (bucket handle). Locked knee = urgent. Haemarthrosis post-trauma = ACL tear"},
    {id:"rom_kext",mv:"Extension",bilateral:true,normal:0,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine; assess extension lag (difference between passive and active extension)",gonio:"Same as flexion",
     muscles:"Quadriceps (rectus femoris, vasti)",
     endfeel:{normal:"Firm (posterior capsule + posterior ligaments) or hard (bone-to-bone in hyperextension)",abnormal:"Springy=posterior impingement; Hard=OA; Soft early=effusion"},
     compensation:"Hip extension, ankle DF",capsular:"Extension loss: OA, post-surgery (arthrofibrosis), hamstring tightness",
     adl:"Walking (requires 0°), stair descent, standing",
     pathology:"Extension lag: quadriceps weakness or patella tendon rupture. Flexion contracture: OA, post-fracture, arthrofibrosis",
     redflag:"Extension lag >10° = quadriceps mechanism injury (patella or patellar tendon). PCL injury = posterior sag"},
  ],
  "Ankle":[
    {id:"rom_adf",mv:"Dorsiflexion",bilateral:true,normal:20,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine or seated (non-weight bearing); also assess weight-bearing lunge test (N ≥ 10cm heel-to-wall)",gonio:"Axis: lateral malleolus; Fixed: fibula shaft; Moving: 5th metatarsal shaft",
     muscles:"Tibialis anterior, EHL, EDL, peroneus tertius",
     endfeel:{normal:"Firm (posterior capsule + Achilles/soleus tension)",abnormal:"Hard=bony block (anterior OA/os trigonum); Springy=anterior impingement; Empty=Achilles rupture"},
     compensation:"Subtalar eversion (to compensate DF with pronation), knee flex, hip flex, anterior trunk lean",
     capsular:"Ankle capsular: PF>DF (STTT)",
     adl:"Stair climbing (N=15–20°), squatting, kneeling, gait push-off",
     pathology:"Limited DF: Achilles/soleus tightness (equinus), anterior bony impingement, os trigonum, posterior capsule adhesions",
     redflag:"<10° DF = kinetic chain effects: knee valgus, foot pronation, pelvic anterior tilt in squat. Heel cord: Silfverskiöld test"},
    {id:"rom_apf",mv:"Plantarflexion",bilateral:true,normal:50,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine, ankle relaxed",gonio:"Axis: lateral malleolus; Fixed: fibula; Moving: 5th metatarsal",
     muscles:"Gastrocnemius, soleus, tibialis posterior, peroneals, FHL/FDL",
     endfeel:{normal:"Firm (anterior capsule + anterior muscles stretch)",abnormal:"Hard=posterior OA/loose body; Springy=ligamentous"},
     compensation:"Hip IR, trunk lean",capsular:"Plantarflexion less affected than DF in ankle OA",
     adl:"Heel raise, ballet, push-off in walking, cycling",
     pathology:"Limited PF: anterior impingement syndrome, Achilles calcification, anterior capsule adhesion",
     redflag:"Sudden PF loss after push-off = Achilles rupture (Thompson test negative)"},
    {id:"rom_ainv",mv:"Inversion",bilateral:true,normal:35,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, ankle in plantar flex (tests subtalar); assess talar tilt",gonio:"Axis: posterior calcaneus; Fixed: tibia shaft; Moving: posterior calcaneus",
     muscles:"Tibialis posterior, FHL, FDL, tibialis anterior",
     endfeel:{normal:"Firm (lateral ligaments + peroneal muscles)",abnormal:"Springy=ATFL/CFL laxity; Hard=coalition; Empty=acute sprain"},
     compensation:"Tibial IR, knee flex",capsular:"Subtalar: inversion > eversion restriction in subtalar OA",
     adl:"Walking on uneven ground, sand",
     pathology:"Hypermobile inversion: lateral ankle sprain (ATFL/CFL); Limited: subtalar OA, tarsal coalition, peroneal tendinopathy",
     redflag:">35° inversion + pain + swelling post-sprain = grade III ATFL tear — anterior draw test. Ottawa rules: X-ray"},
    {id:"rom_aev",mv:"Eversion",bilateral:true,normal:15,unit:"°",plane:"Frontal",axis:"AP",
     start:"Seated, ankle neutral",gonio:"Axis: posterior calcaneus; Fixed: tibia; Moving: posterior calcaneus",
     muscles:"Peroneus longus/brevis, peroneus tertius, EDB",
     endfeel:{normal:"Firm (medial deltoid ligament + tibialis posterior)",abnormal:"Hard=coalition; Springy=deltoid laxity"},
     compensation:"Tibial ER, knee ext",capsular:"Eversion less commonly restricted than inversion",
     adl:"Walking on uneven ground (medial stability)",
     pathology:"Hypomobile eversion: peroneal tendinopathy, subtalar OA; Hypermobile: deltoid ligament laxity",
     redflag:"Eversion force mechanism injury = deltoid ligament tear (medial ankle) — assess with stress X-ray"},
  ],
  "Foot":[
    {id:"rom_1mtpf",mv:"1st MTP Extension",bilateral:true,normal:70,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Standing (functional) or supine; windlass test: active hallux extension",gonio:"Axis: 1st MTP joint; Fixed: 1st metatarsal; Moving: proximal phalanx plantar surface",
     muscles:"EHL (active); passive: plantar fascia (windlass mechanism)",
     endfeel:{normal:"Firm (plantar plate + FHL + plantar fascia windlass)",abnormal:"Hard=hallux rigidus (OA); Springy=sesamoiditis; Empty=fracture"},
     compensation:"Supination of forefoot, external rotation of limb, early heel rise (antalgic gait)",
     capsular:"1st MTP OA (hallux rigidus): extension severely limited, end-range painful",
     adl:"Walking push-off (requires 65–70° MTP extension), running, going up stairs",
     pathology:"Hallux rigidus: progressive MTP extension loss → antalgic gait with external rotation. Hallux valgus: deviated alignment",
     redflag:"Acute MTP pain + limitation = turf toe (plantar plate sprain) or fracture. Grade III turf toe = surgical"},
    {id:"rom_1mtpp",mv:"1st MTP Flexion",bilateral:true,normal:45,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine, ankle neutral",gonio:"Axis: dorsal MTP; Fixed: 1st metatarsal; Moving: dorsal proximal phalanx",
     muscles:"FHL, FHB",
     endfeel:{normal:"Firm (dorsal capsule + EHL stretch)",abnormal:"Hard=OA; Springy=sesamoid"},
     compensation:"Ankle DF to assist toe flex",capsular:"OA: both flex and ext limited",
     adl:"Running, push-off power",
     pathology:"Limited: hallux rigidus, FHL tenosynovitis (dancer's posterior ankle pain)",
     redflag:"Posterior ankle pain + limited MTP flex in dancer = FHL tenosynovitis or os trigonum"},
    {id:"rom_mtpf2",mv:"2nd–5th MTP Extension",bilateral:true,normal:40,unit:"°",plane:"Sagittal",axis:"Frontal",
     start:"Supine; assess each MTP extension passively",gonio:"Axis: each MTP joint",
     muscles:"EDL, EDB",
     endfeel:{normal:"Firm (plantar plate + FDL)",abnormal:"Springy=plantar plate injury; Hard=OA"},
     compensation:"Hip and knee extension",capsular:"Lesser MTP OA: variable restriction",
     adl:"Walking push-off, running",
     pathology:"Limited/painful MTP ext: Morton's neuroma (not joint), metatarsalgia, stress fracture, plantar plate injury",
     redflag:"2nd MTP dorsal dislocation (Lisfranc injury): severe pain + limited ROM + plantar ecchymosis"},
  ],
};

const ROM_REGIONS=Object.keys(ROM_DATA);
const RESTRICTION_GRADE=(measured,normal)=>{
  if(!measured||!normal) return null;
  const pct=(measured/normal)*100;
  if(pct>115) return{label:"Hypermobile",color:"#7c3aed",pct};
  if(pct>=85) return{label:"WNL",color:"#00c97a",pct};
  if(pct>=65) return{label:"Mild",color:"#ffb300",pct};
  if(pct>=40) return{label:"Moderate",color:"#ff8c42",pct};
  return{label:"Severe",color:"#ff4d6d",pct};
};

const ROM_REDFLAGS=[
  {test:(mv,val)=>mv.toLowerCase().includes("cervical")&&parseFloat(val)<20,msg:"Cervical ROM <20° — fracture/instability protocol. Do not passively test.",color:"#ff4d6d"},
  {test:(mv,val)=>mv.toLowerCase().includes("ankle dorsiflexion")&&parseFloat(val)<10,msg:"Ankle DF <10° — significant equinus. Kinetic chain assessment required.",color:"#ff8c42"},
  {test:(mv,val)=>mv.toLowerCase().includes("hip ir")&&parseFloat(val)<20,msg:"Hip IR <20° — possible early hip OA or FAI. Labral tear assessment indicated.",color:"#ff8c42"},
  {test:(mv,val)=>mv.toLowerCase().includes("knee flex")&&parseFloat(val)<90,msg:"Knee flexion <90° — functional limitation for ADLs. Effusion assessment needed.",color:"#ff8c42"},
];

const MMT_GRADES=[
  {g:"5",label:"Normal",desc:"Full ROM against gravity + full resistance. No fatigue.",color:"#00c97a"},
  {g:"4+",label:"Good+",desc:"Full ROM against gravity + strong resistance, slight give at end.",color:"#43d68a"},
  {g:"4",label:"Good",desc:"Full ROM against gravity + moderate resistance.",color:"#7fe88a"},
  {g:"4-",label:"Good-",desc:"Full ROM against gravity + less than moderate resistance.",color:"#b5f0a0"},
  {g:"3+",label:"Fair+",desc:"Full ROM against gravity + minimal resistance.",color:"#ffb300"},
  {g:"3",label:"Fair",desc:"Full ROM against gravity, no added resistance.",color:"#ffc940"},
  {g:"3-",label:"Fair-",desc:"More than half ROM against gravity.",color:"#ffd97a"},
  {g:"2+",label:"Poor+",desc:"Initiates movement against gravity OR full ROM gravity eliminated.",color:"#ff8c42"},
  {g:"2",label:"Poor",desc:"Full ROM in gravity-eliminated position.",color:"#ff6b2b"},
  {g:"2-",label:"Poor-",desc:"More than half ROM gravity eliminated.",color:"#ff8c6b"},
  {g:"1",label:"Trace",desc:"Palpable/visible contraction, no movement.",color:"#ff4d6d"},
  {g:"0",label:"Zero",desc:"No contraction detected on palpation.",color:"#8b0000"},
];

const MMT_DATA={
  "Cervical":[
    {id:"mmt_scm",muscle:"Sternocleidomastoid",action:"Neck flexion + ipsilateral lateral flex + contralateral rotation",nerve:"CN XI + C2–C3",root:"C2–C3",origin:"Manubrium + medial clavicle",insertion:"Mastoid process + lateral occiput",
     patient:"Supine",therapist:"Hand on forehead; stabilise thorax",resistance:"Anterior forehead into extension",gravElim:"Side-lying, support head",palpation:"Anterior neck — prominent cord from clavicle to mastoid",
     compensation:"Trunk flexion, chin poke",substitution:"Anterior scalenes, platysma",
     functional:"Head control, swallowing, UCS pattern",chain:"Overactive SCM → inhibited DNF → forward head posture"},
    {id:"mmt_dnf",muscle:"Deep Neck Flexors (longus colli/capitis)",action:"Cervical flexion with chin tuck",nerve:"C1–C4 anterior rami",root:"C1–C4",origin:"Anterior vertebral bodies C1–T3",insertion:"Basilar occiput + anterior atlas",
     patient:"Supine",therapist:"Two fingers under chin; watch for chin poke",resistance:"Posterior occiput into extension — CCFT preferred (pressure biofeedback 22–30 mmHg)",gravElim:"N/A",palpation:"Deep to SCM — cannot directly palpate; use CCFT",
     compensation:"SCM dominant — chin protrudes instead of retracts",substitution:"SCM, scalenes",
     functional:"Cervicogenic headache, WAD, forward head correction",chain:"Weak DNF → SCM overactivity → suboccipital compression → headache"},
    {id:"mmt_trap_u",muscle:"Upper Trapezius",action:"Scapular elevation + cervical lat flex + extension",nerve:"CN XI + C3–C4",root:"C3–C4",origin:"Occiput + nuchal ligament + C7 SP",insertion:"Lateral clavicle + acromion",
     patient:"Seated",therapist:"Hand on top of shoulder",resistance:"Depress shoulder while patient shrugs",gravElim:"Supine — shoulder elevation against table",palpation:"Superior shoulder — thick band from neck to shoulder",
     compensation:"Lateral trunk lean",substitution:"Levator scapulae",
     functional:"UCS overactivation → inhibits lower trap — test bilaterally",chain:"Overactive UT + inhibited LT = classic UCS → impingement"},
    {id:"mmt_levsc",muscle:"Levator Scapulae",action:"Scapular elevation + cervical rotation/lateral flex",nerve:"C3–C4 + dorsal scapular (C5)",root:"C3–C5",origin:"C1–C4 transverse processes",insertion:"Superior angle scapula",
     patient:"Seated",therapist:"Resist shoulder elevation with neck rotated away",resistance:"Depress scapula",gravElim:"N/A",palpation:"Posterior neck between SCM and upper trap — taut band in tension",
     compensation:"Trunk lean",substitution:"Upper trap",
     functional:"Often overactive and shortened in desk workers; rarely truly weak",chain:"Tight levator → scapular downward rotation → impingement pattern"},
    {id:"mmt_scalenes",muscle:"Scalenes (Ant/Mid/Post)",action:"Cervical lateral flex + rib 1 elevation (inspiration)",nerve:"C3–C8 anterior rami",root:"C3–C8",origin:"C2–C7 transverse processes",insertion:"Rib 1 (ant/mid) + Rib 2 (post)",
     patient:"Supine",therapist:"Hand on temple, resist lateral flex",resistance:"Lateral cervical flex resistance",gravElim:"Supine supported",palpation:"Lateral neck between SCM and trapezius — palpate with caution (brachial plexus proximity)",
     compensation:"Trunk lean",substitution:"SCM",
     functional:"Thoracic outlet syndrome. TOS cluster: scalene tightness + first rib elevation + paresthesia",chain:"Tight scalenes → first rib elevation → TOS → ulnar symptoms"},
  ],
  "Shoulder & Scapula":[
    {id:"mmt_deltA",muscle:"Deltoid — Anterior",action:"Shoulder flexion 0–90°",nerve:"Axillary nerve",root:"C5–C6",origin:"Anterior lateral clavicle",insertion:"Deltoid tuberosity",
     patient:"Seated, arm at side",therapist:"Proximal forearm; stabilise shoulder",resistance:"Downward into extension at ~80° flex",gravElim:"Sidelying, support arm horizontal",palpation:"Anterior shoulder — bulk anterior to acromion",
     compensation:"Trunk extension, shoulder hike",substitution:"Biceps, pec major (clavicular head)",
     functional:"Reach forward, feeding, grooming",chain:"Weak ant delt → pec dominant → protracted shoulder → impingement"},
    {id:"mmt_deltM",muscle:"Deltoid — Middle",action:"Shoulder abduction 0–90°",nerve:"Axillary nerve",root:"C5–C6",origin:"Acromion",insertion:"Deltoid tuberosity",
     patient:"Seated",therapist:"Proximal forearm; scapula stabilised",resistance:"Downward into adduction at 90° abd",gravElim:"Supine, arm horizontal",palpation:"Lateral shoulder — most prominent deltoid mass",
     compensation:"Trunk lean, shoulder hike, scapular winging",substitution:"Supraspinatus initiates, upper trap hike",
     functional:"Reaching overhead, carrying",chain:"Weak mid delt + upper trap overactivity → impingement arc"},
    {id:"mmt_deltP",muscle:"Deltoid — Posterior",action:"Shoulder extension + ER + horizontal abduction",nerve:"Axillary nerve",root:"C5–C6",origin:"Scapular spine",insertion:"Deltoid tuberosity",
     patient:"Supine or seated, shoulder abducted 90°, elbow flexed 90°, humerus IR ~45°",therapist:"Posterior surface of distal humerus; stabilise opposite shoulder",resistance:"Into adduction + slight flexion",gravElim:"Sidelying",palpation:"Posterior lateral deltoid — posterior to acromion",
     compensation:"Trunk rotation, scapular retraction substitution",substitution:"Teres major, posterior RC",
     functional:"Posterior chain weakness → rounded shoulder pattern",chain:"Weak post delt → anterior dominance → thoracic kyphosis"},
    {id:"mmt_supra",muscle:"Supraspinatus",action:"Shoulder abduction initiation (0–15°) + GH compression",nerve:"Suprascapular nerve",root:"C5–C6",origin:"Supraspinous fossa",insertion:"Greater tuberosity (superior facet)",
     patient:"Seated, scapular plane (30° forward of frontal)",therapist:"Proximal forearm",resistance:"Downward at 90° in scapular plane",gravElim:"Supine",palpation:"Superior fossa above scapular spine — assess for atrophy",
     compensation:"Shoulder hike (upper trap), trunk lean",substitution:"Middle deltoid (loses initiation role)",
     functional:"Most commonly torn RC muscle. Test with empty-can and full-can",chain:"Supraspinatus tear → loss of superior cuff force couple → impingement"},
    {id:"mmt_infra",muscle:"Infraspinatus",action:"Shoulder ER",nerve:"Suprascapular nerve",root:"C5–C6",origin:"Infraspinous fossa",insertion:"Greater tuberosity (middle facet)",
     patient:"Prone, arm over edge, elbow 90°",therapist:"Distal forearm; stabilise elbow",resistance:"Into IR (downward) at neutral rotation",gravElim:"Supine, elbow at side",palpation:"Infraspinous fossa below scapular spine — assess for atrophy",
     compensation:"Trunk rotation, scapular retraction",substitution:"Teres minor, posterior deltoid",
     functional:"Key humeral head depressor. Weak infra → superior humeral migration → impingement",chain:"Infra + teres minor weakness → anterosuperior humeral migration"},
    {id:"mmt_subscap",muscle:"Subscapularis",action:"Shoulder IR",nerve:"Upper + lower subscapular nerves",root:"C5–C6",origin:"Subscapular fossa",insertion:"Lesser tuberosity",
     patient:"Prone, arm over edge, elbow 90°",therapist:"Distal forearm",resistance:"Into ER (upward)",gravElim:"Supine",palpation:"Axilla — difficult; use lift-off + belly press tests",
     compensation:"Trunk rotation, shoulder protraction",substitution:"Pec major, teres major, anterior delt",
     functional:"Primary IR and anterior stabiliser. Tear → ER lag + anterior instability",chain:"Weak subscap → anterior instability → recurrent dislocation risk"},
    {id:"mmt_tmin",muscle:"Teres Minor",action:"Shoulder ER + GH compression",nerve:"Axillary nerve",root:"C5–C6",origin:"Lateral border scapula (upper 2/3)",insertion:"Greater tuberosity (inferior facet)",
     patient:"Seated or supine, elbow flexed 90°, humerus ER",therapist:"Posterior distal forearm; stabilise elbow",resistance:"Into IR",gravElim:"N/A",palpation:"Posterior axillary fold lateral to infraspinatus — below scapular spine",
     compensation:"Same as infraspinatus",substitution:"Infraspinatus",
     functional:"Hornblower's sign specific for teres minor. Isolated ER at 90° abd",chain:"Teres minor tear → ER lag at 90° abduction — Hornblower positive"},
    {id:"mmt_tmaj",muscle:"Teres Major",action:"Shoulder IR + extension + adduction",nerve:"Lower subscapular nerve",root:"C5–C6",origin:"Inferior angle scapula",insertion:"Medial lip bicipital groove",
     patient:"Prone, arm at side, shoulder slightly abducted",therapist:"Distal humerus",resistance:"Into ER and abduction",gravElim:"Sidelying",palpation:"Posterior axillary fold below teres minor — bulk inferior to infra",
     compensation:"Trunk rotation",substitution:"Latissimus dorsi, subscapularis",
     functional:"Often overactive — compensates for weak lat dorsi",chain:""},
    {id:"mmt_lat",muscle:"Latissimus Dorsi",action:"Shoulder IR + extension + adduction; depression of shoulder girdle",nerve:"Thoracodorsal nerve",root:"C6–C8",origin:"T7–L5 SPs + iliac crest + inferior angle scapula",insertion:"Floor bicipital groove",
     patient:"Prone, arm abducted 120°, IR (thumb down)",therapist:"Distal humerus",resistance:"Upward and outward (into abduction+ER)",gravElim:"Sidelying",palpation:"Posterior axillary fold and lateral thorax — large fan",
     compensation:"Trunk rotation, pelvis drop",substitution:"Teres major, posterior deltoid",
     functional:"Pull-down, rowing power. Weakness → poor shoulder depression, thoracic kyphosis driver",chain:"Weak lat → poor shoulder depression → rib flare → LBP in overhead athletes"},
    {id:"mmt_pec_maj_c",muscle:"Pectoralis Major — Clavicular",action:"Shoulder flexion + horizontal adduction",nerve:"Lateral pectoral nerve",root:"C5–C6",origin:"Medial clavicle",insertion:"Lateral lip bicipital groove",
     patient:"Supine, arm 90° flex",therapist:"Distal humerus",resistance:"Into extension + abduction",gravElim:"Seated, arm supported",palpation:"Superior pec — anterior axillary fold, near clavicle",
     compensation:"Trunk rotation, shoulder hike",substitution:"Anterior deltoid",
     functional:"Horizontal press, throwing. Often overactive → protracted shoulder",chain:""},
    {id:"mmt_pec_maj_s",muscle:"Pectoralis Major — Sternal",action:"Shoulder adduction + IR + extension from 90° flex",nerve:"Medial + lateral pectoral nerves",root:"C6–T1",origin:"Sternum + ribs 2–6",insertion:"Lateral lip bicipital groove",
     patient:"Supine, arm 60° abduction",therapist:"Distal humerus",resistance:"Into abduction",gravElim:"Seated, arm supported",palpation:"Anterior chest — sternal portion below clavicular head",
     compensation:"Trunk rotation",substitution:"Latissimus, teres major",
     functional:"Adduction and IR power. Often overactive in UCS",chain:"Overactive sternal pec → anterior humeral glide → impingement"},
    {id:"mmt_pec_min",muscle:"Pectoralis Minor",action:"Scapular protraction + anterior tilt + depression",nerve:"Medial pectoral nerve",root:"C8–T1",origin:"Ribs 3–5",insertion:"Coracoid process",
     patient:"Supine",therapist:"Test via forward shoulder position — passive stretch assessment preferred",resistance:"Coracoid press (manual)",gravElim:"N/A",palpation:"Below clavicle, under pec major — requires firm palpation through pec major",
     compensation:"N/A",substitution:"Serratus anterior (protraction)",
     functional:"Commonly short/tight → scapular anterior tilt → subacromial narrowing",chain:"Tight pec minor → scapular anterior tilt → impingement → RC tear risk"},
    {id:"mmt_serrant",muscle:"Serratus Anterior",action:"Scapular protraction + upward rotation; holds medial border to thorax",nerve:"Long thoracic nerve",root:"C5–C7",origin:"Ribs 1–8 lateral surface",insertion:"Medial border + inferior angle scapula (costal surface)",
     patient:"Standing or seated — wall push-up test",therapist:"Observe scapula during arm elevation + push-up plus",resistance:"Resist scapular protraction at elbow",gravElim:"Supine — protract scapula",palpation:"Lateral thorax below pec major — serrated fingers visible in lean athlete",
     compensation:"Scapular winging (medial border lifts), upper trap dominance",substitution:"Upper trapezius (incomplete substitute)",
     functional:"Long thoracic nerve palsy → classic winging. Critical for impingement prevention",chain:"Weak serratus → winging → reduced upward rotation → impingement"},
    {id:"mmt_trap_m",muscle:"Middle Trapezius",action:"Scapular retraction",nerve:"CN XI + C3–C4",root:"C3–C4",origin:"C7–T3 spinous processes",insertion:"Acromion + scapular spine (medial)",
     patient:"Prone, arm 90° abduction (T position)",therapist:"Distal humerus",resistance:"Into protraction (downward and forward)",gravElim:"Seated, arm supported",palpation:"Between scapulae at T1–T3 level",
     compensation:"Trunk rotation, scapular elevation",substitution:"Rhomboids (poor quality substitute — downward rotate)",
     functional:"Scapular retraction for rowing, posture. Often inhibited in rounded shoulder",chain:"Weak mid trap + overactive pec → protraction → impingement"},
    {id:"mmt_trap_l",muscle:"Lower Trapezius",action:"Scapular depression + upward rotation + retraction",nerve:"CN XI + C3–C4",root:"C3–C4",origin:"T4–T12 spinous processes",insertion:"Scapular spine (medial end)",
     patient:"Prone, arm 130–160° (Y position)",therapist:"Distal humerus",resistance:"Downward and lateral (into elevation + protraction)",gravElim:"Seated, arm at 130°",palpation:"Inferior to scapular spine converging toward T5–T8 midline",
     compensation:"Trunk extension, lat dominance",substitution:"Latissimus (pulls scapula down but internally rotates arm)",
     functional:"Most commonly inhibited in UCS. Essential for overhead stability",chain:"Weak lower trap → scapular upward rotation failure → impingement → RC tear"},
    {id:"mmt_rhomb",muscle:"Rhomboids (Maj + Min)",action:"Scapular retraction + downward rotation + elevation",nerve:"Dorsal scapular nerve",root:"C4–C5",origin:"C7–T5 spinous processes",insertion:"Medial scapular border",
     patient:"Seated (or side-lying), humerus adducted at side, elbow flexed 90°",therapist:"Medial surface of distal humerus; stabilise ipsilateral shoulder",resistance:"Into abduction (away from spine)",gravElim:"Side-lying",palpation:"Medial scapular border — deep to trapezius; difficult",
     compensation:"Trunk rotation",substitution:"Middle trap",
     functional:"Often overused as substitute for lower trap. Downward rotation is harmful pattern",chain:"Rhomboid dominance → scapular downward rotation → impingement"},
    {id:"mmt_corbrach",muscle:"Coracobrachialis",action:"Shoulder flexion + adduction",nerve:"Musculocutaneous nerve",root:"C5–C7",origin:"Coracoid process",insertion:"Medial humerus (mid-shaft)",
     patient:"Seated, arm 45° flexion + slight adduction",therapist:"Distal humerus",resistance:"Into extension + abduction",gravElim:"Sidelying",palpation:"Medial arm proximal — deep to biceps in axilla region",
     compensation:"Trunk flex, shoulder hike",substitution:"Anterior deltoid, pec major clavicular",
     functional:"Rarely isolated clinically; assessed with anterior shoulder complex",chain:""},
  ],
  "Elbow & Forearm":[
    {id:"mmt_bicep",muscle:"Biceps Brachii",action:"Elbow flexion + forearm supination",nerve:"Musculocutaneous nerve",root:"C5–C6",origin:"Coracoid (short) + supraglenoid tubercle (long)",insertion:"Radial tuberosity + bicipital aponeurosis",
     patient:"Seated, elbow 90°, forearm supinated",therapist:"Distal forearm",resistance:"Into extension",gravElim:"Supine, arm at side",palpation:"Anterior arm belly — most palpable with supinated elbow flex",
     compensation:"Trunk flexion, shoulder shrug",substitution:"Brachialis, brachioradialis (lose supination component)",
     functional:"Rupture — Popeye sign. SLAP associated. Test C5/C6 myotome",chain:"Biceps overactivity (tight) → inhibited triceps → elbow extension limitation"},
    {id:"mmt_brach",muscle:"Brachialis",action:"Elbow flexion (all positions)",nerve:"Musculocutaneous nerve (+ small radial nerve branch)",root:"C5–C6",origin:"Anterior humerus (distal half)",insertion:"Coronoid process + ulnar tuberosity",
     patient:"Seated, elbow 90°, forearm PRONATED (eliminates biceps supination advantage)",therapist:"Distal forearm",resistance:"Into extension",gravElim:"Supine, arm at side",palpation:"Lateral to biceps, distal arm — under biceps",
     compensation:"Trunk flex, shoulder flex",substitution:"Biceps (different forearm position distinguishes)",
     functional:"True elbow flexor. Test with pronated forearm to isolate from biceps",chain:""},
    {id:"mmt_brachio",muscle:"Brachioradialis",action:"Elbow flexion (midprone position most effective)",nerve:"Radial nerve",root:"C5–C6",origin:"Lateral supracondylar ridge",insertion:"Styloid process radius",
     patient:"Seated, forearm MIDPRONE (thumb up)",therapist:"Distal forearm",resistance:"Into extension",gravElim:"Supine",palpation:"Lateral forearm proximal — superficial cord when resisted in midprone",
     compensation:"Trunk flex",substitution:"Biceps, brachialis",
     functional:"Radial nerve test muscle (C5/C6). Preserved in posterior interosseous nerve injury",chain:""},
    {id:"mmt_tricep",muscle:"Triceps Brachii",action:"Elbow extension",nerve:"Radial nerve",root:"C6–C8 (primarily C7)",origin:"Infraglenoid tubercle (long) + posterior humerus (med/lat)",insertion:"Olecranon",
     patient:"Seated or supine, forearm supinated, elbow flexed ~45°, humerus abducted 30–40° with slight ER",therapist:"Stabilise posterior distal humerus; contact anterior forearm",resistance:"Into flexion (toward forearm flexion)",gravElim:"Supine, arm supported in 90° shoulder flex",palpation:"Posterior arm — all three heads palpable; long head medial, lateral head lateral",
     compensation:"Shoulder extension, trunk extension",substitution:"Gravity (in supine positioning)",
     functional:"C7 myotome. Key test for C6/7 disc herniation. Radial nerve palsy = triceps weakness",chain:"Weak triceps → elbow extension deficit → overhead press limitation"},
    {id:"mmt_supinator",muscle:"Supinator",action:"Forearm supination (with elbow extended — eliminates biceps)",nerve:"Deep radial nerve (posterior interosseous)",root:"C6",origin:"Lateral epicondyle + supinator crest of ulna",insertion:"Anterior radius (proximal third)",
     patient:"Seated, elbow extended, forearm pronated",therapist:"Distal forearm",resistance:"Into pronation",gravElim:"Supported forearm",palpation:"Deep — cannot palpate directly; isolate by testing with elbow extended",
     compensation:"Shoulder ER, biceps activation (flex elbow to test supinator alone)",substitution:"Biceps (dominant supinator when elbow flexed)",
     functional:"Posterior interosseous nerve injury → supinator + wrist/finger extensor weakness",chain:""},
    {id:"mmt_pt",muscle:"Pronator Teres",action:"Forearm pronation + elbow flexion assist",nerve:"Median nerve",root:"C6–C7",origin:"Medial epicondyle + coronoid process",insertion:"Lateral radius (mid)",
     patient:"Seated, elbow 90°, forearm supinated",therapist:"Distal forearm",resistance:"Into supination",gravElim:"Supported",palpation:"Medial forearm proximal — oblique cord from medial epicondyle",
     compensation:"Shoulder IR",substitution:"Pronator quadratus",
     functional:"Pronator syndrome: compression of median nerve by PT — pain with resisted pronation + elbow flex",chain:""},
    {id:"mmt_pq",muscle:"Pronator Quadratus",action:"Forearm pronation (with elbow extended — isolates from PT)",nerve:"Anterior interosseous nerve (median)",root:"C8–T1",origin:"Distal anterior ulna",insertion:"Distal anterior radius",
     patient:"Seated, elbow extended, forearm supinated",therapist:"Distal forearm",resistance:"Into supination",gravElim:"Supported",palpation:"Distal anterior forearm — deep; cannot distinguish from PT by palpation",
     compensation:"Shoulder IR",substitution:"Pronator teres",
     functional:"AIN injury → loss of PQ + FPL + FDP index → weak pinch (OK sign)",chain:""},
  ],
  "Wrist & Hand":[
    {id:"mmt_ecrb",muscle:"ECRL + ECRB",action:"Wrist extension + radial deviation",nerve:"Radial nerve (ECRL) + deep radial/PIN (ECRB)",root:"C6–C7",origin:"Lateral supracondylar ridge",insertion:"2nd (ECRL) + 3rd (ECRB) metacarpal bases",
     patient:"Seated, forearm pronated, wrist neutral",therapist:"Dorsum of hand",resistance:"Into flexion + ulnar deviation",gravElim:"Forearm supported on table",palpation:"Dorsal forearm lateral — prominent with wrist ext + radial dev",
     compensation:"Finger extensors, trunk",substitution:"EDC (finger extensors extend wrist weakly)",
     functional:"C6 myotome. Radial nerve palsy = wrist drop. Tennis elbow: ECRB origin",chain:"ECRB weakness → compensatory wrist flex → CTS risk"},
    {id:"mmt_ecul",muscle:"Extensor Carpi Ulnaris",action:"Wrist extension + ulnar deviation",nerve:"Posterior interosseous nerve",root:"C7–C8",origin:"Lateral epicondyle + posterior ulna",insertion:"5th metacarpal base",
     patient:"Forearm pronated, wrist neutral",therapist:"Dorso-ulnar hand",resistance:"Into flexion + radial deviation",gravElim:"Forearm supported",palpation:"Dorso-ulnar forearm — distal to lateral epicondyle",
     compensation:"EDC",substitution:"ECU absent → ECR only → radial deviation during extension",
     functional:"DRUJ stabiliser. ECU instability → ulnar wrist pain in athletes",chain:""},
    {id:"mmt_fcr",muscle:"Flexor Carpi Radialis",action:"Wrist flexion + radial deviation",nerve:"Median nerve",root:"C6–C7",origin:"Medial epicondyle",insertion:"2nd metacarpal base",
     patient:"Forearm supinated, wrist neutral",therapist:"Palmar radial hand",resistance:"Into extension + ulnar deviation",gravElim:"Forearm supported",palpation:"Volar forearm radial — prominent tendon with resisted flex + radial dev",
     compensation:"FDP/FDS (finger flex weakly flex wrist)",substitution:"FCU",
     functional:"Median nerve injury → FCR weak → wrist deviates ulnar during flex",chain:""},
    {id:"mmt_fcu",muscle:"Flexor Carpi Ulnaris",action:"Wrist flexion + ulnar deviation",nerve:"Ulnar nerve",root:"C7–T1",origin:"Medial epicondyle + olecranon/ulnar border",insertion:"Pisiform → hook hamate → 5th metacarpal",
     patient:"Forearm supinated",therapist:"Palmar ulnar hand",resistance:"Into extension + radial deviation",gravElim:"Forearm supported",palpation:"Ulnar border volar forearm — tendon to pisiform",
     compensation:"FDP/FDS",substitution:"FCR",
     functional:"Cubital tunnel: ulnar nerve at elbow → FCU weak + intrinsic weak + ulnar claw",chain:""},
    {id:"mmt_fdp",muscle:"FDP (Flexor Digitorum Profundus)",action:"DIP flexion (all fingers)",nerve:"AIN of median (index/middle) + ulnar (ring/little)",root:"C7–C8",origin:"Anterior ulna + interosseous membrane",insertion:"Distal phalanx base (volar)",
     patient:"Stabilise middle phalanx; flex DIP",therapist:"Stabilise PIP in extension",resistance:"DIP extension",gravElim:"Hand flat on table",palpation:"Anterior forearm — deep layer",
     compensation:"FDS activation (flexes PIP not DIP)",substitution:"Intrinsics cannot flex DIP",
     functional:"AIN injury: FDP index + FDP middle + FPL weak → pinch deficit (OK sign). Profundus avulsion: jersey finger",chain:""},
    {id:"mmt_fds",muscle:"FDS (Flexor Digitorum Superficialis)",action:"PIP flexion",nerve:"Median nerve",root:"C7–T1",origin:"Medial epicondyle + radius",insertion:"Middle phalanx base (volar)",
     patient:"Hold all non-tested fingers in extension; active PIP flex on tested finger",therapist:"Stabilise adjacent fingers (blocks FDP)",resistance:"PIP extension",gravElim:"Hand resting",palpation:"Anterior forearm — mid layer; feel tendons at wrist",
     compensation:"FDP (if adjacent fingers not blocked)",substitution:"Cannot substitute in correct isolation",
     functional:"Median nerve injury proximal → FDS weak. Test each finger independently",chain:""},
    {id:"mmt_edc",muscle:"EDC (Extensor Digitorum Communis)",action:"MCP extension (finger extension)",nerve:"Posterior interosseous nerve",root:"C7–C8",origin:"Lateral epicondyle",insertion:"Extensor hood → middle + distal phalanges",
     patient:"Fist then extend MCPs",therapist:"Dorsal proximal phalanges",resistance:"Into MCP flexion",gravElim:"Hand resting",palpation:"Dorsal forearm — four tendons visible on dorsum hand",
     compensation:"Intrinsics (IP extension without MCP extension)",substitution:"EIP, EDM (partial)",
     functional:"Radial nerve palsy → wrist drop + finger drop. PIN injury → finger drop only (wrist ext preserved)",chain:""},
    {id:"mmt_lumb",muscle:"Lumbricals (1st–4th)",action:"MCP flexion + IP extension simultaneously",nerve:"Median (1st + 2nd) + Ulnar (3rd + 4th)",root:"C8–T1",origin:"FDP tendons",insertion:"Radial lateral band extensor hood",
     patient:"MCP 90° flex, IPs extended",therapist:"Resist MCP into extension + IP into flexion",resistance:"Disrupt intrinsic-plus position",gravElim:"Hand supported",palpation:"Lateral aspect finger — very small; impractical to palpate",
     compensation:"EDC (extends IPs but also extends MCPs)",substitution:"Interossei (similar action)",
     functional:"Key for intrinsic-plus position. Ulnar nerve injury → 4th+5th claw (ring/little finger claw deformity)",chain:"Intrinsic weakness → claw hand → grip deficit"},
    {id:"mmt_interos",muscle:"Palmar + Dorsal Interossei",action:"Finger adduction (palmar) + abduction (dorsal) + MCP flex + IP ext",nerve:"Ulnar nerve (deep branch)",root:"C8–T1",origin:"Metacarpal shafts",insertion:"Extensor hood + proximal phalanx bases",
     patient:"Fingers flat on table; abduct/adduct against resistance",therapist:"Resist individual finger adduction/abduction",resistance:"Into adduction (dorsal) or abduction (palmar)",gravElim:"Hand on table",palpation:"First dorsal interosseous — web space thumb/index; most accessible",
     compensation:"Flexor or extensor tendons impart some deviation",substitution:"N/A",
     functional:"Ulnar nerve injury → all interossei weak → Froment's sign + claw. Wartenberg's sign",chain:"Weak interossei → poor lateral pinch → grip compensation → flexor overuse → trigger finger"},
    {id:"mmt_apbrev",muscle:"Abductor Pollicis Brevis",action:"Thumb palmar abduction",nerve:"Median nerve (recurrent branch)",root:"C8–T1",origin:"Flexor retinaculum + scaphoid + trapezium",insertion:"Radial base proximal phalanx thumb",
     patient:"Hand supinated, thumb raised away from palm",therapist:"Resist thumb back toward palm",resistance:"Into adduction",gravElim:"Hand on table",palpation:"Thenar eminence — most superficial thenar muscle",
     compensation:"APL (abducts thumb in plane of palm — not palmar abduction)",substitution:"FPB (assists weakly)",
     functional:"CTS → APB weakness + thenar atrophy. Key median nerve test at wrist",chain:"Weak APB → poor opposition → thumb circumduction → grip pattern change"},
    {id:"mmt_adpoll",muscle:"Adductor Pollicis",action:"Thumb adduction",nerve:"Ulnar nerve (deep branch)",root:"C8–T1",origin:"3rd metacarpal + capitate + 2nd metacarpal (oblique head)",insertion:"Ulnar base proximal phalanx thumb",
     patient:"Thumb parallel to index, adduct toward index",therapist:"Resist thumb from adducting",resistance:"Abduction",gravElim:"Hand flat",palpation:"First web space — deep; palpate between thumb and index metacarpals",
     compensation:"FPL (flexes IP to maintain paper between fingers = Froment's sign)",substitution:"FPL substitution",
     functional:"Froment's sign: paper held between thumb/index — IP flex = FPL compensating for weak Add Poll (ulnar nerve)",chain:""},
    {id:"mmt_fpoll",muscle:"FPL (Flexor Pollicis Longus)",action:"Thumb IP flexion",nerve:"Anterior interosseous nerve (median)",root:"C7–C8",origin:"Anterior radius + interosseous membrane",insertion:"Distal phalanx thumb (volar)",
     patient:"Stabilise proximal phalanx; flex thumb DIP",therapist:"Stabilise thumb MCP in extension",resistance:"IP extension",gravElim:"Hand resting",palpation:"Anterior forearm radial — deep to FCR",
     compensation:"FPB (MCP flex only)",substitution:"None for IP flex",
     functional:"AIN injury: FPL + FDP (index/middle) + PQ → cannot make OK sign (circle sign test)",chain:""},
    {id:"mmt_epi",muscle:"Extensor Pollicis Longus + Brevis",action:"Thumb IP extension (EPL) + MCP extension (EPB)",nerve:"Posterior interosseous nerve",root:"C7–C8",origin:"Posterior ulna (EPL) + posterior radius (EPB)",insertion:"Distal phalanx (EPL) + proximal phalanx (EPB)",
     patient:"Forearm pronated, thumb extended",therapist:"Resist thumb into flexion at IP (EPL) or MCP (EPB)",resistance:"Into flexion",gravElim:"Forearm supported",palpation:"Anatomical snuffbox borders — EPL ulnar border; EPB radial border",
     compensation:"APL (abducts but cannot extend)",substitution:"N/A",
     functional:"EPL rupture: RA complication (attrition rupture at Lister's tubercle). Retroposition test = EPL integrity",chain:""},
  ],
  "Spine & Core":[
    {id:"mmt_rflex",muscle:"Rectus Abdominis",action:"Trunk flexion",nerve:"T5–T12 anterior rami",root:"T5–T12",origin:"Pubic crest + symphysis",insertion:"Xiphoid + costal cartilages 5–7",
     patient:"Supine, knees flexed",therapist:"Watch trunk curl",resistance:"Grade 5: arms crossed + curl off table; Grade 4: arms forward; Grade 3: arms at head; Grade 2: partial curl; Grade 1: palpate",gravElim:"N/A",palpation:"Anterior abdomen between linea alba",
     compensation:"Hip flexors pull pelvis — watch lumbar arch",substitution:"Hip flexors (flex trunk weakly via pelvis)",
     functional:"Diastasis recti: linea alba separation — palpate gap during crunch",chain:"Weak rectus → posterior pelvic tilt deficit → LBP pattern"},
    {id:"mmt_oblique",muscle:"External + Internal Obliques",action:"Trunk rotation + lateral flex",nerve:"T6–L1 anterior rami",root:"T6–L1",origin:"Ribs 5–12 (EO); iliac crest + inguinal lig (IO)",insertion:"Linea alba + iliac crest",
     patient:"Supine, knees flexed",therapist:"Resist rotation",resistance:"Oblique curl — elbow to opposite knee",gravElim:"Gravity eliminated rotation in sidelying",palpation:"Lateral abdominal wall — EO most superficial; IO under EO",
     compensation:"Trunk extension, hip flexors",substitution:"RA (flexion only)",
     functional:"Core rotation power. Weak obliques → poor rotational control → disc injury",chain:"Weak obliques + tight hip flexors → anterior pelvic tilt → LBP"},
    {id:"mmt_ta",muscle:"Transversus Abdominis",action:"Intra-abdominal pressure + lumbar corset",nerve:"T6–L1 anterior rami",root:"T6–L1",origin:"Lateral inguinal lig + iliac crest + thoracolumbar fascia + costal cartilages 7–12",insertion:"Linea alba + pubic crest via conjoint tendon",
     patient:"Crook-lying; draw-in manoeuvre",therapist:"Ultrasound preferred; or RTPU method — palpate just medial to ASIS",resistance:"Not a standard MMT — assess via draw-in / CCFT / ultrasound",gravElim:"N/A",palpation:"2cm medial + inferior to ASIS — feel firm contraction during draw-in without OI activation",
     compensation:"Breath holding, OI/EO dominant contraction",substitution:"External oblique (sucking in belly)",
     functional:"Inhibited in ALL chronic LBP. Must activate BEFORE limb movement (feed-forward). Assessed via CCFT and real-time US",chain:"Weak TA → loss of lumbar segmental control → disc, facet, SIJ injury"},
    {id:"mmt_multif",muscle:"Multifidus",action:"Lumbar segmental extension + rotation control",nerve:"Medial branch of posterior rami",root:"L1–S3",origin:"Posterior sacrum + mammillary processes L1–L5",insertion:"Spinous processes 2–4 levels above",
     patient:"Prone",therapist:"Palpate adjacent to spinous process; ask for isolated 'swelling' contraction",resistance:"Prone leg lift with multifidus palpation at target segment",gravElim:"N/A",palpation:"1–2cm lateral to spinous process — bimanual fingertip palpation; compare segmental bulk",
     compensation:"Global extensor contraction",substitution:"Erector spinae (extension without segmental control)",
     functional:"Atrophies unilaterally and rapidly after LBP onset. Assess by palpation bilaterally for symmetry. MRI gold standard",chain:"Multifidus atrophy → segmental instability → recurrent disc herniation"},
    {id:"mmt_es",muscle:"Erector Spinae",action:"Trunk extension + lateral flex",nerve:"Posterior rami L1–L5",root:"L1–L5",origin:"Sacrum + iliac crest + spinous processes",insertion:"Ribs + transverse processes + occipital",
     patient:"Prone, arms at side",therapist:"Posterior thorax",resistance:"Resist trunk extension lift off table",gravElim:"Sidelying",palpation:"Bilateral paravertebral columns lateral to spinous processes — very palpable",
     compensation:"Gluteus maximus assists",substitution:"Short intersegmental extensors",
     functional:"Often overactive (hypertonic) rather than truly weak. Assess length-tension",chain:"Overactive ES + weak glute max → hip ext substitution → LBP"},
    {id:"mmt_ql",muscle:"Quadratus Lumborum",action:"Lateral trunk flex + hip hike + respiratory rib 12 anchor",nerve:"T12–L3 anterior rami",root:"T12–L3",origin:"Posterior iliac crest + iliolumbar ligament",insertion:"12th rib + transverse processes L1–L4",
     patient:"Sidelying, hip hike against gravity",therapist:"Stabilise pelvis",resistance:"Hip drop (adduction with lateral trunk flex)",gravElim:"Supine — lateral pelvic tilt",palpation:"Lateral to erector spinae above iliac crest — posterior triangle; bimanual deep pressure",
     compensation:"Lat dorsi, obliques",substitution:"Hip abductors via pelvis",
     functional:"Often OVERACTIVE (tight) when glute med inhibited. QL spasm mimics LBP. Referred pain: buttock, lateral hip, lateral thigh",chain:"Tight QL → elevated iliac crest → scoliotic posture → SIJ strain → hip OA"},
    {id:"mmt_iliop",muscle:"Iliopsoas",action:"Hip flexion + lumbar lordosis",nerve:"Femoral nerve + direct L1–L3",root:"L1–L3",origin:"Iliac fossa (iliacus) + T12–L5 VBs + discs (psoas)",insertion:"Lesser trochanter",
     patient:"Seated at table edge — hip flexion against resistance",therapist:"Distal thigh",resistance:"Into extension",gravElim:"Supine, thigh slides on table",palpation:"Deep to abdominal wall below ASIS — difficult; assess functionally",
     compensation:"Trunk flexion, hip hiking, RA contraction",substitution:"TFL, rectus femoris, sartorius",
     functional:"Thomas test positive = tight. Hip flexion weakness (L2/L3). Psoas abscess mimics hip pathology. Snapping hip syndrome",chain:"Tight iliopsoas → anterior pelvic tilt → lumbar hyperlordosis → facet overload → LBP"},
  ],
  "Hip & Pelvis":[
    {id:"mmt_gmax",muscle:"Gluteus Maximus",action:"Hip extension + ER",nerve:"Inferior gluteal nerve",root:"L5–S2",origin:"Posterior ilium + sacrum + coccyx + sacrotuberous ligament",insertion:"Gluteal tuberosity + IT band",
     patient:"Prone, knee flexed 90° (shortens hamstrings)",therapist:"Posterior distal thigh",resistance:"Into flexion (downward toward table)",gravElim:"Sidelying",palpation:"Buttock mass — most powerful hip extensor; palpate with knee flexed",
     compensation:"Hamstrings, erector spinae, QL",substitution:"Hamstrings (extend hip but flex knee — different pattern)",
     functional:"Dead lift, stair ascent, running push-off. Weak Gmax → hamstring strain, LBP, SIJ instability",chain:"Weak glute max → hamstring compensation → proximal hamstring tendinopathy"},
    {id:"mmt_gmed",muscle:"Gluteus Medius",action:"Hip abduction + IR (anterior fibres) + ER (posterior fibres)",nerve:"Superior gluteal nerve",root:"L4–S1",origin:"Outer ilium (between anterior and posterior gluteal lines)",insertion:"Greater trochanter (lateral + superoposterior)",
     patient:"Sidelying, test leg on top, hip neutral",therapist:"Distal thigh",resistance:"Into adduction",gravElim:"Supine, abduct along table",palpation:"Lateral hip between ASIS and greater trochanter — wide fan",
     compensation:"Hip flexion (TFL substitute), trunk lateral lean, pelvis elevation",substitution:"TFL (flex + IR component), piriformis (ER component)",
     functional:"Trendelenburg sign. Key Gmax for running, stairs. Weak Gmed → lateral knee pain, IT band, patellofemoral pain",chain:"Weak Gmed → Trendelenburg → contralateral hip drop → IT band tension → lateral knee pain"},
    {id:"mmt_gmin",muscle:"Gluteus Minimus",action:"Hip abduction + IR",nerve:"Superior gluteal nerve",root:"L4–S1",origin:"Outer ilium (between anterior and inferior gluteal lines)",insertion:"Greater trochanter (anterior)",
     patient:"Sidelying — same as Gmed test",therapist:"Distal thigh",resistance:"Into adduction",gravElim:"Supine",palpation:"Anterior to Gmed — cannot differentiate clinically from Gmed",
     compensation:"TFL, hip flexion",substitution:"TFL",
     functional:"Clinically grouped with Gmed. Tear: trochanteric bursitis-like presentation",chain:""},
    {id:"mmt_tfl",muscle:"Tensor Fasciae Latae",action:"Hip flexion + abduction + IR; IT band tension",nerve:"Superior gluteal nerve",root:"L4–S1",origin:"ASIS + anterior iliac crest",insertion:"IT band → Gerdy's tubercle",
     patient:"Supine, hip flexed 30° + slight abd + IR",therapist:"Distal thigh",resistance:"Into extension + adduction + ER",gravElim:"Sidelying",palpation:"Lateral to ASIS — anterior lateral thigh proximal",
     compensation:"Rectus femoris, hip flexors",substitution:"Gmed anterior fibres",
     functional:"Often overactive compensating for weak Gmed. IT band tightness. Ober test",chain:"Tight TFL → IT band tension → lateral knee pain → patella maltracking → PFPS"},
    {id:"mmt_adduc",muscle:"Hip Adductors (Longus/Brevis/Magnus/Gracilis/Pectineus)",action:"Hip adduction",nerve:"Obturator nerve (+ femoral for pectineus)",root:"L2–L4",origin:"Pubic rami + ischial tuberosity (magnus)",insertion:"Linea aspera + adductor tubercle (magnus) + medial tibia (gracilis)",
     patient:"Sidelying, test leg on bottom; top leg supported",therapist:"Medial distal thigh",resistance:"Into abduction",gravElim:"Supine — squeeze legs against resistance",palpation:"Medial thigh — longus most anterior; palpate proximal medial thigh",
     compensation:"Hip flexion, trunk lean",substitution:"Gracilis (also flexes knee)",
     functional:"Groin strain = adductor longus usually. Adductor squeeze test <1.0kg = groin strain risk. Sports hernia cluster",chain:"Weak adductors → poor medial knee control → valgus → ACL risk"},
    {id:"mmt_hamstr",muscle:"Hamstrings (Biceps Femoris + Semitendinosus + Semimembranosus)",action:"Knee flexion + hip extension",nerve:"Sciatic nerve (tibial division for semi; common peroneal for BF short head)",root:"L5–S2",origin:"Ischial tuberosity (long) + linea aspera BF (short)",insertion:"Fibula head (BF) + medial tibia (semi)",
     patient:"Prone, knee 90°",therapist:"Distal lower leg",resistance:"Into knee extension",gravElim:"Sidelying",palpation:"Posterior thigh — BF lateral, semiT + semiM medial; palpate at 90° flex",
     compensation:"Hip ER/IR for BF vs semi isolation",substitution:"Gastrocnemius (knee flex at end range)",
     functional:"L5/S1 myotome. Proximal hamstring tendinopathy: ischial tuberosity pain. Strain: musculotendinous junction",chain:"Weak hamstrings → knee hyperextension tendency → PCL stress + quad dominant pattern"},
    {id:"mmt_pirif",muscle:"Piriformis",action:"Hip ER (neutral) + abduction (90° flex)",nerve:"Nerve to piriformis (S1–S2)",root:"S1–S2",origin:"Anterior sacrum (S2–S4)",insertion:"Greater trochanter (superior)",
     patient:"Prone, knee 90°, ER foot toward ceiling (hip ER test)",therapist:"Medial lower leg",resistance:"Into IR (push foot outward = IR = resist ER)",gravElim:"Supine",palpation:"Deep gluteal — midpoint between PSIS and greater trochanter; difficult",
     compensation:"Gluteus maximus",substitution:"Obturators, gemelli",
     functional:"Piriformis syndrome: sciatic nerve compression. FAIR test. Often overactive when Gmed/Gmax inhibited",chain:"Tight piriformis → sciatic compression → pseudo-sciatica → missed disc diagnosis"},
    {id:"mmt_rectfem",muscle:"Rectus Femoris",action:"Knee extension + hip flexion",nerve:"Femoral nerve",root:"L2–L4",origin:"AIIS + acetabular ridge",insertion:"Quadriceps tendon → patella → patellar tendon → tibial tuberosity",
     patient:"Supine, assess knee extension from 90°",therapist:"Distal lower leg",resistance:"Into knee flex",gravElim:"Sidelying",palpation:"Anterior thigh central — straight line from AIIS to patella",
     compensation:"Hip flexion substitution (if tested separately)",substitution:"Vasti (for knee ext); iliopsoas (for hip flex)",
     functional:"Two-joint muscle. Prone knee bend test for tightness. Ely's test. AIIS avulsion in adolescents",chain:"Tight rectus femoris → anterior pelvic tilt → LBP + patellofemoral pain"},
  ],
  "Knee":[
    {id:"mmt_quad",muscle:"Quadriceps (Vastus Medialis/Lateralis/Intermedius)",action:"Knee extension",nerve:"Femoral nerve",root:"L2–L4",origin:"Anterior femur",insertion:"Tibial tuberosity via patellar tendon",
     patient:"Seated, lower leg hanging",therapist:"Anterior distal lower leg",resistance:"Into knee flexion",gravElim:"Sidelying",palpation:"VMO: medial patella — last 10–15° extension. VL: lateral thigh. VI: deep central",
     compensation:"Trunk extension, hip hike",substitution:"None effective",
     functional:"VMO:VL ratio key for patellar tracking. Atrophy post ACL/knee injury. L3/L4 myotome",chain:"Weak VMO → lateral patella tilt → PFPS → chondromalacia"},
    {id:"mmt_gastroc",muscle:"Gastrocnemius",action:"Ankle PF + knee flexion",nerve:"Tibial nerve",root:"S1–S2",origin:"Medial + lateral femoral condyles",insertion:"Calcaneus via Achilles tendon",
     patient:"Prone, knee extended (to test gastroc vs soleus)",therapist:"Plantar foot",resistance:"Into dorsiflexion",gravElim:"Sidelying",palpation:"Posterior calf — most superficial; medial head larger; palpate belly",
     compensation:"Tibialis posterior, peroneals",substitution:"Soleus (if knee flexed — gastroc slack)",
     functional:"Single-leg heel raise × 25 reps = normal. S1 myotome. Achilles rupture (Thompson test). DVT risk: calf pain",chain:"Weak gastroc + soleus → reduced push-off → gait compensation → Achilles tendinopathy"},
    {id:"mmt_poplit",muscle:"Popliteus",action:"Knee IR (tibia on femur) + unlock knee from extension",nerve:"Tibial nerve",root:"L4–S1",origin:"Lateral femoral condyle + arcuate ligament",insertion:"Posterior proximal tibia",
     patient:"Prone, knee 90°, tibial IR",therapist:"Distal lower leg medial border",resistance:"Into tibial ER",gravElim:"Sidelying",palpation:"Posterior knee — deep to heads of gastroc; palpate in popliteal fossa",
     compensation:"Hamstrings",substitution:"Semitendinosus/semimembranosus",
     functional:"First muscle to fire in knee flexion from full extension. Popliteus strain: acute posterolateral knee pain",chain:"Weak popliteus → failed screw-home unlock → knee buckling in early stance"},
  ],
  "Ankle & Foot":[
    {id:"mmt_ta",muscle:"Tibialis Anterior",action:"Ankle dorsiflexion + inversion",nerve:"Deep peroneal nerve",root:"L4–L5",origin:"Lateral tibial condyle + proximal 2/3 anterior tibia",insertion:"Medial cuneiform + 1st metatarsal base",
     patient:"Seated or supine",therapist:"Dorsomedial foot",resistance:"Into plantarflexion + eversion",gravElim:"Sidelying",palpation:"Anterior shin — most prominent tendon medial to tibial crest",
     compensation:"Long toe extensors",substitution:"EHL, EDL (partial DF with eversion)",
     functional:"L4 myotome. Foot drop = L4/L5 or common peroneal nerve. Anterior compartment syndrome risk with exercise",chain:"Weak TA → foot drop → steppage gait → hip flexor overuse → hip flexor strain"},
    {id:"mmt_soleus",muscle:"Soleus",action:"Ankle plantarflexion (dominant with knee flexed)",nerve:"Tibial nerve",root:"S1–S2",origin:"Posterior fibula + soleal line tibia",insertion:"Calcaneus via Achilles tendon",
     patient:"Prone, KNEE FLEXED 90° (slackens gastroc — isolates soleus)",therapist:"Plantar foot",resistance:"Into dorsiflexion",gravElim:"Sidelying",palpation:"Posterior calf deep to gastroc — bulges lateral to gastroc at ankle",
     compensation:"Hip extension assist",substitution:"Gastroc (only if knee extends)",
     functional:"Single-leg heel raise with knee bent. Soleus dominant in quiet standing and low-speed walking. Key for Achilles loading",chain:"Weak soleus → eccentric Achilles overload → mid-portion Achilles tendinopathy"},
    {id:"mmt_tp",muscle:"Tibialis Posterior",action:"Ankle PF + inversion + arch support",nerve:"Tibial nerve",root:"L4–L5",origin:"Posterior interosseous membrane + tibia + fibula",insertion:"Navicular + cuneiforms + metatarsals 2–4",
     patient:"Seated, ankle plantarflexed + inverted",therapist:"Medial plantar foot",resistance:"Into DF + eversion",gravElim:"Supine",palpation:"Medial ankle behind medial malleolus — posterior to medial malleolus tendon",
     compensation:"Gastroc/soleus PF",substitution:"FHL, FDL",
     functional:"TP insufficiency → progressive flatfoot. Navicular drop test. Single-leg heel raise with TP dysfunction: too many toes sign",chain:"Weak TP → medial arch collapse → subtalar pronation → knee valgus → patellofemoral pain → hip IR"},
    {id:"mmt_peronls",muscle:"Peroneals (Longus + Brevis)",action:"Ankle eversion + PF assist; 1st ray plantarflexion (longus)",nerve:"Superficial peroneal nerve",root:"L5–S1",origin:"Fibula shaft (lateral)",insertion:"1st metatarsal/medial cuneiform (longus) + 5th metatarsal base (brevis)",
     patient:"Supine or seated, foot maximally plantarflexed + everted",therapist:"Stabilise proximal to medial malleolus; contact lateral surface of foot",resistance:"Into inversion + DF",gravElim:"Sidelying",palpation:"Lateral lower leg — posterior to fibula; tendons behind lateral malleolus",
     compensation:"EDL (eversion + DF)",substitution:"EDL",
     functional:"Lateral ankle sprain → peroneal injury + weakness → recurrent sprain. Peroneal tendon subluxation. Superficial peroneal nerve injury → weak eversion",chain:"Weak peroneals → inversion instability → recurrent lateral ankle sprain → OA"},
    {id:"mmt_ehl",muscle:"Extensor Hallucis Longus",action:"Great toe extension + ankle DF assist",nerve:"Deep peroneal nerve",root:"L5",origin:"Mid-anterior fibula + interosseous membrane",insertion:"Distal phalanx great toe",
     patient:"Supine, foot relaxed",therapist:"Dorsum distal phalanx great toe",resistance:"Into great toe flexion",gravElim:"N/A",palpation:"Anterior lower leg medial to EDL — tendon visible on dorsum foot to great toe",
     compensation:"Tibialis anterior (DF without toe ext)",substitution:"EDL (partial toe extension)",
     functional:"L5 myotome. EHL weakness: L4/L5 disc herniation hallmark sign. Foot drop assessment",chain:""},
    {id:"mmt_edl",muscle:"Extensor Digitorum Longus + Peroneus Tertius",action:"Toe extension + DF + eversion",nerve:"Deep peroneal nerve",root:"L5–S1",origin:"Lateral condyle tibia + anterior fibula",insertion:"Middle + distal phalanges toes 2–5; 5th metatarsal base (PT)",
     patient:"Supine, foot relaxed",therapist:"Dorsum of toes",resistance:"Into toe flexion",gravElim:"N/A",palpation:"Lateral to TA tendon on dorsum — four tendons visible",
     compensation:"EHL",substitution:"None effective",
     functional:"Foot drop: TA + EHL + EDL all weak (L4/L5 + CPN). Anterior compartment",chain:""},
    {id:"mmt_fdl",muscle:"FDL + FHL (toe flexors)",action:"Toe IP flexion (FDL) + great toe IP flex (FHL)",nerve:"Tibial nerve",root:"S2–S3",origin:"Posterior tibia (FDL) + posterior fibula (FHL)",insertion:"Distal phalanges toes",
     patient:"Supine, flex toes against resistance",therapist:"Plantar surface distal phalanges",resistance:"Into toe extension",gravElim:"Foot resting",palpation:"FHL: medial ankle behind posterior tibialis — behind medial malleolus",
     compensation:"Intrinsic foot muscles",substitution:"Plantar intrinsics (MTP flexion only)",
     functional:"Hallux IP flex = FHL. FHL tenosynovitis in dancers: posterior ankle pain. Trigger toe",chain:""},
    {id:"mmt_abdhal",muscle:"Abductor Hallucis",action:"Great toe abduction + MTP flex",nerve:"Medial plantar nerve",root:"S2–S3",origin:"Calcaneal tuberosity",insertion:"Medial base proximal phalanx great toe",
     patient:"Supine, abduct great toe from 2nd",therapist:"Medial distal great toe",resistance:"Into adduction",gravElim:"Foot resting",palpation:"Medial foot between medial malleolus and 1st metatarsal head — medial arch",
     compensation:"FHL",substitution:"None",
     functional:"Hallux valgus: AbdHal weak and malpositioned. Plantar fasciitis: weak intrinsics. Key foot stability muscle",chain:"Weak AbdHal → loss of medial arch control → plantar fascia overload → plantar fasciitis"},
  ],
  "TMJ & Facial":[
    {id:"mmt_masseter",muscle:"Masseter",action:"Jaw closure (elevation)",nerve:"CN V3 (trigeminal — mandibular)",root:"CN V3",origin:"Zygomatic arch",insertion:"Ramus + angle of mandible",
     patient:"Seated, slightly open mouth",therapist:"Chin — resist closure",resistance:"Into jaw opening",gravElim:"N/A",palpation:"Angle of jaw — prominent with clenching",
     compensation:"Temporalis",substitution:"Temporalis, medial pterygoid",
     functional:"TMJ pain: assess for asymmetric hypertrophy, bruxism, trismus. Normal opening 40–50mm",chain:"Masseter hypertonicity → TMJ compression → disc displacement → headache"},
    {id:"mmt_temporalis",muscle:"Temporalis",action:"Jaw elevation + retraction",nerve:"CN V3",root:"CN V3",origin:"Temporal fossa",insertion:"Coronoid process",
     patient:"Seated",therapist:"Chin",resistance:"Into depression",gravElim:"N/A",palpation:"Temple — palpate during clenching",
     compensation:"Masseter",substitution:"Masseter",
     functional:"Temporal headache from TMJ. Temporalis tenderness = bruxism / TMD",chain:""},
    {id:"mmt_lat_pter",muscle:"Lateral Pterygoid",action:"Jaw opening + protrusion + contralateral deviation",nerve:"CN V3",root:"CN V3",origin:"Lateral pterygoid plate + greater wing sphenoid",insertion:"Condylar neck + articular disc",
     patient:"Resist jaw protrusion",therapist:"Chin anterior surface",resistance:"Into retrusion",gravElim:"N/A",palpation:"Intraoral posterior to upper molars — technically demanding",
     compensation:"Digastric",substitution:"N/A",
     functional:"Hyperactive lat pterygoid → TMJ clicking (disc pulled anteriorly). Key in TMD",chain:"Hyperactive lat pterygoid → anterior disc displacement → clicking → closed lock"},
  ],
  "Respiratory":[
    {id:"mmt_diaphragm",muscle:"Diaphragm",action:"Primary inspiration",nerve:"Phrenic nerve (C3–C5)",root:"C3–C5",origin:"Xiphoid + costal cartilages 6–12 + lumbar vertebrae",insertion:"Central tendon",
     patient:"Supine, observe abdominal expansion on inspiration",therapist:"Hands on lower chest + abdomen",resistance:"Assess paradoxical breathing or reduced excursion",gravElim:"N/A",palpation:"Subcostal — palpate diaphragm excursion; ultrasound preferred",
     compensation:"Accessory muscles (SCM, scalenes, pec minor)",substitution:"Intercostals + accessory muscles",
     functional:"C3/C4 SCI → diaphragm paralysis → ventilator dependence. Hiccups = phrenic irritation. Hook-lying: observe abdominal rise before chest",chain:"Weak diaphragm → accessory muscle over-use → rib 1 elevation → TOS → cervicogenic symptoms"},
    {id:"mmt_intercost",muscle:"Intercostals (External + Internal)",action:"Rib elevation (external) + depression (internal)",nerve:"Intercostal nerves T1–T11",root:"T1–T11",origin:"Rib below (external) + rib above (internal)",insertion:"Rib above (external) + rib below (internal)",
     patient:"Observe chest expansion — measure at axilla with tape",therapist:"Assess symmetry of chest expansion (normal: 3–5cm)",resistance:"N/A",gravElim:"N/A",palpation:"Between ribs — palpate movement during breathing",
     compensation:"Accessory muscles",substitution:"N/A",
     functional:"<2.5cm chest expansion = restrictive (ankylosing spondylitis). Assess with tape measure at T4",chain:"Intercostal restriction → reduced vital capacity → O2 desaturation on exertion"},
  ],
};

const MMT_GRADE_OPTIONS=["5","4+","4","4-","3+","3","3-","2+","2","2-","1","0","NT"];
const MMT_REGIONS=Object.keys(MMT_DATA);
const MMT_ICONS={
  "Cervical":["🔵","#0891b2"],"Shoulder & Scapula":["💪","#9333ea"],
  "Elbow & Forearm":["🫀","#db2777"],"Wrist & Hand":["🤚","#16a34a"],
  "Spine & Core":["🪴","#78716c"],"Hip & Pelvis":["🦵","#16a34a"],
  "Knee":["🦿","#ca8a04"],"Ankle & Foot":["🦶","#0284c7"],"TMJ & Facial":["🦷","#9f1239"]
};
function parseMuscleName(name){
  const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if(!match) return { title:name, sub:null };
  const sub = match[2].split(/[\/+]/).map(s=>s.trim()).filter(Boolean).join(" \u00b7 ");
  return { title:match[1].trim(), sub };
}

const RED_FLAGS_MMT=[
  {pattern:(r)=>Object.values(r).some(v=>v&&["1","0"].includes(v.split("_")[0])),msg:"Grade 0–1 detected — consider neurological workup and urgent referral if acute onset.",color:"#ff4d6d"},
  {pattern:(r)=>["mmt_gmed_L","mmt_gmed_R"].every(k=>r[k]&&parseInt(r[k])<3),msg:"Bilateral Gmed ≤ 2 — significant fall risk. Neurological vs myopathic cause?",color:"#ff4d6d"},
  {pattern:(r)=>["mmt_dnf_L","mmt_dnf_R","mmt_scm_L","mmt_scm_R"].some(k=>r[k]&&parseInt(r[k])===0),msg:"Cervical muscle grade 0 — possible high cervical cord lesion. URGENT.",color:"#ff4d6d"},
];

const KINETIC_CHAINS=[
  {muscles:["mmt_dnf","mmt_ta","mmt_gmax","mmt_gmed"],label:"Posterior Oblique Sling",interpretation:"Weakness pattern: forward head + anterior pelvic tilt + Trendelenburg gait."},
  {muscles:["mmt_serrant","mmt_trap_l","mmt_gmed","mmt_tp"],label:"Upper + Lower Cross Stabilisers",interpretation:"Weakness: scapular winging + medial arch collapse. Classic UCS+LCS pattern."},
  {muscles:["mmt_quad","mmt_ta","mmt_gmax"],label:"Anterior-Posterior Force Couple",interpretation:"Weakness: knee hyperextension + anterior pelvic tilt + lumbar hyperlordosis."},
  {muscles:["mmt_peronls","mmt_tp","mmt_abdhal"],label:"Ankle Stability Complex",interpretation:"Weakness: recurrent lateral sprain + progressive flatfoot + plantar fasciitis."},
];

const DERMATOMES = [
  { id:"n_c3",  level:"C3",  region:"Posterior neck / occipital",         reflex:null,    myotome:"Neck lateral flexion",         disc:"C2/3" },
  { id:"n_c4",  level:"C4",  region:"Cape (shoulder top)",                reflex:null,    myotome:"Shoulder elevation (trap)",    disc:"C3/4" },
  { id:"n_c5",  level:"C5",  region:"Lateral arm / deltoid badge",        reflex:"Biceps (C5–C6)", myotome:"Shoulder abduction / elbow flex", disc:"C4/5" },
  { id:"n_c6",  level:"C6",  region:"Lateral forearm / thumb + index",    reflex:"Brachioradialis", myotome:"Wrist extension (ECRL/ECRB)",   disc:"C5/6" },
  { id:"n_c7",  level:"C7",  region:"Middle finger",                       reflex:"Triceps (C6–C7)", myotome:"Elbow extension / wrist flex",  disc:"C6/7" },
  { id:"n_c8",  level:"C8",  region:"Little + ring finger / medial FA",   reflex:null,    myotome:"Finger flexion / intrinsics",  disc:"C7/T1" },
  { id:"n_t1",  level:"T1",  region:"Medial forearm / elbow",             reflex:null,    myotome:"Finger abduction (1st dorsal)", disc:"T1/2" },
  { id:"n_l1",  level:"L1",  region:"Groin / upper anterior thigh",       reflex:null,    myotome:"Hip flexion",                  disc:"L1/2" },
  { id:"n_l2",  level:"L2",  region:"Anterior + medial thigh",            reflex:null,    myotome:"Hip flexion / knee ext (assist)", disc:"L2/3" },
  { id:"n_l3",  level:"L3",  region:"Medial knee / lower anterior thigh", reflex:"Patella (L3–L4)", myotome:"Knee extension (quad)",      disc:"L3/4" },
  { id:"n_l4",  level:"L4",  region:"Medial leg / medial foot",           reflex:"Patella (L3–L4)", myotome:"Ankle dorsiflexion (TA)",    disc:"L4/5" },
  { id:"n_l5",  level:"L5",  region:"Dorsum foot / 1st–2nd web space",    reflex:null,    myotome:"Great toe extension (EHL)",    disc:"L4/5" },
  { id:"n_s1",  level:"S1",  region:"Lateral foot / heel / sole",         reflex:"Achilles (S1)", myotome:"Ankle plantarflexion (gastroc)", disc:"L5/S1" },
  { id:"n_s2",  level:"S2",  region:"Posterior thigh",                    reflex:null,    myotome:"Knee flexion (hamstrings)",    disc:"S1/2" },
  { id:"n_s3",  level:"S3",  region:"Medial thigh / perineum",            reflex:null,    myotome:"Bowel/bladder sphincter",      disc:"—" },
  { id:"n_s4s5",level:"S4/5",region:"Perianal / saddle",                  reflex:"Anal wink", myotome:"Sphincter tone",           disc:"Cauda equina" },
];

const MYOTOMES = [
  { level:"C1–C2", action:"Neck flexion",              test:"Active neck curl against gravity", compensation:"SCM dominant — look for chin poke" },
  { level:"C3",    action:"Neck lateral flexion",       test:"Side flex against resistance",     compensation:"Shoulder elevation (trap)" },
  { level:"C4",    action:"Shoulder elevation",         test:"Shrug against resistance",         compensation:"Neck side flex" },
  { level:"C5",    action:"Shoulder abduction / deltoid", test:"Arm abduction 0–90° resist",   compensation:"Trunk lean, shoulder hike" },
  { level:"C6",    action:"Wrist extension",            test:"Make fist, extend wrist resist",  compensation:"Supinator, BR activation" },
  { level:"C7",    action:"Elbow extension / wrist flex", test:"Triceps push, wrist curl",      compensation:"Shoulder ER, elbow flex" },
  { level:"C8",    action:"Finger flexion (grip)",      test:"Grip dynamometer or resist 3rd–5th DIP flex", compensation:"Wrist flexor dominant" },
  { level:"T1",    action:"Finger abduction",           test:"Spread fingers resist adduction", compensation:"Flexor override" },
  { level:"L1–L2", action:"Hip flexion",                test:"Hip flex seated 0–90° resist",    compensation:"QL, trunk lean back" },
  { level:"L3",    action:"Knee extension",             test:"Extend knee from 90° against resist", compensation:"Hip flexor assist" },
  { level:"L4",    action:"Ankle dorsiflexion (TA)",    test:"Walk on heels / resist DF",       compensation:"EHL dominant" },
  { level:"L5",    action:"Great toe extension (EHL)",  test:"Lift big toe resist",             compensation:"EDB firing, ankle inversion" },
  { level:"S1",    action:"Ankle plantarflexion",       test:"25 single-leg calf raises",       compensation:"Peroneals, flexor hallucis" },
  { level:"S2",    action:"Knee flexion (hamstring)",   test:"Prone knee flex 90° resist",      compensation:"Gastrocnemius, gluteus max" },
];

const REFLEXES = [
  // ── Deep Tendon Reflexes (LMN indicators) ────────────────────────────────
  { id:"n_ref_jaw",     label:"Jaw Jerk",               level:"V (trigeminal)",  group:"DTR", technique:"Patient relaxed, mouth slightly open. Place finger on chin, tap with reflex hammer. Normal = minimal jaw closure. Brisk = pathological.", finding:"Brisk/exaggerated = UMN lesion ABOVE the pons (supranuclear). Normal or absent = brainstem/LMN. Urgency: CNS referral if brisk.", pathological:true, umnSign:true },
  { id:"n_ref_bicep",   label:"Biceps",                  level:"C5–C6",           group:"DTR", technique:"Elbow flexed to ~90°. Place thumb firmly on biceps tendon in antecubital fossa. Tap thumb with reflex hammer. Observe/feel for elbow flexion.", finding:"Diminished or absent = C5/C6 LMN (radiculopathy, peripheral nerve). Brisk/hyperactive = UMN (myelopathy, cord compression above C5). Asymmetry always significant.", pathological:false, umnSign:false },
  { id:"n_ref_brad",    label:"Brachioradialis",         level:"C5–C6",           group:"DTR", technique:"Forearm in neutral (semi-pronated), resting on thigh. Tap brachioradialis tendon 2–3cm proximal to radial styloid. Normal = forearm flexion + slight supination.", finding:"Absent = C5/6 radiculopathy. INVERTED reflex: BR absent + finger flexors contract = pathognomonic of cervical myelopathy at C5/6 — URGENT.", pathological:false, umnSign:false },
  { id:"n_ref_tricep",  label:"Triceps",                 level:"C6–C7",           group:"DTR", technique:"Support arm at 90° abduction or drape over forearm. Tap triceps tendon directly above olecranon. Observe elbow extension.", finding:"Diminished or absent = C7 radiculopathy (most common cause). Absent bilaterally = peripheral polyneuropathy or motor neuron disease. Brisk = UMN above C7.", pathological:false, umnSign:false },
  { id:"n_ref_patella", label:"Patella (Quadriceps)",    level:"L3–L4",           group:"DTR", technique:"Patient seated with legs hanging freely (or supine with knee supported at 20–30°). Tap patellar tendon briskly. Observe quadriceps contraction / knee extension.", finding:"Diminished = L3/4 disc herniation (most common). Absent = severe radiculopathy or femoral neuropathy. Brisk + Babinski = cord/UMN.", pathological:false, umnSign:false },
  { id:"n_ref_achilles",label:"Achilles (Plantar Flex)", level:"S1",              group:"DTR", technique:"Knee flexed, hip ER (patient kneeling or prone). Gently dorsiflex foot to tension tendon. Tap Achilles tendon. Observe plantarflexion jerk.", finding:"Diminished or absent = S1 radiculopathy (L5/S1 disc) OR peripheral neuropathy (diabetes, alcohol). Most sensitive indicator of S1 root. Absent bilaterally = peripheral polyneuropathy.", pathological:false, umnSign:false },
  { id:"n_ref_cremast", label:"Cremaster Reflex",        level:"L1–L2",           group:"DTR", technique:"Lightly stroke the superior medial thigh. Normal = ipsilateral testicular elevation (cremasteric muscle contraction).", finding:"Absent = L1/2 radiculopathy, femoral neuropathy, or cauda equina. Absent bilaterally with lower limb signs = UMN lesion or cauda equina syndrome — urgent.", pathological:false, umnSign:false },
  { id:"n_ref_plantar", label:"Plantar Reflex (Normal)", level:"S1–S2",           group:"DTR", technique:"Stroke lateral plantar surface heel-to-ball with blunt object (Babinski hammer or key). Normal adult response = toe plantarflexion (downgoing).", finding:"Normal adult = plantarflexion of toes (NEGATIVE/normal response). Upgoing = Babinski sign (see below — UMN). Absent response = possible LMN or dense sensory loss.", pathological:false, umnSign:false },

  // ── UMN Pathological Signs ────────────────────────────────────────────────
  { id:"n_ref_babinski",label:"Babinski Sign",           level:"UMN — Corticospinal Tract", group:"UMN", technique:"Patient supine and relaxed. Use blunt object (Babinski hammer handle, key). Stroke firmly from lateral heel along plantar surface curving medially to the ball of the foot. Observe great toe and other toes. POSITIVE = great toe extends (dorsiflexes) upward ± fanning of toes (Babinski response). NEGATIVE (normal adult) = toes plantarflex (curl down).", finding:"POSITIVE (ABNORMAL in adults): Extension of hallux ± toe fanning = corticospinal tract (UMN) lesion anywhere from motor cortex to S1 cord level. Causes: stroke, cord compression, myelopathy, MS, TBI, ALS. NEGATIVE: Normal in adults. Note: Normal in infants <12 months (tract unmyelinated).", pathological:true, umnSign:true },
  { id:"n_ref_chaddock",label:"Chaddock Sign",           level:"UMN — Alternative Babinski", group:"UMN", technique:"Stroke the lateral dorsum of the foot from the lateral malleolus toward the little toe. Alternative Babinski variant — useful when plantar skin is very calloused.", finding:"POSITIVE = upgoing great toe = same significance as Babinski. Use as confirmatory test when Babinski equivocal. Positive = UMN lesion.", pathological:true, umnSign:true },
  { id:"n_ref_oppenheim",label:"Oppenheim Sign",         level:"UMN — Babinski variant",    group:"UMN", technique:"Apply firm pressure with knuckles or thumb down the tibial crest (anterior shin), sliding distally from below the knee to the ankle.", finding:"POSITIVE = hallux extension (upgoing toe) = UMN lesion. Same clinical significance as Babinski. Use when Babinski is equivocal or patient refuses plantar stimulation.", pathological:true, umnSign:true },
  { id:"n_ref_hoffmann",label:"Hoffmann's Sign",         level:"UMN — Cervical Cord",       group:"UMN", technique:"Hold patient's middle finger loosely with forearm slightly pronated. Flick the distal phalanx DOWNWARD (releasing suddenly). Observe thumb and index finger. POSITIVE = thumb FLEXES and adducts involuntarily.", finding:"POSITIVE = upper motor neuron sign indicating corticospinal tract lesion at or above C8/T1. Suggests cervical myelopathy or cord compression. Always combined with clinical context — can be normal in hyperreflexic individuals. Bilateral positive = more significant. REFER for MRI cervical spine.", pathological:true, umnSign:true },
  { id:"n_ref_trommer", label:"Trömner's Sign",          level:"UMN — Cervical Cord",       group:"UMN", technique:"Hold middle finger from above. Flick the PALMAR surface of the middle finger's distal phalanx UPWARD (reverse of Hoffmann's). Observe thumb flexion.", finding:"POSITIVE = thumb and other finger flexion = UMN sign. Equivalent significance to Hoffmann's. Some clinicians find it more reliable. Bilateral positive = myelopathy suspected.", pathological:true, umnSign:true },

  // ── Clonus Tests ──────────────────────────────────────────────────────────
  { id:"n_ref_clonus_ankle", label:"Ankle Clonus",       level:"UMN — S1/S2 Cord",         group:"Clonus", technique:"Support knee in slight flexion. Cup the foot and apply sudden, sustained DORSIFLEXION pressure, maintaining force. Count rhythmic beats of plantarflexion–dorsiflexion oscillation. Time how long it sustains. POSITIVE = 3 or more sustained beats.", finding:"POSITIVE (>3 beats sustained) = UMN lesion. Mechanism: gamma motor neuron hyperactivity with loss of descending inhibition. Causes: cord compression, cervical/thoracic myelopathy, stroke, MS, cerebral palsy. 1–2 beats = equivocal (can be normal in anxious patients). Sustained (>10 beats) = severe UMN involvement — URGENT MRI + neurosurgical referral.", pathological:true, umnSign:true },
  { id:"n_ref_clonus_knee",  label:"Patellar Clonus",    level:"UMN — L3/L4",               group:"Clonus", technique:"Patient supine with leg extended. Grasp patella between thumb and index finger. Apply sudden, sustained DOWNWARD (distal) thrust. Maintain downward pressure and observe for rhythmic patellar oscillation.", finding:"POSITIVE = repeated patellofemoral oscillations = UMN lesion at or above L3/4. Less commonly used than ankle clonus but clinically significant. Indicates spasticity and loss of descending inhibition.", pathological:true, umnSign:true },
  { id:"n_ref_clonus_wrist", label:"Wrist Clonus",       level:"UMN — Cervical Cord",       group:"Clonus", technique:"Support forearm. Apply sudden sustained EXTENSION force to the wrist. Observe for rhythmic flexion–extension oscillation.", finding:"POSITIVE = wrist clonus = UMN sign suggesting cervical cord involvement. Combined with Hoffmann's and Babinski = very strong myelopathy pattern — urgent MRI cervical spine.", pathological:true, umnSign:true },

  // ── LMN Signs & Pattern Tests ─────────────────────────────────────────────
  { id:"n_ref_lmn_fascic",  label:"Fasciculations",      level:"LMN — Anterior Horn",       group:"LMN", technique:"Inspect muscle belly at rest for spontaneous, irregular, brief twitching. Use tangential lighting. May observe in tongue, limbs, trunk. Cannot be voluntarily controlled.", finding:"POSITIVE = visible fasciculations = lower motor neuron / anterior horn cell pathology. DDx: ALS/MND (urgent), benign fasciculation syndrome (common), electrolyte imbalance, medication. Combined with weakness and wasting = motor neuron disease pattern. REFER neurology.", pathological:true, umnSign:false },
  { id:"n_ref_lmn_wasting", label:"Muscle Wasting / Atrophy", level:"LMN — Denervation",   group:"LMN", technique:"Inspect and measure limb circumference bilaterally at standardised points (10cm above/below medial knee joint line; 15cm below acromion). >1cm asymmetry = significant.", finding:"POSITIVE = visible/measurable wasting = denervation (LMN) pattern. Causes: nerve root compression with chronic axonal loss, peripheral nerve injury, motor neuron disease. Combined with weakness in myotomal pattern = radiculopathy with axonal involvement. Note: atrophy also occurs with disuse — differentiate with EMG.", pathological:true, umnSign:false },
  { id:"n_ref_lmn_tone",    label:"Muscle Tone Assessment", level:"UMN / LMN differentiation", group:"LMN", technique:"Assess tone passively. For UMN: passive limb movement — catch/release pattern (clasp-knife spasticity) or lead-pipe rigidity. For LMN: passive movement feels flaccid, no resistance. Assess arms (flex/extend elbow, rotate wrist) and legs (roll leg, flex knee quickly).", finding:"SPASTIC (UMN): velocity-dependent resistance, clasp-knife release, associated hyperreflexia. RIGID (extrapyramidal): lead-pipe or cogwheel, not velocity-dependent, associated with Parkinsonism. FLACCID (LMN): reduced resistance, associated hyporeflexia and wasting — nerve root, peripheral nerve, or anterior horn. NORMAL: smooth with consistent low resistance.", pathological:false, umnSign:false },
  { id:"n_ref_pronator",   label:"Pronator Drift",        level:"UMN — Corticospinal",       group:"LMN", technique:"Patient stands with eyes CLOSED, arms outstretched in supination (palms up), held for 10–20 seconds. Observe for downward drift, pronation, or finger flexion of one arm.", finding:"POSITIVE = downward drift with pronation of one arm = contralateral corticospinal (UMN) lesion. Very sensitive early sign. Also seen in: early stroke, space-occupying lesion, TBI. Arm that drifts = ipsilateral hemisphere lesion (contralateral arm affected). If both drift with eyes open = cerebellar / proprioceptive issue.", pathological:true, umnSign:true },
];

const NEURAL_TENSION = [
  {
    id:"nt_slr", label:"Straight Leg Raise (SLR)",
    nerve:"L4–S1 (sciatic / lumbosacral roots)", sensitivity:"91%", specificity:"26%",
    procedure:"Patient supine. Lift leg with knee EXTENDED. Note angle of symptom onset. At positive angle, sensitise by adding cervical flexion + ankle DF.",
    positive:"Radicular pain/paraesthesia in distribution below knee between 30–70°. Above 70° = hamstring tightness.",
    differentiation:"Add ankle DF: worse = neural. Add cervical flex: worse = neuromeningeal. Remove DF at max angle: improves = neural tension.",
    pattern:"L4/5 disc: reproduces leg/foot symptoms. High specificity if crossed SLR positive.",
  },
  {
    id:"nt_slump", label:"Slump Test",
    nerve:"Entire neuraxis (spinal cord + nerve roots)", sensitivity:"84%", specificity:"83%",
    procedure:"Seated. Step 1: Slump trunk (thoracic kyphosis). Step 2: Flex neck. Step 3: Extend knee. Step 4: Add ankle DF. Positive = symptoms reproduced. Release neck extension.",
    positive:"Reproduction of symptoms relieved by neck extension = neural tension positive. More sensitive than SLR.",
    differentiation:"If symptoms increase with neck flex but reduce with neck extension = neural. If no change = hamstring tightness.",
    pattern:"Central sensitisation shows bilateral symptoms. Disc herniation = unilateral leg symptoms.",
  },
  {
    id:"nt_ultt1", label:"ULTT1 — Median Nerve",
    nerve:"Median nerve / C5–C7", sensitivity:"72%", specificity:"33%",
    procedure:"Shoulder depress → abduct 90° → ER → extend elbow → supinate forearm → extend wrist/fingers. Add cervical lateral flex (contralateral).",
    positive:"Paraesthesia in median nerve distribution (thumb/index/middle). Symptom change with cervical sensitisation.",
    differentiation:"Change symptoms by adding/removing ipsilateral vs contralateral cervical side flex.",
    pattern:"C5/6/7 radiculopathy. Thoracic outlet syndrome. Carpal tunnel (distal reproduction).",
  },
  {
    id:"nt_ultt2", label:"ULTT2 — Radial Nerve",
    nerve:"Radial nerve / C6–C8", sensitivity:"72%", specificity:"33%",
    procedure:"Shoulder depress + ER → abduct 90° → IR → extend elbow → pronate forearm → flex wrist.",
    positive:"Symptoms in posterior forearm / radial nerve distribution.",
    differentiation:"Pronate vs supinate forearm — radial nerve = worse with pronation.",
    pattern:"Tennis elbow, de Quervain's with radial nerve component. C6/7 radiculopathy.",
  },
  {
    id:"nt_ultt3", label:"ULTT3 — Ulnar Nerve",
    nerve:"Ulnar nerve / C8–T1", sensitivity:"69%", specificity:"N/A",
    procedure:"Shoulder depress + abduct → flex elbow → pronate forearm → extend wrist + fingers.",
    positive:"Paraesthesia in ring/little finger distribution. Medial elbow symptoms.",
    differentiation:"Adds cubital tunnel assessment. Positive with elbow flexion as sensitiser.",
    pattern:"Cubital tunnel syndrome. C8/T1 radiculopathy. TOS (lower trunk).",
  },
  {
    id:"nt_femoral", label:"Femoral Nerve Tension Test (FNTT)",
    nerve:"Femoral nerve / L2–L4", sensitivity:"88%", specificity:"N/A",
    procedure:"Patient prone. Flex knee to 90°. Therapist extends hip. Add cervical extension to sensitise. Positive = anterior thigh pain / L2–L4 distribution.",
    positive:"Anterior thigh and groin pain reproduced with hip extension + knee flexion.",
    differentiation:"Differentiate from hip pathology: add cervical extension — neural involvement increases symptoms.",
    pattern:"L2/3/4 disc herniation. Upper lumbar radiculopathy. Femoral neuropathy.",
  },
];

const RED_FLAGS_NEURO = [
  { id:"nrf_cauda",     label:"Cauda Equina Syndrome",   severity:"EMERGENCY",   description:"Saddle anaesthesia (S3–S5), bilateral leg weakness, bowel/bladder incontinence or retention", action:"999 / Emergency Department NOW. MRI within 24h.", icon:"🆘" },
  { id:"nrf_myelopathy",label:"Cord Compression / Myelopathy", severity:"URGENT", description:"Positive Babinski, Hoffmann's, clonus, hyperreflexia + long tract signs, progressive spastic gait", action:"Urgent neurosurgical referral. No manipulation.", icon:"🔴" },
  { id:"nrf_prog_weak", label:"Progressive Neurological Weakness", severity:"URGENT", description:"Weakness deteriorating over days/weeks, widespread myotomal involvement, bilateral findings", action:"Urgent MRI + neurological referral within 48h.", icon:"🔴" },
  { id:"nrf_saddle",    label:"Saddle Anaesthesia",       severity:"EMERGENCY",   description:"Loss of sensation perineum, anus, inner thighs (S3–S5 distribution)", action:"Emergency Department immediately.", icon:"🆘" },
  { id:"nrf_umnsigns",  label:"Upper Motor Neuron Signs", severity:"URGENT",      description:"Babinski positive, hyperreflexia, spasticity, sustained clonus (>3 beats)", action:"Neurology referral. Cervical/thoracic MRI.", icon:"🔴" },
  { id:"nrf_bilateral", label:"Bilateral Neurological Signs", severity:"URGENT",  description:"Bilateral leg weakness, bilateral dermatomal loss, bilateral reflex changes", action:"Urgent referral — central disc, cord pathology.", icon:"🔴" },
  { id:"nrf_sphincter", label:"Sphincter Dysfunction",    severity:"EMERGENCY",   description:"New onset bowel/bladder dysfunction alongside back/leg pain", action:"Emergency admission.", icon:"🆘" },
  { id:"nrf_raised_icp", label:"Raised Intracranial Pressure", severity:"EMERGENCY", description:"Vomiting, falling consciousness level, unequal or non-reactive pupils, worsening headache post head injury", action:"Emergency Department / neurosurgical review NOW. Do not delay for further assessment.", icon:"🆘" },
  { id:"nrf_loc_change", label:"Evolving Consciousness Change", severity:"EMERGENCY", description:"Deteriorating GCS, new confusion, new focal weakness developing mid-session after head injury or stroke", action:"Stop assessment. Emergency Department NOW.", icon:"🆘" },
  { id:"nrf_autonomic_dysreflexia", label:"Autonomic Dysreflexia", severity:"EMERGENCY", description:"SCI at or above T6: sudden severe headache with BP rise (20-40mmHg above the patient baseline), bradycardia, flushing/sweating above the injury level, pallor or goosebumps below it -- usually triggered by a noxious stimulus below the injury level (full bladder, bowel impaction, pressure sore, tight clothing)", action:"Sit the patient upright immediately, loosen restrictive clothing, and check for and remove the triggering stimulus (empty bladder/catheter check first). Stop assessment if BP remains elevated -- emergency medical attention required.", icon:"🆘" },
];

const NERVE_ROOT_MAP = {
  "C5": { dermSensory:"Lateral arm", reflex:"Biceps", myotome:"Shoulder abduction, elbow flex", disc:"C4/5", peripheral:"Musculocutaneous / axillary" },
  "C6": { dermSensory:"Lateral forearm, thumb, index", reflex:"Brachioradialis", myotome:"Wrist extension (ECRL/ECRB)", disc:"C5/6", peripheral:"Median / radial" },
  "C7": { dermSensory:"Middle finger", reflex:"Triceps", myotome:"Elbow extension, wrist flex", disc:"C6/7", peripheral:"Radial / median" },
  "C8": { dermSensory:"Ring, little finger, medial forearm", reflex:"None standard", myotome:"Finger flexion, grip", disc:"C7/T1", peripheral:"Ulnar / median" },
  "T1": { dermSensory:"Medial forearm", reflex:"None", myotome:"Finger abduction", disc:"T1/2", peripheral:"Ulnar (intrinsics)" },
  "L2": { dermSensory:"Anterior/medial thigh", reflex:"None", myotome:"Hip flexion", disc:"L2/3", peripheral:"Femoral / obturator" },
  "L3": { dermSensory:"Medial knee, lower ant thigh", reflex:"Patella (with L4)", myotome:"Knee extension", disc:"L3/4", peripheral:"Femoral" },
  "L4": { dermSensory:"Medial leg and foot", reflex:"Patella", myotome:"Ankle dorsiflexion (TA)", disc:"L4/5", peripheral:"Deep peroneal" },
  "L5": { dermSensory:"Dorsum foot, 1st web space", reflex:"None reliable", myotome:"Great toe extension (EHL)", disc:"L4/5", peripheral:"Deep peroneal" },
  "S1": { dermSensory:"Lateral foot, heel", reflex:"Achilles", myotome:"Ankle plantarflexion", disc:"L5/S1", peripheral:"Sural / tibial" },
};

const CRANIAL_NERVES = [
  { id:"cn1", numeral:"I", name:"Olfactory", test:"Smell identification each nostril separately (coffee, mint, soap) with eyes closed, one nostril occluded", record:"Intact — smell identified bilaterally / Impaired — reduced or absent (anosmia)", note:"Often the first CN lost after frontal/basal skull TBI (shearing of olfactory filaments). Rarely tested acutely but worth screening before discharge." },
  { id:"cn2", numeral:"II", name:"Optic", test:"Visual acuity (Snellen or finger counting), visual fields by confrontation (4 quadrants each eye), fundoscopy if trained", record:"Intact / Impaired — note acuity and any field cut location and laterality", note:"Field cuts localize the lesion: homonymous hemianopia = optic tract/radiation or occipital lobe, well past the retina — post-chiasmal." },
  { id:"cn346", numeral:"III, IV, VI", name:"Oculomotor, trochlear, abducens", test:"Pupillary light reflex direct + consensual, extraocular movements through the full 6 cardinal directions (H-pattern), observe for ptosis, ask about diplopia at extremes", record:"Intact / Impaired — note which direction is limited and which eye, ptosis present Y/N, diplopia present Y/N", note:"CN III palsy with a dilated, unreactive pupil is a neurosurgical emergency — uncal herniation compressing CN III against the tentorium until proven otherwise." },
  { id:"cn5", numeral:"V", name:"Trigeminal", test:"Light touch to forehead, cheek, and jaw (3 divisions), jaw clench strength against resistance, corneal reflex (cotton wisp, watch for bilateral blink)", record:"Intact / Impaired — note which division(s) and side", note:"Absent corneal reflex with an otherwise normal exam can indicate a cerebellopontine angle lesion or brainstem involvement." },
  { id:"cn7", numeral:"VII", name:"Facial", test:"Compare face at rest for symmetry, then ask patient to raise eyebrows, screw eyes shut, smile, and puff out cheeks", record:"Intact / UMN pattern — forehead spared, lower face weak / LMN pattern — entire hemiface weak including forehead", note:"UMN vs LMN distinction is the single most useful bedside finding here: forehead-sparing weakness points to a cortical/subcortical lesion (stroke, TBI); full hemiface weakness including the forehead points to a peripheral facial nerve lesion (Bell's palsy) since the forehead gets bilateral cortical innervation." },
  { id:"cn8", numeral:"VIII", name:"Vestibulocochlear", test:"Gross hearing (finger rub or whisper each ear), Weber test (tuning fork midline forehead — lateralizes to the affected ear in conductive loss, away from it in sensorineural), Rinne test (air vs bone conduction)", record:"Intact / Conductive loss / Sensorineural loss — note side", note:"New sensorineural loss after head trauma suggests temporal bone fracture or labyrinthine concussion." },
  { id:"cn910", numeral:"IX, X", name:"Glossopharyngeal, vagus", test:"Observe palatal rise on 'ahh' (should be symmetric, uvula stays midline), gag reflex, voice quality (hoarse/nasal), formal swallow screen if any concern", record:"Intact / Impaired — note uvula deviation direction and any swallow concern", note:"Uvula deviates AWAY from the side of the lesion. Any swallow concern here should trigger a formal swallow assessment before oral intake — aspiration risk." },
  { id:"cn11", numeral:"XI", name:"Accessory", test:"Shoulder shrug against resistance (trapezius), head turn against resistance to each side (sternocleidomastoid)", record:"Intact / Weak — note side and which muscle", note:"Isolated CN XI palsy is uncommon in TBI but worth screening if there was any neck/skull base trauma." },
  { id:"cn12", numeral:"XII", name:"Hypoglossal", test:"Tongue protrusion in midline, look for deviation, atrophy, or fasciculations", record:"Intact / Deviates toward the weak side", note:"The tongue deviates TOWARD the side of a lower motor neuron lesion — the opposite convention from facial droop, which trips people up." },
];

const COORDINATION_TESTS = [
  { id:"coord_fingernose", label:"Finger-to-nose", how:"Patient alternates touching their own nose then the examiner's moving finger, at a comfortable pace, both arms", record:["Normal — smooth and accurate","Mild dysmetria — slight overshoot/undershoot","Marked dysmetria — significant past-pointing","Unable to perform"], note:"Tests cerebellar coordination of the upper limb. Dysmetria (past-pointing) suggests ipsilateral cerebellar pathology." },
  { id:"coord_heelshin", label:"Heel-to-shin", how:"Supine, patient slides the heel of one foot smoothly down the shin of the opposite leg from knee to ankle and back", record:["Normal — smooth trajectory","Mild ataxia — some wobble off the shin","Marked ataxia — heel repeatedly slides off","Unable to perform"], note:"Lower limb equivalent of finger-to-nose. Also affected by proprioceptive loss, not just cerebellar disease — check sensory exam alongside this." },
  { id:"coord_ram", label:"Rapid alternating movements", how:"Patient rapidly pronates and supinates the forearm against the opposite palm, or taps thumb to each finger in sequence, as fast as possible", record:["Normal — regular rhythm and speed","Mild dysdiadochokinesia — some irregularity","Marked dysdiadochokinesia — slow, irregular, or unable to alternate","Unable to perform"], note:"Dysdiadochokinesia (inability to perform rapid alternating movements smoothly) is a classic cerebellar sign, usually ipsilateral to the lesion." },
  { id:"coord_rebound", label:"Rebound test", how:"Patient holds both arms outstretched, examiner pushes down on one forearm then suddenly releases, watching how quickly the arm corrects", record:["Absent — arm returns smoothly to position","Present — arm overshoots or oscillates before settling"], note:"A positive rebound (overshoot) indicates loss of the normal cerebellar check reflex, seen ipsilateral to cerebellar lesions." },
];

const INVOLUNTARY_MOVEMENT_TYPES = ["None observed","Tremor — rest","Tremor — postural","Tremor — intention","Chorea","Dystonia","Myoclonus","Freezing of gait","Other (describe in notes)"];

const VESTIBULAR_TESTS = [
  { id:"vest_dixhallpike", label:"Dix-Hallpike", purpose:"BPPV screen (posterior/anterior canal)", how:"Seated, head turned 45° to the test side, then rapidly laid supine with head extended 20° over the table edge, hold 30-60s watching the eyes", record:["Negative — no nystagmus, no vertigo","Positive — right, torsional/upbeating nystagmus with latency, resolves within 60s","Positive — left, torsional/upbeating nystagmus with latency, resolves within 60s","Positive — atypical pattern, consider central cause"], note:"Latency, fatigability, and torsional/upbeating direction all point to peripheral BPPV. Immediate onset, non-fatigable, or purely vertical/direction-changing nystagmus should raise suspicion for a central cause instead." },
  { id:"vest_headthrust", label:"Head thrust (VOR)", purpose:"Vestibulo-ocular reflex integrity", how:"Patient fixates on examiner's nose, examiner delivers a small, fast, unpredictable head turn while watching the eyes for a corrective saccade", record:["Normal — eyes stay fixed on target, no corrective saccade","Abnormal — corrective saccade seen, indicates VOR deficit on that side"], note:"A normal head thrust in a vertiginous patient argues against a peripheral vestibular cause and should raise suspicion for a central (brainstem/cerebellar) cause instead." },
  { id:"vest_nystagmus", label:"Spontaneous / gaze-evoked nystagmus", purpose:"Central vs peripheral localization", how:"Observe eyes at rest, then have the patient follow a target to each side and up/down, holding at end-range briefly", record:["None observed","Present — direction, and whether it fatigues with fixation removed (peripheral pattern) or persists/changes direction (central pattern)"], note:"Direction-changing or purely vertical nystagmus that does not fatigue is a central red flag — do not attribute it to BPPV without further work-up." },
  { id:"vest_dva", label:"Dynamic Visual Acuity Test", purpose:"Functional VOR deficit", how:"Compare visual acuity (letter chart) with the head still versus with the head oscillating side to side at ~2Hz", record:["No change — normal VOR function","≥2 line drop with head movement — VOR deficit"], note:"A functional way to demonstrate a VOR deficit found on head thrust — useful for tracking recovery over sessions." },
];

const PERCEPTUAL_TESTS = [
  { id:"perc_neglect", label:"Neglect — line bisection / cancellation", how:"Line bisection: patient marks the midpoint of a horizontal line. Cancellation: patient crosses out target symbols scattered across a page.", record:["No neglect — midpoint accurate, all targets found","Mild neglect — slight deviation or a few omissions on one side","Marked neglect — significant deviation or many omissions, one side almost entirely missed"], note:"Note WHICH side is neglected — almost always contralateral to a right (non-dominant) hemisphere lesion, and often underestimated by the patient themselves (anosognosia)." },
  { id:"perc_apraxia", label:"Apraxia screen", how:"Ask the patient to pantomime a familiar action (wave goodbye, brush teeth, salute) on command, then have them imitate the examiner performing it", record:["Absent — performs both on command and imitation","Ideomotor — impaired on command, better with imitation","Ideational — impaired sequencing of a multi-step task even with objects in hand"], note:"Apraxia is a disorder of learned skilled movement despite intact strength and sensation — don't mistake it for simple weakness or poor comprehension." },
  { id:"perc_bodyscheme", label:"Body scheme / left-right discrimination", how:"Ask the patient to point to their own left hand vs right hand, then the examiner's left vs right hand", record:["Intact","Impaired — own body only","Impaired — own and examiner's body"], note:"Impaired left-right discrimination combined with finger agnosia and dyscalculia forms Gerstmann syndrome, localizing to the dominant parietal lobe." },
];


// ─── Collapsible How-To Panel ─────────────────────────────────────────────────
// ─── from SubjectiveObjective.jsx ───────────────────────────────────────────
const SPECIAL_TESTS_DATA = {

  cervical:{
    label:"Cervical Spine", color:"#00e5ff", icon:"🔵",
    tests:[
      { id:"st_spurling", label:"Spurling's Test", structure:"Cervical nerve root / foramen",
        sensitivity:"30–40%", specificity:"92–93%",
        positive:"Reproduces ipsilateral radicular arm pain / tingling",
        negative:"No arm symptoms",
        how:"Patient seated, head in neutral. Therapist places hands on crown. Apply DOWNWARD axial compression combined with ipsilateral side flexion and slight extension (quadrant position). Hold 10 seconds. Positive if arm symptoms reproduced.",
        options:["Negative","Positive — left (radiculopathy)","Positive — right (radiculopathy)","Bilateral positive"],
      },
      { id:"st_distraction", label:"Cervical Distraction Test", structure:"Cervical nerve root / disc",
        sensitivity:"40–44%", specificity:"90–100%",
        positive:"Arm symptoms reduce or resolve with traction",
        negative:"No change or worsening",
        how:"Patient supine. Therapist cradles occiput with both hands. Apply gentle UPWARD traction (distraction) — 10–15kg. Positive if radicular symptoms reduce or resolve (indicates neural compression relieved by opening foramen).",
        options:["Negative","Positive — symptom relief (nerve root compression)","Positive — relief only partial"],
      },
      { id:"st_sharp_purser", label:"Sharp-Purser Test", structure:"C1/C2 — atlantoaxial instability",
        sensitivity:"69%", specificity:"96%",
        positive:"URGENT — click or symptom change indicates instability",
        negative:"No movement or symptoms",
        how:"⚠️ PERFORM WITH CAUTION. Patient seated, head in flexion. Therapist places palm on forehead, thumb on C2 spinous process. Apply POSTERIOR translation of head on C2. Positive if clunk or reduction in symptoms. POSITIVE = refer immediately. Do NOT manipulate this patient.",
        options:["Negative","Positive — clunk present (C1/C2 instability — REFER URGENT)","Inconclusive"],
      },
      { id:"st_vbi", label:"VBI / 3-Part Test", structure:"Vertebral artery patency",
        sensitivity:"Variable", specificity:"Variable",
        positive:"5Ds/3Ns = STOP and refer",
        negative:"No symptoms in any position",
        how:"Patient seated. Test 3 positions held 30 seconds each: (1) Sustained rotation left, (2) Extension + rotation left, (3) Extension + rotation right. Watch for 5Ds: Dizziness, Diplopia, Dysarthria, Dysphagia, Drop attack. And 3Ns: Nausea, Nystagmus, Numbness of face. POSITIVE = stop all cervical treatment and refer.",
        options:["Negative — all 3 positions clear","Positive — 5D/3N present (REFER — no cervical manipulation)","Positive — dizziness only (monitor)","Inconclusive"],
      },
      { id:"st_alar", label:"Alar Ligament Test", structure:"Alar ligament / C1-C2 stability",
        sensitivity:"50%", specificity:"75%",
        positive:"C2 rotates with head rotation (ligament lax)",
        negative:"C2 fixed during head rotation",
        how:"Patient seated, head neutral. Therapist palpates C2 spinous process bilaterally. Ask patient to side-flex head. NORMAL: C2 should immediately move toward the side of side-flexion (tight alar ligament moves it). POSITIVE (LAXITY): C2 does not move, or head can side-flex extensively without C2 movement.",
        options:["Negative — normal C2 movement","Positive left — alar laxity (left)","Positive right — alar laxity (right)","Bilateral — bilateral alar laxity"],
      },
      { id:"st_flex_rot", label:"Flexion-Rotation Test (FRT)", structure:"C1-C2 rotation",
        sensitivity:"91%", specificity:"90%",
        positive:"< 32° rotation = C1/C2 restriction (cervicogenic headache)",
        negative:"> 40° each side — normal",
        how:"Patient supine. Therapist fully flexes cervical spine to end range (chin toward chest). With full flexion maintained (locks C2 down), SLOWLY rotate head fully to each side. Measure rotation with goniometer. Normal: 40–45° each side. Positive (< 32°) = C1/C2 hypomobility = cervicogenic headache source.",
        options:["Normal — bilateral > 40°","Positive left < 32° (C1/C2 restriction — left)","Positive right < 32° (C1/C2 restriction — right)","Bilateral restriction"],
      },
      { id:"st_jackson", label:"Jackson's Compression Test", structure:"Cervical facet / nerve root",
        sensitivity:"30%", specificity:"95%",
        positive:"Local or referred pain",
        negative:"No symptoms",
        how:"Patient seated, head in neutral. Therapist places clasped hands on crown. Apply DOWNWARD axial compression. Unlike Spurling's, no side-flexion added. Positive if local cervical pain (facet) or referred pain (nerve root) reproduced.",
        options:["Negative","Positive — local neck pain (facet)","Positive — radicular symptoms","Positive — both"],
      },
      { id:"st_cervical_rotation_lt", label:"Cervical Rotation Lateral Flexion (CRLF)", structure:"First rib elevation",
        sensitivity:"72%", specificity:"95%",
        positive:"Resistance during lateral flexion from rotation = first rib elevated",
        negative:"Free lateral flexion from rotation",
        how:"Patient seated. Passively ROTATE head fully to one side. Then, maintaining that rotation, attempt LATERAL FLEXION toward ipsilateral shoulder. Normal: neck laterally flexes freely. Positive: lateral flexion blocked = first rib elevated (thoracic outlet / scalene restriction).",
        options:["Negative bilateral","Positive left (L first rib elevated)","Positive right (R first rib elevated)"],
      },
      { id:"st_axial_loading", label:"Axial Loading Test", structure:"Cervical disc / facet",
        sensitivity:"Low", specificity:"Moderate",
        positive:"Pain reproduction with compression",
        negative:"No pain",
        how:"Patient seated. Therapist places hands on crown and applies DOWNWARD pressure with both hands (straight compression only — no rotation or side-flex). Positive if local cervical pain reproduced. Differentiates compressive vs non-compressive pain sources.",
        options:["Negative","Positive — local pain reproduced","Positive — radicular symptoms"],
      },
    ]
  },

  shoulder:{
    label:"Shoulder", color:"#7f5af0", icon:"🟣",
    tests:[
      { id:"st_neer", label:"Neer's Test", structure:"Supraspinatus / subacromial impingement",
        sensitivity:"72%", specificity:"66%",
        positive:"Anterior shoulder pain at end range",
        negative:"No pain",
        how:"Stabilise scapula with one hand (prevent elevation). With other hand, PASSIVELY FLEX the arm forward with shoulder INTERNALLY ROTATED (thumb down) to end range. Positive = anterior-superior shoulder pain reproduced. Simulates pinching of supraspinatus under anterior acromion.",
        options:["Negative","Positive — anterior shoulder pain (impingement)","Equivocal"],
      },
      { id:"st_hawkins", label:"Hawkins-Kennedy Test", structure:"Supraspinatus / subacromial",
        sensitivity:"79%", specificity:"59%",
        positive:"Subacromial pain with IR",
        negative:"No pain",
        how:"Flex shoulder to 90°, elbow 90°. Apply INTERNAL ROTATION (forearm toward floor). Positive = pain at anterior-superior shoulder (impinges supraspinatus under coracoacromial arch). Most sensitive impingement test.",
        options:["Negative","Positive — subacromial pain","Equivocal"],
      },
      { id:"st_empty_can", label:"Empty Can / Jobe Test", structure:"Supraspinatus integrity",
        sensitivity:"69%", specificity:"66%",
        positive:"Pain = tendinopathy. Weakness = tear",
        negative:"Strong and painless",
        how:"Arm abducted 90° in SCAPULAR PLANE (30° horizontal adduction). Fully INTERNALLY ROTATE (thumb pointing down — 'emptying a can'). Apply downward resistance. Positive = pain (tendinopathy) OR weakness (tear).",
        options:["Negative — strong and painless","Positive — painful (tendinopathy)","Positive — weak (partial/complete tear)","Positive — weak AND painful (serious lesion)"],
      },
      { id:"st_full_can", label:"Full Can Test", structure:"Supraspinatus — less impingement position",
        sensitivity:"66%", specificity:"64%",
        positive:"Pain or weakness in full can position",
        negative:"Strong and painless",
        how:"Same position as empty can BUT forearm EXTERNALLY ROTATED (thumb up — 'full can'). Apply downward resistance. Less likely to impinge bursa — more specific for supraspinatus muscle/tendon pathology. Compare to empty can.",
        options:["Negative","Positive — painful","Positive — weak","Both painful and weak"],
      },
      { id:"st_lift_off", label:"Lift-Off Test (Gerber)", structure:"Subscapularis integrity",
        sensitivity:"62%", specificity:"97%",
        positive:"Cannot lift hand off back",
        negative:"Strong lift-off maintained",
        how:"Patient places back of hand on lower back (posterior to iliac crest). Ask to LIFT hand away from back — resist at mid-range. Positive = cannot lift OR must substitute with elbow extension. Tests subscapularis — primary internal rotator.",
        options:["Negative — strong lift-off","Positive — cannot lift (subscapularis tear)","Positive — weakness (partial tear)"],
      },
      { id:"st_belly_press", label:"Belly Press Test", structure:"Subscapularis",
        sensitivity:"58%", specificity:"92%",
        positive:"Elbow drops or wrist flexes during press",
        negative:"Elbow maintained forward during press",
        how:"Patient places hand flat on abdomen (elbow forward of torso). Press hand INTO abdomen WITHOUT allowing wrist to flex. Positive = wrist flexes (cannot maintain IR — subscapularis deficit) or elbow drops behind torso.",
        options:["Negative — normal","Positive — wrist flexes (subscapularis deficit)","Positive — elbow drops"],
      },
      { id:"st_bear_hug", label:"Bear Hug Test", structure:"Subscapularis — upper fibres",
        sensitivity:"60%", specificity:"92%",
        positive:"Weakness during bear hug IR",
        negative:"Strong resistance",
        how:"Patient places palm of affected arm on OPPOSITE shoulder (fingers pointing toward neck). Therapist attempts to lift elbow upward/outward. Patient resists. Tests subscapularis in mid-range internal rotation position. Positive = cannot maintain resistance (subscapularis tear).",
        options:["Negative","Positive — weakness (upper subscapularis)"],
      },
      { id:"st_er_lag", label:"External Rotation Lag Sign", structure:"Infraspinatus / supraspinatus (massive tear)",
        sensitivity:"High for massive tears", specificity:"98%",
        positive:"Arm falls into IR (lag present)",
        negative:"Arm held in ER position",
        how:"Patient seated, elbow 90°. Therapist passively positions shoulder near maximum ER. Ask patient to HOLD that position as therapist releases. Positive = arm falls into internal rotation (lag) — indicates inability to actively maintain ER = posterior cuff tear.",
        options:["Negative — arm held in ER","Positive — small lag (< 10°)","Positive — significant lag (> 10°)","Positive — full lag (massive RC tear)"],
      },
      { id:"st_hornblower", label:"Hornblower's Sign", structure:"Teres minor",
        sensitivity:"100% for teres minor tear", specificity:"93%",
        positive:"Cannot externally rotate at 90° abduction",
        negative:"Normal ER at 90° abduction",
        how:"Patient abducts shoulder to 90°, elbow 90°. Ask to EXTERNALLY ROTATE against gravity (bring hand toward ceiling) from this position. Positive = cannot externally rotate at 90° abduction. Highly specific for teres minor tear.",
        options:["Negative","Positive — teres minor tear suspected"],
      },
      { id:"st_obrien", label:"O'Brien's Test (Active Compression)", structure:"SLAP lesion / AC joint",
        sensitivity:"63–100%", specificity:"73–99%",
        positive:"Pain in adduction = SLAP. Pain at top = AC joint",
        negative:"No pain in either position",
        how:"Shoulder 90° flexion, 10° horizontal adduction, FULL INTERNAL ROTATION (thumb down). Apply downward force. Note pain. Then REPEAT with shoulder in EXTERNAL ROTATION (thumb up). SLAP positive = pain with IR that reduces with ER (pain deep in shoulder). AC positive = pain at top of shoulder with IR that also reduces with ER.",
        options:["Negative","Positive — SLAP (deep pain with IR, resolves with ER)","Positive — AC joint (top of shoulder)","Both positive"],
      },
      { id:"st_speeds", label:"Speed's Test", structure:"Biceps long head / SLAP",
        sensitivity:"54%", specificity:"81%",
        positive:"Bicipital groove pain with resisted flexion",
        negative:"No pain",
        how:"Shoulder flexed ~60°, elbow EXTENDED, forearm SUPINATED. Apply downward resistance to distal forearm. Positive = pain at BICIPITAL GROOVE. Less specific test — combine with O'Brien's for SLAP confirmation.",
        options:["Negative","Positive — bicipital groove pain (biceps LH tendinopathy / SLAP)"],
      },
      { id:"st_yergason", label:"Yergason's Test", structure:"Biceps tendon stability in groove",
        sensitivity:"43%", specificity:"79%",
        positive:"Pain at bicipital groove with resisted supination",
        negative:"No pain",
        how:"Elbow 90° at side. Apply resistance as patient attempts SUPINATION + ELBOW FLEXION. Positive = pain at bicipital groove (biceps tendinopathy or biceps LH instability). Can also palp groove simultaneously.",
        options:["Negative","Positive — bicipital groove pain","Positive — tendon subluxes from groove"],
      },
      { id:"st_apprehension", label:"Apprehension Test", structure:"Anterior GH instability",
        sensitivity:"53%", specificity:"99%",
        positive:"Apprehension / fear of dislocation (NOT just pain)",
        negative:"No apprehension in this position",
        how:"Patient supine or seated. Abduct to 90°, externally rotate to near end range. Apply ANTERIOR PRESSURE on posterior humeral head. Positive = patient shows APPREHENSION (guarding, fear, tries to escape) — not just pain. Fear response is the key finding.",
        options:["Negative","Positive — apprehension present","Positive — pain only (not apprehension)","Positive — guarding + pain"],
      },
      { id:"st_relocation", label:"Relocation Test", structure:"Anterior GH instability confirmation",
        sensitivity:"57%", specificity:"87%",
        positive:"Apprehension relieves with posterior humeral pressure",
        negative:"No change in symptoms",
        how:"Performed AFTER apprehension test. While arm in same position (90° abd, ER), apply POSTERIOR pressure on anterior humeral head (relocating it). Positive = apprehension or pain RELIEVES. This confirms anterior instability.",
        options:["Negative","Positive — apprehension relieves (confirms anterior instability)"],
      },
      { id:"st_sulcus", label:"Sulcus Sign", structure:"Inferior GH instability / IGHL",
        sensitivity:"72%", specificity:"85%",
        positive:"Sulcus visible below acromion > 1cm",
        negative:"No visible sulcus",
        how:"Patient seated, arm relaxed at side. Apply DOWNWARD traction on arm (axial traction). Observe for SULCUS (groove) below acromion. Measure in cm. Grade 1: < 1cm. Grade 2: 1–2cm. Grade 3: > 2cm.",
        options:["Negative (< 0.5cm)","Grade 1 (< 1cm — mild laxity)","Grade 2 (1–2cm — moderate instability)","Grade 3 (> 2cm — severe inferior instability)"],
      },
      { id:"st_acromioclavicular", label:"AC Joint Paxinos Test", structure:"Acromioclavicular joint",
        sensitivity:"79%", specificity:"50%",
        positive:"AC joint pain with compression",
        negative:"No AC pain",
        how:"Thumb under acromion, fingers over clavicle. Apply SUPERIOR force with thumb while pressing DOWN with fingers (approximates AC joint). Positive = reproduces AC joint pain.",
        options:["Negative","Positive — AC joint pain (OA/injury)"],
      },
      { id:"st_cross_arm", label:"Cross-Arm Adduction Test", structure:"Acromioclavicular joint",
        sensitivity:"77%", specificity:"79%",
        positive:"AC joint pain with horizontal adduction",
        negative:"No AC pain",
        how:"Flex shoulder 90°. Adduct ACROSS body horizontally (horizontal adduction to end range). Positive = pain at TOP of shoulder (AC joint). Passive overpressure at end range increases sensitivity.",
        options:["Negative","Positive — AC joint pain"],
      },
      { id:"st_scapular_dyskinesis", label:"Scapular Dyskinesis Test", structure:"Scapular stabilisers",
        sensitivity:"80%", specificity:"65%",
        positive:"Visible winging or altered rhythm",
        negative:"Normal smooth scapular movement",
        how:"Observe scapulae during BILATERAL shoulder flexion and abduction (3 repetitions each). Also observe during arm lowering. Look for: (1) Medial border winging (serratus inhibited), (2) Inferior angle prominence (lower trap inhibited), (3) Early elevation (upper trap dominant), (4) Asymmetry left vs right. Use Kibler's classification: Type I (inferior angle), II (medial border), III (superior border).",
        options:["None — normal scapulohumeral rhythm","Type I — inferior angle prominence","Type II — medial border winging","Type III — superior border elevation / early shrug","Combined types"],
      },
      { id:"st_kibler_slide", label:"Lateral Scapular Slide Test", structure:"Scapular position symmetry",
        sensitivity:"76%", specificity:"78%",
        positive:"Side-to-side difference > 1.5cm",
        negative:"< 1cm difference bilateral",
        how:"Patient standing. Measure distance from inferior angle of scapula to nearest thoracic spinous process in: (1) Arms at side, (2) Hands on hips, (3) Arms at 90° abduction. Compare bilateral distances. > 1.5cm asymmetry = significant scapular asymmetry.",
        options:["Normal (< 1cm asymmetry)","Mild asymmetry (1–1.5cm)","Significant asymmetry (> 1.5cm)"],
      },
    ]
  },

  elbow_wrist:{
    label:"Elbow & Wrist", color:"#ff9a9e", icon:"🩷",
    tests:[
      { id:"st_cozens", label:"Cozen's Test", structure:"Lateral epicondyle — ECRB",
        sensitivity:"84%", specificity:"75%",
        positive:"Lateral epicondyle pain with resisted wrist ext",
        negative:"No pain",
        how:"Palpate lateral epicondyle. Patient makes a fist and EXTENDS wrist against resistance (therapist resists). Positive = sharp pain at lateral epicondyle. Most sensitive test for lateral epicondylalgia.",
        options:["Negative","Positive — lateral epicondyle pain (lateral epicondylalgia)"],
      },
      { id:"st_mills", label:"Mill's Test", structure:"Lateral epicondyle — ECRB (passive)",
        sensitivity:"53%", specificity:"85%",
        positive:"Lateral epicondyle pain with passive stretch",
        negative:"No pain",
        how:"Pronate forearm, flex wrist fully, then EXTEND elbow from this position (stretching ECRB). Positive = lateral epicondyle pain. Combines passive stretch with neural tension — if neurological = pain also in forearm.",
        options:["Negative","Positive — lateral epicondyle pain (ECRB)","Positive + forearm pain (neural component)"],
      },
      { id:"st_golfers", label:"Golfer's Elbow Test", structure:"Medial epicondyle — FCR/FCU",
        sensitivity:"75%", specificity:"78%",
        positive:"Medial epicondyle pain with resisted wrist flexion",
        negative:"No pain",
        how:"Palpate medial epicondyle. Resist WRIST FLEXION with forearm supinated. Positive = medial epicondyle pain (medial epicondylalgia / golfer's elbow). Provocative: add forearm supination simultaneously.",
        options:["Negative","Positive — medial epicondyle pain (medial epicondylalgia)"],
      },
      { id:"st_valgus_stress_elbow", label:"Elbow Valgus Stress Test", structure:"MCL (UCL) of elbow",
        sensitivity:"65%", specificity:"50%",
        positive:"Medial elbow pain with valgus stress",
        negative:"No pain or laxity",
        how:"Elbow 30° flexion. Apply VALGUS force (push forearm laterally while stabilising humerus). Feel for laxity or pain at medial elbow. Compare to contralateral side. 'Milking manoeuvre' variation: patient grabs thumb and applies valgus with flexing elbow — Positive = medial elbow pain.",
        options:["Negative","Positive — medial pain (MCL sprain)","Positive — laxity (MCL rupture)"],
      },
      { id:"st_tinel_elbow", label:"Tinel's Sign at Elbow", structure:"Ulnar nerve at cubital tunnel",
        sensitivity:"70%", specificity:"98%",
        positive:"Tingling in ring/little finger distribution",
        negative:"No distal symptoms",
        how:"Percuss (tap) ulnar nerve at CUBITAL TUNNEL (medial elbow, between medial epicondyle and olecranon). Positive = tingling in ulnar distribution (ring and little finger, medial forearm). Compare with carpal tunnel Tinel's — elbow Tinel = cubital tunnel syndrome.",
        options:["Negative","Positive — ulnar tingling (cubital tunnel syndrome)"],
      },
      { id:"st_phalen", label:"Phalen's Test", structure:"Median nerve — carpal tunnel",
        sensitivity:"68%", specificity:"73%",
        positive:"Thumb/index/middle finger tingling < 60 seconds",
        negative:"No symptoms in 60 seconds",
        how:"Patient holds both wrists in FULL FLEXION (dorsa of hands pressed together) for 60 seconds. Positive = tingling/numbness in MEDIAN nerve distribution (thumb, index, middle, and radial half of ring finger). Earlier onset = more severe carpal tunnel.",
        options:["Negative (> 60 seconds)","Positive < 30 seconds (severe CTS)","Positive 30–60 seconds (moderate CTS)","Bilateral positive"],
      },
      { id:"st_tinel_wrist", label:"Tinel's Sign at Wrist", structure:"Median nerve — carpal tunnel",
        sensitivity:"60%", specificity:"67%",
        positive:"Tingling in median distribution with percussion",
        negative:"No symptoms",
        how:"Percuss (tap) over CARPAL TUNNEL (volar wrist crease, palmaris longus tendon). Positive = tingling in thumb, index, middle, half ring finger (median distribution).",
        options:["Negative","Positive — carpal tunnel syndrome"],
      },
      { id:"st_finkelstein", label:"Finkelstein's Test", structure:"APL + EPB — De Quervain's",
        sensitivity:"High", specificity:"Moderate",
        positive:"Sharp pain at radial styloid/1st dorsal compartment",
        negative:"No pain",
        how:"Patient makes fist OVER thumb (Eichoff manoeuvre). Then therapist ulnar deviates wrist passively. Positive = sharp pain at RADIAL STYLOID / first dorsal compartment (De Quervain's tenosynovitis). Compare to contralateral side — all wrists may be slightly uncomfortable.",
        options:["Negative","Positive — radial styloid pain (De Quervain's tenosynovitis)"],
      },
      { id:"st_watson", label:"Watson Scaphoid Shift Test", structure:"Scapholunate ligament",
        sensitivity:"69%", specificity:"66%",
        positive:"Clunk or dorsal wrist pain with shift",
        negative:"No shift, no pain",
        how:"Grasp wrist with thumb on SCAPHOID TUBERCLE (volar wrist). Apply pressure on scaphoid while RADIALLY DEVIATING wrist (moving from ulnar to radial deviation). Positive = clunk or pain as scaphoid subluxes over dorsal rim of radius — indicates scapholunate ligament injury.",
        options:["Negative","Positive — clunk (SL instability)","Positive — dorsal wrist pain only"],
      },
      { id:"st_grind", label:"Grind Test", structure:"1st CMC joint (thumb base)",
        sensitivity:"High for CMC OA", specificity:"Moderate",
        positive:"Base of thumb pain and crepitus with grind",
        negative:"No pain",
        how:"Grasp patient's thumb metacarpal. Apply AXIAL COMPRESSION and ROTATION simultaneously (grinding). Positive = pain and/or crepitus at base of thumb (1st CMC joint OA).",
        options:["Negative","Positive — CMC OA (pain +/- crepitus)"],
      },
    ]
  },

  lumbar:{
    label:"Lumbar Spine", color:"#ff6b35", icon:"🟠",
    tests:[
      { id:"st_slr_test", label:"Straight Leg Raise (SLR)", structure:"L4–S1 nerve roots / disc",
        sensitivity:"80%", specificity:"40%",
        positive:"Radicular pain 30–70°. Bragard increases sensitivity",
        negative:"No radicular symptoms",
        how:"Patient SUPINE, knee extended. Passively RAISE leg. Note angle at first resistance. Add ANKLE DORSIFLEXION (Bragard's test) to sensitise. Positive = radicular leg pain (not back pain) at 30–70°. Crossed SLR (raising opposite leg produces ipsilateral symptoms) is highly specific for disc herniation (90% specificity).",
        options:["Negative","Positive 30–60° (highly specific for disc herniation)","Positive 60–90° (mild — less specific)","Positive + Bragard (neural tension confirmed)","Crossed SLR positive (disc herniation)"],
      },
      { id:"st_prone_instab", label:"Prone Instability Test", structure:"Lumbar segmental instability",
        sensitivity:"72%", specificity:"58%",
        positive:"Pain reduces when muscles activated",
        negative:"Pain unchanged with muscle activation",
        how:"Patient PRONE, feet on floor (hip extended). Apply POSTERIOR-ANTERIOR pressure on lumbar spinous processes. Note pain. Then ask patient to LIFT FEET (activating spinal stabilisers). Re-apply same PA pressure. POSITIVE = pain reduces or resolves with feet raised. Indicates segmental instability at that level.",
        options:["Negative — pain unchanged with muscle activation","Positive — pain reduces with muscle activation (segmental instability)"],
      },
      { id:"st_stork", label:"Stork Test (Single Leg Extension)", structure:"Spondylolysis / pars stress",
        sensitivity:"50%", specificity:"70%",
        positive:"Ipsilateral low back pain on extension loading",
        negative:"No pain",
        how:"Patient stands on ONE leg. EXTEND lumbar spine while balancing (Stork position). Positive = ipsilateral low back pain at the lumbar level. Young athletes with LBP — highly suspicious for SPONDYLOLYSIS (pars interarticularis stress fracture). Also test with hands on hips and extend.",
        options:["Negative","Positive — ipsilateral LBP (spondylolysis suspected)","Positive — bilateral LBP (bilateral pars)"],
      },
      { id:"st_kemp", label:"Kemp's Test (Lumbar Quadrant)", structure:"Lumbar facet joints",
        sensitivity:"Low", specificity:"High for facet",
        positive:"Local ipsilateral LBP with quadrant loading",
        negative:"No pain",
        how:"Patient seated or standing. EXTEND lumbar spine, then add IPSILATERAL ROTATION and SIDE FLEXION simultaneously (closing down ipsilateral facet joint). Positive = local ipsilateral low back pain (not radicular) = facet joint pathology. If radicular = disc or foramen contributing.",
        options:["Negative","Positive — local LBP (facet joint)","Positive — radicular symptoms (foramen/nerve)"],
      },
      { id:"st_adams", label:"Adam's Forward Bend Test", structure:"Scoliosis screen",
        sensitivity:"84%", specificity:"93%",
        positive:"Rib hump or paraspinal prominence visible",
        negative:"Symmetric forward bend",
        how:"Patient bends FORWARD 90°, arms hanging, feet together. Observe from BEHIND at eye level (spine horizontal). Look for ASYMMETRY: rib hump (thoracic rotation) or paraspinal prominence (lumbar). Measure with SCOLIOMETER if available (> 5° = referral threshold).",
        options:["Negative — symmetric","Positive — thoracic rib hump (structural scoliosis)","Positive — lumbar prominence (lumbar scoliosis)","Both levels — S-curve scoliosis"],
      },
      { id:"st_si_distraction", label:"SI Distraction Test", structure:"SIJ posterior ligaments",
        sensitivity:"60%", specificity:"81%",
        positive:"SI joint or buttock pain",
        negative:"No SI symptoms",
        how:"Patient SUPINE. Apply bilateral OUTWARD force on ASIS (distract pelvis). Hold 30 seconds. Positive = SI joint or buttock pain (posterior SI ligaments stressed by anteroposterior gapping).",
        options:["Negative","Positive — left SI pain","Positive — right SI pain","Bilateral positive"],
      },
      { id:"st_si_compression", label:"SI Compression Test", structure:"SIJ anterior ligaments",
        sensitivity:"69%", specificity:"69%",
        positive:"SI joint pain with compression",
        negative:"No SI symptoms",
        how:"Patient in SIDE LYING. Apply DOWNWARD COMPRESSION over iliac crest (compresses SI joint from above). Positive = SI joint pain. Combine with distraction and other SI tests — 3+ positive = 91% specific for SIJ.",
        options:["Negative","Positive — SI joint pain"],
      },
      { id:"st_gaenslen", label:"Gaenslen's Test", structure:"SIJ — extension loading",
        sensitivity:"53%", specificity:"71%",
        positive:"SI joint pain with hip extension stress",
        negative:"No SI pain",
        how:"Patient SUPINE at edge of table. Flex contralateral hip to chest (patient holds). Allow TEST leg to DROP into extension (hang off table edge). Positive = ipsilateral SI joint pain (extension stress on SIJ). Can also perform in sidelying.",
        options:["Negative","Positive — left SIJ","Positive — right SIJ"],
      },
      { id:"st_thigh_thrust", label:"Thigh Thrust Test", structure:"Posterior SIJ",
        sensitivity:"88%", specificity:"69%",
        positive:"Ipsilateral posterior pelvic pain",
        negative:"No SIJ symptoms",
        how:"Patient SUPINE. Hip flexed 90°. Therapist applies POSTERIOR force through FEMUR (along shaft toward table). Positive = posterior pelvic pain (SIJ shear stress). The highest sensitivity single SIJ test.",
        options:["Negative","Positive — posterior pelvic pain (SIJ)"],
      },
      { id:"st_lateral_shift", label:"Lateral Shift Correction Test", structure:"Lumbar disc — directional preference",
        sensitivity:"Moderate", specificity:"Moderate",
        positive:"Shift corrects or symptoms change",
        negative:"No change",
        how:"Patient standing with visible lateral shift. Therapist stands on CONVEX side of shift. Place shoulder against patient's thorax and pelvis on opposite side. Gradually CORRECT shift over multiple sessions. POSITIVE (useful test) = correction eases symptoms (confirms disc herniation protective pattern). McKenzie direction of preference established.",
        options:["Shift corrects easily — centralises symptoms","Shift corrects partially — some symptom change","Shift does not correct — consider structural cause","Shift worsens symptoms — STOP (wrong direction)"],
      },
    ]
  },

  hip:{
    label:"Hip", color:"#00c97a", icon:"🟢",
    tests:[
      { id:"st_faber_test", label:"FABER / Patrick's Test", structure:"SIJ / hip joint",
        sensitivity:"77%", specificity:"75%",
        positive:"Groin pain = hip. Posterior pelvic pain = SIJ",
        negative:"No pain, full range",
        how:"Patient SUPINE. Place ankle of test side on opposite KNEE (figure-4 position). Allow knee to FALL toward table under gravity. Positive = GROIN PAIN (hip joint/capsule) or POSTERIOR PELVIC PAIN (SIJ). Compare height of knee to contralateral side. Restriction = hip capsule or hip flexor tightness.",
        options:["Negative — knee drops symmetrically","Positive — groin pain (hip pathology)","Positive — posterior pelvic pain (SIJ)","Restricted range — hip capsular limitation"],
      },
      { id:"st_fadir_test", label:"FADIR Test", structure:"Hip impingement / labrum",
        sensitivity:"78%", specificity:"51%",
        positive:"Anterior groin pain (impingement / labral)",
        negative:"No symptoms",
        how:"Patient SUPINE. Bring hip to 90° FLEXION, then passively ADDUCT and INTERNALLY ROTATE (FADIR position). Positive = anterior GROIN PAIN (femoroacetabular impingement or labral tear). Most sensitive test for hip impingement — high sensitivity but moderate specificity.",
        options:["Negative","Positive — anterior groin pain (FAI / labral tear)","Positive — lateral hip pain (different pathology)"],
      },
      { id:"st_hip_scour", label:"Hip Scour Test", structure:"Hip joint — general pathology",
        sensitivity:"Moderate", specificity:"Moderate",
        positive:"Groin pain or catching with scour",
        negative:"No symptoms with circumduction",
        how:"Patient supine, hip and knee at 90°. Apply AXIAL COMPRESSION through femur toward acetabulum while CIRCUMDUCTING hip (circular motion). 'Scour' the joint. Positive = groin pain or catching sensation (OA, loose body, labral tear, cartilage pathology).",
        options:["Negative","Positive — groin pain (hip joint pathology)","Positive — catching/clicking (labral tear / loose body)"],
      },
      { id:"st_trendelenburg_test", label:"Trendelenburg Test", structure:"Gluteus medius",
        sensitivity:"72%", specificity:"77%",
        positive:"Contralateral pelvis drops on single-leg stance",
        negative:"Pelvis level for 30 seconds",
        how:"Patient stands on ONE leg for 30 seconds. Observe PELVIC LEVEL from behind. Normal = pelvis remains level or slight rise on swing side. Positive (Trendelenburg) = CONTRALATERAL pelvis DROPS > 2cm below horizontal. Indicates glute med weakness on STANDING leg. Compensatory Trendelenburg = patient leans trunk toward stance side to reduce moment arm.",
        options:["Negative — pelvis level","Positive — pelvic drop right","Positive — pelvic drop left","Compensatory lurch (trunk lean over stance leg)"],
      },
      { id:"st_thomas_test", label:"Thomas Test", structure:"Hip flexor length",
        sensitivity:"89%", specificity:"91%",
        positive:"Hip does not reach table = iliopsoas. Knee extends = rectus femoris",
        negative:"Hip reaches table, knee stays at 90°",
        how:"Patient SUPINE at table edge. Bring BOTH hips to chest (flatten lumbar). LOWER test leg. Observe: (1) THIGH ELEVATION = iliopsoas tight (hip cannot extend to neutral). (2) KNEE EXTENSION = rectus femoris tight (knee straightens as hip drops). (3) THIGH ABDUCTION = TFL tight.",
        options:["Negative — full hip extension, knee at 90°","Positive — iliopsoas (thigh elevated)","Positive — rectus femoris (knee extends)","Positive — TFL (thigh abducts)","Combined — both hip and knee compensation"],
      },
      { id:"st_ober_test", label:"Ober's Test", structure:"IT band / TFL",
        sensitivity:"75%", specificity:"80%",
        positive:"Leg cannot adduct below horizontal",
        negative:"Leg adducts past horizontal freely",
        how:"Patient SIDELYING, affected side UP. Stabilise pelvis. ABDUCT and EXTEND hip (align with body). Then slowly allow leg to ADDUCT (drop toward table) while maintaining extension. POSITIVE = leg cannot adduct below horizontal (< 10° adduction) = IT band/TFL restriction. Modified Ober: knee bent (isolates IT band over knee).",
        options:["Negative — leg adducts freely","Positive — leg stays elevated (IT band/TFL tight)"],
      },
      { id:"st_piriformis_test", label:"Piriformis Test (FAIR)", structure:"Piriformis muscle",
        sensitivity:"88%", specificity:"83%",
        positive:"Deep buttock pain reproduced",
        negative:"No buttock or sciatic pain",
        how:"Patient SIDELYING, affected side up. Hip FLEXED 60°, knee FLEXED 60°. Apply DOWNWARD FORCE on knee (adduction and internal rotation of hip) — FAIR position. Positive = DEEP BUTTOCK PAIN or sciatic symptoms. Test implicates piriformis compressing sciatic nerve.",
        options:["Negative","Positive — deep buttock pain (piriformis syndrome)","Positive — sciatic symptoms (sciatic nerve compression)"],
      },
      { id:"st_90_90", label:"90-90 Hamstring Test", structure:"Hamstring length + hip mobility",
        sensitivity:"High", specificity:"Moderate",
        positive:"Knee cannot extend to < 20° from full extension",
        negative:"Knee extends to within 20° of full extension",
        how:"Patient SUPINE. Bring hip to 90° FLEXION, knee at 90°. Ask to ACTIVELY EXTEND knee as far as possible. Measure the angle short of full extension. Normal: within 20° of full extension. Positive = > 20° from full extension = hamstring tightness. Also tests: is restriction from hip capsule (entire leg moves back) or hamstring (only knee extension limited)?",
        options:["Normal (< 20° from full extension)","Mild hamstring tightness (20–30°)","Moderate hamstring tightness (30–45°)","Severe hamstring tightness (> 45°)"],
      },
    ]
  },

  knee:{
    label:"Knee", color:"#ffb300", icon:"🟡",
    tests:[
      { id:"st_lachmans", label:"Lachman's Test", structure:"ACL integrity",
        sensitivity:"85%", specificity:"94%",
        positive:"Anterior tibial translation > 5mm or soft end-feel",
        negative:"Firm end-feel, < 5mm translation",
        how:"Patient SUPINE, knee at 20–30° flexion. Stabilise FEMUR with one hand (above knee). Grasp TIBIA just below joint line with other hand. Apply ANTERIOR translation force. Assess: amount of tibial movement AND quality of end-feel. Firm end-feel = ACL intact. Soft/empty end-feel = ACL rupture. Best ACL test.",
        options:["Negative — firm end-feel","Grade 1 (< 5mm — mild sprain)","Grade 2 (5–10mm — partial tear)","Grade 3 (> 10mm, soft end-feel — complete ACL rupture)"],
      },
      { id:"st_anterior_drawer", label:"Anterior Drawer Test", structure:"ACL",
        sensitivity:"62%", specificity:"88%",
        positive:"Anterior tibial translation > 5mm",
        negative:"Firm end-feel",
        how:"Patient SUPINE, knee at 90° flexion, foot flat on table. Sit on patient's foot (stabilise). Grasp tibia just below joint line with both hands. Apply ANTERIOR TRANSLATION. Less accurate than Lachman's in acute injury (hamstring guarding at 90° reduces translation). More useful in chronic ACL insufficiency.",
        options:["Negative","Positive — ACL insufficiency (compare to Lachman's)"],
      },
      { id:"st_posterior_drawer", label:"Posterior Drawer Test", structure:"PCL integrity",
        sensitivity:"90%", specificity:"99%",
        positive:"Posterior tibial sag / translation",
        negative:"No posterior sag",
        how:"Patient SUPINE, hip 45°, knee 90°. Observe tibia from side — POSTERIOR SAG indicates PCL rupture (gravity causes tibial drop). Apply POSTERIOR FORCE on tibia. Positive = posterior translation. ALWAYS check for posterior sag BEFORE doing anterior drawer (prevents misinterpreting sag as anterior laxity).",
        options:["Negative — no posterior sag","Positive — posterior sag present (PCL rupture)","Positive — posterior translation with force"],
      },
      { id:"st_pivot_shift", label:"Pivot Shift Test", structure:"ACL — rotational instability",
        sensitivity:"35–95%", specificity:"95–99%",
        positive:"Clunk or subluxation at 30° flexion",
        negative:"Smooth motion, no shift",
        how:"Patient SUPINE, hip 30° flexion. Apply VALGUS and INTERNAL ROTATION to foot while FLEXING knee from extension. At ~30° flexion, the iliotibial band crosses the axis of rotation — positive = CLUNK (tibia reduces from subluxed position). Best performed under anaesthesia. Grade 1 = glide, Grade 2 = clunk, Grade 3 = gross subluxation.",
        options:["Negative — smooth motion","Grade 1 — glide (mild)","Grade 2 — clunk (moderate)","Grade 3 — gross subluxation (severe ACL rupture)"],
      },
      { id:"st_valgus_stress_knee", label:"Valgus Stress Test", structure:"MCL integrity",
        sensitivity:"91%", specificity:"86%",
        positive:"Medial joint opening or pain",
        negative:"Firm end-feel, < 5mm opening",
        how:"Knee at 0° and at 30° flexion. Apply VALGUS force (push lateral side — open medial). Test at 0°: positive = MCL + posterior capsule/PCL. Test at 30° only: positive = MCL in isolation. Grade 1: pain only. Grade 2: 5–10mm opening. Grade 3: > 10mm opening.",
        options:["Negative","Grade 1 — pain only (MCL sprain)","Grade 2 — 5–10mm opening (partial tear)","Grade 3 — > 10mm opening (complete MCL rupture)"],
      },
      { id:"st_varus_stress_knee", label:"Varus Stress Test", structure:"LCL integrity",
        sensitivity:"25%", specificity:"96%",
        positive:"Lateral joint opening or pain",
        negative:"Firm end-feel",
        how:"Knee at 0° and 30°. Apply VARUS force (push medial side — open lateral). At 30° only: LCL isolated. At 0°: LCL + PCL and posterolateral corner. LCL injuries are less common than MCL.",
        options:["Negative","Positive — lateral pain (LCL sprain)","Positive — lateral opening (LCL tear)"],
      },
      { id:"st_mcmurray_test", label:"McMurray's Test", structure:"Meniscal integrity",
        sensitivity:"53%", specificity:"59%",
        positive:"Click or pain at joint line",
        negative:"No symptoms",
        how:"Patient SUPINE. Fully FLEX knee. For MEDIAL meniscus: apply VALGUS force + EXTERNAL ROTATION of tibia. For LATERAL meniscus: apply VARUS force + INTERNAL ROTATION. Slowly EXTEND knee from full flex. Positive = CLICK or PAIN at joint line during extension.",
        options:["Negative","Positive medial (valgus + ER click/pain — medial meniscus)","Positive lateral (varus + IR click/pain — lateral meniscus)","Bilateral positive"],
      },
      { id:"st_apley", label:"Apley's Grind Test", structure:"Meniscus — differentiate from ligament",
        sensitivity:"60%", specificity:"70%",
        positive:"Pain with compression (meniscus) vs distraction (ligament)",
        negative:"No pain with either",
        how:"Patient PRONE, knee 90°. STEP 1 — Distract: lift heel (distraction) + rotate. Pain = ligament. STEP 2 — Compress: push heel into table + rotate. Pain = MENISCUS. Differentiating compress vs distract response separates meniscal (compressive) from ligamentous (distractive) pathology.",
        options:["Negative both","Positive — compression (meniscal pathology)","Positive — distraction (ligamentous)","Both positive"],
      },
      { id:"st_thessaly", label:"Thessaly Test", structure:"Meniscus — weight-bearing",
        sensitivity:"69–89%", specificity:"97%",
        positive:"Medial or lateral joint pain/catching with rotation",
        negative:"No symptoms",
        how:"Patient stands on ONE leg, knee at 20° FLEXION (most sensitive angle). Rotate torso internally and externally 3 times while maintaining balance. Positive = MEDIAL or LATERAL joint line pain or clicking. Most accurate meniscal test — simulates physiological weight-bearing.",
        options:["Negative","Positive — medial joint line pain (medial meniscus)","Positive — lateral joint line pain (lateral meniscus)"],
      },
      { id:"st_clarkes", label:"Clarke's Sign", structure:"Patellofemoral joint",
        sensitivity:"39%", specificity:"67%",
        positive:"Anterior knee pain with patellar compression",
        negative:"No pain",
        how:"Patient SUPINE, knee extended. Therapist pushes PATELLA DISTALLY. Ask patient to TIGHTEN QUADRICEPS. Positive = anterior knee pain (chondromalacia patella or PFPS). Low sensitivity — false positives common. More useful combined with patellar grind and lateral tilt assessment.",
        options:["Negative","Positive — anterior knee pain (PFPS / chondromalacia)"],
      },
      { id:"st_patellar_grind", label:"Patellar Grind Test", structure:"Patellofemoral cartilage",
        sensitivity:"Moderate", specificity:"Moderate",
        positive:"Crepitus or pain with patellar compression",
        negative:"No crepitus or pain",
        how:"Patient SUPINE. Compress PATELLA into trochlea with thumb and index. Gently GRIND patella in small circles. Positive = crepitus (cartilage change) and/or pain. Also assess patellar mobility (medial/lateral glide) and tilt test (medial edge lift — tight lateral retinaculum if cannot lift).",
        options:["Negative","Positive — pain only (PFPS)","Positive — crepitus (chondromalacia)","Positive — both pain and crepitus"],
      },
      { id:"st_effusion", label:"Sweep / Ballottement Test", structure:"Knee effusion",
        sensitivity:"75%", specificity:"84%",
        positive:"Fluid wave present",
        negative:"No fluid wave",
        how:"SWEEP TEST: Patient supine, knee extended. Use palm to SWEEP fluid from medial gutter to suprapatellar pouch. Then sweep down lateral side — observe for FLUID WAVE on medial side. Positive = small effusion. BALLOTTEMENT: Apply downward patellar pressure — if patella bounces = moderate/large effusion.",
        options:["No effusion","Small effusion (sweep test positive)","Moderate effusion (ballottement positive)","Large effusion (visible swelling)"],
      },
      { id:"st_noble", label:"Noble Compression Test", structure:"IT band at lateral femoral epicondyle",
        sensitivity:"High for ITB syndrome", specificity:"Moderate",
        positive:"Sharp pain at 2cm above lateral joint line at 30° flex",
        negative:"No pain at this point",
        how:"Patient SUPINE. Apply firm pressure at LATERAL FEMORAL EPICONDYLE (2cm above lateral joint line = 'Noble's point'). Then flex and extend knee to 30°. Positive = SHARP PAIN at this precise point — IT band syndrome. Also: ask runner to replicate the activity that causes pain (may need treadmill).",
        options:["Negative","Positive — IT band syndrome (lateral epicondyle point tenderness at 30°)"],
      },
    ]
  },

  ankle_foot:{
    label:"Ankle & Foot", color:"#a8ff3e", icon:"🟢",
    tests:[
      { id:"st_ant_drawer_ankle", label:"Anterior Drawer Test — Ankle", structure:"ATFL integrity",
        sensitivity:"85%", specificity:"75%",
        positive:"Anterior talar translation > 10mm (> 3mm vs contralateral)",
        negative:"Firm end-feel, symmetric",
        how:"Patient seated, ankle at 20° PLANTARFLEXION (ATFL more vertical = more isolated). Stabilise TIBIA with one hand. With other hand, grasp CALCANEUS and apply ANTERIOR force (translate talus forward in mortise). Positive = > 10mm translation or soft end-feel. Compare bilaterally — > 3mm asymmetry = significant.",
        options:["Negative — firm end-feel","Positive — ATFL sprain (mild laxity)","Positive — ATFL rupture (> 10mm, soft end-feel)"],
      },
      { id:"st_talar_tilt", label:"Talar Tilt Test", structure:"CFL integrity",
        sensitivity:"50%", specificity:"74%",
        positive:"Excessive inversion tilt vs contralateral",
        negative:"Symmetric tilt, firm end-feel",
        how:"Ankle neutral (0°). Apply INVERSION STRESS (tilt calcaneus into inversion). CFL isolated at neutral. Positive = excessive inversion tilting > 15° or > 5° vs contralateral. Confirms CFL injury — usually combined with ATFL in Grade 3 lateral ankle sprain.",
        options:["Negative","Positive — CFL laxity (combined lateral ankle instability)"],
      },
      { id:"st_squeeze_ankle", label:"Squeeze / Mortise Test", structure:"Syndesmosis — high ankle sprain",
        sensitivity:"69%", specificity:"84%",
        positive:"Anterior ankle pain with proximal compression",
        negative:"No distal pain",
        how:"Squeeze fibula and tibia TOGETHER at mid-CALF level (well away from ankle). Positive = ANTERIOR ANKLE pain (at syndesmosis) reproduced by this proximal compression. Indicates syndesmotic (high ankle) sprain — much longer recovery than lateral sprain.",
        options:["Negative","Positive — syndesmotic (high ankle) sprain"],
      },
      { id:"st_thompson_test", label:"Thompson's Test", structure:"Achilles tendon rupture",
        sensitivity:"96%", specificity:"93%",
        positive:"No plantarflexion with calf squeeze",
        negative:"Foot plantarflexes with squeeze",
        how:"Patient PRONE, feet over table edge. SQUEEZE calf muscle belly (mid-calf). Normal = foot PLANTARFLEXES. POSITIVE = no plantarflexion = complete Achilles rupture. The Simmond's test. Patient may still be able to plantarflex actively (via other muscles) — do NOT rely on active PF.",
        options:["Negative — plantarflexion present (Achilles intact)","Positive — no plantarflexion (complete Achilles rupture)"],
      },
      { id:"st_windlass_test", label:"Windlass Test", structure:"Plantar fascia",
        sensitivity:"High for plantar fasciopathy", specificity:"Moderate",
        positive:"Plantar fascia pain with toe extension",
        negative:"No plantar pain",
        how:"Patient WEIGHT-BEARING (standing). Passively EXTEND GREAT TOE 60–70°. Positive = pain at MEDIAL CALCANEAL TUBERCLE or along plantar fascia. The windlass mechanism tightens the plantar fascia. More positive weight-bearing than non-weight-bearing.",
        options:["Negative","Positive — medial heel pain (plantar fasciitis)","Positive — mid-plantar pain (plantar fasciopathy)"],
      },
      { id:"st_navicular_drop", label:"Navicular Drop Test", structure:"Medial arch collapse / tibialis posterior",
        sensitivity:"High for arch collapse", specificity:"Moderate",
        positive:"Navicular drop > 10mm",
        negative:"< 6mm navicular drop",
        how:"Mark NAVICULAR TUBEROSITY with pen marker while patient seated (non-weight-bearing). Mark height from floor. Then patient STANDS (weight-bearing). Measure new navicular height. NAVICULAR DROP = difference between non-WB and WB heights. Normal: < 6mm. Mild: 6–10mm. Significant: > 10mm. > 10mm = tibialis posterior insufficiency / medial arch collapse.",
        options:["Normal (< 6mm drop)","Mild collapse (6–10mm)","Significant collapse (> 10mm — tib post insufficiency)"],
      },
      { id:"st_tinel_ankle", label:"Tinel's Sign — Ankle", structure:"Posterior tibial nerve (tarsal tunnel)",
        sensitivity:"58%", specificity:"86%",
        positive:"Tingling in plantar foot with percussion",
        negative:"No distal symptoms",
        how:"Percuss POSTERIOR TIBIAL NERVE behind MEDIAL MALLEOLUS (tarsal tunnel). Positive = tingling along plantar foot / toes (tibial nerve distribution). Tarsal tunnel syndrome — analogous to carpal tunnel at the ankle.",
        options:["Negative","Positive — plantar tingling (tarsal tunnel syndrome)"],
      },
      { id:"st_royal_london", label:"Royal London Hospital Test", structure:"Achilles tendinopathy",
        sensitivity:"High for mid-portion tendinopathy", specificity:"Moderate",
        positive:"Pain reduced at mid-tendon with ankle DF",
        negative:"Pain at mid-tendon in all positions",
        how:"Palpate MID-PORTION of Achilles tendon (2–6cm above insertion) — note tenderness. Then DORSIFLEX ankle (stretches and thins Achilles). Re-palpate. POSITIVE (test is positive for mid-portion tendinopathy) = tenderness REDUCES with dorsiflexion. Note: this is a CONFIRMING test — positive means mid-portion, not insertional.",
        options:["Positive (mid-portion tendinopathy confirmed — pain reduces with DF)","Negative (pain unchanged — may be insertional or other pathology)"],
      },
    ]
  },

  neural:{
    label:"Neurological Special Tests", color:"#d4a5ff", icon:"🟣",
    tests:[
      { id:"st_slump_test", label:"Slump Test", structure:"Neural tension — entire neuraxis",
        sensitivity:"84%", specificity:"83%",
        positive:"Reproduces symptoms — eases with neck extension",
        negative:"Symptoms don't change with neck extension",
        how:"Patient seated, legs over side. STEP 1: Slump trunk (thoracic + lumbar flexion). STEP 2: Flex NECK (chin to chest). STEP 3: Extend KNEE (straighten leg). STEP 4: DORSIFLEX ankle. STEP 5: EXTEND neck — observe symptom change. POSITIVE = symptoms reproduced AND improve when neck is extended (confirms neural, not muscular, cause).",
        options:["Negative — no symptom change with neck extension","Positive — left (symptoms reproduced + ease with neck ext)","Positive — right","Bilateral positive — central sensitisation suspected"],
      },
      { id:"st_ultt1", label:"ULTT1 — Median Nerve", structure:"Median nerve tension",
        sensitivity:"75%", specificity:"74%",
        positive:"Symptom reproduction in median distribution",
        negative:"No arm symptoms",
        how:"Patient supine. Sequence: (1) Scapular depression, (2) Shoulder abduction 110°, (3) Wrist + finger extension, (4) Forearm supination, (5) Elbow extension, (6) Cervical side flexion AWAY. Sensitise with shoulder IR. Positive = arm symptoms reproduced (median distribution — thumb/index/middle). Release tension to confirm (symptom change).",
        options:["Negative","Positive left — median nerve sensitised","Positive right — median nerve sensitised","Bilateral positive"],
      },
      { id:"st_ultt2", label:"ULTT2 — Radial Nerve", structure:"Radial nerve tension",
        sensitivity:"72%", specificity:"74%",
        positive:"Lateral forearm or dorsal hand symptoms",
        negative:"No radial distribution symptoms",
        how:"Patient supine. Sequence: (1) Scapular depression, (2) Shoulder abduction 40°, (3) Elbow extension, (4) Forearm pronation, (5) Wrist + finger flexion (radial nerve on tension), (6) Shoulder IR. Positive = symptoms in RADIAL distribution (lateral forearm, dorsum hand, thumb). Lateral epicondylalgia often has positive ULTT2.",
        options:["Negative","Positive left — radial nerve sensitised","Positive right — radial nerve sensitised"],
      },
      { id:"st_ultt3", label:"ULTT3 — Ulnar Nerve", structure:"Ulnar nerve tension",
        sensitivity:"75%", specificity:"74%",
        positive:"Ring/little finger and medial forearm symptoms",
        negative:"No ulnar distribution symptoms",
        how:"Patient supine. Sequence: (1) Scapular depression, (2) Shoulder abduction 90°, (3) Wrist + finger extension (ulnar side), (4) Forearm supination, (5) Elbow FLEXION (ulnar nerve stretched at cubital tunnel), (6) Cervical side flexion AWAY. Positive = ring/little finger tingling or medial forearm symptoms.",
        options:["Negative","Positive left — ulnar nerve sensitised","Positive right — ulnar nerve sensitised"],
      },
      { id:"st_femoral_nerve_stretch", label:"Femoral Nerve Stretch Test (FNST)", structure:"Femoral nerve — L2/L3/L4",
        sensitivity:"88%", specificity:"71%",
        positive:"Anterior thigh pain reproduced",
        negative:"No anterior thigh symptoms",
        how:"Patient PRONE. Therapist passively FLEXES KNEE (bring heel toward buttock). If positive = anterior thigh pain reproduced (femoral nerve tension). Extend hip further if needed (increase tension). Compare bilaterally. Tests L2/3/4 nerve roots via femoral nerve.",
        options:["Negative","Positive — anterior thigh pain (femoral nerve tension L2/3/4)"],
      },
      { id:"st_babinski", label:"Babinski Sign", structure:"Corticospinal tract — UMN lesion",
        sensitivity:"60%", specificity:"97%",
        positive:"Great toe extends, toes fan — URGENT REFER",
        negative:"Toes flex (normal plantar reflex)",
        how:"Stroke LATERAL plantar surface of foot with firm blunt instrument (thumbnail or reflex hammer handle). Move from heel toward toes. Normal: toes FLEX (plantar grasp reflex). POSITIVE (abnormal): great toe EXTENDS and other toes FAN OUT. Indicates UPPER MOTOR NEURON lesion — myelopathy, brain lesion, cord compression. URGENT referral.",
        options:["Negative — plantar flexion (normal)","Positive — great toe extension + fanning (UMN lesion — REFER URGENT)"],
      },
      { id:"st_hoffmanns", label:"Hoffmann's Sign", structure:"UMN lesion — cervical myelopathy",
        sensitivity:"Moderate", specificity:"High",
        positive:"Thumb flexes when middle finger flicked",
        negative:"No thumb movement",
        how:"Hold patient's middle finger loosely. Flick the DISTAL PHALANX downward (releasing suddenly). Observe thumb and index finger. POSITIVE = thumb FLEXES and adducts (involuntary) = upper motor neuron sign. Indicates cervical myelopathy or other corticospinal tract pathology. Combine with Babinski.",
        options:["Negative — no thumb movement","Positive — thumb flexes (UMN / myelopathy — REFER)"],
      },
      { id:"st_romberg", label:"Romberg Test", structure:"Posterior column / proprioception",
        sensitivity:"Moderate", specificity:"High",
        positive:"Falls or excessive sway with eyes closed",
        negative:"Minimal sway change with eye closure",
        how:"Patient stands feet together, eyes OPEN 30 seconds (assess baseline sway). Then CLOSE eyes 30 seconds. Normal: minimal increase in sway. POSITIVE: significant increase in sway or falls with eyes closed (proprioception / dorsal column deficit). Distinguish: if falls with eyes OPEN = cerebellar problem. Falls ONLY with eyes closed = peripheral proprioception or dorsal column.",
        options:["Negative — minimal sway change","Positive — increased sway eyes closed (proprioception deficit)","Positive — falls eyes open (cerebellar)"],
      },
    ]
  },

  balance_functional:{
    label:"Balance & Functional", color:"#90caf9", icon:"🔵",
    tests:[
      { id:"st_single_leg_stance", label:"Single Leg Stance Test", structure:"Proprioception + postural stability",
        sensitivity:"High for balance deficit", specificity:"High",
        positive:"< 10 seconds eyes open OR < 5 seconds eyes closed",
        negative:"30+ seconds eyes open, 10+ seconds eyes closed",
        how:"Patient stands on ONE leg, arms folded, hands on opposite shoulders (removes upper limb balance strategy). TIME eyes open to 30 seconds. Then TIME eyes closed to 10 seconds. Record seconds before loss of balance. Compare bilaterally. Norm: 30s eyes open, 10s eyes closed for working age adults (decreases with age).",
        options:["Normal (≥30s eyes open, ≥10s eyes closed)","Mild deficit (20–29s eyes open)","Moderate deficit (10–19s eyes open)","Severe deficit (< 10s eyes open)","Unable to perform"],
      },
      { id:"st_star_excursion", label:"Star Excursion Balance Test (SEBT)", structure:"Dynamic balance + proprioception",
        sensitivity:"High for chronic ankle instability", specificity:"High",
        positive:"Asymmetry > 4cm in any direction vs contralateral",
        negative:"< 4cm asymmetry in all directions",
        how:"Patient stands on one leg at centre of star. Reach free leg in 3 directions: ANTERIOR, POSTEROMEDIAL, POSTEROLATERAL. Measure distance (cm) from centre to reach point. Normalise to leg length. > 4cm asymmetry in posteromedial reach = high injury risk (ankle instability and ACL risk predictor).",
        options:["Normal — < 4cm asymmetry all directions","Anterior deficit (> 4cm)","Posteromedial deficit (> 4cm) — highest injury predictor","Posterolateral deficit (> 4cm)","Multiple direction deficits"],
      },
      { id:"st_functional_hop", label:"Single Leg Hop Tests (4-Test Battery)", structure:"Lower limb power, symmetry, confidence",
        sensitivity:"High for return to sport", specificity:"High",
        positive:"Limb Symmetry Index < 90% in any test",
        negative:"LSI ≥ 90% all tests",
        how:"Test 4 hops each leg: (1) SINGLE HOP for distance. (2) TRIPLE HOP for distance. (3) TRIPLE CROSSOVER HOP for distance. (4) 6-METRE TIMED HOP. Limb Symmetry Index (LSI) = (involved ÷ uninvolved) × 100. LSI < 90% = NOT ready for return to sport. ALL 4 tests must be ≥ 90%.",
        options:["Normal — LSI ≥ 90% all tests","Mild deficit — LSI 80–89%","Moderate deficit — LSI 70–79%","Severe deficit — LSI < 70% (not ready for sport)"],
      },
      { id:"st_berg_balance", label:"Berg Balance Scale", structure:"Functional balance — 14 tasks",
        sensitivity:"91%", specificity:"85% for fall risk",
        positive:"Score < 45/56 = fall risk",
        negative:"Score 50–56 = low fall risk",
        how:"14 balance tasks scored 0–4 each (max 56). Tasks include: sitting to standing, standing unsupported, sitting unsupported, standing to sitting, transfers, standing eyes closed, standing feet together, reaching forward, picking up object, turning 360°, stepping, tandem standing, one-leg standing. Score < 45 = significantly elevated fall risk.",
        options:["Normal 50–56 (low fall risk)","Mild 41–49 (increased fall risk)","Moderate 21–40 (high fall risk — requires aid)","Severe 0–20 (cannot balance independently)"],
      },
    ]
  },

};

// ─── SPECIAL TESTS COMPONENT ──────────────────────────────────────────────────

// Deep-link highlight animation
if (typeof document !== "undefined" && !document.getElementById("physio-hl-style")) {
  const _st = document.createElement("style");
  _st.id = "physio-hl-style";
  _st.textContent = "@keyframes physioHL { 0% { box-shadow:0 0 0 0 rgba(147,51,234,0.5);border-color:#9333ea } 50% { box-shadow:0 0 0 8px rgba(147,51,234,0.2);border-color:#c084fc } 100% { box-shadow:0 0 0 0 rgba(147,51,234,0);border-color:transparent } } .physio-highlight { animation:physioHL 1.8s ease-out 2; }";
  document.head.appendChild(_st);
}


// ─── Cloudinary Clinical Image System ─────────────────────────────────────────
const CYRIAX_REGIONS_DATA = {

  cervical: {
    label:"Cervical Spine", color:"#00e5ff", icon:"🔵",
    anatomy:"C1–C7 vertebrae. Inert structures: facet joint capsules, intervertebral discs, anterior/posterior longitudinal ligaments, alar/transverse ligaments (C1–C2), supraspinous/interspinous ligaments. Contractile: deep cervical flexors, sternocleidomastoid, scalenes, semispinalis, splenius, suboccipitals, trapezius.",
    capsularPattern:"All movements equally limited (side-flex > rotation > flex/ext). May be asymmetric in facet pathology.",
    activeROM:[
      { id:"cx_a_flex", label:"Flexion", normal:"80°", how:"Patient seated. Chin moves toward chest. Normal = chin-to-chest or ~80°. Note: pain on initiation vs end range. Painful arc (mid-range pain then eases) = disc." },
      { id:"cx_a_ext", label:"Extension", normal:"70°", how:"Look toward ceiling. Normal = 70°. Pain on extension = facet, posterior disc, foraminal stenosis." },
      { id:"cx_a_sfl", label:"Side Flex Left", normal:"45°", how:"Ear toward shoulder WITHOUT shoulder elevation. Normal = 45°. Limitation ipsilateral = disc, facet, scalene." },
      { id:"cx_a_sfr", label:"Side Flex Right", normal:"45°", how:"Ear toward right shoulder. Compare bilaterally. Asymmetry = unilateral lesion." },
      { id:"cx_a_rotl", label:"Rotation Left", normal:"80°", how:"Rotate chin toward left shoulder. Normal = 80°. Test specifically at full flex (FRT) to isolate C1/C2." },
      { id:"cx_a_rotr", label:"Rotation Right", normal:"80°", how:"Rotate chin toward right shoulder. If restricted only in rotation = upper cervical (C1/C2) pathology." },
    ],
    passiveROM:[
      { id:"cx_p_flex", label:"Passive Flexion", how:"Support head with both hands. Gently flex — feel for resistance and end-feel. Overpressure at end range. Compare active vs passive range.", endfeel_options:["Normal/Capsular","Muscle Spasm","Empty (No End-Feel)","Hard (Osteophyte)"] },
      { id:"cx_p_ext", label:"Passive Extension", how:"Support occiput, gently extend head on neck. Segmental PA pressure to feel stiff levels (C2–C7).", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Osteophyte)","Springy/Rebound"] },
      { id:"cx_p_rot", label:"Passive Rotation (bilateral)", how:"Support head. Rotate fully each side. Note: total range, side-to-side difference, quality. Add overpressure to differentiate stiffness from pain.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Osteophyte)","Empty (No End-Feel)"] },
      { id:"cx_p_sfl", label:"Passive Side Flex", how:"Side-flex head gently toward shoulder. Overpressure at end range. Feel: spring (normal) vs wall (joint block) vs spasm (acute).", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Osteophyte)","Springy/Rebound"] },
    ],
    resistedTests:[
      { id:"cx_r_flex", label:"Resisted Flexion", muscle:"SCM + deep neck flexors", how:"Patient seated. Place palm on forehead — patient flexes against resistance. No neck movement. Test bilaterally." },
      { id:"cx_r_ext", label:"Resisted Extension", muscle:"Semispinalis / splenius / suboccipitals", how:"Palm on occiput. Patient extends against resistance. No movement." },
      { id:"cx_r_sfl", label:"Resisted Side Flex L", muscle:"L scalenes / lateral flexors", how:"Palm on temporal region. Patient side-flexes left against resistance." },
      { id:"cx_r_sfr", label:"Resisted Side Flex R", muscle:"R scalenes / lateral flexors", how:"Palm on right temporal region. Patient side-flexes right." },
      { id:"cx_r_rotl", label:"Resisted Rotation L", muscle:"R SCM / L splenius", how:"Palm on left chin/jaw. Resist left rotation." },
      { id:"cx_r_rotr", label:"Resisted Rotation R", muscle:"L SCM / R splenius", how:"Palm on right chin/jaw. Resist right rotation." },
    ],
    jointPlay:[
      { id:"cx_jp_pa", label:"PA Central Pressure (C2–C7)", how:"Patient prone. Therapist thumbs on spinous process. Apply gentle PA (posterior-anterior) pressure. Note: stiffness, pain, level of restriction. Compare adjacent levels." },
      { id:"cx_jp_unilat", label:"Unilateral PA (C2–C7 facets)", how:"Thumbs on facet pillar (1–2cm lateral to spinous process). PA pressure to assess individual facet joint. Compare bilateral asymmetry at each level." },
      { id:"cx_jp_traction", label:"Manual Cervical Traction", how:"Supine. Cup occiput and chin. Apply gentle longitudinal traction. Positive if symptoms ease (indicates neural/disc compression)." },
    ],
    redFlags:["Bilateral arm symptoms", "Lower limb symptoms with cervical movement", "Drop attacks / dizziness (VBI)", "Severe sudden onset headache", "Progressive neurological deficit", "Bladder/bowel dysfunction"],
    differentials:["Cervical disc herniation", "Cervical facet syndrome", "Cervical spondylosis / OA", "Cervicogenic headache (C1/C2)", "Muscle strain", "Atlantoaxial instability (RA)", "Whiplash associated disorder", "Cervical radiculopathy"],
  },

  shoulder: {
    label:"Shoulder Complex", color:"#7f5af0", icon:"🟣",
    anatomy:"GH joint (capsule, labrum, IGHL, SGHL, MGHL), subacromial bursa, rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis), biceps long head tendon, AC joint, CC ligaments, acromial arch.",
    capsularPattern:"ER most limited > Abduction > IR. If all limited and proportional = adhesive capsulitis (frozen shoulder).",
    activeROM:[
      { id:"sh_a_flex", label:"Flexion", normal:"180°", how:"Arm forward elevation from side to full overhead. Note: painful arc (60–120° = impingement). Full painless = normal. Compensatory trunk lean = restricted." },
      { id:"sh_a_ext", label:"Extension", normal:"60°", how:"Arm behind body. Note any pain, restriction. Less clinically significant than other planes." },
      { id:"sh_a_abd", label:"Abduction", normal:"180°", how:"Arm elevation in frontal plane. Painful arc 60–120° = subacromial impingement. Pain at top = AC joint. Full restriction = capsular pattern." },
      { id:"sh_a_add", label:"Adduction", normal:"50°", how:"Arm crosses midline horizontally. Pain = AC joint or posterior capsule tightness." },
      { id:"sh_a_er", label:"External Rotation", normal:"90°", how:"Elbow at side, 90° flexion. Rotate forearm outward. Most restricted in frozen shoulder (capsular pattern). Compare bilaterally — GIRD assessment." },
      { id:"sh_a_ir", label:"Internal Rotation", normal:"70°", how:"Elbow at side, rotate forearm inward. Also test via Apley's scratch (hand up back). IR restricted = posterior capsule (GIRD) or frozen shoulder." },
      { id:"sh_a_scaption", label:"Scaption (scapular plane)", normal:"180°", how:"Elevation in scapular plane (30° forward of frontal). Most comfortable plane — tests supraspinatus in optimal line of pull." },
    ],
    passiveROM:[
      { id:"sh_p_er", label:"Passive ER", how:"Elbow at side, 90° flex. Stabilise scapula (critical). Passively rotate forearm outward to end-feel. MOST restricted in capsular pattern. Overpressure carefully.", endfeel_options:["Normal/Capsular (firm leathery)","Muscle Spasm","Empty (No End-Feel)","Hard (Osteophyte)"] },
      { id:"sh_p_abd", label:"Passive Abduction", how:"Stabilise scapula. Passively abduct. Note: range, pain reproduction, end-feel. Painful arc in passive = inert structure (bursa, capsule). No painful arc passive = contractile (tendon).", endfeel_options:["Normal/Capsular","Muscle Spasm","Springy/Rebound","Empty (No End-Feel)"] },
      { id:"sh_p_flex", label:"Passive Flexion", how:"Passively elevate arm in sagittal plane. Stabilise scapula to isolate GH contribution. Overpressure at end range — reproduce impingement.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Bone-to-Bone)","Empty (No End-Feel)"] },
      { id:"sh_p_ir", label:"Passive IR", how:"At 0° abd: measure IR. At 90° abd: measure GIRD (posterior capsule). Note side-to-side difference. >18° deficit at 90° = GIRD = posterior capsule contracture.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Bone-to-Bone)"] },
      { id:"sh_p_horiz_add", label:"Passive Horizontal Adduction", how:"Arm at 90° flex. Cross arm across body horizontally. Pain at shoulder top = AC joint. Overpressure provokes AC joint. Also posterior GH capsule stretching.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard","Springy/Rebound"] },
    ],
    resistedTests:[
      { id:"sh_r_abd", label:"Resisted Abduction (Supraspinatus)", muscle:"Supraspinatus / middle deltoid", how:"Arm at 0–30° abduction. Apply downward resistance at distal humerus. KEY TEST — most diagnostically important shoulder resisted test." },
      { id:"sh_r_er", label:"Resisted ER (Infraspinatus)", muscle:"Infraspinatus / teres minor", how:"Elbow 90° at side. Resist external rotation. Compare bilaterally. Test at 0° and 90° abduction." },
      { id:"sh_r_ir", label:"Resisted IR (Subscapularis)", muscle:"Subscapularis", how:"Elbow 90° at side. Resist internal rotation. Also: lift-off test, belly press for subscapularis isolation." },
      { id:"sh_r_flex", label:"Resisted Flexion (Biceps / Ant Deltoid)", muscle:"Biceps LH / anterior deltoid", how:"Arm at 60° flex, elbow extended, forearm supinated. Resist forward flexion. Bicipital groove pain = biceps LH lesion." },
      { id:"sh_r_elbow_flex", label:"Resisted Elbow Flexion (Biceps LH)", muscle:"Biceps long head", how:"Elbow 90°, forearm supinated. Resist flexion. Pain at bicipital groove = biceps LH tendinopathy. Combined with Speed's test." },
      { id:"sh_r_elbow_ext", label:"Resisted Elbow Extension", muscle:"Triceps", how:"Elbow 30° flex. Resist extension. Rarely positive at shoulder — if positive = posterior shoulder involvement." },
    ],
    jointPlay:[
      { id:"sh_jp_inferior", label:"Inferior GH Glide", how:"Patient supine, arm at side. Stabilise acromion. Translate humeral head INFERIORLY. Normal = 1–2 fingers. Restricted = inferior capsule (frozen shoulder). Tests IGHL." },
      { id:"sh_jp_posterior", label:"Posterior GH Glide", how:"Patient supine. Push humeral head POSTERIORLY into glenoid. Tests posterior capsule. Restricted = internal rotation deficit (GIRD). Release = impingement treatment." },
      { id:"sh_jp_anterior", label:"Anterior GH Glide", how:"Patient sidelying or supine. Translate humeral head ANTERIORLY. Restricted = limited ER (anterior capsule). Excessive = anterior instability." },
      { id:"sh_jp_ac", label:"AC Joint Accessory Motion", how:"Stabilise clavicle. Apply PA and superior-inferior glide to acromion. Pain/restriction = AC joint pathology. Reproduce with cross-arm adduction." },
    ],
    redFlags:["Severe restriction — no active movement at all", "Bilateral shoulder restriction (think RA, polymyalgia)", "Constant pain at rest with no movement", "Axillary mass", "Rapid progression of all ROM restriction"],
    differentials:["Rotator cuff tendinopathy", "Rotator cuff tear (partial/complete)", "Adhesive capsulitis (frozen shoulder)", "Subacromial bursitis", "Biceps LH tendinopathy", "SLAP lesion", "AC joint OA / sprain", "GH instability", "Glenohumeral OA", "Calcific tendinopathy", "Cervical radiculopathy (referred)"],
  },

  elbow: {
    label:"Elbow & Forearm", color:"#ff9a9e", icon:"🩷",
    anatomy:"Radioulnar joint, humeroradial joint, humeroulnar joint. Inert: medial collateral lig (UCL), lateral collateral lig (LCL), annular ligament, capsule. Contractile: biceps, brachialis, triceps, brachioradialis, wrist extensors (ECRB/ECRL/ECU), wrist flexors (FCR/FCU), pronator teres, supinator.",
    capsularPattern:"Flexion > Extension (both limited, flexion more so). Loss of full extension = OA, post-fracture, heterotopic ossification.",
    activeROM:[
      { id:"el_a_flex", label:"Flexion", normal:"145°", how:"Bend elbow from full extension. Normal = 145°. Note pain at: initiation (posterior impingement), mid-range, end range (anterior impingement). Restriction = OA, contracture, effusion." },
      { id:"el_a_ext", label:"Extension", normal:"0°", how:"Full extension from flexion. Hyperextension normal in females (-5 to -10°). Loss of full extension = earliest sign of elbow OA or effusion (capsular pattern)." },
      { id:"el_a_pro", label:"Pronation", normal:"85°", how:"Elbow 90°, thumb up start. Rotate palm DOWN. Normal = 85°. Limited = radioulnar joint, pronator teres lesion." },
      { id:"el_a_sup", label:"Supination", normal:"90°", how:"Rotate palm UP from neutral. Normal = 90°. Limited = biceps, supinator, radioulnar joint." },
    ],
    passiveROM:[
      { id:"el_p_flex", label:"Passive Flexion", how:"Passively flex elbow to end-feel. Tissue approximation (forearm to biceps) = normal. Premature capsular end-feel = OA/capsulitis.", endfeel_options:["Tissue Approximation (normal)","Capsular/Leathery","Muscle Spasm","Springy/Rebound","Hard (Bone-to-Bone)"] },
      { id:"el_p_ext", label:"Passive Extension", how:"Passively extend to end-feel. Hard end-feel at 0° = normal (olecranon in fossa). Hard end-feel before 0° = osteophyte/loose body. Soft end-feel = effusion.", endfeel_options:["Bone-to-Bone (normal at 0°)","Springy/Rebound (loose body)","Capsular (early = OA)","Muscle Spasm","Empty (No End-Feel)"] },
      { id:"el_p_ovpres", label:"Overpressure Assessment", how:"At end of passive ROM, apply gentle overpressure. Pain with overpressure = inert structure pain positive. Note: direction and quality of resistance.", endfeel_options:["No pain with overpressure","Pain at end range with overpressure","Pain before end range","Abnormal springy rebound"] },
    ],
    resistedTests:[
      { id:"el_r_flex", label:"Resisted Elbow Flexion", muscle:"Biceps / brachialis / brachioradialis", how:"Elbow 90°, forearm supinated. Resist flexion. Pain at bicipital region = biceps. Supinated vs pronated position differentiates biceps vs brachialis." },
      { id:"el_r_ext", label:"Resisted Elbow Extension", muscle:"Triceps", how:"Elbow 30° flex. Resist extension. Pain posterior elbow = triceps lesion (insertion on olecranon). Weak = C7 radiculopathy." },
      { id:"el_r_pro", label:"Resisted Pronation", muscle:"Pronator teres / pronator quadratus", how:"Elbow 90°, neutral. Resist pronation. Pain medial elbow = medial epicondylalgia / pronator teres lesion." },
      { id:"el_r_sup", label:"Resisted Supination", muscle:"Supinator / biceps", how:"Elbow 90°, pronated. Resist supination. Pain lateral elbow = lateral epicondylalgia (supinator contribution) or biceps insertion." },
      { id:"el_r_wext", label:"Resisted Wrist Extension", muscle:"ECRB / ECRL / ECU", how:"MOST IMPORTANT ELBOW TEST. Resist wrist extension with elbow in extension AND then in flexion. Pain at lateral epicondyle = ECRB tendinopathy (tennis elbow). Fist clenched increases sensitivity." },
      { id:"el_r_wflex", label:"Resisted Wrist Flexion", muscle:"FCR / FCU / palmaris longus", how:"Resist wrist flexion. Pain at medial epicondyle = medial epicondylalgia (golfer's elbow). Test FCR vs FCU by ulnar/radial deviation addition." },
      { id:"el_r_grip", label:"Resisted Grip Strength", muscle:"Forearm flexors", how:"Patient squeezes dynamometer or therapist's fingers. Compare bilaterally. Grip strength reduced = lateral epicondylalgia (pain inhibition) or C8/T1 radiculopathy." },
    ],
    jointPlay:[
      { id:"el_jp_medial", label:"Medial Traction / Valgus Glide", how:"Elbow 20° flex. Apply valgus force (medial joint gap). Tests UCL. >5mm gap or pain = UCL sprain." },
      { id:"el_jp_lateral", label:"Lateral Traction / Varus Glide", how:"Elbow 20° flex. Apply varus force (lateral gap). Tests LCL. Less commonly injured." },
      { id:"el_jp_radial_head", label:"Radial Head Accessory Motion", how:"Elbow 90°. Palpate radial head anterolaterally. Apply PA and anterior-posterior glide to radial head. Restricted = radioulnar or radiocapitellar OA." },
    ],
    redFlags:["Severe acute elbow swelling post-trauma", "Cannot extend — suspect intra-articular fracture", "Progressive weakness of grip", "Bilateral elbow restriction (think RA, haemophilia)"],
    differentials:["Lateral epicondylalgia (ECRB tendinopathy)", "Medial epicondylalgia (FCR/FCU)", "Biceps tendinopathy/rupture", "Elbow OA", "Olecranon bursitis", "UCL sprain", "Cubital tunnel syndrome (ulnar nerve)", "Radial tunnel syndrome", "C6/C7 radiculopathy (referred)"],
  },

  wrist_hand: {
    label:"Wrist & Hand", color:"#80deea", icon:"🤚",
    anatomy:"Radiocarpal, midcarpal, CMC, MCP, PIP, DIP joints. Inert: radiocarpal ligaments, UCL/RCL, TFCC, scapholunate ligament, CMC ligaments. Contractile: wrist extensors/flexors, finger extensors/flexors, intrinsics.",
    capsularPattern:"Radiocarpal: Flex = Extension equally limited. 1st CMC: Abduction > Extension.",
    activeROM:[
      { id:"wr_a_flex", label:"Wrist Flexion", normal:"80°", how:"From neutral, flex wrist. Normal = 80°. Compare bilaterally. Restriction = radiocarpal capsulitis, post-fracture." },
      { id:"wr_a_ext", label:"Wrist Extension", normal:"70°", how:"From neutral, extend wrist. Normal = 70°. Most commonly restricted after Colles fracture." },
      { id:"wr_a_ud", label:"Ulnar Deviation", normal:"30°", how:"Deviate toward ulnar side. Normal = 30°. TFCC pain = ulnar deviation loaded." },
      { id:"wr_a_rd", label:"Radial Deviation", normal:"20°", how:"Deviate toward radial side. Normal = 20°. Pain = De Quervain's (test with Finkelstein's). Restricted = radiocarpal OA." },
      { id:"wr_a_grip", label:"Grip Strength", normal:"Bilateral symmetric", how:"Compare bilateral grip strength (dynamometer or manual test). Reduced grip = lateral epicondylalgia, carpal tunnel, C8 radiculopathy, or pain inhibition." },
    ],
    passiveROM:[
      { id:"wr_p_flex", label:"Passive Wrist Flex", how:"Passively flex wrist to end-feel. Overpressure at end range. Increased pain vs active = inert structure (capsule, ligament).", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Bone-to-Bone)","Springy/Rebound","Empty (No End-Feel)"] },
      { id:"wr_p_ext", label:"Passive Wrist Ext", how:"Passively extend to end-feel. Overpressure for inert pain.", endfeel_options:["Normal/Capsular","Hard (Bone-to-Bone)","Muscle Spasm","Springy/Rebound"] },
    ],
    resistedTests:[
      { id:"wr_r_ext", label:"Resisted Wrist Extension", muscle:"ECRB / ECRL / ECU", how:"Resist wrist extension from neutral. Pain lateral elbow = ECRB (lateral epicondylalgia). Pain dorsal wrist = local wrist extensor pathology." },
      { id:"wr_r_flex", label:"Resisted Wrist Flexion", muscle:"FCR / FCU", how:"Resist wrist flexion. Pain medial elbow = medial epicondylalgia. Pain ventral wrist = FCR/FCU lesion at wrist level." },
      { id:"wr_r_thumb_ext", label:"Resisted Thumb Extension", muscle:"EPL / EPB", how:"Resist thumb extension. Pain at 1st dorsal compartment = De Quervain's. Positive with Finkelstein's confirms." },
      { id:"wr_r_thumb_abd", label:"Resisted Thumb Abduction", muscle:"APL", how:"Resist thumb abduction. Pain at 1st dorsal compartment = De Quervain's (APL component)." },
      { id:"wr_r_fing_flex", label:"Resisted Finger Flexion", muscle:"FDS / FDP", how:"Resist finger flexion at DIP (FDP) and PIP (FDS). Weakness = C8 radiculopathy or tendon rupture." },
      { id:"wr_r_fing_ext", label:"Resisted Finger Extension", muscle:"EDC / EI / EDM", how:"Resist finger extension. Weakness = posterior interosseous nerve palsy (radial nerve branch)." },
    ],
    jointPlay:[
      { id:"wr_jp_radio", label:"Radiocarpal PA/AP Glide", how:"Stabilise radius. Translate carpal bones PA (toward dorsum) and AP (toward palm). Restricted = capsulitis. Hypermobile = instability. Compare bilaterally." },
      { id:"wr_jp_midcarpal", label:"Midcarpal Glide", how:"Stabilise proximal row. Translate distal row. Restricted = midcarpal OA or post-fracture. Pain = midcarpal instability." },
      { id:"wr_jp_tfcc", label:"TFCC Stress Test", how:"Stabilise radius. Apply ulnar compression through lunate toward TFCC. Pain at ulnar wrist = TFCC pathology. Confirm with passive ulnar deviation load." },
    ],
    redFlags:["Rapidly progressive hand weakness", "Bilateral hand weakness (think RA, myelopathy)", "Loss of 2-point discrimination", "Trophic changes"],
    differentials:["Carpal tunnel syndrome (median N)", "De Quervain's tenosynovitis", "TFCC tear", "Scapholunate instability", "Radiocarpal OA", "Dupuytren's contracture", "Trigger finger", "1st CMC OA", "Lateral/medial epicondylalgia (referred wrist pain)"],
  },

  lumbar: {
    label:"Lumbar Spine", color:"#ff6b35", icon:"🟠",
    anatomy:"L1–L5 vertebrae. Inert: disc (nucleus pulposus, annulus fibrosus), facet joint capsules, ALL, PLL, ligamentum flavum, interspinous/supraspinous ligaments, SIJ. Contractile: erector spinae, multifidus, QL, psoas, abdominals, gluteals (indirect).",
    capsularPattern:"Side-flex equally limited both ways, Extension > Flexion. Severe: all movements limited = OA / spondylosis.",
    activeROM:[
      { id:"lu_a_flex", label:"Flexion", normal:"90°", how:"Patient stands. Bends forward. OBSERVE: where does movement initiate — hip or lumbar? Lateral trunk shift? Normal = sequential lumbar flexion + hip flexion. Painful arc mid-range = disc. Restriction = disc, facet, or muscle. Measure with Schober test (mark L5 and 10cm above — normal = ≥5cm increase)." },
      { id:"lu_a_ext", label:"Extension", normal:"30°", how:"Extend lumbar spine. Support at ASIS. Pain = facet loading, spondylolysis, spinal stenosis. Relieves = disc herniation (posteriorly). Compare McKenzie assessment direction of preference." },
      { id:"lu_a_sfl", label:"Side Flex Left", normal:"40°", how:"Slide hand down lateral thigh. Normal = 40°. Restriction + ipsilateral pain = facet, lateral disc. Restriction + contralateral pain = disc herniation (nerve root tension)." },
      { id:"lu_a_sfr", label:"Side Flex Right", normal:"40°", how:"As above to right. Compare sides — asymmetry = unilateral lesion." },
      { id:"lu_a_rotl", label:"Rotation Left (standing)", normal:"45°", how:"Hands on hips. Rotate trunk. Limited rotation = facet, disc, thoracolumbar restriction. Assess thoracic contribution." },
      { id:"lu_a_rotr", label:"Rotation Right", normal:"45°", how:"As above to right. Asymmetric = ipsilateral facet or disc." },
    ],
    passiveROM:[
      { id:"lu_p_flex", label:"Passive Trunk Flexion", how:"Patient supine. Bring knees to chest (passive lumbar flexion). Assess end-feel. Add Slump for neural tension. Compare active vs passive.", endfeel_options:["Normal/Capsular","Muscle Spasm","Empty (No End-Feel)","Hard (Osteophyte)"] },
      { id:"lu_p_ext", label:"Passive Extension (prone press-up)", how:"Patient prone. Press up on arms (sphinx position). Allow lumbar to extend passively. McKenzie extension movement. Pain behaviour with extension = directional preference.", endfeel_options:["Normal/Capsular","Muscle Spasm","Springy/Rebound","Hard"] },
      { id:"lu_p_rotation", label:"Passive Rotation in Sidelying", how:"Sidelying, hips/knees 90°. Rotate trunk by moving top shoulder posteriorly while stabilising pelvis. Segmental rotation mobilisation. End-feel at each level.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Osteophyte)","Empty"] },
      { id:"lu_p_pa_spring", label:"Passive PA Pressure (Spring Test)", how:"Patient prone. Therapist thumbs on spinous process. Apply PA pressure each level L1–L5. Assess: pain, stiffness, quality of spring. Grade each level: (0) rigid, (1) stiff, (2) normal, (3) hypermobile. Note which level most painful/stiff.", endfeel_options:["Normal spring","Stiff — hypomobile","Rigid — severe restriction","Hypermobile — unstable","Painful — local segment","Painful — referred"] },
    ],
    resistedTests:[
      { id:"lu_r_flex", label:"Resisted Trunk Flexion", muscle:"Rectus abdominis / psoas", how:"Patient supine, knees bent. Resist curl-up. Pain = anterior abdominal/psoas lesion. Weakness = nerve root or serious lesion." },
      { id:"lu_r_ext", label:"Resisted Trunk Extension", muscle:"Erector spinae / multifidus", how:"Patient prone. Resist trunk extension. Pain = erector spinae / multifidus lesion. Weakness = L3–L5 radiculopathy." },
      { id:"lu_r_sfl", label:"Resisted Side Flex", muscle:"QL / lateral trunk", how:"Standing. Resist side-flex each direction. Pain ipsilateral = QL/lateral flexor lesion." },
      { id:"lu_r_hip_flex", label:"Resisted Hip Flexion", muscle:"Iliopsoas", how:"Supine, hip 90°. Resist hip flexion. Pain = iliopsoas lesion. Weakness = L2/3 radiculopathy." },
      { id:"lu_r_hip_abd", label:"Resisted Hip Abduction", muscle:"Gluteus medius / TFL", how:"Sidelying. Resist hip abduction. Weak+painful = gluteus medius lesion, trochanteric bursitis. Weak+painless = L4 radiculopathy or nerve injury." },
      { id:"lu_r_hip_ext", label:"Resisted Hip Extension", muscle:"Gluteus maximus / hamstrings", how:"Prone. Resist hip extension with knee bent (reduces hamstring) then extended (adds hamstring). Compare which more painful." },
    ],
    jointPlay:[
      { id:"lu_jp_pa", label:"PA Central Pressure (L1–L5)", how:"Prone. Thumbs on spinous process each level L1–L5. Apply firm PA pressure. Grade stiffness 0–3. Note pain quality and level. Most painful + stiffest = symptomatic level." },
      { id:"lu_jp_unilat", label:"Unilateral PA (Facet)", how:"Thumbs on mammary bodies (2cm lateral to spinous process). Apply PA pressure. Pain = ipsilateral facet pathology. Compare bilaterally. Asymmetric = unilateral facet involvement." },
      { id:"lu_jp_traction", label:"Lumbar Traction Assessment", how:"Supine. Stabilise pelvis with belt. Apply manual traction through legs. Positive if symptoms ease = neural/disc decompression response. Guides traction treatment decisions." },
    ],
    redFlags:["Bilateral leg symptoms", "Saddle anaesthesia (URGENT — cauda equina)", "Bladder/bowel dysfunction (URGENT)", "Night pain at rest", "Age <20 or >55 first episode", "Bilateral SLR positive"],
    differentials:["Lumbar disc herniation (L4/5 or L5/S1 most common)", "Lumbar facet syndrome", "Lumbar spinal stenosis", "Spondylolysis / spondylolisthesis", "Sacroiliac joint dysfunction", "Piriformis syndrome", "Lumbar muscle strain / sprain", "Lumbar OA / spondylosis", "Discogenic low back pain"],
  },

  hip: {
    label:"Hip Joint", color:"#00c97a", icon:"🟢",
    anatomy:"Ball-and-socket joint. Inert: hip capsule (iliofemoral, pubofemoral, ischiofemoral ligaments), acetabular labrum. Contractile: hip flexors (iliopsoas, rectus femoris, sartorius), extensors (gluteus maximus, hamstrings), abductors (gluteus medius/minimus, TFL), adductors, ER (piriformis, obturators, gemellus, quadratus femoris), IR (TFL, glute med anterior).",
    capsularPattern:"IR most limited = Flexion = Abduction. In advanced OA: all severely restricted.",
    activeROM:[
      { id:"hip_a_flex", label:"Flexion", normal:"120°", how:"Supine. Bring knee to chest. Normal = 120–130°. Restriction = capsulitis, OA, psoas tightness. Pain anterior = FAI, labral." },
      { id:"hip_a_ext", label:"Extension", normal:"30°", how:"Prone or standing (Thomas test reference position). Hip extension. Tight = iliopsoas. Measure with Thomas test for accurate reading." },
      { id:"hip_a_abd", label:"Abduction", normal:"45°", how:"Supine. Stabilise pelvis. Abduct leg. Normal = 45°. Restriction = adductor tightness, hip OA (capsular). Pain = IT band, greater trochanter." },
      { id:"hip_a_add", label:"Adduction", normal:"30°", how:"Leg crosses midline. Pain = adductor strain, medial groin. Restriction = LL fascial, hip capsule." },
      { id:"hip_a_er", label:"External Rotation", normal:"45°", how:"Prone, knee bent 90°. Foot falls inward (ER). Normal = 45°. Restriction = posterior capsule, piriformis tight." },
      { id:"hip_a_ir", label:"Internal Rotation", normal:"45°", how:"Prone, knee bent. Foot falls outward (IR). Normal = 45°. MOST RESTRICTED in hip OA (capsular pattern). <35° = high LBP risk (kinetic chain). Asymmetry = unilateral capsular problem." },
    ],
    passiveROM:[
      { id:"hip_p_ir", label:"Passive IR", how:"Prone, knee 90°. Passively IR hip. Assess range + end-feel + pain at end range. MOST restricted in capsular pattern.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard (Osteophyte — OA)","Empty (No End-Feel)"] },
      { id:"hip_p_flex", label:"Passive Flexion + Overpressure", how:"Supine. Passively flex hip maximally. Add overpressure. FADIR addition: adduct + IR at end flex = FAI/labral screen.", endfeel_options:["Normal/Capsular","Springy/Rebound","Hard (OA/osteophyte)","Muscle Spasm","Empty"] },
      { id:"hip_p_abd", label:"Passive Abduction", how:"Supine, stabilise pelvis. Passively abduct. Early restriction = adductor tightness or capsular pattern. Late pain = trochanteric bursitis.", endfeel_options:["Normal/Capsular (firm at end range)","Muscle Spasm","Springy/Rebound","Hard"] },
      { id:"hip_p_ext", label:"Passive Extension (Thomas)", how:"Thomas test position: contralateral hip fully flexed. Passively lower test hip into extension. Note: angle from horizontal = iliopsoas length. Knee extension = rectus femoris.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard","Springy/Rebound"] },
    ],
    resistedTests:[
      { id:"hip_r_flex", label:"Resisted Hip Flexion", muscle:"Iliopsoas (primary)", how:"Supine, hip 90°. Resist flexion. Pain anterior hip = iliopsoas lesion. Weakness = L2/3 radiculopathy. Combine with FABER for differentiation." },
      { id:"hip_r_ext", label:"Resisted Hip Extension", muscle:"Gluteus maximus / hamstrings", how:"Prone. Resist hip extension knee bent (isolates glute max) then knee extended (adds hamstrings). Observe FIRING ORDER — glute should fire first." },
      { id:"hip_r_abd", label:"Resisted Abduction", muscle:"Gluteus medius / TFL", how:"Sidelying. Resist abduction. Painful + weak = glute med lesion or trochanteric bursitis. Painless + weak = L4 root or nerve injury. Observe for TFL compensation." },
      { id:"hip_r_add", label:"Resisted Adduction", muscle:"Adductor group (longus, brevis, magnus)", how:"Supine. Resist adduction with knees straight. Pain medial groin = adductor lesion (origin at pubic ramus). Groin strain = strong painful. Complete rupture = weak painful." },
      { id:"hip_r_er", label:"Resisted ER", muscle:"Piriformis / obturators / gemellus", how:"Prone, knee 90°. Resist ER (push foot medially). Pain deep buttock = piriformis lesion. Compare bilaterally." },
      { id:"hip_r_ir", label:"Resisted IR", muscle:"TFL / anterior glute med", how:"Prone, knee 90°. Resist IR (push foot laterally). Less commonly isolated clinically. Weakness = L5 or sciatic nerve." },
    ],
    jointPlay:[
      { id:"hip_jp_long", label:"Longitudinal Traction", how:"Patient supine. Grip distal thigh. Apply sustained traction along femoral shaft toward foot. Relief of pain = intra-articular (OA, capsular). Guides traction and mobilisation treatment." },
      { id:"hip_jp_lateral", label:"Lateral Traction (Distraction)", how:"Strap around proximal thigh. Apply lateral distraction (strap pulling laterally while stabilising pelvis). Positive = intra-articular symptoms ease = hip joint compression driving symptoms." },
      { id:"hip_jp_posterior", label:"Posterior Glide of Femoral Head", how:"Supine, hip 90°. Apply PA pressure through distal femur. Posterior glide of femoral head in acetabulum. Restricted = anterior capsule. Used in Grade III–IV mobilisation for hip IR." },
    ],
    redFlags:["Severe restriction all directions (think fracture, tumour, infection)", "Night pain at rest (neoplasm)", "Avascular necrosis risk (sickle cell, prolonged steroid use)", "Limp in child — refer same day (Perthes / SUFE)"],
    differentials:["Hip OA", "FAI (femoroacetabular impingement)", "Hip labral tear", "Greater trochanteric pain syndrome (bursitis/glute tendinopathy)", "Adductor strain", "Iliopsoas tendinopathy", "Avascular necrosis", "SIJ referral to hip", "Lumbar referred pain (L2/L3)", "Meralgia paraesthetica (lateral femoral cutaneous nerve)"],
  },

  knee: {
    label:"Knee", color:"#ffb300", icon:"🟡",
    anatomy:"Tibiofemoral (medial + lateral compartments), patellofemoral, superior tibiofibular joints. Inert: ACL, PCL, MCL, LCL, menisci (medial + lateral), capsule, patellar retinaculum, fat pad, bursae. Contractile: quadriceps (VMO, VL, VM, RF), hamstrings (medial + lateral), popliteus, gastrocnemius, popliteal tendons.",
    capsularPattern:"Flexion >> Extension (significant flexion restriction with comparatively less extension loss). In severe OA = both significantly restricted.",
    activeROM:[
      { id:"kn_a_flex", label:"Flexion", normal:"140°", how:"Active flexion. Heel to buttock. Normal = 140°. Restricted = OA, effusion (capsular), quad tightness, posterior capsule. Painful arc = meniscal impingement at specific range." },
      { id:"kn_a_ext", label:"Extension", normal:"0°", how:"Full extension from flexed. Hyperextension = 5–10° in females. Loss of full extension = EARLIEST OA sign (capsular pattern), effusion, or ACL injury (pivot shift block). Extensor lag = patella tendon or quad rupture." },
      { id:"kn_a_stair", label:"Stair/Step Assessment", normal:"Pain free", how:"Patient performs step-up/step-down. Observe: knee valgus, pelvic drop, trunk lean. Stair descent more provocative than ascent for PF joint." },
      { id:"kn_a_squat", label:"Squat Assessment", normal:"Full depth, symmetric", how:"Functional ROM test. Note: depth achieved, pain location, compensations (valgus, heel rise, trunk lean). Correlates with daily function." },
    ],
    passiveROM:[
      { id:"kn_p_flex", label:"Passive Flexion", how:"Supine. Passively flex knee maximally. Tissue approximation normal end-feel. Premature capsular = OA. Springy = meniscal block.", endfeel_options:["Tissue Approximation (normal)","Capsular/Leathery (OA)","Springy/Rebound (meniscal block)","Muscle Spasm","Hard (osteophyte/loose body)","Empty (No End-Feel)"] },
      { id:"kn_p_ext", label:"Passive Extension", how:"Passively extend from flexion. Hard end-feel at 0° = normal. Hard before 0° = osteophyte. Springy before 0° = loose body/meniscal block. Capsular before 0° = OA.", endfeel_options:["Hard (normal at 0°)","Springy/Rebound (loose body — before 0°)","Capsular (OA — before 0°)","Muscle Spasm","Empty (No End-Feel)"] },
      { id:"kn_p_ir_er", label:"Tibial Rotation (at 90°)", how:"Knee at 90°. Passively rotate tibia IR and ER. Normal IR = 20–30°, ER = 30–40°. Restricted IR = biceps femoris, LCL. Restricted ER = MCL, medial capsule. Pain = meniscal.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard","Springy/Rebound"] },
      { id:"kn_p_patellar", label:"Patellar Mobility", how:"Knee extended, relaxed. Glide patella: (1) medially (restricted = tight lateral retinaculum), (2) laterally (restricted = medial retinaculum), (3) superiorly, (4) inferiorly. Tilt medial edge (lateral retinaculum tightness = cannot tilt ≥0°). Crepitus with passive movement = PFPS/chondromalacia.", endfeel_options:["Normal mobility","Lateral bias (tight lateral retinaculum)","Medial bias","Hypermobile (MPFL laxity)","Crepitus with movement"] },
    ],
    resistedTests:[
      { id:"kn_r_ext", label:"Resisted Knee Extension", muscle:"Quadriceps / patellar tendon", how:"Seated, knee 90°. Resist extension. Pain at patellar tendon = patellar tendinopathy. Pain at tibial tuberosity (adolescent) = Osgood-Schlatter. Weakness = L3/4 radiculopathy. VMO timing test: feel VMO vs VL — does VMO activate simultaneously?" },
      { id:"kn_r_flex", label:"Resisted Knee Flexion", muscle:"Hamstrings", how:"Prone, knee 90°. Resist flexion. Pain at posterior thigh = hamstring proximal origin. Pain at fibular head (lateral) = biceps femoris. Pain posterior knee = popliteal tendon." },
      { id:"kn_r_flex_ir", label:"Resisted Flexion + IR (medial hamstrings)", muscle:"Semimembranosus / semitendinosus", how:"Prone. Resist flexion + IR. Pain medial joint line = medial hamstring insertion lesion (semimembranosus). Differentiates medial vs lateral hamstring." },
      { id:"kn_r_flex_er", label:"Resisted Flexion + ER (biceps femoris)", muscle:"Biceps femoris", how:"Prone. Resist flexion + ER. Pain lateral joint line / fibular head = biceps femoris tendinopathy." },
    ],
    jointPlay:[
      { id:"kn_jp_tib_fem", label:"Tibiofemoral Distraction / AP Glide", how:"Patient supine, knee 30° flex. Traction tibia longitudinally. Then AP (anterior) glide: stabilise femur, translate tibia anteriorly (tests ACL). PA (posterior) glide: translate tibia posteriorly (tests PCL)." },
      { id:"kn_jp_medial_lat", label:"Medial/Lateral Compartment Distraction", how:"Apply valgus (opens medial) and varus (opens lateral) force at 0° and 30°. At 30° = isolates MCL/LCL. At 0° = also tests PCL/posterior capsule. Grade laxity 1–3." },
      { id:"kn_jp_superior_tib", label:"Superior Tibiofibular Joint", how:"Stabilise tibia. Translate fibular head anteriorly and posteriorly. Pain or restriction = superior tibiofibular joint pathology (can refer to lateral knee and ankle)." },
    ],
    redFlags:["Severe acute swelling post-trauma (haemarthrosis)", "Locked knee — cannot extend at all", "Posterior knee swelling + DVT risk factors", "Child/adolescent — growing pains vs tumour"],
    differentials:["Patellofemoral pain syndrome (PFPS)", "Patellar tendinopathy", "IT band friction syndrome", "Medial meniscal tear", "Lateral meniscal tear", "ACL insufficiency", "MCL sprain", "Knee OA (medial/lateral compartment)", "Infrapatellar fat pad impingement", "Prepatellar bursitis", "Popliteal cyst (Baker's cyst)", "L3/L4 radiculopathy (referred)"],
  },

  ankle_foot: {
    label:"Ankle & Foot", color:"#a8ff3e", icon:"🟢",
    anatomy:"Talocrural (ankle), subtalar (STJ), midtarsal (Chopart's), tarsometatarsal (Lisfranc's), MTP, IP joints. Inert: ATFL, CFL, PTFL (lateral), deltoid (medial), AITFL (syndesmosis), plantar fascia, spring ligament. Contractile: gastrocnemius/soleus (PF), tibialis anterior (DF), tibialis posterior (inversion), peroneals (eversion), intrinsic foot muscles.",
    capsularPattern:"Ankle (talocrural): Plantarflexion > Dorsiflexion. Subtalar: Inversion restricted. 1st MTP: Extension > Flexion (hallux rigidus).",
    activeROM:[
      { id:"ank_a_df", label:"Dorsiflexion", normal:"20°", how:"Non-weight-bearing: passive DF. Weight-bearing: lunge test (knee to wall — normal = 10cm+). Compare bilaterally. Restriction = gastroc/soleus, posterior ankle capsule, or OA." },
      { id:"ank_a_pf", label:"Plantarflexion", normal:"50°", how:"From neutral, point foot. Normal = 50°. Pain at end range = posterior impingement (dancer's heel). Restriction = anterior capsule, OA." },
      { id:"ank_a_inv", label:"Inversion", normal:"35°", how:"Combined plantar inversion (STJ motion). Normal = 35°. Restriction = anterior lateral ankle sprain sequelae, STJ OA. Test tibialis posterior strength via single-leg heel raise." },
      { id:"ank_a_ev", label:"Eversion", normal:"15°", how:"Evert foot. Normal = 15°. Restricted = deltoid ligament, medial capsule, or tibialis posterior spasm. Pain = peroneal tendinopathy (lateral)." },
      { id:"ank_a_1mtp", label:"1st MTP Extension", normal:"60–70°", how:"Extend great toe passively. Normal = 60–70° DF. Restriction = hallux rigidus (1st MTP OA) or hallux limitus. Critical for gait push-off and SBL function." },
    ],
    passiveROM:[
      { id:"ank_p_df", label:"Passive DF", how:"Compare passive vs active DF. More than active = contractile limitation (gastroc). Same = joint capsule or bony block. Test with knee bent (isolates subtalar, removes gastroc) vs extended (adds gastroc).", endfeel_options:["Capsular/Leathery (normal)","Hard (Bone-to-Bone — OA or impingement)","Muscle Spasm","Springy/Rebound","Empty (No End-Feel)"] },
      { id:"ank_p_inv", label:"Passive Inversion (STJ)", how:"Stabilise talus. Invert calcaneus. Tests ATFL and STJ motion. Compare to contralateral. Assess range AND quality of end-feel.", endfeel_options:["Normal/Capsular","Muscle Spasm","Hard","Springy/Rebound"] },
      { id:"ank_p_plantar_fascia", label:"Passive Plantar Fascia Assessment", how:"Flex toes and ankle into dorsiflexion simultaneously (windlass mechanism). Palpate plantar fascia from calcaneal origin to metatarsal heads. Note: tissue tension, tenderness, thickness (Doppler comparison).", endfeel_options:["Normal tension and mobility","Restricted — taut band","Tender — fasciopathy","Thick / nodular — fibrosis"] },
    ],
    resistedTests:[
      { id:"ank_r_df", label:"Resisted Dorsiflexion", muscle:"Tibialis anterior", how:"Resist ankle DF + inversion. Pain anterior shin = tibialis anterior tendinopathy. Weakness = L4 radiculopathy (foot drop risk)." },
      { id:"ank_r_pf", label:"Resisted Plantarflexion", muscle:"Gastrocnemius / soleus", how:"Resist PF. Also: single-leg heel raise test (25 reps = normal calf endurance). Weakness = S1/S2 radiculopathy. Pain = Achilles tendinopathy." },
      { id:"ank_r_inv", label:"Resisted Inversion (tibialis posterior)", muscle:"Tibialis posterior", how:"Resist PF + inversion (tibialis posterior specific). Pain medial ankle = tib post tendinopathy. Weakness = progressive flatfoot dysfunction." },
      { id:"ank_r_ev", label:"Resisted Eversion (peroneals)", muscle:"Peroneus longus / brevis", how:"Resist eversion. Pain lateral ankle = peroneal tendinopathy. Weakness = chronic lateral instability or common peroneal nerve injury (foot drop with inversion)." },
      { id:"ank_r_toe_ext", label:"Resisted Great Toe Extension", muscle:"Extensor hallucis longus", how:"Resist great toe extension. Weakness = L5 (most specific L5 myotome). Pain = EHL tendinopathy (anterior ankle)." },
      { id:"ank_r_heel_raise", label:"Single-Leg Heel Raise Test", muscle:"Gastroc-soleus / tibialis posterior", how:"Patient does single-leg heel raise repetitions. Normal = 25 reps, full height. Reduced height = tibialis posterior insufficiency. Reduced reps = gastroc-soleus weakness. Cannot invert during raise = tib post rupture." },
    ],
    jointPlay:[
      { id:"ank_jp_talar", label:"Talar Posterior Glide (↑ DF)", how:"Patient supine, ankle over table edge. Stabilise distal tibia. Apply posterior glide of talus in mortise. Restricted posterior glide = limited DF. Treatment glide: Grade III–IV for ankle DF restriction." },
      { id:"ank_jp_calcaneal", label:"Calcaneal Inversion/Eversion (STJ)", how:"Patient prone. Grasp calcaneus firmly. Assess inversion and eversion glide independently of talocrural. Restricted eversion = post-sprain STJ. Restricted inversion = medial capsule." },
      { id:"ank_jp_midfoot", label:"Midtarsal (Chopart's) Mobility", how:"Stabilise heel (calcaneus + talus). Translate midfoot PA and AP. Also forefoot rotation. Restricted = post-sprain stiffness, chronic midfoot OA." },
      { id:"ank_jp_1mtp", label:"1st MTP Joint Accessory Motion", how:"Stabilise 1st metatarsal. Translate proximal phalanx: PA glide (increases DF) and AP glide. Distraction. Restricted PA glide = hallux rigidus. Grade III–IV glide mobilisation = treatment for hallux limitus." },
    ],
    redFlags:["Acute severe ankle swelling post-trauma — Ottawa rules (refer for X-ray)", "Inability to weight-bear (potential fracture)", "Compartment syndrome signs (firm calf, pain on passive stretch)", "Posterior heel swelling + fever (infection)"],
    differentials:["Lateral ankle sprain (ATFL/CFL)", "Achilles tendinopathy (mid-portion vs insertional)", "Plantar fasciitis", "Tibialis posterior tendinopathy/rupture", "Peroneal tendinopathy/subluxation", "Sinus tarsi syndrome", "Tarsal tunnel syndrome", "Ankle OA", "Hallux rigidus", "Metatarsalgia", "Stress fracture (navicular, 5th metatarsal, calcaneus)"],
  },
};

// ─── CYRIAX CLINICAL REASONING ENGINE ────────────────────────────────────────
const UNIV_S={
  demographics:{label:"Demographics",icon:"👤",color:"#00e5ff",fields:[
    {id:"dem_name",label:"Full Name",type:"text"},
    {id:"dem_dob",label:"Date of Birth",type:"text",placeholder:"DD/MM/YYYY"},
    {id:"dem_sex",label:"Biological Sex",type:"select",options:["Male","Female","Other","Prefer not to say"]},
    {id:"dem_dominant",label:"Hand Dominance",type:"select",options:["Right","Left","Ambidextrous"]},
    {id:"dem_occupation",label:"Occupation",type:"text"},
    {id:"dem_employer",label:"Employer / Industry",type:"text"},
    {id:"dem_work_status",label:"Work Status",type:"select",options:["Full time","Part time","Self employed","Off work — injury","Off work — illness","Retired","Unemployed","Student","Home duties"]},
    {id:"dem_referral",label:"Referred By",type:"select",options:["Self referred","GP","Orthopaedic surgeon","Rheumatologist","Neurologist","Emergency dept","Employer","Insurer","Solicitor","Other"]},
    {id:"dem_gp",label:"GP Name & Practice",type:"text"},
    {id:"dem_consent",label:"Consent",type:"select",options:["Yes — verbal","Yes — written","Not yet"]},
    {id:"dem_notes",label:"Demographics Notes",type:"textarea",placeholder:"Any additional context"},
  ]},
  complaint:{label:"Chief Complaint",icon:"🎯",color:"#ff4d6d",fields:[
    {id:"cc_main",label:"Chief complaint — patient's own words",type:"textarea",placeholder:"Quote the patient directly — exact language matters clinically and medicolegally"},
    {id:"cc_onset",label:"How did it start?",type:"select",options:["Sudden — traumatic","Sudden — no trauma","Gradual — insidious","Sport-related","Lifting injury","Twisting injury","MVA / whiplash","Post-surgical","Woke with it","Repetitive strain","After new activity","Post-partum","Post-illness / viral","No clear cause"]},
    {id:"cc_duration",label:"How long?",type:"select",options:["< 1 week (hyperacute)","1–2 weeks (acute)","2–6 weeks (subacute)","6 weeks–3 months","3–6 months (chronic)","6–12 months","1–2 years","> 2 years","Since childhood","Recurring — multiple episodes"]},
    {id:"cc_vas_now",label:"Pain now (NRS 0–10)",type:"range"},
    {id:"cc_vas_worst",label:"Worst pain past week (NRS 0–10)",type:"range"},
    {id:"cc_vas_best",label:"Best pain past week (NRS 0–10)",type:"range"},
    {id:"cc_quality",label:"Pain / symptom quality",type:"multicheck",options:["Sharp","Dull","Aching","Throbbing","Burning","Shooting","Stabbing","Electric shock","Tingling","Pins and needles","Numbness","Heaviness","Tightness","Pressure","Cramping","Grinding","Catching","Weakness"]},
    {id:"cc_notes",label:"Complaint Notes",type:"textarea",placeholder:"Qualified answers, specific details, contradictions, patient's exact language"},
  ]},
  goals:{label:"Patient Goals & Beliefs",icon:"🏆",color:"#22c55e",fields:[
    {id:"goal_main",label:"Main goal from physiotherapy",type:"textarea",placeholder:"What do you most want to achieve?"},
    {id:"goal_concern",label:"What worries you most?",type:"textarea",placeholder:"Primary fear — exact patient words"},
    {id:"goal_belief",label:"What do YOU think is causing it?",type:"textarea",placeholder:"Patient's own illness attribution — critical for nocebo risk"},
    {id:"goal_success",label:"What would success look like?",type:"textarea"},
    {id:"goal_expect",label:"Recovery expectation",type:"select",options:["Full recovery — confident","Full recovery — hopeful","Mostly better","Partial improvement only","Unsure","Does not expect to improve","Wants pain management only","Waiting for surgery"]},
    {id:"goal_told",label:"Have you been given a diagnosis?",type:"select",options:["No diagnosis given","Yes — helpful clear explanation","Yes — confusing or conflicting","Yes — alarming / nocebo language used","Multiple conflicting diagnoses","Told nothing can be done"]},
    {id:"goal_timeline",label:"Desired recovery timeline",type:"select",options:["ASAP","Weeks","1–3 months","3–6 months","No specific timeline","Long term management"]},
    {id:"goal_notes",label:"Goals Notes",type:"textarea",placeholder:"Clinician observations: illness beliefs, motivation, expectations, language used"},
  ]},
  history:{label:"Previous Episodes & Treatment",icon:"📅",color:"#f59e0b",fields:[
    {id:"hx_first",label:"Is this the first episode?",type:"select",options:["Yes — first ever","No — recurrence","Recurring — frequent","Chronic — never fully resolved","Gradual worsening over years"]},
    {id:"hx_episodes",label:"Number of previous episodes",type:"select",options:["First episode","2–3 episodes","4–6 episodes","More than 6","Continuous since onset"]},
    {id:"hx_resolve",label:"Previous episode resolved by",type:"select",options:["N/A — first episode","Resolved fully on its own","Physiotherapy helped","Medication helped","Injection helped","Surgery helped","Did not fully resolve","Never fully resolved"]},
    {id:"hx_prev_physio",label:"Previous physiotherapy",type:"select",options:["None","Yes — helped significantly","Yes — helped partially","Yes — did not help","Yes — made it worse","Unsure","Currently seeing another physio"]},
    {id:"hx_imaging",label:"Previous imaging",type:"multicheck",options:["None","X-ray — normal","X-ray — abnormal","MRI — normal","MRI — abnormal","CT scan","Ultrasound — normal","Ultrasound — abnormal","Bone scan","DEXA scan","Results not known"]},
    {id:"hx_imaging_detail",label:"Imaging findings (if known)",type:"textarea",placeholder:"What did imaging show? What was the patient told?"},
    {id:"hx_injections",label:"Previous injections",type:"multicheck",options:["None","Cortisone — helped","Cortisone — no lasting effect","Cortisone — made it worse","PRP injection","Hyaluronic acid","Epidural steroid — helped","Epidural steroid — no effect","Nerve root block","Trigger point injection","Prolotherapy"]},
    {id:"hx_surgery",label:"Previous surgery for this complaint",type:"textarea",placeholder:"Type, side, date, outcome, complications"},
    {id:"hx_providers",label:"Other providers currently",type:"multicheck",options:["None","GP managing","Orthopaedic specialist","Rheumatologist","Neurologist","Neurosurgeon","Pain clinic","Chiropractor","Osteopath","Acupuncturist","Psychologist","Podiatrist","Occupational therapist"]},
    {id:"hx_notes",label:"History Notes",type:"textarea",placeholder:"Patterns across episodes, what works vs doesn't, red threads"},
  ]},
  red_flags:{label:"General Red Flag Screen",icon:"🚨",color:"#dc2626",fields:[
    {id:"grf_systemic",label:"Systemic Symptoms",type:"multicheck",options:["None — systemically well","Unexplained weight loss >5kg","Night sweats unrelated to menopause","Fever / systemically unwell","Severe unexplained fatigue","Loss of appetite","Pallor / anaemia suspected","Generalised lymphadenopathy"]},
    {id:"grf_cancer",label:"Cancer History",type:"multicheck",options:["No cancer history","Active cancer — in treatment","Past cancer — cured >5 years","Past cancer — <5 years","Known bone metastases","Family history significant","Suspected — not yet investigated"]},
    {id:"grf_fracture",label:"Fracture Risk",type:"multicheck",options:["No fracture indicators","Major trauma — high energy","Minor trauma + age >50","Minor trauma + known osteoporosis","Long-term steroids >3 months","Point bone tenderness","History of fragility fractures","Suspected pathological fracture"]},
    {id:"grf_infection",label:"Infection Risk",type:"multicheck",options:["No infection risk","IV drug use","Recent infection elsewhere","Immunocompromised","Organ transplant recipient","Active TB","HIV positive","On immunosuppressants / biologics","Recent invasive procedure near pain"]},
    {id:"grf_neuro",label:"Neurological Red Flags",type:"multicheck",options:["No neurological red flags","Progressive motor weakness","Rapid deterioration","Bilateral limb involvement","Upper motor neuron signs reported","Sudden severe headache — thunderclap","Headache with fever + neck stiffness","Facial or cranial nerve signs"]},
    {id:"grf_vascular",label:"Vascular Red Flags",type:"multicheck",options:["No vascular red flags","Absent or reduced pulses reported","Limb pallor or cyanosis","Rest pain in limb","Non-healing wound / ulcer","Pulsatile abdominal mass","Suspected DVT (calf pain + swelling + warmth)"]},
    {id:"grf_action",label:"Action Taken",type:"select",options:["No red flags — proceed with assessment","Red flags noted — monitor closely","GP referral — routine","GP referral — urgent","Emergency department referral","Specialist urgent referral","Awaiting investigation results before proceeding"]},
    {id:"grf_notes",label:"Red Flag Notes",type:"textarea",placeholder:"Clinician's red flag reasoning and decisions"},
  ]},
  pmh:{label:"PMH & Medications",icon:"📋",color:"#ff6b6b",fields:[
    {id:"pmh_conditions",label:"Relevant Medical History",type:"multicheck",options:["No significant PMH","Type 1 diabetes","Type 2 diabetes","Hypertension","Ischaemic heart disease","Previous MI","Heart failure","Previous stroke / TIA","Peripheral vascular disease","DVT / PE history","Rheumatoid arthritis","Ankylosing spondylitis","Psoriatic arthritis","Reactive arthritis","Lupus (SLE)","Gout / pseudogout","Polymyalgia rheumatica","Osteoarthritis","Osteoporosis / osteopenia","Fibromyalgia","Chronic fatigue syndrome","Multiple sclerosis","Parkinson's disease","Peripheral neuropathy","Cancer — current or past","Chronic kidney disease","Liver disease","Thyroid disease","Depression","Anxiety","PTSD","Eating disorder","Obesity (BMI >30)","Pregnancy — current","Recent post-partum <12 months"]},
    {id:"pmh_surgical",label:"Relevant Past Surgeries",type:"textarea",placeholder:"List with approximate dates"},
    {id:"pmh_family",label:"Relevant Family History",type:"textarea",placeholder:"e.g. RA, AS, cancer, early cardiac disease"},
    {id:"med_current",label:"Current Medications",type:"multicheck",options:["None","Paracetamol — regular","Paracetamol — as needed","NSAIDs — regular","NSAIDs — as needed","Aspirin (cardiac dose)","Codeine / tramadol","Strong opioids (morphine/oxycodone)","Gabapentin","Pregabalin","Amitriptyline / nortriptyline","SSRIs","SNRIs (duloxetine/venlafaxine)","Muscle relaxants","Anticoagulants — Warfarin","Anticoagulants — DOAC","Steroids — oral","Steroids — inhaled","Biologics (adalimumab/etanercept)","DMARDs (methotrexate/sulfasalazine)","Bisphosphonates","Statins","Insulin","Blood pressure medications","Thyroid medications","OCP / HRT","Sleeping tablets","Antihistamines"]},
    {id:"med_effectiveness",label:"Medication effectiveness for pain",type:"select",options:["Not applicable","Very effective — significant relief","Moderately effective","Slightly effective","Not effective","Makes it worse","Side effects limiting use"]},
    {id:"med_allergies",label:"Drug allergies / adverse reactions",type:"text"},
    {id:"pmh_notes",label:"PMH Notes",type:"textarea",placeholder:"Relevant detail, interactions with presentation"},
  ]},
  lifestyle:{label:"Lifestyle & General Health",icon:"🌱",color:"#34d399",fields:[
    {id:"ls_health",label:"General health rating",type:"select",options:["Excellent","Good","Fair","Poor","Very poor"]},
    {id:"ls_exercise",label:"Exercise level before this injury",type:"select",options:["Sedentary","Light — walking only","Moderate — 2–3x/week","Active — 4–5x/week","Very active — daily","Elite / competitive","Professional / paid"]},
    {id:"ls_exercise_type",label:"Primary sport / activity",type:"text"},
    {id:"ls_smoking",label:"Smoking",type:"select",options:["Never smoked","Ex-smoker — quit >5 years","Ex-smoker — quit <5 years","Current smoker — <10/day","Current smoker — 10–20/day","Current smoker — >20/day"]},
    {id:"ls_alcohol",label:"Alcohol",type:"select",options:["None","Occasional social","Moderate (within guidelines)","Above guidelines","Heavy / dependent","Recently significantly increased"]},
    {id:"ls_sleep_quality",label:"Sleep quality (independent of pain)",type:"select",options:["Good — refreshed most mornings","Fair — variable","Poor — rarely refreshed","Very poor — chronic insomnia","Sleep apnoea — diagnosed","Sleep apnoea — suspected","Shift work / rotating shifts"]},
    {id:"ls_sleep_position",label:"Preferred sleep position",type:"multicheck",options:["Back","Side (L)","Side (R)","Side — alternates","Front / prone","Recliner / armchair","Cannot lie flat","Multiple pillows","Elevates head of bed"]},
    {id:"ls_stress",label:"Current life stress",type:"select",options:["No significant stress","Mild — manageable","Moderate stress","High — affecting daily life","Severe / crisis level","Bereavement — recent","Major life change — recent (divorce/relocation/job loss)"]},
    {id:"ls_occ_demands",label:"Occupation physical demands",type:"multicheck",options:["Primarily seated / desk","Computer / screen >4hrs daily","Laptop only — no docking","Standing — prolonged","Heavy lifting >20kg","Repetitive lifting","Overhead work","Driving >2hrs daily","Patient / client handling","Fine motor / precision work","Vibration exposure","Cold / outdoor environment","Night shifts / rotating shifts","Manual labour"]},
    {id:"ls_weight_change",label:"Recent weight change",type:"select",options:["Stable","Intentional weight loss","Unintentional weight loss (red flag)","Weight gain — recent","Weight gain — gradual over years"]},
    {id:"ls_notes",label:"Lifestyle Notes",type:"textarea"},
  ]},
};
// ══════════════════════════════════════════════════════════════════════
// REGION MODULES
// ══════════════════════════════════════════════════════════════════════
const REG_MOD_S={
"Cervical spine":{prefix:"cx",sections:{
  cx_location:{label:"Cervical — Location",icon:"📍",color:"#7c3aed",fields:[
    {id:"cx_loc",label:"Primary pain location",type:"multicheck",options:["Suboccipital / base of skull","Upper cervical (C0-C3)","Mid cervical (C4-C5)","Lower cervical (C6-T1)","Anterior neck","Posterior neck (central)","Lateral neck (L)","Lateral neck (R)","Cervico-thoracic junction","Trapezius (L)","Trapezius (R)","Levator scapulae","Sternocleidomastoid"]},
    {id:"cx_radiation",label:"Radiation pattern",type:"multicheck",options:["No radiation — local only","Into occiput / back of head","Behind the eye / retro-orbital","Temporal region","Jaw / TMJ region","Ear / periauricular","Top of shoulder (C4 pattern)","Shoulder / upper arm (L)","Shoulder / upper arm (R)","Down arm to elbow (L)","Down arm to elbow (R)","To hand / fingers (L)","To hand / fingers (R)","Bilateral upper limb","Around chest / anterior chest wall","Between shoulder blades"]},
    {id:"cx_dermatomal",label:"Dermatomal distribution",type:"multicheck",options:["Not dermatomal / not applicable","C4 — lateral shoulder / clavicle","C5 — lateral upper arm / elbow","C6 — thumb / index finger / radial forearm","C7 — middle finger / posterior forearm","C8 — ring / little finger / medial forearm","T1 — medial upper arm","Bilateral — concerning for cord","Non-dermatomal diffuse"]},
    {id:"cx_loc_notes",label:"Location Notes",type:"textarea",placeholder:"Specific location details, depth, character, patient description"},
  ]},
  cx_mechanism:{label:"Cervical — Mechanism",icon:"⚡",color:"#7c3aed",fields:[
    {id:"cx_moi",label:"Mechanism type",type:"multicheck",options:["No clear mechanism — insidious onset","Whiplash — rear-end MVA","Whiplash — front-end MVA","Whiplash — side impact MVA","Hyperflexion (head forced forward)","Hyperextension (head forced back)","Combined flexion + rotation","Direct trauma to head / neck","Diving / swimming impact","Sustained poor posture over time","Sleeping position","Lifting heavy load","Post-surgical","Post-illness / meningism"]},
    {id:"cx_moi_wad",label:"WAD Grade (if whiplash)",type:"select",options:["N/A — not a whiplash","Grade 0 — no pain, no signs","Grade I — pain only","Grade II — pain + musculoskeletal signs","Grade III — neurological signs","Grade IV — fracture or dislocation"]},
    {id:"cx_moi_loc",label:"Loss of consciousness at injury",type:"select",options:["N/A — no trauma","No LOC","Brief LOC <5 min","Prolonged LOC","Amnesia around event","Unsure"]},
    {id:"cx_moi_first",label:"First symptom after injury",type:"select",options:["N/A","Immediate pain","Immediate stiffness","Delayed — hours later","Delayed — next morning","24–48 hours","Progressive over days"]},
    {id:"cx_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  cx_aggravating:{label:"Cervical — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"cx_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Flexion — looking down","Extension — looking up","Rotation left","Rotation right","Side bend left","Side bend right","Combined extension + rotation left (quadrant)","Combined extension + rotation right (quadrant)","Combined flexion + rotation","Sustained end-range any direction","Quick / sudden movements","All movements equally"]},
    {id:"cx_agg_post",label:"Postures aggravate",type:"multicheck",options:["Prolonged sitting >30 min","Prolonged sitting >1 hour","Computer / VDU screen use","Looking down — phone / reading","Looking up — overhead","Head turned (driving / offset monitor)","Slumped posture","Forward head posture","Sleeping — on back","Sleeping — side lying","Sleeping — prone (face down)","Poor pillow support","Sitting in car (vibration + sustained)"]},
    {id:"cx_agg_act",label:"Activities aggravate",type:"multicheck",options:["Driving","Looking over shoulder (reversing)","Reading in bed","Hair washing","Hair drying — arm overhead","Backpack / heavy bag use","Sustained phone call (shoulder-neck grip)","Overhead reaching","Carrying weight same side","Swimming","Desk work — sustained","Fine motor / precision work","Startle / sudden unexpected movement","Cold draught / air conditioning on neck"]},
    {id:"cx_agg_other",label:"Other aggravating factors",type:"multicheck",options:["Coughing / sneezing (dural / cord tension)","Deep breathing","Swallowing (atypical — screen)","Stress / tension","Fatigue / tiredness","Damp / cold weather","Headache trigger","Bright light or noise with headache"]},
    {id:"cx_agg_worst",label:"Single worst aggravator",type:"text",placeholder:"The one thing that makes it worst"},
    {id:"cx_agg_notes",label:"Aggravating Notes",type:"textarea",placeholder:"Specific details, thresholds, conditional aggravators"},
  ]},
  cx_relieving:{label:"Cervical — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"cx_rel_mov",label:"Movements relieve",type:"multicheck",options:["Chin tuck (cranio-cervical flexion)","Cervical retraction","Cervical extension","Cervical flexion","Rotation left","Rotation right","Specific direction (McKenzie preference)","Shoulder blade retraction / squeeze","Shoulder elevation (unloads C4/C5)","Arm overhead — relieves arm symptoms (shoulder abduction relief sign)","Gentle stretching","Hot shower with water on neck"]},
    {id:"cx_rel_post",label:"Postures relieve",type:"multicheck",options:["Lying flat without pillow","Lying with specific cervical pillow","Lying with small towel roll under neck","Side lying","Sitting with lumbar and head support","Standing tall — corrected posture","Walking","Specific sleeping position found"]},
    {id:"cx_rel_manual",label:"Manual / physical treatments",type:"multicheck",options:["Heat application","Ice / cold pack","Hot shower / bath","Massage — self","Massage — by another","Manipulation — immediate relief","Mobilisation","Traction — self applied","TENS machine","Acupuncture / dry needling","Cervical collar — temporary use","Taping","Specific physio exercises"]},
    {id:"cx_rel_med",label:"Medications relieve",type:"multicheck",options:["NSAIDs — effective","Paracetamol — effective","Muscle relaxants — effective","Neuropathic medication — effective","Triptans — effective (migraine pattern)","No medication helps","Not tried medication","Medication helps but side effects"]},
    {id:"cx_rel_best",label:"Single best reliever",type:"text"},
    {id:"cx_rel_notes",label:"Relieving Notes",type:"textarea",placeholder:"Conditional relievers, partial relief, positional preferences"},
  ]},
  cx_symptoms:{label:"Cervical — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"cx_pattern",label:"Overall symptom pattern",type:"multicheck",options:["Constant — never goes away","Constant — varies in intensity","Intermittent — clear triggers","Intermittent — unpredictable","Activity-related only","Position-related only","Morning dominant","Evening dominant","Night dominant","Episodic flare-ups on background constant pain","Warms up — eases with movement","Completely gone between episodes"]},
    {id:"cx_morning",label:"Morning symptoms",type:"multicheck",options:["No morning symptoms","Stiff but eases quickly <30 min","Stiff — takes 30–60 min to ease","Stiff — stays bad all morning (inflammatory flag)","Pain on waking — worst first thing","Morning headache on waking","Sleep position specific","Arm symptoms on waking"]},
    {id:"cx_night",label:"Night symptoms",type:"multicheck",options:["No night symptoms","Difficulty finding comfortable position","Pain on turning over in bed","Wakes once from sleep","Wakes multiple times from sleep","Constant night pain — cannot sleep","Arm / hand symptoms at night","Night headache waking patient"]},
    {id:"cx_24hr",label:"24-hour pattern type",type:"select",options:["Mechanical — worse with load/posture, better with rest","Inflammatory — morning stiffness >30 min, eases with movement","Neuropathic — constant, burning, worse at night","Postural — sustained position dependent","No clear 24hr pattern","Unpredictable"]},
    {id:"cx_trajectory",label:"Symptom trajectory",type:"select",options:["Improving steadily","Improving slowly","Static — no change","Fluctuating — up and down","Slowly worsening","Rapidly worsening (red flag)","Getting worse despite treatment","Changed character recently (red flag)"]},
    {id:"cx_irritability",label:"Irritability (Maitland SIN)",type:"select",options:["Low — hard to provoke, settles quickly","Moderate — provoked with moderate activity, settles reasonably","High — easily provoked, slow to settle (hours)","Very high — minimal provocation, prolonged aggravation (24hrs+)"]},
    {id:"cx_symp_notes",label:"Symptom Behaviour Notes",type:"textarea",placeholder:"Specific patterns, inconsistencies, clinician observations"},
  ]},
  cx_arm:{label:"Cervical — Arm & Hand Symptoms",icon:"💪",color:"#00d4ff",fields:[
    {id:"cx_arm_present",label:"Arm / hand symptoms present?",type:"select",options:["No arm or hand symptoms","Yes — unilateral (L)","Yes — unilateral (R)","Yes — bilateral (concerning for cord)"]},
    {id:"cx_arm_quality",label:"Arm / hand symptom quality",type:"multicheck",options:["Not applicable","Aching","Sharp","Burning","Shooting","Electric shock down arm","Tingling","Pins and needles","Numbness","Weakness","Heaviness","Cold sensation","Hot sensation","Hypersensitivity to touch"]},
    {id:"cx_arm_fingers",label:"Which fingers affected?",type:"multicheck",options:["Not applicable","Thumb (C6)","Index finger (C6)","Middle finger (C7)","Ring finger (C8)","Little finger (C8)","Radial half of hand (C6)","Ulnar half of hand (C8)","Whole hand / glove pattern (non-dermatomal — screen)","Palm only (median nerve — carpal tunnel differential)","Dorsum of hand"]},
    {id:"cx_arm_neuro",label:"Neurological signs reported",type:"multicheck",options:["No neurological symptoms","Objective numbness in specific area","Subjective weakness — grip","Subjective weakness — pinch","Dropping objects involuntarily","Clumsiness with fine motor","Wasting / atrophy visible","Bilateral arms or legs — myelopathy screen"]},
    {id:"cx_arm_position",label:"Arm position affects symptoms",type:"multicheck",options:["Not applicable","Worse with arm overhead","Better with arm overhead (shoulder abduction relief sign — C5/C6)","Worse with arm by side","Better with arm supported","Worse with elbow flexion sustained","Better with elbow flexion","Worse with ULNT positioning","Worse with cervical movement"]},
    {id:"cx_lhermitte",label:"Lhermitte's sign (electric shock down spine with neck flexion)?",type:"select",options:["No","Yes — electric shock down spine with neck flexion (myelopathy / MS flag)","Unsure","Not assessed"]},
    {id:"cx_arm_notes",label:"Arm / Hand Notes",type:"textarea",placeholder:"Specific finger distribution, timing, positional changes"},
  ]},
  cx_headache:{label:"Cervical — Headache",icon:"🤕",color:"#9333ea",fields:[
    {id:"cx_ha_present",label:"Headache as part of presentation?",type:"select",options:["No headache","Yes — primary complaint","Yes — secondary to neck pain","Yes — concurrent but possibly unrelated","Previous headache history — not current"]},
    {id:"cx_ha_location",label:"Headache location",type:"multicheck",options:["Not applicable","Occipital / base of skull (cervicogenic)","Temporal (L)","Temporal (R)","Bilateral temporal","Frontal","Vertex / top of head","Retro-orbital (behind eye)","Hemicranial (L)","Hemicranial (R)","Band-like around head","Generalised diffuse","Face / sinus area"]},
    {id:"cx_ha_quality",label:"Headache quality",type:"multicheck",options:["Not applicable","Dull constant ache","Throbbing / pulsating","Sharp or stabbing","Pressure or tightness","Burning","Tight band sensation","Drilling or boring"]},
    {id:"cx_ha_triggers",label:"Headache triggers",type:"multicheck",options:["Not applicable","Triggered by neck movement (cervicogenic)","Triggered by sustained neck posture","Spontaneous — no neck relation","Worse with stress (tension type)","Worse with light (photophobia)","Worse with noise (phonophobia)","Aura before headache (migraine)","Nausea / vomiting with headache","Wakes from sleep (cluster / intracranial)","Worse with exertion / Valsalva","Preceded by neck stiffness + fever (meningism — urgent)"]},
    {id:"cx_ha_type",label:"Headache classification hypothesis",type:"select",options:["Not yet classified","Cervicogenic — neck movement triggers (C1-C3 origin)","Tension-type — stress / posture related","Migraine — with or without aura","Cluster headache pattern","Post-traumatic headache (post-WAD)","Medication overuse headache","Mixed cervicogenic + migraine","Secondary — red flag features — urgent screen"]},
    {id:"cx_ha_frequency",label:"Headache frequency",type:"select",options:["Not applicable","Less than once a month","1–3 per month","Weekly","Several times per week","Daily","Constant"]},
    {id:"cx_ha_notes",label:"Headache Notes",type:"textarea",placeholder:"Duration per episode, associated symptoms, previous diagnosis, medication use"},
  ]},
  cx_redflags:{label:"Cervical — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"cx_rf_myelopathy",label:"⚠ Myelopathy / UMN Screen",type:"multicheck",options:["No myelopathy signs","Bilateral hand symptoms (grip clumsiness / numbness)","Loss of fine motor control (buttons / writing)","Gait disturbance / wide-based gait / ataxia","Unexplained falls","Bilateral lower limb weakness or stiffness","Hyperreflexia (known)","Babinski positive (known)","Hoffman's sign (known)","Bladder dysfunction — new onset","Bowel dysfunction — new onset","Lhermitte's sign","Rapidly progressive neurological symptoms"]},
    {id:"cx_rf_vbi",label:"⚠ VBI / Vertebrobasilar Screen (5 Ds + 3 Ns)",type:"multicheck",options:["No VBI signs","Dizziness with neck movement — specific","Diplopia (double vision)","Drop attacks","Dysarthria (slurred speech)","Dysphagia (difficulty swallowing)","Ataxia (coordination loss)","Nausea with neck movement","Nystagmus (eye oscillation)","Numbness — face or bilateral limbs","Thunderclap headache — sudden worst ever","Horner's syndrome (drooping eyelid + small pupil)"]},
    {id:"cx_rf_instability",label:"⚠ Craniovertebral Instability Screen",type:"multicheck",options:["No instability signs","Rheumatoid arthritis — known","Down syndrome / trisomy 21","Recent significant trauma","Post-surgical cervical fusion","Sense of head not stable on neck","Constant occipital / suboccipital pain unrelieved","Muscle spasm severe — guarding","Sharp pain on neck flexion"]},
    {id:"cx_rf_other",label:"Other cervical red flags",type:"multicheck",options:["No other red flags","Carotid / vertebral artery dissection symptoms","Thunderclap headache — sudden onset worst ever","Known cervical cancer / tumour","Recent high-energy trauma to neck","Torticollis — acute with fever (retropharyngeal abscess risk)","Constitutional symptoms with neck pain"]},
    {id:"cx_rf_action",label:"Action taken",type:"select",options:["No red flags — proceed with assessment","Red flags noted — monitor and reassess","GP referral — routine","GP referral — urgent","Emergency department referral","Urgent neurology / neurosurgery referral","Manipulation contraindicated — mobilisation only","Manipulation contraindicated — exercise only"]},
    {id:"cx_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  cx_function:{label:"Cervical — Functional Impact",icon:"🚫",color:"#ff8c42",fields:[
    {id:"cx_fn_adl",label:"Activities limited",type:"multicheck",options:["No functional limitation","Driving — head rotation restricted","Looking over shoulder — road safety concern","Computer / screen use","Reading / desk work","Watching TV","Sleeping — position difficulty","Hair washing / drying","Overhead activities","Carrying / lifting","Sport / exercise","Work duties","Childcare","Sexual activity","Concentration / cognitive (headache)","Social activities"]},
    {id:"cx_fn_work",label:"Work impact",type:"select",options:["No work impact","Mild discomfort — full duties","Modified duties","Reduced hours","Off work — short term (<4 weeks)","Off work — medium term (4–12 weeks)","Off work — long term (>12 weeks)","Changed role / job","Job loss occurred"]},
    {id:"cx_fn_psfs",label:"PSFS — Top 3 activities (0–10 each)",type:"textarea",placeholder:"1. [Activity]: ___/10\n2. [Activity]: ___/10\n3. [Activity]: ___/10"},
    {id:"cx_fn_notes",label:"Functional Notes",type:"textarea"},
  ]},
}},

"Lumbar / SI":{prefix:"lx",sections:{
  lx_location:{label:"Lumbar — Location",icon:"📍",color:"#dc2626",fields:[
    {id:"lx_loc",label:"Primary pain location",type:"multicheck",options:["Upper lumbar (L1-L2)","Mid lumbar (L3)","Lower lumbar (L4-L5)","Lumbosacral junction (L5-S1)","Central / midline","Paraspinal right of midline","Paraspinal left of midline","Bilateral / band","Sacrum (central)","SI joint (L)","SI joint (R)","Bilateral SI joints","Coccyx","Buttock (L) — upper","Buttock (L) — lower","Buttock (R) — upper","Buttock (R) — lower","Ischial tuberosity (L)","Ischial tuberosity (R)"]},
    {id:"lx_radiation",label:"Radiation pattern",type:"multicheck",options:["No radiation — local only","Across lower back (belt distribution)","Into groin (L)","Into groin (R)","To buttock (L)","To buttock (R)","To posterior thigh (L)","To posterior thigh (R)","To anterior thigh (L)","To anterior thigh (R)","To lateral thigh","To knee (L)","To knee (R)","To calf (L)","To calf (R)","To lateral lower leg (L5)","To medial lower leg (L4)","To dorsum of foot (L5)","To sole of foot (S1)","To toes (L)","To toes (R)","Bilateral lower limb — concerning"]},
    {id:"lx_dermatomal",label:"Dermatomal distribution",type:"multicheck",options:["Not dermatomal","L1 — groin / upper inner thigh","L2 — anterior thigh","L3 — medial thigh / medial knee","L4 — medial lower leg / big toe","L5 — lateral lower leg / dorsum foot / great toe","S1 — posterior calf / lateral foot / sole","S2 — posterior thigh","S3-4 — saddle (perineum) — cauda equina flag","Bilateral — cauda equina flag"]},
    {id:"lx_below_knee",label:"Does pain extend below the knee?",type:"select",options:["No leg pain — back pain only","Leg pain — thigh only / above knee","Leg pain — below knee (radiculopathy threshold)","Leg pain — extends to foot","Leg pain — bilateral (cauda equina / stenosis flag)"]},
    {id:"lx_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  lx_mechanism:{label:"Lumbar — Mechanism",icon:"⚡",color:"#dc2626",fields:[
    {id:"lx_moi",label:"Mechanism type",type:"multicheck",options:["No clear mechanism — insidious onset","Lifting — spine flexed","Lifting — spine rotated","Lifting — spine flexed AND rotated (most common disc mechanism)","Lifting — from floor (deadlift position)","Twisting without lifting","Bending forward without lifting","Coughing / sneezing — onset","Straining on toilet (Valsalva)","Stumble / trip without full fall","Fall onto back / buttocks","Fall from height","Motor vehicle accident","Sport — specific (notes)","Sustained poor posture over time","Post-surgical","Post-partum","Post-illness","No identified mechanism"]},
    {id:"lx_moi_load",label:"Load estimate at injury",type:"select",options:["N/A — no trauma","Body weight only","Light (<10kg)","Moderate (10–25kg)","Heavy (25–50kg)","Very heavy / awkward (>50kg)","Repetitive load — accumulated","Unknown"]},
    {id:"lx_moi_position",label:"Spine position at injury",type:"multicheck",options:["Not applicable","Flexed forward","Extended backward","Rotated left","Rotated right","Side bent","Flexed + rotated (highest disc risk)","Flexed + side bent","Neutral — unexpected load","Asymmetric / awkward"]},
    {id:"lx_moi_first",label:"First symptom timing",type:"select",options:["Not applicable","Immediate pain at moment of injury","Immediate stiffness","Within first hour","Next morning — woke with it","24–48 hours later","Gradual development over days","Progressive over weeks"]},
    {id:"lx_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  lx_aggravating:{label:"Lumbar — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"lx_agg_post",label:"Postures aggravate",type:"multicheck",options:["Sitting — any duration","Sitting >15 minutes","Sitting >30 minutes","Sitting >1 hour","Soft / unsupported seating","Standing — any duration","Standing >15 minutes","Standing >30 minutes","Lying supine (flat)","Lying prone (face down)","Lying on left side","Lying on right side","Driving (duration — specify in notes)","Reading in bed","Slumped / flexed posture","Forward bent posture (e.g. over sink)","Twisted / asymmetric posture"]},
    {id:"lx_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Forward bending (flexion)","Backward bending (extension)","Side bend left","Side bend right","Rotation left","Rotation right","Combined flexion + rotation left","Combined flexion + rotation right","Combined extension + rotation (quadrant)","Quick / sudden movements","Repetitive bending","End-range any direction","Transitional movements (sit to stand etc)"]},
    {id:"lx_agg_act",label:"Activities aggravate",type:"multicheck",options:["Coughing (discogenic indicator — intradiscal pressure)","Sneezing (discogenic indicator)","Straining — toilet (Valsalva)","Getting up from sitting","Getting in / out of car","Getting out of bed","Turning over in bed","Putting on shoes and socks","Bending to floor","Lifting any weight","Lifting children","Carrying shopping","Pushing / pulling","Vacuuming / mopping","Gardening / weeding","Walking — short distance","Walking — extended duration","Walking downhill (facet loading)","Stairs — going up","Stairs — going down","Running","Sport activities","Sexual intercourse","Standing from toilet","Sitting on hard surface"]},
    {id:"lx_agg_other",label:"Other aggravating factors",type:"multicheck",options:["Cold / damp weather","Barometric pressure change","Stress / emotional state","Fatigue / tiredness","Poor sleep","Menstrual cycle","Pregnancy / post-partum","Recent weight gain","Specific footwear / hard floors","Old / sagging mattress","Morning stiffness first 30 steps","Prolonged walking bilateral leg symptoms (stenosis)"]},
    {id:"lx_agg_worst",label:"Single worst aggravating factor",type:"text"},
    {id:"lx_agg_notes",label:"Aggravating Notes",type:"textarea",placeholder:"Thresholds, conditional aggravators, specific details"},
  ]},
  lx_relieving:{label:"Lumbar — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"lx_rel_post",label:"Postures relieve",type:"multicheck",options:["Lying flat (supine)","Lying with knees bent (crook lying)","Lying with pillow under knees","Lying on side — knees together","Lying on side — pillow between knees","Lying prone (face down)","Prone on elbows (extension load)","Sitting with good lumbar support","Sitting on firm chair","Standing — weight shifted","Walking slowly","Hands and knees (flexion unloading)","Leaning forward on trolley / counter (stenosis pattern)","Sitting with legs elevated"]},
    {id:"lx_rel_mov",label:"Movements relieve",type:"multicheck",options:["Extension — McKenzie press-up / cobra","Flexion — knee to chest","Rotation stretching","Walking","Specific directional preference (centralisation)","Pelvic tilts","Cat-cow / spinal mobility","Self-traction (hanging from bar)","Gentle exercise — general","Swimming","Cycling (if tolerated)","Yoga / pilates","Core stability exercises"]},
    {id:"lx_rel_manual",label:"Manual / physical treatments",type:"multicheck",options:["Heat — hot water bottle","Heat — heat pad","Hot bath / shower","Ice / cold pack","Massage — general","Massage — deep tissue","Spinal manipulation — significant relief","Spinal mobilisation","TENS machine","Acupuncture / dry needling","Lumbar support / brace","Inversion table","Epidural steroid injection (history)","Hydrotherapy / pool therapy","Specific physio exercises"]},
    {id:"lx_rel_med",label:"Medications relieve",type:"multicheck",options:["NSAIDs — very effective (inflammatory indicator)","NSAIDs — moderately effective","Paracetamol — effective","Codeine / weak opioids — effective","Strong opioids — effective","Muscle relaxants — effective","Neuropathic medication — effective (neural indicator)","Cortisone injection — effective","Cortisone injection — short-lived only","No medication helps","Not tried / not prescribed","Medication helps but side effects problematic"]},
    {id:"lx_directional",label:"Directional preference (McKenzie)",type:"select",options:["Not assessed yet","Extension preference — press-up centralises symptoms","Flexion preference — knee-to-chest centralises","Lateral shift correction needed","No clear directional preference","Peripheralises with extension","Peripheralises with flexion","Inconsistent response"]},
    {id:"lx_rel_best",label:"Single best reliever",type:"text"},
    {id:"lx_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  lx_symptoms:{label:"Lumbar — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"lx_pattern",label:"Overall symptom pattern",type:"multicheck",options:["Constant — never goes away","Constant — varies in intensity hour to hour","Intermittent — clear triggers","Intermittent — unpredictable","Only with specific loading","Only at rest / worse at rest","Morning dominant","Evening dominant — worse after day's activities","Night dominant","Activity-proportional (warms up then fades)","Delayed onset — pain next day after activity","Worse second half of night (AS inflammatory pattern)","Unpredictable — no pattern (nociplastic flag)"]},
    {id:"lx_morning",label:"Morning symptoms",type:"select",options:["No morning symptoms","Pain free on waking — comes on with activity","Stiff only — eases within 10 min","Stiff — eases within 30 min","Stiff — takes 30–60 min to ease","Stiff — takes >1 hour to ease (inflammatory flag)","Painful on waking — stays painful all morning","First 30 steps very painful then eases","Worst on waking — most severe time of day"]},
    {id:"lx_night",label:"Night symptoms",type:"multicheck",options:["No night symptoms","Difficulty finding comfortable position","Pain on turning over in bed","Gets up to walk (restlessness / inflammatory)","Wakes once from pain","Wakes 2–3 times from pain","Wakes multiple times — >3","Constant night pain — cannot sleep","Leg pain at night — neural","Bladder waking — note if changed since onset","Severe night sweats accompanying pain (red flag)"]},
    {id:"lx_24hr",label:"24-hour pattern classification",type:"select",options:["Mechanical — worse with load and posture, better with rest","Inflammatory — worse at rest / morning stiffness >30 min / eases with movement","Neuropathic — constant burning / shooting, worse at night","Postural — sustained position dependent only","Neurogenic claudication — walking provokes bilateral leg symptoms relieved by flexion","No clear 24-hour pattern","Unpredictable — no recognisable pattern"]},
    {id:"lx_trajectory",label:"Symptom trajectory",type:"select",options:["Improving steadily","Improving slowly","Plateau — no change","Fluctuating — variable","Slowly worsening","Rapidly worsening","Worsening despite treatment","Changed in character recently (red flag)"]},
    {id:"lx_irritability",label:"Irritability (Maitland SIN)",type:"select",options:["Low — hard to provoke, settles quickly","Moderate — provoked with sustained activity, settles reasonably","High — easily provoked, slow to settle (hours)","Very high — minimal provocation, prolonged aggravation (24hrs+)"]},
    {id:"lx_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  lx_neuro:{label:"Lumbar — Neurological Symptoms",icon:"⚡",color:"#7c3aed",fields:[
    {id:"lx_neuro_present",label:"Leg neurological symptoms?",type:"select",options:["No leg neurological symptoms","Yes — unilateral (L)","Yes — unilateral (R)","Yes — bilateral (cauda equina / stenosis flag)"]},
    {id:"lx_neuro_quality",label:"Leg symptom quality",type:"multicheck",options:["Not applicable","Aching — diffuse","Sharp — specific","Burning — constant","Shooting — intermittent","Electric shock quality","Tingling","Pins and needles","Numbness — objective","Weakness — functional limitation","Heaviness","Cramping","Cold sensation","Hot sensation","Hypersensitivity — light touch painful"]},
    {id:"lx_neuro_signs",label:"Neurological signs reported",type:"multicheck",options:["No neurological signs","Numbness — specific dermatome","Foot drop — difficulty clearing foot","Heel walking difficult (L4/L5)","Toe walking difficult (S1)","Quad weakness — difficulty stairs","Reduced or absent ankle reflex (S1)","Reduced or absent knee reflex (L3/L4)","Saddle area numbness (S3/S4) — cauda equina flag","Bladder difficulty — retention — cauda flag","Bladder incontinence — new onset — cauda flag","Bowel incontinence — new onset — cauda flag","Sexual dysfunction — new onset — cauda flag","Bilateral lower limb involvement"]},
    {id:"lx_claudication",label:"Walking / claudication pattern",type:"select",options:["No claudication pattern","Limited by back pain only","Limited by unilateral leg pain","Limited by bilateral leg pain / heaviness","Relieved by sitting down","Relieved by leaning forward / bending (neurogenic claudication — stenosis)","Can walk further uphill than downhill (neurogenic)","Distance consistent — relieved by rest (vascular pattern)"]},
    {id:"lx_bladder_baseline",label:"Bladder / bowel baseline BEFORE pain started",type:"select",options:["Normal bladder and bowel before pain onset","Pre-existing bladder issues — specify in notes","Pre-existing bowel issues — specify in notes","Not asked — needs clarifying","Uncertain"]},
    {id:"lx_neuro_notes",label:"Neurological Notes",type:"textarea"},
  ]},
  lx_redflags:{label:"Lumbar — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"lx_rf_cauda",label:"⚠ Cauda Equina Screen (urgent)",type:"multicheck",options:["No cauda equina signs","Bilateral leg weakness — new onset","Saddle area anaesthesia — perineum / inner thighs","Bladder retention — cannot urinate","Bladder incontinence — new onset / unexpected","Bowel incontinence — new onset / unexpected","Reduced anal tone (if assessed)","Sexual dysfunction — new onset","Rapidly progressive bilateral neurological deficit","Bilateral sciatica — new onset"]},
    {id:"lx_rf_fracture",label:"Fracture risk indicators",type:"multicheck",options:["No fracture indicators","Major high-energy trauma","Minor trauma + known osteoporosis","Minor trauma + age >70","Long-term corticosteroid use","History of previous vertebral fracture","Point bone tenderness on spinous process","Severe unrelenting pain unaffected by position","Post-menopausal woman + acute onset"]},
    {id:"lx_rf_inflammatory",label:"Inflammatory / spondyloarthropathy indicators (ASAS)",type:"multicheck",options:["No inflammatory features","Age of onset <45","Insidious onset over weeks-months","Morning stiffness >30 minutes","Stiffness improves with movement / exercise","Worse with rest — restlessness at night","Alternating buttock pain (R to L)","Family history of AS / psoriasis / IBD / uveitis","Psoriasis — personal history","IBD (Crohn's / colitis) — personal history","Uveitis / iritis — personal history","Peripheral joint involvement","NSAIDs very effective (ASAS criterion)","HLA-B27 positive (known)","Elevated ESR / CRP (known)"]},
    {id:"lx_rf_serious",label:"Other serious pathology indicators",type:"multicheck",options:["No other red flags","Constant pain — completely unaffected by position or movement","Progressive night pain","Thoracic pain accompanying lumbar pain","Abdominal pain accompanying","Pulsatile abdominal mass (AAA)","Unexplained weight loss","History of cancer — any","IV drug use — risk of discitis","Recent bacterial infection elsewhere","Fever / systemically unwell with back pain","Pain radiating to flank / loin (renal / ureteric)"]},
    {id:"lx_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  lx_yellow:{label:"Lumbar — Yellow Flags",icon:"🟡",color:"#ffb300",fields:[
    {id:"lx_yf_beliefs",label:"Beliefs about low back pain",type:"multicheck",options:["No unhelpful beliefs","Believes pain = damage / structural harm","Believes activity will cause serious harm","Believes rest is the only effective treatment","Believes this is serious / progressive disease","Catastrophising — magnification","Catastrophising — helplessness / hopelessness","Catastrophising — rumination","Negative expectation of recovery","Believes will never return to previous function","Received alarming / nocebo advice from clinician","Conflicting diagnoses received","Expects passive treatment only"]},
    {id:"lx_yf_fear",label:"Fear-avoidance",type:"select",options:["No fear-avoidance behaviour","Mild — some avoidance of certain activities","Moderate — significant avoidance affecting daily function","Severe — markedly restricted / near housebound","Tampa Scale elevated (if scored)","Avoids all exercise due to fear"]},
    {id:"lx_yf_emotion",label:"Emotional / psychological factors",type:"multicheck",options:["No emotional / psychological concerns","Mild low mood","Moderate depression","Severe depression","Mild anxiety","Moderate anxiety","Severe anxiety","Anger — about injury / circumstances","Grief / bereavement concurrent","PTSD — current or history","Excessive health anxiety","Sleep significantly disrupted by psychological factors"]},
    {id:"lx_yf_work",label:"Work / compensation factors",type:"multicheck",options:["No work-related yellow flags","Job dissatisfaction prior to injury","Conflict with employer / manager","Believe job caused or worsened condition","Fear of returning to same job","Expect job loss","Compensation claim active","Personal injury litigation ongoing","Solicitor engaged","Financial stress — significant","Employer pressure to return too early","Employer unsupportive","History of workplace bullying"]},
    {id:"lx_yf_social",label:"Social factors",type:"multicheck",options:["Adequate social support","Social isolation","Family overprotective — reinforcing disability","Family dismissive / unsupportive","Cultural / language barriers to care","No social support network","Relationship strain related to pain"]},
    {id:"lx_yf_startback",label:"STarT Back Screening Tool result",type:"select",options:["Not yet assessed","Low risk (total 0–3)","Medium risk (total ≥4, subscale <4)","High risk (total ≥4, subscale ≥4)","Referred for STarT-matched care"]},
    {id:"lx_yf_notes",label:"Yellow Flag Notes",type:"textarea"},
  ]},
  lx_function:{label:"Lumbar — Functional Impact",icon:"🚫",color:"#ff8c42",fields:[
    {id:"lx_fn_sitting",label:"Sitting tolerance",type:"select",options:["No limitation","Comfortable for >1 hour","Comfortable for 30–60 min","Comfortable for 15–30 min","Comfortable for <15 min","Cannot sit comfortably at all"]},
    {id:"lx_fn_standing",label:"Standing tolerance",type:"select",options:["No limitation","Comfortable for >1 hour","Comfortable for 30–60 min","Comfortable for 15–30 min","Comfortable for <15 min","Cannot stand comfortably"]},
    {id:"lx_fn_walking",label:"Walking tolerance",type:"select",options:["No walking limitation","Walks unlimited distance","Walks >1 km","Walks 500m–1km","Walks 100–500m","Walks <100m","Walks <50m","Household ambulation only","Walking aid required"]},
    {id:"lx_fn_adl",label:"ADL restrictions",type:"multicheck",options:["No ADL restrictions","Putting on shoes and socks","Bending to floor level","Lifting children","Lifting shopping / moderate loads","Vacuuming / mopping / floor cleaning","Bed mobility — turning over","Getting out of bed","Getting in / out of bath","Driving","Sexual activity","Gardening","Housework generally","Childcare / parenting duties"]},
    {id:"lx_fn_work",label:"Work impact",type:"select",options:["No work impact","Mild discomfort — full duties","Modified duties","Reduced hours","Off work — short term (<4 weeks)","Off work — medium term (4–12 weeks)","Off work — long term (>12 weeks)","Unemployed — job loss","Unable to return to previous occupation"]},
    {id:"lx_fn_psfs",label:"PSFS — Top 3 activities (0–10 each)",type:"textarea",placeholder:"1. [Activity]: ___/10\n2. [Activity]: ___/10\n3. [Activity]: ___/10"},
    {id:"lx_fn_notes",label:"Functional Notes",type:"textarea"},
  ]},
}},
"Shoulder (L)":{prefix:"shl",sections:{
  shl_location:{label:"Shoulder L — Location",icon:"📍",color:"#0891b2",fields:[
    {id:"shl_loc",label:"Primary pain location",type:"multicheck",options:["Anterior shoulder","Lateral shoulder (deltoid region)","Posterior shoulder","AC joint (top of shoulder)","Sternoclavicular joint","Coracoid process (anterior)","Bicipital groove (anterior)","Subacromial region","Supraspinatus area","Scapula — medial border","Scapula — inferior angle","Upper arm","Whole shoulder — diffuse"]},
    {id:"shl_radiation",label:"Radiation",type:"multicheck",options:["No radiation","Down to deltoid insertion (typical referred pattern)","Down to elbow","Down to hand (concerning — cervical differential)","Up to neck (cervical origin likely)","To scapula / interscapular","Anterior chest","Bilateral shoulders"]},
    {id:"shl_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  shl_mechanism:{label:"Shoulder L — Mechanism",icon:"⚡",color:"#0891b2",fields:[
    {id:"shl_moi",label:"Mechanism type",type:"multicheck",options:["No clear mechanism — insidious","FOOSH (fall onto outstretched hand)","Fall directly onto shoulder point","Direct blow to shoulder","Throwing / overhead sport injury","Forced abduction + external rotation (dislocation mechanism)","Reaching backward suddenly","Reaching across body forcefully","Lifting heavy load above shoulder","Overhead repetitive overuse","Competitive swimming — stroke / volume","Racquet sport — serving / overhead","Workplace overhead task","Post-surgical","Age-related degenerative"]},
    {id:"shl_moi_pop",label:"Heard / felt pop at injury?",type:"select",options:["No","Yes — clear pop / crack","Yes — felt something give / tear","Yes — felt shoulder come out of joint","Unsure","Not applicable"]},
    {id:"shl_moi_first",label:"Immediate symptoms",type:"multicheck",options:["Not applicable","Immediate severe pain","Inability to lift arm","Visible deformity","Immediate weakness","Felt shoulder dislocate","Bruising within 24 hours","Swelling within 24 hours","Numbness in arm immediately"]},
    {id:"shl_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  shl_aggravating:{label:"Shoulder L — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"shl_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Reaching overhead","Reaching behind back — hand to back pocket","Reaching behind back — bra fastening","Reaching across body (cross-body adduction)","Reaching forward at shoulder height","External rotation — arm by side","Internal rotation — arm behind back","Painful arc — 60 to 120 degrees abduction","Above 120 degrees (AC joint pattern)","End-range all directions","Quick movements","Deceleration of overhead movement (SLAP / labral pattern)"]},
    {id:"shl_agg_act",label:"Activities aggravate",type:"multicheck",options:["Sleeping on affected shoulder","Sleeping on back — arm position","Lifting overhead","Lifting away from body","Pushing — door, trolley","Pulling — drawers, heavy items","Hair washing","Hair drying — arm elevated","Reaching for seatbelt","Reaching into back seat","Carrying shopping — same side","Carrying bag on affected shoulder","Putting on / removing shirt","Tucking shirt in behind","Throwing","Swimming","Racquet sport","Weight training","Computer mouse use","Pouring from kettle","Handshaking"]},
    {id:"shl_agg_sleep",label:"Sleeping position detail",type:"multicheck",options:["No sleeping difficulty","Cannot sleep on affected side","Cannot sleep with arm overhead","Arm must be supported on pillow","Arm must be in specific position","Wakes from sleep due to shoulder pain","Night pain regardless of position"]},
    {id:"shl_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  shl_relieving:{label:"Shoulder L — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"shl_rel_post",label:"Positions relieve",type:"multicheck",options:["Arm in sling / supported","Arm resting on table","Hand in pocket (arm supported)","Arm slightly abducted (pillow under arm)","Arm by side — rested","Lying on unaffected side — pillow between arms","Pillow supporting arm in bed","Specific sleeping position found"]},
    {id:"shl_rel_manual",label:"Treatments relieve",type:"multicheck",options:["Heat","Ice","Massage","Shoulder mobilisation / manipulation","Taping","Sling — temporary","Acupuncture / dry needling","Cortisone injection — effective","Cortisone injection — short-lived","No treatment has helped"]},
    {id:"shl_rel_med",label:"Medications",type:"multicheck",options:["NSAIDs effective","Paracetamol effective","Strong opioids — required","Cortisone injection effective","No meds help","Not tried"]},
    {id:"shl_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  shl_symptoms:{label:"Shoulder L — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"shl_pattern",label:"Pattern",type:"multicheck",options:["Constant","Intermittent — clear triggers","Activity-dependent","Night dominant","Morning stiffness — eases with use","Progressively worsening stiffness (frozen shoulder trajectory)","Warming up — eases then stays manageable","Eases with gentle movement (inflammatory)","Worsens with all use (high irritability)"]},
    {id:"shl_night",label:"Night pain",type:"select",options:["No night pain","Mild — position-dependent only","Moderate — wakes once","Severe — wakes multiple times","Cannot sleep on affected side at all","Constant severe night pain regardless of position"]},
    {id:"shl_stiffness",label:"Stiffness pattern",type:"multicheck",options:["No stiffness","Morning stiffness — eases with use","Progressive stiffness over weeks / months (frozen shoulder trajectory)","Cannot reach behind back — internal rotation loss","Cannot reach overhead — elevation loss","Cannot externally rotate — arm by side (capsular pattern)","Capsular pattern — ER > ABD > IR (frozen shoulder)","All directions equally restricted (advanced OA / frozen)","Stiffness only in specific range"]},
    {id:"shl_instability",label:"Instability / dislocation history",type:"multicheck",options:["No instability history","Single dislocation — required reduction","Recurrent dislocations","Subluxation — incomplete dislocation","Sense of looseness / too much movement","Apprehension with arm overhead / externally rotated","Apprehension anterior direction","Apprehension posterior direction","Multidirectional instability suspected"]},
    {id:"shl_clicking",label:"Mechanical symptoms",type:"multicheck",options:["No mechanical symptoms","Soft click — benign","Clunk — significant (labral / subluxation)","Catching sensation","Grinding / crepitus (OA)","Sensation of impending dislocation","Painful click at specific range","Painless click"]},
    {id:"shl_bilateral",label:"Is other shoulder affected?",type:"select",options:["No — unilateral only","Mild symptoms other shoulder — secondary","Significant bilateral involvement","Other shoulder same problem previously","Symmetrical bilateral (PMR / inflammatory screen)"]},
    {id:"shl_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"shl_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  shl_clinical:{label:"Shoulder L — Clinical Pattern",icon:"🎯",color:"#7c3aed",fields:[
    {id:"shl_arc",label:"Painful arc",type:"select",options:["No painful arc","60–120° abduction (subacromial / impingement pattern)","Above 120° (AC joint pattern)","Throughout full range (OA / significant pathology)","Only at beginning of movement","Only at end of range"]},
    {id:"shl_weakness",label:"Weakness pattern",type:"multicheck",options:["No weakness","Weakness elevation — cannot lift arm","Weakness external rotation","Weakness internal rotation","Drop arm — cannot hold arm up against gravity (full-thickness RCT)","Dropping objects involuntarily","Difficulty lifting from low position","Sudden give with loading","Atrophy visible — supraspinatus / infraspinatus"]},
    {id:"shl_clinical_notes",label:"Clinical Pattern Notes",type:"textarea"},
  ]},
  shl_redflags:{label:"Shoulder L — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"shl_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Suspected fracture — proximal humerus / clavicle","Suspected unreduced dislocation","Drop arm — acute full-thickness tear","Constant progressive pain — unrelated to movement","Pain at rest and night — progressive (malignancy flag)","Mass / lump — palpable","Skin changes — erythema / warmth (septic joint)","Vascular compromise — arm cool / pale / pulseless","Brachial plexus injury symptoms","Cancer history — bone metastases risk"]},
    {id:"shl_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  shl_function:{label:"Shoulder L — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"shl_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Dressing — putting on shirt","Dressing — bra fastening","Hair care — overhead","Reaching high shelves","Sleeping comfort","Driving — seatbelt / steering","Computer use — sustained","Lifting / carrying","Sport — specify","Childcare / lifting children","Work duties","Sexual activity"]},
    {id:"shl_fn_work",label:"Work impact",type:"select",options:["No impact","Modified duties","Reduced hours","Off work short term","Off work long term"]},
    {id:"shl_fn_outcome",label:"Shoulder outcome measure",type:"select",options:["Not completed","DASH / QuickDASH","SPADI","Oxford Shoulder Score","Constant-Murley Score","ASES score","WOSI (instability)"]},
    {id:"shl_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"shl_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Shoulder (R)":{prefix:"shr",sections:{
  shr_location:{label:"Shoulder R — Location",icon:"📍",color:"#06b6d4",fields:[
    {id:"shr_loc",label:"Primary pain location",type:"multicheck",options:["Anterior shoulder","Lateral shoulder (deltoid region)","Posterior shoulder","AC joint (top of shoulder)","Sternoclavicular joint","Coracoid process (anterior)","Bicipital groove (anterior)","Subacromial region","Supraspinatus area","Scapula — medial border","Scapula — inferior angle","Upper arm","Whole shoulder — diffuse"]},
    {id:"shr_radiation",label:"Radiation",type:"multicheck",options:["No radiation","Down to deltoid insertion","Down to elbow","Down to hand (concerning)","Up to neck","To scapula","Anterior chest","Bilateral shoulders"]},
    {id:"shr_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  shr_mechanism:{label:"Shoulder R — Mechanism",icon:"⚡",color:"#06b6d4",fields:[
    {id:"shr_moi",label:"Mechanism type",type:"multicheck",options:["No clear mechanism — insidious","FOOSH","Fall directly onto shoulder point","Direct blow","Throwing / overhead sport","Forced abduction + external rotation (dislocation)","Reaching backward suddenly","Lifting heavy load above shoulder","Overhead repetitive overuse","Post-surgical","Age-related degenerative"]},
    {id:"shr_moi_pop",label:"Heard / felt pop?",type:"select",options:["No","Yes — clear pop / crack","Yes — felt something tear","Yes — felt shoulder dislocate","Unsure","N/A"]},
    {id:"shr_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  shr_aggravating:{label:"Shoulder R — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"shr_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Reaching overhead","Reaching behind back","Reaching behind back — bra fastening","Reaching across body","External rotation","Internal rotation","Painful arc 60–120°","Above 120° (AC joint)","End-range all directions","Deceleration of overhead movement (SLAP / labral)"]},
    {id:"shr_agg_act",label:"Activities aggravate",type:"multicheck",options:["Sleeping on affected shoulder","Lifting overhead","Hair washing / drying","Reaching for seatbelt","Reaching into back seat","Putting on / removing shirt","Tucking shirt in behind","Throwing","Swimming","Racquet sport","Weight training","Carrying","Pouring from kettle"]},
    {id:"shr_agg_sleep",label:"Sleeping position",type:"multicheck",options:["No sleeping difficulty","Cannot sleep on affected side","Arm must be supported","Wakes from sleep due to pain","Night pain regardless of position"]},
    {id:"shr_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  shr_relieving:{label:"Shoulder R — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"shr_rel_post",label:"Positions relieve",type:"multicheck",options:["Arm in sling","Arm on table","Hand in pocket","Arm slightly abducted","Pillow supporting arm","Lying on unaffected side"]},
    {id:"shr_rel_manual",label:"Treatments relieve",type:"multicheck",options:["Heat","Ice","Massage","Mobilisation / manipulation","Taping","Cortisone injection helped","Acupuncture","No treatment helped"]},
    {id:"shr_rel_med",label:"Medications",type:"multicheck",options:["NSAIDs effective","Paracetamol effective","No meds help","Not tried"]},
    {id:"shr_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  shr_symptoms:{label:"Shoulder R — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"shr_pattern",label:"Pattern",type:"multicheck",options:["Constant","Intermittent — clear triggers","Activity-dependent","Night dominant","Morning stiffness — eases with use","Progressive stiffness (frozen shoulder trajectory)","Warms up with movement","Worsens with all use"]},
    {id:"shr_night",label:"Night pain",type:"select",options:["No night pain","Mild — position only","Moderate — wakes once","Severe — wakes multiple times","Cannot sleep on affected side","Constant night pain"]},
    {id:"shr_stiffness",label:"Stiffness pattern",type:"multicheck",options:["No stiffness","Morning stiffness","Progressive stiffness over months (frozen shoulder)","Cannot reach behind back","Cannot reach overhead","Cannot externally rotate (capsular pattern)","All directions restricted"]},
    {id:"shr_arc",label:"Painful arc",type:"select",options:["No painful arc","60–120° abduction (subacromial)","Above 120° (AC joint)","Throughout range (significant pathology)"]},
    {id:"shr_instability",label:"Instability history",type:"multicheck",options:["No instability","Single dislocation","Recurrent dislocations","Subluxation","Sense of looseness","Apprehension overhead / externally rotated"]},
    {id:"shr_bilateral",label:"Other shoulder affected?",type:"select",options:["No — unilateral only","Mild symptoms other shoulder","Significant bilateral involvement","Symmetrical bilateral (PMR / inflammatory screen)"]},
    {id:"shr_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"shr_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  shr_redflags:{label:"Shoulder R — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"shr_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Suspected fracture","Suspected dislocation — unreduced","Drop arm — acute","Constant progressive pain unrelated to movement","Mass palpable","Skin erythema / warmth (septic joint)","Vascular compromise","Cancer history — bone mets risk"]},
    {id:"shr_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  shr_function:{label:"Shoulder R — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"shr_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Dressing","Bra fastening","Hair care","Reaching overhead","Sleeping","Driving","Carrying","Sport","Work duties","Childcare"]},
    {id:"shr_fn_outcome",label:"Outcome measure",type:"select",options:["Not completed","DASH / QuickDASH","SPADI","Oxford Shoulder Score","Constant-Murley"]},
    {id:"shr_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"shr_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Knee (L)":{prefix:"knl",sections:{
  knl_location:{label:"Knee L — Location",icon:"📍",color:"#f59e0b",fields:[
    {id:"knl_loc",label:"Primary pain location",type:"multicheck",options:["Anterior knee — diffuse","Patella — peripatellar","Patellar tendon — inferior pole","Quadriceps tendon — superior pole","Medial joint line — meniscal / MCL","Lateral joint line — meniscal / LCL","Medial collateral region","Lateral collateral region","Posterior knee — popliteal fossa","Posterior knee — Baker's cyst","Pes anserine — medial tibial flare","ITB attachment — lateral tibial flare","Tibial tuberosity — Osgood-Schlatter","Fibular head","Whole knee — diffuse"]},
    {id:"knl_radiation",label:"Pain radiation",type:"multicheck",options:["No radiation — local only","Down lateral lower leg (ITB / LCL)","Down medial lower leg","Up anterior thigh","To hip (referred — L3)","Around whole knee","Referred from lumbar spine (L3)","Referred from hip"]},
    {id:"knl_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  knl_mechanism:{label:"Knee L — Mechanism",icon:"⚡",color:"#f59e0b",fields:[
    {id:"knl_moi",label:"Mechanism type",type:"multicheck",options:["No clear mechanism — insidious / overuse","Twisting injury — non-contact (ACL pattern)","Twisting injury — contact / tackle","Hyperextension mechanism","Hyperflexion — full squat / kneeling fall","Direct blow medial (valgus stress — MCL)","Direct blow lateral (varus stress — LCL)","Direct blow anterior patella","Fall onto knee directly","Fall with foot planted","Pivoting / cutting / direction change","Jumping — landing injury","Jumping — take-off injury","Running — gradual overuse","Cycling — overuse","Post-surgical"]},
    {id:"knl_pop",label:"Heard / felt pop at injury?",type:"select",options:["No","Yes — clear pop (ACL flag)","Yes — felt tear or give","Multiple pops","Unsure","Not applicable"]},
    {id:"knl_swelling",label:"Swelling onset after injury",type:"select",options:["No swelling","Immediate within 2 hours (haemarthrosis — ACL / fracture flag)","4–12 hours post-injury","24 hours post-injury","2–3 days post-injury (reactive synovitis)","Gradual over weeks","Recurrent effusion pattern","Cyclical — related to activity level"]},
    {id:"knl_weightbear",label:"Could bear weight immediately?",type:"select",options:["Not applicable","Yes — full weight bearing immediately","Yes — but with limp","Partial — one leg","No — required assistance","Continued playing then seized up later"]},
    {id:"knl_prev_surgery",label:"Previous knee surgery",type:"multicheck",options:["No previous knee surgery","ACL reconstruction — same knee","ACL reconstruction — other knee","Meniscectomy — partial","Meniscectomy — total","Meniscal repair","Articular cartilage procedure","Patellofemoral procedure","Total / partial knee replacement","Other — specify in notes"]},
    {id:"knl_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  knl_aggravating:{label:"Knee L — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"knl_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Squatting — any depth","Deep squatting full flexion","Kneeling on affected knee","Full flexion — end range","Hyperextension","Pivoting on planted foot","Cutting — direction change","Stairs — going up","Stairs — going down (patellofemoral / meniscal)","Hills — going up","Hills — going down (patellofemoral)","Stepping off curb","Single leg squat"]},
    {id:"knl_agg_act",label:"Activities aggravate",type:"multicheck",options:["Sitting prolonged >30 min — movie sign (PFPS)","Sitting prolonged >1 hour","Getting up from low chair","Getting up from floor","Driving — sustained knee flexion","Cycling","Running — flat","Running — downhill","Running on uneven ground","Jumping — take-off","Landing — from jump","Twisting / pivoting sport","Prolonged walking","Standing","Morning — first steps stiff"]},
    {id:"knl_agg_other",label:"Other factors",type:"multicheck",options:["After prolonged rest — start-up pain","Cold weather — stiffness","Old / worn footwear","Hard surfaces","Specific surfaces (uneven)","Foot pronation — feels related"]},
    {id:"knl_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  knl_relieving:{label:"Knee L — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"knl_rel_post",label:"Positions relieve",type:"multicheck",options:["Rest — leg straight","Rest — knee slightly flexed","Leg elevated","Specific sleeping position","Compression bandage / brace","Lying on unaffected side","Avoiding weight bearing"]},
    {id:"knl_rel_manual",label:"Treatments relieve",type:"multicheck",options:["Ice — significant relief","Heat","Compression","Elevation","Knee brace / support","Patellar taping (McConnell)","Cortisone injection — effective","Hyaluronic acid injection","PRP injection","Aspiration of effusion","Manual therapy","Specific exercises","Hydrotherapy"]},
    {id:"knl_rel_med",label:"Medications",type:"multicheck",options:["NSAIDs — effective","Paracetamol — effective","Strong opioids — required","No meds effective","Not tried"]},
    {id:"knl_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  knl_symptoms:{label:"Knee L — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"knl_pattern",label:"Pattern",type:"multicheck",options:["Constant","Intermittent — clear triggers","Activity-dependent only","Morning stiffness — start-up pain","Warms up — eases after 10–15 min then manageable","During activity — worsens progressively","After activity — delayed onset","Post-activity delayed 24 hours","Getting worse over time","Cyclical — related to activity load"]},
    {id:"knl_swelling_pattern",label:"Current swelling pattern",type:"select",options:["No swelling currently","Mild — only after significant activity","Moderate — after normal activity","Persistent low-grade effusion","Significant effusion — limits motion","Recurrent — repeated episodes","Cyclical — related to menstrual cycle"]},
    {id:"knl_giving_way",label:"Giving way episodes",type:"multicheck",options:["No giving way","With direction change / pivot (ACL pattern)","On stairs — going down (patellofemoral)","On uneven ground","With no warning — sudden collapse","With pain only — pain inhibition","Without pain — true instability","Frequency — rare (monthly)","Frequency — weekly","Frequency — daily","Avoided activity because of giving way"]},
    {id:"knl_locking",label:"Locking pattern",type:"multicheck",options:["No locking","True locking — cannot fully extend after certain movements","Pseudo-locking — pain prevents movement but no mechanical block","Locking in flexion","Spontaneous unlocking with manipulation","Frequency — rare","Frequency — frequent"]},
    {id:"knl_movie",label:"Movie sign (prolonged knee flexion pain)?",type:"select",options:["No","Yes — typical PFPS pattern (cinema / driving / desk)","Sometimes","Not assessed"]},
    {id:"knl_descent",label:"Stair descent vs ascent",type:"select",options:["No stair difficulty","Worse going DOWN than up (PFPS / meniscal)","Worse going UP than down (quad / patella tendon)","Equally painful both directions","Handrail required both directions"]},
    {id:"knl_clicking",label:"Mechanical symptoms",type:"multicheck",options:["No mechanical symptoms","Soft click — painless / benign","Click with pain at specific range","Catching sensation","True locking — cannot extend","Grinding / crepitus — coarse (OA)","Clunk — significant (meniscal / plica)","Swells predictably with activity","Sensation of something loose in joint"]},
    {id:"knl_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"knl_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  knl_redflags:{label:"Knee L — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"knl_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Unable to bear weight for 4 steps (Ottawa — x-ray)","Bony tenderness fibular head (Ottawa)","Bony tenderness patella (Ottawa)","Immediate haemarthrosis — large tense effusion","Irreducible locked knee — cannot extend at all","Acute hot, red, severely tender joint (septic arthritis — urgent)","Vascular compromise — cool / pale / pulseless","Compartment syndrome features — acute","Mass / lump — palpable","Constant night pain — progressive","Cancer history — bone metastasis risk"]},
    {id:"knl_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  knl_sport:{label:"Knee L — Sport & Load",icon:"🏃",color:"#a8ff3e",fields:[
    {id:"knl_sport_level",label:"Sport relevant?",type:"select",options:["No sport involvement","Yes — recreational","Yes — competitive amateur","Yes — elite / professional"]},
    {id:"knl_sport_type",label:"Primary sport / activity",type:"multicheck",options:["Running — road","Running — trail","Running — track","Football / soccer","Rugby","Basketball","Netball","Hockey","Tennis","CrossFit","Weightlifting","Cycling","Skiing / snowboarding","Martial arts","Dance","Gymnastics","Other"]},
    {id:"knl_training_load",label:"Recent training load changes",type:"multicheck",options:["No recent changes","Increased volume recently","Increased intensity recently","New sport or activity","Returning after injury / break","Pre-season training","In-season competition","Marathon / endurance training","Surface change","Footwear change recently"]},
    {id:"knl_sport_notes",label:"Sport Notes",type:"textarea"},
  ]},
  knl_function:{label:"Knee L — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"knl_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Stairs — going up","Stairs — going down","Squatting","Kneeling","Running","Sport","Walking distance","Standing from low chair","Getting up from floor","Driving","Sitting at desk","Childcare","Work tasks"]},
    {id:"knl_fn_outcome",label:"Knee outcome measure",type:"select",options:["Not completed","KOOS","Lysholm score","Tegner activity level","Kujala score (PFPS)","IKDC","Oxford Knee Score","WOMAC"]},
    {id:"knl_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"knl_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Knee (R)":{prefix:"knr",sections:{
  knr_location:{label:"Knee R — Location",icon:"📍",color:"#eab308",fields:[
    {id:"knr_loc",label:"Primary pain location",type:"multicheck",options:["Anterior knee — diffuse","Patella — peripatellar","Patellar tendon — inferior pole","Quadriceps tendon — superior pole","Medial joint line","Lateral joint line","Posterior knee — popliteal fossa","Posterior knee — Baker's cyst","Pes anserine","ITB attachment — lateral","Tibial tuberosity","Whole knee — diffuse"]},
    {id:"knr_radiation",label:"Radiation",type:"multicheck",options:["No radiation","Down lateral lower leg","Down medial lower leg","Up thigh","From lumbar spine (L3)","From hip"]},
    {id:"knr_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  knr_mechanism:{label:"Knee R — Mechanism",icon:"⚡",color:"#eab308",fields:[
    {id:"knr_moi",label:"Mechanism type",type:"multicheck",options:["No clear mechanism — insidious","Twisting — non-contact (ACL)","Twisting — contact","Hyperextension","Direct blow medial / lateral","Fall onto knee","Pivoting / cutting","Jumping / landing","Overuse — running / sport","Post-surgical"]},
    {id:"knr_pop",label:"Heard / felt pop?",type:"select",options:["No","Yes — clear pop (ACL flag)","Yes — felt tear","Unsure","N/A"]},
    {id:"knr_swelling",label:"Swelling onset",type:"select",options:["No swelling","Immediate <2hrs (haemarthrosis flag)","4–12 hours","24 hours","2–3 days","Gradual / chronic","Recurrent"]},
    {id:"knr_prev_surgery",label:"Previous knee surgery",type:"multicheck",options:["No previous knee surgery","ACL reconstruction — same knee","ACL reconstruction — other knee","Meniscectomy — partial","Meniscectomy — total","Meniscal repair","Articular cartilage procedure","Total / partial knee replacement","Other — specify in notes"]},
    {id:"knr_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  knr_aggravating:{label:"Knee R — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"knr_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Squatting","Kneeling","Full flexion","Hyperextension","Pivoting","Stairs — up","Stairs — down","Hills up / down","Single leg stance"]},
    {id:"knr_agg_act",label:"Activities aggravate",type:"multicheck",options:["Sitting prolonged — movie sign","Getting up from chair / floor","Running","Running downhill","Jumping / landing","Sport","Cycling","Prolonged walking","Morning stiffness first steps"]},
    {id:"knr_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  knr_relieving:{label:"Knee R — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"knr_rel",label:"What helps?",type:"multicheck",options:["Rest","Ice","Compression","Elevation","Brace / support","Taping","Cortisone injection helped","NSAIDs effective","Specific exercises","Manual therapy"]},
    {id:"knr_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  knr_symptoms:{label:"Knee R — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"knr_pattern",label:"Pattern",type:"multicheck",options:["Constant","Intermittent","Activity-dependent","Morning stiff — start-up pain","Warms up then manageable","During activity worsens progressively","Post-activity delayed","Progressive worsening"]},
    {id:"knr_swelling_patt",label:"Swelling pattern",type:"select",options:["None","Mild after activity","Moderate after normal activity","Persistent low-grade","Recurrent effusion"]},
    {id:"knr_giving_way",label:"Giving way",type:"multicheck",options:["No giving way","With pivoting (ACL)","On stairs (patellofemoral)","On uneven ground","Without pain (true instability)","With pain only (inhibition)"]},
    {id:"knr_locking",label:"Locking",type:"multicheck",options:["No locking","True locking — cannot extend","Pseudo-locking — pain limits","Catching and releasing"]},
    {id:"knr_movie",label:"Movie sign?",type:"select",options:["No","Yes — PFPS pattern","Sometimes"]},
    {id:"knr_clicking",label:"Mechanical symptoms",type:"multicheck",options:["None","Soft click — benign","Painful click","Catching","Grinding / crepitus","Clunk"]},
    {id:"knr_descent",label:"Stair descent vs ascent",type:"select",options:["No stair difficulty","Worse going DOWN (PFPS / meniscal)","Worse going UP (quad / patella tendon)","Equally painful","Handrail required"]},
    {id:"knr_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"knr_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  knr_redflags:{label:"Knee R — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"knr_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Ottawa Rules positive — x-ray","Immediate haemarthrosis","Irreducible locking","Acute hot swollen joint (septic arthritis)","Vascular compromise","Compartment syndrome","Mass palpable","Night pain progressive","Cancer history"]},
    {id:"knr_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  knr_function:{label:"Knee R — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"knr_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Stairs","Squatting","Kneeling","Running","Sport","Walking","Getting up from chair","Driving","Work tasks"]},
    {id:"knr_fn_outcome",label:"Outcome measure",type:"select",options:["Not completed","KOOS","Lysholm","Kujala (PFPS)","Oxford Knee Score"]},
    {id:"knr_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"knr_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Hip / Groin":{prefix:"hp",sections:{
  hp_location:{label:"Hip — Location",icon:"📍",color:"#d946ef",fields:[
    {id:"hp_loc",label:"Primary pain location",type:"multicheck",options:["Groin — anterior","Anterior hip / hip flexor region","Lateral hip — greater trochanter","Posterior hip — deep gluteal","Buttock — upper","Buttock — lower","Ischial tuberosity (sit bone)","Adductor / inner thigh","Pubic symphysis / pubic bone","SI joint — unilateral","SI joint — bilateral","Groin and inner thigh combined","Whole hip / diffuse"]},
    {id:"hp_c_sign",label:"C-sign (patient cups anterolateral hip with hand)?",type:"select",options:["Not assessed","Yes — typical intra-articular pattern","No","Inconclusive"]},
    {id:"hp_loc_pattern",label:"Dominant location pattern",type:"select",options:["Groin-dominant — likely intra-articular (FAI / OA / labral)","Lateral hip — likely trochanteric / abductor tendinopathy","Posterior / buttock — likely SIJ / deep gluteal / referred lumbar","Ischial tuberosity — likely proximal hamstring tendinopathy","Adductor — likely adductor strain / tendinopathy","Pubic symphysis — athletic pubalgia / osteitis pubis","Diffuse / multiple — multiple pathologies or referred"]},
    {id:"hp_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  hp_mechanism:{label:"Hip — Mechanism",icon:"⚡",color:"#d946ef",fields:[
    {id:"hp_moi",label:"Mechanism type",type:"multicheck",options:["Insidious onset — gradual","Twisting / pivoting injury","Fall — directly onto hip","Fall — from standing","High-speed sport — sprint / tackle","Kicking mechanism — adductor strain","Lunging mechanism — groin strain","Overuse — repetitive running / sport","Return to sport after break / pregnancy","Post-partum — pubic symphysis / pelvic floor","Post hip replacement — same side","Post hip replacement — other side","Occupational overuse","Age-related degenerative — no specific event"]},
    {id:"hp_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  hp_aggravating:{label:"Hip — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"hp_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Hip flexion — knee to chest","Hip extension — backward kick / lunge","Hip abduction — leg out","Hip adduction — crossing legs","Internal rotation — toe-in","External rotation — toe-out","FADIR combined (flexion + adduction + IR) — FAI pattern","FABER combined (flexion + abduction + ER) — SIJ / labral","Resisted hip flexion — hip flexor","Resisted adduction — groin muscles","Resisted extension — hamstring proximal","End-range any direction","Trunk flexion (hip flexor / psoas)"]},
    {id:"hp_agg_act",label:"Activities aggravate",type:"multicheck",options:["Walking — short distance","Walking — extended","Stairs — going up","Stairs — going down","Running","Sprinting / acceleration","Kicking","Pivoting / cutting","Squatting","Sitting — low chairs","Sitting — prolonged (>30 min)","Sitting on hard surface (ischial — hamstring proximal)","Sitting cross-legged","Getting in / out of car","Getting in / out of bath","Putting on shoes / socks","Crossing legs","Lying on affected side","Lying on unaffected side","Breaststroke swimming","Sexual intercourse"]},
    {id:"hp_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  hp_relieving:{label:"Hip — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"hp_rel_post",label:"Positions relieve",type:"multicheck",options:["Lying flat — hip neutral","Hip slightly flexed and externally rotated","Side lying — unaffected side","Pillow between knees (SIJ / hip neutral)","Sitting with hip at 90° neutral","Walking aid — reduces load","Avoiding weight bearing"]},
    {id:"hp_rel_manual",label:"Treatments relieve",type:"multicheck",options:["Heat","Ice","Massage","Hip joint mobilisation","Manual therapy","Cortisone injection — effective","Cortisone injection — short-lived","Hyaluronic acid injection","Specific exercises","Walking aid"]},
    {id:"hp_rel_med",label:"Medications",type:"multicheck",options:["NSAIDs — effective","Paracetamol — effective","No meds help","Not tried"]},
    {id:"hp_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  hp_symptoms:{label:"Hip — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"hp_pattern",label:"Pattern",type:"multicheck",options:["Constant","Intermittent — clear triggers","Activity-dependent","Morning stiffness — eases with movement","Night pain — lying on hip","Position-dependent","Progressive worsening over months / years","Episodic flare-ups"]},
    {id:"hp_mechanical",label:"Mechanical symptoms",type:"multicheck",options:["No mechanical symptoms","Clicking — soft / benign","Clicking — with pain (labral)","Internal snapping — coxa saltans interna (iliopsoas)","External snapping — coxa saltans externa (ITB over trochanter)","Catching sensation","Giving way — hip feels unreliable","Locking — intermittent","Crepitus / grinding (OA)"]},
    {id:"hp_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"hp_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  hp_redflags:{label:"Hip — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"hp_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Suspected fracture — elderly / osteoporosis + fall","Suspected neck of femur fracture — cannot weight bear","Acute hot swollen hip joint — septic arthritis urgent","Avascular necrosis risk — steroids / alcohol / sickle cell","Constant progressive pain — unrelated to loading","Referred pain from abdomen — hernia / psoas abscess / appendix","Gynaecological referral possible — pelvic / groin pain in female","Testicular / scrotal referred pain in male","Cancer history — bone metastases risk","Constitutional symptoms with hip pain"]},
    {id:"hp_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  hp_function:{label:"Hip — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"hp_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Walking distance","Stairs","Running / sport","Getting in / out of car","Sitting tolerance","Getting up from floor","Putting on shoes / socks","Sexual activity","Work duties","Childcare / lifting children","Swimming"]},
    {id:"hp_fn_walking",label:"Walking tolerance",type:"select",options:["No limitation","Walks >1 km","500m–1km","100–500m","<100m","Walking aid required","Unable to walk without assistance"]},
    {id:"hp_fn_outcome",label:"Outcome measure",type:"select",options:["Not completed","Oxford Hip Score","HOOS","HOS-ADL","Harris Hip Score","iHOT-33 (sport / young adult)","HAGOS (groin)"]},
    {id:"hp_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"hp_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Ankle / Foot":{prefix:"af",sections:{
  af_location:{label:"Ankle — Location",icon:"📍",color:"#16a34a",fields:[
    {id:"af_loc",label:"Primary pain location",type:"multicheck",options:["Lateral ankle — ATFL / CFL region","Lateral ankle — sinus tarsi","Medial ankle — deltoid ligament","Medial ankle — tibialis posterior tendon","Anterior ankle — joint line","Posterior ankle — FHL / posterior impingement","Achilles tendon — insertional (at heel)","Achilles tendon — mid-portion (2–7cm above insertion)","Retrocalcaneal — behind heel / deep to tendon","Calcaneus — plantar surface (heel pad)","Plantar fascia — medial heel / origin","Plantar fascia — mid-portion","Forefoot — 1st MTP (big toe)","Forefoot — metatarsal shafts","Forefoot — 3rd / 4th interspace (Morton's neuroma)","Midfoot — navicular / cuboid","Tibialis anterior — shin / dorsum","Peroneal tendons — lateral malleolus","Calf / Achilles complex","Shin — tibial (stress reaction)","Whole foot / diffuse"]},
    {id:"af_radiation",label:"Radiation",type:"multicheck",options:["No radiation","Up calf","Into toes — specific (specify in notes)","Burning between 3rd / 4th toes (Morton's neuroma pattern)","Referred from lumbar spine (L5/S1)","Referred from tarsal tunnel (tibial nerve — medial ankle)"]},
    {id:"af_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  af_mechanism:{label:"Ankle — Mechanism",icon:"⚡",color:"#16a34a",fields:[
    {id:"af_moi",label:"Mechanism type",type:"multicheck",options:["Insidious onset — overuse / gradual","Inversion sprain — foot rolled in","Eversion sprain — foot rolled out","High ankle sprain — external rotation mechanism","Direct impact / crush","Fall from height","Sudden push-off / sprint start","Landing from jump","Stepping on uneven ground","Running — gradual volume overuse","Sudden increase in training load","Return to sport after break","Change in footwear recently","Change in running surface","Post-surgical","Post-plaster cast removal"]},
    {id:"af_moi_pop",label:"Heard / felt pop or snap?",type:"select",options:["No","Yes — at lateral ankle (ATFL ligament)","Yes — felt at Achilles insertion (rupture flag)","Yes — felt at mid-Achilles (rupture flag)","Yes — at medial ankle","Multiple pops","Unsure","N/A"]},
    {id:"af_moi_weightbear",label:"Could weight bear immediately?",type:"select",options:["Yes — full weight bearing","Partial — with limp","No — required assistance / hopped","Stopped activity immediately","Continued then could not weight bear later"]},
    {id:"af_prev_sprains",label:"Previous ankle sprains",type:"select",options:["No previous sprains — first time","1 previous sprain — same ankle","2–3 previous sprains — same ankle","4+ previous sprains — chronic instability","Multiple sprains — bilateral"]},
    {id:"af_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  af_aggravating:{label:"Ankle — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"af_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Dorsiflexion (foot up)","Plantarflexion (foot down / pointed)","Inversion (foot in)","Eversion (foot out)","Pronation (arch collapse)","Supination (arch raised)","Toe extension — big toe (plantar fascia)","Heel raise — single leg","Heel raise — double leg","End-range any direction"]},
    {id:"af_agg_act",label:"Activities aggravate",type:"multicheck",options:["First steps in the morning — plantar fascia pattern","First steps after rest — start-up stiffness","Walking — flat ground","Walking — uphill","Walking — downhill (Achilles eccentric load)","Running — flat","Running — downhill (Achilles)","Running — hills","Stairs — up","Stairs — down","Jumping — take-off","Landing — from jump","Pivoting / cutting","Standing prolonged","Standing on hard surfaces","Barefoot walking","Barefoot on tiles / hard floors in morning","High heels","Flat shoes / ballet flats","Specific trainers","Tight shoes — narrow toe box (Morton's neuroma)","Swimming — push-off from wall"]},
    {id:"af_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  af_relieving:{label:"Ankle — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"af_rel_manual",label:"Treatments relieve",type:"multicheck",options:["Rest — off feet","Ice — significant relief","Compression bandage","Elevation","Strapping / taping — rigid","Strapping / taping — elastic","Orthotics / insoles","Specific footwear (supportive)","Heel raise insert (Achilles)","Night splint (plantar fascia)","Walking boot","Crutches","Massage — calf / foot","Stretching — plantar fascia","Stretching — calf / Achilles","Manual therapy","Acupuncture / dry needling","Cortisone injection — effective","Shockwave therapy — effective"]},
    {id:"af_rel_mov",label:"Movements relieve",type:"multicheck",options:["Plantarflexion rest position (Achilles)","Dorsiflexion rest position","Calf stretching — relieves","Plantar fascia stretch — relieves","Gentle walking — warms up and eases","Complete rest — best","Elevation relieves"]},
    {id:"af_rel_med",label:"Medications",type:"multicheck",options:["NSAIDs — effective","Paracetamol — effective","No meds help","Not tried"]},
    {id:"af_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  af_symptoms:{label:"Ankle — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"af_pattern",label:"Pattern",type:"multicheck",options:["Activity-dependent only","Morning dominant — plantar fascia / insertional Achilles pattern","Morning dominant — eases after 10 min walking","After-rest stiffness — eases with movement","Warms up — eases after 5–10 min then manageable (mid-portion Achilles tendinopathy)","Warms up then worsens with sustained activity","Worsens progressively with activity","Post-activity delayed — next morning","Constant — never fully eases","Night dominant","Burning / night — tarsal tunnel / neuropathic"]},
    {id:"af_morning",label:"Morning pattern detail",type:"select",options:["No morning symptoms","First step severely painful — then eases (plantar fascia classic)","First step painful — stays painful all morning","Stiff but not painful","Morning stiffness >30 min (inflammatory)","Achilles stiff and sore on rising","Variable — depends on previous day's activity"]},
    {id:"af_swelling",label:"Swelling pattern",type:"select",options:["No swelling","Mild — after activity only","Moderate — after normal activity","Persistent low-grade swelling","Significant effusion","Recurrent swelling episodes","End of day swelling"]},
    {id:"af_instability",label:"Instability",type:"multicheck",options:["No instability","Sense of ankle giving way","Giving way on uneven ground","Giving way on stairs","Avoids uneven surfaces","Fear of re-rolling","Multiple ankle braces used","Proprioception / balance difficulty reported"]},
    {id:"af_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"af_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  af_redflags:{label:"Ankle — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"af_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Ottawa Rules — bony tenderness posterior lateral malleolus","Ottawa Rules — bony tenderness posterior medial malleolus","Ottawa Rules — cannot weight bear 4 steps","Ottawa Rules — bony tenderness navicular","Ottawa Rules — bony tenderness 5th metatarsal base","Suspected Achilles rupture — Thompson test needed urgently","Suspected complete ATFL / ligament rupture","Acute hot swollen joint — septic arthritis screen","Compartment syndrome features — acute","Vascular compromise — cool / pallor / pulseless","Stress fracture suspected — tibial / metatarsal","Peroneal tendon subluxation suspected"]},
    {id:"af_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  af_function:{label:"Ankle — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"af_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Walking — flat","Walking — hills","Running","Sport","Stairs","Uneven ground","Standing prolonged","Specific footwear limited","Driving","Work tasks","Dance / gymnastics"]},
    {id:"af_fn_footwear",label:"Footwear assessment",type:"multicheck",options:["Wears supportive trainers","Wears flat shoes / ballet flats","Wears high heels regularly","Goes barefoot regularly","Old / worn footwear","New footwear recently","Orthotics — current user","Custom orthotics","Over-the-counter insoles","Work boots / safety footwear"]},
    {id:"af_fn_outcome",label:"Outcome measure",type:"select",options:["Not completed","FAOS (Foot & Ankle Outcome Score)","FAAM","VISA-A (Achilles)","Cumberland Ankle Instability Tool","Manchester-Oxford Foot Questionnaire"]},
    {id:"af_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"af_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Elbow/Wrist/Hand":{prefix:"ew",sections:{
  ew_location:{label:"Elbow/Wrist — Location",icon:"📍",color:"#059669",fields:[
    {id:"ew_loc",label:"Primary pain location",type:"multicheck",options:["Lateral elbow — lateral epicondyle / extensor origin","Medial elbow — medial epicondyle / flexor origin","Posterior elbow — olecranon / triceps insertion","Anterior elbow — cubital fossa","Radial head — lateral","Forearm — extensor surface","Forearm — flexor surface","Wrist — dorsal","Wrist — volar (palmar)","Wrist — radial border / anatomical snuffbox","Wrist — ulnar border","Thumb CMC joint (base of thumb)","Thumb MCP","Fingers — specify in notes","Palm — thenar eminence (thumb base)","Palm — hypothenar eminence (little finger)","Dorsum of hand","Multiple fingers / whole hand"]},
    {id:"ew_radiation",label:"Radiation / distribution",type:"multicheck",options:["Localised — no radiation","Down forearm into hand","Down to specific finger(s) — specify in notes","Median nerve distribution — thumb / index / middle / radial half of ring","Ulnar nerve distribution — little / ulnar half of ring","Radial nerve distribution — dorsum of hand / first webspace","From neck — cervical referred","From elbow — into forearm and hand"]},
    {id:"ew_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  ew_mechanism:{label:"Elbow/Wrist — Mechanism",icon:"⚡",color:"#059669",fields:[
    {id:"ew_moi",label:"Mechanism type",type:"multicheck",options:["Insidious — overuse / gradual","FOOSH — fall onto outstretched hand","FOOSH — wrist dorsiflexion impact (scaphoid / distal radius)","Direct trauma — elbow","Direct trauma — wrist / hand","Twisting injury — forearm","Repetitive gripping / wringing overuse","Computer / keyboard / mouse overuse","Tool use — vibration exposure","Sport — racquet (lateral elbow — tennis elbow)","Sport — golf swing (medial elbow — golfer's elbow)","Sport — throwing mechanism","Occupational repetitive strain","New baby / childcare — de Quervain's pattern","Post-surgical","Post-plaster cast removal"]},
    {id:"ew_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  ew_aggravating:{label:"Elbow/Wrist — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"ew_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Gripping — any intensity","Gripping — only heavy","Pinching — pincer grip","Key grip — lateral pinch","Power grip — full hand","Wrist extension (resisted)","Wrist flexion (resisted)","Forearm pronation","Forearm supination","Elbow flexion — sustained","Elbow extension","Thumb extension / abduction (de Quervain's)","Thumb opposition","Individual finger movement","End-range wrist any direction","Wrist compression / loading"]},
    {id:"ew_agg_act",label:"Activities aggravate",type:"multicheck",options:["Computer mouse use","Keyboard / typing","Lifting kettle with wrist extended","Opening jars","Turning door handle / key","Carrying shopping bags","Wringing washing / towels","Tool use — hammer / screwdriver","Tennis — backhand stroke (lateral)","Golf — grip at impact (medial)","Throwing sport","Writing with pen","Phone use — sustained grip","Texting — repetitive","Buttons / fastening clothing","Squeezing objects","Shaking hands","New parent — lifting baby (de Quervain's)","Knitting / crochet / sewing"]},
    {id:"ew_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  ew_relieving:{label:"Elbow/Wrist — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"ew_rel",label:"What helps?",type:"multicheck",options:["Rest — avoiding grip","Heat","Ice","Counterforce brace — elbow clasp","Wrist splint in neutral","Thumb spica splint (de Quervain's)","Compression glove","Manual therapy","Massage","Acupuncture / dry needling","Taping","NSAIDs effective","Cortisone injection — effective","PRP injection","Eccentric exercises","Specific physio exercises","Modifying grip technique / equipment"]},
    {id:"ew_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  ew_symptoms:{label:"Elbow/Wrist — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"ew_pattern",label:"Pattern",type:"multicheck",options:["Activity-dependent — load proportional","Morning stiffness — eases with use","Warms up — eases after use","Worsens with sustained use","Night dominant — wakes patient (CTS pattern)","Post-activity delayed onset","Constant — sensitisation / neuropathic","After specific activities only"]},
    {id:"ew_neuro",label:"Neurological / tingling symptoms",type:"multicheck",options:["No neurological symptoms","Median nerve — thumb / index / middle waking at night (CTS classic)","Median nerve — improves with shaking hand (flick test)","Ulnar nerve — little and ring finger","Ulnar nerve — worse with elbow flexion (cubital tunnel)","Radial nerve — dorsum hand / wrist drop","C6 dermatomal — from neck","C7 dermatomal — from neck","C8 dermatomal — from neck","Whole hand numbness — glove (non-dermatomal)","Trigger finger — click / lock with flexion","De Quervain's — thumb base pain / Finkelstein positive"]},
    {id:"ew_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"ew_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  ew_redflags:{label:"Elbow/Wrist — Red Flags",icon:"🚨",color:"#dc2626",fields:[
    {id:"ew_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Suspected distal radius fracture (Colles / Barton)","Suspected scaphoid — anatomical snuffbox tenderness (x-ray may be false negative)","Suspected lunate / perilunate dislocation","Acute compartment syndrome — forearm / hand (urgent)","Rupture extensor / flexor tendons","Acute septic arthritis — wrist / small joint","Dupuytren's contracture — ring finger flexion contracture","Ganglion cyst — dorsal wrist lump","Trigger finger — catching / locking digit","Bilateral carpal tunnel — screen for systemic cause","Reflex sympathetic dystrophy / CRPS features","Raynaud's phenomenon — colour changes with cold"]},
    {id:"ew_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  ew_function:{label:"Elbow/Wrist — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"ew_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Computer / keyboard use","Writing","Cooking — gripping utensils","Opening containers / jars","Buttons / fastening","Carrying shopping","Childcare — lifting / bathing baby","Sport","Driving — steering","Work tasks — specify","Phone use","Personal hygiene"]},
    {id:"ew_fn_outcome",label:"Outcome measure",type:"select",options:["Not completed","DASH","Quick-DASH","PRWE (Patient Rated Wrist Evaluation)","Boston CTS questionnaire","PRTEE (tennis elbow)"]},
    {id:"ew_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"ew_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},

"Thoracic spine":{prefix:"tx",sections:{
  tx_location:{label:"Thoracic — Location",icon:"📍",color:"#d97706",fields:[
    {id:"tx_loc",label:"Primary pain location",type:"multicheck",options:["Upper thoracic T1–T4","Mid thoracic T5–T8","Lower thoracic T9–T12","Cervico-thoracic junction C7–T2","Thoracolumbar junction T12–L1","Interscapular — central","Interscapular — left","Interscapular — right","Costovertebral — lateral","Lateral chest wall","Anterior chest wall","Sternal / midline anterior","Around chest — dermatomal band","Bilateral paraspinal"]},
    {id:"tx_radiation",label:"Radiation",type:"multicheck",options:["No radiation — local","Around chest wall — dermatomal","To shoulder blade — interscapular referred","To anterior chest — cardiac / visceral differential","To abdomen — visceral differential","To groin / hip — lower thoracic referred","Bilateral chest / girdle","Cardiac-like radiation — left chest / arm (urgent flag)"]},
    {id:"tx_loc_notes",label:"Location Notes",type:"textarea"},
  ]},
  tx_mechanism:{label:"Thoracic — Mechanism",icon:"⚡",color:"#d97706",fields:[
    {id:"tx_moi",label:"Mechanism type",type:"multicheck",options:["Insidious — postural / sustained","Lifting injury","Rotation injury","Fall / direct trauma","MVA — thoracic component","Prolonged computer / desk posture","Post-surgical","Post-partum — breastfeeding posture","Osteoporotic fracture — minimal trauma","Viral illness — post-viral costochondritis","No clear mechanism"]},
    {id:"tx_moi_notes",label:"Mechanism Notes",type:"textarea"},
  ]},
  tx_aggravating:{label:"Thoracic — Aggravating",icon:"🔺",color:"#ff4d6d",fields:[
    {id:"tx_agg_mov",label:"Movements aggravate",type:"multicheck",options:["Rotation (most thoracic sensitive to)","Side bending","Extension","Flexion","Combined movements","Deep breathing in","Deep breathing out","Coughing","Sneezing","Laughing","Sustained end-range posture","Quick / sudden movements","Lifting","Reaching overhead"]},
    {id:"tx_agg_post",label:"Postures aggravate",type:"multicheck",options:["Prolonged sitting","Computer work sustained","Driving","Lying supine (flat)","Lying prone","Sleeping on affected side","Backpack use","After eating (lower thoracic — visceral?)","Cold exposure"]},
    {id:"tx_agg_notes",label:"Aggravating Notes",type:"textarea"},
  ]},
  tx_relieving:{label:"Thoracic — Relieving",icon:"🔻",color:"#22c55e",fields:[
    {id:"tx_rel",label:"What helps?",type:"multicheck",options:["Heat","Ice","Manipulation — significant relief","Mobilisation","Stretching","Breathing exercises","Postural correction","Taping","NSAIDs effective","Paracetamol effective","Muscle relaxants","No treatment helps"]},
    {id:"tx_rel_notes",label:"Relieving Notes",type:"textarea"},
  ]},
  tx_symptoms:{label:"Thoracic — Symptom Behaviour",icon:"📈",color:"#7f5af0",fields:[
    {id:"tx_pattern",label:"Pattern",type:"multicheck",options:["Mechanical — movement and posture related","Constant — unrelated to movement (red flag)","Breathing-related — with respiration","Activity-dependent","Night dominant","Morning stiffness","Inflammatory — morning stiffness / eases with movement"]},
    {id:"tx_irritability",label:"Irritability",type:"select",options:["Low","Moderate","High","Very high"]},
    {id:"tx_symp_notes",label:"Symptom Notes",type:"textarea"},
  ]},
  tx_redflags:{label:"Thoracic — Red Flags (HIGH PRIORITY)",icon:"🚨",color:"#dc2626",
    description:"Thoracic pain has significantly higher rate of serious pathology — screen thoroughly",
    fields:[
    {id:"tx_rf",label:"Red flag screen",type:"multicheck",options:["No red flags","Constant pain completely unaffected by position or movement","Night pain — awakens patient — progressive","Progressive worsening despite conservative treatment","Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw","Cardiac history — pain reproduces cardiac pattern","Respiratory symptoms — shortness of breath / haemoptysis","Abdominal symptoms — pain with eating / weight loss","Cancer history — any — thoracic metastases risk","Unexplained weight loss + thoracic pain","Fever + thoracic pain (discitis / osteomyelitis)","Recent trauma — fracture risk","Known osteoporosis — pathological fracture risk","Neurological symptoms in legs — cord compression","Bilateral leg weakness or sensory change (cord level)","Age >50 — first episode without cause","Systemically unwell — malaise + thoracic pain"]},
    {id:"tx_rf_notes",label:"Red Flag Notes",type:"textarea"},
  ]},
  tx_function:{label:"Thoracic — Function",icon:"🚫",color:"#ff8c42",fields:[
    {id:"tx_fn",label:"Limited activities",type:"multicheck",options:["No limitations","Deep breathing","Coughing / sneezing","Sitting tolerance","Driving","Computer work","Sport","Lifting","Sleeping","Work tasks"]},
    {id:"tx_fn_psfs",label:"PSFS — Top 3 (0–10)",type:"textarea"},
    {id:"tx_fn_notes",label:"Function Notes",type:"textarea"},
  ]},
}},
}; // end REGION_MODULES
// ══════════════════════════════════════════════════════════════════════
// CONDITIONAL SECTIONS
// ══════════════════════════════════════════════════════════════════════
const BPS_S={
  bps:{label:"Biopsychosocial Assessment",icon:"🧠",color:"#90caf9",
    description:"Auto-loaded: chronic (>3 months), NRS≥7, off work, or recurring",
    fields:[
    {id:"bps_mood",label:"Mood / affect",type:"multicheck",options:["Normal mood — no concerns","Mild low mood — manageable","Moderate depression — affecting function","Severe depression — significant impairment","Mild anxiety","Moderate anxiety — affecting function","Severe anxiety / panic attacks","Anger — about injury or circumstances","Grief / bereavement — concurrent","PTSD — current or past history","Hopelessness about recovery","Feels dismissed by healthcare system","Emotional distress — prominent feature"]},
    {id:"bps_fear",label:"Fear-avoidance",type:"multicheck",options:["No fear-avoidance behaviour","Mild avoidance — selective activities","Moderate avoidance — significant restriction","Severe avoidance — near housebound","Kinesiophobia — fear all movement will cause harm","Catastrophising — magnification","Catastrophising — helplessness","Catastrophising — rumination","Cannot stop thinking about pain","Avoids all exercise due to fear"]},
    {id:"bps_beliefs",label:"Illness beliefs",type:"multicheck",options:["Helpful / adaptive beliefs","Believes pain = ongoing damage","Believes spine / joint is fragile or unstable","Believes activity will cause serious harm or re-injury","Believes rest is the only effective treatment","Believes this is a serious / progressive disease","Negative recovery expectation","Expects permanent restriction or disability","Received nocebo (harmful) advice from previous clinician","Conflicting diagnoses — confused about condition","Passive recovery expectation only","Pain should be zero before activity starts"]},
    {id:"bps_coping",label:"Coping strategies",type:"multicheck",options:["Active coping — exercise / activity pacing","Positive self-talk","Mindfulness / meditation","Seeking social support","Psychological / counselling","Passive coping — rest and waiting","Avoidance and withdrawal","Over-reliance on passive treatments","Alcohol use — coping strategy","Withdrawal from social life","No coping strategies identified"]},
    {id:"bps_work_facs",label:"Work / compensation factors",type:"multicheck",options:["No work-related concerns","Job dissatisfaction prior to injury","Conflict with employer or management","Believes workplace caused or worsened injury","Fear of returning to same role","Expects or has experienced job loss","Workers compensation claim active","Personal injury litigation ongoing","Solicitor engaged","Financial stress — significant impact","Employer pressure to return too early","Employer unsupportive / dismissive"]},
    {id:"bps_social",label:"Social support",type:"select",options:["Strong support — family / friends understanding","Adequate support","Limited support — isolated at times","Social isolation — minimal support","Relationship strain due to pain","Family overprotective — reinforcing disability","Family dismissive or unsupportive","Lives alone — no immediate support","Cultural or language barriers to care"]},
    {id:"bps_selfeff",label:"Self-efficacy",type:"select",options:["High — confident can manage pain","Moderate — believes can improve with help","Low — doubts ability to manage or improve","Very low — complete helplessness","Fluctuating — variable confidence"]},
    {id:"bps_outcome",label:"Psychosocial outcome measures",type:"multicheck",options:["None yet","STarT Back Screening Tool","Tampa Scale of Kinesiophobia (TSK-11)","Pain Catastrophising Scale (PCS-13)","PHQ-9 (depression)","GAD-7 (anxiety)","Hospital Anxiety and Depression Scale (HADS)","Örebro Musculoskeletal Pain Questionnaire","Central Sensitisation Inventory (CSI)","PSFS completed"]},
    {id:"bps_notes",label:"Biopsychosocial Notes",type:"textarea",placeholder:"Clinician observations: language used, affect, behaviour during consultation, inconsistencies, notable concerns"},
  ]},
};

const SLEEP_S={
  sleep:{label:"Sleep Assessment",icon:"😴",color:"#3b82f6",
    description:"Auto-loaded when night pain reported or poor sleep mentioned",
    fields:[
    {id:"sl_hours",label:"Sleep duration per night",type:"select",options:["<4 hours (severe deprivation)","4–5 hours","5–6 hours","6–7 hours","7–8 hours (optimal)","8–9 hours","9+ hours","Variable — inconsistent"]},
    {id:"sl_quality",label:"Sleep quality",type:"select",options:["Excellent — always refreshed","Good — usually refreshed","Fair — sometimes refreshed","Poor — rarely refreshed","Very poor — never refreshed","Variable — depends on pain"]},
    {id:"sl_pain_impact",label:"Pain impact on sleep",type:"multicheck",options:["No pain impact on sleep","Pain delays falling asleep","Pain wakes once per night","Pain wakes 2–3 times per night","Pain wakes multiple times (>3)","Cannot find comfortable position","Constant night pain — minimal sleep","Fear of sleeping — anticipatory anxiety","Morning pain — worst on waking","Arm / leg symptoms at night disturb sleep"]},
    {id:"sl_apnoea",label:"Sleep disordered breathing",type:"select",options:["No issues","Snoring — reported by partner","Sleep apnoea — suspected","Sleep apnoea — diagnosed — on CPAP","Sleep apnoea — diagnosed — not treated","Restless legs syndrome","Other sleep disorder"]},
    {id:"sl_hygiene",label:"Sleep hygiene factors",type:"multicheck",options:["Good sleep routine","Irregular sleep schedule","Screen use in bed","Caffeine in evenings","Anxiety / rumination at bedtime","Shift work — disrupted circadian rhythm","Napping frequently during day","Physically inactive — no exercise","Partner disturbs sleep"]},
    {id:"sl_notes",label:"Sleep Notes",type:"textarea"},
  ]},
};

const SPORT_S={
  sport:{label:"Sport & Training History",icon:"🏃",color:"#a8ff3e",fields:[
    {id:"sp_level",label:"Current activity level",type:"select",options:["Sedentary","Light — walking only","Moderate — 2–3x per week","Active — 4–5x per week","Very active — daily","Elite amateur / competitive","Semi-professional","Professional / paid"]},
    {id:"sp_sport",label:"Primary sport(s) / activity",type:"text",placeholder:"e.g. road running, football, CrossFit"},
    {id:"sp_position",label:"Sport position / role (if relevant)",type:"text",placeholder:"e.g. pitcher, goalkeeper, swimmer — freestyle"},
    {id:"sp_training_vol",label:"Current training volume",type:"text",placeholder:"e.g. 50km/week running, 5 sessions/week"},
    {id:"sp_load_change",label:"Recent training load changes",type:"multicheck",options:["No recent changes","Increased volume recently (>10% per week)","Increased intensity recently","New sport or activity","Returning after injury break","Returning after illness","Returning after extended holiday","Pre-season training ramp","In-season competition phase","Post-season — deload","Footwear change recently","Surface change (road to trail etc)","Equipment change","New training programme / coach"]},
    {id:"sp_prev_injuries",label:"Significant previous injuries",type:"multicheck",options:["No significant previous injuries","Same site — previous episode","ACL reconstruction — same side","ACL reconstruction — other side","Ankle sprain history — same side","Shoulder dislocation history","Hamstring strain history","Stress fracture history","Meniscal surgery history","Hip labral repair","Other — specify in notes"]},
    {id:"sp_goal",label:"Return to sport goal",type:"text",placeholder:"Specific goal and realistic timeline"},
    {id:"sp_competition",label:"Competition / event goal",type:"text",placeholder:"e.g. marathon in 12 weeks, season starts in 4 weeks"},
    {id:"sp_notes",label:"Sport Notes",type:"textarea"},
  ]},
};

// ══════════════════════════════════════════════════════════════════════
// CONDITIONAL LOAD TRIGGERS
// ══════════════════════════════════════════════════════════════════════
const needsBPS_S=(d)=>
  /3–6 months|6–12 months|1–2 years|> 2 years|Recurring/.test(d.cc_duration||"")||
  parseFloat(d.cc_vas_worst)>=7||
  /Off work/.test(d.dem_work_status||"");

const REG_KEY_MAP={
  "Cervical (L)":"Cervical spine","Cervical (R)":"Cervical spine",
  "Thoracic (L)":"Thoracic spine","Thoracic (R)":"Thoracic spine",
  "Lumbar/SI (L)":"Lumbar / SI","Lumbar/SI (R)":"Lumbar / SI",
  "Elbow (L)":"Elbow/Wrist/Hand","Elbow (R)":"Elbow/Wrist/Hand",
  "Wrist/Hand (L)":"Elbow/Wrist/Hand","Wrist/Hand (R)":"Elbow/Wrist/Hand",
  "Hip/Groin (L)":"Hip / Groin","Hip/Groin (R)":"Hip / Groin",
  "Ankle/Foot (L)":"Ankle / Foot","Ankle/Foot (R)":"Ankle / Foot",
};
const resolveRegMod=(r)=>REG_MOD_S[REG_KEY_MAP[r]||r];

const needsSleep_S=(d,regions)=>{
  const poorSleep=/poor|very poor/.test((Array.isArray(d.ls_sleep_quality)?d.ls_sleep_quality.join(', '):(d.ls_sleep_quality||"")).toLowerCase());
  const nightPain=regions.some(r=>{
    const px=resolveRegMod(r)?.prefix;
    if(!px) return false;
    const n=(Array.isArray(d[`${px}_night`])?d[`${px}_night`].join(", "):(d[`${px}_night`]||"")).toLowerCase();
    const p=(Array.isArray(d[`${px}_pattern`])?d[`${px}_pattern`].join(", "):(d[`${px}_pattern`]||"")).toLowerCase();
    return /wakes|cannot sleep|night pain|constant night/.test(n)||/night dominant/.test(p);
  });
  return poorSleep||nightPain;
};

const needsSport_S=(d,regions)=>{
  const onset=(Array.isArray(d.cc_onset)?d.cc_onset.join(" "):(d.cc_onset||"")).toLowerCase();
  const isSport=onset.includes("sport");
  const sportRegs=["Knee (L)","Knee (R)","Ankle/Foot (L)","Ankle/Foot (R)","Ankle / Foot","Hip/Groin (L)","Hip/Groin (R)","Hip / Groin","Shoulder (L)","Shoulder (R)","Lumbar/SI (L)","Lumbar/SI (R)","Lumbar / SI"];
  return isSport||sportRegs.some(r=>regions.includes(r));
};

// ══════════════════════════════════════════════════════════════════════
// CLINICAL ENGINE v5 — Multi-region, cross-region reasoning
// ══════════════════════════════════════════════════════════════════════

const needsHypermobility_S=(d)=>{
  const hm=String(Array.isArray(d.hm_screen)?d.hm_screen.join(", "):(d.hm_screen||"")).toLowerCase();
  return /multiple joint|beighton|loose.*since childhood|recurrent disloc/.test(hm);
};
// ══════════════════════════════════════════════════════════════════════
// MISSING CONDITIONS ADDITIONS
// Appended to existing modules via REGION_MODULES extension
// ══════════════════════════════════════════════════════════════════════

// Extend Ankle / Foot module with calf strain, shin splints, Lisfranc
Object.assign(REG_MOD_S["Ankle / Foot"].sections, {
  af_muscle_tendon:{label:"Ankle — Muscle / Tendon Injury",icon:"💪",color:"#16a34a",fields:[
    {id:"af_calf_onset",label:"Calf / Achilles onset pattern",type:"multicheck",
      options:["Not applicable","Sudden onset during sprint / push-off — calf strain","Sudden onset jumping — plantaris rupture","Felt like shot in back of leg (Achilles rupture)","Gradual onset with running overload","Pop at mid-calf with immediate weakness","Bruising appeared within 24 hours — muscle tear","Visible defect in calf muscle belly","Cannot rise on tiptoe — Achilles rupture screen"]},
    {id:"af_calf_location",label:"Calf pain location",type:"multicheck",
      options:["Not applicable","Medial gastrocnemius (tennis leg)","Lateral gastrocnemius","Soleus — deep calf","Achilles mid-portion","Achilles insertion","Posterior knee / popliteal — Baker's cyst / popliteus","Whole calf diffuse"]},
    {id:"af_shin_pain",label:"Shin pain pattern",type:"multicheck",
      options:["No shin pain","Medial tibial shin pain — running overload (MTSS)","Diffuse tibial pain — stress reaction","Focal point tenderness over tibia — stress fracture screen","Pain during running only","Pain after running — delayed onset","Pain at rest + activity — stress fracture concern","Anterior shin / compartment — exertional compartment syndrome"]},
    {id:"af_lisfranc",label:"Midfoot / Lisfranc screen",type:"multicheck",
      options:["Not applicable","Midfoot pain after twisting / crush","Cannot weight bear on toes","Bruising on plantar / sole of foot (Lisfranc flag)","Swelling across midfoot","High-energy mechanism — Lisfranc screen","Piano key test pain (2nd metatarsal base)"]},
    {id:"af_peroneal",label:"Peroneal tendon symptoms",type:"multicheck",
      options:["Not applicable","Lateral ankle / behind fibula pain","Clicking / snapping behind lateral malleolus (subluxation)","Felt tendon flick out of groove","Eversion weakness","Pain with resisted eversion","Chronic lateral ankle instability pattern"]},
    {id:"af_muscle_notes",label:"Muscle / Tendon Notes",type:"textarea"},
  ]},
});

// Extend Hip / Groin with hamstring strain, piriformis, meralgia
Object.assign(REG_MOD_S["Hip / Groin"].sections, {
  hp_muscle_nerve:{label:"Hip — Muscle Strain & Nerve",icon:"💪",color:"#d946ef",fields:[
    {id:"hp_hamstring_onset",label:"Hamstring strain pattern",type:"multicheck",
      options:["Not applicable","Sudden onset sprinting — hamstring strain","Sudden onset lunging / overstretching","Felt pop or tear in posterior thigh","Immediate sharp pain — stopped activity","Bruising appeared posterior thigh","Cannot fully extend knee without pain","Sitting on ischial tuberosity painful (proximal)","Mid-belly tenderness on palpation","Distal hamstring / popliteal area"]},
    {id:"hp_quad_onset",label:"Quadriceps strain pattern",type:"multicheck",
      options:["Not applicable","Sudden onset kicking mechanism","Direct blow to anterior thigh (cork / charley horse)","Knee flexion now restricted — myositis ossificans risk","Anterior thigh tightness / pulling","Cannot fully flex knee without pain","Weakness kicking / stairs"]},
    {id:"hp_piriformis",label:"Piriformis / Deep gluteal syndrome",type:"multicheck",
      options:["Not applicable","Deep buttock pain — not SIJ","Pain with prolonged sitting on hard surface","Pain with hip internal rotation","Sciatica-like radiation without lumbar cause","Worse crossing legs / sitting cross-legged","Sitting causes buttock + leg symptoms","Tenderness deep to gluteus maximus","Improved briefly with piriformis stretch"]},
    {id:"hp_meralgia",label:"Meralgia Paraesthetica (lateral femoral cutaneous nerve)",type:"multicheck",
      options:["Not applicable","Lateral thigh burning / tingling / numbness","No back pain to explain lateral thigh symptoms","Worse standing / walking extended","Better sitting","Worse with tight clothing / belt","After weight gain or pregnancy","After prolonged hip flexion (cycling / surgery position)","Sensory only — no motor weakness"]},
    {id:"hp_muscle_notes",label:"Muscle / Nerve Notes",type:"textarea"},
  ]},
});

// Extend Knee with PCL, posterolateral corner, prepatellar bursitis
Object.assign(REG_MOD_S["Knee (L)"].sections, {
  knl_ligament_bursa:{label:"Knee L — Ligament & Bursa",icon:"🦴",color:"#f59e0b",fields:[
    {id:"knl_pcl",label:"PCL injury screen",type:"multicheck",
      options:["Not applicable","Dashboard mechanism — knee forced back in flexion","Direct blow to anterior tibia","Fall onto flexed knee","Posterior knee pain / fullness","Sensation of knee giving backward","Posterior drawer positive (known)","Able to weight bear but unstable"]},
    {id:"knl_plc",label:"Posterolateral corner screen",type:"multicheck",
      options:["Not applicable","Varus stress mechanism","Hyperextension + varus","Lateral knee / fibular head pain","Varus thrust during gait (leg bowing out)","Combined instability — multiple directions","Often combined with ACL or PCL injury"]},
    {id:"knl_bursa",label:"Bursitis pattern",type:"multicheck",
      options:["Not applicable","Prepatellar — swelling directly over kneecap (housemaid's knee)","Infrapatellar — below kneecap","Pes anserine — medial below joint line","Occupational — prolonged kneeling","Hot red swollen bursa — septic bursitis screen","Fluctuant soft swelling — non-inflammatory bursa"]},
    {id:"knl_lig_notes",label:"Ligament / Bursa Notes",type:"textarea"},
  ]},
});

Object.assign(REG_MOD_S["Knee (R)"].sections, {
  knr_ligament_bursa:{label:"Knee R — Ligament & Bursa",icon:"🦴",color:"#eab308",fields:[
    {id:"knr_pcl",label:"PCL injury screen",type:"multicheck",
      options:["Not applicable","Dashboard mechanism — knee forced back in flexion","Direct blow to anterior tibia","Fall onto flexed knee","Posterior knee pain / fullness","Posterior drawer positive (known)","Able to weight bear but unstable"]},
    {id:"knr_bursa",label:"Bursitis pattern",type:"multicheck",
      options:["Not applicable","Prepatellar — swelling over kneecap (housemaid's knee)","Infrapatellar — below kneecap","Pes anserine — medial below joint line","Occupational — prolonged kneeling","Hot red swollen — septic bursitis screen","Fluctuant soft swelling — non-inflammatory"]},
    {id:"knr_lig_notes",label:"Ligament / Bursa Notes",type:"textarea"},
  ]},
});

// Extend Lumbar with spondylolysis / spondylolisthesis
Object.assign(REG_MOD_S["Lumbar / SI"].sections, {
  lx_spondylo:{label:"Lumbar — Spondylolysis / Listhesis Screen",icon:"🔍",color:"#dc2626",
    description:"Young athlete extension pain — screen before loading",
    fields:[
    {id:"lx_spondylo_screen",label:"Spondylolysis / Spondylolisthesis indicators",type:"multicheck",
      options:["Not applicable","Young athlete (10–25 years) with low back pain","Extension pain — worse arching backward","Unilateral lower lumbar pain — pars stress","Sport with repeated extension loading (gymnastics / cricket fast bowling / swimming butterfly / weightlifting)","Single leg extension test reproduces pain (Stork test)","No radiculopathy","Bilateral L5 pars fracture — spondylolysis","Forward slip of vertebra on x-ray — spondylolisthesis","Hamstring tightness prominent feature","Pain after growth spurt"]},
    {id:"lx_spondylo_notes",label:"Spondylolysis Notes",type:"textarea"},
  ]},
});

// Extend Elbow/Wrist/Hand with UCL, TFCC, olecranon bursitis, biceps rupture
Object.assign(REG_MOD_S["Elbow/Wrist/Hand"].sections, {
  ew_extra_conditions:{label:"Elbow/Wrist — Additional Conditions",icon:"🔍",color:"#059669",fields:[
    {id:"ew_ucl",label:"UCL elbow (Thrower's elbow / Medial instability)",type:"multicheck",
      options:["Not applicable","Overhead throwing athlete","Medial elbow pain at late cocking / acceleration","Valgus stress mechanism","Felt pop at medial elbow","Loss of throwing velocity","Valgus instability on stress testing (known)","Young overhead athlete — consider apophysitis"]},
    {id:"ew_tfcc",label:"TFCC (Triangular Fibrocartilage Complex) screen",type:"multicheck",
      options:["Not applicable","Ulnar wrist pain","Worse forearm rotation (pronation / supination)","Worse gripping with wrist ulnar deviated","Clicking / clunking at ulnar wrist with rotation","After FOOSH with forearm rotation","After distal radius fracture","TFCC stress test pain (known)","Ulnar variance — long ulna on x-ray (known)"]},
    {id:"ew_olecranon",label:"Olecranon bursitis",type:"multicheck",
      options:["Not applicable","Posterior elbow swelling — visible bump","Direct trauma to posterior elbow","Occupational — leaning on elbows","Fluctuant soft swelling — non-inflammatory","Hot red painful — septic bursitis screen","Gout / pseudogout — crystalline bursitis"]},
    {id:"ew_biceps_rupture",label:"Biceps rupture screen",type:"multicheck",
      options:["Not applicable","Sudden pop in anterior elbow / arm","Lifting heavy object with elbow flexed","Visible muscle deformity — Popeye sign in upper arm (proximal)","Ball of muscle migrated distally (distal rupture)","Weakness supination / elbow flexion — sudden onset","Anterior elbow bruising","Hook test negative (distal biceps)"]},
    {id:"ew_pect_rupture",label:"Pectoralis major rupture screen",type:"multicheck",
      options:["Not applicable","Bench press / heavy chest exercise mechanism","Felt pop in chest / anterior shoulder","Immediate weakness shoulder horizontal adduction","Bruising anterior chest / axilla","Asymmetric chest wall contour","Visible retraction of muscle toward axilla"]},
    {id:"ew_extra_notes",label:"Additional Conditions Notes",type:"textarea"},
  ]},
});

// Extend Shoulder with biceps rupture (proximal), brachial neuritis
Object.assign(REG_MOD_S["Shoulder (L)"].sections, {
  shl_extra:{label:"Shoulder L — Additional Conditions",icon:"🔍",color:"#0891b2",fields:[
    {id:"shl_brachial_neuritis",label:"Brachial Neuritis / Parsonage-Turner screen",type:"multicheck",
      options:["Not applicable","Sudden severe shoulder / arm pain — onset within hours","Rapidly followed by profound weakness","Weakness out of proportion to pain","Pain settles but weakness persists","After viral illness / vaccination / surgery","Multiple nerve territories affected","No neck pain to explain weakness","Diaphragm weakness / breathing affected"]},
    {id:"shl_hypermobility",label:"Hypermobility / EDS screen",type:"multicheck",
      options:["Not applicable","Joints felt loose since childhood","Multiple joint dislocations / subluxations","Skin hyperelastic / stretchy","Beighton score elevated (known)","Family history hypermobility","Chronic widespread joint pain since adolescence","Easy bruising","Poor wound healing"]},
    {id:"shl_extra_notes",label:"Additional Notes",type:"textarea"},
  ]},
});

Object.assign(REG_MOD_S["Shoulder (R)"].sections, {
  shr_extra:{label:"Shoulder R — Additional Conditions",icon:"🔍",color:"#06b6d4",fields:[
    {id:"shr_brachial_neuritis",label:"Brachial Neuritis / Parsonage-Turner screen",type:"multicheck",
      options:["Not applicable","Sudden severe shoulder / arm pain — onset within hours","Rapidly followed by profound weakness","Weakness out of proportion to pain","Pain settles but weakness persists","After viral illness / vaccination / surgery","Multiple nerve territories affected","No neck pain to explain weakness"]},
    {id:"shr_hypermobility",label:"Hypermobility / EDS screen",type:"multicheck",
      options:["Not applicable","Joints felt loose since childhood","Multiple joint dislocations / subluxations","Skin hyperelastic / stretchy","Beighton score elevated (known)","Family history hypermobility","Chronic widespread joint pain since adolescence"]},
    {id:"shr_extra_notes",label:"Additional Notes",type:"textarea"},
  ]},
});

// Extend Thoracic with rib fracture
Object.assign(REG_MOD_S["Thoracic spine"].sections, {
  tx_rib:{label:"Thoracic — Rib Fracture / Costochondritis",icon:"🦴",color:"#d97706",fields:[
    {id:"tx_rib_screen",label:"Rib / Costochondral screen",type:"multicheck",
      options:["Not applicable","Direct trauma to chest / rib","High-impact sport (rugby / contact)","Stress fracture — rowing / coughing athlete","Osteoporosis + minimal trauma","Point tenderness over specific rib","Worse deep breathing / coughing / laughing","Costochondritis — anterior chest + cartilage tenderness","Tietze syndrome — swelling at costochondral junction","Rib spring test positive (known)","Pneumothorax risk — penetrating trauma"]},
    {id:"tx_rib_notes",label:"Rib Notes",type:"textarea"},
  ]},
});

// Add Cervical fracture / odontoid screen enhancement
Object.assign(REG_MOD_S["Cervical spine"].sections, {
  cx_fracture:{label:"Cervical — Fracture Screen",icon:"🦴",color:"#7c3aed",fields:[
    {id:"cx_fracture_screen",label:"Cervical fracture indicators",type:"multicheck",
      options:["Not applicable","High-energy trauma (MVA / fall >1m / diving)","Axial loading mechanism (head impact)","Immediate severe pain + muscle spasm","Cannot move neck at all — voluntary splinting","Neurological symptoms from time of injury","Odontoid peg fracture risk — elderly + fall","NEXUS criteria not cleared","Canadian C-Spine Rule — high risk features","Bilateral facet dislocation — high energy","Clay shoveler fracture — sudden load / whip"]},
    {id:"cx_fracture_notes",label:"Fracture Screen Notes",type:"textarea"},
  ]},
});

// Add paediatric section to universal
UNIV_S.paediatric = {
  label:"Paediatric / Adolescent Screen",icon:"👶",color:"#f472b6",
  description:"Auto-relevant for patients under 18",
  fields:[
    {id:"ped_age_group",label:"Developmental stage",type:"select",
      options:["Not applicable — adult","Child (5–12 years)","Early adolescent (12–15 years)","Adolescent (15–18 years)","Growth spurt phase (confirm with history)"]},
    {id:"ped_conditions",label:"Paediatric-specific conditions to consider",type:"multicheck",
      options:["Not applicable","Osgood-Schlatter (tibial apophysitis — knee)","Sever's disease (calcaneal apophysitis — heel)","Sinding-Larsen-Johansson (inferior patella)","Scheuermann's disease (thoracic kyphosis)","Spondylolysis (pars stress fracture — young athlete)","Perthes disease (hip — limping child)","SUFE / SCFE (slipped upper femoral epiphysis — hip)","Little League shoulder (proximal humeral epiphysis)","Little League elbow (medial epicondyle apophysitis)","Osteochondritis dissecans (knee / elbow / ankle)","Stress fracture — overtraining","Growing pains — bilateral lower limb at night","Hypermobility — generalised joint laxity"]},
    {id:"ped_sport_load",label:"Training load — paediatric",type:"multicheck",
      options:["Not applicable","Single sport specialisation before age 14","Year-round training — no off-season","Multiple teams simultaneously","Rapid load increase — growth spurt","Parental / coach pressure to train through pain","Recent significant growth spurt (>5cm in 6 months)"]},
    {id:"ped_notes",label:"Paediatric Notes",type:"textarea"},
  ],
};

// Add hypermobility / EDS to universal
UNIV_S.hypermobility = {
  label:"Hypermobility / EDS Screen",icon:"🦵",color:"#a855f7",
  description:"Screen if multiple joint instability or childhood symptoms",
  fields:[
    {id:"hm_screen",label:"Hypermobility indicators",type:"multicheck",
      options:["Not applicable","Joints felt loose / unstable since childhood","Multiple joint dislocations or subluxations","Skin hyperelastic or very stretchy","Easy bruising without injury","Poor wound healing / stretched scars","Chronic widespread joint pain since adolescence","Fatigue disproportionate to activity","Family history of hypermobility / EDS","Beighton score elevated (if assessed)","POTS / dizziness on standing","Recurrent ankle sprains bilateral"]},
    {id:"hm_beighton",label:"Beighton Score (if assessed)",type:"select",
      options:["Not assessed","1–3 (low)","4–5 (moderate)","6–9 (high — hypermobility likely)"]},
    {id:"hm_notes",label:"Hypermobility Notes",type:"textarea"},
  ],
};

// ══════════════════════════════════════════════════════════════════════
// CLINICAL INTERPRETATION ENGINE v6
// Ranked differentials · Confidence scoring · NRS integration
// Partial-data tolerant · Pattern-specific objective suggestions
// Evidence: Magee(7th) · Petty(5th) · Maitland(8th) · Butler
//           Brukner & Khan(5th) · NICE NG59 · ASAS · STarT Back
// ══════════════════════════════════════════════════════════════════════



// ── NavActionBtn — stable component so hooks are never called inside .map() ──
const NKT_REGIONS = {
  cervical:{
    label:"Cervical / Head & Neck", color:"#00e5ff",
    intro:"The cervical CPA assessment identifies which muscles the Motor Control Centre (MCC) has inhibited in the neck and head region, and which synergists are compensating. Common compensation: DNF inhibited → SCM/scalenes overactive → forward head posture, headache, TMJ.",
    tests:[
      {
        id:"nkt_dnf", label:"Deep Neck Flexors (DNF)", muscle:"Longus colli / Longus capitis",
        compensator:"SCM, scalenes, suboccipitals",
        how:"Patient supine. Place pressure biofeedback cuff at neck (inflate to 20mmHg baseline). Ask patient to gently nod chin (craniocervical flexion — NOT a chin tuck). Gradually increase target pressure from 22 → 24 → 26 → 28 → 30mmHg holding each 10 seconds. Confirm by touching SCM during test — if SCM fires early or dominates, DNF is inhibited.",
        options:[
          { val:"Facilitated", color:"#00c97a", meaning:"DNF activates before SCM. Patient can reach 28–30mmHg without SCM firing. Normal motor control. No CPA treatment needed for DNF." },
          { val:"Inhibited", color:"#ff4d6d", meaning:"DNF cannot maintain pressure targets. SCM fires early and dominates. MCC has turned off DNF — forward head is maintained by SCM/scalenes. TREAT: release SCM/scalenes → activate DNF immediately." },
          { val:"Overactive", color:"#ffb300", meaning:"Rare. DNF may be overworking due to inhibition elsewhere (e.g. longus colli compensating for atlas instability). Presents as anterior neck pain with no relief from flexion." },
        ],
        treatment:"Release: SCM (pressure/massage) + scalenes (SMR). Activate: chin nod 10 reps × 3 sets. Home: tongue to roof of mouth posture drill. Reprogram MCC within 30 seconds of release.",
      },
      {
        id:"nkt_scm", label:"Sternocleidomastoid (SCM)", muscle:"SCM",
        compensator:"When overactive: compensating for inhibited DNF or contralateral upper trap",
        how:"Patient supine. Therapist palpates SCM (finger on muscle belly, sternal and clavicular heads). Ask patient to flex neck against resistance. SCM should only assist — if it fires hard and first, it is overactive. Therapy localization: touch SCM belly → re-test DNF. If DNF suddenly stronger = SCM is the overactive compensator.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"SCM assists neck flexion appropriately. Normal recruitment. Not compensating." },
          { val:"Overactive — compensating for DNF", color:"#ff4d6d", meaning:"SCM fires before DNF and dominates flexion. Confirmed by therapy localization. TREAT: release SCM → activate DNF. Patient often has forward head, headache, TMJ symptoms." },
          { val:"Overactive — compensating for upper trap", color:"#ffb300", meaning:"SCM overactive contralaterally to compensate for ipsilateral upper trap inhibition. Causes head tilt and rotation asymmetry." },
          { val:"Bilateral overactive", color:"#7f5af0", meaning:"Both SCMs overactive — typically compensating for inhibited core/diaphragm. Patient often has forward head with breathing dysfunction." },
        ],
        treatment:"Release: light pressure massage on SCM belly for 60–90 sec. Stretch: gentle lateral flexion opposite side. Then immediately activate: DNF chin nods. Never aggressively stretch an overactive SCM without activating DNF first.",
      },
      {
        id:"nkt_suboccip", label:"Suboccipital Muscles", muscle:"Rectus capitis posterior / Obliquus capitis",
        compensator:"When overactive: compensating for inhibited DNF or cervical flexors",
        how:"Patient prone or supine. Palpate suboccipital triangle (base of skull). Apply gentle pressure while patient slowly nods chin. Suboccipitals should relax with DNF activation. If they remain hard or increase in tone — overactive. Test: place finger on suboccipitals → re-test DNF → if DNF stronger, suboccipitals are compensating.",
        options:[
          { val:"Normal", color:"#00c97a", meaning:"Suboccipitals relax when DNF activates. Normal reciprocal inhibition. No compensation pattern." },
          { val:"Overactive — DNF compensation", color:"#ff4d6d", meaning:"Suboccipitals are hard and tender. Maintain atlas extension. Patient has upper cervical pain, base of skull headache, dizziness, and restricted C0–C1 mobility. TREAT: suboccipital release → DNF activation." },
          { val:"Overactive — eye muscle compensation", color:"#ffb300", meaning:"Suboccipitals overactive due to visual compensation. Follows eye movement dysfunction. Ask patient to look in directions — if symptoms change, visual/vestibular system involved." },
        ],
        treatment:"Release: suboccipital decompression (therapist fingers under occiput, sustained gentle traction 2–3 min). Dry needling to suboccipitals if acute. Then activate DNF. Refer for eye/vestibular assessment if visual pattern present.",
      },
      {
        id:"nkt_upper_trap", label:"Upper Trapezius", muscle:"Upper trapezius / Levator scapulae",
        compensator:"When overactive: compensating for inhibited lower trapezius or DNF",
        how:"Patient seated. Therapist palpates upper trapezius (upper shoulder, fibres between neck and acromion). Apply gentle downward pressure on shoulder (shrug resistance). If upper trap fires immediately and forcefully with minimal load = overactive. Therapy localization: touch upper trap → re-test lower trapezius. If lower trap suddenly stronger = upper trap compensating for lower trap inhibition.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Upper trap fires proportionally with lower and middle trap. No shoulder elevation at rest or with light load." },
          { val:"Overactive — lower trap inhibition", color:"#ff4d6d", meaning:"Upper trap fires excessively. Shoulder visibly elevated at rest. Lower trap tests weak. TREAT: release upper trap → activate lower trap immediately. Common in desk workers, impingement." },
          { val:"Overactive — DNF inhibition", color:"#ffb300", meaning:"Upper trap overactive as distant compensation for cervical instability. Touching upper trap improves DNF test. Release upper trap → activate DNF." },
          { val:"Overactive — breathing dysfunction", color:"#7f5af0", meaning:"Upper trap overactive as accessory breathing muscle. Patient breathes into upper chest. Release upper trap + retrain diaphragmatic breathing." },
        ],
        treatment:"Release: SMR upper trap (tennis ball or foam roller). Massage: cross-fibre across fibres. Stretch: lateral neck stretch (ear to opposite shoulder). Then immediately activate lower trapezius: prone Y-exercise. Home: shoulder blade drops × 20 throughout day.",
      },
      {
        id:"nkt_scalenes", label:"Scalenes", muscle:"Anterior / Middle / Posterior scalenes",
        compensator:"When overactive: compensating for inhibited DNF, or thoracic outlet contributors",
        how:"Patient supine. Palpate scalenes (lateral neck, between SCM and levator). Ask patient to breathe in deeply — scalenes should only fire at end-range of inhalation. If they fire early in breathing = overactive as accessory breathers. Test resisted cervical side flexion — if scalenes are disproportionately active vs DNF = compensation. Therapy localization: touch scalenes → re-test DNF.",
        options:[
          { val:"Normal", color:"#00c97a", meaning:"Scalenes activate only at end of deep inhalation. Appropriately assist cervical side flexion. No thoracic outlet symptoms." },
          { val:"Overactive — DNF inhibition", color:"#ff4d6d", meaning:"Scalenes fire early in breathing and dominate lateral neck. Patient has anterior neck tightness, thoracic outlet symptoms (arm tingling). TREAT: release scalenes → activate DNF." },
          { val:"Overactive — rib 1 elevation", color:"#ffb300", meaning:"Scalenes elevated first rib — thoracic outlet narrowed. Adson's test may be positive. Needs rib 1 mobilisation + scalene release." },
          { val:"Bilateral overactive — breathing pattern", color:"#7f5af0", meaning:"Both scalenes overactive as primary breathers (thoracic breathing pattern). Diaphragm inhibited. TREAT: release scalenes → diaphragmatic breathing retraining." },
        ],
        treatment:"Release: gentle scalene massage (patient supine, head rotated away, fingertip pressure on scalene belly 90 sec). Stretch: cervical extension + rotation + side flex away. Activate: diaphragmatic breathing (hand on belly, breathe in 4 sec, out 6 sec). Avoid aggressive scalene stretching without diaphragm retraining.",
      },
      { id:"nkt_levator_scap", label:"Levator Scapulae", muscle:"Levator scapulae",
        compensator:"When overactive: compensating for inhibited lower trap or DNF",
        how:"Patient seated. Palpate levator scapulae (posterior-lateral neck, C1–C4 to superior medial scapular angle). Apply firm pressure while patient attempts cervical rotation away from palpated side. POSITIVE OVERACTIVITY: muscle contracts forcefully and holds tension during scapular elevation. Therapy localization: touch levator → re-test lower trap. If lower trap suddenly stronger = levator compensating.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Levator scapulae assists cervical side flexion and scapular elevation proportionally. Not dominant during shoulder tasks. No neck-shoulder pain with lifting." },
          { val:"Overactive — lower trap inhibition", color:"#ff4d6d", meaning:"Levator overactive elevating medial scapular angle. Lower trap inhibited. Persistent neck-shoulder pain, restricted cervical rotation. TREAT: release levator → activate lower trap." },
          { val:"Overactive — cervical instability", color:"#ffb300", meaning:"Levator overactive as cervical stabiliser when DNF inhibited. C3/C4 facet compression, restricted ipsilateral rotation. Release levator → activate DNF." },
        ],
        treatment:"Release: lacrosse ball to posterior-lateral neck 60–90 sec. Stretch: chin to opposite armpit. Activate: lower trap Y-lifts immediately. Home: scapular depression exercises × 20 reps.",
      },
      { id:"nkt_splenius", label:"Splenius Capitis / Cervicis", muscle:"Splenius capitis / Splenius cervicis",
        compensator:"When overactive: compensating for inhibited cervical flexors",
        how:"Patient prone or seated. Palpate splenius capitis (C7-T3 spinous → mastoid/occiput) and splenius cervicis (to C2/C3 transverse processes). Ask patient to extend and ipsilaterally rotate head against light resistance. POSITIVE OVERACTIVITY: fires excessively, maintains resting tone. Therapy localization: touch splenius → re-test DNF.",
        options:[
          { val:"Normal", color:"#00c97a", meaning:"Splenius contributes proportionally to cervical extension and ipsilateral rotation. No excessive resting tone." },
          { val:"Overactive — unilateral", color:"#ffb300", meaning:"Unilateral overactivity: ipsilateral rotation bias, restricted contralateral rotation, ipsilateral headache to orbit. TREAT: release unilateral splenius → activate DNF." },
          { val:"Overactive — bilateral", color:"#ff4d6d", meaning:"Bilateral overactivity forces cervical hyperextension and suboccipital compression. TREAT: release bilateral splenius → activate DNF." },
        ],
        treatment:"Release: fingertip pressure to splenius belly 60 sec each side. Cervical flexion stretch. Activate: DNF chin nods immediately. Home: gentle cervical flexion ROM × 10 reps.",
      },
      { id:"nkt_semispinalis", label:"Semispinalis Capitis / Cervicis", muscle:"Semispinalis capitis / cervicis",
        compensator:"When overactive: compensating for inhibited deep cervical stabilisers",
        how:"Patient prone. Palpate semispinalis (posterior neck between spinous processes and mastoid — deep to upper trap, superficial to multifidus). Ask patient to extend head against gentle resistance. POSITIVE OVERACTIVITY: palpable firmness at rest, neck extension ROM excessive relative to flexor strength. Therapy localization: touch semispinalis → re-test DNF.",
        options:[
          { val:"Normal", color:"#00c97a", meaning:"Semispinalis contributes to cervical extension and bilateral contralateral rotation. Balanced with DNF. No posterior neck tension at rest." },
          { val:"Overactive — DNF inhibition", color:"#ff4d6d", meaning:"Semispinalis overactive producing posterior cervical tension and compression. Suboccipital headache, C-spine stiffness, restricted flexion. TREAT: release semispinalis → activate DNF." },
          { val:"Overactive — thoracic kyphosis compensation", color:"#ffb300", meaning:"Semispinalis hyperextending cervical spine to correct for thoracic kyphosis. Extended cervical posture despite thoracic flexion. Address thoracic extension mobility first." },
        ],
        treatment:"Release: slow sustained pressure along posterior cervical paraspinals 60–90 sec. Activate: DNF chin nods. Address thoracic posture with foam roller extension if kyphosis is driver.",
      },
    ]
  },

  shoulder:{
    label:"Shoulder & Scapula", color:"#7f5af0",
    intro:"Shoulder CPA identifies which rotator cuff and scapular muscles are inhibited, and which are compensating. Classic patterns: lower trap inhibited → upper trap overactive | serratus inhibited → pec minor overactive | RC inhibited → biceps/pec major overactive.",
    tests:[
      {
        id:"nkt_lower_trap", label:"Lower Trapezius", muscle:"Lower trapezius",
        compensator:"When inhibited: upper trapezius, levator scapulae compensate",
        how:"Patient prone, arm abducted 120–135° (Y position). Ask patient to lift arm toward ceiling (shoulder extension in Y). Apply gentle downward resistance at distal humerus. Lower trap should fire to stabilise scapula. POSITIVE INHIBITION = cannot hold position or upper trap/neck fires to compensate. Therapy localization: touch upper trap → re-test lower trap. If lower trap suddenly stronger = upper trap compensating.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Lower trap activates strongly in Y position. Scapula depresses and retracts appropriately. No compensation from upper trap. Normal scapulohumeral rhythm." },
          { val:"Inhibited — mild", color:"#ffb300", meaning:"Lower trap activates but fatigues quickly or upper trap fires simultaneously. Mild compensation. Patient may have intermittent shoulder pain with overhead activities. Begin isolated lower trap activation." },
          { val:"Inhibited — moderate", color:"#ff4d6d", meaning:"Lower trap cannot hold position. Upper trap immediately compensates (shoulder rises). MCC has assigned upper trap as stabiliser. Patient has chronic shoulder/neck pain, impingement pattern. TREAT: release upper trap → activate lower trap." },
          { val:"Inhibited — severe", color:"#7f5af0", meaning:"Lower trap completely inhibited. Cannot perform Y position test. Scapular winging or severe elevation present. Upper trap, levator AND rhomboids all compensating. Multiple release/activate cycles needed." },
        ],
        treatment:"Release overactive: upper trap SMR + levator scapulae massage (60–90 sec each). Activate immediately: prone Y-lifts × 5 reps, wall slide with scapular depression, cable pull-down with scapular depression. Home: doorframe lower trap sets × 20 reps throughout day.",
      },
      {
        id:"nkt_serratus", label:"Serratus Anterior", muscle:"Serratus anterior",
        compensator:"When inhibited: pectoralis minor overactive",
        how:"Patient performs wall push-up. Observe scapular position during push-up plus phase (full protraction at top). If medial border of scapula wings away from thorax = serratus inhibited. Manual test: patient pushes arm into therapist's hand (forward protraction). Apply resistance. POSITIVE INHIBITION = scapula wings or cannot protract against resistance. Therapy localization: touch pec minor → re-test serratus. If serratus stronger = pec minor compensating.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Serratus activates to protract and upwardly rotate scapula. No winging on push-up plus. Scapula hugs thorax throughout arm elevation. Normal scapulohumeral rhythm." },
          { val:"Inhibited — functional winging", color:"#ffb300", meaning:"Serratus inhibited under load but not at rest. Winging appears only with push-up or arm elevation. Pec minor is tight and overactive. Patient has anterior shoulder pain with overhead activities." },
          { val:"Inhibited — resting winging", color:"#ff4d6d", meaning:"Scapular winging visible at rest (medial border away from thorax). Serratus severely inhibited. Pec minor chronically overactive. Long thoracic nerve palsy must be ruled out. TREAT: release pec minor → activate serratus." },
          { val:"Long thoracic nerve palsy", color:"#7f5af0", meaning:"Complete serratus inhibition with severe winging. No voluntary activation possible. Neurological cause — C5/6/7 long thoracic nerve affected. Refer for nerve conduction study. CPA technique may still help partial cases." },
        ],
        treatment:"Release: pec minor (supine, firm pressure at coracoid process to 3rd–5th ribs, 90 sec). Activate: serratus punches (supine, arm at 90°, push fist toward ceiling adding protraction), push-up plus. Home: wall protraction holds × 10 reps, serratus activation in quadruped.",
      },
      {
        id:"nkt_infraspinatus", label:"Infraspinatus / Teres Minor", muscle:"Infraspinatus / Teres minor",
        compensator:"When inhibited: posterior deltoid, biceps compensate",
        how:"Patient seated or sidelying. Elbow at 90°, arm at side. Apply gentle resistance to external rotation. POSITIVE INHIBITION = cannot resist external rotation with adequate force, or posterior deltoid/biceps dominates. Therapy localization: touch posterior deltoid or biceps → re-test IR. If ER suddenly stronger = deltoid/biceps compensating for RC.",
        options:[
          { val:"Facilitated — strong", color:"#00c97a", meaning:"Infraspinatus/teres minor generate adequate ER force at 0° and 90°. No compensation from posterior deltoid. Normal rotator cuff function." },
          { val:"Inhibited — pain inhibition", color:"#ffb300", meaning:"Inhibited due to pain (strong & painful = minor lesion per STTT). Pain prevents full activation. Address pain first (DTFM, dry needling) then CPA re-test." },
          { val:"Inhibited — motor control", color:"#ff4d6d", meaning:"ER weak and painless. MCC has inhibited infraspinatus — posterior deltoid compensates for humeral head depression. Patient has shoulder impingement pattern. TREAT: release pec minor/posterior deltoid → activate IR." },
          { val:"Complete inhibition — possible tear", color:"#7f5af0", meaning:"No ER activation possible. Consider structural tear — refer for imaging (MRI/ultrasound). External rotation lag sign likely positive." },
        ],
        treatment:"Release: pec minor + anterior deltoid (both overactive compensators, SMR 60 sec). Dry needling to infraspinatus if trigger points present. Activate: sidelying ER with theraband (light resistance, slow and controlled). Home: doorframe ER isometric × 20 reps.",
      },
      {
        id:"nkt_subscapularis", label:"Subscapularis", muscle:"Subscapularis",
        compensator:"When inhibited: pec major, teres major compensate",
        how:"Patient seated or supine. Elbow 90°, arm at side. Resist internal rotation. Subscapularis is the primary IR and anterior stabiliser. POSITIVE INHIBITION = weak IR or pec major fires to compensate (you can see/feel pec major dominating). Lift-off test: patient places dorsum of hand on low back and lifts it off — cannot = subscapularis inhibited. Belly press test: press hand into abdomen without wrist flexing — cannot = subscapularis inhibited.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Strong IR at 0° and 45°. Can perform lift-off and belly press without compensation. Normal anterior GH stability." },
          { val:"Inhibited — instability pattern", color:"#ffb300", meaning:"IR weak, pec major compensates. Patient has anterior shoulder instability, pain with IR. Apprehension test may be positive. TREAT: release pec major → activate subscapularis." },
          { val:"Inhibited — post-surgical", color:"#ff4d6d", meaning:"Subscapularis inhibited after shoulder surgery (Bankart, SLAP repair, total shoulder). MCC 'switched off' subscapularis due to surgical trauma. Therapy localization confirms. Progressive CPA activation essential for return to function." },
          { val:"Complete inhibition", color:"#7f5af0", meaning:"Cannot perform any IR. Lift-off completely failed. Possible subscapularis tear — refer for imaging. Belly press = wrist flexion to compensate." },
        ],
        treatment:"Release: pec major SMR + anterior deltoid massage. Activate: sidelying IR with theraband, belly press holds, lift-off progression. Home: theraband IR × 20 reps, progress to 90/90 IR.",
      },
      {
        id:"nkt_mid_trap", label:"Middle Trapezius / Rhomboids", muscle:"Middle trapezius / Rhomboids",
        compensator:"When inhibited: levator scapulae, upper trap compensate",
        how:"Patient prone, arm at 90° (T position). Retract and depress scapula while lifting arm. Apply resistance at posterior humerus. POSITIVE INHIBITION = scapula protracts under load, or levator scapulae fires to elevate rather than retract. Therapy localization: touch levator → re-test mid trap. If stronger = levator compensating.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Middle trap retracts scapula strongly without elevation. Scapulae symmetric in prone. Normal retraction strength." },
          { val:"Inhibited — protraction bias", color:"#ffb300", meaning:"Mild weakness. Scapula protracts under resistance. Patient has rounded shoulders but not severe. Levator scapulae partially compensating." },
          { val:"Inhibited — levator dominant", color:"#ff4d6d", meaning:"Scapula elevates instead of retracting under load. Levator fully compensating for mid trap. Patient has upper neck pain and shoulder elevation at rest. TREAT: release levator → activate middle trap." },
        ],
        treatment:"Release: levator scapulae (pressure at superior angle of scapula, 60 sec). SMR upper neck region. Activate: prone T-lifts, seated cable rows with scapular retraction focus. Home: wall angel exercise × 15 reps.",
      },
      { id:"nkt_pec_minor", label:"Pectoralis Minor", muscle:"Pectoralis minor",
        compensator:"When overactive: compensating for inhibited serratus anterior",
        how:"Patient supine. Palpate pec minor at coracoid process (just below and medial to the coracoid tip, between coracoid and 3-5th ribs). Apply firm pressure medially toward ribs. POSITIVE OVERACTIVITY: extreme tenderness, scapular protraction (shoulder rolls forward at rest), restricted scapular retraction. Test: therapist passively retract scapula — if very restricted = pec minor shortened. Therapy localization: touch pec minor → re-test serratus.",
        options:[
          { val:"Normal length and tone", color:"#00c97a", meaning:"Pec minor not tender at rest. Scapula rests neutrally — not protracted. Serratus anterior not inhibited. Full passive scapular retraction available." },
          { val:"Overactive — serratus inhibition", color:"#ff4d6d", meaning:"Pec minor overactive, shortened. Scapular protraction at rest. Serratus inhibited. Patient has anterior shoulder pain, impingement pattern, rounded shoulder posture. TREAT: release pec minor → activate serratus." },
          { val:"Overactive — thoracic outlet", color:"#ffb300", meaning:"Pec minor compressing neurovascular bundle (brachial plexus, subclavian vessels). Arm tingling especially in overhead position. Coracoid hyperalgesic. Release pec minor + neural mobilisation." },
        ],
        treatment:"Release: supine coracoid-to-rib pressure technique 90 sec. Door-stretch pec minor (hand at 90° abduction, lean through doorframe). Activate: serratus punches immediately. Home: pec minor self-release with ball × 2 min daily.",
      },
      { id:"nkt_ant_deltoid", label:"Anterior Deltoid", muscle:"Anterior deltoid",
        compensator:"When overactive: compensating for inhibited rotator cuff (supraspinatus/infraspinatus)",
        how:"Patient seated. Palpate anterior deltoid (anterior shoulder, below clavicle). Resist shoulder flexion at 90°. POSITIVE OVERACTIVITY: anterior deltoid fires powerfully and dominates — palpation reveals hard, tender muscle belly. Humeral head translates anteriorly during shoulder elevation. Therapy localization: touch anterior deltoid → re-test supraspinatus. If supraspinatus stronger = anterior deltoid compensating.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Anterior deltoid assists shoulder flexion proportionally. No anterior humeral head translation. Rotator cuff centring maintained throughout elevation." },
          { val:"Overactive — RC inhibition", color:"#ff4d6d", meaning:"Anterior deltoid dominates shoulder flexion. Humeral head migrates anteriorly/superiorly. Impingement pattern. Patient has anterior shoulder pain on flexion. TREAT: release anterior deltoid → activate infraspinatus/supraspinatus." },
          { val:"Overactive — biceps compensation", color:"#ffb300", meaning:"Anterior deltoid + biceps both overactive as RC compensators. Shoulder flexion with elbow flexion tendency. Bicipital groove tender. Release anterior deltoid + biceps → activate RC." },
        ],
        treatment:"Release: cross-fibre massage to anterior deltoid belly 60 sec. Activate: sidelying ER for infraspinatus. Home: doorframe stretch in neutral rotation.",
      },
      { id:"nkt_post_deltoid", label:"Posterior Deltoid", muscle:"Posterior deltoid",
        compensator:"When overactive: compensating for inhibited infraspinatus / teres minor",
        how:"Patient prone or seated. Palpate posterior deltoid (posterior shoulder). Resist shoulder horizontal abduction (arm at 90° flex, pull backward against resistance). POSITIVE OVERACTIVITY: posterior deltoid fires with disproportionate force relative to infraspinatus. Infraspinatus tests weak. Therapy localization: touch posterior deltoid → re-test infraspinatus ER.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Posterior deltoid assists horizontal abduction proportionally. Infraspinatus/teres minor provide adequate ER. No dominance of posterior deltoid in ER." },
          { val:"Overactive — IR compensation", color:"#ff4d6d", meaning:"Posterior deltoid compensates for inhibited infraspinatus. ER dominated by deltoid not RC. Posterior shoulder tightness. TREAT: release posterior deltoid → activate infraspinatus." },
        ],
        treatment:"Release: cross-fibre massage to posterior deltoid 60 sec. Activate: sidelying ER with theraband (infraspinatus isolation). Home: ER doorframe isometric.",
      },
      { id:"nkt_teres_major", label:"Teres Major", muscle:"Teres major",
        compensator:"When overactive: compensating for inhibited subscapularis or lat dorsi",
        how:"Patient sidelying or prone. Palpate teres major (posterior axillary fold, between inferior angle of scapula and humerus). Apply gentle resistance to internal rotation. POSITIVE OVERACTIVITY: teres major fires powerfully and tenderly. Often confused with lat dorsi. Test: resist shoulder adduction from 90° abduction — if teres major dominates = overactive. Therapy localization: touch teres major → re-test subscapularis.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Teres major assists IR and adduction proportionally. Subscapularis not inhibited. No posterior axillary tension." },
          { val:"Overactive — subscapularis inhibition", color:"#ff4d6d", meaning:"Teres major overactive compensating for subscapularis. Medial rotation with adduction pattern. Posterior axillary fold tight. TREAT: release teres major → activate subscapularis." },
          { val:"Overactive — lat dorsi compensation", color:"#ffb300", meaning:"Teres major + lat dorsi both overactive. Shoulder locked in extension/adduction/IR. Overhead reaching severely restricted. Release both → activate lower trap and serratus." },
        ],
        treatment:"Release: fingertip pressure to teres major belly at posterior axillary fold 60–90 sec. Activate: subscapularis (belly press or IR in neutral). Home: overhead reach stretch with scapular upward rotation cue.",
      },
    ]
  },

  core:{
    label:"Core & Lumbar", color:"#00c97a",
    intro:"Core CPA identifies which deep stabilisers the MCC has inhibited following injury, poor posture, or prolonged sitting. Classic patterns: TA inhibited → erector spinae overactive | multifidus inhibited → superficial back muscles compensate | diaphragm inhibited → accessory breathers (scalenes, SCM) overactive.",
    tests:[
      {
        id:"nkt_ta", label:"Transversus Abdominis (TA)", muscle:"Transversus abdominis",
        compensator:"When inhibited: erector spinae, rectus abdominis compensate",
        how:"Patient supine, knees bent. Ask patient to draw navel gently toward spine WITHOUT holding breath or flattening lumbar spine. Place fingers 2cm medial and inferior to ASIS — feel for gentle tensioning of lower abdomen. If erector spinae fires instead (back arches), or patient holds breath = TA inhibited. Pressure biofeedback (prone): inflate to 70mmHg. Ask to draw in — normal = 4–10mmHg DECREASE. More than 10mmHg decrease = RA compensating.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"TA activates independently with drawing-in manoeuvre. No breath holding. Lumbar spine neutral. Pressure biofeedback shows 4–10mmHg decrease. Core precedes limb movement (normal feedforward activation)." },
          { val:"Inhibited — erector spinae dominant", color:"#ff4d6d", meaning:"TA cannot activate. Erector spinae fires instead (back extends/arches). Patient has chronic LBP pattern. MCC assigned spinal extensors as stabilisers. TREAT: release erector spinae → activate TA. Most common finding in chronic LBP." },
          { val:"Inhibited — breath-holding pattern", color:"#ffb300", meaning:"Patient braces with Valsalva rather than subtle TA activation. Intra-abdominal pressure elevated constantly. TA never activates independently. Indicative of chronic spinal instability fear-avoidance." },
          { val:"Inhibited — RA dominant", color:"#7f5af0", meaning:"Rectus abdominis fires instead of TA. Abdomen protrudes on activation attempt or flattens dramatically. TA completely bypassed. Pressure biofeedback shows >10mmHg decrease. Requires extensive TA isolation practice." },
        ],
        treatment:"Release: erector spinae SMR (foam roll thoracolumbar region, 90 sec each side). Activate: abdominal drawing-in manoeuvre × 10 reps (holding 10 sec), progress to dead bug. Home: TA activation every hour, integrate into all daily movement.",
      },
      {
        id:"nkt_multifidus", label:"Multifidus", muscle:"Multifidus",
        compensator:"When inhibited: superficial erector spinae, QL compensate",
        how:"Patient prone. Palpate paraspinal groove just lateral to spinous processes at L4/L5. Ask patient to gently swell the muscle outward WITHOUT moving the spine or contracting buttocks. If superficial erector fires (hard and broad contraction) instead of local deep swelling = multifidus inhibited. Ultrasound imaging gold standard. Clinical test: observe spine stability during single-leg balance — if excessive spinal movement = multifidus deficit.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Multifidus produces gentle local swelling at palpated level. Segmental stabilisation present. Normal spinal control during limb movements. Rapid re-activation after acute episode." },
          { val:"Inhibited — unilateral", color:"#ffb300", meaning:"Asymmetric multifidus activation. One side inhibited (often side of prior disc herniation or LBP episode). Compensatory erector spinae and QL overactivity on that side. Patient has asymmetric LBP and trunk rotation weakness." },
          { val:"Inhibited — bilateral", color:"#ff4d6d", meaning:"Both sides inhibited. Spinal extensors completely compensating. Patient has chronic, diffuse LBP with poor spinal segmental control. Core exercises targeting global muscles (crunches, deadlifts) worsen the pattern." },
          { val:"Atrophied (post-injury)", color:"#7f5af0", meaning:"Multifidus atrophied after disc herniation or surgery. Atrophy may be visible on MRI. Slow to recover — requires specific activation. CPA therapy localization confirms which superficial muscles are compensating." },
        ],
        treatment:"Release: thoracolumbar erector spinae SMR + QL pressure release. Activate: prone multifidus swelling × 10 sec holds × 10 reps, progress to quadruped arm/leg (bird-dog), then standing. Home: seated multifidus activation throughout day.",
      },
      {
        id:"nkt_diaphragm", label:"Diaphragm", muscle:"Diaphragm",
        compensator:"When inhibited: scalenes, SCM, intercostals compensate as accessory breathers",
        how:"Patient supine or seated. Observe breathing pattern: place one hand on chest, one on abdomen. Normal: abdomen rises first (diaphragm descends). POSITIVE INHIBITION = chest rises first (accessory breathing). Formal test: ask patient to breathe in deeply — if scalenes and SCM fire visibly on normal tidal breathing = diaphragm inhibited. Palpate lateral ribcage — diaphragm should expand ribcage laterally (360°). Therapy localization: touch scalenes → re-test diaphragm activation. If better = scalenes compensating for diaphragm.",
        options:[
          { val:"Normal — diaphragmatic", color:"#00c97a", meaning:"Abdomen rises first. Ribcage expands 360° laterally. Scalenes and SCM only fire on deep inhalation (3rd respiratory phase). Normal breathing pattern. Diaphragm also provides core stability contribution." },
          { val:"Inhibited — thoracic breathing", color:"#ff4d6d", meaning:"Chest rises first. Scalenes and SCM fire on every breath. Diaphragm inhibited — not descending. Patient has chronic neck tightness, upper trap pain, anxiety, and reduced lumbar stability (diaphragm contributes to IAP). TREAT: release scalenes + SCM → activate diaphragmatic breathing." },
          { val:"Inhibited — paradoxical", color:"#7f5af0", meaning:"Abdomen paradoxically moves IN on inhalation (diaphragm not descending, scalenes/accessory muscles pulling chest up only). Significant breathing dysfunction. May indicate phrenic nerve involvement or chronic postural dysfunction." },
          { val:"Inhibited — lateral expansion deficit", color:"#ffb300", meaning:"Some diaphragmatic activation but ribcage does not expand laterally — only rises. Posterior and lateral diaphragm fibres inhibited. Patient has reduced thoracolumbar fascia tension and core stability. Lateral rib expansion breathing retraining required." },
        ],
        treatment:"Release: scalenes + SCM massage (90 sec each). Activate: 360° diaphragmatic breathing (crocodile breathing — prone on floor, breathe into posterior ribcage), lateral rib expansion training. Home: diaphragmatic breathing × 10 breaths before sleep, throughout day. Address anxiety/stress contributing to thoracic breathing.",
      },
      {
        id:"nkt_ql", label:"Quadratus Lumborum (QL)", muscle:"Quadratus lumborum",
        compensator:"When overactive: compensating for inhibited glute med or multifidus",
        how:"Patient sidelying. Palpate between 12th rib and iliac crest (lateral lumbar). Ask patient to hike hip (lateral trunk flexion). Normal: QL fires as hip hiker. Overactive QL: fires excessively when it shouldn't — during hip extension (should be glute max), during abduction (should be glute med). Test: ask for hip extension in prone — if QL fires instead of glute max = QL compensating. Therapy localization: touch QL → re-test glute max or glute med. If glute fires better = QL is compensating.",
        options:[
          { val:"Normal activation", color:"#00c97a", meaning:"QL fires for lateral flexion and as respiratory stabiliser. Does not fire excessively during hip extension or abduction. Normal lumbar side stability." },
          { val:"Overactive — glute max compensation", color:"#ff4d6d", meaning:"QL fires during hip extension instead of glute max. Patient extends hip by tilting pelvis (QL) rather than extending at hip joint. Common LBP pattern. TREAT: release QL → activate glute max immediately." },
          { val:"Overactive — glute med compensation", color:"#ffb300", meaning:"QL hikes hip during walking/running instead of glute med abducting it. Patient has lateral hip pain, IT band syndrome, and Trendelenburg-equivalent pattern with QL dominance. TREAT: release QL → activate glute med." },
          { val:"Overactive — bilateral (LBP pattern)", color:"#7f5af0", meaning:"Both QLs chronically overactive. Patient cannot sit comfortably. Lateral lumbar pain bilateral. Both glute max and glute med inhibited. Multiple compensation layers — treat sequentially." },
        ],
        treatment:"Release: QL SMR (tennis ball at lateral lumbar between rib and iliac crest, 90 sec). Activate: glute max (bridges) immediately after, then glute med (side-lying abduction). Home: avoid crossing legs when sitting (increases QL asymmetry).",
      },
      {
        id:"nkt_psoas", label:"Iliopsoas (Psoas + Iliacus)", muscle:"Iliopsoas",
        compensator:"When overactive: compensating for inhibited glutes/TA; inhibited: rare, usually overactive",
        how:"Patient supine. Apply gentle resistance to hip flexion (hand on distal thigh). Normal: iliopsoas activates smoothly. Test for overactivity: is hip flexion painful or does lumbar spine extend (anterior tilt) during hip flexion? = psoas overactive pulling lumbar into extension. Thomas test: if hip cannot reach table = iliopsoas shortened/overactive. Therapy localization: touch iliopsoas (gentle pressure at inguinal region) → re-test TA or glute max. If stronger = psoas compensating.",
        options:[
          { val:"Normal length and activation", color:"#00c97a", meaning:"Hip flexes without lumbar extension. Thomas test negative. No groin pain. Psoas activates proportionally and does not pull spine forward. Appropriate hip flexion strength for activity level." },
          { val:"Overactive — anterior pelvic tilt", color:"#ff4d6d", meaning:"Psoas pulls lumbar into extension during hip flexion. Thomas test positive (hip remains elevated). Lumbar lordosis increased. Patient has LBP worsened by sitting and hip flexion. TREAT: release psoas → activate TA + glute max." },
          { val:"Overactive — glute inhibition", color:"#ffb300", meaning:"Psoas overactive because glute max is inhibited — psoas must do both flexion and extension stabilisation. Hip snapping (coxa saltans) may be present. Groin pain and anterior hip impingement symptoms." },
          { val:"Inhibited (rare)", color:"#7f5af0", meaning:"Psoas truly inhibited — weak hip flexion in fully shortened range. Rare. May indicate L2/3 nerve root involvement or hip flexor avulsion injury. Confirm with STTT resisted test." },
        ],
        treatment:"Release: psoas stretch (kneeling lunge, posterior pelvic tilt), SMR quads/hip flexors. Activate: TA drawing-in, glute bridges with focus on not allowing anterior tilt. Never aggressive psoas stretching without core activation.",
      },
      { id:"nkt_erector_spinae", label:"Erector Spinae", muscle:"Iliocostalis / Longissimus / Spinalis",
        compensator:"When overactive: compensating for inhibited TA, multifidus, or glute max",
        how:"Patient prone. Palpate erector spinae (lateral to spinous processes L1–L5 and thoracic). Ask patient to attempt TA activation (drawing-in) — if erector spinae fire instead of TA = overactive compensation. Test: ask patient to perform hip extension — if lumbar extensors fire before glute max = erector overactive as hip extensor substitute. Note: overactive erectors feel hard and tender at rest. Therapy localization: touch erectors → re-test TA or glute max.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Erector spinae active during lumbar extension tasks only. Not firing during TA activation attempts. Not dominant in hip extension. Normal resting tone." },
          { val:"Overactive — TA inhibition", color:"#ff4d6d", meaning:"Erectors fire during every attempted TA activation. Patient cannot isolate deep stabilisers. Core training is superficial muscle dominant. Chronic LBP pattern. TREAT: release erectors → activate TA immediately." },
          { val:"Overactive — glute max inhibition", color:"#ffb300", meaning:"Erectors fire during hip extension (creating lumbar extension to simulate hip extension). Deadlift and squat form breakdown. Lumbar pain with hip extension movements. TREAT: release erectors → activate glute max." },
          { val:"Overactive — bilateral lumbar spasm", color:"#7f5af0", meaning:"Bilateral erector spasm. Cannot relax lumbar musculature. Acute or chronic spasm pattern. Thoracolumbar fascia under constant tension. Treat: heat + SMR + TA activation in non-provoked positions." },
        ],
        treatment:"Release: foam roller thoracolumbar paraspinals (slow roll T12–L5, 90 sec). SMR with lacrosse ball lateral to spinous processes. Activate: TA drawing-in immediately, progress to bird-dog. Home: TA awareness during all daily movement.",
      },
      { id:"nkt_obliques", label:"Internal / External Obliques", muscle:"Internal oblique / External oblique",
        compensator:"When inhibited: erector spinae and QL compensate for rotation control",
        how:"Patient supine. Test: resist trunk rotation (patient attempts to rotate shoulders — therapist resists at shoulder). Feel and observe: if patient substitutes with hip hiking (QL) or lateral trunk flexion rather than rotation = obliques inhibited. Pallof press test: attach resistance band at side — patient holds band at sternum and resists rotation. If core collapses or rotates = oblique weakness. Therapy localization: touch QL or erectors → re-test anti-rotation strength. If stronger = obliques inhibited.",
        options:[
          { val:"Normal anti-rotation control", color:"#00c97a", meaning:"Obliques generate adequate trunk rotation and anti-rotation force. Pallof press held without collapse. Gait shows appropriate trunk counter-rotation with arm swing. No lateral trunk bending substitution." },
          { val:"Inhibited — rotation substitution", color:"#ff4d6d", meaning:"Obliques cannot resist rotation — QL and erectors substitute. Trunk rotates excessively during single-leg activities. Poor throwing/golf/tennis mechanics. TREAT: release QL → activate obliques (Pallof press, dead bug with rotation)." },
          { val:"Inhibited — post-partum / diastasis recti", color:"#ffb300", meaning:"Obliques inhibited following pregnancy/diastasis recti. Poor linea alba tension. Belly protrudes during sit-up attempts. Oblique activation must be performed without increasing intra-abdominal pressure. TREAT: TA first, then obliques." },
        ],
        treatment:"Release: QL and lateral lumbar SMR. Activate: Pallof press × 10 reps each side, dead bug with rotation, cable woodchops. Home: side plank progression × 3 × 20 sec.",
      },
      { id:"nkt_pelvic_floor", label:"Pelvic Floor", muscle:"Levator ani / Coccygeus / Sphincters",
        compensator:"When inhibited: superficial hip flexors overactive; when overactive: thigh adductors and piriformis co-contract",
        how:"Patient seated or supine. Observe breathing pattern — normal pelvic floor coordinates with diaphragm (descends on inhalation, rises on exhalation). Test: ask patient to gently activate pelvic floor (Kegel) without activating glutes or abductors. OVERACTIVITY: patient is hypervigilant, pain with palpation of inner thigh/perineum, cannot relax floor; INHIBITION: pelvic floor cannot resist Valsalva — stress incontinence. Therapy localization: touch adductors → re-test pelvic floor coordination.",
        options:[
          { val:"Normal coordination with breath", color:"#00c97a", meaning:"Pelvic floor activates and relaxes with breathing cycle. No stress incontinence. No pelvic pain. Coordinates with TA and diaphragm for IAP management." },
          { val:"Inhibited — stress incontinence pattern", color:"#ff4d6d", meaning:"Pelvic floor cannot generate adequate tension. Leakage with cough, jump, or sneeze. Often post-partum or post-pelvic surgery. TREAT: activate TA → coordinate with pelvic floor Kegel. Refer to pelvic physiotherapist." },
          { val:"Overactive — hypertonic pattern", color:"#ffb300", meaning:"Pelvic floor chronically contracted. Cannot relax. Pelvic pain, dyspareunia, tail bone pain. Adductors and piriformis also tight. TREAT: pelvic floor downtraining (relaxation breathing), adductor release." },
        ],
        treatment:"Inhibited: Kegel × 10 reps in coordination with exhalation, integrated TA + pelvic floor activation. Overactive: pelvic floor relaxation in hooklying with diaphragm breathing, adductor stretch, piriformis release. Refer to pelvic floor physiotherapist for complex presentations.",
      },
    ]
  },

  hip:{
    label:"Hip & Pelvis", color:"#f97316",
    intro:"Hip CPA identifies gluteal inhibition and compensation patterns. The most common global pattern: gluteus maximus inhibited → hamstrings and QL overactive → chronic LBP and hamstring strains. Gluteus medius inhibited → TFL and piriformis overactive → IT band, lateral hip pain, and Trendelenburg gait.",
    tests:[
      {
        id:"nkt_gmax", label:"Gluteus Maximus", muscle:"Gluteus maximus",
        compensator:"When inhibited: hamstrings, QL, piriformis compensate",
        how:"Patient prone. Ask for hip extension with knee bent (reduces hamstring contribution). Palpate both gluteus maximus and hamstrings simultaneously. Watch and feel which fires first. Normal: glute fires before hamstring. POSITIVE INHIBITION: hamstring fires first or glute never activates. Therapy localization: place one hand on hamstring and one on QL → re-test glute max contraction. If glute gets firmer with these contacts = confirmed compensation. Single-leg bridge test: patient bridges — if hamstring cramps or QL fires instead of glute = glute max inhibited.",
        options:[
          { val:"Facilitated — fires first", color:"#00c97a", meaning:"Gluteus maximus activates before hamstrings in prone hip extension. Full activation in bridge. No QL firing. Normal hip extension power and lumbar stability. Glute drives force through hip joint appropriately." },
          { val:"Inhibited — hamstring dominant", color:"#ffb300", meaning:"Hamstring fires first or simultaneously with glute. Glute activates late and weakly. Patient often has recurrent hamstring strains and chronic LBP. Hip extension generated by knee flexion (hamstring) not hip joint extension (glute). TREAT: release hamstrings → activate glute max immediately." },
          { val:"Inhibited — QL dominant", color:"#ff4d6d", meaning:"QL fires instead of glute max for hip extension. Patient extends spine (lateral tilt) to create apparent hip extension. Classic LBP pattern. Lateral lumbar pain and poor deadlift/hinge mechanics. TREAT: release QL → activate glute max." },
          { val:"Inhibited — bilateral, severe", color:"#7f5af0", meaning:"Both glutes inhibited. Patient cannot activate glutes in any position. Hamstrings, QL, and erector spinae all compensating. Patient has bilateral LBP, poor single-leg stability, and hip flexion-dominant movement pattern. Multiple-session CPA approach needed." },
        ],
        treatment:"Release: hamstrings SMR (foam roll posterior thigh 90 sec) + QL release (tennis ball lateral lumbar). Activate IMMEDIATELY within 30 seconds: glute bridges × 5 slow reps (focus on feeling glute, not hamstring), clamshells. Home: glute squeeze at top of every step throughout day.",
      },
      {
        id:"nkt_gmed", label:"Gluteus Medius", muscle:"Gluteus medius",
        compensator:"When inhibited: TFL, piriformis, QL compensate",
        how:"Patient sidelying. Hip abduction with slight extension and IR (targets posterior glute med fibres). Apply gentle resistance above knee. Normal: glute med fires. POSITIVE INHIBITION: TFL dominates (patient rolls slightly forward — anterior tilt during abduction) or QL hikes hip instead of abducting. Standing test: Trendelenburg — single-leg stance, observe contralateral pelvis. If drops = glute med inhibited on standing leg. Therapy localization: touch TFL → re-test glute med. If stronger = TFL compensating.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Glute med fires and holds abduction against resistance without pelvic tilt or TFL compensation. Trendelenburg negative. Normal single-leg pelvic stability. Gait shows no hip drop." },
          { val:"Inhibited — TFL dominant", color:"#ffb300", meaning:"TFL fires first — patient rolls into hip flexion during abduction (TFL is hip flexor + abductor). Lateral hip and knee pain. IT band tight. TREAT: release TFL → activate glute med (in slight extension, not flexion, to prevent TFL from dominating)." },
          { val:"Inhibited — piriformis dominant", color:"#ff4d6d", meaning:"Piriformis compensates for glute med — provides ER and abduction. Deep buttock pain. May mimic sciatica. Trendelenburg positive. TREAT: release piriformis → activate glute med." },
          { val:"Inhibited — QL dominant (Trendelenburg)", color:"#7f5af0", meaning:"QL hikes hip instead of glute med abducting it. Lateral trunk lean during gait. Classic Trendelenburg equivalent with trunk sway. Patient compensates by leaning over stance leg. TREAT: release QL → activate glute med." },
        ],
        treatment:"Release: TFL SMR (foam roll lateral hip, 90 sec), piriformis stretch + pressure. Activate: clamshells (slight hip extension, NOT flexion), sidelying hip abduction in extension, monster walks. Home: glute med activation every single-leg stance (standing in queue, brushing teeth).",
      },
      {
        id:"nkt_piriformis", label:"Piriformis", muscle:"Piriformis",
        compensator:"When overactive: compensating for inhibited glute med or glute max",
        how:"Patient prone or sidelying. Palpate piriformis (deep buttock, between PSIS and greater trochanter). If tender to palpation = active trigger points. Test: hip ER in prone — piriformis should contribute but not dominate. Overactivity test: flex hip 60° (piriformis becomes IR when hip flexed) and apply ER resistance — if this reproduces buttock pain = piriformis overactive. FAIR test: patient sidelying, affected side up, hip 60° flex, knee 90° — apply adduction + IR force. Positive = buttock pain. Therapy localization: touch piriformis → re-test glute med or glute max.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Piriformis contributes to ER appropriately. Not tender on palpation. No sciatic symptoms. Activates with hip ER without dominating the movement pattern." },
          { val:"Overactive — glute med compensation", color:"#ffb300", meaning:"Piriformis compensating for inhibited glute med. Deep buttock pain and lateral hip aching. Piriformis tender on palpation. Often causes pseudo-sciatica. TREAT: release piriformis → activate glute med." },
          { val:"Overactive — piriformis syndrome", color:"#ff4d6d", meaning:"Piriformis severely overactive. Compressing sciatic nerve (piriformis syndrome). Sciatica symptoms present (buttock to posterior thigh). SLR may be positive. FAIR test positive. TREAT: release piriformis (careful deep pressure, 90 sec) → activate glute med." },
          { val:"Overactive — glute max compensation", color:"#7f5af0", meaning:"Piriformis compensating for inhibited glute max during hip extension. Patient extends hip with lateral rotation (piriformis) rather than sagittal extension (glute max). Walking pattern shows toe-out on affected side. TREAT: release piriformis → activate glute max." },
        ],
        treatment:"Release: piriformis pressure release (patient prone, therapist elbow into piriformis at posterior hip, sustained 90 sec). Stretch: figure-4 stretch. Activate: glute med clamshells immediately after. Note: never aggressive piriformis stretching if true piriformis syndrome without releasing first.",
      },
      {
        id:"nkt_hip_flex_fo", label:"Hip Extension Firing Order", muscle:"Glute max + Hamstrings + QL + Erectors",
        compensator:"N/A — tests firing sequence",
        how:"Patient prone. Both hands palpating: one on glute max, one on hamstring (or QL or erector). Ask for hip extension slowly from neutral. Count which fires first. Repeat 3 times for reliability. Normal sequence: Glute max fires first → ipsilateral hamstring → contralateral erector → ipsilateral erector. Any deviation = abnormal motor pattern. Also test in single-leg bridge: which fires to lift pelvis?",
        options:[
          { val:"Normal — Glute max fires first", color:"#00c97a", meaning:"Correct motor program. Gluteus maximus initiates hip extension before hamstrings or spinal extensors. MCC has correct motor sequence stored. Low injury risk for hamstrings and lumbar spine." },
          { val:"Abnormal — Hamstring fires first", color:"#ffb300", meaning:"Hamstring dominant hip extension. Glute max delayed or absent. Lumbar spine overloaded. Patient has hamstring strains and LBP. TREAT: release hamstrings → activate glute max → retrain hip extension pattern." },
          { val:"Abnormal — QL fires first", color:"#ff4d6d", meaning:"QL initiates — patient tilts pelvis to extend hip. No true hip extension occurring. Lumbar spine does the work. Chronic LBP pattern. TREAT: release QL → activate glute max → hip hinge retraining." },
          { val:"Abnormal — Erector spinae fires first", color:"#7f5af0", meaning:"Spinal extensors dominate. Patient uses lumbar extension to simulate hip extension. Severe glute and hamstring inhibition. Often seen in persistent LBP with spinal extension fear. TREAT: release erectors → activate TA + glute max simultaneously." },
        ],
        treatment:"Release: whichever muscle fired first (dominant compensator). Activate: glute max in prone isolation. Retrain: hip hinge pattern (Romanian deadlift) focusing on glute-driven extension. Home: glute max squeeze during every hip extension activity.",
      },
    ]
  },

  knee:{
    label:"Knee & Thigh", color:"#00c97a",
    intro:"Knee CPA focuses on the VMO vs VL relationship, hamstring-glute co-activation balance, and popliteus as a forgotten stabiliser. Common patterns: VMO inhibited → VL overactive → PFPS | hamstrings overactive (compensating for glute max) → posterior knee pain.",
    tests:[
      {
        id:"nkt_vmo", label:"Vastus Medialis Oblique (VMO)", muscle:"VMO",
        compensator:"When inhibited: VL (vastus lateralis) overactive → patellar maltracking",
        how:"Patient seated, knee at 30°. Palpate VMO (teardrop shape at medial lower thigh) and VL (lateral thigh) simultaneously. Ask patient to straighten knee slowly. Normal: VMO fires simultaneously or slightly before VL at final 30° of extension. POSITIVE INHIBITION: VL fires first and dominates throughout — VMO barely activates. Also test: terminal knee extension (TKE) — last 10° should activate VMO strongly. If VMO absent = inhibited.",
        options:[
          { val:"VMO facilitated — fires with VL", color:"#00c97a", meaning:"VMO activates with equal or slightly greater force than VL at terminal extension. Patella tracks medially within trochlear groove. No PFPS symptoms with squatting or stairs." },
          { val:"VMO inhibited — VL dominant", color:"#ffb300", meaning:"VL fires before and more strongly than VMO. Patella tracks laterally. Patient has anterior knee pain on stairs, squatting, sitting. IT band and lateral retinaculum tight. TREAT: release VL + IT band → activate VMO (terminal knee extension)." },
          { val:"VMO inhibited — post knee injury/surgery", color:"#ff4d6d", meaning:"VMO inhibited following ACL reconstruction, meniscectomy, or knee trauma. MCC switched off VMO as protective response. Patient has persistent quad weakness post-operatively despite exercise. CPA approach: release VL → activate VMO before quad sets." },
          { val:"VMO inhibited — hip weakness contributor", color:"#7f5af0", meaning:"VMO inhibited as part of valgus chain — glute med inhibited → knee valgus → VMO inhibited. Address glute med first, then VMO. Terminal knee extension + glute med activation simultaneously." },
        ],
        treatment:"Release: VL SMR (foam roll lateral thigh 90 sec) + IT band (roller lateral knee). Activate: terminal knee extension (TKE) with theraband, step-ups focusing on medial knee control. Home: TKE × 20 reps hourly, VMO squeeze at full extension.",
      },
      {
        id:"nkt_hamstrings", label:"Hamstrings", muscle:"Biceps femoris / Semimembranosus / Semitendinosus",
        compensator:"When overactive: compensating for inhibited glute max",
        how:"Patient prone. Test knee flexion resistance at 90°. Palpate hamstring belly. Overactive hamstrings: fire during activities they shouldn't (hip extension, standing). Test: prone hip extension — if hamstring fires before glute max = overactive compensator. Hamstring cramp during bridge = overactive (normal = glute does the work). Biceps femoris vs medial hamstring: test ER vs IR during knee flexion resistance.",
        options:[
          { val:"Normal — glute max dominant in extension", color:"#00c97a", meaning:"Hamstrings contribute to knee flexion appropriately. Do not dominate hip extension. Do not cramp during bridges. Glute max does the majority of hip extension work. No recurrent hamstring strains." },
          { val:"Overactive — glute max inhibition", color:"#ff4d6d", meaning:"Hamstrings overactive as hip extensors. Patient has recurrent hamstring strains (the compensator always gets injured, not the root cause). LBP. Hamstring 'tightness' that doesn't resolve with stretching (CPA rule: overactive muscles feel tight but aren't short). TREAT: release hamstrings → activate glute max." },
          { val:"Biceps femoris overactive — lateral chain", color:"#ffb300", meaning:"Biceps femoris specifically overactive. Lateral hamstring tightness. External rotation of tibia at knee. IT band and lateral knee pain. Often compensating for weak glute med. TREAT: release biceps femoris → activate glute med." },
          { val:"Medial hamstrings overactive — medial chain", color:"#7f5af0", meaning:"Medial hamstrings overactive. Internal tibial rotation. Compensating for inhibited adductors or popliteus. Medial knee pain. TREAT: release medial hamstrings → activate adductors or glute max." },
        ],
        treatment:"Release: foam roll hamstrings (posterior thigh, 90 sec). Stretch only AFTER CPA release (stretching alone won't fix overactive hamstrings). Activate: glute max exercises immediately. Home: glute-dominant bridge practice — feel the glute, not the hamstring.",
      },
      { id:"nkt_adductors", label:"Hip Adductors", muscle:"Adductor magnus / Longus / Brevis / Gracilis",
        compensator:"When overactive: compensating for inhibited glute max or medial hamstrings",
        how:"Patient sidelying (affected side up). Apply gentle resistance to hip adduction (push bottom leg up toward top). Palpate adductor group (medial thigh). POSITIVE OVERACTIVITY: adductors fire hard at rest or dominate hip extension. Test: supine — patient squeezes pillow between knees. If adductors cramp = overactive. Therapy localization: touch adductors → re-test glute max or medial hamstrings.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Adductors contribute to hip adduction and extension (adductor magnus) proportionally. Not dominant in hip extension. Not cramping at rest. Normal inner thigh tension." },
          { val:"Overactive — medial chain", color:"#ff4d6d", meaning:"Adductors overactive causing knee valgus tendency and medial tibial rotation. Medial knee pain. Groin strain risk. Often compensating for glute max. TREAT: release adductors → activate glute max + VMO." },
          { val:"Inhibited — lateral chain dominance", color:"#ffb300", meaning:"Adductors inhibited — TFL and IT band dominate lateral hip. Knee varus tendency. Poor sagittal plane hip control. Weakness in adduction particularly. TREAT: release TFL → activate adductors." },
        ],
        treatment:"Release: adductor SMR (foam roll inner thigh, 90 sec). Activate: glute max bridging with adductor squeeze. Home: side-lying adductor lifts × 15 reps, Copenhagen plank progression.",
      },
      { id:"nkt_tfl", label:"Tensor Fasciae Latae (TFL)", muscle:"Tensor fasciae latae",
        compensator:"When overactive: compensating for inhibited glute med or glute max",
        how:"Patient supine or sidelying. Palpate TFL (lateral hip, between anterior iliac crest and iliotibial band, distal to ASIS). Ask patient to flex, abduct, and IR the hip — TFL does all three. POSITIVE OVERACTIVITY: TFL fires during pure abduction (should be glute med) or is tender and firm at rest. Ober test: patient sidelying, test hip drops to table — cannot adduct past neutral = TFL/IT band tight. Therapy localization: touch TFL → re-test glute med. If glute med activates more = TFL compensating.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"TFL assists hip flexion and IR proportionally. Not dominant in abduction (glute med does that). Ober test: hip adducts past neutral. No lateral hip pain at rest." },
          { val:"Overactive — glute med inhibition", color:"#ff4d6d", meaning:"TFL dominant in abduction. Flexes hip during intended abduction — patient rolls forward. IT band tight (Ober positive). Lateral hip and knee pain. TREAT: release TFL → activate glute med in slight extension (not flexion, prevents TFL re-domination)." },
          { val:"Overactive — IT band syndrome", color:"#ffb300", meaning:"TFL chronically overactive → IT band under chronic tension → iliotibial band syndrome. Lateral knee pain with running. Noble compression test positive. TREAT: TFL SMR + glute max and glute med activation." },
        ],
        treatment:"Release: TFL SMR (foam roll lateral hip between ASIS and greater trochanter, 90 sec). Activate: glute med in slight extension (clamshells). Never stretch TFL alone — activate glute med first. Home: lateral band walks.",
      },
      { id:"nkt_rectus_fem", label:"Rectus Femoris", muscle:"Rectus femoris",
        compensator:"When overactive: compensating for inhibited iliopsoas or VMO",
        how:"Patient prone. Knee flexion passive test: flex knee to end range — if pelvis anteriorly tilts (ASIS lifts) before reaching full knee flexion = rectus femoris overactive/shortened. Ely's test: patient prone, flex knee — if ipsilateral hip rises = RF shortened. Active test: seated — resist knee extension. RF fires powerfully. Compare to VL. Therapy localization: touch RF belly → re-test VMO.",
        options:[
          { val:"Normal length and tone", color:"#00c97a", meaning:"Knee can flex fully prone without pelvis rising. Ely's test negative. RF contributes to knee extension without dominating. Pelvis remains neutral during hip flexion." },
          { val:"Overactive — anterior pelvic tilt", color:"#ff4d6d", meaning:"RF shortened and overactive. Pulls ASIS forward, increasing anterior pelvic tilt. Ely's test positive. LCS pattern contributor. Patient has anterior knee pain and hip flexion tightness. TREAT: release RF → activate glute max + VMO." },
          { val:"Overactive — VMO inhibition", color:"#ffb300", meaning:"RF overactive and dominates terminal knee extension while VMO is inhibited. Patellar tracking laterally. PFPS pattern. TREAT: release RF → activate VMO (terminal knee extension)." },
        ],
        treatment:"Release: RF SMR (foam roll anterior thigh, 90 sec). Stretch: kneeling hip flexor with posterior pelvic tilt. Activate: VMO terminal knee extension immediately. Home: couch stretch × 2 min each side daily.",
      },
      { id:"nkt_popliteus", label:"Popliteus", muscle:"Popliteus",
        compensator:"When inhibited: LCL, posterior capsule overloaded; when overactive: lateral knee pain",
        how:"Patient prone, knee at 90°. Palpate popliteal fossa (posterior knee joint line, medial to biceps femoris). Apply gentle IR of tibia (internal rotation) at 90° flexion — popliteus unlocks knee (screw-home mechanism reversal). POSITIVE INHIBITION: lateral tibial rotation persists during knee flexion initiation (popliteus cannot unlock knee). Positive if posterior-lateral knee pain with resisted IR at 30° flexion. Therapy localization: touch lateral hamstrings → re-test popliteus IR.",
        options:[
          { val:"Normal — unlocks knee smoothly", color:"#00c97a", meaning:"Popliteus IR of tibia during knee flexion initiation smooth and painfree. No lateral knee pain. Normal knee unlocking pattern in gait." },
          { val:"Inhibited — lateral knee instability", color:"#ff4d6d", meaning:"Popliteus cannot IR tibia during knee flexion. Lateral knee instability, especially on rough terrain. 'Joint locking' sensation. TREAT: release biceps femoris → activate popliteus (gentle resisted IR at 30° knee flexion)." },
          { val:"Overactive — posterior-lateral knee pain", color:"#ffb300", meaning:"Popliteus tendinopathy. Pain at posterolateral knee especially downhill walking. Often compensating for LCL laxity or excessive external tibial rotation. Release popliteus → address tibial rotation pattern above." },
        ],
        treatment:"Release: popliteus pressure (posterior-lateral knee, gentle sustained 60 sec). Activate: resisted tibial IR at 30° knee flexion. Home: step-downs with medial knee control cue, lateral ankle stability training.",
      },
    ]
  },

  ankle:{
    label:"Ankle & Foot", color:"#ffb300",
    intro:"Ankle CPA identifies compensation between tibialis anterior/posterior and the peroneals, and the effect of limited dorsiflexion on the kinetic chain. Classic pattern: tibialis anterior inhibited → peroneals overactive → ankle instability. Tibialis posterior inhibited → peroneals + gastroc overactive → progressive flatfoot.",
    tests:[
      {
        id:"nkt_tib_ant", label:"Tibialis Anterior", muscle:"Tibialis anterior",
        compensator:"When inhibited: peroneals + EHL compensate for dorsiflexion",
        how:"Patient seated. Dorsiflex and invert foot against gentle resistance (this isolates tibialis anterior). Palpate belly (anterior shin). Normal: strong activation with dorsiflexion + inversion. POSITIVE INHIBITION: foot everts instead of inverting (peroneal compensation), or EHL fires to dorsiflex instead. Therapy localization: touch peroneus longus belly → re-test tibialis anterior. If stronger = peroneal compensating.",
        options:[
          { val:"Facilitated — normal", color:"#00c97a", meaning:"Tibialis anterior fires strongly during dorsiflexion + inversion. No compensation from peroneals. Ankle DF ROM normal. Foot clears during swing phase of gait without hip hiking." },
          { val:"Inhibited — peroneal dominant", color:"#ffb300", meaning:"Peroneus longus/brevis dominate dorsiflexion attempt — foot everts. Patient has ankle instability and recurrent inversion sprains (peroneals overloaded as compensators). TREAT: release peroneals → activate tib ant." },
          { val:"Inhibited — foot drop pattern", color:"#ff4d6d", meaning:"Severe tib ant inhibition — L4 nerve root or peroneal nerve involvement must be excluded. If neurological clear = MCC inhibition. Patient hikes hip to clear foot. TREAT: release peroneals → intensive tib ant activation with neuromuscular electrical stimulation if needed." },
          { val:"Inhibited — shin splint pattern", color:"#7f5af0", meaning:"Tib ant inhibited causing peroneals to overwork → medial tibial stress syndrome (shin splints). Pain along medial tibia. Patient cannot eccentrically control pronation. TREAT: release peroneals → activate tib ant eccentrically." },
        ],
        treatment:"Release: peroneal SMR (roller lateral lower leg from fibular head to ankle, 90 sec). Activate: seated tibialis anterior activation (dorsiflex + invert against theraband). Home: heel walks × 2 minutes daily.",
      },
      {
        id:"nkt_tib_post", label:"Tibialis Posterior", muscle:"Tibialis posterior",
        compensator:"When inhibited: peroneals overactive, foot pronates progressively",
        how:"Patient seated. Plantarflex and invert foot against resistance (plantar inversion isolates tib posterior). Palpate behind medial malleolus. POSITIVE INHIBITION: weak inversion in plantar flexion, or foot cannot resist eversion. Navicular drop test: mark navicular tuberosity in sitting, then standing — drop >10mm = tib post inhibition (arch collapse). Therapy localization: touch peroneals → re-test tib post.",
        options:[
          { val:"Normal — arch maintained", color:"#00c97a", meaning:"Tibialis posterior supports medial arch. Navicular drop <6mm. Strong plantar inversion resistance. No progressive flatfoot. Arch maintained in single-leg stance." },
          { val:"Inhibited — medial arch collapse", color:"#ffb300", meaning:"Tib post weakened. Medial arch collapses. Navicular drop 6–10mm. Early stage adult-acquired flatfoot. Pronation chain activates: tibial IR, knee valgus, anterior pelvic tilt. TREAT: release peroneals → activate tib post (heel raises in inversion)." },
          { val:"Inhibited — progressive flatfoot", color:"#ff4d6d", meaning:"Tib post significantly inhibited or partially ruptured. Navicular drop >10mm. 'Too many toes' sign (>2 toes visible behind heel from behind). Pain medial ankle. Refer for ultrasound/MRI. CPA: release peroneals → activate tib post + intrinsics." },
          { val:"Severely inhibited — tib post dysfunction", color:"#7f5af0", meaning:"Posterior tibial tendon dysfunction. Cannot perform single-leg heel raise. Progressive collapse of medial arch. Refer to orthopaedic/podiatry. Conservative: orthotics + aggressive tib post strengthening + peroneal release." },
        ],
        treatment:"Release: peroneal SMR + gastroc-soleus stretch. Activate: heel raises in slight inversion (on slightly inverted surface), towel scrunches, short foot exercise. Orthotics if severe. Home: short foot exercise × 20 reps, single-leg balance on slight inversion.",
      },
      {
        id:"nkt_gastroc", label:"Gastrocnemius / Soleus", muscle:"Gastroc-soleus complex",
        compensator:"When overactive: compensating for weak glutes or limited ankle DF; restricts kinetic chain",
        how:"Patient prone, knee extended. Test ankle dorsiflexion passively (normal: 20°). Limited DF = gastroc overactive or shortened. Weight-bearing lunge test: patient lunges with foot against wall — knee to wall distance (normal: 10cm from wall). <7cm = gastroc restriction. Test tightness: DF with knee extended (gastroc) vs knee bent (soleus). If DF better with knee bent = gastrocnemius tight. Therapy localization: touch gastroc → re-test tib ant. If better = gastroc compensating.",
        options:[
          { val:"Normal length and tone", color:"#00c97a", meaning:"Ankle DF normal (20°+). Lunge test: knee reaches wall at 10cm. No calf cramping during activity. Kinetic chain not restricted at ankle. Gastroc-soleus contribute to plantar flexion without restricting dorsiflexion." },
          { val:"Overactive — DF restriction", color:"#ffb300", meaning:"Gastroc overactive and shortened. Restricts ankle DF (<15°). Causes compensatory knee valgus, foot pronation, anterior pelvic tilt during squats. TREAT: gastroc SMR → ankle DF mobilisation → squat correction." },
          { val:"Overactive — glute compensation", color:"#ff4d6d", meaning:"Gastroc overactive as kinetic chain compensator for inhibited glutes. Patient pushes through calf during walking/running (calf dominance) rather than glute-driven propulsion. Calf strains common. TREAT: release gastroc → activate glute max." },
          { val:"Overactive — Achilles tendinopathy pattern", color:"#7f5af0", meaning:"Gastroc-soleus chronically overloaded. Tendon cannot tolerate load. Achilles tendinopathy developing or established. CPA: release peroneals + glute max activation (reduce calf load). Eccentric Achilles loading as adjunct." },
        ],
        treatment:"Release: gastroc SMR (foam roll calf from Achilles to popliteal crease, 90 sec). Stretch: straight-leg calf stretch 30 sec × 2. Activate: tib ant + tib post to balance. Home: wall lunge DF stretch × 3 daily, strengthening glutes to reduce calf overload.",
      },
      { id:"nkt_peroneals", label:"Peroneals (Peroneus Longus / Brevis)", muscle:"Peroneus longus / Peroneus brevis",
        compensator:"When overactive: compensating for inhibited tib anterior or tib posterior",
        how:"Patient seated. Evert foot against gentle resistance — peroneals activate. Palpate peroneal belly (lateral lower leg, posterior to fibula). POSITIVE OVERACTIVITY: peroneals fire during dorsiflexion attempt (should be tib ant), foot everts instead of dorsiflexing. Ankle instability with recurrent inversion sprains (peroneals overloaded). Test: therapy localization — touch peroneus longus → re-test tib ant or tib post. If either suddenly stronger = peroneals compensating.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Peroneals activate for eversion and lateral ankle stability only. Do not dominate dorsiflexion. Ankle stable in single-leg stance. No recurrent inversion sprains." },
          { val:"Overactive — tib ant inhibition", color:"#ff4d6d", meaning:"Peroneals overactive compensating for inhibited tib ant. Foot everts during swing phase instead of dorsiflexing. Recurrent ankle sprains (overloaded peroneals fatigue). TREAT: release peroneals → activate tib ant." },
          { val:"Overactive — tib post inhibition", color:"#ffb300", meaning:"Peroneals overactive pulling foot into eversion as arch collapses. Progressive flatfoot. Navicular drop >10mm. Peroneal longus cannot control 1st ray plantar flexion. TREAT: release peroneals → activate tib post + intrinsics." },
        ],
        treatment:"Release: peroneal SMR (roller from fibular head to lateral malleolus, 90 sec). Activate: tib ant (heel walks) or tib post (inversion heel raises) immediately. Home: balance board training for proprioception.",
      },
      { id:"nkt_fhl", label:"Flexor Hallucis Longus (FHL)", muscle:"Flexor hallucis longus",
        compensator:"When inhibited: plantar fascia overloaded; when overactive: hallux impingement",
        how:"Patient supine. Resist great toe flexion (MTP and IP joints) while palpating posterior medial ankle (FHL tendon behind medial malleolus). Normal: strong great toe flexion (= 'toe-off' power). POSITIVE INHIBITION: great toe cannot flex against resistance, or medial arch collapses during single-leg stance. Test: single-leg heel rise — observe great toe grip. No grip = FHL inhibited. Therapy localization: touch FHL tendon → re-test arch stability.",
        options:[
          { val:"Normal", color:"#00c97a", meaning:"FHL strong in great toe flexion. Provides windlass mechanism tension during toe-off. Medial arch stable in single-leg stance. Normal push-off during gait." },
          { val:"Inhibited — plantar fascia overload", color:"#ff4d6d", meaning:"FHL inhibited — plantar fascia must provide all longitudinal arch tension. Plantar fasciitis develops. Hallux cannot grip during push-off. TREAT: release plantar fascia → activate FHL (towel scrunches, marble pick-ups)." },
          { val:"Overactive — posterior ankle impingement", color:"#ffb300", meaning:"FHL overactive and tight. Posterior ankle impingement (triggers at extreme plantar flexion or dorsiflexion). Dancer's/footballer's ankle. Tendon snaps medially. Release FHL tendon → joint mobilisation." },
        ],
        treatment:"Release: FHL SMR (gentle pressure behind medial malleolus, 60 sec). Activate: towel scrunches, marble pick-up, single-leg heel rise with great toe contact cue. Home: short foot exercise + great toe floor contact awareness.",
      },
      { id:"nkt_foot_intrinsics", label:"Foot Intrinsic Muscles", muscle:"Lumbricals / Interossei / Abductor hallucis",
        compensator:"When inhibited: plantar fascia and extrinsic toe flexors overloaded",
        how:"Patient seated or standing. Test: ask patient to perform 'short foot exercise' — shorten foot without curling toes (activate intrinsics only). Positive inhibition: patient curls toes (extrinsic flexors compensate) or cannot shorten foot at all. Observe navicular position — if drops >6mm in standing vs seated = intrinsics insufficient. Palpate abductor hallucis (medial arch) — should be palpable and firm in single-leg stance. Therapy localization: touch plantar fascia → re-test intrinsic activation.",
        options:[
          { val:"Normal — short foot achievable", color:"#00c97a", meaning:"Can perform short foot without toe curling. Abductor hallucis palpable and active. Navicular drop <6mm. Arch stable during single-leg stance. Normal toe splaying on ground contact." },
          { val:"Inhibited — arch collapse", color:"#ff4d6d", meaning:"Cannot perform short foot. Toes curl instead. Arch collapses in single-leg stance. Plantar fascia and extrinsic toe flexors overloaded. Pronation cascade up kinetic chain. TREAT: release plantar fascia → activate short foot + abductor hallucis." },
          { val:"Inhibited — bunion / hallux valgus", color:"#ffb300", meaning:"Abductor hallucis inhibited — hallux adducts toward 2nd toe. Bunion forming or established. Intrinsics too weak to maintain medial column alignment. Short foot exercise priority. Consider orthotic support." },
        ],
        treatment:"Release: plantar fascia SMR (golf ball roll under arch, 90 sec). Activate: short foot × 20 reps, abductor hallucis activation (spread toes, especially great toe medially). Home: barefoot training on varied surfaces × 15 min daily.",
      },
    ]
  },

  upper_limb:{
    label:"Elbow, Wrist & Hand", color:"#e879f9",
    intro:"Upper limb CPA identifies motor control dysfunction from elbow to hand. Common patterns: wrist extensor inhibition → wrist flexors overactive (lateral epicondylalgia), biceps overactive compensating for RC inhibition, grip weakness from cervical radiculopathy or motor control inhibition. Per CPA: the elbow and wrist are frequently affected by DISTANT inhibition (cervical, shoulder).",
    tests:[
      { id:"nkt_biceps", label:"Biceps Brachii", muscle:"Biceps brachii (long + short head)",
        compensator:"When overactive: compensating for inhibited RC (supraspinatus/subscapularis)",
        how:"Patient seated, elbow at 90°, forearm supinated. Resist elbow flexion. Palpate biceps belly. POSITIVE OVERACTIVITY: biceps fires powerfully and early in shoulder flexion (should not initiate shoulder movement). Humeral head translates anteriorly with shoulder flexion = biceps compensating for RC. Test: therapy localization — touch biceps → re-test supraspinatus or DNF. If either stronger = biceps compensating.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Biceps contributes to elbow flexion and forearm supination appropriately. Not dominant in shoulder flexion. No anterior shoulder pain on biceps loading." },
          { val:"Overactive — RC inhibition", color:"#ff4d6d", meaning:"Biceps overactive at shoulder, compensating for RC. Anterior shoulder pain especially on overhead activities. Bicipital groove tender. TREAT: release biceps (cross-fibre belly massage) → activate infraspinatus/supraspinatus." },
          { val:"Overactive — shoulder instability", color:"#ffb300", meaning:"Biceps long head overactive attempting to stabilise anterior glenohumeral joint. Usually post-instability or SLAP tear. Treat underlying instability and rotator cuff first." },
        ],
        treatment:"Release: biceps cross-fibre massage 60 sec. Supination stretch (hold elbow extended, pronate forearm gently). Activate: RC exercises (sidelying ER). Home: no aggressive biceps stretching without RC activation.",
      },
      { id:"nkt_triceps", label:"Triceps Brachii", muscle:"Triceps brachii (long / lateral / medial head)",
        compensator:"When inhibited: posterior deltoid and anconeus compensate",
        how:"Patient prone, elbow at 90°. Resist elbow extension (push forearm toward ceiling). Palpate triceps belly. POSITIVE INHIBITION: triceps weak and painless (C7 radiculopathy first); weak and painful (muscle lesion). Positive overactivity: triceps fires during elbow flexion attempts (rare — indicates neurological irritation). Therapy localization: touch posterior deltoid → re-test triceps. If triceps stronger = posterior deltoid compensating.",
        options:[
          { val:"Normal strength — C7 intact", color:"#00c97a", meaning:"Triceps extends elbow strongly against resistance. No C7 dermatomal changes. Normal push-up strength. Posterolateral elbow not painful." },
          { val:"Inhibited — C7 radiculopathy", color:"#ff4d6d", meaning:"Weak and painless triceps = C7 nerve root compression. Check C7 dermatome (middle finger), reflex (triceps jerk). Refer for MRI. Cervical neural mobilisation." },
          { val:"Inhibited — triceps tendinopathy", color:"#ffb300", meaning:"Strong and painful triceps = triceps tendinopathy at olecranon insertion. DTFM to tendon. Eccentric loading. Home: triceps eccentric press-ups." },
        ],
        treatment:"Inhibited (neurological): cervical neural mobilisation, MRI referral, nerve gliding. Inhibited (motor control): release posterior deltoid → activate triceps. Tendinopathy: DTFM, eccentric loading.",
      },
      { id:"nkt_wrist_ext", label:"Wrist Extensors (ECRB / ECRL)", muscle:"Extensor carpi radialis brevis / longus",
        compensator:"When inhibited: wrist flexors overactive — lateral epicondylalgia pattern",
        how:"Patient seated, elbow extended, forearm pronated. Resist wrist extension (dorsiflexion). Palpate ECRB (lateral epicondyle → 3rd metacarpal base). POSITIVE INHIBITION: weak wrist extension, lateral epicondyle tender. Overactivity: wrist extensors chronically tense (keyboard workers) — limit wrist flexion. Test: therapy localization — touch wrist flexors (FCR/FCU) → re-test wrist extensors.",
        options:[
          { val:"Normal strength", color:"#00c97a", meaning:"ECRB/ECRL extend wrist strongly against resistance. No lateral epicondyle pain. Normal grip strength. Full wrist flexion available passively." },
          { val:"Inhibited — lateral epicondylalgia", color:"#ff4d6d", meaning:"Wrist extensors inhibited and painful (lateral epicondylalgia). Wrist flexors overactive as compensators. TREAT: release FCR/FCU (wrist flexor SMR) → activate ECRB (eccentric wrist extension)." },
          { val:"Overactive — repetitive strain", color:"#ffb300", meaning:"Wrist extensors overactive and shortened from repetitive use (typing, gripping). Restrict wrist flexion. Lateral forearm tension. Release wrist extensors (forearm roller SMR) → activate wrist flexors." },
        ],
        treatment:"Release: wrist flexor SMR (forearm roller medial, 60 sec). Activate: eccentric wrist extension × 15 reps (Tyler twist). DTFM to lateral epicondyle if tender. Home: eccentric wrist extension daily.",
      },
      { id:"nkt_wrist_flex", label:"Wrist Flexors (FCR / FCU)", muscle:"Flexor carpi radialis / ulnaris",
        compensator:"When overactive: compensating for inhibited wrist extensors — medial epicondylalgia",
        how:"Patient seated, forearm supinated. Resist wrist flexion. Palpate FCR (medial forearm, between palmaris and pronator teres) and FCU (ulnar wrist). POSITIVE OVERACTIVITY: wrist flexors fire during gripping (expected) but also dominate wrist stabilisation when they should not. Medial epicondyle tender. Test: therapy localization — touch FCU → re-test FCR or ECRB.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Wrist flexors activate for grip and wrist flexion tasks. Not dominant in wrist extension tasks. No medial epicondyle pain at rest." },
          { val:"Overactive — medial epicondylalgia", color:"#ff4d6d", meaning:"Wrist flexors overactive and tender at medial epicondyle. Medial epicondylalgia. TREAT: release wrist flexors (SMR medial forearm) → activate wrist extensors." },
          { val:"Inhibited — grip weakness", color:"#ffb300", meaning:"Wrist flexors inhibited — grip significantly weak. Rule out C8/T1 radiculopathy, cubital tunnel, or carpal tunnel. CPA: release wrist extensors → activate wrist flexors." },
        ],
        treatment:"Release: forearm flexor SMR (medial forearm rolling, 60 sec). DTFM to medial epicondyle if golfer's elbow. Activate: eccentric wrist flexion. Home: forearm stretching + grip strengthening progression.",
      },
      { id:"nkt_pronator", label:"Pronator Teres / Quadratus", muscle:"Pronator teres / Pronator quadratus",
        compensator:"When overactive: restricts supination, compresses median nerve",
        how:"Patient seated, elbow at 90°. Apply resistance to pronation. Palpate pronator teres (medial elbow to mid-radius). POSITIVE OVERACTIVITY: pronator teres dominates and is tender on palpation at medial elbow. Limited passive supination. Median nerve compression symptoms (pronator syndrome). Test: therapy localization — touch pronator teres → re-test biceps supination strength.",
        options:[
          { val:"Normal tone", color:"#00c97a", meaning:"Pronation achieved without dominance. Supination full and painless. No median nerve symptoms with sustained forearm tasks." },
          { val:"Overactive — supination restriction", color:"#ff4d6d", meaning:"Pronator teres overactive. Limits supination → wrist extensors compensate → lateral epicondylalgia risk. Common in desk workers. TREAT: release pronator teres → activate supinator + biceps." },
          { val:"Overactive — pronator syndrome", color:"#ffb300", meaning:"Pronator teres compressing median nerve. Forearm aching + hand tingling (thumb, index, middle). Worsens with repetitive pronation. Differentiate from CTS: pronator syndrome worsens with pronation, not wrist flexion. Release + nerve gliding." },
        ],
        treatment:"Release: pronator teres cross-fibre massage at medial elbow 60 sec. Activate: supinator (resisted supination) and biceps immediately. Nerve gliding if compression symptoms. Home: forearm rotation mobility × 20 reps.",
      },
      { id:"nkt_grip", label:"Grip / Hand Intrinsics", muscle:"FDP / FDS / Lumbricals / Interossei",
        compensator:"When inhibited: extrinsic forearm flexors overactive — carpal tunnel risk",
        how:"Patient seated. Use hand dynamometer or clinician resistance for grip strength. Normal: dominant 35–45 kg, non-dominant 30–40 kg. Test intrinsics: ask patient to flex MCP joints while keeping IP joints extended (lumbrical action). If IPs flex instead = lumbricals inhibited, extrinsic flexors dominate. Therapy localization: touch forearm flexors (FDP/FDS) → re-test intrinsic grip.",
        options:[
          { val:"Normal grip strength", color:"#00c97a", meaning:"Normal grip for age/sex. Intrinsics and extrinsics balanced. No hand fatigue with sustained tasks. Normal MCP flexion with IP extension (lumbrical action)." },
          { val:"Inhibited — neurological cause", color:"#ff4d6d", meaning:"Grip weak + dermatomal changes. C8/T1 radiculopathy (ring + little finger weakness) or median nerve (thumb + index). Cubital tunnel or carpal tunnel. Neurological referral + neural mobilisation." },
          { val:"Inhibited — overuse inhibition", color:"#ffb300", meaning:"Grip weak without clear neurological cause. Often follows prolonged gripping tasks (climbers, manual workers). Extrinsic flexors overactive. TREAT: release forearm flexors → activate intrinsics (lumbrical isolation, putty exercises)." },
        ],
        treatment:"Release: forearm flexor SMR, wrist flexor stretch. Activate: intrinsic isolation exercises (lumbrical set, putty pinch). Neural mobilisation if carpal/cubital tunnel suspected. Home: grip strengthening with proper wrist alignment.",
      },
    ]
  },
};

// ─── KINETIC CHAIN REGION DATABASE ───────────────────────────────────────────
const KC_REGIONS = {
  foot_ankle:{
    label:"Foot & Ankle", color:"#ffb300", role:"MOBILITY",
    intro:"The foot and ankle are the first MOBILE link of the lower kinetic chain. Their job is to absorb ground reaction forces and provide adequate dorsiflexion for squatting, running, and stair-climbing. When mobility is lost here, ALL joints above compensate — creating knee valgus, foot pronation, anterior pelvic tilt, and lumbar overload.",
    tests:[
      {
        id:"kc_ankle_df", label:"Weight-Bearing Dorsiflexion — Lunge Test",
        role:"MOBILITY TEST", joint:"Ankle (talocrural)",
        how:"Patient stands facing wall. Place foot 10cm from wall. Lunge knee toward wall keeping heel flat on floor. Measure knee-to-wall distance. If heel lifts before knee reaches wall = restricted. Normal: knee reaches wall at 10cm+ without heel rising. Also test in non-weight-bearing: patient supine, passively dorsiflex ankle — normal 20°+.",
        options:[
          { val:"Normal — ≥10cm / 20°+", color:"#00c97a", meaning:"Adequate dorsiflexion for all functional tasks. Kinetic chain above ankle is not restricted by DF limitation. No compensation patterns driven from ankle." },
          { val:"Mildly restricted — 7–9cm / 15–19°", color:"#ffb300", meaning:"Mild DF limitation. Patient compensates with slight foot pronation, tibial internal rotation, and mild knee valgus during squats/stairs. Gastroc-soleus mildly tight. Begin DF mobility work." },
          { val:"Moderately restricted — 4–6cm / 10–14°", color:"#ff6b35", meaning:"Moderate DF restriction. Significant compensation: foot hyperpronation, knee valgus, anterior pelvic tilt, and lumbar extension during squat. This is a primary driver of knee pain in runners/athletes. Gastroc, soleus, and posterior capsule restricted. Address immediately before lower limb loading." },
          { val:"Severely restricted — <4cm / <10°", color:"#ff4d6d", meaning:"Severe DF restriction. Patient cannot squat without major heel rise. Cannot walk up stairs without trunk compensation. Cascade of dysfunction through entire kinetic chain. May indicate posterior ankle impingement, OA, or old fracture. Talocrural joint mobilisation (Grade III–IV) + intensive soft tissue work essential." },
        ],
        treatment:"Mobilise: talocrural joint (posterior glide of talus, Grade III–IV). Soft tissue: gastroc SMR + soleus SMR + posterior capsule stretch. Exercise: wall lunge drill × 3 min daily, eccentric heel drops, single-leg squat with DF focus. Kinetic chain: once DF improved, reassess knee alignment and foot pronation — they should self-correct.",
        chainEffect:"Restricted ankle DF → heel rises early → foot pronates → tibia internally rotates → knee collapses into valgus → hip internally rotates → femur adducts → pelvis anteriorly tilts → lumbar extends. ONE restriction drives the entire chain.",
      },
      {
        id:"kc_subtalar", label:"Subtalar Joint Mobility — Inversion / Eversion",
        role:"MOBILITY TEST", joint:"Subtalar joint",
        how:"Patient prone or supine. Grasp calcaneus. Move calcaneus into inversion and eversion independently of talocrural joint. Normal: inversion 20°, eversion 10°. Compare sides. Also assess in weight-bearing: observe navicular drop (mark navicular sitting → standing; normal drop <6mm). Rigid subtalar = poor shock absorption. Hypermobile = excessive pronation.",
        options:[
          { val:"Normal — inversion 20° / eversion 10°", color:"#00c97a", meaning:"Subtalar joint mobile and stable. Normal shock absorption. Navicular drop <6mm. Arch height maintained in single-leg stance. No excessive pronation or supination during gait." },
          { val:"Hypomobile — rigid foot", color:"#ffb300", meaning:"Subtalar restricted in both planes. Rigid foot cannot absorb shock — loads transfer to Achilles, plantar fascia, and shin. Patient may have OA, tarsal coalition, or post-fracture stiffness. Poor shock absorption = stress injuries. Mobilise subtalar joint with inversion-eversion glides." },
          { val:"Hypermobile — excessive pronation", color:"#ff4d6d", meaning:"Subtalar excessively mobile — navicular drop >10mm. Medial arch collapses. Tibialis posterior failing to control pronation (inhibited per CPA). Pronation cascade drives tibial IR → knee valgus → hip IR. Strengthen tib posterior + arch intrinsics. Orthotics if severe." },
          { val:"Asymmetric — significant L vs R difference", color:"#7f5af0", meaning:"Side-to-side difference >5° = significant asymmetry in kinetic chain input. The more restricted side will drive ipsilateral compensations. The hypermobile side will drive contralateral trunk compensations. Address the restricted side first." },
        ],
        treatment:"Hypomobile: subtalar mobilisation (inversion-eversion glides, Grade III). Hypermobile: tibialis posterior + FHL + intrinsic foot muscle strengthening, short foot exercise. Orthotics: semi-rigid if navicular drop >10mm. Reassess tib post CPA — almost always inhibited in hypermobile foot.",
        chainEffect:"Rigid foot → poor shock absorption → Achilles overload, shin splints, plantar fasciitis. Hypermobile foot → tibial IR → knee valgus → hip adduction → SI joint asymmetry.",
      },
      {
        id:"kc_great_toe", label:"First MTP Extension — Hallux Mobility",
        role:"MOBILITY TEST", joint:"First MTP joint",
        how:"Patient seated or supine. Passively extend great toe at MTP joint. Normal: 60–70° extension. Test in weight-bearing: windlass test — patient stands on a step, extend great toe and observe arch rise. Also observe during gait push-off: does patient supinate foot to achieve toe-off or roll over lateral border? Restricted = hallux rigidus/limitus.",
        options:[
          { val:"Normal — 60–70° extension", color:"#00c97a", meaning:"Normal hallux dorsiflexion. Windlass mechanism functions — arch rises with toe extension. Patient can achieve full push-off during gait without compensation. No lateral border gait or external rotation of leg." },
          { val:"Mildly restricted — 40–59°", color:"#ffb300", meaning:"Mild hallux limitus. Patient early supinates foot during push-off (avoids hallux loading). Lateral metatarsal overload, peroneal pain, and Achilles overload may result. 1st MTP joint mobilisation required." },
          { val:"Moderately restricted — 20–39°", color:"#ff6b35", meaning:"Moderate hallux limitus. Patient cannot achieve heel-to-toe gait — abducts foot (toe-out gait), extends hip early, or flexes knee to compensate. Cascading: hip flexor overload, anterior knee pain. Bunion (hallux valgus) may be forming." },
          { val:"Severely restricted — <20° / hallux rigidus", color:"#ff4d6d", meaning:"Hallux rigidus. First MTP completely stiff. Patient walks on lateral foot border. Entire gait compensated. Refer for X-ray (OA/osteophytes). Surgical consultation if conservative fails. Conservative: MTP mobilisation, rocker-bottom shoe, sesamoid off-loading." },
        ],
        treatment:"Mobilise: 1st MTP dorsal glide (Grade III–IV). Soft tissue: plantar fascia release, sesamoid mobility. Gait retraining: heel-to-toe pattern with hallux loading. Toe separators at night. Orthotics: Morton's extension if arthritic.",
        chainEffect:"Restricted hallux → compensatory toe-out gait → tibial ER → knee valgus loss of protection → hip IR → LBP from asymmetric loading.",
      },
    ]
  },

  knee:{
    label:"Knee", color:"#ff4d6d", role:"STABILITY",
    intro:"The knee is a STABILITY joint — its job is to transmit force between the mobile ankle and mobile hip without excessive motion. Knee pain is almost always a symptom of failure elsewhere in the kinetic chain — usually restricted ankle dorsiflexion below or restricted hip mobility above. TREAT the cause, not the knee.",
    tests:[
      {
        id:"kc_knee_stability", label:"Knee Valgus Stress Test — Kinetic Chain",
        role:"STABILITY TEST", joint:"Knee",
        how:"Observe patient during: (1) Squat — does knee collapse medially? (2) Single-leg squat — does knee drop inward? (3) Step-down from 20cm box — medial knee drop? (4) Jump landing — bilateral or unilateral. Also: manually valgus stress at 0° and 30° to check MCL integrity separately. Observe: foot pronation, tibial IR, and hip adduction all occurring simultaneously = kinetic chain valgus (not structural).",
        options:[
          { val:"Stable — no valgus in any task", color:"#00c97a", meaning:"Knee maintains alignment through all functional tasks. Kinetic chain above (hip stability) and below (ankle DF, foot position) providing adequate support. No medial knee stress. MCL intact." },
          { val:"Dynamic valgus — functional tasks only", color:"#ffb300", meaning:"Knee collapses inward during squat or single-leg tasks but MCL is structurally intact. Kinetic chain failure: ankle DF limited + glute med inhibited driving valgus. This is the most common pattern in female ACL injuries. TREAT: ankle DF + glute med activation — do NOT focus on knee." },
          { val:"Valgus with hip drop — Trendelenburg pattern", color:"#ff6b35", meaning:"Knee valgus accompanied by contralateral pelvis drop (glute med weakness). Classic kinetic chain valgus from proximal instability. Patient cannot control single-leg stance. Medial compartment overloaded. Strengthen glute med → knee valgus will reduce." },
          { val:"Structural valgus — MCL laxity", color:"#ff4d6d", meaning:"Valgus present at rest and with valgus stress at 0° + 30°. MCL structurally lax. Medial compartment loaded asymmetrically. Refer if significant. CPA: assess VMO activation as it dynamically supports medial knee." },
        ],
        treatment:"Dynamic valgus: ankle DF mobilisation + glute med CPA programme + VMO activation. Jump landing retraining (soft knee, hip back). Structural MCL: bracing, progressive loading, VMO/hamstring strengthening. Kinetic chain correction: address ankle → hip → then knee-specific work.",
        chainEffect:"Restricted ankle DF (below) + inhibited glute med (above) = KNEE is squeezed into valgus by forces from both directions. Treating only the knee will fail.",
      },
      {
        id:"kc_patellar_mobility", label:"Patellar Mobility Test",
        role:"STABILITY TEST", joint:"Patellofemoral",
        how:"Patient supine, knee fully extended and relaxed. Grasp patella with thumb and index finger. Glide medially and laterally — normal: 1–2cm in each direction (approximately 1/4 patella width). Also tilt: lift medial edge of patella — lateral retinaculum tight if cannot lift ≥0°. Crepitus during passive patellar glide = PFPS or chondromalacia.",
        options:[
          { val:"Normal — symmetric glide, no crepitus", color:"#00c97a", meaning:"Patellar tracking within trochlear groove. Lateral retinaculum not restricting. No crepitus. Q-angle normal. VL/VMO balance adequate. No PFPS symptoms." },
          { val:"Laterally biased — tight lateral retinaculum", color:"#ffb300", meaning:"Patella glides less than 1cm medially. Lateral tilt test: cannot lift medial edge. Lateral retinaculum tight — often due to VL overactivity (CPA: VMO inhibited → VL overactive). Patient has PFPS with lateral knee ache, crepitus. TREAT: VL SMR + lateral retinaculum stretching + VMO activation." },
          { val:"Hypermobile — excessive lateral glide", color:"#ff4d6d", meaning:"Patella glides >2cm laterally with minimal resistance. Medial stabilisers (MPFL, VMO) insufficient. Risk of patellar subluxation or dislocation. Quad strengthening in safe range (0–30° for patellar stability), VMO focus, patellar taping." },
          { val:"Crepitus with glide", color:"#7f5af0", meaning:"Grinding/crepitus during patellar glide = cartilage change or chondromalacia patella. May be asymptomatic or painful. If painful and progressive — refer for imaging. Conservative: load management, VMO strengthening, step avoidance in acute phase." },
        ],
        treatment:"Lateral bias: VL foam roll + IT band SMR, lateral retinaculum stretch (McConnell tape medially), VMO terminal knee extension. Hypermobile: VMO strengthening (0–30°), MPFL-protecting brace. Kinetic chain: always address ankle DF and glute med before patellar taping.",
        chainEffect:"VMO inhibited (CPA) → VL overactive → patella laterally displaced → PFPS. ALSO: foot pronation → tibial IR → patella internally rotated → increased lateral patellar stress.",
      },
      {
        id:"kc_tibiofemoral_rot", label:"Tibial Rotation Assessment — Screw-Home Mechanism",
        role:"STABILITY TEST", joint:"Tibiofemoral",
        how:"Patient supine, knee at 90°. Assess passive tibial rotation: grasp foot, rotate tibia internally and externally. Normal: IR 20–30°, ER 30–40°. Assess screw-home: as knee moves from 90° to full extension, tibia should externally rotate automatically (screw-home mechanism locks knee). If not — popliteus may be inhibited. Also test standing: observe tibial rotation during single-leg squat.",
        options:[
          { val:"Normal — screw-home intact, symmetric rotation", color:"#00c97a", meaning:"Tibia normally externally rotates at terminal knee extension (screw-home mechanism). Popliteus and LCL functioning. Symmetric passive tibial rotation bilaterally. Knee locks appropriately in full extension for standing." },
          { val:"Restricted tibial IR — lateral chain tightness", color:"#ffb300", meaning:"Cannot internally rotate tibia adequately. Biceps femoris and IT band restricting IR. Patient toe-out during walking (externally rotated) to avoid tibial IR loading. Lateral knee pain. Release biceps femoris + IT band → improve tibial IR." },
          { val:"Excessive tibial IR — medial chain laxity", color:"#ff6b35", meaning:"Tibia falls into internal rotation easily. Medial structures (MCL, medial capsule) lax. Foot pronation driving tibial IR from below. Glute med weakness allowing hip IR from above. Medial knee overloaded. Strengthen: tib post, VMO, glute med." },
          { val:"Absent screw-home — popliteus dysfunction", color:"#ff4d6d", meaning:"Tibia does not externally rotate at terminal extension. Knee cannot fully lock in extension. Popliteus inhibited or over-lengthened. Patient stands with slight flexion (can't straighten fully). Unlock test positive. Treat popliteus: soft tissue + CPA activation." },
        ],
        treatment:"Restricted IR: biceps femoris + IT band SMR, tibial IR mobility drill. Absent screw-home: popliteus activation (resisted tibial IR at 30°), terminal knee extension focus. Always address kinetic chain: foot pronation → tibial IR → biceps femoris reactivity.",
        chainEffect:"Excessive tibial IR (from foot pronation) → medial knee overload → MCL stress → medial compartment OA risk. Restricted tibial ER → knee cannot lock → quadriceps must work harder → PFPS.",
      },
    ]
  },

  hip:{
    label:"Hip", color:"#00c97a", role:"MOBILITY",
    intro:"The hip is a MOBILITY joint — it needs adequate flexion, extension, internal rotation, external rotation, and abduction to transfer force between the lumbar spine and lower limb. Hip restriction is the MOST COMMON driver of lumbar spine pathology. Limited hip IR is the single most predictive finding for future LBP.",
    tests:[
      {
        id:"kc_hip_ir_mob", label:"Hip Internal Rotation Mobility",
        role:"MOBILITY TEST", joint:"Hip",
        how:"Patient prone, hips neutral, knees bent 90°. Allow both feet to fall outward (measuring hip IR). Normal: 40–45°. Also test: seated hip IR — patient seated on table, rotate lower leg outward (hip IR). Compare sides. Clinical significance: >18° side-to-side asymmetry = significant (GIRD equivalent at hip). Hip IR <35° = high LBP risk.",
        options:[
          { val:"Normal — 40–45° bilateral symmetric", color:"#00c97a", meaning:"Adequate hip IR for all functional tasks including running, cutting, squatting. Posterior hip capsule mobile. No compensation patterns driven by hip IR restriction. Lumbar spine not being forced to rotate to compensate." },
          { val:"Mildly restricted — 30–39°", color:"#ffb300", meaning:"Mild hip IR restriction. Patient compensates with increased lumbar rotation during activities requiring hip IR (e.g. walking, golf swing). Posterior capsule and external rotators (piriformis, gemellus) mildly tight. Begin posterior capsule stretching and hip ER SMR." },
          { val:"Moderately restricted — 20–29°", color:"#ff6b35", meaning:"Moderate hip IR restriction. Lumbar spine rotates excessively to compensate — LBP developing or established. Ipsilateral foot may toe-out during gait (compensatory ER to avoid IR demand). Hip impingement (FAI) or posterior capsule contracture. FADIR test likely positive." },
          { val:"Severely restricted — <20° or significant asymmetry", color:"#ff4d6d", meaning:"Severe hip IR restriction. Classic FAI or hip OA finding. Lumbar spine under enormous rotational stress. Patient cannot squat, run, or rotate without pain. FADIR and hip scour likely positive. Refer for X-ray/MRI. Aggressive hip mobility program + consider orthopaedic referral." },
        ],
        treatment:"Posterior capsule: 90-90 stretch, pigeon pose, hip IR in prone with passive pressure. Joint mobilisation: posterior hip glide (patient supine, therapist mobilises femoral head posteriorly). Soft tissue: piriformis + gemellus SMR + dry needling. CPA: piriformis release → glute med activation (piriformis often overactive when glute med inhibited).",
        chainEffect:"Restricted hip IR → lumbar spine rotates to compensate → asymmetric disc loading → LBP. Also: restricted hip IR → foot toes out during gait → medial knee stress.",
      },
      {
        id:"kc_hip_ext_mob", label:"Hip Extension Mobility — Thomas Test",
        role:"MOBILITY TEST", joint:"Hip",
        how:"Patient supine at edge of table. Bring BOTH knees to chest fully to flatten lumbar lordosis. Lower one leg — the other remains flexed to control pelvis. Observe lowering leg: (1) Hip extension: does thigh reach the table or hang above? Normal: thigh rests on or below horizontal. (2) Knee angle: does knee remain at 90° or extend? If knee extends = rectus femoris tightness. (3) Observe for tibial rotation or foot position changes.",
        options:[
          { val:"Negative — thigh to table, knee 90°", color:"#00c97a", meaning:"Full hip extension available. Iliopsoas and rectus femoris at normal length. No anterior hip capsule restriction. Pelvis can remain neutral during gait push-off phase. No anterior pelvic tilt driven by hip flexor tightness." },
          { val:"Positive — thigh elevated (iliopsoas short)", color:"#ffb300", meaning:"Thigh hangs above horizontal — iliopsoas tight/overactive. Forces anterior pelvic tilt. LCS pattern likely. Hip flexors shortened from sitting. During gait: hip cannot extend → trunk leans forward → LBP. TREAT: iliopsoas SMR + hip flexor stretching (couch stretch) + glute max activation." },
          { val:"Positive — knee extends (rectus femoris short)", color:"#ff6b35", meaning:"Knee extends (straightens) as thigh lowers — rectus femoris tight. Creates anterior pelvic tilt AND limits knee flexion simultaneously. Patient has PFPS, anterior knee pain, and anterior hip pain. Rectus femoris stretching (prone heel-to-glute) + SMR quads." },
          { val:"Positive — both hip and knee compensation", color:"#ff4d6d", meaning:"Both iliopsoas AND rectus femoris restricted. Thigh elevated AND knee extends. Severe anterior chain tightness. Patient in permanent LCS. Must address systematically: release both → activate glutes/hamstrings → retrain hip extension pattern." },
        ],
        treatment:"Iliopsoas: couch stretch, half-kneeling hip flexor stretch, iliopsoas SMR (careful — near neurovascular structures). Rectus femoris: prone heel-to-glute stretch, lying quad stretch. Activate: glute max after stretching. Gait retraining: push-off from hip not knee.",
        chainEffect:"Tight hip flexors → anterior pelvic tilt → increased lumbar lordosis → facet loading → LBP. Also: rectus femoris tight → knee cannot flex fully → altered squat mechanics.",
      },
      {
        id:"kc_hip_er_mob", label:"Hip External Rotation Mobility",
        role:"MOBILITY TEST", joint:"Hip",
        how:"Patient prone, knee bent 90°. Measure how far lower leg moves toward midline (hip ER). Normal: 40–45°. Also test in seated: patient seated, cross ankle over opposite knee (figure-4 position) and observe how far knee drops toward table. Compare sides. Note: piriformis becomes IR when hip flexed >60° — test position changes the muscle tested.",
        options:[
          { val:"Normal — 40–45° bilateral symmetric", color:"#00c97a", meaning:"Adequate hip ER for normal gait, sports, and hip dissociation. Deep gluteal muscles (piriformis, obturators, gemellus) at normal length. No lateral hip impingement. Figure-4 test: knee drops to table or near. SI joint not being stressed by ER restriction." },
          { val:"Restricted — tight external rotators", color:"#ffb300", meaning:"Hip ER < 35°. Deep external rotators tight — piriformis, obturators, quadratus femoris. Patient may have FABER test limitation. May restrict stride length during running. Prone figure-4 position limited. Stretch: lying figure-4, seated hip ER stretch." },
          { val:"Restricted + deep buttock pain (piriformis syndrome)", color:"#ff4d6d", meaning:"ER restricted with reproduction of deep gluteal pain or sciatic symptoms during ER test. Piriformis compressing sciatic nerve. FAIR test likely positive. CPA: piriformis overactive (compensating for inhibited glute med). TREAT: careful piriformis release → glute med activation." },
          { val:"Asymmetric — >15° side difference", color:"#7f5af0", meaning:"Significant asymmetry. The restricted side = more capsular loading on ipsilateral SI joint. Running creates rotational asymmetry. Asymmetric ER restriction often from single-side injury history or sport dominance (kicking leg, golf). Address restricted side first." },
        ],
        treatment:"Soft tissue: piriformis SMR, deep gluteal foam rolling, figure-4 stretch. Joint mobilisation: posterior hip capsule glide if capsular. CPA: piriformis release → glute med activation (inhibited glute med is usually driving piriformis overactivity). Hip ER stretching: seated, lying, pigeon pose.",
        chainEffect:"Restricted hip ER → compensatory lumbar rotation → asymmetric SI joint loading. During gait: hip cannot adequately ER → foot toes in → medial ankle stress.",
      },
      {
        id:"kc_hip_abd_mob", label:"Hip Abduction Mobility & Stability",
        role:"MOBILITY + STABILITY TEST", joint:"Hip",
        how:"MOBILITY: Patient sidelying, affected side up. Passively abduct hip — normal 45°. Also: Ober's test for IT band/TFL restriction (see TFL). STABILITY: Single-leg stance — Trendelenburg test. Patient stands on one leg 30 seconds. Positive = contralateral pelvis drops. Also: lateral step-down from 20cm box — observe hip drop and trunk lean. Functional: observe running gait for hip drop.",
        options:[
          { val:"Normal mobility and stability", color:"#00c97a", meaning:"Hip abducts to 45°. Trendelenburg negative. Single-leg squat: pelvis level, no hip drop. Running: symmetrical pelvis. Glute med functioning appropriately as primary lateral pelvic stabiliser." },
          { val:"Restricted mobility — TFL/IT band", color:"#ffb300", meaning:"Ober's test positive — hip cannot adduct past 10° = IT band/TFL restricting abduction. Patient has lateral hip/knee pain. TFL overactive (CPA: compensating for inhibited glute med). TREAT: TFL SMR → glute med activation." },
          { val:"Stability deficit — Trendelenburg positive", color:"#ff4d6d", meaning:"Pelvis drops contralaterally during single-leg stance. Glute med cannot support pelvis. Patient leans trunk over stance leg to reduce moment arm (gluteus medius lurch/Trendelenburg lurch). All single-leg activities overload medial structures below and lumbar above. CPA: confirm glute med inhibited → TFL/QL compensating." },
          { val:"Both mobility restricted AND stability deficit", color:"#7f5af0", meaning:"IT band tight + Trendelenburg positive. Classic kinetic chain hip failure. TFL and piriformis are both overactive, glute med severely inhibited. Lateral knee pain, hip pain, and lumbar dysfunction. Multi-session approach: release TFL + piriformis → activate glute med → functional hip loading." },
        ],
        treatment:"Restricted: TFL SMR + lateral hip stretch + IT band roller. Stability: CPA glute med protocol (release TFL → activate glute med: clamshells → lateral band walks → single-leg holds). Progress: step-ups, lateral lunges, single-leg squat with pelvis level focus. Running: cue hip level during gait.",
        chainEffect:"Glute med failure → pelvis drops → lumbar side-flexes → SI joint asymmetric load → LBP. Below: hip drop → tibial valgus stress → medial knee pain.",
      },
    ]
  },

  lumbar:{
    label:"Lumbar Spine", color:"#ff4d6d", role:"STABILITY",
    intro:"The lumbar spine is a STABILITY region — its role is to transmit force between the mobile thoracic spine above and mobile hips below, with minimal motion of its own. It has only 13° of rotation total. When the hips or thoracic spine lose mobility, the lumbar spine is forced into excessive motion → disc loading → LBP. Stability tests assess the deep stabilising system (TA, multifidus) and segmental control.",
    tests:[
      {
        id:"kc_lumbar_stability", label:"Lumbar Segmental Stability Tests",
        role:"STABILITY TEST", joint:"Lumbar spine",
        how:"1. PRONE INSTABILITY TEST: Patient prone, feet on floor. Therapist applies posterior-anterior pressure on spinous processes — note pain. Then patient lifts feet off floor (activates spinal stabilisers) — reapply PA pressure. POSITIVE = pain reduced when muscles activated = instability (not structural). 2. ACTIVE STRAIGHT LEG RAISE (ASLR): Supine. Ask patient to lift one leg 20cm without bending knee. Observe: does pelvis rotate? Does thorax rotate? Apply compression to ASIS (manual SIJ compression) — if ASLR improves = pelvic instability. Score 0–5 each side. 3. ABDOMINAL DRAWING-IN: Patient supine. Ask to draw navel in without holding breath — palpate TA 2cm medial to ASIS.",
        options:[
          { val:"Stable — all tests normal", color:"#00c97a", meaning:"Lumbar spine stable. TA activates independently before limb movement (normal feedforward). Prone instability test negative. ASLR performed without compensation. Multifidus palpable as local swelling with activation. Normal segmental control." },
          { val:"Prone instability positive — segmental instability", color:"#ffb300", meaning:"Pain on PA pressure that reduces when patient activates muscles (lifts feet) = segmental instability at that level. Most commonly L4/5 or L5/S1. Indicates deep stabiliser deficit at that segment. Address: specific TA + multifidus training at that segment." },
          { val:"ASLR positive — pelvic/SIJ instability", color:"#ff6b35", meaning:"ASLR difficult/painful. Compensatory rotation or pain. Improved with manual ASIS compression = SIJ force closure deficit. Pelvic floor + TA + gluteal activation pattern dysfunctional. Specific SIJ stabilisation program. Pelvic belt short-term if severe." },
          { val:"No TA activation — global instability", color:"#ff4d6d", meaning:"Patient cannot isolate TA. Draws in abdomen with whole breath hold or RA fires instead. Global spinal instability pattern — common in chronic LBP. Erector spinae and QL compensating for TA/multifidus inhibition. Begin specific TA retraining before ANY global strengthening." },
        ],
        treatment:"Specific stabilisation exercise (SSE): TA drawing-in (10 sec × 10 reps), progress to dead bug, bird-dog, single-leg bridge. Multifidus: prone swelling × 10 sec × 10 reps. Progress to functional: squat with belt/brace initially, wean as stabilisers develop. Address hips and thoracic mobility first.",
        chainEffect:"Lumbar instability → erector spinae + QL compensate → chronic LBP. Forces above (thoracic stiffness) and below (hip restriction) both increase lumbar instability demand.",
      },
      {
        id:"kc_lumbar_flexion_ctrl", label:"Lumbar Flexion Control — Waiter's Bow Test",
        role:"STABILITY TEST", joint:"Lumbar spine",
        how:"Patient standing. Ask to bow forward as if greeting someone — maintain lordosis while hinging forward at hips (hip hinge). Normal: lumbar maintains neutral curve while hips flex. ABNORMAL: lumbar flexes immediately and hips stay still (lumbar flexion dominant pattern). Also test: ask patient to touch toes — observe where movement occurs first. Place fingers on PSIS and ASIS — ASIS should move posteriorly as hip flexes.",
        options:[
          { val:"Normal — hip hinge dominant", color:"#00c97a", meaning:"Patient hinges from hip with lumbar maintained in neutral. PSIS moves as hips flex. Waiter's bow clean. Normal hip-dominant forward bending. Lumbar discs not excessively loaded during forward bending tasks. Correct deadlift/lifting mechanics." },
          { val:"Lumbar flexion dominant — mild", color:"#ffb300", meaning:"Lumbar flexes before or simultaneously with hip flexion. Mild pattern. Patient has increased disc loading with forward bending. Often has flexion-pattern LBP. Hip flexors and hamstrings may be tight (restricting hip hinge). Begin hip hinge retraining." },
          { val:"Lumbar flexion dominant — moderate/severe", color:"#ff4d6d", meaning:"Lumbar flexes immediately, hips barely move. Classic disc loading pattern. Patient experiences LBP with sitting, forward bending, picking up objects. Significant hamstring tightness or hip flexion restriction driving pattern. McKenzie extension may be direction of preference. Hip hinge retraining essential. Avoid lumbar flexion loading." },
          { val:"Aberrant movement — painful arc", color:"#7f5af0", meaning:"Patient deviates laterally (trunk shift) when bending forward — often reducing when returning to upright. Indicates lumbar disc herniation (shifts away from pain) or facet asymmetry. Kemp's test + SLR to differentiate. Address disc/facet before stability training." },
        ],
        treatment:"Hip hinge retraining: dowel rod along spine cue (3 contact points), Romanian deadlift with mirror, hip hinge with theraband. McKenzie if flexion-dominant LBP. Address hip hamstring tightness that forces lumbar to take the movement.",
        chainEffect:"Lumbar flexion dominant pattern → repeated disc loading → disc degeneration. Hip restriction CAUSES lumbar flexion pattern — address hip mobility to fix lumbar movement quality.",
      },
      {
        id:"kc_lumbar_rotation_ctrl", label:"Lumbar Rotation Control Test",
        role:"STABILITY TEST", joint:"Lumbar spine",
        how:"Patient seated on plinth, feet flat (removes hip/ankle from equation). Ask to rotate trunk left and right — observe where rotation occurs. Normal: majority of rotation from thoracic spine (45° each side). Lumbar contribution: <13° total. POSITIVE = lumbar rotates excessively and thoracic barely moves. Also: seated rotation with arms folded — compare to hands on head (adds thoracic load). Quadruped rotation test: on hands and knees, rotate trunk — lumbar should not flex/extend.",
        options:[
          { val:"Normal — thoracic dominant rotation", color:"#00c97a", meaning:"Thoracic spine contributes majority of rotation (>45° each side). Lumbar minimally rotates (<5° per side). Ribs and thoracic facets mobile. Thoracic rotation does not increase lumbar disc shear forces. Normal rotational mechanics for golf, tennis, running." },
          { val:"Thoracic stiff — lumbar compensating rotation", color:"#ffb300", meaning:"Thoracic rotation <30° and lumbar overrotates to compensate. Disc at L4/5 or L5/S1 subjected to rotational shear forces. LBP with rotation (golf swing, getting in/out of car). Thoracic mobilisation priority: rotational manipulation, foam roller rotation drill." },
          { val:"Bilateral thoracic stiffness — both sides", color:"#ff6b35", meaning:"Symmetric thoracic restriction — total rotation <60°. Often from prolonged desk posture, rib cage stiffness, or thoracic kyphosis. Lumbar maximally compensating bilaterally. Bilateral risk for disc pathology. Foam roller thoracic extension + rotation essential." },
          { val:"Asymmetric restriction — one side significantly less", color:"#ff4d6d", meaning:"More restricted on one side. Creates rotational asymmetry — lumbar rotation asymmetrically loaded. Common in golfers, throwers, racquet sport athletes. Address: unilateral thoracic rotation mobility (side-lying open book, seated rotation with dowel). CPA: check contralateral glute med and ipsilateral obliques." },
        ],
        treatment:"Thoracic: foam roller extension + rotation (30 reps daily), side-lying open book stretch, seated thoracic rotation with dowel. Manual therapy: thoracic rotation manipulation (high velocity). Lumbar control: seated rotation awareness training, quadruped anti-rotation.",
        chainEffect:"Stiff thoracic (above) forces lumbar to rotate → disc shear forces → LBP. Below: hip IR restriction also forces lumbar to compensate rotationally.",
      },
    ]
  },

  thoracic:{
    label:"Thoracic Spine", color:"#00e5ff", role:"MOBILITY",
    intro:"The thoracic spine is a MOBILITY region — it needs 45° of rotation each way and adequate extension to allow the shoulder and cervical spine to function properly. Thoracic stiffness is arguably the MOST OVERLOOKED cause of neck pain, shoulder impingement, and LBP. Mobilising the thoracic spine often immediately improves shoulder and cervical symptoms.",
    tests:[
      {
        id:"kc_thoracic_rotation", label:"Thoracic Rotation Mobility",
        role:"MOBILITY TEST", joint:"Thoracic spine",
        how:"Patient seated on chair (eliminates hip contribution). Ask to rotate trunk fully left and right — arms folded across chest. Normal: 45° each side (90° total). Goniometer: axis at top of head, stationary arm pointing forward, moving arm following nose direction. Also test: supine rotation test — patient supine, knees bent to 90°, drop both knees to one side (normal: legs rest on table). Compare sides.",
        options:[
          { val:"Normal — 45°+ bilateral, symmetric", color:"#00c97a", meaning:"Full thoracic rotation available. Normal T-spine mechanics. No forced lumbar compensation. Shoulder internal rotation and cervical rotation will both be adequate as thoracic is contributing its full share. No rib stiffness." },
          { val:"Mildly restricted — 35–44° one or both", color:"#ffb300", meaning:"Mild thoracic rotation restriction. Some lumbar compensation occurring. Patient notices stiffness getting in/out of car, looking over shoulder while driving. Early cervical and lumbar overload. Begin foam roller rotation + thoracic manipulation." },
          { val:"Moderately restricted — 25–34°", color:"#ff6b35", meaning:"Moderate restriction. Significant lumbar rotational compensation. Cervical spine also overloading to compensate. Shoulder impingement beginning (thoracic kyphosis increases with rotation restriction → shoulder impingement). Rib cage restriction palpable. Thoracic manipulation + rib mobilisation." },
          { val:"Severely restricted — <25° or asymmetric >15°", color:"#ff4d6d", meaning:"Severe thoracic restriction. Lumbar and cervical spine heavily overloaded. Shoulder impingement established. In athletes: high injury risk. Consider ankylosing spondylitis (bilateral symmetric restriction) or previous spinal fracture. Thoracic manipulation priority — often single greatest change in the assessment." },
        ],
        treatment:"Immediate: thoracic manipulation (HVLA rotation manipulation — often dramatically improves restriction). Daily: foam roller extension over rolled towel + seated rotation drill × 30 reps. Rib mobilisation: lateral rib glides. Soft tissue: thoracic erector + rhomboid SMR. Address cause: forward head posture, desk ergonomics.",
        chainEffect:"Stiff thoracic → lumbar overrotates (disc injury), cervical overworks (neck pain), shoulder internally rotates excessively (impingement). Improving thoracic rotation often immediately reduces shoulder and neck pain.",
      },
      {
        id:"kc_thoracic_extension", label:"Thoracic Extension Mobility",
        role:"MOBILITY TEST", joint:"Thoracic spine",
        how:"Patient supine. Place foam roller (or rolled towel) under thoracic spine at T4–T8. Ask patient to extend over roller with arms crossed or overhead. Observe: can thoracic spine extend over roller? Normal: vertebrae should extend over roller without significant resistance or pain. Also: wall angel test — patient stands with back to wall, feet 5cm from wall. Try to move arms from 90° to overhead maintaining contact with wall and lumbar neutral. Normal: arms reach overhead without losing wall contact.",
        options:[
          { val:"Normal — full extension, wall angel complete", color:"#00c97a", meaning:"Thoracic spine extends adequately. Wall angel: arms reach overhead while maintaining rib, lower back, and arm contact with wall. Normal posterior chain flexibility at thoracic level. Forward head and shoulder impingement not being driven by thoracic kyphosis." },
          { val:"Mildly restricted — some resistance over roller", color:"#ffb300", meaning:"Mild thoracic stiffness. Wall angel: arms cannot fully reach overhead without ribs lifting or lower back arching. Chronic desk posture beginning to restrict extension. Begin daily foam roller extension work — should not be painful, just stiff." },
          { val:"Moderately restricted — notable kyphosis fixation", color:"#ff6b35", meaning:"Thoracic kyphosis partially fixed. Foam roller: spine does not extend over roller — holds flat or reversal of curve. Wall angel: unable to maintain contact with wall past 120° shoulder elevation. Shoulder impingement very likely. Cervical spine hyperextending to compensate. Significant postural correction program needed." },
          { val:"Severely restricted — rigid thoracic kyphosis", color:"#ff4d6d", meaning:"Thoracic kyphosis rigidly fixed — cannot extend. May indicate Scheuermann's disease, severe disc degeneration, DISH (diffuse idiopathic skeletal hyperostosis), or osteoporotic compression fractures. Refer for imaging before aggressive manipulation. Conservative: gentle extension (prone on elbows progression) + respiratory physiotherapy." },
        ],
        treatment:"Foam roller: daily extension over T4–T8 level × 2 min. Stretch: thoracic extension with hands behind head. Wall angel: × 15 reps daily. Manual: thoracic extension HVLA manipulation (seated or prone). Breathing: rib cage expansion exercises. Correct driving/desk posture — lumbar roll support.",
        chainEffect:"Restricted thoracic extension → increased kyphosis → forward head → UCS pattern → cervical overload. Also: kyphosis → scapula protracts → impingement → rotator cuff injury.",
      },
      {
        id:"kc_rib_mobility", label:"Rib Cage Mobility Assessment",
        role:"MOBILITY TEST", joint:"Costovertebral / costotransverse joints",
        how:"Patient seated or supine. Place hands bilaterally on rib cage (thumbs at spine, fingers wrap laterally). Ask patient to breathe in deeply — observe symmetry of rib expansion. Normal: symmetric lateral expansion of lower ribs. Also: palpate individual rib angles (posterior, where rib meets transverse process) — press firmly and assess tenderness and stiffness bilaterally. Compare each level T3–T10. Spring test: HVLA-like PA pressure on rib angle — stiff = hypomobile rib.",
        options:[
          { val:"Normal — symmetric expansion, no rib tenderness", color:"#00c97a", meaning:"Bilateral symmetric rib cage expansion during breathing. No hypomobile ribs on palpation. Costotransverse joints mobile. Thoracic rotation and extension will be full. Breathing pattern diaphragmatic — ribs expanding laterally and posteriorly." },
          { val:"Asymmetric expansion — one side restricted", color:"#ffb300", meaning:"One side of rib cage expands less than other. Often ipsilateral to thoracic rotation restriction. Breathing may be thoracic (accessory muscle dominant). Ipsilateral rib articulations hypomobile. Rib mobilisation (unilateral anterior-posterior rib pressure or manipulation) at restricted level." },
          { val:"Hypomobile ribs — specific levels tender", color:"#ff6b35", meaning:"Specific rib angles tender and stiff on PA pressure. Hypomobile costovertebral/costotransverse joints. Restricts thoracic rotation at that spinal level. Often follows respiratory illness, thoracic trauma, or prolonged poor posture. Manipulate/mobilise specific ribs at stiff levels." },
          { val:"Upper chest breathing — diaphragm inhibited", color:"#ff4d6d", meaning:"Rib cage rises vertically (upper chest breathing) rather than expanding laterally — diaphragm inhibited (see CPA diaphragm). Scalenes and SCM overactive as primary breathers. Lower ribs do not expand. Retrain: 360° diaphragmatic breathing, crocodile breathing, lateral rib expansion. Treat CPA: scalene release → diaphragm activation." },
        ],
        treatment:"Rib mobilisation: Grade III–IV PA pressure on hypomobile rib angles. HVLA: rib manipulation in prone. Breathing: lateral rib expansion training (patient places hands on lower ribs, breathe into hands). Soft tissue: intercostal release. CPA: scalene + SCM release → diaphragm activation if breathing pattern disordered.",
        chainEffect:"Hypomobile ribs → restrict thoracic rotation → lumbar overrotation → LBP. Also: restricted breathing pattern → reduced core stability (diaphragm is a core stabiliser) → LBP.",
      },
    ]
  },

  scapula:{
    label:"Scapula & Shoulder", color:"#7f5af0", role:"STABILITY → MOBILITY",
    intro:"The scapula is a STABILITY region — it must be stable enough to serve as a platform for the mobile glenohumeral joint above. The glenohumeral joint is MOBILE. Poor scapular stability (serratus anterior + lower trap inhibition) forces the mobile GH joint to compensate with impingement patterns. Scapulohumeral rhythm must be normal for pain-free overhead activity.",
    tests:[
      {
        id:"kc_scapulohumeral_rhythm", label:"Scapulohumeral Rhythm Assessment",
        role:"STABILITY TEST", joint:"Scapula / GH joint",
        how:"Patient seated or standing. Observe arm elevation in scapular plane (between flexion and abduction). Normal ratio: for every 2° of GH elevation, 1° of scapular upward rotation = 2:1 ratio (total: 120° GH + 60° scapular = 180° total). Observe: (1) Early scapular elevation (shrugging) = upper trap dominant. (2) Winging at any point = serratus inhibited. (3) Painful arc (60–120°) = impingement. (4) Does scapula upwardly rotate or just elevate? Mark inferior angle and medial border with marker for precision.",
        options:[
          { val:"Normal — 2:1 ratio, no shrug, no winging", color:"#00c97a", meaning:"Scapula upwardly rotates smoothly in 2:1 ratio with GH elevation. No early shrugging. No winging. Painful arc absent. Lower trap, serratus, and upper trap balanced. Normal force couple functioning. Overhead activity pain-free." },
          { val:"Upper trap dominant — early shoulder elevation", color:"#ffb300", meaning:"Shoulder elevates immediately with arm raising (upper trap fires first — CPA: lower trap inhibited). Ratio disrupted — too much scapular elevation, not enough upward rotation. Patient feels tightness across top of shoulder. Impingement risk. TREAT: upper trap release → lower trap activation → retrain arm elevation pattern." },
          { val:"Serratus deficit — medial winging", color:"#ff6b35", meaning:"Medial border of scapula wings away from thorax during arm elevation. Serratus anterior inhibited (cannot protract/upwardly rotate scapula — CPA: pec minor overactive). Subacromial space decreases → impingement. Full overhead elevation impossible without winging. TREAT: pec minor release → serratus activation." },
          { val:"Combined pattern — both elevation and winging", color:"#ff4d6d", meaning:"Upper trap dominance + serratus inhibition simultaneously. Severe scapular dyskinesis. Multiple muscles dysfunctional. Patient has established shoulder impingement and possible rotator cuff pathology. Multi-system treatment: release upper trap + pec minor → activate lower trap + serratus → retrain arm elevation." },
        ],
        treatment:"Scapular muscle rebalancing: lower trap (prone Y) + serratus (push-up plus, serratus punch). Release: upper trap SMR + pec minor soft tissue. Movement retraining: wall slide with scapular depression cue, elevation drills with resistance band. Avoid overhead loading until rhythm normalised.",
        chainEffect:"Poor scapular stability → subacromial space narrowing → impingement → rotator cuff tendinopathy → tear. Also: scapular winging → GH joint forced into excessive IR → anterior capsule stress.",
      },
      {
        id:"kc_gh_ir_mob", label:"Glenohumeral Internal Rotation — GIRD Assessment",
        role:"MOBILITY TEST", joint:"Glenohumeral joint",
        how:"Patient supine, shoulder at 90° abduction, elbow at 90°. Stabilise scapula (prevent posterior tipping — place hand under scapular spine). Passively internally rotate: forearm drops toward table. Normal: 60–70°. Compare bilaterally. GIRD (Glenohumeral IR Deficit): >18° side-to-side difference is clinically significant in throwing athletes. Also: total arc of rotation (ER + IR combined) should be similar bilaterally. Loss of total arc = true capsular restriction.",
        options:[
          { val:"Normal — 60–70° bilateral, <18° asymmetry", color:"#00c97a", meaning:"Adequate GH internal rotation. Posterior capsule mobile. Total arc of rotation symmetric. No posterior impingement. Rotator cuff in normal length-tension relationship. No GIRD pattern. Overhead activities unrestricted." },
          { val:"GIRD — >18° side difference (throwers)", color:"#ffb300", meaning:"Significant GIRD in dominant arm of throwing athletes. Posterior capsule contracted from repetitive overhead loading. GIRD shifts GH contact point posterosuperiorly — posterior cuff and labrum at risk. Loss of total arc indicates capsular restriction (not just bony adaptation). Sleeper stretch + posterior capsule mobilisation essential." },
          { val:"Bilateral restriction — posterior capsule tightness", color:"#ff6b35", meaning:"Both shoulders show restricted IR. Non-throwing athlete — indicates global posterior capsule contracture or UCS-related tightness. Pec minor tightness also limiting IR (anterior chain restrictors). Posterior capsule stretching bilaterally + pec minor release." },
          { val:"Severely restricted — frozen shoulder pattern", color:"#ff4d6d", meaning:"IR severely restricted (<30°). All planes restricted (capsular pattern: ER > Abd > IR). Adhesive capsulitis likely. Pain at end-range passive motion. Refer for corticosteroid injection assessment. Grade III–IV GH mobilisation (inferior glide, posterior glide). Night pain = inflammatory phase — not mobilised aggressively." },
        ],
        treatment:"GIRD: sleeper stretch × 3 × 30 sec daily, posterior capsule joint mobilisation (posterior glide). Frozen shoulder: Maitland Grade I–II in pain → Grade III–IV in stiff phase. End-range stretching program. Joint distension injection if severe. CPA: RC activation after each mobilisation session.",
        chainEffect:"GH IR restriction → shoulder impingement (posterior capsule pushes humeral head anterosuperiorly → compresses supraspinatus). Also: GH IR loss → thoracic rotation compensates → lumbar overloads.",
      },
      {
        id:"kc_cervical_thoracic_jct", label:"Cervicothoracic Junction (C7–T4) Mobility",
        role:"MOBILITY TEST", joint:"Cervicothoracic junction",
        how:"Patient seated. Assess rotation at cervicothoracic junction specifically: ask patient to rotate head fully. Apply resistance to C2 level (fixes upper cervical) and ask for rotation — measures mid-cervical rotation. Then fix C6 and ask to rotate — measures lower cervical and CT junction rotation. Palpation: PA pressure on C7, T1, T2, T3 spinous processes — stiffness and tenderness indicates hypomobility at CT junction. Normal: T1 should be mobile — spring test should have spring, not 'wooden' feel.",
        options:[
          { val:"Normal — mobile CT junction", color:"#00c97a", meaning:"CT junction mobile on PA spring test. No significant stiffness at T1–T3. Cervical rotation flows smoothly through CT junction. Brachial plexus exits freely. No referred arm symptoms provoked by CT junction loading." },
          { val:"Hypomobile CT junction — restricted rotation", color:"#ffb300", meaning:"CT junction stiff — PA spring test feels wooden at T1–T3. Reduced cervical rotation, particularly at lower levels. Patient has stiffness at base of neck. Often from forward head posture (chin poke — the CT junction extends to compensate for FHP). Mobilise: PA and rotation mobilisations at C7–T3." },
          { val:"CT junction hypomobility with arm symptoms", color:"#ff4d6d", meaning:"CT junction restricted AND provokes arm tingling/heaviness with loading. Brachial plexus or first rib elevated at CT junction. First rib elevation test: compare first rib height bilaterally (should be level). Thoracic outlet symptoms. Mobilise CT junction + first rib mobilisation. Scalene release (CPA: scalenes often overactive due to diaphragm inhibition — elevating first rib)." },
          { val:"Cervicothoracic instability — excessive motion", color:"#7f5af0", meaning:"Hypermobile CT junction — too much motion (often post-whiplash). PA spring has no resistance at C7/T1. May be causing positional headaches and neurological symptoms. Stabilise: deep cervical flexor activation, cervicothoracic stabilisation exercises. Avoid aggressive mobilisation or manipulation at this level." },
        ],
        treatment:"Hypomobile: PA mobilisation at T1–T3 (Maitland Grade III–IV), rotation mobilisation in sitting. First rib: inferior-posterior first rib mobilisation. Soft tissue: levator scapulae + upper trap at CT junction. Postural correction: CT junction extension exercises.",
        chainEffect:"Stiff CT junction → cervical spine compensates with excess rotation → cervicogenic headache. Also: CT junction stiffness → brachial plexus tension → arm symptoms. Shoulder function also affected (T1 sympathetics to upper limb exit here).",
      },
    ]
  },

  cervical:{
    label:"Cervical Spine", color:"#ff6b35", role:"MOBILITY",
    intro:"The cervical spine is a MOBILITY region — it needs 80° of rotation, 80° flexion, 70° extension, and 45° side-flexion for normal function. The upper cervical spine (C0–C2) provides 50% of all cervical rotation. The lower cervical (C3–C7) is primarily flexion/extension. Cervical dysfunction is almost always secondary to thoracic stiffness below and postural control deficit from DNF inhibition.",
    tests:[
      {
        id:"kc_cervical_rot_mob", label:"Cervical Rotation Mobility",
        role:"MOBILITY TEST", joint:"Cervical spine",
        how:"Patient seated, shoulders level. Rotate head fully left and right. Normal: 80° each side. Measure with goniometer (stationary arm top of head, moving arm follows nose). Differentiating upper vs lower cervical contribution: Flexion-Rotation Test (FRT) for C1/C2 specifically — patient fully flexes cervical spine (chin to chest), then rotates maximally. Normal FRT: 40–45° each side. <32° = positive = C1/C2 hypomobility. This eliminates contribution from lower cervical.",
        options:[
          { val:"Normal — 80° bilateral, FRT 40°+ each side", color:"#00c97a", meaning:"Full cervical rotation from both upper (C1/C2) and lower (C3–C7) cervical spine. No restriction. Normal driving vision, sport rotation, and head turning. Cervical facet joints and disc all contributing appropriately. No cervicogenic headache from rotation restriction." },
          { val:"Restricted — C1/C2 dominant (FRT positive)", color:"#ffb300", meaning:"Total rotation restricted and FRT <32° = upper cervical (C1/C2) restriction. Most common cause of cervicogenic headache and unilateral base-of-skull pain. Suboccipital muscles overactive. Upper cervical mobilisation (C1/C2 rotation and side-flex) + suboccipital release are treatment." },
          { val:"Restricted — lower cervical dominant", color:"#ff6b35", meaning:"Total rotation restricted but FRT normal = lower cervical (C3–C7) restriction. Facet joint or disc-related. Cervical rotation mobilisation at specific levels. Often related to thoracic stiffness causing lower cervical overload. Treat thoracic first, reassess." },
          { val:"Severely restricted bilateral — consider serious pathology", color:"#ff4d6d", meaning:"Both rotations severely restricted (especially if recent onset, no mechanism, or in older patient). Consider: RA (atlantoaxial instability — Sharp-Purser test FIRST), cervical myelopathy (Babinski/reflexes), infection, tumour. Urgent imaging if no mechanism. Do NOT manipulate until serious pathology ruled out." },
        ],
        treatment:"C1/C2: specific C1/C2 rotation manipulation or HVT (cervicogenic headache protocol). Suboccipital release + DNF activation. Lower cervical: segmental mobilisation at restricted level. Thoracic: always treat thoracic rotation restriction first as it directly improves cervical rotation. Home: cervical rotation active ROM × 10 reps each side daily.",
        chainEffect:"Restricted cervical rotation → patient rotates thoracic more → thoracic overload. Restricted cervical → SCM overworks → cervicogenic headache. DNF inhibition (CPA) is root cause in most cases.",
      },
      {
        id:"kc_cervical_flex_ext", label:"Cervical Flexion / Extension Mobility",
        role:"MOBILITY TEST", joint:"Cervical spine",
        how:"Patient seated. Flexion: chin-to-chest — normal = chin touches chest or ~80°. Extension: look to ceiling — normal = 70°. Measure with goniometer or inclinometer. Chin-to-chest test: failure to achieve = upper cervical restriction OR DNF weakness. Chin poke during extension (lower cervical extends, upper cervical flexes simultaneously) = forward head posture compensation. Observe quality: is movement smooth or jerky? Stiff segments produce jerky motion.",
        options:[
          { val:"Full range, smooth — flexion 80°, extension 70°", color:"#00c97a", meaning:"Full cervical flexion and extension. All segments contributing. Smooth arc of movement without jerky steps. DNF able to guide flexion without chin poke. No segment-specific stiffness. Normal disc and facet joint mechanics." },
          { val:"Flexion restricted — upper cervical or DNF weakness", color:"#ffb300", meaning:"Cannot flex fully (chin more than 2 finger-widths from chest). May be upper cervical (C0–C2) capsule restriction OR DNF too weak to guide forward head in flexion. Patient uses chin poke to start flexion. Assess DNF (CCFT) — if weak, activate. If joint restricted, mobilise. Distinguish by palpating joints during motion." },
          { val:"Extension restricted — disc or osteophyte", color:"#ff6b35", meaning:"Extension limited and painful. Pain at end-range extension suggests facet loading or posterior disc bulge. Pain arm with extension = foraminal compression (Spurling's context). Avoid aggressive extension mobilisation if radicular symptoms. Maitland Grade I–II first, reassess neurological status." },
          { val:"Chin poke pattern — forward head compensation", color:"#7f5af0", meaning:"During extension, chin pokes forward (upper cervical hyperextends, lower cervical fails to extend). Classic forward head posture. DNF inhibited. CT junction hypomobile. Patient cannot extend through lower cervical. Treat: CT junction mobilisation + DNF activation + thoracic extension." },
        ],
        treatment:"Restricted flexion: upper cervical mobilisation (C0–C2), DNF activation. Restricted extension: lower cervical extension mobilisation (Grade II–III initially), thoracic extension work. Chin poke: CT junction extension mobilisation + DNF programme. Home: segmental cervical self-mobilisation, chin tuck exercise.",
        chainEffect:"Restricted cervical extension → head cannot extend → thoracic must compensate → kyphosis. Restricted flexion + DNF weakness → cervicogenic headache, dizziness.",
      },
    ]
  },
};

// ─── KINETIC CHAIN SECTION COMPONENT ─────────────────────────────────────────
async function downloadPDFFromHTML(html, filename) {
  // Mobile-safe strategy: Blob URL → new tab → auto print
  // Works on iOS Safari, Android Chrome, and desktop browsers.
  // iframe approach is blocked by Safari CSP; window.open with Blob is not.
  return new Promise((resolve) => {
    try {
      // Inject auto-print script into the HTML before creating blob
      const printReady = html.replace(
        '</body>',
        `<script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
              // On mobile, print dialog close can't be detected — resolve after delay
              setTimeout(function() { try { window.close(); } catch(e){} }, 2000);
            }, 600);
          });
        <\/script></body>`
      );
      const blob = new Blob([printReady], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const tab = window.open(blobUrl, '_blank');
      if (tab) {
        // Revoke blob URL after tab has loaded
        tab.addEventListener('load', () => {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        });
        // Fallback revoke
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        resolve();
      } else {
        // Popup blocked — offer direct download of HTML as fallback
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename.replace('.pdf', '.html');
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); resolve(); }, 1000);
      }
    } catch(e) {
      console.error('PDF export error:', e);
      resolve();
    }
  });
}

// ── Shared page styles ─────────────────────────────────────────────────────
const PDF_BASE_STYLES = `
  @page { size: A4; margin: 18mm 20mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-break { break-inside: avoid; page-break-inside: avoid; }
    .page-break { page-break-before: always; }
  }
  * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
  body {
    background: #fff; color: #111827;
    font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif;
    font-size: 11px; line-height: 1.6; margin: 0; padding: 0;
  }
  h2 {
    font-size: 13px; font-weight: 800; color: #0369a1;
    border-left: 4px solid #0ea5e9; padding-left: 10px;
    margin: 16px 0 8px; letter-spacing: -0.2px;
  }
  h3 { font-size: 11.5px; font-weight: 700; color: #1e293b; margin: 10px 0 5px; }
  .page-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2.5px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 16px;
  }
  .logo { font-size: 20px; font-weight: 900; color: #0369a1; letter-spacing: -1px; }
  .logo em { color: #0ea5e9; font-style: normal; }
  .logo-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
  .meta-block { text-align: right; font-size: 10px; color: #374151; line-height: 1.7; }
  .meta-block strong { color: #111827; }
  .confid {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    background: #dcfce7; color: #15803d; font-weight: 700;
    font-size: 9px; margin-top: 4px; letter-spacing: 0.3px;
  }
  .disclaimer {
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
    padding: 8px 12px; font-size: 9.5px; color: #78350f; margin-bottom: 14px;
    line-height: 1.5;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
  .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 9px 12px; }
  .info-label { font-size: 8.5px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .info-value { font-size: 12px; font-weight: 700; color: #111827; }
  .section-box {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px;
    padding: 11px 14px; margin-bottom: 12px; white-space: pre-wrap;
    font-size: 10.5px; line-height: 1.7;
  }
  .badge {
    display: inline-block; padding: 2px 7px; border-radius: 5px;
    font-size: 9px; font-weight: 700; margin-bottom: 2px;
  }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .sig-row { margin-top: 28px; display: flex; gap: 30px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
  .sig-col { flex: 1; }
  .sig-line { height: 32px; border-bottom: 1px solid #94a3b8; margin-bottom: 5px; }
  .sig-label { font-size: 8.5px; color: #64748b; }
  .page-footer {
    margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0;
    font-size: 8.5px; color: #94a3b8; text-align: center; line-height: 1.6;
  }
`;

function makePDFPage(title, metaRight, bodyHTML, footerExtra = '') {
  const now = new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>${title}</title>
<style>${PDF_BASE_STYLES}</style>
</head>
<body>
<div class="page-header">
  <div>
    <div class="logo">Physio<em>Pro</em></div>
    <div class="logo-sub">${title}</div>
  </div>
  <div class="meta-block">
    ${metaRight}
    <div><span class="confid">CONFIDENTIAL — CLINICAL RECORD</span></div>
  </div>
</div>
${bodyHTML}
<div class="page-footer">
  Generated by PhysioPro Assessment Platform &nbsp;·&nbsp; ${now} &nbsp;·&nbsp; For authorised clinical use only
  ${footerExtra}
</div>
</body>
</html>`;
}

// ─── PDF GENERATOR ────────────────────────────────────────────────────────────
// ─── from ClinicalModules.jsx (depends on SCALES, MMT_DATA, CYRIAX_REGIONS_DATA above) ───
const SCALE_DATA_LABELS = Object.fromEntries(
  Object.values(SCALES).map(s => [s.id, s.label])
);

// Auto-derived from SPECIAL_TESTS_DATA (the same source SpecialTestsSection's
// own UI uses) instead of two separately hand-maintained label maps —
// verified against every real test: ST_LABEL_MAP (used in buildRealtimeSOAP,
// i.e. the actual SOAP paragraph + Live SOAP) was missing 57 of 89 real
// special tests; ST_NAMES (SOAPNoteModule's table view) was missing 10 of
// 89. Special Tests has a reasonable auto-format fallback already (unlike
// ROM's silent-drop bug), so a missing entry still showed up, just with a
// less clean label (e.g. "Fadir Test" instead of "FADIR Test") — lower
// severity than the ROM gap, but the same underlying staleness problem.
const ST_DATA_LABELS = Object.fromEntries(
  Object.values(SPECIAL_TESTS_DATA).flatMap(region => region.tests.map(t => [t.id, t.label]))
);

// Auto-derived from ROM_DATA (the same source ROMModule's own UI uses)
// instead of a hand-copied [label, key, norm] list — verified against every
// real movement: 16 of 56 real ROM movements were missing entirely from the
// old list (MCP/PIP/DIP finger flexion, thumb opposition/abduction, 1st MTP
// flexion/extension, TMJ mouth opening/deviation/protrusion, wrist radial/
// ulnar deviation, thoracic lateral flexion). This wasn't just a labeling
// gap like MMT's — those measurements didn't appear in the SOAP note or
// Live SOAP at all if recorded, since the old code only ever looked at
// movements in its fixed list. Deriving from ROM_DATA means every movement
// ROMModule can record is guaranteed to have a matching SOAP entry.
const ROM_DERIVED = Object.entries(ROM_DATA).flatMap(([region, movements]) =>
  movements.map(m => ({
    label: `${region} ${m.mv}`,
    key: m.id,
    norm: typeof m.normal === "number" ? m.normal : null,
    unit: m.unit || "°",
    bilateral: !!m.bilateral,
  }))
);

// Auto-derived from MMT_DATA (the same source MMTModule's own UI uses) instead
// of a second, separately hand-maintained list — verified against every real
// muscle ID: 38 of 72 real MMT muscles had NO entry in the old hand-written
// MMT_LABELS map (e.g. "mmt_scm", "mmt_trap_u", "mmt_iliop", "mmt_pirif" all
// fell through to a raw key-derived label instead of a proper name), which is
// exactly the readable-label gap the advanced-assessment modules (NKT/Kinetic
// Chain, verified 47/47 and 21/21 complete) didn't have. Deriving straight
// from MMT_DATA means this can never go stale the way a hand-copied list can.
const MMT_DATA_LABELS = Object.fromEntries(
  Object.values(MMT_DATA).flat().map(m => [m.id, m.muscle])
);
// Shared fallback for any muscle key that isn't in MMT_DATA_LABELS at all
// (confirmed via screenshot: real patient data can contain keys like
// "mmt_l3"/"mmt_s1" — spinal-level myotome shorthand, not an anatomical
// muscle ID — that fall all the way through to this fallback and, without
// this, render as a bare, unclear, inconsistently-cased fragment like "I3"
// or "s1"). Properly capitalizes, and recognizes single-letter+digit level
// patterns (C5, L3, S1, etc.) so they read as "L3 (Myotome level)" instead
// of an unexplained code.
function mmtFallbackLabel(raw) {
  const cleaned = raw.replace(/_/g, " ").trim();
  if (/^[a-z]\d+$/i.test(cleaned.replace(/\s/g, ""))) {
    return `${cleaned.replace(/\s/g, "").toUpperCase()} (Myotome level)`;
  }
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Shared Cyriax/STTT key resolver ────────────────────────────────────────
// Single source of truth for turning a cyriax_<region>_<fieldtype>_<testid>
// (or legacy cy_*) key into its real region label, field-type word, and test
// label. Before this, THREE separate copies of this parsing existed
// (buildRealtimeSOAP's Live SOAP text, SOAPNoteModule's visual card grid,
// and Patient Profile) and had drifted: all three used a LAZY region regex
// that mis-split any two-word region id (wrist_hand, ankle_foot) -- e.g.
// "cyriax_wrist_hand_act_rom_wr_a_flex" resolved region as just "wrist" and
// left "hand_" glued onto the remainder, which then failed every field-type
// check and fell through to a raw title-cased fallback: "Hand Act Rom Wr A
// Flex" instead of the real "Wrist Flexion". Fixing this once, here, and
// reusing it everywhere means it can't silently regress or diverge again.
const CYRIAX_REGION_LABELS = { cervical:"Cervical", shoulder:"Shoulder", elbow:"Elbow", wrist_hand:"Wrist/Hand", hip:"Hip", knee:"Knee", ankle_foot:"Ankle/Foot", lumbar:"Lumbar", thoracic:"Thoracic", tmj:"TMJ" };
const CYRIAX_REGION_KEYS = Object.keys(CYRIAX_REGIONS_DATA).sort((a,b)=>b.length-a.length);
const CYRIAX_FIELD_TYPES = [
  ["act_limited_","Limited: "],["act_comp_","Compensation: "],
  ["pass_pain_","Passive pain: "],["pass_rom_","Passive: "],["pass_ovp_","Overpressure: "],
  ["act_pain_","Pain: "],["act_rom_","ROM: "],["pass_ef_","End-feel: "],
  ["res_notes_","Notes: "],["res_","Resisted: "],
];
const CYRIAX_TEST_LABEL = {};
Object.entries(CYRIAX_REGIONS_DATA).forEach(([region, r]) => {
  CYRIAX_TEST_LABEL[region] = {};
  [...(r.activeROM||[]), ...(r.passiveROM||[]), ...(r.resistedTests||[])].forEach(t => {
    CYRIAX_TEST_LABEL[region][t.id] = t.label;
  });
});
const CYRIAX_LEGACY_REGION = { c:"Cervical", s:"Shoulder", e:"Elbow", k:"Knee", h:"Hip", w:"Wrist", t:"TMJ", f:"Foot/Ankle" };

// Returns { region, regionKey, word, testId, label, cat } for a single real
// cyriax_/cy_ key, or null if the key isn't recognizable at all.
function resolveCyriaxKey(k) {
  if (k.startsWith("cyriax_")) {
    const withoutPrefix = k.slice("cyriax_".length);
    const regionKey = CYRIAX_REGION_KEYS.find(rk => withoutPrefix.startsWith(rk + "_"));
    if (!regionKey) return null;
    const rest = withoutPrefix.slice(regionKey.length + 1);
    const region = CYRIAX_REGION_LABELS[regionKey] || regionKey.replace(/_/g," ");
    const ft = CYRIAX_FIELD_TYPES.find(([p]) => rest.startsWith(p));
    let word = "", testId = rest, cat = "active";
    if (ft) { const [prefix, w] = ft; word = w; testId = rest.slice(prefix.length); }
    if (rest.startsWith("res_")) cat = "resisted";
    else if (rest.startsWith("pass_")) cat = "passive";
    const label = (CYRIAX_TEST_LABEL[regionKey]||{})[testId] || testId.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
    return { region, regionKey, word, testId, label, cat };
  }
  if (k.startsWith("cy_")) {
    const legacyMatch = k.match(/^cy_([csekhwtf])_(.+)$/);
    if (legacyMatch) {
      const region = CYRIAX_LEGACY_REGION[legacyMatch[1]] || "";
      const label = legacyMatch[2].replace(/_/g," ").replace(/\b\w/g, l=>l.toUpperCase());
      let cat = "active";
      if (k.includes("_r_")) cat = "resisted"; else if (k.includes("_p_")) cat = "passive";
      return { region, regionKey:"", word:"", testId:legacyMatch[2], label, cat };
    }
    const label = k.replace(/^cy_/, "").replace(/_/g," ").replace(/\b\w/g, l=>l.toUpperCase());
    return { region:"", regionKey:"", word:"", testId:k, label, cat:"active" };
  }
  return null;
}
const EXERCISE_DB = {
  cervical: {
    label:"Cervical Spine", icon:"🔄", color:"#00e5ff",
    categories: {
      "Mobility & Flexibility": [
        { id:"cx_chin_tuck",        name:"Chin Tucks",                              target:"Deep cervical flexors (longus colli/capitis)",       desc:"Sitting or standing. Retract chin horizontally — not downward. Hold 5s.",   sets:3, reps:10, hold:5,  freq:"Hourly",   phase:"Phase 1", evidence:"Strong",    cues:"Double chin. Eyes level. No downward nod.",               progression:"Finger resistance → Cervical flexion at end range" },
        { id:"cx_rotation",         name:"Cervical Rotation AROM",                  target:"SCM, cervical rotators",                            desc:"Slow controlled rotation L & R. Do not force range.",                       sets:2, reps:10, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep shoulders still. Comfortable end range only.",       progression:"Overpressure with hand → Rotation with retraction" },
        { id:"cx_lat_flex",         name:"Lateral Neck Stretch",                    target:"Upper trapezius, SCM, scalenes, levator scapulae",  desc:"Tilt ear to shoulder. Opposite hand adds gentle overpressure. Hold 30s.",  sets:3, reps:1,  hold:30, freq:"3×/day",  phase:"Phase 1", evidence:"Moderate", cues:"Do not elevate the shoulder being stretched toward.",     progression:"Neural mobilisation add-on (depress contralateral shoulder)" },
        { id:"cx_extension",        name:"Cervical Extension over Towel Roll",      target:"Cervical extensors, posterior capsule",             desc:"Supported head extension over rolled towel. Controlled range.",             sets:2, reps:10, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Avoid end-range compression if symptomatic.",             progression:"Add rotation in extension" },
        { id:"cx_flex_stretch",     name:"Cervical Flexion Stretch",                target:"Cervical extensors, suboccipitals",                 desc:"Gently tuck chin and nod head forward. Add gentle hand pressure.",          sets:3, reps:1,  hold:20, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Nod first — then bow. No aggressive overpressure.",       progression:"Add diagonal flexion → Sustained hold" },
        { id:"cx_suboccip_release", name:"Suboccipital Self-Release",               target:"Suboccipitals, occiput",                            desc:"Supine. Fingers under skull base. Allow head weight to release. Breathe.",  sets:1, reps:1,  hold:120,freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Relax jaw and neck completely. Breathe deeply.",           progression:"Add gentle small nodding motion" },
      ],
      "Strengthening": [
        { id:"cx_dnf",              name:"Deep Neck Flexor Endurance",              target:"Longus colli, longus capitis",                      desc:"Supine. Chin tuck lifting head 1cm. Hold without pressure drop.",           sets:3, reps:10, hold:10, freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Nod — do not flex fully. Pressure gauge must not drop.",  progression:"Increase hold → Add leg extension" },
        { id:"cx_isometric",        name:"Cervical Isometric Strengthening",        target:"All cervical muscles — direction-specific",         desc:"Hand against head. No movement. Build force 50–70% max. All 4 directions.", sets:3, reps:8,  hold:5,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"No pain or symptom reproduction. Build gradually.",       progression:"Increase resistance → Perturbation training" },
        { id:"cx_scap_ret",         name:"Scapular Retraction",                     target:"Mid/lower trapezius, rhomboids",                    desc:"Squeeze shoulder blades together and down. Essential for cervical posture.", sets:3, reps:15, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Blades together AND down. No shoulder elevation.",        progression:"Band rows → Prone Y/T/W → Single-arm cable row" },
        { id:"cx_neck_ext_iso",     name:"Cervical Extension Isometric Hold",       target:"Cervical extensors, upper trapezius",               desc:"Hands clasped behind head. Press head back into resistance. Hold 5s.",      sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"No movement of head. Steady force build-up.",             progression:"Add retraction before hold → Resistance bands" },
      ],
      "Neural Mobilisation": [
        { id:"cx_neural_slider",    name:"Upper Limb Neural Slider (Median)",       target:"Median nerve — brachial plexus",                   desc:"Side-flex neck away + extend elbow + dorsiflex wrist simultaneously.",      sets:3, reps:10, hold:0,  freq:"2×/day",   phase:"Phase 2", evidence:"Moderate", cues:"Neck and hand move in OPPOSITE directions. No pain.",     progression:"Add shoulder abduction → Tensioner technique" },
        { id:"cx_neural_ulnar",     name:"Upper Limb Neural Slider (Ulnar)",        target:"Ulnar nerve — C8/T1",                              desc:"Elbow flexion + wrist extension + neck lateral flex away. Slider.",         sets:3, reps:10, hold:0,  freq:"2×/day",   phase:"Phase 2", evidence:"Moderate", cues:"Smooth rhythmic movement. Stop if sharp or burning pain.", progression:"Add wrist deviation → Tensioner" },
        { id:"cx_neural_radial",    name:"Upper Limb Neural Slider (Radial)",       target:"Radial nerve — C6/C7",                             desc:"Shoulder IR + elbow extension + wrist flex + neck lateral flex away.",      sets:3, reps:10, hold:0,  freq:"2×/day",   phase:"Phase 2", evidence:"Moderate", cues:"Rhythmic. Smooth and synchronised movements.",            progression:"Add shoulder depression → Tensioner" },
      ],
    }
  },
  shoulder: {
    label:"Shoulder", icon:"🏋", color:"#7f5af0",
    categories: {
      "Rotator Cuff": [
        { id:"sh_er_band",          name:"External Rotation with Band",             target:"Infraspinatus, teres minor",                       desc:"Elbow at side, 90° flexion. Rotate outward against resistance.",            sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Elbow stays against body. Control the return.",           progression:"Increase resistance → ER at 90° abduction → Prone ER" },
        { id:"sh_empty_can",        name:"Empty Can (Supraspinatus Isolation)",     target:"Supraspinatus",                                    desc:"Arm in scapular plane (30° fwd), thumb down. Elevate to 90°.",              sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Stop if painful arc. Pain-free range initially.",         progression:"Full can (thumb up) → Side-lying ER → Overhead load" },
        { id:"sh_prone_er",         name:"Prone External Rotation 90/90",           target:"Infraspinatus, posterior cuff",                    desc:"Prone, arm 90° abducted, elbow 90° flexed. Rotate forearm upward.",         sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Keep shoulder at 90°. No trunk rotation.",                progression:"Add resistance → Side-lying → Standing cable" },
        { id:"sh_ir_stretch",       name:"Sleeper Stretch",                         target:"Posterior GH capsule, posterior cuff",             desc:"Side-lying on affected side. Other arm pushes forearm down. Hold 30s.",     sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Keep shoulder blade stable. No impingement pain.",        progression:"Cross-body stretch → Standing posterior stretch" },
        { id:"sh_sidelying_ir",     name:"Side-Lying Internal Rotation",            target:"Subscapularis",                                    desc:"Side-lying, arm at side, elbow 90°. Rotate forearm downward with resistance.", sets:3, reps:12, hold:2, freq:"Daily",   phase:"Phase 2", evidence:"Strong",    cues:"Control rotation — no wrist compensation.",               progression:"Increase resistance → Standing IR with band" },
        { id:"sh_diagonal_d2",      name:"PNF D2 Flexion Pattern",                  target:"Rotator cuff, deltoid — diagonal pattern",         desc:"Start: hand across body down. Finish: hand up/out/rotated above shoulder.", sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 3", evidence:"Strong",    cues:"Move through full diagonal smoothly. Breathe out on exertion.", progression:"Increase resistance → Add speed → Sport-specific" },
        { id:"sh_rhythmic_stab",    name:"Rhythmic Stabilisation",                  target:"Rotator cuff co-contraction",                      desc:"Shoulder in supported position. Apply alternating perturbations. Resist.",   sets:3, reps:10, hold:2,  freq:"Daily",    phase:"Phase 3", evidence:"Strong",    cues:"Match resistance — do not let shoulder move.",            progression:"Increase speed → Unstable surface" },
      ],
      "Scapular Stabilisation": [
        { id:"sh_wall_slide",       name:"Wall Slides",                             target:"Serratus anterior, lower trapezius",                desc:"Forearms on wall. Slide arms upward maintaining contact. Protract at top.",  sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Keep scapulae on ribcage. No winging.",                   progression:"Resistance band → Overhead cable → Push-up plus" },
        { id:"sh_prone_ytw",        name:"Prone Y-T-W",                             target:"Lower trap (Y), mid trap (T), rhomboids (W)",       desc:"Prone on bench. Thumbs up. Raise in Y, T, and W patterns.",                 sets:3, reps:12, hold:3,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Depress scapulae first. No neck tension.",                progression:"Add weight → Cable variations → TRX" },
        { id:"sh_face_pull",        name:"Face Pulls",                              target:"Posterior deltoid, external rotators, mid/lower trap", desc:"Cable/band at face height. Pull to forehead with ER. Elbows high.",      sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Elbows above wrists at end range. External rotate fully.", progression:"Increase resistance → Single-arm" },
        { id:"sh_push_plus",        name:"Push-Up Plus",                            target:"Serratus anterior — highest EMG",                   desc:"Push-up position. At top, add extra protraction. Hold 2s.",                 sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Only the extra protraction is the exercise.",             progression:"Knee → Full → TRX push-up plus" },
        { id:"sh_sidelying_abd",    name:"Side-Lying Shoulder Abduction",           target:"Middle deltoid, supraspinatus — scapular plane",   desc:"Side-lying. Raise arm in scapular plane to 90°. Control return.",           sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Thumb slightly up. Stay in pain-free arc.",               progression:"Add weight → Standing lateral raise" },
        { id:"sh_scap_clock",       name:"Scapular Clock Exercise",                 target:"Periscapular muscles — all directions",             desc:"Seated or prone. Move scapula in all directions in sequence.",              sets:3, reps:8,  hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Isolated scapular movement — do not move arm.",           progression:"Add speed → Add resistance" },
      ],
      "Mobility": [
        { id:"sh_pendulum",         name:"Codman's Pendulum",                       target:"GH joint — passive decompression",                 desc:"Lean forward, arm hanging. Small circles using trunk momentum.",             sets:3, reps:20, hold:0,  freq:"3×/day",   phase:"Phase 1", evidence:"Moderate", cues:"Arm is PASSIVE. Let gravity do the work.",                progression:"Increase circle size → Add 0.5–1kg" },
        { id:"sh_pec_stretch",      name:"Pectoralis Minor Stretch",                target:"Pectoralis minor, anterior capsule",                desc:"Doorway stretch. Arm at 90°. Step through. Or supine on foam roller.",       sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Do not arch lower back. Core engaged.",                   progression:"Corner stretch → Unilateral with scapular PT cue" },
        { id:"sh_pully",            name:"Shoulder Pulley AROM",                    target:"GH joint — ROM restoration",                       desc:"Overhead pulley. Use good arm to assist bad arm through range.",             sets:3, reps:15, hold:2,  freq:"3×/day",   phase:"Phase 1", evidence:"Moderate", cues:"Assisted — do not force range. Smooth movement.",         progression:"Reduce assistance → AROM → Add load" },
        { id:"sh_capsule_stretch",  name:"Inferior Capsule Stretch",                target:"Inferior GH capsule — frozen shoulder",            desc:"Supine. Hold arm at side, slightly abducted. Gentle traction downward.",     sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Moderate", cues:"Gentle traction only. No pain reproduction.",             progression:"Increase hold → Combine with ER stretches" },
      ],
    }
  },
  elbow: {
    label:"Elbow & Forearm", icon:"💪", color:"#f59e0b",
    categories: {
      "Lateral Epicondylalgia": [
        { id:"el_isometric_ext",    name:"Wrist Extension Isometric",               target:"ECRB — isometric analgesic",                       desc:"Fist clenched. Press wrist into table or hand. No movement. 5–6/10 effort.", sets:4, reps:1, hold:45, freq:"Daily",     phase:"Phase 1", evidence:"Strong",    cues:"No pain >4/10. Neutral wrist throughout.",                progression:"Progress to Tyler Twist" },
        { id:"el_tyler_twist",      name:"Tyler Twist (Eccentric Wrist Extension)", target:"ECRB — eccentric (Vicenzino protocol)",            desc:"Eccentric wrist extension with rubber bar. Bend + straighten elbow simultaneously.", sets:3, reps:15, hold:0, freq:"Daily", phase:"Phase 2", evidence:"Strongest — 81% success rate", cues:"Eccentric wrist extension only. Use Therabar.",           progression:"Increase bar resistance weekly" },
        { id:"el_wrist_ext_isoton", name:"Wrist Extension Isotonic",                target:"ECRB, ECRL",                                       desc:"Forearm pronated. Light weight. Extend wrist 3s. Lower 3s.",                sets:3, reps:15, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Full range. Control the lowering phase.",                 progression:"Increase load weekly → Add ulnar/radial deviation" },
        { id:"el_grip_strength",    name:"Progressive Grip Strengthening",          target:"Forearm flexors and extensors",                    desc:"Stress ball or grip trainer. Squeeze and release. Full range.",              sets:3, reps:20, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"No pain. Stop if >3/10.",                                 progression:"Increase resistance → Wrist roller" },
      ],
      "Medial Epicondylalgia": [
        { id:"el_wrist_flex_iso",   name:"Wrist Flexion Isometric",                 target:"FCR, FCU, PT — isometric",                         desc:"Press wrist down into table or hand. No movement. 5–6/10 effort.",          sets:4, reps:1,  hold:45, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"No joint movement. Pain must not exceed 4/10.",           progression:"Isotonic wrist flexion → Eccentric loading" },
        { id:"el_wrist_flex_eccen", name:"Wrist Flexion Eccentric",                 target:"FCR, FCU — eccentric",                             desc:"Supinate forearm. Flex wrist, use other hand to extend eccentrically.",      sets:3, reps:15, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Slow eccentric (3–4s down). Control throughout.",         progression:"Increase load → Functional tools" },
        { id:"el_forearm_stretch",  name:"Forearm Flexor Stretch",                  target:"Forearm flexors — medial epicondyle",               desc:"Elbow extended. Wrist extended. Gentle overpressure with other hand.",       sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Moderate", cues:"Feel stretch in forearm — not elbow pain.",               progression:"Add forearm supination → Neural component" },
      ],
      "Elbow Mobility": [
        { id:"el_pron_sup",         name:"Forearm Pronation-Supination",            target:"Pronator teres, supinator",                         desc:"Elbow at 90°. Slowly pronate and supinate. Use dowel for feedback.",         sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep elbow still. Move only at forearm.",                 progression:"Add resistance with weighted dowel" },
        { id:"el_active_flex_ext",  name:"Elbow Active ROM Flexion-Extension",      target:"Biceps, brachialis, triceps",                       desc:"Slowly flex and extend elbow through available range.",                      sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Move to comfortable end range. No forcing.",              progression:"Add gentle overpressure → Weighted ROM" },
        { id:"el_tricep_stretch",   name:"Triceps Stretch",                         target:"Triceps brachii, posterior capsule",                desc:"Arm overhead, elbow bent. Other hand pulls elbow back gently.",              sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep neck neutral. Feel posterior arm stretch.",           progression:"Add gentle overpressure → Combined shoulder stretch" },
      ],
    }
  },
  wrist_hand: {
    label:"Wrist & Hand", icon:"🖐", color:"#e879f9",
    categories: {
      "Wrist Rehabilitation": [
        { id:"wh_wrist_flex_ext",   name:"Wrist Flexion-Extension AROM",            target:"Wrist flexors and extensors",                      desc:"Forearm supported. Move wrist through flexion and extension slowly.",        sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Support forearm. Move only the wrist.",                   progression:"Add resistance → Wrist roller" },
        { id:"wh_radial_ulnar",     name:"Radial-Ulnar Deviation",                  target:"ECRL, ECU, FCR, FCU",                              desc:"Forearm pronated. Move wrist side to side.",                                 sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep forearm still. Controlled movement.",                progression:"Add resistance → Combined diagonal" },
        { id:"wh_tendon_glide",     name:"Tendon Gliding Exercises",                target:"FDP, FDS, extensor tendons",                       desc:"Sequence: straight → hook fist → full fist → flat fist → tip-pinch. 5s each.", sets:3, reps:10, hold:5, freq:"3×/day", phase:"Phase 1", evidence:"Strong",    cues:"Move through each position fully. Slow and controlled.",  progression:"Add resistance → Functional grip tasks" },
        { id:"wh_nerve_glide",      name:"Median Nerve Glide (CTS)",                target:"Median nerve — carpal tunnel",                     desc:"Wrist neutral. Extend fingers/wrist → add neck lateral flex away. Slider.", sets:3, reps:10, hold:0,  freq:"2×/day",   phase:"Phase 2", evidence:"Moderate", cues:"No pain. Mild stretch only. Smooth movement.",            progression:"Tensioner technique if slider resolves" },
        { id:"wh_grip_strength2",   name:"Grip and Pinch Strengthening",            target:"Intrinsic hand muscles, extrinsic flexors",        desc:"Putty or grip trainer. Full grip and 3-point pinch. Progressive resistance.", sets:3, reps:20, hold:2, freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Full range. Maintain neutral wrist.",                      progression:"Increase resistance → Functional tools" },
        { id:"wh_finger_ext",       name:"Finger Extension Strengthening",          target:"Extensor digitorum — balanced grip",               desc:"Rubber band around fingers. Open hand against resistance. All fingers.",     sets:3, reps:20, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Fully open hand. Control return.",                        progression:"Increase resistance → Individual finger extensions" },
      ],
      "De Quervain's / Thumb": [
        { id:"wh_thumb_abduction",  name:"Thumb Abduction Strengthening",           target:"APL, EPB, APB",                                    desc:"Rubber band around thumb and index. Open against resistance.",               sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"No wrist deviation during exercise.",                     progression:"Increase band resistance → Pinch tasks" },
        { id:"wh_dq_stretch",       name:"Finkelstein Stretch (De Quervain's)",     target:"APL, EPB — De Quervain's syndrome",                desc:"Thumb in palm, fingers wrapped over. Ulnar deviate wrist gently. Hold.",    sets:3, reps:1,  hold:20, freq:"3×/day",   phase:"Phase 1", evidence:"Moderate", cues:"Gentle. Stop if sharp pain. Self-mobilisation only.",     progression:"Add gentle ulnar deviation in function" },
        { id:"wh_opposition",       name:"Thumb Opposition Exercises",              target:"Opponens pollicis, intrinsics — fine motor",       desc:"Touch thumb to each fingertip in sequence. Slow and precise.",              sets:3, reps:10, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Precise contact. No substitution patterns.",              progression:"Add resistance with putty → Fine motor tasks" },
      ],
    }
  },
  lumbar: {
    label:"Lumbar Spine", icon:"🦴", color:"#ffb300",
    categories: {
      "Core Stabilisation": [
        { id:"lb_tva",              name:"Transversus Abdominis Activation",         target:"Transversus abdominis, multifidus",                desc:"Supine hook-lying. Draw navel 30% toward spine. Hold. No breath-holding.",  sets:3, reps:10, hold:10, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"30% contraction. Normal breathing. No rib flare.",        progression:"Leg slide → Dead bug → Plank" },
        { id:"lb_dead_bug",         name:"Dead Bug",                                 target:"TA, anti-extension core",                          desc:"Supine, arms up, hips/knees 90°. Lower opposite arm/leg toward floor.",     sets:3, reps:8,  hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Lower back must NOT lift. Exhale as you lower.",          progression:"Resistance band → Both legs → Add weight" },
        { id:"lb_bird_dog",         name:"Bird Dog",                                 target:"Multifidus, gluteus maximus, anti-rotation core", desc:"Quadruped. Extend opposite arm/leg. Hold 8s. Return under control.",        sets:3, reps:10, hold:8,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Do not rotate pelvis. Squeeze glute on extended leg.",    progression:"Add resistance → Increase hold → 3-point bird dog" },
        { id:"lb_plank",            name:"Plank (Prone)",                            target:"TA, erector spinae, glutes",                       desc:"Forearms and toes. Neutral spine. Brace core. Hold.",                       sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Long body. Squeeze glutes. Do not hold breath.",          progression:"Increase hold → Side plank → Dynamic plank" },
        { id:"lb_side_plank",       name:"Side Plank",                               target:"Quadratus lumborum, obliques, glute medius",       desc:"Forearm side plank. Hips forward and up. Hold.",                            sets:3, reps:1,  hold:20, freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Stack feet or stagger. Push hip to ceiling.",            progression:"Hip dip → Leg raise → Full side plank" },
        { id:"lb_hollow_hold",      name:"Hollow Body Hold",                         target:"Rectus abdominis, TA, hip flexors",                desc:"Supine. Press lower back flat. Arms overhead, legs extended and raised 6\".", sets:3, reps:1, hold:20, freq:"Daily",   phase:"Phase 2", evidence:"Moderate", cues:"Do not allow lower back to lift. Bend knees if needed.",  progression:"Increase hold → Add rocking motion" },
        { id:"lb_stir_pot",         name:"Stir the Pot (Swiss Ball)",                target:"TA, obliques, anti-rotation",                      desc:"Plank on Swiss ball. Trace large circles with elbows. Neutral spine.",       sets:3, reps:8,  hold:0,  freq:"Daily",    phase:"Phase 3", evidence:"Strong",    cues:"Circles each direction. Don't let hips rotate.",          progression:"Increase circle size → Increase speed" },
        { id:"lb_rollout",          name:"Ab Wheel Rollout",                         target:"TA, latissimus — anti-extension strength",          desc:"Kneel with ab wheel. Roll forward maintaining flat back. Return.",           sets:3, reps:8,  hold:0,  freq:"Daily",    phase:"Phase 3", evidence:"Strong",    cues:"Do NOT let hips sag. Neutral spine throughout.",          progression:"Increase ROM → Standing rollout" },
        { id:"lb_pelvic_tilt",      name:"Posterior Pelvic Tilt",                    target:"TA, glutes, lumbar flexors",                       desc:"Supine hook-lying. Flatten lower back against floor. Hold 10s.",            sets:3, reps:10, hold:10, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Breathe normally. Gently tighten abdomen.",               progression:"Standing PPT → Functional positions" },
      ],
      "Hip & Glute Integration": [
        { id:"lb_glute_bridge",     name:"Glute Bridge",                             target:"Gluteus maximus, hamstrings",                      desc:"Supine hook-lying. Drive hips up. Squeeze glutes. Hold 2s at top.",          sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Drive through heels. Neutral spine — don't hyperextend.", progression:"Single-leg → Add weight → Hip thrust" },
        { id:"lb_single_leg_bridge",name:"Single-Leg Bridge",                        target:"Gluteus maximus — unilateral loading",             desc:"Glute bridge with one leg extended. Drive through planted heel.",            sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Keep pelvis level. Squeeze glute on planted side.",       progression:"Add load → Hamstring curl on Swiss ball" },
        { id:"lb_hip_hinge",        name:"Hip Hinge (Deadlift Pattern)",             target:"Gluteus maximus, hamstrings, TA",                  desc:"Stand, hinge at hips NOT waist. Maintain neutral spine.",                    sets:3, reps:12, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Push hips back — not knees forward. Chest up.",           progression:"Dowel drill → Romanian DL → Conventional DL" },
        { id:"lb_hip_flexor",       name:"Hip Flexor Stretch (Kneeling Lunge)",      target:"Iliopsoas, rectus femoris",                        desc:"Kneeling lunge. Posterior pelvic tilt. Drive hip forward. Hold 30s.",        sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Tuck pelvis FIRST, THEN lean forward. No lumbar extension.", progression:"Add thoracic rotation → RNT lunge" },
        { id:"lb_suitcase_carry",   name:"Suitcase Carry (Lateral Stability)",       target:"QL, obliques, lateral stability",                  desc:"Hold weight in one hand. Walk maintaining level hips and shoulders.",        sets:3, reps:1,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Don't let loaded side drop. Resist Trendelenburg.",       progression:"Increase load → Increase distance → Overhead carry" },
        { id:"lb_farmers_carry",    name:"Farmer's Carry",                           target:"Core stability, grip, postural endurance",         desc:"Hold heavy weights by sides. Walk with perfect posture 20m.",               sets:3, reps:1,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Tall posture. Don't let weight pull shoulders down.",     progression:"Increase load → Suitcase carry → Overhead" },
      ],
      "McKenzie Extension": [
        { id:"lb_prone_lying",      name:"Prone Lying",                              target:"Lumbar extensors — posterior disc restoration",    desc:"Lie prone flat. Relax completely. 5 min.",                                   sets:3, reps:1,  hold:300,freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Pillow under abdomen if uncomfortable initially.",        progression:"Props on elbows → Press-ups → Standing extensions" },
        { id:"lb_press_up",         name:"McKenzie Press-Up",                        target:"Lumbar extensors — centralisation",                desc:"Prone. Hands under shoulders. Push upper body up. Pelvis stays down.",       sets:3, reps:10, hold:1,  freq:"2-hourly",  phase:"Phase 1", evidence:"Strong",    cues:"Let lumbar sag. Relax abdomen. Centralisation = good sign.", progression:"Increase reps → Sustained extension → Standing" },
        { id:"lb_standing_ext",     name:"Standing Extension",                       target:"Lumbar extensors — erect posture loading",         desc:"Stand with hands on low back. Extend lumbar spine backward 10 times.",       sets:3, reps:10, hold:1,  freq:"2-hourly",  phase:"Phase 1", evidence:"Strong",    cues:"Breathe out as you extend. Keep legs straight.",          progression:"Increase ROM → Add over-pressure with hands" },
      ],
      "Flexion & Mobility": [
        { id:"lb_knee_chest",       name:"Knee-to-Chest Stretch",                    target:"Lumbar extensors, facet joints, piriformis",       desc:"Supine. Both knees to chest. Gentle rocking. Hold 30s.",                    sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Do not pull head forward. Relax completely.",             progression:"Single knee → Figure 4 → Seated forward bend" },
        { id:"lb_cat_camel",        name:"Cat-Camel",                                target:"Lumbar & thoracic mobility — full range",           desc:"Quadruped. Arch up (cat) then sag (camel). Slow rhythmic.",                 sets:3, reps:10, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Move to comfortable end range each way.",                 progression:"Add rotation → Combine with bird dog" },
        { id:"lb_rotation_stretch", name:"Supine Lumbar Rotation Stretch",           target:"Lumbar rotators, thoracic extensors, piriformis",  desc:"Supine, knees bent. Drop both knees to one side. Hold 30s.",                sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep shoulders flat. Let gravity rotate legs.",           progression:"Add leg extension → Add hip movement" },
        { id:"lb_piriformis",       name:"Piriformis Stretch",                       target:"Piriformis, deep hip external rotators",           desc:"Supine. Cross ankle over opposite knee. Pull thigh toward chest.",           sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep ankle flexed. Feel stretch deep in buttock.",        progression:"Seated figure 4 → Pigeon pose" },
      ],
      "Loading & Functional": [
        { id:"lb_squat",            name:"Squat Pattern Progression",                target:"Quadriceps, glutes, lumbar extensors",             desc:"Bodyweight squat — 3s descent, 1s pause, 1s rise.",                         sets:3, reps:12, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Neutral spine. Knees track toes. Hips back and down.",    progression:"Add weight → Bulgarian split squat → Single-leg" },
        { id:"lb_copenhagen",       name:"Copenhagen Hip Adduction",                 target:"Hip adductors — lateral pelvic stability",         desc:"Side plank. Top leg on bench. Lift bottom leg to meet it. Hold.",           sets:3, reps:10, hold:3,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Keep hips forward. Controlled lift.",                     progression:"Increase hold → Reduce support" },
      ],
    }
  },
  hip: {
    label:"Hip", icon:"🦴", color:"#f97316",
    categories: {
      "Gluteal Strengthening": [
        { id:"hp_clam",             name:"Clamshells",                               target:"Gluteus medius, hip external rotators",            desc:"Side-lying, hips 45° flexed. Rotate top knee up. Keep pelvis still.",        sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Do not rotate pelvis backward.",                          progression:"Resistance band → Side-lying abduction → Standing" },
        { id:"hp_lat_walk",         name:"Lateral Band Walks",                       target:"Gluteus medius, minimus, TFL",                     desc:"Band around ankles/knees. Semi-squat. Step sideways.",                       sets:3, reps:15, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Keep knees tracking over toes. Control trailing leg.",    progression:"Monster walks → Increase resistance → Single-leg" },
        { id:"hp_hip_thrust",       name:"Hip Thrust",                               target:"Gluteus maximus — highest EMG",                    desc:"Upper back on bench, feet flat. Drive hips up. Squeeze glutes at top.",     sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Neutral spine at top. Drive through heels.",              progression:"Barbell → Single-leg → Banded hip thrust" },
        { id:"hp_step_up",          name:"Step-Ups",                                 target:"Gluteus maximus, hip abductors, quadriceps",       desc:"Step onto box. Drive through heel. Control lowering.",                       sets:3, reps:12, hold:1,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Lean slightly forward. Don't push off back foot.",        progression:"Increase step height → Add weight → Lateral step-ups" },
        { id:"hp_monster_walk",     name:"Monster Walks (Forward/Backward)",         target:"Gluteus medius, TFL — dynamic stability",          desc:"Band around ankles. Walk forward/backward in quarter-squat.",               sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Toe out slightly. Keep knees slightly bent.",             progression:"Increase resistance → Add diagonal direction" },
        { id:"hp_fire_hydrant",     name:"Fire Hydrant",                             target:"Gluteus medius, hip abductors",                    desc:"Quadruped. Lift knee out to side maintaining hip height.",                   sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Do not rotate pelvis or shift weight.",                   progression:"Add resistance band → Extend leg → Standing" },
        { id:"hp_standing_abd",     name:"Standing Hip Abduction",                   target:"Gluteus medius, minimus",                          desc:"Stand on one leg. Lift other leg out to side 30–40°. Control return.",       sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Keep pelvis level. No Trendelenburg.",                    progression:"Add ankle weight → Cable → SL balance with abduction" },
        { id:"hp_side_step_squat",  name:"Side-Step Squats with Band",               target:"Gluteus medius, quadriceps — functional",          desc:"Band above knees. Squat position. Side steps maintaining knee alignment.",   sets:3, reps:20, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Stay low throughout. Knees over toes.",                   progression:"Increase resistance → Add overhead press" },
      ],
      "Mobility & Flexibility": [
        { id:"hp_90_90",            name:"90/90 Hip Stretch",                        target:"Hip IR & ER — both hips",                          desc:"Seated on floor, both hips at 90°. Sit tall. Hold 60s per side.",           sets:2, reps:1,  hold:60, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Both sit bones on floor. Breathe.",                       progression:"Forward fold → Lateral lean → Dynamic transitions" },
        { id:"hp_pigeon",           name:"Pigeon Pose",                              target:"Piriformis, deep hip external rotators",           desc:"Front leg at 90°. Back leg extended. Lower chest forward.",                  sets:3, reps:1,  hold:60, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Front foot flexed. Square hips.",                         progression:"Quad stretch add-on → Supported → Dynamic pigeon" },
        { id:"hp_thomas",           name:"Thomas Test Stretch",                      target:"Iliopsoas, rectus femoris",                        desc:"Supine at table edge. Hold one knee. Let other leg hang and feel stretch.", sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Lumbar flat. No external rotation of hanging leg.",       progression:"Add knee bend (RF) → Standing lunge → RNT lunge" },
        { id:"hp_adductor_stretch", name:"Adductor Stretch (Butterfly)",             target:"Hip adductors — groin",                            desc:"Seated. Soles of feet together. Gently press knees toward floor.",           sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Lean forward from hips — don't round lower back.",        progression:"Increase ROM → Side-lying → Standing sumo stretch" },
        { id:"hp_ober_stretch",     name:"IT Band / TFL Stretch (Ober's)",           target:"IT band, TFL",                                     desc:"Side-lying. Top leg extended behind body. Allow to drop by gravity.",        sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Hips stacked. Don't flex hip — extend and adduct.",      progression:"Cross-leg stretch → Foam roller → Lateral wall stretch" },
        { id:"hp_couch_stretch",    name:"Couch Stretch (Rectus Femoris)",           target:"Rectus femoris, hip flexors",                      desc:"Rear foot against wall. Front leg forward. PPT first. Upright posture.",     sets:3, reps:1,  hold:45, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"PPT first. Feel stretch front of thigh — not knee.",     progression:"Increase hold → Add trunk extension → Walking lunge" },
      ],
      "Hip Flexor Loading": [
        { id:"hp_psoas_march",      name:"Psoas March",                              target:"Iliopsoas, TA — coordinated loading",               desc:"Standing. Resist hip flexion with hand. March in place with resistance.",    sets:3, reps:10, hold:3,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Maintain upright posture. Don't lean back.",              progression:"Band resistance → Step up → Single-leg balance march" },
        { id:"hp_hip_flex_raise",   name:"Seated Hip Flexion Raise",                 target:"Iliopsoas — rehabilitation loading",                desc:"Seated on edge of table. Slowly raise knee 5cm. Hold 10s. Lower.",           sets:3, reps:10, hold:10, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Don't lean back. Isolated hip flexion.",                  progression:"Add resistance above knee → Standing → Resisted march" },
      ],
    }
  },
  knee: {
    label:"Knee", icon:"🦵", color:"#22d3ee",
    categories: {
      "Quadriceps": [
        { id:"kn_tqe",              name:"Terminal Knee Extension (TKE)",            target:"VMO — last 30° extension",                         desc:"Band behind knee. Drive to full extension against resistance.",              sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Full extension — lock knee out. Keep foot on floor.",     progression:"Increase resistance → Single-leg → Mini-squat" },
        { id:"kn_vmo_squat",        name:"VMO Squat (Narrow Stance)",                target:"VMO — medial quadriceps",                          desc:"Narrow stance, toes slightly out. Squat to 60°.",                            sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Track knee over 2nd toe. No knee cave.",                  progression:"Add weight → Bulgarian split squat → Single-leg" },
        { id:"kn_step_down",        name:"Eccentric Step-Down",                      target:"Quadriceps eccentric, glute medius — alignment",   desc:"Stand on step. Lower heel of other foot to floor in 4 seconds.",            sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"4-second lowering. Knee tracks over toe. No valgus.",     progression:"Increase step height → Add weight vest → SL squat" },
        { id:"kn_sit_to_stand",     name:"Sit-to-Stand (Chair Squats)",              target:"Quadriceps, glutes — functional pattern",          desc:"Rise from chair slowly (3s). Control lowering (3s). Hold at top.",           sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Lean forward first. Drive through heels. Stand tall.",    progression:"Lower chair → Add weight → One-legged STS" },
        { id:"kn_quad_set",         name:"Quad Set (Isometric Quad Contraction)",    target:"Quadriceps — isometric",                           desc:"Supine. Towel under knee. Press knee down into towel. Hold 10s.",            sets:3, reps:10, hold:10, freq:"Hourly",   phase:"Phase 1", evidence:"Strong",    cues:"Feel quads tighten without knee moving.",                 progression:"Straight leg raise → TKE" },
        { id:"kn_straight_leg",     name:"Straight Leg Raise",                       target:"Quadriceps (isometric), hip flexors",               desc:"Supine. Quad set first. Raise straight leg to 45°. Hold 2s. Lower.",         sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Quad set BEFORE raising. Keep foot dorsiflexed.",         progression:"Add ankle weight → Progress to TKE" },
        { id:"kn_leg_press",        name:"Leg Press (Short Arc)",                    target:"Quadriceps, glutes — controlled loading",          desc:"Leg press machine. Start from 90°. Extend to full extension. Slow return.",  sets:3, reps:12, hold:0,  freq:"3×/week",  phase:"Phase 2", evidence:"Strong",    cues:"Push through whole foot. Control lowering 3–4s.",         progression:"Increase load → Full range → Single-leg" },
      ],
      "Hamstrings": [
        { id:"kn_nordic",           name:"Nordic Hamstring Curl",                    target:"Biceps femoris, semimembranosus — eccentric",      desc:"Kneel, feet anchored. Lower body slowly controlling with hamstrings.",       sets:3, reps:6,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strongest — 51% hamstring injury reduction", cues:"Lower as slowly as possible. Push up with hands.",        progression:"Increase reps → Add resistance → Glider curl" },
        { id:"kn_rdl",              name:"Romanian Deadlift (RDL)",                  target:"Hamstrings, gluteus maximus",                      desc:"Hinge at hips. Lower bar along legs. Feel hamstring stretch.",               sets:3, reps:12, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Bar stays close to legs. Neutral spine.",                 progression:"Single-leg → Add weight → Deficit RDL" },
        { id:"kn_prone_curl",       name:"Prone Hamstring Curl",                     target:"Hamstrings — isolated loading",                    desc:"Prone. Bend knee against gravity or resistance. Slow eccentric return.",      sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Hip stays down. Control lowering (3–4s).",                progression:"Add resistance → Single-leg → Glider curl" },
        { id:"kn_glider_curl",      name:"Swiss Ball Hamstring Curl",                target:"Hamstrings, glutes — closed chain",                desc:"Supine, feet on ball. Bridge up. Curl feet toward hips.",                    sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Keep hips up throughout. Control return.",                progression:"Single-leg → Add eccentric phase only" },
        { id:"kn_hamstring_str",    name:"Hamstring Stretch (Supine)",               target:"Hamstrings — neural and muscular",                 desc:"Supine. Hold thigh. Extend knee until stretch felt. Hold 30s.",              sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"PPT to increase neural component.",                       progression:"Standing → Hurdler stretch → Slump add-on" },
      ],
      "Patellar Tendinopathy": [
        { id:"kn_isometric_wall",   name:"Isometric Wall Sit",                       target:"Patellar tendon — isometric analgesic",            desc:"Back against wall. Squat at 60–90°. Both legs.",                            sets:4, reps:1,  hold:45, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"60–90° knee bend. 70% effort. No pain >4/10.",            progression:"Single-leg → Add weight → Isotonic" },
        { id:"kn_slow_squat",       name:"Heavy Slow Resistance Squat",              target:"Patellar tendon — isotonic loading",               desc:"Slow tempo squat: 3s down, 3s up. Progressive load.",                        sets:4, reps:8,  hold:0,  freq:"3×/week",  phase:"Phase 2", evidence:"Strong — Kongsgaard protocol", cues:"3s down, 2s pause, 3s up. Progress load weekly.",         progression:"Increase load → Single-leg → Plyometric" },
        { id:"kn_decline_squat",    name:"Decline Board Squat",                      target:"Patellar tendon — high load eccentrics",           desc:"Stand on 25° decline board. Single-leg squat. Slow eccentric.",              sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Use hands for balance initially. Slow down.",             progression:"Increase decline → Add load → Hop landing" },
      ],
      "ACL Rehab": [
        { id:"kn_acl_phase1",       name:"Early ACL Quad Activation",                target:"Quadriceps — ACL graft protection",                desc:"Quad sets + SLR + TKE (0–90°). Avoid open chain 0–45° for 12 weeks.",       sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Avoid full extension open chain in early graft healing.", progression:"Progress range at 12 weeks → Closed chain loading" },
        { id:"kn_acl_balance",      name:"Neuromuscular Control — Single Leg",       target:"Proprioception, quadriceps, glute med — ACL",     desc:"Single-leg balance. Eyes closed. Perturbation. Landing training.",          sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Slight knee flexion. React to perturbations.",            progression:"Unstable surface → Perturbation → Jump landing" },
        { id:"kn_drop_jump",        name:"Drop Jump Landing Training",               target:"Quadriceps, glutes — ACL prevention",              desc:"Step off box. Land softly with triple flexion. Hold 2s.",                    sets:3, reps:8,  hold:2,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Land soft — quiet feet. Hips back, knees tracking.",     progression:"Increase height → Add lateral → Sprint → Cut" },
      ],
    }
  },
  ankle: {
    label:"Ankle & Foot", icon:"👣", color:"#a3e635",
    categories: {
      "Achilles Tendinopathy": [
        { id:"ank_ec_drop",         name:"Eccentric Heel Drop (Alfredson)",          target:"Gastrocnemius, soleus — eccentric",                desc:"Stand on step. Rise with both feet, lower with one. Full range.",            sets:3, reps:15, hold:0,  freq:"2×/day",   phase:"Phase 2", evidence:"Strongest — gold standard", cues:"Lower all the way. Use other foot to rise. Through PAIN.", progression:"Add backpack weight (10% BW) → Increase weekly" },
        { id:"ank_isometric_calf",  name:"Isometric Calf Hold",                      target:"Achilles — isometric analgesic",                   desc:"Single-leg calf raise hold at top. 45s holds.",                             sets:4, reps:1,  hold:45, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Max comfortable effort. Burning is normal.",              progression:"Progress to Alfredson protocol" },
        { id:"ank_heavy_slow_calf", name:"Heavy Slow Resistance Calf Raise",         target:"Achilles tendon — isotonic remodelling",           desc:"Seated (soleus) + standing (gastrocnemius). Slow 3:3 tempo with load.",      sets:4, reps:8,  hold:0,  freq:"3×/week",  phase:"Phase 2", evidence:"Strong",    cues:"3s up, 2s hold, 3s down. Progress load weekly.",          progression:"Increase load → Single-leg → Plyometric" },
      ],
      "Ankle Stability": [
        { id:"ank_single_leg",      name:"Single Leg Balance",                       target:"Peroneals, ankle stabilisers, proprioception",     desc:"Stand on one leg. Eyes open → eyes closed.",                                sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Slight knee bend. Focus point at eye level.",             progression:"Eyes closed → Unstable surface → SEBT → Perturbation" },
        { id:"ank_peroneal",        name:"Peroneal Strengthening (Eversion)",        target:"Peroneus longus & brevis",                         desc:"Band around foot. Evert outward against resistance. Slow controlled.",       sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Move only at ankle — not knee or hip.",                   progression:"Increase resistance → Standing eversion → Lateral hops" },
        { id:"ank_calf_raise",      name:"Single-Leg Calf Raise",                    target:"Gastrocnemius, soleus, FHL",                       desc:"Single-leg calf raise. 3s up, 2s hold, 3s down.",                           sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Full plantarflexion at top. Control eccentric.",          progression:"Add load → Plyometric → Eccentric drop" },
        { id:"ank_reach_sebt",      name:"Star Excursion Balance (SEBT) Reaches",   target:"Ankle stability, glutes, proprioception",          desc:"Single-leg stance. Reach other foot in 8 directions as far as possible.",   sets:3, reps:6,  hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Touch and return — don't weight bear on reaching foot.",  progression:"Increase reach distance → Add perturbation" },
        { id:"ank_lateral_hops",    name:"Lateral Hop Progression",                  target:"Peroneals, ankle stabilisers — reactive",          desc:"Hop laterally over line. Double-leg → single-leg. Land softly.",             sets:3, reps:10, hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Quiet landing. Triple flexion. No valgus collapse.",     progression:"Increase distance → Add forward component → Speed" },
        { id:"ank_tibialis_ant",    name:"Tibialis Anterior Strengthening",          target:"Tibialis anterior — dorsiflexion",                 desc:"Band around foot. Dorsiflex (pull toes up) against resistance.",             sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Move only at ankle. Full range dorsiflexion.",            progression:"Increase resistance → Eccentric lowering → Heel walks" },
      ],
      "Plantar Fascia": [
        { id:"ank_short_foot",      name:"Short Foot Exercise",                      target:"Intrinsic foot muscles, tibialis posterior",       desc:"Draw ball of foot toward heel without curling toes. Dome the arch.",         sets:3, reps:10, hold:10, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Don't curl toes. Don't roll inward.",                     progression:"Standing → Single-leg → Walking short foot" },
        { id:"ank_pf_stretch",      name:"Plantar Fascia Stretch",                   target:"Plantar fascia, toe flexors",                      desc:"Cross foot over knee. Pull toes back. Hold.",                                sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Pull toes back — feel stretch in arch. Before first steps.", progression:"Wall toe stretch → Towel stretch → Calf combine" },
        { id:"ank_calf_stretch",    name:"Gastrocnemius Calf Stretch",               target:"Gastrocnemius, Achilles",                          desc:"Wall stretch. Rear leg straight. Heel on floor. Hold 30s.",                  sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Keep heel down. Knee straight.",                          progression:"Bent knee (soleus) → Eccentric drops" },
        { id:"ank_marble_pickup",   name:"Towel Scrunch / Marble Pickup",            target:"Intrinsic foot muscles",                           desc:"Seated. Scrunch towel with toes or pick up marbles with toes.",              sets:3, reps:20, hold:0,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Work through full toe flexion range.",                    progression:"Short foot → Single-leg balance → Toe yoga" },
      ],
    }
  },
  thoracic: {
    label:"Thoracic Spine", icon:"🫀", color:"#d946ef",
    categories: {
      "Mobility": [
        { id:"tx_foam_ext",         name:"Thoracic Extension on Foam Roller",        target:"Thoracic extensors, posterior capsule",            desc:"Foam roller across mid-thoracic. Extend over roller. Breathe out.",          sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Work each segment. Support head. Exhale on extension.",   progression:"Add rotation → Book openings → Manipulation" },
        { id:"tx_book_open",        name:"Book Openings (Thoracic Rotation)",        target:"Thoracic rotators, posterior capsule, pectorals", desc:"Side-lying, knees 90°. Top arm opens chest to ceiling.",                    sets:3, reps:10, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Knees stacked and still. Let arm fall with gravity.",     progression:"Band resistance → Quadruped rotation → Standing" },
        { id:"tx_quadruped_rot",    name:"Quadruped Thoracic Rotation",              target:"Thoracic rotators",                                desc:"Quadruped. Hand behind head. Rotate thorax — elbow to ceiling.",             sets:3, reps:10, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Keep lumbar still. Rotate thorax only.",                  progression:"Add resistance → Standing rotation → Woodchop" },
        { id:"tx_thread_needle",    name:"Thread the Needle",                        target:"Thoracic rotators, shoulder mobility combined",    desc:"Quadruped. One arm threads under body toward opposite side.",                sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Let shoulder rest on floor at end range.",                progression:"Add arm reach overhead → Dynamic movement" },
        { id:"tx_seated_rot",       name:"Seated Thoracic Rotation",                 target:"Thoracic rotators, rib cage mobility",             desc:"Seated. Arms crossed. Rotate thorax each direction. Breathe out.",           sets:3, reps:10, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Initiate from thorax — not lumbar. Keep hips still.",     progression:"Add overpressure → Standing → Band resistance" },
        { id:"tx_rib_mobilise",     name:"Rib Mobilisation Breathing",               target:"Intercostals, rib cage — respiratory mobility",    desc:"Supine or seated. Breathe deeply into sides and back.",                     sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Breathe into the resistance. Expand in all directions.",  progression:"Add resistance with hand → Seated → Standing" },
        { id:"tx_thoracic_snag",    name:"Thoracic Self-SNAG",                       target:"Thoracic facet joints — mobilisation with movement", desc:"Towel around spinous process. Pull forward as you flex thorax.",           sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Pull towel forward AND up slightly as you flex.",         progression:"Add rotation → Therapist-applied SNAG" },
      ],
      "Strengthening": [
        { id:"tx_prone_cobra",      name:"Prone Cobra",                              target:"Thoracic extensors, lower trapezius, rhomboids",   desc:"Prone. Arms at side thumbs up. Lift chest off floor. Hold 2s.",             sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Depress scapulae first. No neck extension.",              progression:"Add arm positions → Prone Y/T/W → Band resistance" },
        { id:"tx_seated_row",       name:"Seated Row",                               target:"Mid trapezius, rhomboids, thoracic extensors",     desc:"Cable or band row to lower chest. Elbows tucked. Retract scapulae.",         sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Pull elbows past torso. Squeeze blades together at end.", progression:"Increase resistance → Single-arm → Split-stance" },
        { id:"tx_pull_down",        name:"Lat Pull-Down",                            target:"Latissimus dorsi, thoracic extensors, lower trap", desc:"Wide or narrow grip. Pull bar to upper chest. Depress scapulae.",           sets:3, reps:12, hold:2,  freq:"3×/week",  phase:"Phase 2", evidence:"Strong",    cues:"Lead with elbows. Don't lean back excessively.",          progression:"Increase weight → Neutral grip → Single-arm → Pull-up" },
      ],
    }
  },
  posture_correction: {
    label:"Posture Correction", icon:"🧍", color:"#ff4d6d",
    categories: {
      "Upper Crossed Syndrome": [
        { id:"pc_ucs_chin",         name:"Chin Tuck + Scapular Retraction",          target:"DNF, lower/mid trap — UCS correction",            desc:"Chin tuck + retract and depress scapulae simultaneously. Hold 5s.",          sets:3, reps:10, hold:5,  freq:"Hourly",   phase:"Phase 1", evidence:"Strong",    cues:"Two movements together. Eyes level. No shoulder shrug.",  progression:"Wall angle → Add resistance → Functional carry-over" },
        { id:"pc_band_pullap",      name:"Band Pull-Aparts",                         target:"Mid/lower trapezius, posterior deltoid, ER",       desc:"Band at arm's length. Pull apart horizontally.",                             sets:3, reps:20, hold:1,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Keep arms straight. Squeeze blades at end range.",        progression:"Increase resistance → Face pulls → Prone Y" },
        { id:"pc_pec_foam",         name:"Pec Stretch on Foam Roller",               target:"Pectoralis major & minor, anterior capsule",       desc:"Supine on foam roller. Arms out 90°. Let gravity open chest.",               sets:1, reps:1,  hold:120,freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Relax completely. Gravity does the work.",                progression:"Increase hold → Add arm elevation → IR/ER in position" },
        { id:"pc_levator_str",      name:"Levator Scapulae Stretch",                 target:"Levator scapulae — UCS component",                 desc:"Look down 45°. Rotate head 45° away. Side bend. Gentle overpressure.",       sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Moderate", cues:"Depression of opposite shoulder increases stretch.",      progression:"Add neural component → Sustained hold → Self-SNAG" },
        { id:"pc_wall_angel",       name:"Wall Angels",                              target:"Thoracic extensors, lower trap, serratus",         desc:"Stand with back to wall (head, thoracic, pelvis, heels touching). Raise arms above head keeping contact.", sets:3, reps:10, hold:2, freq:"Daily", phase:"Phase 1", evidence:"Strong", cues:"Keep entire spine on wall throughout movement.",          progression:"Add band resistance → Add thoracic extension hold" },
        { id:"pc_brugger_relief",   name:"Brügger Relief Position",                  target:"Thoracic extensors, serratus — sitting posture",   desc:"Sit at edge of chair. Pelvis slightly anteriorly tilted. Arms ER. Breathe.", sets:3, reps:1, hold:30, freq:"Hourly",   phase:"Phase 1", evidence:"Moderate", cues:"Sit bones out. Thumbs back. Chest open. Breathe.",        progression:"Add arm raises → Use in standing" },
      ],
      "Lower Crossed Syndrome": [
        { id:"pc_lcs_bridge",       name:"Glute Activation Bridge",                  target:"Gluteus maximus — LCS pattern",                    desc:"Supine bridge with glute squeeze cue. Anterior pelvic tilt correction.",     sets:3, reps:15, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Squeeze glutes — don't just lift hips.",                  progression:"Single-leg → Resistance → Hip thrust" },
        { id:"pc_hip_flex_str",     name:"Kneeling Hip Flexor Stretch with PPT",     target:"Iliopsoas — LCS correction",                       desc:"Kneeling lunge. PPT first. Then lean forward into stretch.",                 sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Tilt pelvis first. Feel deep front of hip — not thigh.", progression:"Add thoracic rotation → RNT lunge" },
        { id:"pc_pallof",           name:"Pallof Press (Anti-Rotation)",              target:"Core anti-rotation, obliques, TA",                 desc:"Cable/band at chest height. Press out and hold 2s.",                         sets:3, reps:10, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Do not rotate toward cable. Resist the pull.",            progression:"Increase resistance → Half-kneeling → Single-leg" },
        { id:"pc_hamstring_str",    name:"Hamstring Lengthening (LCS)",              target:"Hamstrings — LCS pattern",                         desc:"Supine active knee extension. PPT to remove neural. Pure hamstring.",         sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"PPT first. Focus muscular stretch.",                      progression:"Doorway stretch → Standing → Dynamic lunge stretch" },
      ],
      "Thoracic Mobility": [
        { id:"pc_foam_ext",         name:"Thoracic Extension on Foam Roller",        target:"Thoracic extensors, posterior capsule",            desc:"Foam roller across mid-thoracic. Extend over roller. Breathe.",              sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Work each segment. Support head. Breathe out.",          progression:"Add rotation → Book openings" },
        { id:"pc_book_open",        name:"Book Openings",                            target:"Thoracic rotators, pectorals",                     desc:"Side-lying, knees 90°. Top arm opens chest to ceiling.",                    sets:3, reps:10, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Keep knees stacked. Let arm fall with gravity.",          progression:"Band resistance → Quadruped rotation → Standing" },
        { id:"pc_doorway_pec",      name:"Doorway Pec Minor Stretch",                target:"Pectoralis minor — forward shoulder correction",   desc:"Forearm against doorframe at 90°. Step through. Lean into stretch.",         sets:3, reps:1,  hold:30, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Feel stretch in anterior chest. Don't arch lower back.",  progression:"Bilateral → Change angle → Dynamic add shoulder IR/ER" },
      ],
    }
  },
  respiratory: {
    label:"Respiratory / Breathing", icon:"🫁", color:"#38bdf8",
    categories: {
      "Breathing Pattern Retraining": [
        { id:"resp_diaphragm",      name:"Diaphragmatic Breathing",                  target:"Diaphragm, accessory muscles — inhibition",        desc:"Supine. Hand on abdomen. Belly rises FIRST. Slow exhale.",                   sets:1, reps:10, hold:0,  freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Belly rises first — not chest. 5s in, 7s out.",          progression:"Seated → Standing → Walking → Exercise" },
        { id:"resp_lateral_costal", name:"Lateral Costal Breathing",                 target:"Intercostals, lower ribs — segmental breathing",   desc:"Hands on lower ribs. Breathe into hand resistance. Expand laterally.",       sets:1, reps:10, hold:5,  freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Breathe into the sides and back — not up.",              progression:"Add manual resistance → Respiratory snorkel" },
        { id:"resp_pursed_lip",     name:"Pursed Lip Breathing",                     target:"Respiratory — COPD/dyspnoea management",           desc:"Inhale through nose 2s. Exhale through pursed lips 4s.",                     sets:1, reps:10, hold:0,  freq:"When breathless", phase:"Phase 1", evidence:"Strong", cues:"Slow exhale — don't force. Reduces air trapping.",       progression:"During activity → Exercise → Stress management" },
        { id:"resp_4_7_8",          name:"4-7-8 Breathing",                          target:"Autonomic nervous system — pain and anxiety",      desc:"Inhale 4s, hold 7s, exhale 8s. Activates parasympathetic.",                  sets:1, reps:8,  hold:0,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Tongue on roof of mouth. Full exhale through mouth.",     progression:"Increase to 5 cycles → Use before therapy" },
        { id:"resp_postural_breathe",name:"Breathing with Spinal Correction",        target:"Thoracic mobility + breathing integration",        desc:"Brügger position. Breathe diaphragmatically. Integrate posture and breath.", sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Posture and breathing linked. Open anterior chest.",      progression:"Add arm movements → Walking with breathing" },
      ],
      "Respiratory Strengthening": [
        { id:"resp_imst",           name:"Inspiratory Muscle Training (IMT)",        target:"Diaphragm, intercostals — inspiratory strength",   desc:"Threshold IMT device. 30% PImax. 30 breaths once daily.",                   sets:1, reps:30, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Breathe hard in against resistance. Exhale normally.",   progression:"Increase resistance 5% weekly → Sport integration" },
        { id:"resp_acbt",           name:"Active Cycle of Breathing Technique",      target:"Secretion clearance — chest physiotherapy",        desc:"Breathing control → 3–4 thoracic expansion exercises → forced expirations.", sets:3, reps:1, hold:0,  freq:"2–3×/day", phase:"Phase 1", evidence:"Strong",    cues:"Relaxed breathing first. Sniff and huff — not cough.",   progression:"Add postural drainage → Percussions → Autogenic drainage" },
      ],
    }
  },
  neurological: {
    label:"Neurological Rehab", icon:"🧠", color:"#a78bfa",
    categories: {
      "Balance & Proprioception": [
        { id:"neuro_tandem",        name:"Tandem (Heel-Toe) Walking",                target:"Vestibular, proprioception, core — balance",       desc:"Walk placing heel directly in front of toe. Maintain steady gaze.",          sets:3, reps:1,  hold:0,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Focus on fixed point. Arms out initially.",               progression:"Eyes closed → On foam → Backward → Head turns" },
        { id:"neuro_romberg",       name:"Romberg / Sharpened Romberg",              target:"Vestibular, somatosensory — balance",              desc:"Feet together (Romberg) or heel-to-toe (Sharpened). Eyes open → closed.",    sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Safe environment. Standing frame nearby initially.",      progression:"Eyes closed → Foam surface → Perturbation" },
        { id:"neuro_foam_balance",  name:"Foam Pad Standing Balance",                target:"Proprioceptive ankle and knee — multisensory",     desc:"Stand on foam pad. Challenge balance by removing visual cues.",              sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Arms out for assistance if needed. Near support.",        progression:"Single-leg → Head movements → Perturbation → Dual task" },
        { id:"neuro_dual_task",     name:"Dual-Task Training",                       target:"Cognitive-motor integration — falls prevention",   desc:"Walk while counting backwards, carrying object, or answering questions.",    sets:3, reps:1,  hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Do not pause walking to think. Maintain gait.",           progression:"Increase cognitive task difficulty → Timed track" },
      ],
      "Gait Training": [
        { id:"neuro_high_step",     name:"High Stepping Gait Drill",                 target:"Hip flexors, dorsiflexors — gait pattern",         desc:"Exaggerated high knee lift during walking. Focus on clearance.",             sets:3, reps:20, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Step high. Land heel first. Maintain upright posture.",   progression:"Add treadmill → Add perturbation → Speed" },
        { id:"neuro_treadmill_bw",  name:"Body-Weight Supported Treadmill Training", target:"Lower limb motor — neurological gait",            desc:"Partial body-weight support. Repetitive gait practice.",                     sets:1, reps:1,  hold:0,  freq:"5×/week",  phase:"Phase 2", evidence:"Strongest — neuroplasticity and gait recovery", cues:"Step naturally. Reduce support progressively.",          progression:"Reduce support % → Increase speed → Overground" },
      ],
      "Motor Relearning": [
        { id:"neuro_task_practice", name:"Task-Specific Practice (Sit-to-Stand)",    target:"Motor learning — functional task",                 desc:"Repetitive sit-to-stand practice. Massed practice for neuroplasticity.",     sets:5, reps:10, hold:0,  freq:"3×/day",   phase:"Phase 2", evidence:"Strongest", cues:"Lean forward first. Equal weight. Stand tall.",           progression:"Vary chair height → Add modifications → Single-leg STS" },
        { id:"neuro_mirror",        name:"Mirror Therapy",                           target:"Motor cortex — phantom limb / CRPS",               desc:"Mirror box. Move intact limb. Brain sees reflection as affected limb.",      sets:3, reps:10, hold:0,  freq:"3×/day",   phase:"Phase 2", evidence:"Strong",    cues:"Focus on mirror — not on affected limb.",                progression:"Progress complexity → Virtual reality" },
      ],
    }
  },
  pelvic_floor: {
    label:"Pelvic Floor & Continence", icon:"🌸", color:"#fb7185",
    categories: {
      "Pelvic Floor Strengthening": [
        { id:"pf_kegel",            name:"Pelvic Floor Contraction (Kegel)",         target:"Levator ani, pubococcygeus — stress incontinence", desc:"Squeeze and lift pelvic floor. Hold 10s. Relax fully 10s. No breath holding.", sets:3, reps:10, hold:10, freq:"3×/day", phase:"Phase 1", evidence:"Strongest — gold standard", cues:"Squeeze UP and IN. Don't tighten buttocks or thighs.",   progression:"Increase hold → Add quick flicks → Functional positions" },
        { id:"pf_quick_flick",      name:"Quick Flick Contractions",                 target:"Type II pelvic floor fibres — urgency control",    desc:"Rapid squeeze and release. 1s on, 1s off.",                                  sets:3, reps:10, hold:0,  freq:"3×/day",   phase:"Phase 2", evidence:"Strong",    cues:"Fast on-off. No substitution patterns.",                  progression:"Increase reps → Progress to functional activities" },
        { id:"pf_functional",       name:"Pelvic Floor Bracing with Lifting",        target:"Pelvic floor + TA — load management",              desc:"Contract pelvic floor BEFORE lifting, coughing, sneezing.",                  sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"The knack — contract before the pressure.",               progression:"Increase load → Walking → Exercise" },
        { id:"pf_relaxation",       name:"Pelvic Floor Downtraining / Relaxation",   target:"Hypertonic pelvic floor — pain / vaginismus",     desc:"Diaphragmatic breath. On exhale consciously relax pelvic floor completely.", sets:3, reps:10, hold:10, freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Let go completely. Soft belly. Soft pelvic floor.",       progression:"Add visualisation → Supine → Seated → Standing" },
      ],
      "Pelvic Girdle / SIJ": [
        { id:"pf_sij_bridge",       name:"SIJ Load Transfer — Clam Bridge",          target:"Glute medius, pelvic floor — SIJ stability",      desc:"Glute bridge with resistance band. Clam hips simultaneously.",              sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Press knees against band. Squeeze glutes. Neutral spine.", progression:"Add weight → Single-leg → SIJ self-belt technique" },
        { id:"pf_abductor_iso",     name:"Hip Abductor Isometrics (SIJ)",            target:"Gluteus medius — SIJ force closure",               desc:"Side-lying or standing. Isometric abduction against wall or band.",          sets:3, reps:10, hold:10, freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"No movement. Steady force. Breathe normally.",            progression:"Isotonic clamshells → Lateral band walks" },
      ],
    }
  },
  older_adult: {
    label:"Older Adult / Frailty", icon:"👴", color:"#78716c",
    categories: {
      "Falls Prevention (Otago Programme)": [
        { id:"oa_otago_ankle",      name:"Otago — Ankle Strengthening",              target:"Ankle dorsiflexors/plantarflexors — falls prevention", desc:"Seated. Lift toes then heels repeatedly. 10 each. Progress to standing.", sets:3, reps:10, hold:2, freq:"Daily",    phase:"Phase 1", evidence:"Strongest — 35% falls reduction", cues:"Full range. Both directions. Hold surface if needed.",    progression:"Standing → Single-leg → Add ankle weights" },
        { id:"oa_otago_knee",       name:"Otago — Knee Extension",                   target:"Quadriceps — falls prevention",                    desc:"Seated. Extend knee slowly. Add ankle weight progressively.",                sets:3, reps:10, hold:2,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Full extension. Slow lowering (4s).",                     progression:"Add weight → Standing → Stair practice" },
        { id:"oa_otago_walk",       name:"Otago Walking Programme",                  target:"Gait confidence — falls prevention",                desc:"Structured walking. 3×/week, increasing 5 min monthly to 30 min.",           sets:1, reps:1,  hold:0,  freq:"3×/week",  phase:"Phase 2", evidence:"Strongest", cues:"Safe footwear. Walking aid if required.",                  progression:"Increase distance → Add uneven terrain → Steps" },
        { id:"oa_stepping",         name:"Step Training / Perturbation Training",    target:"Reactive balance — falls prevention",               desc:"Rapid reactive stepping drills. Step onto targets. Perturbation catches.",   sets:3, reps:10, hold:0,  freq:"3×/week",  phase:"Phase 2", evidence:"Strong",    cues:"Near support. React — don't anticipate.",                 progression:"Increase perturbation intensity → Dual task" },
        { id:"oa_tug",              name:"Timed Up and Go (TUG) Practice",           target:"Functional mobility — gait and balance",           desc:"Rise from chair. Walk 3m. Turn. Walk back. Sit. Practice to improve.",        sets:3, reps:5, hold:0,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Normal walking aid if used. Turn safely.",                progression:"Faster → Dual task → Narrow corridor → Obstacle" },
      ],
      "Sarcopenia Prevention": [
        { id:"oa_resistance",       name:"Progressive Resistance Training (Older Adult)", target:"Muscle mass, bone density — sarcopenia",     desc:"Major muscle groups. 60–70% 1RM. 2–3 sets. 8–12 reps. 2–3×/week.",        sets:3, reps:10, hold:0,  freq:"3×/week",  phase:"Phase 2", evidence:"Strongest", cues:"Safe technique. Slow controlled. No breath-holding.",     progression:"Increase load 5% when achieving 15 reps × 2 sets" },
        { id:"oa_power_training",   name:"Power Training (Older Adult)",             target:"Fast-twitch fibres — fall recovery speed",         desc:"Squat with faster concentric phase. Same controlled lowering.",              sets:3, reps:8,  hold:0,  freq:"2×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Fast up — slow down. Control at all times.",              progression:"Sit-to-stand fast → Power squat → Step-up fast" },
      ],
    }
  },
  sports: {
    label:"Sports Rehab & Performance", icon:"⚽", color:"#84cc16",
    categories: {
      "Return to Running": [
        { id:"sp_run_walk",         name:"Run-Walk Protocol",                        target:"Lower limb — return to sport progressive loading", desc:"Week 1: Walk 1min, run 1min ×10. Week 2: run 2min ×7. Progress weekly.",   sets:1, reps:1,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Stop if NRS >3/10. 48h recovery between sessions.",       progression:"Increase run intervals → Continuous → Speed" },
        { id:"sp_plyometric",       name:"Plyometric Progression",                   target:"Lower limb — reactive strength",                   desc:"Double-leg → single-leg → lateral → rotational hops.",                      sets:3, reps:10, hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Land softly — triple flexion. Quiet feet.",               progression:"Double → Single → Lateral → Rotational → Sport-specific" },
        { id:"sp_agility",          name:"Agility & Change of Direction Drills",     target:"Lower limb — neuromuscular control, RTS",          desc:"T-test, 5-10-5, figure-8. Controlled then max speed.",                       sets:3, reps:5,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Controlled first. Quality > speed initially.",            progression:"Increase speed → Add sport ball → Reactive" },
        { id:"sp_sprinting",        name:"Sprinting Progression",                    target:"Hamstrings, glutes — RTS max velocity",            desc:"60% → 70% → 80% → 90% → 100% max velocity.",                               sets:4, reps:5,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"No pain. Full hip extension. Maintain form.",             progression:"Linear → Curved → Reactive → Sport-specific" },
      ],
      "Throwing / Upper Limb Sports": [
        { id:"sp_ir_er_ratio",      name:"IR/ER Ratio Strength Training",            target:"Rotator cuff balance — thrower's shoulder",        desc:"Maintain ER:IR strength ratio >66%. Prioritise ER.",                         sets:3, reps:15, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"External rotation is the priority for overhead athletes.", progression:"Sidelying → 90° abduction → Overhead" },
        { id:"sp_throw_prog",       name:"Interval Throwing Programme",              target:"Shoulder — return to sport throwing",              desc:"Start 30ft. Progress distance every 2 sessions if pain-free.",               sets:1, reps:25, hold:0,  freq:"Every 2nd day", phase:"Phase 3", evidence:"Strong", cues:"Stop immediately if pain. Ice after.",                    progression:"30ft → 60ft → 90ft → 120ft → Full distance" },
        { id:"sp_decel_training",   name:"Deceleration Mechanism Training",          target:"Rotator cuff posterior — deceleration phase",     desc:"Eccentric posterior cuff loading at 90/90 position. Resist forward pull.",  sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Control the deceleration — most RTC tears occur here.",  progression:"Increase resistance → Simulate throw speed → Plyoball" },
      ],
      "Strength & Conditioning": [
        { id:"sp_split_squat",      name:"Bulgarian Split Squat",                    target:"Quadriceps, glutes — unilateral strength",         desc:"Rear foot elevated. Front foot forward. Drop back knee toward floor.",       sets:4, reps:8,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Front shin vertical. Drop straight down. No knee cave.", progression:"Add weight → Add deficit → Jump split squat" },
        { id:"sp_bench_press",      name:"Bench Press Progression",                  target:"Pectorals, anterior deltoid, triceps",             desc:"Barbell bench. Scapulae retracted. Controlled lowering. Drive up.",          sets:4, reps:8,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Elbows 45–75° from torso. Control descent.",             progression:"Add load → Dumbbell → Incline → Decline" },
        { id:"sp_chin_up",          name:"Chin-Up / Pull-Up Progression",            target:"Latissimus dorsi, biceps, mid trap",               desc:"Full hang to chin over bar. Control lowering. Various grips.",               sets:4, reps:6,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Full range. Dead hang to start. Depress scapulae first.", progression:"Band assisted → Bodyweight → Weighted → L-sit" },
        { id:"sp_trap_bar",         name:"Trap Bar Deadlift",                        target:"Total lower chain — safe primary mover pattern",   desc:"Trap bar. Neutral spine. Full hip extension. Progressively loaded.",         sets:4, reps:6,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strong",    cues:"Push floor away. Drive hips forward. Stand tall.",        progression:"Increase load → Single-leg RDL → Sumo deadlift" },
        { id:"sp_hip_ext_hamstring",name:"Hip Extension Hamstring Loading",          target:"Hamstrings in lengthened position",                desc:"Prone hip extension against resistance (band). Full hip extension.",          sets:3, reps:12, hold:2,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Keep pelvis neutral. Feel hamstring activation.",         progression:"Add weight → Nordic → Glider curl" },
        { id:"sp_nordics",          name:"Nordic Hamstring Curl",                    target:"Biceps femoris — eccentric injury prevention",     desc:"Kneel, feet anchored. Lower body slowly with hamstrings.",                   sets:3, reps:6,  hold:0,  freq:"3×/week",  phase:"Phase 3", evidence:"Strongest — 51% hamstring injury reduction", cues:"Lower as slowly as possible. Push up with hands.",        progression:"Increase reps → Add resistance → Glider curl" },
      ],
    }
  },
  pilates_yoga: {
    label:"Pilates & Yoga-Based", icon:"🧘", color:"#c084fc",
    categories: {
      "Clinical Pilates": [
        { id:"pil_imprint",         name:"Imprint and Release",                      target:"TA, pelvic stabilisers — Pilates foundation",     desc:"Supine. Find neutral pelvis. Imprint lumbar (PPT). Release. Alternate.",     sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Find neutral — not flat, not arched. Breathe.",           progression:"Add leg float → Dead bug → Full repertoire" },
        { id:"pil_hundred",         name:"The Hundred",                              target:"TA, hip flexors, core endurance — Pilates",        desc:"Supine legs tabletop/extended. Pump arms 5 in, 5 out. 10 sets = 100.",       sets:1, reps:100,hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"C-curve. Scoop navel. Arms long and strong.",             progression:"Extend legs lower → Add weight → Full Pilates series" },
        { id:"pil_roll_up",         name:"Pilates Roll-Up",                          target:"Spinal flexors, hamstrings — articulation",        desc:"Supine arms overhead. Slowly roll up sequentially through spine.",            sets:3, reps:8,  hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Peel spine off floor one vertebra at a time.",            progression:"Add band → Half roll back → Teaser" },
        { id:"pil_single_leg_str",  name:"Single Leg Stretch",                       target:"TA, hip flexors — Pilates core series",            desc:"Supine. Curl up. Alternate knee to chest cycling.",                          sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Scoop navel. Keep C-curve stable.",                       progression:"Add double leg → Scissors → Bicycle" },
        { id:"pil_swimming",        name:"Pilates Swimming",                         target:"Back extensors, glutes — posterior chain",         desc:"Prone. Alternate arm/leg lifts in flutter pattern. Breathe 5 in, 5 out.",    sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Lengthen — don't compress lumbar. Light rapid movement.", progression:"Hold → Add resistance → Full back extension series" },
      ],
      "Therapeutic Yoga": [
        { id:"yoga_warrior1",       name:"Warrior I (Virabhadrasana I)",             target:"Hip flexors, quadriceps, core — lower limb",       desc:"Lunge position. Back foot 45°. Hips square. Arms overhead.",                sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Square hips forward. Front knee over ankle.",             progression:"Warrior II → Warrior III → Bind variations" },
        { id:"yoga_downdog",        name:"Downward Dog",                             target:"Hamstrings, calves, thoracic, shoulder stability", desc:"Hands and feet on floor. Hips high. Press heels toward floor.",              sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Long spine. Press into hands equally. Pedal feet.",       progression:"Add leg raise → Three-legged dog → Plank flow" },
        { id:"yoga_child_pose",     name:"Child's Pose (Balasana)",                  target:"Lumbar, hip flexors, thoracic — restorative",      desc:"Kneel, sit back on heels. Arms extended forward. Rest forehead.",            sets:3, reps:1,  hold:60, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Wide knees if needed. Breathe into back.",                progression:"Add lateral stretch → Thread needle → Extended child" },
        { id:"yoga_bridge_yoga",    name:"Yoga Bridge (Setu Bandha)",                target:"Glutes, hamstrings, pelvic floor — restorative",   desc:"Supine. Feet hip-width. Press into feet. Lift hips.",                        sets:3, reps:1,  hold:30, freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Press knees forward. Lift sternum toward chin.",          progression:"Single-leg → Wheel → Add resistance" },
        { id:"yoga_cat_cow",        name:"Cat-Cow (Marjaryasana-Bitilasana)",        target:"Lumbar-thoracic mobility — segmental",             desc:"Quadruped. Flex (cat) and extend (cow) spine with breath.",                  sets:3, reps:10, hold:3,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Link to breath. Exhale cat, inhale cow.",                 progression:"Add rotation → Side bend → Bird dog integration" },
        { id:"yoga_triangle",       name:"Triangle Pose (Trikonasana)",              target:"Hip abductors, spinal lateral flexors, IT band",   desc:"Feet wide. Front toes forward. Hinge at hip. Reach front hand toward foot.", sets:3, reps:1, hold:30, freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Long spine. Don't collapse trunk. Look up to top hand.", progression:"Add bind → Revolved triangle → Extended side angle" },
        { id:"yoga_tree",           name:"Tree Pose (Vrksasana)",                    target:"Hip abductors, ankle stabilisers, proprioception", desc:"Single-leg balance. Other foot on inner thigh or calf (not knee). Arms up.", sets:3, reps:1, hold:30, freq:"Daily",    phase:"Phase 2", evidence:"Moderate", cues:"Fix gaze point. Squeeze standing glute. Breathe.",        progression:"Close eyes → Arm variations → Dynamic tree" },
      ],
    }
  },
  hydrotherapy: {
    label:"Hydrotherapy / Aquatic", icon:"🏊", color:"#06b6d4",
    categories: {
      "Aquatic Rehabilitation": [
        { id:"hydro_walk",          name:"Aquatic Walking",                          target:"Lower limb — unloaded gait retraining",            desc:"Chest-deep water walking. Forward, backward, sideways. Normal gait.",        sets:3, reps:1,  hold:0,  freq:"3×/week",  phase:"Phase 1", evidence:"Strong",    cues:"Normal heel-toe gait. Arms swing naturally.",             progression:"Increase speed → Deep water → Add buoyancy resistance" },
        { id:"hydro_squat",         name:"Aquatic Squat",                            target:"Quadriceps, glutes — reduced load",                desc:"Waist-deep water. Squat as normal — water reduces load ~50%.",               sets:3, reps:15, hold:2,  freq:"3×/week",  phase:"Phase 1", evidence:"Strong",    cues:"Same form as land squat. Use buoyancy — don't fall.",     progression:"Deeper water → Add noodle resistance → Plyometric" },
        { id:"hydro_run",           name:"Deep Water Running",                       target:"Cardiovascular — offloading for injury",           desc:"Deep water with floatation belt. Running motion — no floor contact.",         sets:3, reps:1,  hold:300,freq:"3–5×/week", phase:"Phase 2", evidence:"Strong",   cues:"Upright posture. Full running pattern.",                  progression:"Increase duration → Increase intensity → Resistance bands" },
        { id:"hydro_balance",       name:"Single-Leg Balance in Water",              target:"Proprioception — aquatic reduced-load",            desc:"Single-leg stance in shallow water. Gentle wave perturbation.",              sets:3, reps:1,  hold:30, freq:"3×/week",  phase:"Phase 1", evidence:"Moderate", cues:"Near pool edge. Focus on fixed point.",                   progression:"Add reach tasks → Close eyes → Deeper water" },
        { id:"hydro_kick",          name:"Aquatic Leg Kicks / Flutter Board",        target:"Hip flexors, quadriceps, hip extensors — low load", desc:"Hold flutter board. Kick front crawl motion. Supported on water.",          sets:3, reps:1,  hold:120,freq:"3×/week",  phase:"Phase 1", evidence:"Moderate", cues:"Full hip extension on kick. Flutter — not slap.",         progression:"Increase duration → Add ankle weights → Depth change" },
      ],
    }
  },
  cardiac: {
    label:"Cardiac Rehab", icon:"❤", color:"#ef4444",
    categories: {
      "Phase 2–3 Cardiac Rehab": [
        { id:"card_walk_prog",      name:"Supervised Walking Programme",             target:"Cardiorespiratory — Phase 2 cardiac rehab",        desc:"Treadmill or overground. Start 10–15 min. Progress 5 min/week. RPE 11–13.", sets:1, reps:1,  hold:0,  freq:"5×/week",  phase:"Phase 1", evidence:"Strongest", cues:"Borg RPE 11–13 (moderate). Stop if chest pain/dizziness.", progression:"Increase duration → Add interval → Cycle/swim" },
        { id:"card_resistance",     name:"Cardiac Resistance Training",              target:"Peripheral muscle — cardiac load reduction",       desc:"Circuit training at 40–60% 1RM. 8–10 exercises. No Valsalva.",              sets:2, reps:12, hold:0,  freq:"2–3×/week", phase:"Phase 2", evidence:"Strong",   cues:"No breath-holding. Exhale on exertion. Monitor HR/BP.",  progression:"Increase reps → Increase load → Reduce rest time" },
        { id:"card_interval",       name:"High Intensity Interval Training (HIIT)", target:"VO2 max — Phase 3 cardiac (supervised only)",      desc:"4×4 min at 85–95% HRmax with 3 min active recovery. Supervised.",           sets:4, reps:1,  hold:240,freq:"3×/week",  phase:"Phase 3", evidence:"Strongest — superior VO2 gains vs MICT", cues:"Supervised only. ECG monitored. Stop if symptoms.",       progression:"Increase sessions → Unsupervised home program" },
        { id:"card_stretching",     name:"Cool-Down Stretching",                    target:"Flexibility, autonomic recovery — post-cardiac exercise", desc:"Major muscle groups. Gentle static stretching post exercise.",       sets:1, reps:1,  hold:30, freq:"5×/week",  phase:"Phase 1", evidence:"Moderate", cues:"Never skip cool-down. Gentle only. Breathe.",             progression:"Increase hold → Add mindfulness breathing" },
      ],
    }
  },
  oncology: {
    label:"Oncology Rehab", icon:"🎗", color:"#f472b6",
    categories: {
      "Cancer Fatigue Management": [
        { id:"onco_pace",           name:"Pacing and Energy Conservation",           target:"Fatigue management — cancer-related",              desc:"Break tasks. Rest before exhaustion. Energy diary.",                          sets:1, reps:1,  hold:0,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Stop at 7/10 energy — not at exhaustion.",                progression:"Increase activity windows → ACSM cancer guidelines" },
        { id:"onco_aerobic",        name:"Supervised Aerobic Training",              target:"Cardiorespiratory fitness — cancer rehab",          desc:"Walking or cycling at moderate intensity. 150 min/week.",                    sets:1, reps:1,  hold:0,  freq:"5×/week",  phase:"Phase 2", evidence:"Strongest — reduces fatigue, improves survival", cues:"Rate exertion 5–6/10. Stop if dizzy or chest pain.",     progression:"Increase duration → Resistance training add-on" },
        { id:"onco_resistance",     name:"Progressive Resistance Training — Oncology", target:"Muscle strength — cancer cachexia prevention",   desc:"2 sets major muscle groups. 60–70% 1RM. Supervised initially.",              sets:2, reps:12, hold:0,  freq:"2–3×/week", phase:"Phase 2", evidence:"Strong",   cues:"Monitor blood counts. Avoid when neutropenic.",          progression:"Progress load 5% weekly → Functional integration" },
        { id:"onco_lymph_pump",     name:"Lymphatic Pump Exercises",                 target:"Lymphatic return — post-mastectomy / lymphoedema", desc:"Shoulder pumping. Elevation. Elbow flexion/extension. Deep breathing.",      sets:3, reps:20, hold:0,  freq:"3×/day",   phase:"Phase 1", evidence:"Strong",    cues:"Wear compression garment. Elevate limb.",                 progression:"Add progressive resistance → Decongestive therapy" },
      ],
    }
  },
  paediatric: {
    label:"Paediatric / Developmental", icon:"🧒", color:"#34d399",
    categories: {
      "Developmental Movement": [
        { id:"ped_tummy_time",      name:"Tummy Time Progression",                   target:"Cervical extensors, shoulder girdle — infant",     desc:"Prone positioning. Gradually increase duration. Support chest if needed.",   sets:5, reps:1,  hold:120,freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Never unsupervised. Start on chest, progress to floor.",  progression:"Supported → Unsupported → Pivoting → Crawling prep" },
        { id:"ped_crawling",        name:"Quadruped Crawling Pattern",               target:"Cross-pattern coordination — developmental",       desc:"Reciprocal hand and knee movements. Slow and controlled.",                   sets:3, reps:1,  hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Opposite arm and leg together. Head up.",                 progression:"Static quadruped → Rock forward/back → Full crawl" },
        { id:"ped_sit_balance",     name:"Supported Sitting Balance",                target:"Trunk control — paediatric vestibular",            desc:"Seated on therapy ball. Apply gentle perturbations in all directions.",       sets:3, reps:10, hold:5,  freq:"Daily",    phase:"Phase 1", evidence:"Strong",    cues:"Allow child to self-correct. Reduce support gradually.",  progression:"Reduce support → Add arm/leg movements → Stand" },
        { id:"ped_jumping",         name:"Two-Footed Jump and Landing",              target:"Lower limb strength, coordination — paediatric",   desc:"Jump with both feet. Land softly. Focus on quality not distance.",           sets:3, reps:10, hold:0,  freq:"Daily",    phase:"Phase 2", evidence:"Strong",    cues:"Bend knees on landing. Quiet feet.",                      progression:"Add direction → Hop → Skip → Sport-specific" },
        { id:"ped_balance_beam",    name:"Balance Beam Walking",                     target:"Balance, proprioception — paediatric",             desc:"Walk along line or low beam. Arms out. Eyes open then closed.",              sets:3, reps:1,  hold:0,  freq:"Daily",    phase:"Phase 1", evidence:"Moderate", cues:"Look ahead. Arms out for balance.",                       progression:"Narrow beam → Eyes closed → Carry object → Backwards" },
      ],
    }
  },
};
// Suggested in-clinic treatment (manual + machine) per protocol template
const TEMPLATE_TX = {
  acute_lbp:      { manual:["Lumbar PA mobilisation gr I–II","Soft tissue — paraspinals"], machine:["TENS 20 min","Hot pack 15 min"] },
  chronic_lbp:    { manual:["Maitland PA gr III–IV","Myofascial release QL/glutes"], machine:["IFT 15 min","Hot pack 15 min"] },
  disc_ext:       { manual:["McKenzie extension mobilisation","Central PA glides"], machine:["TENS 20 min"] },
  disc_flex:      { manual:["Flexion-based mobilisation","Neural mobilisation — SLR"], machine:["TENS 20 min"] },
  hip_oa:         { manual:["Hip long-axis distraction","Posterior capsule glide"], machine:["Hot pack / SWD 15 min","US 1 MHz"] },
  hip_bursitis:   { manual:["STR glute med / TFL","ITB soft tissue release"], machine:["US 3 MHz pulsed","Cryotherapy 10 min"] },
  groin_strain:   { manual:["Adductor soft tissue release","Hip joint mobilisation"], machine:["US 3 MHz","Cryotherapy (acute)"] },
  pfps:           { manual:["Patellar medial glides","STR lateral retinaculum / ITB"], machine:["EMS — VMO 15 min","Cryotherapy post-exercise"] },
  patella_tend:   { manual:["Patellar tendon friction massage","Quadriceps STR"], machine:["Shockwave","Cryotherapy"] },
  acl_early:      { manual:["Patellar mobilisation","Scar tissue massage"], machine:["EMS — quadriceps","Cryo-compression 15 min"] },
  acl_late:       { manual:["Joint mobilisation as needed"], machine:["EMS — quads maintenance"] },
  knee_oa:        { manual:["Tibiofemoral gr III mobilisation","Patellar glides"], machine:["Hot pack 15 min","TENS / IFT 20 min"] },
  hamstring_str:  { manual:["Hamstring soft tissue release","Slump neural glides"], machine:["US 3 MHz","Cryotherapy (acute 72 h)"] },
  ankle_sprain:   { manual:["Talocrural AP glides","Subtalar mobilisation"], machine:["Cryotherapy 15 min","US 3 MHz pulsed"] },
  achilles:       { manual:["Tendon friction massage","Calf STR"], machine:["Shockwave","US 3 MHz"] },
  plantar_fascia: { manual:["Plantar fascia release","Calcaneal mobilisation"], machine:["Shockwave","US 3 MHz"] },
  shoulder_imp:   { manual:["GH posterior glides","STR pec minor / upper trap"], machine:["US 1 MHz","IFT 15 min"] },
  frozen_shoulder_freezing: { manual:["GH grade I–II gentle oscillation — pain modulation only, not stretching"], machine:["Ice or heat for pain, per patient preference","TENS 20 min"] },
  frozen_shoulder_frozen:   { manual:["GH gr III–IV mobilisation — all planes","Sustained capsular stretch"], machine:["SWD / Hot pack before mobilisation","TENS 20 min"] },
  frozen_shoulder_thawing:  { manual:["GH mobilisation as needed to maintain range","Scapular and periscapular soft tissue work"], machine:["Hot pack before exercise"] },
  rct_conservative:      { manual:["GH mobilisation gr I–II","Scapular soft tissue work"], machine:["US 1 MHz","EMS — rotator cuff"] },
  rct_postop_protected:  { manual:["Passive ROM only, performed by the therapist within surgeon-specified limits — no patient-driven stretching"], machine:["Cryotherapy for pain and swelling"] },
  rct_postop_active:     { manual:["Gentle scar tissue mobilisation once incision healed","Active-assisted ROM progression"], machine:["Cryotherapy post-session as needed"] },
  rct_postop_strength:   { manual:["Periscapular and GH soft tissue work"], machine:["EMS — rotator cuff if indicated"] },
  shoulder_instability:  { manual:["Proprioceptive and rhythmic stabilisation techniques — avoid aggressive capsular stretching into the unstable direction"], machine:[] },
  ac_joint:              { manual:["AC joint grade I–II mobilisation, gentle","Soft tissue work around the AC joint and upper trapezius"], machine:["Cryotherapy acutely","US 3 MHz for chronic cases"] },
  slap_conservative:     { manual:["GH mobilisation as tolerated, avoiding provocative combined abduction/ER positions early","Scapular soft tissue work"], machine:[] },
  tennis_elbow:   { manual:["Deep friction massage — ECRB","Mulligan MWM lateral glide"], machine:["Shockwave","US 3 MHz"] },
  golfers_elbow:  { manual:["Friction massage — common flexors","MWM"], machine:["US 3 MHz","Cryotherapy"] },
  cervicogenic_ha:{ manual:["Suboccipital release","C1–C2 SNAG"], machine:["Hot pack 10 min","TENS"] },
  cervical_rad:   { manual:["Manual cervical traction","Neural mobilisation — ULNT"], machine:["Mechanical traction 10–15 min","TENS 20 min"] },
  ucs:            { manual:["Pec minor release","T-spine mobilisation"], machine:["Hot pack","IFT"] },
  lcs:            { manual:["Hip flexor release","Lumbar mobilisation"], machine:["Hot pack"] },
  thoracic_mob:   { manual:["T-spine PA mobilisation","Rib mobilisation"], machine:["Hot pack 10 min"] },
  stress_incont:  { manual:["Pelvic floor manual facilitation"], machine:["EMS / biofeedback"] },
  pelvic_pain:    { manual:["Myofascial release — pelvic girdle"], machine:["TENS"] },
  copd:           { manual:["Chest percussion / vibration"], machine:[] },
};
const PROGRAMME_TEMPLATES = {
  // Lumbar
  acute_lbp:      { region:"Lumbar", label:"Acute LBP",                  exercises:["lb_tva","lb_prone_lying","lb_press_up","lb_cat_camel","lb_glute_bridge","lb_pelvic_tilt"] },
  chronic_lbp:    { region:"Lumbar", label:"Chronic LBP",                 exercises:["lb_dead_bug","lb_bird_dog","lb_plank","lb_side_plank","lb_hip_hinge","pc_pallof","lb_stir_pot"] },
  disc_ext:       { region:"Lumbar", label:"Disc — Extension Bias",       exercises:["lb_prone_lying","lb_press_up","lb_standing_ext","lb_tva","lb_glute_bridge"] },
  disc_flex:      { region:"Lumbar", label:"Disc — Flexion Bias",         exercises:["lb_knee_chest","lb_cat_camel","lb_rotation_stretch","lb_piriformis","lb_tva"] },
  // Hip
  hip_oa:         { region:"Hip", label:"Hip Osteoarthritis",          exercises:["hp_clam","hp_standing_abd","hp_hip_thrust","hp_90_90","hp_adductor_stretch","hp_thomas"] },
  hip_bursitis:   { region:"Hip", label:"Greater Trochanteric Bursitis", exercises:["hp_clam","hp_lat_walk","hp_monster_walk","hp_ober_stretch","hp_standing_abd"] },
  groin_strain:   { region:"Hip", label:"Groin / Adductor Strain",    exercises:["lb_copenhagen","hp_adductor_stretch","hp_side_step_squat","hp_hip_flex_raise","hp_hip_thrust"] },
  // Knee
  pfps:           { region:"Knee", label:"Patellofemoral Pain",         exercises:["kn_tqe","kn_vmo_squat","kn_step_down","hp_clam","hp_lat_walk","lb_glute_bridge"] },
  patella_tend:   { region:"Knee", label:"Patellar Tendinopathy",       exercises:["kn_isometric_wall","kn_slow_squat","kn_decline_squat","hp_hip_thrust","kn_rdl"] },
  acl_early:      { region:"Knee", label:"ACL Rehab — Early Phase",     exercises:["kn_quad_set","kn_straight_leg","kn_tqe","lb_glute_bridge","kn_acl_balance"] },
  acl_late:       { region:"Knee", label:"ACL Rehab — Return to Sport", exercises:["kn_vmo_squat","kn_step_down","kn_drop_jump","sp_plyometric","sp_agility","sp_nordics"] },
  knee_oa:        { region:"Knee", label:"Knee Osteoarthritis",         exercises:["kn_quad_set","kn_straight_leg","kn_sit_to_stand","kn_leg_press","lb_glute_bridge","ank_calf_raise"] },
  hamstring_str:  { region:"Knee", label:"Hamstring Strain Rehab",      exercises:["kn_hamstring_str","kn_rdl","sp_hip_ext_hamstring","kn_nordic","sp_nordics","sp_sprinting"] },
  // Ankle & Foot
  ankle_sprain:   { region:"Ankle & Foot", label:"Ankle Sprain Rehab",          exercises:["ank_single_leg","ank_peroneal","ank_calf_raise","ank_tibialis_ant","ank_reach_sebt","ank_lateral_hops"] },
  achilles:       { region:"Ankle & Foot", label:"Achilles Tendinopathy",       exercises:["ank_isometric_calf","ank_ec_drop","ank_heavy_slow_calf","ank_single_leg","ank_calf_raise"] },
  plantar_fascia: { region:"Ankle & Foot", label:"Plantar Fasciitis",           exercises:["ank_pf_stretch","ank_calf_stretch","ank_short_foot","ank_marble_pickup","ank_single_leg"] },
  // Shoulder
  shoulder_imp:   { region:"Shoulder", label:"Shoulder Impingement",        exercises:["sh_wall_slide","sh_prone_ytw","sh_face_pull","sh_er_band","sh_pec_stretch","sh_ir_stretch"] },
  frozen_shoulder_freezing: { region:"Shoulder", label:"Frozen Shoulder — Freezing Phase",
    note:"Pain-dominant phase. Keep this gentle and pain-free -- the goal is symptom control, not range. Sustained stretching belongs in the frozen phase once pain has settled.",
    exercises:["sh_pendulum","sh_pully"] },
  frozen_shoulder_frozen: { region:"Shoulder", label:"Frozen Shoulder — Frozen Phase",
    note:"Stiffness-dominant, lower pain. Focus is sustained end-range stretching, not strengthening -- strengthening belongs in the thawing phase once range is improving.",
    exercises:["sh_capsule_stretch","sh_ir_stretch","sh_pully","sh_pec_stretch"] },
  frozen_shoulder_thawing: { region:"Shoulder", label:"Frozen Shoulder — Thawing Phase",
    note:"Range is recovering. Active strengthening and scapular control now belong alongside continued stretching as needed.",
    exercises:["sh_er_band","sh_sidelying_ir","sh_prone_er","sh_wall_slide","sh_prone_ytw"] },
  rct_conservative: { region:"Shoulder", label:"Rotator Cuff Tear — Conservative Management",
    exercises:["sh_pendulum","sh_empty_can","sh_prone_er","sh_er_band","sh_sidelying_ir","sh_prone_ytw","sh_rhythmic_stab"] },
  rct_postop_protected: { region:"Shoulder", label:"Rotator Cuff Repair — Protected Phase (0-6wks)",
    note:"Timelines vary significantly by repair size and surgeon protocol -- confirm the specific timeline before proceeding. This phase is largely passive and clinician-directed; there is little genuine home-exercise component here.",
    exercises:["sh_pendulum"] },
  rct_postop_active: { region:"Shoulder", label:"Rotator Cuff Repair — Active-Assisted Phase (6-12wks)",
    note:"Confirm with the surgeon that active-assisted motion is cleared before starting. Progress range gradually, no resisted strengthening yet.",
    exercises:["sh_pully","sh_capsule_stretch","sh_pec_stretch"] },
  rct_postop_strength: { region:"Shoulder", label:"Rotator Cuff Repair — Strengthening Phase (12wks+)",
    note:"Confirm surgeon clearance for resisted strengthening before starting -- typically not before 12 weeks post-repair, later for large tears.",
    exercises:["sh_er_band","sh_sidelying_ir","sh_prone_er","sh_wall_slide","sh_prone_ytw","sh_rhythmic_stab"] },
  shoulder_instability: { region:"Shoulder", label:"Shoulder Instability / Post-Dislocation",
    note:"Avoid aggressive stretching into the direction of instability -- the goal is dynamic control, not capsular mobility.",
    exercises:["sh_rhythmic_stab","sh_sidelying_ir","sh_er_band","sh_wall_slide","sh_diagonal_d2","sh_push_plus"] },
  ac_joint: { region:"Shoulder", label:"AC Joint Injury — Grade I-II Conservative",
    note:"For grade III and above, or if pain is disproportionate to what's expected, refer for imaging and orthopaedic review before proceeding.",
    exercises:["sh_scap_clock","sh_wall_slide","sh_prone_ytw","sh_pec_stretch"] },
  slap_conservative: { region:"Shoulder", label:"SLAP / Labral Tear — Conservative Management",
    note:"Avoid combined abduction and external rotation, and resisted biceps loading, early in the programme -- both are provocative positions for a SLAP lesion.",
    exercises:["sh_scap_clock","sh_wall_slide","sh_sidelying_ir","sh_rhythmic_stab"] },
  // Elbow
  tennis_elbow:   { region:"Elbow", label:"Tennis Elbow",                exercises:["el_isometric_ext","el_tyler_twist","el_wrist_ext_isoton","el_grip_strength"] },
  golfers_elbow:  { region:"Elbow", label:"Golfer's Elbow",              exercises:["el_wrist_flex_iso","el_wrist_flex_eccen","el_forearm_stretch","el_pron_sup"] },
  // Cervical
  cervicogenic_ha:{ region:"Cervical", label:"Cervicogenic Headache",       exercises:["cx_dnf","cx_chin_tuck","cx_scap_ret","pc_ucs_chin","cx_suboccip_release","cx_isometric"] },
  cervical_rad:   { region:"Cervical", label:"Cervical Radiculopathy",      exercises:["cx_chin_tuck","cx_neural_slider","cx_neural_ulnar","cx_neural_radial","cx_dnf","cx_isometric"] },
  // Posture
  ucs:            { region:"Posture", label:"Upper Crossed Syndrome",      exercises:["cx_chin_tuck","pc_ucs_chin","pc_band_pullap","pc_pec_foam","sh_wall_slide","sh_prone_ytw","pc_wall_angel"] },
  lcs:            { region:"Posture", label:"Lower Crossed Syndrome",      exercises:["pc_lcs_bridge","pc_hip_flex_str","lb_tva","lb_bird_dog","lb_hip_flexor","lb_glute_bridge","pc_pallof"] },
  // Thoracic
  thoracic_mob:   { region:"Thoracic", label:"Thoracic Stiffness",          exercises:["tx_foam_ext","tx_book_open","tx_quadruped_rot","tx_thread_needle","tx_prone_cobra","tx_seated_row"] },
  // Pelvic floor
  stress_incont:  { region:"Pelvic floor", label:"Stress Incontinence",         exercises:["pf_kegel","pf_quick_flick","pf_functional","lb_glute_bridge","hp_clam"] },
  pelvic_pain:    { region:"Pelvic floor", label:"Pelvic Girdle Pain",          exercises:["pf_sij_bridge","pf_abductor_iso","pf_kegel","lb_bird_dog","lb_tva"] },
  // Respiratory
  copd:           { region:"Respiratory", label:"COPD Breathing",              exercises:["resp_pursed_lip","resp_diaphragm","resp_lateral_costal","resp_imst","card_walk_prog"] },
  // Older adult
  falls_prev:     { region:"Older adult", label:"Falls Prevention",            exercises:["oa_otago_ankle","oa_otago_knee","oa_stepping","oa_tug","oa_otago_walk","neuro_foam_balance"] },
  frailty:        { region:"Older adult", label:"Frailty / Sarcopenia",        exercises:["oa_resistance","oa_power_training","oa_otago_ankle","kn_sit_to_stand","lb_glute_bridge"] },
  // Sports
  return_run:     { region:"Sports", label:"Return to Running",           exercises:["sp_run_walk","sp_plyometric","sp_agility","sp_sprinting","kn_drop_jump","kn_rdl"] },
  throwing_rts:   { region:"Sports", label:"Return to Throwing",          exercises:["sp_ir_er_ratio","sp_throw_prog","sp_decel_training","sh_prone_ytw","sh_rhythmic_stab"] },
  // Pilates / Yoga
  clinical_pilates:{ region:"Pilates / Yoga", label:"Clinical Pilates Core",      exercises:["pil_imprint","pil_hundred","pil_single_leg_str","pil_swimming","lb_bird_dog","pil_roll_up"] },
  yoga_back:      { region:"Pilates / Yoga", label:"Yoga for Back Pain",          exercises:["yoga_cat_cow","yoga_child_pose","yoga_bridge_yoga","yoga_downdog","lb_piriformis","lb_rotation_stretch"] },
  // Neuro
  neuro_balance:  { region:"Neuro", label:"Neurological Balance",        exercises:["neuro_tandem","neuro_romberg","neuro_foam_balance","neuro_dual_task","oa_stepping"] },
  // Cardiac
  cardiac_phase2: { region:"Cardiac", label:"Cardiac Rehab Phase 2",       exercises:["card_walk_prog","card_resistance","card_stretching","resp_diaphragm"] },
  // Hydrotherapy
  aquatic_rehab:  { region:"Hydrotherapy", label:"Aquatic Rehabilitation",      exercises:["hydro_walk","hydro_squat","hydro_balance","hydro_run","hydro_kick"] },
};

const ALL_EXERCISES = Object.values(EXERCISE_DB).flatMap(region =>
  Object.values(region.categories).flatMap(cat => cat)
);

export {
  SCALES,
  ALL_TESTS, ROM_DATA, ROM_REGIONS, RESTRICTION_GRADE, ROM_REDFLAGS,
  MMT_GRADES, MMT_DATA, MMT_GRADE_OPTIONS, MMT_REGIONS, MMT_ICONS, parseMuscleName, RED_FLAGS_MMT, KINETIC_CHAINS,
  DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO, NERVE_ROOT_MAP,
  CRANIAL_NERVES, COORDINATION_TESTS, INVOLUNTARY_MOVEMENT_TYPES, VESTIBULAR_TESTS, PERCEPTUAL_TESTS,
  SPECIAL_TESTS_DATA, CYRIAX_REGIONS_DATA,
  UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S,
  needsBPS_S, resolveRegMod, needsSleep_S, needsSport_S, needsHypermobility_S,
  NKT_REGIONS, KC_REGIONS,
  downloadPDFFromHTML, PDF_BASE_STYLES, makePDFPage,
  SCALE_DATA_LABELS, ST_DATA_LABELS, ROM_DERIVED, MMT_DATA_LABELS, mmtFallbackLabel,
  CYRIAX_REGION_LABELS, CYRIAX_REGION_KEYS, CYRIAX_FIELD_TYPES, CYRIAX_TEST_LABEL, CYRIAX_LEGACY_REGION, resolveCyriaxKey,
  EXERCISE_DB, TEMPLATE_TX, PROGRAMME_TEMPLATES, ALL_EXERCISES,
};
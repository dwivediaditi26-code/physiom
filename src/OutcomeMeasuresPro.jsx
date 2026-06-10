// OutcomeMeasuresPro.jsx — Enhanced Outcome Measures with Live Guided + PDF
// Replaces OutcomeMeasuresModule — drop-in compatible

import React, { useState, useEffect, useRef } from "react";
import { getC } from "./utils.jsx";

const A="#7c3aed",S2="#f5f0fb",BD="#d8cce8",TX="#1a1025",MU="#7e6a9a";

// ─── HINDI TRANSLATIONS ───────────────────────────────────────────────────────
const HI = {
  // NDI
  ndi_pain:     ["1. दर्द की तीव्रता","0 — कोई दर्द नहीं","1 — बहुत हल्का","2 — मध्यम","3 — काफी तेज","4 — बहुत तेज","5 — असहनीय दर्द"],
  ndi_personal: ["2. व्यक्तिगत देखभाल","0 — सामान्य, कोई अतिरिक्त दर्द नहीं","1 — सामान्य पर दर्दनाक","2 — धीमे और सावधानी से","3 — कुछ मदद चाहिए","4 — हर रोज मदद चाहिए","5 — खुद की देखभाल नहीं कर सकता"],
  ndi_lifting:  ["3. उठाना","0 — बिना दर्द के भारी वजन","1 — भारी पर दर्दनाक","2 — फर्श से भारी नहीं उठा सकता","3 — मेज से भारी नहीं","4 — बहुत हल्का ही उठा सकता","5 — कुछ भी नहीं उठा सकता"],
  ndi_reading:  ["4. पढ़ना","0 — जितनी देर चाहूं","1 — हल्के दर्द के साथ","2 — मध्यम दर्द के साथ","3 — ज्यादा देर नहीं","4 — मुश्किल से","5 — बिल्कुल नहीं पढ़ सकता"],
  ndi_headache: ["5. सिरदर्द","0 — बिल्कुल नहीं","1 — हल्का, कभी-कभी","2 — मध्यम, कभी-कभी","3 — मध्यम, अक्सर","4 — गंभीर, अक्सर","5 — हमेशा"],
  ndi_concentration:["6. एकाग्रता","0 — कोई कठिनाई नहीं","1 — थोड़ी कठिनाई","2 — मध्यम कठिनाई","3 — काफी कठिनाई","4 — बहुत कठिनाई","5 — बिल्कुल नहीं कर सकता"],
  ndi_work:     ["7. काम","0 — जितना चाहूं","1 — सामान्य काम","2 — ज्यादातर काम","3 — सामान्य काम नहीं","4 — मुश्किल से","5 — कोई काम नहीं"],
  ndi_driving:  ["8. गाड़ी चलाना","0 — बिना दर्द के","1 — हल्के दर्द के साथ","2 — मध्यम दर्द","3 — तेज दर्द","4 — मुश्किल से","5 — बिल्कुल नहीं"],
  ndi_sleeping: ["9. सोना","0 — कोई समस्या नहीं","1 — थोड़ी कठिनाई","2 — मध्यम कठिनाई","3 — काफी कठिनाई","4 — बहुत कठिनाई","5 — सो नहीं सकता"],
  ndi_recreation:["10. मनोरंजन","0 — कोई सीमा नहीं","1 — थोड़ी सीमा","2 — मध्यम सीमा","3 — महत्वपूर्ण सीमा","4 — मुश्किल से","5 — बिल्कुल नहीं"],
  // ODI
  odi_pain:["1. दर्द की तीव्रता","0 — कोई दर्द नहीं","1 — बहुत हल्का","2 — मध्यम","3 — काफी तेज","4 — बहुत तेज","5 — असहनीय"],
  odi_personal:["2. व्यक्तिगत देखभाल","0 — सामान्य","1 — दर्दनाक पर सामान्य","2 — धीरे-धीरे","3 — कुछ मदद","4 — रोज मदद","5 — खुद नहीं कर सकता"],
  odi_lifting:["3. उठाना","0 — भारी, बिना दर्द","1 — भारी, दर्द के साथ","2 — फर्श से नहीं","3 — हल्का उठा सकता","4 — बहुत हल्का","5 — कुछ नहीं"],
  odi_walking:["4. चलना","0 — कोई सीमा नहीं","1 — 1.5 किमी तक","2 — 800 मीटर","3 — 100 मीटर","4 — लाठी से","5 — बिस्तर पर"],
  odi_sitting:["5. बैठना","0 — जितना चाहूं","1 — पसंदीदा कुर्सी","2 — 1 घंटे से ज्यादा","3 — 30 मिनट","4 — 10 मिनट","5 — बिल्कुल नहीं"],
  odi_standing:["6. खड़े होना","0 — जितना चाहूं","1 — 1 घंटे से ज्यादा","2 — 30 मिनट","3 — 10 मिनट","4 — दर्द के साथ","5 — खड़े नहीं हो सकता"],
  odi_sleeping:["7. सोना","0 — कोई समस्या नहीं","1 — कभी-कभी","2 — 6 घंटे से कम","3 — 4 घंटे से कम","4 — 2 घंटे से कम","5 — सो नहीं सकता"],
  odi_sex:["8. यौन जीवन","0 — सामान्य","1 — दर्दनाक पर सामान्य","2 — लगभग सामान्य","3 — बहुत सीमित","4 — लगभग नहीं","5 — लागू नहीं"],
  odi_social:["9. सामाजिक जीवन","0 — सामान्य","1 — दर्द के साथ सामान्य","2 — घर पर ज्यादा","3 — घर तक सीमित","4 — दर्द के कारण नहीं","5 — बिल्कुल नहीं"],
  odi_travel:["10. यात्रा","0 — कहीं भी","1 — दर्द के साथ","2 — 2 घंटे","3 — 1 घंटे से कम","4 — 30 मिनट","5 — सिर्फ डॉक्टर"],
};

// ─── SCALES DATA ──────────────────────────────────────────────────────────────
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
    score:(v)=>{const ids=Object.keys(v).filter(k=>k.startsWith("dash_q"));const s=ids.map(id=>+v[id]).filter(x=>x>0);return s.length>=10?Math.round(((s.reduce((a,b)=>a+b,0)/s.length)-1)/4*100):null;}
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ScoreBar({score,maxScore,color}){
  const pct=Math.min(100,Math.round((score/maxScore)*100));
  return(<div style={{height:8,background:"#e5e7eb",borderRadius:99,overflow:"hidden",margin:"6px 0"}}>
    <div style={{height:"100%",width:pct+"%",background:color,borderRadius:99,transition:"width 0.6s ease"}}/>
  </div>);
}

function MiniTrend({history}){
  if(!history||history.length<2) return null;
  const last5=history.slice(-5);
  const max=Math.max(...last5.map(h=>h.score));
  const W=120,H=36;
  const pts=last5.map((h,i)=>[(i/(last5.length-1))*(W-8)+4, H-4-(h.score/max)*(H-8)]).map(p=>p.join(",")).join(" ");
  return(
    <svg width={W} height={H} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={A} strokeWidth="1.5" strokeLinejoin="round"/>
      {last5.map((h,i)=>{const x=(i/(last5.length-1))*(W-8)+4,y=H-4-(h.score/max)*(H-8);return <circle key={i} cx={x} cy={y} r="2.5" fill={A}/>;})}
    </svg>
  );
}

// ─── BLANK PDF GENERATOR ───────────────────────────────────────────────────────
function generateBlankPDF(scaleId, patientName="", clinicName="PhysioMind Clinic"){
  const sc=SCALES[scaleId];
  if(!sc) return;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${sc.full}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px;max-width:700px;margin:0 auto}
h1{font-size:16px;font-weight:700;color:#1a1025;margin-bottom:2px}
.subtitle{font-size:10px;color:#6b7280;margin-bottom:16px}
.header{display:flex;justify-content:space-between;border-bottom:2px solid #7c3aed;padding-bottom:10px;margin-bottom:16px}
.clinic{font-size:12px;font-weight:700;color:#7c3aed}
.field-row{display:flex;gap:8px;margin-bottom:10px;font-size:10px}
.field-box{flex:1;border-bottom:1px solid #999;padding-bottom:2px}
.field-label{font-size:9px;color:#6b7280;margin-bottom:2px}
.question{margin-bottom:12px;break-inside:avoid}
.q-label{font-weight:700;font-size:11px;margin-bottom:6px}
.options{display:grid;grid-template-columns:1fr 1fr;gap:3px}
.option{display:flex;align-items:center;gap:6px;font-size:10px;padding:3px 0}
.checkbox{width:12px;height:12px;border:1px solid #666;flex-shrink:0;display:inline-block}
.score-box{margin-top:20px;border:2px solid #7c3aed;border-radius:8px;padding:12px}
.disclaimer{margin-top:16px;font-size:9px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:8px}
@media print{body{padding:10px}}
</style></head><body>
<div class="header">
  <div><div class="clinic">${clinicName}</div><h1>${sc.full}</h1><div class="subtitle">${sc.label} · ${sc.category} · MCID = ${sc.mcid}${sc.unit}</div></div>
  <div style="text-align:right;font-size:9px;color:#6b7280">Date: _______________<br/>Clinician: _______________</div>
</div>
<div class="field-row">
  <div class="field-box"><div class="field-label">Patient Name</div>${patientName||"___________________________"}</div>
  <div class="field-box"><div class="field-label">Date of Birth</div>_______________</div>
  <div class="field-box"><div class="field-label">Assessment No.</div>___</div>
</div>
<p style="font-size:10px;margin-bottom:14px;color:#374151">Please tick ONE box in each section that most closely describes your condition TODAY.</p>
${sc.fields.map((f,i)=>`<div class="question">
  <div class="q-label">${f.label}</div>
  <div class="options">${f.options.map(o=>`<div class="option"><span class="checkbox"></span>${o}</div>`).join("")}</div>
</div>`).join("")}
<div class="score-box">
  <div style="font-weight:700;font-size:12px;margin-bottom:8px">Scoring</div>
  <div style="font-size:10px;color:#374151">Total Score: _______ ${sc.unit} &nbsp;&nbsp; Interpretation: _______________________</div>
  <div style="margin-top:8px;font-size:10px">
    ${Object.entries(sc.interpret?{a:0}:{}).length>0?`Interpretation guide printed on reverse.`:""}
  </div>
</div>
<div class="disclaimer">This validated outcome measure is for clinical use only. PhysioMind · ${clinicName} · ${new Date().toLocaleDateString("en-IN")}</div>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
}

// ─── LIVE GUIDED MODE ─────────────────────────────────────────────────────────
function LiveMode({scaleId, patientName, onComplete, onBack, patientMode}){
  const sc=SCALES[scaleId];
  const [qIdx,setQIdx]=useState(0);
  const [answers,setAnswers]=useState({});
  const [lang,setLang]=useState("en");
  const [activity,setActivity]=useState({act1:"",act2:"",act3:""});
  // Timer state for TUG / 10MWT
  const [timerMs,setTimerMs]=useState(0);
  const [timerRunning,setTimerRunning]=useState(false);
  const timerRef=useRef(null);
  const timerStartRef=useRef(0);

  const fields=sc.fields;
  const total=fields.length;
  const f=fields[qIdx];
  const answered=answers[f.id]!==undefined;
  const PC=getC();

  // Reset timer when question changes
  useEffect(()=>{
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerMs(0);
  },[qIdx]);

  const startTimer=()=>{
    if(timerRunning) return;
    timerStartRef.current=Date.now()-timerMs;
    setTimerRunning(true);
    timerRef.current=setInterval(()=>setTimerMs(Date.now()-timerStartRef.current),50);
  };
  const stopTimer=()=>{
    clearInterval(timerRef.current);
    setTimerRunning(false);
    const secs=(timerMs/1000).toFixed(1);
    setAnswers(p=>({...p,[f.id]:secs}));
  };
  const resetTimer=()=>{
    clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerMs(0);
    setAnswers(p=>{const n={...p};delete n[f.id];return n;});
  };

  const hiData=HI[f.id];

  const selectAnswer=(opt)=>{
    setAnswers(p=>({...p,[f.id]:opt}));
    setTimeout(()=>{
      if(qIdx<total-1) setQIdx(q=>q+1);
    },300);
  };

  const finish=()=>{
    const finalAnswers={...answers};
    // For PSFS merge activity names
    if(scaleId==="psfs"){
      finalAnswers.psfs_activity1=activity.act1;
      finalAnswers.psfs_activity2=activity.act2;
      finalAnswers.psfs_activity3=activity.act3;
      finalAnswers.psfs_score1=answers.psfs_act1;
      finalAnswers.psfs_score2=answers.psfs_act2;
      finalAnswers.psfs_score3=answers.psfs_act3;
    }
    if(scaleId==="vas") finalAnswers.vas_score=answers.vas_score;
    const score=sc.score(finalAnswers);
    onComplete({scaleId,answers:finalAnswers,score,date:new Date().toISOString()});
  };

  const allAnswered=fields.every(f=>answers[f.id]!==undefined);
  const pct=Math.round((Object.keys(answers).length/total)*100);

  return(
    <div style={{minHeight:"100vh",background:patientMode?"#0d0d1a":"#faf8fc",
      display:"flex",flexDirection:"column",fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:patientMode?"#111":"#fff",padding:"12px 16px",
        borderBottom:"1px solid #d8cce8",display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",
          color:patientMode?"#9ca3af":"#7e6a9a",fontSize:"1.1rem",cursor:"pointer",padding:"4px 8px"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:patientMode?"#e2e8f0":TX}}>{sc.full}</div>
          <div style={{fontSize:"0.65rem",color:patientMode?"#6b7280":MU}}>{patientName} · Q{qIdx+1}/{total}</div>
        </div>
        <button onClick={()=>setLang(l=>l==="en"?"hi":"en")}
          style={{padding:"4px 10px",borderRadius:20,border:"1px solid #d8cce8",
            background:lang==="hi"?"#ede9fe":"transparent",
            color:lang==="hi"?A:MU,fontSize:"0.68rem",cursor:"pointer",fontWeight:600}}>
          {lang==="en"?"अ Hindi":"A English"}
        </button>
      </div>

      {/* Progress */}
      <div style={{background:patientMode?"#161625":"#f5f0fb",padding:"8px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.65rem",
          color:patientMode?"#6b7280":MU,marginBottom:4}}>
          <span>Progress</span><span>{pct}%</span>
        </div>
        <div style={{height:4,background:patientMode?"#1e2a3a":"#e5e7eb",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:`linear-gradient(90deg,${A},#9333ea)`,borderRadius:99,transition:"width 0.3s"}}/>
        </div>
      </div>

      {/* Question */}
      <div style={{flex:1,padding:"24px 16px",display:"flex",flexDirection:"column",gap:16,maxWidth:600,margin:"0 auto",width:"100%"}}>
        <div style={{background:patientMode?"#161625":"#fff",borderRadius:14,padding:"18px",
          border:`1px solid ${patientMode?"#1e2a3a":BD}`}}>
          <div style={{fontSize:"0.68rem",color:A,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
            Question {qIdx+1} of {total}
          </div>
          <div style={{fontSize:patientMode?"1.3rem":"1.05rem",fontWeight:700,color:patientMode?"#e2e8f0":TX,lineHeight:1.5,marginBottom:lang==="hi"&&hiData?8:0}}>
            {f.label}
          </div>
          {lang==="hi"&&hiData&&(
            <div style={{fontSize:"1rem",color:patientMode?"#9ca3af":MU,marginTop:4}}>{hiData[0]}</div>
          )}
        </div>

        {/* PSFS activity name input */}
        {f.type==="activity"&&(
          <input value={activity[`act${qIdx+1}`]} onChange={e=>setActivity(p=>({...p,[`act${qIdx+1}`]:e.target.value}))}
            placeholder="Name the activity (e.g. climbing stairs)"
            style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${BD}`,
              background:"#fff",fontSize:"0.9rem",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"}}/>
        )}

        {/* Stopwatch for TUG / 10MWT */}
        {f.type==="timer"&&(
          <div style={{background:patientMode?"#161625":"#fff",borderRadius:14,padding:"20px",
            border:`1px solid ${patientMode?"#1e2a3a":BD}`,textAlign:"center"}}>
            <div style={{fontSize:"3rem",fontWeight:800,
              color:timerRunning?A:answered?"#16a34a":(patientMode?"#e2e8f0":TX),
              fontVariantNumeric:"tabular-nums",letterSpacing:"-1px",marginBottom:16}}>
              {Math.floor(timerMs/60000).toString().padStart(2,"0")}:{(Math.floor(timerMs/1000)%60).toString().padStart(2,"0")}.{Math.floor((timerMs%1000)/100)}
            </div>
            {answered&&!timerRunning&&(
              <div style={{fontSize:"1rem",color:"#16a34a",fontWeight:700,marginBottom:12}}>
                ✓ {answers[f.id]}s recorded
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:12}}>
              <button onClick={timerRunning?stopTimer:startTimer}
                style={{padding:"12px 28px",borderRadius:10,border:"none",
                  background:timerRunning?"#dc2626":`linear-gradient(135deg,${A},#9333ea)`,
                  color:"#fff",fontSize:"1rem",fontWeight:700,cursor:"pointer",minWidth:100}}>
                {timerRunning?"⏹ Stop":"▶ Start"}
              </button>
              <button onClick={resetTimer}
                style={{padding:"12px 20px",borderRadius:10,border:`1px solid ${BD}`,
                  background:"transparent",color:MU,fontSize:"0.9rem",cursor:"pointer"}}>
                ↺ Reset
              </button>
            </div>
            <div style={{fontSize:"0.7rem",color:MU}}>
              Or enter manually:&nbsp;
              <input type="number" placeholder="sec" min="0" step="0.1"
                value={answers[f.id]||""} onChange={e=>setAnswers(p=>({...p,[f.id]:e.target.value}))}
                style={{width:70,padding:"4px 8px",borderRadius:6,border:`1px solid ${BD}`,
                  fontFamily:"inherit",fontSize:"0.8rem",textAlign:"center"}}/>
              <span style={{marginLeft:4}}>seconds</span>
            </div>
          </div>
        )}

        {/* Slider for VAS */}
        {f.type==="slider"?(
          <div style={{background:patientMode?"#161625":"#fff",borderRadius:14,padding:"18px",border:`1px solid ${patientMode?"#1e2a3a":BD}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.75rem",color:MU,marginBottom:8}}>
              <span>0 — No pain</span><span>10 — Worst imaginable</span>
            </div>
            <input type="range" min="0" max="10" step="1"
              value={answers.vas_score??5} onChange={e=>setAnswers(p=>({...p,vas_score:e.target.value}))}
              style={{width:"100%",accentColor:A}}/>
            <div style={{textAlign:"center",fontSize:"2rem",fontWeight:800,color:A,marginTop:8}}>
              {answers.vas_score??5}/10
            </div>
          </div>
        ):(f.type!=="timer"&&f.options&&f.options.length>0&&(
          /* Answer options */
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {f.options.map((opt,i)=>{
              const hiOpt=lang==="hi"&&hiData?hiData[i+1]:null;
              const isSelected=answers[f.id]===opt;
              return(
                <button key={opt} type="button" onClick={()=>selectAnswer(opt)}
                  style={{padding:"14px 16px",borderRadius:12,textAlign:"left",
                    border:`1.5px solid ${isSelected?A:patientMode?"#1e2a3a":BD}`,
                    background:isSelected?`rgba(124,58,237,0.12)`:patientMode?"#161625":"#fff",
                    color:isSelected?A:patientMode?"#e2e8f0":TX,
                    fontWeight:isSelected?700:400,fontSize:"0.88rem",cursor:"pointer",
                    fontFamily:"inherit",transition:"all 0.12s",lineHeight:1.4}}>
                  <div>{opt}</div>
                  {hiOpt&&<div style={{fontSize:"0.78rem",color:isSelected?A:MU,marginTop:3}}>{hiOpt}</div>}
                </button>
              );
            })}
          </div>
        ))}

        {/* Navigation */}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          {qIdx>0&&<button type="button" onClick={()=>setQIdx(q=>q-1)}
            style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${BD}`,
              background:"transparent",color:MU,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit"}}>
            ← Back
          </button>}
          {(f.type==="slider"||f.type==="timer")&&<button type="button" onClick={()=>{if(qIdx<total-1)setQIdx(q=>q+1);}}
            style={{flex:2,padding:"12px",borderRadius:10,border:"none",
              background:`linear-gradient(135deg,${A},#9333ea)`,color:"#fff",
              fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Next →
          </button>}
          {qIdx===total-1&&allAnswered&&(
            <button type="button" onClick={finish}
              style={{flex:2,padding:"12px",borderRadius:10,border:"none",
                background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",
                fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ✓ Complete & Score
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({result, history, onClose, onRetake, patientName}){
  const sc=SCALES[result.scaleId];
  const interp=sc.interpret(result.score);
  const prev=history&&history.length>1?history[history.length-2]:null;
  const diff=prev?result.score-prev.score:null;
  const improved=diff!==null&&(sc.unit==="%"?diff<0:diff>0);
  const mcidMet=diff!==null&&Math.abs(diff)>=sc.mcid;

  return(
    <div style={{padding:20,maxWidth:500,margin:"0 auto",fontFamily:"system-ui,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:"1rem",color:TX}}>{sc.full}</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:MU,cursor:"pointer",fontSize:"1.1rem"}}>✕</button>
      </div>

      {/* Score display */}
      <div style={{background:"#fff",borderRadius:16,padding:20,border:`2px solid ${interp.color}30`,
        textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:48,fontWeight:800,color:interp.color,lineHeight:1}}>{result.score}</div>
        <div style={{fontSize:"0.78rem",color:MU,marginTop:4}}>{sc.unit} · {new Date(result.date).toLocaleDateString("en-IN")}</div>
        <ScoreBar score={result.score} maxScore={sc.maxScore} color={interp.color}/>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:interp.color}}>{interp.label}</div>

        {diff!==null&&(
          <div style={{marginTop:12,padding:"8px 14px",borderRadius:8,
            background:improved?"#f0fdf4":"#fef2f2",
            border:`1px solid ${improved?"#86efac":"#fca5a5"}`}}>
            <span style={{fontWeight:700,color:improved?"#16a34a":"#dc2626",fontSize:"0.85rem"}}>
              {improved?"↑ Improved":"↓ Declined"} {Math.abs(diff)}{sc.unit} since last assessment
            </span>
            {mcidMet&&<div style={{fontSize:"0.7rem",color:improved?"#16a34a":"#dc2626",marginTop:2}}>
              {improved?"✓ Exceeds MCID — clinically meaningful improvement":"⚠ MCID threshold reached — clinically meaningful change"}
            </div>}
          </div>
        )}
      </div>

      {/* Progress chart */}
      {history&&history.length>1&&(
        <div style={{background:"#fff",borderRadius:12,padding:14,border:`1px solid ${BD}`,marginBottom:14}}>
          <div style={{fontSize:"0.65rem",fontWeight:700,color:MU,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Progress over sessions</div>
          <MiniTrend history={history}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:"0.65rem",color:MU}}>
            <span>Session 1: {history[0]?.score}{sc.unit}</span>
            <span>Now: {result.score}{sc.unit}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>generateBlankPDF(result.scaleId,patientName)}
          style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${BD}`,
            background:S2,color:A,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          📄 Blank form
        </button>
        <button onClick={onRetake}
          style={{flex:1,padding:"10px",borderRadius:10,border:"none",
            background:`linear-gradient(135deg,${A},#9333ea)`,color:"#fff",
            fontSize:"0.75rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          ↺ Re-test
        </button>
      </div>
    </div>
  );
}

// ─── ASIA BILATERAL GRID ──────────────────────────────────────────────────────
const ASIA_MOTOR_LEVELS=[
  {level:"C5",label:"Elbow Flexors",r:"asia_m_c5_r",l:"asia_m_c5_l"},
  {level:"C6",label:"Wrist Extensors",r:"asia_m_c6_r",l:"asia_m_c6_l"},
  {level:"C7",label:"Elbow Extensors",r:"asia_m_c7_r",l:"asia_m_c7_l"},
  {level:"C8",label:"Finger Flexors",r:"asia_m_c8_r",l:"asia_m_c8_l"},
  {level:"T1",label:"Finger Abductors",r:"asia_m_t1_r",l:"asia_m_t1_l"},
  {level:"L2",label:"Hip Flexors",r:"asia_m_l2_r",l:"asia_m_l2_l"},
  {level:"L3",label:"Knee Extensors",r:"asia_m_l3_r",l:"asia_m_l3_l"},
  {level:"L4",label:"Ankle Dorsiflexors",r:"asia_m_l4_r",l:"asia_m_l4_l"},
  {level:"L5",label:"Long Toe Extensors",r:"asia_m_l5_r",l:"asia_m_l5_l"},
  {level:"S1",label:"Ankle Plantar Flexors",r:"asia_m_s1_r",l:"asia_m_s1_l"},
];
const MOTOR_OPTS=["0","1","2","3","4","5"];
const MOTOR_DESC=["None","Trace","Grav-","Grav+","Some R","Normal"];
const GRADE_OPTS=["A","B","C","D","E"];
const GRADE_DESC={A:"Complete",B:"Sensory only",C:"Motor <50%<3",D:"Motor ≥50%≥3",E:"Normal"};
const NLI_OPTS=["C1","C2","C3","C4","C5","C6","C7","C8","T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12","L1","L2","L3","L4","L5","S1","S2","S3","S4-5"];

function AsiaGridMode({patientName, onComplete, onBack, patientMode}){
  const [answers,setAnswers]=useState({});
  const bg=patientMode?"#0d0d1a":"#faf8fc";
  const card=patientMode?"#161625":"#fff";
  const border=patientMode?"#1e2a3a":BD;
  const txt=patientMode?"#e2e8f0":TX;

  const set=(k,v)=>setAnswers(p=>({...p,[k]:v}));

  const motorTotal=(side)=>ASIA_MOTOR_LEVELS.reduce((sum,row)=>{
    const v=answers[row[side]];return sum+(v!=null?+v:0);
  },0);
  const ueTotal=(side)=>["C5","C6","C7","C8","T1"].reduce((sum,lv)=>{
    const row=ASIA_MOTOR_LEVELS.find(r=>r.level===lv);
    const v=answers[row[side]];return sum+(v!=null?+v:0);
  },0);
  const leTotal=(side)=>["L2","L3","L4","L5","S1"].reduce((sum,lv)=>{
    const row=ASIA_MOTOR_LEVELS.find(r=>r.level===lv);
    const v=answers[row[side]];return sum+(v!=null?+v:0);
  },0);

  const allMotorFilled=ASIA_MOTOR_LEVELS.every(r=>answers[r.r]!=null&&answers[r.l]!=null);

  const finish=()=>{
    const score=motorTotal("r")+motorTotal("l");
    onComplete({scaleId:"asia",answers,score,date:new Date().toISOString()});
  };

  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:"system-ui,sans-serif",color:txt}}>
      {/* Header */}
      <div style={{background:patientMode?"#111":"#fff",padding:"12px 16px",
        borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:patientMode?"#9ca3af":MU,fontSize:"1.1rem",cursor:"pointer",padding:"4px 8px"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:txt}}>🦾 ASIA Impairment Scale</div>
          <div style={{fontSize:"0.65rem",color:MU}}>{patientName} · SCI Motor & Sensory Classification</div>
        </div>
      </div>

      <div style={{padding:"14px 12px",maxWidth:600,margin:"0 auto"}}>
        {/* AIS Grade */}
        <div style={{background:card,borderRadius:12,border:`1px solid ${border}`,padding:"14px",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:A,marginBottom:10}}>AIS Grade</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {GRADE_OPTS.map(g=>(
              <button key={g} onClick={()=>set("asia_grade",g)}
                style={{flex:"1 1 auto",padding:"10px 6px",borderRadius:8,border:`2px solid ${answers.asia_grade===g?A:border}`,
                  background:answers.asia_grade===g?`rgba(124,58,237,0.12)`:card,
                  color:answers.asia_grade===g?A:txt,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                <div style={{fontSize:"1.2rem"}}>{g}</div>
                <div style={{fontSize:"0.6rem",color:MU,marginTop:2}}>{GRADE_DESC[g]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* NLI */}
        <div style={{background:card,borderRadius:12,border:`1px solid ${border}`,padding:"14px",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:A,marginBottom:8}}>Neurological Level of Injury (NLI)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {NLI_OPTS.map(n=>(
              <button key={n} onClick={()=>set("asia_nli",n)}
                style={{padding:"6px 10px",borderRadius:6,border:`1.5px solid ${answers.asia_nli===n?A:border}`,
                  background:answers.asia_nli===n?`rgba(124,58,237,0.12)`:card,
                  color:answers.asia_nli===n?A:txt,cursor:"pointer",fontSize:"0.75rem",fontWeight:answers.asia_nli===n?700:400,fontFamily:"inherit"}}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Motor Grid */}
        <div style={{background:card,borderRadius:12,border:`1px solid ${border}`,padding:"14px",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:A,marginBottom:10}}>Motor Scores (0–5 per side)</div>
          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,marginBottom:8}}>
            <div/>
            <div style={{textAlign:"center",fontSize:"0.7rem",fontWeight:700,color:MU}}>RIGHT</div>
            <div style={{textAlign:"center",fontSize:"0.7rem",fontWeight:700,color:MU}}>LEFT</div>
          </div>
          {/* UE header */}
          <div style={{fontSize:"0.65rem",color:A,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,paddingLeft:4}}>
            Upper Extremity
          </div>
          {ASIA_MOTOR_LEVELS.filter(r=>["C5","C6","C7","C8","T1"].includes(r.level)).map(row=>(
            <div key={row.level} style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,marginBottom:8,alignItems:"center"}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:txt}}>
                <span style={{color:A}}>{row.level}</span>
                <div style={{fontSize:"0.6rem",color:MU,fontWeight:400,marginTop:1}}>{row.label}</div>
              </div>
              {["r","l"].map(side=>(
                <div key={side} style={{display:"flex",gap:3}}>
                  {MOTOR_OPTS.map((v,i)=>(
                    <button key={v} onClick={()=>set(row[side],v)}
                      style={{flex:1,padding:"6px 2px",borderRadius:6,border:`1.5px solid ${answers[row[side]]===v?A:border}`,
                        background:answers[row[side]]===v?`rgba(124,58,237,0.15)`:card,
                        color:answers[row[side]]===v?A:MU,cursor:"pointer",fontSize:"0.7rem",fontWeight:700,fontFamily:"inherit",lineHeight:1.2}}>
                      {v}
                      <div style={{fontSize:"0.45rem",color:answers[row[side]]===v?A:MU,display:"none"}}>{MOTOR_DESC[i]}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {/* UE totals */}
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,marginBottom:12,
            background:S2,borderRadius:8,padding:"6px 4px"}}>
            <div style={{fontSize:"0.65rem",color:MU,fontWeight:700}}>UE Total<br/>(max 25)</div>
            {["r","l"].map(side=>(
              <div key={side} style={{textAlign:"center",fontSize:"1.1rem",fontWeight:800,color:A}}>{ueTotal(side)}/25</div>
            ))}
          </div>
          {/* LE header */}
          <div style={{fontSize:"0.65rem",color:A,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,paddingLeft:4}}>
            Lower Extremity
          </div>
          {ASIA_MOTOR_LEVELS.filter(r=>["L2","L3","L4","L5","S1"].includes(r.level)).map(row=>(
            <div key={row.level} style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,marginBottom:8,alignItems:"center"}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:txt}}>
                <span style={{color:A}}>{row.level}</span>
                <div style={{fontSize:"0.6rem",color:MU,fontWeight:400,marginTop:1}}>{row.label}</div>
              </div>
              {["r","l"].map(side=>(
                <div key={side} style={{display:"flex",gap:3}}>
                  {MOTOR_OPTS.map((v,i)=>(
                    <button key={v} onClick={()=>set(row[side],v)}
                      style={{flex:1,padding:"6px 2px",borderRadius:6,border:`1.5px solid ${answers[row[side]]===v?A:border}`,
                        background:answers[row[side]]===v?`rgba(124,58,237,0.15)`:card,
                        color:answers[row[side]]===v?A:MU,cursor:"pointer",fontSize:"0.7rem",fontWeight:700,fontFamily:"inherit",lineHeight:1.2}}>
                      {v}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
          {/* LE + Total */}
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,marginBottom:6,
            background:S2,borderRadius:8,padding:"6px 4px"}}>
            <div style={{fontSize:"0.65rem",color:MU,fontWeight:700}}>LE Total<br/>(max 25)</div>
            {["r","l"].map(side=>(
              <div key={side} style={{textAlign:"center",fontSize:"1.1rem",fontWeight:800,color:A}}>{leTotal(side)}/25</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,
            background:`rgba(124,58,237,0.08)`,borderRadius:8,padding:"8px 4px",border:`1px solid ${A}`}}>
            <div style={{fontSize:"0.65rem",color:A,fontWeight:700}}>TOTAL<br/>(max 50)</div>
            {["r","l"].map(side=>(
              <div key={side} style={{textAlign:"center",fontSize:"1.3rem",fontWeight:900,color:A}}>{motorTotal(side)}/50</div>
            ))}
          </div>
          <div style={{marginTop:8,textAlign:"center",fontSize:"0.75rem",color:MU}}>
            Combined Motor Score: <strong style={{color:A,fontSize:"1rem"}}>{motorTotal("r")+motorTotal("l")}/100</strong>
          </div>
        </div>

        {/* Sacral Sparing */}
        <div style={{background:card,borderRadius:12,border:`1px solid ${border}`,padding:"14px",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:A,marginBottom:10}}>Sacral Sparing</div>
          {[
            {id:"asia_vac",label:"VAC — Voluntary Anal Contraction",opts:["Present","Absent"]},
            {id:"asia_dap",label:"DAP — Deep Anal Pressure",opts:["Present","Absent"]},
          ].map(item=>(
            <div key={item.id} style={{marginBottom:10}}>
              <div style={{fontSize:"0.75rem",color:txt,marginBottom:6}}>{item.label}</div>
              <div style={{display:"flex",gap:8}}>
                {item.opts.map(o=>(
                  <button key={o} onClick={()=>set(item.id,o)}
                    style={{flex:1,padding:"10px",borderRadius:8,border:`1.5px solid ${answers[item.id]===o?A:border}`,
                      background:answers[item.id]===o?`rgba(124,58,237,0.12)`:card,
                      color:answers[item.id]===o?A:txt,cursor:"pointer",fontFamily:"inherit",fontWeight:answers[item.id]===o?700:400,fontSize:"0.82rem"}}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Complete button */}
        <button onClick={finish} disabled={!allMotorFilled||!answers.asia_grade||!answers.asia_nli}
          style={{width:"100%",padding:"14px",borderRadius:12,border:"none",
            background:allMotorFilled&&answers.asia_grade&&answers.asia_nli
              ?"linear-gradient(135deg,#16a34a,#15803d)":`#e5e7eb`,
            color:allMotorFilled&&answers.asia_grade&&answers.asia_nli?"#fff":"#9ca3af",
            fontSize:"0.95rem",fontWeight:700,cursor:allMotorFilled&&answers.asia_grade&&answers.asia_nli?"pointer":"default",
            fontFamily:"inherit",marginBottom:24}}>
          ✓ Complete ASIA Assessment
        </button>
      </div>
    </div>
  );
}

// ─── MAIN MODULE ──────────────────────────────────────────────────────────────
export default function OutcomeMeasuresPro({ data, set }) {
  const PC=getC();
  const [view,setView]=useState("list"); // list | live | result | patient
  const [activeScale,setActiveScale]=useState(null);
  const [patientMode,setPatientMode]=useState(false);
  const [lastResult,setLastResult]=useState(null);

  // Load history from patient data
  const getHistory=(scaleId)=>{
    try{ return JSON.parse(data?.[`om_history_${scaleId}`]||"[]"); }catch{ return []; }
  };
  const getLastScore=(scaleId)=>{
    const h=getHistory(scaleId); return h.length?h[h.length-1]:null;
  };

  const handleComplete=(result)=>{
    // Save to history
    const history=[...getHistory(result.scaleId),{score:result.score,date:result.date}].slice(-10);
    if(set){
      set(`om_history_${result.scaleId}`,JSON.stringify(history));
      // Also write individual field answers
      Object.entries(result.answers||{}).forEach(([k,v])=>set(k,v));
    }
    setLastResult({...result,history});
    setView("result");
  };

  if((view==="live"||view==="patient")&&activeScale==="asia"){
    return <AsiaGridMode patientName={data?.name||"Patient"}
      onComplete={handleComplete} onBack={()=>setView("list")} patientMode={view==="patient"}/>;
  }
  if(view==="live"||view==="patient"){
    return <LiveMode scaleId={activeScale} patientName={data?.name||"Patient"}
      onComplete={handleComplete} onBack={()=>setView("list")} patientMode={view==="patient"}/>;
  }
  if(view==="result"&&lastResult){
    return <ResultScreen result={lastResult} history={lastResult.history}
      patientName={data?.name||"Patient"}
      onClose={()=>setView("list")} onRetake={()=>setView("live")}/>;
  }

  // Scale list
  return(
    <div style={{fontFamily:"system-ui,sans-serif",color:TX}}>
      <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <div style={{fontWeight:800,fontSize:"0.95rem",flex:1}}>📈 Outcome Measures</div>
        <span style={{fontSize:"0.68rem",color:MU,background:S2,padding:"3px 10px",borderRadius:20,border:`1px solid ${BD}`}}>
          {Object.keys(SCALES).length} validated scales
        </span>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {Object.values(SCALES).map(sc=>{
          const last=getLastScore(sc.id);
          const interp=last?sc.interpret(last.score):null;
          const history=getHistory(sc.id);
          return(
            <div key={sc.id} style={{background:"#fff",borderRadius:12,
              border:`1px solid ${BD}`,overflow:"hidden"}}>
              {/* Scale header */}
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:"1.3rem"}}>{sc.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:TX}}>{sc.full}</div>
                  <div style={{fontSize:"0.65rem",color:MU,marginTop:1}}>
                    {sc.category} · MCID {sc.mcid}{sc.unit}
                    {last&&<span style={{marginLeft:8,color:interp?.color,fontWeight:600}}>
                      Last: {last.score}{sc.unit} — {interp?.label}
                    </span>}
                  </div>
                </div>
                {history.length>1&&<MiniTrend history={history}/>}
                {last&&<div style={{textAlign:"right"}}>
                  <div style={{fontSize:"1.2rem",fontWeight:800,color:interp?.color}}>{last.score}</div>
                  <div style={{fontSize:"0.6rem",color:MU}}>{sc.unit}</div>
                </div>}
              </div>
              {last&&<ScoreBar score={last.score} maxScore={sc.maxScore} color={interp?.color||A}/>}
              {/* Actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,borderTop:`1px solid ${BD}`}}>
                {[
                  {label:"📄 Blank PDF",color:MU,action:()=>generateBlankPDF(sc.id,data?.name||"")},
                  {label:"▶ Therapist",color:A,action:()=>{setActiveScale(sc.id);setView("live");}},
                  {label:"👤 Patient",color:"#059669",action:()=>{setActiveScale(sc.id);setView("patient");}},
                ].map((btn,i)=>(
                  <button key={i} onClick={btn.action}
                    style={{padding:"9px 4px",border:"none",borderRight:i<2?`1px solid ${BD}`:"none",
                      background:"transparent",color:btn.color,fontSize:"0.68rem",fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit"}}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:S2,
        border:`1px solid ${BD}`,fontSize:"0.65rem",color:MU,lineHeight:1.6}}>
        <strong style={{color:A}}>👤 Patient mode</strong> — hands the tablet to the patient for self-completion. Questions appear large with Hindi toggle. &nbsp;
        <strong style={{color:A}}>▶ Therapist mode</strong> — clinician reads and taps answers.
      </div>
    </div>
  );
}
// ── SCALE ADDITIONS ───────────────────────────────────────────────────────────
// Appended: ASIA + Gait scales (BBS, TUG, 10MWT, DGI, FAC)

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

// ── HINDI FOR GAIT/BALANCE ───────────────────────────────────────────────────
Object.assign(HI, {
  bbs_1:["1. बैठने से खड़े होना","4 — बिना हाथ के स्वतंत्र रूप से खड़े हो सकते हैं","3 — हाथ से स्वतंत्र रूप से खड़े हो सकते हैं","2 — कई प्रयासों के बाद खड़े हो सकते हैं","1 — न्यूनतम सहायता चाहिए","0 — मध्यम या अधिक सहायता चाहिए"],
  bbs_2:["2. बिना सहारे खड़े रहना (2 मिनट)","4 — 2 मिनट सुरक्षित रूप से खड़े","3 — देखरेख में 2 मिनट","2 — 30 सेकंड","1 — कई प्रयासों से 30 सेकंड","0 — 30 सेकंड बिना सहायता नहीं"],
  dgi_1:["1. सपाट सतह पर चलना","3 — सामान्य, कोई उपकरण नहीं","2 — हल्का — उपकरण या धीमी गति","1 — मध्यम — धीमी, असामान्य चाल","0 — गंभीर — बिना सहायता नहीं चल सकते"],
  fac_score:["अम्बुलेशन स्तर","0 — गैर-कार्यात्मक: व्हीलचेयर","1 — आश्रित स्तर 2: निरंतर शारीरिक सहायता","2 — आश्रित स्तर 1: कभी-कभी शारीरिक सहायता","3 — निगरानी: देखरेख, कोई संपर्क नहीं","4 — स्वतंत्र स्तर 1: केवल सपाट सतह","5 — स्वतंत्र स्तर 2: किसी भी सतह, सीढ़ियाँ"],
});

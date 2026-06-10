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
  const fields=sc.fields;
  const total=fields.length;
  const f=fields[qIdx];
  const answered=answers[f.id]!==undefined;
  const PC=getC();

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
        ):(
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
        )}

        {/* Navigation */}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          {qIdx>0&&<button type="button" onClick={()=>setQIdx(q=>q-1)}
            style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${BD}`,
              background:"transparent",color:MU,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit"}}>
            ← Back
          </button>}
          {f.type==="slider"&&<button type="button" onClick={()=>{if(qIdx<total-1)setQIdx(q=>q+1);}}
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

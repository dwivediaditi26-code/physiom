// OutcomeMeasuresPro.jsx — Enhanced Outcome Measures with Live Guided + PDF
// Replaces OutcomeMeasuresModule — drop-in compatible

import React, { useState, useEffect, useRef } from "react";
import { getC } from "./utils.jsx";
import { SCALES } from "./sharedClinicalData.js";

const A="#7c3aed",S2="#FFFFFF",BD="#E0E0E2",TX="#0D0D0D",MU="#6B6B6B";

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
h1{font-size:16px;font-weight:700;color:#0D0D0D;margin-bottom:2px}
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
  const [stage,setStage]=useState("questions"); // questions | review

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
      setQIdx(q=>Math.min(q+1,total-1));
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

  const questionsUI=(
    <div style={{minHeight:"100vh",background:patientMode?"#0d0d1a":"#F2F2F4",
      display:"flex",flexDirection:"column",fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:patientMode?"#111":"#fff",padding:"12px 16px",
        borderBottom:"1px solid #E0E0E2",display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",
          color:patientMode?"#9ca3af":"#6B6B6B",fontSize:"1.1rem",cursor:"pointer",padding:"4px 8px"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:patientMode?"#e2e8f0":TX}}>{sc.full}</div>
          <div style={{fontSize:"0.65rem",color:patientMode?"#6b7280":MU}}>{patientName} · Q{qIdx+1}/{total}</div>
        </div>
        <button onClick={()=>setLang(l=>l==="en"?"hi":"en")}
          style={{padding:"4px 10px",borderRadius:20,border:"1px solid #E0E0E2",
            background:lang==="hi"?"#ede9fe":"transparent",
            color:lang==="hi"?A:MU,fontSize:"0.68rem",cursor:"pointer",fontWeight:600}}>
          {lang==="en"?"अ Hindi":"A English"}
        </button>
      </div>

      {/* Progress */}
      <div style={{background:patientMode?"#161625":"#FFFFFF",padding:"8px 16px"}}>
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
          {qIdx>0&&<button type="button" onClick={()=>setQIdx(q=>Math.max(q-1,0))}
            style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${BD}`,
              background:"transparent",color:MU,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit"}}>
            ← Back
          </button>}
          {(f.type==="slider"||f.type==="timer")&&<button type="button" onClick={()=>setQIdx(q=>Math.min(q+1,total-1))}
            style={{flex:2,padding:"12px",borderRadius:10,border:"none",
              background:`linear-gradient(135deg,${A},#9333ea)`,color:"#fff",
              fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Next →
          </button>}
          {qIdx===total-1&&allAnswered&&(
            <button type="button" onClick={()=>setStage("review")}
              style={{flex:2,padding:"12px",borderRadius:10,border:"none",
                background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",
                fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ✓ Review Answers →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── REVIEW SCREEN ──────────────────────────────────────────────────────────
  if(stage==="review"){
    const previewAnswers={...answers};
    if(scaleId==="psfs"){
      previewAnswers.psfs_activity1=activity.act1;
      previewAnswers.psfs_activity2=activity.act2;
      previewAnswers.psfs_activity3=activity.act3;
    }
    const previewScore=sc.score(previewAnswers);
    const interp=previewScore!=null?sc.interpret(previewScore):null;

    return(
      <div style={{minHeight:"100vh",background:patientMode?"#0d0d1a":"#F2F2F4",
        fontFamily:"system-ui,sans-serif",color:patientMode?"#e2e8f0":TX}}>
        {/* Header */}
        <div style={{background:patientMode?"#111":"#fff",padding:"12px 16px",
          borderBottom:`1px solid ${BD}`,display:"flex",alignItems:"center",gap:10,
          position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setStage("questions")}
            style={{background:"none",border:"none",color:MU,fontSize:"1.1rem",cursor:"pointer",padding:"4px 8px"}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"0.82rem",color:patientMode?"#e2e8f0":TX}}>📋 Answer Review — {sc.label}</div>
            <div style={{fontSize:"0.65rem",color:MU}}>{patientName} · Check all answers before saving</div>
          </div>
        </div>

        <div style={{padding:"14px 12px",maxWidth:560,margin:"0 auto"}}>
          {/* Score preview */}
          {previewScore!=null&&(
            <div style={{background:patientMode?"#161625":"#fff",borderRadius:12,
              border:`2px solid ${interp?.color||A}`,padding:"14px 16px",marginBottom:14,
              display:"flex",alignItems:"center",gap:14}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"2rem",fontWeight:900,color:interp?.color||A,lineHeight:1}}>{previewScore}</div>
                <div style={{fontSize:"0.65rem",color:MU,marginTop:2}}>{sc.unit}</div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:interp?.color||A}}>{interp?.label}</div>
                <div style={{fontSize:"0.7rem",color:MU,marginTop:2}}>{sc.full} · MCID {sc.mcid}{sc.unit}</div>
              </div>
            </div>
          )}

          {/* Q&A list */}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {fields.map((field,i)=>{
              const ans=answers[field.id];
              if(ans==null) return null;
              return(
                <div key={field.id} style={{background:patientMode?"#161625":"#fff",
                  borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden"}}>
                  {/* Question label */}
                  <div style={{padding:"8px 12px",borderBottom:`1px solid ${BD}`,
                    fontSize:"0.72rem",fontWeight:700,color:patientMode?"#9ca3af":MU,
                    display:"flex",alignItems:"center",gap:6}}>
                    <span style={{background:A,color:"#fff",borderRadius:"50%",
                      width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",
                      fontSize:"0.6rem",fontWeight:800,flexShrink:0}}>{i+1}</span>
                    {field.label}
                  </div>
                  {/* Selected answer */}
                  <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:"#16a34a",fontSize:"1rem",flexShrink:0}}>✓</span>
                    <div style={{fontSize:"0.82rem",fontWeight:600,color:patientMode?"#e2e8f0":TX}}>{ans}</div>
                    {/* Edit button */}
                    <button onClick={()=>{setQIdx(i);setStage("questions");}}
                      style={{marginLeft:"auto",padding:"3px 10px",borderRadius:6,
                        border:`1px solid ${BD}`,background:"transparent",
                        color:A,fontSize:"0.65rem",cursor:"pointer",fontWeight:600,flexShrink:0}}>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <button onClick={finish}
            style={{width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",
              fontSize:"0.95rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>
            💾 Save & View Score
          </button>
        </div>
      </div>
    );
  }

  return questionsUI;
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
  const [stage,setStage]=useState("grid"); // grid | review
  const [showGuide,setShowGuide]=useState(false);
  const bg=patientMode?"#0d0d1a":"#F2F2F4";
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

  const gridUI=(
    <div style={{minHeight:"100vh",background:bg,fontFamily:"system-ui,sans-serif",color:txt}}>
      {/* Header */}
      <div style={{background:patientMode?"#111":"#fff",padding:"12px 16px",
        borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:patientMode?"#9ca3af":MU,fontSize:"1.1rem",cursor:"pointer",padding:"4px 8px"}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:txt}}>🦾 ASIA Impairment Scale</div>
          <div style={{fontSize:"0.65rem",color:MU}}>{patientName} · SCI Motor & Sensory Classification</div>
        </div>
        <button onClick={()=>setShowGuide(g=>!g)}
          style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${A}`,
            background:showGuide?"rgba(124,58,237,0.15)":"transparent",
            color:"#c4b5fd",fontSize:"0.65rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>
          {showGuide?"▲ Hide Guide":"📋 How to Perform"}
        </button>
      </div>

      {/* Clinical Guide */}
      {showGuide&&(
        <div style={{background:"#111827",borderTop:"1px solid #374151",padding:"14px 16px",fontSize:"0.68rem",color:"#d1d5db",lineHeight:1.7}}>
          <div style={{fontWeight:800,color:"#c4b5fd",marginBottom:8,fontSize:"0.75rem"}}>
            🦾 ASIA / ISNCSCI — How to Perform
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontWeight:700,color:"#a78bfa",marginBottom:3}}>What is it?</div>
            The ASIA Impairment Scale (AIS) is the international gold standard for classifying spinal cord injury (SCI) severity. Always perform this in a quiet, private setting. Patient must be conscious and cooperative. Takes 30–45 minutes for a full assessment.
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontWeight:700,color:"#a78bfa",marginBottom:3}}>Motor Testing (0–5 scale)</div>
            Test 10 key muscle groups bilaterally. Position: supine for UE, supine for LE.
            <div style={{marginTop:4,paddingLeft:8,borderLeft:"2px solid #4c1d95"}}>
              <div><strong style={{color:"#c4b5fd"}}>0</strong> — Total paralysis</div>
              <div><strong style={{color:"#c4b5fd"}}>1</strong> — Palpable or visible contraction only</div>
              <div><strong style={{color:"#c4b5fd"}}>2</strong> — Active movement, gravity eliminated</div>
              <div><strong style={{color:"#c4b5fd"}}>3</strong> — Active movement against gravity</div>
              <div><strong style={{color:"#c4b5fd"}}>4</strong> — Active movement against some resistance</div>
              <div><strong style={{color:"#c4b5fd"}}>5</strong> — Normal — active movement against full resistance</div>
              <div style={{marginTop:4,color:"#9ca3af",fontSize:"0.62rem"}}>NT = Not testable (cast, pain, contracture). Score as NT, not 0.</div>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontWeight:700,color:"#a78bfa",marginBottom:3}}>UE Key Muscles (C5–T1)</div>
            <div style={{paddingLeft:8,borderLeft:"2px solid #4c1d95"}}>
              <div>C5 — Elbow flexors (biceps, brachialis)</div>
              <div>C6 — Wrist extensors (ECRL, ECRB)</div>
              <div>C7 — Elbow extensors (triceps)</div>
              <div>C8 — Finger flexors (FDP to middle finger)</div>
              <div>T1 — Finger abductors (abductor digiti minimi)</div>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontWeight:700,color:"#a78bfa",marginBottom:3}}>LE Key Muscles (L2–S1)</div>
            <div style={{paddingLeft:8,borderLeft:"2px solid #4c1d95"}}>
              <div>L2 — Hip flexors (iliopsoas)</div>
              <div>L3 — Knee extensors (quadriceps)</div>
              <div>L4 — Ankle dorsiflexors (tibialis anterior)</div>
              <div>L5 — Long toe extensors (EHL)</div>
              <div>S1 — Ankle plantar flexors (gastrocnemius, soleus)</div>
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <div style={{fontWeight:700,color:"#a78bfa",marginBottom:3}}>Sacral Sparing (critical for AIS A vs B)</div>
            <div style={{paddingLeft:8,borderLeft:"2px solid #dc2626"}}>
              <div><strong style={{color:"#fca5a5"}}>VAC</strong> — Voluntary Anal Contraction: insert gloved finger, ask patient to squeeze. Any voluntary contraction = motor incomplete (not AIS A).</div>
              <div style={{marginTop:4}}><strong style={{color:"#fca5a5"}}>DAP</strong> — Deep Anal Pressure: apply pressure to anorectal wall. Any sensation = sensory sacral sparing → not AIS A.</div>
            </div>
          </div>

          <div style={{marginBottom:6}}>
            <div style={{fontWeight:700,color:"#a78bfa",marginBottom:3}}>AIS Grade Rules</div>
            <div style={{paddingLeft:8,borderLeft:"2px solid #4c1d95"}}>
              <div><strong style={{color:"#c4b5fd"}}>A — Complete:</strong> No motor/sensory in S4–S5. No VAC. No DAP.</div>
              <div><strong style={{color:"#c4b5fd"}}>B — Incomplete:</strong> Sensory but NO motor below NLI. Includes S4–S5.</div>
              <div><strong style={{color:"#c4b5fd"}}>C — Incomplete:</strong> Motor preserved below NLI. More than half key muscles grade &lt;3.</div>
              <div><strong style={{color:"#c4b5fd"}}>D — Incomplete:</strong> Motor preserved below NLI. At least half key muscles grade ≥3.</div>
              <div><strong style={{color:"#c4b5fd"}}>E — Normal:</strong> Motor and sensory normal. Only use if prior deficit documented.</div>
            </div>
          </div>

          <div style={{marginTop:8,padding:"6px 10px",background:"rgba(220,38,38,0.15)",borderRadius:6,
            fontSize:"0.6rem",color:"#fca5a5",borderLeft:"2px solid #dc2626"}}>
            ⚠ Always use official ISNCSCI worksheet for formal documentation. This tool is for clinical recording only.
          </div>
        </div>
      )}

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

        {/* Review button */}
        <button onClick={()=>setStage("review")} disabled={!allMotorFilled||!answers.asia_grade||!answers.asia_nli}
          style={{width:"100%",padding:"14px",borderRadius:12,border:"none",
            background:allMotorFilled&&answers.asia_grade&&answers.asia_nli
              ?"linear-gradient(135deg,#16a34a,#15803d)":`#e5e7eb`,
            color:allMotorFilled&&answers.asia_grade&&answers.asia_nli?"#fff":"#9ca3af",
            fontSize:"0.95rem",fontWeight:700,cursor:allMotorFilled&&answers.asia_grade&&answers.asia_nli?"pointer":"default",
            fontFamily:"inherit",marginBottom:24}}>
          ✓ Review & Score →
        </button>
      </div>
    </div>
  );

  // ── ASIA REVIEW SCREEN ────────────────────────────────────────────────────
  if(stage==="review"){
    const totalScore=motorTotal("r")+motorTotal("l");
    const interp=SCALES.asia.interpret(totalScore);
    return(
      <div style={{minHeight:"100vh",background:bg,fontFamily:"system-ui,sans-serif",color:txt}}>
        {/* Header */}
        <div style={{background:patientMode?"#111":"#fff",padding:"12px 16px",
          borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",gap:10,
          position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setStage("grid")}
            style={{background:"none",border:"none",color:MU,fontSize:"1.1rem",cursor:"pointer",padding:"4px 8px"}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"0.82rem",color:txt}}>📋 ASIA Review</div>
            <div style={{fontSize:"0.65rem",color:MU}}>{patientName} · Verify all scores before saving</div>
          </div>
        </div>

        <div style={{padding:"14px 12px",maxWidth:560,margin:"0 auto"}}>
          {/* Score summary card */}
          <div style={{background:card,borderRadius:12,border:`2px solid ${interp.color}`,
            padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"2rem",fontWeight:900,color:interp.color,lineHeight:1}}>{totalScore}</div>
                <div style={{fontSize:"0.62rem",color:MU,marginTop:2}}>/ 100 motor pts</div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:interp.color}}>{interp.label}</div>
                <div style={{fontSize:"0.7rem",color:MU,marginTop:2}}>
                  AIS Grade: <strong style={{color:A}}>{answers.asia_grade||"—"}</strong>
                  &nbsp;·&nbsp; NLI: <strong style={{color:A}}>{answers.asia_nli||"—"}</strong>
                </div>
              </div>
            </div>
            {/* UE/LE breakdown */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,
              background:S2,borderRadius:8,padding:"8px"}}>
              {[
                {label:"UE Right",val:ueTotal("r"),max:25},
                {label:"UE Left",val:ueTotal("l"),max:25},
                {label:"LE Right",val:leTotal("r"),max:25},
                {label:"LE Left",val:leTotal("l"),max:25},
              ].map(item=>(
                <div key={item.label} style={{textAlign:"center"}}>
                  <div style={{fontSize:"1rem",fontWeight:800,color:A}}>{item.val}</div>
                  <div style={{fontSize:"0.55rem",color:MU}}>{item.label}<br/>/{item.max}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Motor scores table */}
          <div style={{background:card,borderRadius:12,border:`1px solid ${border}`,
            padding:"12px",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:"0.78rem",color:A,marginBottom:8}}>Motor Scores</div>
            {/* Header */}
            <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr",gap:4,
              marginBottom:6,fontSize:"0.65rem",fontWeight:700,color:MU}}>
              <div>Level / Muscle</div>
              <div style={{textAlign:"center"}}>RIGHT</div>
              <div style={{textAlign:"center"}}>LEFT</div>
            </div>
            {ASIA_MOTOR_LEVELS.map((row,i)=>{
              const isLE=["L2","L3","L4","L5","S1"].includes(row.level);
              return(
                <React.Fragment key={row.level}>
                  {i===5&&<div style={{fontSize:"0.6rem",color:A,fontWeight:700,
                    textTransform:"uppercase",margin:"8px 0 4px",paddingLeft:2}}>Lower Extremity</div>}
                  {i===0&&<div style={{fontSize:"0.6rem",color:A,fontWeight:700,
                    textTransform:"uppercase",margin:"0 0 4px",paddingLeft:2}}>Upper Extremity</div>}
                  <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr",gap:4,
                    padding:"5px 6px",borderRadius:6,marginBottom:2,
                    background:i%2===0?S2:card}}>
                    <div>
                      <span style={{fontWeight:700,fontSize:"0.72rem",color:A}}>{row.level}</span>
                      <span style={{fontSize:"0.6rem",color:MU,marginLeft:4}}>{row.label}</span>
                    </div>
                    {["r","l"].map(side=>{
                      const v=answers[row[side]];
                      const gradeLabel=["None","Trace","Grav−","Grav+","Some R","Normal"][+v]||"—";
                      return(
                        <div key={side} style={{textAlign:"center"}}>
                          <span style={{fontWeight:800,fontSize:"0.88rem",
                            color:v==="5"?"#16a34a":v==="0"?"#dc2626":A}}>{v??<span style={{color:"#f59e0b"}}>?</span>}</span>
                          <span style={{fontSize:"0.55rem",color:MU,marginLeft:3}}>{v!=null?gradeLabel:""}</span>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Sacral sparing */}
          <div style={{background:card,borderRadius:12,border:`1px solid ${border}`,
            padding:"12px",marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:"0.78rem",color:A,marginBottom:8}}>Sacral Sparing</div>
            {[
              {id:"asia_vac",label:"VAC — Voluntary Anal Contraction"},
              {id:"asia_dap",label:"DAP — Deep Anal Pressure"},
            ].map(item=>(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${border}`}}>
                <span style={{fontSize:"0.75rem",color:txt}}>{item.label}</span>
                <span style={{fontWeight:700,fontSize:"0.78rem",
                  color:answers[item.id]==="Present"?"#16a34a":answers[item.id]==="Absent"?"#dc2626":MU}}>
                  {answers[item.id]||"—"}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{display:"flex",gap:10,marginBottom:24}}>
            <button onClick={()=>setStage("grid")}
              style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${border}`,
                background:"transparent",color:MU,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit"}}>
              ← Edit
            </button>
            <button onClick={finish}
              style={{flex:2,padding:"12px",borderRadius:10,border:"none",
                background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",
                fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              💾 Save & View Score
            </button>
          </div>
        </div>
      </div>
    );
  }

  return gridUI;
}

// ─── MAIN MODULE ──────────────────────────────────────────────────────────────
export { SCALES };
export default function OutcomeMeasuresPro({ data, set }) {
  const PC=getC();
  const [view,setView]=useState("list"); // list | live | result | patient
  const [activeScale,setActiveScale]=useState(null);
  const [patientMode,setPatientMode]=useState(false);
  const [lastResult,setLastResult]=useState(null);
  const [omSearch,setOmSearch]=useState("");
  const [omSearchOpen,setOmSearchOpen]=useState(false);

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

  if(view==="live"&&activeScale==="asia"){
    return <AsiaGridMode patientName={data?.name||"Patient"}
      onComplete={handleComplete} onBack={()=>setView("list")} patientMode={false}/>;
  }
  if(view==="live"){
    return <LiveMode scaleId={activeScale} patientName={data?.name||"Patient"}
      onComplete={handleComplete} onBack={()=>setView("list")} patientMode={false}/>;
  }
  if(view==="result"&&lastResult){
    return <ResultScreen result={lastResult} history={lastResult.history}
      patientName={data?.name||"Patient"}
      onClose={()=>setView("list")} onRetake={()=>setView("live")}/>;
  }

  // Scale list
  return(
    <div style={{fontFamily:"system-ui,sans-serif",color:TX}}>
      {/* Header row */}
      <div style={{marginBottom:omSearchOpen?6:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <div style={{fontWeight:800,fontSize:"0.95rem",flex:1}}>📈 Outcome Measures</div>
        {!omSearchOpen && (
          <span style={{fontSize:"0.68rem",color:MU,background:S2,padding:"3px 10px",borderRadius:20,border:`1px solid ${BD}`}}>
            {Object.keys(SCALES).length} validated scales
          </span>
        )}
        {omSearchOpen ? (
          <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
            <input autoFocus type="text" value={omSearch} onChange={e=>setOmSearch(e.target.value)}
              placeholder="Search scales…"
              style={{flex:1,padding:"5px 10px",borderRadius:8,border:`1.5px solid ${A}`,background:S2,color:TX,fontSize:"0.8rem",fontFamily:"inherit",outline:"none",minHeight:32}}/>
            <button type="button" onClick={()=>{setOmSearchOpen(false);setOmSearch("");}}
              style={{background:"transparent",border:"none",color:MU,cursor:"pointer",fontSize:"1rem",padding:"0 2px",minHeight:32}}>✕</button>
          </div>
        ) : (
          <button type="button" onClick={()=>setOmSearchOpen(true)}
            style={{background:"transparent",border:"none",padding:"0 2px",cursor:"pointer",color:MU,fontSize:"1.1rem",lineHeight:1,minHeight:28}}>🔍</button>
        )}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {(()=>{
          const filtered=Object.values(SCALES).filter(sc=>!omSearch.trim()||sc.full.toLowerCase().includes(omSearch.toLowerCase())||sc.category.toLowerCase().includes(omSearch.toLowerCase()));
          const groups={}; const order=[];
          filtered.forEach(sc=>{ if(!groups[sc.category]){groups[sc.category]=[];order.push(sc.category);} groups[sc.category].push(sc); });
          return order.map(cat=>(
            <div key={cat} style={{marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 2px 8px"}}>
                <span style={{fontSize:"0.72rem",fontWeight:800,color:A,textTransform:"uppercase",letterSpacing:"0.6px",whiteSpace:"nowrap"}}>{cat}</span>
                <span style={{flex:1,height:1,background:BD}}/>
                <span style={{fontSize:"0.62rem",color:MU,fontWeight:700,background:S2,border:`1px solid ${BD}`,borderRadius:20,padding:"1px 8px"}}>{groups[cat].length}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {groups[cat].map(sc=>{
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
                      <div className="pm-outcome-actions" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,borderTop:`1px solid ${BD}`}}>
                        {[
                          {label:"📄 Blank PDF",color:MU,action:()=>generateBlankPDF(sc.id,data?.name||"")},
                          {label:"▶ Start Assessment",color:A,action:()=>{setActiveScale(sc.id);setView("live");}},
                        ].map((btn,i)=>(
                          <button key={i} onClick={btn.action}
                            style={{padding:"9px 4px",border:"none",borderRight:i<1?`1px solid ${BD}`:"none",
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
            </div>
          ));
        })()}
      </div>
      <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:S2,
        border:`1px solid ${BD}`,fontSize:"0.65rem",color:MU,lineHeight:1.6}}>
        <strong style={{color:A}}>▶ Start Assessment</strong> — guided question-by-question flow. Therapist reads and taps answers. Hindi toggle available for NDI/ODI. Review all answers before saving.
      </div>
    </div>
  );
}
// ── SCALE ADDITIONS ───────────────────────────────────────────────────────────
// Appended: ASIA + Gait scales (BBS, TUG, 10MWT, DGI, FAC)


// ── HINDI FOR GAIT/BALANCE ───────────────────────────────────────────────────
Object.assign(HI, {
  bbs_1:["1. बैठने से खड़े होना","4 — बिना हाथ के स्वतंत्र रूप से खड़े हो सकते हैं","3 — हाथ से स्वतंत्र रूप से खड़े हो सकते हैं","2 — कई प्रयासों के बाद खड़े हो सकते हैं","1 — न्यूनतम सहायता चाहिए","0 — मध्यम या अधिक सहायता चाहिए"],
  bbs_2:["2. बिना सहारे खड़े रहना (2 मिनट)","4 — 2 मिनट सुरक्षित रूप से खड़े","3 — देखरेख में 2 मिनट","2 — 30 सेकंड","1 — कई प्रयासों से 30 सेकंड","0 — 30 सेकंड बिना सहायता नहीं"],
  dgi_1:["1. सपाट सतह पर चलना","3 — सामान्य, कोई उपकरण नहीं","2 — हल्का — उपकरण या धीमी गति","1 — मध्यम — धीमी, असामान्य चाल","0 — गंभीर — बिना सहायता नहीं चल सकते"],
  fac_score:["अम्बुलेशन स्तर","0 — गैर-कार्यात्मक: व्हीलचेयर","1 — आश्रित स्तर 2: निरंतर शारीरिक सहायता","2 — आश्रित स्तर 1: कभी-कभी शारीरिक सहायता","3 — निगरानी: देखरेख, कोई संपर्क नहीं","4 — स्वतंत्र स्तर 1: केवल सपाट सतह","5 — स्वतंत्र स्तर 2: किसी भी सतह, सीढ़ियाँ"],
});

// ── REGION-SPECIFIC + PSYCHOLOGICAL SCALE ADDITIONS ───────────────────────────
// SPADI, KOOS-JR, HOOS-JR, FAAM-ADL, LEFS, FABQ-PA, PCS, RMDQ

// ── HINDI FOR REGION-SPECIFIC + PSYCHOLOGICAL SCALES ─────────────────────────
Object.assign(HI, {
  spadi_p1:["1. दर्द — सबसे बुरी स्थिति में (0 = कोई दर्द नहीं, 10 = असहनीय)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_p2:["2. दर्द — प्रभावित तरफ करवट लेकर लेटने पर (0 = कोई दर्द नहीं, 10 = असहनीय)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_p3:["3. दर्द — ऊँची शेल्फ से कोई चीज़ लेने पर (0 = कोई दर्द नहीं, 10 = असहनीय)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_p4:["4. दर्द — गर्दन के पीछे छूने पर (0 = कोई दर्द नहीं, 10 = असहनीय)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_p5:["5. दर्द — प्रभावित बांह से धक्का देने पर (0 = कोई दर्द नहीं, 10 = असहनीय)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d1:["6. कठिनाई — बाल धोना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d2:["7. कठिनाई — पीठ धोना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d3:["8. कठिनाई — बनियान/स्वेटर पहनना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d4:["9. कठिनाई — सामने बटन वाली कमीज़ पहनना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d5:["10. कठिनाई — पैंट पहनना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d6:["11. कठिनाई — ऊँची शेल्फ पर चीज़ रखना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d7:["12. कठिनाई — भारी वस्तु (5 किग्रा) ले जाना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  spadi_d8:["13. कठिनाई — पिछली जेब से कुछ निकालना (0 = कोई कठिनाई नहीं, 10 = असंभव)", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  koosjr_1:["1. अकड़न — दिन में बाद में बैठने/लेटने/आराम के बाद घुटने की अकड़न कितनी गंभीर है?", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  koosjr_2:["2. दर्द — घुटने पर मुड़ने/घूमने पर", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  koosjr_3:["3. दर्द — घुटना पूरी तरह सीधा करने पर", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  koosjr_4:["4. दर्द — सीढ़ियाँ चढ़ने या उतरने पर", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  koosjr_5:["5. दर्द — सीधे खड़े होने पर", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  koosjr_6:["6. कार्य — बैठने से उठना", "0 — कोई कठिनाई नहीं", "1 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "3 — अत्यधिक कठिनाई", "4 — कर ही नहीं सकते"],
  koosjr_7:["7. कार्य — झुककर फर्श से वस्तु उठाना", "0 — कोई कठिनाई नहीं", "1 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "3 — अत्यधिक कठिनाई", "4 — कर ही नहीं सकते"],
  hoosjr_1:["1. दर्द — सीढ़ियाँ चढ़ने या उतरने पर", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  hoosjr_2:["2. दर्द — असमान सतह पर चलने पर", "0 — बिल्कुल नहीं", "1 — हल्का", "2 — मध्यम", "3 — गंभीर", "4 — अत्यधिक"],
  hoosjr_3:["3. कार्य — बैठने से उठना", "0 — कोई कठिनाई नहीं", "1 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "3 — अत्यधिक कठिनाई", "4 — कर ही नहीं सकते"],
  hoosjr_4:["4. कार्य — झुककर फर्श से वस्तु उठाना", "0 — कोई कठिनाई नहीं", "1 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "3 — अत्यधिक कठिनाई", "4 — कर ही नहीं सकते"],
  hoosjr_5:["5. कार्य — बिस्तर में लेटना (करवट बदलना)", "0 — कोई कठिनाई नहीं", "1 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "3 — अत्यधिक कठिनाई", "4 — कर ही नहीं सकते"],
  hoosjr_6:["6. कार्य — बैठना", "0 — कोई कठिनाई नहीं", "1 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "3 — अत्यधिक कठिनाई", "4 — कर ही नहीं सकते"],
  faam_1:["1. खड़े रहना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_2:["2. समतल ज़मीन पर चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_3:["3. बिना जूतों के समतल ज़मीन पर चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_4:["4. चढ़ाई पर चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_5:["5. ढलान पर चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_6:["6. सीढ़ियाँ चढ़ना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_7:["7. सीढ़ियाँ उतरना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_8:["8. असमान ज़मीन पर चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_9:["9. कर्ब/फुटपाथ पर चढ़ना-उतरना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_10:["10. उकड़ूँ बैठना (स्क्वाट)", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_11:["11. पंजों पर उठना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_12:["12. चलना शुरू करना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_13:["13. 5 मिनट या कम चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_14:["14. लगभग 10 मिनट चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_15:["15. 15 मिनट या अधिक चलना", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_16:["16. घर की ज़िम्मेदारियाँ", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_17:["17. दैनिक जीवन की गतिविधियाँ", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_18:["18. व्यक्तिगत देखभाल", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_19:["19. हल्का से मध्यम काम (खड़े रहना, चलना)", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_20:["20. भारी काम (धक्का/खींचना, चढ़ना, उठाना)", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  faam_21:["21. मनोरंजक गतिविधियाँ", "4 — कोई कठिनाई नहीं", "3 — थोड़ी कठिनाई", "2 — मध्यम कठिनाई", "1 — अत्यधिक कठिनाई", "0 — कर नहीं सकते"],
  lefs_1:["1. आपका सामान्य काम, घर का काम या स्कूल की गतिविधियाँ", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_2:["2. आपके सामान्य शौक, मनोरंजन या खेल गतिविधियाँ", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_3:["3. स्नानघर (बाथटब) में जाना या निकलना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_4:["4. कमरों के बीच चलना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_5:["5. जूते या मोज़े पहनना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_6:["6. उकड़ूँ बैठना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_7:["7. फर्श से वस्तु उठाना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_8:["8. घर में हल्की गतिविधियाँ", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_9:["9. घर में भारी गतिविधियाँ", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_10:["10. कार में बैठना या निकलना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_11:["11. 2 ब्लॉक (करीब 200 मीटर) चलना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_12:["12. 1.6 किमी (एक मील) चलना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_13:["13. 10 सीढ़ियाँ चढ़ना या उतरना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_14:["14. 1 घंटे खड़े रहना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_15:["15. 1 घंटे बैठना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_16:["16. समतल ज़मीन पर दौड़ना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_17:["17. असमान ज़मीन पर दौड़ना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_18:["18. तेज़ दौड़ते हुए तीखे मोड़ लेना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_19:["19. कूदना (हॉप)", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  lefs_20:["20. बिस्तर में करवट बदलना", "0 — अत्यधिक कठिनाई / नहीं कर सकते", "1 — काफी कठिनाई", "2 — मध्यम कठिनाई", "3 — थोड़ी कठिनाई", "4 — कोई कठिनाई नहीं"],
  fabqpa_1:["1. शारीरिक गतिविधि से मेरा दर्द बढ़ जाता है", "0 — पूरी तरह असहमत", "1", "2", "3", "4", "5", "6 — पूरी तरह सहमत"],
  fabqpa_2:["2. शारीरिक गतिविधि मेरी पीठ/शरीर को नुकसान पहुँचा सकती है", "0 — पूरी तरह असहमत", "1", "2", "3", "4", "5", "6 — पूरी तरह सहमत"],
  fabqpa_3:["3. मुझे ऐसी शारीरिक गतिविधियाँ नहीं करनी चाहिए जो दर्द बढ़ा सकती हैं", "0 — पूरी तरह असहमत", "1", "2", "3", "4", "5", "6 — पूरी तरह सहमत"],
  fabqpa_4:["4. मैं ऐसी शारीरिक गतिविधियाँ नहीं कर सकता जो दर्द बढ़ा सकती हैं", "0 — पूरी तरह असहमत", "1", "2", "3", "4", "5", "6 — पूरी तरह सहमत"],
  pcs_1:["1. मैं हर समय चिंता करता हूँ कि दर्द खत्म होगा या नहीं", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_2:["2. मुझे लगता है कि मैं और आगे नहीं बढ़ सकता", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_3:["3. यह भयानक है और मुझे लगता है कि यह कभी ठीक नहीं होगा", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_4:["4. यह बहुत बुरा है और मुझ पर हावी हो जाता है", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_5:["5. मुझे लगता है कि मैं इसे और बर्दाश्त नहीं कर सकता", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_6:["6. मुझे डर लगता है कि दर्द और बढ़ जाएगा", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_7:["7. मैं दूसरी दर्दनाक घटनाओं के बारे में सोचता रहता हूँ", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_8:["8. मैं बेचैनी से चाहता हूँ कि दर्द चला जाए", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_9:["9. मैं इसे दिमाग से निकाल नहीं पाता", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_10:["10. मैं सोचता रहता हूँ कि कितना दर्द हो रहा है", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_11:["11. मैं सोचता रहता हूँ कि मैं कितना चाहता हूँ कि दर्द रुक जाए", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_12:["12. दर्द कम करने के लिए मैं कुछ नहीं कर सकता", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  pcs_13:["13. मुझे लगता है कि कुछ गंभीर हो सकता है", "0 — बिल्कुल नहीं", "1 — थोड़ा", "2 — मध्यम रूप से", "3 — काफी हद तक", "4 — हर समय"],
  rmdq_1:["1. पीठ के कारण मैं ज्यादातर समय घर पर रहता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_2:["2. आराम पाने के लिए मैं बार-बार स्थिति बदलता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_3:["3. मैं सामान्य से धीमे चलता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_4:["4. घर के सामान्य काम नहीं कर रहा हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_5:["5. सीढ़ियाँ चढ़ने के लिए रेलिंग का सहारा लेता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_6:["6. आराम के लिए ज्यादा लेटता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_7:["7. कुर्सी से उठने के लिए सहारा लेना पड़ता है", "0 — नहीं", "1 — हाँ"],
  rmdq_8:["8. दूसरों से काम करवाने की कोशिश करता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_9:["9. सामान्य से धीमे कपड़े पहनता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_10:["10. थोड़ी देर ही खड़ा रह पाता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_11:["11. झुकने या घुटने टेकने से बचता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_12:["12. कुर्सी से उठना मुश्किल लगता है", "0 — नहीं", "1 — हाँ"],
  rmdq_13:["13. पीठ में लगभग हर समय दर्द रहता है", "0 — नहीं", "1 — हाँ"],
  rmdq_14:["14. बिस्तर में करवट बदलना मुश्किल है", "0 — नहीं", "1 — हाँ"],
  rmdq_15:["15. भूख कम लगती है", "0 — नहीं", "1 — हाँ"],
  rmdq_16:["16. मोज़े पहनने में परेशानी होती है", "0 — नहीं", "1 — हाँ"],
  rmdq_17:["17. कम दूरी ही चल पाता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_18:["18. पीठ के कारण नींद कम आती है", "0 — नहीं", "1 — हाँ"],
  rmdq_19:["19. किसी की मदद से कपड़े पहनता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_20:["20. दिन का ज्यादातर समय बैठा रहता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_21:["21. घर के भारी कामों से बचता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_22:["22. सामान्य से ज्यादा चिड़चिड़ा हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_23:["23. सीढ़ियाँ सामान्य से धीमे चढ़ता हूँ", "0 — नहीं", "1 — हाँ"],
  rmdq_24:["24. ज्यादातर समय बिस्तर पर रहता हूँ", "0 — नहीं", "1 — हाँ"],
});

// (Stroke/TBI scale additions -- NIHSS, Fugl-Meyer, Rancho, GOAT, Barthel -- moved to sharedClinicalData.js)

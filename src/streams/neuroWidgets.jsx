import React from "react";
import { CRANIAL_NERVES } from "../sharedClinicalData.js";

/* Rich neuro widgets embedded in the config-driven stream via the
   "component" field type. They read/write the SAME shared data keys as
   the existing NeurologicalModule (gcs_eye/verbal/motor, gcs_pupil_*,
   cn_<id>_status), so the new Neuro stream and the old neuro tab stay
   perfectly in sync. */

const GCS_PARTS = [
  { id:"gcs_eye", label:"E — Eye Opening", max:4, options:[
    ["4","4 — Spontaneous"],["3","3 — To speech"],["2","2 — To pain"],["1","1 — None"]] },
  { id:"gcs_verbal", label:"V — Verbal Response", max:5, options:[
    ["5","5 — Oriented"],["4","4 — Confused"],["3","3 — Words"],["2","2 — Sounds"],["1","1 — None / intubated"]] },
  { id:"gcs_motor", label:"M — Motor Response", max:6, options:[
    ["6","6 — Obeys commands"],["5","5 — Localises"],["4","4 — Withdrawal"],["3","3 — Abnormal flexion"],["2","2 — Extension"],["1","1 — None"]] },
];
const PUPILS = ["Not assessed","Equal & reactive (normal)","Dilated — unreactive (CN III / herniation)","Constricted — pinpoint (opiates / pons)","Midpoint non-reactive (midbrain)","Anisocoria"];

function sel(PC){return{width:"100%",borderRadius:8,border:`1px solid ${PC.border}`,background:PC.surface||"#fff",padding:"8px 10px",fontSize:"0.82rem",color:PC.text,outline:"none",boxSizing:"border-box"};}

export function GCSWidget({ data, set, PC }) {
  const e=parseInt(data.gcs_eye)||0, v=parseInt(data.gcs_verbal)||0, m=parseInt(data.gcs_motor)||0;
  const total=e+v+m, hasAll=e>0&&v>0&&m>0;
  const band = total<=8?{c:"#dc2626",t:"🔴 GCS ≤8 — airway/ICU alert · severe TBI protocol"}
    : total<=12?{c:"#d97706",t:"🟡 GCS 9–12 — moderate TBI · frequent reassessment"}
    : {c:"#059669",t:"✅ GCS 13–15 — mild / normal · monitor for deterioration"};
  return (
    <div style={{border:`1px solid ${PC.border}`,borderRadius:12,padding:14}}>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Glasgow Coma Scale</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        {GCS_PARTS.map(p=>(
          <label key={p.id} style={{display:"block"}}>
            <span style={{display:"block",fontSize:"0.72rem",fontWeight:600,color:PC.muted,marginBottom:5}}>{p.label}</span>
            <select value={data[p.id]||""} onChange={ev=>set(p.id,ev.target.value)} style={sel(PC)}>
              <option value="">—</option>
              {p.options.map(([val,lbl])=><option key={val} value={val}>{lbl}</option>)}
            </select>
          </label>))}
      </div>
      <div style={{marginTop:12,display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
        borderRadius:10,background:hasAll?band.c+"12":(PC.s2||"#f8fafc"),border:`1px solid ${hasAll?band.c+"55":PC.border}`}}>
        <span style={{fontWeight:800,fontSize:"1.4rem",color:hasAll?band.c:PC.muted}}>{hasAll?total:"—"}</span>
        <span style={{fontSize:"0.65rem",color:PC.muted}}>/ 15</span>
        <span style={{fontSize:"0.76rem",color:PC.text,lineHeight:1.4}}>{hasAll?band.t:"Score all three components (E + V + M)"}</span>
      </div>
      <div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
        {[["gcs_pupil_l","Left pupil"],["gcs_pupil_r","Right pupil"]].map(([id,lbl])=>(
          <label key={id} style={{display:"block"}}>
            <span style={{display:"block",fontSize:"0.72rem",fontWeight:600,color:PC.muted,marginBottom:5}}>{lbl}</span>
            <select value={data[id]||""} onChange={ev=>set(id,ev.target.value)} style={sel(PC)}>
              {PUPILS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </label>))}
      </div>
    </div>
  );
}

export function CranialWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Cranial Nerve Exam — I through XII</div>
      {CRANIAL_NERVES.map(cn=>{
        const key=`cn_${cn.id}_status`, val=data[key]||"";
        const flagged=/Impaired|UMN|LMN|Conductive|Sensorineural|Deviates|Weak/.test(val);
        return (
          <div key={cn.id} style={{background:PC.surface||"#fff",
            border:`1px solid ${flagged?"#dc2626":PC.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
              <div><span style={{fontWeight:800,fontSize:"0.78rem",color:PC.text}}>CN {cn.numeral}</span>
                <span style={{fontSize:"0.74rem",color:PC.muted,marginLeft:6}}>{cn.name}</span></div>
              <select value={val} onChange={e=>set(key,e.target.value)}
                style={{...sel(PC),width:"auto",minWidth:150,flexShrink:0,
                  borderColor:flagged?"#dc2626":PC.border,color:flagged?"#dc2626":PC.text}}>
                <option value="">Not tested</option>
                {cn.record.split(" / ").map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{fontSize:"0.68rem",color:PC.muted,lineHeight:1.5}}><strong>Test:</strong> {cn.test}</div>
          </div>);
      })}
    </div>
  );
}

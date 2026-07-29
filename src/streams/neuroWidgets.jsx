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

/* ── Reflexes: DTR + pathological UMN/LMN signs + clonus, with automatic
   UMN-pattern interpretation. Shares keys n_ref_<id>_left / _right. ── */
import { REFLEXES, COORDINATION_TESTS } from "../sharedClinicalData.js";

const DTR_OPTS = ["0 Absent","1+ Diminished","2+ Normal","3+ Brisk","4+ Clonus"];
const POSNEG = ["Negative","Positive"];
const GROUP_LABEL = { DTR:"Deep tendon reflexes", UMN:"Pathological / UMN signs", Clonus:"Clonus", LMN:"LMN signs & tone" };

function reflexOpts(r){
  if (r.group === "DTR") return DTR_OPTS;
  if (r.id === "n_ref_lmn_tone") return ["Normal — smooth low resistance","Spastic — clasp-knife (UMN)","Rigid — lead-pipe (extrapyramidal)","Cogwheel (Parkinson)","Flaccid — no resistance (LMN)"];
  if (r.group === "LMN") return ["Absent","Present"];
  return POSNEG; // UMN, Clonus
}

export function ReflexWidget({ data, set, PC }) {
  const groups = ["DTR","UMN","Clonus","LMN"];
  const umnFlag = REFLEXES.some(r => (r.umnSign) &&
    (String(data[`${r.id}_left`]||"").includes("Positive") || String(data[`${r.id}_right`]||"").includes("Positive")))
    || REFLEXES.some(r => r.group==="DTR" && [`${r.id}_left`,`${r.id}_right`].some(k=>String(data[k]||"").startsWith("4+")));
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Reflexes & pathological signs</div>
      {umnFlag && (
        <div style={{padding:"10px 12px",borderRadius:10,marginBottom:12,
          background:"#dc262614",border:"1px solid #dc262655",color:"#dc2626",fontSize:"0.78rem",fontWeight:600,lineHeight:1.5}}>
          ⚠️ Upper Motor Neuron pattern — pathological reflex(es) or hyperreflexia positive. Consider cord compression / myelopathy; correlate with clonus, Babinski, Hoffmann's. Urgent MRI if progressive.
        </div>)}
      {groups.map(g=>{
        const rows = REFLEXES.filter(r=>r.group===g);
        if (!rows.length) return null;
        return (
          <div key={g} style={{marginBottom:14}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>{GROUP_LABEL[g]}</div>
            {rows.map(r=>{
              const opts = reflexOpts(r);
              return (
                <div key={r.id} style={{background:PC.surface||"#fff",border:`1px solid ${PC.border}`,borderRadius:10,padding:"9px 11px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <div><span style={{fontWeight:700,fontSize:"0.78rem",color:PC.text}}>{r.label}</span>
                      <span style={{fontSize:"0.7rem",color:PC.muted,marginLeft:6}}>{r.level}</span></div>
                    <div style={{display:"flex",gap:6}}>
                      {["left","right"].map(side=>(
                        <select key={side} value={data[`${r.id}_${side}`]||""} onChange={e=>set(`${r.id}_${side}`,e.target.value)}
                          title={side==="left"?"Left":"Right"}
                          style={{...sel(PC),width:"auto",minWidth:110,padding:"6px 8px",fontSize:"0.76rem"}}>
                          <option value="">{side==="left"?"L —":"R —"}</option>
                          {opts.map(o=><option key={o} value={o}>{side==="left"?"L: ":"R: "}{o}</option>)}
                        </select>))}
                    </div>
                  </div>
                </div>);
            })}
          </div>);
      })}
    </div>
  );
}

/* ── Coordination: cerebellar non-equilibrium tests with teaching notes.
   Shares keys coord_<id>_L / _R. ── */
export function CoordinationWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Coordination (cerebellar)</div>
      {COORDINATION_TESTS.map(t=>(
        <div key={t.id} style={{background:PC.surface||"#fff",border:`1px solid ${PC.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:"0.8rem",color:PC.text,marginBottom:3}}>{t.label}</div>
          <div style={{fontSize:"0.7rem",color:PC.muted,lineHeight:1.5,marginBottom:8}}>{t.how}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
            {[["L","Left"],["R","Right"]].map(([sfx,lbl])=>(
              <label key={sfx} style={{display:"block"}}>
                <span style={{display:"block",fontSize:"0.68rem",fontWeight:600,color:PC.muted,marginBottom:4}}>{lbl}</span>
                <select value={data[`${t.id}_${sfx}`]||""} onChange={e=>set(`${t.id}_${sfx}`,e.target.value)} style={sel(PC)}>
                  <option value="">—</option>
                  {t.record.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </label>))}
          </div>
          <div style={{fontSize:"0.66rem",color:PC.muted,lineHeight:1.5,marginTop:7,fontStyle:"italic"}}>{t.note}</div>
        </div>))}
    </div>
  );
}

/* ── Sensory (dermatome map), Myotomes, Neural tension, Vestibular,
   Perceptual, and Red flags — all sharing the existing neuro data keys. ── */
import { DERMATOMES, MYOTOMES, NEURAL_TENSION, VESTIBULAR_TESTS, PERCEPTUAL_TESTS, RED_FLAGS_NEURO } from "../sharedClinicalData.js";

const SENSORY_OPTIONS = ["Normal","Reduced","Absent","Hyperaesthetic"];
const STRENGTH_OPTIONS = ["5/5 Normal","4/5 Good","3/5 Fair","2/5 Poor","1/5 Trace","0/5 Zero"];
const NTT_OPTIONS = ["Not tested","Negative","Positive — symptoms reproduced","Positive — confirmed neural (sensitisation)","Equivocal"];
const myoSlug = (level) => "myo_"+level.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase();

function LRRow({ baseKey, options, data, set, PC }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {[["_left","Left"],["_right","Right"]].map(([sfx,lbl])=>(
        <label key={sfx} style={{display:"block"}}>
          <span style={{display:"block",fontSize:"0.62rem",fontWeight:700,color:PC.muted,marginBottom:3}}>{lbl}</span>
          <select value={data[baseKey+sfx]||""} onChange={e=>set(baseKey+sfx,e.target.value)} style={sel(PC)}>
            <option value="">—</option>
            {options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </label>))}
    </div>
  );
}

export function SensoryWidget({ data, set, PC }) {
  const rowsFor = (pred) => DERMATOMES.filter(pred);
  const block = (title, list) => (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:"0.7rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>{title}</div>
      {list.map(d=>{
        const cauda = d.level==="S4/5";
        return (
          <div key={d.id} style={{background:PC.surface||"#fff",border:`1px solid ${cauda?"#dc262655":PC.border}`,borderRadius:10,padding:"9px 11px",marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:800,fontSize:"0.82rem",color:PC.accent}}>{d.level}</span>
              <span style={{fontSize:"0.74rem",color:PC.text}}>{d.region}</span>
              {cauda && <span style={{fontSize:"0.6rem",fontWeight:700,padding:"1px 7px",borderRadius:8,background:"#dc262622",color:"#dc2626"}}>CAUDA EQUINA</span>}
              <span style={{marginLeft:"auto",fontSize:"0.64rem",color:PC.muted}}>disc {d.disc}{d.reflex?` · reflex ${d.reflex}`:""}</span>
            </div>
            <LRRow baseKey={d.id} options={SENSORY_OPTIONS} data={data} set={set} PC={PC}/>
          </div>);
      })}
    </div>
  );
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Sensory — dermatome mapping (light touch / pin-prick)</div>
      {block("Cervical levels", rowsFor(d=>d.level.startsWith("C")))}
      {block("Thoracic / lumbar / sacral levels", rowsFor(d=>/^(T|L|S)/.test(d.level)))}
    </div>
  );
}

export function MyotomeWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Myotomes — segmental strength</div>
      {MYOTOMES.map(m=>{
        const id = myoSlug(m.level);
        return (
          <div key={m.level} style={{background:PC.surface||"#fff",border:`1px solid ${PC.border}`,borderRadius:10,padding:"9px 11px",marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:800,fontSize:"0.82rem",color:PC.text}}>{m.level}</span>
              <span style={{fontSize:"0.74rem",color:PC.text}}>{m.action}</span>
              <span style={{marginLeft:"auto",fontSize:"0.64rem",color:PC.muted}}>{m.test}</span>
            </div>
            <LRRow baseKey={id} options={STRENGTH_OPTIONS} data={data} set={set} PC={PC}/>
          </div>);
      })}
    </div>
  );
}

export function NeuralTensionWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Neural tension / neurodynamic tests</div>
      {NEURAL_TENSION.map(nt=>(
        <div key={nt.id} style={{background:PC.surface||"#fff",border:`1px solid ${PC.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:"0.8rem",color:PC.text}}>{nt.label}</div>
          <div style={{fontSize:"0.66rem",color:PC.muted,marginBottom:6}}>{nt.nerve} · Sn {nt.sensitivity} / Sp {nt.specificity}</div>
          <div style={{fontSize:"0.68rem",color:PC.muted,lineHeight:1.5,marginBottom:8}}>{nt.procedure}</div>
          <LRRow baseKey={nt.id} options={NTT_OPTIONS} data={data} set={set} PC={PC}/>
        </div>))}
    </div>
  );
}

export function VestibularWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Vestibular / oculomotor screen</div>
      {VESTIBULAR_TESTS.map(t=>{
        const id=`vest_${t.id}_result`, val=data[id]||"";
        const flagged=/Positive|Abnormal|central|drop/i.test(val)&&!/Negative|Normal/i.test(val);
        return (
          <div key={t.id} style={{background:PC.surface||"#fff",border:`1px solid ${flagged?"#dc2626":PC.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:"0.8rem",color:PC.text}}>{t.label}</div>
            <div style={{fontSize:"0.65rem",color:PC.muted,marginBottom:4}}>{t.purpose}</div>
            <div style={{fontSize:"0.68rem",color:PC.muted,lineHeight:1.5,marginBottom:8}}>{t.how}</div>
            <select value={val} onChange={e=>set(id,e.target.value)} style={{...sel(PC),borderColor:flagged?"#dc2626":PC.border,color:flagged?"#dc2626":PC.text}}>
              <option value="">Not tested</option>
              {t.record.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <div style={{fontSize:"0.64rem",color:PC.muted,lineHeight:1.5,marginTop:7,fontStyle:"italic"}}>{t.note}</div>
          </div>);
      })}
    </div>
  );
}

export function PerceptualWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Perceptual / cognitive-perceptual screen</div>
      {PERCEPTUAL_TESTS.map(t=>{
        const id=`perc_${t.id}_result`, val=data[id]||"";
        const flagged=/neglect|Ideomotor|Ideational|Impaired/i.test(val)&&!/No neglect|Absent|Intact/i.test(val);
        return (
          <div key={t.id} style={{background:PC.surface||"#fff",border:`1px solid ${flagged?"#dc2626":PC.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:"0.8rem",color:PC.text,marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:"0.68rem",color:PC.muted,lineHeight:1.5,marginBottom:8}}>{t.how}</div>
            <select value={val} onChange={e=>set(id,e.target.value)} style={{...sel(PC),borderColor:flagged?"#dc2626":PC.border,color:flagged?"#dc2626":PC.text}}>
              <option value="">Not tested</option>
              {t.record.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <div style={{fontSize:"0.64rem",color:PC.muted,lineHeight:1.5,marginTop:7,fontStyle:"italic"}}>{t.note}</div>
          </div>);
      })}
    </div>
  );
}

const NQ = [
  {id:"nq_bladder",label:"New onset bladder dysfunction (retention or incontinence)?"},
  {id:"nq_bowel",label:"New onset bowel dysfunction?"},
  {id:"nq_saddle",label:"Perineal / saddle area numbness or tingling?"},
  {id:"nq_bilateral_legs",label:"Bilateral leg weakness or paraesthesia?"},
  {id:"nq_gait_change",label:"Recent unexplained change in gait / balance?"},
  {id:"nq_diplopia",label:"Double vision, dysphagia, or dysarthria?"},
];

export function RedFlagsWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Neurological red-flag screen</div>
      {RED_FLAGS_NEURO.map(rf=>{
        const val=data[rf.id]||"", active=val==="Present", emerg=rf.severity==="EMERGENCY";
        const c = emerg?"#dc2626":"#d97706";
        return (
          <div key={rf.id} style={{background:active?c+"14":(PC.surface||"#fff"),border:`1.5px solid ${active?c:PC.border}`,borderRadius:10,padding:"11px 13px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                  <span>{rf.icon}</span>
                  <span style={{fontWeight:800,fontSize:"0.82rem",color:active?c:PC.text}}>{rf.label}</span>
                  <span style={{fontSize:"0.58rem",fontWeight:700,padding:"1px 7px",borderRadius:8,background:c+"22",color:c}}>{rf.severity}</span>
                </div>
                <div style={{fontSize:"0.72rem",color:PC.muted,lineHeight:1.5,marginBottom:active?6:0}}>{rf.description}</div>
                {active && <div style={{padding:"6px 10px",borderRadius:6,background:c+"18",fontSize:"0.72rem",color:c,fontWeight:600}}>→ {rf.action}</div>}
              </div>
              <select value={val} onChange={e=>set(rf.id,e.target.value)}
                style={{...sel(PC),width:"auto",minWidth:110,flexShrink:0,borderColor:active?c:PC.border}}>
                <option value="">— screen —</option>
                <option value="Cleared">✓ Cleared</option>
                <option value="Present">🔴 Present</option>
                <option value="Uncertain">⚠ Uncertain</option>
              </select>
            </div>
          </div>);
      })}
      <div style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",margin:"12px 0 8px"}}>Additional screening questions</div>
      {NQ.map(q=>{
        const val=data[q.id]||"", alarm=val==="Yes";
        return (
          <div key={q.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"9px 12px",
            background:alarm?"#dc262614":(PC.s2||"#f8fafc"),border:`1px solid ${alarm?"#dc2626":PC.border}`,borderRadius:8,marginBottom:6}}>
            <span style={{fontSize:"0.76rem",color:alarm?"#dc2626":PC.text,fontWeight:alarm?600:400,lineHeight:1.4,flex:1}}>{alarm&&"🔴 "}{q.label}</span>
            <select value={val} onChange={e=>set(q.id,e.target.value)} style={{...sel(PC),width:"auto",minWidth:90,flexShrink:0,borderColor:alarm?"#dc2626":PC.border}}>
              <option value="">—</option><option value="No">No</option><option value="Yes">Yes</option>
            </select>
          </div>);
      })}
    </div>
  );
}

/* ── Region/side sensory grid — for CENTRAL (stroke/TBI) lesions where loss
   is hemisensory by region, not dermatomal. Shares keys sregion_<reg>_<mode>. ── */
export const SREGIONS = ["Face","Left UE","Right UE","Trunk","Left LE","Right LE"];
export const SMODES = ["Light touch","Pinprick","Proprioception","Vibration","Stereognosis"];
export const SGRADES = ["Intact","Reduced","Absent","Untested"];
export const sregSlug = (s) => s.replace(/[^a-zA-Z0-9]/g,"_");

export function SensoryRegionWidget({ data, set, PC }) {
  return (
    <div>
      <div style={{fontWeight:800,fontSize:"0.85rem",color:PC.text,marginBottom:10}}>Sensation by region / side (central lesions)</div>
      <div style={{overflowX:"auto",border:`1px solid ${PC.border}`,borderRadius:10}}>
        <table style={{minWidth:"100%",borderCollapse:"collapse",fontSize:"0.8rem"}}>
          <thead><tr style={{background:PC.s2||"#f8fafc"}}>
            <th style={{padding:"8px 10px",textAlign:"left",color:PC.muted,fontWeight:600}}>Region</th>
            {SMODES.map(m=><th key={m} style={{padding:"8px 8px",textAlign:"left",color:PC.muted,fontWeight:600,whiteSpace:"nowrap"}}>{m}</th>)}
          </tr></thead>
          <tbody>
            {SREGIONS.map((rg,i)=>(
              <tr key={rg} style={{background:i%2?(PC.surface||"#fff"):(PC.s2||"#f8fafc")+"66"}}>
                <td style={{padding:"6px 10px",fontWeight:600,color:PC.text,whiteSpace:"nowrap"}}>{rg}</td>
                {SMODES.map(md=>{
                  const k=`sregion_${sregSlug(rg)}_${sregSlug(md)}`;
                  return (<td key={md} style={{padding:"5px 6px"}}>
                    <select value={data[k]||""} onChange={e=>set(k,e.target.value)} style={{...sel(PC),padding:"5px 6px",minWidth:96}}>
                      <option value="">—</option>
                      {SGRADES.map(o=><option key={o} value={o}>{o}</option>)}
                    </select></td>);
                })}
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

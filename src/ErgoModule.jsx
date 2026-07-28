// ErgoModule.jsx — Ergonomic & Workstation Assessment Module
// Extracted verbatim from SubjectiveObjective.jsx (mechanical split, no logic changes)
import React, { useState } from "react";
import { C } from "./utils.jsx";

// ═══════════════════════════════════════════════════════════════════════════════
// ERGONOMIC & WORKSTATION ASSESSMENT MODULE
// ═══════════════════════════════════════════════════════════════════════════════

const ERGO_RISK_CFG = {
  ergo_monitor_height: { w:3, domain:"cervical", bad: v => v==="Too high — head tilted back"||v==="Too low — forward head flexion" },
  ergo_monitor_dist:   { w:2, domain:"cervical", bad: v => v==="Too close (<50cm)"||v==="Too far (>80cm)" },
  ergo_monitor_glare:  { w:1, domain:"cervical", bad: v => v==="Present" },
  ergo_head_angle:     { w:3, domain:"cervical", bad: v => parseInt(v||"0")>15 },
  ergo_neck_rotation:  { w:2, domain:"cervical", bad: v => v==="Yes — sustained (>25% of work time)" },
  ergo_chair_height:   { w:3, domain:"lumbar",   bad: v => v==="Too low — knees above hips"||v==="Too high — feet unsupported" },
  ergo_lumbar_support: { w:3, domain:"lumbar",   bad: v => v==="Absent"||v==="Inadequate — too low/high" },
  ergo_seat_depth:     { w:2, domain:"lumbar",   bad: v => v==="Too deep — edge pressure on popliteal"||v==="Too shallow — poor thigh support" },
  ergo_foot_support:   { w:2, domain:"lumbar",   bad: v => v==="Feet unsupported"||v==="Crossed legs habitually" },
  ergo_pelvic_tilt:    { w:2, domain:"ucs",      bad: v => v==="Posterior tilt (slouch) — flattens lumbar"||v==="Anterior tilt — increased lumbar load" },
  ergo_keyboard_pos:   { w:2, domain:"rsi",      bad: v => v==="Too high — shoulder elevation"||v==="Too far — trunk lean forward" },
  ergo_wrist_dev:      { w:3, domain:"rsi",      bad: v => v==="Ulnar deviation"||v==="Wrist extension"||v==="Combined extension + deviation" },
  ergo_mouse_pos:      { w:2, domain:"nerve",    bad: v => v==="Too far right/left — shoulder abduction"||v==="Elevated — shoulder shrug" },
  ergo_elbow_angle:    { w:2, domain:"rsi",      bad: v => v!=="90–100° (ideal)"&&v!=="" },
  ergo_shoulder_pos:   { w:3, domain:"ucs",      bad: v => v==="Elevated/shrugged"||v==="Protracted (rounded forward)"||v==="Elevated AND protracted" },
  ergo_sitting_hrs:    { w:3, domain:"lumbar",   bad: v => parseFloat(v||"0")>=7 },
  ergo_break_freq:     { w:2, domain:"lumbar",   bad: v => v==="Rarely (>60 min)"||v==="Never — works through" },
  ergo_rep_task:       { w:2, domain:"rsi",      bad: v => v==="High (>4h/day)"||v==="Highly repetitive (data entry / assembly)" },
  ergo_static_posture: { w:2, domain:"ucs",      bad: v => v==="Yes — >20 min sustained"||v==="Continuous static (microscopy, lab work)" },
  ergo_asymm_load:     { w:2, domain:"nerve",    bad: v => v==="Yes — sustained dominant side"||v==="Significant asymmetry" },
};

const ERGO_DOMAIN_LABELS = { cervical:"Cervical Strain", lumbar:"Lumbar Overload", ucs:"UCS Pattern", rsi:"RSI Risk", nerve:"Nerve Compression" };

function computeErgoRisks(data) {
  const ds={cervical:0,lumbar:0,ucs:0,rsi:0,nerve:0};
  const dm={cervical:0,lumbar:0,ucs:0,rsi:0,nerve:0};
  const faults=[];
  Object.entries(ERGO_RISK_CFG).forEach(([id,cfg])=>{
    dm[cfg.domain]=(dm[cfg.domain]||0)+cfg.w;
    const val=data[id]||"";
    if(val&&cfg.bad(val)){ ds[cfg.domain]=(ds[cfg.domain]||0)+cfg.w; faults.push(id); }
  });
  const rl=d=>{ const p=dm[d]>0?ds[d]/dm[d]:0; return p>=0.6?"High":p>=0.3?"Moderate":"Low"; };
  const total=Object.values(ds).reduce((a,b)=>a+b,0);
  const maxTotal=Object.values(dm).reduce((a,b)=>a+b,0);
  const op=maxTotal>0?total/maxTotal:0;
  return { ds, dm, faults, total, maxTotal, overall:op>=0.55?"High":op>=0.3?"Moderate":"Low",
    cervical:rl("cervical"), lumbar:rl("lumbar"), ucs:rl("ucs"), rsi:rl("rsi"), nerve:rl("nerve") };
}

function EF({ id, label, type, options, unit, min=0, max=10, step=1, placeholder="", data, set, note }) {
  const base={width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const val=data[id]||"";
  const filled=val!=="";
  return (
    <div style={{background:C.surface,border:`1px solid ${filled?C.accent+"25":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:6}}>
        <label style={{fontSize:"0.78rem",fontWeight:600,color:filled?C.text:C.muted,lineHeight:1.4,flex:1}}>
          {label}{filled&&<span style={{color:C.green,marginLeft:5,fontSize:"0.8rem"}}>✓</span>}
        </label>
        {unit&&<span style={{fontSize:"0.82rem",color:C.muted,flexShrink:0}}>{unit}</span>}
      </div>
      {note&&<div style={{fontSize:"0.78rem",color:C.muted,marginBottom:6,lineHeight:1.4,fontStyle:"italic"}}>{note}</div>}
      {type==="select"&&<select value={val} onChange={e=>set(id,e.target.value)} style={base}><option value="">— select —</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>}
      {type==="range"&&<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:"0.78rem",color:C.muted}}>{min}{unit||""}</span><span style={{fontSize:"0.82rem",fontWeight:700,color:C.accent}}>{val||min}{unit||""}</span><span style={{fontSize:"0.78rem",color:C.muted}}>{max}{unit||""}</span></div><input type="range" min={min} max={max} step={step} value={val||min} onChange={e=>set(id,e.target.value)} style={{width:"100%",accentColor:C.accent,cursor:"pointer"}}/></div>}
      {type==="num"&&<input type="number" value={val} onChange={e=>set(id,e.target.value)} placeholder={placeholder} min={min} max={max} style={base}/>}
      {type==="textarea"&&<textarea value={val} onChange={e=>set(id,e.target.value)} placeholder={placeholder} rows={3} style={{...base,resize:"vertical",display:"block"}}/>}
    </div>
  );
}

function ErgoBadge({ level, label, score, max }) {
  const col=level==="High"?C.red:level==="Moderate"?C.yellow:C.green;
  const pct=max>0?Math.round(score/max*100):0;
  return (
    <div style={{background:C.s2,border:`1px solid ${col}40`,borderRadius:10,padding:"10px 12px",flex:1,minWidth:110}}>
      <div style={{fontSize:"0.78rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:C.muted,marginBottom:4}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontWeight:800,fontSize:"0.95rem",color:col}}>{level}</span>
        <span style={{fontSize:"0.82rem",color:C.muted}}>{score}/{max}</span>
      </div>
      <div style={{height:4,background:C.s3,borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:2,transition:"width 0.4s"}}/></div>
    </div>
  );
}

const ERGO_FAULT_MSGS = {
  ergo_monitor_height:"Monitor height causes sustained head tilt → cervical joint compression",
  ergo_monitor_dist:"Non-optimal distance forces compensatory head position",
  ergo_monitor_glare:"Glare forces repeated head repositioning",
  ergo_head_angle:"Forward head posture significantly increases cervical loading",
  ergo_neck_rotation:"Sustained rotation → unilateral facet loading + IVD asymmetry",
  ergo_chair_height:"Chair height alters hip/knee/lumbar chain mechanics",
  ergo_lumbar_support:"Absent support → posterior pelvic tilt → disc compression",
  ergo_seat_depth:"Seat depth fault → hamstring tightness or popliteal pressure",
  ergo_foot_support:"Unsupported feet → thigh compression + lumbar strain",
  ergo_pelvic_tilt:"Pelvic malalignment reinforces LCS/UCS muscle imbalance patterns",
  ergo_keyboard_pos:"Keyboard position drives shoulder elevation and wrist deviation",
  ergo_wrist_dev:"Wrist deviation compresses carpal tunnel and stresses tendons",
  ergo_mouse_pos:"Mouse position creates asymmetric shoulder and neck loading",
  ergo_elbow_angle:"Non-ideal angle increases ulnar nerve tension at cubital tunnel",
  ergo_shoulder_pos:"Shoulder fault drives UCS pattern — pec minor / upper trap overload",
  ergo_sitting_hrs:"Prolonged sitting → gluteal inhibition + IVD nutritional deficit",
  ergo_break_freq:"Infrequent breaks → sustained IVD compression without recovery",
  ergo_rep_task:"High repetitive exposure → cumulative tendon and nerve stress",
  ergo_static_posture:"Sustained static load → muscle fatigue → compensation cascade",
  ergo_asymm_load:"Asymmetric loading → spinal rotation tendency + SI dysfunction",
};

function ErgoModule({ data, set }) {
  const [tab, setTab] = useState("workstation");
  const [open, setOpen] = useState({ws_chair:true,ws_monitor:true,ws_input:true,ws_env:false,ps_head:true,ps_shoulder:true,ps_lumbar:true,ps_ul:true,bh_sit:true,bh_brk:true,bh_task:true,bh_psy:false});
  const risks = computeErgoRisks(data);

  // Persist computed scores for diagnosis engine
  const storedScore = data.ergo_total_score;
  if(String(risks.total)!==storedScore){
    setTimeout(()=>{
      set("ergo_total_score",String(risks.total));
      set("ergo_cervical_risk",risks.cervical);
      set("ergo_lumbar_risk",risks.lumbar);
      set("ergo_ucs_risk",risks.ucs);
      set("ergo_rsi_risk",risks.rsi);
      set("ergo_nerve_risk",risks.nerve);
    },0);
  }

  const overallCol = risks.overall==="High"?C.red:risks.overall==="Moderate"?C.yellow:C.green;
  const tabs = [{key:"workstation",label:"Workstation",icon:"🪑"},{key:"posture",label:"Posture",icon:"🧍"},{key:"behaviour",label:"Behaviour",icon:"⏱️"},{key:"risks",label:"Risk Engine",icon:"📊"},{key:"plan",label:"Action Plan",icon:"📋"}];
  const tb = k=>({padding:"7px 12px",borderRadius:20,cursor:"pointer",fontSize:"0.82rem",fontWeight:tab===k?700:400,border:`1px solid ${tab===k?C.accent:C.border}`,background:tab===k?"rgba(0,229,255,0.1)":"transparent",color:tab===k?C.accent:C.muted,whiteSpace:"nowrap",transition:"all 0.15s"});

  const SH = ({id,label,children})=>{
    const isOpen=open[id]!==false;
    return (
      <div style={{marginBottom:14}}>
        <button type="button" onClick={()=>setOpen(p=>({...p,[id]:!isOpen}))} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"transparent",border:"none",cursor:"pointer",padding:"6px 0",marginBottom:isOpen?8:0}}>
          <div style={{fontSize:"0.73rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>{label}</div>
          <span style={{color:C.muted,fontSize:"0.82rem"}}>{isOpen?"▲":"▼"}</span>
        </button>
        {isOpen&&children}
      </div>
    );
  };

  const FW = ({id})=>{
    const cfg=ERGO_RISK_CFG[id]; if(!cfg) return null;
    const val=data[id]||"";
    if(!val||!cfg.bad(val)) return null;
    return <div style={{display:"flex",gap:6,padding:"5px 10px",background:"rgba(255,179,0,0.08)",border:`1px solid ${C.yellow}30`,borderRadius:7,marginBottom:4,fontSize:"0.8rem",color:C.yellow}}><span style={{flexShrink:0}}>⚠</span><span>{ERGO_FAULT_MSGS[id]||"Ergonomic fault identified"}</span></div>;
  };

  const WorkstationTab = ()=>(
    <div>
      <SH id="ws_chair" label="Chair Ergonomics">
        <EF id="ergo_chair_height" label="Chair seat height" type="select" data={data} set={set} options={["Ideal — thighs parallel, feet flat","Too low — knees above hips","Too high — feet unsupported"]} note="Ideal: 90° hip & knee, feet flat on floor or footrest"/>
        <FW id="ergo_chair_height"/>
        <EF id="ergo_lumbar_support" label="Lumbar support" type="select" data={data} set={set} options={["Adequate — maintains lordosis","Inadequate — too low/high","Absent"]} note="Should sit at L2–L5 to maintain natural lordosis"/>
        <FW id="ergo_lumbar_support"/>
        <EF id="ergo_seat_depth" label="Seat pan depth" type="select" data={data} set={set} options={["Ideal — 2–4 finger gap behind knee","Too deep — edge pressure on popliteal","Too shallow — poor thigh support"]}/>
        <FW id="ergo_seat_depth"/>
        <EF id="ergo_armrest" label="Armrests" type="select" data={data} set={set} options={["Ideal — elbows 90°, no shoulder elevation","Too high — shoulder shrug","Too low — lateral lean","Absent"]}/>
        <EF id="ergo_foot_support" label="Foot / leg support" type="select" data={data} set={set} options={["Feet flat on floor (ideal)","Feet unsupported","Footrest in use","Crossed legs habitually"]}/>
        <FW id="ergo_foot_support"/>
      </SH>
      <SH id="ws_monitor" label="Monitor Setup">
        <EF id="ergo_monitor_height" label="Monitor top edge" type="select" data={data} set={set} options={["At or slightly below eye level (ideal)","Too high — head tilted back","Too low — forward head flexion"]} note="Top of monitor should align with eye level ±5cm"/>
        <FW id="ergo_monitor_height"/>
        <EF id="ergo_monitor_dist" label="Viewing distance" type="select" data={data} set={set} options={["50–70cm (ideal)","Too close (<50cm)","Too far (>80cm)"]}/>
        <FW id="ergo_monitor_dist"/>
        <EF id="ergo_monitor_glare" label="Screen glare / reflections" type="select" data={data} set={set} options={["None","Present","Managed with screen filter"]}/>
        <FW id="ergo_monitor_glare"/>
        <EF id="ergo_dual_monitor" label="Dual monitor setup" type="select" data={data} set={set} options={["N/A — single monitor","Centred equally (ideal)","One dominant — sustained neck rotation","Stacked — sustained vertical gaze"]}/>
        <EF id="ergo_neck_rotation" label="Sustained neck rotation to screen" type="select" data={data} set={set} options={["No — screen directly ahead","Yes — occasional (<25%)","Yes — sustained (>25% of work time)"]}/>
        <FW id="ergo_neck_rotation"/>
      </SH>
      <SH id="ws_input" label="Keyboard, Mouse & Input">
        <EF id="ergo_keyboard_pos" label="Keyboard position" type="select" data={data} set={set} options={["Ideal — elbows ~90°, forearms neutral","Too high — shoulder elevation","Too far — trunk lean forward","Too close — restricted elbow angle"]}/>
        <FW id="ergo_keyboard_pos"/>
        <EF id="ergo_elbow_angle" label="Elbow angle at keyboard" type="select" data={data} set={set} options={["90–100° (ideal)","<80° (too acute)","110–120° (moderate extension)","Full extension (>120°)"]}/>
        <FW id="ergo_elbow_angle"/>
        <EF id="ergo_wrist_dev" label="Wrist posture at keyboard" type="select" data={data} set={set} options={["Neutral — straight wrist (ideal)","Wrist extension","Ulnar deviation","Radial deviation","Combined extension + deviation"]} note="Neutral wrist = inline with forearm in all planes"/>
        <FW id="ergo_wrist_dev"/>
        <EF id="ergo_mouse_pos" label="Mouse position" type="select" data={data} set={set} options={["In-line with shoulder (ideal)","Too far right/left — shoulder abduction","Elevated — shoulder shrug","Too far forward — shoulder protraction"]}/>
        <FW id="ergo_mouse_pos"/>
        <EF id="ergo_mouse_grip" label="Mouse grip style" type="select" data={data} set={set} options={["Palm grip — neutral (ideal)","Fingertip / claw grip — intrinsic overload","Wrist anchored — restricted forearm rotation"]}/>
      </SH>
      <SH id="ws_env" label="Environment & Setup">
        <EF id="ergo_lighting" label="Ambient lighting" type="select" data={data} set={set} options={["Adequate, no glare (ideal)","Overhead glare on screen","Bright window behind screen","Insufficient — eye strain"]}/>
        <EF id="ergo_desk_height" label="Desk height" type="select" data={data} set={set} options={["Adjustable / sit-stand (ideal)","Fixed — appropriate height","Fixed — too high","Fixed — too low"]}/>
        <EF id="ergo_sitstand" label="Sit-stand desk usage" type="select" data={data} set={set} options={["N/A","Used appropriately (sit:stand ~60:40)","Available but rarely used","Stand-only — equally problematic"]}/>
        <EF id="ergo_phone_use" label="Phone / headset" type="select" data={data} set={set} options={["Headset used (ideal)","Cradle between ear and shoulder","Speaker phone","Minimal phone use"]}/>
        <EF id="ergo_doc_position" label="Document / reference position" type="select" data={data} set={set} options={["Document holder at screen level (ideal)","Flat on desk — sustained neck flexion","To the side — sustained rotation","Minimal document use"]}/>
        <EF id="ergo_workspace_notes" label="Additional workstation notes" type="textarea" data={data} set={set} placeholder="e.g. Multiple screens, unusual setup, relevant environmental factors..."/>
      </SH>
    </div>
  );

  const PostureTab = ()=>(
    <div>
      <div style={{background:C.s2,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:"0.75rem",color:C.muted,lineHeight:1.6}}>
        <strong style={{color:C.accent}}>Observe</strong> the patient at their workstation or recreate seated posture. Record what is present, not ideal.
      </div>
      <SH id="ps_head" label="Head & Cervical">
        <EF id="ergo_head_angle" label="Forward head angle" type="range" min={0} max={40} step={5} unit="°" data={data} set={set} note="0° = ear over shoulder (ideal). >15° = clinically significant. 30° = ~18kg effective cervical load."/>
        <FW id="ergo_head_angle"/>
        <EF id="ergo_chin_poke" label="Chin poke / protrusion" type="select" data={data} set={set} options={["Absent","Mild — occasional","Moderate — habitual","Severe — constant"]}/>
        <EF id="ergo_head_tilt_lat" label="Lateral head tilt at workstation" type="select" data={data} set={set} options={["None (neutral)","Left tilt — mild","Right tilt — mild","Significant left tilt","Significant right tilt"]}/>
        <EF id="ergo_neck_ext_pattern" label="Neck extension on upward gaze" type="select" data={data} set={set} options={["Not present","Mild extension when looking up","Sustained upper cervical extension"]}/>
      </SH>
      <SH id="ps_shoulder" label="Shoulder & Upper Quarter">
        <EF id="ergo_shoulder_pos" label="Shoulder position" type="select" data={data} set={set} options={["Neutral — relaxed, level (ideal)","Elevated/shrugged","Protracted (rounded forward)","Elevated AND protracted","Asymmetric elevation"]}/>
        <FW id="ergo_shoulder_pos"/>
        <EF id="ergo_scap_pos" label="Scapular position" type="select" data={data} set={set} options={["Neutral flat against thorax","Winging — serratus deficit","Elevated — upper trap dominant","Tipped forward — pec minor tight"]}/>
        <EF id="ergo_thoracic_kyphosis" label="Thoracic kyphosis tendency" type="select" data={data} set={set} options={["Normal — mild thoracic curve","Increased — moderate kyphosis","Increased — significant kyphosis","Flat thoracic — reduced mobility"]}/>
        <EF id="ergo_shoulder_abd" label="Shoulder abduction angle at mouse" type="range" min={0} max={45} step={5} unit="°" data={data} set={set} note="Ideal <15°. >25° = sustained rotator cuff load."/>
      </SH>
      <SH id="ps_lumbar" label="Lumbar & Pelvis">
        <EF id="ergo_pelvic_tilt" label="Pelvic position in sitting" type="select" data={data} set={set} options={["Neutral — slight anterior tilt (ideal)","Posterior tilt (slouch) — flattens lumbar","Anterior tilt — increased lumbar load","Laterally tilted"]}/>
        <FW id="ergo_pelvic_tilt"/>
        <EF id="ergo_lumbar_posture" label="Lumbar lordosis maintained?" type="select" data={data} set={set} options={["Yes — maintained throughout","Maintained early, lost with fatigue","Absent — seated flat back","Hyperlordotic in sitting"]}/>
        <EF id="ergo_hip_angle" label="Hip angle in seated position" type="select" data={data} set={set} options={["90–100° (ideal)","<90° — hip flexor shortened","110°+ — posterior pelvic tilt risk","Asymmetric hip position"]}/>
        <EF id="ergo_sitting_posture_note" label="General seated posture notes" type="textarea" data={data} set={set} placeholder="Describe overall posture, habitual patterns, compensation observed..."/>
      </SH>
      <SH id="ps_ul" label="Upper Limb & Wrist">
        <EF id="ergo_wrist_ext_angle" label="Wrist extension at rest" type="range" min={0} max={40} step={5} unit="°" data={data} set={set} note="Ideal: 0–10°. >15° = carpal tunnel risk."/>
        <EF id="ergo_forearm_pronation" label="Forearm rotation at keyboard" type="select" data={data} set={set} options={["Neutral pronation (ideal)","Full pronation — medial epicondyle load","Supinated — unusual","Asymmetric"]}/>
        <EF id="ergo_asymm_load" label="Asymmetric upper limb loading" type="select" data={data} set={set} options={["None — bilateral equal use","Yes — occasional","Yes — sustained dominant side","Significant asymmetry"]}/>
        <FW id="ergo_asymm_load"/>
        <EF id="ergo_thumb_use" label="Thumb posture (trackpad/mouse)" type="select" data={data} set={set} options={["Neutral","Sustained opposition — CMC stress","Abducted grip — de Quervain's risk"]}/>
      </SH>
    </div>
  );

  const BehaviourTab = ()=>(
    <div>
      <SH id="bh_sit" label="Sitting & Work Duration">
        <EF id="ergo_sitting_hrs" label="Total seated hours/day" type="range" min={0} max={12} step={0.5} unit="h" data={data} set={set} note="7+ hours = high lumbar IVD load and gluteal inhibition risk"/>
        <FW id="ergo_sitting_hrs"/>
        <EF id="ergo_longest_sit" label="Longest unbroken sit" type="select" data={data} set={set} options={["<20 min (excellent)","20–40 min (good)","40–60 min (moderate risk)","60–90 min (high risk)","90+ min (very high risk)"]}/>
        <EF id="ergo_work_hrs_total" label="Total work hours/day" type="range" min={4} max={16} step={1} unit="h" data={data} set={set}/>
        <EF id="ergo_work_pattern" label="Work schedule pattern" type="select" data={data} set={set} options={["Standard hours (8–5)","Shift work","Night shifts","Split shifts","Variable / irregular"]}/>
      </SH>
      <SH id="bh_brk" label="Movement & Microbreak Behaviour">
        <EF id="ergo_break_freq" label="Microbreak frequency" type="select" data={data} set={set} options={["Every 20–30 min (ideal)","Every 45–60 min (acceptable)","Rarely (>60 min)","Never — works through","Uses break software/timer"]}/>
        <FW id="ergo_break_freq"/>
        <EF id="ergo_break_type" label="Break activity" type="select" data={data} set={set} options={["Walking + movement (ideal)","Standing only","Seated rest","Different screen (phone)","No intentional break"]}/>
        <EF id="ergo_posture_awareness" label="Posture self-awareness" type="select" data={data} set={set} options={["High — self-corrects regularly","Moderate — corrects when reminded","Low — rarely considers posture","None — unaware of posture issues"]}/>
      </SH>
      <SH id="bh_task" label="Task & Repetition Analysis">
        <EF id="ergo_rep_task" label="Repetitive task exposure" type="select" data={data} set={set} options={["Low (<2h/day repetitive)","Moderate (2–4h/day)","High (>4h/day)","Highly repetitive (data entry / assembly)"]}/>
        <FW id="ergo_rep_task"/>
        <EF id="ergo_static_posture" label="Sustained static posture" type="select" data={data} set={set} options={["No — frequent movement","Yes — occasional (<20 min)","Yes — >20 min sustained","Continuous static (microscopy, lab work)"]}/>
        <FW id="ergo_static_posture"/>
        <EF id="ergo_task_var" label="Task variety / job rotation" type="select" data={data} set={set} options={["High variety","Moderate variety","Low — 1–2 primary tasks","None — single repetitive task all day"]}/>
        <EF id="ergo_force_req" label="Force requirements" type="select" data={data} set={set} options={["Minimal (keyboard/mouse only)","Light force (writing, drawing)","Moderate (manual inspection)","Heavy (workshop, lab equipment)"]}/>
        <EF id="ergo_vibration" label="Vibration exposure" type="select" data={data} set={set} options={["None","Hand-arm vibration (power tools)","Whole-body vibration (driving)","Both"]}/>
        <EF id="ergo_asymm_load" label="Asymmetric upper limb loading" type="select" data={data} set={set} options={["None — bilateral equal use","Yes — occasional","Yes — sustained dominant side","Significant asymmetry"]}/>
        <FW id="ergo_asymm_load"/>
      </SH>
      <SH id="bh_psy" label="Psychosocial Factors">
        <EF id="ergo_work_stress" label="Perceived work stress" type="range" min={0} max={10} step={1} unit="/10" data={data} set={set} note="High psychosocial stress amplifies MSK pain and slows recovery."/>
        <EF id="ergo_deadline_pressure" label="Deadline / time pressure" type="select" data={data} set={set} options={["Low — flexible pacing","Moderate","High — frequent deadlines","Constant high pressure"]}/>
        <EF id="ergo_job_control" label="Control over work pace / ergonomics" type="select" data={data} set={set} options={["High — adjusts setup freely","Moderate","Low — fixed workstation/pace","None — fixed assembly line"]}/>
      </SH>
    </div>
  );

  const RisksTab = ()=>{
    const faults=risks.faults;
    const correlations=[
      {symptom:"Headache / cervicogenic",  drivers:["ergo_head_angle","ergo_monitor_height","ergo_neck_rotation","ergo_chin_poke"]},
      {symptom:"Neck pain / stiffness",    drivers:["ergo_head_angle","ergo_shoulder_pos","ergo_monitor_height","ergo_static_posture"]},
      {symptom:"Low back pain",            drivers:["ergo_chair_height","ergo_lumbar_support","ergo_sitting_hrs","ergo_break_freq","ergo_pelvic_tilt"]},
      {symptom:"Shoulder / rotator cuff",  drivers:["ergo_shoulder_pos","ergo_mouse_pos","ergo_keyboard_pos","ergo_shoulder_abd"]},
      {symptom:"Wrist / carpal tunnel",    drivers:["ergo_wrist_dev","ergo_keyboard_pos","ergo_rep_task","ergo_wrist_ext_angle"]},
      {symptom:"Elbow / epicondylalgia",   drivers:["ergo_elbow_angle","ergo_mouse_grip","ergo_rep_task","ergo_force_req"]},
      {symptom:"Thoracic / mid-back pain", drivers:["ergo_thoracic_kyphosis","ergo_lumbar_support","ergo_sitting_hrs","ergo_static_posture"]},
      {symptom:"Upper limb paraesthesia",  drivers:["ergo_shoulder_pos","ergo_elbow_angle","ergo_wrist_dev","ergo_keyboard_pos"]},
    ];
    return (
      <div>
        {/* Score card */}
        <div style={{background:C.s2,border:`2px solid ${overallCol}50`,borderRadius:14,padding:"16px 18px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:"0.8rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.muted,marginBottom:4}}>Overall Ergonomic Risk Score</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:"2.4rem",fontWeight:900,color:overallCol,lineHeight:1}}>{risks.total}</span>
                <span style={{fontSize:"0.9rem",color:C.muted}}>/ {risks.maxTotal}</span>
                <span style={{padding:"3px 10px",borderRadius:20,background:`${overallCol}20`,color:overallCol,fontWeight:800,fontSize:"0.8rem",marginLeft:4}}>{risks.overall} Risk</span>
              </div>
            </div>
            <div style={{fontSize:"0.82rem",color:C.muted,lineHeight:1.6,maxWidth:220}}>
              {risks.overall==="High"?"⚠️ Significant ergonomic load. Immediate workstation modification required.":risks.overall==="Moderate"?"⚡ Moderate ergonomic exposure. Targeted corrections advised.":"✅ Low ergonomic risk. Maintenance and monitoring."}
            </div>
          </div>
          <div style={{height:6,background:C.s3,borderRadius:4}}><div style={{height:"100%",width:`${Math.round(risks.total/risks.maxTotal*100)}%`,background:`linear-gradient(90deg,${C.green},${C.yellow},${C.red})`,borderRadius:4,transition:"width 0.5s"}}/></div>
        </div>
        {/* Domain badges */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {Object.entries(ERGO_DOMAIN_LABELS).map(([d,l])=>(
            <ErgoBadge key={d} level={risks[d]} label={l} score={risks.ds[d]||0} max={risks.dm[d]||1}/>
          ))}
        </div>
        {/* Active faults */}
        {faults.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Active Faults ({faults.length})</div>
            {faults.map(id=>{
              const cfg=ERGO_RISK_CFG[id];
              const col=cfg.w>=3?C.red:C.yellow;
              return (
                <div key={id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:C.surface,border:`1px solid ${col}30`,borderRadius:8,marginBottom:4,fontSize:"0.73rem"}}>
                  <span style={{color:col,flexShrink:0}}>{cfg.w>=3?"🔴":"🟡"}</span>
                  <span style={{color:C.text,flex:1}}>{id.replace("ergo_","").replace(/_/g," ")}</span>
                  <span style={{fontSize:"0.8rem",padding:"1px 6px",borderRadius:6,background:`${col}15`,color:col}}>{ERGO_DOMAIN_LABELS[cfg.domain]}</span>
                </div>
              );
            })}
          </div>
        )}
        {/* Symptom correlation */}
        <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Body Region — Workstation Correlation</div>
        {correlations.map(c=>{
          const matched=c.drivers.filter(d=>faults.includes(d));
          const pct=matched.length/c.drivers.length;
          const col=pct>=0.5?C.red:pct>=0.25?C.yellow:C.green;
          return (
            <div key={c.symptom} style={{background:C.surface,border:`1px solid ${matched.length>0?col+"40":C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:matched.length>0?5:0}}>
                <span style={{fontWeight:600,fontSize:"0.78rem",color:matched.length>0?C.text:C.muted}}>{c.symptom}</span>
                <span style={{fontSize:"0.75rem",fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${col}15`,color:col}}>{matched.length}/{c.drivers.length} drivers</span>
              </div>
              {matched.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{matched.map(f=><span key={f} style={{fontSize:"0.8rem",padding:"2px 7px",borderRadius:6,background:C.s3,color:C.yellow,border:`1px solid ${C.yellow}25`}}>{f.replace("ergo_","").replace(/_/g," ")}</span>)}</div>}
            </div>
          );
        })}
        {/* Future hooks */}
        <div style={{marginTop:16,background:C.s2,border:`1px solid ${C.a2}30`,borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8}}>🔮 Future Integration Hooks</div>
          {[{icon:"📷",label:"Webcam Posture Analysis",desc:"Real-time AI posture angle measurement"},{icon:"⌚",label:"Wearable Sensor Integration",desc:"IMU / smartwatch postural load import"},{icon:"🤖",label:"AI Posture Tracking",desc:"Continuous scoring with deviation alerts"},{icon:"📈",label:"Longitudinal Risk Tracking",desc:"Session-to-session score comparison"}].map(h=>(
            <div key={h.label} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:"1rem",flexShrink:0}}>{h.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:"0.74rem",fontWeight:600,color:C.muted}}>{h.label}</div><div style={{fontSize:"0.66rem",color:C.muted,opacity:0.7}}>{h.desc}</div></div>
              <span style={{fontSize:"0.8rem",padding:"2px 7px",borderRadius:8,background:"rgba(127,90,240,0.15)",color:C.a2,fontWeight:700}}>Planned</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CORRECTIONS = {
    ergo_monitor_height:  {priority:"High",  area:"Monitor",      action:"Raise/lower monitor so top edge aligns with eye level. Use monitor stand or adjustable arm."},
    ergo_monitor_dist:    {priority:"Medium", area:"Monitor",      action:"Position monitor 50–70cm from eyes. Use arm's length as a quick guide."},
    ergo_monitor_glare:   {priority:"Medium", area:"Environment",  action:"Reposition monitor perpendicular to windows. Add anti-glare filter or adjust blinds."},
    ergo_head_angle:      {priority:"High",  area:"Posture",       action:"Raise monitor and adjust seating to reduce forward head. Prescribe chin tuck retraining x10 hourly."},
    ergo_neck_rotation:   {priority:"High",  area:"Monitor",       action:"Centre primary monitor directly ahead. Adjust dual-monitor layout to within ±35°."},
    ergo_chair_height:    {priority:"High",  area:"Chair",         action:"Adjust chair: hips and knees 90–100°, feet flat or footrest used."},
    ergo_lumbar_support:  {priority:"High",  area:"Chair",         action:"Set lumbar support at L2–L5. Add lumbar roll if inadequate. Maintain lordosis throughout day."},
    ergo_seat_depth:      {priority:"Medium", area:"Chair",        action:"Adjust seat depth: 2–4 finger gap behind knee to popliteal fossa."},
    ergo_foot_support:    {priority:"Medium", area:"Chair",        action:"Add footrest if feet unsupported. Eliminate crossed-leg habit."},
    ergo_pelvic_tilt:     {priority:"High",  area:"Posture",       action:"Cue anterior pelvic tilt awareness. Prescribe seated pelvic clock x10. Reassess lumbar support."},
    ergo_keyboard_pos:    {priority:"High",  area:"Input",         action:"Position keyboard so elbows at 90° and wrists neutral. Use keyboard tray if needed."},
    ergo_wrist_dev:       {priority:"High",  area:"Input",         action:"Use wrist-neutral keyboard layout. Remove wrist rests during active typing. Prescribe wrist neutral drills."},
    ergo_mouse_pos:       {priority:"High",  area:"Input",         action:"Move mouse immediately beside keyboard. Keep shoulder adducted <15° during use."},
    ergo_elbow_angle:     {priority:"Medium", area:"Input",        action:"Adjust seating or keyboard height to achieve 90–100° elbow flexion."},
    ergo_shoulder_pos:    {priority:"High",  area:"Posture",       action:"Prescribe scapular retraction cue. Lower armrests. Move mouse closer. Serratus activation program."},
    ergo_sitting_hrs:     {priority:"High",  area:"Behaviour",     action:"Implement sit-stand protocol: 45 min sit / 15 min stand/move. Use height-adjustable desk."},
    ergo_break_freq:      {priority:"High",  area:"Behaviour",     action:"Set 20–25 min movement timer. Microbreak = stand + 5 key movements (neck, shoulder, hip flex stretch)."},
    ergo_rep_task:        {priority:"Medium", area:"Behaviour",    action:"Introduce task rotation every 45–60 min. Vary between high and low repetition tasks."},
    ergo_static_posture:  {priority:"High",  area:"Behaviour",     action:"Postural variation every 20 min. Prescribe postural reset: 3 reps each for neck, shoulder, thoracic."},
    ergo_asymm_load:      {priority:"Medium", area:"Posture",      action:"Identify asymmetric driver (mouse, phone). Redistribute load bilaterally. Strengthen contralateral stabilisers."},
    ergo_dual_monitor:    {priority:"Medium", area:"Monitor",      action:"Centre monitors equally OR set one primary directly ahead. Keep secondary within ±35°."},
    ergo_phone_use:       {priority:"Medium", area:"Equipment",    action:"Provide headset or speakerphone. Eliminate shoulder-cradle habit immediately."},
  };

  const PlanTab = ()=>{
    const faults=risks.faults;
    const highP=faults.filter(f=>CORRECTIONS[f]?.priority==="High");
    const medP=faults.filter(f=>CORRECTIONS[f]?.priority==="Medium");
    const movPx=[];
    if(risks.cervical==="High"||risks.cervical==="Moderate") movPx.push({label:"Cervical Mobility",freq:"Every 30 min",ex:["Chin tucks ×10","Cervical rotation L+R ×8","Cervical lateral flex ×8","Upper trap stretch 30s each side"]});
    if(risks.lumbar==="High"||risks.lumbar==="Moderate")    movPx.push({label:"Lumbar Activation",freq:"Every 45 min",ex:["Seated pelvic clock ×10","Hip flexor standing stretch 30s","Brief walk 2–3 min","Seated glute press ×15"]});
    if(risks.ucs==="High"||risks.ucs==="Moderate")         movPx.push({label:"UCS Postural Reset",freq:"Every 20 min",ex:["Scapular retraction ×10 (5s hold)","Thoracic extension over chair ×5","Wall slide W-Y ×10","DNF chin nod ×10"]});
    if(risks.rsi==="High"||risks.rsi==="Moderate")         movPx.push({label:"Upper Limb Care",freq:"Every 60 min",ex:["Wrist flex/ext stretch 30s","Tendon glides ×10","Forearm pronation/supination ×15","Grip relaxation + intrinsic stretch"]});
    return (
      <div>
        {faults.length===0?(
          <div style={{textAlign:"center",padding:30,color:C.muted}}><div style={{fontSize:"2rem",marginBottom:8}}>📋</div><div>Complete Workstation, Posture and Behaviour tabs to generate a personalised action plan.</div></div>
        ):(
          <>
            {highP.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.red,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.red}}/>🔴 High Priority ({highP.length})</div>
                {highP.map(id=>{const c=CORRECTIONS[id];return c?(
                  <div key={id} style={{background:C.surface,border:`1px solid ${C.red}30`,borderLeft:`3px solid ${C.red}`,borderRadius:10,padding:"10px 13px",marginBottom:7}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:"0.78rem",fontWeight:700,padding:"2px 7px",borderRadius:6,background:`${C.red}20`,color:C.red,flexShrink:0,marginTop:1}}>{c.area}</span>
                      <div><div style={{fontSize:"0.8rem",fontWeight:600,color:C.muted,marginBottom:2}}>{id.replace("ergo_","").replace(/_/g," ")}</div><div style={{fontSize:"0.78rem",color:C.text,lineHeight:1.5}}>{c.action}</div></div>
                    </div>
                  </div>
                ):null;})}
              </div>
            )}
            {medP.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.yellow,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.yellow}}/>🟡 Medium Priority ({medP.length})</div>
                {medP.map(id=>{const c=CORRECTIONS[id];return c?(
                  <div key={id} style={{background:C.surface,border:`1px solid ${C.yellow}25`,borderLeft:`3px solid ${C.yellow}`,borderRadius:10,padding:"10px 13px",marginBottom:7}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:"0.78rem",fontWeight:700,padding:"2px 7px",borderRadius:6,background:`${C.yellow}15`,color:C.yellow,flexShrink:0,marginTop:1}}>{c.area}</span>
                      <div><div style={{fontSize:"0.8rem",fontWeight:600,color:C.muted,marginBottom:2}}>{id.replace("ergo_","").replace(/_/g," ")}</div><div style={{fontSize:"0.78rem",color:C.text,lineHeight:1.5}}>{c.action}</div></div>
                    </div>
                  </div>
                ):null;})}
              </div>
            )}
            {movPx.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a3,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a3}}/>🏃 Movement Break Prescription</div>
                {movPx.map(mp=>(
                  <div key={mp.label} style={{background:C.surface,border:`1px solid ${C.a3}30`,borderRadius:10,padding:"11px 13px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontWeight:700,fontSize:"0.82rem",color:C.a3}}>{mp.label}</div>
                      <span style={{fontSize:"0.82rem",padding:"2px 7px",borderRadius:8,background:`${C.a3}15`,color:C.a3}}>⏱ {mp.freq}</span>
                    </div>
                    {mp.ex.map((e,i)=><div key={i} style={{display:"flex",gap:8,padding:"3px 0",fontSize:"0.76rem",color:C.text}}><span style={{color:C.a3,flexShrink:0}}>→</span><span>{e}</span></div>)}
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:8}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Clinician Notes — Ergonomic</div>
              <EF id="ergo_clinician_notes" label="Notes / employer recommendations" type="textarea" data={data} set={set} placeholder="Workplace recommendations, equipment requests, employer letter notes, review date..."/>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {risks.total>0&&(
        <div style={{background:`${overallCol}10`,border:`1px solid ${overallCol}40`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontWeight:800,color:overallCol,fontSize:"0.88rem"}}>{risks.overall==="High"?"🔴":risks.overall==="Moderate"?"🟡":"✅"} Ergonomic Risk: {risks.overall}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.entries(ERGO_DOMAIN_LABELS).map(([d,l])=>{
              const col=risks[d]==="High"?C.red:risks[d]==="Moderate"?C.yellow:null;
              return col?<span key={d} style={{fontSize:"0.82rem",padding:"2px 7px",borderRadius:8,background:`${col}15`,color:col,fontWeight:700}}>{l}: {risks[d]}</span>:null;
            })}
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {tabs.map(t=><button key={t.key} type="button" onClick={()=>setTab(t.key)} style={tb(t.key)}>{t.icon} {t.label}</button>)}
      </div>
      {tab==="workstation" && <WorkstationTab/>}
      {tab==="posture"     && <PostureTab/>}
      {tab==="behaviour"   && <BehaviourTab/>}
      {tab==="risks"       && <RisksTab/>}
      {tab==="plan"        && <PlanTab/>}
    </div>
  );
}

export { ErgoModule };

// ClinicalModules.jsx — Gait, Outcomes, SOAP, Exercise, Palpation, Treatment, SessionLog
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { C, getC } from "./utils.jsx";

function EF({ id, label, type, options, unit, min=0, max=10, step=1, placeholder="", data, set, note }) {
  const base={width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const val=data[id]||"";
  const filled=val!=="";
  return (
    <div style={{background:C.surface,border:`1px solid ${filled?C.accent+"25":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:6}}>
        <label style={{fontSize:"0.78rem",fontWeight:600,color:filled?C.text:C.muted,lineHeight:1.4,flex:1}}>
          {label}{filled&&<span style={{color:C.green,marginLeft:5,fontSize:"0.6rem"}}>✓</span>}
        </label>
        {unit&&<span style={{fontSize:"0.62rem",color:C.muted,flexShrink:0}}>{unit}</span>}
      </div>
      {note&&<div style={{fontSize:"0.68rem",color:C.muted,marginBottom:6,lineHeight:1.4,fontStyle:"italic"}}>{note}</div>}
      {type==="select"&&<select value={val} onChange={e=>set(id,e.target.value)} style={base}><option value="">— select —</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>}
      {type==="range"&&<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:"0.68rem",color:C.muted}}>{min}{unit||""}</span><span style={{fontSize:"0.82rem",fontWeight:700,color:C.accent}}>{val||min}{unit||""}</span><span style={{fontSize:"0.68rem",color:C.muted}}>{max}{unit||""}</span></div><input type="range" min={min} max={max} step={step} value={val||min} onChange={e=>set(id,e.target.value)} style={{width:"100%",accentColor:C.accent,cursor:"pointer"}}/></div>}
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
      <div style={{fontSize:"0.58rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",color:C.muted,marginBottom:4}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontWeight:800,fontSize:"0.95rem",color:col}}>{level}</span>
        <span style={{fontSize:"0.62rem",color:C.muted}}>{score}/{max}</span>
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
  const tb = k=>({padding:"7px 12px",borderRadius:20,cursor:"pointer",fontSize:"0.72rem",fontWeight:tab===k?700:400,border:`1px solid ${tab===k?C.accent:C.border}`,background:tab===k?"rgba(0,229,255,0.1)":"transparent",color:tab===k?C.accent:C.muted,whiteSpace:"nowrap",transition:"all 0.15s"});

  const SH = ({id,label,children})=>{
    const isOpen=open[id]!==false;
    return (
      <div style={{marginBottom:14}}>
        <button type="button" onClick={()=>setOpen(p=>({...p,[id]:!isOpen}))} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"transparent",border:"none",cursor:"pointer",padding:"6px 0",marginBottom:isOpen?8:0}}>
          <div style={{fontSize:"0.63rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>{label}</div>
          <span style={{color:C.muted,fontSize:"0.72rem"}}>{isOpen?"▲":"▼"}</span>
        </button>
        {isOpen&&children}
      </div>
    );
  };

  const FW = ({id})=>{
    const cfg=ERGO_RISK_CFG[id]; if(!cfg) return null;
    const val=data[id]||"";
    if(!val||!cfg.bad(val)) return null;
    return <div style={{display:"flex",gap:6,padding:"5px 10px",background:"rgba(255,179,0,0.08)",border:`1px solid ${C.yellow}30`,borderRadius:7,marginBottom:4,fontSize:"0.7rem",color:C.yellow}}><span style={{flexShrink:0}}>⚠</span><span>{ERGO_FAULT_MSGS[id]||"Ergonomic fault identified"}</span></div>;
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
              <div style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.muted,marginBottom:4}}>Overall Ergonomic Risk Score</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:"2.4rem",fontWeight:900,color:overallCol,lineHeight:1}}>{risks.total}</span>
                <span style={{fontSize:"0.9rem",color:C.muted}}>/ {risks.maxTotal}</span>
                <span style={{padding:"3px 10px",borderRadius:20,background:`${overallCol}20`,color:overallCol,fontWeight:800,fontSize:"0.8rem",marginLeft:4}}>{risks.overall} Risk</span>
              </div>
            </div>
            <div style={{fontSize:"0.72rem",color:C.muted,lineHeight:1.6,maxWidth:220}}>
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
            <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Active Faults ({faults.length})</div>
            {faults.map(id=>{
              const cfg=ERGO_RISK_CFG[id];
              const col=cfg.w>=3?C.red:C.yellow;
              return (
                <div key={id} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 10px",background:C.surface,border:`1px solid ${col}30`,borderRadius:8,marginBottom:4,fontSize:"0.73rem"}}>
                  <span style={{color:col,flexShrink:0}}>{cfg.w>=3?"🔴":"🟡"}</span>
                  <span style={{color:C.text,flex:1}}>{id.replace("ergo_","").replace(/_/g," ")}</span>
                  <span style={{fontSize:"0.6rem",padding:"1px 6px",borderRadius:6,background:`${col}15`,color:col}}>{ERGO_DOMAIN_LABELS[cfg.domain]}</span>
                </div>
              );
            })}
          </div>
        )}
        {/* Symptom correlation */}
        <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Body Region — Workstation Correlation</div>
        {correlations.map(c=>{
          const matched=c.drivers.filter(d=>faults.includes(d));
          const pct=matched.length/c.drivers.length;
          const col=pct>=0.5?C.red:pct>=0.25?C.yellow:C.green;
          return (
            <div key={c.symptom} style={{background:C.surface,border:`1px solid ${matched.length>0?col+"40":C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:matched.length>0?5:0}}>
                <span style={{fontWeight:600,fontSize:"0.78rem",color:matched.length>0?C.text:C.muted}}>{c.symptom}</span>
                <span style={{fontSize:"0.65rem",fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${col}15`,color:col}}>{matched.length}/{c.drivers.length} drivers</span>
              </div>
              {matched.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{matched.map(f=><span key={f} style={{fontSize:"0.6rem",padding:"2px 7px",borderRadius:6,background:C.s3,color:C.yellow,border:`1px solid ${C.yellow}25`}}>{f.replace("ergo_","").replace(/_/g," ")}</span>)}</div>}
            </div>
          );
        })}
        {/* Future hooks */}
        <div style={{marginTop:16,background:C.s2,border:`1px solid ${C.a2}30`,borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8}}>🔮 Future Integration Hooks</div>
          {[{icon:"📷",label:"Webcam Posture Analysis",desc:"Real-time AI posture angle measurement"},{icon:"⌚",label:"Wearable Sensor Integration",desc:"IMU / smartwatch postural load import"},{icon:"🤖",label:"AI Posture Tracking",desc:"Continuous scoring with deviation alerts"},{icon:"📈",label:"Longitudinal Risk Tracking",desc:"Session-to-session score comparison"}].map(h=>(
            <div key={h.label} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:"1rem",flexShrink:0}}>{h.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:"0.74rem",fontWeight:600,color:C.muted}}>{h.label}</div><div style={{fontSize:"0.66rem",color:C.muted,opacity:0.7}}>{h.desc}</div></div>
              <span style={{fontSize:"0.6rem",padding:"2px 7px",borderRadius:8,background:"rgba(127,90,240,0.15)",color:C.a2,fontWeight:700}}>Planned</span>
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
                <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.red,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.red}}/>🔴 High Priority ({highP.length})</div>
                {highP.map(id=>{const c=CORRECTIONS[id];return c?(
                  <div key={id} style={{background:C.surface,border:`1px solid ${C.red}30`,borderLeft:`3px solid ${C.red}`,borderRadius:10,padding:"10px 13px",marginBottom:7}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:"0.58rem",fontWeight:700,padding:"2px 7px",borderRadius:6,background:`${C.red}20`,color:C.red,flexShrink:0,marginTop:1}}>{c.area}</span>
                      <div><div style={{fontSize:"0.7rem",fontWeight:600,color:C.muted,marginBottom:2}}>{id.replace("ergo_","").replace(/_/g," ")}</div><div style={{fontSize:"0.78rem",color:C.text,lineHeight:1.5}}>{c.action}</div></div>
                    </div>
                  </div>
                ):null;})}
              </div>
            )}
            {medP.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.yellow,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.yellow}}/>🟡 Medium Priority ({medP.length})</div>
                {medP.map(id=>{const c=CORRECTIONS[id];return c?(
                  <div key={id} style={{background:C.surface,border:`1px solid ${C.yellow}25`,borderLeft:`3px solid ${C.yellow}`,borderRadius:10,padding:"10px 13px",marginBottom:7}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:"0.58rem",fontWeight:700,padding:"2px 7px",borderRadius:6,background:`${C.yellow}15`,color:C.yellow,flexShrink:0,marginTop:1}}>{c.area}</span>
                      <div><div style={{fontSize:"0.7rem",fontWeight:600,color:C.muted,marginBottom:2}}>{id.replace("ergo_","").replace(/_/g," ")}</div><div style={{fontSize:"0.78rem",color:C.text,lineHeight:1.5}}>{c.action}</div></div>
                    </div>
                  </div>
                ):null;})}
              </div>
            )}
            {movPx.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a3,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a3}}/>🏃 Movement Break Prescription</div>
                {movPx.map(mp=>(
                  <div key={mp.label} style={{background:C.surface,border:`1px solid ${C.a3}30`,borderRadius:10,padding:"11px 13px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontWeight:700,fontSize:"0.82rem",color:C.a3}}>{mp.label}</div>
                      <span style={{fontSize:"0.62rem",padding:"2px 7px",borderRadius:8,background:`${C.a3}15`,color:C.a3}}>⏱ {mp.freq}</span>
                    </div>
                    {mp.ex.map((e,i)=><div key={i} style={{display:"flex",gap:8,padding:"3px 0",fontSize:"0.76rem",color:C.text}}><span style={{color:C.a3,flexShrink:0}}>→</span><span>{e}</span></div>)}
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:8}}>
              <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Clinician Notes — Ergonomic</div>
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
              return col?<span key={d} style={{fontSize:"0.62rem",padding:"2px 7px",borderRadius:8,background:`${col}15`,color:col,fontWeight:700}}>{l}: {risks[d]}</span>:null;
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

// ═══════════════════════════════════════════════════════════════════════════════
// GAIT ANALYSIS MODULE
// ═══════════════════════════════════════════════════════════════════════════════

const GAIT_PHASES = [
  {id:"g_ic",   phase:"Initial Contact",  pct:"0%",    type:"stance", deviations:["Foot flat contact","Heel strike absent","Excessive plantarflexion","Knee hyperextension at contact"]},
  {id:"g_lr",   phase:"Loading Response", pct:"0–12%", type:"stance", deviations:["Excessive knee flexion","Contralateral pelvic drop","Foot pronation/supination","Antalgic load transfer"]},
  {id:"g_ms",   phase:"Mid Stance",       pct:"12–31%",type:"stance", deviations:["Trendelenburg sign","Lateral trunk lean","Knee recurvatum","Excessive dorsiflexion"]},
  {id:"g_ts",   phase:"Terminal Stance",  pct:"31–50%",type:"stance", deviations:["Absent heel rise","Reduced push-off","Hip hiking","Ankle rocker deficit"]},
  {id:"g_ps",   phase:"Pre-Swing",        pct:"50–62%",type:"stance", deviations:["Reduced knee flexion","Toe drag","Hip extension deficit","Reduced propulsion"]},
  {id:"g_isw",  phase:"Initial Swing",    pct:"62–75%",type:"swing",  deviations:["Foot drop","Circumduction","Hip hiking","Excessive hip flexion compensation"]},
  {id:"g_msw",  phase:"Mid Swing",        pct:"75–87%",type:"swing",  deviations:["Foot clearance deficit","Steppage gait","Scissoring","Stiff knee swing"]},
  {id:"g_tsw",  phase:"Terminal Swing",   pct:"87–100%",type:"swing", deviations:["Knee extension deficit","Foot slap anticipation","Forward trunk lean","Reduced deceleration"]},
];

const ABNORMAL_GAITS = [
  {id:"ag_trend",  label:"Trendelenburg",  cause:"Weak gluteus medius",         sign:"Contralateral pelvis drops in stance"},
  {id:"ag_antalgic",label:"Antalgic",      cause:"Pain avoidance",              sign:"Shortened stance on affected side"},
  {id:"ag_steppage",label:"Steppage",      cause:"Foot drop / tibialis anterior", sign:"Excessive hip/knee flexion to clear foot"},
  {id:"ag_hemi",   label:"Hemiplegic",     cause:"Stroke / UMN lesion",         sign:"Circumduction, arm held adducted/flexed"},
  {id:"ag_scissor",label:"Scissor",        cause:"Bilateral spasticity",         sign:"Knees cross midline, narrow base"},
  {id:"ag_waddling",label:"Waddling",      cause:"Bilateral hip weakness",       sign:"Exaggerated lateral trunk sway bilaterally"},
  {id:"ag_ataxic", label:"Ataxic",         cause:"Cerebellar dysfunction",       sign:"Wide base, irregular cadence, staggering"},
  {id:"ag_parkinson",label:"Parkinsonian", cause:"Parkinson's disease",          sign:"Shuffling, festination, reduced arm swing"},
  {id:"ag_vaulting",label:"Vaulting",      cause:"Leg length discrepancy",       sign:"Excessive plantarflexion on shorter side"},
];

const GAIT_SCALES = [
  {id:"g_fac",  label:"FAC",  full:"Functional Ambulation Classification", range:"0–5",  cutoffs:"0=non-ambulatory, 3=supervised, 5=independent all terrain"},
  {id:"g_dgi",  label:"DGI",  full:"Dynamic Gait Index",                   range:"/24",  cutoffs:"<19 = fall risk; 22+ = community ambulation"},
  {id:"g_fga",  label:"FGA",  full:"Functional Gait Assessment",           range:"/30",  cutoffs:"<22 = fall risk in community-dwelling older adults"},
  {id:"g_berg", label:"Berg", full:"Berg Balance Scale",                   range:"/56",  cutoffs:"<45 = fall risk; <36 = almost always fall"},
  {id:"g_tinetti",label:"Tinetti POMA",full:"Performance-Oriented Mobility Assessment",range:"/28", cutoffs:"<19 = high fall risk; 19–24 = moderate"},
  {id:"g_wgs",  label:"Wisconsin", full:"Wisconsin Gait Scale",            range:"/14",  cutoffs:"Higher = more deviation (stroke)"},
];

function GaitModule({ data, set }) {
  const [tab, setTab] = useState("profile");
  const [openSec, setOpenSec] = useState({oga_ant:true,oga_lat:true,oga_post:true});

  const tabs = [
    {key:"profile",  label:"Profile",        icon:"👤"},
    {key:"oga",      label:"Observation",    icon:"👁️"},
    {key:"phases",   label:"Gait Phases",    icon:"🔄"},
    {key:"spatio",   label:"Parameters",     icon:"📐"},
    {key:"timed",    label:"Timed Tests",    icon:"⏱️"},
    {key:"scales",   label:"Scales",         icon:"📊"},
    {key:"abnormal", label:"Gait Pattern",   icon:"🚨"},
    {key:"muscles",  label:"Muscle/Joint",   icon:"💪"},
    {key:"plan",     label:"Plan & Goals",   icon:"📋"},
  ];
  const tb = k=>({padding:"7px 11px",borderRadius:20,cursor:"pointer",fontSize:"0.72rem",fontWeight:tab===k?700:400,border:`1px solid ${tab===k?C.accent:C.border}`,background:tab===k?"rgba(0,229,255,0.1)":"transparent",color:tab===k?C.accent:C.muted,whiteSpace:"nowrap",transition:"all 0.15s"});
  const inp = {width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const row = (label, id, type="text", opts=null, note=null)=>{
    const val=data[id]||"";
    return(
      <div style={{background:C.surface,border:`1px solid ${val?C.accent+"25":C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:7}}>
        <div style={{fontSize:"0.76rem",fontWeight:600,color:val?C.text:C.muted,marginBottom:5}}>{label}{val&&<span style={{color:C.green,marginLeft:5,fontSize:"0.6rem"}}>✓</span>}</div>
        {note&&<div style={{fontSize:"0.67rem",color:C.muted,marginBottom:5,fontStyle:"italic"}}>{note}</div>}
        {type==="select"&&<select value={val} onChange={e=>set(id,e.target.value)} style={inp}><option value="">— select —</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>}
        {type==="text"&&<input value={val} onChange={e=>set(id,e.target.value)} style={inp}/>}
        {type==="num"&&<input type="number" value={val} onChange={e=>set(id,e.target.value)} style={inp}/>}
        {type==="textarea"&&<textarea value={val} onChange={e=>set(id,e.target.value)} rows={3} style={{...inp,resize:"vertical",display:"block"}}/>}
        {type==="range"&&opts&&<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:"0.67rem",color:C.muted}}>{opts[0]}</span><span style={{fontWeight:700,color:C.accent}}>{val||opts[0]}</span><span style={{fontSize:"0.67rem",color:C.muted}}>{opts[1]}</span></div><input type="range" min={opts[0]} max={opts[1]} step={opts[2]||1} value={val||opts[0]} onChange={e=>set(id,e.target.value)} style={{width:"100%",accentColor:C.accent}}/></div>}
      </div>
    );
  };

  const SH = ({id,label,children})=>{
    const isOpen=openSec[id]!==false;
    return(<div style={{marginBottom:12}}>
      <button type="button" onClick={()=>setOpenSec(p=>({...p,[id]:!isOpen}))} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"transparent",border:"none",cursor:"pointer",padding:"5px 0",marginBottom:isOpen?7:0}}>
        <div style={{fontSize:"0.63rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>{label}</div>
        <span style={{color:C.muted,fontSize:"0.72rem"}}>{isOpen?"▲":"▼"}</span>
      </button>
      {isOpen&&children}
    </div>);
  };

  // Fall risk calculator
  const tugSec = parseFloat(data.g_tug||"0");
  const bergScore = parseInt(data.g_berg||"99");
  const fagScore = parseInt(data.g_fac||"5");
  const fallRisk = (tugSec>=13.5||bergScore<45||fagScore<=2) ? "High" : (tugSec>=12||bergScore<50) ? "Moderate" : tugSec>0||bergScore<99 ? "Low" : null;
  const fallCol = fallRisk==="High"?C.red:fallRisk==="Moderate"?C.yellow:C.green;

  // Active abnormal gaits
  const activeGaits = ABNORMAL_GAITS.filter(g=>data[g.id]==="Present");
  // Phase deviations
  const phaseDeviations = GAIT_PHASES.filter(p=>data[p.id+"_dev"]&&data[p.id+"_dev"]!=="None");

  return (
    <div>
      {/* Summary banner */}
      {(fallRisk||activeGaits.length>0)&&(
        <div style={{background:fallRisk==="High"?"rgba(255,77,109,0.1)":"rgba(255,179,0,0.08)",border:`1px solid ${fallCol}40`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          {fallRisk&&<span style={{fontWeight:800,color:fallCol,fontSize:"0.85rem"}}>{fallRisk==="High"?"🔴":"🟡"} Fall Risk: {fallRisk}</span>}
          {activeGaits.map(g=><span key={g.id} style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:8,background:`${C.yellow}15`,color:C.yellow,fontWeight:600}}>{g.label}</span>)}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {tabs.map(t=><button key={t.key} type="button" onClick={()=>setTab(t.key)} style={tb(t.key)}>{t.icon} {t.label}</button>)}
      </div>

      {/* ── PROFILE ── */}
      {tab==="profile"&&<div>
        <SH id="pf_basic" label="Patient Profile">
          {row("Chief Complaint","g_complaint","textarea")}
          {row("Pain Location","g_pain_loc")}
          {row("VAS Pain Score (0–10)","g_vas","range",[0,10,1])}
          {row("Duration of Gait Problem","g_duration")}
          {row("Assistive Device","g_device","select",["None","Walking stick (ipsilateral)","Walking stick (contralateral)","Forearm crutch","Axillary crutch","Zimmer frame","Rollator","Wheelchair (part-time)","AFO"])}
          {row("Footwear Type","g_footwear","select",["Barefoot","Standard shoes","Running shoes","Orthopaedic shoes","Custom orthotic","AFO in shoe","Open sandal"])}
          {row("Medical / Surgical History","g_hx","textarea")}
          {row("Relevant Diagnosis","g_diagnosis")}
        </SH>
      </div>}

      {/* ── OBSERVATIONAL GAIT ANALYSIS ── */}
      {tab==="oga"&&<div>
        <div style={{background:C.s2,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:"0.75rem",color:C.muted,lineHeight:1.6}}>
          <strong style={{color:C.accent}}>OGA:</strong> Observe from all 3 planes. Record what is present, not what is expected.
        </div>
        <SH id="oga_ant" label="Anterior View">
          {row("Head position","g_oga_head","select",["Midline","Left lateral tilt","Right lateral tilt","Forward flexion"])}
          {row("Shoulder symmetry","g_oga_shoulder","select",["Level (normal)","Left elevated","Right elevated","Asymmetric rotation"])}
          {row("Arm swing — Left","g_oga_arm_l","select",["Normal","Reduced","Absent","Exaggerated","Held fixed"])}
          {row("Arm swing — Right","g_oga_arm_r","select",["Normal","Reduced","Absent","Exaggerated","Held fixed"])}
          {row("Trunk alignment","g_oga_trunk_ant","select",["Midline","Lateral lean left","Lateral lean right","Rotation present"])}
          {row("Pelvic frontal alignment","g_oga_pelvis_ant","select",["Level","Left drop (R stance — Trendelenburg)","Right drop (L stance — Trendelenburg)","Bilateral drop (waddling)"])}
          {row("Knee alignment (frontal)","g_oga_knee_front","select",["Neutral","Genu valgum","Genu varum","Asymmetric"])}
          {row("Foot progression angle","g_oga_foot_angle","select",["Neutral (5–10° ER)","In-toeing","Out-toeing","Asymmetric"])}
          {row("Base of support","g_oga_bos","select",["Normal (5–10cm)","Narrow (<5cm)","Wide (>10cm)"])}
        </SH>
        <SH id="oga_lat" label="Lateral View">
          {row("Trunk lean (sagittal)","g_oga_trunk_lat","select",["Upright (normal)","Anterior lean","Posterior lean","Flexed trunk"])}
          {row("Hip ROM (sagittal)","g_oga_hip_rom","select",["Normal (40° flex / 10° ext)","Reduced flexion","Reduced extension","Both reduced"])}
          {row("Knee flexion pattern","g_oga_knee_flex","select",["Normal (0–60° swing)","Stiff knee swing","Excess flexion","Hyperextension in stance"])}
          {row("Ankle motion","g_oga_ankle","select",["Normal rocker sequence","Reduced dorsiflexion","Foot drop","Equinus pattern","Flat foot contact"])}
          {row("Head/cervical position","g_oga_head_lat","select",["Neutral","Forward head posture","Flexed","Extended"])}
          {row("Step length symmetry","g_oga_step_sym","select",["Symmetrical","Left shorter","Right shorter","Markedly asymmetric"])}
        </SH>
        <SH id="oga_post" label="Posterior View">
          {row("Pelvic drop (posterior)","g_oga_pelvis_post","select",["None","Left drops in R stance","Right drops in L stance","Bilateral"])}
          {row("Heel rise pattern","g_oga_heel_rise","select",["Bilateral normal","Reduced left","Reduced right","Absent bilateral"])}
          {row("Subtalar motion","g_oga_subtalar","select",["Neutral","Excess pronation left","Excess pronation right","Excess supination","Bilateral pronation"])}
          {row("Foot clearance","g_oga_clearance","select",["Adequate bilateral","Reduced left (foot drag risk)","Reduced right (foot drag risk)","Bilateral deficit"])}
          {row("Heel strike pattern","g_oga_heel_strike","select",["Bilateral heel strike","Left heel strike absent","Right heel strike absent","Bilateral flat/toe contact"])}
        </SH>
        {row("General OGA notes","g_oga_notes","textarea",null,"Additional observations, compensatory strategies, video notes...")}
      </div>}

      {/* ── GAIT PHASES ── */}
      {tab==="phases"&&<div>
        <div style={{background:C.s2,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:"0.75rem",color:C.muted,lineHeight:1.6}}>
          <strong style={{color:C.accent}}>Gait Cycle:</strong> Stance 60% | Swing 40%. Flag deviations found in each sub-phase.
        </div>
        {/* Summary of deviations */}
        {phaseDeviations.length>0&&(
          <div style={{background:"rgba(255,179,0,0.06)",border:`1px solid ${C.yellow}30`,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
            <div style={{fontSize:"0.62rem",fontWeight:700,color:C.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Deviations Found ({phaseDeviations.length} phases)</div>
            {phaseDeviations.map(p=><div key={p.id} style={{fontSize:"0.74rem",color:C.text,marginBottom:3}}>
              <span style={{color:p.type==="stance"?C.accent:C.a2,fontWeight:600}}>{p.phase}: </span>{data[p.id+"_dev"]}
            </div>)}
          </div>
        )}
        {["stance","swing"].map(type=>(
          <div key={type} style={{marginBottom:14}}>
            <div style={{fontSize:"0.63rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:type==="stance"?C.accent:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <div style={{height:1,width:10,background:type==="stance"?C.accent:C.a2}}/>{type==="stance"?"STANCE PHASE (60%)":"SWING PHASE (40%)"}
            </div>
            {GAIT_PHASES.filter(p=>p.type===type).map(p=>{
              const dev=data[p.id+"_dev"]||"";
              const note=data[p.id+"_note"]||"";
              const hasDeviation=dev&&dev!=="None";
              return(
                <div key={p.id} style={{background:C.surface,border:`1px solid ${hasDeviation?C.yellow+"50":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}>
                    <div>
                      <span style={{fontWeight:700,color:hasDeviation?C.yellow:C.text,fontSize:"0.83rem"}}>{p.phase}</span>
                      <span style={{fontSize:"0.65rem",color:C.muted,marginLeft:8}}>{p.pct}</span>
                    </div>
                    {hasDeviation&&<span style={{fontSize:"0.6rem",padding:"1px 7px",borderRadius:8,background:`${C.yellow}15`,color:C.yellow,fontWeight:700}}>DEVIATION</span>}
                  </div>
                  <select value={dev} onChange={e=>set(p.id+"_dev",e.target.value)} style={{...inp,marginBottom:hasDeviation?7:0,borderColor:hasDeviation?C.yellow+"60":C.border}}>
                    <option value="">— select deviation —</option>
                    <option value="None">✓ No deviation</option>
                    {p.deviations.map(d=><option key={d} value={d}>{d}</option>)}
                    <option value="Other — see notes">Other — see notes</option>
                  </select>
                  {hasDeviation&&<input value={note} onChange={e=>set(p.id+"_note",e.target.value)} placeholder="Side (L/R/bilateral), severity, additional notes..." style={{...inp,fontSize:"0.74rem"}}/>}
                </div>
              );
            })}
          </div>
        ))}
      </div>}

      {/* ── SPATIOTEMPORAL ── */}
      {tab==="spatio"&&<div>
        <div style={{background:C.s2,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:"0.75rem",color:C.muted}}>Compare patient values to normal reference ranges.</div>
        {[
          {id:"g_speed",    label:"Gait Speed",    unit:"m/s",    normal:"1.2–1.4",  placeholder:"e.g. 0.8"},
          {id:"g_cadence",  label:"Cadence",       unit:"steps/min",normal:"100–120",placeholder:"e.g. 85"},
          {id:"g_step_l_l", label:"Step Length — Left",  unit:"m",normal:"0.7–0.8",  placeholder:"e.g. 0.55"},
          {id:"g_step_l_r", label:"Step Length — Right", unit:"m",normal:"0.7–0.8",  placeholder:"e.g. 0.60"},
          {id:"g_stride",   label:"Stride Length",  unit:"m",    normal:"1.4–1.6",  placeholder:"e.g. 1.15"},
          {id:"g_bos",      label:"Base of Support",unit:"cm",   normal:"5–10",     placeholder:"e.g. 14"},
          {id:"g_stance_pct",label:"Stance Phase",  unit:"%",    normal:"60",       placeholder:"e.g. 65"},
          {id:"g_swing_pct", label:"Swing Phase",   unit:"%",    normal:"40",       placeholder:"e.g. 35"},
          {id:"g_double_support",label:"Double Support",unit:"%", normal:"20",      placeholder:"e.g. 28"},
        ].map(p=>{
          const val=data[p.id]||"";
          return(
            <div key={p.id} style={{background:C.surface,border:`1px solid ${val?C.accent+"25":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:"0.78rem",fontWeight:600,color:val?C.text:C.muted}}>{p.label}{val&&<span style={{color:C.green,marginLeft:5,fontSize:"0.6rem"}}>✓</span>}</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:"0.62rem",color:C.muted}}>Normal: {p.normal} {p.unit}</span>
                  {val&&<span style={{fontSize:"0.72rem",fontWeight:700,color:C.accent}}>{val} {p.unit}</span>}
                </div>
              </div>
              <input type="number" value={val} onChange={e=>set(p.id,e.target.value)} placeholder={p.placeholder} style={inp} step="0.01"/>
            </div>
          );
        })}
        {row("Spatiotemporal notes","g_spatio_notes","textarea")}
      </div>}

      {/* ── TIMED TESTS ── */}
      {tab==="timed"&&<div>
        {[
          {id:"g_tug",   label:"Timed Up & Go (TUG)", unit:"sec", normal:"<12s | Risk >13.5s", note:"Stand from chair, walk 3m, return, sit. Start on 'Go'."},
          {id:"g_10mwt", label:"10 Metre Walk Test",  unit:"sec", normal:"Normal ~1.2 m/s",    note:"Measure middle 10m of 14m course. Calculate speed = 10 ÷ seconds."},
          {id:"g_10mws", label:"10MWT Speed",          unit:"m/s", normal:"1.2 m/s",            note:"10 ÷ time in seconds"},
          {id:"g_6mwt",  label:"6 Minute Walk Test",  unit:"metres",normal:"400–700m",         note:"Walk as far as possible in 6 minutes on flat course."},
          {id:"g_5sts",  label:"5× Sit to Stand",     unit:"sec", normal:"<12s",               note:"From seated, stand fully 5 times without using arms if possible."},
          {id:"g_2mwt",  label:"2 Minute Walk Test",  unit:"metres",normal:"~150m",            note:"Alternative to 6MWT for low-endurance patients."},
        ].map(t=>{
          const val=data[t.id]||"";
          const isTUG=t.id==="g_tug";
          const flagged=isTUG&&parseFloat(val)>=13.5;
          return(
            <div key={t.id} style={{background:C.surface,border:`1px solid ${flagged?C.red+"50":val?C.accent+"25":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:8}}>
                <div>
                  <div style={{fontSize:"0.8rem",fontWeight:700,color:flagged?C.red:val?C.text:C.muted}}>{t.label}{flagged&&" ⚠️"}</div>
                  <div style={{fontSize:"0.67rem",color:C.muted,marginTop:2}}>{t.note}</div>
                </div>
                <span style={{fontSize:"0.62rem",color:C.muted,flexShrink:0,textAlign:"right"}}>Normal: {t.normal}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="number" value={val} onChange={e=>set(t.id,e.target.value)} placeholder="Enter result" step="0.1" style={{...inp,flex:1}}/>
                <span style={{fontSize:"0.76rem",color:C.muted,flexShrink:0}}>{t.unit}</span>
              </div>
              {flagged&&<div style={{marginTop:6,fontSize:"0.72rem",color:C.red,fontWeight:600}}>⚠ TUG ≥13.5s — High fall risk. Refer for falls prevention program.</div>}
            </div>
          );
        })}
      </div>}

      {/* ── SCALES ── */}
      {tab==="scales"&&<div>
        {GAIT_SCALES.map(s=>{
          const val=data[s.id]||"";
          return(
            <div key={s.id} style={{background:C.surface,border:`1px solid ${val?C.accent+"25":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:val?C.text:C.muted}}>{s.label} <span style={{fontWeight:400,fontSize:"0.72rem",color:C.muted}}>({s.full})</span></div>
                  <div style={{fontSize:"0.67rem",color:C.muted,marginTop:2}}>Range: {s.range} | {s.cutoffs}</div>
                </div>
                {val&&<span style={{fontSize:"0.88rem",fontWeight:800,color:C.accent,flexShrink:0}}>{val}</span>}
              </div>
              <input type="number" value={val} onChange={e=>set(s.id,e.target.value)} placeholder={`Score (${s.range})`} style={inp}/>
            </div>
          );
        })}
        {row("Additional scale notes / clinical interpretation","g_scale_notes","textarea")}
      </div>}

      {/* ── ABNORMAL GAIT ── */}
      {tab==="abnormal"&&<div>
        <div style={{background:C.s2,borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:"0.75rem",color:C.muted,lineHeight:1.6}}>
          Mark all patterns observed. Multiple patterns may coexist.
        </div>
        {ABNORMAL_GAITS.map(g=>{
          const val=data[g.id]||"";
          const present=val==="Present";
          return(
            <div key={g.id} style={{background:C.surface,border:`1.5px solid ${present?C.yellow+"60":C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:8,transition:"all 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:present?C.yellow:C.text,marginBottom:3}}>{g.label}</div>
                  <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:2}}><strong style={{color:present?C.accent:C.muted}}>Cause:</strong> {g.cause}</div>
                  <div style={{fontSize:"0.72rem",color:C.muted}}><strong style={{color:present?C.accent:C.muted}}>Sign:</strong> {g.sign}</div>
                </div>
                <select value={val} onChange={e=>set(g.id,e.target.value)} style={{...inp,width:"auto",minWidth:100,flexShrink:0,borderColor:present?C.yellow:C.border}}>
                  <option value="">— screen —</option>
                  <option value="Absent">✓ Absent</option>
                  <option value="Present">⚠ Present</option>
                  <option value="Suspected">? Suspected</option>
                </select>
              </div>
              {present&&<input value={data[g.id+"_note"]||""} onChange={e=>set(g.id+"_note",e.target.value)} placeholder="Severity, side, notes..." style={{...inp,marginTop:8,fontSize:"0.74rem"}}/>}
            </div>
          );
        })}
        {row("Fall Risk Assessment","g_fall_risk","select",["Low","Moderate","High — refer for falls prevention"])}
        {row("Red Flags Present","g_red_flags","select",["None","Sudden neurological change","Unexplained bilateral weakness","Bowel/bladder involvement","Progressive worsening without trauma","Severe unsteadiness — unknown cause"])}
        {data.g_red_flags&&data.g_red_flags!=="None"&&(
          <div style={{padding:"10px 13px",background:"rgba(255,77,109,0.1)",border:`1px solid ${C.red}50`,borderRadius:10,fontSize:"0.76rem",color:C.red,fontWeight:600}}>
            🔴 Red flag identified: {data.g_red_flags} — Urgent medical referral required before continuing physiotherapy.
          </div>
        )}
      </div>}

      {/* ── MUSCLE / JOINT ── */}
      {tab==="muscles"&&<div>
        {[
          {id:"g_weak_primary",  label:"Primary Weak Muscles",      note:"Muscles most contributing to gait deviation"},
          {id:"g_weak_secondary",label:"Secondary/Compensating",    note:"Muscles overworking due to primary weakness"},
          {id:"g_tight",         label:"Tight / Stiff Structures",  note:"Muscles or capsules limiting joint ROM"},
          {id:"g_joint_involved",label:"Joints Involved",           note:"Hip / Knee / Ankle / Spine / SI / Foot"},
        ].map(f=>(
          <div key={f.id} style={{background:C.surface,border:`1px solid ${data[f.id]?C.accent+"25":C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontSize:"0.78rem",fontWeight:600,color:data[f.id]?C.text:C.muted,marginBottom:3}}>{f.label}</div>
            <div style={{fontSize:"0.67rem",color:C.muted,marginBottom:6,fontStyle:"italic"}}>{f.note}</div>
            <textarea value={data[f.id]||""} onChange={e=>set(f.id,e.target.value)} rows={2} placeholder="Describe..." style={{...inp,resize:"vertical",display:"block"}}/>
          </div>
        ))}
        {row("MMT Findings","g_mmt","textarea",null,"List muscle: grade e.g. Glute Med L 3/5, TA R 4/5")}
        {row("ROM Restrictions","g_rom","textarea",null,"List joint: motion: degrees e.g. R hip ext 5° (normal 10°)")}
        {row("Neurological Findings","g_neuro_findings","textarea",null,"Tone, reflexes, sensation relevant to gait")}
      </div>}

      {/* ── PLAN & GOALS ── */}
      {tab==="plan"&&<div>
        <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Short Term Goals (2–4 weeks)</div>
        {row("Goal 1","g_stg1")} {row("Goal 2","g_stg2")} {row("Goal 3","g_stg3")}

        <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a3,marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a3}}/>Long Term Goals (6–12 weeks)</div>
        {row("Goal 1","g_ltg1")} {row("Goal 2","g_ltg2")}

        <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.accent,marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.accent}}/>Treatment Plan</div>
        {[
          {id:"g_tx_strength",  label:"Strengthening",         placeholder:"e.g. Glute med, TA, quad — specify exercises"},
          {id:"g_tx_stretch",   label:"Stretching / Mobility", placeholder:"e.g. Hip flexor, gastroc, hamstring"},
          {id:"g_tx_balance",   label:"Balance Training",      placeholder:"e.g. Single leg stance, perturbation training"},
          {id:"g_tx_gait",      label:"Gait Retraining",       placeholder:"e.g. Step length cues, cadence training, treadmill"},
          {id:"g_tx_nmre",      label:"Neuromuscular Re-ed",   placeholder:"e.g. EMG biofeedback, PNF, functional patterns"},
          {id:"g_tx_device",    label:"Assistive Device",      placeholder:"e.g. Upgrade to rollator, wean from stick"},
          {id:"g_tx_orthotic",  label:"Orthotics / Footwear",  placeholder:"e.g. Lateral heel wedge, custom AFO referral"},
          {id:"g_tx_education", label:"Patient Education",     placeholder:"e.g. Fall prevention, home exercise program"},
        ].map(f=>row(f.label,f.id,"textarea",null,f.placeholder))}

        <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Outcome Measures</div>
        {row("Selected Outcome Measures","g_outcomes","select",["LEFS (lower extremity)","KOOS (knee)","HOOS (hip)","DASH (upper limb compensation)","SF-36 (general health)","WOMAC (osteoarthritis)","LEFS + TUG","KOOS + BBS"])}
        {row("Reassessment Frequency","g_reassess","select",["Every 2 weeks","Every 4 weeks","Every 6 weeks","At discharge"])}
        {row("Discharge Criteria","g_discharge","textarea")}
        {row("Home Program","g_home_prog","select",["Yes — provided","Yes — pending","No"])}
        {row("Clinical Interpretation & Summary","g_summary","textarea",null,"Primary deviation, underlying cause, functional impact, prognosis...")}
      </div>}
    </div>
  );
}

// ─── SIMPLE FIELD INPUTS ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME MEASURES MODULE — Full scored questionnaires with interpretation
// ═══════════════════════════════════════════════════════════════════════════════

const OUTCOME_DB = {
  // ── PAIN ────────────────────────────────────────────────────────────────────
  nrs: {
    id:"nrs", label:"NRS — Numerical Rating Scale", icon:"🔢", category:"Pain",
    description:"0–10 numeric pain rating. MCID = 2 points. Widely used, quick, valid for all musculoskeletal conditions.",
    fields:[
      {id:"nrs_rest",   label:"Pain at REST",     type:"slider", min:0, max:10, step:1},
      {id:"nrs_active", label:"Pain with MOVEMENT",type:"slider", min:0, max:10, step:1},
      {id:"nrs_worst",  label:"WORST pain (24h)",  type:"slider", min:0, max:10, step:1},
      {id:"nrs_best",   label:"BEST pain (24h)",   type:"slider", min:0, max:10, step:1},
    ],
    score:(v)=>{
      const vals=[v.nrs_rest,v.nrs_active,v.nrs_worst,v.nrs_best].filter(x=>x!==undefined&&x!=="");
      if(!vals.length) return null;
      return Math.round(vals.reduce((a,b)=>a+ +b,0)/vals.length*10)/10;
    },
    maxScore:10,
    interpret:(s)=> s<=3?{label:"Mild",color:"#00c97a",text:"Mild pain — may not limit function significantly. Monitor and reassess."}
      :s<=6?{label:"Moderate",color:"#ffb300",text:"Moderate pain — likely affecting daily activities. Active treatment indicated."}
      :{label:"Severe",color:"#ff4d6d",text:"Severe pain — significant functional limitation. Prioritise pain management."},
    mcid:2, unit:"/10",
  },

  vas: {
    id:"vas", label:"VAS — Visual Analogue Scale", icon:"📏", category:"Pain",
    description:"100mm line from 'no pain' to 'worst imaginable pain'. MCID = 15mm. More sensitive than NRS for detecting small changes.",
    fields:[
      {id:"vas_current", label:"Current pain (0–100mm)", type:"slider", min:0, max:100, step:1},
      {id:"vas_average", label:"Average pain past week (0–100mm)", type:"slider", min:0, max:100, step:1},
    ],
    score:(v)=> v.vas_current!==undefined&&v.vas_current!==""? +v.vas_current : null,
    maxScore:100,
    interpret:(s)=> s<=30?{label:"Mild",color:"#00c97a",text:"Mild pain (≤30mm). Monitor — reassess at 4 weeks."}
      :s<=60?{label:"Moderate",color:"#ffb300",text:"Moderate pain (31–60mm). Active treatment required."}
      :{label:"Severe",color:"#ff4d6d",text:"Severe pain (>60mm). Aggressive pain management strategy needed."},
    mcid:15, unit:"mm",
  },

  psfs: {
    id:"psfs", label:"PSFS — Patient Specific Functional Scale", icon:"🎯", category:"Function",
    description:"Patient identifies 3 most important activities they cannot perform or have difficulty with. Scored 0–10 each. MCID = 2 points average. Excellent for tracking individual goals.",
    fields:[
      {id:"psfs_act1",   label:"Activity 1 (describe)", type:"text",   placeholder:"e.g. Walking up stairs"},
      {id:"psfs_score1", label:"Activity 1 score",      type:"slider", min:0, max:10, step:1},
      {id:"psfs_act2",   label:"Activity 2 (describe)", type:"text",   placeholder:"e.g. Sitting >30 min"},
      {id:"psfs_score2", label:"Activity 2 score",      type:"slider", min:0, max:10, step:1},
      {id:"psfs_act3",   label:"Activity 3 (describe)", type:"text",   placeholder:"e.g. Returning to running"},
      {id:"psfs_score3", label:"Activity 3 score",      type:"slider", min:0, max:10, step:1},
    ],
    score:(v)=>{
      const scores=[v.psfs_score1,v.psfs_score2,v.psfs_score3].filter(x=>x!==undefined&&x!=="");
      if(!scores.length) return null;
      return Math.round(scores.reduce((a,b)=>a+ +b,0)/scores.length*10)/10;
    },
    maxScore:10,
    interpret:(s)=> s>=7?{label:"Good function",color:"#00c97a",text:"Good self-reported function on selected activities. Reassess goals."}
      :s>=4?{label:"Moderate limitation",color:"#ffb300",text:"Moderate limitation on patient-priority activities. Goal-directed treatment."}
      :{label:"Severe limitation",color:"#ff4d6d",text:"Severe limitation. Focus treatment on patient's priority functional goals."},
    mcid:2, unit:"/10 avg",
  },

  // ── SPINE ───────────────────────────────────────────────────────────────────
  odi: {
    id:"odi", label:"ODI — Oswestry Disability Index", icon:"🦴", category:"Spine — Lumbar",
    description:"10 sections, each scored 0–5. Total expressed as %. Gold standard for low back disability. MCID = 10%.",
    fields:[
      {id:"odi_pain",      label:"1. Pain intensity",        type:"select", options:["0 — No pain","1 — Very mild","2 — Moderate","3 — Fairly severe","4 — Very severe","5 — Worst imaginable"]},
      {id:"odi_personal",  label:"2. Personal care (washing/dressing)",type:"select",options:["0 — Normal, no extra pain","1 — Normal but painful","2 — Slow and careful","3 — Need some help","4 — Need help every day","5 — Unable to dress, painful to wash"]},
      {id:"odi_lifting",   label:"3. Lifting",               type:"select", options:["0 — Heavy without extra pain","1 — Heavy but extra pain","2 — Unable to lift floor but OK table","3 — Unable to lift heavy floor, light if positioned","4 — Can lift only very light","5 — Cannot lift at all"]},
      {id:"odi_walking",   label:"4. Walking",               type:"select", options:["0 — No limitation","1 — Pain <1 mile","2 — Pain <0.5 mile","3 — Pain <100m","4 — Only with stick/crutches","5 — Mostly in bed"]},
      {id:"odi_sitting",   label:"5. Sitting",               type:"select", options:["0 — Any chair as long as I like","1 — Favourite chair only as long as I like","2 — >1 hour","3 — >30 min","4 — >10 min","5 — Cannot sit at all"]},
      {id:"odi_standing",  label:"6. Standing",              type:"select", options:["0 — As long as I like","1 — >1 hour","2 — >30 min","3 — >10 min","4 — With extra pain","5 — Cannot stand"]},
      {id:"odi_sleeping",  label:"7. Sleeping",              type:"select", options:["0 — No problem","1 — Occasional disturbance due to pain","2 — <6 hours due to pain","3 — <4 hours due to pain","4 — <2 hours due to pain","5 — Cannot sleep"]},
      {id:"odi_sex",       label:"8. Sex life (if applicable)",type:"select",options:["0 — Normal, no extra pain","1 — Normal but painful","2 — Nearly normal, very painful","3 — Severely restricted by pain","4 — Nearly absent by pain","5 — N/A"]},
      {id:"odi_social",    label:"9. Social life",           type:"select", options:["0 — Normal, no extra pain","1 — Normal but extra pain","2 — No significant effect except energetic activities","3 — Restricted and home-based","4 — No social life due to pain","5 — No social life, pain everywhere"]},
      {id:"odi_travel",    label:"10. Travelling",           type:"select", options:["0 — Anywhere, no extra pain","1 — Anywhere but extra pain","2 — >2 hours but extra pain","3 — <1 hour due to pain","4 — <30 min due to pain","5 — Only to doctor/hospital"]},
    ],
    score:(v)=>{
      const ids=["odi_pain","odi_personal","odi_lifting","odi_walking","odi_sitting","odi_standing","odi_sleeping","odi_sex","odi_social","odi_travel"];
      const scores=ids.map(id=>v[id]? +v[id].split(" — ")[0] : null).filter(x=>x!==null);
      if(!scores.length) return null;
      return Math.round(scores.reduce((a,b)=>a+b,0)/(scores.length*5)*100);
    },
    maxScore:100,
    interpret:(s)=> s<=20?{label:"Minimal disability",color:"#00c97a",text:"0–20%: Minimal disability. Patient can manage most activities. Advice on lifting/posture."}
      :s<=40?{label:"Moderate disability",color:"#22d3ee",text:"21–40%: Moderate disability. Pain interferes with sitting, lifting, standing. Conservative management."}
      :s<=60?{label:"Severe disability",color:"#ffb300",text:"41–60%: Severe disability. Pain main problem. Detailed investigation and active treatment."}
      :s<=80?{label:"Crippling",color:"#ff8c00",text:"61–80%: Crippling back pain. Affects all aspects of life. MDT approach."}
      :{label:"Bed-bound",color:"#ff4d6d",text:"81–100%: Bed-bound or exaggerated symptoms. Psychosocial factors likely. Urgent review."},
    mcid:10, unit:"%",
  },

  ndi: {
    id:"ndi", label:"NDI — Neck Disability Index", icon:"🔄", category:"Spine — Cervical",
    description:"10 sections scored 0–5. Total as %. Gold standard for cervical spine disability. MCID = 7.5%.",
    fields:[
      {id:"ndi_pain",      label:"1. Pain intensity",     type:"select", options:["0 — No pain","1 — Very mild","2 — Moderate","3 — Fairly severe","4 — Very severe","5 — Worst imaginable"]},
      {id:"ndi_personal",  label:"2. Personal care",      type:"select", options:["0 — Normal, no extra pain","1 — Normal but painful","2 — Slow and careful","3 — Some help needed","4 — Help every day needed","5 — Unable to care for myself"]},
      {id:"ndi_lifting",   label:"3. Lifting",            type:"select", options:["0 — Lift heavy without extra pain","1 — Lift heavy but extra pain","2 — Cannot lift heavy from floor","3 — Cannot lift heavy from table","4 — Can lift only very light","5 — Cannot lift at all"]},
      {id:"ndi_reading",   label:"4. Reading",            type:"select", options:["0 — As long as I like","1 — As long as I like with slight pain","2 — As long as I like with moderate pain","3 — Not as long as I like","4 — Hardly at all due to pain","5 — Cannot read at all"]},
      {id:"ndi_headache",  label:"5. Headaches",          type:"select", options:["0 — No headaches at all","1 — Slight, infrequent","2 — Moderate, infrequent","3 — Moderate, frequent","4 — Severe, frequent","5 — All the time"]},
      {id:"ndi_concentration",label:"6. Concentration",  type:"select", options:["0 — No difficulty","1 — Slight difficulty","2 — Moderate difficulty","3 — Great difficulty","4 — Very great difficulty","5 — Cannot concentrate at all"]},
      {id:"ndi_work",      label:"7. Work",               type:"select", options:["0 — As much as I like","1 — Usual work but no more","2 — Most usual work but not more","3 — Cannot do usual work","4 — Hardly any work","5 — Cannot do any work"]},
      {id:"ndi_driving",   label:"8. Driving",            type:"select", options:["0 — Without any pain","1 — With slight pain","2 — With moderate pain","3 — With severe pain","4 — Hardly at all","5 — Cannot drive"]},
      {id:"ndi_sleeping",  label:"9. Sleeping",           type:"select", options:["0 — No problem","1 — Slight difficulty","2 — Moderate difficulty","3 — Great difficulty","4 — Very great difficulty","5 — Cannot sleep"]},
      {id:"ndi_recreation",label:"10. Recreation",        type:"select", options:["0 — No limitation","1 — Slight limitation","2 — Moderate limitation","3 — Significant limitation","4 — Hardly any recreation","5 — No recreation"]},
    ],
    score:(v)=>{
      const ids=["ndi_pain","ndi_personal","ndi_lifting","ndi_reading","ndi_headache","ndi_concentration","ndi_work","ndi_driving","ndi_sleeping","ndi_recreation"];
      const scores=ids.map(id=>v[id]? +v[id].split(" — ")[0] : null).filter(x=>x!==null);
      if(!scores.length) return null;
      return Math.round(scores.reduce((a,b)=>a+b,0)/(scores.length*5)*100);
    },
    maxScore:100,
    interpret:(s)=> s<=8?{label:"No disability",color:"#00c97a",text:"0–8%: No disability."}
      :s<=28?{label:"Mild disability",color:"#22d3ee",text:"9–28%: Mild disability. Self-care advice, ergonomics, exercise."}
      :s<=48?{label:"Moderate disability",color:"#ffb300",text:"29–48%: Moderate disability. Conservative management, manual therapy."}
      :s<=64?{label:"Severe disability",color:"#ff8c00",text:"49–64%: Severe disability. Multidisciplinary approach."}
      :{label:"Complete disability",color:"#ff4d6d",text:"65–100%: Complete disability. Psychosocial + medical review needed."},
    mcid:8, unit:"%",
  },

  // ── UPPER LIMB ─────────────────────────────────────────────────────────────
  dash: {
    id:"dash", label:"DASH — Disabilities of Arm, Shoulder & Hand", icon:"💪", category:"Upper Limb",
    description:"30-item questionnaire measuring physical function and symptoms in upper limb conditions. Score 0–100 (higher = more disability). MCID = 10.2.",
    fields:[
      {id:"dash_q1",  label:"Open a tight jar",                    type:"select5"},
      {id:"dash_q2",  label:"Write",                               type:"select5"},
      {id:"dash_q3",  label:"Turn a key",                          type:"select5"},
      {id:"dash_q4",  label:"Prepare a meal",                      type:"select5"},
      {id:"dash_q5",  label:"Push open a heavy door",              type:"select5"},
      {id:"dash_q6",  label:"Place an object overhead",            type:"select5"},
      {id:"dash_q7",  label:"Strenuous household chores",          type:"select5"},
      {id:"dash_q8",  label:"Garden/yard work",                    type:"select5"},
      {id:"dash_q9",  label:"Make a bed",                          type:"select5"},
      {id:"dash_q10", label:"Carry a shopping bag",                type:"select5"},
      {id:"dash_q11", label:"Carry heavy object (>5kg)",           type:"select5"},
      {id:"dash_q12", label:"Change a lightbulb overhead",         type:"select5"},
      {id:"dash_q13", label:"Wash/blow dry your hair",             type:"select5"},
      {id:"dash_q14", label:"Wash your back",                      type:"select5"},
      {id:"dash_q15", label:"Put on a pullover sweater",           type:"select5"},
      {id:"dash_q16", label:"Use a knife to cut food",             type:"select5"},
      {id:"dash_q17", label:"Recreational activities — little effort", type:"select5"},
      {id:"dash_q18", label:"Recreational activities — taking some force/impact",type:"select5"},
      {id:"dash_q19", label:"Recreational activities — free movement of arm",   type:"select5"},
      {id:"dash_q20", label:"Transport yourself from place to place",            type:"select5"},
      {id:"dash_q21", label:"Sexual activities",                   type:"select5"},
      {id:"dash_q22", label:"Past week — arm/shoulder/hand pain",  type:"select5"},
      {id:"dash_q23", label:"Past week — tingling (pins/needles)", type:"select5"},
      {id:"dash_q24", label:"Past week — weakness",                type:"select5"},
      {id:"dash_q25", label:"Past week — stiffness",               type:"select5"},
      {id:"dash_q26", label:"Sleep difficulty due to arm/shoulder/hand",type:"select5"},
      {id:"dash_q27", label:"Feel less capable, confident due to arm",  type:"select5"},
      {id:"dash_q28", label:"Interfere with social activities",    type:"select5"},
      {id:"dash_q29", label:"Limited in work/daily activities",    type:"select5"},
      {id:"dash_q30", label:"Tingling in arm/shoulder/hand",       type:"select5"},
    ],
    score:(v)=>{
      const ids=Array.from({length:30},(_,i)=>`dash_q${i+1}`);
      const scores=ids.map(id=>v[id]? +v[id] : null).filter(x=>x!==null);
      if(scores.length<27) return null;
      return Math.round((scores.reduce((a,b)=>a+b,0)/scores.length - 1)*25);
    },
    maxScore:100,
    interpret:(s)=> s<=20?{label:"Minimal disability",color:"#00c97a",text:"Minimal upper limb disability. Return to normal activity with guidance."}
      :s<=40?{label:"Mild disability",color:"#22d3ee",text:"Mild disability. Conservative treatment, activity modification."}
      :s<=60?{label:"Moderate disability",color:"#ffb300",text:"Moderate disability. Active rehabilitation programme indicated."}
      :{label:"Severe disability",color:"#ff4d6d",text:"Severe disability. Comprehensive assessment — consider surgical opinion if conservative fails."},
    mcid:10, unit:"/100",
  },

  // ── LOWER LIMB ─────────────────────────────────────────────────────────────
  lefs: {
    id:"lefs", label:"LEFS — Lower Extremity Functional Scale", icon:"🦵", category:"Lower Limb",
    description:"20 activities scored 0–4 each. Total /80. Higher = better function. MCID = 9 points.",
    fields: [
      "Usual work/housework/school",
      "Usual hobbies/recreational activities",
      "Getting into/out of bath",
      "Walking between rooms",
      "Put on socks/stockings",
      "Lying in bed",
      "Washing/drying both feet",
      "Light activities at home",
      "Walking outdoors on even ground",
      "Going up/down 1 flight of stairs",
      "Getting into/out of car",
      "Walking 2 blocks",
      "Walking a mile",
      "Going up/down 10 flights of stairs",
      "Running on even ground",
      "Running on uneven ground",
      "Making sharp turns while running fast",
      "Hopping",
      "Rolling over in bed",
      "Squatting",
    ].map((label,i)=>({id:`lefs_q${i+1}`, label, type:"select_lefs"})),
    score:(v)=>{
      const ids=Array.from({length:20},(_,i)=>`lefs_q${i+1}`);
      const scores=ids.map(id=>v[id]!==undefined&&v[id]!==""? +v[id]:null).filter(x=>x!==null);
      if(!scores.length) return null;
      return scores.reduce((a,b)=>a+b,0);
    },
    maxScore:80,
    interpret:(s)=> s>=60?{label:"Minimal limitation",color:"#00c97a",text:"60–80: Minimal limitation. Discharge planning or sports rehabilitation."}
      :s>=40?{label:"Moderate limitation",color:"#ffb300",text:"40–59: Moderate limitation. Active rehabilitation."}
      :{label:"Severe limitation",color:"#ff4d6d",text:"<40: Severe limitation. Comprehensive rehab programme required."},
    mcid:9, unit:"/80",
  },

  koos: {
    id:"koos", label:"KOOS — Knee Injury & OA Outcome Score", icon:"🦴", category:"Lower Limb — Knee",
    description:"42 items across 5 subscales. Each 0–100 (100 = no problems). MCID = 8–10 per subscale. Gold standard for knee conditions.",
    fields:[
      {id:"koos_pain_avg",  label:"Pain subscale — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
      {id:"koos_sym_avg",   label:"Symptoms subscale — average (0=always, 4=never)", type:"slider", min:0, max:4, step:1},
      {id:"koos_adl_avg",   label:"ADL subscale — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
      {id:"koos_sport_avg", label:"Sport/Recreation subscale — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
      {id:"koos_qol_avg",   label:"Knee-related Quality of Life — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
    ],
    score:(v)=>{
      const ids=["koos_pain_avg","koos_sym_avg","koos_adl_avg","koos_sport_avg","koos_qol_avg"];
      const scores=ids.map(id=>v[id]!==undefined&&v[id]!==""? +v[id]:null).filter(x=>x!==null);
      if(!scores.length) return null;
      return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length/4*100);
    },
    maxScore:100,
    interpret:(s)=> s>=80?{label:"Good function",color:"#00c97a",text:"Good knee function. Maintenance and prevention programme."}
      :s>=60?{label:"Moderate function",color:"#ffb300",text:"Moderate limitation. Structured knee rehabilitation."}
      :{label:"Poor function",color:"#ff4d6d",text:"Poor function. Comprehensive assessment — surgical opinion if conservative fails."},
    mcid:10, unit:"/100",
  },

  hoos: {
    id:"hoos", label:"HOOS — Hip Injury & OA Outcome Score", icon:"🦴", category:"Lower Limb — Hip",
    description:"40 items across 5 subscales. Each 0–100 (100 = no problems). MCID = 8–10. Gold standard for hip conditions.",
    fields:[
      {id:"hoos_pain_avg",  label:"Pain subscale — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
      {id:"hoos_sym_avg",   label:"Symptoms subscale — average (0=always, 4=never)", type:"slider", min:0, max:4, step:1},
      {id:"hoos_adl_avg",   label:"ADL subscale — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
      {id:"hoos_sport_avg", label:"Sport/Recreation subscale — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
      {id:"hoos_qol_avg",   label:"Hip-related Quality of Life — average (0=extreme, 4=none)", type:"slider", min:0, max:4, step:1},
    ],
    score:(v)=>{
      const ids=["hoos_pain_avg","hoos_sym_avg","hoos_adl_avg","hoos_sport_avg","hoos_qol_avg"];
      const scores=ids.map(id=>v[id]!==undefined&&v[id]!==""? +v[id]:null).filter(x=>x!==null);
      if(!scores.length) return null;
      return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length/4*100);
    },
    maxScore:100,
    interpret:(s)=> s>=80?{label:"Good function",color:"#00c97a",text:"Good hip function."}
      :s>=60?{label:"Moderate function",color:"#ffb300",text:"Moderate limitation. Structured hip rehabilitation."}
      :{label:"Poor function",color:"#ff4d6d",text:"Poor function. Comprehensive assessment required."},
    mcid:10, unit:"/100",
  },

  // ── PSYCHOLOGICAL ──────────────────────────────────────────────────────────
  tsk: {
    id:"tsk", label:"TSK-11 — Tampa Scale of Kinesiophobia", icon:"🧠", category:"Psychological",
    description:"11 items scored 1–4. Total 11–44. Higher = more fear of movement. MCID = 3.8. Critical for identifying fear-avoidance pattern.",
    fields: [
      "I'm afraid that I might injure myself if I exercise",
      "If I were to try to overcome my pain, it would increase",
      "My body is telling me I have something dangerously wrong",
      "My pain would probably be relieved if I exercised",
      "People aren't taking my medical condition seriously enough",
      "My accident has put my body at risk for the rest of my life",
      "Pain always means I have injured my body",
      "Just because something aggravates my pain doesn't mean it's dangerous",
      "I am afraid that I might injure myself accidentally",
      "Simply being careful that I do not make any unnecessary movements is the safest thing for me",
      "I wouldn't have this much pain if there weren't something potentially dangerous going on",
    ].map((label,i)=>({id:`tsk_q${i+1}`, label:`${i+1}. ${label}`, type:"select_tsk"})),
    score:(v)=>{
      const ids=Array.from({length:11},(_,i)=>`tsk_q${i+1}`);
      // Reverse score items 4 and 8
      const reverse=[3,7]; // 0-indexed
      const scores=ids.map((id,i)=>{
        if(v[id]===undefined||v[id]==="") return null;
        const raw= +v[id];
        return reverse.includes(i)?5-raw:raw;
      }).filter(x=>x!==null);
      if(!scores.length) return null;
      return scores.reduce((a,b)=>a+b,0);
    },
    maxScore:44,
    interpret:(s)=> s<29?{label:"Low kinesiophobia",color:"#00c97a",text:"<29: Low fear of movement. Normal graded activity appropriate."}
      :s<37?{label:"Moderate kinesiophobia",color:"#ffb300",text:"29–36: Moderate. Pain neuroscience education + graded exposure indicated."}
      :{label:"High kinesiophobia",color:"#ff4d6d",text:"≥37: High fear of movement. Psychological co-management strongly recommended. Avoid biomedical language."},
    mcid:4, unit:"/44",
  },

  fabq: {
    id:"fabq", label:"FABQ — Fear Avoidance Beliefs Questionnaire", icon:"⚠", category:"Psychological",
    description:"16 items on 0–6 scale. Two subscales: Physical Activity (FABQ-PA, 4 items) and Work (FABQ-W, 7 items). High scores predict chronicity.",
    fields:[
      {id:"fabq_pa1", label:"PA1. My pain was caused by physical activity", type:"select_fabq"},
      {id:"fabq_pa2", label:"PA2. Physical activity makes my pain worse",   type:"select_fabq"},
      {id:"fabq_pa3", label:"PA3. Physical activity might harm my back",    type:"select_fabq"},
      {id:"fabq_pa4", label:"PA4. I should not do physical activity which makes pain worse", type:"select_fabq"},
      {id:"fabq_w5",  label:"W5. Pain was caused by my work",               type:"select_fabq"},
      {id:"fabq_w6",  label:"W6. Work made/makes pain worse",               type:"select_fabq"},
      {id:"fabq_w7",  label:"W7. My work might harm my back",               type:"select_fabq"},
      {id:"fabq_w9",  label:"W9. I should not do my normal work with pain", type:"select_fabq"},
      {id:"fabq_w10", label:"W10. Cannot do normal work with current pain", type:"select_fabq"},
      {id:"fabq_w11", label:"W11. Cannot do my normal work even if I tried",type:"select_fabq"},
      {id:"fabq_w15", label:"W15. Work is too heavy for me with pain",      type:"select_fabq"},
    ],
    score:(v)=>{
      const pa=["fabq_pa1","fabq_pa2","fabq_pa3","fabq_pa4"].map(id=>v[id]!==undefined&&v[id]!==""? +v[id]:null).filter(x=>x!==null);
      const w=["fabq_w5","fabq_w6","fabq_w7","fabq_w9","fabq_w10","fabq_w11","fabq_w15"].map(id=>v[id]!==undefined&&v[id]!==""? +v[id]:null).filter(x=>x!==null);
      if(!pa.length&&!w.length) return null;
      return {pa:pa.reduce((a,b)=>a+b,0), w:w.reduce((a,b)=>a+b,0)};
    },
    maxScore:null,
    interpret:(s)=>{
      if(!s||typeof s==="number") return {label:"—",color:"#7e6a9a",text:"Complete both subscales."};
      const paHigh=s.pa>15, wHigh=s.w>34;
      if(paHigh&&wHigh) return {label:"High risk (both)",color:"#ff4d6d",text:`PA: ${s.pa}/24 (HIGH) | Work: ${s.w}/42 (HIGH). Strong predictor of chronic pain and work disability. Pain neuroscience education + graded exposure + occupational rehab.`};
      if(wHigh) return {label:"High work fear",color:"#ff8c00",text:`PA: ${s.pa}/24 | Work: ${s.w}/42 (HIGH). Occupational rehabilitation and work hardening indicated.`};
      if(paHigh) return {label:"High activity fear",color:"#ffb300",text:`PA: ${s.pa}/24 (HIGH) | Work: ${s.w}/42. Graded activity exposure + pain education.`};
      return {label:"Low fear avoidance",color:"#00c97a",text:`PA: ${s.pa}/24 | Work: ${s.w}/42. Low fear-avoidance. Normal graded rehabilitation appropriate.`};
    },
    mcid:null, unit:"dual subscale",
  },

  // ── SPORT ──────────────────────────────────────────────────────────────────
  acl_rsi: {
    id:"acl_rsi", label:"ACL-RSI — Return to Sport after ACL", icon:"⚽", category:"Sport",
    description:"12 items scored 0–10. Mean score /100. Measures psychological readiness to return to sport after ACL injury/reconstruction. MCID = 14.8.",
    fields:[
      "I am afraid of re-injuring my knee when I return to sport",
      "I feel relaxed about playing sport",
      "I am confident I can perform at my previous level of sport",
      "I feel that I am unlikely to re-injure my knee",
      "I feel nervous about playing sport",
      "It is likely that I will re-injure my knee",
      "I feel hopeful about returning to sport",
      "I feel that my knee will not stop me from performing to my potential",
      "I am scared of accidentally hitting my knee when I return to sport",
      "I feel optimistic about the future of my sporting career",
      "I feel devastated about the impact of my knee injury on my career",
      "I believe I will perform with confidence when I return to sport",
    ].map((label,i)=>({id:`acl_q${i+1}`, label:`${i+1}. ${label}`, type:"slider", min:0, max:10, step:1})),
    score:(v)=>{
      const ids=Array.from({length:12},(_,i)=>`acl_q${i+1}`);
      const scores=ids.map(id=>v[id]!==undefined&&v[id]!==""? +v[id]:null).filter(x=>x!==null);
      if(!scores.length) return null;
      return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10);
    },
    maxScore:100,
    interpret:(s)=> s>=65?{label:"Psychologically ready",color:"#00c97a",text:"≥65: Psychologically ready for RTS. Proceed with sport-specific training."}
      :s>=40?{label:"Moderate readiness",color:"#ffb300",text:"40–64: Moderate psychological readiness. Address specific fears before RTS."}
      :{label:"Not ready",color:"#ff4d6d",text:"<40: Psychological barrier to RTS. Psychology referral recommended alongside physical rehab."},
    mcid:15, unit:"/100",
  },
};

// ─── Category colours ─────────────────────────────────────────────────────────
const OM_CAT_COLOR = {
  "Pain":"#ff4d6d", "Function":"#00e5ff", "Spine — Lumbar":"#ffb300",
  "Spine — Cervical":"#ff8c00", "Upper Limb":"#7f5af0", "Lower Limb":"#00c97a",
  "Lower Limb — Knee":"#22d3ee", "Lower Limb — Hip":"#34d399",
  "Psychological":"#f97316", "Sport":"#a3e635",
};

// ─── Select options helpers ───────────────────────────────────────────────────
const DASH_OPTS    = ["1 — No difficulty","2 — Mild difficulty","3 — Moderate difficulty","4 — Severe difficulty","5 — Unable"];
const LEFS_OPTS    = ["0 — Extreme difficulty / unable","1 — Quite a bit of difficulty","2 — Moderate difficulty","3 — A little bit of difficulty","4 — No difficulty"];
const TSK_OPTS     = ["1 — Strongly disagree","2 — Somewhat disagree","3 — Somewhat agree","4 — Strongly agree"];
const FABQ_OPTS    = ["0 — Completely disagree","1","2","3 — Unsure","4","5","6 — Completely agree"];

// ─── Slider component ────────────────────────────────────────────────────────
function OMSlider({id, min=0, max=10, step=1, value, onChange, showVal=true}){
  const pct = max===min?0:((+value-min)/(max-min))*100;
  const col  = pct<=30?"#00c97a":pct<=60?"#ffb300":"#ff4d6d";
  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:"0.65rem",color:"#7e6a9a",minWidth:14}}>{min}</span>
      <div style={{flex:1,position:"relative",height:24,display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",width:"100%",height:4,background:"#ede7f6",borderRadius:2}}/>
        <div style={{position:"absolute",width:`${pct}%`,height:4,background:col,borderRadius:2,transition:"width 0.15s"}}/>
        <input type="range" min={min} max={max} step={step} value={value??min}
          onChange={e=>onChange(e.target.value)}
          style={{position:"absolute",width:"100%",opacity:0,height:24,cursor:"pointer",zIndex:2}}/>
        <div style={{position:"absolute",left:`${pct}%`,transform:"translateX(-50%)",width:16,height:16,borderRadius:"50%",background:col,border:"2px solid #d8cce8",transition:"left 0.15s",pointerEvents:"none"}}/>
      </div>
      <span style={{fontSize:"0.65rem",color:"#7e6a9a",minWidth:14,textAlign:"right"}}>{max}</span>
      {showVal&&<span style={{minWidth:28,fontSize:"0.78rem",fontWeight:800,color:col,textAlign:"right"}}>{value??"-"}</span>}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({score, maxScore, color, size=80}){
  const pct  = maxScore?Math.min(100,Math.round(score/maxScore*100)):0;
  const r    = (size-8)/2;
  const circ = 2*Math.PI*r;
  const dash = circ*(1-pct/100);
  return(
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a2d45" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dashoffset 0.5s ease"}}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size*0.18} fontWeight="800" fill={color}>{score}</text>
    </svg>
  );
}

// ─── Outcome score severity helpers ──────────────────────────────────────────
const LOWER_IS_BETTER = ["odi","ndi","dash","tsk","vas","nrs","fabq"];
function isImproved(id, change) { return LOWER_IS_BETTER.includes(id) ? change < 0 : change > 0; }

// ─── Score Gauge Bar ──────────────────────────────────────────────────────────
function ScoreGauge({ score, maxScore, color, label, mcid }) {
  const pct = maxScore ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
        <span style={{ fontSize:"0.62rem", color:"#7e6a9a" }}>{label}</span>
        <span style={{ fontSize:"1rem", fontWeight:900, color, fontFamily:"monospace" }}>{score}<span style={{ fontSize:"0.6rem", color:"#7e6a9a", fontWeight:400 }}>/{maxScore}</span></span>
      </div>
      <div style={{ height:8, background:"#ede7f6", borderRadius:4, overflow:"hidden", position:"relative" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:4, transition:"width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}/>
        {mcid && maxScore && (
          <div style={{ position:"absolute", top:0, left:`${Math.min(100,(mcid/maxScore)*100)}%`, width:2, height:"100%", background:"rgba(255,255,255,0.3)" }} title={`MCID: ${mcid}`}/>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
        <span style={{ fontSize:"0.5rem", color:"#3a5070" }}>0</span>
        {mcid && <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)" }}>MCID: {mcid}</span>}
        <span style={{ fontSize:"0.5rem", color:"#3a5070" }}>{maxScore}</span>
      </div>
    </div>
  );
}

// ─── Mini sparkline chart ─────────────────────────────────────────────────────
function Sparkline({ values, color, improved }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const W = 120, H = 36;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - ((v - min) / range) * (H - 6) - 3
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} style={{ overflow:"visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill={i === pts.length - 1 ? color : "#1a2d45"} stroke={color} strokeWidth={1.5}/>
      ))}
    </svg>
  );
}

// ─── OutcomeMeasuresModule ────────────────────────────────────────────────────
function OutcomeMeasuresModule() {
  const categories = [...new Set(Object.values(OUTCOME_DB).map(m => m.category))];
  const [catFilter,   setCatFilter]   = useState("All");
  const [active,      setActive]      = useState(null);
  const [answers,     setAnswers]     = useState({});
  const [sessions,    setSessions]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("physio_om_sessions") || "[]"); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [toast,       setToast]       = useState(null);
  const [expandCards, setExpandCards] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const setField = (qid, fid, val) => setAnswers(a => ({ ...a, [qid]: { ...a[qid], [fid]: val } }));

  const filteredMeasures = Object.values(OUTCOME_DB).filter(m => catFilter === "All" || m.category === catFilter);

  const getScore = (m) => {
    const v = answers[m.id] || {};
    return m.score(v);
  };

  const completedCount = Object.values(OUTCOME_DB).filter(m => getScore(m) !== null).length;

  const saveSession = () => {
    const snap = { date: new Date().toLocaleString("en-GB"), scores: {}, timestamp: Date.now() };
    Object.values(OUTCOME_DB).forEach(m => { const s = getScore(m); if (s !== null) snap.scores[m.id] = s; });
    if (!Object.keys(snap.scores).length) { showToast("No completed measures to save", "warn"); return; }
    const updated = [...sessions, snap];
    setSessions(updated);
    try { localStorage.setItem("physio_om_sessions", JSON.stringify(updated.slice(-20))); } catch {}
    showToast(`✅ Session ${updated.length} saved — ${Object.keys(snap.scores).length} measures recorded`);
  };

  const clearHistory = () => {
    if (!window.confirm("Clear all session history? This cannot be undone.")) return;
    setSessions([]);
    try { localStorage.removeItem("physio_om_sessions"); } catch {}
    showToast("History cleared");
  };

  const exportSessionsPDF = () => {
    const scored = Object.values(OUTCOME_DB).filter(m => getScore(m) !== null);
    if (!scored.length) { showToast("No completed measures to export", "warn"); return; }
    const rows = scored.map(m => {
      const score = getScore(m);
      const interp = typeof score !== "object" ? m.interpret(score) : null;
      const history = sessions.map(s => s.scores[m.id]).filter(v => v !== undefined);
      const change = history.length >= 2 ? history[history.length - 1] - history[0] : null;
      return { m, score, interp, history, change };
    });
    const metaRight = `<div><strong>Date:</strong> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div><div><strong>Completed Measures:</strong> ${scored.length}</div><div><strong>Sessions Recorded:</strong> ${sessions.length}</div>`;
    const bodyHTML = `
      <span class="badge badge-purple">OUTCOME MEASURES REPORT</span>
      ${rows.map(({ m, score, interp, history, change }) => `
        <div class="no-break" style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;">
          <div style="background:#0369a1;color:#fff;padding:8px 13px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:15px">${m.icon}</span>
            <span style="font-size:12px;font-weight:800;">${m.label}</span>
            <span style="margin-left:auto;font-size:9px;opacity:0.8">${m.category}</span>
          </div>
          <div style="padding:10px 13px;">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;">
              <div style="font-size:28px;font-weight:900;color:${interp?.color || "#0369a1"}">${typeof score === "object" ? `PA:${score.pa} / W:${score.w}` : score}${m.unit}</div>
              ${interp ? `<div style="flex:1"><div style="font-weight:700;color:${interp.color};font-size:11px">${interp.label}</div><div style="font-size:10px;color:#374151;margin-top:2px;line-height:1.5">${interp.text}</div></div>` : ""}
            </div>
            ${m.mcid ? `<div style="font-size:9px;color:#64748b;margin-bottom:6px">MCID = ${m.mcid}${m.unit} (minimum clinically important difference)</div>` : ""}
            ${history.length >= 2 && change !== null ? `
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:6px 10px;font-size:10px;">
                <strong>Progress:</strong> ${history.join(" → ")}${m.unit}
                &nbsp;|&nbsp; <strong style="color:${isImproved(m.id, change) ? "#15803d" : "#b91c1c"}">${change > 0 ? "+" : ""}${Math.round(change * 10) / 10}${m.unit} ${isImproved(m.id, change) ? "▲ Improved" : "▼ Declined"}</strong>
                ${Math.abs(change) >= (m.mcid || 0) ? `&nbsp;·&nbsp; <strong style="color:#15803d">Clinically significant</strong>` : ""}
              </div>` : ""}
          </div>
        </div>`).join("")}
      <div style="margin-top:14px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:9px;color:#78350f;">
        ⚠ Scores calculated per original validated scoring criteria. MCID values reflect published literature. All findings require clinical correlation.
      </div>`;
    const html = makePDFPage("Outcome Measures Report", metaRight, bodyHTML);
    downloadPDFFromHTML(html, `Outcome_Measures_${Date.now()}.pdf`);
  };

  // Field renderer
  const renderField = (m, f) => {
    const val = (answers[m.id] || {})[f.id];
    const upd = (v) => setField(m.id, f.id, v);
    const base = { width:"100%", background:"#f5f0fb", border:"1px solid #d8cce8", borderRadius:8, color:"#1a1025", fontFamily:"inherit", outline:"none", padding:"7px 10px", fontSize:"0.76rem" };
    if (f.type === "slider") return <OMSlider id={f.id} min={f.min} max={f.max} step={f.step} value={val} onChange={upd}/>;
    if (f.type === "text")   return <input value={val||""} onChange={e=>upd(e.target.value)} placeholder={f.placeholder} style={base}/>;
    if (f.type === "select5")    return <select value={val||""} onChange={e=>upd(e.target.value)} style={base}><option value="">— select —</option>{DASH_OPTS.map(o=><option key={o} value={o.split(" — ")[0]}>{o}</option>)}</select>;
    if (f.type === "select_lefs") return <select value={val||""} onChange={e=>upd(e.target.value)} style={base}><option value="">— select —</option>{LEFS_OPTS.map(o=><option key={o} value={o.split(" — ")[0]}>{o}</option>)}</select>;
    if (f.type === "select_tsk")  return <select value={val||""} onChange={e=>upd(e.target.value)} style={base}><option value="">— select —</option>{TSK_OPTS.map(o=><option key={o} value={o.split(" — ")[0]}>{o}</option>)}</select>;
    if (f.type === "select_fabq") return <select value={val||""} onChange={e=>upd(e.target.value)} style={base}><option value="">— select —</option>{FABQ_OPTS.map(o=><option key={o} value={o}>{o}</option>)}</select>;
    if (f.type === "select")      return <select value={val||""} onChange={e=>upd(e.target.value)} style={base}><option value="">— select —</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
    return null;
  };

  const activeMeasure = active ? OUTCOME_DB[active] : null;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", zIndex:999, background: toast.type==="warn"?"rgba(255,179,0,0.97)":"rgba(0,201,122,0.97)", color:"#000", fontWeight:700, fontSize:"0.78rem", padding:"9px 18px", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* ── Summary bar ── */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, background:"#ffffff", border:"1px solid #d8cce8", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#00e5ff", fontFamily:"monospace", lineHeight:1 }}>{completedCount}</div>
            <div style={{ fontSize:"0.55rem", color:"#7e6a9a", textTransform:"uppercase", letterSpacing:"1px" }}>Completed</div>
          </div>
          <div style={{ width:1, height:32, background:"#ede7f6" }}/>
          <div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#7f5af0", fontFamily:"monospace", lineHeight:1 }}>{sessions.length}</div>
            <div style={{ fontSize:"0.55rem", color:"#7e6a9a", textTransform:"uppercase", letterSpacing:"1px" }}>Sessions</div>
          </div>
          <div style={{ width:1, height:32, background:"#ede7f6" }}/>
          <div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#ffb300", fontFamily:"monospace", lineHeight:1 }}>{Object.keys(OUTCOME_DB).length}</div>
            <div style={{ fontSize:"0.55rem", color:"#7e6a9a", textTransform:"uppercase", letterSpacing:"1px" }}>Available</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <button onClick={saveSession} style={{ padding:"8px 13px", background:"linear-gradient(135deg,rgba(0,201,122,0.2),rgba(0,229,255,0.1))", border:"1px solid rgba(0,201,122,0.35)", borderRadius:8, color:"#00c97a", fontWeight:800, fontSize:"0.68rem", cursor:"pointer", whiteSpace:"nowrap" }}>💾 Save Session</button>
          <button onClick={exportSessionsPDF} style={{ padding:"8px 13px", background:"rgba(127,90,240,0.1)", border:"1px solid rgba(127,90,240,0.3)", borderRadius:8, color:"#7f5af0", fontWeight:700, fontSize:"0.68rem", cursor:"pointer", whiteSpace:"nowrap" }}>📄 Export PDF</button>
        </div>
      </div>

      {/* ── Session history panel ── */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:6, marginBottom: showHistory ? 8 : 0 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ padding:"6px 12px", background: showHistory?"rgba(127,90,240,0.15)":"transparent", border:`1px solid ${showHistory?"rgba(127,90,240,0.35)":"#1a2d45"}`, borderRadius:8, color: showHistory?"#7f5af0":"#6b8399", fontWeight:700, fontSize:"0.68rem", cursor:"pointer" }}>
            📈 Progress History {sessions.length > 0 ? `(${sessions.length} sessions)` : ""}
          </button>
          {sessions.length > 0 && <button onClick={clearHistory} style={{ padding:"6px 10px", background:"transparent", border:"1px solid rgba(255,77,109,0.25)", borderRadius:8, color:"rgba(255,77,109,0.6)", fontSize:"0.62rem", cursor:"pointer" }}>✕ Clear</button>}
        </div>

        {showHistory && sessions.length > 0 && (
          <div style={{ background:"#ffffff", border:"1px solid rgba(127,90,240,0.25)", borderRadius:12, padding:"13px" }}>
            <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#7f5af0", textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Score Progression Across Sessions</div>
            {Object.keys(sessions[sessions.length - 1].scores).map(id => {
              const m = OUTCOME_DB[id]; if (!m) return null;
              const vals = sessions.map(s => s.scores[id]).filter(x => x !== undefined && typeof x !== "object");
              if (!vals.length) return null;
              const change = vals.length >= 2 ? vals[vals.length - 1] - vals[0] : null;
              const improved = change !== null ? isImproved(id, change) : null;
              const col = OM_CAT_COLOR[m.category] || "#00e5ff";
              const latest = vals[vals.length - 1];
              const interp = m.interpret(latest);
              return (
                <div key={id} style={{ background:"#f5f0fb", border:`1px solid ${col}25`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:"1rem" }}>{m.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#1a1025" }}>{m.label.split(" — ")[0]}</div>
                      {interp && <div style={{ fontSize:"0.6rem", color: interp.color, fontWeight:700, marginTop:1 }}>{interp.label}</div>}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:"1.1rem", fontWeight:900, color: col, fontFamily:"monospace" }}>{latest}{m.unit}</div>
                      {change !== null && (
                        <div style={{ fontSize:"0.65rem", fontWeight:800, color: improved?"#00c97a":"#ff4d6d" }}>
                          {change > 0 ? "+" : ""}{Math.round(change * 10) / 10}{m.unit} {improved ? "▲" : "▼"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <Sparkline values={vals} color={col} improved={improved}/>
                    <div style={{ flex:1 }}>
                      {/* MCID check */}
                      {change !== null && m.mcid && (
                        <div style={{ padding:"4px 8px", background: Math.abs(change) >= m.mcid ? (improved?"rgba(0,201,122,0.1)":"rgba(255,77,109,0.1)") : "rgba(255,179,0,0.08)", border:`1px solid ${Math.abs(change)>=m.mcid?(improved?"rgba(0,201,122,0.3)":"rgba(255,77,109,0.3)"):"rgba(255,179,0,0.25)"}`, borderRadius:7, fontSize:"0.6rem", color: Math.abs(change)>=m.mcid?(improved?"#00c97a":"#ff4d6d"):"#ffb300", fontWeight:700 }}>
                          {Math.abs(change) >= m.mcid ? (improved ? "✅ Exceeds MCID — Clinically significant improvement" : "⚠ Exceeds MCID — Clinically significant decline") : `⬤ Below MCID (need ${m.mcid}${m.unit})`}
                        </div>
                      )}
                      {/* Session dots */}
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                        {vals.map((v, i) => (
                          <span key={i} style={{ fontSize:"0.55rem", padding:"1px 5px", background:"#ede7f6", borderRadius:4, color:"#7e6a9a" }}>S{i + 1}: {v}{m.unit}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {showHistory && sessions.length === 0 && (
          <div style={{ padding:"16px", background:"#ffffff", border:"1px solid #d8cce8", borderRadius:10, textAlign:"center", color:"#7e6a9a", fontSize:"0.75rem" }}>
            No sessions saved yet — complete measures and tap 💾 Save Session
          </div>
        )}
      </div>

      {/* ── Category filter ── */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
        {["All", ...categories].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ padding:"3px 9px", borderRadius:8, fontSize:"0.6rem", fontWeight:700, border:`1px solid ${catFilter===c?(OM_CAT_COLOR[c]||"rgba(0,229,255,0.5)"):"#1a2d45"}`, background:catFilter===c?`${OM_CAT_COLOR[c]||"rgba(0,229,255,0.18)"}22`:"transparent", color:catFilter===c?(OM_CAT_COLOR[c]||"#00e5ff"):"#6b8399", cursor:"pointer" }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── Measure cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))", gap:8, marginBottom:14 }}>
        {filteredMeasures.map(m => {
          const score  = getScore(m);
          const interp = score !== null ? (typeof score === "object" ? m.interpret(score) : m.interpret(score)) : null;
          const col    = OM_CAT_COLOR[m.category] || "#00e5ff";
          const isOpen = active === m.id;
          const history= sessions.map(s => s.scores[m.id]).filter(v => v !== undefined && typeof v !== "object");
          const change = history.length >= 2 ? history[history.length-1] - history[0] : null;
          return (
            <div key={m.id} onClick={() => setActive(isOpen ? null : m.id)}
              style={{ background:"#ffffff", border:`1px solid ${isOpen?col+"70":score!==null?col+"35":"#1a2d45"}`, borderRadius:13, padding:"12px", cursor:"pointer", transition:"all 0.18s", position:"relative" }}>
              {/* Completed dot */}
              {score !== null && (
                <div style={{ position:"absolute", top:8, right:8, width:7, height:7, borderRadius:"50%", background: interp?.color || col, boxShadow:`0 0 5px ${interp?.color || col}` }}/>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ fontSize:"1.2rem" }}>{m.icon}</span>
                {score !== null && typeof score !== "object" && (
                  <ScoreRing score={score} maxScore={m.maxScore} color={interp?.color || col} size={46}/>
                )}
                {score !== null && typeof score === "object" && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"0.6rem", color:"#7e6a9a" }}>PA: <b style={{ color: score.pa>15?"#ff4d6d":"#00c97a" }}>{score.pa}</b></div>
                    <div style={{ fontSize:"0.6rem", color:"#7e6a9a" }}>W: <b style={{ color: score.w>34?"#ff4d6d":"#00c97a" }}>{score.w}</b></div>
                  </div>
                )}
              </div>
              <div style={{ fontSize:"0.68rem", fontWeight:700, color:"#1a1025", lineHeight:1.3, marginBottom:4 }}>{m.label.split(" — ")[0]}</div>
              <div style={{ fontSize:"0.55rem", padding:"1px 6px", borderRadius:5, background:`${col}18`, color:col, display:"inline-block", marginBottom:5 }}>{m.category}</div>
              {/* Severity badge */}
              {interp && (
                <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background: interp.color, flexShrink:0 }}/>
                  <div style={{ fontSize:"0.62rem", fontWeight:800, color: interp.color }}>{interp.label}</div>
                </div>
              )}
              {/* Score gauge */}
              {score !== null && typeof score !== "object" && m.maxScore && (
                <div style={{ height:4, background:"#ede7f6", borderRadius:2, overflow:"hidden", marginBottom:4 }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(score/m.maxScore)*100)}%`, background: interp?.color||col, borderRadius:2, transition:"width 0.5s" }}/>
                </div>
              )}
              {/* Progress change */}
              {change !== null && (
                <div style={{ fontSize:"0.58rem", color: isImproved(m.id,change)?"#00c97a":"#ff4d6d", fontWeight:700 }}>
                  {change > 0 ? "+" : ""}{Math.round(change * 10) / 10}{m.unit} {isImproved(m.id,change)?"▲":"▼"} from S1
                </div>
              )}
              {!score && score !== 0 && <div style={{ fontSize:"0.6rem", color:"#3a5070" }}>Tap to complete →</div>}
            </div>
          );
        })}
      </div>

      {/* ── Active questionnaire ── */}
      {activeMeasure && (()=>{
        const score  = getScore(activeMeasure);
        const interp = score !== null ? activeMeasure.interpret(score) : null;
        const col    = OM_CAT_COLOR[activeMeasure.category] || "#00e5ff";
        const history= sessions.map(s => s.scores[activeMeasure.id]).filter(v => v!==undefined && typeof v!=="object");
        const prev   = history.length > 0 ? history[history.length - 1] : null;
        const change = (prev !== null && score !== null && typeof score !== "object") ? score - prev : null;
        const mcid   = activeMeasure.mcid || 0;
        return (
          <div style={{ background:"#ffffff", border:`1px solid ${col}45`, borderRadius:14, padding:"15px", marginBottom:14 }}>
            {/* Header */}
            <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:14 }}>
              <span style={{ fontSize:"1.6rem" }}>{activeMeasure.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.9rem", fontWeight:800, color:"#1a1025", lineHeight:1.2 }}>{activeMeasure.label}</div>
                <div style={{ fontSize:"0.62rem", color:col, marginTop:2 }}>{activeMeasure.category}</div>
                <div style={{ fontSize:"0.65rem", color:"#7e6a9a", marginTop:5, lineHeight:1.55 }}>{activeMeasure.description}</div>
              </div>
              {score !== null && typeof score !== "object" && (
                <div style={{ flexShrink:0, textAlign:"center" }}>
                  <ScoreRing score={score} maxScore={activeMeasure.maxScore} color={interp?.color||col} size={72}/>
                  <div style={{ fontSize:"0.52rem", color:"#7e6a9a", marginTop:2 }}>{activeMeasure.unit}</div>
                </div>
              )}
            </div>

            {/* Score gauge bar */}
            {score !== null && typeof score !== "object" && activeMeasure.maxScore && (
              <div style={{ marginBottom:12 }}>
                <ScoreGauge score={score} maxScore={activeMeasure.maxScore} color={interp?.color||col} label={`Score out of ${activeMeasure.maxScore}`} mcid={activeMeasure.mcid}/>
              </div>
            )}

            {/* Severity interpretation — prominent */}
            {interp && (
              <div style={{ padding:"12px 14px", background:`${interp.color}10`, border:`2px solid ${interp.color}35`, borderRadius:11, marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:interp.color }}/>
                  <div style={{ fontSize:"0.82rem", fontWeight:900, color:interp.color }}>{interp.label}</div>
                  <div style={{ marginLeft:"auto", fontSize:"0.65rem", fontWeight:700, color:interp.color, background:`${interp.color}18`, padding:"2px 8px", borderRadius:6 }}>{score}{activeMeasure.unit}</div>
                </div>
                <div style={{ fontSize:"0.74rem", color:"#1a1025", lineHeight:1.65 }}>{interp.text}</div>
                {activeMeasure.mcid && (
                  <div style={{ marginTop:7, fontSize:"0.62rem", color:"#7e6a9a", display:"flex", alignItems:"center", gap:5 }}>
                    <span>📏 MCID = {activeMeasure.mcid}{activeMeasure.unit}</span>
                    <span style={{ color:"#3a5070" }}>— minimum change needed to be clinically meaningful</span>
                  </div>
                )}
              </div>
            )}

            {/* Normal values reference */}
            {activeMeasure.normalRange && (
              <div style={{ padding:"8px 12px", background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.15)", borderRadius:8, marginBottom:12, fontSize:"0.65rem", color:"#7e6a9a" }}>
                📊 <span style={{ color:"#00e5ff", fontWeight:700 }}>Normal / Asymptomatic:</span> {activeMeasure.normalRange}
              </div>
            )}

            {/* MCID progress from last session */}
            {change !== null && (
              <div style={{ padding:"11px 13px", background:"rgba(127,90,240,0.07)", border:"1px solid rgba(127,90,240,0.2)", borderRadius:10, marginBottom:14 }}>
                <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#7f5af0", textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>📈 Change vs Last Saved Session</div>
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:"1.3rem", fontWeight:900, color: isImproved(activeMeasure.id,change)?"#00c97a":"#ff4d6d", fontFamily:"monospace" }}>
                      {change > 0 ? "+" : ""}{Math.round(change * 10) / 10}{activeMeasure.unit}
                    </div>
                    <div style={{ fontSize:"0.58rem", color:"#7e6a9a" }}>S{sessions.length}: {prev}{activeMeasure.unit} → now: {score}{activeMeasure.unit}</div>
                  </div>
                  <div style={{ flex:1, padding:"6px 10px", background: Math.abs(change)>=mcid?(isImproved(activeMeasure.id,change)?"rgba(0,201,122,0.1)":"rgba(255,77,109,0.1)"):"rgba(255,179,0,0.08)", border:`1px solid ${Math.abs(change)>=mcid?(isImproved(activeMeasure.id,change)?"rgba(0,201,122,0.3)":"rgba(255,77,109,0.3)"):"rgba(255,179,0,0.25)"}`, borderRadius:8, fontSize:"0.65rem", color:Math.abs(change)>=mcid?(isImproved(activeMeasure.id,change)?"#00c97a":"#ff4d6d"):"#ffb300", fontWeight:700 }}>
                    {Math.abs(change) >= mcid
                      ? (isImproved(activeMeasure.id,change) ? "✅ Exceeds MCID — Clinically significant improvement" : "⚠ Exceeds MCID — Clinically significant decline")
                      : `⬤ Below MCID — need ${(mcid - Math.abs(change)).toFixed(1)} more to be clinically significant`}
                  </div>
                </div>
                {history.length >= 2 && (
                  <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid rgba(127,90,240,0.15)" }}>
                    <Sparkline values={[...history.slice(-5), score]} color="#7f5af0" improved={isImproved(activeMeasure.id,change)}/>
                  </div>
                )}
              </div>
            )}

            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {activeMeasure.fields.map((f, fi) => (
                <div key={f.id} style={{ background:"#f5f0fb", border:"1px solid #d8cce8", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                    <span style={{ fontSize:"0.58rem", fontWeight:800, color:col, background:`${col}18`, padding:"1px 6px", borderRadius:4, flexShrink:0 }}>Q{fi+1}</span>
                    <div style={{ fontSize:"0.72rem", fontWeight:600, color:"#1a1025", lineHeight:1.4 }}>{f.label}</div>
                  </div>
                  {renderField(activeMeasure, f)}
                </div>
              ))}
            </div>

            <button onClick={() => setActive(null)} style={{ marginTop:13, width:"100%", padding:"10px", background:"rgba(0,229,255,0.07)", border:"1px solid rgba(0,229,255,0.2)", borderRadius:9, color:"#00e5ff", fontWeight:700, fontSize:"0.75rem", cursor:"pointer" }}>
              ✓ Done — Collapse
            </button>
          </div>
        );
      })()}

      <div style={{ padding:"8px 12px", background:"#f5f0fb", border:"1px solid #d8cce8", borderRadius:8, fontSize:"0.6rem", color:"#7e6a9a", lineHeight:1.6 }}>
        ⚠ Scores calculated per original validated questionnaire criteria. MCID = Minimum Clinically Important Difference per published literature. Session history persists across browser sessions via localStorage. Use 💾 Save Session after each clinical appointment.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOAP NOTE GENERATOR — Auto-pulls from all assessment data
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME CLINICAL INTERPRETATION ENGINE
// Rule-based deterministic reasoning — NOT generative AI
// Updates live as any field in any assessment module is filled
// ═══════════════════════════════════════════════════════════════════════════════

function buildClinicalInterpretation(data) {
  const rules = [];
  const get = (...keys) => keys.map(k => String(data[k] || "")).join(" ").toLowerCase();
  const val = (k) => String(data[k] || "").toLowerCase();
  const getArr = (k) => {
    const v = data[k];
    if (Array.isArray(v)) return v.map(x=>String(x).toLowerCase());
    if (typeof v === "string") return v.split("|||").map(x=>x.toLowerCase()).filter(Boolean);
    return [];
  };

  const subj = get("cc_main","cc_location","cc_symptom_type","pa_quality","pa_pattern","agg_activity","agg_movement","sb_morning","sb_night","moi_activity");
  const locArr = getArr("cc_location");
  const loc = locArr.join(" ") + " " + val("cc_main");
  const paQuality = getArr("pa_quality").join(" ");
  const paPattern = getArr("pa_pattern").join(" ");
  const aggAct = getArr("agg_activity").concat(getArr("agg_movement")).join(" ");

  // ── SUBJECTIVE ────────────────────────────────────────────────────────────
  if (loc.includes("neck") || loc.includes("cervical")) {
    if (aggAct.includes("sit") || subj.includes("prolonged") || subj.includes("posture") || subj.includes("headache") || subj.includes("stiff")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Postural Cervical Dysfunction",
        text:"Symptoms suggestive of postural cervical dysfunction with possible upper cervical and cervicothoracic involvement, aggravated by prolonged static posture. Upper trapezius and suboccipital hypertonicity likely contributing." });
    } else if (subj.includes("arm") || subj.includes("radiat") || paQuality.includes("tingle") || paQuality.includes("numb") || paQuality.includes("shoot")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Cervical Radiculopathy Pattern",
        text:"Radiating upper limb symptoms from cervical region suggest possible nerve root irritation or disc pathology. Dermatomal pattern and neurological screening required to confirm level and structure." });
    } else if (loc.includes("neck")) {
      rules.push({ module:"Subjective", confidence:"MOD", tag:"Cervicogenic Complaint",
        text:"Cervical region complaint. Mechanical, inflammatory, and postural origins to be differentiated through physical examination and clinical reasoning." });
    }
  }

  if (loc.includes("back") || loc.includes("lumbar") || loc.includes("lx")) {
    if (aggAct.includes("sit") || aggAct.includes("flex") || aggAct.includes("forward")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Lumbar Discogenic Pattern",
        text:"Aggravation with sitting and flexion-loaded activities suggests discogenic origin. Intradiscal pressure increases with sustained flexion, consistent with lumbar disc involvement. Directional preference assessment (McKenzie) indicated." });
    } else if (aggAct.includes("stand") || aggAct.includes("walk") || aggAct.includes("extens")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Lumbar Facet / Stenotic Pattern",
        text:"Extension-loaded aggravation suggests lumbar facet joint pathology or central stenosis. Neural canal narrowing with extension and weight-bearing is consistent with this pattern." });
    } else {
      rules.push({ module:"Subjective", confidence:"MOD", tag:"Lumbar Musculoskeletal Complaint",
        text:"Lumbar complaint with mechanical pattern. Disc, facet, SIJ, or muscular origin to be differentiated through physical assessment, directional preference, and provocation testing." });
    }
  }

  if (loc.includes("shoulder")) {
    if (aggAct.includes("overhead") || aggAct.includes("reach") || subj.includes("arc")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Subacromial Impingement Pattern",
        text:"Overhead and reaching aggravation with possible painful arc suggests subacromial impingement syndrome. Rotator cuff tendinopathy and bursal involvement should be evaluated. Scapular dyskinesis is a common contributing factor." });
    } else if (subj.includes("night") || subj.includes("sleep") || val("sb_night").includes("shoulder")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Shoulder — Capsular / Rotator Cuff Pattern",
        text:"Night pain and sleep disturbance from shoulder suggests possible adhesive capsulitis, rotator cuff tear, or GH arthrosis. End-range capsular pattern assessment and passive ROM to be confirmed on physical examination." });
    }
  }

  if (loc.includes("knee")) {
    if (aggAct.includes("stair") || aggAct.includes("squat") || aggAct.includes("run")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Patellofemoral / Knee Overload Pattern",
        text:"Knee loading with stairs, squatting, and running suggests patellofemoral pain syndrome or chondral pathology. VMO inhibition, patellar maltracking, and hip control deficits are common contributing factors." });
    }
    if (subj.includes("swell") || subj.includes("giving way") || subj.includes("unstable")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Knee Ligamentous / Meniscal Involvement",
        text:"Swelling, giving way, and instability suggest possible ligamentous compromise (ACL/PCL) or meniscal pathology. Traumatic onset and mechanism of injury should be clarified. Special tests (Lachman, McMurray) are critical for differential diagnosis." });
    }
  }

  if (loc.includes("wrist") || loc.includes("hand") || loc.includes("finger")) {
    if (val("sb_night").includes("tingle") || val("sb_night").includes("numb") || paQuality.includes("tingle") || paQuality.includes("numb")) {
      rules.push({ module:"Subjective", confidence:"HIGH", tag:"Carpal Tunnel Syndrome Pattern",
        text:"Nocturnal hand paraesthesia with wrist and hand symptoms strongly suggests carpal tunnel syndrome (median nerve compression). Phalen's test and Tinel's sign are essential. Hypothyroidism and pregnancy are common secondary causes." });
    }
  }

  if (loc.includes("hip")) {
    if (aggAct.includes("sit") || subj.includes("groin") || subj.includes("click")) {
      rules.push({ module:"Subjective", confidence:"MOD", tag:"Hip Intra-Articular Pattern",
        text:"Anterior hip/groin pain aggravated by sitting or flexion activities with possible clicking suggests femoroacetabular impingement (FAI) or labral pathology. FADIR test and clinical hip examination required." });
    }
  }

  if (paPattern.includes("morning") || val("sb_morning").includes(">30 min") || val("sb_morning").includes("prolonged stiff")) {
    rules.push({ module:"Subjective", confidence:"MOD", tag:"Inflammatory Component Suspected",
      text:"Morning stiffness >30 minutes suggests possible inflammatory articular component. Differentials include inflammatory arthritis (RA, AS, PsA). Rheumatological screening may be indicated if persistent or bilateral." });
  }

  if (paQuality.includes("burn") || paQuality.includes("shoot") || paQuality.includes("electric") || paQuality.includes("neuropath") || val("pa_nature").includes("neuropath")) {
    rules.push({ module:"Subjective", confidence:"HIGH", tag:"Neuropathic Pain Quality",
      text:"Burning, shooting, or electric quality pain indicates neuropathic pain mechanism. Peripheral nerve entrapment, nerve root compression, and central sensitisation should be differentiated. Quantitative sensory testing and neural tension assessment indicated." });
  }

  // ── POSTURE ───────────────────────────────────────────────────────────────
  const fhp = val("post_fhp");
  const kyphosis = val("post_kyphosis");
  const lordosis = val("post_lordosis");
  const pelvis = val("post_pelvis");
  const shoulders = val("post_sh");

  const hasPostureDefects = Object.keys(data).some(k => k.startsWith("posture_defect_") && data[k] === true);
  const fhpActive = (fhp && !fhp.includes("normal") && !fhp.includes("--") && fhp !== "") || data["posture_defect_forward_head"];
  const kyphActive = (kyphosis && !kyphosis.includes("normal") && !kyphosis.includes("--") && kyphosis !== "") || data["posture_defect_thoracic_kyphosis"];
  const lordActive = (lordosis && !lordosis.includes("normal") && !lordosis.includes("--") && lordosis !== "") || data["posture_defect_lumbar_hyperlordosis"];
  const pelvActive = (pelvis && pelvis.includes("anterior")) || data["posture_defect_anterior_pelvic_tilt"];
  const scolActive = data["posture_defect_scoliosis"] || val("post_scoliosis").includes("scolio");

  if (fhpActive && kyphActive) {
    rules.push({ module:"Posture", confidence:"HIGH", tag:"Upper Crossed Syndrome",
      text:"Postural findings indicate Upper Crossed Syndrome (Janda): forward head posture combined with thoracic kyphosis suggests anterior muscular tightness (pectorals, SCM, upper trapezius, levator scapulae) with posterior chain inhibition (deep neck flexors, lower trapezius, serratus anterior). Each centimetre of anterior head translation adds ~4.5kg of effective cervical load." });
  } else if (fhpActive) {
    rules.push({ module:"Posture", confidence:"HIGH", tag:"Forward Head Posture",
      text:"Forward head posture noted. Increased cervical compressive load with suboccipital hypertonicity and deep neck flexor inhibition expected. Contributes to cervicogenic headache, TMJ dysfunction, and upper limb neural tension." });
  } else if (kyphActive) {
    rules.push({ module:"Posture", confidence:"MOD", tag:"Thoracic Kyphosis",
      text:"Increased thoracic kyphosis identified. Contributes to restricted shoulder overhead range, altered scapular kinematics, and compensatory cervical and lumbar lordosis. Thoracic extension mobilisation and posterior chain strengthening are primary interventions." });
  }

  if (lordActive && pelvActive) {
    rules.push({ module:"Posture", confidence:"HIGH", tag:"Lower Crossed Syndrome",
      text:"Anterior pelvic tilt with increased lumbar lordosis indicates Lower Crossed Syndrome (Janda): tight hip flexors and lumbar extensors with inhibited gluteals and deep abdominals. Lumbar facet overload, hip flexor restriction, and gluteal inhibition pattern expected." });
  } else if (pelvActive) {
    rules.push({ module:"Posture", confidence:"MOD", tag:"Anterior Pelvic Tilt",
      text:"Anterior pelvic tilt noted. Hip flexor tightness and gluteal inhibition are commonly associated. Increases lumbar compressive forces and facet joint loading. Core motor control retraining and hip flexor flexibility programme indicated." });
  }

  if (scolActive) {
    rules.push({ module:"Posture", confidence:"HIGH", tag:"Scoliotic Deformity",
      text:"Lateral spinal curvature observed. Functional vs. structural scoliosis to be differentiated (Adams forward bend test). Leg length discrepancy and pelvic obliquity should be assessed. Radiological confirmation required for Cobb angle measurement if structural." });
  }

  if (shoulders.includes("protract") || shoulders.includes("elevated") || data["posture_defect_shoulder_protraction"]) {
    rules.push({ module:"Posture", confidence:"MOD", tag:"Scapular Malposition",
      text:"Scapular malposition (protraction/elevation) noted. Indicates serratus anterior inhibition and upper trapezius overactivity. Contributes to reduced subacromial space and altered scapulohumeral rhythm. Scapular stabilisation programme is a primary treatment target." });
  }

  // ── ROM ───────────────────────────────────────────────────────────────────
  const romChecks = [
    ["rom_cx_flex","Cervical Flexion",50],["rom_cx_ext","Cervical Extension",60],
    ["rom_cx_rot_left","Cervical Rotation L",80],["rom_cx_rot_right","Cervical Rotation R",80],
    ["rom_sh_flex_left","Shoulder Flex L",180],["rom_sh_flex_right","Shoulder Flex R",180],
    ["rom_sh_abd_left","Shoulder Abd L",180],["rom_sh_abd_right","Shoulder Abd R",180],
    ["rom_sh_er_left","Shoulder ER L",90],["rom_sh_er_right","Shoulder ER R",90],
    ["rom_hip_flex_left","Hip Flex L",120],["rom_hip_flex_right","Hip Flex R",120],
    ["rom_kn_flex_left","Knee Flex L",140],["rom_kn_flex_right","Knee Flex R",140],
    ["rom_ank_df_left","Ankle DF L",20],["rom_ank_df_right","Ankle DF R",20],
    ["lx_flex","Lumbar Flex",80],["lx_ext","Lumbar Ext",25],
    ["lx_lat_left","Lumbar Lat Flex L",35],["lx_lat_right","Lumbar Lat Flex R",35],
    ["lx_rot_left","Lumbar Rot L",45],["lx_rot_right","Lumbar Rot R",45],
    ["lx_slr_left","SLR L",70],["lx_slr_right","SLR R",70],
  ];
  const romSevere = [], romMild = [];
  romChecks.forEach(([key, label, norm]) => {
    const v = parseFloat(data[key]);
    if (!isNaN(v) && v > 0) {
      const pct = v / norm * 100;
      if (pct < 50) romSevere.push(`${label} ${v}°/${norm}°`);
      else if (pct < 80) romMild.push(`${label} ${v}°/${norm}°`);
    }
  });

  if (romSevere.length > 0) {
    rules.push({ module:"ROM", confidence:"HIGH", tag:"Significant Mobility Restriction",
      text:`Significant ROM restriction (>50% loss): ${romSevere.join("; ")}. Findings indicate substantial capsular, articular, or myofascial limitation. Pain behaviour, end-feel, and pattern of restriction guide differential diagnosis (capsular pattern vs. non-capsular).` });
  }
  if (romMild.length > 0) {
    rules.push({ module:"ROM", confidence:"MOD", tag:"Mild ROM Limitation",
      text:`Mild restriction (20–50% loss): ${romMild.join("; ")}. Early-stage restriction pattern — myofascial tightness, early capsular adhesion, or movement-related guarding. Monitor and correlate with pain behaviour.` });
  }

  // Check SLR specifically for neural tension
  const slrL = parseFloat(data["lx_slr_left"]);
  const slrR = parseFloat(data["lx_slr_right"]);
  if ((!isNaN(slrL) && slrL < 60) || (!isNaN(slrR) && slrR < 60)) {
    rules.push({ module:"ROM", confidence:"HIGH", tag:"Reduced SLR — Neural Tension",
      text:`SLR reduced (${!isNaN(slrL)?`L ${slrL}°`:""}${!isNaN(slrR)?` R ${slrR}°`:""} — normal >70°). Limited SLR indicates sciatic nerve mechanosensitivity, L4/L5/S1 nerve root irritation, or hamstring restriction. Sensitising manoeuvres (ankle DF, neck flex) differentiate neural vs. muscular limitation.` });
  }

  // ── MMT / MUSCLE WEAKNESS ──────────────────────────────────────────────────
  const mmtText = Object.keys(data).filter(k => k.startsWith("mmt_")).map(k => `${k}:${String(data[k]||"")}`).join(" ").toLowerCase();
  const myoText = Object.keys(data).filter(k => k.startsWith("myo_")).map(k => `${k}:${String(data[k]||"")}`).join(" ").toLowerCase();
  const neuroMotor = val("neuro_motor") + " " + mmtText + " " + myoText;
  const mmtNotes = val("mmt_notes") + " " + val("mmt_findings");

  const gluteWeak = mmtText.includes("glute") || neuroMotor.includes("hip abduct") || mmtNotes.includes("glute");
  const coreWeak = mmtText.includes("core") || mmtText.includes("abdom") || neuroMotor.includes("core") || mmtNotes.includes("core");
  const dnfWeak = mmtText.includes("neck flex") || mmtNotes.includes("deep neck") || mmtNotes.includes("dnf");
  const rcWeak = mmtText.includes("supraspinatus") || mmtText.includes("infraspinatus") || mmtText.includes("rotator") || mmtNotes.includes("rotator cuff");
  const quadWeak = mmtText.includes("quad") || neuroMotor.includes("quad") || mmtNotes.includes("quad");

  // Check for numeric weakness in MMT fields
  const hasNumericWeakness = Object.keys(data).filter(k => k.startsWith("mmt_")).some(k => {
    const v = String(data[k]||"");
    return v.match(/^[1-4]/) || v.includes("4-") || v.includes("4+/5") || v.includes("3/5") || v.includes("weak");
  });
  const myoWeakness = Object.keys(data).filter(k => k.startsWith("myo_")).some(k => {
    const v = String(data[k]||"");
    return v && !v.startsWith("5") && v.match(/[1-4]/);
  });

  if (gluteWeak && coreWeak) {
    rules.push({ module:"MMT", confidence:"HIGH", tag:"Lumbopelvic Stabiliser Deficit",
      text:"Hip abductor and core stabiliser weakness indicates lumbopelvic instability syndrome. Combined gluteus medius and transversus abdominis/multifidus deficit impairs frontal and sagittal plane pelvic control during all functional loading activities including gait, stairs, and sport." });
  } else if (gluteWeak) {
    rules.push({ module:"MMT", confidence:"HIGH", tag:"Hip Abductor Weakness",
      text:"Gluteus medius weakness compromises frontal plane pelvic stability. Trendelenburg sign, contralateral pelvic drop, ipsilateral trunk lateral flexion (compensated Trendelenburg), and increased knee valgus during single-leg loading are expected clinical findings." });
  }
  if (coreWeak) {
    rules.push({ module:"MMT", confidence:"HIGH", tag:"Core Stabiliser Deficit",
      text:"Deep core musculature weakness (transversus abdominis, multifidus) reduces segmental lumbar stability. Increased intervertebral shear during loaded functional tasks contributes to pain and dysfunction. Motor control retraining using staged activation protocols is the primary intervention." });
  }
  if (dnfWeak) {
    rules.push({ module:"MMT", confidence:"HIGH", tag:"Deep Neck Flexor Inhibition",
      text:"Deep neck flexor inhibition (longus colli/capitis) allows superficial flexor dominance (SCM, scalenes), perpetuating forward head posture. This pattern is associated with cervicogenic headache, neck pain, and altered cervical proprioception. Cranio-cervical flexion test retraining is the gold-standard intervention." });
  }
  if (rcWeak) {
    rules.push({ module:"MMT", confidence:"HIGH", tag:"Rotator Cuff Weakness",
      text:"Rotator cuff weakness compromises glenohumeral head depression and dynamic joint centration. Superior humeral head migration during elevation is expected, reducing subacromial space and contributing to impingement. External rotation strengthening and scapular stabilisation are treatment priorities." });
  }
  if (quadWeak) {
    rules.push({ module:"MMT", confidence:"MOD", tag:"Quadriceps Inhibition",
      text:"Quadriceps weakness noted. Arthrogenic muscle inhibition from intra-articular effusion or pain is a common cause in the knee. VMO inhibition specifically compromises patellar tracking. Neuromuscular electrical stimulation and motor control progression may be required." });
  }
  if (myoWeakness && !gluteWeak && !coreWeak && !dnfWeak && !rcWeak && !quadWeak) {
    rules.push({ module:"MMT", confidence:"MOD", tag:"Myotomal Weakness Noted",
      text:"Myotomal weakness identified in neurological examination. Correlate with dermatomal sensory changes, reflex findings, and special test results to identify specific nerve root level of involvement." });
  }

  // ── SPECIAL TESTS ─────────────────────────────────────────────────────────
  const allData = Object.keys(data);
  const stKeys = allData.filter(k => k.startsWith("st_") || (k.startsWith("lx_") && !k.startsWith("lx_palpation")));
  const posTests = stKeys.filter(k => String(data[k]).toLowerCase().includes("positive"));

  const hasTest = (...names) => posTests.some(k => names.some(n => k.includes(n)));

  // Shoulder cluster
  const hawkins = hasTest("hawkins");
  const neer = hasTest("neer");
  const painArc = hasTest("arc","painful_arc");
  const emptycan = hasTest("empty_can","emptycan","empty can");
  const speedTest = hasTest("speed");
  const laprub = hasTest("o_brien","laprub","lapr");

  if (hawkins && neer && painArc) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Subacromial Impingement — Full Cluster Positive",
      text:"Hawkins-Kennedy + Neer + Painful Arc all positive: complete subacromial impingement test cluster confirmed. High specificity for subacromial space pathology. Rotator cuff tendinopathy vs. bursal impingement to be differentiated by injection response and imaging." });
  } else if (hawkins && neer) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Subacromial Impingement Confirmed",
      text:"Hawkins-Kennedy and Neer tests positive: combined cluster specificity >80% for subacromial impingement. Rotator cuff strengthening, subacromial space optimisation, and postural correction are first-line interventions." });
  } else if (hawkins || neer) {
    rules.push({ module:"Special Tests", confidence:"MOD", tag:"Subacromial Impingement Suspected",
      text:"Positive impingement sign (Hawkins or Neer). Complete the cluster with painful arc and strength testing for diagnostic confirmation." });
  }
  if (emptycan) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Supraspinatus Pathology",
      text:"Positive empty can (Jobe) test suggests supraspinatus tendon involvement (sensitivity 69%, specificity 66%). Combined with impingement signs and external rotation lag sign for rotator cuff tear differentiation." });
  }

  // ACL/knee cluster
  const lachman = hasTest("lachman");
  const antDrawer = hasTest("anterior_drawer","ant_drawer");
  const pivotShift = hasTest("pivot");
  const mcmurray = hasTest("mcmurray");
  const apley = hasTest("apley");
  const valgusStress = hasTest("valgus_stress","valgus stress");
  const varusStress = hasTest("varus_stress","varus stress");

  if (lachman && antDrawer) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"ACL Rupture — High Probability",
      text:"Positive Lachman + anterior drawer: combined sensitivity >95% for ACL rupture. Orthopaedic referral and MRI are indicated for confirmation and surgical planning. Conservative ACL rehabilitation protocol to begin while awaiting imaging." });
  } else if (lachman) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"ACL Involvement Likely",
      text:"Positive Lachman test (sensitivity 86%, specificity 91%) — most sensitive clinical test for ACL disruption. Complete the cluster with pivot shift and anterior drawer. MRI confirmation indicated." });
  }
  if (mcmurray || apley) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Meniscal Pathology",
      text:"Positive McMurray or Apley test indicates possible meniscal tear. Medial vs. lateral tear differentiated by tibial rotation direction. MRI is gold standard for confirmation. Early physiotherapy management focuses on effusion control and quadriceps reactivation." });
  }
  if (valgusStress) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"MCL Insufficiency",
      text:"Positive valgus stress test indicates medial collateral ligament insufficiency. Grade I–III differentiation based on laxity and end-feel. MCL tears are typically managed conservatively with bracing and progressive loading." });
  }

  // Lumbar cluster
  const slump = hasTest("slump");
  const slr = hasTest("slr","straight_leg");
  const kemp = hasTest("kemp");
  const prone_instab = hasTest("prone_instab","prone instab");
  const femStretch = hasTest("femoral_stretch","prone_knee","femstr");

  if (slump && slr) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Neural Tension — Complete Cluster",
      text:"Positive Slump and SLR tests confirm sciatic nerve mechanosensitivity. The combined cluster is highly specific for L4/L5/S1 nerve root irritation or adverse neural tension. Dermatomal correlation identifies disc level. Neural mobilisation is a key treatment strategy." });
  } else if (slump || slr) {
    rules.push({ module:"Special Tests", confidence:"MOD", tag:"Neural Tension Positive",
      text:"Positive neural tension test (Slump or SLR). Complete the cluster for diagnostic confirmation. Neural mobilisation and position of ease strategies are indicated." });
  }
  if (kemp) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Lumbar Facet Compression Sign",
      text:"Positive Kemp test reproducing localised or referred pain: indicates lumbar facet joint or lateral canal stenosis involvement. Extension and ipsilateral lateral flexion loading pattern supports facet origin." });
  }
  if (prone_instab) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Segmental Lumbar Instability",
      text:"Positive prone instability test confirms symptomatic segmental lumbar instability. Deep stabiliser retraining (transversus abdominis, multifidus co-contraction) is the primary evidence-based intervention." });
  }
  if (femStretch) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Upper Lumbar / Femoral Nerve Tension",
      text:"Positive prone knee bend or femoral nerve stretch indicates L2/L3/L4 nerve root irritation or upper lumbar disc pathology. Anterior thigh symptoms and quadriceps weakness complete the clinical picture." });
  }

  // Cervical cluster
  const spurling = hasTest("spurling");
  const distract = hasTest("distraction");
  const vbi = posTests.some(k => k.includes("vbi") || k.includes("vertebral_artery"));
  const sharpPurser = posTests.some(k => k.includes("sharp_purser") || k.includes("sharp purser"));

  if (spurling && distract) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Cervical Radiculopathy Cluster Confirmed",
      text:"Spurling positive (symptoms reproduced) + distraction positive (symptom relief): specificity >90% for cervical nerve root compression. ICD-10: M54.1. Imaging confirmation and management planning required. Neural mobilisation, cervical traction, and segmental mobilisation are evidence-based treatments." });
  } else if (spurling) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Cervical Nerve Root Compression",
      text:"Positive Spurling test (specificity 92–93%) indicates foraminal compression of the cervical nerve root. Correlate with dermatomes, myotomes, and reflexes to identify level (C5: deltoid/biceps, C6: wrist ext/brachioradialis, C7: triceps/wrist flex, C8: finger flex)." });
  }
  if (vbi) {
    rules.push({ module:"Special Tests", confidence:"URGENT", tag:"⚠️ VBI Screen POSITIVE — Contraindication",
      text:"VBI / vertebral artery screening POSITIVE. ABSOLUTE CONTRAINDICATION to cervical manipulation or high-velocity thrust techniques. Vertebrobasilar insufficiency requires urgent medical review before further cervical intervention. Document clearly and refer." });
  }
  if (sharpPurser) {
    rules.push({ module:"Special Tests", confidence:"URGENT", tag:"⚠️ C1/C2 Instability — URGENT",
      text:"Sharp-Purser test positive indicates atlantoaxial (C1/C2) instability. URGENT referral to spinal surgeon or emergency department. No manual therapy to cervical spine. Immobilise if necessary. Rule out rheumatoid arthritis, Down syndrome, trauma." });
  }

  // Hip cluster
  const fadir = hasTest("fadir");
  const faber = hasTest("faber");
  const ober = hasTest("ober");
  const trendeTest = hasTest("trendelenburg");
  const thomasTest = hasTest("thomas","ilt_thomas");

  if (fadir) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"FAI / Labral Pathology",
      text:"Positive FADIR test (sensitivity 78%, specificity 56%) indicates femoroacetabular impingement or acetabular labral tear. Anterior hip/groin pain in flexion-adduction-internal rotation is the hallmark finding. MR arthrogram is gold standard for labral tear confirmation." });
  }
  if (faber) {
    rules.push({ module:"Special Tests", confidence:"MOD", tag:"SIJ / Hip Joint Involvement",
      text:"Positive FABER test indicates sacroiliac joint or hip joint involvement. For SIJ specificity, combine with Gaenslen, thigh thrust, and SIJ distraction tests (cluster of ≥3 positive has sensitivity 85%, specificity 79%)." });
  }
  if (ober) {
    rules.push({ module:"Special Tests", confidence:"MOD", tag:"IT Band / TFL Tightness",
      text:"Positive Ober test confirms iliotibial band and tensor fascia latae tightness. Common contributor to lateral knee pain (IT band syndrome) and hip abductor movement dysfunction. Foam rolling, hip strengthening, and biomechanical correction are primary interventions." });
  }

  // Wrist/CTS
  const phalen = hasTest("phalen");
  const tinel = hasTest("tinel");
  if (phalen && tinel) {
    rules.push({ module:"Special Tests", confidence:"HIGH", tag:"Carpal Tunnel Syndrome Confirmed",
      text:"Positive Phalen and Tinel signs confirm median nerve compression at carpal tunnel. Combined cluster specificity 73%. Night splinting in neutral, nerve gliding exercises, ergonomic assessment, and activity modification are first-line conservative management." });
  } else if (phalen || tinel) {
    rules.push({ module:"Special Tests", confidence:"MOD", tag:"Carpal Tunnel Syndrome Suspected",
      text:"Single positive CTS test (Phalen or Tinel). Complete the cluster and assess thenar atrophy and grip strength. Electrodiagnostic studies confirm diagnosis and severity." });
  }

  // ── NEUROLOGICAL ───────────────────────────────────────────────────────────
  const neuroSens = val("neuro_sensation");
  const neuroRef = val("neuro_reflex");
  const neuroMot = val("neuro_motor");
  const neuroDerm = val("neuro_dermatomal");
  const neuroTens = val("neuro_tension");

  const hasBabinski = Object.keys(data).some(k => k.includes("babinski") && String(data[k]).toLowerCase().includes("positive"));
  const hasHoffmann = Object.keys(data).some(k => k.includes("hoffmann") && String(data[k]).toLowerCase().includes("positive"));

  if (hasBabinski || hasHoffmann) {
    rules.push({ module:"Neurology", confidence:"URGENT", tag:"⚠️ Upper Motor Neuron — URGENT REFERRAL",
      text:"PATHOLOGICAL REFLEX POSITIVE (Babinski/Hoffmann). Upper motor neuron lesion above segmental level. Urgent exclusion of cervical myelopathy, spinal cord compression, stroke, or intracranial pathology required. REFER IMMEDIATELY. Do not proceed with spinal manipulation." });
  }

  const neuroAll = [neuroSens, neuroRef, neuroMot, neuroDerm, neuroTens].join(" ");
  if (neuroAll.includes("reduced") || neuroAll.includes("absent") || neuroAll.includes("diminish") || neuroAll.includes("impaired")) {
    rules.push({ module:"Neurology", confidence:"HIGH", tag:"Peripheral Neurological Deficit",
      text:"Reduced or absent sensation, reflexes, or myotomal strength indicates peripheral nerve root compromise. Correlation of dermatome, myotome, and reflex findings identifies specific nerve root level and guides targeted assessment and imaging request." });
  }

  if (neuroAll.includes("bilateral") || neuroAll.includes("both")) {
    rules.push({ module:"Neurology", confidence:"HIGH", tag:"Bilateral Neurological Signs",
      text:"Bilateral neurological findings suggest central (spinal cord or canal) pathology rather than single nerve root. Differential diagnoses include spinal stenosis, myelopathy, cauda equina syndrome, or central disc herniation. Urgent imaging indicated." });
  }

  if (neuroDerm.includes("saddle") || val("cc_main").includes("saddle") || val("rf_cauda").includes("cauda")) {
    rules.push({ module:"Neurology", confidence:"URGENT", tag:"⚠️ Cauda Equina Syndrome — EMERGENCY",
      text:"CAUDA EQUINA SYNDROME INDICATORS PRESENT. Saddle anaesthesia and/or bladder/bowel dysfunction with lumbar symptoms. EMERGENCY referral to Emergency Department. Do not delay. MRI lumbar spine urgent." });
  }

  // ── GAIT ───────────────────────────────────────────────────────────────────
  const gaitText = val("gait_pattern") + " " + val("gait_obs") + " " + val("gait_notes") + " " + getArr("gait_deviations").join(" ");
  if (gaitText.includes("trendelenburg") || gaitText.includes("pelvic drop") || gaitText.includes("hip abduct")) {
    rules.push({ module:"Gait", confidence:"HIGH", tag:"Trendelenburg Gait — Hip Abductor Insufficiency",
      text:"Trendelenburg sign or pelvic drop during single-limb stance indicates gluteus medius insufficiency on the stance limb. Creates contralateral pelvic drop, ipsilateral trunk lean (compensation), increased lumbar lateral flexion moment, and ipsilateral knee valgus during loading response." });
  }
  if (gaitText.includes("antalgic") || gaitText.includes("limp") || gaitText.includes("short") && gaitText.includes("stance")) {
    rules.push({ module:"Gait", confidence:"HIGH", tag:"Antalgic Gait Pattern",
      text:"Antalgic gait with shortened stance phase on the painful limb. Pain-avoidance mechanism reduces loading on the symptomatic structure. Articular, osseous, or acute soft tissue pathology should be considered. Quantitative load distribution assessment is indicated." });
  }
  if (gaitText.includes("valgus") || gaitText.includes("pronation") || gaitText.includes("foot")) {
    rules.push({ module:"Gait", confidence:"MOD", tag:"Lower Limb Kinetic Chain Deviation",
      text:"Foot pronation or knee valgus during gait loading phase indicates lower kinetic chain dysfunction. Hip control deficit, tibialis posterior weakness, and altered arch mechanics contribute. Functional foot orthosis and hip stabilisation programme are commonly combined interventions." });
  }
  if (gaitText.includes("foot drop") || gaitText.includes("steppage")) {
    rules.push({ module:"Gait", confidence:"HIGH", tag:"Foot Drop / Steppage Gait",
      text:"Foot drop (steppage gait) indicates L4/5 nerve root involvement or common peroneal nerve palsy. Urgent neurological investigation required. Ankle-foot orthosis (AFO) may be required for safe ambulation." });
  }

  // ── FUNCTIONAL MOVEMENT ────────────────────────────────────────────────────
  const fmaText = val("fma_squat") + " " + val("fma_notes") + " " + val("fma_movement") + " " + val("functional_notes");
  if (fmaText.includes("valgus") || fmaText.includes("knee in")) {
    rules.push({ module:"Functional", confidence:"HIGH", tag:"Dynamic Knee Valgus",
      text:"Knee valgus during loaded movement (squat, lunge, landing) indicates lower kinetic chain instability: hip abductor/external rotator weakness, limited hip mobility, and foot pronation all contribute. Increases patellofemoral, medial compartment, and ACL loading. Functional retraining is primary treatment." });
  }
  if (fmaText.includes("forward lean") || fmaText.includes("trunk") || fmaText.includes("bend forward")) {
    rules.push({ module:"Functional", confidence:"MOD", tag:"Excessive Trunk Flexion — Movement Fault",
      text:"Excessive anterior trunk lean during functional movement suggests limited ankle dorsiflexion, hip mobility restriction, or compensatory strategy for weak extensors. Ankle, hip, and thoracic mobility should be assessed and addressed in the movement retraining programme." });
  }
  if (fmaText.includes("asymmet") || fmaText.includes("left more") || fmaText.includes("right more")) {
    rules.push({ module:"Functional", confidence:"MOD", tag:"Functional Movement Asymmetry",
      text:"Asymmetric movement pattern noted during functional assessment. Neuromuscular control, mobility, or loading tolerance difference between sides. FMS composite score and specific pattern scoring guides treatment prioritisation." });
  }

  // ── PALPATION ──────────────────────────────────────────────────────────────
  const palpText = val("palp_tenderness") + " " + val("palp_tone") + " " + val("palp_swelling") + " " + val("palp_notes") + " " + val("lx_palpation");
  if (palpText.includes("trigger") || palpText.includes("hypertonic") || (palpText.includes("tender") && (palpText.includes("+++") || palpText.includes("++")))) {
    rules.push({ module:"Palpation", confidence:"MOD", tag:"Myofascial Trigger Points",
      text:"Hypertonic muscle with local tenderness ± referred pain pattern consistent with active myofascial trigger points. Dry needling, ischaemic compression, and neuromuscular inhibition are evidence-based interventions. Address contributing biomechanical factors to prevent recurrence." });
  }
  if (palpText.includes("swell") || palpText.includes("effusion") || palpText.includes("oedema")) {
    rules.push({ module:"Palpation", confidence:"HIGH", tag:"Joint Effusion / Swelling",
      text:"Swelling or effusion detected. Arthrogenic muscle inhibition of surrounding musculature is expected — particularly significant for quadriceps inhibition with knee effusion (even small amounts suppress VMO). PRICE, effusion management, and gradual loading are priorities." });
  }

  // ── CROSS-MODULE CORRELATIONS ──────────────────────────────────────────────
  // Cervical postural dysfunction cluster
  if (fhpActive && dnfWeak && romMild.some(r => r.includes("Cervical"))) {
    rules.push({ module:"Correlation", confidence:"HIGH", tag:"Cervical Postural Dysfunction Cluster",
      text:"CORRELATED: Forward head posture + deep neck flexor inhibition + cervical ROM restriction = Cervical postural dysfunction syndrome. Address motor control (deep neck flexor retraining), postural correction, and cervical mobility simultaneously. Cranio-cervical flexion test is the assessment and retraining tool of choice." });
  }

  // Lower kinetic chain instability cluster
  const hasKneeValgus = fmaText.includes("valgus") || gaitText.includes("valgus");
  if (hasKneeValgus && gluteWeak) {
    rules.push({ module:"Correlation", confidence:"HIGH", tag:"Lower Kinetic Chain Instability Cluster",
      text:"CORRELATED: Dynamic knee valgus + gluteus medius weakness = Lower kinetic chain instability. This pattern predisposes to patellofemoral pain syndrome, IT band syndrome, and ACL injury risk. Proximal hip strengthening, neuromuscular retraining, and functional biomechanical correction are the combined treatment approach." });
  }

  // Shoulder impingement full cluster
  if ((hawkins || neer) && rcWeak && painArc) {
    rules.push({ module:"Correlation", confidence:"HIGH", tag:"Shoulder Impingement Syndrome — Full Clinical Cluster",
      text:"CORRELATED: Positive impingement tests + rotator cuff weakness + painful arc = Complete subacromial impingement syndrome. Evidence-based management: rotator cuff strengthening (ER focus), scapular stabilisation (lower trapezius, serratus anterior), subacromial space optimisation, and postural retraining." });
  }

  // Neural tension + lumbar disc pattern
  if ((slump || slr) && (romMild.some(r=>r.includes("Lumbar")) || romSevere.some(r=>r.includes("Lumbar")))) {
    rules.push({ module:"Correlation", confidence:"HIGH", tag:"Lumbar Disc / Neural Compression Cluster",
      text:"CORRELATED: Positive neural tension tests + restricted lumbar ROM = Lumbar disc pathology with nerve root involvement. Neural mobilisation (slider/tensioner progressions), directional preference loading, postural correction, and graduated activity restoration are the evidence-based management priorities." });
  }

  return rules;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME SOAP BUILDER
// Pulls from ALL assessment data fields and auto-populates S, O, A, P in real time
// ═══════════════════════════════════════════════════════════════════════════════

function buildRealtimeSOAP(data, extraS="", extraO="", extraA="", extraP="") {
  const v = (k) => String(data[k] || "").trim();
  const a = (k) => {
    const x = data[k];
    if (Array.isArray(x)) return x.filter(Boolean).join(", ");
    if (typeof x === "string") return x.split("|||").filter(Boolean).join(", ");
    return String(x || "");
  };
  const has = (k) => !!(data[k] && String(data[k]).trim() && String(data[k]).trim() !== "");
  const nrs = (k) => { const n = parseFloat(v(k)); return isNaN(n) ? null : n; };

  // ── NEW FIELD BRIDGE — maps v5 regional IDs → legacy SOAP field names ──────
  // Determine which region prefix to use
  const _soap_regions = (typeof REG_MOD_S !== "undefined") ? Object.keys(REG_MOD_S).filter(r => {
    const px = REG_MOD_S[r]?.prefix;
    if (!px) return false;
    return Object.keys(data).some(k => k.startsWith(px + "_"));
  }) : [];
  const _soap_px = _soap_regions.length > 0 ? (REG_MOD_S[_soap_regions[0]]?.prefix || "") : "";
  const _rg = (suf) => {
    if (!_soap_px) return "";
    const x = data[_soap_px + "_" + suf];
    if (!x) return "";
    if (typeof x === "string") return x.split("|||").filter(Boolean).join(", ");
    return String(x || "");
  };
  // Cross-region: collect agg/rel/pattern from all active regions
  const _allAgg = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    return ["agg_mov","agg_post","agg_act","agg_other"].map(s => {
      const x = data[px + "_" + s];
      return x ? String(x).split("|||").filter(Boolean).join(", ") : "";
    }).filter(Boolean);
  }).join(", ");
  const _allRel = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    return ["rel_mov","rel_post","rel_manual","rel_med","rel"].map(s => {
      const x = data[px + "_" + s];
      return x ? String(x).split("|||").filter(Boolean).join(", ") : "";
    }).filter(Boolean);
  }).join(", ");
  const _allMoi = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    const x = data[px + "_moi"];
    return x ? String(x).split("|||").filter(Boolean) : [];
  }).join(", ");
  const _allLoc = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    const x = data[px + "_loc"] || data[px + "_location"];
    return x ? String(x).split("|||").filter(Boolean) : [];
  }).join(", ");
  const _allRad = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    const x = data[px + "_radiation"] || data[px + "_loc_radiation"];
    return x ? String(x).split("|||").filter(Boolean).filter(s => !s.includes("no radiation")) : [];
  }).join(", ");
  const _allPattern = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    const x = data[px + "_pattern"] || data[px + "_sb_pattern"];
    return x ? String(x).split("|||").filter(Boolean) : [];
  }).join(", ");
  const _allMorning = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    const x = data[px + "_morning"] || data[px + "_sb_morning"];
    return x ? String(x).split("|||").filter(Boolean) : [];
  }).join(", ");
  const _allNight = _soap_regions.flatMap(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    const x = data[px + "_night"] || data[px + "_sb_night"];
    return x ? String(x).split("|||").filter(Boolean) : [];
  }).join(", ");

  // ── S: SUBJECTIVE ──────────────────────────────────────────────────────────
  const S_parts = [];
  const name = v("dem_name");
  const age = v("dem_age");
  const sex = v("dem_sex") || v("dem_gender");
  const occ = v("dem_occupation");
  const cc = v("cc_main");
  // ── Direct scan of ALL regional prefix fields (cx_, lx_, sh_, hp_, kn_, af_, ew_, tx_) ──
  const KNOWN_PREFIXES = ["cx","lx","shl","shr","hp","knl","knr","af","ew","tx"];
  const activePrefixes = KNOWN_PREFIXES.filter(px =>
    Object.keys(data).some(k => k.startsWith(px + "_"))
  );
  const _scan = (suf) => activePrefixes.flatMap(px => {
    const x = data[`${px}_${suf}`];
    if (!x) return [];
    return String(x).split("|||").filter(Boolean);
  }).join(", ");

  // Location: scan regional loc fields first, then fall back
  const location = _allLoc
    || _scan("loc") || _scan("location")
    || a("cc_location") || a("cc_region");
  // Radiation
  const radiation = _allRad
    || activePrefixes.flatMap(px => {
      const x = data[`${px}_radiation`];
      if (!x) return [];
      return String(x).split("|||").filter(s => s && !s.toLowerCase().includes("no radiation"));
    }).join(", ")
    || a("cc_radiation");
  // Aggravating
  const agg = _allAgg
    || activePrefixes.flatMap(px =>
      ["agg_mov","agg_post","agg_act","agg_other"].map(s => {
        const x = data[`${px}_${s}`];
        return x ? String(x).split("|||").filter(Boolean).join(", ") : "";
      }).filter(Boolean)
    ).join("; ")
    || [a("agg_activity"), a("agg_movement")].filter(Boolean).join(", ");
  // Easing
  const ease = _allRel
    || activePrefixes.flatMap(px =>
      ["rel_mov","rel_post","rel_manual","rel_med","rel"].map(s => {
        const x = data[`${px}_${s}`];
        return x ? String(x).split("|||").filter(Boolean).join(", ") : "";
      }).filter(Boolean)
    ).join("; ")
    || [a("rel_posture"), a("rel_manual")].filter(Boolean).join(", ");
  // Pain quality — both global and regional
  const symType = a("cc_quality") || _scan("quality") || a("cc_symptom_type");
  const duration = a("cc_duration");
  const onset = a("cc_onset");
  const moiType = _allMoi || _scan("moi") || a("moi_type");
  const moiActivity = v("moi_activity");
  const vasNow = nrs("cc_vas_now") || nrs("pa_vas_now");
  const vasWorst = nrs("cc_vas_worst") || nrs("pa_vas_worst");
  const vasBest = nrs("cc_vas_best") || nrs("pa_vas_best");
  const painQ = a("cc_quality") || _scan("quality") || a("pa_quality");
  const painNature = a("pa_nature");
  const painPatt = _allPattern || _scan("pattern") || _scan("sb_pattern") || a("pa_pattern");
  const morningBx = _allMorning || _scan("morning") || _scan("sb_morning") || a("sb_morning");
  const nightBx = _allNight || _scan("night") || _scan("sb_night") || a("sb_night");
  // PMH: new IDs first
  const phx = a("pmh_conditions") || a("phx_conditions");
  const meds = a("med_current") || v("meds_current");
  const allergies = v("med_allergies") || v("allergy_drug") || v("allergy_other");
  // Goals: new IDs first
  const goals = [
    v("goal_main"), v("goal_concern"), v("goal_success"),
    v("ar_goal_function"), v("ar_goal_pain"), v("ar_goal_return"), v("ar_goal_sport")
  ].filter(Boolean);
  const workStatus = v("dem_work_status");

  // Opening demographics — only write if actual data is present
  const hasAnySubjective = name || cc || location || vasNow !== null || duration || onset || agg;
  if (hasAnySubjective) {
    let intro = "";
    if (name) {
      intro += `${name}`;
      const demo = [age && `${age}y`, sex, occ && `occupation: ${occ}`, workStatus && workStatus !== "" && workStatus !== name && `status: ${workStatus}`].filter(Boolean);
      if (demo.length) intro += ` (${demo.join(", ")})`;
    } else {
      intro += "Patient";
    }
    intro += " presents";
    if (cc) {
      intro += ` with: "${cc}"`;
    } else if (location) {
      intro += ` with complaints in the ${location} region`;
    }
    S_parts.push(intro + ".");
  }

  const detail = [];
  if (location && cc) detail.push(`Pain location: ${location}`);
  if (radiation && !radiation.includes("No radiation")) detail.push(`Radiation: ${radiation}`);
  if (symType) detail.push(`Symptoms: ${symType}`);
  if (duration || onset) detail.push(`Duration: ${duration || "unspecified"}. Onset: ${onset || "unspecified"}`);
  if (moiType || moiActivity) detail.push(`Mechanism: ${[moiActivity, moiType].filter(Boolean).join(" — ")}`);
  if (detail.length) S_parts.push(detail.join(". ") + ".");

  if (vasNow !== null || vasWorst !== null || vasBest !== null) {
    S_parts.push(`Pain scores (NRS): Current ${vasNow !== null ? vasNow : "—"}/10 | Worst ${vasWorst !== null ? vasWorst : "—"}/10 | Best ${vasBest !== null ? vasBest : "—"}/10.`);
  }
  const qualParts = [painQ, painNature].filter(Boolean);
  if (qualParts.length) S_parts.push(`Pain quality: ${qualParts.join("; ")}.`);
  if (painPatt) S_parts.push(`Behaviour: ${painPatt}.`);
  if (agg) S_parts.push(`Aggravating: ${agg}.`);
  if (ease) S_parts.push(`Easing: ${ease}.`);
  if (morningBx) S_parts.push(`Morning: ${morningBx}.`);
  if (nightBx) S_parts.push(`Night: ${nightBx}.`);
  if (phx) S_parts.push(`Past medical history: ${phx}.`);
  if (meds) S_parts.push(`Medications: ${meds}.`);
  if (allergies) S_parts.push(`Allergies/precautions: ${allergies}.`);

  // Red flags
  const rfFlags = [];
  const rfMap = {
    s_red1:"Unexplained weight loss", s_red2:"Night sweats/fever", s_red3:"Cancer history",
    s_red4:"Bilateral neural symptoms", s_red5:"Bowel/bladder dysfunction",
    s_red6:"Saddle anaesthesia", s_red7:"Progressive neuro deficit",
    rf_malignancy:"Malignancy screen", rf_cauda:"Cauda equina symptoms",
    rf_vascular:"Vascular red flags", rf_inflammatory:"Inflammatory markers",
    rf_fracture:"Fracture risk", rf_neuro:"Neurological red flags",
    // New v5 field IDs
    grf_systemic:"Systemic symptoms", grf_cancer:"Cancer history",
    grf_fracture:"Fracture risk", grf_infection:"Infection risk",
    grf_neuro:"Neurological red flags", grf_vascular:"Vascular red flags",
    lx_rf_cauda:"Cauda equina screen",
    cx_rf_myelopathy:"Myelopathy screen",
    cx_rf_vbi:"VBI screen",
  };
  Object.entries(rfMap).forEach(([k,label]) => {
    const val2 = String(data[k]||"").toLowerCase();
    if (val2 && !val2.includes("no ") && !val2.includes("no red flag") && !val2.includes("negative") && !val2.includes("proceed") && !val2.includes("no cauda") && !val2.includes("no myelopathy") && !val2.includes("no vbi") && !val2.includes("none")) {
      if (!rfFlags.includes(label)) rfFlags.push(label);
    }
  });
  if (rfFlags.length) S_parts.push(`⚠ RED FLAGS IDENTIFIED: ${rfFlags.join(", ")} — medical review indicated.`);

  if (goals.length) S_parts.push(`Patient goals: ${goals.join("; ")}.`);

  // ── New v5 fields: previous history, lifestyle ─────────────────────────────
  const prevPhysio = v("hx_prev_physio");
  const prevImaging = a("hx_imaging");
  const prevInjections = a("hx_injections");
  const prevEpisodes = v("hx_first");
  const hxResolve = v("hx_resolve");
  const hxProviders = a("hx_providers");
  const hxDetail = v("hx_imaging_detail");
  const prevSurgery = v("hx_surgery");

  const hxParts = [
    prevEpisodes && `Episodes: ${prevEpisodes}`,
    hxResolve && hxResolve !== "N/A — first episode" && `Previous resolution: ${hxResolve}`,
    prevPhysio && prevPhysio !== "None" && `Previous physio: ${prevPhysio}`,
    prevImaging && !prevImaging.toLowerCase().includes("none") && `Imaging: ${prevImaging}${hxDetail ? ` — ${hxDetail}` : ""}`,
    prevInjections && !prevInjections.toLowerCase().includes("none") && `Injections: ${prevInjections}`,
    prevSurgery && `Surgery: ${prevSurgery}`,
    hxProviders && !hxProviders.toLowerCase().includes("none") && `Other providers: ${hxProviders}`,
  ].filter(Boolean);
  if (hxParts.length) S_parts.push(`Previous history: ${hxParts.join(". ")}.`);

  // Patient beliefs and expectations
  const goalExpect = v("goal_expect");
  const goalBelief = v("goal_belief");
  const goalConcern = v("goal_concern");
  const goalTold = v("goal_told");
  const beliefParts = [
    goalExpect && `Recovery expectation: ${goalExpect}`,
    goalBelief && `Patient believes: ${goalBelief}`,
    goalConcern && `Main concern: ${goalConcern}`,
    goalTold && !goalTold.includes("No diagnosis") && `Diagnosis received: ${goalTold}`,
  ].filter(Boolean);
  if (beliefParts.length) S_parts.push(`Illness beliefs: ${beliefParts.join(". ")}.`);

  // Lifestyle
  const lsHealth = v("ls_health");
  const lsSmoke = v("ls_smoking");
  const lsAlcohol = v("ls_alcohol");
  const lsExercise = v("ls_exercise");
  const lsStress = v("ls_stress");
  const lsParts = [
    lsHealth && lsHealth !== "Good" && `General health: ${lsHealth}`,
    lsSmoke && !lsSmoke.includes("Never") && `Smoking: ${lsSmoke}`,
    lsAlcohol && !lsAlcohol.includes("None") && !lsAlcohol.includes("Occasional") && `Alcohol: ${lsAlcohol}`,
    lsExercise && `Exercise: ${lsExercise}`,
    lsStress && !lsStress.includes("No significant") && `Stress: ${lsStress}`,
  ].filter(Boolean);
  if (lsParts.length) S_parts.push(`Lifestyle: ${lsParts.join(". ")}.`);

  // Biopsychosocial flags
  const bpsMood = a("bps_mood");
  const bpsFear = a("bps_fear");
  const bpsWork = a("bps_work_facs");
  const bpsParts = [
    bpsMood && !bpsMood.toLowerCase().includes("normal mood") && `Mood: ${bpsMood}`,
    bpsFear && !bpsFear.toLowerCase().includes("no fear") && `Fear-avoidance: ${bpsFear}`,
    bpsWork && !bpsWork.toLowerCase().includes("no work") && `Work factors: ${bpsWork}`,
  ].filter(Boolean);
  if (bpsParts.length) S_parts.push(`Biopsychosocial factors: ${bpsParts.join(". ")}.`);

  // Region-specific notes
  _soap_regions.forEach(r => {
    const px = REG_MOD_S[r]?.prefix || "";
    if (!px) return;
    const fnNotes = v(`${px}_fn_notes`) || v(`${px}_fn_psfs`);
    const sympNotes = v(`${px}_symp_notes`);
    const locNotes = v(`${px}_loc_notes`);
    const aggNotes = v(`${px}_agg_notes`);
    const relNotes = v(`${px}_rel_notes`);
    const noteParts = [locNotes, aggNotes, relNotes, sympNotes, fnNotes].filter(Boolean);
    if (noteParts.length) S_parts.push(`${r} — Clinical notes: ${noteParts.join(". ")}.`);
  });

  if (extraS) S_parts.push(extraS);

  // ── O: OBJECTIVE ──────────────────────────────────────────────────────────
  const O_parts = [];

  // ── POSTURE / OBSERVATION ─────────────────────────────────────────────────
  {
    const postureD = [];
    // Posture defects (clicked in PostureModule)
    const DEFECT_IDS = [
      ["forward_head","Forward Head Posture"],["rounded_shoulders","Rounded/Protracted Shoulders"],
      ["thoracic_kyphosis","Increased Thoracic Kyphosis"],["lumbar_hyperlordosis","Lumbar Hyperlordosis"],
      ["anterior_pelvic_tilt","Anterior Pelvic Tilt"],["posterior_pelvic_tilt","Posterior Pelvic Tilt"],
      ["lateral_pelvic_tilt","Lateral Pelvic Tilt"],["genu_valgum","Genu Valgum"],
      ["genu_varum","Genu Varum"],["foot_pronation","Foot Overpronation"],
      ["foot_supination","Foot Supination"],["scoliosis","Scoliosis"],
      ["head_tilt","Lateral Head Tilt"],["scapular_winging","Scapular Winging"],
    ];
    DEFECT_IDS.forEach(([id, label]) => {
      if (data[`posture_defect_${id}`]) postureD.push(label);
    });
    // Sagittal engine outputs
    const sagLines = [];
    if (data.sagFHPCm || data.fhpDevCm) sagLines.push(`FHP ${data.sagFHPCm||data.fhpDevCm}cm anterior`);
    if (data.cvaAngle) sagLines.push(`CVA ${data.cvaAngle}°`);
    if (data.sagThorKyph) sagLines.push(`Thoracic kyphosis ${data.sagThorKyph}°`);
    if (data.sagLumLord) sagLines.push(`Lumbar lordosis ${data.sagLumLord}°`);
    if (data.sagPelvicShift) sagLines.push(`Pelvic shift ${data.sagPelvicShift}cm`);
    // Manual posture entries
    ["post_fhp","post_kyphosis","post_lordosis","post_pelvis","post_sh","post_scoliosis","post_notes"].forEach(k => {
      const val = v(k);
      if (val && val !== "--") sagLines.push(val);
    });
    const allP = [...postureD, ...sagLines];
    if (allP.length) O_parts.push(`Observation/Posture:\n  ${allP.join("\n  ")}.`);
  }

  // ── PALPATION ────────────────────────────────────────────────────────────
  {
    const palpRows = [];
    // Read serialized pins from data
    try {
      const pins = JSON.parse(data.palp_pins || "[]");
      if (pins.length > 0) {
        const graded = pins.filter(p => p.tenderness);
        const GRADE_LABELS = { 0:"Grade 0 (no tenderness)", 1:"Grade 1+ (mild)", 2:"Grade 2+ (moderate — grimace)", 3:"Grade 3+ (severe — withdrawal)", 4:"Grade 4+ (excruciating — jump sign)" };
        // Group by grade
        const byGrade = {};
        graded.forEach(p => {
          const g = String(p.tenderness);
          byGrade[g] = byGrade[g] || [];
          byGrade[g].push(p.label + (p.side && p.side !== "bilateral" ? ` (${p.side})` : p.side === "bilateral" ? " (bilateral)" : ""));
        });
        Object.entries(byGrade).sort(([a],[b]) => Number(b)-Number(a)).forEach(([grade, labels]) => {
          const gradeLabel = GRADE_LABELS[grade] || `Grade ${grade}+`;
          palpRows.push(`  ${gradeLabel}: ${labels.join(", ")}`);
        });
        // Tissue quality and temp
        const warm = pins.filter(p => p.temp === "Warm" || p.temp === "Hot");
        const tight = pins.filter(p => p.texture && p.texture.includes("Tight"));
        const crepit = pins.filter(p => p.texture && p.texture.includes("Crepitus"));
        if (warm.length) palpRows.push(`  Increased tissue temp: ${warm.map(p=>p.label).join(", ")}`);
        if (tight.length) palpRows.push(`  Tight/restricted: ${tight.map(p=>p.label).join(", ")}`);
        if (crepit.length) palpRows.push(`  Crepitus: ${crepit.map(p=>p.label).join(", ")}`);
        // Clinical notes
        const withNotes = pins.filter(p => p.notes && p.notes.trim());
        if (withNotes.length) {
          withNotes.slice(0,3).forEach(p => palpRows.push(`  ${p.label}: ${p.notes.trim().slice(0,80)}`));
        }
      }
    } catch(e) {}
    // Also read regional palpation fields (cx_palpation, lx_palpation etc)
    const KNOWN_PX2 = ["cx","lx","shl","shr","hp","knl","knr","af","ew","tx"];
    KNOWN_PX2.forEach(px => {
      const palp = data[`${px}_palpation`] || data[`${px}_palp`];
      if (palp) palpRows.push(`  ${px.toUpperCase()}: ${String(palp).slice(0,80)}`);
    });
    if (palpRows.length) O_parts.push(`Palpation:\n${palpRows.join("\n")}.`);
  }

  // ── ROM — correct field IDs from ROM_DATA ───────────────────────────────
  {
    const romRows = [];
    // Unilateral movements (single value)
    const uniPairs = [
      // Cervical
      ["C-Flex","rom_cflex",45],["C-Ext","rom_cext",45],
      ["C-Lat Flex L","rom_clatl",45],["C-Lat Flex R","rom_clatr",45],
      ["C-Rot L","rom_crotl",60],["C-Rot R","rom_crotr",60],
      // Thoracic
      ["Th-Flex","rom_thflex",50],["Th-Ext","rom_thext",25],
      ["Th-Rot L","rom_throtl",35],["Th-Rot R","rom_throtr",35],
      // Lumbar
      ["L-Flex","rom_lflex",60],["L-Ext","rom_lext",25],
      ["L-Lat Flex L","rom_llfl",25],["L-Lat Flex R","rom_llfr",25],
      ["L-Rot L","rom_lrotl",5],["L-Rot R","rom_lrotr",5],
    ];
    // Bilateral movements (left and right stored as romKey_left / romKey_right)
    const bilaPairs = [
      // Shoulder
      ["Sh-Flex","rom_sflex",180],["Sh-Ext","rom_sext",60],
      ["Sh-Abd","rom_sabd",180],["Sh-Add","rom_sadd",30],
      ["Sh-ER","rom_ser",90],["Sh-IR","rom_sir",70],
      // Elbow
      ["El-Flex","rom_eflex",145],["El-Ext","rom_eext",0],
      ["El-Sup","rom_esup",90],["El-Pro","rom_epro",90],
      // Wrist
      ["Wr-Flex","rom_wflex",80],["Wr-Ext","rom_wext",70],
      // Hip
      ["Hip-Flex","rom_hflex",120],["Hip-Ext","rom_hext",20],
      ["Hip-Abd","rom_habd",45],["Hip-Add","rom_hadd",30],
      ["Hip-ER","rom_her",45],["Hip-IR","rom_hir",45],
      // Knee
      ["Kn-Flex","rom_kflex",140],["Kn-Ext","rom_kext",0],
      // Ankle
      ["Ank-DF","rom_adf",20],["Ank-PF","rom_apf",50],
      ["Ank-Inv","rom_ainv",35],["Ank-Ev","rom_aev",15],
    ];
    // Helper to format single value with norm comparison
    const fmtVal = (val, norm) => {
      if (!val) return null;
      const num = parseFloat(val);
      const pct = norm > 0 ? Math.round((num/norm)*100) : null;
      const flag = pct !== null && pct < 75 ? " ⚠" : pct !== null && pct < 50 ? " ❌" : "";
      return `${val}° (norm ${norm}°${flag})`;
    };
    uniPairs.forEach(([label, key, norm]) => {
      const val = v(key);
      if (val) {
        const fmt = fmtVal(val, norm);
        const pain = v(key+"_pain");
        romRows.push(`  ${label}: ${fmt}${pain ? " — "+pain : ""}`);
      }
    });
    bilaPairs.forEach(([label, key, norm]) => {
      const vL = v(key+"_left"), vR = v(key+"_right");
      if (vL || vR) {
        const fL = vL ? fmtVal(vL, norm) : "—";
        const fR = vR ? fmtVal(vR, norm) : "—";
        const pain = v(key+"_pain_left")||v(key+"_pain_right");
        romRows.push(`  ${label}: L ${fL} / R ${fR}${pain ? " — "+pain : ""}`);
      }
    });
    // SLR from neurological module
    const slrL = v("nt_slr_left")||v("nt_slr"), slrR = v("nt_slr_right");
    if (slrL||slrR) romRows.push(`  SLR: L ${slrL||"—"} / R ${slrR||"—"} (norm >70°)`);
    if (romRows.length) O_parts.push(`Range of Motion:\n${romRows.join("\n")}.`);
  }

  // ── MMT ─────────────────────────────────────────────────────────────────
  {
    // MMT label map for clean display
    const MMT_LABELS = {
      mmt_dnf:"Deep Neck Flexors",mmt_supra:"Supraspinatus",mmt_infra:"Infraspinatus",
      mmt_subscap:"Subscapularis",mmt_serratus:"Serratus Anterior",mmt_trapL:"Lower Trap",
      mmt_trapM:"Mid Trap",mmt_trapU:"Upper Trap",mmt_deltA:"Ant Deltoid",mmt_deltM:"Mid Deltoid",
      mmt_deltP:"Post Deltoid",mmt_bicep:"Biceps",mmt_brach:"Brachialis",mmt_brachio:"Brachioradialis",
      mmt_tricep:"Triceps",mmt_ecrb:"Wrist Ext (ECRB)",mmt_fcr:"Wrist Flex (FCR)",
      mmt_edc:"Finger Ext",mmt_fdp:"Finger Flex",mmt_apbrev:"APB",mmt_adpoll:"Adductor Pollicis",
      mmt_diaphragm:"Diaphragm",mmt_ta:"Transversus Abdominis",mmt_multif:"Multifidus",
      mmt_ql:"Quadratus Lumborum",mmt_psoas:"Iliopsoas",mmt_gmax:"Gluteus Maximus",
      mmt_gmed:"Gluteus Medius",mmt_tfl:"TFL",mmt_adduc:"Adductors",mmt_quad:"Quadriceps",
      mmt_hamst:"Hamstrings",mmt_gastroc:"Gastrocnemius",mmt_soleus:"Soleus",
      mmt_ta:"Tibialis Anterior",mmt_tp:"Tibialis Posterior",mmt_peronls:"Peroneals",
      mmt_ehl:"EHL",mmt_edl:"EDL",mmt_abdhal:"Abductor Hallucis",
    };
    const mmtDeficit = [], mmtNormal = [];
    Object.keys(data).filter(k => k.startsWith("mmt_")).forEach(k => {
      const raw = String(data[k]||"").trim();
      if (!raw) return;
      const num = parseFloat(raw);
      const label = MMT_LABELS[k] || k.replace("mmt_","").replace(/_/g," ");
      if (!isNaN(num)) {
        if (num < 5) mmtDeficit.push(`${label} ${num}/5${num <= 2 ? " ❌" : num <= 3 ? " ⚠" : ""}`);
        else mmtNormal.push(label);
      } else if (raw) {
        mmtDeficit.push(`${label}: ${raw}`);
      }
    });
    const mmtLines = [];
    if (mmtDeficit.length) mmtLines.push(`  Weakness: ${mmtDeficit.join(", ")}`);
    if (mmtNormal.length && mmtDeficit.length) mmtLines.push(`  Within normal limits (5/5): ${mmtNormal.slice(0,6).join(", ")}${mmtNormal.length>6?" + more":""}`);
    if (v("mmt_notes")) mmtLines.push(`  Notes: ${v("mmt_notes")}`);
    if (mmtLines.length) O_parts.push(`Muscle Strength (MMT):\n${mmtLines.join("\n")}.`);
  }

  // ── NEUROLOGICAL ────────────────────────────────────────────────────────
  {
    const neuroLines = [];
    // Dermatomes (n_c3–n_s2, n_c3_left/_right etc)
    const dermatomes = ["c3","c4","c5","c6","c7","c8","t1","t2","l1","l2","l3","l4","l5","s1","s2"];
    const dermAbnormal = [];
    dermatomes.forEach(level => {
      const left = v(`n_${level}_left`)||v(`n_${level}`), right = v(`n_${level}_right`);
      const abnL = left && !left.toLowerCase().includes("normal") && !left.toLowerCase().includes("intact");
      const abnR = right && !right.toLowerCase().includes("normal") && !right.toLowerCase().includes("intact");
      if (abnL || abnR) {
        if (left && right) dermAbnormal.push(`${level.toUpperCase()}: L=${left} R=${right}`);
        else if (left) dermAbnormal.push(`${level.toUpperCase()}: ${left}`);
      }
    });
    if (dermAbnormal.length) neuroLines.push(`  Dermatomal: ${dermAbnormal.join("; ")}`);
    // Myotomes  
    const myoKeys = ["n_c5","n_c6","n_c7","n_c8","n_t1","n_l3","n_l4","n_l5","n_s1","n_s2"];
    const myoAbn = [];
    myoKeys.forEach(k => {
      const val = v(k);
      if (val && val.match(/[1-4]\/5|weak|reduced/i)) myoAbn.push(`${k.replace("n_","").toUpperCase()}: ${val}`);
    });
    if (myoAbn.length) neuroLines.push(`  Myotomes: ${myoAbn.join("; ")}`);
    // Reflexes  
    const refKeys = [["n_biceps","Biceps (C5/6)"],["n_brachio","Brachio (C6)"],["n_triceps","Triceps (C7)"],
                     ["n_patella","Patella (L3/4)"],["n_achilles","Achilles (S1)"],["n_babinski","Babinski"]];
    const refAbn = [];
    refKeys.forEach(([k,label]) => {
      const val = v(k);
      if (val && (val.includes("+") || val.toLowerCase().includes("abn") || val.toLowerCase().includes("hyper") || val.toLowerCase().includes("absent")))
        refAbn.push(`${label}: ${val}`);
    });
    if (refAbn.length) neuroLines.push(`  Reflexes: ${refAbn.join("; ")}`);
    // Neural tension tests
    const ntTests = [["nt_slump","Slump"],["nt_slr","SLR"],["nt_ultt1","ULTT1"],
                     ["nt_ultt2","ULTT2"],["nt_ultt3","ULTT3"],["nt_femoral","Femoral stretch"]];
    const ntPos = [], ntNeg = [];
    ntTests.forEach(([k,label]) => {
      const val = v(k);
      if (!val) return;
      if (val.toLowerCase().includes("positive") || val.toLowerCase().includes("pos ")) ntPos.push(`${label} (${val.slice(0,40)})`);
      else if (val.toLowerCase().includes("negative") || val.toLowerCase().includes("neg ")) ntNeg.push(label);
    });
    if (ntPos.length) neuroLines.push(`  Neural Tension +ve: ${ntPos.join("; ")}`);
    if (ntNeg.length) neuroLines.push(`  Neural Tension -ve: ${ntNeg.join(", ")}`);
    // Red flags neurological
    const nrfKeys = [["nrf_myelopathy","Myelopathy signs"],["nrf_cauda","Cauda equina"],
                     ["nrf_saddle","Saddle anaesthesia"],["nrf_sphincter","Sphincter dysfunction"],
                     ["nrf_bilateral","Bilateral signs"],["nrf_prog_weak","Progressive weakness"]];
    const nrfFlags = nrfKeys.filter(([k]) => data[k] === true || String(data[k]).includes("yes") || String(data[k]).includes("present"))
                              .map(([,label]) => label);
    if (nrfFlags.length) neuroLines.push(`  ⚠️ Red Flags: ${nrfFlags.join(", ")}`);
    // GCS if recorded
    const gcsE = v("gcs_eye"), gcsV = v("gcs_verbal"), gcsM = v("gcs_motor");
    if (gcsE||gcsV||gcsM) {
      const total = (Number(gcsE)||0)+(Number(gcsV)||0)+(Number(gcsM)||0);
      neuroLines.push(`  GCS: E${gcsE||"?"}+V${gcsV||"?"}+M${gcsM||"?"} = ${total||"?"}/15`);
    }
    // General neuro notes
    if (v("neuro_clinician_notes")) neuroLines.push(`  Notes: ${v("neuro_clinician_notes")}`);
    if (neuroLines.length) O_parts.push(`Neurological:\n${neuroLines.join("\n")}.`);
  }

  // Special Tests
  const allStKeys = Object.keys(data).filter(k => k.startsWith("st_") || k.startsWith("lx_kemp") || k.startsWith("lx_slump") || k.startsWith("lx_slr") || k.startsWith("lx_prone"));
  const posTestsList = allStKeys.filter(k => String(data[k]).toLowerCase().includes("positive")).map(k => {
    const label = k.replace("st_","").replace("lx_","").replace(/_/g," ");
    const result = String(data[k]).substring(0,50);
    return `${label} (${result})`;
  });
  const negTestsList = allStKeys.filter(k => String(data[k]).toLowerCase().includes("negative")).map(k => k.replace("st_","").replace("lx_","").replace(/_/g," "));
  if (posTestsList.length || negTestsList.length) {
    const stLines = [];
    if (posTestsList.length) stLines.push(`  Positive: ${posTestsList.join("; ")}`);
    if (negTestsList.length) stLines.push(`  Negative: ${negTestsList.join(", ")}`);
    O_parts.push(`Special Tests:\n${stLines.join("\n")}.`);
  }

  // ── NKT (Neurokinetic Therapy) ──────────────────────────────────────────
  {
    // All 47 NKT test IDs in order
    const NKT_IDS = [
      ["nkt_dnf","Deep Neck Flexors"],["nkt_scm","SCM"],["nkt_suboccip","Suboccipitals"],
      ["nkt_upper_trap","Upper Trap"],["nkt_scalenes","Scalenes"],["nkt_levator_scap","Levator Scapulae"],
      ["nkt_splenius","Splenius"],["nkt_semispinalis","Semispinalis"],["nkt_lower_trap","Lower Trap"],
      ["nkt_serratus","Serratus Anterior"],["nkt_infraspinatus","Infraspinatus/Teres Minor"],
      ["nkt_subscapularis","Subscapularis"],["nkt_mid_trap","Mid Trap/Rhomboids"],
      ["nkt_pec_minor","Pec Minor"],["nkt_ant_deltoid","Ant Deltoid"],["nkt_post_deltoid","Post Deltoid"],
      ["nkt_teres_major","Teres Major"],["nkt_ta","Transversus Abdominis"],
      ["nkt_multifidus","Multifidus"],["nkt_diaphragm","Diaphragm"],["nkt_ql","Quadratus Lumborum"],
      ["nkt_psoas","Iliopsoas"],["nkt_erector_spinae","Erector Spinae"],["nkt_obliques","Obliques"],
      ["nkt_pelvic_floor","Pelvic Floor"],["nkt_gmax","Glute Max"],["nkt_gmed","Glute Med"],
      ["nkt_piriformis","Piriformis"],["nkt_hip_flex_fo","Hip Ext Firing Order"],["nkt_vmo","VMO"],
      ["nkt_hamstrings","Hamstrings"],["nkt_adductors","Adductors"],["nkt_tfl","TFL"],
      ["nkt_rectus_fem","Rectus Femoris"],["nkt_popliteus","Popliteus"],["nkt_tib_ant","Tib Anterior"],
      ["nkt_tib_post","Tib Posterior"],["nkt_gastroc","Gastroc/Soleus"],["nkt_peroneals","Peroneals"],
      ["nkt_fhl","FHL"],["nkt_foot_intrinsics","Foot Intrinsics"],["nkt_biceps","Biceps"],
      ["nkt_triceps","Triceps"],["nkt_wrist_ext","Wrist Ext"],["nkt_wrist_flex","Wrist Flex"],
      ["nkt_pronator","Pronator Teres"],["nkt_grip","Grip/Intrinsics"],
    ];
    const nktInh = [], nktFac = [], nktNorm = [];
    NKT_IDS.forEach(([id, label]) => {
      const val = String(data[id]||"").trim();
      if (val === "Inhibited") nktInh.push(label);
      else if (val === "Facilitated") nktFac.push(label);
      else if (val === "Normal") nktNorm.push(label);
    });
    const nktLines = [];
    if (nktInh.length) nktLines.push(`  Inhibited (MCC dysfunction): ${nktInh.join(", ")}`);
    if (nktFac.length) nktLines.push(`  Facilitated/Overactive (compensating): ${nktFac.join(", ")}`);
    if (nktNorm.length && (nktInh.length || nktFac.length)) nktLines.push(`  Normal: ${nktNorm.slice(0,5).join(", ")}${nktNorm.length>5?` + ${nktNorm.length-5} more`:""}`);
    if (v("nkt_notes")) nktLines.push(`  Notes: ${v("nkt_notes")}`);
    if (nktLines.length) O_parts.push(`Neuromuscular Assessment (NKT):\n${nktLines.join("\n")}.`);
  }

  // ── FUNCTIONAL MOVEMENT ASSESSMENT ─────────────────────────────────────
  {
    const fmaLines = [];
    const FMA_MOVEMENTS = [
      ["squat","Bilateral Squat"],["gait","Gait"],["single_leg","Single Leg Stance"],
      ["lunge","Forward Lunge"],["bend","Forward Bend/Hip Hinge"],["overhead","Overhead Reach"],
      ["step_down","Step Down"],["pushup_plus","Push-Up Plus"],
      ["rotary_stability","Rotary Stability"],["upper_reach","Upper Limb Reach"],
    ];
    const FMS_SCORES = [
      ["sp_fms_sq","Deep Squat"],["sp_fms_hs_l","Hurdle Step L"],["sp_fms_hs_r","Hurdle Step R"],
      ["sp_fms_il_l","Inline Lunge L"],["sp_fms_il_r","Inline Lunge R"],
      ["sp_fms_sm_l","Shoulder Mob L"],["sp_fms_sm_r","Shoulder Mob R"],
      ["sp_fms_aslr_l","ASLR L"],["sp_fms_aslr_r","ASLR R"],
      ["sp_fms_tspu","TSPU"],["sp_fms_rs_l","Rotary Stab L"],["sp_fms_rs_r","Rotary Stab R"],
    ];
    FMA_MOVEMENTS.forEach(([id, label]) => {
      const comp = data[`fma_compensation_${id}`] || data[`fma_${id}`];
      const score = data[`fma_score_${id}`];
      const notes = data[`fma_notes_${id}`];
      if (comp || score || notes) {
        let line = `  ${label}:`;
        if (score) line += ` Score ${score}`;
        if (comp) line += ` — Compensations: ${Array.isArray(comp)?comp.join(", "):comp}`;
        if (notes) line += ` (${String(notes).slice(0,60)})`;
        fmaLines.push(line);
      }
    });
    // FMS scoring
    const fmsScores = FMS_SCORES.filter(([k]) => data[k]).map(([k, label]) => `${label}: ${data[k]}/3`);
    if (fmsScores.length) {
      const total = FMS_SCORES.reduce((sum,[k]) => sum+(Number(data[k])||0), 0);
      fmaLines.push(`  FMS Scores: ${fmsScores.join(", ")} [Total: ${total}/21]${total<14?" ⚠️ elevated injury risk":""}`);
    }
    if (v("fma_notes")) fmaLines.push(`  Notes: ${v("fma_notes")}`);
    if (fmaLines.length) O_parts.push(`Functional Movement Assessment:\n${fmaLines.join("\n")}.`);
  }

  // ── KINETIC CHAIN ─────────────────────────────────────────────────────────
  {
    const kcLines = [];
    const KC_IDS = [
      ["kc_ankle_df","Ankle DF Lunge Test"],["kc_subtalar","Subtalar Mobility"],
      ["kc_great_toe","1st MTP Extension"],["kc_knee_stability","Knee Valgus Stress"],
      ["kc_patellar_mobility","Patellar Mobility"],["kc_tibiofemoral_rot","Tibial Rotation"],
      ["kc_hip_ir_mob","Hip IR Mobility"],["kc_hip_ext_mob","Hip Ext — Thomas Test"],
      ["kc_hip_er_mob","Hip ER Mobility"],["kc_hip_abd_mob","Hip Abd Mobility"],
      ["kc_lumbar_stability","Lumbar Stability"],["kc_lumbar_flexion_ctrl","Lumbar Flex Control"],
      ["kc_lumbar_rotation_ctrl","Lumbar Rot Control"],["kc_thoracic_rotation","Thoracic Rotation"],
      ["kc_thoracic_extension","Thoracic Extension"],["kc_rib_mobility","Rib Cage Mobility"],
      ["kc_scapulohumeral_rhythm","Scapulohumeral Rhythm"],["kc_gh_ir_mob","GH IR — GIRD"],
      ["kc_cervical_thoracic_jct","CT Junction"],["kc_cervical_rot_mob","Cervical Rotation"],
      ["kc_cervical_flex_ext","Cervical Flex/Ext"],
    ];
    const kcFail = [], kcPass = [];
    KC_IDS.forEach(([id, label]) => {
      const val = String(data[id]||"").trim().toLowerCase();
      if (!val) return;
      if (val.includes("restricted") || val.includes("fail") || val.includes("limited") || val.includes("dysfunc") || val.includes("unstable") || val.includes("abnormal"))
        kcFail.push(`${label} (${data[id].toString().slice(0,30)})`);
      else if (val.includes("normal") || val.includes("pass") || val.includes("adequate"))
        kcPass.push(label);
    });
    const kcNotes = data["kc_notes"] || data["kc_summary"];
    if (kcFail.length) kcLines.push(`  Dysfunction identified: ${kcFail.join("; ")}`);
    if (kcPass.length && kcFail.length) kcLines.push(`  Normal: ${kcPass.slice(0,5).join(", ")}`);
    if (kcNotes) kcLines.push(`  Notes: ${String(kcNotes).slice(0,120)}`);
    if (kcLines.length) O_parts.push(`Kinetic Chain Assessment:\n${kcLines.join("\n")}.`);
  }

  // ── CYRIAX / END-FEEL ASSESSMENT ─────────────────────────────────────────
  {
    const cyriaxLines = [];
    // Cyriax fields are stored as cy_ prefix
    const CY_MOVEMENTS = [
      ["cy_a_flex","Active Flex"],["cy_a_ext","Active Ext"],["cy_a_rotl","Active Rot L"],
      ["cy_a_rotr","Active Rot R"],["cy_a_sfl","Active Lat Flex L"],["cy_a_sfr","Active Lat Flex R"],
      ["cy_p_flex","Passive Flex"],["cy_p_ext","Passive Ext"],["cy_p_rotl","Passive Rot L"],
      ["cy_p_rotr","Passive Rot R"],["cy_r_flex","Resisted Flex"],["cy_r_ext","Resisted Ext"],
    ];
    CY_MOVEMENTS.forEach(([k, label]) => {
      const val = v(k);
      if (val) cyriaxLines.push(`  ${label}: ${val}`);
    });
    // End-feel
    const efKeys = Object.keys(data).filter(k => k.startsWith("ef_") || k.startsWith("endfeel_"));
    efKeys.forEach(k => {
      const val = v(k);
      if (val) cyriaxLines.push(`  End-feel ${k.replace("ef_","").replace("endfeel_","").replace(/_/g," ")}: ${val}`);
    });
    // Cyriax scan - contractile vs non-contractile
    if (v("cy_contractile")) cyriaxLines.push(`  Contractile: ${v("cy_contractile")}`);
    if (v("cy_non_contractile")) cyriaxLines.push(`  Non-contractile: ${v("cy_non_contractile")}`);
    if (v("cy_capsular_pattern")) cyriaxLines.push(`  Capsular pattern: ${v("cy_capsular_pattern")}`);
    if (v("cy_notes")) cyriaxLines.push(`  Notes: ${v("cy_notes")}`);
    if (cyriaxLines.length) O_parts.push(`Cyriax / Selective Tissue Tension:\n${cyriaxLines.join("\n")}.`);
  }

  // ── FASCIAL ASSESSMENT ────────────────────────────────────────────────────
  {
    const faLines = [];
    const FA_FIELDS = [
      ["fa_passive_tension","Passive Line Tension"],["fa_active_line_load","Active Line Loading"],
      ["fa_densification","Fascial Densification (Stecco)"],["fa_sbl_hamstring","SBL — Hamstring"],
      ["fa_dfl_arch","DFL — Arch"],["fa_dfl_breathing","DFL — Breathing"],
      ["fa_ll_test","Lateral Line"],["fa_spiral_rot","Spiral Line Rotation"],
      ["fa_tlf","Thoracolumbar Fascia"],["fa_remote_test","Remote Tension Test"],
      ["fa_scar","Scar/Adhesion"],["fa_skin_roll","Skin Rolling"],
      ["fa_force_closure","Force Closure"],["fa_compensation_map","Compensation Map"],
    ];
    FA_FIELDS.forEach(([k, label]) => {
      const val = v(k);
      if (val && val.trim()) faLines.push(`  ${label}: ${val.slice(0,80)}`);
    });
    // Also scan fa_ fields not in list
    Object.keys(data).filter(k => k.startsWith("fa_") && !FA_FIELDS.some(([fk]) => fk===k)).forEach(k => {
      const val = v(k);
      if (val) faLines.push(`  ${k.replace("fa_","").replace(/_/g," ")}: ${val.slice(0,60)}`);
    });
    if (faLines.length) O_parts.push(`Fascial Assessment:\n${faLines.join("\n")}.`);
  }

  // ── BODY CHART ANNOTATIONS ─────────────────────────────────────────────────
  try {
    const annotations = JSON.parse(data.body_chart_annotations || "[]");
    const annNotes = annotations
      .filter(ann => ann.text && String(ann.text).trim())
      .map(ann => {
        const side = ann.side === "back" ? "Posterior" : "Anterior";
        const region = ann.region ? ` — ${ann.region}` : "";
        return `  • [${side}${region}] ${ann.text}`;
      });
    if (annNotes.length) {
      O_parts.push(`Pain Chart (Body Diagram):\n${annNotes.join("\n")}`);
    }
  } catch { /* body chart not yet drawn */ }

  // Outcome Measures
  const omRows = [1,2,3].map(i => {
    const act = v(`om_psfs${i}`);
    const now2 = v(`om_psfs${i}_now`);
    const goal2 = v(`om_psfs${i}_goal`);
    if (act) return `PSFS Activity ${i}: "${act}" — Now: ${now2||"—"}/10, Goal: ${goal2||"—"}/10`;
    return null;
  }).filter(Boolean);
  if (omRows.length) O_parts.push(`Outcome Measures:\n  ${omRows.join("\n  ")}`);

  // Gait
  const gaitObs = v("gait_observation") || v("gait_pattern") || v("gait_notes");
  const gaitDevs = a("gait_deviations");
  if (gaitObs || gaitDevs) O_parts.push(`Gait Analysis: ${[gaitObs, gaitDevs && `Deviations: ${gaitDevs}`].filter(Boolean).join(". ")}.`);

  // Functional Movement
  const fmaObs = v("fma_squat") || v("fma_notes") || v("fma_movement") || v("functional_notes");
  if (fmaObs) O_parts.push(`Functional Movement: ${fmaObs}.`);

  // Session treatment log
  const txSessArr = Array.isArray(data.tx_sessions) ? data.tx_sessions : [];
  const latestSess = txSessArr[0];
  if (latestSess?.treatmentGiven) {
    O_parts.push(`Treatment Given (Session ${latestSess.sessionNo||""}${latestSess.date?` — ${latestSess.date}`:""}): ${latestSess.treatmentGiven}.`);
    if (latestSess.vasStart || latestSess.vasEnd) {
      O_parts.push(`Pain response: Pre-Tx ${latestSess.vasStart||"?"}/10 → Post-Tx ${latestSess.vasEnd||"?"}/10.`);
    }
  }

  if (extraO) O_parts.push(extraO);

  // ── A: ASSESSMENT ──────────────────────────────────────────────────────────
  const A_parts = [];

  // ── Try v6 engine first (new regional subjective) ──────────────────────────
  const _v6Regions = _soap_regions.length > 0 ? _soap_regions : null;
  const _v6Result = (_v6Regions && typeof runEngineV6 === "function")
    ? runEngineV6(data, _v6Regions)
    : null;

  // dx declared here so Plan section can access it regardless of which branch runs
  let dx = null;

  if (_v6Result?.regionResults?.length) {
    A_parts.push("CLINICAL IMPRESSION (Engine v6 — Ranked Differentials):");
    _v6Result.regionResults.forEach((r, i) => {
      A_parts.push(`\n  Region ${i+1}: ${r.region}`);
      A_parts.push(`  Primary hypothesis: ${r.primaryPattern} [${r.confidence} CONFIDENCE]`);
      if (r.differentials?.length > 1) {
        A_parts.push(`  Differentials:`);
        r.differentials.forEach((d, j) => {
          A_parts.push(`    ${j===0?"①":j===1?"②":"③"} ${d.label} [${d.confidence}]`);
          if (d.evidence) A_parts.push(`       Evidence: ${d.evidence}`);
        });
      }
      if (r.precautions?.filter(p=>p).length > 0) {
        A_parts.push(`  Precautions/Red Flags:`);
        r.precautions.filter(p=>p).forEach(p => A_parts.push(`    ⚠ ${p}`));
      }
    });
    if (_v6Result.cross?.length > 0) {
      A_parts.push("\nCross-Region Clinical Interactions:");
      _v6Result.cross.forEach(cf => {
        A_parts.push(`  [${cf.type}] ${cf.title}`);
        A_parts.push(`  ${cf.detail.substring(0, 180)}...`);
      });
    }
    if (_v6Result.anyUrgent) {
      A_parts.push("\n⚠ URGENT FLAGS IDENTIFIED — Medical review required before physiotherapy treatment");
    }
  } else {
    // Fall back to legacy diagnosis engine
    dx = typeof generateDiagnosis === "function" ? generateDiagnosis(data) : null;
    if (dx?.dx?.length) {
      A_parts.push("Clinical Impression:");
      dx.dx.forEach((d,i) => {
        A_parts.push(`  ${i+1}. ${d.name} (${d.confidence} confidence — ${d.system})`);
        if (d.evidence?.length) A_parts.push(`     Evidence: ${d.evidence.join(", ")}.`);
        if (d.mechanism) A_parts.push(`     Mechanism: ${d.mechanism}`);
      });
    } else if (v("cc_main") || location) {
      const ccText = v("cc_main") || `${location} dysfunction`;
      A_parts.push(`Clinical Impression: ${ccText}. Objective assessment required to confirm working hypothesis.`);
    }
  }

  // Add interpretation summary from rule engine
  const interps = buildClinicalInterpretation(data);
  const highConf = interps.filter(r => r.confidence === "HIGH" || r.confidence === "URGENT");
  const corrConf = interps.filter(r => r.module === "Correlation");
  if (highConf.length) {
    A_parts.push("\nKey Clinical Findings:");
    highConf.forEach(r => A_parts.push(`  • [${r.module}] ${r.tag}: ${r.text}`));
  }
  if (corrConf.length) {
    A_parts.push("\nCorrelated Patterns:");
    corrConf.forEach(r => A_parts.push(`  • ${r.tag}: ${r.text}`));
  }

  // ── FMS INDIVIDUAL MOVEMENT SCORES ────────────────────────────────────────
  if (dx?.fmsTotal !== null && dx?.fmsTotal !== undefined) {
    const fmsRisk = dx.fmsTotal >= 17 ? "Low" : dx.fmsTotal >= 15 ? "Moderate" : "High";
    const fmsFlag = dx.fmsTotal >= 17 ? "✅" : dx.fmsTotal >= 15 ? "⚠️" : "🔴";
    const fmsMovements = [
      ["Deep Squat",           "sp_fms_sq"],
      ["Hurdle Step L",        "sp_fms_hs_l"],
      ["Hurdle Step R",        "sp_fms_hs_r"],
      ["Inline Lunge L",       "sp_fms_il_l"],
      ["Inline Lunge R",       "sp_fms_il_r"],
      ["Shoulder Mob L",       "sp_fms_sm_l"],
      ["Shoulder Mob R",       "sp_fms_sm_r"],
      ["ASLR L",               "sp_fms_aslr_l"],
      ["ASLR R",               "sp_fms_aslr_r"],
      ["Trunk Stability PU",   "sp_fms_tspu"],
      ["Rotary Stability L",   "sp_fms_rs_l"],
      ["Rotary Stability R",   "sp_fms_rs_r"],
    ];
    const fmsRows = fmsMovements
      .map(([label, key]) => {
        const score = v(key);
        if (!score) return null;
        const flag = score === "0" ? " 🔴" : score === "1" ? " ⚠️" : "";
        return `  ${label.padEnd(22)}: ${score}/3${flag}`;
      })
      .filter(Boolean);
    const asymmetries = [];
    [["Hurdle Step","sp_fms_hs_l","sp_fms_hs_r"],
     ["Inline Lunge","sp_fms_il_l","sp_fms_il_r"],
     ["Shoulder Mob","sp_fms_sm_l","sp_fms_sm_r"],
     ["ASLR","sp_fms_aslr_l","sp_fms_aslr_r"],
     ["Rotary Stability","sp_fms_rs_l","sp_fms_rs_r"]].forEach(([name,kL,kR]) => {
      const l = parseFloat(v(kL)), r = parseFloat(v(kR));
      if (!isNaN(l) && !isNaN(r) && l !== r) asymmetries.push(`${name} (L:${l} vs R:${r})`);
    });
    let fmsBlock = `FMS Total: ${dx.fmsTotal}/21 — ${fmsFlag} ${fmsRisk} injury risk`;
    if (fmsRows.length) fmsBlock += `\n${fmsRows.join("\n")}`;
    if (asymmetries.length) fmsBlock += `\n  ⚠️ Asymmetries: ${asymmetries.join(", ")}`;
    A_parts.push(`\n${fmsBlock}`);
  }

  const prog = v("prognosis") || v("px_prognosis");
  if (prog) A_parts.push(`\nPrognosis: ${prog}.`);
  if (extraA) A_parts.push(`\n${extraA}`);

  // ── P: PLAN ────────────────────────────────────────────────────────────────
  const P_parts = [];
  // P section header only added if there is actual plan content

  if (dx?.dx?.length && dx.dx[0].treatment?.length) {
    dx.dx[0].treatment.forEach(t => P_parts.push(`  • ${t}`));
  }

  // Treatment techniques
  const txTechniques = Array.isArray(data.tx_techniques) ? data.tx_techniques : [];
  if (txTechniques.length) {
    P_parts.push("\nTreatment Techniques Applied:");
    txTechniques.forEach(t => {
      if (t.type==="manual") P_parts.push(`  • Joint Mobilisation — ${t.technique||""}${t.grade?` Grade ${t.grade}`:""}${t.region?` — ${t.region}`:""}${t.laterality?` (${t.laterality})`:""}${t.dosage?`. Dosage: ${t.dosage}`:""}`);
      else if (t.type==="dn") P_parts.push(`  • Dry Needling — ${t.dn_muscle||""}${t.laterality?` (${t.laterality})`:""}${t.dn_needles?`, ${t.dn_needles} needles`:""}${t.dn_depth?`, depth ${t.dn_depth}`:""}${t.dn_twitch?`. LTR: ${t.dn_twitch}`:""}`);
      else if (t.type==="taping") P_parts.push(`  • Taping — ${t.tape_type||""}${t.tape_goal?`. Goal: ${t.tape_goal}`:""}`);
      else if (t.type==="st") P_parts.push(`  • Soft Tissue — ${t.st_technique||""}${t.st_region?` — ${t.st_region}`:""}${t.duration?`, ${t.duration}`:""}`);
      else if (t.type==="us") P_parts.push(`  • Ultrasound — ${t.us_freq||""} ${t.us_mode||""}${t.us_intensity?`, ${t.us_intensity}W/cm²`:""}${t.us_area?` — ${t.us_area}`:""}`);
      else if (t.type==="electro") P_parts.push(`  • ${t.electro_type||"Electrotherapy"}${t.electro_params?` — ${t.electro_params}`:""}`);
      else if (t.technique) P_parts.push(`  • ${t.technique}${t.region?` — ${t.region}`:""}`);
      if (t.response) P_parts.push(`    Response: ${t.response}`);
    });
  }

  // HEP
  const hepArr = Array.isArray(data.hep_programme) ? data.hep_programme : [];
  if (hepArr.length) {
    P_parts.push("\nHome Exercise Programme:");
    hepArr.forEach((ex,i) => P_parts.push(`  ${i+1}. ${ex.name} — ${ex.customSets||ex.sets}×${ex.customReps||ex.reps}, hold ${ex.customHold||ex.hold}s, ${ex.customFreq||ex.freq}${ex.notes?` (${ex.notes})`:""}`));
  }

  // Session next plan
  if (latestSess?.nextPlan) P_parts.push(`\nNext Session: ${latestSess.nextPlan}`);
  if (latestSess?.goals) P_parts.push(`Session Goals: ${latestSess.goals}`);

  // Posture correction
  const selDef = Object.values(typeof POSTURE_DEFECTS !== "undefined" ? POSTURE_DEFECTS : {}).filter(d => data[`posture_defect_${d.id}`]);
  if (selDef.length) {
    P_parts.push("\nPostural Correction Exercises:");
    selDef.slice(0,3).forEach(d => {
      P_parts.push(`  ${d.label}:`);
      d.exercises?.slice(0,3).forEach(e => P_parts.push(`    • ${e}`));
    });
  }

  const freq = v("tx_frequency") || v("tx_freq");
  const dur = v("tx_duration_plan");
  if (freq) P_parts.push(`\nReview: ${freq}${dur?` for ${dur}`:""}.`);

  const referral = v("referral_plan") || v("referral_notes");
  if (referral) P_parts.push(`Referral: ${referral}.`);
  if (extraP) P_parts.push(`\n${extraP}`);

  // Only add Treatment Plan header if there's actual plan content
  if (P_parts.length > 0) P_parts.unshift("Treatment Plan:");

  return {
    S: S_parts.join("\n"),
    O: O_parts.join("\n\n"),
    A: A_parts.join("\n"),
    P: P_parts.join("\n"),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOAP NOTE MODULE — Upgraded with Real-Time SOAP + Suggested Interpretation
// ═══════════════════════════════════════════════════════════════════════════════
function SOAPNoteModule({ data }) {
  const PC = typeof getC === "function" ? getC() : {
    surface:"#ffffff", s2:"#f5f0fb", s3:"#ede7f6", border:"#d8cce8",
    accent:"#7c3aed", a2:"#9333ea", a3:"#059669", text:"#1a1025",
    muted:"#7e6a9a", red:"#dc2626", yellow:"#b45309", green:"#059669",
    isDark:false
  };

  const [clinician, setClinician] = useState("");
  const [clinic,    setClinic]    = useState("");
  const [session,   setSession]   = useState("Initial Assessment");
  const [extraS,    setExtraS]    = useState("");
  const [extraO,    setExtraO]    = useState("");
  const [extraA,    setExtraA]    = useState("");
  const [extraP,    setExtraP]    = useState("");
  const [copied,    setCopied]    = useState(null);
  const [activeTab, setActiveTab] = useState("soap"); // "soap" | "interp" | "both"

  // Real-time SOAP auto-built every render (useMemo for perf)
  const soap = useMemo(() => buildRealtimeSOAP(data, extraS, extraO, extraA, extraP), [data, extraS, extraO, extraA, extraP]);
  const interpretations = useMemo(() => buildClinicalInterpretation(data), [data]);

  const urgentRules = interpretations.filter(r => r.confidence === "URGENT");
  const highRules = interpretations.filter(r => r.confidence === "HIGH" && r.module !== "Correlation");
  const corrRules = interpretations.filter(r => r.module === "Correlation");
  const modRules = interpretations.filter(r => r.confidence === "MOD");
  const totalRules = interpretations.length;

  // ── AI Clinical Assistant ─────────────────────────────────────────────────
  const [aiKey,       setAiKey]       = useState(() => localStorage.getItem("groq_api_key") || "");
  const [aiKeyInput,  setAiKeyInput]  = useState("");
  const [aiKeySet,    setAiKeySet]    = useState(() => !!localStorage.getItem("groq_api_key"));
  const [aiMode,      setAiMode]      = useState("ask");
  const [aiQuestion,  setAiQuestion]  = useState("");
  const [aiResponse,  setAiResponse]  = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState(null);

  const saveKey = () => {
    const k = aiKeyInput.trim();
    if (!k.startsWith("gsk_")) { setAiError("Invalid key — Groq keys start with 'gsk_'"); return; }
    localStorage.setItem("groq_api_key", k);
    setAiKey(k); setAiKeySet(true); setAiKeyInput(""); setAiError(null);
  };
  const clearKey = () => { localStorage.removeItem("groq_api_key"); setAiKey(""); setAiKeySet(false); setAiResponse(null); };

  const buildPatientContext = () => {
    return `SOAP NOTE:\nS: ${soap.S}\n\nO: ${soap.O}\n\nA: ${soap.A}\n\nP: ${soap.P}`;
  };

  const callGroq = async (prompt) => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json", "Authorization":`Bearer ${aiKey}`},
      body: JSON.stringify({ model:"llama-3.3-70b-versatile", messages:[{role:"user",content:prompt}], temperature:0.4, max_tokens:1200 })
    });
    if (!res.ok) {
      const e = await res.json();
      const msg = e?.error?.message || `HTTP ${res.status}`;
      if (msg.includes('rate')||msg.includes('limit')) throw new Error("Groq rate limit — wait a few seconds and retry.");
      throw new Error(msg);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "No response received.";
  };

  const runAsk = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true); setAiError(null); setAiResponse(null);
    try {
      const context = buildPatientContext();
      const prompt = `You are an expert physiotherapist and clinical reasoning assistant.\n\nPatient SOAP Note:\n${context}\n\nClinician Question: ${aiQuestion}\n\nProvide a concise, evidence-based clinical response (2-4 paragraphs max).`;
      setAiResponse(await callGroq(prompt));
    } catch(e) { setAiError(e.message); }
    setAiLoading(false);
  };

  const runDdx = async () => {
    setAiLoading(true); setAiError(null); setAiResponse(null);
    try {
      const context = buildPatientContext();
      const prompt = `You are an expert physiotherapist. Analyse this patient data and generate a clinical differential diagnosis with confidence levels and evidence-based treatment recommendations.\n\nPatient Data:\n${context}\n\nProvide:\n1. Top 3 differential diagnoses with confidence %\n2. Key supporting evidence for each\n3. Tests needed to confirm primary diagnosis\n4. Evidence-based treatment priorities\n\nBe concise and clinically precise.`;
      setAiResponse(await callGroq(prompt));
    } catch(e) { setAiError(e.message); }
    setAiLoading(false);
  };

  const runEnhance = async () => {
    setAiLoading(true); setAiError(null); setAiResponse(null);
    try {
      const prompt = `You are an expert physiotherapy documentation specialist. Rewrite this SOAP note with professional clinical language, proper medical terminology, expanded clinical reasoning, and medico-legally defensible documentation.\n\nOriginal SOAP:\nS: ${soap.S}\n\nO: ${soap.O}\n\nA: ${soap.A}\n\nP: ${soap.P}\n\nProvide the enhanced SOAP note maintaining the same structure (S/O/A/P). Use professional physiotherapy terminology throughout.`;
      setAiResponse(await callGroq(prompt));
    } catch(e) { setAiError(e.message); }
    setAiLoading(false);
  };

  // ── Copy helpers ──────────────────────────────────────────────────────────
  const copySection = (key, text) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(()=>setCopied(null),2000); });
  };
  const copyFull = () => {
    const d2 = new Date().toLocaleDateString("en-AU",{day:"2-digit",month:"long",year:"numeric"});
    const text = [
      `SOAP CLINICAL NOTE`,
      `Patient: ${data["dem_name"]||"—"} | Date: ${d2} | Session: ${session}`,
      `Clinician: ${clinician||"—"} | Clinic: ${clinic||"—"}`,
      "═".repeat(60),
      `\nSUBJECTIVE (S):\n${soap.S}`,
      `\nOBJECTIVE (O):\n${soap.O}`,
      `\nASSESSMENT (A):\n${soap.A}`,
      `\nPLAN (P):\n${soap.P}`,
    ].join("\n");
    navigator.clipboard?.writeText(text).then(() => { setCopied("all"); setTimeout(()=>setCopied(null),2000); });
  };

  const printNote = () => {
    const d2 = new Date().toLocaleDateString("en-AU",{day:"2-digit",month:"long",year:"numeric"});
    const bodyHTML = `
      <div class="info-grid">
        <div class="info-box"><div class="info-label">Patient</div><div class="info-value">${data["dem_name"]||"—"}</div></div>
        <div class="info-box"><div class="info-label">Session</div><div class="info-value">${session}</div></div>
        <div class="info-box"><div class="info-label">Date</div><div class="info-value">${d2}</div></div>
        <div class="info-box"><div class="info-label">Clinician</div><div class="info-value">${clinician||"—"} · ${clinic||"—"}</div></div>
      </div>
      <span class="badge badge-blue">SOAP CLINICAL NOTE — Auto-Generated</span>
      <h2>S — Subjective</h2><div class="section-box" style="white-space:pre-wrap">${soap.S}</div>
      <h2>O — Objective</h2><div class="section-box" style="white-space:pre-wrap">${soap.O}</div>
      <h2>A — Assessment</h2><div class="section-box" style="white-space:pre-wrap">${soap.A}</div>
      <h2>P — Plan</h2><div class="section-box" style="white-space:pre-wrap">${soap.P}</div>
      <div class="sig-row">
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Clinician Signature</div></div>
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Date</div></div>
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Patient Signature (consent)</div></div>
      </div>`;
    if (typeof makePDFPage === "function" && typeof downloadPDFFromHTML === "function") {
      const html = makePDFPage("SOAP Clinical Note", `<div><strong>Patient:</strong> ${data["dem_name"]||"—"}</div><div><strong>Date:</strong> ${d2}</div><div><strong>Clinician:</strong> ${clinician||"—"}</div>`, bodyHTML);
      downloadPDFFromHTML(html, `SOAP_${data["dem_name"]||"Patient"}_${Date.now()}.pdf`);
    } else {
      const win = window.open("","_blank");
      if (win) { win.document.write(`<html><body style="font-family:Arial,sans-serif;padding:20px">${bodyHTML}</body></html>`); win.document.close(); setTimeout(()=>win.print(),500); }
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.76rem"};
  const ta  = {...inp,resize:"vertical",minHeight:60};
  const lbl = {fontSize:"0.6rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.8px"};

  const sectionColors = {"S":"#7c3aed","O":"#06b6d4","A":"#10b981","P":"#f59e0b"};
  const sectionLabels = {"S":"Subjective","O":"Objective","A":"Assessment","P":"Plan"};
  const sectionIcons  = {"S":"📋","O":"🔬","A":"🧠","P":"📌"};

  const tabBtn = (id, label, badge=null) => (
    <button key={id} onClick={()=>setActiveTab(id)} style={{
      padding:"8px 12px", borderRadius:9,
      background: activeTab===id ? `${PC.accent}18` : "transparent",
      border: `1px solid ${activeTab===id ? PC.accent+"50" : PC.border}`,
      color: activeTab===id ? PC.accent : PC.muted,
      fontWeight: activeTab===id ? 800 : 500, fontSize:"0.73rem",
      cursor:"pointer", fontFamily:"inherit",
      display:"flex", alignItems:"center", gap:6,
    }}>
      {label}
      {badge !== null && badge > 0 && (
        <span style={{background:PC.accent,color:"#fff",borderRadius:20,padding:"1px 6px",fontSize:"0.58rem",fontWeight:900}}>{badge}</span>
      )}
    </button>
  );

  // ── Interpretation badge confidence render ────────────────────────────────
  const confBadge = (conf) => {
    const cfg = {
      HIGH:   {bg:"rgba(16,185,129,0.12)",color:"#059669"},
      MOD:    {bg:"rgba(180,83,9,0.12)",  color:"#b45309"},
      URGENT: {bg:"rgba(220,38,38,0.15)", color:"#dc2626"},
    }[conf] || {bg:"rgba(124,58,237,0.1)",color:"#7c3aed"};
    return (
      <span style={{padding:"1px 7px",borderRadius:20,background:cfg.bg,color:cfg.color,
        fontSize:"0.58rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.6px"}}>
        {conf}
      </span>
    );
  };

  return (
    <div>

      {/* ── LIVE STATUS BAR ────────────────────────────────────────────────── */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
        background:`${PC.accent}0a`,border:`1px solid ${PC.accent}25`,
        borderRadius:12,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#10b981",
            boxShadow:"0 0 0 3px rgba(16,185,129,0.2)",flexShrink:0,
            animation:"pm-pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.68rem",fontWeight:800,color:PC.text,
            textTransform:"uppercase",letterSpacing:"0.8px"}}>SOAP Auto-Filling in Real Time</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {totalRules > 0 && (
            <div style={{padding:"3px 10px",background:`${PC.a3}15`,
              border:`1px solid ${PC.a3}35`,borderRadius:20,
              fontSize:"0.65rem",fontWeight:700,color:PC.a3}}>
              🧠 {totalRules} clinical finding{totalRules!==1?"s":""} detected
            </div>
          )}
          {urgentRules.length > 0 && (
            <div style={{padding:"3px 10px",background:"rgba(220,38,38,0.12)",
              border:"1px solid rgba(220,38,38,0.4)",borderRadius:20,
              fontSize:"0.65rem",fontWeight:800,color:"#dc2626",
              animation:"pm-pulse 1.5s ease-in-out infinite"}}>
              ⚠️ {urgentRules.length} URGENT
            </div>
          )}
        </div>
      </div>

      {/* ── URGENT FLAGS — always visible at top ───────────────────────────── */}
      {urgentRules.map((r,i) => (
        <div key={i} style={{background:"rgba(220,38,38,0.07)",
          border:"1.5px solid rgba(220,38,38,0.6)",borderRadius:12,
          padding:"12px 16px",marginBottom:10,display:"flex",gap:10}}>
          <span style={{fontSize:"1.4rem",flexShrink:0}}>🚨</span>
          <div>
            <div style={{fontWeight:800,color:"#dc2626",fontSize:"0.82rem",marginBottom:4}}>{r.tag}</div>
            <div style={{fontSize:"0.76rem",color:PC.text,lineHeight:1.65}}>{r.text}</div>
          </div>
        </div>
      ))}

      {/* ── SESSION DETAILS ─────────────────────────────────────────────────── */}
      <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"13px",marginBottom:12}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>📋 Session Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div><label style={lbl}>Clinician Name</label><input value={clinician} onChange={e=>setClinician(e.target.value)} placeholder="Your name" style={inp}/></div>
          <div><label style={lbl}>Clinic / Practice</label><input value={clinic} onChange={e=>setClinic(e.target.value)} placeholder="Clinic name" style={inp}/></div>
        </div>
        <div><label style={lbl}>Session Type</label>
          <select value={session} onChange={e=>setSession(e.target.value)} style={inp}>
            {["Initial Assessment","Follow-up Session","Discharge Assessment","Telehealth Consultation","Home Visit","Post-surgical Review","Group Session","Sports Field Assessment"].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── MAIN TAB BAR ──────────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {tabBtn("soap","📄 SOAP Note")}
        {tabBtn("interp","🧠 Suggested Interpretation", totalRules)}
        {tabBtn("both","⊞ Split View")}
        {tabBtn("extra","✏️ Add Notes")}
        {tabBtn("ai","🤖 AI Assistant")}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SOAP TAB — Real-time auto-filled note
      ══════════════════════════════════════════════════════════════ */}
      {(activeTab==="soap"||activeTab==="both") && (
        <div style={activeTab==="both"?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}:{}}>

          <div style={activeTab==="both"?{}:{marginBottom:14}}>
            {/* Copy/print toolbar */}
            <div style={{display:"flex",gap:7,marginBottom:10,flexWrap:"wrap"}}>
              <button onClick={copyFull} style={{padding:"7px 14px",background:`${PC.accent}15`,border:`1px solid ${PC.accent}40`,borderRadius:8,color:PC.accent,fontSize:"0.7rem",fontWeight:700,cursor:"pointer"}}>
                {copied==="all"?"✓ Copied!":"📋 Copy Full SOAP"}
              </button>
              <button onClick={printNote} style={{padding:"7px 14px",background:`${PC.a3}12`,border:`1px solid ${PC.a3}35`,borderRadius:8,color:PC.a3,fontSize:"0.7rem",fontWeight:700,cursor:"pointer"}}>
                🖨️ Print / PDF
              </button>
              <div style={{marginLeft:"auto",fontSize:"0.62rem",color:PC.muted,display:"flex",alignItems:"center"}}>
                Updates live as you fill assessment fields ↗
              </div>
            </div>

            {/* SOAP sections */}
            {["S","O","A","P"].map(key => (
              <div key={key} style={{marginBottom:14,background:"#ffffff",
                border:`2px solid ${sectionColors[key]}35`,
                borderRadius:16,overflow:"hidden",
                boxShadow:`0 3px 16px ${sectionColors[key]}18`}}>

                {/* ── Colourful Header ── */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"12px 16px",
                  background:`linear-gradient(120deg,${sectionColors[key]}22 0%,${sectionColors[key]}0a 100%)`,
                  borderBottom:`2px solid ${sectionColors[key]}28`}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>

                    {/* Solid colour letter badge */}
                    <div style={{width:40,height:40,borderRadius:12,
                      background:sectionColors[key],
                      boxShadow:`0 4px 14px ${sectionColors[key]}60`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:900,fontSize:"1.2rem",color:"#ffffff",flexShrink:0}}>
                      {key}
                    </div>

                    <div>
                      {/* Big bold coloured heading */}
                      <div style={{
                        fontSize:"1rem",
                        fontWeight:900,
                        color:sectionColors[key],
                        letterSpacing:"0.3px",
                        lineHeight:1.15,
                        fontFamily:"'Segoe UI','Inter','Helvetica Neue',sans-serif"}}>
                        {sectionIcons[key]}&nbsp;&nbsp;{sectionLabels[key]}
                      </div>
                      {/* Subtitle */}
                      <div style={{fontSize:"0.62rem",fontWeight:600,marginTop:3,
                        color:sectionColors[key],opacity:0.72}}>
                        {{"S":"Patient-reported history, symptoms & pain behaviour",
                          "O":"Clinical findings, measurements & objective observations",
                          "A":"Clinical reasoning, differential diagnosis & interpretation",
                          "P":"Treatment plan, rehabilitation goals & home programme"}[key]}
                      </div>
                    </div>
                  </div>

                  {/* Copy button */}
                  <button onClick={()=>copySection(key,soap[key])}
                    style={{padding:"6px 14px",
                      background:sectionColors[key],border:"none",
                      borderRadius:9,color:"#ffffff",
                      fontSize:"0.65rem",fontWeight:800,cursor:"pointer",
                      boxShadow:`0 2px 8px ${sectionColors[key]}45`,flexShrink:0}}>
                    {copied===key?"✓ Copied":"Copy"}
                  </button>
                </div>

                {/* ── Dark Black Body Text ── */}
                <div style={{padding:"14px 18px",background:"#ffffff"}}>
                  <pre style={{margin:0,
                    fontSize:"0.83rem",
                    color:"#0a0a0a",
                    fontWeight:500,
                    lineHeight:2.0,
                    whiteSpace:"pre-wrap",
                    fontFamily:"'Segoe UI','Inter','Helvetica Neue',Arial,sans-serif",
                    letterSpacing:"0.15px"}}>
                    {soap[key] || <span style={{color:"#c4b5d4",fontStyle:"italic",fontWeight:400}}>Fill assessment fields above to auto-populate...</span>}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* SPLIT VIEW — Interpretation alongside */}
          {activeTab==="both" && (
            <div>
              <div style={{marginBottom:10,padding:"9px 14px",background:`${PC.accent}08`,
                border:`1px solid ${PC.accent}28`,borderRadius:11}}>
                <div style={{fontSize:"0.65rem",fontWeight:800,color:PC.accent,
                  textTransform:"uppercase",letterSpacing:"0.8px"}}>🧠 Suggested Interpretation</div>
              </div>
              {totalRules===0?(
                <div style={{textAlign:"center",padding:"32px 20px",background:PC.surface,
                  border:`1px solid ${PC.border}`,borderRadius:13,color:PC.muted,fontSize:"0.78rem"}}>
                  Fill assessment fields to generate clinical interpretation
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[...corrRules,...highRules,...modRules].map((r,i)=>(
                    <div key={i} style={{background:PC.surface,
                      border:`1px solid ${r.module==="Correlation"?"rgba(6,182,212,0.4)":PC.border}`,
                      borderRadius:12,padding:"11px 14px",
                      borderLeft:`3px solid ${r.module==="Correlation"?"#06b6d4":r.confidence==="HIGH"?"#10b981":"#b45309"}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.75rem"}}>{
                          {Subjective:"📋",Posture:"🧍",ROM:"📐",MMT:"💪","Special Tests":"🔬",
                           Neurology:"⚡",Gait:"🚶",Functional:"🏃",Palpation:"🖐️",Correlation:"🔗"}[r.module]||"⚕️"
                        }</span>
                        <span style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,
                          textTransform:"uppercase",letterSpacing:"0.6px"}}>{r.module}</span>
                        <span style={{fontSize:"0.72rem",fontWeight:700,color:PC.text,flex:1}}>{r.tag}</span>
                        {confBadge(r.confidence)}
                      </div>
                      <p style={{margin:0,fontSize:"0.75rem",color:PC.muted,lineHeight:1.7}}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          INTERPRETATION TAB — Suggested Interpretation full panel
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="interp" && (
        <div>
          {/* Header card */}
          <div style={{padding:"14px 16px",background:`${PC.accent}08`,
            border:`1px solid ${PC.accent}28`,borderRadius:12,marginBottom:14}}>
            <div style={{fontWeight:800,color:PC.accent,fontSize:"0.85rem",marginBottom:4,
              display:"flex",alignItems:"center",gap:8}}>
              🧠 Suggested Interpretation
              {totalRules>0&&<span style={{padding:"2px 10px",borderRadius:20,
                background:PC.accent,color:"#fff",fontSize:"0.62rem",fontWeight:900}}>{totalRules}</span>}
            </div>
            <div style={{fontSize:"0.72rem",color:PC.muted,lineHeight:1.65}}>
              <strong style={{color:PC.text}}>Rule-based clinical reasoning engine</strong> — deterministic physiotherapy logic, NOT generative AI.
              Updates in real time as you fill any assessment field. Each interpretation is sourced from predefined clinical rules, correlation pathways, and special test clusters.
            </div>
          </div>

          {totalRules===0?(
            <div style={{textAlign:"center",padding:"48px 24px",background:PC.surface,
              border:`1px solid ${PC.border}`,borderRadius:14}}>
              <div style={{fontSize:"2.5rem",marginBottom:12}}>🧠</div>
              <div style={{fontWeight:700,color:PC.text,fontSize:"0.9rem",marginBottom:6}}>No findings yet</div>
              <div style={{color:PC.muted,fontSize:"0.78rem",lineHeight:1.7}}>
                Start filling assessment fields in any module<br/>
                <span style={{color:PC.accent,fontWeight:700}}>Subjective → Posture → ROM → MMT → Special Tests</span><br/>
                and interpretations will appear here automatically.
              </div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>

              {/* Section: Correlated Findings */}
              {corrRules.length>0&&(
                <>
                  <div style={{fontSize:"0.6rem",fontWeight:800,color:"#06b6d4",textTransform:"uppercase",
                    letterSpacing:"1.5px",marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{height:1,width:8,background:"#06b6d4"}}/> Cross-Module Correlations
                  </div>
                  {corrRules.map((r,i)=>(
                    <div key={i} style={{background:`rgba(6,182,212,0.05)`,
                      border:`1.5px solid rgba(6,182,212,0.45)`,borderRadius:13,
                      padding:"14px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.9rem"}}>🔗</span>
                        <span style={{fontSize:"0.73rem",fontWeight:800,color:"#06b6d4",flex:1}}>{r.tag}</span>
                        {confBadge(r.confidence)}
                      </div>
                      <p style={{margin:0,fontSize:"0.79rem",color:PC.text,lineHeight:1.75}}>{r.text}</p>
                    </div>
                  ))}
                </>
              )}

              {/* Section: High Confidence */}
              {highRules.length>0&&(
                <>
                  <div style={{fontSize:"0.6rem",fontWeight:800,color:"#059669",textTransform:"uppercase",
                    letterSpacing:"1.5px",marginTop:6,marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{height:1,width:8,background:"#059669"}}/> High Confidence Findings
                  </div>
                  {highRules.map((r,i)=>(
                    <div key={i} style={{background:PC.surface,
                      border:`1px solid ${PC.border}`,borderRadius:12,
                      padding:"13px 15px",borderLeft:"3px solid #059669"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.82rem"}}>{
                          {Subjective:"📋",Posture:"🧍",ROM:"📐",MMT:"💪","Special Tests":"🔬",
                           Neurology:"⚡",Gait:"🚶",Functional:"🏃",Palpation:"🖐️"}[r.module]||"⚕️"
                        }</span>
                        <span style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,
                          textTransform:"uppercase",letterSpacing:"0.6px"}}>{r.module}</span>
                        <span style={{fontSize:"0.73rem",fontWeight:800,color:PC.text,flex:1}}>{r.tag}</span>
                        {confBadge(r.confidence)}
                      </div>
                      <p style={{margin:0,fontSize:"0.78rem",color:PC.text,lineHeight:1.75}}>{r.text}</p>
                    </div>
                  ))}
                </>
              )}

              {/* Section: Moderate */}
              {modRules.length>0&&(
                <>
                  <div style={{fontSize:"0.6rem",fontWeight:800,color:"#b45309",textTransform:"uppercase",
                    letterSpacing:"1.5px",marginTop:6,marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{height:1,width:8,background:"#b45309"}}/> Additional Findings
                  </div>
                  {modRules.map((r,i)=>(
                    <div key={i} style={{background:PC.surface,
                      border:`1px solid ${PC.border}`,borderRadius:11,
                      padding:"11px 14px",borderLeft:"3px solid #b45309"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.82rem"}}>{
                          {Subjective:"📋",Posture:"🧍",ROM:"📐",MMT:"💪","Special Tests":"🔬",
                           Neurology:"⚡",Gait:"🚶",Functional:"🏃",Palpation:"🖐️"}[r.module]||"⚕️"
                        }</span>
                        <span style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,
                          textTransform:"uppercase",letterSpacing:"0.6px"}}>{r.module}</span>
                        <span style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,flex:1}}>{r.tag}</span>
                        {confBadge(r.confidence)}
                      </div>
                      <p style={{margin:0,fontSize:"0.76rem",color:PC.muted,lineHeight:1.7}}>{r.text}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ADD NOTES TAB — Additional clinical notes per SOAP section
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="extra" && (
        <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"14px"}}>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
            ✏️ Additional Clinical Notes (appended to auto-generated SOAP)
          </div>
          <div style={{display:"grid",gap:10}}>
            {["S","O","A","P"].map(key=>(
              <div key={key}>
                <label style={{...lbl,color:sectionColors[key]}}>
                  {sectionIcons[key]} Additional {sectionLabels[key]} Notes
                </label>
                <textarea
                  value={key==="S"?extraS:key==="O"?extraO:key==="A"?extraA:extraP}
                  onChange={e=>{
                    if(key==="S")setExtraS(e.target.value);
                    else if(key==="O")setExtraO(e.target.value);
                    else if(key==="A")setExtraA(e.target.value);
                    else setExtraP(e.target.value);
                  }}
                  placeholder={`Additional ${sectionLabels[key].toLowerCase()} notes to append...`}
                  rows={3} style={ta}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          AI ASSISTANT TAB
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="ai" && (
        <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"14px"}}>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
            🤖 AI Clinical Assistant (Groq — Llama 3.3 70B)
          </div>

          {!aiKeySet ? (
            <div>
              <div style={{fontSize:"0.73rem",color:PC.muted,marginBottom:10,lineHeight:1.65}}>
                Enter your free <strong style={{color:PC.text}}>Groq API key</strong> to enable AI clinical reasoning.<br/>
                <span style={{color:"#059669"}}>✓ 100% free · 30 req/min · Llama 3.3 70B</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <input value={aiKeyInput} onChange={e=>{setAiKeyInput(e.target.value);setAiError(null);}}
                  onKeyDown={e=>e.key==="Enter"&&saveKey()}
                  placeholder="gsk_... paste your Groq API key"
                  type="password" style={{flex:1,...inp}}/>
                <button onClick={saveKey} style={{padding:"9px 16px",background:"linear-gradient(135deg,#7f5af0,#00e5ff)",border:"none",borderRadius:8,color:"#000",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap"}}>
                  Save Key
                </button>
              </div>
              {aiError&&<div style={{marginTop:7,fontSize:"0.68rem",color:"#dc2626",padding:"6px 10px",background:"rgba(220,38,38,0.08)",borderRadius:6}}>{aiError}</div>}
            </div>
          ) : (
            <div>
              <div style={{display:"flex",gap:6,marginBottom:13}}>
                {[{id:"ask",icon:"💬",label:"Ask AI"},{id:"ddx",icon:"🔬",label:"Full DDx"},{id:"enhance",icon:"✨",label:"Enhance SOAP"}].map(({id,icon,label})=>(
                  <button key={id} onClick={()=>{setAiMode(id);setAiResponse(null);setAiError(null);}}
                    style={{flex:1,padding:"8px 4px",background:aiMode===id?"rgba(127,90,240,0.2)":"rgba(127,90,240,0.06)",border:`1px solid ${aiMode===id?"rgba(127,90,240,0.5)":"rgba(127,90,240,0.2)"}`,borderRadius:8,color:aiMode===id?"#a78bfa":"#6b8399",fontWeight:aiMode===id?800:500,fontSize:"0.66rem",cursor:"pointer",fontFamily:"inherit"}}>
                    <div style={{fontSize:"1rem",marginBottom:2}}>{icon}</div>{label}
                  </button>
                ))}
              </div>

              {aiMode==="ask"&&(
                <div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                    {["What is the most likely diagnosis?","Are there any red flags?","What treatment do you recommend?","What are the differential diagnoses?","Is this inflammatory or mechanical?"].map(q=>(
                      <button key={q} onClick={()=>setAiQuestion(q)} style={{padding:"4px 9px",background:"rgba(0,229,255,0.07)",border:"1px solid rgba(0,229,255,0.2)",borderRadius:6,color:"#00e5ff",fontSize:"0.6rem",cursor:"pointer"}}>
                        {q}
                      </button>
                    ))}
                  </div>
                  <textarea value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();runAsk();}}}
                    placeholder="Type your clinical question... (Enter to send)"
                    rows={3} style={{...ta,marginBottom:8}}/>
                  <button onClick={runAsk} disabled={aiLoading||!aiQuestion.trim()}
                    style={{width:"100%",padding:"10px",background:aiLoading||!aiQuestion.trim()?"rgba(127,90,240,0.2)":"linear-gradient(135deg,#7f5af0,#00e5ff)",border:"none",borderRadius:8,color:aiLoading?"#6b8399":"#000",fontWeight:800,fontSize:"0.76rem",cursor:aiLoading?"default":"pointer"}}>
                    {aiLoading?"🔄 Thinking...":"💬 Ask AI"}
                  </button>
                </div>
              )}
              {aiMode==="ddx"&&(
                <div>
                  <div style={{fontSize:"0.68rem",color:PC.muted,marginBottom:12,lineHeight:1.65}}>AI will analyse all assessment data and generate a full clinical differential diagnosis with confidence ratings and treatment guidance.</div>
                  <button onClick={runDdx} disabled={aiLoading} style={{width:"100%",padding:"12px",background:aiLoading?"rgba(127,90,240,0.2)":"linear-gradient(135deg,#7f5af0,#a78bfa)",border:"none",borderRadius:8,color:aiLoading?"#6b8399":"#fff",fontWeight:800,fontSize:"0.8rem",cursor:aiLoading?"default":"pointer"}}>
                    {aiLoading?"🔄 Analysing...":"🔬 Generate Full Differential Diagnosis"}
                  </button>
                </div>
              )}
              {aiMode==="enhance"&&(
                <div>
                  <div style={{fontSize:"0.68rem",color:PC.muted,marginBottom:12,lineHeight:1.65}}>AI will rewrite the auto-generated SOAP note with professional clinical language, proper terminology, and medico-legally defensible documentation.</div>
                  <button onClick={runEnhance} disabled={aiLoading} style={{width:"100%",padding:"12px",background:aiLoading?"rgba(0,201,122,0.15)":"linear-gradient(135deg,#00c97a,#00e5ff)",border:"none",borderRadius:8,color:aiLoading?"#6b8399":"#000",fontWeight:800,fontSize:"0.8rem",cursor:aiLoading?"default":"pointer"}}>
                    {aiLoading?"🔄 Enhancing SOAP note...":"✨ Enhance SOAP Note with AI"}
                  </button>
                </div>
              )}

              {aiError&&<div style={{marginTop:10,padding:"9px 12px",background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.25)",borderRadius:8,fontSize:"0.7rem",color:"#dc2626",lineHeight:1.6}}><strong>Error:</strong> {aiError}</div>}

              {aiResponse&&!aiLoading&&(
                <div style={{marginTop:12,background:PC.s2,border:"1px solid rgba(127,90,240,0.25)",borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"8px 13px",background:"rgba(127,90,240,0.1)",borderBottom:"1px solid rgba(127,90,240,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontWeight:700,fontSize:"0.72rem",color:"#a78bfa"}}>🤖 AI Clinical Response</span>
                    <button onClick={()=>navigator.clipboard?.writeText(aiResponse)} style={{padding:"2px 9px",background:"rgba(0,229,255,0.1)",border:"1px solid rgba(0,229,255,0.2)",borderRadius:5,color:"#00e5ff",fontSize:"0.6rem",cursor:"pointer"}}>Copy</button>
                  </div>
                  <div style={{padding:"13px 14px",fontSize:"0.75rem",color:PC.text,lineHeight:1.8,whiteSpace:"pre-wrap",maxHeight:480,overflowY:"auto"}}>{aiResponse}</div>
                  <div style={{padding:"7px 13px",fontSize:"0.58rem",color:PC.muted,borderTop:`1px solid ${PC.border}`}}>⚠ AI-generated — for clinical decision support only. Clinician responsible for all clinical decisions.</div>
                </div>
              )}

              <div style={{marginTop:10,textAlign:"right"}}>
                <button onClick={clearKey} style={{background:"none",border:"none",color:PC.muted,fontSize:"0.6rem",cursor:"pointer",textDecoration:"underline"}}>Change API Key</button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE PRESCRIPTION MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ============================================================
// ExercisePrescription.jsx
// Drop-in Exercise Prescription module for PhysioMind
//
// EXPORTS:
//   • EXERCISE_DB           — full exercise database (214 exercises, 18 regions)
//   • PROGRAMME_TEMPLATES   — 37 quick-load evidence-based HEP templates
//   • ALL_EXERCISES         — flat array of every exercise (for search)
//   • ExercisePrescriptionModule — React component
//
// PROPS:
//   <ExercisePrescriptionModule data={data} set={set} />
//     data  — shared patient data object (reads data.hep_programme, data.dem_name)
//     set   — function(key, value) to write back to shared state
//             e.g. set("hep_programme", [...])
//
// DEPENDENCIES:
//   React (useState, useMemo — already imported in parent)
//   Uses getC() for colour palette — ensure this is defined in your app
// ============================================================

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
const PROGRAMME_TEMPLATES = {
  // Lumbar
  acute_lbp:      { label:"Acute LBP",                  exercises:["lb_tva","lb_prone_lying","lb_press_up","lb_cat_camel","lb_glute_bridge","lb_pelvic_tilt"] },
  chronic_lbp:    { label:"Chronic LBP",                 exercises:["lb_dead_bug","lb_bird_dog","lb_plank","lb_side_plank","lb_hip_hinge","pc_pallof","lb_stir_pot"] },
  disc_ext:       { label:"Disc — Extension Bias",       exercises:["lb_prone_lying","lb_press_up","lb_standing_ext","lb_tva","lb_glute_bridge"] },
  disc_flex:      { label:"Disc — Flexion Bias",         exercises:["lb_knee_chest","lb_cat_camel","lb_rotation_stretch","lb_piriformis","lb_tva"] },
  // Hip
  hip_oa:         { label:"Hip Osteoarthritis",          exercises:["hp_clam","hp_standing_abd","hp_hip_thrust","hp_90_90","hp_adductor_stretch","hp_thomas"] },
  hip_bursitis:   { label:"Greater Trochanteric Bursitis", exercises:["hp_clam","hp_lat_walk","hp_monster_walk","hp_ober_stretch","hp_standing_abd"] },
  groin_strain:   { label:"Groin / Adductor Strain",    exercises:["lb_copenhagen","hp_adductor_stretch","hp_side_step_squat","hp_hip_flex_raise","hp_hip_thrust"] },
  // Knee
  pfps:           { label:"Patellofemoral Pain",         exercises:["kn_tqe","kn_vmo_squat","kn_step_down","hp_clam","hp_lat_walk","lb_glute_bridge"] },
  patella_tend:   { label:"Patellar Tendinopathy",       exercises:["kn_isometric_wall","kn_slow_squat","kn_decline_squat","hp_hip_thrust","kn_rdl"] },
  acl_early:      { label:"ACL Rehab — Early Phase",     exercises:["kn_quad_set","kn_straight_leg","kn_tqe","lb_glute_bridge","kn_acl_balance"] },
  acl_late:       { label:"ACL Rehab — Return to Sport", exercises:["kn_vmo_squat","kn_step_down","kn_drop_jump","sp_plyometric","sp_agility","sp_nordics"] },
  knee_oa:        { label:"Knee Osteoarthritis",         exercises:["kn_quad_set","kn_straight_leg","kn_sit_to_stand","kn_leg_press","lb_glute_bridge","ank_calf_raise"] },
  hamstring_str:  { label:"Hamstring Strain Rehab",      exercises:["kn_hamstring_str","kn_rdl","sp_hip_ext_hamstring","kn_nordic","sp_nordics","sp_sprinting"] },
  // Ankle & Foot
  ankle_sprain:   { label:"Ankle Sprain Rehab",          exercises:["ank_single_leg","ank_peroneal","ank_calf_raise","ank_tibialis_ant","ank_reach_sebt","ank_lateral_hops"] },
  achilles:       { label:"Achilles Tendinopathy",       exercises:["ank_isometric_calf","ank_ec_drop","ank_heavy_slow_calf","ank_single_leg","ank_calf_raise"] },
  plantar_fascia: { label:"Plantar Fasciitis",           exercises:["ank_pf_stretch","ank_calf_stretch","ank_short_foot","ank_marble_pickup","ank_single_leg"] },
  // Shoulder
  shoulder_imp:   { label:"Shoulder Impingement",        exercises:["sh_wall_slide","sh_prone_ytw","sh_face_pull","sh_er_band","sh_pec_stretch","sh_ir_stretch"] },
  frozen_shoulder:{ label:"Frozen Shoulder",             exercises:["sh_pendulum","sh_pully","sh_capsule_stretch","sh_ir_stretch","sh_er_band"] },
  rct_tear:       { label:"Rotator Cuff Tear Rehab",     exercises:["sh_pendulum","sh_er_band","sh_sidelying_ir","sh_prone_ytw","sh_rhythmic_stab"] },
  // Elbow
  tennis_elbow:   { label:"Tennis Elbow",                exercises:["el_isometric_ext","el_tyler_twist","el_wrist_ext_isoton","el_grip_strength"] },
  golfers_elbow:  { label:"Golfer's Elbow",              exercises:["el_wrist_flex_iso","el_wrist_flex_eccen","el_forearm_stretch","el_pron_sup"] },
  // Cervical
  cervicogenic_ha:{ label:"Cervicogenic Headache",       exercises:["cx_dnf","cx_chin_tuck","cx_scap_ret","pc_ucs_chin","cx_suboccip_release","cx_isometric"] },
  cervical_rad:   { label:"Cervical Radiculopathy",      exercises:["cx_chin_tuck","cx_neural_slider","cx_neural_ulnar","cx_neural_radial","cx_dnf","cx_isometric"] },
  // Posture
  ucs:            { label:"Upper Crossed Syndrome",      exercises:["cx_chin_tuck","pc_ucs_chin","pc_band_pullap","pc_pec_foam","sh_wall_slide","sh_prone_ytw","pc_wall_angel"] },
  lcs:            { label:"Lower Crossed Syndrome",      exercises:["pc_lcs_bridge","pc_hip_flex_str","lb_tva","lb_bird_dog","lb_hip_flexor","lb_glute_bridge","pc_pallof"] },
  // Thoracic
  thoracic_mob:   { label:"Thoracic Stiffness",          exercises:["tx_foam_ext","tx_book_open","tx_quadruped_rot","tx_thread_needle","tx_prone_cobra","tx_seated_row"] },
  // Pelvic floor
  stress_incont:  { label:"Stress Incontinence",         exercises:["pf_kegel","pf_quick_flick","pf_functional","lb_glute_bridge","hp_clam"] },
  pelvic_pain:    { label:"Pelvic Girdle Pain",          exercises:["pf_sij_bridge","pf_abductor_iso","pf_kegel","lb_bird_dog","lb_tva"] },
  // Respiratory
  copd:           { label:"COPD Breathing",              exercises:["resp_pursed_lip","resp_diaphragm","resp_lateral_costal","resp_imst","card_walk_prog"] },
  // Older adult
  falls_prev:     { label:"Falls Prevention",            exercises:["oa_otago_ankle","oa_otago_knee","oa_stepping","oa_tug","oa_otago_walk","neuro_foam_balance"] },
  frailty:        { label:"Frailty / Sarcopenia",        exercises:["oa_resistance","oa_power_training","oa_otago_ankle","kn_sit_to_stand","lb_glute_bridge"] },
  // Sports
  return_run:     { label:"Return to Running",           exercises:["sp_run_walk","sp_plyometric","sp_agility","sp_sprinting","kn_drop_jump","kn_rdl"] },
  throwing_rts:   { label:"Return to Throwing",          exercises:["sp_ir_er_ratio","sp_throw_prog","sp_decel_training","sh_prone_ytw","sh_rhythmic_stab"] },
  // Pilates / Yoga
  clinical_pilates:{ label:"Clinical Pilates Core",      exercises:["pil_imprint","pil_hundred","pil_single_leg_str","pil_swimming","lb_bird_dog","pil_roll_up"] },
  yoga_back:      { label:"Yoga for Back Pain",          exercises:["yoga_cat_cow","yoga_child_pose","yoga_bridge_yoga","yoga_downdog","lb_piriformis","lb_rotation_stretch"] },
  // Neuro
  neuro_balance:  { label:"Neurological Balance",        exercises:["neuro_tandem","neuro_romberg","neuro_foam_balance","neuro_dual_task","oa_stepping"] },
  // Cardiac
  cardiac_phase2: { label:"Cardiac Rehab Phase 2",       exercises:["card_walk_prog","card_resistance","card_stretching","resp_diaphragm"] },
  // Hydrotherapy
  aquatic_rehab:  { label:"Aquatic Rehabilitation",      exercises:["hydro_walk","hydro_squat","hydro_balance","hydro_run","hydro_kick"] },
};

const ALL_EXERCISES = Object.values(EXERCISE_DB).flatMap(region =>
  Object.values(region.categories).flatMap(cat => cat)
);


// ─── KNEE EVIDENCE-BASED PROTOCOLS ───────────────────────────────────────────
const KNEE_PROTOCOLS = [
  {
    id:"knee_oa",
    label:"Knee Osteoarthritis",
    icon:"🦴",
    color:"#ffb300",
    evidence:"NICE 2022 / OARSI Guidelines",
    phases:[
      {
        phase:"Phase 1 — Pain Control & Activation (Weeks 1–3)",
        color:"#00c97a",
        exercises:[
          { name:"Quadriceps Setting (Quad Sets)", sets:3, reps:15, hold:5, freq:"3×/day", desc:"Lie flat. Tighten quad by pushing knee into bed. Hold 5s. VMO activation without joint load. Essential first step post-flare.", cues:"Feel the quad tighten above the kneecap. No movement needed.", evidence:"Strong — initiates VMO in swollen/inhibited knee" },
          { name:"Straight Leg Raise (SLR)", sets:3, reps:15, hold:2, freq:"Daily", desc:"Lie flat. Tighten quad first, then raise leg to 45°. Hold 2s. Lower slowly. Strengthens quad without knee compression.", cues:"Lock the knee fully before lifting. Slow return.", evidence:"Strong — safe VMO loading in early OA" },
          { name:"Inner Range Quads (IRQ)", sets:3, reps:15, hold:5, freq:"Daily", desc:"Seated, place rolled towel under knee. Extend leg from 30° to full extension. Targets VMO specifically in the last 30° of extension.", cues:"Squeeze the quad hard at the top. Hold 5 seconds.", evidence:"Strong — VMO isolation in terminal extension" },
          { name:"Ankle Pumps + Calf Raises (seated)", sets:3, reps:20, hold:0, freq:"Hourly", desc:"Seated. Pump ankles × 20, then rise onto toes × 20. Circulation and calf pump for swelling management.", cues:"Keep heels down for pumps. Rise tall for calf raises.", evidence:"Strong — oedema management in acute OA flare" },
        ]
      },
      {
        phase:"Phase 2 — Strength & Load (Weeks 4–8)",
        color:"#ffb300",
        exercises:[
          { name:"Terminal Knee Extension (TKE) — Band", sets:3, reps:20, hold:2, freq:"Daily", desc:"Band behind knee, loop fixed. Stand in slight knee bend. Extend knee against band resistance. Last 30° of extension. Best VMO exercise in weight-bearing.", cues:"Push knee straight slowly. Hold 2s. Control return. Don't hyperextend.", evidence:"Strong — VMO in functional WB position" },
          { name:"Wall Slide / Mini Squat (0–45°)", sets:3, reps:15, hold:2, freq:"Daily", desc:"Back against wall. Slide down to 45° ONLY (avoid deep knee bend in OA). Weight even. Functional quad load within pain-free range.", cues:"Knees track over 2nd toe. Equal weight both feet. Stop at 45°.", evidence:"Strong — OARSI recommended OA exercise" },
          { name:"Step-Up (small step — 10cm)", sets:3, reps:12, hold:1, freq:"Daily", desc:"Step up with affected leg leading. Full knee extension at top. Eccentric control on the way down (3s lower). Functional strength and proprioception.", cues:"Push through the heel. Knee over 2nd toe. Lower slowly — this is where strength builds.", evidence:"Strong — functional quad + glute loading" },
          { name:"Seated Knee Extension (limited arc 90°–30°)", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Seated. Extend knee from 90° to 30° only (avoid 0° full extension if painful PF). Control through arc. Can add light ankle weight.", cues:"Slow control both ways. Stop before full extension if PF pain occurs.", evidence:"Moderate — targeted VMO with PF protection" },
          { name:"Hip Abduction Sidelying — Glute Med", sets:3, reps:20, hold:1, freq:"Daily", desc:"Sidelying, slight hip extension. Abduct leg 30°. Hold 1s. Glute med weakness causes knee valgus in OA — must address.", cues:"Toes pointing slightly down (hip in slight IR). Don't rotate pelvis.", evidence:"Strong — knee valgus control reduces medial OA load" },
          { name:"Static Cycling", sets:1, reps:0, hold:0, freq:"20–30 min daily", desc:"Low resistance cycling. Seat high (slight knee flexion at bottom). Best cardio for knee OA — low impact, ROM maintenance, quad strengthening.", cues:"Seat high enough that knee bends only 15–20° at bottom of stroke. No pain.", evidence:"Strong — NICE 2022 recommended aerobic exercise" },
        ]
      },
      {
        phase:"Phase 3 — Function & Long Term (Weeks 9+)",
        color:"#ff4d6d",
        exercises:[
          { name:"Single-Leg Press (45° — partial range)", sets:3, reps:12, hold:1, freq:"3×/wk", desc:"Leg press machine. Single leg. 0–60° range. Progressive load. Best gym exercise for OA — controls range, loads quad and glute.", cues:"Don't lock the knee at full extension. Push through heel.", evidence:"Strong — progressive overload for OA" },
          { name:"Lateral Step-Down (eccentric control)", sets:3, reps:10, hold:0, freq:"3×/wk", desc:"Stand on step. Lower non-affected foot slowly toward floor (3–5s). Eccentric quad + hip control. Hardest functional exercise for knee.", cues:"Knee tracks over 2nd toe. Pelvis level. Count 4 seconds down.", evidence:"Strong — functional eccentric control" },
          { name:"Walking Programme — Progressive", sets:1, reps:0, hold:0, freq:"Daily", desc:"Start: 10 min flat surface. Progress 10% per week. Target: 30 min continuous. Best long-term intervention for knee OA.", cues:"Comfortable footwear. Flat surface initially. Slight knee ache OK. Sharp pain: stop.", evidence:"Strong — NICE 2022 / OARSI top recommendation" },
          { name:"Aquatic Exercise (hydrotherapy)", sets:3, reps:15, hold:0, freq:"2×/wk", desc:"Pool exercises — walking in water, leg raises, mini squats in water. Offloads 50% body weight. Ideal for BMI>30 or severe OA.", cues:"Warm water preferred. Buoyancy reduces load. Can do deeper squats safely.", evidence:"Strong — Cochrane review: significant pain reduction" },
        ]
      },
    ],
    treatment:[
      { name:"Manual Therapy — Tibiofemoral Joint Mobilisation", desc:"Maitland Grade III–IV. Posterior glide of tibia on femur. Increases joint mobility, reduces pain neurologically. 3–5 min per session.", evidence:"Moderate — Cochrane: short-term pain relief" },
      { name:"Patellar Taping (McConnell)", desc:"Medial glide tape for lateral PF pain. Apply before exercise. Reduces pain by 50%+ acutely, allows therapeutic exercise.", evidence:"Strong — McConnell 1986, multiple RCTs confirmed" },
      { name:"TENS / Electrotherapy", desc:"TENS: 80–100 Hz for pain relief pre-exercise. IFT: 4000 Hz carrier, 80–120 Hz beat for deeper penetration. 20 min.", evidence:"Moderate — short-term pain relief to enable exercise" },
      { name:"Heat (pre-exercise)", desc:"Hot pack to knee 15–20 min before exercise. Reduces stiffness, improves ROM, increases tissue extensibility.", evidence:"Moderate — best combined with exercise" },
      { name:"Ice (post-exercise)", desc:"Ice pack 15 min post-exercise if swelling or warmth. Reduces post-exercise effusion. Essential after land-based exercise in acute OA.", evidence:"Strong — standard post-exercise OA management" },
      { name:"Knee Bracing / Offloading", desc:"Valgus unloader brace for medial compartment OA. Reduces medial load 20–25%. Use for activity, not 24/7.", evidence:"Moderate — OARSI recommended for medial OA" },
    ]
  },
  {
    id:"knee_pfps",
    label:"Patellofemoral Pain (PFPS)",
    icon:"🔵",
    color:"#7f5af0",
    evidence:"Crossley et al 2016 / BJSM Consensus",
    phases:[
      {
        phase:"Phase 1 — Load Reduction & VMO (Weeks 1–4)",
        color:"#00c97a",
        exercises:[
          { name:"VMO Isolation — Inner Range Quads", sets:3, reps:20, hold:5, freq:"Daily", desc:"Towel under knee at 30°. Contract VMO (feel above inner kneecap). Extend to full. VMO fires last 30° — most important phase for PF tracking.", cues:"Place fingers on VMO (inner quad, above knee). Feel it fire. Hold 5s.", evidence:"Strong — VMO retraining primary for PFPS" },
          { name:"Straight Leg Raise (SLR)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Quad set first, then raise to 45°. Safe loading without PF compression. Foundation exercise.", cues:"Tighten quad before lifting. No knee flexion during movement.", evidence:"Strong — PFPS phase 1 standard" },
          { name:"Clam Exercise — Glute Med", sets:3, reps:20, hold:2, freq:"Daily", desc:"Sidelying, hips slightly extended. Rotate top knee up (clamshell). Hip ext position isolates glute med, not TFL. Reduces knee valgus = reduces lateral PF tracking.", cues:"Hips slightly behind (not flexed). Open slowly. Band around knees optional.", evidence:"Strong — hip abductor weakness primary driver of PFPS" },
          { name:"Hip External Rotation — Sidelying", sets:3, reps:15, hold:2, freq:"Daily", desc:"Sidelying. ER hip while keeping pelvis stable. Activates posterior glute med + piriformis. Reduces femoral IR = reduces Q-angle = reduces lateral PF load.", cues:"Pelvis stays stacked. Only the hip moves. Small movement, big contraction.", evidence:"Strong — BJSM consensus: hip ER training for PFPS" },
        ]
      },
      {
        phase:"Phase 2 — Functional Loading (Weeks 5–10)",
        color:"#ffb300",
        exercises:[
          { name:"TKE with Band (VMO in WB)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Band behind knee. Stand. Extend knee from 30° against band. Most functional VMO exercise — weight bearing position.", cues:"Push knee back slowly. Squeeze VMO at end. Don't hyperextend.", evidence:"Strong — VMO in functional position" },
          { name:"Step-Up (low step 10cm) — Eccentric focus", sets:3, reps:15, hold:0, freq:"Daily", desc:"Step up, then lower for 4s (eccentric control is key for PFPS). Trains VMO + hip control in functional pattern.", cues:"Lower: 4 seconds, knee over 2nd toe. Don't let knee fall in.", evidence:"Strong — eccentric control reduces PF load" },
          { name:"Wall Squat with Ball (knees out)", sets:3, reps:15, hold:3, freq:"Daily", desc:"Wall slide with pilates ball between knees. Squeeze ball to activate adductors/VMO. Limits knee valgus. 0–60° only for PFPS.", cues:"Squeeze ball, press knees outward, back flat on wall. 60° max.", evidence:"Strong — VMO + medial loading for PF tracking" },
          { name:"Single-Leg Balance (eyes closed progression)", sets:3, reps:0, hold:30, freq:"Daily", desc:"Stand single leg 30s. Progression: eyes closed, unstable surface. Proprioception training essential for PFPS (retinacular mechanoreceptors).", cues:"Soft knee, not locked. Feel subtle corrections in foot. Progress to wobble board.", evidence:"Strong — proprioception training reduces PFPS recurrence" },
          { name:"Cycling (seat high)", sets:1, reps:0, hold:0, freq:"20 min daily", desc:"Stationary bike, seat high. Limits PF compression. Excellent aerobic base + quad without high PF load.", cues:"Seat height: knee slightly bent at bottom. No pain with pedalling.", evidence:"Strong — low PF load, high quad activation" },
        ]
      },
      {
        phase:"Phase 3 — Return to Sport / Running (Weeks 10+)",
        color:"#ff4d6d",
        exercises:[
          { name:"Lateral Step-Down — Eccentric", sets:3, reps:10, hold:0, freq:"3×/wk", desc:"Single leg eccentric squat to step. Most demanding PFPS exercise. Only introduce when pain <2/10 with phase 2 exercises.", cues:"4 seconds lower. Knee over 2nd toe. Pelvis level. Stop if PF pain >3/10.", evidence:"Strong — functional return to sport criterion" },
          { name:"Running Gait Retraining", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"10% cadence increase (Garmin/metronome). Reduces PF load 20–30%. Forefoot/midfoot strike if appropriate. Gradual return to run programme.", cues:"Count steps: aim 170–180 steps/min. Lighter footfall. Shorter stride.", evidence:"Strong — Bramah et al 2019: gait retraining #1 PFPS intervention" },
          { name:"Decline Squat Progression", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Squat on 25° decline board. Increases PF loading progressively. Tendon loading preparation for sport. Introduce only when pain <2/10.", cues:"Heels elevated on board. Slow control down. Pain-free only.", evidence:"Moderate — load progression for patellar tendon and PF" },
        ]
      },
    ],
    treatment:[
      { name:"Patellar Taping — McConnell (medial glide)", desc:"Tape patella medially before all exercises. Reduces lateral PF pressure immediately. Retrains VMO by reducing pain inhibition.", evidence:"Strong — McConnell 1986, multiple RCTs" },
      { name:"Patellar Mobilisation (medial glide)", desc:"Grade III medial patellar glide. 3 × 30 sec. Stretches tight lateral retinaculum. Reduces lateral PF tracking.", evidence:"Moderate — combined with exercise: strong evidence" },
      { name:"Foot Orthoses (if overpronation present)", desc:"Semi-rigid off-the-shelf orthotics if navicular drop >6mm or rearfoot valgus. Reduces tibial IR and Q-angle indirectly.", evidence:"Moderate — Collins et al 2008 RCT: orthotics + exercise > exercise alone" },
      { name:"Dry Needling — Vastus Lateralis", desc:"DN to lateral quad + TFL if overactive (NKT confirmed). Reduces lateral retinacular tension improving PF tracking.", evidence:"Moderate — VL inhibition improves medial tracking" },
      { name:"Soft Tissue — IT Band / TFL", desc:"Foam roll TFL × 90 sec. Cross-fibre massage lateral retinaculum. Reduces lateral pull on patella.", evidence:"Moderate — adjunct to exercise" },
    ]
  },
  {
    id:"knee_hamstring",
    label:"Hamstring Tendinopathy",
    icon:"🟡",
    color:"#ffb300",
    evidence:"Purdam / Rio / Goom 2016",
    phases:[
      {
        phase:"Phase 1 — Load Management (Weeks 1–3)",
        color:"#00c97a",
        exercises:[
          { name:"Isometric Hamstring Hold", sets:5, reps:1, hold:45, freq:"Daily", desc:"Prone, knee 30°. Push foot into therapist hand (or wall). Isometric hold 45s × 5 reps. Best pain relief in acute tendinopathy.", cues:"No movement. Just push and hold. Pain 0–3/10 acceptable.", evidence:"Strong — Rio et al 2015: isometrics reduce tendon pain immediately" },
          { name:"Prone Hip Extension (glute dominant)", sets:3, reps:15, hold:2, freq:"Daily", desc:"Prone. Extend hip with knee bent 90°. Activates glute max > hamstring. Offloads tendon while maintaining neural drive.", cues:"Squeeze glute. Feel the glute, not the hamstring. Knee stays at 90°.", evidence:"Strong — glute loading offloads proximal hamstring" },
        ]
      },
      {
        phase:"Phase 2 — Isotonic Loading (Weeks 4–8)",
        color:"#ffb300",
        exercises:[
          { name:"Deadlift (Romanian — hip hinge)", sets:3, reps:10, hold:0, freq:"3×/wk", desc:"Hip hinge pattern. Load through hip, not lumbar spine. Progresses from bodyweight to dumbbell. Primary hamstring tendon loading exercise.", cues:"Hinge at hip. Feel tension in hamstrings before lowering. Flat back.", evidence:"Strong — Goom et al 2016: progressive loading for proximal hamstring tendinopathy" },
          { name:"Bridge — Single Leg (slow eccentric)", sets:3, reps:12, hold:0, freq:"3×/wk", desc:"Single leg bridge with 3s eccentric lower. Hip at full extension loads hamstring-glute junction. Progress: straight leg (hamstring dominant).", cues:"Push through heel. Squeeze glute at top. Lower for 3 seconds.", evidence:"Strong — hamstring-glute loading in functional position" },
          { name:"Leg Curl — Prone (isotonic)", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Prone leg curl machine. Full range, slow eccentric (3s). Isolated hamstring load. Important for distal tendon.", cues:"Control the return — 3 seconds lower. Don't let the weight drop.", evidence:"Strong — eccentric bias for tendinopathy" },
        ]
      },
      {
        phase:"Phase 3 — Functional & Return to Sport (Weeks 8+)",
        color:"#ff4d6d",
        exercises:[
          { name:"Nordic Hamstring Curl", sets:3, reps:6, hold:0, freq:"2×/wk", desc:"Kneel, feet anchored. Lower body as slow as possible (eccentric). Most powerful hamstring strengthening exercise. Reduces hamstring injury 51%.", cues:"Go as slow as possible. Use hands to catch at bottom. Pull yourself back up.", evidence:"Strong — Petersen et al 2011: 51% injury reduction" },
          { name:"Hip Thrust with Bar (heavy)", sets:4, reps:8, hold:1, freq:"3×/wk", desc:"Barbell hip thrust. Full hip extension load. Targets glute max + hamstring junction. Progress to >80% body weight.", cues:"Full hip extension at top. Squeeze glute. Chin tucked. Drive through heels.", evidence:"Strong — high glute-ham loading for return to sprint" },
          { name:"Sprinting — Progressive", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Start 50% speed × 6 reps × 30m. Progress 10%/week. Pain <2/10. Do NOT sprint through pain.", cues:"Warm up well. First sprint always easy. Stop if any twinge at proximal hamstring.", evidence:"Strong — sport-specific loading final stage" },
        ]
      },
    ],
    treatment:[
      { name:"Load Management (CRITICAL)", desc:"Avoid sustained hip flexion (sitting >20 min, stretching hamstrings). This compresses proximal tendon at ischial tuberosity. Sit on edge of chair or use cushion.", evidence:"Strong — tendon compression is primary driver of symptoms" },
      { name:"Shockwave Therapy (ESWT)", desc:"Radial ESWT × 2000 pulses × 3 sessions, 1 week apart. Applied directly to ischial tuberosity. Best for chronic (>3 months) proximal hamstring tendinopathy.", evidence:"Strong — Furia 2009, multiple RCTs" },
      { name:"Gluteal Dry Needling", desc:"DN to glute max + piriformis if overactive NKT pattern. Reduces compression on proximal hamstring from tight external rotators.", evidence:"Moderate — adjunct for compressed tendinopathy" },
    ]
  },
  {
    id:"knee_acl",
    label:"ACL Rehab (Post-Op / Conservative)",
    icon:"🔴",
    color:"#ff4d6d",
    evidence:"MOON / KANON / Ardern et al 2014",
    phases:[
      {
        phase:"Phase 1 — Acute Control (Weeks 1–2)",
        color:"#00c97a",
        exercises:[
          { name:"Quad Sets (VMO re-activation)", sets:3, reps:20, hold:5, freq:"Hourly", desc:"Immediate post-op VMO reactivation. AMI (arthrogenic muscle inhibition) shuts down VMO after ACL injury/surgery. This is the priority.", cues:"Push knee into bed. Feel VMO fire above kneecap. Hold 5s. Relax.", evidence:"Strong — AMI reversal is Phase 1 priority" },
          { name:"Heel Slides (ROM recovery)", sets:3, reps:20, hold:1, freq:"3×/day", desc:"Supine. Slide heel toward buttock. Regain flexion ROM gently. Target 90° by week 2. Avoid forced flexion.", cues:"Slide slowly. Stop at resistance or pain >3/10. Ice after.", evidence:"Strong — ROM recovery pacing post ACL-R" },
          { name:"SLR (straight leg raise)", sets:3, reps:15, hold:2, freq:"Daily", desc:"VMO-locked SLR. Quad control without knee flexion. Safe immediately post-op. Prevents extensor lag.", cues:"Fully tighten quad before lifting. If leg bends = quad not firing enough.", evidence:"Strong — prevents extensor lag post ACL-R" },
          { name:"Ankle Pumps + Calf Raises", sets:0, reps:20, hold:0, freq:"Hourly", desc:"DVT prevention. Hourly in first 2 weeks. Foot/ankle pump circulation.", cues:"Pump ankles × 20 then point and hold. Do every hour when awake.", evidence:"Strong — DVT prophylaxis post surgery" },
        ]
      },
      {
        phase:"Phase 2 — Strength Foundation (Weeks 3–12)",
        color:"#ffb300",
        exercises:[
          { name:"Leg Press (double to single leg)", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Start double leg, progress to single. 0–70° only initially (avoid 0° full ext if graft tension issue). Progress load weekly.", cues:"Push through heel. Full control both ways. Progress range as tolerated.", evidence:"Strong — primary quad + glute loading post ACL-R" },
          { name:"TKE — Terminal Knee Extension (band)", sets:3, reps:20, hold:2, freq:"Daily", desc:"VMO in weight-bearing. Band behind knee. Extend against resistance. Most important VMO exercise in early rehab.", cues:"Slow push. Hold at extension 2s. Don't snap knee back.", evidence:"Strong — VMO in functional WB position" },
          { name:"Hip Abduction + Hip ER (sidelying)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Hip rehab must run alongside knee rehab from day 1. Glute weakness = valgus collapse = graft stress.", cues:"Controlled movement. Pelvis stable. Feel the outer glute.", evidence:"Strong — hip rehab concurrent with knee for ACL" },
          { name:"Step-Up (10cm to 20cm)", sets:3, reps:12, hold:1, freq:"Daily", desc:"Functional loading progression. Start 10cm step. Eccentric control critical. Progress height as strength improves.", cues:"4 second lower. Knee over 2nd toe. Pelvis level.", evidence:"Strong — functional quad loading ACL rehab" },
          { name:"Proprioception — Single Leg Balance", sets:3, reps:0, hold:30, freq:"Daily", desc:"Re-establish mechanoreceptor function in ACL-deficient/reconstructed knee. Progress: eyes closed, perturbation, wobble board.", cues:"Soft knee. React to perturbations. Progress difficulty weekly.", evidence:"Strong — proprioception retraining reduces re-injury risk" },
        ]
      },
      {
        phase:"Phase 3 — Return to Sport (Months 4–9)",
        color:"#ff4d6d",
        exercises:[
          { name:"Nordic Hamstring Curl", sets:3, reps:6, hold:0, freq:"2×/wk", desc:"Hamstring strength >= 80% of quad (H:Q ratio). Nordic curl builds hamstring as secondary ACL restraint. Cannot return to sport without adequate H:Q ratio.", cues:"Slow as possible. Build tolerance. Full programme takes 6 weeks.", evidence:"Strong — H:Q ratio normalisation for ACL return to sport" },
          { name:"Plyometric Progression (hop tests)", sets:3, reps:8, hold:0, freq:"3×/wk", desc:"Double leg to single leg to tuck jumps to lateral hops. LSI (limb symmetry index) must be >90% before RTS. Hop test battery: single hop, triple hop, crossover hop.", cues:"Soft landing. Knee over toe. Quiet landing = good absorption. Loud = poor control.", evidence:"Strong — Ardern et al: LSI >90% required for safe RTS" },
          { name:"Running Programme — Return to Run", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Criteria for running: full ROM, no effusion, quad strength >70% contralateral. Start: walk-jog intervals × 20 min. Progress weekly. No cutting/pivoting until month 6.", cues:"Pain <2/10. No swelling after. Increase volume before intensity.", evidence:"Strong — progressive return to run protocol" },
          { name:"Agility + Change of Direction", sets:3, reps:6, hold:0, freq:"3×/wk", desc:"T-drill, lateral shuffle, figure-8. Introduce at month 6+ only. Neuromuscular control under speed.", cues:"Start slow. Accelerate when technique is clean. Video from front for valgus check.", evidence:"Strong — sport-specific neuromuscular training pre-RTS" },
        ]
      },
    ],
    treatment:[
      { name:"Cryotherapy (Ice) — Phase 1", desc:"Ice × 15–20 min every 2 hours for first 2 weeks. Reduces post-op effusion which drives VMO inhibition (AMI).", evidence:"Strong — effusion management = VMO inhibition reversal" },
      { name:"Neuromuscular Electrical Stimulation (NMES)", desc:"NMES to VMO while doing quad sets. Enhances VMO firing in AMI. Use for first 4 weeks post-op.", evidence:"Strong — Hauger et al 2018: NMES accelerates VMO return" },
      { name:"Graft Healing Timeline (CRITICAL education)", desc:"Ligamentisation phase 3–6 months (weakest point). Patient MUST understand graft is weaker at 3 months than immediately post-op. No RTS before 9 months (re-injury risk halved vs 6 months).", evidence:"Strong — Grindem et al 2016: 9 months RTS = 51% re-injury reduction" },
      { name:"Psychological Readiness (ACL-RSI)", desc:"Use ACL-RSI questionnaire. Fear of re-injury = primary barrier to RTS. Address with graded exposure and self-efficacy building.", evidence:"Strong — Ardern et al: psychological readiness = RTS outcome predictor" },
    ]
  },
  {
    id:"knee_it_band",
    label:"IT Band Syndrome (ITBS)",
    icon:"🟠",
    color:"#ff6b35",
    evidence:"Fairclough 2006 / Weckstrom 2016",
    phases:[
      {
        phase:"Phase 1 — Load Reduction (Weeks 1–3)",
        color:"#00c97a",
        exercises:[
          { name:"Hip Abduction — Sidelying (glute med)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Primary exercise for ITBS. Glute med weakness = excessive hip adduction = increased IT band tension. Sidelying, hip slightly extended.", cues:"Toes slightly down. Lift 30°. Hold 2s. Don't flex hip.", evidence:"Strong — hip abductor weakness primary cause of ITBS" },
          { name:"Clam — with Band", sets:3, reps:25, hold:1, freq:"Daily", desc:"Clamshell with resistance band above knees. Glute med + ER activation. Hip in slight extension (crucial for glute, not TFL).", cues:"Band just above knees. Hip slightly behind trunk. Rotate slowly.", evidence:"Strong — glute med isolation for ITBS" },
          { name:"Single Leg Balance (proprioception)", sets:3, reps:0, hold:30, freq:"Daily", desc:"Running injury = proprioception failure. Single leg stance. Progress: slight knee bend (30°), eyes closed, surface perturbation.", cues:"Slight knee bend. React to balance challenge. Head up, look forward.", evidence:"Strong — proprioception retraining for runners" },
        ]
      },
      {
        phase:"Phase 2 — Strength & Running Reintroduction (Weeks 4–8)",
        color:"#ffb300",
        exercises:[
          { name:"Lateral Band Walk", sets:3, reps:20, hold:0, freq:"Daily", desc:"Band above knees. Side step in slight squat. Glute med + hip control in weight-bearing. Best pre-run activation drill.", cues:"Stay low. Steps sideways. Knees pushing against band throughout.", evidence:"Strong — functional glute med activation before running" },
          { name:"Single-Leg Squat (5cm step)", sets:3, reps:12, hold:2, freq:"Daily", desc:"Stand on 5cm step. Single leg squat to 30°. Control knee valgus. This is the key functional test AND exercise for ITBS.", cues:"Knee straight over 2nd toe. Pelvis level. Stop if valgus occurs.", evidence:"Strong — functional hip + quad loading for ITBS" },
          { name:"Running Cadence Increase (10%)", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Increase running cadence 10% using metronome (app). Reduces hip adduction and stride length — directly reduces IT band tension.", cues:"Count steps. Use metronome app. Smaller, quicker steps. Same pace.", evidence:"Strong — Noehren 2011: cadence increase reduces IT band load 19%" },
          { name:"Downhill Avoidance + Gradual Return", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"ITBS is worse downhill (IT band compresses at 30° flexion). Avoid hills for 6 weeks. Return flat first, gentle hills last.", cues:"Start flat. Treadmill incline 0%. Add hills at week 8 only.", evidence:"Strong — load management for IT band impingement" },
        ]
      },
    ],
    treatment:[
      { name:"TFL / IT Band Foam Roll", desc:"Foam roll lateral thigh 90 sec. NOT directly on IT band (too painful). Roll TFL at hip more than band itself. 2× daily.", evidence:"Moderate — reduces TFL tone, indirect IT band tension relief" },
      { name:"Hip Flexor Stretch (couch stretch)", desc:"Couch stretch × 3 × 60 sec. Tight hip flexors increase anterior pelvic tilt = increased IT band tension.", evidence:"Moderate — hip flexor length restoration" },
      { name:"Corticosteroid Injection (acute severe)", desc:"Ultrasound-guided injection into IT band bursa at lateral epicondyle. Consider if pain >6/10, unable to exercise. One injection only — does not fix cause.", evidence:"Moderate — short term pain relief only. Must combine with exercise." },
    ]
  },
  {
    id:"knee_patellar_tendon",
    label:"Patellar Tendinopathy",
    icon:"⚡",
    color:"#00c97a",
    evidence:"Purdam 2004 / Kongsgaard 2009 / Rio 2015",
    phases:[
      {
        phase:"Phase 1 — Pain Control (Weeks 1–4)",
        color:"#00c97a",
        exercises:[
          { name:"Isometric Leg Extension (70° knee bend)", sets:5, reps:1, hold:45, freq:"Daily (pre-sport)", desc:"Leg extension machine. Knee at 70°. Push maximally without moving. 45 second hold. Immediate analgesia effect (10 min). Do before training.", cues:"Maximum effort push. No movement. 45 seconds. Pain 0–4/10 acceptable.", evidence:"Strong — Rio et al 2015: isometrics = pain relief + cortical inhibition" },
          { name:"Decline Board Squat — Isometric Hold", sets:5, reps:1, hold:45, freq:"Daily", desc:"Stand on 25–35° decline board. Single leg squat hold at 60°. Isometric. More functional than leg extension for athletes.", cues:"Lean forward (decline helps). Hold the position. No bouncing. Feel the tendon load.", evidence:"Strong — most effective isometric loading for patellar tendinopathy" },
        ]
      },
      {
        phase:"Phase 2 — Isotonic Heavy Slow Resistance (Weeks 4–12)",
        color:"#ffb300",
        exercises:[
          { name:"Decline Single-Leg Squat — HSR Protocol", sets:4, reps:8, hold:0, freq:"3×/wk (NOT daily)", desc:"Heavy Slow Resistance (HSR) protocol. Decline board 25°. Single leg. 3s down, 3s up. Load with vest/barbell. Kongsgaard 2009: HSR = best long-term tendinopathy outcome.", cues:"3 seconds down, 3 seconds up. SLOW is the key. Load heavily enough to limit to 8 reps.", evidence:"Strong — Kongsgaard 2009: HSR > corticosteroid at 6 months" },
          { name:"Leg Press (single leg — slow)", sets:4, reps:8, hold:0, freq:"3×/wk", desc:"Slow leg press. 3s eccentric, 3s concentric. Heavier than traditional. Progresses to sport-specific strength.", cues:"Count 3 seconds each way. Heavy enough that last 2 reps are hard.", evidence:"Strong — HSR protocol for tendinopathy" },
          { name:"Spanish Squat (wall squat — isometric)", sets:4, reps:1, hold:45, freq:"Daily between HSR days", desc:"Band around fixed post + behind back. Squat to 60°. Push knees out against band. Long-duration isometric for pain days / maintenance.", cues:"Knees out against band. Back upright. Feel quad. Hold 45 seconds.", evidence:"Strong — adjunct to HSR on rest days" },
        ]
      },
      {
        phase:"Phase 3 — Energy Storage & Return to Sport (Weeks 12+)",
        color:"#ff4d6d",
        exercises:[
          { name:"Box Jump (double to single leg)", sets:4, reps:6, hold:0, freq:"2×/wk", desc:"Load the tendon with energy storage (plyometric). Start double leg. Progress to single leg box jump. Only introduce after HSR for 8 weeks, pain <2/10.", cues:"Land soft. Absorb. Pause. Don't rush. Pain <2/10 only.", evidence:"Strong — energy storage loading for patellar tendon RTS" },
          { name:"Depth Jump + Squat Jump", sets:3, reps:6, hold:0, freq:"2×/wk", desc:"Drop off box then immediate explosive jump. Maximum reactive strength for tendon. Sport-specific for jumpers/runners.", cues:"Ground contact <0.2 sec. Think: hot coals. Explosive. Only if pain-free.", evidence:"Strong — reactive tendon loading for return to jumping sports" },
        ]
      },
    ],
    treatment:[
      { name:"ESWT — Shockwave", desc:"Radial or focused ESWT × 2000 pulses per session × 3 sessions. Apply to patellar tendon. Pain 5–7/10 during acceptable. Best for chronic tendinopathy >3 months.", evidence:"Strong — Zwerver 2011 RCT, multiple systematic reviews" },
      { name:"Avoid Stretching in Acute Phase", desc:"Stretching compresses the tendon against patella. AVOID in phase 1. Only introduce gentle stretching in phase 3 when pain settled.", evidence:"Strong — Purdam 2004: stretching worsens reactive tendinopathy" },
      { name:"Load Monitoring (VISA-P)", desc:"Use VISA-P questionnaire weekly. Score <80 = modify training. Score >90 = safe to progress. Track load with training diary.", evidence:"Strong — VISA-P validated outcome measure for patellar tendinopathy" },
    ]
  },
];

// ─── SHOULDER EVIDENCE-BASED PROTOCOLS ───────────────────────────────────────
const SHOULDER_PROTOCOLS = [
  {
    id:"shoulder_rct", label:"Rotator Cuff Tendinopathy", icon:"💪", color:"#7f5af0",
    evidence:"Beaudreuil 2011 / Littlewood 2015 / BJSM Guidelines",
    phases:[
      { phase:"Phase 1 — Pain Control & Motor Control (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Pendulum (Codman) Exercise", sets:3, reps:20, hold:0, freq:"3×/day", desc:"Lean forward supported on a table. Let arm hang freely. Gently swing in small circles. Gravity-assisted distraction reduces subacromial compression.", cues:"Relax the shoulder completely. Let gravity do the work. No active muscle effort.", evidence:"Strong — reduces acute subacromial pain, safe in all irritability levels" },
        { name:"Scapular Retraction & Depression", sets:3, reps:15, hold:5, freq:"Daily", desc:"Squeeze shoulder blades together and DOWN. Hold 5s. Restores scapular upward rotation — essential for all RCT rehab.", cues:"Think: put your shoulder blades in your back pockets. Down AND back.", evidence:"Strong — scapular dyskinesis primary driver of subacromial impingement" },
        { name:"Isometric External Rotation (neutral)", sets:5, reps:1, hold:45, freq:"Daily", desc:"Stand side-on to wall. Elbow at 90°, pressed against side. Push hand gently outward into wall. Isometric — no movement. Immediate analgesic effect.", cues:"Maximum effort push — no movement. 45 seconds. Pain 0–4/10 acceptable.", evidence:"Strong — Rio 2015 isometric protocol adapted for shoulder RCT" },
        { name:"Isometric Shoulder Abduction", sets:5, reps:1, hold:30, freq:"Daily", desc:"Stand beside wall. Press back of hand into wall at side. Gentle isometric abduction. Loads supraspinatus without arc of pain impingement zone.", cues:"Gentle push outward. No shrug. Keep shoulder blade down.", evidence:"Strong — supraspinatus isometric loading in phase 1" },
      ]},
      { phase:"Phase 2 — Strength & Load Tolerance (Weeks 4–10)", color:"#ffb300", exercises:[
        { name:"Side-Lying External Rotation", sets:3, reps:15, hold:2, freq:"Daily", desc:"Lie on non-affected side. Elbow at 90°, forearm resting on abdomen. Rotate forearm up toward ceiling. Best isolation exercise for infraspinatus + teres minor.", cues:"Elbow stays glued to side. Rotate slowly. No shrug. 2s hold at top.", evidence:"Strong — Reinold 2004: highest infraspinatus EMG activation" },
        { name:"Prone Y — Lower Trapezius", sets:3, reps:15, hold:3, freq:"Daily", desc:"Lie face down, arm at 135° (Y position). Raise arm toward ceiling. Thumb up. Lower trapezius activation essential for scapular upward rotation.", cues:"Thumb pointing up. Squeeze scapula down before lifting. Don't shrug.", evidence:"Strong — lower trap isolation for scapular control" },
        { name:"Prone T — Middle Trapezius", sets:3, reps:15, hold:3, freq:"Daily", desc:"Lie face down, arms at 90° (T position). Raise both arms. Middle trap + rhomboid activation. Corrects scapular protraction pattern.", cues:"Arms at 90° exactly. Lift only as high as pain-free. Hold 3s.", evidence:"Strong — Ekstrom 2003: optimal mid-trap activation" },
        { name:"Band External Rotation (0° abduction)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Band anchored at elbow height. Elbow at side, 90° flexion. Rotate outward against band. Concentric + eccentric control.", cues:"Elbow stays at side. Slow return (3 seconds in). Keep shoulder blade down.", evidence:"Strong — infraspinatus + teres minor progressive loading" },
        { name:"Full Can (Scaption) — Band/Weight", sets:3, reps:15, hold:1, freq:"Daily", desc:"Arm raised in plane of scapula (30° forward of coronal plane), thumb up. Raise to shoulder height only. Supraspinatus loading in safest arc.", cues:"Thumb up. 30° forward of side. Raise to 90° only. No shrug.", evidence:"Strong — Kelly 1996: full can = optimal supraspinatus with least impingement" },
        { name:"Serratus Anterior Punch", sets:3, reps:15, hold:2, freq:"Daily", desc:"Back on floor or standing at wall. Push arm forward (punch) against resistance. Protracts scapula. Most neglected muscle in shoulder rehab.", cues:"Push forward and slightly upward. Feel the shoulder blade wrapping around ribs.", evidence:"Strong — Ludewig 2004: serratus anterior most important scapular stabiliser" },
      ]},
      { phase:"Phase 3 — Function & Return to Activity (Weeks 10+)", color:"#ff4d6d", exercises:[
        { name:"Overhead Press (cable/dumbbell — pain-free arc)", sets:3, reps:12, hold:0, freq:"3×/wk", desc:"Progressive overhead loading. Start with cable. Press to full overhead if pain-free. Key functional goal for shoulder rehab.", cues:"Retract scapula first. Press in line with ear. No shrug at top.", evidence:"Strong — progressive overload for RCT return to function" },
        { name:"Pull-Apart — Band (horizontal abduction)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Hold band at shoulder height, hands wide. Pull band apart to T position. Posterior capsule stretch + posterior RCT strengthening.", cues:"Straight elbows. Pull back to T. Squeeze scapulas. Hold 2s.", evidence:"Strong — posterior cuff + scapular retractor loading" },
        { name:"Diagonal PNF Pattern (D2 Flexion)", sets:3, reps:12, hold:0, freq:"3×/wk", desc:"With band/cable. Start: arm across body low. Move diagonally up and out to end range. Functional pattern used in throwing, reaching overhead.", cues:"Full diagonal. Thumb leads upward. Smooth arc. No pain >3/10.", evidence:"Strong — PNF D2 pattern: functional overhead rehabilitation" },
        { name:"Wall Slide with Upward Rotation", sets:3, reps:15, hold:2, freq:"Daily", desc:"Forearms on wall, elbows at 90°. Slide arms up while maintaining scapular upward rotation. Challenges serratus + lower trap at end-range overhead.", cues:"Maintain forearm contact. Feel shoulder blade rotate — not just shrug.", evidence:"Strong — overhead scapular control for return to sport/work" },
      ]},
    ],
    treatment:[
      { name:"Posterior Capsule Stretch (Sleeper Stretch)", desc:"Sidelying on affected side. Bring forearm down toward floor (internal rotation). 3 × 30 sec. Tight posterior capsule causes anterosuperior humeral head migration.", evidence:"Strong — Tyler 2010: posterior capsule tightness corrected reduces impingement" },
      { name:"ESWT — Shockwave (calcific tendinopathy)", desc:"Focused ESWT × 2000 pulses × 3 sessions for calcific deposits. Best evidence for calcific rotator cuff tendinopathy.", evidence:"Strong — Gerdesmeyer 2003: ESWT superior to placebo for calcific RCT" },
      { name:"Dry Needling / Acupuncture (trigger points)", desc:"Target infraspinatus, supraspinatus, upper trapezius trigger points. 3–5 needles × 20 min. Reduces myofascial pain and improves ER ROM before exercise.", evidence:"Moderate — trigger point needling reduces shoulder pain in RCT" },
      { name:"Joint Mobilisation — GH Posterior Glide", desc:"Maitland Grade III–IV posterior glide of humeral head. Increases internal rotation range. Indicated when posterior capsular tightness limits IR.", evidence:"Moderate — Bergman 2004: mobilisation + exercise superior to exercise alone" },
      { name:"Kinesio Taping — Scapular Facilitation", desc:"Y-strip from thoracic spine to inferior angle of scapula. Facilitates lower trapezius, corrects scapular downward rotation pattern.", evidence:"Moderate — reduces pain and improves scapular kinematics short-term" },
    ]
  },
  {
    id:"shoulder_instability", label:"Shoulder Instability (MDI/Anterior)", icon:"🔄", color:"#00c97a",
    evidence:"Jaggi & Lambert 2010 / Kuhn 2010 RCT / JOSPT Guidelines",
    phases:[
      { phase:"Phase 1 — Neuromuscular Control (Weeks 1–6)", color:"#00c97a", exercises:[
        { name:"Rhythmic Stabilisation (Proprioception)", sets:3, reps:20, hold:0, freq:"Daily", desc:"Therapist applies quick random perturbations to arm. Patient resists without allowing movement. Retrains proprioception lost after instability/dislocation.", cues:"React quickly to perturbations. Small muscles — not big prime movers.", evidence:"Strong — proprioceptive retraining primary in instability rehab" },
        { name:"Closed Chain Wall Press (Isometric ER)", sets:3, reps:15, hold:5, freq:"Daily", desc:"Elbow at 90°, forearm against wall. Press outward isometrically. Closed chain — compresses glenohumeral joint. Safe stabiliser activation.", cues:"Press into wall. Feel deep rotators working. No shrug. Hold 5s.", evidence:"Strong — closed chain exercises safer than open chain in instability phase 1" },
        { name:"Four-Point Kneeling Weight Shift", sets:3, reps:20, hold:0, freq:"Daily", desc:"On all fours. Gently shift weight onto affected arm. Small circles. Closed chain proprioception and compression. Fundamental exercise for MDI.", cues:"Elbow soft (not locked). Shift weight slowly. Shoulder blade stable — no winging.", evidence:"Strong — foundational closed chain for MDI and anterior instability" },
        { name:"Scapular Clock Exercise", sets:3, reps:12, hold:2, freq:"Daily", desc:"Move scapula to 12, 3, 6, 9 o'clock positions actively. Improves voluntary scapular control — prerequisite for all shoulder stability.", cues:"Learn to isolate scapular movement from arm movement. Slow and deliberate.", evidence:"Strong — volitional scapular control essential for instability management" },
      ]},
      { phase:"Phase 2 — Dynamic Stability & Strength (Weeks 6–14)", color:"#ffb300", exercises:[
        { name:"External Rotation Strengthening (band — progressive)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Band ER in neutral, then 45°, then 90° abduction. Infraspinatus + teres minor depresses humeral head, preventing anterior translation.", cues:"Elbow at side. Rotate outward slowly. Control return 3 seconds. No pain.", evidence:"Strong — Kuhn 2010 RCT: ER strengthening reduces instability events" },
        { name:"Push-Up Plus (Serratus Activation)", sets:3, reps:15, hold:2, freq:"Daily", desc:"Standard push-up then add extra scapular protraction at top. Maximises serratus anterior. Critical for scapular stability in instability.", cues:"At top of push-up: push further — shoulder blades apart. Hold 2s.", evidence:"Strong — highest serratus anterior EMG activation in literature" },
        { name:"Sidelying ER in 90° Abduction", sets:3, reps:15, hold:2, freq:"Daily", desc:"Sidelying, arm abducted to 90° supported. Externally rotate against gravity/weight. Loads infraspinatus in functional position.", cues:"Keep arm at 90° throughout. Rotate slowly. Feel posterior cuff contracting.", evidence:"Strong — posterior cuff functional loading for overhead instability" },
      ]},
      { phase:"Phase 3 — Sport/Function Specific (Weeks 14+)", color:"#ff4d6d", exercises:[
        { name:"Plyometric Ball Catch (wall throw)", sets:3, reps:15, hold:0, freq:"3×/wk", desc:"Throw small ball against wall and catch. Reactive shoulder muscle activation. Trains rapid co-contraction needed for sport.", cues:"Catch with elbow slightly bent. Absorb — don't let arm fly back. Fast reactive catch.", evidence:"Strong — plyometric shoulder loading for return to overhead sport" },
        { name:"90/90 ER Strengthening (throwing position)", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Arm abducted 90°, elbow at 90°. ER against band. The 90/90 position is where anterior instability is most at risk — must train here before return to throwing.", cues:"Shoulder at 90°, elbow at 90°. Rotate slowly. No pain. Build trust in position.", evidence:"Strong — position-specific strengthening for anterior instability clearance" },
      ]},
    ],
    treatment:[
      { name:"Taping — Anterior Support (McConnell)", desc:"McConnell tape from posterior deltoid to anterior, unloading anterior capsule. Apply before exercise. Reduces feeling of instability.", evidence:"Moderate — reduces apprehension and allows earlier loading" },
      { name:"Biofeedback EMG Training", desc:"Surface EMG on lower trapezius and serratus anterior. Real-time feedback during exercises. Accelerates motor learning for scapular stabilisers.", evidence:"Moderate — EMG biofeedback improves motor relearning for instability" },
      { name:"Surgical Referral Criteria", desc:"Refer if: >2 dislocation events, failed 6-month conservative management, high-demand athlete, significant labral tear on MRI.", evidence:"Strong — surgery superior to conservative for recurrent traumatic anterior instability in young athletes" },
    ]
  },
  {
    id:"shoulder_frozen", label:"Frozen Shoulder (Adhesive Capsulitis)", icon:"🧊", color:"#38bdf8",
    evidence:"Hannafin & Chiaia 2000 / Favejee 2011 RCT / Cochrane 2014",
    phases:[
      { phase:"Phase 1 — Freezing (Pain-Dominant, Weeks 1–9)", color:"#00c97a", exercises:[
        { name:"Pendulum Exercise", sets:3, reps:20, hold:0, freq:"3×/day", desc:"Lean forward, arm hanging free. Small gravity-assisted circles. Only exercise tolerated in acute freezing phase. Joint distraction reduces pain without stretching inflamed capsule.", cues:"Completely relax the arm. Gentle swing only — no forcing. Use body sway, not shoulder muscle.", evidence:"Strong — only safe active exercise in acute freezing phase" },
        { name:"Heat + Active-Assisted Flexion (supine)", sets:3, reps:10, hold:5, freq:"Daily", desc:"After heat. Lie on back. Use good arm to assist affected arm into flexion. Gravity-eliminated position reduces load.", cues:"Assisted only — good arm does the work. Stop at first resistance. Hold gently 5s.", evidence:"Moderate — maintain ROM without provoking acute capsulitis" },
      ]},
      { phase:"Phase 2 — Frozen (Stiffness-Dominant, Weeks 9–26)", color:"#ffb300", exercises:[
        { name:"Capsular Stretching — ER (hand on door frame)", sets:3, reps:1, hold:30, freq:"3×/day", desc:"Stand in doorway. Elbow at 90°, forearm on frame. Rotate body away from arm. Anterior capsule is tightest — primary stretch in phase 2.", cues:"Body turns away from arm. Feel anterior shoulder stretch. Hold 30s. Pain 4–5/10 acceptable.", evidence:"Strong — Favejee 2011: stretching = corticosteroid injection at 6 weeks" },
        { name:"Finger Walking (flexion and abduction)", sets:3, reps:10, hold:5, freq:"3×/day", desc:"Walk fingers up wall in flexion, then abduction. Mark progress. Gravity-assisted stretch at end of available range.", cues:"Walk to maximum height. Hold at top 5s. Mark your progress on wall with tape.", evidence:"Strong — standard frozen shoulder active ROM exercise" },
        { name:"Pulley-Assisted Flexion", sets:3, reps:15, hold:5, freq:"Daily", desc:"Overhead pulley. Good arm pulls affected arm into flexion. Progressive end-range loading. Maintains and slowly increases capsular length.", cues:"Pull to end range. Hold 5s. Lower slowly. No sharp pain.", evidence:"Strong — active-assisted ROM in frozen phase" },
        { name:"Towel IR Stretch", sets:3, reps:1, hold:30, freq:"Daily", desc:"Hold towel behind back. Good arm above, affected arm below. Good arm gently pulls towel upward — stretches internal rotation.", cues:"Affected arm below. Good arm pulls slowly upward. Stop at firm resistance. 30s hold.", evidence:"Moderate — IR restoration in frozen phase" },
      ]},
      { phase:"Phase 3 — Thawing (Recovery, Months 6–24)", color:"#ff4d6d", exercises:[
        { name:"Full ROM Strengthening — All planes", sets:3, reps:15, hold:0, freq:"3×/wk", desc:"As ROM returns, progressively strengthen through full available range. Include: flexion, abduction, ER/IR, scaption.", cues:"Work through as much range as available. Don't force. ROM is returning — strengthen what you have.", evidence:"Strong — progressive loading as capsule thaws naturally" },
        { name:"Overhead Press (progressive)", sets:3, reps:12, hold:0, freq:"3×/wk", desc:"Begin dumbbell press in available range. Progress toward full overhead. Final functional milestone in frozen shoulder recovery.", cues:"Start with arm below 90°. Progress overhead as range permits. No cheating with trunk lean.", evidence:"Strong — return to overhead function as primary goal in thawing phase" },
      ]},
    ],
    treatment:[
      { name:"Corticosteroid Injection (early freezing)", desc:"Intra-articular injection in freezing phase (first 3 months). Most effective early intervention. Reduces acute capsular inflammation. Max 2 injections.", evidence:"Strong — Buchbinder 2003 Cochrane: injection superior for short-term pain and ROM" },
      { name:"Hydrodilatation (distension arthrography)", desc:"Inject saline + corticosteroid + local anaesthetic into joint to distend capsule. Effective in frozen phase for rapid ROM gains.", evidence:"Strong — Quraishi 2007: hydrodilatation + physio superior to physio alone" },
      { name:"Heat (pre-exercise)", desc:"Hot pack or heat rub to shoulder 15 min before stretching exercises. Increases capsular extensibility. Always precede stretching with heat.", evidence:"Strong — tissue extensibility increased with heat before stretching" },
      { name:"MUA / Surgical Capsular Release", desc:"Manipulation under anaesthesia or arthroscopic capsular release if no improvement at 6 months.", evidence:"Moderate — indicated in refractory frozen shoulder failing 6-month conservative care" },
    ]
  },
];

// ─── ELBOW EVIDENCE-BASED PROTOCOLS ──────────────────────────────────────────
const ELBOW_PROTOCOLS = [
  {
    id:"elbow_lateral", label:"Lateral Epicondylalgia (Tennis Elbow)", icon:"🎾", color:"#ff4d6d",
    evidence:"Coombes 2015 Lancet / Vicenzino 2003 / BJSM Consensus 2019",
    phases:[
      { phase:"Phase 1 — Pain Control & Isometrics (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Wrist Extension Isometric (pain-free position)", sets:5, reps:1, hold:45, freq:"Daily", desc:"Seated, forearm supported on table, palm down. Press back of hand upward into other hand's resistance. No movement. 45s hold. Immediate pain relief.", cues:"Maximum effort push — no movement. 45 seconds. Pain 0–4/10 acceptable. Do before work tasks.", evidence:"Strong — Rio 2015 isometric protocol: immediate pain relief in tendinopathy" },
        { name:"Wrist Extensor Stretch (gentle)", sets:3, reps:1, hold:30, freq:"3×/day", desc:"Arm straight, palm down. Use other hand to bend wrist downward. Gentle sustained stretch to lateral epicondyle origin.", cues:"Straight elbow. Gentle bend. Feel pull at outer elbow. No sharp pain. 30s hold.", evidence:"Moderate — tissue extensibility maintenance in acute phase" },
        { name:"Grip Strengthening — Putty (submaximal)", sets:3, reps:15, hold:3, freq:"Daily", desc:"Squeeze therapy putty or soft ball. Submaximal 50–60% effort only in phase 1.", cues:"Squeeze gently — not maximum. Hold 3s. Pain 0–3/10 only.", evidence:"Moderate — submaximal grip loading for early lateral epicondylalgia" },
      ]},
      { phase:"Phase 2 — Heavy Slow Resistance (Weeks 4–12)", color:"#ffb300", exercises:[
        { name:"Tyler Twist — Eccentric Wrist Extension", sets:3, reps:15, hold:0, freq:"Daily", desc:"Hold FlexBar with both hands. Twist with good arm into full wrist extension. Bad arm eccentrically controls return. Best evidence exercise for tennis elbow.", cues:"Good arm twists. Bad arm controls return SLOWLY (4s). Use green FlexBar to start.", evidence:"Strong — Tyler 2010 RCT: 81% improvement vs 0% control. Gold standard exercise." },
        { name:"Wrist Extension — Dumbbell (HSR protocol)", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Forearm on table, palm down, holding dumbbell. Extend wrist upward (3s up, 3s down). Heavy slow resistance.", cues:"3 seconds up. Hold 2s at top. 3 seconds down. Heavy enough to limit to 15 reps.", evidence:"Strong — HSR superior to eccentric alone for tendinopathy at 6 months" },
        { name:"Forearm Pronation/Supination — Dumbbell", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Elbow at 90°, hold dumbbell at one end (lever). Rotate forearm palm up to palm down.", cues:"Elbow fixed at side. Rotate slowly. The longer you hold the dumbbell end, the harder it is.", evidence:"Moderate — supinator loading reduces lateral elbow load" },
        { name:"Wrist Radial Deviation — Dumbbell", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Hold dumbbell at one end vertically. Raise thumb-side upward (radial deviation). ECRL and ECRB loading.", cues:"Wrist moves only — not elbow. Slow up and slow down.", evidence:"Moderate — full wrist extensor loading for lateral epicondylalgia" },
      ]},
      { phase:"Phase 3 — Function & Return to Sport/Work (Weeks 12+)", color:"#ff4d6d", exercises:[
        { name:"Grip Strengthening — Maximum (dynamometer)", sets:3, reps:10, hold:5, freq:"3×/wk", desc:"Maximum grip strength training. Return to full grip capacity. Key for return to racquet sports, manual work.", cues:"Maximum grip. Hold 5s. Track progress with dynamometer. Goal: equal to unaffected side.", evidence:"Strong — grip strength symmetry = return to sport readiness" },
        { name:"Sport-Specific Loading (racquet/tool simulation)", sets:3, reps:20, hold:0, freq:"3×/wk", desc:"Simulate sport or work movement under load. Gradual return to aggravating activity.", cues:"Start at 50% intensity. Add 10% per week. Pain <2/10 throughout.", evidence:"Strong — sport/work-specific loading for final stage return to function" },
      ]},
    ],
    treatment:[
      { name:"Deep Friction Massage (Cyriax)", desc:"Cross-friction massage directly to ECRB origin at lateral epicondyle. 5–10 min per session 3×/wk. Firm pressure perpendicular to tendon fibres.", evidence:"Moderate — Cyriax friction massage: short-term pain relief and tissue remodelling" },
      { name:"Lateral Elbow MWM (Mulligan)", desc:"Lateral glide of elbow while patient performs pain-free gripping. Immediate pain reduction. 3 sets × 10 reps per session.", evidence:"Strong — Vicenzino 2001: MWM immediate pain-free grip improvement" },
      { name:"ESWT — Shockwave Therapy", desc:"Radial ESWT × 2000 pulses × 3 sessions. Best for chronic lateral epicondylalgia >3 months.", evidence:"Strong — Rompe 2007 RCT: ESWT superior to corticosteroid at 12 months" },
      { name:"Corticosteroid Injection (short-term only)", desc:"Short-term pain relief at 6 weeks. WARNING: superior to physio at 6 weeks but inferior at 12 months and 2 years.", evidence:"Strong — Coombes 2010 Lancet: injection worst long-term outcome. Use only for acute severe pain." },
      { name:"Counterforce Brace", desc:"Apply 2–3 finger widths below lateral epicondyle. Reduces muscle belly expansion during contraction — offloads tendon origin.", evidence:"Moderate — reduces pain during activity; does not treat underlying pathology" },
    ]
  },
  {
    id:"elbow_medial", label:"Medial Epicondylalgia (Golfer's Elbow)", icon:"⛳", color:"#00c97a",
    evidence:"Sims 2014 / Steunebrink 2010 / JOSPT Clinical Practice Guidelines",
    phases:[
      { phase:"Phase 1 — Load Reduction & Isometrics (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Wrist Flexion Isometric (neutral position)", sets:5, reps:1, hold:45, freq:"Daily", desc:"Forearm on table, palm up. Press palm upward into resisting hand. No movement. 45s isometric hold.", cues:"Maximum push — no movement. 45 seconds. Pain 0–4/10. Do before activity.", evidence:"Strong — isometric loading protocol for medial epicondyle tendon pain relief" },
        { name:"Wrist Flexor Stretch", sets:3, reps:1, hold:30, freq:"3×/day", desc:"Arm straight, palm up. Other hand bends wrist into extension. Stretch to medial epicondyle origin.", cues:"Straight elbow. Gentle bend backward. Feel inner elbow stretch. 30s. No sharp pain.", evidence:"Moderate — tissue extensibility for common flexor origin" },
        { name:"Finger Flexor Tendon Gliding", sets:3, reps:10, hold:3, freq:"3×/day", desc:"Move fingers through full tendon glide sequence. Reduces adhesions, maintains tendon mobility in flexor mechanism.", cues:"Slow and deliberate through each position. Hold each 3s. No pain.", evidence:"Moderate — tendon gliding maintains flexor mechanism mobility" },
      ]},
      { phase:"Phase 2 — Progressive Loading (Weeks 4–12)", color:"#ffb300", exercises:[
        { name:"Wrist Flexion — Dumbbell (HSR)", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Forearm on table palm up. Curl wrist upward with dumbbell. 3s up, hold 2s, 3s down. Heavy slow resistance for flexor-pronator mass.", cues:"3 seconds up. 3 seconds down. Heavy enough to limit to 15 reps. Forearm supported throughout.", evidence:"Strong — HSR protocol adapted for medial epicondyle tendinopathy" },
        { name:"Forearm Pronation — Dumbbell (lever)", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Elbow at 90°, hold dumbbell at one end. Rotate from supination to pronation. Loads pronator teres.", cues:"Elbow fixed. Rotate slowly to palm-down position. 3s each way.", evidence:"Strong — pronator teres loading essential for medial epicondylalgia" },
        { name:"Grip Strengthening — Putty (progressive)", sets:3, reps:20, hold:5, freq:"Daily", desc:"Putty or ball squeeze. Progress from soft to firm putty. Wrist flexors strongly activate with grip.", cues:"Full grip — all fingers. Hold 5s at full compression. 20 reps. Progress putty firmness.", evidence:"Moderate — grip loading as proxy for flexor-pronator mass strengthening" },
      ]},
      { phase:"Phase 3 — Return to Sport/Activity (Weeks 12+)", color:"#ff4d6d", exercises:[
        { name:"Rotational Power Training (medicine ball)", sets:3, reps:12, hold:0, freq:"3×/wk", desc:"Rotational throw against wall with medicine ball. Loads medial elbow in valgus + flexion pattern.", cues:"Start light (1kg). Rotate through core and elbow. Pain <2/10. Build speed gradually.", evidence:"Strong — sport-specific rotational loading for return to throwing/golf" },
        { name:"Wrist Flexion — Max Load", sets:4, reps:8, hold:2, freq:"3×/wk", desc:"Maximum load wrist flexion dumbbell curls. 4 × 8 for maximum strength.", cues:"3s up, 3s down. Load heavy. Track with progressive weight.", evidence:"Strong — maximum strength goal for discharge readiness" },
      ]},
    ],
    treatment:[
      { name:"Deep Friction Massage — Common Flexor Origin", desc:"Transverse friction massage to medial epicondyle origin. 5 min per session. Elbow slightly flexed during treatment.", evidence:"Moderate — tissue remodelling at common flexor tendon origin" },
      { name:"Medial Elbow MWM (Mulligan)", desc:"Lateral glide of elbow joint while patient performs grip or wrist flexion. Immediate pain-free movement restoration.", evidence:"Moderate — MWM immediate pain relief for medial epicondylalgia" },
      { name:"Ulnar Nerve Neural Mobilisation", desc:"Medial epicondylalgia often co-exists with cubital tunnel syndrome. Ulnar nerve sliders: elbow extension + wrist extension in sequence.", evidence:"Moderate — ulnar nerve involvement in up to 60% of medial epicondylalgia cases" },
    ]
  },
  {
    id:"elbow_cubital", label:"Cubital Tunnel Syndrome (Ulnar Nerve)", icon:"⚡", color:"#ffb300",
    evidence:"Caliandro 2016 Cochrane / Svernlöv 2009 RCT / AAOS Guidelines",
    phases:[
      { phase:"Phase 1 — Nerve Protection & Neural Mobility (Weeks 1–6)", color:"#00c97a", exercises:[
        { name:"Ulnar Nerve Slider (Neural Mobilisation)", sets:3, reps:10, hold:0, freq:"Daily", desc:"Sequence: elbow straight + wrist flexed → elbow bends while wrist extends. Slides ulnar nerve through cubital tunnel without tensioning.", cues:"Smooth alternating movement. No pins and needles during. Stop if symptoms worsen.", evidence:"Strong — neural sliders reduce cubital tunnel symptoms without provoking nerve" },
        { name:"Elbow Flexion Avoidance Training", sets:1, reps:0, hold:0, freq:"Ongoing", desc:"Avoid prolonged elbow flexion beyond 90°. Sleeping: pillow under arm. Phone: use speakerphone. Activity modification is primary intervention.", cues:"Avoid elbow bend beyond 90° for sustained periods. Most important intervention in mild-moderate cubital tunnel.", evidence:"Strong — Svernlöv 2009: night splinting + activity modification = 90% improvement at 6 months" },
        { name:"Grip & Pinch Strength Exercises", sets:3, reps:15, hold:3, freq:"Daily", desc:"Putty squeeze + pinch grip. Maintains intrinsic and extrinsic hand strength. Monitor for ring and little finger weakness.", cues:"Monitor for ring and little finger weakness. If grip declining — escalate to surgeon.", evidence:"Moderate — functional hand strength maintenance in cubital tunnel" },
      ]},
      { phase:"Phase 2 — Strengthening & Function (Weeks 6–12)", color:"#ffb300", exercises:[
        { name:"Ulnar Nerve Tensioner (mild — phase 2 only)", sets:3, reps:10, hold:5, freq:"3×/wk", desc:"Elbow extended, wrist extended, shoulder abducted + depressed. Slight tension on ulnar nerve. Only introduce when slider no longer provokes symptoms.", cues:"Only when sliders are completely symptom-free. Mild tension — stop at first symptom.", evidence:"Moderate — neural tensioning for nerve load tolerance in phase 2" },
        { name:"Intrinsic Hand Strengthening", sets:3, reps:15, hold:2, freq:"Daily", desc:"Finger abduction/adduction against resistance band. Interossei + hypothenar strengthening.", cues:"Spread fingers apart against band. Hold 2s. Monitor for weakness progression.", evidence:"Moderate — intrinsic strengthening for ulnar nerve motor preservation" },
      ]},
      { phase:"Phase 3 — Return to Full Function (Weeks 12+)", color:"#ff4d6d", exercises:[
        { name:"Progressive Grip Load — Dynamometer", sets:3, reps:10, hold:5, freq:"3×/wk", desc:"Measure grip strength with dynamometer. Progress to match unaffected side. Primary outcome measure.", cues:"Track progress. Goal: symmetrical grip strength. 10% per week increase maximum.", evidence:"Strong — grip strength symmetry primary outcome measure for cubital tunnel recovery" },
      ]},
    ],
    treatment:[
      { name:"Night Splint — Elbow Extension (30°)", desc:"Splint keeping elbow at 30° flexion during sleep. Most effective single intervention for mild-moderate cubital tunnel.", evidence:"Strong — Svernlöv 2009: night splinting = primary conservative treatment, 90% success mild-moderate" },
      { name:"Elbow Padding (soft pad)", desc:"Foam elbow pad over medial epicondyle during activities. Protects ulnar nerve from direct compression.", evidence:"Moderate — reduces direct pressure on cubital tunnel during daily activities" },
      { name:"Ergonomic Assessment", desc:"Assess workstation: keyboard height, armrest position, phone use. Sustained elbow flexion >90° is primary provocateur.", evidence:"Strong — ergonomic modification reduces sustained nerve compression" },
      { name:"Surgical Referral Criteria", desc:"Refer if: intrinsic muscle wasting, grip strength <60% unaffected side, failed 6-month conservative management. Anterior transposition or in-situ decompression.", evidence:"Strong — surgery for moderate-severe cubital tunnel with motor deficit" },
    ]
  },
  {
    id:"elbow_olecranon", label:"Olecranon Bursitis", icon:"🫧", color:"#38bdf8",
    evidence:"Reilly 1987 / Blackwell 2014 / BMJ Clinical Evidence Review",
    phases:[
      { phase:"Phase 1 — Swelling Control (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Elbow Protection & Padding", sets:1, reps:0, hold:0, freq:"Ongoing", desc:"Apply elbow pad over olecranon 24/7. Prevents repeated trauma to bursa. Most important intervention.", cues:"Never rest elbow directly on hard surface. Pad during sleep. Primary treatment in traumatic bursitis.", evidence:"Strong — pressure elimination is primary treatment for traumatic olecranon bursitis" },
        { name:"Ice + Compression (20 min, 3×/day)", sets:3, reps:1, hold:0, freq:"3×/day", desc:"Ice pack over elbow with compression bandage. 20 min on, 40 min off. Reduces bursal swelling and inflammation.", cues:"Never ice directly on skin. Compression bandage after icing. Elevate arm above heart.", evidence:"Strong — RICE protocol for acute bursitis swelling reduction" },
        { name:"Gentle Elbow ROM (pain-free arc only)", sets:3, reps:10, hold:0, freq:"Daily", desc:"Active elbow flexion/extension through pain-free range only. Maintains joint mobility while bursa settles.", cues:"Move only in pain-free range. Do not force. No direct pressure on back of elbow.", evidence:"Moderate — ROM maintenance during acute bursitis without aggravating bursa" },
      ]},
      { phase:"Phase 2 — Strength Recovery (Weeks 4–8)", color:"#ffb300", exercises:[
        { name:"Tricep Strengthening — Band (kickback)", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Band fixed, elbow at 90°. Extend elbow against resistance. Strengthens tricep without compressing olecranon bursa.", cues:"Elbow control — slow extension. Avoid pressure on back of elbow. Monitor for swelling increase.", evidence:"Moderate — tricep strengthening without direct bursal compression" },
        { name:"Elbow Full ROM — Active", sets:3, reps:15, hold:0, freq:"Daily", desc:"Full active elbow flexion/extension as swelling allows. Progress to full range.", cues:"Full range when comfortable. Monitor swelling after exercise.", evidence:"Moderate — full ROM restoration in resolving bursitis" },
      ]},
      { phase:"Phase 3 — Return to Activity (Weeks 8+)", color:"#ff4d6d", exercises:[
        { name:"Full Elbow Strengthening Programme", sets:3, reps:12, hold:1, freq:"3×/wk", desc:"Bicep curl, tricep extension, forearm pronation/supination with progressive dumbbell load.", cues:"Pad during sport/manual work permanently if contact risk. Track progress.", evidence:"Strong — full strength restoration before return to contact sport/manual work" },
      ]},
    ],
    treatment:[
      { name:"Aspiration (needle drainage)", desc:"Ultrasound-guided aspiration of bursal fluid if tense or very swollen. Combined with corticosteroid injection in non-septic bursitis.", evidence:"Moderate — aspiration provides rapid symptom relief; recurrence rate 30% without corticosteroid" },
      { name:"Corticosteroid Injection (non-septic only)", desc:"Inject after aspiration in confirmed non-septic bursitis. NEVER inject if septic bursitis suspected.", evidence:"Moderate — corticosteroid post-aspiration reduces recurrence in non-septic olecranon bursitis" },
      { name:"Antibiotic Treatment (septic bursitis)", desc:"If septic: flucloxacillin 500mg QDS × 2 weeks. Refer to emergency if systemically unwell.", evidence:"Strong — antibiotic treatment mandatory for septic bursitis" },
    ]
  },
];

// ─── HIP EVIDENCE-BASED PROTOCOLS ────────────────────────────────────────────
const HIP_PROTOCOLS = [
  {
    id:"hip_oa", label:"Hip Osteoarthritis", icon:"🦴", color:"#ff7043",
    evidence:"NICE 2022 / OARSI 2019 / Cochrane Hip OA Review",
    phases:[
      { phase:"Phase 1 — Pain Control & Activation (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Supine Hip Abduction (sidelying)", sets:3, reps:15, hold:2, freq:"Daily", desc:"Sidelying, raise top leg 30°. Hold 2s. Glute med activation without axial hip load. Safe in all hip OA stages.", cues:"Don't roll pelvis back. Toes slightly down. Hold at top.", evidence:"Strong — glute med activation without joint compression in hip OA" },
        { name:"Supine Hip Flexion (heel slide)", sets:3, reps:15, hold:0, freq:"Daily", desc:"Lie on back. Slide heel toward buttocks. Gravity-eliminated ROM exercise. Maintains hip flexion without axial load.", cues:"Slide heel — don't lift leg. Keep foot in contact. Go to comfortable range only.", evidence:"Strong — ROM maintenance without joint compression in acute OA" },
        { name:"Bridging — Bilateral", sets:3, reps:15, hold:5, freq:"Daily", desc:"Lie on back, knees bent, feet flat. Push through heels to lift hips. Hold 5s. Glute max activation without hip compression.", cues:"Push through heels. Squeeze glutes at top. Keep spine neutral.", evidence:"Strong — glute max + hamstring activation in non-weight-bearing position" },
        { name:"Seated Hip Flexor Stretch", sets:3, reps:1, hold:30, freq:"3×/day", desc:"Sit at edge of chair. Let one leg drop behind. Tilt pelvis posteriorly. Stretch hip flexors — tight in hip OA.", cues:"Sit tall. Tilt pelvis back. Feel stretch at front of hip. 30s. No lumbar arch.", evidence:"Strong — hip flexor length restoration reduces anterior hip impingement in OA" },
      ]},
      { phase:"Phase 2 — Strength & Load (Weeks 4–10)", color:"#ffb300", exercises:[
        { name:"Mini Squat (0–45°) — Wall Support", sets:3, reps:15, hold:2, freq:"Daily", desc:"Stand with back to wall. Squat to 45° only. Functional quad + glute loading within pain-free range.", cues:"Weight even. Knees over 2nd toe. Stop at 45°. Push through heels to return.", evidence:"Strong — OARSI recommended functional loading for hip OA" },
        { name:"Step-Up (10cm step)", sets:3, reps:12, hold:1, freq:"Daily", desc:"Step up with affected leg leading. Full hip and knee extension at top. 3s eccentric lower.", cues:"Push through heel at top. Full extension. Lower the other foot slowly — 3 seconds.", evidence:"Strong — functional glute + quad loading for hip OA" },
        { name:"Resistance Band Hip Abduction (standing)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Band above knees. Stand on one leg. Abduct other leg against band. Reduces Trendelenburg gait pattern.", cues:"Stand tall. Abduct slowly. Hold 2s. Don't lean to side. Keep pelvis level.", evidence:"Strong — glute med WB loading reduces hip OA gait deviation" },
        { name:"Static Cycling", sets:1, reps:0, hold:0, freq:"20–30 min daily", desc:"Low resistance cycling. Seat high to limit hip flexion. Best aerobic exercise for hip OA.", cues:"Seat high enough so hip flexes only 70–80° at bottom of stroke. No pain.", evidence:"Strong — NICE 2022: aerobic exercise first-line for hip OA" },
        { name:"Lateral Band Walk", sets:3, reps:20, hold:0, freq:"Daily", desc:"Band above knees. Side-step in slight squat. Glute med + TFL strengthening in weight-bearing.", cues:"Stay low. Steps sideways. Knees tracking over toes. Band stays taut throughout.", evidence:"Strong — functional glute med loading for hip OA gait retraining" },
      ]},
      { phase:"Phase 3 — Function & Long Term (Weeks 10+)", color:"#ff4d6d", exercises:[
        { name:"Single-Leg Stance (balance + strength)", sets:3, reps:1, hold:30, freq:"Daily", desc:"Stand on affected leg. Hold 30s. Progress: eyes closed, unstable surface. Reduces Trendelenburg and fall risk.", cues:"Stand tall. Slight knee bend. Pelvis level. Focus point ahead.", evidence:"Strong — proprioception training reduces hip OA disability" },
        { name:"Walking Programme — Progressive", sets:1, reps:0, hold:0, freq:"Daily", desc:"Start: 10 min flat. Progress 10% per week. Target: 30 min continuous. Best long-term intervention for hip OA.", cues:"Flat surface initially. Comfortable pace. Slight ache OK. Sharp pain: stop.", evidence:"Strong — NICE 2022 / OARSI: walking primary long-term recommendation for hip OA" },
        { name:"Leg Press — Single Leg (progressive)", sets:3, reps:12, hold:1, freq:"3×/wk", desc:"Single-leg press 0–60° range. Progressive load. Best gym exercise for hip OA.", cues:"Push through heel. Don't lock knee. Control return 3 seconds.", evidence:"Strong — progressive overload for hip OA functional recovery" },
      ]},
    ],
    treatment:[
      { name:"Manual Therapy — Hip Joint Mobilisation", desc:"Maitland Grade III–IV long-axis distraction + posterior glide. Reduces pain, improves IR and flexion ROM.", evidence:"Strong — Hoeksma 2004 RCT: manual therapy superior to exercise alone for hip OA at 5 weeks" },
      { name:"Corticosteroid Injection (intra-articular)", desc:"Ultrasound-guided IA injection. Consider if pain >7/10 preventing exercise. Short-term relief 4–8 weeks. Max 3 per year.", evidence:"Moderate — short-term pain relief allows physiotherapy; not disease-modifying" },
      { name:"Walking Aids Assessment", desc:"Assess need for walking stick (contralateral hand). Reduces hip joint load 25%. Prescribe if Trendelenburg gait.", evidence:"Strong — contralateral walking stick reduces hip joint load significantly in OA" },
      { name:"Weight Management Advice", desc:"Each 1kg weight loss reduces hip joint load by 3–4kg. Target BMI <25. Refer to dietitian if BMI >30.", evidence:"Strong — weight loss reduces hip OA symptoms and progression" },
    ]
  },
  {
    id:"hip_gtrochanteric", label:"Greater Trochanteric Pain Syndrome", icon:"📍", color:"#7f5af0",
    evidence:"Mellor 2018 JAMA / Vicenzino 2015 / LEAP Trial",
    phases:[
      { phase:"Phase 1 — Load Management & Tendon Protection (Weeks 1–6)", color:"#00c97a", exercises:[
        { name:"Hip Abductor Isometric (standing — wall)", sets:5, reps:1, hold:45, freq:"Daily", desc:"Stand side-on to wall. Press hip into wall isometrically. 45s hold. Immediate analgesic effect for gluteal tendinopathy.", cues:"Stand tall. Press hip into wall — not pelvis. 45 seconds. Pain 0–4/10 only.", evidence:"Strong — isometric loading: immediate pain relief for gluteal tendinopathy" },
        { name:"Posture Correction — Avoid Hip Adduction", sets:1, reps:0, hold:0, freq:"Ongoing", desc:"CRITICAL: Avoid hip adduction positions — crossing legs, sitting with knees together, standing with weight on one hip.", cues:"No leg crossing. No hip hike standing. Sleep with pillow between knees. Sit with knees apart.", evidence:"Strong — LEAP trial: load management superior to corticosteroid injection at 12 months" },
        { name:"Clam Exercise (glute med isolation)", sets:3, reps:20, hold:2, freq:"Daily", desc:"Sidelying, hips at 30° flexion (not more). Band above knees. Open top knee upward. Glute med isolation without compressive tendon load.", cues:"Hips at 30° only — more flexion compresses tendon. Foot stays grounded. Slow open.", evidence:"Strong — glute med activation without tendon compression in early GTPS" },
        { name:"Bridging — Bilateral (controlled)", sets:3, reps:15, hold:5, freq:"Daily", desc:"Bilateral bridge. Glute max + med activation without compressive hip adduction load.", cues:"Push through both heels. Squeeze glutes. Level pelvis. No hip drop.", evidence:"Strong — bilateral glute loading without compressive tendon forces" },
      ]},
      { phase:"Phase 2 — Progressive Tendon Loading (Weeks 6–12)", color:"#ffb300", exercises:[
        { name:"Single-Leg Bridge (eccentric control)", sets:3, reps:12, hold:2, freq:"3×/wk", desc:"Bridge up bilateral. Lower one leg. Hold single-leg bridge 2s. Progressive unilateral glute loading.", cues:"Keep pelvis level during single-leg hold. Don't let hip drop. Build to 12 reps.", evidence:"Strong — progressive unilateral glute loading for gluteal tendinopathy" },
        { name:"Side-Lying Hip Abduction — Weighted", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Sidelying, ankle weight. Abduct top leg to 30°. Hold 2s. Slow lower. Progressive glute med isotonic loading.", cues:"Toes slightly down. 30° abduction only. Hold at top. 3s lower. Don't roll pelvis.", evidence:"Strong — isotonic glute med loading for GTPS" },
        { name:"Standing Hip Abduction — Band (heavy)", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Heavy resistance band. Stand on one leg. Abduct other against band. Functional WB glute med loading.", cues:"Stand tall. Pelvis level. Abduct slowly. Hold 2s. No hip hike or lean.", evidence:"Strong — functional glute med WB loading for GTPS" },
        { name:"Wall Squat — Bilateral (0–60°)", sets:3, reps:15, hold:2, freq:"Daily", desc:"Back to wall. Squat to 60°. Bilateral — avoids hip adduction. Glute + quad functional loading.", cues:"Feet shoulder width. Knees tracking over toes. Keep weight even. No single-leg bias.", evidence:"Moderate — bilateral squat for GTPS functional strength" },
      ]},
      { phase:"Phase 3 — Energy Storage & Function (Weeks 12+)", color:"#ff4d6d", exercises:[
        { name:"Single-Leg Squat (controlled)", sets:3, reps:12, hold:2, freq:"3×/wk", desc:"Single-leg squat to 45°. Knee over 2nd toe. Pelvis level. Primary functional test AND exercise for GTPS.", cues:"Slow 3s down. Hold 2s. Push through heel up. Knee straight over 2nd toe. No valgus.", evidence:"Strong — functional single-leg loading for return to activity in GTPS" },
        { name:"Step-Down Eccentric (lateral)", sets:3, reps:10, hold:0, freq:"3×/wk", desc:"Stand on step. Lower non-affected foot slowly (4s). Eccentric glute control. Most demanding functional exercise.", cues:"Count 4 seconds down. Knee tracks over 2nd toe. Pelvis level throughout.", evidence:"Strong — eccentric glute loading for return to sport/stairs" },
        { name:"Running / Walking Programme — Graded", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Graded return to running. Start: walk-jog intervals. Progress 10% per week.", cues:"No camber running. Flat surface. Increase time before speed.", evidence:"Strong — graded running load for return to sport in GTPS" },
      ]},
    ],
    treatment:[
      { name:"Education — Tendon Load Management", desc:"Avoid: crossing legs, hip adduction stretches, IT band stretches (compresses tendon), deep hip flexion. Education alone reduces symptoms.", evidence:"Strong — LEAP 2018 JAMA: education + exercise superior to corticosteroid at 12 months" },
      { name:"ESWT — Shockwave", desc:"Radial ESWT × 2000 pulses × 3 sessions. Apply to point of maximum tenderness over greater trochanter.", evidence:"Strong — Rompe 2009: ESWT superior to home training and corticosteroid at 15 months" },
      { name:"Corticosteroid Injection (short-term only)", desc:"Superior at 8 weeks — inferior at 12 months vs exercise. Use only for severe acute pain preventing exercise.", evidence:"Strong — Mellor 2018: injection worse than exercise at 12 months. Short-term bridge only." },
      { name:"Avoid IT Band / Piriformis Stretches", desc:"Hip adduction stretches compress the gluteal tendons against the greater trochanter. STRICTLY AVOID in GTPS.", evidence:"Strong — compressive load avoidance is primary principle in GTPS management" },
    ]
  },
  {
    id:"hip_labral", label:"Hip Labral Tear (FAI / Non-Surgical)", icon:"🔵", color:"#38bdf8",
    evidence:"Casartelli 2011 / Freke 2016 / BJSM FAI Consensus 2016",
    phases:[
      { phase:"Phase 1 — Pain Control & Motor Control (Weeks 1–8)", color:"#00c97a", exercises:[
        { name:"Diaphragmatic Breathing + Core", sets:3, reps:10, hold:5, freq:"Daily", desc:"Lie on back, knees bent. Breathe into abdomen. Establishes intra-abdominal pressure and deep core activation. Foundation for hip labral stability.", cues:"Belly rises on inhale. Ribs down. Don't hold breath during exercise.", evidence:"Strong — deep core activation reduces hip joint stress in labral pathology" },
        { name:"Posterior Pelvic Tilt + TrA", sets:3, reps:15, hold:5, freq:"Daily", desc:"Supine, knees bent. Flatten lower back to floor. Hold 5s. Activates TrA and multifidus. Reduces anterior hip impingement position.", cues:"Nod pelvis backward. Feel lower back flatten. Don't hold breath.", evidence:"Strong — posterior pelvic tilt reduces anterior FAI impingement position" },
        { name:"Dead Bug (core + hip dissociation)", sets:3, reps:10, hold:5, freq:"Daily", desc:"Lie on back, arms up, hips at 90°. Lower one heel toward floor while maintaining core brace. Hip dissociation from spine — fundamental for FAI rehab.", cues:"Back stays flat throughout. Lower leg slowly. Breathe out as leg lowers. Stop if back arches.", evidence:"Strong — hip-spine dissociation training for FAI and labral stability" },
      ]},
      { phase:"Phase 2 — Strength & Neuromuscular Control (Weeks 8–16)", color:"#ffb300", exercises:[
        { name:"Glute Med Strengthening — Sidelying", sets:3, reps:20, hold:2, freq:"Daily", desc:"Sidelying hip abduction with ankle weight. Glute med weakness is primary finding in FAI and labral tears.", cues:"Toes slightly down. 30° abduction. Hold 2s. Track progress.", evidence:"Strong — glute med weakness primary modifiable factor in FAI" },
        { name:"Single-Leg Bridge — Progressive", sets:3, reps:12, hold:3, freq:"3×/wk", desc:"Bilateral → single-leg bridge → single-leg with contralateral hip extension. Progressive unilateral glute loading.", cues:"Pelvis level throughout. No hip drop. 3s hold per rep.", evidence:"Strong — unilateral glute loading for labral and FAI hip stability" },
        { name:"Hip Hinge — Deadlift Pattern (bodyweight)", sets:3, reps:15, hold:1, freq:"3×/wk", desc:"Push hips back. Maintain neutral spine. Return through glute squeeze. Fundamental movement retraining for FAI.", cues:"Push bum back to wall behind you. Spine neutral. Drive hips forward to return.", evidence:"Strong — hip hinge retraining reduces anterior hip impingement mechanics" },
        { name:"Lateral Band Walk (monster walk)", sets:3, reps:20, hold:0, freq:"Daily", desc:"Heavy band above knees. Step forward-diagonal pattern. Glute med + max co-activation in functional WB position.", cues:"Slight squat position throughout. Control every step. No knee valgus.", evidence:"Strong — functional glute co-activation for FAI hip stability" },
      ]},
      { phase:"Phase 3 — Return to Sport/Function (Weeks 16+)", color:"#ff4d6d", exercises:[
        { name:"Single-Leg Squat (full control)", sets:3, reps:12, hold:2, freq:"3×/wk", desc:"Single-leg squat to 60°. Full control of hip, knee, and pelvis. Key functional test for return to sport in FAI.", cues:"Knee tracks over 2nd toe. Pelvis level. No impingement pain at depth.", evidence:"Strong — single-leg squat as functional return to sport test for FAI" },
        { name:"Romanian Deadlift — Weighted", sets:3, reps:10, hold:1, freq:"3×/wk", desc:"Hip hinge with dumbbell/barbell. Progressive hamstring + glute max loading. Key strength exercise in FAI return to sport.", cues:"Push hips back. Spine neutral. Drive hips forward. Progressive load.", evidence:"Strong — posterior chain loading for FAI return to running/sport" },
        { name:"Running Mechanics Retraining", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Graded return with focus on hip extension at push-off, reduced anterior pelvic tilt, cadence increase.", cues:"Run tall. Drive hip back at push-off. Increase cadence 5–10%.", evidence:"Strong — running retraining reduces FAI impingement mechanics during sport" },
      ]},
    ],
    treatment:[
      { name:"Activity Modification (avoid impingement)", desc:"Avoid: deep hip flexion, hip IR in flexion, squatting below 90°, sitting low. Modify sport/work to avoid provocative range.", evidence:"Strong — activity modification reduces labral stress in conservative FAI management" },
      { name:"Intra-Articular Injection (diagnostic + therapeutic)", desc:"Ultrasound/fluoroscopy-guided IA injection. If significant pain relief = confirms intra-articular source.", evidence:"Moderate — diagnostic value + short-term pain relief for FAI/labral tears" },
      { name:"Surgical Referral Criteria", desc:"Refer if: failed 3–6 month conservative management, significant bony morphology, unable to return to sport.", evidence:"Strong — surgery for failed conservative FAI management with significant morphological impingement" },
    ]
  },
  {
    id:"hip_piriformis", label:"Piriformis Syndrome / Deep Gluteal", icon:"⚡", color:"#00c97a",
    evidence:"Boyajian-O'Neill 2008 / Hopayian 2010 / JOSPT Clinical Guidelines",
    phases:[
      { phase:"Phase 1 — Neural & Muscle Release (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Piriformis Stretch — Figure 4 (supine)", sets:3, reps:1, hold:30, freq:"3×/day", desc:"Lie on back. Cross affected ankle over opposite knee. Pull both knees toward chest. Deep buttock stretch.", cues:"Keep ankle flexed (dorsiflexed). Pull gently. Feel deep buttock stretch. 30s. No pins and needles.", evidence:"Strong — primary stretch for piriformis shortening and sciatic nerve irritation" },
        { name:"Sciatic Nerve Slider", sets:3, reps:10, hold:0, freq:"Daily", desc:"Seated. Straighten knee + dorsiflex ankle together → relax. Slides sciatic nerve through piriformis.", cues:"Slow smooth movement. No sustained stretch. Stop if pins and needles increase.", evidence:"Strong — neural mobilisation for sciatic nerve sensitisation in piriformis syndrome" },
        { name:"Foam Roll — Gluteal (piriformis region)", sets:2, reps:1, hold:60, freq:"Daily", desc:"Sit on foam roller. Cross one ankle over knee. Roll onto crossed-leg side — directly on deep glute.", cues:"Find the tender spot. Hold there 10–15s. Breathe and relax.", evidence:"Moderate — myofascial release reduces piriformis tone and sciatic irritation" },
      ]},
      { phase:"Phase 2 — Strength & Stability (Weeks 4–10)", color:"#ffb300", exercises:[
        { name:"Clam Exercise — Glute Med", sets:3, reps:20, hold:2, freq:"Daily", desc:"Sidelying, hips at 60° flexion, band above knees. Open top knee upward. Piriformis overactivates when glute med is weak.", cues:"Hips at 60°. Foot stays grounded. Open slowly. Feel outer glute, not deep.", evidence:"Strong — glute med strengthening reduces piriformis compensatory overactivation" },
        { name:"Glute Max Bridging — Unilateral", sets:3, reps:15, hold:3, freq:"Daily", desc:"Single-leg bridge. Hold 3s at top. Glute max activation reduces piriformis load.", cues:"Drive through heel. Level pelvis. Don't let hip drop. Squeeze glute at top.", evidence:"Strong — glute max reactivation reduces piriformis overuse" },
        { name:"Standing Hip Abduction — Weighted", sets:3, reps:15, hold:2, freq:"3×/wk", desc:"Hold wall for balance. Abduct leg against ankle weight. Glute med strengthening in weight-bearing.", cues:"Stand tall. Don't lean. Abduct 30°. Hold 2s. Level pelvis throughout.", evidence:"Strong — WB glute med loading for piriformis syndrome management" },
      ]},
      { phase:"Phase 3 — Function & Return to Activity (Weeks 10+)", color:"#ff4d6d", exercises:[
        { name:"Single-Leg Squat — Controlled", sets:3, reps:12, hold:2, freq:"3×/wk", desc:"Single-leg squat to 45°. Tests glute med and max function — if piriformis syndrome resolved, should be pain-free.", cues:"Control knee. Level pelvis. No deep buttock pain. Progress depth gradually.", evidence:"Strong — functional return to activity test for piriformis syndrome" },
        { name:"Running Cadence + Hip Extension Training", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Graded return to running with focus on hip extension at push-off and gluteal activation.", cues:"Run tall. Drive hip back. Slight forward lean. Monitor for deep buttock pain.", evidence:"Strong — biomechanical running correction reduces piriformis overload" },
      ]},
    ],
    treatment:[
      { name:"Dry Needling — Piriformis Trigger Points", desc:"Trigger point dry needling to piriformis muscle belly. Patient prone. 3–5 needles × 20 min.", evidence:"Strong — Fishman 2002: dry needling superior to injection and stretching alone" },
      { name:"Neural Mobilisation — Sciatic Nerve", desc:"Sciatic nerve sliders and tensioners. Reduces intraneural oedema from piriformis compression.", evidence:"Strong — neural mobilisation reduces radicular symptoms in piriformis syndrome" },
      { name:"Sitting Posture Modification", desc:"Avoid sitting on wallet/hard objects. Use coccyx cushion. Avoid cross-legged sitting.", evidence:"Strong — postural modification reduces sustained nerve compression in piriformis syndrome" },
    ]
  },
  {
    id:"hip_hamstring", label:"Proximal Hamstring Tendinopathy", icon:"💥", color:"#ff4d6d",
    evidence:"Puranen 1988 / Lempainen 2009 / Goom 2016 IJSPT",
    phases:[
      { phase:"Phase 1 — Load Protection & Isometrics (Weeks 1–6)", color:"#00c97a", exercises:[
        { name:"Isometric Hamstring Contraction (prone)", sets:5, reps:1, hold:45, freq:"Daily", desc:"Lie face down. Bend knee to 90°. Partner resists downward. Maximum isometric contraction 45s. Analgesic effect.", cues:"Maximum effort push — no movement. 45 seconds. Pain 0–4/10 acceptable.", evidence:"Strong — isometric loading for proximal hamstring tendinopathy pain relief" },
        { name:"Sitting Posture Management", sets:1, reps:0, hold:0, freq:"Ongoing", desc:"CRITICAL: Avoid prolonged sitting on hard surfaces. Use cushion. Keep hip flexion <70° when sitting.", cues:"Sit on soft surface. Lean forward slightly. No crossing legs. Stand every 30 min.", evidence:"Strong — compressive load avoidance is primary intervention in proximal hamstring tendinopathy" },
        { name:"Prone Hip Extension (glute activation)", sets:3, reps:15, hold:3, freq:"Daily", desc:"Lie face down. Lift one leg straight. Activates glute max to offload hamstring.", cues:"Squeeze glute first, then lift leg. Knee straight. Hold 3s. Feel glute working, not hamstring.", evidence:"Strong — glute max activation reduces proximal hamstring load" },
      ]},
      { phase:"Phase 2 — Heavy Slow Resistance (Weeks 6–14)", color:"#ffb300", exercises:[
        { name:"Deadlift — Hip Hinge (progressive load)", sets:3, reps:8, hold:1, freq:"3×/wk", desc:"Hip hinge deadlift. Start bodyweight, progress to barbell. 3s down, 3s up. Heavy slow resistance. Best exercise for PHT.", cues:"Push hips back. Spine neutral. Hamstring stretch at bottom. Drive hips forward. SLOW is key.", evidence:"Strong — HSR deadlift primary evidence-based exercise for proximal hamstring tendinopathy" },
        { name:"Nordic Hamstring Curl (eccentric)", sets:3, reps:6, hold:0, freq:"3×/wk", desc:"Kneel, feet fixed. Lower body forward slowly (3–5s). Eccentric hamstring loading.", cues:"Lower as slowly as possible. 5 seconds down. Catch yourself at bottom.", evidence:"Strong — Petersen 2011: Nordic curls reduce hamstring injury and strengthen proximal tendon" },
        { name:"Romanian Deadlift — Single Leg", sets:3, reps:10, hold:1, freq:"3×/wk", desc:"Single-leg RDL with dumbbell. Balance + hamstring + glute loading simultaneously.", cues:"Hip hinge on one leg. Spine neutral. Feel hamstring tension. Control balance.", evidence:"Strong — unilateral loading for PHT sport-specific strength" },
      ]},
      { phase:"Phase 3 — Energy Storage & Return to Sport (Weeks 14+)", color:"#ff4d6d", exercises:[
        { name:"Sprint Mechanics — Graded Return", sets:4, reps:6, hold:0, freq:"2×/wk", desc:"Graded sprint: jog → stride → 75% → 90% → 100%. Monitor PHT pain 24h post-session.", cues:"Build speed over 4 weeks. Track pain 24h post. No sprinting if pain >2/10 next day.", evidence:"Strong — graded sprint exposure for return to running sport with PHT" },
        { name:"Barbell Deadlift — Max Strength", sets:4, reps:5, hold:1, freq:"2×/wk", desc:"Heavy barbell deadlift. 4 × 5 for maximum posterior chain strength. Goal: 1.5× bodyweight.", cues:"Maximum load with perfect form. Track 1RM progress. Goal = 1.5× BW.", evidence:"Strong — maximum strength benchmark for PHT return to sprint sport clearance" },
      ]},
    ],
    treatment:[
      { name:"ESWT — Shockwave (ischial tuberosity)", desc:"Focused ESWT × 2000 pulses directly over ischial tuberosity. 3 sessions × weekly. Best for chronic PHT >3 months.", evidence:"Strong — Cacchio 2011 RCT: ESWT superior to exercise alone for chronic PHT" },
      { name:"Avoid Hamstring Stretching (acute phase)", desc:"Stretching compresses proximal hamstring tendon against ischial tuberosity. STRICTLY AVOID in phases 1–2.", evidence:"Strong — compressive stretching worsens reactive proximal hamstring tendinopathy" },
      { name:"VISA-H Outcome Monitoring", desc:"Use VISA-H questionnaire every 4 weeks. Score <80 = modify training load. Score >90 = cleared for full sport.", evidence:"Strong — VISA-H validated outcome measure for proximal hamstring tendinopathy" },
    ]
  },
  {
    id:"hip_iliopsoas", label:"Iliopsoas Bursitis / Snapping Hip", icon:"🔄", color:"#ffb300",
    evidence:"Mozes 1985 / Deslandes 2008 / JOSPT Hip Guidelines",
    phases:[
      { phase:"Phase 1 — Symptom Control & Flexibility (Weeks 1–4)", color:"#00c97a", exercises:[
        { name:"Iliopsoas Stretch — Kneeling Lunge", sets:3, reps:1, hold:40, freq:"3×/day", desc:"Kneel on affected knee. Step other foot forward. Push hips forward. Posterior pelvic tilt during stretch.", cues:"Tuck pelvis under (posterior tilt). Feel stretch at front of hip. Hold 40s. No arch in back.", evidence:"Strong — iliopsoas lengthening primary intervention for iliopsoas bursitis and snapping hip" },
        { name:"Abdominal Bracing + Posterior Pelvic Tilt", sets:3, reps:15, hold:10, freq:"Daily", desc:"Standing or supine. Brace abdomen. Tilt pelvis posteriorly. Reduces anterior pelvic tilt which shortens iliopsoas.", cues:"Nod pelvis back. Flatten lower back. Hold 10s. Breathe normally.", evidence:"Strong — anterior pelvic tilt correction reduces iliopsoas tension in snapping hip" },
        { name:"Hip Flexor Rolling — Quadriceps/Iliopsoas", sets:2, reps:1, hold:60, freq:"Daily", desc:"Prone on foam roller. Roll from ASIS to mid-thigh. Reduces iliopsoas myofascial tone.", cues:"Find tender area. Hold 10–15s. Breathe and relax. Do NOT roll over bone (ASIS).", evidence:"Moderate — myofascial release reduces iliopsoas tone and snapping hip frequency" },
      ]},
      { phase:"Phase 2 — Strengthening & Movement Retraining (Weeks 4–10)", color:"#ffb300", exercises:[
        { name:"Iliopsoas Eccentric Loading — Step-Up", sets:3, reps:12, hold:1, freq:"3×/wk", desc:"Step-up focusing on controlled hip flexion lowering phase. Loads iliopsoas eccentrically.", cues:"Slow lower of trailing leg. 3s. Control the snap position. Stop if snapping worsens.", evidence:"Moderate — eccentric iliopsoas loading for snapping hip retraining" },
        { name:"Core Strengthening — Plank Series", sets:3, reps:1, hold:30, freq:"Daily", desc:"Forearm plank → side plank → plank with hip extension. Reduces anterior pelvic tilt driving iliopsoas tightness.", cues:"Spine neutral. Don't sag hips. Breathe normally. Build from 20s to 60s.", evidence:"Strong — core strength reduces anterior pelvic tilt and iliopsoas load" },
        { name:"Glute Med Strengthening — Clam + Band Walk", sets:3, reps:20, hold:2, freq:"Daily", desc:"Glute med weakness drives anterior pelvic tilt and iliopsoas overload.", cues:"Clam: hips 60°. Band walk: stay low. Pelvis level. Don't lean.", evidence:"Strong — glute med strengthening reduces anterior pelvic tilt driving snapping hip" },
      ]},
      { phase:"Phase 3 — Return to Full Activity (Weeks 10+)", color:"#ff4d6d", exercises:[
        { name:"Full Hip Flexion Strengthening — Resistance", sets:3, reps:12, hold:1, freq:"3×/wk", desc:"Cable or band hip flexion against resistance. Full controlled arc. Tests iliopsoas under load without snapping.", cues:"Controlled lift to 90°. Slow return. No snapping. Progress resistance gradually.", evidence:"Strong — full-range loaded hip flexion for iliopsoas return to function" },
        { name:"Running — Graded Return", sets:1, reps:0, hold:0, freq:"3×/wk", desc:"Graded return to running. Monitor for snapping during running gait.", cues:"No snapping during jog = safe to progress. Pain or snap: reduce pace and distance.", evidence:"Strong — graded running return for iliopsoas bursitis / snapping hip" },
      ]},
    ],
    treatment:[
      { name:"Ultrasound-Guided Bursal Injection", desc:"Corticosteroid into iliopsoas bursa under ultrasound guidance. Rapid pain relief — allows physiotherapy window.", evidence:"Moderate — short-term pain relief for acute iliopsoas bursitis" },
      { name:"Iliopsoas Tendon Injection (snapping)", desc:"Ultrasound-guided injection of local anaesthetic + corticosteroid into iliopsoas tendon sheath.", evidence:"Moderate — injection reduces snapping frequency in refractory iliopsoas tendon syndrome" },
      { name:"Surgical Release (refractory)", desc:"Arthroscopic or open lengthening of iliopsoas tendon at lesser trochanter if failed 6-month conservative management.", evidence:"Moderate — surgical lengthening for refractory internal snapping hip" },
    ]
  },
];

// ─── SHARED PROTOCOL PANEL RENDERER ──────────────────────────────────────────
function ProtocolPanel({ protocols, openId, setOpenId, openTx, setOpenTx, openPhase, togglePhase }) {
  return (
    <div style={{ borderTop:"1px solid rgba(0,0,0,0.08)", padding:"10px 14px 14px" }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
        {protocols.map(p => (
          <button key={p.id} onClick={() => { setOpenId(openId === p.id ? null : p.id); setOpenTx(null); }}
            style={{ padding:"6px 13px", borderRadius:20, fontSize:"0.65rem", fontWeight:700,
              background: openId === p.id ? `${p.color}18` : "transparent",
              border: `1px solid ${openId === p.id ? p.color : "#d8cce8"}`,
              color: openId === p.id ? p.color : "#7e6a9a", cursor:"pointer" }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>
      {openId && (() => {
        const p = protocols.find(x => x.id === openId);
        if (!p) return null;
        return (
          <div style={{ background:`${p.color}06`, border:`1px solid ${p.color}30`, borderRadius:10, padding:"12px" }}>
            <div style={{ fontSize:"0.6rem", color:p.color, fontWeight:700, marginBottom:12,
              background:`${p.color}12`, display:"inline-block", padding:"3px 10px",
              borderRadius:6, border:`1px solid ${p.color}30` }}>📚 {p.evidence}</div>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              <button onClick={() => setOpenTx(null)} style={{ flex:1, padding:"8px", borderRadius:8,
                border:`1px solid ${openTx !== "tx" ? p.color : "#d8cce8"}`,
                background: openTx !== "tx" ? `${p.color}15` : "transparent",
                color: openTx !== "tx" ? p.color : "#7e6a9a", fontSize:"0.65rem", fontWeight:800, cursor:"pointer" }}>
                💪 Exercise Protocol
              </button>
              <button onClick={() => setOpenTx("tx")} style={{ flex:1, padding:"8px", borderRadius:8,
                border:`1px solid ${openTx === "tx" ? p.color : "#d8cce8"}`,
                background: openTx === "tx" ? `${p.color}15` : "transparent",
                color: openTx === "tx" ? p.color : "#7e6a9a", fontSize:"0.65rem", fontWeight:800, cursor:"pointer" }}>
                🏥 Treatment Techniques
              </button>
            </div>
            {openTx !== "tx" && p.phases.map((ph, pi) => (
              <div key={pi} style={{ marginBottom:8, border:`1px solid ${ph.color}30`, borderRadius:8, overflow:"hidden" }}>
                <div onClick={() => togglePhase(`${p.id}_${pi}`)}
                  style={{ padding:"10px 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", background:`${ph.color}10` }}>
                  <div style={{ fontWeight:800, fontSize:"0.72rem", color:ph.color }}>{ph.phase}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:"0.6rem", color:"#7e6a9a" }}>{ph.exercises.length} exercises</span>
                    <span style={{ color:ph.color, fontSize:"0.7rem" }}>{openPhase[`${p.id}_${pi}`] ? "▲" : "▼"}</span>
                  </div>
                </div>
                {openPhase[`${p.id}_${pi}`] && (
                  <div style={{ padding:"10px 12px" }}>
                    {ph.exercises.map((ex, ei) => (
                      <div key={ei} style={{ background:"#f9f7ff", border:"1px solid #d8cce8", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                        <div style={{ fontWeight:800, fontSize:"0.78rem", color:"#1a1025", marginBottom:4 }}>{ex.name}</div>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:7 }}>
                          {[["Sets",ex.sets],["Reps",ex.reps],["Hold",ex.hold+"s"],["Freq",ex.freq]].map(([l,v]) => (
                            <div key={l} style={{ background:`${ph.color}12`, border:`1px solid ${ph.color}30`, borderRadius:6, padding:"3px 8px", textAlign:"center" }}>
                              <div style={{ fontSize:"0.72rem", fontWeight:900, color:ph.color }}>{v}</div>
                              <div style={{ fontSize:"0.52rem", color:"#7e6a9a", textTransform:"uppercase" }}>{l}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize:"0.73rem", color:"#334155", lineHeight:1.6, marginBottom:6 }}>{ex.desc}</div>
                        <div style={{ background:"rgba(255,179,0,0.07)", border:"1px solid rgba(255,179,0,0.2)", borderRadius:6, padding:"5px 8px", fontSize:"0.68rem", color:"#b45309", marginBottom:5 }}>💡 {ex.cues}</div>
                        <div style={{ fontSize:"0.62rem", color:"#7f5af0" }}>📚 {ex.evidence}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {openTx === "tx" && (
              <div>
                {p.treatment.map((tx, ti) => (
                  <div key={ti} style={{ background:"#f9f7ff", border:`1px solid ${p.color}25`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ fontWeight:800, fontSize:"0.76rem", color:p.color, marginBottom:5 }}>🏥 {tx.name}</div>
                    <div style={{ fontSize:"0.73rem", color:"#334155", lineHeight:1.6, marginBottom:6 }}>{tx.desc}</div>
                    <div style={{ fontSize:"0.62rem", color:"#7f5af0" }}>📚 {tx.evidence}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── REGION TEMPLATE MAP ──────────────────────────────────────────────────────
const REGION_TEMPLATE_MAP = {
  "Lumbar":       ["lbp_acute","lbp_core","lbp_radicular"],
  "Cervical":     ["neck_acute","posture_correction"],
  "Shoulder":     ["shoulder_rotator","shoulder_instability"],
  "Hip":          ["hip_oa","hip_glute"],
  "Knee":         ["knee_oa_template","knee_pfps_template","knee_acl_template"],
  "Ankle":        ["ankle_sprain","achilles"],
  "Posture":      ["posture_correction","upper_cross"],
  "Pelvic Floor": ["pf_incontinence","pf_prolapse"],
};

// ─── QUICK TEMPLATES PANEL ────────────────────────────────────────────────────
function QuickTemplatesPanel({ applyTemplate }) {
  const [openRegion,     setOpenRegion]     = useState(null);
  const [openKnee,       setOpenKnee]       = useState(null);
  const [openKneeTx,     setOpenKneeTx]     = useState(null);
  const [openShoulder,   setOpenShoulder]   = useState(null);
  const [openShoulderTx, setOpenShoulderTx] = useState(null);
  const [openElbow,      setOpenElbow]      = useState(null);
  const [openElbowTx,    setOpenElbowTx]    = useState(null);
  const [openHip,        setOpenHip]        = useState(null);
  const [openHipTx,      setOpenHipTx]      = useState(null);
  const [openPhase,      setOpenPhase]      = useState({});
  const [templatesOpen,  setTemplatesOpen]  = useState(false);
  const [kneeOpen,       setKneeOpen]       = useState(false);
  const [shoulderOpen,   setShoulderOpen]   = useState(false);
  const [elbowOpen,      setElbowOpen]      = useState(false);
  const [hipOpen,        setHipOpen]        = useState(false);

  const togglePhase = (key) => setOpenPhase(p => ({ ...p, [key]: !p[key] }));

  return (
    <div style={{ marginBottom:12 }}>

      {/* ── QUICK PROGRAMME TEMPLATES ── */}
      <div style={{ background:"#ffffff", border:"1px solid #d8cce8", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
        <div onClick={() => setTemplatesOpen(o => !o)}
          style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#7e6a9a" }}>⚡ Quick Programme Templates</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"0.6rem", color:"#7e6a9a" }}>Select by region</span>
            <span style={{ color:"#7e6a9a", fontSize:"0.75rem" }}>{templatesOpen ? "▲" : "▼"}</span>
          </div>
        </div>
        {templatesOpen && (
          <div style={{ borderTop:"1px solid #d8cce8", padding:"10px 14px 14px" }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              {Object.keys(REGION_TEMPLATE_MAP).map(region => (
                <button key={region} onClick={() => setOpenRegion(openRegion === region ? null : region)}
                  style={{ padding:"5px 12px", borderRadius:20, fontSize:"0.65rem", fontWeight:700,
                    background: openRegion === region ? "rgba(127,90,240,0.15)" : "rgba(0,229,255,0.06)",
                    border: `1px solid ${openRegion === region ? "rgba(127,90,240,0.5)" : "rgba(0,229,255,0.2)"}`,
                    color: openRegion === region ? "#7f5af0" : "#00e5ff", cursor:"pointer" }}>
                  {region}
                </button>
              ))}
            </div>
            {openRegion && (
              <div style={{ background:"rgba(127,90,240,0.05)", border:"1px solid rgba(127,90,240,0.15)", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#7e6a9a", marginBottom:8, textTransform:"uppercase", letterSpacing:"1px" }}>
                  {openRegion} Templates
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {(REGION_TEMPLATE_MAP[openRegion] || []).map(key => (
                    <button key={key} onClick={() => applyTemplate(key)}
                      style={{ padding:"6px 14px", borderRadius:8, fontSize:"0.65rem", fontWeight:700,
                        background:"rgba(0,229,255,0.08)", border:"1px solid rgba(0,229,255,0.25)",
                        color:"#00e5ff", cursor:"pointer" }}>
                      {key.replace(/_/g," ").replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── KNEE EVIDENCE-BASED PROTOCOLS ── */}
      <div style={{ background:"#ffffff", border:"1px solid rgba(255,77,109,0.25)", borderRadius:12, overflow:"hidden" }}>
        <div onClick={() => setKneeOpen(o => !o)}
          style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"1rem" }}>🦵</span>
            <div>
              <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#ff4d6d" }}>Knee Evidence-Based Protocols</div>
              <div style={{ fontSize:"0.6rem", color:"#7e6a9a", marginTop:1 }}>Exercise + Treatment · {KNEE_PROTOCOLS.length} conditions covered</div>
            </div>
          </div>
          <span style={{ color:"#ff4d6d", fontSize:"0.75rem" }}>{kneeOpen ? "▲" : "▼"}</span>
        </div>
        {kneeOpen && (
          <div style={{ borderTop:"1px solid rgba(255,77,109,0.15)", padding:"10px 14px 14px" }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
              {KNEE_PROTOCOLS.map(kp => (
                <button key={kp.id}
                  onClick={() => { setOpenKnee(openKnee === kp.id ? null : kp.id); setOpenKneeTx(null); }}
                  style={{ padding:"6px 13px", borderRadius:20, fontSize:"0.65rem", fontWeight:700,
                    background: openKnee === kp.id ? `${kp.color}18` : "transparent",
                    border: `1px solid ${openKnee === kp.id ? kp.color : "#d8cce8"}`,
                    color: openKnee === kp.id ? kp.color : "#7e6a9a", cursor:"pointer" }}>
                  {kp.icon} {kp.label}
                </button>
              ))}
            </div>
            {openKnee && (() => {
              const kp = KNEE_PROTOCOLS.find(k => k.id === openKnee);
              if (!kp) return null;
              return (
                <div style={{ background:`${kp.color}06`, border:`1px solid ${kp.color}30`, borderRadius:10, padding:"12px" }}>
                  <div style={{ fontSize:"0.6rem", color:kp.color, fontWeight:700, marginBottom:12,
                    background:`${kp.color}12`, display:"inline-block", padding:"3px 10px",
                    borderRadius:6, border:`1px solid ${kp.color}30` }}>
                    📚 {kp.evidence}
                  </div>
                  <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                    <button onClick={() => setOpenKneeTx(null)}
                      style={{ flex:1, padding:"8px", borderRadius:8,
                        border:`1px solid ${openKneeTx !== "tx" ? kp.color : "#d8cce8"}`,
                        background: openKneeTx !== "tx" ? `${kp.color}15` : "transparent",
                        color: openKneeTx !== "tx" ? kp.color : "#7e6a9a",
                        fontSize:"0.65rem", fontWeight:800, cursor:"pointer" }}>
                      💪 Exercise Protocol
                    </button>
                    <button onClick={() => setOpenKneeTx("tx")}
                      style={{ flex:1, padding:"8px", borderRadius:8,
                        border:`1px solid ${openKneeTx === "tx" ? kp.color : "#d8cce8"}`,
                        background: openKneeTx === "tx" ? `${kp.color}15` : "transparent",
                        color: openKneeTx === "tx" ? kp.color : "#7e6a9a",
                        fontSize:"0.65rem", fontWeight:800, cursor:"pointer" }}>
                      🏥 Treatment Techniques
                    </button>
                  </div>
                  {openKneeTx !== "tx" && kp.phases.map((ph, pi) => (
                    <div key={pi} style={{ marginBottom:8, border:`1px solid ${ph.color}30`, borderRadius:8, overflow:"hidden" }}>
                      <div onClick={() => togglePhase(`${kp.id}_${pi}`)}
                        style={{ padding:"10px 12px", cursor:"pointer", display:"flex",
                          alignItems:"center", justifyContent:"space-between", background:`${ph.color}10` }}>
                        <div style={{ fontWeight:800, fontSize:"0.72rem", color:ph.color }}>{ph.phase}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:"0.6rem", color:"#7e6a9a" }}>{ph.exercises.length} exercises</span>
                          <span style={{ color:ph.color, fontSize:"0.7rem" }}>{openPhase[`${kp.id}_${pi}`] ? "▲" : "▼"}</span>
                        </div>
                      </div>
                      {openPhase[`${kp.id}_${pi}`] && (
                        <div style={{ padding:"10px 12px" }}>
                          {ph.exercises.map((ex, ei) => (
                            <div key={ei} style={{ background:"#f9f7ff", border:"1px solid #d8cce8", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                              <div style={{ fontWeight:800, fontSize:"0.78rem", color:"#1a1025", marginBottom:4 }}>{ex.name}</div>
                              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:7 }}>
                                {[["Sets",ex.sets],["Reps",ex.reps],["Hold",ex.hold+"s"],["Freq",ex.freq]].map(([l,v]) => (
                                  <div key={l} style={{ background:`${ph.color}12`, border:`1px solid ${ph.color}30`, borderRadius:6, padding:"3px 8px", textAlign:"center" }}>
                                    <div style={{ fontSize:"0.72rem", fontWeight:900, color:ph.color }}>{v}</div>
                                    <div style={{ fontSize:"0.52rem", color:"#7e6a9a", textTransform:"uppercase" }}>{l}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize:"0.73rem", color:"#334155", lineHeight:1.6, marginBottom:6 }}>{ex.desc}</div>
                              <div style={{ background:"rgba(255,179,0,0.07)", border:"1px solid rgba(255,179,0,0.2)", borderRadius:6, padding:"5px 8px", fontSize:"0.68rem", color:"#b45309", marginBottom:5 }}>
                                💡 {ex.cues}
                              </div>
                              <div style={{ fontSize:"0.62rem", color:"#7f5af0" }}>📚 {ex.evidence}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {openKneeTx === "tx" && (
                    <div>
                      {kp.treatment.map((tx, ti) => (
                        <div key={ti} style={{ background:"#f9f7ff", border:`1px solid ${kp.color}25`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                          <div style={{ fontWeight:800, fontSize:"0.76rem", color:kp.color, marginBottom:5 }}>🏥 {tx.name}</div>
                          <div style={{ fontSize:"0.73rem", color:"#334155", lineHeight:1.6, marginBottom:6 }}>{tx.desc}</div>
                          <div style={{ fontSize:"0.62rem", color:"#7f5af0" }}>📚 {tx.evidence}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── SHOULDER EVIDENCE-BASED PROTOCOLS ── */}
      <div style={{ background:"#ffffff", border:"1px solid rgba(127,90,240,0.25)", borderRadius:12, overflow:"hidden", marginTop:10 }}>
        <div onClick={() => setShoulderOpen(o => !o)}
          style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"1rem" }}>💪</span>
            <div>
              <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#7f5af0" }}>Shoulder Evidence-Based Protocols</div>
              <div style={{ fontSize:"0.6rem", color:"#7e6a9a", marginTop:1 }}>Exercise + Treatment · {SHOULDER_PROTOCOLS.length} conditions covered</div>
            </div>
          </div>
          <span style={{ color:"#7f5af0", fontSize:"0.75rem" }}>{shoulderOpen ? "▲" : "▼"}</span>
        </div>
        {shoulderOpen && <ProtocolPanel protocols={SHOULDER_PROTOCOLS} openId={openShoulder} setOpenId={setOpenShoulder} openTx={openShoulderTx} setOpenTx={setOpenShoulderTx} openPhase={openPhase} togglePhase={togglePhase} />}
      </div>

      {/* ── ELBOW EVIDENCE-BASED PROTOCOLS ── */}
      <div style={{ background:"#ffffff", border:"1px solid rgba(255,179,0,0.25)", borderRadius:12, overflow:"hidden", marginTop:10 }}>
        <div onClick={() => setElbowOpen(o => !o)}
          style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"1rem" }}>🦾</span>
            <div>
              <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#ffb300" }}>Elbow Evidence-Based Protocols</div>
              <div style={{ fontSize:"0.6rem", color:"#7e6a9a", marginTop:1 }}>Exercise + Treatment · {ELBOW_PROTOCOLS.length} conditions covered</div>
            </div>
          </div>
          <span style={{ color:"#ffb300", fontSize:"0.75rem" }}>{elbowOpen ? "▲" : "▼"}</span>
        </div>
        {elbowOpen && <ProtocolPanel protocols={ELBOW_PROTOCOLS} openId={openElbow} setOpenId={setOpenElbow} openTx={openElbowTx} setOpenTx={setOpenElbowTx} openPhase={openPhase} togglePhase={togglePhase} />}
      </div>

      {/* ── HIP EVIDENCE-BASED PROTOCOLS ── */}
      <div style={{ background:"#ffffff", border:"1px solid rgba(255,112,67,0.25)", borderRadius:12, overflow:"hidden", marginTop:10 }}>
        <div onClick={() => setHipOpen(o => !o)}
          style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"1rem" }}>🍑</span>
            <div>
              <div style={{ fontSize:"0.72rem", fontWeight:800, color:"#ff7043" }}>Hip Evidence-Based Protocols</div>
              <div style={{ fontSize:"0.6rem", color:"#7e6a9a", marginTop:1 }}>Exercise + Treatment · {HIP_PROTOCOLS.length} conditions covered</div>
            </div>
          </div>
          <span style={{ color:"#ff7043", fontSize:"0.75rem" }}>{hipOpen ? "▲" : "▼"}</span>
        </div>
        {hipOpen && <ProtocolPanel protocols={HIP_PROTOCOLS} openId={openHip} setOpenId={setOpenHip} openTx={openHipTx} setOpenTx={setOpenHipTx} openPhase={openPhase} togglePhase={togglePhase} />}
      </div>

    </div>
  );
}

function ExercisePrescriptionModule({ data, set }) {
  // Initialise from shared data if already saved (patient switch / reload)
  const [programme,    setProgramme]    = useState(() => { try { const v=data?.hep_programme; return Array.isArray(v)?v:[]; } catch { return []; } });
  const [activeRegion, setActiveRegion] = useState("lumbar");
  const [activePhase,  setActivePhase]  = useState("All");
  const [search,       setSearch]       = useState("");
  const [openEx,       setOpenEx]       = useState(null);
  const [patientName,  setPatientName]  = useState(data?.dem_name || "");
  const [clinician,    setClinician]    = useState("");
  const [reviewDate,   setReviewDate]   = useState("");

  const phases = ["All","Phase 1","Phase 2","Phase 3"];
  const phaseColor = {"Phase 1":"#00c97a","Phase 2":"#ffb300","Phase 3":"#ff4d6d"};

  // Sync every programme change back into shared patient data
  const syncProgramme = (next) => { setProgramme(next); if(set) set("hep_programme", next); };

  const addEx = (ex) => { if(programme.find(p=>p.id===ex.id)) return; syncProgramme([...programme,{...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:""}]); };
  const removeEx = (id) => syncProgramme(programme.filter(e=>e.id!==id));
  const updateEx = (id,field,val) => syncProgramme(programme.map(e=>e.id===id?{...e,[field]:val}:e));
  const applyTemplate = (key) => { const t=PROGRAMME_TEMPLATES[key]; const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean); syncProgramme(exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:""}))); };

  const region = EXERCISE_DB[activeRegion];
  const filteredCategories = region ? Object.entries(region.categories).reduce((acc,[cat,exs])=>{
    const filtered=exs.filter(e=>(activePhase==="All"||e.phase===activePhase)&&(!search||e.name.toLowerCase().includes(search.toLowerCase())||e.target.toLowerCase().includes(search.toLowerCase())));
    if(filtered.length) acc[cat]=filtered;
    return acc;
  },{}) : {};

  const printHEP = () => {
    if(!programme.length) return;
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Programme</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}body{background:#fff;color:#1a1a2e;font-size:11px;line-height:1.55}.header{border-bottom:3px solid #0077b6;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}.logo{font-size:20px;font-weight:900;color:#0077b6}.logo span{color:#00b4d8}.meta{text-align:right;font-size:10px;color:#555}.ex{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}.ex-header{background:#0077b6;color:#fff;padding:8px 12px;display:flex;justify-content:space-between;align-items:center}.ex-title{font-size:12px;font-weight:800}.ex-phase{font-size:9px;opacity:0.8}.ex-body{padding:10px 12px}.ex-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.ex-stat{background:#f0f9ff;border-radius:6px;padding:5px 8px;text-align:center}.ex-stat-val{font-size:13px;font-weight:900;color:#0077b6}.ex-stat-label{font-size:8px;color:#64748b;text-transform:uppercase}.ex-target{font-size:9px;color:#7f5af0;font-weight:700;margin-bottom:5px}.ex-desc{font-size:10.5px;color:#334155;margin-bottom:6px;line-height:1.55}.ex-cues{background:#fefce8;border-left:3px solid #fbbf24;padding:5px 8px;font-size:10px;color:#713f12;margin-bottom:5px}.ex-prog{font-size:9.5px;color:#059669;margin-top:5px}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}.sig{margin-top:20px;display:flex;gap:30px}.sig-line{border-bottom:1px solid #94a3b8;height:28px;margin-bottom:3px}.sig-label{font-size:8px;color:#64748b}</style>
</head><body>
<div class="header"><div><div class="logo">Physio<span>Pro</span></div><div style="font-size:11px;color:#555;margin-top:2px">Home Exercise Programme</div></div><div class="meta"><div><b>Patient:</b> ${patientName||"—"}</div><div><b>Date:</b> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div><div><b>Clinician:</b> ${clinician||"—"}</div>${reviewDate?`<div><b>Review:</b> ${reviewDate}</div>`:""}</div></div>
<p style="font-size:10px;color:#555;margin-bottom:14px">Perform exercises as prescribed. Stop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.</p>
${programme.map((ex,i)=>`<div class="ex"><div class="ex-header"><span class="ex-title">${i+1}. ${ex.name}</span><span class="ex-phase">${ex.phase||""}</span></div><div class="ex-body"><div class="ex-target">🎯 ${ex.target}</div><div class="ex-grid"><div class="ex-stat"><div class="ex-stat-val">${ex.customSets}</div><div class="ex-stat-label">Sets</div></div><div class="ex-stat"><div class="ex-stat-val">${ex.customReps}</div><div class="ex-stat-label">Reps</div></div><div class="ex-stat"><div class="ex-stat-val">${ex.customHold}s</div><div class="ex-stat-label">Hold</div></div><div class="ex-stat"><div class="ex-stat-val" style="font-size:9px">${ex.customFreq}</div><div class="ex-stat-label">Freq</div></div></div><div class="ex-desc">${ex.desc}</div><div class="ex-cues">💡 ${ex.cues}</div>${ex.notes?`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:5px 8px;font-size:10px;margin-top:5px"><b>Notes:</b> ${ex.notes}</div>`:""}<div class="ex-prog">📈 ${ex.progression}</div><div style="margin-top:8px;font-size:9px;color:#94a3b8">Pain (0–10): ___/10 &nbsp;&nbsp; ☐ Mon ☐ Tue ☐ Wed ☐ Thu ☐ Fri ☐ Sat ☐ Sun</div></div></div>`).join("")}
<div class="sig"><div style="flex:1"><div class="sig-line"></div><div class="sig-label">Clinician Signature</div></div><div style="flex:1"><div class="sig-line"></div><div class="sig-label">Patient Signature</div></div></div>
<div class="footer">Generated by PhysioPro · ${new Date().toLocaleString()}</div>
</body></html>`;
    downloadPDFFromHTML(html, `HEP_${patientName || "Patient"}_${Date.now()}.pdf`);
  };

  const inp={width:"100%",background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:8,color:"#1a1025",fontFamily:"inherit",outline:"none",padding:"7px 10px",fontSize:"0.75rem"};

  return(
    <div>
      {/* ── QUICK TEMPLATES + KNEE PROTOCOLS ── */}
      <QuickTemplatesPanel applyTemplate={applyTemplate} />

      {/* Region tabs */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
        {Object.entries(EXERCISE_DB).map(([key,r])=>(
          <button key={key} onClick={()=>setActiveRegion(key)} style={{padding:"5px 10px",borderRadius:8,fontSize:"0.65rem",fontWeight:activeRegion===key?800:500,border:`1px solid ${activeRegion===key?r.color+"60":"#1a2d45"}`,background:activeRegion===key?`${r.color}15`:"transparent",color:activeRegion===key?r.color:"#7e6a9a",cursor:"pointer"}}>{r.icon} {r.label}</button>
        ))}
      </div>

      {/* Phase + Search */}
      <div style={{display:"flex",gap:7,marginBottom:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4}}>
          {phases.map(p=>(
            <button key={p} onClick={()=>setActivePhase(p)} style={{padding:"4px 9px",borderRadius:7,fontSize:"0.6rem",fontWeight:activePhase===p?800:500,border:`1px solid ${activePhase===p?(phaseColor[p]||"rgba(0,229,255,0.4)"):"#1a2d45"}`,background:activePhase===p?`${phaseColor[p]||"rgba(0,229,255,0.18)"}18`:"transparent",color:activePhase===p?(phaseColor[p]||"#00e5ff"):"#6b8399",cursor:"pointer"}}>{p}</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search exercises or muscles..." style={{flex:1,minWidth:120,background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:8,color:"#1a1025",fontFamily:"inherit",outline:"none",padding:"5px 10px",fontSize:"0.72rem"}}/>
      </div>

      {/* Exercise library */}
      <div style={{marginBottom:14}}>
        {Object.entries(filteredCategories).map(([cat,exs])=>(
          <div key={cat} style={{marginBottom:12}}>
            <div style={{fontSize:"0.6rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1px",marginBottom:7,display:"flex",alignItems:"center",gap:7}}>
              <div style={{height:1,width:8,background:region.color,borderRadius:1}}/>{cat}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {exs.map(ex=>{
                const inProg=programme.find(p=>p.id===ex.id);
                const isOpen=openEx===ex.id;
                return(
                  <div key={ex.id} style={{background:"#ffffff",border:`1px solid ${inProg?region.color+"50":"#1a2d45"}`,borderRadius:10,overflow:"hidden"}}>
                    <div onClick={()=>setOpenEx(isOpen?null:ex.id)} style={{padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                          <span style={{fontSize:"0.75rem",fontWeight:700,color:"#1a1025"}}>{ex.name}</span>
                          <span style={{fontSize:"0.55rem",padding:"1px 6px",borderRadius:5,background:`${phaseColor[ex.phase]||"#1a2d45"}18`,color:phaseColor[ex.phase]||"#6b8399",border:`1px solid ${phaseColor[ex.phase]||"#1a2d45"}40`,fontWeight:700}}>{ex.phase}</span>
                          <span style={{fontSize:"0.55rem",color:"#ffb300",fontWeight:700}}>⭐ {ex.evidence?.split(" — ")[0]}</span>
                        </div>
                        <div style={{fontSize:"0.63rem",color:"#7e6a9a",marginTop:2}}>{ex.target}</div>
                      </div>
                      <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                        <span style={{fontSize:"0.6rem",color:"#7e6a9a"}}>{isOpen?"▲":"▼"}</span>
                        <button onClick={e=>{e.stopPropagation();inProg?removeEx(ex.id):addEx(ex);}} style={{padding:"4px 10px",borderRadius:7,fontSize:"0.62rem",fontWeight:800,border:`1px solid ${inProg?"rgba(255,77,109,0.4)":"rgba(0,201,122,0.4)"}`,background:inProg?"rgba(255,77,109,0.12)":"rgba(0,201,122,0.12)",color:inProg?"#ff4d6d":"#00c97a",cursor:"pointer"}}>{inProg?"✕ Remove":"+ Add"}</button>
                      </div>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"0 12px 12px",borderTop:"1px solid #d8cce8"}}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,margin:"10px 0"}}>
                          {[["Sets",ex.sets],["Reps",ex.reps],["Hold",`${ex.hold}s`],["Freq",ex.freq]].map(([l,v])=>(
                            <div key={l} style={{background:"#f5f0fb",borderRadius:8,padding:"7px",textAlign:"center"}}>
                              <div style={{fontSize:"0.85rem",fontWeight:900,color:region.color}}>{v}</div>
                              <div style={{fontSize:"0.55rem",color:"#7e6a9a",textTransform:"uppercase"}}>{l}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{fontSize:"0.73rem",color:"#1a1025",lineHeight:1.6,marginBottom:7}}>{ex.desc}</div>
                        <div style={{padding:"7px 10px",background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",borderRadius:8,fontSize:"0.7rem",color:"#ffb300",marginBottom:7}}>💡 {ex.cues}</div>
                        <div style={{fontSize:"0.65rem",color:"#00c97a",marginBottom:4}}>📈 Progression: {ex.progression}</div>
                        <div style={{fontSize:"0.62rem",color:"#7f5af0"}}>📚 Evidence: {ex.evidence}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Programme builder */}
      {programme.length>0&&(
        <div style={{background:"#ffffff",border:"1px solid rgba(0,201,122,0.3)",borderRadius:14,padding:"14px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:7}}>
            <div style={{fontSize:"0.72rem",fontWeight:800,color:"#00c97a"}}>📋 Patient Programme — {programme.length} exercise{programme.length!==1?"s":""}</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setProgramme([])} style={{padding:"5px 10px",background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.3)",borderRadius:7,color:"#ff4d6d",fontSize:"0.62rem",fontWeight:700,cursor:"pointer"}}>🗑 Clear</button>
              <button onClick={printHEP} style={{padding:"5px 10px",background:"linear-gradient(135deg,rgba(0,201,122,0.2),rgba(0,229,255,0.15))",border:"1px solid rgba(0,201,122,0.4)",borderRadius:7,color:"#00c97a",fontSize:"0.62rem",fontWeight:800,cursor:"pointer"}}>🖨 Print HEP</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
            <div><label style={{fontSize:"0.58rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:3}}>Patient Name</label><input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="Patient name" style={inp}/></div>
            <div><label style={{fontSize:"0.58rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:3}}>Clinician</label><input value={clinician} onChange={e=>setClinician(e.target.value)} placeholder="Your name" style={inp}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={{fontSize:"0.58rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:3}}>Review Date</label><input value={reviewDate} onChange={e=>setReviewDate(e.target.value)} placeholder="e.g. 2 weeks" style={inp}/></div>
          </div>
          {programme.map((ex,i)=>(
            <div key={ex.id} style={{background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:9}}>
                <span style={{width:22,height:22,borderRadius:"50%",background:"rgba(0,201,122,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.62rem",fontWeight:800,color:"#00c97a",flexShrink:0}}>{i+1}</span>
                <div style={{flex:1}}><div style={{fontSize:"0.75rem",fontWeight:700,color:"#1a1025"}}>{ex.name}</div><div style={{fontSize:"0.6rem",color:"#7e6a9a"}}>{ex.target}</div></div>
                <button onClick={()=>removeEx(ex.id)} style={{background:"none",border:"1px solid #d8cce8",borderRadius:6,color:"#7e6a9a",cursor:"pointer",fontSize:"0.65rem",padding:"2px 7px"}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
                {[["Sets","customSets"],["Reps","customReps"],["Hold (s)","customHold"]].map(([label,field])=>(
                  <div key={field}><div style={{fontSize:"0.55rem",color:"#7e6a9a",marginBottom:2,textTransform:"uppercase"}}>{label}</div><input type="number" value={ex[field]} onChange={e=>updateEx(ex.id,field,e.target.value)} style={{...inp,padding:"5px 8px",textAlign:"center"}}/></div>
                ))}
                <div><div style={{fontSize:"0.55rem",color:"#7e6a9a",marginBottom:2,textTransform:"uppercase"}}>Frequency</div><input value={ex.customFreq} onChange={e=>updateEx(ex.id,"customFreq",e.target.value)} style={{...inp,padding:"5px 8px"}}/></div>
              </div>
              <div><div style={{fontSize:"0.55rem",color:"#7e6a9a",marginBottom:2,textTransform:"uppercase"}}>Clinical Notes</div><input value={ex.notes||""} onChange={e=>updateEx(ex.id,"notes",e.target.value)} placeholder="Patient-specific notes, modifications..." style={inp}/></div>
            </div>
          ))}
          <button onClick={printHEP} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#00c97a,#00e5ff)",border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:"0.82rem",cursor:"pointer",marginTop:4}}>🖨 Print / Download Home Exercise Programme (HEP)</button>
        </div>
      )}

      <div style={{padding:"7px 11px",background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:8,fontSize:"0.6rem",color:"#7e6a9a",lineHeight:1.5}}>
        ⚠ Exercise prescriptions are clinical suggestions. Modify sets/reps/frequency based on individual patient capacity, irritability, and response. Evidence ratings reflect current literature.
      </div>
    </div>
  );
}

// ─── Tenderness grade colours ─────────────────────────────────────────────────
const GRADE_COLOR = {
  "0":"#00c97a","1+":"#a3e635","2+":"#ffb300","3+":"#ff4d6d","4+":"#dc2626",
};

// ─── Comprehensive anatomical point map ───────────────────────────────────────
// Each zone: { label, structures[], side }
// Coordinates are % of SVG viewBox (0–100 × 0–200 for front; 0–100 × 0–200 for back)
// Front body occupies x:5–95, y:0–200; Back body: same
// The SVG viewBox is 200×420 (front left, back right, side by side)

// We define "hotspots" as named regions that trigger when user clicks within their radius
// Format: { id, label, structures, x (%), y (%), r (radius px in SVG), side:"front"|"back"|"both" }

const ANATOMICAL_HOTSPOTS = [
  // ── HEAD & NECK (front) ─────────────────────────────────────────────────────
  { id:"scalp",           x:50,  y:6,   r:14, side:"front", label:"Scalp / Occiput",
    structures:["Occipitofrontalis","Temporalis","Suboccipital muscles","Occipital protuberance","Mastoid process"] },
  { id:"tmj_r",           x:62,  y:13,  r:7,  side:"front", label:"Right TMJ",
    structures:["Temporomandibular joint","Lateral pterygoid","Masseter insertion","Articular disc"] },
  { id:"tmj_l",           x:38,  y:13,  r:7,  side:"front", label:"Left TMJ",
    structures:["Temporomandibular joint","Lateral pterygoid","Masseter insertion","Articular disc"] },
  { id:"scm_r",           x:62,  y:20,  r:7,  side:"front", label:"Right SCM",
    structures:["Sternocleidomastoid — sternal head","SCM — clavicular head","Anterior cervical lymph nodes"] },
  { id:"scm_l",           x:38,  y:20,  r:7,  side:"front", label:"Left SCM",
    structures:["Sternocleidomastoid — sternal head","SCM — clavicular head","Anterior cervical lymph nodes"] },
  { id:"ant_cervical",    x:50,  y:19,  r:6,  side:"front", label:"Anterior Cervical Spine",
    structures:["C2–C7 anterior vertebral bodies","Longus colli / longus capitis","Thyroid cartilage (C4/5)","Hyoid bone (C3)","Carotid pulse"] },

  // ── NECK (back) ──────────────────────────────────────────────────────────────
  { id:"post_cervical",   x:50,  y:10,  r:10, side:"back", label:"Posterior Cervical Spine",
    structures:["C2–C7 spinous processes","Suboccipital triangle","Semispinalis capitis","Splenius capitis","Trapezius — upper fibres","Facet joints C2–C7"] },
  { id:"cerv_lat_r",      x:62,  y:15,  r:7,  side:"back", label:"Right Lateral Cervical",
    structures:["Levator scapulae origin","Scalenes — posterior","C3–C5 transverse processes","Upper trapezius lateral border"] },
  { id:"cerv_lat_l",      x:38,  y:15,  r:7,  side:"back", label:"Left Lateral Cervical",
    structures:["Levator scapulae origin","Scalenes — posterior","C3–C5 transverse processes","Upper trapezius lateral border"] },

  // ── SHOULDER (front) ─────────────────────────────────────────────────────────
  { id:"ac_joint_r",      x:72,  y:24,  r:6,  side:"front", label:"Right AC Joint",
    structures:["Acromioclavicular joint","AC ligament","Coracoclavicular ligaments (conoid & trapezoid)","Acromion tip"] },
  { id:"ac_joint_l",      x:28,  y:24,  r:6,  side:"front", label:"Left AC Joint",
    structures:["Acromioclavicular joint","AC ligament","Coracoclavicular ligaments","Acromion tip"] },
  { id:"ant_deltoid_r",   x:76,  y:29,  r:7,  side:"front", label:"Right Anterior Deltoid",
    structures:["Anterior deltoid — clavicular head","Coracoid process","Bicipital groove","Long head biceps tendon","Subscapularis insertion (lesser tuberosity)"] },
  { id:"ant_deltoid_l",   x:24,  y:29,  r:7,  side:"front", label:"Left Anterior Deltoid",
    structures:["Anterior deltoid — clavicular head","Coracoid process","Bicipital groove","Long head biceps tendon","Subscapularis insertion (lesser tuberosity)"] },
  { id:"lat_deltoid_r",   x:82,  y:32,  r:6,  side:"front", label:"Right Lateral Deltoid",
    structures:["Lateral deltoid — acromial head","Greater tuberosity (supraspinatus insertion)","Subacromial space","Subdeltoid bursa"] },
  { id:"lat_deltoid_l",   x:18,  y:32,  r:6,  side:"front", label:"Left Lateral Deltoid",
    structures:["Lateral deltoid — acromial head","Greater tuberosity (supraspinatus insertion)","Subacromial space","Subdeltoid bursa"] },
  { id:"sternum",         x:50,  y:27,  r:7,  side:"front", label:"Sternum / SC Joint",
    structures:["Sternoclavicular joint","Manubrium","Sternal body","Xiphoid process","Pectoralis major — sternal origin"] },
  { id:"pec_major_r",     x:63,  y:30,  r:8,  side:"front", label:"Right Pectoralis Major",
    structures:["Pectoralis major — clavicular head","Pectoralis major — sternal head","Pectoralis minor (deep — coracoid)","Anterior axillary fold"] },
  { id:"pec_major_l",     x:37,  y:30,  r:8,  side:"front", label:"Left Pectoralis Major",
    structures:["Pectoralis major — clavicular head","Pectoralis major — sternal head","Pectoralis minor (deep — coracoid)","Anterior axillary fold"] },

  // ── SHOULDER (back) ──────────────────────────────────────────────────────────
  { id:"post_deltoid_r",  x:76,  y:28,  r:7,  side:"back", label:"Right Posterior Deltoid",
    structures:["Posterior deltoid — spinal head","Infraspinatus insertion (greater tuberosity)","Teres minor insertion","Posterior glenohumeral joint line"] },
  { id:"post_deltoid_l",  x:24,  y:28,  r:7,  side:"back", label:"Left Posterior Deltoid",
    structures:["Posterior deltoid — spinal head","Infraspinatus insertion (greater tuberosity)","Teres minor insertion","Posterior glenohumeral joint line"] },
  { id:"supraspinatus_r", x:71,  y:24,  r:6,  side:"back", label:"Right Supraspinatus",
    structures:["Supraspinatus — supraspinous fossa","Supraspinatus tendon (critical zone — 1cm from insertion)","Suprascapular nerve (suprascapular notch)"] },
  { id:"supraspinatus_l", x:29,  y:24,  r:6,  side:"back", label:"Left Supraspinatus",
    structures:["Supraspinatus — supraspinous fossa","Supraspinatus tendon (critical zone — 1cm from insertion)","Suprascapular nerve (suprascapular notch)"] },
  { id:"infraspinatus_r", x:72,  y:30,  r:7,  side:"back", label:"Right Infraspinatus",
    structures:["Infraspinatus — infraspinous fossa","Infraspinatus tendon","Teres minor","Posterior axillary fold"] },
  { id:"infraspinatus_l", x:28,  y:30,  r:7,  side:"back", label:"Left Infraspinatus",
    structures:["Infraspinatus — infraspinous fossa","Infraspinatus tendon","Teres minor","Posterior axillary fold"] },
  { id:"trapezius_r",     x:63,  y:21,  r:8,  side:"back", label:"Right Upper Trapezius",
    structures:["Upper trapezius","Levator scapulae (C1–C4 TP insertions)","Rhomboid minor origin","Trigger point zone — upper trapezius"] },
  { id:"trapezius_l",     x:37,  y:21,  r:8,  side:"back", label:"Left Upper Trapezius",
    structures:["Upper trapezius","Levator scapulae (C1–C4 TP insertions)","Rhomboid minor origin","Trigger point zone — upper trapezius"] },
  { id:"scapula_r",       x:71,  y:33,  r:8,  side:"back", label:"Right Scapula / Rhomboids",
    structures:["Scapular spine","Medial scapular border","Rhomboid major / minor","Mid trapezius","Serratus anterior (lateral border)"] },
  { id:"scapula_l",       x:29,  y:33,  r:8,  side:"back", label:"Left Scapula / Rhomboids",
    structures:["Scapular spine","Medial scapular border","Rhomboid major / minor","Mid trapezius","Serratus anterior (lateral border)"] },

  // ── THORACIC SPINE (back) ────────────────────────────────────────────────────
  { id:"thoracic_spine",  x:50,  y:32,  r:8,  side:"back", label:"Thoracic Spine (T1–T12)",
    structures:["T1–T12 spinous processes","Thoracic facet joints","Erector spinae (iliocostalis / longissimus)","Multifidus","Costotransverse joints"] },
  { id:"mid_trap",        x:50,  y:28,  r:6,  side:"back", label:"Mid Trapezius / Interscapular",
    structures:["Middle trapezius","Lower trapezius","Rhomboid major","Interscapular trigger point zone","T2–T5 spinous processes"] },

  // ── ELBOW (front) ────────────────────────────────────────────────────────────
  { id:"lat_epicon_r",    x:81,  y:46,  r:6,  side:"front", label:"Right Lateral Epicondyle",
    structures:["Lateral epicondyle","ECRB origin (tennis elbow)","EDC origin","Radiohumeral joint","Lateral collateral ligament origin"] },
  { id:"lat_epicon_l",    x:19,  y:46,  r:6,  side:"front", label:"Left Lateral Epicondyle",
    structures:["Lateral epicondyle","ECRB origin (tennis elbow)","EDC origin","Radiohumeral joint","Lateral collateral ligament origin"] },
  { id:"med_epicon_r",    x:74,  y:46,  r:6,  side:"front", label:"Right Medial Epicondyle",
    structures:["Medial epicondyle","FCR / FCU origin (golfer's elbow)","Ulnar nerve (cubital tunnel)","UCL origin","Pronator teres origin"] },
  { id:"med_epicon_l",    x:26,  y:46,  r:6,  side:"front", label:"Left Medial Epicondyle",
    structures:["Medial epicondyle","FCR / FCU origin (golfer's elbow)","Ulnar nerve (cubital tunnel)","UCL origin","Pronator teres origin"] },
  { id:"ant_cubital_r",   x:78,  y:47,  r:5,  side:"front", label:"Right Antecubital Fossa",
    structures:["Biceps tendon","Brachialis","Brachial artery","Median nerve","Bicipital aponeurosis"] },
  { id:"ant_cubital_l",   x:22,  y:47,  r:5,  side:"front", label:"Left Antecubital Fossa",
    structures:["Biceps tendon","Brachialis","Brachial artery","Median nerve","Bicipital aponeurosis"] },

  // ── FOREARM (front) ──────────────────────────────────────────────────────────
  { id:"ant_forearm_r",   x:80,  y:53,  r:6,  side:"front", label:"Right Anterior Forearm",
    structures:["Flexor digitorum superficialis","Flexor carpi radialis","Palmaris longus","Pronator teres","Median nerve (midforearm)"] },
  { id:"ant_forearm_l",   x:20,  y:53,  r:6,  side:"front", label:"Left Anterior Forearm",
    structures:["Flexor digitorum superficialis","Flexor carpi radialis","Palmaris longus","Pronator teres","Median nerve (midforearm)"] },

  // ── WRIST & HAND ─────────────────────────────────────────────────────────────
  { id:"wrist_r",         x:81,  y:61,  r:6,  side:"front", label:"Right Wrist / Carpal Tunnel",
    structures:["Carpal tunnel (median nerve)","Flexor retinaculum","Radial styloid (De Quervain's)","Scaphoid tubercle","Pisiform (ulnar nerve / FCU)"] },
  { id:"wrist_l",         x:19,  y:61,  r:6,  side:"front", label:"Left Wrist / Carpal Tunnel",
    structures:["Carpal tunnel (median nerve)","Flexor retinaculum","Radial styloid (De Quervain's)","Scaphoid tubercle","Pisiform (ulnar nerve / FCU)"] },

  // ── ABDOMEN / LUMBAR (front) ─────────────────────────────────────────────────
  { id:"abdomen",         x:50,  y:50,  r:10, side:"front", label:"Abdomen",
    structures:["Rectus abdominis","External oblique","Linea alba","Umbilical region","Inguinal ligament","McBurney's point (appendix)"] },

  // ── LUMBAR SPINE (back) ──────────────────────────────────────────────────────
  { id:"lumbar_spine",    x:50,  y:49,  r:9,  side:"back", label:"Lumbar Spine (L1–L5)",
    structures:["L1–L5 spinous processes","Lumbar facet joints","Erector spinae (paraspinal)","Multifidus","Interspinous ligaments","L4/L5 — most common disc level"] },
  { id:"si_joint_r",      x:60,  y:55,  r:7,  side:"back", label:"Right Sacroiliac Joint",
    structures:["Sacroiliac joint (PSIS)","Posterior SI ligament","Iliolumbar ligament","Piriformis origin","PSIS landmark"] },
  { id:"si_joint_l",      x:40,  y:55,  r:7,  side:"back", label:"Left Sacroiliac Joint",
    structures:["Sacroiliac joint (PSIS)","Posterior SI ligament","Iliolumbar ligament","Piriformis origin","PSIS landmark"] },
  { id:"ql_r",            x:63,  y:49,  r:6,  side:"back", label:"Right Quadratus Lumborum",
    structures:["Quadratus lumborum","QL trigger point zone","12th rib attachment","Iliac crest insertion","L1–L4 transverse processes"] },
  { id:"ql_l",            x:37,  y:49,  r:6,  side:"back", label:"Left Quadratus Lumborum",
    structures:["Quadratus lumborum","QL trigger point zone","12th rib attachment","Iliac crest insertion","L1–L4 transverse processes"] },

  // ── HIP (front) ──────────────────────────────────────────────────────────────
  { id:"asis_r",          x:65,  y:60,  r:7,  side:"front", label:"Right ASIS / Hip Flexors",
    structures:["Anterior superior iliac spine (ASIS)","Sartorius origin","TFL origin","Inguinal ligament lateral end","Femoral nerve (medial to ASIS)"] },
  { id:"asis_l",          x:35,  y:60,  r:7,  side:"front", label:"Left ASIS / Hip Flexors",
    structures:["Anterior superior iliac spine (ASIS)","Sartorius origin","TFL origin","Inguinal ligament lateral end","Femoral nerve (medial to ASIS)"] },
  { id:"groin_r",         x:62,  y:65,  r:7,  side:"front", label:"Right Groin / Adductor Origin",
    structures:["Adductor longus origin (pubic tubercle)","Adductor brevis","Gracilis origin","Iliopsoas tendon (lesser trochanter)","Femoral triangle"] },
  { id:"groin_l",         x:38,  y:65,  r:7,  side:"front", label:"Left Groin / Adductor Origin",
    structures:["Adductor longus origin (pubic tubercle)","Adductor brevis","Gracilis origin","Iliopsoas tendon (lesser trochanter)","Femoral triangle"] },

  // ── HIP (back) ───────────────────────────────────────────────────────────────
  { id:"gmax_r",          x:65,  y:62,  r:9,  side:"back", label:"Right Gluteus Maximus",
    structures:["Gluteus maximus — posterior ilium","Sacrotuberous ligament","Gluteal fold","Greater trochanter (posterolateral)","Ischial tuberosity (proximal hamstrings)"] },
  { id:"gmax_l",          x:35,  y:62,  r:9,  side:"back", label:"Left Gluteus Maximus",
    structures:["Gluteus maximus — posterior ilium","Sacrotuberous ligament","Gluteal fold","Greater trochanter (posterolateral)","Ischial tuberosity (proximal hamstrings)"] },
  { id:"gt_r",            x:75,  y:62,  r:6,  side:"back", label:"Right Greater Trochanter",
    structures:["Greater trochanter","Gluteus medius insertion","Gluteus minimus insertion","Trochanteric bursa","TFL / IT band proximal"] },
  { id:"gt_l",            x:25,  y:62,  r:6,  side:"back", label:"Left Greater Trochanter",
    structures:["Greater trochanter","Gluteus medius insertion","Gluteus minimus insertion","Trochanteric bursa","TFL / IT band proximal"] },
  { id:"piriformis_r",    x:63,  y:62,  r:6,  side:"back", label:"Right Piriformis / Deep Gluteal",
    structures:["Piriformis (mid-point PSIS → GT)","Sciatic nerve (deep gluteal)","Obturator internus","Quadratus femoris","Deep gluteal syndrome zone"] },
  { id:"piriformis_l",    x:37,  y:62,  r:6,  side:"back", label:"Left Piriformis / Deep Gluteal",
    structures:["Piriformis (mid-point PSIS → GT)","Sciatic nerve (deep gluteal)","Obturator internus","Quadratus femoris","Deep gluteal syndrome zone"] },

  // ── THIGH (front) ────────────────────────────────────────────────────────────
  { id:"quad_r",          x:68,  y:76,  r:8,  side:"front", label:"Right Quadriceps",
    structures:["Rectus femoris — central belly","Vastus lateralis","Vastus medialis oblique (VMO)","Quadriceps tendon (suprapatellar)","TFL / IT band (lateral thigh)"] },
  { id:"quad_l",          x:32,  y:76,  r:8,  side:"front", label:"Left Quadriceps",
    structures:["Rectus femoris — central belly","Vastus lateralis","Vastus medialis oblique (VMO)","Quadriceps tendon (suprapatellar)","TFL / IT band (lateral thigh)"] },

  // ── THIGH (back) ─────────────────────────────────────────────────────────────
  { id:"hamstring_r",     x:67,  y:75,  r:9,  side:"back", label:"Right Hamstrings",
    structures:["Biceps femoris — long head","Semitendinosus","Semimembranosus","Proximal hamstring origin (ischial tuberosity)","Sciatic nerve (posterior thigh)"] },
  { id:"hamstring_l",     x:33,  y:75,  r:9,  side:"back", label:"Left Hamstrings",
    structures:["Biceps femoris — long head","Semitendinosus","Semimembranosus","Proximal hamstring origin (ischial tuberosity)","Sciatic nerve (posterior thigh)"] },
  { id:"itband_r",        x:76,  y:76,  r:6,  side:"back", label:"Right IT Band / Lateral Thigh",
    structures:["Iliotibial band","TFL belly","Vastus lateralis (lateral)","IT band — mid thigh friction zone"] },
  { id:"itband_l",        x:24,  y:76,  r:6,  side:"back", label:"Left IT Band / Lateral Thigh",
    structures:["Iliotibial band","TFL belly","Vastus lateralis (lateral)","IT band — mid thigh friction zone"] },

  // ── KNEE (front) ─────────────────────────────────────────────────────────────
  { id:"patella_r",       x:68,  y:87,  r:6,  side:"front", label:"Right Patella / Extensor Mechanism",
    structures:["Patella (superior / inferior pole)","Patellar tendon","Tibial tuberosity (Osgood-Schlatter)","Infrapatellar fat pad","Medial patellar facet","Lateral patellar facet"] },
  { id:"patella_l",       x:32,  y:87,  r:6,  side:"front", label:"Left Patella / Extensor Mechanism",
    structures:["Patella (superior / inferior pole)","Patellar tendon","Tibial tuberosity (Osgood-Schlatter)","Infrapatellar fat pad","Medial patellar facet","Lateral patellar facet"] },
  { id:"med_knee_r",      x:63,  y:88,  r:5,  side:"front", label:"Right Medial Knee",
    structures:["MCL — femoral attachment","MCL — tibial attachment","Medial meniscus (joint line)","Pes anserinus (ST/gracilis/sartorius)","Medial compartment"] },
  { id:"med_knee_l",      x:37,  y:88,  r:5,  side:"front", label:"Left Medial Knee",
    structures:["MCL — femoral attachment","MCL — tibial attachment","Medial meniscus (joint line)","Pes anserinus (ST/gracilis/sartorius)","Medial compartment"] },
  { id:"lat_knee_r",      x:74,  y:88,  r:5,  side:"front", label:"Right Lateral Knee",
    structures:["LCL (lateral collateral ligament)","Lateral meniscus (joint line)","IT band — Gerdy's tubercle","Biceps femoris insertion (fibula head)","Popliteus tendon"] },
  { id:"lat_knee_l",      x:26,  y:88,  r:5,  side:"front", label:"Left Lateral Knee",
    structures:["LCL (lateral collateral ligament)","Lateral meniscus (joint line)","IT band — Gerdy's tubercle","Biceps femoris insertion (fibula head)","Popliteus tendon"] },

  // ── KNEE (back) ──────────────────────────────────────────────────────────────
  { id:"popliteal_r",     x:67,  y:88,  r:7,  side:"back", label:"Right Popliteal Fossa",
    structures:["Popliteal fossa","Popliteal artery (pulse)","Common peroneal nerve","Posterior capsule","Baker's cyst zone","Popliteus muscle"] },
  { id:"popliteal_l",     x:33,  y:88,  r:7,  side:"back", label:"Left Popliteal Fossa",
    structures:["Popliteal fossa","Popliteal artery (pulse)","Common peroneal nerve","Posterior capsule","Baker's cyst zone","Popliteus muscle"] },

  // ── LOWER LEG (front) ────────────────────────────────────────────────────────
  { id:"ant_shin_r",      x:69,  y:97,  r:6,  side:"front", label:"Right Anterior Shin / Tibialis Anterior",
    structures:["Tibialis anterior — belly","Tibial crest (shin splints / MTSS)","Extensor digitorum longus","Anterior compartment","Deep peroneal nerve"] },
  { id:"ant_shin_l",      x:31,  y:97,  r:6,  side:"front", label:"Left Anterior Shin / Tibialis Anterior",
    structures:["Tibialis anterior — belly","Tibial crest (shin splints / MTSS)","Extensor digitorum longus","Anterior compartment","Deep peroneal nerve"] },

  // ── LOWER LEG (back) ─────────────────────────────────────────────────────────
  { id:"gastroc_r",       x:67,  y:96,  r:7,  side:"back", label:"Right Gastrocnemius / Soleus",
    structures:["Gastrocnemius — medial head","Gastrocnemius — lateral head","Soleus","Achilles tendon (proximal)","Sural nerve","Musculotendinous junction"] },
  { id:"gastroc_l",       x:33,  y:96,  r:7,  side:"back", label:"Left Gastrocnemius / Soleus",
    structures:["Gastrocnemius — medial head","Gastrocnemius — lateral head","Soleus","Achilles tendon (proximal)","Sural nerve","Musculotendinous junction"] },

  // ── ANKLE & FOOT ─────────────────────────────────────────────────────────────
  { id:"achilles_r",      x:67,  y:108, r:5,  side:"back", label:"Right Achilles Tendon",
    structures:["Achilles tendon — mid-portion (2–6cm from insertion)","Achilles insertion (calcaneum)","Retrocalcaneal bursa","Haglund's deformity zone","Kager's fat pad"] },
  { id:"achilles_l",      x:33,  y:108, r:5,  side:"back", label:"Left Achilles Tendon",
    structures:["Achilles tendon — mid-portion (2–6cm from insertion)","Achilles insertion (calcaneum)","Retrocalcaneal bursa","Haglund's deformity zone","Kager's fat pad"] },
  { id:"lat_ankle_r",     x:74,  y:108, r:6,  side:"front", label:"Right Lateral Ankle",
    structures:["ATFL (anterior talofibular ligament)","CFL (calcaneofibular ligament)","Lateral malleolus","Peroneus longus / brevis tendons","Sinus tarsi"] },
  { id:"lat_ankle_l",     x:26,  y:108, r:6,  side:"front", label:"Left Lateral Ankle",
    structures:["ATFL (anterior talofibular ligament)","CFL (calcaneofibular ligament)","Lateral malleolus","Peroneus longus / brevis tendons","Sinus tarsi"] },
  { id:"med_ankle_r",     x:63,  y:108, r:6,  side:"front", label:"Right Medial Ankle",
    structures:["Deltoid ligament","Medial malleolus","Tibialis posterior tendon","Flexor digitorum longus","Tarsal tunnel (posterior tibial nerve)"] },
  { id:"med_ankle_l",     x:37,  y:108, r:6,  side:"front", label:"Left Medial Ankle",
    structures:["Deltoid ligament","Medial malleolus","Tibialis posterior tendon","Flexor digitorum longus","Tarsal tunnel (posterior tibial nerve)"] },
  { id:"plantar_r",       x:69,  y:113, r:6,  side:"front", label:"Right Plantar Fascia / Heel",
    structures:["Plantar fascia — calcaneal origin","Calcaneal fat pad","Medial calcaneal tubercle","Plantar fascia — mid-band","1st MTP joint (hallux rigidus)"] },
  { id:"plantar_l",       x:31,  y:113, r:6,  side:"front", label:"Left Plantar Fascia / Heel",
    structures:["Plantar fascia — calcaneal origin","Calcaneal fat pad","Medial calcaneal tubercle","Plantar fascia — mid-band","1st MTP joint (hallux rigidus)"] },
];

// ─── Palpation finding options ────────────────────────────────────────────────
const GRADES = ["0","1+","2+","3+","4+"];
const TEMPS  = ["Normal","Warm","Hot","Cool","Cold"];
const TEXTURES = ["Normal / Soft","Tight / Restricted","Spasm","Trigger Point","Thickened / Fibrosed","Crepitus","Fluctuant / Oedema"];
const FINDING_COLORS = {
  "0":"#00c97a","1+":"#a3e635","2+":"#ffb300","3+":"#ff4d6d","4+":"#dc2626",
  "Normal":"#00c97a","Warm":"#ffb300","Hot":"#ff4d6d","Cool":"#38bdf8","Cold":"#0ea5e9",
};

// ─── SVG Body Figure ──────────────────────────────────────────────────────────
// Draws a clean anatomical outline — front (left) and back (right) in one SVG
// ViewBox: 0 0 200 130  (front occupies 0–90, back 110–200, y 0–130)
// All hotspot coordinates use this viewBox scale

const BODY_SVG_VIEWBOX = "0 0 220 125";

function BodyFigureSVG({ pins, hoveredHotspot, onHover, onClick, view }) {
  // view: "front" | "back"
  const offsetX = view === "back" ? 110 : 0;

  // anatomical outline paths (simplified but recognisable)
  const bodyColor = "#0d1929";
  const outlineColor = "#1e3a5f";
  const sk = outlineColor;

  return (
    <g transform={`translate(${offsetX}, 0)`}>
      {/* ── Label ── */}
      <text x="45" y="6" textAnchor="middle" fontSize="4" fill="#6b8399" fontWeight="700" letterSpacing="1">
        {view === "front" ? "ANTERIOR" : "POSTERIOR"}
      </text>

      {/* ── HEAD ── */}
      <ellipse cx="45" cy="16" rx="10" ry="12" fill={bodyColor} stroke={sk} strokeWidth="0.8"/>
      {/* ears */}
      <ellipse cx="35.5" cy="16" rx="2" ry="3.5" fill={bodyColor} stroke={sk} strokeWidth="0.6"/>
      <ellipse cx="54.5" cy="16" rx="2" ry="3.5" fill={bodyColor} stroke={sk} strokeWidth="0.6"/>
      {/* neck */}
      <rect x="40" y="26.5" width="10" height="8" rx="2" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>

      {/* ── TORSO ── */}
      {/* shoulders */}
      <path d="M28,33 Q20,32 18,38 L20,48 Q22,50 25,49 L30,38Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <path d="M62,33 Q70,32 72,38 L70,48 Q68,50 65,49 L60,38Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      {/* torso body */}
      <path d="M30,33 Q45,30 60,33 L63,68 Q58,75 45,76 Q32,75 27,68Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      {/* clavicles (front only) */}
      {view === "front" && <>
        <line x1="40" y1="33" x2="28" y2="35" stroke={sk} strokeWidth="0.5" opacity="0.5"/>
        <line x1="50" y1="33" x2="62" y2="35" stroke={sk} strokeWidth="0.5" opacity="0.5"/>
        {/* sternum */}
        <line x1="45" y1="33" x2="45" y2="66" stroke={sk} strokeWidth="0.5" opacity="0.4"/>
      </>}
      {/* spine line (back only) */}
      {view === "back" && <line x1="45" y1="33" x2="45" y2="76" stroke={sk} strokeWidth="0.5" opacity="0.4"/>}

      {/* ── PELVIS ── */}
      <path d="M27,68 Q45,80 63,68 L65,78 Q58,86 45,87 Q32,86 25,78Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      {/* iliac crests */}
      <path d="M27,68 Q24,72 25,78" fill="none" stroke={sk} strokeWidth="0.5" opacity="0.5"/>
      <path d="M63,68 Q66,72 65,78" fill="none" stroke={sk} strokeWidth="0.5" opacity="0.5"/>

      {/* ── UPPER ARMS ── */}
      <path d="M20,38 L14,60 Q13,63 16,64 L22,62 L25,49Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <path d="M70,38 L76,60 Q77,63 74,64 L68,62 L65,49Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>

      {/* ── FOREARMS ── */}
      <path d="M14,60 L10,80 Q9,83 12,84 L16,83 L22,62Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <path d="M76,60 L80,80 Q81,83 78,84 L74,83 L68,62Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>

      {/* ── HANDS ── */}
      <ellipse cx="11" cy="87" rx="4" ry="5.5" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <ellipse cx="79" cy="87" rx="4" ry="5.5" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      {/* fingers */}
      {[8,10,12,14].map((x,i)=><line key={i} x1={x} y1="91" x2={x-0.5} y2="95" stroke={sk} strokeWidth="0.5" opacity="0.6"/>)}
      {[76,78,80,82].map((x,i)=><line key={i} x1={x} y1="91" x2={x+0.5} y2="95" stroke={sk} strokeWidth="0.5" opacity="0.6"/>)}

      {/* ── THIGHS ── */}
      <path d="M25,78 L22,108 Q22,112 25,113 L34,113 Q37,112 37,108 L38,78Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <path d="M65,78 L68,108 Q68,112 65,113 L56,113 Q53,112 53,108 L52,78Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>

      {/* ── LOWER LEGS ── */}
      <path d="M22,108 L21,120 Q21,122 24,122 L28,122 Q31,122 32,120 L34,113 Q26,113 22,108Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <path d="M68,108 L69,120 Q69,122 66,122 L62,122 Q59,122 58,120 L56,113 Q64,113 68,108Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>

      {/* ── FEET ── */}
      <path d="M21,120 Q18,122 17,124 L30,124 Q32,124 32,122 L28,122Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>
      <path d="M69,120 Q72,122 73,124 L60,124 Q58,124 58,122 L62,122Z" fill={bodyColor} stroke={sk} strokeWidth="0.7"/>

      {/* ── SCAPULAE (back only) ── */}
      {view === "back" && <>
        <path d="M27,35 Q24,42 26,48 Q30,52 34,48 Q36,42 33,35Z" fill="none" stroke={sk} strokeWidth="0.5" opacity="0.5"/>
        <path d="M63,35 Q66,42 64,48 Q60,52 56,48 Q54,42 57,35Z" fill="none" stroke={sk} strokeWidth="0.5" opacity="0.5"/>
        {/* spine of scapula */}
        <line x1="26" y1="37" x2="34" y2="37" stroke={sk} strokeWidth="0.4" opacity="0.5"/>
        <line x1="64" y1="37" x2="56" y2="37" stroke={sk} strokeWidth="0.4" opacity="0.5"/>
      </>}

      {/* ── KNEE CAPS (front) ── */}
      {view === "front" && <>
        <ellipse cx="29" cy="108" rx="5" ry="4" fill={bodyColor} stroke={sk} strokeWidth="0.6" opacity="0.7"/>
        <ellipse cx="61" cy="108" rx="5" ry="4" fill={bodyColor} stroke={sk} strokeWidth="0.6" opacity="0.7"/>
      </>}

      {/* ── HOTSPOT INTERACTIVE ZONES ── */}
      {ANATOMICAL_HOTSPOTS.filter(h => h.side === view || h.side === "both").map(h => {
        // convert % coords to SVG space (viewbox 90×125 per body)
        const sx = (h.x / 100) * 90;
        const sy = (h.y / 100) * 125;
        const pin = pins.find(p => p.hotspotId === h.id);
        const isHovered = hoveredHotspot === h.id;
        const gradeColor = pin ? (GRADE_COLOR[pin.tenderness] || C.accent) : null;

        return (
          <g key={h.id}>
            {/* Invisible interaction zone */}
            <circle
              cx={sx} cy={sy} r={h.r * 0.85}
              fill={isHovered ? "rgba(0,229,255,0.12)" : "transparent"}
              stroke={isHovered ? "rgba(0,229,255,0.5)" : "transparent"}
              strokeWidth="0.5"
              style={{ cursor:"crosshair", transition:"fill 0.15s" }}
              onMouseEnter={() => onHover(h.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onClick(h)}
            />
            {/* Pin marker if recorded */}
            {pin && (
              <g onClick={() => onClick(h)} style={{ cursor:"pointer" }}>
                <circle cx={sx} cy={sy} r="3.5"
                  fill={gradeColor} stroke="#000" strokeWidth="0.5"
                  style={{ filter:`drop-shadow(0 0 3px ${gradeColor})` }}/>
                <circle cx={sx} cy={sy} r="1.5" fill="#000" opacity="0.5"/>
              </g>
            )}
            {/* Hover tooltip */}
            {isHovered && !pin && (
              <g>
                <circle cx={sx} cy={sy} r="2.5"
                  fill="rgba(0,229,255,0.3)" stroke="#00e5ff" strokeWidth="0.6"
                  style={{ animation:"pulse 1s infinite" }}/>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ─── Tenderness Grade Selector ────────────────────────────────────────────────
function GradeChip({ value, selected, onClick }) {
  const color = GRADE_COLOR[value] || C.muted;
  return (
    <button
      onClick={onClick}
      style={{
        padding:"5px 10px", borderRadius:8, fontSize:"0.72rem", fontWeight:700,
        border:`1.5px solid ${selected ? color : C.border}`,
        background: selected ? `${color}20` : "transparent",
        color: selected ? color : C.muted,
        cursor:"pointer", transition:"all 0.12s",
      }}
    >{value}</button>
  );
}

// ─── Main PalpationModule ─────────────────────────────────────────────────────
function PalpationModule({ data, set }) {
  const C = getC();
  const [pins, setPins]           = useState([]); // { id, hotspotId, label, structures, tenderness, temp, texture, notes, side }
  const [selected, setSelected]   = useState(null); // id of selected pin
  const [hovered, setHovered]     = useState(null);  // hotspot id
  const [view, setView]           = useState("front"); // "front" | "back"
  const genId = () => Math.random().toString(36).slice(2, 9);

  // Click on hotspot → add or select pin
  const handleHotspotClick = useCallback((hotspot) => {
    const existing = pins.find(p => p.hotspotId === hotspot.id);
    if (existing) {
      setSelected(existing.id);
    } else {
      const newPin = {
        id: genId(),
        hotspotId: hotspot.id,
        label: hotspot.label,
        structures: hotspot.structures,
        side: view,
        tenderness: "",
        temp: "",
        texture: [],
        notes: "",
      };
      setPins(p => [...p, newPin]);
      setSelected(newPin.id);
    }
  }, [pins, view]);

  const updatePin = (id, field, val) => {
    setPins(p => p.map(pin => pin.id === id ? { ...pin, [field]: val } : pin));
  };

  const toggleTexture = (id, tex) => {
    setPins(p => p.map(pin => {
      if (pin.id !== id) return pin;
      const arr = pin.texture || [];
      return { ...pin, texture: arr.includes(tex) ? arr.filter(t => t !== tex) : [...arr, tex] };
    }));
  };

  const removePin = (id) => {
    setPins(p => p.filter(pin => pin.id !== id));
    if (selected === id) setSelected(null);
  };

  const selPin = pins.find(p => p.id === selected);
  const detailPanelRef = useRef(null);

  // Auto-scroll to detail panel on mobile when a pin is selected
  useEffect(() => {
    if (selected && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" });
      }, 80);
    }
  }, [selected]);

  // Serialize pins to shared data whenever they change
  useEffect(() => {
    if (!set) return;
    set(prev => ({ ...prev, palp_pins: JSON.stringify(pins) }));
  }, [pins]);

  const inp = {
    width:"100%", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.text, padding:"8px 10px", fontSize:"0.75rem", fontFamily:"inherit",
    outline:"none", resize:"vertical",
  };

  return (
    <div style={{ fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif", color:C.text }}>
      <style>{`
        @keyframes pulsePin { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.4)} }
        @keyframes slideIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:`linear-gradient(135deg,rgba(0,229,255,0.06),rgba(127,90,240,0.06))`,
        border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:"0.95rem", color:C.accent }}>🖐️ Palpation Map</div>
            <div style={{ fontSize:"0.68rem", color:C.muted, marginTop:2 }}>
              Tap any region on the body — anatomical point auto-generates. Record tenderness, tissue quality & findings.
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"0.65rem", color:C.muted }}>{pins.length} point{pins.length !== 1 ? "s" : ""} recorded</span>
            {pins.length > 0 && (
              <button onClick={() => { setPins([]); setSelected(null); }}
                style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${C.red}40`,
                  background:"rgba(255,77,109,0.08)", color:C.red, fontSize:"0.62rem",
                  fontWeight:700, cursor:"pointer" }}>Clear all</button>
            )}
          </div>
        </div>

        {/* Instruction */}
        <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ padding:"5px 10px", background:"rgba(0,229,255,0.08)", border:`1px solid ${C.accent}25`,
            borderRadius:8, fontSize:"0.65rem", color:C.accent }}>
            👆 Tap body → anatomical point appears
          </div>
          <div style={{ padding:"5px 10px", background:"rgba(127,90,240,0.08)", border:`1px solid ${C.a2}25`,
            borderRadius:8, fontSize:"0.65rem", color:C.a2 }}>
            🔴 Coloured dots = recorded findings
          </div>
          <div style={{ padding:"5px 10px", background:"rgba(0,201,122,0.08)", border:`1px solid ${C.green}25`,
            borderRadius:8, fontSize:"0.65rem", color:C.green }}>
            Dot colour = tenderness grade
          </div>
        </div>
      </div>

      {/* ── View toggle ── */}
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {[["front","Anterior View 🫀"],["back","Posterior View 🦴"]].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ flex:1, padding:"9px", borderRadius:10, fontWeight:700, fontSize:"0.76rem",
              cursor:"pointer", border:`1.5px solid ${view === v ? C.accent : C.border}`,
              background: view === v ? "rgba(0,229,255,0.1)" : C.surface,
              color: view === v ? C.accent : C.muted, transition:"all 0.15s" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Body Map + Panel ── */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>

        {/* SVG Body */}
        <div style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:300 }}>
          <svg
            viewBox={BODY_SVG_VIEWBOX}
            width="100%"
            style={{ maxWidth:280, minWidth:180, background:C.surface,
              border:`1px solid ${C.border}`, borderRadius:14,
              cursor:"crosshair", userSelect:"none" }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Front body (left) */}
            <BodyFigureSVG
              view="front"
              pins={pins.filter(p => p.side === "front")}
              hoveredHotspot={view === "front" ? hovered : null}
              onHover={view === "front" ? setHovered : () => {}}
              onClick={view === "front" ? handleHotspotClick : () => {}}
            />

            {/* Back body (right) */}
            <BodyFigureSVG
              view="back"
              pins={pins.filter(p => p.side === "back")}
              hoveredHotspot={view === "back" ? hovered : null}
              onHover={view === "back" ? setHovered : () => {}}
              onClick={view === "back" ? handleHotspotClick : () => {}}
            />

            {/* Divider */}
            <line x1="105" y1="5" x2="105" y2="125" stroke={C.border} strokeWidth="0.5" strokeDasharray="2,3"/>
          </svg>

          {/* Hover tooltip outside SVG */}
          {hovered && (
            <div style={{ marginTop:6, padding:"6px 12px", background:C.s2,
              border:`1px solid ${C.accent}40`, borderRadius:8, maxWidth:280,
              fontSize:"0.68rem", color:C.accent, fontWeight:600, textAlign:"center",
              animation:"slideIn 0.15s ease" }}>
              {ANATOMICAL_HOTSPOTS.find(h => h.id === hovered)?.label}
              <div style={{ color:C.muted, fontWeight:400, fontSize:"0.6rem", marginTop:1 }}>
                Click to add palpation point
              </div>
            </div>
          )}

          {/* Tenderness legend */}
          <div style={{ marginTop:10, padding:"8px 10px", background:C.surface,
            border:`1px solid ${C.border}`, borderRadius:8, maxWidth:280, width:"100%" }}>
            <div style={{ fontSize:"0.58rem", fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Tenderness Legend</div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {GRADES.map(g => (
                <div key={g} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:GRADE_COLOR[g],
                    boxShadow:`0 0 4px ${GRADE_COLOR[g]}` }}/>
                  <span style={{ fontSize:"0.6rem", color:C.muted, fontWeight:600 }}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div ref={detailPanelRef} style={{ flex:"1 1 260px", minWidth:220 }}>

          {/* No selection state */}
          {!selPin && pins.length === 0 && (
            <div style={{ background:C.surface, border:`1px dashed ${C.border}`,
              borderRadius:12, padding:"28px 20px", textAlign:"center" }}>
              <div style={{ fontSize:"2.2rem", marginBottom:10 }}>🖐️</div>
              <div style={{ fontWeight:700, color:C.text, marginBottom:6 }}>
                Tap any point on the body
              </div>
              <div style={{ fontSize:"0.72rem", color:C.muted, lineHeight:1.6 }}>
                The anatomical structure name auto-fills.<br/>
                Then record tenderness grade, tissue quality,<br/>
                temperature and clinical notes.
              </div>
            </div>
          )}

          {/* Pin list (when nothing selected) */}
          {!selPin && pins.length > 0 && (
            <div style={{ animation:"slideIn 0.2s ease" }}>
              <div style={{ fontSize:"0.65rem", fontWeight:700, color:C.muted,
                textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>
                Recorded Points — {pins.length}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {pins.map(pin => {
                  const gc = GRADE_COLOR[pin.tenderness] || C.border;
                  return (
                    <div key={pin.id} onClick={() => setSelected(pin.id)}
                      style={{ background:C.surface, border:`1px solid ${gc}50`,
                        borderRadius:10, padding:"9px 12px", cursor:"pointer",
                        display:"flex", alignItems:"flex-start", gap:9,
                        transition:"border-color 0.15s", borderLeft:`3px solid ${gc}` }}>
                      <div style={{ width:28, height:28, borderRadius:"50%",
                        background:`${gc}20`, border:`2px solid ${gc}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"0.7rem", fontWeight:900, color:gc, flexShrink:0 }}>
                        {pin.tenderness || "?"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:"0.78rem", color:C.text,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {pin.label}
                        </div>
                        <div style={{ fontSize:"0.62rem", color:C.muted, marginTop:2 }}>
                          {pin.side === "front" ? "Anterior" : "Posterior"}
                          {pin.temp ? ` · ${pin.temp}` : ""}
                          {(pin.texture || []).length > 0 ? ` · ${pin.texture.join(", ")}` : ""}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removePin(pin.id); }}
                        style={{ background:"none", border:"none", color:C.muted,
                          cursor:"pointer", fontSize:"0.72rem", padding:"0 3px", lineHeight:1 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected pin — findings panel */}
          {selPin && (
            <div style={{ animation:"slideIn 0.18s ease" }}>
              {/* Panel header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                marginBottom:10, gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%",
                      background:C.accent, boxShadow:`0 0 6px ${C.accent}` }}/>
                    <div style={{ fontSize:"0.62rem", color:C.muted,
                      textTransform:"uppercase", letterSpacing:"1px" }}>
                      {selPin.side === "front" ? "Anterior" : "Posterior"} Surface
                    </div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:"0.9rem", color:C.text, lineHeight:1.3 }}>
                    {selPin.label}
                  </div>
                </div>
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <button onClick={() => setSelected(null)}
                    style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${C.border}`,
                      background:"transparent", color:C.muted, fontSize:"0.62rem", cursor:"pointer" }}>
                    ← Back
                  </button>
                  <button onClick={() => removePin(selPin.id)}
                    style={{ padding:"4px 9px", borderRadius:7, border:`1px solid ${C.red}40`,
                      background:"rgba(255,77,109,0.08)", color:C.red, fontSize:"0.62rem", cursor:"pointer" }}>
                    Remove
                  </button>
                </div>
              </div>

              {/* Structures at this point */}
              <div style={{ background:C.s2, border:`1px solid ${C.border}`,
                borderRadius:9, padding:"9px 12px", marginBottom:12 }}>
                <div style={{ fontSize:"0.58rem", fontWeight:700, color:C.accent,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  🏗 Structures at this point
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {selPin.structures.map((s, i) => (
                    <span key={i} style={{ fontSize:"0.65rem", padding:"2px 8px", borderRadius:20,
                      background:C.s3, border:`1px solid ${C.border}`, color:C.text }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Tenderness Grade ── */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  Tenderness Grade (0 – 4+)
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {GRADES.map(g => (
                    <GradeChip key={g} value={g}
                      selected={selPin.tenderness === g}
                      onClick={() => updatePin(selPin.id, "tenderness", selPin.tenderness === g ? "" : g)}/>
                  ))}
                </div>
                {selPin.tenderness && (
                  <div style={{ marginTop:6, fontSize:"0.65rem", color:GRADE_COLOR[selPin.tenderness],
                    padding:"4px 9px", background:`${GRADE_COLOR[selPin.tenderness]}12`,
                    borderRadius:7, border:`1px solid ${GRADE_COLOR[selPin.tenderness]}30` }}>
                    {{
                      "0":"Grade 0 — No tenderness on firm palpation",
                      "1+":"Grade 1+ — Mild; patient reports pain, no grimace",
                      "2+":"Grade 2+ — Moderate; patient grimaces or withdraws",
                      "3+":"Grade 3+ — Severe; patient withdraws + verbalises",
                      "4+":"Grade 4+ — Excruciating; cannot tolerate palpation",
                    }[selPin.tenderness]}
                  </div>
                )}
              </div>

              {/* ── Tissue Temperature ── */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  Tissue Temperature (dorsum of hand)
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {TEMPS.map(t => {
                    const sel = selPin.temp === t;
                    const col = {"Normal":C.green,"Warm":C.yellow,"Hot":C.red,"Cool":"#38bdf8","Cold":"#0ea5e9"}[t];
                    return (
                      <button key={t} onClick={() => updatePin(selPin.id, "temp", sel ? "" : t)}
                        style={{ padding:"4px 10px", borderRadius:8, fontSize:"0.68rem", fontWeight:sel ? 700 : 400,
                          border:`1px solid ${sel ? col : C.border}`, background:sel ? `${col}18` : "transparent",
                          color:sel ? col : C.muted, cursor:"pointer", transition:"all 0.12s" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Tissue Quality ── */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  Tissue Quality (select all that apply)
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {TEXTURES.map(tex => {
                    const sel = (selPin.texture || []).includes(tex);
                    return (
                      <button key={tex} onClick={() => toggleTexture(selPin.id, tex)}
                        style={{ padding:"4px 10px", borderRadius:8, fontSize:"0.65rem", fontWeight:sel ? 700 : 400,
                          border:`1px solid ${sel ? C.a2 : C.border}`, background:sel ? "rgba(127,90,240,0.14)" : "transparent",
                          color:sel ? C.a2 : C.muted, cursor:"pointer", transition:"all 0.12s" }}>
                        {sel ? "✓ " : ""}{tex}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Bilateral comparison ── */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>
                  Bilateral Comparison
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  {["Symmetric","R > L","L > R","Unilateral only"].map(opt => {
                    const sel = selPin.bilateral === opt;
                    return (
                      <button key={opt} onClick={() => updatePin(selPin.id, "bilateral", sel ? "" : opt)}
                        style={{ flex:1, padding:"5px 4px", borderRadius:8, fontSize:"0.6rem",
                          fontWeight:sel ? 700 : 400, border:`1px solid ${sel ? C.a3 : C.border}`,
                          background:sel ? "rgba(0,201,122,0.12)" : "transparent",
                          color:sel ? C.a3 : C.muted, cursor:"pointer" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Clinical Notes ── */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>
                  Clinical Notes
                </div>
                <textarea
                  value={selPin.notes}
                  onChange={e => updatePin(selPin.id, "notes", e.target.value)}
                  placeholder={`Describe findings at ${selPin.label}:\ne.g. Moderate tenderness at supraspinatus critical zone, reproduction of patient's shoulder pain with deep palpation. Local twitch response present. Warm to touch R > L.`}
                  rows={3}
                  style={inp}
                />
              </div>

              {/* Mini summary */}
              {(selPin.tenderness || selPin.temp || (selPin.texture||[]).length > 0) && (
                <div style={{ padding:"9px 12px", background:C.s2, borderRadius:9,
                  border:`1px solid ${C.border}`, fontSize:"0.68rem", color:C.muted,
                  lineHeight:1.65 }}>
                  <span style={{ color:C.text, fontWeight:700 }}>Summary: </span>
                  {selPin.label}
                  {selPin.tenderness ? ` — Grade ${selPin.tenderness} tenderness` : ""}
                  {selPin.temp && selPin.temp !== "Normal" ? `, ${selPin.temp.toLowerCase()} to touch` : ""}
                  {(selPin.texture||[]).length > 0 ? `, ${selPin.texture.join(" / ").toLowerCase()}` : ""}
                  {selPin.bilateral ? `, ${selPin.bilateral}` : ""}.
                </div>
              )}

              {/* Navigate pins */}
              {pins.length > 1 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                  {(() => {
                    const idx = pins.findIndex(p => p.id === selPin.id);
                    const prev = pins[idx - 1];
                    const next = pins[idx + 1];
                    return <>
                      <button onClick={() => prev && setSelected(prev.id)}
                        style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                          background:"transparent", color:prev ? C.muted : "transparent",
                          fontSize:"0.65rem", cursor:prev ? "pointer" : "default" }}>
                        ← Prev
                      </button>
                      <span style={{ fontSize:"0.6rem", color:C.muted, alignSelf:"center" }}>
                        {idx + 1} / {pins.length}
                      </span>
                      <button onClick={() => next && setSelected(next.id)}
                        style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                          background:"transparent", color:next ? C.muted : "transparent",
                          fontSize:"0.65rem", cursor:next ? "pointer" : "default" }}>
                        Next →
                      </button>
                    </>;
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Full findings table ── */}
      {pins.length > 0 && (
        <div style={{ marginTop:16, background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`,
            fontSize:"0.72rem", fontWeight:700, color:C.text, display:"flex",
            justifyContent:"space-between", alignItems:"center" }}>
            📋 Palpation Summary — All Points
            <span style={{ color:C.muted, fontWeight:400, fontSize:"0.62rem" }}>
              {pins.filter(p => p.tenderness).length}/{pins.length} graded
            </span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.68rem" }}>
              <thead>
                <tr style={{ background:C.s2 }}>
                  {["Anatomical Point","Side","Grade","Temp","Tissue Quality","Bilateral","Notes"].map(h => (
                    <th key={h} style={{ padding:"7px 10px", textAlign:"left", color:C.muted,
                      fontWeight:700, fontSize:"0.6rem", textTransform:"uppercase",
                      letterSpacing:"0.8px", borderBottom:`1px solid ${C.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pins.map((pin, i) => {
                  const gc = GRADE_COLOR[pin.tenderness] || C.muted;
                  return (
                    <tr key={pin.id} onClick={() => setSelected(pin.id)}
                      style={{ cursor:"pointer", background:selected === pin.id ? C.s2 : "transparent",
                        borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"7px 10px", color:C.text, fontWeight:600 }}>{pin.label}</td>
                      <td style={{ padding:"7px 10px", color:C.muted }}>
                        {pin.side === "front" ? "Ant." : "Post."}
                      </td>
                      <td style={{ padding:"7px 10px" }}>
                        {pin.tenderness ? (
                          <span style={{ fontWeight:800, color:gc,
                            background:`${gc}18`, padding:"2px 7px", borderRadius:6 }}>
                            {pin.tenderness}
                          </span>
                        ) : <span style={{ color:C.border }}>—</span>}
                      </td>
                      <td style={{ padding:"7px 10px", color:C.muted }}>{pin.temp || "—"}</td>
                      <td style={{ padding:"7px 10px", color:C.muted }}>
                        {(pin.texture||[]).join(", ") || "—"}
                      </td>
                      <td style={{ padding:"7px 10px", color:C.muted }}>{pin.bilateral || "—"}</td>
                      <td style={{ padding:"7px 10px", color:C.muted, maxWidth:140,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {pin.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREATMENT TECHNIQUES MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function TreatmentTechniquesModule({ data, set }) {
  const PC = getC();
  const genId = () => Math.random().toString(36).slice(2, 9);

  const [techniques, setTechniques] = useState(() => {
    try { const v=data?.tx_techniques; return Array.isArray(v)?v:[]; } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState("manual");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 2800); };
  const save = (next) => { setTechniques(next); if(set) set("tx_techniques", next); };

  // ── Lookup tables ──────────────────────────────────────────────────────────
  const MAITLAND_GRADES = [
    { grade:"I",   desc:"Small amplitude, beginning of range — pain control, acute"},
    { grade:"II",  desc:"Large amplitude, within range (no resistance) — pain control"},
    { grade:"III", desc:"Large amplitude into resistance — stiffness/pain"},
    { grade:"IV",  desc:"Small amplitude into resistance — stiffness predominant"},
    { grade:"IV+", desc:"End range, high velocity — HVLAT manipulation"},
  ];
  const BODY_REGIONS = ["Cervical","Thoracic","Lumbar","Sacroiliac","Shoulder","Elbow","Wrist/Hand","Hip","Knee","Ankle/Foot","Rib","TMJ"];
  const MANUAL_TECHNIQUES = ["PA Central","PA Unilateral","AP","Transverse","Rotation","Traction","SNAG","NAG","Mulligan MWM","Quadrant","Combined technique"];
  const DN_MUSCLES = ["Upper trapezius","Levator scapulae","SCM","Infraspinatus","Supraspinatus","Subscapularis","Rhomboids","Erector spinae","Multifidus","QL","Gluteus maximus","Gluteus medius","Piriformis","TFL","Rectus femoris","Hamstrings","Gastrocnemius","Soleus","Tibialis anterior","Pectoralis minor","Pectoralis major","Scalenes","Suboccipitals"];
  const ST_TECHNIQUES = ["Deep tissue massage","Myofascial release","Trigger point release","Friction massage","IASTM","Cupping","Foam roller prescription","PNF stretching","Contract-relax stretching","Passive stretching"];
  const ULTRASOUND_MODES = ["Pulsed 20%","Pulsed 50%","Continuous"];
  const TAPING_TYPES = ["McConnell — Patellar medial glide","McConnell — Patellar tilt correction","McConnell — Patellar rotation","McConnell — Shoulder posture","Kinesio — Pain inhibition","Kinesio — Muscle facilitation","Kinesio — Muscle inhibition","Kinesio — Fascia correction","Kinesio — Lymphatic drainage","Rigid sports tape — ankle","Rigid sports tape — wrist","Rigid sports tape — AC joint","Zinc oxide — blister prevention","Leukotape — posture correction","Dynamic tape — load transfer"];
  const ELECTRO_TYPES = ["TENS — conventional (80–150Hz)","TENS — acupuncture-like (2–4Hz)","TENS — burst","IFT — 80–150Hz (pain)","IFT — 1–10Hz (muscle stim)","NMES — quadriceps","NMES — glutes","Russian stim","LASER — class 3B","LASER — class 4","Shockwave — radial","Shockwave — focused","Biofeedback EMG"];

  const inp = { width:"100%", background:PC.s3, border:`1px solid ${PC.border}`, borderRadius:8, color:PC.text, fontFamily:"inherit", outline:"none", padding:"7px 10px", fontSize:"0.75rem" };
  const sel = { ...inp };
  const ta  = { ...inp, resize:"vertical", minHeight:60 };
  const lbl = { fontSize:"0.6rem", fontWeight:700, color:PC.muted, display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.8px" };

  // ── Entry form state ───────────────────────────────────────────────────────
  const blank = { id:null, type:"manual", region:"", technique:"", grade:"", laterality:"", dosage:"", duration:"", response:"", notes:"", dn_muscle:"", dn_needles:"", dn_depth:"", dn_twitch:"", us_freq:"", us_intensity:"", us_mode:"", us_area:"", tape_type:"", tape_goal:"", st_technique:"", st_region:"", electro_type:"", electro_params:"" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const fset = (k,v) => setForm(p=>({...p,[k]:v}));

  const commitTechnique = () => {
    if (!form.type) { showToast("Select a technique type","warn"); return; }
    const entry = { ...form, id: form.id || genId(), savedAt: new Date().toISOString() };
    const next = form.id ? techniques.map(t=>t.id===form.id?entry:t) : [...techniques, entry];
    save(next); setForm(blank); setEditing(false);
    showToast(form.id ? "✅ Technique updated" : "✅ Technique recorded");
  };
  const deleteTechnique = (id) => { save(techniques.filter(t=>t.id!==id)); showToast("Deleted"); };
  const editEntry = (t) => { setForm({...blank,...t}); setEditing(true); setActiveTab(t.type||"manual"); };

  const TABS = [
    { key:"manual",   label:"Joint Mob", icon:"🦴" },
    { key:"dn",       label:"Dry Needling", icon:"🪡" },
    { key:"st",       label:"Soft Tissue", icon:"🤲" },
    { key:"taping",   label:"Taping", icon:"🩹" },
    { key:"us",       label:"Ultrasound", icon:"🔊" },
    { key:"electro",  label:"Electrotherapy", icon:"⚡" },
    { key:"other",    label:"Other", icon:"📋" },
  ];

  const renderForm = () => {
    switch(activeTab) {
      case "manual": return (
        <div style={{display:"grid",gap:8}}>
          <div className="pm-grid-2">
            <div><label style={lbl}>Region / Joint</label><select value={form.region} onChange={e=>fset("region",e.target.value)} style={sel}><option value="">— select —</option>{BODY_REGIONS.map(r=><option key={r}>{r}</option>)}</select></div>
            <div><label style={lbl}>Laterality</label><select value={form.laterality} onChange={e=>fset("laterality",e.target.value)} style={sel}><option value="">—</option>{["Left","Right","Bilateral","Central"].map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label style={lbl}>Technique</label><select value={form.technique} onChange={e=>fset("technique",e.target.value)} style={sel}><option value="">— select —</option>{MANUAL_TECHNIQUES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div>
            <label style={lbl}>Maitland Grade</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {MAITLAND_GRADES.map(g=>(
                <button key={g.grade} onClick={()=>fset("grade",g.grade)}
                  style={{padding:"5px 10px",borderRadius:8,fontSize:"0.68rem",fontWeight:form.grade===g.grade?800:500,border:`1px solid ${form.grade===g.grade?"rgba(0,229,255,0.6)":PC.border}`,background:form.grade===g.grade?"rgba(0,229,255,0.12)":"transparent",color:form.grade===g.grade?PC.accent:PC.muted,cursor:"pointer"}}>
                  {g.grade}
                </button>
              ))}
            </div>
            {form.grade && <div style={{marginTop:5,fontSize:"0.62rem",color:PC.muted,padding:"5px 9px",background:PC.s3,borderRadius:7}}>{MAITLAND_GRADES.find(g=>g.grade===form.grade)?.desc}</div>}
          </div>
          <div className="pm-grid-2">
            <div><label style={lbl}>Sets / Reps or Duration</label><input value={form.dosage} onChange={e=>fset("dosage",e.target.value)} placeholder="e.g. 3×30s, 60 oscillations" style={inp}/></div>
            <div><label style={lbl}>Duration in Session</label><input value={form.duration} onChange={e=>fset("duration",e.target.value)} placeholder="e.g. 5 min" style={inp}/></div>
          </div>
        </div>
      );
      case "dn": return (
        <div style={{display:"grid",gap:8}}>
          <div><label style={lbl}>Target Muscle</label><select value={form.dn_muscle} onChange={e=>fset("dn_muscle",e.target.value)} style={sel}><option value="">— select —</option>{DN_MUSCLES.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><label style={lbl}>Laterality</label><select value={form.laterality} onChange={e=>fset("laterality",e.target.value)} style={sel}><option value="">—</option>{["Left","Right","Bilateral"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="pm-grid-2">
            <div><label style={lbl}>No. of Needles</label><input type="number" value={form.dn_needles} onChange={e=>fset("dn_needles",e.target.value)} placeholder="e.g. 4" style={inp}/></div>
            <div><label style={lbl}>Needle Depth</label><input value={form.dn_depth} onChange={e=>fset("dn_depth",e.target.value)} placeholder="e.g. 30mm" style={inp}/></div>
          </div>
          <div><label style={lbl}>Local Twitch Response</label><select value={form.dn_twitch} onChange={e=>fset("dn_twitch",e.target.value)} style={sel}><option value="">—</option>{["Yes — elicited","Partial — some fibres","No — unable to elicit","Not applicable"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>Technique Notes</label><textarea value={form.notes} onChange={e=>fset("notes",e.target.value)} placeholder="Pistoning technique, retained 10min, e-stim attached..." style={ta}/></div>
        </div>
      );
      case "st": return (
        <div style={{display:"grid",gap:8}}>
          <div><label style={lbl}>Soft Tissue Technique</label><select value={form.st_technique} onChange={e=>fset("st_technique",e.target.value)} style={sel}><option value="">— select —</option>{ST_TECHNIQUES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={lbl}>Region / Structure</label><input value={form.st_region} onChange={e=>fset("st_region",e.target.value)} placeholder="e.g. upper trap, thoracic paraspinals" style={inp}/></div>
          <div className="pm-grid-2">
            <div><label style={lbl}>Laterality</label><select value={form.laterality} onChange={e=>fset("laterality",e.target.value)} style={sel}><option value="">—</option>{["Left","Right","Bilateral"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Duration</label><input value={form.duration} onChange={e=>fset("duration",e.target.value)} placeholder="e.g. 5 min" style={inp}/></div>
          </div>
          <div><label style={lbl}>Dosage / Parameters</label><input value={form.dosage} onChange={e=>fset("dosage",e.target.value)} placeholder="e.g. moderate pressure, 30s holds" style={inp}/></div>
        </div>
      );
      case "taping": return (
        <div style={{display:"grid",gap:8}}>
          <div><label style={lbl}>Taping Type / Pattern</label><select value={form.tape_type} onChange={e=>fset("tape_type",e.target.value)} style={sel}><option value="">— select —</option>{TAPING_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={lbl}>Laterality</label><select value={form.laterality} onChange={e=>fset("laterality",e.target.value)} style={sel}><option value="">—</option>{["Left","Right","Bilateral"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>Goal / Rationale</label><input value={form.tape_goal} onChange={e=>fset("tape_goal",e.target.value)} placeholder="e.g. medial patellar glide — PFPS pain reduction" style={inp}/></div>
          <div><label style={lbl}>Technique Notes</label><textarea value={form.notes} onChange={e=>fset("notes",e.target.value)} placeholder="Skin prep, tension %, anchor positions, strips used..." style={ta}/></div>
        </div>
      );
      case "us": return (
        <div style={{display:"grid",gap:8}}>
          <div className="pm-grid-2">
            <div><label style={lbl}>Frequency</label><select value={form.us_freq} onChange={e=>fset("us_freq",e.target.value)} style={sel}><option value="">—</option>{["1 MHz (deep — 3–5cm)","3 MHz (superficial — 1–2cm)"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Mode</label><select value={form.us_mode} onChange={e=>fset("us_mode",e.target.value)} style={sel}><option value="">—</option>{ULTRASOUND_MODES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="pm-grid-2">
            <div><label style={lbl}>Intensity (W/cm²)</label><input value={form.us_intensity} onChange={e=>fset("us_intensity",e.target.value)} placeholder="e.g. 1.0" style={inp}/></div>
            <div><label style={lbl}>Duration</label><input value={form.duration} onChange={e=>fset("duration",e.target.value)} placeholder="e.g. 5 min" style={inp}/></div>
          </div>
          <div><label style={lbl}>Treatment Area / Structure</label><input value={form.us_area} onChange={e=>fset("us_area",e.target.value)} placeholder="e.g. supraspinatus insertion, plantar fascia" style={inp}/></div>
        </div>
      );
      case "electro": return (
        <div style={{display:"grid",gap:8}}>
          <div><label style={lbl}>Modality</label><select value={form.electro_type} onChange={e=>fset("electro_type",e.target.value)} style={sel}><option value="">— select —</option>{ELECTRO_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="pm-grid-2">
            <div><label style={lbl}>Parameters</label><input value={form.electro_params} onChange={e=>fset("electro_params",e.target.value)} placeholder="e.g. freq, pulse width, intensity" style={inp}/></div>
            <div><label style={lbl}>Duration</label><input value={form.duration} onChange={e=>fset("duration",e.target.value)} placeholder="e.g. 20 min" style={inp}/></div>
          </div>
          <div><label style={lbl}>Electrode Placement / Region</label><input value={form.region} onChange={e=>fset("region",e.target.value)} placeholder="e.g. L4/L5 paraspinals, VMO" style={inp}/></div>
        </div>
      );
      default: return (
        <div style={{display:"grid",gap:8}}>
          <div><label style={lbl}>Technique / Intervention</label><input value={form.technique} onChange={e=>fset("technique",e.target.value)} placeholder="Describe technique" style={inp}/></div>
          <div><label style={lbl}>Region / Structure</label><input value={form.region} onChange={e=>fset("region",e.target.value)} placeholder="Body region or structure" style={inp}/></div>
          <div className="pm-grid-2">
            <div><label style={lbl}>Dosage</label><input value={form.dosage} onChange={e=>fset("dosage",e.target.value)} placeholder="Sets, reps, duration" style={inp}/></div>
            <div><label style={lbl}>Duration</label><input value={form.duration} onChange={e=>fset("duration",e.target.value)} placeholder="Time in session" style={inp}/></div>
          </div>
        </div>
      );
    }
  };

  const techniqueLabel = (t) => {
    if (t.type==="manual") return `${t.technique||"Joint mob"}${t.grade?` — Grade ${t.grade}`:""}${t.region?` (${t.region})`:""}`;
    if (t.type==="dn") return `Dry Needling — ${t.dn_muscle||"unknown muscle"}${t.laterality?` (${t.laterality})`:""}`;
    if (t.type==="st") return `${t.st_technique||"Soft tissue"}${t.st_region?` — ${t.st_region}`:""}`;
    if (t.type==="taping") return `${t.tape_type||"Taping"}${t.laterality?` (${t.laterality})`:""}`;
    if (t.type==="us") return `Ultrasound${t.us_freq?` — ${t.us_freq}`:""}${t.us_area?` / ${t.us_area}`:""}`;
    if (t.type==="electro") return `${t.electro_type||"Electrotherapy"}`;
    return t.technique || "Other";
  };

  const typeIcon = (type) => ({manual:"🦴",dn:"🪡",st:"🤲",taping:"🩹",us:"🔊",electro:"⚡",other:"📋"}[type]||"📋");
  const typeColor = (type) => ({manual:PC.accent,dn:"#7f5af0",st:PC.green,taping:"#ffb300",us:"#00c97a",electro:"#ff4d6d",other:PC.muted}[type]||PC.muted);

  return (
    <div>
      {/* Toast */}
      {toast && <div style={{position:"fixed",top:70,right:16,zIndex:999,padding:"9px 16px",background:toast.type==="success"?"rgba(0,201,122,0.9)":"rgba(255,179,0,0.9)",borderRadius:10,color:"#000",fontWeight:700,fontSize:"0.78rem",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{toast.msg}</div>}

      {/* ── Technique Entry Form ── */}
      <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:14,padding:"14px",marginBottom:14}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
          {editing?"✏️ Edit Technique":"➕ Add Treatment Technique"}
        </div>

        {/* Type tabs */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{setActiveTab(t.key);fset("type",t.key);}}
              style={{padding:"5px 10px",borderRadius:8,fontSize:"0.62rem",fontWeight:activeTab===t.key?800:500,border:`1px solid ${activeTab===t.key?typeColor(t.key)+"60":PC.border}`,background:activeTab===t.key?`${typeColor(t.key)}18`:"transparent",color:activeTab===t.key?typeColor(t.key):PC.muted,cursor:"pointer"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {renderForm()}

        {/* Patient response + notes (always shown) */}
        <div style={{display:"grid",gap:8,marginTop:8}}>
          <div><label style={lbl}>Patient Response During Technique</label><textarea value={form.response} onChange={e=>fset("response",e.target.value)} placeholder="e.g. pain reproduction +, ROM improved, comfortable" style={ta}/></div>
          {activeTab!=="dn"&&activeTab!=="taping"&&<div><label style={lbl}>Additional Notes</label><textarea value={form.notes} onChange={e=>fset("notes",e.target.value)} placeholder="Any extra clinical notes for this technique" style={{...ta,minHeight:44}}/></div>}
        </div>

        <div style={{display:"flex",gap:7,marginTop:10}}>
          <button onClick={commitTechnique}
            style={{flex:1,padding:"10px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#000",fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
            {editing?"💾 Update":"+ Add Technique"}
          </button>
          {editing&&<button onClick={()=>{setForm(blank);setEditing(false);}}
            style={{padding:"10px 14px",background:"transparent",border:`1px solid ${PC.border}`,borderRadius:9,color:PC.muted,fontSize:"0.75rem",cursor:"pointer"}}>
            Cancel
          </button>}
        </div>
      </div>

      {/* ── Recorded Techniques ── */}
      {techniques.length>0&&(
        <div>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
            📌 Techniques This Session ({techniques.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {techniques.map(t=>(
              <div key={t.id} style={{background:PC.surface,border:`1px solid ${typeColor(t.type)}30`,borderRadius:11,overflow:"hidden"}}>
                <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:"1.1rem"}}>{typeIcon(t.type)}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{techniqueLabel(t)}</div>
                    {t.dosage&&<div style={{fontSize:"0.62rem",color:PC.muted,marginTop:1}}>{t.dosage}{t.duration?` · ${t.duration}`:""}</div>}
                    {t.response&&<div style={{marginTop:4,fontSize:"0.65rem",color:PC.a3,lineHeight:1.4}}>↳ {t.response}</div>}
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    <button onClick={()=>editEntry(t)} style={{background:`${typeColor(t.type)}15`,border:`1px solid ${typeColor(t.type)}40`,borderRadius:6,color:typeColor(t.type),cursor:"pointer",fontSize:"0.6rem",padding:"3px 8px",fontWeight:700}}>✏️</button>
                    <button onClick={()=>deleteTechnique(t.id)} style={{background:"none",border:"none",color:"rgba(255,77,109,0.5)",cursor:"pointer",fontSize:"0.7rem",padding:"3px 5px"}}>✕</button>
                  </div>
                </div>
                {t.notes&&<div style={{padding:"6px 12px 8px",borderTop:`1px solid ${PC.border}`,fontSize:"0.62rem",color:PC.muted,fontStyle:"italic"}}>{t.notes}</div>}
              </div>
            ))}
          </div>
          <button onClick={()=>{save([]);showToast("Cleared all techniques");}}
            style={{marginTop:10,width:"100%",padding:"8px",background:"transparent",border:`1px solid rgba(255,77,109,0.3)`,borderRadius:9,color:"rgba(255,77,109,0.7)",fontSize:"0.7rem",cursor:"pointer"}}>
            🗑 Clear All Techniques
          </button>
        </div>
      )}
      {techniques.length===0&&(
        <div style={{textAlign:"center",padding:"24px",color:PC.muted,fontSize:"0.76rem"}}>No techniques recorded yet — add your first above.</div>
      )}

      {/* ── Maitland Grade Reference ── */}
      <div style={{marginTop:14,background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"13px"}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:9}}>📚 Maitland Grade Reference</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {MAITLAND_GRADES.map(g=>(
            <div key={g.grade} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"6px 10px",background:PC.s3,borderRadius:8}}>
              <span style={{fontWeight:800,fontSize:"0.78rem",color:PC.accent,flexShrink:0,minWidth:28}}>G{g.grade}</span>
              <span style={{fontSize:"0.68rem",color:PC.text,lineHeight:1.5}}>{g.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREATMENT SESSION LOG MODULE
// ═══════════════════════════════════════════════════════════════════════════════

function TreatmentSessionLogModule({ data, set }) {
  const PC = getC();
  const genId = () => Math.random().toString(36).slice(2, 9);

  const [sessions, setSessions] = useState(() => {
    try { const v=data?.tx_sessions; return Array.isArray(v)?v:[]; } catch { return []; }
  });

  // Auto-derive techniques summary from tx_techniques in shared data
  const autoTechniques = useMemo(() => {
    const txArr = Array.isArray(data?.tx_techniques) ? data.tx_techniques : [];
    if (!txArr.length) return "";
    return txArr.map(t => {
      if (t.type==="manual") return `${t.technique||"Joint mob"}${t.grade?` Grade ${t.grade}`:""}${t.region?` (${t.region})`:""}${t.laterality?` — ${t.laterality}`:""}`;
      if (t.type==="dn") return `Dry needling — ${t.dn_muscle||""}${t.laterality?` (${t.laterality})`:""}${t.dn_needles?`, ${t.dn_needles} needles`:""}`;
      if (t.type==="st") return `${t.st_technique||"Soft tissue"}${t.st_region?` — ${t.st_region}`:""}`;
      if (t.type==="taping") return `${t.tape_type||"Taping"}${t.laterality?` (${t.laterality})`:""}`;
      if (t.type==="us") return `Ultrasound${t.us_freq?` ${t.us_freq}`:""}${t.us_area?` — ${t.us_area}`:""}`;
      if (t.type==="electro") return t.electro_type||"Electrotherapy";
      return t.technique||"Other";
    }).join("; ");
  }, [data?.tx_techniques]);

  // Auto-derive HEP summary from hep_programme in shared data
  const autoHEP = useMemo(() => {
    const hep = Array.isArray(data?.hep_programme) ? data.hep_programme : [];
    if (!hep.length) return "";
    return hep.map(ex => `${ex.name} — ${ex.customSets}×${ex.customReps}, hold ${ex.customHold}s, ${ex.customFreq}`).join("; ");
  }, [data?.hep_programme]);

  const blankForm = () => ({
    id:null,
    date:new Date().toLocaleDateString("en-GB"),
    sessionNo:"",
    type:"",
    vasStart:"",
    vasEnd:"",
    treatmentGiven:"",
    techniques: autoTechniques,
    hep: autoHEP,
    response:"",
    nextPlan:"",
    goals:"",
    clinician:"",
    notes:""
  });
  const [form, setForm] = useState(blankForm);
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);

  // Keep techniques/HEP fields in form updated when data changes (unless already editing an old session)
  useEffect(() => {
    if (!editing) {
      setForm(f => ({ ...f, techniques: autoTechniques, hep: autoHEP }));
    }
  }, [autoTechniques, autoHEP, editing]);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2800); };
  const save = (next) => { setSessions(next); if(set) set("tx_sessions", next); };
  const fset = (k,v) => setForm(p=>({...p,[k]:v}));

  const inp = { width:"100%", background:PC.s3, border:`1px solid ${PC.border}`, borderRadius:8, color:PC.text, fontFamily:"inherit", outline:"none", padding:"7px 10px", fontSize:"0.75rem" };
  const ta  = { ...inp, resize:"vertical", minHeight:70 };
  const lbl = { fontSize:"0.6rem", fontWeight:700, color:PC.muted, display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.8px" };

  const SESSION_TYPES = ["Initial Assessment","Follow-up Treatment","Review Session","Discharge","Pre-competition","Post-surgical","Telehealth","Group Class"];
  const TX_CATEGORIES = ["Manual therapy","Joint mobilisation","Manipulation","Dry needling","Soft tissue massage","Ultrasound","TENS/IFT","Exercise therapy","Hydrotherapy","Taping/strapping","Education & advice","Postural correction","Neural mobilisation","Other"];

  const vasColor = (v) => { const n=parseInt(v); return isNaN(n)?"#6b8399":n>=7?"#ff4d6d":n>=4?"#ffb300":"#00c97a"; };
  const vasChange = (s, e) => { const ns=parseInt(s), ne=parseInt(e); if(isNaN(ns)||isNaN(ne)) return null; return ne-ns; };

  const commit = () => {
    const entry = { ...form, id: form.id||genId(), savedAt: new Date().toISOString() };
    const next = form.id ? sessions.map(s=>s.id===form.id?entry:s) : [entry,...sessions];
    save(next); setForm(blankForm()); setEditing(false);
    showToast(form.id?"✅ Session updated":"✅ Session logged");
  };

  const deleteSession = (id) => { save(sessions.filter(s=>s.id!==id)); showToast("Session deleted"); };
  const editSession = (s) => { setForm({...blankForm(),...s}); setEditing(true); setExpanded(null); };

  return (
    <div>
      {toast && <div style={{position:"fixed",top:70,right:16,zIndex:999,padding:"9px 16px",background:"rgba(0,201,122,0.9)",borderRadius:10,color:"#000",fontWeight:700,fontSize:"0.78rem",boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{toast.msg}</div>}

      {/* ── Session Entry Form ── */}
      <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:14,padding:"14px",marginBottom:14}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
          {editing?"✏️ Edit Session Log":"📋 Log Treatment Session"}
        </div>

        {/* Auto-pull banner */}
        {!editing&&(autoTechniques||autoHEP)&&(
          <div style={{marginBottom:10,padding:"8px 11px",background:"rgba(0,201,122,0.07)",border:"1px solid rgba(0,201,122,0.25)",borderRadius:9,fontSize:"0.65rem",color:PC.green,lineHeight:1.6}}>
            <span style={{fontWeight:700}}>🔗 Auto-synced from this session:</span>
            {autoTechniques&&<div style={{marginTop:3}}>🦴 <b>Techniques:</b> {autoTechniques}</div>}
            {autoHEP&&<div style={{marginTop:2}}>🏋 <b>HEP:</b> {autoHEP}</div>}
          </div>
        )}

        {/* Row 1: date, session no, type */}
        <div className="pm-grid-3" style={{marginBottom:8}}>
          <div><label style={lbl}>Date</label><input value={form.date} onChange={e=>fset("date",e.target.value)} placeholder="DD/MM/YYYY" style={inp}/></div>
          <div><label style={lbl}>Session #</label><input type="number" value={form.sessionNo} onChange={e=>fset("sessionNo",e.target.value)} placeholder="e.g. 3" style={inp}/></div>
          <div><label style={lbl}>Session Type</label><select value={form.type} onChange={e=>fset("type",e.target.value)} style={inp}><option value="">— type —</option>{SESSION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        </div>

        {/* VAS */}
        <div className="pm-grid-2" style={{marginBottom:8}}>
          <div>
            <label style={lbl}>Pain at Start (VAS 0–10)</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min={0} max={10} value={form.vasStart||0} onChange={e=>fset("vasStart",e.target.value)} style={{flex:1,accentColor:vasColor(form.vasStart)}}/>
              <span style={{fontSize:"1rem",fontWeight:800,color:vasColor(form.vasStart),minWidth:20}}>{form.vasStart||0}</span>
            </div>
          </div>
          <div>
            <label style={lbl}>Pain at End (VAS 0–10)</label>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min={0} max={10} value={form.vasEnd||0} onChange={e=>fset("vasEnd",e.target.value)} style={{flex:1,accentColor:vasColor(form.vasEnd)}}/>
              <span style={{fontSize:"1rem",fontWeight:800,color:vasColor(form.vasEnd),minWidth:20}}>{form.vasEnd||0}</span>
            </div>
          </div>
        </div>
        {(form.vasStart||form.vasEnd)&&(()=>{const ch=vasChange(form.vasStart,form.vasEnd);return ch!==null?<div style={{marginBottom:8,padding:"6px 10px",background:ch<0?"rgba(0,201,122,0.1)":ch>0?"rgba(255,77,109,0.1)":"rgba(255,179,0,0.1)",border:`1px solid ${ch<0?"rgba(0,201,122,0.3)":ch>0?"rgba(255,77,109,0.3)":"rgba(255,179,0,0.3)"}`,borderRadius:8,fontSize:"0.68rem",fontWeight:700,color:ch<0?PC.green:ch>0?PC.red:PC.yellow}}>VAS change: {ch>0?"+":""}{ch} — {ch<0?"✅ Improved":ch>0?"⚠️ Increased":"→ No change"}</div>:null;})()}

        {/* Treatment given */}
        <div style={{marginBottom:8}}>
          <label style={lbl}>Treatment Given Today</label>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            {TX_CATEGORIES.map(c=>{
              const sel=(form.techniques||"").split(",").map(s=>s.trim()).includes(c);
              return <button key={c} onClick={()=>{const arr=(form.techniques||"").split(",").map(s=>s.trim()).filter(Boolean);const next=sel?arr.filter(x=>x!==c):[...arr,c];fset("techniques",next.join(", "));}}
                style={{padding:"3px 9px",borderRadius:7,fontSize:"0.6rem",fontWeight:sel?700:400,border:`1px solid ${sel?"rgba(0,229,255,0.5)":PC.border}`,background:sel?"rgba(0,229,255,0.12)":"transparent",color:sel?PC.accent:PC.muted,cursor:"pointer"}}>{c}</button>;
            })}
          </div>
          <textarea value={form.treatmentGiven} onChange={e=>fset("treatmentGiven",e.target.value)} placeholder="Describe treatment in detail — techniques, grades, parameters, regions treated..." style={ta}/>
        </div>

        {/* Techniques detail (auto-pulled, editable) */}
        <div style={{marginBottom:8}}>
          <label style={{...lbl,color:PC.accent}}>Techniques Detail <span style={{fontWeight:400,color:PC.muted,textTransform:"none",letterSpacing:0}}>(auto-filled from Tx Techniques tab)</span></label>
          <textarea value={form.techniques} onChange={e=>fset("techniques",e.target.value)} placeholder="Auto-filled from Tx Techniques tab — edit if needed" style={{...ta,minHeight:50,borderColor:autoTechniques?"rgba(0,229,255,0.3)":PC.border}}/>
        </div>

        {/* HEP (auto-pulled, editable) */}
        <div style={{marginBottom:8}}>
          <label style={{...lbl,color:"#7f5af0"}}>Home Exercise Programme <span style={{fontWeight:400,color:PC.muted,textTransform:"none",letterSpacing:0}}>(auto-filled from Exercise tab)</span></label>
          <textarea value={form.hep} onChange={e=>fset("hep",e.target.value)} placeholder="Auto-filled from Exercise Prescription tab — edit if needed" style={{...ta,minHeight:50,borderColor:autoHEP?"rgba(127,90,240,0.3)":PC.border}}/>
        </div>

        {/* Response & plan */}
        <div style={{display:"grid",gap:8,marginBottom:8}}>
          <div><label style={lbl}>Patient Response During Session</label><textarea value={form.response} onChange={e=>fset("response",e.target.value)} placeholder="ROM change, pain behaviour, neurological response, exercise tolerance, functional improvement..." style={ta}/></div>
          <div><label style={lbl}>Plan for Next Session</label><textarea value={form.nextPlan} onChange={e=>fset("nextPlan",e.target.value)} placeholder="Progress to Grade III/IV, add loading, reassess ROM, introduce HEP phase 2..." style={ta}/></div>
          <div><label style={lbl}>Goals / Progress Toward Goals</label><textarea value={form.goals} onChange={e=>fset("goals",e.target.value)} placeholder="Short-term goals, barriers, patient engagement..." style={{...ta,minHeight:50}}/></div>
        </div>

        <div className="pm-grid-2" style={{marginBottom:8}}>
          <div><label style={lbl}>Clinician</label><input value={form.clinician} onChange={e=>fset("clinician",e.target.value)} placeholder="Treating physiotherapist" style={inp}/></div>
          <div><label style={lbl}>Other Notes</label><input value={form.notes} onChange={e=>fset("notes",e.target.value)} placeholder="Consent, co-morbidities, referral..." style={inp}/></div>
        </div>

        <div style={{display:"flex",gap:7}}>
          <button onClick={commit}
            style={{flex:1,padding:"11px",background:`linear-gradient(135deg,${PC.a3},${PC.accent})`,border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:"0.82rem",cursor:"pointer"}}>
            {editing?"💾 Update Session":"✅ Save Session Log"}
          </button>
          {editing&&<button onClick={()=>{setForm(blankForm());setEditing(false);}}
            style={{padding:"11px 14px",background:"transparent",border:`1px solid ${PC.border}`,borderRadius:10,color:PC.muted,fontSize:"0.75rem",cursor:"pointer"}}>Cancel</button>}
        </div>
      </div>

      {/* ── Session History ── */}
      {sessions.length>0&&(
        <div>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:9}}>
            🗂 Session History ({sessions.length})
          </div>
          {sessions.map((s,idx)=>{
            const ch=vasChange(s.vasStart,s.vasEnd);
            const isOpen=expanded===s.id;
            return (
              <div key={s.id} style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,marginBottom:7,overflow:"hidden"}}>
                {/* Card header */}
                <div onClick={()=>setExpanded(isOpen?null:s.id)} style={{padding:"11px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:32,height:32,borderRadius:9,background:`rgba(0,229,255,0.1)`,border:`1px solid rgba(0,229,255,0.25)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.72rem",fontWeight:900,color:PC.accent}}>#{s.sessionNo||idx+1}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{s.date} — {s.type||"Treatment"}</div>
                    <div style={{fontSize:"0.62rem",color:PC.muted,marginTop:1}}>{s.clinician||""}{s.techniques?` · ${s.techniques.split(",").slice(0,2).join(", ")}${s.techniques.split(",").length>2?" +more":""}`:""}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    {ch!==null&&<span style={{fontSize:"0.65rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:ch<0?"rgba(0,201,122,0.12)":ch>0?"rgba(255,77,109,0.12)":"rgba(255,179,0,0.1)",color:ch<0?PC.green:ch>0?PC.red:PC.yellow}}>{ch>0?"+":""}{ch} VAS</span>}
                    <span style={{color:PC.muted,fontSize:"0.65rem"}}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen&&(
                  <div style={{padding:"0 13px 13px",borderTop:`1px solid ${PC.border}`}}>
                    {s.treatmentGiven&&<div style={{marginTop:10}}><div style={{fontSize:"0.58rem",fontWeight:700,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Treatment Given</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6,background:PC.s3,borderRadius:8,padding:"8px 11px"}}>{s.treatmentGiven}</div></div>}
                    {s.response&&<div style={{marginTop:8}}><div style={{fontSize:"0.58rem",fontWeight:700,color:PC.green,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Patient Response</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6,background:"rgba(0,201,122,0.06)",border:"1px solid rgba(0,201,122,0.2)",borderRadius:8,padding:"8px 11px"}}>{s.response}</div></div>}
                    {s.nextPlan&&<div style={{marginTop:8}}><div style={{fontSize:"0.58rem",fontWeight:700,color:PC.a2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Next Session Plan</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6,background:"rgba(127,90,240,0.06)",border:"1px solid rgba(127,90,240,0.2)",borderRadius:8,padding:"8px 11px"}}>{s.nextPlan}</div></div>}
                    {s.goals&&<div style={{marginTop:8}}><div style={{fontSize:"0.58rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Goals</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6}}>{s.goals}</div></div>}
                    {s.notes&&<div style={{marginTop:6,fontSize:"0.65rem",color:PC.muted,fontStyle:"italic"}}>{s.notes}</div>}
                    <div style={{display:"flex",gap:6,marginTop:10}}>
                      <button onClick={()=>editSession(s)} style={{padding:"6px 12px",background:`${PC.accent}15`,border:`1px solid ${PC.accent}40`,borderRadius:7,color:PC.accent,fontSize:"0.65rem",fontWeight:700,cursor:"pointer"}}>✏️ Edit</button>
                      <button onClick={()=>deleteSession(s.id)} style={{padding:"6px 10px",background:"rgba(255,77,109,0.08)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:7,color:"#ff4d6d",fontSize:"0.65rem",cursor:"pointer"}}>🗑 Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {sessions.length===0&&(
        <div style={{textAlign:"center",padding:"24px",color:PC.muted,fontSize:"0.76rem"}}>No sessions logged yet — complete the form above to record your first treatment session.</div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// LIVE SOAP PANEL — Real-time floating clinical documentation
// Reads data from all assessment tabs and auto-builds SOAP in real time.
// Always visible as a collapsible floating panel anchored bottom-right.
// No navigation required — works on top of any assessment module.
// ══════════════════════════════════════════════════════════════════════════════

function LiveSOAPPanel({ data, onNavigate }) {
  const [open,    setOpen]    = React.useState(false);
  const [tab,     setTab]     = React.useState("S");   // "S" | "O" | "A" | "P"
  const [copied,  setCopied]  = React.useState(null);
  const [minimal, setMinimal] = React.useState(false); // compact pill mode

  // Build SOAP in real time — only when panel is open (perf)
  const soap = React.useMemo(() => {
    if (!open) return null;
    return buildRealtimeSOAP(data);
  }, [data, open]);

  // Count filled fields per section for live badges
  const sectionCounts = React.useMemo(() => {
    const allKeys = Object.keys(data).filter(k => data[k] && String(data[k]).trim());
    const KNOWN_PX = ["cx","lx","shl","shr","hp","knl","knr","af","ew","tx"];
    const hasRegional = allKeys.some(k => KNOWN_PX.some(px => k.startsWith(px + "_")));
    const subjectiveKeys = ["cc_main","cc_vas_now","cc_quality","dem_name",
      "cc_duration","cc_onset"];
    const vk = (k) => !!(data[k] && String(data[k]).trim());
    const sCount = subjectiveKeys.filter(vk).length + (hasRegional ? Math.min(allKeys.filter(k => KNOWN_PX.some(px=>k.startsWith(px+"_"))).length, 8) : 0);
    const oCount = allKeys.filter(k =>
      k.startsWith("rom_") || k.startsWith("mmt_") || k.startsWith("st_") ||
      k.startsWith("gait_") || k.startsWith("post_") || k.startsWith("palp_") || k.startsWith("om_")
    ).length;
    const aCount = (vk("cc_main") || hasRegional) ? 1 : 0;
    const pCount = (data["tx_techniques"] || data["hep_programme"] || data["tx_frequency"]) ? 1 : 0;
    return { S: sCount, O: Math.min(oCount, 20), A: aCount, P: pCount };
  }, [data]);

  const totalFilled = sectionCounts.S + sectionCounts.O + sectionCounts.A;
  const hasContent  = totalFilled > 0;

  const copySection = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    });
    setCopied(tab);
    setTimeout(() => setCopied(null), 1800);
  };

  const exportPDF = () => {
    if (!soap) return;
    const patName = String(data["dem_name"] || "Patient").replace(/[^a-zA-Z0-9 ]/g,"").trim();
    const date    = new Date().toLocaleDateString("en-AU");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>SOAP Note — ${patName}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1025; line-height: 1.6; }
  h1 { color: #7c3aed; font-size: 1.4rem; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
  h2 { font-size: 1rem; color: #7c3aed; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
  pre { background: #f5f0fb; padding: 12px 16px; border-radius: 8px; white-space: pre-wrap; font-size: 0.82rem; font-family: inherit; }
  .meta { font-size: 0.8rem; color: #7e6a9a; margin-bottom: 24px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>SOAP Note — ${patName}</h1>
<div class="meta">Date: ${date} · Auto-generated from PhysioMaster assessment</div>
<h2>S — Subjective</h2><pre>${(soap.S||"").replace(/</g,"&lt;")}</pre>
<h2>O — Objective</h2><pre>${(soap.O||"").replace(/</g,"&lt;")}</pre>
<h2>A — Assessment</h2><pre>${(soap.A||"").replace(/</g,"&lt;")}</pre>
<h2>P — Plan</h2><pre>${(soap.P||"").replace(/</g,"&lt;")}</pre>
</body></html>`;
    const w = window.open("","_blank","width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
  };

  const SECTION_LABELS = {
    S: { label:"Subjective", col:"#9333ea", icon:"💬" },
    O: { label:"Objective",  col:"#0891b2", icon:"📋" },
    A: { label:"Assessment", col:"#059669", icon:"🧠" },
    P: { label:"Plan",       col:"#d97706", icon:"📝" },
  };

  const currentSec = SECTION_LABELS[tab];
  const currentText = soap ? soap[tab] : null;

  // ── Minimal pill (when closed) ───────────────────────────────────────────
  const pillStyle = {
    position:"fixed", bottom:24, right:16, zIndex:9999,
    display:"flex", alignItems:"center", gap:8,
    background:"linear-gradient(135deg,#7c3aed,#9333ea)",
    border:"none", borderRadius:24, padding:"10px 16px",
    color:"#fff", cursor:"pointer", boxShadow:"0 4px 20px rgba(124,58,237,0.4)",
    fontSize:"0.72rem", fontWeight:800, letterSpacing:"0.3px",
    transition:"all 0.2s",
  };

  if (!open) {
    const isMobilePill = typeof window !== "undefined" && window.innerWidth <= 480;
    const mobilePillStyle = isMobilePill ? {
      position:"fixed", bottom:0, left:0, right:0, zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      background:"linear-gradient(135deg,#7c3aed,#9333ea)",
      border:"none", borderTop:"2px solid rgba(255,255,255,0.15)",
      borderRadius:"12px 12px 0 0",
      padding:"12px 20px",
      color:"#fff", cursor:"pointer",
      boxShadow:"0 -4px 20px rgba(124,58,237,0.35)",
      fontSize:"0.8rem", fontWeight:800, letterSpacing:"0.3px",
    } : pillStyle;

    return (
      <button onClick={()=>setOpen(true)} style={mobilePillStyle} title="Open Live SOAP Panel">
        <span style={{fontSize:isMobilePill?"1.1rem":"1rem"}}>📋</span>
        <span>Live SOAP</span>
        {hasContent && (
          <span style={{
            background:"rgba(255,255,255,0.25)", borderRadius:10,
            padding:"2px 8px", fontSize:"0.65rem", fontWeight:800
          }}>{totalFilled} fields</span>
        )}
      </button>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────
  // Detect mobile: screen width <= 480px
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 480;

  return (
    <div style={{
      position:"fixed", bottom:0, right:0, zIndex:9999,
      // Mobile: full width, max 72vh so header is always visible
      // Desktop: fixed 380px wide
      width: isMobile ? "100vw" : (minimal ? 260 : 380),
      maxHeight: isMobile ? "72vh" : "92vh",
      display:"flex", flexDirection:"column",
      background:"#ffffff",
      border:"1px solid rgba(124,58,237,0.2)",
      borderBottom:"none",
      borderRadius: isMobile ? "16px 16px 0 0" : "16px 16px 0 0",
      boxShadow:"0 -4px 32px rgba(124,58,237,0.18)",
      overflow:"hidden",
      transition:"width 0.2s, max-height 0.2s",
      left: isMobile ? 0 : "auto",
    }}>

      {/* ── Drag handle (mobile only) — tap to close ─────────────────────── */}
      {isMobile && (
        <div onClick={()=>setOpen(false)} style={{
          display:"flex", justifyContent:"center", alignItems:"center",
          padding:"8px 0 4px",
          background:"linear-gradient(135deg,#7c3aed,#9333ea)",
          cursor:"pointer", flexShrink:0,
        }}>
          <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.5)"}}/>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        background:"linear-gradient(135deg,#7c3aed,#9333ea)",
        padding: isMobile ? "8px 14px" : "10px 14px",
        display:"flex", alignItems:"center", gap:8,
        flexShrink:0,
      }}>
        <span style={{fontSize:"1rem"}}>📋</span>
        <span style={{flex:1, fontSize:"0.75rem", fontWeight:800, color:"#fff", letterSpacing:"0.3px"}}>
          Live SOAP
        </span>
        {/* Live indicator */}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{
            width:6,height:6,borderRadius:"50%",
            background:"#4ade80",
            boxShadow:"0 0 6px #4ade80",
            animation:"pulse 2s infinite"
          }}/>
          <span style={{fontSize:"0.58rem",color:"rgba(255,255,255,0.8)",fontWeight:700}}>LIVE</span>
        </div>
        {!isMobile && (
          <button onClick={()=>setMinimal(m=>!m)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"#fff",padding:"3px 7px",cursor:"pointer",fontSize:"0.6rem",fontWeight:700}}>
            {minimal?"⬆":"⬇"}
          </button>
        )}
        <button onClick={()=>setOpen(false)} style={{
          background:"rgba(255,255,255,0.2)", border:"none", borderRadius:6,
          color:"#fff", padding: isMobile ? "5px 10px" : "3px 8px",
          cursor:"pointer", fontSize: isMobile ? "0.9rem" : "0.7rem", fontWeight:700,
          minWidth: isMobile ? 36 : "auto", minHeight: isMobile ? 36 : "auto",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          ✕
        </button>
      </div>

      {/* ── Section tabs ─────────────────────────────────────────────────── */}
      <div style={{
        display:"flex", borderBottom:"1px solid rgba(124,58,237,0.12)",
        background:"#faf5ff", flexShrink:0,
      }}>
        {Object.entries(SECTION_LABELS).map(([key,sec]) => {
          const count = sectionCounts[key];
          const active = tab===key;
          return (
            <button key={key} onClick={()=>setTab(key)} style={{
              flex:1, padding:"8px 4px", border:"none", cursor:"pointer",
              background:active ? "#fff" : "transparent",
              borderBottom: active ? `2px solid ${sec.col}` : "2px solid transparent",
              display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              transition:"all 0.15s",
            }}>
              <span style={{fontSize:"0.7rem"}}>{sec.icon}</span>
              <span style={{fontSize:"0.6rem",fontWeight:active?800:600,color:active?sec.col:"#7e6a9a"}}>{key}</span>
              {count > 0 && (
                <span style={{
                  fontSize:"0.5rem",fontWeight:800,
                  background:sec.col+"15",color:sec.col,
                  padding:"0px 5px",borderRadius:8
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      {!minimal && (
        <div style={{
          flex:1, overflowY:"auto",
          padding:"12px 14px",
          background:"#fff",
        }}>
          {/* Section title */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            marginBottom:10,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:"0.9rem"}}>{currentSec.icon}</span>
              <span style={{fontSize:"0.72rem",fontWeight:800,color:currentSec.col,letterSpacing:"0.5px",textTransform:"uppercase"}}>
                {currentSec.label}
              </span>
            </div>
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>copySection(currentText)} style={{
                padding:"3px 8px",background:"transparent",
                border:`1px solid ${currentSec.col}33`,
                borderRadius:6,color:currentSec.col,
                cursor:"pointer",fontSize:"0.58rem",fontWeight:700,
              }}>
                {copied===tab ? "✅ Copied" : "📋 Copy"}
              </button>
            </div>
          </div>

          {/* SOAP text */}
          {currentText ? (
            <div style={{
              fontSize:"0.67rem", color:"#1a1025",
              lineHeight:1.65, whiteSpace:"pre-wrap",
              background:"#faf5ff", borderRadius:8,
              padding:"10px 12px",
              border:"1px solid rgba(124,58,237,0.1)",
              fontFamily:"'Segoe UI',system-ui,sans-serif",
            }}>
              {currentText}
            </div>
          ) : (
            <div style={{
              textAlign:"center",padding:"24px 12px",
              color:"#7e6a9a",fontSize:"0.68rem",lineHeight:1.6,
            }}>
              <div style={{fontSize:"1.5rem",marginBottom:8}}>
                {tab==="S"?"💬":tab==="O"?"📊":tab==="A"?"🧠":"📝"}
              </div>
              <div style={{fontWeight:600,marginBottom:4}}>
                {tab==="S" ? "Complete the Subjective Assessment" :
                 tab==="O" ? "Perform assessments to auto-fill Objective" :
                 tab==="A" ? "Assessment generates after findings are entered" :
                 "Plan auto-generates from assessment findings"}
              </div>
              <div style={{fontSize:"0.62rem",color:"#a09ab8"}}>
                Fill any assessment tab — this updates automatically
              </div>
            </div>
          )}

          {/* Quick links to relevant module if empty */}
          {!currentText && onNavigate && (
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:5}}>
              {(tab==="S" ? [["💬","Subjective","subjective"]] :
                tab==="O" ? [["📐","ROM","rom"],["💪","MMT","mmt"],["🔬","Special Tests","special"],["🚶","Gait","gait"]] :
                tab==="A" ? [["🧠","SOAP + AI","soap"]] :
                [["💊","Treatment","treatment"],["🏃","Exercise","exercise"]]
              ).map(([icon,label,key]) => (
                <button key={key} onClick={()=>{ onNavigate(key); setOpen(false); }} style={{
                  padding:"4px 10px",background:"rgba(124,58,237,0.06)",
                  border:"1px solid rgba(124,58,237,0.2)",borderRadius:20,
                  color:"#7c3aed",cursor:"pointer",fontSize:"0.62rem",fontWeight:700,
                }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footer: PDF + Copy All ─────────────────────────────────────── */}
      <div style={{
        padding:"10px 14px",
        borderTop:"1px solid rgba(124,58,237,0.1)",
        background:"#faf5ff",
        display:"flex", gap:8, flexShrink:0,
      }}>
        <button onClick={exportPDF} style={{
          flex:1,padding:"7px 10px",
          background:"linear-gradient(135deg,#7c3aed,#9333ea)",
          border:"none",borderRadius:8,color:"#fff",
          cursor:"pointer",fontSize:"0.65rem",fontWeight:800,
          display:"flex",alignItems:"center",justifyContent:"center",gap:5,
        }}>
          <span>📄</span> Export PDF
        </button>
        <button onClick={()=>{
          const full = soap ? `S — SUBJECTIVE
${soap.S}

O — OBJECTIVE
${soap.O}

A — ASSESSMENT
${soap.A}

P — PLAN
${soap.P}` : "";
          copySection(full);
        }} style={{
          flex:1,padding:"7px 10px",
          background:"rgba(124,58,237,0.08)",
          border:"1px solid rgba(124,58,237,0.2)",
          borderRadius:8,color:"#7c3aed",
          cursor:"pointer",fontSize:"0.65rem",fontWeight:800,
          display:"flex",alignItems:"center",justifyContent:"center",gap:5,
        }}>
          📋 Copy All
        </button>
        {onNavigate && (
          <button onClick={()=>{ onNavigate("soap"); setOpen(false); }} style={{
            padding:"7px 10px",
            background:"rgba(5,150,105,0.08)",
            border:"1px solid rgba(5,150,105,0.2)",
            borderRadius:8,color:"#059669",
            cursor:"pointer",fontSize:"0.65rem",fontWeight:800,
          }} title="Open full SOAP editor">
            🔗
          </button>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export { GaitModule, OutcomeMeasuresModule, buildClinicalInterpretation, buildRealtimeSOAP,
  SOAPNoteModule, EXERCISE_DB, ExercisePrescriptionModule, PalpationModule,
  TreatmentTechniquesModule, TreatmentSessionLogModule, Sparkline, LiveSOAPPanel };

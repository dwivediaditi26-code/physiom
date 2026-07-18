// ClinicalModules.jsx — Gait, Outcomes, SOAP, Exercise, Palpation, Treatment, SessionLog
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ALL_DIAGNOSES } from "./DiagnosisEngine.js";
import ProbableDiagnosis from "./ProbableDiagnosis.jsx";
import { C, getC, RegionPickerButton, RegionChips } from "./utils.jsx";
import { MMT_DATA, ROM_DATA, DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, CRANIAL_NERVES, COORDINATION_TESTS, VESTIBULAR_TESTS, PERCEPTUAL_TESTS } from "./sharedClinicalData.js";
import { SPECIAL_TESTS_DATA, CYRIAX_REGIONS_DATA } from "./sharedClinicalData.js";
import { SCALES } from "./sharedClinicalData.js";
import { SCALE_DATA_LABELS, ST_DATA_LABELS, ROM_DERIVED, MMT_DATA_LABELS, mmtFallbackLabel, CYRIAX_REGION_LABELS, CYRIAX_REGION_KEYS, CYRIAX_FIELD_TYPES, CYRIAX_TEST_LABEL, CYRIAX_LEGACY_REGION, resolveCyriaxKey, EXERCISE_DB, TEMPLATE_TX, PROGRAMME_TEMPLATES, ALL_EXERCISES } from "./sharedClinicalData.js";

// Auto-derived from SCALES (the same source OutcomeMeasuresPro's own UI
// uses) instead of a hand-copied list — 10 of 26 real outcome scales were
// missing from SCALE_LABELS, including every Stroke/TBI scale added last
// session (NIHSS, Fugl-Meyer, GOAT, Rancho, Barthel, Modified Ashworth) plus
// Berg-adjacent gait/balance scales (DGI, FAC, TUG, 10m Walk Test). Lower
// severity than MMT/ROM/Special Tests: the SOAP builder already scans every
// om_history_<scaleId> entry regardless of this map, and scaleId.toUpperCase()
// as a fallback happens to already read fine for most of these (NIHSS, GOAT,
// RANCHO, MAS, FMA, TUG, DGI, FAC are all legitimate clinical abbreviations)
// — but "MWT10" reads worse than the real "10MWT", so still worth fixing.

function EF({ id, label, type, options, unit, min=0, max=10, step=1, placeholder="", data, set, note }) {
  const base={width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const val=data[id]||"";
  const filled=val!=="";
  return (
    <div style={{background:C.surface,border:`1px solid ${filled?C.accent+"25":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"10px 12px",marginBottom:8}}>
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
            <div key={c.symptom} style={{background:C.surface,border:`1px solid ${matched.length>0?col+"40":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"9px 12px",marginBottom:6}}>
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
                  <div key={mp.label} style={{background:C.surface,border:`1px solid ${C.a3}30`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"11px 13px",marginBottom:8}}>
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

  const [showFull, setShowFull] = useState(false);
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
  const tb = k=>({padding:"7px 11px",borderRadius:20,cursor:"pointer",fontSize:"0.82rem",fontWeight:tab===k?700:400,border:`1px solid ${tab===k?C.accent:C.border}`,background:tab===k?"rgba(0,229,255,0.1)":"transparent",color:tab===k?C.accent:C.muted,whiteSpace:"nowrap",transition:"all 0.15s"});
  const inp = {width:"100%",background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem",WebkitAppearance:"none",appearance:"none"};
  const row = (label, id, type="text", opts=null, note=null)=>{
    const val=data[id]||"";
    return(
      <div style={{background:C.surface,border:`1px solid ${val?C.accent+"25":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"9px 12px",marginBottom:7}}>
        <div style={{fontSize:"0.76rem",fontWeight:600,color:val?C.text:C.muted,marginBottom:5}}>{label}{val&&<span style={{color:C.green,marginLeft:5,fontSize:"0.8rem"}}>✓</span>}</div>
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
        <div style={{fontSize:"0.73rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>{label}</div>
        <span style={{color:C.muted,fontSize:"0.82rem"}}>{isOpen?"▲":"▼"}</span>
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

  const quickFields = [
    {id:"ag_antalgic",    label:"Antalgic gait", type:"select", opts:["None","Left antalgic","Right antalgic","Bilateral"]},
    {id:"g_oga_step_sym", label:"Step symmetry",  type:"select", opts:["Symmetrical","Left shorter","Right shorter","Markedly asymmetric"]},
    {id:"ag_cadence",     label:"Cadence",         type:"select", opts:["Normal","Slow","Fast","Irregular"]},
    {id:"gait_pattern",   label:"Gait pattern",    type:"select", opts:["Normal","Trendelenburg","Steppage","Scissor","Hemiplegic","Parkinsonian","Other"]},
    {id:"g_timed_tug",    label:"TUG (seconds)",   type:"number"},
    {id:"g_timed_10mwt",  label:"10m Walk (s)",    type:"number"},
  ];
  return (
    <div>
      {/* ── Quick Gait Form ── */}
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:"0.78rem",color:C.text,marginBottom:10}}>🚶 Quick Gait Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {quickFields.map(f=>{
            const val=data[f.id]||"";
            const base={width:"100%",background:C.s3,border:`1px solid ${val?C.accent+"40":C.border}`,borderRadius:8,color:C.text,fontFamily:"inherit",outline:"none",padding:"7px 9px",fontSize:"0.75rem",WebkitAppearance:"none",appearance:"none"};
            return(
              <div key={f.id}>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:val?C.green:C.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>{f.label}</div>
                {f.type==="select"?(
                  <select style={base} value={val} onChange={e=>set(f.id,e.target.value)}>
                    <option value="">—</option>
                    {f.opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                ):(
                  <input type="number" style={base} placeholder="e.g. 12.4" value={val} onChange={e=>set(f.id,e.target.value)}/>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={()=>setShowFull(v=>!v)} style={{fontSize:"0.78rem",fontWeight:600,color:C.muted,background:"transparent",border:"none",cursor:"pointer",padding:0}}>
          {showFull?"▲ Hide full analysis":"▼ Detailed analysis (phases, scales, muscle/joint)"}
        </button>
      </div>
      {showFull&&(<>
      {/* Summary banner */}
      {(fallRisk||activeGaits.length>0)&&(
        <div style={{background:fallRisk==="High"?"rgba(255,77,109,0.1)":"rgba(255,179,0,0.08)",border:`1px solid ${fallCol}40`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          {fallRisk&&<span style={{fontWeight:800,color:fallCol,fontSize:"0.85rem"}}>{fallRisk==="High"?"🔴":"🟡"} Fall Risk: {fallRisk}</span>}
          {activeGaits.map(g=><span key={g.id} style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:8,background:`${C.yellow}15`,color:C.yellow,fontWeight:600}}>{g.label}</span>)}
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
            <div style={{fontSize:"0.82rem",fontWeight:700,color:C.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Deviations Found ({phaseDeviations.length} phases)</div>
            {phaseDeviations.map(p=><div key={p.id} style={{fontSize:"0.74rem",color:C.text,marginBottom:3}}>
              <span style={{color:p.type==="stance"?C.accent:C.a2,fontWeight:600}}>{p.phase}: </span>{data[p.id+"_dev"]}
            </div>)}
          </div>
        )}
        {["stance","swing"].map(type=>(
          <div key={type} style={{marginBottom:14}}>
            <div style={{fontSize:"0.73rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:type==="stance"?C.accent:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <div style={{height:1,width:10,background:type==="stance"?C.accent:C.a2}}/>{type==="stance"?"STANCE PHASE (60%)":"SWING PHASE (40%)"}
            </div>
            {GAIT_PHASES.filter(p=>p.type===type).map(p=>{
              const dev=data[p.id+"_dev"]||"";
              const note=data[p.id+"_note"]||"";
              const hasDeviation=dev&&dev!=="None";
              return(
                <div key={p.id} style={{background:C.surface,border:`1px solid ${hasDeviation?C.yellow+"50":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"10px 12px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}>
                    <div>
                      <span style={{fontWeight:700,color:hasDeviation?C.yellow:C.text,fontSize:"0.83rem"}}>{p.phase}</span>
                      <span style={{fontSize:"0.75rem",color:C.muted,marginLeft:8}}>{p.pct}</span>
                    </div>
                    {hasDeviation&&<span style={{fontSize:"0.8rem",padding:"1px 7px",borderRadius:8,background:`${C.yellow}15`,color:C.yellow,fontWeight:700}}>DEVIATION</span>}
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
            <div key={p.id} style={{background:C.surface,border:`1px solid ${val?C.accent+"25":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"10px 12px",marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:"0.78rem",fontWeight:600,color:val?C.text:C.muted}}>{p.label}{val&&<span style={{color:C.green,marginLeft:5,fontSize:"0.8rem"}}>✓</span>}</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:"0.82rem",color:C.muted}}>Normal: {p.normal} {p.unit}</span>
                  {val&&<span style={{fontSize:"0.82rem",fontWeight:700,color:C.accent}}>{val} {p.unit}</span>}
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
            <div key={t.id} style={{background:C.surface,border:`1px solid ${flagged?C.red+"50":val?C.accent+"25":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:8}}>
                <div>
                  <div style={{fontSize:"0.8rem",fontWeight:700,color:flagged?C.red:val?C.text:C.muted}}>{t.label}{flagged&&" ⚠️"}</div>
                  <div style={{fontSize:"0.67rem",color:C.muted,marginTop:2}}>{t.note}</div>
                </div>
                <span style={{fontSize:"0.82rem",color:C.muted,flexShrink:0,textAlign:"right"}}>Normal: {t.normal}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="number" value={val} onChange={e=>set(t.id,e.target.value)} placeholder="Enter result" step="0.1" style={{...inp,flex:1}}/>
                <span style={{fontSize:"0.76rem",color:C.muted,flexShrink:0}}>{t.unit}</span>
              </div>
              {flagged&&<div style={{marginTop:6,fontSize:"0.82rem",color:C.red,fontWeight:600}}>⚠ TUG ≥13.5s — High fall risk. Refer for falls prevention program.</div>}
            </div>
          );
        })}
      </div>}

      {/* ── SCALES ── */}
      {tab==="scales"&&<div>
        {GAIT_SCALES.map(s=>{
          const val=data[s.id]||"";
          return(
            <div key={s.id} style={{background:C.surface,border:`1px solid ${val?C.accent+"25":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5,gap:8}}>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:val?C.text:C.muted}}>{s.label} <span style={{fontWeight:400,fontSize:"0.82rem",color:C.muted}}>({s.full})</span></div>
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
            <div key={g.id} data-ag-id={g.id} style={{background:C.surface,border:`1.5px solid ${present?C.yellow+"60":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"11px 13px",marginBottom:8,transition:"all 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"0.85rem",color:present?C.yellow:C.text,marginBottom:3}}>{g.label}</div>
                  <div style={{fontSize:"0.82rem",color:C.muted,marginBottom:2}}><strong style={{color:present?C.accent:C.muted}}>Cause:</strong> {g.cause}</div>
                  <div style={{fontSize:"0.82rem",color:C.muted}}><strong style={{color:present?C.accent:C.muted}}>Sign:</strong> {g.sign}</div>
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
          <div key={f.id} style={{background:C.surface,border:`1px solid ${data[f.id]?C.accent+"25":C.border}`,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",borderRadius:16,padding:"10px 12px",marginBottom:8}}>
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
        <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Short Term Goals (2–4 weeks)</div>
        {row("Goal 1","g_stg1")} {row("Goal 2","g_stg2")} {row("Goal 3","g_stg3")}

        <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a3,marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a3}}/>Long Term Goals (6–12 weeks)</div>
        {row("Goal 1","g_ltg1")} {row("Goal 2","g_ltg2")}

        <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.accent,marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.accent}}/>Treatment Plan</div>
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

        <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:C.a2,marginBottom:8,marginTop:12,display:"flex",alignItems:"center",gap:8}}><div style={{height:1,width:10,background:C.a2}}/>Outcome Measures</div>
        {row("Selected Outcome Measures","g_outcomes","select",["LEFS (lower extremity)","KOOS (knee)","HOOS (hip)","DASH (upper limb compensation)","SF-36 (general health)","WOMAC (osteoarthritis)","LEFS + TUG","KOOS + BBS"])}
        {row("Reassessment Frequency","g_reassess","select",["Every 2 weeks","Every 4 weeks","Every 6 weeks","At discharge"])}
        {row("Discharge Criteria","g_discharge","textarea")}
        {row("Home Program","g_home_prog","select",["Yes — provided","Yes — pending","No"])}
        {row("Clinical Interpretation & Summary","g_summary","textarea",null,"Primary deviation, underlying cause, functional impact, prognosis...")}
      </div>}
      </>)}
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
      if(!s||typeof s==="number") return {label:"—",color:"#6B6B6B",text:"Complete both subscales."};
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
      <span style={{fontSize:"0.75rem",color:"#6B6B6B",minWidth:14}}>{min}</span>
      <div style={{flex:1,position:"relative",height:24,display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",width:"100%",height:4,background:"#FFFFFF",borderRadius:2}}/>
        <div style={{position:"absolute",width:`${pct}%`,height:4,background:col,borderRadius:2,transition:"width 0.15s"}}/>
        <input type="range" min={min} max={max} step={step} value={value??min}
          onChange={e=>onChange(e.target.value)}
          style={{position:"absolute",width:"100%",opacity:0,height:24,cursor:"pointer",zIndex:2}}/>
        <div style={{position:"absolute",left:`${pct}%`,transform:"translateX(-50%)",width:16,height:16,borderRadius:"50%",background:col,border:"2px solid #E0E0E2",transition:"left 0.15s",pointerEvents:"none"}}/>
      </div>
      <span style={{fontSize:"0.75rem",color:"#6B6B6B",minWidth:14,textAlign:"right"}}>{max}</span>
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
        <span style={{ fontSize:"0.82rem", color:"#6B6B6B" }}>{label}</span>
        <span style={{ fontSize:"1rem", fontWeight:900, color, fontFamily:"monospace" }}>{score}<span style={{ fontSize:"0.8rem", color:"#6B6B6B", fontWeight:400 }}>/{maxScore}</span></span>
      </div>
      <div style={{ height:8, background:"#FFFFFF", borderRadius:4, overflow:"hidden", position:"relative" }}>
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
  const [omSearch,    setOmSearch]    = useState("");
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

  const filteredMeasures = Object.values(OUTCOME_DB).filter(m => {
    const q = omSearch.toLowerCase();
    const matchesSearch = !q ||
      (m.label||"").toLowerCase().includes(q) ||
      (m.category||"").toLowerCase().includes(q) ||
      (m.id||"").toLowerCase().includes(q);
    const matchesCat = catFilter === "All" || m.category === catFilter;
    return matchesSearch && matchesCat;
  });

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
    const base = { width:"100%", background:"#FFFFFF", border:"1px solid #E0E0E2", borderRadius:8, color:"#0D0D0D", fontFamily:"inherit", outline:"none", padding:"7px 10px", fontSize:"0.76rem" };
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
        <div style={{ flex:1, background:"#ffffff", border:"1px solid #E0E0E2", borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#00e5ff", fontFamily:"monospace", lineHeight:1 }}>{completedCount}</div>
            <div style={{ fontSize:"0.75rem", color:"#6B6B6B", textTransform:"uppercase", letterSpacing:"1px" }}>Completed</div>
          </div>
          <div style={{ width:1, height:32, background:"#FFFFFF" }}/>
          <div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#7f5af0", fontFamily:"monospace", lineHeight:1 }}>{sessions.length}</div>
            <div style={{ fontSize:"0.75rem", color:"#6B6B6B", textTransform:"uppercase", letterSpacing:"1px" }}>Sessions</div>
          </div>
          <div style={{ width:1, height:32, background:"#FFFFFF" }}/>
          <div>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"#ffb300", fontFamily:"monospace", lineHeight:1 }}>{Object.keys(OUTCOME_DB).length}</div>
            <div style={{ fontSize:"0.75rem", color:"#6B6B6B", textTransform:"uppercase", letterSpacing:"1px" }}>Available</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <button onClick={saveSession} style={{ padding:"8px 13px", background:"linear-gradient(135deg,rgba(0,201,122,0.2),rgba(0,229,255,0.1))", border:"1px solid rgba(0,201,122,0.35)", borderRadius:8, color:"#00c97a", fontWeight:800, fontSize:"0.78rem", cursor:"pointer", whiteSpace:"nowrap" }}>💾 Save Session</button>
          <button onClick={exportSessionsPDF} style={{ padding:"8px 13px", background:"rgba(127,90,240,0.1)", border:"1px solid rgba(127,90,240,0.3)", borderRadius:8, color:"#7f5af0", fontWeight:700, fontSize:"0.78rem", cursor:"pointer", whiteSpace:"nowrap" }}>📄 Export PDF</button>
        </div>
      </div>

      {/* ── Session history panel ── */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", gap:6, marginBottom: showHistory ? 8 : 0 }}>
          <button onClick={() => setShowHistory(h => !h)} style={{ padding:"6px 12px", background: showHistory?"rgba(127,90,240,0.15)":"transparent", border:`1px solid ${showHistory?"rgba(127,90,240,0.35)":"#1a2d45"}`, borderRadius:8, color: showHistory?"#7f5af0":"#6b8399", fontWeight:700, fontSize:"0.78rem", cursor:"pointer" }}>
            📈 Progress History {sessions.length > 0 ? `(${sessions.length} sessions)` : ""}
          </button>
          {sessions.length > 0 && <button onClick={clearHistory} style={{ padding:"6px 10px", background:"transparent", border:"1px solid rgba(255,77,109,0.25)", borderRadius:8, color:"rgba(255,77,109,0.6)", fontSize:"0.82rem", cursor:"pointer" }}>✕ Clear</button>}
        </div>

        {showHistory && sessions.length > 0 && (
          <div style={{ background:"#ffffff", border:"1px solid rgba(127,90,240,0.25)", borderRadius:12, padding:"13px" }}>
            <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#7f5af0", textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Score Progression Across Sessions</div>
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
                <div key={id} style={{ background:"#FFFFFF", border:`1px solid ${col}25`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:"1rem" }}>{m.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:700, color:"#0D0D0D" }}>{m.label.split(" — ")[0]}</div>
                      {interp && <div style={{ fontSize:"0.8rem", color: interp.color, fontWeight:700, marginTop:1 }}>{interp.label}</div>}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:"1.1rem", fontWeight:900, color: col, fontFamily:"monospace" }}>{latest}{m.unit}</div>
                      {change !== null && (
                        <div style={{ fontSize:"0.75rem", fontWeight:800, color: improved?"#00c97a":"#ff4d6d" }}>
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
                        <div style={{ padding:"4px 8px", background: Math.abs(change) >= m.mcid ? (improved?"rgba(0,201,122,0.1)":"rgba(255,77,109,0.1)") : "rgba(255,179,0,0.08)", border:`1px solid ${Math.abs(change)>=m.mcid?(improved?"rgba(0,201,122,0.3)":"rgba(255,77,109,0.3)"):"rgba(255,179,0,0.25)"}`, borderRadius:7, fontSize:"0.8rem", color: Math.abs(change)>=m.mcid?(improved?"#00c97a":"#ff4d6d"):"#ffb300", fontWeight:700 }}>
                          {Math.abs(change) >= m.mcid ? (improved ? "✅ Exceeds MCID — Clinically significant improvement" : "⚠ Exceeds MCID — Clinically significant decline") : `⬤ Below MCID (need ${m.mcid}${m.unit})`}
                        </div>
                      )}
                      {/* Session dots */}
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                        {vals.map((v, i) => (
                          <span key={i} style={{ fontSize:"0.75rem", padding:"1px 5px", background:"#FFFFFF", borderRadius:4, color:"#6B6B6B" }}>S{i + 1}: {v}{m.unit}</span>
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
          <div style={{ padding:"16px", background:"#ffffff", border:"1px solid #E0E0E2", borderRadius:10, textAlign:"center", color:"#6B6B6B", fontSize:"0.75rem" }}>
            No sessions saved yet — complete measures and tap 💾 Save Session
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <input type="text" value={omSearch} onChange={e=>{setOmSearch(e.target.value);setCatFilter("All");}}
        placeholder="🔍 Search by measure name or condition..."
        style={{ width:"100%", background:"#0d1e33", border:"1px solid #1a2d45", borderRadius:8, color:"#e2e8f0", padding:"9px 12px", fontSize:"0.82rem", fontFamily:"inherit", outline:"none", marginBottom:10 }} />

      {/* ── Category filter ── */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:12 }}>
        {["All", ...categories].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ padding:"3px 9px", borderRadius:8, fontSize:"0.8rem", fontWeight:700, border:`1px solid ${catFilter===c?(OM_CAT_COLOR[c]||"rgba(0,229,255,0.5)"):"#1a2d45"}`, background:catFilter===c?`${OM_CAT_COLOR[c]||"rgba(0,229,255,0.18)"}22`:"transparent", color:catFilter===c?(OM_CAT_COLOR[c]||"#00e5ff"):"#6b8399", cursor:"pointer" }}>
            {c}
          </button>
        ))}
      </div>

      {/* ── Measure cards ── */}
      {filteredMeasures.length===0&&omSearch&&(
        <div style={{textAlign:"center",padding:"24px",color:"#6b8399",fontSize:"0.78rem"}}>No outcome measures found for "{omSearch}"</div>
      )}
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
                    <div style={{ fontSize:"0.8rem", color:"#6B6B6B" }}>PA: <b style={{ color: score.pa>15?"#ff4d6d":"#00c97a" }}>{score.pa}</b></div>
                    <div style={{ fontSize:"0.8rem", color:"#6B6B6B" }}>W: <b style={{ color: score.w>34?"#ff4d6d":"#00c97a" }}>{score.w}</b></div>
                  </div>
                )}
              </div>
              <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#0D0D0D", lineHeight:1.3, marginBottom:4 }}>{m.label.split(" — ")[0]}</div>
              <div style={{ fontSize:"0.75rem", padding:"1px 6px", borderRadius:5, background:`${col}18`, color:col, display:"inline-block", marginBottom:5 }}>{m.category}</div>
              {/* Severity badge */}
              {interp && (
                <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background: interp.color, flexShrink:0 }}/>
                  <div style={{ fontSize:"0.82rem", fontWeight:800, color: interp.color }}>{interp.label}</div>
                </div>
              )}
              {/* Score gauge */}
              {score !== null && typeof score !== "object" && m.maxScore && (
                <div style={{ height:4, background:"#FFFFFF", borderRadius:2, overflow:"hidden", marginBottom:4 }}>
                  <div style={{ height:"100%", width:`${Math.min(100,(score/m.maxScore)*100)}%`, background: interp?.color||col, borderRadius:2, transition:"width 0.5s" }}/>
                </div>
              )}
              {/* Progress change */}
              {change !== null && (
                <div style={{ fontSize:"0.78rem", color: isImproved(m.id,change)?"#00c97a":"#ff4d6d", fontWeight:700 }}>
                  {change > 0 ? "+" : ""}{Math.round(change * 10) / 10}{m.unit} {isImproved(m.id,change)?"▲":"▼"} from S1
                </div>
              )}
              {!score && score !== 0 && <div style={{ fontSize:"0.8rem", color:"#3a5070" }}>Tap to complete →</div>}
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
                <div style={{ fontSize:"0.9rem", fontWeight:800, color:"#0D0D0D", lineHeight:1.2 }}>{activeMeasure.label}</div>
                <div style={{ fontSize:"0.82rem", color:col, marginTop:2 }}>{activeMeasure.category}</div>
                <div style={{ fontSize:"0.75rem", color:"#6B6B6B", marginTop:5, lineHeight:1.55 }}>{activeMeasure.description}</div>
              </div>
              {score !== null && typeof score !== "object" && (
                <div style={{ flexShrink:0, textAlign:"center" }}>
                  <ScoreRing score={score} maxScore={activeMeasure.maxScore} color={interp?.color||col} size={72}/>
                  <div style={{ fontSize:"0.82rem", color:"#6B6B6B", marginTop:2 }}>{activeMeasure.unit}</div>
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
                  <div style={{ marginLeft:"auto", fontSize:"0.75rem", fontWeight:700, color:interp.color, background:`${interp.color}18`, padding:"2px 8px", borderRadius:6 }}>{score}{activeMeasure.unit}</div>
                </div>
                <div style={{ fontSize:"0.74rem", color:"#0D0D0D", lineHeight:1.65 }}>{interp.text}</div>
                {activeMeasure.mcid && (
                  <div style={{ marginTop:7, fontSize:"0.82rem", color:"#6B6B6B", display:"flex", alignItems:"center", gap:5 }}>
                    <span>📏 MCID = {activeMeasure.mcid}{activeMeasure.unit}</span>
                    <span style={{ color:"#3a5070" }}>— minimum change needed to be clinically meaningful</span>
                  </div>
                )}
              </div>
            )}

            {/* Normal values reference */}
            {activeMeasure.normalRange && (
              <div style={{ padding:"8px 12px", background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.15)", borderRadius:8, marginBottom:12, fontSize:"0.75rem", color:"#6B6B6B" }}>
                📊 <span style={{ color:"#00e5ff", fontWeight:700 }}>Normal / Asymptomatic:</span> {activeMeasure.normalRange}
              </div>
            )}

            {/* MCID progress from last session */}
            {change !== null && (
              <div style={{ padding:"11px 13px", background:"rgba(127,90,240,0.07)", border:"1px solid rgba(127,90,240,0.2)", borderRadius:10, marginBottom:14 }}>
                <div style={{ fontSize:"0.78rem", fontWeight:700, color:"#7f5af0", textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>📈 Change vs Last Saved Session</div>
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:"1.3rem", fontWeight:900, color: isImproved(activeMeasure.id,change)?"#00c97a":"#ff4d6d", fontFamily:"monospace" }}>
                      {change > 0 ? "+" : ""}{Math.round(change * 10) / 10}{activeMeasure.unit}
                    </div>
                    <div style={{ fontSize:"0.78rem", color:"#6B6B6B" }}>S{sessions.length}: {prev}{activeMeasure.unit} → now: {score}{activeMeasure.unit}</div>
                  </div>
                  <div style={{ flex:1, padding:"6px 10px", background: Math.abs(change)>=mcid?(isImproved(activeMeasure.id,change)?"rgba(0,201,122,0.1)":"rgba(255,77,109,0.1)"):"rgba(255,179,0,0.08)", border:`1px solid ${Math.abs(change)>=mcid?(isImproved(activeMeasure.id,change)?"rgba(0,201,122,0.3)":"rgba(255,77,109,0.3)"):"rgba(255,179,0,0.25)"}`, borderRadius:8, fontSize:"0.75rem", color:Math.abs(change)>=mcid?(isImproved(activeMeasure.id,change)?"#00c97a":"#ff4d6d"):"#ffb300", fontWeight:700 }}>
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
                <div key={f.id} style={{ background:"#FFFFFF", border:"1px solid #E0E0E2", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
                    <span style={{ fontSize:"0.78rem", fontWeight:800, color:col, background:`${col}18`, padding:"1px 6px", borderRadius:4, flexShrink:0 }}>Q{fi+1}</span>
                    <div style={{ fontSize:"0.82rem", fontWeight:600, color:"#0D0D0D", lineHeight:1.4 }}>{f.label}</div>
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

      <div style={{ padding:"8px 12px", background:"#FFFFFF", border:"1px solid #E0E0E2", borderRadius:8, fontSize:"0.8rem", color:"#6B6B6B", lineHeight:1.6 }}>
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

  // Region-specific clinician notes — activePrefixes used (REG_MOD_S not in scope here)
  {
    const REGION_LABELS = {cx:"Cervical",lx:"Lumbar/SI",shl:"Shoulder L",shr:"Shoulder R",
      hp:"Hip",knl:"Knee L",knr:"Knee R",af:"Ankle/Foot",ew:"Elbow/Wrist",tx:"Thoracic"};
    activePrefixes.forEach(px => {
      const locNotes  = v(`${px}_loc_notes`);
      const moiNotes  = v(`${px}_moi_notes`);
      const aggNotes  = v(`${px}_agg_notes`);
      const relNotes  = v(`${px}_rel_notes`);
      const sympNotes = v(`${px}_symp_notes`);
      const fnNotes   = v(`${px}_fn_notes`) || v(`${px}_fn_psfs`);
      const noteParts = [locNotes, moiNotes, aggNotes, relNotes, sympNotes, fnNotes].filter(Boolean);
      if (noteParts.length) {
        S_parts.push(`${REGION_LABELS[px]||px.toUpperCase()} — Clinician notes: ${noteParts.join(". ")}.`);
      }
    });
  }

  // Global clinician notes from all textarea "Notes" fields in Subjective
  const ccNotes   = v("cc_notes");
  const hxNotes   = v("hx_notes");
  const goalNotes = v("goal_notes");
  const grfNotes  = v("grf_notes");
  const pmhNotes  = v("pmh_notes");
  const lsNotes   = v("ls_notes");
  const demNotes  = v("dem_notes");
  if (ccNotes)   S_parts.push(`Clinician note (complaint): ${ccNotes}.`);
  if (hxNotes)   S_parts.push(`Clinician note (history): ${hxNotes}.`);
  if (goalNotes) S_parts.push(`Clinician note (goals/beliefs): ${goalNotes}.`);
  if (grfNotes)  S_parts.push(`Clinician note (red flags): ${grfNotes}.`);
  if (pmhNotes)  S_parts.push(`Clinician note (PMH): ${pmhNotes}.`);
  if (lsNotes)   S_parts.push(`Clinician note (lifestyle): ${lsNotes}.`);
  if (demNotes)  S_parts.push(`Clinician note (demographics): ${demNotes}.`);

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

  // ── OBSERVATION (ObservationModule obs_* fields) ─────────────────────────
  {
    const obsItems = [];
    if (v("obs_summary")) obsItems.push(`Summary: ${v("obs_summary")}`);
    const obsGroups = [
      ["obs_appearance","Appearance"],["obs_build","Build"],["obs_attitude","Attitude"],
      ["obs_consciousness","Consciousness"],["obs_nutrition","Nutrition"],
      ["obs_posture_head","Head/Neck"],["obs_posture_shoulders","Shoulders"],
      ["obs_posture_scapula","Scapula"],["obs_posture_thoracic","Thoracic"],
      ["obs_posture_lumbar","Lumbar"],["obs_posture_pelvis","Pelvis"],
      ["obs_posture_lower","Knees"],["obs_posture_feet","Feet"],
    ];
    const obsAbnormal = obsGroups.filter(([k]) => {
      const val = v(k);
      return val && !/neutral|normal|symmetrical|alert|cooperat|healthy/i.test(val);
    }).map(([k,label]) => `${label}: ${v(k)}`);
    if (obsAbnormal.length) obsItems.push(`Postural deviations: ${obsAbnormal.join(", ")}`);
    if (v("obs_swelling_present")==="Present") {
      const swInfo = [v("obs_swelling_location"),v("obs_swelling_grade"),v("obs_swelling_type")].filter(Boolean).join(", ");
      obsItems.push(`Swelling: Present${swInfo ? " — "+swInfo : ""}`);
    }
    const skinParts = [
      v("obs_skin_color") && `Skin colour: ${v("obs_skin_color")}`,
      v("obs_skin_temp") && `Temp: ${v("obs_skin_temp")}`,
      v("obs_atrophy") && `Atrophy: ${v("obs_atrophy")}`,
      v("obs_scar") && `Scar: ${v("obs_scar")}`,
    ].filter(Boolean);
    if (skinParts.length) obsItems.push(skinParts.join(", "));
    if (v("obs_deformity_present")==="Present") obsItems.push(`Deformity: ${v("obs_deformity_description")||"Present"}`);
    if (v("obs_assistive_device")) obsItems.push(`Assistive device: ${v("obs_assistive_device")}`);
    if (v("obs_general_notes")) obsItems.push(v("obs_general_notes"));
    if (v("obs_muscle_bulk") && v("obs_muscle_bulk") !== "Symmetrical")
      obsItems.push(`Muscle bulk: ${v("obs_muscle_bulk")}${v("obs_muscle_location") ? " — "+v("obs_muscle_location") : ""}`);
    if (obsItems.length) O_parts.push(`Observation:\n  ${obsItems.join("\n  ")}.`);
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

  // ── ROM — derived from ROM_DATA, see ROM_DERIVED above ──────────────────
  {
    const romRows = [];
    const uniPairs = ROM_DERIVED.filter(m => !m.bilateral).map(m => [m.label, m.key, m.norm, m.unit]);
    const bilaPairs = ROM_DERIVED.filter(m => m.bilateral).map(m => [m.label, m.key, m.norm, m.unit]);
    // Helper to format single value with norm comparison. norm can be null
    // for qualitative movements (e.g. Thumb Opposition has no degree norm);
    // unit defaults to "°" but some movements (TMJ) are measured in mm.
    const fmtVal = (val, norm, unit="°") => {
      if (!val) return null;
      if (norm === null || typeof norm !== "number") return `${val}${unit}`;
      const num = parseFloat(val);
      const pct = norm > 0 ? Math.round((num/norm)*100) : null;
      const flag = pct !== null && pct < 75 ? " ⚠" : pct !== null && pct < 50 ? " ❌" : "";
      return `${val}${unit} (norm ${norm}${unit}${flag})`;
    };
    // Try both old (no suffix) and new (_arom) field name formats
    const rv = (key) => v(key+"_arom") || v(key) || "";
    const rvLR = (key, side) => {
      const s = side === "L" ? ["_L_arom","_left","_L"] : ["_R_arom","_right","_R"];
      return s.map(sfx => v(key+sfx)).find(x=>x) || "";
    };
    uniPairs.forEach(([label, key, norm, unit]) => {
      const val = rv(key);
      if (val) {
        const fmt = fmtVal(val, norm, unit);
        const pain = v(key+"_pain") || v(key+"_arom_pain");
        romRows.push(`  ${label}: ${fmt}${pain ? " — "+pain : ""}`);
      }
    });
    bilaPairs.forEach(([label, key, norm, unit]) => {
      const vL = rvLR(key,"L"), vR = rvLR(key,"R");
      if (vL || vR) {
        const fL = vL ? fmtVal(vL, norm, unit) : "—";
        const fR = vR ? fmtVal(vR, norm, unit) : "—";
        const pain = v(key+"_pain_left")||v(key+"_pain_right")||v(key+"_L_arom_pain")||v(key+"_R_arom_pain");
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
      // Full coverage of every real MMT_DATA muscle (see MMT_DATA_LABELS
      // above) — spread first so the manually-curated entries below can
      // still override a specific label if needed, without losing coverage
      // for anything not explicitly listed by hand.
      ...MMT_DATA_LABELS,
      // Short-form aliases used by AppModules/PatientDatabase MMT table
      mmt_quad:"Quadriceps",mmt_quad_l:"Quadriceps",mmt_quad_r:"Quadriceps",
      mmt_hams:"Hamstrings",mmt_hams_l:"Hamstrings",mmt_hams_r:"Hamstrings",
      mmt_hamstr:"Hamstrings",mmt_hamst:"Hamstrings",
      mmt_glut_max:"Gluteus Maximus",mmt_glut_max_l:"Gluteus Maximus",mmt_glut_max_r:"Gluteus Maximus",
      mmt_glut_med:"Gluteus Medius",mmt_glut_med_l:"Gluteus Medius",mmt_glut_med_r:"Gluteus Medius",
      mmt_hip_flex:"Hip Flexors",mmt_hip_flex_l:"Hip Flexors",mmt_hip_flex_r:"Hip Flexors",
      mmt_gastroc:"Gastrocnemius",mmt_gastroc_l:"Gastrocnemius",mmt_gastroc_r:"Gastrocnemius",
      mmt_tib_ant:"Tibialis Anterior",mmt_tib_ant_l:"Tibialis Anterior",mmt_tib_ant_r:"Tibialis Anterior",
      mmt_ehl:"Ext Hallucis Longus",mmt_ehl_l:"Ext Hallucis Longus",mmt_ehl_r:"Ext Hallucis Longus",
      mmt_deltoid:"Deltoid",mmt_deltoid_l:"Deltoid",mmt_deltoid_r:"Deltoid",
      mmt_rc:"Rotator Cuff",mmt_rc_l:"Rotator Cuff",mmt_rc_r:"Rotator Cuff",
      mmt_biceps:"Biceps Brachii",mmt_biceps_l:"Biceps Brachii",mmt_biceps_r:"Biceps Brachii",
      mmt_triceps:"Triceps Brachii",mmt_triceps_l:"Triceps Brachii",mmt_triceps_r:"Triceps Brachii",
      mmt_wr_ext:"Wrist Extensors",mmt_wr_ext_l:"Wrist Extensors",mmt_wr_ext_r:"Wrist Extensors",
      mmt_dnf:"Deep Neck Flexors",mmt_dnf_l:"Deep Neck Flexors",mmt_dnf_r:"Deep Neck Flexors",
      // Full-form originals
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
      mmt_tib_ant:"Tibialis Anterior",mmt_tp:"Tibialis Posterior",mmt_peronls:"Peroneals",
      mmt_ehl:"EHL",mmt_edl:"EDL",mmt_abdhal:"Abductor Hallucis",
    };
    const mmtDeficit = [], mmtNormal = [];
    Object.keys(data).filter(k => k.startsWith("mmt_")).forEach(k => {
      const raw = String(data[k]||"").trim();
      if (!raw) return;
      const num = parseFloat(raw);
      const sideMatch = k.match(/_([LRlr])$/);
      const side = sideMatch ? " ("+sideMatch[1].toUpperCase()+")" : "";
      const base = k.replace(/_[LRlr]$/, "");
      // Handle double-prefix keys like mmt_mmt_ta_L
      const strippedBase2 = base.startsWith("mmt_mmt_") ? base.replace("mmt_mmt_","mmt_") : base;
      const label = MMT_LABELS[k] || MMT_LABELS[base] ||
        (MMT_LABELS[strippedBase2] ? MMT_LABELS[strippedBase2]+side : mmtFallbackLabel(strippedBase2.replace(/^mmt_/,""))+side);
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
  // FINDING (severe — fixed): dermatomes, myotomes, reflexes, and neural
  // tension were all reading from field keys that don't match what
  // NeurologicalModule actually writes. Verified directly against the real
  // data + set() calls in PhysioNeuro.jsx:
  //   - Dermatomes: hardcoded 15-level list was missing S3/S4-5 (real data
  //     has 16 levels) and included a phantom "t2" that doesn't exist.
  //   - Myotomes: real keys are "myo_<slug>_left/right" (e.g. "myo_c5_left")
  //     but this read bare "n_c5" with no prefix and no side suffix at all —
  //     could never match real data, meaning myotome findings never
  //     appeared in the SOAP note or Live SOAP regardless of what a
  //     clinician recorded.
  //   - Reflexes: real keys are "<REFLEXES id>_left/right" (e.g.
  //     "n_ref_bicep_left") but this read "n_biceps" (wrong prefix, wrong
  //     spelling, no side suffix) — same complete miss.
  //   - Neural tension: the 6 real tests were correctly listed, but real
  //     keys need a "_left"/"_right" suffix ("nt_slr_left") which this
  //     never added.
  // Fixed by deriving all four from the real DERMATOMES/MYOTOMES/REFLEXES/
  // NEURAL_TENSION arrays (the same source NeurologicalModule's own UI
  // uses), with the exact key conventions verified above.
  {
    const neuroLines = [];
    // Dermatomes
    const dermAbnormal = [];
    DERMATOMES.forEach(d => {
      const left = v(`${d.id}_left`), right = v(`${d.id}_right`);
      const abnL = left && !left.toLowerCase().includes("normal") && !left.toLowerCase().includes("intact");
      const abnR = right && !right.toLowerCase().includes("normal") && !right.toLowerCase().includes("intact");
      if (abnL || abnR) {
        if (left && right) dermAbnormal.push(`${d.level}: L=${left} R=${right}`);
        else if (left) dermAbnormal.push(`${d.level}: ${left}`);
        else if (right) dermAbnormal.push(`${d.level}: R=${right}`);
      }
    });
    if (dermAbnormal.length) neuroLines.push(`  Dermatomal: ${dermAbnormal.join("; ")}`);
    // Myotomes — key is "myo_<slug>_left/right", slug derived the same way
    // NeurologicalModule itself derives it from m.level.
    const myoAbn = [];
    MYOTOMES.forEach(m => {
      const slug = "myo_" + m.level.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const left = v(`${slug}_left`), right = v(`${slug}_right`);
      [["L", left], ["R", right]].forEach(([side, val]) => {
        if (val && val.match(/[0-4](\+|-)?\/5|weak|reduced/i)) myoAbn.push(`${m.level} ${side}: ${val}`);
      });
    });
    if (myoAbn.length) neuroLines.push(`  Myotomes: ${myoAbn.join("; ")}`);
    // Reflexes
    const refAbn = [];
    REFLEXES.forEach(r => {
      const left = v(`${r.id}_left`), right = v(`${r.id}_right`) || v(r.id);
      [["L", left], ["R", right]].forEach(([side, val]) => {
        if (val && (val.includes("+") || /abn|hyper|absent|brisk|clonus|positive/i.test(val)))
          refAbn.push(`${r.label} ${side}: ${val}`);
      });
    });
    if (refAbn.length) neuroLines.push(`  Reflexes: ${refAbn.join("; ")}`);
    // Neural tension tests — real keys need the _left/_right suffix
    const ntPos = [], ntNeg = [];
    NEURAL_TENSION.forEach(nt => {
      [["L", v(`${nt.id}_left`)], ["R", v(`${nt.id}_right`)]].forEach(([side, val]) => {
        if (!val) return;
        if (val.toLowerCase().includes("positive") || val.toLowerCase().includes("pos ")) ntPos.push(`${nt.label} ${side} (${val.slice(0,40)})`);
        else if (val.toLowerCase().includes("negative") || val.toLowerCase().includes("neg ")) ntNeg.push(`${nt.label} ${side}`);
      });
    });
    if (ntPos.length) neuroLines.push(`  Neural Tension +ve: ${ntPos.join("; ")}`);
    if (ntNeg.length) neuroLines.push(`  Neural Tension -ve: ${ntNeg.join(", ")}`);
    // Red flags neurological
    const nrfKeys = [["nrf_myelopathy","Myelopathy signs"],["nrf_cauda","Cauda equina"],
                     ["nrf_saddle","Saddle anaesthesia"],["nrf_sphincter","Sphincter dysfunction"],
                     ["nrf_bilateral","Bilateral signs"],["nrf_prog_weak","Progressive weakness"],
                     ["nrf_raised_icp","Raised ICP signs"],["nrf_loc_change","Evolving consciousness change"],
                     ["nrf_autonomic_dysreflexia","Autonomic dysreflexia"]];
    const nrfFlags = nrfKeys.filter(([k]) => {
      const val = data[k];
      if (val === true) return true;
      const lc = String(val).toLowerCase();
      return lc.includes("yes") || lc.includes("present");
    })
                              .map(([,label]) => label);
    if (nrfFlags.length) neuroLines.push(`  ⚠️ Red Flags: ${nrfFlags.join(", ")}`);
    // GCS if recorded
    const gcsE = v("gcs_eye"), gcsV = v("gcs_verbal"), gcsM = v("gcs_motor");
    if (gcsE||gcsV||gcsM) {
      const total = (Number(gcsE)||0)+(Number(gcsV)||0)+(Number(gcsM)||0);
      neuroLines.push(`  GCS: E${gcsE||"?"}+V${gcsV||"?"}+M${gcsM||"?"} = ${total||"?"}/15`);
    }
    // Cranial nerves — only lines that were actually tested
    const cnLines = [];
    CRANIAL_NERVES.forEach(cn => {
      const val = v(`cn_${cn.id}_status`);
      if (val) cnLines.push(`  CN ${cn.numeral} (${cn.name}): ${val}`);
    });
    if (cnLines.length) neuroLines.push(`  Cranial nerves:\n${cnLines.join("\n")}`);

    // Cognition — orientation + MoCA/MMSE
    const orientKeys = [["cog_orient_person","Person"],["cog_orient_place","Place"],["cog_orient_time","Time"],["cog_orient_situation","Situation"]];
    const orientResults = orientKeys.filter(([k]) => data[k]).map(([k,label]) => `${label}: ${data[k]}`);
    if (orientResults.length) neuroLines.push(`  Orientation: ${orientResults.join(", ")}`);
    ["moca","mmse","minicog"].forEach(scaleId => {
      const sc = SCALES[scaleId];
      const score = sc.score(data);
      if (score !== null) neuroLines.push(`  ${sc.label}: ${score}${sc.unit} (${sc.interpret(score).label})`);
    });

    // Condition-specific staging scales -- Brunnstrom, Rankin, Hoehn & Yahr,
    // PD rigidity, UPDRS, EDSS. Same live-computed pattern as the cognitive
    // scales above (never a separate cached number, always SCALES.score()
    // reading straight off the real recorded fields).
    ["brunnstrom","rankin","hoehnyahr","pdrigidity","updrs","edss","rancho","goat","barthel","asia","nihss"].forEach(scaleId => {
      const sc = SCALES[scaleId];
      const score = sc.score(data);
      if (score !== null) neuroLines.push(`  ${sc.label}: ${score}${sc.unit} (${sc.interpret(score).label})`);
    });

    // SCI bowel/bladder/skin management status
    if (v("sci_bladder_mgmt")) neuroLines.push(`  Bladder management: ${v("sci_bladder_mgmt")}`);
    if (v("sci_bowel_mgmt")) neuroLines.push(`  Bowel management: ${v("sci_bowel_mgmt")}`);

    // Coordination + involuntary movements
    const coordLines = [];
    COORDINATION_TESTS.forEach(t => {
      const lv = v(`${t.id}_L`), rv = v(`${t.id}_R`);
      if (lv||rv) coordLines.push(`  ${t.label}: L ${lv||"—"} / R ${rv||"—"}`);
    });
    if (coordLines.length) neuroLines.push(`  Coordination:\n${coordLines.join("\n")}`);
    if (v("neuro_involuntary_type") && v("neuro_involuntary_type") !== "None observed") {
      neuroLines.push(`  Involuntary movements: ${v("neuro_involuntary_type")}${v("neuro_involuntary_notes") ? " — "+v("neuro_involuntary_notes") : ""}`);
    }

    // Vestibular / oculomotor
    const vestLines = [];
    VESTIBULAR_TESTS.forEach(t => {
      const val = v(`vest_${t.id}_result`);
      if (val) vestLines.push(`  ${t.label}: ${val}`);
    });
    if (vestLines.length) neuroLines.push(`  Vestibular/oculomotor:\n${vestLines.join("\n")}`);

    // Perceptual screen
    const percLines = [];
    PERCEPTUAL_TESTS.forEach(t => {
      const val = v(`perc_${t.id}_result`);
      if (val) percLines.push(`  ${t.label}: ${val}`);
    });
    if (percLines.length) neuroLines.push(`  Perceptual screen:\n${percLines.join("\n")}`);

    // General neuro notes
    if (v("neuro_clinician_notes")) neuroLines.push(`  Notes: ${v("neuro_clinician_notes")}`);
    if (neuroLines.length) O_parts.push(`Neurological:\n${neuroLines.join("\n")}.`);
  }

  // Special Tests — with proper clinical labels
  {
    const ST_LABEL_MAP = {
      // Full coverage of every real special test (see ST_DATA_LABELS above)
      // — spread first so hand-curated entries below still override where
      // they already exist, without losing coverage for the 57 (of 89) real
      // tests this map was previously missing entirely.
      ...ST_DATA_LABELS,
      // Lumbar / Neural
      "st_slr":"Straight Leg Raise","st_slr_test":"Straight Leg Raise","st_slr_left":"SLR (Left)","st_slr_right":"SLR (Right)",
      "st_crossed_slr":"Crossed SLR","st_well_leg_raise":"Well Leg Raise","st_slump":"Slump Test",
      "st_femoral_nerve":"Femoral Nerve Stretch","st_kemp":"Kemp's Test","st_prone_instability":"Prone Instability Test",
      "st_valsalva":"Valsalva Manoeuvre","st_seated_flexion":"Seated Flexion Test",
      // SIJ
      "st_faber":"FABER / Patrick's Test","st_fadir":"FADIR Test","st_thigh_thrust":"Thigh Thrust",
      "st_gaenslen":"Gaenslen's Test","st_sacral_compression":"Sacral Compression","st_sacral_distraction":"Sacral Distraction",
      "st_compression":"Compression Test","st_distraction_sij":"SIJ Distraction",
      // Cervical
      "st_spurling":"Spurling's Test","st_distraction":"Cervical Distraction","st_vbi":"VBI Screen",
      "st_upper_limb_tension":"ULTT (Median)","st_ultt":"ULTT","st_ultt2":"ULTT2 (Radial)","st_ultt3":"ULTT3 (Ulnar)",
      "st_sharp_purser":"Sharp-Purser Test","st_frt":"Flexion-Rotation Test","st_alar_ligament":"Alar Ligament Test",
      "st_foraminal_compression":"Foraminal Compression","st_hoffmann":"Hoffmann's Sign","st_babinski":"Babinski Sign",
      "st_inverted_supinator":"Inverted Supinator Sign","st_clonus":"Clonus",
      // Shoulder
      "st_empty_can":"Empty Can (Jobe)","st_full_can":"Full Can Test","st_drop_arm":"Drop Arm Test",
      "st_neer":"Neer Impingement","st_hawkins":"Hawkins-Kennedy","st_hawkins_kennedy":"Hawkins-Kennedy",
      "st_painful_arc":"Painful Arc","st_external_rotation_lag":"External Rotation Lag Sign",
      "st_er_lag":"External Rotation Lag Sign","st_internal_rotation_lag":"Internal Rotation Lag Sign",
      "st_speeds":"Speed's Test","st_yergason":"Yergason's Test","st_obriens":"O'Brien's Active Compression",
      "st_active_compression":"Active Compression Test","st_cross_arm":"Cross-Arm Adduction Test",
      "st_horizontal_adduction":"Horizontal Adduction Test","st_apprehension":"Anterior Apprehension Test",
      "st_anterior_apprehension":"Anterior Apprehension Test","st_relocation":"Relocation Test",
      "st_sulcus_sign":"Sulcus Sign","st_supraspinatus":"Supraspinatus Test",
      // Elbow
      "st_cozen":"Cozen's Test","st_mill":"Mill's Test","st_maudsley":"Maudsley's Test",
      "st_tennis_elbow":"Tennis Elbow Test","st_golfer_elbow":"Golfer's Elbow Test",
      "st_tinel_elbow":"Tinel's at Elbow","st_tinel_cubital":"Tinel's (Cubital Tunnel)",
      "st_elbow_flexion_test":"Elbow Flexion Test","st_medial_epicondyle":"Medial Epicondyle Stress Test",
      // Wrist/Hand
      "st_phalen":"Phalen's Test","st_tinel_wrist":"Tinel's at Wrist","st_tinel":"Tinel's Sign",
      "st_carpal_compression":"Carpal Compression Test","st_finkelstein":"Finkelstein's Test","st_flick_sign":"Flick Sign",
      // Hip
      "st_patrick":"Patrick's (FABER) Test","st_ober":"Ober's Test","st_scour":"Scour / Quadrant Test",
      "st_quadrant":"Hip Quadrant Test","st_impingement_hip":"Hip Impingement (FADIR)",
      "st_freiberg":"Freiberg's Test","st_pace":"Pace's Test","st_beatty":"Beatty's Test",
      "st_noble_compression":"Noble Compression Test","st_piriformis":"Piriformis Test",
      "st_trendelenburg":"Trendelenburg Test",
      // Knee
      "st_lachman":"Lachman's Test","st_anterior_drawer":"Anterior Drawer (Knee)","st_anterior_drawer_knee":"Anterior Drawer (Knee)",
      "st_posterior_drawer":"Posterior Drawer","st_pivot_shift":"Pivot Shift Test",
      "st_mcmurray":"McMurray's Test","st_thessaly":"Thessaly Test","st_apley":"Apley's Compression",
      "st_valgus_stress":"Valgus Stress Test","st_varus_stress":"Varus Stress Test",
      "st_patella_grind":"Patellar Grind Test","st_clarke":"Clarke's Sign",
      "st_crepitus":"Crepitus","st_ballottement":"Ballottement Test",
      // Ankle/Foot
      "st_anterior_drawer_ankle":"Anterior Drawer (Ankle)","st_talar_tilt":"Talar Tilt Test",
      "st_thompson":"Thompson's Test","st_simmonds":"Simmonds Test",
      "st_windlass":"Windlass Test","st_arc_sign":"Arc Sign","st_royal_london":"Royal London Hospital Test",
      "st_ottawa_ankle":"Ottawa Ankle Rules","st_homan":"Homan's Sign",
      // Lumbar aliases
      "lx_kemp":"Kemp's Test","lx_slump":"Slump Test","lx_slr":"SLR (Lumbar)",
      "lx_slr_left":"SLR Left","lx_slr_right":"SLR Right","lx_prone":"Prone Instability",
      // Beighton / other
      "st_beighton":"Beighton Score","st_upper_limb_tension":"ULTT","st_straight_leg":"Straight Leg Raise",
    };
    const toLabel = (k) => {
      if (ST_LABEL_MAP[k]) return ST_LABEL_MAP[k];
      // Auto-format: remove prefix, split underscores, title-case
      return k.replace(/^(st_|lx_)/,"").split("_").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
    };
    const allStKeys = Object.keys(data).filter(k =>
      (k.startsWith("st_") || k.startsWith("lx_kemp") || k.startsWith("lx_slump") || k.startsWith("lx_slr") || k.startsWith("lx_prone"))
      && data[k] && String(data[k]).trim()
    );
    const posTests = allStKeys.filter(k => {
      const s = String(data[k]).toLowerCase();
      return s.includes("positive") || s.includes("+ve");
    }).map(k => `${toLabel(k)}`);
    const negTests = allStKeys.filter(k => {
      const s = String(data[k]).toLowerCase();
      return s.includes("negative") || s.includes("-ve");
    }).map(k => toLabel(k));
    const otherTests = allStKeys.filter(k => {
      const s = String(data[k]).toLowerCase();
      return !s.includes("positive") && !s.includes("+ve") && !s.includes("negative") && !s.includes("-ve");
    }).map(k => `${toLabel(k)}: ${data[k]}`);
    if (posTests.length || negTests.length || otherTests.length) {
      const stLines = [];
      if (posTests.length) stLines.push(`  Positive: ${posTests.join("; ")}`);
      if (negTests.length) stLines.push(`  Negative: ${negTests.join(", ")}`);
      if (otherTests.length) stLines.push(`  Other: ${otherTests.join("; ")}`);
      O_parts.push(`Special Tests:\n${stLines.join("\n")}.`);
    }
  }

  // ── CPA (Neurokinetic Therapy) ──────────────────────────────────────────
  {
    // All 47 CPA test IDs in order
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
    const nktInh = [], nktFac = [], nktNorm = [], nktOver = [];
    NKT_IDS.forEach(([id, label]) => {
      const val = String(data[id]||"").trim();
      if (!val) return;
      if (val.includes("Inhibited") || val.includes("inhibited") || val.includes("Complete inhibition")) nktInh.push(`${label} (${val})`);
      else if (val.includes("Overactive") || val.includes("overactive")) nktOver.push(`${label} (${val})`);
      else if (val.includes("Facilitated") || val.includes("facilitated")) nktFac.push(label);
      else if (val.includes("Normal") || val.includes("normal")) nktNorm.push(label);
    });
    const nktLines = [];
    if (nktInh.length)  nktLines.push(`  Inhibited: ${nktInh.join(", ")}`);
    if (nktOver.length) nktLines.push(`  Overactive/Facilitated: ${nktOver.join(", ")}`);
    if (nktFac.length)  nktLines.push(`  Facilitated normal: ${nktFac.join(", ")}`);
    if (nktNorm.length && (nktInh.length || nktOver.length)) nktLines.push(`  Normal: ${nktNorm.slice(0,5).join(", ")}${nktNorm.length>5?` + ${nktNorm.length-5} more`:""}`);
    if (v("nkt_notes")) nktLines.push(`  Notes: ${v("nkt_notes")}`);
    if (nktLines.length) O_parts.push(`Neuromuscular Assessment (CPA):\n${nktLines.join("\n")}.`);
  }

  // NOTE: this section used to reference THREE generations of
  // functional-assessment data, all confirmed dead via a full-repo search
  // (never written by any real UI component): (1) fma_report/
  // fma_compensation_*/fma_score_*/fma_notes_* -- only ever appeared in a
  // hardcoded demo/seed patient record, never real clinician input; (2)
  // sp_fms_* (the classic 7-movement FMS: Deep Squat/Hurdle Step/Inline
  // Lunge/Shoulder Mob/ASLR/Trunk Stability Push-Up/Rotary Stability) --
  // only ever read, never written. The real, working Functional Assessment
  // is FunctionalScreenHub (region-based screens storing grades in a JSON
  // blob per region, e.g. data.lfs_data/data.kfs_data), already correctly
  // handled in the "Advanced Functional Screens (v2)" section further down.

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
    const kcFail = [], kcHyper = [], kcOther = [], kcPass = [];
    const FAIL_RE  = /restrict|limit|dysfunc|unstable|abnormal|fail|hypomob|tight|valgus|dominant|positive|absent|crepitus|deviation|aslr|gird|chin.poke|no.ta|no.activation/i;
    const HYPER_RE = /hyper|lax|excess|cervicothoracic.instab/i;
    const NORM_RE  = /normal|pass|adequate|full/i;
    KC_IDS.forEach(([id, label]) => {
      const raw = data[id];
      if (!raw || !String(raw).trim()) return;
      const val = String(raw).trim();
      const lc  = val.toLowerCase();
      const short = val.slice(0, 35);
      if (FAIL_RE.test(lc))                        kcFail.push(`${label} (${short})`);
      else if (HYPER_RE.test(lc))                  kcHyper.push(`${label} (${short})`);
      else if (NORM_RE.test(lc))                   kcPass.push(label);
      else                                          kcOther.push(`${label} (${short})`);
    });
    const kcNotes = data["kc_notes"] || data["kc_summary"];
    if (kcFail.length)  kcLines.push(`  Restricted/Dysfunctional: ${kcFail.join("; ")}`);
    if (kcHyper.length) kcLines.push(`  Hypermobile/Lax: ${kcHyper.join("; ")}`);
    if (kcOther.length) kcLines.push(`  Other findings: ${kcOther.join("; ")}`);
    if (kcPass.length)  kcLines.push(`  Normal: ${kcPass.slice(0,6).join(", ")}${kcPass.length>6?" + more":""}`);
    if (kcNotes) kcLines.push(`  Notes: ${String(kcNotes).slice(0,120)}`);
    if (kcLines.length) O_parts.push(`Kinetic Chain Assessment:\n${kcLines.join("\n")}.`);
  }

  // ── STTT / CYRIAX ASSESSMENT — scan cyriax_<region>_* and legacy cy_* keys ──
  // Uses the shared resolveCyriaxKey() resolver (see top of file) instead of
  // its own inline region/field parsing -- that inline copy had the same
  // lazy-region-regex bug fixed elsewhere this session (two-word regions
  // like wrist_hand/ankle_foot garbled into "Hand Act Rom Wr A Flex"), just
  // never caught here because this is the Live SOAP text builder, a
  // different code path from the visual SOAP card grid.
  {
    const cyriaxLines = [];
    const SKIP_EXACT = new Set(["cy_contractile","cy_non_contractile","cy_capsular_pattern","cy_capsular","cy_endfeel","cy_notes"]);
    const cyKeys = Object.keys(data).filter(k =>
      (k.startsWith("cy_") || k.startsWith("cyriax_")) &&
      data[k] && String(data[k]).trim() && !SKIP_EXACT.has(k)
    );
    const resisted = [], active = [], passive = [], endfeel = [], other = [];
    cyKeys.forEach(k => {
      const val = String(data[k]).trim();
      if (!val || val==="Not tested") return;
      const resolved = resolveCyriaxKey(k);
      if (!resolved) return;
      const { region, word, label, cat } = resolved;
      const entry = `  ${region?`[${region}] `:""}${label}: ${word}${val}`;
      if (cat === "resisted") resisted.push(entry);
      else if (cat === "passive") passive.push(entry);
      else active.push(entry);
    });
    const efKeys = Object.keys(data).filter(k => k.startsWith("ef_") || k.startsWith("endfeel_") || k==="cy_endfeel");
    efKeys.forEach(k => { const val=v(k); if(val) endfeel.push(`  End-feel: ${val}`); });
    if (active.length)   cyriaxLines.push("  Active movements:", ...active);
    if (passive.length)  cyriaxLines.push("  Passive movements:", ...passive);
    if (resisted.length) cyriaxLines.push("  Resisted tests:", ...resisted);
    if (endfeel.length)  cyriaxLines.push(...endfeel);
    if (other.length)    cyriaxLines.push(...other);
    if (v("cy_contractile"))     cyriaxLines.push(`  Contractile: ${v("cy_contractile")}`);
    if (v("cy_non_contractile")) cyriaxLines.push(`  Non-contractile: ${v("cy_non_contractile")}`);
    if (v("cy_capsular_pattern")||v("cy_capsular")) cyriaxLines.push(`  Capsular pattern: ${v("cy_capsular_pattern")||v("cy_capsular")}`);
    if (v("cy_notes")) cyriaxLines.push(`  Notes: ${v("cy_notes")}`);
    if (cyriaxLines.length) O_parts.push(`STTT / Selective Tissue Tension:\n${cyriaxLines.join("\n")}.`);
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

  // ── BODY CHART (Pain Location Map) ─────────────────────────────────────────
  {
    const markers = Array.isArray(data.body_chart) ? data.body_chart : [];
    if (markers.length) {
      const painTypes = {pain:"Pain",referred:"Referred pain",numb:"Numbness",tingling:"Tingling",stiff:"Stiffness"};
      const grouped = {};
      markers.forEach(m => {
        const type = painTypes[m.type] || m.type || "Pain";
        if (!grouped[type]) grouped[type] = [];
        if (!grouped[type].includes(m.region)) grouped[type].push(m.region);
      });
      const lines = Object.entries(grouped).map(([type, regions]) => `  ${type}: ${regions.join(", ")}`);
      O_parts.push(`Pain Location (Body Chart):\n${lines.join("\n")}.`);
    }
  }

  // Outcome Measures — read om_history_<scaleId> (OutcomeMeasuresPro), om_report, and direct fields
  {
    const omRows = [];
    const addedScales = new Set();
    const SCALE_LABELS = {
      // Full coverage of every real scale (see SCALE_DATA_LABELS above) —
      // spread first so hand-curated entries below (some deliberately
      // fuller, e.g. "Berg Balance" instead of the raw "BBS") still win
      // where they already exist.
      ...SCALE_DATA_LABELS,
      ndi:"NDI",odi:"ODI",dash:"DASH",lefs:"LEFS",psfs:"PSFS",
      koos:"KOOS",hoos:"HOOS",bbs:"Berg Balance",vas:"VAS Pain",
      tsk:"TSK-11",fabq:"FABQ",pcs:"PCS",rmdq:"RMDQ",spadi:"SPADI",
      faam:"FAAM",quickdash:"QuickDASH",womac:"WOMAC",asia:"ASIA",
    };
    // Primary source: om_history_<scaleId> saved by OutcomeMeasuresPro
    Object.keys(data).forEach(k => {
      if (!k.startsWith("om_history_")) return;
      const scaleId = k.replace("om_history_","");
      try {
        const hist = typeof data[k] === "string" ? JSON.parse(data[k]) : data[k];
        if (Array.isArray(hist) && hist.length > 0) {
          const latest = hist[hist.length - 1];
          const label = SCALE_LABELS[scaleId] || scaleId.toUpperCase();
          const dateStr = latest.date ? ` (${new Date(latest.date).toLocaleDateString()})` : "";
          omRows.push(`${label}: ${latest.score}${dateStr}`);
          addedScales.add(scaleId);
        }
      } catch {}
    });
    // PSFS activities from subjective
    [1,2,3].forEach(i => {
      const act = v(`om_psfs${i}`);
      const now2 = v(`om_psfs${i}_now`);
      const goal2 = v(`om_psfs${i}_goal`);
      if (act) omRows.push(`PSFS Activity ${i}: "${act}" — ${now2||"—"}/10 (goal: ${goal2||"—"}/10)`);
    });
    // Fallback: om_report (legacy sync)
    const omReport = data.om_report;
    if (omReport?.scores) {
      Object.entries(omReport.scores).forEach(([id,score]) => {
        if (!addedScales.has(id)) {
          omRows.push(`${SCALE_LABELS[id]||id.toUpperCase()}: ${score}`);
          addedScales.add(id);
        }
      });
    }
    // Fallback: direct score fields
    if (v("om_odi_score")&&!addedScales.has("odi")) omRows.push(`ODI: ${v("om_odi_score")}%`);
    if (v("om_dash_score")&&!addedScales.has("dash")) omRows.push(`DASH: ${v("om_dash_score")}`);
    if (v("om_ndi_score")&&!addedScales.has("ndi")) omRows.push(`NDI: ${v("om_ndi_score")}%`);
    if (v("om_lefs_score")&&!addedScales.has("lefs")) omRows.push(`LEFS: ${v("om_lefs_score")}/80`);
    if (omRows.length) O_parts.push(`Outcome Measures:\n  ${omRows.join("\n  ")}.`);
  }

  // ── GAIT ──────────────────────────────────────────────────────────────────
  // FINDING (severe — fixed): most of this only checked flat field names
  // ("gait_trendelenburg", "gait_cadence", "gait_deviations", "gait_obs")
  // that GaitModule never actually writes. Verified directly against
  // GaitModule's real data() calls: abnormal gait patterns are stored as
  // "<ABNORMAL_GAITS id>" (e.g. "ag_trend") + "<id>_note", phase deviations
  // as "<GAIT_PHASES id>_dev" (e.g. "g_ms_dev"), and gait scale scores as
  // "<GAIT_SCALES id>" (e.g. "g_fac"). Only "gait_pattern" genuinely
  // overlapped with what the quick-entry form actually saves. This meant
  // Trendelenburg sign, phase-specific deviations, and every gait scale
  // score (FAC, DGI, FGA, Berg, Tinetti, Wisconsin) never reached the SOAP
  // note or Live SOAP regardless of what a clinician recorded.
  {
    const gaitParts = [];
    if (v("gait_pattern")) gaitParts.push(`Pattern: ${v("gait_pattern")}`);
    if (v("ag_antalgic") && v("ag_antalgic") !== "None") gaitParts.push(`Antalgic: ${v("ag_antalgic")}`);
    if (v("ag_cadence"))   gaitParts.push(`Cadence: ${v("ag_cadence")}`);
    if (v("g_oga_step_sym") && v("g_oga_step_sym") !== "Symmetrical") gaitParts.push(`Step symmetry: ${v("g_oga_step_sym")}`);
    if (v("g_timed_tug"))    gaitParts.push(`TUG: ${v("g_timed_tug")}s`);
    if (v("g_timed_10mwt"))  gaitParts.push(`10m Walk: ${v("g_timed_10mwt")}s`);
    // Abnormal gait patterns (Trendelenburg, antalgic, steppage, etc.)
    const abnormalGaits = ABNORMAL_GAITS.filter(g => v(g.id) === "Present");
    if (abnormalGaits.length) {
      gaitParts.push(`Abnormal patterns: ${abnormalGaits.map(g => {
        const note = v(`${g.id}_note`);
        return `${g.label}${note ? ` (${note})` : ""}`;
      }).join(", ")}`);
    }
    // Phase-specific deviations
    const phaseDevs = GAIT_PHASES.filter(p => v(`${p.id}_dev`) && v(`${p.id}_dev`) !== "None");
    if (phaseDevs.length) {
      gaitParts.push(`Phase deviations: ${phaseDevs.map(p => `${p.phase} — ${v(`${p.id}_dev`)}`).join("; ")}`);
    }
    // Gait/balance scale scores
    const gaitScales = GAIT_SCALES.filter(s => v(s.id));
    if (gaitScales.length) {
      gaitParts.push(`Scales: ${gaitScales.map(s => `${s.label} ${v(s.id)}${s.range}`).join(", ")}`);
    }
    const gaitDevs2 = a("gait_deviations");
    if (gaitDevs2)              gaitParts.push(`Deviations: ${gaitDevs2}`);
    const gaitNotes2 = v("gait_notes") || v("gait_obs");
    if (gaitNotes2)             gaitParts.push(gaitNotes2);
    if (gaitParts.length) O_parts.push(`Gait Analysis:\n  ${gaitParts.join("\n  ")}.`);
  }


  // ── ADVANCED FUNCTIONAL SCREENS (v2) (*fs_data fields) ────────────────────────
  // Each functional screen stores: { findings: {testId_obsId: value}, grades: {testId: 0|1|2}, notes: {testId: string} }
  {
    const FS_REGIONS = [
      { key: "kfs_data",  label: "Knee Functional Screen" },
      { key: "lfs_data",  label: "Lumbar Functional Screen" },
      { key: "sfs_data",  label: "Shoulder Functional Screen" },
      { key: "hfs_data",  label: "Hip Functional Screen" },
      { key: "afs_data",  label: "Ankle Functional Screen" },
      { key: "thfs_data", label: "Thoracic Functional Screen" },
      { key: "elfs_data", label: "Elbow Functional Screen" },
      { key: "wffs_data", label: "Wrist/Hand Functional Screen" },
      { key: "tmjfs_data",label: "TMJ Functional Screen" },
      { key: "cfs_data",  label: "Cervical Functional Screen" },
    ];
    // Human-readable labels for functional screen test IDs
    const FS_TEST_LABELS = {
      kfs_squat:"Double Leg Squat", kfs_lunge:"Forward Lunge", kfs_step:"Lateral Step Down",
      kfs_step_down:"Step Down", kfs_single_leg:"Single Leg Squat", kfs_hop:"Single Leg Hop",
      lfs_flexion:"Lumbar Flexion", lfs_extension:"Lumbar Extension", lfs_sidebend:"Side Bend",
      lfs_squat:"Squat Pattern", lfs_rotation:"Lumbar Rotation",
      lfs_sts:"Sit-to-Stand", lfs_fwd:"Forward Bend", lfs_sls:"Single Leg Stance", lfs_step:"Step-Up",
      fms_sq:"Deep Squat", fms_hs:"Hurdle Step", fms_il:"Inline Lunge",
      fms_sm:"Shoulder Mobility", fms_aslr:"Active SLR", fms_tspu:"Trunk Stability Push-Up",
      fms_rs:"Rotary Stability",
      sfs_overhead:"Overhead Reach", sfs_scaption:"Scaption", sfs_push_up:"Push Up",
      sfs_irt:"Internal Rotation", sfs_ert:"External Rotation",
      hfs_squat:"Single Leg Squat", hfs_bridge:"Hip Bridge", hfs_clam:"Clamshell",
      hfs_step:"Step Down", hfs_lunge:"Lunge",
      afs_df:"Dorsiflexion Screen", afs_calf:"Calf Raise", afs_hop:"Hop & Stick", afs_squat:"Squat",
    };
    const fsLabel = (id) => FS_TEST_LABELS[id] || id.replace(/^[a-z]+fs_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const gradeLabel = (g) => g === 0 ? "Normal" : g === 1 ? "Compensated" : g === 2 ? "Abnormal" : `Grade ${g}`;
    const gradeFlag  = (g) => g === 0 ? "✅" : g === 1 ? "⚠️" : "🔴";
    FS_REGIONS.forEach(({ key, label }) => {
      const raw = data[key];
      if (!raw) return;
      let parsed;
      try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return; }
      const { findings = {}, grades = {}, notes = {} } = parsed;
      const gradeEntries = Object.entries(grades);
      const findingEntries = Object.entries(findings).filter(([,v]) => v && String(v).trim());
      if (!gradeEntries.length && !findingEntries.length) return;
      const fsLines = [];
      if (gradeEntries.length) {
        const abnormal    = gradeEntries.filter(([,g]) => g === 2).map(([id]) => fsLabel(id));
        const compensated = gradeEntries.filter(([,g]) => g === 1).map(([id]) => fsLabel(id));
        const normal      = gradeEntries.filter(([,g]) => g === 0).map(([id]) => fsLabel(id));
        if (abnormal.length)    fsLines.push(`  🔴 Abnormal: ${abnormal.join(", ")}`);
        if (compensated.length) fsLines.push(`  ⚠️  Compensated: ${compensated.join(", ")}`);
        if (normal.length && (abnormal.length || compensated.length))
          fsLines.push(`  ✅ Normal: ${normal.join(", ")}`);
      }
      if (!gradeEntries.length && findingEntries.length) {
        const positives = findingEntries.filter(([,v]) => {
          const s = String(v).toLowerCase();
          return s.includes("positive") || s.includes("present") || s.includes("abnormal") || s.includes("impaired") || s.includes("reduced") || s.includes("restricted") || s.includes("yes");
        }).map(([id,v]) => `${fsLabel(id)}: ${String(v).slice(0,60)}`);
        const allFindings = findingEntries.map(([id,v]) => `${fsLabel(id)}: ${String(v).slice(0,60)}`);
        const toShow = positives.length ? positives : allFindings.slice(0,6);
        if (toShow.length) fsLines.push(`  Findings: ${toShow.join("; ")}`);
      }
      const noteEntries = Object.entries(notes).filter(([,n]) => n && String(n).trim());
      if (noteEntries.length) fsLines.push(`  Notes: ${noteEntries.map(([id,n]) => `${fsLabel(id)}: ${String(n).slice(0,80)}`).join("; ")}`);
      if (fsLines.length) O_parts.push(`${label}:\n${fsLines.join("\n")}.`);
    });
  }

  // ── ERGONOMIC RISK ASSESSMENT ──────────────────────────────────────────────
  {
    const ergoTotal = v("ergo_total_score");
    const ergoCx    = v("ergo_cervical_risk");
    const ergoLx    = v("ergo_lumbar_risk");
    const ergoUcs   = v("ergo_ucs_risk");
    const ergoRsi   = v("ergo_rsi_risk");
    const ergoNerve = v("ergo_nerve_risk");
    if (ergoTotal || ergoCx || ergoLx) {
      const riskFlag = (s) => {
        const n = parseFloat(s);
        if (isNaN(n)) return s;
        return n >= 7 ? `${s} 🔴 HIGH` : n >= 4 ? `${s} ⚠️ MODERATE` : `${s} ✅ LOW`;
      };
      const ergoLines = [];
      if (ergoTotal)  ergoLines.push(`  Overall Ergonomic Risk: ${riskFlag(ergoTotal)}`);
      if (ergoCx)     ergoLines.push(`  Cervical Risk: ${riskFlag(ergoCx)}`);
      if (ergoLx)     ergoLines.push(`  Lumbar Risk: ${riskFlag(ergoLx)}`);
      if (ergoUcs)    ergoLines.push(`  UCS Risk: ${riskFlag(ergoUcs)}`);
      if (ergoRsi)    ergoLines.push(`  RSI Risk: ${riskFlag(ergoRsi)}`);
      if (ergoNerve)  ergoLines.push(`  Nerve Risk: ${riskFlag(ergoNerve)}`);
      const sittingHrs = v("ergo_sitting_hrs");
      if (sittingHrs) ergoLines.push(`  Sitting hours/day: ${sittingHrs}`);
      if (ergoLines.length) O_parts.push(`Ergonomic Assessment:\n${ergoLines.join("\n")}.`);
    }
  }

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

  // ── Clinician's own Clinical Impression (always first, always authoritative) ──
  const _ciItems = Array.isArray(data.clinical_impression) ? data.clinical_impression : [];
  if (_ciItems.length > 0) {
    const _ciPrimary = _ciItems.filter(x => x.tag === "primary");
    const _ciDiff    = _ciItems.filter(x => x.tag === "differential");
    const _ciRuled   = _ciItems.filter(x => x.tag === "ruledout");
    if (_ciPrimary.length)   A_parts.push("Working diagnosis: " + _ciPrimary.map(x => x.label + (x.icdCode ? ` (${x.icdCode})` : "") + (x.notes ? ` — ${x.notes}` : "")).join("; "));
    if (_ciDiff.length)      A_parts.push("Differentials considering: " + _ciDiff.map(x => x.label + (x.notes ? ` (${x.notes})` : "")).join("; "));
    if (_ciRuled.length)     A_parts.push("Ruled out: " + _ciRuled.map(x => x.label).join("; "));
    A_parts.push("");
  }

  // ── Try v6 engine first (new regional subjective) ──────────────────────────
  const _v6Regions = _soap_regions.length > 0 ? _soap_regions : null;
  const _v6Result = (_v6Regions && typeof runEngineV6 === "function")
    ? runEngineV6(data, _v6Regions)
    : null;

  // dx declared here so Plan section can access it regardless of which branch runs
  let dx = null;

  if (_v6Result?.regionResults?.length) {
    A_parts.push(_ciItems.length > 0
      ? "Clinical Decision Support (engine suggestions — review against your assessment):"
      : "CLINICAL IMPRESSION (Engine v6 — Ranked Differentials):");
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

  // NOTE: this section used to display the classic 7-movement FMS
  // (sp_fms_* flat fields) using dx.fmsTotal from generateDiagnosis --
  // removed as dead code (see the note in buildRealtimeSOAP's Functional
  // Movement Assessment section, and generateDiagnosis's FMS block, both
  // removed the same day this was found). Never written by any real UI;
  // the working Functional Assessment (FunctionalScreenHub) is handled
  // separately in the "Advanced Functional Screens (v2)" section above.


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

  // HEP (true home-protocol exercises only -- see HomeProtocolTab.jsx / QuickVisitForm)
  const hepArr = Array.isArray(data.hep_programme) ? data.hep_programme : [];
  if (hepArr.length) {
    P_parts.push("\nHome Exercise Programme:");
    hepArr.forEach((ex,i) => P_parts.push(`  ${i+1}. ${ex.name} — ${ex.customSets||ex.sets}×${ex.customReps||ex.reps}, hold ${ex.customHold||ex.hold}s, ${ex.customFreq||ex.freq}${ex.notes?` (${ex.notes})`:""}`));
  }

  // Exercise Prescription (clinical library picks, kept separate from HEP --
  // see ExercisePrescriptionModule)
  const rxArr = Array.isArray(data.tx_exercise_prescription) ? data.tx_exercise_prescription : [];
  if (rxArr.length) {
    P_parts.push("\nExercise Prescription:");
    rxArr.forEach((ex,i) => P_parts.push(`  ${i+1}. ${ex.name}${ex.phase?` (${ex.phase})`:""} — ${ex.customSets||ex.sets}×${ex.customReps||ex.reps}, hold ${ex.customHold||ex.hold}s, ${ex.customFreq||ex.freq}${ex.notes?` (${ex.notes})`:""}`));
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


// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SOAP NOTE MODULE v2 — Reference-style vertical card layout
// ═══════════════════════════════════════════════════════════════════════════════

function soapV(data, k) { return String(data[k] || "").trim(); }
// Same as soapV but WITHOUT trimming -- use this (never soapV) as the
// `value` of any live, actively-typed-into <input>/<textarea>. Trimming a
// controlled input's value on every keystroke eats a trailing space the
// instant it's typed, since "word " immediately re-renders back to "word".
function soapVRaw(data, k) { return String(data[k] || ""); }
function soapA(data, k) {
  const x = data[k];
  if (Array.isArray(x)) return x.filter(Boolean).join(", ");
  if (typeof x === "string") return x.split("|||").filter(Boolean).join(", ");
  return String(x || "");
}
function soapScan(data, suf) {
  const PXS = ["cx","lx","shl","shr","hp","knl","knr","af","ew","tx"];
  return PXS.flatMap(px => {
    const x = data[`${px}_${suf}`];
    return x ? String(x).split("|||").filter(Boolean) : [];
  }).filter(Boolean);
}
function nrsColor(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return "#888";
  if (v >= 7) return "#dc2626";
  if (v >= 4) return "#b45309";
  return "#059669";
}
function nrsBg(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return "#f5f5f5";
  if (v >= 7) return "#FEF2F2";
  if (v >= 4) return "#FFFBEB";
  return "#F0FDF4";
}
function romPct(val, norm) {
  const n = parseFloat(val);
  if (isNaN(n) || norm === 0) return null;
  return Math.round((n / norm) * 100);
}
function romStatusColor(pct) {
  if (pct === null) return "#888";
  if (pct < 50) return "#dc2626";
  if (pct < 75) return "#b45309";
  return "#059669";
}
// Was: mostly hardcoded lists of "example" field names per module (e.g. MMT
// checked only for "mmt_deltoid"/"mmt_biceps", which don't even match what
// MMTModule actually writes — it uses "mmt_<muscleId>_<side>" for whichever
// specific muscles get tested, e.g. "mmt_deltM_L"). A clinician who only
// tested muscles/movements NOT in that specific example list would have this
// silently report the module as untouched, even though real data was saved —
// which could make the SOAP note's "No objective findings recorded yet"
// placeholder appear even when e.g. MMT was actually fully documented.
// Fixed to scan every field by its actual prefix instead of a fixed example
// list, matching how the real SOAP-text builders elsewhere in this file
// already do it (see the `mmt_` scans in the Objective-section generator).
function detectModulesV2(data) {
  const has = (keys) => keys.some(k => data[k] && String(data[k]).trim() && String(data[k]).trim() !== "[]");
  const hasPrefix = (...prefixes) => Object.keys(data).some(k =>
    prefixes.some(p => k.startsWith(p)) && data[k] && String(data[k]).trim() && String(data[k]).trim() !== "[]");
  return {
    subjective: has(["cc_main","dem_name"]),
    rom: hasPrefix("rom_"),
    mmt: hasPrefix("mmt_","muscle_"),
    posture: has(["post_fhp","post_kyphosis","post_lordosis","post_pelvis","post_sh","post_scoliosis","post_notes",...Object.keys(data).filter(k=>k.startsWith("posture_defect_")&&data[k])]),
    postureAI: has(["sagFHPCm","cvaAngle","sagThorKyph","sagLumLord","fhpDevCm"]),
    palpation: has(["palp_pins","cx_palpation","lx_palpation","shr_palpation","knl_palpation","af_palpation"]),
    outcomes: hasPrefix("om_") || has(["ndi_score","psfs_score","koos_score","dash_score","lefs_score","om_odi_score"]),
    stt: hasPrefix("st_","cyriax_","cy_") || has(["cx_spurling","cx_distraction","lx_slr_l","lx_slr_r","shr_stt_empty_can"]),
    functional: has(["fl_work","fl_mobility","fl_self_care","fl_domestic","ar_goal_function"]),
    // Was missing myotomes ("myo_...") and reflexes ("n_ref_...", which
    // doesn't match "n_c"/"n_l"/"n_s"/"n_t") entirely — a patient with only
    // reflex or myotome findings recorded would have been reported as
    // "neuro not touched" even though real data existed.
    neuro: hasPrefix("neuro_","n_c","n_l","n_s","n_t","n_ref","myo_","nt_"),
    // Was only "gait_" — missed the real structured fields GaitModule
    // actually writes (ag_* abnormal patterns, g_*_dev phase deviations,
    // g_fac/g_dgi/etc scale scores), same class of gap as the SOAP text fix.
    gait: hasPrefix("gait_","ag_","g_ic","g_lr","g_ms","g_ts","g_ps","g_isw","g_msw","g_tsw","g_fac","g_dgi","g_fga","g_berg","g_tinetti","g_wgs","g_timed","g_oga"),
    kinetic: hasPrefix("kc_","kinetic_"),
    cpa: hasPrefix("nkt_") || has(["cx_cpa","lx_cpa","shr_cpa","knl_cpa","cpa_pattern","cpa_notes"]),
    fascia: hasPrefix("fa_","fascia_"),
    observation: Object.keys(data).some(k=>(k.startsWith("obs_")||k.includes("_observation"))&&data[k]&&String(data[k]).trim()),
  };
}

function SOAPNoteModule({ data, set, onNav, initialTab }) {
  // Note: fma_report / om_report are read directly from this patient's own scoped
  // record only. A previous version seeded these from global (non-patient-scoped)
  // localStorage keys as a fallback, which could leak one patient's functional-movement
  // or outcome-measure data into another patient's SOAP notes on the same browser.
  // That fallback has been removed.

  const [clinician, setClinician] = useState(data.soap_clinician || "");
  const [clinic,    setClinic]    = useState(data.soap_clinic    || "");
  const [session,   setSession]   = useState(data.soap_session   || "Initial Assessment");
  const [lockConfirm, setLockConfirm] = useState(false);
  const [lockSuccess, setLockSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState("S");
  const soapContainerRef = useRef(null);
  const [extraS, setExtraS] = useState(data.soap_extra_s || "");
  const [extraO, setExtraO] = useState(data.soap_extra_o || "");
  const [extraA, setExtraA] = useState(data.soap_extra_a || "");
  const [extraP, setExtraP] = useState(data.soap_extra_p || "");
  const lockedNotes = Array.isArray(data.soap_signed_notes) ? data.soap_signed_notes : [];
  const mods = useMemo(() => detectModulesV2(data), [data]);

  const v = (k) => soapV(data, k);
  const rv = (k) => soapVRaw(data, k); // for live-editable input/textarea value props -- see soapVRaw
  const a = (k) => soapA(data, k);
  const scan = (s) => soapScan(data, s);

  // Patient info
  const name     = v("dem_name") || "Patient";
  const age      = v("dem_age");
  const sex      = v("dem_sex") || v("dem_gender");
  const phone    = v("dem_phone") || v("dem_mobile");
  const patId    = v("dem_id") || v("patient_id");
  const dob      = v("dem_dob");
  const therapist= clinician || v("soap_clinician");
  const vasNow   = v("cc_vas_now") || v("pa_vas_now");
  const vasWorst = v("cc_vas_worst") || v("pa_vas_worst");
  const vasBest  = v("cc_vas_best") || v("pa_vas_best");
  const cc       = v("cc_main");
  const onset    = a("cc_onset");
  const dur      = a("cc_duration");
  const loc      = [scan("loc").join(", "), scan("location").join(", "), a("cc_location")].filter(Boolean)[0] || "";
  const rad      = [scan("radiation").join(", "), a("cc_radiation")].filter(s => s && !s.toLowerCase().includes("no radiation")).join(", ");
  const agg      = [...scan("agg_mov"), ...scan("agg_post"), ...scan("agg_act"), a("cc_agg"), a("agg_movement"), a("agg_posture"), a("agg_activity")].filter(Boolean);
  const ease     = [...scan("rel_mov"), ...scan("rel_manual"), a("cc_rel"), a("rel_posture"), a("rel_manual")].filter(Boolean);
  const morning  = [...scan("sb_morning"), ...scan("morning"), a("sb_morning")].filter(Boolean)[0] || "";
  const night    = [...scan("sb_night"),   ...scan("night"),   a("sb_night")  ].filter(Boolean)[0] || "";
  const phx      = a("pmh_conditions") || a("phx_conditions");
  const meds     = a("med_current") || v("meds_current");
  const goals_ar = [v("ar_goal_pain"), v("ar_goal_function"), v("ar_goal_return"), v("ar_goal_sport")].filter(Boolean);
  const dx       = v("soap_a_diagnosis") || v("soap_assessment");
  const icd      = v("soap_icd10");
  const probList = v("soap_problem_list");
  const clinNotes= v("soap_clinical_notes");
  const stGoals  = v("soap_goal_short");
  const ltGoals  = v("soap_goal_long");
  const totalSess= v("soap_total_sessions");
  // Real logged sessions (used by the header's session-progress bar) —
  // same shape as buildRealtimeSOAP's own txSessArr elsewhere in this file.
  const txSessArr = Array.isArray(data.tx_sessions) ? data.tx_sessions : [];
  const freq     = v("soap_frequency");
  const precautions = v("soap_precautions");
  const referral = v("soap_referral");
  const imaging  = v("soap_imaging");
  const modalities = a("soap_modalities") || a("tx_modalities");

  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  // Red flags
  const rfMap = {
    s_red1:"Unexplained weight loss",s_red2:"Night sweats/fever",s_red3:"Cancer history",
    s_red4:"Bilateral neural symptoms",s_red5:"Bowel/bladder dysfunction",s_red6:"Saddle anaesthesia",
    s_red7:"Progressive neuro deficit",lx_rf_cauda:"Cauda equina screen",
    cx_rf_myelopathy:"Myelopathy screen",cx_rf_vbi:"VBI screen",
  };
  const redFlags = Object.entries(rfMap).filter(([k]) => {
    const val = String(data[k]||"").toLowerCase();
    return val && !val.includes("no ") && !val.includes("negative") && !val.includes("proceed") && !val.includes("none") && !val.includes("no cauda") && !val.includes("no myelopathy") && !val.includes("no vbi");
  }).map(([,label]) => label);

  // Functional limitations
  const flChips = [a("fl_work"),a("fl_mobility"),a("fl_self_care"),a("fl_domestic")].filter(Boolean).flatMap(s=>s.split(",").map(x=>x.trim()).filter(Boolean));

  // Posture defects
  const postDefectList = [
    ["forward_head","Forward Head Posture"],["rounded_shoulders","Rounded/Protracted Shoulders"],
    ["thoracic_kyphosis","Increased Thoracic Kyphosis"],["lumbar_hyperlordosis","Lumbar Hyperlordosis"],
    ["anterior_pelvic_tilt","Anterior Pelvic Tilt"],["posterior_pelvic_tilt","Posterior Pelvic Tilt"],
    ["genu_valgum","Genu Valgum"],["genu_varum","Genu Varum"],
    ["foot_pronation","Foot Overpronation"],["foot_supination","Foot Supination"],
    ["scoliosis","Scoliosis"],["head_tilt","Lateral Head Tilt"],["scapular_winging","Scapular Winging"],
  ].filter(([id]) => data[`posture_defect_${id}`]);

  // Observation chips (regional)
  const obsChips = ["cx","lx","shr","shl","knl","knr","af","hp"].flatMap(px => {
    const obs = v(`${px}_observation`);
    return obs ? obs.split("|||").filter(Boolean).map(o=>({region:px.toUpperCase(), text:o})) : [];
  });
  const postureTextFields = [
    ["Head/cervical", v("post_fhp")],["Thoracic",v("post_kyphosis")],
    ["Lumbar",v("post_lordosis")],["Pelvis",v("post_pelvis")],
    ["Shoulders",v("post_sh")],["Scoliosis",v("post_scoliosis")],
  ].filter(([,val])=>val);

  // ROM rows
  const romRows = useMemo(() => {
    const rv = (k) => {
      // Standard field: rom_lflex / rom_lflex_arom
      const std = v("rom_"+k+"_arom") || v("rom_"+k);
      if (std) return std;
      // Regional prefix style: rom_lx_flex, rom_cx_flex etc.
      const regionMap = {
        lflex:"lx_flex",lext:"lx_ext",lrotr:"lx_rot_r",lrotl:"lx_rot_l",
        cflex:"cx_flex",cext:"cx_ext",crotr:"cx_rot_r",crotl:"cx_rot_l",
        clatr:"cx_lat_r",clatl:"cx_lat_l",thflex:"tx_flex",thext:"tx_ext",
      };
      if (regionMap[k]) { const alt = v("rom_"+regionMap[k]); if (alt) return alt; }
      return "";
    };
    const rvS = (k,s) => {
      const sfxs = s==="L" ? ["_L_arom","_left","_L"] : ["_R_arom","_right","_R"];
      const std = sfxs.map(sfx=>v("rom_"+k+sfx)).find(x=>x);
      if (std) return std;
      // Regional prefix style: rom_knl_flex_L, rom_shr_flex_L, etc.
      const regionMap2 = { sflex:"shr_flex",sabd:"shr_abd",ser:"shr_er",sir:"shr_ir",
        hflex:"hp_flex",kflex:"knl_flex",adf:"af_df",apf:"af_pf",eflex:"ew_flex",wflex:"wr_flex" };
      if (regionMap2[k]) {
        const side = s==="L"?"_L":"_R";
        return v("rom_"+regionMap2[k]+side) || v("rom_"+regionMap2[k]+"_"+s.toLowerCase()) || "";
      }
      return "";
    };
    // Was a short (~22 movement) hardcoded list, same class of gap as the
    // plain-text SOAP builder had — widened to every movement ROM_DATA
    // actually defines (see ROM_DERIVED above), so this table can't silently
    // omit a recorded movement either. `key` here is the short id without
    // the "rom_" prefix, since rv()/rvS() above add that themselves.
    const rows = [];
    ROM_DERIVED.filter(m => !m.bilateral).forEach(({label, key, norm}) => {
      const shortKey = key.replace(/^rom_/, "");
      const val = rv(shortKey);
      if (val) { const p = romPct(val, norm); rows.push({label, single: val, norm, pct: p, bilateral: false}); }
    });
    ROM_DERIVED.filter(m => m.bilateral).forEach(({label, key, norm}) => {
      const shortKey = key.replace(/^rom_/, "");
      const vl = rvS(shortKey, "L"), vr = rvS(shortKey, "R");
      if (vl || vr) { rows.push({label, l: vl, r: vr, norm, bilateral: true}); }
    });
    return rows;
  }, [data]);

  // MMT rows
  const mmtRows = useMemo(() => {
    const MMT_LBL = {
      // Same staleness problem as MMT_LABELS above (this is a second,
      // separately hand-maintained MMT label map used for the table-row view
      // instead of the plain-text SOAP paragraph) — same fix: derive full
      // coverage from MMT_DATA first, hand-written entries below still take
      // precedence if they overlap.
      ...MMT_DATA_LABELS,
      // Trunk / Core
      mmt_ra:"Rectus Abdominis",mmt_eo:"External Oblique",mmt_ia:"Internal Oblique",
      mmt_multif:"Multifidus",mmt_es:"Erector Spinae",mmt_ql:"Quadratus Lumborum",
      mmt_diaphragm:"Diaphragm",
      // Neck
      mmt_scm:"Sternocleidomastoid",mmt_dnf:"Deep Neck Flexors",mmt_scalenes:"Scalenes",
      mmt_dnf_l:"Deep Neck Flexors",mmt_dnf_r:"Deep Neck Flexors",
      // Scapular / Shoulder
      mmt_trap_u:"Upper Trapezius",mmt_trap_m:"Mid Trapezius",mmt_trap_l:"Lower Trapezius",
      mmt_trapU:"Upper Trapezius",mmt_trapM:"Mid Trapezius",mmt_trapL:"Lower Trapezius",
      mmt_levsc:"Levator Scapulae",mmt_serrant:"Serratus Anterior",
      mmt_rhomb:"Rhomboids",mmt_pec_min:"Pectoralis Minor",
      mmt_pec_maj_c:"Pec Maj (Clavicular)",mmt_pec_maj_s:"Pec Maj (Sternal)",
      mmt_deltA:"Anterior Deltoid",mmt_deltM:"Middle Deltoid",mmt_deltP:"Posterior Deltoid",
      mmt_deltoid:"Deltoid",mmt_deltoid_l:"Deltoid",mmt_deltoid_r:"Deltoid",
      mmt_rc:"Rotator Cuff",mmt_rc_l:"Rotator Cuff",mmt_rc_r:"Rotator Cuff",
      mmt_supra:"Supraspinatus",mmt_infra:"Infraspinatus",mmt_subscap:"Subscapularis",
      mmt_tmin:"Teres Minor",mmt_tmaj:"Teres Major",mmt_lat:"Latissimus Dorsi",
      mmt_corbrach:"Coracobrachialis",
      // Elbow / Forearm
      mmt_bicep:"Biceps Brachii",mmt_biceps:"Biceps Brachii",
      mmt_biceps_l:"Biceps Brachii",mmt_biceps_r:"Biceps Brachii",
      mmt_brach:"Brachialis",mmt_brachio:"Brachioradialis",
      mmt_tricep:"Triceps Brachii",mmt_triceps:"Triceps Brachii",
      mmt_triceps_l:"Triceps Brachii",mmt_triceps_r:"Triceps Brachii",
      mmt_supinator:"Supinator",mmt_sup:"Supinator",mmt_pt:"Pronator Teres",mmt_pron_ter:"Pronator Teres",
      // Wrist / Hand
      mmt_fcr:"Wrist Flex (FCR)",mmt_fcu:"Wrist Flex (FCU)",
      mmt_ecrl:"Wrist Ext (ECRL)",mmt_ecrb:"Wrist Ext (ECRB)",mmt_ecu:"Wrist Ext (ECU)",
      mmt_wr_ext:"Wrist Extensors",mmt_wr_ext_l:"Wrist Extensors",mmt_wr_ext_r:"Wrist Extensors",
      mmt_edc:"Finger Extensors",mmt_fdp:"FDP",mmt_fds:"FDS",
      mmt_apbrev:"Abductor Pollicis Brevis",mmt_adpoll:"Adductor Pollicis",mmt_oppoll:"Opponens Pollicis",
      mmt_lumb:"Lumbricals",mmt_interos:"Interossei",
      // Hip / Pelvis
      mmt_iliop:"Iliopsoas",mmt_psoas:"Iliopsoas",mmt_piri:"Piriformis",
      mmt_hip_flex:"Hip Flexors",mmt_hip_flex_l:"Hip Flexors",mmt_hip_flex_r:"Hip Flexors",
      mmt_gmax:"Gluteus Maximus",mmt_glut_max:"Gluteus Maximus",
      mmt_glut_max_l:"Gluteus Maximus",mmt_glut_max_r:"Gluteus Maximus",
      mmt_gmed:"Gluteus Medius",mmt_glut_med:"Gluteus Medius",
      mmt_glut_med_l:"Gluteus Medius",mmt_glut_med_r:"Gluteus Medius",
      mmt_gmin:"Gluteus Minimus",mmt_tfl:"TFL",
      mmt_adduc:"Hip Adductors",
      // Knee / Thigh
      mmt_rectfem:"Rectus Femoris",
      mmt_quad:"Quadriceps",mmt_quad_l:"Quadriceps",mmt_quad_r:"Quadriceps",
      mmt_hamst:"Hamstrings",mmt_hamstr:"Hamstrings",
      mmt_hams:"Hamstrings",mmt_hams_l:"Hamstrings",mmt_hams_r:"Hamstrings",
      mmt_semit:"Semitendinosus",
      // Ankle / Foot
      mmt_ta:"Tibialis Anterior",mmt_tib_ant:"Tibialis Anterior",
      mmt_tib_ant_l:"Tibialis Anterior",mmt_tib_ant_r:"Tibialis Anterior",
      mmt_gastroc:"Gastrocnemius",mmt_gastroc_l:"Gastrocnemius",mmt_gastroc_r:"Gastrocnemius",
      mmt_soleus:"Soleus",mmt_tp:"Tibialis Posterior",
      mmt_peronls:"Peroneals",mmt_ehl:"Ext Hallucis Longus (L5)",
      mmt_ehl_l:"Ext Hallucis Longus (L5)",mmt_ehl_r:"Ext Hallucis Longus (L5)",
      mmt_edl:"EDL",mmt_abdhal:"Abductor Hallucis",mmt_fdl:"FDL/FHL",
    };
    const MMT_GRADE_LBL = {"5":"Normal","5/5":"Normal","4+":"Good+","4+/5":"Good+","4":"Good","4/5":"Good","3+":"Fair+","3+/5":"Fair+","3":"Fair","3/5":"Fair","2":"Poor","2/5":"Poor","1":"Trace","1/5":"Trace","0":"Zero","0/5":"Zero"};
    const fields = Object.entries(data)
      .filter(([k])=>k.startsWith("muscle_")||k.startsWith("mmt_"))
      .map(([k,v2])=>{
        const raw = String(v2||"");
        // Match both uppercase (L/R) and lowercase (l/r) side suffixes
        const sideMatch = k.match(/_([LRlr])$/);
        const side = sideMatch ? " ("+sideMatch[1].toUpperCase()+")" : "";
        const base = k.replace(/_[LRlr]$/, "");
        // Handle double-prefix keys (mmt_mmt_ta_L)
        const strippedBase = base.startsWith("mmt_mmt_") ? base.replace("mmt_mmt_","mmt_") : base;
        const label = MMT_LBL[k] || MMT_LBL[base] || MMT_LBL[strippedBase] || mmtFallbackLabel(strippedBase.replace(/^(muscle_|mmt_)/,""));
        return [label, side, raw, MMT_GRADE_LBL[raw.trim()]||""];
      })
      .filter(([,,v2])=>v2);
    const neuroWeak = v("neuro_weakness");
    if(neuroWeak) fields.push(["Neurological Weakness","","(see neuro section)","—"]);
    return fields.slice(0,12);
  }, [data]);

  // STT rows
  const sttRows = useMemo(() => {
    const rows = [];
    // Comprehensive label map: short-form, long-form, lx_* aliases all included
    const ST_NAMES = {
      // Same fix as ST_LABEL_MAP above — full coverage from ST_DATA_LABELS,
      // hand-curated entries below still take precedence where present.
      ...ST_DATA_LABELS,
      // Lumbar / Neural
      "st_slr":"Straight Leg Raise","st_slr_test":"Straight Leg Raise",
      "st_crossed_slr":"Crossed SLR","st_well_leg_raise":"Well Leg Raise",
      "st_slump":"Slump Test","st_slump_test":"Slump Test",
      "st_prone_instability":"Prone Instability Test","st_prone_instab":"Prone Instability Test",
      "st_kemp":"Kemp's Test","st_stork":"Stork Test","st_adams":"Adam's Forward Bend",
      "st_valsalva":"Valsalva Manoeuvre","st_lateral_shift":"Lateral Shift",
      "st_femoral_nerve":"Femoral Nerve Stretch","st_femoral_nerve_stretch":"Femoral Nerve Stretch",
      // lx_* aliases
      "lx_kemp":"Kemp's Test","lx_slump":"Slump Test",
      "lx_slr":"Straight Leg Raise","lx_slr_left":"SLR (Left)","lx_slr_right":"SLR (Right)",
      "lx_prone_instab":"Prone Instability Test","lx_prone":"Prone Instability Test",
      // SIJ
      "st_faber":"FABER / Patrick's Test","st_faber_test":"FABER / Patrick's Test",
      "st_fadir":"FADIR Test","st_fadir_test":"FADIR Test",
      "st_thigh_thrust":"Thigh Thrust","st_gaenslen":"Gaenslen's Test",
      "st_si_distraction":"SI Distraction","st_si_compression":"SI Compression",
      "st_sacral_compression":"Sacral Compression","st_sacral_distraction":"Sacral Distraction",
      // Cervical
      "st_spurling":"Spurling's Test","st_distraction":"Cervical Distraction",
      "st_sharp_purser":"Sharp-Purser Test","st_vbi":"VBI Screen",
      "st_alar":"Alar Ligament Test","st_flex_rot":"Flexion-Rotation Test",
      "st_jackson":"Jackson's Compression","st_axial_loading":"Axial Loading",
      "st_ultt1":"ULTT1 (Median)","st_ultt2":"ULTT2 (Radial)","st_ultt3":"ULTT3 (Ulnar)",
      "st_babinski":"Babinski Sign","st_hoffmanns":"Hoffmann's Sign","st_hoffmann":"Hoffmann's Sign",
      "st_clonus":"Clonus",
      // Shoulder
      "st_neer":"Neer's Test","st_hawkins":"Hawkins-Kennedy","st_hawkins_kennedy":"Hawkins-Kennedy",
      "st_empty_can":"Empty Can (Jobe)","st_full_can":"Full Can Test",
      "st_lift_off":"Lift-Off (Gerber)","st_belly_press":"Belly Press",
      "st_bear_hug":"Bear Hug","st_er_lag":"ER Lag Sign","st_hornblower":"Hornblower's Sign",
      "st_obrien":"O'Brien's Test","st_speeds":"Speed's Test","st_yergason":"Yergason's Test",
      "st_apprehension":"Apprehension Test","st_relocation":"Relocation Test","st_sulcus":"Sulcus Sign",
      "st_acromioclavicular":"AC Paxinos Test","st_cross_arm":"Cross-Arm Test",
      "st_painful_arc":"Painful Arc","st_drop_arm":"Drop Arm Test",
      // Elbow
      "st_cozens":"Cozen's Test","st_mills":"Mill's Test","st_golfers":"Golfer's Elbow Test",
      "st_maudsley":"Maudsley's Test","st_tinel_elbow":"Tinel's (Elbow)",
      "st_elbow_flexion_test":"Elbow Flexion Test",
      // Wrist/Hand
      "st_phalen":"Phalen's Test","st_tinel_wrist":"Tinel's (Wrist)",
      "st_finkelstein":"Finkelstein's Test","st_watson":"Watson Scaphoid Shift",
      "st_carpal_compression":"Carpal Compression Test",
      // Hip
      "st_hip_scour":"Hip Scour","st_scour":"Hip Scour / Quadrant",
      "st_trendelenburg":"Trendelenburg Test","st_trendelenburg_test":"Trendelenburg Test",
      "st_thomas_test":"Thomas Test","st_ober":"Ober's Test","st_ober_test":"Ober's Test",
      "st_piriformis":"Piriformis (FAIR)","st_piriformis_test":"Piriformis (FAIR)",
      "st_90_90":"90-90 Hamstring Test",
      // Knee
      "st_lachman":"Lachman's Test","st_lachmans":"Lachman's Test",
      "st_anterior_drawer":"Anterior Drawer","st_posterior_drawer":"Posterior Drawer",
      "st_pivot_shift":"Pivot Shift Test","st_valgus_stress":"Valgus Stress Test",
      "st_valgus_stress_knee":"Valgus Stress Test","st_varus_stress_knee":"Varus Stress Test",
      "st_mcmurray":"McMurray's Test","st_mcmurray_test":"McMurray's Test",
      "st_apley":"Apley's Grind","st_thessaly":"Thessaly Test",
      "st_clarkes":"Clarke's Sign","st_patellar_grind":"Patellar Grind",
      "st_effusion":"Ballottement Test","st_noble":"Noble Compression",
      // Ankle/Foot
      "st_ant_drawer_ankle":"Anterior Drawer (Ankle)","st_anterior_drawer_ankle":"Anterior Drawer (Ankle)",
      "st_talar_tilt":"Talar Tilt Test","st_squeeze_ankle":"Squeeze/Mortise Test",
      "st_thompson":"Thompson's Test","st_thompson_test":"Thompson's Test",
      "st_windlass":"Windlass Test","st_windlass_test":"Windlass Test",
      "st_navicular_drop":"Navicular Drop","st_tinel_ankle":"Tinel's (Ankle)",
      "st_royal_london":"Royal London Hospital Test","st_ottawa_ankle":"Ottawa Ankle Rules",
    };
    // Label helper: map key -> clinical name, fallback to auto-format
    const stLabel = (k) => ST_NAMES[k] || k.replace(/^(st_|lx_)/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
    // Scan both st_* and lx_* keys; collapse bilateral _left/_right variants
    const seen = new Set();
    Object.keys(data).forEach(k => {
      const isStKey = k.startsWith("st_") || k.startsWith("lx_");
      if (!isStKey) return;
      const base = k.replace(/_left$|_right$/, "");
      if (seen.has(base)) return;
      seen.add(base);
      const left   = v(base+"_left");
      const right  = v(base+"_right");
      const single = v(base);
      const combined = [left&&`L: ${left}`, right&&`R: ${right}`].filter(Boolean).join(" / ") || single;
      if (!combined) return;
      rows.push({key:base, name:stLabel(base), sig:"", val:combined});
    });
    return rows;
  }, [data]);

  // Neuro rows — includes both neuro_* fields and actual n_* dermatome/myotome/reflex fields
  const neuroRows = useMemo(() => {
    const rows = [];
    // Standard fields
    if(v("neuro_dermatomal")) rows.push({label:"Dermatomal pattern",val:v("neuro_dermatomal")});
    if(v("neuro_sensation"))  rows.push({label:"Sensation",val:v("neuro_sensation")});
    if(v("neuro_weakness"))   rows.push({label:"Motor weakness",val:v("neuro_weakness")});
    if(v("neuro_reflex_biceps"))  rows.push({label:"Biceps reflex (C5/6)",val:v("neuro_reflex_biceps")});
    if(v("neuro_reflex_triceps")) rows.push({label:"Triceps reflex (C7)",val:v("neuro_reflex_triceps")});
    if(v("neuro_reflex_knee"))    rows.push({label:"Knee reflex (L3/4)",val:v("neuro_reflex_knee")});
    if(v("neuro_reflex_ankle"))   rows.push({label:"Ankle reflex (S1)",val:v("neuro_reflex_ankle")});
    if(v("neuro_babinski"))   rows.push({label:"Babinski",val:v("neuro_babinski")});
    if(v("cx_ultt_a")||v("ultt_a")) rows.push({label:"UL tension test A",val:v("cx_ultt_a")||v("ultt_a")});
    if(v("cx_ultt_b")||v("ultt_b")) rows.push({label:"UL tension test B",val:v("cx_ultt_b")||v("ultt_b")});
    // Dermatomes — was a hardcoded 15-level list missing S3/S4-5 and
    // including a phantom "t2" that doesn't exist; now derived from the
    // real DERMATOMES data (16 real levels).
    DERMATOMES.forEach(d => {
      const left  = v(`${d.id}_left`);
      const right = v(`${d.id}_right`);
      if (left && right && left !== right) rows.push({label:`Dermatome ${d.level}`,val:`L: ${left} / R: ${right}`});
      else if (left)  rows.push({label:`Dermatome ${d.level}`,val:left});
      else if (right) rows.push({label:`Dermatome ${d.level} (R)`,val:right});
    });
    // Myotomes — was reading "n_<lvl>_motor" / "n_myo_<lvl>", neither of
    // which matches what NeurologicalModule actually writes
    // ("myo_<slug>_left/right") — could never have shown real data. Now
    // derived from MYOTOMES with the same slug NeurologicalModule uses.
    MYOTOMES.forEach(m => {
      const slug = "myo_" + m.level.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const left = v(`${slug}_left`), right = v(`${slug}_right`);
      if (left && right && left !== right) rows.push({label:`Myotome ${m.level}`,val:`L: ${left} / R: ${right}`});
      else if (left)  rows.push({label:`Myotome ${m.level}`,val:left});
      else if (right) rows.push({label:`Myotome ${m.level} (R)`,val:right});
    });
    // Reflexes — was reading "n_biceps" etc (wrong prefix/spelling, no side
    // suffix) instead of the real "<REFLEXES id>_left/right" — same
    // complete-miss bug as myotomes. Now derived from REFLEXES.
    REFLEXES.forEach(r => {
      const left = v(`${r.id}_left`), right = v(`${r.id}_right`) || v(r.id);
      if (left) rows.push({label:`${r.label} (L)`, val:left});
      if (right) rows.push({label:`${r.label} (R)`, val:right});
    });
    // Neural tension tests — real keys need the _left/_right suffix, which
    // this never added before.
    NEURAL_TENSION.forEach(nt => {
      const left = v(`${nt.id}_left`), right = v(`${nt.id}_right`);
      if (left) rows.push({label:`${nt.label} (L)`, val:left});
      if (right) rows.push({label:`${nt.label} (R)`, val:right});
    });
    if(v("neuro_clinician_notes")) rows.push({label:"Clinical notes",val:v("neuro_clinician_notes")});
    return rows;
  }, [data]);

  // Palpation
  const palpPins = useMemo(() => { try { return JSON.parse(data.palp_pins||"[]"); } catch { return []; } }, [data]);
  const palpText = ["cx","lx","shr","shl","knl","knr","af"].map(px=>[px.toUpperCase(),v(px+"_palpation")]).filter(([,val])=>val);

  // Outcome measures — reads all om_* fields + session report
  const omRows = useMemo(() => {
    const rows = [];
    // Direct score fields
    if(v("ndi_score")||v("om_ndi_score"))   rows.push({name:"NDI",  score:v("ndi_score")||v("om_ndi_score"),  max:"50",  note:"Neck Disability Index"});
    if(v("psfs_score"))                      rows.push({name:"PSFS", score:v("psfs_score"), max:"10",  note:"Patient-Specific Functional"});
    if(v("koos_score"))                      rows.push({name:"KOOS", score:v("koos_score"), max:"100", note:"Knee Injury & OA"});
    if(v("dash_score")||v("om_dash_score")) rows.push({name:"DASH", score:v("dash_score")||v("om_dash_score"), max:"100", note:"Arm/Shoulder/Hand"});
    if(v("lefs_score")||v("om_lefs_score")) rows.push({name:"LEFS", score:v("lefs_score")||v("om_lefs_score"), max:"80",  note:"Lower Extremity Functional"});
    if(v("om_odi_score"))                   rows.push({name:"ODI",  score:v("om_odi_score"), max:"100%", note:"Oswestry Disability"});
    // om_report from session
    const omR = data.om_report;
    if(omR?.scores) Object.entries(omR.scores).slice(0,5).forEach(([k,s])=>{
      if(!rows.find(r=>r.name===k.toUpperCase())) rows.push({name:k.toUpperCase(),score:String(s),max:"",note:""});
    });
    // PSFS activities (om_psfs_*)
    [1,2,3].forEach(i=>{
      const act=v(`om_psfs_${i}_activity`)||v(`psfs_act_${i}`);
      const sc=v(`om_psfs_${i}_now`)||v(`psfs_now_${i}`);
      if(act&&sc) rows.push({name:`PSFS: ${String(act).slice(0,20)}`,score:sc,max:"10",note:"Patient-Specific"});
    });
    // NDI items summary if no total
    if(!rows.find(r=>r.name==="NDI")) {
      const ndiVals=[1,2,3,4,5,6,7,8,9,10].map(i=>Number(v(`om_ndi_${i}`)||0));
      const ndiTotal=ndiVals.reduce((a,b)=>a+b,0);
      if(ndiTotal>0) rows.push({name:"NDI",score:String(ndiTotal),max:"50",note:"Neck Disability Index"});
    }
    return rows;
  }, [data]);

  // Positive/negative findings for Assessment
  const posFindings = useMemo(() => {
    const f=[];
    sttRows.forEach(t=>{const lc=t.val.toLowerCase();if(lc.includes("positive")||lc.includes("+ve"))f.push(t.name+(t.sig?" +ve ("+t.sig+")":" +ve"));});
    romRows.forEach(r=>{
      if(r.single){const p=romPct(r.single,r.norm);if(p&&p<75)f.push(r.label+": "+r.single+"° / "+r.norm+"° norm");}
      if(r.bilateral){const pl=romPct(r.l,r.norm),pr=romPct(r.r,r.norm);if(pl&&pl<75)f.push(r.label+" L: "+r.l+"°");if(pr&&pr<75)f.push(r.label+" R: "+r.r+"°");}
    });
    neuroRows.forEach(n=>{const lc=n.val.toLowerCase();if(lc.includes("reduced")||lc.includes("weak")||lc.includes("absent"))f.push(n.label+": "+n.val.slice(0,40));});
    if(redFlags.length) f.push("Red flags: "+redFlags.join(", "));
    return f.slice(0,8);
  }, [sttRows,romRows,neuroRows,redFlags]);

  const negFindings = useMemo(() => {
    const f=[];
    sttRows.forEach(t=>{const lc=t.val.toLowerCase();if(lc.includes("negative")||lc.includes("-ve"))f.push(t.name+" -ve");});
    neuroRows.forEach(n=>{const lc=n.val.toLowerCase();if(lc.includes("intact")||lc.includes("normal")||lc.includes("5/5"))f.push(n.label+": "+n.val.slice(0,30));});
    if(!redFlags.length) f.push("Red flags — nil");
    return f.slice(0,6);
  }, [sttRows,neuroRows,redFlags]);

  const handleSign = () => {
    if(!lockConfirm){setLockConfirm(true);return;}
    const soap = buildRealtimeSOAP(data, extraS, extraO, extraA, extraP);
    const now = new Date();
    const note = {
      id:Date.now(), session, clinician, clinic,
      lockedAt:now.toISOString(),
      lockedAtDisplay:now.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+" "+now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
      S:soap.S, O:soap.O, A:soap.A, P:soap.P, vasNow, dx, icd,
    };
    const existing = Array.isArray(data.soap_signed_notes)?data.soap_signed_notes:[];
    set("soap_signed_notes",[...existing,note]);
    set("soap_clinician",clinician); set("soap_clinic",clinic); set("soap_session",session);
    setLockConfirm(false); setLockSuccess(true);
    setTimeout(()=>setLockSuccess(false),3000);
  };

  // Module count for progress
  const MOD_KEYS = ["subjective","rom","mmt","posture","postureAI","palpation","outcomes","stt","functional","neuro","gait","kinetic","cpa","fascia"];
  const doneCount = MOD_KEYS.filter(k=>mods[k]).length;

  // ── Styles ──
  const wrap  = { fontFamily:"inherit", fontSize:14.5, paddingBottom:24 };
  const card  = (border="#E5E7EB", accent=null) => ({ background:"#fff", border:`1px solid ${border}`, borderRadius:16, marginBottom:12, overflow:"hidden", boxShadow:"0 2px 6px rgba(0,0,0,0.06)", ...(accent?{borderLeft:`3px solid ${accent}`}:{}) });
  const ch    = (bg="#fff") => ({ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:bg,borderBottom:"1px solid #F3F4F6" });
  const secIcon = (bg,cl,emoji) => <div style={{width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,color:cl}}>{emoji}</div>;
  const secTitle = (t,sub,col="#fff") => <div><div style={{fontSize:14.5,fontWeight:700,color:col,letterSpacing:"0.1px"}}>{t}</div>{sub&&<div style={{fontSize:12,color:col==="white"||col==="#fff"?"rgba(255,255,255,0.65)":"#6B7280",marginTop:1}}>{sub}</div>}</div>;
  const secBadge = (t,col="rgba(255,255,255,0.75)",bg="rgba(255,255,255,0.15)",border="rgba(255,255,255,0.25)") => <div style={{marginLeft:"auto",fontSize:12,color:col,background:bg,border:`1px solid ${border}`,borderRadius:20,padding:"2px 10px",flexShrink:0,fontWeight:500}}>{t}</div>;
  const cb    = { padding:"12px 14px" };
  const lbl   = { fontSize:13,color:"#9CA3AF",fontWeight:500,marginBottom:4,display:"block" };
  const val_  = { fontSize:14.5,color:"#111827",lineHeight:1.5 };
  const row   = { borderBottom:"1px solid #F3F4F6",padding:"8px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,fontSize:14.5 };
  const chip_ = (bg,cl) => ({ display:"inline-block",padding:"3px 10px",borderRadius:100,background:bg,color:cl,fontSize:13,fontWeight:500,margin:"2px 3px 2px 0" });
  // Small grouped card used WITHIN a section (S/O/A/P), so related fields
  // (e.g. chief complaint, or "worse with" / "better with") read as one
  // scannable block on a phone instead of a long unbroken column of labels.
  const subCard = (accent="#E5E7EB") => ({ background:"#fff", borderRadius:10, borderLeft:`3px solid ${accent}`, padding:"8px 10px", marginBottom:8 });
  const subLbl  = { fontSize:13,color:"#9CA3AF",fontWeight:500,marginBottom:4,display:"block" };
  const bullet  = (text,i) => <div key={i} style={{fontSize:14.5,color:"#374151",lineHeight:1.9}}>&bull; {text}</div>;
  const inp   = { width:"100%",border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 10px",fontSize:16,fontFamily:"inherit",outline:"none",color:"#111827",background:"#FAFAFA",marginBottom:4,boxSizing:"border-box" };
  const subH  = (label, col="#334155") => (
    <div style={{display:"flex",alignItems:"center",gap:6,background:col,padding:"8px 14px",marginTop:14,marginBottom:8,borderRadius:10}}>
      <span style={{fontSize:13,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</span>
    </div>
  );
  const na    = { fontSize:14.5,color:"#9CA3AF",fontStyle:"italic",padding:"4px 0" };
  const thS   = { padding:"5px 8px",fontSize:12,color:"#9CA3AF",textAlign:"left",borderBottom:"1px solid #F3F4F6",fontWeight:500 };
  const tdS   = { padding:"5px 8px",borderBottom:"1px solid #F9FAFB",fontSize:14.5,color:"#111827",verticalAlign:"top" };
  const tbl   = { width:"100%",borderCollapse:"collapse" };

  return (
    <div style={wrap} ref={soapContainerRef} onScroll={()=>{
      const sections = [{id:"S",el:"soap-sec-S"},{id:"O",el:"soap-sec-O"},{id:"A",el:"soap-sec-A"},{id:"P",el:"soap-sec-P"}];
      const container = soapContainerRef.current;
      if(!container) return;
      const scrollTop = container.scrollTop + 120;
      let active = "S";
      for(const {id,el} of sections){
        const domEl = document.getElementById(el);
        if(domEl && domEl.offsetTop <= scrollTop) active = id;
      }
      setActiveSection(active);
    }}>
      <style>{`
        .pm-soap-2col { display: grid; grid-template-columns: 1fr; gap: 6px; }
        @media (min-width: 480px) { .pm-soap-2col { grid-template-columns: 1fr 1fr; } }
      `}</style>

      {/* ── PATIENT HEADER ── */}
      <div style={{...card(),marginBottom:12}}>
        <div style={{padding:"14px 14px 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600,color:"#3C3489",flexShrink:0}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:18,fontWeight:700,color:"#111827"}}>{name}</div>
              <div style={{fontSize:13,color:"#6B7280",marginTop:1}}>
                {[sex&&sex.toUpperCase(),age&&age+" yrs",phone].filter(Boolean).join(" · ")}
              </div>
            </div>
            {vasNow&&<div style={{textAlign:"center",padding:"6px 12px",background:nrsBg(vasNow),borderRadius:12,border:`1px solid ${nrsColor(vasNow)}30`,flexShrink:0}}>
              <div style={{fontSize:12,color:nrsColor(vasNow),fontWeight:600,textTransform:"uppercase"}}>Pain</div>
              <div style={{fontSize:20,fontWeight:700,color:nrsColor(vasNow)}}>{vasNow}<span style={{fontSize:13}}>/10</span></div>
            </div>}
          </div>

          {/* Meta grid — every field the flex-wrap row had before, just
              grouped as label/value pairs instead of a loose wrapping row,
              and it drops to one column on a real phone via .pm-soap-2col */}
          <div className="pm-soap-2col" style={{borderTop:"1px solid #F3F4F6",paddingTop:8}}>
            <div><div style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase"}}>Date</div><div style={{fontSize:14.5,color:"#374151",marginTop:1}}>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div></div>
            {patId&&<div><div style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase"}}>Patient ID</div><div style={{fontSize:14.5,color:"#374151",marginTop:1}}>{patId}</div></div>}
            {dob&&<div><div style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase"}}>DOB</div><div style={{fontSize:14.5,color:"#374151",marginTop:1}}>{dob}</div></div>}
            {therapist&&<div><div style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase"}}>Therapist</div><div style={{fontSize:14.5,color:"#374151",marginTop:1}}>{therapist}</div></div>}
            <div style={{gridColumn:"1 / -1"}}><div style={{fontSize:12,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase"}}>Mode</div><span style={{display:"inline-block",marginTop:2,background:"#D1FAE5",color:"#065F46",padding:"2px 8px",borderRadius:4,fontSize:13,fontWeight:500}}>Digital template</span></div>
          </div>

          {/* Session progress — was module-completion count, now reflects
              actual treatment sessions logged (tx_sessions) against the
              clinician-set total (soap_total_sessions), which is what a
              therapist glancing at this header actually wants to know. */}
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1,height:5,background:"#E5E7EB",borderRadius:100,overflow:"hidden"}}>
              <div style={{height:"100%",background:"#7c3aed",borderRadius:100,width:(totalSess?Math.min(100,(txSessArr.length/Number(totalSess))*100):(txSessArr.length>0?100:0))+"%"}}/>
            </div>
            <span style={{fontSize:12,color:"#9CA3AF",whiteSpace:"nowrap"}}>Session {txSessArr.length || 1}{totalSess?` of ${totalSess}`:""}</span>
          </div>
        </div>

        {/* Session + ICD row */}
        <div style={{padding:"8px 14px",background:"#F9FAFB",borderTop:"1px solid #F3F4F6",display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
          {icd&&<span style={chip_("#EEF2FF","#4F46E5")}>{icd}</span>}
          <span style={chip_("#F0FDF4","#166534")}>{session}</span>
          {clinic&&<span style={chip_("#F9FAFB","#374151")}>{clinic}</span>}
          {redFlags.length>0&&<span style={chip_("#FEF2F2","#DC2626")}>⚠ {redFlags.length} red flag{redFlags.length>1?"s":""}</span>}
        </div>
      </div>

      {/* ── STICKY S/O/A/P NAV BAR ── */}
      <div style={{position:"sticky",top:0,zIndex:50,background:"#F8F8FC",borderBottom:"1px solid #E5E7EB",padding:"0 4px",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto"}}>
          {[
            {id:"S",label:"Subjective",sub:"History",color:"#7c3aed",bg:"#EDE9FE",icon:"💬"},
            {id:"O",label:"Objective",sub:"Clinical",color:"#065F46",bg:"#D1FAE5",icon:"🩺"},
            {id:"A",label:"Assessment",sub:"Diagnosis",color:"#0891b2",bg:"#CFFAFE",icon:"🧠"},
            {id:"P",label:"Plan",sub:"Treatment",color:"#1D4ED8",bg:"#DBEAFE",icon:"📋"},
          ].map(({id,label,sub,color,bg,icon})=>{
            const isActive = activeSection===id;
            return (
              <button key={id} onClick={()=>{
                const el = document.getElementById("soap-sec-"+id);
                if(el){el.scrollIntoView({behavior:"smooth",block:"start"});}
                setActiveSection(id);
              }} style={{
                flex:"1 1 0",minWidth:0,border:"none",cursor:"pointer",padding:"10px 4px 8px",
                background:isActive?bg:"transparent",
                borderBottom:isActive?`2px solid ${color}`:"2px solid transparent",
                transition:"all 0.15s",
              }}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <span style={{fontSize:13,fontWeight:700,color:isActive?color:"#6B7280"}}>{id} · {label}</span>
                  <span style={{fontSize:12,color:isActive?color+"AA":"#9CA3AF",display:"block"}}>{sub}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── S — SUBJECTIVE ── */}
      <div id="soap-sec-S" style={card("#EDE9FE","#7c3aed")}>
        <div style={{...ch("#7c3aed"),borderBottom:"none"}}>
          {secIcon("rgba(255,255,255,0.15)","#fff","💬")}
          {secTitle("S · Subjective","Patient reported","#fff")}
          {secBadge("Patient reported")}
        </div>
        <div style={cb}>
          {(cc||loc||onset)&&<div style={subCard("#7c3aed")}>
            {cc&&<><span style={subLbl}>Chief complaint</span><div style={{fontSize:14.5,fontWeight:500,color:"#111827",lineHeight:1.5,marginBottom:(loc||onset)?6:0}}>{cc}</div></>}
            {loc&&<div style={{marginBottom:rad?6:0}}>
              <span style={subLbl}>Site</span>
              <div>{loc.split(/\|\|\||,/).map(s=>s.trim()).filter(Boolean).map((s,i)=><span key={i} style={chip_("#EEEDFE","#3C3489")}>{s}</span>)}</div>
            </div>}
            {rad&&<div style={{marginBottom:6}}>
              <span style={subLbl}>Radiates to</span>
              <div>{rad.split(/\|\|\||,/).map(s=>s.trim()).filter(Boolean).map((s,i)=><span key={i} style={chip_("#FCEBEB","#712B13")}>{s}</span>)}</div>
            </div>}
            {onset&&<div style={{fontSize:14.5,color:"#374151"}}><span style={{color:"#9CA3AF"}}>Onset: </span>{[onset,dur].filter(Boolean).join(", ")}</div>}
          </div>}
          {redFlags.length>0&&<div style={{padding:"8px 10px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,fontSize:14.5,color:"#991B1B",marginBottom:8,fontWeight:500}}>⚠ Red flags: {redFlags.join(", ")} — medical review indicated</div>}
          {agg.length>0&&<div style={subCard("#EF9F27")}><span style={subLbl}>Worse with</span>{agg.slice(0,6).map(bullet)}</div>}
          {ease.length>0&&<div style={subCard("#639922")}><span style={subLbl}>Better with</span>{ease.slice(0,5).map(bullet)}</div>}
          {(morning||night)&&<div style={subCard()}>
            <span style={subLbl}>24-hour pattern</span>
            <div className="pm-soap-2col">
              {morning&&<div style={{background:"#F9FAFB",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:12,color:"#9CA3AF",fontWeight:500}}>Morning</div><div style={{fontSize:14.5,color:"#111827",marginTop:2,lineHeight:1.4}}>{morning}</div></div>}
              {night&&<div style={{background:"#F9FAFB",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:12,color:"#9CA3AF",fontWeight:500}}>Night</div><div style={{fontSize:14.5,color:"#111827",marginTop:2,lineHeight:1.4}}>{night}</div></div>}
            </div>
          </div>}
          {(phx||meds)&&<><span style={lbl}>History & medications</span>
            {phx&&<div style={{fontSize:14.5,color:"#374151",marginBottom:4}}>PMH: {phx}</div>}
            {meds&&<div style={{fontSize:14.5,color:"#374151",marginBottom:8}}>Meds: {meds}</div>}
          </>}
          {goals_ar.length>0&&<div style={subCard("#7c3aed")}><span style={subLbl}>Goals</span>{goals_ar.map((g,i)=><div key={i} style={{fontSize:14.5,color:"#374151",padding:"3px 0",display:"flex",gap:6}}><span style={{color:"#7c3aed"}}>→</span>{g}</div>)}</div>}
          {v("dem_occupation")&&<div style={{fontSize:14.5,color:"#9CA3AF"}}>{v("dem_occupation")}{v("dem_dominant_hand")?" · "+v("dem_dominant_hand")+" hand":""}</div>}
          {/* ── Regional clinician notes (loc_notes, moi_notes, agg_notes, rel_notes, symp_notes) ── */}
          {(()=>{
            const PFXS=["cx","lx","shl","shr","hp","knl","knr","af","ew","tx"];
            const PFX_LABELS={cx:"Cervical",lx:"Lumbar/SI",shl:"Shoulder L",shr:"Shoulder R",hp:"Hip",knl:"Knee L",knr:"Knee R",af:"Ankle/Foot",ew:"Elbow/Wrist",tx:"Thoracic"};
            const noteGroups=PFXS.flatMap(px=>{
              const parts=[
                v(`${px}_loc_notes`)  && {label:"Location",  text:v(`${px}_loc_notes`)},
                v(`${px}_moi_notes`)  && {label:"Mechanism", text:v(`${px}_moi_notes`)},
                v(`${px}_agg_notes`)  && {label:"Aggravating",text:v(`${px}_agg_notes`)},
                v(`${px}_rel_notes`)  && {label:"Relieving",  text:v(`${px}_rel_notes`)},
                v(`${px}_symp_notes`) && {label:"Behaviour",  text:v(`${px}_symp_notes`)},
              ].filter(Boolean);
              return parts.length?[{region:PFX_LABELS[px]||px.toUpperCase(),parts}]:[];
            });
            if(!noteGroups.length) return null;
            return <><span style={lbl}>Clinician notes</span>
              {noteGroups.map(({region,parts},i)=>(
                <div key={i} style={{marginBottom:6,background:"#F8F7FF",borderRadius:8,padding:"7px 10px",borderLeft:"3px solid #7c3aed"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#7c3aed",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.07em"}}>{region}</div>
                  {parts.map(({label,text},j)=>(
                    <div key={j} style={{fontSize:14.5,color:"#374151",lineHeight:1.6,marginBottom:2}}>
                      <span style={{fontWeight:600,color:"#6B7280"}}>{label}: </span>{text}
                    </div>
                  ))}
                </div>
              ))}
            </>;
          })()}
          <textarea placeholder="Additional subjective notes..." value={extraS} onChange={e=>setExtraS(e.target.value)} onBlur={()=>set("soap_extra_s",extraS)} style={{...inp,resize:"vertical",minHeight:40,marginTop:8}}/>
        </div>
      </div>

      {/* ── O — OBJECTIVE ── */}
      <div id="soap-sec-O" style={card("#D1FAE5","#065F46")}>
        <div style={{...ch("#065F46"),borderBottom:"none"}}>
          {secIcon("rgba(255,255,255,0.15)","#fff","🩺")}
          {secTitle("O · Objective","Clinical findings","#fff")}
          {secBadge("Clinical findings")}
        </div>
        <div style={cb}>

          {/* Posture / Observation */}
          {(()=>{
            // Rich ObservationModule fields
            const obsFields = [
              ["General", [
                ["Appearance",v("obs_appearance")],["Build",v("obs_build")],
                ["Nutrition",v("obs_nutrition")],["Attitude",v("obs_attitude")],
                ["Consciousness",v("obs_consciousness")],
              ]],
              ["Posture", [
                ["Head/Neck",v("obs_posture_head")],["Shoulders",v("obs_posture_shoulders")],
                ["Scapula",v("obs_posture_scapula")],["Thoracic",v("obs_posture_thoracic")],
                ["Lumbar",v("obs_posture_lumbar")],["Pelvis",v("obs_posture_pelvis")],
                ["Knees",v("obs_posture_lower")],["Feet",v("obs_posture_feet")],
              ]],
              ["Swelling / Effusion", [
                ["Swelling",v("obs_swelling_present")==="Present"?[v("obs_swelling_location"),v("obs_swelling_grade"),v("obs_swelling_type")].filter(Boolean).join(", ")||"Present":null],
              ]],
              ["Skin & Trophic", [
                ["Skin colour",v("obs_skin_color")],["Skin temp",v("obs_skin_temp")],
                ["Atrophy",v("obs_atrophy")],["Scar",v("obs_scar")],
              ]],
              ["Deformity", [
                ["Deformity",v("obs_deformity_present")==="Present"?v("obs_deformity_description")||"Present":null],
                ["Assistive device",v("obs_assistive_device")],
              ]],
            ];
            const hasObs = obsFields.some(([,fields])=>fields.some(([,val])=>val));
            const hasLegacy = mods.posture||obsChips.length>0||postDefectList.length>0||postureTextFields.length>0;
            const obsSummary = v("obs_summary");
            if (!hasObs && !hasLegacy && !obsSummary) return null;
            return <div style={subCard("#065F46")}>
              {subH("Observation & Posture","#065F46")}
              {obsSummary&&<div style={{fontSize:14.5,color:"#374151",marginBottom:6,background:"#F9FAFB",padding:"8px 10px",borderRadius:8,lineHeight:1.5}}>{obsSummary}</div>}
              {hasObs&&obsFields.map(([section,fields],si)=>{
                const filled=fields.filter(([,val])=>val);
                if(!filled.length) return null;
                // Highlight abnormal postural findings
                const isAbnormal = (val)=>val&&!/neutral|normal|symmetrical|alert|cooperat|healthy/i.test(val);
                return <div key={si} style={{marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{section}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {filled.map(([label,val],fi)=>{
                      const abn=isAbnormal(val);
                      return <span key={fi} style={{padding:"3px 9px",borderRadius:99,fontSize:13,background:abn?"#FEF3C7":"#F3F4F6",color:abn?"#92400E":"#374151",border:`1px solid ${abn?"#FDE68A":"#E5E7EB"}`,fontWeight:abn?600:400}}>{label}: {val}</span>;
                    })}
                  </div>
                </div>;
              })}
              {/* Legacy posture fields */}
              {postureTextFields.length>0&&<>{postureTextFields.map(([r,t],i)=><div key={i} style={row}><span style={{color:"#6B7280",fontWeight:500,minWidth:90,fontSize:14.5}}>{r}</span><span style={{color:"#111827",flex:1,textAlign:"right",fontSize:14.5}}>{t}</span></div>)}</>}
              {postDefectList.length>0&&<div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:4}}>{postDefectList.map(([,l],i)=><span key={i} style={chip_("#FEF3C7","#92400E")}>{l}</span>)}</div>}
              {obsChips.length>0&&<div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:4}}>{obsChips.map((o,i)=><span key={i} style={{...chip_("#F3F4F6","#374151"),fontSize:13}}>{o.region}: {o.text}</span>)}</div>}
            </div>;
          })()}

          {/* AI Posture Analysis */}
          {mods.postureAI&&<div style={subCard("#065F46")}>
            {subH("AI Postural Analysis","#065F46")}
            {[
              ["CVA",data.cvaAngle,"°","≥ 50°",50,"gte"],
              ["FHP",data.sagFHPCm||data.fhpDevCm,"cm","< 2.5cm",2.5,"lte"],
              ["Thoracic kyphosis",data.sagThorKyph,"°","20–40°",null,null,20,40],
              ["Lumbar lordosis",data.sagLumLord,"°","30–50°",null,null,30,50],
              ["Pelvic shift",data.sagPelvicShift,"cm","< 2cm",2,"lte"],
            ].filter(([,val])=>val!=null&&val!=="").map(([label,val,unit,norm,normNum,dir,lo,hi],i)=>{
              const n=parseFloat(val);
              let flag=null;
              if(!isNaN(n)){
                if(normNum!=null){flag=dir==="gte"?(n<normNum?{t:"Below normal",c:"#B45309",b:"#FEF3C7"}:{t:"Normal",c:"#065F46",b:"#D1FAE5"}):(n>normNum?{t:"Elevated",c:"#B45309",b:"#FEF3C7"}:{t:"Normal",c:"#065F46",b:"#D1FAE5"});}
                else if(lo!=null){flag=(n<lo||n>hi)?{t:n<lo?"Low":"High",c:"#B45309",b:"#FEF3C7"}:{t:"Normal",c:"#065F46",b:"#D1FAE5"};}
              }
              return <div key={i} style={row}>
                <span style={{color:"#374151",fontWeight:500,fontSize:14.5,flex:1}}>{label}</span>
                <span style={{fontWeight:600,color:"#111827",marginRight:8,fontSize:14.5}}>{val}{unit}</span>
                <span style={{fontSize:12,color:"#9CA3AF",marginRight:8}}>{norm}</span>
                {flag&&<span style={{fontSize:12,padding:"1px 7px",borderRadius:100,background:flag.b,color:flag.c,fontWeight:500}}>{flag.t}</span>}
              </div>;
            })}
          </div>}

          {/* Gait -- was checking flat field names (gait_trendelenburg,
              gait_antalgic, gait_cadence) that GaitModule never actually
              writes, the exact same class of bug already found and fixed
              in buildRealtimeSOAP (the Live SOAP text builder) via the
              "severe Gait SOAP bug" fix earlier this project -- but that
              fix never touched this component's own separate JSX, so this
              visual screen kept silently showing nothing regardless of
              what was recorded. Real fields: "<ABNORMAL_GAITS id>" (e.g.
              "ag_trend"), "<GAIT_PHASES id>_dev", "<GAIT_SCALES id>". */}
          {mods.gait&&<div style={subCard("#065F46")}>
            {subH("Gait","#065F46")}
            {(()=>{
              const rows2 = [];
              if (v("gait_pattern")) rows2.push(["Pattern", v("gait_pattern")]);
              const abnormalGaits = ABNORMAL_GAITS.filter(g => v(g.id) === "Present");
              if (abnormalGaits.length) rows2.push(["Abnormal patterns", abnormalGaits.map(g => {
                const note = v(`${g.id}_note`);
                return `${g.label}${note ? ` (${note})` : ""}`;
              }).join(", ")]);
              const phaseDevs = GAIT_PHASES.filter(p => v(`${p.id}_dev`) && v(`${p.id}_dev`) !== "None");
              if (phaseDevs.length) rows2.push(["Phase deviations", phaseDevs.map(p => `${p.phase} — ${v(`${p.id}_dev`)}`).join("; ")]);
              const gaitScales = GAIT_SCALES.filter(s => v(s.id));
              if (gaitScales.length) rows2.push(["Scales", gaitScales.map(s => `${s.label} ${v(s.id)}${s.range}`).join(", ")]);
              if (v("ag_cadence")) rows2.push(["Cadence", v("ag_cadence")]);
              if (v("gait_notes")) rows2.push(["Notes", v("gait_notes")]);
              return rows2.map(([l,t],i)=><div key={i} style={row}><span style={{color:"#6B7280",fontWeight:500,fontSize:14.5,minWidth:90}}>{l}</span><span style={{color:"#111827",fontSize:14.5,flex:1,textAlign:"right"}}>{t}</span></div>);
            })()}
          </div>}

          {/* Neuro (general — above region) */}
          {v("neuro_dermatomal")&&<div style={subCard("#065F46")}>
            {subH("Neuro (general)","#065F46")}
            <div style={{fontSize:14.5,color:"#374151",marginBottom:4}}>{[v("neuro_dermatomal"),v("neuro_sensation")].filter(Boolean).join(". ")}</div>
          </div>}

          {/* Neurological radiation chips */}
          {(rad||v("neuro_weakness"))&&<>
            {rad&&<div style={{marginBottom:6}}><span style={chip_("#EDE9FE","#5B21B6")}>Radiation / Referral</span>{v("neuro_sensation")&&v("neuro_sensation").toLowerCase().includes("tin")&&<span style={chip_("#EDE9FE","#5B21B6")}>Tingling / Pins &amp; Needles</span>}</div>}
            {rad&&<div style={{fontSize:14.5,color:"#374151",marginBottom:4}}>Radiates → {rad}{v("neuro_dermatomal")?" · Nerve: "+v("neuro_dermatomal"):""}</div>}
          </>}

          {/* OBSERVATION chips (regional) */}
          {(postDefectList.length>0||obsChips.length>0)&&<div style={subCard("#065F46")}>
            {subH("Observation","#065F46")}
            {postDefectList.map(([,l],i)=><span key={i} style={chip_("#D1FAE5","#065F46")}>{l}</span>)}
            {obsChips.map((o,i)=><span key={i} style={chip_("#D1FAE5","#065F46")}>{o.text}</span>)}
          </div>}

          {/* Palpation */}
          {(palpPins.filter(p=>p.tenderness).length>0||palpText.length>0)&&<div style={subCard("#065F46")}>
            {subH("Palpation — Tender","#065F46")}
            {palpPins.filter(p=>p.tenderness).slice(0,8).map((p,i)=><span key={i} style={chip_("#FEF3C7","#92400E")}>{p.label}{p.side&&p.side!=="bilateral"?" ("+p.side+")":""} — grade {p.tenderness}+</span>)}
            {palpText.map(([r,t],i)=><div key={i} style={row}><span style={{color:"#6B7280",fontSize:14.5,fontWeight:500,minWidth:50}}>{r}</span><span style={{color:"#111827",fontSize:14.5,flex:1,textAlign:"right"}}>{t}</span></div>)}
          </div>}

          {/* Neurological */}
          {(neuroRows.length>0||v("gcs_eye")||v("gcs_verbal")||v("gcs_motor")||
            Object.keys(data).some(k=>(k.startsWith("cn_")||k.startsWith("cog_")||k.startsWith("coord_")||k.startsWith("vest_")||k.startsWith("perc_")||k.startsWith("moca_")||k.startsWith("mmse_")||k.startsWith("minicog_")||k.startsWith("brunnstrom_")||k.startsWith("rankin_")||k.startsWith("hoehnyahr_")||k.startsWith("pdrigidity_")||k.startsWith("updrs_")||k.startsWith("edss_")||k.startsWith("sci_")||k.startsWith("rancho_")||k.startsWith("goat_")||k.startsWith("barthel_")||k.startsWith("asia_")||k.startsWith("nihss_")||k==="nrf_autonomic_dysreflexia")&&data[k])
          )&&<div style={subCard("#065F46")}>
            {subH("Neurological","#065F46")}
            {/* GCS (Glasgow Coma Scale) -- was only ever wired into the
                Live SOAP text builder and Patient Profile, never this
                visual card screen, so it silently never appeared here
                regardless of whether it was recorded. Same real fields
                (gcs_eye/gcs_verbal/gcs_motor) as the other two locations. */}
            {(v("gcs_eye")||v("gcs_verbal")||v("gcs_motor"))&&(()=>{
              const e=parseInt(v("gcs_eye"))||0, ve=parseInt(v("gcs_verbal"))||0, m=parseInt(v("gcs_motor"))||0;
              const total=e+ve+m;
              const col=total<=8?"#DC2626":total<=12?"#D97706":"#059669";
              return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"#F9FAFB",borderRadius:8,marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>Glasgow Coma Scale</div>
                  <div style={{fontSize:14.5,color:"#374151"}}>E {e||"—"} · V {ve||"—"} · M {m||"—"}</div>
                </div>
                <span style={{fontSize:20,fontWeight:800,color:col}}>{total}<span style={{fontSize:13,fontWeight:500,color:"#9CA3AF"}}>/15</span></span>
              </div>;
            })()}
            {neuroRows.map((r,i)=>{
              const lc=r.val.toLowerCase();
              const isAbn=lc.includes("reduced")||lc.includes("weak")||lc.includes("absent")||lc.includes("positive");
              const isN=lc.includes("intact")||lc.includes("normal")||lc.includes("5/5")||lc.includes("negative");
              return <div key={i} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{r.label}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:isAbn?"#DC2626":isN?"#059669":"#111827"}}>{r.val}</span>
              </div>;
            })}
            {/* Cranial nerves, cognition (orientation + MoCA/MMSE/Mini-Cog),
                coordination, vestibular, and perceptual -- like GCS above,
                these were only ever wired into buildRealtimeSOAP's text
                output and never into this visual card, so they silently
                never appeared here regardless of what was recorded. */}
            {CRANIAL_NERVES.filter(cn=>v(`cn_${cn.id}_status`)).map(cn=>{
              const val=v(`cn_${cn.id}_status`);
              const isAbn=/Impaired|UMN pattern|LMN pattern|Conductive|Sensorineural|Deviates|Weak/.test(val);
              return <div key={cn.id} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{`CN ${cn.numeral} (${cn.name})`}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:isAbn?"#DC2626":"#059669"}}>{val}</span>
              </div>;
            })}
            {[["cog_orient_person","Orientation — Person"],["cog_orient_place","Orientation — Place"],["cog_orient_time","Orientation — Time"],["cog_orient_situation","Orientation — Situation"]].filter(([id])=>v(id)).map(([id,label])=>(
              <div key={id} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{label}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:v(id)==="Yes"?"#059669":"#DC2626"}}>{v(id)}</span>
              </div>
            ))}
            {["moca","mmse","minicog","brunnstrom","rankin","hoehnyahr","pdrigidity","updrs","edss","rancho","goat","barthel","asia","nihss"].map(scaleId=>{
              const sc=SCALES[scaleId]; const score=sc.score(data);
              if(score===null) return null;
              const interp=sc.interpret(score);
              return <div key={scaleId} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{sc.label}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:interp.color}}>{score}{sc.unit} — {interp.label}</span>
              </div>;
            })}
            {v("sci_bladder_mgmt")&&<div style={row}><span style={{color:"#374151",fontSize:14.5,flex:1}}>Bladder management</span><span style={{fontSize:14.5,fontWeight:500,color:"#111827"}}>{v("sci_bladder_mgmt")}</span></div>}
            {v("sci_bowel_mgmt")&&<div style={row}><span style={{color:"#374151",fontSize:14.5,flex:1}}>Bowel management</span><span style={{fontSize:14.5,fontWeight:500,color:"#111827"}}>{v("sci_bowel_mgmt")}</span></div>}
            {COORDINATION_TESTS.flatMap(t=>["L","R"].map(side=>({id:`${t.id}_${side}`,label:`${t.label} (${side})`,val:v(`${t.id}_${side}`)}))).filter(r=>r.val).map(r=>{
              const isAbn=/dysmetria|ataxia|dysdiadochokinesia|Present|Unable/i.test(r.val)&&!/Absent|Normal/i.test(r.val);
              return <div key={r.id} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{r.label}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:isAbn?"#DC2626":"#059669"}}>{r.val}</span>
              </div>;
            })}
            {v("neuro_involuntary_type")&&v("neuro_involuntary_type")!=="None observed"&&(
              <div style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>Involuntary movements</span>
                <span style={{fontSize:14.5,fontWeight:500,color:"#DC2626"}}>{v("neuro_involuntary_type")}</span>
              </div>
            )}
            {VESTIBULAR_TESTS.filter(t=>v(`vest_${t.id}_result`)).map(t=>{
              const val=v(`vest_${t.id}_result`);
              const isAbn=/Positive|Abnormal|central|drop/i.test(val)&&!/Negative|Normal/i.test(val);
              return <div key={t.id} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{t.label}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:isAbn?"#DC2626":"#059669"}}>{val}</span>
              </div>;
            })}
            {PERCEPTUAL_TESTS.filter(t=>v(`perc_${t.id}_result`)).map(t=>{
              const val=v(`perc_${t.id}_result`);
              const isAbn=/neglect|Ideomotor|Ideational|Impaired/i.test(val)&&!/No neglect|Absent|Intact/i.test(val);
              return <div key={t.id} style={row}>
                <span style={{color:"#374151",fontSize:14.5,flex:1}}>{t.label}</span>
                <span style={{fontSize:14.5,fontWeight:500,color:isAbn?"#DC2626":"#059669"}}>{val}</span>
              </div>;
            })}
          </div>}

          {/* Range of Motion */}
          {romRows.length>0&&<div style={subCard("#065F46")}>
            {subH("Range of Motion","#065F46")}
            {romRows.map((r,i)=>{
              if(!r.bilateral){
                const p=r.pct;
                const col=romStatusColor(p);
                return <div key={i} style={{marginBottom:6}}>
                  <div style={{background:"#F9FAFB",borderRadius:8,padding:"7px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:13,color:"#9CA3AF",marginBottom:2}}>{r.label}</div>
                      <div style={{fontSize:16,fontWeight:700,color:"#111827"}}>A:{r.single}°<span style={{fontSize:13,fontWeight:400,color:"#9CA3AF"}}> / 0–{r.norm}°</span></div>
                    </div>
                    {col&&<span style={{fontSize:12,fontWeight:700,color:col,padding:"2px 8px",borderRadius:99,background:col+"22"}}>{p!=null&&p>115?"Hypermobile":p!=null&&p>=85?"WNL":p!=null&&p>=65?"Mild":p!=null&&p>=40?"Moderate":p!=null?"Severe":""}</span>}
                  </div>
                </div>;
              } else {
                return <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                  {r.l&&<div style={{background:"#F9FAFB",borderRadius:8,padding:"7px 10px"}}>
                    <div style={{fontSize:13,color:"#9CA3AF",marginBottom:2}}>{r.label} (L)</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#111827"}}>A:{r.l}°<span style={{fontSize:13,fontWeight:400,color:"#9CA3AF"}}> / 0–{r.norm}°</span></div>

                  </div>}
                  {r.r&&<div style={{background:"#F9FAFB",borderRadius:8,padding:"7px 10px"}}>
                    <div style={{fontSize:13,color:"#9CA3AF",marginBottom:2}}>{r.label} (R)</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#111827"}}>A:{r.r}°<span style={{fontSize:13,fontWeight:400,color:"#9CA3AF"}}> / 0–{r.norm}°</span></div>

                  </div>}
                </div>;
              }
            })}
          </div>}

          {/* MMT */}
          {mmtRows.length>0&&<div style={subCard("#065F46")}>
            {subH("Manual Muscle Testing (MMT)","#065F46")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            {mmtRows.map(([muscle,side,gr,desc],i)=>{
              const g=parseFloat(gr)||0;
              const gc=g>=5?"#059669":g>=4?"#d97706":g>=3?"#ea580c":"#dc2626";
              const bg=g>=5?"#f0fdf4":g>=4?"#fffbeb":g>=3?"#fff7ed":"#fef2f2";
              const bdr=g>=5?"#bbf7d0":g>=4?"#fde68a":g>=3?"#fed7aa":"#fecaca";
              return <div key={i} style={{display:"flex",flexDirection:"column",padding:"7px 10px",borderRadius:8,border:`1px solid ${bdr}`,background:bg}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:14.5,fontWeight:700,color:"#1f2937",flex:1,lineHeight:1.3,fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",letterSpacing:"0.01em"}}>{muscle}</span>
                  {side&&<span style={{fontSize:12,fontWeight:800,padding:"1px 6px",borderRadius:99,background:"#e0e7ff",color:"#3730a3",marginLeft:4,flexShrink:0}}>{side.trim().replace(/[()]/g,"")}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:"#6b7280"}}>{desc||""}</span>
                  <span style={{fontSize:16,fontWeight:800,color:gc}}>{gr}</span>
                </div>
              </div>;
            })}
            </div>
          </div>}

          {/* Special Tests */}
          {sttRows.length>0&&<div style={subCard("#065F46")}>
            {subH("Special Tests","#065F46")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {sttRows.map((t,i)=>{
                const lc=t.val.toLowerCase();
                const isPos=lc.includes("positive")||lc.includes("+ve");
                const isNeg=lc.includes("negative")||lc.includes("-ve")||lc.includes("normal");
                if(!isPos&&!isNeg) return null;
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",background:isPos?"#fef2f2":"#f0fdf4",borderRadius:7,border:`1px solid ${isPos?"#fecaca":"#bbf7d0"}`}}>
                    <span style={{fontSize:13,color:"#334155",flex:1,marginRight:4,lineHeight:1.3}}>{t.name}</span>
                    <span style={{fontSize:12,fontWeight:800,padding:"2px 6px",borderRadius:10,flexShrink:0,background:isPos?"#dc2626":"#059669",color:"#fff"}}>{isPos?"+ve":"−ve"}</span>
                  </div>
                );
              })}
            </div>
          </div>}

          {/* STTT / Cyriax — this whole section did not exist in the visual
              SOAP screen at all before, even though it was already correctly
              built into the plain-text SOAP builder used by Live SOAP and
              Copy note. A clinician completing a full Cyriax/Selective
              Tissue Tension assessment would never see it reflected here.
              Reuses the same comprehensive cy_/cyriax_ prefix scan + region
              parsing already validated for the text version, rather than a
              hand-copied per-test label list that could go stale. */}
          {(()=>{
            // Uses the shared resolveCyriaxKey() resolver (top of file)
            // instead of a locally-duplicated copy of the same region/
            // field-type parsing -- that duplication is exactly how the
            // lazy-region-regex bug (wrist_hand/ankle_foot garbling into
            // "Hand Act Rom Wr A Flex") drifted between this visual card
            // view and the plain-text Live SOAP builder in the first place.
            const SKIP_EXACT = new Set(["cy_contractile","cy_non_contractile","cy_capsular_pattern","cy_capsular","cy_endfeel","cy_notes"]);
            const cyKeys = Object.keys(data).filter(k => (k.startsWith("cy_")||k.startsWith("cyriax_")) && data[k] && String(data[k]).trim() && !SKIP_EXACT.has(k));
            if (!cyKeys.length && !v("cy_contractile") && !v("cy_non_contractile") && !v("cy_capsular_pattern") && !v("cy_notes")) return null;
            // Card-grid style matching MMT below, instead of plain bullet
            // text — bordered card per test, region as a small badge, color
            // reflects whether any row for this test reads as painful/limited
            // (amber) vs full/normal (green), same visual language as the
            // MMT grade-based coloring right below this section.
            const merged = {}; // key: regionKey|testId -> { region, label, cat, rows:[{word,value}] }
            const order = [];
            cyKeys.forEach(k => {
              const val = String(data[k]).trim();
              const resolved = resolveCyriaxKey(k);
              if (!resolved) return;
              const { region, regionKey, word, testId, label, cat } = resolved;
              const gk = regionKey ? `${regionKey}|${testId}` : `_legacy_${k}`;
              if (!merged[gk]) { merged[gk] = { region, label, cat, rows:[] }; order.push(gk); }
              merged[gk].rows.push({ word, value: val });
            });
            const groups = { active:[], passive:[], resisted:[] };
            order.forEach(gk => {
              const item = merged[gk];
              const abnormal = item.rows.some(r => /pain|limit|restrict|abnormal|positive|reduced|weak|capsular/i.test(r.word + r.value));
              groups[item.cat].push({ ...item, abnormal });
            });
            const CAT_LABEL = { active: "Active movements", passive: "Passive movements", resisted: "Resisted tests" };
            const sttCard = (item, i) => {
              const bg = item.abnormal ? "#fffbeb" : "#f0fdf4";
              const bdr = item.abnormal ? "#fde68a" : "#bbf7d0";
              const gc = item.abnormal ? "#d97706" : "#059669";
              return <div key={i} style={{display:"flex",flexDirection:"column",padding:"7px 10px",borderRadius:8,border:`1px solid ${bdr}`,background:bg}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:14.5,fontWeight:700,color:"#1f2937",flex:1,lineHeight:1.3}}>{item.label}</span>
                  {item.region&&<span style={{fontSize:12,fontWeight:800,padding:"1px 6px",borderRadius:99,background:"#e0e7ff",color:"#3730a3",marginLeft:4,flexShrink:0}}>{item.region}</span>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:1}}>
                  {item.rows.map((r,ri)=>(
                    <span key={ri} style={{fontSize:13,fontWeight:600,color:/pain|limit|restrict|abnormal|positive|reduced|weak|capsular/i.test(r.word+r.value)?"#d97706":"#059669"}}>
                      {r.word}{r.value}
                    </span>
                  ))}
                </div>
              </div>;
            };
            return <div style={subCard("#065F46")}>
              {subH("STTT / Selective Tissue Tension","#065F46")}
              {["active","passive","resisted"].map(cat => groups[cat].length>0 && (
                <div key={cat} style={{marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#6B7280",marginBottom:4}}>{CAT_LABEL[cat]}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                    {groups[cat].map(sttCard)}
                  </div>
                </div>
              ))}
              {v("cy_contractile")&&<div style={{fontSize:14.5,color:"#374151",marginTop:2}}>Contractile: {v("cy_contractile")}</div>}
              {v("cy_non_contractile")&&<div style={{fontSize:14.5,color:"#374151"}}>Non-contractile: {v("cy_non_contractile")}</div>}
              {(v("cy_capsular_pattern")||v("cy_capsular"))&&<div style={{fontSize:14.5,color:"#374151"}}>Capsular pattern: {v("cy_capsular_pattern")||v("cy_capsular")}</div>}
              {v("cy_notes")&&<div style={{fontSize:14.5,color:"#374151"}}>Notes: {v("cy_notes")}</div>}
            </div>;
          })()}

          {/* Functional Limitations */}
          {(flChips.length>0||v("ar_goal_function"))&&<div style={subCard("#065F46")}>
            {subH("Functional limitations","#065F46")}
            <div style={{marginBottom:6}}>{flChips.map((x,i)=><span key={i} style={chip_("#FEF3C7","#92400E")}>{x}</span>)}</div>
            {v("ar_goal_function")&&<div style={{fontSize:14.5,color:"#374151"}}>{v("ar_goal_function")}</div>}
          </div>}

          {/* Outcome Measures */}
          {omRows.length>0&&<div style={subCard("#065F46")}>
            {subH("Outcome Measures","#065F46")}
            <table style={tbl}><thead><tr><th style={thS}>Scale</th><th style={thS}>Score</th><th style={thS}>Max</th><th style={thS}>Description</th></tr></thead>
            <tbody>{omRows.map((r,i)=><tr key={i}><td style={{...tdS,fontWeight:600}}>{r.name}</td><td style={{...tdS,fontWeight:700,color:"#6366F1"}}>{r.score}</td><td style={{...tdS,color:"#9CA3AF"}}>{r.max||"—"}</td><td style={{...tdS,color:"#6B7280",fontSize:12}}>{r.note}</td></tr>)}</tbody></table>
          </div>}

          {/* CPA — was reading unused legacy fields (cpa_pattern, cx_cpa,
              etc.) that the real CPA/NKT assessment module never writes to.
              Real data lives in nkt_<muscle> fields (verified against
              NKTSection's actual set() calls, same 47-muscle list already
              confirmed complete for the Live SOAP/copy text builder) — the
              section header was showing even when this content was
              silently blank. Fixed to scan the real fields. */}
          {mods.cpa&&<div style={subCard("#065F46")}>
            {subH("Compensation Pattern Analysis (CPA)","#065F46")}
            {(()=>{
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
              const inh=[],over=[],fac=[],norm=[];
              NKT_IDS.forEach(([id,label])=>{
                const val=String(data[id]||"").trim();
                if(!val) return;
                if(/inhibited|complete inhibition/i.test(val)) inh.push({label,val});
                else if(/overactive/i.test(val)) over.push({label,val});
                else if(/facilitated/i.test(val)) fac.push({label,val});
                else if(/normal/i.test(val)) norm.push({label,val});
              });
              if(!inh.length&&!over.length&&!fac.length&&!norm.length&&!v("nkt_notes")) return <div style={na}>No CPA findings recorded yet.</div>;
              return <div style={{marginTop:4}}>
                {inh.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#B45309",marginBottom:3}}>Inhibited</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {inh.map(({label,val},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#FEF3C7",color:"#92400E",fontSize:13,fontWeight:500}}>{label}</span>)}
                  </div></>}
                {over.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#DC2626",marginBottom:3}}>Overactive / Facilitated</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {over.map(({label},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#FEE2E2",color:"#991B1B",fontSize:13,fontWeight:500}}>{label}</span>)}
                  </div></>}
                {fac.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#0369A1",marginBottom:3}}>Facilitated (normal)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {fac.map(({label},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#E0F2FE",color:"#0369A1",fontSize:13,fontWeight:500}}>{label}</span>)}
                  </div></>}
                {norm.length>0&&<div style={{fontSize:13,color:"#6B7280",marginBottom:4}}>Normal: {norm.map(({label})=>label).join(", ")}</div>}
                {v("nkt_notes")&&<div style={{fontSize:13,color:"#374151",marginTop:2}}>Notes: {v("nkt_notes")}</div>}
              </div>;
            })()}
          </div>}

          {/* Kinetic Chain */}
          {mods.kinetic&&<div style={subCard("#065F46")}>
            {subH("Kinetic Chain","#065F46")}
            {/* Legacy fields */}
            {[v("kinetic_primary")&&["Primary dysfunction",v("kinetic_primary")],v("kinetic_compensation")&&["Compensation",v("kinetic_compensation")],v("kinetic_notes")&&["Notes",v("kinetic_notes")]].filter(Boolean).map(([l,t],i)=><div key={i} style={row}><span style={{color:"#6B7280",fontSize:14.5,fontWeight:500,minWidth:110}}>{l}</span><span style={{color:"#111827",fontSize:14.5,flex:1,textAlign:"right"}}>{t}</span></div>)}
            {/* kc_* fields from Kinetic Chain module */}
            {(()=>{
              const KC=[["kc_ankle_df","Ankle DF"],["kc_subtalar","Subtalar"],["kc_great_toe","1st MTP Ext"],
                ["kc_knee_stability","Knee Valgus"],["kc_patellar_mobility","Patellar Mob"],["kc_tibiofemoral_rot","Tibial Rot"],
                ["kc_hip_ir_mob","Hip IR"],["kc_hip_ext_mob","Hip Ext (Thomas)"],["kc_hip_er_mob","Hip ER"],
                ["kc_hip_abd_mob","Hip Abd"],["kc_lumbar_stability","Lumbar Stability"],["kc_lumbar_flexion_ctrl","Lumbar Flex Ctrl"],
                ["kc_lumbar_rotation_ctrl","Lumbar Rot Ctrl"],["kc_thoracic_rotation","Thoracic Rot"],
                ["kc_thoracic_extension","Thoracic Ext"],["kc_rib_mobility","Rib Cage"],
                ["kc_scapulohumeral_rhythm","Scapulohumeral Rhythm"],["kc_gh_ir_mob","GH IR (GIRD)"],
                ["kc_cervical_thoracic_jct","CT Junction"],["kc_cervical_rot_mob","Cervical Rot"],["kc_cervical_flex_ext","Cervical Flex/Ext"]];
              const items = KC.map(([id,label])=>{const val=v(id);return val?{id,label,val}:null;}).filter(Boolean);
              if(!items.length) return null;
              const fail=items.filter(({val})=>/restrict|limit|dysfunc|unstable|abnormal|fail|hypomob|tight|valgus|dominant|positive|absent|crepitus|deviation|aslr|gird|chin.poke|no.ta|no.activation/i.test(val));
              const hyper=items.filter(({val})=>!/restrict|limit|dysfunc|unstable|abnormal|fail|hypomob|tight|valgus|dominant|positive|absent|crepitus|deviation|aslr|gird|chin.poke|no.ta|no.activation/i.test(val)&&/hyper|lax|excess|cervicothoracic.instab/i.test(val));
              const norm=items.filter(({val})=>!/restrict|limit|dysfunc|unstable|abnormal|fail|hypomob|tight|valgus|dominant|positive|absent|crepitus|deviation|aslr|gird|chin.poke|no.ta|no.activation|hyper|lax|excess|cervicothoracic.instab/i.test(val)&&/normal|pass|adequate|full/i.test(val));
              const other=items.filter(({val})=>!/restrict|limit|dysfunc|unstable|abnormal|fail|hypomob|tight|valgus|dominant|positive|absent|crepitus|deviation|aslr|gird|chin.poke|no.ta|no.activation|hyper|lax|excess|cervicothoracic.instab|normal|pass|adequate|full/i.test(val));
              return <div style={{marginTop:4}}>
                {fail.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#B45309",marginBottom:3}}>Restricted / Dysfunctional</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {fail.map(({label,val},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#FEF3C7",color:"#92400E",fontSize:13,fontWeight:500}}>{label}: {val}</span>)}
                  </div></>}
                {hyper.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#7C3AED",marginBottom:3}}>Hypermobile / Lax</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {hyper.map(({label,val},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#EDE9FE",color:"#5B21B6",fontSize:13,fontWeight:500}}>{label}: {val}</span>)}
                  </div></>}
                {other.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#0369A1",marginBottom:3}}>Other Findings</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {other.map(({label,val},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#E0F2FE",color:"#0369A1",fontSize:13,fontWeight:500}}>{label}: {val}</span>)}
                  </div></>}
                {norm.length>0&&<div style={{fontSize:13,color:"#6B7280",marginBottom:4}}>Normal: {norm.map(({label})=>label).join(", ")}</div>}
                {v("kc_notes")&&<div style={{fontSize:13,color:"#374151",marginTop:2}}>Notes: {v("kc_notes")}</div>}
              </div>;
            })()}
          </div>}

          {/* Fascia Integration */}
          {mods.fascia&&<div style={subCard("#065F46")}>
            {subH("Fascia Integration","#065F46")}
            {(()=>{
              const FA_NAMES={"fa_skin_roll":"Skin Rolling","fa_passive_tension":"Passive Line Tension","fa_active_line_load":"Active Line Load","fa_densification":"Densification Test","fa_scar":"Scar/Adhesion","fa_sbl_hamstring":"SBL Hamstring","fa_tlf":"TLF Assessment","fa_spiral_rot":"Spiral Rotation","fa_ll_test":"Lateral Line","fa_dfl_arch":"DFL Medial Arch","fa_dfl_breathing":"DFL Diaphragm","fa_remote_test":"Remote Restriction","fa_force_closure":"Force Closure/SIJ","fa_compensation_map":"Compensation Pattern"};
              const faItems=Object.keys(data).filter(k=>(k.startsWith("fa_")||k.startsWith("fascia_"))&&data[k]&&String(data[k]).trim()).map(k=>({label:FA_NAMES[k]||k.replace(/^fa_/,"").replace(/_/g," "),val:String(data[k])}));
              const restrict=faItems.filter(({val})=>/restrict|tight|dysfunc|adher|dense|scar/i.test(val));
              const normal=faItems.filter(({val})=>/normal|pass|adequate|clear/i.test(val));
              const other=faItems.filter(({val})=>!/restrict|tight|dysfunc|adher|dense|scar|normal|pass|adequate|clear/i.test(val));
              return <div style={{marginTop:4}}>
                {restrict.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#B45309",marginBottom:3}}>Restricted / Dysfunctional</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{restrict.map(({label,val},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#FEF3C7",color:"#92400E",fontSize:13,fontWeight:500}}>{label}: {val}</span>)}</div></>}
                {other.length>0&&<><div style={{fontSize:13,fontWeight:600,color:"#6366F1",marginBottom:3}}>Findings</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{other.map(({label,val},i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#EDE9FE",color:"#4F46E5",fontSize:13,fontWeight:500}}>{label}: {val}</span>)}</div></>}
                {normal.length>0&&<div style={{fontSize:13,color:"#6B7280",marginBottom:4}}>Normal: {normal.map(({label})=>label).join(", ")}</div>}
              </div>;
            })()}
          </div>}

          {/* ── ADVANCED FUNCTIONAL SCREENS ── */}
          {(()=>{
            const FS_REGIONS=[
              {key:"kfs_data",label:"Knee Functional Screen"},
              {key:"lfs_data",label:"Lumbar Functional Screen"},
              {key:"sfs_data",label:"Shoulder Functional Screen"},
              {key:"hfs_data",label:"Hip Functional Screen"},
              {key:"afs_data",label:"Ankle Functional Screen"},
              {key:"thfs_data",label:"Thoracic Functional Screen"},
              {key:"elfs_data",label:"Elbow Functional Screen"},
              {key:"wffs_data",label:"Wrist/Hand Functional Screen"},
              {key:"tmjfs_data",label:"TMJ Functional Screen"},
              {key:"cfs_data",label:"Cervical Functional Screen"},
            ];
            const rendered=FS_REGIONS.map(({key,label})=>{
              const raw=data[key]; if(!raw) return null;
              let parsed; try{parsed=typeof raw==="string"?JSON.parse(raw):raw;}catch{return null;}
              const{grades={},notes={}}=parsed;
              const ge=Object.entries(grades);
              if(!ge.length) return null;
              const FS_DISP_LBL={
                lfs_sts:"Sit-to-Stand",lfs_fwd:"Forward Bend",lfs_sls:"Single Leg Stance",lfs_squat:"Squat Pattern",lfs_step:"Step-Up",
                fms_sq:"Deep Squat",fms_hs:"Hurdle Step",fms_il:"Inline Lunge",fms_sm:"Shoulder Mob",
                fms_aslr:"ASLR",fms_tspu:"Trunk Stab Push-Up",fms_rs:"Rotary Stability",
                kfs_squat:"Dbl Leg Squat",kfs_lunge:"Forward Lunge",kfs_step:"Step Down",kfs_single_leg:"SL Squat",kfs_hop:"SL Hop",
                sfs_overhead:"Overhead Reach",sfs_push_up:"Push-Up",sfs_irt:"Int Rotation",sfs_ert:"Ext Rotation",
                hfs_squat:"SL Squat",hfs_bridge:"Hip Bridge",hfs_clam:"Clamshell",hfs_step:"Step Down",hfs_lunge:"Lunge",
                afs_df:"Dorsiflexion",afs_calf:"Calf Raise",afs_hop:"Hop & Stick",afs_squat:"Squat",
              };
              const fsDisp=id=>FS_DISP_LBL[id]||id.replace(/^[a-z]+fs_/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
              const abnormal=ge.filter(([,g])=>g===2).map(([id])=>fsDisp(id));
              const compensated=ge.filter(([,g])=>g===1).map(([id])=>fsDisp(id));
              const normal=ge.filter(([,g])=>g===0).map(([id])=>fsDisp(id));
              const noteEntries=Object.entries(notes).filter(([,n])=>n&&String(n).trim());
              return <div key={key} style={{marginBottom:8,padding:"8px 10px",background:"#F9FAFB",borderRadius:8,border:"1px solid #E5E7EB"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:4}}>{label}</div>
                {abnormal.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#991B1B",marginRight:4}}>🔴 Abnormal:</span>
                  {abnormal.map((t,i)=><span key={i} style={{padding:"1px 7px",borderRadius:99,background:"#FEE2E2",color:"#991B1B",fontSize:13,fontWeight:500}}>{t}</span>)}
                </div>}
                {compensated.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#92400E",marginRight:4}}>⚠️ Compensated:</span>
                  {compensated.map((t,i)=><span key={i} style={{padding:"1px 7px",borderRadius:99,background:"#FEF3C7",color:"#92400E",fontSize:13,fontWeight:500}}>{t}</span>)}
                </div>}
                {normal.length>0&&(abnormal.length||compensated.length)>0&&<div style={{fontSize:13,color:"#6B7280"}}>✅ Normal: {normal.join(", ")}</div>}
                {noteEntries.length>0&&<div style={{marginTop:4,fontSize:13,color:"#374151",fontStyle:"italic"}}>{noteEntries.map(([id,n])=>`${id.replace(/_/g," ")}: ${String(n).slice(0,100)}`).join(" · ")}</div>}
              </div>;
            }).filter(Boolean);
            if(!rendered.length) return null;
            return <div style={subCard("#065F46")}>{subH("Functional Screens","#065F46")}{rendered}</div>;
          })()}

          {!mods.posture&&!mods.rom&&!mods.mmt&&!mods.neuro&&!mods.stt&&!mods.palpation&&!mods.gait&&!mods.postureAI&&<div style={na}>No objective findings recorded yet.</div>}
          <textarea placeholder="Additional objective notes..." value={extraO} onChange={e=>setExtraO(e.target.value)} onBlur={()=>set("soap_extra_o",extraO)} style={{...inp,resize:"vertical",minHeight:40,marginTop:8}}/>
        </div>
      </div>

      {/* ── A — ASSESSMENT ── */}
      <div id="soap-sec-A" style={card("#CFFAFE","#0891b2")}>
        <div style={{...ch("#0891b2"),borderBottom:"none"}}>
          {secIcon("rgba(255,255,255,0.15)","#fff","🧠")}
          {secTitle("A · Assessment","Clinical impression","#fff")}
          {secBadge("Clinical impression")}
        </div>
        <div style={cb}>

          {/* ═══ DIAGNOSIS FIELDS (shared dropdown logic) ═══ */}
          {(()=>{
            const DIFF_DX = {
              cervical: ["Cervical Radiculopathy","Cervical Facet Syndrome","Cervical Disc Herniation","Cervicogenic Headache","Thoracic Outlet Syndrome","Myelopathy","Cervical Spondylosis","Upper Cervical Instability"],
              shoulder: ["Rotator Cuff Tear","Subacromial Impingement","Adhesive Capsulitis","AC Joint Pathology","Biceps Tendinopathy","Labral Tear","GH Instability","Calcific Tendinopathy","Shoulder OA"],
              elbow: ["Lateral Epicondylalgia","Medial Epicondylalgia","Cubital Tunnel Syndrome","Radial Tunnel Syndrome","Elbow OA","Biceps Tendinopathy","Olecranon Bursitis","Pronator Teres Syndrome"],
              wrist: ["Carpal Tunnel Syndrome","De Quervain's Tenosynovitis","TFCC Tear","Scaphoid Fracture","Wrist OA","Ganglion Cyst","Ulnar Nerve Entrapment","Kienbock's Disease"],
              lumbar: ["Lumbar Disc Herniation","Lumbar Facet Syndrome","Lumbar Radiculopathy","Lumbar Canal Stenosis","SIJ Dysfunction","Spondylolisthesis","Piriformis Syndrome","Myofascial Pain","Lumbar Spondylosis","Cauda Equina Syndrome"],
              hip: ["Hip OA","FAI","Hip Labral Tear","Greater Trochanteric Pain Syndrome","Piriformis Syndrome","Snapping Hip","SIJ Dysfunction","Psoas Tendinopathy"],
              knee: ["ACL Injury","Meniscal Tear","Patellofemoral Pain","ITB Syndrome","Knee OA","Pes Anserinus Bursitis","PCL Injury","Patellar Tendinopathy","Hoffa's Fat Pad Syndrome"],
              ankle: ["Lateral Ankle Sprain","Achilles Tendinopathy","Plantar Fasciitis","Anterior Ankle Impingement","Peroneal Tendinopathy","Tibialis Posterior Dysfunction","Sinus Tarsi Syndrome"],
              general: ["Myofascial Pain Syndrome","Fibromyalgia","Central Sensitisation","Referred Pain","Somatic Symptom Disorder","Hypermobility Spectrum Disorder","Complex Regional Pain Syndrome"]
            };
            // Use complete ALL_DIAGNOSES list — region-specific ones bubble to top
            const body = String(data.dem_body_part||data.soap_region||data.cx_region||data.lx_region||"").toLowerCase();
            const PRIORITY = body.includes("cerv")||body.includes("neck") ? DIFF_DX.cervical
              : body.includes("shou") ? DIFF_DX.shoulder
              : body.includes("elbow") ? DIFF_DX.elbow
              : body.includes("wrist")||body.includes("hand") ? DIFF_DX.wrist
              : body.includes("lumb")||body.includes("low back")||body.includes("lx") ? DIFF_DX.lumbar
              : body.includes("hip")||body.includes("pelv") ? DIFF_DX.hip
              : body.includes("knee") ? DIFF_DX.knee
              : body.includes("ankle")||body.includes("foot") ? DIFF_DX.ankle
              : [...DIFF_DX.lumbar,...DIFF_DX.cervical,...DIFF_DX.shoulder];
            // Region-specific first, then all remaining diagnoses
            const allOpts = [...new Set([...PRIORITY, ...ALL_DIAGNOSES])];

            const selectedDiffs = (()=>{ try{ return JSON.parse(v("soap_differential_dx")||"[]"); }catch{return[];} })();
            const toggleDiff = (opt) => {
              try{
                const curr = JSON.parse(v("soap_differential_dx")||"[]");
                set("soap_differential_dx", JSON.stringify(curr.includes(opt)?curr.filter(x=>x!==opt):[...curr,opt]));
              }catch{ set("soap_differential_dx",JSON.stringify([opt])); }
            };

            // Reusable dropdown component (inline)
            const DiagDropdown = ({label, value, onChange, excludeList=[], color="#1E40AF", borderColor="#C7D2FE", badgeColor="#4F46E5"}) => {
              const [open, setOpen] = React.useState(false);
              const [search, setSearch] = React.useState("");
              const filtered = allOpts.filter(o=>!excludeList.includes(o)&&(!search||o.toLowerCase().includes(search.toLowerCase())));
              return <div style={{position:"relative",marginBottom:4}}>
                {/* Input row with dropdown toggle */}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    placeholder={`Type ${label.toLowerCase()}...`}
                    value={value}
                    onChange={e=>onChange(e.target.value)}
                    onFocus={()=>setOpen(true)}
                    style={{...inp,marginBottom:0,flex:1,fontSize:14.5,fontWeight:600,color,borderColor:open?badgeColor:borderColor}}
                  />
                  <button onClick={()=>setOpen(o=>!o)} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${open?badgeColor:borderColor}`,background:open?"#EEF2FF":"#F9FAFB",cursor:"pointer",fontSize:14.5,color:open?badgeColor:"#6B7280",fontWeight:600,whiteSpace:"nowrap"}}>
                    {open ? "▲ Close" : "▼ List"}
                  </button>
                </div>
                {/* Dropdown panel */}
                {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:999,background:"#fff",border:`1.5px solid ${badgeColor}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",overflow:"hidden"}}>
                  <div style={{padding:"8px 10px",borderBottom:"1px solid #F3F4F6",background:"#F9FAFB",display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:14.5,color:"#9CA3AF"}}>🔍</span>
                    <input
                      autoFocus
                      placeholder="Search..."
                      value={search}
                      onChange={e=>setSearch(e.target.value)}
                      style={{flex:1,border:"none",outline:"none",fontSize:14.5,background:"transparent",color:"#374151"}}
                    />
                    {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:14.5}}>✕</button>}
                    <span style={{fontSize:12,color:"#9CA3AF"}}>{filtered.length}</span>
                  </div>
                  <div style={{maxHeight:200,overflowY:"auto"}}>
                    {filtered.length===0
                      ? <div style={{padding:"12px 14px",fontSize:14.5,color:"#9CA3AF",textAlign:"center"}}>No matches</div>
                      : filtered.map((opt,i)=>(
                        <button key={i} onClick={()=>{onChange(opt);setOpen(false);setSearch("");}}
                          style={{display:"block",width:"100%",padding:"10px 14px",fontSize:14.5,fontWeight:500,border:"none",borderBottom:i<filtered.length-1?"1px solid #F9FAFB":"none",background:"transparent",color:"#374151",cursor:"pointer",textAlign:"left"}}>
                          {opt}
                        </button>
                      ))
                    }
                  </div>
                </div>}
                {/* Tap outside to close */}
                {open&&<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:998}}/>}
              </div>;
            };

            return <div style={subCard("#0891b2")}>
              {/* ═══ 1. PROVISIONAL DIAGNOSIS ═══ */}
              <div style={{marginBottom:16}}>
                {subH("Provisional Diagnosis","#0891b2")}

                <ProbableDiagnosis data={data} />

                <DiagDropdown label="Provisional Diagnosis" value={dx} onChange={val=>set("soap_a_diagnosis",val)} color="#1E40AF" borderColor="#C7D2FE" badgeColor="#4F46E5"/>
                <input placeholder="ICD-10 code (e.g. M51.1)" value={icd} onChange={e=>set("soap_icd10",e.target.value)} style={{...inp,marginBottom:0,fontSize:14.5}}/>
                {dx&&<div style={{marginTop:8,padding:"10px 14px",background:"#EEF2FF",border:"2px solid #6366F1",borderRadius:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#4F46E5",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Provisional Diagnosis</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1E40AF",lineHeight:1.3}}>{dx}</div>
                  {icd&&<div style={{fontSize:13,color:"#6366F1",marginTop:2}}>ICD-10: {icd}</div>}
                </div>}
              </div>

              {/* ═══ 2. DIFFERENTIAL DIAGNOSIS ═══ */}
              <div style={{marginBottom:16}}>
                {subH("Differential Diagnosis","#0891b2")}

                {selectedDiffs.length>0&&<div style={{marginBottom:10,padding:"10px 12px",background:"#F5F3FF",border:"2px solid #8B5CF6",borderRadius:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Selected Differentials</div>
                  <ol style={{margin:0,padding:"0 0 0 18px"}}>
                    {selectedDiffs.map((d,i)=><li key={i} style={{fontSize:14.5,color:"#3730A3",fontWeight:600,marginBottom:3,lineHeight:1.4}}>
                      {d} <button onClick={()=>toggleDiff(d)} style={{marginLeft:6,fontSize:12,color:"#9CA3AF",background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button>
                    </li>)}
                  </ol>
                </div>}

                {/* Manual entry */}
                <div style={{fontSize:13,color:"#6B7280",marginBottom:4,fontWeight:500}}>Type manually + Enter:</div>
                <input placeholder="Type and press Enter to add custom differential..." onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){toggleDiff(e.target.value.trim());e.target.value="";}}} style={{...inp,marginBottom:8,fontSize:14.5}}/>

                {/* Select from list */}
                <div style={{fontSize:13,color:"#6B7280",marginBottom:4,fontWeight:500}}>Or select from list:</div>
                <DiagDropdown label="Differential Diagnosis" value="" onChange={val=>{if(val)toggleDiff(val);}} excludeList={selectedDiffs} color="#374151" borderColor="#D1D5DB" badgeColor="#8B5CF6"/>
              </div>
            </div>;
          })()}

          {/* ── Problem List / Key Findings ── */}
          {(probList||posFindings.length>0||negFindings.length>0)&&<>
            {(probList||posFindings.length>0)&&<div style={subCard("#0891b2")}>
              {subH("Problem list","#0891b2")}
              <div style={{fontSize:14.5,color:"#374151",marginBottom:6,lineHeight:1.5}}>{probList||posFindings.slice(0,3).join(". ")}</div>
            </div>}
            {(posFindings.length>0||negFindings.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {posFindings.length>0&&<div style={{padding:"8px 10px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10}}>
                <div style={{fontSize:12,fontWeight:600,color:"#991B1B",marginBottom:5}}>KEY POSITIVES</div>
                {posFindings.map((f,i)=><div key={i} style={{fontSize:12,color:"#374151",padding:"1px 0",display:"flex",gap:4,lineHeight:1.4}}><span style={{color:"#DC2626"}}>·</span>{f}</div>)}
              </div>}
              {negFindings.length>0&&<div style={{padding:"8px 10px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10}}>
                <div style={{fontSize:12,fontWeight:600,color:"#166534",marginBottom:5}}>SCREENED NEGATIVE</div>
                {negFindings.map((f,i)=><div key={i} style={{fontSize:12,color:"#374151",padding:"1px 0",display:"flex",gap:4,lineHeight:1.4}}><span style={{color:"#16A34A"}}>·</span>{f}</div>)}
              </div>}
            </div>}
          </>}

          {/* ── Clinical Notes & Severity ── */}
          <input placeholder="Clinical notes / key findings..." value={rv("soap_clinical_notes")} onChange={e=>set("soap_clinical_notes",e.target.value)} style={inp}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:4}}>
            {[["soap_irritability","Irritability"],["soap_stage","Stage"],["soap_prognosis","Prognosis"],["soap_severity","Severity"]].map(([k,ph])=>(
              <input key={k} placeholder={ph} value={rv(k)} onChange={e=>set(k,e.target.value)} style={{...inp,marginBottom:0}}/>
            ))}
          </div>
          <textarea placeholder="Additional assessment notes..." value={extraA} onChange={e=>setExtraA(e.target.value)} onBlur={()=>set("soap_extra_a",extraA)} style={{...inp,resize:"vertical",minHeight:60,marginTop:6}}/>
        </div>
      </div>

      {/* ── P — PLAN ── */}
      <div id="soap-sec-P" style={card("#DBEAFE","#1D4ED8")}>
        <div style={{...ch("#1D4ED8"),borderBottom:"none"}}>
          {secIcon("rgba(255,255,255,0.15)","#fff","📋")}
          {secTitle("P · Plan","Treatment & goals","#fff")}
          {secBadge("Treatment & goals")}
        </div>
        <div style={cb}>
          {/* Session details */}
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:500,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:8}}>Session details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <input placeholder="Clinician" value={clinician} onChange={e=>setClinician(e.target.value)} style={{...inp,marginBottom:0}}/>
              <input placeholder="Clinic" value={clinic} onChange={e=>setClinic(e.target.value)} style={{...inp,marginBottom:0}}/>
            </div>
            <input placeholder="Session type (e.g. Initial Assessment)" value={session} onChange={e=>setSession(e.target.value)} style={{...inp,marginBottom:8}}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <input placeholder="Total sessions" value={rv("soap_total_sessions")} onChange={e=>set("soap_total_sessions",e.target.value)} style={{flex:"1 1 130px",minWidth:0,border:"none",background:"#F1F0F4",borderRadius:99,padding:"6px 12px",fontSize:13,fontFamily:"inherit",color:"#111827",fontWeight:500,outline:"none"}}/>
              <input placeholder="Frequency (e.g. 2×/week × 4 wks)" value={rv("soap_frequency")} onChange={e=>set("soap_frequency",e.target.value)} style={{flex:"1 1 130px",minWidth:0,border:"none",background:"#F1F0F4",borderRadius:99,padding:"6px 12px",fontSize:13,fontFamily:"inherit",color:"#111827",fontWeight:500,outline:"none"}}/>
            </div>
          </div>

          {/* Goals */}
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:500,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:8}}>Goals</div>
            <span style={lbl}>Short-term goals (2–4 wks)</span>
            <input placeholder="e.g. Reduce pain to under 3/10, sit 45 min without flare-up" value={rv("soap_goal_short")} onChange={e=>set("soap_goal_short",e.target.value)} style={{...inp,marginBottom:(!stGoals&&goals_ar.length>0)?4:8}}/>
            {!stGoals&&goals_ar.length>0&&<div style={{fontSize:12.5,color:"#9CA3AF",marginBottom:8}}>Suggested from assessment: {goals_ar.join(" · ")}</div>}
            <span style={lbl}>Long-term goals (discharge)</span>
            <input placeholder="e.g. Full return to desk work and training, pain-free" value={rv("soap_goal_long")} onChange={e=>set("soap_goal_long",e.target.value)} style={{...inp,marginBottom:0}}/>
          </div>

          {/* HEP summary -- true home-protocol exercises only (HomeProtocolTab.jsx / QuickVisitForm) */}
          {Array.isArray(data.hep_programme)&&data.hep_programme.length>0&&(
            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontSize:16}}>🏠</span>
                <span style={{fontSize:14.5,fontWeight:500,color:"#111827"}}>Home exercise programme</span>
                <span style={{marginLeft:"auto",fontSize:12.5,fontWeight:500,color:"#92400E",background:"#FEF3C7",padding:"2px 8px",borderRadius:99,flexShrink:0}}>{data.hep_programme.length} exercise{data.hep_programme.length!==1?"s":""}</span>
              </div>
              <div style={{fontSize:13,color:"#6B7280",marginBottom:8}}>Frequency: <span style={{color:"#6366F1",fontWeight:600}}>{v("hep_frequency")||"As prescribed"}</span></div>
              {data.hep_programme.slice(0,6).map((ex,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:"#FEF3C7",color:"#92400E",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:14.5,color:"#374151",flex:1,minWidth:0}}>{ex.name}</span>
                  <span style={{fontSize:13,color:"#6B7280",flexShrink:0}}>{ex.sets?`${ex.sets}×${ex.reps||""}`:""}{ex.hold?` · ${ex.hold}s`:""}</span>
                </div>
              ))}
              {data.hep_programme.length>6&&<div style={{fontSize:12.5,color:"#7c3aed",fontWeight:500,marginTop:8}}>+{data.hep_programme.length-6} more</div>}
            </div>
          )}

          {/* Exercise Prescription -- clinical library picks, kept separate from HEP (ExercisePrescriptionModule) */}
          {Array.isArray(data.tx_exercise_prescription)&&data.tx_exercise_prescription.length>0&&(
            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <span style={{fontSize:16}}>💪</span>
                <span style={{fontSize:14.5,fontWeight:500,color:"#111827"}}>Exercise prescription</span>
                <span style={{marginLeft:"auto",fontSize:12.5,fontWeight:500,color:"#6D28D9",background:"#EDE9FE",padding:"2px 8px",borderRadius:99,flexShrink:0}}>{data.tx_exercise_prescription.length} exercise{data.tx_exercise_prescription.length!==1?"s":""}</span>
              </div>
              {data.tx_exercise_prescription.slice(0,6).map((ex,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}>
                  <span style={{width:18,height:18,borderRadius:"50%",background:"#EDE9FE",color:"#6D28D9",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14.5,color:"#374151"}}>{ex.name}</div>
                    {ex.target&&<div style={{fontSize:12,color:"#9CA3AF"}}>{ex.target}</div>}
                  </div>
                  {ex.phase&&<span style={{fontSize:12,fontWeight:500,color:"#6D28D9",background:"#F3F0FF",padding:"2px 7px",borderRadius:99,flexShrink:0}}>{ex.phase}</span>}
                </div>
              ))}
              {data.tx_exercise_prescription.length>6&&<div style={{fontSize:12.5,color:"#6B6B6B",marginTop:8}}>+{data.tx_exercise_prescription.length-6} more</div>}
            </div>
          )}

          {/* Prescription */}
          {Array.isArray(data.tx_techniques)&&data.tx_techniques.length>0&&(
            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:14.5,fontWeight:500,color:"#111827",marginBottom:8}}>Clinic exercises / Treatment this session</div>
              {data.tx_techniques.map((t,i)=>{
                const label = t.type==="manual" ? `${t.technique||"Joint mob"}${t.grade?` Grade ${t.grade}`:""}${t.region?` — ${t.region}`:""}`
                  : t.type==="dn" ? `Dry Needling — ${t.dn_muscle||"unknown muscle"}`
                  : t.type==="st" ? `${t.st_technique||"Soft tissue"}${t.st_region?` — ${t.st_region}`:""}`
                  : t.type==="taping" ? `${t.tape_type||"Taping"}`
                  : t.type==="us" ? `Ultrasound${t.us_freq?` — ${t.us_freq}`:""}`
                  : t.type==="electro" ? `${t.electro_type||"Electrotherapy"}`
                  : (t.technique || "Technique");
                return (
                  <div key={t.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<data.tx_techniques.length-1?"1px solid #F3F4F6":"none"}}>
                    <span style={{width:18,height:18,borderRadius:"50%",background:"#DBEAFE",color:"#1E40AF",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:14.5,color:"#374151"}}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Precautions */}
          <div style={{background:"#FFF7ED",border:"1px solid #FDE4B8",borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0,marginTop:1}}>⚠️</span>
            <textarea placeholder="General advice / precautions (e.g. avoid loaded flexion, stop if symptoms increase)..." value={rv("soap_precautions")} onChange={e=>set("soap_precautions",e.target.value)}
              style={{flex:1,minWidth:0,border:"none",background:"transparent",outline:"none",resize:"vertical",minHeight:36,fontSize:13,fontFamily:"inherit",color:"#854F0B",lineHeight:1.5,padding:0}}/>
          </div>

          {/* Additional details */}
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:500,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:8}}>Additional details</div>
            {modalities&&<div style={{marginBottom:8}}>{modalities.split(",").map((m,i)=><span key={i} style={chip_("#D1FAE5","#065F46")}>{m.trim()}</span>)}</div>}
            <div style={{display:"grid",gap:6}}>
              <input placeholder="Modalities (e.g. Hot pack, IFT, Traction)" value={rv("soap_modalities")} onChange={e=>set("soap_modalities",e.target.value)} style={{...inp,marginBottom:0}}/>
              <input placeholder="Referral (if any)" value={rv("soap_referral")} onChange={e=>set("soap_referral",e.target.value)} style={{...inp,marginBottom:0}}/>
              <input placeholder="Imaging / investigations requested" value={rv("soap_imaging")} onChange={e=>set("soap_imaging",e.target.value)} style={{...inp,marginBottom:0}}/>
              <textarea placeholder="Additional plan notes..." value={extraP} onChange={e=>setExtraP(e.target.value)} onBlur={()=>set("soap_extra_p",extraP)} style={{...inp,resize:"vertical",minHeight:40,marginBottom:0}}/>
            </div>
          </div>

          {/* Sign & lock */}
          {lockSuccess&&<div style={{padding:"8px 12px",background:"#D1FAE5",border:"1px solid #6EE7B7",borderRadius:8,fontSize:14.5,color:"#065F46",marginTop:8}}>✓ Note signed and locked successfully</div>}
          {lockConfirm?<div style={{marginTop:8}}>
            <div style={{fontSize:14.5,color:"#DC2626",marginBottom:6}}>Sign and lock this note? This cannot be undone.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              <button onClick={()=>setLockConfirm(false)} style={{padding:"10px",background:"#F3F4F6",color:"#374151",border:"1px solid #E5E7EB",borderRadius:8,fontSize:14.5,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={handleSign} style={{padding:"10px",background:"#DC2626",color:"#fff",border:"none",borderRadius:8,fontSize:14.5,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Confirm sign &amp; lock</button>
            </div>
          </div>:<button onClick={handleSign} style={{width:"100%",marginTop:10,padding:"12px",background:"#6366F1",color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.01em"}}>Sign &amp; lock note</button>}
        </div>
      </div>

      {/* ── LOCKED NOTES HISTORY ── */}
      {lockedNotes.length>0&&<div style={card()}>
        <div style={ch("#FAFAFA")}>
          {secIcon("#F3F4F6","#374151","🔒")}
          {secTitle(`Locked notes (${lockedNotes.length})`,"Previous signed notes")}
        </div>
        <div style={cb}>
          {[...lockedNotes].reverse().map((n,i)=>(
            <div key={i} style={{marginBottom:10,paddingBottom:10,borderBottom:i<lockedNotes.length-1?"1px solid #F3F4F6":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div><div style={{fontSize:14.5,fontWeight:600,color:"#111827"}}>{n.session}</div><div style={{fontSize:13,color:"#9CA3AF"}}>{n.lockedAtDisplay} · {n.clinician}{n.clinic?" · "+n.clinic:""}</div></div>
                <span style={{padding:"2px 8px",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:100,fontSize:12,fontWeight:600,color:"#DC2626"}}>LOCKED</span>
              </div>
              {["S","O","A","P"].map(key=>(
                <div key={key} style={{marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:2}}>{key} — {{"S":"Subjective","O":"Objective","A":"Assessment","P":"Plan"}[key]}</div>
                  <div style={{background:"#F9FAFB",borderRadius:8,padding:"6px 10px",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",color:"#374151"}}>{n[key]||"—"}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>}

    </div>
  );
}



const PROGRAMME_REGION_TO_LIBRARY = {
  "Lumbar":"lumbar", "Cervical":"cervical", "Thoracic":"thoracic", "Shoulder":"shoulder",
  "Elbow":"elbow", "Hip":"hip", "Knee":"knee", "Ankle & Foot":"ankle", "Posture":"posture_correction",
  "Pelvic floor":"pelvic_floor", "Respiratory":"respiratory", "Older adult":"older_adult",
  "Sports":"sports", "Pilates / Yoga":"pilates_yoga", "Neuro":"neurological",
  "Cardiac":"cardiac", "Hydrotherapy":"hydrotherapy",
};



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
      { name:"Dry Needling — Vastus Lateralis", desc:"DN to lateral quad + TFL if overactive (CPA confirmed). Reduces lateral retinacular tension improving PF tracking.", evidence:"Moderate — VL inhibition improves medial tracking" },
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
      { name:"Gluteal Dry Needling", desc:"DN to glute max + piriformis if overactive CPA pattern. Reduces compression on proximal hamstring from tight external rotators.", evidence:"Moderate — adjunct for compressed tendinopathy" },
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
      { name:"Deep Friction Massage (STTT)", desc:"Cross-friction massage directly to ECRB origin at lateral epicondyle. 5–10 min per session 3×/wk. Firm pressure perpendicular to tendon fibres.", evidence:"Moderate — STTT friction massage: short-term pain relief and tissue remodelling" },
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
function ProtocolPanel({ protocols, openId, setOpenId, openTx, setOpenTx, openPhase, togglePhase, onAdd, onRemove, onUpdate, programme }) {
  return (
    <div style={{ borderTop:"1px solid rgba(0,0,0,0.08)", padding:"10px 14px 14px" }}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
        {protocols.map(p => (
          <button key={p.id} onClick={() => { setOpenId(openId === p.id ? null : p.id); setOpenTx(null); }}
            style={{ padding:"6px 13px", borderRadius:20, fontSize:"0.75rem", fontWeight:700,
              background: openId === p.id ? `${p.color}18` : "transparent",
              border: `1px solid ${openId === p.id ? p.color : "#E0E0E2"}`,
              color: openId === p.id ? p.color : "#6B6B6B", cursor:"pointer" }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>
      {openId && (() => {
        const p = protocols.find(x => x.id === openId);
        if (!p) return null;
        return (
          <div style={{ background:`${p.color}06`, border:`1px solid ${p.color}30`, borderRadius:10, padding:"12px" }}>
            <div style={{ fontSize:"0.8rem", color:p.color, fontWeight:700, marginBottom:12,
              background:`${p.color}12`, display:"inline-block", padding:"3px 10px",
              borderRadius:6, border:`1px solid ${p.color}30` }}>📚 {p.evidence}</div>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              <button onClick={() => setOpenTx(null)} style={{ flex:1, padding:"8px", borderRadius:8,
                border:`1px solid ${openTx !== "tx" ? p.color : "#E0E0E2"}`,
                background: openTx !== "tx" ? `${p.color}15` : "transparent",
                color: openTx !== "tx" ? p.color : "#6B6B6B", fontSize:"0.75rem", fontWeight:800, cursor:"pointer" }}>
                💪 Exercise Protocol
              </button>
              <button onClick={() => setOpenTx("tx")} style={{ flex:1, padding:"8px", borderRadius:8,
                border:`1px solid ${openTx === "tx" ? p.color : "#E0E0E2"}`,
                background: openTx === "tx" ? `${p.color}15` : "transparent",
                color: openTx === "tx" ? p.color : "#6B6B6B", fontSize:"0.75rem", fontWeight:800, cursor:"pointer" }}>
                🏥 Treatment Techniques
              </button>
            </div>
            {openTx !== "tx" && p.phases.map((ph, pi) => (
              <div key={pi} style={{ marginBottom:8, border:`1px solid ${ph.color}30`, borderRadius:8, overflow:"hidden" }}>
                <div onClick={() => togglePhase(`${p.id}_${pi}`)}
                  style={{ padding:"10px 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", background:`${ph.color}10` }}>
                  <div style={{ fontWeight:800, fontSize:"0.82rem", color:ph.color }}>{ph.phase}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:"0.8rem", color:"#6B6B6B" }}>{ph.exercises.length} exercises</span>
                    <span style={{ color:ph.color, fontSize:"0.8rem" }}>{openPhase[`${p.id}_${pi}`] ? "▲" : "▼"}</span>
                  </div>
                </div>
                {openPhase[`${p.id}_${pi}`] && (
                  <div style={{ padding:"10px 12px" }}>
                    {ph.exercises.map((ex, ei) => {
                      const exId = "proto_" + ex.name.toLowerCase().replace(/[^a-z0-9]/g,"_");
                      const progEntry = programme?.find(e=>e.id===exId);
                      const inProg = !!progEntry;
                      const full = {...ex, id:exId, phase:ph.phase, target:ex.cues?.slice(0,40)||ex.name};
                      return (
                        <ExerciseDetailCard key={ei} ex={progEntry||full} inProg={inProg}
                          onAdd={()=>onAdd&&onAdd(full)} onRemove={()=>onRemove&&onRemove(exId)}
                          onUpdate={(field,val)=>onUpdate&&onUpdate(exId,field,val)} accentColor={ph.color}/>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {openTx === "tx" && (
              <div>
                {p.treatment.map((tx, ti) => (
                  <div key={ti} style={{ background:"#FFFFFF", border:`1px solid ${p.color}25`, borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                    <div style={{ fontWeight:800, fontSize:"0.76rem", color:p.color, marginBottom:5 }}>🏥 {tx.name}</div>
                    <div style={{ fontSize:"0.73rem", color:"#334155", lineHeight:1.6, marginBottom:6 }}>{tx.desc}</div>
                    <div style={{ fontSize:"0.82rem", color:"#7f5af0" }}>📚 {tx.evidence}</div>
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
// ─── Reusable rich exercise card (same layout as the main Exercise Library) ──
function ExerciseDetailCard({ ex, inProg, onAdd, onRemove, onUpdate, accentColor="#7c3aed" }) {
  const [open, setOpen] = React.useState(false);
  const phaseColors = { "Phase 1":"#00c97a", "Phase 2":"#ffb300", "Phase 3":"#ff4d6d" };
  return (
    <div style={{ background:"#ffffff", border:`1px solid ${inProg?accentColor+"50":"#E0E0E2"}`, borderRadius:12, overflow:"hidden", marginBottom:10 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"14px", cursor:"pointer" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"0.94rem", fontWeight:700, color:"#0D0D0D", marginBottom:6 }}>{ex.name}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:6 }}>
              {ex.phase && <span style={{ fontSize:"0.69rem", fontWeight:700, padding:"2px 8px", borderRadius:6, background:`${phaseColors[ex.phase]||"#6B6B6B"}25`, color:phaseColors[ex.phase]||"#6B6B6B", border:`1px solid ${phaseColors[ex.phase]||"#6B6B6B"}40` }}>{ex.phase}</span>}
              {ex.evidence && <span style={{ fontSize:"0.69rem", fontWeight:700, color:"#b45309" }}>⭐ {ex.evidence.split(" — ")[0]}</span>}
            </div>
            {ex.target && <div style={{ fontSize:"0.78rem", color:"#6B6B6B" }}>{ex.target}</div>}
          </div>
          {(onAdd||onRemove) && (
            <button onClick={e=>{ e.stopPropagation(); inProg ? (onRemove&&onRemove()) : (onAdd&&onAdd()); }}
              style={{ flexShrink:0, padding:"7px 14px", borderRadius:8, fontSize:"0.78rem", fontWeight:800,
                border:`1px solid ${inProg?"rgba(255,77,109,0.4)":"rgba(0,201,122,0.4)"}`,
                background:inProg?"rgba(255,77,109,0.12)":"rgba(0,201,122,0.12)",
                color:inProg?"#ff4d6d":"#00c97a", cursor:"pointer" }}>
              {inProg?"✕ Remove":"+ Add"}
            </button>
          )}
        </div>
        {!open && (
          <div style={{ display:"flex", justifyContent:"center", marginTop:10, paddingTop:10, borderTop:"1px solid #F1EFE8" }}>
            <span style={{ color:"#B4B2A9", fontSize:"0.75rem" }}>▾ tap for sets, reps, cues</span>
          </div>
        )}
      </div>
      {open && (
        <div style={{ padding:"0 12px 12px", borderTop:"1px solid #E0E0E2" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, margin:"10px 0" }}>
            {[["Sets","sets","customSets"],["Reps","reps","customReps"],["Hold (s)","hold","customHold"],["Freq","freq","customFreq"]].map(([l,baseField,customField])=>{
              const val = inProg ? (ex[customField] ?? ex[baseField] ?? "") : ex[baseField];
              return (
                <div key={l} style={{ background:"#FAFAFA", borderRadius:8, padding:"7px", textAlign:"center" }}>
                  {inProg&&onUpdate ? (
                    <input value={val} onChange={e=>onUpdate(customField,e.target.value)}
                      style={{ width:"100%", textAlign:"center", fontSize:"0.85rem", fontWeight:900, color:accentColor, background:"transparent", border:"none", outline:"none", fontFamily:"inherit", padding:0 }}/>
                  ) : (
                    <div style={{ fontSize:"0.85rem", fontWeight:900, color:accentColor }}>{baseField==="hold"?`${val}s`:val}</div>
                  )}
                  <div style={{ fontSize:"0.75rem", color:"#6B6B6B", textTransform:"uppercase" }}>{l}</div>
                </div>
              );
            })}
          </div>
          {inProg&&onUpdate&&<div style={{ fontSize:"0.7rem", color:"#9CA3AF", textAlign:"center", marginTop:-4, marginBottom:6 }}>Tap a value above to adjust for this patient</div>}
          {ex.desc && <div style={{ fontSize:"0.73rem", color:"#0D0D0D", lineHeight:1.6, marginBottom:7 }}>{ex.desc}</div>}
          {ex.cues && <div style={{ padding:"7px 10px", background:"rgba(255,179,0,0.07)", border:"1px solid rgba(255,179,0,0.2)", borderRadius:8, fontSize:"0.8rem", color:"#ffb300", marginBottom:7 }}>💡 {ex.cues}</div>}
          {ex.progression && <div style={{ fontSize:"0.75rem", color:"#00c97a", marginBottom:4 }}>📈 Progression: {ex.progression}</div>}
          {ex.evidence && <div style={{ fontSize:"0.82rem", color:"#7f5af0" }}>📚 Evidence: {ex.evidence}</div>}
        </div>
      )}
    </div>
  );
}

// ─── QUICK TEMPLATES PANEL ────────────────────────────────────────────────────
function QuickTemplatesPanel({ applyTemplate, appendTemplate, addTx, addedTx=[], onAdd, onRemove, onUpdate, onLoadTemplate, programme }) {
  const [open,       setOpen]       = useState(false);
  const [activeTab,  setActiveTab]  = useState("quick");
  const [openId,     setOpenId]     = useState(null);
  const [openTx,     setOpenTx]     = useState(null);
  const [openPhase,  setOpenPhase]  = useState({});
  const [tSearch,    setTSearch]    = useState("");
  const [openTpl,    setOpenTpl]    = useState(null);

  const togglePhase = (key) => setOpenPhase(p => ({ ...p, [key]: !p[key] }));

  const TAB_REGION_MAP = {
    knee:"Knee", shoulder:"Shoulder", elbow:"Elbow", hip:"Hip",
    lumbar:"Lumbar", cervical:"Cervical", posture:"Posture",
    ankle:"Ankle & Foot", thoracic:"Thoracic", pelvic:"Pelvic floor",
    respiratory:"Respiratory", older:"Older adult", sports:"Sports",
    pilates:"Pilates / Yoga", neuro:"Neuro", cardiac:"Cardiac", hydro:"Hydrotherapy",
  };

  const TemplateCard = ({ templateKey:key, t }) => {
    const tx = TEMPLATE_TX[key];
    const isOpen = openTpl === key;
    const added = t.exercises.filter(id => programme?.find(p=>p.id===id)).length;
    // Manual therapy + modality chips count toward "added" too -- previously
    // this summary only ever reflected exercises, so tapping a manual/
    // modality chip (which does get saved) looked like it had no visible
    // effect on the template's own progress indicator.
    const txAll = tx ? [...(tx.manual||[]), ...(tx.machine||[])] : [];
    const txAdded = txAll.filter(m => addedTx.includes(m)).length;
    return (
      <div key={key} style={{ marginBottom:4 }}>
        <div onClick={()=>setOpenTpl(isOpen?null:key)} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 10px", borderRadius:8, cursor:"pointer", background:isOpen?"transparent":"#FFFFFF", border:`1px solid ${isOpen?"rgba(124,58,237,0.35)":"#E0E0E2"}` }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.66rem", fontWeight:700, color:"#0D0D0D" }}>{t.label}</div>
            <div style={{ fontSize:"0.75rem", color:"#6B6B6B" }}>{t.exercises.length} exercises{added>0?` · ${added} added`:""}{txAll.length?` · ${txAll.length} manual/modality${txAdded>0?` (${txAdded} added)`:""}`:""}</div>
          </div>
          <span style={{ fontSize:"0.61rem", color:"#7c3aed", fontWeight:800 }}>{isOpen?"▲":"▼"}</span>
        </div>
        {isOpen && (
          <div style={{ padding:"8px 10px", border:"1px dashed rgba(124,58,237,0.3)", borderTop:"none", borderRadius:"0 0 8px 8px", background:"transparent" }}>
            {t.note&&(
              <div style={{ padding:"7px 10px", background:"rgba(217,119,6,0.08)", border:"1px solid rgba(217,119,6,0.25)", borderRadius:7, marginBottom:8, fontSize:"0.68rem", color:"#854f0b", lineHeight:1.5 }}>
                ⚠️ {t.note}
              </div>
            )}
            <button onClick={()=>{onLoadTemplate&&onLoadTemplate(key);setOpenTpl(null);}} style={{ width:"100%", padding:"9px", borderRadius:7, border:"none", background:"linear-gradient(135deg,#7c3aed,#9333ea)", color:"#fff", fontWeight:800, fontSize:"0.73rem", cursor:"pointer", marginBottom:8 }}>
              → View & add {t.exercises.length} exercises in Exercise Library
            </button>
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:"0.51rem", fontWeight:800, color:"#6B6B6B", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>💪 Included exercises — tap to add, adjust sets/reps/hold/freq once added</div>
              {t.exercises.map(id => {
                const ex = ALL_EXERCISES.find(e=>e.id===id);
                if(!ex) return null;
                const progEntry = programme?.find(p=>p.id===id);
                const inProg = !!progEntry;
                return (
                  <ExerciseDetailCard key={id} ex={progEntry||ex} inProg={inProg}
                    onAdd={()=>onAdd&&onAdd(ex)} onRemove={()=>onRemove&&onRemove(ex.id)}
                    onUpdate={(field,val)=>onUpdate&&onUpdate(ex.id,field,val)} accentColor="#7c3aed"/>
                );
              })}
            </div>
            {tx&&(tx.manual||[]).length>0&&(
              <div style={{ marginBottom:5 }}>
                <div style={{ fontSize:"0.51rem", fontWeight:800, color:"#6B6B6B", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>🤲 Manual therapy</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                  {tx.manual.map(m=>{ const added=addedTx.includes(m); return (
                    <button key={m} onClick={()=>addTx&&addTx(m)} disabled={added} style={{ padding:"2px 8px", borderRadius:99, border:`1px solid ${added?"rgba(0,201,122,0.4)":"rgba(124,58,237,0.3)"}`, background:added?"rgba(0,201,122,0.1)":"transparent", color:added?"#00c97a":"#7c3aed", fontWeight:700, fontSize:"0.56rem", cursor:added?"default":"pointer" }}>{added?"✓ ":""}{m}</button>
                  );})}
                </div>
              </div>
            )}
            {tx&&(tx.machine||[]).length>0&&(
              <div>
                <div style={{ fontSize:"0.51rem", fontWeight:800, color:"#6B6B6B", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>⚡ Modality</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                  {tx.machine.map(m=>{ const added=addedTx.includes(m); return (
                    <button key={m} onClick={()=>addTx&&addTx(m)} disabled={added} style={{ padding:"2px 8px", borderRadius:99, border:`1px solid ${added?"rgba(0,201,122,0.4)":"rgba(0,229,255,0.3)"}`, background:added?"rgba(0,201,122,0.1)":"transparent", color:added?"#00c97a":"#00c97a", fontWeight:700, fontSize:"0.56rem", cursor:added?"default":"pointer" }}>{added?"✓ ":""}{m}</button>
                  );})}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const QuickTemplatesForRegion = ({ regionName }) => {
    const entries = Object.entries(PROGRAMME_TEMPLATES).filter(([k,t]) => t.region === regionName);
    if (!entries.length) return null;
    return (
      <div style={{ marginTop:14, paddingTop:12, borderTop:"1px dashed #E0E0E2" }}>
        <div style={{ fontSize:"0.6rem", fontWeight:800, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
          ⚡ Quick templates — {regionName}
        </div>
        {entries.map(([key,t]) => <TemplateCard key={key} templateKey={key} t={t}/>)}
      </div>
    );
  };

  const TABS = [
    { id:"lumbar",      label:"🦴 Lumbar",      color:"#0f766e" },
    { id:"cervical",    label:"🧠 Cervical",    color:"#9333ea" },
    { id:"thoracic",    label:"🫁 Thoracic",    color:"#059669" },
    { id:"shoulder",    label:"💪 Shoulder",    color:"#7f5af0" },
    { id:"elbow",       label:"🦾 Elbow",       color:"#ffb300" },
    { id:"hip",         label:"🍑 Hip",         color:"#ff7043" },
    { id:"knee",        label:"🦵 Knee",        color:"#ff4d6d" },
    { id:"ankle",       label:"🦶 Ankle & Foot",color:"#0d9488" },
    { id:"posture",     label:"🧍 Posture",     color:"#0891b2" },
    { id:"pelvic",      label:"🌸 Pelvic Floor",color:"#db2777" },
    { id:"respiratory", label:"🌬️ Respiratory", color:"#0284c7" },
    { id:"older",       label:"👵 Older Adult", color:"#78716c" },
    { id:"sports",      label:"🏃 Sports",      color:"#ea580c" },
    { id:"pilates",     label:"🧘 Pilates/Yoga",color:"#8b5cf6" },
    { id:"neuro",       label:"⚡ Neuro",       color:"#4338ca" },
    { id:"cardiac",     label:"❤️ Cardiac",     color:"#e11d48" },
    { id:"hydro",       label:"💧 Hydrotherapy",color:"#0ea5e9" },
  ];

  return (
    <div style={{ background:"#ffffff", border:"1px solid #E0E0E2", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:"0.85rem" }}>📋</span>
          <span style={{ fontSize:"0.82rem", fontWeight:800, color:"#7c3aed" }}>Protocols &amp; Templates</span>
          <span style={{ fontSize:"0.78rem", color:"#6B6B6B" }}>Quick-load evidence-based programmes</span>
        </div>
        <span style={{ color:"#6B6B6B", fontSize:"0.8rem" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ borderTop:"1px solid #e8e0f4" }}>
          <div style={{ display:"flex", gap:3, padding:"7px 10px", overflowX:"auto", borderBottom:"1px solid #e8e0f4", background:"#F2F2F4" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setOpenId(null); setOpenTpl(null); }}
                style={{ padding:"4px 10px", borderRadius:7, fontSize:"0.8rem", fontWeight:activeTab===t.id?800:500, flexShrink:0,
                  border:`1px solid ${activeTab===t.id?t.color+"60":"#E0E0E2"}`,
                  background: activeTab===t.id?`${t.color}12`:"transparent",
                  color: activeTab===t.id?t.color:"#6B6B6B", cursor:"pointer" }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding:"10px 12px 12px" }}>

            {activeTab === "lumbar" && (
              <QuickTemplatesForRegion regionName="Lumbar"/>
            )}

            {activeTab === "cervical" && (
              <QuickTemplatesForRegion regionName="Cervical"/>
            )}

            {activeTab === "knee" && (() => {
              return (
                <div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:9 }}>
                    {KNEE_PROTOCOLS.map(kp => (
                      <button key={kp.id} onClick={() => { setOpenId(openId===kp.id?null:kp.id); setOpenTx(null); }}
                        style={{ padding:"5px 12px", borderRadius:20, fontSize:"0.61rem", fontWeight:600,
                          background: openId===kp.id?`${kp.color}18`:"transparent",
                          border:`1px solid ${openId===kp.id?kp.color:"#E0E0E2"}`,
                          color: openId===kp.id?kp.color:"#6B6B6B", cursor:"pointer" }}>
                        {kp.icon} {kp.label}
                      </button>
                    ))}
                  </div>
                  {openId && (() => {
                    const kp = KNEE_PROTOCOLS.find(k => k.id === openId);
                    if(!kp) return null;
                    return (
                      <div style={{ background:`${kp.color}06`, border:`1px solid ${kp.color}30`, borderRadius:9, padding:"10px" }}>
                        <div style={{ fontSize:"0.57rem", color:kp.color, fontWeight:700, marginBottom:8, background:`${kp.color}12`, display:"inline-block", padding:"2px 9px", borderRadius:5, border:`1px solid ${kp.color}30` }}>📚 {kp.evidence}</div>
                        <div style={{ display:"flex", gap:5, marginBottom:9 }}>
                          <button onClick={() => setOpenTx(null)} style={{ flex:1, padding:"6px", borderRadius:7, border:`1px solid ${openTx!=="tx"?kp.color:"#E0E0E2"}`, background:openTx!=="tx"?`${kp.color}15`:"transparent", color:openTx!=="tx"?kp.color:"#6B6B6B", fontSize:"0.8rem", fontWeight:800, cursor:"pointer" }}>💪 Exercises</button>
                          <button onClick={() => setOpenTx("tx")} style={{ flex:1, padding:"6px", borderRadius:7, border:`1px solid ${openTx==="tx"?kp.color:"#E0E0E2"}`, background:openTx==="tx"?`${kp.color}15`:"transparent", color:openTx==="tx"?kp.color:"#6B6B6B", fontSize:"0.8rem", fontWeight:800, cursor:"pointer" }}>🏥 Treatment</button>
                        </div>
                        {openTx !== "tx" && kp.phases.map((ph, pi) => (
                          <div key={pi} style={{ marginBottom:6, border:`1px solid ${ph.color}30`, borderRadius:7, overflow:"hidden" }}>
                            <div onClick={() => togglePhase(`${kp.id}_${pi}`)} style={{ padding:"7px 10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", background:`${ph.color}10` }}>
                              <div style={{ fontWeight:800, fontSize:"0.75rem", color:ph.color }}>{ph.phase}</div>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ fontSize:"0.57rem", color:"#6B6B6B" }}>{ph.exercises.length} ex</span>
                                <span style={{ color:ph.color, fontSize:"0.73rem" }}>{openPhase[`${kp.id}_${pi}`]?"▲":"▼"}</span>
                              </div>
                            </div>
                            {openPhase[`${kp.id}_${pi}`] && (
                              <div style={{ padding:"8px 10px" }}>
                                {ph.exercises.map((ex, ei) => {
                                  const exId = "proto_" + ex.name.toLowerCase().replace(/[^a-z0-9]/g,"_");
                                  const inProg = programme?.find(e=>e.id===exId);
                                  return (
                                  <ExerciseDetailCard key={ei}
                                    ex={inProg||{...ex,id:exId,phase:ph.phase,target:ex.cues?.slice(0,40)||ex.name}}
                                    inProg={!!inProg}
                                    onAdd={()=>onAdd&&onAdd({...ex,id:exId,phase:ph.phase,target:ex.cues?.slice(0,40)||ex.name})}
                                    onRemove={()=>onRemove&&onRemove(exId)}
                                    onUpdate={(field,val)=>onUpdate&&onUpdate(exId,field,val)}
                                    accentColor={ph.color}/>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                        {openTx === "tx" && kp.treatment.map((tx,ti) => (
                          <div key={ti} style={{ background:"#FFFFFF", border:`1px solid ${kp.color}25`, borderRadius:7, padding:"8px 10px", marginBottom:6 }}>
                            <div style={{ fontWeight:800, fontSize:"0.69rem", color:kp.color, marginBottom:3 }}>🏥 {tx.name}</div>
                            <div style={{ fontSize:"0.66rem", color:"#334155", lineHeight:1.5, marginBottom:3 }}>{tx.desc}</div>
                            <div style={{ fontSize:"0.57rem", color:"#7f5af0" }}>📚 {tx.evidence}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <QuickTemplatesForRegion regionName="Knee"/>
                </div>
              );
            })()}

            {activeTab === "shoulder" && (
              <>
                <ProtocolPanel protocols={SHOULDER_PROTOCOLS} openId={openId} setOpenId={setOpenId} openTx={openTx} setOpenTx={setOpenTx} openPhase={openPhase} togglePhase={togglePhase} onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate} programme={programme} />
                <QuickTemplatesForRegion regionName="Shoulder"/>
              </>
            )}

            {activeTab === "elbow" && (
              <>
                <ProtocolPanel protocols={ELBOW_PROTOCOLS} openId={openId} setOpenId={setOpenId} openTx={openTx} setOpenTx={setOpenTx} openPhase={openPhase} togglePhase={togglePhase} onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate} programme={programme} />
                <QuickTemplatesForRegion regionName="Elbow"/>
              </>
            )}

            {activeTab === "hip" && (
              <>
                <ProtocolPanel protocols={HIP_PROTOCOLS} openId={openId} setOpenId={setOpenId} openTx={openTx} setOpenTx={setOpenTx} openPhase={openPhase} togglePhase={togglePhase} onAdd={onAdd} onRemove={onRemove} onUpdate={onUpdate} programme={programme} />
                <QuickTemplatesForRegion regionName="Hip"/>
              </>
            )}

            {activeTab === "posture" && (
              <QuickTemplatesForRegion regionName="Posture"/>
            )}

            {activeTab === "ankle" && (
              <QuickTemplatesForRegion regionName="Ankle & Foot"/>
            )}

            {activeTab === "thoracic" && (
              <QuickTemplatesForRegion regionName="Thoracic"/>
            )}

            {activeTab === "pelvic" && (
              <QuickTemplatesForRegion regionName="Pelvic floor"/>
            )}

            {activeTab === "respiratory" && (
              <QuickTemplatesForRegion regionName="Respiratory"/>
            )}

            {activeTab === "older" && (
              <QuickTemplatesForRegion regionName="Older adult"/>
            )}

            {activeTab === "sports" && (
              <QuickTemplatesForRegion regionName="Sports"/>
            )}

            {activeTab === "pilates" && (
              <QuickTemplatesForRegion regionName="Pilates / Yoga"/>
            )}

            {activeTab === "neuro" && (
              <QuickTemplatesForRegion regionName="Neuro"/>
            )}

            {activeTab === "cardiac" && (
              <QuickTemplatesForRegion regionName="Cardiac"/>
            )}

            {activeTab === "hydro" && (
              <QuickTemplatesForRegion regionName="Hydrotherapy"/>
            )}

          </div>
        </div>
      )}
    </div>
  );
}


function ExercisePrescriptionModule({ data, set }) {
  // programme derives directly from shared data — always in sync with QuickVisitForm
  const programme = Array.isArray(data?.tx_exercise_prescription) ? data.tx_exercise_prescription : [];
  const [activeRegion, setActiveRegion] = useState("lumbar");
  const [activePhase,  setActivePhase]  = useState("All");
  const [search,       setSearch]       = useState("");
  const [openEx,       setOpenEx]       = useState(null);
  const [clinician,    setClinician]    = useState("");
  const [reviewDate,   setReviewDate]   = useState("");
  const [templateFilter, setTemplateFilter] = useState(null);
  const libraryRef = React.useRef(null);

  const phases = ["All","Phase 1","Phase 2","Phase 3"];
  const phaseColor = {"Phase 1":"#00c97a","Phase 2":"#ffb300","Phase 3":"#ff4d6d"};

  // Sync every programme change back into shared patient data
  const syncProgramme = (next) => { if(set) set("tx_exercise_prescription", next); };

  const _hepSession = () => (Array.isArray(data?.tx_sessions)?data.tx_sessions.length:0)+1;
  const _hepLog = (change) => { if(!set) return; const log=Array.isArray(data?.hep_log)?data.hep_log:[]; set("hep_log",[{session:_hepSession(),date:new Date().toLocaleDateString("en-GB"),changes:[change],version:parseInt(data?.hep_version)||1},...log]); };
  const addEx = (ex) => { if(programme.find(p=>p.id===ex.id)) return; syncProgramme([...programme,{...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:_hepSession(),addedDate:new Date().toISOString()}]); _hepLog(`＋ ${ex.name}`); };

  // Append exercises from PROGRAMME_TEMPLATES (does not replace existing programme)
  const appendFromTemplate = (key) => {
    const t=PROGRAMME_TEMPLATES[key]; if(!t) return;
    const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean).filter(e=>!programme.find(p=>p.id===e.id));
    if(!exs.length) return;
    syncProgramme([...programme,...exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedDate:new Date().toISOString()}))]);
    _hepLog(`＋ ${t.label} template (${exs.length} ex${exs.length!==1?"s":""})`);
  };

  // Add a quick technique chip (manual therapy / modality) as a real entry in
  // data.tx_techniques — the same array the Techniques tab reads and displays.
  // Previously this wrote to data.tx_quick, a field nothing in the app ever showed.
  const techniquesList = Array.isArray(data?.tx_techniques) ? data.tx_techniques : [];
  const addedTechniqueLabels = techniquesList.map(t=>t.technique).filter(Boolean);
  const addTxChip = (chip) => {
    if(!set) return;
    if(addedTechniqueLabels.includes(chip)) return;
    const entry = { id:Math.random().toString(36).slice(2,9), type:"quick", technique:chip,
      region:"", grade:"", laterality:"", dosage:"", duration:"", response:"", notes:"" };
    set("tx_techniques", [...techniquesList, entry]);
  };
  const removeEx = (id) => { const ex=programme.find(e=>e.id===id); syncProgramme(programme.filter(e=>e.id!==id)); if(ex) _hepLog(`− ${ex.name}`); };
  const updateEx = (id,field,val) => syncProgramme(programme.map(e=>e.id===id?{...e,[field]:val}:e));
  const applyTemplate = (key) => { const t=PROGRAMME_TEMPLATES[key]; const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean); syncProgramme(exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:""}))); };

  const onLoadTemplate = (key) => {
    const t = PROGRAMME_TEMPLATES[key]; if(!t) return;
    const libRegion = PROGRAMME_REGION_TO_LIBRARY[t.region];
    if (libRegion && EXERCISE_DB[libRegion]) setActiveRegion(libRegion);
    setActivePhase("All"); setSearch("");
    setTemplateFilter({ key, label:t.label, ids:t.exercises });
    setTimeout(()=>{ libraryRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }); }, 60);
  };

  const region = EXERCISE_DB[activeRegion];
  const filteredCategories = region ? Object.entries(region.categories).reduce((acc,[cat,exs])=>{
    const filtered=exs.filter(e=>(activePhase==="All"||e.phase===activePhase)&&(!search||e.name.toLowerCase().includes(search.toLowerCase())||e.target.toLowerCase().includes(search.toLowerCase())));
    if(filtered.length) acc[cat]=filtered;
    return acc;
  },{}) : {};

  const printHEP = () => {
    if(!programme.length) return;
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Exercise Prescription</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}body{background:#fff;color:#1a1a2e;font-size:11px;line-height:1.55}.header{border-bottom:3px solid #0077b6;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}.logo{font-size:20px;font-weight:900;color:#0077b6}.logo span{color:#00b4d8}.meta{text-align:right;font-size:10px;color:#555}.ex{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}.ex-header{background:#0077b6;color:#fff;padding:8px 12px;display:flex;justify-content:space-between;align-items:center}.ex-title{font-size:12px;font-weight:800}.ex-phase{font-size:9px;opacity:0.8}.ex-body{padding:10px 12px}.ex-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.ex-stat{background:#f0f9ff;border-radius:6px;padding:5px 8px;text-align:center}.ex-stat-val{font-size:13px;font-weight:900;color:#0077b6}.ex-stat-label{font-size:8px;color:#64748b;text-transform:uppercase}.ex-target{font-size:9px;color:#7f5af0;font-weight:700;margin-bottom:5px}.ex-desc{font-size:10.5px;color:#334155;margin-bottom:6px;line-height:1.55}.ex-cues{background:#fefce8;border-left:3px solid #fbbf24;padding:5px 8px;font-size:10px;color:#713f12;margin-bottom:5px}.ex-prog{font-size:9.5px;color:#059669;margin-top:5px}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}.sig{margin-top:20px;display:flex;gap:30px}.sig-line{border-bottom:1px solid #94a3b8;height:28px;margin-bottom:3px}.sig-label{font-size:8px;color:#64748b}</style>
</head><body>
<div class="header"><div><div class="logo">Physio<span>Pro</span></div><div style="font-size:11px;color:#555;margin-top:2px">Exercise Prescription</div></div><div class="meta"><div><b>Patient:</b> ${data?.dem_name||"—"}</div><div><b>Date:</b> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div><div><b>Clinician:</b> ${clinician||"—"}</div>${reviewDate?`<div><b>Review:</b> ${reviewDate}</div>`:""}</div></div>
<p style="font-size:10px;color:#555;margin-bottom:14px">Perform exercises as prescribed. Stop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.</p>
${programme.map((ex,i)=>`<div class="ex"><div class="ex-header"><span class="ex-title">${i+1}. ${ex.name}</span><span class="ex-phase">${ex.phase||""}</span></div><div class="ex-body"><div class="ex-target">🎯 ${ex.target}</div><div class="ex-grid"><div class="ex-stat"><div class="ex-stat-val">${ex.customSets}</div><div class="ex-stat-label">Sets</div></div><div class="ex-stat"><div class="ex-stat-val">${ex.customReps}</div><div class="ex-stat-label">Reps</div></div><div class="ex-stat"><div class="ex-stat-val">${ex.customHold}s</div><div class="ex-stat-label">Hold</div></div><div class="ex-stat"><div class="ex-stat-val" style="font-size:9px">${ex.customFreq}</div><div class="ex-stat-label">Freq</div></div></div><div class="ex-desc">${ex.desc}</div><div class="ex-cues">💡 ${ex.cues}</div>${ex.notes?`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:5px 8px;font-size:10px;margin-top:5px"><b>Notes:</b> ${ex.notes}</div>`:""}<div class="ex-prog">📈 ${ex.progression}</div><div style="margin-top:8px;font-size:9px;color:#94a3b8">Pain (0–10): ___/10 &nbsp;&nbsp; ☐ Mon ☐ Tue ☐ Wed ☐ Thu ☐ Fri ☐ Sat ☐ Sun</div></div></div>`).join("")}
<div class="sig"><div style="flex:1"><div class="sig-line"></div><div class="sig-label">Clinician Signature</div></div><div style="flex:1"><div class="sig-line"></div><div class="sig-label">Patient Signature</div></div></div>
<div class="footer">Generated by PhysioPro · ${new Date().toLocaleString()}</div>
</body></html>`;
    downloadPDFFromHTML(html, `HEP_${data?.dem_name || "Patient"}_${Date.now()}.pdf`);
  };

  const inp={width:"100%",background:"#FFFFFF",border:"1px solid #E0E0E2",borderRadius:8,color:"#0D0D0D",fontFamily:"inherit",outline:"none",padding:"7px 10px",fontSize:"0.75rem"};

  return(
    <div>
      {/* ── QUICK TEMPLATES + KNEE PROTOCOLS ── */}
      <QuickTemplatesPanel applyTemplate={applyTemplate} appendTemplate={appendFromTemplate} addTx={addTxChip} addedTx={addedTechniqueLabels} onAdd={addEx} onRemove={removeEx} onUpdate={updateEx} onLoadTemplate={onLoadTemplate} programme={programme} />

      <div ref={libraryRef}/>

      {templateFilter && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",padding:"10px 12px",background:"rgba(124,58,237,0.06)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:10,marginBottom:10}}>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:"#7c3aed"}}>📋 Loaded: {templateFilter.label} ({templateFilter.ids.length} exercises)</div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>{ templateFilter.ids.forEach(id=>{ const ex=ALL_EXERCISES.find(e=>e.id===id); if(ex) addEx(ex); }); }}
              style={{padding:"5px 10px",borderRadius:7,border:"none",background:"linear-gradient(135deg,#7c3aed,#9333ea)",color:"#fff",fontWeight:800,fontSize:"0.72rem",cursor:"pointer"}}>
              + Add all
            </button>
            <button onClick={()=>setTemplateFilter(null)}
              style={{padding:"5px 10px",borderRadius:7,border:"1px solid #E0E0E2",background:"#fff",color:"#6B6B6B",fontWeight:700,fontSize:"0.72rem",cursor:"pointer"}}>
              ✕ Clear
            </button>
          </div>
        </div>
      )}

      {/* Region selector */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <label style={{fontSize:"0.75rem",fontWeight:700,color:"#6B6B6B",whiteSpace:"nowrap"}}>📍 Region:</label>
        <div style={{position:"relative",flex:1,minWidth:0}}>
          <select
            value={activeRegion}
            onChange={e=>setActiveRegion(e.target.value)}
            style={{width:"100%",boxSizing:"border-box",appearance:"none",WebkitAppearance:"none",MozAppearance:"none",
              padding:"9px 34px 9px 12px",borderRadius:10,border:"1.5px solid #7c3aed",background:"rgba(124,58,237,0.06)",
              color:"#7c3aed",fontSize:"0.8rem",fontFamily:"inherit",fontWeight:700,cursor:"pointer",outline:"none"}}
          >
            {Object.entries(EXERCISE_DB).map(([key,r])=>(
              <option key={key} value={key}>{r.icon} {r.label}</option>
            ))}
          </select>
          <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:"#7c3aed",fontSize:"0.7rem"}}>▾</span>
        </div>
      </div>

      {/* Phase filter — own scrollable row */}
      <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:2}}>
        {phases.map(p=>(
          <button key={p} onClick={()=>setActivePhase(p)}
            style={{flexShrink:0,padding:"6px 14px",borderRadius:20,fontSize:"0.75rem",fontWeight:700,
              border:`1px solid ${activePhase===p?(phaseColor[p]||"#7c3aed"):"#E0E0E2"}`,
              background:activePhase===p?`${phaseColor[p]||"#7c3aed"}18`:"#FFFFFF",
              color:activePhase===p?(phaseColor[p]||"#7c3aed"):"#6B6B6B",cursor:"pointer"}}>
            {p}
          </button>
        ))}
      </div>

      {/* Search — own full-width row */}
      <div style={{display:"flex",alignItems:"center",gap:8,background:"#FFFFFF",border:"1px solid #E0E0E2",borderRadius:10,padding:"9px 12px",marginBottom:16}}>
        <span style={{color:"#6B6B6B",fontSize:"0.85rem"}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search exercises or muscles…"
          style={{flex:1,minWidth:0,background:"transparent",border:"none",color:"#0D0D0D",fontFamily:"inherit",outline:"none",fontSize:"0.82rem"}}/>
      </div>

      {/* Exercise library */}
      <div style={{marginBottom:14}}>
        {templateFilter ? (
          templateFilter.ids.map(id=>{
            const ex = ALL_EXERCISES.find(e=>e.id===id);
            if(!ex) return null;
            const progEntry = programme.find(p=>p.id===id);
            const inProg = !!progEntry;
            return (
              <ExerciseDetailCard key={id} ex={progEntry||ex} inProg={inProg}
                onAdd={()=>addEx(ex)} onRemove={()=>removeEx(ex.id)} onUpdate={(field,val)=>updateEx(ex.id,field,val)} accentColor="#7c3aed"/>
            );
          })
        ) : (
          Object.entries(filteredCategories).map(([cat,exs])=>(
            <div key={cat} style={{marginBottom:14}}>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:region.color,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:4,height:14,background:region.color,borderRadius:2}}/>{cat}
              </div>
              {exs.map(ex=>{
                const progEntry = programme.find(p=>p.id===ex.id);
                const inProg = !!progEntry;
                return (
                  <ExerciseDetailCard key={ex.id} ex={progEntry||ex} inProg={inProg}
                    onAdd={()=>addEx(ex)} onRemove={()=>removeEx(ex.id)} onUpdate={(field,val)=>updateEx(ex.id,field,val)} accentColor={region.color}/>
                );
              })}
            </div>
          ))
        )}
      </div>



      <div style={{display:"flex",gap:10,alignItems:"flex-start",padding:"12px 14px",background:"rgba(255,179,0,0.08)",border:"1px solid rgba(255,179,0,0.25)",borderRadius:10,marginBottom:24}}>
        <span style={{fontSize:"0.95rem",flexShrink:0}}>⚠️</span>
        <span style={{fontSize:"0.78rem",color:"#854F0B",lineHeight:1.5}}>
          Exercise prescriptions are clinical suggestions. Modify sets, reps and frequency based on individual patient capacity, irritability and response. Evidence ratings reflect current literature.
        </span>
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
  { id:"scalp",           x:50,  y:7,   r:14, side:"front", label:"Scalp / Occiput",
    structures:["Occipitofrontalis","Temporalis","Suboccipital muscles","Occipital protuberance","Mastoid process"] },
  { id:"tmj_r",           x:59,  y:16,  r:7,  side:"front", label:"Right TMJ",
    structures:["Temporomandibular joint","Lateral pterygoid","Masseter insertion","Articular disc"] },
  { id:"tmj_l",           x:41,  y:16,  r:7,  side:"front", label:"Left TMJ",
    structures:["Temporomandibular joint","Lateral pterygoid","Masseter insertion","Articular disc"] },
  { id:"scm_r",           x:57,  y:21,  r:7,  side:"front", label:"Right SCM",
    structures:["Sternocleidomastoid — sternal head","SCM — clavicular head","Anterior cervical lymph nodes"] },
  { id:"scm_l",           x:43,  y:21,  r:7,  side:"front", label:"Left SCM",
    structures:["Sternocleidomastoid — sternal head","SCM — clavicular head","Anterior cervical lymph nodes"] },
  { id:"ant_cervical",    x:50,  y:20,  r:6,  side:"front", label:"Anterior Cervical Spine",
    structures:["C2–C7 anterior vertebral bodies","Longus colli / longus capitis","Thyroid cartilage (C4/5)","Hyoid bone (C3)","Carotid pulse"] },

  // ── NECK (back) ──────────────────────────────────────────────────────────────
  { id:"post_cervical",   x:50,  y:18,  r:10, side:"back", label:"Posterior Cervical Spine",
    structures:["C2–C7 spinous processes","Suboccipital triangle","Semispinalis capitis","Splenius capitis","Trapezius — upper fibres","Facet joints C2–C7"] },
  { id:"cerv_lat_r",      x:58,  y:19,  r:7,  side:"back", label:"Right Lateral Cervical",
    structures:["Levator scapulae origin","Scalenes — posterior","C3–C5 transverse processes","Upper trapezius lateral border"] },
  { id:"cerv_lat_l",      x:42,  y:19,  r:7,  side:"back", label:"Left Lateral Cervical",
    structures:["Levator scapulae origin","Scalenes — posterior","C3–C5 transverse processes","Upper trapezius lateral border"] },

  // ── SHOULDER (front) ─────────────────────────────────────────────────────────
  { id:"ac_joint_r",      x:76,  y:23,  r:6,  side:"front", label:"Right AC Joint",
    structures:["Acromioclavicular joint","AC ligament","Coracoclavicular ligaments (conoid & trapezoid)","Acromion tip"] },
  { id:"ac_joint_l",      x:24,  y:23,  r:6,  side:"front", label:"Left AC Joint",
    structures:["Acromioclavicular joint","AC ligament","Coracoclavicular ligaments","Acromion tip"] },
  { id:"ant_deltoid_r",   x:74,  y:29,  r:7,  side:"front", label:"Right Anterior Deltoid",
    structures:["Anterior deltoid — clavicular head","Coracoid process","Bicipital groove","Long head biceps tendon","Subscapularis insertion (lesser tuberosity)"] },
  { id:"ant_deltoid_l",   x:26,  y:29,  r:7,  side:"front", label:"Left Anterior Deltoid",
    structures:["Anterior deltoid — clavicular head","Coracoid process","Bicipital groove","Long head biceps tendon","Subscapularis insertion (lesser tuberosity)"] },
  { id:"lat_deltoid_r",   x:78,  y:31,  r:6,  side:"front", label:"Right Lateral Deltoid",
    structures:["Lateral deltoid — acromial head","Greater tuberosity (supraspinatus insertion)","Subacromial space","Subdeltoid bursa"] },
  { id:"lat_deltoid_l",   x:22,  y:31,  r:6,  side:"front", label:"Left Lateral Deltoid",
    structures:["Lateral deltoid — acromial head","Greater tuberosity (supraspinatus insertion)","Subacromial space","Subdeltoid bursa"] },
  { id:"sternum",         x:50,  y:33,  r:7,  side:"front", label:"Sternum / SC Joint",
    structures:["Sternoclavicular joint","Manubrium","Sternal body","Xiphoid process","Pectoralis major — sternal origin"] },
  { id:"pec_major_r",     x:63,  y:33,  r:8,  side:"front", label:"Right Pectoralis Major",
    structures:["Pectoralis major — clavicular head","Pectoralis major — sternal head","Pectoralis minor (deep — coracoid)","Anterior axillary fold"] },
  { id:"pec_major_l",     x:37,  y:33,  r:8,  side:"front", label:"Left Pectoralis Major",
    structures:["Pectoralis major — clavicular head","Pectoralis major — sternal head","Pectoralis minor (deep — coracoid)","Anterior axillary fold"] },

  // ── SHOULDER (back) ──────────────────────────────────────────────────────────
  { id:"post_deltoid_r",  x:75,  y:29,  r:7,  side:"back", label:"Right Posterior Deltoid",
    structures:["Posterior deltoid — spinal head","Infraspinatus insertion (greater tuberosity)","Teres minor insertion","Posterior glenohumeral joint line"] },
  { id:"post_deltoid_l",  x:25,  y:29,  r:7,  side:"back", label:"Left Posterior Deltoid",
    structures:["Posterior deltoid — spinal head","Infraspinatus insertion (greater tuberosity)","Teres minor insertion","Posterior glenohumeral joint line"] },
  { id:"supraspinatus_r", x:66,  y:26,  r:6,  side:"back", label:"Right Supraspinatus",
    structures:["Supraspinatus — supraspinous fossa","Supraspinatus tendon (critical zone — 1cm from insertion)","Suprascapular nerve (suprascapular notch)"] },
  { id:"supraspinatus_l", x:34,  y:26,  r:6,  side:"back", label:"Left Supraspinatus",
    structures:["Supraspinatus — supraspinous fossa","Supraspinatus tendon (critical zone — 1cm from insertion)","Suprascapular nerve (suprascapular notch)"] },
  { id:"infraspinatus_r", x:68,  y:33,  r:7,  side:"back", label:"Right Infraspinatus",
    structures:["Infraspinatus — infraspinous fossa","Infraspinatus tendon","Teres minor","Posterior axillary fold"] },
  { id:"infraspinatus_l", x:32,  y:33,  r:7,  side:"back", label:"Left Infraspinatus",
    structures:["Infraspinatus — infraspinous fossa","Infraspinatus tendon","Teres minor","Posterior axillary fold"] },
  { id:"trapezius_r",     x:61,  y:25,  r:8,  side:"back", label:"Right Upper Trapezius",
    structures:["Upper trapezius","Levator scapulae (C1–C4 TP insertions)","Rhomboid minor origin","Trigger point zone — upper trapezius"] },
  { id:"trapezius_l",     x:39,  y:25,  r:8,  side:"back", label:"Left Upper Trapezius",
    structures:["Upper trapezius","Levator scapulae (C1–C4 TP insertions)","Rhomboid minor origin","Trigger point zone — upper trapezius"] },
  { id:"scapula_r",       x:67,  y:34,  r:8,  side:"back", label:"Right Scapula / Rhomboids",
    structures:["Scapular spine","Medial scapular border","Rhomboid major / minor","Mid trapezius","Serratus anterior (lateral border)"] },
  { id:"scapula_l",       x:33,  y:34,  r:8,  side:"back", label:"Left Scapula / Rhomboids",
    structures:["Scapular spine","Medial scapular border","Rhomboid major / minor","Mid trapezius","Serratus anterior (lateral border)"] },

  // ── THORACIC SPINE (back) ────────────────────────────────────────────────────
  { id:"thoracic_spine",  x:50,  y:33,  r:8,  side:"back", label:"Thoracic Spine (T1–T12)",
    structures:["T1–T12 spinous processes","Thoracic facet joints","Erector spinae (iliocostalis / longissimus)","Multifidus","Costotransverse joints"] },
  { id:"mid_trap",        x:50,  y:29,  r:6,  side:"back", label:"Mid Trapezius / Interscapular",
    structures:["Middle trapezius","Lower trapezius","Rhomboid major","Interscapular trigger point zone","T2–T5 spinous processes"] },

  // ── ELBOW (front) ────────────────────────────────────────────────────────────
  { id:"lat_epicon_r",    x:83,  y:47,  r:6,  side:"front", label:"Right Lateral Epicondyle",
    structures:["Lateral epicondyle","ECRB origin (tennis elbow)","EDC origin","Radiohumeral joint","Lateral collateral ligament origin"] },
  { id:"lat_epicon_l",    x:17,  y:47,  r:6,  side:"front", label:"Left Lateral Epicondyle",
    structures:["Lateral epicondyle","ECRB origin (tennis elbow)","EDC origin","Radiohumeral joint","Lateral collateral ligament origin"] },
  { id:"med_epicon_r",    x:77,  y:47,  r:6,  side:"front", label:"Right Medial Epicondyle",
    structures:["Medial epicondyle","FCR / FCU origin (golfer's elbow)","Ulnar nerve (cubital tunnel)","UCL origin","Pronator teres origin"] },
  { id:"med_epicon_l",    x:23,  y:47,  r:6,  side:"front", label:"Left Medial Epicondyle",
    structures:["Medial epicondyle","FCR / FCU origin (golfer's elbow)","Ulnar nerve (cubital tunnel)","UCL origin","Pronator teres origin"] },
  { id:"ant_cubital_r",   x:80,  y:46,  r:5,  side:"front", label:"Right Antecubital Fossa",
    structures:["Biceps tendon","Brachialis","Brachial artery","Median nerve","Bicipital aponeurosis"] },
  { id:"ant_cubital_l",   x:20,  y:46,  r:5,  side:"front", label:"Left Antecubital Fossa",
    structures:["Biceps tendon","Brachialis","Brachial artery","Median nerve","Bicipital aponeurosis"] },

  // ── FOREARM (front) ──────────────────────────────────────────────────────────
  { id:"ant_forearm_r",   x:82,  y:51,  r:6,  side:"front", label:"Right Anterior Forearm",
    structures:["Flexor digitorum superficialis","Flexor carpi radialis","Palmaris longus","Pronator teres","Median nerve (midforearm)"] },
  { id:"ant_forearm_l",   x:18,  y:51,  r:6,  side:"front", label:"Left Anterior Forearm",
    structures:["Flexor digitorum superficialis","Flexor carpi radialis","Palmaris longus","Pronator teres","Median nerve (midforearm)"] },

  // ── WRIST & HAND ─────────────────────────────────────────────────────────────
  { id:"wrist_r",         x:83,  y:53,  r:6,  side:"front", label:"Right Wrist / Carpal Tunnel",
    structures:["Carpal tunnel (median nerve)","Flexor retinaculum","Radial styloid (De Quervain's)","Scaphoid tubercle","Pisiform (ulnar nerve / FCU)"] },
  { id:"wrist_l",         x:17,  y:53,  r:6,  side:"front", label:"Left Wrist / Carpal Tunnel",
    structures:["Carpal tunnel (median nerve)","Flexor retinaculum","Radial styloid (De Quervain's)","Scaphoid tubercle","Pisiform (ulnar nerve / FCU)"] },

  // ── ABDOMEN / LUMBAR (front) ─────────────────────────────────────────────────
  { id:"abdomen",         x:50,  y:44,  r:10, side:"front", label:"Abdomen",
    structures:["Rectus abdominis","External oblique","Linea alba","Umbilical region","Inguinal ligament","McBurney's point (appendix)"] },

  // ── LUMBAR SPINE (back) ──────────────────────────────────────────────────────
  { id:"lumbar_spine",    x:50,  y:46,  r:9,  side:"back", label:"Lumbar Spine (L1–L5)",
    structures:["L1–L5 spinous processes","Lumbar facet joints","Erector spinae (paraspinal)","Multifidus","Interspinous ligaments","L4/L5 — most common disc level"] },
  { id:"si_joint_r",      x:57,  y:52,  r:7,  side:"back", label:"Right Sacroiliac Joint",
    structures:["Sacroiliac joint (PSIS)","Posterior SI ligament","Iliolumbar ligament","Piriformis origin","PSIS landmark"] },
  { id:"si_joint_l",      x:43,  y:52,  r:7,  side:"back", label:"Left Sacroiliac Joint",
    structures:["Sacroiliac joint (PSIS)","Posterior SI ligament","Iliolumbar ligament","Piriformis origin","PSIS landmark"] },
  { id:"ql_r",            x:61,  y:47,  r:6,  side:"back", label:"Right Quadratus Lumborum",
    structures:["Quadratus lumborum","QL trigger point zone","12th rib attachment","Iliac crest insertion","L1–L4 transverse processes"] },
  { id:"ql_l",            x:39,  y:47,  r:6,  side:"back", label:"Left Quadratus Lumborum",
    structures:["Quadratus lumborum","QL trigger point zone","12th rib attachment","Iliac crest insertion","L1–L4 transverse processes"] },

  // ── HIP (front) ──────────────────────────────────────────────────────────────
  { id:"asis_r",          x:64,  y:54,  r:7,  side:"front", label:"Right ASIS / Hip Flexors",
    structures:["Anterior superior iliac spine (ASIS)","Sartorius origin","TFL origin","Inguinal ligament lateral end","Femoral nerve (medial to ASIS)"] },
  { id:"asis_l",          x:36,  y:54,  r:7,  side:"front", label:"Left ASIS / Hip Flexors",
    structures:["Anterior superior iliac spine (ASIS)","Sartorius origin","TFL origin","Inguinal ligament lateral end","Femoral nerve (medial to ASIS)"] },
  { id:"groin_r",         x:59,  y:57,  r:7,  side:"front", label:"Right Groin / Adductor Origin",
    structures:["Adductor longus origin (pubic tubercle)","Adductor brevis","Gracilis origin","Iliopsoas tendon (lesser trochanter)","Femoral triangle"] },
  { id:"groin_l",         x:41,  y:57,  r:7,  side:"front", label:"Left Groin / Adductor Origin",
    structures:["Adductor longus origin (pubic tubercle)","Adductor brevis","Gracilis origin","Iliopsoas tendon (lesser trochanter)","Femoral triangle"] },

  // ── HIP (back) ───────────────────────────────────────────────────────────────
  { id:"gmax_r",          x:63,  y:56,  r:9,  side:"back", label:"Right Gluteus Maximus",
    structures:["Gluteus maximus — posterior ilium","Sacrotuberous ligament","Gluteal fold","Greater trochanter (posterolateral)","Ischial tuberosity (proximal hamstrings)"] },
  { id:"gmax_l",          x:37,  y:56,  r:9,  side:"back", label:"Left Gluteus Maximus",
    structures:["Gluteus maximus — posterior ilium","Sacrotuberous ligament","Gluteal fold","Greater trochanter (posterolateral)","Ischial tuberosity (proximal hamstrings)"] },
  { id:"gt_r",            x:68,  y:57,  r:6,  side:"back", label:"Right Greater Trochanter",
    structures:["Greater trochanter","Gluteus medius insertion","Gluteus minimus insertion","Trochanteric bursa","TFL / IT band proximal"] },
  { id:"gt_l",            x:32,  y:57,  r:6,  side:"back", label:"Left Greater Trochanter",
    structures:["Greater trochanter","Gluteus medius insertion","Gluteus minimus insertion","Trochanteric bursa","TFL / IT band proximal"] },
  { id:"piriformis_r",    x:61,  y:58,  r:6,  side:"back", label:"Right Piriformis / Deep Gluteal",
    structures:["Piriformis (mid-point PSIS → GT)","Sciatic nerve (deep gluteal)","Obturator internus","Quadratus femoris","Deep gluteal syndrome zone"] },
  { id:"piriformis_l",    x:39,  y:58,  r:6,  side:"back", label:"Left Piriformis / Deep Gluteal",
    structures:["Piriformis (mid-point PSIS → GT)","Sciatic nerve (deep gluteal)","Obturator internus","Quadratus femoris","Deep gluteal syndrome zone"] },

  // ── THIGH (front) ────────────────────────────────────────────────────────────
  { id:"quad_r",          x:63,  y:67,  r:8,  side:"front", label:"Right Quadriceps",
    structures:["Rectus femoris — central belly","Vastus lateralis","Vastus medialis oblique (VMO)","Quadriceps tendon (suprapatellar)","TFL / IT band (lateral thigh)"] },
  { id:"quad_l",          x:37,  y:67,  r:8,  side:"front", label:"Left Quadriceps",
    structures:["Rectus femoris — central belly","Vastus lateralis","Vastus medialis oblique (VMO)","Quadriceps tendon (suprapatellar)","TFL / IT band (lateral thigh)"] },

  // ── THIGH (back) ─────────────────────────────────────────────────────────────
  { id:"hamstring_r",     x:64,  y:67,  r:9,  side:"back", label:"Right Hamstrings",
    structures:["Biceps femoris — long head","Semitendinosus","Semimembranosus","Proximal hamstring origin (ischial tuberosity)","Sciatic nerve (posterior thigh)"] },
  { id:"hamstring_l",     x:36,  y:67,  r:9,  side:"back", label:"Left Hamstrings",
    structures:["Biceps femoris — long head","Semitendinosus","Semimembranosus","Proximal hamstring origin (ischial tuberosity)","Sciatic nerve (posterior thigh)"] },
  { id:"itband_r",        x:70,  y:71,  r:6,  side:"back", label:"Right IT Band / Lateral Thigh",
    structures:["Iliotibial band","TFL belly","Vastus lateralis (lateral)","IT band — mid thigh friction zone"] },
  { id:"itband_l",        x:30,  y:71,  r:6,  side:"back", label:"Left IT Band / Lateral Thigh",
    structures:["Iliotibial band","TFL belly","Vastus lateralis (lateral)","IT band — mid thigh friction zone"] },

  // ── KNEE (front) ─────────────────────────────────────────────────────────────
  { id:"patella_r",       x:63,  y:76,  r:6,  side:"front", label:"Right Patella / Extensor Mechanism",
    structures:["Patella (superior / inferior pole)","Patellar tendon","Tibial tuberosity (Osgood-Schlatter)","Infrapatellar fat pad","Medial patellar facet","Lateral patellar facet"] },
  { id:"patella_l",       x:37,  y:76,  r:6,  side:"front", label:"Left Patella / Extensor Mechanism",
    structures:["Patella (superior / inferior pole)","Patellar tendon","Tibial tuberosity (Osgood-Schlatter)","Infrapatellar fat pad","Medial patellar facet","Lateral patellar facet"] },
  { id:"med_knee_r",      x:58,  y:76,  r:5,  side:"front", label:"Right Medial Knee",
    structures:["MCL — femoral attachment","MCL — tibial attachment","Medial meniscus (joint line)","Pes anserinus (ST/gracilis/sartorius)","Medial compartment"] },
  { id:"med_knee_l",      x:42,  y:76,  r:5,  side:"front", label:"Left Medial Knee",
    structures:["MCL — femoral attachment","MCL — tibial attachment","Medial meniscus (joint line)","Pes anserinus (ST/gracilis/sartorius)","Medial compartment"] },
  { id:"lat_knee_r",      x:69,  y:76,  r:5,  side:"front", label:"Right Lateral Knee",
    structures:["LCL (lateral collateral ligament)","Lateral meniscus (joint line)","IT band — Gerdy's tubercle","Biceps femoris insertion (fibula head)","Popliteus tendon"] },
  { id:"lat_knee_l",      x:31,  y:76,  r:5,  side:"front", label:"Left Lateral Knee",
    structures:["LCL (lateral collateral ligament)","Lateral meniscus (joint line)","IT band — Gerdy's tubercle","Biceps femoris insertion (fibula head)","Popliteus tendon"] },

  // ── KNEE (back) ──────────────────────────────────────────────────────────────
  { id:"popliteal_r",     x:64,  y:76,  r:7,  side:"back", label:"Right Popliteal Fossa",
    structures:["Popliteal fossa","Popliteal artery (pulse)","Common peroneal nerve","Posterior capsule","Baker's cyst zone","Popliteus muscle"] },
  { id:"popliteal_l",     x:36,  y:76,  r:7,  side:"back", label:"Left Popliteal Fossa",
    structures:["Popliteal fossa","Popliteal artery (pulse)","Common peroneal nerve","Posterior capsule","Baker's cyst zone","Popliteus muscle"] },

  // ── LOWER LEG (front) ────────────────────────────────────────────────────────
  { id:"ant_shin_r",      x:62,  y:84,  r:6,  side:"front", label:"Right Anterior Shin / Tibialis Anterior",
    structures:["Tibialis anterior — belly","Tibial crest (shin splints / MTSS)","Extensor digitorum longus","Anterior compartment","Deep peroneal nerve"] },
  { id:"ant_shin_l",      x:38,  y:84,  r:6,  side:"front", label:"Left Anterior Shin / Tibialis Anterior",
    structures:["Tibialis anterior — belly","Tibial crest (shin splints / MTSS)","Extensor digitorum longus","Anterior compartment","Deep peroneal nerve"] },

  // ── LOWER LEG (back) ─────────────────────────────────────────────────────────
  { id:"gastroc_r",       x:64,  y:83,  r:7,  side:"back", label:"Right Gastrocnemius / Soleus",
    structures:["Gastrocnemius — medial head","Gastrocnemius — lateral head","Soleus","Achilles tendon (proximal)","Sural nerve","Musculotendinous junction"] },
  { id:"gastroc_l",       x:36,  y:83,  r:7,  side:"back", label:"Left Gastrocnemius / Soleus",
    structures:["Gastrocnemius — medial head","Gastrocnemius — lateral head","Soleus","Achilles tendon (proximal)","Sural nerve","Musculotendinous junction"] },

  // ── ANKLE & FOOT ─────────────────────────────────────────────────────────────
  { id:"achilles_r",      x:64,  y:89, r:5,  side:"back", label:"Right Achilles Tendon",
    structures:["Achilles tendon — mid-portion (2–6cm from insertion)","Achilles insertion (calcaneum)","Retrocalcaneal bursa","Haglund's deformity zone","Kager's fat pad"] },
  { id:"achilles_l",      x:36,  y:89, r:5,  side:"back", label:"Left Achilles Tendon",
    structures:["Achilles tendon — mid-portion (2–6cm from insertion)","Achilles insertion (calcaneum)","Retrocalcaneal bursa","Haglund's deformity zone","Kager's fat pad"] },
  { id:"lat_ankle_r",     x:68,  y:89, r:6,  side:"front", label:"Right Lateral Ankle",
    structures:["ATFL (anterior talofibular ligament)","CFL (calcaneofibular ligament)","Lateral malleolus","Peroneus longus / brevis tendons","Sinus tarsi"] },
  { id:"lat_ankle_l",     x:32,  y:89, r:6,  side:"front", label:"Left Lateral Ankle",
    structures:["ATFL (anterior talofibular ligament)","CFL (calcaneofibular ligament)","Lateral malleolus","Peroneus longus / brevis tendons","Sinus tarsi"] },
  { id:"med_ankle_r",     x:59,  y:89, r:6,  side:"front", label:"Right Medial Ankle",
    structures:["Deltoid ligament","Medial malleolus","Tibialis posterior tendon","Flexor digitorum longus","Tarsal tunnel (posterior tibial nerve)"] },
  { id:"med_ankle_l",     x:41,  y:89, r:6,  side:"front", label:"Left Medial Ankle",
    structures:["Deltoid ligament","Medial malleolus","Tibialis posterior tendon","Flexor digitorum longus","Tarsal tunnel (posterior tibial nerve)"] },
  { id:"plantar_r",       x:63,  y:91, r:6,  side:"front", label:"Right Plantar Fascia / Heel",
    structures:["Plantar fascia — calcaneal origin","Calcaneal fat pad","Medial calcaneal tubercle","Plantar fascia — mid-band","1st MTP joint (hallux rigidus)"] },
  { id:"plantar_l",       x:37,  y:91, r:6,  side:"front", label:"Left Plantar Fascia / Heel",
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
// Real anatomical outline (front/back + head/hair), vendored from the MIT-
// licensed npm package "react-muscle-highlighter" (github.com/soroojshehryar/
// react-muscle-highlighter). Only the raw silhouette path data is used here —
// not the package's own muscle-highlight/click system — so there's no runtime
// dependency, just inline SVG path strings drawn with our own 65-point
// clinical hotspot system on top (unrelated to that library's own regions).
// Native path units are 0–724 (x) by 0–1448 (y) per side; scaled by 100/724
// into a local 100-wide box so hotspot x/y can stay clean 0–100 percentages.
const BODY_OUTLINE_FRONT = "M 309.48 168.91 Q 305.84 164.32 303.32 169.76 C 298.49 180.21 308.31 200.03 314.51 208.74 C 316.34 211.31 318.01 208.95 318.58 207.26 A 0.67 0.66 57.6 0 1 319.87 207.55 C 319.06 215.09 318.68 227.40 324.34 232.47 C 327.22 235.05 326.97 235.88 326.92 239.51 Q 326.68 255.16 323.97 266.82 Q 323.85 267.35 323.48 267.73 Q 308.61 282.73 290.26 293.23 C 278.34 300.05 267.53 299.26 253.00 298.03 Q 237.49 296.72 224.74 305.21 C 208.71 315.86 190.95 335.73 189.24 355.50 Q 186.95 381.81 190.53 412.66 C 190.79 414.92 190.69 417.49 191.02 419.92 Q 191.09 420.43 190.88 420.90 C 187.89 427.65 183.99 434.89 181.93 441.29 C 177.25 455.76 176.31 470.23 176.20 486.02 Q 176.20 486.51 175.90 486.90 C 159.84 507.69 147.56 529.29 141.49 554.95 Q 140.10 560.80 138.16 574.66 Q 131.28 623.74 118.11 671.52 C 115.99 679.21 112.98 690.29 104.08 693.63 Q 90.70 698.65 79.29 707.27 C 73.17 711.89 69.48 719.95 66.12 726.62 C 62.44 733.91 47.57 737.30 49.20 746.00 C 49.75 748.96 51.89 750.13 54.75 750.02 Q 67.27 749.50 74.18 740.00 C 76.03 737.45 77.93 736.62 80.54 735.24 Q 81.02 734.98 81.24 735.48 Q 84.59 743.00 80.47 750.73 Q 71.41 767.75 62.21 784.70 Q 60.53 787.81 59.49 791.20 C 57.52 797.69 65.78 800.84 69.45 795.20 C 76.80 783.92 82.72 773.30 92.55 762.52 Q 93.00 762.04 92.84 762.67 Q 87.89 783.24 79.07 802.44 C 77.36 806.17 75.64 812.30 79.19 815.18 C 89.50 823.53 107.08 773.44 109.24 767.88 A 0.37 0.36 -30.3 0 1 109.94 768.06 C 108.51 777.44 106.43 787.14 105.28 796.13 C 104.34 803.43 103.67 808.49 104.41 814.32 C 105.40 822.00 112.74 817.15 114.09 812.77 C 118.56 798.32 120.41 781.74 125.18 766.21 A 0.55 0.55 0.0 0 1 125.93 765.87 C 131.64 768.40 126.65 796.54 133.38 803.49 A 1.35 1.35 0.0 0 0 134.16 803.90 C 138.40 804.59 139.71 797.34 140.15 793.73 Q 141.74 780.80 142.58 767.76 Q 142.86 763.46 144.07 759.34 Q 150.39 737.64 154.77 715.46 Q 156.15 708.50 155.48 697.76 Q 154.48 681.63 161.99 665.46 Q 180.58 625.46 201.25 586.52 C 213.64 563.18 218.66 541.14 220.65 514.18 C 221.24 506.18 223.22 502.59 228.42 495.84 C 237.76 483.72 242.73 464.92 246.12 450.19 Q 246.24 449.64 246.75 449.42 L 250.30 447.82 A 0.49 0.49 0.0 0 1 250.99 448.23 Q 252.78 470.14 257.44 487.01 C 259.04 492.80 264.20 498.21 265.32 505.20 C 265.91 508.82 266.99 512.44 267.11 516.00 Q 267.57 529.33 266.95 540.50 C 265.58 565.32 263.85 592.20 259.98 619.13 C 258.39 630.19 253.14 640.55 250.52 651.43 Q 245.19 673.62 242.32 696.24 C 239.63 717.56 236.59 740.02 236.04 757.75 Q 234.98 791.48 237.98 842.55 Q 239.43 867.18 244.64 891.26 Q 247.76 905.70 255.88 917.90 Q 256.15 918.31 256.08 918.79 C 254.89 926.25 257.03 933.47 255.60 940.95 Q 252.28 958.32 251.77 975.98 C 251.55 983.43 252.85 991.28 253.67 998.93 Q 253.99 1001.95 253.29 1005.00 C 239.19 1067.03 246.93 1130.64 261.77 1190.07 C 266.01 1207.06 266.47 1222.37 264.71 1240.03 C 263.85 1248.62 262.10 1260.41 264.24 1268.75 C 266.05 1275.80 267.54 1287.46 261.78 1293.28 C 256.71 1298.39 242.40 1310.55 240.72 1316.98 C 239.19 1322.86 235.04 1332.26 242.29 1333.71 Q 242.69 1333.79 243.08 1333.66 L 244.23 1333.29 Q 245.05 1333.02 244.81 1333.85 C 242.95 1340.16 249.20 1340.52 253.77 1340.86 C 256.46 1341.06 257.37 1343.60 259.30 1344.71 Q 263.13 1346.91 267.14 1344.43 Q 267.59 1344.15 267.92 1344.56 Q 271.17 1348.61 276.21 1349.09 C 278.90 1349.35 281.27 1347.36 283.62 1346.09 Q 284.10 1345.82 284.44 1346.26 Q 288.33 1351.29 294.72 1351.38 C 295.77 1351.39 297.65 1351.62 298.54 1350.79 Q 301.20 1348.30 306.57 1341.58 C 312.04 1334.74 311.14 1328.85 310.29 1320.16 C 309.43 1311.33 311.17 1303.41 313.76 1295.20 C 315.84 1288.56 313.35 1280.06 314.07 1273.15 C 314.57 1268.39 315.80 1263.68 315.01 1259.02 C 314.06 1253.42 311.98 1247.60 311.31 1242.66 Q 309.57 1229.80 309.57 1219.75 Q 309.57 1192.29 313.54 1161.94 C 315.34 1148.21 319.24 1136.08 324.12 1123.46 Q 325.66 1119.48 326.10 1115.72 C 330.14 1081.34 326.20 1048.44 320.65 1013.26 C 319.84 1008.17 319.39 1002.54 321.72 997.72 C 328.03 984.68 329.28 969.38 329.07 954.15 C 329.01 949.50 327.95 944.55 327.58 939.63 C 327.13 933.64 329.28 925.78 330.82 919.80 C 334.72 904.69 337.76 888.96 341.43 874.30 Q 348.95 844.25 355.42 813.95 C 358.50 799.49 357.70 784.78 357.75 768.06 Q 357.78 756.80 356.36 748.81 Q 356.26 748.24 356.77 748.50 L 363.71 751.99 A 1.07 1.07 0.0 0 0 364.67 751.99 L 371.53 748.56 Q 372.07 748.29 371.98 748.89 C 369.47 765.94 370.28 783.04 371.30 800.17 Q 371.86 809.54 372.73 813.51 C 378.37 839.12 384.90 864.49 390.59 890.08 Q 394.83 909.20 399.51 928.22 C 400.58 932.58 401.13 937.66 400.58 941.57 C 398.11 958.92 398.53 982.22 407.11 998.54 C 408.41 1001.01 408.74 1005.35 408.31 1008.09 C 402.82 1043.75 398.07 1079.22 402.19 1115.33 Q 402.65 1119.34 404.21 1123.44 C 410.53 1140.06 413.55 1150.61 415.25 1164.75 C 418.31 1190.26 420.52 1218.43 416.79 1244.33 C 415.56 1252.86 411.78 1258.57 413.63 1267.80 Q 415.33 1276.21 414.16 1284.74 C 413.11 1292.39 415.65 1298.68 417.31 1305.89 C 419.02 1313.32 418.11 1320.99 417.47 1328.50 C 416.71 1337.55 423.74 1344.86 430.17 1350.90 A 1.48 1.46 -18.7 0 0 430.95 1351.28 Q 439.25 1352.41 444.03 1346.06 Q 444.40 1345.57 444.87 1345.96 Q 453.39 1352.89 460.49 1344.48 Q 460.81 1344.11 461.23 1344.37 C 469.09 1349.37 469.89 1340.80 474.98 1340.71 C 479.52 1340.64 485.21 1340.09 483.54 1333.77 Q 483.38 1333.17 483.97 1333.35 C 488.25 1334.67 490.66 1331.94 490.06 1327.75 C 489.09 1321.04 487.50 1314.41 483.44 1310.30 Q 474.77 1301.53 466.05 1292.83 C 461.19 1287.98 462.25 1276.40 463.74 1270.47 C 466.27 1260.35 464.49 1248.06 463.03 1236.25 C 461.04 1220.05 463.22 1204.28 467.41 1187.04 C 481.60 1128.60 488.89 1065.20 475.23 1006.07 C 473.92 1000.37 475.00 995.00 475.76 989.36 C 477.88 973.68 475.72 958.50 473.08 942.76 C 471.70 934.55 473.60 926.56 472.20 918.79 Q 472.11 918.30 472.39 917.89 C 483.07 902.63 486.53 880.99 488.49 863.25 C 492.12 830.38 492.47 797.34 492.26 764.31 C 492.11 741.56 488.80 719.07 486.12 696.53 C 484.30 681.19 480.76 664.32 477.47 649.99 C 474.89 638.73 469.69 628.87 468.04 617.25 C 465.37 598.45 464.19 580.92 462.40 556.31 Q 460.86 535.06 461.01 522.74 Q 461.13 512.05 463.22 504.00 C 464.54 498.90 468.30 493.91 469.91 489.46 C 474.50 476.74 476.10 461.71 477.56 448.28 Q 477.62 447.74 478.13 447.94 L 481.73 449.35 A 0.77 0.77 0.0 0 1 482.19 449.89 Q 486.03 466.84 492.52 482.96 C 494.16 487.04 496.63 491.75 500.12 495.79 C 505.75 502.32 507.17 507.95 508.00 517.24 C 509.72 536.47 512.15 552.06 518.89 569.24 Q 521.60 576.16 527.50 587.28 Q 543.57 617.60 558.56 648.47 C 566.04 663.89 571.90 675.54 572.85 690.59 Q 572.98 692.57 572.55 700.88 Q 572.12 709.31 573.99 718.25 Q 577.87 736.78 582.37 752.38 C 585.15 761.98 586.32 769.32 586.71 778.53 C 586.92 783.46 587.58 803.53 593.41 804.06 C 599.41 804.61 599.71 774.61 600.39 768.08 A 1.12 1.12 0.0 0 1 600.80 767.33 Q 601.30 766.93 601.62 766.30 A 1.39 1.00 59.0 0 1 603.70 767.19 C 607.27 782.50 609.43 797.55 614.25 812.25 C 615.52 816.12 618.33 820.08 622.81 817.38 A 1.18 1.17 -8.4 0 0 623.35 816.66 Q 624.98 810.32 624.13 803.72 Q 621.83 785.89 618.23 768.64 A 0.53 0.53 0.0 0 1 619.24 768.34 C 622.72 777.06 636.06 814.20 645.24 816.03 C 650.64 817.10 652.13 811.12 650.95 807.31 C 648.59 799.74 644.42 791.59 642.09 784.69 Q 638.29 773.46 635.22 761.98 A 0.15 0.14 -73.3 0 1 635.47 761.84 Q 640.35 767.61 644.90 773.66 C 649.45 779.70 653.60 787.18 658.03 793.93 Q 660.09 797.07 661.70 797.82 C 665.53 799.62 670.61 795.77 669.00 791.28 C 666.63 784.66 661.63 776.66 659.33 772.19 Q 654.22 762.29 648.82 752.53 C 645.43 746.40 644.71 741.93 646.89 735.59 Q 647.08 735.05 647.60 735.27 C 650.55 736.50 652.37 737.45 654.44 740.27 Q 661.27 749.61 673.53 749.92 C 681.25 750.12 680.47 740.89 676.20 738.28 C 671.33 735.31 664.61 731.14 661.97 725.94 C 657.98 718.11 654.62 711.26 649.21 707.28 Q 637.40 698.62 623.76 693.40 C 619.45 691.75 615.12 686.26 613.76 682.47 Q 608.42 667.65 602.70 641.81 Q 594.90 606.62 590.85 578.90 Q 588.46 562.58 587.74 559.15 C 582.02 531.75 569.74 509.81 552.98 487.61 C 551.81 486.06 551.91 485.12 551.97 483.26 Q 552.48 466.57 548.70 449.61 C 546.27 438.71 541.82 430.32 537.44 420.82 Q 537.22 420.36 537.28 419.85 C 539.40 398.94 540.83 377.68 539.05 356.70 C 537.31 336.13 521.34 317.28 504.86 306.23 C 494.75 299.45 485.77 296.97 473.93 298.16 Q 464.41 299.12 453.63 298.41 C 438.05 297.39 418.32 280.58 407.40 270.35 C 405.82 268.87 404.57 267.56 404.10 265.32 Q 401.24 251.68 401.26 237.76 Q 401.26 233.73 404.68 232.04 Q 405.14 231.82 405.39 231.38 C 409.76 223.86 408.77 215.16 408.75 206.85 A 0.38 0.38 0.0 0 1 409.48 206.69 C 410.36 208.62 412.01 211.62 414.22 208.45 C 421.05 198.67 427.45 183.93 425.97 172.00 C 425.49 168.15 422.83 165.91 418.91 167.68";
const BODY_OUTLINE_BACK = "M 1028.14 166.45 Q 1021.22 166.96 1021.73 176.02 C 1022.38 187.38 1027.41 200.00 1034.70 209.56 A 0.95 0.95 0.0 0 0 1035.77 209.88 Q 1037.97 209.08 1038.42 206.75 Q 1038.48 206.41 1038.79 206.56 C 1039.50 206.91 1039.29 219.51 1039.32 221.19 C 1039.41 225.63 1041.33 230.61 1045.48 233.58 A 1.48 1.46 -79.2 0 1 1046.03 234.40 C 1047.33 239.56 1046.14 264.59 1042.52 268.26 Q 1027.38 283.59 1008.53 293.99 C 997.30 300.18 985.80 298.88 972.00 298.05 C 960.16 297.34 951.79 300.13 941.86 307.09 C 927.96 316.83 911.37 335.39 909.24 353.00 C 906.85 372.86 908.46 396.71 910.58 417.97 Q 910.78 420.04 909.97 421.91 C 907.17 428.36 903.51 435.29 901.56 441.28 Q 895.91 458.72 896.11 477.26 Q 896.15 480.50 895.88 486.15 Q 895.86 486.66 895.55 487.06 C 879.06 508.02 866.67 530.27 860.84 556.43 Q 859.72 561.44 857.62 576.15 C 853.15 607.45 846.97 639.64 837.96 670.48 C 835.37 679.35 832.82 690.15 824.31 693.38 Q 811.21 698.35 799.91 706.70 C 793.05 711.77 790.22 717.94 785.68 726.75 C 782.37 733.16 764.38 739.29 769.45 747.77 C 771.01 750.37 774.09 750.14 776.79 749.81 Q 787.25 748.51 793.13 740.83 C 795.42 737.84 797.13 736.50 800.36 735.31 A 0.63 0.63 0.0 0 1 801.16 735.68 C 803.48 741.92 802.81 745.80 799.51 751.90 Q 789.51 770.39 779.78 789.01 C 775.87 796.49 784.57 802.15 789.55 794.51 C 796.72 783.50 802.47 773.20 812.06 762.59 Q 812.62 761.98 812.43 762.79 Q 807.49 783.70 798.01 804.03 Q 795.79 808.79 797.53 813.47 C 798.35 815.65 800.88 816.85 802.95 815.95 C 807.95 813.78 812.74 805.60 815.08 800.58 Q 820.51 788.92 825.23 776.95 Q 827.37 771.52 829.06 768.26 A 0.34 0.34 0.0 0 1 829.69 768.47 C 828.65 774.94 819.92 813.84 825.80 817.66 C 829.47 820.04 832.91 815.52 833.80 812.51 Q 838.73 795.91 842.08 776.75 C 842.69 773.31 843.62 770.03 844.54 766.92 A 1.49 1.49 0.0 0 1 847.45 767.13 C 849.06 778.16 848.17 788.91 850.91 799.85 C 851.57 802.48 854.41 806.12 856.99 802.69 C 861.32 796.92 861.47 780.19 861.98 770.25 C 862.50 760.22 866.62 750.03 868.70 741.28 C 871.57 729.16 876.10 714.64 875.42 700.50 C 874.79 687.46 876.48 676.40 882.00 664.53 Q 899.81 626.31 920.51 587.27 C 928.60 572.01 933.68 558.17 937.01 542.00 Q 938.40 535.24 940.57 511.31 C 941.06 506.01 943.33 501.94 947.04 497.29 C 957.02 484.77 962.25 465.95 965.86 450.00 Q 965.97 449.54 966.40 449.37 L 969.87 447.93 Q 970.39 447.72 970.44 448.27 C 972.08 465.19 974.18 483.97 982.58 498.42 Q 985.25 503.01 985.69 509.45 C 985.76 510.51 986.43 511.70 986.49 512.50 C 986.89 517.68 987.09 525.23 986.82 531.50 Q 985.00 573.11 980.47 614.52 C 978.98 628.13 972.65 640.33 969.66 653.60 C 966.01 669.78 963.02 685.46 961.19 702.45 C 959.24 720.52 956.19 739.39 955.83 756.75 C 954.96 797.57 955.28 842.51 962.96 884.21 C 965.15 896.11 968.33 907.72 975.37 917.40 A 1.48 1.46 27.9 0 1 975.65 918.29 C 975.42 926.20 976.32 934.21 975.03 942.01 C 971.89 960.94 969.95 978.86 973.41 997.96 C 973.70 999.53 973.58 1001.87 973.23 1003.42 C 959.26 1065.20 965.77 1130.76 981.86 1191.82 C 985.51 1205.68 986.32 1220.46 984.96 1234.92 C 984.02 1244.98 982.27 1255.20 983.30 1265.30 C 984.08 1272.87 988.23 1284.18 983.14 1291.21 C 978.75 1297.25 969.45 1303.98 963.07 1312.35 C 960.11 1316.25 952.52 1335.31 964.02 1333.54 Q 964.55 1333.46 964.42 1333.98 C 962.73 1340.59 969.52 1340.54 974.36 1340.95 Q 974.88 1341.00 975.24 1341.37 C 978.64 1344.83 981.89 1347.54 986.66 1344.41 Q 987.11 1344.12 987.46 1344.52 C 992.32 1350.09 997.09 1350.27 1003.06 1346.11 Q 1003.50 1345.80 1003.93 1346.12 C 1005.34 1347.18 1006.20 1348.82 1007.59 1349.58 Q 1011.98 1351.98 1017.08 1351.27 A 1.56 1.56 0.0 0 0 1017.93 1350.86 Q 1024.28 1344.70 1027.72 1339.46 C 1032.14 1332.71 1030.13 1325.67 1029.71 1317.92 C 1029.27 1309.96 1031.28 1302.44 1033.52 1294.97 C 1034.58 1291.42 1034.05 1286.50 1033.60 1282.59 Q 1032.89 1276.40 1034.01 1270.28 C 1034.95 1265.11 1035.75 1261.39 1034.60 1257.67 Q 1029.90 1242.46 1029.51 1227.25 Q 1028.64 1193.94 1033.40 1159.73 C 1035.13 1147.30 1038.92 1136.76 1043.43 1124.47 Q 1045.16 1119.75 1045.73 1115.31 C 1050.32 1079.07 1044.60 1044.51 1039.86 1008.73 C 1038.66 999.61 1043.98 993.60 1045.54 987.51 C 1048.41 976.36 1049.80 959.10 1047.93 945.66 C 1046.88 938.09 1047.48 931.84 1049.21 924.99 C 1053.15 909.35 1056.75 892.75 1059.78 880.01 Q 1066.27 852.63 1072.60 825.22 Q 1075.98 810.55 1076.49 805.75 Q 1077.50 796.31 1077.72 775.82 Q 1077.85 764.16 1076.54 752.58 Q 1076.32 750.58 1075.99 749.61 Q 1075.45 748.03 1076.95 748.78 L 1083.35 752.00 A 1.10 1.08 44.4 0 0 1084.32 752.00 L 1091.50 748.31 A 0.24 0.24 0.0 0 1 1091.84 748.59 Q 1090.49 753.63 1090.36 758.75 C 1089.82 779.99 1089.54 802.24 1094.28 822.45 Q 1101.55 853.47 1108.92 884.46 C 1111.25 894.25 1114.60 910.13 1117.95 922.87 C 1119.13 927.36 1119.75 931.95 1120.50 936.49 C 1121.14 940.42 1119.45 945.92 1119.24 949.53 Q 1118.26 966.73 1121.38 983.68 C 1121.98 986.96 1123.21 991.52 1124.54 993.96 C 1128.10 1000.50 1128.52 1004.24 1127.36 1012.10 C 1122.34 1046.29 1118.51 1078.84 1121.48 1113.50 C 1121.72 1116.32 1122.66 1120.49 1123.91 1123.73 C 1131.43 1143.10 1134.58 1156.98 1136.42 1177.99 C 1138.35 1200.12 1139.52 1222.20 1136.35 1244.60 Q 1135.88 1247.88 1134.29 1252.69 C 1132.00 1259.62 1132.37 1264.14 1133.83 1271.98 C 1135.50 1280.93 1132.17 1288.45 1134.90 1297.66 C 1136.88 1304.36 1138.19 1310.69 1137.87 1317.88 C 1137.58 1324.48 1135.49 1332.56 1139.15 1338.36 Q 1142.72 1344.04 1149.63 1350.84 Q 1149.97 1351.18 1150.46 1351.25 Q 1158.71 1352.49 1163.67 1346.15 A 0.64 0.64 0.0 0 1 1164.58 1346.04 Q 1173.02 1352.85 1180.03 1344.60 Q 1180.37 1344.20 1180.83 1344.46 Q 1186.12 1347.40 1190.08 1343.66 Q 1192.28 1341.58 1193.29 1341.22 C 1197.87 1339.60 1204.81 1341.71 1203.29 1333.67 A 0.39 0.39 0.0 0 1 1203.82 1333.23 L 1204.86 1333.62 Q 1205.25 1333.77 1205.65 1333.71 C 1212.46 1332.65 1209.17 1324.33 1208.00 1319.87 C 1205.32 1309.62 1192.63 1299.79 1185.30 1292.30 C 1180.77 1287.68 1182.22 1274.71 1183.62 1269.06 C 1186.76 1256.35 1182.79 1239.97 1182.29 1230.50 C 1181.63 1217.80 1182.70 1204.60 1185.99 1191.35 C 1200.90 1131.35 1208.58 1067.26 1194.98 1006.22 C 1193.56 999.84 1194.88 994.32 1195.73 987.24 C 1197.46 972.87 1195.00 955.62 1192.39 940.62 C 1191.27 934.14 1192.32 927.30 1192.25 920.69 Q 1192.25 920.23 1192.09 919.80 L 1191.79 918.97 Q 1191.59 918.45 1191.92 918.00 C 1199.57 907.39 1203.42 893.36 1205.50 881.25 C 1212.13 842.49 1212.38 800.86 1211.97 761.04 C 1211.76 739.76 1208.12 718.12 1205.90 696.81 Q 1204.13 679.89 1197.85 652.94 C 1194.73 639.58 1188.50 627.37 1187.05 613.69 Q 1183.04 575.93 1181.17 542.06 Q 1180.56 530.97 1180.85 518.01 C 1180.96 512.91 1182.20 504.08 1184.51 499.52 C 1186.81 494.98 1189.81 490.71 1191.01 485.74 Q 1195.45 467.32 1197.09 448.35 A 0.55 0.55 0.0 0 1 1197.86 447.90 L 1201.25 449.41 Q 1201.74 449.63 1201.86 450.16 C 1205.49 466.08 1210.60 484.96 1221.09 497.82 C 1229.48 508.13 1227.82 523.50 1229.73 535.92 C 1232.46 553.65 1237.66 569.19 1246.25 585.54 Q 1262.47 616.39 1284.56 662.22 Q 1292.50 678.70 1292.52 695.41 Q 1292.52 695.47 1292.20 701.94 C 1291.63 713.32 1294.91 723.91 1297.35 734.87 C 1300.01 746.89 1305.13 759.34 1305.74 772.33 C 1305.98 777.24 1306.66 804.29 1313.58 804.01 A 1.29 1.29 0.0 0 0 1314.41 803.66 C 1321.43 797.06 1316.55 769.02 1321.52 766.22 A 1.20 1.19 -21.2 0 1 1323.27 766.99 C 1326.58 781.35 1329.25 795.81 1332.92 809.99 C 1334.01 814.20 1338.07 821.55 1342.84 816.86 Q 1343.20 816.50 1343.28 816.00 Q 1344.28 809.42 1343.76 805.00 Q 1341.60 786.63 1337.95 768.42 A 0.48 0.48 0.0 0 1 1338.86 768.15 C 1342.31 776.96 1355.85 815.37 1366.03 816.16 C 1370.51 816.50 1371.54 810.41 1370.44 807.06 C 1367.79 798.97 1363.64 790.62 1361.28 783.45 Q 1357.86 773.08 1355.02 762.60 A 0.28 0.28 0.0 0 1 1355.50 762.34 Q 1359.72 767.36 1363.75 772.57 C 1368.83 779.14 1373.25 787.32 1378.17 794.66 Q 1379.99 797.36 1381.66 797.98 C 1384.30 798.97 1389.15 796.58 1388.99 793.50 Q 1388.85 790.72 1386.66 786.58 Q 1378.13 770.40 1369.24 754.42 C 1365.36 747.45 1364.08 743.12 1366.68 735.63 Q 1366.81 735.24 1367.20 735.38 Q 1371.90 736.99 1372.91 738.60 Q 1379.67 749.28 1393.03 749.97 C 1401.07 750.38 1400.13 741.50 1395.34 738.12 C 1390.41 734.62 1384.54 731.36 1381.93 726.55 C 1378.04 719.37 1374.79 711.78 1368.18 706.82 Q 1357.23 698.60 1343.50 693.43 C 1335.51 690.42 1332.54 680.64 1330.25 672.50 C 1321.70 642.22 1315.13 611.45 1310.75 580.29 Q 1308.97 567.62 1308.28 563.74 C 1302.89 533.66 1289.99 510.94 1272.05 486.75 Q 1271.76 486.36 1271.76 485.88 C 1271.89 470.59 1270.82 455.36 1265.92 440.80 C 1263.95 434.94 1260.59 428.46 1257.79 422.38 Q 1256.94 420.52 1257.10 418.48 C 1258.73 398.21 1260.25 378.73 1258.88 358.36 C 1257.39 336.36 1241.06 316.98 1223.33 305.40 C 1213.33 298.87 1205.11 297.32 1193.06 298.08 C 1179.40 298.94 1169.27 299.86 1157.52 293.24 Q 1139.58 283.12 1124.50 267.54 Q 1124.15 267.19 1124.04 266.70 Q 1121.33 254.82 1121.08 242.66 C 1120.97 237.52 1120.38 234.21 1124.51 231.78 Q 1124.95 231.52 1125.21 231.07 C 1128.92 224.63 1129.03 215.40 1128.17 207.76 Q 1128.08 207.01 1128.59 206.65 Q 1128.95 206.40 1129.15 206.78 L 1130.41 209.10 A 1.80 1.79 -42.1 0 0 1133.47 209.25 C 1138.33 202.11 1153.60 172.22 1141.68 166.80 Q 1141.16 166.57 1140.69 166.88 L 1138.38 168.39";
const BODY_HEAD_FRONT = "M 418.91 167.68 c 3.92 -1.77 6.58 0.47 7.06 4.32 c 1.48 11.93 -4.92 26.67 -11.75 36.45 c -2.21 3.17 -3.86 0.17 -4.74 -1.76 a 0.38 0.38 0 0 0 -0.73 0.16 c 0.02 8.31 1.01 17.01 -3.36 24.53 c -0.167 0.293 -4.39 4.62 -10.799 9.508 c -23.591 18.112 -41.591 16.112 -61.446 -0.797 c -4.736 -3.649 -5.925 -5.041 -8.805 -7.621 c -5.66 -5.07 -5.28 -17.38 -4.47 -24.92 c 0.05 -0.51 -0.468 -0.892 -0.933 -0.687 a 0.653 0.653 0 0 0 -0.357 0.397 c -0.57 1.69 -2.24 4.05 -4.07 1.48 c -6.2 -8.71 -16.02 -28.53 -11.19 -38.98 c 1.68 -3.627 3.733 -3.91 6.16 -0.85 a 182.853 182.853 0 0 1 3.78 23.29 a 1.02 1.02 0 0 0 1.56 0.77 c 2.79 -1.75 2.61 -18.93 2.63 -24.22 c 0.02 -4.53 1.12 -8.94 3.8 -13.1 c 4.36 -6.76 4.86 -11.51 5.57 -19.82 c 0.47 -5.53 4.34 -8.12 9.77 -8.21 c 6.39 -0.12 12.69 -0.07 19 -0.93 c 4.02 -0.55 7.4 -1.43 11.53 -0.75 c 6.7 1.1 13.44 1.64 20.22 1.62 c 4.607 -0.013 7.523 0.227 8.75 0.72 c 5.96 2.37 5.56 9.73 6.11 15.22 c 0.44 4.34 2.097 8.447 4.97 12.32 c 6.57 8.88 2.19 25.6 5.64 36.36 a 1.14 1.14 0 0 0 2.22 -0.23 c 0.887 -8.36 2.18 -16.45 3.88 -24.27 z z z z";
const BODY_HEAD_BACK = "M1028.14 166.45c1.03 5.06 1.36 9.61 6.41 11.53 13.06 4.95 16.74 15.51 23.52 27.48 1.387 2.447 3.863 3.623 7.43 3.53a910.025 910.025 0 0136.94-.25c6.23.09 9.27-7.55 11.48-12.3 4.31-9.27 10.37-15.83 20.28-18.94.333-.1.603-.287.81-.56 1.92-2.58 3.043-5.43 3.37-8.55l2.31-1.51a.977.977 0 01.99-.08c11.92 5.42-3.35 35.31-8.21 42.45-.761 1.11-2.423 1.028-3.06-.15l-1.26-2.32c-.133-.253-.32-.297-.56-.13-.34.24-.48.61-.42 1.11.86 7.64.75 16.87-2.96 23.31-.173.3.839.041-3.7 4.71-3.34 3.436-74.18 3.78-75.48-1.38a1.465 1.465 0 00-.55-.82c-4.15-2.97-6.07-7.95-6.16-12.39-.03-1.68.18-14.28-.53-14.63-.207-.1-.33-.037-.37.19-.3 1.553-1.183 2.597-2.65 3.13a.951.951 0 01-1.07-.32c-7.29-9.56-12.32-22.18-12.97-33.54-.34-6.04 1.797-9.23 6.41-9.57zm29.95 61.71c.173 14.187 18.967 14.703 19.1-1.37.03-4.05-.38-6.54-4.68-7.3-4.2-.75-11.87-1.47-13.85 2.91-.413.92-.603 2.84-.57 5.76zm31.71-3.35c.36 19.647 18.59 14.82 18.87 5.94.13-3.9 1.32-9.43-2.88-10.79-4.25-1.38-16.12-2.54-15.99 4.85z";
const BODY_HAIR_BACK = "M1138.38 168.39q-.49 4.68-3.37 8.55-.31.41-.81.56c-9.91 3.11-15.97 9.67-20.28 18.94-2.21 4.75-5.25 12.39-11.48 12.3q-18.46-.25-36.94.25-5.35.14-7.43-3.53c-6.78-11.97-10.46-22.53-23.52-27.48-5.05-1.92-5.38-6.47-6.41-11.53q-6.64-26.16 4.43-48.88c8.13-16.7 34.61-21.41 51.58-21.04 4.89.11 9.69-.11 14.42.85 18.79 3.8 33.17 8.5 39.34 28.66q6.38 20.88.47 42.35z";
const BODY_FIGURE_SCALE = 100 / 724;
const BODY_LABEL_SPACE = 16;

// ViewBox: 0 0 210 216  (front occupies 0–100, back 110–210, y 0–216;
// the extra 16 units at the top of each 200-tall figure is label space)
// All hotspot coordinates are 0–100 percentages of body width/height,
// converted via sx=h.x, sy=BODY_LABEL_SPACE+(h.y/100)*200

const BODY_SVG_VIEWBOX = "0 0 210 216";

function BodyFigureSVG({ pins, hoveredHotspot, onHover, onClick, view }) {
  // view: "front" | "back"
  const offsetX = view === "back" ? 110 : 0;

  // pick this view's vendored real-path data
  const outlineD = view === "front" ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK;
  const headD = view === "front" ? BODY_HEAD_FRONT : BODY_HEAD_BACK;
  const skin = "#e8c9a8";
  const sk = "#1e3a5f";

  return (
    <g transform={`translate(${offsetX}, 0)`}>
      {/* ── Label ── */}
      <text x="50" y="10" textAnchor="middle" fontSize="7" fill="#6b8399" fontWeight="700" letterSpacing="1">
        {view === "front" ? "ANTERIOR" : "POSTERIOR"}
      </text>

      {/* ── Real anatomical outline (vendored, see header comment) ── */}
      {/* Native path data: front lives at x:0-724, back at x:724-1448 (the
          source library draws both sides in one wide viewBox) — shift back
          paths by -724 so both render at x:0-724 before the uniform scale. */}
      <g transform={`translate(0, ${BODY_LABEL_SPACE}) scale(${BODY_FIGURE_SCALE}) translate(${view === "back" ? -724 : 0}, 0)`}>
        <path d={outlineD} fill={skin} stroke={sk} strokeWidth="3"/>
        <path d={headD} fill={skin} stroke={sk} strokeWidth="3"/>
        {view === "back" && <path d={BODY_HAIR_BACK} fill="#3a2a1a" stroke={sk} strokeWidth="2"/>}
      </g>

      {/* ── HOTSPOT INTERACTIVE ZONES ── */}
      {ANATOMICAL_HOTSPOTS.filter(h => h.side === view || h.side === "both").map(h => {
        // convert 0-100 % coords to local SVG space (100-wide box, 200-tall
        // figure with BODY_LABEL_SPACE units of label room above it)
        const sx = (h.x / 100) * 100;
        const sy = BODY_LABEL_SPACE + (h.y / 100) * 200;
        const pin = pins.find(p => p.hotspotId === h.id);
        const isHovered = hoveredHotspot === h.id;
        const gradeColor = pin ? (GRADE_COLOR[pin.tenderness] || C.accent) : null;

        return (
          <g key={h.id}>
            {/* Invisible interaction zone */}
            <circle
              data-hotspot-id={h.id}
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
        padding:"5px 10px", borderRadius:8, fontSize:"0.82rem", fontWeight:700,
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
  // Hydrate from any previously recorded findings -- this was previously
  // useState([]) with nothing to load existing data, so a useEffect below
  // (which also fires on mount) immediately overwrote data.palp_pins with
  // an empty array the instant this module rendered, silently destroying
  // any prior palpation findings just by opening the tab.
  const [pins, setPins]           = useState(() => {
    try { const v = data?.palp_pins; return v ? JSON.parse(v) : []; } catch { return []; }
  }); // { id, hotspotId, label, structures, tenderness, temp, texture, notes, side }
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
    set("palp_pins", JSON.stringify(pins));
  }, [pins]);

  const inp = {
    width:"100%", background:C.s2, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.text, padding:"8px 10px", fontSize:"0.75rem", fontFamily:"inherit",
    outline:"none", resize:"vertical", WebkitAppearance:"none", appearance:"none",
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
            <div style={{ fontSize:"0.78rem", color:C.muted, marginTop:2 }}>
              Tap any region on the body — anatomical point auto-generates. Record tenderness, tissue quality & findings.
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"0.75rem", color:C.muted }}>{pins.length} point{pins.length !== 1 ? "s" : ""} recorded</span>
            {pins.length > 0 && (
              <button onClick={() => { setPins([]); setSelected(null); }}
                style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${C.red}40`,
                  background:"rgba(255,77,109,0.08)", color:C.red, fontSize:"0.82rem",
                  fontWeight:700, cursor:"pointer" }}>Clear all</button>
            )}
          </div>
        </div>

        {/* Instruction */}
        <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ padding:"5px 10px", background:"rgba(0,229,255,0.08)", border:`1px solid ${C.accent}25`,
            borderRadius:8, fontSize:"0.75rem", color:C.accent }}>
            👆 Tap body → anatomical point appears
          </div>
          <div style={{ padding:"5px 10px", background:"rgba(127,90,240,0.08)", border:`1px solid ${C.a2}25`,
            borderRadius:8, fontSize:"0.75rem", color:C.a2 }}>
            🔴 Coloured dots = recorded findings
          </div>
          <div style={{ padding:"5px 10px", background:"rgba(0,201,122,0.08)", border:`1px solid ${C.green}25`,
            borderRadius:8, fontSize:"0.75rem", color:C.green }}>
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
        <div style={{ flex:"0 0 auto", display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:480 }}>
          <svg
            viewBox={BODY_SVG_VIEWBOX}
            width="100%"
            style={{ maxWidth:460, minWidth:260, background:C.surface,
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
            <line x1="105" y1="2" x2="105" y2="216" stroke={C.border} strokeWidth="0.5" strokeDasharray="2,3"/>
          </svg>

          {/* Hover tooltip outside SVG */}
          {hovered && (
            <div style={{ marginTop:6, padding:"6px 12px", background:C.s2,
              border:`1px solid ${C.accent}40`, borderRadius:8, maxWidth:460,
              fontSize:"0.78rem", color:C.accent, fontWeight:600, textAlign:"center",
              animation:"slideIn 0.15s ease" }}>
              {ANATOMICAL_HOTSPOTS.find(h => h.id === hovered)?.label}
              <div style={{ color:C.muted, fontWeight:400, fontSize:"0.8rem", marginTop:1 }}>
                Click to add palpation point
              </div>
            </div>
          )}

          {/* Tenderness legend */}
          <div style={{ marginTop:10, padding:"8px 10px", background:C.surface,
            border:`1px solid ${C.border}`, borderRadius:8, maxWidth:460, width:"100%" }}>
            <div style={{ fontSize:"0.78rem", fontWeight:700, color:C.muted,
              textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>Tenderness Legend</div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {GRADES.map(g => (
                <div key={g} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:GRADE_COLOR[g],
                    boxShadow:`0 0 4px ${GRADE_COLOR[g]}` }}/>
                  <span style={{ fontSize:"0.8rem", color:C.muted, fontWeight:600 }}>{g}</span>
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
              <div style={{ fontSize:"0.82rem", color:C.muted, lineHeight:1.6 }}>
                The anatomical structure name auto-fills.<br/>
                Then record tenderness grade, tissue quality,<br/>
                temperature and clinical notes.
              </div>
            </div>
          )}

          {/* Pin list (when nothing selected) */}
          {!selPin && pins.length > 0 && (
            <div style={{ animation:"slideIn 0.2s ease" }}>
              <div style={{ fontSize:"0.75rem", fontWeight:700, color:C.muted,
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
                        fontSize:"0.8rem", fontWeight:900, color:gc, flexShrink:0 }}>
                        {pin.tenderness || "?"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:"0.78rem", color:C.text,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {pin.label}
                        </div>
                        <div style={{ fontSize:"0.82rem", color:C.muted, marginTop:2 }}>
                          {pin.side === "front" ? "Anterior" : "Posterior"}
                          {pin.temp ? ` · ${pin.temp}` : ""}
                          {(pin.texture || []).length > 0 ? ` · ${pin.texture.join(", ")}` : ""}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); removePin(pin.id); }}
                        style={{ background:"none", border:"none", color:C.muted,
                          cursor:"pointer", fontSize:"0.82rem", padding:"0 3px", lineHeight:1 }}>✕</button>
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
                    <div style={{ fontSize:"0.82rem", color:C.muted,
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
                      background:"transparent", color:C.muted, fontSize:"0.82rem", cursor:"pointer" }}>
                    ← Back
                  </button>
                  <button onClick={() => removePin(selPin.id)}
                    style={{ padding:"4px 9px", borderRadius:7, border:`1px solid ${C.red}40`,
                      background:"rgba(255,77,109,0.08)", color:C.red, fontSize:"0.82rem", cursor:"pointer" }}>
                    Remove
                  </button>
                </div>
              </div>

              {/* Structures at this point */}
              <div style={{ background:C.s2, border:`1px solid ${C.border}`,
                borderRadius:9, padding:"9px 12px", marginBottom:12 }}>
                <div style={{ fontSize:"0.78rem", fontWeight:700, color:C.accent,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  🏗 Structures at this point
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {selPin.structures.map((s, i) => (
                    <span key={i} style={{ fontSize:"0.75rem", padding:"2px 8px", borderRadius:20,
                      background:C.s3, border:`1px solid ${C.border}`, color:C.text }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Tenderness Grade ── */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.muted,
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
                  <div style={{ marginTop:6, fontSize:"0.75rem", color:GRADE_COLOR[selPin.tenderness],
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
                <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  Tissue Temperature (dorsum of hand)
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {TEMPS.map(t => {
                    const sel = selPin.temp === t;
                    const col = {"Normal":C.green,"Warm":C.yellow,"Hot":C.red,"Cool":"#38bdf8","Cold":"#0ea5e9"}[t];
                    return (
                      <button key={t} onClick={() => updatePin(selPin.id, "temp", sel ? "" : t)}
                        style={{ padding:"4px 10px", borderRadius:8, fontSize:"0.78rem", fontWeight:sel ? 700 : 400,
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
                <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                  Tissue Quality (select all that apply)
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {TEXTURES.map(tex => {
                    const sel = (selPin.texture || []).includes(tex);
                    return (
                      <button key={tex} onClick={() => toggleTexture(selPin.id, tex)}
                        style={{ padding:"4px 10px", borderRadius:8, fontSize:"0.75rem", fontWeight:sel ? 700 : 400,
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
                <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>
                  Bilateral Comparison
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  {["Symmetric","R > L","L > R","Unilateral only"].map(opt => {
                    const sel = selPin.bilateral === opt;
                    return (
                      <button key={opt} onClick={() => updatePin(selPin.id, "bilateral", sel ? "" : opt)}
                        style={{ flex:1, padding:"5px 4px", borderRadius:8, fontSize:"0.8rem",
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
                <div style={{ fontSize:"0.82rem", fontWeight:700, color:C.muted,
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
                  border:`1px solid ${C.border}`, fontSize:"0.78rem", color:C.muted,
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
                          fontSize:"0.75rem", cursor:prev ? "pointer" : "default" }}>
                        ← Prev
                      </button>
                      <span style={{ fontSize:"0.8rem", color:C.muted, alignSelf:"center" }}>
                        {idx + 1} / {pins.length}
                      </span>
                      <button onClick={() => next && setSelected(next.id)}
                        style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.border}`,
                          background:"transparent", color:next ? C.muted : "transparent",
                          fontSize:"0.75rem", cursor:next ? "pointer" : "default" }}>
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
            fontSize:"0.82rem", fontWeight:700, color:C.text, display:"flex",
            justifyContent:"space-between", alignItems:"center" }}>
            📋 Palpation Summary — All Points
            <span style={{ color:C.muted, fontWeight:400, fontSize:"0.82rem" }}>
              {pins.filter(p => p.tenderness).length}/{pins.length} graded
            </span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
              <thead>
                <tr style={{ background:C.s2 }}>
                  {["Anatomical Point","Side","Grade","Temp","Tissue Quality","Bilateral","Notes"].map(h => (
                    <th key={h} style={{ padding:"7px 10px", textAlign:"left", color:C.muted,
                      fontWeight:700, fontSize:"0.8rem", textTransform:"uppercase",
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
  const ELECTRO_TYPES = ["TENS — conventional (80–150Hz)","TENS — acupuncture-like (2–4Hz)","TENS — burst","IFT — 80–150Hz (pain)","IFT — 1–10Hz (muscle stim)","SWD — continuous","SWD — pulsed","NMES — quadriceps","NMES — glutes","Russian stim","LASER — class 3B","LASER — class 4","Shockwave — radial","Shockwave — focused","Biofeedback EMG"];

  const inp = { width:"100%", background:PC.s3, border:`1px solid ${PC.border}`, borderRadius:8, color:PC.text, fontFamily:"inherit", outline:"none", padding:"7px 10px", fontSize:"0.75rem", WebkitAppearance:"none", appearance:"none" };
  const sel = { ...inp };
  const ta  = { ...inp, resize:"vertical", minHeight:60 };
  const lbl = { fontSize:"0.8rem", fontWeight:700, color:PC.muted, display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.8px" };

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
                  style={{padding:"5px 10px",borderRadius:8,fontSize:"0.78rem",fontWeight:form.grade===g.grade?800:500,border:`1px solid ${form.grade===g.grade?"rgba(0,229,255,0.6)":PC.border}`,background:form.grade===g.grade?"rgba(0,229,255,0.12)":"transparent",color:form.grade===g.grade?PC.accent:PC.muted,cursor:"pointer"}}>
                  {g.grade}
                </button>
              ))}
            </div>
            {form.grade && <div style={{marginTop:5,fontSize:"0.82rem",color:PC.muted,padding:"5px 9px",background:PC.s3,borderRadius:7}}>{MAITLAND_GRADES.find(g=>g.grade===form.grade)?.desc}</div>}
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
        <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
          {editing?"✏️ Edit Technique":"➕ Add Treatment Technique"}
        </div>

        {/* Type tabs */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>{setActiveTab(t.key);fset("type",t.key);}}
              style={{padding:"5px 10px",borderRadius:8,fontSize:"0.82rem",fontWeight:activeTab===t.key?800:500,border:`1px solid ${activeTab===t.key?typeColor(t.key)+"60":PC.border}`,background:activeTab===t.key?`${typeColor(t.key)}18`:"transparent",color:activeTab===t.key?typeColor(t.key):PC.muted,cursor:"pointer"}}>
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
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
            📌 Techniques This Session ({techniques.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {techniques.map(t=>(
              <div key={t.id} style={{background:PC.surface,border:`1px solid ${typeColor(t.type)}30`,borderRadius:11,overflow:"hidden"}}>
                <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:"1.1rem"}}>{typeIcon(t.type)}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{techniqueLabel(t)}</div>
                    {t.dosage&&<div style={{fontSize:"0.82rem",color:PC.muted,marginTop:1}}>{t.dosage}{t.duration?` · ${t.duration}`:""}</div>}
                    {t.response&&<div style={{marginTop:4,fontSize:"0.75rem",color:PC.a3,lineHeight:1.4}}>↳ {t.response}</div>}
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    <button onClick={()=>editEntry(t)} style={{background:`${typeColor(t.type)}15`,border:`1px solid ${typeColor(t.type)}40`,borderRadius:6,color:typeColor(t.type),cursor:"pointer",fontSize:"0.8rem",padding:"3px 8px",fontWeight:700}}>✏️</button>
                    <button onClick={()=>deleteTechnique(t.id)} style={{background:"none",border:"none",color:"rgba(255,77,109,0.5)",cursor:"pointer",fontSize:"0.8rem",padding:"3px 5px"}}>✕</button>
                  </div>
                </div>
                {t.notes&&<div style={{padding:"6px 12px 8px",borderTop:`1px solid ${PC.border}`,fontSize:"0.82rem",color:PC.muted,fontStyle:"italic"}}>{t.notes}</div>}
              </div>
            ))}
          </div>
          <button onClick={()=>{save([]);showToast("Cleared all techniques");}}
            style={{marginTop:10,width:"100%",padding:"8px",background:"transparent",border:`1px solid rgba(255,77,109,0.3)`,borderRadius:9,color:"rgba(255,77,109,0.7)",fontSize:"0.8rem",cursor:"pointer"}}>
            🗑 Clear All Techniques
          </button>
        </div>
      )}
      {techniques.length===0&&(
        <div style={{textAlign:"center",padding:"24px",color:PC.muted,fontSize:"0.76rem"}}>No techniques recorded yet — add your first above.</div>
      )}

      {/* ── Maitland Grade Reference ── */}
      <div style={{marginTop:14,background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"13px"}}>
        <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:9}}>📚 Maitland Grade Reference</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {MAITLAND_GRADES.map(g=>(
            <div key={g.grade} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"6px 10px",background:PC.s3,borderRadius:8}}>
              <span style={{fontWeight:800,fontSize:"0.78rem",color:PC.accent,flexShrink:0,minWidth:28}}>G{g.grade}</span>
              <span style={{fontSize:"0.78rem",color:PC.text,lineHeight:1.5}}>{g.desc}</span>
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

  const inp = { width:"100%", background:PC.s3, border:`1px solid ${PC.border}`, borderRadius:8, color:PC.text, fontFamily:"inherit", outline:"none", padding:"7px 10px", fontSize:"0.75rem", WebkitAppearance:"none", appearance:"none" };
  const ta  = { ...inp, resize:"vertical", minHeight:70 };
  const lbl = { fontSize:"0.8rem", fontWeight:700, color:PC.muted, display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.8px" };

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
        <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
          {editing?"✏️ Edit Session Log":"📋 Log Treatment Session"}
        </div>

        {/* Auto-pull banner */}
        {!editing&&(autoTechniques||autoHEP)&&(
          <div style={{marginBottom:10,padding:"8px 11px",background:"rgba(0,201,122,0.07)",border:"1px solid rgba(0,201,122,0.25)",borderRadius:9,fontSize:"0.75rem",color:PC.green,lineHeight:1.6}}>
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
        {(form.vasStart||form.vasEnd)&&(()=>{const ch=vasChange(form.vasStart,form.vasEnd);return ch!==null?<div style={{marginBottom:8,padding:"6px 10px",background:ch<0?"rgba(0,201,122,0.1)":ch>0?"rgba(255,77,109,0.1)":"rgba(255,179,0,0.1)",border:`1px solid ${ch<0?"rgba(0,201,122,0.3)":ch>0?"rgba(255,77,109,0.3)":"rgba(255,179,0,0.3)"}`,borderRadius:8,fontSize:"0.78rem",fontWeight:700,color:ch<0?PC.green:ch>0?PC.red:PC.yellow}}>VAS change: {ch>0?"+":""}{ch} — {ch<0?"✅ Improved":ch>0?"⚠️ Increased":"→ No change"}</div>:null;})()}

        {/* Treatment given */}
        <div style={{marginBottom:8}}>
          <label style={lbl}>Treatment Given Today</label>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            {TX_CATEGORIES.map(c=>{
              const sel=(form.techniques||"").split(",").map(s=>s.trim()).includes(c);
              return <button key={c} onClick={()=>{const arr=(form.techniques||"").split(",").map(s=>s.trim()).filter(Boolean);const next=sel?arr.filter(x=>x!==c):[...arr,c];fset("techniques",next.join(", "));}}
                style={{padding:"3px 9px",borderRadius:7,fontSize:"0.8rem",fontWeight:sel?700:400,border:`1px solid ${sel?"rgba(0,229,255,0.5)":PC.border}`,background:sel?"rgba(0,229,255,0.12)":"transparent",color:sel?PC.accent:PC.muted,cursor:"pointer"}}>{c}</button>;
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
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:9}}>
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
                    <span style={{fontSize:"0.82rem",fontWeight:900,color:PC.accent}}>#{s.sessionNo||idx+1}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{s.date} — {s.type||"Treatment"}</div>
                    <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:1}}>{s.clinician||""}{s.techniques?` · ${s.techniques.split(",").slice(0,2).join(", ")}${s.techniques.split(",").length>2?" +more":""}`:""}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    {ch!==null&&<span style={{fontSize:"0.75rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:ch<0?"rgba(0,201,122,0.12)":ch>0?"rgba(255,77,109,0.12)":"rgba(255,179,0,0.1)",color:ch<0?PC.green:ch>0?PC.red:PC.yellow}}>{ch>0?"+":""}{ch} VAS</span>}
                    <span style={{color:PC.muted,fontSize:"0.75rem"}}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen&&(
                  <div style={{padding:"0 13px 13px",borderTop:`1px solid ${PC.border}`}}>
                    {s.treatmentGiven&&<div style={{marginTop:10}}><div style={{fontSize:"0.78rem",fontWeight:700,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Treatment Given</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6,background:PC.s3,borderRadius:8,padding:"8px 11px"}}>{s.treatmentGiven}</div></div>}
                    {s.response&&<div style={{marginTop:8}}><div style={{fontSize:"0.78rem",fontWeight:700,color:PC.green,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Patient Response</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6,background:"rgba(0,201,122,0.06)",border:"1px solid rgba(0,201,122,0.2)",borderRadius:8,padding:"8px 11px"}}>{s.response}</div></div>}
                    {s.nextPlan&&<div style={{marginTop:8}}><div style={{fontSize:"0.78rem",fontWeight:700,color:PC.a2,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Next Session Plan</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6,background:"rgba(127,90,240,0.06)",border:"1px solid rgba(127,90,240,0.2)",borderRadius:8,padding:"8px 11px"}}>{s.nextPlan}</div></div>}
                    {s.goals&&<div style={{marginTop:8}}><div style={{fontSize:"0.78rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Goals</div><div style={{fontSize:"0.73rem",color:PC.text,lineHeight:1.6}}>{s.goals}</div></div>}
                    {s.notes&&<div style={{marginTop:6,fontSize:"0.75rem",color:PC.muted,fontStyle:"italic"}}>{s.notes}</div>}
                    <div style={{display:"flex",gap:6,marginTop:10}}>
                      <button onClick={()=>editSession(s)} style={{padding:"6px 12px",background:`${PC.accent}15`,border:`1px solid ${PC.accent}40`,borderRadius:7,color:PC.accent,fontSize:"0.75rem",fontWeight:700,cursor:"pointer"}}>✏️ Edit</button>
                      <button onClick={()=>deleteSession(s.id)} style={{padding:"6px 10px",background:"rgba(255,77,109,0.08)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:7,color:"#ff4d6d",fontSize:"0.75rem",cursor:"pointer"}}>🗑 Delete</button>
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
  // Always compute SOAP so ROM values update even before panel opens
  const soap = React.useMemo(() => {
    return buildRealtimeSOAP(data);
  }, [data]);

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
    const pCount = (data["tx_techniques"] || data["hep_programme"] || data["tx_exercise_prescription"] || data["tx_frequency"]) ? 1 : 0;
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
    const dob     = data["dem_dob"] || "";
    const age2    = data["dem_age"] ? `${data["dem_age"]}y` : "";
    const sex2    = data["dem_gender"] || data["dem_sex"] || "";
    const dx      = data["soap_a_diagnosis"] || "";
    const icd2    = data["soap_icd10"] || "";
    const clinician = data["soap_clinician"] || "";
    const date    = new Date().toLocaleDateString("en-AU", {day:"2-digit",month:"long",year:"numeric"});

    const formatSection = (text) => {
      if (!text) return "<p style=\"color:#9CA3AF;font-style:italic\">No data recorded.</p>";
      return text.split("\n").map(line => {
        const escaped = line.replace(/</g,"&lt;").replace(/>/g,"&gt;");
        if (!escaped.trim()) return "<br>";
        // Section headers (e.g. "Range of Motion:", "Special Tests:")
        if (/^[A-Z][A-Za-z \/()]+:$/.test(escaped.trim())) {
          return `<div class="subsection">${escaped.trim()}</div>`;
        }
        // Indented lines
        if (escaped.startsWith("  ")) {
          const isPos = escaped.toLowerCase().includes("positive");
          const isNeg = escaped.toLowerCase().includes("negative");
          const isFlag = escaped.includes("⚠") || escaped.includes("❌");
          const cls = isPos?"pos":isNeg?"neg":isFlag?"flag":"item";
          return `<div class="${cls}">${escaped.trim()}</div>`;
        }
        return `<div class="line">${escaped}</div>`;
      }).join("");
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>SOAP Note — ${patName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; max-width: 820px; margin: 32px auto; color: #111827; line-height: 1.65; font-size: 13px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366F1; padding-bottom: 14px; margin-bottom: 20px; }
  .header-left h1 { font-size: 22px; font-weight: 800; color: #1E1B4B; margin-bottom: 4px; }
  .header-left .meta { font-size: 12px; color: #6B7280; }
  .header-right { text-align: right; font-size: 12px; color: #6B7280; }
  .dx-banner { background: #EEF2FF; border-left: 4px solid #6366F1; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
  .dx-banner .dx-label { font-size: 10px; font-weight: 700; color: #4F46E5; text-transform: uppercase; letter-spacing: 0.08em; }
  .dx-banner .dx-name { font-size: 16px; font-weight: 700; color: #1E40AF; }
  .dx-banner .icd { font-size: 11px; color: #6366F1; margin-top: 2px; }
  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 10px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 14px; margin-bottom: 10px; }
  .section-icon { font-size: 16px; }
  .section-title { font-size: 14px; font-weight: 700; color: #111827; }
  .section-sub { font-size: 11px; color: #6B7280; margin-left: auto; }
  .section-body { padding: 0 4px; }
  .subsection { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.06em; margin: 10px 0 4px; border-bottom: 1px solid #F3F4F6; padding-bottom: 2px; }
  .item { font-size: 12.5px; color: #374151; padding: 2px 0 2px 12px; border-left: 2px solid #E5E7EB; margin: 2px 0; }
  .pos  { font-size: 12.5px; color: #DC2626; padding: 2px 0 2px 12px; border-left: 2px solid #FCA5A5; margin: 2px 0; font-weight: 600; }
  .neg  { font-size: 12.5px; color: #059669; padding: 2px 0 2px 12px; border-left: 2px solid #A7F3D0; margin: 2px 0; }
  .flag { font-size: 12.5px; color: #D97706; padding: 2px 0 2px 12px; border-left: 2px solid #FDE68A; margin: 2px 0; font-weight: 600; }
  .line { font-size: 12.5px; color: #111827; padding: 1px 0; }
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; display: flex; justify-content: space-between; }
  @media print { body { margin: 16px; } .section { page-break-inside: avoid; } }
</style></head><body>
<div class="header">
  <div class="header-left">
    <h1>${patName}</h1>
    <div class="meta">${[dob,age2,sex2].filter(Boolean).join(" · ")}</div>
  </div>
  <div class="header-right">
    <div><strong>SOAP Note</strong></div>
    <div>${date}</div>
    ${clinician ? `<div>${clinician}</div>` : ""}
  </div>
</div>
${dx ? `<div class="dx-banner"><div class="dx-label">Provisional Diagnosis</div><div class="dx-name">${dx}</div>${icd2?`<div class="icd">ICD-10: ${icd2}</div>`:""}</div>` : ""}
<div class="section">
  <div class="section-header"><span class="section-icon">💬</span><span class="section-title">S — Subjective</span><span class="section-sub">Patient reported</span></div>
  <div class="section-body">${formatSection(soap.S)}</div>
</div>
<div class="section">
  <div class="section-header"><span class="section-icon">📋</span><span class="section-title">O — Objective</span><span class="section-sub">Clinical findings</span></div>
  <div class="section-body">${formatSection(soap.O)}</div>
</div>
<div class="section">
  <div class="section-header"><span class="section-icon">🧠</span><span class="section-title">A — Assessment</span><span class="section-sub">Clinical impression</span></div>
  <div class="section-body">${formatSection(soap.A)}</div>
</div>
<div class="section">
  <div class="section-header"><span class="section-icon">✅</span><span class="section-title">P — Plan</span><span class="section-sub">Treatment & goals</span></div>
  <div class="section-body">${formatSection(soap.P)}</div>
</div>
<div class="footer">
  <span>Generated by PhysioM · ${date}</span>
  <span>Clinician: ${clinician || "—"}</span>
</div>
</body></html>`;
    const w = window.open("","_blank","width=960,height=800");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 800); }
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
    fontSize:"0.82rem", fontWeight:800, letterSpacing:"0.3px",
    transition:"all 0.2s",
  };

  if (!open) {
    const isMobilePill = typeof window !== "undefined" && window.innerWidth <= 767;
    if (isMobilePill) {
      // Round floating button — sits above the bottom navigation, never covers it
      return (
        <button onClick={()=>setOpen(true)} title="Open Live SOAP Panel" style={{
          position:"fixed", bottom:"calc(96px + env(safe-area-inset-bottom))", right:14, zIndex:138,
          width:56, height:56, borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"linear-gradient(135deg,#7c3aed,#9333ea)", border:"none",
          color:"#fff", cursor:"pointer",
          boxShadow:"0 4px 18px rgba(124,58,237,0.45)", fontSize:"1.35rem",
        }}>
          📋
          {hasContent && (
            <span style={{
              position:"absolute", top:-4, right:-4,
              minWidth:20, height:20, borderRadius:10, padding:"0 5px",
              background:"#059669", border:"2px solid #fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"0.8rem", fontWeight:800, color:"#fff",
            }}>{totalFilled}</span>
          )}
        </button>
      );
    }
    return (
      <button onClick={()=>setOpen(true)} style={pillStyle} title="Open Live SOAP Panel">
        <span style={{fontSize:"1rem"}}>📋</span>
        <span>Live SOAP</span>
        {hasContent && (
          <span style={{
            background:"rgba(255,255,255,0.25)", borderRadius:10,
            padding:"2px 8px", fontSize:"0.75rem", fontWeight:800
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
          <span style={{fontSize:"0.78rem",color:"rgba(255,255,255,0.8)",fontWeight:700}}>LIVE</span>
        </div>
        {!isMobile && (
          <button onClick={()=>setMinimal(m=>!m)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"#fff",padding:"3px 7px",cursor:"pointer",fontSize:"0.8rem",fontWeight:700}}>
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
              <span style={{fontSize:"0.8rem"}}>{sec.icon}</span>
              <span style={{fontSize:"0.8rem",fontWeight:active?800:600,color:active?sec.col:"#6B6B6B"}}>{key}</span>
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
          {/* Section header card */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            background:currentSec.col+"12",
            borderLeft:`3px solid ${currentSec.col}`,
            borderRadius:"0 8px 8px 0",
            padding:"7px 10px",
            marginBottom:10,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:"1rem"}}>{currentSec.icon}</span>
              <div>
                <div style={{fontSize:"0.78rem",fontWeight:800,color:currentSec.col,letterSpacing:"0.4px",textTransform:"uppercase",lineHeight:1.2}}>
                  {currentSec.label}
                </div>
                <div style={{fontSize:"0.68rem",color:currentSec.col+"99",marginTop:1}}>
                  {tab==="S"?"Patient reported":tab==="O"?"Clinical findings":tab==="A"?"Clinical impression":"Treatment & goals"}
                </div>
              </div>
            </div>
            <button onClick={()=>copySection(currentText)} style={{
              padding:"3px 8px",background:"transparent",
              border:`1px solid ${currentSec.col}44`,
              borderRadius:6,color:currentSec.col,
              cursor:"pointer",fontSize:"0.72rem",fontWeight:700,
              flexShrink:0,
            }}>
              {copied===tab ? "✓ Copied" : "Copy"}
            </button>
          </div>

          {/* SOAP content — card style */}
          {currentText ? (
            <div style={{fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif"}}>
              {currentText.split("\n").map((line,i)=>{
                if(!line.trim()) return <div key={i} style={{height:4}}/>;

                // Subsection header e.g. "Range of Motion:", "Special Tests:"
                if(/^[A-Z][A-Za-z /()&,]+:$/.test(line.trim())){
                  return (
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:6,
                      background:currentSec.col+"18",
                      borderLeft:`3px solid ${currentSec.col}`,
                      padding:"5px 10px",
                      marginTop:10,marginBottom:4,
                      borderRadius:"0 6px 6px 0",
                    }}>
                      <span style={{fontSize:9.5,fontWeight:800,color:currentSec.col,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                        {line.trim().replace(/:$/,"")}
                      </span>
                    </div>
                  );
                }

                // Indented item
                if(line.startsWith("  ")){
                  const txt=line.trim();
                  const isPos=/positive|\+ve/i.test(txt);
                  const isNeg=/negative|-ve|normal|intact/i.test(txt);
                  const isFlag=/⚠|❌|urgent|red flag/i.test(txt);

                  if(isPos||isNeg){
                    // Show as two-column row with pill badge
                    const dashIdx=txt.search(/\s+[—–-]\s+/);
                    const name=dashIdx>0 ? txt.slice(0,dashIdx).trim() : txt.replace(/\s*(positive|negative|\+ve|-ve|normal|intact).*/i,"").trim()||txt;
                    return (
                      <div key={i} style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        padding:"4px 8px",borderBottom:"1px solid #f1f5f9",fontSize:11.5,
                      }}>
                        <span style={{color:"#334155",fontWeight:500,flex:1,marginRight:8}}>{name}</span>
                        <span style={{
                          fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:10,flexShrink:0,
                          background:isPos?"#fee2e2":"#dcfce7",
                          color:isPos?"#dc2626":"#059669",
                          letterSpacing:"0.03em",
                        }}>
                          {isPos?"+ve":"−ve"}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={i} style={{
                      display:"flex",alignItems:"flex-start",gap:5,
                      padding:"3px 8px",fontSize:11.5,
                      color:isFlag?"#d97706":"#374151",
                    }}>
                      <span style={{color:isFlag?"#d97706":currentSec.col,flexShrink:0,fontSize:11,marginTop:1,fontWeight:700}}>·</span>
                      <span style={{fontWeight:isFlag?600:400,lineHeight:1.45}}>{txt}</span>
                    </div>
                  );
                }

                // Top-level line — bold heading
                return (
                  <div key={i} style={{
                    fontSize:12,fontWeight:700,color:"#1e293b",
                    marginTop:i===0?0:10,marginBottom:2,lineHeight:1.4,
                  }}>
                    {line}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              textAlign:"center",padding:"28px 12px",
              color:"#6B6B6B",fontSize:"0.78rem",lineHeight:1.6,
            }}>
              <div style={{
                width:44,height:44,borderRadius:"50%",
                background:currentSec.col+"15",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"1.3rem",margin:"0 auto 10px",
              }}>
                {tab==="S"?"💬":tab==="O"?"📊":tab==="A"?"🧠":"📝"}
              </div>
              <div style={{fontWeight:700,marginBottom:4,color:"#5b4a78"}}>
                {tab==="S" ? "Complete the Subjective Assessment" :
                 tab==="O" ? "Perform assessments to auto-fill Objective" :
                 tab==="A" ? "Assessment generates after findings are entered" :
                 "Plan auto-generates from assessment findings"}
              </div>
              <div style={{fontSize:"0.75rem",color:"#a09ab8"}}>
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
                  padding:"4px 10px",background:"transparent",
                  border:"1px solid rgba(124,58,237,0.2)",borderRadius:20,
                  color:"#7c3aed",cursor:"pointer",fontSize:"0.82rem",fontWeight:700,
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
          cursor:"pointer",fontSize:"0.75rem",fontWeight:800,
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
          background:"transparent",
          border:"1px solid rgba(124,58,237,0.2)",
          borderRadius:8,color:"#7c3aed",
          cursor:"pointer",fontSize:"0.75rem",fontWeight:800,
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
            cursor:"pointer",fontSize:"0.75rem",fontWeight:800,
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
  SOAPNoteModule, EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES, TEMPLATE_TX, ExercisePrescriptionModule, PalpationModule,
  TreatmentTechniquesModule, TreatmentSessionLogModule, Sparkline, LiveSOAPPanel, ObservationModule, detectModulesV2,
  MMT_DATA_LABELS, mmtFallbackLabel, ST_DATA_LABELS, SCALE_DATA_LABELS, resolveCyriaxKey };

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATION MODULE — Magee's Orthopedic Physical Assessment (Inspection Only)
// ═══════════════════════════════════════════════════════════════════════════════
const OBS_BODY_REGIONS = [
  {id:"all",    label:"General"},
  {id:"cx",     label:"Cervical"},
  {id:"sh",     label:"Shoulder"},
  {id:"el",     label:"Elbow"},
  {id:"wh",     label:"Wrist/Hand"},
  {id:"th",     label:"Thoracic"},
  {id:"lx",     label:"Lumbar"},
  {id:"hp",     label:"Hip"},
  {id:"kn",     label:"Knee"},
  {id:"af",     label:"Ankle/Foot"},
];

// Priority fields shown first per region
const OBS_REGION_PRIORITY = {
  cx:  ["posture_head","posture_shoulders"],
  sh:  ["posture_shoulders","posture_scapula","muscle_bulk","deformity","skin"],
  el:  ["deformity","skin","swelling"],
  wh:  ["deformity","skin","swelling"],
  th:  ["posture_thoracic","posture_scapula","deformity"],
  lx:  ["posture_lumbar","posture_pelvis","deformity"],
  hp:  ["posture_pelvis","muscle_bulk","deformity","gait"],
  kn:  ["swelling","muscle_bulk","posture_lower","deformity","skin"],
  af:  ["posture_feet","swelling","deformity","skin"],
};

function ObservationModule({ data, set }) {
  const PC = typeof getC === "function" ? getC() : {
    surface:"#fff", s2:"#FFFFFF", s3:"#FFFFFF", border:"#E0E0E2",
    accent:"#7c3aed", a2:"#9333ea", a3:"#059669", text:"#0D0D0D",
    muted:"#6B6B6B", red:"#dc2626", yellow:"#b45309", green:"#059669",
  };

  const [region, setRegion] = React.useState("all");
  const [open, setOpen] = React.useState({general:true});
  const [showHistory, setShowHistory] = React.useState(false);

  const toggle = (k) => setOpen(o => ({...o, [k]: !o[k]}));
  const v = (k) => data[k] || "";
  const sv = (k, val) => set && set(k, val);

  // Multi-chip toggle: stored as comma-separated string
  const chips = (k) => v(k) ? v(k).split(",").map(s=>s.trim()).filter(Boolean) : [];
  const toggleChip = (k, chip) => {
    const cur = chips(k);
    sv(k, cur.includes(chip) ? cur.filter(c=>c!==chip).join(", ") : [...cur, chip].join(", "));
  };

  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,
    color:PC.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.78rem",
    marginTop:4,resize:"vertical",minHeight:60};

  const ChipRow = ({k, options, multi=true}) => (
    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
      {options.map(opt => {
        const active = multi ? chips(k).includes(opt) : v(k)===opt;
        return (
          <button key={opt} onClick={()=> multi ? toggleChip(k,opt) : sv(k, v(k)===opt?"":opt)}
            style={{padding:"5px 12px",borderRadius:99,border:`1px solid ${active?PC.accent:PC.border}`,
              background:active?`${PC.accent}18`:PC.s2,color:active?PC.accent:PC.muted,
              fontWeight:active?800:500,fontSize:"0.78rem",cursor:"pointer",transition:"all 0.15s"}}>
            {opt}
          </button>
        );
      })}
    </div>
  );

  const Section = ({id, icon, title, children, priority}) => {
    const isPriority = region!=="all" && (OBS_REGION_PRIORITY[region]||[]).includes(id);
    const isOpen = open[id];
    return (
      <div style={{background:PC.surface,border:`1px solid ${isPriority?PC.accent+"55":PC.border}`,
        borderRadius:12,marginBottom:8,overflow:"hidden",
        boxShadow:isPriority?"0 0 0 2px rgba(124,58,237,0.1)":"none"}}>
        <div onClick={()=>toggle(id)} style={{display:"flex",alignItems:"center",gap:10,
          padding:"12px 14px",cursor:"pointer",
          background:isOpen?`${PC.accent}06`:"transparent"}}>
          <span style={{fontSize:"1rem"}}>{icon}</span>
          <span style={{flex:1,fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{title}</span>
          {isPriority&&<span style={{fontSize:"0.75rem",fontWeight:800,color:PC.accent,
            padding:"2px 7px",borderRadius:99,background:`${PC.accent}15`,textTransform:"uppercase"}}>Priority</span>}
          <span style={{color:PC.muted,fontSize:"0.8rem"}}>{isOpen?"▲":"▼"}</span>
        </div>
        {isOpen&&<div style={{padding:"0 14px 14px"}}>{children}</div>}
      </div>
    );
  };

  const Field = ({label, children}) => (
    <div style={{marginBottom:12}}>
      <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",
        letterSpacing:"0.6px",marginBottom:2}}>{label}</div>
      {children}
    </div>
  );

  // Save snapshot (date-wise entry)
  const saveSnapshot = () => {
    const snaps = JSON.parse(v("obs_snapshots")||"[]");
    const snap = {date:new Date().toLocaleDateString("en-GB"),
      time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),
      savedAt:new Date().toISOString(),
      summary:v("obs_summary"),
      region,
      fields:Object.fromEntries(Object.keys(data).filter(k=>k.startsWith("obs_")&&k!=="obs_snapshots").map(k=>[k,data[k]]))
    };
    sv("obs_snapshots", JSON.stringify([snap,...snaps.slice(0,9)]));
    alert(`✅ Observation snapshot saved — ${snap.date} ${snap.time}`);
  };

  const snaps = JSON.parse(v("obs_snapshots")||"[]");

  return (
    <div>
      {/* Date / save row */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:"0.75rem",color:PC.muted,flex:1}}>📅 {new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</span>
        <button onClick={saveSnapshot} style={{padding:"6px 14px",borderRadius:99,border:"none",
          background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,
          fontSize:"0.75rem",cursor:"pointer"}}>💾 Save snapshot</button>
        {snaps.length>0&&<button onClick={()=>setShowHistory(h=>!h)} style={{padding:"6px 12px",
          borderRadius:99,border:`1px solid ${PC.border}`,background:PC.s2,color:PC.muted,
          fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>📂 {snaps.length} entries</button>}
      </div>

      {/* Region Chips */}
      <RegionChips
        regions={OBS_BODY_REGIONS.map(r=>{
          const filled=Object.keys(data).filter(k=>k.startsWith(`obs_${r.id==="all"?"":r.id+"_"}`)&&data[k]).length;
          return {key:r.id,label:r.label,filled};
        })}
        active={region}
        onSelect={setRegion}
      />

      {/* History panel */}
      {showHistory&&snaps.length>0&&(
        <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:12,padding:12,marginBottom:12}}>
          <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,marginBottom:8}}>Previous entries</div>
          {snaps.map((sn,i)=>(
            <div key={i} style={{padding:"7px 10px",background:PC.surface,borderRadius:8,marginBottom:5,
              border:`1px solid ${PC.border}`}}>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:PC.text}}>{sn.date} · {sn.time}</div>
              {sn.summary&&<div style={{fontSize:"0.75rem",color:PC.muted,marginTop:2,lineHeight:1.5}}>{sn.summary.slice(0,120)}{sn.summary.length>120?"…":""}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 1. General Observation */}
      <Section id="general" icon="👁️" title="1 · General Observation">
        <Field label="General Appearance">
          <ChipRow k="obs_appearance" options={["Healthy","Unwell","Fatigued","Distressed","Anxious"]}/>
        </Field>
        <Field label="Level of Consciousness">
          <ChipRow k="obs_consciousness" options={["Alert","Drowsy","Lethargic"]} multi={false}/>
        </Field>
        <Field label="Attitude / Cooperation">
          <ChipRow k="obs_attitude" options={["Cooperative","Partially Cooperative","Uncooperative"]} multi={false}/>
        </Field>
        <Field label="Body Build">
          <ChipRow k="obs_build" options={["Ectomorph","Mesomorph","Endomorph"]} multi={false}/>
        </Field>
        <Field label="Nutritional Status">
          <ChipRow k="obs_nutrition" options={["Normal","Underweight","Overweight","Obese"]} multi={false}/>
        </Field>
        <Field label="Notes">
          <textarea style={inp} value={v("obs_general_notes")} onChange={e=>sv("obs_general_notes",e.target.value)} placeholder="General observation notes…"/>
        </Field>
      </Section>

      {/* 2. Posture */}
      <Section id="posture_head" icon="🔡" title="2a · Head & Neck Posture">
        <ChipRow k="obs_posture_head" options={["Neutral","Forward Head","Head Tilt Right","Head Tilt Left","Head Rotation Right","Head Rotation Left"]}/>
      </Section>
      <Section id="posture_shoulders" icon="🫱" title="2b · Shoulders">
        <ChipRow k="obs_posture_shoulders" options={["Symmetrical","Right Elevated","Left Elevated","Rounded Shoulders","Protracted Shoulders"]}/>
      </Section>
      <Section id="posture_scapula" icon="🔹" title="2c · Scapula">
        <ChipRow k="obs_posture_scapula" options={["Normal","Winging Right","Winging Left","Bilateral Winging","Protracted","Retracted"]}/>
      </Section>
      <Section id="posture_thoracic" icon="🦴" title="2d · Thoracic Spine">
        <ChipRow k="obs_posture_thoracic" options={["Normal","Increased Kyphosis","Decreased Kyphosis"]}/>
      </Section>
      <Section id="posture_lumbar" icon="🦴" title="2e · Lumbar Spine">
        <ChipRow k="obs_posture_lumbar" options={["Normal","Increased Lordosis","Decreased Lordosis","Flat Back"]}/>
      </Section>
      <Section id="posture_pelvis" icon="🔸" title="2f · Pelvis">
        <ChipRow k="obs_posture_pelvis" options={["Neutral","Anterior Tilt","Posterior Tilt","Pelvic Obliquity"]}/>
      </Section>
      <Section id="posture_lower" icon="🦵" title="2g · Lower Limb Alignment">
        <ChipRow k="obs_posture_lower" options={["Normal","Genu Valgum","Genu Varum","Genu Recurvatum"]}/>
      </Section>
      <Section id="posture_feet" icon="🦶" title="2h · Feet">
        <ChipRow k="obs_posture_feet" options={["Neutral","Pes Planus","Pes Cavus","Pronation","Supination"]}/>
      </Section>
      <Section id="posture_notes" icon="📝" title="2 · Posture Notes">
        <textarea style={inp} value={v("obs_posture_notes")} onChange={e=>sv("obs_posture_notes",e.target.value)} placeholder="Manual posture observation notes…"/>
      </Section>

      {/* 3. Swelling */}
      <Section id="swelling" icon="💧" title="3 · Swelling / Edema">
        <Field label="Present?">
          <ChipRow k="obs_swelling_present" options={["Absent","Present"]} multi={false}/>
        </Field>
        {v("obs_swelling_present")==="Present"&&(
          <>
            <Field label="Severity"><ChipRow k="obs_swelling_severity" options={["Mild","Moderate","Severe"]} multi={false}/></Field>
            <Field label="Type"><ChipRow k="obs_swelling_type" options={["Pitting","Non-Pitting"]} multi={false}/></Field>
            <Field label="Location"><input style={{...inp,minHeight:0,resize:"none"}} value={v("obs_swelling_location")} onChange={e=>sv("obs_swelling_location",e.target.value)} placeholder="e.g. Medial knee, right ankle"/></Field>
            <Field label="Notes"><textarea style={inp} value={v("obs_swelling_notes")} onChange={e=>sv("obs_swelling_notes",e.target.value)} placeholder="Swelling notes…"/></Field>
          </>
        )}
      </Section>

      {/* 4. Skin */}
      <Section id="skin" icon="🩹" title="4 · Skin & Soft Tissue">
        <Field label="Findings (select all that apply)">
          <ChipRow k="obs_skin" options={["Normal","Redness","Bruising","Scar","Surgical Scar","Incision","Burn","Ulcer","Discoloration","Rash"]}/>
        </Field>
        {v("obs_skin")&&v("obs_skin")!=="Normal"&&(
          <>
            <Field label="Location"><input style={{...inp,minHeight:0,resize:"none"}} value={v("obs_skin_location")} onChange={e=>sv("obs_skin_location",e.target.value)} placeholder="e.g. Anterior knee, left forearm"/></Field>
            <Field label="Notes"><textarea style={inp} value={v("obs_skin_notes")} onChange={e=>sv("obs_skin_notes",e.target.value)} placeholder="Skin/soft tissue notes…"/></Field>
          </>
        )}
      </Section>

      {/* 5. Muscle Bulk */}
      <Section id="muscle_bulk" icon="💪" title="5 · Muscle Bulk">
        <Field label="Observation">
          <ChipRow k="obs_muscle_bulk" options={["Symmetrical","Atrophy","Hypertrophy"]}/>
        </Field>
        {(chips("obs_muscle_bulk").includes("Atrophy")||chips("obs_muscle_bulk").includes("Hypertrophy"))&&(
          <>
            <Field label="Common locations">
              <ChipRow k="obs_muscle_location" options={["Quadriceps","Hamstrings","Calf","Deltoid","Biceps","Triceps","Glutes","Peroneals","Tibialis Anterior","Rotator Cuff"]}/>
            </Field>
            <Field label="Notes"><textarea style={inp} value={v("obs_muscle_notes")} onChange={e=>sv("obs_muscle_notes",e.target.value)} placeholder="e.g. Moderate right quadriceps wasting compared to left…"/></Field>
          </>
        )}
      </Section>

      {/* 6. Deformity */}
      <Section id="deformity" icon="🔄" title="6 · Deformity">
        <Field label="Findings">
          <ChipRow k="obs_deformity" options={[
            "None",
            "Scoliosis","Kyphosis","Hyperlordosis","Flat Back","Dowager's Hump",
            "Forward Head Posture","Rounded Shoulders","Scapular Winging",
            "Genu Valgum","Genu Varum","Genu Recurvatum",
            "Coxa Vara","Coxa Valga","Leg Length Discrepancy",
            "Pes Planus","Pes Cavus","Equinus Foot","Calcaneal Valgus","Calcaneal Varus",
            "Hallux Valgus","Hammer Toe","Claw Toe","Mallet Toe",
            "Cubitus Valgus","Cubitus Varus",
            "Boutonnière Deformity","Swan Neck Deformity","Mallet Finger","Trigger Finger",
            "Dupuytren's Contracture","Heberden's Nodes","Bouchard's Nodes",
            "Contracture","Post-Fracture Deformity","Malalignment","Muscle Wasting / Atrophy","Joint Effusion / Swelling"
          ]}/>
        </Field>
        {v("obs_deformity")&&v("obs_deformity")!=="None"&&(
          <>
            <Field label="Location"><input style={{...inp,minHeight:0,resize:"none"}} value={v("obs_deformity_location")} onChange={e=>sv("obs_deformity_location",e.target.value)} placeholder="e.g. Right hip, bilateral knees"/></Field>
            <Field label="Notes"><textarea style={inp} value={v("obs_deformity_notes")} onChange={e=>sv("obs_deformity_notes",e.target.value)} placeholder="Deformity notes…"/></Field>
          </>
        )}
      </Section>

      {/* 7. Assistive Devices */}
      <Section id="assistive" icon="🦽" title="7 · Assistive Devices">
        <ChipRow k="obs_assistive" options={["None","Walking Stick","Cane","Crutch","Walker","Wheelchair","Orthosis","Prosthesis"]}/>
        <Field label="Additional Notes">
          <textarea style={{...inp,minHeight:44}} value={v("obs_assistive_notes")} onChange={e=>sv("obs_assistive_notes",e.target.value)} placeholder="e.g. KAFO on right, using axillary crutches for non-weight bearing"/>
        </Field>
      </Section>

      {/* 8. Summary */}
      <Section id="summary" icon="📋" title="8 · Observation Summary">
        <textarea style={{...inp,minHeight:100}} value={v("obs_summary")} onChange={e=>sv("obs_summary",e.target.value)}
          placeholder="Patient appears alert and cooperative. Mild right shoulder elevation noted with forward head posture. Moderate quadriceps wasting on the right side. Mild edema around right knee. Healed surgical scar present over anterior knee."/>
        <div style={{fontSize:"0.8rem",color:PC.muted,marginTop:4}}>Summarise all visual inspection findings in clinical language. This populates the SOAP Objective section.</div>
      </Section>
    </div>
  );
}


// DashboardModules.jsx — Posture defect guide, Home module, Therapist dashboard
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { getC } from "./utils.jsx";
import { makePDFPage, downloadPDFFromHTML } from "./SubjectiveObjective.jsx";
const POSTURE_DEFECTS = {
  forward_head: {
    id:"forward_head", icon:"🫀", label:"Forward Head Posture", region:"Cervical",
    view:["anterior","lateral"],
    description:"Ear positioned anterior to the acromion process. Each 2.5cm of forward translation adds ~2.7kg per 2.5cm of estimated cervical extensor load (proxy model — confirm clinically).",
    tight_muscles:["Upper trapezius","SCM","Suboccipitals","Scalenes","Pec minor"],
    weak_muscles:["Deep neck flexors (DNF)","Lower trapezius","Serratus anterior","Rhomboids"],
    kinetic_chain:"Forward head → cervical lordosis → thoracic kyphosis → shoulder protraction → reduced lung capacity",
    exercises:["Chin tucks x15 3×","Wall angels x12 3×","DNF activation","Pec minor stretch"]
  },
  rounded_shoulders: {
    id:"rounded_shoulders", icon:"🔄", label:"Rounded/Protracted Shoulders", region:"Thoracic/Shoulder",
    view:["anterior","lateral","posterior"],
    description:"Anterior displacement of the humeral head with scapular protraction and internal rotation.",
    tight_muscles:["Pec major","Pec minor","Anterior deltoid","Subscapularis","Upper trapezius"],
    weak_muscles:["Lower trapezius","Serratus anterior","Rhomboids","Posterior rotator cuff"],
    kinetic_chain:"Protracted scapula → reduced subacromial space → impingement risk → compensatory cervical extension",
    exercises:["Band pull-apart x20","Face pulls x15","Pec doorway stretch","Scapular retraction holds"]
  },
  thoracic_kyphosis: {
    id:"thoracic_kyphosis", icon:"🪃", label:"Increased Thoracic Kyphosis", region:"Thoracic",
    view:["lateral","posterior"],
    description:"Excessive posterior convexity of the thoracic spine (>40° Cobb angle). May reduce respiratory capacity.",
    tight_muscles:["Pec major/minor","Anterior intercostals","Hip flexors"],
    weak_muscles:["Thoracic extensors","Lower trapezius","Gluteus maximus"],
    kinetic_chain:"Thoracic kyphosis → forward head → UCS → reduced hip extension → LCS compensations",
    exercises:["Thoracic extension over foam roller","T-spine rotation","Prone Y-T-W","Back extension"]
  },
  lumbar_hyperlordosis: {
    id:"lumbar_hyperlordosis", icon:"🌊", label:"Lumbar Hyperlordosis", region:"Lumbar",
    view:["lateral"],
    description:"Excessive anterior lumbar curve with anterior pelvic tilt. Increases facet joint loading.",
    tight_muscles:["Hip flexors (iliopsoas, rectus femoris)","TFL","Lumbar erectors","QL"],
    weak_muscles:["Gluteus maximus","Hamstrings","Transversus abdominis","Rectus abdominis"],
    kinetic_chain:"Anterior pelvic tilt → hip flexor tightness → glute inhibition → hamstring overload → posterior knee pain",
    exercises:["Hip flexor couch stretch","Glute bridges 3×15","Dead bug","TA activation"]
  },
  anterior_pelvic_tilt: {
    id:"anterior_pelvic_tilt", icon:"⬇", label:"Anterior Pelvic Tilt", region:"Lumbar/Pelvis",
    view:["lateral"],
    description:"ASIS positioned anterior and inferior to PSIS. Often co-exists with lumbar hyperlordosis.",
    tight_muscles:["Iliopsoas","Rectus femoris","TFL","Lumbar erectors"],
    weak_muscles:["Gluteus maximus","Hamstrings","TA","Internal obliques"],
    kinetic_chain:"APT → hip flexor tightness → glute inhibition → lumbar overload → disc stress at L4-S1",
    exercises:["Pelvic tilts","Couch stretch","Glute activation","Posterior pelvic tilt cues"]
  },
  posterior_pelvic_tilt: {
    id:"posterior_pelvic_tilt", icon:"⬆", label:"Posterior Pelvic Tilt", region:"Lumbar/Pelvis",
    view:["lateral"],
    description:"PSIS positioned inferior to ASIS. Flattens lumbar lordosis, often associated with prolonged sitting.",
    tight_muscles:["Hamstrings","Gluteus maximus","Rectus abdominis"],
    weak_muscles:["Hip flexors","Lumbar extensors","TFL"],
    kinetic_chain:"PPT → lumbar flexion bias → disc posterior loading → hamstring overuse",
    exercises:["Hip flexor stretching","Lumbar extension exercises","Prone hip extension","Cat-cow"]
  },
  lateral_pelvic_tilt: {
    id:"lateral_pelvic_tilt", icon:"↔", label:"Lateral Pelvic Tilt", region:"Lumbar/Pelvis",
    view:["anterior","posterior"],
    description:"Unilateral elevation of the iliac crest. May indicate leg length discrepancy or hip abductor weakness.",
    tight_muscles:["Ipsilateral QL","Ipsilateral TFL","Ipsilateral hip adductors"],
    weak_muscles:["Contralateral gluteus medius","Contralateral QL"],
    kinetic_chain:"Lateral pelvic tilt → scoliotic compensation → contralateral shoulder elevation → cervical lateral flexion",
    exercises:["Side-lying hip abduction","Clamshells","Standing hip abduction","QL stretch"]
  },
  genu_valgum: {
    id:"genu_valgum", icon:"🦵", label:"Knee Valgus Tendency (Observation — clinical assessment required)", region:"Knee",
    view:["anterior","posterior"],
    requiresDedicatedLandmarks: true,
    estimatedOnly: true,
    description:"OBSERVATION: Static medial knee alignment tendency observed. Cannot confirm Genu Valgum from photograph alone — single-leg squat and clinical assessment required. May be associated with medial compartment and patellofemoral loading if confirmed.",
    tight_muscles:["TFL","IT band","Hip adductors","Medial hamstrings"],
    weak_muscles:["Gluteus medius","Gluteus maximus","VMO","Hip external rotators"],
    kinetic_chain:"Knee medial tendency → hip IR → PFPS risk → medial ankle pronation → plantar fascia overload (confirm with clinical assessment)",
    exercises:["Clamshells","Monster walks","Single-leg squat with knee tracking","VMO terminal extensions"]
  },
  genu_varum: {
    id:"genu_varum", icon:"🦴", label:"Knee Varus Tendency (Observation — clinical assessment required)", region:"Knee",
    view:["anterior","posterior"],
    requiresDedicatedLandmarks: true,
    estimatedOnly: true,
    description:"OBSERVATION: Static lateral knee alignment tendency observed. Cannot confirm Genu Varum from photograph alone — clinical weight-bearing assessment required. May be associated with lateral compartment loading if confirmed.",
    tight_muscles:["IT band","Biceps femoris","Hip ER","Lateral gastrocnemius"],
    weak_muscles:["Hip adductors","VMO","Medial gastrocnemius"],
    kinetic_chain:"Knee lateral tendency → lateral knee overload → IT band syndrome → supinated foot posture (confirm with clinical assessment)",
    exercises:["IT band foam rolling","Hip adductor strengthening","Lateral step-downs","Arch support"]
  },
  foot_pronation: {
    id:"foot_pronation", icon:"🦶", label:"Foot Overpronation/Flat Arch", region:"Foot/Ankle",
    view:["anterior","posterior"],
    description:"Medial arch collapse with calcaneal eversion. The kinetic chain starting point for many lower limb issues.",
    tight_muscles:["Gastrocnemius","Soleus","Peroneals","Plantar fascia"],
    weak_muscles:["Tibialis posterior","FHL","Intrinsic foot muscles","Gluteus medius"],
    kinetic_chain:"Pronation → tibial IR → knee medial tendency (possible) → hip IR → PFPS risk → LCS pattern characteristics (clinical assessment required to confirm each link)",
    exercises:["Short foot exercise","Calf raises","Tibialis posterior strengthening","Intrinsic foot doming"]
  },
  foot_supination: {
    id:"foot_supination", icon:"🔺", label:"Foot Supination/High Arch", region:"Foot/Ankle",
    view:["anterior","posterior"],
    description:"Elevated medial arch with reduced shock absorption. Associated with lateral ankle instability.",
    tight_muscles:["IT band","Peroneals","Plantar fascia","Gastroc lateral head"],
    weak_muscles:["Peroneals (with instability)","Intrinsic foot muscles"],
    kinetic_chain:"Supination → lateral ankle instability → lateral knee overload → genu varum compensation",
    exercises:["Peroneal strengthening","Single-leg balance","Lateral band walks","Arch mobilisation"]
  },
  scoliosis: {
    id:"scoliosis", icon:"〰", label:"Lateral Spinal Curvature Tendency (clinical assessment required)", region:"Thoracic/Lumbar",
    view:["posterior"],
    description:"Lateral deviation of the spine with rotational component. Refer for Cobb angle measurement if suspected structural.",
    tight_muscles:["Ipsilateral concave paraspinals","Ipsilateral QL","Ipsilateral hip musculature"],
    weak_muscles:["Contralateral paraspinals","Convex-side core stabilisers"],
    kinetic_chain:"Scoliosis → rib cage rotation → shoulder height asymmetry → pelvic obliquity → leg length inequality",
    exercises:["Schroth breathing","Concave-side stretch","Convex-side strengthening","Pilates side-lying"]
  },
  head_tilt: {
    id:"head_tilt", icon:"↙", label:"Lateral Head Tilt", region:"Cervical",
    view:["anterior","posterior"],
    description:"Ipsilateral ear approaches ipsilateral shoulder. May indicate upper trap tightness or C-spine dysfunction.",
    tight_muscles:["Ipsilateral upper trapezius","Ipsilateral SCM","Ipsilateral scalenes","Ipsilateral levator scapulae"],
    weak_muscles:["Contralateral lateral neck flexors","Contralateral upper trapezius"],
    kinetic_chain:"Head tilt → cervical lateral flexion → ipsilateral shoulder elevation → compensatory thoracic curve",
    exercises:["Contralateral cervical lateral flexion stretch","Upper trap SMR","Levator scapulae stretch"]
  },
  scapular_winging: {
    id:"scapular_winging", icon:"🪶", label:"Scapular Winging", region:"Thoracic/Shoulder",
    view:["posterior"],
    description:"Medial border or inferior angle of scapula lifts from thoracic wall. Serratus anterior or trapezius dysfunction.",
    tight_muscles:["Pec minor","Pec major","Short head biceps"],
    weak_muscles:["Serratus anterior","Lower trapezius","Rhomboids"],
    kinetic_chain:"Scapular winging → reduced force couple → rotator cuff overload → impingement → biceps tendinopathy",
    exercises:["Serratus push-up plus","Wall slides","Lower trap Y raises","Scapular protraction resistance"]
  },
};

// ─── SEVERITY COLOUR MAPS ────────────────────────────────────────────────────
const SEVERITY_COLOR = { mild:"#ffb300", moderate:"#ff6b35", severe:"#ff4d6d" };
const SEVERITY_BG    = { mild:"rgba(255,179,0,0.1)", moderate:"rgba(255,107,53,0.1)", severe:"rgba(255,77,109,0.1)" };

// ─── POSTURE DEFECT DETAIL MODAL ─────────────────────────────────────────────
function PostureDefectDetail({ defectId, onClose }) {
  const d = POSTURE_DEFECTS[defectId];
  if (!d) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:900,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:"100%",maxWidth:560,background:"#ffffff",borderRadius:"16px 16px 0 0",border:"1px solid #E0E0E2",padding:"20px 18px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        {/* Handle bar */}
        <div style={{width:36,height:4,background:"#2a3f58",borderRadius:2,margin:"0 auto 16px"}}/>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:"1.8rem"}}>{d.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:"#0D0D0D"}}>{d.label}</div>
            <span style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:6,background:"rgba(0,229,255,0.12)",color:"#00e5ff",fontWeight:700}}>{d.region}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #E0E0E2",borderRadius:8,color:"#6B6B6B",cursor:"pointer",padding:"5px 10px",fontSize:"0.75rem"}}>✕</button>
        </div>
        {/* Description */}
        <div style={{padding:"10px 13px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.15)",borderRadius:10,fontSize:"0.76rem",color:"#a0c8e8",lineHeight:1.6,marginBottom:14}}>
          {d.description}
        </div>
        {/* Muscles */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:"rgba(255,77,109,0.06)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🔴 Tight / Overactive</div>
            {d.tight_muscles.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"#0D0D0D",padding:"2px 0",borderBottom:"1px solid rgba(255,77,109,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
          <div style={{background:"rgba(0,201,122,0.06)",border:"1px solid rgba(0,201,122,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🟢 Weak / Inhibited</div>
            {d.weak_muscles.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"#0D0D0D",padding:"2px 0",borderBottom:"1px solid rgba(0,201,122,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
        </div>
        {/* Kinetic chain */}
        <div style={{background:"rgba(127,90,240,0.07)",border:"1px solid rgba(127,90,240,0.2)",borderRadius:10,padding:"10px 13px",marginBottom:14}}>
          <div style={{fontSize:"0.8rem",fontWeight:800,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>🔗 Kinetic Chain</div>
          <div style={{fontSize:"0.82rem",color:"#0D0D0D",lineHeight:1.6,fontStyle:"italic"}}>{d.kinetic_chain}</div>
        </div>
        {/* Exercises */}
        {d.exercises?.length > 0 && (
          <div>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#00e5ff",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>💪 Corrective Exercises</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {d.exercises.map((ex,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:8,alignItems:"center"}}>
                  <span style={{color:"#00e5ff",fontWeight:800,fontSize:"0.8rem",flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:"0.82rem",color:"#0D0D0D"}}>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostureDefectModule() {
  const [selectedDefects, setSelectedDefects] = useState([]);
  const [defectSeverity, setDefectSeverity]   = useState({});
  const [openDefect, setOpenDefect]           = useState(null);
  const [regionFilter, setRegionFilter]       = useState("All");
  const [patientName, setPatientName]         = useState("");
  const [clinicianName, setClinicianName]     = useState("");
  const [showExport, setShowExport]           = useState(false);
  const exportPDF = useCallback(async ({ patientName, clinicianName, selectedDefects, severity, date }) => {
    const severityLabel = { mild: "Mild", moderate: "Moderate", severe: "Severe" };
    const findingsHTML = selectedDefects.map(d => {
      const sev = severity?.[d.id] || "moderate";
      const sevColor = sev === "severe" ? "badge-red" : sev === "mild" ? "badge-green" : "badge-amber";
      return `
        <div class="section-box no-break" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="font-size:12px">${d.name || d.id}</strong>
            <span class="badge ${sevColor}">${severityLabel[sev] || sev}</span>
          </div>
          ${d.region ? `<div><span class="badge badge-blue">${d.region}</span></div>` : ""}
          ${d.description ? `<p style="margin:6px 0;color:#374151">${d.description}</p>` : ""}
          ${d.tight_muscles?.length ? `<div style="margin-top:6px"><strong>Tight:</strong> ${d.tight_muscles.join(", ")}</div>` : ""}
          ${d.weak_muscles?.length ? `<div><strong>Weak:</strong> ${d.weak_muscles.join(", ")}</div>` : ""}
          ${d.kinetic_chain ? `<div style="margin-top:4px;color:#6d28d9;font-style:italic">Chain: ${d.kinetic_chain}</div>` : ""}
        </div>`;
    }).join("");

    const bodyHTML = `
      <div class="disclaimer">⚠ Manual observational assessment. For clinical use only. Not a substitute for comprehensive evaluation.</div>
      <div class="info-grid">
        <div class="info-box"><div class="info-label">Patient</div><div class="info-value">${patientName || "—"}</div></div>
        <div class="info-box"><div class="info-label">Clinician</div><div class="info-value">${clinicianName || "—"}</div></div>
        <div class="info-box"><div class="info-label">Date</div><div class="info-value">${date}</div></div>
        <div class="info-box"><div class="info-label">Findings</div><div class="info-value">${selectedDefects.length} defect${selectedDefects.length !== 1 ? "s" : ""}</div></div>
      </div>
      <h2>Postural Findings</h2>
      ${findingsHTML}
      <div class="sig-row">
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Clinician Signature</div></div>
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Date</div></div>
      </div>`;

    const metaRight = `<strong>Patient:</strong> ${patientName || "—"}<br/><strong>Clinician:</strong> ${clinicianName || "—"}<br/><strong>Date:</strong> ${date}`;
    const html = makePDFPage("Postural Assessment Report", metaRight, bodyHTML);
    await downloadPDFFromHTML(html, `postural-report-${(patientName || "patient").replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }, []);

  const regions = ["All", ...Array.from(new Set(Object.values(POSTURE_DEFECTS).map(d => d.region)))];
  const filtered = Object.values(POSTURE_DEFECTS).filter(d => regionFilter === "All" || d.region === regionFilter);

  const inputStyle = {
    width:"100%", background:"#FFFFFF", border:"1px solid #E0E0E2",
    borderRadius:8, color:"#0D0D0D", fontFamily:"inherit",
    outline:"none", padding:"8px 10px", fontSize:"0.78rem",
  };

  const PLAN_VIEWS = [
    {key:"anterior",  label:"Anterior",   icon:"⬆", tip:"Facing camera — head, shoulders, pelvis, knees, feet"},
    {key:"posterior", label:"Posterior",  icon:"⬇", tip:"Back to camera — scapulae, spine alignment, calcanei"},
    {key:"lateral",   label:"L Lateral",  icon:"◀", tip:"Left side — ear, shoulder, hip, knee, ankle plumb line"},
    {key:"right_lateral",label:"R Lateral",icon:"▶",tip:"Right side — same as left for asymmetry comparison"},
  ];

  // Group selected defects by their relevant views
  const defectsByView = PLAN_VIEWS.reduce((acc, v) => {
    acc[v.key] = selectedDefects.filter(id => {
      const d = POSTURE_DEFECTS[id];
      return d && (d.view.includes(v.key) || (v.key==="right_lateral" && d.view.includes("lateral")));
    });
    return acc;
  }, {});

  return (
    <div>
      {/* ── STEP 1: View guidance ── */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:9}}>📋 Assessment Views — Position patient accordingly</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {PLAN_VIEWS.map(v => (
            <div key={v.key} style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.14)",borderRadius:10,padding:"9px 11px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:"1rem"}}>{v.icon}</span>
                <span style={{fontSize:"0.82rem",fontWeight:800,color:"#00e5ff"}}>{v.label}</span>
                {defectsByView[v.key]?.length > 0 && (
                  <span style={{marginLeft:"auto",padding:"1px 6px",borderRadius:6,background:"rgba(0,229,255,0.15)",color:"#00e5ff",fontSize:"0.56rem",fontWeight:800}}>{defectsByView[v.key].length}</span>
                )}
              </div>
              <div style={{fontSize:"0.73rem",color:"#6B6B6B",lineHeight:1.4}}>{v.tip}</div>
              {defectsByView[v.key]?.length > 0 && (
                <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:3}}>
                  {defectsByView[v.key].map(id => (
                    <span key={id} style={{fontSize:"0.56rem",padding:"1px 5px",borderRadius:5,background:"rgba(0,229,255,0.1)",color:"#00e5ff",border:"1px solid rgba(0,229,255,0.2)"}}>
                      {POSTURE_DEFECTS[id]?.icon} {POSTURE_DEFECTS[id]?.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 2: Defect selector ── */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
          🔍 Select Observed Defects
          {selectedDefects.length > 0 && <span style={{marginLeft:8,padding:"1px 7px",borderRadius:8,background:"rgba(255,77,109,0.15)",color:"#ff4d6d",fontSize:"0.78rem",fontWeight:800}}>{selectedDefects.length} selected</span>}
        </div>

        {/* Region filter */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:9}}>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              style={{padding:"3px 9px",borderRadius:8,fontSize:"0.8rem",fontWeight:700,border:`1px solid ${regionFilter===r?"rgba(0,229,255,0.5)":"#1a2d45"}`,background:regionFilter===r?"rgba(0,229,255,0.12)":"transparent",color:regionFilter===r?"#00e5ff":"#6b8399",cursor:"pointer"}}>
              {r}
            </button>
          ))}
        </div>

        {/* Defect grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:5}}>
          {filtered.map(d => {
            const sel = selectedDefects.includes(d.id);
            return (
              <button key={d.id} onClick={() => setSelectedDefects(sel ? selectedDefects.filter(s => s !== d.id) : [...selectedDefects, d.id])}
                style={{padding:"8px 10px",borderRadius:9,fontSize:"0.78rem",fontWeight:sel?700:500,border:`1px solid ${sel?"rgba(255,77,109,0.45)":"#1a2d45"}`,background:sel?"rgba(255,77,109,0.1)":"rgba(19,28,40,0.7)",color:sel?"#ff4d6d":"#94a3b8",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"flex-start",gap:6}}>
                <span style={{fontSize:"1rem",flexShrink:0}}>{d.icon}</span>
                <span style={{flex:1,lineHeight:1.3}}>{d.label}</span>
                {sel && <span style={{color:"#ff4d6d",fontSize:"0.8rem",flexShrink:0}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 3: Selected findings with severity + tap-to-expand ── */}
      {selectedDefects.length > 0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
            📌 Findings — tap card to view full clinical detail
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {selectedDefects.map(id => {
              const d = POSTURE_DEFECTS[id];
              if (!d) return null;
              const sev = defectSeverity[id] || "mild";
              const col = SEVERITY_COLOR[sev];
              return (
                <div key={id} style={{background:"#ffffff",border:`1px solid ${col}35`,borderRadius:11,overflow:"hidden"}}>
                  {/* Card header — clickable */}
                  <div onClick={() => setOpenDefect(id)} style={{padding:"10px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:"1.1rem"}}>{d.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.76rem",fontWeight:700,color:"#0D0D0D",lineHeight:1.3}}>{d.label}</div>
                      <div style={{fontSize:"0.8rem",color:"#6B6B6B",marginTop:1}}>{d.region}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <span style={{fontSize:"0.82rem",color:"#00e5ff",fontWeight:700}}>📋 Detail →</span>
                      <button onClick={e=>{e.stopPropagation();setSelectedDefects(p=>p.filter(s=>s!==id));}} style={{background:"none",border:"1px solid #E0E0E2",borderRadius:5,color:"#6B6B6B",cursor:"pointer",fontSize:"0.8rem",padding:"1px 6px",lineHeight:1.4}}>✕</button>
                    </div>
                  </div>

                  {/* Severity selector */}
                  <div style={{padding:"0 13px 10px",display:"flex",gap:4}}>
                    {["mild","moderate","severe"].map(s => (
                      <button key={s} onClick={() => setDefectSeverity(p => ({...p,[id]:s}))}
                        style={{flex:1,padding:"5px 3px",borderRadius:7,fontSize:"0.8rem",fontWeight:sev===s?800:500,border:`1px solid ${sev===s?SEVERITY_COLOR[s]+"80":"#1a2d45"}`,background:sev===s?SEVERITY_BG[s]:"transparent",color:sev===s?SEVERITY_COLOR[s]:"#6b8399",cursor:"pointer",textTransform:"capitalize"}}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Quick summary row */}
                  <div style={{padding:"8px 13px",background:"rgba(6,9,15,0.5)",borderTop:"1px solid #E0E0E2",display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔴 Tight</div>
                      <div style={{fontSize:"0.82rem",color:"#0D0D0D",lineHeight:1.4}}>{d.tight_muscles.slice(0,2).join(", ")}{d.tight_muscles.length>2?` +${d.tight_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🟢 Weak</div>
                      <div style={{fontSize:"0.82rem",color:"#0D0D0D",lineHeight:1.4}}>{d.weak_muscles.slice(0,2).join(", ")}{d.weak_muscles.length>2?` +${d.weak_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔗 Chain</div>
                      <div style={{fontSize:"0.82rem",color:"#0D0D0D",lineHeight:1.4,fontStyle:"italic"}}>{d.kinetic_chain.split("→")[0].trim()} →…</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 4: PDF Export ── */}
      {selectedDefects.length > 0 && (
        <div style={{marginBottom:12}}>
          {!showExport ? (
            <button onClick={() => setShowExport(true)}
              style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,rgba(0,201,122,0.18),rgba(0,229,255,0.1))",border:"1px solid rgba(0,201,122,0.35)",borderRadius:10,color:"#00c97a",fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
              📄 Export PDF Report ({selectedDefects.length} finding{selectedDefects.length!==1?"s":""})
            </button>
          ) : (
            <div style={{background:"#ffffff",border:"1px solid rgba(0,201,122,0.3)",borderRadius:12,padding:"13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:"0.82rem",fontWeight:800,color:"#00c97a"}}>📄 PDF Report Details</div>
                <button onClick={() => setShowExport(false)} style={{background:"none",border:"1px solid #E0E0E2",borderRadius:6,color:"#6B6B6B",cursor:"pointer",padding:"3px 8px",fontSize:"0.75rem"}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <label style={{fontSize:"0.8rem",fontWeight:700,color:"#6B6B6B",display:"block",marginBottom:4}}>Patient Name</label>
                  <input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="Patient name" style={inputStyle}/>
                </div>
                <div>
                  <label style={{fontSize:"0.8rem",fontWeight:700,color:"#6B6B6B",display:"block",marginBottom:4}}>Clinician</label>
                  <input value={clinicianName} onChange={e=>setClinicianName(e.target.value)} placeholder="Your name" style={inputStyle}/>
                </div>
              </div>
              <button onClick={() => exportPDF({patientName,clinicianName,selectedDefects,severity:defectSeverity,measurements:null,captures:{},date:new Date().toLocaleDateString('en-AU',{day:'2-digit',month:'long',year:'numeric'})})}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#00c97a,#00e5ff)",border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:"0.8rem",cursor:"pointer"}}>
                🖨 Generate & Print PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Defect detail modal */}
      {openDefect && <PostureDefectDetail defectId={openDefect} onClose={() => setOpenDefect(null)}/>}

      <div style={{padding:"7px 11px",background:"#FFFFFF",border:"1px solid #E0E0E2",borderRadius:8,fontSize:"0.8rem",color:"#6B6B6B",lineHeight:1.5}}>
        ⚠ Manual observational assessment. Select all defects observed across each view. Tap any finding card for full clinical detail, muscles, kinetic chain, and exercise programme.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME MODULE — App Introduction & Feature Overview
// ═══════════════════════════════════════════════════════════════════════════
function HomeModule({ onNav }) {
  const PC = getC();
  const features = [
    { icon:"📝", title:"Subjective Assessment", desc:"Comprehensive history-taking with VAS pain scale, red flag screening, 24hr behaviour patterns, and patient goals.", nav:"subjective", color:"#7c3aed" },
    { icon:"🖐️", title:"Palpation", desc:"Systematic tissue assessment with tenderness grading, quality descriptors, and clinical significance.", nav:"palpation", color:"#9333ea" },
    { icon:"🧍", title:"Posture Screening", desc:"Camera-assisted posture screening with AI landmark detection, 30+ posture observations, movement-pattern mapping, and PDF export. Education only — not a diagnosis.", nav:"posture", color:"#7c3aed" },
    { icon:"📐", title:"Range of Motion", desc:"Full-body ROM assessment with bilateral comparison, normal values, end-feel grading, and clinical interpretation.", nav:"rom", color:"#9333ea" },
    { icon:"💪", title:"Muscle Strength (MMT)", desc:"Oxford Scale manual muscle testing across all major muscle groups with clinical grading.", nav:"mmt", color:"#7c3aed" },
    { icon:"🔬", title:"100+ Special Tests", desc:"Evidence-based special tests for cervical, shoulder, elbow, wrist, hip, knee, and ankle with sensitivity/specificity data.", nav:"special", color:"#9333ea" },
    { icon:"⚡", title:"Neurological Assessment", desc:"Dermatomes, myotomes, reflexes, neural tension tests, and red flag neurological screening.", nav:"neuro", color:"#7c3aed" },
    { icon:"🚶", title:"Gait Analysis", desc:"Observational gait analysis across stance, swing, and double support phases with clinical correlations.", nav:"gait", color:"#9333ea" },
    { icon:"🧠", title:"CPA Assessment", desc:"Compensation Pattern Analysis — functional muscle testing to identify inhibitor-facilitator relationships across regions.", nav:"nkt", color:"#7c3aed" },
    { icon:"⛓️", title:"Kinetic Chain", desc:"Joint-by-joint analysis of the kinetic chain from foot to cervical spine.", nav:"kinetic", color:"#9333ea" },
    { icon:"💊", title:"Treatment Prescription", desc:"Evidence-based exercise programming, HEP generation, treatment technique logging, and session records.", nav:"exercise", color:"#7c3aed" },
    { icon:"🤖", title:"SOAP Notes + AI", desc:"AI-powered SOAP note generation from your assessment data using Groq AI.", nav:"soap", color:"#9333ea" },
  ];

  return (
    <div style={{maxWidth:900, margin:"0 auto"}}>
      {/* Hero */}
      <div style={{
        background:`linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)`,
        borderRadius:20, padding:"40px 32px", marginBottom:32, position:"relative", overflow:"hidden",
        boxShadow:"0 8px 40px rgba(124,58,237,0.25)"
      }}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,background:"rgba(255,255,255,0.06)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",bottom:-60,left:-20,width:160,height:160,background:"rgba(255,255,255,0.04)",borderRadius:"50%"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:"2.4rem",marginBottom:8}}>🩺</div>
          <h1 style={{fontSize:"clamp(1.4rem,4vw,2rem)",fontWeight:900,color:"#fff",margin:"0 0 10px",letterSpacing:"-0.5px",lineHeight:1.1}}>
            PhysioMind Pro
          </h1>
          <p style={{fontSize:"clamp(0.85rem,2vw,1rem)",color:"rgba(255,255,255,0.85)",margin:"0 0 24px",lineHeight:1.6,maxWidth:520}}>
            A posture screening & education platform. AI-assisted posture screening, notes, and organisation tools — all in one place. For education and screening only; not a medical device and not a substitute for professional care.
          </p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={()=>onNav("subjective")} style={{padding:"12px 22px",background:"#fff",border:"none",borderRadius:12,color:"#7c3aed",fontWeight:800,fontSize:"0.88rem",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
              Start Assessment →
            </button>
            <button onClick={()=>onNav("dashboard")} style={{padding:"12px 22px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:12,color:"#fff",fontWeight:700,fontSize:"0.88rem",cursor:"pointer"}}>
              View Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:32}}>
        {[
          {num:"100+",label:"Special Tests",icon:"🔬"},
          {num:"30+",label:"Postural Defects",icon:"🧍"},
          {num:"AI",label:"SOAP Generation",icon:"🤖"},
          {num:"PDF",label:"Report Export",icon:"📄"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #E0E0E2",borderRadius:14,padding:"18px 16px",textAlign:"center",boxShadow:"0 2px 12px rgba(124,58,237,0.07)"}}>
            <div style={{fontSize:"1.5rem",marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:"1.6rem",fontWeight:900,color:"#7c3aed",lineHeight:1}}>{s.num}</div>
            <div style={{fontSize:"0.75rem",fontWeight:700,color:"#6B6B6B",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,color:"#0D0D0D",margin:"0 0 6px",letterSpacing:"-0.3px"}}>Clinical Features</h2>
        <p style={{fontSize:"0.82rem",color:"#6B6B6B",margin:"0 0 20px"}}>Tap any feature to navigate directly to that assessment tool.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
          {features.map((f,i)=>(
            <button key={i} onClick={()=>onNav(f.nav)} style={{
              background:"#fff",border:`1px solid #E0E0E2`,borderRadius:14,padding:"18px 16px",
              textAlign:"left",cursor:"pointer",transition:"all 0.18s",
              boxShadow:"0 2px 10px transparent",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color;e.currentTarget.style.boxShadow=`0 4px 20px rgba(124,58,237,0.14)`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#E0E0E2";e.currentTarget.style.boxShadow="0 2px 10px transparent";}}
            >
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:36,height:36,background:`${f.color}14`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>
                  {f.icon}
                </div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:"#0D0D0D",lineHeight:1.2}}>{f.title}</div>
              </div>
              <div style={{fontSize:"0.75rem",color:"#6B6B6B",lineHeight:1.55}}>{f.desc}</div>
              <div style={{marginTop:10,fontSize:"0.78rem",fontWeight:700,color:f.color}}>Open →</div>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow guide */}
      <div style={{background:"#FFFFFF",border:"1px solid #E0E0E2",borderRadius:16,padding:"22px 20px",marginTop:24}}>
        <h3 style={{fontSize:"0.88rem",fontWeight:800,color:"#7c3aed",margin:"0 0 14px",letterSpacing:"-0.2px"}}>📋 Recommended Assessment Workflow</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {[
            "1. Subjective","2. Palpation","3. Posture","4. ROM","5. MMT",
            "6. Special Tests","7. Neurological","8. Gait","9. Kinetic Chain",
            "10. Treatment Plan","11. SOAP + AI"
          ].map((step,i)=>(
            <div key={i} style={{
              padding:"5px 12px",background:"#fff",border:"1px solid #E0E0E2",
              borderRadius:8,fontSize:"0.82rem",fontWeight:600,color:"#0D0D0D"
            }}>{step}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THERAPIST DASHBOARD MODULE
// ═══════════════════════════════════════════════════════════════════════════
function TherapistDashboardModule({ patients, data, onNav, taskDB=[], onCompleteTask, onDismissTask, onAddTask, onProfile, onQuickStart, currentUser, onSignOut }) {
  const { useState, useEffect, useMemo, useCallback } = React;
  const [activeTab,   setActiveTab]   = useState("pending");
  const [scheduleTab, setScheduleTab] = useState("all");
  const [mounted,     setMounted]     = useState(false);
  const [completing,  setCompleting]  = useState(null); // taskId being animated
  const [expanded,    setExpanded]    = useState(null); // expanded task id

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  // ── AUTO-GENERATE TASKS FROM CLINICAL DATA ─────────────────────────────────
  useEffect(() => {
    if (!onAddTask || !data) return;
    const d   = data || {};
    const pt  = d["dem_name"] || "Current patient";
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString("en-GB");
    const sessions = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
    const hasROM   = Object.keys(d).some(k => k.startsWith("rom_") && d[k]);
    const hasMMT   = Object.keys(d).some(k => k.startsWith("mmt_") && d[k]);
    const hasSOAP  = !!(d.tx_techniques || sessions.length > 0);
    const hasCC    = !!d.cc_main;
    const hasGait  = !!(d.ag_antalgic || d.gait_pattern || d.g_rom_findings);
    const hasOM    = !!(d.om_psfs1 || d.om_odi_score || d.om_dash_score);
    const pendingSession = sessions.length > 0 && !sessions[sessions.length-1]?.vasEnd;
    const rfMyelopathy  = !!(d.cx_rf_myelopathy || d.lx_rf_cauda || d.cx_rf_vbi);
    const totalSessions = sessions.length;

    const AUTO_TASKS = [
      rfMyelopathy && {
        templateId:`red_flag_${pt}`, icon:"🚨", title:"Red Flag — Urgent Review",
        patient:pt, category:"Clinical Safety", priority:"high",
        dueTime:"Immediately", nav:"subjective",
        note:"Red flag indicators detected — urgent clinical review required",
      },
      hasCC && !hasSOAP && {
        templateId:`soap_${pt}`, icon:"📋", title:"SOAP Note Pending",
        patient:pt, category:"Documentation", priority:"high",
        dueTime:"End of session", nav:"soap",
        note:"Assessment documented but SOAP not finalised",
      },
      pendingSession && {
        templateId:`session_outcome_${pt}`, icon:"📝", title:"Session Outcome Missing",
        patient:pt, category:"Documentation", priority:"high",
        dueTime:"Before next patient", nav:"tx_sessions",
        note:"Session recorded without VAS outcome — complete before leaving",
      },
      hasCC && !hasROM && {
        templateId:`rom_${pt}`, icon:"📐", title:"ROM Assessment Missing",
        patient:pt, category:"Assessment", priority:"medium",
        dueTime:"Next session", nav:"rom",
        note:"Chief complaint recorded but no ROM values entered",
      },
      hasCC && !hasMMT && {
        templateId:`mmt_${pt}`, icon:"💪", title:"MMT Not Recorded",
        patient:pt, category:"Assessment", priority:"medium",
        dueTime:"Next session", nav:"mmt",
        note:"Muscle testing not performed — complete for full clinical picture",
      },
      hasCC && !hasGait && !hasOM && totalSessions > 1 && {
        templateId:`outcome_${pt}`, icon:"📊", title:"Outcome Measures Due",
        patient:pt, category:"Assessment", priority:"low",
        dueTime:"This week", nav:"subjective",
        note:"Reassessment outcome measures recommended after 2+ sessions",
      },
      totalSessions > 0 && totalSessions % 6 === 0 && {
        templateId:`reassess_${pt}_${totalSessions}`, icon:"🔄", title:"Formal Reassessment Due",
        patient:pt, category:"Reassessment", priority:"medium",
        dueTime:"Next session", nav:"subjective",
        note:`${totalSessions} sessions completed — formal reassessment recommended`,
      },
    ].filter(Boolean);

    AUTO_TASKS.forEach(task => {
      onAddTask({
        ...task,
        id: `auto_${task.templateId}_${Date.now()}`,
        status: "pending",
        createdAt: now,
        autoGenerated: true,
      });
    });
  }, [data, patients]);

  // ── DERIVED DATA ──────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const today = new Date().toDateString();
    const d = data || {}; // guard against null/undefined data

    // Merge auto-generated tasks with stored taskDB
    const pendingTasks = taskDB
      .filter(t => t.status !== "completed")
      .sort((a,b) => {
        const pOrd = {high:0,medium:1,low:2};
        return (pOrd[a.priority]||1) - (pOrd[b.priority]||1);
      });

    const completedTasks = taskDB
      .filter(t => t.status === "completed")
      .sort((a,b) => new Date(b.completedAt||0) - new Date(a.completedAt||0))
      .slice(0,20);

    const todayCompleted = completedTasks.filter(t =>
      t.completedAt && new Date(t.completedAt).toDateString() === today
    ).length;

    const overdueTasks = pendingTasks.filter(t =>
      t.dueTime === "Immediately" || t.priority === "high"
    ).length;

    // Patients
    const schedule = [...patients]
      .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0,6)
      .map((p,i) => {
        const d2 = p.data || {};
        const sessions = Array.isArray(d2.tx_sessions) ? d2.tx_sessions : [];
        const hasTx = !!(d2.tx_techniques || sessions.length > 0);
        const isActive = p.id === patients[0]?.id;
        const colors = ["#6D28D9","#0891B2","#059669","#D97706","#DC2626","#7C3AED"];
        const name = d2.dem_name || p.name || "Patient";
        const initials = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
        const dx = d2.cc_main ? d2.cc_main.slice(0,35)+(d2.cc_main.length>35?"…":"") : p.lastDx||"Assessment pending";
        return { id:p.id, name, initials, color:colors[i%colors.length],
                 dx, status:hasTx?"completed":isActive?"in-progress":"upcoming",
                 sessionCount:sessions.length, hasRedFlags:p.hasRedFlags };
      });

    // Stats
    const todayCount  = patients.filter(p => new Date(p.updatedAt).toDateString()===today).length;
    const activeNRS   = parseFloat(d["cc_vas_now"]||"0");
    const worstNRS    = parseFloat(d["cc_vas_worst"]||"0");
    const activeSess  = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
    const nrsImprove  = worstNRS > 0 ? Math.round(((worstNRS-activeNRS)/worstNRS)*100) : 0;
    const recoveryPct = Math.min(Math.max(nrsImprove + Math.min(activeSess.length*5,30), 0), 100);
    const activeName  = d["dem_name"] || "";
    const activeCC    = (d["cc_main"]||"").slice(0,38);

    // Outcomes
    const total = Math.max(patients.length,1);
    const soapPct  = Math.round((patients.filter(p=>p.data&&(p.data.tx_techniques||(Array.isArray(p.data.tx_sessions)&&p.data.tx_sessions.length>0))).length/total)*100);
    const romPct   = Math.round((patients.filter(p=>p.data&&Object.keys(p.data).some(k=>k.startsWith("rom_")&&p.data[k])).length/total)*100);
    const assessPct= Math.round((patients.filter(p=>p.data&&p.data.cc_main).length/total)*100);
    const safetyPct= Math.round(((total-patients.filter(p=>p.hasRedFlags).length)/total)*100);

    // Trend
    let trendData = [0,0,0,0,0,0,0,0,0,0,0,0];
    if (activeSess.length > 0) {
      activeSess.slice(-12).forEach((s,i)=>{
        const vs=parseFloat(s.vasStart||"5"), ve=parseFloat(s.vasEnd||"5");
        trendData[i]=Math.max(0, vs>0?Math.round(((vs-ve)/vs)*100):0);
      });
    } else {
      patients.forEach(p=>{
        const d2=p.data||{};
        const mn=new Date(p.updatedAt).getMonth();
        const vs=parseFloat(d2.cc_vas_worst||"0"), vc=parseFloat(d2.cc_vas_now||"0");
        if(vs>0) trendData[mn]=Math.round(((vs-vc)/vs)*100);
      });
    }

    return { pendingTasks, completedTasks, todayCompleted, overdueTasks,
             schedule, todayCount, recoveryPct, activeName, activeCC,
             activeNRS, worstNRS, activeSess, soapPct, romPct, assessPct, safetyPct, trendData };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, data]); // taskDB intentionally excluded — adding it creates infinite loop

  const {
    pendingTasks, completedTasks, todayCompleted, overdueTasks,
    schedule, todayCount, recoveryPct, activeName, activeCC,
    activeNRS, worstNRS, activeSess, soapPct, romPct, assessPct, safetyPct, trendData
  } = derived;

  // ── COMPLETE TASK with animation ──────────────────────────────────────────
  const handleComplete = useCallback((taskId) => {
    setCompleting(taskId);
    setTimeout(() => {
      onCompleteTask && onCompleteTask(taskId);
      setCompleting(null);
      setExpanded(null);
    }, 600);
  }, [onCompleteTask]);

  // ── INLINE COMPONENTS ─────────────────────────────────────────────────────
  const Donut = ({ pct, color, size=62, stroke=7, label }) => {
    const [val,setVal] = useState(0);
    useEffect(()=>{const t=setTimeout(()=>setVal(pct),500);return()=>clearTimeout(t);},[pct]);
    const r=(size-stroke)/2, circ=2*Math.PI*r, offset=circ-(val/100)*circ;
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
        <div style={{position:"relative",width:size,height:size}}>
          <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke}/>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:12,fontWeight:800,color:"#111827"}}>{val}%</div>
        </div>
        <div style={{fontSize:10,color:"#6B7280",fontWeight:600,textAlign:"center"}}>{label}</div>
      </div>
    );
  };

  const TrendChart = ({ data: d }) => {
    const [anim,setAnim] = useState(false);
    useEffect(()=>{const t=setTimeout(()=>setAnim(true),400);return()=>clearTimeout(t);},[]);
    // Guard against empty/single-point arrays
    if(!d||d.length<2) return (
      <div style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",
        color:"#9CA3AF",fontSize:11}}>No trend data yet</div>
    );
    const safeD = d.map(v=>isNaN(v)?0:Number(v));
    const w=280, h=72, max=Math.max(...safeD,1);
    const pts=safeD.map((v,i)=>{
      const x=(i/(safeD.length-1))*w;
      const y=h-((v/max))*(h-10)-5;
      return [x,y];
    });
    const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const areaD=`${pathD} L${w},${h} L0,${h} Z`;
    const months=["J","F","M","A","M","J","J","A","S","O","N","D"];
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h+16}`} style={{overflow:"visible",display:"block"}}>
        <defs>
          <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0"/>
          </linearGradient>
          <clipPath id="tc2">
            <rect x="0" y="0" width={anim?w:0} height={h+16}
              style={{transition:"width 1.4s cubic-bezier(.4,0,.2,1)"}}/>
          </clipPath>
        </defs>
        <path d={areaD} fill="url(#tg2)" clipPath="url(#tc2)"/>
        <path d={pathD} fill="none" stroke="#6D28D9" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#tc2)"/>
        {pts.map((p,i)=>i%3===0&&p&&(
          <text key={i} x={p[0]} y={h+14} textAnchor="middle" fontSize="8" fill="#9CA3AF">{months[i]}</text>
        ))}
        {pts.length>0&&pts[pts.length-1]&&(
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]}
            r="4" fill="#6D28D9" stroke="white" strokeWidth="2"/>
        )}
      </svg>
    );
  };

  // ── PRIORITY CONFIG ───────────────────────────────────────────────────────
  const PRI = {
    high:   { bg:"#FEF2F2", color:"#EF4444", border:"#FECACA", dot:"#EF4444", label:"High"   },
    medium: { bg:"#FFFBEB", color:"#D97706", border:"#FDE68A", dot:"#D97706", label:"Medium" },
    low:    { bg:"#F0FDF4", color:"#059669", border:"#BBF7D0", dot:"#059669", label:"Low"    },
  };
  const STATUS_CFG = {
    "in-progress":{ bg:"#ECFDF5",color:"#059669",dot:"#10B981",label:"Active"   },
    "upcoming":   { bg:"#EFF6FF",color:"#2563EB",dot:"#3B82F6",label:"Upcoming" },
    "completed":  { bg:"#F3F4F6",color:"#6B7280",dot:"#9CA3AF",label:"Done"     },
  };
  const CAT_ICONS = {
    "Clinical Safety":"🚨","Documentation":"📋","Assessment":"📐","Reassessment":"🔄","Follow-Up":"📞"
  };
  const now = new Date();
  const greeting = now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";
  const dateStr  = now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  const STATS = [
    {label:"Today",   value:String(todayCount),             sub:"patients", icon:"👥",color:"#6D28D9",bg:"#EDE9FE",nav:"subjective"},
    {label:"Pending", value:String(pendingTasks.length),    sub:"tasks",    icon:"⏳",color:pendingTasks.some(t=>t.priority==="high")?"#EF4444":"#D97706",bg:pendingTasks.some(t=>t.priority==="high")?"#FEF2F2":"#FEF3C7",nav:"dashboard"},
    {label:"Done",    value:String(todayCompleted),         sub:"today",    icon:"✓", color:"#059669",bg:"#ECFDF5",nav:"dashboard"},
    {label:"Overdue", value:String(overdueTasks),           sub:"alerts",   icon:"⚠",color:"#EF4444",bg:"#FEF2F2",nav:"dashboard"},
  ];

  return (
    <div style={{fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",background:"#F8FAFC",minHeight:"100vh",padding:"0 0 24px"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideOut{from{opacity:1;transform:translateX(0) scaleY(1);max-height:200px}to{opacity:0;transform:translateX(60px) scaleY(0);max-height:0;margin:0;padding:0}}
        @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.35}}
        .dc{animation:fadeUp 0.45s ease both}
        .completing{animation:slideOut 0.55s cubic-bezier(.4,0,.2,1) forwards}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"white",padding:"20px 16px 14px",borderBottom:"1px solid #F1F5F9",
        position:"sticky",top:0,zIndex:20,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#9CA3AF",fontWeight:500,marginBottom:2}}>{dateStr}</div>
            <div style={{fontSize:16,fontWeight:800,color:"#111827",letterSpacing:"-0.4px"}}>
              {greeting}, {currentUser?.user_metadata?.full_name?.split(" ")[0] || "Doctor"} 👋
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {overdueTasks > 0 && (
              <div style={{position:"relative",cursor:"pointer",width:38,height:38,borderRadius:11,
                background:"#FEF2F2",border:"1px solid #FECACA",display:"flex",
                alignItems:"center",justifyContent:"center",fontSize:"1rem"}}
                onClick={()=>setActiveTab("pending")}>
                🔔
                <div style={{position:"absolute",top:7,right:7,width:8,height:8,background:"#EF4444",
                  borderRadius:"50%",border:"1.5px solid white",
                  animation:"pulseDot 1.2s infinite"}}/>
              </div>
            )}
            <button onClick={onSignOut}
              style={{padding:"6px 12px",borderRadius:9,border:"1px solid #E0E0E2",
                background:"transparent",color:"#6B6B6B",fontSize:"0.8rem",
                fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
              Sign out
            </button>
            <div style={{width:38,height:38,borderRadius:11,
              background:"linear-gradient(135deg,#6D28D9,#8B5CF6)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:800,color:"white",cursor:"pointer"}}
              onClick={()=>onNav("subjective")}>DP</div>
          </div>
        </div>
      </div>

      <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:16}}>

        {/* ── QUICK STATS ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {STATS.map((st,i)=>(
            <div key={st.label} className="dc" style={{
              background:"white",borderRadius:16,padding:"14px",
              border:"1px solid #F1F5F9",boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
              animationDelay:`${i*0.07}s`,cursor:"pointer",
            }} onClick={()=>{ if(st.nav==="dashboard") setActiveTab("pending"); else onNav(st.nav); }}>
              <div style={{width:32,height:32,borderRadius:9,background:st.bg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,marginBottom:10}}>{st.icon}</div>
              <div style={{fontSize:26,fontWeight:800,color:"#111827",letterSpacing:"-1px",lineHeight:1}}>
                {st.value}
              </div>
              <div style={{fontSize:11,color:"#6B7280",marginTop:3}}>
                {st.label} <span style={{color:st.color}}>{st.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── ACTIVE PATIENT ── */}
        {activeName ? (
          <div className="dc" style={{
            background:"linear-gradient(135deg,#6D28D9 0%,#7C3AED 55%,#8B5CF6 100%)",
            borderRadius:20,padding:"18px",
            boxShadow:"0 8px 28px rgba(109,40,217,0.28)",animationDelay:"0.1s",cursor:"pointer",
          }} onClick={()=>onNav("subjective")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.6)",
                  textTransform:"uppercase",letterSpacing:"0.9px",marginBottom:3}}>Active Patient</div>
                <div style={{fontSize:17,fontWeight:800,color:"white",letterSpacing:"-0.4px"}}>{activeName}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2,
                  maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {activeCC||"Assessment pending"} · {activeSess.length} session{activeSess.length!==1?"s":""}
                </div>
              </div>
              <div style={{width:44,height:44,borderRadius:13,
                background:"rgba(255,255,255,0.18)",border:"2px solid rgba(255,255,255,0.25)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,fontWeight:800,color:"white",flexShrink:0}}>
                {activeName.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase()}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[
                {l:"Pain NRS",v:activeNRS>0?`${activeNRS}/10`:"—",s:worstNRS>activeNRS?`↓ from ${worstNRS}`:"not recorded"},
                {l:"Sessions",v:String(activeSess.length),s:"completed"},
              ].map(m=>(
                <div key={m.l} style={{flex:1,background:"rgba(255,255,255,0.14)",borderRadius:11,padding:"8px 9px"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"white",lineHeight:1}}>{m.v}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",marginTop:2,fontWeight:600}}>{m.l}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>{m.s}</div>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="dc" style={{background:"white",borderRadius:20,padding:"20px",
            border:"2px dashed #E5E7EB",textAlign:"center",animationDelay:"0.1s",cursor:"pointer"}}
            onClick={()=>onNav("subjective")}>
            <div style={{fontSize:"1.5rem",marginBottom:8}}>👤</div>
            <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>No active patient</div>
            <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>Select or create a patient to begin</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TASK MANAGEMENT SYSTEM
        ══════════════════════════════════════════════════════════════ */}
        <div className="dc" style={{animationDelay:"0.15s"}}>

          {/* Tab bar */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>
              Task Workflow
            </div>
            <div style={{display:"flex",gap:5}}>
              {[
                {k:"pending",  label:`Pending ${pendingTasks.length>0?"("+pendingTasks.length+")":""}`},
                {k:"completed",label:`Done ${todayCompleted>0?"("+todayCompleted+")":""}`},
              ].map(({k,label})=>(
                <button key={k} onClick={()=>setActiveTab(k)} style={{
                  padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer",
                  fontSize:11,fontWeight:700,
                  background:activeTab===k?"#6D28D9":"#F3F4F6",
                  color:activeTab===k?"white":"#6B7280",
                  transition:"all 0.2s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── PENDING TASKS ── */}
          {activeTab === "pending" && (
            <div>
              {pendingTasks.length === 0 ? (
                <div style={{background:"white",borderRadius:16,padding:"28px 20px",
                  border:"2px dashed #E5E7EB",textAlign:"center"}}>
                  <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#374151"}}>All clear!</div>
                  <div style={{fontSize:12,color:"#9CA3AF",marginTop:4}}>
                    No pending tasks — great clinical workflow
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {pendingTasks.map((task,i) => {
                    const pri = PRI[task.priority] || PRI.medium;
                    const isCompleting = completing === task.id;
                    const isExpanded   = expanded === task.id;
                    return (
                      <div key={task.id}
                        className={isCompleting ? "completing" : ""}
                        style={{
                          background:"white",
                          borderRadius:14,
                          border:`1px solid ${isExpanded?pri.border:"#F1F5F9"}`,
                          boxShadow:isExpanded?"0 4px 16px rgba(0,0,0,0.08)":"0 1px 5px rgba(0,0,0,0.04)",
                          overflow:"hidden",
                          animation:isCompleting?"":"fadeUp 0.4s ease both",
                          animationDelay:`${i*0.05}s`,
                          transition:"box-shadow 0.2s, border 0.2s",
                          transformOrigin:"top",
                        }}>

                        {/* Priority stripe */}
                        <div style={{height:3,background:pri.color,width:"100%"}}/>

                        {/* Main row */}
                        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:11,
                          cursor:"pointer"}} onClick={()=>setExpanded(isExpanded?null:task.id)}>
                          {/* Icon */}
                          <div style={{width:38,height:38,borderRadius:10,background:pri.bg,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:17,flexShrink:0}}>{task.icon}</div>

                          {/* Info */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:"#111827",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {task.title}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:10.5,color:"#6B7280"}}>{task.patient}</span>
                              <span style={{color:"#D1D5DB"}}>·</span>
                              <span style={{fontSize:10,fontWeight:600,color:pri.color,
                                background:pri.bg,padding:"1px 6px",borderRadius:99}}>
                                {pri.label}
                              </span>
                              {task.dueTime && (
                                <>
                                  <span style={{color:"#D1D5DB"}}>·</span>
                                  <span style={{fontSize:10,color:"#9CA3AF"}}>⏰ {task.dueTime}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expand arrow */}
                          <div style={{color:"#9CA3AF",fontSize:12,flexShrink:0,
                            transition:"transform 0.2s",transform:isExpanded?"rotate(180deg)":""}}>▼</div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={{padding:"0 14px 14px",borderTop:"1px solid #F9FAFB"}}>
                            {task.note && (
                              <div style={{background:"#F8FAFC",borderRadius:8,padding:"8px 10px",
                                marginBottom:12,fontSize:11.5,color:"#6B7280",lineHeight:1.5}}>
                                📌 {task.note}
                              </div>
                            )}
                            <div style={{display:"flex",gap:8}}>
                              {/* Open button */}
                              <button onClick={()=>onNav(task.nav||"subjective")} style={{
                                flex:1,padding:"9px",borderRadius:9,
                                background:"#F3F4F6",border:"none",cursor:"pointer",
                                fontSize:12,fontWeight:700,color:"#374151",
                                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                              }}>
                                📂 Open
                              </button>
                              {/* Complete button */}
                              <button onClick={()=>handleComplete(task.id)} style={{
                                flex:2,padding:"9px",borderRadius:9,
                                background:"linear-gradient(135deg,#059669,#10B981)",
                                border:"none",cursor:"pointer",
                                fontSize:12,fontWeight:800,color:"white",
                                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                                boxShadow:"0 2px 8px rgba(5,150,105,0.3)",
                              }}>
                                {isCompleting ? "✓ Completing…" : "✓ Mark Complete"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quick complete (collapsed) */}
                        {!isExpanded && (
                          <div style={{padding:"0 14px 10px",display:"flex",gap:7}}>
                            <button onClick={()=>onNav(task.nav||"subjective")} style={{
                              flex:1,padding:"6px",borderRadius:8,
                              background:"#F8FAFC",border:"1px solid #E5E7EB",
                              cursor:"pointer",fontSize:11,fontWeight:600,color:"#6B7280",
                            }}>Open →</button>
                            <button onClick={()=>handleComplete(task.id)} style={{
                              flex:2,padding:"6px",borderRadius:8,
                              background:"#ECFDF5",border:"1px solid #BBF7D0",
                              cursor:"pointer",fontSize:11,fontWeight:700,color:"#059669",
                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                            }}>
                              {isCompleting
                                ? <span style={{animation:"checkPop 0.3s ease"}}>✓ Done!</span>
                                : "✓ Complete"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETED HISTORY ── */}
          {activeTab === "completed" && (
            <div>
              {completedTasks.length === 0 ? (
                <div style={{background:"white",borderRadius:16,padding:"24px",
                  border:"1px solid #F1F5F9",textAlign:"center"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:8}}>📋</div>
                  <div style={{fontSize:12,color:"#9CA3AF"}}>No completed tasks yet</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {completedTasks.map((task,i)=>(
                    <div key={task.id} style={{
                      background:"white",borderRadius:12,padding:"12px 14px",
                      border:"1px solid #F1F5F9",
                      display:"flex",alignItems:"center",gap:11,opacity:0.8,
                      animation:"fadeUp 0.35s ease both",animationDelay:`${i*0.04}s`,
                    }}>
                      <div style={{width:34,height:34,borderRadius:9,
                        background:"#ECFDF5",border:"1px solid #BBF7D0",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
                        ✅
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:"#374151",
                          textDecoration:"line-through",opacity:0.7,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {task.title}
                        </div>
                        <div style={{fontSize:10.5,color:"#9CA3AF",marginTop:2}}>
                          {task.patient} · Completed{" "}
                          {task.completedAt
                            ? new Date(task.completedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
                            : "today"}
                        </div>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,color:"#059669",
                        background:"#ECFDF5",padding:"2px 8px",borderRadius:99}}>Done</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RECENT PATIENTS ── */}
        <div className="dc" style={{animationDelay:"0.2s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>
              Recent Patients <span style={{fontSize:11,fontWeight:500,color:"#9CA3AF",marginLeft:5}}>({patients.length})</span>
            </div>
            <span style={{fontSize:11,fontWeight:600,color:"#6D28D9",cursor:"pointer"}}
              onClick={()=>onNav("subjective")}>See all →</span>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
            {[["All","all"],["Active","in-progress"],["Done","completed"]].map(([l,v])=>(
              <button key={v} onClick={()=>setScheduleTab(v)} style={{
                padding:"5px 14px",borderRadius:99,border:"none",cursor:"pointer",
                fontSize:11,fontWeight:700,whiteSpace:"nowrap",
                background:scheduleTab===v?"#6D28D9":"#F3F4F6",
                color:scheduleTab===v?"white":"#6B7280",transition:"all 0.2s",
              }}>{l}</button>
            ))}
          </div>
          {schedule.length === 0 ? (
            <div style={{background:"white",borderRadius:14,padding:"20px",
              border:"1px solid #F1F5F9",textAlign:"center",color:"#9CA3AF",fontSize:12}}>
              No patients yet — create your first patient
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {schedule.filter(s2=>scheduleTab==="all"||s2.status===scheduleTab).slice(0,5).map((appt,i)=>{
                const sc = STATUS_CFG[appt.status];
                return (
                  <div key={appt.id} style={{
                    background:"white",borderRadius:14,padding:"12px 14px",
                    border:`1px solid ${appt.hasRedFlags?"#FECACA":"#F1F5F9"}`,
                    display:"flex",alignItems:"center",gap:12,
                    opacity:appt.status==="completed"?0.7:1,cursor:"pointer",
                    animation:"fadeUp 0.4s ease both",animationDelay:`${i*0.05}s`,
                  }} onClick={()=>onQuickStart ? onQuickStart(patients.find(p2=>p2.id===appt.id)||patients[i]) : onNav("subjective")}>
                    <div style={{width:40,height:40,borderRadius:11,
                      background:`${appt.color}18`,border:`1.5px solid ${appt.color}25`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:800,color:appt.color,flexShrink:0,
                      position:"relative"}}>
                      {appt.initials}
                      {appt.hasRedFlags&&(
                        <div style={{position:"absolute",top:-3,right:-3,width:10,height:10,
                          background:"#EF4444",borderRadius:"50%",border:"1.5px solid white",
                          fontSize:7,display:"flex",alignItems:"center",justifyContent:"center",color:"white"}}>!</div>
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appt.name}</div>
                      <div style={{fontSize:11,color:"#6B7280",marginTop:1,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appt.dx}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,
                        padding:"3px 8px",background:sc.bg,borderRadius:99}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:sc.dot,
                          animation:appt.status==="in-progress"?"pulseDot 1.5s infinite":"none"}}/>
                        <span style={{fontSize:9.5,fontWeight:700,color:sc.color}}>{sc.label}</span>
                      </div>
                      <div style={{fontSize:10,color:"#9CA3AF"}}>{appt.sessionCount} session{appt.sessionCount!==1?"s":""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>



        {/* ── PATIENT OUTCOMES ── */}
        <div className="dc" style={{background:"white",borderRadius:20,padding:"16px",
          border:"1px solid #F1F5F9",boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
          animationDelay:"0.3s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>Patient Outcomes</div>
            <div style={{fontSize:11,color:"#9CA3AF"}}>{patients.length} total</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-around"}}>
            <Donut pct={assessPct} color="#6D28D9" label="Assessed"  size={62} stroke={7}/>
            <Donut pct={romPct}    color="#0891B2" label="ROM Done"   size={62} stroke={7}/>
            <Donut pct={soapPct}   color="#059669" label="SOAP Done"  size={62} stroke={7}/>
            <Donut pct={safetyPct} color="#10B981" label="No Flags"   size={62} stroke={7}/>
          </div>
          {patients.length===0&&(
            <div style={{textAlign:"center",color:"#9CA3AF",fontSize:11,marginTop:12}}>
              Add patients to see outcome analytics
            </div>
          )}
        </div>

        {/* ── START ASSESSMENT CTA ── */}
        <div className="dc" style={{
          background:"linear-gradient(135deg,#6D28D9,#8B5CF6)",
          borderRadius:20,padding:"20px",
          boxShadow:"0 4px 20px rgba(109,40,217,0.25)",
          animationDelay:"0.35s",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          cursor:"pointer",
        }} onClick={()=>onNav("subjective")}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"white",letterSpacing:"-0.3px"}}>Start Assessment</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:3}}>
              Subjective → ROM → MMT → Special Tests
            </div>
          </div>
          <div style={{width:44,height:44,borderRadius:13,background:"rgba(255,255,255,0.2)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem"}}>→</div>
        </div>

      </div>
    </div>
  );
}


// ── Exports ──────────────────────────────────────────────────────────────────
export { PostureDefectModule, HomeModule, TherapistDashboardModule };

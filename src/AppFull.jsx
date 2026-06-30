// AppFull.jsx — Posture engine, camera, patient DB, dashboard, AppInner, App
import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense, lazy } from "react";
import { supabase } from "./supabase.js";
import { createPortal } from "react-dom";
import { r2, mid, px, C, getC, useTheme, MobileStyleInjector, ErrorBoundary, TabLoader } from "./utils.jsx";
import { SpecialTestsSection, SubjectiveModule, NKTSection, KineticChainSection, FMASection, FasciaSection,
  NKT_REGIONS, KC_REGIONS, UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S,
  ErgoModule, CyriaxModule, CyriaxRegionTests, generateDiagnosis,
  PDF_BASE_STYLES, makePDFPage, MOVEMENTS, downloadPDFFromHTML } from "./SubjectiveObjective.jsx";
import { GaitModule, OutcomeMeasuresModule, SOAPNoteModule, ExercisePrescriptionModule, LiveSOAPPanel,
  PalpationModule, TreatmentTechniquesModule, TreatmentSessionLogModule,
  buildClinicalInterpretation, Sparkline, EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES, TEMPLATE_TX, ObservationModule } from "./ClinicalModules.jsx";
import BodyChartPro from "./BodyChartPro.jsx";
import OutcomeMeasuresPro from "./OutcomeMeasuresPro.jsx";
import AuthScreen from "./AuthScreen.jsx";
import LandingPage from "./LandingPage.jsx";
import { ALL_TESTS, ROMModule, MMTModule, NeurologicalModule,
  MMT_DATA, DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO } from "./PhysioNeuro.jsx";
import AIAssistant from "./AIAssistant.jsx";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

import { PostureAnalysisModule, PC } from "./PostureEngine.jsx";
import {
  DB_KEY, DRAFT_KEY,
  loadPatientDB, savePatientDB,
  loadTaskDB, saveTaskDB,
  genId,
  PatientDatabasePanel, PatientProfileModal,
} from "./PatientDatabase.jsx";

// ── Lazy-loaded heavy modules (split into separate async chunks) ──────────────
const LazySubjective    = lazy(() => import("./lazy_subjective.jsx"));
const LazySTT           = lazy(() => import("./lazy_stt.jsx"));
const LazyCPA           = lazy(() => import("./lazy_cpa.jsx"));
const LazySOAP          = lazy(() => import("./lazy_clinical.jsx"));
const LazyExercise      = lazy(() => import("./lazy_exercise.jsx"));
const LazyOutcomes      = lazy(() => import("./lazy_outcomes.jsx"));
const LazyNeuro         = lazy(() => import("./lazy_neuro.jsx"));
const LazyBodyChart     = lazy(() => import("./lazy_bodychart.jsx"));
const LazyGait          = lazy(() => import("./lazy_gait.jsx"));
const LazyPalpation     = lazy(() => import("./lazy_palpation.jsx"));
const LazyTreatment     = lazy(() => import("./lazy_treatment.jsx"));

// Minimal Suspense fallback
const TabFallback = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40,color:"#9ca3af",fontSize:"0.88rem",gap:10}}>
    <span style={{display:"inline-block",width:18,height:18,border:"2px solid #e5e7eb",borderTopColor:"#7c3aed",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
    Loading module...
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ─── MAIN APP ────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PATIENT DATABASE
// ═══════════════════════════════════════════════════════════════════════════
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
        style={{width:"100%",maxWidth:560,background:"#ffffff",borderRadius:"16px 16px 0 0",border:"1px solid #d8cce8",padding:"20px 18px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        {/* Handle bar */}
        <div style={{width:36,height:4,background:"#2a3f58",borderRadius:2,margin:"0 auto 16px"}}/>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:"1.8rem"}}>{d.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:"#1a1025"}}>{d.label}</div>
            <span style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:6,background:"rgba(0,229,255,0.12)",color:"#00e5ff",fontWeight:700}}>{d.region}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #d8cce8",borderRadius:8,color:"#7e6a9a",cursor:"pointer",padding:"5px 10px",fontSize:"0.75rem"}}>✕</button>
        </div>
        {/* Description */}
        <div style={{padding:"10px 13px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.15)",borderRadius:10,fontSize:"0.76rem",color:"#a0c8e8",lineHeight:1.6,marginBottom:14}}>
          {d.description}
        </div>
        {/* Muscles */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:"rgba(255,77,109,0.06)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🔴 Tight / Overactive</div>
            {d.tight_muscles.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"#1a1025",padding:"2px 0",borderBottom:"1px solid rgba(255,77,109,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
          <div style={{background:"rgba(0,201,122,0.06)",border:"1px solid rgba(0,201,122,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🟢 Weak / Inhibited</div>
            {d.weak_muscles.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"#1a1025",padding:"2px 0",borderBottom:"1px solid rgba(0,201,122,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
        </div>
        {/* Kinetic chain */}
        <div style={{background:"rgba(127,90,240,0.07)",border:"1px solid rgba(127,90,240,0.2)",borderRadius:10,padding:"10px 13px",marginBottom:14}}>
          <div style={{fontSize:"0.8rem",fontWeight:800,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>🔗 Kinetic Chain</div>
          <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.6,fontStyle:"italic"}}>{d.kinetic_chain}</div>
        </div>
        {/* Exercises */}
        {d.exercises?.length > 0 && (
          <div>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#00e5ff",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>💪 Corrective Exercises</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {d.exercises.map((ex,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:8,alignItems:"center"}}>
                  <span style={{color:"#00e5ff",fontWeight:800,fontSize:"0.8rem",flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:"0.82rem",color:"#1a1025"}}>{ex}</span>
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
    width:"100%", background:"#f5f0fb", border:"1px solid #d8cce8",
    borderRadius:8, color:"#1a1025", fontFamily:"inherit",
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
        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:9}}>📋 Assessment Views — Position patient accordingly</div>
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
              <div style={{fontSize:"0.73rem",color:"#7e6a9a",lineHeight:1.4}}>{v.tip}</div>
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
        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
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
          <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
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
                      <div style={{fontSize:"0.76rem",fontWeight:700,color:"#1a1025",lineHeight:1.3}}>{d.label}</div>
                      <div style={{fontSize:"0.8rem",color:"#7e6a9a",marginTop:1}}>{d.region}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <span style={{fontSize:"0.82rem",color:"#00e5ff",fontWeight:700}}>📋 Detail →</span>
                      <button onClick={e=>{e.stopPropagation();setSelectedDefects(p=>p.filter(s=>s!==id));}} style={{background:"none",border:"1px solid #d8cce8",borderRadius:5,color:"#7e6a9a",cursor:"pointer",fontSize:"0.8rem",padding:"1px 6px",lineHeight:1.4}}>✕</button>
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
                  <div style={{padding:"8px 13px",background:"rgba(6,9,15,0.5)",borderTop:"1px solid #d8cce8",display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔴 Tight</div>
                      <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.4}}>{d.tight_muscles.slice(0,2).join(", ")}{d.tight_muscles.length>2?` +${d.tight_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🟢 Weak</div>
                      <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.4}}>{d.weak_muscles.slice(0,2).join(", ")}{d.weak_muscles.length>2?` +${d.weak_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔗 Chain</div>
                      <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.4,fontStyle:"italic"}}>{d.kinetic_chain.split("→")[0].trim()} →…</div>
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
                <button onClick={() => setShowExport(false)} style={{background:"none",border:"1px solid #d8cce8",borderRadius:6,color:"#7e6a9a",cursor:"pointer",padding:"3px 8px",fontSize:"0.75rem"}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <label style={{fontSize:"0.8rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:4}}>Patient Name</label>
                  <input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="Patient name" style={inputStyle}/>
                </div>
                <div>
                  <label style={{fontSize:"0.8rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:4}}>Clinician</label>
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

      <div style={{padding:"7px 11px",background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:8,fontSize:"0.8rem",color:"#7e6a9a",lineHeight:1.5}}>
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
    { icon:"🧍", title:"Postural Analysis", desc:"Camera-assisted posture analysis with AI landmark detection, 30+ postural defects, kinetic chain mapping, and PDF export.", nav:"posture", color:"#7c3aed" },
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
            The complete clinical assessment platform for physiotherapists. Evidence-based tools, AI-powered SOAP notes, and comprehensive patient management — all in one place.
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
          <div key={i} style={{background:"#fff",border:"1px solid #d8cce8",borderRadius:14,padding:"18px 16px",textAlign:"center",boxShadow:"0 2px 12px rgba(124,58,237,0.07)"}}>
            <div style={{fontSize:"1.5rem",marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:"1.6rem",fontWeight:900,color:"#7c3aed",lineHeight:1}}>{s.num}</div>
            <div style={{fontSize:"0.75rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,color:"#1a1025",margin:"0 0 6px",letterSpacing:"-0.3px"}}>Clinical Features</h2>
        <p style={{fontSize:"0.82rem",color:"#7e6a9a",margin:"0 0 20px"}}>Tap any feature to navigate directly to that assessment tool.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
          {features.map((f,i)=>(
            <button key={i} onClick={()=>onNav(f.nav)} style={{
              background:"#fff",border:`1px solid #d8cce8`,borderRadius:14,padding:"18px 16px",
              textAlign:"left",cursor:"pointer",transition:"all 0.18s",
              boxShadow:"0 2px 10px rgba(124,58,237,0.06)",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color;e.currentTarget.style.boxShadow=`0 4px 20px rgba(124,58,237,0.14)`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#d8cce8";e.currentTarget.style.boxShadow="0 2px 10px rgba(124,58,237,0.06)";}}
            >
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:36,height:36,background:`${f.color}14`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>
                  {f.icon}
                </div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:"#1a1025",lineHeight:1.2}}>{f.title}</div>
              </div>
              <div style={{fontSize:"0.75rem",color:"#7e6a9a",lineHeight:1.55}}>{f.desc}</div>
              <div style={{marginTop:10,fontSize:"0.78rem",fontWeight:700,color:f.color}}>Open →</div>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow guide */}
      <div style={{background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:16,padding:"22px 20px",marginTop:24}}>
        <h3 style={{fontSize:"0.88rem",fontWeight:800,color:"#7c3aed",margin:"0 0 14px",letterSpacing:"-0.2px"}}>📋 Recommended Assessment Workflow</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {[
            "1. Subjective","2. Palpation","3. Posture","4. ROM","5. MMT",
            "6. Special Tests","7. Neurological","8. Gait","9. Kinetic Chain",
            "10. Treatment Plan","11. SOAP + AI"
          ].map((step,i)=>(
            <div key={i} style={{
              padding:"5px 12px",background:"#fff",border:"1px solid #d8cce8",
              borderRadius:8,fontSize:"0.82rem",fontWeight:600,color:"#1a1025"
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
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#F8FAFC",minHeight:"100vh",padding:"0 0 24px"}}>
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
              style={{padding:"6px 12px",borderRadius:9,border:"1px solid #d8cce8",
                background:"transparent",color:"#7e6a9a",fontSize:"0.8rem",
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


function PdfReportsModal({ data, dx, onClose, patients=[] }) {
  const [generating, setGenerating] = useState(null);
  const [done, setDone] = useState({});

  const d = data || {};
  const patName = d.dem_name || "Patient";
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const dob = d.dem_dob || "--";
  const age = d.dem_age || "--";
  const sex = d.dem_sex || d.dem_gender || "--";
  const occ = d.dem_occupation || "--";
  const gp = d.dem_gp || "--";
  const refNo = d.dem_ins_ref || "--";
  const insurer = d.dem_insurer || "--";
  const refSource = d.dem_referral || "--";

  const brand = { primary:"#1a3a5c", accent:"#2563eb", teal:"#0891b2", green:"#059669", red:"#dc2626", amber:"#d97706", purple:"#7c3aed", grey:"#6b7280", lightGrey:"#f1f5f9", border:"#e2e8f0", midGrey:"#94a3b8" };

  const escHtml = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const val = (k, fallback="--") => escHtml(d[k]||fallback);
  const arr = (k) => { const v=d[k]; return Array.isArray(v)?v:(typeof v==="string"?v:"").split("|||").filter(Boolean); };

  const pdfHeader = (title, subtitle, color) => {
    const reportNo = d.report_no || ("RPT-" + today.replace(/\s/g,""));
    const inlineLogo = `<img src="/logo.svg" alt="PhysioMind" style="height:68px;width:auto;display:block;" />`;
    return `<div style="background:#fff;border-bottom:1px solid #e2e8f0;">
      <div style="padding:14px 32px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:18px;">
          ${inlineLogo}
          <div style="border-left:2px solid #e2e8f0;padding-left:18px;margin-left:4px;">
            <div style="font-size:8.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">${title}</div>
            <div style="font-size:10px;color:#64748b;margin-top:1px;">${subtitle}</div>
          </div>
        </div>
        <div style="display:flex;gap:28px;text-align:right;">
          <div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">Patient</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${escHtml(patName)}</div>
            <div style="font-size:10px;color:#64748b;">${escHtml(sex)} &middot; ${escHtml(String(age))} yrs &middot; ${escHtml(dob)}</div>
          </div>
          <div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">Report</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${escHtml(reportNo)}</div>
            <div style="font-size:10px;color:#64748b;">${today}</div>
          </div>
        </div>
      </div>
      <div style="background:linear-gradient(to right,#3730a3,#7c3aed,#a855f7);padding:6px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">Smarter Assessment &middot; Better Outcomes</span>
        <span style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.8px;text-transform:uppercase;">Confidential Medical Document</span>
      </div>
    </div>`;
  };

  const pdfFooter = (docName) => {
    const therapistName = d.therapist_name || "Your Physiotherapist";
    return '<div style="background:#1e293b;padding:10px 40px;display:flex;justify-content:space-between;align-items:center;">'
      + '<div style="color:#94a3b8;font-size:8px;">PhysioMind &middot; ' + docName + '</div>'
      + '<div style="color:#64748b;font-size:8px;text-align:center;"><span style="color:#c9a84c;font-weight:700;">CONFIDENTIAL</span> &mdash; For Authorised Healthcare Professionals Only &middot; Not for Distribution</div>'
      + '<div style="color:#94a3b8;font-size:8px;">Page 1 &middot; ' + today + '</div>'
      + '</div>';
  };

  const sectionCard = (title, icon, content, borderColor) => '<div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">'
    + '<div style="padding:11px 16px;border-bottom:2px solid '+borderColor+'20;display:flex;align-items:center;gap:8px;">'
    + '<div style="width:28px;height:28px;background:'+borderColor+'12;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;border:1px solid '+borderColor+'25;">'+icon+'</div>'
    + '<span style="font-size:11px;font-weight:700;color:'+borderColor+';text-transform:uppercase;letter-spacing:1px;font-family:Georgia,serif;">'+title+'</span>'
    + '<div style="flex:1;height:1px;background:'+borderColor+'15;margin-left:4px;"></div>'
    + '</div>'
    + '<div style="padding:14px 16px;">'+content+'</div>'
    + '</div>';

  const badge = (text, color) => `<span style="display:inline-block;padding:3px 8px;background:${color}15;border:1px solid ${color}40;border-radius:5px;font-size:9px;font-weight:700;color:${color};margin:2px 3px 2px 0;">${escHtml(text)}</span>`;

  // Exercise SVG illustrations -- matches PhysioReports_4 ExerciseSVG component
  const exerciseSvgHtml = function(idx, color) {
    var svgs = [
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#f0f9ff" rx="8"/><ellipse cx="50" cy="28" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="38" y="47" width="24" height="38" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><path d="M50,38 Q42,45 44,53" stroke="'+color+'" stroke-width="2" fill="none" stroke-dasharray="3,2"/><text x="50" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Chin Tuck</text></svg>',
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fff7ed" rx="8"/><rect x="88" y="5" width="8" height="110" rx="3" fill="#e2e8f0"/><ellipse cx="48" cy="28" rx="16" ry="18" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="34" y="45" width="24" height="36" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="33" y="56" width="10" height="26" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1"/><path d="M44,60 L82,55" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2"/><path d="M44,68 L82,68" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2"/><text x="48" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Cervical Retraction</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#f0fdf4" rx="8"/><rect x="5" y="75" width="120" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="52" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="36" y="38" width="60" height="28" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="36" cy="46" rx="9" ry="9" fill="#fde8d0" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="96" cy="46" rx="9" ry="9" fill="#fde8d0" stroke="'+color+'" stroke-width="1.5"/><path d="M36,46 L20,40" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3,2"/><path d="M96,46 L112,40" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3,2"/><text x="65" y="93" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Scapular Retraction</text></svg>',
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fdf4ff" rx="8"/><ellipse cx="50" cy="30" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="38" y="49" width="24" height="36" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><path d="M60,22 Q75,15 78,28" stroke="'+color+'" stroke-width="2" fill="none"/><path d="M78,22 L85,15" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="2,2" fill="none"/><text x="50" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Levator Stretch</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#eff6ff" rx="8"/><rect x="50" y="60" width="30" height="12" rx="5" fill="#c7d7f0" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="65" cy="42" rx="30" ry="18" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="65" cy="28" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><text x="65" y="92" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Thoracic Extension</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#f5f3ff" rx="8"/><rect x="118" y="5" width="8" height="90" rx="3" fill="#e2e8f0"/><ellipse cx="68" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="55" y="35" width="24" height="32" rx="7" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="57" y="65" width="10" height="25" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="69" y="65" width="10" height="25" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><path d="M79,40 Q100,30 116,20" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2" fill="none"/><path d="M79,52 Q100,52 116,52" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2" fill="none"/><text x="65" y="97" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Wall Angels</text></svg>',
      '<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#fdf4ff" rx="8"/><ellipse cx="22" cy="50" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="34" y="42" width="50" height="30" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="50" y="68" width="50" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="50" y="55" width="65" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-25,75,62)"/><text x="60" y="95" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Clamshell</text></svg>',
      '<svg viewBox="0 0 80 120" width="80" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="120" fill="#eff6ff" rx="8"/><ellipse cx="40" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="26" y="34" width="28" height="35" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="28" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(15,34,80)"/><rect x="40" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-15,46,80)"/><text x="40" y="115" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Mini Squat</text></svg>',
      '<svg viewBox="0 0 140 110" width="120" height="94" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="110" fill="#f0fdf4" rx="8"/><rect x="5" y="85" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="35" y="42" width="55" height="22" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="37" y="62" width="12" height="25" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="62" y="58" width="50" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-8,87,64)"/><text x="60" y="100" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Hip Flexor Stretch</text></svg>',
    ];
    return svgs[idx % svgs.length];
  };

  const postureSvg = () => {
    const fhp = d.post_fhp || "";
    const sh = d.post_sh || "";
    const kyphosis = d.post_kyphosis || "";
    const lordosis = d.post_lordosis || "";
    const pelvis = d.post_pelvis || "";
    return `<svg viewBox="0 0 220 340" width="160" height="248" style="display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626"/></marker></defs>
      <rect width="220" height="340" fill="#f8fafc" rx="10"/>
      <line x1="110" y1="10" x2="110" y2="330" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"/>
      <ellipse cx="${fhp&&fhp.includes("Moderate")?120:fhp&&fhp.includes("Severe")?128:110}" cy="38" rx="22" ry="26" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="${fhp&&fhp.includes("Severe")?112:106}" y="62" width="14" height="22" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <line x1="${sh&&sh.includes("elevated")?62:68}" y1="${sh&&sh.includes("elevated")?84:88}" x2="${sh&&sh.includes("elevated")?158:152}" y2="${sh&&sh.includes("elevated")?88:84}" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="${sh&&sh.includes("elevated")?62:68}" cy="${sh&&sh.includes("elevated")?84:88}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="${sh&&sh.includes("elevated")?158:152}" cy="${sh&&sh.includes("elevated")?88:84}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <path d="M104,84 Q${kyphosis&&kyphosis.includes("increased")?98:104},120 ${kyphosis&&kyphosis.includes("increased")?98:104},145" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M${kyphosis&&kyphosis.includes("increased")?98:104},145 Q${lordosis&&lordosis.includes("increased")?116:104},170 ${lordosis&&lordosis.includes("increased")?114:104},190" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M68,88 L74,190 L148,190 L152,88 Z" fill="#dde8f8" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="110" cy="${pelvis&&pelvis.includes("anterior")?196:192}" rx="36" ry="20" fill="#c7d7f0" stroke="#2563eb" strokeWidth="1.5"/>
      <rect x="90" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="90" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="99" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      <ellipse cx="121" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      ${fhp&&!fhp.includes("Normal")?'<text x="135" y="35" fontSize="8" fill="#dc2626" fontWeight="700">FHP</text>':""}
      ${sh&&sh.includes("elevated")?'<text x="30" y="80" fontSize="8" fill="#dc2626" fontWeight="700">Sh elev.</text>':""}
      ${kyphosis&&kyphosis.includes("increased")?'<text x="20" y="120" fontSize="8" fill="#d97706" fontWeight="700">Kyph+</text>':""}
      ${lordosis&&lordosis.includes("increased")?'<text x="140" y="170" fontSize="8" fill="#d97706" fontWeight="700">Lord+</text>':""}
      ${pelvis&&pelvis.includes("anterior")?'<text x="150" y="200" fontSize="8" fill="#7c3aed" fontWeight="700">APT</text>':""}
      <line x1="110" y1="15" x2="110" y2="325" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
    </svg>`;
  };

  const exerciseSvgs = {
    bridge: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#f0f9ff" rx="8"/><rect x="5" y="75" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="30" cy="68" rx="14" ry="11" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="40" y="50" width="60" height="25" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="38" y="72" width="18" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><rect x="82" y="72" width="18" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Glute Bridge</text></svg>`,
    bird_dog: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#f0fdf4" rx="8"/><rect x="5" y="72" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="35" y="42" width="60" height="22" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="42" y="62" width="14" height="18" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><rect x="82" y="62" width="14" height="18" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><path d="M35,52 L18,45 L8,42" stroke="#059669" strokeWidth="2" fill="none"/><path d="M95,52 L112,45 L122,42" stroke="#059669" strokeWidth="2" fill="none"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Bird Dog</text></svg>`,
    clam: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#fdf4ff" rx="8"/><ellipse cx="22" cy="50" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="34" y="42" width="50" height="30" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="50" y="68" width="50" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="50" y="55" width="65" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-25,75,62)"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Clamshell</text></svg>`,
    squat: `<svg viewBox="0 0 80 120" width="80" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="120" fill="#eff6ff" rx="8"/><ellipse cx="40" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="26" y="34" width="28" height="35" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="28" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(15,34,80)"/><rect x="40" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-15,46,80)"/><text x="8" y="115" fontSize="7" fill="#1a3a5c" fontWeight="700">Mini Squat</text></svg>`,
    stretch: `<svg viewBox="0 0 140 110" width="120" height="94" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="110" fill="#f0fdf4" rx="8"/><rect x="5" y="85" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="35" y="42" width="55" height="22" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="37" y="62" width="12" height="25" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="62" y="58" width="50" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-8,87,64)"/><text x="5" y="100" fontSize="7" fill="#1a3a5c" fontWeight="700">Hip Flexor Stretch</text></svg>`,
    chin_tuck: `<svg viewBox="0 0 100 120" width="100" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fff7ed" rx="8"/><ellipse cx="50" cy="28" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="38" y="46" width="24" height="35" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><path d="M50,36 Q42,42 44,50" stroke="#d97706" strokeWidth="2" fill="none" strokeDasharray="3,2"/><text x="5" y="112" fontSize="7" fill="#1a3a5c" fontWeight="700">Chin Tuck (DNF)</text></svg>`,
  };

  const gatherExercises = () => {
    // ── 1. Real data: hep_programme array (Quick Visit / HEP module) ────────
    const hep = Array.isArray(d.hep_programme) ? d.hep_programme : [];
    if (hep.length > 0) {
      return hep.map(ex => ({
        name:        ex.name || "Unnamed Exercise",
        sets:        ex.customSets  || ex.sets  || "3",
        reps:        ex.customReps  || ex.reps  || "10",
        hold:        ex.customHold  || ex.hold  || "",
        rest:        ex.customRest  || ex.rest  || "60s",
        freq:        ex.customFreq  || ex.freq  || "Daily",
        phase:       ex.phase       || "Phase 1",
        notes:       ex.notes       || "",
        target:      ex.target      || ex.muscle || "",
        progression: ex.progression || "",
      }));
    }
    // ── 2. Manual entries: ex_name_1..12 ────────────────────────────────────
    const exs = [];
    for (let i = 1; i <= 12; i++) {
      const name = d[`ex_name_${i}`] || d[`exercise_${i}_name`] || "";
      if (!name) continue;
      exs.push({
        name, sets: d[`ex_sets_${i}`] || "3", reps: d[`ex_reps_${i}`] || "10",
        hold: d[`ex_hold_${i}`] || "", rest: d[`ex_rest_${i}`] || "60s",
        freq: d[`ex_freq_${i}`] || "Daily", phase: d[`ex_phase_${i}`] || "Phase 1",
        notes: d[`ex_notes_${i}`] || "", target: d[`ex_target_${i}`] || "",
        progression: d[`ex_progression_${i}`] || "",
      });
    }
    if (exs.length === 0) {
      const dxLabel = (dx?.dx?.[0]?.label||"").toLowerCase();
      const cc = (Array.isArray(d.cc_location)?d.cc_location.join(" "):(d.cc_location||"")).toLowerCase();
      const isLumbar = dxLabel.includes("lumbar")||dxLabel.includes("back")||cc.includes("back")||cc.includes("lumbar");
      const isCervical = dxLabel.includes("cervical")||dxLabel.includes("neck")||cc.includes("neck");
      const isKnee = dxLabel.includes("knee")||cc.includes("knee");
      if (isLumbar) return [
        {name:"Pelvic Tilt",sets:"3",reps:"15",hold:"3s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Motor Control",notes:"Flatten lower back against floor. Breathe normally.",target:"Lumbar stabilisers, transversus abdominis",progression:"Progress to dead bug exercise"},
        {name:"Glute Bridge",sets:"3",reps:"12",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 1 -- Motor Control",notes:"Drive through heels, squeeze glutes at top. Maintain neutral spine.",target:"Gluteus maximus, hamstrings, lumbar extensors",progression:"Single-leg bridge when pain-free"},
        {name:"Bird Dog",sets:"3",reps:"10",hold:"5s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Stability",notes:"Opposite arm and leg, maintain neutral spine. No rotation of pelvis.",target:"Multifidus, gluteus maximus, deep core",progression:"Add resistance band around wrists"},
        {name:"Cat-Cow Stretch",sets:"2",reps:"12",hold:"",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Mobility",notes:"Slow controlled movement, breathe throughout. Avoid pain range.",target:"Spinal mobility, paraspinals",progression:""},
      ];
      if (isCervical) return [
        {name:"Chin Tuck (DNF Activation)",sets:"3",reps:"10",hold:"10s",rest:"30s",freq:"3x Daily",phase:"Phase 1 -- Motor Control",notes:"Nod chin down without flexing neck. Feel length at back of neck. Do not use hands.",target:"Deep neck flexors (longus colli/capitis)",progression:"Add finger resistance on chin"},
        {name:"Cervical Rotation Stretch",sets:"3",reps:"5",hold:"20s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Mobility",notes:"Turn head to pain-free side first. Gently assist with hand at end range.",target:"Cervical rotators, SCM",progression:""},
        {name:"Scapular Retraction",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Squeeze shoulder blades together. No shrug or elevation. Keep chin tucked.",target:"Lower and middle trapezius, rhomboids",progression:"Add resistance band"},
        {name:"Levator Scapulae Stretch",sets:"3",reps:"3",hold:"30s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Flexibility",notes:"Ear to shoulder then rotate chin toward armpit. Breathe and relax into stretch.",target:"Levator scapulae, upper trapezius",progression:""},
      ];
      if (isKnee) return [
        {name:"Quad Set",sets:"3",reps:"15",hold:"5s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Activation",notes:"Flatten knee to surface, contract quad hard. Feel thigh muscle tighten.",target:"Quadriceps (VMO focus)",progression:"Straight leg raise"},
        {name:"Short Arc Quad",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 1 -- Strengthening",notes:"Pillow under knee at 90 degrees. Extend to full extension. Slow and controlled.",target:"Quadriceps, VMO",progression:"Add ankle weight (0.5kg)"},
        {name:"Mini Squat (0-45 deg)",sets:"3",reps:"12",hold:"",rest:"60s",freq:"Daily",phase:"Phase 2 -- Functional",notes:"Controlled descent, weight through heels. Stop before pain. Use wall for balance.",target:"Quadriceps, glutes, knee stabilisers",progression:"Increase depth to 60 degrees"},
        {name:"Terminal Knee Extension (TKE)",sets:"3",reps:"15",hold:"",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Band behind knee. Fully extend from 30 degrees flexion. Slow return.",target:"Quadriceps (VMO), knee joint proprioception",progression:"Increase band resistance"},
      ];
      return [
        {name:"Diaphragmatic Breathing",sets:"1",reps:"10",hold:"5s",rest:"",freq:"3x Daily",phase:"Phase 1 -- Foundation",notes:"Belly breathing. Hands on abdomen and chest. Belly should rise first. Exhale fully.",target:"Diaphragm, core activation, pain modulation",progression:""},
        {name:"Transversus Abdominis Activation",sets:"3",reps:"10",hold:"10s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Motor Control",notes:"Draw navel gently toward spine. Breathe normally. Do not suck stomach in or hold breath.",target:"Transversus abdominis, pelvic floor",progression:"Add limb loading"},
        {name:"Hip Hinge Pattern",sets:"3",reps:"10",hold:"",rest:"60s",freq:"Daily",phase:"Phase 2 -- Functional",notes:"Hinge at hips, maintain neutral spine. Soft knees. Push hips back. Flat back.",target:"Gluteus maximus, hamstrings, spinal extensors",progression:"Add light weight or resistance band"},
        {name:"Prone Hip Extension",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Squeeze glute, lift leg 10cm from surface. Maintain neutral pelvis. No rotation.",target:"Gluteus maximus, hamstrings",progression:"Add ankle weight"},
      ];
    }
    return exs;
  };

  const gatherTechniques = () => {
    // ── 1. Real data: tx_techniques array (TreatmentTechniquesModule) ───────
    const txArr = Array.isArray(d.tx_techniques) ? d.tx_techniques : [];
    if (txArr.length > 0) {
      return txArr.map(t => {
        if (t.type === "manual") return {
          name:      t.technique || "Joint Mobilisation",
          area:      [t.region, t.laterality].filter(Boolean).join(" — "),
          duration:  t.dosage || t.duration || "",
          rationale: [t.grade ? `Grade ${t.grade}` : "", t.response || ""].filter(Boolean).join(". "),
        };
        if (t.type === "dn") return {
          name:      `Dry Needling — ${t.dn_muscle || "Muscle"}`,
          area:      [t.laterality, t.dn_depth ? `depth ${t.dn_depth}mm` : ""].filter(Boolean).join(", "),
          duration:  `${t.dn_needles || "1"} needle${t.dn_needles!="1"?"s":""}${t.dn_twitch ? ` · LTR: ${t.dn_twitch}` : ""}`,
          rationale: t.response || t.notes || "Myofascial trigger point release",
        };
        if (t.type === "st") return {
          name:      t.st_technique || "Soft Tissue Therapy",
          area:      t.st_region || t.laterality || "",
          duration:  t.duration || t.dosage || "",
          rationale: t.response || "",
        };
        // fallback for unknown types
        return {
          name:      t.technique || t.name || "Manual Technique",
          area:      t.region || t.area || "",
          duration:  t.dosage || t.duration || "",
          rationale: t.rationale || t.response || "",
        };
      });
    }
    // ── 2. Manual entries: tx_name_1..10 ────────────────────────────────────
    const techs = [];
    for (let i = 1; i <= 10; i++) {
      const name = d[`tx_name_${i}`] || d[`technique_${i}`] || "";
      if (!name) continue;
      techs.push({ name, area: d[`tx_area_${i}`] || "", duration: d[`tx_duration_${i}`] || "", rationale: d[`tx_rationale_${i}`] || "" });
    }
    return techs;
  };

  const buildAssessmentPdf = () => {
    // ── helpers ──────────────────────────────────────────────────────────
    const v  = (k, fb="") => escHtml(d[k] || fb);
    const av = (k) => { const x = d[k]; return Array.isArray(x) ? x : (typeof x === "string" ? x : "").split("|||").filter(Boolean); };
    const hasAny = (...keys) => keys.some(k => d[k] && String(d[k]).trim() !== "");
    const sec = (icon, title, color, body) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
        <div style="background:${color};padding:6px 12px;display:flex;align-items:center;gap:7px;">
          <span style="font-size:14px;">${icon}</span>
          <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:0.3px;">${title}</span>
        </div>
        <div style="padding:10px 12px;background:#fff;">${body}</div>
      </div>`;
    const fieldRow = (label, value) => value && value !== "--" ? `
      <div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:9px;font-weight:600;color:#6b7280;min-width:120px;flex-shrink:0;padding-top:1px;">${label}</span>
        <span style="font-size:10px;color:#1e293b;flex:1;">${value}</span>
      </div>` : "";
    const grid2 = (items) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${items.join("")}</div>`;
    const miniField = (label, value) => (!value || value === "--") ? "" : `
      <div style="background:#f8fafc;border-radius:6px;padding:6px 8px;border:1px solid #e2e8f0;">
        <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${label}</div>
        <div style="font-size:10px;color:#1e293b;font-weight:500;">${value}</div>
      </div>`;
    const tagList = (items, color="#dc2626", bg="#fee2e2") => items.length ? items.map(i =>
      `<span style="display:inline-block;font-size:9px;font-weight:600;padding:2px 7px;border-radius:10px;background:${bg};color:${color};margin:2px 2px 2px 0;">${escHtml(i)}</span>`).join("") : "";
    const badge = (text, color="#dc2626", bg="#fee2e2") =>
      `<span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;background:${bg};color:${color};white-space:nowrap;">${escHtml(text)}</span>`;
    const testRow = (name, result) => {
      const isPos = /positive|abnormal|restricted|present|reduced|elevated|absent|weak|impaired/i.test(result);
      const isNeg = /negative|normal|full|wn|intact|equal|bilateral/i.test(result);
      const dot = isPos ? `<span style="color:#dc2626;font-weight:800;margin-right:4px;">+</span>` :
                  isNeg ? `<span style="color:#059669;font-weight:800;margin-right:4px;">−</span>` :
                          `<span style="color:#94a3b8;font-weight:800;margin-right:4px;">·</span>`;
      return `<div style="display:flex;gap:4px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        ${dot}
        <span style="font-weight:600;color:#334155;min-width:130px;">${escHtml(name)}</span>
        <span style="color:#64748b;flex:1;">${escHtml(result)}</span>
      </div>`;
    };
    const romRow = (movement, left, right, normal, limitedSide) => {
      if (!left && !right) return "";
      const statusColor = limitedSide ? "#dc2626" : "#059669";
      const statusText  = limitedSide ? `↓ ${limitedSide}` : "WNL";
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${movement}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${right||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#94a3b8;">${normal}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;font-weight:700;color:${statusColor};">${statusText}</td>
      </tr>`;
    };
    const mmtRow = (muscle, left, right) => {
      if (!left && !right) return "";
      const low = (v) => v && parseFloat(v) < 5;
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${muscle}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(left)?"#dc2626":"#059669"};font-weight:${low(left)?"700":"400"};">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(right)?"#dc2626":"#059669"};font-weight:${low(right)?"700":"400"};">${right||"—"}</td>
      </tr>`;
    };

    // ── patient meta ──────────────────────────────────────────────────────
    const patName   = v("dem_name", "Patient");
    const dob       = v("dem_dob");
    const sex       = v("dem_sex");
    const occ       = v("dem_occupation");
    const employer  = v("dem_employer");
    const gp        = v("dem_gp");
    const referral  = v("dem_referral");
    const consent   = v("dem_consent");
    const therapist = v("therapist_name", "___________________");
    const ahpra     = v("therapist_qual", "___________________");
    const clinicAddr = d.clinic_address || "PhysioMind Pro";

    // ── region prefix (for agg/eas) ──────────────────────────────────────
    const regionKey = (() => {
      const r = (d.cc_body_region || "").toLowerCase();
      if (r.includes("lumbar") || r.includes("lower back") || r.includes("lx")) return "lx";
      if (r.includes("cervical") || r.includes("neck") || r.includes("cx")) return "cx";
      if (r.includes("shoulder")) return "sh";
      if (r.includes("knee")) return r.includes("right") ? "knr" : "knl";
      if (r.includes("hip")) return "hip";
      if (r.includes("ankle")) return "ank";
      if (r.includes("elbow")) return "elb";
      if (r.includes("thoracic")) return "tx";
      if (r.includes("wrist")) return "wr";
      return "lx"; // default
    })();

    // ── subjective fields ─────────────────────────────────────────────────
    const cc        = v("cc_main");
    const onset     = v("cc_onset");
    const duration  = v("cc_duration");
    const mechanism = v("cc_mechanism");
    const quality   = v("cc_quality");
    const behaviour = v("cc_24h_pattern") || v("cc_behaviour");
    const vasNow    = v("cc_vas_now");
    const vasWorst  = v("cc_vas_worst");
    const vasBest   = v("cc_vas_best");
    const bodyRegion = v("cc_body_region");

    // aggravating — try region-specific then generic
    const aggMov  = av(`${regionKey}_agg_mov`);
    const aggAct  = av(`${regionKey}_agg_act`);
    const aggPost = av(`${regionKey}_agg_post`);
    const aggAll  = [...aggMov, ...aggAct, ...aggPost];
    const relMov  = av(`${regionKey}_rel_mov`);
    const relPost = av(`${regionKey}_rel_post`);
    const relMed  = av(`${regionKey}_rel_med`);
    const relAll  = [...relMov, ...relPost, ...relMed];

    // red flags
    const rfFields = ["grf_systemic","grf_cancer","grf_fracture","grf_infection","grf_neuro","grf_vascular",
                      `${regionKey}_rf_cauda`,`${regionKey}_rf_fracture`,`${regionKey}_rf_inflammatory`,`${regionKey}_rf_serious`];
    const rfItems = rfFields.flatMap(k => av(k)).filter(x => !/^no /i.test(x) && x.length > 2);
    const rfAction = v("grf_action") || v(`${regionKey}_rf_notes`);
    const yfItems = av(`${regionKey}_yf_beliefs`).concat(av(`${regionKey}_yf_emotion`));

    // PMH
    const pmhConds  = av("pmh_conditions").join(", ") || v("pmh_conditions");
    const pmhMeds   = v("pmh_medications") || v("med_allergies");
    const pmhAllerg = v("med_allergies") || v("pmh_allergies");
    const pmhSurg   = v("pmh_surgical");
    const pmhFam    = v("pmh_family");

    // goals / lifestyle
    const goal      = v("ar_goal_function") || v("goal_main");
    const goalBelief = v("goal_belief") || v("goal_concern");
    const lsExercise = v("ls_exercise");
    const lsSleep    = v("ls_sleep_quality");
    const lsStress   = v("ls_stress");
    const lsWork     = av("ls_occ_demands").join(", ");
    const lsNotes    = v("ls_notes");

    // clinician notes
    const ccNotes  = v("cc_notes");
    const hxNotes  = v("hx_notes");
    const goalNotes = v("goal_notes");

    // ── objective fields ──────────────────────────────────────────────────
    // Observation
    const obsGait    = v("obs_gait");
    const obsPosture = v("obs_posture");
    const obsSwelling = v("obs_swelling");
    const obsWasting = v("obs_muscle_wasting");
    const obsOther   = v("obs_other");

    // Palpation
    const palpTend  = v("palp_tenderness") || v("palp_tender");
    const palpTone  = v("palp_tone") || v("palp_muscle_tone");
    const palpSwel  = v("palp_swelling") || v("palp_swelling_notes");
    const palpOther = v("palp_other") || v("palp_notes");

    // ROM — collect all filled rom_ keys
    const romEntries = [];
    const romPairs = [
      ["Lumbar flexion",   "rom_lx_flex",    "", "lx_flexion",    "", "80°",  ""],
      ["Lumbar extension", "rom_lx_ext",     "", "lx_extension",  "", "25°",  ""],
      ["Lumbar lat flex",  "rom_lx_lat_l",   "rom_lx_lat_r",      "", "25°",  ""],
      ["Cervical flex",    "rom_cx_flex",     "",               "", "50°",  ""],
      ["Cervical ext",     "rom_cx_ext",      "",               "", "60°",  ""],
      ["Cervical rot L",   "rom_cx_rot_l",    "rom_cx_rot_r",   "", "80°",  ""],
      ["Shoulder flex",    "rom_sh_flex_l",   "rom_sh_flex_r",  "", "180°", ""],
      ["Shoulder abd",     "rom_sh_abd_l",    "rom_sh_abd_r",   "", "180°", ""],
      ["Shoulder ER",      "rom_sh_er_l",     "rom_sh_er_r",    "", "90°",  ""],
      ["Shoulder IR",      "rom_sh_ir_l",     "rom_sh_ir_r",    "", "70°",  ""],
      ["Elbow flex",       "rom_elb_flex_l",  "rom_elb_flex_r", "", "145°", ""],
      ["Wrist flex",       "rom_wr_flex_l",   "rom_wr_flex_r",  "", "80°",  ""],
      ["Hip flex",         "rom_hip_flex_l",  "rom_hip_flex_r", "", "120°", ""],
      ["Hip abd",          "rom_hip_abd_l",   "rom_hip_abd_r",  "", "45°",  ""],
      ["Knee flex",        "rom_knee_flex_l", "rom_knee_flex_r","", "140°", ""],
      ["Knee ext",         "rom_knee_ext_l",  "rom_knee_ext_r", "", "0°",   ""],
      ["Ankle DF",         "rom_ankle_df_l",  "rom_ankle_df_r", "", "20°",  ""],
      ["Ankle PF",         "rom_ankle_pf_l",  "rom_ankle_pf_r", "", "50°",  ""],
    ];
    const romRows = romPairs.map(([name, lk, rk, , norm]) => {
      const lv = d[lk] || ""; const rv = d[rk] || "";
      if (!lv && !rv) return "";
      const limited = (lv && /^[0-9]/.test(lv) && parseFloat(lv) < parseFloat(norm)) ? "L" :
                      (rv && /^[0-9]/.test(rv) && parseFloat(rv) < parseFloat(norm)) ? "R" :
                      (lv && /−|lag|limit|restrict/i.test(lv)) ? "L" :
                      (rv && /−|lag|limit|restrict/i.test(rv)) ? "R" : "";
      return romRow(name, lv, rv, norm, limited);
    }).filter(Boolean);

    // MMT
    const mmtPairs = [
      ["Quadriceps",        "mmt_quad_l",      "mmt_quad_r"],
      ["Hamstrings",        "mmt_hams_l",       "mmt_hams_r"],
      ["Glut maximus",      "mmt_glut_max_l",   "mmt_glut_max_r"],
      ["Glut medius",       "mmt_glut_med_l",   "mmt_glut_med_r"],
      ["Hip flexors",       "mmt_hip_flex_l",   "mmt_hip_flex_r"],
      ["Gastroc/soleus",    "mmt_gastroc_l",    "mmt_gastroc_r"],
      ["Tib anterior",      "mmt_tib_ant_l",    "mmt_tib_ant_r"],
      ["EHL (L5)",          "mmt_ehl_l",        "mmt_ehl_r"],
      ["Deltoid",           "mmt_deltoid_l",    "mmt_deltoid_r"],
      ["Rotator cuff",      "mmt_rc_l",         "mmt_rc_r"],
      ["Biceps",            "mmt_biceps_l",     "mmt_biceps_r"],
      ["Triceps",           "mmt_triceps_l",    "mmt_triceps_r"],
      ["Wrist ext",         "mmt_wr_ext_l",     "mmt_wr_ext_r"],
      ["Deep neck flex",    "mmt_dnf_l",        "mmt_dnf_r"],
    ];
    const mmtRows = mmtPairs.map(([name, lk, rk]) => mmtRow(name, d[lk]||"", d[rk]||"")).filter(Boolean);

    // Functional screen
    const fsLabels = {
      kfs_squat:"Double leg squat", kfs_lunge:"Forward lunge", kfs_step_down:"Step down",
      kfs_single_leg:"Single leg squat", kfs_hop:"Single leg hop",
      lfs_flexion:"Lumbar flexion", lfs_extension:"Lumbar extension", lfs_rot:"Lumbar rotation",
      lfs_lateral:"Lateral bend", lfs_squat:"Squat pattern",
      sfs_overhead:"Overhead reach", sfs_push:"Push-up", sfs_pull:"Pull pattern",
      hfs_squat:"Hip single leg squat", hfs_hinge:"Hip hinge", hfs_lunge:"Hip lunge",
      afs_raise:"Calf raise", afs_lunge:"Ankle lunge", afs_hop:"Hop & stick",
    };
    const fsGradeColor = (g) => g >= 2 ? "#dc2626" : g === 1 ? "#d97706" : "#059669";
    const fsGradeLabel = (g) => g >= 2 ? "Abnormal" : g === 1 ? "Compensated" : "Normal";
    const fsScreens = ["kfs_data","lfs_data","sfs_data","hfs_data","afs_data"];
    const fsRows = [];
    fsScreens.forEach(key => {
      if (!d[key]) return;
      try {
        const parsed = typeof d[key] === "string" ? JSON.parse(d[key]) : d[key];
        const grades = parsed.grades || {};
        const notes  = parsed.notes  || {};
        Object.entries(grades).forEach(([id, g]) => {
          const gn = parseInt(g) || 0;
          const label = fsLabels[id] || id.replace(/_/g," ");
          const note  = notes[id] ? escHtml(notes[id]) : "";
          fsRows.push(`<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${escHtml(label)}</td>
            <td style="font-size:9px;padding:4px 6px;text-align:center;">
              <span style="font-weight:700;color:${fsGradeColor(gn)};">${gn} — ${fsGradeLabel(gn)}</span>
            </td>
            <td style="font-size:9px;padding:4px 6px;color:#64748b;">${note}</td>
          </tr>`);
        });
      } catch {}
    });

    // Special tests
    const stKeys = Object.keys(d).filter(k => (k.startsWith("st_") || k.startsWith("lx_slr") || k.startsWith("lx_slump") || k.startsWith("lx_kemp")) && d[k] && String(d[k]).trim());
    const stPos = stKeys.filter(k => /positive|abnormal/i.test(d[k]||""));
    const stNeg = stKeys.filter(k => /negative|normal/i.test(d[k]||"") && !/positive/i.test(d[k]||""));
    const stOth = stKeys.filter(k => !stPos.includes(k) && !stNeg.includes(k));
    const stLabel = (k) => k.replace(/^(st_|lx_)/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

    // Neurological
    const neuroFields = [
      ["L3 sensation", "n_l3_right", "n_l3_left"],
      ["L4 sensation", "n_l4_right", "n_l4_left"],
      ["L5 sensation", "n_l5_right", "n_l5_left"],
      ["S1 sensation", "n_s1_right", "n_s1_left"],
      ["C5 sensation", "n_c5_right", "n_c5_left"],
      ["C6 sensation", "n_c6_right", "n_c6_left"],
      ["C7 sensation", "n_c7_right", "n_c7_left"],
      ["Patellar reflex",  "n_ref_patella_right",  "n_ref_patella_left"],
      ["Achilles reflex",  "n_ref_achilles_right", "n_ref_achilles_left"],
      ["Biceps reflex",    "n_ref_biceps_right",   "n_ref_biceps_left"],
      ["Triceps reflex",   "n_ref_triceps_right",  "n_ref_triceps_left"],
      ["Babinski",         "n_babinski_right",      "n_babinski_left"],
      ["Neural tension",   "n_slr_right",           "n_slr_left"],
      ["Upper limb tension","n_ultt_right",          "n_ultt_left"],
    ];
    const neuroRows = neuroFields.map(([name, rk, lk]) => {
      const rv = d[rk]||""; const lv = d[lk]||"";
      if (!rv && !lv) return "";
      const val = [rv&&`R: ${rv}`, lv&&`L: ${lv}`].filter(Boolean).join(" · ");
      const abnormal = /reduced|absent|impaired|weak|positive|abnormal/i.test(val);
      return `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        <span style="min-width:120px;font-weight:600;color:#334155;flex-shrink:0;">${name}</span>
        <span style="color:${abnormal?"#dc2626":"#334155"};">${escHtml(val)}</span>
      </div>`;
    }).filter(Boolean);
    // Also check free-text neuro fields
    const neuroNotes = v("neuro_clinician_notes") || v("n_notes");

    // Gait
    const gaitObs   = v("gait_observation") || v("obs_gait");
    const gaitDev   = v("gait_deviations");
    const gaitTrend = v("gait_trendelenburg");
    const gaitStep  = v("gait_step_length");
    const gaitNotes = v("gait_notes");

    // Outcome measures
    const omOdi    = v("om_odi_score")  || v("om_odi");
    const omNdi    = v("om_ndi_score")  || v("om_ndi");
    const omPsfs   = v("om_psfs_score") || v("om_psfs");
    const omDash   = v("om_dash_score") || v("om_dash");
    const omLefs   = v("om_lefs_score") || v("om_lefs");
    const omKoosPain = v("om_koos_pain"); const omKoosSport = v("om_koos_sport"); const omKoosQol = v("om_koos_qol");
    const omReport = d.om_report?.scores || {};

    // Advanced assessment
    const kcNotes   = v("kc_notes");
    const fasc      = v("fa_passive_tension") || v("fa_densification");
    const fascNotes = v("fa_compensation_map") || v("fa_remote_test");
    const nktNotes  = v("nkt_notes");
    const cyriaxNotes = v("cyriax_notes") || v("sttt_notes");

    // Diagnosis
    const dxMain  = v("soap_a_diagnosis") || v("soap_a");
    const dxIcd   = v("soap_icd10");
    const dxAssess = v("soap_assessment");
    const dxList  = dx?.dx || [];

    // ── CSS ───────────────────────────────────────────────────────────────
    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{background:#fff;max-width:860px;margin:0 auto 0;box-shadow:0 4px 40px rgba(0,0,0,0.12);page-break-after:always;}
      .page:last-child{page-break-after:auto;}
      .body{padding:22px 32px 28px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;padding:6px 6px;text-align:left;border-bottom:1px solid #e2e8f0;}
      @media print{body{background:white;}.page{box-shadow:none;max-width:100%;}}
    `;

    // ── PAGE FOOTER ───────────────────────────────────────────────────────
    const pgFooter = (n, total) => `
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:7px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;color:#94a3b8;">PhysioMind Pro · CONFIDENTIAL · Patient: ${escHtml(patName)}</span>
        <span style="font-size:8px;color:#94a3b8;">${today} · Page ${n} of ${total}</span>
      </div>`;

    // ── PAGE 1: DEMOGRAPHICS + SUBJECTIVE ────────────────────────────────
    const page1 = `<div class="page">
      ${pdfHeader("Physiotherapy Assessment Report", "Initial Clinical Evaluation", "#1e3a5f")}
      <div class="body">

        ${sec("👤","Patient details","#334155", `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px;">
            ${miniField("Full name", v("dem_name"))}
            ${miniField("Date of birth / Age", dob + (sex ? " · " + sex : ""))}
            ${miniField("Occupation", occ)}
            ${miniField("Referring GP", gp)}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
            ${miniField("Date of assessment", today)}
            ${miniField("Session type", "Initial assessment")}
            ${miniField("Clinician", therapist)}
            ${miniField("AHPRA / Reg no.", ahpra)}
          </div>
        `)}

        ${sec("📋","Chief complaint","#1e3a5f", `
          ${cc && cc !== "--" ? `<div style="border-left:3px solid #1e3a5f;padding:7px 10px;background:#f0f4ff;border-radius:0 6px 6px 0;font-size:10px;font-style:italic;color:#334155;margin-bottom:9px;">"${escHtml(cc)}"</div>` : ""}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${miniField("Body region", bodyRegion)}
            ${miniField("Mechanism / onset", onset)}
            ${miniField("Duration", duration)}
            ${miniField("Pain behaviour", behaviour || quality)}
          </div>
        `)}

        ${sec("📊","Pain scores (NRS /10)","#991b1b", `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <div style="background:#fef2f2;border-radius:8px;padding:10px;text-align:center;border:1px solid #fecaca;">
              <div style="font-size:26px;font-weight:700;color:#dc2626;line-height:1;">${vasNow||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Current</div>
            </div>
            <div style="background:#f5f3ff;border-radius:8px;padding:10px;text-align:center;border:1px solid #ddd6fe;">
              <div style="font-size:26px;font-weight:700;color:#7c3aed;line-height:1;">${vasWorst||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Worst</div>
            </div>
            <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;border:1px solid #bbf7d0;">
              <div style="font-size:26px;font-weight:700;color:#059669;line-height:1;">${vasBest||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Best</div>
            </div>
          </div>
        `)}

        ${(aggAll.length > 0 || relAll.length > 0) ? sec("⬆️","Aggravating & easing factors","#78350f", `
          ${aggAll.length ? `<div style="margin-bottom:8px;"><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Aggravating</div>${tagList(aggAll,"#991b1b","#fee2e2")}</div>` : ""}
          ${relAll.length ? `<div><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Easing</div>${tagList(relAll,"#166534","#dcfce7")}</div>` : ""}
        `) : ""}

        ${sec("🚩","Red & yellow flags","#991b1b", `
          <div style="margin-bottom:6px;">
            ${rfItems.length > 0
              ? `<div style="font-size:8.5px;font-weight:700;color:#991b1b;margin-bottom:4px;">Red flags identified:</div>${tagList(rfItems,"#991b1b","#fee2e2")}`
              : `<span style="font-size:9.5px;color:#059669;font-weight:600;">✓ No red flags identified — safe to proceed</span>`
            }
          </div>
          ${yfItems.length ? `<div><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Yellow flags</div>${tagList(yfItems,"#854d0e","#fef9c3")}</div>` : ""}
          ${rfAction && rfAction !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;">${rfAction}</div>` : ""}
        `)}

        ${sec("🏥","Past medical history & medications","#4c1d95", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${miniField("Medical history", pmhConds)}
            ${miniField("Current medications", pmhMeds)}
            ${miniField("Allergies", pmhAllerg)}
            ${miniField("Previous surgery", pmhSurg)}
            ${miniField("Family history", pmhFam)}
            ${miniField("Previous physiotherapy", v("hx_previous_injury") || v("hx_providers"))}
          </div>
          ${hxNotes && hxNotes !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;padding:5px 8px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;">${hxNotes}</div>` : ""}
        `)}

        ${sec("🎯","Goals & lifestyle","#0f6e56", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            ${miniField("Patient goal", goal)}
            ${miniField("Patient belief / concern", goalBelief)}
            ${miniField("Exercise", lsExercise)}
            ${miniField("Sleep quality", lsSleep)}
            ${miniField("Stress level", lsStress)}
            ${miniField("Work demands", lsWork)}
          </div>
          ${lsNotes && lsNotes !== "--" ? `<div style="font-size:9px;color:#64748b;padding:5px 8px;background:#f0fdf4;border-radius:5px;border:1px solid #bbf7d0;">${lsNotes}</div>` : ""}
          ${goalNotes && goalNotes !== "--" ? `<div style="font-size:9px;color:#64748b;margin-top:4px;padding:5px 8px;background:#f0fdf4;border-radius:5px;border:1px solid #bbf7d0;">${goalNotes}</div>` : ""}
        `)}

        ${ccNotes && ccNotes !== "--" ? sec("📝","Clinician notes — subjective","#334155", `<div style="font-size:10px;color:#334155;line-height:1.6;">${ccNotes}</div>`) : ""}

      </div>
      ${pgFooter(1, 2)}
    </div>`;

    // ── PAGE 2: OBJECTIVE FINDINGS ────────────────────────────────────────
    const obsHasData = hasAny("obs_gait","obs_posture","obs_swelling","obs_muscle_wasting","obs_other");
    const palpHasData = hasAny("palp_tenderness","palp_tender","palp_tone","palp_muscle_tone","palp_swelling","palp_notes","palp_other");
    const romHasData  = romRows.length > 0;
    const mmtHasData  = mmtRows.length > 0;
    const fsHasData   = fsRows.length > 0;
    const stHasData   = stKeys.length > 0;
    const neuroHasData = neuroRows.length > 0 || neuroNotes !== "--";
    const gaitHasData = hasAny("gait_observation","obs_gait","gait_deviations","gait_notes");
    const omHasData   = hasAny("om_odi_score","om_odi","om_ndi_score","om_ndi","om_psfs_score","om_lefs_score","om_koos_pain","om_koos_sport");
    const advHasData  = hasAny("kc_notes","fa_passive_tension","fa_densification","fa_compensation_map","nkt_notes","cyriax_notes","sttt_notes");

    const page2 = `<div class="page">
      ${pdfHeader("Objective Findings", "Assessment & Advanced Assessment", "#0f6e56")}
      <div class="body">

        ${(obsHasData || palpHasData) ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${obsHasData ? sec("👁️","Observation","#334155", `
            ${obsGait    && obsGait    !== "--" ? fieldRow("Gait", obsGait) : ""}
            ${obsPosture && obsPosture !== "--" ? fieldRow("Posture", obsPosture) : ""}
            ${obsSwelling && obsSwelling !== "--" ? fieldRow("Swelling", obsSwelling) : ""}
            ${obsWasting && obsWasting !== "--" ? fieldRow("Muscle wasting", obsWasting) : ""}
            ${obsOther   && obsOther   !== "--" ? fieldRow("Other", obsOther) : ""}
          `) : ""}
          ${palpHasData ? sec("🖐️","Palpation","#334155", `
            ${palpTend  && palpTend  !== "--" ? fieldRow("Tenderness", palpTend) : ""}
            ${palpTone  && palpTone  !== "--" ? fieldRow("Muscle tone", palpTone) : ""}
            ${palpSwel  && palpSwel  !== "--" ? fieldRow("Swelling", palpSwel) : ""}
            ${palpOther && palpOther !== "--" ? fieldRow("Other", palpOther) : ""}
          `) : ""}
        </div>` : ""}

        ${romHasData ? sec("📐","Range of motion","#0f6e56", `
          <table><thead><tr>
            <th style="width:35%">Movement</th>
            <th style="width:15%;text-align:center;">Left</th>
            <th style="width:15%;text-align:center;">Right</th>
            <th style="width:15%;text-align:center;">Normal</th>
            <th style="width:20%;text-align:center;">Status</th>
          </tr></thead><tbody>${romRows.join("")}</tbody></table>
        `) : ""}

        ${(mmtHasData || fsHasData) ? `
        <div style="display:grid;grid-template-columns:${mmtHasData && fsHasData ? "1fr 1fr" : "1fr"};gap:10px;">
          ${mmtHasData ? sec("💪","Manual muscle testing (MMT)","#1e3a5f", `
            <table><thead><tr>
              <th>Muscle</th>
              <th style="text-align:center;">L</th>
              <th style="text-align:center;">R</th>
            </tr></thead><tbody>${mmtRows.join("")}</tbody></table>
          `) : ""}
          ${fsHasData ? sec("🏃","Functional movement screen","#14532d", `
            <table><thead><tr>
              <th>Test</th>
              <th style="width:120px;">Grade</th>
              <th>Notes</th>
            </tr></thead><tbody>${fsRows.join("")}</tbody></table>
          `) : ""}
        </div>` : ""}

        ${stHasData ? sec("🔬","Special tests","#78350f", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
            <div>
              ${stPos.length ? `<div style="font-size:8.5px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Positive</div>
              ${stPos.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
              ${stOth.length ? `<div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:6px 0 4px;">Other findings</div>
              ${stOth.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
            </div>
            <div>
              ${stNeg.length ? `<div style="font-size:8.5px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Negative</div>
              ${stNeg.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
            </div>
          </div>
        `) : ""}

        ${neuroHasData ? sec("⚡","Neurological findings","#312e81", `
          ${neuroRows.join("")}
          ${neuroNotes && neuroNotes !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;padding:5px 8px;background:#eef2ff;border-radius:5px;">${neuroNotes}</div>` : ""}
        `) : ""}

        ${gaitHasData ? sec("🚶","Gait analysis","#1e3a5f", `
          ${gaitObs  && gaitObs  !== "--" ? fieldRow("Observation", gaitObs) : ""}
          ${gaitDev  && gaitDev  !== "--" ? fieldRow("Deviations", gaitDev) : ""}
          ${gaitTrend && gaitTrend !== "--" ? fieldRow("Trendelenburg", gaitTrend) : ""}
          ${gaitStep && gaitStep !== "--" ? fieldRow("Step length", gaitStep) : ""}
          ${gaitNotes && gaitNotes !== "--" ? fieldRow("Notes", gaitNotes) : ""}
        `) : ""}

        ${omHasData ? sec("📈","Outcome measures","#0f6e56", `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
            ${omOdi   && omOdi   !== "--" ? `<div style="text-align:center;background:#fef2f2;border-radius:8px;padding:8px 4px;border:1px solid #fecaca;"><div style="font-size:18px;font-weight:700;color:#dc2626;">${omOdi}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">ODI</div></div>` : ""}
            ${omNdi   && omNdi   !== "--" ? `<div style="text-align:center;background:#fef2f2;border-radius:8px;padding:8px 4px;border:1px solid #fecaca;"><div style="font-size:18px;font-weight:700;color:#dc2626;">${omNdi}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">NDI</div></div>` : ""}
            ${omLefs  && omLefs  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omLefs}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">LEFS</div></div>` : ""}
            ${omPsfs  && omPsfs  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omPsfs}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">PSFS</div></div>` : ""}
            ${omDash  && omDash  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omDash}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">DASH</div></div>` : ""}
            ${omKoosPain && omKoosPain !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosPain}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS Pain</div></div>` : ""}
            ${omKoosSport && omKoosSport !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosSport}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS Sport</div></div>` : ""}
            ${omKoosQol && omKoosQol !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosQol}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS QoL</div></div>` : ""}
          </div>
          ${Object.keys(omReport).length ? `<div style="margin-top:8px;font-size:9px;color:#64748b;">${Object.entries(omReport).map(([k,v2])=>`<b>${k.toUpperCase()}</b>: ${v2}`).join(" · ")}</div>` : ""}
        `) : ""}

        ${advHasData ? sec("🔭","Advanced assessment","#4c1d95", `
          ${kcNotes && kcNotes !== "--" ? fieldRow("Kinetic chain", kcNotes) : ""}
          ${fascNotes && fascNotes !== "--" ? fieldRow("Fascia / SBL", fascNotes) : ""}
          ${nktNotes && nktNotes !== "--" ? fieldRow("CPA / NKT pattern", nktNotes) : ""}
          ${cyriaxNotes && cyriaxNotes !== "--" ? fieldRow("STTT / Cyriax", cyriaxNotes) : ""}
        `) : ""}

        ${(dxMain && dxMain !== "--") || dxList.length > 0 ? sec("🩺","Clinical diagnosis","#1e3a5f", `
          ${dxList.length > 0 ? dxList.slice(0,4).map((dx2, i) => `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #f1f5f9;">
              <div style="width:18px;height:18px;border-radius:50%;background:${["#1e3a5f","#334155","#475569","#64748b"][i]};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;">${i+1}</div>
              <div>
                <div style="font-size:10.5px;font-weight:700;color:#1e293b;">${escHtml(dx2.diagnosis||"")}</div>
                <div style="font-size:8.5px;color:#64748b;margin-top:1px;">${dx2.icd10||""} ${dx2.confidence ? "· Confidence: " + Math.round(dx2.confidence) + "%" : ""}</div>
              </div>
            </div>`).join("") : ""}
          ${dxMain && dxMain !== "--" ? `<div style="margin-top:8px;font-size:10px;color:#334155;line-height:1.6;padding:8px;background:#f0f4ff;border-radius:6px;">${dxMain}</div>` : ""}
          ${dxIcd  && dxIcd  !== "--" ? `<div style="margin-top:4px;font-size:9px;color:#64748b;">ICD-10: ${dxIcd}</div>` : ""}
          ${dxAssess && dxAssess !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#334155;line-height:1.6;">${dxAssess}</div>` : ""}
        `) : ""}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:8px 4px;margin-top:4px;">
          <div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:18px;">Physiotherapist signature:</div>
            <div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div>
            <div style="font-size:8px;color:#94a3b8;">Name · AHPRA registration no. · Date</div>
          </div>
          <div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:18px;">Next review / follow-up:</div>
            <div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div>
            <div style="font-size:8px;color:#94a3b8;">Date · Treating clinician · Location</div>
          </div>
        </div>

      </div>
      ${pgFooter(2, 2)}
    </div>`;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Assessment Report — ${escHtml(patName)}</title>
      <style>${css}</style>
    </head><body>${page1}${page2}</body></html>`;
  };


  const buildTreatmentPdf = () => {
    const exercises = gatherExercises();
    const techniques = gatherTechniques();
    const sessions = Array.isArray(d.tx_sessions) ? [...d.tx_sessions] : [];
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Musculoskeletal Dysfunction");
    const phaseColors = {"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const groupedExercises = exercises.reduce((acc, ex) => { const p = ex.phase || "Phase 1"; if(!acc[p]) acc[p]=[]; acc[p].push(ex); return acc; }, {});
    const svgKeys = Object.keys(exerciseSvgs);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Treatment Plan - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Physiotherapy Treatment Plan","Evidence-Based Clinical Management Program","#059669")}
<div class="body">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
    <div style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Patient Details</div>${[["Patient",escHtml(patName)],["DOB / Age",`${escHtml(dob)} / ${escHtml(String(age))}`],["Sex",escHtml(sex)],["Occupation",escHtml(occ)]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(5,150,105,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</span></div>`).join("")}</div>
    <div style="background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Working Diagnosis &amp; Plan</div><div style="font-size:13px;font-weight:800;color:#1a3a5c;margin-bottom:8px;line-height:1.3;">${dxLabel}</div>${[["Pain (VAS Now)",(d.pa_vas_now||d.cc_vas_now||"--")+"/10"],["Treatment Frequency",d.tx_frequency||d.soap_frequency||"2&ndash;3x per week"],["Expected Duration",d.tx_duration_plan||d.tx_plan_duration||"6&ndash;8 wks"],["Sessions Planned",d.tx_plan_sessions||d.plan_sessions||"--"],["Sessions Done",String(sessions.length)||"0"],["Plan Start",d.tx_plan_start||"--"]].filter(([,v])=>v&&v!=="--").map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(37,99,235,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(String(v))}</span></div>`).join("")}</div>
  </div>
  ${sectionCard("Treatment Goals","&#127919;",`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">${[
    ["Short-Term (2&ndash;4 wks)","#0891b2",[d.ar_goal_pain||"Pain reduction &ge;30% on VAS",d.ar_goal_function||"Improve functional ROM","Reduce swelling/inflammation"]],
    ["Medium-Term (4&ndash;8 wks)","#2563eb",[d.ar_goal_str||"Restore muscle strength to 4+/5",d.ar_goal_func||"Functional task independence","Return to work/leisure activities"]],
    ["Long-Term (8&ndash;12 wks)","#059669",[d.ar_goal_return||"Full return to prior activity","Self-management strategies","Prevent recurrence"]],
  ].map(([title,color,goals])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:8px;padding:12px;"><div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>${goals.map(g=>`<div style="font-size:9.5px;color:#1a3a5c;padding:4px 0;border-bottom:1px solid ${color}15;display:flex;gap:6px;align-items:flex-start;"><span style="color:${color};font-weight:700;flex-shrink:0;">&#10003;</span><span>${escHtml(String(g))}</span></div>`).join("")}</div>`).join("")}</div>`,"#059669")}
  ${sectionCard("Manual Therapy &amp; Treatment Techniques","&#129330;",`<table><thead><tr><th>Technique</th><th>Target Area</th><th>Duration / Dosage</th><th>Evidence Base</th></tr></thead><tbody>${techniques.length>0?techniques.map(t=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(t.name)}</td><td style="font-size:10px;">${escHtml(t.area)}</td><td style="font-size:10px;">${escHtml(t.duration)}</td><td style="font-size:9.5px;color:#6b7280;">${escHtml(t.rationale)}</td></tr>`).join(""):
[["Soft Tissue Mobilisation","Hypertonic muscles / trigger points","5&ndash;10 min per area","Level 1A &mdash; Cochrane Review"],["Joint Mobilisation (Grade III&ndash;IV)","Restricted articular joint segments","3 sets PA pressure","Level 1B &mdash; RCT evidence"],["Therapeutic Ultrasound","Periarticular / tendon tissue","1MHz, 1.0 W/cm&sup2;, 5 min","Level 2B"],["Dry Needling / IMS","Myofascial trigger points","As clinically indicated","Level 1B &mdash; multiple RCTs"],["Taping (Kinesio / Rigid)","Joint support / proprioception","72 hrs per application","Level 2"],["TENS / Electrotherapy","Pain modulation (gate control)","80Hz, 20 min","Level 2B &mdash; analgesic effect"],].map(([tech,target,dose,ev])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${tech}</td><td style="font-size:10px;">${target}</td><td style="font-size:10px;">${dose}</td><td style="font-size:9px;color:#6b7280;">${ev}</td></tr>`).join("")}</tbody></table>`,"#d97706")}
  ${Object.entries(groupedExercises).map(([phase,exs])=>{const pColor=phaseColors[phase]||"#2563eb";return sectionCard(`Exercise Prescription &mdash; ${phase}`,"&#127959;",`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">${exs.map((ex,i)=>{const svgType=svgKeys[i%svgKeys.length];return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;"><div style="background:${pColor}10;border-bottom:1px solid ${pColor}20;padding:8px 12px;display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</span><span style="font-size:11px;font-weight:700;color:#1a3a5c;">${escHtml(ex.name)}</span></div><div style="padding:10px 12px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">${[["Sets",ex.sets],["Reps",ex.reps],ex.hold?["Hold",ex.hold]:null,["Rest",ex.rest],["Frequency",ex.freq]].filter(Boolean).map(([l,v])=>`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;text-align:center;"><div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:700;color:${pColor};">${escHtml(v)}</div></div>`).join("")}</div>${ex.target?`<div style="font-size:8.5px;color:#0891b2;margin-bottom:4px;"><strong>Target:</strong> ${escHtml(ex.target)}</div>`:""}${ex.notes?`<div style="background:#fff;border-radius:6px;padding:6px 8px;font-size:8.5px;color:#6b7280;line-height:1.5;border:1px solid #e2e8f0;">${escHtml(ex.notes)}</div>`:""}${ex.progression?`<div style="margin-top:5px;font-size:8px;color:#059669;"><strong>&#11014; Progression:</strong> ${escHtml(ex.progression)}</div>`:""}</div></div>`;}).join("")}</div>`,pColor);}).join("")}
  ${(()=>{
    const vasBaseline = sessions.length>0 ? (parseFloat(sessions[sessions.length-1].vasStart)||0) : (parseFloat(d.pa_vas_now||d.cc_vas_now)||0);
    const vasNow      = sessions.length>0 ? (parseFloat(sessions[0].vasEnd||sessions[0].vasStart)||0) : vasBaseline;
    const targetVas   = Math.max(0, vasBaseline-3);
    const psfsNow     = d.om_psfs1_now||d.psfs_score||"";
    const psfsGoal    = d.om_psfs1_goal||"7";
    const vasDiff     = vasBaseline - vasNow;
    const vasPct      = vasBaseline>0 ? Math.round((vasDiff/vasBaseline)*100) : 0;
    const progColor   = vasDiff>0?"#059669":vasDiff<0?"#dc2626":"#6b7280";
    const sessionRows = sessions.length>0
      ? sessions.slice().reverse().map((s,i)=>{
          const vs=parseFloat(s.vasStart||"0")||0, ve=parseFloat(s.vasEnd||s.vasStart||"0")||0;
          const vc=vs-ve, vCol=vc>0?"#059669":vc<0?"#dc2626":"#6b7280";
          const arrow=vc>0?"&#9660;":vc<0?"&#9650;":"&harr;";
          const tx=String(s.treatmentGiven||s.treatment||""); const txShort=tx.slice(0,65)+(tx.length>65?"…":"");
          const resp=String(s.response||""); const respShort=resp.slice(0,60)+(resp.length>60?"…":"");
          return `<tr style="background:${i%2===0?"#fff":"#f8fafc"};border-bottom:1px solid #e2e8f0;">
            <td style="font-size:9px;font-weight:700;color:#2563eb;padding:6px 8px;white-space:nowrap;">S${escHtml(String(s.sessionNo||i+1))}</td>
            <td style="font-size:9px;color:#6b7280;padding:6px 8px;white-space:nowrap;">${escHtml(s.date||"")}</td>
            <td style="font-size:9px;padding:6px 8px;white-space:nowrap;"><span style="font-weight:700;color:#dc2626;">${vs}/10</span> <span style="color:${vCol};font-weight:700;">${arrow}</span> <span style="font-weight:700;color:${vCol};">${ve}/10</span></td>
            <td style="font-size:9px;color:#374151;padding:6px 8px;">${escHtml(txShort)}</td>
            <td style="font-size:8.5px;color:#6b7280;padding:6px 8px;">${escHtml(respShort)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;padding:16px;font-size:9px;color:#94a3b8;">No sessions logged yet — use Quick Visit to record each treatment session.</td></tr>`;
    return sectionCard("Outcome Measures &amp; Session Log","&#128200;",`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Baseline &amp; Target</div>
          <table><thead><tr><th>Measure</th><th>Baseline</th><th>Target</th></tr></thead><tbody>
            ${[["VAS Pain",vasBaseline?vasBaseline+"/10":"--",vasBaseline?"&le;"+targetVas+"/10":"--"],["VAS Worst",d.pa_vas_worst?d.pa_vas_worst+"/10":"--","&le;5/10"],["PSFS Score",psfsNow?psfsNow+"/10":"--",psfsNow?"&ge;"+psfsGoal+"/10":"--"],["Patient Goal",escHtml(d.ar_goal_function||d.ar_goal_pain||"--"),"Achieved"]].filter(([,b])=>b&&b!=="--").map(([m,b,t])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;padding:5px 6px;">${m}</td><td style="font-size:9px;font-weight:700;color:#dc2626;padding:5px 6px;">${b}</td><td style="font-size:9px;font-weight:700;color:#059669;padding:5px 6px;">${t}</td></tr>`).join("")}
          </tbody></table>
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Progress Summary</div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0;">
            ${[["Sessions Completed",String(sessions.length),"#1a3a5c"],["VAS Baseline",vasBaseline?vasBaseline+"/10":"Not recorded","#dc2626"],["VAS Current",vasNow&&sessions.length?vasNow+"/10":"Not recorded",progColor],["Pain Change",sessions.length&&vasBaseline?(vasDiff>=0?"-":"+")+(Math.abs(vasPct))+"%":"--",progColor]].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #e2e8f0;"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:700;color:${c};">${v}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Session History</div>
      <div style="overflow-x:auto;"><table style="min-width:600px;"><thead><tr><th style="width:40px;">Sess.</th><th style="width:75px;">Date</th><th style="width:110px;">Pain (Start&#8594;End)</th><th>Treatment Given</th><th style="width:160px;">Response</th></tr></thead>
        <tbody>${sessionRows}</tbody>
      </table></div>
    `,"#0891b2");
  })()}
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Therapist Signature:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Name / AHPRA: ___________________</div></div><div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Date:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Review Date: ___________________</div></div></div>
</div>
${pdfFooter("Treatment Plan")}
</div></body></html>`;
  };

  const buildHomeExercisePdf = () => {
    const exercises = gatherExercises();
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Your Condition");
    const nextAppt = d.next_appointment || "_______________________";
    const physioName = d.therapist_name || "Your Physiotherapist";
    const clinicName = d.clinic_name || "PhysioMind Clinic";
    const clinicPhone = d.clinic_phone || "";
    const svgKeys = Object.keys(exerciseSvgs);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Program - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:24px 36px;}.ex-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;break-inside:avoid;box-shadow:0 2px 8px rgba(0,0,0,0.05);}.ex-body{display:grid;grid-template-columns:130px 1fr;}.ex-img{background:#f8fafc;padding:12px;display:flex;align-items:center;justify-content:center;border-right:1px solid #e2e8f0;}.ex-content{padding:14px 16px;}.dosage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(75px,1fr));gap:8px;margin-bottom:10px;}.dosage-chip{text-align:center;padding:7px 6px;border-radius:8px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Home Exercise Program","Your Personalised Daily Rehabilitation Protocol","#7c3aed")}
<div class="body">
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:16px;align-items:flex-start;">
    <div style="font-size:28px;flex-shrink:0;">&#127968;</div>
    <div><div style="font-size:14px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">Hello, ${escHtml(patName.split(" ")[0]||patName)}!</div><div style="font-size:10.5px;color:#6b7280;line-height:1.6;">This personalised home exercise program has been designed specifically for you by <strong style="color:#1a3a5c;">${escHtml(physioName)}</strong> to help manage <strong style="color:#7c3aed;">${dxLabel}</strong>. Performing these exercises consistently is essential for your recovery.</div><div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">${[["&#128197;","Program Start",today],["&#128222;","Next Appointment",escHtml(nextAppt)],["&#127973;","Clinic",escHtml(clinicName)]].map(([icon,l,v])=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><span>${icon}</span><div><div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</div></div></div>`).join("")}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">${[
    ["&#128680;","Stop if you feel...","Sharp or shooting pain &bull; Numbness / tingling &bull; Sudden severe pain &bull; Dizziness or nausea","#dc2626"],
    ["&#9989;","Good pain is OK","Mild muscle ache/burn = normal. This means your muscles are working. Soreness lasting &lt;24h is acceptable.","#059669"],
    ["&#128222;","When to call us",`Contact ${escHtml(clinicName)} if symptoms worsen significantly. Do not push through severe pain.${clinicPhone?" Ph: "+escHtml(clinicPhone):""}`, "#2563eb"],
  ].map(([icon,title,text,color])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:10px;padding:12px 14px;"><div style="font-size:18px;margin-bottom:6px;">${icon}</div><div style="font-size:10px;font-weight:700;color:${color};margin-bottom:5px;">${title}</div><div style="font-size:9px;color:#6b7280;line-height:1.5;">${text}</div></div>`).join("")}</div>
  <div style="margin-bottom:14px;font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #7c3aed;padding-bottom:8px;">Your Exercises &mdash; ${exercises.length} Total</div>
  ${exercises.map((ex,i)=>{
    const phaseColors2={"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const pColor=phaseColors2[ex.phase]||"#7c3aed";
    const svgType=svgKeys[i%svgKeys.length];
    const steps=ex.notes?[ex.notes]:["Get into the starting position as shown in the illustration.","Move slowly and in a controlled manner throughout.","Hold for the time indicated, then return to start position.","Breathe normally throughout &mdash; do not hold your breath."];
    return `<div class="ex-card">
      <div style="background:linear-gradient(135deg,${pColor}15,${pColor}05);border-bottom:1px solid ${pColor}30;padding:12px 16px;display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#1a3a5c;">${escHtml(ex.name)}</div><div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap;"><span style="display:inline-block;padding:3px 8px;background:${pColor}15;border:1px solid ${pColor}40;border-radius:5px;font-size:9px;font-weight:700;color:${pColor};">${escHtml(ex.phase||"Phase 1")}</span>${ex.target?`<span style="display:inline-block;padding:3px 8px;background:#0891b215;border:1px solid #0891b240;border-radius:5px;font-size:9px;font-weight:700;color:#0891b2;">${escHtml(ex.target)}</span>`:""}</div></div>
        <div style="text-align:right;"><div style="font-size:9px;color:#6b7280;">Frequency</div><div style="font-size:12px;font-weight:800;color:${pColor};">${escHtml(ex.freq||"Daily")}</div></div>
      </div>
      <div class="ex-body">
        <div class="ex-img">${exerciseSvgHtml(i, pColor)}</div>
        <div class="ex-content">
          <div class="dosage-grid">${[["Sets",ex.sets,pColor],["Reps",ex.reps,"#2563eb"],ex.hold?["Hold",ex.hold,"#0891b2"]:null,["Rest",ex.rest||"30s","#6b7280"]].filter(Boolean).map(([l,v,c])=>`<div class="dosage-chip" style="background:${c}10;border:1px solid ${c}30;"><div style="font-size:7.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${l}</div><div style="font-size:14px;font-weight:800;color:${c};line-height:1.2;">${escHtml(v)}</div></div>`).join("")}</div>
          <div style="margin-bottom:8px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Instructions</div>${steps.map((step,si)=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e2e8f0;align-items:flex-start;font-size:10px;line-height:1.5;"><div style="width:20px;height:20px;min-width:20px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;">${si+1}</div><span style="color:#1a3a5c;">${escHtml(step)}</span></div>`).join("")}</div>
          ${ex.progression?`<div style="margin-top:6px;padding:6px 10px;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:6px;font-size:8.5px;"><strong style="color:#059669;">&#11014; When easier, progress to:</strong> ${escHtml(ex.progression)}</div>`:""}
        </div>
      </div>
    </div>`;
  }).join("")}
  ${sectionCard("Weekly Compliance Tracker","&#128197;",`<div style="margin-bottom:8px;font-size:10px;color:#6b7280;">Tick each day you complete your exercises. Aim for consistency!</div><table><thead><tr style="background:#f1f5f9;"><th style="width:35%;">Exercise</th>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=>`<th style="text-align:center;font-size:9px;font-weight:700;color:#6b7280;">${day}</th>`).join("")}</tr></thead><tbody>${exercises.map((ex,i)=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${i+1}. ${escHtml(ex.name)}</td>${Array(7).fill(0).map(()=>`<td style="text-align:center;padding:8px;"><div style="width:22px;height:22px;border:1.5px solid #e2e8f0;border-radius:4px;margin:0 auto;"></div></td>`).join("")}</tr>`).join("")}</tbody></table><div style="margin-top:12px;font-size:9px;color:#6b7280;">Pain Score Today (0&ndash;10): ___ / 10 &nbsp;&nbsp;&nbsp; Overall feeling: &#9633; Great &nbsp; &#9633; OK &nbsp; &#9633; Struggling</div>`,"#0891b2")}
  ${sectionCard("7-Day Pain Diary","&#128212;",`<div style="font-size:9px;color:#6b7280;margin-bottom:10px;">Record your pain and how you are feeling each day. Bring this to your next appointment.</div><table><thead><tr><th>Date</th><th>Morning Pain (0&ndash;10)</th><th>Evening Pain (0&ndash;10)</th><th>Exercises Done?</th><th>Notes</th></tr></thead><tbody>${Array(7).fill(0).map((_,i)=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;color:#94a3b8;padding:10px;">Day ${i+1}</td><td style="padding:10px;"><div style="width:60px;border-bottom:1px solid #e2e8f0;height:18px;"></div></td><td style="padding:10px;"><div style="width:60px;border-bottom:1px solid #e2e8f0;height:18px;"></div></td><td style="padding:10px;"><div style="display:flex;gap:8px;font-size:9px;"><span>&#9633; Yes</span><span>&#9633; No</span></div></td><td style="padding:10px;"><div style="width:100%;border-bottom:1px solid #e2e8f0;height:18px;"></div></td></tr>`).join("")}</tbody></table>`,"#7c3aed")}
  ${sectionCard("Lifestyle Advice","&#128161;",`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${[["&#10052;","Ice / Heat","Apply ice (cold pack wrapped in cloth) for 15&ndash;20 min if swollen or inflamed. Apply heat for stiffness or muscle tightness. Never apply directly to skin.","#0891b2"],["&#128716;","Activity Modification","Stay as active as possible within your pain limits. Avoid complete bed rest. Short, frequent walks are beneficial.","#059669"],["&#129506;","Posture Awareness","Be mindful of your posture during daily activities, especially sitting and lifting. Apply the postural cues discussed in your session.","#7c3aed"],["&#128222;","When to Seek Help","Return to your physiotherapist or GP immediately if: symptoms significantly worsen, new symptoms develop, or you experience any new neurological symptoms.","#dc2626"],].map(([icon,title,text,color])=>`<div style="background:${color}06;border:1px solid ${color}20;border-radius:8px;padding:10px 12px;"><div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;"><span style="font-size:14px;">${icon}</span><span style="font-size:10px;font-weight:700;color:${color};">${title}</span></div><div style="font-size:9px;color:#6b7280;line-height:1.5;">${text}</div></div>`).join("")}</div>`,"#059669")}
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;"><div><div style="font-size:12px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">${escHtml(clinicName)}</div>${clinicPhone?`<div style="font-size:11px;font-weight:600;color:#2563eb;margin-top:4px;">&#128222; ${escHtml(clinicPhone)}</div>`:""}</div><div style="border-left:1px solid rgba(124,58,237,0.2);padding-left:16px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Next Appointment</div><div style="font-size:14px;font-weight:800;color:#7c3aed;">${escHtml(nextAppt)}</div><div style="font-size:9px;color:#6b7280;margin-top:4px;">Bring this program to your session</div></div></div>
</div>
${pdfFooter("Home Exercise Program &mdash; Patient Copy")}
</div></body></html>`;
  };

  const buildPostureReportPdf = () => {
    const postScore = d.posture_score || d.post_score || "N/A";
    const postBand  = d.posture_band  || d.post_band  || "N/A";
    const cva       = d.post_cva      || d.cva_angle  || "N/A";
    const fhp       = d.post_fhp_dist || d.fhp_dist   || "N/A";
    const shAngle   = d.post_shoulder_angle || d.shoulder_angle || "N/A";
    const kyph      = d.post_kyphosis_angle || d.kyphosis_angle || "N/A";
    const lord      = d.post_lordosis_angle || d.lordosis_angle || "N/A";
    const pelv      = d.post_pelvic_tilt    || d.pelvic_tilt    || "N/A";
    const reliability = d.posture_reliability || "N/A";
    const view      = d.posture_view || "Anterior";
    const DEFECT_LABELS = {
      forward_head:"Forward Head Posture (CVA reduced)",rounded_shoulders:"Rounded/Protracted Shoulders",
      thoracic_kyphosis:"Increased Thoracic Kyphosis",lumbar_hyperlordosis:"Lumbar Hyperlordosis",
      anterior_pelvic_tilt:"Anterior Pelvic Tilt",posterior_pelvic_tilt:"Posterior Pelvic Tilt",
      lateral_pelvic_tilt:"Lateral Pelvic Tilt",genu_valgum:"Knee Medial Tendency (clinical assessment required)",
      genu_varum:"Knee Lateral Tendency (clinical assessment required)",foot_pronation:"Foot Overpronation / Flat Arch",
      foot_supination:"Foot Supination / High Arch",scoliosis:"Lateral Spinal Curvature Tendency (clinical assessment required)",
      head_tilt:"Lateral Head Tilt",scapular_winging:"Scapular Winging",
    };
    const DEFECT_MUSCLES = {
      forward_head:{tight:["Upper trapezius","SCM","Suboccipitals"],weak:["Deep neck flexors","Lower trapezius"]},
      rounded_shoulders:{tight:["Pec major","Pec minor","Subscapularis"],weak:["Lower trapezius","Rhomboids"]},
      thoracic_kyphosis:{tight:["Pec major/minor","Ant intercostals"],weak:["Thoracic extensors","Lower trap"]},
      lumbar_hyperlordosis:{tight:["Iliopsoas","QL","Lumbar erectors"],weak:["Gluteus maximus","TA"]},
      anterior_pelvic_tilt:{tight:["Iliopsoas","Rectus femoris","TFL"],weak:["Gluteus maximus","Hamstrings"]},
      posterior_pelvic_tilt:{tight:["Hamstrings","Gluteus max","Rect abdominis"],weak:["Hip flexors","Lumb ext"]},
      lateral_pelvic_tilt:{tight:["Ipsilateral QL","Ipsilateral TFL"],weak:["Contralateral glut med"]},
      genu_valgum:{tight:["TFL","IT band","Hip adductors"],weak:["Glut med","VMO","Hip ext rotators"]},
      genu_varum:{tight:["IT band","Biceps femoris"],weak:["Hip adductors","VMO"]},
      foot_pronation:{tight:["Gastrocnemius","Soleus","Peroneals"],weak:["Tib posterior","Intrinsic foot"]},
      foot_supination:{tight:["IT band","Plantar fascia"],weak:["Peroneals","Intrinsic foot muscles"]},
      scoliosis:{tight:["Ipsilateral paraspinals","Ipsilateral QL"],weak:["Contralateral paraspinals"]},
      head_tilt:{tight:["Ipsilat upper trap","SCM","Levator scap"],weak:["Contralat lateral neck flexors"]},
      scapular_winging:{tight:["Pec minor","Ant shoulder"],weak:["Serratus anterior","Lower trapezius"]},
    };
    const DEFECT_RX = {
      forward_head:"Chin tucks x15 daily - DNF activation - Pec minor stretch",
      rounded_shoulders:"Band pull-apart x20 - Face pulls x15 - Pec doorway stretch",
      thoracic_kyphosis:"Foam roller extension T4-T8 - T-spine rotation - Prone Y-T-W",
      lumbar_hyperlordosis:"Hip flexor couch stretch - Glute bridges 3x15 - Dead bug",
      anterior_pelvic_tilt:"Pelvic tilts - Couch stretch - Glute activation",
      posterior_pelvic_tilt:"Hip flexor stretching - Lumbar extension - Cat-cow",
      lateral_pelvic_tilt:"Side-lying hip abduction - Clamshells - QL stretch",
      genu_valgum:"Clamshells - Monster walks - Single-leg squat with knee tracking",
      genu_varum:"IT band foam rolling - Hip adductor strengthening",
      foot_pronation:"Short foot exercise - Calf raises - Tib posterior strengthening",
      foot_supination:"Peroneal strengthening - Single-leg balance - Lateral band walks",
      scoliosis:"Schroth breathing - Concave-side stretch - Convex-side strengthening",
      head_tilt:"Contralat cervical lat flexion stretch - Upper trap SMR",
      scapular_winging:"Serratus ant wall push-ups - Lower trap Y-T-W",
    };
    const selectedDefects = Object.keys(DEFECT_LABELS).filter(function(id) { return d["posture_defect_" + id]; });
    const dxLabel = escHtml((dx && dx.dx && dx.dx[0] && dx.dx[0].label) ? dx.dx[0].label : (d.cc_main || "Postural Dysfunction"));
    const scoreNum = parseFloat(postScore) || 0;
    const scoreColor = scoreNum >= 75 ? "#059669" : scoreNum >= 50 ? "#d97706" : "#dc2626";
    const photoImg = d.posture_photo_url || d.posture_captured_img || "";

    // Pre-build all HTML sections as plain strings -- no nested template literals
    var patientCells = [
      ["Patient", escHtml(patName)],
      ["DOB / Age", escHtml(dob) + " / " + escHtml(String(age))],
      ["Occupation", escHtml(occ)],
      ["Report Date", today],
      ["Referring GP", escHtml(gp)],
      ["Insurer", escHtml(insurer)],
      ["Method", "AI Landmark Detection"],
      ["View", escHtml(view)],
    ].map(function(p) {
      return '<div><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">' + p[0] + '</div>'
           + '<div style="font-size:10px;font-weight:600;color:#1a3a5c;">' + p[1] + '</div></div>';
    }).join("");

    var circ50 = 2 * Math.PI * 50;
    var dash = (scoreNum / 100) * circ50;
    var scoreRing = '<svg viewBox="0 0 120 120" width="110" height="110" style="display:block;margin:0 auto 8px;">'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="10"/>'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="' + scoreColor + '" stroke-width="10" stroke-dasharray="' + dash + ' ' + circ50 + '" stroke-linecap="round" transform="rotate(-90 60 60)"/>'
      + '<text x="60" y="54" text-anchor="middle" fill="' + scoreColor + '" font-size="22" font-weight="800">' + (scoreNum || "N/A") + '</text>'
      + '<text x="60" y="68" text-anchor="middle" fill="#94a3b8" font-size="9">/100</text>'
      + '<text x="60" y="82" text-anchor="middle" fill="' + scoreColor + '" font-size="8" font-weight="700">' + escHtml(postBand) + '</text>'
      + '</svg>';

    var scoreLegend = [["75-100","Excellent","#059669"],["50-74","Moderate","#d97706"],["25-49","Poor","#dc2626"],["0-24","Critical","#7f1d1d"]]
      .map(function(r) {
        return '<div style="background:' + r[2] + '12;border-radius:5px;padding:4px 6px;border:1px solid ' + r[2] + '30;">'
             + '<div style="font-size:8px;font-weight:700;color:' + r[2] + ';">' + r[1] + '</div>'
             + '<div style="font-size:7px;color:#94a3b8;">' + r[0] + '</div></div>';
      }).join("");

    var measData = [
      // Normal values per Yip 2008 (CVA), Magee 6th ed. (kyphosis, lordosis, shoulder), Lee & Nussbaum (head tilt)
      {label:"CVA (Yip 2008 norm >55°)",value:cva,  normal:"&gt;55&deg;",bad:parseFloat(cva)<49,        warn:parseFloat(cva)<55,          bc:"#dc2626"},
      {label:"Forward Head Posture",  value:fhp,     normal:"&lt;20mm",   bad:parseFloat(fhp)>30,        warn:parseFloat(fhp)>20,          bc:"#dc2626"},
      {label:"Shoulder Asymmetry",    value:shAngle, normal:"&lt;2.5&deg;",bad:parseFloat(shAngle)>5,   warn:parseFloat(shAngle)>2.5,     bc:"#d97706"},
      {label:"Thoracic Kyphosis Est.",value:kyph,    normal:"20–45&deg;", bad:parseFloat(kyph)>50,      warn:parseFloat(kyph)>45,         bc:"#d97706"},
      {label:"Lumbar Lordosis Est.",  value:lord,    normal:"40–60&deg;", bad:parseFloat(lord)>65||parseFloat(lord)<30, warn:false,       bc:"#d97706"},
      {label:"Pelvic Tilt (proxy)",   value:pelv,    normal:"0–5&deg;",   bad:false,                     warn:false,                       bc:"#6b7280"},
    ];
    var measCards = measData.map(function(m) {
      var c = (m.bad && m.value !== "N/A") ? m.bc : (m.warn && m.value !== "N/A") ? "#d97706" : (m.value === "N/A" ? "#94a3b8" : "#059669");
      var status = m.value === "N/A" ? "N/A" : m.bad ? "Outside Normal" : m.warn ? "Borderline" : "Normal";
      return '<div style="background:' + c + '08;border:1px solid ' + c + '25;border-radius:8px;padding:9px 11px;border-left:3px solid ' + c + ';">'
           + '<div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">' + m.label + '</div>'
           + '<div style="font-size:18px;font-weight:800;color:' + c + ';line-height:1;">' + escHtml(String(m.value)) + '</div>'
           + '<div style="display:flex;justify-content:space-between;margin-top:3px;">'
           + '<span style="font-size:7.5px;color:#94a3b8;">Norm: ' + m.normal + '</span>'
           + '<span style="font-size:7.5px;font-weight:700;color:' + c + ';">' + status + '</span>'
           + '</div></div>';
    }).join("");

    var defectRows = selectedDefects.map(function(id, i) {
      var label = DEFECT_LABELS[id] || id;
      var sev = d["posture_defect_" + id + "_severity"] || "mild";
      var sc = sev === "severe" ? "#dc2626" : sev === "moderate" ? "#d97706" : "#059669";
      var muscles = DEFECT_MUSCLES[id];
      var tight = muscles ? muscles.tight.slice(0,2).join(", ") : "N/A";
      var rx = DEFECT_RX[id] || "Clinical assessment required";
      return '<tr style="background:' + (i%2===0?"#fff":"#f8fafc") + ';">'
           + '<td style="font-size:9.5px;font-weight:700;color:#1a3a5c;">' + escHtml(label) + '</td>'
           + '<td><span style="padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;background:' + sc + '15;color:' + sc + ';">' + sev.charAt(0).toUpperCase() + sev.slice(1) + '</span></td>'
           + '<td style="font-size:8.5px;color:#6b7280;">' + escHtml(tight) + '</td>'
           + '<td style="font-size:8.5px;color:#1a3a5c;">' + rx + '</td></tr>';
    }).join("");

    var defectSection = selectedDefects.length > 0
      ? sectionCard("Regional Postural Findings", "&#128450;",
          '<table><thead><tr><th>Region / Defect</th><th>Severity</th><th>Tight Structures</th><th>Clinical Action</th></tr></thead>'
          + '<tbody>' + defectRows + '</tbody></table>', "#64748b")
      : sectionCard("Regional Postural Findings", "&#128450;",
          '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:10px;">No postural defects recorded. Use the Posture Defect Assessment module to document findings.</div>',
          "#64748b");

    var hasUCS = selectedDefects.some(function(id) { return id==="forward_head"||id==="rounded_shoulders"||id==="thoracic_kyphosis"; });
    var hasLCS = selectedDefects.some(function(id) { return id==="anterior_pelvic_tilt"||id==="lumbar_hyperlordosis"; });
    var regionSet = {};
    selectedDefects.forEach(function(id) {
      regionSet[(id.indexOf("foot")>=0||id.indexOf("genu")>=0)?"Lower Limb":(id.indexOf("thoracic")>=0||id.indexOf("shoulder")>=0||id.indexOf("scapular")>=0)?"Thoracic":"Spinal/Pelvic"] = 1;
    });
    var regions = Object.keys(regionSet).join(", ") || "N/A";
    var scoreMsg = scoreNum < 50 ? "Priority intervention required." : scoreNum < 75 ? "Moderate dysfunction -- structured correction indicated." : "Good alignment -- maintenance program recommended.";

    var bioCards = [
      {title:"Upper Crossed Pattern Tendency", active:hasUCS, text:"Possible overactivity: upper trapezius/pectorals. Possible underactivity: deep neck flexors. May contribute to forward head and shoulder protraction tendency. Clinical muscle testing required to confirm.", color:"#dc2626"},
      {title:"Lower Crossed Pattern Tendency", active:hasLCS, text:"Possible overactivity: hip flexors/lumbar extensors. Possible underactivity: glutes/TA. May contribute to anterior pelvic tilt tendency. Clinical assessment required to confirm.", color:"#d97706"},
      {title:"Kinetic Chain Impact",   active:true,   text:"Compensatory load across the kinetic chain. " + selectedDefects.length + " defect(s) identified across " + regions + " regions.", color:"#0891b2"},
      {title:"Postural Load Index",    active:true,   text:"AI Posture Score: " + scoreNum + "/100 (" + escHtml(postBand) + "). " + scoreMsg, color:scoreColor},
    ].map(function(item) {
      return '<div style="background:' + item.color + '06;border:1px solid ' + item.color + '20;border-radius:8px;padding:10px 12px;' + (!item.active?"opacity:0.45;":"") + '">'
           + '<div style="font-size:9px;font-weight:700;color:' + item.color + ';margin-bottom:4px;">' + item.title + '</div>'
           + '<div style="font-size:9px;color:#6b7280;line-height:1.6;">' + item.text + '</div></div>';
    }).join("");

    var bioSection = selectedDefects.length > 0
      ? sectionCard("Biomechanical Correlation","&#129518;",
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + bioCards + '</div>', "#7c3aed")
      : "";

    var firstLabel = selectedDefects.length > 0 ? (DEFECT_LABELS[selectedDefects[0]] || "primary deficit") : "";
    var immItems = selectedDefects.length > 0
      ? ["Address " + firstLabel, scoreNum < 50 ? "Refer for comprehensive postural assessment" : "Postural education and awareness", "Ergonomic review"]
      : ["Postural education","Ergonomic review","Activity modification"];

    var recoCols = [
      {priority:"Immediate",           items:immItems,                                                                                    color:"#dc2626"},
      {priority:"Short-Term (2-4 wks)",items:["Targeted muscle activation","Manual therapy - restricted segments","Daily HEP program"],  color:"#d97706"},
      {priority:"Long-Term (6-12 wks)",items:["Postural re-education","Progressive strengthening","Self-management and prevention"],      color:"#059669"},
    ].map(function(col) {
      var rows = col.items.map(function(item) {
        return '<div style="display:flex;gap:5px;margin-bottom:4px;align-items:flex-start;">'
             + '<span style="color:' + col.color + ';font-weight:700;font-size:10px;flex-shrink:0;">-&gt;</span>'
             + '<span style="font-size:8.5px;color:#475569;line-height:1.5;">' + item + '</span></div>';
      }).join("");
      return '<div style="background:' + col.color + '06;border:1px solid ' + col.color + '25;border-radius:8px;padding:9px 11px;">'
           + '<div style="font-size:8.5px;font-weight:800;color:' + col.color + ';text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px;">' + col.priority + '</div>'
           + rows + '</div>';
    }).join("");

    var recoSection = sectionCard("Clinical Recommendations","&#128203;",
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;">' + recoCols + '</div>', "#059669");

    var methodRows = [
      ["AI Engine","MediaPipe BlazePose"],
      ["View", escHtml(view)],
      ["Reliability", escHtml(reliability)],
      ["Landmarks","33 body landmarks"],
      ["Calibration", d.posture_calibration || "Auto"],
      ["Platform","PhysioMind AI"],
    ].map(function(r) {
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0;">'
           + '<span style="font-size:8.5px;color:#94a3b8;">' + r[0] + '</span>'
           + '<span style="font-size:8.5px;font-weight:600;color:#1a3a5c;">' + r[1] + '</span></div>';
    }).join("");

    var photoBlock = photoImg
      ? '<img src="' + photoImg + '" style="width:100%;border-radius:8px;margin-bottom:6px;object-fit:cover;max-height:220px;" alt="Postural photo"/>'
      : '<div style="background:#f1f5f9;border-radius:8px;height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #cbd5e1;margin-bottom:8px;">'
        + '<div style="font-size:9px;font-weight:700;color:#6b7280;margin-bottom:3px;">AI-Analysed Photo</div>'
        + '<div style="font-size:8px;color:#94a3b8;">with Landmark Overlay</div></div>';

    var sigRow = [["Treating Physiotherapist",""],["Signature",""],["Date / Stamp", today]].map(function(p) {
      return '<div>'
           + '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">' + p[0] + '</div>'
           + '<div style="height:30px;border-bottom:1.5px solid #334155;margin-bottom:3px;display:flex;align-items:flex-end;">'
           + '<span style="font-size:10px;font-weight:600;color:#1e293b;">' + escHtml(p[1]) + '</span></div></div>';
    }).join("");

    return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Posture Analysis Report - PhysioMind</title>"
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:7px 9px;text-align:left;}td{padding:6px 9px;font-size:10px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>"
      + "</head><body><div class=\"page\">"
      + pdfHeader("Postural Analysis Report","AI-Assisted Quantitative Postural Assessment &middot; PhysioMind Platform","#0a1628")
      + "<div class=\"body\">"
      + "<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;padding:13px;background:#f1f5f9;border-radius:10px;border:1px solid #e2e8f0;\">" + patientCells + "</div>"
      + "<div style=\"background:linear-gradient(135deg,#0a1628,#1a3358);border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:14px;align-items:center;border:1px solid #1a3358;\">"
      + "<div style=\"flex:1;\">"
      + "<div style=\"font-size:9px;color:#e8c96e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;\">Clinical Diagnosis</div>"
      + "<div style=\"font-size:14px;font-weight:800;color:#fff;\">" + dxLabel + "</div>"
      + "<div style=\"font-size:8.5px;color:rgba(255,255,255,0.5);margin-top:2px;\">MediaPipe BlazePose AI &middot; 33 landmarks &middot; " + escHtml(view) + " view</div>"
      + "</div><div style=\"flex-shrink:0;text-align:center;\">" + scoreRing + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 230px;gap:18px;align-items:start;\">"
      + "<div>"
      + sectionCard("Quantitative Postural Measurements","&#128207;",
          "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:12px;\">" + measCards + "</div>"
          + "<div style=\"padding:8px 11px;background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.15);border-radius:7px;font-size:8.5px;color:#1a3a5c;\">"
          + "<strong style=\"color:#2563eb;\">AI Reliability:</strong> " + escHtml(reliability)
          + " &nbsp;&middot;&nbsp; <strong>View:</strong> " + escHtml(view)
          + " &nbsp;&middot;&nbsp; <strong>Calibration:</strong> " + (d.posture_calibration || "Auto") + "</div>",
          "#0891b2")
      + defectSection
      + bioSection
      + recoSection
      + "</div>"
      + "<div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;\">Overall Posture Score</div>"
      + scoreRing
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:5px;\">" + scoreLegend + "</div></div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;\">Postural Photo</div>"
      + photoBlock
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;margin-top:3px;\">Assessment Method</div>"
      + methodRows + "</div>"
      + "<div style=\"background:#fef3c7;border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:9px 11px;\">"
      + "<div style=\"font-size:8px;font-weight:700;color:#92400e;margin-bottom:3px;\">Clinical Disclaimer</div>"
      + "<div style=\"font-size:8px;color:#92400e;line-height:1.6;\">AI-assisted assessment is a clinical decision support tool. All measurements require clinical correlation and must be interpreted by a qualified physiotherapist.</div></div>"
      + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;\">" + sigRow + "</div>"
      + "</div>"
      + pdfFooter("Postural Analysis Report &mdash; PhysioMind AI Platform")
      + "</div></body></html>";
  };

  const openPdf = (htmlContent) => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for PDF generation"); return; }
    win.document.open(); win.document.write(htmlContent); win.document.close();
    setTimeout(() => { try { win.print(); } catch(e) {} }, 800);
  };

  const generatePdf = async (type) => {
    setGenerating(type);
    await new Promise(r => setTimeout(r, 400));
    try {
      let html = "";
      if (type === "assessment") html = buildAssessmentPdf();
      else if (type === "treatment") html = buildTreatmentPdf();
      else if (type === "hep") html = buildHomeExercisePdf();
      else if (type === "posture") html = buildPostureReportPdf();
      openPdf(html);
      setDone(p => ({...p, [type]: true}));
    } catch(e) { console.error(e); alert("Error generating PDF: " + e.message); }
    setGenerating(null);
  };

  const reports = [
    { id:"assessment", icon:"&#129321;", title:"Assessment Report", subtitle:"Initial Clinical Evaluation", desc:"Comprehensive physiotherapy assessment: demographics, pain scores, ROM table, postural analysis with anatomical diagram, special tests, clinical diagnosis, neurological & palpation findings, and signed clinical summary.", color:"#1a3a5c", gradient:"linear-gradient(135deg,#1a3a5c,#2563eb)", tags:["Demographics","VAS Scores","Posture Diagram","ROM Table","Diagnosis","Special Tests","Signature"], pages:"2-3 pages" },
    { id:"treatment", icon:"&#127959;", title:"Treatment Plan", subtitle:"Clinical Management Program", desc:"Evidence-based treatment plan with phased exercise prescription, manual therapy techniques and dosage, SMART goals timeline, outcome measures with baselines, reassessment schedule, and clinical precautions.", color:"#059669", gradient:"linear-gradient(135deg,#065f46,#059669)", tags:["Phased Exercises","Manual Therapy","SMART Goals","Outcome Measures","Precautions","Reassessment"], pages:"2-3 pages" },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#ffffff",borderRadius:20,maxWidth:760,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.4)"}}>
        <div style={{background:"linear-gradient(135deg,#1a3a5c 0%,#2563eb 50%,#7c3aed 100%)",borderRadius:"20px 20px 0 0",padding:"24px 28px",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:"24px"}}>📄</span>
                <div><h2 style={{margin:0,fontSize:"1.3rem",fontWeight:800,letterSpacing:"-0.3px"}}>Clinical PDF Reports</h2><p style={{margin:"2px 0 0",fontSize:"0.75rem",opacity:0.8}}>Assessment &amp; Treatment PDF — patient-specific</p></div>
              </div>
              {patName !== "Patient" && <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:"rgba(255,255,255,0.12)",borderRadius:8,width:"fit-content"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#34d399"}}/><span style={{fontSize:"0.8rem",fontWeight:600}}>{patName}</span>{age && age !== "--" && <span style={{fontSize:"0.82rem",opacity:0.7}}>&#183; Age {age}</span>}</div>}
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"8px 14px",fontSize:"0.8rem",fontWeight:600}}>✕ Close</button>
          </div>
        </div>
        <div style={{padding:"24px 28px"}}>
          <div style={{background:"rgba(37,99,235,0.06)",border:"1px solid rgba(37,99,235,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:"16px",flexShrink:0}}>💡</span>
            <div style={{fontSize:"0.78rem",color:"#1e40af",lineHeight:1.6}}>Each PDF opens in a new browser tab. Use <strong>Print -&gt; Save as PDF</strong> (enable Background Graphics for full colour). Data is pulled from your current patient assessment automatically.</div>
          </div>
          <div style={{display:"grid",gap:14}}>
            {reports.map(report => (
              <div key={report.id} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:0}}>
                  <div style={{padding:"18px 20px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                      <div style={{width:44,height:44,background:report.gradient,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}} dangerouslySetInnerHTML={{__html:report.icon}}/>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h3 style={{margin:0,fontSize:"1rem",fontWeight:800,color:"#1e293b"}}>{report.title}</h3><span style={{fontSize:"0.82rem",padding:"2px 7px",borderRadius:5,background:"rgba(100,116,139,0.12)",color:"#64748b",fontWeight:600}}>{report.pages}</span></div>
                        <p style={{margin:0,fontSize:"0.75rem",color:"#64748b",fontWeight:500}}>{report.subtitle}</p>
                      </div>
                    </div>
                    <p style={{margin:"0 0 10px",fontSize:"0.78rem",color:"#475569",lineHeight:1.6}}>{report.desc}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{report.tags.map(tag=><span key={tag} style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:5,background:report.color+"12",border:`1px solid ${report.color}25`,color:report.color,fontWeight:600}}>{tag}</span>)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"18px 20px",borderLeft:"1px solid #e2e8f0",minWidth:130,gap:10}}>
                    {done[report.id] && <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(5,150,105,0.1)",border:"1px solid rgba(5,150,105,0.3)",borderRadius:8}}><span style={{color:"#059669",fontSize:"0.75rem",fontWeight:700}}>✓ Generated</span></div>}
                    <button data-pdf-type={report.id} onClick={()=>generatePdf(report.id)} disabled={generating!==null} style={{width:"100%",padding:"12px 16px",background:generating===report.id?"#94a3b8":report.gradient,border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:generating?"not-allowed":"pointer",opacity:generating&&generating!==report.id?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                      {generating===report.id?"⏳ Generating...":"📥 Generate PDF"}
                    </button>
                    <div style={{fontSize:"0.75rem",color:"#94a3b8",textAlign:"center",lineHeight:1.4}}>Opens in new tab<br/>Print → Save as PDF</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:18,padding:"16px 20px",background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04))",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div><div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e293b"}}>Generate Both Reports</div><div style={{fontSize:"0.82rem",color:"#64748b",marginTop:2}}>Download Assessment &amp; Treatment PDFs for <strong>{patName}</strong></div></div>
            <button onClick={async()=>{for(const r of reports){await generatePdf(r.id);await new Promise(res=>setTimeout(res,1500));}}} disabled={generating!==null} style={{padding:"12px 22px",background:"linear-gradient(135deg,#1a3a5c,#7c3aed)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.8rem",cursor:generating?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0,boxShadow:"0 2px 12px rgba(124,58,237,0.3)"}}>
              📄 Generate All
            </button>
          </div>


          <div style={{marginTop:14,padding:"12px 16px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10}}>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>💡 Tips for best results</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
              {["Complete patient demographics before generating","Add exercises in the Exercise Prescription module","Record ROM measurements for detailed tables","Run AI Diagnosis first for diagnostic content","Use Chrome or Edge for best PDF quality","Enable Print: Background Graphics for full colour"].map(tip=>(
                <div key={tip} style={{fontSize:"0.82rem",color:"#94a3b8",display:"flex",gap:6,alignItems:"flex-start",padding:"2px 0"}}><span style={{color:"#7c3aed",fontWeight:700,flexShrink:0}}>→</span>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







// ── HEP protocol helpers — versioned home programme with WhatsApp/PDF send ──
function hepDose(e){ const st=e.customSets||e.sets, rp=e.customReps||e.reps, hd=e.customHold||e.hold, fq=e.customFreq||e.freq; return `${st}×${rp}${hd?` · hold ${hd}s`:""}${fq?` · ${fq}`:""}`; }
function buildHepWhatsAppText(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length) return "";
  const v=parseInt(d.hep_version)||1;
  const lines=prog.map((e,i)=>`${i+1}. ${e.name} — ${hepDose(e)}`);
  return `🏥 ${d.clinic_name||"PhysioMind"} — Home Exercise Programme (v${v})\nPatient: ${d.dem_name||""}\nDate: ${new Date().toLocaleDateString("en-GB")}\n\n${lines.join("\n")}\n\nStop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.`;
}
function sendHepWhatsApp(d){
  const text=buildHepWhatsAppText(d);
  if(!text){alert("No exercises in the home protocol yet.");return;}
  const phone=String(d.dem_phone||d.dem_contact||"").replace(/[^0-9]/g,"");
  const url=phone.length>=10?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,"_blank");
}
function downloadHepPdf(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length){alert("No exercises in the home protocol yet.");return;}
  const v=parseInt(d.hep_version)||1;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Programme</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}body{background:#fff;color:#1a1a2e;font-size:11px;line-height:1.55}.header{border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}.logo{font-size:20px;font-weight:900;color:#7c3aed}.meta{text-align:right;font-size:10px;color:#555}.ex{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}.ex-h{background:#7c3aed;color:#fff;padding:8px 12px;display:flex;justify-content:space-between}.ex-t{font-size:12px;font-weight:800}.ex-b{padding:10px 12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.st{background:#f5f3ff;border-radius:6px;padding:5px 8px;text-align:center}.sv{font-size:13px;font-weight:900;color:#7c3aed}.sl{font-size:8px;color:#64748b;text-transform:uppercase}.desc{font-size:10.5px;color:#334155;margin-bottom:6px}.cues{background:#fefce8;border-left:3px solid #fbbf24;padding:5px 8px;font-size:10px;color:#713f12}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div class="header"><div><div class="logo">PhysioMind</div><div style="font-size:11px;color:#555;margin-top:2px">Home Exercise Programme — v${v}</div></div><div class="meta"><div><b>Patient:</b> ${d.dem_name||"—"}</div><div><b>Date:</b> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div></div></div>
<p style="font-size:10px;color:#555;margin-bottom:14px">Perform exercises as prescribed. Stop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.</p>
${prog.map((ex,i)=>`<div class="ex"><div class="ex-h"><span class="ex-t">${i+1}. ${ex.name}</span><span style="font-size:9px;opacity:0.85">${ex.phase||""}</span></div><div class="ex-b"><div class="grid"><div class="st"><div class="sv">${ex.customSets||ex.sets||"—"}</div><div class="sl">Sets</div></div><div class="st"><div class="sv">${ex.customReps||ex.reps||"—"}</div><div class="sl">Reps</div></div><div class="st"><div class="sv">${(ex.customHold||ex.hold)?(ex.customHold||ex.hold)+"s":"—"}</div><div class="sl">Hold</div></div><div class="st"><div class="sv" style="font-size:9px">${ex.customFreq||ex.freq||"—"}</div><div class="sl">Freq</div></div></div><div class="desc">${ex.desc||""}</div>${ex.cues?`<div class="cues">💡 ${ex.cues}</div>`:""}</div></div>`).join("")}
<div class="footer">Generated by PhysioMind · ${new Date().toLocaleString()}</div>
</body></html>`;
  try{ downloadPDFFromHTML(html, `HEP_v${v}_${d.dem_name||"Patient"}_${Date.now()}.pdf`); }
  catch(e){ const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>{try{w.print();}catch(_){}},500); }
}

function QuickVisitForm({ PC, data, set, navTo }) {
  const sessionsArr = Array.isArray(data.tx_sessions)?data.tx_sessions:[];
  const lastSession = sessionsArr[0];
  const sessionNo = sessionsArr.length+1;
  const [qv, setQv] = useState({pain_today:data.cc_vas_now||"",pain_after:"",treatment:lastSession?.treatmentGiven||"",response:"",next_plan:""});
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState([]);          // protocol change descriptions this visit
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("library");   // "library" | "templates"
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerRegion, setPickerRegion] = useState("all");
  const [openTemplate, setOpenTemplate] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDose, setEditDose] = useState({sets:"",reps:"",hold:""});
  const [removeId, setRemoveId] = useState(null);
  const txOptions = ["Joint mobilisation","Soft tissue massage","Dry needling","Exercise therapy","TENS/IFT","Neural mobilisation","Taping/strapping","Education & advice","Postural correction","Manual therapy","Other"];
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const lbl = {fontSize:"0.8rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};

  const prog = Array.isArray(data.hep_programme)?data.hep_programme:[];

  const addExercise = (ex) => {
    if(prog.find(p=>p.id===ex.id)) { setPickerOpen(false); return; }
    set("hep_programme",[...prog,{...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}]);
    setPending(p=>[...p,`＋ ${ex.name}`]);
    setPickerOpen(false); setPickerSearch("");
  };
  const removeExercise = (id,reason) => {
    const ex=prog.find(p=>p.id===id);
    set("hep_programme",prog.filter(p=>p.id!==id));
    setPending(p=>[...p,`− ${ex?.name||id}${reason?` (${reason.toLowerCase()})`:""}`]);
    setRemoveId(null);
  };
  const startProgress = (e) => { setEditId(e.id); setEditDose({sets:String(e.customSets||e.sets||""),reps:String(e.customReps||e.reps||""),hold:String(e.customHold||e.hold||"")}); };
  const applyProgress = () => {
    const ex=prog.find(p=>p.id===editId); if(!ex){setEditId(null);return;}
    set("hep_programme",prog.map(p=>p.id===editId?{...p,customSets:editDose.sets,customReps:editDose.reps,customHold:editDose.hold,progressedSession:sessionNo}:p));
    setPending(p=>[...p,`↑ ${ex.name} ${editDose.sets}×${editDose.reps}${editDose.hold?` · ${editDose.hold}s`:""}`]);
    setEditId(null);
  };

  const addTx = (t) => setQv(p=>({...p,treatment:p.treatment?(p.treatment.includes(t)?p.treatment:`${p.treatment}, ${t}`):t}));
  const addTemplate = (key) => {
    const t=PROGRAMME_TEMPLATES[key]; if(!t) return;
    const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean).filter(e=>!prog.find(p=>p.id===e.id));
    if(exs.length){
      set("hep_programme",[...prog,...exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}))]);
      setPending(p=>[...p,`＋ ${t.label} template (${exs.length} exercise${exs.length!==1?"s":""})`]);
    }
  };
  const pickerResults = (()=>{
    if(!pickerOpen) return [];
    let pool = pickerRegion==="all" ? ALL_EXERCISES : (Object.values(EXERCISE_DB[pickerRegion]?.categories||{}).flat());
    const q=pickerSearch.trim().toLowerCase();
    if(q) pool=pool.filter(e=>e.name.toLowerCase().includes(q)||String(e.target||"").toLowerCase().includes(q));
    return pool.filter(e=>!prog.find(p=>p.id===e.id)).slice(0,8);
  })();

  const saveQuick = () => {
    set("cc_vas_now",qv.pain_today);
    let hepNote="";
    if(pending.length){
      const version=(parseInt(data.hep_version)||1)+1;
      set("hep_version",version);
      const log=Array.isArray(data.hep_log)?data.hep_log:[];
      set("hep_log",[{session:sessionNo,date:new Date().toLocaleDateString("en-GB"),changes:pending,version},...log]);
      hepNote=`HEP v${version}: ${pending.join(" · ")}`;
    }
    set("soap_extra_p",[qv.next_plan,hepNote].filter(Boolean).join(" | "));
    const entry = {id:(Date.now()).toString(36),date:new Date().toLocaleDateString("en-GB"),sessionNo,type:"Follow-up Treatment",vasStart:qv.pain_today,vasEnd:qv.pain_after||qv.pain_today,treatmentGiven:qv.treatment,response:qv.response,nextPlan:qv.next_plan,hepChanges:pending,savedAt:new Date().toISOString()};
    set("tx_sessions",[entry,...sessionsArr]);
    setPending([]);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
    navTo("soap");
  };

  const Pill=({bg,col,children,onClick,title})=>(
    <span onClick={onClick} title={title} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:7,background:bg,color:col,fontSize:"0.8rem",fontWeight:800,cursor:"pointer",flexShrink:0,userSelect:"none"}}>{children}</span>
  );

  return(
    <div>
      <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>1 · Today — Session {sessionNo}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={lbl}>Pain — start of session (NRS 0–10)</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 5" value={qv.pain_today} onChange={e=>setQv(p=>({...p,pain_today:e.target.value}))}/></div>
        <div><label style={lbl}>Pain — end of session (NRS 0–10)</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 3" value={qv.pain_after} onChange={e=>setQv(p=>({...p,pain_after:e.target.value}))}/></div>
        <div><label style={lbl}>Treatment given {lastSession?.treatmentGiven?<span style={{textTransform:"none",fontWeight:500}}>(copied from S{lastSession.sessionNo||sessionNo-1})</span>:null}</label><input style={inp} placeholder="Tap chips below or type…" value={qv.treatment} onChange={e=>setQv(p=>({...p,treatment:e.target.value}))}/></div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
        {txOptions.map(t=>(
          <button key={t} onClick={()=>setQv(p=>({...p,treatment:p.treatment?(p.treatment.includes(t)?p.treatment:`${p.treatment}, ${t}`):t}))}
            style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(t)?PC.accent:PC.border}`,background:qv.treatment.includes(t)?`${PC.accent}14`:"transparent",color:qv.treatment.includes(t)?PC.accent:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{t}</button>
        ))}
      </div>
      <div style={{marginBottom:10}}><label style={lbl}>Patient response</label><input style={inp} placeholder="e.g. Good improvement, less pain on movement" value={qv.response} onChange={e=>setQv(p=>({...p,response:e.target.value}))}/></div>
      <div style={{marginBottom:12}}><label style={lbl}>Plan for next session</label><input style={inp} placeholder="e.g. Progress to single-leg squat" value={qv.next_plan} onChange={e=>setQv(p=>({...p,next_plan:e.target.value}))}/></div>

      {/* ── 2 · Home protocol — edit per session ── */}
      <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>2 · Home protocol {prog.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· v{parseInt(data.hep_version)||1} · {prog.length} exercise{prog.length!==1?"s":""}</span>}</div>
      {prog.length===0&&(
        <div style={{padding:"10px 12px",background:PC.s2,borderRadius:9,fontSize:"0.8rem",color:PC.muted,marginBottom:8}}>No protocol yet — add exercises below or build it in the Exercise Prescription tab.</div>
      )}
      {prog.map(e=>(
        <div key={e.id} style={{marginBottom:5}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:e.addedSession===sessionNo?`${PC.accent}10`:PC.s2,border:`1px solid ${e.addedSession===sessionNo?PC.accent+"35":PC.border}`,borderRadius:9}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{e.name}
                {e.addedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.accent}}>＋ just added</span>}
                {e.progressedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.a3}}>↑ progressed</span>}
              </div>
              <div style={{fontSize:"0.82rem",color:PC.muted}}>{hepDose(e)}</div>
            </div>
            <Pill bg={`${PC.a3}18`} col={PC.a3} title="Progress dosage" onClick={()=>startProgress(e)}>↑</Pill>
            <Pill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>setRemoveId(removeId===e.id?null:e.id)}>−</Pill>
          </div>
          {editId===e.id&&(
            <div style={{display:"flex",gap:6,alignItems:"center",padding:"7px 10px",background:`${PC.a3}08`,border:`1px dashed ${PC.a3}40`,borderRadius:9,marginTop:3}}>
              {["sets","reps","hold"].map(f=>(
                <input key={f} style={{...inp,width:62,padding:"5px 7px",fontSize:"0.82rem"}} placeholder={f} value={editDose[f]} onChange={ev=>setEditDose(p=>({...p,[f]:ev.target.value}))}/>
              ))}
              <span style={{fontSize:"0.78rem",color:PC.muted}}>sets × reps · hold s</span>
              <button onClick={applyProgress} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:7,border:"none",background:PC.a3,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Apply</button>
            </div>
          )}
          {removeId===e.id&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"7px 10px",background:"rgba(220,38,38,0.05)",border:"1px dashed rgba(220,38,38,0.35)",borderRadius:9,marginTop:3,alignItems:"center"}}>
              <span style={{fontSize:"0.8rem",color:"#dc2626",fontWeight:700}}>Why?</span>
              {["Mastered","Aggravating","Replaced","Other"].map(r=>(
                <button key={r} onClick={()=>removeExercise(e.id,r)} style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(220,38,38,0.3)",background:"transparent",color:"#dc2626",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>{r}</button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add exercise — library picker */}
      {!pickerOpen?(
        <div onClick={()=>setPickerOpen(true)} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer",marginBottom:10}}>＋ Add exercise from library</div>
      ):(
        <div style={{border:`1.5px solid ${PC.accent}35`,borderRadius:11,padding:"10px",marginBottom:10,background:`${PC.accent}06`}}>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            {[["library","📚 Library"],["templates","📦 Templates"]].map(([m,l])=>(
              <button key={m} onClick={()=>setPickerMode(m)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${pickerMode===m?PC.accent:PC.border}`,background:pickerMode===m?`${PC.accent}15`:"transparent",color:pickerMode===m?PC.accent:PC.muted,fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>{l}</button>
            ))}
            <button onClick={()=>setPickerOpen(false)} style={{padding:"0 10px",borderRadius:8,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,cursor:"pointer",fontWeight:700}}>✕</button>
          </div>
          {pickerMode==="templates"&&(
            <div>
              {Object.entries(PROGRAMME_TEMPLATES).map(([key,t])=>{
                const tx=TEMPLATE_TX[key];
                const isOpen=openTemplate===key;
                return(
                  <div key={key} style={{marginBottom:4}}>
                    <div onClick={()=>setOpenTemplate(isOpen?null:key)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${isOpen?PC.accent+"45":PC.border}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{t.label}</div>
                        <div style={{fontSize:"0.78rem",color:PC.muted}}>{t.exercises.length} exercises{tx?` · ${(tx.manual||[]).length} manual · ${(tx.machine||[]).length} machine`:""}</div>
                      </div>
                      <span style={{fontSize:"0.75rem",color:PC.accent,fontWeight:800}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"8px 10px",border:`1px dashed ${PC.accent}35`,borderTop:"none",borderRadius:"0 0 8px 8px",background:`${PC.accent}05`}}>
                        <button onClick={()=>{addTemplate(key);setOpenTemplate(null);}} style={{width:"100%",padding:"8px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:"pointer",marginBottom:7}}>＋ Add {t.exercises.length} exercises to protocol</button>
                        {tx&&(tx.manual||[]).length>0&&(
                          <div style={{marginBottom:5}}>
                            <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>🤲 Manual — tap to add to treatment</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {tx.manual.map(m=><button key={m} onClick={()=>addTx(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(m)?PC.accent:PC.border}`,background:qv.treatment.includes(m)?`${PC.accent}14`:PC.surface,color:qv.treatment.includes(m)?PC.accent:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{qv.treatment.includes(m)?"✓ ":""}{m}</button>)}
                            </div>
                          </div>
                        )}
                        {tx&&(tx.machine||[]).length>0&&(
                          <div>
                            <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>⚡ Machine — tap to add to treatment</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {tx.machine.map(m=><button key={m} onClick={()=>addTx(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(m)?PC.a2:PC.border}`,background:qv.treatment.includes(m)?`${PC.a2}14`:PC.surface,color:qv.treatment.includes(m)?PC.a2:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{qv.treatment.includes(m)?"✓ ":""}{m}</button>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {pickerMode==="library"&&(
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <input autoFocus style={{...inp,flex:1}} placeholder="Search exercises… e.g. plank, chin tuck" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}/>
            <select style={{...inp,width:120}} value={pickerRegion} onChange={e=>setPickerRegion(e.target.value)}>
              <option value="all">All regions</option>
              {Object.entries(EXERCISE_DB).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>
          )}
          {pickerMode==="library"&&pickerResults.length===0&&<div style={{fontSize:"0.66rem",color:PC.muted,padding:"4px 2px"}}>No matches — try another term or region.</div>}
          {pickerMode==="library"&&pickerResults.map(ex=>(
            <div key={ex.id} onClick={()=>addExercise(ex)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${PC.border}`,marginBottom:4}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{ex.name}</div>
                <div style={{fontSize:"0.78rem",color:PC.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.sets}×{ex.reps}{ex.hold?` · ${ex.hold}s`:""} · {ex.freq} · {ex.target}</div>
              </div>
              <span style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,flexShrink:0}}>＋ Add</span>
            </div>
          ))}
        </div>
      )}

      {pending.length>0&&(
        <div style={{padding:"8px 11px",background:`${PC.accent}0a`,border:`1px solid ${PC.accent}25`,borderRadius:9,fontSize:"0.75rem",color:PC.text,marginBottom:10,lineHeight:1.6}}>
          <span style={{fontWeight:800,color:PC.accent}}>This session:</span> {pending.join(" · ")} <span style={{color:PC.muted}}>(will be logged as v{(parseInt(data.hep_version)||1)+1} on save)</span>
        </div>
      )}

      <button onClick={saveQuick} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",marginBottom:8}}>
        {saved?"✅ Saved — opening SOAP to sign…":"Save & Go to SOAP →"}
      </button>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>sendHepWhatsApp(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a3}40`,background:`${PC.a3}10`,color:PC.a3,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📲 Send protocol — WhatsApp</button>
        <button onClick={()=>downloadHepPdf(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a2}40`,background:`${PC.a2}10`,color:PC.a2,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📄 PDF handout</button>
      </div>
    </div>
  );
}

function IntakeForm({ PC, onCancel, onSubmit }) {
  const [fd, setFd] = useState({});
  const [tab, setTab] = React.useState("essential");
  const set = (k,v) => setFd(p=>({...p,[k]:v}));
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.82rem",marginBottom:0};
  const lbl = {fontSize:"0.78rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};
  const field = (label, node) => (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{label}</label>
      {node}
    </div>
  );
  const sel = (k, opts) => (
    <select style={inp} value={fd[k]||""} onChange={e=>set(k,e.target.value)}>
      <option value="">—</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  const tabs = [{id:"essential",label:"Essential"},{id:"contact",label:"Contact"},{id:"clinical",label:"Clinical"},{id:"consent",label:"Consent"}];
  const tabStyle = (id) => ({
    padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:"0.8rem", fontWeight:tab===id?700:500,
    background: tab===id ? PC.accent : PC.s2,
    color: tab===id ? "#fff" : PC.muted,
  });
  const canSubmit = fd.dem_name?.trim() && fd.consent_treat;
  return (
    <div>
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {tabs.map(t=><button key={t.id} style={tabStyle(t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* Essential */}
      {tab==="essential" && (
        <div>
          {field("Full name *", <input style={inp} placeholder="e.g. Riya Sharma" value={fd.dem_name||""} onChange={e=>set("dem_name",e.target.value)} autoFocus/>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>{field("Date of birth", <input type="date" style={inp} value={fd.dem_dob||""} onChange={e=>set("dem_dob",e.target.value)}/>)}</div>
            <div>{field("Age", <input style={inp} type="number" placeholder="e.g. 34" value={fd.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>)}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>{field("Sex", sel("dem_sex",["Female","Male","Non-binary","Prefer not to say"]))}</div>
            <div>{field("Dominant hand", sel("dem_hand",["Right","Left","Ambidextrous"]))}</div>
          </div>
          {field("Occupation", <input style={inp} placeholder="e.g. Teacher, Desk worker" value={fd.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>)}
          {field("Chief complaint *", <input style={inp} placeholder="e.g. Lower back pain, knee injury" value={fd.cc_main||""} onChange={e=>set("cc_main",e.target.value)}/>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{field("Pain now (0–10)", <input style={inp} type="number" min="0" max="10" placeholder="0–10" value={fd.cc_vas_now||""} onChange={e=>set("cc_vas_now",e.target.value)}/>)}</div>
            <div>{field("Duration", <input style={inp} placeholder="e.g. 3 weeks, 6 months" value={fd.cc_duration||""} onChange={e=>set("cc_duration",e.target.value)}/>)}</div>
          </div>
        </div>
      )}

      {/* Contact */}
      {tab==="contact" && (
        <div>
          {field("Phone number", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>)}
          {field("Email address", <input style={inp} type="email" placeholder="patient@email.com" value={fd.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
          {field("Address", <input style={inp} placeholder="Street, City, Postcode" value={fd.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>)}
          {field("Emergency contact name", <input style={inp} placeholder="Full name" value={fd.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}
          {field("Emergency contact phone", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}
        </div>
      )}

      {/* Clinical */}
      {tab==="clinical" && (
        <div>
          {field("Referring doctor / GP", <input style={inp} placeholder="Dr. Name, Hospital" value={fd.dem_referral_dr||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
          {field("Referral source", sel("dem_referral_source",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
          {field("Insurance / Fund", <input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={fd.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
          {field("Policy / Member number", <input style={inp} placeholder="Optional" value={fd.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
          {field("Relevant medical history", <textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={fd.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
          {field("Current medications", <input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={fd.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
        </div>
      )}

      {/* Consent */}
      {tab==="consent" && (
        <div>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:14,marginBottom:14,fontSize:"0.82rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Consent to Treatment</strong><br/>
            I consent to physiotherapy assessment and treatment. I understand I may withdraw consent at any time. Treatment goals and procedures have been explained to me.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:14}}>
            <input type="checkbox" checked={!!fd.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>I consent to physiotherapy assessment and treatment <span style={{color:"#ef4444"}}>*</span></span>
          </label>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:14,marginBottom:14,fontSize:"0.82rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Data Storage Consent</strong><br/>
            Your clinical data is stored locally on this device only. It is not shared with third parties. You may request deletion at any time.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:14}}>
            <input type="checkbox" checked={!!fd.consent_data} onChange={e=>set("consent_data",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:500}}>I consent to storage of my clinical data on this device</span>
          </label>
          {!fd.consent_treat && (
            <div style={{padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,fontSize:"0.78rem",color:"#ef4444",fontWeight:600}}>
              ⚠ Treatment consent is required to create a patient record.
            </div>
          )}
          <div style={{marginTop:12,padding:"8px 12px",background:PC.s3,borderRadius:8,fontSize:"0.75rem",color:PC.muted}}>
            Consent date: {new Date().toLocaleDateString("en-GB")} · Clinician: Dr. Demo
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={onCancel} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.82rem"}}>Cancel</button>
        <button disabled={!canSubmit} onClick={()=>onSubmit(fd)} style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:canSubmit?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#ccc",color:"#fff",fontWeight:800,cursor:canSubmit?"pointer":"not-allowed",fontSize:"0.82rem"}}>
          {canSubmit ? "Start Assessment →" : "Complete Consent tab first"}
        </button>
      </div>
    </div>
  );
}

function OnboardingModal({ PC, onDismiss }) {
  const STEPS = [
    { icon:"🩺", title:"Welcome to PhysioMind Pro", desc:"Your complete clinical assessment platform. AI-powered SOAP notes, posture analysis, outcome measures, and exercise prescription — all in one place.", color:"#7c3aed" },
    { icon:"👤", title:"Start with a Patient",        desc:'Tap "New Patient" on the dashboard to create a record. Fill in the name and chief complaint — everything else can be added as you go.',           color:"#0891b2" },
    { icon:"📋", title:"Assess Step by Step",          desc:"Work through the left-hand menu: Subjective → Posture → ROM → Special Tests → SOAP. Each module saves automatically as you type.",             color:"#059669" },
    { icon:"✨", title:"Generate SOAP & Send HEP",     desc:"Once assessed, use the SOAP module to generate an AI clinical note, then build a Home Exercise Programme and send it via WhatsApp or PDF.",   color:"#d97706" },
  ];
  const [step, setStep] = React.useState(0);
  const s = STEPS[step];
  return (
    <div onClick={onDismiss} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:PC.surface,borderRadius:20,padding:"28px 24px 22px",maxWidth:400,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.45)",border:`1px solid ${s.color}44`,textAlign:"center"}}>
        {/* Step dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {STEPS.map((_,i)=>(<div key={i} style={{width:i===step?20:7,height:7,borderRadius:99,background:i===step?s.color:PC.border,transition:"all 0.3s"}}/>))}
        </div>
        <div style={{fontSize:"2.8rem",marginBottom:14,lineHeight:1}}>{s.icon}</div>
        <div style={{fontWeight:900,fontSize:"1.15rem",color:PC.text,marginBottom:10,letterSpacing:"-0.3px"}}>{s.title}</div>
        <div style={{fontSize:"0.88rem",color:PC.muted,lineHeight:1.65,marginBottom:24}}>{s.desc}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center"}}>
          {step > 0 && (
            <button onClick={()=>setStep(n=>n-1)} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${PC.border}`,background:PC.s2,color:PC.muted,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>← Back</button>
          )}
          {step < STEPS.length-1 ? (
            <button onClick={()=>setStep(n=>n+1)} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Next →</button>
          ) : (
            <button onClick={onDismiss} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Let's go 🚀</button>
          )}
        </div>
        <button onClick={onDismiss} style={{marginTop:14,background:"none",border:"none",color:PC.muted,fontSize:"0.75rem",cursor:"pointer",textDecoration:"underline"}}>Skip tour</button>
      </div>
    </div>
  );
}

function AppInner({ currentUser, onSignOut }) {
  const { theme, toggle: toggleTheme, C: TC } = useTheme();

  // Apply theme to document root for CSS var support
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    // Apply background to body so no white flash
    document.body.style.background = TC.bg;
    document.body.style.color = TC.text;
  }, [theme, TC]);

  // Override module-level C with live theme colors for this render
  Object.assign(C, TC);

  const [active, setActive] = useState("home");
  const [navContext, setNavContext] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('pm_onboarded'));
  const [lastSaved, setLastSaved] = useState(null);

  // ── Deferred mounting: heavy tabs only render after first visit ──────────
  // This cuts initial render time dramatically
  // Once mounted, component stays mounted (data preserved)
  const [mountedTabs, setMountedTabs] = useState(new Set(["home", "demographics", "subjective"]));
  const [subjBodyChartTab, setSubjBodyChartTab] = useState(false);
  const [txTab, setTxTab] = useState("exercise");  // "exercise" | "tx" | "hep"
  // Heavy tabs — only mount on first visit
  const HEAVY_TABS = new Set([
    "posture", "ddx", "fms", "nkt", "cyriax",
    "fascia", "kinetic", "soap", "treatment", "exercise",
    "outcome", "special", "gait", "neuro", "palpation",
    "mmt", "rom", "dashboard", "reports",
  ]);

  // Wrapper: renders placeholder until tab first visited
  const DeferredMount = useCallback(({ tabKey, children }) => {
    const isMounted = mountedTabs.has(tabKey);
    const isActive = active === tabKey;
    if (!isMounted) return null;
    return (
      <div style={{ display: isActive ? "block" : "none" }}>
        {children}
      </div>
    );
  }, [mountedTabs, active]);

  // ── Hypothetical demo patient: Sarah Mitchell, 34F, chronic LBP ──────────
  const DEMO_DATA = {
    dem_name:"Sarah Mitchell", dem_age:"34", dem_gender:"Female", dem_occupation:"Graphic designer (desk-based, 8–10h/day)",
    dem_hand:"Right", dem_contact:"0412 345 678", dem_referral:"GP",

    // Subjective
    sub_complaint:"Chronic lower back pain, right worse than left, radiating into right buttock and posterior thigh to knee",
    sub_onset:"Gradual onset 18 months ago after new standing desk poorly adjusted. Worsened significantly 3 months ago after long-haul flight.",
    sub_mechanism:"Prolonged sitting/standing at workstation; exacerbated by forward bending, prolonged static postures",
    sub_behaviour:"Worse: sitting >30 min, morning stiffness for ~45 min, forward bending, end of workday. Better: walking, lying prone, heat pack. Constant dull ache 3–4/10 at rest; 7/10 with prolonged sitting.",
    sub_24hr:"Morning stiffness 30–45 min. Improves mid-morning. Worsens through afternoon. Difficulty sleeping in positions other than side-lying with pillow between knees.",
    sub_aggravating:"Prolonged sitting, driving >20 min, forward flexion, transitioning from sit to stand",
    sub_easing:"Short walks, heat, lying supine with knees bent",
    sub_vas:"5",
    sub_previous:"Episode 4 years ago resolved with physio. GP prescribed anti-inflammatories — minimal relief.",
    sub_medical:"No significant medical history. No bladder/bowel changes. No saddle anaesthesia. No unexplained weight loss.",
    sub_medications:"Ibuprofen 400mg PRN, oral magnesium",
    sub_goals:"Return to recreational running (5km x3/week), sit pain-free at work, reduce reliance on NSAIDs",

    // Red flags — all clear
    rf_malignancy:"No malignancy red flags",
    rf_cauda:"No cauda equina flags",
    rf_vascular:"No vascular red flags",
    rf_inflammatory:"No inflammatory red flags",
    rf_fracture:"No fracture red flags",
    rf_neuro:"No red flags — proceed with assessment",

    // Lumbar ROM
    lx_flex:"50", lx_ext:"15", lx_lat_left:"25", lx_lat_right:"18", lx_rot_left:"30", lx_rot_right:"22",
    lx_slr_left:"75", lx_slr_right:"52",

    // Special tests — lumbar
    lx_kemp_left:"Negative", lx_kemp_right:"Positive — reproduces right buttock pain",
    lx_slump_left:"Negative", lx_slump_right:"Positive — neural tension R",
    lx_prone_instability:"Negative",
    lx_psoas_left:"Normal", lx_psoas_right:"Tight",

    // Palpation
    lx_palpation:"L4/L5 R paraspinal tenderness +++. L5/S1 central PA stiff Grade IV+. Right SIJ posterior ligament tenderness ++. Right piriformis hypertonic.",

    // Neurological
    neuro_l4_reflex_left:"2+", neuro_l4_reflex_right:"2+",
    neuro_l5_motor_left:"5/5", neuro_l5_motor_right:"4+/5 — mild weakness great toe extension",
    neuro_s1_reflex_left:"2+", neuro_s1_reflex_right:"2+",
    neuro_dermatomal:"Mild paraesthesia right S1 distribution (lateral foot) on prolonged sitting — intermittent",

    // Posture
    posture_defect_anterior_pelvic_tilt: true,
    posture_defect_lumbar_hyperlordosis: true,
    posture_defect_forward_head: true,

    // Outcome measures
    om_psfs1:"Sitting at workstation for >30 min", om_psfs1_now:"3", om_psfs1_goal:"9",
    om_psfs2:"Recreational running 5km", om_psfs2_now:"1", om_psfs2_goal:"10",
    om_psfs3:"Long car journeys >20 min", om_psfs3_now:"2", om_psfs3_goal:"8",

    // Tx Techniques — Session 1
    tx_techniques: [
      { id:"t1", type:"manual", region:"Lumbar", technique:"PA Central", grade:"III", laterality:"Central", dosage:"3×60s oscillations", duration:"5 min", response:"ROM improved flexion from 50° to 62°. Pain eased from 5/10 to 3/10 during technique.", notes:"Performed at L4/L5 prone. Patient comfortable throughout.", savedAt:"2025-05-07T09:15:00Z" },
      { id:"t2", type:"manual", region:"Lumbar", technique:"PA Unilateral", grade:"III", laterality:"Right", dosage:"3×30s", duration:"3 min", response:"Reproduction of right buttock pain at Grade II — eased by Grade III. Good movement gain.", savedAt:"2025-05-07T09:22:00Z" },
      { id:"t3", type:"dn", dn_muscle:"Piriformis", laterality:"Right", dn_needles:"2", dn_depth:"40mm", dn_twitch:"Yes — elicited", notes:"Pistoning technique, needles retained 8 min, significant LTR on insertion. Post-needling stretch applied.", response:"Deep ache during LTR. Post-needling right buttock significantly less tender on palpation.", savedAt:"2025-05-07T09:35:00Z" },
      { id:"t4", type:"st", st_technique:"Deep tissue massage", st_region:"Right paraspinals L3–S1, right QL", laterality:"Right", duration:"6 min", dosage:"Moderate-deep pressure, longitudinal and cross-fibre strokes", response:"Palpation tenderness reduced from +++ to ++. Patient reported warmth and easing.", savedAt:"2025-05-07T09:45:00Z" },
    ],

    // HEP — Exercise Programme
    hep_programme: [
      { id:"knee_to_chest", name:"Knee-to-Chest Stretch", region:"lumbar", phase:"Phase 1", sets:"1", reps:"10", hold:"30", freq:"Daily", evidence:"A", customSets:"1", customReps:"10", customHold:"30", customFreq:"Daily", notes:"Gently pull both knees. Stop if sharp pain." },
      { id:"dead_bug", name:"Dead Bug", region:"lumbar", phase:"Phase 1", sets:"3", reps:"8", hold:"3", freq:"Daily", evidence:"A", customSets:"3", customReps:"8", customHold:"3", customFreq:"Daily", notes:"Keep lower back flat on floor throughout." },
      { id:"glute_bridge", name:"Glute Bridge", region:"lumbar", phase:"Phase 2", sets:"3", reps:"15", hold:"2", freq:"Daily", evidence:"A", customSets:"3", customReps:"15", customHold:"2", customFreq:"Daily", notes:"Squeeze glutes at top. Do not hyperextend lumbar." },
      { id:"hip_flexor_stretch", name:"Hip Flexor Couch Stretch", region:"lumbar", phase:"Phase 1", sets:"2", reps:"1", hold:"45", freq:"Daily", evidence:"B", customSets:"2", customReps:"1", customHold:"45", customFreq:"Daily", notes:"Both sides. Posteriorly tilt pelvis before stretching." },
    ],

    // Session Log — Session 1
    tx_sessions: [
      {
        id:"sess1", date:"07/05/2025", sessionNo:"1", type:"Initial Assessment",
        vasStart:"5", vasEnd:"3",
        treatmentGiven:"L4/L5 PA mobilisation Grade III (central + right unilateral). Dry needling right piriformis x2 needles — LTR elicited. Deep tissue massage right paraspinals and QL. HEP prescribed (Phase 1).",
        techniques:"Joint Mobilisation Grade III (PA Central, Lumbar, Central); Joint Mobilisation Grade III (PA Unilateral, Lumbar, Right); Dry Needling — Piriformis (Right), 2 needles, 40mm, LTR yes; Soft Tissue — Deep tissue massage — Right paraspinals L3–S1, right QL",
        hep:"Knee-to-Chest Stretch — 1×10, hold 30s, Daily; Dead Bug — 3×8, hold 3s, Daily; Glute Bridge — 3×15, hold 2s, Daily; Hip Flexor Couch Stretch — 2×1, hold 45s, Daily",
        response:"ROM improved L flexion 50°→62°, lateral flexion R improved 18°→24°. Pain reduced 5/10→3/10 post-treatment. Neural tension remains positive right slump — continue to monitor. Piriformis tenderness reduced significantly post-DN. Patient tolerated all techniques well.",
        nextPlan:"Reassess lumbar ROM and neural tension. Progress to Grade III/IV if pain settling. Add thoracic extension mobilisation. Progress to Phase 2 HEP (loading) if pain <3/10 sustained. Review sitting posture and workstation setup — consider ergonomic referral.",
        goals:"ST goal: Sit pain-free >30 min within 4 weeks. MT goal: Return to running 3 months. Patient motivated and engaged.",
        clinician:"Dr. J. Thompson (APAM)", notes:"Consent obtained. Informed of DN risks. Next appointment in 1 week.",
        savedAt:"2025-05-07T10:10:00Z"
      }
    ],
  };

  const [data, setData] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const draft = raw && raw.pid ? raw.data : (raw && !raw.pid ? raw : null);
      if (draft && Object.keys(draft).length > 5) return draft;
    } catch {}
    return {};
  });
  const [draftRestored, setDraftRestored] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const draft = raw && raw.pid ? raw.data : (raw && !raw.pid ? raw : null);
      return !!(draft && Object.keys(draft).length > 5);
    } catch { return false; }
  });
  const [showDx, setShowDx] = useState(false);
  const [dx, setDx] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [expandedDx, setExpandedDx] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  // bnavHidden removed — bottom nav is now always visible
  const [bnavTab, setBnavTab] = useState(null); // null=no panel open, or "assessment"|"advanced"|"treatment"|"documentation"|"top"
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQ, setMobileSearchQ] = useState("");
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonMsg, setJsonMsg] = useState(null);
  const importRef = useRef(null);

  // ── Multi-Patient Database ─────────────────────────────────────────────
  const [patients, setPatients] = useState(() => loadPatientDB());
  const [taskDB, setTaskDB] = useState(() => loadTaskDB());

  // ── Supabase: load patients on mount and merge with localStorage ──────────
  useEffect(() => {
    supabase.from("patients").select("*")
      .eq("user_id", currentUser?.id || "")
      .order("updated_at", { ascending: false })
      .then(({ data: rows, error }) => {
        if (error || !rows || rows.length === 0) return;
        const remote = rows.map(r => ({
          id: r.id,
          name: r.name,
          data: r.data || {},
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          hasRedFlags: r.has_red_flags || false,
          lastDx: r.last_dx || "",
        }));
        setPatients(prev => {
          const localMap = new Map(prev.map(p => [p.id, p]));
          const remoteMap = new Map(remote.map(p => [p.id, p]));
          const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
          const merged = [];
          for (const id of allIds) {
            const loc = localMap.get(id);
            const rem = remoteMap.get(id);
            if (!loc) { merged.push(rem); continue; }
            if (!rem) { merged.push(loc); continue; }
            const lt = new Date(loc.updatedAt || 0).getTime();
            const rt = new Date(rem.updatedAt || 0).getTime();
            merged.push(rt >= lt ? rem : loc);
          }
          merged.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          try { localStorage.setItem(DB_KEY, JSON.stringify(merged)); } catch {}
          return merged;
        });
      });
  }, []);

  // ── Auto-save draft to localStorage (2s debounce) ─────────────────────
  // activePatientId captured via closure — NOT in deps to avoid Rollup TDZ bug
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;
    const pid = activePatientId;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: pid || null, data }));
        setLastSaved(new Date());
      } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task helpers ─────────────────────────────────────────────────────────
  const saveTasks = (tasks) => { setTaskDB(tasks); saveTaskDB(tasks); };

  const completeTask = (taskId) => {
    setTaskDB(prev => {
      const updated = prev.map(t =>
        t.id === taskId
          ? { ...t, status:"completed", completedAt: new Date().toISOString() }
          : t
      );
      saveTaskDB(updated);
      return updated;
    });
  };

  const dismissTask = (taskId) => {
    setTaskDB(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      saveTaskDB(updated);
      return updated;
    });
  };

  const addOrUpdateTask = (task) => {
    setTaskDB(prev => {
      // Don't duplicate — check by templateId
      const exists = prev.find(t => t.templateId === task.templateId && t.status !== "completed");
      if (exists) return prev;
      const updated = [task, ...prev];
      saveTaskDB(updated);
      return updated;
    });
  };
  const [activePatientId, setActivePatientId] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      return (raw && raw.pid) ? raw.pid : null;
    } catch { return null; }
  });
  const [showPatientDb, setShowPatientDb] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [pendingPatient, setPendingPatient] = useState(null);
  const [showPdfReports, setShowPdfReports] = useState(false);
  const [profilePatient, setProfilePatient] = useState(null);
  const [profileTab, setProfileTab] = useState(null);
  const [showIntake, setShowIntake] = useState(false);
  const [intakeData, setIntakeData] = useState({});

  // Auto-save current data to active patient whenever data changes
  useEffect(() => {
    if (!activePatientId) return;
    setPatients(prev => {
      const updated = prev.map(p => p.id === activePatientId ? {
        ...p,
        data,
        name: data["dem_name"] || p.name || "Unnamed Patient",
        updatedAt: new Date().toISOString(),
        hasRedFlags: (()=>{
          // Check both old rf_* fields and new grf_* fields used in SubjectiveModule
          const oldFields = ["rf_malignancy","rf_cauda","rf_vascular","rf_inflammatory","rf_fracture","rf_neuro"];
          const oldSafe = ["No malignancy red flags","No cauda equina flags","No vascular red flags","No inflammatory red flags","No fracture red flags","No neurological red flags","No red flags — proceed with assessment"];
          const oldHit = oldFields.flatMap(fid=>(typeof data[fid]==="string"?data[fid]:"").split("|||")).filter(v=>v&&!oldSafe.includes(v)).length>0;
          // grf_action: if not "No red flags — proceed with assessment", a flag is present
          const grfAction = data.grf_action||"";
          const grfHit = grfAction && grfAction !== "No red flags — proceed with assessment";
          // Any region rf_action set to something other than safe
          const regionRfHit = ["cx","lx","hp","shl","shr","knl","knr","af","ew","tx"].some(px=>{
            const v = data[`${px}_rf_action`]||"";
            return v && v !== "No red flags — proceed" && v !== "No red flags — proceed with assessment" && v !== "No concerns — proceed";
          });
          return oldHit || grfHit || regionRfHit;
        })()
      } : p);
      savePatientDB(updated);
      return updated;
    });
  }, [data, activePatientId]);

  const createNewPatient = () => {
    setIntakeData({});
    setShowIntake(true);
    setShowPatientDb(false);
  };
  const finaliseNewPatient = (intake) => {
    const name = intake.dem_name || "New Patient";
    const newP = { id: genId(), name, data: intake, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: intake.cc_main||"" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated);
    setData(intake);
    setActivePatientId(newP.id);
    setShowIntake(false);
    navTo("subjective");
    setJsonMsg({ type:"success", text:`✅ Patient created: ${name}` });
    setTimeout(() => setJsonMsg(null), 2500);
  };

  const selectPatient = (p) => {
    const hasChanges = Object.keys(data).length > 0 && activePatientId !== p.id;
    if (hasChanges) { setPendingPatient(p); setShowUnsaved(true); return; }
    // Load patient data; ignore any draft that belongs to a different patient
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const draftPid = raw && raw.pid ? raw.pid : null;
      const draftData = raw && raw.pid ? raw.data : null;
      if (draftPid === p.id && draftData && Object.keys(draftData).length > 5) {
        setData(draftData); // restore draft for THIS patient only
      } else {
        setData(p.data || {}); // use saved data, ignore other patient's draft
        try { if (draftPid && draftPid !== p.id) localStorage.removeItem(DRAFT_KEY); } catch {}
      }
    } catch {
      setData(p.data || {});
    }
    setActivePatientId(p.id);
    setShowPatientDb(false);
    setJsonMsg({ type:"success", text:`✅ Loaded: ${p.name || "Patient"}` });
    setTimeout(() => setJsonMsg(null), 2500);
  };

  const confirmSwitchPatient = (save) => {
    if (save && activePatientId) {
      setPatients(prev => {
        const updated = prev.map(p => p.id === activePatientId ? { ...p, data, name: data["dem_name"] || p.name, updatedAt: new Date().toISOString() } : p);
        savePatientDB(updated);
        return updated;
      });
    }
    if (pendingPatient) {
      setData(pendingPatient.data || {});
      setActivePatientId(pendingPatient.id);
      setShowPatientDb(false);
    }
    setPendingPatient(null);
    setShowUnsaved(false);
  };

  const deletePatient = (id) => {
    if (!window.confirm("Delete this patient? This cannot be undone.")) return;
    const updated = patients.filter(p => p.id !== id);
    setPatients(updated);
    savePatientDB(updated);
    if (activePatientId === id) { setData({}); setActivePatientId(null); }
    setJsonMsg({ type:"success", text:"Patient deleted" });
    setTimeout(() => setJsonMsg(null), 2000);
  };

  const importPatientFromJSON = (parsed) => {
    if (!parsed.data) return;
    const newP = { id: genId(), name: parsed.patientName || parsed.data?.dem_name || "Imported Patient", data: parsed.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: parsed.lastDx || "" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated);
    setData(newP.data);
    setActivePatientId(newP.id);
    setShowPatientDb(false);
    setJsonMsg({ type:"success", text:`✅ Imported: ${newP.name}` });
    setTimeout(() => setJsonMsg(null), 3000);
  };

  const activePatient = patients.find(p => p.id === activePatientId) || null;

  // ── Optimised set function ──────────────────────────────────────────────
  // set(obj) — SubjectiveModule style (passes whole data object)
  // set(id, val) — legacy field-by-field style
  const set = useCallback((idOrObj, val) => {
    if (typeof idOrObj === "object" && idOrObj !== null) {
      // New style: set({ ...data, field: value }) — merge over current state to avoid stale overwrites
      setData(prev => ({ ...prev, ...idOrObj }));
    } else {
      // Legacy style: set("field_id", value)
      setData(prev => ({ ...prev, [idOrObj]: val }));
    }
  }, []);
  const sections = Object.entries(ALL_TESTS);
  const currentSection = ALL_TESTS[active];
  const completedCount = Object.keys(data).filter(k=>data[k]&&data[k]!=="").length;

  // ── Red flag detection ─────────────────────────────────────────────────
  const RED_FLAG_FIELDS = ["rf_malignancy","rf_cauda","rf_vascular","rf_inflammatory","rf_fracture","rf_neuro"];
  const SAFE_VALUES = ["No malignancy red flags","No cauda equina flags","No vascular red flags","No inflammatory red flags","No fracture red flags","No neurological red flags","No red flags — proceed with assessment"];
  const activeRedFlags = RED_FLAG_FIELDS.flatMap(fid => {
    const val = data[fid] || "";
    if (!val) return [];
    return (typeof val==="string"?val:"").split("|||").filter(v => v && !SAFE_VALUES.includes(v));
  });
  const hasRedFlags = activeRedFlags.length > 0;

  // Cauda equina = urgent
  const urgentFlags = activeRedFlags.filter(f =>
    f.includes("Bladder") || f.includes("Bowel") || f.includes("Saddle") ||
    f.includes("Bilateral leg weakness") || f.includes("cauda") || f.includes("Cauda")
  );

  // ── JSON export ────────────────────────────────────────────────────────
  const exportJSON = () => {
    const payload = {
      version: "PostureApp_v4",
      exportedAt: new Date().toISOString(),
      patientName: data["dem_name"] || "Unknown",
      data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment_${(data["dem_name"]||"patient").replace(/\s+/g,"_")}_${new Date().toLocaleDateString("en-GB").replace(/\//g,"-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Also update lastDx on patient record
    if (activePatientId && dx) {
      setPatients(prev => {
        const updated = prev.map(p => p.id === activePatientId ? {...p, lastDx: dx.dx?.[0]?.label || ""} : p);
        savePatientDB(updated);
        return updated;
      });
    }
    setJsonMsg({type:"success", text:"✅ Assessment exported successfully!"});
    setTimeout(()=>setJsonMsg(null), 3000);
  };

  const importJSON = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      if (!parsed.data) throw new Error("Invalid file — missing data field");
      setData(parsed.data);
      setJsonImportText("");
      setShowJsonPanel(false);
      setJsonMsg({type:"success", text:`✅ Assessment loaded: ${parsed.patientName || "Patient"}`});
      setTimeout(()=>setJsonMsg(null), 4000);
    } catch(e) {
      setJsonMsg({type:"error", text:`❌ Import failed: ${e.message}`});
      setTimeout(()=>setJsonMsg(null), 4000);
    }
  };

  const importFromFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setJsonImportText(ev.target.result); importJSON(); };
    reader.readAsText(file);
  };

  const runDx = () => { setDx(generateDiagnosis(data)); setShowDx(true); };
  const navTo = useCallback((key, ctx = {}) => {
    setActive(key);
    setNavContext(ctx);
    setNavOpen(false);
    // Mount tab on first visit
    setMountedTabs(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const Field = useCallback(({t})=>{
    const base = { width:"100%", background:PC.s3, border:`1px solid ${PC.border}`, borderRadius:8, color:PC.text, fontFamily:"inherit", outline:"none", padding:"8px 10px", fontSize:"0.8rem" };
    const val = data[t.id]||"";

    if(t.type==="bilateral_num"){
      return (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["_left","LEFT"],["_right","RIGHT"]].map(([sfx,side])=>{
            const sv=data[t.id+sfx]||"",num=parseFloat(sv);
            const col=isNaN(num)?PC.muted:num<(t.normal||0)*0.8?PC.red:num<(t.normal||0)*0.9?PC.yellow:PC.green;
            return(
              <div key={sfx}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:col,marginBottom:3}}>{side} {!isNaN(num)&&num<(t.normal||0)*0.8?"⚠ LIMITED":""}</div>
                <input type="number" value={sv} onChange={e=>set(t.id+sfx,e.target.value)} placeholder={`N=${t.normal||""}°`} style={{...base,borderColor:!isNaN(num)&&num<(t.normal||0)*0.8?PC.red:PC.border}} />
              </div>
            );
          })}
        </div>
      );
    }
    if(t.type==="bilateral_select"){
      const isProb=v=>v&&(v.includes("Positive")||v.includes("Inhibited")||v.includes("tightness")||v.includes("Significant")||v.includes("Abnormal"));
      return(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["_left","LEFT"],["_right","RIGHT"]].map(([sfx,side])=>{
            const sv=data[t.id+sfx]||"",prob=isProb(sv);
            return(
              <div key={sfx}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:prob?PC.red:PC.muted,marginBottom:3}}>{side} {prob?"⚠":""}</div>
                <select value={sv} onChange={e=>set(t.id+sfx,e.target.value)} style={{...base,borderColor:prob?PC.red:PC.border}}>
                  <option value="">— select —</option>
                  {t.options.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      );
    }
    if(t.type==="select"||t.type==="select3"){
      const prob=val&&(val.includes("Positive")||val.includes("REFER")||val.includes("Inhibited")||val.includes("Absent")||val.includes("Severe")||val.includes("Moderate")||val.includes("Significant"));
      return(<select value={val} onChange={e=>set(t.id,e.target.value)} style={{...base,borderColor:prob?PC.red:PC.border}}><option value="">— select —</option>{t.options.map(o=><option key={o} value={o}>{o}</option>)}</select>);
    }
    if(t.type==="textarea") return(<textarea value={val} onChange={e=>set(t.id,e.target.value)} placeholder={t.placeholder||""} style={{...base,resize:"vertical",minHeight:64,display:"block"}}/>);
    if(t.type==="num") return(<input type="number" value={val} onChange={e=>set(t.id,e.target.value)} placeholder={t.placeholder||""} style={base}/>);
    return(<input type={t.type||"text"} value={val} onChange={e=>set(t.id,e.target.value)} placeholder={t.placeholder||""} style={base}/>);
  },[data,set]);

  const sysColors={CPA:C.blue,STTT:PC.yellow,FMS:PC.green,Posture:PC.purple,"Kinetic Chain":PC.accent,Fascia:"#f97316","Muscle Activation":PC.purple,Structural:PC.red};

  // shared sidebar list renderer used by both desktop sidebar and mobile drawer
  // ── Collapsible sidebar state ──
  const [sidebarOpen, setSidebarOpen] = React.useState({ assessment:true, advanced:false, treatment:false, documentation:false });
  const toggleSidebar = (key) => setSidebarOpen(p=>({...p,[key]:!p[key]}));

  // Helper: get completion % for a nav key
  const getSectionPct = (key) => {
    const sec = ALL_TESTS[key];
    if(!sec) return 0;
    const allT=Object.values(sec.groups||{}).flat().filter(t=>typeof t==="object"&&t.id);
    const nktT=key==="nkt"?Object.values(NKT_REGIONS||{}).flatMap(r=>r.tests||[]).map(t=>t.id):[];
    const kcT=key==="kinetic"?Object.values(KC_REGIONS||{}).flatMap(r=>r.tests||[]).map(t=>t.id):[];
    const fmaKeys=key==="fma"?Object.keys(MOVEMENTS||{}).map(m=>`fma_${m}`):[];
    const subjKeys=key==="subjective"?[
      ...Object.values(UNIV_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
      ...Object.values(REG_MOD_S||{}).flatMap(mod=>Object.values(mod.sections||mod||{}).flatMap(s=>s.fields?s.fields.map(f=>f.id):[])),
      ...Object.values(BPS_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
      ...Object.values(SLEEP_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
      ...Object.values(SPORT_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
    ]:[];
    const neuroKeys=key==="neuro"?[...( DERMATOMES||[]).flatMap(d=>[d.id+"_left",d.id+"_right"]),...(REFLEXES||[]).flatMap(r=>[r.id+"_left",r.id+"_right"]),...(NEURAL_TENSION||[]).flatMap(nt=>[nt.id+"_left",nt.id+"_right"]),...(RED_FLAGS_NEURO||[]).map(rf=>rf.id)]:[];
    const allKeys=[...allT.map(t=>t.id),...nktT,...kcT,...fmaKeys,...subjKeys,...neuroKeys];
    const filled=allKeys.filter(id=>data[id]&&data[id]!=="").length;
    const total=allT.length+nktT.length+kcT.length+fmaKeys.length+subjKeys.length+neuroKeys.length;
    return total>0?Math.round(filled/total*100):0;
  };

  // Sidebar nav item renderer
  const SidebarItem = ({ navKey, icon, label }) => {
    const isAct = active === navKey;
    const pct = getSectionPct(navKey);
    return (
      <div onClick={()=>navTo(navKey)} style={{
        padding:"8px 12px 8px 28px", cursor:"pointer", margin:"1px 6px",
        borderRadius:8,
        background: isAct ? "rgba(124,58,237,0.10)" : "transparent",
        borderLeft: isAct ? "3px solid #7c3aed" : "3px solid transparent",
        transition:"all 0.15s",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:"0.82rem",opacity:isAct?1:0.65,flexShrink:0}}>{icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.74rem",fontWeight:isAct?700:500,color:isAct?"#7c3aed":PC.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {label}
            </div>
            {pct>0&&(
              <div style={{marginTop:3,height:2,borderRadius:2,background:PC.border}}>
                <div style={{height:"100%",width:`${pct}%`,background:pct===100?PC.green:pct>60?PC.yellow:"#7c3aed",borderRadius:2,transition:"width 0.4s"}}/>
              </div>
            )}
          </div>
          {pct===100&&<span style={{fontSize:"0.75rem",color:PC.green,flexShrink:0,fontWeight:800}}>✓</span>}
          {pct>0&&pct<100&&<span style={{fontSize:"0.75rem",color:PC.muted,flexShrink:0,fontWeight:600,background:PC.s2,padding:"1px 4px",borderRadius:4}}>{pct}%</span>}
        </div>
      </div>
    );
  };

  // Collapsible group header
  const SidebarGroup = ({ groupKey, icon, label, children, accentColor="#7c3aed" }) => {
    const isOpen = sidebarOpen[groupKey];
    return (
      <div style={{marginBottom:2}}>
        <div onClick={()=>toggleSidebar(groupKey)} style={{
          display:"flex",alignItems:"center",gap:7,
          padding:"9px 12px",margin:"2px 6px",cursor:"pointer",borderRadius:8,
          background: isOpen ? `${accentColor}0d` : "transparent",
          border:`1px solid ${isOpen ? accentColor+"28" : "transparent"}`,
          transition:"all 0.15s",
        }}>
          <span style={{fontSize:"0.85rem",flexShrink:0}}>{icon}</span>
          <div style={{flex:1,fontSize:"0.82rem",fontWeight:700,color:isOpen?accentColor:PC.text,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
          <span style={{fontSize:"0.75rem",color:isOpen?accentColor:PC.muted,transition:"transform 0.2s",display:"inline-block",transform:isOpen?"rotate(0deg)":"rotate(-90deg)"}}>▾</span>
        </div>
        {isOpen && (
          <div style={{paddingBottom:4}}>
            {children}
          </div>
        )}
      </div>
    );
  };

  // Top-level nav item (no indent)
  const SidebarTopItem = ({ navKey, icon, label }) => {
    const isAct = active === navKey;
    return (
      <div onClick={()=>navTo(navKey)} style={{
        display:"flex",alignItems:"center",gap:8,
        padding:"9px 14px",margin:"1px 6px",cursor:"pointer",borderRadius:9,
        background:isAct?"rgba(124,58,237,0.10)":"transparent",
        border:`1px solid ${isAct?"rgba(124,58,237,0.25)":"transparent"}`,
        transition:"all 0.15s",
      }}>
        <span style={{fontSize:"0.9rem",opacity:isAct?1:0.7}}>{icon}</span>
        <div style={{fontSize:"0.76rem",fontWeight:isAct?700:600,color:isAct?"#7c3aed":PC.text}}>{label}</div>
      </div>
    );
  };

  const SidebarItems = ({ onNav }) => (
    <>
      {/* Greeting */}
      <div style={{padding:"10px 12px 8px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:"1.05rem"}}>👋</span>
        <div>
          <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.text,lineHeight:1.2}}>Hello, Dr {currentUser?.user_metadata?.full_name?.split(" ")[0]||currentUser?.email?.split("@")[0]||"Doctor"}</div>
          <div style={{fontSize:"0.78rem",color:PC.muted}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
      </div>

      {/* Patient controls */}
      <div style={{padding:"4px 8px 12px",borderBottom:`1px solid ${PC.border}`,marginBottom:8}}>
        <button onClick={()=>setShowPatientDb(true)} style={{width:"100%",padding:"9px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:"#9333ea",fontWeight:600,fontSize:"0.8rem",cursor:"pointer",marginBottom:5,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          👥 {patients.length} Patient{patients.length!==1?"s":""}
        </button>
        <button onClick={createNewPatient} style={{width:"100%",padding:"8px 10px",background:"rgba(5,150,105,0.06)",border:`1px solid ${PC.a3}25`,borderRadius:8,color:PC.a3,fontWeight:600,fontSize:"0.78rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          ＋ New Patient
        </button>

        {/* ── Active patient + PDF buttons ── */}
        {data.dem_name && (
          <div style={{marginTop:8,background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.18)",borderRadius:9,padding:"8px 10px"}}>
            {/* Patient name pill */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0,display:"inline-block"}}/>
              <span style={{fontSize:"0.78rem",fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{data.dem_name}</span>
              {data.dem_age && <span style={{fontSize:"0.72rem",color:"#64748b",flexShrink:0}}>{data.dem_age}y</span>}
            </div>
            {/* PDF download buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
              <button
                onClick={()=>{ setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="assessment"]'); if(el) el.click(); },300); }}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#1a3a5c,#2563eb)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(37,99,235,0.3)"}}>
                📋 Assessment
              </button>
              <button
                onClick={()=>{ setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="treatment"]'); if(el) el.click(); },300); }}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#065f46,#059669)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(5,150,105,0.3)"}}>
                🗒️ Treatment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Home */}
      <SidebarTopItem navKey="home" icon="🏠" label="Home"/>

      {/* 2. Dashboard */}
      <SidebarTopItem navKey="dashboard" icon="📊" label="Dashboard"/>

      <div style={{height:1,background:PC.border,margin:"6px 12px"}}/>

      {/* 3. Assessment (collapsible) */}
      <SidebarGroup groupKey="assessment" icon="🩺" label="Assessment" accentColor="#7c3aed">
        <SidebarItem navKey="demographics"   icon="👤" label="Demographics"/>
        <SidebarItem navKey="subjective"    icon="📝" label="Subjective Assessment"/>
        <SidebarItem navKey="posture"       icon="🧍" label="Posture Analysis"/>
        <SidebarItem navKey="observation"   icon="👁️" label="Observation"/>
        <SidebarItem navKey="palpation"     icon="🖐️" label="Palpation"/>
        <SidebarItem navKey="rom"           icon="📐" label="Range of Motion"/>
        <SidebarItem navKey="mmt"           icon="💪" label="MMT"/>
        <SidebarItem navKey="special"       icon="🔬" label="Special Tests (100+)"/>
        <SidebarItem navKey="neuro"         icon="⚡" label="Neurological"/>
        <SidebarItem navKey="outcome"       icon="📈" label="Outcome Measures"/>
      </SidebarGroup>

      {/* 4. Advanced Clinical Assessment (collapsible) */}
      <SidebarGroup groupKey="advanced" icon="🔭" label="Advanced Assessment" accentColor="#9333ea">
        <SidebarItem navKey="fma"          icon="🏃" label="Functional Assessment"/>
        <SidebarItem navKey="gait"         icon="🚶" label="Gait Analysis"/>
        <SidebarItem navKey="cyriax_full"  icon="🦴" label="STTT — Selective Tissue Tension"/>
        <SidebarItem navKey="kinetic"      icon="⛓️" label="Kinetic Chain"/>
        <SidebarItem navKey="nkt"          icon="🧠" label="CPA — Compensation Pattern Analysis"/>
        <SidebarItem navKey="fascia"       icon="🕸️" label="Fascia Integration"/>
      </SidebarGroup>

      {/* 5. Treatment (collapsible) */}
      <SidebarGroup groupKey="treatment" icon="💊" label="Treatment" accentColor="#059669">
        <SidebarItem navKey="treatment"    icon="💊" label="Treatment"/>
      </SidebarGroup>

      {/* 6. Documentation (collapsible) */}
      <SidebarGroup groupKey="documentation" icon="📋" label="Documentation" accentColor="#b45309">
        <SidebarItem navKey="tx_sessions"  icon="⚡" label="Quick Visit"/>
        <SidebarItem navKey="soap"         icon="📋" label="SOAP Notes"/>
        <SidebarItem navKey="ai_assistant" icon="🤖" label="AI Assistant"/>
      </SidebarGroup>



    </>
  );

  return(
    <div className="pm-shell" style={{background:PC.bg,color:PC.text,fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",transition:"background 0.2s,color 0.15s"}}>
      <MobileStyleInjector/>

      {/* ── Onboarding Modal — fires once on first visit ─────────────────── */}
      {showOnboarding&&<OnboardingModal PC={PC} onDismiss={()=>{ localStorage.setItem("pm_onboarded","1"); setShowOnboarding(false); }}/>}

      {/* Info Modal */}
      {infoModal&&(
        <div onClick={()=>setInfoModal(null)} className="pm-modal-wrap" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} className="pm-modal-box" style={{background:PC.surface,border:`1px solid ${PC.accent}40`,borderRadius:14,padding:24,maxWidth:500,width:"100%",maxHeight:"82vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,color:PC.accent,marginBottom:14,fontSize:"1rem"}}>{infoModal.label}</div>
            {infoModal.sig&&<div style={{marginBottom:12}}><div style={{fontSize:"0.82rem",fontWeight:700,color:PC.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>📊 Significance</div><div style={{background:PC.s2,borderRadius:8,padding:12,fontSize:"0.8rem",color:PC.text,lineHeight:1.7}}>{infoModal.sig}</div></div>}
            {infoModal.how&&<div style={{marginBottom:16}}><div style={{fontSize:"0.82rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>👐 How to Perform</div><div style={{background:PC.s2,borderRadius:8,padding:12,fontSize:"0.8rem",color:PC.text,lineHeight:1.7}}>{infoModal.how}</div></div>}
            <button onClick={()=>setInfoModal(null)} style={{padding:"10px 20px",background:PC.a2,border:"none",borderRadius:8,color:"#fff",fontWeight:700,cursor:"pointer",width:"100%",fontSize:"0.85rem"}}>Close</button>
          </div>
        </div>
      )}

      {/* Mobile nav overlay */}
      {navOpen&&<div className="pm-nav-overlay" onClick={()=>setNavOpen(false)}/>}

      {/* ── PATIENT DATABASE PANEL ── */}
      {showPatientDb && (
        <PatientDatabasePanel
          patients={patients}
          activeId={activePatientId}
          onSelect={selectPatient}
          onNew={createNewPatient}
          onDelete={deletePatient}
          onClose={()=>setShowPatientDb(false)}
          onImport={importPatientFromJSON}
          onNav={(key)=>{ setShowPatientDb(false); navTo(key); }}
          liveData={data}
        />
      )}

      {/* ── PATIENT PROFILE MODAL (from bar or dashboard) ── */}
      {profilePatient && !showPatientDb && (
        <PatientProfileModal
          patient={(()=>{
            const fresh = patients.find(p=>p.id===profilePatient.id) || profilePatient;
            return fresh.id===activePatientId
              ? {...fresh, data:{...fresh.data,...data}}
              : fresh;
          })()}
          onClose={()=>{ setProfilePatient(null); setProfileTab(null); }}
          onLoadAssessment={(p)=>{ selectPatient(p); setProfilePatient(null); }}
          onSaveField={(id,newData)=>{
            setPatients(prev=>prev.map(p=>p.id===id?{...p,data:{...p.data,...newData},name:newData.dem_name||p.name,updatedAt:new Date().toISOString()}:p));
          }}
          onNav={(key)=>{ if(key==="demographics"){ setProfileTab("demographics"); } else { setProfilePatient(null); setProfileTab(null); navTo(key); } }}
          initialTab={profileTab||undefined}
        />
      )}

      {/* ── NEW PATIENT INTAKE MODAL ── */}
      {showIntake && (
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{width:"100%",maxWidth:420,background:PC.surface,borderRadius:16,padding:"24px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:4}}>New patient</div>
            <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:20}}>Fill the basics — you can add more detail later</div>
            <IntakeForm PC={PC} onCancel={()=>setShowIntake(false)} onSubmit={finaliseNewPatient}/>
          </div>
        </div>
      )}

      {/* ── PDF REPORTS MODAL ── */}
      {showPdfReports && (
        <PdfReportsModal
          data={data}
          dx={dx}
          patients={patients}
          onClose={()=>setShowPdfReports(false)}
        />
      )}

      {/* ── UNSAVED CHANGES DIALOG ── */}
      {showUnsaved && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0e1118",border:"1px solid rgba(255,179,0,0.3)",borderRadius:14,padding:24,maxWidth:380,width:"100%"}}>
            <div style={{fontSize:"1.2rem",marginBottom:8}}>⚠️</div>
            <div style={{fontWeight:800,color:"#1a1025",fontSize:"0.92rem",marginBottom:6}}>Unsaved Changes</div>
            <div style={{fontSize:"0.78rem",color:"#5a7090",marginBottom:20,lineHeight:1.6}}>
              You have unsaved changes for <strong style={{color:"#1a1025"}}>{activePatient?.name || "this patient"}</strong>. What would you like to do?
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>confirmSwitchPatient(true)} style={{padding:"11px",background:"linear-gradient(135deg,#00e5ff,#7f5af0)",border:"none",borderRadius:9,color:"#000",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                💾 Save & Switch Patient
              </button>
              <button onClick={()=>confirmSwitchPatient(false)} style={{padding:"11px",background:"rgba(255,179,0,0.1)",border:"1px solid rgba(255,179,0,0.3)",borderRadius:9,color:"#ffb300",fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>
                ↩ Discard Changes & Switch
              </button>
              <button onClick={()=>{setShowUnsaved(false);setPendingPatient(null);}} style={{padding:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,color:"#5a7090",fontSize:"0.78rem",cursor:"pointer"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERSISTENT RED FLAG ALERT BANNER ── */}
      {hasRedFlags && (
        <div style={{position:"sticky",top:54,zIndex:98,background:urgentFlags.length>0?"rgba(255,77,109,0.97)":"rgba(255,179,0,0.95)",borderBottom:`2px solid ${urgentFlags.length>0?"#ff4d6d":"#ffb300"}`,padding:"8px 20px",display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontSize:"1.1rem"}}>{urgentFlags.length>0?"🚨":"⚠️"}</span>
            <div>
              <div style={{fontWeight:800,fontSize:"0.78rem",color:"#000"}}>{urgentFlags.length>0?"URGENT RED FLAGS DETECTED":"RED FLAGS PRESENT"}</div>
              <div style={{fontSize:"0.82rem",color:"rgba(0,0,0,0.7)",fontWeight:600}}>{urgentFlags.length>0?"Do not proceed — refer immediately":"Review before proceeding with treatment"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
            {activeRedFlags.slice(0,4).map((f,i)=>(
              <span key={i} style={{background:"rgba(0,0,0,0.18)",borderRadius:6,padding:"2px 8px",fontSize:"0.82rem",fontWeight:700,color:"#000"}}>{f}</span>
            ))}
            {activeRedFlags.length>4&&<span style={{background:"rgba(0,0,0,0.18)",borderRadius:6,padding:"2px 8px",fontSize:"0.82rem",fontWeight:700,color:"#000"}}>+{activeRedFlags.length-4} more</span>}
          </div>
          <button onClick={()=>navTo("subjective")} style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,0,0,0.3)",borderRadius:7,color:"#000",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",padding:"4px 10px",flexShrink:0,whiteSpace:"nowrap"}}>View →</button>
          <button onClick={()=>{
            const now = new Date();
            const entry = {
              id: now.getTime().toString(36),
              documentedAt: now.toISOString(),
              documentedAtDisplay: now.toLocaleDateString("en-AU",{day:"2-digit",month:"long",year:"numeric"})+" "+now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"}),
              flags: activeRedFlags,
              urgent: urgentFlags.length > 0,
              action: urgentFlags.length > 0 ? "Referred to ED / GP — urgent" : "Referred to GP for review",
              patient: data["dem_name"] || "Unknown",
            };
            const existing = Array.isArray(data.rf_referral_log) ? data.rf_referral_log : [];
            set("rf_referral_log", [...existing, entry]);
            setJsonMsg({type:"success", text:"✅ Referral documented & saved to patient record"});
            setTimeout(()=>setJsonMsg(null), 3000);
          }} style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(0,0,0,0.4)",borderRadius:7,color:"#000",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",padding:"4px 10px",flexShrink:0,whiteSpace:"nowrap"}}>
            📋 Document Referral
          </button>
        </div>
      )}

      {/* ── DRAFT RESTORED BANNER ── */}
      {draftRestored && (
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:"rgba(124,58,237,0.95)",color:"#fff",fontWeight:700,fontSize:"0.75rem",padding:"10px 18px",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",display:"flex",gap:12,alignItems:"center",whiteSpace:"nowrap",maxWidth:"calc(100vw - 32px)"}}>
          💾 Unsaved draft restored
          <button onClick={()=>{ setDraftRestored(false); try { localStorage.removeItem(DRAFT_KEY); } catch {} }} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,color:"#fff",fontWeight:800,fontSize:"0.8rem",cursor:"pointer",padding:"3px 8px"}}>Dismiss</button>
        </div>
      )}

      {/* ── TOAST MESSAGE ── */}
      {jsonMsg && (
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:999,background:jsonMsg.type==="success"?"rgba(0,201,122,0.97)":"rgba(255,77,109,0.97)",color:"#000",fontWeight:700,fontSize:"0.8rem",padding:"10px 20px",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",maxWidth:"calc(100vw - 32px)",textAlign:"center"}}>
          {jsonMsg.text}
        </div>
      )}

      {/* ── JSON EXPORT/IMPORT PANEL ── */}
      {showJsonPanel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:PC.surface,border:`1px solid rgba(0,229,255,0.25)`,borderRadius:16,padding:22,maxWidth:500,width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,color:PC.accent,fontSize:"1rem"}}>💾 Save / Load Assessment</div>
              <button onClick={()=>setShowJsonPanel(false)} style={{background:"none",border:`1px solid ${PC.border}`,borderRadius:7,color:PC.muted,cursor:"pointer",padding:"4px 10px",fontSize:"0.82rem"}}>✕ Close</button>
            </div>

            {/* Patient info preview */}
            {(data["dem_name"]||data["dem_age"]||data["dem_occupation"]) && (
              <div style={{background:PC.s2,borderRadius:10,padding:"10px 14px",marginBottom:14,border:`1px solid ${PC.border}`}}>
                <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Current Patient</div>
                <div style={{fontWeight:700,color:PC.text,fontSize:"0.88rem"}}>{data["dem_name"]||"—"}</div>
                <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:2}}>
                  {[data["dem_age"]&&`Age ${data["dem_age"]}`,data["dem_occupation"]].filter(Boolean).join(" · ")}
                </div>
              </div>
            )}

            {/* Export */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📤 Export</div>
              <button onClick={exportJSON} style={{width:"100%",padding:"12px",background:"rgba(0,201,122,0.12)",border:`1px solid rgba(0,201,122,0.3)`,borderRadius:10,color:PC.green,fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                ⬇ Download Assessment JSON
              </button>
              <div style={{fontSize:"0.75rem",color:PC.muted,marginTop:5}}>Saves all {completedCount} completed fields. Reload anytime to resume.</div>
            </div>

            {/* Import from file */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📥 Import</div>
              <button onClick={()=>importRef.current?.click()} style={{width:"100%",padding:"12px",background:"rgba(255,179,0,0.1)",border:`1px solid rgba(255,179,0,0.3)`,borderRadius:10,color:PC.yellow,fontWeight:800,fontSize:"0.8rem",cursor:"pointer",marginBottom:8}}>
                📂 Open Assessment File
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={importFromFile} style={{display:"none"}}/>
              <textarea value={jsonImportText} onChange={e=>setJsonImportText(e.target.value)}
                placeholder='Or paste JSON here...'
                style={{width:"100%",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"monospace",outline:"none",padding:"8px 10px",fontSize:"0.82rem",resize:"vertical",minHeight:80}}/>
              {jsonImportText && (
                <button onClick={importJSON} style={{width:"100%",marginTop:8,padding:"11px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:10,color:"#000",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                  ▶ Load Assessment
                </button>
              )}
            </div>

            <div style={{marginTop:10,padding:"8px 12px",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,fontSize:"0.82rem",color:PC.muted,lineHeight:1.5}}>
              ⚠ Loading an assessment will replace all current data. Export first if needed.
            </div>
          </div>
        </div>
      )}

      {/* Mobile nav drawer */}
      <div className={`pm-nav-drawer${navOpen?" open":""}`}>
        <div style={{padding:"0 8px"}}>
          <SidebarItems onNav={navTo}/>
        </div>
      </div>

      {/* Header — Medical Professional */}
      <div className="pm-header" style={{background:PC.isDark?`linear-gradient(180deg,${PC.headerBg},${PC.surface})`:`${PC.headerBg}`,borderBottom:`1px solid ${PC.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:PC.isDark?"0 1px 20px rgba(0,0,0,0.4)":"0 1px 12px rgba(0,20,50,0.06)"}}>
        <div className="pm-header-inner" style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <button className="pm-hamburger" onClick={()=>setNavOpen(o=>!o)} aria-label="Open navigation">☰</button>
            {/* Logo */}
            <img src="/logo.svg" alt="PhysioMind" style={{height:48,width:"auto",flexShrink:0,display:"block"}} />
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:"clamp(0.85rem,3vw,1.05rem)",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap",lineHeight:1.2}}>PhysioMind Pro</div>
              <div className="pm-logo-sub" style={{fontSize:"0.75rem",color:PC.muted,letterSpacing:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textTransform:"uppercase",fontWeight:600,marginTop:1}}>Clinical Assessment Platform</div>
            </div>
            {/* Live patient chip */}
            {activePatient&&(
              <div className="pm-live-chip" style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:PC.isDark?"rgba(129,140,248,0.08)":"rgba(79,70,229,0.05)",border:`1px solid ${PC.isDark?"rgba(129,140,248,0.2)":"rgba(79,70,229,0.15)"}`,borderRadius:20,cursor:"pointer"}} onClick={()=>setShowPatientDb(true)}>
                <div style={{width:6,height:6,borderRadius:"50%",background:PC.a3,boxShadow:`0 0 5px ${PC.a3}`}}/>
                <span style={{fontSize:"0.82rem",fontWeight:700,color:PC.a2,whiteSpace:"nowrap"}}>{activePatient.name.length>16?activePatient.name.slice(0,16)+"…":activePatient.name}</span>
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>

            {/* Red flag indicator */}
            {hasRedFlags && (
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:urgentFlags.length>0?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.1)",border:`1px solid ${urgentFlags.length>0?"rgba(248,113,113,0.3)":"rgba(251,191,36,0.3)"}`,borderRadius:20}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:urgentFlags.length>0?PC.red:PC.yellow,animation:"pulse 1.5s infinite"}}/>
                <span style={{fontSize:"0.8rem",fontWeight:700,color:urgentFlags.length>0?PC.red:PC.yellow,whiteSpace:"nowrap"}}>{urgentFlags.length>0?"URGENT FLAG":"Flag"}</span>
              </div>
            )}
            {/* Patient selector */}
            <button className="pm-patients-btn" onClick={()=>setShowPatientDb(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontWeight:600,fontSize:"0.82rem",cursor:"pointer",whiteSpace:"nowrap"}}>
              <span style={{fontSize:"0.85rem"}}>👥</span>
              <span>{patients.length} Patients</span>
            </button>


          </div>
        </div>
      </div>

      {/* ── MOBILE COMPACT HEADER (≤767px only, replaces pm-header + patient bars) ── */}
      {/* ── MOBILE HEADER — Option B: gradient accent bar ── */}
      <div className="pm-mobile-hdr" style={{
        background: PC.isDark ? PC.headerBg : "linear-gradient(90deg,#f5edff 0%,#faf8ff 100%)",
        borderBottom: `1px solid ${PC.isDark?PC.border:"#d8cce8"}`,
        borderLeft: `3.5px solid ${PC.accent}`,
      }}>
        {/* Hamburger */}
        <button className="pm-hamburger" onClick={()=>setNavOpen(o=>!o)} aria-label="Open navigation"
          style={{minHeight:34,minWidth:34,padding:"6px 8px",fontSize:"1.05rem",
            background: PC.isDark?"rgba(124,58,237,0.15)":"rgba(124,58,237,0.08)",
            border:"none",borderRadius:8,color:PC.accent,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ☰
        </button>
        {/* Logo — plain, bigger */}
        <img src="/logo.svg" alt="PhysioMind" style={{height:40,width:"auto",flexShrink:0}} />
        {/* Text */}
        <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
          <div style={{fontWeight:800,fontSize:"0.92rem",color:PC.isDark?PC.a2:"#4c1d95",letterSpacing:"-0.3px",lineHeight:1.2,whiteSpace:"nowrap"}}>PhysioMind Pro</div>
          {activePatient
            ? <div style={{fontSize:"0.72rem",color:PC.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                <span style={{color:PC.a3}}>●</span> {activePatient.name.length>18?activePatient.name.slice(0,18)+"…":activePatient.name}
                {lastSaved && <span style={{color:PC.green}}> · ✓ {lastSaved.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>}
              </div>
            : <div style={{fontSize:"0.68rem",color:PC.muted}}>No patient loaded</div>
          }
        </div>
        {/* + New — solid accent */}
        <button onClick={createNewPatient}
          style={{padding:"5px 12px",minHeight:30,background:PC.accent,border:"none",borderRadius:7,
            color:"#fff",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",
            boxShadow:`0 2px 6px ${PC.accent}50`}}>
          + New
        </button>
      </div>

      {/* ── ACTIVE PATIENT BAR ── */}
      {activePatient && (
        <div className="pm-patient-bar" style={{background:PC.isDark?"rgba(129,140,248,0.05)":"rgba(79,70,229,0.03)",borderBottom:`1px solid ${PC.border}`,padding:"6px 16px",display:"flex",flexDirection:"column",gap:4}}>
          {/* Row 1: dot + name + age/gender */}
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:PC.a3,boxShadow:`0 0 6px ${PC.a3}`,flexShrink:0}}/>
            <div onClick={()=>setProfilePatient(activePatient)}
              style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",minWidth:0,flex:1,overflow:"hidden"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <span style={{fontSize:"0.78rem",color:PC.a2,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:160}}>
                {activePatient.name}
              </span>
              {activePatient.data?.dem_age && <span style={{fontSize:"0.75rem",color:PC.muted,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>· {activePatient.data.dem_age}y</span>}
              {activePatient.data?.dem_gender && <span style={{fontSize:"0.75rem",color:PC.muted,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{activePatient.data.dem_gender}</span>}
              <span style={{fontSize:"0.8rem",color:PC.accent,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>👤 Profile</span>
            </div>
          </div>
          {/* Row 2: saved time + buttons */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"nowrap"}}>
            <span style={{fontSize:"0.78rem",color:PC.green,fontWeight:600,flex:1,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
              {lastSaved
                ? <>✓ Saved {lastSaved.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</>
                : <>● {new Date(activePatient.updatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</>}
            </span>
            <button onClick={createNewPatient} style={{padding:"3px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:6,color:PC.text,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>＋ New</button>
            <button onClick={()=>setShowPatientDb(true)} style={{padding:"3px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:6,color:PC.a2,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Switch Patient</button>
          </div>
        </div>
      )}
      {!activePatient && (
        <div className="pm-patient-bar" style={{background:PC.isDark?"rgba(56,189,248,0.03)":"rgba(3,105,161,0.03)",borderBottom:`1px solid ${PC.border}`,padding:"9px 24px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:"0.8rem",color:PC.muted,fontWeight:500}}>No active patient — create or load a patient record to save assessments</span>
          <button onClick={createNewPatient} style={{padding:"5px 14px",background:`linear-gradient(135deg,${PC.accent}18,${PC.a2}12)`,border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:7,color:PC.accent,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>＋ New Patient</button>
          <button onClick={()=>setShowPatientDb(true)} style={{padding:"5px 14px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:7,color:PC.a2,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Load Patient</button>
        </div>
      )}

      <div className="pm-body" style={{display:"flex",flex:1,maxWidth:1400,margin:"0 auto",width:"100%"}}>

        {/* Desktop Sidebar */}
        <div className="pm-sidebar" style={{width:210,minWidth:210,borderRight:`1px solid ${PC.border}`,padding:"16px 0 10px",background:PC.navBg,position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto"}}>
          <SidebarItems onNav={navTo}/>
        </div>

        {/* Main */}
        <div className="pm-main" style={{flex:1,padding:"28px 32px",overflowY:"auto",overflowX:"hidden",minWidth:0}}>

          {/* ── CLINICAL WORKFLOW HEADER ── */}
          {activePatient && (() => {
            const d2 = data;
            const oKeys = ["rom","mmt","special","neuro","gait","posture","palpation","fma","outcome","observation","cyriax","cyriax_full","sttt","kinetic","fascia","nkt"];
            const wfSteps = [
              { key:"demographics", label:"Demographics", short:"Demo",  nav:"demographics", done:!!(d2.dem_name&&d2.dem_age), active:active==="demographics" },
              { key:"subjective",   label:"Subjective",   short:"Sub",   nav:"subjective",   done:!!(d2.cc_main||d2.lx_loc||d2.cx_loc), active:active==="subjective" },
              { key:"objective",    label:"Objective",    short:"Obj",   nav:"rom",           done:!!(Object.keys(d2).some(k=>k.startsWith("rom_")||k.startsWith("mmt_")||k.startsWith("st_"))), active:oKeys.includes(active) },
              { key:"treatment",    label:"Treatment",    short:"Treat", nav:"treatment",     done:!!(d2.soap_modalities||d2.soap_frequency||d2.hep_programme||d2.tx_techniques), active:active==="treatment"||active==="exercise" },
              { key:"soap",         label:"SOAP",         short:"SOAP",  nav:"soap",          done:!!(d2.soap_a_diagnosis||d2.soap_icd10||d2.soap_a), active:active==="soap" },
            ];
            const doneCount = wfSteps.filter(s => s.done).length;
            const pct = Math.round((doneCount / wfSteps.length) * 100);
            return (
              <div className="pm-stepper-wrap" style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:14,padding:"10px 16px 8px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:10,fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px"}}>Clinical Workflow</span>
                  <span style={{fontSize:10,fontWeight:700,color:pct===100?"#10B981":PC.accent}}>{doneCount}/{wfSteps.length} complete</span>
                </div>
                <div className="pm-stepper-row" style={{display:"flex",alignItems:"center",gap:0}}>
                  {wfSteps.map((step, i) => {
                    const isLast = i === wfSteps.length - 1;
                    return (
                      <React.Fragment key={step.key}>
                        <div onClick={()=>navTo(step.nav)} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",flex:"0 0 auto",minWidth:0}}>
                          <div className="pm-stepper-dot" style={{width:30,height:30,borderRadius:"50%",background:step.done?"#6D28D9":step.active?"#EDE9FE":PC.s2,border:`2px solid ${step.done?"#6D28D9":step.active?"#6D28D9":"#E5E7EB"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:step.active?"0 0 0 3px rgba(109,40,217,0.15)":"none",transition:"all 0.2s",flexShrink:0}}>
                            {step.done ? <span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span> : <span style={{fontSize:11,color:step.active?"#6D28D9":PC.muted,fontWeight:700}}>{i+1}</span>}
                          </div>
                          <div className="pm-stepper-label" style={{fontSize:9,fontWeight:step.active?800:step.done?700:500,color:step.done?"#6D28D9":step.active?"#6D28D9":PC.muted,marginTop:4,textAlign:"center",whiteSpace:"nowrap",letterSpacing:"0.1px"}}>{step.short}</div>
                        </div>
                        {!isLast && <div style={{flex:1,height:2,background:step.done?"#6D28D9":"#E5E7EB",marginBottom:14,minWidth:6,transition:"background 0.3s"}}/>}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div style={{height:3,background:"#E5E7EB",borderRadius:999,marginTop:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#10B981":"linear-gradient(90deg,#6D28D9,#8B5CF6)",borderRadius:999,transition:"width 0.4s ease"}}/>
                </div>
              </div>
            );
          })()}

          {/* Diagnosis Panel */}
          {showDx&&dx&&(
            <div style={{background:PC.surface,border:`1px solid ${PC.accent}30`,borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:"1.05rem",fontWeight:800,color:PC.accent}}>📋 Multi-System Diagnosis Report</div>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:10,background:"rgba(0,229,255,0.1)",color:PC.accent}}>{completedCount} fields · {dx.dx.length} diagnoses</span>
                  <button onClick={()=>setShowDx(false)} style={{background:"none",border:`1px solid ${PC.border}`,color:PC.muted,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
                </div>
              </div>
              {dx.redFlags.length>0&&(
                <div style={{background:"rgba(255,77,109,0.1)",border:`1px solid ${PC.red}40`,borderRadius:10,padding:14,marginBottom:14}}>
                  <div style={{fontWeight:800,color:PC.red,marginBottom:8}}>🚨 RED FLAGS</div>
                  {dx.redFlags.map((rf,i)=><div key={i} style={{padding:"5px 10px",background:"rgba(255,77,109,0.07)",borderRadius:6,marginBottom:4,fontSize:"0.76rem",color:rf.severity==="urgent"?PC.red:PC.yellow,fontWeight:600}}>{rf.severity==="urgent"?"🔴 URGENT: ":"🟡 REFER: "}{rf.label}</div>)}
                </div>
              )}
              {dx.dx.length===0?(
                <div style={{textAlign:"center",padding:30,color:PC.muted}}><div style={{fontSize:"2rem",marginBottom:8}}>📝</div><div>Enter patient data above to refine diagnosis.</div></div>
              ):(
                <>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {dx.dx.map(d=><span key={d.name+d.system} style={{padding:"2px 9px",borderRadius:20,fontSize:"0.66rem",fontWeight:700,background:`${sysColors[d.system]||PC.accent}15`,color:sysColors[d.system]||PC.accent,border:`1px solid ${sysColors[d.system]||PC.accent}30`}}>✓ {d.system}</span>)}
                  </div>
                  {dx.dx.map((d,i)=>{
                    const col=sysColors[d.system]||PC.accent;
                    const exp=expandedDx[i];
                    return(
                      <div key={i} style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,marginBottom:9,overflow:"hidden"}}>
                        <div onClick={()=>setExpandedDx(p=>({...p,[i]:!p[i]}))} style={{padding:"11px 13px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderLeft:`3px solid ${col}`}}>
                          <div>
                            <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4}}>
                              <span style={{fontSize:"0.8rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:`${col}20`,color:col}}>{d.system}</span>
                              <span style={{fontSize:"0.8rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:d.confidence==="High"?"rgba(0,201,122,0.15)":"rgba(255,179,0,0.15)",color:d.confidence==="High"?PC.green:PC.yellow}}>{d.confidence}</span>
                            </div>
                            <div style={{fontWeight:700,fontSize:"0.86rem"}}>{i+1}. {d.name}</div>
                          </div>
                          <span style={{color:PC.muted,fontSize:"0.75rem"}}>{exp?"▲":"▼"}</span>
                        </div>
                        {exp&&(
                          <div style={{padding:"0 13px 13px 16px"}}>
                            <div style={{marginBottom:10}}><div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Evidence</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{d.evidence.map((e,j)=><span key={j} style={{fontSize:"0.78rem",padding:"2px 7px",borderRadius:7,background:PC.s3,color:PC.text,border:`1px solid ${PC.border}`}}>✓ {e}</span>)}</div></div>
                            {d.mechanism&&<div style={{marginBottom:10}}><div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Mechanism</div><div style={{background:PC.s3,borderRadius:8,padding:10,fontSize:"0.76rem",color:PC.text,lineHeight:1.6}}>{d.mechanism}</div></div>}
                            {d.treatment&&d.treatment.length>0&&<div><div style={{fontSize:"0.8rem",fontWeight:700,color:PC.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Treatment Plan</div>{d.treatment.map((t,j)=><div key={j} style={{display:"flex",gap:8,padding:"5px 9px",background:PC.s3,borderRadius:7,marginBottom:4,alignItems:"flex-start"}}><span style={{color:PC.a3,fontWeight:700,flexShrink:0}}>→</span><span style={{fontSize:"0.76rem",color:PC.text,lineHeight:1.5}}>{t}</span></div>)}</div>}
                            {d.interpretation&&<div style={{marginTop:10,padding:"8px 11px",background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",borderRadius:8,fontSize:"0.78rem",color:PC.yellow,lineHeight:1.5}}>⚠ {d.interpretation}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dx.fmsTotal!==null&&(
                    <div style={{marginTop:10,padding:12,background:PC.s2,borderRadius:8,border:`1px solid ${PC.border}`,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{textAlign:"center",minWidth:55}}><div style={{fontSize:"1.8rem",fontWeight:800,color:dx.fmsTotal>=17?PC.green:dx.fmsTotal>=15?PC.yellow:PC.red}}>{dx.fmsTotal}</div><div style={{fontSize:"0.78rem",color:PC.muted}}>FMS/21</div></div>
                      <div style={{fontSize:"0.76rem",color:PC.muted}}>{dx.fmsTotal>=17?"✅ Low risk":dx.fmsTotal>=15?"⚠️ Moderate risk — corrective exercises":"🔴 High risk — corrective exercises before loading"}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentSection && active !== "treatment" && active !== "exercise" && active !== "tx_techniques" && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <div style={{width:38,height:38,background:PC.isDark?`linear-gradient(135deg,${PC.accent}15,${PC.a2}10)`:`linear-gradient(135deg,${PC.accent}10,${PC.a2}08)`,border:`1px solid ${PC.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{currentSection.icon}</div>
              <div>
                <div style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,letterSpacing:"-0.3px",color:PC.text,lineHeight:1.1}}>{currentSection.label}</div>
                <div style={{fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",color:PC.muted,marginTop:2}}>{currentSection.desc||"Clinical Assessment"}</div>
              </div>
            </div>
            <div style={{height:"1px",background:`linear-gradient(90deg,${PC.accent}50,${PC.a2}30,transparent)`}}/>
          </div>
          )}

          {/* Posture Analysis Module — injected at top of Posture tab */}
          {/* PostureAnalysisModule — deferred mount, hidden when not active */}
          {mountedTabs.has("posture") && (
            <div style={{marginBottom:22, display: active==="posture" ? "block" : "none"}}>
              <PostureAnalysisModule activePatient={activePatient} set={set}/>
            </div>
          )}
          {active==="posture" && !mountedTabs.has("posture") && (
            <div style={{marginBottom:22}}>
              <TabLoader/>
            </div>
          )}

          {/* Groups */}
          {currentSection && Object.entries(currentSection.groups).map(([groupName,tests])=>(
            <div key={groupName} style={{marginBottom:28}}>
              <div className="pm-group-head" style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.4px",color:PC.a2,whiteSpace:"nowrap"}}>{groupName}</div>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${PC.border},transparent)`}}/>
              </div>

              {tests==="HOME_MODULE"?(
                <HomeModule onNav={navTo}/>
              ):tests==="DASHBOARD_MODULE"?(
                <TherapistDashboardModule patients={patients} data={data} onNav={navTo} taskDB={taskDB} onCompleteTask={completeTask} onDismissTask={dismissTask} onAddTask={addOrUpdateTask} onProfile={(p)=>setProfilePatient(p)} onQuickStart={(p)=>{ selectPatient(p); navTo("subjective"); }} currentUser={currentUser} onSignOut={onSignOut}/>
              ):tests==="DEMOGRAPHICS_MODULE"?(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {(()=>{
                    const inp={width:"100%",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.85rem",boxSizing:"border-box"};
                    const lbl={fontSize:"0.78rem",fontWeight:700,color:PC.muted,marginBottom:5,display:"block"};
                    const sel=(id,opts)=>(<select style={inp} value={data[id]||""} onChange={e=>set(id,e.target.value)}><option value="">— select —</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>);
                    const field=(label,el)=>(<div style={{marginBottom:12}}><label style={lbl}>{label}</label>{el}</div>);
                    const card=(title,children)=>(<div style={{background:PC.s2,borderRadius:12,border:`1px solid ${PC.border}`,padding:"14px 16px"}}><div style={{fontSize:"0.78rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>{title}</div>{children}</div>);
                    return(<>
                      {card("Personal Details",<>
                        {field("Full Name",<input style={inp} placeholder="e.g. Riya Sharma" value={data.dem_name||""} onChange={e=>set("dem_name",e.target.value)}/>)}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div>{field("Date of Birth",<input style={inp} type="date" value={data.dem_dob||""} onChange={e=>set("dem_dob",e.target.value)}/>)}</div>
                          <div>{field("Age",<input style={inp} type="number" placeholder="e.g. 34" value={data.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>)}</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div>{field("Sex",sel("dem_sex",["Female","Male","Non-binary","Prefer not to say"]))}</div>
                          <div>{field("Dominant Hand",sel("dem_dominant",["Right","Left","Ambidextrous"]))}</div>
                        </div>
                        {field("Occupation",<input style={inp} placeholder="e.g. Teacher, Desk worker" value={data.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>)}
                        {field("Employer / Industry",<input style={inp} placeholder="e.g. ABC Corp, Healthcare" value={data.dem_employer||""} onChange={e=>set("dem_employer",e.target.value)}/>)}
                        {field("Work Status",sel("dem_work_status",["Full time","Part time","Self employed","Off work — injury","Off work — illness","Retired","Unemployed","Student","Home duties"]))}
                      </>)}
                      {card("Contact Details",<>
                        {field("Phone Number",<input style={inp} type="tel" placeholder="+91 98765 43210" value={data.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>)}
                        {field("Email Address",<input style={inp} type="email" placeholder="patient@email.com" value={data.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
                        {field("Address",<input style={inp} placeholder="Street, City, Postcode" value={data.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>)}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div>{field("Emergency Contact Name",<input style={inp} placeholder="Full name" value={data.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}</div>
                          <div>{field("Emergency Contact Phone",<input style={inp} type="tel" placeholder="+91 98765 43210" value={data.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}</div>
                        </div>
                      </>)}
                      {card("Clinical & Referral",<>
                        {field("Referring Doctor / GP",<input style={inp} placeholder="Dr. Name, Hospital" value={data.dem_referral_dr||data.dem_gp||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
                        {field("Referral Source",sel("dem_referral",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
                        {field("Insurance / Fund",<input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={data.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
                        {field("Policy / Member Number",<input style={inp} placeholder="Optional" value={data.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
                        {field("Relevant Medical History",<textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={data.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
                        {field("Current Medications",<input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={data.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
                      </>)}
                      {card("Consent",<>
                        {field("Consent to Treatment",sel("dem_consent",["Yes — verbal","Yes — written","Not yet"]))}
                        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginTop:4}}>
                          <input type="checkbox" checked={!!data.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{width:16,height:16,flexShrink:0}}/>
                          <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>Written consent obtained</span>
                        </label>
                      </>)}
                    </>);
                  })()}
                  {/* ── Save Patient Button ── */}
                  <div style={{marginTop:20,padding:"14px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:14,display:"flex",flexDirection:"column",gap:10}}>
                    {!activePatientId ? (
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:12,color:PC.muted,marginBottom:10}}>Fill in the patient name above, then save to create their record.</div>
                        <button
                          disabled={!data.dem_name?.trim()}
                          onClick={()=>{
                            if(!data.dem_name?.trim()) return;
                            const newP={id:genId(),name:data.dem_name,data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),hasRedFlags:false,lastDx:data.cc_main||""};
                            setPatients(prev=>{const updated=[newP,...prev];savePatientDB(updated);return updated;});
                            setActivePatientId(newP.id);
                            setJsonMsg({type:"success",text:`✅ Patient saved: ${data.dem_name}`});
                            setTimeout(()=>setJsonMsg(null),2500);
                          }}
                          style={{padding:"12px 32px",background:data.dem_name?.trim()?PC.accent:"#D1D5DB",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.9rem",cursor:data.dem_name?.trim()?"pointer":"not-allowed",width:"100%"}}>
                          💾 Save Patient to Database
                        </button>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <span style={{fontSize:13,color:"#059669",fontWeight:700}}>✅ Patient record auto-saving</span>
                        <button onClick={()=>navTo("subjective")} style={{padding:"8px 20px",background:PC.accent,border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
                          Next → Subjective
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ):tests==="SUBJECTIVE_MODULE"?(
                <div>
                  <Suspense fallback={<TabFallback/>}><LazySubjective data={data} set={set} onNav={navTo} onTabChange={(t)=>setSubjBodyChartTab(t==="bodychart")}/></Suspense>
                  {subjBodyChartTab && (
                    <Suspense fallback={<TabFallback/>}><LazyBodyChart data={data} set={set}/></Suspense>
                  )}
                </div>
              ):tests==="PALPATION_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyPalpation data={data} set={set}/></Suspense>
              ):tests==="POSTURE_DEFECT_MODULE"?(
                <PostureDefectModule/>
              ):tests==="OBSERVATION_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <ObservationModule data={data} set={set}/>
                </>
              ):tests==="CYRIAX_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazySTT data={data} set={set} navContext={active==="cyriax"?navContext:{}}/></Suspense>
                </>
              ):tests==="SPECIAL_TESTS_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <SpecialTestsSection data={data} set={set} navContext={active==="special"?navContext:{}}/>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="NKT_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyCPA data={data} set={set} navContext={active==="nkt"?navContext:{}}/></Suspense>
                </>
              ):tests==="FMA_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <FMASection data={data} set={set} navTo={navTo} navContext={active==="fma"?navContext:{}}/>
                </>
              ):tests==="FASCIA_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <FasciaSection data={data} set={set} navContext={active==="fascia"?navContext:{}}/>
                </>
              ):tests==="KC_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <KineticChainSection data={data} set={set} navContext={active==="kinetic"?navContext:{}}/>
                </>
              ):tests==="CYRIAX_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <CyriaxRegionTests data={data} set={set}/>
                </>
              ):tests==="NEURO_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyNeuro data={data} set={set} navContext={active==="neuro"?navContext:{}}/></Suspense>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="GAIT_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyGait data={data} set={set}/></Suspense>
                </>
              ):tests==="MMT_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <MMTModule data={data} set={set} navContext={active==="mmt"?navContext:{}}/>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="ROM_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <ROMModule data={data} set={set} navContext={active==="rom"?navContext:{}}/>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="OUTCOME_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyOutcomes data={data} set={set}/></Suspense>
                </>
              ):tests==="TREATMENT_MODULE"?(
                <>
                {(()=>{
                  const isMobile=window.innerWidth<768;
                  if(isMobile){
                    return(
                      <div>
                        <div style={{display:"flex",gap:8,marginBottom:16}}>
                          <button onClick={()=>setTxTab("exercise")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${txTab==="exercise"?PC.accent:PC.border}`,background:txTab==="exercise"?`${PC.accent}15`:PC.s2,color:txTab==="exercise"?PC.accent:PC.text,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>🏋 Exercise</button>
                          <button onClick={()=>setTxTab("tx")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${txTab==="tx"?PC.accent:PC.border}`,background:txTab==="tx"?`${PC.accent}15`:PC.s2,color:txTab==="tx"?PC.accent:PC.text,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>🤲 Techniques</button>
                          <button onClick={()=>setTxTab("hep")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${txTab==="hep"?PC.accent:PC.border}`,background:txTab==="hep"?`${PC.accent}15`:PC.s2,color:txTab==="hep"?PC.accent:PC.text,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>🏠 Home Protocol</button>
                        </div>
                        {txTab==="exercise"
                          ? <Suspense fallback={<TabFallback/>}><LazyExercise data={data} set={set}/></Suspense>
                          : txTab==="hep"
                          ? <HomeProtocolTab data={data} set={set} PC={PC}/>
                          : <Suspense fallback={<TabFallback/>}><LazyTreatment data={data} set={set}/></Suspense>
                        }
                      </div>
                    );
                  }
                  return(
                    <div>
                      {/* Desktop 3-tab row */}
                      <div style={{display:"flex",gap:6,marginBottom:16,background:PC.s2,borderRadius:10,padding:4,border:`1px solid ${PC.border}`}}>
                        {[["exercise","🏋","Exercise Prescription"],["tx","🤲","Tx Techniques"],["hep","🏠","Home Protocol"]].map(([key,icon,label])=>(
                          <button key={key} onClick={()=>setTxTab(key)} style={{flex:1,padding:"9px 8px",borderRadius:8,border:`1.5px solid ${txTab===key?PC.accent:PC.border}`,background:txTab===key?`${PC.accent}12`:PC.surface,color:txTab===key?PC.accent:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",transition:"all 0.15s"}}>
                            {icon} {label}
                          </button>
                        ))}
                      </div>
                      {txTab==="exercise" && <Suspense fallback={<TabFallback/>}><LazyExercise data={data} set={set}/></Suspense>}
                      {txTab==="tx"       && <Suspense fallback={<TabFallback/>}><LazyTreatment data={data} set={set}/></Suspense>}
                      {txTab==="hep"      && <HomeProtocolTab data={data} set={set} PC={PC}/>}
                    </div>
                  );
                })()}</>
              ):tests==="EXERCISE_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyExercise data={data} set={set}/></Suspense>
              ):tests==="TX_TECHNIQUES_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyTreatment data={data} set={set}/></Suspense>
              ):tests==="TX_SESSION_MODULE"?(
                <div>
                  {/* ── Quick Visit Banner ── */}
                  <div style={{background:`linear-gradient(135deg,${PC.accent}12,${PC.a2}08)`,border:`1.5px solid ${PC.accent}30`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:"0.88rem",color:PC.accent,marginBottom:4}}>⚡ Quick Visit</div>
                    <div style={{fontSize:"0.8rem",color:PC.muted,marginBottom:12}}>For follow-ups — fill these 4 fields and sign. Takes 60 seconds.</div>
                    <QuickVisitForm PC={PC} data={data} set={set} navTo={navTo}/>
                  </div>
                </div>
              ):tests==="SOAP_MODULE"?(
              <SOAPNoteModule data={data} set={set}/>
              ):tests==="AI_MODULE"?(
              <AIAssistant data={data} PC={PC}/>
              ):(
                <div style={{display:"grid",gap:8}}>
                  {tests.map(t=>{
                    const hasVal=t.type==="bilateral_num"||t.type==="bilateral_select"?(data[t.id+"_left"]||data[t.id+"_right"]):data[t.id];
                    const hasInfo=t.sig||t.how;
                    return(
                      <div key={t.id} style={{background:PC.surface,border:`1px solid ${hasVal?PC.accent+"28":PC.border}`,borderRadius:12,padding:"16px 18px",transition:"border-color 0.2s",boxShadow:hasVal?`0 0 0 1px ${PC.accent}08`:"none"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
                          <label style={{fontSize:"0.82rem",fontWeight:600,color:hasVal?PC.text:PC.muted,lineHeight:1.4,flex:1,letterSpacing:"-0.1px"}}>
                            {t.label}
                            {hasVal&&<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,background:PC.a3+"22",borderRadius:"50%",marginLeft:7,fontSize:"0.75rem",color:PC.a3,fontWeight:800,verticalAlign:"middle"}}>✓</span>}
                          </label>
                          {hasInfo&&<button type="button" onClick={()=>setInfoModal(t)} style={{padding:"3px 10px",background:PC.isDark?"rgba(129,140,248,0.1)":"rgba(79,70,229,0.06)",border:`1px solid ${PC.a2}30`,borderRadius:7,color:PC.a2,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.2px"}}>ℹ Info</button>}
                        </div>
                        <Field t={t}/>
                        {hasVal&&t.sig&&(
                          <div style={{marginTop:10,padding:"9px 12px",background:PC.accentSoft||"rgba(56,189,248,0.06)",border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:8,fontSize:"0.78rem",color:PC.text,lineHeight:1.6,opacity:0.9}}>
                            <span style={{fontWeight:700,color:PC.accent,marginRight:5,fontSize:"0.75rem",letterSpacing:"0.3px"}}>⚕ CLINICAL</span>{t.sig}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div style={{height:60}}/>
        </div>
      </div>

      {/* ── BOTTOM NAV DRAWER (mobile) — always visible ── */}
      <nav className="pm-bnav" aria-label="Section navigation">

        {/* ── Expandable sub-panel ── */}
        {(()=>{
          const assessKeys=["demographics","subjective","posture","palpation","rom","mmt","special","neuro","outcome"];
          const advKeys=["fma","gait","cyriax_full","kinetic","nkt","fascia"];
          const treatKeys=["treatment","exercise","tx_techniques"];
          const docKeys=["tx_sessions","soap"];

          const BnavItem = ({navKey,icon,label}) => {
            const isAct = active===navKey;
            const pct = getSectionPct(navKey);
            return (
              <button className={`pm-bnav-item${isAct?" active":""}`}
                onClick={()=>{ navTo(navKey); setBnavTab(null); }}>
                <span className="pm-bnav-item-icon">{icon}</span>
                <span className="pm-bnav-item-label">{label}</span>
                {pct===100 && <span className="pm-bnav-item-done">✓</span>}
                {pct>0&&pct<100 && <span className="pm-bnav-item-pct">{pct}%</span>}
              </button>
            );
          };

          return (
            <>
              <div className={`pm-bnav-panel${bnavTab==="assessment"?" open":""}`}>
                <BnavItem navKey="demographics" icon="👤" label="Demographics"/>
                <BnavItem navKey="subjective"  icon="📝" label="Subjective Assessment"/>
                <BnavItem navKey="posture"     icon="🧍" label="Posture Analysis"/>
                <BnavItem navKey="observation" icon="👁️" label="Observation"/>
                <BnavItem navKey="palpation"   icon="🖐️" label="Palpation"/>
                <BnavItem navKey="rom"         icon="📐" label="Range of Motion"/>
                <BnavItem navKey="mmt"         icon="💪" label="MMT"/>
                <BnavItem navKey="special"     icon="🔬" label="Special Tests (100+)"/>
                <BnavItem navKey="neuro"       icon="⚡" label="Neurological"/>
                <BnavItem navKey="outcome"     icon="📈" label="Outcome Measures"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="advanced"?" open":""}`}>
                <BnavItem navKey="fma"         icon="🏃" label="Functional Assessment"/>
                <BnavItem navKey="gait"        icon="🚶" label="Gait Analysis"/>
                <BnavItem navKey="cyriax_full" icon="🦴" label="STTT"/>
                <BnavItem navKey="kinetic"     icon="⛓️" label="Kinetic Chain"/>
                <BnavItem navKey="nkt"         icon="🧠" label="CPA"/>
                <BnavItem navKey="fascia"      icon="🕸️" label="Fascia Integration"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="treatment"?" open":""}`}>
                <BnavItem navKey="treatment"    icon="💊" label="Treatment"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="documentation"?" open":""}`}>
                <BnavItem navKey="tx_sessions" icon="⚡" label="Quick Visit"/>
                <BnavItem navKey="soap"        icon="📋" label="SOAP Notes"/>
                <BnavItem navKey="ai_assistant" icon="🤖" label="AI Assistant"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="patient"?" open":""}`}>
                {data.dem_name ? (
                  <div style={{padding:"4px 2px 8px"}}>
                    {/* Patient pill */}
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(124,58,237,0.07)",borderRadius:10,marginBottom:8,border:"1px solid rgba(124,58,237,0.15)"}}>
                      <span style={{fontSize:"1.3rem"}}>👤</span>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:"0.95rem",color:"#3b1f6b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.dem_name}</div>
                        {data.dem_age && <div style={{fontSize:"0.72rem",color:"#7c3aed",fontWeight:600}}>Age {data.dem_age}</div>}
                      </div>
                    </div>
                    {/* PDF buttons */}
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <button className="pm-bnav-pdf-btn"
                        onClick={()=>{ setBnavTab(null); setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="assessment"]'); if(el) el.click(); },350); }}>
                        <span style={{fontSize:"1.1rem"}}>📋</span>
                        <span>Assessment PDF</span>
                      </button>
                      <button className="pm-bnav-pdf-btn"
                        onClick={()=>{ setBnavTab(null); setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="treatment"]'); if(el) el.click(); },350); }}>
                        <span style={{fontSize:"1.1rem"}}>🗒️</span>
                        <span>Treatment PDF</span>
                      </button>
                      <button className="pm-bnav-pdf-btn"
                        onClick={()=>{ setBnavTab(null); setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="hep"]'); if(el) el.click(); },350); }}>
                        <span style={{fontSize:"1.1rem"}}>🏃</span>
                        <span>HEP PDF</span>
                      </button>
                    </div>
                    {/* Switch patient */}
                    <button className="pm-bnav-dx" style={{marginTop:10}}
                      onClick={()=>{ setBnavTab(null); setShowPatientDb(true); }}>
                      👥 Switch / Load Patient
                    </button>
                  </div>
                ) : (
                  <div style={{padding:"6px 2px"}}>
                    <div style={{textAlign:"center",padding:"16px 12px",color:"#9a82c0",fontSize:"0.85rem",fontWeight:600}}>No patient loaded</div>
                    <button className="pm-bnav-dx"
                      onClick={()=>{ setBnavTab(null); setShowPatientDb(true); }}>
                      👥 Load Patient
                    </button>
                  </div>
                )}
              </div>
              <div className={`pm-bnav-panel${bnavTab==="top"?" open":""}`}>
                <BnavItem navKey="home"      icon="🏠" label="Home"/>
                <BnavItem navKey="dashboard" icon="📊" label="Dashboard"/>

              </div>
            </>
          );
        })()}

        {/* ── Tab strip ── */}
        <div className="pm-bnav-tabs">
          {(()=>{
            const assessKeys=["demographics","subjective","posture","palpation","rom","mmt","special","neuro","outcome"];
            const advKeys=["fma","gait","cyriax_full","kinetic","nkt","fascia"];
            const treatKeys=["treatment","exercise","tx_techniques"];
            const docKeys=["tx_sessions","soap"];
            const topKeys=["home","dashboard"];

            const TabBtn = ({id,icon,label,matchKeys}) => {
              const isActive = bnavTab===id || (matchKeys&&matchKeys.includes(active));
              return (
                <button className={`pm-bnav-tab${isActive?" active":""}`}
                  onClick={()=>setBnavTab(t=> t===id ? null : id)}>
                  <span className="pm-bnav-tab-icon">{icon}</span>
                  <span className="pm-bnav-tab-label">{label}</span>
                </button>
              );
            };

            return (
              <>
                <TabBtn id="top"           icon="☰"  label="Menu"    matchKeys={topKeys}/>
                <TabBtn id="patient"       icon="👤" label="Patient" matchKeys={[]}/>
                <TabBtn id="assessment"    icon="🩺" label="Assess"  matchKeys={assessKeys}/>
                <TabBtn id="advanced"      icon="🔭" label="Adv."    matchKeys={advKeys}/>
                <TabBtn id="treatment"     icon="💊" label="Treat"   matchKeys={treatKeys}/>
                <TabBtn id="documentation" icon="📋" label="Docs"    matchKeys={docKeys}/>
              </>
            );
          })()}
        </div>
      </nav>
      {/* ── Live SOAP Panel — always visible floating panel ── */}
      <LiveSOAPPanel data={data} onNavigate={navTo}/>
    </div>
  );
}

function LandingAndAuth({ onAuth }) {
  const [showAuth, setShowAuth] = React.useState(false);
  if (showAuth) {
    return <AuthScreen onAuth={onAuth} />;
  }
  return (
    <LandingPage
      onGetStarted={() => setShowAuth(true)}
      onSignIn={() => setShowAuth(true)}
    />
  );
}

export default function App() {
  // ── AUTH DISABLED FOR TESTING — to re-enable, restore the full auth flow ──
  const devUser = { id: "dev", email: "dev@physiomind.app", user_metadata: { full_name: "Dr. Demo" } };
  return <ErrorBoundary><AppInner currentUser={devUser} onSignOut={()=>{}}/></ErrorBoundary>;
}

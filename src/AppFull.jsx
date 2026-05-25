// AppFull.jsx — PostureModule, PatientDB, Dashboard, PdfReports, AppInner + App (export default)
import React, { useState, useEffect, useCallback, useRef, useMemo, Component, Suspense } from "react";
import { createPortal } from "react-dom";
import { r1, r2, mid, vis, px, MIN_VIS, calcAngleDeg, C, getC, useTheme, MobileStyleInjector, ErrorBoundary, TabLoader } from "./utils.jsx";
import { SpecialTestsSection, SubjectiveModule, NKTSection, KineticChainSection, FMASection, FasciaSection, NKT_REGIONS, KC_REGIONS, UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S, ErgoModule, CyriaxModule, CyriaxRegionTests, generateDiagnosis, PDF_BASE_STYLES, makePDFPage, MOVEMENTS, downloadPDFFromHTML } from "./SubjectiveObjective.jsx";
import { GaitModule, OutcomeMeasuresModule, SOAPNoteModule, ExercisePrescriptionModule, PalpationModule, TreatmentTechniquesModule, TreatmentSessionLogModule, buildClinicalInterpretation, Sparkline } from "./ClinicalModules.jsx";
import { ALL_TESTS, ROMModule, MMTModule, NeurologicalModule, DERMATOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO } from "./PhysioNeuro.jsx";

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],   // shoulders + arms
  [15,17],[15,19],[15,21],[17,19],            // left hand
  [16,18],[16,20],[16,22],[18,20],            // right hand
  [11,23],[12,24],[23,24],                    // torso
  [23,25],[25,27],[27,29],[29,31],[27,31],   // left leg
  [24,26],[26,28],[28,30],[30,32],[28,32],   // right leg
];
const KEY_JOINTS = { 0:"Nose",11:"L.Shoulder",12:"R.Shoulder",13:"L.Elbow",14:"R.Elbow",15:"L.Wrist",16:"R.Wrist",23:"L.Hip",24:"R.Hip",25:"L.Knee",26:"R.Knee",27:"L.Ankle",28:"R.Ankle",31:"L.Foot",32:"R.Foot" };
const TRACKING_STATES = { IDLE:"idle", LOADING:"loading", CALIBRATING:"calibrating", DETECTING:"detecting", STABLE:"stable", LOST:"lost" };

// ─── TrackingQualityEngine ────────────────────────────────────────────────────
function computeQuality(lm) {
  if (!lm) return { score: 0, warnings: [], ready: false, distanceHint: null };
  const v = (i) => lm[i] && lm[i].visibility > 0.5;
  const vis = (i) => lm[i]?.visibility || 0;
  const avgBody = lm.slice(11, 33).reduce((s, l) => s + (l?.visibility || 0), 0) / 22;
  const warnings = [];

  // Centering check
  const noseX = vis(0) > 0.3 ? lm[0].x : null;
  if (noseX !== null && (noseX < 0.3 || noseX > 0.7)) warnings.push({ text: "Center your body in frame", icon: "↔", color: "#ffb300", priority: 2 });

  // Distance via shoulder span
  let distanceHint = null;
  if (v(11) && v(12)) {
    const span = Math.abs(lm[11].x - lm[12].x);
    if (span > 0.5) { warnings.push({ text: "Too close — step back", icon: "⬅", color: "#ff4d6d", priority: 1 }); distanceHint = "back"; }
    else if (span < 0.1) { warnings.push({ text: "Too far — step closer", icon: "➡", color: "#ffb300", priority: 2 }); distanceHint = "closer"; }
    else if (lm[11].y < 0.08 || lm[12].y < 0.08) warnings.push({ text: "Lower camera to hip height", icon: "⬇", color: "#ffb300", priority: 3 });
  }

  // Visibility checks
  if (avgBody < 0.35) warnings.push({ text: "Low confidence — improve lighting", icon: "💡", color: "#ff4d6d", priority: 1 });
  if (!v(0)) warnings.push({ text: "Head not visible", icon: "👤", color: "#ff4d6d", priority: 1 });
  if (!v(11) || !v(12)) warnings.push({ text: "Shoulders not detected", icon: "🦴", color: "#ffb300", priority: 2 });
  if (!v(23) && !v(24)) warnings.push({ text: "Hips/ASIS not visible — step back", icon: "🦴", color: "#ff4d6d", priority: 1 });
  if (!v(7) && !v(8)) warnings.push({ text: "Ears not detected — check head angle", icon: "👂", color: "#ffb300", priority: 2 });
  if (!v(31) && !v(32)) warnings.push({ text: "Feet not visible — move camera back", icon: "👣", color: "#ffb300", priority: 2 });
  else if (!v(27) && !v(28)) warnings.push({ text: "Ankles out of frame", icon: "📏", color: "#ffb300", priority: 3 });

  const ready = v(0) && v(11) && v(12) && v(23) && v(24) && (v(27) || v(28)) && avgBody > 0.5;
  warnings.sort((a, b) => a.priority - b.priority);
  return { score: avgBody, warnings: warnings.slice(0, 3), ready, distanceHint };
}

// ─── AdaptiveSmoother — confidence-weighted EMA ───────────────────────────────
function createSmoother() {
  const buf = {};
  return (raw) => {
    if (!raw) return null;
    return raw.map((lm, i) => {
      if (!lm) return lm;
      const alpha = 0.2 + lm.visibility * 0.25; // high-confidence = faster response
      const prev = buf[i];
      if (!prev) { buf[i] = { ...lm }; return { ...lm }; }
      const s = { x: prev.x*(1-alpha)+lm.x*alpha, y: prev.y*(1-alpha)+lm.y*alpha, z: prev.z*(1-alpha)+lm.z*alpha, visibility: lm.visibility };
      buf[i] = s; return s;
    });
  };
}

// ─── CalibrationSystem ────────────────────────────────────────────────────────
function CalibrationSystem({ state, countdown, quality }) {
  if (state !== TRACKING_STATES.CALIBRATING && state !== TRACKING_STATES.DETECTING) return null;
  const isCalib = state === TRACKING_STATES.CALIBRATING;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
      {isCalib ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", border: "3px solid #00e5ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 900, color: "#00e5ff", background: "rgba(6,9,15,0.75)", margin: "0 auto 10px", boxShadow: "0 0 24px rgba(0,229,255,0.4)" }}>{countdown}</div>
          <div style={{ fontSize: "0.78rem", color: "#00e5ff", fontWeight: 700, background: "rgba(6,9,15,0.7)", padding: "4px 14px", borderRadius: 20 }}>Stand still — calibrating…</div>
        </div>
      ) : (
        quality.ready ? null : (
          <div style={{ background: "rgba(6,9,15,0.78)", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "0.76rem", color: "#6b8399", fontWeight: 600 }}>Position yourself in frame</div>
          </div>
        )
      )}
    </div>
  );
}

// ─── SkeletonRenderer — Full analysis overlay (head, ASIS, pelvis, lumbar, PSIS) ──
function SkeletonRenderer({ canvasRef, landmarks, videoSize, trackingState, activeView }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoSize) return;
    const ctx = canvas.getContext("2d");
    const { w, h } = videoSize;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!landmarks || trackingState === TRACKING_STATES.LOST) return;

    // Use the full renderPostureOverlay for comprehensive landmark display:
    // head circle, eye level, C-spine, T-spine, L-spine, ASIS rings,
    // pelvis/PSIS in all views, lumbar label, heatmap, skeleton, grid, plumb line
    try {
      const measurements = (() => {
        try { return AdvancedMeasurementEngine(landmarks, null); } catch { return {}; }
      })();
      ctx.save();
      ctx.globalAlpha = trackingState === TRACKING_STATES.STABLE ? 1 : 0.6;
      renderPostureOverlay({
        ctx,
        W: w,
        H: h,
        lm: landmarks,
        measurements,
        showHeatmap: trackingState === TRACKING_STATES.STABLE,
        showLabels: true,
        showGrid: true,
        view: activeView || "anterior",
      });
      ctx.restore();
    } catch(e) {
      // Fallback: basic skeleton if renderPostureOverlay not yet available
      console.warn("SkeletonRenderer fallback:", e);
    }
    ctx.shadowBlur = 0;
  }, [landmarks, videoSize, trackingState, activeView, canvasRef]);
  return null;
}

// ─── BodyAlignmentGuide — Professional physiotherapy overlay ──────────────────
function BodyAlignmentGuide({ show, ready }) {
  if (!show) return null;
  const op = ready ? 0.18 : 0.42;
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet">
      {/* Background grid — alignment reference */}
      {[16.6,33.3,50,66.6,83.3].map(x=><line key={x} x1={x} y1="0" x2={x} y2="150" stroke="#00e5ff" strokeWidth="0.18" strokeDasharray="2,4" opacity={op*0.5}/>)}
      {[18.75,37.5,56.25,75,93.75].map(y=><line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#00e5ff" strokeWidth="0.18" strokeDasharray="2,4" opacity={op*0.5}/>)}

      {/* Vertical plumb line */}
      <line x1="50" y1="3" x2="50" y2="147" stroke="#00e5ff" strokeWidth="0.7" strokeDasharray="3,2.5" opacity={op*1.4}/>

      {/* Head silhouette */}
      <ellipse cx="50" cy="13" rx="7.5" ry="9" fill="none" stroke="#00e5ff" strokeWidth="0.8" opacity={op*1.5}/>

      {/* Shoulder symmetry bar */}
      <line x1="26" y1="27" x2="74" y2="27" stroke="#7f5af0" strokeWidth="0.7" opacity={op*1.4}/>
      <circle cx="26" cy="27" r="1.2" fill="#7f5af0" opacity={op*1.4}/>
      <circle cx="74" cy="27" r="1.2" fill="#7f5af0" opacity={op*1.4}/>

      {/* Torso outline */}
      <path d="M32,27 L28,70 L36,70 L38,95 M68,27 L72,70 L64,70 L62,95" fill="none" stroke="#7f5af040" strokeWidth="0.5" opacity={op}/>

      {/* Hip symmetry bar */}
      <line x1="34" y1="70" x2="66" y2="70" stroke="#00c97a" strokeWidth="0.7" opacity={op*1.4}/>
      <circle cx="34" cy="70" r="1.2" fill="#00c97a" opacity={op*1.4}/>
      <circle cx="66" cy="70" r="1.2" fill="#00c97a" opacity={op*1.4}/>

      {/* Knee level bar */}
      <line x1="36" y1="102" x2="64" y2="102" stroke="#ffb300" strokeWidth="0.5" strokeDasharray="2,2" opacity={op}/>

      {/* Ankle level bar */}
      <line x1="37" y1="126" x2="63" y2="126" stroke="#ffb300" strokeWidth="0.5" strokeDasharray="2,2" opacity={op}/>

      {/* Foot stand-here ellipses */}
      <ellipse cx="38" cy="140" rx="8" ry="3.5" fill="rgba(0,201,122,0.07)" stroke="#00c97a" strokeWidth="0.9" opacity={op*1.2}/>
      <ellipse cx="62" cy="140" rx="8" ry="3.5" fill="rgba(0,201,122,0.07)" stroke="#00c97a" strokeWidth="0.9" opacity={op*1.2}/>

      {/* "STAND HERE" label */}
      {!ready && <text x="50" y="148" textAnchor="middle" fontSize="4.2" fill="#00c97a" fontWeight="bold" opacity={op*1.6}>STAND HERE</text>}

      {/* Corner crosshair markers */}
      {[[10,10],[90,10],[10,140],[90,140]].map(([cx,cy],i)=>(
        <g key={i} opacity={op}>
          <line x1={cx-4} y1={cy} x2={cx+4} y2={cy} stroke="#00e5ff" strokeWidth="0.6"/>
          <line x1={cx} y1={cy-4} x2={cx} y2={cy+4} stroke="#00e5ff" strokeWidth="0.6"/>
        </g>
      ))}
    </svg>
  );
}

// ─── TrackingStateBar ─────────────────────────────────────────────────────────
function TrackingStateBar({ state, quality }) {
  const cfg = {
    [TRACKING_STATES.IDLE]:       { label:"Camera Ready",      color:"#7e6a9a", pulse:false },
    [TRACKING_STATES.LOADING]:    { label:"Loading Model…",    color:"#7f5af0", pulse:true  },
    [TRACKING_STATES.CALIBRATING]:{ label:"Calibrating",       color:"#ffb300", pulse:true  },
    [TRACKING_STATES.DETECTING]:  { label:"Detecting Body…",   color:"#ffb300", pulse:true  },
    [TRACKING_STATES.STABLE]:     { label:"Tracking Stable",   color:"#00c97a", pulse:false },
    [TRACKING_STATES.LOST]:       { label:"Tracking Lost",     color:"#ff4d6d", pulse:true  },
  }[state] || { label:"—", color:"#7e6a9a", pulse:false };

  const qLabel = quality === null ? "" : quality > 0.75 ? "Excellent" : quality > 0.5 ? "Good" : quality > 0.3 ? "Fair" : "Poor";
  const qColor = quality === null ? "" : quality > 0.75 ? "#00c97a" : quality > 0.5 ? "#ffb300" : "#ff4d6d";

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ width:9, height:9, borderRadius:"50%", background:cfg.color, display:"inline-block", boxShadow:`0 0 ${cfg.pulse?8:4}px ${cfg.color}`, animation:cfg.pulse?"pcPulse 1.3s infinite":"none" }}/>
        <span style={{ fontSize:"0.76rem", fontWeight:700, color:cfg.color }}>{cfg.label}</span>
      </div>
      {quality !== null && (
        <span style={{ fontSize:"0.67rem", padding:"2px 9px", borderRadius:10, background:`${qColor}18`, color:qColor, fontWeight:700, border:`1px solid ${qColor}30` }}>Signal: {qLabel}</span>
      )}
      {state === TRACKING_STATES.STABLE && (
        <span style={{ fontSize:"0.67rem", padding:"2px 9px", borderRadius:10, background:"rgba(0,201,122,0.12)", color:"#00c97a", fontWeight:700, border:"1px solid rgba(0,201,122,0.25)", display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#00c97a", display:"inline-block", animation:"pcPulse 1.3s infinite" }}/> LIVE
        </span>
      )}
    </div>
  );
}

// ─── CameraView — Professional full-screen responsive camera preview ──────────
function CameraView({ videoRef, canvasRef, isActive, facingMode, children, onTapFocus, zoom }) {
  const flip = facingMode === "user" ? "scaleX(-1)" : "none";
  const [tapFlash, setTapFlash] = useState(null);

  const handleTap = useCallback((e) => {
    if (!isActive || !onTapFocus) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTapFlash({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setTapFlash(null), 700);
    onTapFocus(x, y);
  }, [isActive, onTapFocus]);

  return (
    <div
      className="pm-cam-aspect pm-camera-wrap"
      onClick={handleTap}
      style={{ position:"relative", width:"100%", background:"#f5f0fb", borderRadius:14, overflow:"hidden", aspectRatio:"3/4", maxHeight:"65vh", cursor: isActive ? "crosshair" : "default", touchAction:"manipulation" }}
    >
      {!isActive && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
          <div style={{ fontSize:"2.8rem" }}>📷</div>
          <div style={{ fontSize:"0.8rem", color:"#7e6a9a", textAlign:"center", padding:"0 20px", lineHeight:1.5 }}>Tap Start Camera to begin<br/>physiotherapy assessment</div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ width:"100%", height:"100%", objectFit:"contain", display:isActive?"block":"none",
          transform:`${flip} scale(${zoom||1})`, transformOrigin:"center center", transition:"transform 0.2s ease" }}
      />
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", transform:flip, objectFit:"contain" }}/>
      {/* Tap-to-focus flash ring */}
      {tapFlash && (
        <div style={{ position:"absolute", left:tapFlash.x-20, top:tapFlash.y-20, width:40, height:40, borderRadius:"50%", border:"2px solid #ffb300", pointerEvents:"none", animation:"tapFocus 0.6s ease-out forwards", zIndex:30 }}/>
      )}
      {children}
    </div>
  );
}

// ─── CameraControls — Professional touch-friendly physiotherapy controls ──────
function CameraControls({ isActive, isLoading, onStart, onStop, onFlip, onRecalibrate, facingMode, canRecalibrate, zoom, onZoom, countdownSecs, onCountdownChange, burstMode, onBurstToggle, activeView, onViewChange, onUploadPhoto }) {
  const views = ["anterior","posterior","left","right","photo"];
  const uploadRef = React.useRef(null);
  const Btn = ({ onClick, label, bg, disabled, sm }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm ? "8px 12px" : "10px 16px",
      background: disabled ? "#1a2d45" : `linear-gradient(135deg,${bg},${bg}cc)`,
      border: "none", borderRadius: 10,
      color: disabled ? "#6b8399" : "#000", fontWeight: 800,
      fontSize: sm ? "0.68rem" : "0.77rem",
      cursor: disabled ? "not-allowed" : "pointer",
      flex: 1, minWidth: sm ? 70 : 90, transition: "opacity 0.2s", whiteSpace:"nowrap"
    }}>{label}</button>
  );
  return (
    <div style={{ marginTop:10 }}>
      {/* ── UPLOAD PHOTO BUTTON — Always visible at top ── */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        style={{ display:"none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && onUploadPhoto) onUploadPhoto(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => uploadRef.current?.click()}
        style={{
          width:"100%", marginBottom:10,
          padding:"13px 16px",
          background: activeView==="photo"
            ? "linear-gradient(135deg,#7f5af0,#00e5ff)"
            : "transparent",
          border: activeView==="photo"
            ? "none"
            : "2px dashed rgba(127,90,240,0.55)",
          borderRadius:12,
          color: activeView==="photo" ? "#000" : "#7f5af0",
          fontWeight:800, fontSize:"0.82rem",
          cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:9,
          boxShadow: activeView==="photo" ? "0 4px 16px rgba(127,90,240,0.35)" : "none",
          transition:"all 0.2s"
        }}
      >
        <span style={{fontSize:"1.2rem"}}>📷</span>
        Upload Patient Photo
        <span style={{fontSize:"0.65rem",opacity:0.75,fontWeight:600}}>JPG / PNG</span>
      </button>
      {/* Front / Back camera toggle — always visible */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#7e6a9a", textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>📷 Camera</div>
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          {/* Front camera */}
          <button
            onClick={() => { if(isActive && facingMode!=="user") onFlip(); else if(!isActive) onStart("user"); }}
            style={{
              flex:1, padding:"11px 8px", borderRadius:11, cursor:"pointer", fontWeight:800,
              fontSize:"0.75rem", display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              background: facingMode==="user" && isActive
                ? "linear-gradient(135deg,#00e5ff,#7f5af0)"
                : "rgba(0,229,255,0.08)",
              color: facingMode==="user" && isActive ? "#000" : "#00e5ff",
              border: facingMode==="user" && isActive ? "none" : "1px solid rgba(0,229,255,0.25)",
              boxShadow: facingMode==="user" && isActive ? "0 0 14px rgba(0,229,255,0.3)" : "none",
              transition:"all 0.2s"
            }}>
            <span style={{fontSize:"1.3rem"}}>🤳</span>
            <span>Front</span>
            {facingMode==="user" && isActive && <span style={{fontSize:"0.55rem",opacity:0.8}}>● ACTIVE</span>}
          </button>
          {/* Back camera */}
          <button
            onClick={() => { if(isActive && facingMode!=="environment") onFlip(); else if(!isActive) onStart("environment"); }}
            style={{
              flex:1, padding:"11px 8px", borderRadius:11, cursor:"pointer", fontWeight:800,
              fontSize:"0.75rem", display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              background: facingMode==="environment" && isActive
                ? "linear-gradient(135deg,#7f5af0,#00e5ff)"
                : "rgba(127,90,240,0.08)",
              color: facingMode==="environment" && isActive ? "#000" : "#7f5af0",
              border: facingMode==="environment" && isActive ? "none" : "1px solid rgba(127,90,240,0.25)",
              boxShadow: facingMode==="environment" && isActive ? "0 0 14px rgba(127,90,240,0.3)" : "none",
              transition:"all 0.2s"
            }}>
            <span style={{fontSize:"1.3rem"}}>📷</span>
            <span>Back</span>
            {facingMode==="environment" && isActive && <span style={{fontSize:"0.55rem",opacity:0.8}}>● ACTIVE</span>}
          </button>
          {/* Stop button */}
          {isActive && (
            <button onClick={onStop} style={{
              flex:"0 0 54px", padding:"11px 6px", borderRadius:11,
              background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.3)",
              color:"#ff4d6d", fontWeight:800, fontSize:"0.7rem", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4
            }}>
              <span style={{fontSize:"1.1rem"}}>⏹</span>
              <span>Stop</span>
            </button>
          )}
        </div>
        {/* Start button when not active */}
        {!isActive && (
          <button onClick={()=>onStart(facingMode)} disabled={isLoading} style={{
            width:"100%", padding:"12px", borderRadius:11, border:"none", cursor:isLoading?"not-allowed":"pointer",
            background:isLoading?"#1a2d45":"linear-gradient(135deg,#00e5ff,#7f5af0)",
            color:isLoading?"#6b8399":"#000", fontWeight:800, fontSize:"0.8rem"
          }}>{isLoading?"⏳ Loading camera…":"▶ Start Camera"}</button>
        )}
        {canRecalibrate && <button onClick={onRecalibrate} style={{width:"100%",marginTop:6,padding:"8px",borderRadius:9,border:"1px solid rgba(255,179,0,0.3)",background:"rgba(255,179,0,0.08)",color:"#ffb300",fontWeight:700,fontSize:"0.72rem",cursor:"pointer"}}>⟳ Recalibrate</button>}
      </div>

      {/* ── VIEW SELECTOR — always visible (Front/Back/Left/Right) ── */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#7e6a9a", textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>📐 Posture View — select before capturing</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
          {[
            { v:"anterior",  icon:"⬆", label:"Front",  color:"#00e5ff" },
            { v:"posterior", icon:"⬇", label:"Back",   color:"#7f5af0" },
            { v:"left",      icon:"◀", label:"Left",   color:"#00c97a" },
            { v:"right",     icon:"▶", label:"Right",  color:"#ffb300" },
          ].map(({ v, icon, label, color }) => {
            const active = activeView === v;
            return (
              <button key={v} onClick={() => onViewChange && onViewChange(v)} style={{
                padding:"10px 4px", borderRadius:11, cursor:"pointer", fontWeight:800,
                fontSize:"0.72rem", display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                background: active ? `linear-gradient(135deg,${color},${color}aa)` : `${color}12`,
                color: active ? "#000" : color,
                border: active ? "none" : `1px solid ${color}40`,
                boxShadow: active ? `0 0 14px ${color}55` : "none",
                transition:"all 0.2s"
              }}>
                <span style={{ fontSize:"1rem" }}>{icon}</span>
                <span>{label}</span>
                {active && <span style={{ fontSize:"0.5rem", opacity:0.85 }}>● SELECTED</span>}
              </button>
            );
          })}
        </div>
        {/* Grid line notice */}
        <div style={{ marginTop:6, padding:"5px 9px", background:"rgba(0,229,255,0.07)", border:"1px solid rgba(0,229,255,0.18)", borderRadius:8, fontSize:"0.62rem", color:"#7e6a9a", fontStyle:"italic" }}>
          🔲 Posture grid lines will appear on captured photo for the selected view
        </div>
      </div>

      {/* Advanced controls row */}
      {isActive && (
        <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
          {/* Zoom */}
          <div style={{ display:"flex", alignItems:"center", gap:5, background:"#ffffff", border:"1px solid #d8cce8", borderRadius:9, padding:"5px 10px", flex:"1 1 auto" }}>
            <span style={{ fontSize:"0.65rem", color:"#7e6a9a", whiteSpace:"nowrap" }}>🔍 Zoom</span>
            <input type="range" min="1" max="2.5" step="0.1" value={zoom||1} onChange={e=>onZoom&&onZoom(Number(e.target.value))}
              style={{ flex:1, accentColor:"#00e5ff", cursor:"pointer", minWidth:60 }}/>
            <span style={{ fontSize:"0.65rem", color:"#00e5ff", minWidth:26, fontWeight:700 }}>{(zoom||1).toFixed(1)}×</span>
          </div>

          {/* Countdown timer */}
          <div style={{ display:"flex", alignItems:"center", gap:5, background:"#ffffff", border:"1px solid #d8cce8", borderRadius:9, padding:"5px 10px" }}>
            <span style={{ fontSize:"0.65rem", color:"#7e6a9a" }}>⏱</span>
            {[3,5,10].map(s => (
              <button key={s} onClick={() => onCountdownChange&&onCountdownChange(s)} style={{
                padding:"3px 7px", borderRadius:6, fontSize:"0.62rem", fontWeight:700, border:"none", cursor:"pointer",
                background: countdownSecs===s ? "#00e5ff" : "#192435", color: countdownSecs===s ? "#000" : "#6b8399"
              }}>{s}s</button>
            ))}
          </div>

          {/* Burst mode */}
          <button onClick={onBurstToggle} style={{
            padding:"6px 11px", borderRadius:9, fontSize:"0.65rem", fontWeight:700, border:"none", cursor:"pointer",
            background: burstMode ? "rgba(255,179,0,0.2)" : "#1a2d45",
            color: burstMode ? "#ffb300" : "#6b8399"
          }}>💥 {burstMode ? "Burst ON" : "Burst"}</button>
        </div>
      )}
    </div>
  );
}

// ─── CameraPositionGuide — Professional clinical setup ───────────────────────
function CameraPositionGuide() {
  return (
    <div style={{ background:"rgba(0,229,255,0.05)", border:"1px solid rgba(0,229,255,0.18)", borderRadius:12, padding:14, marginBottom:12 }}>
      <div style={{ fontSize:"0.7rem", fontWeight:800, color:"#00e5ff", textTransform:"uppercase", letterSpacing:"1px", marginBottom:9 }}>📐 Clinical Setup Guide</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:7 }}>
        {[
          ["📏","2m camera distance"],["🧍","Full body in frame"],
          ["💡","Even, bright lighting"],["📱","Camera at hip/pelvis height"],
          ["👕","Form-fitting clothing"],["🦶","Feet fully visible"],
          ["🔲","Use alignment grid overlay"],["🧘","Patient stands on foot guides"],
        ].map(([ic, tx], i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:"0.74rem", color:"#1a1025" }}>
            <span style={{ flexShrink:0 }}>{ic}</span><span style={{ lineHeight:1.4 }}>{tx}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, padding:"7px 10px", background:"rgba(127,90,240,0.08)", borderRadius:8, fontSize:"0.68rem", color:"#7f5af0", border:"1px solid rgba(127,90,240,0.2)" }}>
        💡 Tip: Tap anywhere on camera to focus · Use zoom for closer inspection · Select a view for guided workflow
      </div>
    </div>
  );
}

// ─── PoseTracker (MediaPipe engine) ──────────────────────────────────────────
function PoseTracker({ videoRef, active, onLandmarks }) {
  const poseRef = useRef(null);
  const rafRef  = useRef(null);
  const alive   = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!active) { onLandmarks(null); return; }
    let gone = false;

    (async () => {
      try {
        if (!window.Pose) await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js";
          s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
        if (gone || !alive.current) return;

        const pose = new window.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}` });
        pose.setOptions({ modelComplexity:1, smoothLandmarks:true, enableSegmentation:false, minDetectionConfidence:0.55, minTrackingConfidence:0.55 });
        pose.onResults(r => { if (alive.current && !gone) onLandmarks(r.poseLandmarks||null); });
        await pose.initialize();
        if (gone || !alive.current) return;
        poseRef.current = pose;

        const loop = async () => {
          if (gone || !alive.current) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && poseRef.current) { try { await poseRef.current.send({ image:v }); } catch(_){} }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch(e) { console.error("PoseTracker:", e); }
    })();

    return () => { gone = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  return null;
}

// ─── UploadedPhotoOverlay — renders uploaded image with full analysis grid ─────
function UploadedPhotoOverlay({ photoUrl, landmarks, view }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photoUrl) return;
    let cancelled = false;
    const drawOnCanvas = (imgEl) => {
      if (cancelled) return;
      const W = imgEl.naturalWidth  || imgEl.width  || 640;
      const H = imgEl.naturalHeight || imgEl.height || 480;
      canvas.width  = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(imgEl, 0, 0, W, H);
      if (landmarks && landmarks.length > 0) {
        try {
          const m = (() => { try { return AdvancedMeasurementEngine(landmarks, null); } catch { return {}; } })();
          renderPostureOverlay({ ctx, W, H, lm: landmarks, measurements: m,
            showHeatmap: true, showLabels: true, showGrid: true, view: view || "anterior" });
        } catch(e) { console.error("UploadedPhotoOverlay overlay:", e); }
      }
    };
    // Load without crossOrigin first (blob URLs work best without it)
    const img = new Image();
    img.onload = () => drawOnCanvas(img);
    img.onerror = () => {
      // Retry with crossOrigin as fallback for http URLs
      const img2 = new Image();
      img2.crossOrigin = "anonymous";
      img2.onload = () => drawOnCanvas(img2);
      img2.onerror = () => console.error("UploadedPhotoOverlay: failed to load photo");
      img2.src = photoUrl;
    };
    // Set src AFTER onload — critical for already-cached blob URLs
    img.src = photoUrl;
    return () => { cancelled = true; };
  }, [photoUrl, landmarks, view]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width:"100%", display:"block", maxHeight:500, background:"#0a0a14" }}
    />
  );
}


// ─── CanvasOverlayOnImage — draws analysis overlay directly on top of img ─────
// Fallback approach: instead of baking into canvas (fails on mobile with large images),
// overlay a transparent canvas positioned absolutely on top of the photo
function CanvasOverlayOnImage({ photoUrl, landmarks, view }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!landmarks || !landmarks.length) return;
    const canvas = canvasRef.current;
    const imgEl = document.getElementById("posture-upload-img");
    if (!canvas || !imgEl) return;

    const drawWhenReady = () => {
      const rect = imgEl.getBoundingClientRect();
      const W = imgEl.naturalWidth || rect.width;
      const H = imgEl.naturalHeight || rect.height;
      const displayW = rect.width;
      const displayH = rect.height;

      canvas.width = W;
      canvas.height = H;
      canvas.style.width = displayW + "px";
      canvas.style.height = displayH + "px";

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);

      // Map view name
      const viewMap = {
        anterior:"anterior", posterior:"posterior",
        left:"left", right:"right", frontal:"anterior", sagittal:"left",
      };
      const mappedView = viewMap[String(view || "anterior").toLowerCase()] || "anterior";

      try {
        drawOverlay({ ctx, W, H, lm: landmarks, view: mappedView, showGrid: true, measurements: {}, clearFirst: true });
      } catch(e) {
        console.warn("CanvasOverlayOnImage drawOverlay failed:", e);
      }
    };

    // Small delay to ensure img has rendered
    const timer = setTimeout(drawWhenReady, 100);
    return () => clearTimeout(timer);
  }, [landmarks, view, photoUrl]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0,
        pointerEvents: "none",
        imageRendering: "pixelated",
      }}
    />
  );
}

// ─── Main PostureCameraModule — Professional Physiotherapy Assessment Camera ──

function PostureCameraModule({ activePatient, set }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const smoother   = useRef(createSmoother());
  const lostTimer  = useRef(null);
  const burstRef   = useRef(null);

  const [trackState, setTrackState] = useState(TRACKING_STATES.IDLE);
  const [isLoading,  setIsLoading]  = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [landmarks,  setLandmarks]  = useState(null);
  const [videoSize,  setVideoSize]  = useState(null);
  const [countdown,  setCountdown]  = useState(0);
  const [permError,  setPermError]  = useState(null);
  const [poseActive, setPoseActive] = useState(false);

  // Enhanced state
  const [zoom,           setZoom]           = useState(1);
  const [countdownSecs,  setCountdownSecs]  = useState(3);
  const [burstMode,      setBurstMode]      = useState(false);
  const [activeView,     setActiveView]     = useState("anterior");
  const [captureCountdown, setCaptureCountdown] = useState(null);
  const [lastCapture,    setLastCapture]       = useState(null);
  const [stabilityFrames, setStabilityFrames]   = useState(0);
  const [lightingWarn,   setLightingWarn]   = useState(false);

  // ── Multi-view capture bank: stores one capture per view ──────────────────
  const [viewCaptures, setViewCaptures] = useState({
    anterior: null, posterior: null, left: null, right: null
  }); // each: { img, lm, measurements, findings, scoreData, time }
  const [showViewBank, setShowViewBank] = useState(false);

  // ── Before / After comparison ─────────────────────────────────────────────
  const [baselineCapture, setBaselineCapture] = useState(null);  // { img, score, findings, date, view }
  const [showComparison,  setShowComparison]  = useState(false);
  // Upload photo state — for the always-visible upload button
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [uploadedPhotoLm,  setUploadedPhotoLm]  = useState(null);
  const [uploadedAnalysis, setUploadedAnalysis] = useState(null); // Holds detection-failure message when MediaPipe finds no landmarks
  const [uploadAnalysing,  setUploadAnalysing]  = useState(false);
  const [reportPatient,    setReportPatient]    = useState("");
  const [reportClinician,  setReportClinician]  = useState("");
  const [reportExporting,  setReportExporting]  = useState(false);
  const [savedToRecord,    setSavedToRecord]    = useState(false); // confirmation flash
  const uploadObjRef = useRef(null);

  // Auto-fill patient name from active patient record
  useEffect(() => {
    if (activePatient?.data?.dem_name) setReportPatient(activePatient.data.dem_name);
    else if (activePatient?.name && activePatient.name !== "New Patient") setReportPatient(activePatient.name);
  }, [activePatient?.id]);

  const isActive = trackState !== TRACKING_STATES.IDLE;
  const quality  = landmarks ? computeQuality(landmarks) : { score:null, warnings:[], ready:false, distanceHint:null };

  // ── Lighting detection via canvas sampling ─────────────────────────────────
  const checkLighting = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    if (v.readyState < 2) return;
    const c = document.createElement("canvas");
    c.width = 32; c.height = 32;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0, 32, 32);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    let lum = 0;
    for (let i = 0; i < d.length; i += 4) lum += 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    lum /= (d.length / 4);
    setLightingWarn(lum < 60 || lum > 230);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(checkLighting, 3000);
    return () => clearInterval(t);
  }, [isActive, checkLighting]);

  // ── Stability detection ────────────────────────────────────────────────────
  const prevLmRef = useRef(null);
  useEffect(() => {
    if (!landmarks) { setStabilityFrames(0); return; }
    if (!prevLmRef.current) { prevLmRef.current = landmarks; return; }
    const drift = Math.abs((landmarks[0]?.x||0) - (prevLmRef.current[0]?.x||0)) * 100
                + Math.abs((landmarks[0]?.y||0) - (prevLmRef.current[0]?.y||0)) * 100;
    prevLmRef.current = landmarks;
    setStabilityFrames(f => drift < 1.5 ? Math.min(f + 1, 30) : 0);
  }, [landmarks]);

  const isStable = stabilityFrames >= 12;

  // ── Calibration ────────────────────────────────────────────────────────────
  const runCalibration = () => {
    setTrackState(TRACKING_STATES.CALIBRATING);
    let c = 4; setCountdown(c);
    const t = setInterval(() => {
      c--; setCountdown(c);
      if (c <= 0) { clearInterval(t); setTrackState(TRACKING_STATES.DETECTING); setPoseActive(true); }
    }, 1000);
  };

  // ── Camera start / stop ────────────────────────────────────────────────────
  const startCamera = async (mode = facingMode) => {
    setPermError(null); setIsLoading(true); setTrackState(TRACKING_STATES.LOADING);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      // Adaptive resolution: try HD first, fall back gracefully
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:mode, width:{ideal:window.innerWidth}, height:{ideal:window.innerHeight}, frameRate:{ideal:30,max:60} }, audio:false });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:mode, width:{ideal:window.innerWidth}, height:{ideal:window.innerHeight} }, audio:false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(res => { videoRef.current.onloadedmetadata = res; });
        setVideoSize({ w:videoRef.current.videoWidth, h:videoRef.current.videoHeight });
      }
      setIsLoading(false);
      runCalibration();
    } catch(err) {
      setIsLoading(false); setTrackState(TRACKING_STATES.IDLE);
      setPermError(err.name==="NotAllowedError" ? "Camera permission denied — allow access in browser settings." : err.name==="NotFoundError" ? "No camera found on this device." : `Camera error: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null; setPoseActive(false); setLandmarks(null);
    setTrackState(TRACKING_STATES.IDLE); setCountdown(0);
    if (lostTimer.current) clearTimeout(lostTimer.current);
    if (burstRef.current) clearInterval(burstRef.current);
    setCaptureCountdown(null);
  };

  const flipCamera = () => {
    const next = facingMode==="user" ? "environment" : "user";
    setFacingMode(next); if (isActive) { stopCamera(); setTimeout(() => startCamera(next), 200); }
  };

  // ── Generate multi-view PDF (Fix 1) ──────────────────────────────────────
  const generateMultiViewPDF = useCallback(async () => {
    setReportExporting(true);
    try {
      const date = new Date().toLocaleDateString("en-AU", { day:"2-digit", month:"long", year:"numeric" });
      const captured = Object.entries(viewCaptures).filter(([,v]) => v !== null);
      const allFindings = captured.flatMap(([,v]) => v.findings);
      const highCount = allFindings.filter(f=>f.severity==="high").length;
      const modCount  = allFindings.filter(f=>f.severity!=="high").length;
      const avgScore  = captured.length
        ? Math.round(captured.reduce((s,[,v]) => s + (v.scoreData?.score||0), 0) / captured.length) : null;
      const scoreCol  = avgScore >= 78 ? "#16a34a" : avgScore >= 62 ? "#d97706" : "#dc2626";
      const viewLabels = {anterior:"Anterior (Front)", posterior:"Posterior (Back)", left:"Left Lateral", right:"Right Lateral"};
      const viewIcons  = {anterior:"⬆", posterior:"⬇", left:"◀", right:"▶"};

      const viewSections = captured.map(([view, cap]) => {
        const sCol = (cap.scoreData?.score||0) >= 78 ? "#16a34a" : (cap.scoreData?.score||0) >= 62 ? "#d97706" : "#dc2626";
        const highF = cap.findings.filter(f=>f.severity==="high");
        const modF  = cap.findings.filter(f=>f.severity!=="high");
        return `
          <div style="break-inside:avoid;margin-bottom:20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <div style="background:#f0f9ff;padding:8px 13px;border-bottom:1px solid #bae6fd;display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:13px;font-weight:800;color:#0369a1;">${viewIcons[view]} ${viewLabels[view]}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="font-size:9px;padding:2px 7px;border-radius:5px;background:#fee2e2;color:#b91c1c;font-weight:700;">${highF.length} HIGH</span>
                <span style="font-size:9px;padding:2px 7px;border-radius:5px;background:#fef3c7;color:#92400e;font-weight:700;">${modF.length} MOD</span>
                ${cap.scoreData?.score ? `<span style="font-size:16px;font-weight:900;color:${sCol};">${cap.scoreData?.score}</span>` : ""}
              </div>
            </div>
            <div style="display:flex;gap:12px;padding:10px 13px;">
              <img src="${cap.img}" style="width:160px;flex-shrink:0;border-radius:7px;border:1px solid #e2e8f0;object-fit:contain;background:#f8fafc;" alt="${view}"/>
              <div style="flex:1;">
                ${cap.findings.map(f => `
                  <div style="padding:5px 9px;margin-bottom:5px;border-radius:7px;border-left:3px solid ${f.severity==="high"?"#dc2626":"#d97706"};background:${f.severity==="high"?"#fff5f5":"#fffbeb"};">
                    <div style="display:flex;gap:6px;align-items:center;margin-bottom:2px;">
                      <span style="font-size:11px;">${f.icon||"●"}</span>
                      <strong style="font-size:10.5px;color:${f.severity==="high"?"#b91c1c":"#92400e"};">${f.region}</strong>
                      <span style="font-size:8px;padding:1px 5px;border-radius:4px;background:${f.severity==="high"?"#fee2e2":"#fef3c7"};color:${f.severity==="high"?"#b91c1c":"#92400e"};font-weight:700;">${f.severity.toUpperCase()}</span>
                      ${f.icd?`<span style="font-size:8px;color:#94a3b8;margin-left:auto;font-family:monospace;">${f.icd}</span>`:""}
                    </div>
                    <div style="font-size:10px;color:#374151;line-height:1.5;">${f.text}</div>
                    ${f.correction?`<div style="font-size:9px;color:#64748b;margin-top:2px;"><strong style="color:${f.severity==="high"?"#be123c":"#b45309"};">Rx: </strong>${f.correction}</div>`:""}
                  </div>`).join("")}
                ${cap.findings.length === 0 ? `<div style="color:#16a34a;font-weight:700;font-size:10.5px;padding:8px;">✅ No significant findings</div>` : ""}
              </div>
            </div>
            ${cap.measurements ? `
              <div style="padding:6px 13px 10px;border-top:1px solid #f1f5f9;">
                <div style="font-size:8.5px;font-weight:700;color:#64748b;margin-bottom:4px;">KEY MEASUREMENTS</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${[
                    ["Shoulder", cap.measurements.shoulderAngle, "°"],
                    ["Pelvis/ASIS", cap.measurements.pelvisAngle, "°"],
                    ["CVA", cap.measurements.cvaAngle, "°"],
                    ["Kyphosis", cap.measurements.thoracicAngle, "°"],
                    ["Lordosis", cap.measurements.lordosisAngle, "°"],
                    ["L Knee", cap.measurements.leftKneeDev, "°"],
                    ["R Knee", cap.measurements.rightKneeDev, "°"],
                    ["CoG", cap.measurements.cogDeviation, "%"],
                  ].filter(([,v]) => v !== null && v !== undefined).map(([label,val,unit]) => {
                    const abs = Math.abs(val);
                    const col = abs < 3 ? "#16a34a" : abs < 8 ? "#d97706" : "#dc2626";
                    return `<span style="font-size:9px;padding:2px 7px;border-radius:5px;background:${col}15;color:${col};font-weight:700;">${label}: ${val>0?"+":""}${Math.round(val*10)/10}${unit}</span>`;
                  }).join("")}
                </div>
              </div>` : ""}
          </div>`;
      }).join("");

      // Before/After section
      const compSection = baselineCapture && captured.some(([v]) => v === baselineCapture.view) ? (() => {
        const cur = viewCaptures[baselineCapture.view];
        const bScore = baselineCapture.scoreData?.score;
        const cScore = cur?.scoreData?.score;
        const delta = bScore && cScore ? cScore - bScore : null;
        return `
          <div style="break-before:always;margin-bottom:20px;">
            <h2>⇄ Before / After Comparison — ${viewLabels[baselineCapture.view] || baselineCapture.view}</h2>
            <div style="display:grid;grid-template-columns:1fr 80px 1fr;gap:12px;align-items:center;margin-bottom:12px;">
              <div style="text-align:center;">
                <img src="${baselineCapture.img}" style="width:100%;border-radius:8px;border:2px solid #7f5af0;"/>
                <div style="font-size:9px;color:#6d28d9;font-weight:700;margin-top:4px;">BASELINE · ${baselineCapture.date}</div>
                ${bScore?`<div style="font-size:24px;font-weight:900;color:#6d28d9;">${bScore}</div>`:""}
              </div>
              <div style="text-align:center;">
                ${delta!==null?`<div style="font-size:24px;font-weight:900;color:${delta>=0?"#16a34a":"#dc2626"};">${delta>=0?"▲":"▼"}${Math.abs(delta)}</div><div style="font-size:9px;color:#64748b;">pts change</div>`:""}
              </div>
              <div style="text-align:center;">
                <img src="${cur.img}" style="width:100%;border-radius:8px;border:2px solid #0ea5e9;"/>
                <div style="font-size:9px;color:#0369a1;font-weight:700;margin-top:4px;">CURRENT · ${cur.time}</div>
                ${cScore?`<div style="font-size:24px;font-weight:900;color:#0369a1;">${cScore}</div>`:""}
              </div>
            </div>
          </div>`;
      })() : "";

      const metaRight = `<strong>Patient:</strong> ${reportPatient||"—"}<br/><strong>Clinician:</strong> ${reportClinician||"—"}<br/><strong>Date:</strong> ${date}<br/><strong>Views:</strong> ${captured.map(([v])=>v).join(", ")}`;
      const bodyHTML = `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:9.5px;color:#78350f;margin-bottom:14px;">
          ⚠ Observational postural assessment from static photographs. Clinical correlation required.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;"><div style="font-size:8px;font-weight:700;color:#0369a1;text-transform:uppercase;margin-bottom:3px;">Patient</div><div style="font-size:11px;font-weight:700;">${reportPatient||"—"}</div></div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;"><div style="font-size:8px;font-weight:700;color:#0369a1;text-transform:uppercase;margin-bottom:3px;">Clinician</div><div style="font-size:11px;font-weight:700;">${reportClinician||"—"}</div></div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;"><div style="font-size:8px;font-weight:700;color:#0369a1;text-transform:uppercase;margin-bottom:3px;">Views</div><div style="font-size:11px;font-weight:700;">${captured.length}/4</div></div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;"><div style="font-size:8px;font-weight:700;color:#0369a1;text-transform:uppercase;margin-bottom:3px;">Avg Score</div><div style="font-size:16px;font-weight:900;color:${scoreCol};">${avgScore ?? "—"}</div></div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:16px;">
          <div style="text-align:center;flex:1;padding:10px;background:#fee2e2;border-radius:8px;"><div style="font-size:28px;font-weight:900;color:#dc2626;">${highCount}</div><div style="font-size:9px;font-weight:700;color:#b91c1c;">HIGH PRIORITY</div></div>
          <div style="text-align:center;flex:1;padding:10px;background:#fef3c7;border-radius:8px;"><div style="font-size:28px;font-weight:900;color:#d97706;">${modCount}</div><div style="font-size:9px;font-weight:700;color:#92400e;">MODERATE</div></div>
          <div style="text-align:center;flex:1;padding:10px;background:#f0fdf4;border-radius:8px;"><div style="font-size:28px;font-weight:900;color:#16a34a;">${allFindings.length}</div><div style="font-size:9px;font-weight:700;color:#15803d;">TOTAL</div></div>
        </div>
        ${viewSections}
        ${compSection}
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;gap:30px;">
          <div style="flex:1;"><div style="height:32px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div><div style="font-size:8.5px;color:#64748b;">Clinician Signature</div></div>
          <div style="flex:1;"><div style="height:32px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div><div style="font-size:8.5px;color:#64748b;">Date</div></div>
        </div>`;

      const html = makePDFPage("Multi-View Postural Assessment Report", metaRight, bodyHTML);
      await downloadPDFFromHTML(html, `PostureReport_MultiView_${(reportPatient||"Patient").replace(/\s+/g,"_")}_${date.replace(/\s/g,"")}.pdf`);
    } catch(e) { console.error("Multi-view PDF:", e); }
    setReportExporting(false);
  }, [viewCaptures, baselineCapture, reportPatient, reportClinician]);

  // ── Generate single-view postural assessment PDF report ───────────────────
  const generatePostureReportPDF = useCallback(async () => {
    setReportExporting(true);
    try {
      const date = new Date().toLocaleDateString("en-AU", { day:"2-digit", month:"long", year:"numeric" });
      const viewLabel = activeView ? (activeView.charAt(0).toUpperCase() + activeView.slice(1)) : "Anterior";

      // Get annotated photo as base64 data URL
      let photoDataUrl = uploadedPhotoUrl || null;
      if (uploadedPhotoLm && uploadedPhotoUrl) {
        // Bake overlay onto photo
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = uploadedPhotoUrl;
          await new Promise(res => { img.onload = res; img.onerror = res; });
          const cc = document.createElement("canvas");
          cc.width = img.naturalWidth; cc.height = img.naturalHeight;
          const ctx = cc.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const m = AdvancedMeasurementEngine ? AdvancedMeasurementEngine(uploadedPhotoLm, null) : {};
          if (typeof renderPostureOverlay === "function") {
            renderPostureOverlay({ ctx, W:cc.width, H:cc.height, lm:uploadedPhotoLm,
              measurements:m, showHeatmap:true, showLabels:true, showGrid:true, view:activeView });
          }
          photoDataUrl = cc.toDataURL("image/jpeg", 0.88);
        } catch(e) { console.error("Bake overlay:", e); }
      }

      // Compute findings
      let findings = [];
      let measurements = {};
      let scoreData = null;
      if (uploadedPhotoLm) {
        measurements = AdvancedMeasurementEngine ? AdvancedMeasurementEngine(uploadedPhotoLm, null) : {};
        const rel = ReliabilityEngine ? ReliabilityEngine(uploadedPhotoLm) : { blocked: false };
        // QUALITY GATE: suppress findings if image quality was too low
        findings = (!rel.blocked && ClinicalFindingsEngine)
          ? ClinicalFindingsEngine(uploadedPhotoLm, activeView, measurements) : [];
        try {
          scoreData = PostureScoreEngine(measurements, findings, rel);
        } catch(e) { console.warn("PostureScoreEngine:", e); }
      } else if (uploadedAnalysis) {
        findings = uploadedAnalysis.findings || [];
      }

      const severityBadge = (s) => s === "high"
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:5px;background:#fee2e2;color:#b91c1c;font-size:9px;font-weight:800;">HIGH</span>`
        : `<span style="display:inline-block;padding:2px 8px;border-radius:5px;background:#fef3c7;color:#92400e;font-size:9px;font-weight:800;">MODERATE</span>`;

      const regionBadge = (r) =>
        `<span style="display:inline-block;padding:2px 8px;border-radius:5px;background:#ede9fe;color:#6d28d9;font-size:9px;font-weight:700;">${r}</span>`;

      const highFindings  = findings.filter(f => f.severity === "high");
      const modFindings   = findings.filter(f => f.severity !== "high");

      // Score circle SVG
      const score = scoreData?.score ?? null;
      const scoreBand = scoreData?.band ?? "";
      const scoreColor = score !== null ? (score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626") : "#6b7280";
      const scoreCircleSVG = score !== null ? `
        <div style="text-align:center;margin:8px 0 16px;">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" stroke-width="8"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="${scoreColor}" stroke-width="8"
              stroke-dasharray="${(score/100)*264} 264" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 50 50)"/>
            <text x="50" y="46" text-anchor="middle" fill="${scoreColor}" font-size="22" font-weight="800" font-family="system-ui">${score}</text>
            <text x="50" y="62" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui">${scoreBand.toUpperCase()}</text>
          </svg>
          <div style="font-size:9px;color:#64748b;margin-top:4px;">Posture Score</div>
        </div>` : "";

      // Key measurements table
      const measRows = [
        ["Shoulder Obliquity", measurements.shoulderAngle, "°", [3,7]],
        ["Pelvic Obliquity (ASIS)", measurements.pelvisAngle, "°", [3,7]],
        ["Head Lateral Offset", measurements.headLateralOffset, "%", [2,5]],
        ["Trunk Lateral Shift", measurements.trunkLateralShift, "%", [3,7]],
        ["Forward Head (CVA)", measurements.forwardHeadMm, "%", [3,7]],
        ["Cobb Estimate (Scoliosis)", measurements.cobbEstimate, "°", [5,10]],
        ["Left Knee Deviation", measurements.leftKneeDev, "°", [5,10]],
        ["Right Knee Deviation", measurements.rightKneeDev, "°", [5,10]],
        ["L Ankle Deviation", measurements.leftAnkleAngle, "°", [5,12]],
        ["R Ankle Deviation", measurements.rightAnkleAngle, "°", [5,12]],
      ].filter(([,v]) => v !== null && v !== undefined);

      const measHTML = measRows.length ? `
        <h2 style="font-size:13px;font-weight:800;color:#0369a1;border-left:4px solid #0ea5e9;padding-left:10px;margin:16px 0 8px;">📐 Postural Measurements</h2>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;">
          <thead>
            <tr style="background:#f0f9ff;">
              <th style="padding:6px 10px;text-align:left;color:#0369a1;font-weight:700;border-bottom:2px solid #bae6fd;">Measurement</th>
              <th style="padding:6px 10px;text-align:center;color:#0369a1;font-weight:700;border-bottom:2px solid #bae6fd;">Value</th>
              <th style="padding:6px 10px;text-align:center;color:#0369a1;font-weight:700;border-bottom:2px solid #bae6fd;">Status</th>
              <th style="padding:6px 10px;text-align:center;color:#0369a1;font-weight:700;border-bottom:2px solid #bae6fd;">Normal Range</th>
            </tr>
          </thead>
          <tbody>
            ${measRows.map(([label,val,unit,[t1,t2]],i) => {
              const abs = Math.abs(val);
              const [col, status] = abs < t1 ? ["#16a34a","Normal"] : abs < t2 ? ["#d97706","Mild"] : ["#dc2626","Significant"];
              return `<tr style="background:${i%2===0?"#ffffff":"#f8fafc"};">
                <td style="padding:5px 10px;color:#374151;font-weight:600;">${label}</td>
                <td style="padding:5px 10px;text-align:center;color:${col};font-weight:800;">${val>0?"+":""}${Math.round(val*10)/10}${unit}</td>
                <td style="padding:5px 10px;text-align:center;"><span style="padding:1px 7px;border-radius:4px;background:${col}18;color:${col};font-weight:700;font-size:8.5px;">${status}</span></td>
                <td style="padding:5px 10px;text-align:center;color:#94a3b8;font-size:9px;">&lt;${t1}${unit}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>` : "";

      // AI summary metrics (fallback) — suppressed since AI vision API was removed; kept defensive in case
      // of legacy data. Skip entirely when this is a detection-failure record.
      const aiSummaryHTML = (uploadedAnalysis && !uploadedPhotoLm && !uploadedAnalysis._error) ? `
        <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:9px;padding:10px 13px;margin-bottom:14px;font-size:10.5px;line-height:1.7;">
          <strong style="color:#4338ca;">Analysis Summary:</strong> ${uploadedAnalysis.summary || ""}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
            ${uploadedAnalysis.pelvicTilt && uploadedAnalysis.pelvicTilt!=="unknown" ? `<span style="padding:2px 8px;border-radius:5px;background:#ede9fe;color:#6d28d9;font-weight:700;font-size:9px;">Pelvis: ${uploadedAnalysis.pelvicTilt}</span>` : ""}
            ${uploadedAnalysis.shoulderDeviation && uploadedAnalysis.shoulderDeviation!=="unknown" ? `<span style="padding:2px 8px;border-radius:5px;background:#dbeafe;color:#1d4ed8;font-weight:700;font-size:9px;">Shoulders: ${uploadedAnalysis.shoulderDeviation}</span>` : ""}
            ${uploadedAnalysis.kneeDeviation && uploadedAnalysis.kneeDeviation!=="unknown" ? `<span style="padding:2px 8px;border-radius:5px;background:#fef3c7;color:#92400e;font-weight:700;font-size:9px;">Knees: ${uploadedAnalysis.kneeDeviation}</span>` : ""}
            ${uploadedAnalysis.spineAlignment && uploadedAnalysis.spineAlignment!=="unknown" ? `<span style="padding:2px 8px;border-radius:5px;background:#dcfce7;color:#15803d;font-weight:700;font-size:9px;">Spine: ${uploadedAnalysis.spineAlignment}</span>` : ""}
          </div>
        </div>` : "";

      // Findings HTML
      const findingCardHTML = (f, i) => `
        <div style="background:#f8fafc;border:1px solid ${f.severity==="high"?"#fecaca":"#fde68a"};border-left:4px solid ${f.severity==="high"?"#dc2626":"#d97706"};border-radius:9px;padding:11px 14px;margin-bottom:10px;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:14px;">${f.icon||"●"}</span>
              <strong style="font-size:11.5px;color:${f.severity==="high"?"#b91c1c":"#92400e"};">${f.region}</strong>
              ${severityBadge(f.severity)}
            </div>
            ${f.icd ? `<span style="font-size:8.5px;color:#94a3b8;font-family:monospace;">${f.icd}</span>` : ""}
          </div>
          <p style="margin:4px 0 6px;color:#374151;font-size:10.5px;line-height:1.6;">${f.text}</p>
          ${f.correction ? `<div style="background:${f.severity==="high"?"#fff1f2":"#fffbeb"};border-radius:6px;padding:7px 10px;font-size:10px;color:#374151;line-height:1.6;">
            <strong style="color:${f.severity==="high"?"#be123c":"#b45309"};">Rx: </strong>${f.correction}
          </div>` : ""}
        </div>`;

      const bodyHTML = `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:9.5px;color:#78350f;margin-bottom:14px;">
          ⚠ Observational postural assessment from static photograph. Clinical correlation required. Not a substitute for comprehensive evaluation.
        </div>

        ${/* Patient info grid */""}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;">
            <div style="font-size:8.5px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Patient</div>
            <div style="font-size:11px;font-weight:700;color:#111827;">${reportPatient || "—"}</div>
          </div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;">
            <div style="font-size:8.5px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Clinician</div>
            <div style="font-size:11px;font-weight:700;color:#111827;">${reportClinician || "—"}</div>
          </div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;">
            <div style="font-size:8.5px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">View</div>
            <div style="font-size:11px;font-weight:700;color:#111827;">${viewLabel}</div>
          </div>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:9px 12px;">
            <div style="font-size:8.5px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Date</div>
            <div style="font-size:11px;font-weight:700;color:#111827;">${date}</div>
          </div>
        </div>

        ${/* Summary row: photo + score */""}
        <div style="display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;">
          ${photoDataUrl ? `<div style="flex:0 0 auto;max-width:220px;">
            <img src="${photoDataUrl}" alt="Postural assessment photo" style="width:100%;border-radius:8px;border:1px solid #e2e8f0;display:block;"/>
            <div style="text-align:center;font-size:8.5px;color:#64748b;margin-top:4px;">${viewLabel} View — ${date}</div>
          </div>` : ""}
          <div style="flex:1;">
            ${scoreCircleSVG}
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px 13px;">
              <div style="font-size:9px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px;">Finding Summary</div>
              <div style="display:flex;gap:10px;margin-bottom:8px;">
                <div style="text-align:center;flex:1;padding:8px;background:#fee2e2;border-radius:7px;">
                  <div style="font-size:22px;font-weight:900;color:#dc2626;">${highFindings.length}</div>
                  <div style="font-size:8.5px;color:#b91c1c;font-weight:700;">HIGH</div>
                </div>
                <div style="text-align:center;flex:1;padding:8px;background:#fef3c7;border-radius:7px;">
                  <div style="font-size:22px;font-weight:900;color:#d97706;">${modFindings.length}</div>
                  <div style="font-size:8.5px;color:#92400e;font-weight:700;">MODERATE</div>
                </div>
                <div style="text-align:center;flex:1;padding:8px;background:#f0fdf4;border-radius:7px;">
                  <div style="font-size:22px;font-weight:900;color:#16a34a;">${findings.length}</div>
                  <div style="font-size:8.5px;color:#15803d;font-weight:700;">TOTAL</div>
                </div>
              </div>
              <div style="font-size:9px;color:#64748b;line-height:1.6;">
                Regions assessed: Cervical · Shoulder Girdle · Thoracic · Lumbar/Pelvis · ASIS/PSIS · Knee · Ankle · Foot
              </div>
            </div>
          </div>
        </div>

        ${aiSummaryHTML}
        ${measHTML}

        ${highFindings.length > 0 ? `
        <h2 style="font-size:13px;font-weight:800;color:#b91c1c;border-left:4px solid #dc2626;padding-left:10px;margin:16px 0 8px;">🔴 High Priority Findings (${highFindings.length})</h2>
        ${highFindings.map(findingCardHTML).join("")}` : ""}

        ${modFindings.length > 0 ? `
        <h2 style="font-size:13px;font-weight:800;color:#92400e;border-left:4px solid #d97706;padding-left:10px;margin:16px 0 8px;">🟡 Moderate Findings (${modFindings.length})</h2>
        ${modFindings.map(findingCardHTML).join("")}` : ""}

        ${findings.length === 0 ? `<div style="text-align:center;padding:24px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;color:#15803d;font-weight:700;">✅ No significant postural deviations detected</div>` : ""}

        <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <div style="font-size:9px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Clinician Notes</div>
          <div style="height:60px;border:1px solid #e2e8f0;border-radius:7px;background:#f8fafc;"></div>
        </div>

        <div style="margin-top:24px;display:flex;gap:30px;border-top:1px solid #e2e8f0;padding-top:14px;">
          <div style="flex:1;"><div style="height:32px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div><div style="font-size:8.5px;color:#64748b;">Clinician Signature</div></div>
          <div style="flex:1;"><div style="height:32px;border-bottom:1px solid #94a3b8;margin-bottom:5px;"></div><div style="font-size:8.5px;color:#64748b;">Date</div></div>
        </div>`;

      const metaRight = `<strong>Patient:</strong> ${reportPatient||"—"}<br/><strong>Clinician:</strong> ${reportClinician||"—"}<br/><strong>View:</strong> ${viewLabel}<br/><strong>Date:</strong> ${date}`;
      const html = makePDFPage("Postural Assessment Report", metaRight, bodyHTML);
      const fname = `PostureReport_${(reportPatient||"Patient").replace(/\s+/g,"_")}_${date.replace(/\s/g,"")}.pdf`;
      await downloadPDFFromHTML(html, fname);
      // Also auto-save to patient record after PDF export
      savePostureToRecord();
    } catch(e) { console.error("PDF export:", e); }
    setReportExporting(false);
  }, [uploadedPhotoUrl, uploadedPhotoLm, uploadedAnalysis, activeView, reportPatient, reportClinician]);

  // ── Save posture result to patient record (data key posture_sessions) ────
  const savePostureToRecord = useCallback(() => {
    if (!set) return; // no patient loaded
    const now = new Date().toISOString();
    const date = new Date().toLocaleDateString("en-AU", { day:"2-digit", month:"short", year:"numeric" });
    let measurements = {}, findings = [], scoreData = null;
    if (uploadedPhotoLm) {
      measurements = AdvancedMeasurementEngine ? AdvancedMeasurementEngine(uploadedPhotoLm, null) : {};
      const rel = ReliabilityEngine ? ReliabilityEngine(uploadedPhotoLm) : { blocked: false };
      findings = (!rel.blocked && ClinicalFindingsEngine)
        ? ClinicalFindingsEngine(uploadedPhotoLm, activeView, measurements) : [];
      try { scoreData = PostureScoreEngine(measurements, findings, rel); } catch(e) {}
    } else if (uploadedAnalysis) {
      findings = uploadedAnalysis.findings || [];
    }
    const sessionRecord = {
      id: `posture_${Date.now()}`,
      capturedAt: now,
      dateLabel: date,
      view: activeView,
      source: uploadedPhotoLm ? "mediapipe" : "ai_vision",
      score: scoreData?.score ?? null,
      band: scoreData?.band ?? null,
      findingsCount: findings.length,
      highCount: findings.filter(f => f.severity === "high").length,
      findings: findings.map(f => ({ region: f.region, severity: f.severity, text: f.text, icd: f.icd || null })),
      measurements: {
        shoulderAngle:      measurements.shoulderAngle      ?? null,
        pelvisAngle:        measurements.pelvisAngle        ?? null,
        headLateralOffset:  measurements.headLateralOffset  ?? null,
        trunkLateralShift:  measurements.trunkLateralShift  ?? null,
        cvaAngle:           measurements.cvaAngle           ?? null,
        cobbEstimate:       measurements.cobbEstimate       ?? null,
        leftKneeDev:        measurements.leftKneeDev        ?? null,
        rightKneeDev:       measurements.rightKneeDev       ?? null,
        cogDeviation:       measurements.cogDeviation       ?? null,
      },
      aiSummary: uploadedAnalysis?.summary ?? null,
      pelvicTilt: uploadedAnalysis?.pelvicTilt ?? null,
      shoulderDeviation: uploadedAnalysis?.shoulderDeviation ?? null,
      kneeDeviation: uploadedAnalysis?.kneeDeviation ?? null,
      spineAlignment: uploadedAnalysis?.spineAlignment ?? null,
    };
    // Read existing sessions, prepend new one, keep last 20
    const existingRaw = typeof window !== "undefined"
      ? (window.__postureSessionsCache || "[]") : "[]";
    const existing = (() => { try { return JSON.parse(existingRaw); } catch { return []; } })();
    const next = [sessionRecord, ...existing].slice(0, 20);
    window.__postureSessionsCache = JSON.stringify(next);
    set("posture_sessions", JSON.stringify(next));
    setSavedToRecord(true);
    setTimeout(() => setSavedToRecord(false), 3000);
  }, [set, uploadedPhotoLm, uploadedAnalysis, activeView]);
  // ── Upload photo → run MediaPipe pose detection ───────────────────────────
  // (AI vision fallback removed — MediaPipe handles all analysis locally.)
  const handleUploadPhoto = useCallback(async (file) => {
    if (!file) return;
    if (uploadObjRef.current) URL.revokeObjectURL(uploadObjRef.current);
    const url = URL.createObjectURL(file);
    uploadObjRef.current = url;
    setUploadedPhotoUrl(url);   // ← photo visible immediately
    setUploadedPhotoLm(null);
    setUploadedAnalysis(null);
    setUploadAnalysing(true);
    stopCamera();

    let mpSuccess = false;
    let mpError   = null;
    try {
      const img = new Image();
      img.src = url;
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("Image failed to load")); });
      if (!window.Pose) await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js";
        s.onload = res; s.onerror = () => rej(new Error("Failed to load MediaPipe Pose library")); document.head.appendChild(s);
      });
      const pose = new window.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}` });
      pose.setOptions({ modelComplexity:2, smoothLandmarks:false, enableSegmentation:false, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });
      pose.onResults(results => {
        const lm = results.poseLandmarks;
        if (lm && lm.length > 0) {
          let annotatedUrl = null;
          try {
            const oc = document.createElement("canvas");
            oc.width = img.naturalWidth; oc.height = img.naturalHeight;
            const octx = oc.getContext("2d");
            octx.drawImage(img, 0, 0, oc.width, oc.height);
            const m = AdvancedMeasurementEngine(lm, null);
            renderPostureOverlay({ ctx: octx, W: oc.width, H: oc.height, lm,
              measurements: m, showHeatmap: true, showLabels: true, showGrid: true,
              view: activeView });
            annotatedUrl = oc.toDataURL("image/jpeg", 0.92);
          } catch(e2) { console.warn("Overlay bake failed, using raw photo:", e2); }
          setUploadedPhotoLm(lm);
          if (annotatedUrl) setUploadedPhotoUrl(annotatedUrl);
          setTrackState(TRACKING_STATES.STABLE);
          mpSuccess = true;
        }
      });
      await pose.initialize();
      await pose.send({ image: img });
      await new Promise(res => setTimeout(res, 1200));
    } catch(e) {
      console.error("Upload photo MediaPipe:", e);
      mpError = e?.message || "MediaPipe failed to process image";
    }

    // If MediaPipe found nothing, leave a clear message so the panel doesn't look blank
    if (!mpSuccess) {
      setUploadedAnalysis({
        summary: mpError
          ? `Pose detection failed: ${mpError}`
          : "No body landmarks detected in this image. For best results upload a clear full-body photo with even lighting, plain background, and form-fitting clothing.",
        findings: [],
        pelvicTilt: "unknown",
        shoulderDeviation: "unknown",
        kneeDeviation: "unknown",
        spineAlignment: "unknown",
        _error: true
      });
    }
    setUploadAnalysing(false);
  }, [stopCamera, activeView]);

  // ── View change: just switch the view label (no re-analysis — same landmarks apply) ──
  const handleViewChange = useCallback((newView) => {
    setActiveView(newView);
  }, []);

  // ── Tap-to-focus ──────────────────────────────────────────────────────────
  const handleTapFocus = useCallback((x, y) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities?.() || {};
    if (caps.focusMode && track.applyConstraints) {
      track.applyConstraints({ advanced:[{ pointsOfInterest:[{x,y}], focusMode:"single-shot" }] }).catch(()=>{});
    }
  }, []);

  // ── Countdown capture trigger ──────────────────────────────────────────────
  const triggerCountdownCapture = useCallback(() => {
    if (captureCountdown !== null) return;
    let c = countdownSecs;
    setCaptureCountdown(c);
    const t = setInterval(() => {
      c--;
      setCaptureCountdown(c);
      if (c <= 0) {
        clearInterval(t);
        setCaptureCountdown(null);
        // ── Actually take the photo ──────────────────────────────────────
        const video = videoRef.current;
        const overlayCanvas = canvasRef.current;
        if (!video || !videoSize) return;
        const { w, h } = videoSize;
        const cap = document.createElement("canvas");
        cap.width = w; cap.height = h;
        const ctx = cap.getContext("2d");
        // Mirror front camera
        if (facingMode === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
        ctx.drawImage(video, 0, 0, w, h);
        if (facingMode === "user") { ctx.setTransform(1,0,0,1,0,0); }
        // Draw overlay skeleton on top
        if (overlayCanvas && overlayCanvas.width > 0) ctx.drawImage(overlayCanvas, 0, 0, w, h);
        // Timestamp
        const time = new Date().toLocaleString();
        ctx.font = "bold 13px system-ui";
        const label = `${activeView?.toUpperCase()} · ${time}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(6, h-30, tw+14, 24);
        ctx.fillStyle = "#00e5ff"; ctx.fillText(label, 12, h-12);
        const imgUrl = cap.toDataURL("image/jpeg", 0.92);
        setLastCapture({ img: imgUrl, time, view: activeView });

        // ── Save into multi-view bank ──────────────────────────────────────
        if (landmarks) {
          const m = AdvancedMeasurementEngine(landmarks, null);
          const f = ClinicalFindingsEngine(landmarks, activeView, m);
          const rel = ReliabilityEngine(landmarks);
          const s = PostureScoreEngine(m, f, rel);
          setViewCaptures(prev => ({
            ...prev,
            [activeView]: { img: imgUrl, lm: landmarks, measurements: m, findings: f, scoreData: s, time, view: activeView }
          }));
          setShowViewBank(true);
        }
      }
    }, 1000);
  }, [captureCountdown, countdownSecs, videoRef, canvasRef, videoSize, facingMode, activeView]);

  // ── Landmark handler ───────────────────────────────────────────────────────
  const handleLandmarks = useCallback((raw) => {
    const sm = smoother.current(raw);
    setLandmarks(sm);
    if (!sm) {
      if (!lostTimer.current) lostTimer.current = setTimeout(() => { setTrackState(s => s===TRACKING_STATES.STABLE||s===TRACKING_STATES.DETECTING?TRACKING_STATES.LOST:s); lostTimer.current=null; }, 800);
      return;
    }
    if (lostTimer.current) { clearTimeout(lostTimer.current); lostTimer.current = null; }
    const q = computeQuality(sm);
    setTrackState(q.ready ? TRACKING_STATES.STABLE : TRACKING_STATES.DETECTING);
  }, []);

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const up = () => { const v=videoRef.current; if(v&&v.videoWidth) setVideoSize({w:v.videoWidth,h:v.videoHeight}); };
    window.addEventListener("resize", up);
    screen.orientation?.addEventListener?.("change", up);
    return () => { window.removeEventListener("resize", up); screen.orientation?.removeEventListener?.("change", up); };
  }, [isActive]);

  useEffect(() => { return () => stopCamera(); }, []);

  const showGuide = trackState===TRACKING_STATES.CALIBRATING || trackState===TRACKING_STATES.DETECTING;

  return (
    <div>
      <style>{`
        @keyframes pcPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes tapFocus{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}
        @keyframes cdPop{0%{transform:scale(1.4);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,rgba(0,229,255,0.07),rgba(127,90,240,0.07))", border:"1px solid rgba(0,229,255,0.16)", borderRadius:14, padding:"13px 16px", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:7 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#00e5ff1a,#7f5af01a)", border:"1px solid rgba(0,229,255,0.28)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem" }}>🎥</div>
          <div>
            <div style={{ fontWeight:800, fontSize:"0.93rem", color:"#00e5ff" }}>Posture Assessment Camera</div>
            <div style={{ fontSize:"0.63rem", color:"#7e6a9a" }}>MediaPipe BlazePose · HD Capture · Physiotherapy Grade</div>
          </div>
          {/* Video resolution badge */}
          {videoSize && (
            <div style={{ marginLeft:"auto", fontSize:"0.58rem", padding:"2px 7px", borderRadius:7, background:"rgba(0,229,255,0.08)", color:"#00e5ff", border:"1px solid rgba(0,229,255,0.2)", fontWeight:700 }}>
              {videoSize.w}×{videoSize.h}
            </div>
          )}
        </div>
        <TrackingStateBar state={trackState} quality={quality.score}/>
      </div>

      {/* Lighting warning */}
      {lightingWarn && isActive && (
        <div style={{ background:"rgba(255,179,0,0.1)", border:"1px solid rgba(255,179,0,0.3)", borderRadius:9, padding:"8px 12px", marginBottom:8, fontSize:"0.72rem", color:"#ffb300", display:"flex", gap:8, fontWeight:600 }}>
          💡 Poor lighting detected — improve ambient light for better tracking accuracy
        </div>
      )}

      {/* Photo upload mode */}
      {activeView==="photo" && <PhotoUploadAnalyzer/>}

      {/* Setup guide — pre-camera */}
      {!isActive && activeView!=="photo" && <CameraPositionGuide/>}

      {/* Permission error */}
      {activeView!=="photo" && permError && (
        <div style={{ background:"rgba(255,77,109,0.09)", border:"1px solid rgba(255,77,109,0.3)", borderRadius:10, padding:"11px 14px", marginBottom:10, fontSize:"0.77rem", color:"#ff4d6d", display:"flex", gap:8 }}>
          🚫 {permError}
        </div>
      )}

      {/* Camera + overlays */}
      {activeView!=="photo" && (
      <div style={{ position:"relative" }}>
        <CameraView videoRef={videoRef} canvasRef={canvasRef} isActive={isActive} facingMode={facingMode} onTapFocus={handleTapFocus} zoom={zoom}>
          <BodyAlignmentGuide show={showGuide || (isActive && !quality.ready)} ready={quality.ready}/>
          <CalibrationSystem state={trackState} countdown={countdown} quality={quality}/>

          {/* Distance hint badge */}
          {quality.distanceHint && isActive && (
            <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", background:"rgba(6,9,15,0.82)", border:"1px solid rgba(255,179,0,0.4)", borderRadius:20, padding:"5px 14px", fontSize:"0.72rem", color:"#ffb300", fontWeight:700, whiteSpace:"nowrap", zIndex:15 }}>
              {quality.distanceHint==="back" ? "⬅ Step back" : "➡ Step closer"}
            </div>
          )}

          {/* Stability indicator */}
          {isActive && trackState===TRACKING_STATES.STABLE && (
            <div style={{ position:"absolute", top:10, right:10, background:"rgba(6,9,15,0.82)", borderRadius:9, padding:"4px 9px", fontSize:"0.62rem", fontWeight:700, color:isStable?"#00c97a":"#ffb300", border:`1px solid ${isStable?"rgba(0,201,122,0.35)":"rgba(255,179,0,0.35)"}`, zIndex:15 }}>
              {isStable ? "✓ Stable" : "○ Stabilising…"}
            </div>
          )}

          {/* Active view badge */}
          {isActive && (
            <div style={{ position:"absolute", top:10, left:10, background:"rgba(6,9,15,0.82)", borderRadius:9, padding:"4px 9px", fontSize:"0.62rem", fontWeight:700, color:"#7f5af0", border:"1px solid rgba(127,90,240,0.35)", zIndex:15, textTransform:"capitalize" }}>
              {activeView} View
            </div>
          )}

          {/* Countdown capture overlay */}
          {captureCountdown !== null && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(6,9,15,0.4)", zIndex:25 }}>
              <div style={{ width:90, height:90, borderRadius:"50%", border:"3px solid #00e5ff", background:"rgba(6,9,15,0.85)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.8rem", fontWeight:900, color:"#00e5ff", boxShadow:"0 0 30px rgba(0,229,255,0.5)", animation:"cdPop 0.3s ease-out" }}>
                {captureCountdown || "📸"}
              </div>
            </div>
          )}

          {/* Floating capture button — always visible when camera active */}
          {isActive && activeView!=="photo" && (
            <button onClick={triggerCountdownCapture} disabled={captureCountdown!==null}
              style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)", width:64, height:64, borderRadius:"50%",
                background: captureCountdown!==null ? "rgba(0,229,255,0.3)" : "linear-gradient(135deg,#00e5ff,#7f5af0)",
                border:"4px solid rgba(255,255,255,0.25)", cursor:captureCountdown!==null?"not-allowed":"pointer",
                fontSize:"1.5rem", display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 20px rgba(0,229,255,0.4)", zIndex:20, flexDirection:"column", gap:2 }}>
              {captureCountdown!==null ? (
                <span style={{fontSize:"1.2rem",fontWeight:900,color:"#000"}}>{captureCountdown}</span>
              ) : "📸"}
            </button>
          )}
        </CameraView>
      </div>
      )}
      {/* Skeleton */}
      {isActive && activeView!=="photo" && <SkeletonRenderer canvasRef={canvasRef} landmarks={landmarks} videoSize={videoSize} trackingState={trackState} activeView={activeView}/>}

      {/* Pose engine */}
      <PoseTracker videoRef={videoRef} active={poseActive} onLandmarks={handleLandmarks}/>

      {/* Controls */}
      <CameraControls
        isActive={isActive} isLoading={isLoading}
        onStart={(mode)=>startCamera(mode||facingMode)} onStop={stopCamera}
        onFlip={flipCamera} onRecalibrate={runCalibration}
        facingMode={facingMode} canRecalibrate={isActive&&trackState!==TRACKING_STATES.CALIBRATING}
        zoom={zoom} onZoom={setZoom}
        countdownSecs={countdownSecs} onCountdownChange={setCountdownSecs}
        burstMode={burstMode} onBurstToggle={()=>setBurstMode(b=>!b)}
        activeView={activeView} onViewChange={handleViewChange}
        onUploadPhoto={handleUploadPhoto}
      />

      {/* Warnings */}
      {isActive && quality.warnings.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:8 }}>
          {quality.warnings.map((w,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:`${w.color}15`, border:`1px solid ${w.color}35`, borderRadius:8, fontSize:"0.73rem", fontWeight:600, color:w.color }}>
              <span>{w.icon}</span><span>{w.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Readiness / stability badge */}
      {isActive && trackState!==TRACKING_STATES.CALIBRATING && (
        <div style={{ marginTop:8, padding:"7px 12px", background:quality.ready?"rgba(0,201,122,0.08)":"rgba(255,179,0,0.08)", border:`1px solid ${quality.ready?"rgba(0,201,122,0.25)":"rgba(255,179,0,0.2)"}`, borderRadius:8, fontSize:"0.72rem", fontWeight:700, color:quality.ready?"#00c97a":"#ffb300", display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
          <span>{quality.ready ? (isStable?"✓":"○") : "⚠"}</span>
          <span>{quality.ready ? (isStable ? "Body stable — tap 📸 or use countdown capture" : "Full body detected — hold still for stable capture") : "Position body: head · shoulders · hips · feet all visible"}</span>
          {quality.ready && isStable && (
            <span style={{ marginLeft:"auto", fontSize:"0.62rem", padding:"2px 8px", borderRadius:7, background:"rgba(0,229,255,0.1)", color:"#00e5ff", border:"1px solid rgba(0,229,255,0.25)" }}>Ready for {activeView}</span>
          )}
        </div>
      )}

      {/* ── MULTI-VIEW CAPTURE BANK ── */}
      {showViewBank && Object.values(viewCaptures).some(v => v !== null) && (
        <div style={{marginTop:10,background:"#0a0a14",border:"1px solid rgba(0,229,255,0.2)",borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid rgba(0,229,255,0.15)",background:"rgba(0,229,255,0.04)"}}>
            <div style={{fontSize:"0.62rem",fontWeight:800,color:"#00e5ff",letterSpacing:"0.5px"}}>
              📸 View Capture Bank — {Object.values(viewCaptures).filter(v=>v).length}/4 Views
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setShowComparison(s=>!s)}
                style={{padding:"4px 9px",background:"rgba(127,90,240,0.12)",border:"1px solid rgba(127,90,240,0.3)",borderRadius:7,color:"#7f5af0",fontSize:"0.6rem",fontWeight:700,cursor:"pointer"}}>
                {showComparison?"▲ Hide":"⇄ Compare"}
              </button>
              <button onClick={()=>{setViewCaptures({anterior:null,posterior:null,left:null,right:null});setShowViewBank(false);setLastCapture(null);setShowComparison(false);}}
                style={{padding:"4px 9px",background:"rgba(255,77,109,0.08)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:7,color:"#ff4d6d",fontSize:"0.6rem",fontWeight:700,cursor:"pointer"}}>✕ Clear All</button>
            </div>
          </div>

          {/* 4-view grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:"rgba(0,229,255,0.05)"}}>
            {["anterior","posterior","left","right"].map(v => {
              const cap = viewCaptures[v];
              const labels = {anterior:"Front",posterior:"Back",left:"L Side",right:"R Side"};
              const icons  = {anterior:"⬆",posterior:"⬇",left:"◀",right:"▶"};
              const col    = cap?.scoreData?.score >= 78 ? "#00c97a" : cap?.scoreData?.score >= 62 ? "#ffb300" : "#ff4d6d";
              return (
                <div key={v} style={{position:"relative",background:"#0d0d1a",minHeight:90}}>
                  {cap ? (
                    <>
                      <img src={cap.img} alt={v} style={{width:"100%",display:"block",maxHeight:160,objectFit:"cover"}}/>
                      <div style={{position:"absolute",top:0,left:0,right:0,padding:"4px 6px",background:"rgba(0,0,0,0.55)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:"0.6rem",fontWeight:800,color:"#00e5ff"}}>{icons[v]} {labels[v].toUpperCase()}</span>
                        {cap.scoreData?.score && <span style={{fontSize:"0.65rem",fontWeight:900,color:col}}>{cap.scoreData?.score}</span>}
                      </div>
                      <div style={{padding:"4px 6px",borderTop:"1px solid rgba(0,229,255,0.1)"}}>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:"0.55rem",padding:"1px 5px",borderRadius:5,background:"rgba(255,77,109,0.15)",color:"#ff4d6d",fontWeight:700}}>
                            🔴 {cap.findings.filter(f=>f.severity==="high").length} HIGH
                          </span>
                          <span style={{fontSize:"0.55rem",padding:"1px 5px",borderRadius:5,background:"rgba(255,179,0,0.15)",color:"#ffb300",fontWeight:700}}>
                            🟡 {cap.findings.filter(f=>f.severity!=="high").length} MOD
                          </span>
                          {!baselineCapture && (
                            <button onClick={()=>setBaselineCapture({...cap,date:new Date().toLocaleDateString("en-AU",{day:"2-digit",month:"short",year:"numeric"})})}
                              style={{fontSize:"0.55rem",padding:"1px 6px",borderRadius:5,background:"rgba(0,201,122,0.12)",border:"1px solid rgba(0,201,122,0.3)",color:"#00c97a",cursor:"pointer",fontWeight:700,marginLeft:"auto"}}>
                              📌 Set Baseline
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:90,gap:4,opacity:0.4}}>
                      <span style={{fontSize:"1.4rem"}}>{icons[v]}</span>
                      <span style={{fontSize:"0.6rem",color:"#6b8399",fontWeight:600}}>{labels[v]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Before/After comparison */}
          {showComparison && baselineCapture && (
            <div style={{padding:"10px 12px",borderTop:"1px solid rgba(127,90,240,0.2)",background:"rgba(127,90,240,0.03)"}}>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>⇄ Before / After Comparison</div>
              {["anterior","posterior","left","right"].map(v => {
                const current = viewCaptures[v];
                const isBaseline = baselineCapture.view === v;
                if (!current || !isBaseline) return null;
                const bScore = baselineCapture.scoreData?.score ?? null;
                const cScore = current.scoreData?.score ?? null;
                const delta  = bScore !== null && cScore !== null ? cScore - bScore : null;
                const deltaCol = delta === null ? "#6b8399" : delta >= 0 ? "#00c97a" : "#ff4d6d";
                return (
                  <div key={v} style={{marginBottom:10}}>
                    <div style={{fontSize:"0.65rem",fontWeight:700,color:"#00e5ff",marginBottom:6}}>{v.toUpperCase()} VIEW</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
                      <div style={{textAlign:"center"}}>
                        <img src={baselineCapture.img} alt="baseline" style={{width:"100%",borderRadius:7,border:"2px solid rgba(127,90,240,0.4)"}}/>
                        <div style={{fontSize:"0.6rem",color:"#7f5af0",marginTop:3,fontWeight:700}}>BASELINE · {baselineCapture.date}</div>
                        {bScore && <div style={{fontSize:"1.1rem",fontWeight:900,color:"#7f5af0"}}>{bScore}</div>}
                      </div>
                      <div style={{textAlign:"center",padding:"0 4px"}}>
                        {delta !== null && (
                          <div style={{fontSize:"1.2rem",fontWeight:900,color:deltaCol}}>
                            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}
                          </div>
                        )}
                        <div style={{fontSize:"0.55rem",color:"#6b8399",marginTop:2}}>pts</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <img src={current.img} alt="current" style={{width:"100%",borderRadius:7,border:"2px solid rgba(0,229,255,0.4)"}}/>
                        <div style={{fontSize:"0.6rem",color:"#00e5ff",marginTop:3,fontWeight:700}}>CURRENT · {current.time}</div>
                        {cScore && <div style={{fontSize:"1.1rem",fontWeight:900,color:"#00e5ff"}}>{cScore}</div>}
                      </div>
                    </div>
                    {/* Finding delta */}
                    {(() => {
                      const bHigh = (baselineCapture.findings||[]).filter(f=>f.severity==="high").length;
                      const cHigh = current.findings.filter(f=>f.severity==="high").length;
                      const dHigh = bHigh - cHigh;
                      return (
                        <div style={{marginTop:6,padding:"5px 8px",borderRadius:7,background:"rgba(0,0,0,0.2)",fontSize:"0.65rem",color:"#c9b8e8",display:"flex",gap:10,flexWrap:"wrap"}}>
                          <span>High priority: {bHigh} → {cHigh} <span style={{color:dHigh>0?"#00c97a":dHigh<0?"#ff4d6d":"#6b8399",fontWeight:700}}>{dHigh>0?`(−${dHigh} resolved)`:dHigh<0?`(+${Math.abs(dHigh)} new)`:"(unchanged)"}</span></span>
                          <span>Total findings: {(baselineCapture.findings||[]).length} → {current.findings.length}</span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {!["anterior","posterior","left","right"].some(v => viewCaptures[v] && baselineCapture.view === v) && (
                <div style={{fontSize:"0.7rem",color:"#6b8399",textAlign:"center",padding:"8px"}}>
                  Capture the same view as your baseline ({baselineCapture.view}) to compare
                </div>
              )}
              <button onClick={()=>setBaselineCapture(null)} style={{marginTop:6,padding:"5px 10px",background:"rgba(255,77,109,0.08)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:7,color:"#ff4d6d",fontSize:"0.62rem",cursor:"pointer",fontWeight:600}}>
                ✕ Clear Baseline
              </button>
            </div>
          )}

          {/* Multi-view PDF export */}
          {Object.values(viewCaptures).filter(v=>v).length >= 2 && (
            <div style={{padding:"8px 12px",borderTop:"1px solid rgba(0,229,255,0.1)",background:"rgba(0,229,255,0.02)"}}>
              <button onClick={generateMultiViewPDF}
                style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#00e5ff,#7f5af0)",border:"none",borderRadius:9,color:"#000",fontWeight:800,fontSize:"0.78rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                📄 Export Multi-View Postural Report ({Object.values(viewCaptures).filter(v=>v).length} views)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── UPLOADED PHOTO PREVIEW WITH ANALYSIS GRID ── */}
      {uploadedPhotoUrl && (
        <div style={{marginTop:10,background:"#1a1a2e",border:"1px solid rgba(127,90,240,0.3)",borderRadius:12,overflow:"hidden",minHeight:220}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",borderBottom:"1px solid rgba(127,90,240,0.2)"}}>
            <div style={{fontSize:"0.62rem",fontWeight:800,color:"#7f5af0"}}>
              📷 Uploaded Photo — {activeView.charAt(0).toUpperCase()+activeView.slice(1)} View {uploadedPhotoLm ? "— Pose Grid Applied" : uploadAnalysing ? "— Analysing…" : uploadedAnalysis?._error ? "— Detection Failed" : ""}
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{ setUploadedPhotoUrl(null); setUploadedPhotoLm(null); setUploadedAnalysis(null); setUploadAnalysing(false); if(uploadObjRef.current){URL.revokeObjectURL(uploadObjRef.current);uploadObjRef.current=null;} }}
                style={{padding:"4px 10px",background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.25)",borderRadius:7,color:"#ff4d6d",fontSize:"0.62rem",fontWeight:700,cursor:"pointer"}}>✕ Clear</button>
            </div>
          </div>
          {/* Photo display with live canvas overlay — works even when toDataURL fails on mobile */}
          <div style={{position:"relative",width:"100%",background:"#1a1a2e"}}>
            <img src={uploadedPhotoUrl} alt="Uploaded posture photo"
              id="posture-upload-img"
              style={{width:"100%",display:"block",maxHeight:500,objectFit:"contain",background:"#1a1a2e"}}/>
            {uploadedPhotoLm && (
              <CanvasOverlayOnImage
                photoUrl={uploadedPhotoUrl}
                landmarks={uploadedPhotoLm}
                view={activeView}
              />
            )}
          </div>
          {/* Analysing spinner */}
          {uploadAnalysing && (
            <div style={{padding:"10px 12px",borderTop:"1px solid rgba(127,90,240,0.15)",display:"flex",alignItems:"center",gap:8,color:"#7f5af0",fontSize:"0.73rem",fontWeight:600}}>
              <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Detecting pose landmarks…
            </div>
          )}
          {/* MediaPipe findings (if landmarks detected) */}
          {uploadedPhotoLm && (() => {
            try {
              const m = AdvancedMeasurementEngine ? AdvancedMeasurementEngine(uploadedPhotoLm, null) : {};
              const rel = ReliabilityEngine ? ReliabilityEngine(uploadedPhotoLm) : { blocked: false };
              if (rel.blocked) return (
                <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,77,109,0.2)",background:"rgba(255,77,109,0.06)"}}>
                  <div style={{fontSize:"0.72rem",color:"#ff4d6d",fontWeight:700}}>🚫 Image quality insufficient</div>
                  <div style={{fontSize:"0.65rem",color:"rgba(255,77,109,0.75)",marginTop:4,lineHeight:1.5}}>
                    {(rel.warnings[0]?.text)||"Improve lighting, ensure full body is visible, and use form-fitting clothing."}
                  </div>
                </div>
              );
              const findings = ClinicalFindingsEngine ? ClinicalFindingsEngine(uploadedPhotoLm, activeView, m) : [];
              if (!findings.length) return (
                <div style={{padding:"10px 12px",borderTop:"1px solid rgba(0,201,122,0.2)",color:"#00c97a",fontSize:"0.72rem",fontWeight:600}}>
                  ✅ Pose detected — no significant postural findings flagged for the {activeView} view.
                </div>
              );
              return (
                <div style={{padding:"10px 12px",borderTop:"1px solid rgba(127,90,240,0.15)"}}>
                  <div style={{fontSize:"0.6rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📊 Posture Findings</div>
                  {findings.map((f,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 10px",marginBottom:5,
                      background:f.severity==="high"?"rgba(255,77,109,0.08)":"rgba(255,179,0,0.07)",
                      border:`1px solid ${f.severity==="high"?"rgba(255,77,109,0.3)":"rgba(255,179,0,0.25)"}`,borderRadius:9}}>
                      <span style={{fontSize:"1rem",flexShrink:0,marginTop:1}}>{f.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                          <span style={{fontWeight:800,fontSize:"0.74rem",color:f.severity==="high"?"#ff4d6d":"#ffb300"}}>{f.region}</span>
                          <span style={{fontSize:"0.58rem",padding:"1px 6px",borderRadius:6,background:f.severity==="high"?"rgba(255,77,109,0.15)":"rgba(255,179,0,0.15)",
                            color:f.severity==="high"?"#ff4d6d":"#ffb300",fontWeight:700,textTransform:"uppercase"}}>{f.severity}</span>
                          {f.icd&&<span style={{fontSize:"0.55rem",color:"rgba(127,90,240,0.6)",marginLeft:"auto"}}>{f.icd}</span>}
                        </div>
                        <div style={{fontSize:"0.76rem",color:"#e2d9f3",marginBottom:3,lineHeight:1.4}}>{f.text}</div>
                        {f.correction&&<div style={{fontSize:"0.67rem",color:"#7e6a9a",lineHeight:1.4,borderTop:"1px solid rgba(127,90,240,0.1)",paddingTop:3,marginTop:3}}>
                          <span style={{color:"#7f5af0",fontWeight:700}}>Rx: </span>{f.correction}
                        </div>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            } catch (err) {
              console.error("Posture findings render failed:", err);
              return (
                <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,77,109,0.2)",color:"#ff4d6d",fontSize:"0.72rem",fontWeight:600}}>
                  ⚠ Findings could not be rendered: {err?.message || "engine error"}. Photo is still visible above.
                </div>
              );
            }
          })()}
          {/* No-detection / error message — shown when MediaPipe couldn't find landmarks */}
          {!uploadedPhotoLm && !uploadAnalysing && uploadedAnalysis && (
            <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,179,0,0.2)",background:"rgba(255,179,0,0.05)"}}>
              <div style={{fontSize:"0.7rem",fontWeight:800,color:"#ffb300",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>
                ⚠ Pose Not Detected
              </div>
              <div style={{fontSize:"0.78rem",color:"#e2d9f3",lineHeight:1.55,marginBottom:8}}>
                {uploadedAnalysis.summary}
              </div>
              <div style={{fontSize:"0.7rem",color:"#c9b8e8",lineHeight:1.6,opacity:0.85}}>
                <strong style={{color:"#7f5af0"}}>Tips for a successful detection:</strong>
                <ul style={{margin:"4px 0 0 16px",padding:0}}>
                  <li>Full body visible from head to feet</li>
                  <li>Plain, contrasting background</li>
                  <li>Even, bright lighting (no harsh shadows)</li>
                  <li>Form-fitting clothing (avoid baggy garments)</li>
                  <li>Subject facing the camera squarely for the selected view</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── PDF REPORT GENERATOR — only when MediaPipe detected landmarks ── */}
          {uploadedPhotoLm && !uploadAnalysing && (
            <div style={{padding:"12px",borderTop:"1px solid rgba(127,90,240,0.2)",background:"rgba(127,90,240,0.04)"}}>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
                📄 Generate PDF Report
              </div>
              <div style={{display:"flex",gap:7,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.58rem",color:"rgba(200,185,230,0.7)",marginBottom:3,fontWeight:600}}>Patient Name</div>
                  <input
                    type="text" placeholder="e.g. John Smith"
                    value={reportPatient} onChange={e=>setReportPatient(e.target.value)}
                    style={{width:"100%",padding:"8px 10px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(127,90,240,0.3)",borderRadius:8,color:"#e2d9f3",fontSize:"0.75rem",outline:"none",boxSizing:"border-box"}}
                  />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.58rem",color:"rgba(200,185,230,0.7)",marginBottom:3,fontWeight:600}}>Clinician Name</div>
                  <input
                    type="text" placeholder="e.g. Dr. Jones"
                    value={reportClinician} onChange={e=>setReportClinician(e.target.value)}
                    style={{width:"100%",padding:"8px 10px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(127,90,240,0.3)",borderRadius:8,color:"#e2d9f3",fontSize:"0.75rem",outline:"none",boxSizing:"border-box"}}
                  />
                </div>
              </div>

              {/* Save to patient record button — only shown when patient is loaded */}
              {set && (
                <button
                  onClick={savePostureToRecord}
                  style={{
                    width:"100%",padding:"10px",marginBottom:7,
                    background:savedToRecord?"rgba(0,201,122,0.15)":"rgba(0,201,122,0.08)",
                    border:`1px solid ${savedToRecord?"rgba(0,201,122,0.6)":"rgba(0,201,122,0.25)"}`,
                    borderRadius:9,color:savedToRecord?"#00c97a":"rgba(0,201,122,0.8)",
                    fontWeight:700,fontSize:"0.78rem",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                    transition:"all 0.3s",
                  }}>
                  {savedToRecord ? "✅  Saved to Patient Record" : "💾  Save to Patient Record"}
                </button>
              )}
              {!set && (
                <div style={{padding:"7px 10px",marginBottom:7,borderRadius:8,background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",fontSize:"0.67rem",color:"rgba(255,179,0,0.8)",textAlign:"center"}}>
                  ⚠ No patient loaded — create or load a patient to save this assessment
                </div>
              )}

              <button
                onClick={generatePostureReportPDF}
                disabled={reportExporting}
                style={{
                  width:"100%",padding:"12px",
                  background:reportExporting?"rgba(127,90,240,0.2)":"linear-gradient(135deg,#7f5af0,#00e5ff)",
                  border:"none",borderRadius:10,
                  color:reportExporting?"#7f5af0":"#000",
                  fontWeight:800,fontSize:"0.82rem",cursor:reportExporting?"not-allowed":"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  letterSpacing:"0.3px",
                }}>
                {reportExporting ? "⏳  Generating Report…" : "📄  Export Postural Assessment PDF"}
              </button>
              <div style={{fontSize:"0.6rem",color:"rgba(127,90,240,0.55)",textAlign:"center",marginTop:6,lineHeight:1.5}}>
                Opens print dialog → <strong style={{color:"rgba(127,90,240,0.8)"}}>Save as PDF</strong> · Includes: photo · score · ASIS/PSIS · knee · shoulder · spine · measurements · Rx
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual capture button — always visible when camera active */}
      {isActive && activeView!=="photo" && (
        <div style={{marginTop:8,display:"flex",gap:8}}>
          <button onClick={triggerCountdownCapture} disabled={captureCountdown!==null}
            style={{flex:1,padding:"12px",background:captureCountdown!==null?"rgba(0,229,255,0.08)":"linear-gradient(135deg,#00e5ff,#7f5af0)",border:"none",borderRadius:10,color:captureCountdown!==null?"#00e5ff":"#000",fontWeight:800,fontSize:"0.82rem",cursor:captureCountdown!==null?"not-allowed":"pointer"}}>
            {captureCountdown!==null ? `📸 Capturing in ${captureCountdown}s…` : `📸 Capture Photo (${countdownSecs}s)`}
          </button>
        </div>
      )}

      {/* Joint confidence panel */}
      {trackState===TRACKING_STATES.STABLE && landmarks && (
        <div style={{ marginTop:10, background:"#ffffff", border:"1px solid #d8cce8", borderRadius:10, padding:"9px 13px" }}>
          <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#7e6a9a", textTransform:"uppercase", letterSpacing:"1px", marginBottom:7 }}>Joint Confidence</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {Object.entries(KEY_JOINTS).map(([idx, name]) => {
              const v = landmarks[Number(idx)]?.visibility || 0;
              const col = v>0.7?"#00c97a":v>0.4?"#ffb300":"#ff4d6d";
              return <div key={idx} style={{ fontSize:"0.62rem", padding:"2px 7px", borderRadius:7, background:`${col}14`, color:col, border:`1px solid ${col}28`, fontWeight:600 }}>{name} {Math.round(v*100)}%</div>;
            })}
          </div>
        </div>
      )}

      {/* ── Multi-View Analysis Engine ── */}
      {trackState===TRACKING_STATES.STABLE && landmarks && quality.ready && (
        <PostureLiveAnalysis landmarks={landmarks} canvasRef={canvasRef} videoSize={videoSize}/>
      )}

      {/* Footer */}
      <div style={{ marginTop:10, fontSize:"0.62rem", color:"#7e6a9a", padding:"7px 11px", background:"#ffffff", borderRadius:8, lineHeight:1.5, border:"1px solid #d8cce8" }}>
        <strong style={{ color:"#1a1025" }}>Privacy:</strong> All processing runs locally in your browser. No video is uploaded or stored.
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════
// NEW ADVANCED POSTURE ANALYSIS ENGINE — integrated from PostureAnalysisModule
// ════════════════════════════════════════════════════════════════════════

//  • Spinal curvature estimation (cervical/thoracic/lumbar)
//  • Scoliosis Cobb angle estimation from posterior view
//  • Temporal trend tracking (session history + progress charting)
//  • Burst capture + before/after comparison
//  • Export: annotated image + PDF-ready JSON report
//  • Offline capable — no API cost, runs entirely in browser
// ════════════════════════════════════════════════════════════════════════════

// ─── Colours ─────────────────────────────────────────────────────────────────
const PC = {
  bg:"#faf8fc", surface:"#ffffff", s2:"#f5f0fb", s3:"#ede7f6",
  border:"#d8cce8", accent:"#7c3aed", a2:"#9333ea", a3:"#059669",
  text:"#1a1025", muted:"#7e6a9a", red:"#dc2626", yellow:"#b45309",
  green:"#059669", purple:"#9333ea", orange:"#f97316",
};

// ─── Additional Math Utilities ───────────────────────────────────────────────
function vec3Angle(a, b, c) {
  if (!a || !b || !c) return null;
  const ab = { x:a.x-b.x, y:a.y-b.y }, cb = { x:c.x-b.x, y:c.y-b.y };
  const dot = ab.x*cb.x + ab.y*cb.y;
  const mag = Math.sqrt((ab.x**2+ab.y**2)*(cb.x**2+cb.y**2));
  if (mag === 0) return null;
  return Math.round(Math.acos(Math.min(1, Math.max(-1, dot/mag))) * 1800 / Math.PI) / 10;
}
function dist2D(a, b) {
  if (!a || !b) return null;
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));

// ─── MEDIAPIPE LANDMARK INDICES ───────────────────────────────────────────────
// 0=nose, 2=L_eye, 5=R_eye, 7=L_ear, 8=R_ear
// 11=L_shoulder, 12=R_shoulder, 13=L_elbow, 14=R_elbow
// 15=L_wrist, 16=R_wrist, 23=L_hip, 24=R_hip
// 25=L_knee, 26=R_knee, 27=L_ankle, 28=R_ankle
// 29=L_heel, 30=R_heel, 31=L_foot_index, 32=R_foot_index

// ─── ADVANCED MEASUREMENT ENGINE ─────────────────────────────────────────────
// Clinical norms based on: Kendall et al. (2005), Yip et al. (2008),
// Levangie & Norkin (2011), Magee (2014), Singla & Veqar (2014)
// ─────────────────────────────────────────────────────────────────────────────
const CLINICAL_NORMS = {
  cvaAngle:          { normal:[55,90],   mild:[49,55],   severe:[0,49],   unit:"°", label:"CVA (Craniovertebral Angle)", ref:"Yip et al. (2008): >55° normal. 49–55° mild FHP. <49° pathological — cervicogenic headache risk." },
  thoracicAngle:     { normal:[20,45],   mild:[45,55],   severe:[55,90],  unit:"°", label:"Thoracic Kyphosis (T1–T12)", ref:"Normal Cobb equivalent 20–45°. >50° hyperkyphosis. Assessed lateral view only." },
  lordosisAngle:     { normal:[40,60],   mild:[60,70],   severe:[70,90],  unit:"°", label:"Lumbar Lordosis (L1–S1)",   ref:"Normal 40–60°. >70° hyperlordosis. <30° flat-back. Assessed lateral view only." },
  shoulderAngle:     { normal:[0,3],     mild:[3,7],     severe:[7,30],   unit:"°", label:"Shoulder Tilt (bilateral)", ref:"<3° within normal variation. 3–7° mild asymmetry. >7° refer for LLD/scoliosis screen." },
  pelvisAngle:       { normal:[0,3],     mild:[3,7],     severe:[7,30],   unit:"°", label:"Pelvic Obliquity",          ref:"<3° normal. >7° — screen for LLD, SIJ dysfunction, hip asymmetry." },
  kneeValgus:        { normal:[0,5],     mild:[5,10],    severe:[10,30],  unit:"°", label:"Knee Valgus/Varus",         ref:"<5° normal Q-angle variation. >10° — glute med inhibition, foot pronation driver." },
  cobbEstimate:      { normal:[0,5],     mild:[5,10],    severe:[10,90],  unit:"°", label:"Scoliosis Screen (Cobb est.)", ref:"<5° normal. 5–10° monitor with repeat. >10° refer for standing X-ray (true Cobb)." },
  weightBearingShift:{ normal:[0,3],     mild:[3,6],     severe:[6,30],   unit:"%", label:"Weight-Bearing Asymmetry",  ref:"<3% acceptable. >6% — assess LLD, pain-avoidance posture, hip OA." },
  cogDeviation:      { normal:[0,4],     mild:[4,7],     severe:[7,30],   unit:"%", label:"Centre of Gravity Deviation", ref:"<4% normal. >7% global postural collapse — multi-system retraining needed." },
  leftKneeDev:       { normal:[-5,5],    mild:[-12,-5],  severe:[-30,-12],unit:"°", label:"Knee Hyperextension (Genu Recurvatum)", ref:">5° increases posterior capsule & ACL load. >10° — Beighton hypermobility score." },
  rightKneeDev:      { normal:[-5,5],    mild:[-12,-5],  severe:[-30,-12],unit:"°", label:"Knee Hyperextension (Genu Recurvatum)", ref:">5° increases posterior capsule & ACL load. >10° — Beighton hypermobility score." },
};

// Cervical compressive load (Hansraj 2014 model: 4.5kg neutral + ~2.7kg/2.5cm FHP)
const CERVICAL_LOAD_KG = (fhpCm) => fhpCm !== null && fhpCm > 0 ? r1(4.5 + fhpCm * 1.08) : null;

// ── LANDMARK CONFIDENCE GUARD ─────────────────────────────────────────────────
// Returns null for any measurement where key landmarks are below the
// minimum confidence threshold. This prevents false findings from poor images.
// MIN_VIS = 0.45 (defined at top of file)

function AdvancedMeasurementEngine(lm, calibration=null) {
  // calibration: { pixPerCm, frameHeightPx, patientHeightCm }
  if (!lm || lm.length < 33) return {};
  const g    = i => lm[i];
  // Strict visibility threshold — landmark must be >= MIN_VIS to be used
  const V    = i => (lm[i]?.visibility||0) >= MIN_VIS;
  // Confidence-weighted value: returns value only if BOTH landmarks meet threshold
  const Vboth = (...idxs) => idxs.every(i => V(i));
  const toCm = (normDelta) => calibration?.pixPerCm && calibration?.frameHeightPx
    ? r1((normDelta * calibration.frameHeightPx) / calibration.pixPerCm) : null;

  // ── Confidence-gated landmark midpoints ───────────────────────────────────
  // Only compute midpoints when BOTH landmarks are above threshold
  const shMid    = Vboth(11,12) ? mid(g(11), g(12)) : null;
  const hipMid   = Vboth(23,24) ? mid(g(23), g(24)) : null;
  const kneeMid  = Vboth(25,26) ? mid(g(25), g(26)) : null;
  const ankleMid = Vboth(27,28) ? mid(g(27), g(28)) : null;
  const footMid  = Vboth(31,32) ? mid(g(31), g(32)) : null;
  const heelMid  = Vboth(29,30) ? mid(g(29), g(30)) : null;
  const earMid   = Vboth(7,8)   ? mid(g(7),  g(8))  : null;
  const eyeMid   = Vboth(2,5)   ? mid(g(2),  g(5))  : null;

  // ── Z-depth availability ───────────────────────────────────────────────────
  // MediaPipe provides normalised Z relative to hip midpoint.
  // Only trust Z when the delta is meaningful (> 0.002 avoids noise near zero).
  const hasZ  = V(7) && V(11) && Math.abs((g(7).z||0)-(g(11).z||0)) > 0.002;
  const earZ  = hasZ && V(7)  && V(8)  ? ((g(7).z||0)+(g(8).z||0))/2  : null;
  const shZ   = hasZ && V(11) && V(12) ? ((g(11).z||0)+(g(12).z||0))/2 : null;
  const hipZ  = hasZ && V(23) && V(24) ? ((g(23).z||0)+(g(24).z||0))/2 : null;
  const kneeZ = hasZ && V(25) && V(26) ? ((g(25).z||0)+(g(26).z||0))/2 : null;

  // ── FRONTAL PLANE MEASUREMENTS ────────────────────────────────────────────
  // Shoulder tilt: angle of line connecting L shoulder to R shoulder from horizontal
  const shoulderAngle = Vboth(11,12) ? calcAngleDeg(g(12), g(11)) : null;
  // Pelvic obliquity: same method for ASIS landmarks
  const pelvisAngle   = Vboth(23,24) ? calcAngleDeg(g(24), g(23)) : null;
  const kneeAngle     = Vboth(25,26) ? calcAngleDeg(g(26), g(25)) : null;
  const ankleAngle    = Vboth(27,28) ? calcAngleDeg(g(28), g(27)) : null;
  const eyeLevelAngle = Vboth(2,5)   ? calcAngleDeg(g(5),  g(2))  : null;

  // Head lateral offset: nose X minus shoulder midpoint X (normalised to frame width)
  // Expressed as % of frame width — more stable than absolute pixels
  const headLateralOffset = shMid && V(0) ? r1((g(0).x - shMid.x)*100) : null;
  // Trunk lateral shift: shoulder midpoint minus hip midpoint (% of frame width)
  const trunkLateralShift = shMid && hipMid ? r1((shMid.x - hipMid.x)*100) : null;
  const pelvicObliquity   = hipMid && kneeMid ? r1((hipMid.x - kneeMid.x)*100) : null;
  // Weight-bearing shift: hip midpoint vs foot midpoint (% of frame width)
  const weightBearingShift = hipMid && footMid ? r1((hipMid.x - footMid.x)*100) : null;
  const spinalDeviation    = V(0) && hipMid ? r1((g(0).x - hipMid.x)*100) : null;

  const shoulderWidth      = Vboth(11,12) ? Math.abs(g(11).x-g(12).x) : null;
  const hipWidth           = Vboth(23,24) ? Math.abs(g(23).x-g(24).x) : null;
  const trunkRotationProxy = shoulderWidth && hipWidth && hipWidth > 0.01
    ? r1((shoulderWidth/hipWidth - 1)*100) : null;

  // Hip-knee-ankle frontal alignment (Q-angle proxy for valgus/varus)
  // Only valid when all three landmarks are above confidence threshold
  const leftKneeFrontal  = Vboth(23,25,27) ? r1(calcAngleDeg(g(23),g(25))-calcAngleDeg(g(25),g(27))) : null;
  const rightKneeFrontal = Vboth(24,26,28) ? r1(calcAngleDeg(g(24),g(26))-calcAngleDeg(g(26),g(28))) : null;

  // ── CVA: Craniovertebral Angle (Yip et al. 2008) ─────────────────────────
  // Gold standard: lateral photo, line from tragus to C7 spinous process vs horizontal.
  // MediaPipe proxy: angle of ear-to-shoulder vector from vertical.
  // Valid ONLY in lateral view (left or right). Frontal view CVA = null.
  // Using 2D only (X and Y) — Z-based CVA was producing unreliable values.
  let cvaAngle = null;
  if (earMid && shMid) {
    const dx = Math.abs((earMid.x||0)-(shMid.x||0));
    const dy = Math.abs((earMid.y||0)-(shMid.y||0));
    // Only calculate when there is meaningful vertical separation (ear above shoulder)
    // and the landmarks are reliably detected (both ears must be visible for earMid)
    if (dy > 0.04 && earMid.visibility >= 0.35) {
      // CVA = arctan(dy/dx) converted to degrees from vertical
      // When head is directly above shoulder: dx ≈ 0, CVA ≈ 90° (ideal)
      // As head moves forward: dx increases, CVA decreases
      const rawCVA = Math.atan2(dy, dx) * 180 / Math.PI;
      cvaAngle = r1(clamp(rawCVA, 20, 88));
    }
  }

  // ── FORWARD HEAD POSTURE ───────────────────────────────────────────────────
  // Measured as horizontal offset of ear from shoulder midpoint.
  // In lateral view: ear should be directly over shoulder (offset = 0).
  // Expressed in normalised units (% of frame width); converted to cm if calibrated.
  const fhpNorm = shMid && earMid ? r1((earMid.x - shMid.x)*100) : null;
  // When calibration is available, express in real mm (more clinically meaningful)
  const forwardHeadCm = calibration && fhpNorm !== null
    ? toCm(Math.abs(fhpNorm / 100)) : null;
  // Primary measurement: real mm if available, normalised % if not
  const forwardHeadMm = forwardHeadCm !== null ? r1(forwardHeadCm * 10) : fhpNorm;
  // Cervical compressive load (Hansraj model, only if real cm measurement available)
  const cervicalLoadKg = CERVICAL_LOAD_KG(forwardHeadCm);

  // ── THORACIC KYPHOSIS (lateral view only) ─────────────────────────────────
  // Estimated from shoulder-to-hip vector deviation from vertical (proxy method).
  // In a lateral view: sagittal trunk inclination reflects combined C/T/L curves.
  // The thoracic kyphosis estimate is only clinically interpretable in a lateral view.
  // Normal: 20–45° Cobb equivalent. This is a SCREEN, not a Cobb measurement.
  let thoracicAngle = null;
  if (shMid && hipMid) {
    const dx = shMid.x - hipMid.x; // +ve = shoulders anterior to hips
    const dy = Math.abs(shMid.y - hipMid.y);
    if (dy > 0.06) {
      // Base angle from trunk inclination; offset to clinical kyphosis range
      const inclination = Math.atan2(Math.abs(dx), dy) * 180 / Math.PI;
      // Inclination 0° = perfectly vertical trunk → normal kyphosis ~32°
      // Inclination 5° → ~40°, 10° → ~50°, 15° → ~60°
      thoracicAngle = r1(clamp(32 + inclination * 1.8, 20, 80));
    }
  }

  // ── LUMBAR / PELVIC TILT (lateral view) ───────────────────────────────────
  // Lumbar proxy: horizontal offset of hip midpoint from midpoint of knee+heel
  // +ve = hips anterior to knees → anterior pelvic tilt / hyperlordosis
  // -ve = hips posterior → posterior tilt / flat back
  let lumbarProxy = null, lordosisAngle = null;
  if (hipMid && kneeMid && heelMid) {
    const kneeHeelMidX = (kneeMid.x + heelMid.x) / 2;
    lumbarProxy = r1((hipMid.x - kneeHeelMidX) * 100);
  }
  // Lordosis angle from Z-depth only — guard with meaningful Z difference
  if (hasZ && hipZ !== null && kneeZ !== null && Math.abs(hipZ-kneeZ) > 0.005)
    lordosisAngle = r1(clamp(50 + (hipZ-kneeZ)*100*2.2, 15, 85));

  // Pelvic tilt sagittal: alias of lumbarProxy for naming consistency
  const pelvicTiltSagittal = lumbarProxy;
  const anteriorPelvicTiltDeg = lumbarProxy !== null && calibration?.frameHeightPx
    ? r1(clamp(Math.abs(lumbarProxy) * 0.75, 0, 38)) : null;

  // Hip plumb line deviation (lateral view)
  const hipExtensionProxy = hipMid && ankleMid ? r1((hipMid.x - ankleMid.x)*100) : null;

  // ── KNEE ANGLES ────────────────────────────────────────────────────────────
  // vec3Angle computes the interior angle at the middle point (knee)
  // using hip-knee-ankle triangle. 180° = fully extended (neutral).
  // < 180° = flexed; > 180° not geometrically possible in 2D — treated as 180°.
  // Deviation from 180° in hyperextension direction requires lateral view context.
  const leftKneeAngle  = Vboth(23,25,27) ? vec3Angle(g(23),g(25),g(27)) : null;
  const rightKneeAngle = Vboth(24,26,28) ? vec3Angle(g(24),g(26),g(28)) : null;
  const leftKneeDev    = leftKneeAngle  !== null ? r1(leftKneeAngle  - 180) : null; // -ve = hyperext
  const rightKneeDev   = rightKneeAngle !== null ? r1(rightKneeAngle - 180) : null;

  // Ankle dorsiflexion (lateral view)
  const leftAnkleAngle  = Vboth(25,27,31) ? vec3Angle(g(25),g(27),g(31)) : null;
  const rightAnkleAngle = Vboth(26,28,32) ? vec3Angle(g(26),g(28),g(32)) : null;

  // ── BILATERAL SYMMETRY ─────────────────────────────────────────────────────
  // Expressed as Y-coordinate difference × 100 (normalised to frame height)
  const shoulderSymmetry = Vboth(11,12) ? { left:g(11).y, right:g(12).y, diff:r1((g(11).y-g(12).y)*100) } : null;
  const hipSymmetry      = Vboth(23,24) ? { left:g(23).y, right:g(24).y, diff:r1((g(23).y-g(24).y)*100) } : null;
  const kneeSymmetry     = Vboth(25,26) ? { left:g(25).y, right:g(26).y, diff:r1((g(25).y-g(26).y)*100) } : null;
  const ankleSymmetry    = Vboth(27,28) ? { left:g(27).y, right:g(28).y, diff:r1((g(27).y-g(28).y)*100) } : null;

  // Leg length discrepancy proxy (Woerman indirect method — knee height asymmetry)
  // Clinical note: >5mm LLD is clinically significant; proxy only — confirm with tape measure
  const lldProxy = kneeSymmetry ? r1(Math.abs(kneeSymmetry.diff)*1.8) : null;
  const lldSide  = kneeSymmetry ? (kneeSymmetry.diff > 0 ? "Left" : "Right") : null;

  // ── SCAPULAR METRICS ───────────────────────────────────────────────────────
  const scapularAsymm    = Vboth(11,12) ? r1(Math.abs((g(11).y||0)-(g(12).y||0))*100) : null;
  const scapularAbduction= shoulderWidth && hipWidth ? r1((shoulderWidth-hipWidth)*100) : null;

  // ── FOOT PROGRESSION ANGLES ────────────────────────────────────────────────
  // Angle of foot vector (ankle to toe) from vertical — normal: 0–15° toe-out
  const leftFootAngle  = Vboth(31,27) ? r1(Math.atan2(g(31).y-g(27).y, g(31).x-g(27).x)*180/Math.PI) : null;
  const rightFootAngle = Vboth(32,28) ? r1(Math.atan2(g(32).y-g(28).y, g(32).x-g(28).x)*180/Math.PI) : null;

  // ── SCOLIOSIS SCREEN (posterior view only) ────────────────────────────────
  // Cobb estimate from shoulder-pelvis angle discrepancy.
  // IMPORTANT: This is a SCREEN only. True Cobb requires standing AP X-ray.
  // Only report when both shoulder and pelvis angles are available and reliable.
  const cobbEstimate = shoulderAngle !== null && pelvisAngle !== null
    ? r1(Math.abs(shoulderAngle - pelvisAngle)) : null;
  const c7PlumbDev   = V(0) && hipMid ? r1((g(0).x - hipMid.x)*100) : null;

  // ── CENTRE OF GRAVITY ─────────────────────────────────────────────────────
  // Weighted average of key body segment centres (head, shoulder, hip, foot)
  // Normal: within ±4% of frame centre (0.5)
  const cogParts    = [V(0)?g(0):null, shMid, hipMid, footMid].filter(Boolean);
  const cogX        = cogParts.length >= 2 ? cogParts.reduce((s,p)=>s+(p.x||0),0)/cogParts.length : null;
  const cogDeviation= cogX !== null ? r1((cogX - 0.5)*100) : null;

  // ── POSTURAL LOAD INDEX (PLI) ─────────────────────────────────────────────
  // Composite measure of multi-system postural burden.
  // Each component is normalised to its clinical threshold (1.0 = at threshold).
  // Weights reflect relative contribution to clinical load (Reinecke & Hazard adapted).
  // FIXED: using clinically-grounded normal thresholds to prevent inflation.
  // A PLI of 0 = perfect posture, 100 = maximum clinically observed load.
  const PLI_components = [
    // [measured_value, normal_threshold, severity_threshold, weight]
    [Math.abs(shoulderAngle||0),    3,  7,  1.0],  // shoulder tilt
    [Math.abs(pelvisAngle||0),      3,  7,  1.2],  // pelvic obliquity
    [Math.abs(headLateralOffset||0),3,  7,  0.8],  // head lateral shift
    [Math.abs(trunkLateralShift||0),4,  8,  1.0],  // trunk shift
    [Math.abs(fhpNorm||0),          3,  8,  1.5],  // forward head (% frame)
    [Math.abs(cobbEstimate||0),     5, 10,  1.3],  // scoliosis screen
    [Math.abs(cogDeviation||0),     4,  8,  1.0],  // COG deviation
    [Math.abs(lumbarProxy||0),      4,  9,  1.2],  // lumbar/pelvic tilt
  ].filter(([v]) => v !== null && !isNaN(v));

  // Normalised score: 0 if within normal, linear up to 1.0 at severity threshold
  const pliSum = PLI_components.reduce((s, [v, norm, sev, w]) => {
    const normalised = v <= norm ? 0 : Math.min(1, (v - norm) / (sev - norm));
    return s + normalised * w;
  }, 0);
  const pliMaxPossible = PLI_components.reduce((s, [,,, w]) => s + w, 0);
  const posturalLoadIndex = pliMaxPossible > 0
    ? r1(clamp((pliSum / pliMaxPossible) * 100, 0, 100)) : null;

  // ── UCS / LCS SYNDROME INDICES (Janda) ────────────────────────────────────
  const ucsIndex = r1(
    (Math.abs(headLateralOffset||0)/5)*0.3 +
    (Math.abs(shoulderAngle||0)/5)*0.2 +
    ((thoracicAngle||40)-40 > 0 ? ((thoracicAngle||40)-40)/15 : 0)*0.3 +
    (cvaAngle !== null && cvaAngle < 55 ? (55-cvaAngle)/15 : 0)*0.4
  );
  const lcsIndex = r1(
    (Math.abs(pelvicTiltSagittal||0)/6)*0.5 +
    (Math.abs(lumbarProxy||0)/8)*0.4 +
    (Math.abs(weightBearingShift||0)/5)*0.1
  );

  return {
    // Frontal
    shoulderAngle, pelvisAngle, kneeAngle, ankleAngle, eyeLevelAngle,
    headLateralOffset, trunkLateralShift, pelvicObliquity, weightBearingShift,
    spinalDeviation, trunkRotationProxy, leftKneeFrontal, rightKneeFrontal,
    // Sagittal
    forwardHeadMm, forwardHeadCm, cvaAngle, cervicalLoadKg,
    thoracicAngle, lumbarProxy, lordosisAngle, pelvicTiltSagittal,
    anteriorPelvicTiltDeg, hipExtensionProxy,
    leftKneeAngle, rightKneeAngle, leftKneeDev, rightKneeDev,
    leftAnkleAngle, rightAnkleAngle,
    // Bilateral symmetry + LLD
    shoulderSymmetry, hipSymmetry, kneeSymmetry, ankleSymmetry, lldProxy, lldSide,
    // Regional
    scapularAsymm, scapularAbduction, leftFootAngle, rightFootAngle,
    // Composite
    cobbEstimate, c7PlumbDev, cogDeviation, posturalLoadIndex, ucsIndex, lcsIndex,
    hasZ,
  };
}

// ─── RELIABILITY ENGINE ───────────────────────────────────────────────────────
// Assesses MediaPipe landmark confidence and returns:
//   score: 0–100 overall confidence
//   status: Excellent / Good / Fair / Poor / Insufficient
//   blocked: true if image quality is too low to produce any findings
//   warnings: clinician-facing messages
//   icc: intraclass correlation coefficient estimate (proxy)
function ReliabilityEngine(lm) {
  if (!lm) return { score:0, status:"Insufficient", blocked:true, warnings:[], confidence:{} };

  // Key clinical landmarks required for a valid posture assessment
  const KEY   = [0,2,5,7,8,11,12,23,24,25,26,27,28,29,30,31,32];
  const NAMES = {0:"Nose/Head",2:"L.Eye",5:"R.Eye",7:"L.Ear",8:"R.Ear",
    11:"L.Shoulder",12:"R.Shoulder",23:"L.Hip/ASIS",24:"R.Hip/ASIS",
    25:"L.Knee",26:"R.Knee",27:"L.Ankle",28:"R.Ankle",
    29:"L.Heel",30:"R.Heel",31:"L.FootToe",32:"R.FootToe"};

  const confidence = {};
  KEY.forEach(i => { confidence[i] = { name:NAMES[i], value:Math.round((lm[i]?.visibility||0)*100) }; });
  const visValues = KEY.map(i => lm[i]?.visibility||0);
  const mean = visValues.reduce((s,v)=>s+v,0)/KEY.length;

  // CRITICAL landmarks — if these are below threshold, the analysis is unreliable
  const criticalLandmarks = [
    { idx:11, name:"L.Shoulder" }, { idx:12, name:"R.Shoulder" },
    { idx:23, name:"L.Hip/ASIS" }, { idx:24, name:"R.Hip/ASIS" },
    { idx:0,  name:"Head/Nose"  },
  ];
  const failedCritical = criticalLandmarks.filter(c => (lm[c.idx]?.visibility||0) < 0.45);

  // Block analysis entirely if:
  // (a) mean confidence < 0.40 (poor overall detection)
  // (b) more than 1 critical landmark below threshold
  // (c) both shoulders OR both hips below threshold simultaneously
  const bothShouldersLow = (lm[11]?.visibility||0) < 0.45 && (lm[12]?.visibility||0) < 0.45;
  const bothHipsLow = (lm[23]?.visibility||0) < 0.45 && (lm[24]?.visibility||0) < 0.45;
  const blocked = mean < 0.40 || failedCritical.length > 1 || bothShouldersLow || bothHipsLow;

  const warnings = [];

  if (blocked) {
    warnings.push({ icon:"🚫", text:"Image quality insufficient for reliable analysis — improve lighting, ensure full body visible, use form-fitting clothing", color:PC.red, priority:6 });
  } else if (mean < 0.55) {
    warnings.push({ icon:"⚠", text:"Low confidence — findings may be inaccurate. Improve lighting and camera distance", color:PC.red, priority:5 });
  } else if (mean < 0.70) {
    warnings.push({ icon:"○", text:"Partial tracking — some measurements limited. Ensure full body in frame", color:PC.yellow, priority:3 });
  }

  const lowVis = KEY.filter(i => (lm[i]?.visibility||0) < 0.45);
  if (!blocked && lowVis.length > 5)
    warnings.push({ icon:"👁", text:`${lowVis.length} landmarks low confidence — affected measurements marked unreliable`, color:PC.yellow, priority:4 });

  const lShVis = lm[11]?.visibility||0, rShVis = lm[12]?.visibility||0;
  if (!blocked && Math.abs(lShVis-rShVis) > 0.40)
    warnings.push({ icon:"↔", text:"Asymmetric shoulder visibility — bilateral shoulder measurements may be inaccurate", color:PC.yellow, priority:3 });

  if (!blocked && (lm[23]?.visibility||0) < 0.45 || (lm[24]?.visibility||0) < 0.45)
    warnings.push({ icon:"⊖", text:"Hip/ASIS partially occluded — pelvic measurements flagged unreliable", color:PC.yellow, priority:3 });

  if ((lm[7]?.visibility||0) < 0.45 && (lm[8]?.visibility||0) < 0.45)
    warnings.push({ icon:"👂", text:"Ears not detected — CVA and forward head posture cannot be assessed", color:PC.yellow, priority:2 });

  if ((lm[31]?.visibility||0) < 0.35 && (lm[32]?.visibility||0) < 0.35)
    warnings.push({ icon:"🦶", text:"Feet not visible — move camera back or lower for full-body capture", color:PC.yellow, priority:2 });

  const hasZ = lm[7] && lm[11] && Math.abs((lm[7].z||0)-(lm[11].z||0)) > 0.002;
  if (!hasZ && !blocked)
    warnings.push({ icon:"📐", text:"Sagittal depth data limited — use lateral view for kyphosis/CVA assessment", color:PC.muted, priority:1 });

  warnings.sort((a,b) => (b.priority||0)-(a.priority||0));

  const status = blocked ? "Insufficient" : mean > 0.80 ? "Excellent" : mean > 0.65 ? "Good" : mean > 0.50 ? "Fair" : "Poor";
  // ICC proxy (0.40 base + confidence-scaled; represents approximate test-retest reliability)
  const icc = r1(Math.min(0.95, 0.35 + mean * 0.60));

  return { score:Math.round(mean*100), status, blocked, warnings, confidence, icc };
}

// ─── CLINICAL FINDINGS ENGINE ─────────────────────────────────────────────────
// Thresholds: Kendall (2005), Magee (2014), Levangie & Norkin (2011),
// Sahrmann (2002), Comerford & Mottram (2012), Hansraj (2014)
function ClinicalFindingsEngine(lm, view, measurements) {
  if (!lm || !measurements) return [];
  const findings = [];
  const {
    shoulderAngle, pelvisAngle, kneeAngle, ankleAngle, eyeLevelAngle,
    headLateralOffset, trunkLateralShift, spinalDeviation, trunkRotationProxy,
    forwardHeadMm, forwardHeadCm, cvaAngle, cervicalLoadKg,
    thoracicAngle, lordosisAngle, pelvicTiltSagittal, anteriorPelvicTiltDeg,
    leftKneeDev, rightKneeDev, leftAnkleAngle, rightAnkleAngle,
    leftKneeFrontal, rightKneeFrontal, hipExtensionProxy,
    cobbEstimate, c7PlumbDev, cogDeviation, weightBearingShift,
    scapularAsymm, leftFootAngle, rightFootAngle,
    lldProxy, lldSide, ucsIndex, lcsIndex, posturalLoadIndex, lumbarProxy,
  } = measurements;

  const add = (region, text, severity, correction, icd="M99.0", icon="●", detail="", norm="", value=null) =>
    findings.push({ region, text, severity, correction, icd, icon, detail, norm, value });

  // ── ANTERIOR VIEW ─────────────────────────────────────────────────────────
  if (view === "anterior") {

    // Eye level tilt
    if (eyeLevelAngle !== null && Math.abs(eyeLevelAngle) > 2) {
      const side = eyeLevelAngle > 0 ? "Left" : "Right"; const abs = Math.abs(eyeLevelAngle);
      add("Cranial / Cervical", `Eye level tilted — ${side} eye lower (${abs.toFixed(1)}°)`, abs > 5 ? "high" : "moderate",
        `Check ocular righting reflex. Cervical lateral flexion mobility assessment. Consider vestibular/visual dominance contributing to head tilt. Refer optometry if >5° and consistent.`,
        "H53.9", "👁", `Ocular reflex drives cervical compensation — rule out visual asymmetry before treating neck.`, "Normal: <2°", abs);
    }

    // Shoulder elevation
    if (shoulderAngle !== null && Math.abs(shoulderAngle) > 3) {
      const abs = Math.abs(shoulderAngle); const side = shoulderAngle > 0 ? "Left" : "Right";
      add("Shoulder Girdle", `${side} shoulder elevated (~${abs.toFixed(1)}°)`, abs > 7 ? "high" : "moderate",
        `Release: upper trapezius sustained pressure 90s + levator scapulae stretch 30s × 3. Activate: lower trapezius Y-T-W × 15. NKT: check ipsilateral QL — QL overactivity commonly drives ipsilateral shoulder elevation via thoracic chain. Reassess cervical rotation after release.`,
        "M54.2", "⇑", `Common drivers: ipsilateral QL, pain guarding, thoracic dysfunction, scoliosis.`, "Normal: <3°", abs);
    }

    // Head lateral offset
    if (headLateralOffset !== null && Math.abs(headLateralOffset) > 2.5) {
      const abs = Math.abs(headLateralOffset); const side = headLateralOffset > 0 ? "right" : "left";
      add("Cervical", `Head laterally shifted ${side} (${abs.toFixed(1)}%)`, abs > 5 ? "high" : "moderate",
        `Cervical lateral flexion mobilisation contralateral. SCM and scalene release ipsilateral. Assess ocular/vestibular contributions. Pillow height review.`,
        "M54.2", "↔", `Persistent shift: C2–C4 facet dysfunction, alar ligament laxity, or habitual visual dominance.`, "Normal: <2.5%", abs);
    }

    // Pelvic obliquity + LLD prompt
    if (pelvisAngle !== null && Math.abs(pelvisAngle) > 3) {
      const abs = Math.abs(pelvisAngle); const high = pelvisAngle > 0 ? "Left" : "Right";
      const lldNote = lldProxy !== null && lldProxy > 5
        ? ` Knee height asymmetry suggests ~${lldProxy.toFixed(0)}mm functional LLD (${lldSide} side shorter).` : "";
      add("Pelvis / SIJ", `${high} ASIS elevated (${abs.toFixed(1)}°)${lldNote ? " + LLD suspected" : ""}`, abs > 7 ? "high" : "moderate",
        `Functional LLD: tape iliac crest to medial malleolus bilateral. If LLD >5mm: heel wedge trial 3–5mm. QL release elevated side. Hip abductor strengthening depressed side. SIJ provocation cluster (distraction, compression, thigh thrust, Gaenslen, sacral thrust — positive ≥3/5). Lumbar PA L4–S1.`,
        "M53.3", "⊖", `${abs.toFixed(1)}°. >7° — structural LLD screen (long-leg X-ray).${lldNote}`, "Normal: <3°", abs);
    }

    // Trunk lateral shift
    if (trunkLateralShift !== null && Math.abs(trunkLateralShift) > 3.5) {
      const abs = Math.abs(trunkLateralShift); const side = trunkLateralShift > 0 ? "right" : "left";
      add("Thoracic", `Trunk laterally shifted ${side} (${abs.toFixed(1)}%)`, abs > 7 ? "high" : "moderate",
        `Assess antalgic lean (disc/radiculopathy — trunk shifts AWAY from herniation in paracentral disc, TOWARD in lateral disc). Lateral trunk stretch contralateral. Rib mobilisation. Mirror feedback.`,
        "M54.5", "⇒", `Lateral trunk shift highly associated with L4/L5 disc herniation.`, "Normal: <3.5%", abs);
    }

    // Scoliosis / spinal deviation
    if (spinalDeviation !== null && Math.abs(spinalDeviation) > 4) {
      const abs = Math.abs(spinalDeviation);
      add("Spine", `C-plumb deviation — head not centred over pelvis (${abs.toFixed(1)}%)`, abs > 8 ? "high" : "moderate",
        `Adam's forward bend test — observe for rib hump. Confirm in posterior view. Refer for standing AP X-ray if structural scoliosis suspected. Schroth method if confirmed.`,
        "M41.9", "〜", `Must distinguish functional (reversible) from structural (fixed) scoliosis via Adam's bend test.`, "Normal: <4%", abs);
    }

    if (cobbEstimate !== null && cobbEstimate > 5) {
      add("Spine", `Scoliosis screen — estimated Cobb equivalent ${cobbEstimate.toFixed(0)}° (shoulder-pelvis differential)`, cobbEstimate > 10 ? "high" : "moderate",
        `Adam's forward bend test immediately. If rib prominence: refer for standing AP spine X-ray. Cobb >10° = confirmed scoliosis. >25° = bracing. >45° = surgical threshold. Schroth physiotherapy.`,
        "M41.9", "〜", `Shoulder (${shoulderAngle?.toFixed(1)}°) vs pelvis (${pelvisAngle?.toFixed(1)}°) differential.`, "Normal: <5°", cobbEstimate);
    }

    // Knee alignment frontal plane — merge bilateral into one finding
    {
      const lv = leftKneeFrontal, rv = rightKneeFrontal;
      const lAbs = lv !== null ? Math.abs(lv) : 0;
      const rAbs = rv !== null ? Math.abs(rv) : 0;
      const lSig = lv !== null && lAbs > 5;
      const rSig = rv !== null && rAbs > 5;
      if (lSig || rSig) {
        const bilateral = lSig && rSig;
        const lPattern = lv < 0 ? "valgus" : "varus";
        const rPattern = rv < 0 ? "valgus" : "varus";
        // Standardise to deviation angle format (positive = valgus, negative = varus)
        const lDev = lv !== null ? -lv : null; // flip sign: negative kf = valgus
        const rDev = rv !== null ? -rv : null;
        let text, severity, correction;
        if (bilateral) {
          const worseAbs = Math.max(lAbs, rAbs);
          const worseSide = lAbs >= rAbs ? "L" : "R";
          text = `Bilateral knee valgus — ${worseSide} worse (L: ${lAbs.toFixed(1)}° R: ${rAbs.toFixed(1)}°)`;
          severity = worseAbs > 10 ? "high" : "moderate";
          correction = `Glute med: clamshells × 15, lateral band walks × 20m. VMO: terminal knee extensions × 15. Single-leg squat with valgus mirror correction. Foot tripod activation. Address ankle pronation if present.`;
        } else if (lSig) {
          text = `Left knee ${lPattern} — hip-knee-ankle misalignment (${lAbs.toFixed(1)}°)`;
          severity = lAbs > 10 ? "high" : "moderate";
          correction = lv < 0
            ? `Glute med: clamshells, lateral band walks. VMO activation. SL squat correction. Foot tripod.`
            : `Hip ER strengthening. Ober test (ITB/TFL). Lateral chain SMR. Subtalar supination assessment.`;
        } else {
          text = `Right knee ${rPattern} — hip-knee-ankle misalignment (${rAbs.toFixed(1)}°)`;
          severity = rAbs > 10 ? "high" : "moderate";
          correction = rv < 0
            ? `Glute med: clamshells, lateral band walks. VMO activation. SL squat correction. Foot tripod.`
            : `Hip ER strengthening. Ober test (ITB/TFL). Lateral chain SMR. Subtalar supination assessment.`;
        }
        add("Knee Alignment", text, severity, correction,
          "M21.0", "⊾",
          `Dynamic valgus: primary driver of PFP, ACL injury, medial compartment OA. Glute med weakness in 80% of functional valgus cases.`,
          "Normal: <5° deviation", Math.max(lAbs, rAbs));
      }
    }

    // Weight-bearing asymmetry
    if (weightBearingShift !== null && Math.abs(weightBearingShift) > 4) {
      const abs = Math.abs(weightBearingShift); const side = weightBearingShift > 0 ? "right" : "left";
      add("Balance / Loading", `Weight-bearing asymmetry — loading toward ${side} (${abs.toFixed(1)}%)`, abs > 8 ? "high" : "moderate",
        `Mirror biofeedback bilateral stance. Scales under each foot if available. Retrain equal loading. Identify driver: pain avoidance, LLD, or habit.`,
        "M62.9", "⊖", `Asymmetric loading >6% associated with increased ipsilateral knee/hip OA progression.`, "Normal: <4%", abs);
    }

    // Foot progression angles
    [[leftFootAngle,"Left"],[rightFootAngle,"Right"]].forEach(([angle,side])=>{
      if (angle === null || Math.abs(angle) <= 20) return;
      const abs = Math.abs(angle);
      add("Foot / Ankle", `${side} foot ${angle > 0 ? "externally" : "internally"} rotated (${abs.toFixed(0)}°)`, abs > 30 ? "high" : "moderate",
        angle > 0
          ? `Check tibial external torsion, hip ER contracture, glute med/TFL balance. Gait retraining feet-parallel.`
          : `Check tibial internal torsion, hip IR dominance, in-toeing gait. Refer podiatry if structural torsion.`,
        "M21.6", "↻", `Normal foot progression angle 5–12° external.`, "Normal: 5–12°", abs);
    });

    // COG deviation
    if (cogDeviation !== null && Math.abs(cogDeviation) > 5) {
      const abs = Math.abs(cogDeviation);
      add("Global Posture", `COG shifted ${cogDeviation > 0 ? "right" : "left"} (${abs.toFixed(1)}%)`, abs > 9 ? "high" : "moderate",
        `Global postural reset: proprioceptive training single-leg stance, mirror biofeedback, perturbation training. Identify structural driver before retraining.`,
        "M62.9", "⊕", "", "Normal: <5%", abs);
    }

    // UCS pattern
    if (ucsIndex !== null && ucsIndex > 0.6) {
      add("Upper Crossed Syndrome", `UCS pattern detected — index ${ucsIndex.toFixed(1)} (${ucsIndex > 1.0 ? "severe" : "moderate"})`, ucsIndex > 1.0 ? "high" : "moderate",
        `INHIBIT (SMR ×90s): upper trap, SCM, pec minor, levator scapulae. ACTIVATE: deep neck flexors (chin nod ×10 ×3), lower trap (Y-T-W ×15), serratus (wall push-up plus ×15). MOBILISE: thoracic extension foam roller T4–T8 ×2min. CORRECT: monitor height +5cm. NKT reprogram within 30s of release.`,
        "M62.9", "✗", `UCS (Janda 1979): overactive upper trap/SCM/pec minor ↔ inhibited DNF/lower trap/serratus. Drives FHP, rounded shoulders, kyphosis, cervicogenic headache.`, "UCS Index: <0.4 normal", ucsIndex);
    }

    // LCS pattern
    if (lcsIndex !== null && lcsIndex > 0.5) {
      add("Lower Crossed Syndrome", `LCS pattern detected — index ${lcsIndex.toFixed(1)} (${lcsIndex > 1.0 ? "severe" : "moderate"})`, lcsIndex > 1.0 ? "high" : "moderate",
        `INHIBIT (SMR ×90s): hip flexors (psoas, RF, TFL), thoracolumbar erectors, QL. ACTIVATE: glute max (bridges ×15, hip thrusts ×10), glute med (clamshells, lateral band walks), TA/core (dead bug ×10). STRETCH: couch stretch 90s/side. CORRECT: pelvic neutral awareness, seated posture retraining.`,
        "M62.9", "✗", `LCS (Janda): overactive hip flexors/lumbar extensors ↔ inhibited glutes/abdominals. Drives APT, hyperlordosis, knee valgus.`, "LCS Index: <0.4 normal", lcsIndex);
    }
  }

  // ── POSTERIOR VIEW ────────────────────────────────────────────────────────
  if (view === "posterior") {

    if (shoulderAngle !== null && Math.abs(shoulderAngle) > 3) {
      const abs = Math.abs(shoulderAngle); const side = shoulderAngle > 0 ? "Left" : "Right";
      add("Shoulder Girdle", `${side} shoulder elevated — posterior view (${abs.toFixed(1)}°)`, abs > 7 ? "high" : "moderate",
        `Upper trapezius and levator scapulae release ipsilateral. Lower trapezius facilitation. Confirm anterior view finding.`,
        "M54.2", "⇑", "", "Normal: <3°", abs);
    }

    if (cobbEstimate !== null && cobbEstimate > 5) {
      add("Spine", `Scoliosis suspected — Cobb estimate ${cobbEstimate.toFixed(0)}° (posterior definitive view)`, cobbEstimate > 10 ? "high" : "moderate",
        `Adam's forward bend test immediately (rib hump = positive → refer). Standing AP spine X-ray for true Cobb. Cobb 10–25°: monitor + Schroth. >25°: bracing. >45°: surgical threshold.`,
        "M41.9", "〜", `C7 plumb: ${c7PlumbDev !== null ? Math.abs(c7PlumbDev).toFixed(1)+"% from sacral midpoint" : "not calculated"}. Shoulder ${shoulderAngle?.toFixed(1)}° vs pelvis ${pelvisAngle?.toFixed(1)}°.`, "Normal: <5°", cobbEstimate);
    }

    if (c7PlumbDev !== null && Math.abs(c7PlumbDev) > 4) {
      const abs = Math.abs(c7PlumbDev);
      add("Spine", `C7 plumb deviation — head shifted ${c7PlumbDev > 0 ? "right" : "left"} of sacral midpoint (${abs.toFixed(1)}%)`, abs > 8 ? "high" : "moderate",
        `C7 plumb gold standard for coronal balance. If structural deviation >4cm: orthopaedic spine referral. If functional: treat driver (LLD, pain, QL).`,
        "M41.9", "〜", "", "Normal: <4%", abs);
    }

    if (pelvisAngle !== null && Math.abs(pelvisAngle) > 3) {
      const abs = Math.abs(pelvisAngle);
      add("Pelvis / SIJ", `Pelvic obliquity posterior — ${pelvisAngle > 0 ? "Left" : "Right"} elevated (${abs.toFixed(1)}°)`, abs > 7 ? "high" : "moderate",
        `Confirm with LLD tape measure. SIJ provocation cluster. QL release elevated side.`,
        "M53.3", "⊖", "", "Normal: <3°", abs);
    }

    if (scapularAsymm !== null && scapularAsymm > 2.5) {
      add("Scapula", `Scapular height asymmetry — posterior view (${scapularAsymm.toFixed(1)}° differential)`, scapularAsymm > 5 ? "high" : "moderate",
        `NKT screen: serratus anterior vs pec minor. Lower trap Y-T-W ×15. Wall push-up plus (serratus). Thoracic extension mobility. If winging visible: test serratus (wall push-up — medial border lifting = Type II dyskinesis).`,
        "M89.8", "⇑", `Kibler types: I=inferior angle, II=medial border (serratus weakness), III=superior elevation (upper trap dominant).`, "Normal: <2.5°", scapularAsymm);
    }

    if (trunkRotationProxy !== null && Math.abs(trunkRotationProxy) > 8) {
      add("Thoracic", `Trunk rotation asymmetry (shoulder-to-hip width ratio ${Math.abs(trunkRotationProxy).toFixed(0)}%)`, Math.abs(trunkRotationProxy) > 15 ? "high" : "moderate",
        `Thoracic rotation PA mobilisation bilateral. Foam roller thoracic rotation stretch. Assess axial rotation restriction.`,
        "M99.0", "↻", "", "Normal: <8%", Math.abs(trunkRotationProxy));
    }

    if (weightBearingShift !== null && Math.abs(weightBearingShift) > 4) {
      const abs = Math.abs(weightBearingShift);
      add("Balance / Loading", `Weight-bearing asymmetry posterior — shifted ${weightBearingShift > 0 ? "right" : "left"} (${abs.toFixed(1)}%)`, abs > 8 ? "high" : "moderate",
        `Quantify with scales. Mirror biofeedback. Treat driver: pain, LLD, or proprioceptive deficit.`,
        "M62.9", "⊖", "", "Normal: <4%", abs);
    }
  }

  // ── LATERAL VIEW ─────────────────────────────────────────────────────────
  if (view === "left" || view === "right") {

    // CVA — primary lateral finding
    if (cvaAngle !== null && cvaAngle < 55) {
      const sev = cvaAngle < 42 ? "high" : "moderate";
      const loadStr = cervicalLoadKg !== null ? ` Est. cervical load: ${cervicalLoadKg}kg (neutral=4.5kg).` : "";
      add("Cervical — Forward Head", `Forward head posture — CVA ${cvaAngle.toFixed(0)}° (normal >55°)${forwardHeadCm !== null ? ` / ${forwardHeadCm.toFixed(1)}cm anterior` : ""}`, sev,
        `IMMEDIATE: supine chin nod (NOT chin tuck) ×10 ×3 sets, 10s hold. Thoracic extension foam roller T4–T8 ×2min daily. Suboccipital release 90s. Ergonomic: raise monitor 5–10cm, keyboard at elbow height. NKT: SCM+scalenes overactive → inhibit → activate DNF within 30s. Home cue: tongue to roof of mouth.`,
        "M43.6", "⇒", `CVA ${cvaAngle.toFixed(0)}° (Yip 2008).${loadStr} Each 2.5cm FHP adds ~5kg to cervical extensors (Hansraj 2014).`, "Normal: >55°", cvaAngle);
    } else if (cvaAngle === null && forwardHeadMm !== null && Math.abs(forwardHeadMm) > 3) {
      const abs = Math.abs(forwardHeadMm);
      add("Cervical — Forward Head", `Forward head posture — ear anterior to acromion (${abs.toFixed(1)}% offset)`, abs > 7 ? "high" : "moderate",
        `Deep cervical flexor activation. Thoracic extension foam roller. Ergonomic review. Take true lateral photo for CVA measurement.`,
        "M43.6", "⇒", "Obtain lateral photo for CVA measurement — more accurate than frontal view proxy.", "Normal: ear over acromion", abs);
    }

    // Thoracic kyphosis
    if (thoracicAngle !== null && thoracicAngle - 45 > 8) {
      const excess = thoracicAngle - 45;
      add("Thoracic Kyphosis", `Increased thoracic kyphosis (~${thoracicAngle.toFixed(0)}°, normal 20–45°)`, excess > 18 ? "high" : "moderate",
        `Thoracic extension HVLA T4–T8 (PA + rotation). Foam roller extension apex ×2min daily. Wall angels ×15. Pec minor stretch 60s ×3. Lower trap: prone Y-T-W. Rib expansion breathing. Seated posture: lumbar roll support.`,
        "M40.2", "⌒", `Normal Cobb T1–T12 = 20–45°. Hyperkyphosis >50°. If structural: Scheuermann's (>5° wedging ≥3 vertebrae on X-ray).`, "Normal: 20–45°", thoracicAngle);
    }

    // Pelvic tilt sagittal
    if (pelvicTiltSagittal !== null && Math.abs(pelvicTiltSagittal) > 4) {
      const abs = Math.abs(pelvicTiltSagittal); const ant = pelvicTiltSagittal > 0;
      const angleNote = anteriorPelvicTiltDeg !== null ? ` (~${anteriorPelvicTiltDeg.toFixed(0)}° tilt, female norm ~12°, male norm ~7°)` : "";
      const lordNote  = lordosisAngle !== null ? ` Est. lordosis: ${lordosisAngle.toFixed(0)}° (normal 40–60°).` : "";
      add("Lumbar / Pelvis",
        ant ? `Anterior pelvic tilt${angleNote} — increased lumbar lordosis` : `Posterior pelvic tilt${angleNote} — flat back`,
        abs > 9 ? "high" : "moderate",
        ant
          ? `INHIBIT (SMR ×90s): psoas, RF, TFL. STRETCH: couch stretch 90s/side, 90-90 hip flexor. ACTIVATE: glute max (bridges ×15), TA (dead bug ×10). CORRECT: pelvic posterior tilt awareness. Thomas test to confirm hip flexor contracture. 90/90 hamstring length check.`
          : `Lumbar extension mobilisation PA L1–L5 grade III–IV. McKenzie extension: prone → press-up. Hip flexor facilitation. Assess erector spinae/multifidus tone. Sahrmann lumbar flexion syndrome screen.`,
        "M53.3", "↕",
        ant
          ? `ASIS drops below PSIS — hip flexor/erector overactivity. LCS pattern. Increases lumbar disc posterior load.${lordNote}`
          : `PSIS inferior to ASIS — hamstring/abdominal overactivity or gluteal inhibition.${lordNote}`,
        ant ? "Normal APT: female ≤12°, male ≤7°" : "Normal lordosis: 40–60°", abs);
    } else if ((pelvicTiltSagittal === null) && lumbarProxy !== null && Math.abs(lumbarProxy) > 4) {
      const abs = Math.abs(lumbarProxy); const ant = lumbarProxy > 0;
      add("Lumbar / Pelvis", `${ant ? "Anterior" : "Posterior"} pelvic tilt pattern`, abs > 8 ? "high" : "moderate",
        ant
          ? `Hip flexor stretch ×60s. Glute activation — bridges ×15. TVA bracing. Pelvic tilt awareness drills.`
          : `Lumbar extension mobilisation. Hip flexor facilitation. Multifidus activation. McKenzie extension.`,
        "M53.3", "↕", "", "", abs);
    }

    // ── LUMBAR LORDOSIS — independent finding ─────────────────────────────────
    if (lordosisAngle !== null) {
      if (lordosisAngle > 60) {
        const excess = lordosisAngle - 60;
        add("Lumbar — Hyperlordosis",
          `Increased lumbar lordosis (~${lordosisAngle.toFixed(0)}°, normal 40–60°)`,
          excess > 20 ? "high" : "moderate",
          `INHIBIT: iliopsoas (couch stretch 90s×2), rectus femoris (prone heel-to-glute). ACTIVATE: glute max (bridges ×15 with posterior pelvic tilt), TA (dead bug). Pelvic clock: anterior → neutral → posterior tilt awareness. Assess hip flexor contracture (Thomas test).`,
          "M40.5", "↕",
          `Hyperlordosis: ASIS drops below PSIS. Increases L4–L5 disc posterior compression and facet loading. Associated with hip flexor tightness and gluteal inhibition.`,
          "Normal: 40–60°", lordosisAngle);
      } else if (lordosisAngle < 30) {
        add("Lumbar — Flat Back / Reduced Lordosis",
          `Reduced lumbar lordosis (~${lordosisAngle.toFixed(0)}°, normal 40–60°)`,
          lordosisAngle < 20 ? "high" : "moderate",
          `McKenzie extension progression: prone → prone on elbows → press-up. Lumbar PA mobilisation Grade III–IV L1–L5. Hip flexor facilitation. Erector spinae activation. Sahrmann lumbar flexion syndrome screen. Lumbar roll support for sitting.`,
          "M40.4", "↕",
          `Flat back: PSIS at same level or below ASIS. Increases anterior disc shear force and hamstring/abdominal overactivity. Reduced shock absorption capacity.`,
          "Normal: 40–60°", lordosisAngle);
      }
    }

    // ── SWAY-BACK POSTURE ─────────────────────────────────────────────────────
    // Pattern: hips posterior to plumb + thoracic posterior + FHP
    // hipExtensionProxy < -4 = hips behind plumb; thoracicAngle < 38 = less kyphosis
    const hipBehindPlumb = hipExtensionProxy !== null && hipExtensionProxy < -4;
    const hasReducedLordosis = lumbarProxy !== null && lumbarProxy < -3;
    if (hipBehindPlumb && hasReducedLordosis) {
      add("Posture Pattern — Sway-Back",
        `Sway-back posture: hips posterior to plumb, flat lumbar, thoracic lean`,
        "moderate",
        `INHIBIT: hamstrings (slump stretch, seated), abdominals (reduce over-bracing). ACTIVATE: hip flexors (psoas activation — standing hip flexion ×15), lumbar extensors (prone hip extension). Postural cue: shift hips forward over ankles. Lumbar roll support in sitting.`,
        "M40.3", "⟲",
        `Sway-back: pelvis shifts anterior, hips posterior to plumb. Hamstring + abdominal overactivity. Hip ligament loading increases. Associated with inactive standing posture and hypermobility.`,
        "Ideal: hip over plumb", null);
    }

    // ── MILITARY / FLAT POSTURE ───────────────────────────────────────────────
    // Reduced thoracic kyphosis + reduced lordosis + upright head (no FHP)
    const isMilitaryPosture = thoracicAngle !== null && thoracicAngle < 30
      && (lumbarProxy === null || Math.abs(lumbarProxy) < 3)
      && (cvaAngle === null || cvaAngle > 58);
    if (isMilitaryPosture) {
      add("Posture Pattern — Military / Flat Back",
        `Military/flat-back posture: reduced thoracic kyphosis and lumbar lordosis`,
        "moderate",
        `Thoracic mobility: foam roller extension at T4–T8 ×2min daily. Rib expansion breathing ×10. Restore natural curve: McKenzie press-ups (lumbar). Cervical retraction (NOT chin tuck). Reassure: flat-back is not always symptomatic — assess function.`,
        "M40.4", "⊥",
        `Flat/military: all spinal curves reduced. Poor sagittal shock absorption. Often asymptomatic but predisposes to disc overload in end-range activities. Screen for Scheuermann's.`,
        "Normal: T kyphosis 20–45°, L lordosis 40–60°", null);
    }

    // ── UPPER CROSSED SYNDROME (UCS) — sagittal flag ─────────────────────────
    // FHP + thoracic kyphosis + rounded shoulders (shoulder anterior to plumb)
    const shAnteriorToPlumb = hipExtensionProxy !== null && shPt && shPt.x !== undefined;
    const hasUCS_sagittal = cvaAngle !== null && cvaAngle < 52
      && thoracicAngle !== null && thoracicAngle > 45;
    if (hasUCS_sagittal) {
      add("Upper Crossed Syndrome (UCS)",
        `UCS pattern: forward head + thoracic kyphosis + rounded shoulders`,
        cvaAngle < 45 ? "high" : "moderate",
        `NKT Protocol — INHIBIT (90s SMR each): upper trapezius, SCM, scalenes, pec minor. ACTIVATE (3×15): deep cervical flexors (chin nod), lower trapezius (prone Y), serratus anterior (wall slide). CORRECT: thoracic extension foam roller T4–T8. Ergonomic: monitor at eye level, chair with lumbar support. Home: hourly upper trap/pec minor stretch.`,
        "M62.8", "⊕",
        `Janda UCS: tight pec minor + SCM + upper trap → inhibit lower trap + DNF + rhomboids. Creates forward head, kyphosis, shoulder impingement. CVA ${cvaAngle?.toFixed(0)}° confirms FHP component.`,
        "Ideal: CVA >55°, kyphosis 20–45°", cvaAngle);
    }

    // ── LOWER CROSSED SYNDROME (LCS) — sagittal flag ─────────────────────────
    // Anterior pelvic tilt + hyperlordosis + hip anterior to plumb
    const hasLCS_sagittal = pelvicTiltSagittal !== null && pelvicTiltSagittal > 5
      && thoracicAngle !== null && thoracicAngle > 42;
    if (hasLCS_sagittal) {
      add("Lower Crossed Syndrome (LCS)",
        `LCS pattern: anterior pelvic tilt + hyperlordosis + hip flexor dominance`,
        pelvicTiltSagittal > 10 ? "high" : "moderate",
        `NKT Protocol — INHIBIT (90s SMR each): iliopsoas, rectus femoris, TFL. ACTIVATE (3×15): glute max (bridges with posterior tilt), glute med (clams), TVA (dead bug). CORRECT: pelvic tilt awareness (posterior tilt drill ×20). Thomas test to confirm hip flexor contracture. Ely's test for RF.`,
        "M62.8", "⊕",
        `Janda LCS: tight iliopsoas + erector spinae → inhibit glute max + transversus abdominis. Creates anterior pelvic tilt, hyperlordosis, increased L4–L5 posterior disc load. APT ${pelvicTiltSagittal?.toFixed(1)}% confirms pelvic component.`,
        "Ideal: APT <7° female / <5° male", pelvicTiltSagittal);
    }

    // ── POSTURAL PATTERN LABEL — sagittal classification ─────────────────────
    // Adds a clear top-level pattern label to findings (Kendall classification)
    {
      const hasFHP_f      = cvaAngle !== null && cvaAngle < 52;
      const hasKyph_f     = thoracicAngle !== null && thoracicAngle > 48;
      const hasLord_f     = lordosisAngle !== null && lordosisAngle > 60;
      const hasFlat_f     = lordosisAngle !== null && lordosisAngle < 30;
      const hasSway_f     = hipBehindPlumb && hasReducedLordosis;
      const hasMilitary_f = isMilitaryPosture;

      let patternName = "Ideal Alignment";
      let patternTx   = "Maintain with: global stability training, thoracic mobility, hip flexibility.";
      let patternNote = "Plumb line passes through ear, acromion, greater trochanter, lateral knee and lateral malleolus. No significant sagittal deviations.";
      let patternSev  = null; // null = don't add if ideal

      if (hasSway_f) {
        patternName = "Sway-Back Posture";
        patternTx   = "Activate hip flexors. Shift hips forward. Lumbar extension mobility.";
        patternNote = "Hips posterior to plumb, flat lumbar, forward trunk lean. Hamstring/abdominal dominance.";
        patternSev  = "moderate";
      } else if (hasMilitary_f) {
        patternName = "Military / Flat-Back Posture";
        patternTx   = "Restore thoracic curve: foam roller extension. Restore lordosis: McKenzie.";
        patternNote = "Reduced thoracic kyphosis and lumbar lordosis. All curves diminished.";
        patternSev  = "moderate";
      } else if (hasFHP_f && hasKyph_f && hasLord_f) {
        patternName = "Lordotic-Kyphotic (UCS + LCS)";
        patternTx   = "Full postural correction programme. Address UCS and LCS simultaneously.";
        patternNote = "FHP + hyperkyphosis + hyperlordosis. Classic combined Upper and Lower Crossed Syndrome.";
        patternSev  = "high";
      } else if (hasKyph_f && hasLord_f) {
        patternName = "Lordotic-Kyphotic Posture";
        patternTx   = "Thoracic extension + hip flexor stretch + glute activation.";
        patternNote = "Thoracic kyphosis increased + lumbar lordosis increased. S-curve amplification.";
        patternSev  = "moderate";
      } else if (hasKyph_f && !hasLord_f) {
        patternName = "Kyphotic Posture (Thoracic)";
        patternTx   = "Thoracic extension foam roller + lower trapezius + pec minor stretch.";
        patternNote = "Increased thoracic kyphosis as primary finding. Scheuermann's or sedentary posture.";
        patternSev  = "moderate";
      } else if (hasLord_f && !hasKyph_f) {
        patternName = "Lordotic Posture";
        patternTx   = "Hip flexor inhibition + glute max activation + pelvic tilt awareness.";
        patternNote = "Hyperlordosis + anterior pelvic tilt. LCS pattern without significant thoracic component.";
        patternSev  = "moderate";
      } else if (hasFlat_f) {
        patternName = "Flat-Back Posture";
        patternTx   = "McKenzie extension + lumbar roll support + erector facilitation.";
        patternNote = "Reduced lumbar lordosis. Disc anterior shear risk. Assess hamstring and abdominal dominance.";
        patternSev  = "moderate";
      } else if (hasFHP_f && !hasKyph_f) {
        patternName = "Forward Head Posture (Isolated)";
        patternTx   = "DNF activation. Thoracic extension. Ergonomic review.";
        patternNote = "FHP without significant thoracic kyphosis. Cervical extensor overactivation. Screen and desk posture.";
        patternSev  = "moderate";
      }

      if (patternSev !== null) {
        add(`Sagittal Pattern — ${patternName}`,
          `Classification: ${patternName}`,
          patternSev,
          patternTx,
          "Z96.89", "◈",
          patternNote,
          "Ideal: Lordotic-Kyphotic-Lordotic balanced alignment", null);
      }
    }

    // Knee genu recurvatum
    // In lateral views (left/right), only the camera-facing knee is reliably visible.
    // Use the view label to correctly name which knee is being assessed.
    const isLateralView = view === "left" || view === "right";
    const lateralKneeSideLabel = view === "left" ? "Left" : view === "right" ? "Right" : null;

    [[leftKneeDev,"Left"],[rightKneeDev,"Right"]].forEach(([dev,side])=>{
      if (dev === null) return;
      // In lateral views: skip the non-camera-facing knee reading (unreliable)
      // and relabel the visible knee with the correct side from the view selection
      if (isLateralView) {
        // Only process the knee that MediaPipe would most reliably see in this view
        // Right lateral → right-side landmarks visible → rightKneeDev is reliable
        // Left lateral → left-side landmarks visible → leftKneeDev is reliable
        const expectedSide = view === "right" ? "Right" : "Left";
        if (side !== expectedSide) return; // skip the occluded knee
        // Relabel: in a right lateral photo, the visible knee is the RIGHT knee
        side = lateralKneeSideLabel;
      }
      if (dev < -5) {
        const abs = Math.abs(dev);
        add("Knee — Genu Recurvatum", `${side} knee hyperextension (genu recurvatum) — ${abs.toFixed(0)}° past neutral`, abs > 12 ? "high" : "moderate",
          `Hamstring eccentric: nordic curls, RDL. Calf eccentric: heel drops. Proprioception: SL stance with slight knee flexion cue. Avoid terminal knee locking. Lachman + anterior drawer. Check posterior capsule laxity.`,
          "M21.1", "⌣", `>5° increases posterior capsule strain and ACL load. >10° — Beighton score for hypermobility.`, "Normal: 0–5°", abs);
      } else if (dev > 10) {
        add("Knee — Flexion Stance", `${side} knee flexion in stance — ${dev.toFixed(0)}° (antalgic / contracture)`, dev > 20 ? "high" : "moderate",
          `Hamstring 90/90 test. Thomas test hip flexor. Treat pain source if antalgic. Terminal knee extension drills. Gait conscious extension cue.`,
          "M21.9", "⌣", "", "Normal: 0–5° flexion", dev);
      }
    });

    // Hip extension proxy
    if (hipExtensionProxy !== null && hipExtensionProxy > 8) {
      add("Hip / Lumbar", `Hip anterior to ankle plumb — hip flexion pattern in stance (${hipExtensionProxy.toFixed(1)}%)`, hipExtensionProxy > 15 ? "high" : "moderate",
        `Thomas test: confirm hip flexor contracture. Couch stretch ×90s. Hip extension: prone hip extension, RDL, glute bridge. Assess lumbar compensation.`,
        "M24.1", "⇒", "Hip anterior to ankle plumb suggests hip flexor tightness or hip flexion movement pattern.", "Normal: hip over ankle", hipExtensionProxy);
    }

    // Ankle dorsiflexion
    [[leftAnkleAngle,"Left"],[rightAnkleAngle,"Right"]].forEach(([angle,side])=>{
      if (angle === null || angle >= 80) return;
      add("Ankle — Dorsiflexion", `${side} ankle dorsiflexion restriction (~${angle.toFixed(0)}°, normal >80°)`, angle < 60 ? "high" : "moderate",
        `Gastrocnemius: straight-knee wall lean 60s ×3. Soleus: bent-knee wall lean 60s ×3. Talar anterior glide mobilisation (knee-to-wall >10cm target). SL heel raise full ROM. Assess talocrural vs subtalar restriction.`,
        "M24.2", "↕", `Ankle DF <80° → compensatory foot pronation, knee valgus, APT in squat. Primary ACL injury risk factor.`, "Normal: >80° (knee-to-wall ≥10cm)", angle);
    });
  }

  // ── GLOBAL — all views ────────────────────────────────────────────────────
  if (posturalLoadIndex !== null && posturalLoadIndex > 55) {
    // Plain-language contributor list — what is actually elevated and by how much
    const pliContributors = [];
    if (Math.abs(shoulderAngle||0) > 3)
      pliContributors.push({ label:"Uneven shoulders", value:`${Math.abs(shoulderAngle).toFixed(1)}°`, normal:"<3°" });
    if (Math.abs(pelvisAngle||0) > 3)
      pliContributors.push({ label:"Uneven pelvis/hips", value:`${Math.abs(pelvisAngle).toFixed(1)}°`, normal:"<3°" });
    if (Math.abs(fhpNorm||0) > 3)
      pliContributors.push({ label:"Head too far forward", value:`${Math.abs(fhpNorm).toFixed(1)}%`, normal:"<3%" });
    if (Math.abs(trunkLateralShift||0) > 4)
      pliContributors.push({ label:"Body leaning to one side", value:`${Math.abs(trunkLateralShift).toFixed(1)}%`, normal:"<4%" });
    if (Math.abs(cobbEstimate||0) > 5)
      pliContributors.push({ label:"Spinal curve (scoliosis screen)", value:`${Math.abs(cobbEstimate).toFixed(1)}°`, normal:"<5°" });
    if (Math.abs(cogDeviation||0) > 4)
      pliContributors.push({ label:"Body weight off-centre", value:`${Math.abs(cogDeviation).toFixed(1)}%`, normal:"<4%" });
    if (Math.abs(lumbarProxy||0) > 4)
      pliContributors.push({ label:"Pelvic tilt / lower back curve", value:`${Math.abs(lumbarProxy).toFixed(1)}%`, normal:"<4%" });

    // Simple plain-English severity label
    const pliLabel = posturalLoadIndex > 80
      ? "Very High — multiple areas need attention"
      : posturalLoadIndex > 65
      ? "High — several postural areas are stressed"
      : "Elevated — more than one area is affected";

    // Build simple detail string (no jargon)
    const pliDetail = pliContributors.length > 0
      ? `What is contributing to this score:\n${pliContributors.map(c=>`• ${c.label}: ${c.value} (normal ${c.normal})`).join("\n")}\n\nThis does not mean all these things are painful or dangerous — it means the body is working harder than it should to stay balanced. Each problem adds up and increases strain on muscles and joints over time.`
      : "Multiple small postural deviations are adding up across different body areas, increasing overall strain.";

    const severity = posturalLoadIndex > 75 ? "high" : "moderate";
    add("Global — Body Load Summary",
      `Body working harder than normal — ${pliLabel}`,
      severity,
      `Start with the highest-priority finding above. Fixing one problem often reduces the overall load score automatically. Aim for: 1 targeted exercise per problem area, 10–15 min daily. Re-assess in 4–6 weeks.`,
      "M62.9", "⚑", pliDetail, "Target: <35/100", posturalLoadIndex);
  }

  return findings;
}

// ─── POSTURE SCORING ENGINE ───────────────────────────────────────────────────
// Score = 100 minus weighted penalties from clinical measurements + findings.
// CLINICAL BANDS based on Kendall functional alignment classification.

// ─── POSTURE ANALYSIS MODULE (PostureTab v6) ────────────────────────────────

// ─── PostureTab v6: PC, mid, r1, clamp, calcAngleDeg, vec3Angle, dist2D, MIN_VIS already defined above ───

// ─── Manual Landmark Definitions ─────────────────────────────────────────────
// Maps manual point index to MediaPipe landmark index (where applicable)
const MANUAL_POINTS_FRONTAL = [
  { id:0,  label:"Head top",        mpIdx:0,  desc:"Top of head" },
  { id:1,  label:"L Eye",           mpIdx:2,  desc:"Left eye centre" },
  { id:2,  label:"R Eye",           mpIdx:5,  desc:"Right eye centre" },
  { id:3,  label:"L Ear",           mpIdx:7,  desc:"Left ear tragus" },
  { id:4,  label:"R Ear",           mpIdx:8,  desc:"Right ear tragus" },
  { id:5,  label:"L Shoulder",      mpIdx:11, desc:"Left acromion" },
  { id:6,  label:"R Shoulder",      mpIdx:12, desc:"Right acromion" },
  { id:7,  label:"L Elbow",         mpIdx:13, desc:"Left lateral epicondyle" },
  { id:8,  label:"R Elbow",         mpIdx:14, desc:"Right lateral epicondyle" },
  { id:9,  label:"L ASIS",          mpIdx:23, desc:"Left anterior superior iliac spine" },
  { id:10, label:"R ASIS",          mpIdx:24, desc:"Right anterior superior iliac spine" },
  { id:11, label:"L Knee",          mpIdx:25, desc:"Left knee joint line" },
  { id:12, label:"R Knee",          mpIdx:26, desc:"Right knee joint line" },
  { id:13, label:"L Ankle",         mpIdx:27, desc:"Left lateral malleolus" },
  { id:14, label:"R Ankle",         mpIdx:28, desc:"Right lateral malleolus" },
  { id:15, label:"L Heel",          mpIdx:29, desc:"Left heel contact" },
  { id:16, label:"R Heel",          mpIdx:30, desc:"Right heel contact" },
  { id:17, label:"L Toe",           mpIdx:31, desc:"Left 2nd toe" },
  { id:18, label:"R Toe",           mpIdx:32, desc:"Right 2nd toe" },
];

const MANUAL_POINTS_SAGITTAL = [
  { id:0, label:"Nose / Head",    mpIdx:0,  desc:"Nose tip" },
  { id:1, label:"Ear",            mpIdx:7,  desc:"Ear tragus (near side)" },
  { id:2, label:"Shoulder",       mpIdx:11, desc:"Acromion (near side)" },
  { id:3, label:"Hip / GT",       mpIdx:23, desc:"Greater trochanter" },
  { id:4, label:"Knee",           mpIdx:25, desc:"Lateral knee joint line" },
  { id:5, label:"Ankle",          mpIdx:27, desc:"Lateral malleolus" },
  { id:6, label:"Heel",           mpIdx:29, desc:"Heel contact point" },
  { id:7, label:"Toe",            mpIdx:31, desc:"2nd toe tip" },
];

// Connections to draw between placed manual points (frontal)
const MANUAL_CONNECTIONS_FRONTAL = [
  [3,4],[1,2],[5,6],[9,10],[11,12],[13,14],[15,16],[17,18],
  [5,7],[6,8],[5,9],[6,10],[9,11],[10,12],[11,13],[12,14],
  [13,15],[14,16],[15,17],[16,18],
];
const MANUAL_CONNECTIONS_SAGITTAL = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],
];

// Convert manual placed points {[id]: {x,y} normalised} to MediaPipe-like landmark array
function manualPointsToLandmarks(placed, pointDefs) {
  const lm = Array.from({length:33}, (_,i) => ({ x:0, y:0, z:0, visibility:0 }));
  pointDefs.forEach(def => {
    const p = placed[def.id];
    if (p && def.mpIdx !== undefined) {
      lm[def.mpIdx] = { x:p.x, y:p.y, z:0, visibility:1.0 };
    }
  });
  // Mirror ear/shoulder for sagittal (right side = same as left for sagittal points)
  // If sagittal: copy left to right for mirror symmetry so measureLandmarks gets both sides
  if (pointDefs.length === 8) {
    const pairs = [[7,8],[11,12],[23,24],[25,26],[27,28],[29,30],[31,32]];
    pairs.forEach(([l,r]) => {
      if (lm[l].visibility > 0) lm[r] = { ...lm[l] };
    });
  }
  return lm;
}

// ─── Measurement Engine ───────────────────────────────────────────────────────
function measureLandmarks(lm, calibration) {
  if(!lm||lm.length<33) return {};
  const g=i=>lm[i];
  const V=i=>(lm[i]?.visibility||0)>=MIN_VIS;
  const Vb=(...idx)=>idx.every(i=>V(i));

  // ── Real-world calibration ────────────────────────────────────────────────
  // calibration = { pixPerCm: number } derived from patient height entry
  // If not available, all *Cm fields remain null (% values still shown)
  const pixPerCm = calibration?.pixPerCm || null;
  // toCm: converts a normalised 0-1 distance to cm using image height as scale reference
  // We need the image height in pixels — stored in calibration.imgH
  const imgH = calibration?.imgH || null;
  const toCm = (normDist) => {
    if(normDist===null||normDist===undefined||!pixPerCm||!imgH) return null;
    return r1(Math.abs(normDist) * imgH / pixPerCm);
  };

  const shMid    = Vb(11,12)?mid(g(11),g(12)):null;
  const hipMid   = Vb(23,24)?mid(g(23),g(24)):null;
  const kneeMid  = Vb(25,26)?mid(g(25),g(26)):null;
  const ankleMid = Vb(27,28)?mid(g(27),g(28)):null;
  const earMid   = Vb(7,8)?mid(g(7),g(8)):null;
  const heelMid  = Vb(29,30)?mid(g(29),g(30)):null;
  const footMid  = Vb(31,32)?mid(g(31),g(32)):null;

  const shoulderAngle   = Vb(11,12)?calcAngleDeg(g(12),g(11)):null;
  const pelvisAngle     = Vb(23,24)?calcAngleDeg(g(24),g(23)):null;
  const eyeLevelAngle   = Vb(2,5)?calcAngleDeg(g(5),g(2)):null;
  const headTiltAngle   = Vb(7,8)?r1(calcAngleDeg(g(8),g(7))):null;
  const headTiltSide    = headTiltAngle!==null?(headTiltAngle>0?"Left":"Right"):null;

  const headLateralOffset  = shMid&&V(0)?r1((g(0).x-shMid.x)*100):null;
  const trunkLateralShift  = shMid&&hipMid?r1((shMid.x-hipMid.x)*100):null;
  const weightBearingShift = hipMid&&footMid?r1((hipMid.x-footMid.x)*100):null;
  const spinalDeviation    = V(0)&&hipMid?r1((g(0).x-hipMid.x)*100):null;
  const waistAsymmetry     = Vb(11,13)&&Vb(12,14)?r1(Math.abs(Math.abs(g(13).x-g(11).x)-Math.abs(g(14).x-g(12).x))*100):null;

  // CVA
  let cvaAngle=null;
  if(earMid&&shMid){
    const dx=Math.abs(earMid.x-shMid.x), dy=Math.abs(earMid.y-shMid.y);
    if(dy>0.04&&earMid.visibility>=0.35) cvaAngle=r1(clamp(Math.atan2(dy,dx)*180/Math.PI,20,88));
  }
  const fhpNorm = shMid&&earMid?r1((earMid.x-shMid.x)*100):null;

  // Cervical compressive load (Hansraj 2014 model)
  // Neutral head load ~4.5kg; adds ~2.7kg per 2.5cm of forward head displacement
  // fhpNorm is a % of image width — scale to cm using typical shoulder-width ~40cm as reference
  const shoulderWidthPx = shMid&&Vb(11,12)?dist2D(g(11),g(12)):null;
  let cervicalLoadKg = null;
  if(fhpNorm!==null&&shoulderWidthPx!==null&&shoulderWidthPx>0.05){
    // Convert normalised FHP offset to estimated cm (shoulder width reference 40cm)
    const fhpCm = Math.max(0,(fhpNorm/100)/shoulderWidthPx*40);
    cervicalLoadKg = r1(clamp(4.5 + fhpCm*1.08, 4.5, 32));
  }

  // Thoracic kyphosis proxy
  let thoracicAngle=null;
  if(shMid&&hipMid){
    const dx=shMid.x-hipMid.x, dy=Math.abs(shMid.y-hipMid.y);
    if(dy>0.06) thoracicAngle=r1(clamp(32+Math.atan2(Math.abs(dx),dy)*180/Math.PI*1.8,20,80));
  }

  // Lumbar proxy
  let lumbarProxy=null;
  if(hipMid&&kneeMid&&heelMid) lumbarProxy=r1((hipMid.x-(kneeMid.x+heelMid.x)/2)*100);
  const hipExtensionProxy = hipMid&&ankleMid?r1((hipMid.x-ankleMid.x)*100):null;

  // Knees
  const leftKneeAngle  = Vb(23,25,27)?vec3Angle(g(23),g(25),g(27)):null;
  const rightKneeAngle = Vb(24,26,28)?vec3Angle(g(24),g(26),g(28)):null;
  const leftKneeDev    = leftKneeAngle!==null?r1(leftKneeAngle-180):null;
  const rightKneeDev   = rightKneeAngle!==null?r1(rightKneeAngle-180):null;
  const leftKneeFrontal  = Vb(23,25,27)?r1(calcAngleDeg(g(23),g(25))-calcAngleDeg(g(25),g(27))):null;
  const rightKneeFrontal = Vb(24,26,28)?r1(calcAngleDeg(g(24),g(26))-calcAngleDeg(g(26),g(28))):null;

  const kneeSymmetry = Vb(25,26)?{left:g(25).y,right:g(26).y,diff:r1((g(25).y-g(26).y)*100)}:null;
  const lldProxy = kneeSymmetry?r1(Math.abs(kneeSymmetry.diff)*1.8):null;
  const lldSide  = kneeSymmetry?(kneeSymmetry.diff>0?"Left":"Right"):null;

  // Syndrome indices
  const ucsIndex = (shMid&&earMid&&cvaAngle!==null)
    ? r1(clamp(((55-cvaAngle)/15)*0.5+Math.abs(shoulderAngle||0)/15*0.5,0,2)) : null;
  const lcsIndex = (lumbarProxy!==null&&pelvisAngle!==null)
    ? r1(clamp(Math.abs(lumbarProxy)/20*0.5+Math.abs(pelvisAngle)/10*0.5,0,2)) : null;

  // ── Additional measurements ported from standalone ─────────────────────────

  // Bilateral symmetry objects
  const shoulderSymmetry = Vb(11,12)?{left:g(11).y,right:g(12).y,diff:r1((g(11).y-g(12).y)*100)}:null;
  const hipSymmetry      = Vb(23,24)?{left:g(23).y,right:g(24).y,diff:r1((g(23).y-g(24).y)*100)}:null;
  const ankleSymmetry    = Vb(27,28)?{left:g(27).y,right:g(28).y,diff:r1((g(27).y-g(28).y)*100)}:null;

  // Scapular metrics
  const scapularAsymm    = Vb(11,12)?r1(Math.abs((g(11).y||0)-(g(12).y||0))*100):null;
  const shoulderWidthNorm= Vb(11,12)?r1(dist2D(g(11),g(12))*100):null;
  const hipWidthNorm     = Vb(23,24)?r1(dist2D(g(23),g(24))*100):null;

  // Foot progression angles (ankle → toe vector from vertical)
  const leftFootAngle  = Vb(31,27)?r1(Math.atan2(g(31).y-g(27).y, g(31).x-g(27).x)*180/Math.PI):null;
  const rightFootAngle = Vb(32,28)?r1(Math.atan2(g(32).y-g(28).y, g(32).x-g(28).x)*180/Math.PI):null;

  // Ankle dorsiflexion (knee-ankle-toe angle; lateral view)
  const leftAnkleAngle  = Vb(25,27,31)?vec3Angle(g(25),g(27),g(31)):null;
  const rightAnkleAngle = Vb(26,28,32)?vec3Angle(g(26),g(28),g(32)):null;

  // Pelvic obliquity (hip-knee lateral offset proxy)
  const pelvicObliquity = hipMid&&kneeMid?r1((hipMid.x-kneeMid.x)*100):null;
  const trunkRotationProxy = shoulderWidthNorm&&hipWidthNorm&&hipWidthNorm>0.01
    ? r1((shoulderWidthNorm/hipWidthNorm-1)*100):null;

  // C7 plumb deviation (head vs hip midpoint)
  const c7PlumbDev = V(0)&&hipMid?r1((g(0).x-hipMid.x)*100):null;

  // Centre of gravity (weighted average of head, shoulder, hip, foot midpoints)
  const cogParts = [V(0)?g(0):null, shMid, hipMid, footMid].filter(Boolean);
  const cogX     = cogParts.length>=2 ? cogParts.reduce((s,p)=>s+(p.x||0),0)/cogParts.length : null;
  const cogDeviation = cogX!==null ? r1((cogX-0.5)*100) : null;

  // ── Postural Load Index (PLI) ──────────────────────────────────────────────
  // Composite of 8 weighted, normalised-to-threshold components (0=perfect, 100=max)
  const PLI_comps = [
    [Math.abs(shoulderAngle||0),    3,  7,  1.0],
    [Math.abs(pelvisAngle||0),      3,  7,  1.2],
    [Math.abs(headLateralOffset||0),3,  7,  0.8],
    [Math.abs(trunkLateralShift||0),4,  8,  1.0],
    [Math.abs(fhpNorm||0),          3,  8,  1.5],
    [Math.abs(cogDeviation||0),     4,  8,  1.0],
    [Math.abs(lumbarProxy||0),      4,  9,  1.2],
    [Math.abs(scapularAsymm||0),    2.5,5,  0.8],
  ].filter(([v])=>v!==null&&!isNaN(v));
  const pliSum = PLI_comps.reduce((s,[v,norm,sev,w])=>{
    const n = v<=norm ? 0 : Math.min(1,(v-norm)/(sev-norm));
    return s+n*w;
  },0);
  const pliMax = PLI_comps.reduce((s,[,,,w])=>s+w,0);
  const posturalLoadIndex = pliMax>0 ? r1(clamp((pliSum/pliMax)*100,0,100)) : null;

  // ── NEW: Frontal Plane Measurements (Feature 2) ───────────────────────────

  // Head tilt angle (ear-to-ear line vs horizontal) — normal <2 deg
  // (already computed above as headTiltAngle — alias for clarity)
  const headTiltFrontal = headTiltAngle;

  // Neck lateral angle: ear–shoulder vector from vertical — normal <4 deg
  // Left side
  const neckLateralL = Vb(7,11) ? r1(Math.abs(
    Math.atan2(Math.abs(g(7).x - g(11).x), Math.abs(g(7).y - g(11).y)) * 180 / Math.PI
  )) : null;
  // Right side
  const neckLateralR = Vb(8,12) ? r1(Math.abs(
    Math.atan2(Math.abs(g(8).x - g(12).x), Math.abs(g(8).y - g(12).y)) * 180 / Math.PI
  )) : null;
  const neckLateralAngle = (neckLateralL!==null&&neckLateralR!==null)
    ? r1((neckLateralL+neckLateralR)/2) : (neckLateralL??neckLateralR);
  const neckLateralSide = (neckLateralL!==null&&neckLateralR!==null)
    ? (neckLateralL>neckLateralR?"Left":"Right") : null;

  // Waist triangle asymmetry: elbow-to-hip space L vs R — normal <3%
  // Already computed as waistAsymmetry above; add waistTriangleAsymmetry alias with more detail
  const waistTriangleL = Vb(11,13,23) ? r1(dist2D(g(13),g(23))*100) : null;
  const waistTriangleR = Vb(12,14,24) ? r1(dist2D(g(14),g(24))*100) : null;
  const waistTriangleAsymmetry = (waistTriangleL!==null&&waistTriangleR!==null)
    ? r1(Math.abs(waistTriangleL - waistTriangleR)) : null;
  const waistTriangleSide = (waistTriangleL!==null&&waistTriangleR!==null)
    ? (waistTriangleL < waistTriangleR ? "Left" : "Right") : null; // narrower side

  // Ankle LLD proxy in mm: medial malleolus height difference — normal <5mm
  // Uses y-coordinate difference of ankles (lower y = higher in frame = shorter limb)
  const ankleLLDmm = Vb(27,28) ? r1(Math.abs(g(27).y - g(28).y) * 1000) : null;
  const ankleLLDSide = (ankleLLDmm!==null&&Vb(27,28))
    ? (g(27).y > g(28).y ? "Right" : "Left") : null; // higher ankle = shorter side

  // Tibial varum L/R: tibial segment angle from vertical — normal <5 deg
  const tibialVarumL = Vb(25,27) ? r1(Math.abs(
    Math.atan2(Math.abs(g(25).x - g(27).x), Math.abs(g(25).y - g(27).y)) * 180 / Math.PI
  )) : null;
  const tibialVarumR = Vb(26,28) ? r1(Math.abs(
    Math.atan2(Math.abs(g(26).x - g(28).x), Math.abs(g(26).y - g(28).y)) * 180 / Math.PI
  )) : null;

  // Knee/ankle width ratio (valgus >1.15, varus <0.85)
  const kneeWidth = Vb(25,26) ? dist2D(g(25),g(26)) : null;
  const ankleWidth = Vb(27,28) ? dist2D(g(27),g(28)) : null;
  const kneeAnkleRatio = (kneeWidth&&ankleWidth&&ankleWidth>0.01)
    ? r1(kneeWidth/ankleWidth) : null;
  const kneeAnklePattern = kneeAnkleRatio!==null
    ? (kneeAnkleRatio>1.15?"Valgus":kneeAnkleRatio<0.85?"Varus":"Normal") : null;

  // Carrying angle L/R (elbow cubitus valgus) — normal 5–15 deg
  const carryingAngleL = Vb(11,13,15) ? r1(Math.abs(vec3Angle(g(11),g(13),g(15))-180)) : null;
  const carryingAngleR = Vb(12,14,16) ? r1(Math.abs(vec3Angle(g(12),g(14),g(16))-180)) : null;

  // Shoulder/hip width ratio
  const shoulderWidth = Vb(11,12) ? r1(dist2D(g(11),g(12))*100) : null;
  const hipWidth = Vb(23,24) ? r1(dist2D(g(23),g(24))*100) : null;
  const shoulderHipRatio = (shoulderWidth&&hipWidth&&hipWidth>0)
    ? r1(shoulderWidth/hipWidth) : null;

  // ── Real-world measurements (cm) — only populated when calibration available ─
  // Forward head posture in cm (most clinically used number)
  const fhpCm = (fhpNorm!==null && shoulderWidthPx!==null && shoulderWidthPx>0.05 && pixPerCm && imgH)
    ? r1(Math.max(0,(fhpNorm/100) / shoulderWidthPx * 40)) : null;

  // Shoulder height difference in cm
  const shoulderDiffCm = (shoulderSymmetry && pixPerCm && imgH)
    ? toCm(Math.abs(shoulderSymmetry.diff)/100) : null;

  // Pelvic obliquity in cm (ASIS height difference)
  const pelvisDiffCm = (hipSymmetry && pixPerCm && imgH)
    ? toCm(Math.abs(hipSymmetry.diff)/100) : null;

  // Ankle LLD in cm
  const ankleLLDcm = (ankleLLDmm!==null && pixPerCm && imgH)
    ? r1(ankleLLDmm/10) : null;

  // Trunk lateral shift in cm
  const trunkShiftCm = (trunkLateralShift!==null && pixPerCm && imgH)
    ? toCm(Math.abs(trunkLateralShift)/100) : null;

  // Head lateral offset in cm
  const headOffsetCm = (headLateralOffset!==null && pixPerCm && imgH)
    ? toCm(Math.abs(headLateralOffset)/100) : null;

  return {
    shoulderAngle, pelvisAngle, eyeLevelAngle, headTiltAngle, headTiltSide,
    headLateralOffset, trunkLateralShift, weightBearingShift, spinalDeviation, waistAsymmetry,
    cvaAngle, fhpNorm, cervicalLoadKg, thoracicAngle, lumbarProxy, hipExtensionProxy,
    leftKneeDev, rightKneeDev, leftKneeFrontal, rightKneeFrontal,
    lldProxy, lldSide, ucsIndex, lcsIndex, kneeSymmetry,
    pelvicTiltSagittal: lumbarProxy,
    cobbEstimate: (spinalDeviation!==null&&waistAsymmetry!==null)
      ? r1(clamp((Math.abs(spinalDeviation||0)+Math.abs(waistAsymmetry||0))/2,0,35)):null,
    cogDeviation,
    // New Feature 2 measurements
    headTiltFrontal,
    neckLateralAngle, neckLateralSide, neckLateralL, neckLateralR,
    waistTriangleL, waistTriangleR, waistTriangleAsymmetry, waistTriangleSide,
    ankleLLDmm, ankleLLDSide,
    tibialVarumL, tibialVarumR,
    kneeAnkleRatio, kneeAnklePattern,
    carryingAngleL, carryingAngleR,
    shoulderWidth, hipWidth, shoulderHipRatio,
    // Ported from standalone
    shoulderSymmetry, hipSymmetry, ankleSymmetry,
    scapularAsymm,
    leftFootAngle, rightFootAngle,
    leftAnkleAngle, rightAnkleAngle,
    pelvicObliquity, trunkRotationProxy, c7PlumbDev,
    posturalLoadIndex,
    // aliases
    shoulderWidthNorm, hipWidthNorm,
    // ── Real-world cm measurements ───────────────────────────────────────────
    fhpCm, shoulderDiffCm, pelvisDiffCm, ankleLLDcm, trunkShiftCm, headOffsetCm,
    _calibrated: !!(pixPerCm && imgH),
  };
}

// ─── Reliability Engine ───────────────────────────────────────────────────────
function calcReliability(lm) {
  if(!lm||lm.length<33) return {score:0,status:"No Pose",blocked:true,warnings:[{icon:"❌",text:"No pose detected",color:PC.red}],icc:null,confidence:{}};
  const KEY=[0,2,5,7,8,11,12,23,24,25,26,27,28,29,30,31,32];
  const NAMES={0:"Head",2:"L.Eye",5:"R.Eye",7:"L.Ear",8:"R.Ear",11:"L.Shoulder",12:"R.Shoulder",
    23:"L.Hip",24:"R.Hip",25:"L.Knee",26:"R.Knee",27:"L.Ankle",28:"R.Ankle",
    29:"L.Heel",30:"R.Heel",31:"L.Toe",32:"R.Toe"};
  const confidence={};
  KEY.forEach(i=>{confidence[i]={name:NAMES[i],value:Math.round((lm[i]?.visibility||0)*100)};});
  const visVals=KEY.map(i=>(lm[i]?.visibility||0));
  const avg=visVals.reduce((a,b)=>a+b,0)/KEY.length;
  const score=Math.round(clamp(avg*100,0,100));
  const critical=[{idx:11,name:"L.Shoulder"},{idx:12,name:"R.Shoulder"},{idx:23,name:"L.Hip"},{idx:24,name:"R.Hip"},{idx:0,name:"Head"}];
  const failedCritical=critical.filter(c=>(lm[c.idx]?.visibility||0)<MIN_VIS);
  const bothShLow=(lm[11]?.visibility||0)<MIN_VIS&&(lm[12]?.visibility||0)<MIN_VIS;
  const bothHipLow=(lm[23]?.visibility||0)<MIN_VIS&&(lm[24]?.visibility||0)<MIN_VIS;
  const blocked=avg<0.40||failedCritical.length>1||bothShLow||bothHipLow;
  const warnings=[];
  if(blocked){
    warnings.push({icon:"✕",text:"Image quality insufficient — improve lighting, ensure full body visible",color:PC.red,priority:6});
  } else if(avg<0.55){
    warnings.push({icon:"⚠",text:"Low confidence — findings may be inaccurate. Improve lighting and camera distance",color:PC.red,priority:5});
  } else if(avg<0.70){
    warnings.push({icon:"○",text:"Partial tracking — some measurements limited. Ensure full body in frame",color:PC.yellow,priority:3});
  }
  const low=KEY.filter(i=>(lm[i]?.visibility||0)<MIN_VIS);
  if(!blocked&&low.length>5) warnings.push({icon:"◉",text:`${low.length} landmarks low confidence — affected measurements unreliable`,color:PC.yellow,priority:4});
  if(!blocked&&Math.abs((lm[11]?.visibility||0)-(lm[12]?.visibility||0))>0.40)
    warnings.push({icon:"↔",text:"Asymmetric shoulder visibility — bilateral measurements may be inaccurate",color:PC.yellow,priority:3});
  if(!blocked&&((lm[23]?.visibility||0)<MIN_VIS||(lm[24]?.visibility||0)<MIN_VIS))
    warnings.push({icon:"⊖",text:"Hip partially occluded — pelvic measurements flagged unreliable",color:PC.yellow,priority:3});
  if((lm[7]?.visibility||0)<MIN_VIS&&(lm[8]?.visibility||0)<MIN_VIS)
    warnings.push({icon:"☉",text:"Ears not detected — CVA and forward head posture cannot be assessed",color:PC.yellow,priority:2});
  if((lm[31]?.visibility||0)<0.35&&(lm[32]?.visibility||0)<0.35)
    warnings.push({icon:"⬡",text:"Feet not visible — move camera back for full-body capture",color:PC.yellow,priority:2});
  warnings.sort((a,b)=>(b.priority||0)-(a.priority||0));
  const status=blocked?"Insufficient":avg>0.80?"Excellent":avg>0.65?"Good":avg>0.50?"Fair":"Poor";
  const icc=r1(Math.min(0.95, 0.35+avg*0.60));
  return {score,status,blocked,warnings,icc,confidence};
}

// ─── Manual Reliability ───────────────────────────────────────────────────────
function calcManualReliability(placedCount, totalPoints) {
  const pct = placedCount / totalPoints;
  const score = Math.round(clamp(pct * 100, 0, 100));
  const status = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
  return {
    score,
    status,
    blocked: score < 60,
    isManual: true,
    warnings: score < 60 ? [{icon:"⚠", text:`Place at least ${Math.ceil(totalPoints*0.6)} points to analyse`, color:PC.yellow}] : [],
  };
}

// ─── Findings Engine ──────────────────────────────────────────────────────────
function buildFindings(lm, view, m) {
  if(!lm||!m) return [];
  const out=[];
  const add=(region,text,severity,correction,icd="M99.0",detail="",norm="")=>out.push({region,text,severity,correction,icd,detail,norm});

  const isLat=view==="left"||view==="right";

  // Frontal findings
  if(!isLat){
    if(m.shoulderAngle!==null&&Math.abs(m.shoulderAngle)>3){
      const abs=Math.abs(m.shoulderAngle), side=m.shoulderAngle>0?"Left":"Right";
      add("Shoulder Girdle",`${side} shoulder elevated (${abs.toFixed(1)}°)`,abs>7?"high":"moderate",
        "Release upper trapezius + levator scapulae. Activate lower trapezius Y-T-W ×15. Check ipsilateral QL overactivity.","M54.2");
    }
    if(m.pelvisAngle!==null&&Math.abs(m.pelvisAngle)>3){
      const abs=Math.abs(m.pelvisAngle), high=m.pelvisAngle>0?"Left":"Right";
      add("Pelvis / SIJ",`${high} ASIS elevated (${abs.toFixed(1)}°)${m.lldProxy&&m.lldProxy>5?" — LLD suspected":""}`,abs>7?"high":"moderate",
        "Assess true LLD (tape ASIS→medial malleolus). QL release elevated side. Hip abductor strengthening. SIJ provocation cluster.","M53.3");
    }
    if(m.headTiltAngle!==null&&Math.abs(m.headTiltAngle)>2){
      const abs=Math.abs(m.headTiltAngle);
      add("Head / Cervical",`Head tilt — ${m.headTiltSide||""} ear lower (${abs.toFixed(1)}°)`,abs>5?"high":"moderate",
        "Assess C1–C2 rotation restriction. Inhibit ipsilateral SCM + scalene. Activate contralateral deep neck flexors.","M43.6");
    }
    if(m.trunkLateralShift!==null&&Math.abs(m.trunkLateralShift)>3.5){
      const abs=Math.abs(m.trunkLateralShift), side=m.trunkLateralShift>0?"right":"left";
      add("Thoracic",`Trunk shifted ${side} (${abs.toFixed(1)}%)`,abs>7?"high":"moderate",
        "Assess antalgic lean (disc/radiculopathy). Lateral trunk stretch contralateral. Rib mobilisation. Mirror feedback.","M54.5");
    }
    if(m.spinalDeviation!==null&&Math.abs(m.spinalDeviation)>4){
      const abs=Math.abs(m.spinalDeviation);
      add("Spine",`Head not centred over pelvis (${abs.toFixed(1)}%)`,abs>8?"high":"moderate",
        "Adam's forward bend test — check rib hump. Refer for standing AP X-ray if structural scoliosis suspected.","M41.9");
    }
    if(m.waistAsymmetry!==null&&m.waistAsymmetry>3){
      add("Scoliosis Screen",`Waist triangle asymmetry (${m.waistAsymmetry.toFixed(1)}%)`,m.waistAsymmetry>6?"high":"moderate",
        "Adam's forward bend test. Treat lateral trunk shift driver. Rib cage mobilisation. Mirror biofeedback.","M41.9");
    }
    {
      const lv=m.leftKneeFrontal, rv=m.rightKneeFrontal;
      const lAbs=lv!==null?Math.abs(lv):0, rAbs=rv!==null?Math.abs(rv):0;
      const lSig=lv!==null&&lAbs>5, rSig=rv!==null&&rAbs>5;
      if(lSig||rSig){
        const bilateral=lSig&&rSig;
        if(bilateral){
          const worseAbs=Math.max(lAbs,rAbs), worseSide=lAbs>=rAbs?"L":"R";
          add("Knee Alignment",
            `Bilateral knee valgus — ${worseSide} worse (L: ${lAbs.toFixed(1)}° R: ${rAbs.toFixed(1)}°)`,
            worseAbs>10?"high":"moderate",
            `Glute med: clamshells ×15, lateral band walks ×20m. VMO: terminal knee extensions ×15. Single-leg squat with valgus mirror correction. Foot tripod activation. Address ankle pronation if present.`,
            "M21.0");
        } else if(lSig){
          const pattern=lv<0?"valgus":"varus";
          add("Knee Alignment",`Left knee ${pattern} — hip-knee-ankle misalignment (${lAbs.toFixed(1)}°)`,lAbs>10?"high":"moderate",
            lv<0?"Glute med: clamshells, lateral band walks. VMO: terminal knee extensions. Foot tripod.":"Hip ER strengthening. ITB/TFL SMR. Assess subtalar supination.","M21.0");
        } else {
          const pattern=rv<0?"valgus":"varus";
          add("Knee Alignment",`Right knee ${pattern} — hip-knee-ankle misalignment (${rAbs.toFixed(1)}°)`,rAbs>10?"high":"moderate",
            rv<0?"Glute med: clamshells, lateral band walks. VMO: terminal knee extensions. Foot tripod.":"Hip ER strengthening. ITB/TFL SMR. Assess subtalar supination.","M21.0");
        }
      }
    }
    if(m.ucsIndex!==null&&m.ucsIndex>0.6){
      add("Upper Crossed Syndrome",`UCS pattern (index ${m.ucsIndex.toFixed(1)})`,m.ucsIndex>1?"high":"moderate",
        "INHIBIT: upper trap, SCM, pec minor ×90s. ACTIVATE: deep neck flexors, lower trap Y-T-W, serratus. MOBILISE: thoracic extension T4–T8.","M62.9");
    }
    if(m.lldProxy!==null&&m.lldProxy>5){
      add("Leg Length",`Functional LLD suspected — ~${m.lldProxy.toFixed(0)}mm (${m.lldSide} shorter)`,m.lldProxy>10?"high":"moderate",
        "Confirm with tape measure ASIS→medial malleolus. If LLD >5mm: heel wedge trial 3–5mm. Treat SIJ/QL if functional.","M21.7");
    }

    // ── NEW Feature 2: Additional frontal findings ───────────────────────────

    // Neck lateral angle — scalene / thoracic outlet pathway
    if(m.neckLateralAngle!==null&&m.neckLateralAngle>4){
      const abs=m.neckLateralAngle, side=m.neckLateralSide||"";
      add("Neck / Cervical",
        `Neck lateral inclination — ${side} side (${abs.toFixed(1)}°, normal <4°)`,
        abs>8?"high":"moderate",
        `Scalene release ${side} side: lateral cervical stretch 30s×3. Screen thoracic outlet (Adson's test, Roos test 3min). Assess C3–C5 facet restriction. Activate ipsilateral deep neck flexors. Rule out accessory nerve involvement if trapezius wasting present. Confirm with clinical assessment — image proxy only.`,
        "M54.2");
    }

    // Waist triangle asymmetry — Adam's test / functional vs structural scoliosis
    if(m.waistTriangleAsymmetry!==null&&m.waistTriangleAsymmetry>3){
      const abs=m.waistTriangleAsymmetry, side=m.waistTriangleSide||"";
      add("Scoliosis / Waist Asymmetry",
        `Waist triangle asymmetry — ${side} narrower (${abs.toFixed(1)}%, normal <3%)`,
        abs>6?"high":"moderate",
        `Adam's forward bend test — observe for rib hump (structural) vs correction on bending (functional). Functional: treat lateral trunk shift driver (QL, hip abductors). Structural: refer for standing AP X-ray (true Cobb angle). Rib mobilisation T5–T10. Mirror biofeedback in standing. Confirm with clinical assessment — image proxy only.`,
        "M41.9");
    }

    // Ankle LLD proxy
    if(m.ankleLLDmm!==null&&m.ankleLLDmm>5){
      const abs=m.ankleLLDmm, side=m.ankleLLDSide||"";
      add("Leg Length Discrepancy",
        `Ankle height difference — ${side} higher (${abs.toFixed(0)}mm proxy, normal <5mm)`,
        abs>10?"high":"moderate",
        `Confirm with tape measure: ASIS to medial malleolus bilaterally. True LLD >5mm: trial heel wedge 3–5mm under shorter limb. Assess SIJ provocation (FABER, FADIR, compression). Treat QL overactivity elevated side. Screen for hip OA / femoral neck asymmetry. Ankle measurement sensitivity ±5–8mm — camera level critical. Confirm with clinical assessment — image proxy only.`,
        "M21.7");
    }

    // Tibial varum
    if((m.tibialVarumL!==null&&m.tibialVarumL>5)||(m.tibialVarumR!==null&&m.tibialVarumR>5)){
      const L=m.tibialVarumL??0, R=m.tibialVarumR??0;
      const worse=L>R?"Left":"Right", abs=Math.max(L,R);
      add("Tibial Varum",
        `Tibial bowing — ${worse} worse (L:${L.toFixed(1)}° R:${R.toFixed(1)}°, normal <5°)`,
        abs>10?"high":"moderate",
        `Root pronation compensation model: assess subtalar neutral, calcaneal eversion, forefoot varus. Prescribe foot orthotic with lateral wedge if pronation-driven. Strengthening: tibialis posterior, peroneals. If bilateral severe (>15°): refer for orthopaedic review — osteotomy threshold assessment. Rotation-sensitive measure — confirm clinically. Confirm with clinical assessment — image proxy only.`,
        "M21.1");
    }

    // Knee/ankle ratio — valgus/varus pattern
    if(m.kneeAnklePattern&&m.kneeAnklePattern!=="Normal"&&m.kneeAnkleRatio!==null){
      const isValgus=m.kneeAnklePattern==="Valgus";
      add("Knee Alignment Pattern",
        `Bilateral ${m.kneeAnklePattern.toLowerCase()} pattern (knee/ankle ratio ${m.kneeAnkleRatio.toFixed(2)}, normal 0.85–1.15)`,
        Math.abs(m.kneeAnkleRatio-1)>0.25?"high":"moderate",
        isValgus
          ? `Valgus: strengthen glute medius (clamshells, lateral band walks ×3 sets). VMO activation: terminal knee extensions, step-downs. Foot tripod loading. Assess hip ER range. Screen medial compartment OA if >40yo. Confirm with clinical assessment — image proxy only.`
          : `Varus: hip external rotator strengthening. ITB/TFL SMR 90s. Assess subtalar supination, lateral ankle instability. Screen lateral compartment OA. Consider foot orthotic. Confirm with clinical assessment — image proxy only.`,
        "M21.0");
    }

    // Carrying angle (cubitus valgus/varus)
    if((m.carryingAngleL!==null&&(m.carryingAngleL<5||m.carryingAngleL>15))||
       (m.carryingAngleR!==null&&(m.carryingAngleR<5||m.carryingAngleR>15))){
      const L=m.carryingAngleL, R=m.carryingAngleR;
      const flagL=L!==null&&(L<5||L>15), flagR=R!==null&&(R<5||R>15);
      const sides=[flagL?"Left":"",flagR?"Right":""].filter(Boolean).join(" & ");
      const abs=Math.max(L??0,R??0);
      add("Carrying Angle / Elbow",
        `Abnormal carrying angle — ${sides} (L:${L!==null?L.toFixed(1)+"°":"N/A"} R:${R!==null?R.toFixed(1)+"°":"N/A"}, normal 5–15°)`,
        abs>20?"high":"moderate",
        `Screen ulnar nerve: Tinel's sign at cubital tunnel, Froment's test for intrinsic weakness. Cubital tunnel syndrome: elbow padding, avoid sustained flexion >90°. Cubitus valgus >20°: refer for orthopaedic review. Arm position critical for this measure — recheck with arms relaxed at sides. Confirm with clinical assessment — image proxy only.`,
        "M79.2");
    }
  } // end if(!isLat)

  // Sagittal findings
  if(isLat){
    if(m.cvaAngle!==null&&m.cvaAngle<55){
      const abs=55-m.cvaAngle;
      const loadStr=m.cervicalLoadKg!==null?` Est. cervical load ~${m.cervicalLoadKg.toFixed(1)}kg (neutral 4.5kg).`:"";
      add("Cervical / CVA",`Forward head posture — CVA ${m.cvaAngle.toFixed(1)}° (normal >55°)`,m.cvaAngle<49?"high":"moderate",
        `DNF chin nod ×10 ×3 daily. Thoracic extension foam roller T4–T8. Pec minor stretch doorframe 30s×3. Monitor posture.${loadStr} Hansraj 2014 load model.`,
        "M43.1");
    }
    if(m.thoracicAngle!==null&&m.thoracicAngle>45){
      const abs=m.thoracicAngle-45;
      add("Thoracic Kyphosis",`Increased kyphosis (${m.thoracicAngle.toFixed(1)}°, normal 20–45°)`,m.thoracicAngle>55?"high":"moderate",
        "Thoracic extension foam roller T4–T8 ×2min. Pec stretch bilateral. Lower trap activation Y-T-W ×15. Postural cueing.","M40.0");
    }
    if(m.lumbarProxy!==null&&Math.abs(m.lumbarProxy)>5){
      const dir=m.lumbarProxy>0?"Anterior":"Posterior";
      add("Pelvis / Lumbar",`${dir} pelvic tilt (${Math.abs(m.lumbarProxy).toFixed(1)}%)`,Math.abs(m.lumbarProxy)>10?"high":"moderate",
        m.lumbarProxy>0
          ?"Hip flexor stretch (Thomas test position 30s×3). Glute activation: bridges ×20. Abdominal hollowing. QL release."
          :"Hamstring stretch 30s×3. Hip flexor activation. Lumbar extension mobility. Assess disc pathology.","M40.3");
    }
    if(m.hipExtensionProxy!==null&&Math.abs(m.hipExtensionProxy)>5){
      const dir=m.hipExtensionProxy>0?"anterior":"posterior";
      add("Hip / Global",`Hip displaced ${dir} to ankle plumb (${Math.abs(m.hipExtensionProxy).toFixed(1)}%)`,Math.abs(m.hipExtensionProxy)>10?"high":"moderate",
        "Assess hip flexor length (Thomas test). Retrain global sagittal alignment with mirror biofeedback.","M99.0");
    }
    if(m.leftKneeDev!==null&&m.leftKneeDev<-5){
      add("Knee",`Knee hyperextension / genu recurvatum (${Math.abs(m.leftKneeDev).toFixed(1)}°)`,m.leftKneeDev<-12?"high":"moderate",
        "Hamstring strengthening. Avoid terminal knee lock in stance. Beighton hypermobility screen. Proprioception training.","M21.1");
    }
    if(m.lcsIndex!==null&&m.lcsIndex>0.5){
      add("Lower Crossed Syndrome",`LCS pattern (index ${m.lcsIndex.toFixed(1)})`,m.lcsIndex>1?"high":"moderate",
        "INHIBIT: hip flexors, QL, thoracolumbar fascia. ACTIVATE: glutes (bridges), transverse abdominis. MOBILISE: hip flexor.","M62.9");
    }

    // ── UCS — sagittal flag (FHP + thoracic kyphosis) ────────────────────────
    // Triggers separately from the frontal UCS index: this fires on lateral view
    // when both CVA and thoracic angle are abnormal simultaneously (Janda pattern)
    const hasUCS_sag = m.cvaAngle!==null && m.cvaAngle<52
      && m.thoracicAngle!==null && m.thoracicAngle>45;
    if(hasUCS_sag){
      add("Upper Crossed Syndrome (UCS)",
        `UCS pattern — forward head (CVA ${m.cvaAngle.toFixed(0)}°) + thoracic kyphosis (${m.thoracicAngle.toFixed(0)}°)`,
        m.cvaAngle<45?"high":"moderate",
        `NKT Protocol — INHIBIT (90s SMR each): upper trapezius, SCM, scalenes, pec minor. ACTIVATE (3×15): deep cervical flexors (chin nod), lower trapezius (prone Y), serratus anterior (wall slide). CORRECT: thoracic extension foam roller T4–T8. Ergonomic: monitor at eye level, lumbar support. Home: hourly upper trap/pec minor stretch.`,
        "M62.8");
    }

    // ── LCS — sagittal flag (anterior pelvic tilt + kyphosis) ────────────────
    const hasLCS_sag = m.lumbarProxy!==null && m.lumbarProxy>5
      && m.thoracicAngle!==null && m.thoracicAngle>42;
    if(hasLCS_sag){
      add("Lower Crossed Syndrome (LCS)",
        `LCS pattern — anterior pelvic tilt (${m.lumbarProxy.toFixed(1)}%) + increased kyphosis`,
        m.lumbarProxy>10?"high":"moderate",
        `NKT Protocol — INHIBIT (90s SMR each): iliopsoas, rectus femoris, TFL. ACTIVATE (3×15): glute max (bridges with posterior tilt), glute med (clamshells), TVA (dead bug). CORRECT: pelvic tilt awareness drill ×20. Thomas test to confirm hip flexor contracture. Ely's test for RF tightness.`,
        "M62.8");
    }

    // ── SWAY-BACK ─────────────────────────────────────────────────────────────
    // Pattern: hips posterior to plumb + reduced lumbar curve
    const hipBehindPlumb = m.hipExtensionProxy!==null && m.hipExtensionProxy < -4;
    const hasReducedLordosis = m.lumbarProxy!==null && m.lumbarProxy < -3;
    if(hipBehindPlumb && hasReducedLordosis){
      add("Posture Pattern — Sway-Back",
        `Sway-back posture: hips posterior to plumb, flat lumbar`,
        "moderate",
        `INHIBIT: hamstrings (slump stretch, seated), abdominals (reduce over-bracing). ACTIVATE: hip flexors (psoas activation — standing hip flexion ×15), lumbar extensors (prone hip extension). Postural cue: shift hips forward over ankles. Lumbar roll support in sitting.`,
        "M40.3");
    }

    // ── MILITARY / FLAT BACK ──────────────────────────────────────────────────
    const isMilitary = m.thoracicAngle!==null && m.thoracicAngle<30
      && (m.lumbarProxy===null || Math.abs(m.lumbarProxy)<3)
      && (m.cvaAngle===null || m.cvaAngle>58);
    if(isMilitary){
      add("Posture Pattern — Military / Flat Back",
        `Flat-back posture: reduced thoracic kyphosis (${m.thoracicAngle.toFixed(0)}°) and lumbar lordosis`,
        "moderate",
        `Thoracic mobility: foam roller extension at T4–T8 ×2min daily. Rib expansion breathing ×10. Restore lordosis: McKenzie press-ups. Cervical retraction (NOT chin tuck). Reassure: flat-back is not always symptomatic — assess function.`,
        "M40.4");
    }

    // ── NAMED SAGITTAL PATTERN LABEL (Kendall classification) ─────────────────
    // Adds a single top-level pattern card summarising the overall sagittal type.
    // Only fires when a named pattern is identifiable (not for ideal alignment).
    {
      const hasFHP   = m.cvaAngle!==null && m.cvaAngle<52;
      const hasKyph  = m.thoracicAngle!==null && m.thoracicAngle>48;
      const hasLord  = m.lumbarProxy!==null && m.lumbarProxy>8;   // proxy for hyperlordosis
      const hasFlat  = m.lumbarProxy!==null && m.lumbarProxy < -5;
      const hasSway  = hipBehindPlumb && hasReducedLordosis;
      const hasMil   = isMilitary;

      let patternName = null, patternTx = null, patternNote = null, patternSev = null;

      if(hasSway){
        patternName = "Sway-Back Posture";
        patternSev  = "moderate";
        patternTx   = "Activate hip flexors. Shift hips forward over ankles. Lumbar extension mobility.";
        patternNote = "Hips posterior to plumb, flat lumbar, forward trunk lean. Hamstring/abdominal dominance.";
      } else if(hasMil){
        patternName = "Military / Flat-Back";
        patternSev  = "moderate";
        patternTx   = "Restore thoracic curve: foam roller extension. Restore lordosis: McKenzie.";
        patternNote = "All spinal curves diminished. Poor sagittal shock absorption.";
      } else if(hasFHP && hasKyph && hasLord){
        patternName = "Lordotic-Kyphotic (UCS + LCS)";
        patternSev  = "high";
        patternTx   = "Full postural correction programme. Address UCS and LCS simultaneously.";
        patternNote = `FHP (CVA ${m.cvaAngle.toFixed(0)}°) + hyperkyphosis (${m.thoracicAngle.toFixed(0)}°) + anterior pelvic tilt. Classic combined Upper and Lower Crossed Syndrome.`;
      } else if(hasKyph && hasLord){
        patternName = "Lordotic-Kyphotic Posture";
        patternSev  = "moderate";
        patternTx   = "Thoracic extension + hip flexor stretch + glute activation.";
        patternNote = `Thoracic kyphosis (${m.thoracicAngle.toFixed(0)}°) and anterior pelvic tilt both elevated. S-curve amplification.`;
      } else if(hasKyph && !hasLord){
        patternName = "Kyphotic Posture";
        patternSev  = "moderate";
        patternTx   = "Thoracic extension foam roller + lower trapezius + pec minor stretch.";
        patternNote = `Increased thoracic kyphosis (${m.thoracicAngle.toFixed(0)}°) as primary finding.`;
      } else if(hasLord && !hasKyph){
        patternName = "Lordotic Posture";
        patternSev  = "moderate";
        patternTx   = "Hip flexor inhibition + glute max activation + pelvic tilt awareness.";
        patternNote = "Hyperlordosis + anterior pelvic tilt. LCS pattern without significant thoracic component.";
      } else if(hasFlat){
        patternName = "Flat-Back Posture";
        patternSev  = "moderate";
        patternTx   = "McKenzie extension + lumbar roll support + erector facilitation.";
        patternNote = "Reduced lumbar lordosis. Disc anterior shear risk. Assess hamstring and abdominal dominance.";
      } else if(hasFHP && !hasKyph){
        patternName = "Forward Head Posture (Isolated)";
        patternSev  = "moderate";
        patternTx   = "DNF activation (chin nod ×10 ×3). Thoracic extension. Ergonomic screen and desk posture review.";
        patternNote = `FHP without significant thoracic kyphosis (CVA ${m.cvaAngle.toFixed(0)}°). Cervical extensor overactivation.`;
      }

      if(patternName!==null){
        add(
          `◈ Sagittal Pattern — ${patternName}`,
          `Classification: ${patternName}`,
          patternSev,
          patternTx,
          "Z96.89"
        );
        // Patch the last finding to carry the clinical note in correction field for display
        const last = out[out.length-1];
        last.detail = patternNote;
        last.norm   = "Ideal: ear over acromion over greater trochanter over lateral malleolus";
      }
    }
  } // end isLat

  // ── GLOBAL — all views ────────────────────────────────────────────────────
  if(m.posturalLoadIndex!==null && m.posturalLoadIndex>55){
    const pliContribs=[];
    if(Math.abs(m.shoulderAngle||0)>3) pliContribs.push(`Uneven shoulders (${Math.abs(m.shoulderAngle).toFixed(1)}°)`);
    if(Math.abs(m.pelvisAngle||0)>3)   pliContribs.push(`Uneven pelvis (${Math.abs(m.pelvisAngle).toFixed(1)}°)`);
    if(Math.abs(m.fhpNorm||0)>3)       pliContribs.push(`Head too far forward (${Math.abs(m.fhpNorm).toFixed(1)}%)`);
    if(Math.abs(m.trunkLateralShift||0)>4) pliContribs.push(`Body leaning sideways (${Math.abs(m.trunkLateralShift).toFixed(1)}%)`);
    if(Math.abs(m.cogDeviation||0)>4)  pliContribs.push(`Centre of gravity off (${Math.abs(m.cogDeviation).toFixed(1)}%)`);
    if(Math.abs(m.lumbarProxy||0)>4)   pliContribs.push(`Pelvic tilt / lower back curve (${Math.abs(m.lumbarProxy).toFixed(1)}%)`);
    if(Math.abs(m.scapularAsymm||0)>3) pliContribs.push(`Scapular asymmetry (${Math.abs(m.scapularAsymm).toFixed(1)}%)`);
    const pliLabel = m.posturalLoadIndex>80
      ? "Very High — multiple areas need attention"
      : m.posturalLoadIndex>65
      ? "High — several postural areas are stressed"
      : "Elevated — more than one area is affected";
    const pliDetail = pliContribs.length>0
      ? `Contributing factors:\n${pliContribs.map(c=>`• ${c}`).join("\n")}\n\nThis means the body is working harder than it should to stay balanced. Each problem adds up and increases joint strain over time.`
      : "Multiple small postural deviations adding up across body areas.";
    add("Global — Body Load Summary",
      `Overall postural load ${pliLabel} (PLI ${m.posturalLoadIndex}/100)`,
      m.posturalLoadIndex>75?"high":"moderate",
      `Start with the highest-priority finding above. Fixing one problem often reduces the overall load automatically. Aim for: 1 targeted exercise per area, 10–15 min daily. Re-assess in 4–6 weeks.`,
      "M62.9", pliDetail, "Target: PLI <35/100");
  }

  return out;
}

// ─── Score Engine ─────────────────────────────────────────────────────────────
function scorePosture(m, findings, reliability) {
  if(!m||!findings) return {score:0,band:"No Data",colour:PC.muted,subScores:null};
  let penalty=0;
  const P=(val,t1,t2,p1,p2)=>{if(val<=0)return;const n=Math.min(1,(val)/(Math.max(0.01,t2-t1)));penalty+=p1+(p2-p1)*n;};
  P(Math.abs(m.shoulderAngle||0),3,7,3,8);
  P(Math.abs(m.pelvisAngle||0),3,7,4,10);
  P(Math.abs(m.trunkLateralShift||0),3.5,7,4,9);
  P(Math.abs(m.headLateralOffset||0),2.5,6,3,7);
  P(Math.abs(m.scapularAsymm||0),2.5,5,2,5);
  P(Math.abs(m.cogDeviation||0),4,8,3,8);
  P(m.cvaAngle!==null?Math.max(0,55-m.cvaAngle):0,6,14,5,13);
  P((m.thoracicAngle||32)>45?(m.thoracicAngle||32)-45:0,8,18,4,10);
  P(Math.abs(m.lumbarProxy||0),4,9,3,8);
  P(Math.abs(m.leftKneeFrontal||0),5,10,3,7);
  P(Math.abs(m.rightKneeFrontal||0),5,10,3,7);
  findings.forEach((f,i)=>{
    const base=f.severity==="high"?8:f.severity==="moderate"?4:1;
    penalty+=base*Math.max(0.35,1-i*0.12);
  });
  const relFactor=0.5+((reliability?.score||50)/100)*0.5;
  penalty*=relFactor;
  const rawScore=clamp(Math.round(100-penalty),0,100);
  // PLI–score coherence: high PLI floors the score (can't score high with poor posture load)
  const pli=m.posturalLoadIndex??0;
  const pliBand=pli>70?0:pli>50?20:pli>35?40:pli>20?60:100;
  const score=clamp(Math.min(rawScore, pliBand+30),0,100);
  const band=score>=88?"Optimal":score>=74?"Good":score>=58?"Fair":score>=40?"Needs Attention":"Priority Review";
  const colour=score>=74?PC.green:score>=58?PC.yellow:PC.red;
  // Regional sub-scores
  const subScores={
    cervical: clamp(100-(m.cvaAngle!==null?Math.max(0,55-m.cvaAngle)*2.2:0)-Math.abs(m.headLateralOffset||0)*2.5,0,100),
    shoulder: clamp(100-Math.abs(m.shoulderAngle||0)*5-(m.scapularAsymm||0)*4,0,100),
    thoracic: clamp(100-Math.max(0,(m.thoracicAngle||32)-45)*2-Math.abs(m.trunkLateralShift||0)*3.5,0,100),
    lumbar:   clamp(100-Math.abs(m.lumbarProxy||0)*4.5-Math.abs(m.pelvisAngle||0)*4.5,0,100),
    knee:     clamp(100-Math.abs(m.leftKneeFrontal||0)*3.5-Math.abs(m.rightKneeFrontal||0)*3.5-Math.max(0,-(m.leftKneeDev||0)-5)*2.5-Math.max(0,-(m.rightKneeDev||0)-5)*2.5,0,100),
    global:   clamp(100-Math.abs(m.cogDeviation||0)*4.5-Math.abs(m.weightBearingShift||0)*3.5,0,100),
  };
  return {score,band,colour,subScores};
}

// ─── Multi-View Merge Engine ──────────────────────────────────────────────────
const VIEW_PLANE = { anterior:"frontal", posterior:"frontal", left:"sagittal", right:"sagittal" };

function mergeViewResults(viewResults) {
  if (!viewResults || viewResults.length === 0) return null;
  const capturedViews = viewResults.map(r => r.view);
  const hasFrontal  = capturedViews.some(v => VIEW_PLANE[v] === "frontal");
  const hasSagittal = capturedViews.some(v => VIEW_PLANE[v] === "sagittal");
  const coverage = { frontal: hasFrontal, sagittal: hasSagittal, viewCount: viewResults.length };

  // Group findings by region; confirmed = seen in ≥2 views
  const byRegion = {};
  viewResults.forEach(({ view, findings }) => {
    (findings || []).forEach(f => {
      if (!byRegion[f.region]) byRegion[f.region] = [];
      byRegion[f.region].push({ ...f, sourceView: view });
    });
  });

  const severityRank = { high:3, moderate:2, low:1 };
  const mergedFindings = Object.values(byRegion).map(group => {
    const best = group.reduce((a,b) => (severityRank[b.severity]||0) > (severityRank[a.severity]||0) ? b : a);
    const confirmed = group.length >= 2;
    return {
      ...best,
      confirmed,
      sourceViews: [...new Set(group.map(g => VIEWS[g.sourceView]?.short || g.sourceView))],
      severity: (!confirmed && best.severity === "high") ? "moderate" : best.severity,
    };
  });
  mergedFindings.sort((a,b) => {
    const rank = f => (f.confirmed?10:0) + (f.severity==="high"?3:f.severity==="moderate"?2:1);
    return rank(b) - rank(a);
  });

  // Composite score: average, capped at 80 if missing a plane
  const validScores = viewResults.filter(r => r.scoreData?.score != null);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((s,r) => s + r.scoreData.score, 0) / validScores.length) : 0;
  const coverageCap = (hasFrontal && hasSagittal) ? 100 : 80;
  const compositeScore = Math.min(avgScore, coverageCap);
  const compositeBand = compositeScore>=88?"Optimal":compositeScore>=74?"Good":compositeScore>=58?"Fair":compositeScore>=40?"Needs Attention":"Priority Review";
  const compositeColour = compositeScore>=74?PC.green:compositeScore>=58?PC.yellow:PC.red;

  // Sub-scores averaged across views
  const subKeys = ["cervical","shoulder","thoracic","lumbar","knee","global"];
  const subScores = {};
  subKeys.forEach(k => {
    const vals = viewResults.map(r => r.scoreData?.subScores?.[k]).filter(v => v != null);
    subScores[k] = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
  });

  // Named patterns
  const sagittalResult = viewResults.find(r => VIEW_PLANE[r.view] === "sagittal");
  const sagittalPattern = sagittalResult?.findings
    ?.find(f => f.region?.startsWith("◈ Sagittal Pattern"))?.text?.replace("Classification: ","") || null;
  const hasScoliosis  = mergedFindings.some(f => f.region?.includes("Scoliosis") && f.confirmed);
  const hasLLD        = mergedFindings.some(f => f.region?.includes("Leg Length") && f.confirmed);
  const hasUCS_front  = mergedFindings.some(f => f.region==="Upper Crossed Syndrome" && f.confirmed);
  const hasShoulderEl = mergedFindings.some(f => f.region==="Shoulder Girdle" && f.confirmed);
  const frontalPattern = hasScoliosis?"Scoliosis Pattern — refer for X-ray"
    :(hasUCS_front&&hasShoulderEl)?"Upper Crossed + Shoulder Asymmetry"
    :hasLLD?"Limb Length Discrepancy Pattern"
    :hasShoulderEl?"Coronal Asymmetry":null;

  const highCount      = mergedFindings.filter(f => f.severity==="high" && f.confirmed).length;
  const confirmedCount = mergedFindings.filter(f => f.confirmed).length;
  const planesCovered  = [hasFrontal&&"frontal", hasSagittal&&"sagittal"].filter(Boolean).join(" + ");
  let summary = `Assessment covers ${planesCovered} plane${coverage.viewCount>1?"s":""} (${coverage.viewCount} view${coverage.viewCount>1?"s":""}).`;
  summary += confirmedCount>0
    ? ` ${confirmedCount} finding${confirmedCount>1?"s":""} confirmed across multiple views${highCount>0?` — ${highCount} high priority`:""}.`
    : " No findings confirmed across multiple views.";
  if (!hasFrontal||!hasSagittal) summary += ` Add ${!hasFrontal?"a frontal":"a lateral"} view to complete the assessment.`;

  return { compositeScore, compositeBand, compositeColour, mergedFindings, coverage, subScores, sagittalPattern, frontalPattern, summary };
}

// ─── Canvas overlay renderer ──────────────────────────────────────────────────
// Helper: draw angle badge (small pill label on canvas)
function drawBadge(ctx, x, y, text, color) {
  const pad=4, fsize=11;
  ctx.font=`bold ${fsize}px sans-serif`;
  const tw=ctx.measureText(text).width;
  const bw=tw+pad*2, bh=fsize+pad*2;
  ctx.fillStyle="rgba(0,0,0,0.72)";
  ctx.beginPath();
  if(ctx.roundRect){
    ctx.roundRect(x-bw/2, y-bh/2, bw, bh, 4);
  } else {
    const rx=x-bw/2, ry=y-bh/2, r=4;
    ctx.moveTo(rx+r,ry); ctx.lineTo(rx+bw-r,ry); ctx.arcTo(rx+bw,ry,rx+bw,ry+r,r);
    ctx.lineTo(rx+bw,ry+bh-r); ctx.arcTo(rx+bw,ry+bh,rx+bw-r,ry+bh,r);
    ctx.lineTo(rx+r,ry+bh); ctx.arcTo(rx,ry+bh,rx,ry+bh-r,r);
    ctx.lineTo(rx,ry+r); ctx.arcTo(rx,ry,rx+r,ry,r); ctx.closePath();
  }
  ctx.fill();
  ctx.fillStyle=color||"#fff";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(text, x, y);
}

// Helper: draw a horizontal level line between two points with label
function drawLevelLine(ctx, x1, y1, x2, y2, color, label) {
  const my=(y1+y2)/2;
  ctx.save();
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.moveTo(x1,my); ctx.lineTo(x2,my); ctx.stroke();
  ctx.restore(); ctx.setLineDash([]);
  if(label){
    const mx=(x1+x2)/2;
    drawBadge(ctx, mx, my-12, label, color);
  }
}

function drawOverlay({ctx,W,H,lm,view,showGrid,measurements,clearFirst=false}) {
  if(!ctx||!lm) return;
  if(clearFirst) ctx.clearRect(0,0,W,H);
  const g=i=>lm[i];
  const V=i=>(lm[i]?.visibility||0)>=0.4;
  const PX=i=>lm[i]?[lm[i].x*W,lm[i].y*H]:null;
  const m=measurements||{};

  if(showGrid){
    ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=0.8;
    for(let c=0;c<=12;c++){const x=W/12*c;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let r=0;r<=16;r++){const y=H/16*r;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }

  const isLat=view==="left"||view==="right";

  // ── Plumb line ────────────────────────────────────────────────────────────
  if(!isLat){
    const hm=V(23)&&V(24)?{x:(g(23).x+g(24).x)/2,y:(g(23).y+g(24).y)/2}:null;
    const gx=hm?hm.x*W:W/2;
    ctx.save(); ctx.shadowColor="rgba(0,229,255,0.6)"; ctx.shadowBlur=8;
    ctx.setLineDash([10,6]); ctx.strokeStyle="rgba(0,229,255,0.95)"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke();
    ctx.restore(); ctx.setLineDash([]);
  } else {
    // ── Clinical Sagittal Plumb Line (Kendall / Sahrmann standard) ────────
    // Anchor: Lateral Malleolus. Passes through: Knee → G.Trochanter → L4/L5 → Acromion → EAM
    const side = view==="right";
    const iEar  = side?8:7;
    const iSh   = side?12:11;
    const iHip  = side?24:23;
    const iKnee = side?26:25;
    const iAnk  = side?28:27;
    const iHeel = side?30:29;

    // Lateral malleolus X: weighted avg of ankle + heel
    let plumbX = W/2;
    if(V(iAnk) && V(iHeel)){
      plumbX = lm[iAnk].x*W*0.6 + lm[iHeel].x*W*0.4;
    } else if(V(iAnk)){
      plumbX = lm[iAnk].x*W;
    } else if(V(iHeel)){
      plumbX = lm[iHeel].x*W;
    }

    // pixPerCm from measurements or height estimate
    const pixPerCm = m.pixPerCm || (H / 170);

    // Draw plumb line
    ctx.save();
    ctx.shadowColor="rgba(0,229,255,0.8)"; ctx.shadowBlur=14;
    ctx.setLineDash([10,6]); ctx.strokeStyle="rgba(0,229,255,1)"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(plumbX,0); ctx.lineTo(plumbX,H); ctx.stroke();
    ctx.shadowBlur=0; ctx.setLineDash([]); ctx.restore();

    // Clinical reference points — deviations in cm (Kendall 2005 norms)
    const segPts=[
      { idx:iEar,  label:"EAM",           normRange:2 },
      { idx:iSh,   label:"Acromion",      normRange:2 },
      { idx:iHip,  label:"G. Trochanter", normRange:2 },
      { idx:iKnee, label:"Knee",          normRange:2 },
    ].filter(s=>V(s.idx));

    segPts.forEach(({idx,label,normRange})=>{
      const pt=PX(idx); if(!pt) return;
      const devPx = pt[0]-plumbX;
      const devCm = devPx/pixPerCm;
      const absD  = Math.abs(devCm);
      const col   = absD<=normRange?"rgba(0,201,122,0.95)":absD<=normRange+2?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
      if(Math.abs(devPx)>6){
        ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.setLineDash([5,3]);
        ctx.beginPath(); ctx.moveTo(plumbX,pt[1]); ctx.lineTo(pt[0],pt[1]); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(pt[0],pt[1],5,0,Math.PI*2);
      ctx.fillStyle=col; ctx.fill();
      ctx.strokeStyle="#fff"; ctx.lineWidth=1.5; ctx.stroke();
      const sign=devCm>0?"A ":"P ";
      const badgeText=`${label}  ${sign}${Math.abs(devCm).toFixed(1)}cm`;
      ctx.font="bold 10px system-ui";
      const tw=ctx.measureText(badgeText).width;
      const onRight=pt[0]<W*0.6;
      const bx=onRight?pt[0]+9:pt[0]-tw-17, by=pt[1]-9;
      ctx.fillStyle="rgba(10,10,20,0.88)";
      if(ctx.roundRect) ctx.roundRect(bx,by,tw+8,17,4); else ctx.rect(bx,by,tw+8,17);
      ctx.fill(); ctx.fillStyle=col; ctx.textAlign="left";
      ctx.fillText(badgeText,bx+4,by+12);
    });

    // Lateral malleolus anchor dot
    if(V(iAnk)){
      const ankPt=PX(iAnk);
      ctx.beginPath(); ctx.arc(ankPt[0],ankPt[1],6,0,Math.PI*2);
      ctx.fillStyle="rgba(0,229,255,1)"; ctx.fill();
      ctx.strokeStyle="#fff"; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font="bold 9px system-ui"; ctx.fillStyle="rgba(0,229,255,1)"; ctx.textAlign="left";
      ctx.fillText("Lat. Malleolus",ankPt[0]+8,ankPt[1]+4);
    }

    // CVA (Cervical Vertebral Angle) — normal ≥52°
    if(V(iEar)&&V(iSh)){
      const earPt=PX(iEar), shPt=PX(iSh);
      const dx=earPt[0]-shPt[0], dy=earPt[1]-shPt[1];
      const cvaAngle=Math.abs(Math.atan2(Math.abs(dy),Math.abs(dx))*180/Math.PI);
      const cvaCol=cvaAngle>=52?"rgba(0,201,122,0.95)":cvaAngle>=45?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
      ctx.save(); ctx.strokeStyle=cvaCol; ctx.lineWidth=2; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(shPt[0],shPt[1]); ctx.lineTo(earPt[0],earPt[1]); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      const cvaText=`CVA ${cvaAngle.toFixed(1)}° ${cvaAngle>=52?"✓":"⚠"}`;
      ctx.font="bold 10px system-ui";
      const ctw=ctx.measureText(cvaText).width;
      const cx=earPt[0]<W*0.5?earPt[0]+8:earPt[0]-ctw-17, cy=earPt[1]-24;
      ctx.fillStyle="rgba(10,10,20,0.88)";
      if(ctx.roundRect) ctx.roundRect(cx,cy,ctw+8,17,4); else ctx.rect(cx,cy,ctw+8,17);
      ctx.fill(); ctx.fillStyle=cvaCol; ctx.textAlign="left";
      ctx.fillText(cvaText,cx+4,cy+12);
      // FHP in cm
      const fhpCm=Math.abs(dx)/pixPerCm;
      if(fhpCm>1.5){
        const fhpCol=fhpCm>2.5?"rgba(255,77,109,0.85)":"rgba(255,179,0,0.85)";
        ctx.save(); ctx.strokeStyle=fhpCol; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(shPt[0],earPt[1]); ctx.lineTo(earPt[0],earPt[1]); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        ctx.font="bold 9px system-ui";
        const fLabel=`FHP ${fhpCm.toFixed(1)}cm`;
        const ftw=ctx.measureText(fLabel).width;
        const fx=(earPt[0]+shPt[0])/2-ftw/2;
        ctx.fillStyle="rgba(10,10,20,0.88)";
        if(ctx.roundRect) ctx.roundRect(fx-4,earPt[1]-21,ftw+8,15,3); else ctx.rect(fx-4,earPt[1]-21,ftw+8,15);
        ctx.fill(); ctx.fillStyle=fhpCol; ctx.textAlign="left";
        ctx.fillText(fLabel,fx,earPt[1]-10);
      }
    }

    // Trunk inclination (shoulder-hip vs vertical) — normal 0-3°
    if(V(iSh)&&V(iHip)){
      const shPt=PX(iSh), hipPt=PX(iHip);
      const dx=shPt[0]-hipPt[0], dy=shPt[1]-hipPt[1];
      const trunkAngle=Math.atan2(dx,Math.abs(dy))*180/Math.PI;
      const taAbs=Math.abs(trunkAngle);
      const taCol=taAbs<=3?"rgba(0,201,122,0.95)":taAbs<=7?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
      const tDir=trunkAngle>0?"Ant":"Post";
      const taText=`Trunk ${tDir} ${taAbs.toFixed(1)}°`;
      const midX=(shPt[0]+hipPt[0])/2, midY=(shPt[1]+hipPt[1])/2;
      ctx.font="bold 9px system-ui";
      const ttw=ctx.measureText(taText).width;
      const tx=midX<W*0.5?midX+8:midX-ttw-16;
      ctx.fillStyle="rgba(10,10,20,0.88)";
      if(ctx.roundRect) ctx.roundRect(tx,midY-8,ttw+8,15,3); else ctx.rect(tx,midY-8,ttw+8,15);
      ctx.fill(); ctx.fillStyle=taCol; ctx.textAlign="left";
      ctx.fillText(taText,tx+4,midY+3);
    }

    // Knee sagittal angle — normal 0-5° flexion; <0 = recurvatum
    if(V(iHip)&&V(iKnee)&&V(iAnk)){
      const hipPt=PX(iHip), kneePt=PX(iKnee), ankPt2=PX(iAnk);
      const v1x=hipPt[0]-kneePt[0], v1y=hipPt[1]-kneePt[1];
      const v2x=ankPt2[0]-kneePt[0], v2y=ankPt2[1]-kneePt[1];
      const dot=v1x*v2x+v1y*v2y;
      const mag=Math.sqrt(v1x*v1x+v1y*v1y)*Math.sqrt(v2x*v2x+v2y*v2y);
      const kneeAngle=mag>0?Math.acos(Math.min(1,Math.max(-1,dot/mag)))*180/Math.PI:180;
      const kneeFlex=180-kneeAngle;
      const kCol=Math.abs(kneeFlex)<=5?"rgba(0,201,122,0.95)":kneeFlex<0?"rgba(255,77,109,0.95)":"rgba(255,179,0,0.95)";
      const kLabel=kneeFlex<-2?"Recurvatum":kneeFlex>5?"Flexion":"Normal";
      const kText=`Knee ${kneeFlex.toFixed(1)}° ${kLabel}`;
      ctx.font="bold 9px system-ui";
      const ktw=ctx.measureText(kText).width;
      const kx=kneePt[0]<W*0.5?kneePt[0]+8:kneePt[0]-ktw-16;
      ctx.fillStyle="rgba(10,10,20,0.88)";
      if(ctx.roundRect) ctx.roundRect(kx,kneePt[1]+6,ktw+8,15,3); else ctx.rect(kx,kneePt[1]+6,ktw+8,15);
      ctx.fill(); ctx.fillStyle=kCol; ctx.textAlign="left";
      ctx.fillText(kText,kx+4,kneePt[1]+17);
    }
  }

  // ── Skeleton connections ──────────────────────────────────────────────────
  const CONNECTIONS=[
    [11,12],[11,23],[12,24],[23,24],
    [11,13],[13,15],[12,14],[14,16],
    [23,25],[25,27],[24,26],[26,28],
    [27,29],[28,30],[27,31],[28,32],
    [7,8],[0,7],[0,8],
  ];
  ctx.strokeStyle="rgba(167,139,250,0.9)"; ctx.lineWidth=2.5; ctx.setLineDash([]);
  CONNECTIONS.forEach(([a,b])=>{
    if(!V(a)||!V(b)) return;
    const pa=PX(a), pb=PX(b); if(!pa||!pb) return;
    ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]); ctx.stroke();
  });

  // ── Joint dots ────────────────────────────────────────────────────────────
  const JOINTS=[0,7,8,11,12,13,14,23,24,25,26,27,28];
  JOINTS.forEach(i=>{
    if(!V(i)) return;
    const p=PX(i); if(!p) return;
    ctx.beginPath(); ctx.arc(p[0],p[1],6,0,Math.PI*2);
    ctx.fillStyle="rgba(167,139,250,0.95)"; ctx.fill();
    ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke();
  });

  // ── FRONTAL-ONLY overlays ─────────────────────────────────────────────────
  if(!isLat){
    // Head tilt line
    if(V(7)&&V(8)){
      const pL=PX(7), pR=PX(8);
      const tiltAbs=m.headTiltAngle!==null?Math.abs(m.headTiltAngle):null;
      const tiltColor=tiltAbs===null?"#aaa":tiltAbs>5?"#ff4d6d":tiltAbs>2?"#ffb300":"#00e5a0";
      ctx.save();
      ctx.strokeStyle=tiltColor; ctx.lineWidth=2.5; ctx.shadowColor=tiltColor; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(pL[0],pL[1]); ctx.lineTo(pR[0],pR[1]); ctx.stroke();
      ctx.restore();
      if(tiltAbs!==null){
        const mx=(pL[0]+pR[0])/2, my=(pL[1]+pR[1])/2-16;
        drawBadge(ctx, mx, my, `Tilt ${tiltAbs.toFixed(1)}°`, tiltColor);
      }
    }
    // Horizontal level lines
    const LEVELS=[
      {idxL:2,  idxR:5,  label:"Eyes",      color:"rgba(255,200,80,0.85)"},
      {idxL:7,  idxR:8,  label:"Ears",      color:"rgba(0,229,255,0.7)"},
      {idxL:11, idxR:12, label:"Shoulders", color:"rgba(147,51,234,0.8)"},
      {idxL:23, idxR:24, label:"ASIS",      color:"rgba(249,115,22,0.8)"},
      {idxL:25, idxR:26, label:"Knees",     color:"rgba(16,185,129,0.8)"},
      {idxL:27, idxR:28, label:"Ankles",    color:"rgba(99,102,241,0.8)"},
    ];
    LEVELS.forEach(({idxL,idxR,label,color})=>{
      if(!V(idxL)||!V(idxR)) return;
      const pL=PX(idxL), pR=PX(idxR);
      drawLevelLine(ctx, pL[0]-W*0.06, pL[1], pR[0]+W*0.06, pR[1], color, label);
    });
    // ASIS dashed rings
    [[23,"L.ASIS"],[24,"R.ASIS"]].forEach(([idx,lbl])=>{
      if(!V(idx)) return;
      const pt=PX(idx); if(!pt) return;
      ctx.strokeStyle="rgba(200,100,255,0.7)"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.arc(pt[0],pt[1],14,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      const tw=ctx.measureText(lbl).width;
      ctx.fillStyle="rgba(0,0,0,0.78)"; ctx.font="bold 8px system-ui"; ctx.textAlign="center";
      if(ctx.roundRect) ctx.roundRect(pt[0]-tw/2-4,pt[1]+16,tw+8,13,3); else ctx.rect(pt[0]-tw/2-4,pt[1]+16,tw+8,13);
      ctx.fill(); ctx.fillStyle="rgba(200,100,255,0.9)"; ctx.fillText(lbl,pt[0],pt[1]+27);
    });
    // Waist triangles
    if(V(11)&&V(13)&&V(23)&&V(12)&&V(14)&&V(24)){
      const pSL=PX(11),pEL=PX(13),pHL=PX(23),pSR=PX(12),pER=PX(14),pHR=PX(24);
      const asymm=m.waistTriangleAsymmetry||0;
      const fill=asymm>6?"rgba(255,77,109,0.18)":asymm>3?"rgba(255,179,0,0.15)":"rgba(0,229,160,0.12)";
      const strk=asymm>6?"rgba(255,77,109,0.5)":asymm>3?"rgba(255,179,0,0.4)":"rgba(0,229,160,0.35)";
      [[pSL,pEL,pHL],[pSR,pER,pHR]].forEach(([a,b,c])=>{
        ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.lineTo(c[0],c[1]); ctx.closePath();
        ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=strk; ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
      });
      if(asymm>3) drawBadge(ctx,(pSL[0]+pSR[0])/2,Math.min(pEL[1],pER[1])-22,`Waist ${asymm.toFixed(1)}%`,asymm>6?"#ff4d6d":"#ffb300");
    }
    // LLD arrow
    if(V(27)&&V(28)){
      const pL=PX(27), pR=PX(28), lldMm=m.ankleLLDmm;
      if(lldMm!==null&&lldMm>3){
        const higher=pL[1]<pR[1]?pL:pR, lower=pL[1]<pR[1]?pR:pL;
        const ax=Math.max(pL[0],pR[0])+W*0.04;
        const ac=lldMm>10?"#ff4d6d":lldMm>5?"#ffb300":"#aaa";
        ctx.save(); ctx.strokeStyle=ac; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(ax,higher[1]); ctx.lineTo(ax,lower[1]); ctx.stroke();
        const ah=7;
        [[higher[1],1],[lower[1],-1]].forEach(([y,d])=>{
          ctx.beginPath(); ctx.moveTo(ax,y); ctx.lineTo(ax-ah/2,y+ah*d); ctx.lineTo(ax+ah/2,y+ah*d); ctx.closePath(); ctx.fillStyle=ac; ctx.fill();
        });
        ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(higher[0],higher[1]); ctx.lineTo(ax,higher[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lower[0],lower[1]); ctx.lineTo(ax,lower[1]); ctx.stroke();
        ctx.restore(); ctx.setLineDash([]);
        drawBadge(ctx,ax+30,(higher[1]+lower[1])/2,`LLD ~${lldMm.toFixed(0)}mm`,ac);
      }
    }
    // Knee/ankle valgus-varus arc
    if(V(25)&&V(26)&&V(27)&&V(28)){
      const pKL=PX(25),pKR=PX(26),pAL=PX(27),pAR=PX(28);
      const ratio=m.kneeAnkleRatio, pattern=m.kneeAnklePattern;
      if(ratio!==null&&pattern!=="Normal"){
        const isValgus=pattern==="Valgus";
        const ac=isValgus?"rgba(249,115,22,0.85)":"rgba(99,102,241,0.85)";
        const kMx=(pKL[0]+pKR[0])/2, kMy=(pKL[1]+pKR[1])/2;
        const aMx=(pAL[0]+pAR[0])/2, aMy=(pAL[1]+pAR[1])/2;
        const midY=(kMy+aMy)/2;
        ctx.save(); ctx.strokeStyle=ac; ctx.lineWidth=2.5; ctx.setLineDash([5,4]);
        ctx.beginPath(); ctx.moveTo(kMx,kMy); ctx.quadraticCurveTo(isValgus?kMx-30:kMx+30,midY,aMx,aMy); ctx.stroke();
        ctx.restore(); ctx.setLineDash([]);
        drawBadge(ctx,isValgus?kMx-44:kMx+44,midY,pattern,ac);
      }
    }
    // Foot progression angle badges
    [[31,27,"L.Foot",0],[32,28,"R.Foot",1]].forEach(([fi,ai2,lbl,side])=>{
      if(!V(fi)||!V(ai2)) return;
      const fa=Math.abs(Math.atan2(g(fi).y-g(ai2).y, g(fi).x-g(ai2).x)*180/Math.PI);
      const col=fa<8?"rgba(0,201,122,0.9)":fa<20?"rgba(255,179,0,0.9)":"rgba(255,77,109,0.9)";
      const bx=side===0?6:W-72, by=H-30;
      ctx.fillStyle="rgba(6,9,15,0.85)";
      ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx,by,66,22,5); else ctx.rect(bx,by,66,22); ctx.fill();
      ctx.fillStyle=col; ctx.font="bold 9.5px system-ui"; ctx.textAlign="left";
      ctx.fillText(`${lbl} ${fa.toFixed(0)}°`,bx+5,by+15);
    });
  }

  // ── Stress heatmap (all views) ────────────────────────────────────────────
  const hotspots=[];
  const addHot=(idx,intensity)=>{ if(!V(idx)) return; const p=PX(idx); if(p) hotspots.push({x:p[0],y:p[1],r:45+intensity*20,intensity}); };
  if(Math.abs(m.shoulderAngle||0)>4) addHot(m.shoulderAngle>0?11:12, Math.min(1,Math.abs(m.shoulderAngle)/12));
  if(Math.abs(m.pelvisAngle||0)>3)   addHot(m.pelvisAngle>0?23:24,   Math.min(1,Math.abs(m.pelvisAngle)/10));
  if(Math.abs(m.headLateralOffset||0)>2.5) addHot(0, Math.min(1,Math.abs(m.headLateralOffset)/8));
  if(Math.abs(m.fhpNorm||0)>3)       addHot(0, Math.min(1,Math.abs(m.fhpNorm)/10));
  if(Math.abs(m.lumbarProxy||0)>4)   addHot(m.lumbarProxy>0?23:24, Math.min(1,Math.abs(m.lumbarProxy)/12));
  if(m.scapularAsymm&&m.scapularAsymm>3) addHot(11, Math.min(1,m.scapularAsymm/8));
  hotspots.forEach(({x,y,r,intensity})=>{
    const grad=ctx.createRadialGradient(x,y,0,x,y,r);
    const alpha=intensity*0.35;
    grad.addColorStop(0,`rgba(255,77,109,${alpha})`);
    grad.addColorStop(0.5,`rgba(255,140,0,${alpha*0.5})`);
    grad.addColorStop(1,"rgba(255,77,109,0)");
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  });
}

// ─── renderPostureOverlay — alias for drawOverlay used throughout app ──────────
// Maps the showHeatmap/showLabels/view params to drawOverlay signature
function renderPostureOverlay({ ctx, W, H, lm, measurements, showGrid, showHeatmap, showLabels, view }) {
  // Map view names to drawOverlay's expected format
  const viewMap = {
    anterior: "anterior", posterior: "posterior",
    left: "left", right: "right",
    frontal: "anterior", sagittal: "left",
    "sag l": "left", "sag r": "right",
    "sag_l": "left", "sag_r": "right",
  };
  const mappedView = viewMap[String(view || "anterior").toLowerCase()] || "anterior";
  drawOverlay({ ctx, W, H, lm, view: mappedView, showGrid: showGrid !== false, measurements: measurements || {} });
}


// ─── Manual overlay renderer ──────────────────────────────────────────────────
function drawManualOverlay({ctx, W, H, placed, pointDefs, connections, currentIdx}) {
  if (!ctx) return;
  const toCanvas = (p) => [p.x * W, p.y * H];

  // Draw connections between placed points
  ctx.strokeStyle = "rgba(0,229,255,0.6)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([]);
  connections.forEach(([a, b]) => {
    if (placed[a] && placed[b]) {
      const pa = toCanvas(placed[a]), pb = toCanvas(placed[b]);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
  });

  // Draw placed dots with numbers
  pointDefs.forEach(def => {
    const p = placed[def.id];
    if (!p) return;
    const [cx, cy] = toCanvas(p);
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,229,255,0.9)"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#000"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(def.id + 1), cx, cy);
  });

  // Highlight next point to place
  if (currentIdx !== undefined && currentIdx < pointDefs.length) {
    // pulsing ring hint — drawn as dashed circle at canvas centre placeholder
    // (actual pulse is CSS; here we just mark "next" label)
  }
}

// ─── Calibration helper ───────────────────────────────────────────────────────
// Computes pixPerCm from patient height and the head-to-heel landmark span.
// Call once per image/frame with the detected landmarks and known patient height.
function computeCalibration(lm, patientHeightCm, imgH) {
  if(!lm||!patientHeightCm||!imgH) return null;
  const V=i=>(lm[i]?.visibility||0)>=0.3;
  // Head (landmark 0) to heel midpoint (29,30)
  const headY  = V(0)  ? lm[0].y  : null;
  const heelY  = (V(29)&&V(30)) ? (lm[29].y+lm[30].y)/2
               : V(29) ? lm[29].y
               : V(30) ? lm[30].y : null;
  if(headY===null||heelY===null) return null;
  const spanNorm = Math.abs(heelY - headY);      // 0-1 normalised
  if(spanNorm < 0.3) return null;                // too small — likely partial body
  const spanPx = spanNorm * imgH;
  const pixPerCm = spanPx / patientHeightCm;
  return { pixPerCm, imgH, spanPx, patientHeightCm };
}

// ─── MediaPipe loader ─────────────────────────────────────────────────────────
function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${src}"]`)){res();return;}
    const s=document.createElement("script");
    s.src=src; s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}
const MP_CDN="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404";

// ─── View config ──────────────────────────────────────────────────────────────
const VIEWS={
  anterior:{label:"Frontal",short:"Frontal",badge:"+ Frontal plumb",colour:PC.accent,icon:"⬆",
    helper:"Patient faces camera, feet hip-width, arms relaxed.",
    checks:["Full body in frame","Camera at pelvis height","Feet hip-width apart","Arms relaxed","Minimal clothing"]},
  posterior:{label:"Back",short:"Back",badge:"+ Frontal plumb",colour:PC.a2,icon:"⬇",
    helper:"Patient faces away. Scapulae and heels visible.",
    checks:["Hair off shoulders","Scapulae visible","Equal weight both feet","Arms relaxed","Heel tendon visible"]},
  left:{label:"Sagittal L",short:"Sag L",badge:"+ Sagittal plumb",colour:PC.yellow,icon:"◀",
    helper:"Left side toward camera. Ear–shoulder–hip–ankle in frame.",
    checks:["Ear–shoulder–hip–ankle aligned","Neutral gaze","Knees not locked","Arms visible","Full body in frame"]},
  right:{label:"Sagittal R",short:"Sag R",badge:"+ Sagittal plumb",colour:PC.green,icon:"▶",
    helper:"Right side toward camera. Ear–shoulder–hip–ankle in frame.",
    checks:["Ear–shoulder–hip–ankle aligned","Neutral gaze","Knees not locked","Arms visible","Full body in frame"]},
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function PostureSparkline({sessions,colour=PC.accent}){
  const pts=sessions.filter(s=>s.score!==undefined).slice(-10);
  if(pts.length<2) return null;
  const vals=pts.map(p=>p.score);
  const mn=Math.min(...vals), mx=Math.max(...vals), range=mx-mn||1;
  const W=100, H=28;
  const xs=pts.map((_,i)=>(i/(pts.length-1))*W);
  const ys=vals.map(v=>H-((v-mn)/range)*H);
  const path=xs.map((x,i)=>`${i===0?"M":"L"}${x},${ys[i]}`).join(" ");
  return(
    <svg width={W} height={H} style={{display:"block"}}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={colour} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} L${xs[xs.length-1]},${H} L0,${H} Z`} fill="url(#sg)"/>
      <path d={path} stroke={colour} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <circle cx={xs[xs.length-1]} cy={ys[ys.length-1]} r="3" fill={colour}/>
    </svg>
  );
}


function ScoreRingBand({score,band,colour,size=80}){
  if(score===null||score===undefined||!colour) return null;
  const r=(size/2)-7, circ=2*Math.PI*r, dash=(score/100)*circ;
  return(
    <div style={{textAlign:"center"}}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${colour}25`} strokeWidth={9}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={9}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          fill={colour} fontSize={size>70?18:14} fontWeight={900}>{score}</text>
        <text x={size/2} y={size/2+14} textAnchor="middle" dominantBaseline="middle"
          fill={colour} fontSize={8} fontWeight={700}>{band?.slice?.(0,8)}</text>
      </svg>
    </div>
  );
}

// ─── Finding Card ─────────────────────────────────────────────────────────────

// ─── FindingsDisplay — Priority top 5 + show all toggle ──────────────────────
function FindingsDisplay({ findings, PC }) {
  const [showAll, setShowAll] = useState(false);

  if (!findings || findings.length === 0) return null;

  // Sort: confirmed first, then by severity
  const sevRank = { high: 3, moderate: 2, low: 1 };
  const sorted = [...findings].sort((a, b) => {
    const ca = (a.confirmed ? 10 : 0) + (sevRank[a.severity] || 0);
    const cb = (b.confirmed ? 10 : 0) + (sevRank[b.severity] || 0);
    return cb - ca;
  });

  const confirmed  = sorted.filter(f => f.confirmed);
  const singleView = sorted.filter(f => !f.confirmed);
  const top5       = sorted.slice(0, 5);
  const rest       = sorted.slice(5);
  const shown      = showAll ? sorted : top5;

  // Landmark confidence check — flag low-visibility metrics
  const lowConfMetrics = ["neck lateral inclination","carrying angle","tibial bowing","ankle height"];
  const hasLowConf = (text) => lowConfMetrics.some(m => text.toLowerCase().includes(m));

  return (
    <div style={{ marginTop: 4 }}>
      {/* Summary bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:"0.62rem", fontWeight:700, color:PC.muted, textTransform:"uppercase", letterSpacing:"1px" }}>
          Clinical Findings
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {confirmed.length > 0 && (
            <span style={{ fontSize:"0.58rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
              background: PC.green+"15", color: PC.green, border:`1px solid ${PC.green}33` }}>
              ✓ {confirmed.length} confirmed
            </span>
          )}
          {singleView.length > 0 && (
            <span style={{ fontSize:"0.58rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
              background: PC.muted+"15", color: PC.muted, border:`1px solid ${PC.border}` }}>
              ○ {singleView.length} single-view
            </span>
          )}
        </div>
      </div>

      {/* Priority findings */}
      {shown.map((f, i) => {
        const isConfirmed = f.confirmed;
        const isLowConf   = hasLowConf(f.text || "");
        const col = f.severity==="high" ? PC.red : f.severity==="moderate" ? PC.yellow : PC.green;
        return (
          <FindingCardV2 key={i} f={f} col={col}
            isConfirmed={isConfirmed} isLowConf={isLowConf} PC={PC}/>
        );
      })}

      {/* Show all / Show less toggle */}
      {rest.length > 0 && (
        <button onClick={() => setShowAll(s => !s)}
          style={{ width:"100%", padding:"9px", marginTop:6, borderRadius:9,
            border:`1px solid ${PC.border}`, background: PC.s2,
            color: PC.muted, fontSize:"0.7rem", fontWeight:700, cursor:"pointer" }}>
          {showAll
            ? `▲ Show primary findings only`
            : `▼ Show all ${rest.length} additional findings`}
        </button>
      )}

      {/* Clinical note */}
      <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8,
        background: PC.accent+"08", border:`1px solid ${PC.border}`,
        fontSize:"0.62rem", color:PC.muted, lineHeight:1.5 }}>
        ✓ Confirmed = seen in ≥2 views · ○ Single-view = verify clinically ·
        ⚡ Low confidence = verify with goniometer
      </div>
    </div>
  );
}

// ─── FindingCardV2 — Enhanced with confidence badge ──────────────────────────
function FindingCardV2({ f, col, isConfirmed, isLowConf, PC }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)}
      style={{ border:`1px solid ${col}30`, borderRadius:10, padding:"10px 12px",
        marginBottom:7, background:`${col}08`, cursor:"pointer",
        opacity: isConfirmed ? 1 : 0.82 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
        {/* Severity dot */}
        <div style={{ width:8, height:8, borderRadius:"50%", background:col,
          marginTop:5, flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"0.72rem", fontWeight:700, color:PC.text, lineHeight:1.3 }}>
            {f.text}
          </div>
          <div style={{ fontSize:"0.6rem", color:PC.muted, marginTop:2 }}>
            {f.region} · {f.icd}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
          {/* Severity */}
          <span style={{ fontSize:"0.6rem", color:col, fontWeight:700 }}>
            {f.severity?.toUpperCase()}
          </span>
          {/* Confidence badge */}
          {isConfirmed && (
            <span style={{ fontSize:"0.55rem", fontWeight:700, padding:"1px 5px", borderRadius:99,
              background: PC.green+"20", color: PC.green, border:`1px solid ${PC.green}44` }}>
              ✓ CONFIRMED
            </span>
          )}
          {isLowConf && (
            <span style={{ fontSize:"0.55rem", fontWeight:700, padding:"1px 5px", borderRadius:99,
              background: PC.yellow+"20", color: PC.yellow, border:`1px solid ${PC.yellow}44` }}>
              ⚡ VERIFY
            </span>
          )}
          {!isConfirmed && !isLowConf && (
            <span style={{ fontSize:"0.55rem", fontWeight:700, padding:"1px 5px", borderRadius:99,
              background: PC.muted+"15", color: PC.muted, border:`1px solid ${PC.border}` }}>
              ○ SINGLE VIEW
            </span>
          )}
          <div style={{ color:PC.muted, fontSize:"0.8rem" }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${col}20`,
          fontSize:"0.68rem", color:PC.muted, lineHeight:1.6 }}>
          {f.detail && (
            <div style={{ marginBottom:6, fontStyle:"italic", color:PC.muted }}>{f.detail}</div>
          )}
          {f.correction && (
            <div><strong style={{ color:col }}>Treatment: </strong>{f.correction}</div>
          )}
          {f.norm && (
            <div style={{ marginTop:5, fontSize:"0.6rem", fontStyle:"italic" }}>
              Reference: {f.norm}
            </div>
          )}
          {isLowConf && (
            <div style={{ marginTop:6, padding:"4px 8px", borderRadius:6,
              background: PC.yellow+"12", color: PC.yellow, fontSize:"0.6rem", fontWeight:600 }}>
              ⚡ Landmark confidence may be affected by lighting or clothing.
              Verify with goniometry or clinical assessment.
            </div>
          )}
          {f.sourceViews && f.sourceViews.length > 0 && (
            <div style={{ marginTop:5, fontSize:"0.6rem", color:PC.accent }}>
              Views: {f.sourceViews.join(" + ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FindingCard({f}){
  const [open,setOpen]=useState(false);
  const col=f.severity==="high"?PC.red:f.severity==="moderate"?PC.yellow:PC.green;
  return(
    <div onClick={()=>setOpen(o=>!o)} style={{border:`1px solid ${col}30`,borderRadius:10,padding:"10px 12px",marginBottom:7,background:`${col}08`,cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:col,marginTop:5,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{f.text}</div>
          <div style={{fontSize:"0.6rem",color:PC.muted,marginTop:2}}>{f.region} · {f.icd}</div>
        </div>
        <div style={{fontSize:"0.65rem",color:col,fontWeight:700,flexShrink:0}}>{f.severity?.toUpperCase()}</div>
        <div style={{color:PC.muted,fontSize:"0.8rem"}}>{open?"▲":"▼"}</div>
      </div>
      {open&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${col}20`,fontSize:"0.68rem",color:PC.muted,lineHeight:1.6}}>
          {f.detail&&<div style={{marginBottom:6,fontStyle:"italic",color:PC.muted}}>{f.detail}</div>}
          <div><strong style={{color:col}}>Treatment: </strong>{f.correction}</div>
          {f.norm&&<div style={{marginTop:5,fontSize:"0.6rem",fontStyle:"italic"}}>Reference: {f.norm}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
function MetricRow({label,value,unit,normal,abnormal}){
  if(value===null||value===undefined) return null;
  const abs=Math.abs(value);
  const isAbnormal=abnormal?abs>abnormal:false;
  const isModerate=normal?abs>normal:false;
  const col=isAbnormal?PC.red:isModerate?PC.yellow:PC.green;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
      <div style={{flex:1,fontSize:"0.68rem",color:PC.muted}}>{label}</div>
      <div style={{fontSize:"0.75rem",fontWeight:800,color:col,minWidth:60,textAlign:"right"}}>{typeof value==="number"?value.toFixed(1):value}{unit}</div>
      <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 ─── Clinical Reasoning Engines
// ─────────────────────────────────────────────────────────────────────────────

// ── Muscle Imbalance Engine ───────────────────────────────────────────────────
// Maps each finding region key → { tight: [...], weak: [...] }
const MUSCLE_MAP = {
  // Frontal
  "Shoulder Girdle":          { tight:["Upper Trapezius","Levator Scapulae"],                  weak:["Lower Trapezius","Serratus Anterior","Rhomboids"] },
  "Head / Cervical":          { tight:["SCM (ipsilateral)","Scalenes (ipsilateral)"],           weak:["Deep Cervical Flexors","Contralateral SCM"] },
  "Pelvis / SIJ":             { tight:["QL (elevated side)","Hip Abductors (elevated side)"],   weak:["Glute Med (low side)","Hip Abductors (low side)"] },
  "Thoracic":                 { tight:["QL (lean side)","Lateral Abdominals"],                  weak:["Contralateral QL","Lateral Trunk Stabilisers"] },
  "Spine":                    { tight:["Paraspinals (concave side)","QL"],                      weak:["Contralateral Paraspinals","TVA"] },
  "Scoliosis Screen":         { tight:["Paraspinals (concave side)","QL"],                      weak:["Contralateral Paraspinals","TVA"] },
  "Knee":                     { tight:["TFL / ITB","Adductors"],                                weak:["Glute Medius","VMO","Tibialis Anterior"] },
  "Leg Length":               { tight:["QL (short side)","Hip Flexors (long side)"],            weak:["Glute Med (short side)","Hip Abductors"] },
  "Upper Crossed Syndrome":   { tight:["Upper Trapezius","Levator Scapulae","SCM","Pec Minor"], weak:["Deep Cervical Flexors","Lower Trapezius","Serratus Anterior"] },
  "Knee Alignment Pattern":   { tight:["TFL / ITB","Adductors (valgus) / Peroneals (varus)"],  weak:["Glute Medius","VMO","Tibialis Posterior"] },
  "Neck / Cervical":          { tight:["Scalenes","SCM","Upper Trapezius"],                     weak:["Deep Cervical Flexors","Lower Trap"] },
  // Sagittal
  "Cervical / CVA":           { tight:["Suboccipitals","Cervical Extensors","Pec Minor"],       weak:["Deep Cervical Flexors (DNF)","Lower Trapezius","Serratus Anterior"] },
  "Thoracic Kyphosis":        { tight:["Pectorals Major/Minor","Upper Trapezius","SCM"],        weak:["Lower Trapezius","Rhomboids","Mid Thoracic Extensors"] },
  "Pelvis / Lumbar":          { tight:["Iliopsoas","Rectus Femoris","TFL","QL"],                weak:["Glute Max","Transverse Abdominis","Hamstrings"] },
  "Hip / Global":             { tight:["Hip Flexors","Lumbar Extensors"],                       weak:["Glute Max","Abdominals"] },
  "Lower Crossed Syndrome":   { tight:["Iliopsoas","Rectus Femoris","TFL","Thoracolumbar Fascia"], weak:["Glute Max","Glute Med","Transverse Abdominis"] },
  "Lower Crossed Syndrome (LCS)": { tight:["Iliopsoas","Rectus Femoris","TFL","Thoracolumbar Fascia"], weak:["Glute Max","Glute Med","Transverse Abdominis"] },
  "Upper Crossed Syndrome (UCS)": { tight:["Upper Trapezius","Levator Scapulae","SCM","Pec Minor","Scalenes"], weak:["Deep Cervical Flexors","Lower Trapezius","Serratus Anterior","Mid Thoracic Extensors"] },
  "Posture Pattern — Sway-Back": { tight:["Hamstrings","Abdominals","Hip Extensors"],          weak:["Hip Flexors (Iliopsoas)","Lumbar Extensors"] },
  "Posture Pattern — Military / Flat Back": { tight:["Abdominals","Hamstrings"],               weak:["Thoracic Extensors","Lumbar Extensors","Hip Flexors"] },
  "Tibial Varum":             { tight:["Peroneals","Gastrocnemius/Soleus"],                     weak:["Tibialis Posterior","Tibialis Anterior"] },
  "Ankle":                    { tight:["Gastrocnemius","Soleus"],                               weak:["Tibialis Anterior","Peroneals"] },
  "Knee (Sagittal)":          { tight:["TFL / ITB","Rectus Femoris"],                           weak:["Glute Med","VMO","Hamstrings"] },
};

function buildMuscleImbalance(findings) {
  const tightSet = new Map(); // muscle → [regions]
  const weakSet  = new Map();

  findings.forEach(f => {
    // Try exact region match, then prefix match for named patterns
    let key = f.region;
    let entry = MUSCLE_MAP[key];
    if (!entry) {
      // Try prefix match (e.g. "◈ Sagittal Pattern — Lordotic-Kyphotic" → check "Pelvis / Lumbar" etc)
      const matchKey = Object.keys(MUSCLE_MAP).find(k => key.includes(k) || k.includes(key.replace(/◈\s*/,"")));
      if (matchKey) entry = MUSCLE_MAP[matchKey];
    }
    if (!entry) return;

    const sev = f.severity === "high" ? "●" : "●";
    entry.tight.forEach(m => {
      if (!tightSet.has(m)) tightSet.set(m, []);
      tightSet.get(m).push({ region: f.region, sev });
    });
    entry.weak.forEach(m => {
      if (!weakSet.has(m)) weakSet.set(m, []);
      weakSet.get(m).push({ region: f.region, sev });
    });
  });

  // Sort: muscles flagged by high-severity findings first
  const sort = map => [...map.entries()]
    .sort((a,b) => {
      const aHigh = a[1].some(x=>x.sev==="●") ? 1 : 0;
      const bHigh = b[1].some(x=>x.sev==="●") ? 1 : 0;
      return bHigh - aHigh || b[1].length - a[1].length;
    });

  return { tight: sort(tightSet), weak: sort(weakSet) };
}

// ── Special Tests Engine ──────────────────────────────────────────────────────
const SPECIAL_TESTS_MAP = {
  "Shoulder Girdle":          [
    { name:"Apley Scratch Test",   purpose:"Shoulder ROM — reaching ability bilaterally" },
    { name:"Shoulder Shrug Test",  purpose:"Upper trap / levator overactivation" },
    { name:"Lower Trap Test",      purpose:"Lower trapezius force couple strength (prone Y)" },
  ],
  "Head / Cervical":          [
    { name:"Cervical Rotation AROM", purpose:"C1–C2 restriction screen (normal >80° each side)" },
    { name:"Cervical Lateral Flexion AROM", purpose:"Scalene/SCM length asymmetry" },
    { name:"Deep Neck Flexor Endurance Test", purpose:"DNF weakness — hold chin nod in supine (normal >38s)" },
  ],
  "Neck / Cervical":          [
    { name:"Adson's Test",         purpose:"Thoracic outlet — anterior scalene compression" },
    { name:"Roos Test (EAST)",     purpose:"Thoracic outlet — 3 min overhead arm elevation" },
    { name:"Spurling's Test",      purpose:"Cervical nerve root compression / foraminal stenosis" },
  ],
  "Cervical / CVA":           [
    { name:"Deep Neck Flexor Endurance Test", purpose:"DNF strength — chin nod hold in supine (normal >38s)" },
    { name:"Cranio-Cervical Flexion Test", purpose:"DNF activation pattern (pressure biofeedback)" },
    { name:"Cervical Retraction AROM", purpose:"Assess available retraction range" },
  ],
  "Pelvis / SIJ":             [
    { name:"FABER (Patrick's) Test", purpose:"SIJ / hip pathology provocation" },
    { name:"FADIR Test",           purpose:"Hip impingement / labral pathology screen" },
    { name:"SIJ Compression Test", purpose:"SIJ provocation" },
    { name:"Trendelenburg Test",   purpose:"Glute med weakness — single-leg stance" },
  ],
  "Pelvis / Lumbar":          [
    { name:"Thomas Test",          purpose:"Hip flexor contracture — iliopsoas / rectus femoris" },
    { name:"Ely's Test",           purpose:"Rectus femoris tightness — prone knee bend" },
    { name:"Modified Ober Test",   purpose:"TFL / ITB tightness" },
    { name:"FABER Test",           purpose:"SIJ / hip provocation" },
  ],
  "Hip / Global":             [
    { name:"Thomas Test",          purpose:"Hip flexor length — passive hip extension in supine" },
    { name:"Hip Extension Prone",  purpose:"Glute max firing pattern — timing vs hamstrings" },
    { name:"Trendelenburg Test",   purpose:"Glute medius weakness" },
  ],
  "Thoracic Kyphosis":        [
    { name:"Pec Minor Length Test", purpose:"Assess pec minor shortening — supine shoulder drop" },
    { name:"Wall Angel Test",      purpose:"Thoracic mobility and scapular upward rotation" },
    { name:"Thoracic Extension ROM", purpose:"Foam roller passive extension range (T4–T8)" },
  ],
  "Upper Crossed Syndrome":   [
    { name:"Deep Neck Flexor Endurance Test", purpose:"DNF endurance (chin nod hold)" },
    { name:"Lower Trap Test",      purpose:"Lower trap strength in prone Y" },
    { name:"Pec Minor Length",     purpose:"Supine: shoulder blade drop to table bilaterally" },
    { name:"Wall Angel Test",      purpose:"Combined thoracic + scapular mobility screen" },
  ],
  "Upper Crossed Syndrome (UCS)": [
    { name:"Deep Neck Flexor Endurance Test", purpose:"DNF endurance (chin nod hold, normal >38s)" },
    { name:"Lower Trap Test",      purpose:"Lower trap strength — prone Y position" },
    { name:"Pec Minor Length",     purpose:"Supine shoulder drop test — bilaterally compare" },
    { name:"Adson's / Roos Test",  purpose:"Rule out thoracic outlet component" },
  ],
  "Lower Crossed Syndrome":   [
    { name:"Thomas Test",          purpose:"Hip flexor contracture confirmation" },
    { name:"Ely's Test",           purpose:"Rectus femoris tightness — prone knee bend" },
    { name:"Bridge with Posterior Tilt", purpose:"Glute max activation pattern" },
    { name:"Dead Bug",             purpose:"TVA endurance and lumbopelvic control" },
  ],
  "Lower Crossed Syndrome (LCS)": [
    { name:"Thomas Test",          purpose:"Hip flexor contracture — iliopsoas / RF" },
    { name:"Ely's Test",           purpose:"RF tightness — prone knee flexion" },
    { name:"Modified Ober Test",   purpose:"TFL / ITB tightness" },
    { name:"Hip Extensor Firing Pattern", purpose:"Glute max vs hamstring dominance" },
  ],
  "Knee":                     [
    { name:"Valgus Stress Test",   purpose:"MCL integrity / medial instability" },
    { name:"VMO Activation Test",  purpose:"Single leg terminal knee extension — VMO bulk" },
    { name:"Single-Leg Squat",     purpose:"Functional valgus / glute med weakness under load" },
    { name:"Beighton Score",       purpose:"Generalised hypermobility — 9-point screen" },
  ],
  "Knee Alignment Pattern":   [
    { name:"Single-Leg Squat",     purpose:"Dynamic valgus / varus under load" },
    { name:"Trendelenburg Test",   purpose:"Glute med weakness driving valgus" },
    { name:"Ober Test",            purpose:"ITB / TFL tightness (varus pattern)" },
    { name:"Subtalar Neutral Test", purpose:"Foot pronation driving valgus" },
  ],
  "Leg Length":               [
    { name:"Tape Measure LLD",     purpose:"True LLD: ASIS → medial malleolus bilaterally" },
    { name:"Supine-to-Sit Test",   purpose:"Functional vs true LLD differentiation" },
    { name:"FABER Test",           purpose:"SIJ involvement with LLD" },
    { name:"Pelvic Landmark Palpation", purpose:"Iliac crest height bilaterally in standing" },
  ],
  "Scoliosis Screen":         [
    { name:"Adam's Forward Bend Test", purpose:"Rib hump — structural vs functional scoliosis" },
    { name:"Scoliometer / Inclinometer", purpose:"Angle of trunk rotation (ATR) — >5° refers for X-ray" },
    { name:"Leg Length Measurement", purpose:"LLD as scoliosis driver" },
  ],
  "Spine":                    [
    { name:"Adam's Forward Bend Test", purpose:"Structural scoliosis screen — rib hump" },
    { name:"C7 Plumb Line",        purpose:"Coronal balance — spinous process alignment" },
  ],
  "Tibial Varum":             [
    { name:"Subtalar Neutral Assessment", purpose:"Forefoot varus / calcaneal eversion compensation" },
    { name:"Weight-Bearing Foot Posture", purpose:"Pronation / supination index" },
  ],
  "Posture Pattern — Sway-Back": [
    { name:"Thomas Test",          purpose:"Hip flexor weakness confirmation" },
    { name:"Hamstring Length Test (SLR)", purpose:"Hamstring shortening contribution to sway-back" },
    { name:"Abdominal Bracing Test", purpose:"Over-bracing pattern assessment" },
  ],
};

function buildSpecialTests(findings) {
  const testMap = new Map(); // test name → { purpose, regions[] }

  findings.forEach(f => {
    let key = f.region;
    let tests = SPECIAL_TESTS_MAP[key];
    if (!tests) {
      const matchKey = Object.keys(SPECIAL_TESTS_MAP).find(k =>
        key.includes(k) || k.includes(key.replace(/◈\s*/,""))
      );
      if (matchKey) tests = SPECIAL_TESTS_MAP[matchKey];
    }
    if (!tests) return;

    tests.forEach(t => {
      if (!testMap.has(t.name)) testMap.set(t.name, { purpose: t.purpose, regions: [] });
      testMap.get(t.name).regions.push(f.region);
    });
  });

  return [...testMap.entries()].map(([name,{purpose,regions}]) => ({ name, purpose, regions }));
}

// ── Exercise Plan Engine ──────────────────────────────────────────────────────
// Converts findings → deduplicated, phased, numbered exercise programme
const EXERCISE_MAP = {
  "Shoulder Girdle":        [
    { phase:1, name:"Upper Trapezius SMR",         sets:"90s each side", cue:"Foam roller / lacrosse ball — superior trap between neck and shoulder. Slow sustained pressure.", category:"inhibit" },
    { phase:1, name:"Levator Scapulae Stretch",    sets:"3×30s",         cue:"Head down and away 45°. Gentle overpressure with same-side hand on back of head.", category:"inhibit" },
    { phase:2, name:"Prone Y (Lower Trap)",        sets:"3×15",          cue:"Prone, arms in Y position. Lift arms thumbs-up — feel mid-back, not neck. Hold 2s.", category:"activate" },
    { phase:2, name:"Wall Slide (Serratus)",       sets:"3×12",          cue:"Back flat on wall, arms in W. Slide up to Y maintaining contact. Breathe normally.", category:"activate" },
  ],
  "Head / Cervical":        [
    { phase:1, name:"SCM / Scalene Stretch",       sets:"3×30s/side",    cue:"Tilt head away, rotate slightly toward. Anchor shoulder by holding chair.", category:"inhibit" },
    { phase:2, name:"Chin Nod (DNF Activation)",   sets:"3×10 holds 10s",cue:"Supine, small chin nod — 'yes' motion only. Do NOT lift head. Feel deep neck muscles.", category:"activate" },
  ],
  "Neck / Cervical":        [
    { phase:1, name:"Scalene Release",             sets:"90s/side",      cue:"Side-lying, finger-tip release to anterior neck. Very gentle. Breathe into the tension.", category:"inhibit" },
    { phase:2, name:"Chin Nod (DNF Activation)",   sets:"3×10 holds 10s",cue:"Supine, gentle nod — not a full crunch. Long neck, not tucked.", category:"activate" },
  ],
  "Cervical / CVA":         [
    { phase:1, name:"Suboccipital Release",        sets:"5min",          cue:"Supine, fingertips at base of skull, let head sink. Gentle, no traction.", category:"inhibit" },
    { phase:1, name:"Pec Minor Stretch",           sets:"3×30s",         cue:"Doorframe at 90° elbow. Lean forward gently. Feel front of shoulder.", category:"inhibit" },
    { phase:2, name:"Chin Nod (DNF)",              sets:"3×10 holds 10s",cue:"Supine. Small nod, NOT a crunch. Maintain length. Build to 10-second holds.", category:"activate" },
    { phase:3, name:"Thoracic Extension (T4–T8)",  sets:"2min",          cue:"Foam roller across mid-back, arms crossed on chest, head supported. Let gravity extend.", category:"correct" },
  ],
  "Thoracic Kyphosis":      [
    { phase:1, name:"Thoracic Extension Foam Roller",sets:"2×2min T4–T8",cue:"Roller across mid-back. Arms crossed. Support head. Let gravity do the work.", category:"correct" },
    { phase:1, name:"Pec Stretch (Bilateral)",     sets:"3×30s",         cue:"Doorframe, forearm at 90°. Lean forward gently.", category:"inhibit" },
    { phase:2, name:"Prone Y–T–W",                 sets:"3×10 each",     cue:"Prone, lift arms in Y, T, then W shape. Light — this is activation, not load.", category:"activate" },
    { phase:2, name:"Band Pull-Apart",             sets:"3×15",          cue:"Resistance band at shoulder height, arms straight. Pull to chest. Squeeze mid-back.", category:"activate" },
  ],
  "Pelvis / Lumbar":        [
    { phase:1, name:"Hip Flexor Stretch (Thomas)",  sets:"3×30s/side",   cue:"One knee on floor, other foot forward. Tuck pelvis under first, THEN lunge forward.", category:"inhibit" },
    { phase:1, name:"QL Release",                  sets:"90s/side",      cue:"Side-lying over foam roller at iliac crest level. Very tender area — go slowly.", category:"inhibit" },
    { phase:2, name:"Glute Bridge",                sets:"3×20",          cue:"Supine, feet flat, drive hips up. Squeeze glutes at top, posterior pelvic tilt cue.", category:"activate" },
    { phase:2, name:"Dead Bug (TVA)",              sets:"3×8/side",      cue:"Supine, arms/knees up. Flatten back to floor — hold. Slowly lower opposite arm+leg.", category:"activate" },
  ],
  "Hip / Global":           [
    { phase:1, name:"Hip Flexor Stretch",          sets:"3×30s/side",    cue:"Kneeling lunge. Posterior pelvic tilt first. Shift weight forward slowly.", category:"inhibit" },
    { phase:2, name:"Prone Hip Extension",         sets:"3×15/side",     cue:"Prone, tighten glute, lift leg 5–10cm. Hold 2s. Do NOT hyperextend lumbar.", category:"activate" },
    { phase:3, name:"Standing Alignment Drill",    sets:"3×60s",         cue:"Mirror feedback: stack ear–shoulder–hip–ankle. Small weight shift forward to correct sway.", category:"correct" },
  ],
  "Lower Crossed Syndrome": [
    { phase:1, name:"Iliopsoas SMR",               sets:"90s/side",      cue:"Foam roller inner hip/groin. Lie face down, roller under hip flexor. Breathe out tension.", category:"inhibit" },
    { phase:1, name:"Rectus Femoris Stretch",      sets:"3×30s/side",    cue:"Kneeling, heel to glute. Tuck pelvis FIRST. Reach for ankle only if comfortable.", category:"inhibit" },
    { phase:2, name:"Glute Bridge",                sets:"3×20",          cue:"Focus: posterior tilt at top, squeeze glutes. Avoid hamstring dominance.", category:"activate" },
    { phase:2, name:"Clamshell",                   sets:"3×20/side",     cue:"Side-lying, hips 45°. Open top knee toward ceiling. Band above knees to increase demand.", category:"activate" },
    { phase:2, name:"Dead Bug",                    sets:"3×8/side",      cue:"Press lumbar flat. Alternate opposite arm/leg. Do not allow back to arch.", category:"activate" },
  ],
  "Lower Crossed Syndrome (LCS)": [
    { phase:1, name:"Iliopsoas / TFL SMR",         sets:"90s/side",      cue:"Foam roller inner thigh and outer hip region. Sustained pressure on tender spots.", category:"inhibit" },
    { phase:2, name:"Glute Bridge with Posterior Tilt", sets:"3×15",     cue:"Flatten lumbar at top of bridge. Conscious posterior tilt, not just hip extension.", category:"activate" },
    { phase:2, name:"Dead Bug",                    sets:"3×8/side",      cue:"Abdominal hollowing first, then alternate limb lowering. No lumbar arch.", category:"activate" },
    { phase:3, name:"Pelvic Tilt Awareness",       sets:"3×20 reps",     cue:"Standing, anterior/posterior tilt oscillation. Find neutral between the two extremes.", category:"correct" },
  ],
  "Upper Crossed Syndrome": [
    { phase:1, name:"Upper Trap SMR",              sets:"90s/side",      cue:"Lacrosse ball, superior trap. Sustained pressure. Breathe into tender spots.", category:"inhibit" },
    { phase:1, name:"Pec Minor Stretch",           sets:"3×30s/side",    cue:"Doorframe at 90°. Lean gently. Feel coracoid process area, not the front of shoulder joint.", category:"inhibit" },
    { phase:2, name:"Chin Nod (DNF)",              sets:"3×10 holds 10s",cue:"Supine. Gentle nod — long neck. Do NOT lift head. Press tongue to roof of mouth.", category:"activate" },
    { phase:2, name:"Prone Y (Lower Trap)",        sets:"3×15",          cue:"Prone, arms in Y, thumbs-up. Lift away from floor. Feel mid-scapular — not neck.", category:"activate" },
    { phase:3, name:"Thoracic Extension",          sets:"2min T4–T8",    cue:"Foam roller across mid-back. Gravity-assisted extension. Progress to arms overhead.", category:"correct" },
  ],
  "Upper Crossed Syndrome (UCS)": [
    { phase:1, name:"Upper Trap SMR",              sets:"90s/side",      cue:"Lacrosse ball. Slow, sustained — not rolling. Breathe out through tender spots.", category:"inhibit" },
    { phase:1, name:"SCM / Scalene Stretch",       sets:"3×30s/side",    cue:"Tilt and rotate away. Anchor shoulder. 3 repetitions, progressive gentle overpressure.", category:"inhibit" },
    { phase:1, name:"Pec Minor Stretch",           sets:"3×30s",         cue:"Corner stretch or doorframe. Focus on front-of-shoulder length, not shoulder blade pinch.", category:"inhibit" },
    { phase:2, name:"Chin Nod",                    sets:"3×10 holds 10s",cue:"Supine. Small nod — long neck. Build hold time. Not a crunch.", category:"activate" },
    { phase:2, name:"Prone Y",                     sets:"3×15",          cue:"Prone Y. Thumbs up. Lift. No neck firing. 2s hold at top.", category:"activate" },
    { phase:2, name:"Serratus Wall Slide",         sets:"3×12",          cue:"Wall angels — maintain scapular contact throughout. Slow controlled.", category:"activate" },
    { phase:3, name:"Thoracic Foam Roller T4–T8",  sets:"2×2min",        cue:"Arms crossed, head supported. Let gravity drop thoracic into extension.", category:"correct" },
  ],
  "Knee":                   [
    { phase:1, name:"TFL / ITB SMR",               sets:"90s/side",      cue:"Foam roller lateral thigh. Bend knee to control intensity. Find tender spot — pause.", category:"inhibit" },
    { phase:2, name:"Clamshell",                   sets:"3×20/side",     cue:"Band above knee. Open top knee to ceiling. Do NOT roll pelvis back.", category:"activate" },
    { phase:2, name:"Terminal Knee Extension (VMO)",sets:"3×15/side",    cue:"Band behind knee in standing. Small knee bend and straighten. Feel inner quad.", category:"activate" },
    { phase:3, name:"Step-Down (Eccentric VMO)",   sets:"3×12/side",     cue:"Stand on step, slow single-leg lowering. Control valgus with mirror cue.", category:"correct" },
  ],
  "Knee Alignment Pattern":  [
    { phase:1, name:"ITB / TFL SMR",               sets:"90s/side",      cue:"Lateral thigh roller. Slow. Find tender points and breathe through.", category:"inhibit" },
    { phase:2, name:"Lateral Band Walk",           sets:"3×20 steps/dir",cue:"Band above knees. Hinge forward slightly. Step out — don't let knees cave.", category:"activate" },
    { phase:2, name:"Single-Leg Balance",          sets:"3×30s/side",    cue:"Maintain foot tripod (heel, 1st, 5th metatarsal). Don't let arch collapse.", category:"activate" },
    { phase:3, name:"Single-Leg Squat with Mirror",sets:"3×10/side",     cue:"Watch knee tracks over 2nd toe. Stop depth before valgus appears.", category:"correct" },
  ],
  "Leg Length":              [
    { phase:1, name:"QL Stretch (elevated side)",  sets:"3×30s",         cue:"Standing, reach over and away on the elevated-hip side. Feel side waist lengthening.", category:"inhibit" },
    { phase:2, name:"Glute Med Strengthening",     sets:"3×15/side",     cue:"Clamshell or standing hip abduction. Focus on low-side glute.", category:"activate" },
  ],
  "Scoliosis Screen":        [
    { phase:1, name:"Lateral Trunk Stretch",       sets:"3×30s/side",    cue:"Overhead reach toward ceiling, sidebend away from tight side. Breathe into the stretch.", category:"inhibit" },
    { phase:2, name:"Side-Lying Hip Abduction",    sets:"3×15/side",     cue:"Lateral trunk stabiliser activation — bottom oblique also works.", category:"activate" },
    { phase:3, name:"Mirror Biofeedback Standing", sets:"3×60s",         cue:"Standing in front of mirror. Level shoulders. Level pelvis. Breathe. Note how corrected feels.", category:"correct" },
  ],
  "Spine":                   [
    { phase:3, name:"Adam's Test Self-Check",      sets:"weekly",        cue:"Forward bend, hands together, observe for rib hump. Monitor for change.", category:"correct" },
  ],
  "Posture Pattern — Sway-Back": [
    { phase:1, name:"Hamstring Stretch (Slump)",   sets:"3×30s/side",    cue:"Seated slump, extend one leg, flex foot. Hold and breathe.", category:"inhibit" },
    { phase:2, name:"Standing Hip Flexor Activation", sets:"3×15/side",  cue:"Standing high knee drive. Activate psoas consciously.", category:"activate" },
    { phase:3, name:"Hip Shift Alignment Drill",   sets:"3×60s",         cue:"Mirror: shift hips forward over ankles. Feel weight move to ball of foot.", category:"correct" },
  ],
  "Tibial Varum":            [
    { phase:1, name:"Calf / Gastrosoleus SMR",     sets:"90s/side",      cue:"Foam roller medial calf. Work from Achilles to knee.", category:"inhibit" },
    { phase:2, name:"Tibialis Posterior Strengthening", sets:"3×15/side",cue:"Single-leg heel raise with slight inward roll. Controlled lowering.", category:"activate" },
  ],
};

function buildExercisePlan(findings) {
  const seen = new Set();
  const phases = { 1: [], 2: [], 3: [] };

  // Sort findings: high severity first
  const sorted = [...findings].sort((a,b) => {
    const sev = { high:2, moderate:1, low:0 };
    return (sev[b.severity]||0) - (sev[a.severity]||0);
  });

  sorted.forEach(f => {
    let key = f.region;
    let exList = EXERCISE_MAP[key];
    if (!exList) {
      const matchKey = Object.keys(EXERCISE_MAP).find(k =>
        key.includes(k) || k.includes(key.replace(/◈\s*/,""))
      );
      if (matchKey) exList = EXERCISE_MAP[matchKey];
    }
    if (!exList) return;

    exList.forEach(ex => {
      if (seen.has(ex.name)) return;
      seen.add(ex.name);
      const ph = ex.phase || 2;
      phases[ph].push({ ...ex, sourceRegion: f.region, sourceSev: f.severity });
    });
  });

  return phases;
}

// ── Muscle Imbalance Card Component ──────────────────────────────────────────
function MuscleImbalanceCard({ findings, isWide }) {
  const { tight, weak } = useMemo(() => buildMuscleImbalance(findings), [findings]);
  if (tight.length === 0 && weak.length === 0) return null;

  const col = {
    tight: "#dc2626",
    weak:  "#2563eb",
  };
  const bgTight = "rgba(220,38,38,0.07)";
  const bgWeak  = "rgba(37,99,235,0.07)";

  const muscleChip = (muscle, regions, isTight) => {
    const hasHigh = regions.some(r => r.sev === "●");
    const c = isTight ? col.tight : col.weak;
    return (
      <div key={muscle} style={{
        padding:"6px 10px", borderRadius:8,
        background: isTight ? bgTight : bgWeak,
        border:`1px solid ${c}25`,
        marginBottom:5
      }}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.65rem",fontWeight:800,color:c}}>{muscle}</span>
          {hasHigh && <span style={{fontSize:"0.55rem",padding:"1px 5px",borderRadius:4,background:`${c}18`,color:c,fontWeight:700}}>HIGH</span>}
        </div>
        <div style={{fontSize:"0.57rem",color:PC.muted,marginTop:2,lineHeight:1.4}}>
          {regions.map(r=>r.region.replace(/◈\s*/,"")).join(" · ")}
        </div>
      </div>
    );
  };

  return (
    <div style={{marginBottom:16,borderRadius:14,border:`1px solid ${PC.border}`,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"11px 14px",background:`linear-gradient(135deg,rgba(220,38,38,0.08),rgba(37,99,235,0.08))`,borderBottom:`1px solid ${PC.border}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:"1rem"}}>⚡</span>
        <div>
          <div style={{fontWeight:800,fontSize:"0.78rem",color:PC.text}}>Muscle Imbalance Table</div>
          <div style={{fontSize:"0.6rem",color:PC.muted}}>Derived from findings — confirm clinically</div>
        </div>
      </div>
      {/* Two columns */}
      <div style={{display:"grid",gridTemplateColumns:isWide?"1fr 1fr":"1fr 1fr",gap:0}}>
        {/* Tight / Overactive */}
        <div style={{padding:"12px 12px",borderRight:`1px solid ${PC.border}`}}>
          <div style={{fontSize:"0.62rem",fontWeight:800,color:col.tight,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <span>■</span> TIGHT / OVERACTIVE
          </div>
          {tight.length === 0
            ? <div style={{fontSize:"0.65rem",color:PC.muted,fontStyle:"italic"}}>None identified</div>
            : tight.map(([m,r]) => muscleChip(m, r, true))
          }
        </div>
        {/* Weak / Underactive */}
        <div style={{padding:"12px 12px"}}>
          <div style={{fontSize:"0.62rem",fontWeight:800,color:col.weak,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <span>⚡</span> WEAK / UNDERACTIVE
          </div>
          {weak.length === 0
            ? <div style={{fontSize:"0.65rem",color:PC.muted,fontStyle:"italic"}}>None identified</div>
            : weak.map(([m,r]) => muscleChip(m, r, false))
          }
        </div>
      </div>
      {/* Legend */}
      <div style={{padding:"8px 14px",background:PC.s2,borderTop:`1px solid ${PC.border}`,fontSize:"0.58rem",color:PC.muted}}>
        ■ Tight = inhibit first (SMR/stretch)  ·  ⚡ Weak = activate after inhibition  ·  HIGH = high-severity finding source
      </div>
    </div>
  );
}

// ── Special Tests Card Component ─────────────────────────────────────────────
function SpecialTestsCard({ findings, isWide }) {
  const [openAll, setOpenAll] = useState(false);
  const tests = useMemo(() => buildSpecialTests(findings), [findings]);
  if (tests.length === 0) return null;

  const visible = openAll ? tests : tests.slice(0, isWide ? 6 : 4);

  return (
    <div style={{marginBottom:16,borderRadius:14,border:`1px solid ${PC.border}`,overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"11px 14px",background:`rgba(124,58,237,0.06)`,borderBottom:`1px solid ${PC.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:"1rem"}}>⚕</span>
          <div>
            <div style={{fontWeight:800,fontSize:"0.78rem",color:PC.text}}>Suggested Special Tests</div>
            <div style={{fontSize:"0.6rem",color:PC.muted}}>{tests.length} tests indicated by findings</div>
          </div>
        </div>
        {tests.length > (isWide ? 6 : 4) && (
          <button onClick={()=>setOpenAll(o=>!o)} style={{fontSize:"0.62rem",fontWeight:700,color:PC.accent,background:"none",border:"none",cursor:"pointer"}}>
            {openAll ? "▲ Less" : `▼ All ${tests.length}`}
          </button>
        )}
      </div>
      {/* Tests grid */}
      <div style={{display:"grid",gridTemplateColumns:isWide?"1fr 1fr":"1fr",gap:0}}>
        {visible.map((t,i) => (
          <div key={t.name} style={{
            padding:"10px 13px",
            borderBottom: i < visible.length - (isWide ? (i%2===0 && i===visible.length-1?1:0) : 1) ? `1px solid ${PC.border}` : "none",
            borderRight: isWide && i%2===0 ? `1px solid ${PC.border}` : "none",
          }}>
            <div style={{display:"flex",alignItems:"flex-start",gap:7}}>
              <div style={{width:20,height:20,borderRadius:6,background:`${PC.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.62rem",fontWeight:800,color:PC.accent,flexShrink:0,marginTop:1}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.7rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{t.name}</div>
                <div style={{fontSize:"0.6rem",color:PC.muted,marginTop:2,lineHeight:1.4}}>{t.purpose}</div>
                <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:3}}>
                  {t.regions.slice(0,2).map(r=>(
                    <span key={r} style={{fontSize:"0.54rem",padding:"1px 6px",borderRadius:4,background:`${PC.accent}10`,color:PC.accent,fontWeight:600}}>
                      {r.replace(/◈\s*/,"").split(" — ")[0].slice(0,28)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exercise Plan Tab Component ───────────────────────────────────────────────
const PHASE_META = {
  1: { label:"Phase 1 — Inhibit & Release",  icon:"□", colour:"#dc2626", desc:"SMR and stretching of overactive muscles. Do before activation.",    category:"inhibit" },
  2: { label:"Phase 2 — Activate & Strengthen", icon:"⚡", colour:"#2563eb", desc:"Re-educate and strengthen underactive muscles after inhibition.", category:"activate" },
  3: { label:"Phase 3 — Integrate & Correct",   icon:"↻", colour:"#059669", desc:"Movement re-education, postural correction and functional loading.", category:"correct" },
};

function ExercisePlanTab({ findings, isWide }) {
  const [expandedEx, setExpandedEx] = useState(null);
  const phases = useMemo(() => buildExercisePlan(findings), [findings]);

  const totalCount = Object.values(phases).reduce((s,a)=>s+a.length,0);
  if (totalCount === 0) return (
    <div style={{padding:isWide?"20px 24px":"14px 16px",textAlign:"center",color:PC.muted,fontSize:"0.8rem",paddingTop:40}}>
      No findings detected yet — analyse a photo to generate a programme.
    </div>
  );

  const catBg  = { inhibit:"rgba(220,38,38,0.07)", activate:"rgba(37,99,235,0.07)", correct:"rgba(5,150,105,0.07)" };
  const catBorder = { inhibit:"rgba(220,38,38,0.25)", activate:"rgba(37,99,235,0.25)", correct:"rgba(5,150,105,0.25)" };
  const catColor  = { inhibit:PC.red, activate:"#2563eb", correct:PC.green };

  return (
    <div style={{padding:isWide?"20px 24px":"14px 16px"}}>
      {/* Programme header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div style={{fontWeight:900,fontSize:isWide?"0.95rem":"0.85rem",color:PC.text}}>▶ Exercise Programme</div>
          <div style={{fontSize:"0.62rem",color:PC.muted,marginTop:2}}>{totalCount} exercises in 3 phases · Based on {findings.length} findings</div>
        </div>
        <div style={{padding:"4px 10px",borderRadius:8,background:`${PC.accent}12`,border:`1px solid ${PC.accent}25`,fontSize:"0.6rem",fontWeight:700,color:PC.accent}}>
          10–15 min/day
        </div>
      </div>

      {/* Phases */}
      {[1,2,3].map(ph => {
        const exs = phases[ph];
        if (!exs || exs.length === 0) return null;
        const meta = PHASE_META[ph];
        return (
          <div key={ph} style={{marginBottom:16,borderRadius:14,border:`1px solid ${PC.border}`,overflow:"hidden"}}>
            {/* Phase header */}
            <div style={{padding:"10px 14px",background:`${meta.colour}09`,borderBottom:`1px solid ${PC.border}`,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:"1rem"}}>{meta.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:"0.75rem",color:meta.colour}}>{meta.label}</div>
                <div style={{fontSize:"0.58rem",color:PC.muted,marginTop:1}}>{meta.desc}</div>
              </div>
              <div style={{fontSize:"0.65rem",fontWeight:700,color:meta.colour,background:`${meta.colour}12`,padding:"3px 8px",borderRadius:6}}>
                {exs.length} ex
              </div>
            </div>
            {/* Exercise list */}
            {isWide ? (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                {exs.map((ex,i) => (
                  <ExerciseItem key={ex.name} ex={ex} idx={i} isWide={isWide}
                    isLast={i>=exs.length-2}
                    isRightCol={i%2===1}
                    expanded={expandedEx===ex.name}
                    onToggle={()=>setExpandedEx(expandedEx===ex.name?null:ex.name)}
                    catBg={catBg} catBorder={catBorder} catColor={catColor}/>
                ))}
              </div>
            ) : (
              exs.map((ex,i) => (
                <ExerciseItem key={ex.name} ex={ex} idx={i} isWide={false}
                  isLast={i===exs.length-1}
                  isRightCol={false}
                  expanded={expandedEx===ex.name}
                  onToggle={()=>setExpandedEx(expandedEx===ex.name?null:ex.name)}
                  catBg={catBg} catBorder={catBorder} catColor={catColor}/>
              ))
            )}
          </div>
        );
      })}

      {/* Footer disclaimer */}
      <div style={{padding:"10px 14px",borderRadius:10,background:PC.s2,border:`1px solid ${PC.border}`,fontSize:"0.6rem",color:PC.muted,lineHeight:1.6}}>
        ℹ️ This programme is generated from postural analysis findings. Always confirm with clinical examination before prescribing. Adjust load and range to individual tolerance. Reassess in 4–6 weeks.
      </div>
    </div>
  );
}

function ExerciseItem({ ex, idx, isWide, isLast, isRightCol, expanded, onToggle, catBg, catBorder, catColor }) {
  const cat = ex.category || "correct";
  return (
    <div
      onClick={onToggle}
      style={{
        padding:"10px 13px",
        borderBottom: !isLast ? `1px solid ${PC.border}` : "none",
        borderRight: isWide && !isRightCol ? `1px solid ${PC.border}` : "none",
        cursor:"pointer",
        background: expanded ? catBg[cat] : "transparent",
        transition:"background 0.15s",
      }}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        {/* Number badge */}
        <div style={{
          width:22, height:22, borderRadius:7,
          background: catBg[cat],
          border:`1px solid ${catBorder[cat]}`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"0.6rem",fontWeight:800,color:catColor[cat],flexShrink:0,marginTop:1
        }}>{idx+1}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{ex.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
            <span style={{fontSize:"0.62rem",fontWeight:700,color:catColor[cat],
              background:catBg[cat],border:`1px solid ${catBorder[cat]}`,
              padding:"1px 7px",borderRadius:5}}>{ex.sets}</span>
            <span style={{fontSize:"0.57rem",color:PC.muted,
              background:catBg[cat],padding:"1px 6px",borderRadius:4}}>
              {cat.toUpperCase()}
            </span>
            <span style={{fontSize:"0.57rem",color:PC.muted,padding:"1px 6px",borderRadius:4,
              background:"rgba(124,58,237,0.06)",border:"1px solid rgba(124,58,237,0.15)"}}>
              Daily
            </span>
          </div>
        </div>
        <span style={{fontSize:"0.65rem",color:PC.muted,flexShrink:0,marginTop:2}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{marginTop:9,paddingTop:9,borderTop:`1px solid ${catBorder[cat]}`,
          fontSize:"0.67rem",color:PC.text,lineHeight:1.6,
          background:catBg[cat],borderRadius:6,padding:"8px 10px",marginLeft:30}}>
          {/* Dosage summary line */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
            <span style={{fontSize:"0.6rem",fontWeight:700,color:catColor[cat],
              padding:"2px 8px",borderRadius:5,background:`${catBg[cat]}`,border:`1px solid ${catBorder[cat]}`}}>
              {ex.sets}
            </span>
            <span style={{fontSize:"0.6rem",color:PC.muted,padding:"2px 7px",borderRadius:5,
              background:"rgba(124,58,237,0.07)",border:"1px solid rgba(124,58,237,0.15)"}}>
              Frequency: Daily · Reassess 4–6 wks
            </span>
          </div>
          <span style={{fontSize:"0.6rem",fontWeight:700,color:catColor[cat]}}>Technique: </span>
          {ex.cue}
          {ex.sourceRegion && (
            <div style={{marginTop:5,fontSize:"0.57rem",color:PC.muted,fontStyle:"italic"}}>
              Source: {ex.sourceRegion.replace(/◈\s*/,"")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── History hook (in-memory only) ───────────────────────────────────────────
function useHistory(){
  const [sessions,setSessions]=useState([]);
  const save=useCallback((s)=>setSessions(prev=>[...prev.slice(-19),s]),[]);
  const clear=useCallback(()=>setSessions([]),[]);
  return {sessions,save,clear};
}

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 390);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 900, isTablet: w >= 900 && w < 1100, isDesktop: w >= 1100, w };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function PostureAnalysisModule(){
  const [mode,setMode]=useState("upload");
  const [view,setView]=useState("anterior");
  const [mpStatus,setMpStatus]=useState("loading");
  const [camStatus,setCamStatus]=useState("idle");
  const [camFacing,setCamFacing]=useState("environment");
  const [tab,setTab]=useState("capture");
  const [landmarks,setLandmarks]=useState(null);
  const [measurements,setMeasurements]=useState(null);
  const [findings,setFindings]=useState([]);
  const [scoreData,setScoreData]=useState(null);
  const [reliability,setReliability]=useState(null);
  const [uploadedImg,setUploadedImg]=useState(null);
  const [rawUploadedImg,setRawUploadedImg]=useState(null); // always the original file URL (never a canvas output)
  const [capturedImg,setCapturedImg]=useState(null);
  const [analysing,setAnalysing]=useState(false);
  const [error,setError]=useState(null);
  const [countdown,setCountdown]=useState(null);
  const [showHeatmap]=useState(true);
  const [showGrid,setShowGrid]=useState(true);
  const {sessions,save:saveSession,clear:clearHistory}=useHistory();
  const [showHistory,setShowHistory]=useState(false);
  const [motionWarning,setMotionWarning]=useState(false);
  const prevLmRef=useRef(null);
  // Calibration: patient height (cm) → pixPerCm conversion for real-world measurements
  const [patientHeightCm,setPatientHeightCm]=useState(170);
  const [showCalib,setShowCalib]=useState(false);
  // Mobile panel toggle: "camera" = left panel, "results" = right panel
  const [mobilePanel,setMobilePanel]=useState("camera");

  // ── Multi-view state ─────────────────────────────────────────────────────────
  const [assessMode,setAssessMode] = useState("single");  // "single" | "multi"
  const [mvResults,setMvResults]   = useState({});         // { [viewKey]: {view,measurements,findings,scoreData,reliability,img} }
  const [mvComposite,setMvComposite] = useState(null);
  const [mvTab,setMvTab]           = useState("capture");  // "capture" | "report"

  // ── Report generation state ──────────────────────────────────────────────────
  const [showReportModal,setShowReportModal]=useState(false);
  const [showReportViewer,setShowReportViewer]=useState(false);
  const [reportHtml,setReportHtml]=useState("");
  const [reportType,setReportType]=useState("basic"); // "basic"|"detailed"
  const [patientInfo,setPatientInfo]=useState({name:"",age:"",sex:"Female",occupation:""});
  const [clinicianInfo,setClinicianInfo]=useState({name:"",credentials:"",clinic:""});

  // ── Manual landmark placement state ─────────────────────────────────────────
  const [inputMode,setInputMode]=useState("ai");        // "ai" | "manual"
  const [manualPlaced,setManualPlaced]=useState({});    // {[pointId]: {x,y}}
  const [manualImgDims,setManualImgDims]=useState(null); // {w,h} of displayed image
  const [manualAnalysed,setManualAnalysed]=useState(false);
  const manualImgRef=useRef(null);
  const manualContainerRef=useRef(null);

  const videoRef=useRef(null);
  const overlayRef=useRef(null);
  const poseRef=useRef(null);
  const streamRef=useRef(null);
  const rafRef=useRef(null);
  const viewRef=useRef(view);
  const liveHandlerRef=useRef(null);
  const fileInputRef=useRef(null);
  const objectUrlRef=useRef(null);
  const videoSizeRef=useRef({w:640,h:480});
  const manualImgSize=useRef({w:800,h:1000});

  useEffect(()=>{viewRef.current=view;},[view]);

  // ── Load MediaPipe ──────────────────────────────────────────────────────────
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        await loadScript(`${MP_CDN}/pose.js`);
        await loadScript(`${MP_CDN}/pose_solution_simd_wasm_bin.js`);
        if(cancelled) return;
        const pose=new window.Pose({locateFile:f=>`${MP_CDN}/${f}`});
        pose.setOptions({modelComplexity:1,smoothLandmarks:true,enableSegmentation:false,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
        await pose.initialize();
        if(!cancelled){poseRef.current=pose; setMpStatus("ready");}
      }catch(e){
        if(!cancelled) setMpStatus("error");
      }
    })();
    return()=>{cancelled=true;};
  },[]);

  // ── Process landmarks ───────────────────────────────────────────────────────
  const processLandmarks=useCallback((lm,v,imgH)=>{
    const calib = computeCalibration(lm, patientHeightCm, imgH||videoSizeRef.current?.h||480);
    const m=measureLandmarks(lm, calib);
    const r=calcReliability(lm);
    const f=r.blocked?[]:buildFindings(lm,v||viewRef.current,m);
    const s=scorePosture(m,f,r);
    setLandmarks(lm); setMeasurements(m); setFindings(f); setReliability(r); setScoreData(s);
  },[patientHeightCm]);

  const saveMvResult = useCallback((viewKey,m,f,s,r,img) => {
    setMvResults(prev => ({ ...prev, [viewKey]:{ view:viewKey, measurements:m, findings:f, scoreData:s, reliability:r, img } }));
    setMvComposite(null);
  },[]);

  // ── Analyse uploaded image ──────────────────────────────────────────────────
  async function analysePhoto(url,v){
    if(!poseRef.current||mpStatus!=="ready") return null;

    // ── STEP 1: Decode pixel data completely independently via fetch+createImageBitmap.
    // This is the ONLY reliable way to get clean canvas pixels on Android Chrome.
    // img.crossOrigin="anonymous" on blob URLs silently poisons drawImage → black canvas.
    // createImageBitmap(blob) bypasses the img element entirely for pixel decoding.
    let srcCanvas;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      const W=bitmap.width, H=bitmap.height;
      srcCanvas=document.createElement("canvas");
      srcCanvas.width=W; srcCanvas.height=H;
      const srcCtx=srcCanvas.getContext("2d");
      srcCtx.fillStyle="#ffffff";
      srcCtx.fillRect(0,0,W,H);
      srcCtx.drawImage(bitmap,0,0,W,H); // bitmap is always clean — no CORS taint
      bitmap.close();
    } catch(e) {
      // createImageBitmap not supported (very old browser) — fall back to img element
      srcCanvas=null;
    }

    // ── STEP 2: Load img element separately for MediaPipe — NO crossOrigin attribute.
    // blob URLs from file input are always same-origin. crossOrigin is not needed
    // and actively causes Android Chrome to mark the canvas as tainted → black.
    return new Promise(resolve=>{
      const img=new Image();
      // ← deliberately NO crossOrigin here
      img.onload=async()=>{
        const W=img.naturalWidth, H=img.naturalHeight;

        // If createImageBitmap succeeded, srcCanvas has clean pixels.
        // If it failed, fall back to drawing from img here (pre-MediaPipe-send).
        if(!srcCanvas){
          srcCanvas=document.createElement("canvas");
          srcCanvas.width=W; srcCanvas.height=H;
          const srcCtx=srcCanvas.getContext("2d");
          srcCtx.fillStyle="#ffffff";
          srcCtx.fillRect(0,0,W,H);
          srcCtx.drawImage(img,0,0,W,H);
        }

        const oc=document.createElement("canvas"); oc.width=W; oc.height=H;
        const octx=oc.getContext("2d");

        let resolved=false;
        const handler=results=>{
          if(resolved) return; resolved=true;
          if(results.poseLandmarks?.length>0){
            const lm=results.poseLandmarks;
            const calib=computeCalibration(lm,patientHeightCm,H);
            processLandmarks(lm,v,H);
            const mLocal=measureLandmarks(lm,calib);
            octx.fillStyle="#ffffff"; octx.fillRect(0,0,W,H);
            octx.drawImage(srcCanvas,0,0,W,H); // always from clean srcCanvas
            drawOverlay({ctx:octx,W,H,lm,view:v,showGrid:true,measurements:mLocal});
            const annotated=oc.toDataURL("image/jpeg",0.92);
            resolve({lm,annotated});
          } else { resolve(null); }
          if(liveHandlerRef.current) poseRef.current.onResults(liveHandlerRef.current);
        };
        poseRef.current.onResults(handler);
        const t=setTimeout(()=>{if(!resolved){resolved=true;resolve(null);}},8000);
        try{ await poseRef.current.send({image:img}); }
        catch(e){ if(!resolved){resolved=true;resolve(null);} }
        finally{ clearTimeout(t); }
      };
      img.onerror=()=>resolve(null);
      img.src=url; // blob URL — always same-origin, no crossOrigin needed
    });
  }

  // ── Handle file upload ──────────────────────────────────────────────────────
  async function handleFile(e){
    const file=e.target.files?.[0]; if(!file) return;
    if(objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url=URL.createObjectURL(file); objectUrlRef.current=url;
    setError(null); setUploadedImg(url); setRawUploadedImg(url); setTab("capture");
    if(inputMode==="manual"){
      resetManual();
      setLandmarks(null); setMeasurements(null); setFindings([]); setScoreData(null); setReliability(null);
      e.target.value="";
      return;
    }
    setAnalysing(true);
    const result=await analysePhoto(url,view);
    setAnalysing(false);
    if(result){
      // Show annotated overlay — analysePhoto uses createImageBitmap (clean, no taint)
      if(result.annotated) setUploadedImg(result.annotated);
      if(assessMode==="multi"){
        const m=measureLandmarks(result.lm);
        const r=calcReliability(result.lm);
        const f=r.blocked?[]:buildFindings(result.lm,view,m);
        const s=scorePosture(m,f,r);
        saveMvResult(view,m,f,s,r,result.annotated||url);
        // stay on capture tab so therapist can do next view
      } else {
        setTab("findings");
        if(isMobile) setMobilePanel("results");
      }
    } else {
      setError("Could not analyse photo — ensure full body is visible.");
    }
    e.target.value="";
  }

  async function startCamera(facing="environment"){
    if(!poseRef.current||mpStatus!=="ready"){setError("AI not ready yet — wait for AI Ready status");return;}
    setCamStatus("starting"); setError(null);
    try{
      // Progressive constraint fallback for mobile compatibility
      let stream = null;
      const constraintSets = [
        { video:{ facingMode:facing, width:{ideal:640}, height:{ideal:480} } },
        { video:{ facingMode:facing } },
        { video: true },
      ];
      for(const constraints of constraintSets){
        try{ stream = await navigator.mediaDevices.getUserMedia(constraints); break; }catch(_){}
      }
      if(!stream) throw new Error("NoStream");

      streamRef.current=stream; setCamFacing(facing);
      const video=videoRef.current;
      if(!video) throw new Error("NoVideo");
      video.srcObject=stream;
      video.setAttribute("playsinline","");
      video.setAttribute("webkit-playsinline","");
      video.muted=true;

      await new Promise((res,rej)=>{
        const go=()=>video.play().then(res).catch(rej);
        if(video.readyState>=1){ go(); }
        else { video.onloadedmetadata=go; }
        setTimeout(()=>rej(new Error("Timeout")), 8000);
      });

      setCamStatus("active");

      const handler=results=>{
        if(results.poseLandmarks?.length>0){
          const lm=results.poseLandmarks;
          if(prevLmRef.current){
            const drift=Math.abs((lm[0]?.x||0)-(prevLmRef.current[0]?.x||0))*100;
            setMotionWarning(drift>3);
          }
          prevLmRef.current=lm;
          const H=videoRef.current?.videoHeight||480;
          videoSizeRef.current={w:videoRef.current?.videoWidth||640,h:H};
          processLandmarks(lm,viewRef.current,H);
        }
        if(overlayRef.current&&videoRef.current){
          const W=videoRef.current.videoWidth||640, H=videoRef.current.videoHeight||480;
          if(W>0&&H>0){
            overlayRef.current.width=W; overlayRef.current.height=H;
            const ctx=overlayRef.current.getContext("2d");
            const liveCalib = results.poseLandmarks
              ? computeCalibration(results.poseLandmarks, patientHeightCm, H) : null;
            const liveM=results.poseLandmarks?measureLandmarks(results.poseLandmarks, liveCalib):null;
            drawOverlay({ctx,W,H,lm:results.poseLandmarks,view:viewRef.current,showGrid,measurements:liveM,clearFirst:true});
          }
        }
      };
      liveHandlerRef.current=handler;
      poseRef.current.onResults(handler);

      // Throttled loop — mobile cannot sustain 60fps ML inference
      let lastSend=0;
      const INTERVAL=120; // ~8fps inference; display still renders at browser fps
      const loop=async()=>{
        if(!streamRef.current) return;
        const now=performance.now();
        if(videoRef.current?.readyState>=2 && now-lastSend>=INTERVAL){
          lastSend=now;
          try{ await poseRef.current.send({image:videoRef.current}); }catch(_){}
        }
        rafRef.current=requestAnimationFrame(loop);
      };
      rafRef.current=requestAnimationFrame(loop);

    }catch(e){
      setCamStatus("error");
      const n=e?.name||"";
      setError(
        n==="NotAllowedError"||n==="PermissionDeniedError"
          ? "Camera permission denied. Tap the camera icon in your browser address bar and allow access, then try again."
          : n==="NotFoundError"||n==="DevicesNotFoundError"
          ? "No camera found on this device."
          : n==="NotReadableError"||n==="TrackStartError"
          ? "Camera is in use by another app. Close other apps or tabs using the camera."
          : `Camera unavailable (${n||e?.message||"unknown"}). Try refreshing the page.`
      );
    }
  }

  function stopCamera(){
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null;}
    setCamStatus("idle"); setLandmarks(null); setMeasurements(null); setFindings([]); setScoreData(null);
  }

  function flipCamera(){ stopCamera(); setTimeout(()=>startCamera(camFacing==="user"?"environment":"user"),300); }

  async function capturePhoto(delay=0){
    if(delay>0){
      for(let i=delay;i>=1;i--){ setCountdown(i); await new Promise(r=>setTimeout(r,1000)); }
    }
    setCountdown(null);
    const video=videoRef.current; if(!video||video.readyState<2) return;
    const currentView=viewRef.current; // snapshot view at moment of capture

    // ── Step 1: Freeze frame from video into a blob URL ────────────────────
    const W=video.videoWidth, H=video.videoHeight;
    const fc=document.createElement("canvas"); fc.width=W; fc.height=H;
    const fctx=fc.getContext("2d");
    // Mirror correction: if front camera, flip back before analysis
    if(camFacing==="user"){ fctx.translate(W,0); fctx.scale(-1,1); }
    fctx.drawImage(video,0,0,W,H);
    const rawDataUrl=fc.toDataURL("image/jpeg",0.92);

    // Show frozen frame immediately so UI feels responsive
    setCapturedImg(rawDataUrl);
    setAnalysing(true);

    // ── Step 2: Re-run full analysis on frozen frame ───────────────────────
    // This gives reliable, view-correct measurements vs live 8fps inference
    const blobUrl = await new Promise(res=>{
      fc.toBlob(b=>res(b?URL.createObjectURL(b):null),"image/jpeg",0.92);
    });

    if(blobUrl && poseRef.current && mpStatus==="ready"){
      const result = await analysePhoto(blobUrl, currentView);
      URL.revokeObjectURL(blobUrl);
      setAnalysing(false);

      if(result){
        // Build annotated image with correct view plumb line
        const oc=document.createElement("canvas"); oc.width=W; oc.height=H;
        const octx=oc.getContext("2d");
        octx.drawImage(fc,0,0,W,H);
        drawOverlay({ctx:octx,W,H,lm:result.lm,view:currentView,showGrid:true,measurements:result.measurements,clearFirst:false});
        const annotated=oc.toDataURL("image/jpeg",0.92);
        setCapturedImg(annotated);

        // Update state with fresh view-correct analysis
        const calib=computeCalibration(result.lm,patientHeightCm,H);
        processLandmarks(result.lm, currentView, H);

        if(assessMode==="multi"){
          const m=measureLandmarks(result.lm,calib);
          const r=calcReliability(result.lm);
          const f=r.blocked?[]:buildFindings(result.lm,currentView,m);
          const s=scorePosture(m,f,r);
          saveMvResult(currentView,m,f,s,r,annotated);
          saveSession({view:currentView,time:new Date().toISOString(),score:s?.score,band:s?.band,findings:f.length,img:annotated});
        } else {
          saveSession({view:currentView,time:new Date().toISOString(),score:scoreData?.score,band:scoreData?.band,findings:findings.length,img:annotated});
        }
      } else {
        // Analysis failed — keep frozen frame, use live landmarks as fallback
        if(landmarks){
          const oc2=document.createElement("canvas"); oc2.width=W; oc2.height=H;
          const octx2=oc2.getContext("2d"); octx2.drawImage(fc,0,0,W,H);
          drawOverlay({ctx:octx2,W,H,lm:landmarks,view:currentView,showGrid:true,measurements,clearFirst:false});
          setCapturedImg(oc2.toDataURL("image/jpeg",0.92));
        }
        if(measurements&&findings&&scoreData){
          saveSession({view:currentView,time:new Date().toISOString(),score:scoreData?.score,band:scoreData?.band,findings:findings.length,img:rawDataUrl});
        }
      }
    } else {
      // Camera not ready — use live landmarks directly
      URL.revokeObjectURL(blobUrl||"");
      setAnalysing(false);
      if(landmarks){
        const oc3=document.createElement("canvas"); oc3.width=W; oc3.height=H;
        const octx3=oc3.getContext("2d"); octx3.drawImage(fc,0,0,W,H);
        drawOverlay({ctx:octx3,W,H,lm:landmarks,view:currentView,showGrid:true,measurements,clearFirst:false});
        setCapturedImg(oc3.toDataURL("image/jpeg",0.92));
      }
      if(measurements&&findings&&scoreData){
        saveSession({view:currentView,time:new Date().toISOString(),score:scoreData?.score,band:scoreData?.band,findings:findings.length,img:rawDataUrl});
      }
    }

    setTab("findings");
    if(isMobile) setMobilePanel("results");
  }

  // ── Manual mode derived values ───────────────────────────────────────────────
  const isLat = view==="left"||view==="right";
  const manualPointDefs = isLat ? MANUAL_POINTS_SAGITTAL : MANUAL_POINTS_FRONTAL;
  const manualConnections = isLat ? MANUAL_CONNECTIONS_SAGITTAL : MANUAL_CONNECTIONS_FRONTAL;
  const manualPlacedCount = Object.keys(manualPlaced).length;
  const manualTotal = manualPointDefs.length;
  const manualPct = manualPlacedCount / manualTotal;
  const manualCanAnalyse = manualPct >= 0.6;
  const nextManualIdx = manualPointDefs.findIndex(def => !manualPlaced[def.id]);

  function handleManualImageClick(e) {
    if (inputMode !== "manual" || !uploadedImg || nextManualIdx < 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const def = manualPointDefs[nextManualIdx];
    setManualPlaced(prev => ({ ...prev, [def.id]: { x, y } }));
    setManualAnalysed(false);
  }

  function undoLastManual() {
    const ids = Object.keys(manualPlaced).map(Number).sort((a,b)=>b-a);
    if (ids.length === 0) return;
    const last = ids[0];
    setManualPlaced(prev => { const n={...prev}; delete n[last]; return n; });
    setManualAnalysed(false);
  }

  function resetManual() {
    setManualPlaced({});
    setManualAnalysed(false);
  }

  function analyseManualPoints() {
    const lm = manualPointsToLandmarks(manualPlaced, manualPointDefs);
    const imgH = manualImgSize.current?.h || 800;
    const calib = computeCalibration(lm, patientHeightCm, imgH);
    const m = measureLandmarks(lm, calib);
    const r = calcManualReliability(manualPlacedCount, manualTotal);
    const f = r.blocked ? [] : buildFindings(lm, view, m);
    const s = scorePosture(m, f, r);
    setLandmarks(lm); setMeasurements(m); setFindings(f); setReliability(r); setScoreData(s);
    setManualAnalysed(true);
    // Bake manual markers onto the annotated image
    if (objectUrlRef.current) {
      const img = new Image();
      img.onload = () => {
        const W = img.naturalWidth, H = img.naturalHeight;
        const oc = document.createElement("canvas"); oc.width=W; oc.height=H;
        const ctx = oc.getContext("2d"); ctx.drawImage(img, 0, 0, W, H);
        drawManualOverlay({ ctx, W, H, placed:manualPlaced, pointDefs:manualPointDefs, connections:manualConnections });
        setUploadedImg(oc.toDataURL("image/jpeg", 0.92));
      };
      img.src = objectUrlRef.current;
    }
    setTab("findings");
    if(isMobile) setMobilePanel("results");
  }

  function handleModeSwitch(newMode) {
    setInputMode(newMode);
    if (newMode === "manual") {
      resetManual();
      setLandmarks(null); setMeasurements(null); setFindings([]); setScoreData(null); setReliability(null);
      // Restore original image if annotated
      if (objectUrlRef.current) setUploadedImg(objectUrlRef.current);
    }
  }

  const { isMobile, isDesktop } = useBreakpoint();
  const isWide = !isMobile; // tablet + desktop

  const isLive=mode==="live";
  const camReady=camStatus==="active";
  const hasData=!!landmarks;
  const viewMeta=VIEWS[view]||VIEWS.anterior;
  const highFindings=findings.filter(f=>f.severity==="high");
  const otherFindings=findings.filter(f=>f.severity!=="high");
  const displayImg=isLive?capturedImg:uploadedImg;

  // ── View switch handler ─────────────────────────────────────────────────────
  async function handleViewSwitch(newView){
    setView(newView);
    if(inputMode==="manual"){
      resetManual();
      if(objectUrlRef.current) setUploadedImg(objectUrlRef.current);
      return;
    }
    if(!isLive&&objectUrlRef.current&&mpStatus==="ready"){
      setAnalysing(true); setError(null);
      const result=await analysePhoto(objectUrlRef.current,newView);
      setAnalysing(false);
      if(result){ /* findings updated via processLandmarks/setFindings; keep original photo */ }
      else{ setError("Could not re-analyse — ensure full body is visible"); }
    }
  }

  // ── Shared panel: findings/metrics/history content ──────────────────────────
  const tabContent = (
    <div style={{flex:1,overflowY:"auto",paddingBottom: isMobile ? 80 : 24}}>

      {/* Tab bar */}
      {(measurements||capturedImg)&&(
        <div style={{borderBottom:`1px solid ${PC.border}`,background:PC.surface,display:"flex",position: isWide?"sticky":"static",top:0,zIndex:5}}>
          {[["findings",`⌕ Findings${findings.length?" ("+findings.length+")":""}`],["muscles","⚡ Muscles"],["plan","▶ Plan"],["tests","⚕ Tests"],["metrics","≡ Metrics"],["history","▤ History"]].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,padding: isWide?"12px 8px":"10px 8px",border:"none",borderBottom:`3px solid ${tab===t?PC.accent:"transparent"}`,background:"transparent",color:tab===t?PC.accent:PC.muted,fontWeight:700,fontSize: isWide?"0.78rem":"0.68rem",cursor:"pointer",whiteSpace:"nowrap"}}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Findings tab */}
      {tab==="findings"&&measurements&&(
        <div style={{padding: isWide?"20px 24px":"14px 16px"}}>
          {scoreData&&(
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,padding: isWide?"18px":"14px",background:PC.surface,borderRadius:14,border:`1px solid ${scoreData.colour}30`,boxShadow:isWide?"0 2px 12px rgba(0,0,0,0.06)":"none"}}>
              <ScoreRingBand score={scoreData.score} band={scoreData.band} colour={scoreData.colour} size={isWide?96:80}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize: isWide?"1.1rem":"0.9rem",color:scoreData.colour}}>{scoreData.band}</div>
                <div style={{fontSize: isWide?"0.72rem":"0.65rem",color:PC.muted,marginTop:2}}>
                  Score {scoreData.score}/100 &nbsp;·&nbsp;
                  <span style={{color:scoreData.colour,fontWeight:700}}>
                    {scoreData.score>=88?"Excellent posture":scoreData.score>=74?"Minor deviations":scoreData.score>=58?"Moderate — intervention advised":scoreData.score>=40?"Significant — prioritise treatment":"Urgent — multiple areas affected"}
                  </span>
                </div>
                <div style={{fontSize: isWide?"0.68rem":"0.62rem",color:PC.muted,marginTop:2}}>
                  {findings.length} finding{findings.length!==1?"s":""} · {highFindings.length} high priority
                </div>
                <div style={{fontSize: isWide?"0.65rem":"0.6rem",color:PC.muted,marginTop:2}}>
                  Reliability: {reliability?.score}% ({reliability?.isManual?"Manual ✓ ":""}{reliability?.status})
                  {reliability?.icc!=null&&` · ICC ${reliability.icc}`}
                </div>
                {measurements?.cervicalLoadKg!=null&&(
                  <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:6,
                    background:measurements.cervicalLoadKg>18?"rgba(220,38,38,0.1)":measurements.cervicalLoadKg>12?"rgba(180,83,9,0.1)":"rgba(5,150,105,0.1)",
                    border:`1px solid ${measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green}40`}}>
                    <span style={{fontSize:"0.65rem",fontWeight:700,color:measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green}}>
                      Cervical load ~{measurements.cervicalLoadKg.toFixed(1)}kg
                    </span>
                    <span style={{fontSize:"0.58rem",color:PC.muted}}>(neutral 4.5kg)</span>
                  </div>
                )}
                {/* Real cm measurements row */}
                {measurements?._calibrated&&(
                  <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                    {/* CVA — most important single measure; always first if present */}
                    {measurements.cvaAngle!=null&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.62rem",fontWeight:700,
                        background:measurements.cvaAngle<49?"rgba(220,38,38,0.1)":measurements.cvaAngle<55?"rgba(180,83,9,0.1)":"rgba(5,150,105,0.1)",
                        color:measurements.cvaAngle<49?PC.red:measurements.cvaAngle<55?PC.yellow:PC.green,
                        border:`1px solid ${measurements.cvaAngle<49?PC.red:measurements.cvaAngle<55?PC.yellow:PC.green}40`}}>
                        CVA {measurements.cvaAngle.toFixed(1)}° {measurements.cvaAngle>=55?"✓":`(normal >55°)`}
                      </span>
                    )}
                    {measurements.fhpCm!=null&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.62rem",fontWeight:700,
                        background:measurements.fhpCm>3.5?"rgba(220,38,38,0.1)":measurements.fhpCm>2?"rgba(180,83,9,0.1)":"rgba(5,150,105,0.1)",
                        color:measurements.fhpCm>3.5?PC.red:measurements.fhpCm>2?PC.yellow:PC.green,
                        border:`1px solid ${measurements.fhpCm>3.5?PC.red:measurements.fhpCm>2?PC.yellow:PC.green}40`}}>
                        FHP {measurements.fhpCm}cm
                      </span>
                    )}
                    {measurements.shoulderDiffCm!=null&&measurements.shoulderDiffCm>0.3&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.62rem",fontWeight:700,
                        background:measurements.shoulderDiffCm>1.5?"rgba(220,38,38,0.1)":"rgba(180,83,9,0.1)",
                        color:measurements.shoulderDiffCm>1.5?PC.red:PC.yellow,
                        border:`1px solid ${measurements.shoulderDiffCm>1.5?PC.red:PC.yellow}40`}}>
                        Sh diff {measurements.shoulderDiffCm}cm
                      </span>
                    )}
                    {measurements.pelvisDiffCm!=null&&measurements.pelvisDiffCm>0.3&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.62rem",fontWeight:700,
                        background:measurements.pelvisDiffCm>1.5?"rgba(220,38,38,0.1)":"rgba(180,83,9,0.1)",
                        color:measurements.pelvisDiffCm>1.5?PC.red:PC.yellow,
                        border:`1px solid ${measurements.pelvisDiffCm>1.5?PC.red:PC.yellow}40`}}>
                        Pelvis diff {measurements.pelvisDiffCm}cm
                      </span>
                    )}
                    {measurements.trunkShiftCm!=null&&measurements.trunkShiftCm>0.5&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.62rem",fontWeight:700,
                        background:measurements.trunkShiftCm>5?"rgba(156,163,175,0.15)":"rgba(180,83,9,0.1)",
                        color:measurements.trunkShiftCm>5?PC.muted:PC.yellow,
                        border:`1px solid ${measurements.trunkShiftCm>5?PC.muted:PC.yellow}40`}}>
                        Trunk shift {measurements.trunkShiftCm}cm{measurements.trunkShiftCm>5?" ⚠ verify positioning":""}
                      </span>
                    )}
                  </div>
                )}
                {!measurements?._calibrated&&(
                  <div style={{marginTop:6,fontSize:"0.58rem",color:PC.muted,fontStyle:"italic"}}>
                    Enter patient height in Metrics tab for real cm measurements
                  </div>
                )}
                {/* Sub-score pills on wide screens */}
                {isWide&&scoreData?.subScores&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                    {Object.entries(scoreData.subScores).map(([region,val])=>{
                      const col=val>=74?PC.green:val>=55?PC.yellow:PC.red;
                      return(
                        <div key={region} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:20,background:`${col}12`,border:`1px solid ${col}30`}}>
                          <span style={{fontSize:"0.62rem",color:PC.muted,textTransform:"capitalize"}}>{region}</span>
                          <span style={{fontSize:"0.68rem",fontWeight:800,color:col}}>{Math.round(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ── TOP 3 PRIORITY TREATMENT CARD ─────────────────────────────── */}
          {findings.length>0&&(()=>{
            // Pick top 3: confirmed high > high > confirmed moderate > moderate
            const ranked = [...findings].sort((a,b)=>{
              const score = f => (f.confirmed?8:0)+(f.severity==="high"?4:f.severity==="moderate"?2:1);
              return score(b)-score(a);
            });
            // Exclude low-confidence metrics from Top 3 treatment priorities
            const LOW_CONF = ["neck lateral inclination","carrying angle","tibial bowing","ankle height","tibial varum"];
            const isVerify = (f) => LOW_CONF.some(m => (f.text||"").toLowerCase().includes(m));
            const top3 = ranked.filter(f => !isVerify(f)).slice(0,3);
            return(
              <div style={{marginBottom:14,padding:isWide?"16px 18px":"12px 14px",borderRadius:14,
                background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(147,51,234,0.04))",
                border:`1.5px solid ${PC.accent}30`}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                  <span style={{fontSize:"0.95rem"}}>◎</span>
                  <div>
                    <div style={{fontSize:isWide?"0.8rem":"0.72rem",fontWeight:900,color:PC.accent}}>Top 3 — Treat Now</div>
                    <div style={{fontSize:"0.58rem",color:PC.muted,marginTop:1}}>Highest clinical priority · Address in this order</div>
                  </div>
                </div>
                {top3.map((f,i)=>{
                  const col=f.severity==="high"?PC.red:f.severity==="moderate"?PC.yellow:PC.green;
                  // Pull first sentence of correction as the key action
                  const keyAction = f.correction?.split(/\.\s/)[0]||f.correction||"";
                  return(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                      padding:"9px 0",borderTop:i>0?`1px solid ${PC.border}`:"none"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",
                        background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"0.65rem",fontWeight:900,color:"#fff",flexShrink:0}}>
                        {i+1}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                          <span style={{fontSize:"0.6rem",fontWeight:700,color:col,
                            padding:"1px 6px",borderRadius:4,background:`${col}15`,
                            border:`1px solid ${col}25`,flexShrink:0}}>
                            {f.severity?.toUpperCase()}{f.confirmed?" ✓":""}
                          </span>
                          <span style={{fontSize:"0.65rem",fontWeight:700,color:PC.text,
                            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {f.region}
                          </span>
                        </div>
                        <div style={{fontSize:"0.63rem",color:PC.muted,lineHeight:1.4}}>
                          {keyAction}{keyAction&&!keyAction.endsWith(".")?".":""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {findings.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:PC.muted,fontSize: isWide?"0.9rem":"0.8rem"}}>
              {!measurements?"Upload or capture a photo to begin.":`✅ No significant postural deviations detected in ${VIEWS[view]?.label} view.`}
            </div>
          )}
          {/* Wide: two-column findings grid */}
          {isWide&&findings.length>0?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {highFindings.length>0&&(
                <div style={{gridColumn:"1/-1",marginBottom:4}}>
                  <div style={{fontSize:"0.65rem",fontWeight:700,color:PC.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>⚠ High Priority</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {highFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                  </div>
                </div>
              )}
              {otherFindings.length>0&&(
                <div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:"0.65rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Other Findings</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {otherFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                  </div>
                </div>
              )}
            </div>
          ):(
            <>
              {highFindings.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>⚠ High Priority</div>
                  {highFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                </div>
              )}
              {otherFindings.length>0&&(
                <div>
                  <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Other Findings</div>
                  {otherFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                </div>
              )}
            </>
          )}

          {/* Clinical reasoning cards — inline on findings tab when there are findings */}
          {findings.length > 0 && (
            <div style={{marginTop:18}}>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Clinical Reasoning</div>
              <MuscleImbalanceCard findings={findings} isWide={isWide}/>
              <SpecialTestsCard findings={findings} isWide={isWide}/>
              <div style={{padding:"8px 13px",borderRadius:10,background:`${PC.accent}08`,border:`1px solid ${PC.accent}20`,fontSize:"0.62rem",color:PC.accent,fontWeight:600,cursor:"pointer",textAlign:"center",marginTop:2}}
                onClick={()=>setTab("plan")}>
                ▶ View Full Exercise Programme →
              </div>
            </div>
          )}
        </div>
      )}

      {/* Muscle Imbalance tab */}
      {tab==="muscles"&&(
        <div style={{padding:isWide?"20px 24px":"14px 16px"}}>
          {findings.length > 0 ? (
            <>
              <MuscleImbalanceCard findings={findings} isWide={isWide}/>
              <div style={{padding:"10px 14px",borderRadius:10,background:PC.s2,border:`1px solid ${PC.border}`,fontSize:"0.6rem",color:PC.muted,lineHeight:1.6}}>
                ℹ️ Muscles listed are predicted from postural findings using Janda's muscle imbalance model. Always confirm with manual muscle testing and length assessment before treating.
              </div>
            </>
          ) : (
            <div style={{textAlign:"center",color:PC.muted,fontSize:"0.8rem",paddingTop:40}}>
              No findings yet — analyse a photo to populate the muscle imbalance table.
            </div>
          )}
        </div>
      )}

      {/* Exercise Plan tab */}
      {tab==="plan"&&(
        <ExercisePlanTab findings={findings} isWide={isWide}/>
      )}

      {/* Special Tests tab */}
      {tab==="tests"&&(
        <div style={{padding:isWide?"20px 24px":"14px 16px"}}>
          {findings.length > 0 ? (
            <>
              <SpecialTestsCard findings={findings} isWide={isWide}/>
              <div style={{padding:"10px 14px",borderRadius:10,background:PC.s2,border:`1px solid ${PC.border}`,fontSize:"0.6rem",color:PC.muted,lineHeight:1.6}}>
                ℹ️ Tests are suggested based on postural findings. Clinical judgement and contraindication screening required before performing any provocative test. Use in conjunction with patient history and subjective assessment.
              </div>
            </>
          ) : (
            <div style={{textAlign:"center",color:PC.muted,fontSize:"0.8rem",paddingTop:40}}>
              No findings yet — analyse a photo to generate special test recommendations.
            </div>
          )}
        </div>
      )}

      {/* Metrics tab */}
      {tab==="metrics"&&measurements&&(
        <div style={{padding: isWide?"20px 24px":"14px 16px"}}>
          {isWide?(
            // Wide: two-column metric grid
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px"}}>
              <div>
                <div style={{fontSize:"0.65rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Frontal Plane</div>
                <MetricRow label="Shoulder Tilt" value={measurements.shoulderAngle} unit="°" normal={3} abnormal={7}/>
                <MetricRow label="Pelvic Obliquity" value={measurements.pelvisAngle} unit="°" normal={3} abnormal={7}/>
                <MetricRow label="Head Tilt" value={measurements.headTiltAngle} unit="°" normal={2} abnormal={5}/>
                <MetricRow label="Trunk Lateral Shift" value={measurements.trunkLateralShift} unit="%" normal={3.5} abnormal={7}/>
                <MetricRow label="Head Lateral Offset" value={measurements.headLateralOffset} unit="%" normal={2.5} abnormal={6}/>
                <MetricRow label="Spinal Deviation" value={measurements.spinalDeviation} unit="%" normal={4} abnormal={8}/>
                <MetricRow label="Waist Asymmetry" value={measurements.waistAsymmetry} unit="%" normal={3} abnormal={6}/>
                <MetricRow label="L Knee Frontal" value={measurements.leftKneeFrontal} unit="°" normal={5} abnormal={10}/>
                <MetricRow label="R Knee Frontal" value={measurements.rightKneeFrontal} unit="°" normal={5} abnormal={10}/>
                <MetricRow label="Weight-Bearing Shift" value={measurements.weightBearingShift} unit="%" normal={4} abnormal={8}/>
                <MetricRow label="LLD Proxy" value={measurements.lldProxy} unit="mm" normal={5} abnormal={10}/>
                <MetricRow label="Neck Lateral Angle" value={measurements.neckLateralAngle} unit="°" normal={4} abnormal={8}/>
                <MetricRow label="Waist Triangle Asymm." value={measurements.waistTriangleAsymmetry} unit="%" normal={3} abnormal={6}/>
                <MetricRow label="Ankle LLD" value={measurements.ankleLLDmm} unit="mm" normal={5} abnormal={10}/>
                <MetricRow label="Tibial Varum L" value={measurements.tibialVarumL} unit="°" normal={5} abnormal={10}/>
                <MetricRow label="Tibial Varum R" value={measurements.tibialVarumR} unit="°" normal={5} abnormal={10}/>
                <MetricRow label="Carrying Angle L" value={measurements.carryingAngleL} unit="°" normal={15} abnormal={20}/>
                <MetricRow label="Carrying Angle R" value={measurements.carryingAngleR} unit="°" normal={15} abnormal={20}/>
              </div>
              <div>
                <div style={{fontSize:"0.65rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Sagittal Plane</div>
                {/* CVA — most important sagittal metric, shown prominently */}
                <div style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                  background:measurements.cvaAngle!=null&&measurements.cvaAngle<49?"rgba(220,38,38,0.07)":measurements.cvaAngle!=null&&measurements.cvaAngle<55?"rgba(180,83,9,0.07)":"rgba(5,150,105,0.07)",
                  border:`1px solid ${measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}25`}}>
                  <div style={{fontSize:"0.58rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:2}}>CVA — Primary FHP Marker</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                    <span style={{fontSize:"0.67rem",color:PC.text}}>Craniovertebral Angle</span>
                    <span style={{fontSize:"0.82rem",fontWeight:900,color:measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}}>
                      {measurements.cvaAngle!=null?`${measurements.cvaAngle.toFixed(1)}°`:"—"}
                    </span>
                  </div>
                  <div style={{fontSize:"0.57rem",color:PC.muted,marginTop:2}}>Normal &gt;55° · &lt;49° = High load · Hansraj cervical load model</div>
                </div>
                {measurements.cervicalLoadKg!=null&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                    <div style={{flex:1,fontSize:"0.68rem",color:PC.muted}}>Cervical Load <span style={{fontSize:"0.56rem"}}>(Hansraj)</span></div>
                    <div style={{fontSize:"0.75rem",fontWeight:800,color:measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green}}>{measurements.cervicalLoadKg.toFixed(1)}kg</div>
                  </div>
                )}
                <MetricRow label="Forward Head" value={measurements.fhpNorm} unit="%" normal={3} abnormal={7}/>
                <MetricRow label="Thoracic Kyphosis" value={measurements.thoracicAngle} unit="°" normal={45} abnormal={55}/>
                {/* Lumbar lordosis: paired with kyphosis — show together */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.68rem",color:PC.muted}}>Lumbar Lordosis (proxy)</div>
                    <div style={{fontSize:"0.55rem",color:PC.muted,marginTop:1}}>Normal 20–40° · Pairs with thoracic kyphosis — assess together</div>
                  </div>
                  <div style={{fontSize:"0.75rem",fontWeight:800,
                    color:measurements.lumbarProxy==null?"rgba(156,163,175,0.6)":Math.abs(measurements.lumbarProxy)>10?PC.red:Math.abs(measurements.lumbarProxy)>5?PC.yellow:PC.green}}>
                    {measurements.lumbarProxy!=null?`${measurements.lumbarProxy>0?"↑":"↓"}${Math.abs(measurements.lumbarProxy).toFixed(1)}%`:"—"}
                  </div>
                </div>
                <MetricRow label="Hip Extension Proxy" value={measurements.hipExtensionProxy} unit="%" normal={5} abnormal={10}/>
                <MetricRow label="L Knee Deviation" value={measurements.leftKneeDev} unit="°" normal={5} abnormal={12}/>
                <MetricRow label="R Knee Deviation" value={measurements.rightKneeDev} unit="°" normal={5} abnormal={12}/>
                <div style={{fontSize:"0.65rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Global & Symmetry</div>
                <MetricRow label="Scapular Asymmetry" value={measurements.scapularAsymm} unit="%" normal={2.5} abnormal={5}/>
                <MetricRow label="C7 Plumb Deviation" value={measurements.c7PlumbDev} unit="%" normal={3} abnormal={6}/>
                <MetricRow label="COG Deviation" value={measurements.cogDeviation} unit="%" normal={4} abnormal={8}/>
                <MetricRow label="Pelvic Obliquity" value={measurements.pelvicObliquity} unit="%" normal={3} abnormal={6}/>
                <MetricRow label="L Foot Angle" value={measurements.leftFootAngle} unit="°" normal={10} abnormal={20}/>
                <MetricRow label="R Foot Angle" value={measurements.rightFootAngle} unit="°" normal={10} abnormal={20}/>
                <MetricRow label="L Ankle Dorsiflexion" value={measurements.leftAnkleAngle} unit="°" normal={100} abnormal={85}/>
                <MetricRow label="R Ankle Dorsiflexion" value={measurements.rightAnkleAngle} unit="°" normal={100} abnormal={85}/>
                <MetricRow label="UCS Index" value={measurements.ucsIndex} unit="" normal={0.6} abnormal={1.0}/>
                <MetricRow label="LCS Index" value={measurements.lcsIndex} unit="" normal={0.5} abnormal={1.0}/>
              </div>
            </div>
          ):(
            // Mobile: stacked
            <>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Frontal Plane</div>
              <MetricRow label="Shoulder Tilt" value={measurements.shoulderAngle} unit="°" normal={3} abnormal={7}/>
              <MetricRow label="Pelvic Obliquity" value={measurements.pelvisAngle} unit="°" normal={3} abnormal={7}/>
              <MetricRow label="Head Tilt" value={measurements.headTiltAngle} unit="°" normal={2} abnormal={5}/>
              <MetricRow label="Trunk Lateral Shift" value={measurements.trunkLateralShift} unit="%" normal={3.5} abnormal={7}/>
              <MetricRow label="Head Lateral Offset" value={measurements.headLateralOffset} unit="%" normal={2.5} abnormal={6}/>
              <MetricRow label="Spinal Deviation" value={measurements.spinalDeviation} unit="%" normal={4} abnormal={8}/>
              <MetricRow label="Waist Asymmetry" value={measurements.waistAsymmetry} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="L Knee Frontal" value={measurements.leftKneeFrontal} unit="°" normal={5} abnormal={10}/>
              <MetricRow label="R Knee Frontal" value={measurements.rightKneeFrontal} unit="°" normal={5} abnormal={10}/>
              <MetricRow label="Weight-Bearing Shift" value={measurements.weightBearingShift} unit="%" normal={4} abnormal={8}/>
              <MetricRow label="LLD Proxy" value={measurements.lldProxy} unit="mm" normal={5} abnormal={10}/>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Sagittal Plane</div>
              {/* CVA highlighted card on mobile too */}
              <div style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                background:measurements.cvaAngle!=null&&measurements.cvaAngle<49?"rgba(220,38,38,0.07)":measurements.cvaAngle!=null&&measurements.cvaAngle<55?"rgba(180,83,9,0.07)":"rgba(5,150,105,0.07)",
                border:`1px solid ${measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}25`}}>
                <div style={{fontSize:"0.56rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:2}}>CVA — Primary FHP Marker</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <span style={{fontSize:"0.65rem",color:PC.text}}>Craniovertebral Angle</span>
                  <span style={{fontSize:"0.8rem",fontWeight:900,color:measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}}>
                    {measurements.cvaAngle!=null?`${measurements.cvaAngle.toFixed(1)}°`:"—"}
                  </span>
                </div>
                <div style={{fontSize:"0.55rem",color:PC.muted,marginTop:2}}>Normal &gt;55° · &lt;49° = High load</div>
              </div>
              {measurements.cervicalLoadKg!=null&&(
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                  <div style={{flex:1,fontSize:"0.68rem",color:PC.muted}}>Cervical Load Est. <span style={{fontSize:"0.56rem"}}>(Hansraj 2014)</span></div>
                  <div style={{fontSize:"0.75rem",fontWeight:800,color:measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green,minWidth:60,textAlign:"right"}}>{measurements.cervicalLoadKg.toFixed(1)}kg</div>
                </div>
              )}
              <MetricRow label="Forward Head" value={measurements.fhpNorm} unit="%" normal={3} abnormal={7}/>
              <MetricRow label="Thoracic Kyphosis" value={measurements.thoracicAngle} unit="°" normal={45} abnormal={55}/>
              {/* Lumbar lordosis paired with kyphosis */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.68rem",color:PC.muted}}>Lumbar Lordosis (proxy)</div>
                  <div style={{fontSize:"0.54rem",color:PC.muted,marginTop:1}}>Normal 20–40° · Pairs with kyphosis</div>
                </div>
                <div style={{fontSize:"0.75rem",fontWeight:800,minWidth:60,textAlign:"right",
                  color:measurements.lumbarProxy==null?"rgba(156,163,175,0.6)":Math.abs(measurements.lumbarProxy)>10?PC.red:Math.abs(measurements.lumbarProxy)>5?PC.yellow:PC.green}}>
                  {measurements.lumbarProxy!=null?`${measurements.lumbarProxy>0?"↑":"↓"}${Math.abs(measurements.lumbarProxy).toFixed(1)}%`:"—"}
                </div>
              </div>
              <MetricRow label="Hip Extension Proxy" value={measurements.hipExtensionProxy} unit="%" normal={5} abnormal={10}/>
              <MetricRow label="L Knee Deviation" value={measurements.leftKneeDev} unit="°" normal={5} abnormal={12}/>
              <MetricRow label="R Knee Deviation" value={measurements.rightKneeDev} unit="°" normal={5} abnormal={12}/>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>New Measurements</div>
              <MetricRow label="Neck Lateral Angle" value={measurements.neckLateralAngle} unit="°" normal={4} abnormal={8}/>
              <MetricRow label="Waist Triangle Asymm." value={measurements.waistTriangleAsymmetry} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="Ankle LLD" value={measurements.ankleLLDmm} unit="mm" normal={5} abnormal={10}/>
              <MetricRow label="Tibial Varum L" value={measurements.tibialVarumL} unit="°" normal={5} abnormal={10}/>
              <MetricRow label="Tibial Varum R" value={measurements.tibialVarumR} unit="°" normal={5} abnormal={10}/>
              <MetricRow label="Carrying Angle L" value={measurements.carryingAngleL} unit="°" normal={15} abnormal={20}/>
              <MetricRow label="Carrying Angle R" value={measurements.carryingAngleR} unit="°" normal={15} abnormal={20}/>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Bilateral Symmetry &amp; Global</div>
              <MetricRow label="Scapular Asymmetry" value={measurements.scapularAsymm} unit="%" normal={2.5} abnormal={5}/>
              <MetricRow label="C7 Plumb Deviation" value={measurements.c7PlumbDev} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="COG Deviation" value={measurements.cogDeviation} unit="%" normal={4} abnormal={8}/>
              <MetricRow label="Pelvic Obliquity" value={measurements.pelvicObliquity} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="L Foot Angle" value={measurements.leftFootAngle} unit="°" normal={10} abnormal={20}/>
              <MetricRow label="R Foot Angle" value={measurements.rightFootAngle} unit="°" normal={10} abnormal={20}/>
              <MetricRow label="L Ankle Dorsiflexion" value={measurements.leftAnkleAngle} unit="°" normal={100} abnormal={85}/>
              <MetricRow label="R Ankle Dorsiflexion" value={measurements.rightAnkleAngle} unit="°" normal={100} abnormal={85}/>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:10}}>Syndrome Indices</div>
              <MetricRow label="UCS Index" value={measurements.ucsIndex} unit="" normal={0.6} abnormal={1.0}/>
              <MetricRow label="LCS Index" value={measurements.lcsIndex} unit="" normal={0.5} abnormal={1.0}/>
            </>
          )}

          {/* PLI — both layouts */}
          {measurements.posturalLoadIndex!=null&&(
            <>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:18,marginBottom:7}}>Postural Load Index</div>
              <div style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${measurements.posturalLoadIndex>65?PC.red:measurements.posturalLoadIndex>35?PC.yellow:PC.green}30`,background:`${measurements.posturalLoadIndex>65?PC.red:measurements.posturalLoadIndex>35?PC.yellow:PC.green}08`,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <span style={{fontSize:"0.72rem",color:PC.muted}}>PLI (0 = ideal, 100 = max load)</span>
                  <span style={{fontSize:"1rem",fontWeight:900,color:measurements.posturalLoadIndex>65?PC.red:measurements.posturalLoadIndex>35?PC.yellow:PC.green}}>{measurements.posturalLoadIndex}/100</span>
                </div>
                <div style={{height:6,background:PC.s2,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${measurements.posturalLoadIndex}%`,height:"100%",background:measurements.posturalLoadIndex>65?PC.red:measurements.posturalLoadIndex>35?PC.yellow:PC.green,borderRadius:3,transition:"width 0.5s"}}/>
                </div>
              </div>
            </>
          )}

          {/* Regional sub-scores */}
          {scoreData?.subScores&&!isWide&&(
            <>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Regional Sub-scores</div>
              {Object.entries(scoreData.subScores).map(([region,val])=>{
                const col=val>=74?PC.green:val>=55?PC.yellow:PC.red;
                return(
                  <div key={region} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${PC.border}`}}>
                    <div style={{flex:1,fontSize:"0.68rem",color:PC.muted,textTransform:"capitalize"}}>{region}</div>
                    <div style={{width:60,height:4,background:PC.s2,borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:`${val}%`,height:"100%",background:col,borderRadius:2}}/>
                    </div>
                    <div style={{fontSize:"0.72rem",fontWeight:800,color:col,minWidth:32,textAlign:"right"}}>{Math.round(val)}</div>
                  </div>
                );
              })}
            </>
          )}

          {/* Calibration */}
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:18,marginBottom:7}}>Calibration — Real Measurements</div>
          <div style={{padding:"10px 14px",borderRadius:12,border:`1px solid ${PC.border}`,background:PC.surface,marginBottom:8}}>
            <div style={{fontSize:"0.7rem",color:PC.muted,marginBottom:8}}>Patient height — used to convert % measurements to real cm</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <input type="number" min={100} max={220} value={patientHeightCm}
                onChange={e=>setPatientHeightCm(Number(e.target.value))}
                style={{flex:1,padding:"8px 12px",border:`1px solid ${PC.border}`,borderRadius:9,fontSize:"0.85rem",background:PC.bg,color:PC.text}}/>
              <span style={{fontSize:"0.75rem",color:PC.muted}}>cm</span>
            </div>
            {measurements?._calibrated?(
              <div>
                <div style={{fontSize:"0.6rem",fontWeight:700,color:PC.green,marginBottom:6}}>✓ Calibrated — showing real measurements</div>
                {[
                  ["Forward Head Posture", measurements.fhpCm, "cm", 2, 3.5, "Normal: <1.5cm"],
                  ["Shoulder Height Diff", measurements.shoulderDiffCm, "cm", 0.8, 1.8, "Normal: <0.5cm"],
                  ["Pelvic Height Diff (ASIS)", measurements.pelvisDiffCm, "cm", 0.8, 1.5, "Normal: <0.5cm"],
                  ["Trunk Lateral Shift", measurements.trunkShiftCm, "cm", 1.5, 3, "Normal: <1cm"],
                  ["Head Lateral Offset", measurements.headOffsetCm, "cm", 1, 2.5, "Normal: <0.8cm"],
                  ["Ankle LLD (proxy)", measurements.ankleLLDcm, "cm", 0.5, 1, "Significant: >0.5cm — confirm with tape"],
                ].map(([label, val, unit, warn, crit, hint])=>{
                  if(val===null||val===undefined) return null;
                  const col = val>crit?PC.red:val>warn?PC.yellow:PC.green;
                  return(
                    <div key={label} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${PC.border}`}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:"0.68rem",color:PC.muted}}>{label}</div>
                        <div style={{fontSize:"0.55rem",color:PC.muted,opacity:0.7}}>{hint}</div>
                      </div>
                      <div style={{fontSize:"0.82rem",fontWeight:800,color:col}}>{val.toFixed(1)}{unit}</div>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0}}/>
                    </div>
                  );
                })}
              </div>
            ):(
              <div style={{fontSize:"0.65rem",color:PC.muted,fontStyle:"italic"}}>
                Upload a photo or start camera to compute calibration from detected landmarks.
              </div>
            )}
          </div>
          {reliability?.icc!=null&&(
            <div style={{padding:"8px 0",borderBottom:`1px solid ${PC.border}`,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"0.7rem",color:PC.muted}}>ICC estimate (test-retest reliability)</span>
              <span style={{fontSize:"0.75rem",fontWeight:800,color:reliability.icc>0.75?PC.green:reliability.icc>0.5?PC.yellow:PC.red}}>{reliability.icc}</span>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab==="history"&&(
        <div style={{padding: isWide?"20px 24px":"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize: isWide?"0.95rem":"0.8rem",color:PC.text}}>Session History</div>
            {sessions.length>0&&<button onClick={clearHistory} style={{fontSize:"0.68rem",color:PC.red,background:"none",border:"none",cursor:"pointer"}}>Clear all</button>}
          </div>
          {sessions.length===0&&<div style={{textAlign:"center",color:PC.muted,fontSize:"0.82rem",padding:"30px"}}>No sessions yet. Capture or analyse a photo to start tracking.</div>}
          {sessions.length>=2&&(
            <div style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${PC.border}`,marginBottom:14,background:PC.surface}}>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Score Trend</div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <PostureSparkline sessions={sessions} colour={PC.accent}/>
                <div>
                  <div style={{fontSize:"0.82rem",fontWeight:900,color:PC.accent}}>{sessions[sessions.length-1].score} <span style={{fontSize:"0.65rem",fontWeight:400,color:PC.muted}}>latest</span></div>
                  <div style={{fontSize:"0.65rem",color:sessions[sessions.length-1].score>=sessions[sessions.length-2].score?PC.green:PC.red}}>
                    {sessions[sessions.length-1].score>=sessions[sessions.length-2].score?"▲":"▼"} {Math.abs(sessions[sessions.length-1].score-sessions[sessions.length-2].score)} vs prev
                  </div>
                </div>
              </div>
            </div>
          )}
          <div style={isWide?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}:{}}>
            {[...sessions].reverse().map((s,i)=>(
              <div key={i} style={{padding:"11px 14px",borderRadius:11,border:`1px solid ${PC.border}`,marginBottom: isWide?0:8,background:PC.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:700,fontSize:"0.75rem",color:PC.text}}>{VIEWS[s.view]?.label||s.view} · Score {s.score}</div>
                  <div style={{fontSize:"0.62rem",color:PC.muted}}>{new Date(s.time).toLocaleTimeString()}</div>
                </div>
                <div style={{fontSize:"0.68rem",color:PC.muted,marginTop:3}}>{s.band} · {s.findings} finding{s.findings!==1?"s":""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Left panel: controls + image ────────────────────────────────────────────
  // ── Multi-view helpers ───────────────────────────────────────────────────────
  const mvViewOrder = ["anterior","posterior","left","right"];
  const mvCapturedCount = Object.keys(mvResults).length;
  const mvCanGenerate = mvCapturedCount >= 2;

  function handleGenerateComposite() {
    const composite = mergeViewResults(Object.values(mvResults));
    setMvComposite(composite);
    setMvTab("report");
  }
  function handleClearMv() { setMvResults({}); setMvComposite(null); setMvTab("capture"); }

  // Assessment mode toggle strip
  const assessModeToggle = (
    <div style={{padding:isWide?"8px 20px":"8px 16px",background:PC.bg,borderBottom:`1px solid ${PC.border}`,display:"flex",gap:6}}>
      {[
        ["single","▣ Single View","Quick screen — one view"],
        ["multi", "☰ Multi-View", "Full assessment — 2–4 views"],
      ].map(([m,label,sub])=>(
        <button key={m} onClick={()=>{ setAssessMode(m); if(m==="single"){setMvResults({});setMvComposite(null);} }}
          style={{flex:1,padding:isWide?"9px 8px":"8px 6px",borderRadius:10,
            border:`1px solid ${assessMode===m?PC.accent:PC.border}`,
            background:assessMode===m?`${PC.accent}14`:"transparent",
            color:assessMode===m?PC.accent:PC.muted,
            fontWeight:700,fontSize:isWide?"0.78rem":"0.7rem",cursor:"pointer",textAlign:"center"}}>
          <div>{label}</div>
          <div style={{fontSize:"0.55rem",fontWeight:400,marginTop:2,opacity:0.75}}>{sub}</div>
        </button>
      ))}
    </div>
  );

  // Multi-view progress strip (shown below view selector in multi mode)
  const mvCaptureStrip = assessMode==="multi" && (
    <div style={{padding:isWide?"12px 20px":"10px 16px",background:PC.s2,borderBottom:`1px solid ${PC.border}`}}>
      <div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>☰ Multi-View Progress ({mvCapturedCount}/4)</span>
        {mvCapturedCount>0&&<button onClick={handleClearMv} style={{fontSize:"0.58rem",color:PC.red,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Reset all</button>}
      </div>
      {/* Per-view dots */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
        {mvViewOrder.map(vk=>{
          const meta=VIEWS[vk]; const done=!!mvResults[vk]; const isAct=view===vk;
          return(
            <button key={vk} onClick={()=>setView(vk)} style={{padding:"6px 4px",borderRadius:9,
              border:`1px solid ${done?PC.green:isAct?meta.colour:PC.border}`,
              background:done?`${PC.green}12`:isAct?`${meta.colour}12`:"transparent",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:"0.9rem"}}>{done?"✅":meta.icon}</div>
              <div style={{fontSize:"0.55rem",fontWeight:700,color:done?PC.green:isAct?meta.colour:PC.muted,marginTop:2}}>{meta.short}</div>
            </button>
          );
        })}
      </div>
      {/* Plane coverage */}
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["Frontal",!!(mvResults.anterior||mvResults.posterior),"Anterior or Posterior"],
          ["Sagittal",!!(mvResults.left||mvResults.right),"Left or Right lateral"]
        ].map(([label,has,tip])=>(
          <div key={label} style={{flex:1,padding:"5px 8px",borderRadius:7,
            background:has?`${PC.green}10`:`${PC.border}40`,border:`1px solid ${has?PC.green:PC.border}`,
            display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:"0.65rem"}}>{has?"✓":"○"}</span>
            <div>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:has?PC.green:PC.muted}}>{label}</div>
              <div style={{fontSize:"0.52rem",color:PC.muted}}>{tip}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Generate button */}
      <button onClick={handleGenerateComposite} disabled={!mvCanGenerate} style={{
        width:"100%",padding:"11px",borderRadius:11,border:"none",
        background:mvCanGenerate?`linear-gradient(135deg,${PC.accent},${PC.a2})`:PC.s3,
        color:mvCanGenerate?"#fff":PC.muted,fontWeight:800,
        fontSize:isWide?"0.85rem":"0.78rem",cursor:mvCanGenerate?"pointer":"not-allowed"}}>
        {mvCanGenerate?`▶ Generate Composite Report (${mvCapturedCount} views)`:`Upload ≥2 views to generate report`}
      </button>
    </div>
  );

  // Multi-view thumbnail strip — shows captured images side by side
  const mvThumbnailStrip = assessMode==="multi" && mvCapturedCount > 0 && (
    <div style={{padding:"10px 16px",background:PC.surface,borderBottom:`1px solid ${PC.border}`}}>
      <div style={{fontSize:"0.58rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>
        Captured Views — {mvCapturedCount} of 4
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
        {mvViewOrder.map(vk=>{
          const res=mvResults[vk];
          const meta=VIEWS[vk];
          const isActive=view===vk;
          if(!res && !isActive) return null; // only show captured + current active
          return(
            <div key={vk} onClick={()=>setView(vk)}
              style={{flexShrink:0,width:72,cursor:"pointer",
                border:`2px solid ${isActive?meta.colour:res?PC.green:PC.border}`,
                borderRadius:9,overflow:"hidden",position:"relative"}}>
              {res?.img ? (
                <img src={res.img} alt={meta.label}
                  style={{width:"100%",height:56,objectFit:"cover",display:"block"}}/>
              ) : (
                <div style={{width:"100%",height:56,background:PC.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem"}}>{meta.icon}</div>
              )}
              <div style={{padding:"2px 4px",background:res?"rgba(5,150,105,0.85)":isActive?`rgba(124,58,237,0.85)`:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:"0.52rem",fontWeight:700,color:"#fff"}}>{meta.short}</span>
                {res?.scoreData&&<span style={{fontSize:"0.52rem",color:"#fff",fontWeight:800}}>{res.scoreData.score}</span>}
                {!res&&isActive&&<span style={{fontSize:"0.5rem",color:"#fff"}}>active</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Multi-view composite report (replaces right panel when ready)
  const mvReportPanel = assessMode==="multi" && mvComposite && mvTab==="report" && (
    <div style={{flex:1,overflowY:"auto",paddingBottom:isMobile?80:24}}>
      {/* Header */}
      <div style={{padding:isWide?"18px 24px":"14px 16px",borderBottom:`1px solid ${PC.border}`,background:PC.surface,display:"flex",alignItems:"center",justifyContent:"space-between",position:isWide?"sticky":"static",top:0,zIndex:5}}>
        <div>
          <div style={{fontWeight:900,fontSize:isWide?"1rem":"0.9rem",color:PC.text}}>Multi-View Composite Report</div>
          <div style={{fontSize:"0.62rem",color:PC.muted,marginTop:2}}>
            {mvComposite.coverage.viewCount} views · {mvComposite.coverage.frontal?"✓ Frontal":"○ Frontal"} · {mvComposite.coverage.sagittal?"✓ Sagittal":"○ Sagittal"}
          </div>
        </div>
        <button onClick={()=>setMvTab("capture")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${PC.border}`,background:PC.s2,fontSize:"0.68rem",fontWeight:700,color:PC.muted,cursor:"pointer"}}>← Back</button>
      </div>

      {/* Captured view thumbnails inside report */}
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${PC.border}`,background:PC.s2}}>
        <div style={{fontSize:"0.58rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Views Analysed</div>
        <div style={{display:"flex",gap:8,overflowX:"auto"}}>
          {mvViewOrder.map(vk=>{
            const res=mvResults[vk]; if(!res) return null;
            const meta=VIEWS[vk];
            return(
              <div key={vk} style={{flexShrink:0,width:isWide?88:72,borderRadius:9,overflow:"hidden",border:`2px solid ${PC.green}`}}>
                {res.img&&<img src={res.img} alt={meta.label} style={{width:"100%",height:isWide?64:54,objectFit:"cover",display:"block"}}/>}
                <div style={{padding:"2px 5px",background:"rgba(5,150,105,0.85)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"0.52rem",fontWeight:700,color:"#fff"}}>{meta.short}</span>
                  {res.scoreData&&<span style={{fontSize:"0.55rem",color:"#fff",fontWeight:800}}>{res.scoreData.score}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{padding:isWide?"20px 24px":"14px 16px"}}>
        {/* Score + summary */}
        <div style={{marginBottom:16,padding:isWide?"18px":"14px",background:PC.surface,borderRadius:14,border:`1px solid ${mvComposite.compositeColour}30`}}>
          {/* Score header */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
            <ScoreRingBand score={mvComposite.compositeScore} band={mvComposite.compositeBand} colour={mvComposite.compositeColour} size={isWide?96:80}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:900,fontSize:isWide?"1rem":"0.88rem",color:mvComposite.compositeColour}}>
                {mvComposite.compositeBand}
              </div>
              <div style={{fontSize:"0.72rem",color:PC.text,fontWeight:700,marginTop:2}}>
                Posture Score: {mvComposite.compositeScore}/100
              </div>
              <div style={{fontSize:"0.62rem",color:PC.muted,marginTop:4,lineHeight:1.5}}>
                {mvComposite.summary}
              </div>
            </div>
          </div>
          {/* Score scale legend */}
          <div style={{display:"flex",gap:4,marginTop:4}}>
            {[["88–100","Optimal","#059669"],["74–87","Good","#22c55e"],["58–73","Fair","#f59e0b"],["40–57","Needs Attention","#f97316"],["0–39","Priority Review","#dc2626"]].map(([range,label,col])=>{
              const isActive = (()=>{
                const s=mvComposite.compositeScore;
                if(range.startsWith("88"))return s>=88;
                if(range.startsWith("74"))return s>=74&&s<88;
                if(range.startsWith("58"))return s>=58&&s<74;
                if(range.startsWith("40"))return s>=40&&s<58;
                return s<40;
              })();
              return(
                <div key={range} style={{flex:1,textAlign:"center",padding:"5px 2px",borderRadius:7,
                  background:isActive?col+"20":"transparent",
                  border:isActive?`1px solid ${col}55`:`1px solid transparent`}}>
                  <div style={{fontSize:"0.55rem",fontWeight:isActive?800:400,color:isActive?col:PC.muted,lineHeight:1.2}}>{label}</div>
                  <div style={{fontSize:"0.48rem",color:isActive?col:PC.muted,opacity:0.7}}>{range}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Named patterns */}
        {(mvComposite.sagittalPattern||mvComposite.frontalPattern)&&(
          <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:6}}>
            {mvComposite.sagittalPattern&&(
              <div style={{padding:"9px 13px",borderRadius:10,background:`${PC.accent}10`,border:`1px solid ${PC.accent}25`,fontSize:"0.72rem",fontWeight:700,color:PC.accent}}>
                ◈ Sagittal: {mvComposite.sagittalPattern}
              </div>
            )}
            {mvComposite.frontalPattern&&(
              <div style={{padding:"9px 13px",borderRadius:10,background:`${PC.a2}10`,border:`1px solid ${PC.a2}25`,fontSize:"0.72rem",fontWeight:700,color:PC.a2}}>
                ◈ Frontal: {mvComposite.frontalPattern}
              </div>
            )}
          </div>
        )}
        {/* Regional sub-scores */}
        {mvComposite.subScores&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Regional Scores</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(mvComposite.subScores).map(([region,val])=>{
                if(val==null) return null;
                const col=val>=74?PC.green:val>=55?PC.yellow:PC.red;
                return(
                  <div key={region} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:`${col}12`,border:`1px solid ${col}30`}}>
                    <span style={{fontSize:"0.62rem",color:PC.muted,textTransform:"capitalize"}}>{region}</span>
                    <span style={{fontSize:"0.7rem",fontWeight:800,color:col}}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── FINDINGS — Priority top 5 with expand ── */}
        <FindingsDisplay findings={mvComposite.mergedFindings} PC={PC}/>
      </div>
    </div>
  );

  const leftPanel = (
    <div style={{display:"flex",flexDirection:"column",flex: isWide?"0 0 480px":"1",minWidth:0,borderRight: isWide?`1px solid ${PC.border}`:"none",overflowY: isWide?"hidden":"auto"}}>

      {/* Assessment mode toggle: Single View vs Multi-View */}
      {assessModeToggle}

      {/* Mode toggle */}
      <div style={{padding: isWide?"10px 20px":"10px 16px",background:PC.surface,borderBottom:`1px solid ${PC.border}`,display:"flex",gap:8}}>
        {[["upload","↑ Upload"],["live","▣ Live"]].map(([m,label])=>(
          <button key={m} onClick={()=>{setMode(m);if(m==="live")setTab("capture");else{stopCamera();setTab("capture");}}}
            style={{flex:1,padding: isWide?"10px":"9px",borderRadius:10,border:`1px solid ${mode===m?viewMeta.colour:PC.border}`,background:mode===m?`${viewMeta.colour}15`:"transparent",color:mode===m?viewMeta.colour:PC.muted,fontWeight:700,fontSize: isWide?"0.85rem":"0.78rem",cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>

      {/* AI/Manual toggle */}
      {!isLive&&(
        <div style={{padding: isWide?"8px 20px":"8px 16px",background:PC.s3,borderBottom:`1px solid ${PC.border}`,display:"flex",gap:6}}>
          {[["ai","⚙ Auto Detect"],["manual","✋ Manual Points (~90-95%)"]].map(([m,label])=>(
            <button key={m} onClick={()=>handleModeSwitch(m)}
              style={{flex:1,padding:"7px 6px",borderRadius:9,border:`1px solid ${inputMode===m?PC.accent:PC.border}`,background:inputMode===m?`${PC.accent}18`:"transparent",color:inputMode===m?PC.accent:PC.muted,fontWeight:700,fontSize: isWide?"0.75rem":"0.68rem",cursor:"pointer",textAlign:"center"}}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* View selector */}
      <div style={{padding: isWide?"12px 20px":"10px 16px",background:PC.s2,borderBottom:`1px solid ${PC.border}`}}>
        <div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Select View</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap: isWide?10:7}}>
          {Object.entries(VIEWS).map(([key,meta])=>{
            const active=view===key;
            return(
              <button key={key} onClick={()=>handleViewSwitch(key)}
                style={{padding: isWide?"10px 4px":"8px 4px",borderRadius:11,border:`1px solid ${active?meta.colour:PC.border}`,background:active?`${meta.colour}18`:"transparent",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                <div style={{fontSize: isWide?"1.2rem":"1rem",marginBottom:2}}>{meta.icon}</div>
                <div style={{fontSize: isWide?"0.7rem":"0.62rem",fontWeight:800,color:active?meta.colour:PC.muted,lineHeight:1.2}}>{meta.short}</div>
                <div style={{fontSize:"0.5rem",color:active?meta.colour:PC.muted,opacity:0.75,marginTop:2}}>{meta.badge}</div>
              </button>
            );
          })}
        </div>
        <div style={{marginTop:8,padding:"7px 11px",background:`${viewMeta.colour}08`,border:`1px solid ${viewMeta.colour}20`,borderRadius:9,fontSize: isWide?"0.72rem":"0.65rem",color:PC.muted}}>
          <div>{viewMeta.helper}</div>
          {viewMeta.checks&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px",marginTop:5}}>
              {viewMeta.checks.map((c,i)=><span key={i} style={{color:PC.a3,fontSize:"0.62rem"}}>✓ {c}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Multi-view progress strip */}
      {mvCaptureStrip}

      {/* Multi-view thumbnail strip */}
      {mvThumbnailStrip}

      {/* Camera / Upload area */}
      <div style={{flex:1,overflowY:"auto"}}>
        {isLive?(
          <div>
            {!camReady?(
              <div style={{padding: isWide?"20px":"16px",display:"flex",flexDirection:"column",gap:10}}>
                {error&&<div style={{padding:"10px 13px",background:"rgba(220,38,38,0.08)",border:`1px solid ${PC.red}30`,borderRadius:9,fontSize:"0.76rem",color:PC.red}}>{error}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["environment","▣ Back Camera"],["user","⎇ Front Camera"]].map(([f,label])=>(
                    <button key={f} onClick={()=>startCamera(f)} disabled={mpStatus!=="ready"}
                      style={{padding: isWide?"16px":"13px",borderRadius:12,border:`1px solid ${PC.border}`,background:PC.surface,color:mpStatus==="ready"?PC.text:PC.muted,fontWeight:700,fontSize: isWide?"0.85rem":"0.78rem",cursor:mpStatus==="ready"?"pointer":"not-allowed"}}>
                      {label}
                    </button>
                  ))}
                </div>
                {camStatus==="starting"&&<div style={{textAlign:"center",color:PC.yellow,fontSize:"0.78rem"}}>⏳ Starting camera…</div>}
              </div>
            ):(
              <div>
                <div style={{position:"relative",background:"#111",width:"100%",overflow:"hidden",borderRadius:0}}>
                  {/* Video — NO scaleX flip; front camera CSS-flipped only when user-facing */}
                  <video ref={videoRef} playsInline webkit-playsinline="true" muted autoPlay
                    style={{width:"100%",display:"block",
                      transform:camFacing==="user"?"scaleX(-1)":"none",
                      maxHeight: isMobile?"55vw":"45vh",
                      objectFit:"cover",background:"#111"}}/>
                  {/* Canvas overlay — matches video flip */}
                  <canvas ref={overlayRef}
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",
                      transform:camFacing==="user"?"scaleX(-1)":"none",
                      pointerEvents:"none"}}/>
                  <div style={{position:"absolute",top:8,left:8,display:"flex",gap:5,flexWrap:"wrap"}}>
                    <div style={{padding:"3px 8px",borderRadius:8,background:"rgba(0,0,0,0.7)",fontSize:"0.62rem",fontWeight:700,color:hasData?PC.green:PC.yellow}}>
                      {hasData?`● Tracking · ${reliability?.score}% · ICC ${reliability?.icc??"-"}`:"● Searching…"}
                    </div>
                    {motionWarning&&<div style={{padding:"3px 8px",borderRadius:8,background:"rgba(0,0,0,0.7)",fontSize:"0.62rem",fontWeight:700,color:PC.yellow}}>⟳ Hold still</div>}
                    <div style={{padding:"3px 8px",borderRadius:8,background:"rgba(0,0,0,0.7)",fontSize:"0.62rem",fontWeight:700,color:PC.a3}}>— {patientHeightCm}cm</div>
                  </div>
                  {scoreData&&<div style={{position:"absolute",top:8,right:8}}><ScoreRingBand score={scoreData.score} band={scoreData.band} colour={scoreData.colour} size={isMobile?60:80}/></div>}
                  {countdown!==null&&(
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)"}}>
                      <div style={{fontSize:"6rem",fontWeight:900,color:"#fff"}}>{countdown}</div>
                    </div>
                  )}
                  {analysing&&countdown===null&&(
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.65)",gap:10}}>
                      <div style={{fontSize:"2rem"}}>⏳</div>
                      <div style={{fontWeight:800,fontSize:"0.85rem",color:"#fff"}}>Analysing…</div>
                      <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.7)"}}>{VIEWS[viewRef.current]?.label||viewRef.current} view · plumb line computing</div>
                    </div>
                  )}
                </div>
                <div style={{padding:"10px 14px",background:PC.surface,borderTop:`1px solid ${PC.border}`,display:"flex",gap:8}}>
                  <button onClick={()=>capturePhoto(0)} disabled={!hasData||analysing}
                    style={{flex:2,padding: isWide?"13px":"11px",background:hasData&&!analysing?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#e5e7eb",border:"none",borderRadius:10,color:hasData&&!analysing?"#fff":PC.muted,fontWeight:800,fontSize: isWide?"0.85rem":"0.78rem",cursor:hasData&&!analysing?"pointer":"not-allowed"}}>
                    {analysing?"⏳ Analysing…":"☉ Capture"}
                  </button>
                  <button onClick={()=>capturePhoto(3)} disabled={!hasData}
                    style={{flex:1,padding:"11px",background:`${PC.a2}20`,border:`1px solid ${PC.a2}30`,borderRadius:10,color:PC.a2,fontWeight:700,fontSize:"0.75rem",cursor:hasData?"pointer":"not-allowed"}}>
                    ⏳ 3s
                  </button>
                  <button onClick={flipCamera} style={{flex:"0 0 44px",padding:"11px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,cursor:"pointer"}}>↻</button>
                  <button onClick={stopCamera} style={{flex:"0 0 44px",padding:"11px",background:"rgba(220,38,38,0.1)",border:`1px solid ${PC.red}30`,borderRadius:10,color:PC.red,cursor:"pointer"}}>⏹</button>
                </div>
              </div>
            )}
          </div>
        ):(
          <div style={{padding: isWide?"20px":"16px"}}>
            {error&&<div style={{padding:"10px 13px",background:"rgba(220,38,38,0.08)",border:`1px solid ${PC.red}30`,borderRadius:9,fontSize:"0.76rem",color:PC.red,marginBottom:12}}>{error}</div>}
            <button onClick={()=>fileInputRef.current?.click()}
              disabled={inputMode==="ai"?(mpStatus!=="ready"||analysing):false}
              style={{width:"100%",padding: isWide?"20px":"16px",borderRadius:14,border:`2px dashed ${viewMeta.colour}`,background:`${viewMeta.colour}08`,color:viewMeta.colour,fontWeight:700,fontSize: isWide?"0.9rem":"0.82rem",cursor:"pointer",textAlign:"center",marginBottom:14}}>
              {analysing?"⏳ Analysing…":"▤ Tap to upload photo"}
              <div style={{fontSize: isWide?"0.72rem":"0.65rem",fontWeight:400,marginTop:5,color:PC.muted}}>
                {inputMode==="manual"?"Upload photo — then tap each anatomical point":"JPG, PNG — full body, clear background"}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>

            {/* Manual mode */}
            {inputMode==="manual"&&uploadedImg&&(
              <div>
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:PC.accent}}>✋ Manual Points: {manualPlacedCount} / {manualTotal}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={undoLastManual} disabled={manualPlacedCount===0}
                        style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${PC.border}`,background:PC.s2,fontSize:"0.65rem",fontWeight:700,color:PC.muted,cursor:manualPlacedCount>0?"pointer":"not-allowed"}}>
                        ↩ Undo
                      </button>
                      <button onClick={resetManual} disabled={manualPlacedCount===0}
                        style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${PC.red}30`,background:"rgba(220,38,38,0.06)",fontSize:"0.65rem",fontWeight:700,color:PC.red,cursor:manualPlacedCount>0?"pointer":"not-allowed"}}>
                        Reset
                      </button>
                    </div>
                  </div>
                  <div style={{height:6,borderRadius:6,background:PC.s3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${manualPct*100}%`,background:manualCanAnalyse?PC.green:PC.accent,borderRadius:6,transition:"width 0.3s"}}/>
                  </div>
                </div>
                {nextManualIdx >= 0 ? (
                  <div style={{padding:"7px 11px",borderRadius:8,background:`${PC.accent}10`,border:`1px solid ${PC.accent}30`,fontSize:"0.7rem",color:PC.accent,marginBottom:9,fontWeight:700}}>
                    Next: {nextManualIdx+1}. {manualPointDefs[nextManualIdx]?.label} — {manualPointDefs[nextManualIdx]?.desc}
                  </div>
                ) : (
                  <div style={{padding:"7px 11px",borderRadius:8,background:`${PC.green}10`,border:`1px solid ${PC.green}30`,fontSize:"0.7rem",color:PC.green,marginBottom:9,fontWeight:700}}>
                    All points placed!
                  </div>
                )}
                <div ref={manualContainerRef} onClick={handleManualImageClick}
                  style={{position:"relative",borderRadius:12,overflow:"hidden",border:`2px solid ${PC.accent}`,cursor:nextManualIdx>=0?"crosshair":"default",marginBottom:10}}>
                  <img src={objectUrlRef.current||uploadedImg} alt="Tap to place points"
                    onLoad={e=>{ manualImgSize.current={w:e.target.naturalWidth,h:e.target.naturalHeight}; }}
                    style={{width:"100%",display:"block",userSelect:"none",pointerEvents:"none"}}/>
                  <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}} viewBox="0 0 1 1" preserveAspectRatio="none">
                    {manualConnections.map(([a,b],ci)=>{
                      const pa=manualPlaced[a], pb=manualPlaced[b];
                      if(!pa||!pb) return null;
                      return <line key={ci} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="rgba(0,229,255,0.7)" strokeWidth="0.003"/>;
                    })}
                    {manualPointDefs.map(def=>{
                      const p=manualPlaced[def.id]; if(!p) return null;
                      return (
                        <g key={def.id}>
                          <circle cx={p.x} cy={p.y} r="0.018" fill="rgba(0,229,255,0.9)" stroke="white" strokeWidth="0.004"/>
                          <text x={p.x} y={p.y+0.006} textAnchor="middle" fontSize="0.014" fontWeight="bold" fill="#000">{def.id+1}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div style={{display:"grid",gridTemplateColumns: isWide?"repeat(3,1fr)":"repeat(2,1fr)",gap:4,marginBottom:10}}>
                  {manualPointDefs.map(def=>{
                    const done=!!manualPlaced[def.id];
                    const isNext=def.id===manualPointDefs[nextManualIdx]?.id;
                    return(
                      <div key={def.id} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 7px",borderRadius:6,background:done?`${PC.green}10`:isNext?`${PC.accent}10`:"transparent",border:`1px solid ${done?PC.green:isNext?PC.accent:PC.border}`}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:done?PC.green:isNext?PC.accent:PC.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.55rem",fontWeight:900,color:"#fff",flexShrink:0}}>{done?"✓":def.id+1}</div>
                        <div style={{fontSize:"0.6rem",color:done?PC.green:isNext?PC.accent:PC.muted,fontWeight:done||isNext?700:400,lineHeight:1.2}}>{def.label}</div>
                      </div>
                    );
                  })}
                </div>
                {manualCanAnalyse&&(
                  <button onClick={analyseManualPoints}
                    style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize: isWide?"0.9rem":"0.82rem",cursor:"pointer"}}>
                    ✋ Analyse Now — {manualPlacedCount}/{manualTotal} points
                  </button>
                )}
              </div>
            )}

            {/* AI mode image — always show original photo; overlay annotated result on top */}
            {inputMode==="ai"&&(rawUploadedImg||uploadedImg)&&(
              <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${PC.border}`,boxShadow:isWide?"0 4px 20px rgba(0,0,0,0.08)":"none",background:PC.s2,position:"relative"}}>
                {/* Layer 1: original photo — always visible, never a blank/black canvas */}
                <img
                  src={rawUploadedImg||uploadedImg}
                  alt="Uploaded"
                  style={{width:"100%",display:"block",opacity:analysing?0.55:1,transition:"opacity 0.3s"}}
                />
                {/* Layer 2: annotated overlay — shown once analysis produces a result */}
                {uploadedImg&&uploadedImg!==rawUploadedImg&&!analysing&&(
                  <img
                    src={uploadedImg}
                    alt="Analysed overlay"
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"fill",display:"block"}}
                    onError={e=>{ e.target.style.display="none"; }} // hide silently if canvas was tainted/black
                  />
                )}
                {/* Analysing spinner */}
                {analysing&&(
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}>
                    <div style={{padding:"10px 18px",borderRadius:10,background:"rgba(0,0,0,0.75)",color:"#fff",fontSize:"0.78rem",fontWeight:700}}>⏳ Analysing…</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── Report generator ─────────────────────────────────────────────────────────
  function generateReport() {
    if(!findings.length||!scoreData) return;
    const annotatedImg = uploadedImg || capturedImg || null;
    const views = [view];
    const m = measurements||{};

    // Build findings for report
    const rptFindings = findings.map(f=>({
      region: f.region||f.label||"Finding",
      text: f.text||f.label||"",
      severity: (f.severity||"moderate").toLowerCase(),
      plain: f.plain || f.description || f.text || "",
      whatIfUntreated: f.whatIfUntreated || "May worsen without targeted intervention.",
      correction: f.correction || (f.exercises||[]).join(". ") || "See exercise plan.",
      icd: f.icd || "—",
      norm: f.norm || "—",
      measured: f.measured || "—",
    }));

    // Build exercise list
    const rptExercises = (buildExercisePlan ? buildExercisePlan(findings,view) : []).map((ex,i)=>({
      phase: ex.cat==="inhibit"?1:ex.cat==="activate"?2:3,
      category: (ex.cat||"correct").toUpperCase(),
      name: ex.name||"Exercise",
      sets: ex.sets||"3×10",
      freq: "Daily",
      cue: ex.cue||ex.description||"",
    }));

    // Goals from findings
    const goals = [];
    if(m.cvaAngle!=null) goals.push({metric:"CVA",current:m.cvaAngle.toFixed(1)+"°",target:">52°",timeframe:"6 weeks"});
    if(m.thoracicAngle!=null) goals.push({metric:"Thoracic Kyphosis",current:m.thoracicAngle.toFixed(1)+"°",target:"<45°",timeframe:"8 weeks"});
    if(scoreData?.score!=null) goals.push({metric:"Posture Score",current:scoreData.score+"/100",target:">60/100",timeframe:"8 weeks"});

    const d = {
      patient: {
        name: patientInfo.name||"Patient",
        age: patientInfo.age||"—",
        sex: patientInfo.sex||"—",
        height: patientHeightCm+"cm",
        weight: "—",
        occupation: patientInfo.occupation||"—",
      },
      clinician: {
        name: clinicianInfo.name||"Clinician",
        credentials: clinicianInfo.credentials||"",
        clinic: clinicianInfo.clinic||"PostureAI Clinic",
        date: new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),
        session: sessions.length+1,
      },
      score: { value: scoreData.score, band: scoreData.band, colour: scoreData.colour||"#dc2626" },
      views,
      annotatedImg,
      findings: rptFindings,
      muscles: {
        tight: (findings.flatMap(f=>f.tight||[])).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i),
        weak:  (findings.flatMap(f=>f.weak||[])).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i),
      },
      metrics: {
        cvaAngle: m.cvaAngle, cervicalLoadKg: m.cervicalLoadKg,
        thoracicAngle: m.thoracicAngle, lumbarProxy: m.lumbarProxy,
        shoulderAngle: m.shoulderAngle||0, pelvisAngle: m.pelvisAngle||0,
        trunkShiftCm: m.trunkShiftCm||0, fhpCm: m.fhpCm||0,
        lcsIndex: m.lcsIndex||0, ucsIndex: m.ucsIndex||0,
        reliability: reliability?.score||0,
      },
      exercises: rptExercises,
      soap: {
        subjective: `Patient presents with postural concerns. Height ${patientHeightCm}cm. Occupation: ${patientInfo.occupation||"not specified"}. No red flags identified during screening.`,
        objective: `Postural analysis (${views.join(", ")}): ${rptFindings.map(f=>f.text).join("; ")}. Reliability ${reliability?.score||0}%. Method: ${reliability?.isManual?"Manual landmark placement":"AI landmark detection"}.`,
        assessment: `${rptFindings.length} postural finding${rptFindings.length!==1?"s":""} identified. Score ${scoreData.score}/100 — ${scoreData.band}. ${rptFindings.map(f=>f.region).join(", ")}. No referral indicated at this stage pending clinical correlation.`,
        plan: `Janda Approach neuromuscular sequencing programme. Inhibit → Activate → Correct. Daily 10–15 min. Reassess in 4–6 weeks. Monitor for symptom development.`,
      },
      goals,
      redFlags: { triggered: false, items: [] },
    };

    const credits = reportType==="basic"?2:5;
    const html = buildStaticReport(d, reportType, credits);
    setShowReportModal(false);
    // Render inline in fullscreen overlay — cannot be popup-blocked
    setReportHtml(html);
    setShowReportViewer(true);
  }

  function buildStaticReport(d, type, credits) {
    // ── Colour palette matching reference PDF ──────────────────────────────────
    const C = {
      primary:"#1a3a5c", accent:"#2563eb", teal:"#0891b2",
      green:"#059669",   red:"#dc2626",    amber:"#d97706",
      purple:"#7c3aed",  grey:"#6b7280",   lightGrey:"#f1f5f9",
      border:"#e2e8f0",  midGrey:"#94a3b8",
    };
    const sevCol = s => s==="high"?C.red:s==="moderate"?C.amber:C.green;
    const sevBg  = s => s==="high"?"#fef2f2":s==="moderate"?"#fffbeb":"#f0fdf4";
    const sevLabel = s => s==="high"?"High":s==="moderate"?"Moderate":"Normal";

    const reportId = "YCPR-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6);
    const dateStr  = d.clinician.date;
    const m        = d.metrics||{};

    // ── Helpers ────────────────────────────────────────────────────────────────
    const pill = (text, col, bg) =>
      `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:9px;font-weight:700;color:${col};background:${bg};border:1px solid ${col}30">${text}</span>`;

    const scoreRing = (score, col, size=90) => {
      const r=size*0.42, circ=2*Math.PI*r, dash=(score/100)*circ;
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${size*0.09}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="${size*0.09}"
          stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ*0.25}" stroke-linecap="round"
          transform="rotate(-90 ${size/2} ${size/2})"/>
        <text x="${size/2}" y="${size/2-4}" text-anchor="middle" fill="${col}" font-size="${size*0.24}" font-weight="900" font-family="system-ui">${score}</text>
        <text x="${size/2}" y="${size/2+size*0.15}" text-anchor="middle" fill="${C.grey}" font-size="${size*0.1}" font-family="system-ui">/100</text>
      </svg>`;
    };

    const pageHeader = (clinicName) => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:20px 32px 16px;border-bottom:3px solid ${C.primary};margin-bottom:0;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;background:${C.primary};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;">🏃</div>
          <div>
            <div style="font-size:16px;font-weight:900;color:${C.primary};letter-spacing:-0.5px;">${clinicName||"YOUR CLINIC"}</div>
            <div style="font-size:9px;color:${C.grey};font-weight:600;text-transform:uppercase;letter-spacing:1px;">Physiotherapy & Rehabilitation</div>
          </div>
        </div>
        <div style="text-align:right;font-size:10px;color:${C.grey};line-height:1.8;">
          <div><strong style="color:${C.primary};">Report ID:</strong> ${reportId}</div>
          <div><strong style="color:${C.primary};">Date:</strong> ${dateStr}</div>
          <div><strong style="color:${C.primary};">Clinician:</strong> ${d.clinician.name}${d.clinician.credentials?", "+d.clinician.credentials:""}</div>
        </div>
      </div>`;

    const pageFooter = (page, total) => `
      <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 32px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;background:#f8fafc;">
        <div style="font-size:8px;color:${C.midGrey};">This report is generated by PhysioMind Assessment System</div>
        <div style="font-size:8px;color:${C.midGrey};">Page ${page} of ${total}</div>
      </div>`;

    const sectionTitle = (num, title, col=C.primary) => `
      <div style="display:flex;align-items:center;gap:10px;margin:18px 0 12px;">
        <div style="width:28px;height:28px;border-radius:6px;background:${col};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;flex-shrink:0;">${num}</div>
        <div style="font-size:14px;font-weight:900;color:${col};text-transform:uppercase;letter-spacing:0.5px;">${title}</div>
        <div style="flex:1;height:2px;background:${col}20;border-radius:2px;"></div>
      </div>`;

    const subSection = (label) =>
      `<div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">
        ${String.fromCharCode(65+subSection._i++)}. ${label}
      </div>`;

    // ── Derived data ───────────────────────────────────────────────────────────
    const score      = d.score?.value??0;
    const scoreBand  = d.score?.band??"";
    const scoreCol   = score>=80?C.green:score>=60?C.amber:C.red;
    const highF      = (d.findings||[]).filter(f=>f.severity==="high");
    const modF       = (d.findings||[]).filter(f=>f.severity!=="moderate"&&f.severity!=="high"?false:f.severity==="moderate");
    const top3       = (d.findings||[]).slice(0,3);
    const tight      = (d.muscles?.tight||[]).slice(0,5);
    const weak       = (d.muscles?.weak||[]).slice(0,5);

    // Postural measurements table rows
    const postureRows = [
      {param:"Head Alignment (Frontal)",   val:m.headLateralOffset!=null?Math.abs(m.headLateralOffset).toFixed(1)+" cm":"—", finding:m.headLateralOffset>2?"Lateral Tilt":"Within Normal", sev:m.headLateralOffset>5?"high":m.headLateralOffset>2?"moderate":"normal"},
      {param:"Head Alignment (Sagittal)",  val:m.fhpNorm!=null?Math.abs(m.fhpNorm).toFixed(1)+" cm":"—",                    finding:m.fhpNorm>3?"Forward Head Posture":"Within Normal",   sev:m.fhpNorm>6?"high":m.fhpNorm>3?"moderate":"normal"},
      {param:"Shoulder Obliquity",         val:m.shoulderAngle!=null?Math.abs(m.shoulderAngle).toFixed(1)+"°":"—",           finding:m.shoulderAngle>3?"Elevated Shoulder":"Within Normal", sev:Math.abs(m.shoulderAngle||0)>7?"high":Math.abs(m.shoulderAngle||0)>3?"moderate":"normal"},
      {param:"Pelvic Alignment (ASIS)",    val:m.pelvisAngle!=null?Math.abs(m.pelvisAngle).toFixed(1)+"°":"—",               finding:m.pelvisAngle>3?"Pelvic Tilt":"Within Normal",         sev:Math.abs(m.pelvisAngle||0)>7?"high":Math.abs(m.pelvisAngle||0)>3?"moderate":"normal"},
      {param:"Knee Alignment",             val:m.leftKneeFrontal!=null?Math.abs(m.leftKneeFrontal).toFixed(1)+"°":"—",       finding:Math.abs(m.leftKneeFrontal||0)>5?"Valgus/Varus":"Neutral", sev:Math.abs(m.leftKneeFrontal||0)>10?"high":Math.abs(m.leftKneeFrontal||0)>5?"moderate":"normal"},
      {param:"Trunk Lateral Shift",        val:m.trunkLateralShift!=null?Math.abs(m.trunkLateralShift).toFixed(1)+"%":"—",   finding:Math.abs(m.trunkLateralShift||0)>3.5?"Lateral Shift":"Within Normal", sev:Math.abs(m.trunkLateralShift||0)>7?"high":Math.abs(m.trunkLateralShift||0)>3.5?"moderate":"normal"},
    ].filter(r=>r.val!=="—");

    // ICD table from findings
    const icdRows = (d.findings||[]).slice(0,5).map(f=>({
      cond: f.region||"Finding",
      icd:  f.icd||"M99.0",
      sev:  f.severity||"moderate",
      impact: f.text ? f.text.split("—")[0].trim().slice(0,40) : "See correction plan",
    }));

    // Patient photo
    const photoHtml = d.annotatedImg
      ? `<img src="${d.annotatedImg}" style="width:100%;height:180px;object-fit:contain;border-radius:8px;border:1px solid ${C.border};display:block;"/>`
      : `<div style="width:100%;height:180px;border-radius:8px;border:2px dashed ${C.border};display:flex;flex-direction:column;align-items:center;justify-content:center;color:${C.midGrey};background:#f8fafc;"><div style="font-size:2rem;">📷</div><div style="font-size:9px;margin-top:6px;">Patient Photo</div></div>`;

    // Exercise cards — image or text
    const exCard = (ex, i) => {
      const hasImg = ex.imageUrl || ex.imageDataUrl;
      return `
      <div style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;break-inside:avoid;">
        <div style="background:${C.primary};padding:8px 12px;display:flex;align-items:center;gap:8px;">
          <div style="width:22px;height:22px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:${C.primary};flex-shrink:0;">${i+1}</div>
          <div style="font-size:11px;font-weight:800;color:#fff;">${ex.name||"Exercise"}</div>
        </div>
        ${hasImg
          ? `<img src="${ex.imageDataUrl||ex.imageUrl}" style="width:100%;height:110px;object-fit:cover;display:block;"/>`
          : `<div style="height:90px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;border-bottom:1px solid ${C.border};">
               <div style="text-align:center;color:${C.midGrey};font-size:9px;line-height:1.5;">${ex.cue||"Perform as instructed"}</div>
             </div>`
        }
        <div style="padding:8px 12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px;">
            <div style="text-align:center;background:#f8fafc;border-radius:5px;padding:4px;"><div style="font-size:13px;font-weight:900;color:${C.accent};">${ex.reps||ex.sets||"10"}</div><div style="font-size:8px;color:${C.grey};">Reps</div></div>
            <div style="text-align:center;background:#f8fafc;border-radius:5px;padding:4px;"><div style="font-size:13px;font-weight:900;color:${C.accent};">${ex.setsCount||"3"}</div><div style="font-size:8px;color:${C.grey};">Sets</div></div>
            <div style="text-align:center;background:#f8fafc;border-radius:5px;padding:4px;"><div style="font-size:13px;font-weight:900;color:${C.accent};">${ex.hold||"5s"}</div><div style="font-size:8px;color:${C.grey};">Hold</div></div>
          </div>
          ${!hasImg&&ex.freq?`<div style="font-size:9px;color:${C.grey};">Frequency: <strong>${ex.freq}</strong></div>`:""}
        </div>
      </div>`;
    };

    // Tips
    const tips = ["Sit and stand with your back straight.","Avoid looking down at phone for long periods.","Take breaks every 45–60 minutes.","Stay consistent with exercises."];

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER + SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    const page1 = `
    <div class="page" style="position:relative;padding-bottom:60px;">
      ${pageHeader(d.clinician.clinic)}

      <div style="padding:0 32px;">
        <!-- Hero title -->
        <div style="margin:16px 0 14px;">
          <div style="font-size:22px;font-weight:900;color:${C.primary};letter-spacing:-0.5px;">CLINICAL ASSESSMENT REPORT</div>
          <div style="font-size:12px;color:${C.grey};margin-top:2px;font-weight:500;">Posture, Movement & Functional Evaluation</div>
        </div>

        <!-- Patient card + photo + score -->
        <div style="display:grid;grid-template-columns:200px 1fr auto;gap:16px;background:#f8fafc;border:1px solid ${C.border};border-radius:12px;padding:14px;margin-bottom:14px;align-items:start;">
          <!-- Patient info -->
          <div>
            ${[
              {icon:"👤",label:"Patient Name",val:d.patient.name},
              {icon:"🎂",label:"Age / Gender",val:`${d.patient.age} Y / ${d.patient.sex}`},
              {icon:"📞",label:"Contact",val:d.patient.contact||"—"},
              {icon:"🏥",label:"Assessment Type",val:"Postural & Functional"},
            ].map(r=>`
              <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px;">
                <div style="font-size:14px;flex-shrink:0;margin-top:1px;">${r.icon}</div>
                <div>
                  <div style="font-size:8px;color:${C.grey};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${r.label}</div>
                  <div style="font-size:11px;font-weight:700;color:${C.primary};margin-top:1px;">${r.val||"—"}</div>
                </div>
              </div>`).join("")}
          </div>
          <!-- Photo -->
          <div>${photoHtml}</div>
          <!-- Score ring -->
          <div style="text-align:center;padding:10px 16px;">
            <div style="font-size:9px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Posture Score</div>
            ${scoreRing(score, scoreCol, 90)}
            <div style="font-size:12px;font-weight:900;color:${scoreCol};margin-top:4px;">${scoreBand}</div>
            <div style="font-size:9px;color:${C.grey};">Imbalance</div>
          </div>
        </div>

        <!-- Summary bar -->
        <div style="background:#f8fafc;border:1px solid ${C.border};border-radius:10px;padding:12px 16px;margin-bottom:14px;">
          <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Summary Overview</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
            ${[
              {icon:"📋",label:"Total Findings",val:(d.findings||[]).length},
              {icon:"🔴",label:"High Priority",val:highF.length,col:C.red},
              {icon:"⚖",label:"Muscle Imbalance",val:(tight.length+weak.length)},
              {icon:"🏃",label:"Movement Score",val:score+"/100",col:scoreCol},
            ].map(s=>`
              <div style="border:1px solid ${C.border};border-radius:8px;padding:10px 6px;background:#fff;">
                <div style="font-size:18px;margin-bottom:4px;">${s.icon}</div>
                <div style="font-size:18px;font-weight:900;color:${s.col||C.primary};">${s.val}</div>
                <div style="font-size:8px;color:${C.grey};font-weight:600;margin-top:2px;">${s.label}</div>
              </div>`).join("")}
          </div>
        </div>

        <!-- Top 3 priorities -->
        <div style="background:#f8fafc;border:1px solid ${C.border};border-radius:10px;padding:12px 16px;">
          <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Top 3 Priorities</div>
          ${top3.map((f,i)=>{
            const col=[C.red,"#f97316",C.amber][i]||C.amber;
            const bg=[`#fef2f2`,"#fff7ed","#fffbeb"][i]||"#fffbeb";
            return `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:8px;background:${bg};margin-bottom:6px;border:1px solid ${col}20;">
              <div style="width:22px;height:22px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;flex-shrink:0;">${i+1}</div>
              <div>
                <div style="font-size:11px;font-weight:800;color:${C.primary};">${f.region}</div>
                <div style="font-size:9px;color:${C.grey};margin-top:2px;">${(f.correction||f.text||"").split(".")[0]}</div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>
      ${pageFooter(1,4)}
    </div>`;

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — CLINICAL FINDINGS
    // ═══════════════════════════════════════════════════════════════════════════
    subSection._i=0;
    const page2 = `
    <div class="page" style="position:relative;padding-bottom:60px;">
      ${pageHeader(d.clinician.clinic)}
      <div style="padding:0 32px;">
        ${sectionTitle(2,"Clinical Findings",C.primary)}

        <!-- A. Postural Analysis table -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">A. Postural Analysis</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;">
          <thead>
            <tr style="background:#f1f5f9;">
              ${["Parameter","Finding","Deviation","Severity"].map(h=>`<th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${C.border};">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${postureRows.map((r,i)=>`
              <tr style="background:${i%2===0?"#fff":"#f8fafc"};border-bottom:1px solid ${C.border};">
                <td style="padding:7px 10px;color:${C.primary};font-weight:600;">${r.param}</td>
                <td style="padding:7px 10px;color:${C.grey};">${r.finding}</td>
                <td style="padding:7px 10px;color:${C.grey};">${r.val}</td>
                <td style="padding:7px 10px;">${pill(sevLabel(r.sev),sevCol(r.sev),sevBg(r.sev))}</td>
              </tr>`).join("")}
          </tbody>
        </table>

        <!-- B. Clinical Impression + ICD-10 -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">B. Clinical Impression & ICD-10 Codes</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;">
          <thead>
            <tr style="background:#f1f5f9;">
              ${["Condition / Dysfunction","ICD-10 Code","Severity","Impact"].map(h=>`<th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${C.border};">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${icdRows.map((r,i)=>`
              <tr style="background:${i%2===0?"#fff":"#f8fafc"};border-bottom:1px solid ${C.border};">
                <td style="padding:7px 10px;color:${C.primary};font-weight:600;">${r.cond}</td>
                <td style="padding:7px 10px;font-family:monospace;color:${C.accent};font-weight:700;">${r.icd}</td>
                <td style="padding:7px 10px;">${pill(sevLabel(r.sev),sevCol(r.sev),sevBg(r.sev))}</td>
                <td style="padding:7px 10px;color:${C.grey};">${r.impact}</td>
              </tr>`).join("")}
          </tbody>
        </table>

        <!-- C. Muscle Imbalance -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">C. Muscle Imbalance Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <!-- Tight -->
          <div style="border:1px solid ${C.red}30;border-radius:10px;overflow:hidden;">
            <div style="background:${C.red}10;padding:8px 12px;border-bottom:1px solid ${C.red}20;">
              <div style="font-size:10px;font-weight:800;color:${C.red};text-transform:uppercase;letter-spacing:0.5px;">Tight / Overactive</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:10px;">
              <thead><tr style="background:#fef2f2;"><th style="padding:6px 10px;text-align:left;font-size:9px;color:${C.red};font-weight:700;">Muscle</th><th style="padding:6px 10px;text-align:left;font-size:9px;color:${C.red};font-weight:700;">Severity</th></tr></thead>
              <tbody>
                ${tight.length
                  ? tight.map((t,i)=>`<tr style="background:${i%2===0?"#fff":"#fff8f8"};border-top:1px solid ${C.border};"><td style="padding:6px 10px;color:${C.primary};font-weight:500;">${t.name||t}</td><td style="padding:6px 10px;color:${C.grey};">${t.severity||"Moderate"}</td></tr>`).join("")
                  : (d.findings||[]).filter(f=>f.severity==="high").slice(0,4).map((f,i)=>`<tr style="background:${i%2===0?"#fff":"#fff8f8"};border-top:1px solid ${C.border};"><td style="padding:6px 10px;color:${C.primary};font-weight:500;">${f.region} muscles</td><td style="padding:6px 10px;color:${C.grey};">High</td></tr>`).join("")
                }
              </tbody>
            </table>
          </div>
          <!-- Weak -->
          <div style="border:1px solid ${C.green}30;border-radius:10px;overflow:hidden;">
            <div style="background:${C.green}10;padding:8px 12px;border-bottom:1px solid ${C.green}20;">
              <div style="font-size:10px;font-weight:800;color:${C.green};text-transform:uppercase;letter-spacing:0.5px;">Weak / Underactive</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:10px;">
              <thead><tr style="background:#f0fdf4;"><th style="padding:6px 10px;text-align:left;font-size:9px;color:${C.green};font-weight:700;">Muscle</th><th style="padding:6px 10px;text-align:left;font-size:9px;color:${C.green};font-weight:700;">Severity</th></tr></thead>
              <tbody>
                ${weak.length
                  ? weak.map((w,i)=>`<tr style="background:${i%2===0?"#fff":"#f0fdf4"};border-top:1px solid ${C.border};"><td style="padding:6px 10px;color:${C.primary};font-weight:500;">${w.name||w}</td><td style="padding:6px 10px;color:${C.grey};">${w.severity||"Moderate"}</td></tr>`).join("")
                  : (d.findings||[]).filter(f=>f.severity!=="high").slice(0,4).map((f,i)=>`<tr style="background:${i%2===0?"#fff":"#f0fdf4"};border-top:1px solid ${C.border};"><td style="padding:6px 10px;color:${C.primary};font-weight:500;">${f.region} stabilisers</td><td style="padding:6px 10px;color:${C.grey};">Moderate</td></tr>`).join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ${pageFooter(2,4)}
    </div>`;

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 3 — PATIENT SUMMARY + EXERCISES
    // ═══════════════════════════════════════════════════════════════════════════
    subSection._i=0;
    const page3 = `
    <div class="page" style="position:relative;padding-bottom:60px;">
      ${pageHeader(d.clinician.clinic)}
      <div style="padding:0 32px;">
        ${sectionTitle(3,"Patient Summary",C.primary)}

        <!-- A. What this means for you -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">A. What This Means For You</div>
        <div style="font-size:10.5px;color:${C.primary};line-height:1.7;margin-bottom:10px;">
          Your assessment shows postural imbalances that may be causing strain on your neck, shoulders and lower back.
          These imbalances can lead to pain, stiffness, headaches and fatigue during daily activities.
        </div>

        <div style="display:grid;grid-template-columns:180px 1fr;gap:14px;margin-bottom:14px;">
          <div>${photoHtml}</div>
          <div style="background:#f8fafc;border:1px solid ${C.border};border-radius:10px;padding:12px;">
            <div style="font-size:10px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Key Findings (In Simple Words)</div>
            ${(d.findings||[]).slice(0,4).map(f=>`
              <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
                <div style="color:${C.green};font-weight:900;font-size:12px;flex-shrink:0;margin-top:1px;">✓</div>
                <div style="font-size:10px;color:${C.primary};line-height:1.5;">${f.plain||f.text||f.region+" — see correction plan."}</div>
              </div>`).join("")}
          </div>
        </div>

        <!-- B. Recommended Exercises -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">B. Recommended Exercises (Do These Regularly)</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
          ${(d.exercises||[]).slice(0,3).map((ex,i)=>exCard({
            name: ex.name,
            cue: ex.cue||ex.sets,
            reps: ex.reps||(ex.sets||"10").split("×")[1]||"10",
            setsCount: (ex.sets||"3×10").split("×")[0]||"3",
            hold: ex.hold||"5 sec",
            freq: ex.freq||"Daily",
            imageDataUrl: ex.imageDataUrl||null,
          },i)).join("")}
        </div>

        <!-- C. Important Tips -->
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:20px;height:20px;background:#d97706;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;">💡</div>
            <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Important Tips</div>
          </div>
          ${tips.map(t=>`<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:5px;"><div style="color:#d97706;font-weight:900;flex-shrink:0;">◆</div><div style="font-size:10px;color:#78350f;">${t}</div></div>`).join("")}
        </div>
      </div>
      ${pageFooter(3,4)}
    </div>`;

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 4 — PROGRESS & SIGN-OFF
    // ═══════════════════════════════════════════════════════════════════════════
    subSection._i=0;
    const nextReviewDate = (() => {
      const d2 = new Date(); d2.setDate(d2.getDate()+14);
      return d2.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
    })();

    const page4 = `
    <div class="page" style="position:relative;padding-bottom:60px;">
      ${pageHeader(d.clinician.clinic)}
      <div style="padding:0 32px;">
        ${sectionTitle(4,"Progress & Sign-off",C.primary)}

        <!-- A. Progress Tracking -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">A. Progress Tracking</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <!-- Baseline -->
          <div style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;">
            <div style="background:${C.primary};padding:8px 12px;"><div style="font-size:10px;font-weight:700;color:#fff;text-align:center;">BASELINE (${dateStr})</div></div>
            <div style="padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              ${[
                {label:"Posture Score",val:`${score}/100`},
                {label:"Movement Score",val:`${score}/100`},
                {label:"Pain Score",val:"—/10"},
                {label:"Total Findings",val:(d.findings||[]).length},
              ].map(r=>`
                <div style="background:#f8fafc;border-radius:6px;padding:7px;border:1px solid ${C.border};">
                  <div style="font-size:8px;color:${C.grey};font-weight:600;">${r.label}</div>
                  <div style="font-size:13px;font-weight:800;color:${C.primary};margin-top:2px;">${r.val}</div>
                </div>`).join("")}
            </div>
          </div>
          <!-- Next Review -->
          <div style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;">
            <div style="background:#6b7280;padding:8px 12px;"><div style="font-size:10px;font-weight:700;color:#fff;text-align:center;">NEXT REVIEW (dd/mm/yyyy)</div></div>
            <div style="padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              ${["Posture Score","Movement Score","Pain Score","Total Findings"].map(label=>`
                <div style="background:#f8fafc;border-radius:6px;padding:7px;border:1px solid ${C.border};">
                  <div style="font-size:8px;color:${C.grey};font-weight:600;">${label}</div>
                  <div style="font-size:13px;font-weight:800;color:${C.midGrey};margin-top:2px;">—</div>
                </div>`).join("")}
            </div>
          </div>
        </div>

        <!-- B. Clinician Notes -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">B. Clinician Notes</div>
        <div style="height:70px;border:1px solid ${C.border};border-radius:8px;background:#f8fafc;margin-bottom:16px;"></div>

        <!-- C. Signature -->
        <div style="font-size:10px;font-weight:700;color:${C.grey};text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid ${C.border};">C. Signature & Disclaimer</div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:16px;align-items:end;margin-bottom:14px;">
          <div>
            <div style="font-size:9px;color:${C.grey};margin-bottom:24px;">Clinician Signature</div>
            <div style="border-bottom:1.5px solid ${C.primary};margin-bottom:5px;"></div>
            <div style="font-size:10px;font-weight:700;color:${C.primary};">${d.clinician.name}${d.clinician.credentials?", "+d.clinician.credentials:""}</div>
            <div style="font-size:9px;color:${C.grey};">Reg. No: ___________</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:9px;color:${C.grey};margin-bottom:8px;">Clinic Stamp</div>
            <div style="width:80px;height:80px;border-radius:50%;border:2px dashed ${C.border};display:flex;align-items:center;justify-content:center;margin:0 auto;background:#f8fafc;">
              <div style="font-size:8px;color:${C.midGrey};text-align:center;">STAMP<br/>HERE</div>
            </div>
          </div>
          <div style="text-align:center;background:#f0fdf4;border:1px solid ${C.green}30;border-radius:10px;padding:12px 16px;">
            <div style="font-size:9px;color:${C.grey};font-weight:600;">Next Review Date</div>
            <div style="font-size:13px;font-weight:900;color:${C.green};margin-top:6px;">📅 ${nextReviewDate}</div>
          </div>
        </div>

        <!-- Disclaimer -->
        <div style="background:#f8fafc;border:1px solid ${C.border};border-radius:8px;padding:10px 14px;font-size:8.5px;color:${C.grey};line-height:1.6;text-align:center;">
          <strong>Disclaimer:</strong> This report is for clinical use only. It is not a substitute for medical diagnosis.
          Always consult your physiotherapist for personalized treatment.
        </div>
      </div>
      ${pageFooter(4,4)}
    </div>`;

    // ═══════════════════════════════════════════════════════════════════════════
    // WRAPPER — injectable fragment (not full <html>) so it renders inside the
    // in-app viewer div. Per-element styles are already inlined.
    // ═══════════════════════════════════════════════════════════════════════════
    return `<style>
  #pm-report-doc * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  #pm-report-doc { font-family:'Segoe UI',system-ui,Arial,sans-serif; }
  #pm-report-doc .page { width:794px; min-height:1123px; background:#fff; margin:0 auto 24px; position:relative; overflow:hidden; border-radius:4px; box-shadow:0 4px 32px rgba(0,0,0,.18); }
  #pm-report-doc table { border-collapse:collapse; width:100%; }
  @media print {
    @page { size:A4; margin:0; }
    #pm-report-doc .page { width:100%!important; min-height:auto!important; margin:0!important; box-shadow:none!important; border-radius:0!important; page-break-after:always; }
    #pm-report-doc .page:last-of-type { page-break-after:auto; }
  }
</style>
<div id="pm-report-doc">${page1}${page2}${page3}${page4}</div>`;
  }


  // ── Report modal ─────────────────────────────────────────────────────────────
  const reportModal = showReportModal && createPortal(
    <div onClick={()=>setShowReportModal(false)}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:99998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:"100%",maxWidth:440,background:PC.surface,borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{fontWeight:900,fontSize:"1rem",color:PC.text,marginBottom:4}}>📄 Generate Report</div>
        <div style={{fontSize:"0.68rem",color:PC.muted,marginBottom:18}}>Fill in patient details then choose report type</div>

        {/* Report type toggle */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          {[{id:"basic",label:"Basic Report",credits:2,pages:"2 pages",sub:"Patient-facing · Plain English"},
            {id:"detailed",label:"Detailed Report",credits:5,pages:"5 pages",sub:"Clinical · SOAP · Full metrics"}].map(t=>(
            <button key={t.id} onClick={()=>setReportType(t.id)} style={{
              padding:12,borderRadius:10,border:`2px solid ${reportType===t.id?PC.accent:PC.border}`,
              background:reportType===t.id?`${PC.accent}10`:PC.surface,cursor:"pointer",textAlign:"left"}}>
              <div style={{fontSize:"0.75rem",fontWeight:800,color:reportType===t.id?PC.accent:PC.text}}>{t.label}</div>
              <div style={{fontSize:"0.62rem",color:PC.muted,marginTop:2}}>{t.sub}</div>
              <div style={{marginTop:6,padding:"2px 8px",borderRadius:5,display:"inline-block",
                background:reportType===t.id?PC.accent:`${PC.accent}15`,
                color:reportType===t.id?"#fff":PC.accent,
                fontSize:"0.62rem",fontWeight:700}}>{t.credits} credits · {t.pages}</div>
            </button>
          ))}
        </div>

        {/* Patient info */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Patient Information</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{key:"name",label:"Full Name",placeholder:"e.g. Priya Sharma",full:true},
              {key:"age",label:"Age",placeholder:"e.g. 28"},
              {key:"sex",label:"Sex",placeholder:"Female / Male"},
              {key:"occupation",label:"Occupation",placeholder:"e.g. Software Engineer",full:true}].map(f=>(
              <div key={f.key} style={{gridColumn:f.full?"1/-1":"auto"}}>
                <div style={{fontSize:"0.6rem",color:PC.muted,marginBottom:3}}>{f.label}</div>
                <input value={patientInfo[f.key]||""} placeholder={f.placeholder}
                  onChange={e=>setPatientInfo(p=>({...p,[f.key]:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",border:`1px solid ${PC.border}`,borderRadius:7,
                    fontSize:"0.72rem",color:PC.text,background:PC.bg,outline:"none"}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Clinician info */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Clinician</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{key:"name",label:"Your Name",placeholder:"Dr. A. Mehta"},
              {key:"credentials",label:"Credentials",placeholder:"MPT, MIAP"},
              {key:"clinic",label:"Clinic Name",placeholder:"BalancePoint Physio",full:true}].map(f=>(
              <div key={f.key} style={{gridColumn:f.full?"1/-1":"auto"}}>
                <div style={{fontSize:"0.6rem",color:PC.muted,marginBottom:3}}>{f.label}</div>
                <input value={clinicianInfo[f.key]||""} placeholder={f.placeholder}
                  onChange={e=>setClinicianInfo(p=>({...p,[f.key]:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",border:`1px solid ${PC.border}`,borderRadius:7,
                    fontSize:"0.72rem",color:PC.text,background:PC.bg,outline:"none"}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Credits note */}
        <div style={{padding:"8px 12px",borderRadius:8,background:`${PC.accent}08`,
          border:`1px solid ${PC.accent}25`,marginBottom:16,fontSize:"0.62rem",color:PC.accent}}>
          {reportType==="basic"?2:5} credits will be used · 50 credits = ₹99 / $10
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setShowReportModal(false)}
            style={{flex:1,padding:"11px",border:`1px solid ${PC.border}`,borderRadius:10,
              background:"none",color:PC.muted,fontSize:"0.75rem",cursor:"pointer"}}>Cancel</button>
          <button onClick={generateReport} disabled={!findings.length||!scoreData}
            style={{flex:2,padding:"11px",border:"none",borderRadius:10,
              background:findings.length&&scoreData?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#ccc",
              color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:findings.length&&scoreData?"pointer":"not-allowed"}}>
            Generate & Open PDF →
          </button>
        </div>
        {!findings.length&&<div style={{fontSize:"0.62rem",color:PC.red,textAlign:"center",marginTop:8}}>Analyse a photo first to generate a report</div>}
      </div>
    </div>,
    document.body
  );

  return(
    <div style={{background:PC.bg,minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>

      {/* ── Header ── */}
      <div style={{padding:isWide?"14px 28px":"12px 16px",borderBottom:`1px solid ${PC.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:PC.surface,position:"sticky",top:0,zIndex:20,boxShadow:isWide?"0 1px 8px rgba(0,0,0,0.06)":"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:isWide?14:8}}>
          <div style={{width:isWide?40:32,height:isWide?40:32,borderRadius:isWide?12:9,background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isWide?"1.3rem":"1rem",flexShrink:0}}>∠</div>
          <div>
            <div style={{fontWeight:900,fontSize:isWide?"1.1rem":"0.95rem",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Posture Analysis
            </div>
            <div style={{fontSize:isWide?"0.68rem":"0.6rem",color:PC.muted,marginTop:1}}>Clinical-grade biomechanical assessment</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setShowReportModal(true)}
            style={{padding:isWide?"6px 14px":"4px 9px",
              background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,
              border:"none",borderRadius:9,color:"#fff",
              fontSize:isWide?"0.72rem":"0.62rem",fontWeight:700,cursor:"pointer",
              opacity:findings.length&&scoreData?1:0.5}}>
            📄 Report
          </button>
          <button onClick={()=>setShowHistory(h=>!h)}
            style={{padding:isWide?"6px 14px":"4px 9px",background:`${PC.a2}15`,border:`1px solid ${PC.a2}30`,borderRadius:9,color:PC.a2,fontSize:isWide?"0.72rem":"0.65rem",fontWeight:700,cursor:"pointer"}}>
            ▤ {sessions.length}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {isWide ? (
        <div style={{flex:1,display:"flex",flexDirection:"row",overflow:"hidden",minHeight:"calc(100vh - 60px)"}}>
          {leftPanel}
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
            {mvReportPanel || tabContent}
          </div>
        </div>
      ) : (
        /* ── Mobile: toggled panels with sticky switcher ── */
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
          {/* Panel toggle bar */}
          <div style={{display:"flex",borderBottom:`2px solid ${PC.border}`,background:PC.surface,position:"sticky",top:60,zIndex:15}}>
            <button onClick={()=>setMobilePanel("camera")}
              style={{flex:1,padding:"10px 8px",border:"none",
                borderBottom:`3px solid ${mobilePanel==="camera"?PC.accent:"transparent"}`,
                background:"transparent",color:mobilePanel==="camera"?PC.accent:PC.muted,
                fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
              ▣ Camera
            </button>
            <button onClick={()=>setMobilePanel("results")}
              style={{flex:1,padding:"10px 8px",border:"none",
                borderBottom:`3px solid ${mobilePanel==="results"?PC.accent:"transparent"}`,
                background:"transparent",
                color:mobilePanel==="results"?PC.accent:PC.muted,
                fontWeight:800,fontSize:"0.78rem",cursor:"pointer",
                position:"relative"}}>
              ≡ Results
              {findings.length>0&&(
                <span style={{marginLeft:5,padding:"1px 6px",borderRadius:10,
                  background:scoreData?.colour||PC.accent,color:"#fff",
                  fontSize:"0.62rem",fontWeight:800}}>
                  {scoreData?.score??findings.length}
                </span>
              )}
            </button>
          </div>

          {/* Panel content */}
          <div style={{flex:1,overflowY:"auto"}}>
            {mobilePanel==="camera" ? leftPanel : (mvReportPanel || tabContent)}
          </div>
        </div>
      )}

      {/* ── Report modal ── */}
      {reportModal}

      {/* ── In-app Report Viewer ── */}
      {showReportViewer&&createPortal(
        <div style={{position:"fixed",inset:0,zIndex:99999,background:"#1e293b",display:"flex",flexDirection:"column"}}>
          {/* Viewer toolbar — hidden on print */}
          <div className="no-print-report" style={{
            background:"#0f172a",padding:"10px 20px",
            display:"flex",alignItems:"center",justifyContent:"space-between",
            flexShrink:0,boxShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>
            <div style={{fontFamily:"system-ui",fontSize:"0.9rem",fontWeight:800,color:"#fff"}}>
              📄 PostureAI Report
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>window.print()}
                style={{padding:"8px 20px",border:"none",borderRadius:8,
                  background:"#0ea5e9",color:"#fff",fontWeight:700,
                  fontSize:"0.78rem",cursor:"pointer"}}>
                🖨 Print / Save PDF
              </button>
              <button onClick={()=>setShowReportViewer(false)}
                style={{padding:"8px 16px",border:"1px solid rgba(255,255,255,0.2)",
                  borderRadius:8,background:"transparent",color:"rgba(255,255,255,0.7)",
                  fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
                ✕ Close
              </button>
            </div>
          </div>
          {/* Scrollable report area */}
          <div id="postureai-report-printable" style={{flex:1,overflowY:"auto",padding:"24px 16px",background:"#1e293b"}}>
            <style>{`
              #postureai-report-printable .page{width:794px;min-height:1123px;background:#fff;margin:0 auto 24px;border-radius:4px;box-shadow:0 4px 32px rgba(0,0,0,.18);position:relative;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;color:#1a1025;}
              #postureai-report-printable table{border-collapse:collapse;width:100%;}
              #postureai-report-printable th,#postureai-report-printable td{text-align:left;}
              @media print{
                .no-print-report{display:none!important;}
                #postureai-report-printable{padding:0!important;overflow:visible!important;position:absolute!important;top:0;left:0;width:100%;background:#fff!important;}
                #postureai-report-printable .page{width:100%!important;box-shadow:none!important;margin:0!important;border-radius:0!important;page-break-after:always;}
                #postureai-report-printable .page:last-of-type{page-break-after:auto;}
              }
            `}</style>
            <div dangerouslySetInnerHTML={{__html:reportHtml}}/>
          </div>
        </div>,
        document.body
      )}

      {/* ── History modal ── */}
      {showHistory&&(
        <div onClick={()=>setShowHistory(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",alignItems:isWide?"center":"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:isWide?560:600,margin:isWide?"auto":"0 auto",background:PC.surface,borderRadius:isWide?"16px":"16px 16px 0 0",padding:"24px 20px",maxHeight:"70vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,fontSize:"0.95rem",color:PC.text,marginBottom:14}}>▤ Session History ({sessions.length})</div>
            {sessions.length===0&&<div style={{color:PC.muted,fontSize:"0.82rem"}}>No sessions yet.</div>}
            {[...sessions].reverse().map((s,i)=>(
              <div key={i} style={{padding:"11px 14px",borderRadius:11,border:`1px solid ${PC.border}`,marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:"0.75rem"}}>{VIEWS[s.view]?.label} · Score {s.score} — {s.band}</div>
                <div style={{fontSize:"0.65rem",color:PC.muted,marginTop:2}}>{new Date(s.time).toLocaleString()} · {s.findings} findings</div>
              </div>
            ))}
            <button onClick={()=>setShowHistory(false)} style={{marginTop:14,width:"100%",padding:"13px",background:`${PC.accent}15`,border:`1px solid ${PC.accent}30`,borderRadius:10,color:PC.accent,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}


function PostureLiveAnalysis({ landmarks, canvasRef, videoSize }) {
  const [view, setView]         = useState("anterior");
  const [tab, setTab]           = useState("findings");
  const [showHeatmap, setHeat]  = useState(true);
  const [showLabels, setLbls]   = useState(false);

  const m  = useMemo(() => landmarks ? AdvancedMeasurementEngine(landmarks) : null, [landmarks]);
  const f  = useMemo(() => landmarks && m ? ClinicalFindingsEngine(landmarks, view, m) : [], [landmarks, view, m]);
  const r  = useMemo(() => landmarks ? ReliabilityEngine(landmarks) : null, [landmarks]);
  const s  = useMemo(() => m && f && r ? PostureScoreEngine(m, f, r) : null, [m, f, r]);
  const { sessions, saveSession, clearHistory } = usePostureHistory();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || !videoSize || !m) return;
    const { w, h } = videoSize;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    renderPostureOverlay({ ctx, W:w, H:h, lm:landmarks, measurements:m, showHeatmap, showLabels, showGrid:true, view });
  }, [landmarks, videoSize, view, showHeatmap, showLabels, m, canvasRef]);

  if (!landmarks || !m) return null;
  const highF = f.filter(x => x.severity === "high");
  const C2 = { surface:"#ffffff", s2:"#f5f0fb", border:"#d8cce8", accent:"#7c3aed", a2:"#9333ea", text:"#1a1025", muted:"#7e6a9a", red:"#dc2626", yellow:"#b45309", green:"#059669" };

  return (
    <div style={{ background:C2.surface, border:"1px solid #d8cce8", borderRadius:14, overflow:"hidden", marginTop:10 }}>
      <div style={{ padding:"10px 14px", borderBottom:"1px solid #d8cce8", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:7 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {s && <ScoreRingNew score={s.score} band={s.band} colour={s.colour} size={58}/>}
          <div>
            <div style={{ fontWeight:800, color:C2.accent, fontSize:"0.83rem" }}>📐 Live Analysis</div>
            <div style={{ fontSize:"0.6rem", color:C2.muted, marginTop:1 }}>
              {highF.length > 0 ? `🔴 ${highF.length} priority · ` : ""}Findings: {f.length} · {r?.status}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[["🌡",showHeatmap,setHeat],["🏷",showLabels,setLbls]].map(([lbl,val,setter],i)=>(
            <button key={i} onClick={()=>setter(v=>!v)} style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${val?C2.accent:C2.border}`, background:val?"rgba(0,229,255,0.1)":"transparent", color:val?C2.accent:C2.muted, fontSize:"0.7rem", cursor:"pointer" }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* View selector */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4, padding:"8px 10px", background:C2.s2, borderBottom:"1px solid #d8cce8" }}>
        {Object.entries(PHOTO_VIEW_META_NEW).map(([key,meta])=>{
          const act=view===key;
          return <button key={key} onClick={()=>setView(key)} style={{ padding:"5px 2px", borderRadius:7, border:`1px solid ${act?meta.colour:C2.border}`, background:act?`${meta.colour}18`:"transparent", cursor:"pointer", textAlign:"center" }}>
            <div style={{ fontSize:"0.75rem" }}>{meta.icon}</div>
            <div style={{ fontSize:"0.56rem", fontWeight:800, color:act?meta.colour:C2.muted }}>{meta.short}</div>
          </button>;
        })}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid #d8cce8" }}>
        {[["findings",`🔍 Findings (${f.length})`],["metrics","📐 Metrics"],["bilateral","⚖ Balance"],["actions","💊 Actions"]].map(([t,lbl])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"8px 2px", border:"none", borderBottom:`2px solid ${tab===t?C2.accent:"transparent"}`, background:"transparent", color:tab===t?C2.accent:C2.muted, fontWeight:tab===t?800:500, fontSize:"0.58rem", cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lbl}</button>
        ))}
      </div>

      <div style={{ padding:"10px 12px" }}>
        {tab==="findings" && (
          f.length===0
            ? <div style={{ padding:"12px", textAlign:"center", background:"rgba(0,201,122,0.07)", border:`1px solid ${C2.green}30`, borderRadius:9 }}><div style={{ fontWeight:700, color:C2.green, fontSize:"0.78rem" }}>✅ No significant deviations</div></div>
            : <div>{f.map((fi,i)=><FindingCardNew key={i} f={fi} defaultOpen={i===0&&fi.severity==="high"}/>)}</div>
        )}
        {tab==="metrics" && (
          <div>
            {[
              ["Shoulder",m.shoulderAngle,"°",[3,7]],["Pelvis",m.pelvisAngle,"°",[3,7]],
              ["Head Lat.",m.headLateralOffset,"%",[2,5]],["Trunk Shift",m.trunkLateralShift,"%",[3,7]],
              ["Forward Head",m.forwardHeadMm,"%",[3,7]],["Cobb Est.",m.cobbEstimate,"°",[5,10]],
            ].map(([label,val,unit,t],i)=>{
              if(val===null||val===undefined) return null;
              const abs=Math.abs(val),col=abs<t[0]?"#00c97a":abs<t[1]?"#ffb300":"#ff4d6d";
              return(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px", background:`${col}09`, border:`1px solid ${col}22`, borderRadius:7, marginBottom:4 }}>
                  <span style={{ fontSize:"0.68rem", color:C2.muted }}>{label}</span>
                  <span style={{ fontSize:"0.82rem", fontWeight:800, color:col }}>{val>0?"+":""}{Math.round(val*10)/10}{unit}</span>
                </div>
              );
            })}
          </div>
        )}
        {tab==="bilateral" && (
          <div>
            {[["Shoulders",m.shoulderSymmetry],["Hips",m.hipSymmetry],["Knees",m.kneeSymmetry],["Ankles",m.ankleSymmetry]].map(([label,sym])=>{
              if(!sym) return null;
              const diff=Math.abs(sym.diff||0),col=diff<2?"#00c97a":diff<5?"#ffb300":"#ff4d6d";
              const lPct=Math.max(10,Math.min(90,50+((sym.diff||0)*5)));
              return(
                <div key={label} style={{ marginBottom:9 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:"0.72rem", fontWeight:700, color:col }}>{label}</span>
                    <span style={{ fontSize:"0.62rem", color:C2.muted }}>Δ{sym.diff>0?"+":""}{sym.diff}%</span>
                  </div>
                  <div style={{ display:"flex", height:8, borderRadius:4, overflow:"hidden", background:C2.s2 }}>
                    <div style={{ width:`${lPct}%`, background:sym.diff>0?col:"#1a2d45", borderRadius:"4px 0 0 4px" }}/>
                    <div style={{ width:2, background:C2.accent, flexShrink:0 }}/>
                    <div style={{ flex:1, background:sym.diff<0?col:"#1a2d45", borderRadius:"0 4px 4px 0" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
                    <span style={{ fontSize:"0.52rem", color:C2.muted }}>L</span><span style={{ fontSize:"0.52rem", color:C2.muted }}>R</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab==="actions" && (
          f.length===0
            ? <div style={{ textAlign:"center", color:C2.muted, fontSize:"0.72rem", padding:14 }}>No specific actions needed</div>
            : f.map((fi,i)=>(
              <div key={i} style={{ marginBottom:8, padding:"9px 11px", background:C2.s2, border:`1px solid ${fi.severity==="high"?C2.red:C2.yellow}28`, borderRadius:9 }}>
                <div style={{ fontWeight:700, fontSize:"0.72rem", color:fi.severity==="high"?C2.red:C2.yellow, marginBottom:4 }}>{fi.icon} {fi.text}</div>
                <div style={{ fontSize:"0.68rem", color:C2.text, lineHeight:1.6, padding:"6px 9px", background:`${fi.severity==="high"?C2.red:C2.yellow}08`, borderRadius:7 }}>{fi.correction}</div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── PhotoUploadAnalyzer — uses new advanced engine ──────────────────────────
function PhotoUploadAnalyzer() {
  const [image, setImage]         = useState(null);
  const [analysisResult, setResult] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [mpReady, setMpReady]     = useState(false);
  const [selectedView, setView]   = useState("anterior");
  const [tab, setTab]             = useState("upload");
  const [showHeatmap, setHeatmap] = useState(true);
  const [showLabels, setLabels]   = useState(true);
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const poseRef    = useRef(null);
  const fileRef    = useRef(null);
  const urlRef     = useRef(null);
  const viewRef    = useRef(selectedView);
  const { sessions, saveSession, clearHistory } = usePostureHistory();
  const [showHistory, setShowHistory] = useState(false);
  useEffect(()=>{ viewRef.current = selectedView; },[selectedView]);
  useEffect(()=>()=>{ if(urlRef.current) URL.revokeObjectURL(urlRef.current); },[]);

  useEffect(()=>{
    (async()=>{
      try{
        const loadScript = src => new Promise((res,rej)=>{
          if(document.querySelector(`script[src="${src}"]`)){res();return;}
          const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);
        });
        const CDN="https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404";
        await loadScript(`${CDN}/pose.js`);
        const pose=new window.Pose({locateFile:f=>`${CDN}/${f}`});
        pose.setOptions({modelComplexity:2,smoothLandmarks:true,enableSegmentation:false,minDetectionConfidence:0.6,minTrackingConfidence:0.6});
        pose.onResults(results=>{
          setLoading(false);
          if(results.poseLandmarks?.length>0){
            setError(null);
            const lm=results.poseLandmarks;
            const m=AdvancedMeasurementEngine(lm);
            const f=ClinicalFindingsEngine(lm,viewRef.current,m);
            const r=ReliabilityEngine(lm);
            const s=PostureScoreEngine(m,f,r);
            const report={lm,measurements:m,findings:f,reliability:r,scoreData:s,view:viewRef.current,capturedAt:new Date().toISOString()};
            setResult(report);
            saveSession({view:viewRef.current,score:s.score,band:s.band,findingsCount:f.length,highCount:f.filter(x=>x.severity==="high").length,capturedAt:new Date().toISOString()});
            // Draw overlay at full natural resolution; CSS scales canvas to match img
            const canvas=canvasRef.current,img=imgRef.current;
            if(canvas&&img){
              const w=img.naturalWidth||img.width||640;
              const h=img.naturalHeight||img.height||480;
              canvas.width=w;canvas.height=h;
              const ctx=canvas.getContext("2d");
              renderPostureOverlay({ctx,W:w,H:h,lm,measurements:m,showHeatmap:true,showLabels:true,showGrid:true,view:viewRef.current});
            }
            setTab("results");
          } else {
            setError("No body landmarks detected. Ensure full body is visible in photo.");
          }
        });
        await pose.initialize();
        poseRef.current=pose; setMpReady(true);
      }catch(e){setError("Could not load AI. Check internet connection."); setLoading(false);}
    })();
  },[]);

  // Re-render overlay when view/settings change
  useEffect(()=>{
    if(!analysisResult) return;
    const canvas=canvasRef.current,img=imgRef.current;
    if(!canvas||!img) return;
    const w=img.naturalWidth||img.width||640;
    const h=img.naturalHeight||img.height||480;
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d");
    renderPostureOverlay({ctx,W:w,H:h,lm:analysisResult.lm,measurements:analysisResult.measurements,showHeatmap,showLabels,showGrid:true,view:selectedView});
  },[selectedView,showHeatmap,showLabels,analysisResult]);

  const handleFile = async e => {
    const file=e.target.files?.[0]; if(!file) return;
    setError(null);setResult(null);setTab("upload");
    if(urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url=URL.createObjectURL(file); urlRef.current=url; setImage(url);
    const img=new Image();
    img.onload=async()=>{
      if(!poseRef.current){setError("Pose detection not ready. Wait and retry.");return;}
      setLoading(true);
      try{ await poseRef.current.send({image:img}); }
      catch{ setLoading(false); setError("Analysis failed. Ensure body is fully visible."); }
    };
    img.onerror=()=>setError("Could not load image.");
    img.src=url;
  };

  const C2={surface:"#ffffff",s2:"#f5f0fb",border:"#d8cce8",accent:"#7c3aed",a2:"#9333ea",a3:"#059669",text:"#1a1025",muted:"#7e6a9a",red:"#dc2626",yellow:"#b45309",green:"#059669"};
  const vm=PHOTO_VIEW_META_NEW[selectedView]||PHOTO_VIEW_META_NEW.anterior;
  const { measurements, findings, reliability, scoreData } = analysisResult||{};
  const highF=(findings||[]).filter(f=>f.severity==="high");
  const otherF=(findings||[]).filter(f=>f.severity!=="high");

  return(
    <div style={{background:C2.surface,border:`1px solid ${C2.border}`,borderRadius:14,overflow:"hidden",marginBottom:12}}>
      {/* Header */}
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${C2.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:7}}>
        <div>
          <div style={{fontWeight:800,fontSize:"0.9rem",color:C2.accent}}>📷 Photo Upload Analysis</div>
          <div style={{fontSize:"0.65rem",color:C2.muted,marginTop:2}}>{mpReady?"✅ AI Ready — Advanced Biomechanical Engine":"⏳ Loading AI engine…"}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowHistory(true)} style={{padding:"4px 10px",background:`${C2.a2}15`,border:`1px solid ${C2.a2}30`,borderRadius:7,color:C2.a2,fontSize:"0.65rem",fontWeight:700,cursor:"pointer"}}>📁 History</button>
          {["upload","results"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${tab===t?C2.accent:C2.border}`,background:tab===t?"rgba(0,229,255,0.1)":"transparent",color:tab===t?C2.accent:C2.muted,fontSize:"0.65rem",fontWeight:700,cursor:"pointer"}}>
              {t==="upload"?"📤 Upload":"📊 Results"}
            </button>
          ))}
        </div>
      </div>

      {/* View selector */}
      <div style={{padding:"10px 14px",background:C2.s2,borderBottom:`1px solid ${C2.border}`}}>
        <div style={{fontSize:"0.58rem",fontWeight:700,color:C2.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>
          📐 Select View — choose <em>before</em> uploading
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}}>
          {Object.entries(PHOTO_VIEW_META_NEW).map(([key,meta])=>{
            const act=selectedView===key;
            return(
              <button key={key} onClick={()=>setView(key)} style={{padding:"8px 4px",borderRadius:9,border:`1px solid ${act?meta.colour:C2.border}`,background:act?`${meta.colour}18`:"transparent",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:"0.85rem"}}>{meta.icon}</div>
                <div style={{fontSize:"0.6rem",fontWeight:800,color:act?meta.colour:C2.muted}}>{meta.short}</div>
              </button>
            );
          })}
        </div>
        <div style={{fontSize:"0.68rem",color:C2.muted,lineHeight:1.6,padding:"6px 10px",background:`${vm.colour}08`,border:`1px solid ${vm.colour}20`,borderRadius:8}}>
          <span style={{color:vm.colour,fontWeight:700}}>{vm.short}: </span>{vm.helper}
        </div>
        <div style={{marginTop:6,padding:"5px 9px",background:"rgba(124,58,237,0.06)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:8,fontSize:"0.62rem",color:C2.muted,fontStyle:"italic"}}>
          🔲 Posture grid lines will be drawn on the photo for the selected view — select view first, then upload
        </div>
      </div>

      {/* Upload tab */}
      {tab==="upload"&&(
        <div style={{padding:"14px"}}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
          {!image?(
            <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${vm.colour}40`,borderRadius:14,padding:"32px 20px",textAlign:"center",cursor:"pointer",background:`${vm.colour}05`}}>
              <div style={{fontSize:"2.5rem",marginBottom:10}}>📸</div>
              <div style={{fontWeight:800,color:vm.colour,fontSize:"0.88rem",marginBottom:6}}>Select Patient Photo</div>
              <div style={{fontSize:"0.72rem",color:C2.muted,lineHeight:1.6}}>Tap to upload from gallery.<br/>Full body visible for best results.</div>
            </div>
          ):(
            <div>
              <div style={{position:"relative",borderRadius:12,overflow:"hidden",background:"#f5f0fb",marginBottom:9}}>
                <img ref={imgRef} src={image} alt="Upload" style={{width:"100%",display:"block"}}/>
                <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}}/>
                {loading&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}><div style={{color:C2.accent,fontSize:"1.1rem",fontWeight:700}}>⏳ Analysing…</div><div style={{fontSize:"0.7rem",color:C2.muted}}>Running AI pose detection</div></div>}
                {scoreData&&!loading&&<div style={{position:"absolute",top:8,right:8}}><ScoreRingNew score={scoreData?.score} band={scoreData?.band} colour={scoreData?.colour} size={72}/></div>}
              </div>
              {/* Overlay controls */}
              <div style={{display:"flex",gap:7,marginBottom:9,flexWrap:"wrap"}}>
                {[["showHeatmap","🌡 Heat",showHeatmap,setHeatmap],["showLabels","🏷 Labels",showLabels,setLabels]].map(([k,lbl,val,setter])=>(
                  <button key={k} onClick={()=>setter(v=>!v)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${val?C2.accent:C2.border}`,background:val?"rgba(0,229,255,0.1)":"transparent",color:val?C2.accent:C2.muted,fontSize:"0.65rem",fontWeight:600,cursor:"pointer"}}>{lbl}</button>
                ))}
                <button onClick={()=>fileRef.current?.click()} style={{marginLeft:"auto",padding:"4px 10px",background:`${vm.colour}15`,border:`1px solid ${vm.colour}30`,borderRadius:7,color:vm.colour,fontSize:"0.65rem",fontWeight:700,cursor:"pointer"}}>📤 New Photo</button>
              </div>
              {detectedViewNotice&&<div style={{padding:"7px 11px",background:"rgba(0,229,255,0.1)",border:"1px solid rgba(0,229,255,0.35)",borderRadius:8,fontSize:"0.72rem",color:"#00e5ff",fontWeight:600,marginBottom:8}}>{detectedViewNotice}</div>}
              {error&&<div style={{padding:"8px 11px",background:"rgba(255,77,109,0.1)",border:"1px solid rgba(255,77,109,0.3)",borderRadius:8,fontSize:"0.74rem",color:C2.red,marginBottom:8}}>{error}</div>}
              {scoreData&&(
                <button onClick={()=>setTab("results")} style={{width:"100%",padding:"11px",background:`linear-gradient(135deg,${C2.accent},${C2.a2})`,border:"none",borderRadius:10,color:"#1a1025",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>View Full Analysis →</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results tab */}
      {tab==="results"&&analysisResult&&(
        <div style={{padding:"13px 14px"}}>
          {/* Score row */}
          <div style={{display:"flex",gap:12,alignItems:"center",padding:"11px 13px",background:`${scoreData?.colour||C2.accent}09`,border:`1px solid ${scoreData?.colour||C2.accent}25`,borderRadius:12,marginBottom:12}}>
            <ScoreRingNew score={scoreData?.score||0} band={scoreData?.band||"—"} colour={scoreData?.colour||C2.muted} size={68}/>
            <div style={{flex:1}}>
              <div style={{fontSize:"0.68rem",color:C2.muted,marginBottom:5}}>
                {analysisResult.view && (
                  <span style={{padding:"1px 7px",borderRadius:5,background:`${vm.colour}15`,color:vm.colour,fontWeight:700,marginRight:6,fontSize:"0.62rem"}}>
                    {({anterior:"⬆ Anterior",posterior:"⬇ Posterior",left:"◀ Left Lateral",right:"▶ Right Lateral"})[analysisResult.view]||analysisResult.view} View
                  </span>
                )}
                {new Date(analysisResult.capturedAt).toLocaleTimeString()}
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <span style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:7,background:"rgba(0,229,255,0.1)",color:C2.accent}}>Reliability: {reliability?.status}</span>
                <span style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:7,background:"rgba(255,77,109,0.1)",color:C2.red}}>Priority: {highF.length}</span>
                <span style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:7,background:"rgba(255,179,0,0.1)",color:C2.yellow}}>Findings: {findings?.length||0}</span>
              </div>
            </div>
          </div>

          {/* Findings */}
          {findings?.length===0?(
            <div style={{padding:"14px",textAlign:"center",background:"rgba(0,201,122,0.07)",border:`1px solid ${C2.green}30`,borderRadius:10,marginBottom:10}}>
              <div style={{fontSize:"1.2rem",marginBottom:6}}>✅</div>
              <div style={{fontWeight:700,color:C2.green,fontSize:"0.82rem"}}>No significant deviations detected</div>
            </div>
          ):(
            <div style={{marginBottom:12}}>
              {highF.length>0&&(
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:"0.6rem",fontWeight:700,color:C2.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🔴 Priority ({highF.length})</div>
                  {highF.map((f,i)=><FindingCardNew key={i} f={f} defaultOpen={i===0}/>)}
                </div>
              )}
              {otherF.length>0&&(
                <div>
                  <div style={{fontSize:"0.6rem",fontWeight:700,color:C2.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>🟡 Notable ({otherF.length})</div>
                  {otherF.map((f,i)=><FindingCardNew key={i} f={f}/>)}
                </div>
              )}
            </div>
          )}

          {/* Clinical Metrics Dashboard */}
          {measurements&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:C2.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📐 Clinical Metrics</div>

              {/* Sub-scores radar row */}
              {scoreData?.subScores&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:"0.58rem",color:C2.muted,marginBottom:5,fontWeight:600}}>Regional Scores</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
                    {Object.entries(scoreData?.subScores).map(([region,val])=>{
                      const col=val>=80?"#00c97a":val>=60?"#ffb300":"#ff4d6d";
                      const label={cervical:"Cervical",shoulder:"Shoulder",thoracic:"Thoracic",lumbar:"Lumbar",knee:"Knee",global:"Global"}[region]||region;
                      return(
                        <div key={region} style={{padding:"6px 8px",background:`${col}10`,border:`1px solid ${col}25`,borderRadius:8,textAlign:"center"}}>
                          <div style={{fontSize:"1rem",fontWeight:900,color:col}}>{Math.round(val)}</div>
                          <div style={{fontSize:"0.56rem",color:C2.muted,fontWeight:600}}>{label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reliability + ICC */}
              {reliability&&(
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <div style={{flex:1,padding:"5px 9px",background:"rgba(0,229,255,0.06)",border:"1px solid rgba(0,229,255,0.2)",borderRadius:8}}>
                    <div style={{fontSize:"0.58rem",color:C2.muted}}>Tracking Quality</div>
                    <div style={{fontSize:"0.8rem",fontWeight:800,color:C2.accent}}>{reliability.status} · {reliability.score}%</div>
                  </div>
                  {reliability.icc&&(
                    <div style={{flex:1,padding:"5px 9px",background:"rgba(0,229,255,0.06)",border:"1px solid rgba(0,229,255,0.2)",borderRadius:8}}>
                      <div style={{fontSize:"0.58rem",color:C2.muted}}>ICC Proxy</div>
                      <div style={{fontSize:"0.8rem",fontWeight:800,color:C2.accent}}>{reliability.icc}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Full metric rows */}
              {[
                // Sagittal — highest clinical priority
                {label:"CVA (Forward Head)",    value:measurements.cvaAngle,        unit:"°",  t:[49,55], norm:">55° normal",  invert:true},
                {label:"Cervical Load Est.",    value:measurements.cervicalLoadKg,   unit:"kg", t:[6,10],  norm:"Neutral: 4.5kg"},
                {label:"Thoracic Kyphosis",     value:measurements.thoracicAngle,    unit:"°",  t:[45,55], norm:"20–45° normal"},
                {label:"Lumbar Lordosis Est.",  value:measurements.lordosisAngle,    unit:"°",  t:[60,70], norm:"40–60° normal"},
                {label:"Ant. Pelvic Tilt",      value:measurements.anteriorPelvicTiltDeg, unit:"°", t:[12,20], norm:"♀≤12° ♂≤7°"},
                // Frontal
                {label:"Shoulder Tilt",         value:measurements.shoulderAngle,    unit:"°",  t:[3,7],   norm:"<3° normal"},
                {label:"Pelvic Obliquity",      value:measurements.pelvisAngle,      unit:"°",  t:[3,7],   norm:"<3° normal"},
                {label:"Trunk Lateral Shift",   value:measurements.trunkLateralShift,unit:"%",  t:[3.5,7], norm:"<3.5% normal"},
                {label:"Scoliosis (Cobb est.)", value:measurements.cobbEstimate,     unit:"°",  t:[5,10],  norm:"<5° normal"},
                {label:"C7 Plumb Deviation",    value:measurements.c7PlumbDev,       unit:"%",  t:[4,8],   norm:"<4% normal"},
                // Knees
                {label:"L Knee Valgus/Varus",   value:measurements.leftKneeFrontal,  unit:"°",  t:[5,10],  norm:"<5° normal"},
                {label:"R Knee Valgus/Varus",   value:measurements.rightKneeFrontal, unit:"°",  t:[5,10],  norm:"<5° normal"},
                {label:"L Knee Hyperext.",       value:measurements.leftKneeDev,      unit:"°",  t:[-5,-12],norm:"0 to -5° normal", invert:true},
                {label:"R Knee Hyperext.",       value:measurements.rightKneeDev,     unit:"°",  t:[-5,-12],norm:"0 to -5° normal", invert:true},
                // Balance
                {label:"WB Asymmetry",          value:measurements.weightBearingShift,unit:"%", t:[4,8],   norm:"<4% normal"},
                {label:"COG Deviation",         value:measurements.cogDeviation,     unit:"%",  t:[4,8],   norm:"<4% normal"},
                {label:"LLD Proxy",             value:measurements.lldProxy,         unit:"mm", t:[5,10],  norm:"<5mm acceptable", side:measurements.lldSide},
                // Syndrome indices
                {label:"UCS Index (Janda)",     value:measurements.ucsIndex,         unit:"",   t:[0.6,1.0],norm:"<0.4 normal"},
                {label:"LCS Index (Janda)",     value:measurements.lcsIndex,         unit:"",   t:[0.5,1.0],norm:"<0.4 normal"},
                {label:"Postural Load Index",   value:measurements.posturalLoadIndex,unit:"/100",t:[35,55], norm:"<35 optimal"},
              ].map((m,i)=>{
                if(m.value===null||m.value===undefined||isNaN(m.value)) return null;
                const abs=Math.abs(m.value);
                let col;
                if(m.invert) {
                  col = abs < Math.abs(m.t[0]) ? "#00c97a" : abs < Math.abs(m.t[1]) ? "#ffb300" : "#ff4d6d";
                } else {
                  col = abs < m.t[0] ? "#00c97a" : abs < m.t[1] ? "#ffb300" : "#ff4d6d";
                }
                const display = m.invert
                  ? `${m.value.toFixed(1)}${m.unit}`
                  : `${m.value>0?"+":""}${m.value.toFixed(1)}${m.unit}`;
                return(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:`${col}08`,border:`1px solid ${col}20`,borderRadius:8,marginBottom:4}}>
                    <div>
                      <div style={{fontSize:"0.7rem",color:C2.text,fontWeight:600}}>{m.label}{m.side?` (${m.side} short)`:""}</div>
                      {m.norm&&<div style={{fontSize:"0.57rem",color:C2.muted}}>{m.norm}</div>}
                    </div>
                    <span style={{fontSize:"0.9rem",fontWeight:900,color:col,flexShrink:0,marginLeft:8}}>{display}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{fontSize:"0.62rem",color:C2.muted,padding:"7px 10px",background:C2.s2,borderRadius:7,lineHeight:1.6}}>⚠ Observational AI analysis — not a clinical diagnosis. All findings require clinical correlation and manual assessment.</div>

        </div>
      )}

      {/* History modal */}
      {showHistory&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C2.surface,border:`1px solid ${C2.border}`,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"88vh",overflowY:"auto",padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:800,color:C2.accent,fontSize:"0.9rem"}}>📁 Photo Analysis History</div>
              <div style={{display:"flex",gap:7}}>
                <button onClick={clearHistory} style={{padding:"4px 10px",background:"rgba(255,77,109,0.1)",border:`1px solid rgba(255,77,109,0.3)`,borderRadius:7,color:C2.red,fontSize:"0.65rem",cursor:"pointer"}}>Clear</button>
                <button onClick={()=>setShowHistory(false)} style={{padding:"4px 10px",background:C2.s2,border:`1px solid ${C2.border}`,borderRadius:7,color:C2.muted,fontSize:"0.65rem",cursor:"pointer"}}>Close</button>
              </div>
            </div>
            {sessions.length===0?<div style={{textAlign:"center",color:C2.muted,padding:24,fontSize:"0.78rem"}}>No sessions yet</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...sessions].reverse().map((s,i)=>{
                  const col=(s.score||0)>=78?"#00c97a":(s.score||0)>=62?"#ffb300":"#ff4d6d";
                  return(
                    <div key={i} style={{background:C2.s2,border:`1px solid ${C2.border}`,borderRadius:10,padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <div style={{fontWeight:700,color:C2.text,fontSize:"0.78rem"}}>{(s.view||"").toUpperCase()} · {s.band||"—"}</div>
                        <div style={{fontSize:"1.2rem",fontWeight:900,color:col}}>{s.score}</div>
                      </div>
                      <div style={{fontSize:"0.6rem",color:C2.muted,marginBottom:5}}>{new Date(s.capturedAt).toLocaleString()}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.58rem",padding:"1px 7px",borderRadius:6,background:"rgba(255,77,109,0.1)",color:C2.red}}>Priority: {s.highCount||0}</span>
                        <span style={{fontSize:"0.58rem",padding:"1px 7px",borderRadius:6,background:"rgba(255,179,0,0.1)",color:C2.yellow}}>Findings: {s.findingsCount||0}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



// ─── MAIN APP ────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PATIENT DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const DB_KEY = "physio_patient_db_v1";

const DEMO_PATIENTS = [
  {
    id:"demo_001", name:"Aisha Malik", lastDx:"", hasRedFlags:false,
    createdAt:"2025-01-10T09:00:00Z", updatedAt:"2025-01-10T09:00:00Z",
    data:{
      dem_name:"Aisha Malik", dem_age:"34", dem_sex:"Female", dem_occupation:"Office administrator",
      dem_work_status:"Full time employed",
      cc_main:"My neck has been killing me for weeks. I wake up with terrible stiffness and by afternoon I can barely turn my head.",
      cc_location:["Neck — posterior","Neck — lateral (R)","Shoulder (R)"],
      cc_symptom_type:["Stiffness","Aching","Sharp"],
      cc_onset:["Gradual — insidious"], cc_duration:["1–3 months"],
      pa_vas_now:"5", pa_vas_worst:"8", pa_vas_best:"2",
      pa_quality:["Aching","Stiffness","Sharp"],
      sb_morning:["Worse on waking — prolonged stiffness (>30 min)"],
      sb_night:["Pain disturbs sleep — takes time to settle"],
      agg_posture:["Prolonged sitting > 1 hour","Computer work","Looking down (phone use)"],
      agg_movement:["Rotation right","Looking over shoulder"],
      rel_manual:["Heat application"],
      moi_type:["Postural overload"], moi_activity:"Sitting at desk all day working from home",
      phx_conditions:"Migraine (occasional)",
      dem_gp:"Dr. Patel",
    }
  },
  {
    id:"demo_002", name:"James Okonkwo", lastDx:"", hasRedFlags:false,
    createdAt:"2025-01-11T10:00:00Z", updatedAt:"2025-01-11T10:00:00Z",
    data:{
      dem_name:"James Okonkwo", dem_age:"52", dem_sex:"Male", dem_occupation:"Warehouse operative",
      dem_work_status:["Full time employed","Off work — injury"],
      cc_main:"Sharp pain down my left leg when I bend forward. Started after lifting a heavy pallet last month.",
      cc_location:["Lower back","Buttock (L)","Thigh posterior (L)"],
      cc_radiation:["Radiates to leg (L)","Radiates to calf"],
      cc_symptom_type:["Sharp","Shooting","Tingling/pins & needles"],
      cc_onset:["Lifting injury — flexed spine"], cc_duration:["2–4 weeks (subacute)"],
      pa_vas_now:"6", pa_vas_worst:"9", pa_vas_best:"3",
      pa_quality:["Sharp","Shooting","Burning","Tingling"],
      sb_morning:["Worst on waking — eases quickly (<30 min)"],
      sb_night:["Pain wakes from sleep — can return to sleep"],
      agg_movement:["Forward bending","Getting in/out of car","Coughing / sneezing"],
      rel_posture:["Lying with knees bent"],
      moi_type:["Lifting injury — flexed spine"], moi_activity:"Lifting a 40kg pallet at warehouse",
      phx_conditions:"Hypertension", meds_current:"Amlodipine 5mg",
      s_red4:"", // no bilateral pins
    }
  },
  {
    id:"demo_003", name:"Priya Sharma", lastDx:"", hasRedFlags:false,
    createdAt:"2025-01-12T11:00:00Z", updatedAt:"2025-01-12T11:00:00Z",
    data:{
      dem_name:"Priya Sharma", dem_age:"28", dem_sex:"Female", dem_occupation:"Physiotherapy student",
      dem_work_status:"Student",
      cc_main:"My left knee swells up after running and feels unstable going down stairs.",
      cc_location:["Knee (L)"],
      cc_symptom_type:["Pain","Swelling","Giving way","Clicking"],
      cc_onset:["Non-contact sport injury","Gradual — insidious"], cc_duration:["3–6 months (chronic)"],
      pa_vas_now:"4", pa_vas_worst:"7", pa_vas_best:"0",
      pa_quality:["Aching","Sharp","Throbbing"],
      pa_pattern:["Only with specific movements","Post-activity delayed"],
      sb_morning:["Stiff on waking — improves with movement"],
      agg_activity:["Running","Stairs — down","Squatting","Gym — cardio"],
      rel_posture:["Lying flat"],
      rel_manual:["Ice application"],
      moi_type:["Running injury"], moi_activity:"Training for half marathon",
      ar_sport_level:["Active — 4–5x/week"],
      ar_sports_played:["Running — road"],
      ar_goal_sport:"Return to running half marathon training",
      phx_conditions:"None",
    }
  },
  {
    id:"demo_004", name:"Robert Chen", lastDx:"", hasRedFlags:false,
    createdAt:"2025-01-13T12:00:00Z", updatedAt:"2025-01-13T12:00:00Z",
    data:{
      dem_name:"Robert Chen", dem_age:"67", dem_sex:"Male", dem_occupation:"Retired teacher",
      dem_work_status:"Retired",
      cc_main:"Both shoulders ache constantly. I can't lift my arms above my head anymore and getting dressed in the morning is a real struggle.",
      cc_location:["Shoulder (L)","Shoulder (R)","Upper arm (L)","Upper arm (R)"],
      cc_symptom_type:["Aching","Stiffness","Weakness"],
      cc_onset:["Gradual — insidious"], cc_duration:["1–2 years"],
      pa_vas_now:"5", pa_vas_worst:"7", pa_vas_best:"2",
      pa_quality:["Aching","Deep","Constant ache"],
      pa_pattern:["Constant — varies in intensity","Morning dominant"],
      sb_morning:["Worse on waking — prolonged stiffness (>30 min)"],
      sb_night:["Cannot sleep on affected side","Pain disturbs sleep — takes time to settle"],
      agg_movement:["Reaching overhead","Reaching across body"],
      agg_activity:["Housework","Gardening"],
      rel_manual:["Heat application","Physiotherapy manual therapy"],
      phx_conditions:"Type 2 diabetes, Hypertension",
      meds_current:"Metformin 500mg, Lisinopril 10mg",
      fl_self_care:["Dressing — upper body difficulty","Washing hair — difficulty"],
      fl_domestic:["Cleaning — cannot vacuum","Ironing — cannot perform"],
    }
  },
  {
    id:"demo_005", name:"Sarah Thompson", lastDx:"", hasRedFlags:false,
    createdAt:"2025-01-14T13:00:00Z", updatedAt:"2025-01-14T13:00:00Z",
    data:{
      dem_name:"Sarah Thompson", dem_age:"41", dem_sex:"Female", dem_occupation:"Nurse",
      dem_work_status:"Full time employed",
      cc_main:"I get burning pain in my right wrist and hand, especially at night. My fingers feel numb when I wake up.",
      cc_location:["Wrist (R)","Hand/fingers (R)"],
      cc_radiation:["Radiates to hand/fingers (R)"],
      cc_symptom_type:["Burning","Tingling/pins & needles","Numbness","Weakness"],
      cc_onset:["Repetitive strain","Occupational injury"], cc_duration:["6–12 months"],
      pa_vas_now:"4", pa_vas_worst:"7", pa_vas_best:"1",
      pa_quality:["Burning","Tingling","Pins and needles","Numb"],
      pa_nature:["Neuropathic — burning, shooting, dermatomal"],
      pa_pattern:["Night pain waking patient","Activity dependent"],
      sb_night:["Wakes once per night","Arm/leg symptoms at night (neural)"],
      sb_morning:["Pain free on waking then worsens"],
      agg_activity:["Computer/keyboard work","Carrying children"],
      agg_movement:["Reaching across body"],
      rel_posture:["Lying with arms at sides"],
      rel_manual:["Massage — general"],
      moi_type:["Repetitive strain","Occupational injury"],
      moi_activity:"Long shifts doing patient transfers and documentation",
      phx_conditions:"Hypothyroidism", meds_current:"Levothyroxine 75mcg",
      fl_work:["Cannot sit > 1 hour","Computer work painful"],
      fl_self_care:["Dressing — upper body difficulty"],
    }
  },
];

function loadPatientDB() {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    // Seed demo patients if DB is empty or has never had them
    const hasDemos = stored.some(p => p.id && p.id.startsWith("demo_"));
    if (!hasDemos) {
      const seeded = [...DEMO_PATIENTS, ...stored];
      try { localStorage.setItem(DB_KEY, JSON.stringify(seeded)); } catch(_e) {}
      return seeded;
    }
    return stored;
  } catch { return DEMO_PATIENTS; }
}
function savePatientDB(patients) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(patients)); } catch(_e) {}
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── Avatar initials helper ─────────────────────────────────────────────────────
function getInitials(name="") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  return name.slice(0,2).toUpperCase() || "?";
}

// ── Avatar gradient by id ──────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  ["#00e5ff","#7f5af0"],["#f97316","#ff4d6d"],["#00c97a","#00e5ff"],
  ["#ffb300","#f97316"],["#a78bfa","#ec4899"],["#38bdf8","#00c97a"],
];
function avatarGrad(id="") {
  const i = id.charCodeAt(id.length-1) % AVATAR_GRADIENTS.length;
  return `linear-gradient(135deg,${AVATAR_GRADIENTS[i][0]},${AVATAR_GRADIENTS[i][1]})`;
}

// ─── PATIENT PROFILE MODAL ─────────────────────────────────────────────────────
function PatientProfileModal({ patient, onClose, onLoadAssessment, onSaveField }) {
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ ...patient.data });

  const d = editData;
  const ef = (field, val) => setEditData(prev => ({ ...prev, [field]: val }));

  const age  = d.dem_age  || "";
  const sex  = d.dem_sex  || d.dem_gender || "";
  const occ  = d.dem_occupation || "";
  const gp   = d.dem_gp   || "";
  const phone= d.dem_phone || "";
  const email= d.dem_email || "";
  const dob  = d.dem_dob  || "";
  const addr = d.dem_address || "";
  const nok  = d.dem_nok  || "";
  const nokPhone = d.dem_nok_phone || "";
  const insurer  = d.dem_insurer  || "";
  const insRef   = d.dem_ins_ref  || "";
  const sessions = patient.sessions || [];
  const completedFields = Object.keys(d).filter(k => d[k] && d[k] !== "").length;

  // Pill style
  const pill = (label, color="#00e5ff") => (
    <span key={label} style={{display:"inline-block",padding:"2px 8px",borderRadius:20,
      background:`${color}15`,border:`1px solid ${color}40`,color,fontSize:"0.62rem",fontWeight:600,margin:"2px 3px 2px 0"}}>
      {label}
    </span>
  );

  const inp = (field, placeholder, type="text") => (
    <input type={type} value={d[field]||""} onChange={e=>ef(field,e.target.value)}
      placeholder={placeholder}
      style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:8,color:"#1a1025",padding:"8px 11px",fontSize:"0.78rem",outline:"none",
        fontFamily:"inherit"}}/>
  );
  const ta = (field, placeholder, rows=3) => (
    <textarea value={d[field]||""} onChange={e=>ef(field,e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:8,color:"#1a1025",padding:"8px 11px",fontSize:"0.78rem",outline:"none",
        fontFamily:"inherit",resize:"vertical"}}/>
  );

  const label = (txt) => (
    <div style={{fontSize:"0.58rem",fontWeight:700,color:"#4a6070",textTransform:"uppercase",
      letterSpacing:"1px",marginBottom:4}}>{txt}</div>
  );
  const val = (txt, fallback="—") => (
    <div style={{fontSize:"0.8rem",color: txt ? "#d4e0f0" : "#2a3f55",fontWeight: txt ? 500 : 400}}>
      {txt || fallback}
    </div>
  );
  const field2 = (lbl, txt) => (
    <div style={{marginBottom:12}}>
      {label(lbl)}{val(txt)}
    </div>
  );

  const sectionHead = (icon, title) => (
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12,marginTop:4,
      paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
      <span style={{fontSize:"1rem"}}>{icon}</span>
      <div style={{fontWeight:800,fontSize:"0.82rem",color:"#1a1025"}}>{title}</div>
    </div>
  );

  const saveEdits = () => {
    onSaveField(patient.id, editData);
    setEditing(false);
  };

  const tabs = [
    {id:"overview", icon:"👤", label:"Overview"},
    {id:"contact",  icon:"📞", label:"Contact"},
    {id:"medical",  icon:"🏥", label:"Medical Hx"},
    {id:"sessions", icon:"📅", label:"Sessions"},
    {id:"flags",    icon:"🚩", label:"Flags"},
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",
      justifyContent:"center",background:"rgba(0,0,0,0.92)",padding:"12px"}}>
      <div style={{width:"100%",maxWidth:680,maxHeight:"92vh",background:"#0a0e15",
        border:"1px solid rgba(0,229,255,0.15)",borderRadius:18,display:"flex",
        flexDirection:"column",overflow:"hidden",
        boxShadow:"0 30px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(0,229,255,0.08)"}}>

        {/* ── Profile Hero ─────────────────────────────────────────────── */}
        <div style={{background:"linear-gradient(135deg,rgba(0,229,255,0.06),rgba(127,90,240,0.08))",
          borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"20px 22px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
            {/* Avatar */}
            <div style={{width:62,height:62,borderRadius:16,background:avatarGrad(patient.id),
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:"1.4rem",fontWeight:900,color:"#000",flexShrink:0,
              boxShadow:`0 4px 20px ${AVATAR_GRADIENTS[patient.id.charCodeAt(patient.id.length-1)%6][0]}40`}}>
              {getInitials(patient.name)}
            </div>

            {/* Name + meta */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{fontWeight:900,fontSize:"1.15rem",color:"#1a1025"}}>
                  {patient.name || "Unnamed Patient"}
                </div>
                {patient.hasRedFlags && (
                  <span style={{padding:"2px 8px",borderRadius:20,background:"rgba(255,77,109,0.15)",
                    border:"1px solid rgba(255,77,109,0.4)",color:"#ff4d6d",fontSize:"0.6rem",fontWeight:700}}>
                    🚩 RED FLAGS
                  </span>
                )}
              </div>
              <div style={{fontSize:"0.72rem",color:"#5a7090",marginTop:4,display:"flex",gap:8,flexWrap:"wrap"}}>
                {age && <span>🎂 {age} years</span>}
                {sex && <span>⚧ {sex}</span>}
                {occ && <span>💼 {occ}</span>}
                {dob && <span>📅 {dob}</span>}
              </div>
              {patient.lastDx && (
                <div style={{marginTop:6,padding:"3px 10px",background:"rgba(0,201,122,0.1)",
                  border:"1px solid rgba(0,201,122,0.2)",borderRadius:8,display:"inline-block",
                  fontSize:"0.67rem",color:"#00c97a",fontWeight:600}}>
                  🩺 Dx: {patient.lastDx}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              <button onClick={onClose}
                style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,
                  color:"#5a7090",cursor:"pointer",padding:"6px 12px",fontSize:"0.68rem"}}>✕ Close</button>
              <button onClick={()=>{ onLoadAssessment(patient); onClose(); }}
                style={{background:"linear-gradient(135deg,#00e5ff,#7f5af0)",border:"none",borderRadius:8,
                  color:"#000",cursor:"pointer",padding:"7px 12px",fontSize:"0.68rem",fontWeight:800}}>
                📋 Open Assessment
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
            {[
              {icon:"📝", val: completedFields, label:"Fields"},
              {icon:"📅", val: sessions.length || "0", label:"Sessions"},
              {icon:"🗓", val: new Date(patient.createdAt).toLocaleDateString("en-GB"), label:"Created"},
              {icon:"🔄", val: new Date(patient.updatedAt).toLocaleDateString("en-GB"), label:"Updated"},
            ].map(s => (
              <div key={s.label} style={{flex:"1 1 80px",background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"8px 10px",
                textAlign:"center"}}>
                <div style={{fontSize:"1rem",marginBottom:2}}>{s.icon}</div>
                <div style={{fontWeight:800,fontSize:"0.88rem",color:"#1a1025"}}>{s.val}</div>
                <div style={{fontSize:"0.58rem",color:"#3a5070",textTransform:"uppercase",letterSpacing:"0.8px"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",
          flexShrink:0,overflowX:"auto"}}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>{setTab(t.id);setEditing(false);}}
              style={{flex:"0 0 auto",padding:"10px 16px",background:"none",
                border:"none",borderBottom:`2px solid ${tab===t.id?"#00e5ff":"transparent"}`,
                color:tab===t.id?"#00e5ff":"#4a6070",cursor:"pointer",
                fontSize:"0.72rem",fontWeight:700,display:"flex",alignItems:"center",gap:5,
                transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────── */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div>
              {!editing ? (
                <>
                  {sectionHead("🧍","Demographics")}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
                    {field2("Full Name", d.dem_name)}
                    {field2("Date of Birth", dob)}
                    {field2("Age", age ? `${age} years` : "")}
                    {field2("Sex / Gender", sex)}
                    {field2("Occupation", occ)}
                    {field2("Work Status", d.dem_work_status)}
                    {field2("Referring GP", gp)}
                    {field2("Ethnicity", d.dem_ethnicity)}
                  </div>

                  {sectionHead("🎯","Presenting Complaint")}
                  {d.cc_main ? (
                    <div style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.1)",
                      borderRadius:10,padding:"10px 14px",fontSize:"0.8rem",color:"#a0c8e8",lineHeight:1.7,
                      fontStyle:"italic",marginBottom:14}}>
                      "{d.cc_main}"
                    </div>
                  ) : <div style={{color:"#2a3f55",fontSize:"0.78rem",marginBottom:14}}>No presenting complaint recorded</div>}

                  {d.cc_location?.length > 0 && (
                    <div style={{marginBottom:12}}>
                      {label("Pain Locations")}
                      <div>{(Array.isArray(d.cc_location)?d.cc_location:[d.cc_location]).map(l=>pill(l,"#00e5ff"))}</div>
                    </div>
                  )}

                  {d.pa_vas_now && (
                    <div style={{marginBottom:12}}>
                      {label("Pain Scores (VAS)")}
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        {[["Now",d.pa_vas_now,"#ffb300"],["Worst",d.pa_vas_worst,"#ff4d6d"],["Best",d.pa_vas_best,"#00c97a"]].map(([lbl,v,c])=>v?(
                          <div key={lbl} style={{textAlign:"center",padding:"6px 12px",
                            background:`${c}12`,border:`1px solid ${c}30`,borderRadius:8}}>
                            <div style={{fontSize:"1.1rem",fontWeight:800,color:c}}>{v}/10</div>
                            <div style={{fontSize:"0.58rem",color:"#4a6070"}}>{lbl}</div>
                          </div>
                        ):null)}
                      </div>
                    </div>
                  )}

                  {d.ar_goal_function && (
                    <div style={{marginBottom:12}}>
                      {label("Patient Goal")}
                      <div style={{fontSize:"0.8rem",color:"#00c97a"}}>🎯 {d.ar_goal_function}</div>
                    </div>
                  )}

                  <button onClick={()=>setEditing(true)}
                    style={{marginTop:8,padding:"9px 20px",borderRadius:9,border:"1px solid rgba(0,229,255,0.3)",
                      background:"rgba(0,229,255,0.08)",color:"#00e5ff",fontWeight:700,
                      fontSize:"0.75rem",cursor:"pointer"}}>
                    ✏️ Edit Demographics
                  </button>
                </>
              ) : (
                <>
                  {sectionHead("✏️","Edit Demographics")}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px"}}>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Full Name</div>{inp("dem_name","Full name")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Date of Birth</div>{inp("dem_dob","DD/MM/YYYY")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Age</div>{inp("dem_age","Years","number")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Sex / Gender</div>{inp("dem_sex","e.g. Female")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Occupation</div>{inp("dem_occupation","Job title")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Work Status</div>{inp("dem_work_status","e.g. Full time")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Referring GP</div>{inp("dem_gp","GP name")}</div>
                    <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Ethnicity</div>{inp("dem_ethnicity","Ethnicity")}</div>
                  </div>
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Address</div>
                    {ta("dem_address","Full address",2)}
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:14}}>
                    <button onClick={saveEdits}
                      style={{padding:"9px 22px",borderRadius:9,border:"none",
                        background:"linear-gradient(135deg,#00e5ff,#7f5af0)",color:"#000",
                        fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
                      💾 Save Changes
                    </button>
                    <button onClick={()=>{setEditing(false);setEditData({...patient.data});}}
                      style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",
                        background:"transparent",color:"#5a7090",fontSize:"0.75rem",cursor:"pointer"}}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CONTACT TAB */}
          {tab === "contact" && (
            <div>
              {sectionHead("📞","Contact Details")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px",marginBottom:16}}>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Phone</div>{inp("dem_phone","Mobile number")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Email</div>{inp("dem_email","Email address","email")}</div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Address</div>
                {ta("dem_address","Full home address",2)}
              </div>

              {sectionHead("🆘","Next of Kin")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px",marginBottom:16}}>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>NOK Name</div>{inp("dem_nok","Next of kin name")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>NOK Phone</div>{inp("dem_nok_phone","NOK phone number")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Relationship</div>{inp("dem_nok_rel","e.g. Spouse, Parent")}</div>
              </div>

              {sectionHead("🏥","Insurance / Referral")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px",marginBottom:16}}>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Insurer</div>{inp("dem_insurer","Insurance company")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Policy / Ref No.</div>{inp("dem_ins_ref","Policy reference")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Referral Source</div>{inp("dem_referral","e.g. GP, Self, Insurer")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>GP Name</div>{inp("dem_gp","Referring GP")}</div>
              </div>

              <button onClick={saveEdits}
                style={{padding:"9px 22px",borderRadius:9,border:"none",
                  background:"linear-gradient(135deg,#00e5ff,#7f5af0)",color:"#000",
                  fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
                💾 Save Contact Details
              </button>
            </div>
          )}

          {/* MEDICAL HISTORY TAB */}
          {tab === "medical" && (
            <div>
              {sectionHead("🏥","Past Medical History")}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Current Conditions</div>
                {ta("phx_conditions","e.g. Type 2 diabetes, Hypertension, Osteoporosis…",3)}
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Previous Injuries / Surgeries</div>
                {ta("phx_injuries","e.g. L knee meniscectomy 2018, ACL repair 2019…",3)}
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Current Medications</div>
                {ta("meds_current","List medications and doses…",3)}
              </div>

              {sectionHead("💊","Allergies & Precautions")}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Allergies</div>
                {inp("dem_allergies","Drug/latex/other allergies")}
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Precautions / Contraindications</div>
                {ta("dem_precautions","e.g. Anticoagulants — no deep needling; Pacemaker — no TENS…",2)}
              </div>

              {sectionHead("🏃","Activity & Lifestyle")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 16px",marginBottom:16}}>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Activity Level</div>{inp("dem_activity","e.g. Sedentary, Active 3x/week")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Sport / Exercise</div>{inp("dem_sport","e.g. Running, Football, Swimming")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Smoking</div>{inp("dem_smoking","e.g. Non-smoker, 10/day")}</div>
                <div><div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Alcohol</div>{inp("dem_alcohol","e.g. Occasional, 14 units/week")}</div>
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Patient Goals</div>
                {ta("ar_goal_function","What does the patient want to return to?",2)}
              </div>

              <button onClick={saveEdits}
                style={{padding:"9px 22px",borderRadius:9,border:"none",
                  background:"linear-gradient(135deg,#00e5ff,#7f5af0)",color:"#000",
                  fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
                💾 Save Medical History
              </button>
            </div>
          )}

          {/* SESSIONS TAB */}
          {tab === "sessions" && (
            <div>
              {sectionHead("📅","Session History")}
              {sessions.length === 0 ? (
                <div style={{textAlign:"center",padding:"40px 20px",color:"#3a5070"}}>
                  <div style={{fontSize:"2rem",marginBottom:8}}>📋</div>
                  <div style={{fontSize:"0.82rem",marginBottom:6}}>No sessions recorded yet</div>
                  <div style={{fontSize:"0.68rem",color:"#2a3f55"}}>
                    Each time you open this patient's assessment and save, a session will be logged here.
                  </div>
                </div>
              ) : sessions.map((s, i) => (
                <div key={i} style={{padding:"11px 14px",background:"rgba(255,255,255,0.02)",
                  border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontWeight:700,color:"#1a1025",fontSize:"0.8rem"}}>
                      Session {sessions.length - i}
                    </div>
                    <div style={{fontSize:"0.65rem",color:"#4a6070"}}>
                      {new Date(s.date).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
                    </div>
                  </div>
                  {s.dx && <div style={{fontSize:"0.68rem",color:"#00c97a",marginTop:3}}>Dx: {s.dx}</div>}
                  {s.notes && <div style={{fontSize:"0.7rem",color:"#5a7090",marginTop:4,lineHeight:1.5}}>{s.notes}</div>}
                </div>
              ))}

              <div style={{marginTop:16}}>
                {sectionHead("📝","Session Notes")}
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:"0.6rem",color:"#4a6070",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>
                    Notes for current session
                  </div>
                  {ta("session_notes","Clinical notes, treatment given, patient response, plan…",5)}
                </div>
                <button onClick={saveEdits}
                  style={{padding:"9px 22px",borderRadius:9,border:"none",
                    background:"linear-gradient(135deg,#00e5ff,#7f5af0)",color:"#000",
                    fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
                  💾 Save Session Notes
                </button>
              </div>
            </div>
          )}

          {/* FLAGS TAB */}
          {tab === "flags" && (
            <div>
              {sectionHead("🚩","Red Flags")}
              {patient.hasRedFlags ? (
                <div style={{padding:"12px 14px",background:"rgba(255,77,109,0.08)",
                  border:"1px solid rgba(255,77,109,0.3)",borderRadius:10,marginBottom:14}}>
                  <div style={{fontWeight:700,color:"#ff4d6d",marginBottom:6,fontSize:"0.82rem"}}>
                    ⚠️ Red flags detected in this assessment
                  </div>
                  <div style={{fontSize:"0.72rem",color:"#c04060",lineHeight:1.6}}>
                    Review the Subjective Assessment → Red Flags section for details. Consider urgent referral if cauda equina or vascular flags are present.
                  </div>
                </div>
              ) : (
                <div style={{padding:"12px 14px",background:"rgba(0,201,122,0.06)",
                  border:"1px solid rgba(0,201,122,0.2)",borderRadius:10,marginBottom:14}}>
                  <div style={{fontWeight:700,color:"#00c97a",fontSize:"0.8rem"}}>✅ No red flags detected</div>
                </div>
              )}

              {sectionHead("⚠️","Clinical Precautions")}
              <div style={{marginBottom:12}}>
                {ta("dem_precautions","Note any clinical precautions or contraindications for this patient…",3)}
              </div>

              {sectionHead("📋","Consent & Documentation")}
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {[
                  ["dem_consent_verbal","Verbal consent obtained"],
                  ["dem_consent_written","Written consent obtained"],
                  ["dem_consent_photo","Photo/video consent obtained"],
                  ["dem_gdpr","GDPR data processing explained"],
                ].map(([field, label_]) => {
                  const checked = !!d[field];
                  return (
                    <div key={field} onClick={()=>ef(field, checked ? "" : "yes")}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                        background:checked?"rgba(0,201,122,0.08)":"rgba(255,255,255,0.02)",
                        border:`1px solid ${checked?"rgba(0,201,122,0.3)":"rgba(255,255,255,0.06)"}`,
                        borderRadius:9,cursor:"pointer"}}>
                      <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${checked?"#00c97a":"#3a5070"}`,
                        background:checked?"#00c97a":"transparent",display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:"0.65rem",color:"#000",fontWeight:900,flexShrink:0}}>
                        {checked?"✓":""}
                      </div>
                      <span style={{fontSize:"0.78rem",color:checked?"#00c97a":"#5a7090",fontWeight:checked?600:400}}>
                        {label_}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button onClick={saveEdits}
                style={{padding:"9px 22px",borderRadius:9,border:"none",
                  background:"linear-gradient(135deg,#00e5ff,#7f5af0)",color:"#000",
                  fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
                💾 Save
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── PATIENT CARD ──────────────────────────────────────────────────────────────
function PatientCard({ patient, isActive, onSelect, onDelete, onProfile }) {
  const age    = patient.data?.dem_age    ? `${patient.data.dem_age}y` : "";
  const sex    = patient.data?.dem_sex    || patient.data?.dem_gender || "";
  const occ    = patient.data?.dem_occupation || "";
  const dx     = patient.lastDx || "";
  const filled = Object.keys(patient.data||{}).filter(k=>patient.data[k]&&patient.data[k]!=="").length;
  const hasRed = patient.hasRedFlags;
  const vas    = patient.data?.pa_vas_now;
  const vasColor = vas ? (parseInt(vas)>=7?"#ff4d6d":parseInt(vas)>=4?"#ffb300":"#00c97a") : null;

  return (
    <div style={{
      padding:"11px 13px", borderRadius:12, cursor:"pointer", marginBottom:7,
      background: isActive ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isActive ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.05)"}`,
      transition:"all 0.15s", position:"relative",
      borderLeft:`3px solid ${hasRed?"#ff4d6d":isActive?"#00e5ff":"transparent"}`,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {/* Avatar */}
        <div style={{width:38,height:38,borderRadius:11,background:avatarGrad(patient.id),
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"0.8rem",fontWeight:900,color:"#000",flexShrink:0}}>
          {getInitials(patient.name)}
        </div>

        <div style={{flex:1,minWidth:0}} onClick={onSelect}>
          <div style={{fontWeight:700,fontSize:"0.82rem",color:"#1a1025",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {patient.name || "Unnamed Patient"}
            {hasRed && <span style={{marginLeft:5,fontSize:"0.6rem",color:"#ff4d6d"}}>🚩</span>}
          </div>
          <div style={{fontSize:"0.63rem",color:"#4a6070",marginTop:1,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {[age,sex,occ].filter(Boolean).join(" · ") || "No demographics"}
          </div>
          {dx && <div style={{fontSize:"0.6rem",color:"rgba(0,201,122,0.7)",marginTop:2,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🩺 {dx}</div>}
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
          {vas && (
            <div style={{padding:"1px 6px",borderRadius:6,background:`${vasColor}18`,
              border:`1px solid ${vasColor}40`,fontSize:"0.6rem",fontWeight:700,color:vasColor}}>
              VAS {vas}
            </div>
          )}
          <div style={{fontSize:"0.55rem",color:"#2a3f55"}}>
            {new Date(patient.updatedAt).toLocaleDateString("en-GB")}
          </div>
          <div style={{display:"flex",gap:4,marginTop:2}}>
            <button onClick={e=>{e.stopPropagation();onProfile();}}
              style={{background:"rgba(0,229,255,0.08)",border:"1px solid rgba(0,229,255,0.2)",
                color:"#00e5ff",borderRadius:5,cursor:"pointer",fontSize:"0.55rem",
                padding:"2px 6px",fontWeight:700}}>
              Profile
            </button>
            <button onClick={e=>{e.stopPropagation();onDelete();}}
              style={{background:"none",border:"none",
                color:"rgba(255,77,109,0.35)",cursor:"pointer",fontSize:"0.65rem",padding:"2px 4px"}}>
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PATIENT DATABASE PANEL ────────────────────────────────────────────────────
function PatientDatabasePanel({ patients, activeId, onSelect, onNew, onDelete, onClose, onImport }) {
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState("updated");
  const [filterFlag, setFilterFlag] = useState(false);
  const [profilePatient, setProfilePatient] = useState(null);
  const [localPatients, setLocalPatients] = useState(patients);
  const fileRef = useRef(null);

  // Keep local in sync when parent updates
  useEffect(() => { setLocalPatients(patients); }, [patients]);

  const handleSaveField = (id, newData) => {
    setLocalPatients(prev => prev.map(p => p.id===id
      ? {...p, data:{...p.data,...newData}, name:newData.dem_name||p.name, updatedAt:new Date().toISOString()}
      : p
    ));
    // Persist via the select mechanism (triggers parent save)
    try {
      const stored = JSON.parse(localStorage.getItem("physio_patient_db_v1") || "[]");
      const updated = stored.map(p => p.id===id
        ? {...p, data:{...p.data,...newData}, name:newData.dem_name||p.name, updatedAt:new Date().toISOString()}
        : p
      );
      localStorage.setItem("physio_patient_db_v1", JSON.stringify(updated));
    } catch(_e) {}
  };

  const filtered = localPatients
    .filter(p => {
      if (filterFlag && !p.hasRedFlags) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.name||"").toLowerCase().includes(q) ||
        (p.data?.dem_occupation||"").toLowerCase().includes(q) ||
        (p.data?.dem_sex||"").toLowerCase().includes(q) ||
        (p.lastDx||"").toLowerCase().includes(q);
    })
    .sort((a,b) => {
      if (sortBy==="name")   return (a.name||"").localeCompare(b.name||"");
      if (sortBy==="fields") return Object.keys(b.data||{}).length - Object.keys(a.data||{}).length;
      if (sortBy==="age")    return parseInt(a.data?.dem_age||0) - parseInt(b.data?.dem_age||0);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { onImport(JSON.parse(ev.target.result)); } catch(_e) {} };
    reader.readAsText(file);
  };

  const redFlagCount = localPatients.filter(p=>p.hasRedFlags).length;

  return (
    <>
    {/* Profile modal */}
    {profilePatient && (
      <PatientProfileModal
        patient={profilePatient}
        onClose={()=>setProfilePatient(null)}
        onLoadAssessment={(p)=>{ onSelect(p); setProfilePatient(null); }}
        onSaveField={handleSaveField}
      />
    )}

    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,
      display:"flex",alignItems:"stretch",justifyContent:"flex-start"}}>
      <div style={{width:"100%",maxWidth:440,background:"#080c12",
        borderRight:"1px solid rgba(0,229,255,0.1)",display:"flex",
        flexDirection:"column",height:"100%"}}>

        {/* Header */}
        <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontWeight:900,fontSize:"1.05rem",color:"#00e5ff",letterSpacing:"-0.3px"}}>
                👥 Patient Database
              </div>
              <div style={{fontSize:"0.62rem",color:"#3a5070",marginTop:2}}>
                {localPatients.length} patient{localPatients.length!==1?"s":""} · {redFlagCount} with flags
              </div>
            </div>
            <button onClick={onClose}
              style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,
                color:"#4a6070",cursor:"pointer",padding:"7px 13px",fontSize:"0.7rem"}}>✕ Close</button>
          </div>

          {/* Search */}
          <div style={{position:"relative",marginBottom:8}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
              fontSize:"0.8rem",color:"#3a5070"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, diagnosis, occupation…"
              style={{width:"100%",background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,color:"#1a1025",
                outline:"none",padding:"8px 12px 8px 30px",fontSize:"0.76rem",boxSizing:"border-box"}}/>
          </div>

          {/* Filters row */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {[["updated","🕐 Recent"],["name","A–Z"],["age","Age"],["fields","Complete"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSortBy(v)}
                style={{padding:"4px 9px",borderRadius:7,
                  border:`1px solid ${sortBy===v?"rgba(0,229,255,0.35)":"rgba(255,255,255,0.06)"}`,
                  background:sortBy===v?"rgba(0,229,255,0.1)":"transparent",
                  color:sortBy===v?"#00e5ff":"#3a5070",fontSize:"0.62rem",fontWeight:600,cursor:"pointer"}}>
                {l}
              </button>
            ))}
            <button onClick={()=>setFilterFlag(f=>!f)}
              style={{padding:"4px 9px",borderRadius:7,marginLeft:"auto",
                border:`1px solid ${filterFlag?"rgba(255,77,109,0.4)":"rgba(255,255,255,0.06)"}`,
                background:filterFlag?"rgba(255,77,109,0.12)":"transparent",
                color:filterFlag?"#ff4d6d":"#3a5070",fontSize:"0.62rem",fontWeight:600,cursor:"pointer"}}>
              🚩 Flags only
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
          {[
            {label:"Total", val:localPatients.length, color:"#00e5ff"},
            {label:"Active", val:localPatients.filter(p=>activeId===p.id).length, color:"#00c97a"},
            {label:"🚩 Flags", val:redFlagCount, color:"#ff4d6d"},
            {label:"Today", val:localPatients.filter(p=>new Date(p.updatedAt).toDateString()===new Date().toDateString()).length, color:"#ffb300"},
          ].map(s=>(
            <div key={s.label} style={{flex:1,padding:"8px 4px",textAlign:"center",
              borderRight:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{fontWeight:800,fontSize:"0.9rem",color:s.color}}>{s.val}</div>
              <div style={{fontSize:"0.55rem",color:"#2a3f55",textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Patient list */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
          {filtered.length === 0 && (
            <div style={{textAlign:"center",padding:"40px 20px",color:"#2a3f55"}}>
              <div style={{fontSize:"2.5rem",marginBottom:8}}>👤</div>
              <div style={{fontSize:"0.82rem",color:"#3a5070"}}>
                {search ? "No patients match your search" : "No patients — tap New Patient to start"}
              </div>
            </div>
          )}
          {filtered.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              isActive={p.id === activeId}
              onSelect={()=>onSelect(p)}
              onDelete={()=>onDelete(p.id)}
              onProfile={()=>setProfilePatient(p)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",flexShrink:0,display:"flex",flexDirection:"column",gap:7}}>
          <button onClick={onNew}
            style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#00e5ff,#7f5af0)",
              border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:"0.85rem",cursor:"pointer"}}>
            ＋ New Patient
          </button>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>fileRef.current?.click()}
              style={{flex:1,padding:"9px",background:"rgba(0,201,122,0.08)",
                border:"1px solid rgba(0,201,122,0.2)",borderRadius:9,
                color:"#00c97a",fontSize:"0.7rem",fontWeight:700,cursor:"pointer"}}>
              📂 Import JSON
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} style={{display:"none"}}/>
            <button onClick={()=>{
                const data = JSON.stringify(localPatients,null,2);
                const blob = new Blob([data],{type:"application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href=url; a.download="physio_patients_backup.json"; a.click();
                URL.revokeObjectURL(url);
              }}
              style={{flex:1,padding:"9px",background:"rgba(127,90,240,0.08)",
                border:"1px solid rgba(127,90,240,0.2)",borderRadius:9,
                color:"#7f5af0",fontSize:"0.7rem",fontWeight:700,cursor:"pointer"}}>
              💾 Export All
            </button>
          </div>
        </div>
      </div>

      {/* Click outside */}
      <div style={{flex:1}} onClick={onClose}/>
    </div>
    </>
  );
}



// ─── POSTURE DEFECTS DATA ─────────────────────────────────────────────────────
const POSTURE_DEFECTS = {
  forward_head: {
    id:"forward_head", icon:"🫀", label:"Forward Head Posture", region:"Cervical",
    view:["anterior","lateral"],
    description:"Ear positioned anterior to the acromion process. Each 2.5cm of forward translation adds ~10kg of effective cervical load.",
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
    id:"genu_valgum", icon:"🦵", label:"Genu Valgum (Knock Knees)", region:"Knee",
    view:["anterior","posterior"],
    description:"Medial deviation of the knee relative to the mechanical axis. Increases medial compartment and patellofemoral loading.",
    tight_muscles:["TFL","IT band","Hip adductors","Medial hamstrings"],
    weak_muscles:["Gluteus medius","Gluteus maximus","VMO","Hip external rotators"],
    kinetic_chain:"Genu valgum → hip IR → PFPS risk → medial ankle pronation → plantar fascia overload",
    exercises:["Clamshells","Monster walks","Single-leg squat with knee tracking","VMO terminal extensions"]
  },
  genu_varum: {
    id:"genu_varum", icon:"🦴", label:"Genu Varum (Bow Legs)", region:"Knee",
    view:["anterior","posterior"],
    description:"Lateral deviation of the knee. Increases lateral compartment loading and IT band tension.",
    tight_muscles:["IT band","Biceps femoris","Hip ER","Lateral gastrocnemius"],
    weak_muscles:["Hip adductors","VMO","Medial gastrocnemius"],
    kinetic_chain:"Genu varum → lateral knee overload → IT band syndrome → supinated foot posture",
    exercises:["IT band foam rolling","Hip adductor strengthening","Lateral step-downs","Arch support"]
  },
  foot_pronation: {
    id:"foot_pronation", icon:"🦶", label:"Foot Overpronation/Flat Arch", region:"Foot/Ankle",
    view:["anterior","posterior"],
    description:"Medial arch collapse with calcaneal eversion. The kinetic chain starting point for many lower limb issues.",
    tight_muscles:["Gastrocnemius","Soleus","Peroneals","Plantar fascia"],
    weak_muscles:["Tibialis posterior","FHL","Intrinsic foot muscles","Gluteus medius"],
    kinetic_chain:"Pronation → tibial IR → genu valgum → hip IR → PFPS → LCS compensations",
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
    id:"scoliosis", icon:"〰", label:"Scoliosis / Lateral Spinal Curve", region:"Thoracic/Lumbar",
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
            <span style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:6,background:"rgba(0,229,255,0.12)",color:"#00e5ff",fontWeight:700}}>{d.region}</span>
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
            <div style={{fontSize:"0.6rem",fontWeight:800,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🔴 Tight / Overactive</div>
            {d.tight_muscles.map((m,i)=><div key={i} style={{fontSize:"0.68rem",color:"#1a1025",padding:"2px 0",borderBottom:"1px solid rgba(255,77,109,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
          <div style={{background:"rgba(0,201,122,0.06)",border:"1px solid rgba(0,201,122,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.6rem",fontWeight:800,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🟢 Weak / Inhibited</div>
            {d.weak_muscles.map((m,i)=><div key={i} style={{fontSize:"0.68rem",color:"#1a1025",padding:"2px 0",borderBottom:"1px solid rgba(0,201,122,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
        </div>
        {/* Kinetic chain */}
        <div style={{background:"rgba(127,90,240,0.07)",border:"1px solid rgba(127,90,240,0.2)",borderRadius:10,padding:"10px 13px",marginBottom:14}}>
          <div style={{fontSize:"0.6rem",fontWeight:800,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>🔗 Kinetic Chain</div>
          <div style={{fontSize:"0.72rem",color:"#1a1025",lineHeight:1.6,fontStyle:"italic"}}>{d.kinetic_chain}</div>
        </div>
        {/* Exercises */}
        {d.exercises?.length > 0 && (
          <div>
            <div style={{fontSize:"0.6rem",fontWeight:800,color:"#00e5ff",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>💪 Corrective Exercises</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {d.exercises.map((ex,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:8,alignItems:"center"}}>
                  <span style={{color:"#00e5ff",fontWeight:800,fontSize:"0.7rem",flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:"0.72rem",color:"#1a1025"}}>{ex}</span>
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
        <div style={{fontSize:"0.62rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:9}}>📋 Assessment Views — Position patient accordingly</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {PLAN_VIEWS.map(v => (
            <div key={v.key} style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.14)",borderRadius:10,padding:"9px 11px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:"1rem"}}>{v.icon}</span>
                <span style={{fontSize:"0.72rem",fontWeight:800,color:"#00e5ff"}}>{v.label}</span>
                {defectsByView[v.key]?.length > 0 && (
                  <span style={{marginLeft:"auto",padding:"1px 6px",borderRadius:6,background:"rgba(0,229,255,0.15)",color:"#00e5ff",fontSize:"0.56rem",fontWeight:800}}>{defectsByView[v.key].length}</span>
                )}
              </div>
              <div style={{fontSize:"0.63rem",color:"#7e6a9a",lineHeight:1.4}}>{v.tip}</div>
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
        <div style={{fontSize:"0.62rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
          🔍 Select Observed Defects
          {selectedDefects.length > 0 && <span style={{marginLeft:8,padding:"1px 7px",borderRadius:8,background:"rgba(255,77,109,0.15)",color:"#ff4d6d",fontSize:"0.58rem",fontWeight:800}}>{selectedDefects.length} selected</span>}
        </div>

        {/* Region filter */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:9}}>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              style={{padding:"3px 9px",borderRadius:8,fontSize:"0.6rem",fontWeight:700,border:`1px solid ${regionFilter===r?"rgba(0,229,255,0.5)":"#1a2d45"}`,background:regionFilter===r?"rgba(0,229,255,0.12)":"transparent",color:regionFilter===r?"#00e5ff":"#6b8399",cursor:"pointer"}}>
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
                style={{padding:"8px 10px",borderRadius:9,fontSize:"0.68rem",fontWeight:sel?700:500,border:`1px solid ${sel?"rgba(255,77,109,0.45)":"#1a2d45"}`,background:sel?"rgba(255,77,109,0.1)":"rgba(19,28,40,0.7)",color:sel?"#ff4d6d":"#94a3b8",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"flex-start",gap:6}}>
                <span style={{fontSize:"1rem",flexShrink:0}}>{d.icon}</span>
                <span style={{flex:1,lineHeight:1.3}}>{d.label}</span>
                {sel && <span style={{color:"#ff4d6d",fontSize:"0.6rem",flexShrink:0}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 3: Selected findings with severity + tap-to-expand ── */}
      {selectedDefects.length > 0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.62rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
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
                      <div style={{fontSize:"0.6rem",color:"#7e6a9a",marginTop:1}}>{d.region}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <span style={{fontSize:"0.62rem",color:"#00e5ff",fontWeight:700}}>📋 Detail →</span>
                      <button onClick={e=>{e.stopPropagation();setSelectedDefects(p=>p.filter(s=>s!==id));}} style={{background:"none",border:"1px solid #d8cce8",borderRadius:5,color:"#7e6a9a",cursor:"pointer",fontSize:"0.6rem",padding:"1px 6px",lineHeight:1.4}}>✕</button>
                    </div>
                  </div>

                  {/* Severity selector */}
                  <div style={{padding:"0 13px 10px",display:"flex",gap:4}}>
                    {["mild","moderate","severe"].map(s => (
                      <button key={s} onClick={() => setDefectSeverity(p => ({...p,[id]:s}))}
                        style={{flex:1,padding:"5px 3px",borderRadius:7,fontSize:"0.6rem",fontWeight:sev===s?800:500,border:`1px solid ${sev===s?SEVERITY_COLOR[s]+"80":"#1a2d45"}`,background:sev===s?SEVERITY_BG[s]:"transparent",color:sev===s?SEVERITY_COLOR[s]:"#6b8399",cursor:"pointer",textTransform:"capitalize"}}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Quick summary row */}
                  <div style={{padding:"8px 13px",background:"rgba(6,9,15,0.5)",borderTop:"1px solid #d8cce8",display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.55rem",fontWeight:700,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔴 Tight</div>
                      <div style={{fontSize:"0.62rem",color:"#1a1025",lineHeight:1.4}}>{d.tight_muscles.slice(0,2).join(", ")}{d.tight_muscles.length>2?` +${d.tight_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.55rem",fontWeight:700,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🟢 Weak</div>
                      <div style={{fontSize:"0.62rem",color:"#1a1025",lineHeight:1.4}}>{d.weak_muscles.slice(0,2).join(", ")}{d.weak_muscles.length>2?` +${d.weak_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.55rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔗 Chain</div>
                      <div style={{fontSize:"0.62rem",color:"#1a1025",lineHeight:1.4,fontStyle:"italic"}}>{d.kinetic_chain.split("→")[0].trim()} →…</div>
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
                <div style={{fontSize:"0.72rem",fontWeight:800,color:"#00c97a"}}>📄 PDF Report Details</div>
                <button onClick={() => setShowExport(false)} style={{background:"none",border:"1px solid #d8cce8",borderRadius:6,color:"#7e6a9a",cursor:"pointer",padding:"3px 8px",fontSize:"0.65rem"}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <label style={{fontSize:"0.6rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:4}}>Patient Name</label>
                  <input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="Patient name" style={inputStyle}/>
                </div>
                <div>
                  <label style={{fontSize:"0.6rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:4}}>Clinician</label>
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

      <div style={{padding:"7px 11px",background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:8,fontSize:"0.6rem",color:"#7e6a9a",lineHeight:1.5}}>
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
    { icon:"🧠", title:"NKT Assessment", desc:"Neurokinetic Therapy muscle testing with inhibitor-facilitator relationships across regions.", nav:"nkt", color:"#7c3aed" },
    { icon:"⛓️", title:"Kinetic Chain", desc:"Joint-by-joint analysis of the kinetic chain from foot to cervical spine.", nav:"kinetic", color:"#9333ea" },
    { icon:"💊", title:"Treatment Prescription", desc:"Evidence-based exercise programming, HEP generation, treatment technique logging, and session records.", nav:"exercise", color:"#7c3aed" },
    { icon:"🤖", title:"SOAP Notes + AI", desc:"AI-powered SOAP note generation from your assessment data with Anthropic Claude integration.", nav:"soap", color:"#9333ea" },
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
            <div style={{fontSize:"0.65rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:4}}>{s.label}</div>
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
              <div style={{marginTop:10,fontSize:"0.68rem",fontWeight:700,color:f.color}}>Open →</div>
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
              borderRadius:8,fontSize:"0.72rem",fontWeight:600,color:"#1a1025"
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
function TherapistDashboardModule({ patients, data, onNav }) {
  const PC = getC();
  const patientName = data["dem_name"] || "No patient selected";
  const completedFields = Object.keys(data).filter(k=>data[k]&&data[k]!=="").length;
  const totalSections = 19;
  const sectionsWithData = [
    data["sub_complaint"], data["pal_findings"]||data["lx_palpation"],
    data["posture_defect_anterior_pelvic_tilt"]||data["posture_defect_forward_head"],
    data["lx_flex"]||data["rom_cflex"],
    data["mmt_l_hip_flex_left"]||data["mmt_shoulder_abd_left"],
    data["st_spurling"]||data["st_neer"],
    data["neuro_l4_reflex_left"],
    data["gait_overall"]||data["gait_cadence"],
  ].filter(Boolean).length;

  const recentPatients = patients.slice(0, 5);

  const quickStats = [
    { label:"Total Patients", value:patients.length, icon:"👥", color:"#7c3aed" },
    { label:"Active Session", value:patientName.split(" ")[0]||"—", icon:"🏃", color:"#9333ea" },
    { label:"Fields Completed", value:completedFields, icon:"✅", color:"#059669" },
    { label:"Sections Assessed", value:`${sectionsWithData}/8`, icon:"📋", color:"#b45309" },
  ];

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:"clamp(1.1rem,3vw,1.4rem)",fontWeight:900,color:"#1a1025",margin:"0 0 4px",letterSpacing:"-0.4px"}}>
          Therapist Dashboard
        </h2>
        <p style={{fontSize:"0.82rem",color:"#7e6a9a",margin:0}}>Overview of your clinic, patients, and current assessment.</p>
      </div>

      {/* Quick stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:28}}>
        {quickStats.map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #d8cce8",borderRadius:14,padding:"16px",boxShadow:"0 2px 10px rgba(124,58,237,0.06)"}}>
            <div style={{fontSize:"1.2rem",marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:"clamp(1.2rem,3vw,1.6rem)",fontWeight:900,color:s.color,lineHeight:1,marginBottom:4}}>{s.value}</div>
            <div style={{fontSize:"0.62rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
        {/* Current Assessment Progress */}
        <div style={{background:"#fff",border:"1px solid #d8cce8",borderRadius:16,padding:"20px",boxShadow:"0 2px 10px rgba(124,58,237,0.06)"}}>
          <div style={{fontWeight:800,color:"#7c3aed",fontSize:"0.82rem",marginBottom:14,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Current Assessment</div>
          <div style={{fontWeight:700,color:"#1a1025",fontSize:"0.95rem",marginBottom:4}}>{patientName}</div>
          {data["dem_age"]&&<div style={{fontSize:"0.75rem",color:"#7e6a9a",marginBottom:14}}>{data["dem_age"]}y · {data["dem_gender"]||""} · {data["dem_occupation"]||""}</div>}
          {[
            {label:"Subjective",done:!!data["sub_complaint"],nav:"subjective"},
            {label:"Palpation",done:!!data["lx_palpation"],nav:"palpation"},
            {label:"Posture",done:!!(data["posture_defect_anterior_pelvic_tilt"]||data["posture_defect_forward_head"]),nav:"posture"},
            {label:"ROM",done:!!(data["lx_flex"]||data["rom_cflex"]),nav:"rom"},
            {label:"Special Tests",done:!!(data["st_spurling"]||data["st_neer"]),nav:"special"},
            {label:"SOAP + AI",done:false,nav:"soap"},
          ].map((item,i)=>(
            <div key={i} onClick={()=>onNav(item.nav)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<5?"1px solid #ede7f6":"none",cursor:"pointer"}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:item.done?"rgba(5,150,105,0.12)":"rgba(124,58,237,0.08)",border:`1.5px solid ${item.done?"#059669":"#d8cce8"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",color:item.done?"#059669":"#d8cce8",flexShrink:0}}>
                {item.done?"✓":""}
              </div>
              <div style={{flex:1,fontSize:"0.78rem",color:"#1a1025",fontWeight:600}}>{item.label}</div>
              <div style={{fontSize:"0.68rem",color:"#7c3aed",fontWeight:700}}>→</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{background:"#fff",border:"1px solid #d8cce8",borderRadius:16,padding:"20px",boxShadow:"0 2px 10px rgba(124,58,237,0.06)"}}>
          <div style={{fontWeight:800,color:"#7c3aed",fontSize:"0.82rem",marginBottom:14,textTransform:"uppercase",letterSpacing:"0.5px"}}>⚡ Quick Actions</div>
          {[
            {label:"Start New Assessment",icon:"📝",nav:"subjective",primary:true},
            {label:"Generate SOAP + AI",icon:"🤖",nav:"soap",primary:false},
            {label:"Treatment Prescription",icon:"💊",nav:"exercise",primary:false},
            {label:"Run Special Tests",icon:"🔬",nav:"special",primary:false},
            {label:"Posture Camera",icon:"📷",nav:"posture",primary:false},
            {label:"Session Log",icon:"📋",nav:"tx_sessions",primary:false},
          ].map((a,i)=>(
            <button key={i} onClick={()=>onNav(a.nav)} style={{
              width:"100%",padding:"10px 14px",marginBottom:7,
              background:a.primary?"linear-gradient(135deg,#7c3aed,#9333ea)":"#f5f0fb",
              border:a.primary?"none":"1px solid #d8cce8",
              borderRadius:10,color:a.primary?"#fff":"#1a1025",
              fontWeight:700,fontSize:"0.78rem",cursor:"pointer",
              display:"flex",alignItems:"center",gap:8,textAlign:"left"
            }}>
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent patients */}
      {recentPatients.length > 0 && (
        <div style={{background:"#fff",border:"1px solid #d8cce8",borderRadius:16,padding:"20px",boxShadow:"0 2px 10px rgba(124,58,237,0.06)"}}>
          <div style={{fontWeight:800,color:"#7c3aed",fontSize:"0.82rem",marginBottom:14,textTransform:"uppercase",letterSpacing:"0.5px"}}>👥 Recent Patients</div>
          <div style={{display:"grid",gap:8}}>
            {recentPatients.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"#f5f0fb",borderRadius:10,border:"1px solid #ede7f6"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#9333ea)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",color:"#fff",fontWeight:800,flexShrink:0}}>
                  {(p.name||"P")[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:"#1a1025",fontSize:"0.82rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||"Unnamed"}</div>
                  <div style={{fontSize:"0.65rem",color:"#7e6a9a"}}>{p.lastDx||"No diagnosis"} · {p.updatedAt?new Date(p.updatedAt).toLocaleDateString():"—"}</div>
                </div>
                {p.hasRedFlags&&<span style={{fontSize:"0.6rem",padding:"2px 7px",background:"rgba(220,38,38,0.1)",color:"#dc2626",borderRadius:6,fontWeight:700}}>⚠ Flags</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PDF REPORTS MODULE — 3 World-Class Clinical PDF Documents
// Assessment Report · Treatment Plan · Home Exercise Protocol
// ═══════════════════════════════════════════════════════════════════════════

function PdfReportsModal({ data, dx, onClose }) {
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
  const arr = (k) => { const v=d[k]||""; return Array.isArray(v)?v:v.split("|||").filter(Boolean); };

  const pdfHeader = (title, subtitle, color) => {
    const clinicAddr = d.clinic_address || "Suite 100, PhysioMind HQ, 1 Digital Drive, Mumbai 400001";
    const clinicPhone = d.clinic_phone || "+91 98765 43210";
    const clinicWeb = d.clinic_web || "www.physiomind.app";
    const therapistName = d.therapist_name || "Your Physiotherapist";
    const therapistQual = d.therapist_qual || "MPT | AHPRA Registered";
    const reportNo = d.report_no || ("RPT-" + today.replace(/\s/g,""));
    return `<div>
    <div style="background:linear-gradient(135deg,${color} 0%,${color}ee 60%,#1a3358 100%);color:#fff;padding:22px 40px 18px;position:relative;overflow:hidden;">
      <div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">
        <div style="display:flex;gap:14px;align-items:center;">
          <div style="width:52px;height:52px;background:rgba(255,255,255,0.12);border-radius:14px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);flex-shrink:0;">
            <svg viewBox="0 0 48 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="24" cy="22" rx="14" ry="12" fill="none" stroke="#e8c96e" stroke-width="1.8"/>
              <line x1="24" y1="10" x2="24" y2="34" stroke="#e8c96e" stroke-width="1.2" stroke-dasharray="2,2"/>
              <path d="M14,18 Q11,22 14,26" stroke="#e8c96e" stroke-width="1.4" fill="none"/>
              <path d="M34,18 Q37,22 34,26" stroke="#e8c96e" stroke-width="1.4" fill="none"/>
              <line x1="24" y1="34" x2="24" y2="40" stroke="#e8c96e" stroke-width="2" stroke-linecap="round"/>
              <path d="M17,22 L20,22 L21,19 L23,25 L25,19 L27,25 L28,22 L31,22" stroke="#a78bfa" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div style="font-size:9px;color:#e8c96e;letter-spacing:3px;text-transform:uppercase;font-family:Georgia,serif;margin-bottom:2px;">PhysioMind &middot; AI Platform</div>
            <div style="font-size:20px;font-weight:700;letter-spacing:-0.3px;font-family:Georgia,serif;">PhysioMind</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.6);letter-spacing:0.8px;margin-top:1px;">AI-Powered Physiotherapy Platform</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px 14px;border:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:8px;color:#e8c96e;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;">Report No.</div>
            <div style="font-size:12px;font-weight:700;font-family:Courier New,monospace;">${escHtml(reportNo)}</div>
            <div style="font-size:8px;color:rgba(255,255,255,0.5);margin-top:5px;border-top:1px solid rgba(255,255,255,0.1);padding-top:5px;">${today}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:18px;margin-top:14px;flex-wrap:wrap;">
        ${[["&#128205;", clinicAddr], ["&#128222;", clinicPhone], ["&#127760;", clinicWeb]].map(function(pair){
          return '<div style="display:flex;align-items:center;gap:5px;"><span style="font-size:10px;">'+pair[0]+'</span><span style="color:rgba(255,255,255,0.6);font-size:8.5px;letter-spacing:0.3px;">'+escHtml(pair[1])+'</span></div>';
        }).join("")}
      </div>
    </div>
    <div style="background:${color};padding:14px 40px;display:flex;align-items:center;gap:14px;border-bottom:3px solid #c9a84c;">
      <div style="width:38px;height:38px;background:rgba(255,255,255,0.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;border:1px solid rgba(255,255,255,0.15);">&#128203;</div>
      <div>
        <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.2px;font-family:Georgia,serif;">${title}</div>
        <div style="color:rgba(255,255,255,0.6);font-size:9px;margin-top:1px;letter-spacing:0.4px;">${subtitle}</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:7px;">
        <div style="width:7px;height:7px;border-radius:50%;background:#e8c96e;"></div>
        <span style="color:#e8c96e;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;">Confidential Medical Document</span>
      </div>
    </div>
    <div style="background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 40px;">
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;">
        ${[["Patient",escHtml(patName)],["DOB",escHtml(dob)],["Age / Sex",escHtml(String(age))+" yrs"],["Occupation",escHtml(occ)],["Referring GP",escHtml(gp)],["Insurer",escHtml(insurer)],["Therapist",escHtml(therapistName)],["Report Date",today]].map(function(pair){
          return '<div><div style="font-size:7.5px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;font-family:Georgia,serif;">'+pair[0]+'</div><div style="font-size:9.5px;font-weight:600;color:#1e293b;">'+pair[1]+'</div></div>';
        }).join("")}
      </div>
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
      const cc = (d.cc_location||"").toLowerCase();
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
    const techs = [];
    for (let i = 1; i <= 10; i++) {
      const name = d[`tx_name_${i}`] || d[`technique_${i}`] || "";
      if (!name) continue;
      techs.push({ name, area: d[`tx_area_${i}`] || "", duration: d[`tx_duration_${i}`] || "", rationale: d[`tx_rationale_${i}`] || "" });
    }
    return techs;
  };

  const buildAssessmentPdf = () => {
    const cc = val("cc_main"); const ccLoc = arr("cc_location").join(", ") || "--";
    const vasNow = val("pa_vas_now"); const vasWorst = val("pa_vas_worst"); const vasBest = val("pa_vas_best");
    const onset = val("cc_onset"); const mechanism = val("cc_mechanism"); const duration = val("cc_duration");
    const aggravating = val("cc_aggravating"); const easing = val("cc_easing");
    const phx = val("phx_conditions"); const meds = val("meds_current"); const allergies = val("allergy_drug");
    const goal = val("ar_goal_function");
    const dxList = dx?.dx || [];
    const specialResults = [];
    Object.keys(d).forEach(k => { if(k.startsWith("st_") && d[k] && d[k].includes("Positive")) specialResults.push(`${k.replace("st_","").replace(/_/g," ")}: ${d[k]}`); });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Assessment Report - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Physiotherapy Assessment Report","Comprehensive Initial Clinical Evaluation","#1a3a5c")}
<div class="body">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:20px;padding:14px;background:#f1f5f9;border-radius:10px;border:1px solid #e2e8f0;">
    ${[["Full Name",escHtml(patName)],["Date of Birth",escHtml(dob)],["Age / Sex",`${escHtml(String(age))} / ${escHtml(sex)}`],["Occupation",escHtml(occ)],["Referring GP",escHtml(gp)],["Referral Source",escHtml(refSource)],["Insurer",escHtml(insurer)],["Policy No.",escHtml(refNo)]].map(([l,v])=>`<div><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">${l}</div><div style="font-size:10.5px;font-weight:600;color:#1a3a5c;">${v}</div></div>`).join("")}
  </div>
  <div style="display:grid;grid-template-columns:1fr 190px;gap:20px;align-items:start;">
    <div>
      ${sectionCard("Presenting Complaint","&#128221;",`
        <div style="background:#2563eb08;border-left:3px solid #2563eb;border-radius:6px;padding:10px 14px;margin-bottom:12px;">
          <div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Chief Complaint</div>
          <div style="font-size:11px;font-style:italic;color:#1a3a5c;line-height:1.6;">&ldquo;${cc}&rdquo;</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          ${[["Pain Location",ccLoc],["Onset",escHtml(onset)],["Duration",escHtml(duration)],["Mechanism",escHtml(mechanism)]].map(([l,v])=>`<div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">${l}</div><div style="font-size:10.5px;color:#1a3a5c;font-weight:500;padding:6px 10px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0;">${v}</div></div>`).join("")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Aggravating Factors</div><div style="font-size:10.5px;color:#1a3a5c;padding:6px 10px;background:rgba(220,38,38,0.05);border:1px solid rgba(220,38,38,0.15);border-radius:6px;">${aggravating}</div></div>
          <div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Easing Factors</div><div style="font-size:10.5px;color:#1a3a5c;padding:6px 10px;background:rgba(5,150,105,0.05);border:1px solid rgba(5,150,105,0.15);border-radius:6px;">${easing}</div></div>
        </div>
      `,"#2563eb")}
      ${sectionCard("Pain Assessment (VAS)","&#128308;",`
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
          ${[["Current Pain",vasNow,"#dc2626"],["Worst Pain",vasWorst,"#7c3aed"],["Best / Rest",vasBest,"#059669"]].map(([l,v,c])=>`<div style="text-align:center;padding:12px;background:${c}08;border:2px solid ${c}20;border-radius:10px;"><div style="font-size:24px;font-weight:800;color:${c};line-height:1;">${v||"&mdash;"}${v?"/10":""}</div><div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-top:4px;">${l}</div></div>`).join("")}
        </div>
        ${vasNow?`<div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden;"><div style="height:100%;width:${(parseFloat(vasNow)||0)*10}%;background:linear-gradient(90deg,#059669,#d97706,#dc2626);border-radius:6px;"></div></div><div style="font-size:8px;color:#6b7280;margin-top:4px;">VAS Scale: 0 = No pain &mdash; 10 = Worst imaginable pain</div>`:""}
      `,"#dc2626")}
      ${dxList.length>0?sectionCard("Clinical Impression","&#129321;",dxList.slice(0,4).map((item,i)=>`
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px;background:${i===0?"#2563eb0a":"#f1f5f9"};border:1px solid ${i===0?"#2563eb30":"#e2e8f0"};border-radius:8px;margin-bottom:8px;">
          <div style="min-width:28px;height:28px;background:${i===0?"#2563eb":"#94a3b8"};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</div>
          <div><div style="font-size:11px;font-weight:700;color:#1a3a5c;">${escHtml(item.label||"")}</div>${item.icd?`<div style="font-size:9px;color:#6b7280;margin-top:2px;">ICD-10: ${escHtml(item.icd)}</div>`:""}</div>
        </div>`).join(""),"#2563eb"):""}
      ${sectionCard("Past Medical & Social History","&#128203;",`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          ${[["Medical History",escHtml(phx)],["Current Medications",escHtml(meds)],["Drug Allergies",escHtml(allergies)],["Precautions",escHtml(d.allergy_other||"None documented")]].map(([l,v])=>`<div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">${l}</div><div style="font-size:10.5px;color:#1a3a5c;font-weight:500;padding:6px 10px;background:#f1f5f9;border-radius:6px;border:1px solid #e2e8f0;">${v}</div></div>`).join("")}
        </div>
        ${goal?`<div style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);border-radius:8px;padding:10px 14px;"><span style="font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.8px;">&#127919; Patient Goal: </span><span style="font-size:10.5px;color:#1a3a5c;">${escHtml(goal)}</span></div>`:""}
      `,"#0891b2")}
    </div>
    <div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;text-align:center;">&#9609; Postural Analysis</div>
        ${postureSvg()}
        <div style="margin-top:10px;">
          ${[[d.post_fhp,"FHP","#dc2626"],[d.post_kyphosis,"Kyphosis","#d97706"],[d.post_lordosis,"Lordosis","#d97706"],[d.post_pelvis,"Pelvis","#7c3aed"],[d.post_sh,"Shoulder","#2563eb"]].filter(([v])=>v&&v!=="--"&&!v.includes("Normal")).map(([v,l,c])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #e2e8f0;"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:9px;font-weight:700;color:${c};">${escHtml(String(v)).substring(0,22)}</span></div>`).join("")||`<div style="font-size:9px;color:#94a3b8;text-align:center;">No deviations noted</div>`}
        </div>
      </div>
      ${specialResults.length>0?`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;"><div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">&#8853; Positive Tests</div>${specialResults.slice(0,6).map(r=>`<div style="font-size:9px;color:#1a3a5c;padding:4px 0;border-bottom:1px solid #e2e8f0;line-height:1.4;">${escHtml(r)}</div>`).join("")}</div>`:""}
    </div>
  </div>
  ${sectionCard("Range of Motion","&#128208;",`<table><thead><tr><th>Movement</th><th style="text-align:center;">Left</th><th style="text-align:center;">Right</th><th style="text-align:center;">Normal</th><th style="text-align:center;">Status</th></tr></thead><tbody>${[
    ["Shoulder Flexion","rom_sh_flex_left","rom_sh_flex_right",180],["Shoulder Abduction","rom_sh_abd_left","rom_sh_abd_right",180],["Shoulder ER","rom_sh_er_left","rom_sh_er_right",90],["Hip Flexion","rom_hip_flex_left","rom_hip_flex_right",120],["Knee Flexion","rom_kn_flex_left","rom_kn_flex_right",140],["Ankle DF","rom_ank_df_left","rom_ank_df_right",20],["Cervical Flexion","rom_cx_flex","",50],["Cervical Extension","rom_cx_ext","",60],["Lumbar Flexion","rom_lx_flex","",80],["Lumbar Extension","rom_lx_ext","",25],
  ].filter(([,l,r])=>d[l]||d[r]).map(([region,lk,rk,norm])=>{const lv=d[lk]||"";const rv=d[rk]||"";const lN=parseFloat(lv);const rN=parseFloat(rv);const lCol=lv&&!isNaN(lN)?(lN<norm*0.8?"#dc2626":lN<norm*0.9?"#d97706":"#059669"):"#94a3b8";const rCol=rv&&!isNaN(rN)?(rN<norm*0.8?"#dc2626":rN<norm*0.9?"#d97706":"#059669"):"#94a3b8";const qual=lv||rv?(lN<norm*0.7||rN<norm*0.7?"Significantly Limited":lN<norm*0.9||rN<norm*0.9?"Mildly Limited":"WNL"):"Not Tested";const qCol=qual==="WNL"?"#059669":qual==="Not Tested"?"#94a3b8":qual==="Significantly Limited"?"#dc2626":"#d97706";return `<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:500;color:#1a3a5c;">${escHtml(region)}</td><td style="text-align:center;font-weight:700;color:${lCol};font-size:10px;">${lv?lv+"&deg;":"&mdash;"}</td><td style="text-align:center;font-weight:700;color:${rCol};font-size:10px;">${rv?rv+"&deg;":rk?"&mdash;":"N/A"}</td><td style="text-align:center;color:#6b7280;font-size:10px;">${norm}&deg;</td><td style="text-align:center;font-size:9px;"><span style="padding:2px 7px;border-radius:4px;font-weight:700;background:${qCol}15;color:${qCol};">${qual}</span></td></tr>`;}).join("")||`<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:16px;font-size:10px;">No ROM measurements recorded</td></tr>`}</tbody></table>`,"#0891b2")}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    ${sectionCard("Neurological Findings","&#9889;",`${[["Sensation",d.neuro_sensation],["Reflexes",d.neuro_reflex],["Motor",d.neuro_motor],["Neural Tension",d.neuro_tension]].filter(([,v])=>v).map(([l,v])=>`<div style="display:flex;gap:8px;margin-bottom:7px;align-items:flex-start;"><span style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;min-width:65px;padding-top:2px;">${l}</span><span style="font-size:10px;color:#1a3a5c;flex:1;">${escHtml(String(v))}</span></div>`).join("")||`<div style="font-size:10px;color:#94a3b8;">No neurological deficits documented</div>`}`,"#7c3aed")}
    ${sectionCard("Palpation","&#128080;",`${[["Tenderness",d.palp_tenderness],["Tone",d.palp_tone],["Swelling",d.palp_swelling],["Temperature",d.palp_temp],["Crepitus",d.palp_crepitus]].filter(([,v])=>v).map(([l,v])=>`<div style="display:flex;gap:8px;margin-bottom:7px;align-items:flex-start;"><span style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;min-width:70px;padding-top:2px;">${l}</span><span style="font-size:10px;color:#1a3a5c;flex:1;">${escHtml(String(v))}</span></div>`).join("")||`<div style="font-size:10px;color:#94a3b8;">No palpation findings recorded</div>`}`,"#d97706")}
  </div>
  ${sectionCard("Clinical Summary","&#128203;",`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Problem List</div><div style="background:rgba(220,38,38,0.04);border:1px solid rgba(220,38,38,0.15);border-radius:8px;padding:10px 14px;">${dxList.slice(0,3).map((item,i)=>`<div style="font-size:10px;color:#1a3a5c;padding:3px 0;border-bottom:1px solid rgba(220,38,38,0.08);">${i+1}. ${escHtml(item.label||"")}</div>`).join("")||`<div style="font-size:10px;color:#94a3b8;">Pending diagnosis</div>`}</div></div><div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Patient Goals</div><div style="background:rgba(5,150,105,0.04);border:1px solid rgba(5,150,105,0.15);border-radius:8px;padding:10px 14px;">${[d.ar_goal_function,d.ar_goal_pain,d.ar_goal_return].filter(Boolean).map(g=>`<div style="font-size:10px;color:#1a3a5c;padding:3px 0;border-bottom:1px solid rgba(5,150,105,0.1);">&#10003; ${escHtml(String(g))}</div>`).join("")||`<div style="font-size:10px;color:#94a3b8;">Goals to be established</div>`}</div></div></div><div style="margin-top:12px;padding:10px 14px;background:#f1f5f9;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Clinical Notes</div><div style="font-size:10.5px;color:#1a3a5c;line-height:1.6;">${escHtml(d.soap_assessment||d.clinical_notes||"Assessment findings documented above.")}</div></div>`,"#059669")}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;">
    <div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Physiotherapist Signature:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Name / AHPRA No.: ___________________</div></div>
    <div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Date of Assessment:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Next Review: ___________________</div></div>
  </div>
</div>
${pdfFooter("Physiotherapy Assessment Report")}
</div></body></html>`;
  };

  const buildTreatmentPdf = () => {
    const exercises = gatherExercises();
    const techniques = gatherTechniques();
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
    <div style="background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Working Diagnosis</div><div style="font-size:13px;font-weight:800;color:#1a3a5c;margin-bottom:8px;line-height:1.3;">${dxLabel}</div>${[["Pain (VAS Now)",val("pa_vas_now")+"/10"],["Treatment Frequency",val("tx_frequency","2&ndash;3x per week")],["Expected Duration",val("tx_duration_plan","6&ndash;8 weeks")]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(37,99,235,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</span></div>`).join("")}</div>
  </div>
  ${sectionCard("Treatment Goals","&#127919;",`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">${[
    ["Short-Term (2&ndash;4 wks)","#0891b2",[d.ar_goal_pain||"Pain reduction &ge;30% on VAS",d.ar_goal_function||"Improve functional ROM","Reduce swelling/inflammation"]],
    ["Medium-Term (4&ndash;8 wks)","#2563eb",[d.ar_goal_str||"Restore muscle strength to 4+/5",d.ar_goal_func||"Functional task independence","Return to work/leisure activities"]],
    ["Long-Term (8&ndash;12 wks)","#059669",[d.ar_goal_return||"Full return to prior activity","Self-management strategies","Prevent recurrence"]],
  ].map(([title,color,goals])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:8px;padding:12px;"><div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>${goals.map(g=>`<div style="font-size:9.5px;color:#1a3a5c;padding:4px 0;border-bottom:1px solid ${color}15;display:flex;gap:6px;align-items:flex-start;"><span style="color:${color};font-weight:700;flex-shrink:0;">&#10003;</span><span>${escHtml(String(g))}</span></div>`).join("")}</div>`).join("")}</div>`,"#059669")}
  ${sectionCard("Manual Therapy &amp; Treatment Techniques","&#129330;",`<table><thead><tr><th>Technique</th><th>Target Area</th><th>Duration / Dosage</th><th>Evidence Base</th></tr></thead><tbody>${techniques.length>0?techniques.map(t=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(t.name)}</td><td style="font-size:10px;">${escHtml(t.area)}</td><td style="font-size:10px;">${escHtml(t.duration)}</td><td style="font-size:9.5px;color:#6b7280;">${escHtml(t.rationale)}</td></tr>`).join(""):
[["Soft Tissue Mobilisation","Hypertonic muscles / trigger points","5&ndash;10 min per area","Level 1A &mdash; Cochrane Review"],["Joint Mobilisation (Grade III&ndash;IV)","Restricted articular joint segments","3 sets PA pressure","Level 1B &mdash; RCT evidence"],["Therapeutic Ultrasound","Periarticular / tendon tissue","1MHz, 1.0 W/cm&sup2;, 5 min","Level 2B"],["Dry Needling / IMS","Myofascial trigger points","As clinically indicated","Level 1B &mdash; multiple RCTs"],["Taping (Kinesio / Rigid)","Joint support / proprioception","72 hrs per application","Level 2"],["TENS / Electrotherapy","Pain modulation (gate control)","80Hz, 20 min","Level 2B &mdash; analgesic effect"],].map(([tech,target,dose,ev])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${tech}</td><td style="font-size:10px;">${target}</td><td style="font-size:10px;">${dose}</td><td style="font-size:9px;color:#6b7280;">${ev}</td></tr>`).join("")}</tbody></table>`,"#d97706")}
  ${Object.entries(groupedExercises).map(([phase,exs])=>{const pColor=phaseColors[phase]||"#2563eb";return sectionCard(`Exercise Prescription &mdash; ${phase}`,"&#127959;",`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">${exs.map((ex,i)=>{const svgType=svgKeys[i%svgKeys.length];return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;"><div style="background:${pColor}10;border-bottom:1px solid ${pColor}20;padding:8px 12px;display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</span><span style="font-size:11px;font-weight:700;color:#1a3a5c;">${escHtml(ex.name)}</span></div><div style="padding:10px 12px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">${[["Sets",ex.sets],["Reps",ex.reps],ex.hold?["Hold",ex.hold]:null,["Rest",ex.rest],["Frequency",ex.freq]].filter(Boolean).map(([l,v])=>`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;text-align:center;"><div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:700;color:${pColor};">${escHtml(v)}</div></div>`).join("")}</div>${ex.target?`<div style="font-size:8.5px;color:#0891b2;margin-bottom:4px;"><strong>Target:</strong> ${escHtml(ex.target)}</div>`:""}${ex.notes?`<div style="background:#fff;border-radius:6px;padding:6px 8px;font-size:8.5px;color:#6b7280;line-height:1.5;border:1px solid #e2e8f0;">${escHtml(ex.notes)}</div>`:""}${ex.progression?`<div style="margin-top:5px;font-size:8px;color:#059669;"><strong>&#11014; Progression:</strong> ${escHtml(ex.progression)}</div>`:""}</div></div>`;}).join("")}</div>`,pColor);}).join("")}
  ${sectionCard("Outcome Measures &amp; Reassessment","&#128200;",`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Baseline &amp; Target</div><table><thead><tr><th>Measure</th><th>Baseline</th><th>Target</th></tr></thead><tbody>${[["VAS Pain Now",val("pa_vas_now"),"&le;"+Math.max(0,(parseFloat(d.pa_vas_now)||5)-3)+"/10"],["VAS Worst",val("pa_vas_worst"),"&le;5/10"],["PSFS Score",val("psfs_score"),"&ge;7/10"],["Patient Goal",val("ar_goal_function"),"Achieved"],].map(([m,b,t])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;">${m}</td><td style="font-size:9px;font-weight:700;color:#dc2626;">${b}</td><td style="font-size:9px;font-weight:700;color:#059669;">${t}</td></tr>`).join("")}</tbody></table></div><div><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Reassessment Schedule</div>${[["Sessions 1&ndash;2","Baseline, pain education, motor control"],["Sessions 3&ndash;4","Reassess pain, progress exercises"],["Session 6","Formal re-test, goal review"],["Session 8&ndash;10","Discharge planning"],].map(([s,desc])=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e2e8f0;align-items:flex-start;"><span style="font-size:9px;font-weight:700;color:#2563eb;min-width:90px;flex-shrink:0;">${s}</span><span style="font-size:9px;color:#6b7280;">${desc}</span></div>`).join("")}</div></div>`,"#0891b2")}
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
      lateral_pelvic_tilt:"Lateral Pelvic Tilt",genu_valgum:"Genu Valgum (Knock Knees)",
      genu_varum:"Genu Varum (Bow Legs)",foot_pronation:"Foot Overpronation / Flat Arch",
      foot_supination:"Foot Supination / High Arch",scoliosis:"Scoliosis / Lateral Spinal Curve",
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
      {label:"Craniovertebral Angle", value:cva,     normal:"&gt;50 deg", bad:parseFloat(cva)<50,                                          bc:"#dc2626"},
      {label:"Forward Head Dist",     value:fhp,     normal:"&lt;25mm",   bad:parseFloat(fhp)>25,                                          bc:"#dc2626"},
      {label:"Shoulder Angle",        value:shAngle, normal:"&lt;2 deg",  bad:parseFloat(shAngle)>2,                                       bc:"#d97706"},
      {label:"Thoracic Kyphosis",     value:kyph,    normal:"20-40 deg",  bad:parseFloat(kyph)>40,                                         bc:"#d97706"},
      {label:"Lumbar Lordosis",       value:lord,    normal:"30-50 deg",  bad:parseFloat(lord)>50||parseFloat(lord)<30,                    bc:"#d97706"},
      {label:"Pelvic Tilt",           value:pelv,    normal:"0-5 deg",    bad:false,                                                       bc:"#6b7280"},
    ];
    var measCards = measData.map(function(m) {
      var c = (m.bad && m.value !== "N/A") ? m.bc : (m.value === "N/A" ? "#94a3b8" : "#059669");
      var status = m.value === "N/A" ? "N/A" : m.bad ? "Abnormal" : "Normal";
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
      {title:"Upper Crossed Syndrome", active:hasUCS, text:"Tight upper trapezius/pectorals with inhibited deep neck flexors. Drives forward head and shoulder protraction.", color:"#dc2626"},
      {title:"Lower Crossed Syndrome", active:hasLCS, text:"Overactive hip flexors/lumbar extensors with weak glutes/TA. Creates anterior pelvic tilt and lumbar overload.", color:"#d97706"},
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
      ["Platform","PhysioMind"],
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
      + pdfHeader("Postural Analysis Report","Quantitative Postural Assessment &middot; PhysioMind Platform","#0a1628")
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
      + pdfFooter("Postural Analysis Report &mdash; PhysioMind Platform")
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
    { id:"hep", icon:"&#127968;", title:"Home Exercise Protocol", subtitle:"Patient Copy -- Daily Program", desc:"Patient-friendly exercise cards with SVG illustrations, step-by-step instructions, dosage parameters, 7-day weekly compliance tracker, pain diary, lifestyle advice, and clinic contact details.", color:"#7c3aed", gradient:"linear-gradient(135deg,#5b21b6,#7c3aed)", tags:["Exercise Cards","SVG Illustrations","Dosage","Weekly Tracker","Pain Diary","Lifestyle Tips"], pages:"3-4 pages" },
    { id:"posture", icon:"&#129468;", title:"Postural Analysis Report", subtitle:"AI-Assisted Quantitative Posture Assessment", desc:"Full PhysioMind posture report: overall score ring, 6 quantitative measurements (CVA, FHP, shoulder angle, kyphosis, lordosis, pelvic tilt), regional defect table with severity & tight muscles, biomechanical correlation, Upper/Lower Crossed Syndrome flags, clinical recommendations, and photo placeholder with landmark overlay.", color:"#0891b2", gradient:"linear-gradient(135deg,#0a1628,#0891b2)", tags:["Score","CVA / FHP","Defect Table","Biomechanics","Photo Analysis","Recommendations","Signature"], pages:"2-3 pages" },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#ffffff",borderRadius:20,maxWidth:760,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.4)"}}>
        <div style={{background:"linear-gradient(135deg,#1a3a5c 0%,#2563eb 50%,#7c3aed 100%)",borderRadius:"20px 20px 0 0",padding:"24px 28px",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:"24px"}}>📄</span>
                <div><h2 style={{margin:0,fontSize:"1.3rem",fontWeight:800,letterSpacing:"-0.3px"}}>Clinical PDF Reports</h2><p style={{margin:"2px 0 0",fontSize:"0.75rem",opacity:0.8}}>Generate 3 world-class professional documents</p></div>
              </div>
              {patName !== "Patient" && <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:"rgba(255,255,255,0.12)",borderRadius:8,width:"fit-content"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#34d399"}}/><span style={{fontSize:"0.8rem",fontWeight:600}}>{patName}</span>{age && age !== "--" && <span style={{fontSize:"0.72rem",opacity:0.7}}>&#183; Age {age}</span>}</div>}
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
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h3 style={{margin:0,fontSize:"1rem",fontWeight:800,color:"#1e293b"}}>{report.title}</h3><span style={{fontSize:"0.62rem",padding:"2px 7px",borderRadius:5,background:"rgba(100,116,139,0.12)",color:"#64748b",fontWeight:600}}>{report.pages}</span></div>
                        <p style={{margin:0,fontSize:"0.75rem",color:"#64748b",fontWeight:500}}>{report.subtitle}</p>
                      </div>
                    </div>
                    <p style={{margin:"0 0 10px",fontSize:"0.78rem",color:"#475569",lineHeight:1.6}}>{report.desc}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{report.tags.map(tag=><span key={tag} style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:5,background:report.color+"12",border:`1px solid ${report.color}25`,color:report.color,fontWeight:600}}>{tag}</span>)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"18px 20px",borderLeft:"1px solid #e2e8f0",minWidth:130,gap:10}}>
                    {done[report.id] && <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(5,150,105,0.1)",border:"1px solid rgba(5,150,105,0.3)",borderRadius:8}}><span style={{color:"#059669",fontSize:"0.65rem",fontWeight:700}}>✓ Generated</span></div>}
                    <button onClick={()=>generatePdf(report.id)} disabled={generating!==null} style={{width:"100%",padding:"12px 16px",background:generating===report.id?"#94a3b8":report.gradient,border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:generating?"not-allowed":"pointer",opacity:generating&&generating!==report.id?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                      {generating===report.id?"⏳ Generating...":"📥 Generate PDF"}
                    </button>
                    <div style={{fontSize:"0.65rem",color:"#94a3b8",textAlign:"center",lineHeight:1.4}}>Opens in new tab<br/>Print → Save as PDF</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:18,padding:"16px 20px",background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04))",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div><div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e293b"}}>Generate All 4 Reports</div><div style={{fontSize:"0.72rem",color:"#64748b",marginTop:2}}>Create all documents at once for a complete patient report package</div></div>
            <button onClick={async()=>{for(const r of reports){await generatePdf(r.id);await new Promise(res=>setTimeout(res,1500));}}} disabled={generating!==null} style={{padding:"12px 22px",background:"linear-gradient(135deg,#1a3a5c,#7c3aed)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.8rem",cursor:generating?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0,boxShadow:"0 2px 12px rgba(124,58,237,0.3)"}}>
              📄 Generate All
            </button>
          </div>
          <div style={{marginTop:14,padding:"12px 16px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10}}>
            <div style={{fontSize:"0.7rem",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>💡 Tips for best results</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
              {["Complete patient demographics before generating","Add exercises in the Exercise Prescription module","Record ROM measurements for detailed tables","Run AI Diagnosis first for diagnostic content","Use Chrome or Edge for best PDF quality","Enable Print: Background Graphics for full colour"].map(tip=>(
                <div key={tip} style={{fontSize:"0.72rem",color:"#94a3b8",display:"flex",gap:6,alignItems:"flex-start",padding:"2px 0"}}><span style={{color:"#7c3aed",fontWeight:700,flexShrink:0}}>→</span>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function AppInner() {
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

  // ── Deferred mounting: heavy tabs only render after first visit ──────────
  // This cuts initial render time dramatically
  // Once mounted, component stays mounted (data preserved)
  const [mountedTabs, setMountedTabs] = useState(new Set(["home", "subjective"]));
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

  const [data, setData] = useState(DEMO_DATA);
  const [showDx, setShowDx] = useState(false);
  const [dx, setDx] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [expandedDx, setExpandedDx] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  const [bnavHidden, setBnavHidden] = useState(false);
  const [bnavTab, setBnavTab] = useState(null); // null=no panel open, or "assessment"|"advanced"|"treatment"|"documentation"|"top"
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonMsg, setJsonMsg] = useState(null);
  const importRef = useRef(null);

  // ── Multi-Patient Database ─────────────────────────────────────────────
  const [patients, setPatients] = useState(() => loadPatientDB());
  const [activePatientId, setActivePatientId] = useState(null);
  const [showPatientDb, setShowPatientDb] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [pendingPatient, setPendingPatient] = useState(null);
  const [showPdfReports, setShowPdfReports] = useState(false);

  // Auto-save current data to active patient whenever data changes
  useEffect(() => {
    if (!activePatientId) return;
    setPatients(prev => {
      const updated = prev.map(p => p.id === activePatientId ? {
        ...p,
        data,
        name: data["dem_name"] || p.name || "Unnamed Patient",
        updatedAt: new Date().toISOString(),
        hasRedFlags: ["rf_malignancy","rf_cauda","rf_vascular","rf_inflammatory","rf_fracture","rf_neuro"]
          .flatMap(fid => (data[fid]||"").split("|||"))
          .filter(v => v && !["No malignancy red flags","No cauda equina flags","No vascular red flags","No inflammatory red flags","No fracture red flags","No neurological red flags","No red flags — proceed with assessment"].includes(v)).length > 0
      } : p);
      savePatientDB(updated);
      return updated;
    });
  }, [data, activePatientId]);

  const createNewPatient = () => {
    const newP = { id: genId(), name: "New Patient", data: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: "" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated);
    setData({});
    setActivePatientId(newP.id);
    setShowPatientDb(false);
    setJsonMsg({ type:"success", text:"✅ New patient created" });
    setTimeout(() => setJsonMsg(null), 2500);
  };

  const selectPatient = (p) => {
    const hasChanges = Object.keys(data).length > 0 && activePatientId !== p.id;
    if (hasChanges) { setPendingPatient(p); setShowUnsaved(true); return; }
    setData(p.data || {});
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
      // New style: set({ ...data, field: value })
      setData(idOrObj);
    } else {
      // Legacy style: set("field_id", value)
      setData(p => ({ ...p, [idOrObj]: val }));
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
    return val.split("|||").filter(v => v && !SAFE_VALUES.includes(v));
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
  const navTo = useCallback((key) => {
    setActive(key);
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
                <div style={{fontSize:"0.62rem",fontWeight:700,color:col,marginBottom:3}}>{side} {!isNaN(num)&&num<(t.normal||0)*0.8?"⚠ LIMITED":""}</div>
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
                <div style={{fontSize:"0.62rem",fontWeight:700,color:prob?PC.red:PC.muted,marginBottom:3}}>{side} {prob?"⚠":""}</div>
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

  const sysColors={NKT:C.blue,Cyriax:PC.yellow,FMS:PC.green,Posture:PC.purple,"Kinetic Chain":PC.accent,Fascia:"#f97316","Muscle Activation":PC.purple,Structural:PC.red};

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
          {pct===100&&<span style={{fontSize:"0.55rem",color:PC.green,flexShrink:0,fontWeight:800}}>✓</span>}
          {pct>0&&pct<100&&<span style={{fontSize:"0.55rem",color:PC.muted,flexShrink:0,fontWeight:600,background:PC.s2,padding:"1px 4px",borderRadius:4}}>{pct}%</span>}
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
          <div style={{flex:1,fontSize:"0.72rem",fontWeight:700,color:isOpen?accentColor:PC.text,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
          <span style={{fontSize:"0.65rem",color:isOpen?accentColor:PC.muted,transition:"transform 0.2s",display:"inline-block",transform:isOpen?"rotate(0deg)":"rotate(-90deg)"}}>▾</span>
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
      {/* Patient controls */}
      <div style={{padding:"4px 8px 12px",borderBottom:`1px solid ${PC.border}`,marginBottom:8}}>
        <button onClick={()=>setShowPatientDb(true)} style={{width:"100%",padding:"9px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:"#9333ea",fontWeight:600,fontSize:"0.7rem",cursor:"pointer",marginBottom:5,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          👥 {patients.length} Patient{patients.length!==1?"s":""}
        </button>
        <button onClick={createNewPatient} style={{width:"100%",padding:"8px 10px",background:"rgba(5,150,105,0.06)",border:`1px solid ${PC.a3}25`,borderRadius:8,color:PC.a3,fontWeight:600,fontSize:"0.68rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          ＋ New Patient
        </button>
      </div>

      {/* 1. Home */}
      <SidebarTopItem navKey="home" icon="🏠" label="Home"/>

      {/* 2. Dashboard */}
      <SidebarTopItem navKey="dashboard" icon="📊" label="Dashboard"/>

      <div style={{height:1,background:PC.border,margin:"6px 12px"}}/>

      {/* 3. Assessment (collapsible) */}
      <SidebarGroup groupKey="assessment" icon="🩺" label="Assessment" accentColor="#7c3aed">
        <SidebarItem navKey="subjective"    icon="📝" label="Subjective Assessment"/>
        <SidebarItem navKey="posture"       icon="🧍" label="Observation & Posture"/>
        <SidebarItem navKey="palpation"     icon="🖐️" label="Palpation"/>
        <SidebarItem navKey="rom"           icon="📐" label="Range of Motion"/>
        <SidebarItem navKey="mmt"           icon="💪" label="MMT"/>
        <SidebarItem navKey="fma"           icon="🏃" label="Functional Assessment"/>
        <SidebarItem navKey="special"       icon="🔬" label="Special Tests (100+)"/>
        <SidebarItem navKey="neuro"         icon="⚡" label="Neurological"/>
        <SidebarItem navKey="gait"          icon="🚶" label="Gait Analysis"/>
        <SidebarItem navKey="outcome"       icon="📈" label="Outcome Measures"/>
      </SidebarGroup>

      {/* 4. Advanced Clinical Assessment (collapsible) */}
      <SidebarGroup groupKey="advanced" icon="🔭" label="Advanced Assessment" accentColor="#9333ea">
        <SidebarItem navKey="cyriax_full"  icon="🦴" label="Cyriax"/>
        <SidebarItem navKey="kinetic"      icon="⛓️" label="Kinetic Chain"/>
        <SidebarItem navKey="nkt"          icon="🧠" label="NKT"/>
        <SidebarItem navKey="fascia"       icon="🕸️" label="Fascia Integration"/>
      </SidebarGroup>

      {/* 5. Treatment (collapsible) */}
      <SidebarGroup groupKey="treatment" icon="💊" label="Treatment" accentColor="#059669">
        <SidebarItem navKey="exercise"     icon="🏋" label="Exercise Prescription"/>
        <SidebarItem navKey="tx_techniques" icon="🤲" label="Tx Techniques"/>
      </SidebarGroup>

      {/* 6. Documentation (collapsible) */}
      <SidebarGroup groupKey="documentation" icon="📋" label="Documentation" accentColor="#b45309">
        <SidebarItem navKey="tx_sessions"  icon="📅" label="Session Log"/>
        <SidebarItem navKey="soap"         icon="🤖" label="SOAP + AI"/>
      </SidebarGroup>

      {/* 7. PDF Reports */}
      <div style={{margin:"4px 6px"}}>
        <div onClick={()=>setShowPdfReports(true)} style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"9px 14px",cursor:"pointer",borderRadius:9,
          background:"linear-gradient(135deg,rgba(220,38,38,0.08),rgba(185,28,28,0.05))",
          border:`1px solid rgba(220,38,38,0.25)`,
          transition:"all 0.15s",
        }}>
          <span style={{fontSize:"0.9rem"}}>📄</span>
          <div style={{fontSize:"0.76rem",fontWeight:700,color:"#dc2626"}}>Generate PDF Reports</div>
          <span style={{marginLeft:"auto",fontSize:"0.55rem",padding:"2px 6px",borderRadius:5,background:"rgba(220,38,38,0.15)",color:"#dc2626",fontWeight:800}}>3 PDFs</span>
        </div>
      </div>

      {/* Run Diagnosis */}
      <div style={{margin:"12px 8px 8px",paddingTop:12,borderTop:`1px solid ${PC.border}`}}>
        <button onClick={runDx} style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,#7c3aed,#9333ea)`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.76rem",cursor:"pointer",letterSpacing:"0.3px",boxShadow:"0 2px 12px rgba(124,58,237,0.25)"}}>
          ▶ Run Diagnosis
        </button>
      </div>
    </>
  );

  return(
    <div className="pm-shell" style={{background:PC.bg,color:PC.text,fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",transition:"background 0.2s,color 0.15s"}}>
      <MobileStyleInjector/>

      {/* Info Modal */}
      {infoModal&&(
        <div onClick={()=>setInfoModal(null)} className="pm-modal-wrap" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} className="pm-modal-box" style={{background:PC.surface,border:`1px solid ${PC.accent}40`,borderRadius:14,padding:24,maxWidth:500,width:"100%",maxHeight:"82vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,color:PC.accent,marginBottom:14,fontSize:"1rem"}}>{infoModal.label}</div>
            {infoModal.sig&&<div style={{marginBottom:12}}><div style={{fontSize:"0.62rem",fontWeight:700,color:PC.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>📊 Significance</div><div style={{background:PC.s2,borderRadius:8,padding:12,fontSize:"0.8rem",color:PC.text,lineHeight:1.7}}>{infoModal.sig}</div></div>}
            {infoModal.how&&<div style={{marginBottom:16}}><div style={{fontSize:"0.62rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>👐 How to Perform</div><div style={{background:PC.s2,borderRadius:8,padding:12,fontSize:"0.8rem",color:PC.text,lineHeight:1.7}}>{infoModal.how}</div></div>}
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
        />
      )}

      {/* ── PDF REPORTS MODAL ── */}
      {showPdfReports && (
        <PdfReportsModal
          data={data}
          dx={dx}
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
              <div style={{fontSize:"0.62rem",color:"rgba(0,0,0,0.7)",fontWeight:600}}>{urgentFlags.length>0?"Do not proceed — refer immediately":"Review before proceeding with treatment"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
            {activeRedFlags.slice(0,4).map((f,i)=>(
              <span key={i} style={{background:"rgba(0,0,0,0.18)",borderRadius:6,padding:"2px 8px",fontSize:"0.62rem",fontWeight:700,color:"#000"}}>{f}</span>
            ))}
            {activeRedFlags.length>4&&<span style={{background:"rgba(0,0,0,0.18)",borderRadius:6,padding:"2px 8px",fontSize:"0.62rem",fontWeight:700,color:"#000"}}>+{activeRedFlags.length-4} more</span>}
          </div>
          <button onClick={()=>navTo("subjective")} style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,0,0,0.3)",borderRadius:7,color:"#000",fontWeight:800,fontSize:"0.65rem",cursor:"pointer",padding:"4px 10px",flexShrink:0,whiteSpace:"nowrap"}}>View →</button>
        </div>
      )}

      {/* ── TOAST MESSAGE ── */}
      {jsonMsg && (
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:999,background:jsonMsg.type==="success"?"rgba(0,201,122,0.97)":"rgba(255,77,109,0.97)",color:"#000",fontWeight:700,fontSize:"0.8rem",padding:"10px 20px",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap"}}>
          {jsonMsg.text}
        </div>
      )}

      {/* ── JSON EXPORT/IMPORT PANEL ── */}
      {showJsonPanel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:PC.surface,border:`1px solid rgba(0,229,255,0.25)`,borderRadius:16,padding:22,maxWidth:500,width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,color:PC.accent,fontSize:"1rem"}}>💾 Save / Load Assessment</div>
              <button onClick={()=>setShowJsonPanel(false)} style={{background:"none",border:`1px solid ${PC.border}`,borderRadius:7,color:PC.muted,cursor:"pointer",padding:"4px 10px",fontSize:"0.72rem"}}>✕ Close</button>
            </div>

            {/* Patient info preview */}
            {(data["dem_name"]||data["dem_age"]||data["dem_occupation"]) && (
              <div style={{background:PC.s2,borderRadius:10,padding:"10px 14px",marginBottom:14,border:`1px solid ${PC.border}`}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Current Patient</div>
                <div style={{fontWeight:700,color:PC.text,fontSize:"0.88rem"}}>{data["dem_name"]||"—"}</div>
                <div style={{fontSize:"0.72rem",color:PC.muted,marginTop:2}}>
                  {[data["dem_age"]&&`Age ${data["dem_age"]}`,data["dem_occupation"]].filter(Boolean).join(" · ")}
                </div>
              </div>
            )}

            {/* Export */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📤 Export</div>
              <button onClick={exportJSON} style={{width:"100%",padding:"12px",background:"rgba(0,201,122,0.12)",border:`1px solid rgba(0,201,122,0.3)`,borderRadius:10,color:PC.green,fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                ⬇ Download Assessment JSON
              </button>
              <div style={{fontSize:"0.65rem",color:PC.muted,marginTop:5}}>Saves all {completedCount} completed fields. Reload anytime to resume.</div>
            </div>

            {/* Import from file */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:"0.62rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📥 Import</div>
              <button onClick={()=>importRef.current?.click()} style={{width:"100%",padding:"12px",background:"rgba(255,179,0,0.1)",border:`1px solid rgba(255,179,0,0.3)`,borderRadius:10,color:PC.yellow,fontWeight:800,fontSize:"0.8rem",cursor:"pointer",marginBottom:8}}>
                📂 Open Assessment File
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={importFromFile} style={{display:"none"}}/>
              <textarea value={jsonImportText} onChange={e=>setJsonImportText(e.target.value)}
                placeholder='Or paste JSON here...'
                style={{width:"100%",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"monospace",outline:"none",padding:"8px 10px",fontSize:"0.72rem",resize:"vertical",minHeight:80}}/>
              {jsonImportText && (
                <button onClick={importJSON} style={{width:"100%",marginTop:8,padding:"11px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:10,color:"#000",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                  ▶ Load Assessment
                </button>
              )}
            </div>

            <div style={{marginTop:10,padding:"8px 12px",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,fontSize:"0.62rem",color:PC.muted,lineHeight:1.5}}>
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
            {/* Logo mark */}
            <div style={{width:36,height:36,background:`linear-gradient(135deg,${PC.accent}22,${PC.a2}22)`,border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.1rem"}}>⚕</div>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:"clamp(0.85rem,3vw,1.05rem)",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap",lineHeight:1.2}}>PhysioMind</div>
              <div className="pm-logo-sub" style={{fontSize:"0.55rem",color:PC.muted,letterSpacing:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textTransform:"uppercase",fontWeight:600,marginTop:1}}>Clinical Assessment Platform</div>
            </div>
            {/* Live patient chip */}
            {activePatient&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:PC.isDark?"rgba(129,140,248,0.08)":"rgba(79,70,229,0.05)",border:`1px solid ${PC.isDark?"rgba(129,140,248,0.2)":"rgba(79,70,229,0.15)"}`,borderRadius:20,cursor:"pointer"}} onClick={()=>setShowPatientDb(true)}>
                <div style={{width:6,height:6,borderRadius:"50%",background:PC.a3,boxShadow:`0 0 5px ${PC.a3}`}}/>
                <span style={{fontSize:"0.72rem",fontWeight:700,color:PC.a2,whiteSpace:"nowrap"}}>{activePatient.name.length>16?activePatient.name.slice(0,16)+"…":activePatient.name}</span>
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
            {/* Red flag indicator */}
            {hasRedFlags && (
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:urgentFlags.length>0?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.1)",border:`1px solid ${urgentFlags.length>0?"rgba(248,113,113,0.3)":"rgba(251,191,36,0.3)"}`,borderRadius:20}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:urgentFlags.length>0?PC.red:PC.yellow,animation:"pulse 1.5s infinite"}}/>
                <span style={{fontSize:"0.6rem",fontWeight:700,color:urgentFlags.length>0?PC.red:PC.yellow,whiteSpace:"nowrap"}}>{urgentFlags.length>0?"URGENT FLAG":"Flag"}</span>
              </div>
            )}
            <button onClick={()=>setShowPdfReports(true)} title="Generate PDF Reports" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"linear-gradient(135deg,rgba(220,38,38,0.12),rgba(185,28,28,0.08))",border:"1px solid rgba(220,38,38,0.3)",borderRadius:9,color:"#dc2626",fontWeight:800,fontSize:"0.72rem",cursor:"pointer",whiteSpace:"nowrap"}}>
              <span>📄</span><span>Reports</span>
            </button>
            <button onClick={runDx} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#000",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",letterSpacing:"0.3px"}}>
              <span>▶</span><span>Run Diagnosis</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ACTIVE PATIENT BAR ── */}
      {activePatient && (
        <div style={{background:PC.isDark?"rgba(129,140,248,0.05)":"rgba(79,70,229,0.03)",borderBottom:`1px solid ${PC.border}`,padding:"8px 24px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:PC.a3,boxShadow:`0 0 6px ${PC.a3}`}}/>
            <span style={{fontSize:"0.75rem",color:PC.a2,fontWeight:700,letterSpacing:"-0.1px"}}>
              {activePatient.name}
            </span>
          </div>
          {activePatient.data?.dem_age && <span style={{fontSize:"0.65rem",color:PC.muted,fontWeight:500}}>Age {activePatient.data.dem_age}</span>}
          {activePatient.data?.dem_gender && <span style={{fontSize:"0.65rem",color:PC.muted,fontWeight:500}}>{activePatient.data.dem_gender}</span>}
          {activePatient.data?.dem_occupation && <span style={{fontSize:"0.65rem",color:PC.muted,fontWeight:400,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activePatient.data.dem_occupation}</span>}
          <span style={{marginLeft:"auto",fontSize:"0.6rem",color:PC.muted,fontWeight:500,display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:PC.a3,display:"inline-block"}}/>
            Saved {new Date(activePatient.updatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
          </span>
          <button onClick={createNewPatient} style={{padding:"4px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:7,color:PC.text,fontSize:"0.65rem",fontWeight:600,cursor:"pointer"}}>＋ New</button>
          <button onClick={()=>setShowPatientDb(true)} style={{padding:"4px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:7,color:PC.a2,fontSize:"0.65rem",fontWeight:600,cursor:"pointer"}}>Switch Patient</button>
        </div>
      )}
      {!activePatient && (
        <div style={{background:PC.isDark?"rgba(56,189,248,0.03)":"rgba(3,105,161,0.03)",borderBottom:`1px solid ${PC.border}`,padding:"9px 24px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:"0.7rem",color:PC.muted,fontWeight:500}}>No active patient — create or load a patient record to save assessments</span>
          <button onClick={createNewPatient} style={{padding:"5px 14px",background:`linear-gradient(135deg,${PC.accent}18,${PC.a2}12)`,border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:7,color:PC.accent,fontSize:"0.68rem",fontWeight:700,cursor:"pointer"}}>＋ New Patient</button>
          <button onClick={()=>setShowPatientDb(true)} style={{padding:"5px 14px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:7,color:PC.a2,fontSize:"0.68rem",fontWeight:600,cursor:"pointer"}}>Load Patient</button>
        </div>
      )}

      <div className="pm-body" style={{display:"flex",flex:1,maxWidth:1400,margin:"0 auto",width:"100%"}}>

        {/* Desktop Sidebar */}
        <div className="pm-sidebar" style={{width:210,minWidth:210,borderRight:`1px solid ${PC.border}`,padding:"16px 0 10px",background:PC.navBg,position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto"}}>
          <SidebarItems onNav={navTo}/>
        </div>

        {/* Main */}
        <div className="pm-main" style={{flex:1,padding:"28px 32px",overflowY:"auto",overflowX:"hidden",minWidth:0}}>

          {/* Diagnosis Panel */}
          {showDx&&dx&&(
            <div style={{background:PC.surface,border:`1px solid ${PC.accent}30`,borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:"1.05rem",fontWeight:800,color:PC.accent}}>📋 Multi-System Diagnosis Report</div>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:10,background:"rgba(0,229,255,0.1)",color:PC.accent}}>{completedCount} fields · {dx.dx.length} diagnoses</span>
                  <button onClick={()=>setShowDx(false)} style={{background:"none",border:`1px solid ${PC.border}`,color:PC.muted,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:"0.72rem"}}>✕</button>
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
                              <span style={{fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:`${col}20`,color:col}}>{d.system}</span>
                              <span style={{fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:d.confidence==="High"?"rgba(0,201,122,0.15)":"rgba(255,179,0,0.15)",color:d.confidence==="High"?PC.green:PC.yellow}}>{d.confidence}</span>
                            </div>
                            <div style={{fontWeight:700,fontSize:"0.86rem"}}>{i+1}. {d.name}</div>
                          </div>
                          <span style={{color:PC.muted,fontSize:"0.75rem"}}>{exp?"▲":"▼"}</span>
                        </div>
                        {exp&&(
                          <div style={{padding:"0 13px 13px 16px"}}>
                            <div style={{marginBottom:10}}><div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Evidence</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{d.evidence.map((e,j)=><span key={j} style={{fontSize:"0.68rem",padding:"2px 7px",borderRadius:7,background:PC.s3,color:PC.text,border:`1px solid ${PC.border}`}}>✓ {e}</span>)}</div></div>
                            {d.mechanism&&<div style={{marginBottom:10}}><div style={{fontSize:"0.6rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Mechanism</div><div style={{background:PC.s3,borderRadius:8,padding:10,fontSize:"0.76rem",color:PC.text,lineHeight:1.6}}>{d.mechanism}</div></div>}
                            {d.treatment&&d.treatment.length>0&&<div><div style={{fontSize:"0.6rem",fontWeight:700,color:PC.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Treatment Plan</div>{d.treatment.map((t,j)=><div key={j} style={{display:"flex",gap:8,padding:"5px 9px",background:PC.s3,borderRadius:7,marginBottom:4,alignItems:"flex-start"}}><span style={{color:PC.a3,fontWeight:700,flexShrink:0}}>→</span><span style={{fontSize:"0.76rem",color:PC.text,lineHeight:1.5}}>{t}</span></div>)}</div>}
                            {d.interpretation&&<div style={{marginTop:10,padding:"8px 11px",background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",borderRadius:8,fontSize:"0.68rem",color:PC.yellow,lineHeight:1.5}}>⚠ {d.interpretation}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dx.fmsTotal!==null&&(
                    <div style={{marginTop:10,padding:12,background:PC.s2,borderRadius:8,border:`1px solid ${PC.border}`,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{textAlign:"center",minWidth:55}}><div style={{fontSize:"1.8rem",fontWeight:800,color:dx.fmsTotal>=17?PC.green:dx.fmsTotal>=15?PC.yellow:PC.red}}>{dx.fmsTotal}</div><div style={{fontSize:"0.58rem",color:PC.muted}}>FMS/21</div></div>
                      <div style={{fontSize:"0.76rem",color:PC.muted}}>{dx.fmsTotal>=17?"✅ Low risk":dx.fmsTotal>=15?"⚠️ Moderate risk — corrective exercises":"🔴 High risk — corrective exercises before loading"}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Dashboard metrics — shown on Subjective (home) tab */}
          {active==="subjective"&&(
            <div style={{marginBottom:32}}>
              {/* Welcome / patient context */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:"clamp(1.1rem,3.5vw,1.5rem)",fontWeight:800,letterSpacing:"-0.5px",color:PC.text,lineHeight:1.2,marginBottom:4}}>
                  {activePatient?`${activePatient.name}`:"Clinical Assessment"}
                </div>
                <div style={{fontSize:"0.78rem",color:PC.muted,fontWeight:500}}>
                  {activePatient&&activePatient.data?.dem_age?`${activePatient.data.dem_age} yrs · `:""}
                  {activePatient&&activePatient.data?.dem_gender?`${activePatient.data.dem_gender} · `:""}
                  {activePatient&&activePatient.data?.dem_occupation?activePatient.data.dem_occupation:"Start by entering patient details below"}
                </div>
              </div>
              {/* Metric cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:16}}>
                {[
                  { label:"Fields Completed", value:completedCount||"—", unit:"", color:PC.accent, icon:"📋", show:true },
                  { label:"Active Patients", value:patients.length||"—", unit:"", color:PC.a3, icon:"👥", show:true },
                  { label:"Exercises Prescribed", value:Array.isArray(data?.hep_programme)&&data.hep_programme.length>0?data.hep_programme.length:null, unit:"", color:PC.a2, icon:"🏋", show:Array.isArray(data?.hep_programme)&&data.hep_programme.length>0 },
                  { label:"Session", value:Array.isArray(data?.tx_sessions)&&data.tx_sessions.length>0?data.tx_sessions.length:null, unit:Array.isArray(data?.tx_sessions)&&data.tx_sessions.length===1?" recorded":" recorded", color:PC.a4, icon:"📅", show:Array.isArray(data?.tx_sessions)&&data.tx_sessions.length>0 },
                  { label:"Pain Level", value:data?.sub_vas?`${data.sub_vas}/10`:null, unit:"", color:data?.sub_vas>=7?PC.red:data?.sub_vas>=4?PC.yellow:PC.green, icon:"⚡", show:!!data?.sub_vas },
                  { label:"Red Flags", value:hasRedFlags?(urgentFlags.length>0?"⚠ Urgent":"⚠ Present"):"Clear", unit:"", color:hasRedFlags?(urgentFlags.length>0?PC.red:PC.yellow):PC.green, icon:hasRedFlags?"🚨":"✅", show:true },
                ].filter(m=>m.show).map((m,i)=>(
                  <div key={i} style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:12,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${m.color},${m.color}40)`}}/>
                    <div style={{fontSize:"1.4rem",marginBottom:8,lineHeight:1}}>{m.icon}</div>
                    <div style={{fontSize:"clamp(1.2rem,4vw,1.7rem)",fontWeight:800,letterSpacing:"-0.5px",color:m.color,lineHeight:1,marginBottom:4}}>{m.value}{m.unit}</div>
                    <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.7px",textTransform:"uppercase",color:PC.muted}}>{m.label}</div>
                  </div>
                ))}
              </div>
              {/* Subtle divider */}
              <div style={{height:"1px",background:`linear-gradient(90deg,${PC.accent}30,${PC.border},transparent)`,marginBottom:8}}/>
            </div>
          )}

          {/* Section header */}
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <div style={{width:38,height:38,background:PC.isDark?`linear-gradient(135deg,${PC.accent}15,${PC.a2}10)`:`linear-gradient(135deg,${PC.accent}10,${PC.a2}08)`,border:`1px solid ${PC.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{currentSection.icon}</div>
              <div>
                <div style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,letterSpacing:"-0.3px",color:PC.text,lineHeight:1.1}}>{currentSection.label}</div>
                <div style={{fontSize:"0.62rem",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",color:PC.muted,marginTop:2}}>{currentSection.desc||"Clinical Assessment"}</div>
              </div>
            </div>
            <div style={{height:"1px",background:`linear-gradient(90deg,${PC.accent}50,${PC.a2}30,transparent)`}}/>
          </div>

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
          {Object.entries(currentSection.groups).map(([groupName,tests])=>(
            <div key={groupName} style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{fontSize:"0.62rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.4px",color:PC.a2,whiteSpace:"nowrap"}}>{groupName}</div>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${PC.border},transparent)`}}/>
              </div>

              {tests==="HOME_MODULE"?(
                <HomeModule onNav={navTo}/>
              ):tests==="DASHBOARD_MODULE"?(
                <TherapistDashboardModule patients={patients} data={data} onNav={navTo}/>
              ):tests==="SUBJECTIVE_MODULE"?(
                <SubjectiveModule data={data} set={set}/>
              ):tests==="PALPATION_MODULE"?(
                <PalpationModule data={data} set={set}/>
              ):tests==="POSTURE_DEFECT_MODULE"?(
                <PostureDefectModule/>
              ):tests==="CYRIAX_MODULE"?(
                <CyriaxModule data={data} set={set}/>
              ):tests==="SPECIAL_TESTS_MODULE"?(
                <SpecialTestsSection data={data} set={set}/>
              ):tests==="NKT_REGION"?(
                <NKTSection data={data} set={set}/>
              ):tests==="FMA_REGION"?(
                <FMASection data={data} set={set}/>
              ):tests==="FASCIA_REGION"?(
                <FasciaSection data={data} set={set}/>
              ):tests==="KC_REGION"?(
                <KineticChainSection data={data} set={set}/>
              ):tests==="CYRIAX_REGION"?(
                <CyriaxRegionTests data={data} set={set}/>
              ):tests==="NEURO_MODULE"?(
                <NeurologicalModule data={data} set={set}/>
              ):tests==="GAIT_MODULE"?(
                <GaitModule data={data} set={set}/>
              ):tests==="MMT_MODULE"?(
                <MMTModule data={data} set={set}/>
              ):tests==="ROM_MODULE"?(
                <ROMModule data={data} set={set}/>
              ):tests==="OUTCOME_MODULE"?(
                <OutcomeMeasuresModule/>
              ):tests==="EXERCISE_MODULE"?(
                <ExercisePrescriptionModule data={data} set={set}/>
              ):tests==="TX_TECHNIQUES_MODULE"?(
                <TreatmentTechniquesModule data={data} set={set}/>
              ):tests==="TX_SESSION_MODULE"?(
                <TreatmentSessionLogModule data={data} set={set}/>
              ):tests==="SOAP_MODULE"?(
                <SOAPNoteModule data={data}/>
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
                            {hasVal&&<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,background:PC.a3+"22",borderRadius:"50%",marginLeft:7,fontSize:"0.55rem",color:PC.a3,fontWeight:800,verticalAlign:"middle"}}>✓</span>}
                          </label>
                          {hasInfo&&<button type="button" onClick={()=>setInfoModal(t)} style={{padding:"3px 10px",background:PC.isDark?"rgba(129,140,248,0.1)":"rgba(79,70,229,0.06)",border:`1px solid ${PC.a2}30`,borderRadius:7,color:PC.a2,fontSize:"0.62rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.2px"}}>ℹ Info</button>}
                        </div>
                        <Field t={t}/>
                        {hasVal&&t.sig&&(
                          <div style={{marginTop:10,padding:"9px 12px",background:PC.accentSoft||"rgba(56,189,248,0.06)",border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:8,fontSize:"0.68rem",color:PC.text,lineHeight:1.6,opacity:0.9}}>
                            <span style={{fontWeight:700,color:PC.accent,marginRight:5,fontSize:"0.65rem",letterSpacing:"0.3px"}}>⚕ CLINICAL</span>{t.sig}
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

      {/* ── BOTTOM NAV DRAWER (mobile) ── */}
      {/* Pull handle — always visible, toggles whole drawer */}
      <button
        className={`pm-bnav-handle${bnavHidden?" bnav-hidden":""}`}
        style={{ bottom: bnavHidden ? 0 : (bnavTab ? "calc(62px + 220px)" : "62px") }}
        onClick={()=>{ setBnavHidden(h=>!h); if(!bnavHidden) setBnavTab(null); }}
        aria-label={bnavHidden?"Show navigation":"Hide navigation"}
      >
        <span className="pm-bnav-handle-label">Nav</span>
        <span className="pm-bnav-handle-arrow">▾</span>
      </button>

      <nav className={`pm-bnav${bnavHidden?" bnav-hidden":""}`} aria-label="Section navigation">

        {/* ── Expandable sub-panel ── */}
        {(()=>{
          const assessKeys=["subjective","posture","palpation","rom","mmt","fma","special","neuro","gait","outcome"];
          const advKeys=["cyriax_full","kinetic","nkt","fascia"];
          const treatKeys=["exercise","tx_techniques"];
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
                <BnavItem navKey="subjective"  icon="📝" label="Subjective Assessment"/>
                <BnavItem navKey="posture"     icon="🧍" label="Observation & Posture"/>
                <BnavItem navKey="palpation"   icon="🖐️" label="Palpation"/>
                <BnavItem navKey="rom"         icon="📐" label="Range of Motion"/>
                <BnavItem navKey="mmt"         icon="💪" label="MMT"/>
                <BnavItem navKey="fma"         icon="🏃" label="Functional Assessment"/>
                <BnavItem navKey="special"     icon="🔬" label="Special Tests (100+)"/>
                <BnavItem navKey="neuro"       icon="⚡" label="Neurological"/>
                <BnavItem navKey="gait"        icon="🚶" label="Gait Analysis"/>
                <BnavItem navKey="outcome"     icon="📈" label="Outcome Measures"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="advanced"?" open":""}`}>
                <BnavItem navKey="cyriax_full" icon="🦴" label="Cyriax"/>
                <BnavItem navKey="kinetic"     icon="⛓️" label="Kinetic Chain"/>
                <BnavItem navKey="nkt"         icon="🧠" label="NKT"/>
                <BnavItem navKey="fascia"      icon="🕸️" label="Fascia Integration"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="treatment"?" open":""}`}>
                <BnavItem navKey="exercise"      icon="🏋" label="Exercise Prescription"/>
                <BnavItem navKey="tx_techniques" icon="🤲" label="Tx Techniques"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="documentation"?" open":""}`}>
                <BnavItem navKey="tx_sessions" icon="📅" label="Session Log"/>
                <BnavItem navKey="soap"        icon="🤖" label="SOAP + AI"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="top"?" open":""}`}>
                <BnavItem navKey="home"      icon="🏠" label="Home"/>
                <BnavItem navKey="dashboard" icon="📊" label="Dashboard"/>
                <button className="pm-bnav-dx" onClick={()=>{ runDx(); setBnavTab(null); }}>▶ Run Diagnosis</button>
              </div>
            </>
          );
        })()}

        {/* ── Tab strip ── */}
        <div className="pm-bnav-tabs">
          {(()=>{
            const assessKeys=["subjective","posture","palpation","rom","mmt","fma","special","neuro","gait","outcome"];
            const advKeys=["cyriax_full","kinetic","nkt","fascia"];
            const treatKeys=["exercise","tx_techniques"];
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
                <TabBtn id="assessment"    icon="🩺" label="Assess"  matchKeys={assessKeys}/>
                <TabBtn id="advanced"      icon="🔭" label="Adv."    matchKeys={advKeys}/>
                <TabBtn id="treatment"     icon="💊" label="Treat"   matchKeys={treatKeys}/>
                <TabBtn id="documentation" icon="📋" label="Docs"    matchKeys={docKeys}/>
              </>
            );
          })()}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}

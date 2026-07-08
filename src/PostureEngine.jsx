// PostureEngine.jsx — Camera, pose analysis, posture scoring, overlay drawing
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState, useCallback, useRef, useEffect, useMemo, Component } from "react";
import { createPortal } from "react-dom";
import { r1, r2, mid, vis, px, MIN_VIS, CLINICAL_MIN_VIS, calcAngleDeg, C } from "./utils.jsx";
import { runViTPoseLateral, warmupViTPose } from "./vitposeEngine";
import { analyzeSagittalContour, warmupContourEngine } from "./contourEngine";
import { buildSagittalFindings, isDeprecatedLateralFinding } from "./sagittalFindings";
import HybridKendall from "./HybridKendall";
// ─── Constants ────────────────────────────────────────────────────────────────
const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],   // shoulders + arms
  [15,17],[15,19],[15,21],[17,19],            // left hand
  [16,18],[16,20],[16,22],[18,20],            // right hand
  [11,23],[12,24],[23,24],                    // torso
  [23,25],[25,27],[27,29],[29,31],[27,31],   // left leg
  [24,26],[26,28],[28,30],[30,32],[28,32],   // right leg
];
// ─── CanvasOverlayOnImage — draws analysis overlay directly on top of img ─────
// Fallback approach: instead of baking into canvas (fails on mobile with large images),
// overlay a transparent canvas positioned absolutely on top of the photo
function CanvasOverlayOnImage({ photoUrl, landmarks, view, measurements: propMeasurements, manualPlaced, manualPointDefs, manualConnections, imgId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!landmarks || !landmarks.length) return;
    const canvas = canvasRef.current;
    const imgEl = document.getElementById(imgId || "posture-upload-img");
    if (!canvas || !imgEl) return;

    const drawWhenReady = () => {
      const rect = imgEl.getBoundingClientRect();
      const W = imgEl.naturalWidth || rect.width;
      const H = imgEl.naturalHeight || rect.height;
      if (!W || !H) return;

      canvas.width = W;
      canvas.height = H;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);

      const viewMap = {
        anterior:"anterior", posterior:"posterior",
        left:"left", right:"right", frontal:"anterior", sagittal:"left",
      };
      const mappedView = viewMap[String(view || "anterior").toLowerCase()] || "anterior";

      // Use provided measurements, or compute fresh from landmarks via the
      // single live engine (measureLandmarks) — never the retired dead engine,
      // so overlays and findings always come from the same source.
      const m = propMeasurements
        || (() => { try { return measureLandmarks(landmarks, null, mappedView); } catch { return {}; } })();

      try {
        drawOverlay({ ctx, W, H, lm: landmarks, view: mappedView, showGrid: true, measurements: m, clearFirst: true });
      } catch(e) {
        console.warn("CanvasOverlayOnImage drawOverlay failed:", e);
      }

      // Draw manual landmark dots on top if provided
      if (manualPlaced && manualPointDefs) {
        try {
          drawManualOverlay({ ctx, W, H, placed: manualPlaced, pointDefs: manualPointDefs, connections: manualConnections || [] });
        } catch(e) {}
      }
    };

    const timer = setTimeout(drawWhenReady, 80);
    return () => clearTimeout(timer);
  }, [landmarks, view, photoUrl, propMeasurements, manualPlaced]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0,
        pointerEvents: "none",
      }}
    />
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

// ─── Posterior view manual landmarks ────────────────────────────────────────
// Reference: Magee 6th ed. Ch.15 (postural assessment), Kendall 5th ed. Ch.5
// Landmarks visible/assessable from posterior view only.
// Note: C7, PSIS, Iliac Crest, Scapular angles are not in MediaPipe's 33-point model.
// Use hip landmarks (lm23/24) as PSIS proxies for pelvic obliquity.
const MANUAL_POINTS_POSTERIOR = [
  { id:0,  label:"Head Top",             mpIdx:0,  desc:"Top of skull — vertical alignment reference" },
  { id:1,  label:"L Ear",                mpIdx:7,  desc:"Left ear tragus — head tilt reference (Magee)" },
  { id:2,  label:"R Ear",                mpIdx:8,  desc:"Right ear tragus — head tilt reference (Magee)" },
  { id:3,  label:"L Acromion",           mpIdx:11, desc:"Left acromion tip — shoulder level (Magee p.597)" },
  { id:4,  label:"R Acromion",           mpIdx:12, desc:"Right acromion tip — shoulder level (Magee p.597)" },
  { id:5,  label:"L Elbow",              mpIdx:13, desc:"Left olecranon — arm carry angle" },
  { id:6,  label:"R Elbow",              mpIdx:14, desc:"Right olecranon — arm carry angle" },
  { id:7,  label:"L Iliac Crest / PSIS", mpIdx:23, desc:"Left posterior iliac crest / PSIS region — pelvic obliquity proxy (Magee p.598)" },
  { id:8,  label:"R Iliac Crest / PSIS", mpIdx:24, desc:"Right posterior iliac crest / PSIS region — pelvic obliquity proxy (Magee p.598)" },
  { id:9,  label:"L Popliteal Crease",   mpIdx:25, desc:"Left popliteal crease — knee level, LLD screen (Woerman 1984)" },
  { id:10, label:"R Popliteal Crease",   mpIdx:26, desc:"Right popliteal crease — knee level, LLD screen (Woerman 1984)" },
  { id:11, label:"L Medial Malleolus",   mpIdx:27, desc:"Left medial malleolus — ankle level, LLD assessment" },
  { id:12, label:"R Medial Malleolus",   mpIdx:28, desc:"Right medial malleolus — ankle level, LLD assessment" },
  { id:13, label:"L Heel Centre",        mpIdx:29, desc:"Left heel midpoint — calcaneal alignment, rearfoot valgus/varus (Magee Ch.13)" },
  { id:14, label:"R Heel Centre",        mpIdx:30, desc:"Right heel midpoint — calcaneal alignment, rearfoot valgus/varus (Magee Ch.13)" },
];

// Posterior skeleton connections — clinically meaningful lines from back
const MANUAL_CONNECTIONS_POSTERIOR = [
  [1,2],   // ear level
  [3,4],   // shoulder level
  [5,6],   // elbow level
  [7,8],   // pelvic / PSIS level
  [9,10],  // popliteal crease level
  [11,12], // ankle level
  [13,14], // heel level
  [3,5],[4,6],   // shoulder to elbow
  [3,7],[4,8],   // shoulder to hip (trunk line)
  [7,9],[8,10],  // hip to knee
  [9,11],[10,12],// knee to ankle
  [11,13],[12,14],// ankle to heel
];

const AI_SAG_5_POINTS = [
  { id:"ear",      label:"Ear",      mpIdx:7,  desc:"Ear tragus",          color:"#00e5ff" },
  { id:"shoulder", label:"Shoulder", mpIdx:11, desc:"Acromion",            color:"#a78bfa" },
  { id:"hip",      label:"Hip",      mpIdx:23, desc:"Greater trochanter",  color:"#f59e0b" },
  { id:"knee",     label:"Knee",     mpIdx:25, desc:"Lateral knee joint",  color:"#34d399" },
  { id:"ankle",    label:"Ankle",    mpIdx:27, desc:"Lateral malleolus",   color:"#f87171" },
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
function measureLandmarks(lm, calibration, view="anterior") {
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
  const trunkLateralShift  = shMid&&(ankleMid||hipMid)?r1((shMid.x-(ankleMid||hipMid).x)*100):null;
  const weightBearingShift = hipMid&&footMid?r1((hipMid.x-footMid.x)*100):null;
  const spinalDeviation    = V(0)&&hipMid?r1((g(0).x-hipMid.x)*100):null;
  const waistAsymmetry     = Vb(11,13)&&Vb(12,14)?r1(Math.abs(Math.abs(g(13).x-g(11).x)-Math.abs(g(14).x-g(12).x))*100):null;

  // ══════════════════════════════════════════════════════════════════════════
  // SAGITTAL ANALYSIS ENGINE v2 (Kendall / Janda / Sahrmann)
  // ──────────────────────────────────────────────────────────────────────────
  // Uses a true 5-point sagittal plumb line: ear→acromion→GT→knee→malleolus.
  // For lateral view: landmark 7 (L ear) or 8 (R ear) is visible — not the
  // bilateral midpoint. We use whichever ear is more visible.
  //
  // CM thresholds (Kendall 2005 / clinical norms):
  //   Ear vs acromion:      >2cm anterior = FHP
  //   Acromion vs GT:       >2cm anterior = rounded shoulder tendency
  //   GT vs ankle plumb:    >2cm = global alignment shift
  //   Knee deviation:       >1.5cm posterior = recurvatum tendency
  //
  // When pixPerCm is unavailable, normalised image-fraction units are used
  // with scaled thresholds. Confidence is penalised accordingly.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Sagittal-specific landmark selection ────────────────────────────────────
  // Use the more visible ear (left view = lm[7], right view = lm[8])
  const earL  = g(7), earR  = g(8);
  const earVis = (earL?.visibility||0) >= MIN_VIS || (earR?.visibility||0) >= MIN_VIS;
  // Prefer the ear with higher visibility; both may be visible in a profile shot
  const sagEar = ((earL?.visibility||0) >= (earR?.visibility||0)) ? earL : earR;
  const sagEarVis = (sagEar?.visibility||0) >= MIN_VIS;

  // Shoulder: for true lateral view use the nearer shoulder (more visible)
  const shL = g(11), shR = g(12);
  const sagSh = ((shL?.visibility||0) >= (shR?.visibility||0)) ? shL : shR;
  const sagShVis = (sagSh?.visibility||0) >= MIN_VIS;

  // Greater trochanter proxy: use whichever hip is more visible
  const hipL = g(23), hipR = g(24);
  const sagHip = ((hipL?.visibility||0) >= (hipR?.visibility||0)) ? hipL : hipR;
  const sagHipVis = (sagHip?.visibility||0) >= MIN_VIS;

  // Knee (lateral view): one knee visible
  const kneeL = g(25), kneeR = g(26);
  const sagKnee = ((kneeL?.visibility||0) >= (kneeR?.visibility||0)) ? kneeL : kneeR;
  const sagKneeVis = (sagKnee?.visibility||0) >= MIN_VIS;

  // Lateral malleolus proxy: ankle
  const ankleL = g(27), ankleR = g(28);
  const sagAnkle = ((ankleL?.visibility||0) >= (ankleR?.visibility||0)) ? ankleL : ankleR;
  const sagAnkleVis = (sagAnkle?.visibility||0) >= MIN_VIS;

  // Heel
  const heelL = g(29), heelR = g(30);
  const sagHeel = ((heelL?.visibility||0) >= (heelR?.visibility||0)) ? heelL : heelR;
  const sagHeelVis = (sagHeel?.visibility||0) >= MIN_VIS;

  // ── Sagittal plumb reference: anchor at lateral malleolus ─────────────────
  // Clinical standard (Kendall): plumb line passes through the lateral malleolus
  // vertically. Positive deviation = anterior to plumb (forward).
  const plumbX = sagAnkleVis ? sagAnkle.x : (sagHeelVis ? sagHeel.x : 0.5);

  // viewSign: auto-detected from nose vs shoulder position.
  // If nose is LEFT of shoulder → face points left → anterior = left = smaller x → viewSign = -1
  // If nose is RIGHT of shoulder → face points right → anterior = right = larger x → viewSign = +1
  // This handles both selfie/standard orientation and any camera flip automatically.
  const noseX = (g(0)?.visibility||0) >= 0.3 ? g(0).x : null;
  const viewSign = noseX !== null && sagShVis
    ? (noseX < sagSh.x ? -1 : 1)
    : (view === "right" ? -1 : 1); // fallback to manual if nose not detected

  // ── Convert normalised x-deviation to estimated cm ─────────────────────────
  // If pixPerCm is available from height calibration, use it.
  // Otherwise estimate from image height: typical standing person in frame ~170cm
  const estPxPerCm = pixPerCm ? pixPerCm : (imgH ? imgH / 170 : null);

  // devCm: deviation in cm from plumb (positive = anterior)
  // Normalised x coords: deviation in image-fraction units × imgH / estPxPerCm
  const devCm = (normX) => {
    if (normX === null || normX === undefined) return null;
    // Apply viewSign: positive = anterior regardless of which side patient faces
    if (estPxPerCm && imgH) return r1((normX - plumbX) * imgH / estPxPerCm * viewSign);
    return r1((normX - plumbX) * 170 * viewSign);
  };

  // ── 5-point plumb line deviations ─────────────────────────────────────────
  const plumb = {
    ear:     sagEarVis   ? devCm(sagEar.x)   : null, // + = anterior (FHP)
    shoulder:sagShVis    ? devCm(sagSh.x)    : null, // + = anterior (rounded sh)
    hip:     sagHipVis   ? devCm(sagHip.x)   : null, // + = anterior (APT) / - = posterior (PPT)
    knee:    sagKneeVis  ? devCm(sagKnee.x)  : null, // - = posterior (recurvatum)
    ankle:   0,                                       // reference = 0 by definition
  };

  // ── Sagittal confidence score ─────────────────────────────────────────────
  // Based on how many of the 5 chain points are visible + image alignment
  const sagVisPoints = [sagEarVis, sagShVis, sagHipVis, sagKneeVis, sagAnkleVis].filter(Boolean).length;
  // Penalise if using bilateral midpoints (frontal, not lateral view)
  const isTrueLateral = sagVisPoints >= 3;
  const sagConfidenceBase = Math.round((sagVisPoints / 5) * 100);
  // Reduce confidence if no calibration (cm values are estimates)
  const sagConfidencePenalty = pixPerCm ? 0 : 10;
  const sagConfidence = clamp(sagConfidenceBase - sagConfidencePenalty, 0, 100);

  // ── 1. CVA — Craniovertebral Angle ─────────────────────────────────────────
  // Clinical: angle between horizontal and line from C7 (acromion proxy) to ear.
  // Normal: >55° (Yip et al. 2008). Mild FHP: 48–52°. Moderate: 44–48°. Severe: <44°.
  // (Neiva et al. 2009; Ruivo et al. 2017)
  // CVA is ONLY valid in lateral (sagittal) view.
  // In frontal/posterior view the ear-shoulder horizontal distance is ambiguous
  // and produces impossibly low values (e.g. 15°) that mislead clinicians.
  let cvaAngle = null;
  const isLateralView = view === "left" || view === "right";
  if (isLateralView && sagEarVis && sagShVis) {
    const dx = Math.abs(sagEar.x - sagSh.x);
    const dy = Math.abs(sagEar.y - sagSh.y);
    if (dy > 0.03 && dx > 0.01) {
      const rawCva = Math.atan2(dy, dx) * 180 / Math.PI;
      // Clinically plausible CVA: 30–80°. <30° = head parallel to floor (impossible standing).
      // Also require meaningful horizontal offset (dx/dy > 0.25) to reject noise.
      if (rawCva >= 30 && rawCva <= 80 && (dx / (dy + 0.001)) > 0.25) {
        cvaAngle = r1(clamp(rawCva, 30, 80));
      }
    }
  }

  // ── 2. FHP metrics ─────────────────────────────────────────────────────────
  // fhpNorm: retained for backward compatibility (% image width)
  const shoulderWidthPx = shMid && Vb(11,12) ? dist2D(g(11),g(12)) : null;
  const fhpNorm = sagEarVis && sagShVis ? r1((sagEar.x - sagSh.x) * 100 * viewSign) : null;

  // fhpCm: ear deviation from shoulder in cm (clinical plumb line method)
  // Positive = ear anterior to acromion
  // fhpDevCm: ear anterior to acromion in cm. Clamped to 15cm max (clinically impossible beyond that).
  const fhpDevCm = plumb.ear !== null && plumb.shoulder !== null
    ? r1(clamp(plumb.ear - plumb.shoulder, -15, 15)) : null;

  // Cervical load estimate (proxy model — NOT estimated cervical extensor load (proxy — not a validated estimated cervical load proxy formula) formula; estimated cervical load proxy uses neck flexion angle)
  // Formula: baseline 4.5kg + 1.08kg per cm FHP. Each 2.5cm FHP ≈ +2.7kg.
  let cervicalLoadKg = null;
  if (fhpDevCm !== null && fhpDevCm > 0 && cvaAngle !== null && cvaAngle < 55) {
    cervicalLoadKg = r1(clamp(4.5 + fhpDevCm * 1.08, 4.5, 32));
  }

  // ── 3. Thoracic kyphosis proxy — REMOVED ────────────────────────────────────
  // Trunk-lean proxy (32 + rawAngle × 1.8) deleted. TCI replaces it.
  const thoracicAngle = null;
  // thoracicAngle proxy deleted — trunk lean ≠ thoracic curvature
  // TCI is computed in sagittalFindings.js from body contour instead

  // ── 4. Trunk lean (global sagittal alignment) ──────────────────────────────
  // Shoulder vs ankle horizontal: positive = shoulder anterior to ankle
  const trunkSagLean = sagShVis && sagAnkleVis
    ? r1((sagSh.x - sagAnkle.x) * 100) : null;

  // ── 5. Pelvic position — sagittal ──────────────────────────────────────────
  // Hip (GT) vs plumb line: anterior = APT tendency, posterior = PPT tendency.
  // Lumbar proxy: retain original for backward compatibility
  let lumbarProxy = null;
  if (hipMid && kneeMid && heelMid) lumbarProxy = r1((hipMid.x - (kneeMid.x + heelMid.x) / 2) * 100 * viewSign);

  // sagPelvicShift: true plumb line pelvic deviation in cm (+ = anterior)
  const sagPelvicShift = plumb.hip; // already in cm from plumb

  // ── 6. Hip position vs ankle plumb ─────────────────────────────────────────
  const hipExtensionProxy = hipMid && ankleMid ? r1((hipMid.x - ankleMid.x) * 100 * viewSign) : null;

  // sagHipShift: hip in cm vs plumb (+ = anterior, - = posterior / sway-back pattern)
  const sagHipShift = plumb.hip;

  // ── 7. Shoulder position vs plumb ──────────────────────────────────────────
  // Positive = shoulder anterior to ankle plumb = rounded shoulder tendency
  const sagShoulderShift = plumb.shoulder;

  // ── 8. Knee sagittal position ───────────────────────────────────────────────
  // Knee anterior to plumb: genu flexum tendency
  // Knee posterior to plumb: genu recurvatum tendency (negative value)
  const sagKneeShift = plumb.knee;

  // ── 9. Sagittal chain deviations summary (new structured format) ───────────
  // Each segment relative to plumb (cm). Positive = anterior.
  const sagChain = {
    earCm:      plumb.ear,
    shoulderCm: plumb.shoulder,
    hipCm:      plumb.hip,
    kneeCm:     plumb.knee,
    confidence: sagConfidence,
    isTrueLateral,
  };

  // ── Backward-compatible vars ────────────────────────────────────────────────
  // These feed into the existing buildFindings thresholds
  // Re-express plumb deviations as % for backward compatibility where needed
  const fhpFromPlumb = fhpDevCm; // ear vs shoulder in cm (+ = FHP)

  // Knees
  const leftKneeAngle  = Vb(23,25,27)?vec3Angle(g(23),g(25),g(27)):null;
  const rightKneeAngle = Vb(24,26,28)?vec3Angle(g(24),g(26),g(28)):null;
  const leftKneeDev    = leftKneeAngle!==null?r1(leftKneeAngle-180):null;
  const rightKneeDev   = rightKneeAngle!==null?r1(rightKneeAngle-180):null;
  const _kfd2=(hip,knee,ankle,isLeft)=>{
    if(!hip||!knee||!ankle||Math.abs(ankle.y-hip.y)<0.01) return null;
    const t=(knee.y-hip.y)/(ankle.y-hip.y), lineX=hip.x+t*(ankle.x-hip.x);
    const devX=isLeft?(lineX-knee.x):(knee.x-lineX);
    const legLen=Math.sqrt(Math.pow(ankle.x-hip.x,2)+Math.pow(ankle.y-hip.y,2))||0.01;
    const a=Math.atan2(Math.abs(devX),legLen)*180/Math.PI;
    return r1(devX>=0?a:-a);
  };
  const leftKneeFrontal  = Vb(23,25,27)?_kfd2(g(23),g(25),g(27),true):null;
  const rightKneeFrontal = Vb(24,26,28)?_kfd2(g(24),g(26),g(28),false):null;

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
    [Math.abs(pelvisAngle||0),      4,  10, 1.2],  // P0-1: normal <4° (healthy-population norm)
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
  // PLI (Postural Load Index): composite screening score — 0-100.
  // NOTE: cobbEstimate is an in-house proxy (not validated Cobb angle) and may inflate PLI.
  // Use as a screening trend indicator only, not a standalone clinical score.
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

  // ── MODULE F4: SHOULDER HEIGHT ASYMMETRY ─────────────────────────────────────
  const f4 = (() => {
    if (!Vb(11,12)) return null;
    const lVis = lm[11]?.visibility||0, rVis = lm[12]?.visibility||0;
    const baseConf = (lVis+rVis)/2;
    const eyeTiltDeg = Vb(2,5)
      ? Math.abs(Math.atan2(Math.abs(g(5).y-g(2).y), Math.abs(g(5).x-g(2).x))*180/Math.PI) : 0;
    const camTiltPenalty = Math.min(0.20, eyeTiltDeg/20);
    const hasZ4 = lm[11]?.z !== undefined;
    const zDiff4 = hasZ4 ? Math.abs((lm[11].z||0)-(lm[12].z||0)) : 0;
    const rotPenalty4 = Math.min(0.20, zDiff4*2.5);
    const minVis4 = Math.min(lVis, rVis);
    const occlusionPenalty = minVis4 < 0.6 ? 0.15 : minVis4 < 0.75 ? 0.08 : 0;
    const confidence4 = Math.max(0, Math.min(1, baseConf - camTiltPenalty - rotPenalty4 - occlusionPenalty));
    if (confidence4 < 0.45) return { suppressed:true, reason:"Insufficient shoulder landmark confidence", confidence:r1(confidence4*100) };
    const dx4 = Math.abs(g(11).x - g(12).x);
    const dy4 = Math.abs(g(11).y - g(12).y);
    const angleDeg4 = dx4 > 0.01 ? r2(Math.atan(dy4/dx4)*180/Math.PI) : 0;
    const heightDiffPct4 = r2(dy4*100);
    const elevatedSide4 = g(11).y < g(12).y ? "Left" : g(12).y < g(11).y ? "Right" : null;
    // P0-1: bands raised (Normal <3°, Mild 3–5, Moderate 5–7, Significant >7)
    // so slight shoulder asymmetry (normal per photographic-posture evidence) is
    // not reported as a finding.
    let sev4, sevCode4;
    if      (angleDeg4 < 3.0) { sev4="Normal";      sevCode4=0; }
    else if (angleDeg4 < 5.0) { sev4="Mild";        sevCode4=1; }
    else if (angleDeg4 < 7.0) { sev4="Moderate";    sevCode4=2; }
    else                      { sev4="Significant";  sevCode4=3; }
    const conf4 = r1(confidence4*100);
    const rel4 = conf4>=90?"Excellent":conf4>=75?"Good":conf4>=60?"Fair":"Low reliability";
    return {
      suppressed:false, elevatedSide:elevatedSide4, angleDeg:angleDeg4, heightDiffPct:heightDiffPct4,
      severity:sev4, severityCode:sevCode4, confidence:conf4, reliabilityLabel:rel4,
      finding: sevCode4===0 ? "Shoulder heights appear level"
        : `${elevatedSide4||"Shoulder"} shoulder elevated — ${sev4.toLowerCase()} asymmetry (${angleDeg4.toFixed(1)}°)`,
      measurement: `Angle: ${angleDeg4.toFixed(1)}°, Height diff: ${heightDiffPct4.toFixed(1)}% frame`,
      clinicalCorrelation: sevCode4===0 ? "No clinically meaningful shoulder height asymmetry detected"
        : "May indicate asymmetrical shoulder girdle positioning. May be associated with habitual postural adaptation. Findings should be confirmed clinically.",
      functionalRelevance: sevCode4===0 ? null
        : sevCode4===1 ? "Mild asymmetry — may be within functional range; reassess under load"
        : sevCode4===2 ? "Moderate shoulder asymmetry — may be associated with altered scapular mechanics or cervicothoracic adaptation"
        : "Significant shoulder asymmetry — warrants clinical assessment of scapular positioning and cervical ROM",
      suggestedNext: sevCode4===0 ? ["Reassess under load if clinically indicated"]
        : ["Cervical ROM assessment","Scapular assessment","Upper quarter screen","Functional reach test"],
    };
  })();

  // ── MODULE F7: TRUNK SHIFT ────────────────────────────────────────────────────
  const f7 = (() => {
    if (!shMid || !hipMid) return null;
    const shVis7 = ((lm[11]?.visibility||0)+(lm[12]?.visibility||0))/2;
    const hipVis7 = ((lm[23]?.visibility||0)+(lm[24]?.visibility||0))/2;
    const baseConf7 = (shVis7+hipVis7)/2;
    const eyeTiltDeg7 = Vb(2,5)
      ? Math.abs(Math.atan2(Math.abs(g(5).y-g(2).y), Math.abs(g(5).x-g(2).x))*180/Math.PI) : 0;
    const camTiltPenalty7 = Math.min(0.20, eyeTiltDeg7/15);
    const hasZ7 = lm[23]?.z !== undefined;
    const pelvisZdiff7 = hasZ7 ? Math.abs((lm[23].z||0)-(lm[24].z||0)) : 0;
    const pelvisRotPenalty7 = Math.min(0.15, pelvisZdiff7*2.0);
    const shZdiff7 = (lm[11]?.z!==undefined) ? Math.abs((lm[11].z||0)-(lm[12].z||0)) : 0;
    const subjectRotPenalty7 = Math.min(0.15, shZdiff7*2.0);
    const confidence7 = Math.max(0, Math.min(1, baseConf7 - camTiltPenalty7 - pelvisRotPenalty7 - subjectRotPenalty7));
    if (confidence7 < 0.45) return { suppressed:true, reason:"Insufficient landmark confidence for trunk shift", confidence:r1(confidence7*100) };
    const rawShift7 = r2((shMid.x - hipMid.x)*100);
    const absShift7 = Math.abs(rawShift7);
    // In anterior view, positive = image right = patient LEFT
    const shiftSide7 = rawShift7 > 0 ? (view === "anterior" ? "Left" : "Right")
                     : rawShift7 < 0 ? (view === "anterior" ? "Right" : "Left")
                     : null;
    let sev7, sevCode7;
    if      (absShift7 < 1.0) { sev7="Normal";      sevCode7=0; }
    else if (absShift7 < 2.0) { sev7="Mild";        sevCode7=1; }
    else if (absShift7 < 4.0) { sev7="Moderate";    sevCode7=2; }
    else                      { sev7="Significant";  sevCode7=3; }
    const conf7 = r1(confidence7*100);
    const rel7 = conf7>=90?"Excellent":conf7>=75?"Good":conf7>=60?"Fair":"Low reliability";
    const footOffCentre7 = footMid ? r1(Math.abs(footMid.x - hipMid.x)*100) : null;
    const weightShiftFlag7 = footOffCentre7!==null && footOffCentre7>3;
    return {
      suppressed:false, shiftSide:shiftSide7, rawShift:rawShift7, absShift:absShift7,
      severity:sev7, severityCode:sevCode7, confidence:conf7, reliabilityLabel:rel7,
      weightShiftFlag:weightShiftFlag7,
      finding: sevCode7===0 ? "Trunk appears centred relative to pelvis"
        : `Trunk shifted ${shiftSide7?.toLowerCase()||"laterally"} relative to pelvis — ${sev7.toLowerCase()} displacement (${absShift7.toFixed(1)}%)`,
      measurement: `Thorax-pelvis lateral offset: ${rawShift7>0?"+":""}${rawShift7.toFixed(1)}% frame width`,
      clinicalCorrelation: sevCode7===0 ? "No clinically meaningful trunk shift detected"
        : `Lateral displacement of trunk relative to pelvis observed. May be associated with altered weight distribution or compensatory postural adaptation. Findings should be confirmed clinically.`
          + (weightShiftFlag7 ? " Weight shift compensation possible — assess foot position clinically." : ""),
      functionalRelevance: sevCode7===0 ? null
        : sevCode7===1 ? "Mild trunk shift — may be within functional range; reassess under load"
        : sevCode7===2 ? "Moderate trunk shift — may be associated with asymmetric lumbopelvic loading"
        : "Significant trunk shift — weight distribution and gait assessment recommended",
      suggestedNext: sevCode7===0 ? ["Single-leg stance assessment if clinically indicated"]
        : ["Weight distribution assessment","Functional squat","Single-leg stance","Gait analysis"],
    };
  })();

  // ── MODULE F10: ASIS Height Difference ───────────────────────────────────────
  const f10 = (() => {
    if (!Vb(23,24)) return null;
    const lVis = lm[23]?.visibility||0, rVis = lm[24]?.visibility||0;
    const baseConf = (lVis+rVis)/2;
    const eyeTiltDeg10 = Vb(2,5)
      ? Math.abs(Math.atan2(Math.abs(g(5).y-g(2).y), Math.abs(g(5).x-g(2).x))*180/Math.PI) : 0;
    const camTilt10 = Math.min(0.15, eyeTiltDeg10/20);
    const hasZ10 = lm[23]?.z !== undefined;
    const zDiff10 = hasZ10 ? Math.abs((lm[23].z||0)-(lm[24].z||0)) : 0;
    const rotPen10 = Math.min(0.25, zDiff10*3.0);
    const confidence10 = Math.max(0, Math.min(1, baseConf - camTilt10 - rotPen10));
    if (confidence10 < 0.45) return { suppressed:true, confidence:r1(confidence10*100) };
    const rawDiff10 = (g(24).y - g(23).y)*100;
    const absDiff10 = Math.abs(rawDiff10);
    const elevatedSide10 = rawDiff10 < 0 ? "Right" : "Left";
    let sevCode10;
    if      (absDiff10 < 0.8) sevCode10=0;
    else if (absDiff10 < 2.0) sevCode10=1;
    else if (absDiff10 < 4.0) sevCode10=2;
    else                      sevCode10=3;
    const conf10 = r1(confidence10*100);
    return {
      suppressed:false, elevatedSide:elevatedSide10, depressedSide:elevatedSide10==="Right"?"Left":"Right",
      diffPct:r2(absDiff10), rawDiff:r2(rawDiff10), severityCode:sevCode10, confidence:conf10,
      finding: sevCode10===0 ? "ASIS heights appear symmetrical"
        : `${elevatedSide10} ASIS elevated — ${["Normal","Mild","Moderate","Significant"][sevCode10].toLowerCase()} asymmetry (${r2(absDiff10).toFixed(1)}% frame height)`,
      clinicalCorrelation: sevCode10===0 ? "No clinically meaningful ASIS height asymmetry detected"
        : "Findings may indicate pelvic asymmetry. Should be confirmed clinically with pelvic landmark palpation. May be associated with altered weight distribution.",
      functionalRelevance: sevCode10===0 ? null
        : sevCode10===1 ? "Mild asymmetry — reassess under load if clinically indicated"
        : sevCode10===2 ? "Moderate asymmetry — may be associated with altered weight distribution"
        : "Significant asymmetry — prioritise clinical confirmation",
      suggestedNext: sevCode10===0 ? ["Reassess under load if indicated"]
        : ["Pelvic landmark palpation (ASIS, PSIS, iliac crest bilateral)",
           "Leg length assessment (true and apparent)",
           "Weight distribution assessment",
           sevCode10>=2?"Gait analysis":null,
           sevCode10>=2?"Functional squat assessment":null].filter(Boolean),
    };
  })();

  // ── MODULE F11: Pelvic Obliquity ──────────────────────────────────────────────
  const f11 = (() => {
    if (!Vb(23,24)||pelvisAngle===null) return null;
    const lVis = lm[23]?.visibility||0, rVis = lm[24]?.visibility||0;
    const baseConf = (lVis+rVis)/2;
    const eyeTiltDeg11 = Vb(2,5)
      ? Math.abs(Math.atan2(Math.abs(g(5).y-g(2).y), Math.abs(g(5).x-g(2).x))*180/Math.PI) : 0;
    const camTilt11 = Math.min(0.10, eyeTiltDeg11/90);
    const hasZ11 = lm[23]?.z !== undefined;
    const zDiff11 = hasZ11 ? Math.abs((lm[23].z||0)-(lm[24].z||0)) : 0;
    const rotPen11 = Math.min(0.25, zDiff11*3.0);
    const confidence11 = Math.max(0, Math.min(1, baseConf - camTilt11 - rotPen11));
    if (confidence11 < 0.45) return { suppressed:true, confidence:r1(confidence11*100) };
    const absAngle11 = Math.abs(pelvisAngle);
    const elevationSide11 = pelvisAngle>0?"Right":pelvisAngle<0?"Left":null;
    // P0-1: bands raised (Normal <4°, Mild 4–7, Moderate 7–10, Significant >10).
    // Healthy population reaches 5.6° obliquity (median ~2.0°, PMC10229507), so
    // physiological obliquity is no longer reported as a clinical finding.
    let sevCode11;
    if      (absAngle11 < 4.0)  sevCode11=0;
    else if (absAngle11 < 7.0)  sevCode11=1;
    else if (absAngle11 < 10.0) sevCode11=2;
    else                        sevCode11=3;
    const shAbs11 = Math.abs(shoulderAngle||0);
    const sameDir11 = shoulderAngle!==null&&absAngle11>0
      ? (pelvisAngle>0&&shoulderAngle<0)||(pelvisAngle<0&&shoulderAngle>0) : false;
    const pattern11 = (sameDir11&&shAbs11>2&&absAngle11>2)?"coupled"
      :(!sameDir11&&shAbs11>2&&absAngle11>2)?"compensatory":"isolated";
    const conf11 = r1(confidence11*100);
    return {
      suppressed:false, tiltAngle:r2(pelvisAngle), absAngle:r2(absAngle11),
      elevationSide:elevationSide11, obliquityPattern:pattern11, severityCode:sevCode11, confidence:conf11,
      finding: sevCode11===0 ? "Pelvic obliquity within normal variation"
        : `${elevationSide11||"Pelvic"} pelvic elevation tendency — ${["Normal","Mild","Moderate","Significant"][sevCode11].toLowerCase()} obliquity (${r2(absAngle11).toFixed(1)}\xb0)`,
      clinicalCorrelation: sevCode11===0 ? "No clinically meaningful pelvic obliquity detected"
        : `Findings may indicate pelvic asymmetry (${pattern11} pattern). Should be confirmed clinically. May be associated with altered weight distribution.`,
      functionalRelevance: sevCode11===0 ? null
        : sevCode11===1 ? "Mild obliquity — reassess under load"
        : sevCode11===2 ? `${elevationSide11||"Pelvic"} elevation may be associated with asymmetric lower limb loading`
        : "Marked obliquity — gait and squat assessment recommended",
      suggestedNext: sevCode11===0 ? ["Reassess under single-leg stance if indicated"]
        : ["Pelvic landmark palpation (ASIS, PSIS, iliac crest, greater trochanter)",
           "Leg length assessment (true and apparent)","Gait analysis","Weight distribution assessment",
           sevCode11>=2?"Functional squat assessment":null,
           sevCode11>=2?"Lumbar spine assessment":null].filter(Boolean),
    };
  })();

  return {
    f4, f7, f10, f11,
    shoulderAngle, pelvisAngle, eyeLevelAngle, headTiltAngle, headTiltSide,
    headLateralOffset, trunkLateralShift, weightBearingShift, spinalDeviation, waistAsymmetry,
    cvaAngle, fhpNorm, fhpDevCm, cervicalLoadKg, thoracicAngle, lumbarProxy, hipExtensionProxy,
    sagChain, sagConfidence, sagPelvicShift, sagShoulderShift, sagKneeShift, sagHipShift,
    trunkSagLean, plumb, fhpFromPlumb,
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
function calcReliability(lm, view) {
  if(!lm||lm.length<33) return {score:0,status:"No Pose",blocked:true,warnings:[{icon:"❌",text:"No pose detected",color:PC.red}],icc:null,confidence:{}};
  const isLateral = view==="left"||view==="right";
  const KEY=[0,2,5,7,8,11,12,23,24,25,26,27,28,29,30,31,32];
  const NAMES={0:"Head",2:"L.Eye",5:"R.Eye",7:"L.Ear",8:"R.Ear",11:"L.Shoulder",12:"R.Shoulder",
    23:"L.Hip",24:"R.Hip",25:"L.Knee",26:"R.Knee",27:"L.Ankle",28:"R.Ankle",
    29:"L.Heel",30:"R.Heel",31:"L.Toe",32:"R.Toe"};
  const confidence={};
  KEY.forEach(i=>{confidence[i]={name:NAMES[i],value:Math.round((lm[i]?.visibility||0)*100)};});
  // In a true lateral (side-on) photo, only the near-side landmark of each
  // bilateral pair is anatomically expected to be visible — the far side is
  // legitimately occluded by the body. Scoring/gating must judge lateral photos
  // by their near-side (higher-visibility) landmark of each pair, not penalise
  // them for the far side being invisible, which is normal and correct.
  const nearVis = (a,b) => Math.max(lm[a]?.visibility||0, lm[b]?.visibility||0);
  let avg, blocked, failedCritical, bothShLow, bothHipLow;
  if (isLateral) {
    const parts=[(lm[0]?.visibility||0), nearVis(7,8), nearVis(11,12), nearVis(23,24), nearVis(25,26), nearVis(27,28), nearVis(29,30), nearVis(31,32)];
    avg=parts.reduce((a,b)=>a+b,0)/parts.length;
    const shVis=nearVis(11,12)>=MIN_VIS, hipVis=nearVis(23,24)>=MIN_VIS, headVis=(lm[0]?.visibility||0)>=MIN_VIS;
    failedCritical=[!headVis&&{idx:0,name:"Head"},!shVis&&{idx:11,name:"Shoulder"},!hipVis&&{idx:23,name:"Hip"}].filter(Boolean);
    bothShLow=!shVis; bothHipLow=!hipVis;
    blocked=avg<0.40||!shVis||!hipVis;
  } else {
    const visVals=KEY.map(i=>(lm[i]?.visibility||0));
    avg=visVals.reduce((a,b)=>a+b,0)/KEY.length;
    const critical=[{idx:11,name:"L.Shoulder"},{idx:12,name:"R.Shoulder"},{idx:23,name:"L.Hip"},{idx:24,name:"R.Hip"},{idx:0,name:"Head"}];
    failedCritical=critical.filter(c=>(lm[c.idx]?.visibility||0)<MIN_VIS);
    bothShLow=(lm[11]?.visibility||0)<MIN_VIS&&(lm[12]?.visibility||0)<MIN_VIS;
    bothHipLow=(lm[23]?.visibility||0)<MIN_VIS&&(lm[24]?.visibility||0)<MIN_VIS;
    blocked=avg<0.40||failedCritical.length>1||bothShLow||bothHipLow;
  }
  const score=Math.round(clamp(avg*100,0,100));
  const warnings=[];
  if(blocked){
    warnings.push({icon:"✕",text:"Image quality insufficient — improve lighting, ensure full body visible",color:PC.red,priority:6});
  } else if(avg<0.55){
    warnings.push({icon:"⚠",text:"Low confidence — findings may be inaccurate. Improve lighting and camera distance",color:PC.red,priority:5});
  } else if(avg<0.70){
    warnings.push({icon:"○",text:"Partial tracking — some measurements limited. Ensure full body in frame",color:PC.yellow,priority:3});
  }
  if (!isLateral) {
    const low=KEY.filter(i=>(lm[i]?.visibility||0)<MIN_VIS);
    if(!blocked&&low.length>5) warnings.push({icon:"◉",text:`${low.length} landmarks low confidence — affected measurements unreliable`,color:PC.yellow,priority:4});
    if(!blocked&&Math.abs((lm[11]?.visibility||0)-(lm[12]?.visibility||0))>0.40)
      warnings.push({icon:"↔",text:"Asymmetric shoulder visibility — bilateral measurements may be inaccurate",color:PC.yellow,priority:3});
    if(!blocked&&((lm[23]?.visibility||0)<MIN_VIS||(lm[24]?.visibility||0)<MIN_VIS))
      warnings.push({icon:"⊖",text:"Hip partially occluded — pelvic measurements flagged unreliable",color:PC.yellow,priority:3});
  }
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

// ═══════════════════════════════════════════════════════════════════════════════
// POSTURE ANALYSIS ENGINE — v2 (Kendall / Janda / Sahrmann)
// Items: thresholds, severity, confidence, landmark reliability,
//        clinical significance filter, interpretation, muscle patterns,
//        functional correlations, prioritisation
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. THRESHOLD CONSTANTS ────────────────────────────────────────────────────
// Only deviations exceeding these thresholds trigger findings.
// Values based on clinical literature measurement error + meaningful change.
// ── POSTURE_THRESHOLDS ───────────────────────────────────────────────────────
// References:
//   Frontal: Magee Orthopedic Physical Assessment 6th ed.
//   Sagittal: Yip et al. 2008 (CVA), Magee 6th ed. (kyphosis, pelvic tilt)
//   Kendall 5th ed. (plumb line deviations)
const POSTURE_THRESHOLDS = {
  // FRONTAL ─────────────────────────────────────────────────────────────────
  // Shoulder: Magee p.597 — >1.5cm clinically significant (~2.1° at 40cm width).
  // Photographic-posture evidence shows slight asymmetry is normal, so mild fires
  // at 3° (above measurement noise + normal variation) to avoid flagging healthy
  // shoulders. (P0-1 recalibration)
  shoulderAngle:       { mild:3,   moderate:5,  severe:7   }, // degrees (Magee + healthy-norm)
  // Pelvis: healthy population shows obliquity 0–5.6°, median ~2.0° (Sci Rep /
  // PMC10229507) — slight obliquity is NORMAL. mild raised to 4° so the screen
  // flags only clearly-above-normal obliquity, not physiological asymmetry. (P0-1)
  pelvisAngle:         { mild:4,   moderate:7,  severe:10  }, // degrees (healthy-population norm)
  // Head tilt: Lee & Nussbaum 2013 — normal variation up to 4–5°.
  headTilt:            { mild:4,   moderate:7,  severe:10  }, // degrees (Lee & Nussbaum 2013)
  // Trunk shift: Magee — >4cm lateral shift associated with disc pathology
  trunkLateralShift:   { mild:3,   moderate:6,  severe:10  }, // % frame width (Magee)
  spinalDeviation:     { mild:4,   moderate:8,  severe:13  }, // %
  waistAsymmetry:      { mild:4,   moderate:7,  severe:11  }, // %
  // Knee frontal: Magee p.760 — HKA deviation >6° screened as valgus/varus tendency
  kneeFrontal:         { mild:6,   moderate:10, severe:15  }, // degrees (Magee/Norkin & White)
  ucsIndex:            { mild:0.6, moderate:1.0,severe:1.5 }, // index
  // LLD: Magee p.695 — >5mm functional; >20mm requires clinical intervention
  lldProxy:            { mild:5,   moderate:10, severe:20  }, // mm (Magee)
  neckLateralAngle:    { mild:5,   moderate:8,  severe:12  }, // degrees
  tibialVarum:         { mild:5,   moderate:10, severe:15  }, // degrees
  ankleLLD:            { mild:6,   moderate:12, severe:18  }, // mm
  // SAGITTAL ────────────────────────────────────────────────────────────────
  // CVA: Yip et al. 2008 — normal >55°; FHP threshold <55°.
  cvaAngle:            { mild:55,  moderate:49, severe:44  }, // degrees lower=worse (Yip 2008)
  // Thoracic kyphosis: Magee p.611 — normal 20–45°; hyperkyphosis >50°.
  // mild fires just above normal max (46°); moderate at clinical hyperkyphosis (50°)
  thoracicAngle:       { mild:46,  moderate:50, severe:60  }, // degrees (Magee — Cobb T1-T12 equiv.)
  // APT/PPT: Magee p.677 — female ≤12°, male ≤7° normal pelvic tilt.
  // lumbarProxy is a % frame width proxy, not a true degree measure.
  lumbarProxy:         { mild:4,   moderate:8,  severe:13  }, // % (proxy — see anteriorPelvicTiltDeg)
  hipDisplacement:     { mild:4,   moderate:8,  severe:13  }, // %
  // Genu recurvatum: Magee p.759 — >5° hyperextension in standing is clinically significant.
  kneeRecurvatum:      { mild:5,   moderate:10, severe:15  }, // degrees (Magee)
  lcsIndex:            { mild:0.4, moderate:0.8,severe:1.3 }, // index
};

// ═══════════════════════════════════════════════════════════════════════════
// SPINE INTERPOLATION ENGINE
// Estimates T1-T12, L1-L5 positions from available MediaPipe landmarks
// Uses anatomical ratios (Kapandji / White & Panjabi)
// ═══════════════════════════════════════════════════════════════════════════
function interpolateSpineLandmarks(lm) {
  if (!lm || lm.length < 33) return null;
  const g = i => lm[i];
  const V = i => (lm[i]?.visibility || 0) >= 0.4;

  // Use the most visible side for sagittal
  const earL = g(7), earR = g(8);
  const sagEar = ((earL?.visibility||0) >= (earR?.visibility||0)) ? earL : earR;
  const shL = g(11), shR = g(12);
  const sagSh = ((shL?.visibility||0) >= (shR?.visibility||0)) ? shL : shR;
  const hipL = g(23), hipR = g(24);
  const sagHip = ((hipL?.visibility||0) >= (hipR?.visibility||0)) ? hipL : hipR;

  if (!sagSh || !sagHip) return null;

  const shX = sagSh.x, shY = sagSh.y;
  const hipX = sagHip.x, hipY = sagHip.y;

  // Anatomical ratios along the spine (shoulder=T1, hip=S1)
  // T1(0%) T4(25%) T7(45%) T10(65%) T12(78%) L1(82%) L3(90%) L5(97%) S1(100%)
  const ratios = {
    T1:  { r: 0.00, label: "T1"  },
    T4:  { r: 0.25, label: "T4"  },
    T7:  { r: 0.45, label: "T7"  },
    T10: { r: 0.65, label: "T10" },
    T12: { r: 0.78, label: "T12" },
    L1:  { r: 0.82, label: "L1"  },
    L3:  { r: 0.90, label: "L3"  },
    L5:  { r: 0.97, label: "L5"  },
  };

  const spine = {};
  Object.entries(ratios).forEach(([key, { r, label }]) => {
    spine[key] = {
      x: shX + r * (hipX - shX),
      y: shY + r * (hipY - shY),
      label,
      visibility: Math.min(sagSh.visibility || 0.5, sagHip.visibility || 0.5),
    };
  });

  // Estimate cervical curve: C4 is midpoint between ear and T1 offset
  if (sagEar) {
    spine.C4 = {
      x: sagEar.x * 0.3 + shX * 0.7,
      y: sagEar.y * 0.3 + shY * 0.7,
      label: "C4",
      visibility: sagEar.visibility || 0.5,
    };
    spine.C7 = {
      x: sagEar.x * 0.05 + shX * 0.95,
      y: sagEar.y * 0.05 + shY * 0.95,
      label: "C7",
      visibility: Math.min(sagEar.visibility || 0.5, sagSh.visibility || 0.5),
    };
  }

  return spine;
}

// ═══════════════════════════════════════════════════════════════════════════
// KENDALL POSTURAL TYPE CLASSIFIER
// Based on Kendall et al. "Muscles: Testing and Function" 5th Ed.
// Types: Ideal, Kyphosis-Lordosis, Flat-back, Sway-back, Military
// ═══════════════════════════════════════════════════════════════════════════
function classifyKendallPostureType(m) {
  if (!m) return null;

  const cva       = m.cvaAngle;
  const thoracic  = m.thoracicAngle;
  const pelvicCm  = m.sagPelvicShift;
  const hipExt    = m.hipExtensionProxy;
  const kneeRec   = m.leftKneeDev ?? m.rightKneeDev; // negative = recurvatum

  // For frontal views: classify based on frontal asymmetry patterns
  const shAngle = m.shoulderAngle ?? null;
  const pelAngle = m.pelvisAngle ?? null;
  const trunkShift = m.trunkLateralShift ?? null;
  const isFrontal = (shAngle !== null || pelAngle !== null);

  if (thoracic === null && pelvicCm === null) {
    // Frontal view classification
    if (!isFrontal) return null;
    const shAbs = Math.abs(shAngle ?? 0);
    const pelAbs = Math.abs(pelAngle ?? 0);
    const trunkAbs = Math.abs(trunkShift ?? 0);

    if (shAbs > 5 && pelAbs > 4 && m.lldProxy > 5) {
      return { type:"Pelvic Obliquity Pattern", description:"Shoulder and pelvic height asymmetry with possible leg length discrepancy. May be structural or functional — confirm with standing AP X-ray.", confidence:70, keyFindings:["Shoulder asymmetry","Pelvic obliquity","Possible LLD"], tight:["QL (elevated side)","Hip Abductors"], weak:["Hip Abductors (low side)","QL (depressed side)"], icd:"M99.0", colour:"#F97316" };
    }
    if (shAbs > 5 && pelAbs > 4) {
      return { type:"Lateral Asymmetry Pattern", description:"Bilateral shoulder and pelvic height asymmetry. Screen for scoliosis with Adam's forward bend test and rib hump observation.", confidence:72, keyFindings:["Shoulder elevation","Pelvic obliquity"], tight:["QL","Lateral Trunk Muscles (high side)"], weak:["Hip Abductors","QL (low side)"], icd:"M41.9", colour:"#EF4444" };
    }
    if (trunkAbs > 4) {
      return { type:"Lateral Trunk Shift", description:"Noticeable side-to-side trunk lean. May reflect a habitual posture or trunk asymmetry — a qualified professional can assess the cause.", confidence:68, keyFindings:["Trunk lateral shift"], tight:["QL","Lateral Abdominals"], weak:["Contralateral Hip Abductors"], icd:"M99.0", colour:"#F97316" };
    }
    if (shAbs < 3 && pelAbs < 4 && trunkAbs < 3) {
      return { type:"Frontal Alignment — Within Normal Limits", description:"Frontal plane alignment within Kendall normal ranges. Bilateral symmetry maintained.", confidence:75, keyFindings:[], tight:[], weak:[], icd:"Z00.0", colour:"#10B981" };
    }
    return null;
  }

  // Sagittal (degree-based) Kendall classification requires a real thoracic
  // angle. In the live pipeline thoracic curvature is measured by the contour
  // engine (TCI, a depth-chord index) — NOT by measureLandmarks — so rather than
  // fabricating a placeholder thoracic value (previously 32°, which silently made
  // Sway-back/Kyphosis/Military/Flat-back patterns unreachable and falsely
  // reported thoracic status), defer to the TCI-based classifier
  // (buildKendallClassification / HybridKendall) when thoracic is unmeasured.
  if (thoracic === null) return null;
  const th = thoracic;
  const pc = pelvicCm ?? 0;
  const fhp = cva !== null ? cva < 52 : false;

  // ── Sway-back ──────────────────────────────────────────────────────────────
  // Hips thrust forward (posterior to plumb), thoracic kyphosis, cervical extension
  if (pc < -3 && th > 44 && fhp) {
    return {
      type: "Sway-back Posture",
      description: "Hips displaced anterior to plumb, increased thoracic kyphosis, compensatory forward head. Pelvis in posterior tilt.",
      confidence: 75,
      keyFindings: ["Anterior hip displacement","Thoracic hyperkyphosis","Forward head"],
      tight:  ["Hamstrings","Upper Abdominals","Cervical Extensors"],
      weak:   ["Hip Flexors","Lower Thoracic Extensors","Deep Neck Flexors"],
      icd: "M40.3",
      colour: "#F97316"
    };
  }

  // ── Flat-back ──────────────────────────────────────────────────────────────
  // Posterior pelvic tilt, reduced lumbar lordosis, reduced thoracic kyphosis
  if (pc < -2 && th < 42) {
    return {
      type: "Flat-back Posture",
      description: "Posterior pelvic tilt with reduced lumbar lordosis and flattened thoracic curve. Reduced spinal shock absorption.",
      confidence: 72,
      keyFindings: ["Posterior pelvic tilt","Reduced kyphosis","Reduced lordosis"],
      tight:  ["Hamstrings","Abdominals"],
      weak:   ["Hip Flexors (Iliopsoas)","Lumbar Extensors","Thoracic Extensors"],
      icd: "M40.4",
      colour: "#3B82F6"
    };
  }

  // ── Kyphosis-Lordosis ──────────────────────────────────────────────────────
  // Increased thoracic kyphosis + anterior pelvic tilt + FHP (Janda UCS+LCS)
  if (th > 46 && pc > 2 && fhp) {
    return {
      type: "Kyphosis-Lordosis Posture",
      description: "Combined increased thoracic kyphosis and lumbar lordosis with anterior pelvic tilt and forward head. Classic Janda combined UCS+LCS pattern.",
      confidence: 80,
      keyFindings: ["Thoracic hyperkyphosis","Anterior pelvic tilt","Forward head posture"],
      tight:  ["Hip Flexors","Lumbar Extensors","Pec Minor","SCM","Suboccipitals"],
      weak:   ["Deep Neck Flexors","Lower Trapezius","Glutes","Deep Abdominals (TrA)"],
      icd: "M40.0",
      colour: "#EF4444"
    };
  }

  // ── Upper Kyphosis only ────────────────────────────────────────────────────
  if (th > 46 && fhp && Math.abs(pc) <= 2) {
    return {
      type: "Thoracic Kyphosis Posture",
      description: "Increased thoracic kyphosis with forward head. Possible occupational/sedentary pattern (Scheuermann's or habitual).",
      confidence: 73,
      keyFindings: ["Thoracic hyperkyphosis","Forward head posture"],
      tight:  ["Pec Minor","Upper Trapezius","Suboccipitals"],
      weak:   ["Lower Trapezius","Serratus Anterior","Deep Neck Flexors"],
      icd: "M40.2",
      colour: "#EF4444"
    };
  }

  // ── Military / Flat ────────────────────────────────────────────────────────
  if (th < 30 && !fhp && Math.abs(pc) < 2) {
    return {
      type: "Military Posture",
      description: "Reduced thoracic kyphosis, neck retracted, posterior shoulder position. Common in military personnel and dance.",
      confidence: 68,
      keyFindings: ["Reduced thoracic kyphosis","Neck retraction tendency"],
      tight:  ["Thoracic Extensors","Neck Retractors"],
      weak:   ["Thoracic Flexors","SCM"],
      icd: "M40.4",
      colour: "#8B5CF6"
    };
  }

  // ── APT only — requires ASIS/PSIS confirmation, not shown from proxy alone ──
  // NOTE: sagPelvicShift is a hip-position proxy, NOT a true pelvic tilt measure.
  // APT classification from this proxy is unreliable and clinically misleading.
  // APT is only shown in HybridKendall when ASIS + PSIS are manually placed.
  // if (pc > 3 && th <= 46) → removed to prevent false positive APT from proxy

  // ── Ideal ──────────────────────────────────────────────────────────────────
  if (!fhp && th >= 20 && th <= 46 && Math.abs(pc) <= 2) {
    return {
      type: "Ideal / Within Normal Limits",
      description: "Alignment within Kendall normal ranges. Continued functional training recommended to maintain.",
      confidence: 78,
      keyFindings: [],
      tight:  [],
      weak:   [],
      icd: "Z00.0",
      colour: "#10B981"
    };
  }

  return null;
}

// ── 2. SEVERITY CLASSIFIER ────────────────────────────────────────────────────
// Returns "mild" | "moderate" | "high" based on thresholds
function classifySeverity(value, thresholds, lowerIsBad = false) {
  const { mild, moderate, severe } = thresholds;
  if (lowerIsBad) {
    // e.g. CVA angle: lower value = worse
    if (value <= severe)  return "high";
    if (value <= moderate) return "moderate";
    if (value <= mild)     return "mild";
    return null; // within normal
  } else {
    if (value >= severe)  return "high";
    if (value >= moderate) return "moderate";
    if (value >= mild)     return "mild";
    return null; // within normal
  }
}

// ── 3. CONFIDENCE SCORING ─────────────────────────────────────────────────────
// Per-finding confidence based on landmark visibility at the relevant body segment
function getLandmarkConfidence(lm, indices) {
  if (!lm || !indices.length) return 50;
  const visVals = indices.map(i => (lm[i]?.visibility || 0) * 100);
  const avg = visVals.reduce((a, b) => a + b, 0) / visVals.length;
  const minV = Math.min(...visVals);
  // Penalise if any landmark in this region is very low
  const penalty = minV < 40 ? 20 : minV < 55 ? 10 : 0;
  return Math.round(clamp(avg - penalty, 0, 100));
}

// Landmark index groups by body region
const LANDMARK_GROUPS = {
  head:      [0, 2, 5, 7, 8],
  shoulder:  [11, 12],
  hip:       [23, 24],
  knee:      [25, 26],
  ankle:     [27, 28],
  heel:      [29, 30],
  upperBody: [0, 7, 8, 11, 12],
  lowerBody: [23, 24, 25, 26, 27, 28],
  sagittal:  [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30],
};

// ── 4. LANDMARK RELIABILITY CHECK ─────────────────────────────────────────────
// Returns { reliable: bool, reason: string } for a specific measurement
function checkLandmarkReliability(lm, indices, minVisibility = 0.45) {
  if (!lm) return { reliable: false, reason: "No landmarks" };
  const lowVis = indices.filter(i => (lm[i]?.visibility || 0) < minVisibility);
  if (lowVis.length > 0) {
    return { reliable: false, reason: `Landmark(s) ${lowVis.join(",")} below visibility threshold` };
  }
  // Anatomical plausibility: check that body points are in expected vertical order
  const plausible = checkAnatomicalOrder(lm, indices);
  if (!plausible) {
    return { reliable: false, reason: "Anatomically implausible landmark positions" };
  }
  return { reliable: true, reason: "" };
}

function checkAnatomicalOrder(lm, indices) {
  if (!lm) return true;
  // Shoulder should be above hip (y increases downward in image coords)
  if (indices.includes(11) && indices.includes(23)) {
    if ((lm[11]?.y || 0) > (lm[23]?.y || 1)) return false; // shoulder below hip
  }
  if (indices.includes(12) && indices.includes(24)) {
    if ((lm[12]?.y || 0) > (lm[24]?.y || 1)) return false;
  }
  // Hip should be above knee
  if (indices.includes(23) && indices.includes(25)) {
    if ((lm[23]?.y || 0) > (lm[25]?.y || 1)) return false;
  }
  if (indices.includes(24) && indices.includes(26)) {
    if ((lm[24]?.y || 0) > (lm[26]?.y || 1)) return false;
  }
  // Knee should be above ankle
  if (indices.includes(25) && indices.includes(27)) {
    if ((lm[25]?.y || 0) > (lm[27]?.y || 1)) return false;
  }
  if (indices.includes(26) && indices.includes(28)) {
    if ((lm[26]?.y || 0) > (lm[28]?.y || 1)) return false;
  }
  return true;
}

// ── 5. INTERPRETATION ENGINE ──────────────────────────────────────────────────
// Conservative physiotherapy wording — never certain, always "may indicate"
const INTERPRETATIONS = {
  shoulder: (side, deg) =>
    `Observation may be consistent with ${side.toLowerCase()} shoulder elevation (${deg.toFixed(1)}°). ` +
    `May be associated with ipsilateral upper trapezius and levator scapulae overactivity, ` +
    `and contralateral lower trapezius underactivity. Confirm clinically.`,
  pelvis: (side, deg) =>
    `Observation may indicate ${side.toLowerCase()} pelvic elevation (${deg.toFixed(1)}°). ` +
    `May be associated with ipsilateral quadratus lumborum overactivity or leg length asymmetry. ` +
    `True leg length difference should be assessed clinically before conclusion.`,
  headTilt: (side, deg) =>
    `Head lateral inclination toward ${side.toLowerCase()} (${deg.toFixed(1)}°) may be associated with ` +
    `ipsilateral sternocleidomastoid and scalene overactivity. Upper cervical joint restriction ` +
    `(C1–C2) is a possible contributing factor. Clinical assessment recommended.`,
  trunkShift: (side, pct) =>
    `Lateral trunk displacement toward ${side.toLowerCase()} (${pct.toFixed(1)}%) may reflect ` +
    `a pain-avoidance strategy, lateral hip weakness, or thoracolumbar muscle asymmetry. ` +
    `Disc-related antalgic lean should be considered if accompanied by leg symptoms.`,
  kneeFrontal: (side, deg, pattern) =>
    `${side} knee ${pattern} tendency (${deg.toFixed(1)}°) may be associated with reduced ` +
    `hip abductor and external rotator contribution, or increased subtalar pronation. ` +
    `Static posture alone is insufficient to confirm this pattern — functional assessment recommended.`,
  ucs: (idx) =>
    `Observation may be consistent with characteristics of upper crossed pattern (index ${idx.toFixed(1)}). ` +
    `Possible overactivity: upper trapezius, levator scapulae, SCM, pectoralis minor. ` +
    `Possible underactivity: deep cervical flexors, lower trapezius, serratus anterior. ` +
    `Clinical muscle testing required to confirm.`,
  fhp: (cva, load) =>
    `Reduced CVA (${cva.toFixed(1)}°) may indicate a forward head tendency. ` +
    `This pattern may be associated with suboccipital and cervical extensor overactivity ` +
    `and reduced deep cervical flexor contribution.` +
    (load ? ` Estimated cervical load increase: ~${load.toFixed(1)}kg (estimated cervical extensor load (proxy — not a validated estimated cervical load proxy formula) model — proxy only).` : ""),
  kyphosis: (deg) =>
    `Increased thoracic curvature (${deg.toFixed(1)}°) may be consistent with a kyphotic tendency. ` +
    `Possible overactivity: pectoralis major/minor, upper trapezius. ` +
    `Possible underactivity: middle and lower trapezius, rhomboids, thoracic erectors.`,
  lumbar: (proxy, dir) =>
    `${dir} pelvic tilt tendency (${Math.abs(proxy).toFixed(1)}%) may be associated with ` +
    (dir === "Anterior"
      ? `possible hip flexor shortening and reduced gluteal contribution.`
      : `possible hamstring dominance and reduced lumbar extensor contribution.`),
  lcs: (idx) =>
    `Observation may be consistent with characteristics of lower crossed pattern (index ${idx.toFixed(1)}). ` +
    `Possible overactivity: iliopsoas, rectus femoris, thoracolumbar extensors. ` +
    `Possible underactivity: gluteus maximus, transverse abdominis. ` +
    `Clinical assessment and muscle length testing recommended.`,
};

// ── 6. MUSCLE PATTERN SUGGESTIONS ────────────────────────────────────────────
// Maps posture observations to POSSIBLE (not certain) muscle imbalance tendencies
const MUSCLE_PATTERNS = {
  shoulder:    { tight:["Upper trapezius","Levator scapulae"],       weak:["Lower trapezius","Serratus anterior"] },
  pelvis:      { tight:["QL (elevated side)","Hip abductors (elevated)"], weak:["Glute med (low side)","Hip abductors (low)"] },
  headTilt:    { tight:["SCM (ipsilateral)","Scalenes (ipsilateral)"],   weak:["Deep cervical flexors","Contralateral SCM"] },
  trunkShift:  { tight:["QL","Lateral abdominals (shift side)"],     weak:["Contralateral QL","Lateral trunk stabilisers"] },
  kneeFrontal: { tight:["TFL/ITB","Hip adductors"],                  weak:["Gluteus medius","VMO"] },
  fhp:         { tight:["Suboccipitals","Cervical extensors","SCM"], weak:["Deep cervical flexors"] },
  kyphosis:    { tight:["Pectoralis major/minor","Upper trapezius"],  weak:["Lower trapezius","Rhomboids","Thoracic erectors"] },
  lumbarAnt:   { tight:["Iliopsoas","Rectus femoris","TFL"],         weak:["Gluteus maximus","Transverse abdominis"] },
  lumbarPost:  { tight:["Hamstrings","Abdominals"],                  weak:["Hip flexors","Lumbar erectors"] },
  ucs:         { tight:["Upper trapezius","SCM","Pec minor","Scalenes"], weak:["Deep cervical flexors","Lower trapezius","Serratus anterior"] },
  lcs:         { tight:["Iliopsoas","Rectus femoris","TFL"],         weak:["Gluteus maximus","Gluteus medius","Transverse abdominis"] },
};

// ── 7. FUNCTIONAL CORRELATIONS ────────────────────────────────────────────────
// POSSIBLE loading/movement consequences of each posture observation
const FUNCTIONAL_CORRELATIONS = {
  shoulder:    "May alter scapulohumeral rhythm and rotator cuff loading if present during overhead tasks.",
  pelvis:      "May affect lumbopelvic load distribution and contribute to asymmetrical hip/SIJ loading.",
  headTilt:    "May influence upper cervical joint loading and cranial nerve tension if severe.",
  trunkShift:  "May increase contralateral lumbopelvic loading and alter gait mechanics.",
  kneeFrontal: "May increase medial compartment and patellofemoral loading during weight-bearing activities.",
  fhp:         "May increase suboccipital and upper cervical extensor loading and reduce cervical flexor capacity.",
  kyphosis:    "May reduce thoracic extension mobility and alter ribcage mechanics during breathing.",
  lumbarAnt:   "May increase lumbar extension loading and reduce lumbopelvic control capacity.",
  lumbarPost:  "May increase anterior disc shear load and reduce lumbar extension mobility.",
  ucs:         "May reduce cervicothoracic mobility and alter shoulder blade positioning during arm activities.",
  lcs:         "May reduce lumbopelvic control and alter load transfer between lumbar spine and lower limbs.",
};

// ── 8. RECOMMENDED OBJECTIVE ASSESSMENT ──────────────────────────────────────
const OBJECTIVE_ASSESSMENTS = {
  shoulder:    ["Muscle length: upper trapezius passive stretch test","Muscle strength: lower trapezius (prone Y)","SIJ screen if pelvis also elevated"],
  pelvis:      ["True LLD: tape measure ASIS → medial malleolus","SIJ provocation cluster (Laslett)","Hip abductor strength (Trendelenburg test)"],
  headTilt:    ["Cervical AROM — rotation range bilateral","FRT (Flexion-Rotation Test) for C1–C2","Cranial nerve screen if accompanied by symptoms"],
  trunkShift:  ["Neurological screen: SLR, sensation L3–S1","Kemp's test (facet load)","Hip abductor strength — single-leg balance"],
  kneeFrontal: ["Single-leg squat (observe dynamic valgus/varus)","Hip abductor strength: side-lying abduction","Foot posture index — subtalar pronation"],
  fhp:         ["Craniovertebral angle measurement (goniometer)","Deep cervical flexor strength: craniocervical flexion test","Upper cervical joint mobility: ULPA"],
  kyphosis:    ["Passive thoracic extension ROM","Muscle length: pectoralis major (supine)","Strength: lower/mid trapezius (prone Y/T)"],
  lumbarAnt:   ["Thomas test: hip flexor length","Modified Ober test: TFL/ITB length","Glute max strength: prone hip extension"],
  lumbarPost:  ["Hamstring length: 90/90 SLR","McKenzie assessment: directional preference","Posterior pelvic tilt control: supine pelvic tilt"],
  ucs:         ["Craniocervical flexion test (CCFT)","Muscle length: pec minor (wall test)","Thoracic extension mobility (foam roller test)"],
  lcs:         ["Thomas test bilateral","Gluteus maximus strength: prone hip extension","Transverse abdominis function: TrA activation test"],
};

// ── 9. FINDING BUILDER — creates structured finding object ────────────────────
function buildFinding({
  region, findingName, severity, confidenceScore, interpretation,
  musclePattern, functionalCorrelation, objectiveAssessments,
  correction, icd = "M99.0", norm = "", plain = "",
  clinicalSignificance = "moderate",
  clusterBoost = 0,     // bonus applied by clustering logic (+0 to +20)
}) {
  // Clinical significance filter:
  // Sagittal findings use lower gates (lateral landmarks naturally less visible).
  // clusterBoost allows clustered mild findings to survive by lifting effective conf.
  const effectiveConf = Math.min(100, (confidenceScore || 50) + clusterBoost);
  if (severity === "mild"     && effectiveConf < 42) return null;  // was 55 — too aggressive
  if (severity === "moderate" && effectiveConf < 28) return null;  // was 35
  return {
    region,
    text:        findingName,
    plain:       plain || interpretation.split(".")[0],
    severity,
    confidenceScore,
    clinicalSignificance,
    interpretation,
    possibleMusclePatterns: musclePattern
      ? { tight: musclePattern.tight, weak: musclePattern.weak }
      : null,
    functionalCorrelation: functionalCorrelation || null,
    recommendedObjectiveAssessment: objectiveAssessments || [],
    correction,
    icd,
    norm,
  };
}

// ── 10. PRIORITISATION ────────────────────────────────────────────────────────
function prioritiseFindings(findings) {
  const sevRank = { high: 3, moderate: 2, mild: 1 };
  const sigRank = { high: 3, moderate: 2, low: 1 };
  return [...findings].sort((a, b) => {
    // Heavily penalise estimated/unverified findings so they never outrank
    // directly observable high-confidence findings
    const aEstPenalty = (a._requiresVerification || (a.confidenceScore||70) < 50) ? -4 : 0;
    const bEstPenalty = (b._requiresVerification || (b.confidenceScore||70) < 50) ? -4 : 0;
    const aScore = (sevRank[a.severity] || 0) * 3
      + ((a.confidenceScore || 50) / 100) * 2
      + (sigRank[a.clinicalSignificance] || 1)
      + aEstPenalty;
    const bScore = (sevRank[b.severity] || 0) * 3
      + ((b.confidenceScore || 50) / 100) * 2
      + (sigRank[b.clinicalSignificance] || 1)
      + bEstPenalty;
    return bScore - aScore;
  });
}

// ── MAX FINDINGS PER SESSION ─────────────────────────────────────────────────
// Clinical significance filter: limit output to top findings to reduce noise
const MAX_FINDINGS_FRONTAL  = 7;
const MAX_FINDINGS_SAGITTAL = 6;
const MAX_FINDINGS_TOTAL    = 10;


// ══════════════════════════════════════════════════════════════════════════════
// SAGITTAL POSTURE CHAIN CLUSTERING ENGINE
// Implements requirements 2, 3, 4, 7, 10 from the spec.
//
// How it works:
// 1. After buildFindings runs all individual checks, collect what fired.
// 2. Group related findings into posture chains (cervical→shoulder→thoracic→pelvis).
// 3. Apply cluster confidence boost: 2 related mild findings → boost to moderate significance.
// 4. Apply weighted cluster score to decide overall pattern label.
// 5. Replace suppressed mild findings with cluster-level summary if 2+ related patterns found.
// ══════════════════════════════════════════════════════════════════════════════

// Posture chain membership: which regions belong to which chain segment
const POSTURE_CHAIN = {
  cervical:  ["Cervical / CVA", "Head / Cervical"],
  shoulder:  ["Shoulder / Rounded Tendency", "Upper Crossed Syndrome (UCS)", "Upper Crossed Syndrome"],
  thoracic:  ["Thoracic Kyphosis (Trunk Lean Est.)"],
  pelvis:    ["Pelvis / Lumbar", "Lower Crossed Syndrome (LCS)", "Lower Crossed Syndrome"],
  knee:      ["Knee", "Knee Alignment"],
};

// Weighted chain score: how many chain segments are present
function computeChainScore(findings) {
  const scores = {};
  Object.entries(POSTURE_CHAIN).forEach(([seg, regions]) => {
    const present = findings.some(f => regions.some(r => f.region.includes(r)));
    scores[seg] = present ? 1 : 0;
  });
  return scores;
}

// Cluster boost: return confidence bonus for a finding based on related findings
// Isolated mild finding → no boost
// 2 related findings present → +15 boost
// 3+ related findings (full chain) → +25 boost
function getClusterBoost(finding, allFindings) {
  const chains = Object.entries(POSTURE_CHAIN);
  // Find which chain segments are present
  const activeSegments = chains.filter(([, regions]) =>
    allFindings.some(f => regions.some(r => f.region.includes(r)))
  ).length;

  // Boost applied when finding is part of a multi-segment chain
  if (activeSegments >= 3) return 25;
  if (activeSegments === 2) return 15;
  return 0;
}

// Generate chain correlation note for multi-segment patterns
function buildChainNote(chainScore) {
  const active = Object.entries(chainScore).filter(([, v]) => v === 1).map(([k]) => k);
  if (active.length === 0) return null;

  if (active.includes("cervical") && active.includes("thoracic") && active.includes("pelvis")) {
    return "Multiple sagittal chain segments affected (cervical, thoracic, pelvis). Combined findings may be consistent with upper and lower crossed pattern characteristics. Clinical assessment is recommended to confirm.";
  }
  if (active.includes("cervical") && active.includes("thoracic")) {
    return "Forward head tendency and thoracic curvature observed together. These findings may be consistent with upper crossed pattern characteristics. Clinical confirmation recommended.";
  }
  if (active.includes("cervical") && active.includes("shoulder")) {
    return "Forward head and anterior shoulder tendencies observed together. Pattern may reflect a cervicothoracic adaptation. Clinical confirmation recommended.";
  }
  if (active.includes("thoracic") && active.includes("pelvis")) {
    return "Thoracic and pelvic chain findings observed together. May reflect compensatory spinal load distribution. Clinical assessment recommended.";
  }
  if (active.length === 1) return null; // single segment — no chain note needed
  return `Findings observed across ${active.join(" and ")} regions. Pattern clustering increases clinical relevance.`;
}

// Clinically realistic nil-finding messages (spec requirement 5)
function buildSagittalNilMessage(sagConf, measurements) {
  const cva = measurements?.cvaAngle;
  const thor = measurements?.thoracicAngle;
  const hasSubthreshold = (cva !== null && cva < 58) ||
    (thor !== null && thor > 40) ||
    (measurements?.lumbarProxy !== null && Math.abs(measurements?.lumbarProxy || 0) > 2);

  if (sagConf < 50) {
    return "Sagittal assessment confidence is limited — landmark visibility was reduced. Clinical measurement is recommended for accurate evaluation.";
  }
  if (hasSubthreshold) {
    return "Mild postural variations observed but below the threshold for clinical significance at this assessment. These may represent low-level postural adaptation patterns. Reassess if symptoms are present.";
  }
  return "No major sagittal deviations detected in this assessment. This finding reflects the current static posture snapshot — functional and dynamic assessment is recommended for a complete picture.";
}
function buildFindings(lm, view, m) {
  if (!lm || !m) return [];
  const out = [];
  const isLat = view === "left" || view === "right";

  // ── Helper: add finding using new structured engine ────────────────────────
  const add = (params) => {
    const f = buildFinding(params);
    if (f) out.push(f);
  };

  // ── Helper: legacy add (for pattern summaries — keep existing format) ──────
  const addLegacy = (region, text, severity, correction, icd="M99.0", detail="", norm="") => {
    out.push({ region, text, plain: text, severity, correction, icd, detail, norm,
      confidenceScore: 70, clinicalSignificance: "moderate" });
  };

  // ── Clinical firing gate (single source of truth) ──────────────────────────
  // Two-tier visibility model (as documented at CLINICAL_MIN_VIS): MIN_VIS (0.45)
  // is enough to DRAW a landmark, but a frontal-plane clinical finding only FIRES
  // when every key landmark for it meets the higher CLINICAL_MIN_VIS (0.65) bar.
  // Sagittal findings keep their own relaxed gates because far-side landmarks are
  // inherently low-visibility in a true lateral view.
  const clinVis = (...idx) => idx.every(i => (lm[i]?.visibility || 0) >= CLINICAL_MIN_VIS);

  // ══════════════════════════════════════════════════════════════════════════
  // FRONTAL VIEW FINDINGS
  // ══════════════════════════════════════════════════════════════════════════
  if (!isLat) {

    // ── MODULE F4: Shoulder Height Asymmetry ────────────────────────────────
    {
      const f4 = m.f4;
      if (f4 && !f4.suppressed && f4.severityCode > 0 && clinVis(11,12)) {
        const sevMap = ["mild","mild","moderate","high"];
        add({
          region: "Shoulder Girdle",
          findingName: f4.finding,
          severity: sevMap[f4.severityCode] || "mild",
          confidenceScore: f4.confidence,
          clinicalSignificance: f4.severityCode >= 3 ? "high" : "moderate",
          interpretation: `${f4.clinicalCorrelation} ${f4.functionalRelevance||""} Reliability: ${f4.reliabilityLabel}.`,
          musclePattern: MUSCLE_PATTERNS.shoulder,
          functionalCorrelation: FUNCTIONAL_CORRELATIONS.shoulder,
          objectiveAssessments: f4.suggestedNext,
          correction: `Suggested next: ${f4.suggestedNext.join("; ")}.`,
          icd: "M62.89",
          norm: "<2° shoulder line angle",
        });
      } else if (!f4 || f4.suppressed) {
        if (m.shoulderAngle !== null) {
          const abs = Math.abs(m.shoulderAngle);
          const sev = classifySeverity(abs, POSTURE_THRESHOLDS.shoulderAngle);
          const rel = checkLandmarkReliability(lm, LANDMARK_GROUPS.shoulder, CLINICAL_MIN_VIS);
          const conf = getLandmarkConfidence(lm, LANDMARK_GROUPS.shoulder);
          if (sev && rel.reliable) {
            // Use direct Y-comparison for consistency (Magee/Kendall standard)
            const side = (lm[11]&&lm[12]) ? (lm[11].y < lm[12].y ? "Left" : "Right") : (m.shoulderAngle < 0 ? "Left" : "Right");
            add({
              region: "Shoulder Girdle",
              findingName: `Possible ${side} shoulder elevation (${abs.toFixed(1)}°) — low confidence`,
              severity: "mild", confidenceScore: Math.min(conf,55), clinicalSignificance: "low",
              interpretation: "Low landmark confidence. Findings should be confirmed clinically.",
              musclePattern: MUSCLE_PATTERNS.shoulder, functionalCorrelation: FUNCTIONAL_CORRELATIONS.shoulder,
              objectiveAssessments: OBJECTIVE_ASSESSMENTS.shoulder,
              correction: "Improve image quality and repeat. Confirm clinically.",
              icd: "M62.89", norm: "<2° shoulder line angle",
            });
          }
        }
      }
    }

    // ── MODULE F10 — ASIS Height Difference + F11 — Pelvic Obliquity ──────────
    // Uses pre-computed F10/F11 results from measureLandmarks.
    // Conservative wording — no SIJ/LLD/scoliosis diagnosis, no treatment.
    {
      const f10 = m.f10;
      const f11 = m.f11;

      // F10: ASIS Height Difference
      if (f10 && !f10.suppressed && f10.severityCode > 0 && clinVis(23,24)) {
        const sevMap = ["mild","mild","moderate","high"]; // severityCode 1=Mild,2=Moderate,3=High
        add({
          region: "Pelvis",
          findingName: f10.finding,
          severity: sevMap[f10.severityCode] || "low",
          confidenceScore: f10.confidence,
          clinicalSignificance: f10.severityCode >= 3 ? "high" : "moderate",
          interpretation:
            `${f10.clinicalCorrelation} ` +
            `${f10.functionalRelevance || ""} ` +
            `Findings should be confirmed clinically with pelvic landmark palpation.`,
          musclePattern: MUSCLE_PATTERNS.pelvis,
          functionalCorrelation:
            `${f10.elevatedSide} ASIS elevation may be associated with asymmetric lumbopelvic load distribution. ` +
            `Findings should be confirmed clinically before clinical conclusions are drawn.`,
          objectiveAssessments: [
            "Pelvic landmark palpation (ASIS, PSIS, iliac crest bilateral)",
            "Leg length assessment (true and apparent)",
            "Weight distribution assessment (single-leg stance observation)",
            f10.severityCode >= 2 ? "Gait analysis" : null,
            f10.severityCode >= 2 ? "Functional squat assessment" : null,
          ].filter(Boolean),
          correction:
            `Suggested next assessment: ${(f10.suggestedNext||[]).join("; ")}. ` +
            `Findings should be confirmed clinically before management decisions.`,
          icd: "M62.89",
          norm: "<0.8% frame height ASIS difference (uncalibrated % of frame — not cm; camera-distance dependent)",
        });
      }

      // F11: Pelvic Obliquity
      if (f11 && !f11.suppressed && f11.severityCode > 0 && clinVis(23,24)) {
        const sevMap = ["mild","mild","moderate","high"]; // severityCode 1=Mild,2=Moderate,3=High
        add({
          region: "Pelvis",
          findingName: f11.finding,
          severity: sevMap[f11.severityCode] || "low",
          confidenceScore: f11.confidence,
          clinicalSignificance: f11.severityCode >= 3 ? "high" : "moderate",
          interpretation:
            `${f11.clinicalCorrelation} ` +
            `Pattern: ${f11.obliquityPattern}. ` +
            `Findings should be confirmed clinically with pelvic landmark palpation.`,
          musclePattern: MUSCLE_PATTERNS.pelvis,
          functionalCorrelation:
            `${f11.functionalRelevance || "Pelvic obliquity may be associated with asymmetric lower limb loading."} ` +
            `Findings should be confirmed clinically before conclusions are drawn.`,
          objectiveAssessments: [
            "Pelvic landmark palpation (ASIS, PSIS, iliac crest, greater trochanter)",
            "Leg length assessment (true and apparent)",
            "Gait analysis",
            "Weight distribution assessment",
            f11.severityCode >= 2 ? "Functional squat assessment" : null,
            f11.severityCode >= 2 ? "Lumbar spine assessment" : null,
          ].filter(Boolean),
          correction:
            `Suggested next assessment: ${(f11.suggestedNext||[]).join("; ")}. ` +
            `Findings should be confirmed clinically before management decisions.`,
          icd: "M62.89",
          norm: "<2° pelvic obliquity",
        });
      }

      // Fallback: F11 suppressed but raw pelvisAngle detectable — report with low confidence flag
      if ((!f11 || f11.suppressed) && m.pelvisAngle !== null && Math.abs(m.pelvisAngle) > 3) {
        const abs = Math.abs(m.pelvisAngle);
        const conf = f11?.confidence ?? 40;
        add({
          region: "Pelvis",
          findingName: `Possible pelvic obliquity — low landmark confidence (${abs.toFixed(1)}°)`,
          severity: "mild",
          confidenceScore: conf,
          clinicalSignificance: "low",
          interpretation:
            `Landmark confidence is insufficient for reliable pelvic assessment. ` +
            `Findings should be confirmed clinically with hands-on pelvic landmark palpation.`,
          musclePattern: MUSCLE_PATTERNS.pelvis,
          functionalCorrelation: "Low-confidence screen only. Repeat with improved image quality.",
          objectiveAssessments: ["Pelvic landmark palpation (ASIS, PSIS bilateral)"],
          correction: "Improve image quality and repeat. Confirm clinically.",
          icd: "M62.89",
          norm: "<2° pelvic obliquity",
        });
      }
    }

    // ── Head/cervical lateral tilt ───────────────────────────────────────────
    if (m.headTiltAngle !== null) {
      const abs = Math.abs(m.headTiltAngle);
      const sev = classifySeverity(abs, POSTURE_THRESHOLDS.headTilt);
      const rel = checkLandmarkReliability(lm, [7, 8, 0], CLINICAL_MIN_VIS);
      const conf = getLandmarkConfidence(lm, [7, 8, 0]);
      if (sev && rel.reliable) {
        const side = m.headTiltSide || "";
        add({
          region: "Head / Cervical",
          findingName: `Head tilt — ${side} ear lower (${abs.toFixed(1)}°)`,
          severity: sev,
          confidenceScore: conf,
          clinicalSignificance: "moderate",
          interpretation: INTERPRETATIONS.headTilt(side, abs),
          musclePattern: MUSCLE_PATTERNS.headTilt,
          functionalCorrelation: FUNCTIONAL_CORRELATIONS.headTilt,
          objectiveAssessments: OBJECTIVE_ASSESSMENTS.headTilt,
          correction: "Assess C1–C2 rotation restriction. Inhibit ipsilateral SCM + scalene. Activate contralateral deep neck flexors.",
          icd: "M43.6",
          norm: "<3° head lateral tilt",
        });
      }
    }

    // ── MODULE F7: Trunk Shift ───────────────────────────────────────────────
    {
      const f7 = m.f7;
      if (f7 && !f7.suppressed && f7.severityCode > 0 && clinVis(11,12,23,24)) {
        const sevMap = ["mild","mild","moderate","high"];
        add({
          region: "Thoracic",
          findingName: f7.finding,
          severity: sevMap[f7.severityCode] || "mild",
          confidenceScore: f7.confidence,
          clinicalSignificance: f7.severityCode >= 3 ? "high" : "moderate",
          interpretation: `${f7.clinicalCorrelation} ${f7.functionalRelevance||""} Reliability: ${f7.reliabilityLabel}.`,
          musclePattern: MUSCLE_PATTERNS.trunkShift,
          functionalCorrelation: FUNCTIONAL_CORRELATIONS.trunkShift,
          objectiveAssessments: f7.suggestedNext,
          correction: `Suggested next: ${f7.suggestedNext.join("; ")}.`,
          icd: "M62.89",
          norm: "<1% trunk shift relative to pelvis",
        });
      } else if (!f7 || f7.suppressed) {
        if (m.trunkLateralShift !== null) {
          const abs = Math.abs(m.trunkLateralShift);
          const sev = classifySeverity(abs, POSTURE_THRESHOLDS.trunkLateralShift);
          const rel = checkLandmarkReliability(lm, [...LANDMARK_GROUPS.shoulder, ...LANDMARK_GROUPS.hip], CLINICAL_MIN_VIS);
          const conf = getLandmarkConfidence(lm, [...LANDMARK_GROUPS.shoulder, ...LANDMARK_GROUPS.hip]);
          if (sev && rel.reliable) {
            // In anterior view, positive = image right = patient LEFT
            const side = m.trunkLateralShift > 0 ? (view === "anterior" ? "Left" : "Right") : (view === "anterior" ? "Right" : "Left");
            add({
              region: "Thoracic",
              findingName: `Possible trunk shift ${side.toLowerCase()} — low confidence (${abs.toFixed(1)}%)`,
              severity: "mild", confidenceScore: Math.min(conf,55), clinicalSignificance: "low",
              interpretation: "Low landmark confidence. Findings should be confirmed clinically.",
              musclePattern: MUSCLE_PATTERNS.trunkShift, functionalCorrelation: FUNCTIONAL_CORRELATIONS.trunkShift,
              objectiveAssessments: OBJECTIVE_ASSESSMENTS.trunkShift,
              correction: "Improve image quality and repeat. Confirm clinically.",
              icd: "M62.89", norm: "<1% trunk shift relative to pelvis",
            });
          }
        }
      }
    }

    // ── Knee frontal plane (valgus/varus) ────────────────────────────────────
    const kneeLandmarks = [23, 24, 25, 26, 27, 28];
    const kneeRel = checkLandmarkReliability(lm, kneeLandmarks, CLINICAL_MIN_VIS);
    const kneeConf = getLandmarkConfidence(lm, kneeLandmarks);
    if (kneeRel.reliable) {
      const lv = m.leftKneeFrontal, rv = m.rightKneeFrontal;
      const lSev = lv !== null ? classifySeverity(Math.abs(lv), POSTURE_THRESHOLDS.kneeFrontal) : null;
      const rSev = rv !== null ? classifySeverity(Math.abs(rv), POSTURE_THRESHOLDS.kneeFrontal) : null;
      if (lSev || rSev) {
        const bilateral = lSev && rSev;
        if (bilateral) {
          const worseAbs = Math.max(Math.abs(lv), Math.abs(rv));
          const worseSide = Math.abs(lv) >= Math.abs(rv) ? "L" : "R";
          const lDir = lv >= 0 ? "medial" : "lateral";
          const rDir = rv >= 0 ? "medial" : "lateral";
          const pattern = (lDir === rDir) ? lDir : "asymmetric";
          const worstSev = (lSev === "high" || rSev === "high") ? "moderate" : "low";
          add({
            region: "Knee Alignment Tendency",
            findingName: `OBSERVATION: Bilateral knee ${pattern} tendency — ${worseSide} worse (L:${Math.abs(lv).toFixed(1)}° R:${Math.abs(rv).toFixed(1)}°). Clinical confirmation required.`,
            severity: worstSev,
            confidenceScore: kneeConf,
            clinicalSignificance: worstSev,
            interpretation: INTERPRETATIONS.kneeFrontal("Bilateral", worseAbs, pattern),
            musclePattern: MUSCLE_PATTERNS.kneeFrontal,
            functionalCorrelation: FUNCTIONAL_CORRELATIONS.kneeFrontal,
            objectiveAssessments: OBJECTIVE_ASSESSMENTS.kneeFrontal,
            correction: "General activities some find helpful (discuss with a professional first): glute-med work (e.g. clamshells, lateral band walks), quadriceps/VMO strengthening, single-leg balance with mirror feedback, and foot-arch activation.",
            icd: "M21.0", norm: "<6° knee frontal deviation",
            _derivedFrom: ["Hip (lm23/24)", "Knee (lm25/26)", "Ankle (lm27/28)"],
          });
        } else if (lSev) {
          const pattern = lv < 0 ? "medial" : "lateral";
          add({
            region: "Knee Alignment Tendency",
            findingName: `OBSERVATION: Left knee ${pattern} tendency — hip-knee-ankle alignment (${Math.abs(lv).toFixed(1)}°). Clinical confirmation required.`,
            severity: lSev, confidenceScore: kneeConf, clinicalSignificance: lSev,
            interpretation: INTERPRETATIONS.kneeFrontal("Left", Math.abs(lv), pattern),
            musclePattern: MUSCLE_PATTERNS.kneeFrontal,
            functionalCorrelation: FUNCTIONAL_CORRELATIONS.kneeFrontal,
            objectiveAssessments: OBJECTIVE_ASSESSMENTS.kneeFrontal,
            correction: lv < 0 ? "Glute med + VMO activation. Foot tripod." : "Hip ER strengthening. ITB/TFL SMR.",
            icd: "M21.0", norm: "<6° knee frontal deviation",
            _derivedFrom: ["Hip (lm23/24)", "Knee (lm25/26)", "Ankle (lm27/28)"],
          });
        } else if (rSev) {
          const pattern = rv < 0 ? "medial" : "lateral";
          add({
            region: "Knee Alignment Tendency",
            findingName: `OBSERVATION: Right knee ${pattern} tendency — hip-knee-ankle alignment (${Math.abs(rv).toFixed(1)}°). Clinical confirmation required.`,
            severity: rSev, confidenceScore: kneeConf, clinicalSignificance: rSev,
            interpretation: INTERPRETATIONS.kneeFrontal("Right", Math.abs(rv), pattern),
            musclePattern: MUSCLE_PATTERNS.kneeFrontal,
            functionalCorrelation: FUNCTIONAL_CORRELATIONS.kneeFrontal,
            objectiveAssessments: OBJECTIVE_ASSESSMENTS.kneeFrontal,
            correction: rv < 0 ? "Glute med + VMO activation. Foot tripod." : "Hip ER strengthening. ITB/TFL SMR.",
            icd: "M21.0", norm: "<6° knee frontal deviation",
            _derivedFrom: ["Hip (lm23/24)", "Knee (lm25/26)", "Ankle (lm27/28)"],
          });
        }
      }
    }

    // ── UCS index — lateral/sagittal view only ──────────────────────────────
    // UCS requires CVA (sagittal landmark) — never diagnose from photo alone
    // UCS in frontal view — handled via sagittal engine only
    if (false && m.ucsIndex !== null) { // dead code removed
      const sev = classifySeverity(m.ucsIndex, POSTURE_THRESHOLDS.ucsIndex);
      const conf = getLandmarkConfidence(lm, LANDMARK_GROUPS.upperBody);
      if (sev) {
        add({
          region: "Upper Crossed Pattern Tendency",
          findingName: `OBSERVATION: Upper-chain posture findings — may be consistent with upper crossed pattern characteristics (index ${m.ucsIndex.toFixed(1)}). Clinical confirmation required.`,
          severity: sev, confidenceScore: conf,
          clinicalSignificance: sev === "high" ? "high" : "moderate",
          interpretation: INTERPRETATIONS.ucs(m.ucsIndex),
          musclePattern: MUSCLE_PATTERNS.ucs,
          functionalCorrelation: FUNCTIONAL_CORRELATIONS.ucs,
          objectiveAssessments: OBJECTIVE_ASSESSMENTS.ucs,
          correction: "General activities often linked to this pattern (not a prescription — discuss with a professional first): easing tension in the upper trapezius, SCM and pec minor; gentle deep-neck-flexor, lower-trapezius and serratus work; and mid-back (thoracic) extension mobility.",
          icd: "M62.9", norm: "UCS index <0.6",
        });
      }
    }

    // ── Functional LLD ───────────────────────────────────────────────────────
    if (m.lldProxy !== null) {
      const sev = classifySeverity(m.lldProxy, POSTURE_THRESHOLDS.lldProxy);
      const conf = getLandmarkConfidence(lm, [...LANDMARK_GROUPS.hip, ...LANDMARK_GROUPS.ankle]);
      if (sev) {
        add({
          region: "Leg Length",
          findingName: `OBSERVATION: Ankle height asymmetry (~${m.lldProxy.toFixed(0)}mm, ${m.lldSide || ""} side lower) — possible leg length asymmetry. Clinical confirmation essential.`,
          severity: sev, confidenceScore: Math.min(conf, 55), // cap — proxy measure only
          clinicalSignificance: "low",
          interpretation: `OBSERVATION ONLY. Ankle height asymmetry observed (~${m.lldProxy.toFixed(0)}mm). This is a camera-based proxy measurement only and cannot diagnose leg length discrepancy. Possible contributors: functional pelvic obliquity, hip asymmetry, habitual weight-bearing pattern, or structural length difference. Clinical measurement is essential before any orthotic intervention.`,
          musclePattern: MUSCLE_PATTERNS.pelvis,
          functionalCorrelation: FUNCTIONAL_CORRELATIONS.pelvis,
          objectiveAssessments: OBJECTIVE_ASSESSMENTS.pelvis,
          correction: "Recommended confirmation: tape measure ASIS→medial malleolus (true LLD), tape measure umbilicus→medial malleolus (apparent LLD), single-leg stance observation, Trendelenburg test. Clinical assessment required before any intervention.",
          icd: "M99.0", norm: "Ankle height asymmetry <5mm (proxy only — confirm clinically)",
        });
      }
    }

    // ── Waist asymmetry / scoliosis screen ──────────────────────────────────
    // Waist triangle: Kendall standard — assessed from posterior view only
    if ((view==="posterior"||view==="back") && m.waistTriangleAsymmetry !== null) {
      const sev = classifySeverity(m.waistTriangleAsymmetry, POSTURE_THRESHOLDS.waistAsymmetry);
      const conf = getLandmarkConfidence(lm, [...LANDMARK_GROUPS.shoulder, ...LANDMARK_GROUPS.hip]);
      if (sev) {
        const side = m.waistTriangleSide || "";
        add({
          region: "Lateral Trunk Deviation Screen",
          findingName: `OBSERVATION: Waist triangle asymmetry — ${side} narrower (${m.waistTriangleAsymmetry.toFixed(1)}%). Cannot diagnose scoliosis from photograph.`,
          severity: sev, confidenceScore: conf, clinicalSignificance: sev,
          interpretation: `Waist triangle asymmetry of ${m.waistTriangleAsymmetry.toFixed(1)}% may be associated with lateral trunk deviation or spinal curvature. This finding alone is insufficient to diagnose scoliosis — Adam's forward bend test and clinical assessment are required.`,
          musclePattern: MUSCLE_PATTERNS.trunkShift,
          functionalCorrelation: FUNCTIONAL_CORRELATIONS.trunkShift,
          objectiveAssessments: ["Adam's forward bend test — observe for rib hump", "Trunk lateral shift assessment", "Standing AP X-ray if structural scoliosis suspected"],
          correction: "Recommended confirmation: Adam's forward bend test (rib hump screen), trunk lateral shift assessment, posterior view posture assessment. Clinical assessment required before lateral curvature conclusions.",
          icd: "M99.0", norm: "Waist triangle asymmetry <4% (screen only — clinical confirmation required)",
        });
      }
    }

    // ── Frontal Plane Tibial Alignment Deviation (estimated — dedicated landmarks required) ─────
    const tibL = m.tibialVarumL ?? 0, tibR = m.tibialVarumR ?? 0;
    if (tibL > 0 || tibR > 0) {
      const maxTib = Math.max(tibL, tibR);
      const sev = classifySeverity(maxTib, POSTURE_THRESHOLDS.tibialVarum);
      const conf = getLandmarkConfidence(lm, LANDMARK_GROUPS.lowerBody);
      if (sev) {
        const worse = tibL > tibR ? "Left" : "Right";
        add({
          region: "Frontal Plane Tibial Alignment",
          findingName: `Frontal Plane Tibial Alignment Deviation (Estimated — dedicated tibial landmarks required for confirmation): ${worse} worse (L:${tibL.toFixed(1)}° R:${tibR.toFixed(1)}°). Clinical confirmation required.`,
          severity: "mild", confidenceScore: Math.min(conf, 45), clinicalSignificance: "low",
          interpretation: `OBSERVATION ONLY. Tibial segment angle asymmetry estimated from knee-to-ankle vector. This measurement is highly sensitive to patient rotation and camera angle — cannot diagnose tibial bowing or Tibial Alignment Observation: Varum Tendency (Estimated) from a photograph. Dedicated tibial landmarks (Tibial Tuberosity, Mid-Shaft, Malleoli) required for clinical confirmation. Weight-bearing lower-limb X-ray is the definitive assessment.`,
          musclePattern: null,
          functionalCorrelation: "May be associated with altered foot pronation patterns and medial knee loading if confirmed clinically.",
          objectiveAssessments: ["Subtalar neutral assessment", "Foot posture index", "Weight-bearing lower limb alignment X-ray if structural deviation suspected", "Tibial torsion clinical assessment"],
          correction: "Assess subtalar neutral. Foot orthotic with lateral wedge if pronation-driven. Tibialis posterior strengthening.",
          icd: "M21.1", norm: "<5° tibial segment angle (estimated; confirm clinically)",
          _derivedFrom: ["Knee (lm25/26)", "Ankle (lm27/28)"],
          _requiresVerification: true,
        });
      }
    }

  } // end if(!isLat) — frontal findings

  // ══════════════════════════════════════════════════════════════════════════
  // SAGITTAL VIEW FINDINGS
  // ══════════════════════════════════════════════════════════════════════════
  if (isLat) {
    // In lateral view, far-side landmarks are naturally low-visibility — use visible side only
    const visibleSagLandmarks = LANDMARK_GROUPS.sagittal.filter(i => (lm[i]?.visibility || 0) >= MIN_VIS);
    const sagRel = visibleSagLandmarks.length >= 3
      ? { reliable: true, reason: "" }
      : checkLandmarkReliability(lm, LANDMARK_GROUPS.sagittal);
    const sagConf = getLandmarkConfidence(lm, LANDMARK_GROUPS.sagittal);

    // ── SAGITTAL CHAIN ENGINE ─────────────────────────────────────────────────
    // Uses plumb-line deviations in cm (Kendall thresholds).
    // Falls back to angle/proxy measures when plumb data unavailable.
    // Confidence is taken from sagChain.confidence (0–100).
    // Movement chain: FHP → rounded shoulder → thoracic kyphosis → APT → recurvatum.

    const sagChainConf = m.sagChain?.confidence ?? 60;
    const sagLateral = m.sagChain?.isTrueLateral ?? false;

    // ── 1. Forward Head Posture ───────────────────────────────────────────────
    // Primary: CVA < 52° (Neiva et al. 2009). Secondary: ear >2cm anterior to shoulder.
    // Thresholds: mild CVA 48–52°, moderate 44–48°, severe <44° (Ruivo 2017)
    if (m.cvaAngle !== null) {
      // In lateral view, use only the visible-side ear and shoulder for reliability
      const cvaVisLandmarks = [7, 8, 11, 12].filter(i => (lm[i]?.visibility || 0) >= MIN_VIS);
      const cvaRel = cvaVisLandmarks.length >= 2
        ? { reliable: true, reason: "" }
        : checkLandmarkReliability(lm, [7, 8, 11, 12]);
      const cvaConf = getLandmarkConfidence(lm, cvaVisLandmarks.length >= 2 ? cvaVisLandmarks : [7, 8, 11, 12]);
      const fhpCm = m.fhpDevCm ?? m.fhpFromPlumb ?? null;

      // Threshold: mild at <54° (Neiva 2009 — normal >54°); lowered confidence gate for sagittal
      if (m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.mild && cvaConf >= 28) {
        const sev = m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.severe ? "high"
          : m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.moderate ? "moderate" : "mild";
        const loadStr = m.cervicalLoadKg ? ` Estimated cervical load increase: ~${m.cervicalLoadKg.toFixed(1)}kg (proxy, estimated cervical extensor load (proxy — not a validated estimated cervical load proxy formula)).` : "";
        const fhpCmStr = fhpCm !== null && fhpCm > 0 ? ` Ear ~${fhpCm.toFixed(1)}cm anterior to acromion.` : "";

        add({
          clusterBoost: 15, // sagittal provisional — refined by clustering step
          region: "Cervical / CVA",
          findingName: `Forward head tendency — CVA ${m.cvaAngle.toFixed(1)}° (normal >55° (Yip et al. 2008))`,
          severity: sev, confidenceScore: cvaConf,
          clinicalSignificance: sev,
          interpretation: `Reduced craniovertebral angle (${m.cvaAngle.toFixed(1)}°) may be consistent with a forward head posture tendency.${fhpCmStr} This pattern may be associated with suboccipital and cervical extensor overactivity, and reduced deep cervical flexor contribution. Static posture alone is insufficient to confirm this.${loadStr} (Screen note: CVA here is a 2D photo proxy using ear→acromion; the validated clinical method measures tragus→C7 spinous process — confirm with goniometry.)`,
          possibleMusclePatterns: {
            tight: ["Suboccipital extensors", "Cervical extensors (semispinalis, splenius)","Sternocleidomastoid","Pectoralis minor"],
            weak:  ["Deep cervical flexors (longus colli, longus capitis)","Lower trapezius","Serratus anterior"],
          },
          functionalCorrelation: "May increase cervical extensor loading during prolonged sitting and screen use. May reduce cervicothoracic mobility during shoulder flexion tasks.",
          recommendedObjectiveAssessment: [
            "Craniovertebral angle measurement (goniometer — seated)",
            "Craniocervical flexion test (CCFT) — deep cervical flexor capacity",
            "Cervical AROM — flexion/extension bilateral",
            "Upper cervical passive accessory movement testing (C0–C2)",
          ],
          correction: `General activities some find helpful (discuss with a professional first): gentle chin-nod (deep-neck-flexor) movements, mid-back extension mobility over a foam roller, pec-minor stretching, and reviewing screen/monitor height for ergonomics.${loadStr}`,
          icd: "M43.1", norm: "CVA >52°",
        });

        // ── Posture chain note: FHP → thoracic ──────────────────────────────
        // Only add chain finding if thoracic finding won't fire separately
        const willFireKyphosis = m.thoracicAngle !== null && m.thoracicAngle > POSTURE_THRESHOLDS.thoracicAngle.mild;
        if (!willFireKyphosis && sev !== "mild" && m.thoracicAngle !== null && m.thoracicAngle > 40) {
          add({
          clusterBoost: 15, // sagittal provisional — refined by clustering step
            region: "Upper Crossed Syndrome (UCS)",
            findingName: `Possible UCS pattern — forward head (CVA ${m.cvaAngle.toFixed(0)}°) + thoracic tendency (${m.thoracicAngle.toFixed(0)}°)`,
            severity: sev, confidenceScore: Math.min(cvaConf, sagChainConf),
            clinicalSignificance: sev,
            interpretation: `The combination of reduced CVA and increased thoracic curvature may be consistent with characteristics of the upper crossed pattern (Janda). Possible overactivity: upper trapezius, levator scapulae, SCM, pectoralis minor. Possible underactivity: deep cervical flexors, lower trapezius, serratus anterior. Clinical muscle testing is required to confirm this pattern.`,
            possibleMusclePatterns: MUSCLE_PATTERNS.ucs,
            functionalCorrelation: FUNCTIONAL_CORRELATIONS.ucs,
            recommendedObjectiveAssessment: OBJECTIVE_ASSESSMENTS.ucs,
            correction: "General activities often linked to this pattern (not a prescription — discuss with a professional first): easing tension in the upper trapezius, SCM and pec minor; gentle deep-neck-flexor, lower-trapezius and serratus work; and mid-back (thoracic) extension mobility.",
            icd: "M62.8", norm: "CVA >52° + thoracic kyphosis 20–45°",
          });
        }
      }
    }

    // ── 2. Rounded Shoulder Tendency ─────────────────────────────────────────
    // Acromion anterior to plumb by >2cm = rounded shoulder tendency.
    // If CVA also reduced: correlate as UCS chain.
    if (m.sagShoulderShift !== null && m.sagShoulderShift > 2.0 && sagChainConf >= 28) {
      const sev = m.sagShoulderShift > 5 ? "high" : m.sagShoulderShift > 3 ? "moderate" : "mild";
      const fhpAlso = m.cvaAngle !== null && m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.mild;
      add({
        region: "Shoulder / Rounded Tendency",
        findingName: `Anterior shoulder position tendency (~${m.sagShoulderShift.toFixed(1)}cm anterior to plumb)`,
        severity: sev, confidenceScore: sagConf,
        clinicalSignificance: sev,
        interpretation: `Acromion positioned ${m.sagShoulderShift.toFixed(1)}cm anterior to the lateral malleolus plumb line may be consistent with a rounded shoulder tendency.` +
          (fhpAlso ? " This finding combined with reduced CVA may reflect an upper crossed pattern tendency (Janda)." : "") +
          " Possible contributing factors include pectoralis minor shortening and reduced serratus anterior contribution. Clinical assessment is required to confirm.",
        possibleMusclePatterns: {
          tight: ["Pectoralis minor","Pectoralis major","Subscapularis"],
          weak:  ["Serratus anterior","Lower trapezius","Middle trapezius"],
        },
        functionalCorrelation: "May alter scapulohumeral rhythm and reduce subacromial space during shoulder elevation tasks.",
        recommendedObjectiveAssessment: [
          "Pectoralis minor length test (supine — coracoid offset from table)",
          "Serratus anterior strength (push-up plus)",
          "Shoulder passive range of motion — horizontal adduction",
        ],
        correction: "General activities some find helpful (discuss with a professional first): gentle pec-minor stretching (corner/doorframe), serratus-anterior wall slides, and lower-trapezius work.",
        icd: "M79.2", norm: "Acromion within 2cm of plumb line",
      });
    }

    // ── 3. Thoracic Kyphosis ─────────────────────────────────────────────────
    // Lateral view: lower effective threshold to 40° because trunk-lean proxy underestimates
    // kyphosis when sagittal landmarks are used instead of bilateral midpoints.
    if (m.thoracicAngle !== null && m.thoracicAngle > 45) {
      const sev = m.thoracicAngle > 58 ? "high" : m.thoracicAngle > 50 ? "moderate" : "mild";
      const visShHip = [...LANDMARK_GROUPS.shoulder, ...LANDMARK_GROUPS.hip].filter(i=>(lm[i]?.visibility||0)>=MIN_VIS);
      const conf = Math.max(55, getLandmarkConfidence(lm, visShHip.length>=2?visShHip:[...LANDMARK_GROUPS.shoulder,...LANDMARK_GROUPS.hip]));
      if (true) {
        const shiftStr = m.sagShoulderShift !== null
          ? ` (shoulder ~${m.sagShoulderShift.toFixed(1)}cm anterior to plumb)` : "";
        add({
          clusterBoost: 15, // sagittal provisional — refined by clustering step
          region: "Thoracic Kyphosis (Trunk Lean Est.)",
          findingName: `Increased thoracic curvature tendency (${m.thoracicAngle.toFixed(1)}°, normal 20–45°)`,
          severity: sev, confidenceScore: conf, clinicalSignificance: sev,
          interpretation: `Increased thoracic curvature (${m.thoracicAngle.toFixed(1)}°)${shiftStr} may be consistent with a kyphotic tendency. This may be associated with possible pectoralis major/minor overactivity and reduced middle/lower trapezius and thoracic extensor contribution. ` +
            (m.cvaAngle !== null && m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.mild
              ? "The combination with reduced CVA may be consistent with an upper crossed pattern tendency (Janda)."
              : "Static posture alone cannot confirm these muscle contributions."),
          possibleMusclePatterns: MUSCLE_PATTERNS.kyphosis,
          functionalCorrelation: "May reduce thoracic extension mobility and alter rib cage mechanics during breathing. May contribute to impingement risk during overhead tasks.",
          recommendedObjectiveAssessment: OBJECTIVE_ASSESSMENTS.kyphosis,
          correction: "General activities some find helpful (discuss with a professional first): gentle mid-back (thoracic) extension mobility (e.g. over a foam roller), pec stretching, lower-trapezius work, and posture awareness.",
          icd: "M40.0", norm: "Thoracic kyphosis 20–45°",
        });
      }
    }

    // ── 4. Pelvic Tilt (sagittal) ────────────────────────────────────────────
    // Primary: plumb-line hip deviation. Fallback: lumbarProxy.
    const pelvisCm = m.sagPelvicShift ?? null;
    const pelvisProxy = m.lumbarProxy ?? null;

    // Use cm deviation if available, otherwise use normalised proxy
    const pelvisValue = pelvisCm !== null ? pelvisCm : (pelvisProxy !== null ? pelvisProxy : null);
    const pelvisIsCm  = pelvisCm !== null;

    if (pelvisValue !== null && Math.abs(pelvisValue) > (pelvisIsCm ? 2.0 : 5.0)) {
      const abs = Math.abs(pelvisValue);
      const sev = pelvisIsCm
        ? (abs > 5 ? "high" : abs > 3 ? "moderate" : "mild")
        : classifySeverity(abs, POSTURE_THRESHOLDS.lumbarProxy) ?? "mild";
      // In lateral view, at least one hip+knee should be visible — use relaxed gate
      const visHipKnee = [...LANDMARK_GROUPS.hip,...LANDMARK_GROUPS.knee].filter(i=>(lm[i]?.visibility||0)>=MIN_VIS);
      const visHipKneeRelaxed = [...LANDMARK_GROUPS.hip,...LANDMARK_GROUPS.knee].filter(i=>(lm[i]?.visibility||0)>=0.25);
      const conf = Math.max(55, getLandmarkConfidence(lm, visHipKnee.length>=1?visHipKnee:[...LANDMARK_GROUPS.hip,...LANDMARK_GROUPS.knee]));
      if (sev && (sagRel.reliable || visHipKnee.length>=1 || visHipKneeRelaxed.length>=2)) {
        const dir = pelvisValue > 0 ? "Anterior" : "Posterior";
        const measureStr = pelvisIsCm
          ? `hip ~${abs.toFixed(1)}cm ${dir.toLowerCase()} to plumb`
          : `proxy deviation ${abs.toFixed(1)}%`;
        add({
          clusterBoost: 15, // sagittal provisional — refined by clustering step
          region: "Pelvis / Lumbar",
          findingName: `${dir} pelvic tendency (${measureStr})`,
          severity: sev, confidenceScore: conf, clinicalSignificance: sev,
          interpretation: INTERPRETATIONS.lumbar(pelvisValue, dir) + 
            (m.cvaAngle !== null && m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.mild && dir === "Anterior"
              ? " Combined with forward head tendency, this may be consistent with a combined UCS and LCS pattern (Janda)." : ""),
          possibleMusclePatterns: pelvisValue > 0 ? MUSCLE_PATTERNS.lumbarAnt : MUSCLE_PATTERNS.lumbarPost,
          functionalCorrelation: pelvisValue > 0
            ? FUNCTIONAL_CORRELATIONS.lumbarAnt
            : FUNCTIONAL_CORRELATIONS.lumbarPost,
          recommendedObjectiveAssessment: pelvisValue > 0 ? OBJECTIVE_ASSESSMENTS.lumbarAnt : OBJECTIVE_ASSESSMENTS.lumbarPost,
          correction: pelvisValue > 0
            ? "Hip flexor stretch (Thomas test position 30s×3). Glute activation: bridges ×20. Abdominal hollowing."
            : "Hamstring stretch 30s×3. Hip flexor activation. Lumbar extension mobility.",
          icd: "M40.3", norm: pelvisIsCm ? "Hip within 2cm of plumb" : "<5% pelvic tilt proxy",
        });
      }
    }

    // ── Flat back / Hyperlordosis specific labels ────────────────────────────────
    // Flat back = posterior pelvic tendency + reduced kyphosis
    // Hyperlordosis = anterior pelvic tendency + possible lumbar curve
    if (pelvisValue !== null) {
      const isFlatBack = pelvisValue < -2.0 && m.thoracicAngle !== null && m.thoracicAngle < 42;
      const isHyperlordosis = pelvisValue > 3.0;
      if (isFlatBack) {
        add({
          region:"Flat Back Posture",
          findingName:`Flat back tendency — posterior pelvic tilt with reduced spinal curves`,
          severity:"moderate", confidenceScore:60, clinicalSignificance:"moderate",
          interpretation:"Posterior pelvic position with reduced lumbar lordosis and thoracic kyphosis. May be associated with hamstring dominance, inhibited hip flexors and lumbar erectors. Cannot confirm structural flat back from photograph — clinical assessment required.",
          possibleMusclePatterns:{ tight:["Hamstrings","Gluteus Maximus","Abdominals"], weak:["Hip Flexors","Lumbar Extensors","Thoracic Extensors"] },
          functionalCorrelation:"May reduce shock absorption during gait and increase lumbar disc stress in flexion.",
          objectiveAssessments:["Straight leg raise test","Hip flexor length (Thomas test)","Lumbar mobility assessment"],
          correction:"Hip flexor activation, lumbar extension mobility, posterior chain stretching (hamstring), thoracic extension.",
          icd:"M40.4", norm:"Neutral lumbar lordosis 40–60° with balanced pelvic tilt"
        });
      }
      if (isHyperlordosis) {
        add({
          region:"Hyperlordosis Tendency",
          findingName:`Increased lumbar lordosis tendency — hip anterior to plumb ~${Math.abs(pelvisValue).toFixed(1)}cm`,
          severity: pelvisValue > 5 ? "high" : "moderate", confidenceScore:62, clinicalSignificance:"moderate",
          interpretation:"Anterior pelvic position suggests increased lumbar lordosis tendency. May be associated with hip flexor tightness and inhibited deep abdominals (transversus abdominis). Requires clinical palpation and standing X-ray to confirm Cobb L1-S1 angle.",
          possibleMusclePatterns:{ tight:["Hip Flexors (Iliopsoas)","Lumbar Extensors","TFL"], weak:["Gluteus Maximus","Deep Abdominals (TrA)","Hamstrings"] },
          functionalCorrelation:"Increased lumbar compressive load; reduced hip extension mobility; may predispose to lumbar facet irritation.",
          objectiveAssessments:["Thomas test — hip flexor length","Modified Thomas (TFL)","Prone hip extension assessment"],
          correction:"General activities some find helpful (discuss with a professional first): gentle hip-flexor stretching, glute bridges, and core/pelvic-tilt awareness.",
          icd:"M40.4", norm:"Hip within 2cm of plumb (Kendall)"
        });
      }
    }

    // ── UCS sagittal — skip if UCS already in findings from dedicated block ────
    const hasUCS_sag = m.cvaAngle !== null && m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.mild && m.thoracicAngle !== null && m.thoracicAngle > (POSTURE_THRESHOLDS.thoracicAngle.mild - 2);
    const ucsAlreadyAdded = out.some(x => x.region === "Upper Crossed Syndrome" || x.region === "Upper Crossed Syndrome (UCS)" || x.region === "Upper Crossed Pattern Tendency");
    if (hasUCS_sag && sagRel.reliable && !ucsAlreadyAdded) {
      const conf = getLandmarkConfidence(lm, LANDMARK_GROUPS.upperBody);
      const sev = m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.severe ? "moderate" : "low";
      add({
        region: "Upper Crossed Pattern Tendency",
        findingName: `OBSERVATION: Upper-chain posture findings — forward head tendency (CVA ${m.cvaAngle.toFixed(0)}°) + thoracic curvature (${m.thoracicAngle.toFixed(0)}°). Clinical confirmation required.`,
        severity: sev, confidenceScore: conf, clinicalSignificance: sev,
        interpretation: INTERPRETATIONS.ucs(m.ucsIndex || 0.8),
        musclePattern: MUSCLE_PATTERNS.ucs,
        functionalCorrelation: FUNCTIONAL_CORRELATIONS.ucs,
        objectiveAssessments: OBJECTIVE_ASSESSMENTS.ucs,
        correction: "General activities often linked to this pattern (not a prescription — discuss with a professional first): easing tension in the upper trapezius, SCM and pec minor; gentle deep-cervical-flexor, lower-trapezius and serratus work; and mid-back (thoracic) extension mobility.",
        icd: "M62.8", norm: "CVA >52° + thoracic kyphosis 20–45°",
      });
    }

    // ── LCS sagittal — skip if LCS already in findings from dedicated block ────
    const hasLCS_sag = m.lumbarProxy !== null && m.lumbarProxy > POSTURE_THRESHOLDS.lumbarProxy.mild && m.thoracicAngle !== null && m.thoracicAngle > (POSTURE_THRESHOLDS.thoracicAngle.mild - 2);
    const lcsAlreadyAdded = out.some(x => x.region === "Lower Crossed Syndrome" || x.region === "Lower Crossed Syndrome (LCS)" || x.region === "Lower Crossed Pattern Tendency");
    if (hasLCS_sag && sagRel.reliable && !lcsAlreadyAdded) {
      const conf = getLandmarkConfidence(lm, [...LANDMARK_GROUPS.hip, ...LANDMARK_GROUPS.knee]);
      add({
        region: "Lower Crossed Pattern Tendency",
        findingName: `OBSERVATION: Lower-chain posture findings — may be consistent with lower crossed pattern characteristics. Anterior pelvic tendency (${m.lumbarProxy.toFixed(1)}%) + thoracic curvature. Clinical confirmation required.`,
        severity: m.lumbarProxy > POSTURE_THRESHOLDS.lumbarProxy.moderate + 2 ? "high" : "moderate",
        confidenceScore: conf, clinicalSignificance: "moderate",
        interpretation: INTERPRETATIONS.lcs(m.lcsIndex || 0.6),
        musclePattern: MUSCLE_PATTERNS.lcs,
        functionalCorrelation: FUNCTIONAL_CORRELATIONS.lcs,
        objectiveAssessments: OBJECTIVE_ASSESSMENTS.lcs,
        correction: "General activities often linked to this pattern (not a prescription — discuss with a professional first): easing tension in the hip flexors (iliopsoas, rectus femoris) and TFL; and gentle glute (bridges, clamshells) and deep-core work.",
        icd: "M62.8", norm: "Anterior pelvic tilt <5% + thoracic kyphosis <42°",
      });
    }

    // ── Named sagittal pattern (Kendall classification) ───────────────────────
    const hasFHP   = m.cvaAngle !== null && m.cvaAngle < POSTURE_THRESHOLDS.cvaAngle.mild;
    const hasKyph  = m.thoracicAngle !== null && m.thoracicAngle > POSTURE_THRESHOLDS.thoracicAngle.mild;
    const hasLord  = m.lumbarProxy !== null && m.lumbarProxy > POSTURE_THRESHOLDS.lumbarProxy.moderate;
    const hasFlat  = m.lumbarProxy !== null && m.lumbarProxy < -POSTURE_THRESHOLDS.lumbarProxy.mild;
    const hipBehindPlumb  = m.hipExtensionProxy !== null && m.hipExtensionProxy < -4;
    const hasReducedLord  = m.lumbarProxy !== null && m.lumbarProxy < -3;
    const hasSway  = hipBehindPlumb && hasReducedLord;
    const isMilitary = m.thoracicAngle !== null && m.thoracicAngle < 30
      && (m.lumbarProxy === null || Math.abs(m.lumbarProxy) < 3)
      && (m.cvaAngle === null || m.cvaAngle > 58);

    let patternName = null, patternTx = null, patternNote = null, patternSev = "moderate";
    if (hasSway) {
      patternName = "Sway-Back Posture";
      patternTx   = "Activate hip flexors. Shift hips forward over ankles. Lumbar extension mobility.";
      patternNote = "Hips posterior to plumb, flat lumbar, forward trunk lean.";
    } else if (isMilitary) {
      patternName = "Military / Flat-Back";
      patternTx   = "Restore thoracic curve: foam roller extension. Restore lordosis: McKenzie.";
      patternNote = "All spinal curves diminished. Poor sagittal shock absorption.";
    } else if (hasFHP && hasKyph && hasLord) {
      patternName = "Lordotic-Kyphotic (UCS + LCS)"; patternSev = "high";
      patternTx   = "Full postural correction programme addressing UCS and LCS simultaneously.";
      patternNote = `FHP (CVA ${m.cvaAngle.toFixed(0)}°) + increased thoracic curvature (${m.thoracicAngle.toFixed(0)}°) + anterior pelvic tilt. Findings may be consistent with combined upper and lower crossed pattern characteristics.`;
    } else if (hasKyph && hasLord) {
      patternName = "Lordotic-Kyphotic Posture";
      patternTx   = "Thoracic extension + hip flexor stretch + glute activation.";
      patternNote = `Thoracic curvature (${m.thoracicAngle.toFixed(0)}°) and anterior pelvic tilt both elevated.`;
    } else if (hasKyph && !hasLord) {
      patternName = "Kyphotic Posture";
      patternTx   = "Thoracic extension foam roller + lower trapezius + pec minor stretch.";
      patternNote = `Increased thoracic curvature (${m.thoracicAngle.toFixed(0)}°) as primary observation.`;
    } else if (hasLord && !hasKyph) {
      patternName = "Lordotic Posture";
      patternTx   = "Hip flexor inhibition + glute max activation + pelvic tilt awareness.";
      patternNote = "Anterior pelvic tilt tendency without significant thoracic component.";
    } else if (hasFlat) {
      patternName = "Flat-Back Posture";
      patternTx   = "McKenzie extension + lumbar roll support + erector facilitation.";
      patternNote = "Reduced lumbar lordosis. Hamstring and abdominal dominance possible.";
    } else if (hasFHP && !hasKyph) {
      patternName = "Forward Head Posture (Isolated)";
      patternTx   = "DNF activation (chin nod ×10 ×3). Thoracic extension. Ergonomic screen.";
      patternNote = `FHP without significant thoracic kyphosis (CVA ${m.cvaAngle.toFixed(0)}°).`;
    }

    if (patternName && sagRel.reliable) {
      const patConf = getLandmarkConfidence(lm, LANDMARK_GROUPS.sagittal);
      addLegacy(
        `◈ Sagittal Pattern — ${patternName}`,
        `Classification: ${patternName}`,
        patternSev, patternTx, "Z96.89",
        patternNote,
        "Ideal: ear over acromion over greater trochanter over lateral malleolus"
      );
    }

    // ── Sway-back pattern ────────────────────────────────────────────────────
    if (hasSway && sagRel.reliable) {
      addLegacy("Posture Pattern — Sway-Back",
        "Sway-back posture: hips posterior to plumb, flat lumbar",
        "moderate",
        "INHIBIT: hamstrings. ACTIVATE: hip flexors (psoas — standing hip flexion ×15), lumbar extensors (prone hip extension). Postural cue: shift hips forward over ankles.",
        "M40.3");
    }
    if (isMilitary && sagRel.reliable) {
      addLegacy("Posture Pattern — Military / Flat Back",
        `Flat-back posture: reduced thoracic curvature (${m.thoracicAngle.toFixed(0)}°) and lumbar lordosis`,
        "moderate",
        "Thoracic mobility: foam roller extension T4–T8 ×2min. Rib expansion breathing ×10. Restore lordosis: McKenzie press-ups. Cervical retraction.",
        "M40.4");
    }

    // ── Genu Recurvatum (knee hyperextension) ───────────────────────────────
    // Uses best-visibility side: hip→knee→ankle vectors.
    // Reference: Magee 6th ed.: >5° hyperextension in standing = clinically significant.
    {
      const iHip = view==="right"?24:23, iKnee = view==="right"?26:25, iAnk = view==="right"?28:27;
      const sideName = view==="right"?"Right":"Left";
      const recurvatumVis = [iHip,iKnee,iAnk].every(i => (lm[i]?.visibility||0) >= MIN_VIS);
      if (recurvatumVis) {
        const hp=lm[iHip], kp=lm[iKnee], ap=lm[iAnk];
        const v1x=hp.x-kp.x, v1y=hp.y-kp.y, v2x=ap.x-kp.x, v2y=ap.y-kp.y;
        const dot=v1x*v2x+v1y*v2y;
        const mag=Math.sqrt(v1x**2+v1y**2)*Math.sqrt(v2x**2+v2y**2);
        const ka=mag>0?Math.acos(Math.min(1,Math.max(-1,dot/mag)))*180/Math.PI:180;
        const kDev=180-ka; // negative = hyperextension
        if (kDev < -5) {
          const abs=Math.abs(kDev), sev=abs>12?"moderate":"low";
          add({
            region:"Knee — Sagittal",
            findingName:`OBSERVATION: ${sideName} knee hyperextension tendency (${abs.toFixed(1)}°) — genu recurvatum screen positive. Clinical confirmation required.`,
            severity:sev, confidenceScore:Math.min(sagConf,75), clinicalSignificance:sev,
            interpretation:"OBSERVATION ONLY. The knees appear to sit in an extended/locked position. A photo cannot confirm this — a qualified professional can assess knee alignment and joint flexibility.",
            objectiveAssessments:["Weight-bearing knee alignment assessment","Knee flexibility assessment","Single-leg stance observation"],
            correction:"Commonly linked to a habit of locking the knees and to quadriceps control. General activities some find helpful (discuss with a professional first): gentle quadriceps/terminal-knee-extension work, and standing with the knees softly bent.",
            icd:"M21.9", norm:"<5° knee hyperextension in standing",
            _derivedFrom:[`Hip (lm${iHip})`,`Knee (lm${iKnee})`,`Ankle (lm${iAnk})`],
          });
        }
      }
    }

    // ── POSTURE CHAIN CLUSTERING ─────────────────────────────────────────────
    // After all individual sagittal findings are added to `out`,
    // apply cluster boost and add chain correlation note.
    {
      const sagFindings = out.filter(f =>
        Object.values(POSTURE_CHAIN).some(regions => regions.some(r => f.region.includes(r)))
      );
      const chainScore = computeChainScore(sagFindings);
      const boost = sagFindings.length >= 2 ? getClusterBoost(sagFindings[0], sagFindings) : 0;

      // Apply boost to all sagittal findings that are in a chain
      if (boost > 0) {
        sagFindings.forEach(f => {
          f.confidenceScore = Math.min(100, (f.confidenceScore || 50) + boost);
          // Upgrade clinical significance for clustered findings
          if (sagFindings.length >= 3 && f.clinicalSignificance === "low") {
            f.clinicalSignificance = "moderate";
          }
        });
      }

      // Add chain correlation note as a finding if 2+ segments active
      const chainNote = buildChainNote(chainScore);
      if (chainNote && sagFindings.length >= 2) {
        const activeCount = Object.values(chainScore).filter(v => v === 1).length;
        const chainSev = activeCount >= 3 ? "moderate" : "mild";
        const chainConf = Math.min(100, (sagChainConf || 60) + boost);
        // Only add if not already captured by a named pattern
        const hasNamedPattern = out.some(f => f.region && f.region.startsWith("◈"));
        if (!hasNamedPattern) {
          addLegacy(
            "Sagittal Chain Pattern",
            chainNote,
            chainSev,
            "Address highest-priority individual findings above in order of clinical significance.",
            "M62.9",
            chainNote,
            "Ideal: ear over acromion over greater trochanter over lateral malleolus"
          );
        }
      }

      // If no sagittal findings at all — add clinically realistic nil-finding message
      const hasSagittalFindings = out.some(f => {
        const sagRegions = ["Cervical / CVA","Shoulder / Rounded","Thoracic Kyphosis (Trunk Lean Est.)",
          "Pelvis / Lumbar","Lower Crossed","Upper Crossed","Knee","◈ Sagittal","Sagittal Chain"];
        return sagRegions.some(r => f.region.includes(r));
      });
      if (!hasSagittalFindings && sagChainConf >= 30) {
        const nilMsg = buildSagittalNilMessage(sagChainConf, m);
        if (nilMsg) {
          addLegacy(
            "Sagittal Assessment — Summary",
            nilMsg,
            "mild",
            "Continue current activity. Reassess if postural symptoms develop.",
            "Z00.0", nilMsg, ""
          );
        }
      }
    }

  } // end isLat — sagittal findings

  // ══════════════════════════════════════════════════════════════════════════
  // GLOBAL — all views
  // ══════════════════════════════════════════════════════════════════════════
  if (m.posturalLoadIndex !== null && m.posturalLoadIndex > 55) {
    const pliLabel = m.posturalLoadIndex > 80
      ? "Very High — multiple areas need attention"
      : m.posturalLoadIndex > 65
      ? "High — several postural areas are stressed"
      : "Elevated — more than one area is affected";
    addLegacy("Global — Body Load Summary",
      `Overall postural load ${pliLabel} (PLI ${m.posturalLoadIndex}/100)`,
      m.posturalLoadIndex > 75 ? "high" : "moderate",
      "Address highest-priority findings above. Aim for 1 targeted exercise per area, 10–15 min daily. Re-assess in 4–6 weeks.",
      "M62.9",
      `PLI ${m.posturalLoadIndex}/100 — multiple postural deviations contributing.`,
      "Target: PLI <35/100");
  }

  // ── CLINICAL SIGNIFICANCE FILTER + PRIORITISE ─────────────────────────────
  // 1. Remove low-confidence mild findings
  const filtered = out.filter(f => {
    if (f.severity === "mild" && (f.confidenceScore || 70) < 55) return false;
    return true;
  });

  // 2. Deduplicate by region — keep first (highest priority) occurrence
  const seenRegions = new Set();
  const deduped = filtered.filter(f => {
    if (seenRegions.has(f.region)) return false;
    seenRegions.add(f.region);
    return true;
  });

  // 3. Prioritise: high severity + confidence + clinical significance first
  const prioritised = prioritiseFindings(deduped);

  // 4. Cap output — always keep pattern/global findings
  const maxFindings = isLat ? MAX_FINDINGS_SAGITTAL : MAX_FINDINGS_FRONTAL;
  const isPattern = f => f.region.startsWith("◈") || f.region.startsWith("Global") || f.region.includes("Sway") || f.region.includes("Military");
  const patternFindings = prioritised.filter(isPattern);
  const regularFindings = prioritised.filter(f => !isPattern(f));

  // Fix C: Deduplicate — remove tibial findings if knee finding already reported from same geometry
  const hasKneeVarus = prioritised.some(f => (f.findingName||f.text||'').toLowerCase().includes('varus'));
  const hasKneeValgus = prioritised.some(f => (f.findingName||f.text||'').toLowerCase().includes('valgus'));
  const deduplicatedRegular = regularFindings.filter(f => {
    const name = (f.findingName || f.text || '').toLowerCase();
    if (hasKneeVarus && (name.includes('tibial') || name.includes('bowing')) && name.includes('var')) return false;
    if (hasKneeValgus && (name.includes('tibial') || name.includes('bowing')) && name.includes('val')) return false;
    return true;
  });

  return [...deduplicatedRegular.slice(0, maxFindings), ...patternFindings];
}


// ─── Score Engine ─────────────────────────────────────────────────────────────
function scorePosture(m, findings, reliability) {
  if(!m||!findings) return {score:0,band:"No Data",colour:PC.muted,subScores:null};
  let penalty=0;
  const P=(val,t1,t2,p1,p2)=>{if(val<=0)return;const n=Math.min(1,(val)/(Math.max(0.01,t2-t1)));penalty+=p1+(p2-p1)*n;};
  P(Math.abs(m.shoulderAngle||0),3,7,3,8);
  P(Math.abs(m.pelvisAngle||0),4,10,4,10); // P0-1: pelvic obliquity normal <4° (healthy-norm)
  P(Math.abs(m.trunkLateralShift||0),3.5,7,4,9);
  P(Math.abs(m.headLateralOffset||0),2.5,6,3,7);
  P(Math.abs(m.scapularAsymm||0),2.5,5,2,5);
  P(Math.abs(m.cogDeviation||0),4,8,3,8);
  P(m.cvaAngle!==null?Math.max(0,55-m.cvaAngle):0,6,14,5,13);
  // Thoracic curvature is only penalised when actually measured. It is not
  // computed by measureLandmarks (see TCI in the contour engine), so no phantom
  // 32° default — an unmeasured thoracic contributes 0 penalty, not a fake value.
  P(m.thoracicAngle!=null && m.thoracicAngle>45 ? m.thoracicAngle-45 : 0,8,18,4,10);
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
  const band=score>=88?"Optimal":score>=74?"Good":score>=58?"Fair":score>=40?"Needs Attention":"Clinical Review";
  const colour=score>=74?PC.green:score>=58?PC.yellow:PC.red;
  // Regional sub-scores
  const subScores={
    cervical: clamp(100-(m.cvaAngle!==null?Math.max(0,55-m.cvaAngle)*2.2:0)-Math.abs(m.headLateralOffset||0)*2.5,0,100),
    shoulder: clamp(100-Math.abs(m.shoulderAngle||0)*5-(m.scapularAsymm||0)*4,0,100),
    // null = thoracic curvature not measured in this pipeline (see contour TCI findings),
    // rendered as omitted rather than a fabricated score.
    thoracic: m.thoracicAngle!=null ? clamp(100-Math.max(0,m.thoracicAngle-45)*2-Math.abs(m.trunkLateralShift||0)*3.5,0,100) : null,
    lumbar:   clamp(100-Math.abs(m.lumbarProxy||0)*4.5-Math.abs(m.pelvisAngle||0)*4.5,0,100),
    knee:     clamp(100-Math.abs(m.leftKneeFrontal||0)*3.5-Math.abs(m.rightKneeFrontal||0)*3.5-Math.max(0,-(m.leftKneeDev||0)-5)*2.5-Math.max(0,-(m.rightKneeDev||0)-5)*2.5,0,100),
    global:   clamp(100-Math.abs(m.cogDeviation||0)*4.5-Math.abs(m.weightBearingShift||0)*3.5,0,100),
  };
  return {score,band,colour,subScores};
}

// ─── Multi-View Merge Engine ──────────────────────────────────────────────────
const VIEW_PLANE = { anterior:"frontal", posterior:"frontal", left:"sagittal", right:"sagittal" };

// The SAME clinical concept gets a DIFFERENT region string depending on
// whether buildFindings' primary detector fired or its fallback synthesiser
// fired instead (the fallback only runs when the primary path found nothing).
// Frontal and Back/Posterior share this same code, so if one view's primary
// detector fires and the other view's fallback fires for the identical
// underlying metric, they end up in different byRegion buckets and never
// cross-validate into a "confirmed" (2+ view) finding — even though they're
// describing the same thing. This map is used ONLY to decide which bucket a
// finding's votes go into; the finding's own displayed `region` (used
// elsewhere for Exercise Plan / Special Tests lookups) is left untouched.
const REGION_MERGE_SYNONYMS = {
  "Shoulder Level": "Shoulder Girdle",
  "Pelvic Obliquity": "Pelvis",
  "Head Lateral Tilt": "Head / Cervical",
  "Trunk Lateral Shift": "Lateral Trunk Deviation Screen",
  "Leg Length Discrepancy": "Leg Length",
  "Knee Alignment": "Knee Alignment Tendency",
};
const canonicalMergeRegion = (region) => REGION_MERGE_SYNONYMS[region] || region;

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
      const key = canonicalMergeRegion(f.region);
      if (!byRegion[key]) byRegion[key] = [];
      byRegion[key].push({ ...f, sourceView: view });
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

  // ── Plane-specific scores ────────────────────────────────────────────────
  const frontalViews  = viewResults.filter(r => VIEW_PLANE[r.view]==="frontal"  && r.scoreData?.score!=null);
  const sagittalViews = viewResults.filter(r => VIEW_PLANE[r.view]==="sagittal" && r.scoreData?.score!=null);
  const frontalScore  = frontalViews.length  ? Math.round(frontalViews.reduce((s,r)=>s+r.scoreData.score,0)/frontalViews.length)  : null;
  const sagittalScore = sagittalViews.length ? Math.round(sagittalViews.reduce((s,r)=>s+r.scoreData.score,0)/sagittalViews.length) : null;

  // Composite score: use the LOWER of the two plane scores as the floor (prevents good
  // frontal score masking poor sagittal, and vice versa). Capped at 80 if single-plane.
  // Clinical rationale: a patient's posture score should reflect their WORST assessed plane,
  // not an average that obscures plane-specific dysfunction (Magee: multi-plane assessment).
  const validScores = viewResults.filter(r => r.scoreData?.score != null);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((s,r) => s + r.scoreData.score, 0) / validScores.length) : 0;
  // Floor = lowest plane score (if both planes assessed); ensures neither plane is hidden
  const planeFloor = (frontalScore!==null && sagittalScore!==null)
    ? Math.min(frontalScore, sagittalScore) : null;
  // Composite = weighted blend: 60% average + 40% floor to show worst plane without overcorrecting
  const blendedScore = planeFloor!==null ? Math.round(avgScore*0.6 + planeFloor*0.4) : avgScore;
  const coverageCap = (hasFrontal && hasSagittal) ? 100 : 80;
  const compositeScore = Math.min(blendedScore, coverageCap);
  const compositeBand = compositeScore>=88?"Optimal":compositeScore>=74?"Good":compositeScore>=58?"Fair":compositeScore>=40?"Needs Attention":"Clinical Review";
  const compositeColour = compositeScore>=74?PC.green:compositeScore>=58?PC.yellow:PC.red;

  // Sub-scores: only average values from views where that metric is clinically valid.
  // Cervical/thoracic subs from sagittal views only; shoulder/pelvis from frontal.
  // This prevents unassessed-plane sub-scores from inflating the composite.
  const subKeys = ["cervical","shoulder","thoracic","lumbar","knee","global"];
  const subScores = {};
  subKeys.forEach(k => {
    // For plane-specific subs, prefer the relevant plane's values
    const planeViews = (k==="cervical"||k==="thoracic")
      ? sagittalViews : (k==="shoulder") ? frontalViews : validScores.map(r=>r);
    const vals = (planeViews.length>0?planeViews:validScores.map(r=>r))
      .map(r => r.scoreData?.subScores?.[k]).filter(v => v != null);
    subScores[k] = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
  });

  // ── Named patterns ──────────────────────────────────────────────────────────
  // Use highest-confidence sagittal result for Kendall pattern
  const sagittalResult = sagittalViews.length > 0
    ? viewResults.filter(r=>VIEW_PLANE[r.view]==="sagittal").sort((a,b)=>(b.scoreData?.reliability||0)-(a.scoreData?.reliability||0))[0]
    : viewResults.find(r => VIEW_PLANE[r.view] === "sagittal");
  const sagittalPattern = sagittalResult?.findings
    ?.find(f => f.region?.startsWith("◈ Sagittal Pattern"))?.text?.replace("Classification: ","") || null;

  // BUG FIX: hasScoliosis — actual region labels contain "Lateral Trunk" or "Lateral Spinal"
  const hasScoliosis  = mergedFindings.some(f =>
    (f.region?.includes("Lateral Trunk")||f.region?.includes("Lateral Spinal")||f.region?.includes("Scoliosis")) && f.confirmed);
  const hasLLD        = mergedFindings.some(f => f.region?.includes("Leg Length") && f.confirmed);
  // BUG FIX: hasUCS_front — actual labels contain "Upper Crossed" (with suffix)
  const hasUCS_front  = mergedFindings.some(f => f.region?.includes("Upper Crossed") && f.confirmed);
  const hasUCS_sag    = mergedFindings.some(f => f.region?.includes("Upper Crossed") || f.text?.includes("Upper Crossed"));
  const hasShoulderEl = mergedFindings.some(f => f.region==="Shoulder Girdle" && f.confirmed);
  const hasAPT        = mergedFindings.some(f => (f.region?.includes("Pelvis")||f.region?.includes("Lumbar")) && f.confirmed
    && (f.findingName||f.text||"").toLowerCase().includes("anterior"));
  const hasFrontalPelvis = mergedFindings.some(f => f.region==="Pelvis" && f.confirmed);
  const hasCVA        = mergedFindings.some(f => f.region?.includes("Cervical") && f.confirmed);
  const hasHeadTilt   = mergedFindings.some(f => f.region?.includes("Head") && f.confirmed);
  const hasKneeValgus = mergedFindings.some(f => f.region?.includes("Knee Alignment") && f.confirmed);
  const hasKneeRecurv = mergedFindings.some(f => f.region?.includes("Knee — Sagittal") && f.confirmed);

  // Frontal pattern
  const frontalPattern = hasScoliosis?"Lateral Spinal Deviation Screen — Adam's forward bend test recommended"
    :(hasUCS_front&&hasShoulderEl)?"Upper Crossed Pattern + Shoulder Asymmetry confirmed"
    :hasLLD?"Limb Length Discrepancy Pattern"
    :hasShoulderEl?"Coronal Asymmetry":null;

  // ── Cross-plane composite findings ─────────────────────────────────────────
  // These findings only emerge when multiple planes are assessed together.
  const crossPlaneFindings = [];
  if (hasFrontal && hasSagittal) {
    // Lumbopelvic dysfunction: APT (sagittal) + pelvic obliquity (frontal)
    if (hasAPT && hasFrontalPelvis) {
      crossPlaneFindings.push({
        region:"◈ Cross-Plane — Lumbopelvic",
        findingName:"Lumbopelvic dysfunction: anterior pelvic tilt (sagittal) with pelvic obliquity (frontal) — multidirectional pelvic instability pattern. Magee: co-occurrence indicates asymmetric lumbopelvic load distribution.",
        severity:"moderate", confidenceScore:75, clinicalSignificance:"moderate", confirmed:true,
        correction:"Asymmetric approach: side-specific hip flexor release + contralateral gluteal activation. Pilates or motor control programme targeting transversus abdominis and multifidus.",
        _derivedFrom:["Pelvis/Lumbar (sagittal)","Pelvis (frontal)"],
      });
    }
    // Cervical dysfunction: FHP + head tilt
    if (hasCVA && hasHeadTilt) {
      crossPlaneFindings.push({
        region:"◈ Cross-Plane — Cervical",
        findingName:"Cervical dysfunction: forward head posture (sagittal) + lateral head tilt (frontal) — combined sagittal + coronal cervical deviation. May indicate unilateral SCM/scalene dominance or upper cervical (C1–C2) dysfunction. Magee: screen for upper cervical instability.",
        severity:"moderate", confidenceScore:72, clinicalSignificance:"moderate", confirmed:true,
        correction:"Upper cervical assessment: C1–C2 rotation screen. Bilateral SCM/scalene length assessment. Cervical retraction + lateral flexion mobility. Refer if neurological signs present.",
        _derivedFrom:["Cervical/CVA (sagittal)","Head/Cervical (frontal)"],
      });
    }
    // Knee combined risk: frontal valgus + sagittal recurvatum
    if (hasKneeValgus && hasKneeRecurv) {
      crossPlaneFindings.push({
        region:"◈ Cross-Plane — Knee Observation",
        findingName:"Combined observation: knee valgus tendency (front view) plus hyperextension tendency (side view). This combination is worth discussing with a qualified professional.",
        severity:"moderate", confidenceScore:78, clinicalSignificance:"high", confirmed:true,
        correction:"General activities some find helpful (discuss with a professional first): quadriceps and hip strengthening, and being mindful of alignment during squatting. See a professional if you have knee pain or instability.",
        _derivedFrom:["Knee Alignment Tendency (frontal)","Knee — Sagittal (lateral)"],
      });
    }
    // UCS cross-plane confirmation
    if (hasUCS_sag && hasShoulderEl) {
      crossPlaneFindings.push({
        region:"◈ Cross-Plane — Upper-Body Pattern",
        findingName:"Upper-body posture pattern seen in both views: forward-head/rounded-shoulder tendency (side) plus shoulder-height asymmetry (front). This is an observation only — a qualified professional can assess whether it is meaningful.",
        severity:"moderate", confidenceScore:80, clinicalSignificance:"moderate", confirmed:true,
        correction:"Janda protocol: inhibit upper trapezius/levator scapulae (soft tissue) + activate deep neck flexors and lower trapezius/serratus anterior. Address ipsilateral scalene tightness if head tilt present.",
        _derivedFrom:["Sagittal chain (lateral)","Shoulder Girdle (frontal)"],
      });
    }
  }
  // Add cross-plane findings to merged list (at top)
  crossPlaneFindings.forEach(f => mergedFindings.unshift(f));

  const highCount      = mergedFindings.filter(f => f.severity==="high" && f.confirmed).length;
  const confirmedCount = mergedFindings.filter(f => f.confirmed).length;
  const planesCovered  = [hasFrontal&&"frontal", hasSagittal&&"sagittal"].filter(Boolean).join(" + ");
  let summary = `Assessment covers ${planesCovered} plane${coverage.viewCount>1?"s":""} (${coverage.viewCount} view${coverage.viewCount>1?"s":""}).`;
  summary += confirmedCount>0
    ? ` ${confirmedCount} finding${confirmedCount>1?"s":""} confirmed across multiple views${highCount>0?` — ${highCount} high priority`:""}.`
    : " No findings confirmed across multiple views.";
  if (!hasFrontal||!hasSagittal) summary += ` Add ${!hasFrontal?"a frontal":"a lateral"} view to complete the assessment.`;

  return { compositeScore, compositeBand, compositeColour, mergedFindings, coverage, subScores,
    sagittalPattern, frontalPattern, summary, frontalScore, sagittalScore, crossPlaneCount: crossPlaneFindings.length };
}

// ─── Canvas overlay renderer ──────────────────────────────────────────────────
// Helper: draw angle badge (small pill label on canvas)
// Scale factor: keeps labels readable at any image resolution
// Scale factor: keeps labels readable at any image resolution
function _sc(ctx){
  const cw=ctx.canvas.width||600, ch=ctx.canvas.height||800;
  return Math.max(1, Math.min(cw,ch)/600);
}

// Draw outlined text — visible on any background without needing fillRect
function _drawOutlineText(ctx, txt, x, y, fsize, fillCol, sc) {
  ctx.save();
  ctx.font=`bold ${fsize}px sans-serif`;
  ctx.textBaseline="middle";
  ctx.lineWidth=Math.max(2, Math.round(sc*2.5));
  ctx.strokeStyle="rgba(0,0,0,0.85)";
  ctx.strokeText(txt, x, y);
  ctx.fillStyle=fillCol||"#ffffff";
  ctx.fillText(txt, x, y);
  ctx.restore();
}

function drawBadge(ctx, x, y, text, color) {
  const sc=_sc(ctx), fsize=Math.round(12*sc);
  ctx.save();
  ctx.textAlign="center";
  _drawOutlineText(ctx, text, x, y, fsize, color||"#ffffff", sc);
  ctx.restore();
}

function drawCleanLabel(ctx, y, lines, color) {
  const sc=_sc(ctx), fsize=Math.round(12*sc), lhPx=Math.round(18*sc);
  const bx=Math.round(6*sc);
  ctx.save();
  ctx.textAlign="left";
  lines.forEach((ln,i)=>{
    const fy=y+(i-(lines.length-1)/2)*lhPx;
    _drawOutlineText(ctx, ln, bx, fy, i===0?fsize:Math.round(10*sc), color, sc);
  });
  ctx.restore();
}

function drawAngleBadge(ctx, W, y, angleDeg, color) {
  const sc=_sc(ctx), fsize=Math.round(13*sc);
  const txt=(angleDeg>=0?"+":"")+angleDeg.toFixed(1)+"°";
  ctx.save();
  ctx.textAlign="right";
  _drawOutlineText(ctx, txt, W-Math.round(8*sc), y, fsize, color, sc);
  ctx.restore();
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
    // Kendall: anterior/posterior plumb line falls midway between the heels (ankle midpoint)
    // Fallback to hip midpoint if ankles not visible
    const ankMid=V(27)&&V(28)?{x:(g(27).x+g(28).x)/2}:null;
    const hipMidX=V(23)&&V(24)?(g(23).x+g(24).x)/2:null;
    const gx=ankMid?ankMid.x*W:hipMidX?hipMidX*W:W/2;
    ctx.save(); ctx.shadowColor="rgba(0,229,255,0.6)"; ctx.shadowBlur=8;
    ctx.setLineDash([10,6]); ctx.strokeStyle="rgba(0,229,255,0.95)"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke();
    ctx.restore(); ctx.setLineDash([]);
  // ── Legend (top-right) — mirrors Image 2 ─────────────────────────────────
  if(!isLat){
    const legendItems=[
      {col:"rgba(0,201,122,0.95)", label:"Within Kendall norm"},
      {col:"rgba(255,179,0,0.95)", label:"Mild deviation"},
      {col:"rgba(255,77,109,0.95)", label:"Significant deviation"},
      {col:"rgba(200,100,255,0.9)", label:"ASIS/Pelvis level"},
      {col:"rgba(0,229,255,0.95)",  label:"Plumb line (Kendall)"},
    ];
    const lx=W-140, ly=10, lw=132, lh=legendItems.length*16+10;
    ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(lx,ly,lw,lh);
    legendItems.forEach(({col,label},i)=>{
      const iy=ly+10+i*16;
      ctx.beginPath(); ctx.arc(lx+10,iy,5,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
      ctx.font="bold 9px system-ui"; ctx.textAlign="left"; ctx.fillStyle="#1e1e2e";
      ctx.fillText(label,lx+20,iy+4);
    });
    // "ANTERIOR VIEW" bottom-left label
    ctx.font="bold 9px system-ui"; ctx.textAlign="left"; ctx.fillStyle="rgba(255,255,255,0.55)";
    const _vl=(view==="posterior"||view==="back")?"POSTERIOR VIEW — Kendall plumb: ankle midpoint":"ANTERIOR VIEW — Kendall plumb: ankle midpoint";
    ctx.fillText(_vl,6,H-8);
  }

  } else {
    // ── Clinical Sagittal Plumb Line (Kendall / Sahrmann standard) ────────
    // viewSign: auto-detected from nose position (robust to any camera orientation)
    const noseXo = lm[0]?.x ?? null;
    const sagShXo = lm[11]?.x ?? lm[12]?.x ?? null;
    const viewSign = (noseXo !== null && sagShXo !== null)
      ? (noseXo < sagShXo ? -1 : 1)
      : (view==="right" ? -1 : 1);
    const side = view==="right";
    const iEar=side?8:7, iSh=side?12:11, iHip=side?24:23, iKnee=side?26:25, iAnk=side?28:27, iHeel=side?30:29;
    // Kendall (5th ed.): plumb line passes through the lateral malleolus
    let plumbX=W/2;
    if(V(iAnk)){ plumbX=lm[iAnk].x*W; }       // lateral malleolus — Kendall primary
    else if(V(iHeel)){ plumbX=lm[iHeel].x*W; }
    const pixPerCm=m.pixPerCm||(H/170);
    // Plumb line
    ctx.save(); ctx.shadowColor="rgba(0,229,255,0.8)"; ctx.shadowBlur=14;
    ctx.setLineDash([10,6]); ctx.strokeStyle="rgba(0,229,255,1)"; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(plumbX,0); ctx.lineTo(plumbX,H); ctx.stroke();
    ctx.shadowBlur=0; ctx.setLineDash([]); ctx.restore();
    // Kendall (5th ed.) sagittal plumb norms:
    //  EAM:        0cm (on plumb) | Acromion:      0cm | GT:  0cm | Knee: 0–2cm A (normal) | Malleolus: anchor
    // normRange = acceptable deviation in cm ANTERIOR (+) or POSTERIOR (−)
    // For knee: Kendall states slight anterior position (0–2cm) is normal — adjust threshold accordingly
    const sagRefPts=[
      {idx:iEar, label:"EAM",         normMin:0, normMax:2,  note:"(at plumb)"},
      {idx:iSh,  label:"Acromion",    normMin:0, normMax:2,  note:"(at plumb)"},
      {idx:iHip, label:"G. Trochanter",normMin:0,normMax:2,  note:"(at plumb)"},
      {idx:iKnee,label:"Knee",        normMin:-1,normMax:3,  note:"(0–2cm A normal)"},
    ];
    sagRefPts.filter(s=>V(s.idx)).forEach(({idx,label,normMin,normMax,note})=>{
      const pt=PX(idx); if(!pt) return;
      const devPx=(pt[0]-plumbX)*viewSign, devCm=devPx/pixPerCm;
      // Green if within Kendall normal range, yellow if mild deviation, red if significant
      const inNorm=devCm>=normMin-0.5&&devCm<=normMax+0.5;
      const mild=devCm>=normMin-2&&devCm<=normMax+2;
      const col=inNorm?"rgba(0,201,122,0.95)":mild?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
      if(Math.abs(devPx)>6){ ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(plumbX,pt[1]); ctx.lineTo(pt[0],pt[1]); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
      ctx.beginPath(); ctx.arc(pt[0],pt[1],5,0,Math.PI*2); ctx.fillStyle=col; ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=1.5; ctx.stroke();
      const dir=devCm>0?"A":"P", badgeText=`${label} ${dir} ${Math.abs(devCm).toFixed(1)}cm`;
      const _bd_sc=_sc(ctx); ctx.font=`bold ${Math.round(10*_bd_sc)}px system-ui`; const tw=ctx.measureText(badgeText).width;
      const onRight=pt[0]<W*0.6, bx=onRight?pt[0]+9:pt[0]-tw-17, by=pt[1]-9;
      const _sp_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,badgeText,bx,by+Math.round(9*_sp_sc),Math.round(10*_sp_sc),col,_sp_sc);
    });
    // Lat malleolus anchor
    if(V(iAnk)){ const p=PX(iAnk),_lm_sc=_sc(ctx); ctx.beginPath(); ctx.arc(p[0],p[1],Math.round(6*_lm_sc),0,Math.PI*2); ctx.fillStyle="rgba(0,229,255,1)"; ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=Math.round(1.5*_lm_sc); ctx.stroke(); ctx.font=`bold ${Math.round(9*_lm_sc)}px system-ui`; ctx.fillStyle="rgba(0,229,255,1)"; ctx.textAlign="left"; ctx.fillText("Lat. Malleolus",p[0]+Math.round(8*_lm_sc),p[1]+Math.round(4*_lm_sc)); }
    // CVA angle
    if(V(iEar)&&V(iSh)){ const ep=PX(iEar),sp=PX(iSh),dx=ep[0]-sp[0],dy=ep[1]-sp[1]; const cva=Math.abs(Math.atan2(Math.abs(dy),Math.abs(dx))*180/Math.PI); const cc=cva>=52?"rgba(0,201,122,0.95)":cva>=45?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)"; ctx.save(); ctx.strokeStyle=cc; ctx.lineWidth=2; ctx.setLineDash([6,3]); ctx.beginPath(); ctx.moveTo(sp[0],sp[1]); ctx.lineTo(ep[0],ep[1]); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); const ct=`CVA ${cva.toFixed(1)}° ${cva>=52?"✓":"⚠"}`; const _cv_sc2=_sc(ctx); ctx.font=`bold ${Math.round(10*_cv_sc2)}px system-ui`; const ctw=ctx.measureText(ct).width; const cx=ep[0]<W*0.5?ep[0]+8:ep[0]-ctw-17,cy=ep[1]-24; const _cva_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,ct,cx+Math.round(4*_cva_sc),cy+Math.round(9*_cva_sc),Math.round(10*_cva_sc),cc,_cva_sc); const fhpCm=Math.abs(dx)/pixPerCm; if(fhpCm>1.5){ const fc=fhpCm>2.5?"rgba(255,77,109,0.85)":"rgba(255,179,0,0.85)"; ctx.save(); ctx.strokeStyle=fc; ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(sp[0],ep[1]); ctx.lineTo(ep[0],ep[1]); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); const fl=`FHP ${fhpCm.toFixed(1)}cm`; const _fh_sc2=_sc(ctx); ctx.font=`bold ${Math.round(9*_fh_sc2)}px system-ui`; const ftw=ctx.measureText(fl).width,fx=(ep[0]+sp[0])/2-ftw/2; const _fhp_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,fl,fx,ep[1]-Math.round(16*_fhp_sc),Math.round(9*_fhp_sc),fc,_fhp_sc); } }
    // Trunk inclination
    if(V(iSh)&&V(iHip)){ const sp=PX(iSh),hp=PX(iHip),dx=sp[0]-hp[0],dy=sp[1]-hp[1]; const ta=Math.atan2(dx,Math.abs(dy))*180/Math.PI,taAbs=Math.abs(ta); const tc=taAbs<=3?"rgba(0,201,122,0.95)":taAbs<=7?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)"; const tt=`Trunk ${ta>0?"Ant":"Post"} ${taAbs.toFixed(1)}°`,mx=(sp[0]+hp[0])/2,my=(sp[1]+hp[1])/2; const _trsc=_sc(ctx); ctx.font=`bold ${Math.round(9*_trsc)}px system-ui`; const tw=ctx.measureText(tt).width,tx=mx<W*0.5?mx+Math.round(8*_trsc):mx-tw-Math.round(16*_trsc); const _tr_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,tt,tx,my,Math.round(10*_tr_sc),tc,_tr_sc); }
    // Knee sagittal angle
    if(V(iHip)&&V(iKnee)&&V(iAnk)){ const hp=PX(iHip),kp=PX(iKnee),ap=PX(iAnk); const v1x=hp[0]-kp[0],v1y=hp[1]-kp[1],v2x=ap[0]-kp[0],v2y=ap[1]-kp[1]; const dot=v1x*v2x+v1y*v2y,mag=Math.sqrt(v1x*v1x+v1y*v1y)*Math.sqrt(v2x*v2x+v2y*v2y); const ka=mag>0?Math.acos(Math.min(1,Math.max(-1,dot/mag)))*180/Math.PI:180,kf=180-ka; const kc=Math.abs(kf)<=5?"rgba(0,201,122,0.95)":kf<0?"rgba(255,77,109,0.95)":"rgba(255,179,0,0.95)"; const kl=kf<-2?"Recurvatum":kf>5?"Flexion":"Normal",kt=`Knee ${kf.toFixed(1)}° ${kl}`; const _knsc=_sc(ctx); ctx.font=`bold ${Math.round(9*_knsc)}px system-ui`; const ktw=ctx.measureText(kt).width,kx=kp[0]<W*0.5?kp[0]+Math.round(8*_knsc):kp[0]-ktw-Math.round(16*_knsc); const _kn_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,kt,kx,kp[1]+Math.round(14*_kn_sc),Math.round(10*_kn_sc),kc,_kn_sc); }
  }

  // ── Sagittal-specific legend + title ──────────────────────────────────────
  if(isLat){
    // Legend box
    const sagItems=[
      {col:"rgba(0,201,122,0.9)",  lbl:"Within normal range"},
      {col:"rgba(255,179,0,0.9)",  lbl:"Mild deviation"},
      {col:"rgba(255,77,109,0.9)", lbl:"Significant deviation"},
      {col:"rgba(0,229,255,0.9)",  lbl:"Plumb line"},
      {col:"rgba(147,51,234,0.9)", lbl:"CVA / Spine line"},
    ];
    const slw=138, slh=sagItems.length*17+12, slx=W-slw-6, sly=6;
    ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(slx,sly,slw,slh);
    sagItems.forEach(({col,lbl},i)=>{
      const iy=sly+12+i*17;
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(slx+11,iy-3,5,0,Math.PI*2); ctx.fill();
      ctx.font="bold 9px system-ui"; ctx.fillStyle="#1e1e2e"; ctx.textAlign="left";
      ctx.fillText(lbl,slx+21,iy);
    });
    // Sagittal observation title (CVA + FHP summary)
    const sagParts=[];
    const iEar2=view==="right"?8:7, iSh2=view==="right"?12:11;
    if(V(iEar2)&&V(iSh2)){
      const ep2=PX(iEar2),sp2=PX(iSh2);
      const cva2=Math.abs(Math.atan2(Math.abs(ep2[1]-sp2[1]),Math.abs(ep2[0]-sp2[0]))*180/Math.PI);
      const fhp2=Math.abs(ep2[0]-sp2[0])/(m.pixPerCm||(H/170));
      if(cva2<52) sagParts.push(`CVA ${cva2.toFixed(0)}°${cva2<45?" (significant)":""}`);
      if(fhp2>2) sagParts.push(`FHP ${fhp2.toFixed(1)}cm`);
    }
    if(sagParts.length>0){
      const sagTitle=`Observation: ${sagParts.join("  ·  ")}`;
      ctx.font="bold 10px system-ui";
      const stw=ctx.measureText(sagTitle).width;
      const sbw=Math.min(stw+24,W-10);
      ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(W/2-sbw/2,4,sbw,20);
      ctx.fillStyle="rgba(124,58,237,0.85)";
      if(ctx.roundRect) ctx.roundRect(W/2-sbw/2,4,sbw,3,2); else ctx.rect(W/2-sbw/2,4,sbw,3);
      ctx.fill();
      ctx.fillStyle="#1e1e2e"; ctx.textAlign="center"; ctx.fillText(sagTitle,W/2,18);
    }
    // Sagittal spine curve (ear → shoulder → hip → knee chain)
    const iEarS=view==="right"?8:7, iShS=view==="right"?12:11;
    const iHipS=view==="right"?24:23, iKnS=view==="right"?26:25, iAnkS=view==="right"?28:27;
    const spineChain=[iEarS,iShS,iHipS,iKnS,iAnkS].filter(i=>V(i));
    if(spineChain.length>=3){
      ctx.save(); ctx.strokeStyle="rgba(147,51,234,0.45)"; ctx.lineWidth=2; ctx.setLineDash([4,4]);
      ctx.beginPath();
      const sP=PX(spineChain[0]); ctx.moveTo(sP[0],sP[1]);
      spineChain.slice(1).forEach(i=>{ const p=PX(i); ctx.lineTo(p[0],p[1]); });
      ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
    }
  }

  // ── Posterior-specific: spine line + PSIS markers + calcaneal alignment ──
  if(view==="posterior"||view==="back"){
    // Estimated spine line: head → shoulder midpoint → hip midpoint
    const headPt=V(0)?PX(0):null;
    const shMidX=V(11)&&V(12)?(PX(11)[0]+PX(12)[0])/2:null;
    const shMidY=V(11)&&V(12)?(PX(11)[1]+PX(12)[1])/2:null;
    const hipMidX2=V(23)&&V(24)?(PX(23)[0]+PX(24)[0])/2:null;
    const hipMidY2=V(23)&&V(24)?(PX(23)[1]+PX(24)[1])/2:null;
    if(headPt&&shMidX&&hipMidX2){
      const pts=[[headPt[0],headPt[1]],[shMidX,shMidY],[hipMidX2,hipMidY2]];
      // Draw spine curve
      ctx.save(); ctx.strokeStyle="rgba(147,51,234,0.7)"; ctx.lineWidth=2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
      // Smooth curve through points
      for(let i=1;i<pts.length-1;i++){
        const mx=(pts[i][0]+pts[i+1][0])/2, my=(pts[i][1]+pts[i+1][1])/2;
        ctx.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);
      }
      ctx.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);
      ctx.stroke(); ctx.restore();
      // Check lateral deviation from plumb
      const spineAnkX=V(27)&&V(28)?(PX(27)[0]+PX(28)[0])/2:null;
      if(spineAnkX){
        const spineDevPx=shMidX-spineAnkX;
        const pixPerCm2=m.pixPerCm||(H/170);
        const devCm2=spineDevPx/pixPerCm2;
        if(Math.abs(devCm2)>1.0){
          const devCol=Math.abs(devCm2)>2.5?"rgba(255,77,109,0.9)":"rgba(255,179,0,0.9)";
          const devDir=devCm2>0?"R":"L";
          drawCleanLabel(ctx,(shMidY+hipMidY2)/2,[`Spine shift ${devDir}`,`${Math.abs(devCm2).toFixed(1)}cm`],"rgba(147,51,234,0.9)");
        }
      }
    }
    // PSIS markers (estimated: slightly medial+superior to hip joint, posterior view)
    if(!(view==="anterior"||view==="front"))
    [[23,"L.PSIS",11],[24,"R.PSIS",12]].forEach(([hipIdx,lbl,shIdx])=>{
      if(!V(hipIdx)) return;
      const hipPt2=PX(hipIdx); if(!hipPt2) return;
      let psX=hipPt2[0], psY=hipPt2[1];
      if(V(shIdx)){
        const shPt2=PX(shIdx);
        const torsoH2=hipPt2[1]-shPt2[1];
        psY=hipPt2[1]-torsoH2*0.12;
        psX=hipPt2[0]+(hipIdx===23?-1:1)*torsoH2*0.02;
      }
      ctx.strokeStyle="rgba(200,100,255,0.7)"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.arc(psX,psY,12,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(psX,psY,5,0,Math.PI*2); ctx.fillStyle="#c084fc"; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=1; ctx.stroke();
      // Label
      ctx.font="bold 9px system-ui"; const tw2=ctx.measureText(lbl).width;
      const _ps_sc=_sc(ctx); ctx.textAlign="center"; _drawOutlineText(ctx,lbl,psX,psY+Math.round(22*_ps_sc),Math.round(9*_ps_sc),"#c084fc",_ps_sc);
    });
    // Calcaneal alignment (heel tilt from vertical)
    [[29,27,"L.Heel"],[30,28,"R.Heel"]].forEach(([hIdx,aIdx,lbl2])=>{
      if(!V(hIdx)||!V(aIdx)) return;
      const hPt=PX(hIdx), aPt=PX(aIdx);
      const heelAngle=Math.atan2(hPt[0]-aPt[0], Math.abs(aPt[1]-hPt[1]))*180/Math.PI;
      const absHA=Math.abs(heelAngle);
      if(absHA<3) return; // ignore trivial
      const heelCol=absHA>8?"rgba(255,77,109,0.9)":absHA>4?"rgba(255,179,0,0.9)":"rgba(0,201,122,0.9)";
      const heelDir=heelAngle>0?"Valgus":"Varus";
      ctx.beginPath();
      const htxt=`${lbl2} ${heelDir} ${absHA.toFixed(0)}°`;
      ctx.font="bold 9px system-ui"; const htw=ctx.measureText(htxt).width;
      const hbx=hIdx===29?4:W-htw-20, hby=H-48;
      if(ctx.roundRect) ctx.roundRect(hbx,hby,htw+14,16,4); else ctx.rect(hbx,hby,htw+14,16);
      ctx.fill(); ctx.restore();
      ctx.fillStyle=heelCol; ctx.textAlign="left"; ctx.fillText(htxt,hbx+7,hby+12);
    });
    // Posterior legend
    const postItems=[
      {col:"rgba(0,201,122,0.9)",  lbl:"Within normal range"},
      {col:"rgba(255,179,0,0.9)",  lbl:"Mild deviation"},
      {col:"rgba(255,77,109,0.9)", lbl:"Significant deviation"},
      {col:"rgba(147,51,234,0.9)", lbl:"Spine line"},
      {col:"rgba(200,100,255,0.9)",lbl:"PSIS markers"},
    ];
    const plw=138, plh=postItems.length*17+12, plx=W-plw-6, ply=6;
    ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(plx,ply,plw,plh);
    postItems.forEach(({col,lbl},i)=>{
      const iy=ply+12+i*17;
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(plx+11,iy-3,5,0,Math.PI*2); ctx.fill();
      ctx.font="bold 9px system-ui"; ctx.fillStyle="#1e1e2e"; ctx.textAlign="left";
      ctx.fillText(lbl,plx+21,iy);
    });
  }

  // ── Skeleton connections ──────────────────────────────────────────────────
  // Posterior/frontal views: legs (25-32) get lower threshold (0.45) because
  // MediaPipe gives reduced confidence to leg landmarks from behind.
  // Lateral views keep strict 0.65 to avoid extrapolated connections.
  const LEG_IDXS = new Set([25,26,27,28,29,30,31,32]);
  const CONNECTIONS=[
    [11,12],[11,23],[12,24],[23,24],
    [11,13],[13,15],[12,14],[14,16],
    [23,25],[25,27],[24,26],[26,28],
    [27,29],[28,30],[27,31],[28,32],
    [7,8],[0,7],[0,8],
  ];
  const VS=i=>(lm[i]?.visibility||0)>=(
    !isLat && LEG_IDXS.has(i) ? 0.45 : 0.65
  );
  ctx.strokeStyle="rgba(167,139,250,0.9)"; ctx.lineWidth=2.5; ctx.setLineDash([]);
  CONNECTIONS.forEach(([a,b])=>{
    if(!VS(a)||!VS(b)) return;
    const pa=PX(a), pb=PX(b); if(!pa||!pb) return;
    ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]); ctx.stroke();
  });

  // ── Joint dots ────────────────────────────────────────────────────────────
  const JOINTS=[0,7,8,11,12,13,14,23,24,25,26,27,28];
  JOINTS.forEach(i=>{
    if(!VS(i)) return;
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
    // Horizontal level lines — full width with right-edge angle readings (like Image 2)
    // Kendall's 5 primary frontal reference levels (Kendall 5th ed. Ch.2 & Ch.5)
    const LEVELS=[
      {idxL:7,  idxR:8,  label:"Ear Level\n(C-spine ref)",   color:"rgba(0,229,255,0.85)"},
      {idxL:11, idxR:12, label:"Shoulder Level\n(Acromion)", color:"rgba(147,51,234,0.9)"},
      {idxL:23, idxR:24, label:"Hip Joint Ref\n(ASIS proxy)",color:"rgba(249,115,22,0.75)"},
      {idxL:25, idxR:26, label:"Knee Level\n(Joint line)",   color:"rgba(16,185,129,0.9)"},
      {idxL:27, idxR:28, label:"Ankle Level\n(Malleolus)",   color:"rgba(99,102,241,0.9)"},
    ];
    LEVELS.forEach(({idxL,idxR,label,color})=>{
      if(!V(idxL)||!V(idxR)) return;
      const pL=PX(idxL), pR=PX(idxR);
      const dy=pR[1]-pL[1], dx=pR[0]-pL[0];
      // Use abs(dx) so angle reads correctly regardless of left/right landmark order on screen
      const angleDeg=Math.atan2(dy,Math.abs(dx))*180/Math.PI;
      const absA=Math.abs(angleDeg);
      const angleCol=absA<1?"rgba(0,201,122,0.95)":absA<3?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
      const my=(pL[1]+pR[1])/2;
      // Full-width line
      ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
      ctx.beginPath(); ctx.moveTo(0,my); ctx.lineTo(W,my); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);
      // Left label — clean white card with colored accent bar
      drawCleanLabel(ctx, my, label.split("\n"), color);
      // Right angle badge — white pill
      drawAngleBadge(ctx, W, my, angleDeg, angleCol);
    });
    // Corrected ASIS-to-ASIS level line — ANTERIOR only (Magee: ASIS not visible posteriorly)
    // For posterior view: show simple hip level line labeled as PSIS proxy
    if(V(23)&&V(24)){
      const isPost=(view==="posterior"||view==="back");
      if(isPost){
        // PSIS proxy: simple horizontal midline at hip level with appropriate label
        const hipMidY=(PX(23)[1]+PX(24)[1])/2;
        ctx.save(); ctx.strokeStyle="rgba(200,100,255,0.6)"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(0,hipMidY); ctx.lineTo(W,hipMidY); ctx.stroke();
        ctx.restore(); ctx.setLineDash([]);
        const hipAngle=Math.atan2(PX(24)[1]-PX(23)[1],Math.abs(PX(24)[0]-PX(23)[0]))*180/Math.PI;
        const ha=Math.abs(hipAngle),hac=ha<1?"rgba(0,201,122,0.95)":ha<3?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
        drawCleanLabel(ctx, hipMidY, ["Hip Level","PSIS proxy"], "rgba(200,100,255,0.9)");
        drawAngleBadge(ctx, W, hipMidY, hipAngle, hac);
      }
    }
    if(V(23)&&V(24)&&!(view==="posterior"||view==="back")){
      const hipL=PX(23), hipR=PX(24);
      const shL=V(11)?PX(11):null, shR=V(12)?PX(12):null;
      const torsoHL=shL?hipL[1]-shL[1]:H*0.3, torsoHR=shR?hipR[1]-shR[1]:H*0.3;
      const asLx=hipL[0]+(-1)*torsoHL*0.04, asLy=hipL[1]-torsoHL*0.18;
      const asRx=hipR[0]+(1)*torsoHR*0.04, asRy=hipR[1]-torsoHR*0.18;
      // Draw line between corrected ASIS points
      ctx.save(); ctx.strokeStyle="rgba(200,100,255,0.85)"; ctx.lineWidth=2; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(asLx,asLy); ctx.lineTo(asRx,asRy); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);
      // Angle badge
      const asisAngle=Math.atan2(asRy-asLy,Math.abs(asRx-asLx))*180/Math.PI;
      const aasisAbs=Math.abs(asisAngle);
      const ac=aasisAbs<1?"rgba(0,201,122,0.95)":aasisAbs<3?"rgba(255,179,0,0.95)":"rgba(255,77,109,0.95)";
      drawAngleBadge(ctx, W, (asLy+asRy)/2, asisAngle, ac);
    }
    // ASIS dashed rings — anterior view only (ASIS not visible from posterior)
    // MediaPipe landmarks 23/24 = hip joints (femoral head level).
    // ASIS is superior: offset upward by ~18% of shoulder-to-hip torso height.
    if(!(view==="posterior"||view==="back"))
    [[23,"L.ASIS",11],[24,"R.ASIS",12]].forEach(([hipIdx,lbl,shIdx])=>{
      if(!V(hipIdx)) return;
      const hipPt=PX(hipIdx); if(!hipPt) return;
      let asX=hipPt[0], asY=hipPt[1];
      if(V(shIdx)){
        const shPt=PX(shIdx);
        const torsoH=hipPt[1]-shPt[1]; // px; positive = hip is lower than shoulder
        asY=hipPt[1]-torsoH*0.18;      // move 18% of torso height upward
        asX=hipPt[0]+(hipIdx===23?1:-1)*torsoH*0.04; // slight lateral offset (23=left hip→patient's left→image right)
      }
      const pt=[asX,asY];
      ctx.strokeStyle="rgba(200,100,255,0.7)"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.arc(pt[0],pt[1],14,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      // Filled dot at corrected ASIS centre
      ctx.beginPath(); ctx.arc(pt[0],pt[1],6,0,Math.PI*2);
      ctx.fillStyle="#FFD700"; ctx.fill();  // Gold/yellow = matches ASIS marker convention
      ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=1; ctx.stroke();
      const _as_sc=_sc(ctx); ctx.textAlign="center"; _drawOutlineText(ctx,lbl,pt[0],pt[1]+Math.round(22*_as_sc),Math.round(9*_as_sc),"#FFD700",_as_sc);
    });
    // Waist triangles
    if((view==="posterior"||view==="back")&&V(11)&&V(13)&&V(23)&&V(12)&&V(14)&&V(24)){
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
    // Posterior: use heel(29/30)→ankle(27/28) axis — toe tips face away from camera
    // Anterior: use toe(31/32)→ankle(27/28) axis (Magee p.863: normal 7-10° external)
    const _footPairs=(view==="posterior"||view==="back")
      ?[[29,27,"L.Heel",0],[30,28,"R.Heel",1]]
      :[[31,27,"L.Foot",0],[32,28,"R.Foot",1]];
    _footPairs.forEach(([fi,ai2,lbl,side])=>{
      if(!V(fi)||!V(ai2)) return;
      const fa=Math.abs(Math.atan2(g(fi).y-g(ai2).y, g(fi).x-g(ai2).x)*180/Math.PI);
      // Magee p.863: normal 7-10° external (range 0-20°); >20° = excess ER; <5° = in-toeing
      const col=fa>=5&&fa<=20?"rgba(0,201,122,0.9)":fa>20&&fa<=30?"rgba(255,179,0,0.9)":"rgba(255,77,109,0.9)";
      const bx=side===0?6:W-72, by=H-30;
      ctx.fillStyle="rgba(6,9,15,0.85)";
      ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx,by,66,22,5); else ctx.rect(bx,by,66,22); ctx.fill();
      ctx.fillStyle=col; ctx.font="bold 9.5px system-ui"; ctx.textAlign="left";
      ctx.fillText(`${lbl} ${fa.toFixed(0)}°`,bx+5,by+15);
    });
  }

  // ── [v17 features] Landmark text labels on dots ──────────────────────────
  // Labels directly on each landmark so therapist/patient knows what each dot is
  if (!isLat) {
    const LANDMARK_LABELS = [
      [0,  "Head"],
      [2,  "L.Eye"], [5,  "R.Eye"],
      [7,  "L.Ear"], [8,  "R.Ear"],
      [11, "L.Sh"],  [12, "R.Sh"],
      [13, "L.Elbow"],[14,"R.Elbow"],
      [23, "L.Hip"], [24, "R.Hip"],
      [25, "L.Knee"],[26, "R.Knee"],
      [27, "L.Ank"], [28, "R.Ank"],
      [29, "L.Heel"],[30, "R.Heel"],
      [31, "L.Ft"],  [32, "R.Ft"],
    ];
    ctx.font = "bold 8px system-ui";
    LANDMARK_LABELS.forEach(([idx, lbl]) => {
      if (!V(idx)) return;
      const p = PX(idx); if (!p) return;
      const tw = ctx.measureText(lbl).width;
      const bx = p[0] + 9, by = p[1] - 6;
      const _ll_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,lbl,bx,by-Math.round(6*_ll_sc),Math.round(9*_ll_sc),"#cce0ff",_ll_sc);
    });
    // ASIS labels specifically (estimated position)
    if (V(23) && V(11)) {
      const hp=PX(23), sh=PX(11);
      const torsoH = hp[1]-sh[1];
      const asLx = hp[0]+torsoH*0.04, asLy = hp[1]-torsoH*0.18;
      const asRx = V(24)&&V(12) ? PX(24)[0]-torsoH*0.04 : null;
      const asRy = V(24)&&V(12) ? PX(24)[1]-torsoH*0.18 : null;
      ctx.font = "bold 7.5px system-ui";
      [[asLx,asLy,"L.ASIS"],[asRx,asRy,"R.ASIS"]].forEach(([x,y,lbl]) => {
        if (!x||!y) return;
        const tw = ctx.measureText(lbl).width;
        const _a2_sc=_sc(ctx); ctx.textAlign="center"; _drawOutlineText(ctx,lbl,x,y+Math.round(22*_a2_sc),Math.round(9*_a2_sc),"#FFD700",_a2_sc);
      });
    }
  }

  // ── [v17] Knee angles directly on image ──────────────────────────────────
  if (!isLat) {
    [[23,25,27,"L.Knee"],[24,26,28,"R.Knee"]].forEach(([hi,ki,ai2,lbl]) => {
      if (!V(hi)||!V(ki)||!V(ai2)) return;
      const angle = (() => {
        const a=g(hi),b=g(ki),c=g(ai2);
        const ab={x:a.x-b.x,y:a.y-b.y}, cb={x:c.x-b.x,y:c.y-b.y};
        const dot=ab.x*cb.x+ab.y*cb.y;
        const mag=Math.sqrt((ab.x**2+ab.y**2)*(cb.x**2+cb.y**2));
        if(mag===0) return null;
        return Math.round(Math.acos(Math.min(1,Math.max(-1,dot/mag)))*1800/Math.PI)/10;
      })();
      if (angle===null) return;
      const p = PX(ki); if (!p) return;
      const txt = `${lbl} ${angle}°`;
      const col = angle > 185 ? "rgba(99,102,241,0.95)" : angle < 170 ? "rgba(249,115,22,0.95)" : "rgba(0,201,122,0.95)";
      ctx.font = "bold 10px system-ui";
      const tw = ctx.measureText(txt).width;
      const bx = ki===25 ? p[0]-tw-18 : p[0]+10;
      const _kf_sc=_sc(ctx); ctx.textAlign="left"; _drawOutlineText(ctx,txt,bx,p[1],Math.round(10*_kf_sc),col,_kf_sc);
    });
  }

  // ── [v17] Legend box top-right ────────────────────────────────────────────
  if (!isLat) {
    const items = [
      { col:"rgba(0,201,122,0.9)",  lbl:"Normal" },
      { col:"rgba(255,179,0,0.9)",  lbl:"Mild deviation" },
      { col:"rgba(255,77,109,0.9)", lbl:"Significant" },
      { col:"rgba(200,100,255,0.9)",lbl:"ASIS / Pelvis" },
      { col:"rgba(147,51,234,0.9)", lbl:"Spine segments" },
    ];
    const lw=122, lh=items.length*17+12, lx=W-lw-6, ly=6;
    ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(lx,ly,lw,lh);
    items.forEach(({col,lbl},i) => {
      const iy = ly+12+i*17;
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(lx+11,iy-3,5,0,Math.PI*2); ctx.fill();
      ctx.font="bold 9px system-ui"; ctx.fillStyle="#1e1e2e"; ctx.textAlign="left";
      ctx.fillText(lbl,lx+21,iy);
    });
  }

  // ── [v17] View label at bottom centre ─────────────────────────────────────
  {
    const viewLabel = view==="anterior"?"ANTERIOR VIEW":view==="posterior"||view==="back"?"POSTERIOR VIEW":view==="left"?"LEFT LATERAL":view==="right"?"RIGHT LATERAL":"";
    if (viewLabel) {
      ctx.font = "bold 10px system-ui";
      const tw = ctx.measureText(viewLabel).width;
      ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(W/2-tw/2-10,H-24,tw+20,18);
      ctx.fillStyle="#0891b2"; ctx.textAlign="center";
      ctx.fillText(viewLabel,W/2,H-9);
    }
  }

  // ── [v17] Summary title at top of image ───────────────────────────────────
  // Derives the main finding from measurements and writes it on the photo
  if (!isLat && (m.shoulderAngle||m.trunkLateralShift||m.headTiltAngle)) {
    const parts=[];
    if (m.shoulderAngle!==null && Math.abs(m.shoulderAngle||0)>3) {
      const side=m.shoulderAngle>0?"Right":"Left";
      parts.push(`${side} Shoulder Elevated`);
    }
    if (m.trunkLateralShift!==null && Math.abs(m.trunkLateralShift||0)>3) {
      // In anterior view, positive = image right = patient LEFT
      const side=m.trunkLateralShift>0?(view==="anterior"?"Left":"Right"):(view==="anterior"?"Right":"Left");
      parts.push(`${side} Trunk Shift`);
    }
    if (m.headTiltAngle!==null && Math.abs(m.headTiltAngle||0)>3) {
      const side=m.headTiltAngle>0?"Right":"Left";
      parts.push(`Head Tilt ${side}`);
    }
    if (parts.length>0) {
      const title=`Observation: ${parts.join(" + ")}`;
      ctx.font="bold 10px system-ui";
      const tw=ctx.measureText(title).width;
      const bw=Math.min(tw+24,W-10);
      ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillRect(W/2-bw/2,4,bw,20);
      // Colored top accent line
      ctx.fillStyle="rgba(239,68,68,0.85)";
      if(ctx.roundRect) ctx.roundRect(W/2-bw/2,4,bw,3,2); else ctx.rect(W/2-bw/2,4,bw,3);
      ctx.fill();
      ctx.fillStyle="#1e1e2e"; ctx.textAlign="center";
      ctx.fillText(title,W/2,18);
    }
  }

  // ── Stress heatmap (all views) ────────────────────────────────────────────
  const hotspots=[];
  const addHot=(idx,intensity)=>{ if(!V(idx)) return; const p=PX(idx); if(p) hotspots.push({x:p[0],y:p[1],r:45+intensity*20,intensity}); };
  if(Math.abs(m.shoulderAngle||0)>4) addHot(m.shoulderAngle>0?11:12, Math.min(1,Math.abs(m.shoulderAngle)/12));
  if(Math.abs(m.pelvisAngle||0)>3)   addHot(m.pelvisAngle>0?24:23,   Math.min(1,Math.abs(m.pelvisAngle)/10)); // +ve=Right(24) elevated
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

// ── MediaPipe Pose singleton ─────────────────────────────────────────────────
// The MediaPipe Pose (0.5 solution API) uses a single shared Emscripten WASM
// module and CANNOT be created/initialised twice in one page — a second attempt
// throws `Aborted(Module.arguments has been replaced…)`. React StrictMode and
// Vite HMR both double-invoke effects, which is exactly what produced the
// intermittent "AI Error". We therefore load pose.js once and initialise exactly
// once, caching the promise on `window` so it survives HMR module re-evaluation.
// A rejected attempt clears the cache so an explicit retry can start fresh.
function getMediaPipePose(){
  if(typeof window==="undefined") return Promise.reject(new Error("no window"));
  if(window.__mpPosePromise) return window.__mpPosePromise;
  const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error("MediaPipe init timeout")),ms))]);
  const p=(async()=>{
    if(typeof window.Pose!=="function"){
      await loadScript(`${MP_CDN}/pose.js`);
      await loadScript(`${MP_CDN}/pose_solution_simd_wasm_bin.js`);
    }
    if(typeof window.Pose!=="function") throw new Error("Pose global not available");
    const pose=new window.Pose({locateFile:f=>`${MP_CDN}/${f}`});
    pose.setOptions({modelComplexity:2,smoothLandmarks:true,smoothSegmentation:false,enableSegmentation:false,minDetectionConfidence:0.6,minTrackingConfidence:0.6});
    await withTimeout(pose.initialize(),25000);
    return pose;
  })();
  window.__mpPosePromise=p;
  p.catch(()=>{ window.__mpPosePromise=null; }); // allow a clean retry after failure
  return p;
}

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
      {/* Path A screening disclaimer — shown above every result set */}
      <div style={{ marginBottom:12, padding:"9px 12px", borderRadius:10, background:"rgba(180,83,9,0.08)", border:"1px solid rgba(180,83,9,0.25)", fontSize:"0.74rem", color:PC.muted, lineHeight:1.5 }}>
        ⓘ <strong>Screening &amp; education only.</strong> These are automated observations from a 2D photo and may be inaccurate — <strong>not a medical diagnosis</strong>. This tool is not a medical device and does not provide medical advice. Consult a qualified healthcare professional.
      </div>
      {/* Summary bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:"0.82rem", fontWeight:700, color:PC.muted, textTransform:"uppercase", letterSpacing:"1px" }}>
          Screening Observations
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {confirmed.length > 0 && (
            <span style={{ fontSize:"0.78rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
              background: PC.green+"15", color: PC.green, border:`1px solid ${PC.green}33` }}>
              ✓ {confirmed.length} confirmed
            </span>
          )}
          {singleView.length > 0 && (
            <span style={{ fontSize:"0.78rem", fontWeight:700, padding:"2px 7px", borderRadius:99,
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
            color: PC.muted, fontSize:"0.8rem", fontWeight:700, cursor:"pointer" }}>
          {showAll
            ? `▲ Show primary findings only`
            : `▼ Show all ${rest.length} additional findings`}
        </button>
      )}

      {/* Clinical note */}
      <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8,
        background: PC.accent+"08", border:`1px solid ${PC.border}`,
        fontSize:"0.82rem", color:PC.muted, lineHeight:1.5 }}>
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
          <div style={{ fontSize:"0.82rem", fontWeight:700, color:PC.text, lineHeight:1.3 }}>
            {f.text}
          </div>
          <div style={{ fontSize:"0.8rem", color:PC.muted, marginTop:2 }}>
            {f.region}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
          {/* Severity */}
          <span style={{ fontSize:"0.8rem", color:col, fontWeight:700 }}>
            {f.severity?.toUpperCase()}
          </span>
          {/* Confidence badge */}
          {isConfirmed && (
            <span style={{ fontSize:"0.75rem", fontWeight:700, padding:"1px 5px", borderRadius:99,
              background: PC.green+"20", color: PC.green, border:`1px solid ${PC.green}44` }}>
              ✓ CONFIRMED
            </span>
          )}
          {isLowConf && (
            <span style={{ fontSize:"0.75rem", fontWeight:700, padding:"1px 5px", borderRadius:99,
              background: PC.yellow+"20", color: PC.yellow, border:`1px solid ${PC.yellow}44` }}>
              ⚡ VERIFY
            </span>
          )}
          {!isConfirmed && !isLowConf && (
            <span style={{ fontSize:"0.75rem", fontWeight:700, padding:"1px 5px", borderRadius:99,
              background: PC.muted+"15", color: PC.muted, border:`1px solid ${PC.border}` }}>
              ○ SINGLE VIEW
            </span>
          )}
          <div style={{ color:PC.muted, fontSize:"0.8rem" }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${col}20`,
          fontSize:"0.78rem", color:PC.muted, lineHeight:1.6 }}>
          {f.detail && (
            <div style={{ marginBottom:6, fontStyle:"italic", color:PC.muted }}>{f.detail}</div>
          )}
          {f.correction && (
            <div><strong style={{ color:col }}>Treatment: </strong>{f.correction}</div>
          )}
          {f.norm && (
            <div style={{ marginTop:5, fontSize:"0.8rem", fontStyle:"italic" }}>
              Reference: {f.norm}
            </div>
          )}
          {isLowConf && (
            <div style={{ marginTop:6, padding:"4px 8px", borderRadius:6,
              background: PC.yellow+"12", color: PC.yellow, fontSize:"0.8rem", fontWeight:600 }}>
              ⚡ Landmark confidence may be affected by lighting or clothing.
              Verify with goniometry or clinical assessment.
            </div>
          )}
          {f.sourceViews && f.sourceViews.length > 0 && (
            <div style={{ marginTop:5, fontSize:"0.8rem", color:PC.accent }}>
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
  const isObs = f.text && f.text.startsWith("OBSERVATION:");
  const conf = f.confidenceScore || f.confidence || 70;
  const confColor = conf >= 80 ? PC.green : conf >= 60 ? PC.yellow : PC.red;
  const confLabel = conf >= 80 ? "High" : conf >= 60 ? "Moderate" : "Low";
  const needsConfirmation = conf < 80;
  const displayText = isObs ? f.text.replace(/^OBSERVATION:\s*/i, "").split(/\.\s*Clinical confirmation/i)[0].trim() : (f.text || "");
  const objectiveTests = f.objectiveAssessments || [];
  return(
    <div onClick={()=>setOpen(o=>!o)} style={{border:`1px solid ${col}30`,borderRadius:10,padding:"10px 12px",marginBottom:7,background:`${col}08`,cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:col,marginTop:5,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{displayText}</div>
          <div style={{fontSize:"0.78rem",color:PC.muted,marginTop:2}}>
            {f.region} · Confidence: <span style={{color:confColor,fontWeight:700}}>{conf}% ({confLabel})</span>
          </div>
          {needsConfirmation&&<div style={{fontSize:"0.57rem",color:PC.yellow,fontWeight:600,marginTop:1}}>⚡ Clinical confirmation recommended (&lt;80% confidence)</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
          <div style={{fontSize:"0.75rem",color:col,fontWeight:700}}>{f.severity?.toUpperCase()}</div>
          <div style={{color:PC.muted,fontSize:"0.8rem"}}>{open?"▲":"▼"}</div>
        </div>
      </div>
      {open&&(
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${col}20`,fontSize:"0.78rem",color:PC.muted,lineHeight:1.6}}>
          {/* Layer 1 — Observation */}
          <div style={{marginBottom:7,padding:"6px 9px",background:`${PC.accent}08`,borderRadius:7,border:`1px solid ${PC.accent}18`}}>
            <div style={{fontSize:"0.78rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:2}}>Layer 1 — Observable Alignment Finding</div>
            <div style={{color:PC.text,fontWeight:600,fontSize:"0.67rem"}}>{displayText}</div>
            {f.norm&&<div style={{marginTop:3,fontSize:"0.78rem",fontStyle:"italic"}}>Reference: {f.norm}</div>}
          </div>
          {/* Layer 2 — Possible Contributors */}
          {(f.detail || f.correction) && (
            <div style={{marginBottom:7,padding:"6px 9px",background:"rgba(255,179,0,0.06)",borderRadius:7,border:"1px solid rgba(255,179,0,0.18)"}}>
              <div style={{fontSize:"0.78rem",fontWeight:800,color:PC.yellow,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:2}}>Layer 2 — Possible Contributors (Not Diagnoses)</div>
              <div style={{color:PC.text,fontSize:"0.67rem"}}>{f.detail || f.correction}</div>
            </div>
          )}
          {/* Layer 3 — Recommended Confirmation Tests */}
          {objectiveTests.length>0&&(
            <div style={{padding:"6px 9px",background:"rgba(5,150,105,0.05)",borderRadius:7,border:"1px solid rgba(5,150,105,0.18)"}}>
              <div style={{fontSize:"0.78rem",fontWeight:800,color:PC.green,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Layer 3 — Recommended Confirmation Tests</div>
              {objectiveTests.map((t,i)=>(
                <div key={i} style={{display:"flex",gap:5,alignItems:"flex-start",marginBottom:2}}>
                  <span style={{color:PC.green,fontSize:"0.75rem"}}>▸</span>
                  <span style={{color:PC.text,fontSize:"0.67rem"}}>{t}</span>
                </div>
              ))}
            </div>
          )}
          {needsConfirmation&&(
            <div style={{marginTop:5,padding:"3px 7px",borderRadius:5,background:`${PC.yellow}12`,color:PC.yellow,fontSize:"0.78rem",fontWeight:600}}>
              ⚡ Confidence {conf}% — clinical confirmation recommended before treatment decisions.
            </div>
          )}
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
      <div style={{flex:1,fontSize:"0.78rem",color:PC.muted}}>{label}</div>
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
  "Pelvis / SIJ":             { tight:["QL (elevated side — possible contributor)","Hip Abductors (elevated side — confirm clinically)"],   weak:["Glute Med (low side — confirm clinically)","Hip Abductors (low side — confirm clinically)"] },
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
  "Thoracic Kyphosis (Trunk Lean Est.)":        { tight:["Pectorals Major/Minor","Upper Trapezius","SCM"],        weak:["Lower Trapezius","Rhomboids","Mid Thoracic Extensors"] },
  "Pelvis / Lumbar":          { tight:["Iliopsoas","Rectus Femoris","TFL","QL"],                weak:["Glute Max","Transverse Abdominis","Hamstrings"] },
  "Hip / Global":             { tight:["Hip Flexors","Lumbar Extensors"],                       weak:["Glute Max","Abdominals"] },
  "Lower Crossed Syndrome":   { tight:["Iliopsoas","Rectus Femoris","TFL","Thoracolumbar Fascia"], weak:["Glute Max","Glute Med","Transverse Abdominis"] },
  "Lower Crossed Syndrome (LCS)": { tight:["Iliopsoas","Rectus Femoris","TFL","Thoracolumbar Fascia"], weak:["Glute Max","Glute Med","Transverse Abdominis"] },
  "Upper Crossed Syndrome (UCS)": { tight:["Upper Trapezius","Levator Scapulae","SCM","Pec Minor","Scalenes"], weak:["Deep Cervical Flexors","Lower Trapezius","Serratus Anterior","Mid Thoracic Extensors"] },
  "Posture Pattern — Sway-Back": { tight:["Hamstrings","Abdominals","Hip Extensors"],          weak:["Hip Flexors (Iliopsoas)","Lumbar Extensors"] },
  "Posture Pattern — Military / Flat Back": { tight:["Abdominals","Hamstrings"],               weak:["Thoracic Extensors","Lumbar Extensors","Hip Flexors"] },
  "Frontal Plane Tibial Alignment": { tight:["Peroneals","Gastrocnemius/Soleus"],               weak:["Tibialis Posterior","Tibialis Anterior"] },
  "Ankle":                    { tight:["Gastrocnemius","Soleus"],                               weak:["Tibialis Anterior","Peroneals"] },
  "Knee (Sagittal)":           { tight:["TFL / ITB","Rectus Femoris"],                           weak:["Glute Med","VMO","Hamstrings"] },
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
  "Thoracic Kyphosis (Trunk Lean Est.)":        [
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
  "Frontal Plane Tibial Alignment":             [
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
  "Thoracic Kyphosis (Trunk Lean Est.)":      [
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
  "Frontal Plane Tibial Alignment":            [
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
          <span style={{fontSize:"0.75rem",fontWeight:800,color:c}}>{muscle}</span>
          {hasHigh && <span style={{fontSize:"0.75rem",padding:"1px 5px",borderRadius:4,background:`${c}18`,color:c,fontWeight:700}}>HIGH</span>}
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
          <div style={{fontWeight:800,fontSize:"0.78rem",color:PC.text}}>Commonly-associated muscle patterns</div>
          <div style={{fontSize:"0.8rem",color:PC.muted}}>Educational — patterns often linked to these observations. Not a diagnosis; a professional can assess.</div>
        </div>
      </div>
      {/* Two columns */}
      <div style={{display:"grid",gridTemplateColumns:isWide?"1fr 1fr":"1fr 1fr",gap:0}}>
        {/* Tight / Overactive */}
        <div style={{padding:"12px 12px",borderRight:`1px solid ${PC.border}`}}>
          <div style={{fontSize:"0.82rem",fontWeight:800,color:col.tight,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <span>■</span> TIGHT / OVERACTIVE
          </div>
          {tight.length === 0
            ? <div style={{fontSize:"0.75rem",color:PC.muted,fontStyle:"italic"}}>None identified</div>
            : tight.map(([m,r]) => muscleChip(m, r, true))
          }
        </div>
        {/* Weak / Underactive */}
        <div style={{padding:"12px 12px"}}>
          <div style={{fontSize:"0.82rem",fontWeight:800,color:col.weak,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <span>⚡</span> WEAK / UNDERACTIVE
          </div>
          {weak.length === 0
            ? <div style={{fontSize:"0.75rem",color:PC.muted,fontStyle:"italic"}}>None identified</div>
            : weak.map(([m,r]) => muscleChip(m, r, false))
          }
        </div>
      </div>
      {/* Legend */}
      <div style={{padding:"8px 14px",background:PC.s2,borderTop:`1px solid ${PC.border}`,fontSize:"0.78rem",color:PC.muted}}>
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
            <div style={{fontWeight:800,fontSize:"0.78rem",color:PC.text}}>Areas a professional might assess</div>
            <div style={{fontSize:"0.8rem",color:PC.muted}}>{tests.length} topics to raise with a qualified professional — informational only</div>
          </div>
        </div>
        {tests.length > (isWide ? 6 : 4) && (
          <button onClick={()=>setOpenAll(o=>!o)} style={{fontSize:"0.82rem",fontWeight:700,color:PC.accent,background:"none",border:"none",cursor:"pointer"}}>
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
              <div style={{width:20,height:20,borderRadius:6,background:`${PC.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.82rem",fontWeight:800,color:PC.accent,flexShrink:0,marginTop:1}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{t.name}</div>
                <div style={{fontSize:"0.8rem",color:PC.muted,marginTop:2,lineHeight:1.4}}>{t.purpose}</div>
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
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div>
          <div style={{fontWeight:900,fontSize:isWide?"0.95rem":"0.85rem",color:PC.text}}>▶ General Movement Suggestions</div>
          <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:2}}>{totalCount} example activities · linked to {findings.length} observations</div>
        </div>
      </div>
      {/* Educational disclaimer — Path A (not a prescription) */}
      <div style={{marginBottom:14,padding:"9px 12px",borderRadius:10,background:"rgba(180,83,9,0.08)",border:"1px solid rgba(180,83,9,0.25)",fontSize:"0.76rem",color:PC.muted,lineHeight:1.5}}>
        ⓘ These are <strong>general educational examples</strong>, not a prescription or treatment plan. They may not be suitable for you. Talk to a qualified healthcare or fitness professional before starting any exercise. <strong>Not medical advice.</strong>
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
                <div style={{fontSize:"0.78rem",color:PC.muted,marginTop:1}}>{meta.desc}</div>
              </div>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:meta.colour,background:`${meta.colour}12`,padding:"3px 8px",borderRadius:6}}>
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
      <div style={{padding:"10px 14px",borderRadius:10,background:PC.s2,border:`1px solid ${PC.border}`,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
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
          fontSize:"0.8rem",fontWeight:800,color:catColor[cat],flexShrink:0,marginTop:1
        }}>{idx+1}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text,lineHeight:1.3}}>{ex.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
            <span style={{fontSize:"0.82rem",fontWeight:700,color:catColor[cat],
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
        <span style={{fontSize:"0.75rem",color:PC.muted,flexShrink:0,marginTop:2}}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{marginTop:9,paddingTop:9,borderTop:`1px solid ${catBorder[cat]}`,
          fontSize:"0.67rem",color:PC.text,lineHeight:1.6,
          background:catBg[cat],borderRadius:6,padding:"8px 10px",marginLeft:30}}>
          {/* Dosage summary line */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
            <span style={{fontSize:"0.8rem",fontWeight:700,color:catColor[cat],
              padding:"2px 8px",borderRadius:5,background:`${catBg[cat]}`,border:`1px solid ${catBorder[cat]}`}}>
              {ex.sets}
            </span>
            <span style={{fontSize:"0.8rem",color:PC.muted,padding:"2px 7px",borderRadius:5,
              background:"rgba(124,58,237,0.07)",border:"1px solid rgba(124,58,237,0.15)"}}>
              Frequency: Daily · Reassess 4–6 wks
            </span>
          </div>
          <span style={{fontSize:"0.8rem",fontWeight:700,color:catColor[cat]}}>Technique: </span>
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

// ─── usePostureHistory — posture session history hook ─
function usePostureHistory(){
  const [sessions,setSessions]=useState([]);
  const saveSession=useCallback((s)=>setSessions(prev=>[...prev.slice(-19),s]),[]);
  const clearHistory=useCallback(()=>setSessions([]),[]);
  return {sessions,saveSession,clearHistory};
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
function PostureAnalysisModule({ activePatient, set: setPatientField }){
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

  // ── Landmark verification (hybrid AI + clinician) ─────────────────────────
  const { verified, setVerified, clearVerified, mergeWithMediaPipe, boostFindingConfidence } = useVerifiedLandmarks();
  const [activeLandmark, setActiveLandmark] = useState(null);
  const verifiedCount = Object.keys(verified).length;
  const isClinicianVerified = verifiedCount > 0;

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
  // Hybrid Kendall mode — receives findings when user confirms landmarks
  const [kendallFindings,setKendallFindings]=useState(null);
  const [kendallMeasurements,setKendallMeasurements]=useState(null);
  const [kendallSegmentStatus,setKendallSegmentStatus]=useState(null);
  // HybridKendall's own finding categories (e.g. "Forward Head Posture",
  // "Shoulder Posterior Position") don't match the region keys the Exercise
  // Plan (EXERCISE_MAP) and Special Tests (SPECIAL_TESTS_MAP) engines look up
  // against (e.g. "Cervical / CVA", "Shoulder Girdle") — so sagittal findings
  // from the manual/Hybrid Kendall workflow never matched anything and the
  // Plan/Tests tabs stayed empty even when real findings were present. Map
  // each Kendall category to the closest existing region key so they connect
  // to the same exercise/test recommendation engine Frontal already uses.
  const KENDALL_CATEGORY_TO_REGION = {
    "Forward Head Posture": "Cervical / CVA",
    "Shoulder Anterior Position": "Shoulder Girdle",
    "Shoulder Posterior Position": "Shoulder Girdle",
    "Thoracic Curvature Index": "Thoracic Kyphosis (Trunk Lean Est.)",
    "Lumbar Curvature Index": "Pelvis / Lumbar",
    "Pelvic Tilt": "Pelvis / Lumbar",
    "Knee Position": "Knee (Sagittal)",
  };
  const handleKendallFindings = (findings, measurements, segmentStatus) => {
    setKendallFindings(findings);
    setKendallMeasurements(measurements);
    setKendallSegmentStatus(segmentStatus);
    const mapRegion = (category) => KENDALL_CATEGORY_TO_REGION[category] || category;
    // Convert to the app's finding format for display in the results panel
    const converted = findings.filter(f=>f.severity&&f.severity!=="Info"&&f.severity!=="Normal").map(f=>({
      region: mapRegion(f.category),
      text: f.label,
      severity: (f.severity||"moderate").toLowerCase(),
      plain: f.label,
      correction: "",
      icd: "",
      norm: "",
      _debug: f._debug,
      _kendall: true,
    }));
    if (converted.length > 0 || findings.some(f=>f.id==="kendall_pattern")) {
      setFindings(findings.map(f=>({...f, region:mapRegion(f.category), text:f.label})));
    }
  };
  // photoOrientation: "selfie" = mirrored (front camera, x-axis is flipped — MediaPipe default)
  //                   "standard" = non-mirrored (separate camera, patient's left = image left)
  // Impact: all frontal L/R labels swap between modes.
  const [photoOrientation,setPhotoOrientation]=useState("selfie");
  const [manualPlaced,setManualPlaced]=useState({});    // {[pointId]: {x,y}}
  const [manualImgDims,setManualImgDims]=useState(null); // {w,h} of displayed image
  const [manualAnalysed,setManualAnalysed]=useState(false);
  // 5-point sagittal refine (AI mode, lateral views)
  const [aiSagPlaced,setAiSagPlaced]=useState({});  // {ear,shoulder,hip,knee,ankle} → {x,y} normalised
  const [aiSagActive,setAiSagActive]=useState(false); // tap-to-place mode on/off
  // Manual spinal landmarks for TCI/LCI/pelvic tilt
  // {c7Y, t12Y, s2Y}: normalised trunk-height fractions (0=shoulder, 1=hip)
  // {asis, psis}: {x,y} normalised image coordinates
  // {patientSex}: "Male" | "Female"
  const [manualSpinal,setManualSpinal]=useState({}); // {c7Y, t12Y, s2Y, asis, psis}
  const [hybridSeedLandmarks,setHybridSeedLandmarks]=useState(null); // raw ViTPose lm for HybridKendall
  const [vitposeLoading,setVitposeLoading]=useState(false); // true while ViTPose auto-placement is running
  const [vitposeError,setVitposeError]=useState(null); // set if AI auto-placement fails, so the UI can say why instead of silently sitting in manual mode
  // spinalLevelMode: which vertebral level is being tapped next
  const [spinalLevelMode,setSpinalLevelMode]=useState(null); // null | 'c7' | 't12'
  // Helper: get shoulder and hip Y (normalised 0-1) from current landmarks or manual placement
  const getSpinalRefY = () => {
    // AI mode: use MediaPipe landmarks
    if (landmarks) {
      const shY  = landmarks[11]?.visibility>0.3 ? landmarks[11].y : landmarks[12]?.visibility>0.3 ? landmarks[12].y : null;
      const hipY = landmarks[23]?.visibility>0.3 ? landmarks[23].y : landmarks[24]?.visibility>0.3 ? landmarks[24].y : null;
      return { shY, hipY };
    }
    // Manual mode: use manualPlaced point ids 2=shoulder, 3=hip
    const shY  = manualPlaced[2]?.y ?? null;
    const hipY = manualPlaced[3]?.y ?? null;
    return { shY, hipY };
  };
  // Convert image-normalised tapY → trunk-normalised Y (0=shoulder, 1=hip)
  const tapYToTrunkNorm = (tapY) => {
    const { shY, hipY } = getSpinalRefY();
    if (!shY || !hipY || hipY <= shY) return null;
    return (tapY - shY) / (hipY - shY);
  };
  // Build sagManualLandmarks object passed to buildSagittalFindings
  const sagManualLandmarks = {
    c7Y:       manualSpinal.c7Y   ?? undefined,
    t12Y:      manualSpinal.t12Y  ?? undefined,
    s2Y:       manualSpinal.s2Y   ?? undefined,
    asis:      manualSpinal.asis  ?? null,
    psis:      manualSpinal.psis  ?? null,
    patientSex: patientInfo?.sex ?? "Female",
  };
  const aiSagImgRef=useRef(null);
  const manualImgRef=useRef(null);
  const manualContainerRef=useRef(null);

  const videoRef=useRef(null);
  const overlayRef=useRef(null);
  const captureAreaRef=useRef(null); // scrollable Camera/Upload area — reset to top on each new photo
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

  // A full-body portrait photo rendered at 100% width is usually taller than the
  // visible screen, so the capture area scrolls. Whatever scroll position it was
  // last left at (e.g. from reviewing a previous photo) otherwise persists into
  // the newly analysed photo, which can land the user on the middle/bottom of the
  // image (legs) instead of the top (head) with no indication there's more above.
  useEffect(()=>{
    if(captureAreaRef.current) captureAreaRef.current.scrollTop = 0;
  },[rawUploadedImg]);

  // ── Warm up ViTPose (lateral-view pose model) as soon as a sagittal view is
  // selected, so the model is already loaded by the time a photo is analysed. ─
  const vitWarmedRef = useRef(false);
  useEffect(()=>{
    if((view==="left"||view==="right") && !vitWarmedRef.current){
      vitWarmedRef.current = true;
      warmupViTPose().catch(()=>{});
    }
  },[view]);

  // ── Load MediaPipe (singleton-backed, safe under StrictMode/HMR + retry) ─────
  const loadMediaPipe=useCallback(async()=>{
    if(poseRef.current){ setMpStatus("ready"); return; }
    setMpStatus("loading");
    try{
      const pose=await getMediaPipePose();
      poseRef.current=pose;
      setMpStatus("ready");
      // If camera was started before AI loaded, connect the handler now
      if(liveHandlerRef.current){ try{ pose.onResults(liveHandlerRef.current); }catch(_){} }
    }catch(e){
      console.warn("MediaPipe init failed:",e?.message||e);
      setMpStatus("error");
    }
  },[]);

  useEffect(()=>{ loadMediaPipe(); },[loadMediaPipe]);

  // ── Process landmarks ───────────────────────────────────────────────────────
  const processLandmarks=useCallback((lm,v,imgH)=>{
    // Each step isolated — partial failure still populates what it can
    let calib=null;
    try { calib=computeCalibration(lm,patientHeightCm,imgH||videoSizeRef.current?.h||480); }
    catch(e){ console.warn("computeCalibration error:",e); }

    let m={};
    try { m=measureLandmarks(lm,calib,v)||{}; }
    catch(e){ console.warn("measureLandmarks error:",e); }
    let r={score:0,status:"Error",blocked:false,warnings:[],icc:null,confidence:{}};
    try { r=calcReliability(lm,v); }
    catch(e){ console.warn("calcReliability error:",e); }

    let f=[];
    try { f=r.blocked?[]:buildFindings(lm,v||viewRef.current,m); }
    catch(e){ console.warn("buildFindings error:",e); }

    // ── Universal fallback findings generator — all 4 views ─────────────────────
    // Fires when buildFindings returns nothing but measurements show clear deviations.
    const viewForFallback = v||viewRef.current||"anterior";
    const isLatFallback   = viewForFallback==="left"||viewForFallback==="right";
    const isFrontFallback = viewForFallback==="anterior"||viewForFallback==="posterior"||viewForFallback==="back";
    const meaningfulFindings = f.filter(x => x.severity!=="mild" || x.region!=="Sagittal Assessment — Summary");

    if (meaningfulFindings.length === 0 && m && Object.keys(m).length > 0) {
      const fb = [];

      // ── SAGITTAL findings (lateral views) ──────────────────────────────────
      if (isLatFallback) {
        if (m.cvaAngle!=null&&m.cvaAngle<55) { const sev=m.cvaAngle<44?"high":m.cvaAngle<49?"moderate":"mild"; fb.push({region:"Cervical / CVA",text:`Forward head tendency — CVA ${m.cvaAngle.toFixed(1)}° (normal >55°)`,plain:`CVA ${m.cvaAngle.toFixed(1)}°`,severity:sev,confidenceScore:72,clinicalSignificance:sev,correction:"Chin tucks, deep cervical flexor strengthening.",icd:"M43.6",norm:"Normal CVA >55°"}); }
        if (m.fhpDevCm!=null&&m.fhpDevCm>2&&m.cvaAngle===null) { fb.push({region:"Forward Head Posture",text:`Ear ${m.fhpDevCm.toFixed(1)}cm anterior to acromion`,plain:`FHP ${m.fhpDevCm.toFixed(1)}cm`,severity:m.fhpDevCm>4?"high":"moderate",confidenceScore:70,clinicalSignificance:"moderate",correction:"Postural correction, scapular retraction.",icd:"M43.6",norm:"<2cm"}); }
        if (m.thoracicAngle!=null&&m.thoracicAngle>45) { const sev=m.thoracicAngle>58?"high":m.thoracicAngle>50?"moderate":"mild"; fb.push({region:"Thoracic Kyphosis",text:`Increased thoracic curvature tendency — ${m.thoracicAngle.toFixed(1)}° (normal 20–45°)`,plain:`Thoracic ${m.thoracicAngle.toFixed(1)}°`,severity:sev,confidenceScore:65,clinicalSignificance:sev,correction:"Thoracic extension, pec stretch, lower trap activation.",icd:"M40.2",norm:"20–45°"}); }
        if (m.sagShoulderShift!=null&&Math.abs(m.sagShoulderShift)>2) {
        const abs=Math.abs(m.sagShoulderShift); const dir=m.sagShoulderShift>0?"anterior":"posterior";
        // Rounded shoulder = scapular protraction → detected as shoulder anterior to plumb.
        // If posterior, may be compensatory retraction or genuine posterior lean.
        const label = m.sagShoulderShift>0
          ? `Rounded shoulder tendency — acromion ~${abs.toFixed(1)}cm anterior to plumb`
          : `Shoulder posterior displacement ~${abs.toFixed(1)}cm from plumb`;
        fb.push({region:"Shoulder / Rounded Tendency",text:label,plain:"Rounded shoulder tendency",severity:abs>4?"high":"moderate",confidenceScore:65,clinicalSignificance:"moderate",correction:"Scapular retraction, pec minor stretch, serratus anterior activation. Thoracic foam roll.",icd:"M62.9",norm:"Acromion within 2cm of plumb (Kendall)"});
      }
      // Rounded shoulder secondary indicator: ONLY fire when shoulder is actually ANTERIOR
      // Do NOT fire when shoulder is posterior (sway-back pattern)
      const shIsAnterior = m.sagShoulderShift != null && m.sagShoulderShift > 1.0;
      if (!fb.some(x=>x.region==="Shoulder / Rounded Tendency") && m.thoracicAngle!=null&&m.thoracicAngle>46 && shIsAnterior) {
        fb.push({region:"Shoulder / Rounded Tendency",text:"Rounded shoulder tendency — associated with increased thoracic curvature",plain:"Rounded shoulders",severity:"moderate",confidenceScore:62,clinicalSignificance:"moderate",correction:"General activities some find helpful (discuss with a professional first): gentle pec-minor stretching, shoulder-blade retraction, and lower-trapezius work.",icd:"M62.9",norm:"Neutral scapular position"});
      }
      // ── SWAY-BACK PATTERN detection (Kendall D) ────────────────────────────────
      // Pattern: shoulder POSTERIOR to plumb + ear AND/OR hip ANTERIOR to plumb
      // This is the most commonly missed pattern — mistaken for rounded shoulder
      const shPostToPlumb = m.sagShoulderShift != null && m.sagShoulderShift < -1.0;
      const hipAntToPlumb = m.sagPelvicShift != null && m.sagPelvicShift > 1.5;
      const earAntToPlumb = (m.cvaAngle != null && m.cvaAngle < 55) || (m.fhpDevCm != null && m.fhpDevCm > 2);
      if (isLatFallback && shPostToPlumb && (hipAntToPlumb || earAntToPlumb)) {
        fb.push({
          region: "Sway-Back Posture Pattern",
          text: `Sway-back sagittal pattern — shoulder posterior to plumb${m.sagShoulderShift!=null?` (~${Math.abs(m.sagShoulderShift).toFixed(1)}cm posterior)`:""}, hip${hipAntToPlumb&&m.sagPelvicShift!=null?` ~${m.sagPelvicShift.toFixed(1)}cm anterior`:""} to plumb`,
          plain: "Sway-back pattern",
          severity: "moderate",
          confidenceScore: 65,
          clinicalSignificance: "moderate",
          correction: "General activities some find helpful (discuss with a professional first): gentle hip-flexor activation, bringing the hips forward over the ankles, easing off over-bracing of the abdominals/hamstrings, and gentle lower-back extension mobility.",
          interpretation: "Sway-back: upper trunk leans posterior, hips thrust anterior, lumbar lordosis reduced. Kendall D pattern. Hamstring and abdominal overactivity common. Assess hip flexor inhibition.",
          icd: "M40.3",
          norm: "Shoulder at plumb, hip within 2cm of plumb (Kendall)"
        });
      }
      // ── Kyphosis-Lordosis pattern detection (Kendall) ───────────────────────
      // Correct clinical pattern: FHP + shoulder ANTERIOR to plumb + possible APT.
      // Distinguishes from Image 2 (FHP only, shoulder near plumb, normal thoracic).
      // Reference: Kendall et al. "Muscles: Testing and Function" 5th Ed. p.80
      const hasFHPfb = m.cvaAngle!=null&&m.cvaAngle<52; // CVA must be clinically abnormal — fhpDevCm alone is insufficient
      const shAnteriorToPlumb = m.sagShoulderShift!=null && m.sagShoulderShift > 1.0; // shoulder forward
      const noKyphosisFinding = !fb.some(x=>x.region==="Thoracic Kyphosis"||x.region==="Thoracic Kyphosis (Trunk Lean Est.)");
      // Also check: large FHP (CVA <46°) with any shoulder anterior position suggests kyphosis-lordosis
      const severeFHP = m.cvaAngle!=null && m.cvaAngle < 46;
      if (isLatFallback && hasFHPfb && (shAnteriorToPlumb || severeFHP) && noKyphosisFinding) {
        const kSev = (m.cvaAngle!=null&&m.cvaAngle<44) ? "high" : "moderate";
        fb.push({
          region:"Thoracic Kyphosis",
          text:`Thoracic kyphosis tendency — forward head + anterior shoulder position consistent with kyphosis-lordosis pattern (Kendall)`,
          plain:"Kyphosis-lordosis pattern",
          severity:kSev, confidenceScore:65, clinicalSignificance:kSev,
          interpretation:"Forward head posture with anterior shoulder position indicates upper thoracic kyphosis tendency. The rounded upper back causes pec minor shortening (scapular protraction) and suboccipital overactivation to maintain horizontal gaze. Confirm with thoracic extension mobility assessment.",
          correction:"General activities some find helpful (discuss with a professional first): gentle mid-back (thoracic) extension mobility over a foam roller, pec-minor stretching, lower-trapezius work, and gentle chin-tuck movements.",
          icd:"M40.0", norm:"Acromion at plumb, CVA >55° (Kendall/Yip 2008)"
        });
      }
        if (m.sagPelvicShift!=null&&Math.abs(m.sagPelvicShift)>3) {
        const abs=Math.abs(m.sagPelvicShift); const isAPT=m.sagPelvicShift>0;
        const sev=abs>6?"high":abs>4?"moderate":"mild";
        const label=isAPT?`Hip anterior displacement — ~${abs.toFixed(1)}cm anterior to plumb (confirm pelvic tilt clinically)`:`Hip posterior displacement — ~${abs.toFixed(1)}cm posterior to plumb (flat-back tendency)`;
        fb.push({region:"Pelvis / Lumbar",text:label,plain:isAPT?"Anterior pelvic tilt":"Posterior pelvic tilt",severity:sev,confidenceScore:68,clinicalSignificance:sev,
        correction:isAPT?"General activities some find helpful (discuss with a professional first): gentle hip-flexor stretching, glute bridges, and deep-core activation.":"General activities some find helpful (discuss with a professional first): gentle hamstring stretching, hip-flexor activation, and lower-back extension mobility.",
        icd:isAPT?"M40.4":"M40.3",norm:"Hip within 2cm of plumb (Kendall)"}); }
      }

      // ── FRONTAL / POSTERIOR findings ─────────────────────────────────────────
      if (isFrontFallback) {
        // Same clinical firing gate as buildFindings: a frontal fallback finding
        // only fires when its key landmarks meet CLINICAL_MIN_VIS (0.65), so the
        // relaxed fallback path cannot bypass the two-tier visibility model.
        const cv = (...idx) => idx.every(i => (lm[i]?.visibility || 0) >= CLINICAL_MIN_VIS);
        if (cv(11,12)&&m.shoulderAngle!=null&&Math.abs(m.shoulderAngle)>3) { const abs=Math.abs(m.shoulderAngle); const side=m.shoulderAngle>0?"Right":"Left"; const sev=abs>7?"high":abs>5?"moderate":"mild"; fb.push({region:"Shoulder Level",text:`${side} shoulder elevated — ${abs.toFixed(1)}° asymmetry (normal <3°)`,plain:`${side} shoulder higher ${abs.toFixed(1)}°`,severity:sev,confidenceScore:78,clinicalSignificance:sev,correction:"Check for cervical muscle tightness, scapular stabilisation, check LLD.",icd:"M99.0",norm:"<3° shoulder height difference (Magee + healthy-norm)"}); }
        if (cv(23,24)&&m.pelvisAngle!=null&&Math.abs(m.pelvisAngle)>4) { const abs=Math.abs(m.pelvisAngle); const side=m.pelvisAngle>0?"Right":"Left"; const sev=abs>10?"high":abs>7?"moderate":"mild"; fb.push({region:"Pelvic Obliquity",text:`${side} iliac crest elevated — ${abs.toFixed(1)}° obliquity (normal <4°)`,plain:`Pelvic obliquity ${abs.toFixed(1)}°`,severity:sev,confidenceScore:72,clinicalSignificance:sev,correction:"Check hip abductor strength, LLD, QL tightness. Thomas test bilaterally.",icd:"M99.0",norm:"<4° pelvic obliquity (healthy-population norm, PMC10229507)"}); }
        if (cv(0,11,12)&&m.headLateralOffset!=null&&Math.abs(m.headLateralOffset)>2.5) { const abs=Math.abs(m.headLateralOffset); const side=m.headLateralOffset>0?"Right":"Left"; fb.push({region:"Head Lateral Tilt",text:`Head tilted ${abs.toFixed(1)}% toward ${side} (normal <2.5%)`,plain:`Head lateral tilt ${abs.toFixed(1)}%`,severity:abs>5?"moderate":"mild",confidenceScore:70,clinicalSignificance:"moderate",correction:"Cervical lateral flexion stretch, SCM/scalene release, check atlanto-axial rotation.",icd:"M99.0",norm:"Head centred within 2.5% of midline"}); }
        if (cv(11,12,23,24)&&m.trunkLateralShift!=null&&Math.abs(m.trunkLateralShift)>3.5) { const abs=Math.abs(m.trunkLateralShift); const dir=m.trunkLateralShift>0?"Right":"Left"; const sev=abs>6?"high":abs>4?"moderate":"mild"; fb.push({region:"Trunk Lateral Shift",text:`Trunk shifted ${dir} — ${abs.toFixed(1)}% of frame width (normal <3.5%)`,plain:`Trunk shift ${dir} ${abs.toFixed(1)}%`,severity:sev,confidenceScore:72,clinicalSignificance:sev,correction:"General core and trunk mobility/stability activities may help. Consider a professional assessment if the lean is pronounced.",icd:"M99.0",norm:"<3.5% lateral trunk shift (Magee)"}); }
        if (cv(25,26)&&m.lldProxy!=null&&m.lldProxy>5) { const sev=m.lldProxy>20?"high":m.lldProxy>10?"moderate":"mild"; fb.push({region:"Leg Length Discrepancy",text:`Possible LLD — knee height difference ~${m.lldProxy.toFixed(0)}mm (screen only)`,plain:`LLD screen ${m.lldProxy.toFixed(0)}mm`,severity:sev,confidenceScore:60,clinicalSignificance:sev,correction:"Confirm with X-ray or standing heel raise test. Orthotic if structural LLD confirmed.",icd:"M21.7",norm:"<5mm functional LLD (Magee)"}); }
        if (cv(23,24,25,26,27,28)&&m.leftKneeFrontal!=null&&m.rightKneeFrontal!=null) {
          const lk=Math.abs(m.leftKneeFrontal), rk=Math.abs(m.rightKneeFrontal);
          if(lk>6||rk>6){ const side=lk>rk?"Left":"Right"; const val=Math.max(lk,rk); const pattern=m.leftKneeFrontal<0||m.rightKneeFrontal<0?"Valgus tendency":"Varus tendency"; fb.push({region:"Knee Alignment",text:`${side} knee ${pattern} — ${val.toFixed(1)}° from mechanical axis (normal <6°)`,plain:`Knee ${pattern} ${val.toFixed(1)}°`,severity:val>10?"high":"moderate",confidenceScore:65,clinicalSignificance:"moderate",correction:"Hip abductor/external rotator strengthening, foot orthotic evaluation, patellar taping.",icd:"M21.0",norm:"<6° HKA deviation (Magee)"}); }
        }
        if (cv(0,23,24)&&m.spinalDeviation!=null&&Math.abs(m.spinalDeviation)>4) { const abs=Math.abs(m.spinalDeviation); fb.push({region:"Spinal Deviation Screen",text:`Spinal deviation screen positive — head/trunk offset ${abs.toFixed(1)}% (Adam's forward bend test recommended)`,plain:`Spinal deviation ${abs.toFixed(1)}%`,severity:abs>8?"moderate":"mild",confidenceScore:55,clinicalSignificance:"moderate",correction:"Adam's forward bend test. Refer for X-ray Cobb angle if rib hump present.",icd:"M41.9",norm:"Head centred over pelvis"}); }
      }

      if (fb.length > 0) f = fb;
      // Strip deprecated spinal diagnoses for lateral views — contour engine handles these
      if (isLatFallback) {
        f = f.filter(fi => {
          const reg  = fi.region || fi.category || "";
          const text = fi.text || fi.findingName || fi.label || "";
          // Remove legacy kyphosis/lordosis/pattern findings (replaced by contour engine)
          if (["Thoracic Kyphosis","Lumbar — Hyperlordosis","Lumbar — Flat Back",
            "Posture Pattern —","Upper Crossed Pattern","Lower Crossed Pattern",
            "Sagittal Pattern —"].some(dep => reg.includes(dep))) return false;
          // Remove "Shoulder / Rounded Tendency" when it's describing POSTERIOR displacement
          // (sway-back case — shoulder behind plumb ≠ rounded shoulder)
          if (reg.includes("Shoulder") && reg.includes("Rounded") &&
              text.toLowerCase().includes("posterior")) return false;
          return true;
        });
      }
    }

    let s={score:0,band:"No Data",colour:PC.muted,subScores:null};
    try { s=scorePosture(m,f,r); }
    catch(e){ console.warn("scorePosture error:",e); }

    // Kendall postural type classification
    let kendallType = null;
    try { kendallType = classifyKendallPostureType(m); } catch(e){}

    setLandmarks(lm);
    setMeasurements(Object.keys(m).length>0?{...m, _kendall:kendallType}:null);
    setFindings(f);
    setReliability(r);
    setScoreData(s);
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
          try {
            if(results.poseLandmarks?.length>0){
              // For standard (non-selfie) camera photos, flip x-axis so patient's
              // left = image left, matching MediaPipe's selfie-mode convention.
              const rawLm=results.poseLandmarks;
              const lm=photoOrientation==="standard"
                ? rawLm.map(p=>({...p, x:1-p.x}))
                : rawLm;
              // Merge 3D world landmarks (metric z-depth) into image landmarks.
              // poseWorldLandmarks gives real-world metric coordinates centred at hip midpoint.
              // We use z-depth to compute true lordosis/kyphosis angles.
              const worldLm = results.poseWorldLandmarks;
              if (worldLm?.length > 0) {
                lm.forEach((pt, i) => {
                  if (worldLm[i]) pt._wz = worldLm[i].z; // metric depth (m), negative = toward camera
                });
              }
              try {
                const calib=computeCalibration(lm,patientHeightCm,H);
                processLandmarks(lm,v,H);
              } catch(procErr) { console.warn("processLandmarks error:", procErr); }
              let mLocal={};
              try {
                const calib2=computeCalibration(lm,patientHeightCm,H);
                mLocal=measureLandmarks(lm,calib2,v)||{};
              } catch(mErr) { console.warn("measureLandmarks error:", mErr); }
              octx.fillStyle="#ffffff"; octx.fillRect(0,0,W,H);
              octx.drawImage(srcCanvas,0,0,W,H); // always from clean srcCanvas
              try { drawOverlay({ctx:octx,W,H,lm,view:v,showGrid:true,measurements:mLocal}); }
              catch(overlayErr) { console.warn("drawOverlay error (non-fatal):", overlayErr); }
              const annotated=oc.toDataURL("image/jpeg",0.92);
              resolve({lm,annotated});
            } else { resolve(null); }
          } catch(handlerErr) {
            console.warn("analysePhoto handler error:", handlerErr);
            resolve(null);
          }
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
    let result=null;
    try { result=await analysePhoto(url,view); }
    catch(e){ console.warn("analysePhoto threw unexpectedly:", e); }
    setAnalysing(false);
    if(result){
      // Show annotated overlay — analysePhoto uses createImageBitmap (clean, no taint)
      if(result.annotated) setUploadedImg(result.annotated);
      if(assessMode==="multi"){
        const m=measureLandmarks(result.lm,null,view);
        const r=calcReliability(result.lm,view);
        const f=r.blocked?[]:buildFindings(result.lm,view,m);
        const s=scorePosture(m,f,r);
        saveMvResult(view,m,f,s,r,result.annotated||url);
        // stay on capture tab so therapist can do next view
      } else {
        setTab("findings");
        if(isMobile) setMobilePanel("results");
      }
      // ── Auto-seed HybridKendall + ViTPose enhancement + contour analysis (lateral) ──
      if ((view==="left"||view==="right")) {
        // Seed HybridKendall's 5 points from the same MediaPipe detection that just
        // powered the standard findings above — it already succeeded on this photo,
        // so use it immediately rather than waiting on (or depending on) ViTPose.
        setHybridSeedLandmarks(result.lm);
        setVitposeError(null);
        const imgEl=new Image(); imgEl.src=url;
        imgEl.onload=async()=>{
          // ViTPose: opportunistic accuracy upgrade — a model trained specifically
          // for lateral views. HybridKendall only accepts a new seed while its own
          // points are still unplaced, so this can only help (refine before the
          // clinician starts reviewing) and never yanks already-placed points around.
          setVitposeLoading(true);
          try {
            const vitLm = await runViTPoseLateral(imgEl);
            if(vitLm) setHybridSeedLandmarks(vitLm);
          } catch(e){ console.warn("ViTPose (handleFile):", e); }
          finally { setVitposeLoading(false); }

          if (typeof analyzeSagittalContour!=="function") return;
          try {
            const mLocal=measureLandmarks(result.lm,null,view)||{};
            const cr=await analyzeSagittalContour(imgEl,result.lm,view).catch(()=>null);
            if(!cr) return;
            const sagF=buildSagittalFindings(result.lm,view,mLocal,cr,false,sagManualLandmarks);
            setFindings(prev=>[...sagF,...prev.filter(fi=>{
              const reg=fi.region||fi.category||"";
              return !["Thoracic Kyphosis","Lumbar — Hyperlordosis","Lumbar — Flat Back",
                "Posture Pattern —","Upper Crossed Pattern","Lower Crossed Pattern",
                "Sagittal Pattern —","Pelvis / Lumbar","Lumbar / Pelvis"].some(dep=>reg.includes(dep));
            })]);
          } catch(e){ console.warn("Contour (handleFile):", e); }
        };
      }
    } else {
      setError("Could not analyse photo — ensure full body is visible.");
    }
    e.target.value="";
  }

  async function startCamera(facing="environment"){
    // Allow camera to start — AI can finish loading in background
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
      // The <video> element only mounts when camStatus==="active" — set status
      // FIRST, then wait for the ref to appear before attaching the stream.
      setCamStatus("active");
      let video=videoRef.current;
      for(let i=0;i<40&&!video;i++){ await new Promise(r=>setTimeout(r,50)); video=videoRef.current; }
      if(!video){ try{stream.getTracks().forEach(t=>t.stop());}catch(_){ } streamRef.current=null; throw new Error("NoVideo"); }
      video.srcObject=stream;
      video.setAttribute("playsinline","");
      video.setAttribute("webkit-playsinline","");
      video.muted=true;

      await new Promise((res,rej)=>{
        const go=()=>video.play().then(res).catch(()=>res()); // muted+playsinline: play() rejection is non-fatal
        if(video.readyState>=1){ go(); }
        else { video.onloadedmetadata=go; }
        setTimeout(()=>rej(new Error("Timeout")), 8000);
      });

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
      // Only connect if MediaPipe is already loaded; if not, it connects on load
      if(poseRef.current){ try{ poseRef.current.onResults(handler); }catch(_){} }

      // Throttled loop — mobile cannot sustain 60fps ML inference
      let lastSend=0;
      const INTERVAL=120; // ~8fps inference; display still renders at browser fps
      const loop=async()=>{
        if(!streamRef.current) return;
        const now=performance.now();
        if(videoRef.current?.readyState>=2 && now-lastSend>=INTERVAL){
          lastSend=now;
          try{ if(poseRef.current) await poseRef.current.send({image:videoRef.current}); }catch(_){}
        }
        rafRef.current=requestAnimationFrame(loop);
      };
      rafRef.current=requestAnimationFrame(loop);

    }catch(e){
      try{ if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null;} }catch(_){}
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
    const currentView=viewRef.current;
    const W=video.videoWidth, H=video.videoHeight;
    const fc=document.createElement("canvas"); fc.width=W; fc.height=H;
    const fctx=fc.getContext("2d");
    if(camFacing==="user"){ fctx.translate(W,0); fctx.scale(-1,1); }
    fctx.drawImage(video,0,0,W,H);
    const rawDataUrl=fc.toDataURL("image/jpeg",0.92);
    setCapturedImg(rawDataUrl);
    setAnalysing(true);
    const blobUrl=await new Promise(res=>{ fc.toBlob(b=>res(b?URL.createObjectURL(b):null),"image/jpeg",0.92); });
    if(blobUrl&&poseRef.current&&mpStatus==="ready"){
      let result=null;
      try { result=await analysePhoto(blobUrl,currentView); }
      catch(captureErr){ console.warn("analysePhoto (camera) threw:", captureErr); }
      URL.revokeObjectURL(blobUrl);
      setAnalysing(false);
      if(result){
        setError(null);
        const oc=document.createElement("canvas"); oc.width=W; oc.height=H;
        const octx=oc.getContext("2d"); octx.drawImage(fc,0,0,W,H);
        drawOverlay({ctx:octx,W,H,lm:result.lm,view:currentView,showGrid:true,measurements:result.measurements,clearFirst:false});
        const annotated=oc.toDataURL("image/jpeg",0.92);
        setCapturedImg(annotated);
        const calib=computeCalibration(result.lm,patientHeightCm,H);
        processLandmarks(result.lm,currentView,H);
        if(currentView==="left"||currentView==="right"){
          // Seed immediately from the MediaPipe detection that just succeeded above,
          // same as the upload path — don't leave the clinician waiting on (or
          // depending on) the separate ViTPose model for a usable starting point.
          setHybridSeedLandmarks(result.lm);
          setVitposeLoading(true);
          runViTPoseLateral(fc)
            .then(vitLm=>{ if(vitLm) setHybridSeedLandmarks(vitLm); })
            .catch(e=>{ console.warn("ViTPose (capturePhoto):", e); })
            .finally(()=>setVitposeLoading(false));
        }
        if(assessMode==="multi"){
          const m=measureLandmarks(result.lm,calib,currentView);
          const r=calcReliability(result.lm,currentView);
          const f=r.blocked?[]:buildFindings(result.lm,currentView,m);
          const s=scorePosture(m,f,r);
          saveMvResult(currentView,m,f,s,r,annotated);
          const _pe1={view:currentView,time:new Date().toISOString(),score:s?.score,band:s?.band,findings:f.length,img:annotated};
          saveSession(_pe1);
          if(set&&activePatient){try{const _ex=JSON.parse(activePatient?.data?.posture_sessions||"[]");set("posture_sessions",JSON.stringify([..._ex,_pe1]));}catch(e){}}
        } else {
          saveSession({view:currentView,time:new Date().toISOString(),score:scoreData?.score,band:scoreData?.band,findings:findings.length,img:annotated});
        }
      } else {
        setError(`Could not detect a full body pose in this ${VIEWS[currentView]?.label||"view"} photo — step back so your full body (head to feet) is in frame, improve lighting, and try again.`);
        if(landmarks){ const oc2=document.createElement("canvas"); oc2.width=W; oc2.height=H; const octx2=oc2.getContext("2d"); octx2.drawImage(fc,0,0,W,H); drawOverlay({ctx:octx2,W,H,lm:landmarks,view:currentView,showGrid:true,measurements,clearFirst:false}); setCapturedImg(oc2.toDataURL("image/jpeg",0.92)); }
        if(measurements&&findings&&scoreData) saveSession({view:currentView,time:new Date().toISOString(),score:scoreData?.score,band:scoreData?.band,findings:findings.length,img:rawDataUrl});
      }
    } else {
      URL.revokeObjectURL(blobUrl||""); setAnalysing(false);
      setError(mpStatus!=="ready" ? "AI model is still loading — wait a moment and try again." : "Camera capture failed — please try again.");
      if(landmarks){ const oc3=document.createElement("canvas"); oc3.width=W; oc3.height=H; const octx3=oc3.getContext("2d"); octx3.drawImage(fc,0,0,W,H); drawOverlay({ctx:octx3,W,H,lm:landmarks,view:currentView,showGrid:true,measurements,clearFirst:false}); setCapturedImg(oc3.toDataURL("image/jpeg",0.92)); }
      if(measurements&&findings&&scoreData) saveSession({view:currentView,time:new Date().toISOString(),score:scoreData?.score,band:scoreData?.band,findings:findings.length,img:rawDataUrl});
    }
    if(assessMode !== "multi") { setTab("findings"); if(isMobile) setMobilePanel("results"); }
  }

  // ── Manual mode derived values ───────────────────────────────────────────────
  const isLat = view==="left"||view==="right";
  const isPost = view==="posterior"||view==="back";
  // Use view-specific landmark definitions:
  // Sagittal (L/R lateral) | Posterior (back) | Frontal (anterior + posterior via frontal)
  const manualPointDefs = isLat
    ? MANUAL_POINTS_SAGITTAL
    : isPost ? MANUAL_POINTS_POSTERIOR : MANUAL_POINTS_FRONTAL;
  const manualConnections = isLat
    ? MANUAL_CONNECTIONS_SAGITTAL
    : isPost ? MANUAL_CONNECTIONS_POSTERIOR : MANUAL_CONNECTIONS_FRONTAL;
  const manualPlacedCount = Object.keys(manualPlaced).length;
  const manualTotal = manualPointDefs.length;
  const manualPct = manualPlacedCount / manualTotal;
  const manualCanAnalyse = manualPct >= 0.6;
  const manualMinPoints = Math.ceil(manualTotal * 0.6);
  const nextManualIdx = manualPointDefs.findIndex(def => !manualPlaced[def.id]);

  // Auto-analyse in manual mode once every point is placed — no extra tap needed.
  // Fires once (guarded by manualAnalysed); undo/reset re-arms it. The explicit
  // "Analyse Now" button still handles the case where the user places only the
  // essential points (≥60%) without completing all of them.
  useEffect(() => {
    if (inputMode === "manual" && manualPlacedCount > 0
        && manualPlacedCount === manualTotal && !manualAnalysed) {
      analyseManualPoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualPlacedCount, manualTotal, inputMode, manualAnalysed]);

  function handleManualImageClick(e) {
    if (inputMode !== "manual" || !uploadedImg) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Spinal level placement takes priority
    if (spinalLevelMode) {
      const trunkNorm = tapYToTrunkNorm(y);
      if (trunkNorm !== null) {
        setManualSpinal(prev => ({...prev, [spinalLevelMode+'Y']: Math.max(-0.2, Math.min(1.3, trunkNorm))}));
      }
      setSpinalLevelMode(null);
      return;
    }

    if (nextManualIdx < 0) return;
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
    let lm, m={}, r, f=[], s;
    try {
      lm = manualPointsToLandmarks(manualPlaced, manualPointDefs);
      const imgH = manualImgSize.current?.h || 800;
      const calib = computeCalibration(lm, patientHeightCm, imgH);
      try { m = measureLandmarks(lm, calib, view) || {}; } catch(e){ console.warn("manual measureLandmarks:", e); }
      r = calcManualReliability(manualPlacedCount, manualTotal);
      try { f = r.blocked ? [] : buildFindings(lm, view, m); } catch(e){ console.warn("manual buildFindings:", e); }

      // Fallback: generate findings from measurements for lateral view
      const isLat = view==="left"||view==="right";
      const isPost = view==="posterior"||view==="back";
      const meaningful = f.filter(x=>x.severity!=="mild"||x.region!=="Sagittal Assessment — Summary");

      // ── Posterior manual fallback — always show a summary card + any findings ──
      // Even when all measurements are within normal, show an overview so
      // the therapist knows the analysis ran and what was assessed.
      if (isPost && m && Object.keys(m).length>0) {
        const pb=[];
        const shAng = m.shoulderAngle; const pelAng = m.pelvisAngle; const cobb = m.cobbEstimate;
        const trunkShift = m.trunkLateralShift; const lld = m.lldProxy;

        // Shoulder level (P0-1: normal <3° — Magee + healthy-norm, slight asymmetry is normal)
        if (shAng !== null && shAng !== undefined) {
          const absS = Math.abs(shAng);
          const sev = absS > 7 ? "high" : absS > 5 ? "moderate" : "low";
          const side = shAng > 0 ? "Left" : "Right";
          pb.push({
            region: "Shoulder Level",
            text: absS <= 3
              ? `Shoulder height — within normal limits (${absS.toFixed(1)}° asymmetry, normal <3°)`
              : `${side} shoulder elevated — ${absS.toFixed(1)}° (normal <3° — Magee + healthy-norm)`,
            plain: absS <= 3 ? "Shoulders level ✓" : `${side} shoulder elevated ${absS.toFixed(1)}°`,
            severity: sev,
            confidenceScore: 72,
            clinicalSignificance: sev,
            correction: absS <= 3 ? "Maintain symmetry — no intervention required." : "Upper trap/levator scapulae release ipsilateral. Lower trap activation. Confirm with anterior view.",
            icd: absS <= 3 ? "Z00.0" : "M54.2",
            norm: "Normal: <3° (slight asymmetry is normal) / <1.5cm height difference (Magee p.597)"
          });
        }

        // Pelvic obliquity (P0-1: normal <4° — healthy population reaches 5.6°, median ~2.0°, PMC10229507)
        if (pelAng !== null && pelAng !== undefined) {
          const absP = Math.abs(pelAng);
          const sev = absP > 10 ? "high" : absP > 7 ? "moderate" : "low";
          const side = pelAng > 0 ? "Left" : "Right";
          pb.push({
            region: "Pelvic Level",
            text: absP <= 4
              ? `Pelvic level — within normal limits (${absP.toFixed(1)}° obliquity, normal <4°)`
              : `${side} pelvis elevated — ${absP.toFixed(1)}° obliquity (normal <4° — healthy-population norm)`,
            plain: absP <= 4 ? "Pelvis level ✓" : `${side} pelvic elevation ${absP.toFixed(1)}°`,
            severity: sev,
            confidenceScore: 68,
            clinicalSignificance: sev,
            correction: absP <= 4 ? "No intervention required." : "QL release elevated side. Hip abductor assessment. Screen for LLD with heel lifts.",
            icd: absP <= 4 ? "Z00.0" : "M62.89",
            norm: "Normal: <4° pelvic obliquity (healthy population reaches 5.6°, median 2.0° — PMC10229507)"
          });
        }

        // Lateral curvature screen / Cobb estimate (Kendall — normal <5°)
        if (cobb !== null && cobb !== undefined) {
          const sev = cobb > 10 ? "moderate" : cobb > 5 ? "low" : "low";
          pb.push({
            region: "Lateral Curvature Screen",
            text: cobb <= 5
              ? `Shoulder-pelvis differential — within normal limits (${cobb.toFixed(0)}°, normal <5°)`
              : `Shoulder-pelvis differential ${cobb.toFixed(0)}° — screen for lateral spinal curvature (normal <5°). Adam's forward bend test recommended.`,
            plain: cobb <= 5 ? "Spinal alignment screen ✓" : `Lateral curvature screen positive ${cobb.toFixed(0)}°`,
            severity: sev,
            confidenceScore: 60,
            clinicalSignificance: sev,
            correction: cobb <= 5 ? "No action required." : "Adam's forward bend test (rib hump screen). Standing AP X-ray if clinically indicated. This observation does not diagnose scoliosis.",
            icd: cobb <= 5 ? "Z00.0" : "M99.0",
            norm: "Normal: <5° shoulder-pelvis differential (observation only — Cobb requires X-ray)"
          });
        }

        // Trunk lateral shift (normal <1% body height)
        if (trunkShift !== null && trunkShift !== undefined) {
          const absT = Math.abs(trunkShift);
          const sev = absT > 4 ? "moderate" : "low";
          const side = trunkShift > 0 ? "right" : "left";
          if (absT > 1) {
            pb.push({
              region: "Trunk Lateral Shift",
              text: absT <= 2
                ? `Trunk alignment — within normal limits (${absT.toFixed(1)}% BH shift, normal <2%)`
                : `Trunk shifted ${side} — ${absT.toFixed(1)}% body height (normal <2% — Kendall)`,
              plain: absT <= 2 ? "Trunk centred ✓" : `Trunk ${side} shift ${absT.toFixed(1)}% BH`,
              severity: sev,
              confidenceScore: 65,
              clinicalSignificance: sev,
              correction: "General trunk-alignment activities may help. If you have pain, see a qualified professional promptly.",
              icd: "M99.0",
              norm: "Normal: shoulder midpoint within 2% BH of hip midpoint (Kendall 5th ed.)"
            });
          }
        }

        // LLD proxy from popliteal crease height difference
        if (m.leftKneeFrontal !== null && m.leftKneeFrontal !== undefined &&
            m.rightKneeFrontal !== null && m.rightKneeFrontal !== undefined) {
          pb.push({
            region: "Leg Length Screen",
            text: "Knee level assessed from posterior — for accurate LLD measurement use supine tape measure (ASIS to medial malleolus) or standing block test.",
            plain: "LLD: manual palpation required",
            severity: "low",
            confidenceScore: 55,
            clinicalSignificance: "low",
            correction: "True LLD: supine ASIS-to-medial malleolus measurement (Woerman 1984). Heel-rise test for functional vs structural LLD.",
            icd: "M21.0",
            norm: "Clinical reference: <5mm functional, >1cm — consider heel lift"
          });
        }

        if (pb.length > 0) {
          // Merge with any existing threshold-based findings — don't duplicate
          const existingRegions = new Set(f.map(x => x.region));
          pb.forEach(p => { if (!existingRegions.has(p.region)) f.push(p); });
        }
      }

      if (isLat && meaningful.length===0 && m && Object.keys(m).length>0) {
        const fb=[];
        if (m.cvaAngle!=null&&m.cvaAngle<55) { const sev=m.cvaAngle<44?"high":m.cvaAngle<49?"moderate":"mild"; fb.push({region:"Cervical / CVA",text:`Forward head tendency — CVA ${m.cvaAngle.toFixed(1)}° (normal >55°)`,plain:`CVA ${m.cvaAngle.toFixed(1)}°`,severity:sev,confidenceScore:72,clinicalSignificance:sev,correction:"Chin tucks, deep cervical flexor strengthening.",icd:"M43.6",norm:"Normal CVA >55°"}); }
        if (m.thoracicAngle!=null&&m.thoracicAngle>45) { const sev=m.thoracicAngle>58?"high":m.thoracicAngle>50?"moderate":"mild"; fb.push({region:"Thoracic Kyphosis",text:`Increased thoracic curvature tendency (${m.thoracicAngle.toFixed(1)}°, normal 20–45°)`,plain:`Thoracic ${m.thoracicAngle.toFixed(1)}°`,severity:sev,confidenceScore:65,clinicalSignificance:sev,correction:"Thoracic extension, pec stretch, lower trap activation.",icd:"M40.0",norm:"Normal 20–45°"}); }
        if (m.sagPelvicShift!=null&&Math.abs(m.sagPelvicShift)>2) { const dir=m.sagPelvicShift>0?"Anterior":"Posterior"; const abs=Math.abs(m.sagPelvicShift); const sev=abs>5?"high":abs>3?"moderate":"mild"; fb.push({region:"Pelvis / Lumbar",text:`${dir} pelvic tendency — hip ~${abs.toFixed(1)}cm ${dir.toLowerCase()} to plumb`,plain:`${dir} pelvic tilt ${abs.toFixed(1)}cm`,severity:sev,confidenceScore:65,clinicalSignificance:sev,correction:dir==="Anterior"?"Hip flexor stretch, glute bridges, abdominal hollowing.":"Hamstring stretch, hip flexor activation, lumbar extension.",icd:"M40.3",norm:"Hip within 2cm of plumb"}); }
        if (m.sagShoulderShift!=null&&Math.abs(m.sagShoulderShift)>2) {
          const shDir = m.sagShoulderShift > 0 ? "anterior" : "posterior";
          const shReg = shDir === "posterior" ? "Shoulder Posterior Displacement" : "Shoulder / Rounded Tendency";
          const shTx  = shDir === "posterior"
            ? "Hip flexors facilitation. Shift trunk forward. Sway-back postural re-education. Avoid over-bracing abdominals."
            : "Scapular retraction, pec stretch, serratus activation.";
          fb.push({region:shReg, text:`Shoulder ${shDir} ~${Math.abs(m.sagShoulderShift).toFixed(1)}cm from plumb`, plain:shDir==="posterior"?"Shoulder posterior displacement":"Rounded shoulder tendency", severity:"moderate", confidenceScore:65, clinicalSignificance:"moderate", correction:shTx, icd:"M62.9", norm:"Acromion at plumb"}); }
        if (fb.length>0) f=fb;
      }

      try { s = scorePosture(m, f, r); } catch(e){ console.warn("manual scorePosture:", e); }
    } catch(outerErr) { console.warn("analyseManualPoints error:", outerErr); }

    let kendallType2 = null;
    try { kendallType2 = classifyKendallPostureType(m); } catch(e){}
    setLandmarks(lm||null); setMeasurements(Object.keys(m||{}).length>0?{...m,_kendall:kendallType2}:null);
    setFindings(f||[]); setReliability(r||null); setScoreData(s||null);
    setManualAnalysed(true);
    // Bake manual markers onto the annotated image
    if (objectUrlRef.current) {
      const img = new Image();
      img.onload = () => {
        const W = img.naturalWidth, H = img.naturalHeight;
        const oc = document.createElement("canvas"); oc.width=W; oc.height=H;
        const ctx = oc.getContext("2d"); ctx.drawImage(img, 0, 0, W, H);
        drawManualOverlay({ ctx, W, H, placed:manualPlaced, pointDefs:manualPointDefs, connections:manualConnections });
        // Also bake full analysis overlay so PDF report gets the annotated image
        if (lm && m && Object.keys(m).length > 0) {
          try { drawOverlay({ ctx, W, H, lm, view, showGrid: true, measurements: m, clearFirst: false }); } catch(oe){ console.warn("drawOverlay bake:", oe); }
        }
        let annotatedUrl;
        try { annotatedUrl = oc.toDataURL("image/jpeg", 0.92); } catch(te){ annotatedUrl = objectUrlRef.current; }
        setUploadedImg(annotatedUrl);
        // Save annotated result for multi-view mode
        if (assessMode === "multi" && annotatedUrl) {
          saveMvResult(view, m, f, s, r, annotatedUrl);
        }
      };
      img.src = objectUrlRef.current;
    }
    if(assessMode !== "multi") { setTab("findings"); if(isMobile) setMobilePanel("results"); }
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

      {/* Findings tab — no measurements yet */}
      {tab==="findings"&&!measurements&&(
        <div style={{padding:isWide?"20px 24px":"14px 16px"}}>
          <div style={{textAlign:"center",color: error?PC.red:PC.muted,fontSize:"0.78rem",paddingTop:20,paddingBottom:12,fontWeight:error?600:400}}>
            {error || "Analyse a photo to generate findings."}
          </div>
          {error && (
            <div style={{textAlign:"center"}}>
              <button type="button" onClick={()=>{setError(null);setTab("capture");}}
                style={{marginTop:4,padding:"8px 18px",borderRadius:8,border:"none",
                  background:PC.accent,color:"#fff",fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
                Retake photo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Findings tab */}
      {tab==="findings"&&measurements&&(
        <div style={{padding: isWide?"20px 24px":"14px 16px"}}>
          {/* Analysed photo preview — manual mode only, shown at top of findings */}
          {inputMode==="manual"&&manualAnalysed&&(objectUrlRef.current||uploadedImg)&&(
            <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:14,border:`1px solid ${PC.border}`}}>
              <img src={objectUrlRef.current||uploadedImg} alt="Analysed posture"
                id="findings-posture-img"
                style={{width:"100%",display:"block"}}/>
              {landmarks&&(
                <CanvasOverlayOnImage
                  photoUrl={objectUrlRef.current||uploadedImg}
                  landmarks={landmarks}
                  view={view}
                  measurements={measurements||undefined}
                  manualPlaced={manualPlaced}
                  manualPointDefs={manualPointDefs}
                  manualConnections={manualConnections}
                  imgId="findings-posture-img"
                />
              )}
            </div>
          )}
          {/* Analysis mode badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:8,
            background:isClinicianVerified?'rgba(5,150,105,0.12)':'rgba(100,100,100,0.1)',
            border:`1px solid ${isClinicianVerified?'rgba(5,150,105,0.35)':'rgba(100,100,100,0.2)'}`,
            color:isClinicianVerified?'#059669':'#6b7280',
            fontSize:'0.6rem',fontWeight:700,marginBottom:8}}>
            {isClinicianVerified?'✅ Clinician Verified Analysis':'🤖 AI Estimated Analysis'}
          </div>

          {/* Kendall Postural Type */}
          {measurements?._kendall&&(view==="left"||view==="right")&&(
            <div style={{marginBottom:14,padding:"12px 14px",borderRadius:12,
              background:`${measurements._kendall.colour}12`,
              border:`1.5px solid ${measurements._kendall.colour}40`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:"1.1rem"}}>🔬</span>
                <div>
                  <div style={{fontWeight:800,fontSize:"0.8rem",color:measurements._kendall.colour}}>
                    {measurements._kendall.type}
                  </div>
                  <div style={{fontSize:"0.8rem",color:PC.muted,fontWeight:600}}>
                    Kendall Postural Classification · {measurements._kendall.confidence}% confidence
                  </div>
                </div>
              </div>
              <div style={{fontSize:"0.78rem",color:PC.text,lineHeight:1.5,marginBottom:8}}>
                {measurements._kendall.description}
              </div>
              {measurements._kendall.tight.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {measurements._kendall.tight.map((m,i)=>(
                    <span key={i} style={{padding:"2px 8px",borderRadius:10,fontSize:"0.8rem",fontWeight:700,
                      background:"rgba(220,38,38,0.08)",color:PC.red,border:"1px solid rgba(220,38,38,0.2)"}}>
                      ▲ {m}
                    </span>
                  ))}
                  {measurements._kendall.weak.map((m,i)=>(
                    <span key={i} style={{padding:"2px 8px",borderRadius:10,fontSize:"0.8rem",fontWeight:700,
                      background:"rgba(59,130,246,0.08)",color:"#3B82F6",border:"1px solid rgba(59,130,246,0.2)"}}>
                      ▼ {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {scoreData&&(
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,padding: isWide?"18px":"14px",background:PC.surface,borderRadius:14,border:`1px solid ${scoreData.colour}30`,boxShadow:isWide?"0 2px 12px rgba(0,0,0,0.06)":"none"}}>
              <ScoreRingBand score={scoreData.score} band={scoreData.band} colour={scoreData.colour} size={isWide?96:80}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize: isWide?"1.1rem":"0.9rem",color:scoreData.colour}}>{scoreData.band}</div>
                <div style={{fontSize: isWide?"0.72rem":"0.65rem",color:PC.muted,marginTop:2}}>
                  Score {scoreData.score}/100 &nbsp;·&nbsp;
                  <span style={{color:scoreData.colour,fontWeight:700}}>
                    {scoreData.score>=88?"Excellent posture":scoreData.score>=74?"Minor deviations":scoreData.score>=58?"Moderate — clinical review advised":scoreData.score>=40?"Significant — prioritise clinical assessment":highFindings.length>0?"Urgent — multiple high-priority findings":"Multiple areas of interest — clinical review recommended"}
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
                    <span style={{fontSize:"0.75rem",fontWeight:700,color:measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green}}>
                      Cervical load ~{measurements.cervicalLoadKg.toFixed(1)}kg
                    </span>
                    <span style={{fontSize:"0.78rem",color:PC.muted}}>(neutral 4.5kg)</span>
                  </div>
                )}
                {/* Real cm measurements row */}
                {measurements?._calibrated&&(
                  <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                    {/* CVA — most important single measure; always first if present */}
                    {measurements.cvaAngle!=null&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.82rem",fontWeight:700,
                        background:measurements.cvaAngle<49?"rgba(220,38,38,0.1)":measurements.cvaAngle<55?"rgba(180,83,9,0.1)":"rgba(5,150,105,0.1)",
                        color:measurements.cvaAngle<49?PC.red:measurements.cvaAngle<55?PC.yellow:PC.green,
                        border:`1px solid ${measurements.cvaAngle<49?PC.red:measurements.cvaAngle<55?PC.yellow:PC.green}40`}}>
                        CVA {measurements.cvaAngle.toFixed(1)}° {measurements.cvaAngle>=55?"✓":`(normal >55°)`}
                      </span>
                    )}
                    {/* FHP-cm / Sh diff / Pelvis diff / Trunk shift are all bilateral
                        (left-vs-right) frontal-plane metrics. In a lateral/sagittal photo
                        both shoulders sit nearly on top of each other in the image, so the
                        bilateral-width denominator these formulas divide by collapses to
                        near-zero, producing meaningless blown-up values (e.g. "FHP 91.2cm").
                        Sagittal FHP is already shown correctly above via CVA. */}
                    {!isLat && !isPost && measurements.fhpCm!=null&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.82rem",fontWeight:700,
                        background:measurements.fhpCm>3.5?"rgba(220,38,38,0.1)":measurements.fhpCm>2?"rgba(180,83,9,0.1)":"rgba(5,150,105,0.1)",
                        color:measurements.fhpCm>3.5?PC.red:measurements.fhpCm>2?PC.yellow:PC.green,
                        border:`1px solid ${measurements.fhpCm>3.5?PC.red:measurements.fhpCm>2?PC.yellow:PC.green}40`}}>
                        FHP {measurements.fhpCm}cm
                      </span>
                    )}
                    {!isLat && !isPost && measurements.shoulderDiffCm!=null&&measurements.shoulderDiffCm>0.3&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.82rem",fontWeight:700,
                        background:measurements.shoulderDiffCm>1.5?"rgba(220,38,38,0.1)":"rgba(180,83,9,0.1)",
                        color:measurements.shoulderDiffCm>1.5?PC.red:PC.yellow,
                        border:`1px solid ${measurements.shoulderDiffCm>1.5?PC.red:PC.yellow}40`}}>
                        Sh diff {measurements.shoulderDiffCm}cm
                      </span>
                    )}
                    {!isLat && !isPost && measurements.pelvisDiffCm!=null&&measurements.pelvisDiffCm>0.3&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.82rem",fontWeight:700,
                        background:measurements.pelvisDiffCm>1.5?"rgba(220,38,38,0.1)":"rgba(180,83,9,0.1)",
                        color:measurements.pelvisDiffCm>1.5?PC.red:PC.yellow,
                        border:`1px solid ${measurements.pelvisDiffCm>1.5?PC.red:PC.yellow}40`}}>
                        Pelvis diff {measurements.pelvisDiffCm}cm
                      </span>
                    )}
                    {!isLat && !isPost && measurements.trunkShiftCm!=null&&measurements.trunkShiftCm>0.5&&(
                      <span style={{padding:"2px 8px",borderRadius:6,fontSize:"0.82rem",fontWeight:700,
                        background:measurements.trunkShiftCm>5?"rgba(156,163,175,0.15)":"rgba(180,83,9,0.1)",
                        color:measurements.trunkShiftCm>5?PC.muted:PC.yellow,
                        border:`1px solid ${measurements.trunkShiftCm>5?PC.muted:PC.yellow}40`}}>
                        Trunk shift {measurements.trunkShiftCm}cm{measurements.trunkShiftCm>5?" ⚠ verify positioning":""}
                      </span>
                    )}
                  </div>
                )}
                {!measurements?._calibrated&&(
                  <div style={{marginTop:6,fontSize:"0.78rem",color:PC.muted,fontStyle:"italic"}}>
                    Enter patient height in Metrics tab for real cm measurements
                  </div>
                )}
                {/* Sub-score pills on wide screens */}
                {isWide&&scoreData?.subScores&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                    {Object.entries(scoreData.subScores).map(([region,val])=>{
                      if(val==null) return null; // region not measured — omit chip
                      const col=val>=74?PC.green:val>=55?PC.yellow:PC.red;
                      return(
                        <div key={region} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:20,background:`${col}12`,border:`1px solid ${col}30`}}>
                          <span style={{fontSize:"0.82rem",color:PC.muted,textTransform:"capitalize"}}>{region}</span>
                          <span style={{fontSize:"0.78rem",fontWeight:800,color:col}}>{Math.round(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Save to Patient Record — shown right after score ── */}
          {scoreData&&(
            <div style={{marginBottom:12,padding:"10px 14px",background:activePatient?"rgba(5,150,105,0.07)":"rgba(180,83,9,0.07)",borderRadius:12,border:`1px solid ${activePatient?"rgba(5,150,105,0.25)":"rgba(180,83,9,0.25)"}`}}>
              {activePatient?(
                <button onClick={async()=>{
                  const VLABELS={anterior:"Frontal",posterior:"Posterior",left:"Left Lateral",right:"Right Lateral"};
                  const vLabel=VLABELS[view]||view;
                  try{
                    // Bake photo + analysis overlay into a persistent JPEG data URL.
                    // blob: URLs die on reload and must never be stored in the record.
                    const bakeImg=()=>new Promise(resolve=>{
                      const src=isLive?capturedImg
                        :inputMode==="ai"?(uploadedImg||rawUploadedImg)
                        :(objectUrlRef.current||rawUploadedImg||uploadedImg);
                      if(!src){resolve(null);return;}
                      const im=new Image();
                      const fallback=()=>resolve(typeof src==="string"&&src.startsWith("data:")?src:null);
                      im.onload=()=>{try{
                        const natW=im.naturalWidth||im.width,natH=im.naturalHeight||im.height;
                        const sc=Math.min(1,900/Math.max(natW,natH));
                        const W=Math.max(1,Math.round(natW*sc)),H=Math.max(1,Math.round(natH*sc));
                        const oc=document.createElement("canvas");oc.width=W;oc.height=H;
                        const octx=oc.getContext("2d");
                        octx.drawImage(im,0,0,W,H);
                        if(inputMode==="manual"&&landmarks&&landmarks.length){
                          const vm={anterior:"anterior",posterior:"posterior",back:"posterior",left:"left",right:"right"};
                          try{drawOverlay({ctx:octx,W,H,lm:landmarks,view:vm[view]||"anterior",showGrid:true,measurements:measurements||{},clearFirst:false});}catch(_){}
                          try{drawManualOverlay({ctx:octx,W,H,placed:manualPlaced,pointDefs:manualPointDefs,connections:manualConnections});}catch(_){}
                        }
                        resolve(oc.toDataURL("image/jpeg",0.8));
                      }catch(e){fallback();}};
                      im.onerror=fallback;
                      im.src=src;
                    });
                    const bakedImg=await bakeImg();
                    const existing=JSON.parse(activePatient.data?.posture_sessions||"[]");
                    const sameView=existing.filter(s=>s.view===view).length+1;
                    const entry={
                      view, viewLabel:vLabel, sessionNo:sameView,
                      sessionLabel:`${vLabel} Session ${sameView}`,
                      img:bakedImg,
                      score:scoreData.score, band:scoreData.band||"",
                      findings:findings||[], kineticChain:"",
                      source:isLive?"camera":"upload",
                      capturedAt:new Date().toISOString()
                    };
                    setPatientField&&setPatientField("posture_sessions",JSON.stringify([...existing,entry]));
                    alert(`✅ Saved as "${entry.sessionLabel}" to ${activePatient.name}`);
                  }catch(e){alert("Save failed: "+e.message);}
                }} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",cursor:"pointer",
                  background:"linear-gradient(135deg,#059669,#047857)",
                  color:"#fff",fontWeight:800,fontSize:"0.82rem",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  💾 Save to {activePatient.name} — {{anterior:"Frontal",posterior:"Posterior",left:"Left Lateral",right:"Right Lateral"}[view]||view} View
                </button>
              ):(
                <div style={{fontSize:"0.82rem",color:"#92400E",fontWeight:600,textAlign:"center"}}>
                  ⚠ Load a patient first to save this analysis
                </div>
              )}
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
            const LOW_CONF = ["neck lateral inclination","carrying angle","frontal plane tibial","ankle height","tibial alignment"];
            const isVerify = (f) => LOW_CONF.some(m => (f.text||"").toLowerCase().includes(m));
            const top3 = ranked.filter(f => !isVerify(f) && !f._requiresVerification).slice(0,3);
            return(
              <div style={{marginBottom:14,padding:isWide?"16px 18px":"12px 14px",borderRadius:14,
                background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(147,51,234,0.04))",
                border:`1.5px solid ${PC.accent}30`}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                  <span style={{fontSize:"0.95rem"}}>◎</span>
                  <div>
                    <div style={{fontSize:isWide?"0.8rem":"0.72rem",fontWeight:900,color:PC.accent}}>Top 3 — Treat Now</div>
                    <div style={{fontSize:"0.78rem",color:PC.muted,marginTop:1}}>Highest clinical priority · Address in this order</div>
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
                        fontSize:"0.75rem",fontWeight:900,color:"#fff",flexShrink:0}}>
                        {i+1}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                          <span style={{fontSize:"0.8rem",fontWeight:700,color:col,
                            padding:"1px 6px",borderRadius:4,background:`${col}15`,
                            border:`1px solid ${col}25`,flexShrink:0}}>
                            {f.severity?.toUpperCase()}{f.confirmed?" ✓":""}
                          </span>
                          <span style={{fontSize:"0.75rem",fontWeight:700,color:PC.text,
                            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {f.region}
                          </span>
                        </div>
                        <div style={{fontSize:"0.73rem",color:PC.muted,lineHeight:1.4}}>
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
                  <div style={{fontSize:"0.75rem",fontWeight:700,color:PC.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>⚠ High Priority</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {highFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                  </div>
                </div>
              )}
              {otherFindings.length>0&&(
                <div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:"0.75rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Other Findings</div>
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
                  <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.red,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>⚠ High Priority</div>
                  {highFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                </div>
              )}
              {otherFindings.length>0&&(
                <div>
                  <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Other Findings</div>
                  {otherFindings.map((f,i)=><FindingCard key={i} f={f}/>)}
                </div>
              )}
            </>
          )}

          {/* Clinical reasoning cards — inline on findings tab when there are findings */}
          {findings.length > 0 && (
            <div style={{marginTop:18}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Clinical Reasoning</div>
              <MuscleImbalanceCard findings={findings} isWide={isWide}/>
              <SpecialTestsCard findings={findings} isWide={isWide}/>
              <div style={{padding:"8px 13px",borderRadius:10,background:`${PC.accent}08`,border:`1px solid ${PC.accent}20`,fontSize:"0.82rem",color:PC.accent,fontWeight:600,cursor:"pointer",textAlign:"center",marginTop:2}}
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
              <div style={{padding:"10px 14px",borderRadius:10,background:PC.s2,border:`1px solid ${PC.border}`,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
                ℹ️ Possible muscle contribution patterns listed are derived from posture observations using Janda's model as a guide only. These are possible contributors — NOT diagnoses. Always confirm with manual muscle testing, length assessment, and clinical examination before treating.
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
              <div style={{padding:"10px 14px",borderRadius:10,background:PC.s2,border:`1px solid ${PC.border}`,fontSize:"0.8rem",color:PC.muted,lineHeight:1.6}}>
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
                <div style={{fontSize:"0.75rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Frontal Plane</div>
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
                <MetricRow label="Tibial Alignment L (Est.)" value={measurements.tibialVarumL} unit="°" normal={5} abnormal={10}/>
                <MetricRow label="Tibial Alignment R (Est.)" value={measurements.tibialVarumR} unit="°" normal={5} abnormal={10}/>
                <MetricRow label="Carrying Angle L" value={measurements.carryingAngleL} unit="°" normal={15} abnormal={20}/>
                <MetricRow label="Carrying Angle R" value={measurements.carryingAngleR} unit="°" normal={15} abnormal={20}/>
              </div>
              <div>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Sagittal Plane</div>
                {/* CVA — most important sagittal metric, shown prominently */}
                <div style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                  background:measurements.cvaAngle!=null&&measurements.cvaAngle<49?"rgba(220,38,38,0.07)":measurements.cvaAngle!=null&&measurements.cvaAngle<55?"rgba(180,83,9,0.07)":"rgba(5,150,105,0.07)",
                  border:`1px solid ${measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}25`}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:2}}>CVA — Primary FHP Marker</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                    <span style={{fontSize:"0.67rem",color:PC.text}}>Craniovertebral Angle</span>
                    <span style={{fontSize:"0.82rem",fontWeight:900,color:measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}}>
                      {measurements.cvaAngle!=null?`${measurements.cvaAngle.toFixed(1)}°`:"—"}
                    </span>
                  </div>
                  <div style={{fontSize:"0.57rem",color:PC.muted,marginTop:2}}>Normal &gt;55° · &lt;49° = High load · estimated cervical load proxy cervical load model</div>
                </div>
                {measurements.cervicalLoadKg!=null&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                    <div style={{flex:1,fontSize:"0.78rem",color:PC.muted}}>Cervical Load <span style={{fontSize:"0.56rem"}}>(estimated cervical load proxy)</span></div>
                    <div style={{fontSize:"0.75rem",fontWeight:800,color:measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green}}>{measurements.cervicalLoadKg.toFixed(1)}kg</div>
                  </div>
                )}
                <MetricRow label="Forward Head" value={measurements.fhpNorm} unit="%" normal={3} abnormal={7}/>
                <MetricRow label="Thoracic Kyphosis (Est.)" value={measurements.thoracicAngle} unit="°" normal={45} abnormal={55}/>
                {/* Lumbar lordosis: paired with kyphosis — show together */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.78rem",color:PC.muted}}>Lumbar Lordosis (proxy)</div>
                    <div style={{fontSize:"0.75rem",color:PC.muted,marginTop:1}}>Normal 20–40° · Pairs with thoracic kyphosis — assess together</div>
                  </div>
                  <div style={{fontSize:"0.75rem",fontWeight:800,
                    color:measurements.lumbarProxy==null?"rgba(156,163,175,0.6)":Math.abs(measurements.lumbarProxy)>10?PC.red:Math.abs(measurements.lumbarProxy)>5?PC.yellow:PC.green}}>
                    {measurements.lumbarProxy!=null?`${measurements.lumbarProxy>0?"↑":"↓"}${Math.abs(measurements.lumbarProxy).toFixed(1)}%`:"—"}
                  </div>
                </div>
                <MetricRow label="Hip Extension Proxy" value={measurements.hipExtensionProxy} unit="%" normal={5} abnormal={10}/>
                <MetricRow label="L Knee Deviation" value={measurements.leftKneeDev} unit="°" normal={5} abnormal={12}/>
                <MetricRow label="R Knee Deviation" value={measurements.rightKneeDev} unit="°" normal={5} abnormal={12}/>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Global & Symmetry</div>
                <MetricRow label="Shoulder/Acromion Asymmetry" value={measurements.scapularAsymm} unit="%" normal={2.5} abnormal={5}/>
                <MetricRow label="C7 Plumb Deviation" value={measurements.c7PlumbDev} unit="%" normal={3} abnormal={6}/>
                <MetricRow label="COG Deviation" value={measurements.cogDeviation} unit="%" normal={4} abnormal={8}/>
                <MetricRow label="Hip-Knee Lateral Offset" value={measurements.pelvicObliquity} unit="%" normal={3} abnormal={6}/>
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
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Frontal Plane</div>
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
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Sagittal Plane</div>
              {/* CVA highlighted card on mobile too */}
              <div style={{marginBottom:8,padding:"8px 10px",borderRadius:8,
                background:measurements.cvaAngle!=null&&measurements.cvaAngle<49?"rgba(220,38,38,0.07)":measurements.cvaAngle!=null&&measurements.cvaAngle<55?"rgba(180,83,9,0.07)":"rgba(5,150,105,0.07)",
                border:`1px solid ${measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}25`}}>
                <div style={{fontSize:"0.56rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:2}}>CVA — Primary FHP Marker</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <span style={{fontSize:"0.75rem",color:PC.text}}>Craniovertebral Angle</span>
                  <span style={{fontSize:"0.8rem",fontWeight:900,color:measurements.cvaAngle!=null&&measurements.cvaAngle<49?PC.red:measurements.cvaAngle!=null&&measurements.cvaAngle<55?PC.yellow:PC.green}}>
                    {measurements.cvaAngle!=null?`${measurements.cvaAngle.toFixed(1)}°`:"—"}
                  </span>
                </div>
                <div style={{fontSize:"0.75rem",color:PC.muted,marginTop:2}}>Normal &gt;55° · &lt;49° = High load</div>
              </div>
              {measurements.cervicalLoadKg!=null&&(
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                  <div style={{flex:1,fontSize:"0.78rem",color:PC.muted}}>Cervical Load Est. <span style={{fontSize:"0.56rem"}}>(estimated cervical extensor load (proxy — not a validated estimated cervical load proxy formula))</span></div>
                  <div style={{fontSize:"0.75rem",fontWeight:800,color:measurements.cervicalLoadKg>18?PC.red:measurements.cervicalLoadKg>12?PC.yellow:PC.green,minWidth:60,textAlign:"right"}}>{measurements.cervicalLoadKg.toFixed(1)}kg</div>
                </div>
              )}
              <MetricRow label="Forward Head" value={measurements.fhpNorm} unit="%" normal={3} abnormal={7}/>
              <MetricRow label="Thoracic Kyphosis (Est.)" value={measurements.thoracicAngle} unit="°" normal={45} abnormal={55}/>
              {/* Lumbar lordosis paired with kyphosis */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${PC.border}`}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.78rem",color:PC.muted}}>Lumbar Lordosis (proxy)</div>
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
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>New Measurements</div>
              <MetricRow label="Neck Lateral Angle" value={measurements.neckLateralAngle} unit="°" normal={4} abnormal={8}/>
              <MetricRow label="Waist Triangle Asymm." value={measurements.waistTriangleAsymmetry} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="Ankle LLD" value={measurements.ankleLLDmm} unit="mm" normal={5} abnormal={10}/>
              <MetricRow label="Tibial Alignment L (Est.)" value={measurements.tibialVarumL} unit="°" normal={5} abnormal={10}/>
              <MetricRow label="Tibial Alignment R (Est.)" value={measurements.tibialVarumR} unit="°" normal={5} abnormal={10}/>
              <MetricRow label="Carrying Angle L" value={measurements.carryingAngleL} unit="°" normal={15} abnormal={20}/>
              <MetricRow label="Carrying Angle R" value={measurements.carryingAngleR} unit="°" normal={15} abnormal={20}/>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Bilateral Symmetry &amp; Global</div>
              <MetricRow label="Shoulder/Acromion Asymmetry" value={measurements.scapularAsymm} unit="%" normal={2.5} abnormal={5}/>
              <MetricRow label="C7 Plumb Deviation" value={measurements.c7PlumbDev} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="COG Deviation" value={measurements.cogDeviation} unit="%" normal={4} abnormal={8}/>
              <MetricRow label="Hip-Knee Lateral Offset" value={measurements.pelvicObliquity} unit="%" normal={3} abnormal={6}/>
              <MetricRow label="L Foot Angle" value={measurements.leftFootAngle} unit="°" normal={10} abnormal={20}/>
              <MetricRow label="R Foot Angle" value={measurements.rightFootAngle} unit="°" normal={10} abnormal={20}/>
              <MetricRow label="L Ankle Dorsiflexion" value={measurements.leftAnkleAngle} unit="°" normal={100} abnormal={85}/>
              <MetricRow label="R Ankle Dorsiflexion" value={measurements.rightAnkleAngle} unit="°" normal={100} abnormal={85}/>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:10}}>Syndrome Indices</div>
              <MetricRow label="UCS Index" value={measurements.ucsIndex} unit="" normal={0.6} abnormal={1.0}/>
              <MetricRow label="LCS Index" value={measurements.lcsIndex} unit="" normal={0.5} abnormal={1.0}/>
            </>
          )}

          {/* PLI — both layouts */}
          {measurements.posturalLoadIndex!=null&&(
            <>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:18,marginBottom:7}}>Postural Load Index</div>
              <div style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${measurements.posturalLoadIndex>65?PC.red:measurements.posturalLoadIndex>35?PC.yellow:PC.green}30`,background:`${measurements.posturalLoadIndex>65?PC.red:measurements.posturalLoadIndex>35?PC.yellow:PC.green}08`,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <span style={{fontSize:"0.82rem",color:PC.muted}}>PLI (0 = ideal, 100 = max load)</span>
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
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:14,marginBottom:7}}>Regional Sub-scores</div>
              {Object.entries(scoreData.subScores).map(([region,val])=>{
                if(val==null) return null; // region not measured — omit row
                const col=val>=74?PC.green:val>=55?PC.yellow:PC.red;
                return(
                  <div key={region} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${PC.border}`}}>
                    <div style={{flex:1,fontSize:"0.78rem",color:PC.muted,textTransform:"capitalize"}}>{region}</div>
                    <div style={{width:60,height:4,background:PC.s2,borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:`${val}%`,height:"100%",background:col,borderRadius:2}}/>
                    </div>
                    <div style={{fontSize:"0.82rem",fontWeight:800,color:col,minWidth:32,textAlign:"right"}}>{Math.round(val)}</div>
                  </div>
                );
              })}
            </>
          )}

          {/* Calibration */}
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginTop:18,marginBottom:7}}>Calibration — Real Measurements</div>
          <div style={{padding:"10px 14px",borderRadius:12,border:`1px solid ${PC.border}`,background:PC.surface,marginBottom:8}}>
            <div style={{fontSize:"0.8rem",color:PC.muted,marginBottom:8}}>Patient height — used to convert % measurements to real cm</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <input type="number" min={100} max={220} value={patientHeightCm}
                onChange={e=>setPatientHeightCm(Number(e.target.value))}
                style={{flex:1,padding:"8px 12px",border:`1px solid ${PC.border}`,borderRadius:9,fontSize:"0.85rem",background:PC.bg,color:PC.text}}/>
              <span style={{fontSize:"0.75rem",color:PC.muted}}>cm</span>
            </div>
            {measurements?._calibrated?(
              <div>
                <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.green,marginBottom:6}}>✓ Calibrated — showing real measurements</div>
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
                        <div style={{fontSize:"0.78rem",color:PC.muted}}>{label}</div>
                        <div style={{fontSize:"0.75rem",color:PC.muted,opacity:0.7}}>{hint}</div>
                      </div>
                      <div style={{fontSize:"0.82rem",fontWeight:800,color:col}}>{val.toFixed(1)}{unit}</div>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0}}/>
                    </div>
                  );
                })}
              </div>
            ):(
              <div style={{fontSize:"0.75rem",color:PC.muted,fontStyle:"italic"}}>
                Upload a photo or start camera to compute calibration from detected landmarks.
              </div>
            )}
          </div>
          {reliability?.icc!=null&&(
            <div style={{padding:"8px 0",borderBottom:`1px solid ${PC.border}`,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"0.8rem",color:PC.muted}}>ICC estimate (test-retest reliability)</span>
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
            {sessions.length>0&&<button onClick={clearHistory} style={{fontSize:"0.78rem",color:PC.red,background:"none",border:"none",cursor:"pointer"}}>Clear all</button>}
          </div>
          {sessions.length===0&&<div style={{textAlign:"center",color:PC.muted,fontSize:"0.82rem",padding:"30px"}}>No sessions yet. Capture or analyse a photo to start tracking.</div>}
          {sessions.length>=2&&(
            <div style={{padding:"12px 14px",borderRadius:12,border:`1px solid ${PC.border}`,marginBottom:14,background:PC.surface}}>
              <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>Score Trend</div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <PostureSparkline sessions={sessions} colour={PC.accent}/>
                <div>
                  <div style={{fontSize:"0.82rem",fontWeight:900,color:PC.accent}}>{sessions[sessions.length-1].score} <span style={{fontSize:"0.75rem",fontWeight:400,color:PC.muted}}>latest</span></div>
                  <div style={{fontSize:"0.75rem",color:sessions[sessions.length-1].score>=sessions[sessions.length-2].score?PC.green:PC.red}}>
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
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>{new Date(s.time).toLocaleTimeString()}</div>
                </div>
                <div style={{fontSize:"0.78rem",color:PC.muted,marginTop:3}}>{s.band} · {s.findings} finding{s.findings!==1?"s":""}</div>
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
    // Persist the composite (not just individual per-view sessions) to the
    // patient record so it's visible from the Patient Profile's Posture tab,
    // not only inside this live screen.
    if (composite && activePatient && setPatientField) {
      try {
        const existing = JSON.parse(activePatient.data?.posture_composite_reports || "[]");
        const entry = {
          generatedAt: new Date().toISOString(),
          views: Object.keys(mvResults),
          compositeScore: composite.compositeScore,
          compositeBand: composite.compositeBand,
          mergedFindings: composite.mergedFindings || [],
          coverage: composite.coverage,
          thumbnails: Object.fromEntries(Object.entries(mvResults).map(([vk,r])=>[vk, r.img])),
        };
        setPatientField("posture_composite_reports", JSON.stringify([...existing, entry]));
      } catch(e){ console.warn("Could not save composite report to patient record:", e); }
    }
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
          <div style={{fontSize:"0.75rem",fontWeight:400,marginTop:2,opacity:0.75}}>{sub}</div>
        </button>
      ))}
    </div>
  );

  // Multi-view progress strip (shown below view selector in multi mode)
  const mvCaptureStrip = assessMode==="multi" && (
    <div style={{padding:isWide?"12px 20px":"10px 16px",background:PC.s2,borderBottom:`1px solid ${PC.border}`}}>
      <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>☰ Multi-View Progress ({mvCapturedCount}/4)</span>
        {mvCapturedCount>0&&<button onClick={handleClearMv} style={{fontSize:"0.78rem",color:PC.red,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Reset all</button>}
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
              <div style={{fontSize:"0.75rem",fontWeight:700,color:done?PC.green:isAct?meta.colour:PC.muted,marginTop:2}}>{meta.short}</div>
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
            <span style={{fontSize:"0.75rem"}}>{has?"✓":"○"}</span>
            <div>
              <div style={{fontSize:"0.8rem",fontWeight:700,color:has?PC.green:PC.muted}}>{label}</div>
              <div style={{fontSize:"0.82rem",color:PC.muted}}>{tip}</div>
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
      <div style={{fontSize:"0.78rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:7}}>
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
                <span style={{fontSize:"0.82rem",fontWeight:700,color:"#fff"}}>{meta.short}</span>
                {res?.scoreData&&<span style={{fontSize:"0.82rem",color:"#fff",fontWeight:800}}>{res.scoreData.score}</span>}
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
          <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:2}}>
            {mvComposite.coverage.viewCount} views · {mvComposite.coverage.frontal?"✓ Frontal":"○ Frontal"} · {mvComposite.coverage.sagittal?"✓ Sagittal":"○ Sagittal"}
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowReportModal(true)} style={{padding:"5px 12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,fontSize:"0.78rem",fontWeight:700,color:"#fff",cursor:"pointer"}}>📄 PDF</button>
          <button onClick={()=>setMvTab("capture")} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${PC.border}`,background:PC.s2,fontSize:"0.78rem",fontWeight:700,color:PC.muted,cursor:"pointer"}}>← Back</button>
        </div>
      </div>

      {/* Captured view thumbnails inside report */}
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${PC.border}`,background:PC.s2}}>
        <div style={{fontSize:"0.78rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Views Analysed</div>
        <div style={{display:"flex",gap:8,overflowX:"auto"}}>
          {mvViewOrder.map(vk=>{
            const res=mvResults[vk]; if(!res) return null;
            const meta=VIEWS[vk];
            return(
              <div key={vk} style={{flexShrink:0,width:isWide?88:72,borderRadius:9,overflow:"hidden",border:`2px solid ${PC.green}`}}>
                {res.img&&<img src={res.img} alt={meta.label} style={{width:"100%",height:isWide?64:54,objectFit:"cover",display:"block"}}/>}
                <div style={{padding:"2px 5px",background:"rgba(5,150,105,0.85)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"0.82rem",fontWeight:700,color:"#fff"}}>{meta.short}</span>
                  {res.scoreData&&<span style={{fontSize:"0.75rem",color:"#fff",fontWeight:800}}>{res.scoreData.score}</span>}
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
              <div style={{fontSize:"0.82rem",color:PC.text,fontWeight:700,marginTop:2}}>
                Posture Score: {mvComposite.compositeScore}/100
                {mvComposite.frontalScore!=null&&<span style={{fontSize:"0.8rem",opacity:0.75}}> · Frontal: {mvComposite.frontalScore}</span>}
                {mvComposite.sagittalScore!=null&&<span style={{fontSize:"0.8rem",opacity:0.75}}> · Sagittal: {mvComposite.sagittalScore}</span>}
                {mvComposite.crossPlaneCount>0&&<span style={{fontSize:"0.8rem",color:PC.green}}> · {mvComposite.crossPlaneCount} cross-plane finding{mvComposite.crossPlaneCount>1?"s":""}</span>}
              </div>
              <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:4,lineHeight:1.5}}>
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
                  <div style={{fontSize:"0.75rem",fontWeight:isActive?800:400,color:isActive?col:PC.muted,lineHeight:1.2}}>{label}</div>
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
              <div style={{padding:"9px 13px",borderRadius:10,background:`${PC.accent}10`,border:`1px solid ${PC.accent}25`,fontSize:"0.82rem",fontWeight:700,color:PC.accent}}>
                ◈ Sagittal: {mvComposite.sagittalPattern}
              </div>
            )}
            {mvComposite.frontalPattern&&(
              <div style={{padding:"9px 13px",borderRadius:10,background:`${PC.a2}10`,border:`1px solid ${PC.a2}25`,fontSize:"0.82rem",fontWeight:700,color:PC.a2}}>
                ◈ Frontal: {mvComposite.frontalPattern}
              </div>
            )}
          </div>
        )}
        {/* Regional sub-scores */}
        {mvComposite.subScores&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Regional Scores</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(mvComposite.subScores).map(([region,val])=>{
                if(val==null) return null;
                const col=val>=74?PC.green:val>=55?PC.yellow:PC.red;
                return(
                  <div key={region} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:`${col}12`,border:`1px solid ${col}30`}}>
                    <span style={{fontSize:"0.82rem",color:PC.muted,textTransform:"capitalize"}}>{region}</span>
                    <span style={{fontSize:"0.8rem",fontWeight:800,color:col}}>{val}</span>
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



      {/* Mode toggle — frontal/posterior only; lateral uses HybridKendall */}
      {!isLive&&(view==="anterior"||view==="posterior"||view==="back")&&(
        <div style={{padding: isWide?"8px 20px":"8px 16px",background:PC.s3,borderBottom:`1px solid ${PC.border}`,display:"flex",gap:6}}>
          {[["ai","⚙ AI Auto (~70-80%)"],["manual","✋ Manual Points (~90-95%)"]].map(([m,label])=>(
            <button key={m} onClick={()=>handleModeSwitch(m)}
              style={{flex:1,padding:"7px 6px",borderRadius:9,border:`1px solid ${inputMode===m?PC.accent:PC.border}`,background:inputMode===m?`${PC.accent}18`:"transparent",color:inputMode===m?PC.accent:PC.muted,fontWeight:700,fontSize: isWide?"0.75rem":"0.68rem",cursor:"pointer",textAlign:"center"}}>
              {label}
            </button>
          ))}
        </div>
      )}


      {/* View selector */}
      <div style={{padding: isWide?"12px 20px":"10px 16px",background:PC.s2,borderBottom:`1px solid ${PC.border}`}}>
        <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Select View</div>
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
              {viewMeta.checks.map((c,i)=><span key={i} style={{color:PC.a3,fontSize:"0.82rem"}}>✓ {c}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Multi-view progress strip */}
      {mvCaptureStrip}

      {/* Multi-view thumbnail strip */}
      {mvThumbnailStrip}

      {/* Camera / Upload area */}
      <div ref={captureAreaRef} style={{flex:1,overflowY:"auto"}}>
        {isLive?(
          <div>
            {!camReady?(
              <div style={{padding: isWide?"20px":"16px",display:"flex",flexDirection:"column",gap:10}}>
                {error&&<div style={{padding:"10px 13px",background:"rgba(220,38,38,0.08)",border:`1px solid ${PC.red}30`,borderRadius:9,fontSize:"0.76rem",color:PC.red}}>{error}</div>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["environment","▣ Back Camera"],["user","⎇ Front Camera"]].map(([f,label])=>(
                    <button key={f} onClick={()=>startCamera(f)}
                      style={{padding: isWide?"16px":"13px",borderRadius:12,border:`1px solid ${PC.border}`,background:PC.surface,color:PC.text,fontWeight:700,fontSize: isWide?"0.85rem":"0.78rem",cursor:"pointer"}}>
                      {label}
                    </button>
                  ))}
                </div>
                {camStatus==="starting"&&<div style={{textAlign:"center",color:PC.yellow,fontSize:"0.78rem"}}>⏳ Starting camera…</div>}
              </div>
            ):(
              <div>
                <div style={{position:"relative",background:"#111",width:"100%",overflow:"hidden",borderRadius:0}}>
                  {/* Video — NO scaleX flip; front camera CSS-flipped only when user-facing.
                      A full-body standing posture photo needs a TALL portrait frame, but this
                      was previously capped at 55vw (~55% of screen WIDTH, only ~200px tall on
                      most phones) with objectFit:cover cropping it further — forcing the patient
                      to stand much further back than necessary just so the small cropped preview
                      showed enough of them, with no reliable way to confirm full-body framing
                      before capturing. Now uses most of the vertical viewport on mobile instead. */}
                  <video ref={videoRef} playsInline webkit-playsinline="true" muted autoPlay
                    style={{width:"100%",display:"block",
                      transform:camFacing==="user"?"scaleX(-1)":"none",
                      maxHeight: isMobile?"72vh":"65vh",
                      objectFit:"cover",background:"#111"}}/>
                  {/* Canvas overlay — matches video flip */}
                  <canvas ref={overlayRef}
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",
                      transform:camFacing==="user"?"scaleX(-1)":"none",
                      pointerEvents:"none"}}/>
                  <div style={{position:"absolute",top:8,left:8,display:"flex",gap:5,flexWrap:"wrap"}}>
                    <div style={{padding:"3px 8px",borderRadius:8,background:"rgba(0,0,0,0.7)",fontSize:"0.82rem",fontWeight:700,color:hasData?PC.green:PC.yellow}}>
                      {hasData?`● Tracking · ${reliability?.score}% · ICC ${reliability?.icc??"-"}`:"● Searching…"}
                    </div>
                    {motionWarning&&<div style={{padding:"3px 8px",borderRadius:8,background:"rgba(0,0,0,0.7)",fontSize:"0.82rem",fontWeight:700,color:PC.yellow}}>⟳ Hold still</div>}
                    <div style={{padding:"3px 8px",borderRadius:8,background:"rgba(0,0,0,0.7)",fontSize:"0.82rem",fontWeight:700,color:PC.a3}}>— {patientHeightCm}cm</div>
                  </div>
                  {scoreData&&<div style={{position:"absolute",top:8,right:8}}><ScoreRingBand score={scoreData.score} band={scoreData.band} colour={scoreData.colour} size={isMobile?60:80}/></div>}
                  {/* Top-priority framing guidance (e.g. "Feet not visible — move camera back")
                      was already computed by calcReliability but never actually shown during
                      live tracking — only a bare confidence percentage was visible, giving the
                      operator no actionable hint for WHY it was low or what to fix. */}
                  {hasData && reliability?.warnings?.[0] && countdown===null && (
                    <div style={{position:"absolute",bottom:8,left:8,right:8,padding:"7px 12px",borderRadius:10,
                      background:"rgba(0,0,0,0.78)",color:reliability.warnings[0].color||PC.yellow,
                      fontSize:"0.8rem",fontWeight:700,textAlign:"center",lineHeight:1.4}}>
                      {reliability.warnings[0].icon} {reliability.warnings[0].text}
                    </div>
                  )}
                  {countdown!==null&&(
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)"}}>
                      <div style={{fontSize:"6rem",fontWeight:900,color:"#fff"}}>{countdown}</div>
                    </div>
                  )}
                </div>
                <div style={{padding:"10px 14px",background:PC.surface,borderTop:`1px solid ${PC.border}`,display:"flex",gap:8}}>
                  <button onClick={()=>capturePhoto(0)} disabled={!hasData}
                    style={{flex:2,padding: isWide?"13px":"11px",background:hasData?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#e5e7eb",border:"none",borderRadius:10,color:hasData?"#fff":PC.muted,fontWeight:800,fontSize: isWide?"0.85rem":"0.78rem",cursor:hasData?"pointer":"not-allowed"}}>
                    ☉ Capture
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
            {error&&<div style={{padding:"10px 13px",background:"rgba(220,38,38,0.08)",border:`1px solid ${PC.red}30`,borderRadius:9,fontSize:"0.76rem",color:PC.red,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>{error}</span>
        {error.includes("camera")||error.includes("Camera")?<button onClick={()=>{setError(null);setCamStatus("idle");}} style={{marginLeft:8,padding:"3px 10px",borderRadius:6,border:`1px solid ${PC.red}`,background:"transparent",color:PC.red,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>Retry</button>:null}
      </div>}
            <button onClick={()=>fileInputRef.current?.click()}
              disabled={inputMode==="ai"?(mpStatus!=="ready"||analysing):false}
              style={{width:"100%",padding: isWide?"20px":"16px",borderRadius:14,border:`2px dashed ${viewMeta.colour}`,background:`${viewMeta.colour}08`,color:viewMeta.colour,fontWeight:700,fontSize: isWide?"0.9rem":"0.82rem",cursor:"pointer",textAlign:"center",marginBottom:14}}>
              {analysing?"⏳ Analysing…":"▤ Tap to upload photo"}
              <div style={{fontSize: isWide?"0.72rem":"0.65rem",fontWeight:400,marginTop:5,color:PC.muted}}>
                {(view==="left"||view==="right")
                ? "Upload lateral photo — Hybrid Kendall analysis"
                : inputMode==="manual"?"Upload photo — then tap each anatomical point":"JPG, PNG — full body, clear background"}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>

            {/* Manual mode */}
            {inputMode==="manual"&&uploadedImg&&(view==="anterior"||view==="posterior"||view==="back")&&(
              <div>
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.accent}}>✋ Manual Points: {manualPlacedCount} / {manualTotal}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={undoLastManual} disabled={manualPlacedCount===0}
                        style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${PC.border}`,background:PC.s2,fontSize:"0.75rem",fontWeight:700,color:PC.muted,cursor:manualPlacedCount>0?"pointer":"not-allowed"}}>
                        ↩ Undo
                      </button>
                      <button onClick={resetManual} disabled={manualPlacedCount===0}
                        style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${PC.red}30`,background:"rgba(220,38,38,0.06)",fontSize:"0.75rem",fontWeight:700,color:PC.red,cursor:manualPlacedCount>0?"pointer":"not-allowed"}}>
                        Reset
                      </button>
                    </div>
                  </div>
                  <div style={{height:6,borderRadius:6,background:PC.s3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${manualPct*100}%`,background:manualCanAnalyse?PC.green:PC.accent,borderRadius:6,transition:"width 0.3s"}}/>
                  </div>
                </div>
                {nextManualIdx >= 0 ? (
                  <div style={{padding:"7px 11px",borderRadius:8,background:`${PC.accent}10`,border:`1px solid ${PC.accent}30`,fontSize:"0.8rem",color:PC.accent,marginBottom:9,fontWeight:700}}>
                    Next: {nextManualIdx+1}. {manualPointDefs[nextManualIdx]?.label} — {manualPointDefs[nextManualIdx]?.desc}
                  </div>
                ) : (
                  <div style={{padding:"7px 11px",borderRadius:8,background:`${PC.green}10`,border:`1px solid ${PC.green}30`,fontSize:"0.8rem",color:PC.green,marginBottom:9,fontWeight:700}}>
                    All points placed!
                  </div>
                )}
                <div ref={manualContainerRef} onClick={handleManualImageClick}
                  style={{position:"relative",borderRadius:12,overflow:"hidden",border:`2px solid ${spinalLevelMode?PC.yellow:PC.accent}`,cursor:(nextManualIdx>=0||spinalLevelMode)?"crosshair":"default",marginBottom:10}}>
                  <img id="manual-posture-img" src={objectUrlRef.current||uploadedImg} alt="Tap to place points"
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
                  {/* Analysis overlay — shown after Analyse Now is tapped */}
                  {manualAnalysed&&landmarks&&(
                    <CanvasOverlayOnImage
                      photoUrl={objectUrlRef.current||uploadedImg}
                      landmarks={landmarks}
                      view={view}
                      measurements={measurements||undefined}
                      manualPlaced={manualPlaced}
                      manualPointDefs={manualPointDefs}
                      manualConnections={manualConnections}
                      imgId="manual-posture-img"
                    />
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns: isWide?"repeat(3,1fr)":"repeat(2,1fr)",gap:4,marginBottom:10}}>
                  {manualPointDefs.map(def=>{
                    const done=!!manualPlaced[def.id];
                    const isNext=def.id===manualPointDefs[nextManualIdx]?.id;
                    return(
                      <div key={def.id} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 7px",borderRadius:6,background:done?`${PC.green}10`:isNext?`${PC.accent}10`:"transparent",border:`1px solid ${done?PC.green:isNext?PC.accent:PC.border}`}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:done?PC.green:isNext?PC.accent:PC.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:900,color:"#fff",flexShrink:0}}>{done?"✓":def.id+1}</div>
                        <div style={{fontSize:"0.8rem",color:done?PC.green:isNext?PC.accent:PC.muted,fontWeight:done||isNext?700:400,lineHeight:1.2}}>{def.label}</div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={analyseManualPoints} disabled={!manualCanAnalyse}
                  style={{width:"100%",padding:"14px",borderRadius:12,border:"none",
                    background: manualCanAnalyse ? `linear-gradient(135deg,${PC.accent},${PC.a2})` : PC.s3,
                    color: manualCanAnalyse ? "#fff" : PC.muted,
                    fontWeight:800,fontSize: isWide?"0.9rem":"0.82rem",
                    cursor: manualCanAnalyse ? "pointer" : "not-allowed",
                    opacity: manualCanAnalyse ? 1 : 0.75}}>
                  {manualCanAnalyse
                    ? (manualAnalysed ? `↻ Re-analyse — ${manualPlacedCount}/${manualTotal} points` : `✋ Analyse Now — ${manualPlacedCount}/${manualTotal} points`)
                    : `Place at least ${manualMinPoints} points to analyse (${manualPlacedCount}/${manualTotal})`}
                </button>

                {/* ── C7 / T12 Spinal Levels (Manual mode) ── */}
                {isLat && uploadedImg && (
                  <div style={{marginTop:10,padding:"10px 12px",background:"rgba(251,191,36,0.05)",border:`1px solid ${spinalLevelMode?"rgba(251,191,36,0.5)":"rgba(251,191,36,0.2)"}`,borderRadius:10}}>
                    <div style={{fontSize:"0.75rem",fontWeight:800,color:"#fbbf24",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:7}}>🦴 Spinal Levels — C7 · T12</div>
                    <div style={{display:"flex",gap:7}}>
                      {[
                        { key:'c7',  label:'C7',  sublabel:'Base of neck',          color:'#fbbf24' },
                        { key:'t12', label:'T12', sublabel:'Thoracolumbar junction', color:'#f87171' },
                      ].map(lv=>{
                        const placed = manualSpinal[lv.key+'Y'] !== undefined;
                        const isActive = spinalLevelMode === lv.key;
                        return (
                          <div key={lv.key} style={{flex:1}}>
                            <button
                              onClick={()=>setSpinalLevelMode(isActive?null:lv.key)}
                              style={{width:"100%",padding:"7px 4px",borderRadius:8,border:`1.5px solid ${isActive?lv.color:placed?lv.color+"60":"rgba(255,255,255,0.12)"}`,background:isActive?`${lv.color}20`:placed?`${lv.color}10`:"transparent",color:isActive?lv.color:placed?lv.color:"#7e6a9a",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",textAlign:"center"}}>
                              {placed?"✅ ":""}{lv.label}
                              <div style={{fontSize:"0.53rem",fontWeight:400}}>{isActive?"👆 Tap photo":placed?"Placed":"Tap to mark"}</div>
                            </button>
                            {placed&&(
                              <button onClick={()=>setManualSpinal(prev=>{const n={...prev};delete n[lv.key+'Y'];return n;})}
                                style={{width:"100%",marginTop:2,padding:"2px",borderRadius:4,border:"none",background:"rgba(255,77,109,0.1)",color:"#ff4d6d",fontSize:"0.53rem",fontWeight:700,cursor:"pointer"}}>
                                ✕ Clear
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {spinalLevelMode&&(
                      <div style={{marginTop:6,fontSize:"0.8rem",color:spinalLevelMode==='c7'?"#fbbf24":"#f87171",fontWeight:700}}>
                        👆 Tap on the photo above to mark {spinalLevelMode==='c7'?"C7 (base of neck, spinous process)":"T12 (thoracolumbar junction)"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI mode image — hidden for lateral views (HybridKendall shows its own photo) */}
            {inputMode==="ai"&&(rawUploadedImg||uploadedImg)&&
              !(view==="left"||view==="right")&&(
              <div ref={aiSagImgRef}
                onClick={e=>{
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width;
                  const y = (e.clientY - rect.top)  / rect.height;

                  // ── Spinal level tap (C7 / T12) ──
                  if (spinalLevelMode) {
                    const trunkNorm = tapYToTrunkNorm(y);
                    if (trunkNorm !== null) {
                      setManualSpinal(prev => ({...prev, [spinalLevelMode+'Y']: Math.max(-0.2, Math.min(1.3, trunkNorm))}));
                    }
                    setSpinalLevelMode(null);
                    // Re-run analysis with updated spinal levels
                    if (landmarks) setTimeout(()=>processLandmarks(landmarks, view, null), 50);
                    return;
                  }

                  // ── AI 5-point landmark tap ──
                  if (!aiSagActive) return;
                  const placed = AI_SAG_5_POINTS.filter(p=>!aiSagPlaced[p.id]);
                  if (placed.length===0) return;
                  const next = placed[0];
                  setAiSagPlaced(prev=>{
                    const updated = {...prev, [next.id]:{x,y}};
                    // Auto-analyse when all 5 placed
                    if (Object.keys(updated).length===5 && landmarks) {
                      setTimeout(()=>{
                        const merged = landmarks.map((lm,i)=>({...lm}));
                        AI_SAG_5_POINTS.forEach(pt=>{
                          const p = updated[pt.id];
                          if (p) {
                            merged[pt.mpIdx] = {x:p.x, y:p.y, z:0, visibility:1.0};
                            const mirror = pt.mpIdx+1;
                            if (mirror<33) merged[mirror]={x:p.x, y:p.y, z:0, visibility:1.0};
                          }
                        });
                        processLandmarks(merged, view, null);
                        setAiSagActive(false);
                      },50);
                    }
                    return updated;
                  });
                }}
                style={{borderRadius:14,overflow:"hidden",border:`1px solid ${aiSagActive?"#a78bfa":PC.border}`,boxShadow:isWide?"0 4px 20px rgba(0,0,0,0.08)":"none",background:PC.s2,position:"relative",transition:"border-color 0.2s",cursor:aiSagActive?"crosshair":"default"}}>
                {/* Layer 1: original photo — always visible, never a blank/black canvas */}
                <img
                  id="posture-upload-img"
                  src={rawUploadedImg||uploadedImg}
                  alt="Uploaded"
                  style={{width:"100%",display:"block",opacity:analysing?0.55:1,transition:"opacity 0.3s"}}
                />
                {/* Layer 2: annotated overlay — hidden in lateral views once Kendall is active */}
                {uploadedImg&&uploadedImg!==rawUploadedImg&&!analysing&&
                  !(kendallFindings && (view==="left"||view==="right"))&&(
                  <img
                    src={uploadedImg}
                    alt="Analysed overlay"
                    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"fill",display:"block",pointerEvents:"none"}}
                    onError={e=>{ e.target.style.display="none"; }}
                  />
                )}

                {/* Analysing spinner */}
                {analysing&&(
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.35)"}}>
                    <div style={{padding:"10px 18px",borderRadius:10,background:"rgba(0,0,0,0.75)",color:"#fff",fontSize:"0.78rem",fontWeight:700}}>⏳ Analysing…</div>
                  </div>
                )}

                {/* 5-point dot overlay */}
                {aiSagActive&&AI_SAG_5_POINTS.map(pt=>{
                  const p=aiSagPlaced[pt.id]; if(!p) return null;
                  return(
                    <div key={pt.id} style={{position:"absolute",left:`${p.x*100}%`,top:`${p.y*100}%`,transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:20}}>
                      <div style={{width:14,height:14,borderRadius:"50%",background:pt.color,border:"2px solid white",boxShadow:`0 0 6px ${pt.color}`}}/>
                      <span style={{position:"absolute",left:16,top:-4,fontSize:"0.78rem",fontWeight:800,color:pt.color,whiteSpace:"nowrap",textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>{pt.label}</span>
                    </div>
                  );
                })}
                {/* Tap target hint */}
                {aiSagActive&&(()=>{
                  const remaining=AI_SAG_5_POINTS.filter(p=>!aiSagPlaced[p.id]);
                  if (!remaining.length) return null;
                  const next=remaining[0];
                  return(
                    <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.75)",color:next.color,padding:"5px 12px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,whiteSpace:"nowrap",pointerEvents:"none",zIndex:20}}>
                      👆 Tap: {next.label} — {next.desc}
                    </div>
                  );
                })()}

                {/* ── C7 / T12 spinal level dots ── */}
                {(()=>{
                  const { shY, hipY } = getSpinalRefY();
                  if (!shY || !hipY) return null;
                  const toImgY = trunkNorm => shY + trunkNorm*(hipY-shY);
                  const levels = [
                    { key:'c7',  label:'C7',  color:'#fbbf24', y: manualSpinal.c7Y  },
                    { key:'t12', label:'T12', color:'#f87171', y: manualSpinal.t12Y },
                  ];
                  return levels.map(lv => {
                    if (lv.y === undefined || lv.y === null) return null;
                    const imgY = toImgY(lv.y);
                    return (
                      <div key={lv.key} style={{position:"absolute",left:0,right:0,top:`${imgY*100}%`,pointerEvents:"none",zIndex:25,display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:"100%",height:1.5,background:`${lv.color}80`,borderTop:`1.5px dashed ${lv.color}`}}/>
                        <div style={{position:"absolute",left:6,background:"rgba(0,0,0,0.75)",color:lv.color,padding:"1px 6px",borderRadius:4,fontSize:"0.8rem",fontWeight:800,whiteSpace:"nowrap"}}>{lv.label}</div>
                      </div>
                    );
                  });
                })()}

                {/* Spinal tap mode hint */}
                {spinalLevelMode&&(
                  <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.85)",color:spinalLevelMode==='c7'?"#fbbf24":"#f87171",padding:"5px 14px",borderRadius:20,fontSize:"0.75rem",fontWeight:800,whiteSpace:"nowrap",pointerEvents:"none",zIndex:30}}>
                    👆 Tap to mark {spinalLevelMode==='c7'?"C7 — base of neck":"T12 — thoracolumbar junction"}
                  </div>
                )}
              </div>
            )}

            {/* ── Hybrid Kendall Mode — lateral views ── */}
            {(view==="left"||view==="right") && (uploadedImg||rawUploadedImg) && (
              <HybridKendall
                key={(rawUploadedImg||uploadedImg)+"|"+view}
                imgSrc={rawUploadedImg||uploadedImg}
                vitposeLandmarks={hybridSeedLandmarks}
                vitposeLoading={analysing||vitposeLoading}
                vitposeError={vitposeError}
                view={view}
                patientSex={patientInfo?.sex||"Female"}
                onFindingsChange={handleKendallFindings}
                isWide={isWide}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );

  // ── Report generator ─────────────────────────────────────────────────────────
  function generateReport() {
    // In multi-view mode, use composite data if available; fall back to single-view
    const isMultiRpt = assessMode === "multi" && mvComposite && Object.keys(mvResults||{}).length >= 2;
    const rptFindings_src  = isMultiRpt ? mvComposite.mergedFindings : findings;
    const rptScoreData_src = isMultiRpt
      ? { score: mvComposite.compositeScore, band: mvComposite.compositeBand, colour: mvComposite.compositeColour, color: mvComposite.compositeColour }
      : scoreData;
    if(!rptFindings_src?.length || !rptScoreData_src) return;
    try {
      const annotatedImg = uploadedImg || capturedImg || null;
      // Build ordered array of all captured view images for dynamic photo grid
      const _viewOrderRpt = ["anterior","posterior","left","right"];
      const _viewLabelsRpt = { anterior:"Anterior — Front", posterior:"Posterior — Back", left:"Left Lateral", right:"Right Lateral" };
      let allViewImgs = [];
      if (assessMode === "multi" && Object.keys(mvResults||{}).length > 0) {
        allViewImgs = _viewOrderRpt
          .filter(vk => mvResults[vk]?.img)
          .map(vk => ({ img: mvResults[vk].img, label: _viewLabelsRpt[vk], score: mvResults[vk].scoreData?.score ?? null }));
      }
      if (allViewImgs.length === 0 && annotatedImg) {
        allViewImgs = [{ img: annotatedImg, label: _viewLabelsRpt[view] || "Analysis view", score: scoreData?.score ?? null }];
      }
      const views = isMultiRpt ? Object.keys(mvResults) : [view];
      const m = measurements||{};

    // Build findings for report
    const isClinicianVerified = Object.keys(verified||{}).length > 0;
    const rptFindings = (rptFindings_src||[]).map(f=>({
      region: f.region||f.label||"Finding",
      text: (f.findingName||f.text||f.label||"").replace(/^OBSERVATION[^:]*:\s*/i,"").replace(/^OBSERVATION ONLY[^:]*:\s*/i,""),
      severity: (f.severity||"moderate").toLowerCase(),
      // Patient-friendly plain text: use layer 2 contributors if available, else brief summary
      plain: f.plain || (f.findingName||f.text||"").replace(/^OBSERVATION[^:]*:\s*/i,"").split(".")[0] || f.description || "",
      whatIfUntreated: f.whatIfUntreated || "May worsen without targeted intervention. Confirm clinically.",
      correction: f.correction || (f.exercises||[]).join(". ") || "See exercise plan.",
      icd: f.icd || "—",
      norm: f.norm || "—",
      measured: f.measured || "—",
      confidence: f.confidenceScore || 70,
      derivedFrom: f._derivedFrom || [],
      requiresVerification: f._requiresVerification || false,
      isObservationOnly: true, // All findings are observation-only per clinical audit
    }));

    // Build exercise list
    const rptExercises = Object.values(buildExercisePlan ? buildExercisePlan(findings,view) : {}).flat().map((ex,i)=>({
      phase: ex.cat==="inhibit"?1:ex.cat==="activate"?2:3,
      category: (ex.cat||"correct").toUpperCase(),
      name: ex.name||"Exercise",
      sets: ex.sets||"3×10",
      freq: "Daily",
      cue: ex.cue||ex.description||"",
    }));

    // Goals from findings
    const goals = [];
    if(m.cvaAngle!=null) goals.push({metric:"CVA (Yip 2008)",current:m.cvaAngle.toFixed(1)+"°",target:">55°",timeframe:"6 weeks"});
    if(m.thoracicAngle!=null) goals.push({metric:"Thoracic Kyphosis (Trunk Lean Est.)",current:m.thoracicAngle.toFixed(1)+"°",target:"<45°",timeframe:"8 weeks"});
    if(rptScoreData_src?.score!=null) goals.push({metric:"Posture Score",current:rptScoreData_src.score+"/100",target:">60/100",timeframe:"8 weeks"});

    const d = {
      analysisMode: isClinicianVerified ? "Clinician Verified" : "AI Estimated",
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
      score: { value: rptScoreData_src?.score||0, band: rptScoreData_src?.band||"", colour: rptScoreData_src?.colour||rptScoreData_src?.color||"#dc2626" },
      views,
      annotatedImg,
      allViewImgs,
      findings: rptFindings,
      muscles: (()=>{
        const mi = buildMuscleImbalance(findings);
        const toObj = (entries, type) => (entries||[]).map(([name, regions])=>({
          name,
          source: (regions||[]).map(r=>r.region||"").filter(Boolean).join(", ")||"Posture",
          severity: type==="tight"?"Overactive":"Underactive",
        }));
        return { tight: toObj(mi.tight,"tight"), weak: toObj(mi.weak,"weak") };
      })(),
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
        assessment: `${rptFindings.length} postural finding${rptFindings.length!==1?"s":""} identified. Score ${rptScoreData_src?.score||0}/100 — ${rptScoreData_src?.band||''}. ${rptFindings.map(f=>f.region).join(", ")}. Clinical decision regarding referral at clinician discretion — confirm all findings with physical examination before treatment.`,
        plan: `Janda Approach neuromuscular sequencing programme. Inhibit → Activate → Correct. Daily 10–15 min. Reassess in 4–6 weeks. Monitor for symptom development.`,
      },
      goals,
      redFlags: { triggered: false, items: [] },
    };

    // Build HTML — wrap in full document so openPdf works (same as PdfReportsModal)
    const credits = reportType==="basic"?2:5;
    const bodyHtml = buildStaticReport(d, reportType, credits);
    const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>PostureAI Clinical Report</title>
<style>
  @page{size:A4;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;padding:16px;font-family:'Segoe UI',system-ui,Arial,sans-serif;background:#e5e7eb}
  .page{width:794px;min-height:1123px;background:#fff;margin:0 auto 24px;border-radius:4px;box-shadow:0 4px 32px rgba(0,0,0,.18);position:relative;overflow:hidden}
  table{border-collapse:collapse;width:100%}
  @media print{body{background:#fff;padding:0}.page{margin:0;box-shadow:none;border-radius:0;page-break-after:always}.page:last-of-type{page-break-after:auto}}
</style></head><body>${bodyHtml}</body></html>`;
    // Open in new tab and print — same method as the working PdfReportsModal
    const win = window.open("","_blank");
    if(!win){ alert("Please allow popups to generate the PDF report."); return; }
    win.document.open(); win.document.write(fullHtml); win.document.close();
    setTimeout(()=>{ try{ win.print(); }catch(e){} }, 800);
    setShowReportModal(false);
    } catch(err) {
      console.error("generateReport error:", err);
      alert("Report error: " + err.message);
    }
  }

  function buildStaticReport(d, type, credits) {
    const C = { primary:"#0f172a",accent:"#0ea5e9",green:"#059669",yellow:"#d97706",red:"#dc2626",muted:"#64748b",border:"#e2e8f0",surface:"#f8fafc" };
    const sevCol = s => s==="high"?C.red:s==="moderate"?C.yellow:C.green;
    const sevBg  = s => s==="high"?"#fef2f2":s==="moderate"?"#fffbeb":"#f0fdf4";
    const metRow = (label,val,norm,bad,warn) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:6px;margin-bottom:3px;background:${bad?"#fef2f2":warn?"#fffbeb":"#f0fdf4"};border:1px solid ${bad?C.red:warn?C.yellow:C.green}20">
        <span style="font-size:0.63rem;color:${C.muted}">${label}</span>
        <div style="text-align:right"><div style="font-size:0.7rem;font-weight:800;color:${bad?C.red:warn?C.yellow:C.green}">${val??'—'}</div><div style="font-size:0.52rem;color:${C.muted}">nrm ${norm}</div></div>
      </div>`;
    const footer = (page,total,type) => `
      <div style="position:absolute;bottom:0;left:0;right:0;border-top:1px solid ${C.border};padding:8px 32px;display:flex;justify-content:space-between;background:#f8fafc;">
        <div style="font-size:0.55rem;color:${C.muted}">⚠ Screening & education only — NOT a medical diagnosis. Automated estimates from a 2D photo; may be inaccurate. This tool is not a medical device and does not provide medical advice. Consult a qualified healthcare professional.</div>
        <div style="font-size:0.55rem;color:${C.muted};white-space:nowrap;margin-left:8px">${type} · ${d.clinician.date} · Page ${page}/${total}</div>
      </div>`;
    const hdr = (title,sub) => `
      <div style="background:${C.primary};padding:18px 32px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-family:Fraunces;font-size:1.3rem;font-weight:900;color:#fff">PostureAI</div><div style="font-size:0.65rem;color:rgba(255,255,255,.5);margin-top:2px">Posture Screening & Education · Not a medical diagnosis</div></div>
        <div style="text-align:right"><div style="font-family:Fraunces;font-size:0.95rem;font-weight:700;color:${C.accent}">${title}</div><div style="font-size:0.6rem;color:rgba(255,255,255,.5);margin-top:2px">${sub} · Session ${d.clinician.session}</div></div>
      </div>`;

    const m = d.metrics;
    const scoreColour = d.score.colour||C.red;
    // Dynamic photo grid — shows only captured views, no placeholders
    const photoGrid = (imgs, h=200) => {
      if (!imgs || imgs.length === 0) return '';
      const cols = imgs.length === 1 ? '1fr' : '1fr 1fr';
      return `<div style="display:grid;grid-template-columns:${cols};gap:10px">
        ${imgs.map(({img:src,label,score})=>`
          <div style="border-radius:10px;overflow:hidden;border:1px solid ${C.border}">
            <div style="height:${h}px;background:#0f172a;overflow:hidden">
              <img src="${src}" style="width:100%;height:100%;object-fit:contain"/>
            </div>
            <div style="padding:4px 8px;background:${C.surface};display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:0.58rem;font-weight:700;color:${C.muted}">${label||''}</span>
              ${score!=null?`<span style="font-size:0.6rem;font-weight:800;color:${score>=74?C.green:score>=58?C.yellow:C.red}">${score}/100</span>`:''}
            </div>
          </div>`).join('')}
      </div>`;
    };
    const img = d.annotatedImg ? `<img src="${d.annotatedImg}" style="width:100%;height:100%;object-fit:contain;border-radius:8px"/>` : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:${C.muted}"><div style="font-size:2rem">📷</div><div style="font-size:0.65rem;margin-top:6px">Analysed image</div></div>`;

    if(type==="basic") {
      const regions = [
        {label:"Head & Neck", bad:m.cvaAngle!=null&&m.cvaAngle<49, warn:m.cvaAngle!=null&&m.cvaAngle<55},
        {label:"Upper Back", bad:m.thoracicAngle!=null&&m.thoracicAngle>55, warn:m.thoracicAngle!=null&&m.thoracicAngle>45},
        {label:"Lower Back & Pelvis", bad:Math.abs(m.lumbarProxy||0)>10, warn:Math.abs(m.lumbarProxy||0)>5},
        {label:"Shoulders", bad:Math.abs(m.shoulderAngle||0)>7, warn:Math.abs(m.shoulderAngle||0)>3},
      ];
      const trafficPill = r => {
        const col = r.bad?C.red:r.warn?C.yellow:C.green;
        const bg = r.bad?"#fef2f2":r.warn?"#fffbeb":"#f0fdf4";
        const txt = r.bad?"✕ Needs Attention":r.warn?"⚠ Moderate":"✓ Normal";
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:6px;background:${bg};margin-bottom:4px;border:1px solid ${col}30"><span style="font-size:0.72rem;font-weight:600;color:${C.primary}">${r.label}</span><span style="font-size:0.65rem;font-weight:700;color:${col}">${txt}</span></div>`;
      };
      return `
        <div class="page">
          ${hdr("Basic Posture Report", d.clinician.date)}
          <div style="padding:20px 32px 80px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;padding:14px;background:${C.surface};border-radius:10px;border:1px solid ${C.border}">
              <div>
                <div style="font-size:0.58rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Patient</div>
                <div style="font-family:Fraunces;font-size:1.1rem;font-weight:700;color:${C.primary}">${d.patient.name}</div>
              <div style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:5px;font-size:0.55rem;font-weight:700;background:${d.analysisMode==="Clinician Verified"?"#d1fae5":"#f1f5f9"};color:${d.analysisMode==="Clinician Verified"?"#059669":"#64748b"};border:1px solid ${d.analysisMode==="Clinician Verified"?"#6ee7b7":"#e2e8f0"}">${d.analysisMode||"AI Estimated"} Analysis</div>
                <div style="font-size:0.68rem;color:${C.muted};margin-top:3px">${d.patient.age} yrs · ${d.patient.sex} · ${d.patient.height}</div>
                <div style="font-size:0.65rem;color:${C.muted}">Occupation: ${d.patient.occupation}</div>
              </div>
              <div style="border-left:1px solid ${C.border};padding-left:14px">
                <div style="font-size:0.58rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Assessed by</div>
                <div style="font-family:Fraunces;font-size:1rem;font-weight:700;color:${C.primary}">${d.clinician.name}</div>
                <div style="font-size:0.68rem;color:${C.muted}">${d.clinician.credentials}</div>
                <div style="font-size:0.65rem;color:${C.muted}">${d.clinician.clinic}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start;margin-bottom:18px">
              <div style="text-align:center;padding:16px 18px;background:${C.surface};border-radius:12px;border:1px solid ${scoreColour}30">
                <svg width="90" height="90">
                  <circle cx="45" cy="45" r="34" fill="none" stroke="${C.border}" stroke-width="8"/>
                  <circle cx="45" cy="45" r="34" fill="none" stroke="${scoreColour}" stroke-width="8"
                    stroke-dasharray="${(d.score.value/100)*(2*Math.PI*34)} ${2*Math.PI*34}"
                    stroke-dashoffset="${2*Math.PI*34*0.25}" stroke-linecap="round"
                    transform="rotate(-90 45 45)"/>
                  <text x="45" y="45" text-anchor="middle" dominant-baseline="middle"
                    fill="${scoreColour}" font-size="20" font-weight="900" font-family="Fraunces">${d.score.value}</text>
                </svg>
                <div style="font-family:Fraunces;font-size:0.85rem;font-weight:900;color:${scoreColour};margin-top:4px">${d.score.band}</div>
                <div style="font-size:0.58rem;color:${C.muted}">out of 100</div>
              </div>
              <div>
                <div style="font-size:0.6rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Body Region Check</div>
                ${regions.map(trafficPill).join("")}
                <div style="margin-top:8px;padding:8px 10px;border-radius:6px;background:#f0f9ff;border:1px solid #bae6fd;font-size:0.6rem;color:#0369a1">
                  ℹ Reliability: <strong>${m.reliability}%</strong> · Views: ${d.views.join(", ")}
                </div>
              </div>
            </div>
            <div style="margin-bottom:18px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
                <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">Your Posture Photo</div>
              </div>
              ${photoGrid(d.allViewImgs, 200)}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
              <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">What We Found — In Plain English</div>
            </div>
            ${d.findings.slice(0,3).map((f,i)=>`
              <div style="margin-bottom:10px;padding:12px;border-radius:10px;background:${sevBg(f.severity)};border:1px solid ${sevCol(f.severity)}30">
                <div style="display:flex;gap:10px;align-items:flex-start">
                  <div style="width:22px;height:22px;border-radius:50%;background:${sevCol(f.severity)};display:flex;align-items:center;justify-content:center;font-size:0.62rem;font-weight:900;color:#fff;flex-shrink:0">${i+1}</div>
                  <div>
                    <div style="font-family:Fraunces;font-size:0.82rem;font-weight:700;color:${C.primary};margin-bottom:4px">${f.region}</div>
                    <div style="font-size:0.68rem;color:${C.primary};line-height:1.6;margin-bottom:6px">${f.plain||f.text}</div>
                    <div style="font-size:0.6rem;color:${C.red};line-height:1.5;padding:4px 8px;background:rgba(220,38,38,.06);border-radius:4px">⚠ If untreated: ${f.whatIfUntreated}</div>
                  </div>
                </div>
              </div>`).join("")}
          </div>
          ${footer(1,2,"Basic Report")}
        </div>
        <div class="page">
          ${hdr("Your Exercise Plan","Personalised Programme")}
          <div style="padding:20px 32px 80px">
            <div style="padding:12px;border-radius:10px;background:#f0f9ff;border:1px solid #bae6fd;margin-bottom:16px">
              <div style="font-family:Fraunces;font-size:0.88rem;font-weight:700;color:#0369a1;margin-bottom:4px">Your 3-Phase Programme · 10–15 min/day</div>
              <div style="font-size:0.67rem;color:#0369a1;line-height:1.6">Follow this order every day. Phase 1 relaxes tight muscles so Phase 2 exercises work properly. Phase 3 trains your brain to hold the corrected position.</div>
            </div>
            ${[1,2,3].map(ph=>{
              const exs = d.exercises.filter(e=>e.phase===ph);
              const meta = {1:{label:"Phase 1 — Inhibit (Relax Tight Muscles)",col:"#dc2626",bg:"#fef2f2",icon:"🔴"},2:{label:"Phase 2 — Activate (Strengthen Weak Muscles)",col:"#2563eb",bg:"#eff6ff",icon:"🔵"},3:{label:"Phase 3 — Correct (Train New Posture)",col:"#059669",bg:"#f0fdf4",icon:"🟢"}}[ph];
              return `<div style="margin-bottom:12px;border-radius:10px;border:1px solid ${meta.col}25;overflow:hidden">
                <div style="padding:9px 14px;background:${meta.bg};border-bottom:1px solid ${meta.col}25;display:flex;align-items:center;gap:8px">
                  <span>${meta.icon}</span>
                  <div style="font-family:Fraunces;font-size:0.78rem;font-weight:700;color:${meta.col}">${meta.label}</div>
                </div>
                ${exs.length?exs.map((ex,i)=>`
                  <div style="padding:9px 14px;border-bottom:${i<exs.length-1?`1px solid ${C.border}`:"none"};display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start">
                    <div>
                      <div style="font-size:0.73rem;font-weight:700;color:${C.primary};margin-bottom:3px">${ex.name}</div>
                      <div style="font-size:0.63rem;color:${C.muted};line-height:1.5">${ex.cue}</div>
                    </div>
                    <div style="text-align:right">
                      <div style="font-size:0.68rem;font-weight:700;color:${meta.col};padding:2px 8px;border-radius:5px;background:${meta.bg};border:1px solid ${meta.col}30;white-space:nowrap">${ex.sets}</div>
                      <div style="font-size:0.56rem;color:${C.muted};margin-top:3px">${ex.freq}</div>
                    </div>
                  </div>`).join(""):`<div style="padding:10px 14px;font-size:0.65rem;color:${C.muted}">See clinician for specific exercises.</div>`}
              </div>`;
            }).join("")}
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
              ${d.goals.map(g=>`<div style="padding:12px;border-radius:8px;background:${C.surface};border:1px solid ${C.border};text-align:center">
                <div style="font-size:0.58rem;font-weight:700;color:${C.muted};text-transform:uppercase;margin-bottom:4px">${g.metric}</div>
                <div style="font-size:0.78rem;font-weight:900;color:${C.red};font-family:Fraunces">${g.current}</div>
                <div style="font-size:0.62rem;color:${C.muted};margin:2px 0">→</div>
                <div style="font-size:0.78rem;font-weight:900;color:${C.green};font-family:Fraunces">${g.target}</div>
                <div style="font-size:0.56rem;color:${C.muted};margin-top:2px">by ${g.timeframe}</div>
              </div>`).join("")}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              <div style="padding:12px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a">
                <div style="font-size:0.64rem;font-weight:700;color:${C.yellow};margin-bottom:4px">📅 Next Reassessment</div>
                <div style="font-size:0.7rem;color:${C.primary}">Recommended in <strong>4–6 weeks</strong></div>
              </div>
              <div style="padding:12px;border-radius:8px;background:${C.surface};border:1px solid ${C.border}">
                <div style="font-size:0.58rem;font-weight:700;color:${C.muted};margin-bottom:16px">PATIENT ACKNOWLEDGEMENT</div>
                <div style="border-bottom:1px solid ${C.primary};margin-bottom:4px"></div>
                <div style="font-size:0.56rem;color:${C.muted}">Signature · Date: ___________</div>
                <div style="font-size:0.54rem;color:${C.muted};margin-top:4px">I have received and understood this report</div>
              </div>
            </div>
            <div style="margin-top:14px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#f8fafc,#f0f9ff);border:1px solid #bae6fd;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:0.58rem;color:${C.muted}">Generated by <strong>PhysioMind Pro</strong> · Basic Report</div>
            </div>
          </div>
          ${footer(2,2,"Basic Report")}
        </div>`;
    }

    // Detailed report — 5 pages
    return `
      <div class="page">
        <div style="height:7px;background:linear-gradient(90deg,${C.primary},${C.accent})"></div>
        <div style="padding:26px 32px 80px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
            <div>
              <div style="font-family:Fraunces;font-size:1.9rem;font-weight:900;color:${C.primary};line-height:1">PostureAI</div>
              <div style="font-size:0.68rem;color:${C.muted};margin-top:4px;letter-spacing:1px;text-transform:uppercase">Detailed Clinical Report</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:0.62rem;color:${C.muted}">Report Date</div>
              <div style="font-family:Fraunces;font-size:0.95rem;font-weight:700;color:${C.primary}">${d.clinician.date}</div>
              <div style="font-size:0.58rem;color:${C.muted};margin-top:2px">Session #${d.clinician.session}</div>
            </div>
          </div>
          <div style="height:1px;background:linear-gradient(90deg,${C.accent},transparent);margin-bottom:18px"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px">
            <div style="padding:14px;border-radius:10px;background:${C.surface};border:1px solid ${C.border}">
              <div style="font-size:0.56rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.accent};margin-bottom:7px">Patient Information</div>
              <div style="font-family:Fraunces;font-size:1.15rem;font-weight:900;color:${C.primary}">${d.patient.name}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:8px;font-size:0.63rem;color:${C.muted}">
                <span>Age: <strong style="color:${C.primary}">${d.patient.age}y</strong></span>
                <span>Sex: <strong style="color:${C.primary}">${d.patient.sex}</strong></span>
                <span>Height: <strong style="color:${C.primary}">${d.patient.height}</strong></span>
                <span>Weight: <strong style="color:${C.primary}">${d.patient.weight}</strong></span>
                <span style="grid-column:1/-1">Occupation: <strong style="color:${C.primary}">${d.patient.occupation}</strong></span>
              </div>
            </div>
            <div style="padding:14px;border-radius:10px;background:${C.surface};border:1px solid ${C.border}">
              <div style="font-size:0.56rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.accent};margin-bottom:7px">Clinician</div>
              <div style="font-family:Fraunces;font-size:1.05rem;font-weight:900;color:${C.primary}">${d.clinician.name}</div>
              <div style="font-size:0.67rem;color:${C.muted};margin-top:3px">${d.clinician.credentials}</div>
              <div style="font-size:0.65rem;color:${C.muted}">${d.clinician.clinic}</div>
              <div style="margin-top:10px;border-top:1px solid ${C.border};padding-top:8px;font-size:0.57rem;color:${C.muted}">
                Views: <strong>${d.views.join(", ")}</strong> · Reliability: <strong style="color:${C.green}">${m.reliability}% (Excellent)</strong>
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:18px;margin-bottom:20px;padding:18px;border-radius:12px;background:${C.surface};border:1px solid ${scoreColour}25">
            <div style="text-align:center">
              <svg width="100" height="100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="${C.border}" stroke-width="9"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="${scoreColour}" stroke-width="9"
                  stroke-dasharray="${(d.score.value/100)*(2*Math.PI*38)} ${2*Math.PI*38}"
                  stroke-dashoffset="${2*Math.PI*38*0.25}" stroke-linecap="round"
                  transform="rotate(-90 50 50)"/>
                <text x="50" y="50" text-anchor="middle" dominant-baseline="middle"
                  fill="${scoreColour}" font-size="22" font-weight="900" font-family="Fraunces">${d.score.value}</text>
              </svg>
              <div style="font-family:Fraunces;font-size:0.9rem;font-weight:900;color:${scoreColour};margin-top:4px">${d.score.band}</div>
              <div style="font-size:0.58rem;color:${C.muted}">/ 100</div>
            </div>
            <div>
              <div style="font-size:0.58rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-bottom:7px">Key Measurements</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
                ${[
                  {label:"CVA (FHP ★)",val:m.cvaAngle!=null?m.cvaAngle.toFixed(1)+"°":"—",norm:">55°",bad:m.cvaAngle!=null&&m.cvaAngle<49,warn:m.cvaAngle!=null&&m.cvaAngle<55},
                  {label:"Thoracic Kyphosis (Trunk Lean Est.)",val:m.thoracicAngle!=null?m.thoracicAngle.toFixed(1)+"°":"—",norm:"20–45°",bad:m.thoracicAngle!=null&&m.thoracicAngle>55,warn:m.thoracicAngle!=null&&m.thoracicAngle>45},
                  {label:"Cervical Load",val:m.cervicalLoadKg!=null?m.cervicalLoadKg.toFixed(1)+"kg":"—",norm:"4.5kg",bad:m.cervicalLoadKg!=null&&m.cervicalLoadKg>18,warn:m.cervicalLoadKg!=null&&m.cervicalLoadKg>12},
                  {label:"LCS Index",val:m.lcsIndex!=null?m.lcsIndex.toFixed(1):"—",norm:"<0.5",bad:m.lcsIndex!=null&&m.lcsIndex>1,warn:m.lcsIndex!=null&&m.lcsIndex>0.5},
                ].map(r=>`<div style="padding:5px 8px;border-radius:6px;background:${r.bad?"#fef2f2":r.warn?"#fffbeb":"#f0fdf4"};border:1px solid ${r.bad?C.red:r.warn?C.yellow:C.green}25;display:flex;justify-content:space-between;align-items:center"><span style="font-size:0.61rem;color:${C.muted}">${r.label}</span><div style="text-align:right"><div style="font-size:0.72rem;font-weight:800;color:${r.bad?C.red:r.warn?C.yellow:C.green}">${r.val}</div><div style="font-size:0.52rem;color:${C.muted}">nrm ${r.norm}</div></div></div>`).join("")}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">Annotated Postural Views</div>
          </div>
          ${photoGrid(d.allViewImgs, 190)}
        </div>
        ${footer(1,5,"Detailed Clinical Report")}
      </div>

      <div class="page">
        ${hdr("Screening Observations","Detailed Analysis")}
        <div style="padding:18px 32px 80px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">Postural Findings</div>
          </div>
          ${d.findings.map((f,i)=>`
            <div style="margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid ${sevCol(f.severity)}30">
              <div style="padding:9px 14px;background:${sevBg(f.severity)};display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:20px;height:20px;border-radius:50%;background:${sevCol(f.severity)};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:900;color:#fff">${i+1}</div>
                  <div>
                    <div style="font-family:Fraunces;font-size:0.82rem;font-weight:700;color:${C.primary}">${f.region}</div>
                    <div style="font-size:0.54rem;color:#64748b;font-style:italic">Observation only — clinical confirmation required</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  <span style="font-size:0.55rem;font-weight:700;color:${(f.confidence||70)>=80?"#059669":(f.confidence||70)>=60?"#d97706":"#dc2626"};padding:2px 7px;border-radius:4px;border:1px solid ${(f.confidence||70)>=80?"#6ee7b7":(f.confidence||70)>=60?"#fde68a":"#fca5a5"};background:#fff">${f.confidence||70}% conf</span>
                  <span style="font-size:0.57rem;font-weight:700;color:${sevCol(f.severity)};padding:2px 8px;border-radius:4px;border:1px solid ${sevCol(f.severity)}40;background:#fff">${(f.severity||"").toUpperCase()}</span>
                </div>
              </div>
              <div style="padding:11px 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
                <div>
                  <div style="font-size:0.57rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};margin-bottom:4px">Finding</div>
                  <div style="font-size:0.67rem;color:${C.primary};line-height:1.5">${f.text}</div>
                  <div style="display:flex;gap:8px;margin-top:6px">
                    <div style="font-size:0.59rem;color:${C.muted}">Measured: <strong style="color:${sevCol(f.severity)}">${f.measured}</strong></div>
                    <div style="font-size:0.59rem;color:${C.muted}">Normal: <strong style="color:${C.green}">${f.norm}</strong></div>
                  </div>
                </div>
                <div>
                  <div style="font-size:0.57rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};margin-bottom:4px">Plain English</div>
                  <div style="font-size:0.63rem;color:${C.primary};line-height:1.5">${f.plain||f.text}</div>
                </div>
                <div>
                  <div style="font-size:0.57rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${C.muted};margin-bottom:4px">Correction</div>
                  <div style="font-size:0.61rem;color:${C.primary};line-height:1.6">${f.correction}</div>
                </div>
              </div>
            </div>`).join("")}
          <div style="display:flex;align-items:center;gap:8px;margin:14px 0 10px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.red}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.red}">Red Flag Screener</div>
          </div>
          <div style="padding:12px;border-radius:10px;background:#f0fdf4;border:1px solid ${C.green}30">
            <div style="font-size:0.72rem;font-weight:700;color:${C.green}">✓ No Red Flags Identified</div>
            <div style="font-size:0.6rem;color:${C.muted};margin-top:4px;line-height:1.5">Screened for: trauma history · neurological symptoms · unexplained weight loss · night pain · bilateral symptoms · bowel/bladder dysfunction</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin:14px 0 10px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.yellow}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.yellow}">Differentials to Consider</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${[{c:"Disc herniation / radiculopathy",w:"If trunk shift >5cm + arm/leg pain"},{c:"Thoracic outlet syndrome",w:"If neck lateral inclination + arm paraesthesia"},{c:"Structural scoliosis",w:"If waist asymmetry + rib hump on Adam's test"},{c:"Hip flexor contracture",w:"If LCS pattern + positive Thomas test"}].map(x=>`
              <div style="padding:8px 10px;border-radius:6px;background:#fffbeb;border:1px solid #fde68a">
                <div style="font-size:0.63rem;font-weight:700;color:${C.yellow}">${x.c}</div>
                <div style="font-size:0.57rem;color:${C.muted};margin-top:2px">${x.w}</div>
              </div>`).join("")}
          </div>
        </div>
        ${footer(2,5,"Detailed Clinical Report")}
      </div>

      <div class="page">
        ${hdr("Muscle Imbalance & Metrics","Janda Neuromuscular Assessment")}
        <div style="padding:18px 32px 80px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">Muscle Imbalance — Janda Approach</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
            <div style="border-radius:10px;overflow:hidden;border:1px solid #fca5a530">
              <div style="padding:9px 14px;background:#fef2f2;display:flex;align-items:center;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:${C.red}"></div>
                <div style="font-size:0.63rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${C.red}">Tight / Overactive — Inhibit First</div>
              </div>
              ${d.muscles.tight.map((mu,i)=>`<div style="padding:7px 14px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;background:${i%2===0?"#fff":C.surface}"><div><div style="font-size:0.68rem;font-weight:600;color:${C.primary}">${mu.name}</div><div style="font-size:0.56rem;color:${C.muted}">${mu.source}</div></div><span style="font-size:0.56rem;font-weight:700;color:${C.red};padding:1px 6px;border-radius:4px;background:#fef2f2;border:1px solid #fca5a530">${mu.severity}</span></div>`).join("")||`<div style="padding:10px 14px;font-size:0.65rem;color:${C.muted}">None identified</div>`}
            </div>
            <div style="border-radius:10px;overflow:hidden;border:1px solid #93c5fd30">
              <div style="padding:9px 14px;background:#eff6ff;display:flex;align-items:center;gap:6px">
                <div style="width:8px;height:8px;border-radius:50%;background:#2563eb"></div>
                <div style="font-size:0.63rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#2563eb">Weak / Underactive — Activate After</div>
              </div>
              ${d.muscles.weak.map((mu,i)=>`<div style="padding:7px 14px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;background:${i%2===0?"#fff":C.surface}"><div><div style="font-size:0.68rem;font-weight:600;color:${C.primary}">${mu.name}</div><div style="font-size:0.56rem;color:${C.muted}">${mu.source}</div></div><span style="font-size:0.56rem;font-weight:700;color:#2563eb;padding:1px 6px;border-radius:4px;background:#eff6ff;border:1px solid #93c5fd30">${mu.severity}</span></div>`).join("")||`<div style="padding:10px 14px;font-size:0.65rem;color:${C.muted}">None identified</div>`}
            </div>
          </div>
          <div style="padding:10px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd;margin-bottom:16px;font-size:0.61rem;color:#0369a1;line-height:1.6">
            <strong>Sequencing (Janda Approach):</strong> Always inhibit overactive muscles before activating underactive ones. Activating a weak muscle while its antagonist is tight causes substitution and reinforces the dysfunction.
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">Full Measurement Table</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div>
              <div style="font-size:0.59rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.muted};margin-bottom:7px">Sagittal Plane</div>
              ${metRow("CVA Angle ★",m.cvaAngle!=null?m.cvaAngle.toFixed(1)+"°":"—",">55°",m.cvaAngle!=null&&m.cvaAngle<49,m.cvaAngle!=null&&m.cvaAngle<55)}
              ${metRow("Cervical Load (estimated cervical load proxy)",m.cervicalLoadKg!=null?m.cervicalLoadKg.toFixed(1)+"kg":"—","4.5kg",m.cervicalLoadKg!=null&&m.cervicalLoadKg>18,m.cervicalLoadKg!=null&&m.cervicalLoadKg>12)}
              ${metRow("Thoracic Kyphosis (Trunk Lean Est.)",m.thoracicAngle!=null?m.thoracicAngle.toFixed(1)+"°":"—","20–45°",m.thoracicAngle!=null&&m.thoracicAngle>55,m.thoracicAngle!=null&&m.thoracicAngle>45)}
              ${metRow("Lumbar Lordosis (proxy)",m.lumbarProxy!=null?(m.lumbarProxy>0?"↑":"↓")+Math.abs(m.lumbarProxy).toFixed(1)+"%":"—","<5%",Math.abs(m.lumbarProxy||0)>10,Math.abs(m.lumbarProxy||0)>5)}
              ${metRow("LCS Index",m.lcsIndex!=null?m.lcsIndex.toFixed(1):"—","<0.5",m.lcsIndex!=null&&m.lcsIndex>1,m.lcsIndex!=null&&m.lcsIndex>0.5)}
            </div>
            <div>
              <div style="font-size:0.59rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.muted};margin-bottom:7px">Frontal Plane</div>
              ${metRow("Shoulder Tilt",m.shoulderAngle!=null?Math.abs(m.shoulderAngle).toFixed(1)+"°":"—","<3°",Math.abs(m.shoulderAngle||0)>7,Math.abs(m.shoulderAngle||0)>3)}
              ${metRow("Pelvic Obliquity",m.pelvisAngle!=null?Math.abs(m.pelvisAngle).toFixed(1)+"°":"—","<3°",Math.abs(m.pelvisAngle||0)>7,Math.abs(m.pelvisAngle||0)>3)}
              ${metRow("Trunk Shift",m.trunkShiftCm!=null?m.trunkShiftCm.toFixed(1)+"cm":"—","<2cm",m.trunkShiftCm!=null&&m.trunkShiftCm>5,m.trunkShiftCm!=null&&m.trunkShiftCm>2)}
              ${metRow("Reliability",m.reliability+"%",">80%",m.reliability<60,m.reliability<80)}
              <div style="margin-top:10px;padding:8px;border-radius:6px;background:${C.surface};border:1px solid ${C.border};font-size:0.56rem;color:${C.muted};line-height:1.5">
                ★ CVA is primary FHP marker. All measurements ±5–8° accuracy. Age-adjusted norms apply.
              </div>
            </div>
          </div>
        </div>
        ${footer(3,5,"Detailed Clinical Report")}
      </div>

      <div class="page">
        ${hdr("Exercise Programme","Inhibit → Activate → Correct (Janda Approach)")}
        <div style="padding:18px 32px 80px">
          <div style="padding:10px;border-radius:8px;background:#f0f9ff;border:1px solid #bae6fd;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-family:Fraunces;font-size:0.83rem;font-weight:700;color:#0369a1">Personalised Programme · ${d.exercises.length} exercises</div><div style="font-size:0.6rem;color:#0369a1;margin-top:1px">Daily · 10–15 min · Reassess in 4–6 weeks</div></div>
            <div style="font-size:0.6rem;color:#0369a1;text-align:right">Based on ${d.findings.length} findings<br/>Reliability ${m.reliability}%</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:0.63rem">
            <thead><tr style="background:${C.primary}">
              ${["#","Phase","Exercise","Dosage","Frequency","Technique Cue"].map(h=>`<th style="padding:7px 10px;text-align:left;font-size:0.57rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,.65)">${h}</th>`).join("")}
            </tr></thead>
            <tbody>
              ${d.exercises.map((ex,i)=>{
                const meta={1:{col:C.red,bg:"#fef2f2",label:"INHIBIT"},2:{col:"#2563eb",bg:"#eff6ff",label:"ACTIVATE"},3:{col:C.green,bg:"#f0fdf4",label:"CORRECT"}}[ex.phase]||{col:C.muted,bg:C.surface,label:"CORRECT"};
                return `<tr style="background:${i%2===0?"#fff":C.surface};border-bottom:1px solid ${C.border}">
                  <td style="padding:7px 10px;font-weight:700;color:${C.muted}">${i+1}</td>
                  <td style="padding:7px 10px"><span style="font-size:0.56rem;font-weight:700;color:${meta.col};padding:2px 6px;border-radius:4px;background:${meta.bg};border:1px solid ${meta.col}25">${meta.label}</span></td>
                  <td style="padding:7px 10px;font-weight:700;color:${C.primary}">${ex.name}</td>
                  <td style="padding:7px 10px;color:${meta.col};font-weight:700;white-space:nowrap">${ex.sets}</td>
                  <td style="padding:7px 10px;color:${C.muted};white-space:nowrap">${ex.freq}</td>
                  <td style="padding:7px 10px;color:${C.muted};line-height:1.5">${ex.cue}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
          <div style="margin-top:14px;padding:10px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;font-size:0.59rem;color:${C.yellow};line-height:1.6">
            <strong>Contraindication note:</strong> Foam roller extension contraindicated in osteoporosis, acute spinal fracture, or recent spinal surgery. Thomas stretch contraindicated post hip replacement. Screen before prescribing.
          </div>
        </div>
        ${footer(4,5,"Detailed Clinical Report")}
      </div>

      <div class="page">
        ${hdr("Clinical Notes & Sign-off","SOAP Documentation")}
        <div style="padding:18px 32px 80px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.accent}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.accent}">SOAP Note</div>
          </div>
          ${[{k:"S",label:"Subjective",col:"#7c3aed",text:d.soap.subjective},{k:"O",label:"Objective",col:C.accent,text:d.soap.objective},{k:"A",label:"Assessment",col:C.yellow,text:d.soap.assessment},{k:"P",label:"Plan",col:C.green,text:d.soap.plan}].map(s=>`
            <div style="margin-bottom:10px;border-radius:10px;overflow:hidden;border:1px solid ${s.col}25">
              <div style="padding:8px 14px;background:${s.col}12;display:flex;align-items:center;gap:8px">
                <div style="width:22px;height:22px;border-radius:6px;background:${s.col};display:flex;align-items:center;justify-content:center;font-family:Fraunces;font-size:0.82rem;font-weight:900;color:#fff">${s.k}</div>
                <div style="font-family:Fraunces;font-size:0.78rem;font-weight:700;color:${s.col}">${s.label}</div>
              </div>
              <div style="padding:9px 14px">
                <div style="font-size:0.67rem;color:${C.primary};line-height:1.7">${s.text}</div>
                <div style="margin-top:8px;border-bottom:1px dashed ${C.border};padding-bottom:3px"></div>
                <div style="font-size:0.56rem;color:${C.muted};margin-top:3px">Clinician notes:</div>
              </div>
            </div>`).join("")}
          <div style="display:flex;align-items:center;gap:8px;margin:12px 0 10px">
            <div style="width:3px;height:14px;border-radius:2px;background:${C.red}"></div>
            <div style="font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${C.red}">Referral Decision</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
            ${["No referral required","Refer to Orthopaedics","Refer to Neurology","Refer to GP"].map((r,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;border:1px solid ${C.border};background:${C.surface}"><div style="width:13px;height:13px;border:2px solid ${C.border};border-radius:3px;background:${i===0?C.green:"#fff"};flex-shrink:0"></div><span style="font-size:0.67rem;color:${C.primary}">${r}</span></div>`).join("")}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="padding:12px;border-radius:8px;background:${C.surface};border:1px solid ${C.border}">
              <div style="font-size:0.58rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-bottom:18px">Clinician Signature</div>
              <div style="border-bottom:1px solid ${C.primary};margin-bottom:5px"></div>
              <div style="font-size:0.59rem;color:${C.muted}">${d.clinician.name} · ${d.clinician.credentials}</div>
              <div style="font-size:0.58rem;color:${C.muted};margin-top:2px">Date: ${d.clinician.date}</div>
            </div>
            <div style="padding:12px;border-radius:8px;background:${C.surface};border:1px solid ${C.border}">
              <div style="font-size:0.58rem;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-bottom:18px">Patient Acknowledgement</div>
              <div style="border-bottom:1px solid ${C.primary};margin-bottom:5px"></div>
              <div style="font-size:0.59rem;color:${C.muted}">${d.patient.name} · Date: ___________</div>
              <div style="font-size:0.56rem;color:${C.muted};margin-top:6px;line-height:1.5">I confirm I have received and understood this report and exercise programme.</div>
            </div>
          </div>
          <div style="margin-top:14px;padding:10px;border-radius:8px;background:linear-gradient(135deg,#f8fafc,#f0f9ff);border:1px solid #bae6fd;display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:0.58rem;color:${C.muted}">Generated by <strong>PhysioMind Pro</strong> · Detailed Report · ID: ${Date.now().toString(36).toUpperCase()}</div>
          </div>
        </div>
        ${footer(5,5,"Detailed Clinical Report")}
      </div>`;
  }

  // ── Report modal ─────────────────────────────────────────────────────────────
  const reportModal = showReportModal && createPortal(
    <div onClick={()=>setShowReportModal(false)}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:99998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:"100%",maxWidth:440,background:PC.surface,borderRadius:16,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{fontWeight:900,fontSize:"1rem",color:PC.text,marginBottom:4}}>📄 Generate Report</div>
        <div style={{fontSize:"0.78rem",color:PC.muted,marginBottom:18}}>Fill in patient details then choose report type</div>

        {/* Report type toggle */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          {[{id:"basic",label:"Basic Report",credits:2,pages:"2 pages",sub:"Patient-facing · Plain English"},
            {id:"detailed",label:"Detailed Report",credits:5,pages:"5 pages",sub:"Clinical · SOAP · Full metrics"}].map(t=>(
            <button key={t.id} onClick={()=>setReportType(t.id)} style={{
              padding:12,borderRadius:10,border:`2px solid ${reportType===t.id?PC.accent:PC.border}`,
              background:reportType===t.id?`${PC.accent}10`:PC.surface,cursor:"pointer",textAlign:"left"}}>
              <div style={{fontSize:"0.75rem",fontWeight:800,color:reportType===t.id?PC.accent:PC.text}}>{t.label}</div>
              <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:2}}>{t.sub}</div>
              <div style={{marginTop:6,padding:"2px 8px",borderRadius:5,display:"inline-block",
                background:reportType===t.id?PC.accent:`${PC.accent}15`,
                color:reportType===t.id?"#fff":PC.accent,
                fontSize:"0.82rem",fontWeight:700}}>{t.pages}</div>
            </button>
          ))}
        </div>

        {/* Patient info */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Patient Information</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{key:"name",label:"Full Name",placeholder:"e.g. Priya Sharma",full:true},
              {key:"age",label:"Age",placeholder:"e.g. 28"},
              {key:"sex",label:"Sex",placeholder:"Female / Male"},
              {key:"occupation",label:"Occupation",placeholder:"e.g. Software Engineer",full:true}].map(f=>(
              <div key={f.key} style={{gridColumn:f.full?"1/-1":"auto"}}>
                <div style={{fontSize:"0.8rem",color:PC.muted,marginBottom:3}}>{f.label}</div>
                <input value={patientInfo[f.key]||""} placeholder={f.placeholder}
                  onChange={e=>setPatientInfo(p=>({...p,[f.key]:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",border:`1px solid ${PC.border}`,borderRadius:7,
                    fontSize:"0.82rem",color:PC.text,background:PC.bg,outline:"none"}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Clinician info */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Clinician</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{key:"name",label:"Your Name",placeholder:"Dr. A. Mehta"},
              {key:"credentials",label:"Credentials",placeholder:"MPT, MIAP"},
              {key:"clinic",label:"Clinic Name",placeholder:"BalancePoint Physio",full:true}].map(f=>(
              <div key={f.key} style={{gridColumn:f.full?"1/-1":"auto"}}>
                <div style={{fontSize:"0.8rem",color:PC.muted,marginBottom:3}}>{f.label}</div>
                <input value={clinicianInfo[f.key]||""} placeholder={f.placeholder}
                  onChange={e=>setClinicianInfo(p=>({...p,[f.key]:e.target.value}))}
                  style={{width:"100%",padding:"7px 10px",border:`1px solid ${PC.border}`,borderRadius:7,
                    fontSize:"0.82rem",color:PC.text,background:PC.bg,outline:"none"}}/>
              </div>
            ))}
          </div>
        </div>

        {/* Credits note */}
        <div style={{padding:"8px 12px",borderRadius:8,background:`${PC.accent}08`,
          border:`1px solid ${PC.accent}25`,marginBottom:16,fontSize:"0.82rem",color:PC.accent}}>
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setShowReportModal(false)}
            style={{flex:1,padding:"11px",border:`1px solid ${PC.border}`,borderRadius:10,
              background:"none",color:PC.muted,fontSize:"0.75rem",cursor:"pointer"}}>Cancel</button>
          <button onClick={generateReport} disabled={!(assessMode==="multi"?mvComposite:findings.length&&scoreData)}
            style={{flex:2,padding:"11px",border:"none",borderRadius:10,
              background:findings.length&&scoreData?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#ccc",
              color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:findings.length&&scoreData?"pointer":"not-allowed"}}>
            Generate & Open PDF →
          </button>
        </div>
        {!(assessMode==="multi"?mvComposite:findings.length)&&<div style={{fontSize:"0.82rem",color:PC.red,textAlign:"center",marginTop:8}}>{assessMode==="multi"?"Capture ≥2 views and generate composite first":"Analyse a photo first to generate a report"}</div>}
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
            <div style={{fontSize:isWide?"0.68rem":"0.6rem",color:PC.muted,marginTop:1}}>Posture screening &amp; education · not a medical diagnosis</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div onClick={mpStatus==="error"?loadMediaPipe:undefined}
            title={mpStatus==="error"?"Tap to retry loading the AI model":undefined}
            style={{padding:isWide?"5px 12px":"3px 9px",borderRadius:20,fontSize:isWide?"0.65rem":"0.58rem",fontWeight:700,
            cursor:mpStatus==="error"?"pointer":"default",userSelect:"none",
            background:mpStatus==="ready"?"rgba(5,150,105,0.12)":mpStatus==="loading"?"rgba(180,83,9,0.12)":"rgba(220,38,38,0.12)",
            color:mpStatus==="ready"?PC.green:mpStatus==="loading"?PC.yellow:PC.red,
            border:`1px solid ${mpStatus==="ready"?PC.green:mpStatus==="loading"?PC.yellow:PC.red}40`}}>
            {mpStatus==="ready"?"⚙ AI Ready":mpStatus==="loading"?"⏳ AI Loading…":"❌ AI Error — tap to retry"}
          </div>
          <button onClick={()=>setShowReportModal(true)}
            style={{padding:isWide?"6px 14px":"4px 9px",
              background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,
              border:"none",borderRadius:9,color:"#fff",
              fontSize:isWide?"0.72rem":"0.62rem",fontWeight:700,cursor:"pointer",
              opacity:(assessMode==="multi"?!!mvComposite:!!(findings.length&&scoreData))?1:0.5}}>
            📄 PDF Report
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
                  fontSize:"0.82rem",fontWeight:800}}>
                  {scoreData?.score??findings.length}
                </span>
              )}
            </button>
          </div>

          {/* Panel content — both kept mounted (toggled via display) rather than
              conditionally unmounted, so switching tabs never wipes HybridKendall's
              in-progress landmark placement/confirmation state on the Camera panel. */}
          <div style={{flex:1,overflowY:"auto"}}>
            <div style={{display: mobilePanel==="camera" ? "block" : "none"}}>{leftPanel}</div>
            <div style={{display: mobilePanel==="results" ? "block" : "none"}}>{mvReportPanel || tabContent}</div>
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
          <div id="postureai-report-printable" style={{flex:1,overflowY:"auto",padding:"24px 16px"}}>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
              #postureai-report-printable .page{width:794px;min-height:1123px;background:#fff;margin:0 auto 24px;border-radius:4px;box-shadow:0 4px 32px rgba(0,0,0,.18);position:relative;overflow:hidden;font-family:'DM Sans',sans-serif;color:#1a1025;}
              #postureai-report-printable table{border-collapse:collapse;width:100%;}
              #postureai-report-printable th,#postureai-report-printable td{text-align:left;}
              @media print{
                body>*:not(#postureai-print-portal){display:none!important;}
                #postureai-print-portal{display:block!important;}
                .no-print-report{display:none!important;}
                #postureai-report-printable{padding:0!important;overflow:visible!important;}
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
                <div style={{fontSize:"0.75rem",color:PC.muted,marginTop:2}}>{new Date(s.time).toLocaleString()} · {s.findings} findings</div>
              </div>
            ))}
            <button onClick={()=>setShowHistory(false)} style={{marginTop:14,width:"100%",padding:"13px",background:`${PC.accent}15`,border:`1px solid ${PC.accent}30`,borderRadius:10,color:PC.accent,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Confidence boost by priority level
const LANDMARK_CONF_BOOST = { 1: 20, 2: 12, 3: 8 };

// ─── useVerifiedLandmarks hook ────────────────────────────────────────────────
function useVerifiedLandmarks() {
  const [verified, setVerifiedState] = useState({});

  const setVerified = useCallback((key, x, y) => {
    setVerifiedState(prev => ({ ...prev, [key]: { x, y, confidence: 1.0 } }));
  }, []);

  const clearVerified = useCallback((key) => {
    setVerifiedState(prev => { const n={...prev}; delete n[key]; return n; });
  }, []);

  const mergeWithMediaPipe = useCallback((mpLandmarks) => {
    if (!mpLandmarks) return mpLandmarks;
    const merged = mpLandmarks.map(l => ({...l}));
    Object.entries(verified).forEach(([key, coords]) => {
      const def = VERIFIED_LANDMARK_MAP[key];
      if (def && def.mpIdx !== null && merged[def.mpIdx]) {
        merged[def.mpIdx] = { ...merged[def.mpIdx], x: coords.x, y: coords.y, visibility: 1.0, _verified: true };
      }
    });
    return merged;
  }, [verified]);

  const boostFindingConfidence = useCallback((findings) => {
    if (!findings || Object.keys(verified).length === 0) return findings;
    return findings.map(f => {
      let boost = 0;
      Object.entries(verified).forEach(([key]) => {
        const def = VERIFIED_LANDMARK_MAP[key];
        if (!def) return;
        const metric = f.metric || f.key || "";
        const findingText = (f.text || f.findingName || "").toLowerCase();
        const affects = def.affects || [];
        const relevant = affects.some(a =>
          metric.includes(a) ||
          findingText.includes(a.replace(/([A-Z])/g, ' $1').toLowerCase().trim())
        );
        if (relevant) boost = Math.max(boost, LANDMARK_CONF_BOOST[def.priority] || 0);
      });
      if (boost === 0) return f;
      const origConf = f.confidenceScore || f.confidence || 70;
      const newConf = Math.min(98, origConf + boost);
      return { ...f, confidenceScore: newConf, confidence: newConf, _origConf: origConf, _boosted: true };
    });
  }, [verified]);

  return { verified, setVerified, clearVerified, mergeWithMediaPipe, boostFindingConfidence };
}

export { PostureAnalysisModule, PC, vec3Angle, dist2D, classifySeverity, POSTURE_THRESHOLDS,
  getLandmarkConfidence, checkLandmarkReliability, checkAnatomicalOrder };

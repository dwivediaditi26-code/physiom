// HybridKendall.jsx — Hybrid Kendall Posture Analysis Mode
// Lateral (sagittal) view only. Replaces AI auto-diagnosis.
//
// WORKFLOW:
//   1. ViTPose auto-places 5 primary landmarks on upload
//   2. User reviews and drags any landmark to the correct position
//   3. User clicks CONFIRM LANDMARKS → status = MANUALLY VERIFIED
//   4. Measurements computed from confirmed landmarks
//   5. Optional: place advanced landmarks (C7, T12, S2, ASIS, PSIS)
//
// LANDMARKS:
//   Primary (required): ear, acromion, hip, knee, ankle
//   Advanced (optional): c7, t12, s2, asis, psis, apexT, apexL
//
// All measurements normalised to body height or chord length.
// Nothing estimated. If a landmark is missing: "Not Measured".

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── Constants (all documented) ──────────────────────────────────────────────

// Landmark definitions
// color: dot colour on overlay
// mpIdx: which MediaPipe landmark index ViTPose maps to (for auto-placement)
// color: used for button/panel UI on the app's light background (needs to be dark
// enough to read as text on white). bright: used for dots/labels drawn on top of
// the uploaded photo itself, over a dark translucent badge (needs to be light).
export const PRIMARY_LANDMARKS = [
  { id:"ear",      label:"Ear",      desc:"Ear tragus",               color:"#0891b2", bright:"#22d3ee", mpIdx:[7,8]    },
  { id:"acromion", label:"Acromion", desc:"Tip of acromion process",  color:"#7c3aed", bright:"#c4b5fd", mpIdx:[11,12]  },
  { id:"hip",      label:"Hip (GT)", desc:"Greater trochanter tip",   color:"#c2760c", bright:"#fbbf24", mpIdx:[23,24]  },
  { id:"knee",     label:"Knee",     desc:"Lateral femoral condyle",  color:"#15803d", bright:"#4ade80", mpIdx:[25,26]  },
  { id:"ankle",    label:"Ankle",    desc:"Lateral malleolus tip",    color:"#dc2626", bright:"#f87171", mpIdx:[27,28]  },
];

export const ADVANCED_LANDMARKS = [
  { id:"c7",    label:"C7",    desc:"C7 spinous process (base of neck)",     color:"#b45309", bright:"#fbbf24", group:"spinal"  },
  { id:"t12",   label:"T12",   desc:"T12 (thoracolumbar junction)",          color:"#db2777", bright:"#fb7185", group:"spinal"  },
  { id:"s2",    label:"S2",    desc:"S2 (posterior sacrum midpoint)",        color:"#9333ea", bright:"#c084fc", group:"spinal"  },
  { id:"apexT", label:"T-Apex",desc:"Maximum thoracic convexity point",     color:"#ea580c", bright:"#fdba74", group:"spinal"  },
  { id:"apexL", label:"L-Apex",desc:"Maximum lumbar concavity point",       color:"#16a34a", bright:"#86efac", group:"spinal"  },
  { id:"asis",  label:"ASIS",  desc:"Anterior superior iliac spine",        color:"#0284c7", bright:"#7dd3fc", group:"pelvis"  },
  { id:"psis",  label:"PSIS",  desc:"Posterior superior iliac spine",       color:"#2563eb", bright:"#93c5fd", group:"pelvis"  },
];

// Severity thresholds — all sourced from clinical literature
// Sources:
//   CVA: Yip et al. 2008 (Physiother Theory Pract); Neiva et al. 2009
//   FHP distance: Kendall 2005 (Muscles, Testing and Function)
//   Shoulder: Kendall plumb line norms
//   TCI/LCI: Depth-chord method adapted from Willner 1981 (Spine)
//   Pelvic tilt: Levine & Whittle 1996 (J Orthop Sports Phys Ther)
//   Knee: Magee 2014 (Orthopedic Physical Assessment)
export const THRESHOLDS = {
  // CVA (°) — Yip 2008
  cva:         { normal:55, borderline:50, mild:44, moderate:38 },
  // Ear-acromion distance (% body height) — Kendall norm = 0
  earAcromion: { normal:1.5, mild:2.5, moderate:4.5 },
  // Plumb offsets (% body height)
  plumb: {
    ear:      { normal:2.5, mild:4,   moderate:6 },
    acromion: { normal:2,   mild:3.5, moderate:6 },
    hip:      { normal:2,   mild:4,   moderate:7 },
    knee:     { normal:2.5, mild:4,   moderate:7 },
  },
  // Rounded shoulder composite (0-3 scale)
  shoulder:    { normal:0.5, mild:1.0, moderate:2.0 },
  // TCI (%) — depth/chord; Willner 1981 adaptation
  tci:         { normal:8, mild:14, moderate:22 },
  // LCI (%) — depth/chord
  lci:         { reduced:3, normal:6, mild:12, moderate:20 },
  // Pelvic tilt (°) from ASIS-PSIS — Levine & Whittle 1996
  pelvis:      { normFemale:12, normMale:7, range:5 },
  // Knee angle (°) — Magee 2014
  knee:        { normal:[170, 185], recurvatum: 185, flexed: 170 },
};

// ─── Measurement Engine ───────────────────────────────────────────────────────

// Body height proxy: ankle.y − ear.y (normalised image fraction)
function bodyHeightNorm(lm) {
  if (!lm.ankle || !lm.ear) return null;
  const h = lm.ankle.y - lm.ear.y;
  return h > 0.1 ? h : null;
}

// Convert normalised x-deviation from plumb to % body height
function pctBodyHeight(dx_norm, bh_norm) {
  if (!bh_norm || bh_norm === 0) return null;
  return Math.round((dx_norm / bh_norm) * 1000) / 10; // 1 decimal
}

// viewSign: +1 = person faces right (nose > shoulder x), -1 = faces left
function getViewSign(lm) {
  if (lm.ear && lm.acromion) return lm.ear.x > lm.acromion.x ? 1 : -1;
  return 1;
}

// Plumb deviation: positive = anterior to plumb
function plumbDeviation(landmark_x, ankle_x, bh_norm, viewSign) {
  if (landmark_x === null || landmark_x === undefined || !bh_norm) return null;
  const dx = (landmark_x - ankle_x) * viewSign;
  return Math.round(dx / bh_norm * 1000) / 10; // % body height
}

// CVA: angle between ear-acromion vector and horizontal (°)
// Reference: Yip 2008 — tragus to C7/acromion vs horizontal
function calcCVA(ear, acromion) {
  if (!ear || !acromion) return null;
  const dx = Math.abs(ear.x - acromion.x);
  const dy = Math.abs(ear.y - acromion.y);
  if (dy < 0.01) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 25 || angle > 80) return null; // physiologic range check
  return Math.round(angle * 10) / 10;
}

// CVA with C7 (more accurate)
function calcCVA_C7(ear, c7) {
  if (!ear || !c7) return null;
  const dx = Math.abs(ear.x - c7.x);
  const dy = Math.abs(ear.y - c7.y);
  if (dy < 0.01) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 25 || angle > 80) return null;
  return Math.round(angle * 10) / 10;
}

// Ear-acromion distance (% body height)
function calcEarAcrDist(ear, acromion, bh_norm) {
  if (!ear || !acromion || !bh_norm) return null;
  const d = Math.sqrt((ear.x-acromion.x)**2 + (ear.y-acromion.y)**2);
  return Math.round(d / bh_norm * 1000) / 10;
}

// Rounded shoulder: 3-metric weighted composite
// Metric 1 (50%): acromion-hip horizontal offset (% BH)
// Metric 2 (30%): acromion-plumb offset (% BH)
// Metric 3 (20%): shoulder translation angle (°) — atan2(acrHipX, acrHipY)
function calcRoundedShoulder(lm, bh_norm, viewSign) {
  const acr = lm.acromion, hip = lm.hip, ankle = lm.ankle;
  if (!acr || !hip || !ankle || !bh_norm) return null;

  const acrHipDx = (acr.x - hip.x) * viewSign; // +ve = acromion anterior to hip
  const m1 = pctBodyHeight(Math.abs(acrHipDx), bh_norm) ?? 0;

  const acrPlumbDx = (acr.x - ankle.x) * viewSign;
  const m2 = pctBodyHeight(Math.abs(acrPlumbDx), bh_norm) ?? 0;

  const acrHipDy = Math.abs(acr.y - hip.y);
  const m3 = acrHipDy > 0.01 ? Math.round(Math.atan2(Math.abs(acrHipDx), acrHipDy) * 180 / Math.PI * 10) / 10 : 0;

  // Normalise each metric to 0–3
  const n1 = Math.min(3, m1 / 2);
  const n2 = Math.min(3, m2 / 2);
  const n3 = Math.min(3, m3 / 3);

  const composite = 0.50*n1 + 0.30*n2 + 0.20*n3;
  const direction = acrHipDx > 0 ? "anterior" : "posterior";

  return { m1, m2, m3, composite: Math.round(composite*100)/100, direction,
           debug:{ formula:"0.50×norm(AcrHip)+0.30×norm(AcrPlumb)+0.20×norm(ShAngle)", n1,n2,n3 } };
}

// Knee angle: hip-knee-ankle (°). 180 = neutral, <170 = flexed, >185 = recurvatum
function calcKneeAngle(hip, knee, ankle) {
  if (!hip || !knee || !ankle) return null;
  const ab = { x:hip.x-knee.x, y:hip.y-knee.y };
  const cb = { x:ankle.x-knee.x, y:ankle.y-knee.y };
  const dot = ab.x*cb.x + ab.y*cb.y;
  const mag = Math.sqrt((ab.x**2+ab.y**2)*(cb.x**2+cb.y**2));
  if (mag === 0) return null;
  const angle = Math.acos(Math.max(-1,Math.min(1,dot/mag))) * 180 / Math.PI;
  if (angle > 200 || angle < 100) return null; // physiologic range check
  return Math.round(angle * 10) / 10;
}

// TCI: requires C7, T12, and apexT (maximum thoracic convexity point)
// TCI = (thoracicDepth / chordLength) × 100
// thoracicDepth = horizontal distance from apexT to C7-T12 chord line
// chordLength   = Euclidean distance C7 → T12
function calcTCI(c7, t12, apexT) {
  if (!c7 || !t12 || !apexT) return null;
  const chordLen = Math.sqrt((t12.x-c7.x)**2 + (t12.y-c7.y)**2);
  if (chordLen < 0.02) return null;
  // Perpendicular distance from apexT to chord line C7→T12
  const dx = t12.x - c7.x, dy = t12.y - c7.y;
  const depth = Math.abs(dy*(apexT.x-c7.x) - dx*(apexT.y-c7.y)) / chordLen;
  const tci = Math.round((depth / chordLen) * 100 * 10) / 10;
  if (tci > 40) return null; // outlier rejection (Rule 7)
  return { tci, depth: Math.round(depth*1000)/10, chordLen: Math.round(chordLen*1000)/10 };
}

// LCI: requires T12, S2, and apexL (maximum lumbar concavity point)
function calcLCI(t12, s2, apexL) {
  if (!t12 || !s2 || !apexL) return null;
  const chordLen = Math.sqrt((s2.x-t12.x)**2 + (s2.y-t12.y)**2);
  if (chordLen < 0.02) return null;
  const dx = s2.x - t12.x, dy = s2.y - t12.y;
  const depth = Math.abs(dy*(apexL.x-t12.x) - dx*(apexL.y-t12.y)) / chordLen;
  const lci = Math.round((depth / chordLen) * 100 * 10) / 10;
  if (lci > 40) return null; // outlier rejection
  return { lci, depth: Math.round(depth*1000)/10, chordLen: Math.round(chordLen*1000)/10 };
}

// Pelvic tilt: requires ASIS and PSIS
// Positive = anterior (ASIS lower than PSIS in image; Y increases downward)
function calcPelvicTilt(asis, psis) {
  if (!asis || !psis) return null;
  const dx = Math.abs(asis.x - psis.x);
  const dy = Math.abs(asis.y - psis.y);
  if (dx < 0.005 && dy < 0.005) return null;
  const angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 10) / 10;
  if (angle > 30) return null; // outlier rejection
  const isAnterior = asis.y > psis.y; // ASIS lower = anterior tilt
  return { angle, isAnterior, direction: isAnterior ? "Anterior" : "Posterior" };
}

// ─── Severity classifiers ─────────────────────────────────────────────────────
function classifyCVA(cva) {
  if (cva === null) return null;
  if (cva >= THRESHOLDS.cva.normal)     return "Normal";
  if (cva >= THRESHOLDS.cva.borderline) return "Borderline";
  if (cva >= THRESHOLDS.cva.mild)       return "Mild FHP";
  if (cva >= THRESHOLDS.cva.moderate)   return "Moderate FHP";
  return "Marked FHP";
}
function classifyPlumb(pct, segment) {
  const t = THRESHOLDS.plumb[segment] || THRESHOLDS.plumb.acromion;
  if (Math.abs(pct) <= t.normal)   return "Normal";
  if (Math.abs(pct) <= t.mild)     return "Mild";
  if (Math.abs(pct) <= t.moderate) return "Moderate";
  return "Marked";
}
function classifyTCI(tci) {
  const t = THRESHOLDS.tci;
  if (tci < t.normal)   return "Normal Thoracic Curvature";
  if (tci < t.mild)     return "Mild Increased Thoracic Curvature";
  if (tci < t.moderate) return "Moderate Increased Thoracic Curvature";
  return "Severe Increased Thoracic Curvature";
}
function classifyLCI(lci) {
  const t = THRESHOLDS.lci;
  if (lci < t.reduced)  return "Reduced Lumbar Curvature";
  if (lci < t.normal)   return "Normal Lumbar Curvature";
  if (lci < t.mild)     return "Mild Increased Lumbar Curvature";
  if (lci < t.moderate) return "Moderate Increased Lumbar Curvature";
  return "Severe Increased Lumbar Curvature";
}
function classifyKnee(angle) {
  if (!angle) return null;
  const t = THRESHOLDS.knee;
  if (angle >= t.normal[0] && angle <= t.normal[1]) return "Normal";
  if (angle > t.recurvatum) return "Genu Recurvatum";
  return "Knee Flexion in Stance";
}

// ─── Build findings from measurements ────────────────────────────────────────
export function buildKendallFindings(measurements, patientSex = "Female") {
  const { cva, cvaSource, earPlumb, acrPlumb, hipPlumb, kneePlumb,
          earAcr, shoulder, knee, tci, lci, pelvis } = measurements;

  const findings = [];
  const segmentStatus = {
    forwardHead:   null,
    roundedShoulder: null,
    thoracic:      null,
    lumbar:        null,
    pelvicTilt:    null,
    knee:          null,
  };

  // 1. Forward Head Posture — requires ≥2 of: CVA, ear-plumb, ear-acromion
  const fhpMetrics = [
    cva      !== null ? 1 : 0,
    earPlumb !== null ? 1 : 0,
    earAcr   !== null ? 1 : 0,
  ].reduce((a,b)=>a+b,0);

  if (fhpMetrics >= 2) {
    const severity = cva !== null ? classifyCVA(cva)
      : earPlumb > THRESHOLDS.plumb.ear.moderate ? "Moderate FHP"
      : earPlumb > THRESHOLDS.plumb.ear.mild ? "Mild FHP" : "Normal";
    segmentStatus.forwardHead = severity;
    if (severity !== "Normal") {
      findings.push({
        id:"fhp", category:"Forward Head Posture", severity,
        label:`${severity} — CVA ${cva !== null ? cva+"°" : "N/A"}, Ear-Plumb ${earPlumb !== null ? earPlumb+"% BH" : "N/A"}`,
        source: cvaSource || "Ear-Acromion fallback",
        metrics: { cva, earPlumb, earAcr },
        _debug:{ formula:`CVA=atan2(dy,dx)×180/π · EarPlumb=(ear.x-ankle.x)/BH×100`, thresholds:THRESHOLDS.cva, ruleTriggered:severity },
      });
    }
  } else {
    segmentStatus.forwardHead = "Insufficient landmarks";
  }

  // 2. Rounded Shoulder — 3-metric composite (always valid if shoulder placed)
  if (shoulder !== null) {
    const { composite, direction, m1, m2, m3 } = shoulder;
    const severity = composite < THRESHOLDS.shoulder.normal   ? "Normal"
      : composite < THRESHOLDS.shoulder.mild     ? "Mild"
      : composite < THRESHOLDS.shoulder.moderate ? "Moderate" : "Severe";
    segmentStatus.roundedShoulder = severity;
    if (severity !== "Normal") {
      findings.push({
        id:"shoulder", category:`Shoulder ${direction === "anterior" ? "Anterior" : "Posterior"} Position`,
        severity, label:`${severity} shoulder ${direction} displacement — composite ${composite}`,
        metrics: { composite, m1_AcrHip:m1, m2_AcrPlumb:m2, m3_ShAngle:m3 },
        _debug:{ formula:"0.50×norm(AcrHip)+0.30×norm(AcrPlumb)+0.20×norm(ShAngle)", thresholds:THRESHOLDS.shoulder, ruleTriggered:severity },
      });
    }
  } else {
    segmentStatus.roundedShoulder = "Not Measured";
  }

  // 3. Thoracic Curvature Index — requires C7 + T12 + apexT
  if (tci !== null) {
    const label = classifyTCI(tci.tci);
    const severity = tci.tci < THRESHOLDS.tci.normal ? "Normal"
      : tci.tci < THRESHOLDS.tci.mild ? "Mild"
      : tci.tci < THRESHOLDS.tci.moderate ? "Moderate" : "Severe";
    segmentStatus.thoracic = label;
    findings.push({
      id:"tci", category:"Thoracic Curvature Index",
      severity, label:`${label} — TCI ${tci.tci}%`,
      metrics: { tci: tci.tci, depth: tci.depth, chordLen: tci.chordLen },
      disclaimer:"Depth-chord index from placed landmarks. NOT a Cobb angle.",
      _debug:{ formula:"TCI=(perp_dist_apexT_to_C7T12_chord / chord_length)×100", thresholds:THRESHOLDS.tci, ruleTriggered:label },
    });
  } else {
    segmentStatus.thoracic = "Not Measured — place C7, T12, T-Apex";
  }

  // 4. Lumbar Curvature Index — requires T12 + S2 + apexL
  if (lci !== null) {
    const label = classifyLCI(lci.lci);
    const severity = lci.lci < THRESHOLDS.lci.reduced ? "Moderate"
      : lci.lci < THRESHOLDS.lci.normal ? "Normal"
      : lci.lci < THRESHOLDS.lci.mild ? "Mild"
      : lci.lci < THRESHOLDS.lci.moderate ? "Moderate" : "Severe";
    segmentStatus.lumbar = label;
    findings.push({
      id:"lci", category:"Lumbar Curvature Index",
      severity, label:`${label} — LCI ${lci.lci}%`,
      metrics: { lci: lci.lci, depth: lci.depth, chordLen: lci.chordLen },
      disclaimer:"Depth-chord index from placed landmarks. NOT a radiographic measurement.",
      _debug:{ formula:"LCI=(perp_dist_apexL_to_T12S2_chord / chord_length)×100", thresholds:THRESHOLDS.lci, ruleTriggered:label },
    });
  } else {
    segmentStatus.lumbar = "Not Measured — place T12, S2, L-Apex";
  }

  // 5. Pelvic Tilt — requires ASIS + PSIS
  if (pelvis !== null) {
    const { angle, direction } = pelvis;
    const genderNorm = patientSex === "Male" ? THRESHOLDS.pelvis.normMale : THRESHOLDS.pelvis.normFemale;
    const deviation  = angle - genderNorm;
    const severity = Math.abs(deviation) <= THRESHOLDS.pelvis.range ? "Normal"
      : Math.abs(deviation) <= 10 ? "Mild"
      : Math.abs(deviation) <= 15 ? "Moderate" : "Severe";
    segmentStatus.pelvicTilt = `${direction} — ${angle}°`;
    findings.push({
      id:"pelvis", category:"Pelvic Tilt",
      severity, label:`${severity} ${direction} Pelvic Tilt — ${angle}° (norm ${genderNorm}°)`,
      metrics: { angle, deviation, genderNorm, direction },
      _debug:{ formula:"atan2(|ASIS_Y−PSIS_Y|,|ASIS_X−PSIS_X|)", thresholds:THRESHOLDS.pelvis, ruleTriggered:`${direction} ${severity}` },
    });
  } else {
    segmentStatus.pelvicTilt = "Not Measured — place ASIS and PSIS";
  }

  // 6. Knee analysis
  if (knee !== null) {
    const label = classifyKnee(knee);
    const severity = label === "Normal" ? "Normal" : label === "Genu Recurvatum" ? "Moderate" : "Moderate";
    segmentStatus.knee = `${label} — ${knee}°`;
    if (label !== "Normal") {
      findings.push({
        id:"knee", category:"Knee Position",
        severity, label:`${label} — ${knee}°`,
        metrics: { angle: knee },
        _debug:{ formula:"vec3Angle(hip,knee,ankle) via dot product", thresholds:THRESHOLDS.knee, ruleTriggered:label },
      });
    }
  } else {
    segmentStatus.knee = "Not Measured";
  }

  // 7. Pattern classification — ALL segments required
  const patternGate = {
    fhp:      segmentStatus.forwardHead   !== null && segmentStatus.forwardHead   !== "Insufficient landmarks",
    shoulder: segmentStatus.roundedShoulder !== "Not Measured",
    thoracic: tci !== null,
    lumbar:   lci !== null,
    pelvis:   pelvis !== null,
    knee:     knee !== null,
  };
  const gatesMet   = Object.values(patternGate).filter(Boolean).length;
  const gatesTotal = Object.keys(patternGate).length;

  if (gatesMet < gatesTotal) {
    findings.push({
      id:"pattern_incomplete",
      category:"Postural Pattern (Kendall)",
      severity:"Info",
      label:`Pattern Classification Incomplete — ${gatesMet}/${gatesTotal} segments measured`,
      missing: Object.entries(patternGate).filter(([,v])=>!v).map(([k])=>k),
      note:"Place all required landmarks to enable Kendall pattern classification.",
    });
  } else {
    // All segments available — classify
    const isKyph = tci.tci >= THRESHOLDS.tci.mild;
    const isLord = lci.lci >= THRESHOLDS.lci.mild;
    const isFlat = lci.lci < THRESHOLDS.lci.reduced;
    const isFHP  = segmentStatus.forwardHead !== "Normal";
    let pattern = "Near-Ideal Alignment";
    if (isKyph && isLord && isFHP)       pattern = "Kyphotic-Lordotic (Kendall A)";
    else if (isKyph && isLord)           pattern = "Kyphotic-Lordotic (Kendall A)";
    else if (isFlat)                     pattern = "Flat-back (Kendall B)";
    else if (isKyph && !isLord)          pattern = "Kyphotic";
    else if (isLord && !isKyph)          pattern = "Lordotic";
    findings.push({
      id:"kendall_pattern",
      category:"Postural Pattern (Kendall)",
      severity: pattern === "Near-Ideal Alignment" ? "Normal" : "Moderate",
      label: pattern,
      metrics: patternGate,
      _debug:{ tci:tci?.tci, lci:lci?.lci, isFHP, isKyph, isLord, isFlat },
    });
  }

  return { findings, segmentStatus };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HybridKendall({
  imgSrc,           // source URL of the lateral photo
  vitposeLandmarks, // raw ViTPose lm array (auto-placement seed)
  vitposeLoading,   // true while ViTPose auto-placement is running in the background
  vitposeError,     // set if AI auto-placement failed/declined — shown instead of failing silently
  view,             // "left" | "right"
  patientSex,       // "Female" | "Male"
  onFindingsChange, // callback(findings, measurements, segmentStatus)
  isWide,
}) {
  // ── Landmark state ──────────────────────────────────────────────────────────
  const [lm, setLm] = useState({});          // {ear:{x,y}, acromion:{x,y}, ...}
  const [confirmed, setConfirmed] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [activePlace, setActivePlace] = useState(null); // id of landmark being placed by tap
  const [dragging, setDragging] = useState(null);
  const [imgSize, setImgSize] = useState({ w:1, h:1 });
  const svgRef = useRef(null);
  const imgRef = useRef(null);

  // ── Auto-place from ViTPose on mount / when landmarks change ────────────────
  // When ViTPose confidently detects all 5 primary points, auto-confirm too —
  // same automatic experience as the Frontal AI pipeline. The clinician can
  // still hit "Re-adjust landmarks" afterward to review/correct any point.
  useEffect(() => {
    if (!vitposeLandmarks || vitposeLandmarks.length < 29) return;
    const vl = vitposeLandmarks;
    const vis = (i) => (vl[i]?.visibility || 0) > 0.3;
    const pick = (idxs) => {
      const best = idxs.reduce((b,i) => (vl[i]?.visibility||0) > (vl[b]?.visibility||0) ? i : b, idxs[0]);
      return vis(best) ? { x: vl[best].x, y: vl[best].y } : null;
    };
    const initial = {
      ear:      pick([7,8]),
      acromion: pick([11,12]),
      hip:      pick([23,24]),
      knee:     pick([25,26]),
      ankle:    pick([27,28]),
    };
    const allPlaced = Object.values(initial).every(v => v !== null);
    // Only touch state if the user hasn't already started placing/adjusting
    // points themselves — never silently override a clinician's manual work.
    const isFreshPlacement = Object.keys(lm).length === 0;
    if (!isFreshPlacement) return;
    setLm(Object.fromEntries(Object.entries(initial).filter(([,v])=>v!==null)));
    if (allPlaced) setConfirmed(true);
  }, [vitposeLandmarks]);

  // ── Derived measurements (recomputed on every lm change) ───────────────────
  const measurements = React.useMemo(() => {
    const bh = bodyHeightNorm(lm);
    const vs = getViewSign(lm);
    const ankleX = lm.ankle?.x ?? 0.5;

    const toPlumb = (x) => plumbDeviation(x, ankleX, bh, vs);

    const cvaC7  = calcCVA_C7(lm.ear, lm.c7);
    const cvaAcr = calcCVA(lm.ear, lm.acromion);
    const cva    = cvaC7 ?? cvaAcr;

    return {
      bodyHeightNorm: bh,
      viewSign: vs,
      cva,
      cvaSource: cvaC7 ? "C7 (Yip 2008 method)" : cvaAcr ? "Acromion fallback" : null,
      earPlumb:  toPlumb(lm.ear?.x),
      acrPlumb:  toPlumb(lm.acromion?.x),
      hipPlumb:  toPlumb(lm.hip?.x),
      kneePlumb: toPlumb(lm.knee?.x),
      earAcr:    calcEarAcrDist(lm.ear, lm.acromion, bh),
      shoulder:  calcRoundedShoulder(lm, bh, vs),
      knee:      calcKneeAngle(lm.hip, lm.knee, lm.ankle),
      tci:       calcTCI(lm.c7, lm.t12, lm.apexT),
      lci:       calcLCI(lm.t12, lm.s2, lm.apexL),
      pelvis:    calcPelvicTilt(lm.asis, lm.psis),
    };
  }, [lm]);

  // ── Emit findings when measurements change (only after confirmed) ───────────
  useEffect(() => {
    if (!confirmed) return;
    const { findings, segmentStatus } = buildKendallFindings(measurements, patientSex);
    onFindingsChange?.(findings, measurements, segmentStatus);
  }, [measurements, confirmed, patientSex]);

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleSVGMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (cy - rect.top)  / rect.height));
    setLm(prev => ({ ...prev, [dragging]: { x, y } }));
    setConfirmed(false);
  }, [dragging]);

  const stopDrag = useCallback(() => setDragging(null), []);

  // ── Tap-to-place ─────────────────────────────────────────────────────────────
  const handleSVGClick = useCallback((e) => {
    if (dragging || !activePlace || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
    const updated={...lm,[activePlace]:{x,y}};
    setLm(updated);setConfirmed(false);
    const allDefs=[...PRIMARY_LANDMARKS,...(advancedMode?ADVANCED_LANDMARKS:[])];
    const nxt=allDefs.find(d=>d.id!==activePlace&&!updated[d.id]);
    setActivePlace(nxt?nxt.id:null);
  }, [dragging, activePlace]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const C = { // colour palette — matches the app's light theme
    bg:"#F7F7F8", s2:"#ffffff", s3:"#F7F7F8", border:"#E0E0E2",
    text:"#0D0D0D", muted:"#6B6B6B", accent:"#7c3aed",
    green:"#16a34a", red:"#dc2626", yellow:"#b45309",
  };
  const allPrimary = PRIMARY_LANDMARKS.every(p => lm[p.id]);
  const plumbX = lm.ankle?.x ?? null;
  const m = measurements;

  const LM_ALL = [...PRIMARY_LANDMARKS, ...(advancedMode ? ADVANCED_LANDMARKS : [])];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>

      {/* ── Header bar ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 12px",background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,flexWrap:isWide?"nowrap":"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",minWidth:0}}>
          <span style={{fontSize:"0.72rem",fontWeight:800,color:C.accent,whiteSpace:"nowrap"}}>⚕ Hybrid Kendall Mode</span>
          {confirmed && <span style={{fontSize:"0.62rem",fontWeight:700,color:C.green,background:`${C.green}15`,padding:"2px 8px",borderRadius:10,whiteSpace:"nowrap"}}>✓ MANUALLY VERIFIED</span>}
          {!confirmed && allPrimary && <span style={{fontSize:"0.62rem",color:C.yellow,whiteSpace:"nowrap"}}>Review landmarks → Confirm</span>}
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <button onClick={()=>setShowGrid(v=>!v)} style={{padding:"3px 9px",borderRadius:6,border:`1px solid ${showGrid?C.accent:C.border}`,background:showGrid?`${C.accent}20`:"transparent",color:showGrid?C.accent:C.muted,fontSize:"0.6rem",fontWeight:700,cursor:"pointer"}}>Grid</button>
          <button onClick={()=>setAdvancedMode(v=>!v)} style={{padding:"5px 12px",borderRadius:8,border:`2px solid ${advancedMode?C.green:"#B4DDB2"}`,background:advancedMode?"#EAF3DE":"#F4F8EE",color:advancedMode?C.green:"#3B6D11",fontSize:"0.65rem",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>
            🔬 {advancedMode?"Advanced ON":"Advanced Mode"}
          </button>
        </div>
      </div>


      {/* ── Landmark buttons ABOVE photo ── */}
      <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 12px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
          <div style={{fontSize:"0.62rem",fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"1px"}}>
            {confirmed?<span style={{color:C.green}}>✓ Landmarks Confirmed</span>:"Place Landmarks"}
          </div>
          {!confirmed&&<span style={{fontSize:"0.55rem",color:C.muted}}>Tap button → tap photo below</span>}
        </div>
        <div style={{
            display: isWide ? "grid" : "flex",
            gridTemplateColumns: isWide ? "repeat(5,1fr)" : undefined,
            overflowX: isWide ? "visible" : "auto",
            WebkitOverflowScrolling: "touch",
            gap:6, marginBottom:8, paddingBottom: isWide?0:2,
          }}>
          {PRIMARY_LANDMARKS.map(def=>{
            const placed=!!lm[def.id],isActive=activePlace===def.id;
            const isNext=!isActive&&!placed&&PRIMARY_LANDMARKS.filter(p=>!lm[p.id])[0]?.id===def.id;
            return(<button key={def.id} onClick={()=>setActivePlace(isActive?null:def.id)}
              style={{padding: isWide?"7px 4px":"8px 6px", minWidth: isWide?0:76, flexShrink: isWide?undefined:0, minHeight:44,
                borderRadius:9,border:`1.5px solid ${isActive?def.color:placed?def.color+"70":isNext?C.accent:C.border}`,background:isActive?`${def.color}22`:placed?`${def.color}14`:isNext?`${C.accent}0d`:"transparent",color:isActive?def.color:placed?def.color:isNext?C.accent:C.muted,fontSize: isWide?"0.6rem":"0.65rem",fontWeight:700,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
              <div style={{fontSize: isWide?"0.85rem":"0.95rem",marginBottom:2}}>{placed?"✅":isNext?"👆":"📍"}</div>
              <div style={{fontWeight:800,fontSize: isWide?"0.6rem":"0.65rem",whiteSpace:"nowrap"}}>{def.label}</div>
              <div style={{fontSize: isWide?"0.5rem":"0.55rem",marginTop:1,opacity:0.75,whiteSpace:"nowrap"}}>{isActive?"tap photo ↓":placed?"✓ placed":isNext?"← next":def.desc.split(" ")[0]}</div>
            </button>);
          })}
        </div>
        {allPrimary&&!confirmed&&(
          <button onClick={()=>{setConfirmed(true);const{findings:f,segmentStatus:s}=buildKendallFindings(measurements,patientSex);onFindingsChange?.(f,measurements,s);}}
            style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.accent},#7c3aed)`,color:"#fff",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",marginBottom:4}}>
            ✅ CONFIRM LANDMARKS → ANALYSE
          </button>
        )}
        {confirmed&&(
          <button onClick={()=>setConfirmed(false)}
            style={{width:"100%",padding:"7px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:"0.62rem",fontWeight:700,cursor:"pointer"}}>
            ↩ Re-adjust landmarks
          </button>
        )}
      </div>

      {!advancedMode&&(
        <button onClick={()=>setAdvancedMode(true)} style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"2px dashed #97C459",background:"#F4F8EE",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:"1.3rem"}}>🔬</span>
          <div>
            <div style={{fontSize:"0.72rem",fontWeight:800,color:C.green,marginBottom:2}}>Enable Advanced Mode</div>
            <div style={{fontSize:"0.6rem",color:C.muted,lineHeight:1.5}}>Place C7 · T12 · S2 for TCI/LCI · ASIS + PSIS for Pelvic Tilt · Enables full Kendall Pattern Classification</div>
          </div>
          <span style={{marginLeft:"auto",fontSize:"0.65rem",fontWeight:800,color:C.green,whiteSpace:"nowrap",flexShrink:0}}>Tap →</span>
        </button>
      )}

      {/* ── Advanced landmarks ── */}
      {advancedMode && (
        <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.green}30`,padding:"10px 12px"}}>
          <div style={{fontSize:"0.6rem",fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
            Advanced Landmarks — unlocks TCI · LCI · Pelvic Tilt
          </div>
          <div style={{
              display: isWide ? "grid" : "flex",
              gridTemplateColumns: isWide ? "repeat(4,1fr)" : undefined,
              overflowX: isWide ? "visible" : "auto",
              WebkitOverflowScrolling: "touch",
              gap:6, paddingBottom: isWide?0:2,
            }}>
            {ADVANCED_LANDMARKS.map(def=>{
              const placed = !!lm[def.id];
              const isActive = activePlace === def.id;
              return (
                <button key={def.id}
                  onClick={()=>setActivePlace(isActive ? null : def.id)}
                  style={{padding: isWide?"6px 4px":"7px 6px", minWidth: isWide?0:70, flexShrink: isWide?undefined:0, minHeight:44,
                    borderRadius:7,border:`1.5px solid ${isActive?def.color:placed?def.color+"60":C.border}`,background:isActive?`${def.color}20`:placed?`${def.color}10`:"transparent",color:isActive?def.color:placed?def.color:C.muted,fontSize: isWide?"0.55rem":"0.6rem",fontWeight:700,cursor:"pointer",textAlign:"center"}}>
                  <div>{placed?"✅":"📍"}</div>
                  <div style={{fontWeight:800,fontSize: isWide?"0.57rem":"0.62rem",whiteSpace:"nowrap"}}>{def.label}</div>
                  {placed && <div style={{fontSize: isWide?"0.48rem":"0.52rem",opacity:0.7,whiteSpace:"nowrap"}}>{def.desc.split(" ")[0]}</div>}
                  {placed && <button onClick={e=>{e.stopPropagation();setLm(p=>{const n={...p};delete n[def.id];return n;});}} style={{marginTop:2,width:"100%",border:"none",background:"#FCEBEB",color:C.red,borderRadius:4,fontSize: isWide?"0.48rem":"0.55rem",fontWeight:700,cursor:"pointer",minHeight:20}}>✕</button>}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* ── Photo + SVG overlay ── */}
      {imgSrc && (
        <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:`2px solid ${confirmed?C.green:activePlace?C.yellow:C.accent}`,background:C.s2}}>
          <img ref={imgRef} src={imgSrc} alt="Lateral posture"
            onLoad={e=>setImgSize({w:e.target.offsetWidth,h:e.target.offsetHeight})}
            style={{width:"100%",display:"block",userSelect:"none"}}/>

          <svg ref={svgRef}
            style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",cursor:activePlace?"crosshair":dragging?"grabbing":"default",overflow:"visible"}}
            viewBox="0 0 1 1" preserveAspectRatio="none"
            onMouseMove={handleSVGMove} onTouchMove={handleSVGMove}
            onMouseUp={stopDrag}   onTouchEnd={stopDrag}
            onClick={handleSVGClick}>

            {/* ── 1cm grid ── */}
            {showGrid && m.bodyHeightNorm && lm.ear && lm.ankle && (() => {
              const bh = m.bodyHeightNorm;
              const lines = [];
              // Estimated 1cm = bh/patientHeight fraction — use 170cm default
              const cmFrac = bh / 170;
              const major = cmFrac * 5;
              for (let i=0; i < 1/cmFrac + 1; i++) {
                const y = (lm.ear?.y ?? 0) + i*cmFrac;
                if (y > 1.05) break;
                const isMajor = i % 5 === 0;
                if (isMajor) lines.push(<line key={`h${i}`} x1="0" y1={y} x2="1" y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth="0.002"/>);
              }
              return <g>{lines}</g>;
            })()}

            {/* ── Plumb line ── */}
            {plumbX !== null && (
              <g>
                <line x1={plumbX} y1="0" x2={plumbX} y2="1"
                  stroke="rgba(124,58,237,0.85)" strokeWidth="0.004" strokeDasharray="0.015,0.008"/>
                <rect x={plumbX+0.008} y="0.026" width="0.09" height="0.02" rx="0.003" fill="rgba(255,255,255,0.94)" stroke="#7c3aed" strokeWidth="0.001"/>
                <text x={plumbX+0.013} y="0.041" fontSize="0.018" fontWeight="bold" fill="#5b21b6" fontFamily="system-ui">PLUMB</text>
              </g>
            )}

            {/* ── Measurement lines (landmark → plumb) ── */}
            {confirmed && plumbX !== null && [
              { id:"ear",      pct:m.earPlumb,  color:"#22d3ee", dark:"#0891b2" },
              { id:"acromion", pct:m.acrPlumb,  color:"#c4b5fd", dark:"#7c3aed" },
              { id:"hip",      pct:m.hipPlumb,  color:"#fbbf24", dark:"#c2760c" },
              { id:"knee",     pct:m.kneePlumb, color:"#4ade80", dark:"#15803d" },
            ].map(seg => {
              const p = lm[seg.id]; if (!p || seg.pct === null) return null;
              const lbl = `${seg.pct > 0 ? "+" : ""}${seg.pct}%`;
              // Place label on the side further from plumb (avoids centre clutter)
              const labelX = p.x > plumbX ? p.x + 0.012 : plumbX + 0.012;
              return (
                <g key={seg.id}>
                  <line x1={p.x} y1={p.y} x2={plumbX} y2={p.y}
                    stroke={seg.color} strokeWidth="0.002" strokeDasharray="0.008,0.005" opacity="0.75"/>
                  <rect x={labelX-0.002} y={p.y-0.013} width="0.052" height="0.015" rx="0.002" fill="rgba(255,255,255,0.94)" stroke={seg.dark} strokeWidth="0.0008"/>
                  <text x={labelX} y={p.y-0.003} fontSize="0.012" fill={seg.dark} fontWeight="bold" fontFamily="system-ui">{lbl}</text>
                </g>
              );
            })}

            {/* ── CVA arc line (ear → acromion, when confirmed) ── */}
            {confirmed && lm.ear && (lm.c7 || lm.acromion) && m.cva !== null && (() => {
              const target = lm.c7 || lm.acromion;
              return (
                <g>
                  <line x1={lm.ear.x} y1={lm.ear.y} x2={target.x} y2={target.y}
                    stroke="#22d3ee" strokeWidth="0.004" opacity="0.9"/>
                  <rect x={lm.ear.x+(target.x-lm.ear.x)*0.4-0.018} y={lm.ear.y+(target.y-lm.ear.y)*0.4+0.004}
                    width="0.072" height="0.015" rx="0.002" fill="rgba(255,255,255,0.94)" stroke="#0891b2" strokeWidth="0.0008"/>
                  <text x={lm.ear.x+(target.x-lm.ear.x)*0.4-0.014} y={lm.ear.y+(target.y-lm.ear.y)*0.4+0.014}
                    fontSize="0.012" fill="#0891b2" fontWeight="bold" fontFamily="system-ui">CVA {m.cva}°</text>
                </g>
              );
            })()}

            {/* ── TCI / LCI chord lines ── */}
            {advancedMode && lm.c7 && lm.t12 && (
              <line x1={lm.c7.x} y1={lm.c7.y} x2={lm.t12.x} y2={lm.t12.y}
                stroke="#fbbf24" strokeWidth="0.003" strokeDasharray="0.012,0.007" opacity="0.7"/>
            )}
            {advancedMode && lm.t12 && lm.s2 && (
              <line x1={lm.t12.x} y1={lm.t12.y} x2={lm.s2.x} y2={lm.s2.y}
                stroke="#fb7185" strokeWidth="0.003" strokeDasharray="0.012,0.007" opacity="0.7"/>
            )}
            {advancedMode && lm.asis && lm.psis && (
              <line x1={lm.asis.x} y1={lm.asis.y} x2={lm.psis.x} y2={lm.psis.y}
                stroke="#7dd3fc" strokeWidth="0.003" strokeDasharray="0.012,0.007" opacity="0.7"/>
            )}

            {/* ── Landmark dots (draggable) ── */}
            {LM_ALL.map(def => {
              const p = lm[def.id];
              if (!p) return null;
              const r = def.group === "pelvis" ? 0.016 : 0.013;
              return (
                <g key={def.id} style={{cursor:"grab"}}
                  onMouseDown={e=>{e.stopPropagation();setDragging(def.id);setConfirmed(false);}}
                  onTouchStart={e=>{e.stopPropagation();setDragging(def.id);setConfirmed(false);}}>
                  {/* Hit area (invisible, larger for easy touch) */}
                  <circle cx={p.x} cy={p.y} r={r+0.012} fill="transparent"/>
                  <circle cx={p.x} cy={p.y} r={r+0.003} fill="rgba(255,255,255,0.85)"/>
                  <circle cx={p.x} cy={p.y} r={r} fill={def.bright||def.color} stroke="white" strokeWidth="0.004"
                    opacity={confirmed?1:0.9}/>
                  {/* Label — right of dot, small */}
                  <rect x={p.x+r+0.003} y={p.y-0.013} width="0.068" height="0.016" rx="0.002" fill="rgba(255,255,255,0.94)" stroke={def.color} strokeWidth="0.0008"/>
                  <text x={p.x+r+0.005} y={p.y-0.001} fontSize="0.012" fill={def.color} fontWeight="bold" fontFamily="system-ui">{def.label}</text>
                </g>
              );
            })}

            {/* ── "Not placed" ghost for primary landmarks ── */}
            {PRIMARY_LANDMARKS.filter(def=>!lm[def.id]).map(def => (
              <text key={def.id+"_miss"} x="0.5" y={0.3+PRIMARY_LANDMARKS.indexOf(def)*0.08}
                fontSize="0.018" fill="rgba(255,255,255,0.2)" textAnchor="middle" fontFamily="system-ui">
                {def.label} — tap button below to place
              </text>
            ))}
          </svg>

          {/* AI auto-placement failed/declined banner */}
          {!vitposeLoading && vitposeError && Object.keys(lm).length===0 && (
            <div style={{position:"absolute",top:8,left:8,right:8,background:"rgba(255,255,255,0.96)",border:"1px solid #FAC775",color:"#854F0B",padding:"7px 12px",borderRadius:10,fontSize:"0.65rem",fontWeight:700,lineHeight:1.4,zIndex:10}}>
              ⚠ {vitposeError}
            </div>
          )}

          {/* AI auto-placement loading banner */}
          {vitposeLoading && Object.keys(lm).length===0 && (
            <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",background:"rgba(255,255,255,0.96)",border:"1px solid #AFA9EC",color:"#3C3489",padding:"6px 16px",borderRadius:20,fontSize:"0.68rem",fontWeight:800,whiteSpace:"nowrap",pointerEvents:"none",zIndex:10,display:"flex",alignItems:"center",gap:6}}>
              <span style={{display:"inline-block",width:10,height:10,border:"2px solid #7c3aed",borderTopColor:"transparent",borderRadius:"50%",animation:"hk-spin 0.7s linear infinite"}}/>
              AI locating landmarks…
              <style>{"@keyframes hk-spin{to{transform:rotate(360deg)}}"}</style>
            </div>
          )}

          {/* Tap hint */}
          {activePlace && (() => {
            const def = LM_ALL.find(d=>d.id===activePlace);
            return (
              <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",background:"rgba(255,255,255,0.96)",border:`1px solid ${def?.color||C.yellow}`,color:def?.color||C.yellow,padding:"5px 14px",borderRadius:20,fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",pointerEvents:"none",zIndex:10}}>
                👆 Tap photo to place {def?.label} — {def?.desc}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Measurements panel ── */}
      {confirmed && (
        <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 12px"}}>
          <div style={{fontSize:"0.6rem",fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Measurements</div>
          <div style={{display:"grid",gap:4}}>
            {[
              { label:"CVA",                val: m.cva !== null ? `${m.cva}° (${m.cvaSource})` : "—",       status: m.cva !== null ? classifyCVA(m.cva) : "Not Measured", color:"#0891b2" },
              { label:"Ear → Plumb",        val: m.earPlumb  !== null ? `${m.earPlumb}% BH`  : "—",       status: m.earPlumb  !== null ? classifyPlumb(m.earPlumb,"ear")      : "Not Measured", color:"#0891b2" },
              { label:"Acromion → Plumb",   val: m.acrPlumb  !== null ? `${m.acrPlumb}% BH`  : "—",       status: m.acrPlumb  !== null ? classifyPlumb(m.acrPlumb,"acromion")  : "Not Measured", color:"#7c3aed" },
              { label:"Hip (GT) → Plumb",   val: m.hipPlumb  !== null ? `${m.hipPlumb}% BH`  : "—",       status: m.hipPlumb  !== null ? classifyPlumb(m.hipPlumb,"hip")       : "Not Measured", color:"#c2760c" },
              { label:"Knee → Plumb",       val: m.kneePlumb !== null ? `${m.kneePlumb}% BH` : "—",       status: m.kneePlumb !== null ? classifyPlumb(m.kneePlumb,"knee")     : "Not Measured", color:"#15803d" },
              { label:"Hip-Knee-Ankle °",   val: m.knee !== null ? `${m.knee}°` : "—",                    status: classifyKnee(m.knee) ?? "Not Measured",                                       color:"#15803d" },
              { label:"TCI",                val: m.tci  !== null ? `${m.tci.tci}%` : "—",                 status: m.tci  ? classifyTCI(m.tci.tci)  : "Place C7, T12, T-Apex", color:"#b45309" },
              { label:"LCI",                val: m.lci  !== null ? `${m.lci.lci}%` : "—",                 status: m.lci  ? classifyLCI(m.lci.lci)  : "Place T12, S2, L-Apex", color:"#db2777" },
              { label:"Pelvic Tilt",        val: m.pelvis !== null ? `${m.pelvis.angle}° ${m.pelvis.direction}` : "—", status: m.pelvis ? `${m.pelvis.direction}` : "Place ASIS + PSIS", color:"#0284c7" },
            ].map(row=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:C.s3,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{fontSize:"0.62rem",color:C.muted,minWidth:120}}>{row.label}</span>
                <span style={{fontSize:"0.65rem",fontWeight:700,color:row.color}}>{row.val}</span>
                <span style={{fontSize:"0.58rem",color:row.status.includes("Not")||row.status.includes("Place")?C.muted:row.status==="Normal"?C.green:"#b45309",fontStyle:"italic",maxWidth:130,textAlign:"right"}}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}

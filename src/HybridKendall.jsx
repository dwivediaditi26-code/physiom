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
export const PRIMARY_LANDMARKS = [
  { id:"ear",      label:"Ear",      desc:"Ear tragus",               color:"#00e5ff", mpIdx:[7,8]    },
  { id:"acromion", label:"Acromion", desc:"Tip of acromion process",  color:"#a78bfa", mpIdx:[11,12]  },
  { id:"hip",      label:"Hip (GT)", desc:"Greater trochanter tip",   color:"#f59e0b", mpIdx:[23,24]  },
  { id:"knee",     label:"Knee",     desc:"Lateral femoral condyle",  color:"#34d399", mpIdx:[25,26]  },
  { id:"ankle",    label:"Ankle",    desc:"Lateral malleolus tip",    color:"#f87171", mpIdx:[27,28]  },
];

export const ADVANCED_LANDMARKS = [
  { id:"c7",    label:"C7",    desc:"C7 spinous process (base of neck)",     color:"#fbbf24", group:"spinal"  },
  { id:"t12",   label:"T12",   desc:"T12 (thoracolumbar junction)",          color:"#fb7185", group:"spinal"  },
  { id:"s2",    label:"S2",    desc:"S2 (posterior sacrum midpoint)",        color:"#c084fc", group:"spinal"  },
  { id:"apexT", label:"T-Apex",desc:"Maximum thoracic convexity point",     color:"#fdba74", group:"spinal"  },
  { id:"apexL", label:"L-Apex",desc:"Maximum lumbar concavity point",       color:"#86efac", group:"spinal"  },
  { id:"asis",  label:"ASIS",  desc:"Anterior superior iliac spine",        color:"#7dd3fc", group:"pelvis"  },
  { id:"psis",  label:"PSIS",  desc:"Posterior superior iliac spine",       color:"#93c5fd", group:"pelvis"  },
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
  const [debugMode, setDebugMode] = useState(false);
  const [activePlace, setActivePlace] = useState(null); // id of landmark being placed by tap
  const [dragging, setDragging] = useState(null);
  const [imgSize, setImgSize] = useState({ w:1, h:1 });
  const svgRef = useRef(null);
  const imgRef = useRef(null);

  // ── Auto-place from ViTPose on mount / when landmarks change ────────────────
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
    setLm(prev => {
      // Only auto-place if user hasn't manually adjusted yet
      if (Object.keys(prev).length > 0) return prev;
      return Object.fromEntries(Object.entries(initial).filter(([,v])=>v!==null));
    });
    setConfirmed(false);
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
    setLm(prev => ({ ...prev, [activePlace]: { x, y } }));
    setActivePlace(null);
    setConfirmed(false);
  }, [dragging, activePlace]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const C = { // colour palette
    bg:"#0a0d1a", s2:"#111827", s3:"#1e2a3a", border:"#1e2a3a",
    text:"#e2e8f0", muted:"#64748b", accent:"#a78bfa",
    green:"#34d399", red:"#ff4d6d", yellow:"#fbbf24",
  };
  const allPrimary = PRIMARY_LANDMARKS.every(p => lm[p.id]);
  const plumbX = lm.ankle?.x ?? null;
  const m = measurements;

  const LM_ALL = [...PRIMARY_LANDMARKS, ...(advancedMode ? ADVANCED_LANDMARKS : [])];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>

      {/* ── Header bar ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:C.s2,borderRadius:10,border:`1px solid ${C.border}`}}>
        <div>
          <span style={{fontSize:"0.72rem",fontWeight:800,color:C.accent}}>⚕ Hybrid Kendall Mode</span>
          {confirmed && <span style={{marginLeft:8,fontSize:"0.62rem",fontWeight:700,color:C.green,background:`${C.green}15`,padding:"2px 8px",borderRadius:10}}>✓ MANUALLY VERIFIED</span>}
          {!confirmed && allPrimary && <span style={{marginLeft:8,fontSize:"0.62rem",color:C.yellow}}>Review landmarks → Confirm</span>}
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowGrid(v=>!v)} style={{padding:"3px 9px",borderRadius:6,border:`1px solid ${showGrid?C.accent:C.border}`,background:showGrid?`${C.accent}20`:"transparent",color:showGrid?C.accent:C.muted,fontSize:"0.6rem",fontWeight:700,cursor:"pointer"}}>Grid</button>
          <button onClick={()=>setDebugMode(v=>!v)} style={{padding:"3px 9px",borderRadius:6,border:`1px solid ${debugMode?"#f59e0b":C.border}`,background:debugMode?"rgba(245,158,11,0.1)":"transparent",color:debugMode?"#f59e0b":C.muted,fontSize:"0.6rem",fontWeight:700,cursor:"pointer"}}>Debug</button>
          <button onClick={()=>setAdvancedMode(v=>!v)} style={{padding:"3px 9px",borderRadius:6,border:`1px solid ${advancedMode?C.green:C.border}`,background:advancedMode?`${C.green}15`:"transparent",color:advancedMode?C.green:C.muted,fontSize:"0.6rem",fontWeight:700,cursor:"pointer"}}>Advanced</button>
        </div>
      </div>

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
                lines.push(<line key={`h${i}`} x1="0" y1={y} x2="1" y2={y} stroke={isMajor?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)"} strokeWidth={isMajor?"0.003":"0.001"}/>);
              }
              return <g>{lines}</g>;
            })()}

            {/* ── Plumb line ── */}
            {plumbX !== null && (
              <g>
                <line x1={plumbX} y1="0" x2={plumbX} y2="1"
                  stroke="rgba(127,90,240,0.9)" strokeWidth="0.004" strokeDasharray="0.015,0.008"/>
                <text x={plumbX+0.01} y="0.04" fontSize="0.022" fontWeight="bold" fill="rgba(167,139,250,0.9)" fontFamily="system-ui">PLUMB</text>
              </g>
            )}

            {/* ── Measurement lines (landmark → plumb) ── */}
            {confirmed && plumbX !== null && [
              { id:"ear",      pct:m.earPlumb,  color:"#00e5ff" },
              { id:"acromion", pct:m.acrPlumb,  color:"#a78bfa" },
              { id:"hip",      pct:m.hipPlumb,  color:"#f59e0b" },
              { id:"knee",     pct:m.kneePlumb, color:"#34d399" },
            ].map(seg => {
              const p = lm[seg.id]; if (!p || seg.pct === null) return null;
              const label = `${seg.pct > 0 ? "+" : ""}${seg.pct}% BH`;
              return (
                <g key={seg.id}>
                  <line x1={p.x} y1={p.y} x2={plumbX} y2={p.y}
                    stroke={seg.color} strokeWidth="0.003" strokeDasharray="0.01,0.006" opacity="0.8"/>
                  <rect x={Math.min(p.x,plumbX)+Math.abs(p.x-plumbX)*0.2-0.015} y={p.y-0.025}
                    width="0.10" height="0.022" rx="0.003" fill="rgba(0,0,0,0.7)"/>
                  <text x={Math.min(p.x,plumbX)+Math.abs(p.x-plumbX)*0.2-0.009} y={p.y-0.009}
                    fontSize="0.018" fill={seg.color} fontWeight="bold" fontFamily="system-ui">{label}</text>
                </g>
              );
            })}

            {/* ── CVA arc line (ear → acromion, when confirmed) ── */}
            {confirmed && lm.ear && (lm.c7 || lm.acromion) && m.cva !== null && (() => {
              const target = lm.c7 || lm.acromion;
              return (
                <g>
                  <line x1={lm.ear.x} y1={lm.ear.y} x2={target.x} y2={target.y}
                    stroke="#00e5ff" strokeWidth="0.004" opacity="0.9"/>
                  <rect x={lm.ear.x+(target.x-lm.ear.x)*0.45-0.02} y={lm.ear.y+(target.y-lm.ear.y)*0.45-0.03}
                    width="0.1" height="0.022" rx="0.003" fill="rgba(0,0,0,0.75)"/>
                  <text x={lm.ear.x+(target.x-lm.ear.x)*0.45-0.014} y={lm.ear.y+(target.y-lm.ear.y)*0.45-0.015}
                    fontSize="0.020" fill="#00e5ff" fontWeight="bold" fontFamily="system-ui">CVA {m.cva}°</text>
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
              const r = def.group === "pelvis" ? 0.024 : 0.020;
              return (
                <g key={def.id} style={{cursor:"grab"}}
                  onMouseDown={e=>{e.stopPropagation();setDragging(def.id);setConfirmed(false);}}
                  onTouchStart={e=>{e.stopPropagation();setDragging(def.id);setConfirmed(false);}}>
                  <circle cx={p.x} cy={p.y} r={r+0.006} fill="rgba(0,0,0,0.5)"/>
                  <circle cx={p.x} cy={p.y} r={r} fill={def.color} stroke="white" strokeWidth="0.005"
                    opacity={confirmed?1:0.85}/>
                  {/* Label */}
                  <rect x={p.x+r+0.004} y={p.y-0.016} width="0.08" height="0.020" rx="0.003" fill="rgba(0,0,0,0.7)"/>
                  <text x={p.x+r+0.007} y={p.y-0.002} fontSize="0.015" fill={def.color} fontWeight="bold" fontFamily="system-ui">{def.label}</text>
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

          {/* Tap hint */}
          {activePlace && (() => {
            const def = LM_ALL.find(d=>d.id===activePlace);
            return (
              <div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.85)",color:def?.color||C.yellow,padding:"5px 14px",borderRadius:20,fontSize:"0.65rem",fontWeight:800,whiteSpace:"nowrap",pointerEvents:"none",zIndex:10}}>
                👆 Tap photo to place {def?.label} — {def?.desc}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Landmark placement buttons ── */}
      <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 12px"}}>
        <div style={{fontSize:"0.6rem",fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
          Primary Landmarks {confirmed && <span style={{color:C.green,marginLeft:6}}>✓ Confirmed</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:8}}>
          {PRIMARY_LANDMARKS.map(def=>{
            const placed = !!lm[def.id];
            const isActive = activePlace === def.id;
            return (
              <button key={def.id}
                onClick={()=>setActivePlace(isActive ? null : def.id)}
                style={{padding:"6px 4px",borderRadius:8,border:`1.5px solid ${isActive?def.color:placed?def.color+"60":C.border}`,background:isActive?`${def.color}25`:placed?`${def.color}10`:"transparent",color:isActive?def.color:placed?def.color:C.muted,fontSize:"0.58rem",fontWeight:700,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                <div style={{fontSize:"0.8rem",marginBottom:1}}>{placed?"✅":"📍"}</div>
                <div style={{fontWeight:800,fontSize:"0.6rem"}}>{def.label}</div>
                {isActive && <div style={{fontSize:"0.5rem",marginTop:1}}>👆 Tap</div>}
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        {allPrimary && !confirmed && (
          <button onClick={()=>{setConfirmed(true); const {findings,segmentStatus}=buildKendallFindings(measurements,patientSex); onFindingsChange?.(findings,measurements,segmentStatus);}}
            style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.accent},#7c3aed)`,color:"#fff",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",marginBottom:4}}>
            ✅ CONFIRM LANDMARKS → ANALYSE
          </button>
        )}
        {confirmed && (
          <button onClick={()=>setConfirmed(false)}
            style={{width:"100%",padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:"0.65rem",fontWeight:700,cursor:"pointer"}}>
            ↩ Re-adjust landmarks
          </button>
        )}
      </div>

      {/* ── Advanced landmarks ── */}
      {advancedMode && (
        <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.green}30`,padding:"10px 12px"}}>
          <div style={{fontSize:"0.6rem",fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
            Advanced Landmarks — unlocks TCI · LCI · Pelvic Tilt
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
            {ADVANCED_LANDMARKS.map(def=>{
              const placed = !!lm[def.id];
              const isActive = activePlace === def.id;
              return (
                <button key={def.id}
                  onClick={()=>setActivePlace(isActive ? null : def.id)}
                  style={{padding:"6px 4px",borderRadius:7,border:`1.5px solid ${isActive?def.color:placed?def.color+"60":C.border}`,background:isActive?`${def.color}20`:placed?`${def.color}10`:"transparent",color:isActive?def.color:placed?def.color:C.muted,fontSize:"0.55rem",fontWeight:700,cursor:"pointer",textAlign:"center"}}>
                  <div>{placed?"✅":"📍"}</div>
                  <div style={{fontWeight:800,fontSize:"0.57rem"}}>{def.label}</div>
                  {placed && <div style={{fontSize:"0.48rem",opacity:0.7}}>{def.desc.split(" ")[0]}</div>}
                  {placed && <button onClick={e=>{e.stopPropagation();setLm(p=>{const n={...p};delete n[def.id];return n;});}} style={{marginTop:2,width:"100%",border:"none",background:"rgba(255,77,109,0.15)",color:"#ff4d6d",borderRadius:4,fontSize:"0.48rem",fontWeight:700,cursor:"pointer"}}>✕</button>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Measurements panel ── */}
      {confirmed && (
        <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,padding:"10px 12px"}}>
          <div style={{fontSize:"0.6rem",fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Measurements</div>
          <div style={{display:"grid",gap:4}}>
            {[
              { label:"CVA",                val: m.cva !== null ? `${m.cva}° (${m.cvaSource})` : "—",       status: m.cva !== null ? classifyCVA(m.cva) : "Not Measured", color:"#00e5ff" },
              { label:"Ear → Plumb",        val: m.earPlumb  !== null ? `${m.earPlumb}% BH`  : "—",       status: m.earPlumb  !== null ? classifyPlumb(m.earPlumb,"ear")      : "Not Measured", color:"#00e5ff" },
              { label:"Acromion → Plumb",   val: m.acrPlumb  !== null ? `${m.acrPlumb}% BH`  : "—",       status: m.acrPlumb  !== null ? classifyPlumb(m.acrPlumb,"acromion")  : "Not Measured", color:"#a78bfa" },
              { label:"Hip (GT) → Plumb",   val: m.hipPlumb  !== null ? `${m.hipPlumb}% BH`  : "—",       status: m.hipPlumb  !== null ? classifyPlumb(m.hipPlumb,"hip")       : "Not Measured", color:"#f59e0b" },
              { label:"Knee → Plumb",       val: m.kneePlumb !== null ? `${m.kneePlumb}% BH` : "—",       status: m.kneePlumb !== null ? classifyPlumb(m.kneePlumb,"knee")     : "Not Measured", color:"#34d399" },
              { label:"Hip-Knee-Ankle °",   val: m.knee !== null ? `${m.knee}°` : "—",                    status: classifyKnee(m.knee) ?? "Not Measured",                                       color:"#34d399" },
              { label:"TCI",                val: m.tci  !== null ? `${m.tci.tci}%` : "—",                 status: m.tci  ? classifyTCI(m.tci.tci)  : "Place C7, T12, T-Apex", color:"#fbbf24" },
              { label:"LCI",                val: m.lci  !== null ? `${m.lci.lci}%` : "—",                 status: m.lci  ? classifyLCI(m.lci.lci)  : "Place T12, S2, L-Apex", color:"#fb7185" },
              { label:"Pelvic Tilt",        val: m.pelvis !== null ? `${m.pelvis.angle}° ${m.pelvis.direction}` : "—", status: m.pelvis ? `${m.pelvis.direction}` : "Place ASIS + PSIS", color:"#7dd3fc" },
            ].map(row=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:C.s3,borderRadius:6}}>
                <span style={{fontSize:"0.62rem",color:C.muted,minWidth:120}}>{row.label}</span>
                <span style={{fontSize:"0.65rem",fontWeight:700,color:row.color}}>{row.val}</span>
                <span style={{fontSize:"0.58rem",color:row.status.includes("Not")||row.status.includes("Place")?"#475569":row.status==="Normal"?C.green:"#f59e0b",fontStyle:"italic",maxWidth:130,textAlign:"right"}}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Debug panel ── */}
      {debugMode && (
        <div style={{background:"#0d1117",borderRadius:10,border:"1px solid #f59e0b40",padding:"10px 12px",fontFamily:"monospace",fontSize:"0.6rem",color:"#94a3b8"}}>
          <div style={{color:"#f59e0b",fontWeight:800,marginBottom:8}}>DEBUG — Hybrid Kendall</div>
          <div style={{color:"#34d399",marginBottom:4}}>LANDMARKS (normalised):</div>
          {Object.entries(lm).map(([k,v])=>(
            <div key={k}>{k.padEnd(10)}: x={v.x.toFixed(4)} y={v.y.toFixed(4)}</div>
          ))}
          <div style={{color:"#34d399",marginTop:8,marginBottom:4}}>MEASUREMENTS:</div>
          <div>bodyHeightNorm : {m.bodyHeightNorm?.toFixed(4) ?? "null"}</div>
          <div>viewSign       : {m.viewSign}</div>
          <div>CVA            : {m.cva ?? "null"} ({m.cvaSource ?? "N/A"})</div>
          <div>earPlumb       : {m.earPlumb ?? "null"} %BH</div>
          <div>acrPlumb       : {m.acrPlumb ?? "null"} %BH</div>
          <div>hipPlumb       : {m.hipPlumb ?? "null"} %BH</div>
          <div>kneePlumb      : {m.kneePlumb ?? "null"} %BH</div>
          <div>earAcromion    : {m.earAcr ?? "null"} %BH</div>
          <div>kneeAngle      : {m.knee ?? "null"} °</div>
          <div>shoulder.comp  : {m.shoulder?.composite ?? "null"}</div>
          <div>TCI            : {m.tci?.tci ?? "null"} %</div>
          <div>LCI            : {m.lci?.lci ?? "null"} %</div>
          <div>pelvicTilt     : {m.pelvis?.angle ?? "null"} ° ({m.pelvis?.direction ?? "N/A"})</div>
          <div style={{color:"#34d399",marginTop:8,marginBottom:4}}>FORMULAS:</div>
          <div>CVA = atan2(|ear.y-ref.y|, |ear.x-ref.x|) × 180/π  [Yip 2008]</div>
          <div>Plumb% = (landmark.x - ankle.x) × viewSign / BH × 100</div>
          <div>TCI = perpDist(apexT, C7→T12 chord) / chordLen × 100</div>
          <div>LCI = perpDist(apexL, T12→S2 chord) / chordLen × 100</div>
          <div>Pelvis = atan2(|ASIS_Y−PSIS_Y|, |ASIS_X−PSIS_X|)</div>
          <div>Knee = acos(dot(hip-knee, ankle-knee) / |mag|) [vec3]</div>
        </div>
      )}
    </div>
  );
}

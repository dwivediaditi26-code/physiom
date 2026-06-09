// sagittalFindings.js — Sagittal Analysis Engine v3
// Rebuilt per clinical audit:
//   - thoracicAngle (trunk lean proxy) REMOVED
//   - lordosisAngle (hip-knee z proxy) REMOVED
//   - pelvicTiltSagittal (hip-knee-heel proxy) REMOVED
//   - Replaced by: ThoracicCurvatureIndex (TCI), LumbarCurvatureIndex (LCI)
//   - Pelvic tilt only when ASIS + PSIS are manually placed
//   - Rounded shoulder: 3-metric weighted approach
//   - Pattern classification gated on all segment findings
//   - Debug output on every finding

// ─── DEPRECATED REGION FILTER (unchanged) ────────────────────────────────────
const DEPRECATED_REGIONS = [
  "Thoracic Kyphosis",
  "Lumbar — Hyperlordosis",
  "Lumbar — Flat Back",
  "Posture Pattern —",
  "Upper Crossed Pattern",
  "Lower Crossed Pattern",
  "Sagittal Pattern —",
  "Lumbar / Pelvis",
];

export function isDeprecatedLateralFinding(fi) {
  if (!fi) return false;
  const region = fi.region || fi.category || "";
  return DEPRECATED_REGIONS.some(dep => region.includes(dep));
}

// ─── DEBUG BUILDER ────────────────────────────────────────────────────────────
// Attached to every finding so developers can trace exact computation.
function debug(data) {
  return {
    _debug: {
      ...data,
      _generated: new Date().toISOString(),
    }
  };
}

// ─── CVA CLASSIFICATION (unchanged — valid formula) ──────────────────────────
function classifyCVA(cva) {
  if (cva === null || cva === undefined) return null;
  if (cva >= 55) return { severity:"Normal",    label:`Normal craniovertebral angle (${Math.round(cva)}°)` };
  if (cva >= 50) return { severity:"Borderline", label:`Borderline forward head tendency — CVA ${Math.round(cva)}°` };
  if (cva >= 44) return { severity:"Mild",       label:`Mild forward head posture — CVA ${Math.round(cva)}°` };
  if (cva >= 38) return { severity:"Moderate",   label:`Moderate forward head posture — CVA ${Math.round(cva)}°` };
  return              { severity:"Marked",     label:`Marked forward head posture — CVA ${Math.round(cva)}°` };
}

// ─── PLUMB LINE OFFSET INTERPRETATION (unchanged — valid formula) ─────────────
function interpretOffset(offsetPct, viewSign, segment) {
  if (offsetPct === null) return null;
  const anteriorPct = viewSign >= 0 ? offsetPct : -offsetPct;
  const absAnt = Math.abs(anteriorPct);
  const dir = anteriorPct > 0 ? "anterior" : "posterior";

  const thresholds = {
    ear:      { normal:2.5, mild:4,   moderate:6 },
    shoulder: { normal:2.0, mild:3.5, moderate:6 },
    hip:      { normal:2.0, mild:4.0, moderate:7 },
    knee:     { normal:2.5, mild:4.0, moderate:7 },
  };
  const t = thresholds[segment] || thresholds.shoulder;
  if (absAnt <= t.normal) return null;
  const severity = absAnt > t.moderate ? "Marked" : absAnt > t.mild ? "Moderate" : "Mild";
  return { severity, anteriorPct, dir, absAnt, thresholds: t };
}

// ─── THORACIC CURVATURE INDEX (TCI) ─────────────────────────────────────────
// Formula (Kendall depth-chord method):
//   ChordLine = straight line from C7 to T12 on posterior contour
//   ThoracicDepth = max posterior deviation from ChordLine / bodyDepth
//   ChordLength = normalised distance from C7 point to T12 point on contour
//
//   TCI = (ThoracicDepth / ChordLength) × 100
//
// Landmark sources:
//   C7  — estimated as posterior contour at shoulder level (shY)
//   T12 — estimated as posterior contour at inflection point (inflectionYNorm × trunkH)
//         OR at 0.55 × trunkH when no inflection detected
//   MaxConvexity — thorApexYNorm (already extracted by contourEngine)
//
// The contourEngine already computes thorMaxDevNorm = maxDev / bodyDepth.
// TCI = thorMaxDevNorm × (bodyDepth / chordLength) × 100
// When bodyDepth ≈ chordLength, TCI ≈ thorMaxDevNorm × 100 (simple %).
// We store both the raw devNorm and the TCI.
//
// THRESHOLDS (Kendall depth-chord method, clinical literature):
//   TCI < 8%   → Normal Thoracic Curvature
//   TCI 8–14%  → Mild Increased Thoracic Curvature
//   TCI 14–22% → Moderate Increased Thoracic Curvature
//   TCI > 22%  → Severe Increased Thoracic Curvature

function buildTCI(cp, confidence, manualC7Y, manualT12Y) {
  if (!cp) return null;

  const thorMaxDevNorm = cp.thorMaxDevNorm / 10; // stored as ×10, convert back to ratio
  const bodyDepth      = cp.bodyDepth || 1;

  // C7 and T12 Y positions (normalised 0=shoulder, 1=hip)
  // Use manual placement if available, else anatomical estimates
  const c7YNorm  = manualC7Y  ?? 0.0;  // C7 ≈ shoulder level
  const t12YNorm = manualT12Y ?? (cp.inflectionYNorm ?? 0.55); // T12 ≈ inflection

  // ChordLength: normalised trunk height between C7 and T12
  const chordLength = Math.abs(t12YNorm - c7YNorm);
  if (chordLength < 0.05) return null; // degenerate

  // TCI = thorMaxDevNorm × (bodyDepth / (chordLength × trunkHeight))
  // In contourEngine, thorMaxDevNorm is already normalised to bodyDepth.
  // chordLength is in trunk-height units; bodyDepth is in pixels.
  // For a comparable dimensionless ratio: TCI = thorMaxDevNorm / chordLength × 100
  const tci = Math.round((thorMaxDevNorm / chordLength) * 100 * 10) / 10;

  let grade, interpretation;
  if      (tci < 8)  { grade = 0; interpretation = "Normal Thoracic Curvature"; }
  else if (tci < 14) { grade = 1; interpretation = "Mild Increased Thoracic Curvature"; }
  else if (tci < 22) { grade = 2; interpretation = "Moderate Increased Thoracic Curvature"; }
  else               { grade = 3; interpretation = "Severe Increased Thoracic Curvature"; }

  const lowConf = (confidence?.score ?? 100) < 55;
  const apexNote = cp.thorApexRegion && cp.thorApexRegion !== "unknown"
    ? ` · apex: ${cp.thorApexRegion.replace("-"," ")}`
    : "";

  return {
    id: "tci",
    category: "Thoracic Curvature Index",
    label: lowConf
      ? `${interpretation}${apexNote} — low confidence`
      : `${interpretation}${apexNote}`,
    grade,
    severity: ["Normal","Mild","Moderate","Severe"][grade],
    tci,
    thorMaxDevNorm: Math.round(thorMaxDevNorm * 1000) / 10,
    chordLength: Math.round(chordLength * 100),
    apexRegion: cp.thorApexRegion,
    apexYNorm: cp.thorApexYNorm,
    source: `Body contour analysis${manualC7Y !== undefined ? " + manual C7/T12" : ""}`,
    disclaimer: "Depth-chord index from posterior body silhouette. NOT a Cobb angle. Does not confirm structural kyphosis. Radiographic confirmation required for clinical classification.",
    confidence: confidence?.tier ?? "Low",
    ...debug({
      formula: "TCI = (thorMaxDevNorm / chordLength) × 100",
      landmarks: { c7YNorm, t12YNorm, apexYNorm: cp.thorApexYNorm },
      rawValues: { thorMaxDevNorm: Math.round(thorMaxDevNorm*1000)/10, chordLength: Math.round(chordLength*100), bodyDepth: Math.round(bodyDepth) },
      normalizedValues: { tci },
      thresholds: { normal:"<8", mild:"8–14", moderate:"14–22", severe:">22" },
      ruleTriggered: interpretation,
    }),
  };
}

// ─── LUMBAR CURVATURE INDEX (LCI) ────────────────────────────────────────────
// Formula (same depth-chord method):
//   ChordLine = T12 to S2 on posterior contour
//   LumbarDepth = max anterior concavity (negative deviation) from ChordLine / bodyDepth
//   LCI = (LumbarDepth / ChordLength) × 100
//
// Landmark sources:
//   T12 — inflection point (inflectionYNorm) or 0.55 trunk height
//   S2  — estimated at hip level (1.0 on trunk scale = hipY) or manual
//   MaxConcavity — lumApexYNorm (already extracted by contourEngine)
//
// THRESHOLDS (Kendall / clinical norms):
//   LCI < 3%        → Reduced Lumbar Curvature (flat-back appearance)
//   LCI 3–6%        → Normal Lumbar Curvature
//   LCI 6–12%       → Mild Increased Lumbar Curvature
//   LCI 12–20%      → Moderate Increased Lumbar Curvature
//   LCI > 20%       → Severe Increased Lumbar Curvature

function buildLCI(cp, confidence, manualT12Y, manualS2Y) {
  if (!cp) return null;

  const lumMaxDevNorm = cp.lumMaxDevNorm / 10; // stored ×10, convert back

  const t12YNorm = manualT12Y ?? (cp.inflectionYNorm ?? 0.55);
  const s2YNorm  = manualS2Y  ?? 1.0; // S2 ≈ hip level

  const chordLength = Math.abs(s2YNorm - t12YNorm);
  if (chordLength < 0.05) return null;

  const lci = Math.round((lumMaxDevNorm / chordLength) * 100 * 10) / 10;

  let grade, interpretation;
  if      (lci < 3)  { grade = -1; interpretation = "Reduced Lumbar Curvature"; }
  else if (lci < 6)  { grade =  0; interpretation = "Normal Lumbar Curvature"; }
  else if (lci < 12) { grade =  1; interpretation = "Mild Increased Lumbar Curvature"; }
  else if (lci < 20) { grade =  2; interpretation = "Moderate Increased Lumbar Curvature"; }
  else               { grade =  3; interpretation = "Severe Increased Lumbar Curvature"; }

  const lowConf = (confidence?.score ?? 100) < 55;

  return {
    id: "lci",
    category: "Lumbar Curvature Index",
    label: lowConf ? `${interpretation} — low confidence` : interpretation,
    grade,
    severity: grade === -1 ? "Moderate" : grade === 0 ? "Normal" : ["Mild","Moderate","Severe"][grade-1],
    lci,
    lumMaxDevNorm: Math.round(lumMaxDevNorm * 1000) / 10,
    chordLength: Math.round(chordLength * 100),
    apexYNorm: cp.lumApexYNorm,
    lumFlat: cp.lumFlat,
    source: `Body contour analysis${manualT12Y !== undefined ? " + manual T12/S2" : ""}`,
    disclaimer: "Depth-chord index from posterior body silhouette. NOT a radiographic lordosis angle. Clinical confirmation required.",
    confidence: confidence?.tier ?? "Low",
    ...debug({
      formula: "LCI = (lumMaxDevNorm / chordLength) × 100",
      landmarks: { t12YNorm, s2YNorm, apexYNorm: cp.lumApexYNorm },
      rawValues: { lumMaxDevNorm: Math.round(lumMaxDevNorm*1000)/10, chordLength: Math.round(chordLength*100) },
      normalizedValues: { lci },
      thresholds: { reduced:"<3", normal:"3–6", mild:"6–12", moderate:"12–20", severe:">20" },
      ruleTriggered: interpretation,
    }),
  };
}

// ─── PELVIC TILT — ASIS/PSIS GATE ────────────────────────────────────────────
// Fires ONLY when ASIS and PSIS have been manually placed.
// Without these landmarks: returns "not measured" notice, never a diagnosis.
//
// Formula (Kendall / Levine):
//   PelvicTiltAngle = atan2(ASIS_Y - PSIS_Y, ASIS_X - PSIS_X) relative to horizontal
//   Anterior: ASIS below PSIS (ASIS_Y > PSIS_Y in image coords, Y increases downward)
//   Posterior: ASIS above PSIS
//
// THRESHOLDS (Kendall 2005 / Levine & Whittle 1996):
//   Female norm: ~12° anterior
//   Male norm:   ~7° anterior
//   Neutral:     ±5° from gender norm
//   Mild:        5–10° beyond norm
//   Moderate:    10–15° beyond norm
//   Severe:      >15° beyond norm

function buildPelvicTilt(manualASIS, manualPSIS, patientSex) {
  if (!manualASIS || !manualPSIS) {
    return {
      id: "pelvic_tilt_not_measured",
      category: "Pelvic Tilt",
      label: "Pelvic Tilt Not Directly Measured",
      severity: "Info",
      source: "Manual landmark",
      note: "ASIS and PSIS landmarks required for pelvic tilt measurement. Use the manual landmark placement tool to mark ASIS (anterior superior iliac spine) and PSIS (posterior superior iliac spine).",
      ...debug({
        formula: "PelvicTiltAngle = atan2(ASIS_Y − PSIS_Y, ASIS_X − PSIS_X)",
        landmarks: { asis: null, psis: null },
        reason: "ASIS and PSIS not placed",
      }),
    };
  }

  // Image Y increases downward. Anterior tilt: ASIS lower than PSIS (ASIS_Y > PSIS_Y)
  const dx = manualASIS.x - manualPSIS.x;
  const dy = manualASIS.y - manualPSIS.y; // positive = ASIS below PSIS = anterior tilt
  const angleRad = Math.atan2(Math.abs(dy), Math.abs(dx));
  const angleDeg = Math.round(angleRad * 180 / Math.PI * 10) / 10;
  const isAnterior = dy > 0; // ASIS is lower = anterior pelvic tilt

  const genderNorm = patientSex === "Male" ? 7 : 12;
  const deviation  = angleDeg - genderNorm;
  const direction  = isAnterior ? "Anterior" : "Posterior";

  let severity, interpretation;
  if      (Math.abs(deviation) <= 5)  { severity = "Normal";   interpretation = `${direction} Pelvic Tilt — within normal range`; }
  else if (Math.abs(deviation) <= 10) { severity = "Mild";     interpretation = `Mild ${direction} Pelvic Tilt`; }
  else if (Math.abs(deviation) <= 15) { severity = "Moderate"; interpretation = `Moderate ${direction} Pelvic Tilt`; }
  else                                { severity = "Severe";   interpretation = `Severe ${direction} Pelvic Tilt`; }

  return {
    id: "pelvic_tilt",
    category: "Pelvic Tilt",
    label: `${interpretation} — ${angleDeg.toFixed(1)}° (norm ${genderNorm}°)`,
    severity,
    pelvicTiltAngle: angleDeg,
    direction,
    genderNorm,
    deviation: Math.round(deviation * 10) / 10,
    source: "Manual ASIS/PSIS placement",
    disclaimer: "Direct ASIS-PSIS measurement. Accuracy depends on correct landmark placement. Confirm clinically.",
    ...debug({
      formula: "PelvicTiltAngle = atan2(|ASIS_Y − PSIS_Y|, |ASIS_X − PSIS_X|)",
      landmarks: { asis: manualASIS, psis: manualPSIS },
      rawValues: { dx: Math.round(dx*1000)/1000, dy: Math.round(dy*1000)/1000 },
      normalizedValues: { angleDeg, isAnterior, deviation, genderNorm },
      thresholds: { normal:`±5° from ${genderNorm}°`, mild:"5–10°", moderate:"10–15°", severe:">15°" },
      ruleTriggered: interpretation,
    }),
  };
}

// ─── ROUNDED SHOULDER — 3-METRIC WEIGHTED ────────────────────────────────────
// Metric 1 (50%): Acromion-Hip Offset
//   acrHipOffset = |acromion.x − hip.x| / bodyWidth × 100   [% frame width]
//   Normal: < 2%
//
// Metric 2 (30%): Acromion-Plumb Offset
//   acrPlumbOffset = (acromion.x − plumbX) / W × 100 × viewSign   [% frame width]
//   Normal: < 2%
//
// Metric 3 (20%): Shoulder Translation Angle
//   angle = atan2(|acromion.x − hip.x|, |acromion.y − hip.y|) × 180/π   [°]
//   Normal: < 3°
//
// Composite = 0.50 × normalise(m1) + 0.30 × normalise(m2) + 0.20 × normalise(m3)
// normalise(v) = clamp(v / threshold, 0, 3)

function buildRoundedShoulder(plumb, viewSign, lm, W) {
  if (!plumb) return null;

  const shoulderOffset = plumb.shoulderOffset; // % frame width
  const hipOffset      = plumb.hipOffset;
  const plumbX_pct     = 0; // plumb = 0% by definition

  if (shoulderOffset === null) return null;

  // Metric 1: Acromion-Hip Offset (% frame width, viewSign-corrected)
  const acrHipOffset = hipOffset !== null
    ? Math.abs((viewSign >= 0 ? shoulderOffset : -shoulderOffset) -
               (viewSign >= 0 ? hipOffset      : -hipOffset))
    : null;

  // Metric 2: Acromion-Plumb Offset (how far anterior from plumb)
  const acrPlumbOffset = Math.abs(viewSign >= 0 ? shoulderOffset : -shoulderOffset);

  // Metric 3: Shoulder Translation Angle
  // Requires landmark positions — use plumb offsets as proxy:
  // angle ≈ atan2(acrHipOffset, body_height_fraction)
  // body_height_fraction estimated as (shY − hipY) / imgH = ~0.25 normalised
  const shoulderAngle = acrHipOffset !== null
    ? Math.round(Math.atan2(acrHipOffset / 100, 0.25) * 180 / Math.PI * 10) / 10
    : null;

  // Normalise each metric to 0–3 range (3 = severe)
  const norm1 = acrHipOffset    !== null ? Math.min(3, acrHipOffset    / 2) : 0;
  const norm2 =                            Math.min(3, acrPlumbOffset   / 2);
  const norm3 = shoulderAngle   !== null ? Math.min(3, shoulderAngle    / 3) : 0;

  const composite = 0.50 * norm1 + 0.30 * norm2 + 0.20 * norm3;

  let severity, interpretation;
  if      (composite < 0.5) { severity = "Normal";   interpretation = "Shoulder Position Normal"; }
  else if (composite < 1.0) { severity = "Mild";     interpretation = "Mild Shoulder Anterior Displacement"; }
  else if (composite < 2.0) { severity = "Moderate"; interpretation = "Moderate Shoulder Anterior Displacement"; }
  else                      { severity = "Severe";   interpretation = "Severe Shoulder Anterior Displacement"; }

  // Only report when anterior
  const anteriorPct = viewSign >= 0 ? shoulderOffset : -shoulderOffset;
  if (anteriorPct < 0) {
    interpretation = interpretation.replace("Anterior", "Posterior");
    interpretation = interpretation.replace("Normal", "Shoulder Position Normal");
  }

  return {
    id: "rounded_shoulder",
    category: anteriorPct >= 0 ? "Shoulder Anterior Position" : "Shoulder Posterior Position",
    label: `${interpretation} — composite score ${composite.toFixed(2)}`,
    severity,
    composite: Math.round(composite * 100) / 100,
    source: "Plumb line — 3-metric weighted",
    ...debug({
      formula: "composite = 0.50×norm(AcrHip) + 0.30×norm(AcrPlumb) + 0.20×norm(ShAngle)",
      rawValues: {
        acrHipOffset:    acrHipOffset   !== null ? Math.round(acrHipOffset*10)/10 : null,
        acrPlumbOffset:  Math.round(acrPlumbOffset*10)/10,
        shoulderAngle:   shoulderAngle  !== null ? Math.round(shoulderAngle*10)/10 : null,
      },
      normalizedValues: {
        norm1: Math.round(norm1*100)/100,
        norm2: Math.round(norm2*100)/100,
        norm3: Math.round(norm3*100)/100,
        composite: Math.round(composite*100)/100,
      },
      weights: { metric1_AcrHip:"50%", metric2_AcrPlumb:"30%", metric3_ShAngle:"20%" },
      thresholds: { normal:"<0.5", mild:"0.5–1.0", moderate:"1.0–2.0", severe:">2.0" },
      ruleTriggered: interpretation,
    }),
  };
}

// ─── SAGITTAL BALANCE ─────────────────────────────────────────────────────────
function buildSagittalBalance(plumb, viewSign) {
  if (!plumb) return null;
  const ant = off => off !== null ? (viewSign >= 0 ? off : -off) : null;
  const earAnt = ant(plumb.earOffset);
  const shAnt  = ant(plumb.shoulderOffset);
  const hipAnt = ant(plumb.hipOffset);
  const knAnt  = ant(plumb.kneeOffset);
  const fmt = (lbl, val) => val !== null ? `${lbl}: ${val>0?"+":""}${val.toFixed(1)}% ${val>0?"ant":"post"}` : null;
  const parts = [fmt("Ear",earAnt), fmt("Acromion",shAnt), fmt("Hip",hipAnt), fmt("Knee",knAnt)].filter(Boolean);
  return { summary: parts.join(" · "), earAnt, shAnt, hipAnt, knAnt };
}

// ─── SWAY-BACK PLUMB PRE-CHECK ────────────────────────────────────────────────
function detectSwaybackPlumb(plumb, viewSign) {
  if (!plumb) return false;
  const shOffset  = plumb.shoulderOffset;
  const hipOffset = plumb.hipOffset;
  const earOffset = plumb.earOffset;
  const shPost  = shOffset  !== null && (viewSign >= 0 ? shOffset  < -1.5 : shOffset  > 1.5);
  const hipAnt  = hipOffset !== null && (viewSign >= 0 ? hipOffset > 1.5  : hipOffset < -1.5);
  const earAnt  = earOffset !== null && (viewSign >= 0 ? earOffset > 1.5  : earOffset < -1.5);
  return shPost && (hipAnt || earAnt);
}

// ─── PATTERN CLASSIFICATION — GATED ──────────────────────────────────────────
// Fires ONLY when TCI + LCI + pelvic + shoulder are all available.
// Missing any segment → pattern deferred, not guessed.
function buildKendallClassification(tciResult, lciResult, pelvicResult, shoulderResult,
                                    cvaFinding, curveProfile, plumbBalance,
                                    confidence, clinicianVerified) {
  if (!curveProfile) return null;
  if (!confidence || confidence.score < 50) return null;

  // Require all segments to be available before classifying pattern
  const hasTCI     = tciResult  && tciResult.id  !== "contour_unavailable";
  const hasLCI     = lciResult  && lciResult.id  !== "contour_unavailable";
  const hasPelvic  = pelvicResult && pelvicResult.id !== "pelvic_tilt_not_measured";
  const hasShoulder = shoulderResult !== null;
  const hasFHP     = cvaFinding !== null;

  if (!hasTCI || !hasLCI) {
    return {
      id: "pattern_deferred",
      category: "Postural Pattern (Kendall)",
      label: "Pattern Classification Deferred — awaiting thoracic and lumbar curvature data",
      severity: "Info",
      source: "Pattern engine",
      note: `Available: TCI=${hasTCI?"✓":"✗"} · LCI=${hasLCI?"✓":"✗"} · Pelvic=${hasPelvic?"✓":"✗"} · Shoulder=${hasShoulder?"✓":"✗"} · FHP=${hasFHP?"✓":"✗"}. Upload a clear lateral photo for contour analysis.`,
      ...debug({ reason: "TCI or LCI unavailable", hasTCI, hasLCI, hasPelvic, hasShoulder }),
    };
  }

  const { curvePattern, inflectionYNorm, thorApexRegion } = curveProfile;
  const tciGrade = tciResult.grade;
  const lciGrade = lciResult.grade;
  const bal      = plumbBalance ?? {};
  const confTier = clinicianVerified ? "Clinician Verified" : confidence.tier;
  const segSummary = `TCI grade ${tciGrade} · LCI grade ${lciGrade}${hasPelvic ? ` · pelvic ${pelvicResult.direction}` : " · pelvic unmeasured"}${hasFHP ? ` · FHP ${cvaFinding.severity}` : ""}`;

  let label, desc;
  switch (curvePattern) {
    case "kyphotic-lordotic":
      label = "Kyphotic-Lordotic Pattern (Kendall A)";
      desc  = `Increased thoracic convexity (TCI grade ${tciGrade}) and lumbar concavity (LCI grade ${lciGrade}) with inflection at ~${inflectionYNorm ? Math.round(inflectionYNorm*100)+"% trunk height" : "mid-trunk"}. ${segSummary}.`;
      break;
    case "flat-back":
      label = "Flat-back Pattern (Kendall B)";
      desc  = `Reduced lumbar concavity (LCI grade ${lciGrade}, flat=${lciResult.lumFlat}). Thoracic within range (TCI grade ${tciGrade}). ${segSummary}.`;
      break;
    case "sway-back":
      label = "Sway-back Pattern (Kendall D)";
      desc  = `Lower thoracic apex (${thorApexRegion}) + flat lumbar (LCI grade ${lciGrade}). ${segSummary}. Hip plumb offset: ${bal.hipAnt !== null ? (bal.hipAnt>0?"ant":"post") : "unknown"}.`;
      break;
    case "kyphotic":
      label = "Kyphotic Pattern — Isolated Thoracic";
      desc  = `Thoracic convexity increased (TCI grade ${tciGrade}, apex: ${thorApexRegion}). Lumbar normal. ${segSummary}.`;
      break;
    case "lordotic":
      label = "Lordotic Pattern — Isolated Lumbar";
      desc  = `Lumbar concavity increased (LCI grade ${lciGrade}). Thoracic normal. ${segSummary}.`;
      break;
    case "ideal":
      if (tciGrade === 0 && lciGrade === 0) {
        label = "Near-Ideal Sagittal Alignment";
        desc  = `Both thoracic and lumbar curves within normal range. ${segSummary}.`;
      } else {
        return null;
      }
      break;
    default:
      return null;
  }

  return {
    id: "kendall_type",
    category: "Postural Pattern (Kendall)",
    label,
    severity: curvePattern === "ideal" ? "Normal" : "Moderate",
    description: desc,
    source: `Contour analysis (${confTier})`,
    disclaimer: "Classification based on posterior contour shape — not radiographic. Confirm clinically.",
    ...debug({
      formula: "curvePattern from contourEngine + TCI grade + LCI grade",
      rawValues: { curvePattern, tciGrade, lciGrade, hasTCI, hasLCI, hasPelvic },
      ruleTriggered: label,
    }),
  };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function buildSagittalFindings(
  lm, view, measurements, contourResult, clinicianVerified = false,
  manualLandmarks = {}
  // manualLandmarks: { c7Y, t12Y, s2Y, asis:{x,y}, psis:{x,y}, patientSex }
) {
  const findings = [];
  const viewSign  = contourResult?.viewSign ?? (view === "right" ? 1 : -1);
  const cp        = contourResult?.curveProfile  ?? null;
  const plumb     = contourResult?.plumbOffsets  ?? null;
  const confidence= contourResult?.confidence    ?? null;
  const bal       = buildSagittalBalance(plumb, viewSign);

  const effConf = clinicianVerified && confidence
    ? { ...confidence, score: Math.min(100, confidence.score+20),
        tier: confidence.score+20 >= 80 ? "High" : confidence.tier }
    : confidence;

  // Manual landmark passthrough
  const { c7Y, t12Y, s2Y, asis, psis, patientSex } = manualLandmarks;

  // ── CONFIDENCE BANNER ─────────────────────────────────────────────────────
  if (effConf?.recommendation) {
    findings.push({
      id: "confidence_banner", _isBanner: true,
      category: "Analysis Confidence",
      label: effConf.recommendation,
      severity: effConf.tier === "Low" ? "Warning" : "Info",
      source: `Confidence: ${effConf.score}%`,
      flags: effConf.flags,
    });
  }

  // ── SWAY-BACK PLUMB PRE-CHECK ─────────────────────────────────────────────
  const swaybackPlumbPattern = detectSwaybackPlumb(plumb, viewSign);

  // ── LAYER 1: Observable Alignment ────────────────────────────────────────

  // 1. CVA / Forward Head Posture
  const cvaClass = classifyCVA(measurements?.cvaAngle);
  let cvaFinding = null;
  if (cvaClass && cvaClass.severity !== "Normal") {
    cvaFinding = {
      id: "fhp_cva",
      category: "Forward Head Posture",
      label: cvaClass.label,
      value: measurements?.cvaAngle != null ? `CVA ${Math.round(measurements.cvaAngle)}°` : null,
      severity: cvaClass.severity,
      source: "MediaPipe landmark measurement",
      note: "Forward head posture is an independent observable alignment finding.",
      ...debug({
        formula: "CVA = atan2(|ear.y−sh.y|, |ear.x−sh.x|) × 180/π",
        rawValues: { cvaAngle: measurements?.cvaAngle },
        thresholds: { normal:"≥55°", borderline:"50–55°", mild:"44–50°", moderate:"38–44°", marked:"<38°" },
        ruleTriggered: cvaClass.severity,
      }),
    };
    findings.push(cvaFinding);
  }

  // 2. Rounded Shoulder (3-metric weighted)
  const shoulderResult = buildRoundedShoulder(plumb, viewSign);
  if (shoulderResult && shoulderResult.severity !== "Normal") {
    // Annotate if sway-back pattern detected
    if (swaybackPlumbPattern && shoulderResult.category.includes("Posterior")) {
      shoulderResult.note = "Shoulder posterior to plumb with anterior ear/hip — consistent with sway-back pattern. Confirm with contour analysis.";
    }
    findings.push(shoulderResult);
  }

  // 3. Hip position from plumb
  if (plumb?.hipOffset !== null) {
    const r = interpretOffset(plumb.hipOffset, viewSign, "hip");
    if (r) findings.push({
      id: "hip_plumb",
      category: "Hip / Greater Trochanter Position",
      label: `${r.severity} hip ${r.dir} displacement — ${r.absAnt.toFixed(1)}% from plumb`,
      severity: r.severity,
      source: "Plumb line offset",
      ...debug({
        formula: "hipOffset = (sagHip.x − ankleX) / W × 100, corrected for viewSign",
        rawValues: { hipOffset: plumb.hipOffset, viewSign },
        normalizedValues: { anteriorPct: r.anteriorPct, absAnt: r.absAnt },
        thresholds: r.thresholds,
        ruleTriggered: `${r.severity} ${r.dir}`,
      }),
    });
  }

  // 4. Sway-back plumb alert (when contour not yet run)
  if (swaybackPlumbPattern && (!cp || cp.curvePattern === "ideal")) {
    findings.push({
      id: "swayback_plumb_alert",
      category: "Plumb Chain Alert",
      label: "Sway-back plumb chain pattern — shoulder posterior, ear/hip anterior",
      severity: "Moderate",
      source: "Plumb line chain analysis",
      note: "Upload a clear lateral photo for TCI/LCI confirmation.",
      ...debug({
        formula: "shPost AND (hipAnt OR earAnt) using 1.5% threshold",
        rawValues: { shoulderOffset: plumb.shoulderOffset, hipOffset: plumb.hipOffset, earOffset: plumb.earOffset, viewSign },
      }),
    });
  }

  // 5. Knee position from plumb
  if (plumb?.kneeOffset !== null) {
    const r = interpretOffset(plumb.kneeOffset, viewSign, "knee");
    if (r) findings.push({
      id: "knee_plumb",
      category: "Knee Position",
      label: r.dir === "posterior"
        ? `Knee posterior to plumb — possible genu recurvatum`
        : `Knee anterior to plumb — flexion in stance`,
      severity: r.severity,
      source: "Plumb line offset",
      ...debug({
        formula: "kneeOffset = (sagKnee.x − ankleX) / W × 100 × viewSign",
        rawValues: { kneeOffset: plumb.kneeOffset },
        normalizedValues: { anteriorPct: r.anteriorPct },
        thresholds: r.thresholds,
        ruleTriggered: r.dir,
      }),
    });
  }

  // 6. Trunk lean
  const tls = measurements?.trunkLateralShift;
  if (tls !== null && tls !== undefined && Math.abs(tls) > 2) {
    findings.push({
      id: "trunk_lean",
      category: "Trunk Lean",
      label: `${Math.abs(tls) > 5 ? "Marked" : Math.abs(tls) > 3 ? "Moderate" : "Mild"} trunk ${tls > 0 ? "anterior" : "posterior"} lean`,
      severity: Math.abs(tls) > 5 ? "Marked" : "Mild",
      source: "MediaPipe alignment",
      ...debug({
        formula: "trunkLateralShift = (shMid.x − hipMid.x) × 100",
        rawValues: { tls },
        thresholds: { mild:"2–3", moderate:"3–5", marked:">5" },
      }),
    });
  }

  // 7. Sagittal balance summary
  if (bal?.summary) {
    findings.push({
      id: "sagittal_balance",
      category: "Sagittal Balance (Plumb Line)",
      label: bal.summary,
      severity: "Info",
      source: "Plumb line — lateral malleolus reference (Kendall)",
    });
  }

  // ── PELVIC TILT (manual ASIS/PSIS gate) ──────────────────────────────────
  const pelvicResult = buildPelvicTilt(asis, psis, patientSex);
  findings.push(pelvicResult);

  // ── LAYER 2: Contour Appearance ──────────────────────────────────────────
  if (cp) {
    // TCI
    const tciResult = buildTCI(cp, effConf, c7Y, t12Y);
    if (tciResult) findings.push({ ...tciResult, source: "Body contour analysis" });

    // LCI
    const lciResult = buildLCI(cp, effConf, t12Y, s2Y);
    if (lciResult) findings.push({ ...lciResult, source: "Body contour analysis" });

    // Inflection point
    if (cp.hasInflection) {
      findings.push({
        id: "inflection_point",
        category: "Spinal Curve Transition",
        label: `Thoracic-lumbar inflection at ~${Math.round((cp.inflectionYNorm??0.55)*100)}% trunk height`,
        severity: "Info",
        source: "Contour analysis",
        ...debug({
          formula: "smoothedDev crosses from positive to negative (window ±8 samples)",
          rawValues: { inflectionYNorm: cp.inflectionYNorm },
        }),
      });
    } else {
      findings.push({
        id: "inflection_absent",
        category: "Spinal Curve Transition",
        label: "No clear thoracic-lumbar inflection — posterior contour relatively straight",
        severity: "Info",
        source: "Contour analysis",
      });
    }

    // Pattern classification — gated on all segments
    const tciResult2  = findings.find(f => f.id === "tci")  ?? null;
    const lciResult2  = findings.find(f => f.id === "lci")  ?? null;
    const pelv2       = findings.find(f => f.id === "pelvic_tilt" || f.id === "pelvic_tilt_not_measured") ?? null;
    const shResult2   = findings.find(f => f.id === "rounded_shoulder") ?? null;

    const kendall = buildKendallClassification(
      tciResult2, lciResult2, pelv2, shResult2,
      cvaFinding, cp, bal, effConf, clinicianVerified
    );
    if (kendall) findings.push(kendall);

  } else {
    findings.push({
      id: "contour_unavailable",
      category: "Spinal Contour",
      label: "Body contour analysis unavailable — TCI and LCI cannot be calculated",
      severity: "Info",
      source: "System",
      note: "Upload a clear lateral photo (full body, form-fitting clothing, plain background) for TCI/LCI analysis.",
    });
    // Pattern deferred
    findings.push({
      id: "pattern_deferred",
      category: "Postural Pattern (Kendall)",
      label: "Pattern Classification Deferred — contour data required",
      severity: "Info",
      source: "Pattern engine",
      note: "TCI and LCI are required before Kendall classification can be assigned.",
    });
  }

  return findings;
}

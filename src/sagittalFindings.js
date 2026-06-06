// sagittalFindings.js — Clinical Findings Layer for Lateral Posture Analysis
//
// CRITICAL DESIGN RULE
// This module does NOT diagnose thoracic kyphosis or lumbar lordosis from MediaPipe
// landmarks alone. MediaPipe provides joint positions (shoulder, hip, ear) — not
// vertebral positions. These are OBSERVABLE ALIGNMENT FINDINGS only.
//
// Architecture (Kendall framework):
//   Layer 1 — MediaPipe alignment measurements (CVA, FHP, shoulder/hip translation)
//   Layer 2 — Body contour appearance indices (TCAI, LCAI from contourEngine.js)
//   Merged  — Combined sagittal findings with confidence-gated reporting
//
// Terminology follows Kendall FP et al., Muscles: Testing and Function, 5th ed.
// "Thoracic Contour Appearance" replaces "Thoracic Kyphosis X°"
// "Lumbar Contour Appearance"   replaces "Lumbar Lordosis X°"

// ─── CVA severity classification ─────────────────────────────────────────────
// Craniovertebral Angle (ear–C7 horizontal): lower = more FHP
// Literature reference: Yip et al. 2008 — normal ≥ 50°; symptomatic < 49°
function classifyCVA(angleDeg) {
  if (angleDeg === null || angleDeg === undefined) return null;
  if (angleDeg >= 50) return { severity: "Normal",   label: "Normal craniovertebral angle" };
  if (angleDeg >= 44) return { severity: "Mild",     label: "Mild forward head posture" };
  if (angleDeg >= 38) return { severity: "Moderate", label: "Moderate forward head posture" };
  return               { severity: "Severe",  label: "Marked forward head posture" };
}

// ─── Shoulder translation relative to plumb line ──────────────────────────────
// Shoulder anterior to plumb (lateral malleolus) = rounded/protracted
// Reported as observable translation, NOT as evidence of thoracic kyphosis.
function classifyShoulderTranslation(offsetPct, viewSign) {
  if (offsetPct === null) return null;
  // For right-facing person: anterior = positive x offset relative to ankle
  // For left-facing person: anterior = negative x offset
  // viewSign adjusts direction
  const anteriorDev = viewSign >= 0 ? offsetPct : -offsetPct;

  if (Math.abs(anteriorDev) < 2)  return { severity: "Normal",   label: "Shoulder within normal plumb alignment" };
  if (anteriorDev > 6)            return { severity: "Marked",   label: "Marked shoulder anterior translation" };
  if (anteriorDev > 3)            return { severity: "Moderate", label: "Shoulder anterior translation" };
  if (anteriorDev > 2)            return { severity: "Mild",     label: "Mild shoulder anterior translation" };
  if (anteriorDev < -2)           return { severity: "Mild",     label: "Shoulder posterior translation" };
  return null;
}

// ─── Hip translation relative to plumb line ──────────────────────────────────
function classifyHipTranslation(offsetPct, viewSign) {
  if (offsetPct === null) return null;
  const anteriorDev = viewSign >= 0 ? offsetPct : -offsetPct;

  if (Math.abs(anteriorDev) < 2)  return null; // within normal
  if (anteriorDev > 4)            return { severity: "Marked",   label: "Marked hip anterior translation (sway-back pattern)" };
  if (anteriorDev > 2)            return { severity: "Moderate", label: "Hip anterior translation" };
  if (anteriorDev < -3)           return { severity: "Moderate", label: "Hip posterior displacement" };
  return null;
}

// ─── Trunk lean ───────────────────────────────────────────────────────────────
// Shoulder midpoint relative to hip midpoint — indicates trunk sway/lean
function classifyTrunkLean(measurements) {
  const trunkLean = measurements?.trunkLateralShift;
  if (trunkLean === null || trunkLean === undefined) return null;
  const abs = Math.abs(trunkLean);
  if (abs < 1.5) return null;
  if (abs < 3)   return { severity: "Mild",     label: `Mild trunk ${trunkLean < 0 ? "posterior" : "anterior"} lean (${Math.abs(trunkLean).toFixed(1)}% frame width)` };
  if (abs < 6)   return { severity: "Moderate", label: `Trunk ${trunkLean < 0 ? "posterior" : "anterior"} lean` };
  return           { severity: "Marked",   label: `Marked trunk ${trunkLean < 0 ? "posterior" : "anterior"} lean` };
}

// ─── Knee position ───────────────────────────────────────────────────────────
function classifyKneePosition(offsetPct, viewSign) {
  if (offsetPct === null) return null;
  const anteriorDev = viewSign >= 0 ? offsetPct : -offsetPct;
  if (anteriorDev > 3) return { severity: "Mild", label: "Knee anterior to plumb line" };
  if (anteriorDev < -3) return { severity: "Mild", label: "Knee posterior to plumb line (possible hyperextension)" };
  return null;
}

// ─── Plumb line sagittal balance summary ─────────────────────────────────────
// Interprets the overall sagittal chain relative to plumb line.
// Reference: Kendall ideal = ear / acromion / trochanter / just anterior to knee / lateral malleolus
function buildSagittalBalanceSummary(plumbOffsets, viewSign) {
  if (!plumbOffsets) return null;
  const { earOffset, shoulderOffset, hipOffset } = plumbOffsets;

  const dir = viewSign >= 0 ? 1 : -1;
  const earAnt  = earOffset  !== null ? earOffset  * dir : null;
  const shAnt   = shoulderOffset !== null ? shoulderOffset * dir : null;
  const hipAnt  = hipOffset  !== null ? hipOffset  * dir : null;

  const parts = [];
  if (earAnt  !== null) parts.push(`Ear: ${earAnt  > 0 ? "+" : ""}${earAnt.toFixed(1)}% anterior`);
  if (shAnt   !== null) parts.push(`Acromion: ${shAnt > 0 ? "+" : ""}${shAnt.toFixed(1)}% anterior`);
  if (hipAnt  !== null) parts.push(`Hip: ${hipAnt > 0 ? "+" : ""}${hipAnt.toFixed(1)}% anterior`);

  // Classify overall pattern
  let pattern = null;
  if (earAnt !== null && shAnt !== null && hipAnt !== null) {
    const allForward = earAnt > 2 && shAnt > 2 && hipAnt < 2;
    const swayBack   = earAnt > 2 && shAnt < 0 && hipAnt > 3;
    const flatBack   = earAnt > 1 && shAnt > 1 && hipAnt < -1;

    if (swayBack)   pattern = "Sway-back sagittal pattern (head and upper trunk forward, hips anterior, reduced lumbar)";
    else if (flatBack)  pattern = "Flat-back sagittal pattern (head and trunk forward, reduced lumbar concavity)";
    else if (allForward) pattern = "Forward sagittal shift (head and upper trunk anterior to plumb)";
  }

  return { summary: parts.join(" · "), pattern, earAnt, shAnt, hipAnt };
}

// ─── Thoracic contour finding ─────────────────────────────────────────────────
function buildThoracicFinding(tcai, confidence) {
  if (!tcai || tcai.label === "Insufficient data") return null;

  const lowConf = confidence?.score < 55;
  const label   = lowConf ? `${tcai.label} (low confidence — clinical confirmation required)` : tcai.label;

  return {
    category:    "Thoracic Contour Appearance",
    label,
    grade:       tcai.grade,
    severity:    ["Normal", "Mild", "Moderate", "Marked"][tcai.grade] || "Normal",
    // CRITICAL: this is an APPEARANCE INDEX, not a Cobb angle
    disclaimer:  "This is a visual contour appearance index, not a radiographic measurement. Does not imply Cobb angle.",
    confidence:  confidence?.tier || "Low",
  };
}

// ─── Lumbar contour finding ───────────────────────────────────────────────────
function buildLumbarFinding(lcai, confidence) {
  if (!lcai || lcai.label === "Insufficient data") return null;

  const lowConf = confidence?.score < 55;
  const label   = lowConf ? `${lcai.label} (low confidence — clinical confirmation required)` : lcai.label;

  return {
    category:    "Lumbar Contour Appearance",
    label,
    grade:       lcai.grade,
    severity:    ["Normal", "Mild", "Moderate", "Marked"][lcai.grade] || "Normal",
    disclaimer:  "This is a visual contour appearance index, not a radiographic measurement.",
    confidence:  confidence?.tier || "Low",
  };
}

// ─── Kendall postural type (contour-gated) ────────────────────────────────────
// Only classifies if BOTH contour and alignment data support the pattern.
// Without contour data, classification is withheld (not reported).
function classifyKendallType(tcai, lcai, plumbSummary, measurements, confidence) {
  // Require at least moderate confidence for classification
  if (!confidence || confidence.score < 55) return null;
  // Require contour data
  if (!tcai || !lcai) return null;

  const th = tcai.grade;   // thoracic: 0=normal, 1=mild, 2=mod, 3=marked
  const lu = lcai.grade;   // lumbar:   0=normal, 1=mild, 2=mod, 3=marked
  const earAnt = plumbSummary?.earAnt ?? 0;
  const hipAnt = plumbSummary?.hipAnt ?? 0;
  const shAnt  = plumbSummary?.shAnt  ?? 0;

  // Kyphotic-Lordotic: increased thoracic + increased lumbar + FHP + APT
  if (th >= 2 && lu >= 2 && earAnt > 3) {
    return { type: "Kyphotic-Lordotic Pattern", confidence: confidence.tier,
      description: "Increased thoracic and lumbar contour with forward head and anterior pelvic position — consistent with Kendall kyphotic-lordotic posture. Radiographic confirmation advised for clinical documentation." };
  }
  // Flat-back: reduced/normal lumbar + mild thoracic increase + FHP
  if (th >= 1 && lu === 0 && lcai.label?.includes("Reduced") && earAnt > 2) {
    return { type: "Flat-back Pattern", confidence: confidence.tier,
      description: "Reduced lumbar contour with forward head posture — consistent with Kendall flat-back posture. Hips appear extended." };
  }
  // Sway-back: lower thoracic increase + reduced lumbar + hips anterior + FHP
  if (th >= 1 && hipAnt > 3 && earAnt > 2 && shAnt < hipAnt) {
    return { type: "Sway-back Pattern", confidence: confidence.tier,
      description: "Hips anterior to plumb with forward head and thoracic contour change — consistent with Kendall sway-back posture." };
  }
  // Ideal / near-normal
  if (th === 0 && lu === 0 && Math.abs(earAnt) < 3) {
    return { type: "Near-Ideal Alignment", confidence: confidence.tier,
      description: "Sagittal contour and plumb line alignment within normal range." };
  }

  return null; // insufficient evidence for classification
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
// Generates all lateral sagittal findings from MediaPipe measurements + contour result.
//
// Parameters:
//   lm          — MediaPipe poseLandmarks
//   view        — "left" | "right"
//   measurements — output of AdvancedMeasurementEngine (Layer 1)
//   contourResult — output of analyzeSagittalContour (contourEngine.js), may be null
//   clinicianVerified — boolean: clinician has manually verified landmarks (raises confidence)
//
// Returns: findings[] array — each item is a clinical finding card for the UI
export function buildSagittalFindings(lm, view, measurements, contourResult, clinicianVerified = false) {
  const findings = [];
  const viewSign = contourResult?.viewSign ?? (view === "right" ? 1 : -1);
  const confidence = contourResult?.confidence ?? null;
  const plumb = contourResult?.plumbOffsets ?? null;

  // Boost confidence if clinician verified
  const effectiveConf = clinicianVerified && confidence
    ? { ...confidence, score: Math.min(100, confidence.score + 20), tier: confidence.score + 20 >= 80 ? "High" : confidence.tier, _clinicianBoosted: true }
    : confidence;

  // ── LAYER 1: Observable Alignment Findings (MediaPipe) ────────────────────

  // 1a. Forward Head Posture (CVA)
  const cva = measurements?.cva ?? null;
  const cvaClass = classifyCVA(cva);
  if (cvaClass) {
    findings.push({
      id: "fhp_cva",
      category: "Forward Head Posture",
      label: cvaClass.label,
      value: cva !== null ? `CVA: ${Math.round(cva)}°` : null,
      severity: cvaClass.severity,
      source: "MediaPipe alignment",
      note: cvaClass.severity !== "Normal"
        ? "Forward head posture is an observable alignment finding. It does not independently confirm spinal curvature."
        : null,
    });
  }

  // 1b. Shoulder translation (plumb line)
  const shOffset = plumb?.shoulderOffset ?? null;
  const shClass  = classifyShoulderTranslation(shOffset, viewSign);
  if (shClass && shClass.severity !== "Normal") {
    findings.push({
      id: "shoulder_translation",
      category: "Shoulder Position",
      label: shClass.label,
      value: shOffset !== null ? `${Math.abs(shOffset).toFixed(1)}% frame width from plumb` : null,
      severity: shClass.severity,
      source: "Plumb line offset",
      note: "Shoulder translation is an independent observable finding. Forward shoulder position does not confirm thoracic kyphosis.",
    });
  }

  // 1c. Hip translation
  const hipOffset = plumb?.hipOffset ?? null;
  const hipClass  = classifyHipTranslation(hipOffset, viewSign);
  if (hipClass) {
    findings.push({
      id: "hip_translation",
      category: "Hip/Pelvis Position",
      label: hipClass.label,
      value: hipOffset !== null ? `${Math.abs(hipOffset).toFixed(1)}% frame width from plumb` : null,
      severity: hipClass.severity,
      source: "Plumb line offset",
    });
  }

  // 1d. Trunk lean
  const trunkClass = classifyTrunkLean(measurements);
  if (trunkClass) {
    findings.push({
      id: "trunk_lean",
      category: "Trunk Alignment",
      label: trunkClass.label,
      severity: trunkClass.severity,
      source: "MediaPipe alignment",
    });
  }

  // 1e. Knee position
  const kneeOffset = plumb?.kneeOffset ?? null;
  const kneeClass  = classifyKneePosition(kneeOffset, viewSign);
  if (kneeClass) {
    findings.push({
      id: "knee_position",
      category: "Knee Position",
      label: kneeClass.label,
      severity: kneeClass.severity,
      source: "Plumb line offset",
    });
  }

  // ── LAYER 2: Contour Appearance Findings ──────────────────────────────────

  if (contourResult && !contourResult.error) {
    // 2a. Thoracic contour appearance
    const thorFinding = buildThoracicFinding(contourResult.thoracic, effectiveConf);
    if (thorFinding) findings.push({ id: "thoracic_contour", ...thorFinding, source: "Body contour analysis" });

    // 2b. Lumbar contour appearance
    const lumFinding = buildLumbarFinding(contourResult.lumbar, effectiveConf);
    if (lumFinding) findings.push({ id: "lumbar_contour", ...lumFinding, source: "Body contour analysis" });

    // 2c. Sagittal balance summary
    const plumbSummary = buildSagittalBalanceSummary(plumb, viewSign);
    if (plumbSummary?.summary) {
      findings.push({
        id: "sagittal_balance",
        category: "Sagittal Balance",
        label: plumbSummary.summary,
        severity: plumbSummary.pattern ? "Moderate" : "Normal",
        source: "Plumb line analysis",
        subLabel: plumbSummary.pattern,
      });
    }

    // 2d. Kendall postural type (only if contour supports it)
    const plumbSumm2 = buildSagittalBalanceSummary(plumb, viewSign);
    const kendall = classifyKendallType(
      contourResult.thoracic, contourResult.lumbar,
      plumbSumm2, measurements, effectiveConf
    );
    if (kendall) {
      findings.push({
        id: "kendall_type",
        category: "Postural Classification",
        label: kendall.type,
        severity: kendall.type.includes("Ideal") ? "Normal" : "Moderate",
        source: `Contour + alignment (${kendall.confidence} confidence)`,
        subLabel: kendall.description,
        disclaimer: clinicianVerified
          ? "Clinician Verified Analysis"
          : "Screening classification — confirm clinically",
      });
    }
  } else if (!contourResult) {
    // Contour engine not run — add a note in findings
    findings.push({
      id: "contour_unavailable",
      category: "Spinal Contour",
      label: "Spinal contour analysis not available for this image",
      severity: "Info",
      source: "System",
      note: "Thoracic and lumbar contour appearance require sufficient image quality and full-body segmentation. Upload a clear lateral photo with form-fitting clothing for contour analysis.",
    });
  }

  // ── Confidence banner ─────────────────────────────────────────────────────
  if (effectiveConf?.recommendation) {
    findings.unshift({
      id: "confidence_banner",
      category: "Analysis Confidence",
      label: effectiveConf.recommendation,
      severity: effectiveConf.tier === "Low" ? "Warning" : "Info",
      source: `Confidence score: ${effectiveConf.score}%`,
      flags: effectiveConf.flags,
      _isBanner: true,
    });
  }

  return findings;
}

// ─── Findings that must be REMOVED from the existing ClinicalFindingsEngine ───
// These are the finding IDs currently produced by the lateral analysis that
// commit the cardinal sin of diagnosing spinal curvature from shoulder/ear position.
// Patch AppFull.jsx to suppress these for lateral views:
export const DEPRECATED_LATERAL_FINDING_IDS = [
  "kyphosis",          // was: "Thoracic Kyphosis: 48°"
  "hyperkyphosis",     // was: "Hyperkyphosis detected"
  "lordosis",          // was: "Lumbar Lordosis: 52°"
  "hyperlordosis",     // was: "Hyperlordosis detected"
  "kendall_kyphotic",  // was: generated from shoulder+ear alone
  "thoracic_angle",    // was: thoracicAngle proxy measurement shown as clinical finding
  "lumbar_angle",      // was: lumbar angle proxy shown as clinical finding
];

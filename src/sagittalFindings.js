// sagittalFindings.js — Clinical Findings Layer for Lateral Posture Analysis v2
//
// ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
// Layer 1 — Observable alignment (MediaPipe landmarks)
//   CVA, FHP distance, shoulder/hip/knee offset from plumb line, trunk lean
//   These are INDEPENDENT findings. FHP does NOT imply kyphosis.
//
// Layer 2 — Spinal contour appearance (body silhouette from contourEngine.js)
//   Thoracic Curve Appearance Index (TCAI) — from actual posterior contour shape
//   Lumbar Curve Appearance Index (LCAI)   — from actual posterior contour shape
//   Inflection point location              — distinguishes flat-back from kyphotic-lordotic
//   Overall curve pattern                  — Kendall classification from contour SHAPE
//
// RULE: Never combine Layer 1 measurements to diagnose spinal curvature.
//   FHP + rounded shoulder ≠ kyphosis
//   Kyphosis classification requires Layer 2 contour data.
//
// FILTER: The legacy ClinicalFindingsEngine uses `region` field (not `id`).
//   isDeprecatedLateralFinding() matches on region text — fixes the broken filter.

// ─── LEGACY FILTER ────────────────────────────────────────────────────────────
// The legacy ClinicalFindingsEngine's add() function creates:
//   { region, text, severity, correction, icd, icon, detail, norm, value }
// There is NO `id` field. Previous filter using fi?.id was always undefined → useless.
// This function matches the region strings the legacy engine actually produces.
const DEPRECATED_REGIONS = [
  "Thoracic Kyphosis",          // "Thoracic Kyphosis (Trunk Lean Est.)"
  "Lumbar — Hyperlordosis",     // independent lordosis finding
  "Lumbar — Flat Back",         // "Lumbar — Flat Back / Reduced Lordosis"
  "Posture Pattern —",          // "Posture Pattern — Sway-Back", "— Military / Flat Back"
  "Upper Crossed Pattern",      // UCS sagittal flag
  "Lower Crossed Pattern",      // LCS sagittal flag
  "Sagittal Pattern —",         // Kendall pattern label block
  "Lumbar / Pelvis",            // pelvic tilt sagittal → lumbar/pelvis finding
];

export function isDeprecatedLateralFinding(fi) {
  if (!fi) return false;
  const region = fi.region || fi.category || "";
  return DEPRECATED_REGIONS.some(dep => region.includes(dep));
}

// ─── CVA classification ───────────────────────────────────────────────────────
// Yip et al. 2008: normal CVA ≥ 50°. Below 50° = clinically significant FHP.
function classifyCVA(cva) {
  if (cva === null || cva === undefined) return null;
  if (cva >= 55) return { severity:"Normal",   label:`Normal craniovertebral angle (${Math.round(cva)}°)` };
  if (cva >= 50) return { severity:"Borderline",label:`Borderline forward head tendency — CVA ${Math.round(cva)}°` };
  if (cva >= 44) return { severity:"Mild",      label:`Mild forward head posture — CVA ${Math.round(cva)}°` };
  if (cva >= 38) return { severity:"Moderate",  label:`Moderate forward head posture — CVA ${Math.round(cva)}°` };
  return               { severity:"Marked",    label:`Marked forward head posture — CVA ${Math.round(cva)}°` };
}

// ─── Plumb line offset classification ─────────────────────────────────────────
// Interprets offset (% frame width) as anterior/posterior displacement.
// viewSign tells us which direction "anterior" is.
function interpretOffset(offsetPct, viewSign, segment) {
  if (offsetPct === null) return null;
  // For viewSign≥0 (faces right): anterior = positive x relative to ankle
  // For viewSign<0 (faces left):  anterior = negative x relative to ankle
  // offsetPct is already (landmark_x - ankle_x)/W * 100
  // For a person facing right: positive offset = anterior, negative = posterior
  // For a person facing left:  positive offset = posterior (because x increases leftward for posterior)
  const anteriorPct = viewSign >= 0 ? offsetPct : -offsetPct;
  const absAnt = Math.abs(anteriorPct);
  const dir = anteriorPct > 0 ? "anterior" : "posterior";

  // Kendall ideal positions:
  // Ear: over lateral malleolus (0%)
  // Acromion: over lateral malleolus (0%)
  // Greater trochanter: over lateral malleolus (0%)
  const thresholds = {
    ear:      { normal:2.5, mild:4, moderate:6 },
    shoulder: { normal:2,   mild:3.5, moderate:6 },
    hip:      { normal:2,   mild:4, moderate:7 },
    knee:     { normal:2.5, mild:4, moderate:7 },
  };
  const t = thresholds[segment] || thresholds.shoulder;

  if (absAnt <= t.normal) return null; // within normal — don't report
  const severity = absAnt > t.moderate ? "Marked" : absAnt > t.mild ? "Moderate" : "Mild";
  return { severity, anteriorPct, dir, absAnt };
}

// ─── Thoracic contour finding ─────────────────────────────────────────────────
function buildThoracicFinding(cp, confidence) {
  if (!cp) return null;
  const lowConf = confidence?.score < 55;
  const apexNote = cp.thorApexRegion && cp.thorApexRegion !== "unknown"
    ? ` (apex: ${cp.thorApexRegion.replace("-"," ")})`
    : "";
  const label = lowConf
    ? `${cp.thorLabel}${apexNote} — low confidence: clinical confirmation required`
    : `${cp.thorLabel}${apexNote}`;
  return {
    id: "thoracic_contour",
    category: "Thoracic Contour Appearance",
    label,
    grade: cp.thorGrade,
    severity: ["Normal","Mild","Moderate","Marked"][cp.thorGrade] ?? "Normal",
    source: "Body contour analysis",
    disclaimer: "Visual contour appearance index — not a Cobb angle. Does not confirm structural kyphosis.",
    confidence: confidence?.tier ?? "Low",
    _devNorm: cp.thorMaxDevNorm,
  };
}

// ─── Lumbar contour finding ───────────────────────────────────────────────────
function buildLumbarFinding(cp, confidence) {
  if (!cp) return null;
  const lowConf = confidence?.score < 55;
  const label = lowConf
    ? `${cp.lumLabel} — low confidence: clinical confirmation required`
    : cp.lumLabel;
  return {
    id: "lumbar_contour",
    category: "Lumbar Contour Appearance",
    label,
    grade: cp.lumGrade,
    severity: cp.lumFlat ? "Moderate" : (["Normal","Mild","Moderate","Marked"][cp.lumGrade] ?? "Normal"),
    source: "Body contour analysis",
    disclaimer: "Visual contour appearance index — not a radiographic lordosis measurement.",
    confidence: confidence?.tier ?? "Low",
    _devNorm: cp.lumMaxDevNorm,
  };
}

// ─── Sagittal balance from plumb offsets ──────────────────────────────────────
function buildSagittalBalance(plumb, viewSign) {
  if (!plumb) return null;
  const ant = off => viewSign >= 0 ? off : (off !== null ? -off : null);
  const earAnt  = ant(plumb.earOffset);
  const shAnt   = ant(plumb.shoulderOffset);
  const hipAnt  = ant(plumb.hipOffset);
  const knAnt   = ant(plumb.kneeOffset);

  const fmt = (label, val) => val !== null ? `${label}: ${val>0?"+":""}${val.toFixed(1)}% ${val>0?"ant":"post"}` : null;
  const parts = [fmt("Ear",shAnt!==null?earAnt:null), fmt("Acromion",shAnt), fmt("Hip",hipAnt), fmt("Knee",knAnt)].filter(Boolean);

  return { summary: parts.join(" · "), earAnt, shAnt, hipAnt, knAnt };
}

// ─── Kendall classification — CONTOUR DRIVEN ─────────────────────────────────
// Only fires when the body CONTOUR confirms the pattern.
// CVA gate: if CVA is normal (≥50°), "forward head" component is absent.
// Contour gate: uses curve shape, inflection point, apex location.
function buildKendallClassification(curveProfile, plumbBalance, measurements, confidence, clinicianVerified) {
  if (!curveProfile) return null;
  if (!confidence || confidence.score < 50) return null; // insufficient confidence

  const { curvePattern, thorGrade, lumGrade, lumFlat, hasInflection,
          inflectionYNorm, thorApexRegion } = curveProfile;

  const cva    = measurements?.cvaAngle ?? null;
  const hasFHP = cva !== null ? cva < 50 : null; // null = unknown

  const bal   = plumbBalance ?? {};
  const hipAnt = bal.hipAnt ?? 0;
  const shAnt  = bal.shAnt  ?? 0;

  const confTier  = clinicianVerified ? "Clinician Verified" : confidence.tier;
  const disclaimer = clinicianVerified
    ? "Clinician Verified Analysis"
    : "Screening classification — confirm clinically";

  switch (curvePattern) {
    case "kyphotic-lordotic":
      return {
        id: "kendall_type",
        category: "Postural Pattern (Kendall)",
        label: "Kyphotic-Lordotic Pattern",
        severity: "Moderate",
        description: `Contour shows increased thoracic convexity and lumbar concavity with a clear inflection point at ${inflectionYNorm ? Math.round(inflectionYNorm*100)+"% trunk height" : "mid-trunk"}. Consistent with Kendall kyphotic-lordotic posture.${hasFHP===true ? " Forward head posture present." : hasFHP===false ? " Note: craniovertebral angle within normal range." : ""}`,
        source: `Body contour analysis (${confTier})`,
        disclaimer,
      };

    case "flat-back":
      return {
        id: "kendall_type",
        category: "Postural Pattern (Kendall)",
        label: "Flat-back Pattern",
        severity: "Moderate",
        description: `Contour shows reduced or absent lumbar concavity — posterior profile is relatively straight from shoulder to hip. Consistent with Kendall flat-back posture. Lumbar anterior shear risk. Assess hamstring and abdominal dominance.`,
        source: `Body contour analysis (${confTier})`,
        disclaimer,
      };

    case "sway-back":
      return {
        id: "kendall_type",
        category: "Postural Pattern (Kendall)",
        label: "Sway-back Pattern",
        severity: "Moderate",
        description: `Contour apex in lower thoracic region with flattened lumbar curve. Hip ${hipAnt > 0 ? `${hipAnt.toFixed(1)}% anterior to plumb` : "near plumb line"}. Consistent with Kendall sway-back posture. Assess hamstring and abdominal overactivity.`,
        source: `Body contour analysis (${confTier})`,
        disclaimer,
      };

    case "kyphotic":
      return {
        id: "kendall_type",
        category: "Postural Pattern (Kendall)",
        label: "Thoracic Kyphotic Pattern",
        severity: "Moderate",
        description: `Contour shows increased thoracic convexity (${thorApexRegion?.replace("-"," ")} apex) with normal lumbar concavity. Isolated thoracic pattern — Scheuermann's or habitual sedentary posture. Radiographic confirmation required for clinical classification.`,
        source: `Body contour analysis (${confTier})`,
        disclaimer,
      };

    case "lordotic":
      return {
        id: "kendall_type",
        category: "Postural Pattern (Kendall)",
        label: "Lordotic Pattern",
        severity: "Moderate",
        description: `Contour shows increased lumbar concavity with normal thoracic convexity. Anterior pelvic tilt pattern. Assess hip flexor contracture (Thomas test) and gluteal activation.`,
        source: `Body contour analysis (${confTier})`,
        disclaimer,
      };

    case "ideal":
      if (thorGrade === 0 && lumGrade === 0) {
        return {
          id: "kendall_type",
          category: "Postural Pattern (Kendall)",
          label: "Near-Ideal Sagittal Alignment",
          severity: "Normal",
          description: "Thoracic and lumbar contour curves within normal appearance range. Plumb line alignment satisfactory.",
          source: `Body contour analysis (${confTier})`,
          disclaimer,
        };
      }
      return null;

    default:
      return null;
  }
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function buildSagittalFindings(lm, view, measurements, contourResult, clinicianVerified = false) {
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

  // ── SWAY-BACK PRE-CHECK from plumb chain (before contour) ─────────────────
  // Detects Kendall D from plumb offsets alone:
  // shoulder POSTERIOR + (ear anterior OR hip anterior) = sway-back
  // Reports this as an OBSERVABLE ALIGNMENT finding, not a contour diagnosis
  const shPlumbOffset = plumb?.shoulderOffset ?? null;
  const hipPlumbOffset = plumb?.hipOffset ?? null;
  const earPlumbOffset = plumb?.earOffset ?? null;
  const shActuallyPosterior = shPlumbOffset !== null && (viewSign >= 0 ? shPlumbOffset < -1.5 : shPlumbOffset > 1.5);
  const hipActuallyAnterior  = hipPlumbOffset !== null && (viewSign >= 0 ? hipPlumbOffset > 1.5 : hipPlumbOffset < -1.5);
  const earActuallyAnterior  = earPlumbOffset !== null && (viewSign >= 0 ? earPlumbOffset > 1.5 : earPlumbOffset < -1.5);
  const swaybackPlumbPattern = shActuallyPosterior && (hipActuallyAnterior || earActuallyAnterior);

  // ── CONFIDENCE BANNER ────────────────────────────────────────────────────
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

  // ── LAYER 1: Observable Alignment (MediaPipe landmarks) ───────────────────

  // CVA / Forward Head Posture
  const cvaClass = classifyCVA(measurements?.cvaAngle);
  if (cvaClass && cvaClass.severity !== "Normal") {
    findings.push({
      id: "fhp_cva",
      category: "Forward Head Posture",
      label: cvaClass.label,
      value: measurements?.cvaAngle !== null ? `CVA ${Math.round(measurements.cvaAngle)}°` : null,
      severity: cvaClass.severity,
      source: "MediaPipe landmark measurement",
      note: "Forward head posture is an independent observable alignment finding. It does not confirm thoracic kyphosis — all four Kendall postural types can present with FHP.",
    });
  }

  // Shoulder translation from plumb line
  if (plumb?.shoulderOffset !== null) {
    const r = interpretOffset(plumb.shoulderOffset, viewSign, "shoulder");
    if (r) {
      const swayNote = swaybackPlumbPattern && r.dir === "posterior"
        ? "Shoulder posterior to plumb with anterior ear/hip — consistent with sway-back pattern (Kendall D). Confirm with contour analysis."
        : "Shoulder position is an independent observable finding — do not use alone to infer kyphosis.";
      findings.push({
        id: "shoulder_translation",
        category: r.dir === "posterior" ? "Shoulder Posterior Position" : "Shoulder Anterior Position",
        label: `${r.severity} shoulder ${r.dir} displacement — ${r.absAnt.toFixed(1)}% from plumb`,
        severity: r.severity,
        source: "Plumb line offset",
        note: swayNote,
      });
    }
  }

  // Sway-back plumb pattern alert (when contour not yet run)
  if (swaybackPlumbPattern && (!cp || cp.curvePattern === "ideal")) {
    findings.push({
      id: "swayback_plumb_alert",
      category: "Postural Pattern Alert",
      label: "Sway-back sagittal pattern suggested by plumb line — shoulder posterior, ear/hip anterior",
      severity: "Moderate",
      source: "Plumb line chain analysis",
      note: "Upload a clear lateral photo to confirm with body contour analysis. Pattern consistent with Kendall D (sway-back).",
    });
  }

  // Hip / Greater trochanter from plumb
  if (plumb?.hipOffset !== null) {
    const r = interpretOffset(plumb.hipOffset, viewSign, "hip");
    if (r) findings.push({
      id: "hip_plumb",
      category: "Hip / Greater Trochanter Position",
      label: `${r.severity} hip ${r.dir} displacement — ${r.absAnt.toFixed(1)}% from plumb`,
      severity: r.severity,
      source: "Plumb line offset",
    });
  }

  // Knee from plumb
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
    });
  }

  // Trunk lean (shoulder midpoint vs hip midpoint)
  const tls = measurements?.trunkLateralShift;
  if (tls !== null && tls !== undefined && Math.abs(tls) > 2) {
    findings.push({
      id: "trunk_lean",
      category: "Trunk Lean",
      label: `${Math.abs(tls) > 5 ? "Marked" : Math.abs(tls) > 3 ? "Moderate" : "Mild"} trunk ${tls > 0 ? "anterior" : "posterior"} lean`,
      severity: Math.abs(tls) > 5 ? "Marked" : "Mild",
      source: "MediaPipe alignment",
    });
  }

  // Sagittal balance summary
  if (bal?.summary) {
    findings.push({
      id: "sagittal_balance",
      category: "Sagittal Balance (Plumb Line)",
      label: bal.summary,
      severity: "Info",
      source: "Plumb line — lateral malleolus reference (Kendall)",
    });
  }

  // ── LAYER 2: Contour Appearance (body silhouette analysis) ────────────────
  if (cp) {
    const thorFinding = buildThoracicFinding(cp, effConf);
    if (thorFinding) findings.push({ ...thorFinding, source:"Body contour analysis" });

    const lumFinding = buildLumbarFinding(cp, effConf);
    if (lumFinding) findings.push({ ...lumFinding, source:"Body contour analysis" });

    // Inflection point note — clinically meaningful
    if (cp.hasInflection) {
      findings.push({
        id: "inflection_point",
        category: "Spinal Curve Transition",
        label: `Thoracic-lumbar inflection identified at ~${Math.round((cp.inflectionYNorm??0.55)*100)}% trunk height`,
        severity: "Info",
        source: "Contour analysis",
        note: "Inflection point present = both thoracic and lumbar curves are distinguishable. Absence of inflection suggests flat-back or single-curve pattern.",
      });
    } else {
      findings.push({
        id: "inflection_absent",
        category: "Spinal Curve Transition",
        label: "No clear thoracic-lumbar inflection detected — posterior contour relatively straight",
        severity: "Info",
        source: "Contour analysis",
        note: "Absent inflection is consistent with flat-back posture or reduced lumbar lordosis.",
      });
    }

    // Kendall pattern — from contour shape only
    const kendall = buildKendallClassification(cp, bal, measurements, effConf, clinicianVerified);
    if (kendall) findings.push(kendall);

  } else {
    findings.push({
      id: "contour_unavailable",
      category: "Spinal Contour",
      label: "Body contour analysis unavailable for this image",
      severity: "Info",
      source: "System",
      note: "Upload a clear lateral photo (full body, form-fitting clothing, plain background) for contour-based spinal appearance analysis.",
    });
  }

  return findings;
}

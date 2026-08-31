// measurementError.js — what counts as a real change between two sessions.
//
// WHY THIS FILE EXISTS
// Photogrammetric postural angles have a measurement error floor. Reported
// values from controlled photogrammetry (tripod, fixed camera height and
// subject distance, markers on palpated landmarks):
//
//   SEM  0.4–0.8°
//   MDC  0.8–2.3°        MDC = 1.96 × SEM × √2
//
// MDC is "the smallest change detectable beyond measurement error". A 1.5°
// difference between two sessions is not improvement; it is the same posture
// measured twice. Reporting it as change is the most common false claim in
// this category of app, and it compounds: a patient told their posture
// improved 1° will believe it.
//
// This app is markerless, handheld and usually uncalibrated, so its true MDC
// is WIDER than the published range, not narrower. The published upper bound
// is therefore used as the floor for ideal conditions, and inflated when the
// capture conditions are worse. The inflation factors are conservative
// app-derived judgements, not measured values — labelled as such wherever
// they surface, because no published MDC exists for handheld markerless
// smartphone photogrammetry.

// Upper bound of the published MDC range for photogrammetric postural angles,
// under tripod-controlled, marker-based conditions. Degrees.
export const MDC_ANGLE_DEG_CONTROLLED = 2.3;

// Upper bound of the published SEM range, degrees. Kept for reference and for
// deriving MDC if a study-specific SEM is ever substituted.
export const SEM_ANGLE_DEG_CONTROLLED = 0.8;

// Linear deviations (cm). SAPO reports a distance measurement error of
// 1.8mm ± 0.9 for the software itself, but no MDC for linear postural
// deviations across sessions is established in the literature. 1.0cm is an
// app-derived conservative floor, NOT a published figure — it must never be
// presented as one.
export const MDC_LINEAR_CM_APP_DERIVED = 1.0;

// Conditions that widen the error floor beyond the controlled-photogrammetry
// figure. Multiplicative and conservative; app-derived, not measured.
const INFLATION = {
  uncalibrated:      1.5, // no height calibration — scale is assumed, not measured
  unverifiedMarkers: 1.5, // landmarks auto-placed and not reviewed by a clinician
  unknownGeometry:   2.0, // camera distance/height not recorded, so not reproducible
  geometryMismatch:  2.0, // the two sessions were not captured the same way
};

// The error floor for a comparison, given the conditions both captures were
// made under. Returns { mdc, factors } so the caller can explain itself.
export function angleMdcDeg(conditions = {}) {
  const factors = [];
  let mdc = MDC_ANGLE_DEG_CONTROLLED;
  for (const [key, mult] of Object.entries(INFLATION)) {
    if (conditions[key]) { mdc *= mult; factors.push(key); }
  }
  return { mdc: Math.round(mdc * 10) / 10, factors };
}

export function linearMdcCm(conditions = {}) {
  const factors = [];
  let mdc = MDC_LINEAR_CM_APP_DERIVED;
  for (const [key, mult] of Object.entries(INFLATION)) {
    if (conditions[key]) { mdc *= mult; factors.push(key); }
  }
  return { mdc: Math.round(mdc * 10) / 10, factors };
}

// Compare two measurements of the same thing.
//
// Returns null when either value is missing, otherwise:
//   { delta, mdc, isReal, direction, factors }
//
// isReal === false means "within measurement error" — the UI must say
// "no measurable change", never a number with an arrow.
export function compareMeasurement(prev, next, { unit = "deg", conditions = {}, lowerIsBetter = false } = {}) {
  if (prev === null || prev === undefined || next === null || next === undefined) return null;
  if (!isFinite(prev) || !isFinite(next)) return null;

  const { mdc, factors } = unit === "cm" ? linearMdcCm(conditions) : angleMdcDeg(conditions);
  const delta = Math.round((next - prev) * 10) / 10;
  const isReal = Math.abs(delta) >= mdc;

  let direction = "none";
  if (isReal) {
    const rose = delta > 0;
    direction = (rose === lowerIsBetter) ? "worse" : "better";
  }

  return { delta, mdc, isReal, direction, factors, unit };
}

// One-line summary for display. Deliberately refuses to render a delta that
// is inside the error floor.
export function describeChange(cmp, label = "") {
  if (!cmp) return null;
  const unit = cmp.unit === "cm" ? "cm" : "°";
  if (!cmp.isReal) {
    return `${label} no measurable change (within ±${cmp.mdc}${unit} measurement error)`.trim();
  }
  const sign = cmp.delta > 0 ? "+" : "";
  return `${label} ${sign}${cmp.delta}${unit}`.trim();
}

// How much the capture conditions allow the analysis to be trusted, separate
// from how well the landmarks were detected.
//
// calcReliability()'s score is mean landmark VISIBILITY — an honest description
// of one specific thing, and deliberately not inflated into something it isn't
// (an earlier "ICC estimate" was removed from this codebase for exactly that
// reason). So this does not silently cap that number. It returns a ceiling the
// UI shows alongside it: a photo taken freehand at an unknown distance with
// unreviewed landmarks cannot support a high-confidence reading no matter how
// crisply the pose model saw the joints.
export function protocolQuality(capture = {}) {
  const reasons = [];
  let ceiling = 100;

  if (!capture.protocolConfirmed) { ceiling = Math.min(ceiling, 75); reasons.push("capture protocol not confirmed"); }
  if (!capture.distanceCm)        { ceiling = Math.min(ceiling, 70); reasons.push("camera distance not recorded"); }
  if (!capture.calibrated)        { ceiling = Math.min(ceiling, 80); reasons.push("no height calibration"); }
  if (!capture.landmarksReviewed) { ceiling = Math.min(ceiling, 60); reasons.push("landmarks not reviewed"); }

  const level = ceiling >= 90 ? "full" : ceiling >= 75 ? "good" : ceiling >= 65 ? "limited" : "screening only";
  return { ceiling, reasons, level };
}

// Whether two captures are comparable at all. Two photos taken at different
// distances or with different calibration are not measuring the same thing,
// and no amount of MDC widening makes them comparable — the honest answer is
// to decline the comparison.
export function capturesComparable(a, b) {
  if (!a || !b) return { comparable: false, reason: "capture conditions not recorded for one or both sessions" };
  if (a.view !== b.view) return { comparable: false, reason: "different views" };

  const aCal = !!a.calibrated, bCal = !!b.calibrated;
  if (aCal !== bCal) return { comparable: false, reason: "one session was height-calibrated and the other was not" };

  if (aCal && bCal && a.patientHeightCm && b.patientHeightCm && a.patientHeightCm !== b.patientHeightCm) {
    return { comparable: false, reason: "different height calibration between sessions" };
  }

  // Distance is optional — when both recorded it, a materially different
  // subject distance changes perspective enough to invalidate the comparison.
  if (a.distanceCm && b.distanceCm && Math.abs(a.distanceCm - b.distanceCm) > 30) {
    return { comparable: false, reason: `camera distance differed by ${Math.abs(a.distanceCm - b.distanceCm)}cm` };
  }

  return { comparable: true, reason: null };
}

// kendallPlumb.js — the sagittal plumb-line reference, defined once.
//
// WHY THIS FILE EXISTS
// Kendall's standing lateral plumb line does NOT pass through the lateral
// malleolus. It falls SLIGHTLY ANTERIOR to it, level with the tuberosity of
// the 5th metatarsal ("Posture and Pain", Kendall et al.; the same reference
// point PostureScreen implements as ~2cm anterior to the malleolus).
//
// Every plumb deviation in this app used to be measured from the malleolus
// itself, i.e. from a line ~2cm posterior to the real reference. In Kendall's
// IDEAL alignment the ear and acromion sit ON the plumb line, so measured from
// the malleolus an ideally-aligned person reads ~+2cm anterior at both — which
// is exactly the ">2cm anterior" cutoff the app then flagged as abnormal.
// Ideal posture scored as a finding.
//
// Fixing it by moving the reference line (rather than by re-tuning each
// segment's threshold) keeps every existing tolerance meaningful: the
// thresholds describe how far past ideal is abnormal, and ideal is now in the
// right place.
//
// NOT AFFECTED: any measure that is a difference between two segments — CVA
// (ear-to-acromion angle) and fhpDevCm (plumb.ear − plumb.shoulder) — because
// the shared reference cancels out. This only changes ABSOLUTE deviations:
// global alignment shift, sagittal pelvic/hip shift, and knee deviation.
//
// Three call sites share this definition (they had already drifted apart once
// as three independent ankle anchors): the cm measurement chain and the drawn
// overlay in PostureEngine.jsx, and the %-frame contour offsets in
// contourEngine.js.

// Kendall's anterior offset from the lateral malleolus, in centimetres.
export const KENDALL_PLUMB_ANTERIOR_CM = 2;

// Assumed full-frame height when no height calibration is available. Matches
// the estPxPerCm fallback already used by the sagittal chain in
// PostureEngine.jsx — kept identical so calibrated and uncalibrated photos
// don't silently use different plumb positions.
export const ASSUMED_FRAME_CM = 170;

// px-per-cm to use for the offset. Prefers real calibration (from entered
// patient height); falls back to assuming the frame spans ~170cm.
export function plumbPxPerCm(pixPerCm, imgH) {
  if (pixPerCm && isFinite(pixPerCm) && pixPerCm > 0) return pixPerCm;
  if (imgH && isFinite(imgH) && imgH > 0) return imgH / ASSUMED_FRAME_CM;
  return null;
}

// The anterior offset expressed in pixels.
//   viewSign: +1 when anterior is to the right of frame, -1 when to the left.
export function plumbOffsetPx(pixPerCm, imgH, viewSign = 1) {
  const ppc = plumbPxPerCm(pixPerCm, imgH);
  if (!ppc) return 0;
  return KENDALL_PLUMB_ANTERIOR_CM * ppc * viewSign;
}

// The anterior offset in MediaPipe's normalised-x units.
//
// The sagittal chain scales normalised x by IMAGE HEIGHT rather than width
// (see devCm in PostureEngine.jsx), so the normalised offset is divided by
// imgH to stay consistent with how those deviations are converted back to cm.
export function plumbOffsetNormX(pixPerCm, imgH, viewSign = 1) {
  if (!imgH || !isFinite(imgH) || imgH <= 0) return 0;
  return plumbOffsetPx(pixPerCm, imgH, viewSign) / imgH;
}

// Kendall's ideal alignment does not put every landmark ON the line. Relative
// to the plumb, ideal posture has the hip joint centre slightly ANTERIOR and
// the knee joint axis slightly POSTERIOR:
//
//   "...the plumb line passes midway through the shoulder, slightly POSTERIOR
//    to the hip joint centre, slightly ANTERIOR to the knee joint axis, and
//    slightly anterior to the lateral malleolus."
//
// These are the expected non-zero offsets, in cm anterior to the corrected
// plumb line. Deviation should be judged against these, not against zero.
// "Slightly" is not quantified in Kendall, so these are conservative values
// used to avoid flagging normal alignment — they are a deadband, not a
// validated measurement.
export const KENDALL_EXPECTED_OFFSET_CM = {
  ear:      0,
  shoulder: 0,
  hip:      0.5,   // hip centre sits slightly anterior to the line
  knee:    -0.5,   // knee axis sits slightly posterior to the line
  ankle:   -KENDALL_PLUMB_ANTERIOR_CM, // malleolus, by definition of the offset
};

// Deviation of a segment from its Kendall-ideal position, in cm.
// Positive = further anterior than ideal.
export function deviationFromIdealCm(segment, offsetFromPlumbCm) {
  if (offsetFromPlumbCm === null || offsetFromPlumbCm === undefined) return null;
  const expected = KENDALL_EXPECTED_OFFSET_CM[segment] ?? 0;
  return offsetFromPlumbCm - expected;
}

/* ============================================================
   orthoObservationData.js — region-aware Posture & Alignment
   field sets (General Observation, Outpatient pathway) plus the
   "how to observe / what to look for" reference text for each
   General Observation card. Mirrors the pattern already used by
   orthoSubjectiveRegionData.js (same 8 content clusters).
   ============================================================ */

import { contentKeyForRegion } from "./orthoSubjectiveRegionData.js";

/* Every field below is defined once and assigned to whichever view(s) it's
   clinically actually observed from -- e.g. scapular winging shows from
   posterior, forward head posture shows from lateral/sagittal, shoulder
   level is checked from both anterior and posterior. Same field id can
   appear under more than one view; each view's answer is stored
   independently (regions[region.id][view][fieldId]), so "elevated right"
   from behind and "neutral" from the side aren't forced to be one value. */
const F = {
  head: { id: "head", label: "Head", options: ["Neutral", "Forward"] },
  shoulderLevel: { id: "shoulderLevel", label: "Shoulder", options: ["Symmetrical", "Elevated right", "Elevated left"] },
  scapula: { id: "scapula", label: "Scapula", options: ["Normal", "Winging", "Protracted", "Retracted"] },
  spine: { id: "spine", label: "Spine", options: ["Normal", "Increased kyphosis", "Increased lordosis", "Scoliosis"] },
  pelvis: { id: "pelvis", label: "Pelvis", options: ["Level", "Anterior tilt", "Posterior tilt", "Pelvic obliquity"] },
  lowerLimb: { id: "lowerLimb", label: "Lower limb", options: ["Neutral", "Varus", "Valgus"] },
  carryingAngle: { id: "carryingAngle", label: "Carrying angle", options: ["Neutral", "Cubitus varus", "Cubitus valgus"] },
  wristAlignment: { id: "wristAlignment", label: "Wrist alignment", options: ["Neutral", "Radial deviation", "Ulnar deviation"] },
  knee: { id: "knee", label: "Knee", options: ["Neutral", "Genu varum", "Genu valgum", "Recurvatum"] },
  foot: { id: "foot", label: "Foot", options: ["Neutral", "Pronation", "Supination"] },
};

const SPINE_POSTURE_VIEWS = {
  anterior: [F.head, F.shoulderLevel],
  posterior: [F.shoulderLevel, F.scapula, F.spine, F.pelvis],
  lateral: [F.head, F.spine, F.pelvis],
};

export const POSTURE_FIELDS_BY_CONTENT_KEY = {
  cervical: SPINE_POSTURE_VIEWS,
  thoracic: SPINE_POSTURE_VIEWS,
  lumbarSI: SPINE_POSTURE_VIEWS,
  shoulder: {
    anterior: [F.shoulderLevel],
    posterior: [F.shoulderLevel, F.scapula],
    lateral: [F.scapula],
  },
  elbowWristHand: {
    anterior: [F.carryingAngle, F.wristAlignment],
    posterior: [F.carryingAngle],
    lateral: [F.wristAlignment],
  },
  hip: {
    anterior: [F.pelvis, F.lowerLimb],
    posterior: [F.pelvis, F.lowerLimb],
    lateral: [F.pelvis],
  },
  knee: {
    anterior: [F.knee, F.foot],
    posterior: [F.knee, F.foot],
    lateral: [F.knee],
  },
  ankleFoot: {
    anterior: [F.foot],
    posterior: [F.foot, F.lowerLimb],
    lateral: [F.foot],
  },
};

export const GENERIC_POSTURE_VIEWS = {
  anterior: [F.spine, F.pelvis, F.lowerLimb],
  posterior: [F.spine, F.pelvis, F.lowerLimb],
  lateral: [F.spine, F.pelvis, F.lowerLimb],
};

export const POSTURE_VIEWS = [
  { id: "anterior", label: "Anterior" },
  { id: "posterior", label: "Posterior" },
  { id: "lateral", label: "Sagittal" },
];

export function postureFieldsForRegion(region, view) {
  const key = contentKeyForRegion(region);
  const viewSet = (key && POSTURE_FIELDS_BY_CONTENT_KEY[key]) || GENERIC_POSTURE_VIEWS;
  return viewSet[view] || [];
}

// Deduped union across all 3 views -- for callers that want "every named
// posture observation for this region" without caring which view it's
// normally checked from (e.g. the Suggested Objective screen's one
// suggestion chip per named item). Each field carries a `view` (the
// first view it appears under, in Anterior -> Posterior -> Lateral
// order) so a single inline suggestion answer writes to the exact same
// regions[region][view][fieldId] slot the tabbed General Observation
// section itself reads from -- otherwise an inline answer here would
// land in a spot the section's own UI never looks at.
export function allPostureFieldsForRegion(region) {
  const key = contentKeyForRegion(region);
  const viewSet = (key && POSTURE_FIELDS_BY_CONTENT_KEY[key]) || GENERIC_POSTURE_VIEWS;
  const seen = new Set();
  const out = [];
  POSTURE_VIEWS.forEach(({ id }) => {
    (viewSet[id] || []).forEach((f) => {
      if (!seen.has(f.id)) { seen.add(f.id); out.push({ ...f, view: id }); }
    });
  });
  return out;
}

export const OBSERVATION_INFO = {
  appearance: [
    "HOW TO OBSERVE",
    "1. Note the patient's general presentation as they enter and settle in.",
    "2. This is a quick first impression, not a detailed exam.",
    "",
    "WHAT TO LOOK FOR",
    "• Build and nutritional appearance",
    "• Alertness and orientation",
    "• Signs of distress or guarding",
  ].join("\n"),
  posture: [
    "HOW TO OBSERVE",
    "1. Observe the patient in standing where appropriate.",
    "2. Compare right and left sides.",
    "3. Observe from anterior, posterior and lateral views.",
    "",
    "WHAT TO LOOK FOR",
    "• Alignment",
    "• Symmetry",
    "• Deformity",
    "• Muscle bulk",
    "• Swelling",
    "• Skin / scar changes",
  ].join("\n"),
  local: [
    "HOW TO OBSERVE",
    "1. Expose and compare the affected region to the contralateral side.",
    "2. Use good lighting; look before you palpate.",
    "",
    "WHAT TO LOOK FOR (SEADS)",
    "• Swelling",
    "• Erythema",
    "• Atrophy / muscle bulk change",
    "• Deformity",
    "• Scars",
  ].join("\n"),
  swelling: [
    "HOW TO OBSERVE",
    "1. Compare bilaterally, in the same position each time.",
    "2. Measure circumference at consistent, reproducible landmarks.",
    "",
    "WHAT TO LOOK FOR",
    "• Presence, location and severity",
    "• Localized vs. diffuse swelling",
    "• Pitting (press firmly for 5 seconds, grade the indentation)",
  ].join("\n"),
  movement: [
    "HOW TO OBSERVE",
    "1. Watch quality of movement, not just range.",
    "2. Note compensation strategies (e.g. using arms to stand, asymmetry).",
    "",
    "WHAT TO LOOK FOR",
    "• Pain behaviour during the movement",
    "• Symmetry between sides",
    "• Use of compensation or assistive strategies",
  ].join("\n"),
  gait: [
    "HOW TO OBSERVE",
    "1. Watch the patient walk a short distance, ideally unassisted first.",
    "2. Note stance vs. swing phase, step length, cadence, symmetry.",
    "",
    "WHAT TO LOOK FOR",
    "• Overall pattern and speed",
    "• Use of an assistive device",
    "• Level of assistance required",
    "",
    "This is a quick snapshot — open the full Gait Assessment for detailed analysis.",
  ].join("\n"),
};

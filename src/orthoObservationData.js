/* ============================================================
   orthoObservationData.js — region-aware Posture & Alignment
   field sets (General Observation, Outpatient pathway) plus the
   "how to observe / what to look for" reference text for each
   General Observation card. Mirrors the pattern already used by
   orthoSubjectiveRegionData.js (same 8 content clusters).
   ============================================================ */

import { contentKeyForRegion } from "./orthoSubjectiveRegionData.js";

const SPINE_POSTURE_FIELDS = [
  { id: "head", label: "Head", options: ["Neutral", "Forward"] },
  { id: "shoulderLevel", label: "Shoulder", options: ["Symmetrical", "Elevated right", "Elevated left"] },
  { id: "scapula", label: "Scapula", options: ["Normal", "Winging", "Protracted", "Retracted"] },
  { id: "spine", label: "Spine", options: ["Normal", "Increased kyphosis", "Increased lordosis", "Scoliosis"] },
  { id: "pelvis", label: "Pelvis", options: ["Level", "Anterior tilt", "Posterior tilt", "Pelvic obliquity"] },
];

export const POSTURE_FIELDS_BY_CONTENT_KEY = {
  cervical: SPINE_POSTURE_FIELDS,
  thoracic: SPINE_POSTURE_FIELDS,
  lumbarSI: SPINE_POSTURE_FIELDS,
  shoulder: [
    { id: "shoulderLevel", label: "Shoulder", options: ["Symmetrical", "Elevated right", "Elevated left"] },
    { id: "scapula", label: "Scapula", options: ["Normal", "Winging", "Protracted", "Retracted"] },
  ],
  elbowWristHand: [
    { id: "carryingAngle", label: "Carrying angle", options: ["Neutral", "Cubitus varus", "Cubitus valgus"] },
    { id: "wristAlignment", label: "Wrist alignment", options: ["Neutral", "Radial deviation", "Ulnar deviation"] },
  ],
  hip: [
    { id: "pelvis", label: "Pelvis", options: ["Level", "Anterior tilt", "Posterior tilt", "Pelvic obliquity"] },
    { id: "lowerLimb", label: "Lower limb", options: ["Neutral", "Varus", "Valgus"] },
  ],
  knee: [
    { id: "knee", label: "Knee", options: ["Neutral", "Genu varum", "Genu valgum", "Recurvatum"] },
    { id: "foot", label: "Foot", options: ["Neutral", "Pronation", "Supination"] },
  ],
  ankleFoot: [
    { id: "foot", label: "Foot", options: ["Neutral", "Pronation", "Supination"] },
    { id: "lowerLimb", label: "Lower limb", options: ["Neutral", "Varus", "Valgus"] },
  ],
};

export const GENERIC_POSTURE_FIELDS = [
  { id: "spine", label: "Spine", options: ["Normal", "Increased kyphosis", "Increased lordosis", "Scoliosis"] },
  { id: "pelvis", label: "Pelvis", options: ["Level", "Anterior tilt", "Posterior tilt", "Pelvic obliquity"] },
  { id: "lowerLimb", label: "Lower limb", options: ["Neutral", "Varus", "Valgus"] },
];

export function postureFieldsForRegion(region) {
  const key = contentKeyForRegion(region);
  return (key && POSTURE_FIELDS_BY_CONTENT_KEY[key]) || GENERIC_POSTURE_FIELDS;
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

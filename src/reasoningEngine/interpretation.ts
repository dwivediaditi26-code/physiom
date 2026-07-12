// interpretation.ts — Stage 6 CLINICAL INTERPRETATION. Runs after provisional
// diagnosis. Every statement is grounded ONLY in findings actually present or in
// the ranked differential; nothing is fabricated. Deterministic.

import type {
  Finding, DiagnosisCandidate, RedFlagResult, SubjectiveInput,
  CompletenessReport, ClinicalInterpretation,
} from "./types";

export function buildInterpretation(
  region: string,
  findings: Finding[],
  differentials: DiagnosisCandidate[],
  redFlag: RedFlagResult,
  subjective: SubjectiveInput,
  completeness: CompletenessReport
): ClinicalInterpretation {
  const has = (c: string) => findings.some((f) => f.code === c);
  const top = differentials.find((d) => !d.excluded && d.diagnosticMatchScore > 0) || null;

  const primaryImpairments: string[] = [];
  if (has("capsular_pattern")) primaryImpairments.push("Global passive ROM restriction in a capsular pattern (ER>Abd>IR)");
  if (has("global_rom_loss")) primaryImpairments.push("Marked loss of shoulder range");
  if (has("abduction_weak") || has("er_weak")) primaryImpairments.push("Rotator cuff weakness on resisted testing");
  if (has("painful_arc")) primaryImpairments.push("Painful mid-range arc of elevation");

  const likelyPainGenerators: string[] = [];
  if (top) likelyPainGenerators.push(top.name);
  if (has("greater_tuberosity_tender")) likelyPainGenerators.push("Supraspinatus insertion / greater tuberosity");
  if (has("ac_joint_tender")) likelyPainGenerators.push("Acromioclavicular joint");
  if (has("bicipital_groove_tender")) likelyPainGenerators.push("Long head of biceps");

  const movementDysfunction: string[] = [];
  if (has("painful_arc")) movementDysfunction.push("Impingement-type painful arc during elevation");
  if (has("capsular_pattern")) movementDysfunction.push("Capsular restriction limiting functional elevation and rotation");
  if (has("overhead_aggravation")) movementDysfunction.push("Overhead loading reproduces symptoms");

  const functionalLimitations: string[] = [];
  if (has("overhead_aggravation")) functionalLimitations.push("Difficulty with overhead reaching/lifting");
  if (has("night_pain")) functionalLimitations.push("Disturbed sleep (night pain)");
  if (has("capsular_pattern")) functionalLimitations.push("Difficulty with rotation-dependent tasks (dressing, reaching behind)");

  const yellowFlags: string[] = [];
  if (subjective.constantPain && subjective.nightPain) {
    yellowFlags.push("Constant + night pain reported — monitor for distress/central sensitisation; not itself a red flag.");
  }

  // Treatment priorities — deterministic, keyed off the top differential category.
  const treatmentPriorities: string[] = [];
  const suggestedGoals: string[] = [];
  const homeAdvice: string[] = [];
  const name = top?.name || "";
  if (name.includes("Adhesive")) {
    treatmentPriorities.push("Stage-appropriate ROM restoration", "Pain modulation in irritable phase", "Graded capsular mobilisation as irritability settles");
    suggestedGoals.push("Restore functional external rotation and elevation for ADLs");
    homeAdvice.push("Gentle pain-free pendular and range exercises; avoid aggressive end-range stretching while irritable");
  } else if (name.includes("tear")) {
    treatmentPriorities.push("Protect healing/structure", "Scapular and cuff control within tolerance", "Consider surgical opinion if lag signs and functional loss persist");
    suggestedGoals.push("Restore active elevation and functional strength within pain limits");
    homeAdvice.push("Avoid heavy overhead loading; isometric cuff activation within comfort");
  } else if (name.includes("impingement") || name.includes("tendinopathy") || name.includes("Subacromial")) {
    treatmentPriorities.push("Load management and relative rest from provocative overhead activity", "Progressive rotator cuff and scapular strengthening", "Address posture/scapular control");
    suggestedGoals.push("Pain-free overhead function and return to activity");
    homeAdvice.push("Progressive isometric-to-isotonic cuff exercises; modify overhead activity temporarily");
  } else if (name.includes("instability")) {
    treatmentPriorities.push("Dynamic stabiliser retraining", "Avoid provocative apprehension positions early", "Proprioceptive/scapular control");
    suggestedGoals.push("Restore stable, controlled shoulder function");
    homeAdvice.push("Closed-chain stability work; avoid end-range abduction/ER loading initially");
  } else if (name.includes("AC joint")) {
    treatmentPriorities.push("Relative rest from cross-body loading", "Scapular and cuff support", "Load modification");
    suggestedGoals.push("Pain-free cross-body and overhead function");
    homeAdvice.push("Temporarily avoid heavy cross-body activity; ice for symptom control");
  }

  // Referral recommendation.
  let referralRecommendation: string | null = null;
  if (redFlag.triggered) {
    referralRecommendation = `Red flag present — refer/escalate before continuing: ${redFlag.flags.map((f) => f.message).join(" ")}`;
  } else if (has("er_lag_positive") || has("drop_arm_positive") || has("imaging_full_thickness_tear")) {
    referralRecommendation = "Positive lag/drop-arm sign or imaged full-thickness tear — consider orthopaedic/imaging referral.";
  }

  const summary = redFlag.triggered
    ? `Shoulder presentation with a positive red-flag screen; diagnosis withheld pending referral. Assessment ${completeness.evidenceConfidence}% complete.`
    : top
      ? `${region.charAt(0).toUpperCase() + region.slice(1)} presentation most consistent with ${top.name} (${top.band.toLowerCase()} match ${top.diagnosticMatchScore}%). Assessment ${completeness.evidenceConfidence}% complete${completeness.missingCritical.length ? "; key exams still outstanding" : ""}.`
      : `Insufficient findings to prioritise a differential yet. Assessment ${completeness.evidenceConfidence}% complete — complete the recommended examination first.`;

  return {
    summary,
    primaryImpairments,
    likelyPainGenerators: [...new Set(likelyPainGenerators)],
    movementDysfunction,
    functionalLimitations,
    redFlags: redFlag.flags.map((f) => f.message),
    yellowFlags,
    treatmentPriorities,
    suggestedGoals,
    homeAdvice,
    referralRecommendation,
  };
}

// index.ts — orchestrator for the staged deterministic reasoning pipeline.
// Order enforces the clinical workflow the app requires:
//   Subjective -> Red-flag screen -> Exam Plan (Stage 2, BEFORE objective) ->
//   [therapist performs objective exam] -> Completeness/Validation (Stage 4) ->
//   Provisional Diagnosis (Stage 5) -> Clinical Interpretation (Stage 6).
// A positive red-flag screen halts diagnosis and forces refer-first.

import type {
  SubjectiveInput, ObjectiveFindings, ReasoningResult, ExamPlan,
} from "./types";
import { redFlagScreen } from "./redFlags";
import { buildExamPlan } from "./examPlan";
import { deriveFindings } from "./findings";
import { assessCompleteness } from "./completeness";
import { rankDifferentials } from "./diagnosis";
import { buildInterpretation } from "./interpretation";

/** Stage 2 only — call right after the subjective assessment to guide which
 *  objective examinations to perform next (no diagnosis produced). */
export function planExamination(subjective: SubjectiveInput, region: string): ExamPlan {
  const redFlag = redFlagScreen(subjective);
  return buildExamPlan(subjective, region, redFlag);
}

/** Full pipeline — call once objective findings have been entered. */
export function runReasoning(
  subjective: SubjectiveInput,
  objective: ObjectiveFindings,
  region: string
): ReasoningResult {
  const redFlag = redFlagScreen(subjective);
  const examPlan = buildExamPlan(subjective, region, redFlag);

  const findings = deriveFindings(subjective, objective, region);
  const completeness = assessCompleteness(findings, objective, region);

  if (redFlag.triggered) {
    return {
      region,
      redFlag,
      examPlan,
      completeness,
      differentials: [],
      interpretation: buildInterpretation(region, findings, [], redFlag, subjective, completeness),
      stopped: true,
      message: "Red flag(s) triggered — diagnosis withheld; refer per protocol.",
    };
  }

  const differentials = rankDifferentials(findings, region, completeness);
  const interpretation = buildInterpretation(region, findings, differentials, redFlag, subjective, completeness);

  return {
    region,
    redFlag,
    examPlan,
    completeness,
    differentials,
    interpretation,
    stopped: false,
  };
}

export * from "./types";
export { normalizeFromData, runShoulderReasoningFromData, normalizeCervicalFromData, runCervicalReasoningFromData, normalizeLumbarFromData, runLumbarReasoningFromData, normalizeHipFromData, runHipReasoningFromData, normalizeKneeFromData, runKneeReasoningFromData, normalizeElbowFromData, runElbowReasoningFromData, normalizeThoracicFromData, runThoracicReasoningFromData, runReasoningFromData } from "./normalize";

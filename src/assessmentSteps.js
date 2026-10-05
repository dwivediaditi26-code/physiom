/* ============================================================
   Care Plan steps inside an assessment.

   "Care Plan", "Sessions" and "Care Plan Progress" are no longer pages in the
   middle of the Ortho / Neuro / Cardio assessments (Aditi). Problem List,
   Goals and Treatment stay; the full Care Plan (plan, sessions, progress) is
   worked on in the patient profile, which is unchanged.

   The Summary still needs the care plan block, and it is built from the
   "carePlanPlan" step id, so that step stays in the Summary only (never in
   the step bar).
   ============================================================ */

export const REMOVED_CAREPLAN_STEP_IDS = ["carePlanPlan", "carePlanSessions", "carePlanProgress"];

const CAREPLAN_WORK_STEP_IDS = ["carePlanProblems", "carePlanGoals", "carePlanTreatment"];

// A saved or template step order may still list the removed steps.
export function withoutRemovedCarePlanSteps(order) {
  return Array.isArray(order) ? order.filter((id) => !REMOVED_CAREPLAN_STEP_IDS.includes(id)) : order;
}

// steps: [{ id, label, icon }]; planStep: that wizard's own "carePlanPlan" step.
// Adds the care plan block to a Summary right after Treatment, unless it is
// already there.
export function withCarePlanSummaryStep(steps, planStep) {
  if (!planStep || steps.some((s) => s.id === "carePlanPlan")) return steps;
  let at = -1;
  steps.forEach((s, i) => {
    if (CAREPLAN_WORK_STEP_IDS.includes(s.id)) at = i + 1;
  });
  if (at === -1) {
    const end = steps.findIndex((s) => s.id === "summary" || s.id === "review");
    at = end === -1 ? steps.length : end;
  }
  return [...steps.slice(0, at), planStep, ...steps.slice(at)];
}

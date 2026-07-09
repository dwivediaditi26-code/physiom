// functionalScreen.js
// Functional movement screen classification.
//
// REFINED from the original SFMA-style FN/FP/DN/DP (functional x painful 2x2)
// classification: the app's real functional screen data (kfs_data, lfs_data,
// sfs_data, hfs_data, afs_data, etc. -- one JSON blob per region, shape
// { grades: { testId: 0|1|2 }, notes: { testId: string } }) records a single
// 3-tier grade per movement, not a separate functional/painful pair. Forcing
// that into FN/FP/DN/DP would mean guessing a "painful" bit that was never
// captured. Classifying directly off the real grade scale instead:
//   2 = Abnormal    -- faulty movement pattern, priority before loading
//   1 = Compensated -- movement achieved via compensation, treat the compensation
//   0 = Cannot perform / poor -- most significant deficit in the screen
// Still accepts the original { movementName, isFunctional, isPainful } shape
// for direct callers, translated to the same three grades, so nothing that
// already produces that shape needs to change.

const GRADE_MEANING = {
  2: { code: "ABN", meaning: "Abnormal — faulty movement pattern, priority for correction before loading." },
  1: { code: "COMP", meaning: "Compensated — movement achieved through compensation; treat the compensation pattern." },
  0: { code: "POOR", meaning: "Cannot perform — significant mobility or motor control deficit, most urgent finding in this screen." },
};

function classifyMovement({ isFunctional, isPainful }) {
  if (isFunctional && !isPainful) return "FN";
  if (isFunctional && isPainful) return "FP";
  if (!isFunctional && !isPainful) return "DN";
  return "DP";
}

function gradeFromLegacy({ isFunctional, isPainful }) {
  if (isFunctional && !isPainful) return undefined; // FN — normal, nothing to flag
  if (!isFunctional && isPainful) return 0;          // DP — dysfunctional and painful, most urgent
  if (!isFunctional && !isPainful) return 1;         // DN — dysfunctional, not painful
  return 1;                                          // FP — functional but painful, treat as priority
}

function functionalScreen(functionalData = []) {
  const findings = [];
  const movements = Array.isArray(functionalData) ? functionalData : (functionalData?.movements || []);

  for (const test of movements) {
    let grade = test.grade;
    if (grade === undefined && "isFunctional" in test) {
      grade = gradeFromLegacy(test);
      if (grade === undefined) continue; // normal (FN) — no finding to raise
    }
    const info = GRADE_MEANING[grade];
    if (!info) continue;

    findings.push({
      domain: "functional",
      finding: `${test.movementName}: ${info.code}`,
      severity: grade === 0 ? "high" : grade === 1 ? "moderate" : null,
      confidence: 0.65,
      flags: [info.code, info.meaning],
    });
  }

  return findings;
}

export { functionalScreen, classifyMovement, GRADE_MEANING };

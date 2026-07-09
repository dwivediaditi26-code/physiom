// redFlagScreen.js
// Runs FIRST, independent of all other logic. Any trigger halts differential ranking.
// Rules read from the normalised `subjective` shape the adapter (buildAssessmentData
// in src/interpretationAdapter.js) produces from the app's real cx_rf_*/lx_rf_*/grf_*/
// nrf_* red-flag checkboxes -- not raw form field names, so this module stays
// decoupled from wherever those checkboxes actually live in the Subjective UI.

const RED_FLAG_RULES = [
  {
    id: "cauda_equina",
    check: (d) =>
      d.subjective?.saddleAnesthesia ||
      d.subjective?.bladderBowelChange ||
      d.subjective?.bilateralLegWeakness,
    message: "Possible cauda equina syndrome — immediate referral required.",
  },
  {
    id: "fracture",
    check: (d) =>
      d.subjective?.traumaHistory && d.subjective?.unableToWeightBear,
    message: "Possible fracture — imaging referral indicated.",
  },
  {
    id: "malignancy",
    check: (d) =>
      d.subjective?.unexplainedWeightLoss &&
      d.subjective?.nightPainUnrelieved &&
      d.subjective?.ageOver50,
    message: "Malignancy screen positive — refer for further investigation.",
  },
  {
    id: "vascular",
    check: (d) =>
      d.subjective?.suddenSevereHeadacheOrNeckPain ||
      d.subjective?.vertebrobasilarSigns,
    message: "Possible vascular pathology — do not proceed with manual therapy.",
  },
  {
    id: "infection",
    check: (d) =>
      d.subjective?.fever && d.subjective?.constantUnremittingPain,
    message: "Possible infective process — refer for medical assessment.",
  },
  {
    id: "myelopathy",
    check: (d) => d.subjective?.myelopathySigns,
    message: "Possible cervical myelopathy — urgent referral required.",
  },
  {
    id: "systemic",
    check: (d) => d.subjective?.systemicIllness || d.subjective?.malignancyHistory,
    message: "Systemic/serious pathology flag raised in subjective screen — refer per protocol before proceeding.",
  },
];

function redFlagScreen(assessmentData) {
  const triggered = [];
  for (const rule of RED_FLAG_RULES) {
    try {
      if (rule.check(assessmentData)) {
        triggered.push({ id: rule.id, message: rule.message });
      }
    } catch (e) {
      // missing field = not triggered, never crash the screen
      continue;
    }
  }
  return {
    triggered: triggered.length > 0,
    flags: triggered,
  };
}

export { redFlagScreen };

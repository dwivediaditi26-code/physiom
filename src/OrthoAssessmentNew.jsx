import React from "react";
import OrthoAssessment from "./OrthoAssessment.jsx";

/* ============================================================
   OrthoAssessmentNew — thin adapter so the standalone Ortho
   Assessment module (OrthoAssessment.jsx + its pathway modules)
   can mount as a standard AppFull.jsx tool, same prop contract
   as CardiopulmonaryAssessment.jsx / NeurologicalAssessment.jsx
   (patientData/activePatientId/onSave/onNav). Patient-record
   persistence (onSave/activePatientId) is intentionally not wired
   yet — the module still manages its own local, in-memory data
   per assessment, same as it always has.
   ============================================================ */
export default function OrthoAssessmentNew({ onNav } = {}) {
  return <OrthoAssessment onExit={() => onNav?.("clinical")} />;
}

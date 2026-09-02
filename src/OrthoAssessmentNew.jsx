import React from "react";
import OrthoAssessment from "./OrthoAssessment.jsx";

/* ============================================================
   OrthoAssessmentNew — thin adapter so the standalone Ortho
   Assessment module (OrthoAssessment.jsx + its pathway modules)
   can mount as a standard AppFull.jsx tool, same prop contract
   as CardiopulmonaryAssessment.jsx / NeurologicalAssessment.jsx
   (patientData/activePatientId/onSave/onNav). onSave is now
   threaded through to the pathway module's Final Review step, which
   calls onSave("ortho_outpatient_assessment", <json>) to persist a
   snapshot on the active patient record -- same set(key,value)
   pattern Cardio/Neuro already use.
   ============================================================ */
export default function OrthoAssessmentNew({ onNav, onSave, activePatientId, requireAuth, entryMode, patientData, resume } = {}) {
  return <OrthoAssessment onExit={() => onNav?.("clinical")} onSave={onSave} activePatientId={activePatientId} requireAuth={requireAuth} entryMode={entryMode} patientData={patientData} resume={resume} />;
}

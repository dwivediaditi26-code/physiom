import React, { useState, useRef, useMemo } from "react";
import { CarePlanSection } from "./NeuroCarePlan.jsx";
import { buildOrthoKnowledge } from "./orthoClinicalKnowledge.js";
import { orthoStyles } from "./orthoStyles.js";

/* ============================================================
   ORTHO CARE PLAN STEP (2026-09-04) — the shared, knowledge-injected
   CarePlanSection mounted inside an Ortho assessment wizard, fed the
   ortho rules engine built from the wizard's own context (setting /
   condition / selected regions / pain).

   ONE STORE: the plan lives at patient.data.ortho_care_plan, exactly the
   same field the patient profile's Ortho Care Plan panel reads and writes
   (SpecialtyPatientProfile.jsx). So a plan started in the assessment shows
   in the profile and vice-versa — the therapist never fills it twice. The
   wizard persists it with its own onSave("ortho_care_plan", obj); ortho's
   saveAssessment() never touches this field, so wizard autosave can't
   clobber it.
   ============================================================ */
const orthoRegionLabel = (r) =>
  [r.side, r.label || r.name || String(r.id || "").replace(/[_/-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())]
    .filter(Boolean)
    .join(" ");

export function OrthoCarePlanStep({ patientData, onSave, selectedRegions, condition, setting, pain, initialPhase, floatingCTA }) {
  const regions = (selectedRegions || []).map((r) => ({ id: r.id, side: r.side, label: orthoRegionLabel(r) }));
  // Pain drives the (global) pain problem; fall back to the app-wide NRS
  // fields the profile also reads so both views agree.
  const painCtx = pain || { now: patientData?.cc_vas_now, worst: patientData?.cc_vas_worst };
  const ctxKey = JSON.stringify({ setting, condition, regions, painCtx });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const knowledge = useMemo(() => buildOrthoKnowledge({ setting, condition, regions, pain: painCtx }), [ctxKey]);
  const meta = { setting, condition, regions };

  const [cp, setCp] = useState(patientData?.ortho_care_plan || {});
  const cpRef = useRef(cp);
  cpRef.current = cp;

  const data = { meta, pain: painCtx, orthoCarePlan: cp };
  const setData = (updater) => {
    const prev = { meta, pain: painCtx, orthoCarePlan: cpRef.current };
    const next = typeof updater === "function" ? updater(prev) : updater;
    cpRef.current = next.orthoCarePlan;
    setCp(next.orthoCarePlan);
    onSave?.("ortho_care_plan", next.orthoCarePlan);
  };

  return (
    <>
      <style>{orthoStyles()}</style>
      <CarePlanSection data={data} setData={setData} knowledge={knowledge} sectionKey="orthoCarePlan" initialPhase={initialPhase} floatingCTA={floatingCTA} />
    </>
  );
}

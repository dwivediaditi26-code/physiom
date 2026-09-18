import React, { useMemo } from "react";
import { CarePlanSection } from "./NeuroCarePlan.jsx";
import { CARDIO_KNOWLEDGE } from "./cardioClinicalKnowledge.js";
import { orthoStyles } from "./orthoStyles.js";

/* ============================================================
   CARDIO CARE PLAN (2026-09-17) — the shared, knowledge-injected
   CarePlanSection (NeuroCarePlan.jsx) mounted inside the Cardiopulmonary
   wizard, same pattern as NeuroCarePlanSection: only the knowledge module
   changes, the UI is identical (Aditi: "do the same for the cardio ...
   goals, treatment ... library and session and progress and plan").

   Mounted with the wizard's FULL live `data`/`setData` (like Neuro, unlike
   Ortho's purpose-built subset) so deriveCardioProblems can read real
   findings straight off data.subjective/.safety/.vitals/.cardio/.resp/
   .functional/.exercise/.outcomes. Stored at data.cardioCarePlan, which
   rides along with the rest of the assessment's existing onSave("cardio",
   data) autosave -- no separate save wiring needed.

   CarePlanSection itself only ever reads `data.meta?.condition` (Ortho's
   surgery / Neuro's diagnosis slot) for the precautions banner and the
   "why" chip. Cardio's equivalent axis is `data.meta.system` (cardio/resp/
   combined) -- aliased onto `meta.condition` here before handing data down,
   since `set()` inside useSectionData always writes through the real
   `setData(prev => ...)`, never through this passed-in `data` reference, so
   the alias never leaks into the saved record.
   ============================================================ */
export function CardioCarePlanSection({ data, setData, initialPhase, floatingCTA, phase, onAdvance, restrictPhases }) {
  const aliased = useMemo(() => ({ ...data, meta: { ...data.meta, condition: data.meta?.system } }), [data]);
  return (
    <>
      {/* CarePlanSection's markup (.tech-card, .ct-item, .dose-compact,
          .source-tab, .tile-card, field-kit classes, ...) is styled by this
          one shared stylesheet -- every other mount point (OrthoCarePlanStep,
          NeurologicalAssessment.jsx's two NeuroCarePlanSection mounts,
          SpecialtyPatientProfile.jsx) injects it alongside the section for
          the same reason. Without it the cards render unstyled/unflexed --
          e.g. a treatment row's "×" remove button drops onto its own line
          instead of sitting inline with the title. */}
      <style>{orthoStyles()}</style>
      <CarePlanSection
        data={aliased}
        setData={setData}
        knowledge={CARDIO_KNOWLEDGE}
        sectionKey="cardioCarePlan"
        initialPhase={initialPhase}
        floatingCTA={floatingCTA}
        phase={phase}
        onAdvance={onAdvance}
        restrictPhases={restrictPhases}
      />
    </>
  );
}

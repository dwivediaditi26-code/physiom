import React, { useMemo } from "react";
import { SectionIntro, SelectField, Segmented, TextField, TextArea, useSectionData } from "./orthoFieldKit.jsx";
import { resolveSurgicalOptions, withFallbacks, WEIGHT_BEARING_OPTIONS } from "./orthoSurgicalLibrary.js";

const SPINE_IDS = ["cervical", "thoracic", "lumbar", "sacrum"];

/* Region + condition driven "Surgical / Medical Details" block. The option
   lists come from orthoSurgicalLibrary (Magee-style region organisation for
   examination structure, AAOS-style terminology for procedures/approaches/
   grafts) and are always resolved fresh for the current region+condition —
   never one universal hardcoded list. Every field still allows free typing
   and every list carries "Not documented / Unknown / Other" fallbacks, so
   the template guides the therapist without ever restricting them. */
export function SurgicalDetailsSection({ data, setData, sectionKey, selectedRegions, conditionId }) {
  const [d, set] = useSectionData(data, setData, sectionKey);
  const opts = useMemo(() => resolveSurgicalOptions(selectedRegions, conditionId), [selectedRegions, conditionId]);
  const isInfection = conditionId === "infection";
  const isAmputation = conditionId === "amputation";
  const showLevel = selectedRegions.some((r) => SPINE_IDS.includes(r.id));

  return (
    <>
      <SectionIntro icon="🏥" title="Surgical / Medical Details" />
      <Segmented label="Procedure status" options={["No surgery", "Planned", "Post-operative", "Revision surgery", "Unknown"]} value={d.procedureStatus} onChange={(v) => set("procedureStatus", v)} wrap />

      <SelectField label="Surgical procedure" type="multi" options={withFallbacks(opts.procedures)} value={d.procedure} onChange={(v) => set("procedure", v)} />
      {opts.additionalProcedures.length > 0 && (
        <SelectField label="Additional procedure" type="multi" options={withFallbacks(opts.additionalProcedures)} value={d.additionalProcedure} onChange={(v) => set("additionalProcedure", v)} />
      )}

      {!isAmputation && <SelectField label="Surgical approach" type="single" options={withFallbacks(opts.approaches)} value={d.approach} onChange={(v) => set("approach", v)} />}

      {showLevel && <TextField label="Level (if applicable)" value={d.level} onChange={(v) => set("level", v)} placeholder="e.g. L4–L5" />}

      {!isInfection && <SelectField label="Fixation / implant" type="multi" options={withFallbacks(opts.fixation)} value={d.fixation} onChange={(v) => set("fixation", v)} />}

      {opts.graft.length > 0 && <SelectField label="Graft / tissue" type="multi" options={withFallbacks(opts.graft)} value={d.graft} onChange={(v) => set("graft", v)} />}

      <SelectField label="Brace / immobilization" type="multi" options={withFallbacks(opts.immobilization)} value={d.immobilization} onChange={(v) => set("immobilization", v)} />

      {isInfection && <SelectField label="Wound" type="multi" options={withFallbacks(opts.woundOptions)} value={d.wound} onChange={(v) => set("wound", v)} />}

      <Segmented
        label="Weight-bearing / loading status"
        options={[...WEIGHT_BEARING_OPTIONS, "Other"]}
        value={d.weightBearing}
        onChange={(v) => set("weightBearing", v)}
        wrap
        howTo="NWB = non weight-bearing. TTWB = toe-touch. PWB = partial. WBAT = weight-bearing as tolerated. FWB = full weight-bearing. Always confirm against the surgeon's written order — do not assume progression."
      />

      <SelectField label="Restrictions / precautions" type="multi" options={withFallbacks(opts.restrictionPresets)} value={d.restrictions} onChange={(v) => set("restrictions", v)} />
      <TextArea label="Additional restriction detail" value={d.restrictionDetail} onChange={(v) => set("restrictionDetail", v)} placeholder="Copy the documented protocol — do not paraphrase into a new plan" />
    </>
  );
}

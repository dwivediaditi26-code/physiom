import React, { useMemo } from "react";
import { SectionIntro, SelectField, Segmented, TextField, TextArea, DateField, useSectionData } from "./orthoFieldKit.jsx";
import { resolveSurgicalOptions, withFallbacks, WEIGHT_BEARING_OPTIONS } from "./orthoSurgicalLibrary.js";

const SPINE_IDS = ["cervical", "thoracic", "lumbar", "sacrum"];
const THORACOLUMBAR_IDS = ["thoracic", "lumbar", "sacrum"];
const OPERATED_STATUSES = ["Planned", "Post-operative", "Revision surgery"];
const ARTHROPLASTY_RE = /replacement|arthroplasty|resurfacing/i;
const has = (regions, id) => regions.some((r) => r.id === id);

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
  const showHealing = ["fracture", "postop"].includes(conditionId) || /osteotomy|fusion|ORIF|fixation|nail|fracture/i.test(String(d.procedure || ""));

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
      {["NWB", "TTWB", "PWB", "Other"].includes(d.weightBearing) && (
        <>
          <TextField label="Weight-bearing restricted for / until" value={d.weightBearingDuration} onChange={(v) => set("weightBearingDuration", v)} placeholder="e.g. 3 months, or until radiological union" />
          <DateField label="Weight-bearing review date" value={d.weightBearingReviewDate} onChange={(v) => set("weightBearingReviewDate", v)} />
        </>
      )}
      {showHealing && (
        <>
          <div className="subheading">Bone healing (radiology)</div>
          <SelectField label="Union status" type="single" options={withFallbacks(["Not yet imaged", "No callus yet", "Early callus", "Bridging callus — healing", "United", "Delayed union", "Non-union", "Malunion"])} value={d.unionStatus} onChange={(v) => set("unionStatus", v)} />
          <DateField label="Latest imaging date" value={d.latestImagingDate} onChange={(v) => set("latestImagingDate", v)} />
          <TextField label="Imaging findings (alignment, hardware)" value={d.imagingFindings} onChange={(v) => set("imagingFindings", v)} placeholder="e.g. hardware intact, alignment maintained" />
        </>
      )}

      <SelectField label="Restrictions / precautions" type="multi" options={withFallbacks(opts.restrictionPresets)} value={d.restrictions} onChange={(v) => set("restrictions", v)} />
      {OPERATED_STATUSES.includes(d.procedureStatus) && (
        <OperativeExtras d={d} set={set} regions={selectedRegions} />
      )}

      <TextArea label="Additional restriction detail" value={d.restrictionDetail} onChange={(v) => set("restrictionDetail", v)} placeholder="Copy the documented protocol — do not paraphrase into a new plan" />
    </>
  );
}

/* Extra operative-note fields. Everything here is a DOCUMENTATION field —
   copy what the operative note / surgeon's orders say; never infer it from
   the procedure name. Universal fields show for every operated patient;
   region blocks only show for the selected region (and, for implant
   fields, only when the procedure is a replacement / resurfacing). */
function OperativeExtras({ d, set, regions }) {
  const arthroplasty = ARTHROPLASTY_RE.test(d.procedure || "");
  const hip = has(regions, "hip");
  const knee = has(regions, "knee");
  const shoulder = has(regions, "shoulder");
  const cervical = has(regions, "cervical");
  const thoracolumbar = regions.some((r) => THORACOLUMBAR_IDS.includes(r.id));
  const graftOptions = withFallbacks(["None", "Autograft", "Allograft", "Synthetic / bone substitute"]);

  return (
    <>
      <div className="subheading">Operative details (from the operative note)</div>
      <Segmented label="Procedure type" options={["Primary", "Revision", "Staged"]} value={d.procedureType} onChange={(v) => set("procedureType", v)} wrap />
      <Segmented label="Urgency" options={["Elective", "Emergency"]} value={d.urgency} onChange={(v) => set("urgency", v)} />
      <TextField label="Surgeon / operating unit" value={d.surgeonUnit} onChange={(v) => set("surgeonUnit", v)} />
      <TextField label="Pre-operative diagnosis" value={d.preOpDiagnosis} onChange={(v) => set("preOpDiagnosis", v)} />
      <TextField label="Post-operative diagnosis" value={d.postOpDiagnosis} onChange={(v) => set("postOpDiagnosis", v)} />
      <TextArea label="Procedure as written in the operative note" value={d.operativeNoteProcedure} onChange={(v) => set("operativeNoteProcedure", v)} placeholder="Exact operative-note wording — keep separate from the picked procedure above" />
      <TextArea label="Operative complications" value={d.operativeComplications} onChange={(v) => set("operativeComplications", v)} placeholder="None documented / details" />

      <div className="subheading">Implant / fixation details</div>
      <TextField label="Implant manufacturer / model" value={d.implantModel} onChange={(v) => set("implantModel", v)} placeholder="If documented" />
      <TextField label="Implant location / number of screws or anchors" value={d.implantDetail} onChange={(v) => set("implantDetail", v)} placeholder="If documented" />
      <SelectField label="Bone graft" type="single" options={graftOptions} value={d.boneGraft} onChange={(v) => set("boneGraft", v)} />
      <TextField label="Imaging confirmation" value={d.imagingConfirmation} onChange={(v) => set("imagingConfirmation", v)} placeholder="e.g. post-op X-ray position satisfactory" />

      {hip && arthroplasty && (
        <>
          <div className="subheading">Hip implant</div>
          <TextField label="Femoral stem type" value={d.femoralStemType} onChange={(v) => set("femoralStemType", v)} placeholder="If documented" />
          <TextField label="Acetabular cup / liner" value={d.acetabularCupLiner} onChange={(v) => set("acetabularCupLiner", v)} placeholder="If documented" />
          <TextField label="Femoral head size / material" value={d.femoralHead} onChange={(v) => set("femoralHead", v)} placeholder="If documented" />
          <SelectField label="Bearing surface" type="single" options={withFallbacks(["Metal-on-polyethylene", "Ceramic-on-polyethylene", "Ceramic-on-ceramic", "Metal-on-metal", "Dual-mobility"])} value={d.bearingSurface} onChange={(v) => set("bearingSurface", v)} />
        </>
      )}
      {hip && (
        <>
          <TextField label="Hip precautions" value={d.hipPrecautions} onChange={(v) => set("hipPrecautions", v)} placeholder="Exactly as ordered — they differ by approach and surgeon" />
          <TextField label="Hip precautions duration" value={d.hipPrecautionDuration} onChange={(v) => set("hipPrecautionDuration", v)} placeholder="e.g. 6 weeks" />
        </>
      )}

      {knee && (
        <>
          <div className="subheading">Knee</div>
          {arthroplasty && (
            <>
              <TextField label="Femoral / tibial component" value={d.kneeComponents} onChange={(v) => set("kneeComponents", v)} placeholder="If documented" />
              <TextField label="Polyethylene insert" value={d.polyethyleneInsert} onChange={(v) => set("polyethyleneInsert", v)} placeholder="If documented" />
              <SelectField label="Patellar resurfacing" type="single" options={withFallbacks(["Resurfaced", "Not resurfaced"])} value={d.patellarResurfacing} onChange={(v) => set("patellarResurfacing", v)} />
            </>
          )}
          <SelectField label="Tourniquet used" type="single" options={["Yes", "No", "Not documented"]} value={d.tourniquet} onChange={(v) => set("tourniquet", v)} />
          <TextField label="Knee ROM restrictions" value={d.kneeRomRestriction} onChange={(v) => set("kneeRomRestriction", v)} placeholder="e.g. flexion limited to 90° for 2 weeks" />
          <TextField label="Brace and duration" value={d.kneeBrace} onChange={(v) => set("kneeBrace", v)} />
        </>
      )}

      {shoulder && (
        <>
          <div className="subheading">Shoulder</div>
          <SelectField label="Subscapularis management" type="single" options={withFallbacks(["Intact", "Tenotomy + repair", "Lesser tuberosity osteotomy", "Not involved"])} value={d.subscapularis} onChange={(v) => set("subscapularis", v)} />
          <SelectField label="Rotator cuff status" type="single" options={withFallbacks(["Intact", "Partial tear", "Full-thickness tear — repaired", "Irreparable"])} value={d.rotatorCuffStatus} onChange={(v) => set("rotatorCuffStatus", v)} />
          <TextField label="Sling type and duration" value={d.slingTypeDuration} onChange={(v) => set("slingTypeDuration", v)} />
          <TextField label="Passive / active ROM restrictions" value={d.shoulderRomRestriction} onChange={(v) => set("shoulderRomRestriction", v)} />
          <TextField label="External rotation limit" value={d.externalRotationLimit} onChange={(v) => set("externalRotationLimit", v)} placeholder="e.g. 30° for 6 weeks" />
          <TextField label="Lifting restriction" value={d.liftingRestriction} onChange={(v) => set("liftingRestriction", v)} />
        </>
      )}

      {(cervical || thoracolumbar) && (
        <>
          <div className="subheading">{cervical && thoracolumbar ? "Spine" : cervical ? "Cervical spine" : "Thoracic / lumbar spine"}</div>
          <TextField label="Number of fused levels" value={d.fusedLevels} onChange={(v) => set("fusedLevels", v)} placeholder="0 if no fusion" />
          <TextField label={cervical ? "Collar type and duration" : "Brace type and duration"} value={d.spineBraceDuration} onChange={(v) => set("spineBraceDuration", v)} />
          {cervical && (
            <>
              <TextField label="Neck ROM restrictions" value={d.neckRomRestriction} onChange={(v) => set("neckRomRestriction", v)} />
              <TextField label="Swallowing / voice symptoms" value={d.swallowingVoice} onChange={(v) => set("swallowingVoice", v)} placeholder="None / describe — report new symptoms to the surgeon" />
            </>
          )}
          {thoracolumbar && (
            <>
              <TextField label="Bending / lifting / twisting restrictions" value={d.spinalRestrictions} onChange={(v) => set("spinalRestrictions", v)} />
              <TextField label="Dural tear / CSF leak (if documented)" value={d.duralTear} onChange={(v) => set("duralTear", v)} />
            </>
          )}
          <TextField label="Neurological status" value={d.neuroStatus} onChange={(v) => set("neuroStatus", v)} placeholder="Baseline post-op findings" />
          <TextField label="Lifting / driving restrictions" value={d.liftingDriving} onChange={(v) => set("liftingDriving", v)} />
        </>
      )}

      <div className="subheading">Surgeon's rehabilitation orders</div>
      <TextField label="Permitted ROM range (degrees)" value={d.permittedRom} onChange={(v) => set("permittedRom", v)} placeholder="As ordered, e.g. 0–90°" />
      <TextField label="Brace / orthosis settings" value={d.braceSettings} onChange={(v) => set("braceSettings", v)} />
      <TextField label="Duration of brace / precautions" value={d.precautionDuration} onChange={(v) => set("precautionDuration", v)} />
      <TextField label="Exact permitted loading (if specified)" value={d.permittedLoading} onChange={(v) => set("permittedLoading", v)} placeholder="e.g. 20 kg partial weight-bearing" />
      <TextField label="Muscle activation restrictions" value={d.muscleActivationRestriction} onChange={(v) => set("muscleActivationRestriction", v)} />
      <TextField label="Transfer / gait instructions" value={d.transferGaitInstructions} onChange={(v) => set("transferGaitInstructions", v)} />
      <DateField label="Physiotherapy start date" value={d.physioStartDate} onChange={(v) => set("physioStartDate", v)} />
    </>
  );
}

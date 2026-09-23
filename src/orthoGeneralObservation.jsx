import React, { useState } from "react";
import { SectionIntro, Segmented, SelectField, TextField, TextArea, NumberField, InfoButton, AddMovementRow, Hint, useSectionData, fmtVal } from "./orthoFieldKit.jsx";
import { postureFieldsForRegion, POSTURE_VIEWS, OBSERVATION_INFO } from "./orthoObservationData.js";

/* ============================================================
   GeneralObservationSection — Outpatient pathway only. Replaces
   the shared ObservationSection (orthoCommonSections.jsx, still
   used unchanged by IPD/Post-op) with 5 small cards: Appearance,
   Posture & Alignment (region-aware), Local Observation (SEADS),
   Swelling/Edema, Gait Snapshot.

   2026-09-22 (Aditi): Local Observation's Swelling and Muscle bulk
   are now present/absent toggles that reveal detail fields (location
   + grade for swelling; a type list for muscle bulk) only once marked
   present, instead of a severity/type Segmented always shown even when
   nothing was found. Erythema removed from Local Observation. Movement
   Snapshot card removed entirely. Gait Snapshot's detail fields (pattern,
   speed, symmetry, device, assistance, notes) now only appear once
   "Observed?" is answered "Yes", instead of always showing for a gait
   that was never actually tested.
   ============================================================ */

function Card({ icon, title, infoKey, children }) {
  return (
    <div className="rom-card">
      <div className="rom-card-title">
        <span>
          {icon} {title}
        </span>
        {infoKey && <InfoButton title={title} text={OBSERVATION_INFO[infoKey]} eyebrow="HOW TO OBSERVE" />}
      </div>
      {children}
    </div>
  );
}

// One region's fields for the currently-active view. Each view stores its
// own answers (regions[region.id][view][fieldId]) so "elevated right"
// noted from behind and "neutral" noted from the side aren't forced to
// share one value.
function PostureViewFields({ region, view, regionData, setRegionData }) {
  const fields = postureFieldsForRegion(region, view);
  const viewData = regionData[view] || {};
  function setField(fieldId, value) {
    setRegionData({ ...regionData, [view]: { ...viewData, [fieldId]: value } });
  }
  if (!fields.length) return <Hint>Nothing specific to check for this region from this view.</Hint>;
  return fields.map((f) => (
    <Segmented key={f.id} label={f.label} options={f.options} value={viewData[f.id]} onChange={(v) => setField(f.id, v)} wrap />
  ));
}

function PostureTabs({ selectedRegions, regionLabelOf, view, regions, setRegions }) {
  const [activeIdx, setActiveIdx] = useState(0);
  if (!selectedRegions.length) {
    return (
      <SelectField label="Spine" type="single" options={["Normal", "Increased kyphosis", "Increased lordosis", "Scoliosis"]} value={undefined} onChange={() => {}} />
    );
  }
  const region = selectedRegions[Math.min(activeIdx, selectedRegions.length - 1)];
  const regionData = regions[region.id] || {};
  return (
    <>
      {selectedRegions.length > 1 && (
        <div className="region-tab-row-wrap">
          <div className="region-tab-row">
            {selectedRegions.map((r, i) => (
              <button type="button" key={r.id + i} className={"region-tab" + (activeIdx === i ? " region-tab-active" : "")} onClick={() => setActiveIdx(i)}>
                {regionLabelOf(r)}
              </button>
            ))}
          </div>
        </div>
      )}
      <PostureViewFields region={region} view={view} regionData={regionData} setRegionData={(next) => setRegions({ ...regions, [region.id]: next })} />
    </>
  );
}

function MeasurementRow({ site, right, left, onRight, onLeft, onRemove }) {
  return (
    <div className="rom-card" style={{ marginBottom: 8, background: "#FAFAFF" }}>
      <div className="rom-card-title" style={{ fontSize: 12.5 }}>
        <span>{site}</span>
        <button type="button" className="outcome-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="vitals-grid">
        <NumberField label="Right" value={right} onChange={onRight} unit="cm" width="45%" />
        <NumberField label="Left" value={left} onChange={onLeft} unit="cm" width="45%" />
      </div>
    </div>
  );
}

export function GeneralObservationSection({ data, setData, selectedRegions = [], regionLabelOf, onOpenGait }) {
  const [d, set] = useSectionData(data, setData, "observation");
  const appearance = d.appearance || {};
  const attitude = d.attitude || {};
  const posture = d.posture || {};
  const local = d.local || {};
  const edema = d.edema || {};
  const gait = d.gait || {};
  const measurements = edema.measurements || [];
  const swellingMeasurements = local.swellingMeasurements || [];
  const muscleBulkMeasurements = local.muscleBulkMeasurements || [];
  const regionOptions = selectedRegions.map((r) => regionLabelOf(r));

  function setSub(key, field, value) {
    set(key, { ...d[key], [field]: value });
  }

  // Shared by Swelling and Muscle bulk's own circumference measurements
  // below (2026-09-22, Aditi: "same for muscle bulk region wise and put
  // measurement") -- same right/left-per-site shape as the Swelling/Edema
  // card's `measurements`, just scoped to `local.<field>Measurements`
  // instead of `edema.measurements` since these are separate findings.
  function measurementHandlers(field, list) {
    return {
      onAdd: (name) => setSub("local", field, [...list, { site: name, right: "", left: "" }]),
      onRight: (i, v) => setSub("local", field, list.map((mm, ii) => (ii === i ? { ...mm, right: v } : mm))),
      onLeft: (i, v) => setSub("local", field, list.map((mm, ii) => (ii === i ? { ...mm, left: v } : mm))),
      onRemove: (i) => setSub("local", field, list.filter((_, ii) => ii !== i)),
    };
  }
  const swellingM = measurementHandlers("swellingMeasurements", swellingMeasurements);
  const muscleBulkM = measurementHandlers("muscleBulkMeasurements", muscleBulkMeasurements);

  return (
    <>
      <SectionIntro icon="👁️" title="General Observation" />
      <Segmented label="Observed from" options={["Standing", "Sitting", "Walking"]} value={d.observedFrom} onChange={(v) => set("observedFrom", v)} />

      <Card icon="👤" title="General Appearance" infoKey="appearance">
        <Segmented label="General condition" options={["Poor", "Fair", "Good"]} value={appearance.generalCondition} onChange={(v) => setSub("appearance", "generalCondition", v)} />
        <Segmented label="Body build" options={["Ectomorphic", "Mesomorphic", "Endomorphic"]} value={appearance.bodyBuild} onChange={(v) => setSub("appearance", "bodyBuild", v)} wrap />
        <Segmented label="Distress" options={["None", "Mild", "Moderate", "Severe"]} value={appearance.distress} onChange={(v) => setSub("appearance", "distress", v)} />
        <Segmented label="Overall presentation" options={["Normal", "Guarded", "Distressed"]} value={appearance.presentation} onChange={(v) => setSub("appearance", "presentation", v)} />
      </Card>

      <Card icon="🛌" title="Attitude of the Limbs" infoKey="attitude">
        <TextField label="Supine" value={attitude.supine} onChange={(v) => setSub("attitude", "supine", v)} placeholder="Resting limb position — supine" />
        <TextField label="Sitting" value={attitude.sitting} onChange={(v) => setSub("attitude", "sitting", v)} placeholder="Resting limb position — sitting" />
        <TextField label="Standing" value={attitude.standing} onChange={(v) => setSub("attitude", "standing", v)} placeholder="Resting limb position — standing" />
      </Card>

      <Card icon="🧍" title="Posture & Alignment" infoKey="posture">
        <Segmented
          label="View"
          options={POSTURE_VIEWS.map((v) => v.label)}
          value={POSTURE_VIEWS.find((v) => v.id === (posture.view || "anterior"))?.label}
          onChange={(label) => set("posture", { ...posture, view: POSTURE_VIEWS.find((v) => v.label === label)?.id })}
        />
        <PostureTabs
          selectedRegions={selectedRegions}
          regionLabelOf={regionLabelOf}
          view={posture.view || "anterior"}
          regions={posture.regions || {}}
          setRegions={(next) => set("posture", { ...posture, regions: next })}
        />
      </Card>

      <Card icon="🔎" title="Local Observation" infoKey="local">
        <Segmented label="Side" options={["Right", "Left", "Bilateral"]} value={local.side} onChange={(v) => setSub("local", "side", v)} />
        <Segmented label="Swelling" options={["Absent", "Present"]} value={local.swelling} onChange={(v) => setSub("local", "swelling", v)} />
        {local.swelling === "Present" && (
          <>
            <SelectField label="Swelling location" type="multi" options={regionOptions} value={local.swellingLocation} onChange={(v) => setSub("local", "swellingLocation", v)} placeholder="Select region(s)" />
            <Segmented label="Swelling grade" options={["Mild", "Moderate", "Severe"]} value={local.swellingGrade} onChange={(v) => setSub("local", "swellingGrade", v)} />
            {swellingMeasurements.map((m, i) => (
              <MeasurementRow key={i} site={m.site} right={m.right} left={m.left}
                onRight={(v) => swellingM.onRight(i, v)} onLeft={(v) => swellingM.onLeft(i, v)} onRemove={() => swellingM.onRemove(i)} />
            ))}
            <AddMovementRow onAdd={swellingM.onAdd} placeholder="+ Add measurement" />
          </>
        )}
        <SelectField label="Skin / colour" type="multi" options={["Normal", "Redness", "Discoloration", "Bruising", "Other"]} value={local.skin} onChange={(v) => setSub("local", "skin", v)} />
        <Segmented label="Muscle bulk" options={["Normal", "Abnormal"]} value={local.muscleBulk} onChange={(v) => setSub("local", "muscleBulk", v)} />
        {local.muscleBulk === "Abnormal" && (
          <>
            <SelectField label="Muscle bulk change" type="single" options={["Atrophy", "Hypertrophy", "Asymmetry", "Other"]} value={local.muscleBulkType} onChange={(v) => setSub("local", "muscleBulkType", v)} />
            <SelectField label="Muscle bulk location" type="multi" options={regionOptions} value={local.muscleBulkLocation} onChange={(v) => setSub("local", "muscleBulkLocation", v)} placeholder="Select region(s)" />
            {muscleBulkMeasurements.map((m, i) => (
              <MeasurementRow key={i} site={m.site} right={m.right} left={m.left}
                onRight={(v) => muscleBulkM.onRight(i, v)} onLeft={(v) => muscleBulkM.onLeft(i, v)} onRemove={() => muscleBulkM.onRemove(i)} />
            ))}
            <AddMovementRow onAdd={muscleBulkM.onAdd} placeholder="+ Add measurement" />
          </>
        )}
        <Segmented label="Deformity" options={["None", "Present"]} value={local.deformity} onChange={(v) => setSub("local", "deformity", v)} />
        {local.deformity === "Present" && (
          <SelectField label="Deformity type" type="multi" options={["Varus", "Valgus", "Flexion deformity", "Extension deformity", "Rotational", "Angular", "Other"]} value={local.deformityType} onChange={(v) => setSub("local", "deformityType", v)} />
        )}
        <Segmented label="Bony contours" options={["Normal", "Prominent", "Asymmetrical", "Irregular"]} value={local.bonyContours} onChange={(v) => setSub("local", "bonyContours", v)} wrap />
        <Segmented label="Scar" options={["None", "Surgical", "Traumatic", "Other"]} value={local.scar} onChange={(v) => setSub("local", "scar", v)} />
      </Card>

      <Card icon="💧" title="Swelling / Edema" infoKey="swelling">
        <Segmented label="Presence" options={["None", "Present"]} value={edema.presence} onChange={(v) => setSub("edema", "presence", v)} />
        {edema.presence === "Present" && (
          <>
            <Segmented label="Side" options={["Right", "Left", "Bilateral"]} value={edema.side} onChange={(v) => setSub("edema", "side", v)} />
            <SelectField label="Location" type="multi" options={regionOptions} value={edema.location} onChange={(v) => setSub("edema", "location", v)} placeholder="Select region(s)" />
            <Segmented label="Severity" options={["Mild", "Moderate", "Severe"]} value={edema.severity} onChange={(v) => setSub("edema", "severity", v)} />
            <Segmented label="Character" options={["Localized", "Diffuse"]} value={edema.character} onChange={(v) => setSub("edema", "character", v)} />
            <Segmented label="Pitting" options={["None", "1+", "2+", "3+", "4+"]} value={edema.pitting} onChange={(v) => setSub("edema", "pitting", v)} />
            {measurements.map((m, i) => (
              <MeasurementRow
                key={i}
                site={m.site}
                right={m.right}
                left={m.left}
                onRight={(v) => set("edema", { ...edema, measurements: measurements.map((mm, ii) => (ii === i ? { ...mm, right: v } : mm)) })}
                onLeft={(v) => set("edema", { ...edema, measurements: measurements.map((mm, ii) => (ii === i ? { ...mm, left: v } : mm)) })}
                onRemove={() => set("edema", { ...edema, measurements: measurements.filter((_, ii) => ii !== i) })}
              />
            ))}
            <AddMovementRow onAdd={(name) => set("edema", { ...edema, measurements: [...measurements, { site: name, right: "", left: "" }] })} placeholder="+ Add measurement" />
          </>
        )}
      </Card>

      <Card icon="🚶‍♂️" title="Gait Snapshot" infoKey="gait">
        <Segmented label="Observed?" options={["Yes", "No"]} value={gait.observed} onChange={(v) => setSub("gait", "observed", v)} />
        {gait.observed === "Yes" && (
          <>
            <SelectField label="Pattern" type="single" options={["Normal", "Antalgic", "Ataxic", "Trendelenburg", "Steppage", "Other"]} value={gait.pattern} onChange={(v) => setSub("gait", "pattern", v)} />
            <Segmented label="Speed" options={["Normal", "Slow", "Fast"]} value={gait.speed} onChange={(v) => setSub("gait", "speed", v)} />
            <Segmented label="Symmetry" options={["Symmetrical", "Asymmetrical"]} value={gait.symmetry} onChange={(v) => setSub("gait", "symmetry", v)} />
            <Segmented label="Assistive device" options={["None", "Cane", "Walker", "Crutches", "Other"]} value={gait.device} onChange={(v) => setSub("gait", "device", v)} wrap />
            <Segmented label="Assistance" options={["Independent", "Supervision", "Minimal Assist", "Moderate Assist", "Maximum Assist"]} value={gait.assistance} onChange={(v) => setSub("gait", "assistance", v)} wrap />
            <TextField label="Notable observation" value={gait.notes} onChange={(v) => setSub("gait", "notes", v)} />
            {onOpenGait && (
              <button type="button" className="info-btn-full" style={{ marginTop: 10 }} onClick={onOpenGait}>
                → Full Gait Assessment
              </button>
            )}
          </>
        )}
      </Card>
    </>
  );
}

/* formatters[stepId] contract for orthoSummary.jsx: (section) => [{label, value}] */
export function formatGeneralObservationSection(section) {
  const rows = [];
  Object.entries(section).forEach(([key, val]) => {
    if (key === "posture" || key.startsWith("__")) return;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.entries(val).forEach(([k2, v2]) => {
        if (k2 === "measurements") {
          (v2 || []).forEach((m) => {
            const parts = [m.right && `R ${m.right}cm`, m.left && `L ${m.left}cm`].filter(Boolean).join(", ");
            if (parts) rows.push({ label: `Circumference — ${m.site || "site"}`, value: parts });
          });
          return;
        }
        const v = fmtVal(v2);
        if (v) rows.push({ label: `${key} — ${k2}`, value: v });
      });
    } else {
      const v = fmtVal(val);
      if (v) rows.push({ label: key, value: v });
    }
  });
  const postureRegions = section.posture?.regions || {};
  const viewLabel = (id) => POSTURE_VIEWS.find((v) => v.id === id)?.label || id;
  Object.entries(postureRegions).forEach(([regionId, regionData]) => {
    Object.entries(regionData).forEach(([view, viewData]) => {
      Object.entries(viewData || {}).forEach(([fieldId, v]) => {
        const val = fmtVal(v);
        if (val) rows.push({ label: `${regionId} — ${viewLabel(view)} — ${fieldId}`, value: val });
      });
    });
  });
  return rows;
}

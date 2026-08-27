import React, { useState } from "react";
import { SectionIntro, Segmented, SelectField, TextField, TextArea, NumberField, InfoButton, AddMovementRow, Hint, useSectionData, fmtVal } from "./orthoFieldKit.jsx";
import { postureFieldsForRegion, POSTURE_VIEWS, OBSERVATION_INFO } from "./orthoObservationData.js";

/* ============================================================
   GeneralObservationSection — Outpatient pathway only. Replaces
   the shared ObservationSection (orthoCommonSections.jsx, still
   used unchanged by IPD/Post-op) with 6 small cards: Appearance,
   Posture & Alignment (region-aware), Local Observation (SEADS),
   Swelling/Edema, Movement Snapshot, Gait Snapshot.
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
  const posture = d.posture || {};
  const local = d.local || {};
  const edema = d.edema || {};
  const movement = d.movement || {};
  const gait = d.gait || {};
  const measurements = edema.measurements || [];

  function setSub(key, field, value) {
    set(key, { ...d[key], [field]: value });
  }

  return (
    <>
      <SectionIntro icon="👁️" title="General Observation" />
      <Segmented label="Observed from" options={["Standing", "Sitting", "Walking"]} value={d.observedFrom} onChange={(v) => set("observedFrom", v)} />

      <Card icon="👤" title="General Appearance" infoKey="appearance">
        <Segmented label="Body build" options={["Ectomorphic", "Mesomorphic", "Endomorphic"]} value={appearance.bodyBuild} onChange={(v) => setSub("appearance", "bodyBuild", v)} wrap />
        <Segmented label="Nutritional appearance" options={["Normal", "Reduced", "Increased"]} value={appearance.nutrition} onChange={(v) => setSub("appearance", "nutrition", v)} />
        <Segmented label="Alertness" options={["Alert", "Drowsy", "Other"]} value={appearance.alertness} onChange={(v) => setSub("appearance", "alertness", v)} />
        <Segmented label="Distress" options={["None", "Mild", "Moderate", "Severe"]} value={appearance.distress} onChange={(v) => setSub("appearance", "distress", v)} />
        <Segmented label="Overall presentation" options={["Normal", "Guarded", "Distressed"]} value={appearance.presentation} onChange={(v) => setSub("appearance", "presentation", v)} />
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
        <Segmented label="Swelling" options={["None", "Mild", "Moderate", "Severe"]} value={local.swelling} onChange={(v) => setSub("local", "swelling", v)} />
        <Segmented label="Erythema" options={["Absent", "Present"]} value={local.erythema} onChange={(v) => setSub("local", "erythema", v)} />
        <SelectField label="Skin / colour" type="multi" options={["Normal", "Redness", "Discoloration", "Bruising", "Other"]} value={local.skin} onChange={(v) => setSub("local", "skin", v)} />
        <Segmented label="Muscle bulk" options={["Symmetrical", "Atrophy", "Hypertrophy"]} value={local.muscleBulk} onChange={(v) => setSub("local", "muscleBulk", v)} />
        <Segmented label="Deformity" options={["None", "Present"]} value={local.deformity} onChange={(v) => setSub("local", "deformity", v)} />
        <Segmented label="Scar" options={["None", "Surgical", "Traumatic", "Other"]} value={local.scar} onChange={(v) => setSub("local", "scar", v)} />
      </Card>

      <Card icon="💧" title="Swelling / Edema" infoKey="swelling">
        <Segmented label="Presence" options={["None", "Present"]} value={edema.presence} onChange={(v) => setSub("edema", "presence", v)} />
        <Segmented label="Side" options={["Right", "Left", "Bilateral"]} value={edema.side} onChange={(v) => setSub("edema", "side", v)} />
        <TextField label="Location" value={edema.location} onChange={(v) => setSub("edema", "location", v)} placeholder="Anatomical location" />
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
      </Card>

      <Card icon="🚶" title="Movement Snapshot" infoKey="movement">
        <Segmented label="Sit → Stand" options={["Normal", "Difficult", "Painful", "Uses arms", "Assistance"]} value={movement.sitToStand} onChange={(v) => setSub("movement", "sitToStand", v)} wrap />
        <Segmented label="Squat" options={["Normal", "Limited", "Painful", "Asymmetrical"]} value={movement.squat} onChange={(v) => setSub("movement", "squat", v)} wrap />
        <Segmented label="Single-leg stance" options={["Normal", "Reduced", "Unable"]} value={movement.singleLegStance} onChange={(v) => setSub("movement", "singleLegStance", v)} />
        <Segmented label="Reaching" options={["Normal", "Limited", "Painful"]} value={movement.reaching} onChange={(v) => setSub("movement", "reaching", v)} />
        <Segmented label="General movement" options={["Normal", "Guarded", "Slow", "Asymmetrical"]} value={movement.generalMovement} onChange={(v) => setSub("movement", "generalMovement", v)} wrap />
      </Card>

      <Card icon="🚶‍♂️" title="Gait Snapshot" infoKey="gait">
        <Segmented label="Observed?" options={["Yes", "No"]} value={gait.observed} onChange={(v) => setSub("gait", "observed", v)} />
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
